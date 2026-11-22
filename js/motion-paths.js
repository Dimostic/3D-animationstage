/* ============================================
   Motion Paths Overlay
   --------------------------------------------
   Draws each animated object's trajectory across the timeline as a
   coloured polyline, sampled at a regular cadence. Standard motion-
   graphics review tool — lets you see the shape and rhythm of motion
   at a glance, spot timing issues, and verify path-follow / chain /
   custom animations are going where you expect.

   Architecture:
   • Listens on stage:render-overlay (ctx is already stage-transformed).
   • Builds a per-object cache of {time, x, y} samples by stepping
     AnimationEngine.applyAnimationsAtTime() across the timeline and
     reading the object's pivot position at each step.
   • Cache invalidates on history:push / timeline:update / object change
     so edits show up immediately, but is reused frame-to-frame so
     scrubbing is cheap.
   • Restores the live pose after sampling so interaction is unaffected.
   • Auto-disabled during playback to avoid sampling-on-every-frame
     overhead.
   ============================================ */

class MotionPaths {
    constructor(stage, objects, animations) {
        this.stage = stage;
        this.objects = objects;
        this.animations = animations;

        this.enabled = false;
        this.scope = 'animated';   // 'animated' | 'selected' | 'all'
        this.stepMs = 60;          // sample every 60 ms
        this.showDots = true;      // dot every Nth sample for tempo
        this.dotEveryMs = 250;     // marker every 250 ms
        this.showStartEnd = true;
        this.showCurrent = true;
        this.lineWidthPx = 2;      // in screen pixels
        this.opacity = 0.85;

        this._busy = false;
        this._cache = null;        // Map<objId, { samples, totalDuration }>
        this._cacheKey = null;     // signature used to validate cache

        this._restore();
    }

    init() {
        eventBus.on('stage:render-overlay', (ctx) => this._renderOverlay(ctx));
        const invalidate = () => { this._cache = null; if (this.enabled) this.stage.requestRender(); };
        eventBus.on('history:push', invalidate);
        eventBus.on('timeline:update', invalidate);
        eventBus.on('animation:applied', invalidate);
        eventBus.on('object:removed', invalidate);
        eventBus.on('selection:changed', () => { if (this.enabled && this.scope === 'selected') this.stage.requestRender(); });
        eventBus.on('timeline:time', () => { if (this.enabled && this.showCurrent) this.stage.requestRender(); });
    }

