/* ============================================
   Animation Stage - AI Trace
   Image-to-vector tracing via color quantization,
   connected-component labeling, marching squares
   contour detection, and Douglas-Peucker simplification.
   ============================================ */

class AITrace {
    constructor(objectManager) {
        this.objects = objectManager;
        this.stage = objectManager.stage;
        this._previewData = null;
        this._activeTraceWorker = null;
        this._activeTraceReject = null;
        this._cancelled = false;
    }

    /**
     * Main entry: trace an image object into freeform shapes.
     * @param {StageObject} obj - image object to trace
     * @param {object} opts
     * @param {string} opts.mode - 'outline' or 'regions'
     * @param {number} opts.colorCount - palette colors (4–64)
     * @param {number} opts.detail - 0=low, 1=medium, 2=high
     * @param {number} opts.sensitivity - 1–100 edge/foreground sensitivity
     * @param {number} opts.minRegion - minimum region area in px²
     * @param {boolean} opts.smooth - apply path smoothing
     * @returns {{shapes: Array, preview: ImageData}} traced shapes + preview overlay
     */
    trace(obj, opts = {}) {
        this._cancelled = false;
        const mode = opts.mode === 'regions' ? 'regions' : 'outline';
        return mode === 'regions'
            ? this._traceRegions(obj, opts)
            : this._traceOutline(obj, opts);
    }

    traceAsync(obj, opts = {}) {
        this._cancelled = false;
        const mode = opts.mode === 'regions' ? 'regions' : 'outline';
        if (mode === 'regions' && opts.useWorker !== false && typeof Worker !== 'undefined') {
            return Promise.resolve().then(() => this._traceRegionsInWorker(obj, opts)).catch((err) => {
                if (this._isCancelError(err)) throw err;
                console.warn('[AI Trace] Worker trace failed; falling back to main thread.', err);
                this._notifyProgress(opts, 'fallback', 0.1, 'Worker unavailable; using safe trace mode...');
                return this.trace(obj, { ...opts, useWorker: false });
            });
        }
        return Promise.resolve().then(() => this.trace(obj, opts));
    }

    _traceRegions(obj, opts = {}) {
        const limits = this._getRegionTraceLimits(opts);
        const colorCount = Math.max(2, Math.min(limits.maxColors, opts.colorCount || 12));
        const detail = opts.detail ?? 1;
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        const smooth = opts.smooth !== false;

        // 1. Get pixel data from the image
        this._throwIfCancelled();
        this._notifyProgress(opts, 'raster', 0.08, 'Preparing trace pixels...');
        const { imageData, width, height, canvas, stageRef, scale } = this._getImagePixels(obj, { ...opts, maxDim: limits.maxDim });
        const pixels = imageData.data;
        const minRegion = Math.max(opts.minRegion ?? 200, Math.ceil(width * height * limits.minRegionRatio));

        // 2. Color quantization — median cut
        this._notifyProgress(opts, 'palette', 0.22, 'Finding main colors...');
        const palette = this._medianCut(pixels, colorCount);

        // 3. Classify every pixel to nearest palette color
        this._throwIfCancelled();
        this._notifyProgress(opts, 'classify', 0.38, 'Grouping matching pixels...');
        const labels = this._classifyPixels(pixels, palette, width, height);

        // 4. Connected component labeling
        this._throwIfCancelled();
        this._notifyProgress(opts, 'components', 0.52, 'Finding connected regions...');
        const { components, componentColors } = this._labelComponents(labels, width, height, palette);

        // 5. Filter tiny regions
        const regionSizes = {};
        for (let i = 0; i < components.length; i++) {
            const c = components[i];
            if (c >= 0) regionSizes[c] = (regionSizes[c] || 0) + 1;
        }

        // Merge tiny components into their largest neighbor
        this._throwIfCancelled();
        this._notifyProgress(opts, 'merge', 0.64, 'Cleaning tiny regions...');
        this._mergeSmallRegions(components, regionSizes, width, height, minRegion);

        // Recount after merge
        const finalSizes = {};
        for (let i = 0; i < components.length; i++) {
            const c = components[i];
            if (c >= 0) finalSizes[c] = (finalSizes[c] || 0) + 1;
        }

        // 6. Trace contours with marching squares
        const bgColor = this._sampleEdgeBackground(imageData.data, width, height);
        const bgSkipThresholdSq = Math.max(8, opts.bgTolerance ?? 30) ** 2 * 4;
        const candidates = Object.keys(finalSizes)
            .map(Number)
            .filter(c => (finalSizes[c] || 0) >= minRegion)
            .filter(regionId => {
                const color = componentColors[regionId] || [128, 128, 128];
                const area = finalSizes[regionId] || 0;
                const dr = color[0] - bgColor[0];
                const dg = color[1] - bgColor[1];
                const db = color[2] - bgColor[2];
                const colorDistSq = dr * dr + dg * dg + db * db;
                return opts.preserveBackground === true || !(area > width * height * 0.72 && colorDistSq <= bgSkipThresholdSq);
            })
            .sort((a, b) => (finalSizes[b] || 0) - (finalSizes[a] || 0));
        const uniqueRegions = candidates.slice(0, limits.maxRegions);

        const shapes = [];
        for (let r = 0; r < uniqueRegions.length; r++) {
            this._throwIfCancelled();
            const regionId = uniqueRegions[r];
            this._notifyProgress(
                opts,
                'trace',
                0.72 + (0.2 * (r / Math.max(1, uniqueRegions.length))),
                `Tracing region ${r + 1} of ${uniqueRegions.length}...`
            );
            // Build binary mask for this region
            const mask = new Uint8Array(width * height);
            for (let i = 0; i < components.length; i++) {
                mask[i] = components[i] === regionId ? 1 : 0;
            }

            // Get region color
            const color = componentColors[regionId] || [128, 128, 128];
            const area = finalSizes[regionId] || 0;

            const finalPoints = this._traceMaskToPath(mask, width, height, {
                detail,
                sensitivity,
                smooth,
                maxPoints: limits.maxPointsPerShape
            });
            if (!finalPoints || finalPoints.length < 3) continue;

            // Map pixel coords to stage coords
            const stagePoints = this._mapToStage(finalPoints, stageRef || obj, width, height);

            shapes.push({
                points: stagePoints,
                color: `rgb(${color[0]},${color[1]},${color[2]})`,
                hex: this._rgbToHex(color[0], color[1], color[2]),
                area
            });
        }

        if (!shapes.length) {
            throw new Error('Could not isolate any traceable regions. Try higher Sensitivity, lower Min Region, or background removal.');
        }

        // Sort by area descending so large background shapes come first
        shapes.sort((a, b) => b.area - a.area);

        // Build preview data
        const preview = this._buildPreview(components, componentColors, uniqueRegions, width, height, canvas);

        const meta = {
            worker: false,
            downsampled: scale < 0.999,
            maxRegions: limits.maxRegions,
            keptRegions: uniqueRegions.length,
            skippedRegions: Math.max(0, candidates.length - uniqueRegions.length),
            rasterWidth: width,
            rasterHeight: height
        };
        this._notifyProgress(opts, 'done', 1, 'Trace preview ready.');
        this._previewData = { mode: 'regions', shapes, preview, obj, width, height, meta };
        return { shapes, preview, meta };
    }

