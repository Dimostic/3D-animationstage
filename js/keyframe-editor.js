/* ============================================
   Animation Stage - Keyframe Curve Editor
   Visual editor for intermediate animation keyframes
   ============================================ */

class KeyframeEditor {
    constructor() {
        this.modal = document.getElementById('keyframe-editor-modal');
        this.canvas = document.getElementById('keyframe-canvas');
        this.ctx = this.canvas?.getContext('2d');

        this.currentAnim = null;   // { objId, animId }
        this.currentProp = null;   // which property config index
        this.keyframes = [];       // [{t: 0-1, value: number}]
        this.propConfig = null;    // {property, from, to, duration}

        this.draggingKf = -1;
        this.hoverKf = -1;

        // Canvas layout
        this.padding = { top: 30, right: 30, bottom: 40, left: 50 };
        this.pointRadius = 7;

        this.onSave = null; // callback(objId, animId, configIndex, keyframes)

        this.bindEvents();
    }

    bindEvents() {
        document.getElementById('kf-close')?.addEventListener('click', () => this.close());
        document.getElementById('kf-btn-cancel')?.addEventListener('click', () => this.close());
        document.getElementById('kf-btn-save')?.addEventListener('click', () => this.save());
        document.getElementById('kf-btn-add')?.addEventListener('click', () => this.addKeyframeAtCenter());
        document.getElementById('kf-btn-reset')?.addEventListener('click', () => this.resetKeyframes());

        // Prop selector
        document.getElementById('kf-prop-select')?.addEventListener('change', (e) => {
            this.switchProperty(parseInt(e.target.value));
        });

        if (!this.canvas) return;

        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
        this.canvas.addEventListener('dblclick', (e) => this.onDblClick(e));

        // Close on backdrop click
        this.modal?.addEventListener('click', (e) => {
            if (e.target === this.modal) this.close();
        });
    }

    open(objId, animId) {
        const obj = window.app?.objects?.getObjectById(objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        this.currentAnim = { objId, animId };
        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];

        // Populate property selector
        const select = document.getElementById('kf-prop-select');
        if (select) {
            select.innerHTML = configs.map((cfg, i) => {
                if (!cfg || !cfg.property) return '';
                return `<option value="${i}">${cfg.property}</option>`;
            }).join('');
        }

        // Load first property
        this.switchProperty(0);

        this.modal?.classList.add('active');
    }

    switchProperty(index) {
        const obj = window.app?.objects?.getObjectById(this.currentAnim?.objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === this.currentAnim?.animId);
        if (!anim) return;

        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        const cfg = configs[index];
        if (!cfg) return;

        this.currentProp = index;
        this.propConfig = { ...cfg };

        // Load existing keyframes or create default start/end
        if (cfg.keyframes && cfg.keyframes.length >= 2) {
            this.keyframes = cfg.keyframes.map(kf => ({ ...kf }));
        } else {
            this.keyframes = [
                { t: 0, value: cfg.from },
                { t: 1, value: cfg.to }
            ];
        }

        // Update info
        const info = document.getElementById('kf-info');
        if (info) {
            info.textContent = `Property: ${cfg.property} | Duration: ${(cfg.duration / 1000).toFixed(2)}s`;
        }

        this.draw();
    }

    close() {
        this.modal?.classList.remove('active');
        this.currentAnim = null;
        this.currentProp = null;
        this.keyframes = [];
    }

    save() {
        if (!this.currentAnim || this.currentProp == null) return;

        const obj = window.app?.objects?.getObjectById(this.currentAnim.objId);
        if (!obj) return;
        const anim = obj.animations.find(a => a.id === this.currentAnim.animId);
        if (!anim) return;

        const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
        const cfg = configs[this.currentProp];
        if (!cfg) return;

        // Sort keyframes by time
        this.keyframes.sort((a, b) => a.t - b.t);

        // Ensure first/last are at t=0 and t=1
        if (this.keyframes.length >= 2) {
            this.keyframes[0].t = 0;
            this.keyframes[this.keyframes.length - 1].t = 1;
        }

        // Save keyframes to config
        cfg.keyframes = this.keyframes.map(kf => ({ t: kf.t, value: kf.value }));

        // Update from/to to match first/last keyframes
        cfg.from = this.keyframes[0].value;
        cfg.to = this.keyframes[this.keyframes.length - 1].value;

        if (this.onSave) {
            this.onSave(this.currentAnim.objId, this.currentAnim.animId, this.currentProp, cfg.keyframes);
        }

        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        Utils.showToast(`Saved ${this.keyframes.length} keyframes for "${cfg.property}"`, 'success');
        this.close();
    }

