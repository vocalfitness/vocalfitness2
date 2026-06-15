/**
 * vocal-processor.js — High-performance DSP engine for the Phonetics Lab.
 *
 * Architecture (Pink Trombone style, properly fixed):
 *   • 44 1D digital waveguide tract sections (Kelly-Lochbaum scattering)
 *   • 28 nasal side-branch sections, coupled at index 20 via a STABLE
 *     3-port junction using impedance-weighted scattering (energy-bounded)
 *   • Synthetic glottis: LF-style pulse + aspiration noise blend, with
 *     tenseness controlling open quotient and breathiness mix
 *   • Localized turbulence injection at constriction when noiseAmount > 0
 *   • Global 0.999 damping per step to prevent unbounded resonances
 *
 * Hybrid voice-clone glottis (OPT-IN ONLY): if a Float32Array is sent
 * via `setVoiceClone`, the synthetic glottis is replaced with a
 * pitch-shifted loop of the sample. This is intentionally OFF for the
 * default phonetics lessons — the synthesized glottis sounds organic
 * and is exactly what physical-modeling synths like Pink Trombone use.
 */

const TRACT_N      = 44;
const NASAL_N      = 28;
const NASAL_JUNCT  = 20;

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

    // ── Main tract waveguide buffers ────────────────────────────────
    this.R = new Float32Array(TRACT_N);
    this.L = new Float32Array(TRACT_N);
    this.newR = new Float32Array(TRACT_N);
    this.newL = new Float32Array(TRACT_N);

    this.A       = new Float32Array(TRACT_N).fill(1.0);
    this.targetA = new Float32Array(TRACT_N).fill(1.0);
    this.reflection = new Float32Array(TRACT_N + 1);

    // ── Nasal side branch ──────────────────────────────────────────
    this.nR    = new Float32Array(NASAL_N);
    this.nL    = new Float32Array(NASAL_N);
    this.newNR = new Float32Array(NASAL_N);
    this.newNL = new Float32Array(NASAL_N);
    // Realistic nasal cross-sections: narrow then widening to nostrils
    this.nA    = new Float32Array(NASAL_N);
    for (let i = 0; i < NASAL_N; i++) {
      const t = i / (NASAL_N - 1);
      this.nA[i] = 0.4 + 1.2 * t;   // 0.4 → 1.6 cm²
    }
    this.nReflection = new Float32Array(NASAL_N + 1);
    this._buildNasalReflections();

    this.velum = 0.0;
    this.targetVelum = 0.0;

    // Boundary reflections
    this.glottisRefl = 0.75;
    this.lipRefl     = -0.85;

    // ── Glottis synthesis state ─────────────────────────────────────
    this.glottisPhase = 0;
    this.aspirationLP = 0;      // 1-pole LP state for bandlimited noise

    // Optional voice-clone source (OFF by default)
    this.voiceClone = null;
    this.voiceCloneRefFreq = 120;
    this.voiceClonePos = 0;

    // Friction injection state
    this.constrictionIdx = 30;
    this.fricLP = 0;

    // Output filters
    this.lipOut = 0;
    this.nasalOut = 0;
    this.dcX = 0; this.dcY = 0;
    this.outLP = 0;

    this._computeReflections();
    this.port.onmessage = (e) => this._onMessage(e.data);
  }

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
      case 'setVelum':
        this.targetVelum = Math.max(0, Math.min(0.6, +msg.data || 0));  // cap at 0.6 for stability
        break;
      case 'setConstriction': {
        const v = msg.data | 0;
        if (v >= 0 && v < TRACT_N) this.constrictionIdx = v;
        break;
      }
      case 'setVoiceClone':
        if (!msg.data) { this.voiceClone = null; this.voiceClonePos = 0; }
        else {
          this.voiceClone = msg.data instanceof Float32Array ? msg.data : new Float32Array(msg.data);
          this.voiceClonePos = 0;
        }
        break;
      case 'setVoiceCloneRefFreq':
        this.voiceCloneRefFreq = Math.max(40, +msg.data || 120);
        break;
      case 'setBoundary':
        if (typeof msg.data?.glottis === 'number') this.glottisRefl = msg.data.glottis;
        if (typeof msg.data?.lip === 'number')     this.lipRefl     = msg.data.lip;
        break;
    }
  }

  // Standard Kelly-Lochbaum reflection table (Pink Trombone convention)
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
    r[0] = 0.0;  // junction handled separately
    for (let i = 1; i < NASAL_N; i++) {
      const s = A[i - 1] + A[i];
      r[i] = s > 1e-6 ? (A[i - 1] - A[i]) / s : 0;
    }
    r[NASAL_N] = -0.85;
  }

  // ──────────────────────────────────────────────────────────────────
  //  Glottis: hybrid LF-pulse + aspiration noise
  // ──────────────────────────────────────────────────────────────────
  _glottisSample(freq, tenseness, voicing, noiseSample) {
    // Voice-clone branch — OPT-IN
    if (this.voiceClone && this.voiceClone.length > 4) {
      const rate = freq / this.voiceCloneRefFreq;
      this.voiceClonePos += rate;
      const L = this.voiceClone.length;
      while (this.voiceClonePos >= L) this.voiceClonePos -= L;
      while (this.voiceClonePos < 0)  this.voiceClonePos += L;
      const i1 = Math.floor(this.voiceClonePos);
      const t  = this.voiceClonePos - i1;
      const s1 = this.voiceClone[i1];
      const s2 = this.voiceClone[(i1 + 1) % L];
      return (s1 + (s2 - s1) * t) * voicing * 0.7;
    }

    // ── Synthetic LF-style pulse ─────────────────────────────────
    const inc = freq / sampleRate;
    this.glottisPhase += inc;
    while (this.glottisPhase >= 1) this.glottisPhase -= 1;
    const p = this.glottisPhase;

    // Open-quotient & peak position controlled by tenseness
    const Te = 0.4 + 0.25 * (1 - tenseness);    // ~0.4–0.65
    const Tp = 0.6 * Te;
    let v;
    if (p < Tp) {
      const x = p / Tp;
      v = -Math.cos(Math.PI * x) * 0.5 + 0.5;     // smooth opening
    } else if (p < Te) {
      const x = (p - Tp) / (Te - Tp);
      // Sharp closing peak — sharper when tense
      v = Math.cos(Math.PI * 0.5 * x);
      v = Math.sign(v) * Math.pow(Math.abs(v), 1 + 0.8 * tenseness);
    } else {
      // Closed phase: zero with slight return-to-zero decay artifact
      v = 0;
    }
    // Differentiate-ish to get pulse-like derivative shape
    v = v * 2 - 1;   // center around 0 with amplitude ±1

    // Aspiration noise (bandlimited via 1-pole LP)
    this.aspirationLP += 0.4 * (noiseSample - this.aspirationLP);
    const breath = this.aspirationLP * (1 - tenseness) * 0.45;

    return (v * tenseness + breath) * voicing * 0.55;
  }

  // ──────────────────────────────────────────────────────────────────
  //  Single tract step (sample rate)
  //
  //  Algorithm taken from Pink Trombone (Neil Thapen, 2017), with the
  //  3-port nasal junction implemented using the IMPEDANCE-weighted
  //  scattering equation (stable, energy-bounded):
  //
  //      p_junc = 2 (Z_a·in_a + Z_b·in_b + Z_c·in_c) / (Z_a+Z_b+Z_c)
  //      out_x  = p_junc − in_x          for each port x
  //
  //  Z_x is the wave impedance ∝ 1/A_x.
  // ──────────────────────────────────────────────────────────────────
  _step(glottalIn, fricNoise) {
    const R = this.R, L = this.L, newR = this.newR, newL = this.newL;
    const refl = this.reflection;

    // Glottis injection at left boundary (Pink Trombone style)
    newR[0] = L[0] * this.glottisRefl + glottalIn;

    // Internal scattering across all tract junctions
    for (let i = 1; i < TRACT_N; i++) {
      const r = refl[i];
      const w = r * (R[i - 1] + L[i]);
      newR[i]     = R[i - 1] - w;
      newL[i - 1] = L[i]     + w;
    }
    // Lip radiation (right boundary)
    newL[TRACT_N - 1] = R[TRACT_N - 1] * this.lipRefl;

    // ── Nasal coupling via 3-port impedance-weighted junction ────
    if (this.velum > 0.001) {
      // Effective nasal port area scales with velum opening
      const A_n_eff = Math.max(0.005, this.nA[0] * this.velum);
      const A_l    = Math.max(0.005, this.A[NASAL_JUNCT - 1]);
      const A_r    = Math.max(0.005, this.A[NASAL_JUNCT]);

      // Impedances (proportional to 1/area; constants cancel in ratio)
      const Z_l = 1 / A_l;
      const Z_r = 1 / A_r;
      const Z_n = 1 / A_n_eff;
      const Zsum = Z_l + Z_r + Z_n;

      const in_l = R[NASAL_JUNCT - 1];   // arriving from oral left
      const in_r = L[NASAL_JUNCT];       // arriving from oral right
      const in_n = this.nL[0];           // arriving from nasal branch

      const p_junc = 2 * (Z_l * in_l + Z_r * in_r + Z_n * in_n) / Zsum;

      // Overwrite the 3 outgoing waves at the junction
      newR[NASAL_JUNCT]     = p_junc - in_l;  // continuing rightward
      newL[NASAL_JUNCT - 1] = p_junc - in_r;  // going back leftward
      this.newNR[0]         = p_junc - in_n;  // into nasal branch

      // Nasal branch internal scattering
      const nR = this.nR, nL = this.nL;
      const nRefl = this.nReflection;
      for (let i = 1; i < NASAL_N; i++) {
        const r = nRefl[i];
        const w = r * (nR[i - 1] + nL[i]);
        this.newNR[i]     = nR[i - 1] - w;
        this.newNL[i - 1] = nL[i]     + w;
      }
      this.newNL[NASAL_N - 1] = nR[NASAL_N - 1] * nRefl[NASAL_N];

      // Commit nasal buffers (in-place swap, no GC)
      let tmp;
      tmp = this.nR; this.nR = this.newNR; this.newNR = tmp;
      tmp = this.nL; this.nL = this.newNL; this.newNL = tmp;

      // Global damping on nasal waves (Pink Trombone: 0.999 per step)
      for (let i = 0; i < NASAL_N; i++) { this.nR[i] *= 0.999; this.nL[i] *= 0.999; }
    } else {
      // Velum closed: drain residual nasal waves quickly
      for (let i = 0; i < NASAL_N; i++) { this.nR[i] *= 0.96; this.nL[i] *= 0.96; }
    }

    // ── Localized friction injection (band-limited noise) ────────
    if (fricNoise !== 0) {
      const idx = this.constrictionIdx;
      const A_local = Math.max(0.005, this.A[idx]);
      // Gain grows as constriction tightens (typical fricative behavior)
      const gain = Math.min(6, 0.35 / A_local);
      this.fricLP += 0.5 * (fricNoise - this.fricLP);
      const inject = this.fricLP * gain * 0.4;
      newR[idx] += inject;
      newL[idx] -= inject;
    }

    // Commit main waveguide arrays
    let tmp;
    tmp = this.R; this.R = this.newR; this.newR = tmp;
    tmp = this.L; this.L = this.newL; this.newL = tmp;

    // Pink-Trombone-style global damping (0.999 per sample)
    for (let i = 0; i < TRACT_N; i++) { this.R[i] *= 0.9995; this.L[i] *= 0.9995; }

    // ── Output: lip + nasal radiation ────────────────────────────
    const lipSample = this.R[TRACT_N - 1] + this.L[TRACT_N - 1];
    this.lipOut += 0.5 * (lipSample - this.lipOut);

    let nasalOutRaw = 0;
    if (this.velum > 0.001) {
      nasalOutRaw = (this.nR[NASAL_N - 1] + this.nL[NASAL_N - 1]);
      this.nasalOut += 0.5 * (nasalOutRaw - this.nasalOut);
    } else {
      this.nasalOut *= 0.9;
    }

    let out = this.lipOut + this.nasalOut * this.velum * 0.8;

    // DC blocker
    const y = out - this.dcX + 0.995 * this.dcY;
    this.dcX = out;
    this.dcY = y;
    out = y;

    // Soft limiter
    out = Math.tanh(out * 1.1);

    this.outLP += 0.7 * (out - this.outLP);
    return this.outLP;
  }

  // ──────────────────────────────────────────────────────────────────
  process(_inputs, outputs, parameters) {
    const out = outputs[0][0];
    if (!out) return true;

    const freqArr = parameters.frequency;
    const tenseness = parameters.tenseness[0];
    const voicing = parameters.voicing[0];
    const noiseAmt = parameters.noiseAmount[0];

    // Smooth area & velum morphing (~10 ms)
    const morphAlpha = 0.02;
    for (let i = 0; i < TRACT_N; i++) {
      this.A[i] += (this.targetA[i] - this.A[i]) * morphAlpha;
    }
    this.velum += (this.targetVelum - this.velum) * morphAlpha;
    this._computeReflections();

    for (let s = 0; s < out.length; s++) {
      const f = freqArr.length > 1 ? freqArr[s] : freqArr[0];
      // Single shared white-noise sample feeds both aspiration and friction
      const wn = (Math.random() * 2 - 1);
      const glot = this._glottisSample(f, tenseness, voicing, wn);
      const noiseSample = wn * noiseAmt;
      out[s] = this._step(glot, noiseSample);
    }
    return true;
  }
}

registerProcessor('vocal-processor', VocalProcessor);
