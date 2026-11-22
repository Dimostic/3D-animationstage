/* ============================================
   Animation Stage - WebGL Renderer Foundation
   Optional workspace/stage background renderer
   ============================================ */

(function () {
    'use strict';

    const STORAGE_KEY = 'animationStageRendererMode';
    const ACCESS_KEY = 'animationStageWebGLAccess';
    const WORKSPACE_COLOR = [10 / 255, 10 / 255, 20 / 255, 1];

    function parseHexColor(value, fallback) {
        const input = String(value || '').trim();
        const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input);
        if (!match) return fallback.slice();
        let hex = match[1];
        if (hex.length === 3) {
            hex = hex.split('').map(ch => ch + ch).join('');
        }
        const num = parseInt(hex, 16);
        return [
            ((num >> 16) & 255) / 255,
            ((num >> 8) & 255) / 255,
            (num & 255) / 255,
            1
        ];
    }

    function parseCssColor(value) {
        const input = String(value || '').trim();
        if (!input || input === 'transparent') return [0, 0, 0, 0];
        const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input);
        if (hex) return parseHexColor(input, [0, 0, 0, 1]);
        const rgb = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i.exec(input);
        if (!rgb) return null;
        return [
            Math.max(0, Math.min(255, Number(rgb[1]) || 0)) / 255,
            Math.max(0, Math.min(255, Number(rgb[2]) || 0)) / 255,
            Math.max(0, Math.min(255, Number(rgb[3]) || 0)) / 255,
            Math.max(0, Math.min(1, rgb[4] == null ? 1 : Number(rgb[4])))
        ];
    }

    class StageWebGLRenderer {
        constructor(stage) {
            this.stage = stage;
            this.canvas = document.getElementById('stage-webgl-canvas');
            this.gl = null;
            this.program = null;
            this.buffer = null;
            this.texture = null;
            this.objectTextures = new Map();
            this.textTextureCanvases = new Map();
            this.snapshotTextureCanvases = new Map();
            this.textureSourceKey = '';
            this.textureSize = { width: 1, height: 1 };
            this.active = false;
            this.supported = false;
            this.lastError = '';
            this.maxObjectTextureCache = 160;
            this.maxCanvasTextureCache = 120;
            this._contextEventsBound = false;
            this._contextLost = false;
            this.contextLossCount = 0;
            this.contextRestoreCount = 0;
            this.lastContextLossAt = 0;
            this.lastContextRestoreAt = 0;
            this.performanceStats = {
                frames: 0,
                lastRenderMs: 0,
                averageRenderMs: 0,
                lastObjectCount: 0,
                lastObjectsRendered: false,
                lastFullObjectsRendered: false,
                lastPartialObjectsRendered: false,
                lastAt: 0
            };

            if (!this.canvas && stage?.viewport) {
                this.canvas = document.createElement('canvas');
                this.canvas.id = 'stage-webgl-canvas';
                this.canvas.setAttribute('aria-hidden', 'true');
                stage.viewport.insertBefore(this.canvas, stage.viewport.firstChild);
            }

            this._bindContextEvents();
            this.init();
        }

        static isSupported() {
            try {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
            } catch (err) {
                return false;
            }
        }

        static preferredMode() {
            try {
                return localStorage.getItem(STORAGE_KEY) || 'canvas2d';
            } catch (_) {
                return 'canvas2d';
            }
        }

        static hasAccess() {
            let explicit = null;
            try { explicit = localStorage.getItem(ACCESS_KEY); } catch (_) {}
            if (explicit === '1') return true;
            const user = window.__STAGE_USER || window.__APP_USER || window.currentUser || null;
            const role = String(user?.role || user?.userRole || '').toLowerCase();
            if (!role) return true;
            return ['admin', 'administrator', 'superadmin', 'owner'].includes(role)
                || user?.features?.webglRenderer === true
                || user?.permissions?.webglRenderer === true;
        }

        static analyzeScene(objects = []) {
            const list = Array.isArray(objects) ? objects.filter(obj => obj && obj.visible !== false) : [];
            const simpleTypes = new Set([
                'rectangle', 'roundedRectangle', 'circle', 'triangle', 'diamond',
                'polygon', 'star', 'line', 'arrow', 'doubleArrow', 'image', 'text',
                'path', 'scribble', 'freeform', 'curvedArrow', 'icon', 'symbol'
            ]);
            const counts = {
                total: list.length,
                simpleCandidates: 0,
                simpleRenderable: 0,
                canvasRequired: 0,
                text: 0,
                images: 0,
                webglImages: 0,
                webglEditedImages: 0,
                webglAnimatedGifs: 0,
                webglSpriteSheets: 0,
                webglPictureFills: 0,
                webglGradientFills: 0,
                webglPatternFills: 0,
                webglImageFilters: 0,
                webglImageBlur: 0,
                webglText: 0,
                webglSnapshots: 0,
                webglTransformedObjects: 0,
                webglDashedLines: 0,
                webglLineCaps: 0,
                webglRoundedImages: 0,
                webglSimpleShadows: 0,
                webglClipAnimations: 0,
                webglGlowEffects: 0,
                webglReflectionEffects: 0,
                complexPaths: 0,
                rigged: 0,
                effects: 0,
                advancedFill: 0,
                canvasReasons: {}
            };

            const addCanvasReason = (reason) => {
                if (!reason) return;
                counts.canvasReasons[reason] = (counts.canvasReasons[reason] || 0) + 1;
            };

            list.forEach(obj => {
                const type = obj.type || 'object';
                const advancedFill = ['linear-gradient', 'radial-gradient', 'pattern', 'picture'].includes(obj.fillType);
                const supportedShadow = StageWebGLRenderer.hasSimpleShadow(obj);
                const supportedGlow = StageWebGLRenderer.hasSimpleGlow(obj);
                const supportedReflection = StageWebGLRenderer.hasSimpleReflection(obj);
                const effects = !!((obj.shadow && !obj.glowEnabled && !supportedShadow)
                    || (obj.glowEnabled && !supportedGlow)
                    || (obj.reflectionEnabled && !supportedReflection)
                    || obj.bevelEnabled
                    || (obj.blendMode && obj.blendMode !== 'normal'));
                const rigged = !!(obj.joints?.length || obj.pinnedTo || obj.flex || obj.flexMesh || obj.bodyPartData || obj.faceRig || obj.faceRigPartRole || obj.cloneBrushLayer || obj.layerMask);
                const complexPath = ['path', 'scribble', 'freeform', 'curvedArrow', 'icon', 'symbol'].includes(type);
                const isText = type === 'text' || !!obj.text;
                const isImage = type === 'image' || !!obj.imageSrc || !!obj.imageElement;

                if (isText) counts.text++;
                if (isImage) counts.images++;
                if (complexPath) counts.complexPaths++;
                if (rigged) counts.rigged++;
                if (effects) counts.effects++;
                if (advancedFill) counts.advancedFill++;

                if (simpleTypes.has(type) && !advancedFill && !effects && !rigged
                    && (!isText || StageWebGLRenderer.canRenderTextObject(obj))
                    && (!complexPath || StageWebGLRenderer.canRenderSnapshotObject(obj))) {
                    counts.simpleCandidates++;
                }
                if (StageWebGLRenderer.canRenderSimpleObject(obj)) {
                    counts.simpleRenderable++;
                    if (isText) counts.webglText++;
                    if (complexPath) counts.webglSnapshots++;
                    if (isImage) counts.webglImages++;
                    if (isImage && StageWebGLRenderer.hasEditedImageCanvas(obj)) counts.webglEditedImages++;
                    if (isImage && StageWebGLRenderer.getCurrentGifFrameInfo(obj)) counts.webglAnimatedGifs++;
                    if (isImage && StageWebGLRenderer.getCurrentSpriteFrameRect(obj)) counts.webglSpriteSheets++;
                    if (obj.fillType === 'picture') counts.webglPictureFills++;
                    if (obj.fillType === 'linear-gradient' || obj.fillType === 'radial-gradient') counts.webglGradientFills++;
                    if (obj.fillType === 'pattern') counts.webglPatternFills++;
                    if (isImage && StageWebGLRenderer.hasImageFilterAdjustments(obj)) counts.webglImageFilters++;
                    if (isImage && Number(obj.imgBlur || 0) > 0.001) counts.webglImageBlur++;
                    if (StageWebGLRenderer.hasScaleOrFlipTransform(obj)) counts.webglTransformedObjects++;
                    if (StageWebGLRenderer.getStrokeDashMode(obj.strokeDash) > 0) counts.webglDashedLines++;
                    if (['line', 'arrow', 'doubleArrow'].includes(type) && StageWebGLRenderer.getStrokeCapMode(obj.strokeCap) !== 0) counts.webglLineCaps++;
                    if (isImage && Number(obj.borderRadius || 0) > 0) counts.webglRoundedImages++;
                    if (supportedShadow) counts.webglSimpleShadows++;
                    if (StageWebGLRenderer.getClipInfo(obj).mode > 0) counts.webglClipAnimations++;
                    if (supportedGlow) counts.webglGlowEffects++;
                    if (supportedReflection) counts.webglReflectionEffects++;
                } else {
                    addCanvasReason(StageWebGLRenderer.getCanvasFallbackReason(obj));
                }
            });

            counts.canvasRequired = Math.max(0, counts.total - counts.simpleRenderable);
            counts.allObjectsWebGLRenderable = counts.total > 0 && counts.simpleRenderable === counts.total;
            return counts;
        }

        static getCompatibilityReport(objects = [], options = {}) {
            const list = (Array.isArray(objects) ? objects : [])
                .filter(obj => obj && obj.visible !== false);
            const limit = Math.max(1, Number(options.limit || 6));
            const selectedIds = new Set((Array.isArray(options.selectedObjects) ? options.selectedObjects : [])
                .filter(Boolean)
                .map(obj => obj.id));
            const describe = (obj, index) => {
                const ready = StageWebGLRenderer.canRenderSimpleObject(obj);
                const reason = ready ? 'GPU-ready' : StageWebGLRenderer.getCanvasFallbackReason(obj);
                return {
                    id: obj.id || '',
                    index,
                    name: obj.name || obj.label || obj.type || 'Object',
                    type: obj.type || 'object',
                    ready,
                    reason,
                    suggestion: ready ? '' : StageWebGLRenderer.getCanvasFallbackSuggestion(reason)
                };
            };
            const all = list.map(describe);
            const blockers = all.filter(item => !item.ready).slice(0, limit);
            const selected = all.filter(item => selectedIds.has(item.id));
            return {
                total: all.length,
                ready: all.filter(item => item.ready).length,
                canvasRequired: all.filter(item => !item.ready).length,
                allReady: all.length > 0 && all.every(item => item.ready),
                blockers,
                selected
            };
        }

        static getCanvasFallbackSuggestion(reason) {
            const key = String(reason || '').toLowerCase();
            const suggestions = {
                'text': 'Use plain text styling, or keep Canvas2D for rich text and bullets.',
                'path/icon': 'Use the vector as-is for Canvas2D parity, or convert it to a simple image/object when GPU speed matters.',
                'complex object': 'Use a basic shape, image, or simple text object for WebGL object rendering.',
                'unsupported fill': 'Switch the fill to solid, supported picture, gradient, or pattern fill.',
                'line picture fill': 'Use a solid or gradient stroke for lines; picture fill works better on closed shapes.',
                'picture fill loading': 'Wait for the picture fill to finish loading, then try WebGL again.',
                'line gradient fill': 'Use a solid stroke for this line, or convert it to a filled shape.',
                'gradient stops': 'Use a simpler two-color gradient with valid color stops.',
                'line pattern fill': 'Use a solid stroke for this line, or convert it to a filled shape.',
                'unsupported pattern': 'Choose a built-in simple pattern or use a solid/gradient fill.',
                'fill color': 'Choose a valid fill color.',
                'stroke color': 'Choose a valid stroke color.',
                'unsupported dash': 'Use a standard dash style or a solid stroke.',
                'dashed shape border': 'Dashed borders currently render on line objects; use Canvas2D for dashed shape borders.',
                'unsupported line cap': 'Use round, butt, or square line caps.',
                'line without stroke': 'Give the line a visible stroke width.',
                'invalid shape sides': 'Set polygon/star sides to 3 or more.',
                'blurred shadow': 'Reduce shadow blur or turn shadow off for GPU object rendering.',
                'unsupported glow': 'Use a simple glow or turn glow off for GPU object rendering.',
                'unsupported reflection': 'Use a simple reflection or turn reflection off for GPU object rendering.',
                'glow/effect': 'Turn off bevel/advanced effects when GPU object rendering is needed.',
                'blend mode': 'Set blend mode to Normal.',
                'rigged/flex object': 'Rigged and flex objects intentionally use Canvas2D to match preview/export animation.',
                'mask/face layer': 'Masked, clone-brush, and face layers use Canvas2D for accurate compositing.',
                '3d tilt/depth': 'Set depth, tilt X, and tilt Y back to 0 for WebGL object rendering.',
                'image loading': 'Wait for the image asset to finish loading, or reload the image.',
                'image crop/mask': 'Apply or flatten the crop/mask when GPU object rendering is more important than editability.',
                'animated image': 'Wait for GIF frames to decode, or use Canvas2D for animated image parity.',
                'sprite sheet': 'Wait for sprite metadata to load, or keep Canvas2D for sprite playback.',
                'image filter': 'Use brightness, contrast, saturation, hue, grayscale, sepia, invert, or blur only.',
                'tiny line': 'Increase the line length.',
                'invalid size': 'Give the object a positive width and height.',
                'canvas-only object': 'This object uses a Canvas2D-only feature; keep Canvas2D or simplify the object.'
            };
            return suggestions[key] || 'Keep Canvas2D for this object, or simplify advanced styling/effects.';
        }

        static getSimpleObjectMode(type) {
            if (type === 'rectangle') return 1;
            if (type === 'circle') return 2;
            if (type === 'triangle') return 3;
            if (type === 'diamond') return 4;
            if (type === 'roundedRectangle') return 5;
            if (type === 'polygon') return 6;
            if (type === 'star') return 7;
            if (type === 'line') return 8;
            if (type === 'arrow') return 9;
            if (type === 'doubleArrow') return 10;
            if (type === 'image') return 11;
            if (type === 'text') return 12;
            if (StageWebGLRenderer.isSnapshotObjectType(type)) return 13;
            return 0;
        }

        static supportsWebGLDepthExtrusionType(objOrType) {
            if (typeof StageObject !== 'undefined' && StageObject?.supportsDepthExtrusionType) {
                return StageObject.supportsDepthExtrusionType(objOrType);
            }
            const type = typeof objOrType === 'string' ? objOrType : objOrType?.type;
            return [
                'image', 'icon', 'rectangle', 'circle', 'triangle', 'star', 'polygon', 'diamond', 'heart',
                'roundedRectangle', 'parallelogram', 'trapezium', 'hexagon', 'heptagon',
                'pie', 'chord', 'teardrop', 'lShape', 'can', 'plaque', 'doughnut',
                'blockArc', 'brace', 'bracket', 'bentArrow', 'uTurnArrow', 'quadArrow',
                'upDownArrow', 'upArrowCallout', 'elbowArrowConnector'
            ].includes(type);
        }

        static supportsWebGLDepthScaleType(type) {
            if (typeof StageObject !== 'undefined' && StageObject?.supportsDepthScaleType) {
                return StageObject.supportsDepthScaleType(type);
            }
            return type === 'image' || type === 'icon';
        }

        static supportsWebGLTiltType(type) {
            if (typeof StageObject !== 'undefined' && StageObject?.supportsTiltType) {
                return StageObject.supportsTiltType(type);
            }
            return type === 'image' || type === 'icon' || type === 'rectangle' || type === 'roundedRectangle' || type === 'freeform';
        }

        static getWebGLDepthValue(obj) {
            const raw = typeof obj?.depth === 'number' ? obj.depth : parseFloat(obj?.depth);
            return Number.isFinite(raw) ? raw : 0;
        }

        static getWebGLDepthScale(obj) {
            const depth = StageWebGLRenderer.getWebGLDepthValue(obj);
            const rawPerspective = typeof obj?.depthPerspective === 'number' ? obj.depthPerspective : parseFloat(obj?.depthPerspective);
            const perspective = Number.isFinite(rawPerspective) ? Math.max(0, Math.min(100, rawPerspective)) / 100 : 0;
            if (!StageWebGLRenderer.supportsWebGLDepthScaleType(obj?.type) || Math.abs(depth) < 0.01 || perspective <= 0.001) return 1;
            return Math.max(0.15, Math.min(6, 1 + depth * 0.004 * perspective));
        }

        static getWebGLDepthVector(obj) {
            const depth = StageWebGLRenderer.getWebGLDepthValue(obj);
            if (!StageWebGLRenderer.supportsWebGLDepthExtrusionType(obj) || Math.abs(depth) < 0.01) {
                return { dx: 0, dy: 0, active: false };
            }
            if (obj && typeof obj.getDepthExtrusionVector === 'function') {
                const vector = obj.getDepthExtrusionVector();
                return vector?.active ? vector : { dx: 0, dy: 0, active: false };
            }
            const angle = -Math.PI / 4;
            return { dx: Math.cos(angle) * depth, dy: Math.sin(angle) * depth, active: true };
        }

        static getWebGLTiltInverse(obj, includeTilt = true) {
            if (!includeTilt || !StageWebGLRenderer.supportsWebGLTiltType(obj?.type)) return [1, 0, 0, 1];
            let tilt = null;
            if (typeof StageObject !== 'undefined' && StageObject?.getTiltTransformComponents) {
                tilt = StageObject.getTiltTransformComponents(obj);
            }
            if (!tilt?.active) return [1, 0, 0, 1];
            const a = Number(tilt.a ?? 1);
            const b = Number(tilt.b ?? 0);
            const c = Number(tilt.c ?? 0);
            const d = Number(tilt.d ?? 1);
            const det = a * d - b * c;
            if (!Number.isFinite(det) || Math.abs(det) < 0.0001) return [1, 0, 0, 1];
            return [d / det, -b / det, -c / det, a / det];
        }

        static shadeColorArray(color, amount = -0.32, alphaScale = 1) {
            const src = Array.isArray(color) ? color : [0.29, 0.56, 0.85, 1];
            const shade = (channel) => {
                const value = Math.max(0, Math.min(1, Number(channel) || 0));
                return amount >= 0
                    ? value + (1 - value) * amount
                    : value * (1 + amount);
            };
            return [
                shade(src[0]),
                shade(src[1]),
                shade(src[2]),
                Math.max(0, Math.min(1, Number(src[3] ?? 1) * alphaScale))
            ];
        }

        static getWebGLDepthLighting(obj) {
            const raw = typeof obj?.depthLighting === 'number' ? obj.depthLighting : parseFloat(obj?.depthLighting);
            return Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) / 100 : 0.45;
        }

        static getWebGLDepthSideColor(obj, fallbackColor) {
            const color = parseCssColor(obj?.depthSideColor || '');
            return color || fallbackColor || [0.29, 0.56, 0.85, 1];
        }

        static getClipInfo(obj) {
            const clipProps = [
                ['_clipWipeRight', 1],
                ['_clipWipeLeft', 2],
                ['_clipWipeDown', 3],
                ['_clipWipeUp', 4],
                ['_clipStripsH', 5],
                ['_clipStripsV', 6],
                ['_clipWheel', 7],
                ['_clipWedge', 8]
            ];
            for (const [prop, mode] of clipProps) {
                if (obj && obj[prop] !== undefined) {
                    const progress = Math.max(0, Math.min(1, Number(obj[prop]) || 0));
                    return { mode, progress };
                }
            }
            return { mode: 0, progress: 1 };
        }

        static isImageReady(obj) {
            const img = StageWebGLRenderer.getImageTextureSource(obj);
            if (!img) return false;
            const width = Number(img.naturalWidth || img.videoWidth || img.width || 0);
            const height = Number(img.naturalHeight || img.videoHeight || img.height || 0);
            return width > 0 && height > 0 && (img.complete !== false || img.tagName !== 'IMG');
        }

        static getCurrentGifFrameInfo(obj) {
            if (!obj?.isAnimatedGif || !Array.isArray(obj._gifFrames) || obj._gifFrames.length <= 1) return null;
            const frames = obj._gifFrames;
            let index = 0;
            if (typeof obj._getCurrentGifFrameIndex === 'function') {
                index = obj._getCurrentGifFrameIndex();
            } else if (Array.isArray(obj.gifFrameDelays) && obj.gifFrameDelays.length && Number(obj._gifTotalDuration || 0) > 0) {
                const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
                const elapsed = (now - Number(obj._gifStartTime || now)) % Number(obj._gifTotalDuration || 1);
                let acc = 0;
                for (let i = 0; i < obj.gifFrameDelays.length; i++) {
                    acc += Number(obj.gifFrameDelays[i] || 0);
                    if (elapsed < acc) {
                        index = i;
                        break;
                    }
                }
            }
            index = Math.max(0, Math.min(frames.length - 1, Number(index) || 0));
            const source = frames[index] || null;
            if (!source) return null;
            const width = Number(source.naturalWidth || source.videoWidth || source.width || 0);
            const height = Number(source.naturalHeight || source.videoHeight || source.height || 0);
            if (!(width > 0) || !(height > 0)) return null;
            return { source, index };
        }

        static getImageTextureSource(obj) {
            const gifFrame = StageWebGLRenderer.getCurrentGifFrameInfo(obj);
            if (gifFrame?.source) return gifFrame.source;
            return obj?._eraserCanvas
                || obj?._removedBgCanvas
                || obj?.imageElement
                || obj?._imgEl
                || obj?._imageElementInternal
                || null;
        }

        static hasEditedImageCanvas(obj) {
            return !!(obj?._eraserCanvas || obj?._removedBgCanvas);
        }

        static normalizeSpriteFrameRect(rect, source) {
            if (!rect || !source) return null;
            const texW = Number(source.naturalWidth || source.videoWidth || source.width || 0);
            const texH = Number(source.naturalHeight || source.videoHeight || source.height || 0);
            if (!(texW > 0) || !(texH > 0)) return null;
            const x = Math.max(0, Math.min(texW - 1, Number(rect.x || 0)));
            const y = Math.max(0, Math.min(texH - 1, Number(rect.y || 0)));
            const width = Math.max(1, Math.min(texW - x, Number(rect.width || 0)));
            const height = Math.max(1, Math.min(texH - y, Number(rect.height || 0)));
            return { x, y, width, height, texW, texH };
        }

        static getCurrentSpriteFrameRect(obj, source = null) {
            if (!obj?.isSpriteSequence || !obj?.spriteSheet) return null;
            const img = source || StageWebGLRenderer.getImageTextureSource(obj);
            if (!img) return null;
            if (typeof obj._getCurrentSpriteFrameRect === 'function') {
                return StageWebGLRenderer.normalizeSpriteFrameRect(obj._getCurrentSpriteFrameRect(img), img);
            }

            const sheet = obj.spriteSheet || {};
            const columns = Math.max(1, Number(sheet.columns) || 1);
            const rows = Math.max(1, Number(sheet.rows) || 1);
            const indices = Array.isArray(sheet.frameIndices) && sheet.frameIndices.length
                ? sheet.frameIndices
                : Array.from({ length: Math.max(1, columns * rows) }, (_, index) => index);
            const frameDuration = Math.max(20, Number(sheet.frameDuration) || 100);
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
            const elapsed = Number.isFinite(obj._spriteTimelineTime)
                ? Math.max(0, obj._spriteTimelineTime)
                : Math.max(0, now - (obj._spriteStartTime || now));
            const rawIndex = Math.floor(elapsed / frameDuration);
            const sequenceIndex = sheet.loop === false
                ? Math.min(indices.length - 1, rawIndex)
                : rawIndex % indices.length;
            const frameIndex = indices[Math.max(0, sequenceIndex)] || 0;
            const gapX = Math.max(0, Number(sheet.gapX) || 0);
            const gapY = Math.max(0, Number(sheet.gapY) || 0);
            const marginX = Math.max(0, Number(sheet.marginX) || 0);
            const marginY = Math.max(0, Number(sheet.marginY) || 0);
            const sourceWidth = Number(img.naturalWidth || img.videoWidth || img.width || 1);
            const sourceHeight = Number(img.naturalHeight || img.videoHeight || img.height || 1);
            const frameWidth = Math.max(1, Number(sheet.frameWidth) || Math.floor((sourceWidth - marginX * 2 - gapX * (columns - 1)) / columns));
            const frameHeight = Math.max(1, Number(sheet.frameHeight) || Math.floor((sourceHeight - marginY * 2 - gapY * (rows - 1)) / rows));
            return StageWebGLRenderer.normalizeSpriteFrameRect({
                x: marginX + (frameIndex % columns) * (frameWidth + gapX),
                y: marginY + Math.floor(frameIndex / columns) * (frameHeight + gapY),
                width: frameWidth,
                height: frameHeight
            }, img);
        }

        static isTextureImageReady(obj) {
            const img = obj?.textureImageElement || obj?._textureImgEl || obj?._textureImageElementInternal || null;
            if (!img) return false;
            const width = Number(img.naturalWidth || img.videoWidth || img.width || 0);
            const height = Number(img.naturalHeight || img.videoHeight || img.height || 0);
            return width > 0 && height > 0 && (img.complete !== false || img.tagName !== 'IMG');
        }

        static getRenderableGradientStops(obj) {
            if (!obj || !['linear-gradient', 'radial-gradient'].includes(obj.fillType)) return null;
            const stops = Array.isArray(obj.gradientStops) ? obj.gradientStops : [];
            if (stops.length < 2 || stops.length > 4) return null;
            const normalized = stops.map((stop, index) => {
                const color = parseCssColor(stop?.color);
                if (!color) return null;
                const fallbackOffset = stops.length === 1 ? 0 : index / Math.max(1, stops.length - 1);
                const offset = Math.max(0, Math.min(1, Number.isFinite(Number(stop?.offset)) ? Number(stop.offset) : fallbackOffset));
                return { offset, color };
            });
            if (normalized.some(stop => !stop)) return null;
            return normalized.sort((a, b) => a.offset - b.offset);
        }

        static getPatternModeId(patternType) {
            if (patternType === 'stripes') return 1;
            if (patternType === 'dots') return 2;
            if (patternType === 'crosshatch') return 3;
            if (patternType === 'checkerboard') return 4;
            return 0;
        }

        static getRenderablePatternFill(obj) {
            if (!obj || obj.fillType !== 'pattern') return null;
            const mode = StageWebGLRenderer.getPatternModeId(obj.patternType || 'none');
            if (!mode) return null;
            const baseColor = parseCssColor(obj.fill || '#4a90d9');
            const accentColor = parseCssColor(obj.patternColor || '#ffffff');
            if (!baseColor || !accentColor) return null;
            const scale = Math.max(0.25, Math.min(4, Number(obj.patternScale || 1)));
            return { mode, baseColor, accentColor, scale };
        }

        static hasUnsupportedImageFilterAdjustments(obj) {
            return false;
        }

        static hasImageFilterAdjustments(obj) {
            if (!obj || obj.type !== 'image') return false;
            return Math.abs(Number(obj.imgBrightness || 0)) > 0.001
                || Math.abs(Number(obj.imgContrast || 0)) > 0.001
                || Math.abs(Number(obj.imgSaturation || 0)) > 0.001
                || Math.abs(Number(obj.imgHue || 0)) > 0.001
                || Math.abs(Number(obj.imgGrayscale || 0)) > 0.001
                || Math.abs(Number(obj.imgSepia || 0)) > 0.001
                || Math.abs(Number(obj.imgInvert || 0)) > 0.001
                || Math.abs(Number(obj.imgTintAmount || 0)) > 0.001
                || Math.abs(Number(obj.imgBlur || 0)) > 0.001;
        }

        static hasScaleOrFlipTransform(obj) {
            if (!obj) return false;
            return !!obj.flipH
                || !!obj.flipV
                || Math.abs(Number(obj.scaleX ?? 1) - 1) > 0.001
                || Math.abs(Number(obj.scaleY ?? 1) - 1) > 0.001;
        }

        static getStrokeDashMode(strokeDash) {
            if (!strokeDash || strokeDash === 'solid') return 0;
            if (strokeDash === 'dashed') return 1;
            if (strokeDash === 'dotted') return 2;
            if (strokeDash === 'dash-dot') return 3;
            return -1;
        }

        static getStrokeCapMode(strokeCap) {
            if (!strokeCap || strokeCap === 'round') return 0;
            if (strokeCap === 'butt') return 1;
            if (strokeCap === 'square') return 2;
            return 0;
        }

        static canRenderSimpleShadow(obj) {
            if (!obj?.shadow) return true;
            const blur = Math.abs(Number(obj.shadowBlur ?? 10));
            if (blur > 0.001) return false;
            return !!parseCssColor(obj.shadowColor || 'rgba(0,0,0,0.3)');
        }

        static hasSimpleShadow(obj) {
            return !!(obj?.shadow && !obj?.glowEnabled && StageWebGLRenderer.canRenderSimpleShadow(obj));
        }

        static canRenderSimpleGlow(obj) {
            if (!obj?.glowEnabled) return true;
            const size = Number(obj.glowSize ?? 15);
            return Number.isFinite(size)
                && size >= 0
                && size <= 96
                && !!parseCssColor(obj.glowColor || '#00bfff');
        }

        static hasSimpleGlow(obj) {
            return !!(obj?.glowEnabled && StageWebGLRenderer.canRenderSimpleGlow(obj));
        }

        static canRenderSimpleReflection(obj) {
            if (!obj?.reflectionEnabled) return true;
            const mode = StageWebGLRenderer.getSimpleObjectMode(obj.type);
            if (!mode || mode === 12 || mode === 13) return false;
            if (['line', 'arrow', 'doubleArrow', 'path', 'scribble', 'text'].includes(obj.type)) return false;
            const opacity = Number(obj.reflectionOpacity ?? 0.3);
            const offset = Number(obj.reflectionOffset ?? 0);
            return Number.isFinite(opacity)
                && Number.isFinite(offset)
                && opacity >= 0
                && opacity <= 1
                && Math.abs(offset) <= 512;
        }

        static hasSimpleReflection(obj) {
            return !!(obj?.reflectionEnabled && StageWebGLRenderer.canRenderSimpleReflection(obj));
        }

        static isSnapshotObjectType(type) {
            return ['path', 'scribble', 'freeform', 'curvedArrow', 'icon', 'symbol'].includes(type);
        }

        static getSnapshotBounds(obj, pad = 0) {
            if (!obj) return null;
            const points = Array.isArray(obj.pathPoints) ? obj.pathPoints : [];
            let minX = Math.min(Number(obj.x || 0), Number(obj.x || 0) + Number(obj.width || 0));
            let minY = Math.min(Number(obj.y || 0), Number(obj.y || 0) + Number(obj.height || 0));
            let maxX = Math.max(Number(obj.x || 0), Number(obj.x || 0) + Number(obj.width || 0));
            let maxY = Math.max(Number(obj.y || 0), Number(obj.y || 0) + Number(obj.height || 0));

            if (points.length) {
                minX = Math.min(...points.map(point => Number(point?.x || 0)));
                minY = Math.min(...points.map(point => Number(point?.y || 0)));
                maxX = Math.max(...points.map(point => Number(point?.x || 0)));
                maxY = Math.max(...points.map(point => Number(point?.y || 0)));
            } else if (obj.type === 'curvedArrow') {
                const x = Number(obj.x || 0);
                const y = Number(obj.y || 0);
                const w = Number(obj.width || 0);
                const h = Number(obj.height || 0);
                minX = Math.min(x, x + w, x + w * 0.5);
                maxX = Math.max(x, x + w, x + w * 0.5);
                minY = Math.min(y, y + h, y - h * 0.35);
                maxY = Math.max(y, y + h, y - h * 0.35);
            }

            if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
            const inset = Math.max(0, Number(pad || 0));
            const x = Math.floor(minX - inset);
            const y = Math.floor(minY - inset);
            const right = Math.ceil(maxX + inset);
            const bottom = Math.ceil(maxY + inset);
            const width = Math.max(1, right - x);
            const height = Math.max(1, bottom - y);
            return { x, y, width, height };
        }

        static canRenderSnapshotObject(obj) {
            if (!obj || obj.visible === false || !StageWebGLRenderer.isSnapshotObjectType(obj.type)) return false;
            if (obj.text) return false;
            if (obj.shadow || obj.glowEnabled || obj.reflectionEnabled || obj.bevelEnabled) return false;
            if (obj.blendMode && obj.blendMode !== 'normal') return false;
            if (obj.joints?.length || obj.pinnedTo || obj.flex || obj.flexEnabled || obj.flexMesh || obj.bodyPartData || obj.faceRigPartRole) return false;
            if (obj.layerMask || obj.cloneBrushLayer || obj.faceRig || obj._facialParentHead) return false;
            if (obj.depth || obj.tiltX || obj.tiltY) return false;
            if (obj.fillType && obj.fillType !== 'solid' && obj.fillType !== 'none') return false;
            if (obj.type === 'icon' && !obj.iconPath) return false;
            if (obj.type === 'symbol' && !window.app?.symbols?.renderInstance) return false;
            if (['path', 'scribble', 'freeform'].includes(obj.type) && (!Array.isArray(obj.pathPoints) || obj.pathPoints.length < 2)) return false;
            if (['path', 'scribble', 'curvedArrow'].includes(obj.type) && !(Number(obj.strokeWidth || 0) > 0)) return false;
            const bounds = StageWebGLRenderer.getSnapshotBounds(obj, Math.max(8, Number(obj.strokeWidth || 0) * 3));
            if (!bounds || bounds.width <= 0 || bounds.height <= 0) return false;
            return bounds.width <= 4096 && bounds.height <= 4096;
        }

        static getSnapshotFallbackReason(obj) {
            if (!obj || !StageWebGLRenderer.isSnapshotObjectType(obj.type)) return 'path/icon';
            if (obj.text) return 'text';
            if (obj.shadow || obj.glowEnabled || obj.reflectionEnabled || obj.bevelEnabled) return 'effect';
            if (obj.blendMode && obj.blendMode !== 'normal') return 'blend mode';
            if (obj.joints?.length || obj.pinnedTo || obj.flex || obj.flexEnabled || obj.flexMesh || obj.rigging?.pins?.length || obj.bodyPartData || obj.faceRigPartRole) return 'rigged/flex object';
            if (obj.layerMask || obj.cloneBrushLayer || obj.faceRig || obj._facialParentHead) return 'mask/face layer';
            if (obj.depth || obj.tiltX || obj.tiltY) return '3D tilt/depth';
            if (obj.fillType && obj.fillType !== 'solid' && obj.fillType !== 'none') return 'advanced fill';
            if (obj.type === 'icon' && !obj.iconPath) return 'icon data';
            if (obj.type === 'symbol' && !window.app?.symbols?.renderInstance) return 'symbol renderer';
            if (['path', 'scribble', 'freeform'].includes(obj.type) && (!Array.isArray(obj.pathPoints) || obj.pathPoints.length < 2)) return 'path points';
            if (['path', 'scribble', 'curvedArrow'].includes(obj.type) && !(Number(obj.strokeWidth || 0) > 0)) return 'stroke width';
            return 'path/icon';
        }

        static canRenderTextObject(obj) {
            if (!obj || obj.visible === false || obj.type !== 'text') return false;
            if (!String(obj.text || '').length) return false;
            if (!(Number(obj.width) > 0)) return false;
            if (!(Number(obj.height || obj.fontSize || 1) > 0)) return false;
            if (obj.shadow || obj.glowEnabled || obj.reflectionEnabled || obj.bevelEnabled) return false;
            if (obj.blendMode && obj.blendMode !== 'normal') return false;
            if (obj.joints?.length || obj.pinnedTo || obj.flex || obj.flexEnabled || obj.flexMesh || obj.rigging?.pins?.length || obj.bodyPartData || obj.faceRigPartRole) return false;
            if (obj.layerMask || obj.cloneBrushLayer || obj.faceRig || obj._facialParentHead) return false;
            if (obj.depth || obj.tiltX || obj.tiltY) return false;
            if (Math.abs(Number(obj.textCurve || 0)) > 0.001) return false;
            if (!parseCssColor(obj.textColor || obj.fill || '#ffffff')) return false;
            if (Number(obj.textStrokeWidth || 0) > 0 && !parseCssColor(obj.textStrokeColor || '#000000')) return false;
            if (obj.textBackgroundEnabled && !parseCssColor(obj.textBackgroundColor || '#111827')) return false;
            if (String(obj.text || '').length > 4000) return false;
            return true;
        }

        static getTextFallbackReason(obj) {
            if (!obj || obj.type !== 'text') return 'text';
            if (!String(obj.text || '').length) return 'empty text';
            if (Math.abs(Number(obj.textCurve || 0)) > 0.001) return 'curved text';
            if (obj.shadow || obj.glowEnabled || obj.reflectionEnabled || obj.bevelEnabled) return 'text effect';
            if (obj.blendMode && obj.blendMode !== 'normal') return 'blend mode';
            if (obj.joints?.length || obj.pinnedTo || obj.flex || obj.flexEnabled || obj.flexMesh || obj.rigging?.pins?.length || obj.bodyPartData || obj.faceRigPartRole) return 'rigged/flex object';
            if (obj.layerMask || obj.cloneBrushLayer || obj.faceRig || obj._facialParentHead) return 'mask/face layer';
            if (obj.depth || obj.tiltX || obj.tiltY) return '3D tilt/depth';
            if (!(Number(obj.width) > 0) || !(Number(obj.height || obj.fontSize || 1) > 0)) return 'invalid size';
            return 'text';
        }

        static canRenderSimpleObject(obj) {
            if (!obj || obj.visible === false) return false;
            if (obj.realistic3D) return false;
            if (!StageWebGLRenderer.getSimpleObjectMode(obj.type)) return false;
            if (obj.type === 'text') return StageWebGLRenderer.canRenderTextObject(obj);
            if (StageWebGLRenderer.isSnapshotObjectType(obj.type)) return StageWebGLRenderer.canRenderSnapshotObject(obj);
            if (obj.text) return false;
            const isImage = obj.type === 'image';
            const lineLike = ['line', 'arrow', 'doubleArrow'].includes(obj.type);
            const pictureFill = !isImage && obj.fillType === 'picture';
            const gradientFill = !isImage && (obj.fillType === 'linear-gradient' || obj.fillType === 'radial-gradient');
            const patternFill = !isImage && obj.fillType === 'pattern';
            if (!isImage && obj.fillType && obj.fillType !== 'solid' && !pictureFill && !gradientFill && !patternFill) return false;
            if (pictureFill) {
                if (lineLike || !StageWebGLRenderer.isTextureImageReady(obj)) return false;
            } else if (gradientFill) {
                if (lineLike || !StageWebGLRenderer.getRenderableGradientStops(obj)) return false;
            } else if (patternFill) {
                if (lineLike || !StageWebGLRenderer.getRenderablePatternFill(obj)) return false;
            } else if (!isImage && !parseCssColor(obj.fill || '#4a90d9')) return false;
            if ((obj.strokeWidth || 0) > 0 && !parseCssColor(obj.stroke || '#000000')) return false;
            const dashMode = StageWebGLRenderer.getStrokeDashMode(obj.strokeDash);
            if (dashMode < 0 || (dashMode > 0 && !lineLike)) return false;
            if (lineLike && !['', 'round', 'butt', 'square'].includes(obj.strokeCap || '')) return false;
            if (lineLike && !(Number(obj.strokeWidth || 0) > 0)) return false;
            if (['polygon', 'star'].includes(obj.type) && !(Number(obj.sides || 0) >= 3)) return false;
            if ((obj.shadow && !obj.glowEnabled && !StageWebGLRenderer.canRenderSimpleShadow(obj))
                || (obj.glowEnabled && !StageWebGLRenderer.canRenderSimpleGlow(obj))
                || (obj.reflectionEnabled && !StageWebGLRenderer.canRenderSimpleReflection(obj))
                || obj.bevelEnabled) return false;
            if (obj.blendMode && obj.blendMode !== 'normal') return false;
            if (obj.joints?.length || obj.pinnedTo || obj.flex || obj.flexEnabled || obj.flexMesh || obj.bodyPartData || obj.faceRigPartRole) return false;
            if (obj.layerMask || obj.cloneBrushLayer || obj.faceRig || obj._facialParentHead) return false;
            if (isImage && Math.abs(Number(obj.depth || 0)) > 0.01) return false;
            if (isImage) {
                if (!StageWebGLRenderer.isImageReady(obj)) return false;
                if (obj.crop || obj.cropBox || obj.maskPath) return false;
                if ((obj.isAnimatedGif || obj._gifFrames) && !StageWebGLRenderer.getCurrentGifFrameInfo(obj)) return false;
                if ((obj.isSpriteSequence || obj.spriteSheet) && !StageWebGLRenderer.getCurrentSpriteFrameRect(obj)) return false;
                if (StageWebGLRenderer.hasUnsupportedImageFilterAdjustments(obj)) return false;
            }
            if (lineLike) {
                return Math.hypot(Number(obj.width || 0), Number(obj.height || 0)) > 0.5;
            }
            return Number(obj.width) > 0 && Number(obj.height) > 0;
        }

        static getCanvasFallbackReason(obj) {
            if (!obj || obj.visible === false) return '';
            const type = obj.type || 'object';
            const isImage = type === 'image';
            const lineLike = ['line', 'arrow', 'doubleArrow'].includes(type);
            if (type === 'text') return StageWebGLRenderer.getTextFallbackReason(obj);
            if (StageWebGLRenderer.isSnapshotObjectType(type)) return StageWebGLRenderer.getSnapshotFallbackReason(obj);
            if (!StageWebGLRenderer.getSimpleObjectMode(type)) {
                if (type === 'text' || obj.text) return 'text';
                if (['path', 'scribble', 'freeform', 'curvedArrow', 'icon', 'symbol'].includes(type)) return 'path/icon';
                return 'complex object';
            }
            if (obj.text) return 'text';

            const pictureFill = !isImage && obj.fillType === 'picture';
            const gradientFill = !isImage && (obj.fillType === 'linear-gradient' || obj.fillType === 'radial-gradient');
            const patternFill = !isImage && obj.fillType === 'pattern';
            if (!isImage && obj.fillType && obj.fillType !== 'solid' && !pictureFill && !gradientFill && !patternFill) return 'unsupported fill';
            if (pictureFill && lineLike) return 'line picture fill';
            if (pictureFill && !StageWebGLRenderer.isTextureImageReady(obj)) return 'picture fill loading';
            if (gradientFill && lineLike) return 'line gradient fill';
            if (gradientFill && !StageWebGLRenderer.getRenderableGradientStops(obj)) return 'gradient stops';
            if (patternFill && lineLike) return 'line pattern fill';
            if (patternFill && !StageWebGLRenderer.getRenderablePatternFill(obj)) return 'unsupported pattern';
            if (!isImage && !parseCssColor(obj.fill || '#4a90d9')) return 'fill color';
            if ((obj.strokeWidth || 0) > 0 && !parseCssColor(obj.stroke || '#000000')) return 'stroke color';

            const dashMode = StageWebGLRenderer.getStrokeDashMode(obj.strokeDash);
            if (dashMode < 0) return 'unsupported dash';
            if (dashMode > 0 && !lineLike) return 'dashed shape border';
            if (lineLike && !['', 'round', 'butt', 'square'].includes(obj.strokeCap || '')) return 'unsupported line cap';
            if (lineLike && !(Number(obj.strokeWidth || 0) > 0)) return 'line without stroke';
            if (['polygon', 'star'].includes(type) && !(Number(obj.sides || 0) >= 3)) return 'invalid shape sides';
            if (obj.shadow && !obj.glowEnabled && !StageWebGLRenderer.canRenderSimpleShadow(obj)) return 'blurred shadow';
            if (obj.glowEnabled && !StageWebGLRenderer.canRenderSimpleGlow(obj)) return 'unsupported glow';
            if (obj.reflectionEnabled && !StageWebGLRenderer.canRenderSimpleReflection(obj)) return 'unsupported reflection';
            if (obj.bevelEnabled) return 'glow/effect';
            if (obj.blendMode && obj.blendMode !== 'normal') return 'blend mode';
            if (obj.joints?.length || obj.pinnedTo || obj.flex || obj.flexEnabled || obj.flexMesh || obj.bodyPartData || obj.faceRigPartRole) return 'rigged/flex object';
            if (obj.layerMask || obj.cloneBrushLayer || obj.faceRig || obj._facialParentHead) return 'mask/face layer';
            if (isImage && Math.abs(Number(obj.depth || 0)) > 0.01) return 'image silhouette depth';
            if (isImage) {
                if (!StageWebGLRenderer.isImageReady(obj)) return 'image loading';
                if (obj.crop || obj.cropBox || obj.maskPath) return 'image crop/mask';
                if ((obj.isAnimatedGif || obj._gifFrames) && !StageWebGLRenderer.getCurrentGifFrameInfo(obj)) return 'animated image';
                if ((obj.isSpriteSequence || obj.spriteSheet) && !StageWebGLRenderer.getCurrentSpriteFrameRect(obj)) return 'sprite sheet';
                if (StageWebGLRenderer.hasUnsupportedImageFilterAdjustments(obj)) return 'image filter';
            }
            if (lineLike && Math.hypot(Number(obj.width || 0), Number(obj.height || 0)) <= 0.5) return 'tiny line';
            if (Number(obj.width) <= 0 || Number(obj.height) <= 0) return 'invalid size';
            return 'canvas-only object';
        }

        static runSelfTest() {
            const canvas = document.createElement('canvas');
            canvas.width = 4;
            canvas.height = 4;
            const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
            if (!gl) return { ok: false, message: 'WebGL context unavailable' };
            const texture = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
            const err = gl.getError();
            const activeRenderer = window.app?.stage?.webglRenderer
                || window.app?.stageManager?.webglRenderer
                || window.stage?.webglRenderer
                || null;
            const shaderReady = !!(activeRenderer?.supported && activeRenderer?.program);
            return err === gl.NO_ERROR
                ? {
                    ok: true,
                    message: shaderReady
                        ? 'WebGL context, texture upload, and Animation Stage shader passed'
                        : 'WebGL context and texture upload passed'
                }
                : { ok: false, message: `WebGL texture test failed (${err})` };
        }

        init() {
            if (!this.canvas) {
                this.lastError = 'No WebGL canvas';
                return false;
            }
            try {
                this._clearTextureCaches({ deleteGpu: true, clearCanvases: false });
                this._contextLost = false;
                this.gl = this.canvas.getContext('webgl2', { alpha: true, antialias: true })
                    || this.canvas.getContext('webgl', { alpha: true, antialias: true });
                if (!this.gl) {
                    this.lastError = 'WebGL is not available in this browser';
                    return false;
                }
                this.program = this._createProgram();
                this.buffer = this.gl.createBuffer();
                this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.buffer);
                this.gl.bufferData(
                    this.gl.ARRAY_BUFFER,
                    new Float32Array([-1, -1, 3, -1, -1, 3]),
                    this.gl.STATIC_DRAW
                );
                this.texture = this.gl.createTexture();
                this.objectTextures = new Map();
                this._uploadSolidTexture([255, 255, 255, 255]);
                this.supported = true;
                this.resize();
                return true;
            } catch (err) {
                this.lastError = err?.message || String(err);
                this.supported = false;
                return false;
            }
        }

        isActive() {
            return !!(this.active && this.supported);
        }

        canRenderStageBackground() {
            const type = this.stage?.bgType || 'solid';
            return ['solid', 'transparent', 'linear-gradient', 'radial-gradient', 'pattern', 'image'].includes(type);
        }

        setActive(active) {
            this.active = !!(active && this.supported);
            this.canvas?.classList.toggle('active', this.active);
            document.body?.classList.toggle('webgl-renderer-active', this.active);
            if (!this.active) {
                this._clearTextureCaches({ deleteGpu: true, clearCanvases: true });
                this.clear();
            } else {
                this.resize();
                this.render();
            }
        }

        resize() {
            if (!this.canvas || !this.gl || !this.stage) return;
            const rect = this.stage.viewport?.getBoundingClientRect?.() || { width: 1, height: 1 };
            const dpr = window.devicePixelRatio || 1;
            const width = Math.max(1, Math.round(rect.width * dpr));
            const height = Math.max(1, Math.round(rect.height * dpr));
            if (this.canvas.width !== width) this.canvas.width = width;
            if (this.canvas.height !== height) this.canvas.height = height;
            this.canvas.style.width = rect.width + 'px';
            this.canvas.style.height = rect.height + 'px';
            this.gl.viewport(0, 0, width, height);
        }

        clear() {
            if (!this.gl) return;
            this.gl.clearColor(0, 0, 0, 0);
            this.gl.clear(this.gl.COLOR_BUFFER_BIT);
        }

        canRenderObjectScene(objects = []) {
            const visible = (Array.isArray(objects) ? objects : []).filter(obj => obj && obj.visible !== false);
            return visible.length > 0 && visible.every(obj => StageWebGLRenderer.canRenderSimpleObject(obj));
        }

        getObjectRenderPlan(objects = [], options = {}) {
            const objectManager = options.objectManager || null;
            const isLayerVisible = obj => !objectManager?.isObjectLayerVisible
                || objectManager.isObjectLayerVisible(obj) !== false;
            const visible = (Array.isArray(objects) ? objects : [])
                .filter(obj => obj && obj.visible !== false && isLayerVisible(obj));
            if (!visible.length) return { objects: [], ids: [], full: false, partial: false, reason: 'empty' };

            const layerAnimIds = objectManager?._getLayerOrderAnimObjectIds?.() || new Set();
            const orderedVisible = objectManager?._orderObjectsByAnimatedLayer
                ? objectManager._orderObjectsByAnimatedLayer(visible, layerAnimIds)
                : visible;
            if (layerAnimIds?.size) {
                const ordered = orderedVisible;
                const allRenderable = ordered.every(obj => StageWebGLRenderer.canRenderSimpleObject(obj));
                return allRenderable
                    ? { objects: ordered, ids: ordered.map(obj => obj.id), full: true, partial: false, reason: 'all-gpu-layer-anim' }
                    : { objects: [], ids: [], full: false, partial: false, reason: 'animated-layer-order' };
            }

            const gpuBottom = [];
            for (const obj of orderedVisible) {
                if (!StageWebGLRenderer.canRenderSimpleObject(obj)) break;
                gpuBottom.push(obj);
            }
            if (!gpuBottom.length) return { objects: [], ids: [], full: false, partial: false, reason: 'first-object-canvas' };
            const full = gpuBottom.length === visible.length;
            if (!full && options.allowPartial === false) {
                return { objects: [], ids: [], full: false, partial: false, reason: 'partial-disabled' };
            }
            return {
                objects: gpuBottom,
                ids: gpuBottom.map(obj => obj.id),
                full,
                partial: !full,
                reason: full ? 'all-gpu-safe' : 'bottom-gpu-safe'
            };
        }

        render(options = {}) {
            if (!this.isActive()) return { objectsRendered: false };
            const renderStart = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const gl = this.gl;
            const stage = this.stage;
            this.resize();
            this._pruneTextureCaches(options.objects || stage?.objectManager?.objects || window.app?.objects?.objects || []);

            const rect = this._getStageScreenRect();
            const bgType = this._getBgTypeId(stage.bgType);
            const opacity = Math.max(0, Math.min(1, Number(stage.bgOpacity ?? 1)));
            const color = parseHexColor(stage.bgColor, [26 / 255, 26 / 255, 46 / 255, 1]);
            const gradStart = parseHexColor(stage.bgGradStart || stage.bgColor, color);
            const gradEnd = parseHexColor(stage.bgGradEnd || stage.bgColor, color);
            const textureReady = this._ensureBackgroundTexture();

            gl.useProgram(this.program);
            this._uniform2f('u_resolution', this.canvas.width, this.canvas.height);
            this._uniform4f('u_stageRect', rect.x, rect.y, rect.width, rect.height);
            this._uniform1i('u_bgType', this.canRenderStageBackground() ? bgType : -1);
            this._uniform1i('u_pass', 0);
            this._uniform1i('u_useTexture', textureReady ? 1 : 0);
            this._uniform1i('u_imageFit', this._getImageFitId(stage.bgImageFit));
            this._uniform4fv('u_workspace', WORKSPACE_COLOR);
            this._uniform4fv('u_color', [color[0], color[1], color[2], opacity]);
            this._uniform4fv('u_gradStart', [gradStart[0], gradStart[1], gradStart[2], opacity]);
            this._uniform4fv('u_gradEnd', [gradEnd[0], gradEnd[1], gradEnd[2], opacity]);
            this._uniform1f('u_gradAngle', Number(stage.bgGradAngle || 180) * Math.PI / 180);
            this._uniform2f('u_stageSize', Number(stage.width || 1), Number(stage.height || 1));
            this._uniform2f('u_textureSize', this.textureSize.width, this.textureSize.height);
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            this._uniform1i('u_texture', 0);

            const pos = gl.getAttribLocation(this.program, 'a_position');
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
            gl.enableVertexAttribArray(pos);
            gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
            gl.disable(gl.DEPTH_TEST);
            gl.disable(gl.CULL_FACE);
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
            gl.drawArrays(gl.TRIANGLES, 0, 3);

            let objectsRendered = false;
            let objectPlan = null;
            if (options.renderObjects) {
                objectPlan = options.objectPlan || this.getObjectRenderPlan(options.objects || []);
                objectsRendered = this.renderSimpleObjects(objectPlan.objects || []);
            }
            const result = {
                objectsRendered,
                fullObjectsRendered: !!(objectsRendered && objectPlan?.full),
                partialObjectsRendered: !!(objectsRendered && objectPlan?.partial),
                renderedObjectIds: objectsRendered ? (objectPlan?.ids || []) : []
            };
            const renderEnd = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            this._recordPerformance(renderEnd - renderStart, result);
            return result;
        }

        renderSimpleObjects(objects = []) {
            if (!this.isActive()) return false;
            const visible = (objects || []).filter(obj => obj && obj.visible !== false);
            if (!visible.length || !visible.every(obj => StageWebGLRenderer.canRenderSimpleObject(obj))) return false;
            const gl = this.gl;
            gl.useProgram(this.program);
            gl.enable(gl.BLEND);
            gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
            this._uniform1i('u_pass', 1);
            for (const obj of visible) {
                if (!StageWebGLRenderer.canRenderSimpleObject(obj)) return false;
                const mode = StageWebGLRenderer.getSimpleObjectMode(obj.type);
                const textInfo = mode === 12 ? this._getTextTextureInfo(obj) : null;
                const snapshotInfo = mode === 13 ? this._getSnapshotTextureInfo(obj) : null;
                const textureFillMode = mode !== 11 && mode !== 12 && mode !== 13 ? this._getPictureFillModeId(obj.pictureFillMode, obj.fillType) : 0;
                const usesTexture = mode === 11 || mode === 12 || mode === 13 || textureFillMode > 0;
                if (usesTexture && !this._ensureObjectTexture(obj)) return false;
                if (!usesTexture) {
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, this.texture);
                    this._uniform1i('u_texture', 0);
                }
                const fill = mode === 12 || mode === 13 ? [1, 1, 1, 1] : (parseCssColor(obj.fill || '#4a90d9') || [0.29, 0.56, 0.85, 1]);
                const stroke = parseCssColor(obj.stroke || '#000000') || [0, 0, 0, 1];
                const opacity = Math.max(0, Math.min(1, Number(obj.opacity ?? 1)));
                const pivot = typeof obj.getPivotPoint === 'function'
                    ? obj.getPivotPoint()
                    : { x: Number(obj.x || 0) + Number(obj.width || 0) / 2, y: Number(obj.y || 0) + Number(obj.height || 0) / 2 };
                const textureInfo = textInfo || snapshotInfo;
                const rectX = textureInfo ? textureInfo.x : Number(obj.x || 0);
                const rectY = textureInfo ? textureInfo.y : Number(obj.y || 0);
                const rectW = textureInfo ? textureInfo.width : Number(obj.width || 1);
                const rectH = textureInfo ? textureInfo.height : Number(obj.height || 1);
                const clipInfo = StageWebGLRenderer.getClipInfo(obj);
                this._uniform1i('u_shapeType', mode);
                this._uniform4f('u_objRect', rectX, rectY, rectW, rectH);
                this._uniform2f('u_objPivot', Number(pivot.x || 0), Number(pivot.y || 0));
                this._uniform1f('u_objRotation', Number(obj.rotation || 0) * Math.PI / 180);
                const depthVector = StageWebGLRenderer.getWebGLDepthVector(obj);
                const includeTilt = !depthVector.active;
                const depthScale = StageWebGLRenderer.getWebGLDepthScale(obj);
                const tiltInverse = StageWebGLRenderer.getWebGLTiltInverse(obj, includeTilt);
                const effScaleX = Number(obj.scaleX ?? 1) * depthScale * (obj.flipH ? -1 : 1);
                const effScaleY = Number(obj.scaleY ?? 1) * depthScale * (obj.flipV ? -1 : 1);
                this._uniform2f(
                    'u_objScale',
                    Math.abs(effScaleX) < 0.0001 ? 1 : effScaleX,
                    Math.abs(effScaleY) < 0.0001 ? 1 : effScaleY
                );
                this._uniform4f('u_objTiltInverse', tiltInverse[0], tiltInverse[1], tiltInverse[2], tiltInverse[3]);
                this._uniform4fv('u_objColor', [fill[0], fill[1], fill[2], fill[3] * opacity]);
                this._uniform4fv('u_objStrokeColor', [stroke[0], stroke[1], stroke[2], stroke[3] * opacity]);
                const strokeWidth = Math.max(0, Number(obj.strokeWidth || 0));
                const dashMode = Math.max(0, StageWebGLRenderer.getStrokeDashMode(obj.strokeDash));
                const lineCapMode = StageWebGLRenderer.getStrokeCapMode(obj.strokeCap);
                const lineLike = ['line', 'arrow', 'doubleArrow'].includes(obj.type);
                this._uniform1f('u_objStrokeWidth', strokeWidth);
                this._uniform1i('u_objDashMode', dashMode);
                this._uniform1i('u_objLineCapMode', lineCapMode);
                this._uniform1f('u_objRadius', Math.max(0, Number(obj.borderRadius || 0)));
                this._uniform1f('u_objSides', Math.max(3, Math.min(32, Number(obj.sides || (obj.type === 'star' ? 5 : 6)))));
                this._uniform1f('u_objInnerRadius', Math.max(0.05, Math.min(0.95, Number(obj.innerRadius || 0.5))));
                this._uniform1i('u_objClipMode', clipInfo.mode);
                this._uniform1f('u_objClipProgress', clipInfo.progress);
                this._uniform1i('u_objReflectionPass', 0);
                this._uniform1f('u_objReflectionOpacity', 1);
                const zoom = Math.max(1, Math.min(2.5, Number(obj.imageZoom || 1)));
                const panX = Math.max(-1, Math.min(1, Number(obj.imagePanX || 0)));
                const panY = Math.max(-1, Math.min(1, Number(obj.imagePanY || 0)));
                const useCrop = mode === 11 && (zoom > 1.0001 || Math.abs(panX) > 0.0001 || Math.abs(panY) > 0.0001);
                this._uniform4f('u_objImageAdjust', zoom, panX, panY, useCrop ? 1 : 0);
                const spriteSource = mode === 11 ? StageWebGLRenderer.getImageTextureSource(obj) : null;
                const spriteRect = mode === 11 ? StageWebGLRenderer.getCurrentSpriteFrameRect(obj, spriteSource) : null;
                if (spriteRect) {
                    const texW = Math.max(1, Number(spriteRect.texW || spriteSource?.naturalWidth || spriteSource?.videoWidth || spriteSource?.width || 1));
                    const texH = Math.max(1, Number(spriteRect.texH || spriteSource?.naturalHeight || spriteSource?.videoHeight || spriteSource?.height || 1));
                    this._uniform4f(
                        'u_objSpriteRect',
                        spriteRect.x / texW,
                        spriteRect.y / texH,
                        spriteRect.width / texW,
                        spriteRect.height / texH
                    );
                } else {
                    this._uniform4f('u_objSpriteRect', 0, 0, 1, 1);
                }
                const tint = parseCssColor(obj.imgTintColor || '#ffffff') || [1, 1, 1, 1];
                this._uniform4f(
                    'u_objImageFilter',
                    1 + Number(obj.imgBrightness || 0) / 100,
                    1 + Number(obj.imgContrast || 0) / 100,
                    1 + Number(obj.imgSaturation || 0) / 100,
                    Number(obj.imgHue || 0) * Math.PI / 180
                );
                this._uniform4f(
                    'u_objImageEffects',
                    Math.max(0, Math.min(1, Number(obj.imgGrayscale || 0) / 100)),
                    Math.max(0, Math.min(1, Number(obj.imgSepia || 0) / 100)),
                    Math.max(0, Math.min(1, Number(obj.imgInvert || 0) / 100)),
                    Math.max(0, Math.min(1, Number(obj.imgTintAmount || 0) / 100))
                );
                this._uniform4fv('u_objTintColor', tint);
                this._uniform1f('u_objImageBlur', Math.max(0, Math.min(20, Number(obj.imgBlur || 0))));
                this._uniform1i('u_objTextureMode', textureFillMode);
                this._uniform1f('u_objTextureRotation', Number(obj.pictureFillRotation || 0) * Math.PI / 180);
                const gradientStops = StageWebGLRenderer.getRenderableGradientStops(obj) || [];
                const gradientMode = obj.fillType === 'linear-gradient' ? 1 : (obj.fillType === 'radial-gradient' ? 2 : 0);
                this._uniform1i('u_objGradientMode', gradientMode);
                this._uniform1i('u_objGradientCount', gradientStops.length);
                this._uniform1f('u_objGradientAngle', Number(obj.gradientAngle || 0) * Math.PI / 180);
                const gradDefaults = [
                    gradientStops[0] || { offset: 0, color: fill },
                    gradientStops[1] || gradientStops[0] || { offset: 1, color: fill },
                    gradientStops[2] || gradientStops[1] || gradientStops[0] || { offset: 1, color: fill },
                    gradientStops[3] || gradientStops[2] || gradientStops[1] || gradientStops[0] || { offset: 1, color: fill }
                ];
                this._uniform4fv('u_objGradColor0', [gradDefaults[0].color[0], gradDefaults[0].color[1], gradDefaults[0].color[2], gradDefaults[0].color[3] * opacity]);
                this._uniform4fv('u_objGradColor1', [gradDefaults[1].color[0], gradDefaults[1].color[1], gradDefaults[1].color[2], gradDefaults[1].color[3] * opacity]);
                this._uniform4fv('u_objGradColor2', [gradDefaults[2].color[0], gradDefaults[2].color[1], gradDefaults[2].color[2], gradDefaults[2].color[3] * opacity]);
                this._uniform4fv('u_objGradColor3', [gradDefaults[3].color[0], gradDefaults[3].color[1], gradDefaults[3].color[2], gradDefaults[3].color[3] * opacity]);
                this._uniform4f('u_objGradOffsets', gradDefaults[0].offset, gradDefaults[1].offset, gradDefaults[2].offset, gradDefaults[3].offset);
                const pattern = StageWebGLRenderer.getRenderablePatternFill(obj);
                this._uniform1i('u_objPatternMode', pattern?.mode || 0);
                this._uniform4fv('u_objPatternColor', pattern
                    ? [pattern.accentColor[0], pattern.accentColor[1], pattern.accentColor[2], pattern.accentColor[3]]
                    : [1, 1, 1, 1]);
                this._uniform1f('u_objPatternScale', pattern?.scale || 1);
                if (depthVector.active && mode !== 8 && mode !== 9 && mode !== 10 && mode !== 12 && mode !== 13) {
                    const depthLight = StageWebGLRenderer.getWebGLDepthLighting(obj);
                    const depthSideColor = StageWebGLRenderer.getWebGLDepthSideColor(obj, fill);
                    const sideFill = StageWebGLRenderer.shadeColorArray(depthSideColor, -0.46 + depthLight * 0.28, opacity);
                    const sideStroke = StageWebGLRenderer.shadeColorArray(stroke, -0.52 + depthLight * 0.24, opacity);
                    this._uniform4f('u_objRect', rectX + depthVector.dx, rectY + depthVector.dy, rectW, rectH);
                    this._uniform2f('u_objPivot', Number(pivot.x || 0) + depthVector.dx, Number(pivot.y || 0) + depthVector.dy);
                    this._uniform4fv('u_objColor', sideFill);
                    this._uniform4fv('u_objStrokeColor', sideStroke);
                    this._uniform1f('u_objStrokeWidth', Math.max(0, Math.min(strokeWidth, 1.5)));
                    this._uniform1i('u_objTextureMode', 0);
                    this._uniform1i('u_objGradientMode', 0);
                    this._uniform1i('u_objPatternMode', 0);
                    this._uniform1i('u_objShadowPass', 1);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                    this._uniform1i('u_objShadowPass', 0);
                    this._uniform4f('u_objRect', rectX, rectY, rectW, rectH);
                    this._uniform2f('u_objPivot', Number(pivot.x || 0), Number(pivot.y || 0));
                    this._uniform4fv('u_objColor', [fill[0], fill[1], fill[2], fill[3] * opacity]);
                    this._uniform4fv('u_objStrokeColor', [stroke[0], stroke[1], stroke[2], stroke[3] * opacity]);
                    this._uniform1f('u_objStrokeWidth', strokeWidth);
                    this._uniform1i('u_objTextureMode', textureFillMode);
                    this._uniform1i('u_objGradientMode', gradientMode);
                    this._uniform1i('u_objPatternMode', pattern?.mode || 0);
                }
                if (StageWebGLRenderer.hasSimpleReflection(obj)) {
                    const reflectionOpacity = Math.max(0, Math.min(1, Number(obj.reflectionOpacity ?? 0.3)));
                    const reflectionOffset = Math.max(-512, Math.min(512, Number(obj.reflectionOffset ?? 0)));
                    this._uniform1i('u_objReflectionPass', 1);
                    this._uniform1f('u_objReflectionOpacity', reflectionOpacity);
                    this._uniform4f('u_objRect', rectX, rectY + rectH + reflectionOffset, rectW, rectH);
                    this._uniform2f('u_objPivot', Number(pivot.x || 0), Number(pivot.y || 0) + rectH + reflectionOffset);
                    this._uniform1i('u_objShadowPass', 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                    this._uniform1i('u_objReflectionPass', 0);
                    this._uniform1f('u_objReflectionOpacity', 1);
                    this._uniform4f('u_objRect', rectX, rectY, rectW, rectH);
                    this._uniform2f('u_objPivot', Number(pivot.x || 0), Number(pivot.y || 0));
                }
                if (StageWebGLRenderer.hasSimpleGlow(obj)) {
                    const glow = parseCssColor(obj.glowColor || '#00bfff') || [0, 0.75, 1, 1];
                    const glowSize = Math.max(0, Math.min(96, Number(obj.glowSize ?? 15)));
                    const glowPasses = [
                        [0, -0.35, 0.13], [0.35, 0, 0.13], [0, 0.35, 0.13], [-0.35, 0, 0.13],
                        [0.25, -0.25, 0.09], [0.25, 0.25, 0.09], [-0.25, 0.25, 0.09], [-0.25, -0.25, 0.09],
                        [0, -0.7, 0.06], [0.7, 0, 0.06], [0, 0.7, 0.06], [-0.7, 0, 0.06]
                    ];
                    this._uniform1i('u_objShadowPass', 1);
                    this._uniform1i('u_objTextureMode', 0);
                    this._uniform1i('u_objGradientMode', 0);
                    this._uniform1i('u_objPatternMode', 0);
                    this._uniform1f('u_objStrokeWidth', lineLike ? Math.max(strokeWidth, strokeWidth + glowSize * 0.35) : 0);
                    for (const pass of glowPasses) {
                        const offsetX = pass[0] * glowSize;
                        const offsetY = pass[1] * glowSize;
                        const alpha = Math.max(0, Math.min(1, glow[3] * opacity * pass[2]));
                        this._uniform4f('u_objRect', rectX + offsetX, rectY + offsetY, rectW, rectH);
                        this._uniform2f('u_objPivot', Number(pivot.x || 0) + offsetX, Number(pivot.y || 0) + offsetY);
                        this._uniform4fv('u_objColor', [glow[0], glow[1], glow[2], alpha]);
                        this._uniform4fv('u_objStrokeColor', [glow[0], glow[1], glow[2], alpha]);
                        gl.drawArrays(gl.TRIANGLES, 0, 3);
                    }
                    this._uniform1i('u_objShadowPass', 0);
                    this._uniform4f('u_objRect', rectX, rectY, rectW, rectH);
                    this._uniform2f('u_objPivot', Number(pivot.x || 0), Number(pivot.y || 0));
                    this._uniform4fv('u_objColor', [fill[0], fill[1], fill[2], fill[3] * opacity]);
                    this._uniform4fv('u_objStrokeColor', [stroke[0], stroke[1], stroke[2], stroke[3] * opacity]);
                    this._uniform1f('u_objStrokeWidth', strokeWidth);
                    this._uniform1i('u_objTextureMode', textureFillMode);
                    this._uniform1i('u_objGradientMode', gradientMode);
                    this._uniform1i('u_objPatternMode', pattern?.mode || 0);
                }
                if (StageWebGLRenderer.hasSimpleShadow(obj)) {
                    const shadow = parseCssColor(obj.shadowColor || 'rgba(0,0,0,0.3)') || [0, 0, 0, 0.3];
                    const offsetX = Number(obj.shadowOffsetX ?? 4);
                    const offsetY = Number(obj.shadowOffsetY ?? 4);
                    this._uniform1i('u_objShadowPass', 1);
                    this._uniform4f(
                        'u_objRect',
                        Number(obj.x || 0) + offsetX,
                        Number(obj.y || 0) + offsetY,
                        Number(obj.width || 1),
                        Number(obj.height || 1)
                    );
                    this._uniform2f('u_objPivot', Number(pivot.x || 0) + offsetX, Number(pivot.y || 0) + offsetY);
                    this._uniform4fv('u_objColor', [shadow[0], shadow[1], shadow[2], shadow[3] * opacity]);
                    this._uniform4fv('u_objStrokeColor', [shadow[0], shadow[1], shadow[2], shadow[3] * opacity]);
                    this._uniform1f('u_objStrokeWidth', lineLike ? strokeWidth : 0);
                    this._uniform1i('u_objTextureMode', 0);
                    this._uniform1i('u_objGradientMode', 0);
                    this._uniform1i('u_objPatternMode', 0);
                    gl.drawArrays(gl.TRIANGLES, 0, 3);
                    this._uniform1i('u_objShadowPass', 0);
                    this._uniform4f('u_objRect', rectX, rectY, rectW, rectH);
                    this._uniform2f('u_objPivot', Number(pivot.x || 0), Number(pivot.y || 0));
                    this._uniform4fv('u_objColor', [fill[0], fill[1], fill[2], fill[3] * opacity]);
                    this._uniform4fv('u_objStrokeColor', [stroke[0], stroke[1], stroke[2], stroke[3] * opacity]);
                    this._uniform1f('u_objStrokeWidth', strokeWidth);
                    this._uniform1i('u_objTextureMode', textureFillMode);
                    this._uniform1i('u_objGradientMode', gradientMode);
                    this._uniform1i('u_objPatternMode', pattern?.mode || 0);
                } else {
                    this._uniform1i('u_objShadowPass', 0);
                }
                gl.drawArrays(gl.TRIANGLES, 0, 3);
            }
            gl.disable(gl.BLEND);
            return true;
        }

        getStatus() {
            return {
                supported: this.supported,
                active: this.isActive(),
                mode: this.isActive() ? 'webgl' : 'canvas2d',
                canRenderStageBackground: this.canRenderStageBackground(),
                background: this.getBackgroundStatus(),
                scene: StageWebGLRenderer.analyzeScene(window.app?.objects?.objects || this.stage?.objectManager?.objects || []),
                cache: this.getCacheStatus(),
                health: this.getHealthStatus(),
                performance: this.getPerformanceStatus(),
                lastError: this.lastError
            };
        }

        _recordPerformance(renderMs, result = {}) {
            const stats = this.performanceStats || {};
            const frames = Math.max(0, Number(stats.frames || 0)) + 1;
            const last = Math.max(0, Number(renderMs) || 0);
            const previousAvg = Math.max(0, Number(stats.averageRenderMs || 0));
            const average = frames === 1 ? last : (previousAvg * 0.9 + last * 0.1);
            this.performanceStats = {
                frames,
                lastRenderMs: Math.round(last * 10) / 10,
                averageRenderMs: Math.round(average * 10) / 10,
                lastObjectCount: Array.isArray(result.renderedObjectIds) ? result.renderedObjectIds.length : 0,
                lastObjectsRendered: !!result.objectsRendered,
                lastFullObjectsRendered: !!result.fullObjectsRendered,
                lastPartialObjectsRendered: !!result.partialObjectsRendered,
                lastAt: Date.now()
            };
        }

        getPerformanceStatus() {
            const stats = this.performanceStats || {};
            const frames = stats.frames || 0;
            const avg = Number(stats.averageRenderMs || 0);
            let rating = 'warming';
            let label = 'Warming up';
            if (frames >= 8) {
                if (avg <= 12) {
                    rating = 'fast';
                    label = 'Fast';
                } else if (avg <= 18) {
                    rating = 'good';
                    label = 'Good';
                } else if (avg <= 28) {
                    rating = 'borderline';
                    label = 'Borderline';
                } else {
                    rating = 'slow';
                    label = 'Slow';
                }
            }
            return {
                frames,
                lastRenderMs: stats.lastRenderMs || 0,
                averageRenderMs: avg,
                rating,
                label,
                lastObjectCount: stats.lastObjectCount || 0,
                lastObjectsRendered: !!stats.lastObjectsRendered,
                lastFullObjectsRendered: !!stats.lastFullObjectsRendered,
                lastPartialObjectsRendered: !!stats.lastPartialObjectsRendered,
                lastAt: stats.lastAt || 0
            };
        }

        getHealthStatus() {
            return {
                contextLost: !!this._contextLost,
                contextLossCount: this.contextLossCount || 0,
                contextRestoreCount: this.contextRestoreCount || 0,
                lastContextLossAt: this.lastContextLossAt || 0,
                lastContextRestoreAt: this.lastContextRestoreAt || 0
            };
        }

        getCacheStatus() {
            let estimatedTexturePixels = 0;
            this.objectTextures?.forEach?.(entry => {
                estimatedTexturePixels += Math.max(0, Number(entry?.width || 0)) * Math.max(0, Number(entry?.height || 0));
            });
            this.textTextureCanvases?.forEach?.(entry => {
                estimatedTexturePixels += Math.max(0, Number(entry?.canvas?.width || 0)) * Math.max(0, Number(entry?.canvas?.height || 0));
            });
            this.snapshotTextureCanvases?.forEach?.(entry => {
                estimatedTexturePixels += Math.max(0, Number(entry?.canvas?.width || 0)) * Math.max(0, Number(entry?.canvas?.height || 0));
            });
            return {
                objectTextures: this.objectTextures?.size || 0,
                textCanvases: this.textTextureCanvases?.size || 0,
                snapshotCanvases: this.snapshotTextureCanvases?.size || 0,
                estimatedMB: Math.round((estimatedTexturePixels * 4 / (1024 * 1024)) * 10) / 10
            };
        }

        getBackgroundStatus() {
            const type = this.stage?.bgType || 'solid';
            if (type === 'image' && !this.stage?.bgImageElement) {
                return { type, label: 'image background pending', ready: false };
            }
            if (type === 'pattern') return { type, label: 'pattern background', ready: true };
            if (type === 'transparent') return { type, label: 'transparent checker background', ready: true };
            if (type === 'linear-gradient') return { type, label: 'linear gradient background', ready: true };
            if (type === 'radial-gradient') return { type, label: 'radial gradient background', ready: true };
            if (type === 'image') return { type, label: `${this.stage.bgImageFit || 'cover'} image background`, ready: true };
            return { type, label: 'solid background', ready: true };
        }

        _getStageScreenRect() {
            const dpr = window.devicePixelRatio || 1;
            let scale = Number(this.stage.zoom || 1);
            let x = Number(this.stage.panX || 0);
            let y = Number(this.stage.panY || 0);
            const cam = (window.app?.stageCamera && typeof window.app.stageCamera.getActiveTransform === 'function')
                ? window.app.stageCamera.getActiveTransform()
                : null;
            if (cam) {
                const camScale = Number(cam.scale || 1);
                scale *= camScale;
                x -= Number(cam.x || 0) * scale;
                y -= Number(cam.y || 0) * scale;
            }
            return {
                x: x * dpr,
                y: y * dpr,
                width: Math.max(1, Number(this.stage.width || 1) * scale * dpr),
                height: Math.max(1, Number(this.stage.height || 1) * scale * dpr)
            };
        }

        _getBgTypeId(type) {
            if (type === 'transparent') return 1;
            if (type === 'linear-gradient') return 2;
            if (type === 'radial-gradient') return 3;
            if (type === 'pattern') return 4;
            if (type === 'image') return 5;
            return 0;
        }

        _getImageFitId(fit) {
            if (fit === 'contain') return 1;
            if (fit === 'stretch') return 2;
            if (fit === 'tile') return 3;
            return 0;
        }

        _getPictureFillModeId(mode, fillType) {
            if (fillType !== 'picture') return 0;
            if (mode === 'fill') return 2;
            if (mode === 'fit') return 3;
            return 1;
        }

        _ensureBackgroundTexture() {
            const stage = this.stage;
            const type = stage?.bgType || 'solid';
            if (type === 'pattern') {
                const source = this._getPatternCanvas();
                if (!source) return false;
                const key = `pattern:${stage.bgColor}:${stage.bgPatternColor}:${stage.bgPatternType}:${stage.bgPatternScale}:${source.width}x${source.height}`;
                return this._uploadTextureSource(source, key);
            }
            if (type === 'image') {
                const img = stage.bgImageElement;
                if (!img || !(img.complete || img.naturalWidth)) return false;
                const sourceKey = stage.bgImageSrc || `${img.src || 'image'}:${img.naturalWidth}x${img.naturalHeight}`;
                return this._uploadTextureSource(img, `image:${sourceKey}`);
            }
            return false;
        }

        _getPatternCanvas() {
            const stage = this.stage;
            if (!stage) return null;
            const patKey = `${stage.bgColor}_${stage.bgPatternColor}_${stage.bgPatternType}_${stage.bgPatternScale}`;
            if (stage._bgPatternKey !== patKey || !stage._bgPatternCanvas) {
                stage._bgPatternKey = patKey;
                const sz = Math.max(8, Math.round(16 * (stage.bgPatternScale || 1)));
                const pc = document.createElement('canvas');
                pc.width = sz;
                pc.height = sz;
                const pctx = pc.getContext('2d');
                pctx.fillStyle = stage.bgColor;
                pctx.fillRect(0, 0, sz, sz);
                pctx.strokeStyle = stage.bgPatternColor;
                pctx.fillStyle = stage.bgPatternColor;
                pctx.lineWidth = Math.max(1, sz * 0.08);
                switch (stage.bgPatternType) {
                    case 'dots':
                        pctx.beginPath();
                        pctx.arc(sz / 2, sz / 2, sz * 0.15, 0, Math.PI * 2);
                        pctx.fill();
                        break;
                    case 'crosshatch':
                        pctx.beginPath();
                        pctx.moveTo(0, sz);
                        pctx.lineTo(sz, 0);
                        pctx.moveTo(0, 0);
                        pctx.lineTo(sz, sz);
                        pctx.stroke();
                        break;
                    case 'checkerboard':
                        pctx.fillRect(0, 0, sz / 2, sz / 2);
                        pctx.fillRect(sz / 2, sz / 2, sz / 2, sz / 2);
                        break;
                    default:
                        pctx.beginPath();
                        pctx.moveTo(0, sz);
                        pctx.lineTo(sz, 0);
                        pctx.moveTo(-sz * 0.5, sz * 0.5);
                        pctx.lineTo(sz * 0.5, -sz * 0.5);
                        pctx.moveTo(sz * 0.5, sz * 1.5);
                        pctx.lineTo(sz * 1.5, sz * 0.5);
                        pctx.stroke();
                        break;
                }
                stage._bgPatternCanvas = pc;
            }
            return stage._bgPatternCanvas;
        }

        _uploadTextureSource(source, key) {
            if (!this.gl || !this.texture || !source) return false;
            const width = Number(source.naturalWidth || source.videoWidth || source.width || 0);
            const height = Number(source.naturalHeight || source.videoHeight || source.height || 0);
            if (!width || !height) return false;
            const gl = this.gl;
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            if (this.textureSourceKey === key) {
                this.textureSize = { width, height };
                return true;
            }
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
            this.textureSourceKey = key;
            this.textureSize = { width, height };
            return true;
        }

        _getObjectTextureSource(obj) {
            if (!StageWebGLRenderer.canRenderSimpleObject(obj) || obj.type !== 'image') return null;
            return StageWebGLRenderer.getImageTextureSource(obj);
        }

        _getSnapshotTextureInfo(obj) {
            if (!StageWebGLRenderer.canRenderSnapshotObject(obj) || typeof document === 'undefined') return null;
            const dpr = Math.max(1, Math.min(2, Number(window.devicePixelRatio || 1)));
            const pad = Math.ceil(Math.max(8, Number(obj.strokeWidth || 0) * 3));
            const bounds = StageWebGLRenderer.getSnapshotBounds(obj, pad);
            if (!bounds) return null;
            const key = [
                obj.id || '',
                obj.type || '',
                obj.x || 0,
                obj.y || 0,
                obj.width || 0,
                obj.height || 0,
                obj.fill || '',
                obj.fillType || '',
                obj.stroke || '',
                obj.strokeWidth || 0,
                obj.strokeDash || '',
                obj.strokeCap || '',
                obj.strokeJoin || '',
                obj.closedPath ? 1 : 0,
                obj.iconPath || '',
                obj.iconViewBox || '',
                obj.symbolId || '',
                JSON.stringify(obj.symbolProps || obj.symbolData || null),
                JSON.stringify(obj.pathPoints || null),
                bounds.x,
                bounds.y,
                bounds.width,
                bounds.height,
                dpr
            ].join('|');
            const cached = this.snapshotTextureCanvases.get(obj.id);
            if (cached?.key === key && cached.canvas) {
                cached.lastUsed = performance.now();
                return cached;
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.ceil(bounds.width * dpr));
            canvas.height = Math.max(1, Math.ceil(bounds.height * dpr));
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            const temp = Object.create(Object.getPrototypeOf(obj));
            Object.assign(temp, obj, {
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                flipH: false,
                flipV: false,
                shadow: false,
                glowEnabled: false,
                reflectionEnabled: false,
                bevelEnabled: false,
                showPivot: false,
                layerMask: null,
                _clipWipeRight: undefined,
                _clipWipeLeft: undefined,
                _clipWipeUp: undefined,
                _clipWipeDown: undefined,
                _clipStripsH: undefined,
                _clipStripsV: undefined,
                _clipWheel: undefined,
                _clipWedge: undefined,
                _pinParentRef: null
            });
            if (typeof temp.draw !== 'function') return null;
            try {
                ctx.save();
                ctx.scale(dpr, dpr);
                ctx.translate(-bounds.x, -bounds.y);
                temp.draw(ctx);
                ctx.restore();
            } catch (err) {
                try { ctx.restore(); } catch (_) {}
                return null;
            }

            const info = {
                key,
                canvas,
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                lastUsed: performance.now()
            };
            this.snapshotTextureCanvases.set(obj.id, info);
            return info;
        }

        _getTextTextureInfo(obj) {
            if (!StageWebGLRenderer.canRenderTextObject(obj) || typeof document === 'undefined') return null;
            const dpr = Math.max(1, Math.min(2, Number(window.devicePixelRatio || 1)));
            const baseW = Math.max(1, Number(obj.width || 1));
            const fontSize = Math.max(1, Number(obj.fontSize || 24));
            const lineHeight = fontSize * (Number(obj.lineHeight) || 1.4);
            const lineCount = Math.max(1, String(obj.text || '').split('\n').length);
            const baseH = Math.max(1, Number(obj.height || 0), lineHeight * lineCount, fontSize);
            const pad = Math.ceil(Math.max(
                6,
                Number(obj.textBackgroundPadding || 0) + 6,
                Number(obj.textStrokeWidth || 0) * 2 + 4
            ));
            const drawW = Math.ceil(baseW + pad * 2);
            const drawH = Math.ceil(baseH + pad * 2);
            const key = [
                obj.id || '',
                obj.text || '',
                obj.fontFamily || '',
                obj.fontSize || '',
                obj.fontWeight || '',
                obj.fontStyle || '',
                obj.textDecoration || '',
                obj.textAlign || '',
                obj.textVerticalAlign || '',
                obj.textColor || '',
                obj.fill || '',
                obj.lineHeight || '',
                obj.letterSpacing || '',
                obj.wordSpacing || '',
                obj.textTransform || '',
                obj.listStyle || '',
                obj.listIndent || '',
                obj.textStrokeColor || '',
                obj.textStrokeWidth || '',
                obj.textBackgroundEnabled ? 1 : 0,
                obj.textBackgroundColor || '',
                obj.textBackgroundPadding || '',
                obj.textBackgroundRadius || '',
                baseW,
                baseH,
                pad,
                dpr
            ].join('|');
            const cached = this.textTextureCanvases.get(obj.id);
            if (cached?.key === key && cached.canvas) {
                cached.lastUsed = performance.now();
                return cached;
            }

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.ceil(drawW * dpr));
            canvas.height = Math.max(1, Math.ceil(drawH * dpr));
            const ctx = canvas.getContext('2d');
            if (!ctx) return null;
            ctx.save();
            ctx.scale(dpr, dpr);
            const temp = Object.create(Object.getPrototypeOf(obj));
            Object.assign(temp, obj, {
                x: pad,
                y: pad,
                width: baseW,
                height: baseH,
                rotation: 0,
                scaleX: 1,
                scaleY: 1,
                flipH: false,
                flipV: false,
                shadow: false,
                _animatingHeight: true
            });
            if (typeof temp.drawText !== 'function') {
                ctx.restore();
                return null;
            }
            temp.drawText(ctx);
            ctx.restore();

            const info = {
                key,
                canvas,
                x: Number(obj.x || 0) - pad,
                y: Number(obj.y || 0) - pad,
                width: drawW,
                height: drawH,
                lastUsed: performance.now()
            };
            this.textTextureCanvases.set(obj.id, info);
            return info;
        }

        _ensureObjectTexture(obj) {
            const textInfo = obj?.type === 'text' ? this._getTextTextureInfo(obj) : null;
            const snapshotInfo = StageWebGLRenderer.isSnapshotObjectType(obj?.type) ? this._getSnapshotTextureInfo(obj) : null;
            const gifFrame = obj?.type === 'image' ? StageWebGLRenderer.getCurrentGifFrameInfo(obj) : null;
            const source = obj?.fillType === 'picture'
                ? (obj.textureImageElement || obj._textureImgEl || obj._textureImageElementInternal || null)
                : (textInfo?.canvas || snapshotInfo?.canvas || gifFrame?.source || this._getObjectTextureSource(obj));
            if (!this.gl || !source || !obj?.id) return false;
            const width = Number(source.naturalWidth || source.videoWidth || source.width || 0);
            const height = Number(source.naturalHeight || source.videoHeight || source.height || 0);
            if (!width || !height) return false;
            const gl = this.gl;
            const isTextTexture = !!(textInfo?.canvas === source);
            const isSnapshotTexture = !!(snapshotInfo?.canvas === source);
            const isMutableCanvas = !isTextTexture && !isSnapshotTexture && (
                (typeof HTMLCanvasElement !== 'undefined' && source instanceof HTMLCanvasElement)
                || (typeof OffscreenCanvas !== 'undefined' && source instanceof OffscreenCanvas)
            );
            const srcKey = obj.fillType === 'picture'
                ? (obj.textureImageSrc || source.currentSrc || source.src || 'picture')
                : (textInfo?.canvas === source
                    ? `text-${textInfo.key}`
                : (snapshotInfo?.canvas === source
                    ? `snapshot-${snapshotInfo.key}`
                : (gifFrame?.source === source
                    ? `gif-frame-${gifFrame.index}`
                : (isMutableCanvas
                    ? (source === obj._eraserCanvas ? 'eraser-canvas' : 'edited-canvas')
                    : (obj.imageSrc || source.currentSrc || source.src || 'image')))));
            const key = `${obj.id}:${obj.fillType || obj.type}:${srcKey}:${width}x${height}`;
            const cached = this.objectTextures.get(obj.id);
            if (cached?.key === key && cached.texture && !isMutableCanvas) {
                cached.lastUsed = performance.now();
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, cached.texture);
                this._uniform1i('u_texture', 0);
                this._uniform2f('u_textureSize', cached.width, cached.height);
                return true;
            }
            try {
                const texture = cached?.key === key && cached.texture
                    ? cached.texture
                    : gl.createTexture();
                gl.activeTexture(gl.TEXTURE0);
                gl.bindTexture(gl.TEXTURE_2D, texture);
                gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
                if (cached?.texture && cached.texture !== texture) gl.deleteTexture(cached.texture);
                this.objectTextures.set(obj.id, { key, texture, width, height, lastUsed: performance.now() });
                this._uniform1i('u_texture', 0);
                this._uniform2f('u_textureSize', width, height);
                return true;
            } catch (err) {
                this.lastError = `Image cannot be uploaded to WebGL: ${err?.message || err}`;
                return false;
            }
        }

        _uploadSolidTexture(rgba) {
            if (!this.gl || !this.texture) return;
            const gl = this.gl;
            gl.bindTexture(gl.TEXTURE_2D, this.texture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array(rgba));
            this.textureSourceKey = 'solid:white';
            this.textureSize = { width: 1, height: 1 };
        }

        _clearTextureCaches(options = {}) {
            const deleteGpu = options.deleteGpu !== false;
            const clearCanvases = options.clearCanvases !== false;
            const gl = this.gl;
            if (deleteGpu && gl && this.objectTextures) {
                this.objectTextures.forEach(entry => {
                    if (entry?.texture) {
                        try { gl.deleteTexture(entry.texture); } catch (_) {}
                    }
                });
            }
            this.objectTextures?.clear?.();
            if (clearCanvases) {
                this.textTextureCanvases?.clear?.();
                this.snapshotTextureCanvases?.clear?.();
            }
            this.textureSourceKey = '';
        }

        _pruneTextureCaches(objects = []) {
            const liveIds = new Set((Array.isArray(objects) ? objects : [])
                .filter(obj => obj && obj.id)
                .map(obj => obj.id));
            const gl = this.gl;
            const pruneObjectEntry = (id, entry) => {
                if (entry?.texture && gl) {
                    try { gl.deleteTexture(entry.texture); } catch (_) {}
                }
                this.objectTextures.delete(id);
            };
            this.objectTextures?.forEach?.((entry, id) => {
                if (!liveIds.has(id)) pruneObjectEntry(id, entry);
            });
            this.textTextureCanvases?.forEach?.((entry, id) => {
                if (!liveIds.has(id)) this.textTextureCanvases.delete(id);
            });
            this.snapshotTextureCanvases?.forEach?.((entry, id) => {
                if (!liveIds.has(id)) this.snapshotTextureCanvases.delete(id);
            });

            const pruneOldest = (map, max, remove) => {
                if (!map || map.size <= max) return;
                const entries = Array.from(map.entries())
                    .sort((a, b) => Number(a[1]?.lastUsed || 0) - Number(b[1]?.lastUsed || 0));
                const overflow = Math.max(0, map.size - max);
                for (let i = 0; i < overflow; i++) remove(entries[i][0], entries[i][1]);
            };
            pruneOldest(this.objectTextures, this.maxObjectTextureCache, pruneObjectEntry);
            pruneOldest(this.textTextureCanvases, this.maxCanvasTextureCache, id => this.textTextureCanvases.delete(id));
            pruneOldest(this.snapshotTextureCanvases, this.maxCanvasTextureCache, id => this.snapshotTextureCanvases.delete(id));
        }

        _bindContextEvents() {
            if (!this.canvas || this._contextEventsBound) return;
            this._contextEventsBound = true;
            this.canvas.addEventListener('webglcontextlost', (event) => {
                event.preventDefault();
                this._contextLost = true;
                this.contextLossCount = (this.contextLossCount || 0) + 1;
                this.lastContextLossAt = Date.now();
                this.active = false;
                this.supported = false;
                this.lastError = 'WebGL context was lost; Canvas2D fallback is active';
                this.objectTextures?.clear?.();
                this.textTextureCanvases?.clear?.();
                this.snapshotTextureCanvases?.clear?.();
                this.canvas.classList.remove('active');
                document.body?.classList.remove('webgl-renderer-active');
                try { localStorage.setItem(STORAGE_KEY, 'canvas2d'); } catch (_) {}
                if (this.stage) {
                    this.stage.rendererMode = 'canvas2d';
                    this.stage._syncRendererControls?.({ state: 'warn', message: this.lastError, supported: false });
                    this.stage.requestRender?.();
                }
                Utils.showToast?.(this.lastError, 'warning');
            });
            this.canvas.addEventListener('webglcontextrestored', () => {
                this.contextRestoreCount = (this.contextRestoreCount || 0) + 1;
                this.lastContextRestoreAt = Date.now();
                this._contextLost = false;
                this.lastError = '';
                this.init();
                this.stage?._syncRendererControls?.();
                this.stage?.requestRender?.();
            });
        }

        _createProgram() {
            const vertex = `
                attribute vec2 a_position;
                void main() {
                    gl_Position = vec4(a_position, 0.0, 1.0);
                }
            `;
            const fragment = `
                precision mediump float;
                uniform vec2 u_resolution;
                uniform vec4 u_stageRect;
                uniform vec2 u_stageSize;
                uniform vec2 u_textureSize;
                uniform int u_bgType;
                uniform int u_pass;
                uniform int u_useTexture;
                uniform int u_imageFit;
                uniform int u_shapeType;
                uniform vec4 u_workspace;
                uniform vec4 u_color;
                uniform vec4 u_gradStart;
                uniform vec4 u_gradEnd;
                uniform float u_gradAngle;
                uniform sampler2D u_texture;
                uniform vec4 u_objRect;
                uniform vec2 u_objPivot;
                uniform float u_objRotation;
                uniform vec2 u_objScale;
                uniform vec4 u_objTiltInverse;
                uniform vec4 u_objColor;
                uniform vec4 u_objStrokeColor;
                uniform float u_objStrokeWidth;
                uniform int u_objDashMode;
                uniform int u_objLineCapMode;
                uniform int u_objShadowPass;
                uniform int u_objReflectionPass;
                uniform float u_objReflectionOpacity;
                uniform float u_objRadius;
                uniform float u_objSides;
                uniform float u_objInnerRadius;
                uniform vec4 u_objImageAdjust;
                uniform vec4 u_objSpriteRect;
                uniform vec4 u_objImageFilter;
                uniform vec4 u_objImageEffects;
                uniform vec4 u_objTintColor;
                uniform float u_objImageBlur;
                uniform int u_objTextureMode;
                uniform float u_objTextureRotation;
                uniform int u_objGradientMode;
                uniform int u_objGradientCount;
                uniform float u_objGradientAngle;
                uniform vec4 u_objGradColor0;
                uniform vec4 u_objGradColor1;
                uniform vec4 u_objGradColor2;
                uniform vec4 u_objGradColor3;
                uniform vec4 u_objGradOffsets;
                uniform int u_objPatternMode;
                uniform vec4 u_objPatternColor;
                uniform float u_objPatternScale;
                uniform int u_objClipMode;
                uniform float u_objClipProgress;

                vec4 applyReflectionFade(vec4 color, float fade) {
                    return vec4(color.rgb, color.a * fade);
                }

                vec4 blendOver(vec4 bottom, vec4 top) {
                    float a = top.a + bottom.a * (1.0 - top.a);
                    if (a <= 0.0) return vec4(0.0);
                    vec3 rgb = (top.rgb * top.a + bottom.rgb * bottom.a * (1.0 - top.a)) / a;
                    return vec4(rgb, a);
                }

                vec4 sampleImageBackground(vec2 stagePx, vec4 baseColor) {
                    if (u_useTexture == 0) return baseColor;
                    vec2 uv = stagePx / max(u_stageSize, vec2(1.0));
                    if (u_imageFit == 3) {
                        uv = fract(stagePx / max(u_textureSize, vec2(1.0)));
                    } else if (u_imageFit != 2) {
                        vec2 scaleContain = min(u_stageSize.x / u_textureSize.x, u_stageSize.y / u_textureSize.y) * u_textureSize;
                        vec2 scaleCover = max(u_stageSize.x / u_textureSize.x, u_stageSize.y / u_textureSize.y) * u_textureSize;
                        vec2 drawSize = (u_imageFit == 1) ? scaleContain : scaleCover;
                        vec2 drawOrigin = (u_stageSize - drawSize) * 0.5;
                        if (u_imageFit == 1) {
                            bool outside = stagePx.x < drawOrigin.x || stagePx.y < drawOrigin.y
                                || stagePx.x > drawOrigin.x + drawSize.x
                                || stagePx.y > drawOrigin.y + drawSize.y;
                            if (outside) return baseColor;
                        }
                        uv = (stagePx - drawOrigin) / max(drawSize, vec2(1.0));
                    }
                    return texture2D(u_texture, clamp(uv, 0.0, 1.0));
                }

                float cross2(vec2 a, vec2 b, vec2 c) {
                    return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
                }

                bool pointInTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
                    float d1 = cross2(p, a, b);
                    float d2 = cross2(p, b, c);
                    float d3 = cross2(p, c, a);
                    bool neg = (d1 < 0.0) || (d2 < 0.0) || (d3 < 0.0);
                    bool pos = (d1 > 0.0) || (d2 > 0.0) || (d3 > 0.0);
                    return !(neg && pos);
                }

                float sdRoundBox(vec2 p, vec2 b, float r) {
                    vec2 q = abs(p) - b + vec2(r);
                    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
                }

                float distToSegment(vec2 p, vec2 a, vec2 b) {
                    vec2 pa = p - a;
                    vec2 ba = b - a;
                    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.0001), 0.0, 1.0);
                    return length(pa - ba * h);
                }

                float regularBoundary(vec2 p, float sides) {
                    float n = max(3.0, sides);
                    float a = atan(p.y, p.x) + 1.57079633;
                    float sector = 6.28318531 / n;
                    float local = mod(a + sector * 0.5, sector) - sector * 0.5;
                    return cos(3.14159265 / n) / max(0.08, cos(local));
                }

                bool pointInRegularShape(vec2 q, vec2 center, float radius, float sides, float inset) {
                    vec2 v = q - center;
                    float r = max(0.0, radius - inset);
                    return length(v) <= r * regularBoundary(v, sides);
                }

                bool pointInStar(vec2 q, vec2 center, float radius, float innerRatio, float inset) {
                    vec2 v = q - center;
                    float n = max(3.0, u_objSides);
                    float angle = atan(v.y, v.x) + 1.57079633;
                    float sector = 6.28318531 / (n * 2.0);
                    float local = abs(mod(angle + sector * 0.5, sector) - sector * 0.5) / max(sector * 0.5, 0.0001);
                    float vertexIndex = floor((angle + sector * 0.5) / sector);
                    float r0 = (mod(vertexIndex, 2.0) < 1.0) ? radius : radius * innerRatio;
                    float r1 = (mod(vertexIndex + 1.0, 2.0) < 1.0) ? radius : radius * innerRatio;
                    float edgeRadius = mix(r0, r1, local) - inset;
                    return length(v) <= max(0.0, edgeRadius);
                }

                bool arrowHeadContains(vec2 p, vec2 tip, vec2 dir, float headLen, float headWidth) {
                    vec2 n = vec2(-dir.y, dir.x);
                    vec2 base = tip - dir * headLen;
                    vec2 a = tip;
                    vec2 b = base + n * headLen * headWidth;
                    vec2 c = base - n * headLen * headWidth;
                    return pointInTriangle(p, a, b, c);
                }

                bool dashAllows(float along, float strokeWidth) {
                    if (u_objDashMode <= 0) return true;
                    float w = max(1.0, strokeWidth);
                    if (u_objDashMode == 1) {
                        float cycle = w * 6.0;
                        return mod(along, cycle) <= w * 4.0;
                    }
                    if (u_objDashMode == 2) {
                        float cycle = w * 3.0;
                        return mod(along, cycle) <= w;
                    }
                    if (u_objDashMode == 3) {
                        float cycle = w * 9.0;
                        float m = mod(along, cycle);
                        return m <= w * 4.0 || (m >= w * 6.0 && m <= w * 7.0);
                    }
                    return true;
                }

                bool lineShaftContains(vec2 p, vec2 start, vec2 endp, vec2 nd, float halfStroke, float strokeWidth) {
                    float len = max(length(endp - start), 0.0001);
                    float alongRaw = dot(p - start, nd);
                    float along = clamp(alongRaw, 0.0, len);
                    if (!dashAllows(along, strokeWidth)) return false;
                    if (u_objLineCapMode == 0) {
                        return distToSegment(p, start, endp) <= halfStroke;
                    }
                    vec2 normal = vec2(-nd.y, nd.x);
                    float side = abs(dot(p - start, normal));
                    float pad = u_objLineCapMode == 2 ? halfStroke : 0.0;
                    return side <= halfStroke && alongRaw >= -pad && alongRaw <= len + pad;
                }

                vec4 sampleObjectTextureFill(vec2 q, vec2 b0, vec2 b1) {
                    vec2 boxSize = max(abs(b1 - b0), vec2(1.0));
                    vec2 sourceSize = max(u_textureSize, vec2(1.0));
                    vec2 center = (b0 + b1) * 0.5;
                    float a = u_objTextureRotation;
                    float co = cos(-a);
                    float si = sin(-a);
                    vec2 rel = q - center;
                    vec2 rotated = vec2(rel.x * co - rel.y * si, rel.x * si + rel.y * co);
                    float absCos = abs(cos(a));
                    float absSin = abs(sin(a));
                    vec2 scale = boxSize / sourceSize;
                    if (u_objTextureMode == 2) {
                        float requiredW = boxSize.x * absCos + boxSize.y * absSin;
                        float requiredH = boxSize.x * absSin + boxSize.y * absCos;
                        float s = max(requiredW / sourceSize.x, requiredH / sourceSize.y);
                        scale = vec2(s);
                    } else if (u_objTextureMode == 3) {
                        float rotatedW = sourceSize.x * absCos + sourceSize.y * absSin;
                        float rotatedH = sourceSize.x * absSin + sourceSize.y * absCos;
                        float s = min(boxSize.x / max(1.0, rotatedW), boxSize.y / max(1.0, rotatedH));
                        scale = vec2(s);
                    }
                    vec2 drawSize = max(sourceSize * scale, vec2(1.0));
                    vec2 uv = (rotated + drawSize * 0.5) / drawSize;
                    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
                    vec4 tex = texture2D(u_texture, uv);
                    return vec4(tex.rgb, tex.a * u_objColor.a);
                }

                vec3 hueRotate(vec3 color, float angle) {
                    float c = cos(angle);
                    float s = sin(angle);
                    mat3 m = mat3(
                        0.213 + c * 0.787 - s * 0.213,
                        0.715 - c * 0.715 - s * 0.715,
                        0.072 - c * 0.072 + s * 0.928,
                        0.213 - c * 0.213 + s * 0.143,
                        0.715 + c * 0.285 + s * 0.140,
                        0.072 - c * 0.072 - s * 0.283,
                        0.213 - c * 0.213 - s * 0.787,
                        0.715 - c * 0.715 + s * 0.715,
                        0.072 + c * 0.928 + s * 0.072
                    );
                    return clamp(m * color, 0.0, 1.0);
                }

                vec3 sepiaColor(vec3 color) {
                    return clamp(vec3(
                        dot(color, vec3(0.393, 0.769, 0.189)),
                        dot(color, vec3(0.349, 0.686, 0.168)),
                        dot(color, vec3(0.272, 0.534, 0.131))
                    ), 0.0, 1.0);
                }

                vec4 applyImageFilters(vec4 tex) {
                    vec3 rgb = tex.rgb;
                    float brightness = max(0.0, u_objImageFilter.x);
                    float contrast = max(0.0, u_objImageFilter.y);
                    float saturation = max(0.0, u_objImageFilter.z);
                    rgb *= brightness;
                    rgb = (rgb - vec3(0.5)) * contrast + vec3(0.5);
                    float luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
                    rgb = mix(vec3(luma), rgb, saturation);
                    rgb = hueRotate(rgb, u_objImageFilter.w);
                    luma = dot(rgb, vec3(0.2126, 0.7152, 0.0722));
                    rgb = mix(rgb, vec3(luma), clamp(u_objImageEffects.x, 0.0, 1.0));
                    rgb = mix(rgb, sepiaColor(rgb), clamp(u_objImageEffects.y, 0.0, 1.0));
                    rgb = mix(rgb, vec3(1.0) - rgb, clamp(u_objImageEffects.z, 0.0, 1.0));
                    float tintAmount = clamp(u_objImageEffects.w * u_objTintColor.a, 0.0, 1.0);
                    rgb = mix(rgb, u_objTintColor.rgb, tintAmount);
                    return vec4(clamp(rgb, 0.0, 1.0), tex.a);
                }

                vec4 sampleObjectImageTexture(vec2 uv, vec2 drawSize) {
                    float blur = clamp(u_objImageBlur, 0.0, 20.0);
                    vec2 spriteMin = clamp(u_objSpriteRect.xy, 0.0, 1.0);
                    vec2 spriteMax = clamp(u_objSpriteRect.xy + max(u_objSpriteRect.zw, vec2(0.0001)), 0.0, 1.0);
                    vec2 safeUv = clamp(uv, spriteMin, spriteMax);
                    if (blur <= 0.001) return texture2D(u_texture, safeUv);

                    vec2 stepUv = blur / max(drawSize, vec2(1.0));
                    vec4 sum = texture2D(u_texture, safeUv) * 0.20;
                    sum += texture2D(u_texture, clamp(safeUv + vec2(stepUv.x, 0.0), spriteMin, spriteMax)) * 0.12;
                    sum += texture2D(u_texture, clamp(safeUv - vec2(stepUv.x, 0.0), spriteMin, spriteMax)) * 0.12;
                    sum += texture2D(u_texture, clamp(safeUv + vec2(0.0, stepUv.y), spriteMin, spriteMax)) * 0.12;
                    sum += texture2D(u_texture, clamp(safeUv - vec2(0.0, stepUv.y), spriteMin, spriteMax)) * 0.12;
                    sum += texture2D(u_texture, clamp(safeUv + stepUv, spriteMin, spriteMax)) * 0.08;
                    sum += texture2D(u_texture, clamp(safeUv - stepUv, spriteMin, spriteMax)) * 0.08;
                    sum += texture2D(u_texture, clamp(safeUv + vec2(stepUv.x, -stepUv.y), spriteMin, spriteMax)) * 0.08;
                    sum += texture2D(u_texture, clamp(safeUv + vec2(-stepUv.x, stepUv.y), spriteMin, spriteMax)) * 0.08;
                    return sum;
                }

                vec4 sampleGradientStops(float t) {
                    float v = clamp(t, 0.0, 1.0);
                    if (u_objGradientCount <= 1) return u_objGradColor0;
                    if (v <= u_objGradOffsets.y || u_objGradientCount == 2) {
                        float span = max(0.0001, u_objGradOffsets.y - u_objGradOffsets.x);
                        return mix(u_objGradColor0, u_objGradColor1, clamp((v - u_objGradOffsets.x) / span, 0.0, 1.0));
                    }
                    if (v <= u_objGradOffsets.z || u_objGradientCount == 3) {
                        float span = max(0.0001, u_objGradOffsets.z - u_objGradOffsets.y);
                        return mix(u_objGradColor1, u_objGradColor2, clamp((v - u_objGradOffsets.y) / span, 0.0, 1.0));
                    }
                    float span = max(0.0001, u_objGradOffsets.w - u_objGradOffsets.z);
                    return mix(u_objGradColor2, u_objGradColor3, clamp((v - u_objGradOffsets.z) / span, 0.0, 1.0));
                }

                vec4 sampleObjectGradientFill(vec2 q, vec2 b0, vec2 b1) {
                    vec2 boxSize = max(abs(b1 - b0), vec2(1.0));
                    vec2 center = (b0 + b1) * 0.5;
                    float radius = max(boxSize.x, boxSize.y) * 0.5;
                    float t = 0.0;
                    if (u_objGradientMode == 1) {
                        vec2 dir = vec2(cos(u_objGradientAngle), sin(u_objGradientAngle));
                        t = (dot(q - center, dir) + radius) / max(0.0001, radius * 2.0);
                    } else {
                        t = distance(q, center) / max(0.0001, radius);
                    }
                    return sampleGradientStops(t);
                }

                vec4 sampleObjectPatternFill(vec2 q) {
                    float size = max(8.0, 16.0 * max(0.25, u_objPatternScale));
                    vec2 tile = mod(mod(q, size) + size, size);
                    vec4 base = u_objColor;
                    vec4 accent = vec4(u_objPatternColor.rgb, u_objPatternColor.a * u_objColor.a);
                    float lineWidth = max(1.0, size * 0.08);
                    bool useAccent = false;

                    if (u_objPatternMode == 1) {
                        float diagonal = mod(tile.x + tile.y, size);
                        float distLine = min(diagonal, size - diagonal) * 0.70710678;
                        useAccent = distLine <= lineWidth * 0.5;
                    } else if (u_objPatternMode == 2) {
                        useAccent = distance(tile, vec2(size * 0.5)) <= size * 0.15;
                    } else if (u_objPatternMode == 3) {
                        float diagonalA = mod(tile.x + tile.y, size);
                        float distA = min(diagonalA, size - diagonalA) * 0.70710678;
                        float diagonalB = mod(tile.x - tile.y, size);
                        float distB = min(diagonalB, size - diagonalB) * 0.70710678;
                        useAccent = distA <= lineWidth * 0.5 || distB <= lineWidth * 0.5;
                    } else if (u_objPatternMode == 4) {
                        vec2 cell = floor(tile / max(1.0, size * 0.5));
                        useAccent = mod(cell.x + cell.y, 2.0) < 0.5;
                    }

                    return useAccent ? accent : base;
                }

                float angleDelta(float angle, float center) {
                    return abs(atan(sin(angle - center), cos(angle - center)));
                }

                bool objectClipAllows(vec2 q, vec2 b0, vec2 b1) {
                    if (u_objClipMode <= 0) return true;
                    float p = clamp(u_objClipProgress, 0.0, 1.0);
                    if (p <= 0.0) return false;
                    if (p >= 1.0) return true;

                    vec2 size = max(abs(u_objRect.zw), vec2(1.0));
                    vec2 uv = (q - b0) / size;
                    if (u_objClipMode == 1) return uv.x <= p;
                    if (u_objClipMode == 2) return uv.x >= 1.0 - p;
                    if (u_objClipMode == 3) return uv.y <= p;
                    if (u_objClipMode == 4) return uv.y >= 1.0 - p;
                    if (u_objClipMode == 5) {
                        float local = fract(clamp(uv.y, 0.0, 0.9999) * 10.0);
                        float halfHeight = p * 0.5;
                        return local >= 0.5 - halfHeight && local <= 0.5 + halfHeight;
                    }
                    if (u_objClipMode == 6) {
                        float local = fract(clamp(uv.x, 0.0, 0.9999) * 10.0);
                        float halfWidth = p * 0.5;
                        return local >= 0.5 - halfWidth && local <= 0.5 + halfWidth;
                    }

                    vec2 center = (b0 + b1) * 0.5;
                    float angle = atan(q.y - center.y, q.x - center.x);
                    if (u_objClipMode == 7) {
                        float sector = 1.57079632679;
                        float local = mod(angle + 1.57079632679 + 6.28318530718, sector);
                        return local <= sector * p;
                    }
                    if (u_objClipMode == 8) {
                        return angleDelta(angle, -1.57079632679) <= 3.14159265359 * p;
                    }
                    return true;
                }

                vec4 sampleSimpleObject(vec2 p) {
                    vec2 localNorm = (p - u_stageRect.xy) / max(u_stageRect.zw, vec2(1.0));
                    vec2 stagePx = localNorm * u_stageSize;
                    float c = cos(-u_objRotation);
                    float s = sin(-u_objRotation);
                    vec2 rel = stagePx - u_objPivot;
                    vec2 unrotated = vec2(rel.x * c - rel.y * s, rel.x * s + rel.y * c);
                    vec2 safeScale = vec2(
                        abs(u_objScale.x) < 0.0001 ? 1.0 : u_objScale.x,
                        abs(u_objScale.y) < 0.0001 ? 1.0 : u_objScale.y
                    );
                    vec2 untilted = vec2(
                        u_objTiltInverse.x * unrotated.x + u_objTiltInverse.z * unrotated.y,
                        u_objTiltInverse.y * unrotated.x + u_objTiltInverse.w * unrotated.y
                    );
                    vec2 q = (untilted / safeScale) + u_objPivot;
                    vec2 b0 = u_objRect.xy;
                    vec2 b1 = u_objRect.xy + u_objRect.zw;
                    float reflectionFade = 1.0;
                    if (u_objReflectionPass == 1) {
                        float h = max(abs(u_objRect.w), 1.0);
                        float t = clamp((q.y - b0.y) / h, 0.0, 1.0);
                        reflectionFade = (1.0 - t) * clamp(u_objReflectionOpacity, 0.0, 1.0);
                        q.y = b0.y + b1.y - q.y;
                    }
                    bool insideBox = q.x >= b0.x && q.y >= b0.y && q.x <= b1.x && q.y <= b1.y;
                    if (!objectClipAllows(q, b0, b1)) return vec4(0.0);
                    bool inside = false;
                    bool inner = false;
                    float sw = max(0.0, u_objStrokeWidth);

                    if (u_shapeType == 1) {
                        vec2 center = (b0 + b1) * 0.5;
                        vec2 halfSize = max(abs(u_objRect.zw) * 0.5, vec2(1.0));
                        float radius = clamp(u_objRadius, 0.0, min(halfSize.x, halfSize.y));
                        if (radius > 0.0) {
                            float d = sdRoundBox(q - center, halfSize, radius);
                            inside = d <= 0.0;
                            inner = sdRoundBox(q - center, max(halfSize - vec2(sw), vec2(0.0)), max(radius - sw, 0.0)) <= 0.0;
                        } else {
                            inside = insideBox;
                            inner = q.x >= b0.x + sw && q.y >= b0.y + sw && q.x <= b1.x - sw && q.y <= b1.y - sw;
                        }
                    } else if (u_shapeType == 2) {
                        vec2 center = (b0 + b1) * 0.5;
                        vec2 radius = max(abs(u_objRect.zw) * 0.5, vec2(1.0));
                        vec2 norm = (q - center) / radius;
                        inside = dot(norm, norm) <= 1.0;
                        vec2 innerRadius = max(radius - sw, vec2(1.0));
                        vec2 innerNorm = (q - center) / innerRadius;
                        inner = dot(innerNorm, innerNorm) <= 1.0;
                    } else if (u_shapeType == 3) {
                        vec2 a = vec2((b0.x + b1.x) * 0.5, b0.y);
                        vec2 b = vec2(b1.x, b1.y);
                        vec2 cpt = vec2(b0.x, b1.y);
                        inside = pointInTriangle(q, a, b, cpt);
                        vec2 ctr = (a + b + cpt) / 3.0;
                        inner = pointInTriangle(q, mix(a, ctr, sw / 30.0), mix(b, ctr, sw / 30.0), mix(cpt, ctr, sw / 30.0));
                    } else if (u_shapeType == 4) {
                        vec2 center = (b0 + b1) * 0.5;
                        vec2 radius = max(abs(u_objRect.zw) * 0.5, vec2(1.0));
                        vec2 d = abs((q - center) / radius);
                        inside = d.x + d.y <= 1.0;
                        vec2 innerRadius = max(radius - sw, vec2(1.0));
                        vec2 di = abs((q - center) / innerRadius);
                        inner = di.x + di.y <= 1.0;
                    } else if (u_shapeType == 5) {
                        vec2 center = (b0 + b1) * 0.5;
                        vec2 halfSize = max(abs(u_objRect.zw) * 0.5, vec2(1.0));
                        float radius = clamp(max(u_objRadius, min(halfSize.x, halfSize.y) * 0.2), 0.0, min(halfSize.x, halfSize.y));
                        inside = sdRoundBox(q - center, halfSize, radius) <= 0.0;
                        inner = sdRoundBox(q - center, max(halfSize - vec2(sw), vec2(0.0)), max(radius - sw, 0.0)) <= 0.0;
                    } else if (u_shapeType == 6) {
                        vec2 center = (b0 + b1) * 0.5;
                        float radius = min(abs(u_objRect.z), abs(u_objRect.w)) * 0.5;
                        inside = pointInRegularShape(q, center, radius, u_objSides, 0.0);
                        inner = pointInRegularShape(q, center, radius, u_objSides, sw);
                    } else if (u_shapeType == 7) {
                        vec2 center = (b0 + b1) * 0.5;
                        float radius = min(abs(u_objRect.z), abs(u_objRect.w)) * 0.5;
                        inside = pointInStar(q, center, radius, u_objInnerRadius, 0.0);
                        inner = pointInStar(q, center, radius, u_objInnerRadius, sw);
                    } else if (u_shapeType == 8 || u_shapeType == 9 || u_shapeType == 10) {
                        vec2 start = b0;
                        vec2 endp = b1;
                        vec2 dir = endp - start;
                        float len = max(length(dir), 0.0001);
                        vec2 nd = dir / len;
                        float halfStroke = max(1.0, sw) * 0.5;
                        float headLen = max(sw * 4.0, min(len * 0.35, len * 0.2 + sw * 2.0));
                        float headWidth = 0.58;
                        vec2 shaftStart = start;
                        vec2 shaftEnd = endp;
                        if (u_shapeType == 9) shaftEnd = endp - nd * headLen * 0.5;
                        if (u_shapeType == 10) {
                            shaftStart = start + nd * headLen * 0.5;
                            shaftEnd = endp - nd * headLen * 0.5;
                        }
                        inside = lineShaftContains(q, shaftStart, shaftEnd, nd, halfStroke, sw);
                        if (u_shapeType == 9 || u_shapeType == 10) {
                            inside = inside || arrowHeadContains(q, endp, nd, headLen, headWidth);
                        }
                        if (u_shapeType == 10) {
                            inside = inside || arrowHeadContains(q, start, -nd, headLen, headWidth);
                        }
                        inner = false;
                    } else if (u_shapeType == 11) {
                        vec2 center = (b0 + b1) * 0.5;
                        vec2 halfSize = max(abs(u_objRect.zw) * 0.5, vec2(1.0));
                        float radius = clamp(u_objRadius, 0.0, min(halfSize.x, halfSize.y));
                        if (radius > 0.0) {
                            inside = sdRoundBox(q - center, halfSize, radius) <= 0.0;
                            inner = sdRoundBox(q - center, max(halfSize - vec2(sw), vec2(0.0)), max(radius - sw, 0.0)) <= 0.0;
                        } else {
                            inside = insideBox;
                            inner = q.x >= b0.x + sw && q.y >= b0.y + sw && q.x <= b1.x - sw && q.y <= b1.y - sw;
                        }
                    } else if (u_shapeType == 12 || u_shapeType == 13) {
                        inside = insideBox;
                        inner = true;
                    }

                    if (!inside) return vec4(0.0);
                    if (sw > 0.0 && !inner) return applyReflectionFade(u_objStrokeColor, reflectionFade);
                    if (u_objShadowPass == 1) return u_objColor;
                    if (u_shapeType == 12 || u_shapeType == 13) {
                        vec2 textUv = (q - b0) / max(abs(u_objRect.zw), vec2(1.0));
                        vec4 tex = texture2D(u_texture, clamp(textUv, 0.0, 1.0));
                        return applyReflectionFade(vec4(tex.rgb, tex.a * u_objColor.a), reflectionFade);
                    }
                    if (u_shapeType == 11) {
                        vec2 imageDrawSize = max(abs(u_objRect.zw), vec2(1.0));
                        vec2 frameUv = (q - b0) / max(abs(u_objRect.zw), vec2(1.0));
                        vec2 spriteSize = max(u_objSpriteRect.zw * max(u_textureSize, vec2(1.0)), vec2(1.0));
                        if (u_objImageAdjust.w > 0.5) {
                            float zoom = max(1.0, u_objImageAdjust.x);
                            vec2 objSize = max(abs(u_objRect.zw), vec2(1.0));
                            float coverScale = max(objSize.x / spriteSize.x, objSize.y / spriteSize.y);
                            vec2 drawSize = spriteSize * coverScale * zoom;
                            vec2 extra = max(vec2(0.0), drawSize - objSize);
                            vec2 drawOrigin = b0 - extra * 0.5 - u_objImageAdjust.yz * (extra * 0.5);
                            frameUv = (q - drawOrigin) / max(drawSize, vec2(1.0));
                            imageDrawSize = drawSize;
                        }
                        vec2 imageUv = u_objSpriteRect.xy + frameUv * u_objSpriteRect.zw;
                        vec4 tex = sampleObjectImageTexture(imageUv, imageDrawSize);
                        return applyReflectionFade(applyImageFilters(vec4(tex.rgb, tex.a * u_objColor.a)), reflectionFade);
                    }
                    if (u_objTextureMode > 0) return applyReflectionFade(sampleObjectTextureFill(q, b0, b1), reflectionFade);
                    if (u_objGradientMode > 0) return applyReflectionFade(sampleObjectGradientFill(q, b0, b1), reflectionFade);
                    if (u_objPatternMode > 0) return applyReflectionFade(sampleObjectPatternFill(q), reflectionFade);
                    return applyReflectionFade(u_objColor, reflectionFade);
                }

                void main() {
                    vec2 p = gl_FragCoord.xy;
                    p.y = u_resolution.y - p.y;
                    if (u_pass == 1) {
                        gl_FragColor = sampleSimpleObject(p);
                        return;
                    }
                    vec4 outColor = u_workspace;
                    bool inStage = p.x >= u_stageRect.x && p.y >= u_stageRect.y
                        && p.x <= u_stageRect.x + u_stageRect.z
                        && p.y <= u_stageRect.y + u_stageRect.w;
                    if (inStage && u_bgType >= 0) {
                        vec2 local = (p - u_stageRect.xy) / max(u_stageRect.zw, vec2(1.0));
                        vec4 stageColor = u_color;
                        if (u_bgType == 1) {
                            vec2 cell = floor((p - u_stageRect.xy) / 16.0);
                            float checker = mod(cell.x + cell.y, 2.0);
                            stageColor = mix(vec4(1.0, 1.0, 1.0, 1.0), vec4(0.8, 0.8, 0.8, 1.0), checker);
                        } else if (u_bgType == 2) {
                            vec2 dir = vec2(cos(u_gradAngle), sin(u_gradAngle));
                            float t = dot(local - 0.5, dir) + 0.5;
                            stageColor = mix(u_gradStart, u_gradEnd, clamp(t, 0.0, 1.0));
                        } else if (u_bgType == 3) {
                            float t = distance(local, vec2(0.5)) * 1.41421356;
                            stageColor = mix(u_gradStart, u_gradEnd, clamp(t, 0.0, 1.0));
                        } else if (u_bgType == 4) {
                            vec2 stagePx = local * u_stageSize;
                            vec4 tile = texture2D(u_texture, fract(stagePx / max(u_textureSize, vec2(1.0))));
                            stageColor = vec4(tile.rgb, tile.a * u_color.a);
                        } else if (u_bgType == 5) {
                            vec2 stagePx = local * u_stageSize;
                            vec4 image = sampleImageBackground(stagePx, u_color);
                            stageColor = vec4(image.rgb, image.a * u_color.a);
                        }
                        outColor = blendOver(u_workspace, stageColor);
                    }
                    gl_FragColor = outColor;
                }
            `;
            const gl = this.gl;
            const vs = this._compile(gl.VERTEX_SHADER, vertex);
            const fs = this._compile(gl.FRAGMENT_SHADER, fragment);
            const program = gl.createProgram();
            gl.attachShader(program, vs);
            gl.attachShader(program, fs);
            gl.linkProgram(program);
            if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
                throw new Error(gl.getProgramInfoLog(program) || 'WebGL program link failed');
            }
            return program;
        }

        _compile(type, source) {
            const gl = this.gl;
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                throw new Error(gl.getShaderInfoLog(shader) || 'WebGL shader compile failed');
            }
            return shader;
        }

        _uniform1f(name, value) {
            this.gl.uniform1f(this.gl.getUniformLocation(this.program, name), value);
        }

        _uniform1i(name, value) {
            this.gl.uniform1i(this.gl.getUniformLocation(this.program, name), value);
        }

        _uniform2f(name, x, y) {
            this.gl.uniform2f(this.gl.getUniformLocation(this.program, name), x, y);
        }

        _uniform4f(name, x, y, z, w) {
            this.gl.uniform4f(this.gl.getUniformLocation(this.program, name), x, y, z, w);
        }

        _uniform4fv(name, value) {
            this.gl.uniform4fv(this.gl.getUniformLocation(this.program, name), value);
        }
    }

    window.StageWebGLRenderer = StageWebGLRenderer;
})();
