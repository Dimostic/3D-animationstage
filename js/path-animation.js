/* ============================================
   Animation Stage - Path Animation System
   Move objects along the outline of other shapes
   ============================================ */

class PathAnimationManager {
    constructor(stageManager, objectManager, animationEngine) {
        this.stage = stageManager;
        this.objects = objectManager;
        this.animations = animationEngine;

        // Picking state
        this.isPicking = false;
        this.pickMode = null; // 'shape' or 'mover'
        this.pathShapeId = null;
        this.moverId = null;

        // Snap-pick state (for start/end on path)
        this.isSnapPicking = false;
        this.snapPickTarget = null; // 'start' or 'end'

        // Path cache
        this._cachedPath = null;
        this._cachedPathId = null;

        this.init();
    }

    init() {
        this.bindEvents();

        // Hook into stage render for path preview visualization
        eventBus.on('stage:render-overlay', (ctx) => {
            this.renderPathPreview(ctx);
        });

        // Auto-clean stale references when objects are deleted
        eventBus.on('object:removed', (removedObj) => {
            if (!removedObj) return;
            const id = removedObj.id;

            // Clear path shape reference
            if (this.pathShapeId === id) {
                this.pathShapeId = null;
                this._cachedPath = null;
                this._cachedPathId = null;
            }
            // Clear mover reference
            if (this.moverId === id) {
                this.moverId = null;
            }
            // Clear cached path for this object
            if (this._pathCache) delete this._pathCache[id];

            // Remove animations referencing this object's path from other objects
            this.objects.objects.forEach(obj => {
                obj.animations = obj.animations.filter(anim => {
                    if (anim.params?.pathShapeId === id) return false;
                    return true;
                });
            });

            this.updateUI();
            this.stage.requestRender();
        });
    }

    bindEvents() {
        document.getElementById('path-anim-builder')?.addEventListener('pointerdown', () => {
            this._showImplementationToolbar();
        });

        // Pick path shape
        document.getElementById('btn-pick-path-shape')?.addEventListener('click', () => {
            this.startPick('shape');
        });

        // Pick mover object
        document.getElementById('btn-pick-path-mover')?.addEventListener('click', () => {
            this.startPick('mover');
        });

        // Clear selections
        document.getElementById('btn-clear-path-shape')?.addEventListener('click', () => {
            this.pathShapeId = null;
            this._cachedPath = null;
            this._cachedPathId = null;
            this.updateUI();
            this.stage.requestRender();
        });

        document.getElementById('btn-clear-path-mover')?.addEventListener('click', () => {
            this.moverId = null;
            this.updateUI();
        });

        // Range sliders
        document.getElementById('path-start-pct')?.addEventListener('input', (e) => {
            document.getElementById('path-start-val').textContent = e.target.value + '%';
            this.stage.requestRender();
        });
        document.getElementById('path-end-pct')?.addEventListener('input', (e) => {
            document.getElementById('path-end-val').textContent = e.target.value + '%';
            this.stage.requestRender();
        });

        // Snap-pick start/end on path shape
        document.getElementById('btn-snap-start')?.addEventListener('click', () => {
            this.startSnapPick('start');
        });
        document.getElementById('btn-snap-end')?.addEventListener('click', () => {
            this.startSnapPick('end');
        });
        document.getElementById('btn-path-full-loop')?.addEventListener('click', () => {
            this.applyFullLoopPreset();
        });

        // Apply and preview
        document.getElementById('btn-apply-path-anim')?.addEventListener('click', () => {
            this.applyPathAnimation(false);
        });

        document.getElementById('btn-preview-path-anim')?.addEventListener('click', () => {
            this.applyPathAnimation(true);
        });

        // Listen for stage clicks during picking
        eventBus.on('stage:click', (pos) => {
            if (this.isSnapPicking) {
                this.handleSnapPickClick(pos);
                return;
            }
            if (!this.isPicking) return;
            this.handlePickClick(pos);
        });
    }

    _showImplementationToolbar() {
        if (typeof this.objects?._showImplementationFloatingToolbar !== 'function') return;
        this.objects._showImplementationFloatingToolbar({
            tool: 'animation-path',
            label: 'Path Animation',
            hint: 'Apply path animation or cancel picking',
            onApply: () => this.applyPathAnimation(false),
            onCancel: () => {
                this.cancelPick();
                this.cancelSnapPick();
                if (typeof this.animations?.cancelAnimation === 'function') this.animations.cancelAnimation();
            }
        });
    }

