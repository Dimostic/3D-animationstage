/**
 * Object Manager — Slice, measure & flex mode tools
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {


    // ── Measure Tool ──

    _enterMeasureMode() {
        this._measureMode = true;
        this._measureStart = null;
        this._measureEnd = null;
        this._measureDragging = false;
        this._measureFinalized = false;
        this.stage.viewport.style.cursor = 'crosshair';

        // Overlay renderer
        this._measureOverlay = (ctx) => {
            if (!this._measureStart) return;
            const s = this._measureStart;
            const e = this._measureEnd || s;
            const zoom = this.stage.zoom;

            // Draw the line
            ctx.save();
            ctx.strokeStyle = '#f59e0b';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([6 / zoom, 4 / zoom]);
            ctx.beginPath();
            ctx.moveTo(s.x, s.y);
            ctx.lineTo(e.x, e.y);
            ctx.stroke();
            ctx.setLineDash([]);

            // Endpoints
            const r = 4 / zoom;
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.arc(e.x, e.y, r, 0, Math.PI * 2);
            ctx.fill();

            // Distance
            const dx = e.x - s.x, dy = e.y - s.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            const midX = (s.x + e.x) / 2, midY = (s.y + e.y) / 2;

            // Label
            const fontSize = Math.max(11, 13 / zoom);
            ctx.font = `600 ${fontSize}px Inter, sans-serif`;
            const label = `${Math.round(dist)} px`;
            const angleLabel = `${angle.toFixed(1)}°`;
            const wLabel = `W: ${Math.abs(Math.round(dx))}  H: ${Math.abs(Math.round(dy))}`;
            const textW = Math.max(ctx.measureText(label).width, ctx.measureText(wLabel).width) + 16 / zoom;
            const textH = fontSize * 3.6;
            const padX = 8 / zoom, padY = 4 / zoom;
            const boxX = midX - textW / 2, boxY = midY - textH - 8 / zoom;

            // Background
            ctx.fillStyle = 'rgba(0,0,0,0.8)';
            ctx.beginPath();
            const br = 4 / zoom;
            ctx.roundRect(boxX - padX, boxY - padY, textW + padX * 2, textH + padY * 2, br);
            ctx.fill();

            // Text
            ctx.fillStyle = '#f59e0b';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillText(label, midX, boxY + padY);
            ctx.fillStyle = '#ccc';
            ctx.font = `${fontSize * 0.85}px Inter, sans-serif`;
            ctx.fillText(angleLabel, midX, boxY + padY + fontSize * 1.2);
            ctx.fillText(wLabel, midX, boxY + padY + fontSize * 2.2);

            ctx.restore();
        };
        eventBus.on('stage:render-overlay', this._measureOverlay);
        Utils.showToast('Measure: click & drag to measure. Double-click to finalize.', 'info');
    },

    _exitMeasureMode() {
        this._measureMode = false;
        this._measureStart = null;
        this._measureEnd = null;
        this._measureDragging = false;
        this._measureFinalized = false;
        clearTimeout(this._measureAutoCloseTimer);
        if (this._measureOverlay) {
            eventBus.off('stage:render-overlay', this._measureOverlay);
            this._measureOverlay = null;
        }
        this._removeMeasureToast();
        this.stage.requestRender();
    },

    _handleMeasureMouseDown(pos) {
        if (this._measureFinalized) return;
        this._measureStart = { x: pos.x, y: pos.y };
        this._measureEnd = { x: pos.x, y: pos.y };
        this._measureDragging = true;
        this.stage.requestRender();
    },

    _handleMeasureMouseMove(pos) {
        this._measureEnd = { x: pos.x, y: pos.y };
        this.stage.requestRender();
    },

    _handleMeasureMouseUp(pos) {
        this._measureEnd = { x: pos.x, y: pos.y };
        this._measureDragging = false;
        this.stage.requestRender();
    },

    _finalizeMeasure() {
        if (!this._measureStart || !this._measureEnd) return;
        this._measureFinalized = true;
        this._measureDragging = false;
        const dx = this._measureEnd.x - this._measureStart.x;
        const dy = this._measureEnd.y - this._measureStart.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        this._showMeasureToast(dist, angle, Math.abs(dx), Math.abs(dy));
        this.stage.requestRender();

        // Auto-dismiss after 5 seconds
        this._measureAutoCloseTimer = setTimeout(() => {
            this._exitMeasureMode();
            this.setTool('select');
        }, 5000);
    },

    _showMeasureToast(dist, angle, w, h) {
        this._removeMeasureToast();
        const div = document.createElement('div');
        div.id = 'measure-result-toast';
        div.className = 'measure-result-toast';
        div.innerHTML = `
            <div class="measure-toast-row"><i class="fas fa-ruler"></i> <strong>${Math.round(dist)} px</strong></div>
            <div class="measure-toast-detail">Angle: ${angle.toFixed(1)}° &nbsp;|&nbsp; W: ${Math.round(w)} &nbsp; H: ${Math.round(h)}</div>
            <button class="measure-toast-close" title="Close"><i class="fas fa-times"></i></button>
        `;
        document.body.appendChild(div);
        div.querySelector('.measure-toast-close').addEventListener('click', () => {
            this._exitMeasureMode();
            this.setTool('select');
        });
    },

    _removeMeasureToast() {
        document.getElementById('measure-result-toast')?.remove();
    },

    _showSliceModeChooser() {
        const chooser = document.getElementById('slice-mode-chooser');
        if (!chooser) return;
        chooser.classList.remove('hidden');
    },

    _hideSliceModeChooser() {
        const chooser = document.getElementById('slice-mode-chooser');
        if (!chooser) return;
        chooser.classList.add('hidden');
    },

    setSliceModeChoice(mode) {
        const normalized = mode === 'continuous' ? 'continuous' : 'single';
        this._sliceModeChoice = normalized;
        this.setSliceContinuousMode(normalized === 'continuous');

        const modeEl = document.getElementById('slice-continuous-mode');
        if (modeEl) modeEl.checked = this._sliceContinuousMode;

        this._hideSliceModeChooser();
        this._updateSliceFloatingToolbar();
        this.stage.requestRender();
        Utils.showToast(
            this._sliceContinuousMode
                ? 'Continuous Cut enabled. Draw cut paths and queue them.'
                : 'Single Cut enabled. Draw one cut path and apply.',
            'info'
        );
    },

    _handleSliceClick(pos) {
        // If locked (double-clicked), don't add more points
        if (this._sliceLocked) return;

        if (!this._sliceModeChoice) {
            Utils.showToast('Choose Single Cut or Continuous Cut from the stage menu first.', 'info');
            return;
        }

        if (!this._sliceObj) {
            // No target yet — pick one
            const hit = this.hitTest(pos.x, pos.y);
            if (hit) {
                this._sliceObj = hit;
                this.select([hit.id]);
                Utils.showToast(`Slicing "${hit.name || hit.type}". Click to add cut points, double-click to finish.`, 'info');
            }
            return;
        }
        this._slicePoints.push({ x: pos.x, y: pos.y });
        this._updateSlicePointCount();
        this._updateSliceFloatingToolbar();
        this.stage.requestRender();
    },

    _lockSlicePoints() {
        if (!this._sliceModeChoice) {
            Utils.showToast('Choose Single Cut or Continuous Cut first.', 'info');
            return;
        }
        if (this._slicePoints.length < 2) {
            Utils.showToast('Need at least 2 points before finishing', 'warning');
            return;
        }
        if (this._sliceContinuousMode) {
            this.sliceQueueCurrentRegion();
            return;
        }
        this._sliceLocked = true;
        this._sliceHoverPos = null;
        this.stage.viewport.style.cursor = '';
        this._updateSliceFloatingToolbar();
        this.stage.requestRender();
        Utils.showToast('Cut path set. Apply Slice, Undo Point, or Cancel.', 'info');
    },

    _unlockSlicePoints() {
        this._sliceLocked = false;
        this.stage.viewport.style.cursor = 'crosshair';
        this._updateSliceFloatingToolbar();
        this.stage.requestRender();
    },

    _showSliceFloatingToolbar() {
        const bar = document.getElementById('slice-floating-toolbar');
        if (bar) {
            bar.classList.remove('hidden');
            this._updateSliceFloatingToolbar();
        }
    },

    _hideSliceFloatingToolbar() {
        const bar = document.getElementById('slice-floating-toolbar');
        if (bar) bar.classList.add('hidden');
    },

    _updateSliceFloatingToolbar() {
        const countEl = document.getElementById('slice-ft-count');
        if (countEl) countEl.textContent = this._slicePoints.length;
        const hintEl = document.getElementById('slice-ft-hint');
        const actionsEl = document.getElementById('slice-ft-actions');
        const nextBtn = document.getElementById('btn-slice-ft-next');
        const clearBtn = document.getElementById('btn-slice-ft-clear');
        const applyBtn = document.getElementById('btn-slice-ft-apply');
        const applyAllBtn = document.getElementById('btn-slice-ft-apply-all');
        const undoBtn = document.getElementById('btn-slice-ft-undo');
        // Show undo button as soon as there's at least 1 point
        if (undoBtn) {
            if (this._slicePoints.length > 0) undoBtn.classList.remove('hidden');
            else undoBtn.classList.add('hidden');
        }

        if (!this._sliceModeChoice) {
            if (hintEl) hintEl.textContent = 'Select Single Cut or Continuous Cut in the stage menu';
            if (actionsEl) actionsEl.classList.add('hidden');
            this._updateSliceQueuedCount();
            return;
        }

        const hasQueued = (this._sliceQueuedRegions?.length || 0) > 0;
        if (this._sliceLocked || this._sliceContinuousMode || hasQueued) {
            if (hintEl) hintEl.textContent = 'Choose an action:';
            if (actionsEl) actionsEl.classList.remove('hidden');
            if (nextBtn) nextBtn.classList.toggle('hidden', !this._sliceContinuousMode);
            if (clearBtn) clearBtn.classList.toggle('hidden', !this._sliceContinuousMode);
            if (applyAllBtn) applyAllBtn.classList.toggle('hidden', !this._sliceContinuousMode);
            if (applyBtn) applyBtn.textContent = this._sliceContinuousMode ? 'Apply Current' : 'Apply Slice';
        } else {
            if (hintEl) hintEl.textContent = this._sliceObj
                ? (this._sliceContinuousMode
                    ? 'Click to add cut points, double-click to queue path'
                    : 'Click to add cut points, double-click to finish')
                : 'Click an object to start slicing';
            if (actionsEl) actionsEl.classList.add('hidden');
        }
        this._updateSliceQueuedCount();
    },

    _updateSlicePointCount() {
        const el = document.getElementById('slice-point-count');
        if (el) el.textContent = this._slicePoints.length;
        const ftEl = document.getElementById('slice-ft-count');
        if (ftEl) ftEl.textContent = this._slicePoints.length;
    },

    _updateSliceQueuedCount() {
        const count = this._sliceQueuedRegions?.length || 0;
        const panelEl = document.getElementById('slice-queued-count');
        if (panelEl) panelEl.textContent = String(count);

        const panelApplyAll = document.getElementById('btn-slice-apply-all');
        const panelNext = document.getElementById('btn-slice-next');
        const panelClear = document.getElementById('btn-slice-clear-queue');

        if (panelApplyAll) panelApplyAll.disabled = count === 0 && this._slicePoints.length < 2;
        if (panelNext) panelNext.disabled = !this._sliceContinuousMode;
        if (panelClear) panelClear.disabled = !this._sliceContinuousMode || count === 0;
    },

    _isSlicePathClosed(points) {
        if (!points || points.length < 3) return false;
        const first = points[0];
        const last = points[points.length - 1];
        const bboxW = Math.max(1, this._sliceObj?.width || 1);
        const bboxH = Math.max(1, this._sliceObj?.height || 1);
        const closeThreshold = Math.max(bboxW, bboxH) * 0.08;
        return Math.hypot(last.x - first.x, last.y - first.y) < closeThreshold;
    },

    _describeSlicePath(points) {
        if (!Array.isArray(points) || points.length < 2) return null;
        const isClosed = this._isSlicePathClosed(points);
        if (!isClosed && points.length < 2) return null;
        if (isClosed && points.length < 3) return null;
        return {
            points: points.map(p => ({ x: p.x, y: p.y })),
            isClosed
        };
    },

    setSliceContinuousMode(enabled) {
        this._sliceContinuousMode = !!enabled;
        this._sliceModeChoice = this._sliceContinuousMode ? 'continuous' : 'single';
        if (!this._sliceContinuousMode) {
            this._sliceQueuedRegions = [];
        }
        this._hideSliceModeChooser();
        this._updateSliceQueuedCount();
        this._updateSliceFloatingToolbar();
        this.stage.requestRender();
    },

    sliceQueueCurrentRegion() {
        if (!this._sliceModeChoice) {
            Utils.showToast('Choose a slice mode first.', 'info');
            return false;
        }
        if (!this._sliceObj) {
            Utils.showToast('Select an object to slice first.', 'warning');
            return false;
        }
        if (this._slicePoints.length < 2) {
            Utils.showToast('Need at least 2 points to queue a cut path.', 'warning');
            return false;
        }
        const desc = this._describeSlicePath(this._slicePoints);
        if (!desc) {
            Utils.showToast('Unable to queue this cut path.', 'warning');
            return false;
        }
        this._sliceQueuedRegions.push(desc);
        this._slicePoints = [];
        this._sliceLocked = false;
        this._sliceHoverPos = null;
        this.stage.viewport.style.cursor = 'crosshair';
        this._updateSlicePointCount();
        this._updateSliceFloatingToolbar();
        this.stage.requestRender();
        Utils.showToast(
            `${desc.isClosed ? 'Region' : 'Path'} queued (${this._sliceQueuedRegions.length}). Draw the next ${desc.isClosed ? 'region' : 'path'}.`,
            'success'
        );
        return true;
    },

    sliceClearQueue() {
        this._sliceQueuedRegions = [];
        this._updateSliceQueuedCount();
        this._updateSliceFloatingToolbar();
        this.stage.requestRender();
        Utils.showToast('Queued cuts cleared.', 'info');
    },

    sliceUndoLastPoint() {
        if (this._slicePoints.length > 0) {
            this._slicePoints.pop();
            this._updateSlicePointCount();
            // If we're locked but removed enough points, unlock to let user add more
            if (this._sliceLocked && this._slicePoints.length < 2) {
                this._unlockSlicePoints();
            }
            this._updateSliceFloatingToolbar();
            this.stage.requestRender();
        }
    },

    applySlice() {
        if (!this._sliceModeChoice) {
            Utils.showToast('Choose Single Cut or Continuous Cut from the stage menu first.', 'info');
            return;
        }
        if (this._sliceContinuousMode) {
            this.applySliceBatch();
            return;
        }

        if (!this._sliceObj || this._slicePoints.length < 2) {
            Utils.showToast('Need at least 2 points to define a cut line', 'warning');
            return;
        }

        const obj = this._sliceObj;
        const points = [...this._slicePoints];

        // Rasterize the object to an offscreen canvas
        const padding = 2;
        const scale = 2;
        const w = Math.ceil(obj.width + padding * 2);
        const h = Math.ceil(obj.height + padding * 2);
        const cw = w * scale;
        const ch = h * scale;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = cw;
        srcCanvas.height = ch;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        srcCtx.scale(scale, scale);
        srcCtx.translate(-obj.x + padding, -obj.y + padding);
        srcCtx.save();
        obj.render(srcCtx);
        srcCtx.restore();

        // Convert cut points from stage coords to local canvas coords
        const localPoints = points.map(p => ({
            x: (p.x - obj.x + padding) * scale,
            y: (p.y - obj.y + padding) * scale
        }));

        // Detect if the path is closed (first and last points near each other)
        const firstPt = localPoints[0];
        const lastPt = localPoints[localPoints.length - 1];
        const closeDist = Math.hypot(lastPt.x - firstPt.x, lastPt.y - firstPt.y);
        const closeThreshold = Math.max(cw, ch) * 0.08;
        const isClosed = closeDist < closeThreshold;

        let partA, partB;

        if (isClosed) {
            // Closed path: interior vs exterior clipping
            partA = this._clipToClosedPath(srcCanvas, localPoints, cw, ch, 'interior');
            partB = this._clipToClosedPath(srcCanvas, localPoints, cw, ch, 'exterior');
        } else {
            // Open path: extend endpoints and use wide-band per-point normal clipping
            const extendDist = Math.max(cw, ch) * 2;
            const first = localPoints[0];
            const second = localPoints[1];
            const dxStart = first.x - second.x;
            const dyStart = first.y - second.y;
            const lenStart = Math.hypot(dxStart, dyStart) || 1;
            localPoints.unshift({
                x: first.x + (dxStart / lenStart) * extendDist,
                y: first.y + (dyStart / lenStart) * extendDist
            });

            const last = localPoints[localPoints.length - 1];
            const prev = localPoints[localPoints.length - 2];
            const dxEnd = last.x - prev.x;
            const dyEnd = last.y - prev.y;
            const lenEnd = Math.hypot(dxEnd, dyEnd) || 1;
            localPoints.push({
                x: last.x + (dxEnd / lenEnd) * extendDist,
                y: last.y + (dyEnd / lenEnd) * extendDist
            });

            const sideA = this._buildOpenSlicePoly(localPoints, cw, ch, 'left');
            const sideB = this._buildOpenSlicePoly(localPoints, cw, ch, 'right');

            partA = this._clipToRegion(srcCanvas, sideA, cw, ch);
            partB = this._clipToRegion(srcCanvas, sideB, cw, ch);
        }

        // Check both parts have content
        const hasA = this._hasVisiblePixels(partA);
        const hasB = this._hasVisiblePixels(partB);

        if (!hasA && !hasB) {
            Utils.showToast('Cut line does not intersect the object', 'warning');
            return;
        }

        // Trim each part to its bounding content and create new objects
        const createdObjects = [];
        if (hasA) {
            const trimA = this._trimCanvas(partA);
            createdObjects.push(this._createSlicedObject(obj, trimA, padding, scale));
        }
        if (hasB) {
            const trimB = this._trimCanvas(partB);
            createdObjects.push(this._createSlicedObject(obj, trimB, padding, scale));
        }

        // Remove original object
        const idx = this.objects.indexOf(obj);
        if (idx >= 0) this.objects.splice(idx, 1);

        // Remove original, update list, push history
        this.updateObjectList();
        eventBus.emit('history:push');
        this.exitSliceMode();

        // Switch to select tool and deselect so pieces are independent
        this.setTool('select');
        this.select([]);
        this.stage.requestRender();
        Utils.showToast(`Sliced into ${createdObjects.length} piece(s)`, 'success');
    },

    applySliceBatch() {
        if (!this._sliceModeChoice) {
            Utils.showToast('Choose Continuous Cut in the stage menu first.', 'info');
            return;
        }
        if (!this._sliceObj) {
            Utils.showToast('Select an object to slice first.', 'warning');
            return;
        }

        if (this._slicePoints.length >= 2) {
            const queued = this.sliceQueueCurrentRegion();
            if (!queued) return;
        }

        const queuedCuts = this._sliceQueuedRegions || [];
        if (queuedCuts.length === 0) {
            Utils.showToast('Queue at least one cut path before Cut Out All.', 'warning');
            return;
        }

        const obj = this._sliceObj;

        const padding = 2;
        const scale = 2;
        const w = Math.ceil(obj.width + padding * 2);
        const h = Math.ceil(obj.height + padding * 2);
        const cw = w * scale;
        const ch = h * scale;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = cw;
        srcCanvas.height = ch;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        srcCtx.scale(scale, scale);
        srcCtx.translate(-obj.x + padding, -obj.y + padding);
        srcCtx.save();
        obj.render(srcCtx);
        srcCtx.restore();

        const allClosed = queuedCuts.every(c => !!c?.isClosed);
        const createdObjects = [];
        const baseName = obj.name || obj.type;

        if (allClosed) {
            // Prefer region-index naming when all queued cuts are closed regions.
            const remaining = document.createElement('canvas');
            remaining.width = cw;
            remaining.height = ch;
            const remainingCtx = remaining.getContext('2d', { willReadFrequently: true });
            remainingCtx.drawImage(srcCanvas, 0, 0);

            queuedCuts.forEach((cut, idx) => {
                const localPoints = cut.points.map(p => ({
                    x: (p.x - obj.x + padding) * scale,
                    y: (p.y - obj.y + padding) * scale
                }));

                const interior = this._clipToClosedPath(remaining, localPoints, cw, ch, 'interior');
                if (this._hasVisiblePixels(interior)) {
                    const trim = this._trimCanvas(interior);
                    createdObjects.push(this._createSlicedObject(
                        obj,
                        trim,
                        padding,
                        scale,
                        `${baseName} (region ${idx + 1})`
                    ));
                }

                remainingCtx.globalCompositeOperation = 'destination-out';
                remainingCtx.beginPath();
                localPoints.forEach((p, i) => {
                    if (i === 0) remainingCtx.moveTo(p.x, p.y);
                    else remainingCtx.lineTo(p.x, p.y);
                });
                remainingCtx.closePath();
                remainingCtx.fill();
                remainingCtx.globalCompositeOperation = 'source-over';
            });

            if (this._hasVisiblePixels(remaining)) {
                const trimRemainder = this._trimCanvas(remaining);
                createdObjects.push(this._createSlicedObject(
                    obj,
                    trimRemainder,
                    padding,
                    scale,
                    `${baseName} (remainder)`
                ));
            }
        } else {
            // Mixed/open cuts: split every current piece sequentially by each queued cut.
            let pieces = [{
                canvas: srcCanvas,
                tag: ''
            }];

            queuedCuts.forEach((cut, idx) => {
                const localPoints = cut.points.map(p => ({
                    x: (p.x - obj.x + padding) * scale,
                    y: (p.y - obj.y + padding) * scale
                }));

                const nextPieces = [];
                for (const piece of pieces) {
                    if (!this._hasVisiblePixels(piece.canvas)) continue;

                    if (cut.isClosed) {
                        const inside = this._clipToClosedPath(piece.canvas, localPoints, cw, ch, 'interior');
                        const outside = this._clipToClosedPath(piece.canvas, localPoints, cw, ch, 'exterior');
                        if (this._hasVisiblePixels(inside)) {
                            nextPieces.push({
                                canvas: inside,
                                tag: `${piece.tag}${piece.tag ? '+' : ''}r${idx + 1}in`
                            });
                        }
                        if (this._hasVisiblePixels(outside)) {
                            nextPieces.push({
                                canvas: outside,
                                tag: `${piece.tag}${piece.tag ? '+' : ''}r${idx + 1}out`
                            });
                        }
                    } else {
                        // Keep open cuts localized in batch mode by using the user-drawn segment
                        // directly (no endpoint extension). This avoids splitting unrelated regions.
                        const sideA = this._buildOpenSlicePoly(localPoints, cw, ch, 'left');
                        const sideB = this._buildOpenSlicePoly(localPoints, cw, ch, 'right');
                        const left = this._clipToRegion(piece.canvas, sideA, cw, ch);
                        const right = this._clipToRegion(piece.canvas, sideB, cw, ch);

                        if (this._hasVisiblePixels(left)) {
                            nextPieces.push({
                                canvas: left,
                                tag: `${piece.tag}${piece.tag ? '+' : ''}p${idx + 1}L`
                            });
                        }
                        if (this._hasVisiblePixels(right)) {
                            nextPieces.push({
                                canvas: right,
                                tag: `${piece.tag}${piece.tag ? '+' : ''}p${idx + 1}R`
                            });
                        }
                    }
                }
                pieces = nextPieces;
            });

            pieces.forEach((piece, idx) => {
                if (!this._hasVisiblePixels(piece.canvas)) return;
                const trim = this._trimCanvas(piece.canvas);
                const label = piece.tag || `piece-${idx + 1}`;
                createdObjects.push(this._createSlicedObject(
                    obj,
                    trim,
                    padding,
                    scale,
                    `${baseName} (${label})`
                ));
            });
        }

        const idx = this.objects.indexOf(obj);
        if (idx >= 0) this.objects.splice(idx, 1);

        this.updateObjectList();
        eventBus.emit('history:push');
        this.exitSliceMode();

        this.setTool('select');
        this.select([]);
        this.stage.requestRender();
        Utils.showToast(`Cut Out All created ${createdObjects.length} piece(s).`, 'success');
    },

    _buildOpenSlicePoly(cutPath, cw, ch, side) {
        // Build a wide-band polygon using per-point perpendicular normals.
        // This handles curved/multi-segment open paths correctly.
        const offsetDist = Math.max(cw, ch) * 4;
        const sign = side === 'left' ? 1 : -1;

        // Compute per-point normals from local segment directions
        const normals = [];
        for (let i = 0; i < cutPath.length; i++) {
            let dx, dy;
            if (i === 0) {
                dx = cutPath[1].x - cutPath[0].x;
                dy = cutPath[1].y - cutPath[0].y;
            } else if (i === cutPath.length - 1) {
                dx = cutPath[i].x - cutPath[i - 1].x;
                dy = cutPath[i].y - cutPath[i - 1].y;
            } else {
                dx = cutPath[i + 1].x - cutPath[i - 1].x;
                dy = cutPath[i + 1].y - cutPath[i - 1].y;
            }
            const len = Math.hypot(dx, dy) || 1;
            normals.push({ x: -dy / len, y: dx / len });
        }

        // Forward along cut path
        const poly = cutPath.map(p => ({ x: p.x, y: p.y }));
        // Backward with per-point perpendicular offset
        for (let i = cutPath.length - 1; i >= 0; i--) {
            poly.push({
                x: cutPath[i].x + normals[i].x * offsetDist * sign,
                y: cutPath[i].y + normals[i].y * offsetDist * sign
            });
        }
        return poly;
    },

    _clipToClosedPath(srcCanvas, pathPoints, cw, ch, mode) {
        // For closed cut paths (e.g. tracing a circle inside a rectangle)
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = cw;
        resultCanvas.height = ch;
        const ctx = resultCanvas.getContext('2d', { willReadFrequently: true });

        if (mode === 'interior') {
            // Clip to the inside of the closed path
            ctx.beginPath();
            pathPoints.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.clip();
            ctx.drawImage(srcCanvas, 0, 0);
        } else {
            // Exterior: draw source then erase the interior
            ctx.drawImage(srcCanvas, 0, 0);
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            pathPoints.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
        }

        return resultCanvas;
    },

    _clipToRegion(srcCanvas, polygon, cw, ch) {
        const resultCanvas = document.createElement('canvas');
        resultCanvas.width = cw;
        resultCanvas.height = ch;
        const ctx = resultCanvas.getContext('2d', { willReadFrequently: true });

        // Draw clip path
        ctx.beginPath();
        polygon.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        });
        ctx.closePath();
        ctx.clip();

        // Draw source
        ctx.drawImage(srcCanvas, 0, 0);
        return resultCanvas;
    },

    _hasVisiblePixels(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
        for (let i = 3; i < data.length; i += 4) {
            if (data[i] > 10) return true;
        }
        return false;
    },

    _trimCanvas(canvas) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = canvas.width, h = canvas.height;
        const data = ctx.getImageData(0, 0, w, h).data;

        let minX = w, minY = h, maxX = 0, maxY = 0;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }

        const tw = maxX - minX + 1;
        const th = maxY - minY + 1;
        if (tw <= 0 || th <= 0) return { canvas, offX: 0, offY: 0, width: w, height: h };

        const trimmed = document.createElement('canvas');
        trimmed.width = tw;
        trimmed.height = th;
        trimmed.getContext('2d', { willReadFrequently: true }).drawImage(canvas, minX, minY, tw, th, 0, 0, tw, th);

        return { canvas: trimmed, offX: minX, offY: minY, width: tw, height: th };
    },

    _createSlicedObject(originalObj, trimData, padding, scale, nameOverride = null) {
        const { canvas, offX, offY, width, height } = trimData;
        const dataUrl = canvas.toDataURL('image/png');

        // Convert from scaled canvas coords back to stage coords
        const stageX = originalObj.x - padding + offX / scale;
        const stageY = originalObj.y - padding + offY / scale;
        const stageW = width / scale;
        const stageH = height / scale;

        const newObj = new StageObject('image', {
            x: stageX,
            y: stageY,
            width: stageW,
            height: stageH,
            imageSrc: dataUrl,
            name: nameOverride || `${originalObj.name || originalObj.type} (slice)`,
            layer: originalObj.layer,
            opacity: originalObj.opacity
        });
        this.addObject(newObj);
        return newObj;
    },

    renderSliceOverlay(ctx) {
        if (!this._sliceMode || !this._sliceObj) return;

        const obj = this._sliceObj;
        const zoom = Math.max(0.001, this.stage.zoom);
        const pts = this._slicePoints;

        ctx.save();

        // Highlight the target object
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.setLineDash([]);

        // Draw the cut path
        if (pts.length > 0) {
            ctx.strokeStyle = this._sliceLocked ? '#44ff44' : '#ff4444';
            ctx.lineWidth = 2 / zoom;
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
                ctx.lineTo(pts[i].x, pts[i].y);
            }
            // Draw live preview line to cursor (only when not locked)
            if (!this._sliceLocked && this._sliceHoverPos) {
                ctx.lineTo(this._sliceHoverPos.x, this._sliceHoverPos.y);
            }
            ctx.stroke();
        }

        // Draw points
        const ptRadius = 4 / zoom;
        pts.forEach((p, i) => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, ptRadius, 0, Math.PI * 2);
            ctx.fillStyle = this._sliceLocked ? '#44ff44' : (i === 0 ? '#ff8800' : '#ff4444');
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5 / zoom;
            ctx.stroke();
        });

        // Draw dashed preview crosshair when no points and cursor visible
        if (pts.length === 0 && !this._sliceLocked && this._sliceHoverPos) {
            ctx.strokeStyle = 'rgba(255, 68, 68, 0.4)';
            ctx.lineWidth = 1 / zoom;
            ctx.setLineDash([4 / zoom, 4 / zoom]);
            ctx.beginPath();
            ctx.moveTo(this._sliceHoverPos.x - 20 / zoom, this._sliceHoverPos.y);
            ctx.lineTo(this._sliceHoverPos.x + 20 / zoom, this._sliceHoverPos.y);
            ctx.moveTo(this._sliceHoverPos.x, this._sliceHoverPos.y - 20 / zoom);
            ctx.lineTo(this._sliceHoverPos.x, this._sliceHoverPos.y + 20 / zoom);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Draw queued continuous regions
        const queued = this._sliceQueuedRegions || [];
        if (queued.length > 0) {
            ctx.strokeStyle = 'rgba(68, 220, 255, 0.9)';
            ctx.lineWidth = 1.5 / zoom;
            ctx.setLineDash([5 / zoom, 4 / zoom]);
            queued.forEach((cut) => {
                const path = cut?.points || cut;
                if (!path || path.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
                if (cut?.isClosed) ctx.closePath();
                ctx.stroke();
            });
            ctx.setLineDash([]);
        }

        ctx.restore();
    },

    // ============ FLEX TOOL (Arc Bending) ============

    _flexStageToLocalNormalized(obj, stagePos) {
        if (!obj || !stagePos) return null;
        const nx = (stagePos.x - obj.x) / Math.max(1, obj.width);
        const ny = (stagePos.y - obj.y) / Math.max(1, obj.height);
        return {
            x: Math.max(0, Math.min(1, nx)),
            y: Math.max(0, Math.min(1, ny))
        };
    },

    _isPointInsideFlexObject(obj, stagePos, padPx = 0) {
        if (!obj || !stagePos) return false;
        return stagePos.x >= (obj.x - padPx)
            && stagePos.x <= (obj.x + obj.width + padPx)
            && stagePos.y >= (obj.y - padPx)
            && stagePos.y <= (obj.y + obj.height + padPx);
    },

    _startFlexPinRegionEdit(pinIdx, mode) {
        const obj = this._flexObj;
        const pin = obj?.flexPins?.[pinIdx];
        if (!pin) return;
        this._flexRegionEdit = {
            pinIdx,
            mode: mode === 'include' ? 'include' : 'exclude',
            points: []
        };
        this._flexRegionHover = null;
        this.stage.viewport.style.cursor = 'crosshair';
        this.stage.requestRender();
        Utils.showToast(
            mode === 'include'
                ? `Draw bendable region for Anchor ${pinIdx + 1}. Click points, then click the first point to finish.`
                : `Draw fixed region for Anchor ${pinIdx + 1}. Click points, then click the first point to finish.`,
            'info'
        );
    },

    _cancelFlexPinRegionEdit() {
        this._flexRegionEdit = null;
        this._flexRegionHover = null;
        this.stage.viewport.style.cursor = this._flexHoverPin >= 0 ? 'grab' : 'crosshair';
        this.stage.requestRender();
    },

    _finishFlexPinRegionEdit() {
        const edit = this._flexRegionEdit;
        const obj = this._flexObj;
        if (!edit || !obj) return;
        const pin = obj.flexPins?.[edit.pinIdx];
        if (!pin) {
            this._cancelFlexPinRegionEdit();
            return;
        }
        if (!edit.points || edit.points.length < 3) {
            Utils.showToast('Add at least 3 points to set a region.', 'warning');
            return;
        }

        pin.maskMode = edit.mode;
        pin.maskPathN = edit.points.map(pt => ({
            x: Math.max(0, Math.min(1, pt.x)),
            y: Math.max(0, Math.min(1, pt.y))
        }));
        if (!Number.isFinite(Number(pin.maskStrength))) pin.maskStrength = 1;

        this._cancelFlexPinRegionEdit();
        this._updateFlexPinList();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(
            pin.maskMode === 'include'
                ? `Anchor ${edit.pinIdx + 1}: bendable region linked.`
                : `Anchor ${edit.pinIdx + 1}: fixed region linked.`,
            'success'
        );
    },

    toggleFlexMode() {
        if (this._flexMode) {
            this.exitFlexMode();
        } else {
            this.enterFlexMode();
        }
    },

    enterFlexMode() {
        const selected = this.getSelectedObjects();
        if (selected.length !== 1) {
            Utils.showToast('Select a single object to flex', 'warning');
            return;
        }
        const obj = selected[0];
        if (obj.locked) {
            Utils.showToast('Unlock the object before using Flex', 'warning');
            return;
        }
        if (['line','path','scribble','text'].includes(obj.type)) {
            Utils.showToast('Flex is not supported for this object type', 'warning');
            return;
        }

        this._flexMode = true;
        this._flexObj = obj;
        this._flexDraggingPin = -1;
        this._flexHoverPin = -1;
        this._flexRegionEdit = null;
        this._flexRegionHover = null;

        // Enable flex on the object if not already
        if (!obj.flexEnabled) {
            obj.flexEnabled = true;
            obj.flexPins = [];
            obj.flexDirection = obj.width >= obj.height ? 'horizontal' : 'vertical';
        }
        if (!obj.flexFixedRegionMode) obj.flexFixedRegionMode = 'overlay';
        if (!Number.isFinite(Number(obj.flexGridDensity))) obj.flexGridDensity = 0.6;

        // Show flex controls panel
        document.getElementById('flex-controls')?.classList.remove('hidden');
        this._syncFlexDirectionUI();
        this._syncFlexPreserveTextureUI();
        this._syncFlexFixedRegionModeUI();
        this._syncFlexGridDensityUI();
        this._updateFlexPinList();

        this.stage.viewport.style.cursor = 'crosshair';
        this.stage.requestRender();
        Utils.showToast('Flex mode — click to place bend anchors, drag handles to bend. Preserve Texture keeps images and patterns bending like a surface.', 'info');
    },

    exitFlexMode() {
        this._flexMode = false;
        this._flexObj = null;
        this._flexDraggingPin = -1;
        this._flexHoverPin = -1;
        this._flexDragStart = null;
        this._flexRegionEdit = null;
        this._flexRegionHover = null;

        document.getElementById('flex-controls')?.classList.add('hidden');
        if (this.currentTool === 'flex') {
            this.stage.viewport.style.cursor = '';
        }
        this.stage.requestRender();
    },

    /** Add a flex anchor at a click position on the target object */
    addFlexAnchor(stageX, stageY) {
        const obj = this._flexObj;
        if (!obj) return;

        const isVertical = obj.flexDirection === 'vertical';
        // Compute normalised position (0-1) along the object's main axis
        let position;
        if (isVertical) {
            position = (stageY - obj.y) / obj.height;
        } else {
            position = (stageX - obj.x) / obj.width;
        }
        position = Math.max(0.05, Math.min(0.95, position));

        const pinId = 'fx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        obj.flexPins.push({
            id: pinId,
            position: Math.round(position * 100) / 100,
            angle: 0,
            spread: 0.25,
            influenceSide: 'below'
        });

        // Sort pins by position
        obj.flexPins.sort((a, b) => a.position - b.position);
        this._updateFlexPinList();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    /** Remove a flex anchor by index */
    removeFlexPin(idx) {
        const obj = this._flexObj;
        if (!obj || idx < 0 || idx >= obj.flexPins.length) return;
        obj.flexPins.splice(idx, 1);
        this._updateFlexPinList();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    /** Reset all bend angles to zero */
    resetFlexPins() {
        const obj = this._flexObj;
        if (!obj) return;
        obj.flexPins.forEach(p => { p.angle = 0; });
        this._updateFlexPinList();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    /** Remove all flex pins and disable flex */
    async clearFlex() {
        const obj = this._flexObj;
        if (!obj) return;
        const isGuided = obj.guidedMotionRig === true || obj.bodyPartData?.presetKey === 'guided-motion-front';
        if (isGuided && !await Utils.showConfirm('This removes the automatic bend anchor from this Guided Motion part. You can restore it later with Repair Rig.', 'Clear Guided Flex')) return;
        obj.flexEnabled = false;
        obj.flexPins = [];
        this.exitFlexMode();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Flex cleared', 'info');
    },

    /** Toggle flex direction between horizontal and vertical */
    setFlexDirection(dir) {
        const obj = this._flexObj;
        if (!obj) return;
        if (obj.guidedMotionRig === true || obj.bodyPartData?.presetKey === 'guided-motion-front') {
            Utils.showToast('Guided Motion parts use vertical Flex so elbow, knee, and neck movements stay aligned', 'info');
            return;
        }
        obj.flexDirection = dir;
        this._syncFlexDirectionUI();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    setFlexPreserveTexture(enabled) {
        const obj = this._flexObj;
        if (!obj) return;
        obj.flexPreserveTexture = enabled !== false;
        obj._flexSurfaceCache = null;
        this._syncFlexPreserveTextureUI();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    setFlexFixedRegionMode(mode) {
        const obj = this._flexObj;
        if (!obj) return;
        obj.flexFixedRegionMode = mode === 'grid' ? 'grid' : 'overlay';
        this._syncFlexFixedRegionModeUI();
        this._syncFlexGridDensityUI();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    setFlexGridDensity(value, commit = false) {
        const obj = this._flexObj;
        if (!obj) return;
        const pct = Number.isFinite(Number(value)) ? Number(value) : 60;
        const clampedPct = Math.max(35, Math.min(150, pct));
        obj.flexGridDensity = clampedPct / 100;
        this._syncFlexGridDensityUI();
        this.stage.requestRender();
        if (commit) eventBus.emit('history:push');
    },

    /** Update a specific pin's angle from the UI */
    setFlexPinAngle(idx, angle) {
        const obj = this._flexObj;
        if (!obj || idx < 0 || idx >= obj.flexPins.length) return;
        const normalized = Number.isFinite(Number(angle)) ? Number(angle) : 0;
        obj.flexPins[idx].angle = Math.max(-360, Math.min(360, normalized));
        this.stage.requestRender();
    },

    /** Update a specific pin's spread from the UI */
    setFlexPinSpread(idx, spread) {
        const obj = this._flexObj;
        if (!obj || idx < 0 || idx >= obj.flexPins.length) return;
        obj.flexPins[idx].spread = Math.max(0.05, Math.min(1, spread));
        this.stage.requestRender();
    },

    _syncFlexDirectionUI() {
        const obj = this._flexObj;
        if (!obj) return;
        const hBtn = document.getElementById('flex-dir-h');
        const vBtn = document.getElementById('flex-dir-v');
        if (hBtn) hBtn.classList.toggle('active', obj.flexDirection === 'horizontal');
        if (vBtn) vBtn.classList.toggle('active', obj.flexDirection === 'vertical');
    },

    _syncFlexPreserveTextureUI() {
        const obj = this._flexObj;
        const checkbox = document.getElementById('flex-preserve-texture');
        if (checkbox) checkbox.checked = obj ? obj.flexPreserveTexture !== false : true;
    },

    _syncFlexFixedRegionModeUI() {
        const obj = this._flexObj;
        const select = document.getElementById('flex-fixed-region-mode');
        if (!select) return;
        const mode = obj?.flexFixedRegionMode === 'grid' ? 'grid' : 'overlay';
        select.value = mode;
    },

    _syncFlexGridDensityUI() {
        const obj = this._flexObj;
        const slider = document.getElementById('flex-grid-density');
        const valueEl = document.getElementById('flex-grid-density-val');
        const wrap = document.getElementById('flex-grid-density-wrap');
        if (!slider || !valueEl || !wrap) return;
        const pct = Math.max(35, Math.min(150, Math.round((Number(obj?.flexGridDensity) || 0.6) * 100)));
        slider.value = String(pct);
        valueEl.textContent = `${pct}%`;
        const mode = obj?.flexFixedRegionMode === 'grid' ? 'grid' : 'overlay';
        wrap.classList.toggle('hidden', mode !== 'grid');
    },

    _updateFlexPinList() {
        const listEl = document.getElementById('flex-pin-list');
        if (!listEl) return;
        const obj = this._flexObj;
        if (!obj) { listEl.innerHTML = ''; return; }

        listEl.innerHTML = obj.flexPins.map((p, i) => {
            const bent = Math.abs(p.angle) > 0.1;
            const locked = !!p.locked;
            const hasRegion = Array.isArray(p.maskPathN) && p.maskPathN.length >= 3;
            const regionLabel = hasRegion
                ? (p.maskMode === 'include' ? 'Bend Region' : 'Fixed Region')
                : 'No Region';
            const regionClass = hasRegion ? 'linked' : 'none';
            const angleVal = Math.round(p.angle || 0);
            const side = p.influenceSide === 'above' ? 'above' : 'below';
            const maskStrength = Number.isFinite(Number(p.maskStrength)) ? Number(p.maskStrength) : 1;
            const strengthVal = Math.max(0, Math.min(100, Math.round(maskStrength * 100)));
            return `<div class="flex-pin-item${bent ? ' bent' : ''}${locked ? ' locked' : ''}" data-idx="${i}">
                <div class="flex-pin-top-row">
                    <span class="flex-pin-label">Anchor ${i + 1}</span>
                    <span class="flex-pin-angle-readout" data-idx="${i}">${angleVal}°</span>
                    <button class="flex-pin-lock-btn${locked ? ' active' : ''}" data-idx="${i}" title="${locked ? 'Unlock this anchor — allow bending' : 'Lock this anchor — stabilize against bending'}"><i class="fas fa-${locked ? 'lock' : 'lock-open'}"></i></button>
                    <button class="flex-pin-remove-btn" data-idx="${i}" title="Remove anchor">✕</button>
                </div>
                <div class="flex-pin-angle-row">
                    <label class="flex-pin-angle-label">Angle</label>
                    <input type="range" class="flex-pin-angle-slider" data-idx="${i}" min="-180" max="180" step="1" value="${angleVal}" title="Bend angle"${locked ? ' disabled' : ''}>
                    <input type="number" class="flex-pin-angle-number" data-idx="${i}" min="-360" max="360" step="1" value="${angleVal}" title="Anchor angle"${locked ? ' disabled' : ''}>
                </div>
                <div class="flex-pin-region-row">
                    <div class="flex-pin-region-status ${regionClass}">${regionLabel}</div>
                </div>
                <div class="flex-pin-rigidity-row">
                    <label class="flex-pin-angle-label">Rigidity</label>
                    <input type="range" class="flex-pin-region-strength-slider" data-idx="${i}" min="0" max="100" step="1" value="${strengthVal}" title="Region rigidity"${hasRegion ? '' : ' disabled'}>
                    <input type="number" class="flex-pin-region-strength-number" data-idx="${i}" min="0" max="100" step="1" value="${strengthVal}" title="Region rigidity percent"${hasRegion ? '' : ' disabled'}>
                </div>
                <div class="flex-pin-side-actions">
                    <label>Transition <input type="range" class="flex-pin-feather" data-idx="${i}" min="0" max="25" step="1" value="${Math.round((Number(p.maskFeather) || 0) * 100)}" title="Protected-region transition width"${hasRegion && p.maskMode === 'exclude' ? '' : ' disabled'}></label>
                    <button class="flex-pin-side-btn ${side === 'below' ? 'active' : ''}" data-idx="${i}" data-side="below" title="Bend below this anchor">Below</button>
                    <button class="flex-pin-side-btn ${side === 'above' ? 'active' : ''}" data-idx="${i}" data-side="above" title="Bend above this anchor">Above</button>
                </div>
                <div class="flex-pin-region-actions">
                    <button class="flex-pin-region-include-btn" data-idx="${i}" title="Draw region this anchor can bend">Bend Region</button>
                    <button class="flex-pin-region-exclude-btn" data-idx="${i}" title="Draw region this anchor must keep fixed">Fixed Region</button>
                    <button class="flex-pin-region-clear-btn" data-idx="${i}" title="Clear linked region"${hasRegion ? '' : ' disabled'}>Clear Region</button>
                </div>
            </div>`;
        }).join('');

        if (this._flexRegionEdit) {
            const activePin = this._flexRegionEdit.pinIdx;
            const modeLabel = this._flexRegionEdit.mode === 'include' ? 'Bend Region' : 'Fixed Region';
            listEl.insertAdjacentHTML('beforeend', `<div class="flex-region-edit-controls">
                <span>Editing Anchor ${activePin + 1}: ${modeLabel} (${this._flexRegionEdit.points.length} points)</span>
                <button class="flex-region-finish-btn" title="Finish region">Finish</button>
                <button class="flex-region-cancel-btn" title="Cancel region">Cancel</button>
            </div>`);
        }

        // Bind events
        const syncAnchorAngleInputs = (idx, value) => {
            const item = listEl.querySelector(`.flex-pin-item[data-idx=\"${idx}\"]`);
            if (!item) return;
            const rounded = Math.round(value);
            const readout = item.querySelector('.flex-pin-angle-readout');
            const slider = item.querySelector('.flex-pin-angle-slider');
            const number = item.querySelector('.flex-pin-angle-number');
            if (readout) readout.textContent = `${rounded}°`;
            if (slider) slider.value = String(rounded);
            if (number) number.value = String(rounded);
        };
        const syncRegionStrengthInputs = (idx, value) => {
            const item = listEl.querySelector(`.flex-pin-item[data-idx=\"${idx}\"]`);
            if (!item) return;
            const rounded = Math.max(0, Math.min(100, Math.round(value)));
            const slider = item.querySelector('.flex-pin-region-strength-slider');
            const number = item.querySelector('.flex-pin-region-strength-number');
            if (slider) slider.value = String(rounded);
            if (number) number.value = String(rounded);
        };

        listEl.querySelectorAll('.flex-pin-angle-slider').forEach(sl => {
            sl.addEventListener('pointerdown', () => {
                if (this._isRecording) this._snapshotForRecording(false);
            });
            sl.addEventListener('input', (e) => {
                const idx = parseInt(sl.dataset.idx);
                const nextVal = parseFloat(e.target.value);
                this.setFlexPinAngle(idx, nextVal);
                syncAnchorAngleInputs(idx, nextVal);
            });
            sl.addEventListener('change', () => {
                eventBus.emit('history:push');
                if (this._isRecording && this._recordSnapshots) this._showRecordingConfirm();
            });
        });
        listEl.querySelectorAll('.flex-pin-angle-number').forEach(inp => {
            inp.addEventListener('focus', () => {
                if (this._isRecording) this._snapshotForRecording(false);
            });
            inp.addEventListener('input', (e) => {
                const idx = parseInt(inp.dataset.idx);
                const raw = Number(e.target.value);
                if (!Number.isFinite(raw)) return;
                const clamped = Math.max(-360, Math.min(360, raw));
                this.setFlexPinAngle(idx, clamped);
                syncAnchorAngleInputs(idx, clamped);
            });
            inp.addEventListener('change', (e) => {
                const idx = parseInt(inp.dataset.idx);
                const raw = Number(e.target.value);
                const clamped = Number.isFinite(raw) ? Math.max(-360, Math.min(360, raw)) : 0;
                this.setFlexPinAngle(idx, clamped);
                syncAnchorAngleInputs(idx, clamped);
                eventBus.emit('history:push');
                if (this._isRecording && this._recordSnapshots) this._showRecordingConfirm();
            });
        });
        listEl.querySelectorAll('.flex-pin-lock-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const pin = this._flexObj?.flexPins[idx];
                if (!pin) return;
                pin.locked = !pin.locked;
                this._updateFlexPinList();
                this.stage.requestRender();
                eventBus.emit('history:push');
                Utils.showToast(pin.locked ? `📌 Anchor ${idx + 1} locked — won't bend` : `Anchor ${idx + 1} unlocked`, 'info');
            });
        });
        listEl.querySelectorAll('.flex-pin-remove-btn').forEach(btn => {
            btn.addEventListener('click', () => this.removeFlexPin(parseInt(btn.dataset.idx)));
        });
        listEl.querySelectorAll('.flex-pin-region-include-btn').forEach(btn => {
            btn.addEventListener('click', () => this._startFlexPinRegionEdit(parseInt(btn.dataset.idx), 'include'));
        });
        listEl.querySelectorAll('.flex-pin-region-exclude-btn').forEach(btn => {
            btn.addEventListener('click', () => this._startFlexPinRegionEdit(parseInt(btn.dataset.idx), 'exclude'));
        });
        listEl.querySelectorAll('.flex-pin-region-clear-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const pin = this._flexObj?.flexPins?.[idx];
                if (!pin) return;
                delete pin.maskMode;
                delete pin.maskPathN;
                delete pin.maskStrength;
                delete pin.maskFeather;
                this._updateFlexPinList();
                this.stage.requestRender();
                eventBus.emit('history:push');
                Utils.showToast(`Anchor ${idx + 1}: linked region cleared.`, 'info');
            });
        });
        listEl.querySelectorAll('.flex-pin-feather').forEach(input => {
            input.addEventListener('input', () => {
                const pin = this._flexObj?.flexPins?.[Number(input.dataset.idx)];
                if (!pin) return;
                pin.maskFeather = Math.max(0, Math.min(.25, Number(input.value) / 100));
                this.stage.requestRender();
            });
            input.addEventListener('change', () => eventBus.emit('history:push'));
        });
        listEl.querySelectorAll('.flex-pin-region-strength-slider').forEach(sl => {
            sl.addEventListener('input', (e) => {
                const idx = parseInt(sl.dataset.idx);
                const pin = this._flexObj?.flexPins?.[idx];
                if (!pin || !Array.isArray(pin.maskPathN) || pin.maskPathN.length < 3) return;
                const strengthPct = Number(e.target.value);
                pin.maskStrength = Math.max(0, Math.min(1, strengthPct / 100));
                syncRegionStrengthInputs(idx, strengthPct);
                this.stage.requestRender();
            });
            sl.addEventListener('change', () => {
                eventBus.emit('history:push');
                if (this._isRecording && this._recordSnapshots) this._showRecordingConfirm();
            });
        });
        listEl.querySelectorAll('.flex-pin-region-strength-number').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const idx = parseInt(inp.dataset.idx);
                const pin = this._flexObj?.flexPins?.[idx];
                if (!pin || !Array.isArray(pin.maskPathN) || pin.maskPathN.length < 3) return;
                const raw = Number(e.target.value);
                if (!Number.isFinite(raw)) return;
                const clamped = Math.max(0, Math.min(100, raw));
                pin.maskStrength = clamped / 100;
                syncRegionStrengthInputs(idx, clamped);
                this.stage.requestRender();
            });
            inp.addEventListener('change', (e) => {
                const idx = parseInt(inp.dataset.idx);
                const pin = this._flexObj?.flexPins?.[idx];
                if (!pin || !Array.isArray(pin.maskPathN) || pin.maskPathN.length < 3) return;
                const raw = Number(e.target.value);
                const clamped = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 100;
                pin.maskStrength = clamped / 100;
                syncRegionStrengthInputs(idx, clamped);
                eventBus.emit('history:push');
                if (this._isRecording && this._recordSnapshots) this._showRecordingConfirm();
            });
        });
        listEl.querySelectorAll('.flex-pin-side-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const side = btn.dataset.side === 'above' ? 'above' : 'below';
                const pin = this._flexObj?.flexPins?.[idx];
                if (!pin) return;
                pin.influenceSide = side;
                this._updateFlexPinList();
                this.stage.requestRender();
                eventBus.emit('history:push');
                Utils.showToast(`Anchor ${idx + 1}: bending ${side}.`, 'info');
            });
        });
        listEl.querySelectorAll('.flex-region-finish-btn').forEach(btn => {
            btn.addEventListener('click', () => this._finishFlexPinRegionEdit());
        });
        listEl.querySelectorAll('.flex-region-cancel-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._cancelFlexPinRegionEdit();
                this._updateFlexPinList();
            });
        });
    },

    // --- Flex mouse handlers ---

    _handleFlexMouseDown(pos) {
        const obj = this._flexObj;
        if (!obj) return;

        if (this._flexRegionEdit) {
            if (!this._isPointInsideFlexObject(obj, pos, 0)) {
                Utils.showToast('Click inside the object bounds to draw the region.', 'warning');
                return;
            }
            const local = this._flexStageToLocalNormalized(obj, pos);
            if (!local) return;
            const pts = this._flexRegionEdit.points;
            if (pts.length >= 3) {
                const first = pts[0];
                const fx = obj.x + first.x * obj.width;
                const fy = obj.y + first.y * obj.height;
                const closeThresh = 10 / Math.max(0.1, this.stage.zoom);
                if (Math.hypot(pos.x - fx, pos.y - fy) <= closeThresh) {
                    this._finishFlexPinRegionEdit();
                    this._updateFlexPinList();
                    return;
                }
            }
            pts.push(local);
            this._updateFlexPinList();
            this.stage.requestRender();
            return;
        }

        // Check if clicking on an existing anchor's bend handle
        const pinIdx = this._hitTestFlexHandle(pos);
        if (pinIdx >= 0) {
            if (obj.flexPins[pinIdx]?.locked) return; // skip locked pins
            if (this._isRecording) this._snapshotForRecording(false);
            this._flexDraggingPin = pinIdx;
            this._flexDragStart = { x: pos.x, y: pos.y };
            this._flexDragStartAngle = obj.flexPins[pinIdx].angle;
            this.stage.viewport.style.cursor = 'grabbing';
            return;
        }

        // Check if clicking on anchor dot itself (select it)
        const anchorIdx = this._hitTestFlexAnchor(pos);
        if (anchorIdx >= 0) {
            if (obj.flexPins[anchorIdx]?.locked) return; // skip locked pins
            if (this._isRecording) this._snapshotForRecording(false);
            // Start dragging this anchor's bend from current position
            this._flexDraggingPin = anchorIdx;
            this._flexDragStart = { x: pos.x, y: pos.y };
            this._flexDragStartAngle = obj.flexPins[anchorIdx].angle;
            this.stage.viewport.style.cursor = 'grabbing';
            return;
        }

        // Otherwise, add a new anchor at click position (if within object bounds)
        const isVertical = obj.flexDirection === 'vertical';
        const inBounds = isVertical
            ? (pos.y >= obj.y && pos.y <= obj.y + obj.height && Math.abs(pos.x - (obj.x + obj.width / 2)) < obj.width)
            : (pos.x >= obj.x && pos.x <= obj.x + obj.width && Math.abs(pos.y - (obj.y + obj.height / 2)) < obj.height);
        if (inBounds) {
            this.addFlexAnchor(pos.x, pos.y);
        }
    },

    _handleFlexMouseMove(pos) {
        const obj = this._flexObj;
        if (!obj) return;

        if (this._flexRegionEdit) {
            this._flexRegionHover = this._isPointInsideFlexObject(obj, pos, 0)
                ? this._flexStageToLocalNormalized(obj, pos)
                : null;
            this.stage.requestRender();
            return;
        }

        if (this._flexDraggingPin >= 0 && this._flexDragStart) {
            const pin = obj.flexPins[this._flexDraggingPin];
            if (!pin) return;

            // Calculate bend angle from perpendicular drag distance
            const isVertical = obj.flexDirection === 'vertical';
            let perpDist;
            if (isVertical) {
                perpDist = pos.x - this._flexDragStart.x;
            } else {
                perpDist = -(pos.y - this._flexDragStart.y);
            }

            // Map drag distance to angle: 100px drag ≈ 90°
            const sensitivity = 0.9;
            pin.angle = this._flexDragStartAngle + perpDist * sensitivity;
            pin.angle = Math.max(-360, Math.min(360, pin.angle));

            this._updateFlexPinList();
            this.stage.requestRender();
            return;
        }

        // Hover detection
        let hoverIdx = this._hitTestFlexHandle(pos);
        if (hoverIdx < 0) hoverIdx = this._hitTestFlexAnchor(pos);
        if (hoverIdx !== this._flexHoverPin) {
            this._flexHoverPin = hoverIdx;
            this.stage.viewport.style.cursor = hoverIdx >= 0 ? 'grab' : 'crosshair';
            this.stage.requestRender();
        }
    },

    _handleFlexMouseUp() {
        if (this._flexDraggingPin >= 0) {
            this._flexDraggingPin = -1;
            this._flexDragStart = null;
            this._flexDragStartAngle = 0;
            this.stage.viewport.style.cursor = this._flexHoverPin >= 0 ? 'grab' : 'crosshair';
            eventBus.emit('history:push');
            if (this._isRecording && this._recordSnapshots) this._showRecordingConfirm();
        }
    },

    /** Hit-test the perpendicular bend handle of a flex anchor */
    _hitTestFlexHandle(pos) {
        const obj = this._flexObj;
        if (!obj) return -1;
        const zoom = Math.max(0.1, this.stage.zoom);
        const threshold = 12 / zoom;
        const handleLen = 30 / zoom;
        const isVertical = obj.flexDirection === 'vertical';

        for (let i = obj.flexPins.length - 1; i >= 0; i--) {
            const pin = obj.flexPins[i];
            let ax, ay, hx, hy;
            if (isVertical) {
                ax = obj.x + obj.width / 2;
                ay = obj.y + obj.height * pin.position;
                hx = ax + handleLen * Math.sign(pin.angle || 1);
                hy = ay;
            } else {
                ax = obj.x + obj.width * pin.position;
                ay = obj.y + obj.height / 2;
                hx = ax;
                hy = ay - handleLen * Math.sign(pin.angle || 1);
            }
            if (Math.abs(pos.x - hx) < threshold && Math.abs(pos.y - hy) < threshold) {
                return i;
            }
        }
        return -1;
    },

    /** Hit-test a flex anchor dot */
    _hitTestFlexAnchor(pos) {
        const obj = this._flexObj;
        if (!obj) return -1;
        const threshold = 10 / Math.max(0.1, this.stage.zoom);
        const isVertical = obj.flexDirection === 'vertical';

        for (let i = obj.flexPins.length - 1; i >= 0; i--) {
            const pin = obj.flexPins[i];
            let ax, ay;
            if (isVertical) {
                ax = obj.x + obj.width / 2;
                ay = obj.y + obj.height * pin.position;
            } else {
                ax = obj.x + obj.width * pin.position;
                ay = obj.y + obj.height / 2;
            }
            if (Math.abs(pos.x - ax) < threshold && Math.abs(pos.y - ay) < threshold) {
                return i;
            }
        }
        return -1;
    },

    /** Draw flex mode overlay: anchor points, bend handles, target highlight */
    renderFlexOverlay(ctx) {
        if (!this._flexMode || !this._flexObj) return;
        const obj = this._flexObj;
        const zoom = Math.max(0.001, this.stage.zoom);
        const isVertical = obj.flexDirection === 'vertical';

        ctx.save();

        // Highlight the object bounds
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.5)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.setLineDash([]);

        // Draw center axis line
        ctx.strokeStyle = 'rgba(100, 200, 255, 0.3)';
        ctx.lineWidth = 1 / zoom;
        if (isVertical) {
            const cx = obj.x + obj.width / 2;
            ctx.beginPath(); ctx.moveTo(cx, obj.y); ctx.lineTo(cx, obj.y + obj.height); ctx.stroke();
        } else {
            const cy = obj.y + obj.height / 2;
            ctx.beginPath(); ctx.moveTo(obj.x, cy); ctx.lineTo(obj.x + obj.width, cy); ctx.stroke();
        }

        // Draw each anchor with its bend handle
        const pinR = 6 / zoom;
        const handleLen = 30 / zoom;

        obj.flexPins.forEach((pin, i) => {
            let ax, ay;
            if (isVertical) {
                ax = obj.x + obj.width / 2;
                ay = obj.y + obj.height * pin.position;
            } else {
                ax = obj.x + obj.width * pin.position;
                ay = obj.y + obj.height / 2;
            }

            // Anchor dot
            ctx.beginPath();
            ctx.arc(ax, ay, pinR, 0, Math.PI * 2);
            ctx.fillStyle = i === this._flexHoverPin ? '#ff9800' : '#ff5722';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5 / zoom;
            ctx.stroke();

            // Bend handle line + circle
            const bent = Math.abs(pin.angle) > 0.1;
            let hx, hy;
            if (isVertical) {
                hx = ax + (bent ? handleLen * Math.sign(pin.angle) : handleLen);
                hy = ay;
            } else {
                hx = ax;
                hy = ay - (bent ? handleLen * Math.sign(pin.angle) : -handleLen);
            }

            ctx.strokeStyle = bent ? '#00e676' : 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 1.5 / zoom;
            ctx.beginPath();
            ctx.moveTo(ax, ay);
            ctx.lineTo(hx, hy);
            ctx.stroke();

            // Handle circle
            ctx.beginPath();
            ctx.arc(hx, hy, 4 / zoom, 0, Math.PI * 2);
            ctx.fillStyle = bent ? '#00e676' : '#aaa';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();

            // Angle label
            if (bent) {
                ctx.fillStyle = '#fff';
                ctx.font = `${10 / zoom}px Inter, sans-serif`;
                ctx.textAlign = 'center';
                const labelY = isVertical ? ay - pinR - 4 / zoom : hy - 8 / zoom;
                const labelX = isVertical ? hx : ax;
                ctx.fillText(`${Math.round(pin.angle)}°`, labelX, labelY);
            }

            const region = Array.isArray(pin.maskPathN) ? pin.maskPathN : null;
            if (region && region.length >= 3) {
                ctx.save();
                ctx.beginPath();
                region.forEach((pt, idx) => {
                    const px = obj.x + pt.x * obj.width;
                    const py = obj.y + pt.y * obj.height;
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                ctx.closePath();
                const include = pin.maskMode === 'include';
                ctx.fillStyle = include ? 'rgba(0, 220, 120, 0.16)' : 'rgba(255, 80, 80, 0.16)';
                ctx.strokeStyle = include ? 'rgba(0, 220, 120, 0.95)' : 'rgba(255, 80, 80, 0.95)';
                ctx.lineWidth = 1.5 / zoom;
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        });

        if (this._flexRegionEdit) {
            const pts = this._flexRegionEdit.points || [];
            const hover = this._flexRegionHover;
            const include = this._flexRegionEdit.mode === 'include';
            const color = include ? '#00e676' : '#ff5252';

            if (pts.length) {
                ctx.beginPath();
                pts.forEach((pt, idx) => {
                    const px = obj.x + pt.x * obj.width;
                    const py = obj.y + pt.y * obj.height;
                    if (idx === 0) ctx.moveTo(px, py);
                    else ctx.lineTo(px, py);
                });
                if (hover) ctx.lineTo(obj.x + hover.x * obj.width, obj.y + hover.y * obj.height);
                ctx.strokeStyle = color;
                ctx.lineWidth = 2 / zoom;
                ctx.setLineDash([5 / zoom, 4 / zoom]);
                ctx.stroke();
                ctx.setLineDash([]);

                pts.forEach((pt, idx) => {
                    const px = obj.x + pt.x * obj.width;
                    const py = obj.y + pt.y * obj.height;
                    ctx.beginPath();
                    ctx.arc(px, py, 4 / zoom, 0, Math.PI * 2);
                    ctx.fillStyle = idx === 0 ? '#ffd54f' : color;
                    ctx.fill();
                    ctx.strokeStyle = '#fff';
                    ctx.lineWidth = 1 / zoom;
                    ctx.stroke();
                });
            }

            ctx.fillStyle = '#fff';
            ctx.font = `${11 / zoom}px Inter, sans-serif`;
            ctx.textAlign = 'left';
            ctx.fillText(
                include
                    ? 'Drawing bendable region: click points, then click first point or Finish.'
                    : 'Drawing fixed region: click points, then click first point or Finish.',
                obj.x,
                obj.y - 8 / zoom
            );
        }

        ctx.restore();
    },

    cropImage() {
        const obj = this._cropMode ? this._cropObj : this.getSelectedObjects().find(o => o.type === 'image');
        if (!obj || !obj.imageElement) {
            Utils.showToast('No image selected or image not loaded', 'warning');
            return;
        }

        const left = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-left')?.value) || 0));
        const top = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-top')?.value) || 0));
        const right = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-right')?.value) || 100));
        const bottom = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-bottom')?.value) || 100));

        if (left >= right || top >= bottom) {
            Utils.showToast('Invalid crop region', 'warning');
            return;
        }

        const natW = obj.imageElement.naturalWidth;
        const natH = obj.imageElement.naturalHeight;
        const sx = Math.round(natW * left / 100);
        const sy = Math.round(natH * top / 100);
        const sw = Math.round(natW * (right - left) / 100);
        const sh = Math.round(natH * (bottom - top) / 100);

        if (typeof this._applySvgAvatarVectorCrop === 'function' && this._applySvgAvatarVectorCrop(obj, {
            left: sx,
            top: sy,
            width: sw,
            height: sh,
            sourceWidth: natW,
            sourceHeight: natH
        })) {
            this.exitCropMode();
            ['crop-left', 'crop-top'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 0; });
            ['crop-right', 'crop-bottom'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 100; });
            this.stage.requestRender();
            this.updatePropertiesPanel?.();
            Utils.showToast('SVG avatar cropped without rasterizing', 'success');
            eventBus.emit('history:push');
            return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(obj.imageElement, sx, sy, sw, sh, 0, 0, sw, sh);

        const newSrc = canvas.toDataURL('image/png');
        // Adjust object dimensions proportionally
        const scaleW = obj.width / natW;
        const scaleH = obj.height / natH;
        obj.width = sw * scaleW;
        obj.height = sh * scaleH;
        obj.x += sx * scaleW;
        obj.y += sy * scaleH;
        obj.imageSrc = newSrc;
        obj.loadImage(newSrc);

        this.exitCropMode();
        // Reset crop inputs
        ['crop-left', 'crop-top'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 0; });
        ['crop-right', 'crop-bottom'].forEach(id => { const el = document.getElementById(id); if (el) el.value = 100; });
        Utils.showToast('Image cropped', 'success');
        eventBus.emit('history:push');
    },

    autoCropImageObject(targetObj = null, options = {}) {
        const obj = targetObj || this.getSelectedObjects().find(o => o.type === 'image');
        if (!obj || !obj.imageElement) {
            Utils.showToast('Select a loaded image first to auto-crop', 'warning');
            return false;
        }

        const natW = obj.imageElement.naturalWidth;
        const natH = obj.imageElement.naturalHeight;
        if (!natW || !natH) {
            Utils.showToast('Image is not ready for auto-crop yet', 'warning');
            return false;
        }

        // Snapshot pre-crop state so we can offer an Undo / Reject path.
        const preSnapshot = {
            id: obj.id,
            imageSrc: obj.imageSrc,
            svgAvatar: obj._svgAvatar ? JSON.parse(JSON.stringify(obj._svgAvatar)) : null,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height
        };

        const canvas = document.createElement('canvas');
        canvas.width = natW;
        canvas.height = natH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(obj.imageElement, 0, 0, natW, natH);

        const trim = this._trimCanvas(canvas);
        const changed = trim.offX !== 0 || trim.offY !== 0 || trim.width !== natW || trim.height !== natH;

        this.select([obj.id]);

        if (!changed) {
            if (options.openEditor !== false) {
                this.enterCropMode({
                    object: obj,
                    message: 'No transparent border found. Crop editor opened for manual adjustment.'
                });
            } else {
                Utils.showToast('No transparent border found to auto-crop', 'info');
            }
            return false;
        }

        const scaleW = obj.width / natW;
        const scaleH = obj.height / natH;
        if (typeof this._applySvgAvatarVectorCrop === 'function' && this._applySvgAvatarVectorCrop(obj, {
            left: trim.offX,
            top: trim.offY,
            width: trim.width,
            height: trim.height,
            sourceWidth: natW,
            sourceHeight: natH
        })) {
            if (options.openEditor !== false) {
                this.enterCropMode({
                    object: obj,
                    message: 'Auto-cropped SVG avatar without rasterizing. Use crop handles to refine.'
                });
            } else {
                this.stage.requestRender();
                Utils.showToast('SVG avatar auto-cropped without rasterizing', 'success');
            }
            this._showAutoCropConfirm(obj, preSnapshot);
            eventBus.emit('history:push');
            return true;
        }

        obj.width = trim.width * scaleW;
        obj.height = trim.height * scaleH;
        obj.x += trim.offX * scaleW;
        obj.y += trim.offY * scaleH;
        const newSrc = trim.canvas.toDataURL('image/png');
        obj.imageSrc = newSrc;
        obj.loadImage(newSrc);

        if (options.openEditor !== false) {
            this.enterCropMode({
                object: obj,
                message: 'Auto-cropped. Use ✓ Accept or ✗ Undo by the image, or drag handles to refine.'
            });
        } else {
            this.stage.requestRender();
            Utils.showToast('Image auto-cropped', 'success');
        }

        // Floating Accept / Reject buttons by the image so the user always has
        // a clear way out even when the side panel is hidden.
        this._showAutoCropConfirm(obj, preSnapshot);

        eventBus.emit('history:push');
        return true;
    },

    _showAutoCropConfirm(obj, preSnapshot) {
        if (!obj || !preSnapshot) return;
        // Tear down any previous instance first
        this._dismissAutoCropConfirm();

        const panel = document.createElement('div');
        panel.className = 'autocrop-confirm';
        panel.setAttribute('role', 'group');
        panel.setAttribute('aria-label', 'Auto-crop confirmation');
        panel.innerHTML = `
            <div class="autocrop-confirm-label">Auto-Crop</div>
            <button type="button" class="autocrop-confirm-btn autocrop-confirm-accept" title="Keep the auto-crop (Enter)">
                <span class="autocrop-confirm-icon">✓</span><span>Accept</span>
            </button>
            <button type="button" class="autocrop-confirm-btn autocrop-confirm-reject" title="Undo the auto-crop (Esc)">
                <span class="autocrop-confirm-icon">✗</span><span>Undo</span>
            </button>
        `;
        document.body.appendChild(panel);

        const accept = () => {
            this._dismissAutoCropConfirm();
            if (this._cropMode) this.exitCropMode();
            Utils.showToast('Auto-crop accepted', 'success');
        };
        const reject = () => {
            // Restore pre-crop state on the same object
            const target = this.getObjectById(preSnapshot.id) || obj;
            if (target) {
                target.x = preSnapshot.x;
                target.y = preSnapshot.y;
                target.width = preSnapshot.width;
                target.height = preSnapshot.height;
                target.imageSrc = preSnapshot.imageSrc;
                target._svgAvatar = preSnapshot.svgAvatar ? JSON.parse(JSON.stringify(preSnapshot.svgAvatar)) : target._svgAvatar;
                if (typeof target.loadImage === 'function') target.loadImage(preSnapshot.imageSrc);
            }
            this._dismissAutoCropConfirm();
            if (this._cropMode) this.exitCropMode();
            this.updateProperties?.();
            this.stage.requestRender();
            eventBus.emit('history:push');
            Utils.showToast('Auto-crop undone', 'info');
        };

        panel.querySelector('.autocrop-confirm-accept').addEventListener('click', accept);
        panel.querySelector('.autocrop-confirm-reject').addEventListener('click', reject);

        const onKey = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); reject(); }
            else if (e.key === 'Enter') { e.preventDefault(); accept(); }
        };
        const onSelectionChange = (ids) => {
            if (!Array.isArray(ids) || !ids.includes(preSnapshot.id)) accept();
        };

        document.addEventListener('keydown', onKey);
        eventBus.on?.('selection:changed', onSelectionChange);

        // Reposition each animation frame so it tracks pan/zoom/object moves.
        let raf = 0;
        const reposition = () => {
            if (!panel.isConnected) return;
            const target = this.getObjectById(preSnapshot.id);
            const stage = this.stage;
            if (!target || !stage || typeof stage.stageToScreen !== 'function') {
                raf = requestAnimationFrame(reposition);
                return;
            }
            const topRight = stage.stageToScreen(target.x + (target.width || 0), target.y);
            // Place the panel just to the right of the image's top-right corner.
            const px = Math.round(topRight.x) + 12;
            const py = Math.round(topRight.y);
            const maxX = window.innerWidth - panel.offsetWidth - 8;
            const maxY = window.innerHeight - panel.offsetHeight - 8;
            panel.style.left = Math.max(8, Math.min(px, maxX)) + 'px';
            panel.style.top = Math.max(8, Math.min(py, maxY)) + 'px';
            raf = requestAnimationFrame(reposition);
        };
        raf = requestAnimationFrame(reposition);

        this._autoCropConfirm = {
            panel,
            cleanup: () => {
                if (raf) cancelAnimationFrame(raf);
                document.removeEventListener('keydown', onKey);
                eventBus.off?.('selection:changed', onSelectionChange);
                if (panel.isConnected) panel.remove();
            }
        };
    },

    _dismissAutoCropConfirm() {
        if (this._autoCropConfirm && typeof this._autoCropConfirm.cleanup === 'function') {
            this._autoCropConfirm.cleanup();
        }
        this._autoCropConfirm = null;
    },

    // Alignment
    alignObjects(align) {
        // If in group edit mode, align group members instead
        if (this._groupEditMode) {
            this.alignGroupObjects(align);
            return;
        }

        const selected = this.getSelectedObjects();
        if (selected.length < 2 && !['center-h', 'center-v'].includes(align)) return;

        // Helper: move an object and also translate its absolute pathPoints
        const moveObj = (obj, newX, newY) => {
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                const dx = newX - obj.x, dy = newY - obj.y;
                if (dx !== 0 || dy !== 0) {
                    obj.pathPoints.forEach(p => { p.x += dx; p.y += dy; });
                }
            }
            obj.x = newX;
            obj.y = newY;
        };

        if (selected.length === 1) {
            const obj = selected[0];
            switch (align) {
                case 'center-h':
                    moveObj(obj, (this.stage.width - obj.width) / 2, obj.y);
                    break;
                case 'center-v':
                    moveObj(obj, obj.x, (this.stage.height - obj.height) / 2);
                    break;
            }
        } else {
            const bounds = selected.map(o => o.getBounds());
            const minX = Math.min(...bounds.map(b => b.x));
            const maxRight = Math.max(...bounds.map(b => b.right));
            const minY = Math.min(...bounds.map(b => b.y));
            const maxBottom = Math.max(...bounds.map(b => b.bottom));

            switch (align) {
                case 'left':
                    selected.forEach(o => moveObj(o, minX, o.y));
                    break;
                case 'right':
                    selected.forEach(o => moveObj(o, maxRight - o.width, o.y));
                    break;
                case 'center-h':
                    const centerX = (minX + maxRight) / 2;
                    selected.forEach(o => moveObj(o, centerX - o.width / 2, o.y));
                    break;
                case 'top':
                    selected.forEach(o => moveObj(o, o.x, minY));
                    break;
                case 'bottom':
                    selected.forEach(o => moveObj(o, o.x, maxBottom - o.height));
                    break;
                case 'center-v':
                    const centerY = (minY + maxBottom) / 2;
                    selected.forEach(o => moveObj(o, o.x, centerY - o.height / 2));
                    break;
                case 'distribute-h': {
                    if (selected.length < 2) return;
                    const userGapH = parseFloat(document.getElementById('distribute-gap')?.value) || 20;
                    const sortedH = [...selected].sort((a, b) => a.x - b.x);
                    const totalW = sortedH.reduce((s, o) => s + o.width, 0);
                    const availableW = maxRight - minX;
                    const autoGapH = (availableW - totalW) / (selected.length - 1);
                    // Use auto gap only if objects were already spread apart; otherwise use user gap
                    const gapH = (selected.length > 2 && autoGapH > 1) ? autoGapH : userGapH;
                    const totalSpan = totalW + gapH * (selected.length - 1);
                    // Center the distributed row on the collective midpoint
                    const midX = (minX + maxRight) / 2;
                    let currentX = midX - totalSpan / 2;
                    sortedH.forEach(o => {
                        moveObj(o, currentX, o.y);
                        currentX += o.width + gapH;
                    });
                    break;
                }
                case 'distribute-v': {
                    if (selected.length < 2) return;
                    const userGapV = parseFloat(document.getElementById('distribute-gap')?.value) || 20;
                    const sortedV = [...selected].sort((a, b) => a.y - b.y);
                    const totalH = sortedV.reduce((s, o) => s + o.height, 0);
                    const availableH = maxBottom - minY;
                    const autoGapV = (availableH - totalH) / (selected.length - 1);
                    const gapV = (selected.length > 2 && autoGapV > 1) ? autoGapV : userGapV;
                    const totalSpanV = totalH + gapV * (selected.length - 1);
                    const midY = (minY + maxBottom) / 2;
                    let currentY = midY - totalSpanV / 2;
                    sortedV.forEach(o => {
                        moveObj(o, o.x, currentY);
                        currentY += o.height + gapV;
                    });
                    break;
                }
            }
        }

        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    // Properties panel

});