    addKeyframeAtCenter() {
        if (this.keyframes.length < 2) return;

        // Find the largest gap and add a keyframe in the middle
        let maxGap = 0, gapIdx = 0;
        for (let i = 0; i < this.keyframes.length - 1; i++) {
            const gap = this.keyframes[i + 1].t - this.keyframes[i].t;
            if (gap > maxGap) { maxGap = gap; gapIdx = i; }
        }

        const t = (this.keyframes[gapIdx].t + this.keyframes[gapIdx + 1].t) / 2;
        const value = (this.keyframes[gapIdx].value + this.keyframes[gapIdx + 1].value) / 2;

        this.keyframes.push({ t, value });
        this.keyframes.sort((a, b) => a.t - b.t);
        this.draw();
    }

    resetKeyframes() {
        if (!this.propConfig) return;
        this.keyframes = [
            { t: 0, value: this.propConfig.from },
            { t: 1, value: this.propConfig.to }
        ];
        this.draw();
    }

    // --- Canvas drawing ---
    draw() {
        if (!this.ctx || !this.canvas) return;

        const w = this.canvas.width = this.canvas.offsetWidth * 2;
        const h = this.canvas.height = this.canvas.offsetHeight * 2;
        const ctx = this.ctx;
        ctx.scale(2, 2);

        const dw = this.canvas.offsetWidth;
        const dh = this.canvas.offsetHeight;
        const p = this.padding;
        const plotW = dw - p.left - p.right;
        const plotH = dh - p.top - p.bottom;

        // Background
        ctx.fillStyle = '#12122a';
        ctx.fillRect(0, 0, dw, dh);

        // Find value range
        const values = this.keyframes.map(kf => kf.value);
        let minV = Math.min(...values);
        let maxV = Math.max(...values);
        if (minV === maxV) { minV -= 10; maxV += 10; }
        const rangeV = maxV - minV;
        const padV = rangeV * 0.1;
        minV -= padV;
        maxV += padV;

        // Axis functions
        const toX = (t) => p.left + t * plotW;
        const toY = (v) => p.top + plotH - ((v - minV) / (maxV - minV)) * plotH;
        const fromX = (px) => Math.max(0, Math.min(1, (px - p.left) / plotW));
        const fromY = (py) => minV + (1 - (py - p.top) / plotH) * (maxV - minV);

        this._toX = toX; this._toY = toY;
        this._fromX = fromX; this._fromY = fromY;

        // Grid
        ctx.strokeStyle = '#1e1e45';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const x = toX(i / 10);
            ctx.beginPath(); ctx.moveTo(x, p.top); ctx.lineTo(x, p.top + plotH); ctx.stroke();
        }
        for (let i = 0; i <= 5; i++) {
            const v = minV + (i / 5) * (maxV - minV);
            const y = toY(v);
            ctx.beginPath(); ctx.moveTo(p.left, y); ctx.lineTo(p.left + plotW, y); ctx.stroke();
        }

