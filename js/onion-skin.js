/* ============================================
   Onion Skin
   --------------------------------------------
   Shows ghost frames from before / after the current playhead time as
   semi-transparent overlays on the stage. Standard motion-graphics tool
   for in-betweening, posing, and timing review.

   Architecture:
   • Computes ghost frames during stage:render-overlay (after the live
     pose has already been drawn).
   • Uses AnimationEngine.applyAnimationsAtTime(t) to seek each offset
     into a temporary pose, then renders objects to an offscreen canvas
     in stage coordinates, applies a tint, and composites into the main
     ctx (which is already in stage transform).
   • Restores the live pose by re-applying at currentTime so the next
     interaction sees the correct state.
   • Auto-disabled during playback (onion frames make no sense at 60fps).
   ============================================ */

class OnionSkin {
    constructor(stage, objects, animations) {
        this.stage = stage;
        this.objects = objects;
        this.animations = animations;

        this.enabled = false;
        this.framesBefore = 2;
        this.framesAfter = 2;
        this.stepMs = 200;          // 200 ms between ghost frames (5 fps)
        this.opacityMax = 0.35;
        this.tintBefore = '#ff5577'; // red/pink for past
        this.tintAfter = '#55aaff';  // blue for future
        this.tintEnabled = true;

        this._busy = false;
        this._off = null;
        this._offCtx = null;

        this._restore();
    }

    init() {
        eventBus.on('stage:render-overlay', (ctx) => this._renderOverlay(ctx));
        eventBus.on('timeline:time', () => { if (this.enabled) this.stage.requestRender(); });
        eventBus.on('history:push', () => { if (this.enabled) this.stage.requestRender(); });
        eventBus.on('timeline:update', () => { if (this.enabled) this.stage.requestRender(); });
    }