    _hideImplementationToolbar() {
        if (typeof this.objects?._hideImplementationFloatingToolbar !== 'function') return;
        this.objects._hideImplementationFloatingToolbar('animation-path');
    }

    startPick(mode) {
        this.isPicking = true;
        this.pickMode = mode;
        this.stage.viewport.style.cursor = 'crosshair';
        this.objects._pathPickActive = true;

        // Highlight active button
        if (mode === 'shape') {
            document.getElementById('btn-pick-path-shape')?.classList.add('active');
        } else {
            document.getElementById('btn-pick-path-mover')?.classList.add('active');
        }

        const label = mode === 'shape' ? 'path shape' : 'object to animate';
        Utils.showToast(`Click on the ${label} on the stage`, 'info');
    }

    cancelPick() {
        this.isPicking = false;
        this.pickMode = null;
        this.stage.viewport.style.cursor = '';
        this.objects._pathPickActive = false;
        document.getElementById('btn-pick-path-shape')?.classList.remove('active');
        document.getElementById('btn-pick-path-mover')?.classList.remove('active');
    }

    // ============================
    // SNAP-PICK: Click on path shape to set start/end %
    // ============================

    startSnapPick(target) {
        if (!this.pathShapeId) {
            Utils.showToast('Pick a path shape first', 'warning');
            return;
        }
        this.isSnapPicking = true;
        this.snapPickTarget = target;
        this.objects._pathPickActive = true;
        this.stage.viewport.style.cursor = 'crosshair';
        const btn = document.getElementById(target === 'start' ? 'btn-snap-start' : 'btn-snap-end');
        btn?.classList.add('active');
        Utils.showToast(`Click on the path shape to set the ${target} point`, 'info');
    }

    cancelSnapPick() {
        this.isSnapPicking = false;
        this.snapPickTarget = null;
        this.objects._pathPickActive = false;
        this.stage.viewport.style.cursor = '';
        document.getElementById('btn-snap-start')?.classList.remove('active');
        document.getElementById('btn-snap-end')?.classList.remove('active');
    }

    handleSnapPickClick(pos) {
        const pathObj = this.objects.getObjectById(this.pathShapeId);
        if (!pathObj) {
            this.cancelSnapPick();
            return;
        }

        // Get path points and find the closest point to the click
        const pathPoints = this.getShapePath(pathObj, 500);
        if (pathPoints.length < 2) {
            this.cancelSnapPick();
            return;
        }

        let closestIdx = 0;
        let closestDist = Infinity;
        for (let i = 0; i < pathPoints.length; i++) {
            const dx = pathPoints[i].x - pos.x;
            const dy = pathPoints[i].y - pos.y;
            const d = dx * dx + dy * dy;
            if (d < closestDist) {
                closestDist = d;
                closestIdx = i;
            }
        }

        const pct = Math.round((closestIdx / (pathPoints.length - 1)) * 100);
        const target = this.snapPickTarget;
        const sliderId = target === 'start' ? 'path-start-pct' : 'path-end-pct';
        const valId = target === 'start' ? 'path-start-val' : 'path-end-val';

        const slider = document.getElementById(sliderId);
        if (slider) slider.value = pct;
        const valSpan = document.getElementById(valId);
        if (valSpan) valSpan.textContent = pct + '%';

        Utils.showToast(`${target === 'start' ? 'Start' : 'End'} point set to ${pct}%`, 'success');
        this.cancelSnapPick();
        this.stage.requestRender();
    }

    handlePickClick(pos) {
        const hit = this.objects.hitTest(pos.x, pos.y);
        if (!hit) {
            Utils.showToast('No object at that position', 'warning');
            return;
        }

        if (this.pickMode === 'shape') {
            this.pathShapeId = hit.id;
            this._cachedPath = null;
            this._cachedPathId = null;
            Utils.showToast(`Path shape set: ${hit.name}`, 'success');
        } else if (this.pickMode === 'mover') {
            if (hit.id === this.pathShapeId) {
                Utils.showToast('Object cannot move along itself', 'warning');
                return;
            }
            this.moverId = hit.id;
            Utils.showToast(`Moving object set: ${hit.name}`, 'success');
        }

        this.cancelPick();
        this.updateUI();
        this.stage.requestRender();
    }

