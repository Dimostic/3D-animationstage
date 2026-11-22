/* Reversible photo mask and texture editing. Source pixels are never changed. */
(function () {
    'use strict';
    const clamp = (n, min, max, fallback = min) => Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
    const canvas = (width, height) => Object.assign(document.createElement('canvas'), { width, height });

    class PhotoCutoutEditor {
        constructor(source, cutout, cloneBrush = null) {
            if (!source?.width || !source?.height || source.width !== cutout?.width || source.height !== cutout?.height) throw new Error('Cutout dimensions must match the source photo.');
            this.source = source;
            this.cloneBrush = cloneBrush;
            this.width = source.width; this.height = source.height;
            const original = source.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, this.width, this.height).data;
            const current = cutout.getContext('2d').getImageData(0, 0, this.width, this.height).data;
            this.originalPixels = original;
            // Retain previously corrected RGB values when reopening a committed cutout.
            this.colorCanvas = canvas(this.width, this.height);
            const colorContext = this.colorCanvas.getContext('2d'), colors = colorContext.createImageData(this.width, this.height);
            colors.data.set(original);
            for (let i = 0; i < original.length; i += 4) if (current[i + 3]) {
                colors.data[i] = current[i]; colors.data[i + 1] = current[i + 1]; colors.data[i + 2] = current[i + 2];
            }
            colorContext.putImageData(colors, 0, 0);
            this.colorPixels = colors.data;
            this.mask = new Uint8ClampedArray(this.width * this.height);
            for (let i = 0; i < this.mask.length; i++) {
                // Store relative coverage so existing source transparency is applied once.
                this.mask[i] = original[i * 4 + 3] ? Math.min(255, current[i * 4 + 3] * 255 / original[i * 4 + 3]) : 0;
            }
            this.feather = 0; this.cleanup = 0; this.inset = 0; this.defringe = 0;
            this.undoStack = []; this.redoStack = [];
            this.historyLimit = Math.max(2, Math.min(20, Math.floor(32 * 1024 * 1024 / (this.mask.length * 5))));
            this.output = canvas(this.width, this.height);
            this.maskCanvas = canvas(this.width, this.height);
            this.maskPixels = this.maskCanvas.getContext('2d').createImageData(this.width, this.height);
            this.render();
        }

        snapshot() { return { mask: this.mask.slice(), colors: this.colorPixels, feather: this.feather, cleanup: this.cleanup, inset: this.inset, defringe: this.defringe }; }
        checkpoint() {
            this.undoStack.push(this.snapshot());
            if (this.undoStack.length > this.historyLimit) this.undoStack.shift();
            this.redoStack = [];
        }
        restore(snapshot) {
            this.mask = snapshot.mask; this.feather = snapshot.feather; this.cleanup = snapshot.cleanup;
            this.inset = snapshot.inset || 0; this.defringe = snapshot.defringe || 0;
            this.colorPixels = snapshot.colors;
            this.colorCanvas.getContext('2d').putImageData(new ImageData(this.colorPixels, this.width, this.height), 0, 0);
            this.cloneSession = null;
            this.stroke = null; this.adjusting = false;
            return this.render();
        }
        undo() {
            if (!this.undoStack.length) return false;
            this.redoStack.push(this.snapshot()); this.restore(this.undoStack.pop()); return true;
        }
        redo() {
            if (!this.redoStack.length) return false;
            this.undoStack.push(this.snapshot()); this.restore(this.redoStack.pop()); return true;
        }
        setEdge(key, value, finish = false) {
            if (!['feather', 'cleanup', 'inset', 'defringe'].includes(key)) return;
            if (!this.adjusting) { this.checkpoint(); this.adjusting = true; }
            this[key] = clamp(value, 0, key === 'feather' ? 4 : key === 'inset' ? 3 : 100);
            if (finish) this.adjusting = false;
        }

        removeSpecks() {
            const n = this.mask.length, labels = new Int32Array(n), queue = new Int32Array(n), sizes = [0];
            const visible = i => this.mask[i] > 0 && this.originalPixels[i * 4 + 3] > 0;
            let largest = 0;
            for (let start = 0; start < n; start++) {
                if (labels[start] || !visible(start)) continue;
                const id = sizes.length;
                let head = 0, tail = 1; queue[0] = start; labels[start] = id;
                while (head < tail) {
                    const i = queue[head++], x = i % this.width, y = Math.floor(i / this.width);
                    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
                        const px = x + dx, py = y + dy;
                        if (px < 0 || py < 0 || px >= this.width || py >= this.height) continue;
                        const next = py * this.width + px;
                        if (!labels[next] && visible(next)) { labels[next] = id; queue[tail++] = next; }
                    }
                }
                sizes.push(tail);
                if (tail > sizes[largest]) largest = id;
            }
            const limit = Math.min(128, Math.max(4, Math.round(n * .00003)));
            let removed = 0;
            for (let i = 0; i < n; i++) if (labels[i] && labels[i] !== largest && sizes[labels[i]] <= limit) removed++;
            if (!removed) return 0;
            this.checkpoint(); this.adjusting = false;
            for (let i = 0; i < n; i++) if (labels[i] && labels[i] !== largest && sizes[labels[i]] <= limit) this.mask[i] = 0;
            this.render();
            return removed;
        }

        trimMask(alpha, radius) {
            const out = new Uint8ClampedArray(alpha.length), temp = new Uint8ClampedArray(alpha.length);
            for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
                let min = 255;
                for (let d = -radius; d <= radius; d++) min = Math.min(min, alpha[y * this.width + clamp(x + d, 0, this.width - 1)]);
                temp[y * this.width + x] = min;
            }
            for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
                let min = 255;
                for (let d = -radius; d <= radius; d++) min = Math.min(min, temp[clamp(y + d, 0, this.height - 1) * this.width + x]);
                out[y * this.width + x] = min;
            }
            return out;
        }

        correctFringe(ctx) {
            const pixels = ctx.getImageData(0, 0, this.width, this.height), data = pixels.data;
            // Borrow nearby opaque foreground color only at translucent edges. Alpha,
            // interior skin/clothing and distant fine strands remain unchanged.
            for (let y = 0; y < this.height; y++) for (let x = 0; x < this.width; x++) {
                const i = (y * this.width + x) * 4, alpha = data[i + 3];
                if (!alpha || alpha >= 250) continue;
                let nearest = -1, distance = 26;
                for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
                    const d = dx * dx + dy * dy, px = x + dx, py = y + dy;
                    if (d >= distance || px < 0 || py < 0 || px >= this.width || py >= this.height) continue;
                    const j = (py * this.width + px) * 4;
                    if (data[j + 3] >= 250) { distance = d; nearest = j; }
                }
                if (nearest < 0) continue;
                const blend = this.defringe / 100 * (1 - alpha / 255);
                for (let c = 0; c < 3; c++) data[i + c] += (this.colorPixels[nearest + c] - data[i + c]) * blend;
            }
            ctx.putImageData(pixels, 0, 0);
        }

        refineSolidBackground() {
            const { width: w, height: h, originalPixels: source } = this;
            const samples = [];
            const sample = (x, y) => { const i = (y * w + x) * 4; if (source[i + 3] >= 250) samples.push([...source.slice(i, i + 3)]); };
            for (let t = 0; t <= 32; t++) {
                const x = Math.round(t * (w - 1) / 32), y = Math.round(t * (h - 1) / 32);
                sample(x, 0); sample(x, h - 1); sample(0, y); sample(w - 1, y);
            }
            if (samples.length < 120) return false;
            const bg = [0, 1, 2].map(c => samples.map(p => p[c]).sort((a, b) => a - b)[Math.floor(samples.length / 2)]);
            const difference = p => Math.max(...bg.map((v, c) => Math.abs(v - p[c])));
            // Only confident, chromatic studio backgrounds: neutral whites/grays
            // can also be clothing or skin highlights and must not be keyed out.
            if (Math.max(...bg) - Math.min(...bg) < 30 || samples.filter(p => difference(p) <= 12).length < samples.length * .95) return false;
            const n = w * h, exterior = new Uint8Array(n), queue = new Int32Array(n);
            let head = 0, tail = 0;
            const visit = i => {
                if (exterior[i]) return;
                const p = i * 4;
                if (source[p + 3] && difference(source.subarray(p, p + 3)) > 28) return;
                exterior[i] = 1; queue[tail++] = i;
            };
            for (let x = 0; x < w; x++) { visit(x); visit((h - 1) * w + x); }
            for (let y = 0; y < h; y++) { visit(y * w); visit(y * w + w - 1); }
            while (head < tail) {
                const i = queue[head++], x = i % w;
                if (x) visit(i - 1); if (x < w - 1) visit(i + 1);
                if (i >= w) visit(i - w); if (i < n - w) visit(i + w);
            }
            if (!tail) return false;
            let foreground = 0;
            for (let i = 0; i < n; i++) if (!exterior[i] && this.mask[i] >= 200 && source[i * 4 + 3] >= 200) foreground++;
            if (foreground < Math.max(16, n * .005)) return false;
            this.checkpoint();
            const colors = this.colorPixels.slice();
            for (let i = 0; i < n; i++) if (exterior[i]) this.mask[i] = 0;
            // Unmix only the antialiased boundary against nearby solid foreground.
            // Interior pixels (including matching-color enclosed details) stay intact.
            for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
                const i = y * w + x, p = i * 4;
                if (!this.mask[i] || !(exterior[i - 1] || exterior[i + 1] || exterior[i - w] || exterior[i + w])) continue;
                let nearest = -1, distance = 33;
                for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) {
                    const px = x + dx, py = y + dy, d = dx * dx + dy * dy;
                    if (!d || d >= distance || px < 1 || py < 1 || px >= w - 1 || py >= h - 1) continue;
                    const j = py * w + px;
                    if (this.mask[j] < 240 || exterior[j] || exterior[j - 1] || exterior[j + 1] || exterior[j - w] || exterior[j + w]) continue;
                    if (difference(source.subarray(j * 4, j * 4 + 3)) < 70) continue;
                    nearest = j * 4; distance = d;
                }
                if (nearest < 0) continue;
                let dot = 0, length = 0;
                for (let c = 0; c < 3; c++) { const delta = source[nearest + c] - bg[c]; dot += (source[p + c] - bg[c]) * delta; length += delta * delta; }
                const coverage = clamp(dot / length, 0, 1);
                const error = Math.max(...bg.map((v, c) => Math.abs(source[p + c] - (v + coverage * (source[nearest + c] - v)))));
                if (coverage >= .98 || error > 12) continue;
                this.mask[i] = Math.min(this.mask[i], Math.round(255 * coverage));
                for (let c = 0; c < 3; c++) colors[p + c] = source[nearest + c];
            }
            this.colorPixels = colors;
            this.colorCanvas.getContext('2d').putImageData(new ImageData(colors, w, h), 0, 0);
            this.render();
            return true;
        }

        sampleClone(point) {
            if (!Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x >= this.width || point.y >= this.height) return false;
            this.render();
            if (!this.output.getContext('2d').getImageData(Math.floor(point.x), Math.floor(point.y), 1, 1).data[3]) return false;
            this.cloneSource = { x: point.x, y: point.y };
            return true;
        }

        begin(point, mode = 'erase', radius = 20, hardness = .65, opacity = 100) {
            if (mode === 'clone' && (!this.cloneSource || !this.cloneBrush?._cloneBrushStroke || opacity <= 0)) return false;
            this.adjusting = false;
            this.checkpoint();
            if (mode === 'clone') {
                // Reuse Stage's brush on an isolated pixel-space adapter, never Stage state.
                const frozen = canvas(this.width, this.height);
                frozen.getContext('2d').drawImage(this.render(), 0, 0);
                const target = { ...point, localX: point.x, localY: point.y };
                this.cloneSession = {
                    _cloneBrushDab: this.cloneBrush._cloneBrushDab,
                    _cloneBrushStroke: this.cloneBrush._cloneBrushStroke,
                    _cloneBrushSourceForTargetPoint: this.cloneBrush._cloneBrushSourceForTargetPoint,
                    _cloneBrushImagePointToStage: (_object, _canvas, p) => p,
                    _cloneBrushCtx: this.colorCanvas.getContext('2d'), _cloneBrushCanvas: this.colorCanvas,
                    _cloneBrushSourceCanvas: frozen, _cloneBrushTargetAlphaCanvas: frozen,
                    _cloneBrushClipTargetAlpha: true, _cloneBrushTarget: { width: this.width, height: this.height },
                    _cloneBrushSourcePoint: { ...this.cloneSource, pixelsPerStageX: 1, pixelsPerStageY: 1 },
                    _cloneBrushSize: clamp(radius, 1, 150) * 2, _cloneBrushHardness: clamp(hardness, 0, 1) * 100,
                    _cloneBrushOpacity: clamp(opacity, 1, 100), _cloneBrushSpacing: 15
                };
                this.stroke = { mode, point: target, anchor: target };
                this.cloneSession._cloneBrushDab(target, this.cloneSource);
                return true;
            }
            this.stroke = { point, mode: mode === 'restore' ? 'restore' : 'erase', radius: clamp(radius, 1, 150), hardness: clamp(hardness, 0, 1) };
            this.dab(point);
        }
        move(point) {
            if (!this.stroke || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return;
            if (this.stroke.mode === 'clone') {
                const target = { ...point, localX: point.x, localY: point.y };
                this.cloneSession._cloneBrushStroke(this.stroke.point, target, this.stroke.anchor);
                this.stroke.point = target;
                return;
            }
            const previous = this.stroke.point;
            const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
            const steps = Math.max(1, Math.ceil(distance / Math.max(1, this.stroke.radius * .25)));
            for (let step = 1; step <= steps; step++) this.dab({ x: previous.x + (point.x - previous.x) * step / steps, y: previous.y + (point.y - previous.y) * step / steps });
            this.stroke.point = point;
        }
        end(cancel = false) {
            if (!this.stroke) return;
            if (this.cloneSession && !cancel) this.captureCloneColors();
            this.stroke = null;
            this.cloneSession = null;
            if (cancel) { const previous = this.undoStack.pop(); if (previous) this.restore(previous); }
        }

        captureCloneColors() {
            const ctx = this.colorCanvas.getContext('2d'), pixels = ctx.getImageData(0, 0, this.width, this.height);
            // RGB repairs must never expand the silhouette or accumulate source alpha.
            for (let i = 3; i < pixels.data.length; i += 4) pixels.data[i] = this.originalPixels[i];
            this.colorPixels = pixels.data;
            ctx.putImageData(pixels, 0, 0);
        }
        dab({ x, y }) {
            if (!Number.isFinite(x) || !Number.isFinite(y)) return;
            const { radius, hardness, mode } = this.stroke;
            const left = Math.max(0, Math.floor(x - radius)), right = Math.min(this.width - 1, Math.ceil(x + radius));
            const top = Math.max(0, Math.floor(y - radius)), bottom = Math.min(this.height - 1, Math.ceil(y + radius));
            // Same radial hardness and interpolated-stroke model as Stage's eraser.
            for (let py = top; py <= bottom; py++) for (let px = left; px <= right; px++) {
                const distance = Math.hypot(px + .5 - x, py + .5 - y) / radius;
                if (distance >= 1) continue;
                const weight = distance <= hardness ? 1 : (1 - distance) / Math.max(.001, 1 - hardness);
                const i = py * this.width + px, target = mode === 'restore' ? 255 : 0;
                this.mask[i] += (target - this.mask[i]) * weight;
            }
        }

        render() {
            if (this.cloneSession) this.captureCloneColors();
            const pixels = this.maskPixels.data, trim = this.cleanup * 1.6;
            const inset = Math.ceil(this.inset), trimmed = inset ? this.trimMask(this.mask, inset) : this.mask;
            for (let i = 0; i < this.mask.length; i++) {
                pixels[i * 4] = pixels[i * 4 + 1] = pixels[i * 4 + 2] = 255;
                const coverage = this.mask[i] + (trimmed[i] - this.mask[i]) * Math.min(1, this.inset);
                pixels[i * 4 + 3] = Math.max(0, (coverage - trim) * 255 / (255 - trim));
            }
            this.maskCanvas.getContext('2d').putImageData(this.maskPixels, 0, 0);
            const ctx = this.output.getContext('2d', { willReadFrequently: true });
            ctx.clearRect(0, 0, this.width, this.height);
            ctx.drawImage(this.colorCanvas, 0, 0);
            ctx.save();
            ctx.globalCompositeOperation = 'destination-in';
            if (this.feather) ctx.filter = `blur(${this.feather}px)`;
            ctx.drawImage(this.maskCanvas, 0, 0);
            ctx.restore();
            if (this.defringe) this.correctFringe(ctx);
            return this.output;
        }
    }
    globalThis.PhotoCutoutEditor = PhotoCutoutEditor;
})();
