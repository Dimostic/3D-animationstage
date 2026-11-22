/* ============================================
   Animation Stage - Stage Manager
   Canvas rendering, viewport, grid, zoom/pan
   ============================================ */

class StageManager {
    constructor() {
        this.canvas = document.getElementById('stage-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.viewport = document.getElementById('stage-viewport');
        
        // Stage dimensions (logical)
        this.width = 1920;
        this.height = 1080;
        this.orientation = 'landscape';
        this.bgColor = '#1a1a2e';
        this.bgType = 'solid'; // 'solid', 'transparent', 'linear-gradient', 'radial-gradient', 'pattern', 'image'
        this.bgOpacity = 1;
        this.bgGradStart = '#1a1a2e';
        this.bgGradEnd = '#4a90d9';
        this.bgGradAngle = 180;
        this.bgPatternType = 'stripes';
        this.bgPatternColor = '#ffffff';
        this.bgPatternScale = 1;
        this.bgImageSrc = null;
        this.bgLibraryAsset = null;
        this.bgImageElement = null;
        this.bgImageFit = 'cover'; // 'cover','contain','stretch','tile'
        
        // Viewport (pan & zoom)
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this._suppressContextMenuOnce = false;
        
        // Grid
        this.gridVisible = true;
        this.gridSize = 20;
        this.snapEnabled = true;
        this.snapStrength = 10;
        
        // Rendering
        this.animationFrameId = null;
        this.needsRender = true;
        this._hasAnimatedGifs = false;
        this.dpr = window.devicePixelRatio || 1;
        this.rendererMode = (window.StageWebGLRenderer?.preferredMode?.() || 'canvas2d');
        this.webglRenderer = window.StageWebGLRenderer ? new window.StageWebGLRenderer(this) : null;
        this._rendererDiagnosticSignature = '';
        
        // Listen for animated GIF decode events
        eventBus.on('gif:animated', () => { this._hasAnimatedGifs = true; });
        // Allow any module to request a re-render (e.g. after async image load)
        eventBus.on('stage:request-render', () => { this.requestRender(); });
        
        this.init();
    }

    init() {
        this.resizeCanvas();
        this.centerStage();
        this.bindEvents();
        this.bindScrollbars();
        this.startRenderLoop();
    }

    resizeCanvas() {
        const rect = this.viewport.getBoundingClientRect();
        this.dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * this.dpr;
        this.canvas.height = rect.height * this.dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        this.viewportWidth = rect.width;
        this.viewportHeight = rect.height;
        this.webglRenderer?.resize?.();
        this.needsRender = true;
    }

    centerStage() {
        // Reset user-zoom flag so auto-fit works again
        this._userZoomed = false;
        const vw = this.viewportWidth || 1;
        const vh = this.viewportHeight || 1;
        const sw = this.width || 1;
        const sh = this.height || 1;
        this.zoom = Math.max(0.01, Math.min(
            (vw - 60) / sw,
            (vh - 60) / sh,
            1
        ));
        this.panX = (vw - sw * this.zoom) / 2;
        this.panY = (vh - sh * this.zoom) / 2;
        this.updateZoomDisplay();
        this.needsRender = true;
    }

    bindEvents() {
        // Resize observer — auto-fit stage when viewport size changes (panel toggle, window resize)
        const resizeObserver = new ResizeObserver(() => {
            this.resizeCanvas();
            if (!this._userZoomed) {
                this.centerStage();
            }
        });
        resizeObserver.observe(this.viewport);

        // Zoom (scroll wheel)
        this.viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            this._userZoomed = true; // manual wheel zoom
            const delta = e.deltaY > 0 ? -0.1 : 0.1;
            const oldZoom = this.zoom;
            this.zoom = Utils.clamp(this.zoom + delta * this.zoom, 0.05, 10);
            
            // Zoom towards mouse position
            const rect = this.viewport.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            this.panX = mx - (mx - this.panX) * (this.zoom / oldZoom);
            this.panY = my - (my - this.panY) * (this.zoom / oldZoom);
            
            this.updateZoomDisplay();
            this.needsRender = true;
        }, { passive: false });

        // Pan (middle click, Alt+drag, or right-drag while Hand/Pan mode is active)
        this.viewport.addEventListener('mousedown', (e) => {
            const om = this.objectManager;
            const handPanActive = !!(om && (om.currentTool === 'hand' || om._stagePanMode));
            if (e.button === 1 || (e.button === 0 && e.altKey) || (e.button === 2 && handPanActive)) {
                this.isPanning = true;
                this.lastPanX = e.clientX;
                this.lastPanY = e.clientY;
                this.viewport.style.cursor = 'grabbing';
                if (e.button === 2) this._suppressContextMenuOnce = true;
                e.preventDefault();
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.panX += e.clientX - this.lastPanX;
                this.panY += e.clientY - this.lastPanY;
                this.lastPanX = e.clientX;
                this.lastPanY = e.clientY;
                this.needsRender = true;
            }
        });

        window.addEventListener('mouseup', () => {
            if (this.isPanning) {
                this.isPanning = false;
                // Restore cursor based on active tool (hand keeps grab cursor)
                this.viewport.style.cursor = '';
                eventBus.emit('stage:pan-end');
            }
        });

        // Zoom buttons
        document.getElementById('zoom-in')?.addEventListener('click', () => this.setZoom(this.zoom * 1.25));
        document.getElementById('zoom-out')?.addEventListener('click', () => this.setZoom(this.zoom * 0.8));
        document.getElementById('zoom-fit')?.addEventListener('click', () => this.centerStage());
        document.getElementById('zoom-focus')?.addEventListener('click', () => this.focusOnSelected());

