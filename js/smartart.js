/* ============================================
   SmartArt Manager — Core Engine
   Renders SmartArt templates to canvas, handles
   text editing, animation playback, palette,
   and export.
   ============================================ */

class SmartArtManager {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.templates = new SmartArtTemplates();
        this.stageWorkspaceBridgeKey = 'animstage_stage_workspace_bridge';
        this.workspaceStateKey = 'animstage_smartart_workspace';
        this.activePane = 'sa-pane-text';
        this.hasRestoredState = false;
        this._persistTimer = null;
        this._regenerateTimer = null;
        this._pendingEditorRefresh = false;
        this._pendingThumbRefresh = false;
        this._isRestoringState = false;
        this._dragImageState = null;
        this._dragTextState = null;
        this._hoverImageIndex = null;
        this._hoverTextTarget = null;
        this._selectedTextTarget = null;
        this._textPositionMode = false;
        this.viewZoom = 1;

        // State
        this.currentTemplateId = null;
        this.currentPalette = this.templates.getDefaultPalette();
        this.currentPaletteKey = 'corporate';
        this.backgroundColor = '#ffffff';
        this.items = [];          // [{text, subtext}]
        this.generatedLayout = null;  // { objects[], connections[] }
        this.fontScale = 1.0;     // Global label/value text-size multiplier (0.6 – 2.0)
        this.fontFamily = 'Inter, sans-serif';   // Global font-family used by every text object
        this.barOrientation = 'vertical';        // 'vertical' (columns) | 'horizontal' (bars) for bar-chart family
        this.flowDirection = 'horizontal';     // 'horizontal' | 'vertical' for process / timeline templates
        this.seriesLabels = [];   // Optional series names for multi-series charts (clustered/stacked/line/combo)
        this.textOffsets = {};    // Manual canvas text offsets for non-item labels, keyed by role/text

        // Image cache for picture templates
        this._imageCache = new Map();

        // Animation state
        this.animationType = 'fade-in';
        this.animationOrder = 'sequential';  // sequential | all-at-once | random
        this.animationDuration = 600;
        this.animationStagger = 150;
        this.animationEasing = 'ease-out';
        this.isPlaying = false;
        this._animFrame = null;
        this._animStartTime = 0;
        this._animObjects = [];

        // Canvas sizing
        this.stageW = 800;
        this.stageH = 500;
        this._resizeCanvas();

        this._initUI();
        this._syncWorkspaceChrome();
        this._bindEvents();

        // Select first category and first template
        this._renderCategoryButtons();
        this._selectCategory('all');
        this.hasRestoredState = this._restoreWorkspaceState();
        this._syncWorkspaceChrome();