        // Axes
        ctx.strokeStyle = '#3a3a6c';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.left, p.top);
        ctx.lineTo(p.left, p.top + plotH);
        ctx.lineTo(p.left + plotW, p.top + plotH);
        ctx.stroke();

        // Axis labels
        ctx.fillStyle = '#8888aa';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        for (let i = 0; i <= 10; i += 2) {
            ctx.fillText((i * 10) + '%', toX(i / 10), p.top + plotH + 15);
        }
        ctx.textAlign = 'right';
        for (let i = 0; i <= 5; i++) {
            const v = minV + (i / 5) * (maxV - minV);
            ctx.fillText(Math.round(v * 10) / 10, p.left - 5, toY(v) + 3);
        }

        // Label
        ctx.fillStyle = '#a0a0c0';
        ctx.font = '11px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Time →', p.left + plotW / 2, dh - 5);
        ctx.save();
        ctx.translate(12, p.top + plotH / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('Value', 0, 0);
        ctx.restore();

        // Draw curve
        if (this.keyframes.length >= 2) {
            const sorted = [...this.keyframes].sort((a, b) => a.t - b.t);

            // Smooth curve using Catmull-Rom spline
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(toX(sorted[0].t), toY(sorted[0].value));

            if (sorted.length === 2) {
                ctx.lineTo(toX(sorted[1].t), toY(sorted[1].value));
            } else {
                for (let i = 0; i < sorted.length - 1; i++) {
                    const p0 = sorted[Math.max(0, i - 1)];
                    const p1 = sorted[i];
                    const p2 = sorted[i + 1];
                    const p3 = sorted[Math.min(sorted.length - 1, i + 2)];

                    // Catmull-Rom to cubic bezier control points
                    const cp1x = toX(p1.t + (p2.t - p0.t) / 6);
                    const cp1y = toY(p1.value + (p2.value - p0.value) / 6);
                    const cp2x = toX(p2.t - (p3.t - p1.t) / 6);
                    const cp2y = toY(p2.value - (p3.value - p1.value) / 6);

                    ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, toX(p2.t), toY(p2.value));
                }
            }
            ctx.stroke();

            // Draw keyframe points
            sorted.forEach((kf, idx) => {
                const x = toX(kf.t);
                const y = toY(kf.value);
                const isFirst = idx === 0;
                const isLast = idx === sorted.length - 1;
                const isHover = idx === this.hoverKf;
                const isDrag = idx === this.draggingKf;

                // Diamond shape
                const r = isDrag ? 9 : isHover ? 8 : this.pointRadius;
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.PI / 4);

                ctx.fillStyle = isFirst || isLast ? '#818cf8' : '#f59e0b';
                ctx.strokeStyle = isDrag ? '#fff' : isHover ? '#e0e0e0' : '#2a2a50';
                ctx.lineWidth = 2;

                ctx.fillRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);
                ctx.strokeRect(-r / 1.4, -r / 1.4, r * 1.4, r * 1.4);

                ctx.restore();

                // Value label
                ctx.fillStyle = '#ccc';
                ctx.font = '10px Inter';
                ctx.textAlign = 'center';
                ctx.fillText(Math.round(kf.value * 10) / 10, x, y - 12);
            });
        }
    }

    getKfAtPoint(px, py) {
        // Guard: draw() must run first to define coordinate transforms
        if (!this._toX || !this._toY) return -1;
        const sorted = [...this.keyframes].sort((a, b) => a.t - b.t);
        for (let i = sorted.length - 1; i >= 0; i--) {
            const x = this._toX(sorted[i].t);
            const y = this._toY(sorted[i].value);
            const dist = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
            if (dist <= this.pointRadius + 4) {
                // Find the actual index in this.keyframes
                return this.keyframes.indexOf(sorted[i]);
            }
        }
        return -1;
    }

    getCanvasPos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    }

    onMouseDown(e) {
        const pos = this.getCanvasPos(e);
        const idx = this.getKfAtPoint(pos.x, pos.y);
        if (idx >= 0) {
            this.draggingKf = idx;
            this.canvas.style.cursor = 'grabbing';
        }
    }

    onMouseMove(e) {
        const pos = this.getCanvasPos(e);

        if (this.draggingKf >= 0) {
            const kf = this.keyframes[this.draggingKf];
            if (!kf) return;

            const sorted = [...this.keyframes].sort((a, b) => a.t - b.t);
            const isFirst = sorted[0] === kf;
            const isLast = sorted[sorted.length - 1] === kf;

            // Endpoints: t is locked at 0 or 1, only value changes
            if (isFirst) {
                kf.t = 0;
                kf.value = this._fromY(pos.y);
            } else if (isLast) {
                kf.t = 1;
                kf.value = this._fromY(pos.y);
            } else {
                kf.t = Math.max(0.01, Math.min(0.99, this._fromX(pos.x)));
                kf.value = this._fromY(pos.y);
            }

            this.draw();
            return;
        }

        // Hover detection
        const idx = this.getKfAtPoint(pos.x, pos.y);
        if (idx !== this.hoverKf) {
            this.hoverKf = idx;
            this.canvas.style.cursor = idx >= 0 ? 'grab' : 'crosshair';
            this.draw();
        }
    }

    onMouseUp() {
        if (this.draggingKf >= 0) {
            this.draggingKf = -1;
            this.canvas.style.cursor = 'crosshair';
            this.draw();
        }
    }

    onDblClick(e) {
        const pos = this.getCanvasPos(e);
        const idx = this.getKfAtPoint(pos.x, pos.y);

        if (idx >= 0) {
            // Double-click on keyframe: remove it (unless first/last)
            const sorted = [...this.keyframes].sort((a, b) => a.t - b.t);
            const kf = this.keyframes[idx];
            if (kf !== sorted[0] && kf !== sorted[sorted.length - 1]) {
                this.keyframes.splice(idx, 1);
                this.hoverKf = -1;
                this.draggingKf = -1;
                this.draw();
            }
        } else {
            // Double-click on empty: add keyframe
            const t = this._fromX(pos.x);
            const value = this._fromY(pos.y);
            if (t > 0 && t < 1) {
                this.keyframes.push({ t, value });
                this.keyframes.sort((a, b) => a.t - b.t);
                this.draw();
            }
        }
    }
}