    /**
     * For simple geometric shapes, return vector points directly from the object's
     * geometry (bypassing pixel tracing entirely). This gives perfect, lossless
     * results for rectangles, triangles, diamonds, and freeform paths.
     * Returns null for shapes that should still use pixel tracing (images, circles,
     * icons, preset arrow/star shapes, flex-bent and joint-deformed objects, etc.).
     */
    _getShapeGeometryPoints(obj) {
        // Flex-bent and joint-deformed shapes must be pixel-traced (deformation isn't in base geometry)
        if (obj.flexEnabled && obj.flexPins?.some(p => Math.abs(p.angle) > 0.1)) return null;
        if (obj.joints?.length > 0) return null;

        const x = obj.x, y = obj.y;
        const w = Math.abs(obj.width), h = Math.abs(obj.height);
        let pts = null;

        switch (obj.type) {
            case 'rectangle':
                // Only bypass pixel trace for sharp-cornered rectangles
                if (!(obj.borderRadius > 0)) {
                    pts = [{x, y}, {x: x+w, y}, {x: x+w, y: y+h}, {x, y: y+h}];
                }
                break;

            case 'diamond':
                pts = [
                    {x: x+w/2, y},
                    {x: x+w, y: y+h/2},
                    {x: x+w/2, y: y+h},
                    {x, y: y+h/2}
                ];
                break;

            case 'triangle':
                pts = [{x: x+w/2, y}, {x: x+w, y: y+h}, {x, y: y+h}];
                break;

            case 'freeform':
            case 'scribble':
            case 'path':
                if (obj.pathPoints?.length >= 3) {
                    pts = obj.pathPoints.map(p => ({x: p.x, y: p.y}));
                }
                break;

            default:
                return null;
        }

        if (!pts || pts.length < 3) return null;

        // Apply object rotation around pivot if needed
        const rotation = obj.rotation || 0;
        if (rotation !== 0) {
            const pivot = (obj.getPivotPoint?.()) ?? {x: x + w/2, y: y + h/2};
            const rad = rotation * Math.PI / 180;
            const cos = Math.cos(rad), sin = Math.sin(rad);
            pts = pts.map(p => {
                const dx = p.x - pivot.x, dy = p.y - pivot.y;
                return {x: pivot.x + dx*cos - dy*sin, y: pivot.y + dx*sin + dy*cos};
            });
        }

        return pts;
    }