    applyFullLoopPreset() {
        const pathObj = this.pathShapeId ? this.objects.getObjectById(this.pathShapeId) : null;
        const startSlider = document.getElementById('path-start-pct');
        const endSlider = document.getElementById('path-end-pct');
        const startVal = document.getElementById('path-start-val');
        const endVal = document.getElementById('path-end-val');
        if (!startSlider || !endSlider) return;

        if (pathObj && this._isClosedPathObject(pathObj)) {
            endSlider.value = startSlider.value;
            if (endVal) endVal.textContent = `${endSlider.value}%`;
            Utils.showToast('Full loop enabled — the mover will return to its start point', 'success');
        } else {
            startSlider.value = '0';
            endSlider.value = '100';
            if (startVal) startVal.textContent = '0%';
            if (endVal) endVal.textContent = '100%';
            Utils.showToast('Range reset to full path', 'success');
        }
        this.stage.requestRender();
    }

    updateUI() {
        const shapeTag = document.getElementById('path-shape-name');
        const shapeBtn = document.getElementById('btn-pick-path-shape');
        const moverTag = document.getElementById('path-mover-name');
        const moverBtn = document.getElementById('btn-pick-path-mover');

        if (this.pathShapeId) {
            const obj = this.objects.getObjectById(this.pathShapeId);
            if (obj) {
                shapeTag?.classList.remove('hidden');
                shapeTag.querySelector('.path-obj-label').textContent = obj.name;
                shapeBtn?.classList.add('hidden');
            }
        } else {
            shapeTag?.classList.add('hidden');
            shapeBtn?.classList.remove('hidden');
        }

        if (this.moverId) {
            const obj = this.objects.getObjectById(this.moverId);
            if (obj) {
                moverTag?.classList.remove('hidden');
                moverTag.querySelector('.path-obj-label').textContent = obj.name;
                moverBtn?.classList.add('hidden');
            }
        } else {
            moverTag?.classList.add('hidden');
            moverBtn?.classList.remove('hidden');
        }
    }

    // ============================
    // PATH POINT EXTRACTION
    // ============================

    /**
     * Extract evenly-spaced points along the outline of a shape.
     * Returns array of {x, y} in stage coordinates.
     * @param {StageObject} obj
     * @param {number} numPoints
     * @returns {{x:number,y:number}[]}
     */
    getShapePath(obj, numPoints = 200) {
        // Build a cache key from object id, geometry, and requested resolution
        const cacheKey = `${obj.id}_${obj.x}_${obj.y}_${obj.width}_${obj.height}_${obj.rotation}_${obj.type}_${numPoints}`;
        if (this._cachedPathKey === cacheKey && this._cachedPath) {
            return this._cachedPath;
        }

        let rawPoints;
        switch (obj.type) {
            case 'circle':
                rawPoints = this._getEllipsePath(obj, numPoints);
                break;
            case 'rectangle':
                rawPoints = this._getRectanglePath(obj, numPoints);
                break;
            case 'triangle':
                rawPoints = this._getTrianglePath(obj, numPoints);
                break;
            case 'line':
                rawPoints = this._getLinePath(obj, numPoints);
                break;
            case 'polygon':
                rawPoints = this._getPolygonPath(obj, numPoints);
                break;
            case 'star':
                rawPoints = this._getStarPath(obj, numPoints);
                break;
            case 'path':
                rawPoints = this._getFreeformPath(obj, numPoints);
                break;
            default:
                // For text/image, use bounding rectangle
                rawPoints = this._getRectanglePath(obj, numPoints);
                break;
        }

        // Apply rotation transform if shape is rotated
        if (obj.rotation !== 0) {
            const pivot = obj.getPivotPoint();
            const rad = Utils.degToRad(obj.rotation);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            rawPoints = rawPoints.map(p => {
                const dx = p.x - pivot.x;
                const dy = p.y - pivot.y;
                return {
                    x: pivot.x + dx * cos - dy * sin,
                    y: pivot.y + dx * sin + dy * cos
                };
            });
        }

        this._cachedPath = rawPoints;
        this._cachedPathKey = cacheKey;
        return rawPoints;
    }