// --- Extend applyAnimationsAtTime to support keyframe arrays ---
// This patches the animation engine to use intermediate keyframes when present.
// The original function handles all animation logic (property, path-follow, diagnostics).
// This patch calls it first, then applies keyframe overrides for configs that have keyframes.
(function patchKeyframeSupport() {
    const origApply = AnimationEngine.prototype.applyAnimationsAtTime;

    AnimationEngine.prototype.applyAnimationsAtTime = function(time, options = {}) {
        // Call the original implementation — handles property anims, path-follow,
        // state restoration, diagnostics, and render requests
        origApply.call(this, time, options);

        // Now apply keyframe overrides: for any config that has a keyframes array,
        // re-interpolate using the keyframe editor's multi-point interpolation
        this.objects.objects.forEach((obj) => {
            if (!obj.animations || obj.animations.length === 0) return;

            obj.animations.forEach(anim => {
                if (!anim || !anim.generated) return;
                if (options.persistentOnly && typeof this._animationKeepsFinalState === 'function' && !this._animationKeepsFinalState(anim)) {
                    return;
                }

                const trigger = anim.trigger || 'onLoad';
                let animStart = anim.delay || 0;
                if (trigger !== 'onLoad') {
                    const triggerTime = this._triggeredAnims?.[anim.id];
                    if (triggerTime === undefined) return;
                    animStart = triggerTime + (anim.delay || 0);
                }

                const configs = Array.isArray(anim.generated) ? anim.generated : [anim.generated];

                configs.forEach(config => {
                    if (!config || !config.property || !config.keyframes || config.keyframes.length < 2) return;

                    const { property, from, to, duration, easing = 'easeInOut', pingpong, keyframes } = config;
                    if (!duration || duration <= 0) return;

                    const elapsed = time - animStart;
                    if (elapsed < 0) return;

                    const playback = typeof this._getAnimationPlaybackState === 'function'
                        ? this._getAnimationPlaybackState(anim, duration, elapsed)
                        : { apply: true, elapsed, repeatCount: (anim.repeat === '-1' ? Infinity : (anim.repeat === 'pingpong' ? 1 : (parseInt(anim.repeat) || 1))) };
                    if (!playback.apply) return;

                    const repeat = playback.repeatCount;

                    const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;

                    let localTime = playback.elapsed;
                    if (repeat !== Infinity) {
                        localTime = Math.min(playback.elapsed, duration * repeat);
                    }

                    let cycleTime = localTime % duration;
                    let progress = Math.min(cycleTime / duration, 1);

                    if (localTime >= duration * repeat && repeat !== Infinity) {
                        progress = 1;
                    }

                    // Smooth cycle: reverse direction on odd-numbered cycles
                    if (isCycleMode) {
                        const cycleIndex = Math.floor(localTime / duration);
                        if (cycleIndex % 2 === 1 && !(localTime >= duration * repeat && repeat !== Infinity)) {
                            progress = 1 - progress;
                        }
                    }

                    const easingFn = Utils.getEasing(easing);
                    if (pingpong) {
                        progress = progress < 0.5
                            ? easingFn(progress * 2)
                            : easingFn(2 - progress * 2);
                    } else {
                        progress = easingFn(progress);
                    }

                    // Override with keyframe interpolation
                    obj[property] = KeyframeEditor.interpolateKeyframes(keyframes, progress);
                });
            });
        });
    };
})();

// Static method for interpolating between keyframes
KeyframeEditor.interpolateKeyframes = function(keyframes, progress) {
    const sorted = [...keyframes].sort((a, b) => a.t - b.t);

    // Clamp
    if (progress <= sorted[0].t) return sorted[0].value;
    if (progress >= sorted[sorted.length - 1].t) return sorted[sorted.length - 1].value;

    // Find the two surrounding keyframes
    for (let i = 0; i < sorted.length - 1; i++) {
        if (progress >= sorted[i].t && progress <= sorted[i + 1].t) {
            const segProgress = (progress - sorted[i].t) / (sorted[i + 1].t - sorted[i].t);
            return Utils.lerp(sorted[i].value, sorted[i + 1].value, segProgress);
        }
    }

    return sorted[sorted.length - 1].value;
};