    _traceOutline(obj, opts = {}) {
        // For simple geometric shapes, extract vector points directly from geometry.
        // This bypasses pixel tracing entirely, giving perfect results with no
        // rounding, distortion, or antialiasing artifacts.
        const directPts = this._getShapeGeometryPoints(obj);
        if (directPts) {
            const fillStr = typeof obj.fill === 'string' ? obj.fill : null;
            const hexFill = (fillStr && /^#[0-9a-fA-F]{3,8}$/.test(fillStr))
                ? fillStr
                : (fillStr && fillStr.startsWith('rgb') ? fillStr : '#808080');
            const strokeStr = typeof obj.stroke === 'string' ? obj.stroke : '';
            const hexStroke = (strokeStr && strokeStr !== 'transparent' && /^#/.test(strokeStr))
                ? strokeStr : '#111827';
            const shape = {
                points: directPts,
                color: hexFill,
                hex: hexFill,
                stroke: hexStroke,
                area: Math.abs(obj.width * obj.height)
            };
            // Render the shape for the preview overlay
            const pixelResult = this._getShapePixels(obj, opts);
            this._previewData = {
                mode: 'outline', shapes: [shape],
                preview: pixelResult.canvas, obj,
                width: pixelResult.width, height: pixelResult.height
            };
            return { shapes: [shape], preview: pixelResult.canvas };
        }

        // Pixel tracing pipeline for images and complex/preset shapes
        const detail = opts.detail ?? 1;
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        const minRegion = Math.max(20, opts.minRegion ?? 200);
        const smooth = opts.smooth !== false;
        const allowRawFallback = opts.allowRawFallback !== false;

        const { imageData, rawImageData, width, height, stageRef } = this._getImagePixels(obj, opts);
        let mask = this._buildForegroundMask(imageData, width, height, opts, rawImageData);
        let largest = this._extractLargestMask(mask, width, height, minRegion);
        if ((!largest || largest.area < minRegion) && rawImageData && allowRawFallback) {
            mask = this._buildForegroundMask(rawImageData, width, height, { ...opts, removeBg: false }, null);
            largest = this._extractLargestMask(mask, width, height, minRegion);
        }
        if (!largest || largest.area < minRegion) {
            throw new Error('No clear foreground silhouette was detected. Try higher Sensitivity, lower Min Region, or background removal.');
        }

        const finalPoints = this._traceMaskToPath(largest.mask, width, height, {
            detail,
            sensitivity,
            smooth
        });
        if (!finalPoints || finalPoints.length < 3) {
            throw new Error('Could not trace a usable outline');
        }

        const stagePoints = this._mapToStage(finalPoints, stageRef || obj, width, height);
        const avgColor = this._sampleAverageColor(imageData, largest.mask);
        const shape = {
            points: stagePoints,
            color: `rgb(${avgColor[0]},${avgColor[1]},${avgColor[2]})`,
            hex: this._rgbToHex(avgColor[0], avgColor[1], avgColor[2]),
            stroke: this._rgbToHex(
                Math.max(0, avgColor[0] - 42),
                Math.max(0, avgColor[1] - 42),
                Math.max(0, avgColor[2] - 42)
            ),
            area: largest.area
        };

        const preview = this._buildOutlinePreview(largest.mask, finalPoints, width, height);
        this._previewData = { mode: 'outline', shapes: [shape], preview, obj, width, height };
        return { shapes: [shape], preview };
    }

    /** Apply traced shapes to stage, replacing or keeping the image */
    apply(removeOriginal = true) {
        if (!this._previewData) return [];

        const { mode, shapes, obj } = this._previewData;
        const createdIds = [];

        if (mode === 'outline') {
            const shape = shapes[0];
            const bounds = this._getPointBounds(shape.points);
            const freeform = new StageObject('freeform', {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                pathPoints: shape.points.map(p => ({ x: p.x, y: p.y })),
                closedPath: true,
                fill: shape.hex,
                stroke: shape.stroke || '#111827',
                strokeWidth: removeOriginal ? 1.5 : 2,
                opacity: removeOriginal ? 1 : 0.58,
                name: `${obj.name || 'Object'} Outline`
            });
            this.objects.addObject(freeform);
            createdIds.push(freeform.id);
        } else {
            for (const shape of shapes) {
                const bounds = this._getPointBounds(shape.points);
                const freeform = new StageObject('freeform', {
                    x: bounds.x,
                    y: bounds.y,
                    width: bounds.width,
                    height: bounds.height,
                    pathPoints: shape.points.map(p => ({ x: p.x, y: p.y })),
                    closedPath: true,
                    fill: shape.hex,
                    stroke: 'transparent',
                    strokeWidth: 0,
                    name: `Trace ${shape.hex}`
                });
                this.objects.addObject(freeform);
                createdIds.push(freeform.id);
            }
        }

        // Group all traced shapes
        if (mode !== 'outline' && createdIds.length > 1) {
            const groupId = Utils.generateId('grp');
            this.objects.groups[groupId] = [...createdIds];
            this.objects._groupCounter++;
            this.objects.groupNames[groupId] = `Auto Trace (${createdIds.length} parts)`;
            createdIds.forEach(id => {
                const o = this.objects.getObjectById(id);
                if (o) o.groupId = groupId;
            });
        }

        // Remove or hide original image
        if (removeOriginal) {
            const idx = this.objects.objects.findIndex(o => o.id === obj.id);
            if (idx !== -1) this.objects.objects.splice(idx, 1);
        }

        this.objects.select(createdIds.length > 0 ? [createdIds[0]] : []);
        this.objects.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('history:push');

        const result = createdIds;
        this._previewData = null;
        return result;
    }

    /** Cancel and clear preview */
    cancel() {
        this._cancelled = true;
        if (this._activeTraceWorker) {
            this._activeTraceWorker.terminate();
            this._activeTraceWorker = null;
        }
        if (this._activeTraceReject) {
            this._activeTraceReject(new Error('Trace cancelled'));
            this._activeTraceReject = null;
        }
        this._previewData = null;
    }

    _traceRegionsInWorker(obj, opts = {}) {
        if (this._activeTraceWorker) this.cancel();
        const limits = this._getRegionTraceLimits(opts);
        this._notifyProgress(opts, 'raster', 0.05, 'Preparing trace pixels...');
        const pixelResult = this._getImagePixels(obj, { ...opts, maxDim: limits.maxDim });
        const { imageData, width, height, stageRef, scale } = pixelResult;
        const traceRef = stageRef || obj;
        const version = this._getWorkerAssetVersion();
        const workerUrl = `js/ai-trace-worker.js${version ? '?' + version : ''}`;
        const worker = new Worker(workerUrl);
        this._activeTraceWorker = worker;

        return new Promise((resolve, reject) => {
            this._activeTraceReject = reject;
            worker.onmessage = (event) => {
                const message = event.data || {};
                if (message.type === 'progress') {
                    this._notifyProgress(opts, message.phase || 'trace', message.progress || 0, message.message || 'Tracing...');
                    return;
                }
                if (message.type === 'error') {
                    this._activeTraceWorker = null;
                    this._activeTraceReject = null;
                    worker.terminate();
                    reject(new Error(message.message || 'Trace failed'));
                    return;
                }
                if (message.type !== 'result') return;

                this._activeTraceWorker = null;
                this._activeTraceReject = null;
                worker.terminate();

                const preview = document.createElement('canvas');
                preview.width = width;
                preview.height = height;
                const ctx = preview.getContext('2d');
                const previewData = new ImageData(new Uint8ClampedArray(message.previewBuffer), width, height);
                ctx.putImageData(previewData, 0, 0);

                const shapes = (message.shapes || []).map(shape => ({
                    points: this._mapToStage(shape.points || [], traceRef, width, height),
                    color: shape.color,
                    hex: shape.hex,
                    area: shape.area || 0
                })).filter(shape => shape.points.length >= 3);

                if (!shapes.length) {
                    reject(new Error('Could not isolate any traceable regions. Try higher Sensitivity, lower Min Region, or background removal.'));
                    return;
                }

                const meta = {
                    ...(message.meta || {}),
                    worker: true,
                    downsampled: scale < 0.999,
                    rasterWidth: width,
                    rasterHeight: height
                };
                this._notifyProgress(opts, 'done', 1, 'Trace preview ready.');
                this._previewData = { mode: 'regions', shapes, preview, obj, width, height, meta };
                resolve({ shapes, preview, meta });
            };
            worker.onerror = (event) => {
                this._activeTraceWorker = null;
                this._activeTraceReject = null;
                worker.terminate();
                reject(new Error(event.message || 'Trace worker failed'));
            };

            const pixels = new Uint8ClampedArray(imageData.data);
            worker.postMessage({
                type: 'trace-regions',
                width,
                height,
                buffer: pixels.buffer,
                opts: {
                    colorCount: opts.colorCount,
                    detail: opts.detail,
                    sensitivity: opts.sensitivity,
                    minRegion: opts.minRegion,
                    smooth: opts.smooth,
                    bgTolerance: opts.bgTolerance,
                    preserveBackground: opts.preserveBackground === true,
                    limits
                }
            }, [pixels.buffer]);
        });
    }

    _getWorkerAssetVersion() {
        const src = Array.from(document.scripts || [])
            .map(script => script.getAttribute('src') || '')
            .find(src => src.includes('ai-trace.js') && src.includes('?'));
        return src ? src.split('?').slice(1).join('?') : '';
    }

    _getRegionTraceLimits(opts = {}) {
        const detail = Math.max(0, Math.min(2, Number(opts.detail ?? 1)));
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        const baseMaxDim = [560, 700, 820][detail] + (sensitivity >= 80 ? 60 : 0);
        return {
            maxDim: Math.max(360, Math.min(900, Number(opts.maxRegionTraceDim || opts.maxDim || baseMaxDim))),
            maxColors: Math.max(4, Math.min(32, Number(opts.maxColors || 28))),
            maxRegions: Math.max(4, Math.min(48, Number(opts.maxRegions || 28))),
            maxPointsPerShape: Math.max(48, Math.min(700, Number(opts.maxPointsPerShape || [220, 360, 520][detail]))),
            minRegionRatio: Math.max(0.0002, Math.min(0.004, Number(opts.minRegionRatio || 0.00045)))
        };
    }

    _notifyProgress(opts, phase, progress, message) {
        if (typeof opts?.onProgress === 'function') {
            opts.onProgress({ phase, progress: Math.max(0, Math.min(1, Number(progress) || 0)), message });
        }
    }

    _throwIfCancelled() {
        if (this._cancelled) throw new Error('Trace cancelled');
    }

    _isCancelError(err) {
        return /cancel/i.test(String(err?.message || err || ''));
    }

    // ═══════════════════════════════════════
    //  PIXEL EXTRACTION
    // ═══════════════════════════════════════

    /**
     * Render a non-image StageObject (rectangle, circle, icon, freeform, flex-deformed shape,
     * etc.) to an offscreen canvas so its pixels can be fed into the trace algorithm.
     * Uses obj.render() so all visual effects — flex bending, tilt, gradients, textures —
     * are captured exactly as they appear on the stage.
     */
    _getShapePixels(obj, opts = {}) {
        const detail = opts.detail ?? 1;
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        const defaultMaxDim = [620, 820, 1100][detail] + (sensitivity >= 75 ? 120 : 0);
        const maxDim = Number.isFinite(Number(opts.maxDim)) ? Number(opts.maxDim) : defaultMaxDim;
        const srcW = Math.abs(obj.width);
        const srcH = Math.abs(obj.height);
        // For flex-bent shapes, rendered pixels can overflow the bounding box significantly.
        // Add generous padding (65% each side) so no bent pixels are clipped.
        const isFlex = obj.flexEnabled && obj.flexPins?.some(p => Math.abs(p.angle) > 0.1);
        const padRatio = isFlex ? 0.65 : 0.04;
        const padX = Math.round(srcW * padRatio);
        const padY = Math.round(srcH * padRatio);
        const totalW = srcW + 2 * padX;
        const totalH = srcH + 2 * padY;
        const scale = Math.min(2, maxDim / Math.max(totalW, totalH, 1));
        const w = Math.max(1, Math.round(totalW * scale));
        const h = Math.max(1, Math.round(totalH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        // Map: stage origin (obj.x - padX, obj.y - padY) → canvas (0, 0)
        const originX = obj.x - padX;
        const originY = obj.y - padY;
        ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);
        obj.render(ctx);
        if (isFlex) {
            // Crop to tight non-transparent bounds so _mapToStage uses the real visual extent.
            return this._cropToNonTransparent(canvas, scale, originX, originY);
        }
        const rawImageData = ctx.getImageData(0, 0, w, h);
        const imageData = new ImageData(new Uint8ClampedArray(rawImageData.data), w, h);
        return { imageData, rawImageData: null, width: w, height: h, canvas, scale };
    }

    /**
     * Crop a rendered canvas to the tight bounding box of non-transparent pixels and
     * return a stageRef describing the matching stage-space rectangle.
     * Used for flex-bent shapes where the visual extent != obj.x/y/width/height.
     */
    _cropToNonTransparent(canvas, scale, originX, originY) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = canvas.width;
        const h = canvas.height;
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 8) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) {
            // Nothing visible — return full canvas, let _mapToStage use obj bounding box
            const imageData = ctx.getImageData(0, 0, w, h);
            return { imageData, rawImageData: null, width: w, height: h, canvas, scale };
        }
        const cw = maxX - minX + 1;
        const ch = maxY - minY + 1;
        const cropped = document.createElement('canvas');
        cropped.width = cw;
        cropped.height = ch;
        const croppedCtx = cropped.getContext('2d', { willReadFrequently: true });
        croppedCtx.drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
        const imageData = croppedCtx.getImageData(0, 0, cw, ch);
        // stageRef maps pixel coordinates in this cropped canvas back to stage coords
        const stageRef = {
            x: originX + minX / scale,
            y: originY + minY / scale,
            width: cw / scale,
            height: ch / scale,
        };
        return { imageData, rawImageData: null, width: cw, height: ch, canvas: cropped, scale, stageRef };
    }