        window.addEventListener('beforeunload', () => {
            this._persistWorkspaceState();
        });
    }

    /* ===========================
       UI Initialization
       =========================== */

    _initUI() {
        this.elCategories = document.getElementById('sa-categories');
        this.elTemplateGrid = document.getElementById('sa-template-grid');
        this.elTextList = document.getElementById('sa-text-list');
        this.elPaletteRow = document.getElementById('sa-palette-row');
        this.elAnimGrid = document.getElementById('sa-anim-type-grid');
        this.elAnimDuration = document.getElementById('sa-anim-duration');
        this.elAnimDurationVal = document.getElementById('sa-anim-duration-val');
        this.elAnimStagger = document.getElementById('sa-anim-stagger');
        this.elAnimStaggerVal = document.getElementById('sa-anim-stagger-val');
        this.elAnimOrder = document.getElementById('sa-anim-order');
        this.elAnimEasing = document.getElementById('sa-anim-easing');
        this.elPlayBtn = document.getElementById('sa-play-btn');
        this.elBgColor = document.getElementById('sa-bg-color');
        this.elFontScale = document.getElementById('sa-font-scale');
        this.elFontScaleVal = document.getElementById('sa-font-scale-val');
        this.elSeriesLabels = document.getElementById('sa-series-labels');
        this.elSeriesLabelsRow = document.getElementById('sa-series-labels-row');
        this.elSortItems = document.getElementById('sa-sort-items');
        this.elFontFamily = document.getElementById('sa-font-family');
        this.elBarOrientation = document.getElementById('sa-bar-orientation');
        this.elBarOrientationRow = document.getElementById('sa-bar-orientation-row');
        this.elFlowDirection = document.getElementById('sa-flow-direction');
        this.elFlowDirectionRow = document.getElementById('sa-flow-direction-row');
        this.elTextPositionMode = document.getElementById('sa-text-position-mode');
        this.elResetTextPosition = document.getElementById('sa-reset-text-position');
        this.elResetAllTextPositions = document.getElementById('sa-reset-all-text-positions');
        this.elSearch = document.getElementById('sa-search');
        this.elTemplateCount = document.getElementById('sa-template-count');
        this.elWorkspaceTitle = document.getElementById('sa-workspace-title');
        this.elWorkspacePill = document.getElementById('sa-workspace-pill');
        this.elWorkspaceStatus = document.getElementById('sa-workspace-status');
        this.elNavBackLabel = document.getElementById('sa-nav-back-label');
        this.elZoomValue = document.getElementById('sa-zoom-value');

        // Search state
        this._searchQuery = '';
        this._currentCategory = 'all';

        // Render palettes
        this._renderPalettes();
    }

    _readStageWorkspaceMode() {
        try {
            const raw = sessionStorage.getItem(this.stageWorkspaceBridgeKey);
            if (!raw) return null;
            const payload = JSON.parse(raw);
            return payload?.ui?.mode === 'ai' ? 'ai' : payload?.ui?.mode === 'basic' ? 'basic' : null;
        } catch (e) {
            return null;
        }
    }

    _hasStageWorkspaceBridge() {
        try {
            const raw = sessionStorage.getItem(this.stageWorkspaceBridgeKey);
            if (!raw) return false;
            const payload = JSON.parse(raw);
            return !!payload?.project;
        } catch (e) {
            return false;
        }
    }

    _syncWorkspaceChrome() {
        const mode = this._readStageWorkspaceMode();
        const modeLabel = mode === 'ai' ? 'AI Mode' : mode === 'basic' ? 'Basic Mode' : null;
        const hasStageBridge = this._hasStageWorkspaceBridge();

        if (this.elWorkspaceTitle) {
            this.elWorkspaceTitle.textContent = modeLabel ? `SmartArt linked to ${modeLabel}` : 'SmartArt Animations';
        }

        if (this.elWorkspacePill) {
            this.elWorkspacePill.textContent = hasStageBridge
                ? `Synced with ${modeLabel || 'Stage'}`
                : 'Standalone workspace';
            this.elWorkspacePill.classList.toggle('is-ai', mode === 'ai');
            this.elWorkspacePill.classList.toggle('is-synced', hasStageBridge);
        }

        if (this.elWorkspaceStatus) {
            if (hasStageBridge && this.hasRestoredState && modeLabel) {
                this.elWorkspaceStatus.textContent = `SmartArt workspace restored and synced with your ${modeLabel.toLowerCase()} project.`;
            } else if (hasStageBridge && modeLabel) {
                this.elWorkspaceStatus.textContent = `Changes return to your ${modeLabel.toLowerCase()} project without restarting it.`;
            } else {
                this.elWorkspaceStatus.textContent = 'Connected to your current project';
            }
        }

        if (this.elNavBackLabel) {
            this.elNavBackLabel.textContent = modeLabel ? `Return to ${modeLabel}` : 'Back to Stage';
        }
    }

    _bindEvents() {
        // Play button
        this.elPlayBtn?.addEventListener('click', () => this.playAnimation());
        document.getElementById('sa-reset-btn')?.addEventListener('click', () => this.resetAnimation());

        // Animation controls
        this.elAnimDuration?.addEventListener('input', (e) => {
            this.animationDuration = parseInt(e.target.value);
            if (this.elAnimDurationVal) this.elAnimDurationVal.textContent = e.target.value + 'ms';
            this._scheduleWorkspacePersist();
        });
        this.elAnimStagger?.addEventListener('input', (e) => {
            this.animationStagger = parseInt(e.target.value);
            if (this.elAnimStaggerVal) this.elAnimStaggerVal.textContent = e.target.value + 'ms';
            this._scheduleWorkspacePersist();
        });
        this.elAnimOrder?.addEventListener('change', (e) => {
            this.animationOrder = e.target.value;
            this._scheduleWorkspacePersist();
        });
        this.elAnimEasing?.addEventListener('change', (e) => {
            this.animationEasing = e.target.value;
            this._scheduleWorkspacePersist();
        });

        // Background color
        this.elBgColor?.addEventListener('input', (e) => {
            this.backgroundColor = e.target.value;
            this.render();
            this._scheduleWorkspacePersist();
        });

        // Global font-size scale
        this.elFontScale?.addEventListener('input', (e) => {
            const v = parseFloat(e.target.value) || 1.0;
            this.fontScale = Math.max(0.6, Math.min(2.0, v));
            if (this.elFontScaleVal) this.elFontScaleVal.textContent = `${Math.round(this.fontScale * 100)}%`;
            this._regenerate();
            this._scheduleWorkspacePersist();
        });

        // Series labels (multi-series chart legend)
        this.elSeriesLabels?.addEventListener('input', (e) => {
            const raw = String(e.target.value || '');
            this.seriesLabels = raw.split(',').map(s => s.trim()).filter(Boolean);
            this._regenerate();
            this._scheduleWorkspacePersist();
        });

        // Global font-family
        this.elFontFamily?.addEventListener('change', (e) => {
            const v = String(e.target.value || '').trim();
            this.fontFamily = v || 'Inter, sans-serif';
            this.render();
            this._scheduleWorkspacePersist();
        });

        // Bar chart orientation (vertical columns vs horizontal bars)
        this.elBarOrientation?.addEventListener('change', (e) => {
            this.setBarOrientation(e.target.value);
        });
        this.elFlowDirection?.addEventListener('change', (e) => {
            this.setFlowDirection(e.target.value);
        });
        this.elTextPositionMode?.addEventListener('click', () => {
            this._setTextPositionMode(!this._textPositionMode);
        });
        this.elResetTextPosition?.addEventListener('click', () => {
            this._resetSelectedTextOffset();
        });
        this.elResetAllTextPositions?.addEventListener('click', () => {
            this._resetAllTextOffsets();
        });

        // Sort / reorder items
        this.elSortItems?.addEventListener('change', (e) => {
            const mode = e.target.value;
            if (!mode) return;
            this.sortItems(mode);
            // Snap back to placeholder so the same option can be re-selected
            e.target.value = '';
        });

        // Tab switching
        document.querySelectorAll('.sa-right-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                this._setActivePane(tab.dataset.pane);
            });
        });

        // Export buttons
        document.getElementById('sa-export-png')?.addEventListener('click', () => this.exportImage('png'));
        document.getElementById('sa-send-to-stage')?.addEventListener('click', () => this.sendToStage());

        // Fit to window — recompute canvas size against the current stage wrap.
        // Useful after panel resizes / DPR changes / browser zoom shifts.
        // We schedule across two animation frames so any pending layout
        // (toolbar wrapping, panel drag releases, scrollbar appearance)
        // has fully settled before we measure the wrap, otherwise the
        // canvas can end up sized to a stale rect and visually overflow.
        document.getElementById('sa-fit-window')?.addEventListener('click', () => {
            this.viewZoom = 1;
            this._resizeCanvas();
            requestAnimationFrame(() => requestAnimationFrame(() => {
                this._resizeCanvas();
                // Force a regenerate so any chart layout that was baked at
                // the previous size re-flows to the freshly-fit dimensions.
                if (this.currentTemplateId) this._regenerate();
            }));
            try { Utils?.showToast?.('Fitted to window', 'success'); } catch (_) {}
        });
        document.getElementById('sa-zoom-out')?.addEventListener('click', () => this._setViewZoom(this.viewZoom / 1.2));
        document.getElementById('sa-zoom-in')?.addEventListener('click', () => this._setViewZoom(this.viewZoom * 1.2));

        // Window resize
        window.addEventListener('resize', () => this._resizeCanvas());

        // Mobile panel toggles
        this._initMobileToggles();

        // Resizable side panels
        this._initPanelResizers();

        // Resizable + collapsible top canvas toolbar
        this._initToolbarCollapseAndResize();

        // Add item button
        document.getElementById('sa-add-item')?.addEventListener('click', () => this._addItem());

        // Template search
        this.elSearch?.addEventListener('input', (e) => {
            clearTimeout(this._searchTimer);
            this._searchTimer = setTimeout(() => {
                this._searchQuery = e.target.value.trim().toLowerCase();
                this._filterTemplates();
            }, 150);
        });

        // Template preview modal
        this._initPreviewModal();

        // Quick apply panel
        this._initQuickApply();

        // Custom palette editor
        this._initPaletteEditor();

        // AI prompt shortcut buttons
        document.querySelectorAll('.sa-ai-quick-btn, .sa-ai-dock-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                const prompt = btn.dataset.prompt;
                const smartArtAI = globalThis.saAI || null;
                if (prompt && smartArtAI) {
                    const input = document.getElementById('sa-ai-input');
                    if (input) input.value = prompt;
                    smartArtAI.send(prompt);
                }
            });
        });

        this._bindCanvasInteractions();
    }

    _bindCanvasInteractions() {
        if (!this.canvas) return;

        this.canvas.addEventListener('contextmenu', (event) => {
            if (this.isPlaying) return;
            event.preventDefault();
            if (this._textPositionMode) return;
            const point = this._getCanvasPoint(event);
            const hit = this._findItemAt(point);
            this._showCanvasMenu(event, hit);
        });

        this.canvas.addEventListener('dblclick', (event) => {
            if (this.isPlaying) return;
            if (this._textPositionMode) return;
            const point = this._getCanvasPoint(event);
            const hit = this._findItemAt(point);
            if (hit) this._promptEditItemText(hit.itemIndex);
        });

        this.canvas.addEventListener('pointerdown', (event) => {
            if (this.isPlaying) return;
            const point = this._getCanvasPoint(event);
            if (this._textPositionMode) {
                const textHit = this._findTextOffsetTarget(point);
                if (!textHit) return;
                this._beginTextDrag(event, textHit, point);
                return;
            }
            const hit = this._findInteractiveImageTarget(this._getCanvasPoint(event));
            if (!hit) return;

            const metrics = this._getImageRenderMetrics(hit.object);
            if (!metrics || (!metrics.extraX && !metrics.extraY)) return;

            this._dragImageState = {
                pointerId: event.pointerId,
                index: hit.object._saIndex,
                startX: event.clientX,
                startY: event.clientY,
                startPanX: metrics.imageFit.panX,
                startPanY: metrics.imageFit.panY,
                extraX: metrics.extraX,
                extraY: metrics.extraY
            };
            this._setCanvasCursor('grabbing');
            this.canvas.setPointerCapture?.(event.pointerId);
            event.preventDefault();
        });

        this.canvas.addEventListener('pointermove', (event) => {
            if (this._dragTextState) {
                this._handleTextDragMove(event);
                return;
            }
            if (this._dragImageState) {
                this._handleImageDragMove(event);
                return;
            }

            const point = this._getCanvasPoint(event);
            if (this._textPositionMode) {
                const textHit = this._findTextOffsetTarget(point);
                this._hoverTextTarget = textHit || null;
                this._setCanvasCursor(textHit ? 'move' : 'default');
                this.render();
                return;
            }
            const hit = this._findInteractiveImageTarget(point);
            const nextHover = hit?.object?._saIndex ?? null;
            if (nextHover !== this._hoverImageIndex) {
                this._hoverImageIndex = nextHover;
            }
            if (nextHover != null) {
                this._setCanvasCursor('grab');
            } else {
                const itemHit = this._findItemAt(point);
                this._setCanvasCursor(itemHit ? 'context-menu' : 'default');
            }
        });

        const finishDrag = (event) => {
            this._finishTextDrag(event);
            this._finishImageDrag(event);
        };
        this.canvas.addEventListener('pointerup', finishDrag);
        this.canvas.addEventListener('pointercancel', finishDrag);
        this.canvas.addEventListener('pointerleave', () => {
            if (!this._dragImageState && !this._dragTextState) {
                this._hoverImageIndex = null;
                this._hoverTextTarget = null;
                this._setCanvasCursor('default');
                this.render();
            }
        });
    }

    /* ===========================
       Mobile Panel Toggles
       =========================== */

    _initMobileToggles() {
        const leftPanel = document.querySelector('.sa-panel-left');
        const rightPanel = document.querySelector('.sa-panel-right');
        const overlay = document.getElementById('sa-mobile-overlay');
        const toggleLeft = document.getElementById('sa-toggle-left');
        const toggleRight = document.getElementById('sa-toggle-right');

        const closeAll = () => {
            leftPanel?.classList.remove('mobile-open');
            rightPanel?.classList.remove('mobile-open');
            overlay?.classList.remove('visible');
        };

        toggleLeft?.addEventListener('click', () => {
            const isOpen = leftPanel?.classList.contains('mobile-open');
            closeAll();
            if (!isOpen) {
                leftPanel?.classList.add('mobile-open');
                overlay?.classList.add('visible');
            }
        });

        toggleRight?.addEventListener('click', () => {
            const isOpen = rightPanel?.classList.contains('mobile-open');
            closeAll();
            if (!isOpen) {
                rightPanel?.classList.add('mobile-open');
                overlay?.classList.add('visible');
            }
        });

        overlay?.addEventListener('click', closeAll);
    }

    /**
     * Allow the user to drag-resize the left (template browser) and right
     * (text/animate/AI editor) panels. Widths persist to localStorage and the
     * canvas resizes live to follow the new centre column width.
     */
    _initPanelResizers() {
        const body = document.querySelector('.sa-body');
        if (!body) return;

        const STORAGE_KEY = 'smartart_panel_widths_v1';
        const DEFAULTS = { left: 300, right: 310 };
        const BOUNDS = { left: { min: 200, max: 520 }, right: { min: 220, max: 560 } };
        const COLLAPSED_WIDTH = 36;
        const MIN_CENTER_WIDTH = 200;

        const getHandle = (side) => document.getElementById(side === 'left' ? 'sa-resize-left' : 'sa-resize-right');
        const getPanel = (side) => document.querySelector(side === 'left' ? '.sa-panel-left' : '.sa-panel-right');

        const getStoredWidth = (side) => {
            const cssVar = side === 'left' ? '--sa-left-width' : '--sa-right-width';
            return parseInt(getComputedStyle(body).getPropertyValue(cssVar), 10) || DEFAULTS[side];
        };

        const getEffectiveWidth = (side) => {
            const panel = getPanel(side);
            if (panel?.classList.contains('is-collapsed')) return COLLAPSED_WIDTH;
            return getStoredWidth(side);
        };

        const getVisibleHandleWidth = (side) => {
            const handle = getHandle(side);
            if (!handle) return 0;
            if (getComputedStyle(handle).display === 'none') return 0;
            return Math.round(handle.getBoundingClientRect().width);
        };

        const getDynamicMax = (side) => {
            const otherSide = side === 'left' ? 'right' : 'left';
            const totalHandleWidth = getVisibleHandleWidth('left') + getVisibleHandleWidth('right');
            const available = body.clientWidth - getEffectiveWidth(otherSide) - totalHandleWidth - MIN_CENTER_WIDTH;
            // Always allow at least the current width as the upper bound so the
            // user can keep shrinking even when the viewport is too narrow for
            // `available` to exceed BOUNDS.min — otherwise clampWidth would
            // freeze the handle (the previous bug: max collapsed down to min,
            // making the drag a no-op when the window wasn't maximised).
            const currentWidth = getEffectiveWidth(side);
            const cap = Math.max(BOUNDS[side].min, currentWidth, available);
            return Math.min(BOUNDS[side].max, Math.floor(cap));
        };

        const normalizeWidths = () => {
            const left = clampWidth(getStoredWidth('left'), { ...BOUNDS.left, max: getDynamicMax('left') });
            body.style.setProperty('--sa-left-width', left + 'px');
            const right = clampWidth(getStoredWidth('right'), { ...BOUNDS.right, max: getDynamicMax('right') });
            body.style.setProperty('--sa-right-width', right + 'px');
        };

        // Restore saved widths
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            const left = clampWidth(Number(saved.left) || DEFAULTS.left, BOUNDS.left);
            const right = clampWidth(Number(saved.right) || DEFAULTS.right, BOUNDS.right);
            body.style.setProperty('--sa-left-width', left + 'px');
            body.style.setProperty('--sa-right-width', right + 'px');
        } catch (_) { /* ignore */ }
        normalizeWidths();

        function clampWidth(value, bounds) {
            return Math.max(bounds.min, Math.min(bounds.max, Math.round(value)));
        }

        const persist = () => {
            try {
                const left = parseInt(getComputedStyle(body).getPropertyValue('--sa-left-width'), 10) || DEFAULTS.left;
                const right = parseInt(getComputedStyle(body).getPropertyValue('--sa-right-width'), 10) || DEFAULTS.right;
                localStorage.setItem(STORAGE_KEY, JSON.stringify({ left, right }));
            } catch (_) { /* ignore */ }
        };

        const bindHandle = (handleId, side) => {
            const handle = document.getElementById(handleId);
            if (!handle) return;
            const cssVar = side === 'left' ? '--sa-left-width' : '--sa-right-width';
            const bounds = BOUNDS[side];

            const startDrag = (event) => {
                event.preventDefault();
                const startX = event.clientX;
                const startWidth = parseInt(getComputedStyle(body).getPropertyValue(cssVar), 10) || DEFAULTS[side];
                handle.classList.add('is-dragging');
                document.body.classList.add('sa-resizing');
                // NOTE: do NOT use setPointerCapture here — once a pointer is
                // captured, subsequent pointer events for that pointer are
                // dispatched ONLY to the capturing element, so window-level
                // pointermove / pointerup listeners never fire and the drag
                // appears completely dead. Document-level listeners with the
                // capture phase work reliably across browsers instead.

                const onMove = (e) => {
                    const dx = e.clientX - startX;
                    const nextBounds = { ...bounds, max: getDynamicMax(side) };
                    const next = clampWidth(side === 'left' ? startWidth + dx : startWidth - dx, nextBounds);
                    body.style.setProperty(cssVar, next + 'px');
                    // Live-resize the canvas so the preview tracks the drag
                    this._resizeCanvas();
                };
                const onUp = () => {
                    handle.classList.remove('is-dragging');
                    document.body.classList.remove('sa-resizing');
                    document.removeEventListener('pointermove', onMove, true);
                    document.removeEventListener('pointerup', onUp, true);
                    document.removeEventListener('pointercancel', onUp, true);
                    persist();
                };
                document.addEventListener('pointermove', onMove, true);
                document.addEventListener('pointerup', onUp, true);
                document.addEventListener('pointercancel', onUp, true);
            };

            handle.addEventListener('pointerdown', startDrag);

            // Double-click to reset to default
            handle.addEventListener('dblclick', () => {
                body.style.setProperty(cssVar, DEFAULTS[side] + 'px');
                normalizeWidths();
                this._resizeCanvas();
                persist();
            });

            // Keyboard support (←/→ adjust by 16px, Home resets)
            handle.addEventListener('keydown', (e) => {
                let next = parseInt(getComputedStyle(body).getPropertyValue(cssVar), 10) || DEFAULTS[side];
                const step = e.shiftKey ? 48 : 16;
                if (e.key === 'ArrowLeft') {
                    next = clampWidth(side === 'left' ? next - step : next + step, bounds);
                } else if (e.key === 'ArrowRight') {
                    next = clampWidth(side === 'left' ? next + step : next - step, bounds);
                } else if (e.key === 'Home') {
                    next = DEFAULTS[side];
                } else {
                    return;
                }
                e.preventDefault();
                body.style.setProperty(cssVar, next + 'px');
                normalizeWidths();
                this._resizeCanvas();
                persist();
            });
        };

        bindHandle('sa-resize-left', 'left');
        bindHandle('sa-resize-right', 'right');

        // Collapse / expand buttons
        const leftPanel = document.querySelector('.sa-panel-left');
        const rightPanel = document.querySelector('.sa-panel-right');
        const leftHandle = document.getElementById('sa-resize-left');
        const rightHandle = document.getElementById('sa-resize-right');

        const COLLAPSE_KEY = 'smartart_panel_collapsed_v1';
        const collapsedState = (() => {
            try { return JSON.parse(localStorage.getItem(COLLAPSE_KEY) || '{}'); }
            catch (_) { return {}; }
        })();

        const applyCollapsed = (panel, handle, side, btn, collapsed) => {
            if (!panel) return;
            panel.classList.toggle('is-collapsed', !!collapsed);
            if (handle) handle.classList.toggle('is-handle-hidden', !!collapsed);
            if (btn) {
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.className = collapsed
                        ? (side === 'left' ? 'fas fa-angle-double-right' : 'fas fa-angle-double-left')
                        : (side === 'left' ? 'fas fa-angle-double-left' : 'fas fa-angle-double-right');
                }
                btn.setAttribute('aria-label', collapsed
                    ? (side === 'left' ? 'Expand template panel' : 'Expand editor panel')
                    : (side === 'left' ? 'Collapse template panel' : 'Collapse editor panel'));
                btn.title = collapsed ? 'Expand panel' : 'Collapse panel';
            }
            this._resizeCanvas();
        };

        const setCollapsed = (side, collapsed) => {
            const panel = side === 'left' ? leftPanel : rightPanel;
            const handle = side === 'left' ? leftHandle : rightHandle;
            const btn = document.getElementById(side === 'left' ? 'sa-collapse-left' : 'sa-collapse-right');
            applyCollapsed(panel, handle, side, btn, collapsed);
            collapsedState[side] = !!collapsed;
            try { localStorage.setItem(COLLAPSE_KEY, JSON.stringify(collapsedState)); }
            catch (_) { /* ignore */ }
        };

        // Restore collapsed state
        if (collapsedState.left) {
            applyCollapsed(leftPanel, leftHandle, 'left', document.getElementById('sa-collapse-left'), true);
        }
        if (collapsedState.right) {
            applyCollapsed(rightPanel, rightHandle, 'right', document.getElementById('sa-collapse-right'), true);
        }

        document.getElementById('sa-collapse-left')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setCollapsed('left', !leftPanel?.classList.contains('is-collapsed'));
        });
        document.getElementById('sa-collapse-right')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setCollapsed('right', !rightPanel?.classList.contains('is-collapsed'));
        });

        // Click anywhere on the collapsed panel rail to expand it back
        leftPanel?.addEventListener('click', () => {
            if (leftPanel.classList.contains('is-collapsed')) setCollapsed('left', false);
        });
        rightPanel?.addEventListener('click', () => {
            if (rightPanel.classList.contains('is-collapsed')) setCollapsed('right', false);
        });

        window.addEventListener('resize', () => {
            normalizeWidths();
            persist();
        });
    }

    _setActivePane(paneId) {
        this.activePane = paneId || 'sa-pane-text';
        document.querySelectorAll('.sa-right-tab').forEach(tab => {
            const isActive = tab.dataset.pane === this.activePane;
            tab.classList.toggle('active', isActive);
            tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        document.querySelectorAll('.sa-tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === this.activePane);
        });
        document.querySelector('.sa-panel-right')?.classList.toggle('ai-dock-visible', this.activePane === 'sa-pane-ai');
        if (!this._isRestoringState) this._scheduleWorkspacePersist();
    }

    _scheduleWorkspacePersist(delay = 220) {
        if (this._isRestoringState) return;
        clearTimeout(this._persistTimer);
        this._persistTimer = setTimeout(() => {
            this._persistWorkspaceState();
        }, delay);
    }

    _scheduleRegenerate({ delay = 70, rerenderEditor = false, refreshThumbs = false, persist = true } = {}) {
        this._pendingEditorRefresh = this._pendingEditorRefresh || rerenderEditor;
        this._pendingThumbRefresh = this._pendingThumbRefresh || refreshThumbs;
        clearTimeout(this._regenerateTimer);
        this._regenerateTimer = setTimeout(() => {
            this._flushScheduledRegenerate();
        }, delay);
        if (persist) this._scheduleWorkspacePersist();
    }

    _flushScheduledRegenerate() {
        clearTimeout(this._regenerateTimer);
        this._regenerateTimer = null;
        this._regenerate();
        if (this._pendingEditorRefresh) this._renderTextEditor();
        if (this._pendingThumbRefresh) this._refreshTemplateThumbs();
        this._pendingEditorRefresh = false;
        this._pendingThumbRefresh = false;
    }

    _persistWorkspaceState() {
        try {
            sessionStorage.setItem(this.workspaceStateKey, JSON.stringify({
                version: 2,
                savedAt: Date.now(),
                editor: this.toJSON(),
                activePane: this.activePane || 'sa-pane-text'
            }));
            return true;
        } catch (e) {
            console.warn('[SmartArt] Failed to persist workspace state:', e);
            return false;
        }
    }

    _restoreWorkspaceState() {
        try {
            const raw = sessionStorage.getItem(this.workspaceStateKey);
            if (!raw) return false;
            const payload = JSON.parse(raw);
            if (!payload?.editor) return false;
            this.fromJSON(payload.editor);
            this._setActivePane(payload.activePane || 'sa-pane-text');
            return true;
        } catch (e) {
            console.warn('[SmartArt] Failed to restore workspace state:', e);
            return false;
        }
    }

    /* ===========================
       Canvas Sizing
       =========================== */

    _initToolbarCollapseAndResize() {
        const toolbar = document.getElementById('sa-canvas-toolbar');
        const handle = document.getElementById('sa-toolbar-resize');
        const collapseBtn = document.getElementById('sa-toolbar-collapse');
        const expandBtn = document.getElementById('sa-toolbar-expand');
        if (!toolbar || !handle || !collapseBtn || !expandBtn) return;

        const STORAGE_KEY = 'smartart_toolbar_state_v1';
        const MIN_HEIGHT = 44;
        const MAX_HEIGHT = 320;
        const DEFAULT_HEIGHT = 'auto';

        // ---- Restore persisted state ----
        let saved = {};
        try { saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); }
        catch (_) { saved = {}; }

        const applyHeight = (value) => {
            if (value === 'auto' || value == null) {
                toolbar.style.removeProperty('--sa-toolbar-height');
                toolbar.style.removeProperty('overflow-y');
            } else {
                const px = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, Math.round(value)));
                toolbar.style.setProperty('--sa-toolbar-height', px + 'px');
                toolbar.style.overflowY = 'auto';
            }
        };

        const setCollapsed = (collapsed, persist = true) => {
            toolbar.classList.toggle('is-collapsed', !!collapsed);
            handle.classList.toggle('sa-hidden', !!collapsed);
            expandBtn.classList.toggle('sa-hidden', !collapsed);
            collapseBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
            collapseBtn.title = collapsed ? 'Show toolbar' : 'Collapse toolbar';
            if (persist) {
                saved.collapsed = !!collapsed;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
            }
            // Wait for the CSS transition before re-measuring so the canvas
            // tracks the new available space accurately.
            requestAnimationFrame(() => requestAnimationFrame(() => this._resizeCanvas()));
            setTimeout(() => this._resizeCanvas(), 220);
        };

        if (typeof saved.height === 'number') applyHeight(saved.height);
        if (saved.collapsed) setCollapsed(true, false);

        // ---- Collapse / expand buttons ----
        collapseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCollapsed(true);
        });
        expandBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            setCollapsed(false);
        });

        // ---- Drag-to-resize handle (vertical) ----
        const startDrag = (event) => {
            event.preventDefault();
            const startY = event.clientY;
            const startRect = toolbar.getBoundingClientRect();
            const startHeight = startRect.height;
            handle.classList.add('is-dragging');
            document.body.classList.add('sa-resizing');

            const onMove = (e) => {
                const dy = e.clientY - startY;
                const next = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, startHeight + dy));
                applyHeight(next);
                this._resizeCanvas();
            };
            const onUp = () => {
                handle.classList.remove('is-dragging');
                document.body.classList.remove('sa-resizing');
                document.removeEventListener('pointermove', onMove, true);
                document.removeEventListener('pointerup', onUp, true);
                document.removeEventListener('pointercancel', onUp, true);
                const finalHeight = toolbar.getBoundingClientRect().height;
                saved.height = Math.round(finalHeight);
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
            };
            document.addEventListener('pointermove', onMove, true);
            document.addEventListener('pointerup', onUp, true);
            document.addEventListener('pointercancel', onUp, true);
        };
        handle.addEventListener('pointerdown', startDrag);

        // Double-click resets to natural (auto) height
        handle.addEventListener('dblclick', () => {
            applyHeight(DEFAULT_HEIGHT);
            saved.height = DEFAULT_HEIGHT;
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
            this._resizeCanvas();
        });

        // Keyboard support: ↑/↓ to nudge, Home to reset
        handle.addEventListener('keydown', (e) => {
            const current = toolbar.getBoundingClientRect().height;
            const step = e.shiftKey ? 32 : 12;
            let next = null;
            if (e.key === 'ArrowUp') next = current - step;
            else if (e.key === 'ArrowDown') next = current + step;
            else if (e.key === 'Home') {
                applyHeight(DEFAULT_HEIGHT);
                saved.height = DEFAULT_HEIGHT;
                try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
                this._resizeCanvas();
                e.preventDefault();
                return;
            } else return;
            e.preventDefault();
            applyHeight(next);
            saved.height = Math.round(toolbar.getBoundingClientRect().height);
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(saved)); } catch (_) {}
            this._resizeCanvas();
        });
    }

    _resizeCanvas() {
        const wrap = document.querySelector('.sa-stage-wrap');
        if (!wrap) return;
        const styles = getComputedStyle(wrap);
        const horizontalPadding = (parseFloat(styles.paddingLeft) || 0) + (parseFloat(styles.paddingRight) || 0);
        const verticalPadding = (parseFloat(styles.paddingTop) || 0) + (parseFloat(styles.paddingBottom) || 0);
        const maxW = Math.max(120, wrap.clientWidth - horizontalPadding);
        const maxH = Math.max(120, wrap.clientHeight - verticalPadding);
        const aspect = this.stageW / this.stageH;
        let w = maxW, h = maxW / aspect;
        if (h > maxH) { h = maxH; w = maxH * aspect; }
        const prevW = this._drawW || 0;
        const prevH = this._drawH || 0;
        this._drawW = w;
        this._drawH = h;
        this._applyCanvasViewportSize();
        // If the drawable area changed materially, regenerate the layout so
        // chart coords (which are baked from sw/sh at generate time) re-flow
        // and don't overflow the new canvas extent.
        const sizeChanged = Math.abs(prevW - w) > 1 || Math.abs(prevH - h) > 1;
        if (sizeChanged && this.currentTemplateId) {
            this._regenerate();
        }
        // Install (once) a ResizeObserver on the stage wrap so any size change
        // — panel drag, window resize, fullscreen toggle — keeps the canvas
        // and chart layout in sync, even when the change wasn't triggered by
        // our own drag handlers.
        if (!this._stageResizeObserver && typeof ResizeObserver !== 'undefined') {
            try {
                this._stageResizeObserver = new ResizeObserver(() => {
                    if (this._stageResizeRaf) return;
                    this._stageResizeRaf = requestAnimationFrame(() => {
                        this._stageResizeRaf = null;
                        this._resizeCanvas();
                    });
                });
                this._stageResizeObserver.observe(wrap);
            } catch (_) { /* ignore */ }
        }
    }

    _applyCanvasViewportSize() {
        if (!this.canvas || !this.ctx) return;
        const dpr = window.devicePixelRatio || 1;
        const zoom = Math.max(0.5, Math.min(2.5, Number(this.viewZoom) || 1));
        const scale = dpr * zoom;
        this.canvas.width = Math.max(1, Math.round(this._drawW * scale));
        this.canvas.height = Math.max(1, Math.round(this._drawH * scale));
        this.canvas.style.width = (this._drawW * zoom) + 'px';
        this.canvas.style.height = (this._drawH * zoom) + 'px';
        this.ctx.setTransform(scale, 0, 0, scale, 0, 0);
        if (this.elZoomValue) this.elZoomValue.textContent = Math.round(zoom * 100) + '%';
        if (this.generatedLayout) this.render();
    }

    _setViewZoom(nextZoom) {
        const zoom = Math.max(0.5, Math.min(2.5, Number(nextZoom) || 1));
        if (Math.abs(zoom - this.viewZoom) < 0.001) return;
        this.viewZoom = zoom;
        this._applyCanvasViewportSize();
    }

    /* ===========================
       Category & Template Browser
       =========================== */

    _renderCategoryButtons() {
        if (!this.elCategories) return;
        this.elCategories.innerHTML = '';
        // "All" button
        const allBtn = document.createElement('button');
        allBtn.className = 'sa-cat-btn active';
        allBtn.textContent = 'All';
        allBtn.dataset.cat = 'all';
        allBtn.setAttribute('role', 'tab');
        allBtn.setAttribute('aria-selected', 'true');
        allBtn.addEventListener('click', () => this._selectCategory('all'));
        this.elCategories.appendChild(allBtn);

        this.templates.categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'sa-cat-btn';
            btn.innerHTML = `<i class="fas ${cat.icon}" aria-hidden="true"></i> ${cat.name}`;
            btn.dataset.cat = cat.id;
            btn.setAttribute('role', 'tab');
            btn.setAttribute('aria-selected', 'false');
            btn.addEventListener('click', () => this._selectCategory(cat.id));
            this.elCategories.appendChild(btn);
        });
    }

    _selectCategory(catId) {
        this._currentCategory = catId;
        // Highlight button
        this.elCategories.querySelectorAll('.sa-cat-btn').forEach(b => {
            const isActive = b.dataset.cat === catId;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        this._filterTemplates();
    }

    _filterTemplates() {
        const list = this.templates.searchTemplates(this._currentCategory, this._searchQuery);
        this._renderTemplateGrid(list);
    }

    _refreshTemplateThumbs() {
        this.elTemplateGrid?.querySelectorAll('.sa-template-card').forEach((card) => {
            const tpl = this.templates.getTemplate(card.dataset.id);
            const thumb = card.querySelector('canvas.sa-thumb');
            if (tpl && thumb && card._rendered) {
                this._renderThumb(thumb, tpl);
            }
        });
    }

    _renderTemplateGrid(list) {
        if (!this.elTemplateGrid) return;
        this.elTemplateGrid.innerHTML = '';

        // Update count
        if (this.elTemplateCount) {
            this.elTemplateCount.innerHTML = `<strong>${list.length}</strong> template${list.length !== 1 ? 's' : ''}`;
        }

        // Lazy rendering observer
        if (!this._thumbObserver) {
            this._thumbObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const card = entry.target;
                        const tplId = card.dataset.id;
                        const tpl = this.templates.getTemplate(tplId);
                        const thumb = card.querySelector('canvas.sa-thumb');
                        if (tpl && thumb && !card._rendered) {
                            card._rendered = true;
                            this._renderThumb(thumb, tpl);
                            thumb.classList.remove('sa-thumb-loading');
                        }
                        this._thumbObserver.unobserve(card);
                    }
                });
            }, { root: this.elTemplateGrid, rootMargin: '100px' });
        }

        list.forEach(tpl => {
            const card = document.createElement('div');
            card.className = 'sa-template-card' + (tpl.id === this.currentTemplateId ? ' selected' : '');
            card.dataset.id = tpl.id;

            // Mini thumbnail canvas
            const thumbWrap = document.createElement('div');
            thumbWrap.className = 'sa-thumb-wrap';
            const thumb = document.createElement('canvas');
            thumb.className = 'sa-thumb sa-thumb-loading';
            thumb.width = 160;
            thumb.height = 112;
            thumbWrap.appendChild(thumb);
            card.appendChild(thumbWrap);

            // Info area
            const info = document.createElement('div');
            info.className = 'sa-tpl-info';
            const nameEl = document.createElement('div');
            nameEl.className = 'sa-tpl-name';
            nameEl.textContent = tpl.name;
            info.appendChild(nameEl);
            if (tpl.description) {
                const desc = document.createElement('div');
                desc.className = 'sa-tpl-desc';
                desc.textContent = tpl.description;
                info.appendChild(desc);
            }
            card.appendChild(info);

            card.addEventListener('click', () => this.selectTemplate(tpl.id));
            card.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                this.showPreview(tpl.id);
            });
            // Keyboard accessibility
            card.setAttribute('role', 'option');
            card.setAttribute('tabindex', '0');
            card.setAttribute('aria-label', tpl.name);
            card.setAttribute('aria-selected', tpl.id === this.currentTemplateId ? 'true' : 'false');
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.selectTemplate(tpl.id);
                } else if (e.key === 'p' || e.key === 'P') {
                    this.showPreview(tpl.id);
                }
            });
            this.elTemplateGrid.appendChild(card);

            // Observe for lazy thumbnail rendering
            this._thumbObserver.observe(card);
        });
    }

    _renderThumb(canvas, tpl) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width, h = canvas.height;
        ctx.clearRect(0, 0, w, h);
        this._fillCanvasBackground(ctx, w, h);
        const items = this.templates.getDefaultItems(tpl.id);
        const layout = tpl.generate(items, this.currentPalette, w, h);
        layout.objects.forEach(obj => this._drawObjSimple(ctx, obj, 1));
    }

    /* ===========================
       Template Preview Modal
       =========================== */

    _initPreviewModal() {
        const overlay = document.getElementById('sa-preview-overlay');
        const closeBtn = document.getElementById('sa-preview-close');
        const cancelBtn = document.getElementById('sa-preview-cancel');
        const applyBtn = document.getElementById('sa-preview-apply');
        if (!overlay) return;

        const close = () => { overlay.classList.remove('visible'); this._previewTemplateId = null; };
        closeBtn?.addEventListener('click', close);
        cancelBtn?.addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        applyBtn?.addEventListener('click', () => {
            if (this._previewTemplateId) {
                this.selectTemplate(this._previewTemplateId);
            }
            close();
        });
    }

    showPreview(templateId) {
        const tpl = this.templates.getTemplate(templateId);
        if (!tpl) return;
        this._previewTemplateId = templateId;
        const overlay = document.getElementById('sa-preview-overlay');
        if (!overlay) return;

        document.getElementById('sa-preview-title').textContent = tpl.name;
        document.getElementById('sa-preview-desc').textContent = tpl.description || '';
        document.getElementById('sa-preview-category').textContent = tpl.category;
        document.getElementById('sa-preview-items').textContent = tpl.defaultItems;

        // Render preview
        const canvas = document.getElementById('sa-preview-canvas');
        if (canvas) {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            this._fillCanvasBackground(ctx, canvas.width, canvas.height);
            const items = this.templates.getDefaultItems(templateId);
            const layout = tpl.generate(items, this.currentPalette, canvas.width, canvas.height);
            layout.objects.forEach(obj => this._drawObjSimple(ctx, obj, 1));
        }

        overlay.classList.add('visible');
    }

    /* ===========================
       Quick Apply Panel
       =========================== */

    _initQuickApply() {
        const panel = document.getElementById('sa-quick-apply');
        const chipsWrap = document.getElementById('sa-quick-apply-chips');
        if (!panel || !chipsWrap) return;

        // Show 4 random animation presets
        const presets = [
            { label: 'Fade In', type: 'fade-in', order: 'sequential' },
            { label: 'Bounce', type: 'bounce', order: 'sequential' },
            { label: 'Scale All', type: 'scale-up', order: 'all-at-once' },
            { label: 'Slide Up Random', type: 'slide-up', order: 'random' }
        ];
        presets.forEach(p => {
            const chip = document.createElement('button');
            chip.className = 'sa-quick-apply-chip';
            chip.textContent = p.label;
            chip.addEventListener('click', () => {
                this.setAnimationType(p.type);
                this.animationOrder = p.order;
                if (this.elAnimOrder) this.elAnimOrder.value = p.order;
                this.playAnimation();
            });
            chipsWrap.appendChild(chip);
        });

        panel.classList.add('visible');
    }

    /* ===========================
       Custom Palette Editor
       =========================== */

    _initPaletteEditor() {
        const btn = document.getElementById('sa-palette-edit-btn');
        const dropdown = document.getElementById('sa-palette-dropdown');
        const colorsWrap = document.getElementById('sa-palette-dropdown-colors');
        const closeBtn = document.getElementById('sa-palette-dropdown-close');
        const randomizeBtn = document.getElementById('sa-palette-randomize');
        const applyBtn = document.getElementById('sa-palette-apply');
        if (!btn || !dropdown || !colorsWrap) return;

        // Build 8 color pickers
        this._customColors = [...this.currentPalette.colors.slice(0, 8)];
        while (this._customColors.length < 8) this._customColors.push('#888888');

        for (let i = 0; i < 8; i++) {
            const label = document.createElement('label');
            const input = document.createElement('input');
            input.type = 'color';
            input.value = this._customColors[i];
            const idx = i;
            input.addEventListener('input', (e) => { this._customColors[idx] = e.target.value; });
            label.appendChild(input);
            label.appendChild(document.createTextNode(`C${i + 1}`));
            colorsWrap.appendChild(label);
        }

        btn.addEventListener('click', () => {
            // Sync current palette into pickers
            const pal = this.currentPalette;
            colorsWrap.querySelectorAll('input[type="color"]').forEach((inp, i) => {
                inp.value = pal.colors[i] || '#888888';
                this._customColors[i] = inp.value;
            });
            dropdown.classList.toggle('visible');
        });

        closeBtn?.addEventListener('click', () => dropdown.classList.remove('visible'));

        randomizeBtn?.addEventListener('click', () => {
            const hue = Math.random() * 360;
            for (let i = 0; i < 8; i++) {
                const h = (hue + i * 45) % 360;
                const s = 60 + Math.random() * 25;
                const l = 40 + Math.random() * 20;
                this._customColors[i] = this._hslToHex(h, s, l);
            }
            colorsWrap.querySelectorAll('input[type="color"]').forEach((inp, i) => {
                inp.value = this._customColors[i];
            });
        });

        applyBtn?.addEventListener('click', () => {
            const customPal = {
                colors: [...this._customColors],
                bg: '#ffffff',
                text: '#ffffff',
                connector: this._customColors[0]
            };
            this._applyPalette(customPal, 'custom');
            dropdown.classList.remove('visible');
        });
    }

    _hslToHex(h, s, l) {
        s /= 100; l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = n => { const k = (n + h / 30) % 12; return l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1); };
        const toHex = x => Math.round(x * 255).toString(16).padStart(2, '0');
        return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
    }

    /* ===========================
       Template Selection & Generation
       =========================== */

    applyTemplate(templateId, items = null) {
        const tpl = this.templates.getTemplate(templateId);
        if (!tpl) return;
        this.currentTemplateId = templateId;
        this.items = Array.isArray(items) && items.length
            ? items.map(item => ({ ...item }))
            : this.templates.getDefaultItems(templateId);
        try {
            this._regenerate();
            this._renderTextEditor();
            this._syncSeriesLabelsRow();
            // Refresh grid selection highlight
            this.elTemplateGrid?.querySelectorAll('.sa-template-card').forEach(c => {
                c.classList.toggle('selected', c.dataset.id === templateId);
            });
            this._persistWorkspaceState();
        } catch (e) {
            console.error('[SmartArt] applyTemplate failed:', {
                templateId,
                error: e,
                itemCount: Array.isArray(this.items) ? this.items.length : 0
            });

            const safeItems = (Array.isArray(this.items) ? this.items : []).map((item, index) => ({
                text: String(item?.text || `Item ${index + 1}`),
                subtext: item?.subtext != null ? String(item.subtext) : ''
            }));
            const fallbackTemplateId = 'basic-block-list';
            const fallbackTpl = this.templates.getTemplate(fallbackTemplateId);
            if (!fallbackTpl) throw e;

            while (safeItems.length < fallbackTpl.minItems) {
                safeItems.push({ text: `Item ${safeItems.length + 1}` });
            }
            this.currentTemplateId = fallbackTemplateId;
            this.items = safeItems.slice(0, fallbackTpl.maxItems);

            this._regenerate();
            this._renderTextEditor();
            this._syncSeriesLabelsRow();
            this.elTemplateGrid?.querySelectorAll('.sa-template-card').forEach(c => {
                c.classList.toggle('selected', c.dataset.id === fallbackTemplateId);
            });
            this._persistWorkspaceState();

            if (window.Utils?.showToast) {
                Utils.showToast('Template failed to apply; used Basic Block List as fallback.', 'warning');
            }
        }
    }

    selectTemplate(templateId) {
        this.applyTemplate(templateId);
    }

    // Show the "Series labels" row only for multi-series chart templates
    _syncSeriesLabelsRow() {
        if (this.elSeriesLabelsRow) {
            const multiSeriesIds = new Set([
                'clustered-bar-chart', 'stacked-bar-chart',
                'line-chart', 'multi-line-chart', 'combo-chart'
            ]);
            const show = multiSeriesIds.has(this.currentTemplateId);
            this.elSeriesLabelsRow.classList.toggle('sa-hidden', !show);
            if (show && this.elSeriesLabels) {
                this.elSeriesLabels.value = (this.seriesLabels || []).join(', ');
            }
        }
        // Bar-chart family: show orientation toggle and sync its value
        if (this.elBarOrientationRow) {
            const barIds = new Set([
                'bar-chart', 'horizontal-bar-chart',
                'clustered-bar-chart', 'stacked-bar-chart'
            ]);
            const showBars = barIds.has(this.currentTemplateId);
            this.elBarOrientationRow.classList.toggle('sa-hidden', !showBars);
            if (showBars && this.elBarOrientation) {
                // Reflect the actual current state: bar-chart=vertical,
                // horizontal-bar-chart=horizontal, others use this.barOrientation.
                const actual = this.currentTemplateId === 'horizontal-bar-chart'
                    ? 'horizontal'
                    : (this.currentTemplateId === 'bar-chart'
                        ? 'vertical'
                        : (this.barOrientation || 'vertical'));
                this.elBarOrientation.value = actual;
            }
        }
        // Process / timeline family: show flow-direction toggle and sync its value
        if (this.elFlowDirectionRow) {
            const flowIds = new Set([
                'basic-process', 'chevron-process',
                'timeline-process', 'milestone-timeline'
            ]);
            const showFlow = flowIds.has(this.currentTemplateId);
            this.elFlowDirectionRow.classList.toggle('sa-hidden', !showFlow);
            if (showFlow && this.elFlowDirection) {
                this.elFlowDirection.value = this.flowDirection || 'horizontal';
            }
        }
    }

    // Switch between vertical (columns) and horizontal (bars) for any bar-chart
    // family template. For the simple bar-chart ↔ horizontal-bar-chart pair we
    // swap templateId outright; for clustered/stacked we set a flag the
    // generators read at regenerate time.
    setBarOrientation(mode) {
        const orientation = mode === 'horizontal' ? 'horizontal' : 'vertical';
        this.barOrientation = orientation;
        const id = this.currentTemplateId;
        if (id === 'bar-chart' && orientation === 'horizontal') {
            this.applyTemplate('horizontal-bar-chart', this.items);
            return;
        }
        if (id === 'horizontal-bar-chart' && orientation === 'vertical') {
            this.applyTemplate('bar-chart', this.items);
            return;
        }
        // clustered / stacked re-render with the new orientation flag
        this._regenerate();
        this._scheduleWorkspacePersist?.();
    }

    // Switch between horizontal (left-to-right) and vertical (top-to-bottom) for
    // process / timeline templates. The generators read `this._flowDirection`
    // from the templates manager at regenerate time and emit a different layout.
    setFlowDirection(mode) {
        const direction = mode === 'vertical' ? 'vertical' : 'horizontal';
        this.flowDirection = direction;
        this._regenerate();
        this._scheduleWorkspacePersist?.();
    }

    _regenerate() {
        const tpl = this.templates.getTemplate(this.currentTemplateId);
        if (!tpl) return;
        // Pass series labels + bar orientation through to chart generators
        this.templates._seriesLabels = Array.isArray(this.seriesLabels) ? this.seriesLabels : [];
        this.templates._barOrientation = this.barOrientation || 'vertical';
        this.templates._flowDirection = this.flowDirection || 'horizontal';
        this.generatedLayout = tpl.generate(this.items, this.currentPalette, this._drawW, this._drawH);
        this._applyFontScale();
        this._applyManualTextOffsets();
        this.render();
    }

    // Multiply every text object's fontSize by the global fontScale.
    // Templates supply baseline sizes, so scale is purely a multiplier.
    _applyFontScale() {
        if (!this.generatedLayout || !this.generatedLayout.objects) return;
        const scale = Number(this.fontScale) || 1.0;
        this.generatedLayout.objects.forEach(obj => {
            if (!obj || obj.fontSize == null) return;
            if (obj._saBaseFontSize == null) obj._saBaseFontSize = obj.fontSize;
            obj.fontSize = Math.max(6, Math.round(obj._saBaseFontSize * scale));
        });
    }

    setFontScale(value) {
        const v = Math.max(0.6, Math.min(2.0, Number(value) || 1.0));
        this.fontScale = v;
        this._regenerate();
        this._scheduleWorkspacePersist?.();
    }

    // Reorder items in place. mode: 'alpha-asc' | 'alpha-desc' | 'value-asc' | 'value-desc' | 'reverse'
    sortItems(mode) {
        if (!Array.isArray(this.items) || this.items.length < 2) return;
        const numericOf = (it) => {
            // Use the same parser charts rely on; fall back to NaN so
            // non-numeric entries sort to the end consistently.
            const v = this.templates._getItemNumericValue(it, null);
            return v == null ? NaN : v;
        };
        const textOf = (it) => String(it && it.text != null ? it.text : '').toLowerCase();
        const alpha = (a, b, dir) => textOf(a).localeCompare(textOf(b)) * dir;
        const value = (a, b, dir) => {
            const va = numericOf(a), vb = numericOf(b);
            const aNaN = Number.isNaN(va), bNaN = Number.isNaN(vb);
            if (aNaN && bNaN) return 0;
            if (aNaN) return 1;          // NaNs to end
            if (bNaN) return -1;
            return (va - vb) * dir;
        };
        switch (mode) {
            case 'alpha-asc':  this.items.sort((a, b) => alpha(a, b, 1));  break;
            case 'alpha-desc': this.items.sort((a, b) => alpha(a, b, -1)); break;
            case 'value-asc':  this.items.sort((a, b) => value(a, b, 1));  break;
            case 'value-desc': this.items.sort((a, b) => value(a, b, -1)); break;
            case 'reverse':    this.items.reverse(); break;
            default: return;
        }
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist?.();
    }

    /* ===========================
       Rendering
       =========================== */

    render(objectAlphas) {
        const ctx = this.ctx;
        const w = this._drawW, h = this._drawH;
        ctx.clearRect(0, 0, w, h);
        this._fillCanvasBackground(ctx, w, h);

        if (!this.generatedLayout) {
            // Empty state
            ctx.fillStyle = '#888';
            ctx.font = '16px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Select a SmartArt template', w / 2, h / 2);
            return;
        }

        const objs = this.generatedLayout.objects;
        objs.forEach((obj, i) => {
            const renderState = objectAlphas ? (objectAlphas[i] ?? 1) : 1;
            this._drawObj(ctx, obj, renderState);
        });

        if (this._textPositionMode) {
            const activeText = this._dragTextState?.object || this._hoverTextTarget?.object || this._findTextObjectByTarget(this._selectedTextTarget);
            if (activeText) this._drawTextFocusRing(ctx, activeText);
        }

        if (this._dragImageState) {
            const activeObject = this.generatedLayout.objects.find(obj => obj._saRole === 'image' && obj._saIndex === this._dragImageState.index);
            if (activeObject) this._drawImageFocusRing(ctx, activeObject);
        }
    }

    _fillCanvasBackground(ctx, w, h) {
        ctx.save();
        ctx.fillStyle = this.backgroundColor || '#ffffff';
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    _normalizeHexColor(color) {
        const raw = String(color || '').trim();
        const match = raw.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!match) return null;
        let hex = match[1];
        if (hex.length === 3) {
            hex = hex.split('').map(ch => ch + ch).join('');
        }
        return '#' + hex.toLowerCase();
    }

    _getRelativeLuminance(color) {
        const hex = this._normalizeHexColor(color);
        if (!hex) return null;
        const channels = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16) / 255);
        const linear = channels.map(channel => (
            channel <= 0.03928
                ? channel / 12.92
                : Math.pow((channel + 0.055) / 1.055, 2.4)
        ));
        return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
    }

    _getContrastRatio(foreground, background) {
        const fg = this._getRelativeLuminance(foreground);
        const bg = this._getRelativeLuminance(background);
        if (fg == null || bg == null) return null;
        const lighter = Math.max(fg, bg);
        const darker = Math.min(fg, bg);
        return (lighter + 0.05) / (darker + 0.05);
    }

    _resolveSmartArtTextColor(renderObj) {
        const requested = renderObj?.textColor || this.currentPalette?.text || '#333333';
        const fill = typeof renderObj?.fill === 'string' && renderObj.fill !== 'transparent'
            ? renderObj.fill.trim()
            : '';
        const hasAlphaHex = /^#[0-9a-f]{8}$/i.test(fill);
        const background = hasAlphaHex
            ? (this.backgroundColor || this.currentPalette?.bg || '#ffffff')
            : (fill || this.backgroundColor || this.currentPalette?.bg || '#ffffff');
        const requestedContrast = this._getContrastRatio(requested, background);
        if (requestedContrast != null && requestedContrast >= 3.2) {
            return requested;
        }

        const darkCandidate = '#1f2937';
        const lightCandidate = '#f8fafc';
        const darkContrast = this._getContrastRatio(darkCandidate, background) || 0;
        const lightContrast = this._getContrastRatio(lightCandidate, background) || 0;
        return lightContrast > darkContrast ? lightCandidate : darkCandidate;
    }

    _drawObj(ctx, obj, renderState = 1) {
        const overrides = typeof renderState === 'number' ? null : (renderState || null);
        const opacity = typeof renderState === 'number'
            ? (obj.opacity ?? 1) * renderState
            : (overrides?.opacity ?? obj.opacity ?? 1);
        if (opacity <= 0) return;

        const renderObj = overrides ? { ...obj, ...overrides, opacity } : obj;
        ctx.save();
        ctx.globalAlpha = opacity;

        const x = renderObj.x, y = renderObj.y, w = renderObj.width, h = renderObj.height;
        const br = renderObj.borderRadius || 0;
        const scaleX = renderObj.scaleX ?? 1;
        const scaleY = renderObj.scaleY ?? 1;
        const rotation = renderObj.rotation ?? 0;
        const centerX = x + w / 2;
        const centerY = y + h / 2;

        if (rotation || scaleX !== 1 || scaleY !== 1) {
            ctx.translate(centerX, centerY);
            if (rotation) ctx.rotate((rotation * Math.PI) / 180);
            if (scaleX !== 1 || scaleY !== 1) ctx.scale(scaleX, scaleY);
            ctx.translate(-centerX, -centerY);
        }

        if (renderObj.wipeProgress != null) {
            const progress = Math.max(0, Math.min(1, renderObj.wipeProgress));
            const direction = renderObj.wipeDirection || 'right';
            ctx.beginPath();
            if (direction === 'left') {
                ctx.rect(x + w * (1 - progress), y, w * progress, h);
            } else if (direction === 'up') {
                ctx.rect(x, y + h * (1 - progress), w, h * progress);
            } else if (direction === 'down') {
                ctx.rect(x, y, w, h * progress);
            } else {
                ctx.rect(x, y, w * progress, h);
            }
            ctx.clip();
        }

        // Shape path
        switch (renderObj.type) {
            case 'rectangle':
                this._roundRect(ctx, x, y, w, h, br);
                break;
            case 'circle':
                ctx.beginPath();
                ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
                ctx.closePath();
                break;
            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(x + w / 2, y);
                ctx.lineTo(x + w, y + h / 2);
                ctx.lineTo(x + w / 2, y + h);
                ctx.lineTo(x, y + h / 2);
                ctx.closePath();
                break;
            case 'star':
                this._starPath(ctx, x, y, w, h, obj.sides || 5, obj.innerRadius || 0.5);
                break;
            case 'arrow':
                this._arrowPath(ctx, x, y, w, h);
                break;
            case 'triangle':
                ctx.beginPath();
                ctx.moveTo(x + w / 2, y);
                ctx.lineTo(x + w, y + h);
                ctx.lineTo(x, y + h);
                ctx.closePath();
                break;
            case 'line':
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + w, y + h);
                break;
            case 'text':
                // Text-only object, no fill shape
                break;
            default:
                this._roundRect(ctx, x, y, w, h, br);
        }

        // Fill
        if (renderObj.type !== 'text' && renderObj.type !== 'line') {
            if (renderObj.fill && renderObj.fill !== 'transparent') {
                ctx.fillStyle = renderObj.fill;
                ctx.fill();
            }
        }

        // Image rendering for picture placeholders
        if (renderObj._saRole === 'image' && renderObj._saIndex >= 0) {
            const itemSrc = this.items?.[renderObj._saIndex]?.imageSrc;
            if (itemSrc) {
                const img = this._getImage(itemSrc);
                if (img) {
                    const imageFit = this._getImageFit(renderObj._saIndex);
                    ctx.save();
                    // Clip to shape
                    if (renderObj.type === 'circle') {
                        ctx.beginPath();
                        ctx.ellipse(x + w/2, y + h/2, w/2, h/2, 0, 0, Math.PI * 2);
                        ctx.clip();
                    } else {
                        this._roundRect(ctx, x, y, w, h, br);
                        ctx.clip();
                    }
                    // Cover-fit image
                    const imgR = img.width / img.height;
                    const boxR = w / h;
                    let dx, dy, dw, dh;
                    if (imgR > boxR) {
                        dh = h; dw = h * imgR;
                        dx = x - (dw - w) / 2; dy = y;
                    } else {
                        dw = w; dh = w / imgR;
                        dx = x; dy = y - (dh - h) / 2;
                    }
                    dw *= imageFit.zoom;
                    dh *= imageFit.zoom;
                    const extraX = Math.max(0, dw - w);
                    const extraY = Math.max(0, dh - h);
                    dx = x - extraX / 2 - imageFit.panX * (extraX / 2);
                    dy = y - extraY / 2 - imageFit.panY * (extraY / 2);
                    ctx.drawImage(img, dx, dy, dw, dh);
                    ctx.restore();
                    ctx.restore();
                    return;
                }
            }
        }

        // Stroke
        if (renderObj.type === 'line') {
            ctx.strokeStyle = renderObj.stroke || '#888';
            ctx.lineWidth = renderObj.strokeWidth || 2;
            ctx.stroke();
        } else if (renderObj.strokeWidth && renderObj.stroke) {
            ctx.strokeStyle = renderObj.stroke;
            ctx.lineWidth = renderObj.strokeWidth;
            ctx.stroke();
        }

        // Text
        if (renderObj.text) {
            ctx.fillStyle = this._resolveSmartArtTextColor(renderObj);
            let fs = renderObj.fontSize || 14;
            const fw = renderObj.fontWeight || '400';
            const fam = renderObj.fontFamily || this.fontFamily || 'Inter, sans-serif';
            ctx.textAlign = renderObj.textAlign || 'center';
            ctx.textBaseline = 'middle';

            const embeddedTextDx = renderObj.type !== 'text' ? (Number(renderObj._saTextOffsetDx) || 0) : 0;
            const embeddedTextDy = renderObj.type !== 'text' ? (Number(renderObj._saTextOffsetDy) || 0) : 0;
            const tx = (renderObj.textAlign === 'left' ? x + 12 : x + w / 2) + embeddedTextDx;
            const ty = y + h / 2 + embeddedTextDy;

            // Word-wrap for longer text
            const maxWidth = Math.max(4, w - 16);
            const maxTextHeight = Math.max(8, h - 10);
            const minFontSize = Math.max(4, Number(renderObj.minFontSize) || 6);
            let lines;
            let lineH;
            do {
                ctx.font = `${fw} ${fs}px ${fam}`;
                lines = this._wrapText(ctx, renderObj.text, maxWidth);
                lineH = fs * 1.3;
                if (!renderObj.fitText || lines.length * lineH <= maxTextHeight || fs <= minFontSize) break;
                fs = Math.max(minFontSize, fs - 0.5);
            } while (true);
            const totalH = lines.length * lineH;
            const startY = ty - totalH / 2 + lineH / 2;

            lines.forEach((line, li) => {
                ctx.fillText(line, tx, startY + li * lineH, maxWidth);
            });
        }

        ctx.restore();
    }

    _drawObjSimple(ctx, obj, alpha) {
        // Minimal draw for thumbnails
        this._drawObj(ctx, obj, alpha);
    }

    _drawImageFocusRing(ctx, obj) {
        ctx.save();
        ctx.strokeStyle = 'rgba(99,102,241,0.95)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        if (obj.type === 'circle') {
            ctx.beginPath();
            ctx.ellipse(obj.x + obj.width / 2, obj.y + obj.height / 2, obj.width / 2, obj.height / 2, 0, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            this._roundRect(ctx, obj.x, obj.y, obj.width, obj.height, obj.borderRadius || 0);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawTextFocusRing(ctx, obj) {
        if (!obj) return;
        const bounds = this._getTextOffsetBounds(obj);
        if (!bounds) return;
        ctx.save();
        ctx.strokeStyle = 'rgba(28,110,242,0.95)';
        ctx.fillStyle = 'rgba(28,110,242,0.08)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 4]);
        const pad = 4;
        this._roundRect(ctx, bounds.x - pad, bounds.y - pad, bounds.width + pad * 2, bounds.height + pad * 2, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _roundRect(ctx, x, y, w, h, r) {
        r = Math.min(r, w / 2, h / 2);
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    _starPath(ctx, x, y, w, h, points, innerRadius) {
        const cx = x + w / 2, cy = y + h / 2;
        const outerR = Math.min(w, h) / 2;
        const innerR = outerR * innerRadius;
        ctx.beginPath();
        for (let i = 0; i < points * 2; i++) {
            const r = i % 2 === 0 ? outerR : innerR;
            const angle = (Math.PI * i / points) - Math.PI / 2;
            const px = cx + Math.cos(angle) * r;
            const py = cy + Math.sin(angle) * r;
            if (i === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
        }
        ctx.closePath();
    }

    _arrowPath(ctx, x, y, w, h) {
        const headW = Math.min(h * 1.5, w * 0.5);
        const bodyH = h * 0.4;
        ctx.beginPath();
        ctx.moveTo(x, y + (h - bodyH) / 2);
        ctx.lineTo(x + w - headW, y + (h - bodyH) / 2);
        ctx.lineTo(x + w - headW, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w - headW, y + h);
        ctx.lineTo(x + w - headW, y + (h + bodyH) / 2);
        ctx.lineTo(x, y + (h + bodyH) / 2);
        ctx.closePath();
    }

    _wrapText(ctx, text, maxWidth) {
        if (!text) return [];
        const words = text.split(' ');
        const lines = [];
        let current = '';
        words.forEach(word => {
            const test = current ? current + ' ' + word : word;
            if (ctx.measureText(test).width > maxWidth && current) {
                lines.push(current);
                current = word;
            } else {
                current = test;
            }
        });
        if (current) lines.push(current);
        return lines;
    }

    _getImageFit(index) {
        const item = this.items?.[index] || {};
        const zoom = Math.max(1, Math.min(2.5, Number(item.imageZoom) || 1));
        const panX = Math.max(-1, Math.min(1, Number(item.imagePanX) || 0));
        const panY = Math.max(-1, Math.min(1, Number(item.imagePanY) || 0));
        return { zoom, panX, panY };
    }

    _getCanvasPoint(event) {
        const rect = this.canvas.getBoundingClientRect();
        if (!rect.width || !rect.height) return { x: 0, y: 0 };
        return {
            x: ((event.clientX - rect.left) / rect.width) * this._drawW,
            y: ((event.clientY - rect.top) / rect.height) * this._drawH
        };
    }

    _isPointInsideObject(point, obj) {
        if (!point || !obj) return false;
        if (obj.type === 'circle') {
            const radiusX = obj.width / 2;
            const radiusY = obj.height / 2;
            if (!radiusX || !radiusY) return false;
            const centerX = obj.x + radiusX;
            const centerY = obj.y + radiusY;
            const normX = (point.x - centerX) / radiusX;
            const normY = (point.y - centerY) / radiusY;
            return (normX * normX) + (normY * normY) <= 1;
        }
        return point.x >= obj.x && point.x <= obj.x + obj.width && point.y >= obj.y && point.y <= obj.y + obj.height;
    }

    _findInteractiveImageTarget(point) {
        const objects = this.generatedLayout?.objects || [];
        for (let index = objects.length - 1; index >= 0; index--) {
            const obj = objects[index];
            if (obj?._saRole !== 'image' || obj._saIndex < 0) continue;
            if (!this.items?.[obj._saIndex]?.imageSrc) continue;
            if (this._isPointInsideObject(point, obj)) return { object: obj, objectIndex: index };
        }
        return null;
    }

    _isTextOffsetObject(obj) {
        if (!obj || !obj.text) return false;
        const role = String(obj._saRole || '');
        if (['connector', 'axis-tick-label', 'tick-label', 'image'].includes(role)) return false;
        return true;
    }

    _isEmbeddedTextOffsetObject(obj) {
        return this._isTextOffsetObject(obj) && obj.type !== 'text';
    }

    _getTextOffsetBounds(obj) {
        if (!obj) return null;
        const embedded = this._isEmbeddedTextOffsetObject(obj);
        const dx = embedded ? (Number(obj._saTextOffsetDx) || 0) : 0;
        const dy = embedded ? (Number(obj._saTextOffsetDy) || 0) : 0;
        return {
            x: (Number(obj.x) || 0) + dx,
            y: (Number(obj.y) || 0) + dy,
            width: Number(obj.width) || 0,
            height: Number(obj.height) || 0,
            type: obj.type
        };
    }

    _textOffsetKeyForObject(obj) {
        if (!obj) return '';
        const role = String(obj._saRole || 'text');
        const text = String(obj.text || '').slice(0, 80);
        return `${role}::${text}`;
    }

    _getTextOffsetRecord(obj, create = false) {
        if (!obj) return null;
        const key = this._textOffsetKeyForObject(obj);
        if (!key) return null;
        if (Number.isInteger(obj._saIndex) && obj._saIndex >= 0 && this.items?.[obj._saIndex]) {
            const item = this.items[obj._saIndex];
            if (!item._textOffsets && create) item._textOffsets = {};
            if (!item._textOffsets) return null;
            if (!item._textOffsets[key] && create) item._textOffsets[key] = { dx: 0, dy: 0 };
            return item._textOffsets[key] || null;
        }
        if (!this.textOffsets && create) this.textOffsets = {};
        if (!this.textOffsets) return null;
        if (!this.textOffsets[key] && create) this.textOffsets[key] = { dx: 0, dy: 0 };
        return this.textOffsets[key] || null;
    }

    _applyManualTextOffsets() {
        const objects = this.generatedLayout?.objects || [];
        objects.forEach(obj => {
            if (!this._isTextOffsetObject(obj)) return;
            if (!Number.isFinite(obj._saAutoX)) obj._saAutoX = Number(obj.x) || 0;
            if (!Number.isFinite(obj._saAutoY)) obj._saAutoY = Number(obj.y) || 0;
            const offset = this._getTextOffsetRecord(obj, false);
            if (!offset) return;
            obj._saTextOffsetDx = Number(offset.dx) || 0;
            obj._saTextOffsetDy = Number(offset.dy) || 0;
            if (!this._isEmbeddedTextOffsetObject(obj)) {
                obj.x = obj._saAutoX + obj._saTextOffsetDx;
                obj.y = obj._saAutoY + obj._saTextOffsetDy;
            }
        });
    }

    _findTextOffsetTarget(point) {
        const objects = this.generatedLayout?.objects || [];
        for (let index = objects.length - 1; index >= 0; index--) {
            const obj = objects[index];
            if (!this._isTextOffsetObject(obj)) continue;
            const bounds = this._getTextOffsetBounds(obj);
            if (this._isPointInsideObject(point, bounds)) {
                return {
                    object: obj,
                    objectIndex: index,
                    itemIndex: Number.isInteger(obj._saIndex) ? obj._saIndex : -1,
                    key: this._textOffsetKeyForObject(obj)
                };
            }
        }
        return null;
    }

    _targetsMatch(a, b) {
        if (!a || !b) return false;
        return a.key === b.key && a.itemIndex === b.itemIndex;
    }

    _findTextObjectByTarget(target) {
        if (!target) return null;
        return (this.generatedLayout?.objects || []).find(obj => this._targetsMatch({
            key: this._textOffsetKeyForObject(obj),
            itemIndex: Number.isInteger(obj?._saIndex) ? obj._saIndex : -1
        }, target)) || null;
    }

    _setTextPositionMode(enabled) {
        this._textPositionMode = !!enabled;
        this.elTextPositionMode?.classList.toggle('active', this._textPositionMode);
        this.canvas?.classList.toggle('sa-text-position-mode', this._textPositionMode);
        if (!this._textPositionMode) {
            this._hoverTextTarget = null;
            this._dragTextState = null;
            this._setCanvasCursor('default');
        }
        this.render();
        if (window.Utils?.showToast) {
            Utils.showToast(this._textPositionMode ? 'Text Move enabled: drag text boxes on the canvas.' : 'Text Move disabled.', 'info');
        }
    }

    _beginTextDrag(event, hit, point) {
        const offset = this._getTextOffsetRecord(hit.object, true);
        this._selectedTextTarget = { key: hit.key, itemIndex: hit.itemIndex };
        this._dragTextState = {
            pointerId: event.pointerId,
            object: hit.object,
            target: this._selectedTextTarget,
            startPoint: point,
            startDx: Number(offset?.dx) || 0,
            startDy: Number(offset?.dy) || 0
        };
        this._setCanvasCursor('move');
        this.canvas.setPointerCapture?.(event.pointerId);
        event.preventDefault();
        this.render();
    }

    _handleTextDragMove(event) {
        const drag = this._dragTextState;
        if (!drag) return;
        const point = this._getCanvasPoint(event);
        const dx = point.x - drag.startPoint.x;
        const dy = point.y - drag.startPoint.y;
        const obj = drag.object;
        const offset = this._getTextOffsetRecord(obj, true);
        if (!offset) return;
        offset.dx = Math.round((drag.startDx + dx) * 10) / 10;
        offset.dy = Math.round((drag.startDy + dy) * 10) / 10;
        obj._saTextOffsetDx = offset.dx;
        obj._saTextOffsetDy = offset.dy;
        if (!this._isEmbeddedTextOffsetObject(obj)) {
            if (Number.isFinite(obj._saAutoX)) obj.x = obj._saAutoX + offset.dx;
            if (Number.isFinite(obj._saAutoY)) obj.y = obj._saAutoY + offset.dy;
        }
        this.render();
        event.preventDefault();
    }

    _finishTextDrag(event) {
        if (!this._dragTextState) return;
        try { this.canvas.releasePointerCapture?.(this._dragTextState.pointerId); } catch (_) {}
        this._dragTextState = null;
        this._scheduleWorkspacePersist();
        this.render();
        if (event) event.preventDefault?.();
    }

    _resetSelectedTextOffset() {
        const target = this._selectedTextTarget || this._hoverTextTarget;
        if (!target) {
            if (window.Utils?.showToast) Utils.showToast('Select or hover a moved text box first.', 'info');
            return;
        }
        if (target.itemIndex >= 0 && this.items?.[target.itemIndex]?._textOffsets) {
            delete this.items[target.itemIndex]._textOffsets[target.key];
        } else if (this.textOffsets) {
            delete this.textOffsets[target.key];
        }
        this._regenerate();
        this._scheduleWorkspacePersist();
    }

    _resetAllTextOffsets() {
        (this.items || []).forEach(item => {
            if (item && item._textOffsets) delete item._textOffsets;
        });
        this.textOffsets = {};
        this._selectedTextTarget = null;
        this._hoverTextTarget = null;
        this._regenerate();
        this._scheduleWorkspacePersist();
        if (window.Utils?.showToast) Utils.showToast('All manual SmartArt text positions reset.', 'success');
    }

    /* ===========================
       Item targeting & context menu
       =========================== */

    _findItemAt(point) {
        const objects = this.generatedLayout?.objects || [];
        const skipRoles = new Set([
            'connector', 'spoke', 'cycle-arrow', 'center', 'ring',
            'level-label', 'quad-label', 'vs', 'equals', 'plus', 'line',
            'axis', 'grid', 'caption'
        ]);
        for (let i = objects.length - 1; i >= 0; i--) {
            const o = objects[i];
            if (!o || o._saIndex == null || o._saIndex < 0) continue;
            if (skipRoles.has(o._saRole)) continue;
            if (o._saIndex >= this.items.length) continue;
            if (this._isPointInsideObject(point, o)) {
                return { object: o, objectIndex: i, itemIndex: o._saIndex };
            }
        }
        return null;
    }

    _showCanvasMenu(event, hit) {
        this._closeCanvasMenu();
        const tpl = this.templates.getTemplate(this.currentTemplateId);
        const menu = document.createElement('div');
        menu.className = 'sa-context-menu';
        menu.setAttribute('role', 'menu');

        const addRow = (label, icon, handler, disabled = false) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'sa-context-item';
            btn.innerHTML = `<i class="fas ${icon}" aria-hidden="true"></i><span>${label}</span>`;
            if (disabled) {
                btn.disabled = true;
                btn.classList.add('disabled');
            } else {
                btn.addEventListener('click', () => {
                    this._closeCanvasMenu();
                    handler();
                });
            }
            menu.appendChild(btn);
            return btn;
        };

        const addSeparator = () => {
            const sep = document.createElement('div');
            sep.className = 'sa-context-sep';
            menu.appendChild(sep);
        };

        if (hit) {
            const idx = hit.itemIndex;
            const item = this.items[idx];
            const label = (item?.text || `Item ${idx + 1}`).toString().slice(0, 28);
            const header = document.createElement('div');
            header.className = 'sa-context-header';
            const swatch = document.createElement('span');
            swatch.className = 'sa-context-swatch';
            swatch.style.background = this.currentPalette.colors[idx % this.currentPalette.colors.length];
            header.appendChild(swatch);
            const headerText = document.createElement('span');
            headerText.textContent = label;
            header.appendChild(headerText);
            menu.appendChild(header);
            addSeparator();

            addRow('Edit text…', 'fa-pen', () => this._promptEditItemText(idx));
            addRow('Change colour…', 'fa-palette', () => this._promptChangeItemColor(idx));
            addSeparator();
            const atMax = tpl ? this.items.length >= tpl.maxItems : false;
            const atMin = tpl ? this.items.length <= tpl.minItems : false;
            addRow('Insert item before', 'fa-arrow-up', () => this._insertItemAt(idx, 0), atMax || !tpl);
            addRow('Insert item after', 'fa-arrow-down', () => this._insertItemAt(idx, 1), atMax || !tpl);
            addRow('Move up', 'fa-angles-up', () => this._moveItem(idx, -1), idx === 0);
            addRow('Move down', 'fa-angles-down', () => this._moveItem(idx, 1), idx >= this.items.length - 1);
            addSeparator();
            addRow('Delete item', 'fa-trash', () => this._deleteItemAt(idx), atMin || !tpl);
        } else {
            const header = document.createElement('div');
            header.className = 'sa-context-header';
            header.textContent = tpl ? tpl.name : 'SmartArt';
            menu.appendChild(header);
            addSeparator();
            const atMax = tpl ? this.items.length >= tpl.maxItems : true;
            addRow('Add new item', 'fa-plus', () => this._addItem(), atMax);
            addRow('Edit palette…', 'fa-palette', () => {
                document.getElementById('sa-palette-edit-btn')?.click();
            });
        }

        document.body.appendChild(menu);
        const rect = menu.getBoundingClientRect();
        let x = event.clientX;
        let y = event.clientY;
        if (x + rect.width > window.innerWidth - 8) x = window.innerWidth - rect.width - 8;
        if (y + rect.height > window.innerHeight - 8) y = window.innerHeight - rect.height - 8;
        if (x < 8) x = 8;
        if (y < 8) y = 8;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        this._activeContextMenu = menu;

        const dismiss = (e) => {
            if (menu.contains(e.target)) return;
            this._closeCanvasMenu();
        };
        const escape = (e) => {
            if (e.key === 'Escape') this._closeCanvasMenu();
        };
        this._dismissContextMenuBound = dismiss;
        this._escContextMenuBound = escape;
        // defer to avoid catching the same event that opened the menu
        setTimeout(() => {
            document.addEventListener('pointerdown', dismiss);
            document.addEventListener('keydown', escape);
        }, 0);
    }

    _closeCanvasMenu() {
        if (this._activeContextMenu) {
            this._activeContextMenu.remove();
            this._activeContextMenu = null;
        }
        if (this._dismissContextMenuBound) {
            document.removeEventListener('pointerdown', this._dismissContextMenuBound);
            this._dismissContextMenuBound = null;
        }
        if (this._escContextMenuBound) {
            document.removeEventListener('keydown', this._escContextMenuBound);
            this._escContextMenuBound = null;
        }
    }

    _promptEditItemText(idx) {
        if (idx < 0 || idx >= this.items.length) return;
        const cur = this.items[idx]?.text || '';
        const next = window.prompt('Edit item text:', cur);
        if (next == null) return;
        this.items[idx].text = next;
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
    }

    _promptChangeItemColor(idx) {
        if (idx < 0) return;
        const slot = idx % this.currentPalette.colors.length;
        const current = this.currentPalette.colors[slot] || '#888888';
        const input = document.createElement('input');
        input.type = 'color';
        input.value = current;
        input.style.position = 'fixed';
        input.style.left = '-1000px';
        input.style.top = '-1000px';
        document.body.appendChild(input);
        const apply = () => {
            const colors = [...this.currentPalette.colors];
            colors[slot] = input.value;
            this.currentPalette = { ...this.currentPalette, colors };
            if (this._customColors) this._customColors[slot] = input.value;
            this._regenerate();
            this._renderTextEditor();
            this._refreshTemplateThumbs?.();
            this._scheduleWorkspacePersist();
        };
        input.addEventListener('input', apply);
        input.addEventListener('change', () => {
            apply();
            setTimeout(() => input.remove(), 50);
        });
        input.addEventListener('blur', () => setTimeout(() => input.remove(), 100));
        input.click();
    }

    _insertItemAt(idx, offset = 1) {
        const tpl = this.templates.getTemplate(this.currentTemplateId);
        if (!tpl || this.items.length >= tpl.maxItems) return;
        const insertIdx = Math.max(0, Math.min(this.items.length, idx + offset));
        this.items.splice(insertIdx, 0, {
            text: `Item ${insertIdx + 1}`,
            subtext: '',
            detail: ''
        });
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
    }

    _deleteItemAt(idx) {
        const tpl = this.templates.getTemplate(this.currentTemplateId);
        if (!tpl || this.items.length <= tpl.minItems) return;
        if (idx < 0 || idx >= this.items.length) return;
        this.items.splice(idx, 1);
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
    }

    _moveItem(idx, dir) {
        const target = idx + dir;
        if (idx < 0 || idx >= this.items.length) return;
        if (target < 0 || target >= this.items.length) return;
        const [moved] = this.items.splice(idx, 1);
        this.items.splice(target, 0, moved);
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
    }

    _getImageRenderMetrics(renderObj) {
        if (!renderObj || renderObj._saIndex < 0) return null;
        const itemSrc = this.items?.[renderObj._saIndex]?.imageSrc;
        if (!itemSrc) return null;
        const img = this._getImage(itemSrc);
        if (!img) return null;

        const imageFit = this._getImageFit(renderObj._saIndex);
        const x = renderObj.x;
        const y = renderObj.y;
        const w = renderObj.width;
        const h = renderObj.height;
        const imgR = img.width / img.height;
        const boxR = w / h;
        let dw;
        let dh;

        if (imgR > boxR) {
            dh = h;
            dw = h * imgR;
        } else {
            dw = w;
            dh = w / imgR;
        }

        dw *= imageFit.zoom;
        dh *= imageFit.zoom;
        const extraX = Math.max(0, dw - w);
        const extraY = Math.max(0, dh - h);

        return {
            imageFit,
            img,
            x,
            y,
            w,
            h,
            dw,
            dh,
            extraX,
            extraY
        };
    }

    _handleImageDragMove(event) {
        const drag = this._dragImageState;
        if (!drag || event.pointerId !== drag.pointerId) return;
        const item = this.items?.[drag.index];
        if (!item?.imageSrc) return;

        const deltaX = event.clientX - drag.startX;
        const deltaY = event.clientY - drag.startY;
        item.imagePanX = drag.extraX > 0
            ? Math.max(-1, Math.min(1, drag.startPanX - (deltaX * 2) / drag.extraX))
            : 0;
        item.imagePanY = drag.extraY > 0
            ? Math.max(-1, Math.min(1, drag.startPanY - (deltaY * 2) / drag.extraY))
            : 0;
        this.render();
        event.preventDefault();
    }

    _finishImageDrag(event) {
        if (!this._dragImageState) return;
        if (event?.pointerId != null && event.pointerId !== this._dragImageState.pointerId) return;

        this.canvas.releasePointerCapture?.(this._dragImageState.pointerId);
        this._dragImageState = null;
        this._hoverImageIndex = null;
        this._setCanvasCursor('default');
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
        this.render();
    }

    _setCanvasCursor(cursor) {
        if (this.canvas) this.canvas.style.cursor = cursor;
    }

    /* ===========================
       Text Editor
       =========================== */

    _renderTextEditor() {
        if (!this.elTextList) return;
        this.elTextList.innerHTML = '';
        const tpl = this.templates.getTemplate(this.currentTemplateId);
        const isPicture = tpl && tpl.category === 'picture';
        const editorConfig = this.templates.getItemEditorConfig(this.currentTemplateId);

        // Inline hint about right-click on canvas
        const hint = document.createElement('div');
        hint.className = 'sa-editor-hint';
        hint.innerHTML = '<i class="fas fa-mouse-pointer" aria-hidden="true"></i> Tip: right-click any element on the canvas to edit, recolour, insert, or delete it.';
        this.elTextList.appendChild(hint);

        this.items.forEach((item, i) => {
            const row = document.createElement('div');
            row.className = 'sa-text-item';
            if (editorConfig) row.classList.add('has-secondary');

            const num = document.createElement('span');
            num.className = 'sa-item-num';
            num.textContent = i + 1;
            num.style.background = this.currentPalette.colors[i % this.currentPalette.colors.length];

            const inputs = document.createElement('div');
            inputs.className = 'sa-item-inputs';

            const input = document.createElement('textarea');
            input.className = 'sa-item-primary';
            input.rows = Math.max(1, Math.min(7, Math.ceil(String(item.text || '').length / 38)));
            input.value = item.text;
            input.placeholder = editorConfig?.primaryPlaceholder || 'Enter text...';
            input.title = editorConfig?.primaryLabel || 'Text';
            input.addEventListener('input', (e) => {
                this.items[i].text = e.target.value;
                e.target.rows = Math.max(1, Math.min(7, Math.ceil(String(e.target.value || '').length / 38)));
                this._scheduleRegenerate();
            });

            row.appendChild(num);
            inputs.appendChild(input);

            if (editorConfig) {
                const secondaryInput = document.createElement('input');
                secondaryInput.type = 'text';
                secondaryInput.className = 'sa-item-secondary';
                secondaryInput.value = item.subtext || '';
                secondaryInput.placeholder = editorConfig.secondaryPlaceholder || editorConfig.secondaryLabel || 'Enter value...';
                secondaryInput.title = editorConfig.secondaryLabel || 'Value';
                secondaryInput.setAttribute('aria-label', `${editorConfig.secondaryLabel || 'Value'} for item ${i + 1}`);
                secondaryInput.addEventListener('input', (e) => {
                    this.items[i].subtext = e.target.value;
                    this._scheduleRegenerate();
                });
                inputs.appendChild(secondaryInput);
            }

            if (editorConfig?.tertiaryLabel) {
                const tertiaryInput = document.createElement('input');
                tertiaryInput.type = 'text';
                tertiaryInput.className = 'sa-item-tertiary';
                tertiaryInput.value = item.detail || '';
                tertiaryInput.placeholder = editorConfig.tertiaryPlaceholder || editorConfig.tertiaryLabel || 'Enter detail...';
                tertiaryInput.title = editorConfig.tertiaryLabel || 'Detail';
                tertiaryInput.setAttribute('aria-label', `${editorConfig.tertiaryLabel || 'Detail'} for item ${i + 1}`);
                tertiaryInput.addEventListener('input', (e) => {
                    this.items[i].detail = e.target.value;
                    this._scheduleRegenerate();
                });
                inputs.appendChild(tertiaryInput);
            }

            row.appendChild(inputs);

            // Image upload button for picture templates
            if (isPicture) {
                const imgActions = document.createElement('div');
                imgActions.className = 'sa-item-img-actions';

                const imgBtn = document.createElement('button');
                imgBtn.className = 'sa-item-img-btn' + (item.imageSrc ? ' has-image' : '');
                imgBtn.innerHTML = item.imageSrc ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-image"></i>';
                imgBtn.title = item.imageSrc ? 'Change image' : 'Upload image';
                imgBtn.addEventListener('click', () => this._pickImage(i));
                imgActions.appendChild(imgBtn);

                if (item.imageSrc) {
                    const removeImgBtn = document.createElement('button');
                    removeImgBtn.className = 'sa-item-img-btn sa-item-img-remove';
                    removeImgBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
                    removeImgBtn.title = 'Remove image';
                    removeImgBtn.addEventListener('click', () => this._removeImage(i));
                    imgActions.appendChild(removeImgBtn);
                }

                row.appendChild(imgActions);

                if (item.imageSrc) {
                    const imageFit = this._getImageFit(i);
                    const mediaControls = document.createElement('div');
                    mediaControls.className = 'sa-item-media-controls';

                    const zoomControl = this._createImageRangeControl(
                        'Zoom',
                        100,
                        250,
                        Math.round(imageFit.zoom * 100),
                        (value) => this._updateImageFit(i, { imageZoom: value / 100 })
                    );
                    const panXControl = this._createImageRangeControl(
                        'Pan X',
                        -100,
                        100,
                        Math.round(imageFit.panX * 100),
                        (value) => this._updateImageFit(i, { imagePanX: value / 100 })
                    );
                    const panYControl = this._createImageRangeControl(
                        'Pan Y',
                        -100,
                        100,
                        Math.round(imageFit.panY * 100),
                        (value) => this._updateImageFit(i, { imagePanY: value / 100 })
                    );

                    const resetFitBtn = document.createElement('button');
                    resetFitBtn.type = 'button';
                    resetFitBtn.className = 'sa-item-fit-reset';
                    resetFitBtn.textContent = 'Reset framing';
                    resetFitBtn.addEventListener('click', () => this._resetImageFit(i));

                    const dragHint = document.createElement('div');
                    dragHint.className = 'sa-item-fit-hint';
                    dragHint.textContent = 'Tip: drag the image on the canvas to reframe it directly.';

                    mediaControls.appendChild(zoomControl);
                    mediaControls.appendChild(panXControl);
                    mediaControls.appendChild(panYControl);
                    mediaControls.appendChild(resetFitBtn);
                    mediaControls.appendChild(dragHint);
                    inputs.appendChild(mediaControls);
                }
            }

            // Inline insert/delete actions
            const actions = document.createElement('div');
            actions.className = 'sa-item-actions';

            // Reorder up
            const moveUp = document.createElement('button');
            moveUp.type = 'button';
            moveUp.className = 'sa-item-mini-btn';
            moveUp.title = 'Move item up';
            moveUp.setAttribute('aria-label', `Move item ${i + 1} up`);
            moveUp.innerHTML = '<i class="fas fa-arrow-up"></i>';
            moveUp.disabled = i === 0;
            moveUp.addEventListener('click', () => this._moveItem(i, -1));
            actions.appendChild(moveUp);

            // Reorder down
            const moveDown = document.createElement('button');
            moveDown.type = 'button';
            moveDown.className = 'sa-item-mini-btn';
            moveDown.title = 'Move item down';
            moveDown.setAttribute('aria-label', `Move item ${i + 1} down`);
            moveDown.innerHTML = '<i class="fas fa-arrow-down"></i>';
            moveDown.disabled = i >= this.items.length - 1;
            moveDown.addEventListener('click', () => this._moveItem(i, 1));
            actions.appendChild(moveDown);

            if (tpl && this.items.length < tpl.maxItems) {
                const addAbove = document.createElement('button');
                addAbove.type = 'button';
                addAbove.className = 'sa-item-mini-btn';
                addAbove.title = 'Insert item above';
                addAbove.setAttribute('aria-label', `Insert item before ${i + 1}`);
                addAbove.innerHTML = '<i class="fas fa-plus"></i><i class="fas fa-arrow-up"></i>';
                addAbove.addEventListener('click', () => this._insertItemAt(i, 0));
                actions.appendChild(addAbove);

                const addBelow = document.createElement('button');
                addBelow.type = 'button';
                addBelow.className = 'sa-item-mini-btn';
                addBelow.title = 'Insert item below';
                addBelow.setAttribute('aria-label', `Insert item after ${i + 1}`);
                addBelow.innerHTML = '<i class="fas fa-plus"></i><i class="fas fa-arrow-down"></i>';
                addBelow.addEventListener('click', () => this._insertItemAt(i, 1));
                actions.appendChild(addBelow);
            }

            const colorBtn = document.createElement('button');
            colorBtn.type = 'button';
            colorBtn.className = 'sa-item-mini-btn sa-item-color-btn';
            colorBtn.title = 'Change colour';
            colorBtn.setAttribute('aria-label', `Change colour for item ${i + 1}`);
            colorBtn.style.setProperty('--swatch', this.currentPalette.colors[i % this.currentPalette.colors.length]);
            colorBtn.innerHTML = '<i class="fas fa-palette"></i>';
            colorBtn.addEventListener('click', () => this._promptChangeItemColor(i));
            actions.appendChild(colorBtn);

            // Delete button (if above min)
            if (tpl && this.items.length > tpl.minItems) {
                const del = document.createElement('button');
                del.type = 'button';
                del.className = 'sa-item-del';
                del.title = 'Delete item';
                del.setAttribute('aria-label', `Delete item ${i + 1}`);
                del.innerHTML = '<i class="fas fa-times"></i>';
                del.addEventListener('click', () => this._deleteItemAt(i));
                actions.appendChild(del);
            }

            row.appendChild(actions);

            this.elTextList.appendChild(row);
        });

        // Update add button state
        const addBtn = document.getElementById('sa-add-item');
        if (addBtn && tpl) {
            addBtn.disabled = this.items.length >= tpl.maxItems;
            addBtn.style.opacity = this.items.length >= tpl.maxItems ? '0.4' : '1';
        }
    }

    _addItem() {
        const tpl = this.templates.getTemplate(this.currentTemplateId);
        if (!tpl || this.items.length >= tpl.maxItems) return;
        const itemIndex = this.items.length;
        const primaryDefaults = this.templates.getDefaultItems(this.currentTemplateId);
        const secondaryDefaults = this.templates.getDefaultSecondaryValues(this.currentTemplateId, itemIndex + 1);
        const tertiaryDefaults = this.templates.getDefaultTertiaryValues(this.currentTemplateId, itemIndex + 1);
        this.items.push({
            text: primaryDefaults[itemIndex]?.text || `Item ${itemIndex + 1}`,
            subtext: primaryDefaults[itemIndex]?.subtext || secondaryDefaults[itemIndex] || '',
            detail: primaryDefaults[itemIndex]?.detail || tertiaryDefaults[itemIndex] || ''
        });
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
    }

    _pickImage(index) {
        const input = document.getElementById('sa-file-input');
        if (!input) return;
        input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file || !file.type.startsWith('image/')) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const previousSrc = this.items[index].imageSrc;
                this.items[index].imageSrc = ev.target.result;
                this.items[index].imageZoom = 1;
                this.items[index].imagePanX = 0;
                this.items[index].imagePanY = 0;
                if (previousSrc) this._imageCache.delete(previousSrc);
                this._imageCache.delete(this.items[index].imageSrc);
                this._regenerate();
                this._renderTextEditor();
                this._scheduleWorkspacePersist();
            };
            reader.readAsDataURL(file);
            input.value = ''; // Reset for re-selection
        };
        input.click();
    }

    _removeImage(index) {
        const currentSrc = this.items[index]?.imageSrc;
        if (!currentSrc) return;
        this._imageCache.delete(currentSrc);
        delete this.items[index].imageSrc;
        delete this.items[index].imageZoom;
        delete this.items[index].imagePanX;
        delete this.items[index].imagePanY;
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
    }

    _createImageRangeControl(labelText, min, max, value, onInput) {
        const wrap = document.createElement('label');
        wrap.className = 'sa-item-fit-control';

        const label = document.createElement('span');
        label.className = 'sa-item-fit-label';
        label.textContent = labelText;

        const valueEl = document.createElement('span');
        valueEl.className = 'sa-item-fit-value';
        valueEl.textContent = `${value}`;

        const input = document.createElement('input');
        input.type = 'range';
        input.min = String(min);
        input.max = String(max);
        input.value = String(value);
        input.addEventListener('input', (event) => {
            valueEl.textContent = event.target.value;
            onInput(Number(event.target.value));
        });

        wrap.appendChild(label);
        wrap.appendChild(input);
        wrap.appendChild(valueEl);
        return wrap;
    }

    _updateImageFit(index, patch) {
        if (!this.items[index]?.imageSrc) return;
        Object.assign(this.items[index], patch);
        this._scheduleRegenerate({ delay: 0, persist: true });
    }

    _resetImageFit(index) {
        if (!this.items[index]?.imageSrc) return;
        this.items[index].imageZoom = 1;
        this.items[index].imagePanX = 0;
        this.items[index].imagePanY = 0;
        this._regenerate();
        this._renderTextEditor();
        this._scheduleWorkspacePersist();
    }

    _getImage(src) {
        if (!src) return null;
        const cached = this._imageCache.get(src);
        if (cached?.status === 'loaded') return cached.image;
        if (cached?.status === 'loading') return null;
        if (cached?.status === 'error' && (Date.now() - cached.failedAt) < 1200) return null;

        this._imageCache.set(src, { status: 'loading' });
        const img = new Image();
        img.onload = () => {
            this._imageCache.set(src, { status: 'loaded', image: img });
            if (this.generatedLayout) this.render();
        };
        img.onerror = () => {
            this._imageCache.set(src, { status: 'error', failedAt: Date.now() });
            if (this.generatedLayout) this.render();
        };
        img.src = src;
        return null;
    }

    /* ===========================
       Palette
       =========================== */

    _renderPalettes() {
        if (!this.elPaletteRow) return;
        this.elPaletteRow.innerHTML = '';
        Object.keys(SmartArtTemplates.PALETTES).forEach(key => {
            const pal = SmartArtTemplates.PALETTES[key];
            const chip = document.createElement('div');
            chip.className = 'sa-palette-chip' + (key === this.currentPaletteKey ? ' active' : '');
            chip.title = key.charAt(0).toUpperCase() + key.slice(1);
            // Show first 3 colors
            pal.colors.slice(0, 3).forEach(c => {
                const s = document.createElement('span');
                s.style.background = c;
                chip.appendChild(s);
            });
            chip.addEventListener('click', () => this._selectPalette(key));
            this.elPaletteRow.appendChild(chip);
        });
    }

    _applyPalette(palette, key, { persist = true, refreshThumbs = true, rerenderEditor = true } = {}) {
        this.currentPalette = {
            ...palette,
            colors: Array.isArray(palette?.colors) ? [...palette.colors] : [...this.templates.getDefaultPalette().colors],
            bg: palette?.bg || '#ffffff',
            text: palette?.text || '#ffffff',
            connector: palette?.connector || palette?.colors?.[0] || '#888888'
        };
        this.currentPaletteKey = key;
        this._regenerate();
        if (rerenderEditor) this._renderTextEditor();
        if (refreshThumbs) this._refreshTemplateThumbs();
        this.elPaletteRow?.querySelectorAll('.sa-palette-chip').forEach((chip, index) => {
            const paletteKey = Object.keys(SmartArtTemplates.PALETTES)[index];
            chip.classList.toggle('active', paletteKey === key);
        });
        if (persist) this._scheduleWorkspacePersist();
    }

    _selectPalette(key, options = {}) {
        const pal = SmartArtTemplates.PALETTES[key];
        if (!pal) return;
        this._applyPalette(pal, key, options);
    }

    _getSupportedAnimationTypes() {
        return new Set(['fade-in', 'scale-up', 'slide-left', 'slide-up', 'wipe', 'bounce', 'rotate', 'flip', 'pop']);
    }

    _interpolateValue(from, to, progress) {
        return from + (to - from) * progress;
    }

    _buildPreviewObjectState(obj, type, raw, eased) {
        const base = {
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            rotation: obj.rotation || 0,
            scaleX: 1,
            scaleY: 1,
            opacity: obj.opacity ?? 1
        };
        const quickFade = Math.max(0, Math.min(1, raw / 0.35)) * (obj.opacity ?? 1);

        switch (type) {
            case 'fade-in':
                return { ...base, opacity: eased * (obj.opacity ?? 1) };
            case 'scale-up':
                return { ...base, opacity: quickFade, scaleX: eased, scaleY: eased };
            case 'slide-left':
                return { ...base, x: this._interpolateValue(-obj.width - 50, obj.x, eased), opacity: quickFade };
            case 'slide-up':
                return { ...base, y: this._interpolateValue(-obj.height - 50, obj.y, eased), opacity: quickFade };
            case 'wipe':
                return { ...base, wipeProgress: eased, wipeDirection: 'right' };
            case 'bounce': {
                const bounceScale = this._bounceEase(raw);
                return { ...base, opacity: quickFade, scaleX: bounceScale, scaleY: bounceScale };
            }
            case 'rotate':
                return {
                    ...base,
                    opacity: quickFade,
                    rotation: this._interpolateValue((obj.rotation || 0) - 720, obj.rotation || 0, eased),
                    scaleX: eased,
                    scaleY: eased
                };
            case 'flip':
                return {
                    ...base,
                    opacity: Math.max(0, Math.min(1, raw / 0.4)) * (obj.opacity ?? 1),
                    rotation: this._interpolateValue((obj.rotation || 0) - 90, obj.rotation || 0, eased),
                    scaleX: eased
                };
            case 'pop': {
                const elastic = this._getEasing('elastic')(raw);
                return { ...base, opacity: quickFade, scaleX: elastic, scaleY: elastic };
            }
            default:
                return { ...base, opacity: eased * (obj.opacity ?? 1) };
        }
    }

    _buildPreviewAnimationStates(delays, duration, elapsed, type, easeFn) {
        return this.generatedLayout.objects.map((obj, i) => {
            const localElapsed = Math.max(0, elapsed - delays[i]);
            const raw = Math.min(1, localElapsed / duration);
            const eased = type === 'bounce' ? this._bounceEase(raw) : easeFn(raw);
            return this._buildPreviewObjectState(obj, type, raw, eased);
        });
    }

    /* ===========================
       Animation Playback
       =========================== */

    playAnimation() {
        if (!this.generatedLayout || this.isPlaying) return;
        this.isPlaying = true;
        this.elPlayBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        const objs = this.generatedLayout.objects;
        const n = objs.length;

        // Build delay map based on order
        let delays = [];
        if (this.animationOrder === 'all-at-once') {
            delays = new Array(n).fill(0);
        } else if (this.animationOrder === 'random') {
            const indices = Array.from({ length: n }, (_, i) => i);
            // Shuffle
            for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
            }
            delays = new Array(n);
            indices.forEach((origIdx, rank) => {
                delays[origIdx] = rank * this.animationStagger;
            });
        } else {
            // Sequential
            delays = Array.from({ length: n }, (_, i) => i * this.animationStagger);
        }

        const duration = this.animationDuration;
        const easeFn = this._getEasing(this.animationEasing);
        const type = this.animationType;
        const startTime = performance.now();
        const totalTime = Math.max(...delays) + duration;

        const animate = (now) => {
            const elapsed = now - startTime;
            const states = this._buildPreviewAnimationStates(delays, duration, elapsed, type, easeFn);
            this.render(states);

            if (elapsed < totalTime) {
                this._animFrame = requestAnimationFrame(animate);
            } else {
                this.render(); // Final static render
                this._stopAnim();
            }
        };

        this._animFrame = requestAnimationFrame(animate);
    }

    resetAnimation() {
        this._stopAnim();
        this.render();
    }

    _stopAnim() {
        if (this._animFrame) cancelAnimationFrame(this._animFrame);
        this._animFrame = null;
        this.isPlaying = false;
        if (this.elPlayBtn) this.elPlayBtn.innerHTML = '<i class="fas fa-play"></i>';
    }

    _getEasing(name) {
        switch (name) {
            case 'linear': return t => t;
            case 'ease-in': return t => t * t * t;
            case 'ease-out': return t => 1 - Math.pow(1 - t, 3);
            case 'ease-in-out': return t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            case 'elastic': return t => {
                if (t === 0 || t === 1) return t;
                return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
            };
            default: return t => 1 - Math.pow(1 - t, 3);
        }
    }

    _bounceEase(t) {
        if (t < 1 / 2.75) return 7.5625 * t * t;
        else if (t < 2 / 2.75) { t -= 1.5 / 2.75; return 7.5625 * t * t + 0.75; }
        else if (t < 2.5 / 2.75) { t -= 2.25 / 2.75; return 7.5625 * t * t + 0.9375; }
        else { t -= 2.625 / 2.75; return 7.5625 * t * t + 0.984375; }
    }

    /* ===========================
       Animation Type Selector
       =========================== */

    setAnimationType(type) {
        if (!this._getSupportedAnimationTypes().has(type)) return;
        this.animationType = type;
        this.elAnimGrid?.querySelectorAll('.sa-anim-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.type === type);
        });
        if (!this._isRestoringState) this._scheduleWorkspacePersist();
    }

    /* ===========================
       Export
       =========================== */

    exportImage(format) {
        if (this._regenerateTimer) this._flushScheduledRegenerate();
        // Render final static frame
        this.render();
        if (format === 'png') {
            const link = document.createElement('a');
            link.download = 'smartart.png';
            link.href = this.canvas.toDataURL('image/png');
            link.click();
        }
    }

    sendToStage() {
        // Store layout data in sessionStorage for the main app to pick up
        if (this._regenerateTimer) this._flushScheduledRegenerate();
        if (!this.generatedLayout) return;

        // Roles whose contents are decorative scaffolding (spines, hubs, backgrounds)
        // — these should animate first as a visual foundation.
        const decorativeRoles = new Set([
            'connector', 'line', 'spoke', 'cycle-arrow', 'center', 'ring',
            'level-label', 'quad-label', 'vs', 'equals', 'plus', 'axis',
            'grid', 'caption', 'background'
        ]);

        const data = {
            objects: this.generatedLayout.objects.flatMap(obj => {
                const clean = { ...obj };

                // ── Connector fidelity fixes ─────────────────────────────
                // Stage's drawLine() uses `fill` for stroke colour and `strokeWidth`
                // for thickness — opposite of SmartArt's convention. Map them so the
                // line renders identically.
                if (obj.type === 'line') {
                    const colour = obj.stroke || obj.fill || '#888';
                    clean.fill = colour;
                    clean.stroke = colour;
                    clean.strokeWidth = Math.max(1, Number(obj.strokeWidth) || 2);
                    clean.opacity = obj.opacity ?? 1;
                }

                // SmartArt arrows are drawn as a filled chevron inside a bounding
                // box, always pointing right. Stage's `arrow` shape is a
                // line + filled triangle from (x,y) → (x+w, y+h). For a faithful
                // visual we re-aim the stage arrow along the natural direction of
                // the SmartArt chevron's bounding box: predominantly horizontal
                // boxes become a clean horizontal line+head; markedly diagonal
                // boxes (cycle/step-down/ascending arrows) keep their diagonal.
                if (obj.type === 'arrow') {
                    const w = Number(obj.width) || 0;
                    const h = Number(obj.height) || 0;
                    const colour = obj.fill || obj.stroke || '#888';
                    const aw = Math.abs(w);
                    const ah = Math.abs(h);
                    if (aw >= ah * 4) {
                        // Horizontal chevron — collapse to centred horizontal line
                        clean.x = obj.x;
                        clean.y = obj.y + h / 2;
                        clean.width = w;
                        clean.height = 0;
                    } else if (ah >= aw * 4) {
                        // Vertical chevron — collapse to centred vertical line
                        clean.x = obj.x + w / 2;
                        clean.y = obj.y;
                        clean.width = 0;
                        clean.height = h;
                    } else {
                        // Diagonal arrow (cycle/step-down/etc.) — keep vector
                        clean.x = obj.x;
                        clean.y = obj.y;
                        clean.width = w;
                        clean.height = h;
                    }
                    clean.fill = colour;
                    clean.stroke = colour;
                    clean.strokeWidth = Math.max(2, Math.round((Number(obj.strokeWidth) || 2)));
                    clean.opacity = obj.opacity ?? 1;
                }

                // ── Image placeholder → stage image ──────────────────────
                if (obj._saRole === 'image' && obj._saIndex >= 0) {
                    const item = this.items?.[obj._saIndex] || null;
                    const imageSrc = item?.imageSrc || null;
                    if (imageSrc) {
                        clean.type = 'image';
                        clean.imageSrc = imageSrc;
                        clean.imageZoom = Math.max(1, Math.min(2.5, Number(item?.imageZoom) || 1));
                        clean.imagePanX = Math.max(-1, Math.min(1, Number(item?.imagePanX) || 0));
                        clean.imagePanY = Math.max(-1, Math.min(1, Number(item?.imagePanY) || 0));
                        delete clean.text;
                        delete clean.textColor;
                        delete clean.fontSize;
                        delete clean.fontWeight;
                        delete clean.textAlign;
                    }
                }

                // ── Animation order hint ─────────────────────────────────
                // Group objects so the stage import can sequence them in a way
                // that mirrors the SmartArt layout: decorative scaffolding first,
                // then each item with its outgoing connector together.
                let animOrder;
                const hasIdx = typeof obj._saIndex === 'number' && obj._saIndex >= 0;
                if (hasIdx) {
                    animOrder = obj._saIndex + 1;
                } else if (decorativeRoles.has(obj._saRole)) {
                    animOrder = 0; // scaffolding appears first
                } else {
                    animOrder = 0;
                }
                clean._saAnimOrder = animOrder;
                clean._saRole = obj._saRole; // keep for stage importer

                // The SmartArt canvas can position text independently inside a
                // shape. The main stage represents that result as a fixed shape
                // plus a separate transparent text object so connectors and box
                // geometry remain untouched.
                const embeddedTextDx = obj.type !== 'text' ? (Number(obj._saTextOffsetDx) || 0) : 0;
                const embeddedTextDy = obj.type !== 'text' ? (Number(obj._saTextOffsetDy) || 0) : 0;
                let stageObjects = [clean];
                if (clean.text && (embeddedTextDx || embeddedTextDy)) {
                    const textObject = {
                        ...clean,
                        type: 'text',
                        x: (Number(obj.x) || 0) + embeddedTextDx,
                        y: (Number(obj.y) || 0) + embeddedTextDy,
                        fill: 'transparent',
                        stroke: 'transparent',
                        strokeWidth: 0,
                        borderRadius: 0,
                        _saRole: `${obj._saRole || 'shape'}-text`
                    };
                    delete clean.text;
                    delete clean.textColor;
                    delete clean.fontSize;
                    delete clean.fontWeight;
                    delete clean.fontFamily;
                    delete clean.textAlign;
                    delete clean.fitText;
                    delete clean.minFontSize;
                    stageObjects = [clean, textObject];
                }

                // Remove only the internal id; keep _saRole and _saAnimOrder so
                // app.js can sequence intelligently. They are stripped before
                // being attached to the StageObject.
                stageObjects.forEach(stageObject => {
                    delete stageObject._saId;
                    delete stageObject._saIndex;
                    delete stageObject._saAutoX;
                    delete stageObject._saAutoY;
                    delete stageObject._saTextOffsetDx;
                    delete stageObject._saTextOffsetDy;
                });
                return stageObjects;
            }),
            animation: {
                type: this.animationType,
                order: this.animationOrder,
                duration: this.animationDuration,
                stagger: this.animationStagger,
                easing: this.animationEasing
            },
            importHints: {
                scale: 1.2,
                fontScale: 1.18,
                autoGroup: true,
                focusAfterImport: true,
                groupName: 'SmartArt'
            },
            timestamp: Date.now()
        };
        try {
            this._persistWorkspaceState();
            const fallbackToStageRoute = () => {
                sessionStorage.setItem('smartart_transfer', JSON.stringify(data));
                window.location.href = 'stage.php?importSmartArt=1';
            };
            // Prefer live handoff to an existing stage window to avoid a full
            // stage reload/restart. Fall back to same-window route when needed.
            if (window.opener && !window.opener.closed) {
                window.opener.postMessage({
                    type: 'animstage:smartart-transfer',
                    payload: data
                }, window.location.origin);
                try { window.opener.focus(); } catch (_) {}
                if (window.Utils?.showToast) {
                    Utils.showToast('Sent to Stage', 'success');
                }
                return;
            }
            if ('BroadcastChannel' in window) {
                try {
                    const channel = new BroadcastChannel('animstage-smartart');
                    let acknowledged = false;
                    const timer = setTimeout(() => {
                        if (acknowledged) return;
                        try { channel.close(); } catch (_) {}
                        fallbackToStageRoute();
                    }, 700);
                    channel.addEventListener('message', (event) => {
                        const msg = event?.data;
                        if (!msg || msg.type !== 'animstage:smartart-transfer-ack') return;
                        acknowledged = true;
                        clearTimeout(timer);
                        try { channel.close(); } catch (_) {}
                        if (window.Utils?.showToast) {
                            Utils.showToast('Sent to Stage', 'success');
                        }
                    });
                    channel.postMessage({
                        type: 'animstage:smartart-transfer',
                        payload: data
                    });
                    return;
                } catch (e) {
                    console.warn('SmartArt live broadcast failed:', e);
                }
            }
            fallbackToStageRoute();
        } catch (e) {
            console.error('Failed to transfer SmartArt:', e);
        }
    }

    /* ===========================
       JSON Export / Import
       =========================== */

    toJSON() {
        const data = {
            templateId: this.currentTemplateId,
            paletteKey: this.currentPaletteKey,
            backgroundColor: this.backgroundColor,
            items: this.items.map(item => ({ ...item })),
            fontScale: this.fontScale,
            fontFamily: this.fontFamily,
            barOrientation: this.barOrientation,
            flowDirection: this.flowDirection,
            seriesLabels: Array.isArray(this.seriesLabels) ? [...this.seriesLabels] : [],
            textOffsets: this.textOffsets && typeof this.textOffsets === 'object' ? { ...this.textOffsets } : {},
            animation: {
                type: this.animationType,
                order: this.animationOrder,
                duration: this.animationDuration,
                stagger: this.animationStagger,
                easing: this.animationEasing
            }
        };
        if (this.currentPaletteKey === 'custom') {
            data.customPalette = {
                colors: [...(this.currentPalette.colors || [])],
                bg: this.currentPalette.bg,
                text: this.currentPalette.text,
                connector: this.currentPalette.connector
            };
        }
        return data;
    }

    fromJSON(data) {
        this._isRestoringState = true;
        try {
            if (data.backgroundColor) {
                this.backgroundColor = data.backgroundColor;
                if (this.elBgColor) this.elBgColor.value = data.backgroundColor;
            }
            if (typeof data.fontScale === 'number' && Number.isFinite(data.fontScale)) {
                this.fontScale = Math.max(0.6, Math.min(2.0, data.fontScale));
                if (this.elFontScale) {
                    this.elFontScale.value = String(this.fontScale);
                    if (this.elFontScaleVal) this.elFontScaleVal.textContent = `${Math.round(this.fontScale * 100)}%`;
                }
            }
            if (typeof data.fontFamily === 'string' && data.fontFamily.trim()) {
                this.fontFamily = data.fontFamily.trim();
                if (this.elFontFamily) this.elFontFamily.value = this.fontFamily;
            }
            if (data.barOrientation === 'horizontal' || data.barOrientation === 'vertical') {
                this.barOrientation = data.barOrientation;
            }
            if (data.flowDirection === 'horizontal' || data.flowDirection === 'vertical') {
                this.flowDirection = data.flowDirection;
            }
            if (Array.isArray(data.seriesLabels)) this.seriesLabels = [...data.seriesLabels];
            if (data.textOffsets && typeof data.textOffsets === 'object') {
                this.textOffsets = { ...data.textOffsets };
            }
            if (data.items) this.items = data.items.map(item => ({ ...item }));
            if (data.customPalette && data.paletteKey === 'custom') {
                this._applyPalette(data.customPalette, 'custom', { persist: false, refreshThumbs: false, rerenderEditor: false });
            } else if (data.paletteKey) {
                this._selectPalette(data.paletteKey, { persist: false });
            }
            if (data.templateId) {
                this.currentTemplateId = data.templateId;
                this._regenerate();
                this._renderTextEditor();
                this._syncSeriesLabelsRow();
                this.elTemplateGrid?.querySelectorAll('.sa-template-card').forEach(card => {
                    card.classList.toggle('selected', card.dataset.id === data.templateId);
                });
            }
            if (data.animation) {
                const a = data.animation;
                if (a.type) this.setAnimationType(a.type);
                if (a.order && this.elAnimOrder) {
                    this.elAnimOrder.value = a.order;
                    this.animationOrder = a.order;
                }
                if (a.duration != null && this.elAnimDuration) {
                    this.elAnimDuration.value = a.duration;
                    this.animationDuration = a.duration;
                    if (this.elAnimDurationVal) this.elAnimDurationVal.textContent = a.duration + 'ms';
                }
                if (a.stagger != null && this.elAnimStagger) {
                    this.elAnimStagger.value = a.stagger;
                    this.animationStagger = a.stagger;
                    if (this.elAnimStaggerVal) this.elAnimStaggerVal.textContent = a.stagger + 'ms';
                }
                if (a.easing && this.elAnimEasing) {
                    this.elAnimEasing.value = a.easing;
                    this.animationEasing = a.easing;
                }
            }
            this._refreshTemplateThumbs();
        } finally {
            this._isRestoringState = false;
        }
    }
}