    _getEllipsePath(obj, n) {
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const rx = obj.width / 2;
        const ry = obj.height / 2;
        const points = [];
        for (let i = 0; i < n; i++) {
            const angle = (i / n) * Math.PI * 2;
            points.push({
                x: cx + rx * Math.cos(angle),
                y: cy + ry * Math.sin(angle)
            });
        }
        return points;
    }

    _getRectanglePath(obj, n) {
        const corners = [
            { x: obj.x, y: obj.y },
            { x: obj.x + obj.width, y: obj.y },
            { x: obj.x + obj.width, y: obj.y + obj.height },
            { x: obj.x, y: obj.y + obj.height }
        ];
        return this._distributeAlongSegments(corners, n, true);
    }

    _getTrianglePath(obj, n) {
        const corners = [
            { x: obj.x + obj.width / 2, y: obj.y },
            { x: obj.x + obj.width, y: obj.y + obj.height },
            { x: obj.x, y: obj.y + obj.height }
        ];
        return this._distributeAlongSegments(corners, n, true);
    }

    _getLinePath(obj, n) {
        const start = { x: obj.x, y: obj.y };
        const end = { x: obj.x + obj.width, y: obj.y + obj.height };
        const points = [];
        for (let i = 0; i < n; i++) {
            const t = i / (n - 1);
            points.push({
                x: start.x + (end.x - start.x) * t,
                y: start.y + (end.y - start.y) * t
            });
        }
        return points;
    }