    _getImagePixels(obj, opts = {}) {
        // Non-image shapes: render to offscreen canvas instead of reading imageElement
        if (obj.type !== 'image') return this._getShapePixels(obj, opts);
        const img = obj.imageElement;
        if (!img) throw new Error('Image not loaded');
        const width = img.naturalWidth;
        const height = img.naturalHeight;
        const detail = opts.detail ?? 1;
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        // Higher detail / sensitivity uses a larger working raster for more faithful tracing.
        const defaultMaxDim = [620, 820, 1100][detail] + (sensitivity >= 75 ? 120 : 0);
        const maxDim = Number.isFinite(Number(opts.maxDim)) ? Number(opts.maxDim) : defaultMaxDim;
        const scale = Math.min(1, maxDim / Math.max(width, height));
        const w = Math.round(width * scale);
        const h = Math.round(height * scale);
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(img, 0, 0, w, h);
        const rawImageData = ctx.getImageData(0, 0, w, h);
        let imageData = new ImageData(new Uint8ClampedArray(rawImageData.data), w, h);
        if (obj.type === 'image' && opts?.removeBg) {
            imageData = this._removeBackgroundFromImageData(imageData, w, h, opts.bgTolerance ?? 30);
            ctx.putImageData(imageData, 0, 0);
        }
        return { imageData, rawImageData, width: w, height: h, canvas, scale };
    }

