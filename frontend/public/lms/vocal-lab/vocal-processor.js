/**
 * vocal-processor.js — High-performance DSP engine running inside an
 * AudioWorkletProcessor. Implements a 1D Kelly-Lochbaum digital waveguide
 * model of the vocal tract with a coupled nasal side-branch, localized
 * friction noise injection at a configurable constriction, and a hybrid
 * glottal source (synthetic LF-style pulse OR a looped voice-clone sample
 * with cubic interpolation pitch-shift).
 *
 * Communication with the main thread:
 *   ─ AudioParam (a-rate / k-rate): frequency, tenseness, voicing, noiseAmount
 *   ─ port.postMessage({ type, data }):
 *        'setAreas'        Float32Array(44)  — target cross-sections
 *        'setVelum'        Number 0..1      — nasal coupling
 *        'setConstriction' Integer 0..43    — friction injection index
 *        'setVoiceClone'   Float32Array | null  — looped voice sample
 *        'setVoiceCloneRefFreq' Number     — sample base pitch in Hz
 *
 * This file is loaded as a worklet module: addModule('/lms/vocal-lab/vocal-processor.js')
 */

const TRACT_N      = 44;   // glottis (0) → lips (TRACT_N-1)
const NASAL_N      = 28;   // velum (0) → nostrils (NASAL_N-1)
const NASAL_JUNCT  = 20;   // tract index where nasal branch attaches

class VocalProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'frequency',  defaultValue: 130, minValue: 60,  maxValue: 600, automationRate: 'a-rate' },
      { name: 'tenseness',  defaultValue: 0.6, minValue: 0,   maxValue: 1,   automationRate: 'k-rate' },
      { name: 'voicing',    defaultValue: 1.0, minValue: 0,   maxValue: 1,   automationRate: 'k-rate' },
      { name: 'noiseAmount',defaultValue: 0.0, minValue: 0,   maxValue: 1,   automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();

    // ── Main tract: forward (R) and backward (L) travelling pressures ─
    this.R = new Float32Array(TRACT_N);
    this.L = new Float32Array(TRACT_N);
    this.newR = new Float32Array(TRACT_N);
    this.newL = new Float32Array(TRACT_N);

    // Cross-sectional areas (current + target for smooth morphing)
    this.A       = new Float32Array(TRACT_N).fill(1.0);
    this.targetA = new Float32Array(TRACT_N).fill(1.0);

    // Reflection coefficients at every junction (TRACT_N+1)
    this.reflection = new Float32Array(TRACT_N + 1);

    // ── Nasal side branch (closed at the nostrils acts like a tube) ──
    this.nR    = new Float32Array(NASAL_N);
    this.nL    = new Float32Array(NASAL_N);
    this.newNR = new Float32Array(NASAL_N);
    this.newNL = new Float32Array(NASAL_N);
    this.nA    = new Float32Array(NASAL_N).fill(0.7);
    this.nReflection = new Float32Array(NASAL_N + 1);
    this._buildNasalReflections();

    // Velum coupling factor (0=closed, 1=fully open)
    this.velum = 0.0;
    this.targetVelum = 0.0;

    // Boundary reflection coefficients
    this.glottisRefl = 0.75;   // strong reflection at glottis
    this.lipRefl     = -0.85;  // radiation at lips

    // ── Glottis source state ─────────────────────────────────────────
    this.glottisPhase = 0;          // synthetic LF pulse phase 0..1
    this.lastFrequency = 130;

    // Voice clone source (Float32Array of one or many cycles)
    this.voiceClone = null;
    this.voiceCloneRefFreq = 120;
    this.voiceClonePos = 0;         // fractional position

    // Friction injection
    this.constrictionIdx = 30;
    this.fricBuf = new Float32Array(8);  // simple FIR-like averaging buffer
    this.fricBufIdx = 0;

    // Lip radiation low-pass state
    this.lipOut = 0;
    // DC blocker state
    this.dcX = 0; this.dcY = 0;

    // Output post-filter (gentle 1-pole low-pass to tame aliasing)
    this.outLP = 0;

    // Initial reflection table
    this._computeReflections();

    this.port.onmessage = (e) => this._onMessage(e.data);
  }

  // ──────────────────────────────────────────────────────────────────
  //  Message handling
  // ──────────────────────────────────────────────────────────────────
  _onMessage(msg) {
    if (!msg || !msg.type) return;
    switch (msg.type) {
      case 'setAreas': {
        const d = msg.data;
        if (d && d.length === TRACT_N) {
          for (let i = 0; i < TRACT_N; i++) this.targetA[i] = Math.max(0.005, d[i]);
        }
        break;
      }
      case 'setVelum': {
        this.targetVelum = Math.max(0, Math.min(1, +msg.data || 0));
        break;
      }
      case 'setConstriction': {
        const v = msg.data | 0;
        if (v >= 0 && v < TRACT_N) this.constrictionIdx = v;
        break;
      }
      case 'setVoiceClone': {
        if (!msg.data) { this.voiceClone = null; this.voiceClonePos = 0; }
        else {
          // Expect a Float32Array (transferable)
          this.voiceClone = msg.data instanceof Float32Array ? msg.data : new Float32Array(msg.data);
          this.voiceClonePos = 0;
        }
        break;
      }
      case 'setVoiceCloneRefFreq': {
        this.voiceCloneRefFreq = Math.max(40, +msg.data || 120);
        break;
      }
      case 'setBoundary': {
        if (typeof msg.data?.glottis === 'number') this.glottisRefl = msg.data.glottis;
        if (typeof msg.data?.lip === 'number')     this.lipRefl     = msg.data.lip;
        break;
      }
    }
  }

  // ──────────────────────────────────────────────────────────────────
  //  Reflection tables — Kelly-Lochbaum
  //  r_i = (A_i - A_{i+1}) / (A_i + A_{i+1})
  // ──────────────────────────────────────────────────────────────────
  _computeReflections() {
    const A = this.A, r = this.reflection;
    r[0] = this.glottisRefl;
    for (let i = 1; i < TRACT_N; i++) {
      const s = A[i - 1] + A[i];
      r[i] = s > 1e-6 ? (A[i - 1] - A[i]) / s : 0;
    }
    r[TRACT_N] = this.lipRefl;
  }

  _buildNasalReflections() {
    const A = this.nA, r = this.nReflection;
    r[0] = 0.0;   // junction reflection is recomputed live per-sample
    for (let i = 1; i < NASAL_N; i++) {
      const s = A[i - 1] + A[i];
      r[i] = s > 1e-6 ? (A[i - 1] - A[i]) / s : 0;
    }
    r[NASAL_N] = -0.85;  // radiation at nostrils
  }

  // ──────────────────────────────────────────────────────────────────
  //  Glottal source — hybrid (synthetic OR voice clone)
  // ──────────────────────────────────────────────────────────────────
  _glottisSample(freq, tenseness, voicing) {
    if (this.voiceClone && this.voiceClone.length > 4) {
      // Pitch-shift the looped clone via cubic interpolation
      const rate = freq / this.voiceCloneRefFreq;
      this.voiceClonePos += rate;
      const L = this.voiceClone.length;
      while (this.voiceClonePos >= L) this.voiceClonePos -= L;
      while (this.voiceClonePos < 0)  this.voiceClonePos += L;

      const i1 = Math.floor(this.voiceClonePos);
      const t  = this.voiceClonePos - i1;
      const i0 = (i1 - 1 + L) % L;
      const i2 = (i1 + 1) % L;
      const i3 = (i1 + 2) % L;
      const s0 = this.voiceClone[i0], s1 = this.voiceClone[i1],
            s2 = this.voiceClone[i2], s3 = this.voiceClone[i3];
      // Catmull-Rom cubic
      const a0 = -0.5 * s0 + 1.5 * s1 - 1.5 * s2 + 0.5 * s3;
      const a1 = s0 - 2.5 * s1 + 2.0 * s2 - 0.5 * s3;
      const a2 = -0.5 * s0 + 0.5 * s2;
      const a3 = s1;
      const samp = ((a0 * t + a1) * t + a2) * t + a3;
      return samp * voicing;
    }

    // Synthetic LF-style asymmetric pulse with tenseness-controlled shape
    const inc = freq / sampleRate;
    this.glottisPhase += inc;
    while (this.glottisPhase >= 1) this.glottisPhase -= 1;
    const p = this.glottisPhase;
    const Te = 0.55 + 0.15 * (1 - tenseness);  // open-quotient
    let v;
    if (p < Te) {
      const x = p / Te;
      const power = 1.4 + (1 - tenseness) * 1.2;
      v = Math.sin(Math.PI * x);
      v = Math.sign(v) * Math.pow(Math.abs(v), power);
    } else {
      // return phase — exponential decay (negative)
      const x = (p - Te) / (1 - Te);
      v = -Math.exp(-x * 6) * 0.55 * (1 - x);
    }
    return v * voicing;
  }

  // ──────────────────────────────────────────────────────────────────
  //  Single tract step at sample rate
  // ──────────────────────────────────────────────────────────────────
  _step(glottalIn, fricNoise) {
    const R = this.R, L = this.L, newR = this.newR, newL = this.newL;
    const refl = this.reflection;

    // ── Glottis input injection: combine incoming L wave with source
    const glottisJunc = refl[0] * L[0] + (1 - refl[0]) * glottalIn;
    // (newR[0] becomes the right-going pressure leaving the glottis)
    // Internal scattering across tract junctions
    newR[0] = glottisJunc;
    for (let i = 1; i < TRACT_N; i++) {
      const r = refl[i];
      // Scattering: outgoing = incoming + r * (incoming_other - incoming)
      const w = r * (R[i - 1] + L[i]);
      newR[i] = R[i - 1] - w;
      newL[i - 1] = L[i] + w;
    }
    // Lip end
    const lipR = refl[TRACT_N];
    newL[TRACT_N - 1] = lipR * R[TRACT_N - 1];

    // ── Nasal coupling at junction NASAL_JUNCT ────────────────────────
    if (this.velum > 0.001) {
      const A_oral_l = this.A[NASAL_JUNCT - 1];
      const A_oral_r = this.A[NASAL_JUNCT];
      const A_nasal  = this.nA[0] * this.velum;
      const sum = A_oral_l + A_oral_r + A_nasal;
      if (sum > 1e-6) {
        const inOral_l = R[NASAL_JUNCT - 1];
        const inOral_r = L[NASAL_JUNCT];
        const inNasal  = this.nL[0];
        // 3-port lossless junction (Kelly-Lochbaum generalized)
        const w = 2 * (A_oral_l * inOral_l + A_oral_r * inOral_r + A_nasal * inNasal) / sum;
        newR[NASAL_JUNCT]     = w - inOral_l - inOral_r;       // into oral right side
        newL[NASAL_JUNCT - 1] = w - inOral_l - inNasal;         // into oral left side
        this.newNR[0]         = w - inOral_r - inNasal;         // into nasal
      } else {
        this.newNR[0] = 0;
      }

      // Nasal branch internal scattering
      const nR = this.nR, nL = this.nL;
      const nRefl = this.nReflection;
      for (let i = 1; i < NASAL_N; i++) {
        const r = nRefl[i];
        const w = r * (nR[i - 1] + nL[i]);
        this.newNR[i] = nR[i - 1] - w;
        this.newNL[i - 1] = nL[i] + w;
      }
      this.newNL[NASAL_N - 1] = nRefl[NASAL_N] * nR[NASAL_N - 1];

      // Commit nasal arrays
      const tmpNR = this.nR; this.nR = this.newNR; this.newNR = tmpNR;
      const tmpNL = this.nL; this.nL = this.newNL; this.newNL = tmpNL;
    }

    // ── Localized friction injection at constrictionIdx ───────────────
    if (fricNoise !== 0) {
      const idx = this.constrictionIdx;
      // Gain inversely proportional to local area: tighter = louder
      const A_local = Math.max(0.005, this.A[idx]);
      const gain = Math.min(8, 0.4 / A_local);
      const inject = fricNoise * gain * 0.25;
      newR[idx] += inject;
      newL[idx] -= inject;
    }

    // Commit main waveguide arrays (swap references — zero allocation)
    const tmpR = this.R; this.R = this.newR; this.newR = tmpR;
    const tmpL = this.L; this.L = this.newL; this.newL = tmpL;

    // ── Output = lip radiation + nasal radiation ─────────────────────
    const lipSample = this.R[TRACT_N - 1] + this.L[TRACT_N - 1];
    // 1-pole low-pass to emulate lip radiation
    this.lipOut += 0.55 * (lipSample - this.lipOut);

    let nasalSample = 0;
    if (this.velum > 0.001) {
      nasalSample = (this.nR[NASAL_N - 1] + this.nL[NASAL_N - 1]) * this.velum;
    }

    let out = this.lipOut + nasalSample * 0.6;

    // DC blocker
    const y = out - this.dcX + 0.995 * this.dcY;
    this.dcX = out;
    this.dcY = y;
    out = y;

    // Soft saturation to prevent runaway resonances
    out = Math.tanh(out * 1.4);

    // Gentle post-LP
    this.outLP += 0.7 * (out - this.outLP);
    return this.outLP;
  }

  // ──────────────────────────────────────────────────────────────────
  //  Main process callback (128 frames per call)
  // ──────────────────────────────────────────────────────────────────
  process(_inputs, outputs, parameters) {
    const out = outputs[0][0];
    if (!out) return true;

    const freqArr = parameters.frequency;
    const tenseness = parameters.tenseness[0];
    const voicing = parameters.voicing[0];
    const noiseAmt = parameters.noiseAmount[0];

    // Smooth area & velum morphing toward targets (~10ms time-constant)
    const morphAlpha = 0.02;
    for (let i = 0; i < TRACT_N; i++) {
      this.A[i] += (this.targetA[i] - this.A[i]) * morphAlpha;
    }
    this.velum += (this.targetVelum - this.velum) * morphAlpha;
    this._computeReflections();

    for (let s = 0; s < out.length; s++) {
      const f = freqArr.length > 1 ? freqArr[s] : freqArr[0];
      const glot = this._glottisSample(f, tenseness, voicing);

      // Friction noise (slightly band-limited)
      let n = (Math.random() * 2 - 1);
      this.fricBuf[this.fricBufIdx] = n;
      this.fricBufIdx = (this.fricBufIdx + 1) & 7;
      let smoothed = 0;
      for (let k = 0; k < 8; k++) smoothed += this.fricBuf[k];
      smoothed *= 0.125;
      const noiseSample = smoothed * noiseAmt;

      out[s] = this._step(glot, noiseSample);
    }
    return true;
  }
}

registerProcessor('vocal-processor', VocalProcessor);