    _getPolygonPath(obj, n) {
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const r = Math.min(obj.width, obj.height) / 2;
        const sides = obj.sides || 5;
        const corners = [];
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            corners.push({
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle)
            });
        }
        return this._distributeAlongSegments(corners, n, true);
    }

    _getStarPath(obj, n) {
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        const outerR = Math.min(obj.width, obj.height) / 2;
        const innerR = outerR * (obj.innerRadius || 0.4);
        const sides = obj.sides || 5;
        const corners = [];
        for (let i = 0; i < sides * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (i * Math.PI / sides) - Math.PI / 2;
            corners.push({
                x: cx + r * Math.cos(angle),
                y: cy + r * Math.sin(angle)
            });
        }
        return this._distributeAlongSegments(corners, n, true);
    }

    _getFreeformPath(obj, n) {
        if (!obj.pathPoints || obj.pathPoints.length < 2) {
            return this._getRectanglePath(obj, n);
        }
        return this._distributeAlongSegments(obj.pathPoints, n, false);
    }

    _isClosedPathObject(obj) {
        if (!obj) return false;
        if (['circle', 'rectangle', 'triangle', 'polygon', 'star'].includes(obj.type)) return true;
        // Freeform/drawn paths should travel from the first drawn point to the last
        // by default. Treating them as cyclic makes 100% land back on 0%, which
        // looks like the mover ignored "keep final state".
        if (obj.type === 'path') return false;
        return false;
    }

    _getPathPointAt(pathPoints, t, closed = false) {
        if (!pathPoints || pathPoints.length === 0) return null;
        if (pathPoints.length === 1) {
            return { x: pathPoints[0].x, y: pathPoints[0].y, angle: 0 };
        }

        if (closed) {
            const count = pathPoints.length;
            const normalized = ((t % 1) + 1) % 1;
            const scaled = normalized * count;
            const baseIndex = Math.floor(scaled) % count;
            const nextIndex = (baseIndex + 1) % count;
            const frac = scaled - Math.floor(scaled);
            const p0 = pathPoints[baseIndex];
            const p1 = pathPoints[nextIndex];
            return {
                x: p0.x + (p1.x - p0.x) * frac,
                y: p0.y + (p1.y - p0.y) * frac,
                angle: Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI)
            };
        }

        return this.getPointOnPath(pathPoints, t);
    }

    _measurePolylineLength(points) {
        if (!Array.isArray(points) || points.length < 2) return 0;
        let total = 0;
        for (let i = 1; i < points.length; i++) {
            const dx = points[i].x - points[i - 1].x;
            const dy = points[i].y - points[i - 1].y;
            total += Math.sqrt(dx * dx + dy * dy);
        }
        return total;
    }

    _buildTravelPath(pathObj, pathPoints, startPct, endPct, reverse = false) {
        const closed = this._isClosedPathObject(pathObj);
        const safeStart = Math.max(0, Math.min(1, startPct));
        const safeEnd = Math.max(0, Math.min(1, endPct));
        const epsilon = 0.0001;

        let travelSpan;
        if (closed) {
            travelSpan = safeEnd - safeStart;
            if (Math.abs(travelSpan) < epsilon) {
                travelSpan = 1;
            } else if (travelSpan < 0) {
                travelSpan += 1;
            }
        } else {
            travelSpan = safeEnd - safeStart;
            if (Math.abs(travelSpan) < epsilon) {
                return { points: [], closed: false, fullLoop: false, effectiveStartPct: safeStart, effectiveEndPct: safeEnd };
            }
        }

        const stepCount = Math.max(2, Math.round((closed ? Math.abs(travelSpan) : Math.abs(travelSpan)) * pathPoints.length));
        const segment = [];
        const fullLoop = closed && Math.abs(safeEnd - safeStart) < epsilon;
        for (let i = 0; i <= stepCount; i++) {
            const t = i / stepCount;
            const progress = safeStart + travelSpan * t;
            const isFinalPoint = i === stepCount;
            const finalProgress = isFinalPoint && closed ? (fullLoop ? safeStart : safeEnd) : progress;
            const finalClosed = closed && !(isFinalPoint && safeEnd >= 1 - epsilon && !fullLoop);
            const point = this._getPathPointAt(pathPoints, finalProgress, finalClosed);
            if (point) segment.push(point);
        }

        const effectivePoints = reverse ? segment.slice().reverse() : segment;
        return {
            points: effectivePoints,
            closed,
            fullLoop,
            effectiveStartPct: reverse ? safeEnd : safeStart,
            effectiveEndPct: reverse ? safeStart : safeEnd
        };
    }

    /**
     * Distribute n points evenly along a polyline (optionally closed).
     */
    _distributeAlongSegments(corners, n, closed) {
        if (corners.length < 2) return corners;

        // Build segments
        const segments = [];
        for (let i = 0; i < corners.length - 1; i++) {
            segments.push({ from: corners[i], to: corners[i + 1] });
        }
        if (closed) {
            segments.push({ from: corners[corners.length - 1], to: corners[0] });
        }

        // Calculate lengths
        const lengths = segments.map(s => {
            const dx = s.to.x - s.from.x;
            const dy = s.to.y - s.from.y;
            return Math.sqrt(dx * dx + dy * dy);
        });
        const totalLen = lengths.reduce((a, b) => a + b, 0);
        if (totalLen === 0) return corners;

        // Distribute n points along total length
        const points = [];
        for (let i = 0; i < n; i++) {
            const dist = (i / n) * totalLen;
            let accumulated = 0;
            for (let s = 0; s < segments.length; s++) {
                if (accumulated + lengths[s] >= dist || s === segments.length - 1) {
                    const localT = lengths[s] > 0 ? (dist - accumulated) / lengths[s] : 0;
                    points.push({
                        x: segments[s].from.x + (segments[s].to.x - segments[s].from.x) * localT,
                        y: segments[s].from.y + (segments[s].to.y - segments[s].from.y) * localT
                    });
                    break;
                }
                accumulated += lengths[s];
            }
        }
        return points;
    }

    // ============================
    // INTERPOLATION
    // ============================

    /**
     * Get position (and optional angle) on path at progress t (0-1).
     */
    getPointOnPath(pathPoints, t) {
        t = Math.max(0, Math.min(1, t));
        const idx = t * (pathPoints.length - 1);
        const i = Math.floor(idx);
        const frac = idx - i;

        const p0 = pathPoints[Math.min(i, pathPoints.length - 1)];
        const p1 = pathPoints[Math.min(i + 1, pathPoints.length - 1)];

        const x = p0.x + (p1.x - p0.x) * frac;
        const y = p0.y + (p1.y - p0.y) * frac;

        // Angle (for align to path)
        const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);

        return { x, y, angle };
    }

    // ============================
    // APPLY / PREVIEW
    // ============================

    applyPathAnimation(previewOnly) {
        if (!this.pathShapeId) {
            Utils.showToast('Pick a path shape first', 'warning');
            return;
        }
        if (!this.moverId) {
            Utils.showToast('Pick an object to animate', 'warning');
            return;
        }

        const pathObj = this.objects.getObjectById(this.pathShapeId);
        const mover = this.objects.getObjectById(this.moverId);
        if (!pathObj || !mover) {
            Utils.showToast('Path shape or mover object not found', 'error');
            return;
        }

        const pathPoints = this.getShapePath(pathObj, 300);
        if (pathPoints.length < 2) {
            Utils.showToast('Could not extract path from shape', 'error');
            return;
        }

        const startPct = (parseInt(document.getElementById('path-start-pct')?.value) || 0) / 100;
        const endPct = (parseInt(document.getElementById('path-end-pct')?.value) || 100) / 100;
        const alignRotation = document.getElementById('path-align-rotation')?.checked || false;
        const reverseDirection = document.getElementById('path-reverse-direction')?.checked || false;

        // Use path-specific duration, speed, and easing fields
        const baseDuration = parseFloat(document.getElementById('path-duration')?.value) || 2;
        const speed = parseFloat(document.getElementById('path-speed')?.value) || 1;
        const duration = baseDuration / speed; // faster speed = shorter effective duration
        const easing = document.getElementById('path-easing')?.value || 'easeInOut';
        const repeat = document.getElementById('param-repeat')?.value || '1';
        const timing = this.animations?.getTimingParams
            ? this.animations.getTimingParams('path-timeline')
            : {
                startMode: 'after-previous',
                delay: 0,
                referenceObjectId: '',
                referenceRelation: 'after-reference',
                beginTime: null,
                endTime: null
            };

        const travelPath = this._buildTravelPath(pathObj, pathPoints, startPct, endPct, reverseDirection);
        if (travelPath.points.length < 2 || this._measurePolylineLength(travelPath.points) < 1) {
            Utils.showToast('Path range too small', 'warning');
            return;
        }

        if (previewOnly) {
            this._previewPathAnimation(mover, travelPath.points, duration, timing, easing, alignRotation);
        } else {
            this._applyPathAnimation(mover, travelPath, duration, timing, easing, repeat, alignRotation, baseDuration, speed, reverseDirection);
        }
    }

    _previewPathAnimation(mover, pathPoints, duration, timing, easing, alignRotation) {
        // Center the mover on the path point (offset by half dimensions)
        const offsetX = mover.width / 2;
        const offsetY = mover.height / 2;

        const easingFn = Utils.getEasing(easing);
        const baseDurationMs = duration * 1000;
        const schedule = this.animations?._resolveAnimationSchedule
            ? this.animations._resolveAnimationSchedule(timing, baseDurationMs, mover.animations || [])
            : { delayMs: (timing.delay || 0) * 1000, durationMs: baseDurationMs };
        if (schedule.error) {
            Utils.showToast(schedule.error, 'warning');
            return;
        }
        const startTime = performance.now() + schedule.delayMs;
        const durationMs = schedule.durationMs;

        const animate = (now) => {
            const elapsed = now - startTime;
            if (elapsed < 0) {
                requestAnimationFrame(animate);
                return;
            }

            let progress = Math.min(elapsed / durationMs, 1);
            progress = easingFn(progress);

            const pos = this.getPointOnPath(pathPoints, progress);
            mover.x = pos.x - offsetX;
            mover.y = pos.y - offsetY;

            if (alignRotation) {
                mover.rotation = pos.angle;
            }

            this.stage.requestRender();

            if (elapsed < durationMs) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
        Utils.showToast('Previewing path animation...', 'info');
    }

    _applyPathAnimation(mover, travelPath, duration, timing, easing, repeat, alignRotation, baseDuration, speed, reverseDirection) {
        const animId = Utils.generateId('pathAnim');
        const baseDurationMs = duration * 1000;
        const schedule = this.animations?._resolveAnimationSchedule
            ? this.animations._resolveAnimationSchedule(timing, baseDurationMs, mover.animations || [])
            : {
                delayMs: (timing.delay || 0) * 1000,
                durationMs: baseDurationMs,
                beginTime: timing.beginTime ?? null,
                endTime: timing.endTime ?? ((timing.delay || 0) + duration)
            };
        if (schedule.error) {
            Utils.showToast(schedule.error, 'warning');
            return;
        }

        // Read trigger from shared animation params dropdown
        const trigger = document.getElementById('param-trigger')?.value || 'onLoad';

        // Store path data on the animation config
        const animData = {
            id: animId,
            name: `Path: along ${this.objects.getObjectById(this.pathShapeId)?.name || 'shape'}`,
            type: 'path-follow',
            trigger: trigger,
            afterPlayback: 'keep',
            generated: {
                type: 'path-follow',
                pathPoints: travelPath.points,
                duration: schedule.durationMs,
                easing: easing,
                alignRotation: alignRotation,
                afterPlayback: 'keep'
            },
            delay: schedule.delayMs,
            repeat: repeat,
            startMode: timing.startMode,
            params: {
                duration: schedule.durationMs / 1000,
                delay: timing.delay,
                easing: easing,
                trigger: trigger,
                startMode: timing.startMode,
                referenceObjectId: timing.referenceObjectId,
                referenceRelation: timing.referenceRelation,
                beginTime: schedule.beginTime,
                endTime: schedule.endTime,
                pathShapeId: this.pathShapeId,
                startPct: parseInt(document.getElementById('path-start-pct')?.value) || 0,
                endPct: parseInt(document.getElementById('path-end-pct')?.value) || 100,
                effectiveStartPct: Math.round((travelPath.effectiveStartPct || 0) * 100),
                effectiveEndPct: Math.round((travelPath.effectiveEndPct || 0) * 100),
                alignRotation: alignRotation,
                reverseDirection: reverseDirection,
                fullLoop: !!travelPath.fullLoop,
                baseDuration: baseDuration,
                speed: speed,
                afterPlayback: 'keep'
            }
        };

        mover.animations.push(animData);

        // Select the mover so the applied animations list shows this animation
        this.objects.select([mover.id]);

        // Update the applied animations list
        if (this.animations?.updateAppliedAnimationsList) {
            this.animations.updateAppliedAnimationsList();
        }

        // Trigger timeline update so the bar appears
        eventBus.emit('timeline:update');
        this.animations.updateCodeOutput();

        Utils.showToast(`Path animation applied to ${mover.name} (${duration.toFixed(1)}s)`, 'success');
        eventBus.emit('history:push');
        this._hideImplementationToolbar();
    }

    // ============================
    // RENDER PATH PREVIEW ON CANVAS
    // ============================

    /**
     * Called during stage render to draw the path preview line.
     */
    renderPathPreview(ctx) {
        if (!this.pathShapeId) return;

        const pathObj = this.objects.getObjectById(this.pathShapeId);
        if (!pathObj) return;

        const pathPoints = this.getShapePath(pathObj, 200);
        if (pathPoints.length < 2) return;

        const startPct = (parseInt(document.getElementById('path-start-pct')?.value) || 0) / 100;
        const endPct = (parseInt(document.getElementById('path-end-pct')?.value) || 100) / 100;
        const reverseDirection = document.getElementById('path-reverse-direction')?.checked || false;
        const travelPath = this._buildTravelPath(pathObj, pathPoints, startPct, endPct, reverseDirection);
        if (travelPath.points.length < 2) return;

        ctx.save();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.beginPath();
        for (let i = 0; i < travelPath.points.length; i++) {
            if (i === 0) {
                ctx.moveTo(travelPath.points[i].x, travelPath.points[i].y);
            } else {
                ctx.lineTo(travelPath.points[i].x, travelPath.points[i].y);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Draw start/end markers
        const sp = travelPath.points[0];
        const ep = travelPath.points[travelPath.points.length - 1];

        // Start: green circle with label
        ctx.fillStyle = '#22c55e';
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('S', sp.x, sp.y);

        // End: red circle with label
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ep.x, ep.y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('E', ep.x, ep.y);

        // Direction arrows along path
        const arrowCount = 5;
        for (let a = 1; a < arrowCount; a++) {
            const t = a / arrowCount;
            const idx = Math.floor(t * (travelPath.points.length - 1));
            if (idx < 1 || idx >= travelPath.points.length) continue;
            const p = travelPath.points[idx];
            const prev = travelPath.points[idx - 1];
            const angle = Math.atan2(p.y - prev.y, p.x - prev.x);

            ctx.save();
            ctx.translate(p.x, p.y);
            ctx.rotate(angle);
            ctx.fillStyle = '#f59e0b';
            ctx.beginPath();
            ctx.moveTo(5, 0);
            ctx.lineTo(-3, -3);
            ctx.lineTo(-3, 3);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        ctx.restore();
    }
}