    // === Settings ===
    setEnabled(v) {
        this.enabled = !!v;
        this._save();
        this._syncToggleButton();
        this.stage.requestRender();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Onion Skin ' + (this.enabled ? 'on' : 'off'), 'info');
        }
    }
    toggle() { this.setEnabled(!this.enabled); }

    setFramesBefore(n) { this.framesBefore = Math.max(0, Math.min(8, n | 0)); this._save(); this.stage.requestRender(); }
    setFramesAfter(n)  { this.framesAfter  = Math.max(0, Math.min(8, n | 0)); this._save(); this.stage.requestRender(); }
    setStepMs(ms)      { this.stepMs = Math.max(20, ms | 0); this._save(); this.stage.requestRender(); }
    setOpacity(o)      { this.opacityMax = Math.max(0.05, Math.min(1, +o)); this._save(); this.stage.requestRender(); }
    setTintEnabled(v)  { this.tintEnabled = !!v; this._save(); this.stage.requestRender(); }

    _save() {
        try {
            localStorage.setItem('onionSkin', JSON.stringify({
                enabled: this.enabled,
                framesBefore: this.framesBefore,
                framesAfter: this.framesAfter,
                stepMs: this.stepMs,
                opacityMax: this.opacityMax,
                tintEnabled: this.tintEnabled
            }));
        } catch (_) { /* private mode */ }
    }
    _restore() {
        try {
            const j = JSON.parse(localStorage.getItem('onionSkin') || '{}');
            if (Number.isFinite(j.framesBefore)) this.framesBefore = j.framesBefore;
            if (Number.isFinite(j.framesAfter)) this.framesAfter = j.framesAfter;
            if (Number.isFinite(j.stepMs)) this.stepMs = j.stepMs;
            if (Number.isFinite(j.opacityMax)) this.opacityMax = j.opacityMax;
            if (typeof j.tintEnabled === 'boolean') this.tintEnabled = j.tintEnabled;
        } catch (_) { /* corrupt */ }
    }

    _syncToggleButton() {
        const btn = document.getElementById('btn-onion-skin');
        if (btn) btn.classList.toggle('active', this.enabled);
    }

    _captureVisualSignature(obj) {
        if (!obj) return '';
        return JSON.stringify({
            visible: obj.visible !== false,
            x: Math.round((obj.x || 0) * 100) / 100,
            y: Math.round((obj.y || 0) * 100) / 100,
            width: Math.round((obj.width || 0) * 100) / 100,
            height: Math.round((obj.height || 0) * 100) / 100,
            rotation: Math.round((obj.rotation || 0) * 100) / 100,
            scaleX: Math.round(((obj.scaleX ?? 1)) * 1000) / 1000,
            scaleY: Math.round(((obj.scaleY ?? 1)) * 1000) / 1000,
            opacity: Math.round(((obj.opacity ?? 1)) * 1000) / 1000,
            fill: obj.fill || null,
            stroke: obj.stroke || null,
            text: obj.text || null,
            iconPath: obj.iconPath || null,
            type: obj.type || null
        });
    }

    // === Render ===
    _renderOverlay(ctx) {
        if (!this.enabled || this._busy) return;
        if (this.animations && this.animations.isPlaying) return;
        if (this.animations && this.animations._exportingVideo) return;
        if (!this.objects || !this.objects.objects || this.objects.objects.length === 0) return;

        const before = this.framesBefore;
        const after = this.framesAfter;
        if (before + after === 0) return;

        this._busy = true;
        const currentTime = this.animations.currentTime || 0;
        let createdOriginal = false;
        const liveSignatures = new Map();

        try {
            // applyAnimationsAtTime requires originalStates as a baseline.
            // If playback isn't running, build a snapshot now and tear it down after.
            if (!this.animations.originalStates || !(this.animations.originalStates instanceof Map)) {
                this.animations.originalStates = new Map();
                this.objects.objects.forEach(obj => {
                    this.animations.originalStates.set(obj.id, Utils.deepClone(obj.toJSON()));
                });
                createdOriginal = true;
            }

            this.objects.objects.forEach(obj => {
                if (obj) liveSignatures.set(obj.id, this._captureVisualSignature(obj));
            });

            // Reuse / build offscreen canvas in stage coordinates
            const w = this.stage.width;
            const h = this.stage.height;
            if (!this._off || this._off.width !== w || this._off.height !== h) {
                this._off = document.createElement('canvas');
                this._off.width = w;
                this._off.height = h;
                this._offCtx = this._off.getContext('2d');
            }

            const offsets = [];
            for (let i = before; i >= 1; i--) offsets.push({ kind: 'before', step: i, max: before });
            for (let i = 1; i <= after; i++) offsets.push({ kind: 'after',  step: i, max: after });

            for (const { kind, step, max } of offsets) {
                const sign = (kind === 'before') ? -1 : 1;
                const t = currentTime + sign * step * this.stepMs;
                if (t < 0 || t > this.animations.totalDuration) continue;

                try {
                    this.animations.applyAnimationsAtTime(t, { finalPose: true });
                } catch (_) { continue; }

                const oc = this._offCtx;
                oc.setTransform(1, 0, 0, 1, 0, 0);
                oc.clearRect(0, 0, w, h);

                this.objects.objects.forEach(obj => {
                    if (obj && obj.visible === false) return;
                    if (typeof this.objects.isObjectLayerVisible === 'function' &&
                        !this.objects.isObjectLayerVisible(obj)) return;
                    if (liveSignatures.get(obj.id) === this._captureVisualSignature(obj)) return;
                    try { obj.render(oc, { quality: 'preview', onionSkin: true }); } catch (_) { /* skip bad object */ }
                });

                if (this.tintEnabled) {
                    oc.save();
                    oc.globalCompositeOperation = 'source-atop';
                    oc.globalAlpha = 0.55;
                    oc.fillStyle = (kind === 'before') ? this.tintBefore : this.tintAfter;
                    oc.fillRect(0, 0, w, h);
                    oc.restore();
                }

                const falloff = 1 - (step - 1) / Math.max(1, max + 0.5);
                ctx.save();
                ctx.globalAlpha = Math.max(0, Math.min(1, this.opacityMax * falloff));
                ctx.drawImage(this._off, 0, 0);
                ctx.restore();
            }

            // Restore the live pose so the next render / interaction sees the
            // correct state. finalPose:true outside playback matches the
            // _preserveFinalPose semantics the engine already uses.
            if (createdOriginal) {
                try {
                    for (const [id, snap] of this.animations.originalStates) {
                        const obj = this.objects.getObjectById(id);
                        if (obj && typeof this.animations._restoreFullState === 'function') {
                            this.animations._restoreFullState(obj, snap);
                        }
                    }
                } catch (_) { /* ignore */ }
                this.animations.originalStates = null;
            } else {
                try {
                    this.animations.applyAnimationsAtTime(currentTime, {
                        finalPose: !this.animations.isPlaying
                    });
                } catch (_) { /* ignore */ }
            }
        } finally {
            this._busy = false;
        }
    }

    // === UI binding ===
    bindUI() {
        const btn = document.getElementById('btn-onion-skin');
        if (btn) {
            btn.addEventListener('click', (e) => {
                if (e.shiftKey) { this._openPopover(btn); return; }
                this.toggle();
            });
            btn.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this._openPopover(btn);
            });
        }
        // Keyboard shortcut: O
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            const tag = (e.target && e.target.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === 'o' || e.key === 'O') {
                e.preventDefault();
                this.toggle();
            }
        });
        this._syncToggleButton();
    }

    _openPopover(anchor) {
        let pop = document.getElementById('onion-skin-popover');
        if (pop) { pop.remove(); return; }

        pop = document.createElement('div');
        pop.id = 'onion-skin-popover';
        pop.className = 'onion-skin-popover';
        pop.innerHTML = `
            <div class="osp-row osp-title">
                <i class="fas fa-clone"></i> Onion Skin
                <label class="osp-toggle">
                    <input type="checkbox" id="osp-enabled" ${this.enabled ? 'checked' : ''}>
                    <span>${this.enabled ? 'On' : 'Off'}</span>
                </label>
            </div>
            <div class="osp-row">
                <label>Frames before</label>
                <input type="number" id="osp-before" min="0" max="8" value="${this.framesBefore}">
            </div>
            <div class="osp-row">
                <label>Frames after</label>
                <input type="number" id="osp-after" min="0" max="8" value="${this.framesAfter}">
            </div>
            <div class="osp-row">
                <label>Step (ms)</label>
                <input type="number" id="osp-step" min="20" max="2000" step="10" value="${this.stepMs}">
            </div>
            <div class="osp-row">
                <label>Max opacity</label>
                <input type="range" id="osp-opacity" min="0.05" max="1" step="0.05" value="${this.opacityMax}">
                <span id="osp-opacity-val">${Math.round(this.opacityMax * 100)}%</span>
            </div>
            <div class="osp-row">
                <label class="osp-inline">
                    <input type="checkbox" id="osp-tint" ${this.tintEnabled ? 'checked' : ''}>
                    Color tint (red&nbsp;=&nbsp;past, blue&nbsp;=&nbsp;future)
                </label>
            </div>
            <div class="osp-row osp-hint">Press <kbd>O</kbd> to toggle. Right-click the toolbar button to reopen these settings.</div>
        `;
        document.body.appendChild(pop);

        const r = anchor.getBoundingClientRect();
        pop.style.top = (r.bottom + 6) + 'px';
        pop.style.left = Math.max(8, Math.min(window.innerWidth - 280 - 8, r.left - 80)) + 'px';

        const close = (ev) => {
            if (pop.contains(ev.target) || ev.target === anchor) return;
            pop.remove();
            document.removeEventListener('mousedown', close, true);
        };
        setTimeout(() => document.addEventListener('mousedown', close, true), 0);

        pop.querySelector('#osp-enabled').addEventListener('change', e => this.setEnabled(e.target.checked));
        pop.querySelector('#osp-before').addEventListener('change', e => this.setFramesBefore(+e.target.value));
        pop.querySelector('#osp-after').addEventListener('change', e => this.setFramesAfter(+e.target.value));
        pop.querySelector('#osp-step').addEventListener('change', e => this.setStepMs(+e.target.value));
        pop.querySelector('#osp-opacity').addEventListener('input', e => {
            this.setOpacity(+e.target.value);
            const v = pop.querySelector('#osp-opacity-val');
            if (v) v.textContent = Math.round(this.opacityMax * 100) + '%';
        });
        pop.querySelector('#osp-tint').addEventListener('change', e => this.setTintEnabled(e.target.checked));
    }
}

window.OnionSkin = OnionSkin;