    _removeBackgroundFromImageData(imageData, width, height, tolerance) {
        const result = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
        const data = result.data;
        const total = width * height;
        const tolSq = Math.max(1, tolerance) * Math.max(1, tolerance) * 3;
        const visited = new Uint8Array(total);
        const queue = [];

        const cornerColor = this._sampleCornerBackground(data, width, height);
        const enqueue = (x, y) => {
            if (x < 0 || x >= width || y < 0 || y >= height) return;
            const idx = y * width + x;
            if (visited[idx]) return;
            const di = idx * 4;
            const alpha = data[di + 3];
            const dr = data[di] - cornerColor[0];
            const dg = data[di + 1] - cornerColor[1];
            const db = data[di + 2] - cornerColor[2];
            const distSq = dr * dr + dg * dg + db * db;
            if (alpha < 12 || distSq <= tolSq) {
                visited[idx] = 1;
                queue.push(idx);
            }
        };

        for (let x = 0; x < width; x++) {
            enqueue(x, 0);
            enqueue(x, height - 1);
        }
        for (let y = 0; y < height; y++) {
            enqueue(0, y);
            enqueue(width - 1, y);
        }

        let head = 0;
        while (head < queue.length) {
            const idx = queue[head++];
            const x = idx % width;
            const y = (idx - x) / width;
            enqueue(x - 1, y);
            enqueue(x + 1, y);
            enqueue(x, y - 1);
            enqueue(x, y + 1);
        }

        for (let i = 0; i < total; i++) {
            if (visited[i]) data[i * 4 + 3] = 0;
        }
        return result;
    }

    _sampleCornerBackground(data, width, height) {
        const points = [
            [0, 0],
            [width - 1, 0],
            [0, height - 1],
            [width - 1, height - 1]
        ];
        let r = 0, g = 0, b = 0, count = 0;
        points.forEach(([x, y]) => {
            const idx = (y * width + x) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
        });
        return [
            Math.round(r / Math.max(1, count)),
            Math.round(g / Math.max(1, count)),
            Math.round(b / Math.max(1, count))
        ];
    }

    _normalizeSensitivity(value) {
        const num = typeof value === 'number' ? value : parseInt(value, 10);
        return Math.max(1, Math.min(100, Number.isFinite(num) ? num : 60));
    }