    // === Settings ===
    setEnabled(v) {
        this.enabled = !!v;
        this._save();
        this._syncToggleButton();
        this.stage.requestRender();
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Motion Paths ' + (this.enabled ? 'on' : 'off'), 'info');
        }
    }
    toggle() { this.setEnabled(!this.enabled); }

    setScope(s) {
        if (['animated', 'selected', 'all'].includes(s)) {
            this.scope = s;
            this._cache = null;
            this._save();
            this.stage.requestRender();
        }
    }
    setStepMs(ms)    { this.stepMs = Math.max(15, Math.min(500, ms | 0)); this._cache = null; this._save(); this.stage.requestRender(); }
    setShowDots(v)   { this.showDots = !!v; this._save(); this.stage.requestRender(); }
    setDotEveryMs(ms){ this.dotEveryMs = Math.max(50, ms | 0); this._save(); this.stage.requestRender(); }
    setShowStartEnd(v){ this.showStartEnd = !!v; this._save(); this.stage.requestRender(); }
    setShowCurrent(v){ this.showCurrent = !!v; this._save(); this.stage.requestRender(); }
    setOpacity(o)    { this.opacity = Math.max(0.1, Math.min(1, +o)); this._save(); this.stage.requestRender(); }

    _save() {
        try {
            localStorage.setItem('motionPaths', JSON.stringify({
                enabled: this.enabled,
                scope: this.scope,
                stepMs: this.stepMs,
                showDots: this.showDots,
                dotEveryMs: this.dotEveryMs,
                showStartEnd: this.showStartEnd,
                showCurrent: this.showCurrent,
                opacity: this.opacity
            }));
        } catch (_) { /* private mode */ }
    }
    _restore() {
        try {
            const j = JSON.parse(localStorage.getItem('motionPaths') || '{}');
            if (typeof j.enabled === 'boolean') this.enabled = j.enabled;
            if (typeof j.scope === 'string') this.scope = j.scope;
            if (Number.isFinite(j.stepMs)) this.stepMs = j.stepMs;
            if (typeof j.showDots === 'boolean') this.showDots = j.showDots;
            if (Number.isFinite(j.dotEveryMs)) this.dotEveryMs = j.dotEveryMs;
            if (typeof j.showStartEnd === 'boolean') this.showStartEnd = j.showStartEnd;
            if (typeof j.showCurrent === 'boolean') this.showCurrent = j.showCurrent;
            if (Number.isFinite(j.opacity)) this.opacity = j.opacity;
        } catch (_) { /* corrupt */ }
    }

    _syncToggleButton() {
        const btn = document.getElementById('btn-motion-paths');
        if (btn) btn.classList.toggle('active', this.enabled);
    }

    // === Sampling ===
    _selectTargetObjects() {
        const all = this.objects?.objects || [];
        if (this.scope === 'all') return all;
        if (this.scope === 'selected') {
            const ids = new Set(this.objects.selectedIds || []);
            return all.filter(o => ids.has(o.id));
        }
        // 'animated' (default)
        return all.filter(o => Array.isArray(o.animations) && o.animations.length > 0);
    }

    _hashColor(id) {
        // Deterministic hue from object id — gives each object a stable, distinct colour.
        let h = 0;
        const s = String(id || '');
        for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
        const hue = Math.abs(h) % 360;
        return `hsl(${hue}, 80%, 62%)`;
    }

    _buildCacheKey(targets) {
        // Cache invalidation signature — keyed off animation definitions and
        // each target's STATIC baseline (from originalStates if present, else
        // current props). Critically we do NOT key off live obj.x/y/width
        // because those mutate every frame during scrub/playback and would
        // otherwise force a full re-sample on every mouse move.
        const baseline = this.animations?.originalStates;
        const animSig = targets.map(o => {
            const ids = (o.animations || []).map(a => `${a.id}:${a.delay || 0}:${a.repeat || 1}:${a.repeatMode || ''}`).join(',');
            const base = baseline && baseline.get && baseline.get(o.id);
            const bx = base ? base.x : o.x;
            const by = base ? base.y : o.y;
            const bw = base ? base.width : o.width;
            const bh = base ? base.height : o.height;
            return `${o.id}|${ids}|${Math.round(bx || 0)}|${Math.round(by || 0)}|${Math.round(bw || 0)}|${Math.round(bh || 0)}`;
        }).join(';');
        return `${this.scope}|${this.stepMs}|${Math.round(this.animations?.totalDuration || 0)}|${animSig}`;
    }

    _ensureSamples(targets) {
        const key = this._buildCacheKey(targets);
        if (this._cacheKey === key && this._cache) return;

        const total = Math.max(0, this.animations?.totalDuration || 0);
        const cache = new Map();
        if (total <= 0 || targets.length === 0) {
            this._cache = cache;
            this._cacheKey = key;
            return;
        }

        let createdOriginal = false;
        const liveTime = this.animations.currentTime || 0;

        try {
            // applyAnimationsAtTime needs an originalStates baseline.
            if (!this.animations.originalStates || !(this.animations.originalStates instanceof Map)) {
                this.animations.originalStates = new Map();
                this.objects.objects.forEach(obj => {
                    this.animations.originalStates.set(obj.id, Utils.deepClone(obj.toJSON()));
                });
                createdOriginal = true;
            }

            // Initialise sample arrays
            targets.forEach(obj => cache.set(obj.id, []));

            const step = Math.max(15, this.stepMs | 0);
            for (let t = 0; t <= total; t += step) {
                try { this.animations.applyAnimationsAtTime(t, { finalPose: true }); }
                catch (_) { continue; }
                targets.forEach(obj => {
                    if (!obj || obj.visible === false) return;
                    const pivot = (typeof obj.getPivotPoint === 'function')
                        ? obj.getPivotPoint()
                        : { x: obj.x + (obj.width || 0) * (obj.pivotX ?? 0.5),
                            y: obj.y + (obj.height || 0) * (obj.pivotY ?? 0.5) };
                    cache.get(obj.id).push({ t, x: pivot.x, y: pivot.y });
                });
            }
            // Always include the exact end frame so the final marker lands on the
            // animation's actual end point rather than the last step boundary.
            if (total % step !== 0) {
                try { this.animations.applyAnimationsAtTime(total, { finalPose: true }); } catch (_) {}
                targets.forEach(obj => {
                    if (!obj || obj.visible === false) return;
                    const pivot = (typeof obj.getPivotPoint === 'function')
                        ? obj.getPivotPoint()
                        : { x: obj.x + (obj.width || 0) * (obj.pivotX ?? 0.5),
                            y: obj.y + (obj.height || 0) * (obj.pivotY ?? 0.5) };
                    cache.get(obj.id).push({ t: total, x: pivot.x, y: pivot.y });
                });
            }
        } finally {
            // Restore live pose so interaction sees the right state.
            // PowerPoint-style behavior: when we created originalStates ourselves
            // (i.e. not currently playing), restore objects from that pristine
            // snapshot rather than re-evaluating animations at t=0, which would
            // otherwise lock objects into their from-state (e.g. opacity 0 for fade-in).
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
                    this.animations.applyAnimationsAtTime(liveTime, {
                        finalPose: !this.animations.isPlaying
                    });
                } catch (_) { /* ignore */ }
            }
        }

        // Drop trajectories that don't actually move (saves rendering noise).
        for (const [id, samples] of cache) {
            if (samples.length < 2) { cache.delete(id); continue; }
            let moves = false;
            const first = samples[0];
            for (let i = 1; i < samples.length; i++) {
                const dx = samples[i].x - first.x;
                const dy = samples[i].y - first.y;
                if (dx * dx + dy * dy > 0.5) { moves = true; break; }
            }
            if (!moves) cache.delete(id);
        }

        this._cache = cache;
        this._cacheKey = key;
    }

    // === Render ===
    _renderOverlay(ctx) {
        if (!this.enabled || this._busy) return;
        if (this.animations && this.animations.isPlaying) return;
        if (this.animations && this.animations._exportingVideo) return;
        if (!this.objects || !this.objects.objects || this.objects.objects.length === 0) return;

        this._busy = true;
        try {
            const targets = this._selectTargetObjects();
            if (targets.length === 0) return;
            this._ensureSamples(targets);
            if (!this._cache || this._cache.size === 0) return;

            const zoom = this.stage?.zoom || 1;
            const px = 1 / zoom;
            const lineW = this.lineWidthPx * px;
            const dotR = 3 * px;
            const endR = 5 * px;
            const currentR = 6 * px;
            const dotEvery = Math.max(1, Math.round(this.dotEveryMs / Math.max(15, this.stepMs)));
            const liveTime = this.animations.currentTime || 0;

            ctx.save();
            ctx.globalAlpha = this.opacity;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            for (const [objId, samples] of this._cache) {
                if (!samples || samples.length < 2) continue;
                // Stationary pivots have no readable trajectory; stacked markers look like extra joints.
                if (!samples.some(sample => Math.hypot(sample.x - samples[0].x, sample.y - samples[0].y) * zoom > 3)) continue;
                const colour = this._hashColor(objId);

                // Path stroke
                ctx.strokeStyle = colour;
                ctx.lineWidth = lineW;
                ctx.beginPath();
                ctx.moveTo(samples[0].x, samples[0].y);
                for (let i = 1; i < samples.length; i++) {
                    ctx.lineTo(samples[i].x, samples[i].y);
                }
                ctx.stroke();

                // Tempo dots — every Nth sample
                if (this.showDots) {
                    ctx.fillStyle = colour;
                    for (let i = dotEvery; i < samples.length - 1; i += dotEvery) {
                        const s = samples[i];
                        ctx.beginPath();
                        ctx.arc(s.x, s.y, dotR, 0, Math.PI * 2);
                        ctx.fill();
                    }
                }

                // Start (hollow) and end (filled with arrow tick) markers
                if (this.showStartEnd) {
                    const start = samples[0];
                    const end = samples[samples.length - 1];

                    ctx.lineWidth = 1.5 * px;
                    ctx.strokeStyle = colour;
                    ctx.fillStyle = '#0a0a14';
                    ctx.beginPath();
                    ctx.arc(start.x, start.y, endR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();

                    ctx.fillStyle = colour;
                    ctx.beginPath();
                    ctx.arc(end.x, end.y, endR, 0, Math.PI * 2);
                    ctx.fill();

                    // Direction arrow head at end
                    const prev = samples[samples.length - 2];
                    const dx = end.x - prev.x;
                    const dy = end.y - prev.y;
                    const len = Math.hypot(dx, dy);
                    if (len > 0.001) {
                        const nx = dx / len, ny = dy / len;
                        const arrow = 9 * px;
                        const wing = 4 * px;
                        const tipX = end.x + nx * arrow;
                        const tipY = end.y + ny * arrow;
                        const baseX = end.x - nx * 1 * px;
                        const baseY = end.y - ny * 1 * px;
                        ctx.fillStyle = colour;
                        ctx.beginPath();
                        ctx.moveTo(tipX, tipY);
                        ctx.lineTo(baseX + ny * wing, baseY - nx * wing);
                        ctx.lineTo(baseX - ny * wing, baseY + nx * wing);
                        ctx.closePath();
                        ctx.fill();
                    }
                }

                // Current-time marker — interpolate between samples bounding liveTime.
                if (this.showCurrent && liveTime >= samples[0].t && liveTime <= samples[samples.length - 1].t) {
                    let pos = null;
                    for (let i = 1; i < samples.length; i++) {
                        if (samples[i].t >= liveTime) {
                            const a = samples[i - 1], b = samples[i];
                            const span = (b.t - a.t) || 1;
                            const k = (liveTime - a.t) / span;
                            pos = { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
                            break;
                        }
                    }
                    if (!pos) pos = samples[samples.length - 1];

                    ctx.lineWidth = 2 * px;
                    ctx.strokeStyle = '#ffffff';
                    ctx.fillStyle = colour;
                    ctx.beginPath();
                    ctx.arc(pos.x, pos.y, currentR, 0, Math.PI * 2);
                    ctx.fill();
                    ctx.stroke();
                }
            }

            ctx.restore();
        } finally {
            this._busy = false;
        }
    }

    // === UI ===
    bindUI() {
        const btn = document.getElementById('btn-motion-paths');
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
        // Keyboard shortcut: M
        document.addEventListener('keydown', (e) => {
            if (e.repeat) return;
            const tag = (e.target && e.target.tagName) || '';
            if (/INPUT|TEXTAREA|SELECT/.test(tag) || (e.target && e.target.isContentEditable)) return;
            if (e.ctrlKey || e.metaKey || e.altKey) return;
            if (e.key === 'm' || e.key === 'M') {
                e.preventDefault();
                this.toggle();
            }
        });
        this._syncToggleButton();
    }

    _openPopover(anchor) {
        let pop = document.getElementById('motion-paths-popover');
        if (pop) { pop.remove(); return; }

        pop = document.createElement('div');
        pop.id = 'motion-paths-popover';
        pop.className = 'onion-skin-popover motion-paths-popover';
        pop.innerHTML = `
            <div class="osp-row osp-title">
                <i class="fas fa-route"></i> Motion Paths
                <label class="osp-toggle">
                    <input type="checkbox" id="mpp-enabled" ${this.enabled ? 'checked' : ''}>
                    <span>${this.enabled ? 'On' : 'Off'}</span>
                </label>
            </div>
            <div class="osp-row">
                <label>Show paths for</label>
                <select id="mpp-scope">
                    <option value="animated"${this.scope === 'animated' ? ' selected' : ''}>Animated objects</option>
                    <option value="selected"${this.scope === 'selected' ? ' selected' : ''}>Selected only</option>
                    <option value="all"${this.scope === 'all' ? ' selected' : ''}>All objects</option>
                </select>
            </div>
            <div class="osp-row">
                <label>Sample step (ms)</label>
                <input type="number" id="mpp-step" min="15" max="500" step="5" value="${this.stepMs}">
            </div>
            <div class="osp-row">
                <label class="osp-inline">
                    <input type="checkbox" id="mpp-dots" ${this.showDots ? 'checked' : ''}>
                    Tempo dots
                </label>
            </div>
            <div class="osp-row">
                <label>Dot every (ms)</label>
                <input type="number" id="mpp-dot-every" min="50" max="2000" step="10" value="${this.dotEveryMs}">
            </div>
            <div class="osp-row">
                <label class="osp-inline">
                    <input type="checkbox" id="mpp-startend" ${this.showStartEnd ? 'checked' : ''}>
                    Start / end markers + arrow
                </label>
            </div>
            <div class="osp-row">
                <label class="osp-inline">
                    <input type="checkbox" id="mpp-current" ${this.showCurrent ? 'checked' : ''}>
                    Playhead marker
                </label>
            </div>
            <div class="osp-row">
                <label>Opacity</label>
                <input type="range" id="mpp-opacity" min="0.1" max="1" step="0.05" value="${this.opacity}">
                <span id="mpp-opacity-val">${Math.round(this.opacity * 100)}%</span>
            </div>
            <div class="osp-row osp-hint">Press <kbd>M</kbd> to toggle. Right-click the toolbar button to reopen these settings.</div>
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

        pop.querySelector('#mpp-enabled').addEventListener('change', e => this.setEnabled(e.target.checked));
        pop.querySelector('#mpp-scope').addEventListener('change', e => this.setScope(e.target.value));
        pop.querySelector('#mpp-step').addEventListener('change', e => this.setStepMs(+e.target.value));
        pop.querySelector('#mpp-dots').addEventListener('change', e => this.setShowDots(e.target.checked));
        pop.querySelector('#mpp-dot-every').addEventListener('change', e => this.setDotEveryMs(+e.target.value));
        pop.querySelector('#mpp-startend').addEventListener('change', e => this.setShowStartEnd(e.target.checked));
        pop.querySelector('#mpp-current').addEventListener('change', e => this.setShowCurrent(e.target.checked));
        pop.querySelector('#mpp-opacity').addEventListener('input', e => {
            this.setOpacity(+e.target.value);
            const v = pop.querySelector('#mpp-opacity-val');
            if (v) v.textContent = Math.round(this.opacity * 100) + '%';
        });
    }
}