        // D-pad stage pan buttons (hold to repeat)
        const panStep = 40;
        const panDirs = {
            'pan-up':    { dx: 0,  dy: panStep },
            'pan-down':  { dx: 0,  dy: -panStep },
            'pan-left':  { dx: panStep,  dy: 0 },
            'pan-right': { dx: -panStep, dy: 0 }
        };
        for (const [id, dir] of Object.entries(panDirs)) {
            const btn = document.getElementById(id);
            if (!btn) continue;
            let interval = null;
            const doPan = () => {
                this.panX += dir.dx;
                this.panY += dir.dy;
                this.needsRender = true;
            };
            const stop = () => {
                if (interval !== null) { clearInterval(interval); interval = null; }
            };
            btn.addEventListener('mousedown', (e) => {
                e.preventDefault();
                stop(); // belt-and-braces: clear any prior interval before starting a new one
                doPan();
                interval = setInterval(doPan, 80);
            });
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop);
            // Window-level safety: stop panning if the browser loses focus or the
            // user releases the mouse outside the button's bounds.
            window.addEventListener('mouseup', stop);
            window.addEventListener('blur', stop);
        }
        document.getElementById('pan-center')?.addEventListener('click', () => this.centerStage());

        // Pan mode toggle
        const panBtn = document.getElementById('stage-pan-toggle');
        if (panBtn) {
            panBtn.addEventListener('click', () => {
                const om = this.objectManager;
                if (om) {
                    om._stagePanMode = !om._stagePanMode;
                    panBtn.classList.toggle('active', om._stagePanMode);
                    this.viewport.style.cursor = om._stagePanMode ? 'grab' : '';
                }
            });
        }

        // Mouse coordinates display
        this.viewport.addEventListener('mousemove', Utils.throttle((e) => {
            const pos = this.screenToStage(e.clientX, e.clientY);
            document.getElementById('mouse-coordinates').textContent = 
                `X: ${Math.round(pos.x)} Y: ${Math.round(pos.y)}`;
        }, 50));

        // Stage settings
        document.getElementById('stage-orientation')?.addEventListener('change', (e) => {
            this.setOrientation(e.target.value);
        });
        document.getElementById('stage-width')?.addEventListener('change', (e) => {
            this.setDimensions(parseInt(e.target.value), this.height);
        });
        document.getElementById('stage-height')?.addEventListener('change', (e) => {
            this.setDimensions(this.width, parseInt(e.target.value));
        });
        document.getElementById('grid-visible')?.addEventListener('change', (e) => {
            this.gridVisible = e.target.checked;
            this.needsRender = true;
        });
        document.getElementById('grid-size')?.addEventListener('change', (e) => {
            this.gridSize = parseInt(e.target.value);
            this.needsRender = true;
        });
        document.getElementById('grid-snap')?.addEventListener('change', (e) => {
            this.snapEnabled = e.target.checked;
        });
        document.getElementById('snap-strength')?.addEventListener('input', (e) => {
            this.snapStrength = parseInt(e.target.value);
        });
        document.getElementById('stage-renderer-mode')?.addEventListener('change', (e) => {
            this.setRendererMode(e.target.value, { user: true });
        });
        document.getElementById('btn-stage-renderer-test')?.addEventListener('click', () => {
            const result = window.StageWebGLRenderer?.runSelfTest?.() || { ok: false, message: 'WebGL test is not available' };
            Utils.showToast?.(result.message, result.ok ? 'success' : 'warning');
            this._syncRendererControls({
                state: result.ok ? (this.rendererMode === 'webgl' ? 'ok' : 'info') : 'warn',
                message: result.ok
                    ? `${result.message}; ${this.rendererMode === 'webgl' ? 'WebGL mode is enabled' : 'Canvas2D mode is active'}`
                    : result.message
            });
        });
        document.getElementById('btn-stage-renderer-report')?.addEventListener('click', () => {
            this.copyRendererReport();
        });
        this.setRendererMode(this.rendererMode, { silent: true });
        document.getElementById('stage-bg-color')?.addEventListener('input', (e) => {
            this.bgColor = e.target.value;
            this.refreshRendererStatus();
            this.needsRender = true;
        });
        document.getElementById('stage-bg-color')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });

        // Stage background type / gradient / pattern / image controls
        document.getElementById('stage-bg-type')?.addEventListener('change', (e) => {
            this.bgType = e.target.value;
            this._updateBgControlVisibility();
            this.setRendererMode(this.rendererMode, { silent: true });
            this.needsRender = true;
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-opacity')?.addEventListener('input', (e) => {
            this.bgOpacity = parseInt(e.target.value) / 100;
            const valEl = document.getElementById('stage-bg-opacity-val');
            if (valEl) valEl.textContent = e.target.value + '%';
            this.refreshRendererStatus();
            this.needsRender = true;
        });
        document.getElementById('stage-bg-opacity')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-grad-start')?.addEventListener('input', (e) => {
            this.bgGradStart = e.target.value;
            this.refreshRendererStatus();
            this.needsRender = true;
        });
        document.getElementById('stage-bg-grad-start')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-grad-end')?.addEventListener('input', (e) => {
            this.bgGradEnd = e.target.value;
            this.refreshRendererStatus();
            this.needsRender = true;
        });
        document.getElementById('stage-bg-grad-end')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-grad-angle')?.addEventListener('input', (e) => {
            this.bgGradAngle = parseInt(e.target.value);
            const valEl = document.getElementById('stage-bg-grad-angle-val');
            if (valEl) valEl.textContent = this.bgGradAngle + '°';
            this.refreshRendererStatus();
            this.needsRender = true;
        });
        document.getElementById('stage-bg-grad-angle')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-pattern-type')?.addEventListener('change', (e) => {
            this.bgPatternType = e.target.value;
            this.refreshRendererStatus();
            this.needsRender = true;
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-pattern-color')?.addEventListener('input', (e) => {
            this.bgPatternColor = e.target.value;
            this.refreshRendererStatus();
            this.needsRender = true;
        });
        document.getElementById('stage-bg-pattern-color')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-pattern-scale')?.addEventListener('input', (e) => {
            this.bgPatternScale = parseFloat(e.target.value);
            this.refreshRendererStatus();
            this.needsRender = true;
        });
        document.getElementById('stage-bg-pattern-scale')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('btn-stage-bg-upload')?.addEventListener('click', () => {
            document.getElementById('stage-bg-file')?.click();
        });
        document.getElementById('stage-bg-file')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                this.bgImageSrc = reader.result;
                this.bgLibraryAsset = null;
                const img = new Image();
                img.onload = () => {
                    this.bgImageElement = img;
                    this.refreshRendererStatus();
                    this.needsRender = true;
                };
                img.src = reader.result;
            };
            reader.readAsDataURL(file);
            eventBus.emit('history:push');
        });
        document.getElementById('btn-stage-bg-clear')?.addEventListener('click', () => {
            this.bgImageSrc = null;
            this.bgLibraryAsset = null;
            this.bgImageElement = null;
            this.refreshRendererStatus();
            this.needsRender = true;
            eventBus.emit('history:push');
        });
        document.getElementById('stage-bg-image-fit')?.addEventListener('change', (e) => {
            this.bgImageFit = e.target.value;
            this.refreshRendererStatus();
            this.needsRender = true;
            eventBus.emit('history:push');
        });
    }

    _updateBgControlVisibility() {
        const t = this.bgType;
        document.getElementById('stage-bg-color-row')?.classList.toggle('hidden', t === 'transparent');
        document.getElementById('stage-bg-gradient-controls')?.classList.toggle('hidden', !['linear-gradient','radial-gradient'].includes(t));
        document.getElementById('stage-bg-pattern-controls')?.classList.toggle('hidden', t !== 'pattern');
        document.getElementById('stage-bg-image-controls')?.classList.toggle('hidden', t !== 'image');
    }

    setZoom(newZoom) {
        this._userZoomed = true; // user explicitly zoomed — skip auto-fit
        const oldZoom = this.zoom;
        this.zoom = Utils.clamp(newZoom, 0.05, 10);
        // Zoom towards center
        const cx = this.viewportWidth / 2;
        const cy = this.viewportHeight / 2;
        this.panX = cx - (cx - this.panX) * (this.zoom / oldZoom);
        this.panY = cy - (cy - this.panY) * (this.zoom / oldZoom);
        this.updateZoomDisplay();
        this.needsRender = true;
    }

    updateZoomDisplay() {
        const el = document.getElementById('zoom-level');
        if (el) el.textContent = Math.round(this.zoom * 100) + '%';
    }

    setOrientation(orientation) {
        this.orientation = orientation;
        switch (orientation) {
            case 'landscape':
                this.setDimensions(1920, 1080);
                break;
            case 'portrait':
                this.setDimensions(1080, 1920);
                break;
            case 'square':
                this.setDimensions(1080, 1080);
                break;
            case 'custom':
                break;
        }
    }

    setDimensions(w, h) {
        w = parseInt(w); h = parseInt(h);
        if (isNaN(w) || w < 1) w = this.width || 1920;
        if (isNaN(h) || h < 1) h = this.height || 1080;
        this.width = w;
        this.height = h;
        const wEl = document.getElementById('stage-width');
        const hEl = document.getElementById('stage-height');
        if (wEl) wEl.value = w;
        if (hEl) hEl.value = h;
        this.centerStage();
        eventBus.emit('stage:resize', { width: w, height: h });
    }

    // Focus on the currently selected object(s)
    focusOnSelected() {
        // Get selected objects from the global app reference
        const objects = window.app?.objects;
        if (!objects) { console.warn('[Stage] No objects manager'); return; }
        const selected = objects.getSelectedObjects();
        if (selected.length === 0) {
            Utils.showToast('No object selected — click an object first', 'warning');
            return;
        }

        // Recalculate viewport size (panels may have changed)
        this.resizeCanvas();

        // Calculate bounding box of all selected objects
        // obj.x/y is top-left, obj.width/height is unscaled size
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(obj => {
            const b = obj.getBounds();
            minX = Math.min(minX, b.x);
            minY = Math.min(minY, b.y);
            maxX = Math.max(maxX, b.right);
            maxY = Math.max(maxY, b.bottom);
        });

        const bw = maxX - minX;
        const bh = maxY - minY;
        const cx = minX + bw / 2;
        const cy = minY + bh / 2;

        // Zoom to fit with tight padding — fill ~70% of viewport with the object
        const fillRatio = 0.7; // object should occupy ~70% of the viewport
        const zoomX = (this.viewportWidth * fillRatio) / Math.max(bw, 10);
        const zoomY = (this.viewportHeight * fillRatio) / Math.max(bh, 10);
        let targetZoom = Math.min(zoomX, zoomY);

        // Ensure we zoom in noticeably — at least 1.5x closer than current zoom
        const minZoom = this.zoom * 1.5;
        targetZoom = Math.max(targetZoom, minZoom);

        this.zoom = Utils.clamp(targetZoom, 0.5, 10);

        // Centre the bounding box in the viewport
        this.panX = this.viewportWidth / 2 - cx * this.zoom;
        this.panY = this.viewportHeight / 2 - cy * this.zoom;

        // Flag that user actively zoomed so auto-fit doesn't override
        this._userZoomed = true;

        this.updateZoomDisplay();
        this.needsRender = true;
        this.requestRender();
        Utils.showToast(`Focused on ${selected.length} object(s)`, 'info');
    }

    // Convert screen coordinates to stage coordinates
    screenToStage(screenX, screenY) {
        const rect = this.viewport.getBoundingClientRect();
        return {
            x: (screenX - rect.left - this.panX) / this.zoom,
            y: (screenY - rect.top - this.panY) / this.zoom
        };
    }

    // Convert stage coordinates to screen coordinates
    stageToScreen(stageX, stageY) {
        const rect = this.viewport.getBoundingClientRect();
        return {
            x: stageX * this.zoom + this.panX + rect.left,
            y: stageY * this.zoom + this.panY + rect.top
        };
    }

    // Snap position to grid if enabled
    snapPosition(x, y) {
        if (!this.snapEnabled) return { x, y };
        return {
            x: Utils.snapToGrid(x, this.gridSize),
            y: Utils.snapToGrid(y, this.gridSize)
        };
    }

    // ── Canvas-drawn Scrollbars ─────────────────────────────────
    bindScrollbars() {
        // Virtual scroll padding beyond stage edges
        this._scrollPadding = 400;

        // Scrollbar visual config
        this._sb = {
            thickness: 12,     // track thickness (visual)
            thumbMin: 30,      // minimum thumb length
            gap: 6,            // reserved spacing between paired bars at the corner
            edgeInset: 8,      // keep bars docked slightly inside viewport edges
            radius: 5,         // corner radius
            hitPad: 6,         // extra pixels around track/thumb for easier grabbing
            trackColor: 'rgba(10, 18, 28, 0.84)',
            trackHoverColor: 'rgba(14, 28, 42, 0.94)',
            trackBorderColor: 'rgba(255, 255, 255, 0.34)',
            trackShadowColor: 'rgba(0, 0, 0, 0.60)',
            thumbColor: 'rgba(0, 218, 255, 0.96)',
            thumbHoverColor: 'rgba(96, 232, 255, 0.98)',
            thumbDragColor: 'rgba(255, 196, 67, 0.98)',
            thumbBorderColor: 'rgba(255, 255, 255, 0.92)',
            thumbShadowColor: 'rgba(0, 0, 0, 0.70)',
            gripColor: 'rgba(255, 255, 255, 0.88)',
        };

        // Interaction state
        this._sbDragging = null;   // 'h' | 'v' | null
        this._sbHover = null;      // 'h-track' | 'h-thumb' | 'v-track' | 'v-thumb' | null
        this._sbDragStart = 0;
        this._sbPanStart = 0;
        this._sbDragLock = null;    // locked track rect + ratio at drag start

        // Cache rects (updated each render)
        this._sbRects = {
            hTrack: null, hThumb: null,
            vTrack: null, vThumb: null,
            vTrackLeft: null, vThumbLeft: null
        };

        // Mouse handlers on viewport
        this.viewport.addEventListener('mousemove', (e) => {
            if (this._sbDragging) return; // don't change hover during drag
            const rect = this.viewport.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const oldHover = this._sbHover;
            this._sbHover = this._sbHitTest(mx, my);
            if (this._sbHover !== oldHover) this.needsRender = true;
        });

        this.viewport.addEventListener('mousedown', (e) => {
            const rect = this.viewport.getBoundingClientRect();
            const mx = e.clientX - rect.left;
            const my = e.clientY - rect.top;
            const hit = this._sbHitTest(mx, my);

            if (hit === 'h-thumb') {
                e.preventDefault(); e.stopPropagation();
                this._sbDragging = 'h';
                this._sbDragStart = e.clientX;
                this._sbPanStart = this.panX;
                // Lock ratio at drag start so track movement doesn't cause jitter
                const hTrack = this._sbRects.hTrack;
                const hThumb = this._sbRects.hThumb;
                const hTotalV = this.width * this.zoom + this._scrollPadding * 2;
                const hScrollRange = Math.max(1, hTotalV - this.viewportWidth);
                this._sbDragLock = {
                    trackSize: hTrack ? hTrack.w : this.viewportWidth,
                    thumbSize: hThumb ? hThumb.w : 0,
                    scrollRange: hScrollRange
                };
                this.needsRender = true;
            } else if (hit === 'v-thumb-right' || hit === 'v-thumb-left') {
                e.preventDefault(); e.stopPropagation();
                this._sbDragging = 'v';
                this._sbDragStart = e.clientY;
                this._sbPanStart = this.panY;
                const vTrack = this._sbRects.vTrack;
                const vThumb = this._sbRects.vThumb;
                const vTotalV = this.height * this.zoom + this._scrollPadding * 2;
                const vScrollRange = Math.max(1, vTotalV - this.viewportHeight);
                this._sbDragLock = {
                    trackSize: vTrack ? vTrack.h : this.viewportHeight,
                    thumbSize: vThumb ? vThumb.h : 0,
                    scrollRange: vScrollRange
                };
                this.needsRender = true;
            } else if (hit === 'h-track') {
                e.preventDefault(); e.stopPropagation();
                const r = this._sbRects.hTrack;
                const thumb = this._sbRects.hThumb;
                if (r) {
                    const totalV = this.width * this.zoom + this._scrollPadding * 2;
                    const scrollRange = Math.max(1, totalV - this.viewportWidth);
                    const usableTrack = Math.max(1, r.w - (thumb?.w || 0));
                    const clickRatio = Utils.clamp((mx - r.x - ((thumb?.w || 0) / 2)) / usableTrack, 0, 1);
                    this.panX = this._scrollPadding - clickRatio * scrollRange;
                    this.needsRender = true;
                }
            } else if (hit === 'v-track-right' || hit === 'v-track-left') {
                e.preventDefault(); e.stopPropagation();
                const useLeft = hit === 'v-track-left';
                const r = useLeft ? this._sbRects.vTrackLeft : this._sbRects.vTrack;
                const thumb = useLeft ? this._sbRects.vThumbLeft : this._sbRects.vThumb;
                if (r) {
                    const totalV = this.height * this.zoom + this._scrollPadding * 2;
                    const scrollRange = Math.max(1, totalV - this.viewportHeight);
                    const usableTrack = Math.max(1, r.h - (thumb?.h || 0));
                    const clickRatio = Utils.clamp((my - r.y - ((thumb?.h || 0) / 2)) / usableTrack, 0, 1);
                    this.panY = this._scrollPadding - clickRatio * scrollRange;
                    this.needsRender = true;
                }
            }
        }, true);  // capture phase so we get it before object manager

        window.addEventListener('mousemove', (e) => {
            if (!this._sbDragging || !this._sbDragLock) return;
            // Use locked ratio from drag start — prevents jitter from track moving
            const usableTrack = Math.max(1, this._sbDragLock.trackSize - (this._sbDragLock.thumbSize || 0));
            const ratio = this._sbDragLock.scrollRange / usableTrack;
            if (this._sbDragging === 'h') {
                this.panX = this._sbPanStart - (e.clientX - this._sbDragStart) * ratio;
            } else {
                this.panY = this._sbPanStart - (e.clientY - this._sbDragStart) * ratio;
            }
            this.needsRender = true;
        });

        window.addEventListener('mouseup', () => {
            if (this._sbDragging) {
                this._sbDragging = null;
                this._sbDragLock = null;
                this.needsRender = true;
            }
        });
    }

    // Hit-test a viewport-local point against scrollbar rects (with padding for easier grabbing)
    _sbHitTest(mx, my) {
        const r = this._sbRects;
        const p = this._sb.hitPad;
        // Check thumbs first (higher priority), then tracks — with expanded hit area
        if (r.hThumb && mx >= r.hThumb.x - p && mx <= r.hThumb.x + r.hThumb.w + p &&
            my >= r.hThumb.y - p && my <= r.hThumb.y + r.hThumb.h + p) return 'h-thumb';
        if (r.vThumb && mx >= r.vThumb.x - p && mx <= r.vThumb.x + r.vThumb.w + p &&
            my >= r.vThumb.y - p && my <= r.vThumb.y + r.vThumb.h + p) return 'v-thumb-right';
        if (r.vThumbLeft && mx >= r.vThumbLeft.x - p && mx <= r.vThumbLeft.x + r.vThumbLeft.w + p &&
            my >= r.vThumbLeft.y - p && my <= r.vThumbLeft.y + r.vThumbLeft.h + p) return 'v-thumb-left';
        if (r.hTrack && mx >= r.hTrack.x - p && mx <= r.hTrack.x + r.hTrack.w + p &&
            my >= r.hTrack.y - p && my <= r.hTrack.y + r.hTrack.h + p) return 'h-track';
        if (r.vTrack && mx >= r.vTrack.x - p && mx <= r.vTrack.x + r.vTrack.w + p &&
            my >= r.vTrack.y - p && my <= r.vTrack.y + r.vTrack.h + p) return 'v-track-right';
        if (r.vTrackLeft && mx >= r.vTrackLeft.x - p && mx <= r.vTrackLeft.x + r.vTrackLeft.w + p &&
            my >= r.vTrackLeft.y - p && my <= r.vTrackLeft.y + r.vTrackLeft.h + p) return 'v-track-left';
        return null;
    }

    _getCollapsedBarInset(side) {
        const barId = side === 'left' ? 'collapsed-left-bar' : 'collapsed-right-bar';
        const bar = document.getElementById(barId);
        if (!bar || bar.classList.contains('hidden')) return 0;

        const rect = bar.getBoundingClientRect();
        const width = rect.width || bar.offsetWidth || 0;

        // Reserve the full working width of the collapsed rail so the stage
        // scrollbar never ends up underneath it, even in minimized/hovered states.
        if (bar.classList.contains('minimized')) return Math.max(width, 18);
        return Math.max(width, 44);
    }

    // Draw scrollbars on canvas and update cached rects
    drawScrollbars(ctx) {
        const sb = this._sb;
        const pad = this._scrollPadding || 400;
        const stageW = this.width * this.zoom;
        const stageH = this.height * this.zoom;
        const vpW = this.viewportWidth;
        const vpH = this.viewportHeight;
        const inset = sb.edgeInset ?? 8;
        const cornerReserve = sb.thickness + (sb.gap ?? 6);
        const leftDockInset = inset + this._getCollapsedBarInset('left');
        const rightDockInset = inset + this._getCollapsedBarInset('right');

        // Keep scrollbars visible based on viewport space, not the current stage position.
        const showH = vpW > 80 && vpH > 40;
        const showV = vpH > 80 && vpW > 40;

        // Helper to draw rounded rect
        const roundRect = (x, y, w, h, r) => {
            r = Math.min(r, w / 2, h / 2);
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.arcTo(x + w, y, x + w, y + r, r);
            ctx.lineTo(x + w, y + h - r);
            ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
            ctx.lineTo(x + r, y + h);
            ctx.arcTo(x, y + h, x, y + h - r, r);
            ctx.lineTo(x, y + r);
            ctx.arcTo(x, y, x + r, y, r);
            ctx.closePath();
        };

        const drawTrack = (x, y, w, h, active) => {
            ctx.save();
            ctx.shadowColor = sb.trackShadowColor;
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = active ? sb.trackHoverColor : sb.trackColor;
            roundRect(x, y, w, h, sb.radius);
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = sb.trackBorderColor;
            roundRect(x, y, w, h, sb.radius);
            ctx.stroke();
            ctx.restore();
        };

        const drawThumb = (x, y, w, h, active, dragging, axis) => {
            ctx.save();
            ctx.shadowColor = sb.thumbShadowColor;
            ctx.shadowBlur = 12;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 2;
            ctx.fillStyle = dragging ? sb.thumbDragColor : (active ? sb.thumbHoverColor : sb.thumbColor);
            roundRect(x, y, w, h, Math.max(2, sb.radius - 1));
            ctx.fill();
            ctx.shadowColor = 'transparent';
            ctx.lineWidth = 1.3;
            ctx.strokeStyle = sb.thumbBorderColor;
            roundRect(x, y, w, h, Math.max(2, sb.radius - 1));
            ctx.stroke();

            ctx.strokeStyle = sb.gripColor;
            ctx.lineWidth = 1.2;
            if (axis === 'h' && w >= 24) {
                const gripX1 = x + w / 2 - 3;
                const gripX2 = x + w / 2 + 3;
                const gripTop = y + 3;
                const gripBottom = y + h - 3;
                ctx.beginPath();
                ctx.moveTo(gripX1, gripTop);
                ctx.lineTo(gripX1, gripBottom);
                ctx.moveTo(gripX2, gripTop);
                ctx.lineTo(gripX2, gripBottom);
                ctx.stroke();
            } else if (axis === 'v' && h >= 24) {
                const gripY1 = y + h / 2 - 3;
                const gripY2 = y + h / 2 + 3;
                const gripLeft = x + 3;
                const gripRight = x + w - 3;
                ctx.beginPath();
                ctx.moveTo(gripLeft, gripY1);
                ctx.lineTo(gripRight, gripY1);
                ctx.moveTo(gripLeft, gripY2);
                ctx.lineTo(gripRight, gripY2);
                ctx.stroke();
            }
            ctx.restore();
        };

        // ── Horizontal scrollbar ──
        if (showH) {
            // Dock to bottom of viewport so the bar stays visible while panning.
            const tLeft = leftDockInset + (showV ? cornerReserve : 0);
            const tY = vpH - sb.thickness - inset;
            const tW = Math.max(
                0,
                vpW - tLeft - rightDockInset - (showV ? cornerReserve : 0)
            );

            if (tW > 40 && tY > 0 && tY < vpH) {
                // Store track rect
                this._sbRects.hTrack = { x: tLeft, y: tY, w: tW, h: sb.thickness };

                // Draw track
                const isTrackHover = this._sbHover === 'h-track' || this._sbHover === 'h-thumb' || this._sbDragging === 'h';
                drawTrack(tLeft, tY, tW, sb.thickness, isTrackHover);

                // Thumb
                const totalW = stageW + pad * 2;
                const scrollRange = Math.max(1, totalW - vpW);
                const thumbRatio = totalW <= vpW ? 1 : Math.min(1, vpW / totalW);
                const thumbW = Math.max(sb.thumbMin, tW * thumbRatio);
                const scrollFrac = Utils.clamp((pad - this.panX) / scrollRange, 0, 1);
                const thumbX = tLeft + scrollFrac * (tW - thumbW);

                this._sbRects.hThumb = { x: thumbX, y: tY + 1, w: thumbW, h: sb.thickness - 2 };

                const isDrag = this._sbDragging === 'h';
                const isHover = this._sbHover === 'h-thumb';
                drawThumb(thumbX, tY + 1, thumbW, sb.thickness - 2, isHover, isDrag, 'h');
            } else {
                this._sbRects.hTrack = null;
                this._sbRects.hThumb = null;
            }
        } else {
            this._sbRects.hTrack = null;
            this._sbRects.hThumb = null;
        }

        // ── Vertical scrollbar ──
        if (showV) {
            // Dock to right edge of viewport so the bar never disappears offstage.
            const tTop = inset;
            const tX = vpW - sb.thickness - rightDockInset;
            const tXLeft = leftDockInset;
            const tH = Math.max(0, vpH - inset * 2 - (showH ? cornerReserve : 0));

            if (tH > 40 && tX > 0 && tX < vpW) {
                this._sbRects.vTrack = { x: tX, y: tTop, w: sb.thickness, h: tH };

                const isTrackHover = this._sbHover === 'v-track-right' || this._sbHover === 'v-thumb-right' || this._sbDragging === 'v';
                drawTrack(tX, tTop, sb.thickness, tH, isTrackHover);

                // Thumb
                const totalH = stageH + pad * 2;
                const scrollRange = Math.max(1, totalH - vpH);
                const thumbRatio = totalH <= vpH ? 1 : Math.min(1, vpH / totalH);
                const thumbH = Math.max(sb.thumbMin, tH * thumbRatio);
                const scrollFrac = Utils.clamp((pad - this.panY) / scrollRange, 0, 1);
                const thumbY = tTop + scrollFrac * (tH - thumbH);

                this._sbRects.vThumb = { x: tX + 1, y: thumbY, w: sb.thickness - 2, h: thumbH };
                this._sbRects.vTrackLeft = { x: tXLeft, y: tTop, w: sb.thickness, h: tH };
                this._sbRects.vThumbLeft = { x: tXLeft + 1, y: thumbY, w: sb.thickness - 2, h: thumbH };

                const isDrag = this._sbDragging === 'v';
                const isHover = this._sbHover === 'v-thumb-right';
                drawThumb(tX + 1, thumbY, sb.thickness - 2, thumbH, isHover, isDrag, 'v');

                const isTrackHoverLeft = this._sbHover === 'v-track-left' || this._sbHover === 'v-thumb-left' || this._sbDragging === 'v';
                drawTrack(tXLeft, tTop, sb.thickness, tH, isTrackHoverLeft);

                const isHoverLeft = this._sbHover === 'v-thumb-left';
                drawThumb(tXLeft + 1, thumbY, sb.thickness - 2, thumbH, isHoverLeft, isDrag, 'v');
            } else {
                this._sbRects.vTrack = null;
                this._sbRects.vThumb = null;
                this._sbRects.vTrackLeft = null;
                this._sbRects.vThumbLeft = null;
            }
        } else {
            this._sbRects.vTrack = null;
            this._sbRects.vThumb = null;
            this._sbRects.vTrackLeft = null;
            this._sbRects.vThumbLeft = null;
        }

        // Update cursor based on scrollbar hover
        if (this._sbDragging) {
            this.viewport.style.cursor = 'grabbing';
        } else if (this._sbHover === 'h-thumb' || this._sbHover === 'v-thumb-right' || this._sbHover === 'v-thumb-left') {
            this.viewport.style.cursor = 'grab';
        } else if (this._sbHover === 'h-track' || this._sbHover === 'v-track-right' || this._sbHover === 'v-track-left') {
            this.viewport.style.cursor = 'pointer';
        } else if (!this.isPanning) {
            this.viewport.style.cursor = '';
        }
    }

    // Main render loop
    startRenderLoop() {
        const loop = () => {
            // Offscreen export owns the animated state and renders its own frames.
            // Keep the editor still instead of competing for canvas/image work.
            if (!window.app?.animations?._exportingVideo && (this.needsRender || this._hasAnimatedGifs)) {
                this.render();
                this.needsRender = false;
            }
            this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    }

    requestRender() {
        this.needsRender = true;
    }

    refreshRendererStatus() {
        if (this.rendererMode === 'webgl') {
            this.setRendererMode('webgl', { silent: true });
        } else {
            this._syncRendererControls();
        }
    }

    _getRendererDiagnosticSignature() {
        const bg = [
            this.rendererMode,
            this.bgType,
            this.bgImageFit,
            this.bgImageSrc ? 'img' : '',
            this.bgPatternType,
            this.bgPatternScale,
            this.gridVisible ? 'grid' : ''
        ].join('|');
        const cache = this.webglRenderer?.getCacheStatus?.();
        const cacheSig = cache
            ? [cache.objectTextures || 0, cache.textCanvases || 0, cache.snapshotCanvases || 0, cache.estimatedMB || 0].join(':')
            : '';
        const perf = this.webglRenderer?.getPerformanceStatus?.();
        const perfSig = perf
            ? [perf.rating || '', perf.lastObjectCount || 0, perf.lastFullObjectsRendered ? 'full' : (perf.lastPartialObjectsRendered ? 'partial' : 'bg')].join(':')
            : '';
        const objects = this.objectManager?.objects || [];
        const objectSig = objects.map(obj => [
            obj.id,
            obj.type,
            obj.fillType,
            obj.strokeDash || '',
            obj.strokeWidth || 0,
            obj.strokeCap || '',
            obj.stroke || '',
            obj.fill || '',
            obj.borderRadius || 0,
            obj.shadow ? 'shadow' : '',
            obj.shadowColor || '',
            obj.shadowBlur ?? '',
            obj.shadowOffsetX ?? '',
            obj.shadowOffsetY ?? '',
            obj.pictureFillMode || '',
            obj.pictureFillRotation || 0,
            obj.imageSrc ? 'img' : '',
            obj.crop || obj.cropBox || obj.maskPath ? 'crop' : '',
            obj._eraserCanvas || obj._removedBgCanvas ? 'edited-img' : '',
            obj.isAnimatedGif || obj.isSpriteSequence || obj.spriteSheet || obj._gifFrames ? 'animated-img' : '',
            obj.scaleX ?? 1,
            obj.scaleY ?? 1,
            obj.flipH ? 'fh' : '',
            obj.flipV ? 'fv' : '',
            obj.depth || 0,
            obj.tiltX || 0,
            obj.tiltY || 0,
            obj.blendMode || '',
            obj.imgBrightness || 0,
            obj.imgContrast || 0,
            obj.imgSaturation || 0,
            obj.imgHue || 0,
            obj.imgBlur || 0,
            obj.imgGrayscale || 0,
            obj.imgSepia || 0,
            obj.imgInvert || 0,
            obj.imgTintAmount || 0,
            obj.text ? 'txt' : '',
            obj.joints?.length || 0,
            obj.pinnedTo || '',
            obj.flex || obj.flexEnabled || obj.flexMesh ? 'flex' : '',
            obj.bodyPartData || obj.faceRig || obj.faceRigPartRole || obj._facialParentHead ? 'rig' : '',
            obj.shadow || obj.glowEnabled || obj.reflectionEnabled || obj.bevelEnabled ? 'fx' : '',
            obj.cloneBrushLayer || obj.layerMask ? 'mask' : ''
        ].join(':')).join(',');
        return `${bg}::${cacheSig}::${perfSig}::${objects.length}::${objectSig}`;
    }

    _maybeRefreshRendererDiagnostics() {
        const signature = this._getRendererDiagnosticSignature();
        if (signature === this._rendererDiagnosticSignature) return;
        this._rendererDiagnosticSignature = signature;
        this._syncRendererControls();
    }

    hasWebGLRendererAccess() {
        if (!window.StageWebGLRenderer?.hasAccess) return false;
        return window.StageWebGLRenderer.hasAccess();
    }

    setRendererMode(mode, options = {}) {
        const requested = mode === 'webgl' ? 'webgl' : 'canvas2d';
        const hasAccess = this.hasWebGLRendererAccess();
        const supported = !!this.webglRenderer?.supported;
        let nextMode = requested;
        let state = 'info';
        let message = 'Canvas2D active';

        if (requested === 'webgl') {
            if (!hasAccess) {
                nextMode = 'canvas2d';
                state = 'warn';
                message = 'WebGL is restricted for this account';
            } else if (!supported) {
                nextMode = 'canvas2d';
                state = 'warn';
                message = this.webglRenderer?.lastError || 'WebGL is not available in this browser';
            } else {
                const bg = this.webglRenderer.getBackgroundStatus?.() || { label: 'stage background', ready: true };
                state = bg.ready ? 'ok' : 'warn';
                message = bg.ready
                    ? `WebGL Experimental active: ${bg.label} on GPU; simple shape scenes can use GPU objects`
                    : `WebGL active: ${bg.label}; objects/tools use Canvas2D`;
            }
        }

        this.rendererMode = nextMode;
        this.webglRenderer?.setActive?.(nextMode === 'webgl');
        try { localStorage.setItem('animationStageRendererMode', nextMode); } catch (_) {}
        this._syncRendererControls({ state, message, requested, hasAccess, supported });
        this.requestRender();

        if (options.user && !options.silent) {
            const type = nextMode === requested ? 'info' : 'warning';
            Utils.showToast?.(message, type);
        }
    }

    _syncRendererControls(status = {}) {
        const select = document.getElementById('stage-renderer-mode');
        const webglOption = select?.querySelector?.('option[value="webgl"]');
        const statusEl = document.getElementById('stage-renderer-status');
        const detailsEl = document.getElementById('stage-renderer-details');
        const hasAccess = status.hasAccess ?? this.hasWebGLRendererAccess();
        const supported = status.supported ?? !!this.webglRenderer?.supported;

        if (select) select.value = this.rendererMode || 'canvas2d';
        if (webglOption) {
            webglOption.disabled = !hasAccess || !supported;
            webglOption.textContent = supported
                ? 'WebGL Experimental'
                : 'WebGL Unavailable';
        }
        if (statusEl) {
            statusEl.dataset.state = status.state || (this.rendererMode === 'webgl' ? 'ok' : 'info');
            statusEl.textContent = status.message || (this.rendererMode === 'webgl'
                ? 'WebGL Experimental active: stage background on GPU; simple shape scenes can use GPU objects'
                : 'Canvas2D active');
        }
        if (detailsEl) {
            const rendererStatus = this.webglRenderer?.getStatus?.() || null;
            const scene = rendererStatus?.scene || window.StageWebGLRenderer?.analyzeScene?.(this.objectManager?.objects || []) || null;
            const bg = rendererStatus?.background;
            const cache = rendererStatus?.cache;
            const health = rendererStatus?.health;
            const performanceInfo = rendererStatus?.performance;
            const selectedObjects = this.objectManager?.getSelectedObjects?.() || [];
            const compatibility = window.StageWebGLRenderer?.getCompatibilityReport?.(this.objectManager?.objects || [], {
                selectedObjects,
                limit: 6
            }) || null;
            const objectPlan = this.rendererMode === 'webgl'
                ? this.webglRenderer?.getObjectRenderPlan?.(this.objectManager?.objects || [], {
                    objectManager: this.objectManager,
                    allowPartial: !this.gridVisible
                })
                : null;
            const simpleSceneActive = this.rendererMode === 'webgl'
                && objectPlan?.full
                && !this.objectManager?.tempObject
                && !this.objectManager?.isDrawingPath
                && !this.objectManager?.isDrawingTrace;
            const rows = [];
            rows.push(['Background', this.rendererMode === 'webgl' && bg?.ready ? `GPU: ${bg.label}` : 'Canvas2D']);
            rows.push(['Objects', scene?.total
                ? (simpleSceneActive ? `${objectPlan.ids.length} GPU-safe object(s) on WebGL` : `${scene.total} on Canvas2D`)
                : 'None on stage']);
            if (!simpleSceneActive && objectPlan?.partial) {
                rows.push(['Mixed scene GPU layer', `${objectPlan.ids.length} bottom object(s) on WebGL`]);
            } else if (!simpleSceneActive && this.rendererMode === 'webgl' && this.gridVisible && scene?.simpleRenderable) {
                rows.push(['Mixed scene GPU layer', 'Paused while grid is visible']);
            }
            if (scene?.simpleRenderable && !simpleSceneActive) rows.push(['GPU-ready objects', `${scene.simpleRenderable} shape/image/text/vector object(s)`]);
            if (scene?.webglPictureFills || scene?.webglGradientFills || scene?.webglPatternFills || scene?.webglImageFilters || scene?.webglEditedImages || scene?.webglAnimatedGifs || scene?.webglSpriteSheets || scene?.webglText || scene?.webglSnapshots || scene?.webglTransformedObjects || scene?.webglDashedLines || scene?.webglLineCaps || scene?.webglRoundedImages || scene?.webglSimpleShadows || scene?.webglClipAnimations || scene?.webglGlowEffects || scene?.webglReflectionEffects) {
                const gpuFeatures = [];
                if (scene.webglPictureFills) gpuFeatures.push(`${scene.webglPictureFills} picture fill`);
                if (scene.webglGradientFills) gpuFeatures.push(`${scene.webglGradientFills} gradient fill`);
                if (scene.webglPatternFills) gpuFeatures.push(`${scene.webglPatternFills} pattern fill`);
                if (scene.webglImageFilters) {
                    const blurText = scene.webglImageBlur ? `, ${scene.webglImageBlur} blur` : '';
                    gpuFeatures.push(`${scene.webglImageFilters} image filter${blurText}`);
                }
                if (scene.webglEditedImages) gpuFeatures.push(`${scene.webglEditedImages} edited image`);
                if (scene.webglAnimatedGifs) gpuFeatures.push(`${scene.webglAnimatedGifs} animated GIF`);
                if (scene.webglSpriteSheets) gpuFeatures.push(`${scene.webglSpriteSheets} sprite sheet`);
                if (scene.webglText) gpuFeatures.push(`${scene.webglText} text`);
                if (scene.webglSnapshots) gpuFeatures.push(`${scene.webglSnapshots} vector snapshot`);
                if (scene.webglTransformedObjects) gpuFeatures.push(`${scene.webglTransformedObjects} scaled/flipped`);
                if (scene.webglDashedLines) gpuFeatures.push(`${scene.webglDashedLines} dashed line`);
                if (scene.webglLineCaps) gpuFeatures.push(`${scene.webglLineCaps} line cap`);
                if (scene.webglRoundedImages) gpuFeatures.push(`${scene.webglRoundedImages} rounded image`);
                if (scene.webglSimpleShadows) gpuFeatures.push(`${scene.webglSimpleShadows} simple shadow`);
                if (scene.webglClipAnimations) gpuFeatures.push(`${scene.webglClipAnimations} reveal/clip`);
                if (scene.webglGlowEffects) gpuFeatures.push(`${scene.webglGlowEffects} glow`);
                if (scene.webglReflectionEffects) gpuFeatures.push(`${scene.webglReflectionEffects} reflection`);
                rows.push(['GPU features', gpuFeatures.join(', ')]);
            }
            if (scene?.text || scene?.images || scene?.rigged || scene?.effects || scene?.complexPaths || scene?.advancedFill) {
                const parts = [];
                const canvasText = Math.max(0, Number(scene.text || 0) - Number(scene.webglText || 0));
                if (canvasText) parts.push(`${canvasText} text`);
                const canvasImages = Math.max(0, Number(scene.images || 0) - Number(scene.webglImages || 0));
                const canvasAdvancedFills = Math.max(0, Number(scene.advancedFill || 0)
                    - Number(scene.webglPictureFills || 0)
                    - Number(scene.webglGradientFills || 0)
                    - Number(scene.webglPatternFills || 0));
                if (canvasImages) parts.push(`${canvasImages} advanced image`);
                if (scene.rigged) parts.push(`${scene.rigged} rigged/masked`);
                if (scene.effects) parts.push(`${scene.effects} effect`);
                const canvasComplexPaths = Math.max(0, Number(scene.complexPaths || 0) - Number(scene.webglSnapshots || 0));
                if (canvasComplexPaths) parts.push(`${canvasComplexPaths} path/icon`);
                if (canvasAdvancedFills) parts.push(`${canvasAdvancedFills} advanced fill`);
                if (parts.length) rows.push(['Canvas reasons', parts.join(', ')]);
                const detailParts = Object.entries(scene.canvasReasons || {})
                    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
                    .slice(0, 8)
                    .map(([reason, count]) => `${count} ${reason}`);
                if (detailParts.length) rows.push(['Canvas details', detailParts.join(', ')]);
            }
            if (compatibility?.selected?.length) {
                const selectedParts = compatibility.selected.slice(0, 4)
                    .map(item => `${item.name}: ${item.ready ? 'GPU-ready' : item.reason}`);
                rows.push(['Selected object', selectedParts.join(', ')]);
                const selectedSuggestions = [...new Set(compatibility.selected
                    .filter(item => !item.ready)
                    .map(item => item.suggestion || window.StageWebGLRenderer?.getCanvasFallbackSuggestion?.(item.reason))
                    .filter(Boolean))]
                    .slice(0, 3);
                if (selectedSuggestions.length) rows.push(['Selected fix', selectedSuggestions.join(' ')]);
            }
            if (this.rendererMode === 'webgl' && compatibility?.blockers?.length) {
                const blockers = compatibility.blockers
                    .map(item => `${item.name} (${item.reason})`);
                rows.push(['WebGL blockers', blockers.join(', ')]);
                const blockerSuggestions = [...new Set(compatibility.blockers
                    .map(item => item.suggestion || window.StageWebGLRenderer?.getCanvasFallbackSuggestion?.(item.reason))
                    .filter(Boolean))]
                    .slice(0, 3);
                if (blockerSuggestions.length) rows.push(['WebGL fixes', blockerSuggestions.join(' ')]);
            }
            if (simpleSceneActive && this.gridVisible) rows.push(['Grid', 'Hidden while GPU owns GPU-safe objects']);
            if (this.rendererMode === 'webgl' && cache) {
                const cacheParts = [];
                if (cache.objectTextures) cacheParts.push(`${cache.objectTextures} texture${cache.objectTextures === 1 ? '' : 's'}`);
                if (cache.textCanvases) cacheParts.push(`${cache.textCanvases} text cache${cache.textCanvases === 1 ? '' : 's'}`);
                if (cache.snapshotCanvases) cacheParts.push(`${cache.snapshotCanvases} vector cache${cache.snapshotCanvases === 1 ? '' : 's'}`);
                rows.push(['GPU cache', cacheParts.length ? `${cacheParts.join(', ')} · about ${cache.estimatedMB || 0} MB` : 'Empty']);
            }
            if (this.rendererMode === 'webgl' && performanceInfo) {
                if (performanceInfo.frames) {
                    const objectMode = performanceInfo.lastFullObjectsRendered
                        ? 'full object layer'
                        : (performanceInfo.lastPartialObjectsRendered ? 'mixed object layer' : 'background only');
                    rows.push(['WebGL frame', `${performanceInfo.label || 'Measured'} · ${performanceInfo.lastRenderMs} ms last · ${performanceInfo.averageRenderMs} ms avg · ${performanceInfo.lastObjectCount || 0} object(s), ${objectMode}`]);
                    if (performanceInfo.rating === 'slow') {
                        rows.push(['WebGL suggestion', 'Canvas2D may feel smoother for this scene or browser']);
                    } else if (performanceInfo.rating === 'borderline') {
                        rows.push(['WebGL suggestion', 'Reduce GPU-heavy images/effects if editing feels delayed']);
                    }
                } else {
                    rows.push(['WebGL frame', 'Waiting for first GPU frame']);
                }
            }
            if (this.rendererMode === 'webgl' && health) {
                if (health.contextLossCount || health.contextRestoreCount || health.contextLost) {
                    const lossText = `${health.contextLossCount || 0} lost`;
                    const restoreText = `${health.contextRestoreCount || 0} restored`;
                    const lastLoss = health.lastContextLossAt
                        ? ` · last ${new Date(health.lastContextLossAt).toLocaleTimeString()}`
                        : '';
                    rows.push(['WebGL health', `${health.contextLost ? 'Recovering' : 'Recovered'} · ${lossText}, ${restoreText}${lastLoss}`]);
                } else {
                    rows.push(['WebGL health', 'Healthy']);
                }
            }
            if (rendererStatus?.lastError) rows.push(['WebGL note', rendererStatus.lastError]);
            rows.push(['Preview/export', 'Canvas2D parity path']);
            const escape = value => (window.Utils?.escapeHtml ? Utils.escapeHtml(value) : String(value ?? ''));
            detailsEl.innerHTML = rows.map(([label, value]) =>
                `<div class="stage-renderer-details-row"><span>${escape(label)}</span><span>${escape(value)}</span></div>`
            ).join('');
        }
    }

    _buildRendererReport() {
        const objects = this.objectManager?.objects || [];
        const selectedObjects = this.objectManager?.getSelectedObjects?.() || [];
        const rendererStatus = this.webglRenderer?.getStatus?.() || {};
        const scene = rendererStatus.scene || window.StageWebGLRenderer?.analyzeScene?.(objects) || {};
        const compatibility = window.StageWebGLRenderer?.getCompatibilityReport?.(objects, {
            selectedObjects,
            limit: 12
        }) || {};
        const cache = rendererStatus.cache || {};
        const health = rendererStatus.health || {};
        const perf = rendererStatus.performance || {};
        const background = rendererStatus.background || {};
        const lines = [];
        const add = (label, value) => lines.push(`${label}: ${value ?? 'n/a'}`);
        const selectedNames = selectedObjects.map(obj => obj?.name || obj?.label || obj?.type || obj?.id || 'Object');
        const canvasReasons = Object.entries(scene.canvasReasons || {})
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
            .map(([reason, count]) => `${reason} (${count})`);
        const blockers = Array.isArray(compatibility.blockers) ? compatibility.blockers : [];
        const selectedReport = Array.isArray(compatibility.selected) ? compatibility.selected : [];

        lines.push('Animation Stage Renderer Report');
        lines.push('================================');
        add('Generated', new Date().toISOString());
        add('Requested mode', this.rendererMode || 'canvas2d');
        add('Active mode', rendererStatus.mode || (this.webglRenderer?.isActive?.() ? 'webgl' : 'canvas2d'));
        add('WebGL supported', rendererStatus.supported === undefined ? 'unknown' : String(!!rendererStatus.supported));
        add('WebGL access', this.hasWebGLRendererAccess() ? 'allowed' : 'restricted');
        add('Stage size', `${this.width || 0} x ${this.height || 0}`);
        add('Viewport', `${Math.round(this.viewportWidth || 0)} x ${Math.round(this.viewportHeight || 0)} @ ${this.dpr || 1} DPR`);
        add('Background', background.label || this.bgType || 'solid');
        add('Grid visible', this.gridVisible ? 'yes' : 'no');
        add('Objects', `${scene.total || objects.length || 0} total, ${compatibility.ready || 0} GPU-ready, ${compatibility.canvasRequired || 0} Canvas2D fallback`);
        if (canvasReasons.length) add('Canvas fallback reasons', canvasReasons.join(', '));
        if (rendererStatus.lastError) add('Last WebGL error', rendererStatus.lastError);

        lines.push('');
        lines.push('Performance');
        lines.push('-----------');
        add('Rating', perf.label || perf.rating || 'not measured');
        add('Last frame', perf.frames ? `${perf.lastRenderMs || 0} ms` : 'not measured');
        add('Average frame', perf.frames ? `${perf.averageRenderMs || 0} ms` : 'not measured');
        add('GPU object layer', perf.lastFullObjectsRendered ? 'full' : (perf.lastPartialObjectsRendered ? 'mixed' : 'background only'));
        add('Last GPU object count', perf.lastObjectCount || 0);

        lines.push('');
        lines.push('Health');
        lines.push('------');
        add('Context lost now', health.contextLost ? 'yes' : 'no');
        add('Context losses', health.contextLossCount || 0);
        add('Context restores', health.contextRestoreCount || 0);
        add('GPU cache', `${cache.estimatedMB || 0} MB, ${cache.objectTextures || 0} texture(s), ${cache.textCanvases || 0} text cache(s), ${cache.snapshotCanvases || 0} vector cache(s)`);

        lines.push('');
        lines.push('Selection');
        lines.push('---------');
        add('Selected objects', selectedNames.length ? selectedNames.join(', ') : 'none');
        selectedReport.slice(0, 12).forEach(item => {
            const suggestion = item.suggestion || window.StageWebGLRenderer?.getCanvasFallbackSuggestion?.(item.reason) || '';
            lines.push(`- ${item.name || item.id || 'Object'}: ${item.ready ? 'GPU-ready' : `Canvas2D fallback (${item.reason || 'unsupported'})`}`);
            if (!item.ready && suggestion) lines.push(`  Fix: ${suggestion}`);
        });

        lines.push('');
        lines.push('Top WebGL Blockers');
        lines.push('-------------------');
        if (blockers.length) {
            blockers.forEach(item => {
                const suggestion = item.suggestion || window.StageWebGLRenderer?.getCanvasFallbackSuggestion?.(item.reason) || '';
                lines.push(`- ${item.name || item.id || 'Object'} [${item.type || 'object'}]: ${item.reason || 'unsupported'}`);
                if (suggestion) lines.push(`  Fix: ${suggestion}`);
            });
        } else {
            lines.push('- none');
        }

        return lines.join('\n');
    }

    async copyRendererReport() {
        const report = this._buildRendererReport();
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(report);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = report;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
            }
            Utils.showToast?.('Renderer report copied', 'success');
        } catch (error) {
            console.warn('[Stage] Could not copy renderer report:', error);
            Utils.showToast?.('Could not copy renderer report. Check console for details.', 'warning');
            console.log(report);
        }
    }

    render() {
        // Recording preparation evaluates temporary poses; keep the last complete frame visible.
        if (this._armaturePreparing) return;
        const ctx = this.ctx;
        const w = this.viewportWidth;
        const h = this.viewportHeight;
        const webglActive = !!this.webglRenderer?.isActive?.();
        const webglBackgroundActive = webglActive && this.webglRenderer.canRenderStageBackground();
        const webglObjectPlan = webglActive && webglBackgroundActive
            && !this.objectManager?.tempObject
            && !this.objectManager?.isDrawingPath
            && !this.objectManager?.isDrawingTrace
            ? this.webglRenderer?.getObjectRenderPlan?.(this.objectManager?.objects || [], {
                objectManager: this.objectManager,
                allowPartial: !this.gridVisible
            })
            : null;
        const webglObjectsActive = webglActive
            && webglBackgroundActive
            && !this.objectManager?.tempObject
            && !this.objectManager?.isDrawingPath
            && !this.objectManager?.isDrawingTrace
            && !!webglObjectPlan?.objects?.length;
        let webglObjectsRendered = false;
        let webglFullObjectsRendered = false;
        let webglSkipObjectIds = null;
        let canvasBackgroundFallback = !webglBackgroundActive;
        this._maybeRefreshRendererDiagnostics();

        // Clear
        ctx.clearRect(0, 0, w, h);

        if (webglActive) {
            try {
                const webglRenderResult = this.webglRenderer.render({
                    renderObjects: webglObjectsActive,
                    objects: this.objectManager?.objects || [],
                    objectPlan: webglObjectPlan
                });
                webglObjectsRendered = !!webglRenderResult?.objectsRendered;
                webglFullObjectsRendered = !!webglRenderResult?.fullObjectsRendered;
                if (webglObjectsRendered && !webglFullObjectsRendered && webglRenderResult?.renderedObjectIds?.length) {
                    webglSkipObjectIds = new Set(webglRenderResult.renderedObjectIds);
                }
            } catch (err) {
                webglObjectsRendered = false;
                webglFullObjectsRendered = false;
                webglSkipObjectIds = null;
                canvasBackgroundFallback = true;
                if (this.webglRenderer) {
                    this.webglRenderer.lastError = `WebGL render failed; Canvas2D fallback used: ${err?.message || err}`;
                }
                console.warn('[Stage] WebGL render failed; using Canvas2D fallback for this frame', err);
            }
        }
        if (!webglActive || canvasBackgroundFallback) {
            // Draw workspace background
            ctx.fillStyle = '#0a0a14';
            ctx.fillRect(0, 0, w, h);
        }

        // Apply viewport transform
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);

        // Apply animated stage-camera transform (during playback / export)
        const _camXform = (typeof window !== 'undefined' && window.app && window.app.stageCamera)
            ? window.app.stageCamera.getActiveTransform()
            : null;
        if (_camXform) {
            ctx.scale(_camXform.scale, _camXform.scale);
            ctx.translate(-_camXform.x, -_camXform.y);
        }

        // Draw stage background. In WebGL mode the GPU owns the stage background;
        // object rendering and editor overlays still use the stable Canvas2D path.
        if (canvasBackgroundFallback) {
            this._drawStageBackground(ctx);
        }

        // Draw stage border
        ctx.strokeStyle = '#3a3a5c';
        ctx.lineWidth = 1 / this.zoom;
        ctx.strokeRect(0, 0, this.width, this.height);

        // Draw grid
        if (this.gridVisible && this.zoom > 0.15 && !webglFullObjectsRendered) {
            this.drawGrid(ctx);
        }

        // Draw objects (delegated to object manager)
        try {
            window.__animationStageWebGLObjectsRendered = webglFullObjectsRendered;
            window.__animationStageWebGLSkipObjectIds = webglSkipObjectIds;
            eventBus.emit('stage:render', ctx);
        } finally {
            window.__animationStageWebGLObjectsRendered = false;
            window.__animationStageWebGLSkipObjectIds = null;
        }

        // Draw overlays (path animation preview, etc.)
        eventBus.emit('stage:render-overlay', ctx);

        // Draw selection (delegated to object manager)
        eventBus.emit('stage:render-selection', ctx);

        ctx.restore();

        // Draw stage dimensions label
        ctx.fillStyle = '#6a6a82';
        ctx.font = '10px Inter';
        ctx.textAlign = 'center';
        ctx.fillText(
            `${this.width} × ${this.height}`,
            this.panX + (this.width * this.zoom) / 2,
            this.panY + this.height * this.zoom + 16
        );

        // Draw canvas-rendered scrollbars (always on top)
        this.drawScrollbars(ctx);
    }

    _drawStageBackground(ctx) {
        const w = this.width, h = this.height;
        ctx.save();
        ctx.globalAlpha = this.bgOpacity;

        switch (this.bgType) {
            case 'transparent': {
                // Checkerboard pattern for transparency
                const cs = 16;
                for (let y = 0; y < h; y += cs) {
                    for (let x = 0; x < w; x += cs) {
                        ctx.fillStyle = ((x / cs + y / cs) % 2 === 0) ? '#ffffff' : '#cccccc';
                        ctx.fillRect(x, y, Math.min(cs, w - x), Math.min(cs, h - y));
                    }
                }
                break;
            }
            case 'linear-gradient': {
                const rad = (this.bgGradAngle || 0) * Math.PI / 180;
                const r = Math.max(w, h) / 2;
                const cx = w / 2, cy = h / 2;
                const g = ctx.createLinearGradient(cx - r * Math.cos(rad), cy - r * Math.sin(rad),
                    cx + r * Math.cos(rad), cy + r * Math.sin(rad));
                g.addColorStop(0, this.bgGradStart);
                g.addColorStop(1, this.bgGradEnd);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
                break;
            }
            case 'radial-gradient': {
                const r = Math.max(w, h) / 2;
                const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
                g.addColorStop(0, this.bgGradStart);
                g.addColorStop(1, this.bgGradEnd);
                ctx.fillStyle = g;
                ctx.fillRect(0, 0, w, h);
                break;
            }
            case 'pattern': {
                ctx.fillStyle = this.bgColor;
                ctx.fillRect(0, 0, w, h);
                // Cache pattern canvas — only rebuild when settings change
                const patKey = `${this.bgColor}_${this.bgPatternColor}_${this.bgPatternType}_${this.bgPatternScale}`;
                if (this._bgPatternKey !== patKey || !this._bgPatternCanvas) {
                    this._bgPatternKey = patKey;
                    const sz = Math.max(8, 16 * (this.bgPatternScale || 1));
                    const pc = document.createElement('canvas');
                    pc.width = sz; pc.height = sz;
                    const pctx = pc.getContext('2d');
                    pctx.fillStyle = this.bgColor; pctx.fillRect(0, 0, sz, sz);
                    pctx.strokeStyle = this.bgPatternColor; pctx.fillStyle = this.bgPatternColor;
                    pctx.lineWidth = Math.max(1, sz * 0.08);
                    switch (this.bgPatternType) {
                        case 'stripes': pctx.beginPath(); pctx.moveTo(0, sz); pctx.lineTo(sz, 0); pctx.moveTo(-sz * 0.5, sz * 0.5); pctx.lineTo(sz * 0.5, -sz * 0.5); pctx.moveTo(sz * 0.5, sz * 1.5); pctx.lineTo(sz * 1.5, sz * 0.5); pctx.stroke(); break;
                        case 'dots': pctx.beginPath(); pctx.arc(sz / 2, sz / 2, sz * 0.15, 0, Math.PI * 2); pctx.fill(); break;
                        case 'crosshatch': pctx.beginPath(); pctx.moveTo(0, sz); pctx.lineTo(sz, 0); pctx.moveTo(0, 0); pctx.lineTo(sz, sz); pctx.stroke(); break;
                        case 'checkerboard': pctx.fillRect(0, 0, sz / 2, sz / 2); pctx.fillRect(sz / 2, sz / 2, sz / 2, sz / 2); break;
                    }
                    this._bgPatternCanvas = pc;
                }
                ctx.fillStyle = ctx.createPattern(this._bgPatternCanvas, 'repeat');
                ctx.fillRect(0, 0, w, h);
                break;
            }
            case 'image': {
                if (this.bgImageElement) {
                    const img = this.bgImageElement;
                    switch (this.bgImageFit) {
                        case 'stretch':
                            ctx.drawImage(img, 0, 0, w, h);
                            break;
                        case 'contain': {
                            const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
                            const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
                            ctx.fillStyle = this.bgColor;
                            ctx.fillRect(0, 0, w, h);
                            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
                            break;
                        }
                        case 'tile': {
                            const pat = ctx.createPattern(img, 'repeat');
                            ctx.fillStyle = pat;
                            ctx.fillRect(0, 0, w, h);
                            break;
                        }
                        default: { // cover
                            const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
                            const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
                            ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
                            break;
                        }
                    }
                } else {
                    ctx.fillStyle = this.bgColor;
                    ctx.fillRect(0, 0, w, h);
                }
                break;
            }
            default: { // solid
                ctx.fillStyle = this.bgColor;
                ctx.fillRect(0, 0, w, h);
                break;
            }
        }
        ctx.restore();
    }

    drawGrid(ctx) {
        const gs = this.gridSize;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 0.5 / this.zoom;

        // Vertical lines
        for (let x = gs; x < this.width; x += gs) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, this.height);
            ctx.stroke();
        }
        // Horizontal lines
        for (let y = gs; y < this.height; y += gs) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(this.width, y);
            ctx.stroke();
        }

        // Major grid lines (every 5 units)
        if (this.zoom > 0.3) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1 / this.zoom;
            const majorGs = gs * 5;
            for (let x = majorGs; x < this.width; x += majorGs) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, this.height);
                ctx.stroke();
            }
            for (let y = majorGs; y < this.height; y += majorGs) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(this.width, y);
                ctx.stroke();
            }
        }

        // Center crosshair
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.lineWidth = 1 / this.zoom;
        ctx.setLineDash([5 / this.zoom, 5 / this.zoom]);
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 2, this.height);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(0, this.height / 2);
        ctx.lineTo(this.width, this.height / 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }

    // Unified stage data serialization (includes all properties)
    getStageData() {
        return {
            width: this.width,
            height: this.height,
            // Keep dimensions wrapper for backward compatibility
            dimensions: { width: this.width, height: this.height },
            orientation: this.orientation,
            bgColor: this.bgColor,
            bgType: this.bgType,
            bgOpacity: this.bgOpacity,
            bgGradStart: this.bgGradStart,
            bgGradEnd: this.bgGradEnd,
            bgGradAngle: this.bgGradAngle,
            bgPatternType: this.bgPatternType,
            bgPatternColor: this.bgPatternColor,
            bgPatternScale: this.bgPatternScale,
            bgImageSrc: this.bgImageSrc,
            bgLibraryAsset: this.bgLibraryAsset ? JSON.parse(JSON.stringify(this.bgLibraryAsset)) : null,
            bgImageFit: this.bgImageFit,
            grid: {
                visible: this.gridVisible,
                size: this.gridSize,
                snap: this.snapEnabled
            },
            cameraKeyframes: Array.isArray(this.cameraKeyframes) ? JSON.parse(JSON.stringify(this.cameraKeyframes)) : [],
            cameraEnabled: this.cameraEnabled !== false
        };
    }

    // Unified load — handles both old (dimensions wrapper) and new (flat) formats
    loadFromData(data) {
        if (!data) return;
        // Support both formats: {dimensions:{width,height}} and {width,height}
        if (data.dimensions) {
            this.width = data.dimensions.width;
            this.height = data.dimensions.height;
        }
        if (data.width) this.width = data.width;
        if (data.height) this.height = data.height;
        if (data.orientation) this.orientation = data.orientation;
        if (data.bgColor) this.bgColor = data.bgColor;
        if (data.bgType) this.bgType = data.bgType;
        if (data.bgOpacity !== undefined) this.bgOpacity = data.bgOpacity;
        if (data.bgGradStart) this.bgGradStart = data.bgGradStart;
        if (data.bgGradEnd) this.bgGradEnd = data.bgGradEnd;
        if (data.bgGradAngle !== undefined) this.bgGradAngle = data.bgGradAngle;
        if (data.bgPatternType) this.bgPatternType = data.bgPatternType;
        if (data.bgPatternColor) this.bgPatternColor = data.bgPatternColor;
        if (data.bgPatternScale !== undefined) this.bgPatternScale = data.bgPatternScale;
        this.bgLibraryAsset = data.bgLibraryAsset ? JSON.parse(JSON.stringify(data.bgLibraryAsset)) : null;
        if (data.bgImageSrc) {
            this.bgImageSrc = data.bgImageSrc;
            const img = new Image();
            img.onload = () => { if (this.bgImageSrc !== data.bgImageSrc) return; this.bgImageElement = img; this.needsRender = true; };
            img.src = data.bgImageSrc;
        } else {
            this.bgImageSrc = null;
            this.bgImageElement = null;
        }
        if (data.bgImageFit) this.bgImageFit = data.bgImageFit;
        if (data.grid) {
            this.gridVisible = data.grid.visible ?? this.gridVisible;
            this.gridSize = data.grid.size ?? this.gridSize;
            this.snapEnabled = data.grid.snap ?? this.snapEnabled;
        }
        this.cameraKeyframes = Array.isArray(data.cameraKeyframes) ? JSON.parse(JSON.stringify(data.cameraKeyframes)) : [];
        this.cameraEnabled = data.cameraEnabled !== false;
        
        // Update UI controls
        const wEl = document.getElementById('stage-width');
        const hEl = document.getElementById('stage-height');
        if (wEl) wEl.value = this.width;
        if (hEl) hEl.value = this.height;
        const orEl = document.getElementById('stage-orientation');
        if (orEl) orEl.value = this.orientation;
        const bgcEl = document.getElementById('stage-bg-color');
        if (bgcEl) bgcEl.value = this.bgColor;
        const bgTypeEl = document.getElementById('stage-bg-type');
        if (bgTypeEl) bgTypeEl.value = this.bgType;
        const bgOpEl = document.getElementById('stage-bg-opacity');
        if (bgOpEl) bgOpEl.value = Math.round(this.bgOpacity * 100);
        const bgOpVal = document.getElementById('stage-bg-opacity-val');
        if (bgOpVal) bgOpVal.textContent = Math.round(this.bgOpacity * 100) + '%';
        const gvEl = document.getElementById('grid-visible');
        if (gvEl) gvEl.checked = this.gridVisible;
        const gsEl = document.getElementById('grid-size');
        if (gsEl) gsEl.value = this.gridSize;
        const snEl = document.getElementById('grid-snap');
        if (snEl) snEl.checked = this.snapEnabled;
        if (typeof this._updateBgControlVisibility === 'function') this._updateBgControlVisibility();
        if (typeof this.setRendererMode === 'function') this.setRendererMode(this.rendererMode, { silent: true });
        
        this.centerStage();
    }

    destroy() {
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
    }
}
