/**
 * vocal-framework.js — Main-thread controller for the Phonetics Lab vocal
 * synthesizer.  Wires together: AudioContext lifecycle, AudioWorklet,
 * Canvas2D sagittal rendering, touch/mouse interaction, JSON-driven
 * phoneme morphing, and a localized "Activate" overlay for browser
 * autoplay compliance.
 *
 *   const engine = new VocalLabEngine(rootElement);
 *   await engine.init(phonemeConfig);   // first call resumes audio
 *   engine.loadPhoneme(otherConfig);    // morphs to new state
 *   engine.destroy();                   // tears everything down
 *
 * The framework is namespaced under window.VocalLabEngine and emits the
 * following custom events on the root element:
 *   ─ 'vocal-lab:ready'      after init() succeeds
 *   ─ 'vocal-lab:profile'    after loadPhoneme()
 *   ─ 'vocal-lab:error'      on any unrecoverable failure
 */
(function (global) {
  'use strict';

  const TRACT_N    = 44;
  const NASAL_N    = 28;
  const WORKLET_URL = (function () {
    // Resolve the sibling worklet path next to this script. We deliberately
    // avoid `import.meta` so the framework can be loaded as a classic
    // <script src> tag, an ES module, or eval'd inline.
    const scripts = document.getElementsByTagName('script');
    for (let i = scripts.length - 1; i >= 0; i--) {
      const src = scripts[i].src;
      if (src && /vocal-framework\.js(\?|$)/.test(src)) {
        return src.replace(/vocal-framework\.js(\?[^]*)?$/, 'vocal-processor.js');
      }
    }
    return '/lms/vocal-lab/vocal-processor.js';
  })();

  // ─────────────────────────────────────────────────────────────────
  //  Utility: Gaussian smoothing kernel for tongue-mass displacement
  // ─────────────────────────────────────────────────────────────────
  function gaussianKernel(spread) {
    const radius = Math.max(2, Math.round(spread * 2.5));
    const out = [];
    for (let d = -radius; d <= radius; d++) {
      out.push({ d, w: Math.exp(-(d * d) / (2 * spread * spread)) });
    }
    return out;
  }

  class VocalLabEngine {
    constructor(rootEl, opts = {}) {
      if (!rootEl) throw new Error('VocalLabEngine: rootEl required');
      this.root = rootEl;
      this.opts = Object.assign({ width: 720, height: 360 }, opts);

      this.canvas = rootEl.querySelector('[data-vl-canvas]');
      if (!this.canvas) throw new Error('VocalLabEngine: missing [data-vl-canvas]');
      this.ctx = this.canvas.getContext('2d');

      this.controls = {
        activate:   rootEl.querySelector('[data-vl-activate]'),
        freqSlider: rootEl.querySelector('[data-vl-freq]'),
        freqValue:  rootEl.querySelector('[data-vl-freq-value]'),
        voicing:    rootEl.querySelector('[data-vl-voicing]'),
        tenseness:  rootEl.querySelector('[data-vl-tenseness]'),
        velum:      rootEl.querySelector('[data-vl-velum]'),
        profileEls: rootEl.querySelectorAll('[data-vl-profile]'),
        title:      rootEl.querySelector('[data-vl-title]'),
        ipa:        rootEl.querySelector('[data-vl-ipa]'),
        overlay:    rootEl.querySelector('[data-vl-overlay]'),
      };

      this.audioCtx     = null;
      this.workletNode  = null;
      this.params       = {};
      this.profiles     = new Map();    // id → config
      this.current      = null;
      this.rafHandle    = null;
      this.dpr          = Math.max(1, Math.min(2, window.devicePixelRatio || 1));

      // Tract state used by renderer
      this.displayA   = new Float32Array(TRACT_N).fill(1.5);
      this.targetA    = new Float32Array(TRACT_N).fill(1.5);
      this.userOver   = new Float32Array(TRACT_N).fill(0);
      this.kernel     = gaussianKernel(1.8);
      this.constrictionIdx = -1;

      this._pressed = false;
      this._lastDispatchTs = 0;
      this._destroyed = false;

      this._boundHandlers = [];
      this._setupCanvas();
      this._bindUI();
      this._bindCanvasInteraction();
    }

    // ───────────────────────────────────────────────────────────────
    //  Canvas DPR sizing
    // ───────────────────────────────────────────────────────────────
    _setupCanvas() {
      const c = this.canvas;
      const w = this.opts.width;
      const h = this.opts.height;
      c.style.width  = w + 'px';
      c.style.height = h + 'px';
      c.width  = w * this.dpr;
      c.height = h * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);
    }

    // ───────────────────────────────────────────────────────────────
    //  Public API
    // ───────────────────────────────────────────────────────────────
    registerProfile(config) {
      if (!config || !config.id) return;
      this.profiles.set(config.id, config);
      // If a button element with matching data-vl-profile exists, bind it
      this.controls.profileEls.forEach(btn => {
        if (btn.dataset.vlProfile === config.id) {
          this._on(btn, 'click', () => this.loadPhoneme(config));
        }
      });
    }

    async init(initialConfig) {
      if (this._destroyed) throw new Error('VocalLabEngine: instance destroyed');
      try {
        this._showOverlay(true);

        // Wait for explicit user gesture via the overlay button
        await this._awaitActivation();

        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)({
          latencyHint: 'interactive',
          sampleRate: 44100,
        });

        await this.audioCtx.audioWorklet.addModule(WORKLET_URL);
        this.workletNode = new AudioWorkletNode(this.audioCtx, 'vocal-processor', {
          numberOfInputs: 0,
          numberOfOutputs: 1,
          outputChannelCount: [1],
        });

        // Master gain — keeps the canvas-driven synth from ear-piercing
        const gain = this.audioCtx.createGain();
        gain.gain.value = 0.6;
        this.workletNode.connect(gain).connect(this.audioCtx.destination);
        this.masterGain = gain;

        // Cache AudioParam handles
        this.params.frequency  = this.workletNode.parameters.get('frequency');
        this.params.tenseness  = this.workletNode.parameters.get('tenseness');
        this.params.voicing    = this.workletNode.parameters.get('voicing');
        this.params.noiseAmount= this.workletNode.parameters.get('noiseAmount');

        await this.audioCtx.resume();

        if (initialConfig) await this.loadPhoneme(initialConfig);

        this._startRenderLoop();
        this._showOverlay(false);
        this._dispatch('vocal-lab:ready', { engine: this });
      } catch (err) {
        this._dispatch('vocal-lab:error', { error: err });
        // eslint-disable-next-line no-console
        console.error('[VocalLabEngine] init failed:', err);
        throw err;
      }
    }

    async loadPhoneme(config) {
      if (this._destroyed) return;
      if (!config) return;
      this.current = config;
      if (config.id && !this.profiles.has(config.id)) this.profiles.set(config.id, config);

      // 1) Update tract target areas
      const target = this._buildTargetTract(config);
      this.targetA.set(target);
      if (this.workletNode) {
        this._postAreas();
      }

      // 2) Push scalar parameters
      const now = this.audioCtx?.currentTime ?? 0;
      const ramp = 0.25;
      const setRamp = (param, val) => {
        if (!param) return;
        param.cancelScheduledValues(now);
        param.setValueAtTime(param.value, now);
        param.linearRampToValueAtTime(val, now + ramp);
      };
      if (this.audioCtx) {
        setRamp(this.params.frequency,   config.f0          ?? 130);
        setRamp(this.params.tenseness,   config.tenseness   ?? 0.6);
        setRamp(this.params.voicing,     config.voicing     ?? 1.0);
        setRamp(this.params.noiseAmount, config.friction    ?? 0.0);
      }

      // 3) Velum & constriction
      if (this.workletNode) {
        this.workletNode.port.postMessage({ type: 'setVelum',        data: config.velum ?? 0 });
        if (typeof config.constrictionIndex === 'number') {
          this.workletNode.port.postMessage({ type: 'setConstriction', data: config.constrictionIndex });
          this.constrictionIdx = config.constrictionIndex;
        }
        if (typeof config.glottisReflection === 'number' || typeof config.lipReflection === 'number') {
          this.workletNode.port.postMessage({
            type: 'setBoundary',
            data: {
              glottis: config.glottisReflection,
              lip:     config.lipReflection,
            },
          });
        }
      }

      // 4) Voice clone (optional)
      if (config.voiceClone?.url) {
        try {
          const buf = await this._fetchVoiceClone(config.voiceClone.url);
          this.workletNode.port.postMessage({
            type: 'setVoiceCloneRefFreq',
            data: config.voiceClone.refFreq ?? 120,
          });
          // Transferable Float32Array
          this.workletNode.port.postMessage({ type: 'setVoiceClone', data: buf }, [buf.buffer]);
        } catch (e) {
          // eslint-disable-next-line no-console
          console.warn('[VocalLabEngine] voice clone load failed, using synthetic glottis:', e);
          this.workletNode.port.postMessage({ type: 'setVoiceClone', data: null });
        }
      } else if (this.workletNode) {
        this.workletNode.port.postMessage({ type: 'setVoiceClone', data: null });
      }

      // 5) UI labels
      if (this.controls.title) this.controls.title.textContent = config.label || config.id || '';
      if (this.controls.ipa)   this.controls.ipa.textContent   = config.ipa   || '';
      if (this.controls.freqSlider) this.controls.freqSlider.value = String(config.f0 ?? 130);
      if (this.controls.freqValue)  this.controls.freqValue.textContent = `${config.f0 ?? 130} Hz`;
      if (this.controls.voicing)    this.controls.voicing.checked = (config.voicing ?? 1) > 0.5;
      if (this.controls.tenseness)  this.controls.tenseness.value = String(config.tenseness ?? 0.6);
      if (this.controls.velum)      this.controls.velum.value = String(config.velum ?? 0);

      this._dispatch('vocal-lab:profile', { config });
    }

    destroy() {
      this._destroyed = true;
      if (this.rafHandle) cancelAnimationFrame(this.rafHandle);
      this.rafHandle = null;
      this._boundHandlers.forEach(({ target, evt, fn, opts }) => {
        target.removeEventListener(evt, fn, opts);
      });
      this._boundHandlers = [];

      if (this.workletNode) {
        try { this.workletNode.port.onmessage = null; } catch (_) {}
        try { this.workletNode.disconnect(); } catch (_) {}
      }
      if (this.masterGain) { try { this.masterGain.disconnect(); } catch (_) {} }
      if (this.audioCtx) {
        const ctx = this.audioCtx;
        this.audioCtx = null;
        try { ctx.close(); } catch (_) {}
      }
    }

    // ───────────────────────────────────────────────────────────────
    //  Profile → tract area target builder
    // ───────────────────────────────────────────────────────────────
    _buildTargetTract(config) {
      const out = new Float32Array(TRACT_N);

      // 1) Base profile: either explicit `tract[]` of length 44 OR a
      //    parametric description with pharynx/oral/lip diameters.
      if (Array.isArray(config.tract) && config.tract.length === TRACT_N) {
        for (let i = 0; i < TRACT_N; i++) out[i] = config.tract[i];
      } else {
        const pharynx = config.pharynx ?? 1.8;
        const oral    = config.oral    ?? 1.6;
        const lipAp   = config.lipAperture ?? 1.4;
        for (let i = 0; i < TRACT_N; i++) {
          if (i < 8)      out[i] = pharynx;
          else if (i < 32) out[i] = oral;
          else             out[i] = lipAp;
        }
      }

      // 2) Constriction(s) — array of { index, area, spread }
      const constrictions = config.constrictions || [];
      for (const c of constrictions) {
        const idx = Math.max(0, Math.min(TRACT_N - 1, c.index | 0));
        const tgt = Math.max(0.005, c.area ?? 0.1);
        const spread = c.spread ?? 2.5;
        const kern = gaussianKernel(spread);
        for (const { d, w } of kern) {
          const i = idx + d;
          if (i < 0 || i >= TRACT_N) continue;
          // Pull the area toward the constriction target with weight w
          out[i] = out[i] * (1 - w) + tgt * w;
        }
      }
      return out;
    }

    _postAreas() {
      if (!this.workletNode) return;
      // Composite = morph target combined with user finger displacement
      const eff = new Float32Array(TRACT_N);
      for (let i = 0; i < TRACT_N; i++) {
        eff[i] = Math.max(0.005, this.targetA[i] - this.userOver[i]);
      }
      this.workletNode.port.postMessage({ type: 'setAreas', data: eff });
    }

    // ───────────────────────────────────────────────────────────────
    //  Voice-clone loading: returns mono Float32Array
    // ───────────────────────────────────────────────────────────────
    async _fetchVoiceClone(url) {
      const res = await fetch(url, { credentials: 'omit', cache: 'force-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status} for voice clone`);
      const arr = await res.arrayBuffer();
      const decoded = await this.audioCtx.decodeAudioData(arr);
      // Copy first channel (slice creates a non-aliased buffer we can transfer)
      const ch = decoded.getChannelData(0);
      const copy = new Float32Array(ch.length);
      copy.set(ch);
      return copy;
    }

    // ───────────────────────────────────────────────────────────────
    //  Activation overlay → user-gesture barrier for AudioContext
    // ───────────────────────────────────────────────────────────────
    _awaitActivation() {
      return new Promise((resolve) => {
        const btn = this.controls.activate;
        if (!btn) return resolve();
        const handler = () => { resolve(); };
        this._on(btn, 'click',     handler, { once: true });
        this._on(btn, 'touchstart',handler, { once: true, passive: true });
      });
    }

    _showOverlay(show) {
      const o = this.controls.overlay;
      if (!o) return;
      o.dataset.visible = show ? 'true' : 'false';
    }

    // ───────────────────────────────────────────────────────────────
    //  Canvas interaction: mouse + touch with Gaussian smoothing
    // ───────────────────────────────────────────────────────────────
    _bindCanvasInteraction() {
      const onPos = (clientX, clientY) => {
        const rect = this.canvas.getBoundingClientRect();
        const x = clientX - rect.left;
        const y = clientY - rect.top;
        const fx = Math.max(0, Math.min(1, x / rect.width));
        const fy = Math.max(0, Math.min(1, y / rect.height));
        const idx = Math.round(fx * (TRACT_N - 1));
        // Vertical distance from the centerline → tongue closure depth
        const depth = Math.abs(fy - 0.5) * 2;  // 0=center, 1=edge
        this._applyConstriction(idx, depth);
      };

      this._on(this.canvas, 'mousedown', (e) => {
        if (!this.audioCtx) return;
        this._pressed = true;
        onPos(e.clientX, e.clientY);
      });
      this._on(window, 'mousemove', (e) => {
        if (this._pressed) onPos(e.clientX, e.clientY);
      });
      this._on(window, 'mouseup', () => {
        if (!this._pressed) return;
        this._pressed = false;
        this._releaseConstriction();
      });
      this._on(this.canvas, 'touchstart', (e) => {
        if (!this.audioCtx) return;
        e.preventDefault();
        this._pressed = true;
        onPos(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
      this._on(this.canvas, 'touchmove', (e) => {
        if (!this._pressed) return;
        e.preventDefault();
        onPos(e.touches[0].clientX, e.touches[0].clientY);
      }, { passive: false });
      this._on(this.canvas, 'touchend', () => {
        this._pressed = false;
        this._releaseConstriction();
      });
    }

    _applyConstriction(idx, depth) {
      // Gaussian-smoothed tongue mass: spread across 4-6 indexes
      this.userOver.fill(0);
      const amp = depth * 2.6;
      for (const { d, w } of this.kernel) {
        const i = idx + d;
        if (i < 0 || i >= TRACT_N) continue;
        this.userOver[i] = amp * w;
      }
      this.constrictionIdx = idx;
      // Throttle messages to ~120Hz max — postMessage isn't free
      const now = performance.now();
      if (now - this._lastDispatchTs > 8) {
        this._lastDispatchTs = now;
        this._postAreas();
        if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'setConstriction', data: idx });
        }
      }
    }

    _releaseConstriction() {
      this.userOver.fill(0);
      this._postAreas();
    }

    // ───────────────────────────────────────────────────────────────
    //  UI bindings (sliders, switches, profile buttons)
    // ───────────────────────────────────────────────────────────────
    _bindUI() {
      const c = this.controls;
      if (c.freqSlider) this._on(c.freqSlider, 'input', () => {
        const v = +c.freqSlider.value;
        if (c.freqValue) c.freqValue.textContent = `${v.toFixed(0)} Hz`;
        if (this.params.frequency) {
          const now = this.audioCtx.currentTime;
          this.params.frequency.cancelScheduledValues(now);
          this.params.frequency.linearRampToValueAtTime(v, now + 0.05);
        }
      });
      if (c.voicing) this._on(c.voicing, 'change', () => {
        const v = c.voicing.checked ? 1 : 0;
        if (this.params.voicing) {
          const now = this.audioCtx.currentTime;
          this.params.voicing.linearRampToValueAtTime(v, now + 0.05);
        }
      });
      if (c.tenseness) this._on(c.tenseness, 'input', () => {
        const v = +c.tenseness.value;
        if (this.params.tenseness) {
          const now = this.audioCtx.currentTime;
          this.params.tenseness.linearRampToValueAtTime(v, now + 0.05);
        }
      });
      if (c.velum) this._on(c.velum, 'input', () => {
        const v = +c.velum.value;
        if (this.workletNode) {
          this.workletNode.port.postMessage({ type: 'setVelum', data: v });
        }
      });
    }

    // ───────────────────────────────────────────────────────────────
    //  Render loop: smooth display areas + Bézier sagittal silhouette
    // ───────────────────────────────────────────────────────────────
    _startRenderLoop() {
      const draw = () => {
        if (this._destroyed) return;
        // Smooth display tract toward target+user overlay
        const k = 0.08;
        for (let i = 0; i < TRACT_N; i++) {
          const eff = this.targetA[i] - this.userOver[i];
          this.displayA[i] += (eff - this.displayA[i]) * k;
        }
        this._draw();
        this.rafHandle = requestAnimationFrame(draw);
      };
      this.rafHandle = requestAnimationFrame(draw);
    }

    _draw() {
      const ctx = this.ctx;
      const W = this.opts.width;
      const H = this.opts.height;
      ctx.clearRect(0, 0, W, H);

      // Background gradient (subtle)
      const bg = ctx.createLinearGradient(0, 0, 0, H);
      bg.addColorStop(0, '#0b1220');
      bg.addColorStop(1, '#1e293b');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // Grid hints
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      for (let i = 0; i < TRACT_N; i += 4) {
        const x = (i / (TRACT_N - 1)) * W;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }

      // Compute sagittal silhouette: upper boundary (palate) + lower (tongue)
      const cy = H * 0.55;
      const maxR = H * 0.32;
      const top = new Array(TRACT_N);
      const bot = new Array(TRACT_N);
      for (let i = 0; i < TRACT_N; i++) {
        const a = Math.max(0.01, this.displayA[i]);
        const r = Math.min(maxR, Math.sqrt(a) * (H * 0.13));
        const x = (i / (TRACT_N - 1)) * W;
        top[i] = { x, y: cy - r };
        bot[i] = { x, y: cy + r };
      }

      // Filled tract (Bézier smoothed)
      ctx.beginPath();
      ctx.moveTo(top[0].x, top[0].y);
      for (let i = 1; i < TRACT_N; i++) {
        const mx = (top[i - 1].x + top[i].x) / 2;
        const my = (top[i - 1].y + top[i].y) / 2;
        ctx.quadraticCurveTo(top[i - 1].x, top[i - 1].y, mx, my);
      }
      ctx.lineTo(top[TRACT_N - 1].x, top[TRACT_N - 1].y);
      ctx.lineTo(bot[TRACT_N - 1].x, bot[TRACT_N - 1].y);
      for (let i = TRACT_N - 2; i >= 0; i--) {
        const mx = (bot[i + 1].x + bot[i].x) / 2;
        const my = (bot[i + 1].y + bot[i].y) / 2;
        ctx.quadraticCurveTo(bot[i + 1].x, bot[i + 1].y, mx, my);
      }
      ctx.closePath();
      const fillGrad = ctx.createLinearGradient(0, cy - maxR, 0, cy + maxR);
      fillGrad.addColorStop(0, 'rgba(245, 158, 11, 0.32)');
      fillGrad.addColorStop(1, 'rgba(245, 158, 11, 0.10)');
      ctx.fillStyle = fillGrad;
      ctx.fill();
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Nasal branch indicator (when velum target > 0)
      const velumLevel = (this.current?.velum ?? 0);
      if (velumLevel > 0.02) {
        const jx = (NASAL_JUNCT_VISUAL / (TRACT_N - 1)) * W;
        const grad = ctx.createLinearGradient(jx, cy - maxR, jx, 0);
        grad.addColorStop(0, `rgba(56, 189, 248, ${0.10 + velumLevel * 0.35})`);
        grad.addColorStop(1, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = grad;
        ctx.fillRect(jx - 18, 0, 36, cy - maxR + 4);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.75)';
        ctx.font = '11px system-ui';
        ctx.fillText('nasale', jx - 18, 14);
      }

      // Constriction marker
      if (this.constrictionIdx >= 0) {
        const cx = (this.constrictionIdx / (TRACT_N - 1)) * W;
        ctx.fillStyle = 'rgba(244, 114, 182, 0.85)';
        ctx.beginPath();
        ctx.arc(cx, cy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Labels
      ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
      ctx.font = '11px system-ui';
      ctx.fillText('Glottide', 4, H - 6);
      ctx.fillText('Labbra', W - 44, H - 6);
    }

    // ───────────────────────────────────────────────────────────────
    //  Event helpers
    // ───────────────────────────────────────────────────────────────
    _on(target, evt, fn, opts) {
      target.addEventListener(evt, fn, opts);
      this._boundHandlers.push({ target, evt, fn, opts });
    }
    _dispatch(name, detail) {
      try {
        this.root.dispatchEvent(new CustomEvent(name, { detail }));
      } catch (_) {}
    }
  }

  // The nasal junction position in the visual mapping (kept in sync with the worklet)
  const NASAL_JUNCT_VISUAL = 20;

  global.VocalLabEngine = VocalLabEngine;
})(typeof window !== 'undefined' ? window : globalThis);
