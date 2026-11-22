/**
 * Object Manager — AI trace, background removal, crop & eraser tools
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {

    // ── AI Trace helpers ──────────────────────────────────

    _getAiTraceOpts() {
        return {
            mode: document.getElementById('ai-trace-mode')?.value || 'outline',
            colorCount: parseInt(document.getElementById('ai-trace-colors')?.value) || 12,
            detail: parseInt(document.getElementById('ai-trace-detail')?.value) || 1,
            sensitivity: parseInt(document.getElementById('ai-trace-sensitivity')?.value) || 60,
            minRegion: parseInt(document.getElementById('ai-trace-min-region')?.value) || 200,
            smooth: document.getElementById('ai-trace-smooth')?.checked !== false,
            removeBg: document.getElementById('ai-trace-remove-bg')?.checked !== false,
            bgTolerance: parseInt(document.getElementById('ai-trace-bg-tolerance')?.value) || 30
        };
    },

    _updateAiTraceControlVisibility() {
        const mode = document.getElementById('ai-trace-mode')?.value || 'outline';
        document.querySelectorAll('.ai-trace-region-only').forEach(el => {
            el.classList.toggle('hidden', mode !== 'regions');
        });
    },

    _setAiTraceStatus(message = '', type = 'info', progress = null) {
        const status = document.getElementById('ai-trace-status');
        const text = document.getElementById('ai-trace-status-text');
        const bar = document.getElementById('ai-trace-progress-bar');
        if (!status || !text) return;
        status.classList.toggle('hidden', !message);
        status.dataset.type = type;
        text.textContent = message || '';
        if (bar && progress !== null) {
            const pct = Math.max(0, Math.min(100, Math.round(Number(progress) * 100)));
            bar.style.width = `${pct}%`;
        } else if (bar && !message) {
            bar.style.width = '0%';
        }
    },

    _setAiTraceBusy(isBusy, message = '') {
        this._aiTraceBusy = !!isBusy;
        ['btn-ai-trace-preview', 'btn-ai-trace-apply'].forEach(id => {
            const btn = document.getElementById(id);
            if (btn) btn.disabled = !!isBusy;
        });
        const cancel = document.getElementById('btn-ai-trace-cancel');
        if (cancel) {
            cancel.disabled = false;
            cancel.innerHTML = isBusy
                ? '<i class="fas fa-stop"></i> Stop'
                : '<i class="fas fa-times"></i> Cancel';
        }
        if (message) this._setAiTraceStatus(message, 'info', 0);
    },

    _formatAiTraceResultMessage(result) {
        const count = result?.shapes?.length || 0;
        const meta = result?.meta || {};
        const notes = [];
        if (meta.worker) notes.push('background worker');
        if (meta.downsampled) notes.push(`${meta.rasterWidth}x${meta.rasterHeight} working size`);
        if (meta.skippedRegions) notes.push(`${meta.skippedRegions} tiny regions skipped`);
        return `Found ${count} shape${count === 1 ? '' : 's'}${notes.length ? ' (' + notes.join(', ') + ')' : ''}`;
    },

    _showAiTracePreview(previewCanvas, obj) {
        this._clearAiTracePreview();
        const stageCanvas = this.stage.canvas;
        const container = stageCanvas.parentElement;
        const overlay = previewCanvas.cloneNode(true);
        overlay.id = 'ai-trace-preview-overlay';

        // Position overlay to match the image object on the visible canvas
        const zoom = this.stage.zoom || 1;
        const panX = this.stage.panX || 0;
        const panY = this.stage.panY || 0;
        overlay.style.position = 'absolute';
        overlay.style.left = ((obj.x + panX) * zoom) + 'px';
        overlay.style.top = ((obj.y + panY) * zoom) + 'px';
        overlay.style.width = (obj.width * zoom) + 'px';
        overlay.style.height = (obj.height * zoom) + 'px';
        overlay.style.pointerEvents = 'none';
        overlay.style.zIndex = '50';
        overlay.style.opacity = '0.85';
        overlay.style.imageRendering = this._aiTrace?._previewData?.mode === 'outline' ? 'auto' : 'pixelated';

        container.style.position = 'relative';
        container.appendChild(overlay);
        this._aiTracePreviewEl = overlay;
    },

    _clearAiTracePreview() {
        if (this._aiTracePreviewEl) {
            this._aiTracePreviewEl.remove();
            this._aiTracePreviewEl = null;
        }
    },

    removeImageBackground() {
        const selected = this.getSelectedObjects();
        const obj = selected.find(o => o.type === 'image');
        // Operate on the pixels currently shown on stage: if the object has been
        // through a cleanup tool (Eraser, Edge Refine, Clone, Perspective) it is
        // rendered from _eraserCanvas, so read that as the source. Falling back to
        // imageElement keeps the untouched-image case unchanged.
        const source = obj?._eraserCanvas || obj?.imageElement;
        if (!obj || !source) {
            Utils.showToast('No image selected or image not loaded', 'warning');
            return;
        }

        const tolerance = parseInt(document.getElementById('bg-tolerance')?.value || 30);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = source.naturalWidth || source.width;
        canvas.height = source.naturalHeight || source.height;
        if (!canvas.width || !canvas.height) {
            Utils.showToast('Image is not ready yet — try again', 'warning');
            return;
        }
        ctx.drawImage(source, 0, 0);

        let imageData;
        try {
            imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        } catch (err) {
            Utils.showToast('Cannot remove background: image is cross-origin (CORS) protected', 'error');
            return;
        }
        const data = imageData.data;

        // Sample background color from corners
        const samples = [
            [0, 0], [canvas.width - 1, 0],
            [0, canvas.height - 1], [canvas.width - 1, canvas.height - 1]
        ];
        let bgR = 0, bgG = 0, bgB = 0, count = 0;
        samples.forEach(([sx, sy]) => {
            const idx = (sy * canvas.width + sx) * 4;
            bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
            count++;
        });
        bgR = Math.round(bgR / count);
        bgG = Math.round(bgG / count);
        bgB = Math.round(bgB / count);

        // Flood-fill style: remove pixels matching background color within tolerance
        const tolSq = tolerance * tolerance * 3;
        for (let i = 0; i < data.length; i += 4) {
            const dr = data[i] - bgR;
            const dg = data[i + 1] - bgG;
            const db = data[i + 2] - bgB;
            const distSq = dr * dr + dg * dg + db * db;
            if (distSq < tolSq) {
                data[i + 3] = 0; // Set alpha to 0 (transparent)
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Convert back to data URL and update the object
        let newSrc;
        try {
            newSrc = canvas.toDataURL('image/png');
        } catch (err) {
            Utils.showToast('Cannot export image: cross-origin (CORS) protected', 'error');
            return;
        }
        // Bake the result into the object and clear any stale cleanup canvas so the
        // new transparent image is what renders (otherwise _eraserCanvas would keep
        // masking the change and it would look like nothing happened).
        obj._eraserCanvas = null;
        obj.imageSrc = newSrc;
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        obj.loadImage(newSrc);

        document.getElementById('bg-removal-controls')?.classList.remove('visible');
        this._hideImplementationFloatingToolbar('bg-remove');
        Utils.showToast('Background removed', 'success');
        eventBus.emit('history:push');
    },

    // === Interactive Crop Mode ===

    enterCropMode(options = {}) {
        const selected = options.object ? [options.object] : this.getSelectedObjects();
        const obj = selected.find(o => o.type === 'image');
        if (!obj || !obj.imageElement) {
            Utils.showToast('No image selected or image not loaded', 'warning');
            return;
        }
        this._cropMode = true;
        this._cropObj = obj;
        this._cropRect = { x: obj.x, y: obj.y, w: obj.width, h: obj.height };
        this._cropDragging = null;
        this._syncCropInputsFromRect();
        document.getElementById('image-crop-controls')?.classList.remove('hidden');
        this._showCropFloatingToolbar();
        this.stage.viewport.style.cursor = 'crosshair';
        this.stage.requestRender();
        const message = options.message ?? (options.silent ? '' : 'Drag handles to crop, then Apply');
        if (message) Utils.showToast(message, 'info');
    },

    exitCropMode() {
        this._cropMode = false;
        this._cropObj = null;
        this._cropRect = null;
        this._cropDragging = null;
        this._cropDragStart = null;
        this._cropRectStart = null;
        document.getElementById('image-crop-controls')?.classList.add('hidden');
        this._hideCropFloatingToolbar();
        this.stage.viewport.style.cursor = '';
        this.stage.requestRender();
        // Dismiss the auto-crop accept/reject floater if it's still up.
        if (typeof this._dismissAutoCropConfirm === 'function') this._dismissAutoCropConfirm();
    },

    _showCropFloatingToolbar() {
        const bar = document.getElementById('crop-floating-toolbar');
        if (bar) bar.classList.remove('hidden');
    },

    _hideCropFloatingToolbar() {
        const bar = document.getElementById('crop-floating-toolbar');
        if (bar) bar.classList.add('hidden');
    },

    _showImplementationFloatingToolbar(config = {}) {
        const bar = document.getElementById('implement-floating-toolbar');
        if (!bar) return;
        const {
            tool = 'generic',
            label = 'Implement',
            hint = 'Apply or cancel this tool on stage',
            applyText = 'Apply',
            cancelText = 'Cancel',
            onApply = null,
            onCancel = null
        } = config;
        const labelEl = document.getElementById('implement-ft-label');
        const hintEl = document.getElementById('implement-ft-hint');
        const applyEl = document.getElementById('btn-implement-ft-apply');
        const cancelEl = document.getElementById('btn-implement-ft-cancel');
        if (labelEl) labelEl.textContent = label;
        if (hintEl) hintEl.textContent = hint;
        if (applyEl) {
            const icon = applyEl.querySelector('i')?.outerHTML || '';
            applyEl.innerHTML = `${icon} ${applyText}`;
        }
        if (cancelEl) {
            const icon = cancelEl.querySelector('i')?.outerHTML || '';
            cancelEl.innerHTML = `${icon} ${cancelText}`;
        }
        this._implementationFloatingActions = {
            tool,
            apply: typeof onApply === 'function' ? onApply : null,
            cancel: typeof onCancel === 'function' ? onCancel : null
        };
        bar.dataset.tool = tool;
        bar.classList.remove('hidden');
    },

    _hideImplementationFloatingToolbar(tool = null) {
        const bar = document.getElementById('implement-floating-toolbar');
        if (!bar) return;
        if (tool && bar.dataset.tool && bar.dataset.tool !== tool) return;
        bar.classList.add('hidden');
        delete bar.dataset.tool;
        this._implementationFloatingActions = null;
    },

    _runImplementationFloatingAction(action) {
        const actions = this._implementationFloatingActions;
        if (!actions || typeof actions[action] !== 'function') return;
        actions[action]();
    },

    _syncCropInputsFromRect() {
        if (!this._cropObj || !this._cropRect) return;
        const obj = this._cropObj;
        const r = this._cropRect;
        const left = Math.round(((r.x - obj.x) / obj.width) * 100);
        const top = Math.round(((r.y - obj.y) / obj.height) * 100);
        const right = Math.round((((r.x + r.w) - obj.x) / obj.width) * 100);
        const bottom = Math.round((((r.y + r.h) - obj.y) / obj.height) * 100);
        const el = (id, v) => { const e = document.getElementById(id); if (e) e.value = v; };
        el('crop-left', Math.max(0, Math.min(100, left)));
        el('crop-top', Math.max(0, Math.min(100, top)));
        el('crop-right', Math.max(0, Math.min(100, right)));
        el('crop-bottom', Math.max(0, Math.min(100, bottom)));
    },

    _getCropHandlePositions() {
        const r = this._cropRect;
        if (!r) return {};
        const mx = r.x + r.w / 2;
        const my = r.y + r.h / 2;
        return {
            'nw': { x: r.x, y: r.y },
            'n':  { x: mx, y: r.y },
            'ne': { x: r.x + r.w, y: r.y },
            'e':  { x: r.x + r.w, y: my },
            'se': { x: r.x + r.w, y: r.y + r.h },
            's':  { x: mx, y: r.y + r.h },
            'sw': { x: r.x, y: r.y + r.h },
            'w':  { x: r.x, y: my }
        };
    },

    _hitTestCropHandle(pos) {
        const handles = this._getCropHandlePositions();
        const zoom = Math.max(0.001, this.stage.zoom);
        const threshold = 8 / zoom;
        for (const [name, h] of Object.entries(handles)) {
            if (Math.abs(pos.x - h.x) < threshold && Math.abs(pos.y - h.y) < threshold) {
                return name;
            }
        }
        return null;
    },

    _isInsideCropRect(pos) {
        const r = this._cropRect;
        if (!r) return false;
        return pos.x >= r.x && pos.x <= r.x + r.w && pos.y >= r.y && pos.y <= r.y + r.h;
    },

    _handleCropMouseDown(pos) {
        const handle = this._hitTestCropHandle(pos);
        if (handle) {
            this._cropDragging = handle;
            this._cropDragStart = { x: pos.x, y: pos.y };
            this._cropRectStart = { ...this._cropRect };
            return;
        }
        if (this._isInsideCropRect(pos)) {
            this._cropDragging = 'move';
            this._cropDragStart = { x: pos.x, y: pos.y };
            this._cropRectStart = { ...this._cropRect };
            return;
        }
        // Clicked outside crop and image — do nothing
    },

    _handleCropMouseMove(pos) {
        if (!this._cropDragging || !this._cropDragStart || !this._cropRectStart) return;
        const dx = pos.x - this._cropDragStart.x;
        const dy = pos.y - this._cropDragStart.y;
        const obj = this._cropObj;
        const s = this._cropRectStart;
        const minSize = 10;

        if (this._cropDragging === 'move') {
            let nx = s.x + dx;
            let ny = s.y + dy;
            // Clamp to image bounds
            nx = Math.max(obj.x, Math.min(obj.x + obj.width - s.w, nx));
            ny = Math.max(obj.y, Math.min(obj.y + obj.height - s.h, ny));
            this._cropRect = { x: nx, y: ny, w: s.w, h: s.h };
        } else {
            let { x, y, w, h } = { ...s };
            const d = this._cropDragging;
            // Adjust edges based on which handle
            if (d.includes('w')) { x = s.x + dx; w = s.w - dx; }
            if (d.includes('e')) { w = s.w + dx; }
            if (d.includes('n')) { y = s.y + dy; h = s.h - dy; }
            if (d.includes('s')) { h = s.h + dy; }
            // Enforce minimum size
            if (w < minSize) { if (d.includes('w')) { x = s.x + s.w - minSize; } w = minSize; }
            if (h < minSize) { if (d.includes('n')) { y = s.y + s.h - minSize; } h = minSize; }
            // Clamp to image bounds
            x = Math.max(obj.x, x);
            y = Math.max(obj.y, y);
            if (x + w > obj.x + obj.width) w = obj.x + obj.width - x;
            if (y + h > obj.y + obj.height) h = obj.y + obj.height - y;
            this._cropRect = { x, y, w, h };
        }

        this._syncCropInputsFromRect();
        this.stage.requestRender();
    },

    _handleCropMouseUp() {
        this._cropDragging = null;
        this._cropDragStart = null;
        this._cropRectStart = null;
    },

    _updateCropCursor(pos) {
        const handle = this._hitTestCropHandle(pos);
        if (handle) {
            const cursors = {
                'nw': 'nwse-resize', 'se': 'nwse-resize',
                'ne': 'nesw-resize', 'sw': 'nesw-resize',
                'n': 'ns-resize', 's': 'ns-resize',
                'e': 'ew-resize', 'w': 'ew-resize'
            };
            this.stage.viewport.style.cursor = cursors[handle] || 'default';
        } else if (this._isInsideCropRect(pos)) {
            this.stage.viewport.style.cursor = 'move';
        } else {
            this.stage.viewport.style.cursor = 'crosshair';
        }
    },

    renderCropOverlay(ctx) {
        if (!this._cropMode || !this._cropObj || !this._cropRect) return;
        const obj = this._cropObj;
        const r = this._cropRect;
        const zoom = Math.max(0.001, this.stage.zoom);

        // Dark overlay on the image area outside the crop rect
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
        // Top strip
        ctx.fillRect(obj.x, obj.y, obj.width, r.y - obj.y);
        // Bottom strip
        ctx.fillRect(obj.x, r.y + r.h, obj.width, (obj.y + obj.height) - (r.y + r.h));
        // Left strip
        ctx.fillRect(obj.x, r.y, r.x - obj.x, r.h);
        // Right strip
        ctx.fillRect(r.x + r.w, r.y, (obj.x + obj.width) - (r.x + r.w), r.h);

        // Crop border
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([]);
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        // Rule-of-thirds grid lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 1 / zoom;
        for (let i = 1; i <= 2; i++) {
            const gx = r.x + r.w * (i / 3);
            ctx.beginPath(); ctx.moveTo(gx, r.y); ctx.lineTo(gx, r.y + r.h); ctx.stroke();
            const gy = r.y + r.h * (i / 3);
            ctx.beginPath(); ctx.moveTo(r.x, gy); ctx.lineTo(r.x + r.w, gy); ctx.stroke();
        }

        // Draw handles
        const handles = this._getCropHandlePositions();
        const hs = 8 / zoom;
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#6366f1';
        ctx.lineWidth = 1.5 / zoom;
        Object.values(handles).forEach(h => {
            ctx.fillRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
            ctx.strokeRect(h.x - hs / 2, h.y - hs / 2, hs, hs);
        });

        ctx.restore();
    },

    _getEditableImageCanvas(obj) {
        const source = obj?._eraserCanvas || obj?.imageElement;
        const width = source?.width || source?.naturalWidth || 0;
        const height = source?.height || source?.naturalHeight || 0;
        if (!source || !width || !height) return null;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d', { willReadFrequently: true }).drawImage(source, 0, 0, width, height);
        return canvas;
    },

    _isSvgAvatarVectorImage(obj) {
        return !!(obj?._svgAvatar && String(obj.imageSrc || '').startsWith('data:image/svg+xml'));
    },

    _decodeSvgAvatarVectorDataUrl(src) {
        const text = String(src || '');
        if (!text.startsWith('data:image/svg+xml')) return '';
        const comma = text.indexOf(',');
        if (comma < 0) return '';
        const header = text.slice(0, comma).toLowerCase();
        const payload = text.slice(comma + 1);
        try {
            return header.includes(';base64') ? atob(payload) : decodeURIComponent(payload);
        } catch (_) {
            try { return atob(payload); } catch (err) { return ''; }
        }
    },

    _encodeSvgAvatarVectorDataUrl(svg) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg || '')}`;
    },

    _formatSvgAvatarViewBoxNumber(value) {
        const number = Number(value);
        if (!Number.isFinite(number)) return '0';
        return String(Math.round(number * 1000) / 1000);
    },

    _applySvgAvatarVectorCrop(obj, crop, options = {}) {
        if (!this._isSvgAvatarVectorImage(obj) || !crop) return false;
        const sourceWidth = Math.max(1, Number(crop.sourceWidth) || obj.imageElement?.naturalWidth || obj.width || 220);
        const sourceHeight = Math.max(1, Number(crop.sourceHeight) || obj.imageElement?.naturalHeight || obj.height || 280);
        const cropLeft = Math.max(0, Math.min(sourceWidth, Number(crop.left) || 0));
        const cropTop = Math.max(0, Math.min(sourceHeight, Number(crop.top) || 0));
        const cropWidth = Math.max(1, Math.min(sourceWidth - cropLeft, Number(crop.width) || sourceWidth));
        const cropHeight = Math.max(1, Math.min(sourceHeight - cropTop, Number(crop.height) || sourceHeight));
        const sourceSvg = obj._svgAvatar?.baseSvg || this._decodeSvgAvatarVectorDataUrl(obj.imageSrc);
        if (!sourceSvg) return false;

        try {
            const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml');
            const root = doc.documentElement;
            if (!root || root.nodeName.toLowerCase() === 'parsererror') return false;
            const viewBox = String(root.getAttribute('viewBox') || `0 0 ${sourceWidth} ${sourceHeight}`)
                .trim()
                .split(/\s+/)
                .map(Number);
            const [vbX = 0, vbY = 0, vbW = sourceWidth, vbH = sourceHeight] = viewBox;
            const next = [
                vbX + (cropLeft / sourceWidth) * vbW,
                vbY + (cropTop / sourceHeight) * vbH,
                (cropWidth / sourceWidth) * vbW,
                (cropHeight / sourceHeight) * vbH
            ].map(value => this._formatSvgAvatarViewBoxNumber(value)).join(' ');

            root.setAttribute('viewBox', next);
            root.setAttribute('width', this._formatSvgAvatarViewBoxNumber(cropWidth));
            root.setAttribute('height', this._formatSvgAvatarViewBoxNumber(cropHeight));
            root.setAttribute('preserveAspectRatio', 'xMidYMid meet');
            root.setAttribute('style', `${root.getAttribute('style') || ''};background:transparent`.replace(/^;/, ''));
            root.querySelectorAll('[data-avatar-background], .avatar-background, circle[fill*="bgGlow"], rect[fill*="thumbBg"]').forEach(el => el.remove());

            const oldWidth = obj.width;
            const oldHeight = obj.height;
            const newWidth = oldWidth * cropWidth / sourceWidth;
            const newHeight = oldHeight * cropHeight / sourceHeight;
            const localX = oldWidth * cropLeft / sourceWidth;
            const localY = oldHeight * cropTop / sourceHeight;

            if (options.preservePivot) {
                const pivot = obj.getPivotPoint?.() || {
                    x: obj.x + oldWidth * (obj.pivotX ?? 0.5),
                    y: obj.y + oldHeight * (obj.pivotY ?? 0.5)
                };
                const angle = (Number(obj.rotation) || 0) * Math.PI / 180;
                const oldLocalPivotX = oldWidth * (obj.pivotX ?? 0.5);
                const oldLocalPivotY = oldHeight * (obj.pivotY ?? 0.5);
                const newLocalPivotX = localX + newWidth * (obj.pivotX ?? 0.5);
                const newLocalPivotY = localY + newHeight * (obj.pivotY ?? 0.5);
                const dx = newLocalPivotX - oldLocalPivotX;
                const dy = newLocalPivotY - oldLocalPivotY;
                const worldPivotX = pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle);
                const worldPivotY = pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle);
                obj.x = worldPivotX - newWidth * (obj.pivotX ?? 0.5);
                obj.y = worldPivotY - newHeight * (obj.pivotY ?? 0.5);
            } else {
                obj.x += localX;
                obj.y += localY;
            }

            const nextSvg = new XMLSerializer().serializeToString(root);
            obj.width = newWidth;
            obj.height = newHeight;
            obj.imageZoom = 1;
            obj.imagePanX = 0;
            obj.imagePanY = 0;
            obj._eraserCanvas = null;
            obj._svgAvatar.baseSvg = nextSvg;
            obj._svgAvatar.transparentBackground = true;
            obj._svgAvatar.vectorSource = true;
            obj._svgAvatar.cropSafe = true;
            delete obj._svgAvatar._lastRenderKey;
            obj.imageSrc = this._encodeSvgAvatarVectorDataUrl(nextSvg);
            if (typeof this._renderSvgAvatarStateToImage === 'function') {
                this._renderSvgAvatarStateToImage(obj);
            } else {
                obj.loadImage?.(obj.imageSrc);
            }
            return true;
        } catch (err) {
            console.warn('SVG avatar vector crop failed:', err);
            return false;
        }
    },

    _cancelTransientImageModes(except = '') {
        if (except !== 'perspective' && this._imagePerspectiveMode) this.exitImagePerspectiveMode();
        if (except !== 'edge-refine' && this._edgeRefineMode) this.exitEdgeRefineMode();
        if (except !== 'color-key' && this._imageColorKeyMode) this.exitImageColorKeyMode();
        if (except !== 'eraser' && this._eraserMode) this.exitEraserMode();
        if (except !== 'clone-brush' && this._cloneBrushMode) this.exitCloneBrushMode({ cancel: true });
        if (except !== 'crop' && this._cropMode) this.exitCropMode();
        if (except !== 'sprite-sheet' && this._spriteSheetState) this.exitSpriteSheetMode();
    },

    trimImageTransparentSpace() {
        const obj = this.getSelectedObjects().find(item => item?.type === 'image');
        this._cancelTransientImageModes();
        const source = this._getEditableImageCanvas(obj);
        if (!obj || !source) {
            Utils.showToast('Select a loaded image first', 'warning');
            return false;
        }

        const threshold = Math.max(0, Math.min(254, Number(document.getElementById('trim-alpha-threshold')?.value) || 0));
        const padding = Math.max(0, Math.min(200, Number(document.getElementById('trim-padding')?.value) || 0));
        const ctx = source.getContext('2d', { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, source.width, source.height).data;
        let left = source.width, top = source.height, right = -1, bottom = -1;
        for (let y = 0; y < source.height; y++) {
            for (let x = 0; x < source.width; x++) {
                if (data[(y * source.width + x) * 4 + 3] <= threshold) continue;
                if (x < left) left = x;
                if (x > right) right = x;
                if (y < top) top = y;
                if (y > bottom) bottom = y;
            }
        }
        if (right < left || bottom < top) {
            Utils.showToast('No visible pixels found at this threshold', 'warning');
            return false;
        }
        left = Math.max(0, Math.floor(left - padding));
        top = Math.max(0, Math.floor(top - padding));
        right = Math.min(source.width - 1, Math.ceil(right + padding));
        bottom = Math.min(source.height - 1, Math.ceil(bottom + padding));
        if (left === 0 && top === 0 && right === source.width - 1 && bottom === source.height - 1) {
            Utils.showToast('The image already fits its visible pixels', 'info');
            return false;
        }

        const cropWidth = right - left + 1;
        const cropHeight = bottom - top + 1;
        if (this._applySvgAvatarVectorCrop(obj, {
            left,
            top,
            width: cropWidth,
            height: cropHeight,
            sourceWidth: source.width,
            sourceHeight: source.height
        }, { preservePivot: true })) {
            document.getElementById('image-trim-controls')?.classList.add('hidden');
            this.stage.requestRender();
            this.updatePropertiesPanel?.();
            eventBus.emit('history:push');
            Utils.showToast('Transparent SVG avatar space trimmed without rasterizing', 'success');
            this._hideImplementationFloatingToolbar('trim');
            return true;
        }

        const result = document.createElement('canvas');
        result.width = cropWidth;
        result.height = cropHeight;
        result.getContext('2d').drawImage(source, left, top, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        const oldWidth = obj.width;
        const oldHeight = obj.height;
        const newWidth = oldWidth * cropWidth / source.width;
        const newHeight = oldHeight * cropHeight / source.height;
        const localX = oldWidth * left / source.width;
        const localY = oldHeight * top / source.height;
        const pivot = obj.getPivotPoint();
        const angle = (Number(obj.rotation) || 0) * Math.PI / 180;
        const oldLocalPivotX = oldWidth * (obj.pivotX ?? 0.5);
        const oldLocalPivotY = oldHeight * (obj.pivotY ?? 0.5);
        const newLocalPivotX = localX + newWidth * (obj.pivotX ?? 0.5);
        const newLocalPivotY = localY + newHeight * (obj.pivotY ?? 0.5);
        const dx = newLocalPivotX - oldLocalPivotX;
        const dy = newLocalPivotY - oldLocalPivotY;
        const worldPivotX = pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle);
        const worldPivotY = pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle);

        obj.width = newWidth;
        obj.height = newHeight;
        obj.x = worldPivotX - newWidth * (obj.pivotX ?? 0.5);
        obj.y = worldPivotY - newHeight * (obj.pivotY ?? 0.5);
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        obj._eraserCanvas = null;
        const src = result.toDataURL('image/png');
        obj.imageSrc = src;
        obj.loadImage(src);
        document.getElementById('image-trim-controls')?.classList.add('hidden');
        this.stage.requestRender();
        this.updatePropertiesPanel?.();
        eventBus.emit('history:push');
        Utils.showToast('Transparent space trimmed', 'success');
        this._hideImplementationFloatingToolbar('trim');
        return true;
    },

    enterEdgeRefineMode() {
        const obj = this.getSelectedObjects().find(item => item?.type === 'image');
        const source = this._getEditableImageCanvas(obj);
        if (!obj || !source) {
            Utils.showToast('Select a loaded image first', 'warning');
            return;
        }
        if (this._imagePerspectiveMode) this.exitImagePerspectiveMode();
        if (this._imageColorKeyMode) this.exitImageColorKeyMode();
        if (this._eraserMode) this.exitEraserMode();
        if (this._cloneBrushMode) this.exitCloneBrushMode({ cancel: true });
        this._edgeRefineMode = true;
        this._edgeRefineObj = obj;
        this._edgeRefineSourceCanvas = source;
        this._edgeRefinePreviousCanvas = obj._eraserCanvas || null;
        document.getElementById('image-edge-refine-controls')?.classList.remove('hidden');
        document.getElementById('btn-edge-refine')?.classList.add('active');
        this._showImplementationFloatingToolbar({
            tool: 'edge-refine',
            label: 'Edge Refine',
            hint: 'Tune edge cleanup, then apply or cancel',
            onApply: () => this.applyEdgeRefine(),
            onCancel: () => this.exitEdgeRefineMode()
        });
        this._updateEdgeRefinePreview();
    },

    _scheduleEdgeRefinePreview() {
        clearTimeout(this._edgeRefineTimer);
        this._edgeRefineTimer = setTimeout(() => this._updateEdgeRefinePreview(), 60);
    },

    _updateEdgeRefinePreview() {
        if (!this._edgeRefineMode || !this._edgeRefineObj || !this._edgeRefineSourceCanvas) return;
        const expand = Number(document.getElementById('edge-refine-expand')?.value) || 0;
        const feather = Number(document.getElementById('edge-refine-feather')?.value) || 0;
        const clean = Math.max(0, Math.min(1, (Number(document.getElementById('edge-refine-clean')?.value) || 0) / 100));
        const source = this._edgeRefineSourceCanvas;
        const mask = document.createElement('canvas');
        mask.width = source.width;
        mask.height = source.height;
        const maskCtx = mask.getContext('2d', { willReadFrequently: true });
        maskCtx.drawImage(source, 0, 0);
        const original = maskCtx.getImageData(0, 0, mask.width, mask.height);

        let processed = mask;
        if (expand !== 0 || feather > 0) {
            const blurred = document.createElement('canvas');
            blurred.width = mask.width;
            blurred.height = mask.height;
            const blurCtx = blurred.getContext('2d', { willReadFrequently: true });
            blurCtx.filter = `blur(${Math.max(Math.abs(expand) * 0.65, feather)}px)`;
            blurCtx.drawImage(mask, 0, 0);
            processed = blurred;
        }

        const alphaData = processed.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, source.width, source.height);
        const output = new ImageData(new Uint8ClampedArray(original.data), source.width, source.height);
        const threshold = expand > 0
            ? Math.max(2, 28 - expand * 3)
            : expand < 0
                ? Math.min(253, 220 + Math.abs(expand) * 2)
                : null;
        const searchRadius = Math.min(10, Math.max(2, Math.abs(expand) + 2));
        for (let y = 0; y < source.height; y++) {
            for (let x = 0; x < source.width; x++) {
                const i = (y * source.width + x) * 4;
                let alpha = alphaData.data[i + 3];
                if (threshold !== null && feather === 0) alpha = alpha >= threshold ? 255 : 0;
                output.data[i + 3] = alpha;
                if (!clean || !alpha || original.data[i + 3] >= 245) continue;
                let best = -1;
                let bestDistance = Infinity;
                for (let oy = -searchRadius; oy <= searchRadius; oy++) {
                    const sy = y + oy;
                    if (sy < 0 || sy >= source.height) continue;
                    for (let ox = -searchRadius; ox <= searchRadius; ox++) {
                        const sx = x + ox;
                        if (sx < 0 || sx >= source.width) continue;
                        const si = (sy * source.width + sx) * 4;
                        if (original.data[si + 3] < 245) continue;
                        const distance = ox * ox + oy * oy;
                        if (distance < bestDistance) { bestDistance = distance; best = si; }
                    }
                }
                if (best >= 0) {
                    output.data[i] = Math.round(output.data[i] * (1 - clean) + original.data[best] * clean);
                    output.data[i + 1] = Math.round(output.data[i + 1] * (1 - clean) + original.data[best + 1] * clean);
                    output.data[i + 2] = Math.round(output.data[i + 2] * (1 - clean) + original.data[best + 2] * clean);
                }
            }
        }
        const result = document.createElement('canvas');
        result.width = source.width;
        result.height = source.height;
        result.getContext('2d').putImageData(output, 0, 0);
        this._edgeRefineObj._eraserCanvas = result;
        this.stage.requestRender();
    },

    exitEdgeRefineMode(options = {}) {
        if (!this._edgeRefineMode) return;
        clearTimeout(this._edgeRefineTimer);
        const obj = this._edgeRefineObj;
        if (obj && !options.apply) obj._eraserCanvas = this._edgeRefinePreviousCanvas;
        this._edgeRefineMode = false;
        this._edgeRefineObj = null;
        this._edgeRefineSourceCanvas = null;
        this._edgeRefinePreviousCanvas = null;
        document.getElementById('image-edge-refine-controls')?.classList.add('hidden');
        document.getElementById('btn-edge-refine')?.classList.remove('active');
        this._hideImplementationFloatingToolbar('edge-refine');
        this.stage.requestRender();
    },

    applyEdgeRefine() {
        const obj = this._edgeRefineObj;
        const canvas = obj?._eraserCanvas;
        if (!obj || !canvas) return;
        const src = canvas.toDataURL('image/png');
        obj._eraserCanvas = null;
        obj.imageSrc = src;
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        obj.loadImage(src);
        this.exitEdgeRefineMode({ apply: true });
        eventBus.emit('history:push');
        Utils.showToast('Image edge refined', 'success');
    },

    _renderImageAppearanceCanvas(obj, options = {}) {
        const source = this._getEditableImageCanvas(obj);
        if (!source) return null;
        const maxDimension = 4096;
        let scale = Math.max(1, source.width / Math.max(1, obj.width), source.height / Math.max(1, obj.height));
        scale = Math.min(scale, maxDimension / Math.max(1, obj.width), maxDimension / Math.max(1, obj.height));
        const width = Math.max(1, Math.round(obj.width * scale));
        const height = Math.max(1, Math.round(obj.height * scale));
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (options.includeFilters) {
            const filters = [];
            if (obj.imgBrightness) filters.push(`brightness(${1 + obj.imgBrightness / 100})`);
            if (obj.imgContrast) filters.push(`contrast(${1 + obj.imgContrast / 100})`);
            if (obj.imgSaturation) filters.push(`saturate(${1 + obj.imgSaturation / 100})`);
            if (obj.imgHue) filters.push(`hue-rotate(${obj.imgHue}deg)`);
            if (obj.imgBlur) filters.push(`blur(${obj.imgBlur * scale}px)`);
            if (obj.imgGrayscale) filters.push(`grayscale(${obj.imgGrayscale}%)`);
            if (obj.imgSepia) filters.push(`sepia(${obj.imgSepia}%)`);
            if (obj.imgInvert) filters.push(`invert(${obj.imgInvert}%)`);
            if (filters.length) ctx.filter = filters.join(' ');
        }
        const coverScale = Math.max(width / source.width, height / source.height);
        const drawWidth = source.width * coverScale * (obj.imageZoom || 1);
        const drawHeight = source.height * coverScale * (obj.imageZoom || 1);
        const extraX = Math.max(0, drawWidth - width);
        const extraY = Math.max(0, drawHeight - height);
        const drawX = -extraX / 2 - (obj.imagePanX || 0) * extraX / 2;
        const drawY = -extraY / 2 - (obj.imagePanY || 0) * extraY / 2;
        ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);
        ctx.filter = 'none';
        if (options.includeFilters && obj.imgTintAmount > 0) {
            ctx.globalAlpha = obj.imgTintAmount / 100;
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = obj.imgTintColor || '#ffffff';
            ctx.fillRect(0, 0, width, height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = 1;
        }
        return canvas;
    },

    _drawPerspectiveTriangle(ctx, image, sourcePoints, destinationPoints) {
        const [s0, s1, s2] = sourcePoints;
        const [d0, d1, d2] = destinationPoints;
        const denominator = s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y);
        if (Math.abs(denominator) < 0.000001) return;
        const a = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denominator;
        const c = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denominator;
        const e = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denominator;
        const b = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denominator;
        const d = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denominator;
        const f = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denominator;
        const center = { x: (d0.x + d1.x + d2.x) / 3, y: (d0.y + d1.y + d2.y) / 3 };
        const expandPoint = point => {
            const dx = point.x - center.x;
            const dy = point.y - center.y;
            const length = Math.max(0.001, Math.hypot(dx, dy));
            return { x: point.x + dx / length * 0.8, y: point.y + dy / length * 0.8 };
        };
        const [clip0, clip1, clip2] = [d0, d1, d2].map(expandPoint);
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(clip0.x, clip0.y);
        ctx.lineTo(clip1.x, clip1.y);
        ctx.lineTo(clip2.x, clip2.y);
        ctx.closePath();
        ctx.clip();
        ctx.transform(a, b, c, d, e, f);
        ctx.drawImage(image, 0, 0);
        ctx.restore();
    },

    _warpImagePerspective(source, corners, divisions = 18) {
        const output = document.createElement('canvas');
        output.width = source.width;
        output.height = source.height;
        const ctx = output.getContext('2d');
        const interpolate = (u, v) => ({
            x: (1 - u) * (1 - v) * corners.tl.x + u * (1 - v) * corners.tr.x + u * v * corners.br.x + (1 - u) * v * corners.bl.x,
            y: (1 - u) * (1 - v) * corners.tl.y + u * (1 - v) * corners.tr.y + u * v * corners.br.y + (1 - u) * v * corners.bl.y
        });
        for (let row = 0; row < divisions; row++) {
            const v0 = row / divisions;
            const v1 = (row + 1) / divisions;
            for (let column = 0; column < divisions; column++) {
                const u0 = column / divisions;
                const u1 = (column + 1) / divisions;
                const s00 = { x: u0 * source.width, y: v0 * source.height };
                const s10 = { x: u1 * source.width, y: v0 * source.height };
                const s11 = { x: u1 * source.width, y: v1 * source.height };
                const s01 = { x: u0 * source.width, y: v1 * source.height };
                const d00 = interpolate(u0, v0);
                const d10 = interpolate(u1, v0);
                const d11 = interpolate(u1, v1);
                const d01 = interpolate(u0, v1);
                this._drawPerspectiveTriangle(ctx, source, [s00, s10, s11], [d00, d10, d11]);
                this._drawPerspectiveTriangle(ctx, source, [s00, s11, s01], [d00, d11, d01]);
            }
        }
        return output;
    },

    enterImagePerspectiveMode() {
        const obj = this.getSelectedObjects().find(item => item?.type === 'image');
        const source = this._renderImageAppearanceCanvas(obj, { includeFilters: false });
        if (!obj || !source) {
            Utils.showToast('Select a loaded image first', 'warning');
            return;
        }
        if (this._edgeRefineMode) this.exitEdgeRefineMode();
        if (this._imageColorKeyMode) this.exitImageColorKeyMode();
        if (this._eraserMode) this.exitEraserMode();
        if (this._cloneBrushMode) this.exitCloneBrushMode({ cancel: true });
        this._imagePerspectiveMode = true;
        this._imagePerspectiveObj = obj;
        this._imagePerspectiveSourceCanvas = source;
        this._imagePerspectivePreviousCanvas = obj._eraserCanvas || null;
        this._imagePerspectiveView = { zoom: obj.imageZoom, panX: obj.imagePanX, panY: obj.imagePanY };
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        document.getElementById('image-perspective-controls')?.classList.remove('hidden');
        document.getElementById('btn-image-perspective')?.classList.add('active');
        this._showImplementationFloatingToolbar({
            tool: 'perspective',
            label: 'Perspective',
            hint: 'Adjust corners, then apply or cancel',
            onApply: () => this.applyImagePerspective(),
            onCancel: () => this.exitImagePerspectiveMode()
        });
        this._updateImagePerspectivePreview();
    },

    _getImagePerspectiveCorners(width, height) {
        const value = id => (Number(document.getElementById(id)?.value) || 0) / 100;
        return {
            tl: { x: width * value('perspective-tl-x'), y: height * value('perspective-tl-y') },
            tr: { x: width * (1 + value('perspective-tr-x')), y: height * value('perspective-tr-y') },
            bl: { x: width * value('perspective-bl-x'), y: height * (1 + value('perspective-bl-y')) },
            br: { x: width * (1 + value('perspective-br-x')), y: height * (1 + value('perspective-br-y')) }
        };
    },

    _scheduleImagePerspectivePreview() {
        clearTimeout(this._imagePerspectiveTimer);
        this._imagePerspectiveTimer = setTimeout(() => this._updateImagePerspectivePreview(), 50);
    },

    _updateImagePerspectivePreview() {
        if (!this._imagePerspectiveMode || !this._imagePerspectiveObj || !this._imagePerspectiveSourceCanvas) return;
        const source = this._imagePerspectiveSourceCanvas;
        const corners = this._getImagePerspectiveCorners(source.width, source.height);
        this._imagePerspectiveObj._eraserCanvas = this._warpImagePerspective(source, corners);
        this.stage.requestRender();
    },

    resetImagePerspectiveControls() {
        ['perspective-tl-x', 'perspective-tl-y', 'perspective-tr-x', 'perspective-tr-y',
            'perspective-bl-x', 'perspective-bl-y', 'perspective-br-x', 'perspective-br-y'].forEach(id => {
            const input = document.getElementById(id);
            if (input) input.value = 0;
        });
        this._scheduleImagePerspectivePreview();
    },

    exitImagePerspectiveMode(options = {}) {
        if (!this._imagePerspectiveMode) return;
        clearTimeout(this._imagePerspectiveTimer);
        const obj = this._imagePerspectiveObj;
        if (obj && !options.apply) {
            obj._eraserCanvas = this._imagePerspectivePreviousCanvas;
            obj.imageZoom = this._imagePerspectiveView?.zoom ?? 1;
            obj.imagePanX = this._imagePerspectiveView?.panX ?? 0;
            obj.imagePanY = this._imagePerspectiveView?.panY ?? 0;
        }
        this._imagePerspectiveMode = false;
        this._imagePerspectiveObj = null;
        this._imagePerspectiveSourceCanvas = null;
        this._imagePerspectivePreviousCanvas = null;
        this._imagePerspectiveView = null;
        document.getElementById('image-perspective-controls')?.classList.add('hidden');
        document.getElementById('btn-image-perspective')?.classList.remove('active');
        this._hideImplementationFloatingToolbar('perspective');
        this.stage.requestRender();
    },

    applyImagePerspective() {
        const obj = this._imagePerspectiveObj;
        const canvas = obj?._eraserCanvas;
        if (!obj || !canvas) return;
        const src = canvas.toDataURL('image/png');
        obj._eraserCanvas = null;
        obj.imageSrc = src;
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        obj.loadImage(src);
        this.exitImagePerspectiveMode({ apply: true });
        eventBus.emit('history:push');
        Utils.showToast('Perspective applied', 'success');
    },

    flattenImageAppearance() {
        const obj = this.getSelectedObjects().find(item => item?.type === 'image');
        if (!obj) {
            Utils.showToast('Select an image first', 'warning');
            return false;
        }
        if (this._imagePerspectiveMode && this._imagePerspectiveObj === obj) this.applyImagePerspective();
        this._cancelTransientImageModes();
        const canvas = this._renderImageAppearanceCanvas(obj, { includeFilters: true });
        if (!canvas) {
            Utils.showToast('Wait for the selected image to load', 'warning');
            return false;
        }
        const src = canvas.toDataURL('image/png');
        obj._eraserCanvas = null;
        obj.imageSrc = src;
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        obj.imgBrightness = 0;
        obj.imgContrast = 0;
        obj.imgSaturation = 0;
        obj.imgHue = 0;
        obj.imgBlur = 0;
        obj.imgGrayscale = 0;
        obj.imgSepia = 0;
        obj.imgInvert = 0;
        obj.imgTintAmount = 0;
        obj.loadImage(src);
        this.updateProperties?.();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Image appearance flattened', 'success');
        return true;
    },

    _getSpriteGridOptions() {
        const number = (id, fallback, min, max) => Math.max(min, Math.min(max, Number(document.getElementById(id)?.value) || fallback));
        return {
            columns: Math.round(number('sprite-columns', 4, 1, 64)),
            rows: Math.round(number('sprite-rows', 4, 1, 64)),
            gapX: Math.round(number('sprite-gap-x', 0, 0, 500)),
            gapY: Math.round(number('sprite-gap-y', 0, 0, 500)),
            marginX: Math.round(number('sprite-margin-x', 0, 0, 500)),
            marginY: Math.round(number('sprite-margin-y', 0, 0, 500))
        };
    },

    _detectSpriteGrid(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        const occupiedColumns = new Uint8Array(canvas.width);
        const occupiedRows = new Uint8Array(canvas.height);
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if (data[(y * canvas.width + x) * 4 + 3] <= 8) continue;
                occupiedColumns[x] = 1;
                occupiedRows[y] = 1;
            }
        }
        const runs = values => {
            const result = [];
            let start = -1;
            for (let i = 0; i <= values.length; i++) {
                if (i < values.length && values[i]) {
                    if (start < 0) start = i;
                } else if (start >= 0) {
                    result.push({ start, end: i - 1, size: i - start });
                    start = -1;
                }
            }
            return result;
        };
        const xRuns = runs(occupiedColumns);
        const yRuns = runs(occupiedRows);
        const consistent = list => {
            if (list.length < 2 || list.length > 64) return false;
            const average = list.reduce((sum, item) => sum + item.size, 0) / list.length;
            return list.every(item => Math.abs(item.size - average) <= Math.max(2, average * 0.3));
        };
        if (consistent(xRuns) && consistent(yRuns)) {
            const gapX = xRuns.length > 1 ? Math.max(0, Math.round(xRuns.slice(1).reduce((sum, run, index) => sum + run.start - xRuns[index].end - 1, 0) / (xRuns.length - 1))) : 0;
            const gapY = yRuns.length > 1 ? Math.max(0, Math.round(yRuns.slice(1).reduce((sum, run, index) => sum + run.start - yRuns[index].end - 1, 0) / (yRuns.length - 1))) : 0;
            return {
                columns: xRuns.length,
                rows: yRuns.length,
                gapX,
                gapY,
                marginX: xRuns[0].start,
                marginY: yRuns[0].start
            };
        }
        const aspect = canvas.width / Math.max(1, canvas.height);
        const targetFrames = 16;
        const columns = Math.max(1, Math.min(16, Math.round(Math.sqrt(targetFrames * aspect))));
        const rows = Math.max(1, Math.min(16, Math.round(targetFrames / columns)));
        return { columns, rows, gapX: 0, gapY: 0, marginX: 0, marginY: 0 };
    },

    _extractSpriteFrames(canvas, options = this._getSpriteGridOptions()) {
        const usableWidth = canvas.width - options.marginX * 2 - options.gapX * (options.columns - 1);
        const usableHeight = canvas.height - options.marginY * 2 - options.gapY * (options.rows - 1);
        const frameWidth = Math.floor(usableWidth / options.columns);
        const frameHeight = Math.floor(usableHeight / options.rows);
        if (frameWidth < 1 || frameHeight < 1) return [];
        const frames = [];
        for (let row = 0; row < options.rows; row++) {
            for (let column = 0; column < options.columns; column++) {
                const sx = options.marginX + column * (frameWidth + options.gapX);
                const sy = options.marginY + row * (frameHeight + options.gapY);
                if (sx + frameWidth > canvas.width || sy + frameHeight > canvas.height) continue;
                const frame = document.createElement('canvas');
                frame.width = frameWidth;
                frame.height = frameHeight;
                frame.getContext('2d').drawImage(canvas, sx, sy, frameWidth, frameHeight, 0, 0, frameWidth, frameHeight);
                frames.push({ index: frames.length, row, column, sx, sy, width: frameWidth, height: frameHeight, canvas: frame });
            }
        }
        return frames;
    },

    enterSpriteSheetMode() {
        const obj = this.getSelectedObjects().find(item => item?.type === 'image');
        this._cancelTransientImageModes('sprite-sheet');
        const source = this._getEditableImageCanvas(obj);
        if (!obj || !source) {
            Utils.showToast('Select a loaded sprite-sheet image first', 'warning');
            return;
        }
        this._spriteSheetState = { obj, source, frames: [], selected: new Set() };
        document.getElementById('sprite-sheet-controls')?.classList.remove('hidden');
        document.getElementById('btn-sprite-sheet')?.classList.add('active');
        this._showImplementationFloatingToolbar({
            tool: 'sprite-sheet',
            label: 'Sprite Sheet',
            hint: 'Review frames, then apply or cancel',
            applyText: 'Apply Sprite',
            onApply: () => this.applySpriteSheet(),
            onCancel: () => this.exitSpriteSheetMode()
        });
        this.autoDetectSpriteGrid();
    },

    exitSpriteSheetMode() {
        this._spriteSheetState = null;
        document.getElementById('sprite-sheet-controls')?.classList.add('hidden');
        document.getElementById('btn-sprite-sheet')?.classList.remove('active');
        this._hideImplementationFloatingToolbar('sprite-sheet');
    },

    autoDetectSpriteGrid() {
        if (!this._spriteSheetState?.source) return;
        const detected = this._detectSpriteGrid(this._spriteSheetState.source);
        Object.entries({
            'sprite-columns': detected.columns, 'sprite-rows': detected.rows,
            'sprite-gap-x': detected.gapX, 'sprite-gap-y': detected.gapY,
            'sprite-margin-x': detected.marginX, 'sprite-margin-y': detected.marginY
        }).forEach(([id, value]) => {
            const input = document.getElementById(id);
            if (input) input.value = value;
        });
        this.refreshSpriteFrames();
        Utils.showToast(`Detected ${detected.columns} x ${detected.rows} frame grid`, 'success');
    },

    refreshSpriteFrames() {
        const state = this._spriteSheetState;
        if (!state?.source) return;
        state.options = this._getSpriteGridOptions();
        state.frames = this._extractSpriteFrames(state.source, state.options);
        state.selected = new Set(state.frames.map(frame => frame.index));
        this._renderSpriteFramePreview();
        if (!state.frames.length) Utils.showToast('Grid settings do not produce valid frames', 'warning');
    },

    _renderSpriteFramePreview() {
        const container = document.getElementById('sprite-frame-preview');
        const state = this._spriteSheetState;
        if (!container || !state) return;
        container.replaceChildren();
        state.frames.forEach(frame => {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = `sprite-frame-item${state.selected.has(frame.index) ? ' selected' : ''}`;
            button.title = `Frame ${frame.index + 1}`;
            const image = document.createElement('img');
            image.src = frame.canvas.toDataURL('image/png');
            image.alt = '';
            const number = document.createElement('span');
            number.className = 'sprite-frame-number';
            number.textContent = frame.index + 1;
            button.append(image, number);
            button.addEventListener('click', () => {
                if (state.selected.has(frame.index)) state.selected.delete(frame.index);
                else state.selected.add(frame.index);
                button.classList.toggle('selected', state.selected.has(frame.index));
            });
            container.appendChild(button);
        });
    },

    setAllSpriteFramesSelected(selected) {
        const state = this._spriteSheetState;
        if (!state) return;
        state.selected = selected ? new Set(state.frames.map(frame => frame.index)) : new Set();
        this._renderSpriteFramePreview();
    },

    applySpriteSheet() {
        const state = this._spriteSheetState;
        if (!state?.obj || !state.frames.length) return false;
        const selectedFrames = state.frames.filter(frame => state.selected.has(frame.index));
        if (!selectedFrames.length) {
            Utils.showToast('Select at least one frame', 'warning');
            return false;
        }
        const mode = document.getElementById('sprite-output-mode')?.value || 'sequence';
        if (mode === 'images') return this._createSpriteFrameImages(state, selectedFrames);
        return this._createSpriteSequence(state, selectedFrames);
    },

    _createSpriteFrameImages(state, frames) {
        const sourceObj = state.obj;
        const frameHeight = Math.min(Math.max(40, sourceObj.height / Math.max(1, state.options.rows)), 180);
        const frameWidth = frameHeight * frames[0].width / frames[0].height;
        const layoutColumns = Math.max(1, Math.ceil(Math.sqrt(frames.length)));
        const created = [];
        const previousSuppress = this._suppressHistory;
        this._suppressHistory = true;
        frames.forEach((frame, index) => {
            const object = new StageObject('image', {
                name: `${sourceObj.name} Frame ${frame.index + 1}`,
                x: sourceObj.x + (index % layoutColumns) * (frameWidth + 12),
                y: sourceObj.y + Math.floor(index / layoutColumns) * (frameHeight + 12),
                width: frameWidth,
                height: frameHeight,
                imageSrc: frame.canvas.toDataURL('image/png')
            });
            object.loadImage(object.imageSrc);
            this.addObject(object);
            created.push(object);
        });
        if (document.getElementById('sprite-remove-source')?.checked) this.removeObject(sourceObj.id);
        this._suppressHistory = previousSuppress;
        this.select(created.map(object => object.id));
        eventBus.emit('history:push');
        this.exitSpriteSheetMode();
        Utils.showToast(`Created ${created.length} sprite frame images`, 'success');
        return true;
    },

    _createSpriteSequence(state, frames) {
        const obj = state.obj;
        const duration = Math.max(20, Math.min(10000, Number(document.getElementById('sprite-frame-duration')?.value) || 100));
        obj.spriteSheet = {
            columns: state.options.columns,
            rows: state.options.rows,
            gapX: state.options.gapX,
            gapY: state.options.gapY,
            marginX: state.options.marginX,
            marginY: state.options.marginY,
            frameWidth: frames[0].width,
            frameHeight: frames[0].height,
            frameIndices: frames.map(frame => frame.index),
            frameDuration: duration,
            loop: document.getElementById('sprite-loop')?.checked !== false
        };
        obj.isSpriteSequence = true;
        obj._spriteStartTime = performance.now();
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        const centerX = obj.x + obj.width / 2;
        obj.width = obj.height * frames[0].width / frames[0].height;
        obj.x = centerX - obj.width / 2;
        obj.animations = (obj.animations || []).filter(animation => animation.spriteSequence !== true);
        obj.animations.push({
            id: Utils.generateId('anim'),
            type: 'custom',
            name: 'Sprite Sequence',
            spriteSequence: true,
            params: { duration: frames.length * duration / 1000, configs: [] },
            duration: frames.length * duration,
            delay: 0,
            generated: []
        });
        this.stage._hasAnimatedGifs = true;
        eventBus.emit('gif:animated');
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        this.stage.requestRender();
        this.exitSpriteSheetMode();
        Utils.showToast(`Created ${frames.length}-frame sprite sequence`, 'success');
        return true;
    },

    clipImageToShape() {
        const selected = this.getSelectedObjects();
        const images = selected.filter(item => item?.type === 'image');
        const masks = selected.filter(item => item?.type !== 'image' && item?.type !== 'text' && item?.visible !== false);
        if (images.length !== 1 || masks.length !== 1) {
            Utils.showToast('Select exactly one image and one shape or closed path', 'warning');
            return false;
        }
        const obj = images[0];
        const shape = masks[0];
        this._cancelTransientImageModes();
        const source = this._getEditableImageCanvas(obj);
        if (!source || typeof shape.render !== 'function') {
            Utils.showToast('The selected image or mask shape is not ready', 'warning');
            return false;
        }

        const maxDimension = 4096;
        let scale = Math.max(1, source.width / Math.max(1, obj.width), source.height / Math.max(1, obj.height));
        scale = Math.min(scale, maxDimension / Math.max(1, obj.width), maxDimension / Math.max(1, obj.height));
        const width = Math.max(1, Math.round(obj.width * scale));
        const height = Math.max(1, Math.round(obj.height * scale));
        const result = document.createElement('canvas');
        result.width = width;
        result.height = height;
        const ctx = result.getContext('2d', { willReadFrequently: true });
        const coverScale = Math.max(width / source.width, height / source.height);
        const drawWidth = source.width * coverScale * (obj.imageZoom || 1);
        const drawHeight = source.height * coverScale * (obj.imageZoom || 1);
        const extraX = Math.max(0, drawWidth - width);
        const extraY = Math.max(0, drawHeight - height);
        const drawX = -extraX / 2 - (obj.imagePanX || 0) * (extraX / 2);
        const drawY = -extraY / 2 - (obj.imagePanY || 0) * (extraY / 2);
        ctx.drawImage(source, drawX, drawY, drawWidth, drawHeight);

        const mask = document.createElement('canvas');
        mask.width = width;
        mask.height = height;
        const maskCtx = mask.getContext('2d');
        const saved = {
            fillType: shape.fillType, fill: shape.fill, stroke: shape.stroke,
            strokeWidth: shape.strokeWidth, opacity: shape.opacity,
            shadow: shape.shadow, glowEnabled: shape.glowEnabled
        };
        shape.fillType = 'solid';
        shape.fill = '#ffffff';
        shape.stroke = 'transparent';
        shape.strokeWidth = 0;
        shape.opacity = 1;
        shape.shadow = false;
        shape.glowEnabled = false;
        maskCtx.save();
        maskCtx.scale(scale, scale);
        maskCtx.translate(-obj.x, -obj.y);
        shape.render(maskCtx);
        maskCtx.restore();
        Object.assign(shape, saved);

        ctx.globalCompositeOperation = document.getElementById('clip-shape-invert')?.checked
            ? 'destination-out'
            : 'destination-in';
        ctx.drawImage(mask, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        const hasPixels = ctx.getImageData(0, 0, width, height).data.some((value, index) => index % 4 === 3 && value > 0);
        if (!hasPixels) {
            Utils.showToast('The shape does not overlap the image', 'warning');
            return false;
        }

        const src = result.toDataURL('image/png');
        obj._eraserCanvas = null;
        obj.imageSrc = src;
        obj.imageZoom = 1;
        obj.imagePanX = 0;
        obj.imagePanY = 0;
        obj.loadImage(src);
        if (document.getElementById('clip-shape-remove-mask')?.checked) {
            const previousSuppress = this._suppressHistory;
            this._suppressHistory = true;
            this.removeObject(shape.id);
            this._suppressHistory = previousSuppress;
        }
        this.select([obj.id]);
        document.getElementById('image-clip-shape-controls')?.classList.add('hidden');
        this._hideImplementationFloatingToolbar('clip-shape');
        eventBus.emit('history:push');
        Utils.showToast('Image clipped to shape', 'success');
        return true;
    },

    _hexToRgb(hex) {
        const normalized = String(hex || '#000000').replace('#', '').trim();
        const value = normalized.length === 3
            ? normalized.split('').map(part => part + part).join('')
            : normalized.padEnd(6, '0').slice(0, 6);
        const parsed = Number.parseInt(value, 16);
        return {
            r: (parsed >> 16) & 255,
            g: (parsed >> 8) & 255,
            b: parsed & 255
        };
    },

    enterImageColorKeyMode() {
        const obj = this.getSelectedObjects().find(item => item?.type === 'image');
        const source = this._getEditableImageCanvas(obj);
        if (!obj || !source) {
            Utils.showToast('Select a loaded image first', 'warning');
            return;
        }
        if (this._imagePerspectiveMode) this.exitImagePerspectiveMode();
        if (this._edgeRefineMode) this.exitEdgeRefineMode();
        if (this._eraserMode) this.exitEraserMode();
        if (this._cloneBrushMode) this.exitCloneBrushMode({ cancel: true });
        this._imageColorKeyMode = true;
        this._imageColorKeyObj = obj;
        this._imageColorKeySourceCanvas = source;
        this._imageColorKeyPreviousCanvas = obj._eraserCanvas || null;
        document.getElementById('image-color-key-controls')?.classList.remove('hidden');
        document.getElementById('btn-image-color-key')?.classList.add('active');
        this._showImplementationFloatingToolbar({
            tool: 'color-key',
            label: 'Color Key',
            hint: 'Preview color replacement, then apply or cancel',
            onApply: () => this.applyImageColorKey(),
            onCancel: () => this.exitImageColorKeyMode()
        });
        this._syncImageColorKeyModeControls();
        this._updateImageColorKeyPreview();
    },

    _syncImageColorKeyModeControls() {
        const replace = document.getElementById('image-color-key-mode')?.value === 'replace';
        document.getElementById('image-color-key-replacement-row')?.classList.toggle('hidden', !replace);
    },

    _scheduleImageColorKeyPreview() {
        clearTimeout(this._imageColorKeyTimer);
        this._imageColorKeyTimer = setTimeout(() => this._updateImageColorKeyPreview(), 50);
    },

    _updateImageColorKeyPreview() {
        if (!this._imageColorKeyMode || !this._imageColorKeyObj || !this._imageColorKeySourceCanvas) return;
        const source = this._imageColorKeySourceCanvas;
        const sourceCtx = source.getContext('2d', { willReadFrequently: true });
        const imageData = sourceCtx.getImageData(0, 0, source.width, source.height);
        const data = new Uint8ClampedArray(imageData.data);
        const target = this._hexToRgb(document.getElementById('image-color-key-source')?.value);
        const replacement = this._hexToRgb(document.getElementById('image-color-key-replacement')?.value);
        const mode = document.getElementById('image-color-key-mode')?.value || 'key';
        const tolerance = Math.max(0, Number(document.getElementById('image-color-key-tolerance')?.value) || 0);
        const softness = Math.max(0, Number(document.getElementById('image-color-key-softness')?.value) || 0);
        const end = tolerance + softness;
        for (let i = 0; i < data.length; i += 4) {
            if (!data[i + 3]) continue;
            const dr = data[i] - target.r;
            const dg = data[i + 1] - target.g;
            const db = data[i + 2] - target.b;
            const distance = Math.sqrt(dr * dr + dg * dg + db * db) / Math.sqrt(3);
            let amount;
            if (distance <= tolerance) amount = 1;
            else if (!softness || distance >= end) amount = 0;
            else {
                const t = (distance - tolerance) / softness;
                amount = 1 - t * t * (3 - 2 * t);
            }
            if (!amount) continue;
            if (mode === 'key') {
                data[i + 3] = Math.round(data[i + 3] * (1 - amount));
            } else {
                data[i] = Math.round(data[i] * (1 - amount) + replacement.r * amount);
                data[i + 1] = Math.round(data[i + 1] * (1 - amount) + replacement.g * amount);
                data[i + 2] = Math.round(data[i + 2] * (1 - amount) + replacement.b * amount);
            }
        }
        const result = document.createElement('canvas');
        result.width = source.width;
        result.height = source.height;
        result.getContext('2d').putImageData(new ImageData(data, source.width, source.height), 0, 0);
        this._imageColorKeyObj._eraserCanvas = result;
        this.stage.requestRender();
    },

    exitImageColorKeyMode(options = {}) {
        if (!this._imageColorKeyMode) return;
        clearTimeout(this._imageColorKeyTimer);
        if (this._imageColorKeyObj && !options.apply) {
            this._imageColorKeyObj._eraserCanvas = this._imageColorKeyPreviousCanvas;
        }
        this._imageColorKeyMode = false;
        this._imageColorKeyObj = null;
        this._imageColorKeySourceCanvas = null;
        this._imageColorKeyPreviousCanvas = null;
        this._imageColorKeyPicking = false;
        document.getElementById('image-color-key-controls')?.classList.add('hidden');
        document.getElementById('btn-image-color-key')?.classList.remove('active');
        document.getElementById('btn-image-color-key-pick')?.classList.remove('active');
        this._hideImplementationFloatingToolbar('color-key');
        if (this.stage?.viewport) this.stage.viewport.style.cursor = '';
        this.stage.requestRender();
    },

    applyImageColorKey() {
        const obj = this._imageColorKeyObj;
        const canvas = obj?._eraserCanvas;
        if (!obj || !canvas) return;
        const src = canvas.toDataURL('image/png');
        obj._eraserCanvas = null;
        obj.imageSrc = src;
        obj.loadImage(src);
        this.exitImageColorKeyMode({ apply: true });
        eventBus.emit('history:push');
        Utils.showToast('Image color change applied', 'success');
    },

    pickImageColorKeyColor() {
        if (!this._imageColorKeyMode || !this._imageColorKeyObj || !this._imageColorKeySourceCanvas) {
            Utils.showToast('Open Color Key on a loaded image first', 'warning');
            return false;
        }
        this._imageColorKeyPicking = !this._imageColorKeyPicking;
        document.getElementById('btn-image-color-key-pick')?.classList.toggle('active', this._imageColorKeyPicking);
        if (this.stage?.viewport) this.stage.viewport.style.cursor = this._imageColorKeyPicking ? 'crosshair' : '';
        Utils.showToast(this._imageColorKeyPicking
            ? 'Click the color to select directly on the image'
            : 'Color picking cancelled', this._imageColorKeyPicking ? 'info' : 'warning');
        return this._imageColorKeyPicking;
    },

    _handleImageColorKeyPick(pos) {
        const obj = this._imageColorKeyObj;
        const canvas = this._imageColorKeySourceCanvas;
        if (!this._imageColorKeyPicking || !obj || !canvas) return false;
        const point = this._cloneBrushObjectPoint(obj, canvas, pos);
        if (!point?.inside) {
            Utils.showToast('Click inside the selected image to pick a color', 'warning');
            return true;
        }
        const x = Math.max(0, Math.min(canvas.width - 1, Math.floor(point.x)));
        const y = Math.max(0, Math.min(canvas.height - 1, Math.floor(point.y)));
        const pixel = canvas.getContext('2d', { willReadFrequently: true }).getImageData(x, y, 1, 1).data;
        if (!pixel[3]) {
            Utils.showToast('That pixel is transparent. Pick a visible color', 'warning');
            return true;
        }
        const hex = `#${[pixel[0], pixel[1], pixel[2]].map(value => value.toString(16).padStart(2, '0')).join('')}`;
        const input = document.getElementById('image-color-key-source');
        if (input) input.value = hex;
        this._imageColorKeyPicking = false;
        document.getElementById('btn-image-color-key-pick')?.classList.remove('active');
        if (this.stage?.viewport) this.stage.viewport.style.cursor = '';
        this._scheduleImageColorKeyPreview();
        Utils.showToast(`Selected ${hex}`, 'success');
        return true;
    },

    // === Image Eraser Mode ===

    enterEraserMode(options = {}) {
        if (this._imagePerspectiveMode) this.exitImagePerspectiveMode();
        if (this._edgeRefineMode) this.exitEdgeRefineMode();
        if (this._imageColorKeyMode) this.exitImageColorKeyMode();
        const selected = this.getSelectedObjects();
        const obj = selected.find(o => o.type === 'image');
        if (!obj || !obj.imageElement) {
            Utils.showToast('No image selected or image not loaded', 'warning');
            return;
        }
        // Create offscreen canvas from image at native resolution
        const natW = obj.imageElement.naturalWidth;
        const natH = obj.imageElement.naturalHeight;
        const cvs = document.createElement('canvas');
        cvs.width = natW;
        cvs.height = natH;
        const ctx = cvs.getContext('2d');
        ctx.drawImage(obj.imageElement, 0, 0, natW, natH);

        this._eraserMode = true;
        this._eraserObj = obj;
        this._eraserCanvas = cvs;
        this._eraserCtx = ctx;
        this._eraserDrawing = false;
        this._eraserLastPos = null;
        this._eraserOperation = options.mode === 'restore' ? 'restore' : 'erase';
        this._eraserRestoreCanvas = null;
        if (this._eraserOperation === 'restore' && options.restoreFromSrc) {
            const restoreImg = new Image();
            restoreImg.onload = () => {
                const restoreCanvas = document.createElement('canvas');
                restoreCanvas.width = natW;
                restoreCanvas.height = natH;
                restoreCanvas.getContext('2d', { willReadFrequently: true }).drawImage(restoreImg, 0, 0, natW, natH);
                this._eraserRestoreCanvas = restoreCanvas;
                this.stage.requestRender();
            };
            restoreImg.src = options.restoreFromSrc;
        }

        // Read brush size from UI
        const sizeEl = document.getElementById('eraser-brush-size');
        if (sizeEl) this._eraserBrushSize = parseInt(sizeEl.value) || 20;
        const hardEl = document.getElementById('eraser-hardness');
        if (hardEl) this._eraserHardness = parseInt(hardEl.value) || 100;

        document.getElementById('image-eraser-controls')?.classList.remove('hidden');
        this._showImplementationFloatingToolbar({
            tool: 'eraser',
            label: this._eraserOperation === 'restore' ? 'Restore Brush' : 'Eraser',
            hint: this._eraserOperation === 'restore'
                ? 'Paint to restore, then apply or cancel'
                : 'Paint to erase, then apply or cancel',
            applyText: this._eraserOperation === 'restore' ? 'Apply Restore' : 'Apply Erase',
            onApply: () => this.applyEraser(),
            onCancel: () => this.exitEraserMode()
        });
        this.stage.viewport.style.cursor = 'none';
        this.stage.requestRender();
        Utils.showToast(this._eraserOperation === 'restore'
            ? 'Restore brush active — paint cover back, then Apply'
            : 'Eraser active — paint to erase, then Apply', 'info');
    },

    exitEraserMode() {
        this._eraserMode = false;
        this._eraserObj = null;
        this._eraserCanvas = null;
        this._eraserCtx = null;
        this._eraserDrawing = false;
        this._eraserLastPos = null;
        this._eraserCursorPos = null;
        this._eraserOperation = 'erase';
        this._eraserRestoreCanvas = null;
        document.getElementById('image-eraser-controls')?.classList.add('hidden');
        this._hideImplementationFloatingToolbar('eraser');
        this.stage.viewport.style.cursor = '';
        this.stage.requestRender();
    },

    applyEraser() {
        if (!this._eraserMode || !this._eraserObj || !this._eraserCanvas) return;
        const newSrc = this._eraserCanvas.toDataURL('image/png');
        this._eraserObj.imageSrc = newSrc;
        this._eraserObj.imageZoom = 1;
        this._eraserObj.imagePanX = 0;
        this._eraserObj.imagePanY = 0;
        this._eraserObj.loadImage(newSrc);
        Utils.showToast('Eraser applied', 'success');
        eventBus.emit('history:push');
        this.exitEraserMode();
    },

    _stageToImageCoords(pos) {
        // Convert stage coordinates to image pixel coordinates
        const obj = this._eraserObj;
        if (!obj || !this._eraserCanvas) return null;
        const natW = this._eraserCanvas.width;
        const natH = this._eraserCanvas.height;
        const ix = ((pos.x - obj.x) / obj.width) * natW;
        const iy = ((pos.y - obj.y) / obj.height) * natH;
        return { x: ix, y: iy };
    },

    _eraseBrushAt(ix, iy) {
        const ctx = this._eraserCtx;
        if (!ctx) return;
        const obj = this._eraserObj;
        const natW = this._eraserCanvas.width;
        const natH = this._eraserCanvas.height;
        // Scale brush from stage size to image pixel size
        const brushRadius = (this._eraserBrushSize / 2) * (natW / obj.width);

        if (this._eraserOperation === 'restore' && this._eraserRestoreCanvas) {
            const brushMask = document.createElement('canvas');
            brushMask.width = natW;
            brushMask.height = natH;
            const maskCtx = brushMask.getContext('2d', { willReadFrequently: true });
            if (this._eraserHardness >= 90) {
                maskCtx.beginPath();
                maskCtx.arc(ix, iy, brushRadius, 0, Math.PI * 2);
                maskCtx.fillStyle = '#fff';
                maskCtx.fill();
            } else {
                const gradient = maskCtx.createRadialGradient(ix, iy, 0, ix, iy, brushRadius);
                const innerStop = this._eraserHardness / 100;
                gradient.addColorStop(0, 'rgba(255,255,255,1)');
                gradient.addColorStop(Math.min(innerStop, 0.99), 'rgba(255,255,255,1)');
                gradient.addColorStop(1, 'rgba(255,255,255,0)');
                maskCtx.fillStyle = gradient;
                maskCtx.fillRect(ix - brushRadius, iy - brushRadius, brushRadius * 2, brushRadius * 2);
            }

            const restorePatch = document.createElement('canvas');
            restorePatch.width = natW;
            restorePatch.height = natH;
            const patchCtx = restorePatch.getContext('2d', { willReadFrequently: true });
            patchCtx.drawImage(this._eraserRestoreCanvas, 0, 0);
            patchCtx.globalCompositeOperation = 'destination-in';
            patchCtx.drawImage(brushMask, 0, 0);
            patchCtx.globalCompositeOperation = 'source-over';
            ctx.save();
            ctx.globalCompositeOperation = 'source-over';
            ctx.drawImage(restorePatch, 0, 0);
            ctx.restore();
            return;
        }

        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';

        if (this._eraserHardness >= 90) {
            // Hard brush
            ctx.beginPath();
            ctx.arc(ix, iy, brushRadius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0,0,0,1)';
            ctx.fill();
        } else {
            // Soft brush using radial gradient
            const gradient = ctx.createRadialGradient(ix, iy, 0, ix, iy, brushRadius);
            const innerStop = this._eraserHardness / 100;
            gradient.addColorStop(0, 'rgba(0,0,0,1)');
            gradient.addColorStop(Math.min(innerStop, 0.99), 'rgba(0,0,0,1)');
            gradient.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(ix - brushRadius, iy - brushRadius, brushRadius * 2, brushRadius * 2);
        }

        ctx.restore();
    },

    _eraseStroke(from, to) {
        // Interpolate between two points for smooth erasing
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const obj = this._eraserObj;
        const natW = this._eraserCanvas.width;
        const step = Math.max(1, (this._eraserBrushSize * (natW / obj.width)) * 0.25);
        const steps = Math.max(1, Math.ceil(dist / step));

        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const x = from.x + dx * t;
            const y = from.y + dy * t;
            this._eraseBrushAt(x, y);
        }
    },

    _handleEraserMouseDown(pos) {
        const obj = this._eraserObj;
        // Check if click is on the image
        if (pos.x >= obj.x && pos.x <= obj.x + obj.width &&
            pos.y >= obj.y && pos.y <= obj.y + obj.height) {
            this._eraserDrawing = true;
            const ip = this._stageToImageCoords(pos);
            if (ip) {
                this._eraseBrushAt(ip.x, ip.y);
                this._eraserLastPos = ip;
                this.stage.requestRender();
            }
        }
    },

    _handleEraserMouseMove(pos) {
        // Always update cursor position for brush preview
        this._eraserCursorPos = { x: pos.x, y: pos.y };

        if (this._eraserDrawing) {
            const ip = this._stageToImageCoords(pos);
            if (ip && this._eraserLastPos) {
                this._eraseStroke(this._eraserLastPos, ip);
                this._eraserLastPos = ip;
                this.stage.requestRender();
            } else if (ip) {
                this._eraseBrushAt(ip.x, ip.y);
                this._eraserLastPos = ip;
                this.stage.requestRender();
            }
        } else {
            this.stage.requestRender();
        }
    },

    _handleEraserMouseUp() {
        this._eraserDrawing = false;
        this._eraserLastPos = null;
    },

    // === Clone Brush (non-destructive sampled painting) ===

    enterCloneBrushMode(options = {}) {
        if (this._imagePerspectiveMode) this.exitImagePerspectiveMode();
        if (this._edgeRefineMode) this.exitEdgeRefineMode();
        if (this._imageColorKeyMode) this.exitImageColorKeyMode();
        const selected = options.target || this.getSelectedObjects().find(obj => obj?.type === 'image');
        if (!selected) {
            Utils.showToast('Select an image or clone layer first', 'warning');
            return;
        }
        if (!selected.imageElement && !selected._eraserCanvas) {
            Utils.showToast('Wait for the selected image to load', 'warning');
            return;
        }
        if (this._eraserMode) this.exitEraserMode();

        const editingLayer = !!selected.cloneBrushLayer;
        const meta = selected.cloneBrushLayer || {};
        const target = editingLayer
            ? (this.getObjectById?.(meta.targetId) || selected)
            : selected;
        const source = options.source || (editingLayer
            ? (this.getObjectById?.(meta.sourceId) || target)
            : selected);
        if (!target || target.type !== 'image') {
            Utils.showToast('The clone layer target is no longer available', 'warning');
            return;
        }

        this._cloneBrushMode = true;
        this._cloneBrushSource = source;
        this._cloneBrushSourceCanvas = this._makeCloneBrushImageCanvas(source);
        this._cloneBrushSourcePoint = null;
        this._cloneBrushTarget = target;
        this._cloneBrushDrawing = false;
        this._cloneBrushLastPoint = null;
        this._cloneBrushStrokeAnchor = null;
        this._cloneBrushAlignedAnchor = null;
        this._cloneBrushMaskTextureCache = null;
        this._cloneBrushCursorPos = null;
        this._cloneBrushLiveSourcePos = null;
        this._cloneBrushStrokeStartStage = null;
        this._cloneBrushStrokeMoved = false;
        this._cloneBrushRecentStrokes = [];
        this._cloneBrushMaskMode = false;
        this._cloneBrushMaskDrawing = false;
        this._cloneBrushMaskPoints = [];
        this._cloneBrushMaskCanvas = null;
        this._cloneBrushMaskTextureCanvas = null;
        this._cloneBrushMaskTextureCache = null;
        this._cloneBrushMaskBounds = null;
        this._cloneBrushMaskFeather = Number(document.getElementById('clone-brush-mask-feather')?.value) || 2;
        this._cloneBrushMaskInverted = !!document.getElementById('clone-brush-invert-mask')?.checked;
        this._cloneBrushClipTargetAlpha = !!document.getElementById('clone-brush-clip-target-alpha')?.checked;
        this._cloneBrushTargetAlphaCanvas = null;
        this._cloneBrushBoundaryMode = null;
        this._cloneBrushBoundaryDrawing = false;
        this._cloneBrushBoundaryPoints = [];
        this._cloneBrushBoundaryObject = null;
        this._cloneBrushBoundaryCanvas = null;
        this._cloneBrushBoundaryFeather = Number(document.getElementById('clone-brush-boundary-feather')?.value) || 2;
        this._cloneBrushBoundaryInverted = !!document.getElementById('clone-brush-invert-boundary')?.checked;
        this._cloneBrushBoundaryPointerStart = null;
        this._cloneBrushBoundaryDragged = false;
        this._cloneBrushMaskPointerStart = null;
        this._cloneBrushMaskDragged = false;
        this._cloneBrushPickSource = false;
        this._cloneBrushPickTarget = false;
        this._cloneBrushUndo = [];
        this._cloneBrushRedo = [];
        this._cloneBrushEditingExisting = editingLayer;
        this._cloneBrushOriginalSrc = editingLayer ? selected.imageSrc : null;

        this._cloneBrushSize = Number(document.getElementById('clone-brush-size')?.value) || 36;
        this._cloneBrushHardness = Number(document.getElementById('clone-brush-hardness')?.value) || 75;
        this._cloneBrushOpacity = Number(document.getElementById('clone-brush-opacity')?.value) || 100;
        this._cloneBrushSpacing = Number(document.getElementById('clone-brush-spacing')?.value) || 20;
        this._cloneBrushAligned = document.getElementById('clone-brush-aligned')?.checked !== false;

        if (editingLayer) {
            this._cloneBrushLayer = selected;
            this._cloneBrushCanvas = this._makeCloneBrushImageCanvas(selected);
            this._cloneBrushCtx = this._cloneBrushCanvas?.getContext('2d', { willReadFrequently: true }) || null;
            this._cloneBrushInitialImageData = this._cloneBrushCtx
                ? this._cloneBrushCtx.getImageData(0, 0, this._cloneBrushCanvas.width, this._cloneBrushCanvas.height)
                : null;
            selected._eraserCanvas = this._cloneBrushCanvas;
        } else {
            this._createCloneBrushLayer(target);
        }
        if (!this._cloneBrushCanvas || !this._cloneBrushCtx) {
            this.exitCloneBrushMode({ cancel: true });
            Utils.showToast('Unable to prepare the clone layer', 'error');
            return;
        }
        this._buildCloneBrushTargetAlphaCanvas();

        if (options.sourcePoint === 'center' && this._cloneBrushSource && this._cloneBrushSourceCanvas) {
            const stagePoint = {
                x: this._cloneBrushSource.x + this._cloneBrushSource.width / 2,
                y: this._cloneBrushSource.y + this._cloneBrushSource.height / 2
            };
            const objectPoint = this._cloneBrushObjectPoint(this._cloneBrushSource, this._cloneBrushSourceCanvas, stagePoint);
            if (objectPoint) {
                this._cloneBrushSourcePoint = { ...objectPoint, stageX: stagePoint.x, stageY: stagePoint.y };
                this._cloneBrushLiveSourcePos = { ...stagePoint };
            }
        }

        document.getElementById('clone-brush-controls')?.classList.remove('hidden');
        document.getElementById('btn-clone-brush')?.classList.add('active');
        this._showImplementationFloatingToolbar({
            tool: 'clone-brush',
            label: 'Clone Brush',
            hint: 'Paint edits, then apply layer or cancel',
            applyText: 'Apply Clone',
            onApply: () => this.applyCloneBrush(),
            onCancel: () => this.exitCloneBrushMode({ cancel: true })
        });
        this.stage.viewport.style.cursor = 'none';
        this._updateCloneBrushStatus();
        this.stage.requestRender();
        Utils.showToast('Clone Brush active: choose a source, then paint. Double-click to move the source.', 'info');
    },

    startCloneBrushWithSourceTarget(source, target, options = {}) {
        if (!source || source.type !== 'image') {
            Utils.showToast('Clone Brush needs a captured source image.', 'warning');
            return false;
        }
        if (!target || target.type !== 'image') {
            Utils.showToast('Clone Brush needs an image target to paint on.', 'warning');
            return false;
        }
        if ((!source.imageElement && !source._eraserCanvas) || (!target.imageElement && !target._eraserCanvas)) {
            Utils.showToast('Wait for the source and target images to load, then try again.', 'warning');
            return false;
        }
        this.select?.([target.id]);
        this.enterCloneBrushMode({
            source,
            target,
            sourcePoint: options.sourcePoint || 'center'
        });
        return !!this._cloneBrushMode;
    },

    _makeCloneBrushImageCanvas(obj) {
        const source = obj?._eraserCanvas || obj?.imageElement;
        if (!source) return null;
        const width = Math.max(1, source.naturalWidth || source.width || 1);
        const height = Math.max(1, source.naturalHeight || source.height || 1);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        try {
            context.drawImage(source, 0, 0, width, height);
            context.getImageData(0, 0, 1, 1);
        } catch (_) {
            return null;
        }
        return canvas;
    },

    _createCloneBrushLayer(target) {
        const ratio = Math.max(0.01, Math.abs(target.width || 1) / Math.max(1, Math.abs(target.height || 1)));
        const longest = Math.min(1600, Math.max(256, Math.round(Math.max(Math.abs(target.width), Math.abs(target.height)) * Math.min(1.5, window.devicePixelRatio || 1))));
        const width = ratio >= 1 ? longest : Math.max(1, Math.round(longest * ratio));
        const height = ratio >= 1 ? Math.max(1, Math.round(longest / ratio)) : longest;
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const layer = new StageObject('image', {
            x: target.x,
            y: target.y,
            width: target.width,
            height: target.height,
            rotation: target.rotation || 0,
            pivotX: target.pivotX,
            pivotY: target.pivotY,
            flipH: !!target.flipH,
            flipV: !!target.flipV,
            imageSrc: canvas.toDataURL('image/png'),
            name: `${target.name || 'Image'} Clone Paint`,
            strokeWidth: 0,
            lockAspectRatio: true,
            cloneBrushLayer: {
                targetId: target.id,
                sourceId: this._cloneBrushSource?.id || target.id,
                createdAt: Date.now()
            }
        });
        layer._eraserCanvas = canvas;
        const previousSuppress = this._suppressHistory;
        this._suppressHistory = true;
        this.addObject(layer);
        this._suppressHistory = previousSuppress;
        const targetIndex = this.objects.indexOf(target);
        const layerIndex = this.objects.indexOf(layer);
        if (targetIndex >= 0 && layerIndex >= 0 && layerIndex !== targetIndex + 1) {
            this.objects.splice(layerIndex, 1);
            this.objects.splice(Math.min(targetIndex + 1, this.objects.length), 0, layer);
        }
        this._cloneBrushLayer = layer;
        this._cloneBrushCanvas = canvas;
        this._cloneBrushCtx = canvas.getContext('2d', { willReadFrequently: true });
        this._cloneBrushInitialImageData = this._cloneBrushCtx.getImageData(0, 0, width, height);
        this.updateObjectList?.();
    },

    exitCloneBrushMode(options = {}) {
        if (!this._cloneBrushMode && !this._cloneBrushLayer) return;
        const layer = this._cloneBrushLayer;
        if (options.cancel && layer) {
            if (this._cloneBrushEditingExisting) {
                if (this._cloneBrushInitialImageData && this._cloneBrushCtx) {
                    this._cloneBrushCtx.putImageData(this._cloneBrushInitialImageData, 0, 0);
                }
                if (this._cloneBrushOriginalSrc) {
                    layer.imageSrc = this._cloneBrushOriginalSrc;
                    layer.loadImage(this._cloneBrushOriginalSrc);
                }
                layer._eraserCanvas = null;
            } else {
                const index = this.objects.indexOf(layer);
                if (index >= 0) this.objects.splice(index, 1);
                this.selectedIds = this.selectedIds.filter(id => id !== layer.id);
                this.updateObjectList?.();
                this.updateProperties?.();
            }
        }
        this._cloneBrushMode = false;
        this._cloneBrushSource = null;
        this._cloneBrushSourceCanvas = null;
        this._cloneBrushSourcePoint = null;
        this._cloneBrushTarget = null;
        this._cloneBrushLayer = null;
        this._cloneBrushCanvas = null;
        this._cloneBrushCtx = null;
        this._cloneBrushDrawing = false;
        this._cloneBrushLastPoint = null;
        this._cloneBrushStrokeAnchor = null;
        this._cloneBrushAlignedAnchor = null;
        this._cloneBrushCursorPos = null;
        this._cloneBrushLiveSourcePos = null;
        this._cloneBrushStrokeStartStage = null;
        this._cloneBrushStrokeMoved = false;
        this._cloneBrushRecentStrokes = [];
        this._cloneBrushMaskMode = false;
        this._cloneBrushMaskDrawing = false;
        this._cloneBrushMaskPoints = [];
        this._cloneBrushMaskCanvas = null;
        this._cloneBrushMaskTextureCanvas = null;
        this._cloneBrushMaskTextureCache = null;
        this._cloneBrushMaskBounds = null;
        this._cloneBrushTargetAlphaCanvas = null;
        this._cloneBrushBoundaryMode = null;
        this._cloneBrushBoundaryDrawing = false;
        this._cloneBrushBoundaryPoints = [];
        this._cloneBrushBoundaryObject = null;
        this._cloneBrushBoundaryCanvas = null;
        this._cloneBrushBoundaryPointerStart = null;
        this._cloneBrushBoundaryDragged = false;
        this._cloneBrushMaskPointerStart = null;
        this._cloneBrushMaskDragged = false;
        this._cloneBrushPickSource = false;
        this._cloneBrushPickTarget = false;
        this._cloneBrushUndo = [];
        this._cloneBrushRedo = [];
        this._cloneBrushInitialImageData = null;
        this._cloneBrushEditingExisting = false;
        this._cloneBrushOriginalSrc = null;
        document.getElementById('clone-brush-controls')?.classList.add('hidden');
        document.getElementById('btn-clone-brush')?.classList.remove('active');
        this._hideImplementationFloatingToolbar('clone-brush');
        if (this.stage?.viewport) this.stage.viewport.style.cursor = '';
        this.stage?.requestRender?.();
    },

    applyCloneBrush() {
        if (!this._cloneBrushMode || !this._cloneBrushLayer || !this._cloneBrushCanvas) return;
        const layer = this._cloneBrushLayer;
        let src;
        try {
            src = this._cloneBrushCanvas.toDataURL('image/png');
        } catch (_) {
            Utils.showToast('This image source blocks pixel export. Replace it with an uploaded image and try again.', 'error');
            return;
        }
        layer.imageSrc = src;
        layer.cloneBrushLayer = {
            ...(layer.cloneBrushLayer || {}),
            targetId: this._cloneBrushTarget?.id || null,
            sourceId: this._cloneBrushSource?.id || null,
            updatedAt: Date.now()
        };
        layer.loadImage(src);
        layer._eraserCanvas = null;
        this.select([layer.id]);
        eventBus.emit('history:push');
        this.exitCloneBrushMode();
        Utils.showToast('Clone paint kept as a separate image layer', 'success');
    },

    _cloneBrushObjectPoint(obj, canvas, pos, fitToBox = false) {
        if (!obj || !canvas || !pos) return null;
        const pivot = obj.getPivotPoint?.() || {
            x: obj.x + (obj.width || 0) * (obj.pivotX ?? 0.5),
            y: obj.y + (obj.height || 0) * (obj.pivotY ?? 0.5)
        };
        const angle = -Utils.degToRad(obj.rotation || 0);
        const dx = pos.x - pivot.x;
        const dy = pos.y - pivot.y;
        const unrotatedX = pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle);
        const unrotatedY = pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle);
        let localX = unrotatedX - obj.x;
        let localY = unrotatedY - obj.y;
        if (obj.flipH) localX = obj.width - localX;
        if (obj.flipV) localY = obj.height - localY;
        const inside = localX >= 0 && localX <= obj.width && localY >= 0 && localY <= obj.height;

        const imageWidth = Math.max(1, canvas.width);
        const imageHeight = Math.max(1, canvas.height);
        if (fitToBox) {
            return {
                x: (localX / Math.max(1, obj.width)) * imageWidth,
                y: (localY / Math.max(1, obj.height)) * imageHeight,
                localX,
                localY,
                inside,
                pixelsPerStageX: imageWidth / Math.max(1, obj.width),
                pixelsPerStageY: imageHeight / Math.max(1, obj.height)
            };
        }
        const coverScale = Math.max(obj.width / imageWidth, obj.height / imageHeight);
        const drawWidth = imageWidth * coverScale * (obj.imageZoom || 1);
        const drawHeight = imageHeight * coverScale * (obj.imageZoom || 1);
        const extraX = Math.max(0, drawWidth - obj.width);
        const extraY = Math.max(0, drawHeight - obj.height);
        const drawX = -extraX / 2 - (obj.imagePanX || 0) * (extraX / 2);
        const drawY = -extraY / 2 - (obj.imagePanY || 0) * (extraY / 2);
        return {
            x: ((localX - drawX) / drawWidth) * imageWidth,
            y: ((localY - drawY) / drawHeight) * imageHeight,
            localX,
            localY,
            inside,
            pixelsPerStageX: imageWidth / drawWidth,
            pixelsPerStageY: imageHeight / drawHeight
        };
    },

    _cloneBrushImagePointToStage(obj, canvas, imagePoint) {
        if (!obj || !canvas || !imagePoint) return null;
        const imageWidth = Math.max(1, canvas.width);
        const imageHeight = Math.max(1, canvas.height);
        const coverScale = Math.max(obj.width / imageWidth, obj.height / imageHeight);
        const drawWidth = imageWidth * coverScale * (obj.imageZoom || 1);
        const drawHeight = imageHeight * coverScale * (obj.imageZoom || 1);
        const extraX = Math.max(0, drawWidth - obj.width);
        const extraY = Math.max(0, drawHeight - obj.height);
        const drawX = -extraX / 2 - (obj.imagePanX || 0) * (extraX / 2);
        const drawY = -extraY / 2 - (obj.imagePanY || 0) * (extraY / 2);
        let localX = drawX + (imagePoint.x / imageWidth) * drawWidth;
        let localY = drawY + (imagePoint.y / imageHeight) * drawHeight;
        if (obj.flipH) localX = obj.width - localX;
        if (obj.flipV) localY = obj.height - localY;
        const unrotatedX = obj.x + localX;
        const unrotatedY = obj.y + localY;
        const pivot = obj.getPivotPoint?.() || {
            x: obj.x + (obj.width || 0) * (obj.pivotX ?? 0.5),
            y: obj.y + (obj.height || 0) * (obj.pivotY ?? 0.5)
        };
        const angle = Utils.degToRad(obj.rotation || 0);
        const dx = unrotatedX - pivot.x;
        const dy = unrotatedY - pivot.y;
        return {
            x: pivot.x + dx * Math.cos(angle) - dy * Math.sin(angle),
            y: pivot.y + dx * Math.sin(angle) + dy * Math.cos(angle)
        };
    },

    _findCloneBrushImageAt(pos) {
        for (let index = this.objects.length - 1; index >= 0; index--) {
            const obj = this.objects[index];
            if (!obj || obj.type !== 'image' || obj.visible === false || obj === this._cloneBrushLayer) continue;
            const canvas = this._makeCloneBrushImageCanvas(obj);
            if (!canvas) continue;
            const point = this._cloneBrushObjectPoint(obj, canvas, pos);
            if (point?.inside) return { obj, canvas, point };
        }
        return null;
    },

    _setCloneBrushTarget(target) {
        if (!target || target.type !== 'image') return false;
        if (this._cloneBrushEditingExisting) {
            Utils.showToast('Finish editing this clone layer before choosing another target', 'warning');
            return false;
        }
        if (this._cloneBrushUndo.length) {
            Utils.showToast('Apply or clear the current clone strokes before changing target', 'warning');
            return false;
        }
        if (!this._cloneBrushEditingExisting && this._cloneBrushLayer) {
            const index = this.objects.indexOf(this._cloneBrushLayer);
            if (index >= 0) this.objects.splice(index, 1);
        }
        this._cloneBrushTarget = target;
        this._cloneBrushLayer = null;
        this._cloneBrushCanvas = null;
        this._cloneBrushCtx = null;
        this._cloneBrushAlignedAnchor = null;
        this._cloneBrushMaskTextureCache = null;
        this._cloneBrushEditingExisting = false;
        this._createCloneBrushLayer(target);
        this._buildCloneBrushTargetAlphaCanvas();
        this._buildCloneBrushBoundaryCanvas();
        return true;
    },

    _buildCloneBrushTargetAlphaCanvas() {
        if (!this._cloneBrushClipTargetAlpha || !this._cloneBrushTarget || !this._cloneBrushCanvas) {
            this._cloneBrushTargetAlphaCanvas = null;
            this._syncCloneBrushCoverageControls();
            return;
        }
        const target = this._cloneBrushTarget;
        const source = this._makeCloneBrushImageCanvas(target);
        if (!source) {
            this._cloneBrushTargetAlphaCanvas = null;
            this._syncCloneBrushCoverageControls();
            return;
        }
        const alpha = document.createElement('canvas');
        alpha.width = this._cloneBrushCanvas.width;
        alpha.height = this._cloneBrushCanvas.height;
        const context = alpha.getContext('2d', { willReadFrequently: true });
        const imageWidth = Math.max(1, source.width);
        const imageHeight = Math.max(1, source.height);
        const targetWidth = Math.max(1, target.width);
        const targetHeight = Math.max(1, target.height);
        const coverScale = Math.max(targetWidth / imageWidth, targetHeight / imageHeight);
        const drawWidth = imageWidth * coverScale * (target.imageZoom || 1);
        const drawHeight = imageHeight * coverScale * (target.imageZoom || 1);
        const extraX = Math.max(0, drawWidth - targetWidth);
        const extraY = Math.max(0, drawHeight - targetHeight);
        const drawX = -extraX / 2 - (target.imagePanX || 0) * (extraX / 2);
        const drawY = -extraY / 2 - (target.imagePanY || 0) * (extraY / 2);
        const scaleX = alpha.width / targetWidth;
        const scaleY = alpha.height / targetHeight;
        context.save();
        if (target.flipH || target.flipV) {
            context.translate(target.flipH ? alpha.width : 0, target.flipV ? alpha.height : 0);
            context.scale(target.flipH ? -1 : 1, target.flipV ? -1 : 1);
        }
        context.drawImage(source, drawX * scaleX, drawY * scaleY, drawWidth * scaleX, drawHeight * scaleY);
        context.restore();
        this._cloneBrushTargetAlphaCanvas = alpha;
        this._syncCloneBrushCoverageControls();
    },

    _syncCloneBrushCoverageControls() {
        const checkbox = document.getElementById('clone-brush-clip-target-alpha');
        const hint = document.getElementById('clone-brush-coverage-hint');
        if (checkbox) checkbox.checked = !!this._cloneBrushClipTargetAlpha;
        if (hint) {
            hint.textContent = this._cloneBrushClipTargetAlpha
                ? 'Paint is restricted to visible target pixels'
                : 'Full image bounds, including transparent areas';
        }
    },

    beginCloneBrushBoundaryPick() {
        if (!this._cloneBrushMode || !this._cloneBrushTarget) return;
        this._cloneBrushBoundaryMode = 'pick';
        this._cloneBrushBoundaryDrawing = false;
        this._cloneBrushPickSource = false;
        this._cloneBrushPickTarget = false;
        this._cloneBrushMaskMode = false;
        this._cloneBrushCursorPos = null;
        if (this.stage?.viewport) this.stage.viewport.style.cursor = 'crosshair';
        this._syncCloneBrushBoundaryControls();
        this._updateCloneBrushStatus();
        this.stage.requestRender();
    },

    beginCloneBrushBoundaryDraw() {
        if (!this._cloneBrushMode || !this._cloneBrushTarget || !this._cloneBrushCanvas) return;
        this._cloneBrushBoundaryMode = 'draw';
        this._cloneBrushBoundaryDrawing = false;
        this._cloneBrushBoundaryPoints = [];
        this._cloneBrushBoundaryObject = null;
        this._cloneBrushBoundaryCanvas = null;
        this._cloneBrushBoundaryPointerStart = null;
        this._cloneBrushBoundaryDragged = false;
        this._cloneBrushPickSource = false;
        this._cloneBrushPickTarget = false;
        this._cloneBrushMaskMode = false;
        this._cloneBrushCursorPos = null;
        if (this.stage?.viewport) this.stage.viewport.style.cursor = 'crosshair';
        this._syncCloneBrushBoundaryControls();
        this._updateCloneBrushStatus();
        this.stage.requestRender();
    },

    clearCloneBrushBoundary() {
        this._cloneBrushBoundaryMode = null;
        this._cloneBrushBoundaryDrawing = false;
        this._cloneBrushBoundaryPoints = [];
        this._cloneBrushBoundaryObject = null;
        this._cloneBrushBoundaryCanvas = null;
        this._cloneBrushBoundaryPointerStart = null;
        this._cloneBrushBoundaryDragged = false;
        if (this.stage?.viewport && this._cloneBrushMode) this.stage.viewport.style.cursor = 'none';
        this._syncCloneBrushBoundaryControls();
        this._updateCloneBrushStatus();
        this.stage.requestRender();
    },

    _findCloneBrushBoundaryAt(pos) {
        const excludedTypes = new Set(['image', 'text', 'audio', 'video', 'line', 'arrow', 'doubleArrow', 'curvedArrow']);
        for (let index = this.objects.length - 1; index >= 0; index--) {
            const obj = this.objects[index];
            if (!obj || obj.visible === false || obj === this._cloneBrushLayer || obj === this._cloneBrushTarget) continue;
            if (excludedTypes.has(obj.type)) continue;
            if (obj.type === 'freeform' && obj.closedPath === false) continue;
            if (obj.containsPoint?.(pos.x, pos.y)) return obj;
        }
        return null;
    },

    _setCloneBrushBoundaryObject(obj) {
        if (!obj) {
            Utils.showToast('Click a filled shape or closed path over the target image', 'warning');
            return false;
        }
        this._cloneBrushBoundaryObject = obj;
        this._cloneBrushBoundaryPoints = [];
        this._cloneBrushBoundaryMode = null;
        this._cloneBrushBoundaryDrawing = false;
        this._buildCloneBrushBoundaryCanvas();
        if (!this._cloneBrushBoundaryCanvas) {
            this._cloneBrushBoundaryObject = null;
            Utils.showToast('That object cannot be used as a paint boundary', 'warning');
            return false;
        }
        if (this.stage?.viewport) this.stage.viewport.style.cursor = 'none';
        this._syncCloneBrushBoundaryControls();
        this._updateCloneBrushStatus();
        Utils.showToast(`Target boundary set from ${obj.name || 'shape'}`, 'success');
        this.stage.requestRender();
        return true;
    },

    _getCloneBrushStageToTargetTransform() {
        const target = this._cloneBrushTarget;
        const canvas = this._cloneBrushCanvas;
        if (!target || !canvas) return null;
        const origin = this._cloneBrushObjectPoint(target, canvas, { x: 0, y: 0 }, true);
        const unitX = this._cloneBrushObjectPoint(target, canvas, { x: 1, y: 0 }, true);
        const unitY = this._cloneBrushObjectPoint(target, canvas, { x: 0, y: 1 }, true);
        if (!origin || !unitX || !unitY) return null;
        return {
            a: unitX.x - origin.x,
            b: unitX.y - origin.y,
            c: unitY.x - origin.x,
            d: unitY.y - origin.y,
            e: origin.x,
            f: origin.y
        };
    },

    _renderCloneBrushBoundaryObject(context, obj) {
        if (!context || !obj?.render) return false;
        const transform = this._getCloneBrushStageToTargetTransform();
        if (!transform) return false;
        const original = {
            fillType: obj.fillType,
            fill: obj.fill,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            shadow: obj.shadow,
            glowEnabled: obj.glowEnabled,
            opacity: obj.opacity
        };
        try {
            obj.fillType = 'solid';
            obj.fill = '#ffffff';
            obj.stroke = 'transparent';
            obj.strokeWidth = 0;
            obj.shadow = false;
            obj.glowEnabled = false;
            obj.opacity = 1;
            context.save();
            context.setTransform(transform.a, transform.b, transform.c, transform.d, transform.e, transform.f);
            obj.render(context);
            context.restore();
            return true;
        } catch (_) {
            try { context.restore(); } catch (_) {}
            return false;
        } finally {
            Object.assign(obj, original);
        }
    },

    _buildCloneBrushBoundaryCanvas() {
        const targetCanvas = this._cloneBrushCanvas;
        const object = this._cloneBrushBoundaryObject;
        const points = this._cloneBrushBoundaryPoints;
        if (!targetCanvas || (!object && (!Array.isArray(points) || points.length < 3))) {
            this._cloneBrushBoundaryCanvas = null;
            this._syncCloneBrushBoundaryControls();
            return;
        }

        const raw = document.createElement('canvas');
        raw.width = targetCanvas.width;
        raw.height = targetCanvas.height;
        const context = raw.getContext('2d', { willReadFrequently: true });
        if (this._cloneBrushBoundaryInverted) {
            context.fillStyle = '#fff';
            context.fillRect(0, 0, raw.width, raw.height);
            context.globalCompositeOperation = 'destination-out';
        } else {
            context.fillStyle = '#fff';
        }

        let rendered = false;
        if (object) {
            rendered = this._renderCloneBrushBoundaryObject(context, object);
        } else {
            const mapped = points.map(point => this._cloneBrushObjectPoint(this._cloneBrushTarget, targetCanvas, point, true));
            if (mapped.length >= 3 && mapped.every(Boolean)) {
                context.beginPath();
                context.moveTo(mapped[0].x, mapped[0].y);
                for (let index = 1; index < mapped.length; index++) context.lineTo(mapped[index].x, mapped[index].y);
                context.closePath();
                context.fill();
                rendered = true;
            }
        }
        context.globalCompositeOperation = 'source-over';
        if (!rendered) {
            this._cloneBrushBoundaryCanvas = null;
            this._syncCloneBrushBoundaryControls();
            return;
        }

        const mask = document.createElement('canvas');
        mask.width = raw.width;
        mask.height = raw.height;
        const maskContext = mask.getContext('2d', { willReadFrequently: true });
        const pixelsPerStage = ((raw.width / Math.max(1, this._cloneBrushTarget.width))
            + (raw.height / Math.max(1, this._cloneBrushTarget.height))) / 2;
        const feather = Math.max(0, Number(this._cloneBrushBoundaryFeather) || 0) * pixelsPerStage;
        if (feather > 0.1) maskContext.filter = `blur(${Math.min(80, feather)}px)`;
        maskContext.drawImage(raw, 0, 0);
        maskContext.filter = 'none';
        this._cloneBrushBoundaryCanvas = mask;
        this._syncCloneBrushBoundaryControls();
    },

    _syncCloneBrushBoundaryControls() {
        const pick = document.getElementById('btn-clone-brush-pick-boundary');
        const draw = document.getElementById('btn-clone-brush-draw-boundary');
        const clear = document.getElementById('btn-clone-brush-clear-boundary');
        const invert = document.getElementById('clone-brush-invert-boundary');
        const hint = document.getElementById('clone-brush-boundary-hint');
        pick?.classList.toggle('active', this._cloneBrushBoundaryMode === 'pick');
        draw?.classList.toggle('active', this._cloneBrushBoundaryMode === 'draw');
        if (clear) clear.disabled = !this._cloneBrushBoundaryCanvas && !this._cloneBrushBoundaryMode;
        if (invert) invert.checked = !!this._cloneBrushBoundaryInverted;
        if (hint) {
            if (this._cloneBrushBoundaryMode === 'pick') hint.textContent = 'Click an existing filled shape or closed path on the stage.';
            else if (this._cloneBrushBoundaryMode === 'draw') hint.textContent = 'Click points or drag a boundary; double-click or return to the first point to close it.';
            else if (this._cloneBrushBoundaryCanvas) {
                const name = this._cloneBrushBoundaryObject?.name || 'drawn boundary';
                hint.textContent = `Painting is restricted ${this._cloneBrushBoundaryInverted ? 'outside' : 'inside'} ${name}.`;
            } else hint.textContent = 'No boundary selected; paint may cover the full target area.';
        }
    },

    _handleCloneBrushBoundaryMouseDown(pos) {
        if (this._cloneBrushBoundaryMode === 'pick') {
            this._setCloneBrushBoundaryObject(this._findCloneBrushBoundaryAt(pos));
            return;
        }
        if (this._cloneBrushBoundaryMode !== 'draw') return;
        const targetPoint = this._cloneBrushObjectPoint(this._cloneBrushTarget, this._cloneBrushCanvas, pos, true);
        if (!targetPoint?.inside) {
            Utils.showToast('Start the boundary inside the target image', 'warning');
            return;
        }
        const first = this._cloneBrushBoundaryPoints[0];
        if (first && this._cloneBrushBoundaryPoints.length >= 3 && Math.hypot(pos.x - first.x, pos.y - first.y) <= 10) {
            this._finishCloneBrushBoundarySelection();
            return;
        }
        this._cloneBrushBoundaryDrawing = true;
        this._cloneBrushBoundaryPointerStart = { x: pos.x, y: pos.y };
        this._cloneBrushBoundaryDragged = false;
        this._cloneBrushBoundaryPoints.push({ x: pos.x, y: pos.y });
        this.stage.requestRender();
    },

    _handleCloneBrushBoundaryMouseMove(pos) {
        if (this._cloneBrushBoundaryMode !== 'draw' || !this._cloneBrushBoundaryDrawing) return;
        if (this._cloneBrushBoundaryPointerStart
            && Math.hypot(pos.x - this._cloneBrushBoundaryPointerStart.x, pos.y - this._cloneBrushBoundaryPointerStart.y) > 3) {
            this._cloneBrushBoundaryDragged = true;
        }
        const targetPoint = this._cloneBrushObjectPoint(this._cloneBrushTarget, this._cloneBrushCanvas, pos, true);
        if (!targetPoint?.inside) return;
        const previous = this._cloneBrushBoundaryPoints[this._cloneBrushBoundaryPoints.length - 1];
        if (!previous || Math.hypot(pos.x - previous.x, pos.y - previous.y) >= 2) {
            this._cloneBrushBoundaryPoints.push({ x: pos.x, y: pos.y });
            this.stage.requestRender();
        }
    },

    _handleCloneBrushBoundaryMouseUp() {
        if (this._cloneBrushBoundaryMode !== 'draw' || !this._cloneBrushBoundaryDrawing) return;
        this._cloneBrushBoundaryDrawing = false;
        const dragged = this._cloneBrushBoundaryDragged;
        this._cloneBrushBoundaryPointerStart = null;
        this._cloneBrushBoundaryDragged = false;
        if (dragged) this._finishCloneBrushBoundarySelection();
        else {
            this._updateCloneBrushStatus();
            this.stage.requestRender();
        }
    },

    _finishCloneBrushBoundarySelection() {
        if (!Array.isArray(this._cloneBrushBoundaryPoints) || this._cloneBrushBoundaryPoints.length < 3) {
            Utils.showToast('Add at least three boundary points', 'warning');
            return false;
        }
        this._cloneBrushBoundaryMode = null;
        this._cloneBrushBoundaryDrawing = false;
        this._cloneBrushBoundaryPointerStart = null;
        this._cloneBrushBoundaryDragged = false;
        this._cloneBrushBoundaryObject = null;
        this._buildCloneBrushBoundaryCanvas();
        if (!this._cloneBrushBoundaryCanvas) return false;
        if (this.stage?.viewport) this.stage.viewport.style.cursor = 'none';
        this._syncCloneBrushBoundaryControls();
        this._updateCloneBrushStatus();
        Utils.showToast('Target paint boundary ready', 'success');
        this.stage.requestRender();
        return true;
    },

    _pushCloneBrushUndo() {
        if (!this._cloneBrushCtx || !this._cloneBrushCanvas) return;
        this._cloneBrushUndo.push(this._cloneBrushCtx.getImageData(0, 0, this._cloneBrushCanvas.width, this._cloneBrushCanvas.height));
        if (this._cloneBrushUndo.length > 8) this._cloneBrushUndo.shift();
        this._cloneBrushRedo = [];
        this._syncCloneBrushUndoButtons();
    },

    _syncCloneBrushUndoButtons() {
        const undo = document.getElementById('btn-clone-brush-undo');
        const redo = document.getElementById('btn-clone-brush-redo');
        if (undo) undo.disabled = !this._cloneBrushUndo.length;
        if (redo) redo.disabled = !this._cloneBrushRedo.length;
    },

    undoCloneBrushStroke() {
        if (!this._cloneBrushCtx || !this._cloneBrushUndo.length) return;
        this._cloneBrushRedo.push(this._cloneBrushCtx.getImageData(0, 0, this._cloneBrushCanvas.width, this._cloneBrushCanvas.height));
        this._cloneBrushCtx.putImageData(this._cloneBrushUndo.pop(), 0, 0);
        this._syncCloneBrushUndoButtons();
        this.stage.requestRender();
    },

    redoCloneBrushStroke() {
        if (!this._cloneBrushCtx || !this._cloneBrushRedo.length) return;
        this._cloneBrushUndo.push(this._cloneBrushCtx.getImageData(0, 0, this._cloneBrushCanvas.width, this._cloneBrushCanvas.height));
        this._cloneBrushCtx.putImageData(this._cloneBrushRedo.pop(), 0, 0);
        this._syncCloneBrushUndoButtons();
        this.stage.requestRender();
    },

    clearCloneBrushLayer() {
        if (!this._cloneBrushCtx || !this._cloneBrushCanvas) return;
        this._pushCloneBrushUndo();
        this._cloneBrushCtx.clearRect(0, 0, this._cloneBrushCanvas.width, this._cloneBrushCanvas.height);
        this.stage.requestRender();
    },

    _cloneBrushSourceForTargetPoint(targetPoint, anchor) {
        const sample = this._cloneBrushSourcePoint;
        if (!sample || !anchor) return null;
        return {
            x: sample.x + (targetPoint.localX - anchor.localX) * sample.pixelsPerStageX,
            y: sample.y + (targetPoint.localY - anchor.localY) * sample.pixelsPerStageY
        };
    },

    _cloneBrushDab(targetPoint, sourcePoint) {
        if (!this._cloneBrushCtx || !this._cloneBrushCanvas || !this._cloneBrushSourceCanvas || !targetPoint || !sourcePoint) return;
        this._cloneBrushLiveSourcePos = this._cloneBrushImagePointToStage(
            this._cloneBrushSource,
            this._cloneBrushSourceCanvas,
            sourcePoint
        );
        const destRadiusX = Math.max(1, (this._cloneBrushSize / 2) * (this._cloneBrushCanvas.width / Math.max(1, this._cloneBrushTarget.width)));
        const destRadiusY = Math.max(1, (this._cloneBrushSize / 2) * (this._cloneBrushCanvas.height / Math.max(1, this._cloneBrushTarget.height)));
        const patchWidth = Math.max(2, Math.ceil(destRadiusX * 2));
        const patchHeight = Math.max(2, Math.ceil(destRadiusY * 2));
        const sourceRadiusX = Math.max(1, (this._cloneBrushSize / 2) * this._cloneBrushSourcePoint.pixelsPerStageX);
        const sourceRadiusY = Math.max(1, (this._cloneBrushSize / 2) * this._cloneBrushSourcePoint.pixelsPerStageY);
        const patch = document.createElement('canvas');
        patch.width = patchWidth;
        patch.height = patchHeight;
        const patchCtx = patch.getContext('2d', { willReadFrequently: true });
        const reusableTexture = this._cloneBrushMaskTextureCanvas;
        if (reusableTexture) {
            const scale = Math.min(patchWidth / reusableTexture.width, patchHeight / reusableTexture.height);
            const drawWidth = Math.max(1, reusableTexture.width * scale);
            const drawHeight = Math.max(1, reusableTexture.height * scale);
            patchCtx.drawImage(
                reusableTexture,
                (patchWidth - drawWidth) / 2,
                (patchHeight - drawHeight) / 2,
                drawWidth,
                drawHeight
            );
        } else {
            patchCtx.drawImage(
                this._cloneBrushSourceCanvas,
                sourcePoint.x - sourceRadiusX,
                sourcePoint.y - sourceRadiusY,
                sourceRadiusX * 2,
                sourceRadiusY * 2,
                0,
                0,
                patchWidth,
                patchHeight
            );
        }
        patchCtx.globalCompositeOperation = 'destination-in';
        const hardness = Math.max(0, Math.min(1, this._cloneBrushHardness / 100));
        const gradient = patchCtx.createRadialGradient(patchWidth / 2, patchHeight / 2, 0, patchWidth / 2, patchHeight / 2, Math.max(patchWidth, patchHeight) / 2);
        gradient.addColorStop(0, '#fff');
        gradient.addColorStop(Math.min(0.99, hardness), '#fff');
        gradient.addColorStop(1, 'rgba(255,255,255,0)');
        patchCtx.fillStyle = gradient;
        patchCtx.fillRect(0, 0, patchWidth, patchHeight);
        patchCtx.globalCompositeOperation = 'source-over';
        if (this._cloneBrushClipTargetAlpha && this._cloneBrushTargetAlphaCanvas) {
            patchCtx.globalCompositeOperation = 'destination-in';
            patchCtx.drawImage(
                this._cloneBrushTargetAlphaCanvas,
                targetPoint.x - destRadiusX,
                targetPoint.y - destRadiusY,
                destRadiusX * 2,
                destRadiusY * 2,
                0,
                0,
                patchWidth,
                patchHeight
            );
            patchCtx.globalCompositeOperation = 'source-over';
        }
        if (this._cloneBrushBoundaryCanvas) {
            patchCtx.globalCompositeOperation = 'destination-in';
            patchCtx.drawImage(
                this._cloneBrushBoundaryCanvas,
                targetPoint.x - destRadiusX,
                targetPoint.y - destRadiusY,
                destRadiusX * 2,
                destRadiusY * 2,
                0,
                0,
                patchWidth,
                patchHeight
            );
            patchCtx.globalCompositeOperation = 'source-over';
        }
        this._cloneBrushCtx.save();
        this._cloneBrushCtx.globalAlpha = Math.max(0.01, Math.min(1, this._cloneBrushOpacity / 100));
        this._cloneBrushCtx.drawImage(patch, targetPoint.x - patchWidth / 2, targetPoint.y - patchHeight / 2);
        this._cloneBrushCtx.restore();
    },

    _cloneBrushStroke(from, to, anchor) {
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const distance = Math.hypot(dx, dy);
        const radius = Math.max(1, (this._cloneBrushSize / 2) * (this._cloneBrushCanvas.width / Math.max(1, this._cloneBrushTarget.width)));
        const step = Math.max(1, radius * 2 * Math.max(0.05, this._cloneBrushSpacing / 100));
        const count = Math.max(1, Math.ceil(distance / step));
        for (let index = 1; index <= count; index++) {
            const ratio = index / count;
            const targetPoint = {
                x: from.x + dx * ratio,
                y: from.y + dy * ratio,
                localX: from.localX + (to.localX - from.localX) * ratio,
                localY: from.localY + (to.localY - from.localY) * ratio
            };
            this._cloneBrushDab(targetPoint, this._cloneBrushSourceForTargetPoint(targetPoint, anchor));
        }
    },

    beginCloneBrushMaskSelection() {
        if (!this._cloneBrushMode || !this._cloneBrushSource || !this._cloneBrushSourceCanvas) {
            Utils.showToast('Choose a loaded clone source first', 'warning');
            return;
        }
        if (this._cloneBrushMaskMode) {
            this.clearCloneBrushMask();
            Utils.showToast('Source area selection cancelled', 'info');
            return;
        }
        this._cloneBrushMaskMode = true;
        this._cloneBrushBoundaryMode = null;
        this._cloneBrushMaskDrawing = false;
        this._cloneBrushMaskPoints = [];
        this._cloneBrushMaskCanvas = null;
        this._cloneBrushMaskTextureCanvas = null;
        this._cloneBrushMaskTextureCache = null;
        this._cloneBrushMaskBounds = null;
        this._cloneBrushMaskPointerStart = null;
        this._cloneBrushMaskDragged = false;
        this._cloneBrushCursorPos = null;
        this._cloneBrushPickSource = false;
        this._cloneBrushPickTarget = false;
        document.getElementById('btn-clone-brush-select-mask')?.classList.add('active');
        if (this.stage?.viewport) this.stage.viewport.style.cursor = 'crosshair';
        this._updateCloneBrushStatus();
        this.stage.requestRender();
    },

    clearCloneBrushMask() {
        this._cloneBrushMaskMode = false;
        this._cloneBrushMaskDrawing = false;
        this._cloneBrushMaskPoints = [];
        this._cloneBrushMaskCanvas = null;
        this._cloneBrushMaskTextureCanvas = null;
        this._cloneBrushMaskTextureCache = null;
        this._cloneBrushMaskBounds = null;
        this._cloneBrushMaskPointerStart = null;
        this._cloneBrushMaskDragged = false;
        document.getElementById('btn-clone-brush-select-mask')?.classList.remove('active');
        if (this.stage?.viewport && this._cloneBrushMode) this.stage.viewport.style.cursor = 'none';
        this._updateCloneBrushStatus();
        this.stage.requestRender();
    },

    _buildCloneBrushMaskCanvas() {
        const source = this._cloneBrushSourceCanvas;
        const points = this._cloneBrushMaskPoints;
        if (!source || !Array.isArray(points) || points.length < 3) {
            this._cloneBrushMaskCanvas = null;
            this._cloneBrushMaskTextureCanvas = null;
            this._cloneBrushMaskTextureCache = null;
            this._cloneBrushMaskBounds = null;
            this._syncCloneBrushMaskControls();
            return;
        }
        const raw = document.createElement('canvas');
        raw.width = source.width;
        raw.height = source.height;
        const rawCtx = raw.getContext('2d', { willReadFrequently: true });
        if (this._cloneBrushMaskInverted) {
            rawCtx.fillStyle = '#fff';
            rawCtx.fillRect(0, 0, raw.width, raw.height);
            rawCtx.globalCompositeOperation = 'destination-out';
        } else {
            rawCtx.fillStyle = '#fff';
        }
        rawCtx.beginPath();
        rawCtx.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index++) rawCtx.lineTo(points[index].x, points[index].y);
        rawCtx.closePath();
        rawCtx.fill();
        rawCtx.globalCompositeOperation = 'source-over';

        const mask = document.createElement('canvas');
        mask.width = source.width;
        mask.height = source.height;
        const maskCtx = mask.getContext('2d', { willReadFrequently: true });
        const scale = ((this._cloneBrushSourcePoint?.pixelsPerStageX || 1) + (this._cloneBrushSourcePoint?.pixelsPerStageY || 1)) / 2;
        const feather = Math.max(0, this._cloneBrushMaskFeather || 0) * scale;
        if (feather > 0.1) maskCtx.filter = `blur(${Math.min(80, feather)}px)`;
        maskCtx.drawImage(raw, 0, 0);
        maskCtx.filter = 'none';
        this._cloneBrushMaskCanvas = mask;
        this._buildCloneBrushMaskTexture();
        this._syncCloneBrushMaskControls();
    },

    _buildCloneBrushMaskTexture() {
        const source = this._cloneBrushSourceCanvas;
        const mask = this._cloneBrushMaskCanvas;
        if (!source || !mask) {
            this._cloneBrushMaskTextureCanvas = null;
            this._cloneBrushMaskTextureCache = null;
            this._cloneBrushMaskBounds = null;
            return;
        }
        let left = 0;
        let top = 0;
        let right = source.width;
        let bottom = source.height;
        if (!this._cloneBrushMaskInverted && this._cloneBrushMaskPoints.length) {
            const featherPixels = Math.ceil(Math.max(0, this._cloneBrushMaskFeather || 0)
                * Math.max(this._cloneBrushSourcePoint?.pixelsPerStageX || 1, this._cloneBrushSourcePoint?.pixelsPerStageY || 1) * 2);
            left = Math.max(0, Math.floor(Math.min(...this._cloneBrushMaskPoints.map(point => point.x)) - featherPixels));
            top = Math.max(0, Math.floor(Math.min(...this._cloneBrushMaskPoints.map(point => point.y)) - featherPixels));
            right = Math.min(source.width, Math.ceil(Math.max(...this._cloneBrushMaskPoints.map(point => point.x)) + featherPixels));
            bottom = Math.min(source.height, Math.ceil(Math.max(...this._cloneBrushMaskPoints.map(point => point.y)) + featherPixels));
        }
        const width = Math.max(1, right - left);
        const height = Math.max(1, bottom - top);
        const texture = document.createElement('canvas');
        texture.width = width;
        texture.height = height;
        const context = texture.getContext('2d', { willReadFrequently: true });
        context.drawImage(source, left, top, width, height, 0, 0, width, height);
        context.globalCompositeOperation = 'destination-in';
        context.drawImage(mask, left, top, width, height, 0, 0, width, height);
        context.globalCompositeOperation = 'source-over';
        this._cloneBrushMaskBounds = { x: left, y: top, width, height };
        this._cloneBrushMaskTextureCanvas = texture;
        this._cloneBrushMaskTextureCache = null;
    },

    _getCloneBrushMaskTextureForTarget() {
        const texture = this._cloneBrushMaskTextureCanvas;
        const target = this._cloneBrushTarget;
        const sourcePoint = this._cloneBrushSourcePoint;
        if (!texture || !target || !sourcePoint || !this._cloneBrushCanvas) return null;
        const targetScaleX = this._cloneBrushCanvas.width / Math.max(1, target.width);
        const targetScaleY = this._cloneBrushCanvas.height / Math.max(1, target.height);
        const width = Math.max(1, Math.round((texture.width / Math.max(0.0001, sourcePoint.pixelsPerStageX)) * targetScaleX));
        const height = Math.max(1, Math.round((texture.height / Math.max(0.0001, sourcePoint.pixelsPerStageY)) * targetScaleY));
        const cache = this._cloneBrushMaskTextureCache;
        if (cache?.source === texture && cache.width === width && cache.height === height) return cache.canvas;
        const scaled = document.createElement('canvas');
        scaled.width = Math.min(4096, width);
        scaled.height = Math.min(4096, height);
        scaled.getContext('2d', { willReadFrequently: true }).drawImage(texture, 0, 0, scaled.width, scaled.height);
        this._cloneBrushMaskTextureCache = { source: texture, width, height, canvas: scaled };
        return scaled;
    },

    _syncCloneBrushMaskControls() {
        const select = document.getElementById('btn-clone-brush-select-mask');
        const clear = document.getElementById('btn-clone-brush-clear-mask');
        select?.classList.toggle('active', !!this._cloneBrushMaskMode);
        if (clear) clear.disabled = !this._cloneBrushMaskCanvas;
    },

    _handleCloneBrushMaskMouseDown(pos) {
        const found = this._findCloneBrushImageAt(pos);
        if (!found || found.obj !== this._cloneBrushSource) {
            Utils.showToast('Start the selection inside the current source image', 'warning');
            return;
        }
        const point = { x: found.point.x, y: found.point.y };
        const first = this._cloneBrushMaskPoints[0];
        const closeDistance = Math.max(5, ((found.point.pixelsPerStageX + found.point.pixelsPerStageY) / 2) * 8);
        if (first && this._cloneBrushMaskPoints.length >= 3
            && Math.hypot(point.x - first.x, point.y - first.y) <= closeDistance) {
            this._finishCloneBrushMaskSelection();
            return;
        }
        this._cloneBrushMaskDrawing = true;
        this._cloneBrushMaskPointerStart = { x: pos.x, y: pos.y };
        this._cloneBrushMaskDragged = false;
        this._cloneBrushMaskPoints.push(point);
        this.stage.requestRender();
    },

    _handleCloneBrushMaskMouseMove(pos) {
        if (!this._cloneBrushMaskDrawing) return;
        if (this._cloneBrushMaskPointerStart
            && Math.hypot(pos.x - this._cloneBrushMaskPointerStart.x, pos.y - this._cloneBrushMaskPointerStart.y) > 3) {
            this._cloneBrushMaskDragged = true;
        }
        const point = this._cloneBrushObjectPoint(this._cloneBrushSource, this._cloneBrushSourceCanvas, pos);
        if (!point?.inside) return;
        const previous = this._cloneBrushMaskPoints[this._cloneBrushMaskPoints.length - 1];
        const minimum = Math.max(1, ((point.pixelsPerStageX + point.pixelsPerStageY) / 2) * 2);
        if (!previous || Math.hypot(point.x - previous.x, point.y - previous.y) >= minimum) {
            this._cloneBrushMaskPoints.push({ x: point.x, y: point.y });
            this.stage.requestRender();
        }
    },

    _handleCloneBrushMaskMouseUp() {
        if (!this._cloneBrushMaskDrawing) return;
        this._cloneBrushMaskDrawing = false;
        const dragged = this._cloneBrushMaskDragged;
        this._cloneBrushMaskPointerStart = null;
        this._cloneBrushMaskDragged = false;
        if (!dragged) {
            this._updateCloneBrushStatus();
            this.stage.requestRender();
            return;
        }
        this._finishCloneBrushMaskSelection();
    },

    _finishCloneBrushMaskSelection() {
        if (this._cloneBrushMaskPoints.length < 3) {
            Utils.showToast('Add at least three points, or drag around the source area', 'warning');
            return false;
        }
        this._cloneBrushMaskDrawing = false;
        this._cloneBrushMaskPointerStart = null;
        this._cloneBrushMaskDragged = false;
        this._cloneBrushMaskMode = false;
        this._buildCloneBrushMaskCanvas();
        this._ensureCloneBrushSourcePointInsideMask();
        this._cloneBrushPickSource = false;
        this._cloneBrushPickTarget = true;
        this._cloneBrushCursorPos = null;
        document.getElementById('btn-clone-brush-select-mask')?.classList.remove('active');
        if (this.stage?.viewport) this.stage.viewport.style.cursor = 'none';
        this._updateCloneBrushStatus();
        Utils.showToast('Source area selected. Now click the image you want to paint.', 'success');
        this.stage.requestRender();
        return true;
    },

    _ensureCloneBrushSourcePointInsideMask() {
        const mask = this._cloneBrushMaskCanvas;
        if (!mask || !this._cloneBrushSource || !this._cloneBrushSourceCanvas) return false;
        const context = mask.getContext('2d', { willReadFrequently: true });
        const current = this._cloneBrushSourcePoint;
        if (current) {
            const x = Math.max(0, Math.min(mask.width - 1, Math.round(current.x)));
            const y = Math.max(0, Math.min(mask.height - 1, Math.round(current.y)));
            if (context.getImageData(x, y, 1, 1).data[3] > 32) return true;
        }

        const pixels = context.getImageData(0, 0, mask.width, mask.height).data;
        const preferredX = this._cloneBrushMaskInverted
            ? mask.width / 2
            : this._cloneBrushMaskPoints.reduce((sum, point) => sum + point.x, 0) / this._cloneBrushMaskPoints.length;
        const preferredY = this._cloneBrushMaskInverted
            ? mask.height / 2
            : this._cloneBrushMaskPoints.reduce((sum, point) => sum + point.y, 0) / this._cloneBrushMaskPoints.length;
        const step = Math.max(1, Math.ceil(Math.max(mask.width, mask.height) / 140));
        let best = null;
        for (let y = 0; y < mask.height; y += step) {
            for (let x = 0; x < mask.width; x += step) {
                const alpha = pixels[(y * mask.width + x) * 4 + 3];
                if (alpha <= 32) continue;
                const score = alpha * 100000 - Math.hypot(x - preferredX, y - preferredY);
                if (!best || score > best.score) best = { x, y, score };
            }
        }
        if (!best) return false;
        const stagePoint = this._cloneBrushImagePointToStage(this._cloneBrushSource, this._cloneBrushSourceCanvas, best);
        const objectPoint = this._cloneBrushObjectPoint(this._cloneBrushSource, this._cloneBrushSourceCanvas, stagePoint);
        if (!stagePoint || !objectPoint) return false;
        this._cloneBrushSourcePoint = { ...objectPoint, stageX: stagePoint.x, stageY: stagePoint.y };
        this._cloneBrushLiveSourcePos = { x: stagePoint.x, y: stagePoint.y };
        this._cloneBrushAlignedAnchor = null;
        return true;
    },

    _setCloneBrushSourceAt(pos, options = {}) {
        const found = this._findCloneBrushImageAt(pos);
        if (!found) {
            Utils.showToast('Click inside a loaded image to choose the clone source', 'warning');
            return false;
        }
        const sourceChanged = this._cloneBrushSource && this._cloneBrushSource.id !== found.obj.id;
        this._cloneBrushSource = found.obj;
        this._cloneBrushSourceCanvas = found.canvas;
        if (sourceChanged) {
            this._cloneBrushMaskPoints = [];
            this._cloneBrushMaskCanvas = null;
            this._cloneBrushMaskTextureCanvas = null;
            this._cloneBrushMaskTextureCache = null;
            this._cloneBrushMaskBounds = null;
            this._syncCloneBrushMaskControls();
        }
        this._cloneBrushSourcePoint = { ...found.point, stageX: pos.x, stageY: pos.y };
        this._cloneBrushLiveSourcePos = { x: pos.x, y: pos.y };
        this._cloneBrushAlignedAnchor = null;
        this._cloneBrushStrokeAnchor = null;
        this._cloneBrushPickSource = false;
        if (this._cloneBrushLayer?.cloneBrushLayer) this._cloneBrushLayer.cloneBrushLayer.sourceId = found.obj.id;
        this._updateCloneBrushStatus();
        Utils.showToast(
            options.reanchor
                ? `Clone source moved: ${found.obj.name || 'Image'}. Continue painting.`
                : `Clone source set: ${found.obj.name || 'Image'}`,
            'success'
        );
        this.stage.requestRender();
        return true;
    },

    _handleCloneBrushDoubleClick(pos, event) {
        event?.preventDefault?.();
        event?.stopPropagation?.();
        const now = Date.now();
        const accidental = (this._cloneBrushRecentStrokes || []).filter(stroke => (
            !stroke.moved
            && now - stroke.at < 900
            && Math.hypot(stroke.x - pos.x, stroke.y - pos.y) <= 10
        ));
        if (accidental.length) {
            const first = accidental[0];
            this._cloneBrushCtx?.putImageData(first.before, 0, 0);
            const snapshots = new Set(accidental.map(stroke => stroke.before));
            this._cloneBrushUndo = this._cloneBrushUndo.filter(snapshot => !snapshots.has(snapshot));
            this._cloneBrushRedo = [];
            this._syncCloneBrushUndoButtons();
        }
        this._cloneBrushRecentStrokes = [];
        this._cloneBrushDrawing = false;
        this._cloneBrushLastPoint = null;
        this._setCloneBrushSourceAt(pos, { reanchor: true });
    },

    _handleCloneBrushMouseDown(pos, event) {
        if (this._cloneBrushBoundaryMode) {
            this._handleCloneBrushBoundaryMouseDown(pos);
            return;
        }
        if (this._cloneBrushMaskMode) {
            this._handleCloneBrushMaskMouseDown(pos);
            return;
        }
        if (event?.altKey || this._cloneBrushPickSource || (!this._cloneBrushSourcePoint && !this._cloneBrushPickTarget)) {
            this._setCloneBrushSourceAt(pos);
            return;
        }
        if (this._cloneBrushPickTarget) {
            const found = this._findCloneBrushImageAt(pos);
            this._cloneBrushPickTarget = false;
            if (!found || !this._setCloneBrushTarget(found.obj)) {
                this._updateCloneBrushStatus();
                return;
            }
            this._updateCloneBrushStatus();
            this.stage.requestRender();
            return;
        }
        if (!this._cloneBrushSourcePoint) {
            Utils.showToast('Use Pick Source, then click the pixels to copy', 'warning');
            return;
        }
        const targetPoint = this._cloneBrushObjectPoint(this._cloneBrushTarget, this._cloneBrushCanvas, pos, true);
        if (!targetPoint?.inside) return;
        this._pushCloneBrushUndo();
        this._cloneBrushStrokeStartStage = { x: pos.x, y: pos.y };
        this._cloneBrushStrokeMoved = false;
        this._cloneBrushDrawing = true;
        this._cloneBrushStrokeAnchor = { localX: targetPoint.localX, localY: targetPoint.localY };
        if (this._cloneBrushAligned && !this._cloneBrushAlignedAnchor) {
            this._cloneBrushAlignedAnchor = { ...this._cloneBrushStrokeAnchor };
        }
        const anchor = this._cloneBrushAligned ? this._cloneBrushAlignedAnchor : this._cloneBrushStrokeAnchor;
        this._cloneBrushDab(targetPoint, this._cloneBrushSourceForTargetPoint(targetPoint, anchor));
        this._cloneBrushLastPoint = targetPoint;
        this.stage.requestRender();
    },

    _handleCloneBrushMouseMove(pos) {
        if (this._cloneBrushBoundaryMode) {
            this._handleCloneBrushBoundaryMouseMove(pos);
            return;
        }
        if (this._cloneBrushMaskMode) {
            this._handleCloneBrushMaskMouseMove(pos);
            return;
        }
        this._cloneBrushCursorPos = { x: pos.x, y: pos.y };
        const hoverPoint = this._cloneBrushObjectPoint(this._cloneBrushTarget, this._cloneBrushCanvas, pos, true);
        if (!this._cloneBrushDrawing && this._cloneBrushSourcePoint) {
            let sourcePoint = this._cloneBrushSourcePoint;
            if (hoverPoint?.inside && this._cloneBrushAligned && this._cloneBrushAlignedAnchor) {
                sourcePoint = this._cloneBrushSourceForTargetPoint(hoverPoint, this._cloneBrushAlignedAnchor) || sourcePoint;
            }
            this._cloneBrushLiveSourcePos = this._cloneBrushImagePointToStage(
                this._cloneBrushSource,
                this._cloneBrushSourceCanvas,
                sourcePoint
            );
        }
        if (this._cloneBrushDrawing) {
            const point = hoverPoint;
            if (point?.inside && this._cloneBrushLastPoint) {
                if (this._cloneBrushStrokeStartStage
                    && Math.hypot(pos.x - this._cloneBrushStrokeStartStage.x, pos.y - this._cloneBrushStrokeStartStage.y) > 3) {
                    this._cloneBrushStrokeMoved = true;
                }
                const anchor = this._cloneBrushAligned ? this._cloneBrushAlignedAnchor : this._cloneBrushStrokeAnchor;
                this._cloneBrushStroke(this._cloneBrushLastPoint, point, anchor);
                this._cloneBrushLastPoint = point;
            }
        }
        this.stage.requestRender();
    },

    _handleCloneBrushMouseUp(pos) {
        if (this._cloneBrushBoundaryMode) {
            this._handleCloneBrushBoundaryMouseUp();
            return;
        }
        if (this._cloneBrushMaskMode) {
            this._handleCloneBrushMaskMouseUp();
            return;
        }
        if (this._cloneBrushDrawing && this._cloneBrushStrokeStartStage && this._cloneBrushUndo.length) {
            this._cloneBrushRecentStrokes.push({
                at: Date.now(),
                x: pos?.x ?? this._cloneBrushStrokeStartStage.x,
                y: pos?.y ?? this._cloneBrushStrokeStartStage.y,
                moved: this._cloneBrushStrokeMoved,
                before: this._cloneBrushUndo[this._cloneBrushUndo.length - 1]
            });
            this._cloneBrushRecentStrokes = this._cloneBrushRecentStrokes.filter(stroke => Date.now() - stroke.at < 1000).slice(-2);
        }
        this._cloneBrushDrawing = false;
        this._cloneBrushLastPoint = null;
        this._cloneBrushStrokeAnchor = null;
        this._cloneBrushStrokeStartStage = null;
        this._cloneBrushStrokeMoved = false;
        this._syncCloneBrushUndoButtons();
    },

    _updateCloneBrushStatus() {
        const status = document.getElementById('clone-brush-status');
        if (!status) return;
        const sourceButton = document.getElementById('btn-clone-brush-pick-source');
        const targetButton = document.getElementById('btn-clone-brush-pick-target');
        sourceButton?.classList.toggle('active', !!this._cloneBrushPickSource);
        targetButton?.classList.toggle('active', !!this._cloneBrushPickTarget);
        if (this._cloneBrushPickSource) {
            status.textContent = 'Click the exact pixels you want to copy from any image.';
        } else if (this._cloneBrushBoundaryMode === 'pick') {
            status.textContent = 'Click an existing filled shape or closed path to use as the target paint boundary.';
        } else if (this._cloneBrushBoundaryMode === 'draw') {
            status.textContent = this._cloneBrushBoundaryPoints.length
                ? 'Continue the target boundary, then double-click or return to its first point to close it.'
                : 'Draw around the target area, or click points and double-click to finish.';
        } else if (this._cloneBrushMaskMode) {
            status.textContent = this._cloneBrushMaskPoints.length
                ? 'Continue clicking around the source, then double-click or click the first point to finish.'
                : 'Drag a lasso around the source, or click points and double-click to finish.';
        } else if (this._cloneBrushPickTarget) {
            status.textContent = this._cloneBrushMaskCanvas
                ? 'Source mask ready. Click the image you want to paint, then brush on it.'
                : 'Click an image to use as the paint target.';
        } else if (!this._cloneBrushSourcePoint) {
            status.textContent = 'Click an image to choose source pixels, or use Pick Source. Alt+click is also supported.';
        } else {
            const source = this._cloneBrushSource?.name || 'Source';
            const target = this._cloneBrushTarget?.name || 'Target';
            const mask = this._cloneBrushMaskCanvas ? ' Reusable source area active.' : '';
            const coverage = this._cloneBrushClipTargetAlpha ? ' Existing target pixels only.' : ' Full target bounds.';
            const boundary = this._cloneBrushBoundaryCanvas
                ? ` Target boundary: ${this._cloneBrushBoundaryInverted ? 'outside' : 'inside'}.`
                : '';
            status.textContent = `Ready: ${source} → ${target}.${mask}${coverage}${boundary} Paint on the target; double-click a new source point to continue seamlessly.`;
        }
        this._syncCloneBrushUndoButtons();
        this._syncCloneBrushMaskControls();
        this._syncCloneBrushCoverageControls();
        this._syncCloneBrushBoundaryControls();
    },

    // === Clone Part (shape/path-based pixel extraction) ===

    clonePartFromMask(options = {}) {
        const selected = this.getSelectedObjects().filter(obj => obj && obj.visible !== false);
        if (selected.length < 2) {
            Utils.showToast('Select a source object and a mask shape/path on top', 'warning');
            return;
        }

        const sorted = [...selected].sort((a, b) => this.objects.indexOf(a) - this.objects.indexOf(b));
        const source = sorted[0];
        const mask = sorted[sorted.length - 1];
        if (!source || !mask || source.id === mask.id) {
            Utils.showToast('Select a source object and a separate mask shape/path', 'warning');
            return;
        }
        if (source.locked) {
            Utils.showToast('Unlock the source object before cloning a part', 'warning');
            return;
        }
        if (source.type === 'image' && !source._eraserCanvas && !source.imageElement) {
            Utils.showToast('Wait for the source image to load before cloning a part', 'warning');
            return;
        }

        eventBus.emit('history:flush');

        const PAD = 4;
        const scale = Math.max(1, Math.min(3, window.devicePixelRatio || 2));
        const bounds = source.getBounds();
        const cw = Math.ceil(bounds.width + PAD * 2) * scale;
        const ch = Math.ceil(bounds.height + PAD * 2) * scale;
        if (cw <= 0 || ch <= 0 || cw > 4096 || ch > 4096) {
            Utils.showToast('Source object too large to clone part safely', 'warning');
            return;
        }

        const sourceCanvas = document.createElement('canvas');
        sourceCanvas.width = cw;
        sourceCanvas.height = ch;
        const sourceCtx = sourceCanvas.getContext('2d', { willReadFrequently: true });
        sourceCtx.save();
        sourceCtx.scale(scale, scale);
        sourceCtx.translate(-bounds.x + PAD, -bounds.y + PAD);
        source.render(sourceCtx);
        sourceCtx.restore();

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = cw;
        maskCanvas.height = ch;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        maskCtx.save();
        maskCtx.scale(scale, scale);
        maskCtx.translate(-bounds.x + PAD, -bounds.y + PAD);
        this._renderClonePartMask(maskCtx, mask);
        maskCtx.restore();
        this._solidifyClonePartMask(maskCanvas);

        const partCanvas = document.createElement('canvas');
        partCanvas.width = cw;
        partCanvas.height = ch;
        const partCtx = partCanvas.getContext('2d', { willReadFrequently: true });
        partCtx.drawImage(sourceCanvas, 0, 0);
        partCtx.globalCompositeOperation = 'destination-in';
        partCtx.drawImage(maskCanvas, 0, 0);
        partCtx.globalCompositeOperation = 'source-over';

        const trim = this._getCanvasOpaqueBounds(partCanvas);
        if (!trim) {
            Utils.showToast('No visible source pixels found inside the mask', 'warning');
            return;
        }

        const trimmed = document.createElement('canvas');
        trimmed.width = trim.width;
        trimmed.height = trim.height;
        trimmed.getContext('2d').drawImage(partCanvas, trim.x, trim.y, trim.width, trim.height, 0, 0, trim.width, trim.height);

        const partSrc = trimmed.toDataURL('image/png');
        const partObj = new StageObject('image', {
            x: bounds.x - PAD + trim.x / scale,
            y: bounds.y - PAD + trim.y / scale,
            width: trim.width / scale,
            height: trim.height / scale,
            imageSrc: partSrc,
            name: `${source.name || 'Object'} part`
        });
        this.addObject(partObj);

        const sourceIdx = this.objects.indexOf(source);
        const partIdx = this.objects.indexOf(partObj);
        const insertAt = Math.min(Math.max(0, sourceIdx + 1), this.objects.length - 1);
        if (partIdx !== insertAt) {
            this.objects.splice(partIdx, 1);
            this.objects.splice(insertAt, 0, partObj);
        }

        if (options.removeFromSource) {
            this._removeClonePartFromSource(source, sourceCanvas, maskCanvas, bounds, PAD, scale);
        }

        this.select([partObj.id]);
        this.updateObjectList();
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(options.removeFromSource ? 'Part cloned and removed from source' : 'Part cloned', 'success');
    },

    _removeClonePartFromSource(source, sourceCanvas, maskCanvas, bounds, PAD, scale) {
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = sourceCanvas.width;
        resultCanvas.height = sourceCanvas.height;
        const resultCtx = resultCanvas.getContext('2d', { willReadFrequently: true });
        resultCtx.drawImage(sourceCanvas, 0, 0);
        resultCtx.globalCompositeOperation = 'destination-out';
        resultCtx.drawImage(maskCanvas, 0, 0);
        resultCtx.globalCompositeOperation = 'source-over';

        const newSrc = resultCanvas.toDataURL('image/png');
        source.type = 'image';
        source.x = bounds.x - PAD;
        source.y = bounds.y - PAD;
        source.width = sourceCanvas.width / scale;
        source.height = sourceCanvas.height / scale;
        source.rotation = 0;
        source.pathPoints = [];
        source.text = '';
        source.iconPath = null;
        source.imageSrc = newSrc;
        source.loadImage(newSrc);
        source.name = `${source.name || 'Object'} (extracted)`;
    },

    _renderClonePartMask(ctx, mask) {
        if (Array.isArray(mask.pathPoints) && mask.pathPoints.length >= 3) {
            ctx.save();
            if (mask.rotation) {
                const pivot = mask.getPivotPoint ? mask.getPivotPoint() : {
                    x: mask.x + (mask.width || 0) / 2,
                    y: mask.y + (mask.height || 0) / 2
                };
                ctx.translate(pivot.x, pivot.y);
                ctx.rotate(Utils.degToRad(mask.rotation || 0));
                ctx.translate(-pivot.x, -pivot.y);
            }
            ctx.globalAlpha = 1;
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(mask.pathPoints[0].x, mask.pathPoints[0].y);
            if (mask.type === 'freeform' || mask.type === 'scribble') {
                for (let i = 1; i < mask.pathPoints.length - 1; i++) {
                    const next = mask.pathPoints[i + 1];
                    const cx = (mask.pathPoints[i].x + next.x) / 2;
                    const cy = (mask.pathPoints[i].y + next.y) / 2;
                    ctx.quadraticCurveTo(mask.pathPoints[i].x, mask.pathPoints[i].y, cx, cy);
                }
                const last = mask.pathPoints[mask.pathPoints.length - 1];
                ctx.lineTo(last.x, last.y);
            } else {
                for (let i = 1; i < mask.pathPoints.length; i++) {
                    ctx.lineTo(mask.pathPoints[i].x, mask.pathPoints[i].y);
                }
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            return;
        }

        const orig = {
            fillType: mask.fillType,
            fill: mask.fill,
            opacity: mask.opacity,
            stroke: mask.stroke,
            strokeWidth: mask.strokeWidth,
            visible: mask.visible
        };
        try {
            mask.visible = true;
            mask.opacity = 1;
            mask.fillType = 'solid';
            mask.fill = '#ffffff';
            mask.stroke = 'transparent';
            mask.strokeWidth = 0;
            mask.render(ctx);
        } finally {
            mask.fillType = orig.fillType;
            mask.fill = orig.fill;
            mask.opacity = orig.opacity;
            mask.stroke = orig.stroke;
            mask.strokeWidth = orig.strokeWidth;
            mask.visible = orig.visible;
        }
    },

    _solidifyClonePartMask(maskCanvas) {
        const ctx = maskCanvas.getContext('2d', { willReadFrequently: true });
        const id = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 0) {
                d[i] = 255;
                d[i + 1] = 255;
                d[i + 2] = 255;
                d[i + 3] = 255;
            }
        }
        ctx.putImageData(id, 0, 0);
    },

    _getCanvasOpaqueBounds(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        let minX = canvas.width, minY = canvas.height, maxX = -1, maxY = -1;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                if (data[(y * canvas.width + x) * 4 + 3] <= 0) continue;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        if (maxX < minX || maxY < minY) return null;
        return { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 };
    },

    // === Object Eraser Mode (shape-based erasing) ===

    enterObjectEraserMode() {
        const selected = this.getSelectedObjects();
        if (selected.length < 2) {
            Utils.showToast('Select 2 objects: target (bottom) and eraser shape (top)', 'warning');
            return;
        }
        // Sort by z-order: bottom = target, top = eraser shape
        const sorted = [...selected].sort((a, b) =>
            this.objects.indexOf(a) - this.objects.indexOf(b)
        );
        const target = sorted[0];
        const eraser = sorted[sorted.length - 1];

        eventBus.emit('history:flush'); // Save state before destructive op

        // Rasterize target to offscreen canvas (accounts for rotation)
        const PAD = 4;
        const scale = 2; // 2x for quality
        const b = target.getBounds();
        const cw = Math.ceil(b.width + PAD * 2) * scale;
        const ch = Math.ceil(b.height + PAD * 2) * scale;
        if (cw <= 0 || ch <= 0 || cw > 4096 || ch > 4096) {
            Utils.showToast('Target object too large for object eraser', 'warning');
            return;
        }
        const cvs = document.createElement('canvas');
        cvs.width = cw;
        cvs.height = ch;
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-b.x + PAD, -b.y + PAD);
        target.render(ctx);
        ctx.restore();

        this._objEraserMode = true;
        this._objEraserTarget = target;
        this._objEraserCanvas = cvs;
        this._objEraserCtx = ctx;
        this._objEraserShape = eraser;
        this._objEraserDragging = false;
        this._objEraserDragOff = null;
        this._objEraserOrigPos = { x: eraser.x, y: eraser.y };
        this._objEraserOrigRot = { eraserRot: eraser.rotation || 0, targetRot: target.rotation || 0 };
        // Store scale and padding for coord conversions
        this._objEraserScale = scale;
        this._objEraserPad = PAD;

        document.getElementById('obj-eraser-controls')?.classList.remove('hidden');
        this._showImplementationFloatingToolbar({
            tool: 'obj-eraser',
            label: 'Object Eraser',
            hint: 'Stamp eraser shape, then apply or cancel',
            applyText: 'Apply & Keep',
            onApply: () => this.applyObjectEraser(true),
            onCancel: () => this.exitObjectEraserMode()
        });
        // Sync rotation inputs
        const eraserRotInput = document.getElementById('obj-eraser-rot-eraser');
        const targetRotInput = document.getElementById('obj-eraser-rot-target');
        if (eraserRotInput) eraserRotInput.value = Math.round(eraser.rotation || 0);
        if (targetRotInput) targetRotInput.value = Math.round(target.rotation || 0);
        this.stage.requestRender();
        Utils.showToast('Object Eraser — position/rotate the eraser shape over the target then Stamp', 'info');
    },

    exitObjectEraserMode() {
        if (this._objEraserShape && this._objEraserOrigPos) {
            // Reset eraser shape to original position
            this._objEraserShape.x = this._objEraserOrigPos.x;
            this._objEraserShape.y = this._objEraserOrigPos.y;
        }
        if (this._objEraserOrigRot) {
            if (this._objEraserShape) this._objEraserShape.rotation = this._objEraserOrigRot.eraserRot;
            if (this._objEraserTarget) this._objEraserTarget.rotation = this._objEraserOrigRot.targetRot;
        }
        this._objEraserMode = false;
        this._objEraserTarget = null;
        this._objEraserCanvas = null;
        this._objEraserCtx = null;
        this._objEraserShape = null;
        this._objEraserDragging = false;
        this._objEraserDragOff = null;
        this._objEraserOrigPos = null;
        this._objEraserOrigRot = null;
        document.getElementById('obj-eraser-controls')?.classList.add('hidden');
        this._hideImplementationFloatingToolbar('obj-eraser');
        this.stage.requestRender();
    },

    /**
     * Re-rasterize the target object to the offscreen canvas (after rotation change).
     */
    _reRasterizeObjEraserTarget() {
        const target = this._objEraserTarget;
        if (!target) return;
        const PAD = this._objEraserPad;
        const scale = this._objEraserScale;
        const b = target.getBounds();
        const cw = Math.ceil(b.width + PAD * 2) * scale;
        const ch = Math.ceil(b.height + PAD * 2) * scale;
        if (cw <= 0 || ch <= 0 || cw > 4096 || ch > 4096) return;
        const cvs = document.createElement('canvas');
        cvs.width = cw;
        cvs.height = ch;
        const ctx = cvs.getContext('2d', { willReadFrequently: true });
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-b.x + PAD, -b.y + PAD);
        target.render(ctx);
        ctx.restore();
        this._objEraserCanvas = cvs;
        this._objEraserCtx = ctx;
    },

    /**
     * Set rotation for eraser or target during object eraser mode.
     * @param {'eraser'|'target'} which
     * @param {number} degrees
     */
    setObjEraserRotation(which, degrees) {
        if (!this._objEraserMode) return;
        if (which === 'eraser' && this._objEraserShape) {
            this._objEraserShape.rotation = degrees;
        } else if (which === 'target' && this._objEraserTarget) {
            this._objEraserTarget.rotation = degrees;
            this._reRasterizeObjEraserTarget();
        }
        this.stage.requestRender();
    },

    /**
     * Stamp the eraser shape onto the target — punches a hole shaped like
     * the eraser object wherever it overlaps the target.
     */
    stampObjectEraser() {
        if (!this._objEraserMode || !this._objEraserTarget || !this._objEraserShape) return;
        const target = this._objEraserTarget;
        const eraser = this._objEraserShape;
        const scale = this._objEraserScale;
        const PAD = this._objEraserPad;
        const cvs = this._objEraserCanvas;
        const ctx = this._objEraserCtx;
        const tb = target.getBounds();

        // Render the eraser shape as a mask, then punch it out of the target canvas
        const maskCvs = document.createElement('canvas');
        maskCvs.width = cvs.width;
        maskCvs.height = cvs.height;
        const mctx = maskCvs.getContext('2d', { willReadFrequently: true });
        mctx.save();
        mctx.scale(scale, scale);
        mctx.translate(-tb.x + PAD, -tb.y + PAD);
        // Force a solid fill so the mask is fully opaque
        const origFillType = eraser.fillType;
        const origFill = eraser.fill;
        const origOpacity = eraser.opacity;
        const origStroke = eraser.stroke;
        const origStrokeWidth = eraser.strokeWidth;
        const needsForceFill = origFillType === 'none' || origFill === 'transparent';
        if (needsForceFill) {
            eraser.fillType = 'solid';
            eraser.fill = '#808080';
        }
        eraser.opacity = 1;
        eraser.stroke = 'transparent';
        eraser.strokeWidth = 0;
        eraser.render(mctx);
        eraser.fillType = origFillType;
        eraser.fill = origFill;
        eraser.opacity = origOpacity;
        eraser.stroke = origStroke;
        eraser.strokeWidth = origStrokeWidth;
        mctx.restore();

        // Convert rendered eraser to solid mask (any visible pixel → fully opaque)
        const id = mctx.getImageData(0, 0, maskCvs.width, maskCvs.height);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 0) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 255; }
        }
        mctx.putImageData(id, 0, 0);

        // Punch the mask out of the target canvas using destination-out
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(maskCvs, 0, 0);
        ctx.restore();

        this.stage.requestRender();
        Utils.showToast('Stamped! Move eraser and stamp again, or Apply', 'success');
    },

    /**
     * Apply the object eraser — replace target with the erased image.
     */
    applyObjectEraser(keepEraser) {
        if (!this._objEraserMode || !this._objEraserTarget || !this._objEraserCanvas) return;
        const target = this._objEraserTarget;
        const eraser = this._objEraserShape;
        const cvs = this._objEraserCanvas;
        const scale = this._objEraserScale;
        const PAD = this._objEraserPad;

        // Trim transparent borders
        const w = cvs.width, h = cvs.height;
        const imgData = cvs.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = 0, maxY = 0;
        let found = false;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (imgData[(y * w + x) * 4 + 3] > 0) {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        if (!found) {
            // Completely erased — remove the target
            this.removeObject(target.id);
            if (!keepEraser && eraser) this.removeObject(eraser.id);
            Utils.showToast('Object fully erased', 'info');
            eventBus.emit('history:push');
            this._objEraserMode = false;
            this._objEraserTarget = null;
            this._objEraserCanvas = null;
            this._objEraserCtx = null;
            this._objEraserShape = null;
            document.getElementById('obj-eraser-controls')?.classList.add('hidden');
            this._hideImplementationFloatingToolbar('obj-eraser');
            this.stage.requestRender();
            return;
        }

        const tw = maxX - minX + 1;
        const th = maxY - minY + 1;
        const trimmed = document.createElement('canvas');
        trimmed.width = tw;
        trimmed.height = th;
        trimmed.getContext('2d').drawImage(cvs, minX, minY, tw, th, 0, 0, tw, th);

        const newSrc = trimmed.toDataURL('image/png');
        const tb = target.getBounds();
        const newX = tb.x - PAD + minX / scale;
        const newY = tb.y - PAD + minY / scale;
        const newW = tw / scale;
        const newH = th / scale;

        // Replace target with the erased result
        const idx = this.objects.indexOf(target);
        this.removeObject(target.id);
        const resultObj = new StageObject('image', {
            x: newX, y: newY, width: newW, height: newH,
            imageSrc: newSrc,
            name: target.name + ' (erased)'
        });
        this.addObject(resultObj);
        // Move to original z-order position
        const curIdx = this.objects.indexOf(resultObj);
        if (curIdx !== idx && idx >= 0) {
            this.objects.splice(curIdx, 1);
            this.objects.splice(Math.min(idx, this.objects.length), 0, resultObj);
        }

        // Optionally remove eraser shape
        if (!keepEraser && eraser) {
            this.removeObject(eraser.id);
        } else if (eraser) {
            if (this._objEraserOrigPos) {
                eraser.x = this._objEraserOrigPos.x;
                eraser.y = this._objEraserOrigPos.y;
            }
            if (this._objEraserOrigRot) {
                eraser.rotation = this._objEraserOrigRot.eraserRot;
            }
        }

        this._objEraserMode = false;
        this._objEraserTarget = null;
        this._objEraserCanvas = null;
        this._objEraserCtx = null;
        this._objEraserShape = null;
        this._objEraserOrigRot = null;
        document.getElementById('obj-eraser-controls')?.classList.add('hidden');
        this._hideImplementationFloatingToolbar('obj-eraser');
        this.select([resultObj.id]);
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Object eraser applied', 'success');
    },

    _handleObjEraserMouseDown(pos) {
        const eraser = this._objEraserShape;
        if (!eraser) return;
        const b = eraser.getBounds();
        if (pos.x >= b.x && pos.x <= b.x + b.width &&
            pos.y >= b.y && pos.y <= b.y + b.height) {
            this._objEraserDragging = true;
            this._objEraserDragOff = { x: pos.x - eraser.x, y: pos.y - eraser.y };
        }
    },

    _handleObjEraserMouseMove(pos) {
        if (this._objEraserDragging && this._objEraserShape) {
            this._objEraserShape.x = pos.x - this._objEraserDragOff.x;
            this._objEraserShape.y = pos.y - this._objEraserDragOff.y;
            this.stage.requestRender();
        }
    },

    _handleObjEraserMouseUp() {
        this._objEraserDragging = false;
        this._objEraserDragOff = null;
    },

    // === Pin Pick Point Mode ===

    _getObjectPivotWorld(obj) {
        if (!obj) return { x: 0, y: 0 };
        return obj.getPivotPoint
            ? obj.getPivotPoint()
            : {
                x: obj.x + obj.width * (obj.pivotX ?? 0.5),
                y: obj.y + obj.height * (obj.pivotY ?? 0.5)
            };
    },

    _getObjectWorldPoint(obj, normX = 0.5, normY = 0.5) {
        if (!obj) return { x: 0, y: 0 };
        const rawX = obj.x + obj.width * normX;
        const rawY = obj.y + obj.height * normY;
        if (typeof obj._transformDisplayPoint === 'function') {
            return obj._transformDisplayPoint({ x: rawX, y: rawY });
        }
        const pivot = this._getObjectPivotWorld(obj);
        const rad = (obj.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = rawX - pivot.x;
        const dy = rawY - pivot.y;
        return {
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos
        };
    },

    _getObjectNormalizedPoint(obj, worldX, worldY) {
        if (!obj) return { x: 0.5, y: 0.5 };
        if (typeof obj._inverseTransformDisplayPoint === 'function') {
            const local = obj._inverseTransformDisplayPoint({ x: worldX, y: worldY });
            return {
                x: Math.max(0, Math.min(1, obj.width ? (local.x - obj.x) / obj.width : 0.5)),
                y: Math.max(0, Math.min(1, obj.height ? (local.y - obj.y) / obj.height : 0.5))
            };
        }
        const pivot = this._getObjectPivotWorld(obj);
        const rad = -(obj.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = worldX - pivot.x;
        const dy = worldY - pivot.y;
        const localX = pivot.x + dx * cos - dy * sin;
        const localY = pivot.y + dx * sin + dy * cos;
        return {
            x: Math.max(0, Math.min(1, obj.width ? (localX - obj.x) / obj.width : 0.5)),
            y: Math.max(0, Math.min(1, obj.height ? (localY - obj.y) / obj.height : 0.5))
        };
    },


});
