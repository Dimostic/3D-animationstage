/* ============================================
   Animation Stage - Easing Curve Editor
   Visual cubic-bezier curve editor with
   draggable control points and live preview
   ============================================ */

class EasingEditor {
    constructor() {
        this.modal = document.getElementById('easing-editor-modal');
        this.canvas = document.getElementById('easing-canvas');
        this.ctx = this.canvas?.getContext('2d');

        // Control points: P0=(0,0), P1=(x1,y1), P2=(x2,y2), P3=(1,1)
        this.x1 = 0.42;
        this.y1 = 0;
        this.x2 = 0.58;
        this.y2 = 1;

        this.dragging = null; // 'p1' or 'p2'
        this.padding = 40;
        this.onApply = null; // callback(easingName, cubicBezierValues)

        this.previewAnimId = null;

        if (this.canvas) this.init();
    }

    init() {
        this.bindEvents();
        this.draw();
    }

    bindEvents() {
        // Modal close
        this.modal?.querySelector('.modal-close')?.addEventListener('click', () => this.close());

        // Canvas interaction
        this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseup', () => this.onMouseUp());
        this.canvas.addEventListener('mouseleave', () => this.onMouseUp());

        // Preset buttons
        this.modal?.querySelectorAll('.easing-preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const values = btn.dataset.preset.split(',').map(Number);
                this.x1 = values[0]; this.y1 = values[1];
                this.x2 = values[2]; this.y2 = values[3];
                this.updateInputs();
                this.draw();
                this.highlightPreset(btn);
            });
        });

        // Number inputs
        const inputs = ['easing-x1', 'easing-y1', 'easing-x2', 'easing-y2'];
        inputs.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                this.x1 = parseFloat(document.getElementById('easing-x1').value) || 0;
                this.y1 = parseFloat(document.getElementById('easing-y1').value) || 0;
                this.x2 = parseFloat(document.getElementById('easing-x2').value) || 1;
                this.y2 = parseFloat(document.getElementById('easing-y2').value) || 1;
                this.draw();
            });
        });

        // Preview button
        document.getElementById('btn-easing-preview')?.addEventListener('click', () => this.runPreview());

        // Apply button
        document.getElementById('btn-easing-apply')?.addEventListener('click', () => {
            if (this.onApply) {
                this.onApply('custom', [this.x1, this.y1, this.x2, this.y2]);
            }
            eventBus.emit('history:push');
            this.close();
        });

        // Open from easing dropdown or button
        document.getElementById('btn-open-easing-editor')?.addEventListener('click', () => this.open());
        document.getElementById('param-easing')?.addEventListener('change', (e) => {
            if (e.target.value === 'custom') {
                this.open();
            }
        });
    }

    open() {
        // Prefill from currently-edited animation if it has a cubic-bezier easing
        const easEl = document.getElementById('param-easing');
        const stored = easEl?.dataset?.bezier;
        if (stored) {
            const m = stored.match(/cubic-bezier\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/);
            if (m) {
                this.x1 = parseFloat(m[1]); this.y1 = parseFloat(m[2]);
                this.x2 = parseFloat(m[3]); this.y2 = parseFloat(m[4]);
            }
        }
        this.modal?.classList.remove('hidden');
        const objectsManager = window.app?.objects;
        if (typeof objectsManager?._showImplementationFloatingToolbar === 'function') {
            objectsManager._showImplementationFloatingToolbar({
                tool: 'animation-easing',
                label: 'Easing Curve',
                hint: 'Apply this easing curve or cancel',
                applyText: 'Apply Easing',
                onApply: () => document.getElementById('btn-easing-apply')?.click(),
                onCancel: () => this.close()
            });
        }
        // Resize canvas to fit container
        requestAnimationFrame(() => {
            const wrapper = document.getElementById('easing-canvas-wrapper');
            if (wrapper) {
                const size = Math.min(wrapper.clientWidth, wrapper.clientHeight);
                this.canvas.width = size * 2;
                this.canvas.height = size * 2;
                this.canvas.style.width = size + 'px';
                this.canvas.style.height = size + 'px';
            }
            this.updateInputs();
            this.draw();
        });
    }

    close() {
        this.modal?.classList.add('hidden');
        const objectsManager = window.app?.objects;
        if (typeof objectsManager?._hideImplementationFloatingToolbar === 'function') {
            objectsManager._hideImplementationFloatingToolbar('animation-easing');
        }
        if (this.previewAnimId) {
            cancelAnimationFrame(this.previewAnimId);
            this.previewAnimId = null;
        }
    }

    highlightPreset(activeBtn) {
        this.modal?.querySelectorAll('.easing-preset-btn').forEach(b => b.classList.remove('active'));
        activeBtn.classList.add('active');
    }

    updateInputs() {
        document.getElementById('easing-x1').value = this.x1.toFixed(2);
        document.getElementById('easing-y1').value = this.y1.toFixed(2);
        document.getElementById('easing-x2').value = this.x2.toFixed(2);
        document.getElementById('easing-y2').value = this.y2.toFixed(2);
    }

    // Coordinate conversions (canvas pixels <-> normalized 0-1)
    toCanvas(nx, ny) {
        const pad = this.padding * 2; // account for DPR
        const w = this.canvas.width - pad * 2;
        const h = this.canvas.height - pad * 2;
        return {
            x: pad + nx * w,
            y: pad + (1 - ny) * h  // flip Y since canvas Y is down
        };
    }

    fromCanvas(cx, cy) {
        const pad = this.padding * 2;
        const w = this.canvas.width - pad * 2;
        const h = this.canvas.height - pad * 2;
        return {
            x: (cx - pad) / w,
            y: 1 - (cy - pad) / h
        };
    }

    onMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        const p1 = this.toCanvas(this.x1, this.y1);
        const p2 = this.toCanvas(this.x2, this.y2);
        const hitRadius = 20;

        if (Math.hypot(cx - p1.x, cy - p1.y) < hitRadius) {
            this.dragging = 'p1';
        } else if (Math.hypot(cx - p2.x, cy - p2.y) < hitRadius) {
            this.dragging = 'p2';
        }
    }

    onMouseMove(e) {
        if (!this.dragging) return;

        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const cx = (e.clientX - rect.left) * scaleX;
        const cy = (e.clientY - rect.top) * scaleY;

        const norm = this.fromCanvas(cx, cy);

        // Clamp X to [0,1], allow Y to go slightly out of range for bounce/elastic
        const clamped = {
            x: Utils.clamp(norm.x, 0, 1),
            y: Utils.clamp(norm.y, -1.5, 2.5)
        };

        if (this.dragging === 'p1') {
            this.x1 = Math.round(clamped.x * 100) / 100;
            this.y1 = Math.round(clamped.y * 100) / 100;
        } else {
            this.x2 = Math.round(clamped.x * 100) / 100;
            this.y2 = Math.round(clamped.y * 100) / 100;
        }

        this.updateInputs();
        this.draw();
    }

    onMouseUp() {
        this.dragging = null;
    }

    draw() {
        const ctx = this.ctx;
        if (!ctx) return;
        const w = this.canvas.width;
        const h = this.canvas.height;
        const pad = this.padding * 2;

        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = getComputedStyle(document.body).getPropertyValue('--bg-tertiary').trim() || '#1e1e32';
        ctx.fillRect(0, 0, w, h);

        // Grid
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        const gridW = w - pad * 2;
        const gridH = h - pad * 2;
        for (let i = 0; i <= 4; i++) {
            const x = pad + (i / 4) * gridW;
            const y = pad + (i / 4) * gridH;
            ctx.beginPath(); ctx.moveTo(x, pad); ctx.lineTo(x, h - pad); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(pad, y); ctx.lineTo(w - pad, y); ctx.stroke();
        }

        // Diagonal reference (linear)
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([6, 6]);
        const p0 = this.toCanvas(0, 0);
        const p3 = this.toCanvas(1, 1);
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.lineTo(p3.x, p3.y);
        ctx.stroke();
        ctx.setLineDash([]);

        // Control point handles (lines from endpoints to control points)
        const cp1 = this.toCanvas(this.x1, this.y1);
        const cp2 = this.toCanvas(this.x2, this.y2);

        ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(cp1.x, cp1.y); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(p3.x, p3.y); ctx.lineTo(cp2.x, cp2.y); ctx.stroke();

        // Bezier curve
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(p0.x, p0.y);
        ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, p3.x, p3.y);
        ctx.stroke();

        // Control points (draggable)
        [cp1, cp2].forEach((cp, i) => {
            ctx.fillStyle = i === 0 ? '#ff6b6b' : '#4ecdc4';
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(cp.x, cp.y, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        });

        // Endpoints
        [p0, p3].forEach(p => {
            ctx.fillStyle = '#fff';
            ctx.beginPath();
            ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
            ctx.fill();
        });

        // Labels
        ctx.fillStyle = '#6a6a82';
        ctx.font = '20px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('0', pad, h - pad + 25);
        ctx.fillText('1', w - pad, h - pad + 25);
        ctx.textAlign = 'right';
        ctx.fillText('0', pad - 10, h - pad + 5);
        ctx.fillText('1', pad - 10, pad + 5);
    }

    runPreview() {
        const dot = document.getElementById('easing-preview-dot');
        if (!dot) return;

        if (this.previewAnimId) cancelAnimationFrame(this.previewAnimId);

        const duration = 1500;
        const barWidth = dot.parentElement.clientWidth - 28;
        const start = performance.now();
        const bezier = this.createCubicBezier(this.x1, this.y1, this.x2, this.y2);

        const animate = (time) => {
            const elapsed = time - start;
            const t = Math.min(elapsed / duration, 1);
            const eased = bezier(t);
            dot.style.left = (4 + eased * barWidth) + 'px';

            if (t < 1) {
                this.previewAnimId = requestAnimationFrame(animate);
            } else {
                // Reset after a pause
                setTimeout(() => {
                    dot.style.left = '4px';
                }, 500);
            }
        };

        this.previewAnimId = requestAnimationFrame(animate);
    }

    // Create a cubic-bezier easing function from control points
    createCubicBezier(x1, y1, x2, y2) {
        // Newton's method approximation for cubic bezier
        const NEWTON_ITERATIONS = 8;
        const SUBDIVISION_PRECISION = 0.0001;

        function sampleCurveX(t) {
            return ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t + 3 * x1 * t;
        }
        function sampleCurveY(t) {
            return ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t + 3 * y1 * t;
        }
        function sampleCurveDerivativeX(t) {
            return (3 * (1 - 3 * x2 + 3 * x1)) * t * t + 2 * (3 * x2 - 6 * x1) * t + 3 * x1;
        }

        function solveCurveX(x) {
            let t = x;
            for (let i = 0; i < NEWTON_ITERATIONS; i++) {
                const currentX = sampleCurveX(t) - x;
                const currentSlope = sampleCurveDerivativeX(t);
                if (Math.abs(currentSlope) < 1e-6) break;
                t -= currentX / currentSlope;
            }
            // Clamp
            return Utils.clamp(t, 0, 1);
        }

        return function(x) {
            if (x <= 0) return 0;
            if (x >= 1) return 1;
            return sampleCurveY(solveCurveX(x));
        };
    }

    // Get the current easing as a function
    getEasingFunction() {
        return this.createCubicBezier(this.x1, this.y1, this.x2, this.y2);
    }

    // Get values as string
    getCubicBezierString() {
        return `cubic-bezier(${this.x1}, ${this.y1}, ${this.x2}, ${this.y2})`;
    }
}