    _sampleEdgeBackground(data, width, height) {
        const band = Math.max(1, Math.round(Math.min(width, height) * 0.02));
        let r = 0, g = 0, b = 0, count = 0;
        const add = (x, y) => {
            const idx = (y * width + x) * 4;
            const alpha = data[idx + 3];
            if (alpha < 6) return;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
        };
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                if (x < band || x >= width - band || y < band || y >= height - band) {
                    add(x, y);
                }
            }
        }
        if (!count) return this._sampleCornerBackground(data, width, height);
        return [
            Math.round(r / count),
            Math.round(g / count),
            Math.round(b / count)
        ];
    }

    _buildAlphaMask(imageData, width, height, threshold = 12) {
        const mask = new Uint8Array(width * height);
        const pixels = imageData.data;
        for (let i = 0; i < width * height; i++) {
            mask[i] = pixels[i * 4 + 3] > threshold ? 1 : 0;
        }
        return mask;
    }

    _buildBackgroundDifferenceMask(imageData, width, height, opts = {}) {
        const mask = new Uint8Array(width * height);
        const pixels = imageData.data;
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        const bg = this._sampleEdgeBackground(pixels, width, height);
        const bgLum = 0.299 * bg[0] + 0.587 * bg[1] + 0.114 * bg[2];
        const baseTol = Math.max(6, opts.bgTolerance ?? 30);
        const colorThreshold = Math.max(10, baseTol - Math.round((sensitivity - 50) * 0.22));
        const colorThresholdSq = colorThreshold * colorThreshold * 3;
        const lumaThreshold = Math.max(8, colorThreshold * 0.9);
        const alphaThreshold = Math.max(2, Math.round(26 - sensitivity * 0.18));

        for (let i = 0; i < width * height; i++) {
            const p = i * 4;
            const alpha = pixels[p + 3];
            if (alpha <= alphaThreshold) {
                mask[i] = 0;
                continue;
            }
            const dr = pixels[p] - bg[0];
            const dg = pixels[p + 1] - bg[1];
            const db = pixels[p + 2] - bg[2];
            const distSq = dr * dr + dg * dg + db * db;
            const lum = 0.299 * pixels[p] + 0.587 * pixels[p + 1] + 0.114 * pixels[p + 2];
            mask[i] = (distSq >= colorThresholdSq || Math.abs(lum - bgLum) >= lumaThreshold) ? 1 : 0;
        }

        return mask;
    }

    _cleanupMask(mask, width, height, sensitivity = 60) {
        let src = new Uint8Array(mask);
        const fillThreshold = sensitivity >= 70 ? 5 : 6;
        const pruneThreshold = sensitivity >= 70 ? 2 : 3;

        for (let pass = 0; pass < 2; pass++) {
            const dst = new Uint8Array(src);
            for (let y = 1; y < height - 1; y++) {
                for (let x = 1; x < width - 1; x++) {
                    const idx = y * width + x;
                    let count = 0;
                    for (let dy = -1; dy <= 1; dy++) {
                        for (let dx = -1; dx <= 1; dx++) {
                            if (src[(y + dy) * width + (x + dx)]) count++;
                        }
                    }
                    if (src[idx]) {
                        if (count <= pruneThreshold) dst[idx] = 0;
                    } else if (count >= fillThreshold) {
                        dst[idx] = 1;
                    }
                }
            }
            src = dst;
        }

        return src;
    }

    _measureMaskArea(mask) {
        let area = 0;
        for (let i = 0; i < mask.length; i++) area += mask[i] ? 1 : 0;
        return area;
    }

    _buildForegroundMask(imageData, width, height, opts = {}, rawImageData = null) {
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        const total = width * height;
        const alphaThreshold = Math.max(3, Math.round(42 - sensitivity * 0.34));

        let bestMask = this._cleanupMask(
            this._buildAlphaMask(imageData, width, height, alphaThreshold),
            width,
            height,
            sensitivity
        );
        let bestArea = this._measureMaskArea(bestMask);

        const evaluateCandidate = (candidateImageData) => {
            if (!candidateImageData) return;
            const candidateMask = this._cleanupMask(
                this._buildBackgroundDifferenceMask(candidateImageData, width, height, opts),
                width,
                height,
                sensitivity
            );
            const candidateArea = this._measureMaskArea(candidateMask);
            if (!candidateArea || candidateArea >= total * 0.985) return;

            const bestLooksOpaque = bestArea >= total * 0.94;
            const bestTooSmall = bestArea < Math.max(12, (opts.minRegion ?? 200) * 0.4);
            if (bestLooksOpaque || bestTooSmall || Math.abs(candidateArea - total * 0.5) < Math.abs(bestArea - total * 0.5)) {
                bestMask = candidateMask;
                bestArea = candidateArea;
            }
        };

        evaluateCandidate(imageData);
        if (rawImageData && rawImageData !== imageData) evaluateCandidate(rawImageData);

        return bestMask;
    }

    _extractLargestMask(mask, width, height, minSize = 0) {
        const total = width * height;
        const visited = new Uint8Array(total);
        let bestArea = 0;
        let bestIndices = [];

        for (let i = 0; i < total; i++) {
            if (visited[i] || mask[i] !== 1) continue;
            const queue = [i];
            const indices = [i];
            visited[i] = 1;
            let head = 0;
            while (head < queue.length) {
                const pos = queue[head++];
                const x = pos % width;
                const y = (pos - x) / width;
                const neighbors = [];
                if (x > 0) neighbors.push(pos - 1);
                if (x < width - 1) neighbors.push(pos + 1);
                if (y > 0) neighbors.push(pos - width);
                if (y < height - 1) neighbors.push(pos + width);
                for (const n of neighbors) {
                    if (!visited[n] && mask[n] === 1) {
                        visited[n] = 1;
                        queue.push(n);
                        indices.push(n);
                    }
                }
            }
            if (indices.length > bestArea) {
                bestArea = indices.length;
                bestIndices = indices;
            }
        }

        if (bestArea < Math.max(1, minSize)) return null;
        const bestMask = new Uint8Array(total);
        bestIndices.forEach(idx => { bestMask[idx] = 1; });
        return { mask: bestMask, area: bestArea };
    }

    _sampleAverageColor(imageData, mask) {
        const pixels = imageData.data;
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < mask.length; i++) {
            if (!mask[i]) continue;
            const p = i * 4;
            r += pixels[p];
            g += pixels[p + 1];
            b += pixels[p + 2];
            count++;
        }
        if (!count) return [128, 128, 128];
        return [Math.round(r / count), Math.round(g / count), Math.round(b / count)];
    }

    _buildOutlinePreview(mask, contour, width, height) {
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = width;
        previewCanvas.height = height;
        const ctx = previewCanvas.getContext('2d');
        const image = ctx.createImageData(width, height);
        for (let i = 0; i < mask.length; i++) {
            if (!mask[i]) continue;
            const p = i * 4;
            image.data[p] = 20;
            image.data[p + 1] = 184;
            image.data[p + 2] = 166;
            image.data[p + 3] = 110;
        }
        ctx.putImageData(image, 0, 0);

        if (contour?.length) {
            ctx.beginPath();
            contour.forEach((pt, index) => {
                if (index === 0) ctx.moveTo(pt.x, pt.y);
                else ctx.lineTo(pt.x, pt.y);
            });
            ctx.closePath();
            ctx.strokeStyle = 'rgba(255,255,255,0.95)';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        return previewCanvas;
    }

    // ═══════════════════════════════════════
    //  MEDIAN CUT COLOR QUANTIZATION
    // ═══════════════════════════════════════

    _medianCut(pixels, targetColors) {
        // Collect all opaque pixels as [r,g,b]
        const colors = [];
        for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3] > 128) { // skip transparent
                colors.push([pixels[i], pixels[i + 1], pixels[i + 2]]);
            }
        }
        if (colors.length === 0) return [[0, 0, 0]];

        // Split into buckets
        let buckets = [colors];

        while (buckets.length < targetColors) {
            // Find bucket with widest color range
            let bestIdx = 0, bestRange = -1, bestChannel = 0;
            for (let i = 0; i < buckets.length; i++) {
                const b = buckets[i];
                if (b.length < 2) continue;
                for (let ch = 0; ch < 3; ch++) {
                    let lo = 255, hi = 0;
                    for (const c of b) {
                        if (c[ch] < lo) lo = c[ch];
                        if (c[ch] > hi) hi = c[ch];
                    }
                    const range = hi - lo;
                    if (range > bestRange) {
                        bestRange = range;
                        bestIdx = i;
                        bestChannel = ch;
                    }
                }
            }
            if (bestRange <= 0) break;

            // Sort and split at median
            const bucket = buckets[bestIdx];
            bucket.sort((a, b) => a[bestChannel] - b[bestChannel]);
            const mid = Math.floor(bucket.length / 2);
            buckets.splice(bestIdx, 1, bucket.slice(0, mid), bucket.slice(mid));
        }

        // Average each bucket to get palette color
        return buckets.map(bucket => {
            if (bucket.length === 0) return [128, 128, 128];
            let r = 0, g = 0, b = 0;
            for (const c of bucket) { r += c[0]; g += c[1]; b += c[2]; }
            const n = bucket.length;
            return [Math.round(r / n), Math.round(g / n), Math.round(b / n)];
        });
    }

    // ═══════════════════════════════════════
    //  PIXEL CLASSIFICATION
    // ═══════════════════════════════════════

    _classifyPixels(pixels, palette, width, height) {
        const total = width * height;
        const labels = new Uint8Array(total);
        for (let i = 0; i < total; i++) {
            const pi = i * 4;
            if (pixels[pi + 3] < 128) {
                labels[i] = 255; // transparent marker
                continue;
            }
            const r = pixels[pi], g = pixels[pi + 1], b = pixels[pi + 2];
            let bestDist = Infinity, bestIdx = 0;
            for (let j = 0; j < palette.length; j++) {
                const dr = r - palette[j][0], dg = g - palette[j][1], db = b - palette[j][2];
                const d = dr * dr + dg * dg + db * db;
                if (d < bestDist) { bestDist = d; bestIdx = j; }
            }
            labels[i] = bestIdx;
        }
        return labels;
    }

    // ═══════════════════════════════════════
    //  CONNECTED COMPONENT LABELING
    // ═══════════════════════════════════════

    _labelComponents(labels, width, height, palette) {
        const total = width * height;
        const components = new Int32Array(total).fill(-1);
        const componentColors = {};
        let nextId = 0;

        for (let i = 0; i < total; i++) {
            if (components[i] !== -1 || labels[i] === 255) continue;
            // BFS flood fill
            const color = labels[i];
            const id = nextId++;
            componentColors[id] = palette[color];
            const queue = [i];
            components[i] = id;
            let head = 0;
            while (head < queue.length) {
                const pos = queue[head++];
                const x = pos % width;
                const y = (pos - x) / width;
                // 4-connected neighbors
                const neighbors = [];
                if (x > 0) neighbors.push(pos - 1);
                if (x < width - 1) neighbors.push(pos + 1);
                if (y > 0) neighbors.push(pos - width);
                if (y < height - 1) neighbors.push(pos + width);
                for (const n of neighbors) {
                    if (components[n] === -1 && labels[n] === color) {
                        components[n] = id;
                        queue.push(n);
                    }
                }
            }
        }

        return { components, componentColors };
    }

    // ═══════════════════════════════════════
    //  MERGE SMALL REGIONS
    // ═══════════════════════════════════════

    _mergeSmallRegions(components, regionSizes, width, height, minSize) {
        const total = width * height;
        const smallIds = new Set();
        for (const [id, size] of Object.entries(regionSizes)) {
            if (size < minSize) smallIds.add(parseInt(id));
        }
        if (smallIds.size === 0) return;

        // Single pass over adjacent pixels to find the most common non-small
        // neighbor for every tiny component. The old code scanned the full image
        // once per tiny region, which made noisy color-region traces stall.
        const neighborCounts = new Map();
        const addNeighbor = (smallId, neighborId) => {
            if (neighborId < 0 || neighborId === smallId || smallIds.has(neighborId)) return;
            let counts = neighborCounts.get(smallId);
            if (!counts) {
                counts = new Map();
                neighborCounts.set(smallId, counts);
            }
            counts.set(neighborId, (counts.get(neighborId) || 0) + 1);
        };

        for (let y = 0; y < height; y++) {
            const row = y * width;
            for (let x = 0; x < width; x++) {
                const idx = row + x;
                const id = components[idx];
                if (x + 1 < width) {
                    const right = components[idx + 1];
                    if (id !== right) {
                        if (smallIds.has(id)) addNeighbor(id, right);
                        if (smallIds.has(right)) addNeighbor(right, id);
                    }
                }
                if (y + 1 < height) {
                    const down = components[idx + width];
                    if (id !== down) {
                        if (smallIds.has(id)) addNeighbor(id, down);
                        if (smallIds.has(down)) addNeighbor(down, id);
                    }
                }
            }
        }

        const replacements = new Map();
        neighborCounts.forEach((counts, smallId) => {
            let bestNeighbor = -1;
            let bestCount = 0;
            counts.forEach((count, neighborId) => {
                if (count > bestCount) {
                    bestCount = count;
                    bestNeighbor = neighborId;
                }
            });
            if (bestNeighbor >= 0) replacements.set(smallId, bestNeighbor);
        });
        if (!replacements.size) return;
        for (let i = 0; i < total; i++) {
            const next = replacements.get(components[i]);
            if (next !== undefined) components[i] = next;
        }
    }

    // ═══════════════════════════════════════
    //  CONTOUR TRACING
    // ═══════════════════════════════════════

    _traceMaskToPath(mask, width, height, opts = {}) {
        const contour = this._traceBoundaryPixels(mask, width, height);
        if (!contour || contour.length < 4) return [];

        const detail = opts.detail ?? 1;
        const sensitivity = this._normalizeSensitivity(opts.sensitivity);
        const smooth = opts.smooth !== false;
        const baseTolerance = [3.4, 1.8, 0.8][detail] || 1.8;
        const tolerance = Math.max(0.35, baseTolerance * ((115 - sensitivity) / 100));
        let simplified = this._douglasPeucker(contour, tolerance);
        simplified = this._capPathPoints(contour, simplified, opts.maxPoints || 0, tolerance);
        if (!simplified || simplified.length < 3) return [];
        const finalPath = smooth ? this._smoothPath(simplified) : simplified;
        return this._capPathPoints(finalPath, finalPath, opts.maxPoints || 0, tolerance);
    }

    _capPathPoints(sourcePoints, points, maxPoints, tolerance = 1) {
        if (!maxPoints || !points || points.length <= maxPoints) return points;
        let epsilon = Math.max(0.75, tolerance * 1.35);
        let simplified = points;
        for (let i = 0; i < 7 && simplified.length > maxPoints; i++) {
            simplified = this._douglasPeucker(sourcePoints, epsilon);
            epsilon *= 1.65;
        }
        if (simplified.length <= maxPoints) return simplified;
        const sampled = [];
        const step = simplified.length / maxPoints;
        for (let i = 0; i < maxPoints; i++) sampled.push(simplified[Math.floor(i * step)]);
        return sampled;
    }

    _traceBoundaryPixels(mask, width, height) {
        const paddedWidth = width + 2;
        const paddedHeight = height + 2;
        const padded = new Uint8Array(paddedWidth * paddedHeight);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                padded[(y + 1) * paddedWidth + (x + 1)] = mask[y * width + x];
            }
        }

        const get = (x, y) => padded[y * paddedWidth + x];
        const isBoundary = (x, y) => (
            get(x, y) === 1 &&
            (!get(x - 1, y) || !get(x + 1, y) || !get(x, y - 1) || !get(x, y + 1))
        );

        let start = null;
        for (let y = 1; y < paddedHeight - 1 && !start; y++) {
            for (let x = 1; x < paddedWidth - 1; x++) {
                if (isBoundary(x, y)) {
                    start = { x, y };
                    break;
                }
            }
        }
        if (!start) return [];

        const dirs = [
            { x: -1, y: 0 },  // W
            { x: -1, y: -1 }, // NW
            { x: 0, y: -1 },  // N
            { x: 1, y: -1 },  // NE
            { x: 1, y: 0 },   // E
            { x: 1, y: 1 },   // SE
            { x: 0, y: 1 },   // S
            { x: -1, y: 1 }   // SW
        ];
        const dirIndexFor = (from, to) => dirs.findIndex(d => from.x + d.x === to.x && from.y + d.y === to.y);

        const contour = [];
        const maxSteps = width * height * 8;
        let current = start;
        let previous = { x: start.x - 1, y: start.y };
        const startPrevious = { ...previous };
        let steps = 0;
        const visited = new Map();

        do {
            const prevIndex = dirIndexFor(current, previous);
            // Irregular outlines can close with a different initial backtrack
            // pixel. Stop at a repeated directed state, not the pixel budget.
            const state = (current.y * paddedWidth + current.x) * 9 + prevIndex + 1;
            if (visited.has(state)) { contour.splice(0, visited.get(state)); break; }
            visited.set(state, contour.length);
            contour.push({ x: current.x - 1.5, y: current.y - 1.5 });
            let next = null;
            let nextPrevious = null;

            for (let offset = 1; offset <= 8; offset++) {
                const idx = (prevIndex + offset + 8) % 8;
                const probe = { x: current.x + dirs[idx].x, y: current.y + dirs[idx].y };
                if (get(probe.x, probe.y) === 1) {
                    next = probe;
                    const backIdx = (idx + 7) % 8;
                    nextPrevious = { x: current.x + dirs[backIdx].x, y: current.y + dirs[backIdx].y };
                    break;
                }
            }

            if (!next) break;
            previous = nextPrevious;
            current = next;
            steps++;
        } while (
            steps < maxSteps &&
            !(current.x === start.x && current.y === start.y && previous.x === startPrevious.x && previous.y === startPrevious.y)
        );

        if (contour.length > 1) {
            const first = contour[0];
            const last = contour[contour.length - 1];
            if (Math.hypot(first.x - last.x, first.y - last.y) < 0.5) contour.pop();
        }

        return contour;
    }

    // ═══════════════════════════════════════
    //  DOUGLAS-PEUCKER PATH SIMPLIFICATION
    // ═══════════════════════════════════════

    _douglasPeucker(points, epsilon) {
        if (points.length <= 2) return points;

        let maxDist = 0, maxIdx = 0;
        const start = points[0];
        const end = points[points.length - 1];

        for (let i = 1; i < points.length - 1; i++) {
            const d = this._pointToLineDist(points[i], start, end);
            if (d > maxDist) { maxDist = d; maxIdx = i; }
        }

        if (maxDist > epsilon) {
            const left = this._douglasPeucker(points.slice(0, maxIdx + 1), epsilon);
            const right = this._douglasPeucker(points.slice(maxIdx), epsilon);
            return left.slice(0, -1).concat(right);
        }
        return [start, end];
    }

    _pointToLineDist(point, lineStart, lineEnd) {
        const dx = lineEnd.x - lineStart.x;
        const dy = lineEnd.y - lineStart.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(point.x - lineStart.x, point.y - lineStart.y);
        let t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        const projX = lineStart.x + t * dx;
        const projY = lineStart.y + t * dy;
        return Math.hypot(point.x - projX, point.y - projY);
    }

    // ═══════════════════════════════════════
    //  PATH SMOOTHING (Chaikin's corner cutting, corner-preserving)
    // ═══════════════════════════════════════

    _smoothPath(points) {
        if (points.length < 3) return points;
        const n = points.length;

        // Detect hard corners: if the turn angle between consecutive segments
        // exceeds this threshold the point is kept as a sharp corner and
        // Chaikin subdivision is not applied across it.
        // cos(50°) ≈ 0.643 — catches rectangles (90°), triangles (120°), stars, etc.
        const CORNER_COS_THRESHOLD = Math.cos(Math.PI * 50 / 180);

        const isCorner = new Array(n).fill(false);
        for (let i = 0; i < n; i++) {
            const prev = points[(i - 1 + n) % n];
            const curr = points[i];
            const next = points[(i + 1) % n];
            const dx1 = curr.x - prev.x, dy1 = curr.y - prev.y;
            const dx2 = next.x - curr.x, dy2 = next.y - curr.y;
            const len1 = Math.hypot(dx1, dy1);
            const len2 = Math.hypot(dx2, dy2);
            if (len1 < 0.5 || len2 < 0.5) continue;
            const cos = (dx1 * dx2 + dy1 * dy2) / (len1 * len2);
            isCorner[i] = cos < CORNER_COS_THRESHOLD;
        }

        // Chaikin subdivision: hard corners are emitted unchanged;
        // smooth sections are subdivided with the standard 3/4 – 1/4 split.
        const result = [];
        for (let i = 0; i < n; i++) {
            const curr = points[i];
            const next = points[(i + 1) % n];
            const nextIsCorner = isCorner[(i + 1) % n];

            if (isCorner[i]) {
                // Always preserve the corner point exactly.
                result.push({ x: curr.x, y: curr.y });
                // If the next point is not a corner, also emit a 1/4 point
                // so the Chaikin curve approaching the next smooth section
                // starts cleanly away from this corner.
                if (!nextIsCorner) {
                    result.push({
                        x: curr.x * 0.25 + next.x * 0.75,
                        y: curr.y * 0.25 + next.y * 0.75
                    });
                }
            } else {
                // Standard Chaikin: 3/4 point on this segment.
                result.push({
                    x: curr.x * 0.75 + next.x * 0.25,
                    y: curr.y * 0.75 + next.y * 0.25
                });
                // 1/4 point, but skip it if the next vertex is a hard corner
                // (the corner itself will be emitted on the next iteration).
                if (!nextIsCorner) {
                    result.push({
                        x: curr.x * 0.25 + next.x * 0.75,
                        y: curr.y * 0.25 + next.y * 0.75
                    });
                }
            }
        }
        return result;
    }

    // ═══════════════════════════════════════
    //  COORDINATE MAPPING
    // ═══════════════════════════════════════

    _mapToStage(points, obj, traceW, traceH) {
        const scaleX = obj.width / traceW;
        const scaleY = obj.height / traceH;
        return points.map(p => ({
            x: obj.x + p.x * scaleX,
            y: obj.y + p.y * scaleY
        }));
    }

    _getPointBounds(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of points) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { x: minX, y: minY, width: (maxX - minX) || 1, height: (maxY - minY) || 1 };
    }

    // ═══════════════════════════════════════
    //  PREVIEW GENERATION
    // ═══════════════════════════════════════

    _buildPreview(components, componentColors, validRegions, width, height, canvas) {
        const validSet = new Set(validRegions);
        const previewCanvas = document.createElement('canvas');
        previewCanvas.width = width;
        previewCanvas.height = height;
        const ctx = previewCanvas.getContext('2d');
        const imgData = ctx.createImageData(width, height);
        const data = imgData.data;

        for (let i = 0; i < components.length; i++) {
            const c = components[i];
            const pi = i * 4;
            if (validSet.has(c) && componentColors[c]) {
                data[pi] = componentColors[c][0];
                data[pi + 1] = componentColors[c][1];
                data[pi + 2] = componentColors[c][2];
                data[pi + 3] = 255;
            } else {
                data[pi + 3] = 0; // transparent for invalid regions
            }
        }
        ctx.putImageData(imgData, 0, 0);
        return previewCanvas;
    }

    // ═══════════════════════════════════════
    //  UTILITIES
    // ═══════════════════════════════════════

    _rgbToHex(r, g, b) {
        return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }
}
