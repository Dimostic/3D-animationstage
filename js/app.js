/* ============================================
   Animation Stage - Main Application
   Initializes all managers, wires up panels,
   handles mode switching, keyboard shortcuts
   ============================================ */

class App {
    constructor() {
        // Managers
        this.stage = null;
        this.objects = null;
        this.animations = null;
        this.timeline = null;
        this.tags = null;
        this.ai = null;
        this.teachMe = null;
        this.stageCapture = null;
        this.exporter = null;
        this.previewExportCompat = null;
        this.projectDoctor = null;
        this.history = new HistoryManager();

        this.mode = 'basic'; // 'basic', 'ai', or routed via SmartArt
        this._lastStageMode = 'basic';
        this._workspaceSyncedFromSmartArt = false;
        this.activeLeftTab = 'tools';
        this.activeRightTab = 'properties';

        this.autosave = true;
        this.aiProvider = window.__STAGE_USER?.ai_config?.defaultProvider || 'builtin';
        this.aiApiKey = '';
        this.aiEndpoint = '';
        this.hwAccel = true;
        this.maxObjects = 500;
        this._autosaveInterval = null;
        this._autosaveDebounce = null;
        this._autosaveBoundSave = null;
        this._workspaceBridgeKey = 'animstage_stage_workspace_bridge';
        this._workspaceRestoreFlagKey = 'animstage_restore_stage_workspace';

        this._loadSettingsFromStorage();

        this.init();
    }

    init() {
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        console.log('%c[Animation Stage]%c Initializing...', 'color:#6c5ce7;font-weight:bold', 'color:inherit');

        this.setupPromiseNoiseGuards();

        window.__setStudioLoaderState?.('Starting workspace engine...', 0.97);

        document.body.classList.toggle('light-mode', this.theme === 'light');

        // Initialize modules in dependency order
        this.stage = new StageManager('stage-canvas');
        this.objects = new ObjectManager(this.stage);
        this.stage.objectManager = this.objects;
        this.animations = new AnimationEngine(this.stage, this.objects);
        this.objects.animations = this.animations; // back-reference for destination picking
        this.timeline = new TimelineManager(this.stage, this.objects, this.animations);
        this.tags = new TagManager(this.stage, this.objects);
        this.ai = new AIMode(this.stage, this.objects, this.animations, this.tags);
        this.ai.updateAPISettings(this.aiProvider, this.aiApiKey, this.aiEndpoint);
        this.characterDesigner = typeof CharacterDesigner !== 'undefined' ? new CharacterDesigner(this) : null;
        this.realisticCharacters = typeof RealisticCharacterWorkspace !== 'undefined' ? new RealisticCharacterWorkspace(this) : null;
        this.exporter = new ExportManager(this.stage, this.objects, this.animations, this.timeline, this.tags, this.ai);
        this.objects.exporter = this.exporter; // back-reference for per-object SVG export
        this.previewExportCompat = (typeof PreviewExportCompat !== 'undefined') ? new PreviewExportCompat(this) : null;
        this.projectDoctor = (typeof ProjectDoctor !== 'undefined') ? new ProjectDoctor(this) : null;

        // New enterprise modules
        this.easingEditor = new EasingEditor();
        this.templateLibrary = null;
        this.audioTimeline = new AudioTimeline(this.animations, this.timeline);
        this.keyframeEditor = new KeyframeEditor();
        this.dopeSheet = (typeof DopeSheet !== 'undefined') ? new DopeSheet(this.objects, this.animations, this.timeline) : null;
        this.symbols = (typeof SymbolManager !== 'undefined') ? new SymbolManager(this.objects, this.stage, this.animations) : null;
        if (this.symbols) this.symbols.init();
        this.onionSkin = (typeof OnionSkin !== 'undefined') ? new OnionSkin(this.stage, this.objects, this.animations) : null;
        if (this.onionSkin) { this.onionSkin.init(); setTimeout(() => this.onionSkin.bindUI(), 0); }
        this.motionPaths = (typeof MotionPaths !== 'undefined') ? new MotionPaths(this.stage, this.objects, this.animations) : null;
        if (this.motionPaths) { this.motionPaths.init(); setTimeout(() => this.motionPaths.bindUI(), 0); }
        this.expressions = (typeof Expressions !== 'undefined') ? new Expressions(this.stage, this.objects, this.animations) : null;
        if (this.expressions) { this.expressions.init(); setTimeout(() => this.expressions.bindUI(), 0); }
        this.pathAnimation = new PathAnimationManager(this.stage, this.objects, this.animations);
        this.jointSystem = new JointSystem(this.objects, this.stage, this.animations);
        this.audioLipSync = (typeof AudioLipSyncManager !== 'undefined')
            ? new AudioLipSyncManager(this)
            : null;
        this.faceRig = (typeof FaceRigManager !== 'undefined')
            ? new FaceRigManager(this.objects, this.stage, this.animations)
            : null;
        this.stageCamera = (typeof StageCameraManager !== 'undefined') ? new StageCameraManager(this.stage, this.animations) : null;
        window.dumpFaceSetTrace = (limit) => this.animations?.dumpFaceSetTrace?.(limit);
        window.clearFaceSetTrace = () => this.animations?.clearFaceSetTraceBuffer?.();
        window.getFaceSetTraceBuffer = () => this.animations?.getFaceSetTraceBuffer?.() || [];
        window.validateUniversalFaceAnimations = () => this.faceRig?.validateUniversalFaceAnimations?.() || null;

        // Wire easing editor apply callback
        this.easingEditor.onApply = (name, values) => {
            const bezierStr = `cubic-bezier(${values[0]}, ${values[1]}, ${values[2]}, ${values[3]})`;
            const select = document.getElementById('param-easing');
            if (select) {
                select.value = 'custom';
                select.dataset.bezier = bezierStr;
            }
            // If an animation is currently being edited (re-apply mode), update it live
            const reObjId = this.animations?._reapplyObjId;
            const reAnimId = this.animations?._reapplyAnimId;
            if (reObjId && reAnimId) {
                const obj = this.objects.getObjectById(reObjId);
                const anim = obj?.animations.find(a => a.id === reAnimId);
                if (anim) {
                    anim.params = anim.params || {};
                    anim.params.easing = bezierStr;
                    const gens = Array.isArray(anim.generated) ? anim.generated : [anim.generated];
                    gens.forEach(g => { if (g) g.easing = bezierStr; });
                    this.animations.updateCodeOutput?.();
                    eventBus.emit('timeline:update');
                }
            }
            Utils.showToast(`Custom easing applied: ${bezierStr}`, 'success');
        };

        // Setup UI
        this.setupPanelTabs();
        this.setupCollapsiblePanels();
        this.setupModeToggle();
        this.setupToolbar();
        this._updateWorkspaceStatusIndicator();
        this.setupKeyboardShortcuts();
        this.setupUndoRedo();
        this.setupFeedbackReporter();
        this.setupSettings();
        this.setupContextMenu();
        this.setupStageRendering();
        this.setupPreview();
        this.setupShortcutsModal();
        this.setupSceneManager();
        this.setupRulers();
        this.setupSVGImport();
        this.setupEasingPreview();
        this.setupCollapsibleSections();

        // Hide loading / show app
        document.body.classList.add('app-loaded');

        // Recording indicator in Properties tab header
        this._setupRecordingIndicator();

        // Start with all panels collapsed so the stage is maximised
        this.collapseAllPanelsOnStartup();

        // Fit stage to view after panels have collapsed and the viewport has resized
        setTimeout(() => {
            this.stage.resizeCanvas();
            this.stage.centerStage();
        }, 100);

        // Show hint labels on collapsed panels briefly
        this._showPanelHints();

        // Onboarding for first-time users
        // The inherited onboarding tour opens 2D-only tools.

        // Start autosave
        this._startAutosave();

        this.setupDeferredFeatures();

        window.__setStudioLoaderState?.('Studio ready', 1);

        console.log('%c[Animation Stage]%c Ready!', 'color:#00b894;font-weight:bold', 'color:inherit');
        Utils.showToast('Animation Stage ready', 'info');

        window.setTimeout(() => {
            window.__hideStudioLoader?.();
        }, 120);

        // --- PWA: Register service worker & install prompt ---
        this._setupPWA();

        // --- Toolbar scroll hint ---
        this._setupToolbarScrollHint();

        // --- Layout system ---
        this.setupLayoutSwitcher();

        // --- Restore stage workspace after SmartArt round-trip ---
        this._restoreWorkspaceBridgeIfNeeded();

        // --- Live SmartArt handoff (no stage reload) ---
        this._setupSmartArtImportChannel();

        // --- SmartArt import ---
        this._checkSmartArtImport();
    }

    _setupSmartArtImportChannel() {
        if (this._smartArtImportChannelReady) return;
        this._smartArtImportChannelReady = true;

        const importFromSmartArt = (payload) => {
            if (!payload) return false;
            this._importSmartArtPayload(payload, { cleanUrl: false });
            return true;
        };

        window.addEventListener('message', (event) => {
            try {
                if (!event || event.origin !== window.location.origin) return;
                const msg = event.data;
                if (!msg || msg.type !== 'animstage:smartart-transfer' || !msg.payload) return;
                importFromSmartArt(msg.payload);
                try {
                    event.source?.postMessage?.({ type: 'animstage:smartart-transfer-ack' }, event.origin);
                } catch (_) {}
            } catch (e) {
                console.warn('SmartArt live import failed:', e);
            }
        });

        if ('BroadcastChannel' in window) {
            try {
                const channel = new BroadcastChannel('animstage-smartart');
                channel.addEventListener('message', (event) => {
                    try {
                        const msg = event.data;
                        if (!msg || msg.type !== 'animstage:smartart-transfer' || !msg.payload) return;
                        importFromSmartArt(msg.payload);
                        channel.postMessage({ type: 'animstage:smartart-transfer-ack' });
                    } catch (e) {
                        console.warn('SmartArt broadcast import failed:', e);
                    }
                });
                this._smartArtBroadcastChannel = channel;
            } catch (e) {
                console.warn('SmartArt broadcast channel unavailable:', e);
            }
        }
    }

    setupPromiseNoiseGuards() {
        if (window.__animationStagePromiseNoiseGuardsInstalled) return;
        window.__animationStagePromiseNoiseGuardsInstalled = true;

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason;
            const name = reason?.name || '';
            const message = String(reason?.message || reason || '');
            if (name === 'AbortError' && /play\(\) request was interrupted|interrupted by a call to pause/i.test(message)) {
                event.preventDefault();
                return;
            }
            // Surface anything else so genuine bugs are not silently swallowed.
            try {
                console.error('[unhandledrejection]', reason);
            } catch (_) {}
        });
    }

    setupDeferredFeatures() {
        this.initializeDeferredFeatures();

        window.addEventListener('studio:deferred-script-ready', () => {
            this.initializeDeferredFeatures();
        });
    }

    initializeDeferredFeatures() {
        if (!this.teachMe && typeof TeachMe === 'function') {
            this.teachMe = new TeachMe(this.ai);
        }

        if (!this.stageCapture && typeof StageCapture === 'function') {
            this.stageCapture = new StageCapture(this.objects, this.stage, this.ai);
        }

        if (!this.templateLibrary && typeof TemplateLibrary === 'function') {
            this.templateLibrary = new TemplateLibrary(this.objects, this.animations);
        }
        if (!this.conversations && typeof ConversationTemplates === 'function') {
            this.conversations = new ConversationTemplates(this);
        }

        if (!this.backgroundLibrary && typeof BackgroundLibrary === 'function') {
            this.backgroundLibrary = new BackgroundLibrary(this.stage);
        }

        if (!this.slideLayouts && typeof SlideLayouts === 'function') {
            this.slideLayouts = new SlideLayouts(this);
        }
    }

    _checkSmartArtImport() {
        const params = new URLSearchParams(window.location.search);
        if (!params.has('importSmartArt')) return;
        try {
            const raw = sessionStorage.getItem('smartart_transfer');
            if (!raw) return;
            const data = JSON.parse(raw);
            sessionStorage.removeItem('smartart_transfer');
            this._importSmartArtPayload(data, { cleanUrl: true });
        } catch (e) {
            console.warn('SmartArt import failed:', e);
        }
    }

    _importSmartArtPayload(data, options = {}) {
        if (!data || !Array.isArray(data.objects)) return;
        const cleanUrl = options.cleanUrl !== false;
        try {

            // Map SmartArt animation types to AnimationEngine library keys
            const animTypeMap = {
                'fade-in':    'fade-in',
                'scale-up':   'entry-zoom',
                'slide-left': 'entry-fly-left',
                'slide-up':   'entry-fly-top',
                'wipe':       'entry-wipe',
                'bounce':     'entry-bounce',
                'rotate':     'entry-spin',
                'flip':       'entry-flip',
                'pop':        'pop-in'
            };

            // Map SmartArt easing names to AnimationEngine easing names
            const easingMap = {
                'ease-out':    'easeOut',
                'ease-in':     'easeIn',
                'ease-in-out': 'easeInOut',
                'linear':      'linear',
                'elastic':     'easeOut'
            };

            const anim = data.animation;
            const importHints = data.importHints || {};
            const importScale = Math.max(0.5, Number(importHints.scale) || 1);
            const fontScale = Math.max(0.5, Number(importHints.fontScale) || importScale);
            const minX = Math.min(...data.objects.map(props => {
                const w = props.width ?? 100;
                return (props.x ?? 100) + Math.min(0, w);
            }));
            const minY = Math.min(...data.objects.map(props => {
                const h = props.height ?? 100;
                return (props.y ?? 100) + Math.min(0, h);
            }));
            const maxX = Math.max(...data.objects.map(props => {
                const w = props.width ?? 100;
                return (props.x ?? 100) + Math.max(0, w);
            }));
            const maxY = Math.max(...data.objects.map(props => {
                const h = props.height ?? 100;
                return (props.y ?? 100) + Math.max(0, h);
            }));
            const sourceWidth = Math.max(1, maxX - minX);
            const sourceHeight = Math.max(1, maxY - minY);
            const centerX = (minX + maxX) / 2;
            const centerY = (minY + maxY) / 2;
            const stagePadding = Math.max(24, Math.round(Math.min(this.stage.width, this.stage.height) * 0.06));
            const fitScale = Math.min(
                Math.max(0.2, (this.stage.width - stagePadding * 2) / sourceWidth),
                Math.max(0.2, (this.stage.height - stagePadding * 2) / sourceHeight)
            );
            const effectiveScale = Math.min(importScale, fitScale);
            const targetCenterX = this.stage.width / 2;
            const targetCenterY = this.stage.height / 2;
            const createdObjects = [];

            data.objects.forEach(props => {
                const width = (props.width ?? 100) * effectiveScale;
                const height = (props.height ?? 100) * effectiveScale;
                const scaledCenterX = targetCenterX + ((props.x ?? 100) + (props.width ?? 100) / 2 - centerX) * effectiveScale;
                const scaledCenterY = targetCenterY + ((props.y ?? 100) + (props.height ?? 100) / 2 - centerY) * effectiveScale;
                const type = props.type || 'rectangle';
                // Lines and arrows on stage are described by start point + vector
                // (width/height can be 0 or negative). Preserve the vector so the
                // joining lines and arrows render exactly as they did in SmartArt.
                const isVectorShape = type === 'line' || type === 'arrow';
                let objX, objY, objW, objH;
                if (isVectorShape) {
                    objW = (props.width ?? 0) * effectiveScale;
                    objH = (props.height ?? 0) * effectiveScale;
                    objX = targetCenterX + ((props.x ?? 0) - centerX) * effectiveScale;
                    objY = targetCenterY + ((props.y ?? 0) - centerY) * effectiveScale;
                } else {
                    objX = scaledCenterX - width / 2;
                    objY = scaledCenterY - height / 2;
                    objW = width;
                    objH = height;
                }
                // Snap to integer pixels so connector endpoints land exactly on
                // node edges (eliminates the sub-pixel "wavy / overlapping" look
                // produced by the stage's zoom-scaled anti-aliasing).
                if (isVectorShape) {
                    // Preserve direction (negative w/h allowed) and length
                    const x2 = Math.round(objX + objW);
                    const y2 = Math.round(objY + objH);
                    objX = Math.round(objX);
                    objY = Math.round(objY);
                    objW = x2 - objX;
                    objH = y2 - objY;
                } else {
                    const x2 = Math.round(objX + objW);
                    const y2 = Math.round(objY + objH);
                    objX = Math.round(objX);
                    objY = Math.round(objY);
                    objW = Math.max(1, x2 - objX);
                    objH = Math.max(1, y2 - objY);
                }
                const obj = new StageObject(type, {
                    x: objX,
                    y: objY,
                    width: objW,
                    height: objH,
                    fill: props.fill ?? '#4472C4',
                    stroke: props.stroke ?? 'transparent',
                    strokeWidth: isVectorShape
                        ? Math.max(2, Math.round((props.strokeWidth ?? 2) * Math.min(effectiveScale, 1.4)))
                        : (props.strokeWidth ?? 0),
                    borderRadius: props.borderRadius ?? 0,
                    opacity: props.opacity ?? 1,
                    text: props.text ?? '',
                    textColor: props.textColor ?? '#ffffff',
                    fontSize: Math.max(10, Math.round((props.fontSize ?? 14) * fontScale)),
                    fontWeight: props.fontWeight ?? '400',
                    textAlign: props.textAlign ?? 'center',
                    imageSrc: props.imageSrc ?? null,
                    imageZoom: props.imageZoom ?? 1,
                    imagePanX: props.imagePanX ?? 0,
                    imagePanY: props.imagePanY ?? 0
                });
                // Tag connectors so animation logic can fade them in cleanly.
                obj._saIsConnector = isVectorShape;
                this.objects.addObject(obj);
                if (type === 'image' && props.imageSrc && typeof obj.loadImage === 'function') {
                    obj.loadImage(props.imageSrc);
                }
                createdObjects.push(obj);
            });

            // Apply animations if animation data was transferred
            if (anim && anim.type && this.animations) {
                const libKey = animTypeMap[anim.type] || 'fade-in';
                const lib = this.animations.library;
                const def = lib ? lib[libKey] : null;

                if (def) {
                    const n = createdObjects.length;
                    const stagger = anim.stagger || 0;
                    const durationSec = (anim.duration || 600) / 1000;
                    const easing = easingMap[anim.easing] || 'easeOut';

                    // Build delay map based on order. We honour the per-object
                    // `_saAnimOrder` hint (sent by SmartArt) so the animation
                    // sequence reflects the visual arrangement: scaffolding/spines
                    // first, then each item with its outgoing connector together.
                    let delays;
                    if (anim.order === 'all-at-once') {
                        delays = new Array(n).fill(0);
                    } else if (anim.order === 'random') {
                        const indices = Array.from({ length: n }, (_, i) => i);
                        for (let i = indices.length - 1; i > 0; i--) {
                            const j = Math.floor(Math.random() * (i + 1));
                            [indices[i], indices[j]] = [indices[j], indices[i]];
                        }
                        delays = new Array(n);
                        indices.forEach((origIdx, rank) => {
                            delays[origIdx] = rank * stagger;
                        });
                    } else {
                        // 'one-by-one' (default) — group by _saAnimOrder
                        const orderForIdx = data.objects.map((p, i) =>
                            (typeof p._saAnimOrder === 'number') ? p._saAnimOrder : i
                        );
                        const uniqueOrders = [...new Set(orderForIdx)].sort((a, b) => a - b);
                        const rankMap = new Map();
                        uniqueOrders.forEach((ord, rank) => rankMap.set(ord, rank));
                        const reverse = anim.order === 'reverse';
                        const lastRank = uniqueOrders.length - 1;
                        delays = orderForIdx.map(ord => {
                            const rank = rankMap.get(ord);
                            return (reverse ? (lastRank - rank) : rank) * stagger;
                        });
                    }

                    createdObjects.forEach((obj, i) => {
                        // Connector lines/arrows must NOT physically move during
                        // the entrance animation — otherwise their endpoints
                        // detach from the nodes they join, producing the
                        // "crossing/overlapping" look the user reported. Force
                        // a plain fade-in for connectors regardless of the
                        // selected entrance animation.
                        const useFadeOnly = obj._saIsConnector;
                        const effLibKey = useFadeOnly ? 'fade-in' : libKey;
                        const effDef = useFadeOnly ? (lib['fade-in'] || def) : def;
                        const animParams = { ...effDef.params, duration: durationSec, easing };
                        const animData = {
                            id: Utils.generateId('anim'),
                            type: effLibKey,
                            name: effDef.name,
                            params: animParams,
                            delay: delays[i],
                            repeat: 1,
                            repeatMode: 'restart',
                            trigger: 'onLoad',
                            startMode: 'withPrevious',
                            generated: effDef.generate(obj, animParams)
                        };
                        obj.animations.push(animData);
                        // Cleanup the temporary marker so it doesn't get serialised
                        delete obj._saIsConnector;
                    });
                }
            }

            if (createdObjects.length > 0) {
                this.objects.select(createdObjects.map(obj => obj.id));

                if (importHints.autoGroup !== false && createdObjects.length > 1) {
                    this.objects.groupSelected();
                    const groupId = createdObjects[0]?.groupId;
                    if (groupId && importHints.groupName) {
                        this.objects.groupNames[groupId] = importHints.groupName;
                        this.objects.updateObjectList();
                    }
                }

                if (importHints.focusAfterImport !== false) {
                    this.stage.focusOnSelected();
                }
            }

            this.stage.render();
            this._workspaceSyncedFromSmartArt = true;
            this._updateWorkspaceStatusIndicator();
            Utils.showToast(`Imported ${data.objects.length} SmartArt objects${createdObjects.length > 1 ? ' as a group — right-click to ungroup' : ''}`, 'success');
            // Clean URL
            if (cleanUrl) {
                window.history.replaceState({}, '', 'stage.php');
            }
        } catch (e) {
            console.warn('SmartArt import failed:', e);
        }
    }

    _persistWorkspaceBridge() {
        if (!this.exporter) return false;
        try {
            const persistedMode = this.mode === 'smartart'
                ? (this._lastStageMode === 'ai' ? 'ai' : 'basic')
                : this.mode;
            const payload = {
                version: 1,
                savedAt: Date.now(),
                project: this.exporter.serializeProject(),
                ui: {
                    mode: persistedMode,
                    activeLeftTab: this.activeLeftTab,
                    activeRightTab: this.activeRightTab
                }
            };
            sessionStorage.setItem(this._workspaceBridgeKey, JSON.stringify(payload));
            return true;
        } catch (e) {
            console.warn('[SmartArt] Failed to persist workspace bridge:', e);
            return false;
        }
    }

    _restoreWorkspaceBridgeIfNeeded() {
        if (!this.exporter) return false;
        if (sessionStorage.getItem(this._workspaceRestoreFlagKey) !== '1') return false;

        try {
            const raw = sessionStorage.getItem(this._workspaceBridgeKey);
            if (!raw) return false;
            const payload = JSON.parse(raw);
            if (!payload?.project) return false;

            this.exporter.deserializeProject(payload.project);

            if (payload.ui?.mode) {
                this.mode = payload.ui.mode;
                this.applyMode();
            }
            if (payload.ui?.activeLeftTab) this.switchLeftTab(payload.ui.activeLeftTab);
            if (payload.ui?.activeRightTab) this.switchRightTab(payload.ui.activeRightTab);

            this._workspaceSyncedFromSmartArt = true;
            this._updateWorkspaceStatusIndicator();
            Utils.showToast('Restored project from SmartArt workspace', 'success');
            return true;
        } catch (e) {
            console.warn('[SmartArt] Failed to restore workspace bridge:', e);
            return false;
        } finally {
            sessionStorage.removeItem(this._workspaceRestoreFlagKey);
        }
    }

    openSmartArtWorkspace(options = {}) {
        const prompt = typeof options.prompt === 'string' ? options.prompt : '';
        this._lastStageMode = this.mode === 'ai' ? 'ai' : 'basic';
        this._persistWorkspaceBridge();
        sessionStorage.setItem(this._workspaceRestoreFlagKey, '1');
        try {
            sessionStorage.setItem('animstage_stage_user_context', JSON.stringify(window.__STAGE_USER || {}));
        } catch (e) {
            console.warn('[SmartArt] Failed to persist stage user context:', e);
        }
        if (prompt) sessionStorage.setItem('smartart_ai_prompt', prompt);
        const href = document.getElementById('btn-smartart')?.getAttribute('href') || 'smartart.html';
        let smartArtHref = href;
        try {
            const url = new URL(href, window.location.href);
            url.searchParams.set('liveStage', '1');
            smartArtHref = url.href;
        } catch (_) {}

        let smartArtWindow = null;
        try {
            smartArtWindow = window.open(
                smartArtHref,
                'animstage-smartart-workspace',
                'popup=no,width=1280,height=860'
            );
        } catch (e) {
            console.warn('[SmartArt] Failed to open linked workspace:', e);
        }

        if (smartArtWindow) {
            try { smartArtWindow.focus(); } catch (_) {}
            Utils.showToast('SmartArt opened in a linked workspace', 'success');
            return;
        }

        Utils.showToast('Popup blocked. Opening SmartArt in this tab.', 'warning');
        window.location.href = smartArtHref;
    }

    // === Layout Switcher ===
    setupLayoutSwitcher() {
        this._currentLayout = 'default';
        const btn = document.getElementById('btn-layout-menu');
        const dropdown = document.getElementById('layout-dropdown');
        if (!btn || !dropdown) return;

        // Toggle dropdown
        const positionDropdown = () => {
            const r = btn.getBoundingClientRect();
            dropdown.style.top = (r.bottom + 6) + 'px';
            dropdown.style.left = Math.max(0, r.right - dropdown.offsetWidth) + 'px';
        };
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdown.classList.toggle('open');
            if (dropdown.classList.contains('open')) positionDropdown();
        });
        document.addEventListener('click', (e) => {
            if (!e.target.closest('#layout-switcher') && !e.target.closest('#layout-dropdown')) {
                dropdown.classList.remove('open');
            }
        });

        // Layout preset buttons
        dropdown.querySelectorAll('.layout-option').forEach(opt => {
            opt.addEventListener('click', () => {
                const layout = opt.dataset.layout;
                this.applyLayout(layout);
                dropdown.querySelectorAll('.layout-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });

        // Panel visibility toggles
        const toggleLeft = document.getElementById('layout-toggle-left');
        const toggleRight = document.getElementById('layout-toggle-right');
        const toggleStage = document.getElementById('layout-toggle-stage');
        const toggleTimeline = document.getElementById('layout-toggle-timeline');

        if (toggleLeft) toggleLeft.addEventListener('change', () => this._setPanelVisible('left', toggleLeft.checked));
        if (toggleRight) toggleRight.addEventListener('change', () => this._setPanelVisible('right', toggleRight.checked));
        if (toggleStage) toggleStage.addEventListener('change', () => this._setPanelVisible('stage', toggleStage.checked));
        if (toggleTimeline) toggleTimeline.addEventListener('change', () => this._setPanelVisible('timeline', toggleTimeline.checked));

        // Keyboard shortcut: Ctrl+L to cycle layouts
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select, [contenteditable]')) return;
            if (e.ctrlKey && e.key === 'l') {
                e.preventDefault();
                const layouts = ['default', 'stage-right', 'focus-stage', 'stage-timeline', 'timeline-only', 'compact-left'];
                const idx = layouts.indexOf(this._currentLayout);
                const next = layouts[(idx + 1) % layouts.length];
                this.applyLayout(next);
                // Update dropdown active state
                dropdown.querySelectorAll('.layout-option').forEach(o => {
                    o.classList.toggle('active', o.dataset.layout === next);
                });
                Utils.showToast(`Layout: ${next.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}`, 'info');
            }
        });
    }

    applyLayout(layout) {
        const body = document.body;
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const stageContainer = document.getElementById('stage-container');
        const timelinePanel = document.getElementById('timeline-panel');
        const sceneBar = document.getElementById('scene-bar');
        const btnTimeline = document.getElementById('collapse-timeline');
        const gutterLeft = document.getElementById('gutter-left');
        const gutterRight = document.getElementById('gutter-right');
        const stageTimelineSplitter = document.getElementById('stage-timeline-splitter');
        const workspace = document.getElementById('workspace');
        const collapsedLeftBar = document.getElementById('collapsed-left-bar');
        const collapsedRightBar = document.getElementById('collapsed-right-bar');
        const btnLeft = document.getElementById('collapse-left');
        const btnRight = document.getElementById('collapse-right');
        body.classList.remove(
            'stage-left-rail-visible',
            'stage-right-rail-visible',
            'stage-left-rail-minimized',
            'stage-right-rail-minimized'
        );

        // Remove all layout classes
        body.classList.remove(
            'layout-default', 'layout-stage-right', 'layout-focus-stage',
            'layout-stage-timeline', 'layout-timeline-only', 'layout-compact-left'
        );

        // Reset inline visibility forcing from previous layout
        [leftPanel, rightPanel, stageContainer, timelinePanel, sceneBar, gutterLeft, gutterRight, stageTimelineSplitter].forEach(el => {
            if (el) el.style.display = '';
        });
        if (btnTimeline) btnTimeline.style.display = '';
        if (workspace) workspace.style.display = '';

        // Remove layout-hidden from all panels
        if (leftPanel) leftPanel.classList.remove('layout-hidden');
        if (rightPanel) rightPanel.classList.remove('layout-hidden');
        if (stageContainer) stageContainer.classList.remove('layout-hidden');
        if (timelinePanel) timelinePanel.classList.remove('layout-hidden');
        if (sceneBar) sceneBar.classList.remove('layout-hidden');

        // Helper: un-collapse a side panel (reverse what togglePanel does)
        const uncollapsePanel = (panel, btn, bar, side) => {
            if (!panel || !panel.classList.contains('collapsed')) return;
            panel.classList.remove('collapsed');
            panel.style.width = '';
            panel.style.minWidth = '';
            if (btn) {
                btn.classList.remove('is-collapsed');
                btn.style.opacity = '';
                btn.style.pointerEvents = '';
                const icon = btn.querySelector('i');
                if (icon) icon.className = side === 'left' ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
            }
            if (bar) {
                bar.classList.add('hidden');
                bar.classList.remove('minimized');
            }
            body.classList.remove(`stage-${side}-rail-visible`, `stage-${side}-rail-minimized`);
        };

        // Helper: un-collapse the timeline
        const uncollapseTimeline = () => {
            if (!timelinePanel || !timelinePanel.classList.contains('collapsed')) return;
            this.setTimelineCollapsedState(false);
        };

        // Apply new layout class
        body.classList.add(`layout-${layout}`);
        this._currentLayout = layout;

        switch (layout) {
            case 'default':
                // Everything visible — uncollapse all panels so they actually show
                uncollapsePanel(leftPanel, btnLeft, collapsedLeftBar, 'left');
                uncollapsePanel(rightPanel, btnRight, collapsedRightBar, 'right');
                uncollapseTimeline();
                break;

            case 'stage-right':
                // Hide left & right panels; stage left, timeline right side-by-side
                if (leftPanel) leftPanel.classList.add('layout-hidden');
                if (rightPanel) rightPanel.classList.add('layout-hidden');
                if (gutterLeft) gutterLeft.style.display = 'none';
                if (gutterRight) gutterRight.style.display = 'none';
                if (sceneBar) sceneBar.classList.add('layout-hidden');
                if (btnTimeline) btnTimeline.style.display = 'none';
                if (collapsedLeftBar) collapsedLeftBar.classList.add('hidden');
                if (collapsedRightBar) collapsedRightBar.classList.add('hidden');
                // Ensure timeline is uncollapsed so it renders
                uncollapseTimeline();
                break;

            case 'focus-stage':
                // Only stage visible
                if (leftPanel) leftPanel.classList.add('layout-hidden');
                if (rightPanel) rightPanel.classList.add('layout-hidden');
                if (gutterLeft) gutterLeft.style.display = 'none';
                if (gutterRight) gutterRight.style.display = 'none';
                if (timelinePanel) timelinePanel.classList.add('layout-hidden');
                if (sceneBar) sceneBar.classList.add('layout-hidden');
                if (btnTimeline) btnTimeline.style.display = 'none';
                if (collapsedLeftBar) collapsedLeftBar.classList.add('hidden');
                if (collapsedRightBar) collapsedRightBar.classList.add('hidden');
                break;

            case 'stage-timeline':
                // Stage + timeline, no side panels
                if (leftPanel) leftPanel.classList.add('layout-hidden');
                if (rightPanel) rightPanel.classList.add('layout-hidden');
                if (gutterLeft) gutterLeft.style.display = 'none';
                if (gutterRight) gutterRight.style.display = 'none';
                if (collapsedLeftBar) collapsedLeftBar.classList.add('hidden');
                if (collapsedRightBar) collapsedRightBar.classList.add('hidden');
                uncollapseTimeline();
                break;

            case 'compact-left':
                // Left panel visible, right panel hidden, timeline bottom
                uncollapsePanel(leftPanel, btnLeft, collapsedLeftBar, 'left');
                if (rightPanel) rightPanel.classList.add('layout-hidden');
                if (gutterRight) gutterRight.style.display = 'none';
                if (collapsedRightBar) collapsedRightBar.classList.add('hidden');
                uncollapseTimeline();
                break;

            case 'timeline-only':
                if (leftPanel) leftPanel.classList.add('layout-hidden');
                if (rightPanel) rightPanel.classList.add('layout-hidden');
                if (stageContainer) stageContainer.classList.add('layout-hidden');
                if (workspace) workspace.style.display = 'none';
                if (gutterLeft) gutterLeft.style.display = 'none';
                if (gutterRight) gutterRight.style.display = 'none';
                if (sceneBar) sceneBar.classList.add('layout-hidden');
                if (btnTimeline) btnTimeline.style.display = 'none';
                if (collapsedLeftBar) collapsedLeftBar.classList.add('hidden');
                if (collapsedRightBar) collapsedRightBar.classList.add('hidden');
                if (stageTimelineSplitter) stageTimelineSplitter.style.display = 'none';
                uncollapseTimeline();
                break;
        }

        // Update visibility checkboxes to match
        this._syncLayoutToggles();

        // Resize stage after layout transition
        setTimeout(() => {
            if (this.stage) {
                this.stage.resizeCanvas();
                if (!this.stage._userZoomed) this.stage.centerStage();
            }
        }, 350);
    }

    _setPanelVisible(panel, visible) {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const stageContainer = document.getElementById('stage-container');
        const timelinePanel = document.getElementById('timeline-panel');
        const sceneBar = document.getElementById('scene-bar');
        const gutterLeft = document.getElementById('gutter-left');
        const gutterRight = document.getElementById('gutter-right');
        const btnTimeline = document.getElementById('collapse-timeline');

        switch (panel) {
            case 'left':
                if (leftPanel) leftPanel.classList.toggle('layout-hidden', !visible);
                if (gutterLeft) gutterLeft.style.display = visible ? '' : 'none';
                break;
            case 'right':
                if (rightPanel) rightPanel.classList.toggle('layout-hidden', !visible);
                if (gutterRight) gutterRight.style.display = visible ? '' : 'none';
                break;
            case 'stage':
                if (stageContainer) stageContainer.classList.toggle('layout-hidden', !visible);
                break;
            case 'timeline':
                if (timelinePanel) timelinePanel.classList.toggle('layout-hidden', !visible);
                if (sceneBar) sceneBar.classList.toggle('layout-hidden', !visible);
                if (btnTimeline) btnTimeline.style.display = visible ? '' : 'none';
                break;
        }

        setTimeout(() => {
            if (this.stage) {
                this.stage.resizeCanvas();
                if (!this.stage._userZoomed) this.stage.centerStage();
            }
        }, 350);
    }

    _syncLayoutToggles() {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const stageContainer = document.getElementById('stage-container');
        const timelinePanel = document.getElementById('timeline-panel');

        const tLeft = document.getElementById('layout-toggle-left');
        const tRight = document.getElementById('layout-toggle-right');
        const tStage = document.getElementById('layout-toggle-stage');
        const tTimeline = document.getElementById('layout-toggle-timeline');

        if (tLeft) tLeft.checked = leftPanel && !leftPanel.classList.contains('layout-hidden');
        if (tRight) tRight.checked = rightPanel && !rightPanel.classList.contains('layout-hidden');
        if (tStage) tStage.checked = stageContainer && !stageContainer.classList.contains('layout-hidden');
        if (tTimeline) tTimeline.checked = timelinePanel && !timelinePanel.classList.contains('layout-hidden');
    }

    _setupPWA() {
        // Register service worker
        if ('serviceWorker' in navigator && globalThis.studioServiceWorkerEnabled === true) {
            navigator.serviceWorker.register(`./sw.js?v=${encodeURIComponent(window.__appAssetVersion || Date.now())}`).catch(() => {});
        }

        // Capture the beforeinstallprompt event
        let deferredPrompt = null;
        const installBtn = document.getElementById('btn-install-pwa');

        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            if (installBtn) installBtn.classList.remove('hidden');
        });

        if (installBtn) {
            installBtn.addEventListener('click', async () => {
                if (!deferredPrompt) {
                    // Fallback: show manual instructions
                    Utils.showToast('Use your browser menu → "Install Animation Stage" or "Add to Home Screen"', 'info');
                    return;
                }
                deferredPrompt.prompt();
                const { outcome } = await deferredPrompt.userChoice;
                if (outcome === 'accepted') {
                    Utils.showToast('App installed! You can now launch it from your desktop.', 'success');
                }
                deferredPrompt = null;
                installBtn.classList.add('hidden');
            });
        }

        // Hide button if app is already installed (standalone mode)
        window.addEventListener('appinstalled', () => {
            if (installBtn) installBtn.classList.add('hidden');
            deferredPrompt = null;
        });

        // If already running as standalone, hide the install button
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            if (installBtn) installBtn.classList.add('hidden');
        }
    }

    /** Wire up the group dropdown menus in the top toolbar. */
    _setupToolbarScrollHint() {
        const toolbar = document.getElementById('top-toolbar');
        const scrollTrack = toolbar?.querySelector('.toolbar-scroll-track');
        const nudge = document.getElementById('toolbar-scroll-nudge');
        const nudgeSeenKey = 'animstage_toolbar_scroll_nudge_seen';
        let nudgeTimeout = null;
        let hasShownNudge = false;
        const closeAll = (except = null) => {
            document.querySelectorAll('.tbr-dd-panel').forEach(panel => {
                if (panel === except) return;
                panel.classList.remove('open');
                const btn = document.querySelector(`.tbr-dd-btn[data-target="${panel.id}"]`);
                if (btn) btn.classList.remove('open');
            });
        };

        const hideNudge = () => {
            if (!nudge) return;
            nudge.classList.remove('visible');
            nudge.setAttribute('aria-hidden', 'true');
            if (nudgeTimeout) {
                clearTimeout(nudgeTimeout);
                nudgeTimeout = null;
            }
        };

        const maybeShowNudge = (canScroll) => {
            if (!toolbar || !scrollTrack || !nudge || !canScroll || hasShownNudge) return;
            if (!window.matchMedia('(max-width: 1024px), (pointer: coarse)').matches) return;
            try {
                if (localStorage.getItem(nudgeSeenKey) === '1') {
                    hasShownNudge = true;
                    return;
                }
            } catch (error) {
                // Ignore storage access problems and show the hint once for this session.
            }
            hasShownNudge = true;
            nudge.classList.add('visible');
            nudge.setAttribute('aria-hidden', 'false');
            try {
                localStorage.setItem(nudgeSeenKey, '1');
            } catch (error) {
                // Ignore storage write problems.
            }
            nudgeTimeout = window.setTimeout(() => {
                hideNudge();
            }, 2600);
        };

        const updateScrollHint = () => {
            if (!toolbar || !scrollTrack) return;
            const maxScrollLeft = Math.max(0, scrollTrack.scrollWidth - scrollTrack.clientWidth);
            const canScroll = maxScrollLeft > 4;
            toolbar.classList.toggle('toolbar-scrollable', canScroll);
            toolbar.classList.toggle('toolbar-can-scroll-left', canScroll && scrollTrack.scrollLeft > 4);
            toolbar.classList.toggle('toolbar-can-scroll-right', canScroll && scrollTrack.scrollLeft < maxScrollLeft - 4);
            if (!canScroll) {
                hideNudge();
                return;
            }
            maybeShowNudge(canScroll);
        };

        // Toggle each group panel
        document.querySelectorAll('.tbr-dd-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const panelId = btn.dataset.target;
                const panel = document.getElementById(panelId);
                if (!panel) return;
                const isOpen = panel.classList.contains('open');
                closeAll(); // close any other open panel
                if (!isOpen) {
                    const r = btn.getBoundingClientRect();
                    panel.style.top  = (r.bottom + 4) + 'px';
                    panel.style.left = Math.max(4, r.left) + 'px';
                    panel.classList.add('open');
                    btn.classList.add('open');
                } else {
                    btn.classList.remove('open');
                }
            });
        });

        // Close all when an action inside a panel is clicked (except layout-menu which has its own sub-dropdown)
        document.querySelectorAll('.tbr-dd-panel').forEach(panel => {
            panel.addEventListener('click', (e) => {
                const target = e.target.closest('button, a');
                if (!target || target.id === 'btn-layout-menu') return;
                closeAll();
            });
        });

        // Close all on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.tbr-dd-wrap')) {
                closeAll();
            }
        });

        if (scrollTrack) {
            scrollTrack.addEventListener('scroll', () => {
                hideNudge();
                updateScrollHint();
            }, { passive: true });
            window.addEventListener('resize', updateScrollHint);
            if (typeof ResizeObserver === 'function') {
                const observer = new ResizeObserver(updateScrollHint);
                observer.observe(scrollTrack);
            }
            requestAnimationFrame(updateScrollHint);
        }
    }

    /**
     * Show brief instructional labels beside collapsed panels on startup.
     * They fade in after a short delay, stay for a few seconds, then fade out.
     */
    _showPanelHints() {
        const hints = document.querySelectorAll('.cvbar-hint');
        if (hints.length === 0) return;

        // Fade in after panels have finished collapsing
        setTimeout(() => {
            hints.forEach(h => h.classList.add('visible'));
        }, 600);

        // Fade out after 8 seconds
        setTimeout(() => {
            hints.forEach(h => {
                h.classList.add('fade-out');
                h.classList.remove('visible');
            });
        }, 8600);

        // Remove from DOM after fade-out completes
        setTimeout(() => {
            hints.forEach(h => h.remove());
        }, 10200);
    }

    // === First-time onboarding overlay ===
    _showOnboarding() {
        if (localStorage.getItem('animstage_onboarded')) return;
        const overlay = document.createElement('div');
        overlay.className = 'onboarding-overlay';
        overlay.innerHTML = `
            <div class="onboarding-card">
                <h2>Welcome to Animation Stage</h2>
                <p>A powerful 2D animation & rigging environment right in your browser.</p>
                <ul class="onboarding-tips">
                    <li><i class="fas fa-shapes"></i> Add shapes, images and icons from the <strong>Tools</strong> panel (left)</li>
                    <li><i class="fas fa-magic"></i> Apply animations from the <strong>Animate</strong> tab (right)</li>
                    <li><i class="fas fa-bone"></i> Rig characters with the <strong>Joint System</strong></li>
                    <li><i class="fas fa-keyboard"></i> Press <kbd>Ctrl+/</kbd> to search any tool or button</li>
                    <li><i class="fas fa-save"></i> Your work autosaves every 60 seconds</li>
                </ul>
                <button class="btn-primary" id="onboarding-dismiss">Get Started</button>
            </div>`;
        document.body.appendChild(overlay);
        overlay.querySelector('#onboarding-dismiss').addEventListener('click', () => {
            localStorage.setItem('animstage_onboarded', '1');
            overlay.remove();
        });
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                localStorage.setItem('animstage_onboarded', '1');
                overlay.remove();
            }
        });
    }

    // === Autosave to localStorage every 60s ===
    _startAutosave() {
        if (this._autosaveInterval) clearInterval(this._autosaveInterval);
        if (this._autosaveDebounce) clearTimeout(this._autosaveDebounce);

        // Unsubscribe a previous history listener if _startAutosave is called again
        // (e.g. after clearAll/load) — otherwise every reload doubles the listener count.
        if (typeof this._autosaveHistoryUnsub === 'function') {
            try { this._autosaveHistoryUnsub(); } catch (_) {}
            this._autosaveHistoryUnsub = null;
        }
        this._autosaveHistoryUnsub = eventBus.on('history:push', () => {
            if (!this.autosave) return;
            this._scheduleAutosave(1200);
        });

        if (this._autosaveBoundSave) {
            window.removeEventListener('beforeunload', this._autosaveBoundSave);
        }
        this._autosaveBoundSave = () => {
            if (this.autosave) this._runAutosave({ force: true });
        };
        window.addEventListener('beforeunload', this._autosaveBoundSave);

        this._autosaveInterval = setInterval(() => {
            this._runAutosave();
        }, 60000);

        // On startup, offer to restore the most recent autosave from IDB or localStorage.
        this._offerAutosaveRestore();
    }

    async _offerAutosaveRestore() {
        let saved = null;
        let savedTime = null;
        let source = 'local';

        // Prefer IDB (no 5 MB cap, supports large projects).
        try {
            if (window.StorageIDB && StorageIDB.isAvailable()) {
                const rec = await StorageIDB.get('autosaves', 'current');
                if (rec && rec.json && rec.savedAt) {
                    saved = rec.json;
                    savedTime = rec.savedAt;
                    source = 'idb';
                }
            }
        } catch (e) { /* fall through to localStorage */ }

        try {
            if (saved) JSON.parse(saved);
        } catch (_) { saved = null; savedTime = null; }
        try {
            const local = localStorage.getItem('animstage_autosave');
            const time = Number(localStorage.getItem('animstage_autosave_time'));
            if (local && time && (!saved || time > Number(savedTime))) {
                JSON.parse(local);
                saved = local; savedTime = time; source = 'local';
            }
        } catch (_) { /* Keep the valid IDB recovery when local storage is unavailable. */ }

        if (!saved || !savedTime) return;
        const age = Date.now() - savedTime;
        if (age >= 24 * 60 * 60 * 1000) return; // older than 24h — drop

        const when = new Date(savedTime).toLocaleTimeString();
        setTimeout(() => {
            Utils.showConfirm(
                `An autosaved project from ${when} was found. Would you like to restore it?`,
                'Restore Autosave'
            ).then(yes => {
                if (yes && this.exporter) {
                    try {
                        const data = JSON.parse(saved);
                        this.exporter.deserializeProject(data);
                        Utils.showToast(`Autosaved project restored (${source === 'idb' ? 'IndexedDB' : 'local'})`, 'success');
                    } catch (e) {
                        Utils.showToast('Failed to restore autosave', 'error');
                    }
                }
            });
        }, 1500);
    }

    _scheduleAutosave(delay = 1000) {
        if (this._autosaveDebounce) clearTimeout(this._autosaveDebounce);
        this._autosaveDebounce = setTimeout(() => {
            this._autosaveDebounce = null;
            this._runAutosave();
        }, Math.max(0, delay));
    }

    _hasActiveRealtimePlayback() {
        if (this.jointSystem?._armatureRecordingBusy || this.jointSystem?._armatureClipPreview) return true;
        if (this.animations?.isPlaying === true) return true;
        if (this.jointSystem?._armatureAnim != null || this.jointSystem?._armaturePlayingKey) return true;
        return (this.objects?.objects || []).some(obj =>
            obj?._poseArmatureAnim != null || !!obj?._poseArmaturePlayingKey
        );
    }

    _runAutosave(options = {}) {
        if (this._autosaveInFlight) {
            this._scheduleAutosave(750);
            return this._autosaveInFlight;
        }
        try {
            if (!this.autosave) return false;
            if (!this.exporter) return false;
            if (this.animations?._exportingVideo === true || this.jointSystem?._armatureRecordingBusy || this.jointSystem?._armatureClipPreview) {
                // Export temporarily swaps scenes and poses. Even a forced save
                // must wait until the editor's actual project is restored.
                this._scheduleAutosave(750);
                return false;
            }
            if (options?.force !== true && this._hasActiveRealtimePlayback()) {
                // Serializing SVG-heavy scenes can block the main thread long enough
                // to skip a stride. Save the settled scene shortly after playback.
                this._scheduleAutosave(750);
                return false;
            }
            const project = this.exporter.serializeProject();
            const json = JSON.stringify(project);
            const savedAt = Date.now();

            this._autosaveInFlight = this._persistAutosave(json, savedAt)
                .finally(() => { this._autosaveInFlight = null; });
            return this._autosaveInFlight;
        } catch (e) {
            console.warn('[Autosave] Failed:', e.message);
            this._lastAutosaveError = true;
            this._updateAutosaveIndicator(false);
            return false;
        }
    }

    async _persistAutosave(json, savedAt) {
        try {
            let stored = false;
            if (window.StorageIDB && StorageIDB.isAvailable()) {
                try {
                    await StorageIDB.put('autosaves', 'current', { json, savedAt });
                    stored = true;
                } catch (err) { console.warn('[Autosave] IDB write failed:', err.message); }
            }

            // Fallback / fast-path mirror to localStorage when small enough.
            if (json.length <= 5 * 1024 * 1024) {
                try {
                    localStorage.setItem('animstage_autosave', json);
                    localStorage.setItem('animstage_autosave_time', savedAt.toString());
                    stored = true;
                } catch (qe) {
                    // Quota exceeded — IDB still has the canonical copy.
                }
            } else if (stored) {
                // Project is too big for localStorage; clear stale snapshot so restore prefers IDB.
                try {
                    localStorage.removeItem('animstage_autosave');
                    localStorage.removeItem('animstage_autosave_time');
                } catch (e) { /* ignore */ }
            }
            if (!stored) throw new Error('No storage backend accepted the project. Download a project copy.');
            this._lastAutosaveAt = savedAt;
            this._lastAutosaveError = false;
            this._updateAutosaveIndicator(true);
            return true;
        } catch (e) {
            console.warn('[Autosave] Failed:', e.message);
            this._lastAutosaveError = true;
            this._updateAutosaveIndicator(false);
            return false;
        }
    }

    // Render the topbar autosave indicator. `justSaved` flashes a "Saving..." pulse,
    // then a recurring ticker shows "Saved Xs/Xm ago".
    _updateAutosaveIndicator(justSaved) {
        const el = document.getElementById('autosave-indicator');
        if (!el) return;
        if (!this.autosave) {
            el.textContent = '';
            el.className = 'autosave-indicator';
            return;
        }
        if (this._lastAutosaveError) {
            el.className = 'autosave-indicator error';
            el.innerHTML = '<i class="fas fa-triangle-exclamation"></i> <span class="label-text">Save failed</span>';
            return;
        }
        if (!this._lastAutosaveAt) {
            el.className = 'autosave-indicator';
            el.innerHTML = '';
            return;
        }
        const ago = Date.now() - this._lastAutosaveAt;
        let text;
        if (justSaved || ago < 3000) text = 'Saved just now';
        else if (ago < 60000) text = `Saved ${Math.floor(ago / 1000)}s ago`;
        else if (ago < 3600000) text = `Saved ${Math.floor(ago / 60000)}m ago`;
        else text = `Saved ${Math.floor(ago / 3600000)}h ago`;
        el.className = 'autosave-indicator saved';
        el.innerHTML = `<i class="fas fa-check-circle"></i> <span class="label-text">${text}</span>`;
        // Lazy-start the refresh ticker once
        if (!this._autosaveTickerInterval) {
            this._autosaveTickerInterval = setInterval(() => this._updateAutosaveIndicator(false), 5000);
        }
    }

    _loadSettingsFromStorage() {
        let saved = null;
        try {
            saved = JSON.parse(localStorage.getItem('animstage_settings') || 'null');
        } catch (e) {
            saved = null;
        }
        if (!saved || typeof saved !== 'object') return;

        this.theme = saved.theme === 'light' ? 'light' : 'dark';
        this.autosave = saved.autosave !== false;
        this.aiProvider = saved.aiProvider || 'builtin';
        this.aiApiKey = saved.aiApiKey || '';
        this.aiEndpoint = saved.aiEndpoint || '';
        this.hwAccel = saved.hwAccel !== false;
        this.maxObjects = Number.isFinite(saved.maxObjects) ? saved.maxObjects : 500;
    }

    _persistSettingsToStorage() {
        try {
            localStorage.setItem('animstage_settings', JSON.stringify({
                theme: this.theme || (document.body.classList.contains('light-mode') ? 'light' : 'dark'),
                autosave: this.autosave !== false,
                aiProvider: this.aiProvider || 'builtin',
                aiApiKey: this.aiApiKey || '',
                aiEndpoint: this.aiEndpoint || '',
                hwAccel: this.hwAccel !== false,
                maxObjects: Number.isFinite(this.maxObjects) ? this.maxObjects : 500
            }));
        } catch (e) {
            console.warn('[Settings] Failed to persist settings:', e.message);
        }
    }

    // === Recording indicator ===
    _setupRecordingIndicator() {
        // Insert indicator dot next to the Props tab
        const propsTab = document.querySelector('.panel-tab[data-tab="properties"]');
        if (propsTab) {
            const indicator = document.createElement('span');
            indicator.className = 'recording-indicator';
            indicator.id = 'rec-indicator';
            indicator.innerHTML = '<span class="rec-dot"></span> REC';
            propsTab.appendChild(indicator);
        }
        eventBus.on('recording:start', () => {
            document.getElementById('rec-indicator')?.classList.add('active');
        });
        eventBus.on('recording:stop', () => {
            document.getElementById('rec-indicator')?.classList.remove('active');
        });
    }

    // === Collapse all panels at startup ===
    collapseAllPanelsOnStartup() {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');

        // Clear mobile overlays first so startup never opens a side panel on small screens.
        leftPanel?.classList.remove('mobile-open');
        rightPanel?.classList.remove('mobile-open');

        // Collapse left panel
        const btnLeft = document.getElementById('collapse-left');
        if (window.innerWidth > 700 && btnLeft && leftPanel && !leftPanel.classList.contains('collapsed')) {
            btnLeft.click();
        }

        // Collapse right panel
        const btnRight = document.getElementById('collapse-right');
        if (window.innerWidth > 700 && btnRight && rightPanel && !rightPanel.classList.contains('collapsed')) {
            btnRight.click();
        }

        // Collapse timeline
        const timelinePanel = document.getElementById('timeline-panel');
        if (timelinePanel && !timelinePanel.classList.contains('collapsed')) {
            this.setTimelineCollapsedState(true);
        }
    }

    setTimelineCollapsedState(collapsed) {
        const timelinePanel = document.getElementById('timeline-panel');
        const btnTimeline = document.getElementById('collapse-timeline');
        const workspace = document.getElementById('workspace');
        if (!timelinePanel) return;

        const collapsedHeight = getComputedStyle(document.documentElement).getPropertyValue('--timeline-collapsed-height').trim() || '46px';
        timelinePanel.classList.toggle('collapsed', collapsed);

        if (btnTimeline) {
            btnTimeline.classList.toggle('is-collapsed', collapsed);
            const icon = btnTimeline.querySelector('i');
            const label = btnTimeline.querySelector('.tl-collapse-label');
            if (collapsed) {
                const currentHeight = getComputedStyle(document.documentElement).getPropertyValue('--timeline-height').trim();
                if (currentHeight && currentHeight !== collapsedHeight) {
                    this._savedTimelineHeight = currentHeight;
                }
                document.documentElement.style.setProperty('--timeline-height', collapsedHeight);
                if (icon) icon.className = 'fas fa-chevron-up';
                if (label) label.textContent = 'Expand Timeline';
            } else {
                document.documentElement.style.setProperty('--timeline-height', this._savedTimelineHeight || '200px');
                if (icon) icon.className = 'fas fa-chevron-down';
                if (label) label.textContent = 'Hide Timeline';
            }
        }

        if (workspace) {
            workspace.style.height = '';
        }

        setTimeout(() => {
            if (this.stage) {
                this.stage.resizeCanvas();
                if (!this.stage._userZoomed) {
                    this.stage.centerStage();
                }
            }
        }, 350);
    }

    // === Panel Tab Switching ===

    setupPanelTabs() {
        // Left panel tabs
        document.querySelectorAll('#left-panel .panel-tabs .panel-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchLeftTab(tab);
            });
        });

        // Right panel tabs
        document.querySelectorAll('#right-panel .panel-tabs .panel-tab').forEach(btn => {
            btn.addEventListener('click', () => {
                const tab = btn.dataset.tab;
                this.switchRightTab(tab);
            });
        });

        // Animation sub-tabs (Basic / Properties / Advanced)
        this.setupAnimSubtabs();
    }

    setupAnimSubtabs() {
        const subtabs = document.querySelectorAll('.anim-subtab');
        const subtabContents = document.querySelectorAll('.anim-subtab-content');
        subtabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.dataset.subtab;
                subtabs.forEach(t => t.classList.toggle('active', t.dataset.subtab === target));
                subtabContents.forEach(c => c.classList.toggle('active', c.dataset.subtabContent === target));
                const search = document.getElementById('anim-search-input');
                if (search) search.value = '';
                if (this.animations) {
                    this.animations.activeAnimationFilter = 'all';
                    this.animations.activeEffectGroup = 'all';
                    try { localStorage.setItem('animationStage.effectGroup.v1', 'all'); } catch (_) {}
                    document.querySelectorAll('.anim-filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.animFilter === 'all'));
                    document.querySelectorAll('.anim-effect-group-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.effectGroup === 'all'));
                    this.animations.filterAnimations('');
                } else {
                    document.getElementById('basic-animations')?.classList.remove('search-active');
                    document.querySelectorAll('.anim-category:not(.hidden)').forEach(cat => { cat.style.display = ''; });
                    document.querySelectorAll('.anim-btn[data-anim]').forEach(btn => { btn.style.display = ''; });
                }
            });
        });
    }

    // === Collapsible & Resizable Panels ===

    setupCollapsiblePanels() {
        const leftPanel = document.getElementById('left-panel');
        const rightPanel = document.getElementById('right-panel');
        const timelinePanel = document.getElementById('timeline-panel');
        const workspace = document.getElementById('workspace');
        const gutterLeft = document.getElementById('gutter-left');
        const gutterRight = document.getElementById('gutter-right');
        const stageTimelineSplitter = document.getElementById('stage-timeline-splitter');
        const timelineLabelResize = document.getElementById('timeline-label-resize');
        const btnLeft = document.getElementById('collapse-left');
        const btnRight = document.getElementById('collapse-right');
        const btnTimeline = document.getElementById('collapse-timeline');

        // Track panel widths for restore after collapse
        this.panelWidths = {
            left: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-width')) || 280,
            right: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--panel-width')) || 280,
            timelineLabels: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--timeline-label-width')) || 140,
            stageRightStage: parseInt(getComputedStyle(document.documentElement).getPropertyValue('--stage-right-stage-width')) || Math.round(window.innerWidth * 0.5),
            minWidth: 160,
            maxWidth: 500,
            timelineLabelMinWidth: 120,
            timelineLabelMaxWidth: 420,
            stageRightMinWidth: 320,
            stageRightMaxWidth: 1200
        };

        document.documentElement.style.setProperty('--timeline-label-width', `${this.panelWidths.timelineLabels}px`);
        document.documentElement.style.setProperty('--stage-right-stage-width', `${this.panelWidths.stageRightStage}px`);

        const resizeStage = () => {
            setTimeout(() => {
                if (this.stage) {
                    this.stage.resizeCanvas();
                    // Auto-fit stage to view unless user has manually zoomed/focused
                    if (!this.stage._userZoomed) {
                        this.stage.centerStage();
                    }
                }
            }, 350);
        };

        const recalcWorkspaceHeight = () => {
            // With flex layout, just clear any inline styles
            workspace.style.height = '';
        };

        // --- Collapse/Expand ---
        // --- Vertical sidebar bars (left: tools, right: animations) ---
        const collapsedLeftBar = document.getElementById('collapsed-left-bar');
        const collapsedRightBar = document.getElementById('collapsed-right-bar');

        const syncVerticalBarState = (side, bar) => {
            if (!bar) return;
            const visible = !bar.classList.contains('hidden');
            const minimized = visible && bar.classList.contains('minimized');
            document.body.classList.toggle(`stage-${side}-rail-visible`, visible);
            document.body.classList.toggle(`stage-${side}-rail-minimized`, minimized);
        };

        const updateVerticalBar = (bar, isCollapsed) => {
            if (!bar) return;
            // Determine which toggle button to hide/show
            const side = bar.id === 'collapsed-left-bar' ? 'left' : 'right';
            const toggleBtn = side === 'left' ? btnLeft : btnRight;
            if (isCollapsed) {
                bar.classList.remove('hidden');
                bar.classList.remove('minimized');
                if (toggleBtn) toggleBtn.style.opacity = '0';
                if (toggleBtn) toggleBtn.style.pointerEvents = 'none';
            } else {
                bar.classList.add('hidden');
                if (toggleBtn) toggleBtn.style.opacity = '';
                if (toggleBtn) toggleBtn.style.pointerEvents = '';
            }
            syncVerticalBarState(side, bar);
        };

        // --- Left vertical bar: minimize/expand/click handlers ---
        if (collapsedLeftBar) {
            // Minimize button
            const minimizeLeftBtn = document.getElementById('cvbar-minimize-left');
            if (minimizeLeftBtn) {
                minimizeLeftBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    collapsedLeftBar.classList.add('minimized');
                    // Show toggle button when bar is minimized
                    if (btnLeft) { btnLeft.style.opacity = ''; btnLeft.style.pointerEvents = ''; }
                    syncVerticalBarState('left', collapsedLeftBar);
                });
            }
            // Click minimized strip to re-expand
            collapsedLeftBar.addEventListener('click', (e) => {
                if (collapsedLeftBar.classList.contains('minimized')) {
                    collapsedLeftBar.classList.remove('minimized');
                    if (btnLeft) { btnLeft.style.opacity = '0'; btnLeft.style.pointerEvents = 'none'; }
                    syncVerticalBarState('left', collapsedLeftBar);
                }
            });
            // Expand panel button
            const expandLeftBtn = document.getElementById('cvbar-expand-left');
            if (expandLeftBtn) {
                expandLeftBtn.addEventListener('click', () => {
                    if (leftPanel.classList.contains('collapsed')) {
                        togglePanel(leftPanel, btnLeft, 'left');
                    }
                });
            }
            // Tool clicks
            collapsedLeftBar.querySelectorAll('.cvbar-btn[data-tool]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tool = btn.dataset.tool;
                    collapsedLeftBar.querySelectorAll('.cvbar-btn[data-tool]').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    const panelBtn = leftPanel.querySelector(`.tool-btn[data-tool="${tool}"]`);
                    if (panelBtn) panelBtn.click();
                });
            });
            // Delete button
            const deleteBtn = document.getElementById('cvbar-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', () => {
                    const selected = this.objects.getSelectedObjects();
                    if (selected.length > 0) {
                        selected.forEach(obj => this.objects.removeObject(obj.id));
                    }
                });
            }
            // View tab shortcuts (expand left panel and switch tab)
            collapsedLeftBar.querySelectorAll('.cvbar-tab-btn[data-open-tab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabName = btn.dataset.openTab;
                    if (leftPanel.classList.contains('collapsed')) {
                        togglePanel(leftPanel, btnLeft, 'left');
                    }
                    const tabBtn = leftPanel.querySelector(`.panel-tab[data-tab="${tabName}"]`);
                    if (tabBtn) tabBtn.click();
                });
            });
        }

        // Sync active tool highlight to left vertical bar
        eventBus.on('tool:changed', (toolName) => {
            if (collapsedLeftBar) {
                collapsedLeftBar.querySelectorAll('.cvbar-btn[data-tool]').forEach(b => {
                    b.classList.toggle('active', b.dataset.tool === toolName);
                });
            }
        });

        // --- Right vertical bar: minimize/expand/click handlers ---
        if (collapsedRightBar) {
            // Minimize button
            const minimizeRightBtn = document.getElementById('cvbar-minimize-right');
            if (minimizeRightBtn) {
                minimizeRightBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    collapsedRightBar.classList.add('minimized');
                    if (btnRight) { btnRight.style.opacity = ''; btnRight.style.pointerEvents = ''; }
                    syncVerticalBarState('right', collapsedRightBar);
                });
            }
            // Click minimized strip to re-expand
            collapsedRightBar.addEventListener('click', (e) => {
                if (collapsedRightBar.classList.contains('minimized')) {
                    collapsedRightBar.classList.remove('minimized');
                    if (btnRight) { btnRight.style.opacity = '0'; btnRight.style.pointerEvents = 'none'; }
                    syncVerticalBarState('right', collapsedRightBar);
                }
            });
            // Expand panel button
            const expandRightBtn = document.getElementById('cvbar-expand-right');
            if (expandRightBtn) {
                expandRightBtn.addEventListener('click', () => {
                    if (rightPanel.classList.contains('collapsed')) {
                        togglePanel(rightPanel, btnRight, 'right');
                    }
                });
            }
            // Animation category clicks: expand right panel, switch to Animate tab, scroll to category
            collapsedRightBar.querySelectorAll('.cvbar-btn[data-anim-category]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const category = btn.dataset.animCategory;
                    // Expand right panel if collapsed
                    if (rightPanel.classList.contains('collapsed')) {
                        togglePanel(rightPanel, btnRight, 'right');
                    }
                    // Switch to Animate tab
                    const animTab = rightPanel.querySelector('.panel-tab[data-tab="animations"]');
                    if (animTab) animTab.click();
                    // Determine which sub-tab this category belongs to and switch to it
                    const basicCategories = ['entry', 'exit', 'emphasis'];
                    const propCategories = ['movement', 'rotation', 'scale', 'opacity', 'text'];
                    let targetSubtab = 'advanced';
                    if (basicCategories.includes(category)) targetSubtab = 'basic';
                    else if (propCategories.includes(category)) targetSubtab = 'properties';
                    const subtabBtn = document.querySelector(`.anim-subtab[data-subtab="${targetSubtab}"]`);
                    if (subtabBtn) subtabBtn.click();
                    // Scroll the category into view after a brief delay for panel to expand
                    setTimeout(() => {
                        const categoryEl = rightPanel.querySelector(`.anim-category[data-category="${category}"]`);
                        if (categoryEl) {
                            categoryEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            // Briefly highlight the category
                            categoryEl.style.transition = 'background 0.3s ease';
                            categoryEl.style.background = 'rgba(99, 102, 241, 0.15)';
                            setTimeout(() => { categoryEl.style.background = ''; }, 1200);
                        }
                    }, 350);
                });
            });
            // Right panel tab shortcuts (expand and switch tab)
            collapsedRightBar.querySelectorAll('.cvbar-tab-btn[data-open-rtab]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const tabName = btn.dataset.openRtab;
                    if (rightPanel.classList.contains('collapsed')) {
                        togglePanel(rightPanel, btnRight, 'right');
                    }
                    const tabBtn = rightPanel.querySelector(`.panel-tab[data-tab="${tabName}"]`);
                    if (tabBtn) tabBtn.click();
                });
            });
        }

        const togglePanel = (panel, btn, side) => {
            const isCollapsed = panel.classList.toggle('collapsed');
            const icon = btn.querySelector('i');

            if (isCollapsed) {
                // Save current width before collapsing
                const currentWidth = panel.offsetWidth;
                if (currentWidth > 0) this.panelWidths[side] = currentWidth;
                btn.classList.add('is-collapsed');
                // Flip chevron to point outward (toward expand direction)
                if (side === 'left') {
                    icon.className = 'fas fa-chevron-right';
                } else {
                    icon.className = 'fas fa-chevron-left';
                }
            } else {
                btn.classList.remove('is-collapsed');
                // Restore saved width
                panel.style.width = this.panelWidths[side] + 'px';
                panel.style.minWidth = this.panelWidths[side] + 'px';
                // Restore chevron to point inward (toward collapse direction)
                if (side === 'left') {
                    icon.className = 'fas fa-chevron-left';
                } else {
                    icon.className = 'fas fa-chevron-right';
                }
            }

            // Show/hide vertical bars when panels toggle
            if (side === 'left') {
                updateVerticalBar(collapsedLeftBar, isCollapsed);
            } else if (side === 'right') {
                updateVerticalBar(collapsedRightBar, isCollapsed);
            }

            resizeStage();
        };

        if (btnLeft) {
            btnLeft.addEventListener('click', () => {
                // On narrow screens, toggle mobile-open overlay instead
                if (window.innerWidth <= 700) {
                    leftPanel.classList.toggle('mobile-open');
                    rightPanel.classList.remove('mobile-open');
                    return;
                }
                togglePanel(leftPanel, btnLeft, 'left');
            });
        }
        if (btnRight) {
            btnRight.addEventListener('click', () => {
                if (window.innerWidth <= 700) {
                    rightPanel.classList.toggle('mobile-open');
                    leftPanel.classList.remove('mobile-open');
                    return;
                }
                togglePanel(rightPanel, btnRight, 'right');
            });
        }

        if (btnTimeline) {
            btnTimeline.addEventListener('click', (e) => {
                e.stopPropagation();
                this.setTimelineCollapsedState(!timelinePanel.classList.contains('collapsed'));
            });
        }

        // --- Drag-to-Resize Panels ---
        const setupGutterDrag = (gutter, panel, side) => {
            let startX, startWidth, isDragging = false;

            const onMouseDown = (e) => {
                if (panel.classList.contains('collapsed')) return;

                isDragging = true;
                startX = e.clientX;
                startWidth = panel.offsetWidth;
                document.body.classList.add('panel-resizing');
                panel.style.transition = 'none';

                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            };

            const onMouseMove = (e) => {
                if (!isDragging) return;
                const dx = e.clientX - startX;
                let newWidth;
                if (side === 'left') {
                    newWidth = startWidth + dx;
                } else {
                    newWidth = startWidth - dx;
                }
                newWidth = Math.max(this.panelWidths.minWidth, Math.min(this.panelWidths.maxWidth, newWidth));
                panel.style.width = newWidth + 'px';
                panel.style.minWidth = newWidth + 'px';
                if (this.stage) this.stage.resizeCanvas();
            };

            const onMouseUp = () => {
                if (!isDragging) return;
                isDragging = false;
                document.body.classList.remove('panel-resizing');
                panel.style.transition = '';
                this.panelWidths[side] = panel.offsetWidth;
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (this.stage) this.stage.resizeCanvas();
            };

            gutter.addEventListener('mousedown', onMouseDown);
        };

        if (gutterLeft) setupGutterDrag(gutterLeft, leftPanel, 'left');
        if (gutterRight) setupGutterDrag(gutterRight, rightPanel, 'right');

        const setupCssVarDrag = (handle, options) => {
            if (!handle) return;

            let startX = 0;
            let startValue = 0;
            let isDragging = false;

            const onMouseMove = (e) => {
                if (!isDragging) return;
                const delta = e.clientX - startX;
                const rawValue = options.direction === 'decrease-with-delta' ? startValue - delta : startValue + delta;
                const nextValue = Math.max(options.min, Math.min(options.max, rawValue));
                document.documentElement.style.setProperty(options.cssVar, `${nextValue}px`);
                if (options.stateKey) this.panelWidths[options.stateKey] = nextValue;
                if (options.onChange) options.onChange(nextValue);
            };

            const onMouseUp = () => {
                if (!isDragging) return;
                isDragging = false;
                document.body.classList.remove('panel-resizing');
                document.removeEventListener('mousemove', onMouseMove);
                document.removeEventListener('mouseup', onMouseUp);
                if (options.onEnd) options.onEnd();
            };

            handle.addEventListener('mousedown', (e) => {
                if (options.allowWhen && !options.allowWhen()) return;
                isDragging = true;
                startX = e.clientX;
                startValue = parseInt(getComputedStyle(document.documentElement).getPropertyValue(options.cssVar)) || options.fallback;
                document.body.classList.add('panel-resizing');
                document.addEventListener('mousemove', onMouseMove);
                document.addEventListener('mouseup', onMouseUp);
                e.preventDefault();
            });
        };

        setupCssVarDrag(timelineLabelResize, {
            cssVar: '--timeline-label-width',
            stateKey: 'timelineLabels',
            min: this.panelWidths.timelineLabelMinWidth,
            max: this.panelWidths.timelineLabelMaxWidth,
            fallback: this.panelWidths.timelineLabels,
            direction: 'increase-with-delta'
        });

        setupCssVarDrag(stageTimelineSplitter, {
            cssVar: '--stage-right-stage-width',
            stateKey: 'stageRightStage',
            min: this.panelWidths.stageRightMinWidth,
            max: Math.max(this.panelWidths.stageRightMinWidth, window.innerWidth - 420),
            fallback: this.panelWidths.stageRightStage,
            direction: 'increase-with-delta',
            allowWhen: () => document.body.classList.contains('layout-stage-right'),
            onChange: () => {
                if (this.stage) this.stage.resizeCanvas();
            },
            onEnd: () => {
                if (this.stage) this.stage.resizeCanvas();
            }
        });

        // --- Keyboard shortcuts ---
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select, [contenteditable]')) return;

            if (e.key === '[') {
                e.preventDefault();
                togglePanel(leftPanel, btnLeft, 'left');
            } else if (e.key === ']') {
                e.preventDefault();
                togglePanel(rightPanel, btnRight, 'right');
            } else if (e.key === '\\') {
                e.preventDefault();
                this.setTimelineCollapsedState(!timelinePanel.classList.contains('collapsed'));
            }
        });
    }

    switchLeftTab(tab) {
        document.querySelectorAll('#left-panel .panel-tabs .panel-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('#left-panel .panel-content').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
        this.activeLeftTab = tab;

        if (tab === 'objects' || tab === 'layers') {
            this.objects.updateObjectList();
        }
    }

    switchRightTab(tab) {
        document.querySelectorAll('#right-panel .panel-tabs .panel-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
        document.querySelectorAll('#right-panel .panel-content').forEach(p => p.classList.toggle('active', p.id === `tab-${tab}`));
        this.activeRightTab = tab;

        if (tab === 'properties') {
            this.objects.updateProperties();
        }

        if (tab === 'animations') {
            this.animations.updateAppliedAnimationsList();
        }
        if (tab === 'tags') {
            this.tags.updatePositionTagsUI();
            this.tags.updateZoneTagsUI();
        }
        if (tab === 'code') {
            this.animations.updateCodeOutput();
        }
    }

    // === Mode Toggle ===

    setupModeToggle() {
        const modeSelect = document.getElementById('mode-select');
        if (!modeSelect) return;

        modeSelect.addEventListener('change', () => {
            const requestedMode = modeSelect.value;
            if (requestedMode === 'smartart') {
                modeSelect.value = this.mode === 'ai' ? 'ai' : 'basic';
                this.openSmartArtWorkspace();
                return;
            }

            this.mode = requestedMode;
            this._lastStageMode = this.mode === 'ai' ? 'ai' : 'basic';
            this.applyMode();
        });
    }

    applyMode() {
        const body = document.body;
        const modeSelect = document.getElementById('mode-select');
        const modeWrapper = document.getElementById('mode-toggle');
        const modeIcon = document.getElementById('mode-select-icon');
        const effectiveMode = this.mode === 'smartart'
            ? (this._lastStageMode === 'ai' ? 'ai' : 'basic')
            : this.mode;

        this._lastStageMode = effectiveMode === 'ai' ? 'ai' : 'basic';

        if (modeSelect) modeSelect.value = effectiveMode;

        if (modeWrapper) {
            modeWrapper.classList.toggle('ai-active', effectiveMode === 'ai');
        }
        if (modeIcon) {
            modeIcon.className = effectiveMode === 'ai'
                ? 'fas fa-brain mode-select-icon'
                : 'fas fa-puzzle-piece mode-select-icon';
        }

        const basicPanel = document.getElementById('basic-animations');
        const aiPanel = document.getElementById('ai-animations');

        if (effectiveMode === 'ai') {
            body.classList.add('ai-mode');
            this.ai.activate();

            // Toggle animation panels
            if (basicPanel) basicPanel.classList.add('hidden');
            if (aiPanel) aiPanel.classList.remove('hidden');

            // Auto-switch to Animate tab so user sees the prompt
            const animTab = document.querySelector('.panel-tab[data-tab="animations"]');
            if (animTab) animTab.click();
        } else {
            body.classList.remove('ai-mode');
            this.ai.deactivate();

            // Toggle animation panels
            if (basicPanel) basicPanel.classList.remove('hidden');
            if (aiPanel) aiPanel.classList.add('hidden');
        }

        this._updateWorkspaceStatusIndicator(effectiveMode);
        eventBus.emit('mode:changed', effectiveMode);
    }

    _updateWorkspaceStatusIndicator(mode = null) {
        const indicator = document.getElementById('workspace-status-pill');
        if (!indicator) return;

        const effectiveMode = mode || (this.mode === 'smartart'
            ? (this._lastStageMode === 'ai' ? 'ai' : 'basic')
            : this.mode);
        const modeLabel = effectiveMode === 'ai' ? 'AI workspace' : 'Basic workspace';

        indicator.textContent = this._workspaceSyncedFromSmartArt
            ? `${modeLabel} · Synced with SmartArt`
            : modeLabel;
        indicator.classList.toggle('is-ai', effectiveMode === 'ai');
        indicator.classList.toggle('is-synced', this._workspaceSyncedFromSmartArt);
        indicator.title = this._workspaceSyncedFromSmartArt
            ? 'Current stage workspace restored or updated from SmartArt'
            : 'Current stage workspace';
    }

    // === Toolbar ===

    setupToolbar() {
        // Undo/Redo buttons
        document.getElementById('btn-undo')?.addEventListener('click', () => {
            this.history.undo();
            this._updateStageZOrderControls();
        });
        document.getElementById('btn-redo')?.addEventListener('click', () => {
            this.history.redo();
            this._updateStageZOrderControls();
        });
        const specialUndoLast = () => {
            const input = document.getElementById('special-undo-count');
            const requested = Math.max(1, Math.floor(Number(input?.value) || 1));
            const result = this.history.undoMany(requested);
            this._updateStageZOrderControls();
            if (result?.steps > 0) {
                Utils.showToast(`Undid ${result.steps} step${result.steps === 1 ? '' : 's'}`, 'success');
            } else {
                Utils.showToast('Nothing to undo', 'info');
            }
        };
        document.getElementById('btn-special-undo-last')?.addEventListener('click', specialUndoLast);
        document.getElementById('special-undo-count')?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                specialUndoLast();
            }
        });
        document.getElementById('btn-special-undo-all')?.addEventListener('click', () => {
            const result = this.history.undoAll();
            this._updateStageZOrderControls();
            if (result?.steps > 0) {
                Utils.showToast(`Undid all available history (${result.steps} step${result.steps === 1 ? '' : 's'})`, 'success');
            } else {
                Utils.showToast('Nothing to undo', 'info');
            }
        });
        document.getElementById('btn-smartart')?.addEventListener('click', (event) => {
            event.preventDefault();
            this.openSmartArtWorkspace();
        });

        const stageUserName = document.getElementById('stage-user-name');
        if (stageUserName) {
            stageUserName.textContent = window.__STAGE_USER?.name || window.__STAGE_USER?.email || 'User';
        }

        // Refresh button — sync all panels and clean up stale references
        document.getElementById('btn-refresh')?.addEventListener('click', () => this.refreshAll());

        document.getElementById('btn-project-doctor')?.addEventListener('click', () => {
            if (this.projectDoctor?.openReport) {
                this.projectDoctor.openReport();
            } else {
                Utils.showToast('Project Doctor is not available', 'warning');
            }
        });
        document.getElementById('btn-scene-storyboard')?.addEventListener('click', () => {
            if (this.projectDoctor?.openStoryboard) {
                this.projectDoctor.openStoryboard();
            } else {
                Utils.showToast('Scene Storyboard is not available', 'warning');
            }
        });
        document.getElementById('btn-timeline-cleanup')?.addEventListener('click', () => {
            if (this.projectDoctor?.openTimelineCleanup) {
                this.projectDoctor.openTimelineCleanup();
            } else {
                Utils.showToast('Timeline Cleanup is not available', 'warning');
            }
        });
        document.getElementById('btn-motion-preset-builder')?.addEventListener('click', () => {
            if (this.projectDoctor?.openMotionPresetBuilder) {
                this.projectDoctor.openMotionPresetBuilder();
            } else {
                Utils.showToast('Motion Presets are not available', 'warning');
            }
        });
        document.getElementById('btn-rig-presets')?.addEventListener('click', () => {
            if (this.projectDoctor?.openRigPresetBuilder) {
                this.projectDoctor.openRigPresetBuilder();
            } else {
                Utils.showToast('Rig Presets are not available', 'warning');
            }
        });
        document.getElementById('btn-asset-optimizer')?.addEventListener('click', () => {
            if (this.projectDoctor?.openAssetOptimizer) {
                this.projectDoctor.openAssetOptimizer();
            } else {
                Utils.showToast('Asset Optimizer is not available', 'warning');
            }
        });
        document.getElementById('btn-audio-markers')?.addEventListener('click', () => {
            if (this.projectDoctor?.openAudioMarkers) {
                this.projectDoctor.openAudioMarkers();
            } else {
                Utils.showToast('Audio Markers are not available', 'warning');
            }
        });
        document.getElementById('btn-layer-mask')?.addEventListener('click', () => {
            if (this.projectDoctor?.openLayerMaskTool) {
                this.projectDoctor.openLayerMaskTool();
            } else {
                Utils.showToast('Layer Mask is not available', 'warning');
            }
        });
        document.getElementById('btn-animation-conflicts')?.addEventListener('click', () => {
            if (this.projectDoctor?.openConflicts) {
                this.projectDoctor.openConflicts();
            } else {
                Utils.showToast('Animation conflict checker is not available', 'warning');
            }
        });
        document.getElementById('btn-reusable-characters')?.addEventListener('click', () => {
            if (this.projectDoctor?.openReusableCharacters) {
                this.projectDoctor.openReusableCharacters();
            } else {
                Utils.showToast('Reusable Characters is not available', 'warning');
            }
        });
        document.getElementById('btn-pose-library')?.addEventListener('click', () => {
            if (this.projectDoctor?.openPoseLibrary) {
                this.projectDoctor.openPoseLibrary();
            } else if (this.jointSystem?.showPoseLibrary) {
                this.jointSystem.showPoseLibrary();
            } else {
                Utils.showToast('Pose Library is available after rig tools load', 'warning');
            }
        });
        document.getElementById('btn-presenter-avatar-panel')?.addEventListener('click', () => this.openPresenterAvatarLibrary());
        document.getElementById('btn-presenter-avatar-panel-collapsed')?.addEventListener('click', () => this.openPresenterAvatarLibrary());
        document.getElementById('btn-svg-african-panel')?.addEventListener('click', () => this.openSvgAfricanCharacterLibrary({ mode: 'create' }));
        document.getElementById('btn-svg-african-panel-collapsed')?.addEventListener('click', () => this.openSvgAfricanCharacterLibrary({ mode: 'create' }));
        document.getElementById('btn-character-designer')?.addEventListener('click', () => this.characterDesigner?.open());
        document.getElementById('btn-character-designer-collapsed')?.addEventListener('click', () => this.characterDesigner?.open());
        document.getElementById('btn-realistic-character')?.addEventListener('click', () => this.realisticCharacters?.open());
        document.getElementById('btn-realistic-character-collapsed')?.addEventListener('click', () => this.realisticCharacters?.open());
        document.getElementById('btn-realistic-3d')?.addEventListener('click', () => globalThis.Realistic3DLibrary?.open(this));
        document.getElementById('btn-realistic-3d-collapsed')?.addEventListener('click', () => globalThis.Realistic3DLibrary?.open(this));
        document.getElementById('btn-svg-character-designer')?.addEventListener('click', () => this.characterDesigner?.open({ config: this._getSvgAfricanCharacterFormConfig() }));
        document.getElementById('btn-presenter-open-svg-african')?.addEventListener('click', () => {
            this.closePresenterAvatarLibrary();
            this.openSvgAfricanCharacterLibrary({ mode: 'create' });
        });
        document.querySelector('#presenter-avatar-modal .modal-close')?.addEventListener('click', () => this.closePresenterAvatarLibrary());
        document.getElementById('presenter-avatar-modal')?.addEventListener('click', (e) => {
            if (e.target?.id === 'presenter-avatar-modal') this.closePresenterAvatarLibrary();
        });
        document.getElementById('btn-joint-svg-african')?.addEventListener('click', () => this.openSvgAfricanCharacterLibrary({ mode: 'create' }));
        document.querySelector('#svg-african-character-modal .modal-close')?.addEventListener('click', () => this.closeSvgAfricanCharacterLibrary());
        document.getElementById('svg-african-character-modal')?.addEventListener('click', (e) => {
            if (e.target?.id === 'svg-african-character-modal') this.closeSvgAfricanCharacterLibrary();
        });
        document.getElementById('btn-svg-african-create')?.addEventListener('click', () => {
            void this._runSvgAfricanAuthoredAction(() => this.addSvgAfricanCharacter());
        });
        document.getElementById('btn-svg-african-update')?.addEventListener('click', () => {
            void this._runSvgAfricanAuthoredAction(() => this.updateSelectedSvgAfricanCharacter());
        });
        document.getElementById('btn-svg-african-copy-config')?.addEventListener('click', () => this.copySvgAfricanBuilderConfig());
        document.getElementById('btn-svg-african-paste-config')?.addEventListener('click', () => this.pasteSvgAfricanBuilderConfig());
        document.getElementById('btn-svg-african-save-config')?.addEventListener('click', () => this.saveSvgAfricanBuilderConfig());
        document.getElementById('btn-svg-african-save-identity')?.addEventListener('click', () => this.saveSvgAfricanBuilderIdentity());
        document.getElementById('btn-svg-african-save-styling')?.addEventListener('click', () => this.saveSvgAfricanBuilderStyling());
        document.getElementById('btn-svg-african-load-config')?.addEventListener('click', () => this.loadSvgAfricanSavedConfig());
        document.getElementById('btn-svg-african-create-saved-config')?.addEventListener('click', () => {
            const config = this._getSelectedSvgAfricanSavedConfig();
            void this._runSvgAfricanAuthoredAction(
                () => this.createSvgAfricanCharacterFromSavedConfig(),
                { config, reason: 'svg-african-create-saved' }
            );
        });
        document.getElementById('btn-svg-african-apply-saved-config')?.addEventListener('click', () => {
            const config = this._getSelectedSvgAfricanSavedConfig();
            void this._runSvgAfricanAuthoredAction(
                () => this.applySvgAfricanSavedConfigToSelected(),
                { config, reason: 'svg-african-apply-saved' }
            );
        });
        document.getElementById('btn-svg-african-delete-config')?.addEventListener('click', () => this.deleteSvgAfricanSavedConfig());
        document.getElementById('btn-svg-african-duplicate')?.addEventListener('click', () => {
            void this._runSvgAfricanAuthoredAction(() => this.duplicateSelectedSvgAfricanCharacter());
        });
        document.getElementById('svg-african-saved-configs')?.addEventListener('change', () => this._refreshSvgAfricanSavedConfigSelect());
        const svgAfricanBuilderReset = document.getElementById('btn-svg-african-reset');
        if (svgAfricanBuilderReset && svgAfricanBuilderReset.dataset.svgAfricanBuilderResetBound !== '1') {
            svgAfricanBuilderReset.dataset.svgAfricanBuilderResetBound = '1';
            svgAfricanBuilderReset.addEventListener('click', () => this.resetSvgAfricanCharacterBuilder());
        }

        // Zoom controls are bound in StageManager
        // Click zoom-level to reset to 100%
        document.getElementById('zoom-level')?.addEventListener('click', () => {
            this.stage.setZoom(1);
        });

        // Align buttons
        document.querySelectorAll('[data-align]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.objects.alignObjects(btn.dataset.align);
            });
        });

        this._setupStageZOrderControls();
        this._setupStageCharacterResize();
        this._setupStageAnimate();

        // Stage playback controls
        this._setupStagePlaybackControls();
    }

    openPresenterAvatarLibrary() {
        const catalog = window.SvgAvatarCatalog;
        const modal = document.getElementById('presenter-avatar-modal');
        const grid = document.getElementById('presenter-avatar-grid');
        if (!modal || !grid) return;
        if (!catalog?.list || !catalog?.thumb || !catalog?.createInstance) {
            Utils.showToast('Presenter avatars are not available yet', 'warning');
            return;
        }

        const escape = (value) => {
            const text = String(value ?? '');
            return Utils.escapeHtml ? Utils.escapeHtml(text) : text.replace(/[&<>"']/g, (ch) => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[ch]));
        };

        const presets = catalog.list();
        const groups = [
            {
                key: 'gesture-ready',
                title: 'Gesture Ready',
                hint: 'Best for visible hand emphasis and presenter motions.'
            },
            {
                key: 'portrait',
                title: 'Portrait Avatars',
                hint: 'Best for lip sync, gaze, blinking, listening, and head motion.'
            }
        ];
        const cardHtml = (preset) => {
            const id = escape(preset.id);
            const label = escape(preset.label || preset.id);
            const kind = escape((preset.kind || 'avatar').replace(/-/g, ' '));
            const caps = Array.isArray(preset.capabilities) ? preset.capabilities : [];
            const thumb = catalog.thumb(preset.id);
            const badges = caps.slice(0, 4).map(cap => (
                `<span class="presenter-avatar-badge">${escape(cap)}</span>`
            )).join('');
            return `
                <button type="button" class="presenter-avatar-card" data-avatar-preset="${id}" title="${label}">
                    <span class="presenter-avatar-preview">${thumb}</span>
                    <span class="presenter-avatar-name">${label}</span>
                    <span class="presenter-avatar-kind">${kind}</span>
                    <span class="presenter-avatar-badges">${badges}</span>
                </button>
            `;
        };

        grid.innerHTML = groups.map(group => {
            const items = presets.filter(preset => (preset.category || 'portrait') === group.key);
            if (items.length === 0) return '';
            return `
                <section class="presenter-avatar-section" aria-label="${escape(group.title)}">
                    <div class="presenter-avatar-section-head">
                        <h4>${escape(group.title)}</h4>
                        <p>${escape(group.hint)}</p>
                    </div>
                    <div class="presenter-avatar-section-grid">
                        ${items.map(cardHtml).join('')}
                    </div>
                </section>
            `;
        }).join('');

        grid.querySelectorAll('[data-avatar-preset]').forEach((button) => {
            button.addEventListener('click', () => this.addPresenterAvatar(button.dataset.avatarPreset));
        });
        modal.classList.remove('hidden');
    }

    closePresenterAvatarLibrary() {
        document.getElementById('presenter-avatar-modal')?.classList.add('hidden');
    }

    _escapeModalHtml(value) {
        const text = String(value ?? '');
        return Utils.escapeHtml ? Utils.escapeHtml(text) : text.replace(/[&<>"']/g, (ch) => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
    }

    _resolveSvgAfricanAuthoredAssetId(config = null) {
        const rawConfig = config || this._getSvgAfricanCharacterFormConfig?.() || {};
        if (
            rawConfig.useBasicSvg === true
            || rawConfig.preferBasicSvg === true
            || rawConfig.disablePremiumPresetUpgrade === true
        ) {
            return '';
        }
        const catalog = window.SvgAfricanCharacterCatalog;
        const premiumAssets = window.SvgAfricanPremiumAssets;
        const normalized = catalog?.normalizeConfig?.(rawConfig) || rawConfig;
        const requestedView = normalized?.styling?.view || normalized?.view || 'front';
        const threeQuarterArtwork = normalized?.styling?.threeQuarterArtwork || normalized?.threeQuarterArtwork || 'projected';
        if (/^(front|back)-3q-(left|right)$/.test(requestedView) && threeQuarterArtwork === 'experimental-drawn') {
            return '';
        }
        const asset = premiumAssets?.resolveAssetForConfig?.(normalized)
            || premiumAssets?.get?.(normalized.assetCharacterId || normalized.assetId);
        if (asset?.artworkFamily === 'community-parametric') return '';
        return String(
            asset?.id
            || normalized.assetCharacterId
            || normalized.assetId
            || premiumAssets?.getDefaultAssetId?.()
            || ''
        ).trim();
    }

    _getSelectedSvgAfricanSavedConfig(id = null) {
        const selectedId = id || document.getElementById('svg-african-saved-configs')?.value || '';
        const entry = this._readSvgAfricanSavedConfigs?.().find(item => item.id === selectedId) || null;
        return this._resolveSvgAfricanSavedEntryConfig?.(entry) || entry?.config || null;
    }

    _ensureSvgAfricanAuthoredArtwork(options = {}) {
        const loader = window.SvgAfricanAuthoredArtworkLoader;
        const assetId = String(options.assetId || this._resolveSvgAfricanAuthoredAssetId(options.config) || '').trim();
        if (!assetId || !loader?.ensureLoaded || loader.isLoaded?.(assetId)) {
            this._svgAfricanAuthoredArtworkLoading = false;
            this._svgAfricanAuthoredArtworkLoadFailed = false;
            return Promise.resolve(window.SvgAfricanAuthoredArtwork || null);
        }

        const requestKey = loader.getBundleId?.(assetId) || assetId;
        this._svgAfricanAuthoredArtworkLoadPromises ||= new Map();
        this._svgAfricanAuthoredArtworkLoadFailures ||= new Set();
        if (this._svgAfricanAuthoredArtworkLoadPromises.has(requestKey)) {
            return this._svgAfricanAuthoredArtworkLoadPromises.get(requestKey);
        }

        this._svgAfricanAuthoredArtworkLoading = true;
        this._svgAfricanAuthoredArtworkLoadFailed = false;
        this._svgAfricanAuthoredArtworkLoadFailures.delete(requestKey);
        const pending = loader.ensureLoaded({
            reason: options.reason || 'svg-african-builder',
            assetId
        }).then((registry) => {
            this._svgAfricanAuthoredArtworkLoadPromises.delete(requestKey);
            this._svgAfricanAuthoredArtworkLoadFailures.delete(requestKey);
            this._svgAfricanAuthoredArtworkLoading = this._svgAfricanAuthoredArtworkLoadPromises.size > 0;
            this._svgAfricanAuthoredArtworkLoadFailed = false;
            if (!document.getElementById('svg-african-character-modal')?.classList.contains('hidden')) {
                this._scheduleSvgAfricanBuilderPreview?.();
            }
            return registry;
        }).catch((error) => {
            this._svgAfricanAuthoredArtworkLoadPromises.delete(requestKey);
            this._svgAfricanAuthoredArtworkLoadFailures.add(requestKey);
            this._svgAfricanAuthoredArtworkLoading = this._svgAfricanAuthoredArtworkLoadPromises.size > 0;
            this._svgAfricanAuthoredArtworkLoadFailed = true;
            console.error(`[SVG African] Could not load authored artwork for ${assetId}.`, error);
            if (options.silent !== true) {
                Utils.showToast('Premium SVG artwork could not be loaded. Check the connection and try again.', 'error');
            }
            if (!document.getElementById('svg-african-character-modal')?.classList.contains('hidden')) {
                this._scheduleSvgAfricanBuilderPreview?.();
            }
            return null;
        });
        this._svgAfricanAuthoredArtworkLoadPromises.set(requestKey, pending);
        return pending;
    }

    _runSvgAfricanAuthoredAction(action, options = {}) {
        const loader = window.SvgAfricanAuthoredArtworkLoader;
        const assetId = this._resolveSvgAfricanAuthoredAssetId(options.config);
        if (!assetId || !loader?.ensureLoaded || loader.isLoaded?.(assetId)) {
            return action?.();
        }
        return this._ensureSvgAfricanAuthoredArtwork({
            reason: options.reason || 'svg-african-builder-action',
            assetId
        }).then((registry) => registry ? action?.() : false);
    }

    openSvgAfricanCharacterLibrary(options = {}) {
        const catalog = window.SvgAfricanCharacterCatalog;
        const modal = document.getElementById('svg-african-character-modal');
        if (!modal) return;
        if (!catalog?.listPresets || !catalog?.outfits || !catalog?.skinTones || !catalog?.hairstyles) {
            Utils.showToast('SVG African characters are not available yet', 'warning');
            return;
        }
        const requestedMode = options?.mode === 'edit' ? 'edit' : 'create';
        const selectedArmature = requestedMode === 'edit'
            ? (options.armature || this.jointSystem?._resolveSvgAfricanArmature?.() || null)
            : null;
        if (requestedMode === 'edit' && !selectedArmature?.root?._svgCharacter) {
            Utils.showToast('Right-click an SVG African character and choose Edit SVG African Character.', 'warning');
            return;
        }
        const selectedRawConfig = selectedArmature?.root?._svgCharacterConfig || null;
        if (selectedRawConfig?._realisticCharacter && selectedRawConfig._realisticCharacter.mode !== 'hybrid' && this.realisticCharacters) {
            this.realisticCharacters.open(selectedArmature);
            return;
        }
        if (selectedRawConfig?._photoCharacter && this.characterDesigner) {
            this.characterDesigner.open({ mode: 'edit', target: selectedArmature });
            return;
        }
        const selectedExplicitBasic = !!(selectedRawConfig && (
            selectedRawConfig.useBasicSvg === true
            || selectedRawConfig.preferBasicSvg === true
            || selectedRawConfig.disablePremiumPresetUpgrade === true
        ));
        this._svgAfricanBuilderPreserveBasicSvg = selectedExplicitBasic;
        const premiumIntegrityToggle = document.getElementById('svg-african-premium-integrity');
        if (premiumIntegrityToggle) premiumIntegrityToggle.checked = !selectedExplicitBasic;
        this._svgAfricanBuilderPremiumIntegrityEnabled = !selectedExplicitBasic;

        const setOptions = (id, entries, valueAccessor, labelAccessor) => {
            const select = document.getElementById(id);
            if (!select) return;
            const current = select.value;
            select.innerHTML = entries.map((entry) => {
                const value = this._escapeModalHtml(valueAccessor(entry));
                const label = this._escapeModalHtml(labelAccessor(entry));
                return `<option value="${value}">${label}</option>`;
            }).join('');
            if (current && [...select.options].some(option => option.value === current)) {
                select.value = current;
            }
        };
        const titleCase = value => String(value || '')
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, ch => ch.toUpperCase());
        const setCatalogOptions = (id, source) => {
            setOptions(
                id,
                Object.values(source || {}),
                entry => entry.id,
                entry => entry.name || titleCase(entry.id)
            );
        };

        setOptions(
            'svg-african-preset',
            catalog.listBuilderPresets?.({ includeLegacyAliases: selectedExplicitBasic }) || catalog.listPresets(),
            entry => entry.id,
            entry => entry.builderName || entry.name || entry.id
        );
        const presetSearch = document.getElementById('svg-african-preset-search');
        const presetCollection = document.getElementById('svg-african-preset-collection');
        const presetChoices = catalog.listBuilderPresets?.({ includeLegacyAliases: selectedExplicitBasic }) || catalog.listPresets();
        if (presetSearch) presetSearch.value = '';
        if (presetCollection) {
            presetCollection.replaceChildren(new Option('All collections', ''));
            [...new Set(presetChoices.map(preset => preset.category || 'Original collection'))].forEach(name => presetCollection.add(new Option(name, name)));
        }
        this._filterSvgAfricanPresets = () => {
            const select = document.getElementById('svg-african-preset');
            if (!select) return;
            const selected = select.value;
            const query = (presetSearch?.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
            const matches = presetChoices.filter(preset => {
                const category = preset.category || 'Original collection';
                const text = `${preset.name} ${preset.id} ${category} ${(preset.tags || []).join(' ')}`.toLowerCase();
                return (!presetCollection?.value || presetCollection.value === category) && query.every(token => text.includes(token));
            });
            select.replaceChildren();
            const current = presetChoices.find(preset => preset.id === selected);
            if (current && !matches.includes(current)) select.add(new Option(`${current.name} (current)`, current.id));
            const groups = new Map();
            matches.forEach(preset => {
                const category = preset.category || 'Original collection';
                if (!groups.has(category)) {
                    const group = document.createElement('optgroup'); group.label = category;
                    groups.set(category, group); select.append(group);
                }
                groups.get(category).append(new Option(preset.builderName || preset.name, preset.id));
            });
            if (current) select.value = current.id;
            const count = document.getElementById('svg-african-preset-count');
            if (count) count.textContent = `(${matches.length} matches)`;
        };
        if (presetSearch) presetSearch.oninput = () => this._filterSvgAfricanPresets();
        if (presetCollection) presetCollection.onchange = () => this._filterSvgAfricanPresets();
        this._filterSvgAfricanPresets();
        setCatalogOptions('svg-african-skin', catalog.skinTones);
        setCatalogOptions('svg-african-head-type', catalog.headTypes);
        setCatalogOptions('svg-african-face', catalog.faceShapes);
        setCatalogOptions('svg-african-eyes', catalog.eyeStyles);
        setCatalogOptions('svg-african-nose', catalog.noseStyles);
        setCatalogOptions('svg-african-lips', catalog.lipStyles);
        setCatalogOptions('svg-african-hair', catalog.hairstyles);
        setCatalogOptions('svg-african-hair-color', catalog.hairColors);
        setCatalogOptions('svg-african-facial-hair', catalog.facialHairStyles);
        setCatalogOptions('svg-african-body', catalog.bodyTypes);
        setCatalogOptions('svg-african-height', catalog.heightVariants);
        setCatalogOptions('svg-african-profession', catalog.professions);
        setCatalogOptions('svg-african-outfit', catalog.outfits);
        setCatalogOptions('svg-african-top-clothing', catalog.topClothing);
        setCatalogOptions('svg-african-sleeve-length', catalog.sleeveLengths);
        setCatalogOptions('svg-african-bottom-clothing', catalog.bottomClothing);
        setCatalogOptions('svg-african-skirt-length', catalog.skirtLengths);
        setCatalogOptions('svg-african-clothing-palette', catalog.clothingPalettes);
        setCatalogOptions('svg-african-fabric-design', catalog.fabricDesigns);
        setCatalogOptions('svg-african-neck-tie-type', catalog.neckTieTypes);
        setCatalogOptions('svg-african-neck-tie-design', catalog.neckTieDesigns);
        this._syncSvgAfricanOutfitCompatibility();
        this._syncSvgAfricanClothingCompatibility();
        setCatalogOptions('svg-african-headwear', catalog.headwear);
        setCatalogOptions('svg-african-footwear', catalog.footwear);
        setCatalogOptions('svg-african-cultural-style', catalog.culturalStyles);
        setCatalogOptions('svg-african-three-quarter-artwork', catalog.threeQuarterArtworkModes);
        const premiumAssets = window.SvgAfricanPremiumAssets;
        const normalizePremiumBuilderConfig = (candidate) => {
            if (!candidate || selectedExplicitBasic || !premiumAssets?.normalizePremiumConfig) return candidate;
            const asset = premiumAssets.resolveAssetForConfig?.(candidate)
                || (candidate.assetCharacterId && premiumAssets.get?.(candidate.assetCharacterId));
            return asset ? premiumAssets.normalizePremiumConfig(asset, candidate) : candidate;
        };
        const viewSelect = document.getElementById('svg-african-view');
        if (viewSelect) {
            const currentView = viewSelect.value || 'front';
            const allViewEntries = premiumAssets?.listViewOptions?.() || [
                { id: 'front', name: 'Front', enabled: true },
                { id: 'back', name: 'Back', enabled: true }
            ];
            const selectedPremiumView = selectedArmature?.root?._characterAppearanceProvider === 'svg-african-premium'
                ? (this.jointSystem?._getSvgAfricanPremiumViewKey?.(selectedArmature) || selectedRawConfig?.view || 'front')
                : null;
            const selectedPremiumIsSide = !!selectedPremiumView?.startsWith('side-');
            const viewEntries = allViewEntries;
            viewSelect.innerHTML = viewEntries.map(entry => {
                const value = this._escapeModalHtml(entry.id);
                const label = this._escapeModalHtml(`${entry.name}${entry.enabled === false ? ' (planned)' : ''}`);
                const disabled = entry.enabled === false ? ' disabled' : '';
                const crossStructure = !!selectedPremiumView
                    && String(entry.id || '').startsWith('side-') !== selectedPremiumIsSide;
                const note = crossStructure
                    ? 'Create Character starts this view as a separate armature; Update Selected keeps side and non-side structures separate.'
                    : entry.note;
                const title = note ? ` title="${this._escapeModalHtml(note)}"` : '';
                return `<option value="${value}"${disabled}${title}>${label}</option>`;
            }).join('');
            if (currentView && [...viewSelect.options].some(option => option.value === currentView && !option.disabled)) {
                viewSelect.value = currentView;
            } else if (selectedPremiumView && [...viewSelect.options].some(option => option.value === selectedPremiumView && !option.disabled)) {
                viewSelect.value = selectedPremiumView;
            } else {
                viewSelect.value = viewEntries.find(entry => entry.enabled !== false)?.id || 'front';
            }
        }
        const facePresetEntries = premiumAssets?.listFacePresets?.() || Object.values(premiumAssets?.facePresets || {});
        setOptions(
            'svg-african-face-preset',
            [{ id: '', name: 'Custom' }, ...facePresetEntries],
            entry => entry.id,
            entry => entry.name || titleCase(entry.id)
        );
        const adjustmentCatalog = premiumAssets?.adjustProperties || {};
        const formatAdjustment = value => `${Math.round((Number(value) || 0) * 100)}%`;
        const syncAdjustmentOutput = (input) => {
            const output = document.getElementById(`${input.id}-val`);
            if (output) output.textContent = formatAdjustment(input.value);
        };
        document.querySelectorAll('[data-svg-african-adjust]').forEach(input => {
            const spec = adjustmentCatalog[input.dataset.svgAfricanAdjust] || {};
            if (Number.isFinite(Number(spec.min))) input.min = String(spec.min);
            if (Number.isFinite(Number(spec.max))) input.max = String(spec.max);
            if (input.dataset.bound !== '1') {
                input.dataset.bound = '1';
                input.addEventListener('input', () => syncAdjustmentOutput(input));
            }
        });

        const accessoryHost = document.getElementById('svg-african-accessories');
        document.querySelectorAll('select[data-svg-african-jewelry]').forEach(select => {
            const options = catalog.jewelryOptions?.[select.dataset.svgAfricanJewelry] || {};
            const current = select.value;
            select.replaceChildren(...Object.entries(options).map(([id, label]) => new Option(label, id)));
            if (Object.hasOwn(options, current)) select.value = current;
        });
        if (accessoryHost) {
            const currentChecked = new Set([...accessoryHost.querySelectorAll('input:checked')].map(input => input.value));
            accessoryHost.innerHTML = Object.values(catalog.accessories || {}).map(item => {
                const id = this._escapeModalHtml(item.id);
                const label = this._escapeModalHtml(item.name || titleCase(item.id));
                const checked = currentChecked.has(item.id) ? ' checked' : '';
                return `<label><input type="checkbox" value="${id}"${checked}> <span>${label}</span></label>`;
            }).join('');
        }

        const assign = (id, value) => {
            const select = document.getElementById(id);
            if (select && [...select.options].some(option => option.value === value)) select.value = value;
        };
        const applyConfigToForm = (nextConfig, options = {}) => {
            if (!nextConfig) return;
            const presetSelect = document.getElementById('svg-african-preset');
            if (nextConfig.preset && presetSelect && ![...presetSelect.options].some(option => option.value === nextConfig.preset)) {
                const preset = catalog.getPreset(nextConfig.preset);
                if (preset) presetSelect.add(new Option(preset.name, preset.id));
            }
            const styling = nextConfig.styling || {};
            const explicitCustomPieces = styling.customPieces ?? nextConfig.customPieces ?? nextConfig._svgAfricanCustomPieces;
            const customPieces = explicitCustomPieces == null
                ? options.preservePieceOverrides === true
                : explicitCustomPieces === true;
            const customToggle = document.getElementById('svg-african-custom-pieces');
            if (customToggle) customToggle.checked = customPieces;
            assign('svg-african-preset', nextConfig.preset || '');
            assign('svg-african-presentation', nextConfig.presentation || nextConfig.identity?.presentation);
            assign('svg-african-age', nextConfig.ageGroup || nextConfig.identity?.ageGroup);
            assign('svg-african-skin', nextConfig.skinTone);
            assign('svg-african-head-type', nextConfig.headType || nextConfig.identity?.headType || 'balanced');
            assign('svg-african-face', nextConfig.face);
            assign('svg-african-eyes', nextConfig.eyes);
            assign('svg-african-nose', nextConfig.nose);
            assign('svg-african-lips', nextConfig.lips);
            assign('svg-african-hair', nextConfig.hair);
            assign('svg-african-hair-color', nextConfig.hairColor || nextConfig.identity?.hairColor || 'natural-black');
            assign('svg-african-facial-hair', nextConfig.facialHair || 'none');
            assign('svg-african-body', nextConfig.body);
            assign('svg-african-height', nextConfig.height || 'average');
            assign('svg-african-profession', nextConfig.profession || 'none');
            assign('svg-african-outfit', nextConfig.outfit);
            assign('svg-african-top-clothing', customPieces ? (nextConfig.topClothing || styling.topClothing || 'auto') : 'auto');
            assign('svg-african-sleeve-length', customPieces ? (nextConfig.sleeveLength || styling.sleeveLength || 'auto') : 'auto');
            assign('svg-african-bottom-clothing', customPieces ? (nextConfig.bottomClothing || styling.bottomClothing || 'auto') : 'auto');
            assign('svg-african-skirt-length', styling.skirtLength || nextConfig.skirtLength || 'at-knee');
            assign('svg-african-clothing-palette', nextConfig.clothingPalette || styling.clothingPalette || 'auto');
            assign('svg-african-fabric-design', customPieces ? (nextConfig.fabricDesign || styling.fabricDesign || 'auto') : 'auto');
            assign('svg-african-neck-tie-type', nextConfig.neckTieType || styling.neckTieType || 'auto');
            assign('svg-african-neck-tie-design', nextConfig.neckTieDesign || styling.neckTieDesign || 'auto');
            assign('svg-african-headwear', nextConfig.headwear || 'none');
            assign('svg-african-footwear', nextConfig.footwear || 'formal');
            assign('svg-african-cultural-style', nextConfig.culturalStyle || 'contemporary');
            assign('svg-african-face-preset', nextConfig._svgAfricanFacePreset || nextConfig.facePreset || '');
            assign('svg-african-view', nextConfig.view || styling.view || 'front');
            assign(
                'svg-african-three-quarter-artwork',
                nextConfig.threeQuarterArtwork || styling.threeQuarterArtwork || 'projected'
            );
            this._syncSvgAfricanThreeQuarterArtworkControl();
            assign('svg-african-head-artwork', styling.headArtwork || 'original');
            assign('svg-african-rear-talking-profile', styling.rearTalkingProfile || nextConfig.rearTalkingProfile || 'hidden');
            this._syncSvgAfricanOutfitCompatibility();
            this._syncSvgAfricanClothingCompatibility();
            this._syncSvgAfricanClothingOverrideMode({ resetAuto: !customPieces, schedulePreview: false });

            const adjustments = nextConfig.premiumAdjustments || nextConfig._svgAfricanAdjustments || {};
            document.querySelectorAll('[data-svg-african-adjust]').forEach(input => {
                const prop = input.dataset.svgAfricanAdjust;
                const spec = adjustmentCatalog[prop] || {};
                const fallback = Number.isFinite(Number(spec.defaultValue)) ? Number(spec.defaultValue) : 0;
                input.value = String(Number.isFinite(Number(adjustments[prop])) ? adjustments[prop] : fallback);
                syncAdjustmentOutput(input);
            });

            const selectedAccessories = new Set(nextConfig.accessories || nextConfig.styling?.accessories || []);
            this._setSvgAfricanJewelry(styling.jewelry || nextConfig.jewelry);
            document.querySelectorAll('#svg-african-accessories input').forEach(input => {
                input.checked = selectedAccessories.has(input.value);
            });

            const colorOverrides = nextConfig.colorOverrides || nextConfig.styling?.colorOverrides || {};
            const colorFallbacks = this._getSvgAfricanWearColorFallbacks();
            const colorEnabled = colorOverrides && Object.keys(colorOverrides).length > 0;
            const colorToggle = document.getElementById('svg-african-color-enable');
            if (colorToggle) colorToggle.checked = colorEnabled;
            document.querySelectorAll('[data-svg-african-color]').forEach(input => {
                const prop = input.dataset.svgAfricanColor;
                const color = this._normalizeSvgAfricanWearColor(colorOverrides?.[prop]) || colorFallbacks[prop] || '#000000';
                if (document.activeElement !== input) input.value = color;
            });
            this._svgAfricanLastPresentation = document.getElementById('svg-african-presentation')?.value || 'female';
        };
        this._applySvgAfricanBuilderConfigToForm = applyConfigToForm;

        const presetSelect = document.getElementById('svg-african-preset');
        if (presetSelect && presetSelect.dataset.svgAfricanPresetSyncBound !== '1') {
            presetSelect.dataset.svgAfricanPresetSyncBound = '1';
            presetSelect.addEventListener('change', () => {
                this._svgAfricanBuilderPreserveBasicSvg = false;
                const presetConfig = normalizePremiumBuilderConfig(
                    catalog.normalizeConfig?.({ preset: presetSelect.value }) || null
                );
                applyConfigToForm(presetConfig, { preservePieceOverrides: false });
                this._scheduleSvgAfricanBuilderPreview();
            });
        }

        const normalizeBuilderEditConfig = (rawConfig) => {
            if (!rawConfig || typeof rawConfig !== 'object') return null;
            if (selectedExplicitBasic) return catalog.normalizeConfig?.(rawConfig) || rawConfig;
            const upgradeCandidate = { ...rawConfig };
            delete upgradeCandidate.useBasicSvg;
            delete upgradeCandidate.preferBasicSvg;
            delete upgradeCandidate.disablePremiumPresetUpgrade;
            if (
                upgradeCandidate.engine
                && upgradeCandidate.engine !== catalog.defaultConfig?.engine
                && upgradeCandidate.engine !== 'svg-armature-premium'
            ) {
                delete upgradeCandidate.engine;
            }
            return normalizePremiumBuilderConfig(catalog.normalizeConfig?.(upgradeCandidate) || rawConfig);
        };
        const selectedConfig = requestedMode === 'edit'
            ? normalizeBuilderEditConfig(selectedRawConfig)
            : null;
        const createPreset = catalog.getPreset?.(options.preset)?.id || 'ada-lecturer-premium';
        const config = selectedConfig
            || normalizePremiumBuilderConfig(catalog.normalizeConfig?.({ preset: createPreset }))
            || null;
        if (config) {
            applyConfigToForm(config, { preservePieceOverrides: !!selectedArmature?.root?._svgCharacterConfig });
        }
        const placementX = Number(options?.placement?.stageX ?? options?.placement?.x);
        const placementY = Number(options?.placement?.stageY ?? options?.placement?.y);
        const createPlacement = requestedMode === 'create' && (Number.isFinite(placementX) || Number.isFinite(placementY))
            ? {
                ...(Number.isFinite(placementX) ? { stageX: placementX } : {}),
                ...(Number.isFinite(placementY) ? { stageY: placementY } : {}),
                anchor: 'center'
            }
            : null;
        this._beginSvgAfricanBuilderEditSession(selectedArmature, selectedConfig || config, { placement: createPlacement });

        if (requestedMode === 'create') {
            this._svgAfricanBuilderPreviewZoom = 1;
            const zoomReset = document.getElementById('svg-african-preview-zoom-reset');
            if (zoomReset) zoomReset.textContent = '100%';
            this._resetSvgAfricanBuilderPreviewViewport();
        }

        this._bindSvgAfricanBuilderPreviewEvents();
        this._bindSvgAfricanBuilderChrome();
        this._setSvgAfricanBuilderPanel('character', { focusPreview: false });
        const builderTools = document.getElementById('svg-african-builder-tools');
        const previewDetails = document.getElementById('svg-african-preview-details');
        if (builderTools) builderTools.open = false;
        if (previewDetails) previewDetails.open = false;
        this._syncSvgAfricanClothingOverrideMode({ schedulePreview: false });
        modal.classList.remove('hidden');
        this._refreshSvgAfricanSavedConfigSelect();
        this._setSvgAfricanBuilderCloseGuard(false);
        this._syncSvgAfricanBuilderEditContext();
        this._scheduleSvgAfricanBuilderPreview();
    }

    _hasUnsavedSvgAfricanBuilderDraft() {
        const session = this._svgAfricanBuilderEditSession;
        const history = session?.history;
        if (!session) return false;
        if (history?.entries?.length) {
            const opening = session.openingHistoryEntry || history.entries[0];
            const current = history.entries[history.index];
            if (opening?.signature && current?.signature && opening.signature !== current.signature) return true;
        }
        return session.mode === 'edit' && this._getSvgAfricanBuilderEditState?.().dirty === true;
    }

    _setSvgAfricanBuilderCloseGuard(visible, options = {}) {
        const guard = document.getElementById('svg-african-builder-close-guard');
        if (!guard) return false;
        const show = visible === true;
        guard.hidden = !show;
        const modal = document.getElementById('svg-african-character-modal');
        modal?.classList.toggle('svg-african-close-pending', show);
        if (show) {
            const session = this._svgAfricanBuilderEditSession;
            const title = document.getElementById('svg-african-builder-close-title');
            const detail = document.getElementById('svg-african-builder-close-detail');
            if (title) title.textContent = session?.mode === 'edit'
                ? 'Discard changes to this character?'
                : 'Discard this new character draft?';
            if (detail) detail.textContent = session?.mode === 'edit'
                ? 'The selected Stage character has not received these Builder changes.'
                : 'This draft has not been created on the Stage.';
            if (options.focus !== false) {
                requestAnimationFrame(() => document.getElementById('btn-svg-african-keep-editing')?.focus());
            }
        }
        return show;
    }

    closeSvgAfricanCharacterLibrary(options = {}) {
        const modal = document.getElementById('svg-african-character-modal');
        if (!modal || modal.classList.contains('hidden')) {
            this._disposeSvgAfricanBuilderMultiView();
            this._stopSvgAfricanBuilderMotionCheck?.({ reset: false });
            this._svgAfricanBuilderEditSession = null;
            return true;
        }
        if (options.force !== true && this._hasUnsavedSvgAfricanBuilderDraft()) {
            this._setSvgAfricanBuilderCloseGuard(true);
            return false;
        }
        this._setSvgAfricanBuilderCloseGuard(false, { focus: false });
        this._disposeSvgAfricanBuilderMultiView();
        this._svgAfricanBuilderSingleViewport = null;
        this._svgAfricanBuilderSingleViewportRestore = null;
        this._stopSvgAfricanBuilderMotionCheck?.({ reset: true });
        modal.classList.add('hidden');
        this._svgAfricanBuilderEditSession = null;
        return true;
    }

    _getSvgAfricanBuilderConfigSignature(config = {}) {
        const canonicalize = (value) => {
            if (Array.isArray(value)) return value.map(canonicalize);
            if (value && typeof value === 'object') {
                return Object.keys(value).sort().reduce((result, key) => {
                    const next = value[key];
                    if (typeof next === 'undefined' || typeof next === 'function') return result;
                    result[key] = canonicalize(next);
                    return result;
                }, {});
            }
            if (typeof value === 'number' && Number.isFinite(value)) {
                return Math.round(value * 1000000) / 1000000;
            }
            return value;
        };
        return JSON.stringify(canonicalize(config || {}));
    }

    _captureSvgAfricanBuilderControlStates() {
        const form = document.querySelector('#svg-african-character-modal .svg-african-form');
        if (!form) return {};
        const states = {};
        form.querySelectorAll('select[id^="svg-african-"],input[id^="svg-african-"],textarea[id^="svg-african-"]').forEach(control => {
            const type = String(control.type || '').toLowerCase();
            if (['button', 'submit', 'reset', 'hidden'].includes(type)) return;
            if (type === 'checkbox' || type === 'radio') {
                states[control.id] = control.checked ? '1' : '0';
            } else if (control.multiple) {
                states[control.id] = JSON.stringify([...control.selectedOptions].map(option => option.value).sort());
            } else {
                states[control.id] = String(control.value ?? '');
            }
        });
        const accessories = [...form.querySelectorAll('#svg-african-accessories input:checked')]
            .map(control => String(control.value || ''))
            .filter(Boolean)
            .sort();
        states['svg-african-accessories'] = JSON.stringify(accessories);
        return states;
    }

    _createSvgAfricanBuilderHistoryEntry(config = null, label = '', interaction = null) {
        const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
        const nextConfig = clone(config || this._getSvgAfricanCharacterFormConfig?.() || {});
        const state = {
            config: nextConfig,
            preserveBasicSvg: this._svgAfricanBuilderPreserveBasicSvg === true,
            premiumIntegrityEnabled: this._svgAfricanBuilderPremiumIntegrityEnabled !== false,
            controlStates: this._captureSvgAfricanBuilderControlStates()
        };
        return {
            ...state,
            label: String(label || '').trim(),
            controlId: String(interaction?.controlId || ''),
            signature: this._getSvgAfricanBuilderConfigSignature(state)
        };
    }

    _initializeSvgAfricanBuilderHistory(config = null) {
        const session = this._svgAfricanBuilderEditSession;
        if (!session) return null;
        const entry = this._createSvgAfricanBuilderHistoryEntry(config, 'Opening state');
        session.openingHistoryEntry = entry;
        this._svgAfricanBuilderPreviewComparison = 'current';
        session.history = {
            entries: [entry],
            index: 0,
            limit: 60,
            lastControlId: '',
            lastCapturedAt: 0
        };
        this._syncSvgAfricanBuilderHistoryControls();
        return session.history;
    }

    _getSvgAfricanBuilderHistoryLabel(control = null) {
        if (!control) return 'Builder change';
        const explicit = control.getAttribute?.('aria-label') || control.getAttribute?.('title');
        if (explicit) return String(explicit).trim();
        const id = String(control.id || control.dataset?.svgAfricanAdjust || control.dataset?.svgAfricanColor || 'Builder change');
        return id
            .replace(/^svg-african-(?:adj-|color-)?/, '')
            .replace(/[-_]+/g, ' ')
            .replace(/^./, character => character.toUpperCase());
    }

    _captureSvgAfricanBuilderHistory(interaction = null) {
        if (this._svgAfricanBuilderHistorySuspended) return false;
        const session = this._svgAfricanBuilderEditSession;
        const history = session?.history;
        if (!history) return false;

        const entry = this._createSvgAfricanBuilderHistoryEntry(null, interaction?.label, interaction);
        const current = history.entries[history.index];
        if (current?.signature === entry.signature) {
            this._syncSvgAfricanBuilderHistoryControls();
            return false;
        }

        const now = Date.now();
        const controlId = String(interaction?.controlId || '');
        const canCoalesce = interaction?.coalesce === true
            && controlId
            && history.index > 0
            && history.index === history.entries.length - 1
            && history.lastControlId === controlId
            && now - history.lastCapturedAt < 900;

        if (history.index < history.entries.length - 1) {
            history.entries.splice(history.index + 1);
        }
        if (canCoalesce) {
            history.entries[history.index] = entry;
        } else {
            history.entries.push(entry);
            history.index = history.entries.length - 1;
        }
        const limit = Math.max(2, Number(history.limit) || 60);
        if (history.entries.length > limit) {
            const overflow = history.entries.length - limit;
            history.entries.splice(0, overflow);
            history.index = Math.max(0, history.index - overflow);
        }
        history.lastControlId = interaction?.coalesce === true ? controlId : '';
        history.lastCapturedAt = now;
        this._svgAfricanBuilderPreviewComparison = 'current';
        this._syncSvgAfricanBuilderHistoryControls();
        return true;
    }

    _syncSvgAfricanBuilderHistoryControls() {
        const history = this._svgAfricanBuilderEditSession?.history;
        const undo = document.getElementById('btn-svg-african-undo');
        const redo = document.getElementById('btn-svg-african-redo');
        const canUndo = !!history && history.index > 0;
        const canRedo = !!history && history.index < history.entries.length - 1;
        if (undo) {
            undo.disabled = !canUndo;
            undo.setAttribute('aria-disabled', canUndo ? 'false' : 'true');
            const label = canUndo ? history.entries[history.index]?.label : '';
            undo.title = canUndo && label
                ? `Undo ${label} (Ctrl+Z)`
                : 'Undo last Builder change (Ctrl+Z)';
        }
        if (redo) {
            redo.disabled = !canRedo;
            redo.setAttribute('aria-disabled', canRedo ? 'false' : 'true');
            const label = canRedo ? history.entries[history.index + 1]?.label : '';
            redo.title = canRedo && label
                ? `Redo ${label} (Ctrl+Y)`
                : 'Redo Builder change (Ctrl+Y)';
        }
        const host = document.getElementById('svg-african-builder-context');
        if (host) {
            host.dataset.historyIndex = history ? String(history.index) : '0';
            host.dataset.historyLength = history ? String(history.entries.length) : '0';
        }
        this._syncSvgAfricanBuilderDraftReview?.();
        this._syncSvgAfricanBuilderComparisonControls?.();
        return { canUndo, canRedo };
    }

    _syncSvgAfricanBuilderComparisonControls() {
        const button = document.getElementById('svg-african-preview-compare');
        const session = this._svgAfricanBuilderEditSession;
        const canCompare = !!session?.openingHistoryEntry?.config
            && this._hasUnsavedSvgAfricanBuilderDraft?.() === true;
        if (!canCompare) this._svgAfricanBuilderPreviewComparison = 'current';
        const showingOpening = canCompare && this._svgAfricanBuilderPreviewComparison === 'opening';
        if (button) {
            button.disabled = !canCompare;
            button.setAttribute('aria-disabled', canCompare ? 'false' : 'true');
            button.setAttribute('aria-pressed', showingOpening ? 'true' : 'false');
            button.classList.toggle('is-active', showingOpening);
            button.title = showingOpening
                ? 'Showing opening character; click to show current draft'
                : canCompare
                    ? 'Show opening character for comparison'
                    : 'Make a draft change to compare with the opening character';
        }
        return { canCompare, showingOpening };
    }

    _setSvgAfricanBuilderPreviewComparison(mode = 'current', options = {}) {
        const nextMode = mode === 'opening' ? 'opening' : 'current';
        if (nextMode === 'opening' && this._hasUnsavedSvgAfricanBuilderDraft?.() !== true) {
            this._svgAfricanBuilderPreviewComparison = 'current';
            this._syncSvgAfricanBuilderComparisonControls();
            return false;
        }
        this._svgAfricanBuilderPreviewComparison = nextMode;
        this._syncSvgAfricanBuilderComparisonControls();
        if (options.schedulePreview !== false) {
            this._scheduleSvgAfricanBuilderPreview({ skipHistory: true });
        }
        return true;
    }

    _getSvgAfricanBuilderReviewControl(controlId = '') {
        const id = String(controlId || '');
        if (id === 'svg-african-accessories') {
            const host = document.getElementById(id);
            return {
                host,
                control: host?.querySelector?.('input') || host,
                panel: host?.closest?.('[data-svg-african-builder-panel]')?.dataset?.svgAfricanBuilderPanel || 'clothing',
                disclosure: host?.closest?.('details') || null,
                label: 'Accessories'
            };
        }
        const control = document.getElementById(id);
        if (!control) return null;
        const labelHost = control.closest?.('label');
        const label = String(
            labelHost?.querySelector?.(':scope > span')?.textContent
            || labelHost?.textContent
            || this._getSvgAfricanBuilderHistoryLabel?.(control)
            || id
        ).replace(/\s+/g, ' ').trim();
        return {
            host: control,
            control,
            panel: control.closest?.('[data-svg-african-builder-panel]')?.dataset?.svgAfricanBuilderPanel || 'character',
            disclosure: control.closest?.('details') || null,
            label
        };
    }

    _formatSvgAfricanBuilderReviewValue(controlId, rawValue, meta = null) {
        if (controlId === 'svg-african-accessories') {
            let values = [];
            try { values = JSON.parse(rawValue || '[]'); } catch (_) {}
            if (!Array.isArray(values) || !values.length) return 'None';
            const host = document.getElementById('svg-african-accessories');
            return values.map(value => {
                const input = [...(host?.querySelectorAll?.('input') || [])].find(item => item.value === value);
                return String(input?.closest?.('label')?.textContent || value).replace(/\s+/g, ' ').trim();
            }).join(', ');
        }
        const control = meta?.control || document.getElementById(controlId);
        if (!control) return String(rawValue ?? '');
        const type = String(control.type || '').toLowerCase();
        if (type === 'checkbox' || type === 'radio') return rawValue === '1' ? 'On' : 'Off';
        if (control.matches?.('select')) {
            const option = [...control.options].find(item => String(item.value) === String(rawValue));
            return String(option?.textContent || rawValue || 'None').replace(/\s+/g, ' ').trim();
        }
        if (type === 'color') return String(rawValue || '').toUpperCase();
        if (type === 'range' && control.dataset?.svgAfricanAdjust) {
            const numeric = Number(rawValue);
            return Number.isFinite(numeric) ? `${Math.round(numeric * 100)}%` : String(rawValue || '0');
        }
        return String(rawValue ?? '');
    }

    _restoreSvgAfricanBuilderReviewedChange(change = {}) {
        const controlId = String(change.controlId || '');
        if (!controlId) return false;
        this._setSvgAfricanBuilderCloseGuard(false, { focus: false });
        this._svgAfricanBuilderPreviewComparison = 'current';

        if (controlId === 'svg-african-accessories') {
            let baseline = [];
            try { baseline = JSON.parse(change.before || '[]'); } catch (_) {}
            const selected = new Set(Array.isArray(baseline) ? baseline : []);
            document.querySelectorAll('#svg-african-accessories input').forEach(input => {
                input.checked = selected.has(input.value);
            });
            this._svgAfricanBuilderFocusRequest = {
                roles: ['torso', 'right-arm', 'left-arm', 'front-arm', 'back-arm'],
                anchorY: 0.46
            };
            this._scheduleSvgAfricanBuilderPreview({
                historyInteraction: {
                    controlId,
                    label: 'Restore Accessories',
                    coalesce: false
                }
            });
            return true;
        }

        const control = document.getElementById(controlId);
        if (!control || control.disabled) return false;
        const type = String(control.type || '').toLowerCase();
        if (type === 'checkbox' || type === 'radio') {
            control.checked = change.before === '1';
        } else if (control.multiple) {
            let baseline = [];
            try { baseline = JSON.parse(change.before || '[]'); } catch (_) {}
            const selected = new Set(Array.isArray(baseline) ? baseline.map(String) : []);
            [...control.options].forEach(option => { option.selected = selected.has(String(option.value)); });
        } else {
            control.value = String(change.before ?? '');
        }

        const eventType = ['range', 'color'].includes(type) ? 'input' : 'change';
        control.dispatchEvent(new Event(eventType, { bubbles: true }));
        return true;
    }

    _syncSvgAfricanBuilderDraftReview() {
        const review = document.getElementById('svg-african-builder-change-review');
        const list = document.getElementById('svg-african-builder-change-list');
        const total = document.getElementById('svg-african-builder-change-total');
        if (!review || !list || !total) return [];

        const session = this._svgAfricanBuilderEditSession;
        const history = session?.history;
        const opening = session?.openingHistoryEntry || history?.entries?.[0] || null;
        const current = history?.entries?.[history.index] || null;
        const sameDraft = !opening?.signature || !current?.signature || opening.signature === current.signature;
        const baselineStates = opening?.controlStates || {};
        const currentStates = this._captureSvgAfricanBuilderControlStates?.() || current?.controlStates || {};
        const panelOrder = { character: 0, face: 1, clothing: 2, body: 3 };
        const changes = sameDraft ? [] : [...new Set([
            ...Object.keys(baselineStates),
            ...Object.keys(currentStates)
        ])].map(controlId => {
            const before = baselineStates[controlId];
            const after = currentStates[controlId];
            if (before === after) return null;
            const meta = this._getSvgAfricanBuilderReviewControl?.(controlId);
            if (!meta?.host) return null;
            if (meta.control?.disabled) return null;
            const hiddenAncestor = meta.host.closest?.('[hidden]');
            if (hiddenAncestor && !hiddenAncestor.matches?.('[data-svg-african-builder-panel]')) return null;
            if (meta.host.closest?.('.is-builder-option-collapsed')) return null;
            return {
                controlId,
                before,
                after,
                ...meta,
                beforeLabel: this._formatSvgAfricanBuilderReviewValue(controlId, before, meta),
                afterLabel: this._formatSvgAfricanBuilderReviewValue(controlId, after, meta)
            };
        }).filter(Boolean).sort((a, b) => {
            const panelDelta = (panelOrder[a.panel] ?? 9) - (panelOrder[b.panel] ?? 9);
            if (panelDelta) return panelDelta;
            return String(a.label).localeCompare(String(b.label));
        });

        const counts = { character: 0, face: 0, clothing: 0, body: 0 };
        changes.forEach(change => { counts[change.panel] = (counts[change.panel] || 0) + 1; });
        document.querySelectorAll('[data-svg-african-change-count]').forEach(badge => {
            const count = counts[badge.dataset.svgAfricanChangeCount] || 0;
            badge.textContent = String(count);
            badge.hidden = count === 0;
            badge.title = `${count} draft ${count === 1 ? 'change' : 'changes'}`;
        });

        list.replaceChildren();
        const icons = {
            character: 'fa-user',
            face: 'fa-face-smile',
            clothing: 'fa-shirt',
            body: 'fa-sliders'
        };
        changes.forEach(change => {
            const row = document.createElement('div');
            row.className = 'svg-african-builder-change-row';
            row.dataset.controlId = change.controlId;
            row.dataset.panel = change.panel;
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'svg-african-builder-change-item';
            button.dataset.controlId = change.controlId;
            button.dataset.panel = change.panel;
            button.title = `Edit ${change.label}`;
            const icon = document.createElement('i');
            icon.className = `fas ${icons[change.panel] || 'fa-pen'}`;
            icon.setAttribute('aria-hidden', 'true');
            const copy = document.createElement('span');
            copy.className = 'svg-african-builder-change-copy';
            const label = document.createElement('strong');
            label.textContent = change.label;
            const value = document.createElement('span');
            value.textContent = `${change.beforeLabel} to ${change.afterLabel}`;
            copy.append(label, value);
            button.append(icon, copy);
            button.addEventListener('click', () => {
                this._setSvgAfricanBuilderPanel?.(change.panel);
                if (change.disclosure) change.disclosure.open = true;
                const focusTarget = () => {
                    const target = change.controlId === 'svg-african-accessories'
                        ? document.querySelector('#svg-african-accessories input')
                        : document.getElementById(change.controlId);
                    target?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
                    target?.focus?.({ preventScroll: true });
                };
                focusTarget();
                requestAnimationFrame(focusTarget);
            });
            const restore = document.createElement('button');
            restore.type = 'button';
            restore.className = 'svg-african-builder-change-restore';
            restore.dataset.controlId = change.controlId;
            restore.title = `Restore ${change.label} to ${change.beforeLabel}`;
            restore.setAttribute('aria-label', restore.title);
            const restoreIcon = document.createElement('i');
            restoreIcon.className = 'fas fa-rotate-left';
            restoreIcon.setAttribute('aria-hidden', 'true');
            const restoreLabel = document.createElement('span');
            restoreLabel.textContent = 'Restore';
            restore.append(restoreIcon, restoreLabel);
            restore.addEventListener('click', () => {
                this._restoreSvgAfricanBuilderReviewedChange?.(change);
            });
            row.append(button, restore);
            list.appendChild(row);
        });

        total.textContent = String(changes.length);
        review.dataset.changeCount = String(changes.length);
        review.hidden = changes.length === 0;
        if (!changes.length) review.open = false;
        return changes;
    }

    _restoreSvgAfricanBuilderHistoryIndex(nextIndex) {
        const session = this._svgAfricanBuilderEditSession;
        const history = session?.history;
        const index = Number(nextIndex);
        const entry = Number.isInteger(index) ? history?.entries?.[index] : null;
        if (!entry || typeof this._applySvgAfricanBuilderConfigToForm !== 'function') return false;

        const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
        const rawConfig = clone(entry.config || {});
        this._svgAfricanBuilderHistorySuspended = true;
        try {
            this._svgAfricanBuilderPreviewComparison = 'current';
            this._svgAfricanBuilderPreserveBasicSvg = entry.preserveBasicSvg === true;
            this._svgAfricanBuilderPremiumIntegrityEnabled = entry.premiumIntegrityEnabled !== false;
            const integrityToggle = document.getElementById('svg-african-premium-integrity');
            if (integrityToggle) integrityToggle.checked = this._svgAfricanBuilderPremiumIntegrityEnabled;
            const normalized = window.SvgAfricanCharacterCatalog?.normalizeConfig?.(rawConfig) || rawConfig;
            this._applySvgAfricanBuilderConfigToForm(normalized, { preservePieceOverrides: true });
            history.index = index;
            history.lastControlId = '';
            history.lastCapturedAt = 0;
        } finally {
            this._svgAfricanBuilderHistorySuspended = false;
        }
        this._syncSvgAfricanBuilderEditContext();
        this._syncSvgAfricanBuilderHistoryControls();
        this._scheduleSvgAfricanBuilderPreview({ skipHistory: true });
        return true;
    }

    undoSvgAfricanBuilderChange() {
        const history = this._svgAfricanBuilderEditSession?.history;
        if (!history || history.index <= 0) return false;
        return this._restoreSvgAfricanBuilderHistoryIndex(history.index - 1);
    }

    redoSvgAfricanBuilderChange() {
        const history = this._svgAfricanBuilderEditSession?.history;
        if (!history || history.index >= history.entries.length - 1) return false;
        return this._restoreSvgAfricanBuilderHistoryIndex(history.index + 1);
    }

    _beginSvgAfricanBuilderEditSession(selectedArmature = null, selectedConfig = null, options = {}) {
        const root = selectedArmature?.root;
        const isEdit = !!root?._svgCharacter;
        const formConfig = this._getSvgAfricanCharacterFormConfig?.() || {};
        const clone = value => value == null ? value : JSON.parse(JSON.stringify(value));
        const selectedView = String(
            this.jointSystem?._getSvgAfricanPremiumViewKey?.(selectedArmature)
            || selectedConfig?.view
            || selectedConfig?.styling?.view
            || formConfig?.styling?.view
            || 'front'
        );
        const partKeys = Object.keys(selectedArmature?.parts || {});
        this._svgAfricanBuilderEditSession = {
            mode: isEdit ? 'edit' : 'create',
            armature: isEdit ? selectedArmature : null,
            root: isEdit ? root : null,
            rootId: isEdit ? (root.id || '') : '',
            name: isEdit
                ? (root.name || selectedConfig?.name || document.getElementById('svg-african-preset')?.selectedOptions?.[0]?.textContent || 'SVG African character')
                : '',
            selectedView,
            selectedIsSide: partKeys.length
                ? partKeys.some(key => /^(?:front|back)-(?:arm|leg)$/.test(key))
                : selectedView.startsWith('side-'),
            placement: !isEdit && options.placement
                ? clone(options.placement)
                : null,
            preserveBasicSvg: this._svgAfricanBuilderPreserveBasicSvg === true,
            baselineApplyConfig: clone(selectedConfig || formConfig),
            baselineFormConfig: clone(formConfig),
            baselineSignature: this._getSvgAfricanBuilderConfigSignature(formConfig)
        };
        this._initializeSvgAfricanBuilderHistory(formConfig);
        return this._svgAfricanBuilderEditSession;
    }

    _getSvgAfricanBuilderCreateOptions() {
        const session = this._svgAfricanBuilderEditSession;
        let placement = session?.mode === 'create' && session.placement
            ? JSON.parse(JSON.stringify(session.placement))
            : null;
        const stage = this.stage || this.jointSystem?.stage;
        if (!placement && Number(stage?.width) > 0 && Number(stage?.height) > 0) {
            placement = {
                stageX: Number(stage.width) * 0.5,
                stageY: Number(stage.height) * 0.5,
                anchor: 'center'
            };
        }
        return {
            ignoreSelectionReference: true,
            ...(placement ? { placement } : {})
        };
    }

    _getSvgAfricanBuilderEditState() {
        const session = this._svgAfricanBuilderEditSession || { mode: 'create' };
        const currentConfig = this._getSvgAfricanCharacterFormConfig?.() || {};
        const currentSignature = this._getSvgAfricanBuilderConfigSignature(currentConfig);
        const requestedView = String(currentConfig?.styling?.view || currentConfig?.view || 'front');
        const requestedIsSide = requestedView.startsWith('side-');
        const isEdit = session.mode === 'edit';
        return {
            session,
            currentConfig,
            currentSignature,
            requestedView,
            isEdit,
            dirty: isEdit && currentSignature !== session.baselineSignature,
            structurallyCompatible: !isEdit || requestedIsSide === session.selectedIsSide
        };
    }

    _syncSvgAfricanBuilderEditContext() {
        const host = document.getElementById('svg-african-builder-context');
        if (!host) return null;
        const state = this._getSvgAfricanBuilderEditState();
        const title = document.getElementById('svg-african-builder-context-title');
        const detail = document.getElementById('svg-african-builder-context-detail');
        const status = document.getElementById('svg-african-builder-context-state');
        const icon = document.getElementById('svg-african-builder-context-icon');
        const revert = document.getElementById('btn-svg-african-revert-draft');
        const create = document.getElementById('btn-svg-african-create');
        const createLabel = document.getElementById('btn-svg-african-create-label');
        const update = document.getElementById('btn-svg-african-update');
        const duplicate = document.getElementById('btn-svg-african-duplicate');

        host.classList.remove('is-create', 'is-edit', 'is-dirty', 'is-incompatible');
        host.dataset.mode = state.isEdit ? 'edit' : 'create';
        host.dataset.dirty = state.dirty ? 'true' : 'false';
        host.dataset.structurallyCompatible = state.structurallyCompatible ? 'true' : 'false';

        if (!state.isEdit) {
            host.classList.add('is-create');
            if (title) title.textContent = 'New character';
            if (detail) detail.textContent = 'Previewing a new rig. Create Character adds it to the Stage.';
            if (status) status.textContent = 'Ready to create';
            if (icon) icon.className = 'fas fa-user-plus';
            if (revert) {
                revert.hidden = true;
                revert.disabled = true;
            }
            if (update) {
                update.hidden = true;
                update.disabled = true;
                update.classList.remove('btn-primary');
                update.title = 'Select an SVG African character on Stage to edit it.';
            }
            if (duplicate) {
                duplicate.hidden = true;
                duplicate.disabled = true;
                duplicate.title = 'Select an SVG African character on Stage to duplicate it.';
            }
            if (create) create.classList.add('btn-primary');
            if (createLabel) createLabel.textContent = 'Create Character';
            return state;
        }

        const displayName = String(state.session.name || 'SVG African character').trim();
        if (title) title.textContent = `Editing ${displayName}`;
        if (revert) {
            revert.hidden = false;
            revert.disabled = !state.dirty;
        }
        if (duplicate) {
            duplicate.hidden = false;
            duplicate.disabled = false;
            duplicate.title = 'Create a separate copy of the selected SVG character';
        }
        if (update) update.hidden = false;
        if (create) create.classList.remove('btn-primary');
        if (createLabel) createLabel.textContent = 'Create Separate';

        if (!state.structurallyCompatible) {
            host.classList.add('is-incompatible');
            if (detail) detail.textContent = 'Side and non-side views use different rigs. Use Create Character to add this draft as a separate armature.';
            if (status) status.textContent = 'Separate armature required';
            if (icon) icon.className = 'fas fa-triangle-exclamation';
            if (update) {
                update.hidden = true;
                update.disabled = true;
                update.classList.remove('btn-primary');
                update.title = 'This view uses a different armature structure. Use Create Character.';
            }
            if (create) create.classList.add('btn-primary');
        } else if (state.dirty) {
            host.classList.add('is-dirty');
            if (detail) detail.textContent = 'Draft changed. The Stage character stays unchanged until Update Selected.';
            if (status) status.textContent = 'Unsaved changes';
            if (icon) icon.className = 'fas fa-pen-to-square';
            if (update) {
                update.disabled = false;
                update.classList.add('btn-primary');
                update.title = 'Apply this draft to the selected SVG African character';
            }
        } else {
            host.classList.add('is-edit');
            if (detail) detail.textContent = 'The Builder matches the selected Stage character.';
            if (status) status.textContent = 'No changes';
            if (icon) icon.className = 'fas fa-user-check';
            if (update) {
                update.disabled = true;
                update.classList.add('btn-primary');
                update.title = 'Change a control before updating the selected character.';
            }
        }
        return state;
    }

    revertSvgAfricanBuilderDraft() {
        const session = this._svgAfricanBuilderEditSession;
        const baselineConfig = session?.baselineFormConfig || session?.baselineApplyConfig;
        if (session?.mode !== 'edit' || !baselineConfig || typeof this._applySvgAfricanBuilderConfigToForm !== 'function') {
            Utils.showToast('Open a selected SVG African character to revert its draft.', 'warning');
            return false;
        }
        this._svgAfricanBuilderPreserveBasicSvg = session.preserveBasicSvg === true;
        const integrityToggle = document.getElementById('svg-african-premium-integrity');
        if (integrityToggle) integrityToggle.checked = !this._svgAfricanBuilderPreserveBasicSvg;
        this._svgAfricanBuilderPremiumIntegrityEnabled = !this._svgAfricanBuilderPreserveBasicSvg;
        const normalizedBaseline = window.SvgAfricanCharacterCatalog?.normalizeConfig?.(
            JSON.parse(JSON.stringify(baselineConfig))
        ) || baselineConfig;
        this._applySvgAfricanBuilderConfigToForm(
            normalizedBaseline,
            { preservePieceOverrides: true }
        );
        this._svgAfricanBuilderFocusRequest = { mode: 'home' };
        this._svgAfricanBuilderPreviewNeedsCenter = true;
        this._syncSvgAfricanBuilderEditContext();
        this._scheduleSvgAfricanBuilderPreview();
        Utils.showToast('Builder draft restored to the selected character.', 'info');
        return true;
    }

    _syncSvgAfricanThreeQuarterArtworkControl() {
        const field = document.getElementById('svg-african-three-quarter-artwork-field');
        const select = document.getElementById('svg-african-three-quarter-artwork');
        const view = document.getElementById('svg-african-view')?.value || 'front';
        const visible = /^(front|back)-3q-(left|right)$/.test(view) || this._svgAfricanBuilderPreviewLayout === 'multiple';
        const profileField = document.getElementById('svg-african-rear-talking-profile-field');
        if (profileField) profileField.hidden = !(/^back-3q-/.test(view) || this._svgAfricanBuilderPreviewLayout === 'multiple')
            || select?.value !== 'experimental-drawn';
        const drawnOption = select?.querySelector?.('option[value="experimental-drawn"]');
        const drawnAvailable = typeof window.SvgAfricanThreeQuarterRenderer?.renderPartSvg === 'function'
            && typeof window.SvgAfricanPremiumAssets?.resolveAssetForConfig === 'function';
        if (field) field.hidden = !visible;
        if (select) {
            select.disabled = false;
            select.dataset.experimentalReady = drawnAvailable ? 'true' : 'false';
            if (drawnOption) drawnOption.disabled = !drawnAvailable;
            select.setAttribute('aria-hidden', visible ? 'false' : 'true');
            if (
                ![...select.options].some(option => option.value === select.value)
                || (select.value === 'experimental-drawn' && !drawnAvailable)
            ) {
                select.value = 'projected';
            }
        }
        return visible;
    }

    _initializeSvgAfricanBuilderNavigation() {
        const form = document.querySelector('#svg-african-character-modal .svg-african-form');
        const tabHost = document.getElementById('svg-african-builder-tabs');
        if (!form || !tabHost) return false;
        if (form.dataset.svgAfricanPanelsReady === '1') return true;

        const panelKeys = ['character', 'face', 'clothing', 'body'];
        const panels = new Map();
        panelKeys.forEach(key => {
            const panel = document.createElement('section');
            panel.id = `svg-african-builder-panel-${key}`;
            panel.className = 'svg-african-builder-panel svg-african-field-wide';
            panel.dataset.svgAfricanBuilderPanel = key;
            panel.setAttribute('role', 'tabpanel');
            panel.setAttribute('aria-labelledby', `svg-african-builder-tab-${key}`);
            const grid = document.createElement('div');
            grid.className = 'svg-african-builder-panel-grid';
            panel.appendChild(grid);
            form.appendChild(panel);
            panels.set(key, { panel, grid });
            const tab = document.getElementById(`svg-african-builder-tab-${key}`);
            tab?.setAttribute('aria-controls', panel.id);
        });

        const characterIds = new Set([
            'svg-african-preset',
            'svg-african-premium-integrity',
            'svg-african-presentation',
            'svg-african-age',
            'svg-african-skin',
            'svg-african-view',
            'svg-african-three-quarter-artwork-field',
            'svg-african-three-quarter-artwork',
            'svg-african-rear-talking-profile-field',
            'svg-african-rear-talking-profile'
        ]);
        const faceIds = new Set([
            'svg-african-head-type',
            'svg-african-face',
            'svg-african-adj-face-effect',
            'svg-african-eyes',
            'svg-african-nose',
            'svg-african-lips',
            'svg-african-hair',
            'svg-african-hair-color',
            'svg-african-facial-hair',
            'svg-african-face-preset'
        ]);
        const clothingIds = new Set([
            'svg-african-profession',
            'svg-african-outfit',
            'svg-african-resolved-outfit',
            'svg-african-custom-pieces',
            'svg-african-top-clothing',
            'svg-african-sleeve-length',
            'svg-african-bottom-clothing',
            'svg-african-skirt-length',
            'svg-african-clothing-palette',
            'svg-african-fabric-design',
            'svg-african-neck-tie-type',
            'svg-african-neck-tie-design',
            'svg-african-headwear',
            'svg-african-footwear',
            'svg-african-cultural-style',
            'svg-african-accessories',
            'svg-african-jewelry',
            'svg-african-color-enable',
            'svg-african-color-grid'
        ]);
        const bodyIds = new Set(['svg-african-body', 'svg-african-height']);
        const faceAdjustments = new Set([
            'faceShapeStrength', 'headWidth', 'faceWidth', 'headHeight', 'foreheadProjection',
            'browRidge', 'cheekFullness', 'jawDepth', 'chinProjection', 'chinHeight',
            'occiputDepth', 'earSize', 'earHeight', 'hairVolume', 'hairlineHeight',
            'eyeSize', 'eyeSpacing', 'eyeHeight', 'browHeight', 'browLength',
            'noseWidth', 'noseLength', 'lipFullness', 'lipHeight', 'lipWidth'
        ]);
        const clothingAdjustments = new Set([
            'headwearWidth', 'headwearHeight', 'headwearLift', 'headwearTilt',
            'topWearLength', 'bottomWearLength'
        ]);
        const summaryHost = document.getElementById('svg-african-builder-summary');
        const changeReviewHost = document.getElementById('svg-african-builder-change-review');
        const originalRows = [...form.children].filter(child => (
            child !== tabHost
            && child !== summaryHost
            && child !== changeReviewHost
            && !child.matches('.svg-african-builder-panel')
        ));
        const rowGroup = row => {
            const ids = new Set([row.id, ...[...row.querySelectorAll('[id]')].map(node => node.id)].filter(Boolean));
            const hasId = set => [...ids].some(id => set.has(id));
            if (hasId(characterIds)) return 'character';
            if (hasId(faceIds)) return 'face';
            if (hasId(clothingIds)) return 'clothing';
            if (hasId(bodyIds)) return 'body';
            const adjustment = row.matches?.('[data-svg-african-adjust]')
                ? row
                : row.querySelector?.('[data-svg-african-adjust]');
            const property = adjustment?.dataset?.svgAfricanAdjust || '';
            if (faceAdjustments.has(property)) return 'face';
            if (clothingAdjustments.has(property)) return 'clothing';
            if (property) return 'body';
            return 'character';
        };

        originalRows.forEach(row => {
            if (row.classList.contains('svg-african-section-title')) {
                row.remove();
                return;
            }
            panels.get(rowGroup(row))?.grid.appendChild(row);
        });

        const addDisclosure = (panelKey, id, label, rows) => {
            const grid = panels.get(panelKey)?.grid;
            const movable = rows.filter(row => row?.parentElement === grid);
            if (!grid || !movable.length) return;
            const details = document.createElement('details');
            details.id = id;
            details.className = 'svg-african-builder-disclosure svg-african-field-wide';
            const summary = document.createElement('summary');
            summary.innerHTML = `<i class="fas fa-sliders" aria-hidden="true"></i><span>${label}</span>`;
            const body = document.createElement('div');
            body.className = 'svg-african-builder-disclosure-body';
            grid.insertBefore(details, movable[0]);
            details.append(summary, body);
            movable.forEach(row => body.appendChild(row));
        };
        const panelRows = key => [...(panels.get(key)?.grid.children || [])];
        addDisclosure(
            'face',
            'svg-african-face-fine-adjustments',
            'Fine adjustments',
            panelRows('face').filter(row => row.classList.contains('svg-african-range-field') && !row.querySelector('#svg-african-adj-face-effect'))
        );
        addDisclosure(
            'clothing',
            'svg-african-clothing-fit-adjustments',
            'Fit adjustments',
            panelRows('clothing').filter(row => row.classList.contains('svg-african-range-field'))
        );
        addDisclosure(
            'clothing',
            'svg-african-accessory-options',
            'Accessories',
            panelRows('clothing').filter(row => ['svg-african-accessories', 'svg-african-jewelry'].includes(row.id))
        );
        addDisclosure(
            'body',
            'svg-african-body-proportions',
            'Proportions',
            panelRows('body').filter(row => row.classList.contains('svg-african-range-field'))
        );

        tabHost.querySelectorAll('[data-svg-african-builder-tab]').forEach(tab => {
            tab.addEventListener('click', () => this._setSvgAfricanBuilderPanel(tab.dataset.svgAfricanBuilderTab));
            tab.addEventListener('keydown', event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                const tabs = [...tabHost.querySelectorAll('[data-svg-african-builder-tab]')];
                const current = Math.max(0, tabs.indexOf(tab));
                const next = event.key === 'Home'
                    ? 0
                    : event.key === 'End'
                        ? tabs.length - 1
                        : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
                event.preventDefault();
                tabs[next]?.focus();
                this._setSvgAfricanBuilderPanel(tabs[next]?.dataset?.svgAfricanBuilderTab);
            });
        });
        summaryHost?.querySelectorAll('[data-svg-african-summary-target]').forEach(button => {
            button.addEventListener('click', () => {
                const target = button.dataset.svgAfricanSummaryTarget || 'character';
                this._setSvgAfricanBuilderPanel(target);
                document.getElementById(`svg-african-builder-tab-${target}`)?.focus();
            });
        });
        form.dataset.svgAfricanPanelsReady = '1';
        this._syncSvgAfricanBuilderSelectionSummary();
        this._syncSvgAfricanBuilderDraftReview?.();
        this._setSvgAfricanBuilderPanel('character', { focusPreview: false, resetScroll: false });
        return true;
    }

    _syncSvgAfricanBuilderSelectionSummary() {
        const host = document.getElementById('svg-african-builder-summary');
        if (!host) return false;
        const selectedLabel = (id, fallback = '') => {
            const select = document.getElementById(id);
            const option = select?.selectedOptions?.[0];
            return String(option?.textContent || fallback || select?.value || '').trim();
        };
        const compact = values => values
            .map(value => String(value || '').trim())
            .filter(Boolean)
            .join(' · ');
        const customPieces = this._isSvgAfricanCustomPiecesEnabled?.() === true;
        const headwear = selectedLabel('svg-african-headwear');
        const clothing = customPieces
            ? compact([
                selectedLabel('svg-african-top-clothing', 'Custom top'),
                selectedLabel('svg-african-bottom-clothing', 'Custom bottom')
            ])
            : compact([
                selectedLabel('svg-african-outfit', 'Outfit'),
                headwear && !/^none$/i.test(headwear) ? headwear : ''
            ]);
        const values = {
            character: compact([
                selectedLabel('svg-african-preset', 'Character'),
                selectedLabel('svg-african-view', 'Front')
            ]),
            face: compact([
                selectedLabel('svg-african-hair', 'Hair'),
                selectedLabel('svg-african-face', 'Face')
            ]),
            clothing: clothing || 'Outfit',
            body: compact([
                selectedLabel('svg-african-body', 'Body'),
                selectedLabel('svg-african-height', 'Height')
            ])
        };
        Object.entries(values).forEach(([key, value]) => {
            const label = host.querySelector(`[data-svg-african-summary-value="${key}"]`);
            const button = host.querySelector(`[data-svg-african-summary-target="${key}"]`);
            if (label) label.textContent = value;
            if (button) {
                button.title = `Edit ${key === 'face' ? 'face and hair' : key}: ${value}`;
                button.setAttribute('aria-label', button.title);
            }
        });
        return true;
    }

    _setSvgAfricanBuilderPanel(panelKey = 'character', options = {}) {
        const form = document.querySelector('#svg-african-character-modal .svg-african-form');
        if (!form) return false;
        const available = new Set(['character', 'face', 'clothing', 'body']);
        const active = available.has(panelKey) ? panelKey : 'character';
        form.dataset.activePanel = active;
        form.querySelectorAll('[data-svg-african-builder-panel]').forEach(panel => {
            panel.hidden = panel.dataset.svgAfricanBuilderPanel !== active;
        });
        document.querySelectorAll('[data-svg-african-builder-tab]').forEach(tab => {
            const selected = tab.dataset.svgAfricanBuilderTab === active;
            tab.classList.toggle('is-active', selected);
            tab.setAttribute('aria-selected', selected ? 'true' : 'false');
            tab.tabIndex = selected ? 0 : -1;
        });
        document.querySelectorAll('[data-svg-african-summary-target]').forEach(button => {
            const selected = button.dataset.svgAfricanSummaryTarget === active;
            button.classList.toggle('is-active', selected);
            if (selected) button.setAttribute('aria-current', 'true');
            else button.removeAttribute('aria-current');
        });
        this._svgAfricanBuilderActivePanel = active;
        if (options.resetScroll !== false) form.scrollTop = 0;
        if (options.focusPreview !== false) {
            const focus = {
                character: { mode: 'home' },
                face: { roles: ['head-neck'], anchorY: 0.35 },
                clothing: { roles: ['torso', 'right-arm', 'left-arm', 'front-arm', 'back-arm', 'right-leg', 'left-leg', 'front-leg', 'back-leg'], anchorY: 0.5 },
                body: { mode: 'home' }
            }[active];
            this._requestSvgAfricanBuilderPreviewFocus(focus);
        }
        return true;
    }

    _bindSvgAfricanBuilderChrome() {
        const modal = document.getElementById('svg-african-character-modal');
        const expandButton = document.getElementById('svg-african-builder-expand');
        if (!modal) return;
        this._initializeSvgAfricanBuilderNavigation();
        const syncZoomLabel = () => {
            const resetButton = document.getElementById('svg-african-preview-zoom-reset');
            if (resetButton) resetButton.textContent = `${Math.round((this._svgAfricanBuilderPreviewZoom || 1) * 100)}%`;
        };
        const setZoom = (next) => {
            const numeric = Number(next);
            this._svgAfricanBuilderPreviewZoom = Math.max(0.55, Math.min(2.4, Number.isFinite(numeric) ? numeric : 1));
            this._svgAfricanBuilderPreviewNeedsCenter = true;
            this._svgAfricanBuilderFocusRequest = { mode: 'home' };
            syncZoomLabel();
            this._scheduleSvgAfricanBuilderPreview();
        };
        if (expandButton && expandButton.dataset.svgAfricanBuilderExpandBound !== '1') {
            expandButton.dataset.svgAfricanBuilderExpandBound = '1';
            expandButton.addEventListener('click', () => {
                const expanded = modal.classList.toggle('svg-african-builder-expanded');
                expandButton.setAttribute('aria-pressed', expanded ? 'true' : 'false');
                expandButton.innerHTML = expanded
                    ? '<i class="fas fa-compress-arrows-alt"></i> Fit'
                    : '<i class="fas fa-up-right-and-down-left-from-center"></i> Expand';
                this._svgAfricanBuilderPreviewNeedsCenter = true;
                this._scheduleSvgAfricanBuilderPreview();
            });
        }
        const zoomOut = document.getElementById('svg-african-preview-zoom-out');
        const zoomIn = document.getElementById('svg-african-preview-zoom-in');
        const zoomReset = document.getElementById('svg-african-preview-zoom-reset');
        const themeButton = document.getElementById('svg-african-preview-theme');
        const compareButton = document.getElementById('svg-african-preview-compare');
        ['single', 'multiple'].forEach(mode => {
            const button = document.getElementById(`svg-african-preview-${mode}`);
            if (!button || button.dataset.svgAfricanLayoutBound === '1') return;
            button.dataset.svgAfricanLayoutBound = '1';
            button.addEventListener('click', () => this._setSvgAfricanBuilderPreviewLayout(mode));
        });
        const motionSelect = document.getElementById('svg-african-builder-motion-select');
        const motionPlay = document.getElementById('svg-african-builder-motion-play');
        const motionStop = document.getElementById('svg-african-builder-motion-stop');
        const undoDraft = document.getElementById('btn-svg-african-undo');
        const redoDraft = document.getElementById('btn-svg-african-redo');
        const keepEditing = document.getElementById('btn-svg-african-keep-editing');
        const discardDraft = document.getElementById('btn-svg-african-discard-draft');
        const builderReset = document.getElementById('btn-svg-african-reset');
        const revertDraft = document.getElementById('btn-svg-african-revert-draft');
        const premiumIntegrityToggle = document.getElementById('svg-african-premium-integrity');
        const restoreAuthoredButton = document.getElementById('btn-svg-african-restore-authored');
        const builderTools = document.getElementById('svg-african-builder-tools');
        const focusButtons = [
            ['svg-african-preview-focus-full', { mode: 'home' }],
            ['svg-african-preview-focus-head', { roles: ['head-neck'], anchorY: 0.35 }],
            ['svg-african-preview-focus-upper', { roles: ['right-arm', 'left-arm', 'torso'], anchorY: 0.44 }],
            ['svg-african-preview-focus-lower', { roles: ['right-leg', 'left-leg', 'torso'], anchorY: 0.68 }]
        ];
        const preview = document.getElementById('svg-african-builder-preview');
        const previewPane = modal.querySelector('.svg-african-builder-preview-pane');
        if (builderReset && builderReset.dataset.svgAfricanBuilderResetBound !== '1') {
            builderReset.dataset.svgAfricanBuilderResetBound = '1';
            builderReset.addEventListener('click', () => this.resetSvgAfricanCharacterBuilder());
        }
        if (revertDraft && revertDraft.dataset.svgAfricanBuilderRevertBound !== '1') {
            revertDraft.dataset.svgAfricanBuilderRevertBound = '1';
            revertDraft.addEventListener('click', () => this.revertSvgAfricanBuilderDraft());
        }
        if (undoDraft && undoDraft.dataset.svgAfricanBuilderHistoryBound !== '1') {
            undoDraft.dataset.svgAfricanBuilderHistoryBound = '1';
            undoDraft.addEventListener('click', () => this.undoSvgAfricanBuilderChange());
        }
        if (redoDraft && redoDraft.dataset.svgAfricanBuilderHistoryBound !== '1') {
            redoDraft.dataset.svgAfricanBuilderHistoryBound = '1';
            redoDraft.addEventListener('click', () => this.redoSvgAfricanBuilderChange());
        }
        if (keepEditing && keepEditing.dataset.svgAfricanCloseGuardBound !== '1') {
            keepEditing.dataset.svgAfricanCloseGuardBound = '1';
            keepEditing.addEventListener('click', () => this._setSvgAfricanBuilderCloseGuard(false, { focus: false }));
        }
        if (discardDraft && discardDraft.dataset.svgAfricanCloseGuardBound !== '1') {
            discardDraft.dataset.svgAfricanCloseGuardBound = '1';
            discardDraft.addEventListener('click', () => this.closeSvgAfricanCharacterLibrary({ force: true }));
        }
        if (builderTools && builderTools.dataset.svgAfricanBuilderToolsBound !== '1') {
            builderTools.dataset.svgAfricanBuilderToolsBound = '1';
            builderTools.addEventListener('click', event => {
                if (!event.target?.closest?.('button')) return;
                requestAnimationFrame(() => { builderTools.open = false; });
            });
            modal.addEventListener('pointerdown', event => {
                if (builderTools.open && !builderTools.contains(event.target)) builderTools.open = false;
            });
        }
        if (modal.dataset.svgAfricanBuilderHistoryKeysBound !== '1') {
            modal.dataset.svgAfricanBuilderHistoryKeysBound = '1';
            modal.addEventListener('keydown', (event) => {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    event.stopPropagation();
                    this.closeSvgAfricanCharacterLibrary();
                    return;
                }
                if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
                const target = event.target;
                if (target?.matches?.('textarea,input[type="text"],input[type="search"],input[type="number"]')) return;
                const key = String(event.key || '').toLowerCase();
                const redo = key === 'y' || (key === 'z' && event.shiftKey);
                const undo = key === 'z' && !event.shiftKey;
                const handled = redo
                    ? this.redoSvgAfricanBuilderChange()
                    : undo
                        ? this.undoSvgAfricanBuilderChange()
                        : false;
                if (handled) event.preventDefault();
            });
        }
        if (premiumIntegrityToggle && premiumIntegrityToggle.dataset.svgAfricanPremiumIntegrityBound !== '1') {
            premiumIntegrityToggle.dataset.svgAfricanPremiumIntegrityBound = '1';
            premiumIntegrityToggle.addEventListener('change', () => {
                this._svgAfricanBuilderPremiumIntegrityEnabled = premiumIntegrityToggle.checked;
                if (premiumIntegrityToggle.checked) {
                    const restored = this._restoreSvgAfricanAuthoredDefaults({
                        onlyIfFallback: true,
                        silent: true
                    });
                    if (restored) return;
                }
                this._scheduleSvgAfricanBuilderPreview();
            });
        }
        if (restoreAuthoredButton && restoreAuthoredButton.dataset.svgAfricanRestoreBound !== '1') {
            restoreAuthoredButton.dataset.svgAfricanRestoreBound = '1';
            restoreAuthoredButton.addEventListener('click', () => {
                this._restoreSvgAfricanAuthoredDefaults({ silent: false });
            });
        }
        if (zoomOut && zoomOut.dataset.svgAfricanBuilderZoomBound !== '1') {
            zoomOut.dataset.svgAfricanBuilderZoomBound = '1';
            zoomOut.addEventListener('click', () => setZoom((this._svgAfricanBuilderPreviewZoom || 1) - 0.12));
        }
        if (zoomIn && zoomIn.dataset.svgAfricanBuilderZoomBound !== '1') {
            zoomIn.dataset.svgAfricanBuilderZoomBound = '1';
            zoomIn.addEventListener('click', () => setZoom((this._svgAfricanBuilderPreviewZoom || 1) + 0.12));
        }
        if (zoomReset && zoomReset.dataset.svgAfricanBuilderZoomBound !== '1') {
            zoomReset.dataset.svgAfricanBuilderZoomBound = '1';
            zoomReset.addEventListener('click', () => setZoom(1));
        }
        if (themeButton && themeButton.dataset.svgAfricanBuilderThemeBound !== '1') {
            themeButton.dataset.svgAfricanBuilderThemeBound = '1';
            themeButton.addEventListener('click', () => {
                const order = ['dark', 'plain', 'light'];
                const current = this._svgAfricanBuilderPreviewTheme || 'light';
                const next = order[(order.indexOf(current) + 1) % order.length] || 'light';
                this._svgAfricanBuilderPreviewTheme = next;
                themeButton.setAttribute('aria-pressed', next === 'dark' ? 'true' : 'false');
                themeButton.title = `Preview background: ${next}`;
                this._svgAfricanBuilderPreviewNeedsCenter = true;
                this._scheduleSvgAfricanBuilderPreview();
            });
        }
        if (compareButton && compareButton.dataset.svgAfricanBuilderCompareBound !== '1') {
            compareButton.dataset.svgAfricanBuilderCompareBound = '1';
            compareButton.addEventListener('click', () => {
                const showingOpening = this._svgAfricanBuilderPreviewComparison === 'opening';
                this._setSvgAfricanBuilderPreviewComparison(showingOpening ? 'current' : 'opening');
            });
        }
        if (motionSelect && motionSelect.dataset.svgAfricanBuilderMotionBound !== '1') {
            motionSelect.dataset.svgAfricanBuilderMotionBound = '1';
            motionSelect.addEventListener('change', () => {
                if (this._svgAfricanBuilderMotionCheck?.playing) {
                    this._playSvgAfricanBuilderMotionCheck(motionSelect.value);
                } else {
                    this._syncSvgAfricanBuilderMotionCheckControls({ stateLabel: 'Ready' });
                }
            });
        }
        if (motionPlay && motionPlay.dataset.svgAfricanBuilderMotionBound !== '1') {
            motionPlay.dataset.svgAfricanBuilderMotionBound = '1';
            motionPlay.addEventListener('click', () => {
                this._playSvgAfricanBuilderMotionCheck(motionSelect?.value || 'idle');
            });
        }
        if (motionStop && motionStop.dataset.svgAfricanBuilderMotionBound !== '1') {
            motionStop.dataset.svgAfricanBuilderMotionBound = '1';
            motionStop.addEventListener('click', () => {
                this._stopSvgAfricanBuilderMotionCheck({ reset: true });
            });
        }
        focusButtons.forEach(([id, request]) => {
            const button = document.getElementById(id);
            if (!button || button.dataset.svgAfricanBuilderFocusBound === '1') return;
            button.dataset.svgAfricanBuilderFocusBound = '1';
            button.addEventListener('click', () => this._requestSvgAfricanBuilderPreviewFocus(request));
        });
        const panSurface = previewPane || preview;
        if (preview && panSurface && panSurface.dataset.svgAfricanBuilderPanBound !== '1') {
            panSurface.dataset.svgAfricanBuilderPanBound = '1';
            let panState = null;
            const canPan = () => preview.scrollWidth > preview.clientWidth + 2 || preview.scrollHeight > preview.clientHeight + 2;
            const endPan = (event) => {
                if (!panState) return;
                try { panSurface.releasePointerCapture?.(event.pointerId); } catch (_) {}
                panState = null;
                preview.classList.remove('is-panning');
                panSurface.classList.remove('is-panning');
            };
            preview.addEventListener('pointerdown', (event) => {
                if (this._svgAfricanBuilderPreviewLayout === 'multiple' || event.button !== 0 || !canPan()) return;
                if (event.target?.closest?.('button,input,select,textarea,a,label')) return;
                panState = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    left: preview.scrollLeft,
                    top: preview.scrollTop
                };
                panSurface.setPointerCapture?.(event.pointerId);
                preview.classList.add('is-panning');
                panSurface.classList.add('is-panning');
                event.preventDefault();
            });
            panSurface.addEventListener('pointerdown', (event) => {
                if (this._svgAfricanBuilderPreviewLayout === 'multiple') return;
                if (event.target === preview || event.target?.closest?.('#svg-african-builder-preview')) return;
                if (event.button !== 0 || !canPan()) return;
                if (event.target?.closest?.('button,input,select,textarea,a,label')) return;
                panState = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    left: preview.scrollLeft,
                    top: preview.scrollTop
                };
                panSurface.setPointerCapture?.(event.pointerId);
                preview.classList.add('is-panning');
                panSurface.classList.add('is-panning');
                event.preventDefault();
            });
            panSurface.addEventListener('pointermove', (event) => {
                if (!panState || panState.pointerId !== event.pointerId) return;
                preview.scrollLeft = panState.left - (event.clientX - panState.x);
                preview.scrollTop = panState.top - (event.clientY - panState.y);
                this._svgAfricanBuilderUserPannedPreview = true;
            });
            panSurface.addEventListener('pointerup', endPan);
            panSurface.addEventListener('pointercancel', endPan);
            preview.addEventListener('wheel', (event) => {
                if (!canPan()) return;
                const canScrollX = preview.scrollWidth > preview.clientWidth + 2;
                const canScrollY = preview.scrollHeight > preview.clientHeight + 2;
                const deltaX = Number(event.deltaX) || 0;
                const deltaY = Number(event.deltaY) || 0;

                if (event.shiftKey && canScrollX) {
                    preview.scrollLeft += deltaY || deltaX;
                    this._svgAfricanBuilderUserPannedPreview = true;
                    event.preventDefault();
                    return;
                }
                if (canScrollY && Math.abs(deltaY) >= Math.abs(deltaX)) {
                    preview.scrollTop += deltaY;
                    this._svgAfricanBuilderUserPannedPreview = true;
                    event.preventDefault();
                    return;
                }
                if (canScrollX && deltaX) {
                    preview.scrollLeft += deltaX;
                    this._svgAfricanBuilderUserPannedPreview = true;
                    event.preventDefault();
                }
            }, { passive: false });
        }
        if (!this._svgAfricanBuilderPreviewZoom) this._svgAfricanBuilderPreviewZoom = 1;
        // Light default matches the stage; a dark background washed dark hair/brows/pupils to a faint whitish read.
        if (!this._svgAfricanBuilderPreviewTheme) this._svgAfricanBuilderPreviewTheme = 'light';
        if (themeButton) {
            themeButton.setAttribute('aria-pressed', this._svgAfricanBuilderPreviewTheme === 'dark' ? 'true' : 'false');
            themeButton.title = `Preview background: ${this._svgAfricanBuilderPreviewTheme}`;
        }
        syncZoomLabel();
        this._syncSvgAfricanBuilderMotionCheckControls();
        this._syncSvgAfricanBuilderHistoryControls();
    }

    _syncSvgAfricanOutfitCompatibility() {
        const catalog = window.SvgAfricanCharacterCatalog;
        const outfitSelect = document.getElementById('svg-african-outfit');
        if (!catalog || !outfitSelect) return;
        const presentation = document.getElementById('svg-african-presentation')?.value || 'female';
        const culturalStyle = document.getElementById('svg-african-cultural-style')?.value || 'contemporary';
        const compatible = typeof catalog.isOutfitCompatibleWithPresentation === 'function'
            ? (outfitId) => catalog.isOutfitCompatibleWithPresentation(outfitId, presentation)
            : (outfitId) => !(presentation === 'male' && ['ankara-peplum', 'corporate-dress', 'iro-buba', 'george-wrapper'].includes(outfitId));
        let currentAllowed = true;
        [...outfitSelect.options].forEach(option => {
            if (!option.dataset.baseLabel) option.dataset.baseLabel = option.textContent;
            const allowed = compatible(option.value) !== false;
            option.disabled = !allowed;
            option.textContent = allowed ? option.dataset.baseLabel : `${option.dataset.baseLabel} (female/wrapper)`;
            option.title = allowed ? '' : 'Skirt and wrapper silhouettes are not used for male SVG African characters.';
            if (option.selected && !allowed) currentAllowed = false;
        });
        if (!currentAllowed) {
            const fallback = typeof catalog.fallbackOutfitForPresentation === 'function'
                ? catalog.fallbackOutfitForPresentation(outfitSelect.value, presentation, culturalStyle)
                : (['ankara', 'yoruba', 'igbo', 'hausa-fulani', 'niger-delta', 'modest'].includes(culturalStyle) ? 'senator-wear' : 'business-suit');
            if ([...outfitSelect.options].some(option => option.value === fallback && !option.disabled)) {
                outfitSelect.value = fallback;
            }
        }
        this._syncSvgAfricanClothingCompatibility();
    }

    _syncSvgAfricanClothingCompatibility() {
        const catalog = window.SvgAfricanCharacterCatalog;
        if (!catalog) return;
        const presentation = document.getElementById('svg-african-presentation')?.value || 'female';
        const topSelect = document.getElementById('svg-african-top-clothing');
        const sleeveLengthRow = document.getElementById('svg-african-sleeve-length')?.closest?.('label');
        const bottomSelect = document.getElementById('svg-african-bottom-clothing');
        const skirtLengthRow = document.getElementById('svg-african-skirt-length')?.closest?.('label');
        const femaleOnlyBottoms = new Set(['skirt-straight', 'skirt-pleated', 'wrapper', 'iro-wrapper', 'george-wrapper-bottom']);
        const topValue = topSelect?.value || 'auto';
        if (sleeveLengthRow) {
            sleeveLengthRow.classList.toggle('hidden', topValue === 'none');
        }
        let skirtLikeSelected = false;
        if (bottomSelect) {
            [...bottomSelect.options].forEach(option => {
                if (!option.dataset.baseLabel) option.dataset.baseLabel = option.textContent;
                const allowed = !(presentation === 'male' && femaleOnlyBottoms.has(option.value));
                option.disabled = !allowed;
                option.textContent = allowed ? option.dataset.baseLabel : `${option.dataset.baseLabel} (female/wrapper)`;
                if (option.selected && !allowed) bottomSelect.value = 'auto';
            });
            skirtLikeSelected = femaleOnlyBottoms.has(bottomSelect.value)
                || (bottomSelect.value === 'auto' && /dress|skirt|wrapper|iro-buba|george/.test(document.getElementById('svg-african-outfit')?.value || ''));
        }
        if (skirtLengthRow) skirtLengthRow.classList.toggle('hidden', !skirtLikeSelected);
        this._syncSvgAfricanTieControlCompatibility();
    }

    _getSvgAfricanTieVisibility(rawConfig = null, resolvedConfig = null) {
        const catalog = window.SvgAfricanCharacterCatalog;
        const raw = rawConfig || this._getSvgAfricanCharacterFormConfig();
        const resolved = resolvedConfig || catalog?.normalizeConfig?.(raw) || raw || {};
        const styling = resolved.styling || {};
        const rawStyling = raw?.styling || {};
        const read = (...values) => {
            const found = values.find(value => value != null && String(value).trim() !== '');
            return String(found == null ? '' : found).trim().toLowerCase();
        };
        const tieType = read(resolved.neckTieType, styling.neckTieType, rawStyling.neckTieType, 'auto');
        const topClothing = read(resolved.topClothing, styling.topClothing, rawStyling.topClothing);
        const outfit = read(resolved.outfit, styling.outfit, rawStyling.outfit);
        const profession = read(resolved.profession, styling.profession, rawStyling.profession);
        const culturalStyle = read(resolved.culturalStyle, styling.culturalStyle, rawStyling.culturalStyle);
        const presentation = read(resolved.presentation, resolved.identity?.presentation, raw?.identity?.presentation);
        const assetId = read(resolved.assetCharacterId, resolved.assetId, raw?.assetCharacterId, raw?.preset);
        const styleText = `${assetId} ${topClothing} ${outfit} ${profession} ${culturalStyle} ${presentation}`;
        const hasTieSurface = topClothing === 'plain-business-suit'
            || outfit === 'plain-business-suit'
            || topClothing === 'formal-shirt-tie'
            || topClothing === 'corporate-vest'
            || /suit|banker|lawyer|executive|media/.test(styleText)
            || (/doctor|health|clinical|lab-coat|laboratory|scientist/.test(styleText) && assetId === 'male-doctor-front');
        return {
            visible: tieType !== 'none' && hasTieSurface,
            hasTieSurface,
            tieType,
            topClothing,
            outfit,
            profession
        };
    }

    _syncSvgAfricanTieControlCompatibility(rawConfig = null, resolvedConfig = null) {
        const typeSelect = document.getElementById('svg-african-neck-tie-type');
        const designSelect = document.getElementById('svg-african-neck-tie-design');
        if (!typeSelect && !designSelect) return null;
        const tieState = this._getSvgAfricanTieVisibility(rawConfig, resolvedConfig);
        const typeRow = typeSelect?.closest?.('label');
        const designRow = designSelect?.closest?.('label');
        const inactiveType = !tieState.visible && tieState.tieType !== 'none';
        if (typeRow) {
            typeRow.classList.toggle('is-inactive-choice', inactiveType);
            typeRow.title = inactiveType ? 'This outfit does not currently show a tie.' : '';
        }
        if (designSelect) {
            const designDisabled = !tieState.visible;
            designSelect.disabled = designDisabled;
            designSelect.setAttribute('aria-disabled', designDisabled ? 'true' : 'false');
            if (designRow) {
                designRow.classList.toggle('is-inactive-choice', designDisabled);
                designRow.title = designDisabled ? 'Tie design is used only when the current outfit renders a visible tie.' : '';
            }
        }
        return tieState;
    }

    _setSvgAfricanSelectIfAvailable(id, next) {
        const select = document.getElementById(id);
        if (!select || !next) return false;
        const option = [...select.options].find(item => item.value === next && !item.disabled);
        if (!option) return false;
        select.value = next;
        return true;
    }

    _syncSvgAfricanAdjustmentOutput(input) {
        if (!input?.id) return;
        const output = document.getElementById(`${input.id}-val`);
        if (output) output.textContent = `${Math.round((Number(input.value) || 0) * 100)}%`;
    }

    _resetSvgAfricanBuilderAdjustments(adjustments = {}) {
        const adjustmentCatalog = window.SvgAfricanPremiumAssets?.adjustProperties || {};
        document.querySelectorAll('[data-svg-african-adjust]').forEach(input => {
            const prop = input.dataset.svgAfricanAdjust;
            const spec = adjustmentCatalog[prop] || {};
            const fallback = Number.isFinite(Number(spec.defaultValue)) ? Number(spec.defaultValue) : 0;
            const next = Number.isFinite(Number(adjustments[prop])) ? Number(adjustments[prop]) : fallback;
            input.value = String(next);
            this._syncSvgAfricanAdjustmentOutput(input);
        });
    }

    resetSvgAfricanCharacterBuilder() {
        const catalog = window.SvgAfricanCharacterCatalog;
        if (!catalog?.normalizeConfig) {
            Utils.showToast('SVG African character builder is not available', 'warning');
            return;
        }
        this._svgAfricanBuilderPreserveBasicSvg = false;
        const integrityToggle = document.getElementById('svg-african-premium-integrity');
        if (integrityToggle) integrityToggle.checked = true;
        this._svgAfricanBuilderPremiumIntegrityEnabled = true;
        const currentPreset = document.getElementById('svg-african-preset')?.value || 'ada-lecturer-premium';
        const config = catalog.normalizeConfig({ preset: currentPreset }) || catalog.normalizeConfig({ preset: 'ada-lecturer-premium' }) || {};
        const identity = config.identity || {};
        const styling = config.styling || {};

        this._setSvgAfricanSelectIfAvailable('svg-african-preset', config.preset || currentPreset || 'ada-lecturer-premium');
        this._setSvgAfricanSelectIfAvailable('svg-african-presentation', identity.presentation || config.presentation || 'female');
        this._setSvgAfricanSelectIfAvailable('svg-african-age', identity.ageGroup || config.ageGroup || 'adult');
        this._setSvgAfricanSelectIfAvailable('svg-african-skin', identity.skinTone || config.skinTone || 'umber');
        this._setSvgAfricanSelectIfAvailable('svg-african-head-type', identity.headType || config.headType || 'balanced');
        this._setSvgAfricanSelectIfAvailable('svg-african-face', identity.face || config.face || 'oval');
        this._setSvgAfricanSelectIfAvailable('svg-african-eyes', identity.eyes || config.eyes || 'almond');
        this._setSvgAfricanSelectIfAvailable('svg-african-nose', identity.nose || config.nose || 'soft');
        this._setSvgAfricanSelectIfAvailable('svg-african-lips', identity.lips || config.lips || 'natural');
        this._setSvgAfricanSelectIfAvailable('svg-african-hair', identity.hair || config.hair || 'braids');
        this._setSvgAfricanSelectIfAvailable('svg-african-hair-color', identity.hairColor || config.hairColor || 'natural-black');
        this._setSvgAfricanSelectIfAvailable('svg-african-facial-hair', identity.facialHair || config.facialHair || 'none');
        this._setSvgAfricanSelectIfAvailable('svg-african-body', identity.body || config.body || 'average');
        this._setSvgAfricanSelectIfAvailable('svg-african-height', identity.height || config.height || 'average');
        this._setSvgAfricanSelectIfAvailable('svg-african-profession', styling.profession || config.profession || 'none');
        this._setSvgAfricanSelectIfAvailable('svg-african-outfit', styling.outfit || config.outfit || 'lecturer');
        this._setSvgAfricanSelectIfAvailable('svg-african-top-clothing', 'auto');
        this._setSvgAfricanSelectIfAvailable('svg-african-sleeve-length', 'auto');
        this._setSvgAfricanSelectIfAvailable('svg-african-bottom-clothing', 'auto');
        this._setSvgAfricanSelectIfAvailable('svg-african-skirt-length', styling.skirtLength || config.skirtLength || 'at-knee');
        this._setSvgAfricanSelectIfAvailable('svg-african-clothing-palette', 'auto');
        this._setSvgAfricanSelectIfAvailable('svg-african-fabric-design', 'auto');
        this._setSvgAfricanSelectIfAvailable('svg-african-neck-tie-type', styling.neckTieType || config.neckTieType || 'auto');
        this._setSvgAfricanSelectIfAvailable('svg-african-neck-tie-design', styling.neckTieDesign || config.neckTieDesign || 'auto');
        this._setSvgAfricanSelectIfAvailable('svg-african-headwear', styling.headwear || config.headwear || 'none');
        this._setSvgAfricanSelectIfAvailable('svg-african-footwear', styling.footwear || config.footwear || 'formal');
        this._setSvgAfricanSelectIfAvailable('svg-african-cultural-style', styling.culturalStyle || config.culturalStyle || 'contemporary');
        this._setSvgAfricanSelectIfAvailable('svg-african-view', styling.view || config.view || 'front');
        this._setSvgAfricanSelectIfAvailable('svg-african-head-artwork', styling.headArtwork || 'original');
        this._setSvgAfricanSelectIfAvailable('svg-african-rear-talking-profile', styling.rearTalkingProfile || config.rearTalkingProfile || 'hidden');
        this._setSvgAfricanSelectIfAvailable(
            'svg-african-three-quarter-artwork',
            styling.threeQuarterArtwork || config.threeQuarterArtwork || 'projected'
        );
        this._setSvgAfricanSelectIfAvailable('svg-african-face-preset', '');
        this._syncSvgAfricanThreeQuarterArtworkControl();

        const customToggle = document.getElementById('svg-african-custom-pieces');
        if (customToggle) customToggle.checked = false;
        const colorToggle = document.getElementById('svg-african-color-enable');
        if (colorToggle) colorToggle.checked = false;
        const colorFallbacks = this._getSvgAfricanWearColorFallbacks();
        document.querySelectorAll('[data-svg-african-color]').forEach(input => {
            const prop = input.dataset.svgAfricanColor;
            input.value = colorFallbacks[prop] || '#000000';
        });

        this._resetSvgAfricanBuilderAdjustments(config.premiumAdjustments || config._svgAfricanAdjustments || {});
        this._setSvgAfricanAccessories(styling.accessories || config.accessories || []);
        this._setSvgAfricanJewelry(styling.jewelry || config.jewelry);
        this._syncSvgAfricanClothingOverrideMode({ resetAuto: true, schedulePreview: false });
        this._syncSvgAfricanOutfitCompatibility();
        this._syncSvgAfricanClothingCompatibility();
        this._syncSvgAfricanResolvedOutfitSummary();

        this._svgAfricanBuilderPreviewZoom = 1;
        const zoomReset = document.getElementById('svg-african-preview-zoom-reset');
        if (zoomReset) zoomReset.textContent = '100%';
        this._resetSvgAfricanBuilderPreviewViewport();
        this._scheduleSvgAfricanBuilderPreview();
        Utils.showToast('SVG African builder reset.', 'info');
    }

    _getSvgAfricanPresentationPreset(presentationValue = '') {
        const presentation = ['male', 'female', 'nonbinary'].includes(presentationValue) ? presentationValue : 'female';
        const profession = document.getElementById('svg-african-profession')?.value || 'none';
        const outfit = document.getElementById('svg-african-outfit')?.value || '';
        const culturalStyle = document.getElementById('svg-african-cultural-style')?.value || '';
        if (presentation === 'male') {
            if (outfit === 'academic-robe') return 'male-academic-gown-premium';
            if (profession === 'doctor' || outfit === 'doctor') return 'male-doctor-premium';
            if (profession === 'student' || outfit === 'student-casual') return 'male-student-premium';
            if (outfit === 'agbada') return 'agbada-formal-premium';
            if (outfit === 'senator-wear' || ['igbo', 'yoruba', 'hausa-fulani', 'niger-delta'].includes(culturalStyle)) return 'senator-wear-premium';
            return 'male-lecturer-premium';
        }
        if (presentation === 'nonbinary') return 'neutral-presenter-premium';
        if (outfit === 'academic-robe') return 'female-academic-gown-premium';
        if (profession === 'doctor' || profession === 'nurse' || outfit === 'doctor' || outfit === 'nurse') return 'female-doctor-premium';
        if (profession === 'student' || outfit === 'student-casual') return 'female-student-premium';
        if (outfit === 'iro-buba') return 'iro-buba-premium';
        if (outfit === 'george-wrapper') return 'george-wrapper-premium';
        if (outfit === 'ankara-peplum' || culturalStyle === 'ankara') return 'ankara-creative-premium';
        return 'ada-lecturer-premium';
    }

    _resetSvgAfricanOutfitDrivenControls() {
        [
            'svg-african-top-clothing',
            'svg-african-sleeve-length',
            'svg-african-bottom-clothing',
            'svg-african-clothing-palette',
            'svg-african-fabric-design'
        ].forEach(id => this._setSvgAfricanSelectIfAvailable(id, 'auto'));
    }

    _isSvgAfricanCustomPiecesEnabled() {
        return document.getElementById('svg-african-custom-pieces')?.checked === true;
    }

    _getSvgAfricanSelectLabel(id, value = null) {
        const select = document.getElementById(id);
        const selectedValue = value == null ? select?.value : value;
        const option = select && [...select.options].find(item => item.value === selectedValue);
        if (option) return option.dataset.baseLabel || option.textContent || selectedValue;
        return String(selectedValue || '')
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, ch => ch.toUpperCase());
    }

    _syncSvgAfricanResolvedOutfitSummary() {
        const summary = document.getElementById('svg-african-resolved-outfit-summary');
        const catalog = window.SvgAfricanCharacterCatalog;
        if (!summary || !catalog?.normalizeConfig) return;
        const rawConfig = this._getSvgAfricanCharacterFormConfig();
        const resolved = catalog.normalizeConfig(rawConfig) || rawConfig;
        const mode = this._isSvgAfricanCustomPiecesEnabled() ? 'Custom pieces' : 'Auto pieces';
        const outfit = this._getSvgAfricanSelectLabel('svg-african-outfit', resolved.outfit || rawConfig.styling?.outfit);
        const top = this._getSvgAfricanSelectLabel('svg-african-top-clothing', resolved.topClothing || resolved.styling?.topClothing);
        const bottom = this._getSvgAfricanSelectLabel('svg-african-bottom-clothing', resolved.bottomClothing || resolved.styling?.bottomClothing);
        const sleeve = this._getSvgAfricanSelectLabel('svg-african-sleeve-length', resolved.sleeveLength || resolved.styling?.sleeveLength);
        const palette = this._getSvgAfricanSelectLabel('svg-african-clothing-palette', resolved.clothingPalette || resolved.styling?.clothingPalette);
        const fabric = this._getSvgAfricanSelectLabel('svg-african-fabric-design', resolved.fabricDesign || resolved.styling?.fabricDesign);
        const tie = this._getSvgAfricanSelectLabel('svg-african-neck-tie-type', resolved.neckTieType || resolved.styling?.neckTieType || 'auto');
        const tieDesign = this._getSvgAfricanSelectLabel('svg-african-neck-tie-design', resolved.neckTieDesign || resolved.styling?.neckTieDesign || 'auto');
        const tieState = this._syncSvgAfricanTieControlCompatibility(rawConfig, resolved);
        const lengthValue = resolved.skirtLength || resolved.styling?.skirtLength;
        const showLength = /skirt|wrapper|iro|george/.test(String(resolved.bottomClothing || resolved.outfit || ''));
        const length = showLength ? `, ${this._getSvgAfricanSelectLabel('svg-african-skirt-length', lengthValue)}` : '';
        const tieSummary = tieState?.visible ? `tie ${tie}; tie design ${tieDesign}` : `tie ${tieState?.tieType === 'none' ? tie : 'not visible for this outfit'}`;
        summary.textContent = `${mode}: ${outfit} -> ${top} + ${bottom}${length}; sleeves ${sleeve}; palette ${palette}; fabric ${fabric}; ${tieSummary}.`;
    }

    _syncSvgAfricanClothingOverrideMode(options = {}) {
        const customPieces = this._isSvgAfricanCustomPiecesEnabled();
        if (!customPieces && options.resetAuto !== false) {
            this._resetSvgAfricanOutfitDrivenControls();
        }
        [
            'svg-african-top-clothing',
            'svg-african-sleeve-length',
            'svg-african-bottom-clothing',
            'svg-african-skirt-length',
            'svg-african-clothing-palette',
            'svg-african-fabric-design'
        ].forEach(id => {
            const select = document.getElementById(id);
            if (!select) return;
            select.disabled = !customPieces;
            const row = select.closest?.('label');
            if (row) {
                row.classList.toggle('is-auto-driven', !customPieces);
                row.classList.toggle('is-builder-option-collapsed', !customPieces);
                row.title = customPieces
                    ? ''
                    : 'Controlled by the selected profession/outfit. Enable Customize individual clothing pieces to edit.';
            }
        });
        this._syncSvgAfricanOutfitCompatibility();
        this._syncSvgAfricanClothingCompatibility();
        this._syncSvgAfricanColorOverrideMode();
        this._syncSvgAfricanResolvedOutfitSummary();
        if (options.schedulePreview !== false) this._scheduleSvgAfricanBuilderPreview();
    }

    _syncSvgAfricanColorOverrideMode() {
        const toggle = document.getElementById('svg-african-color-enable');
        const grid = document.getElementById('svg-african-color-grid');
        if (!grid) return false;
        const enabled = toggle?.checked === true;
        grid.classList.toggle('is-builder-option-collapsed', !enabled);
        grid.setAttribute('aria-hidden', enabled ? 'false' : 'true');
        return enabled;
    }

    _setSvgAfricanAccessories(nextList = []) {
        const values = new Set(Array.isArray(nextList) ? nextList : []);
        document.querySelectorAll('#svg-african-accessories input').forEach(input => {
            input.checked = values.has(input.value);
        });
    }

    _applySvgAfricanPresentationDefaults(presentationValue = '') {
        const presentation = ['male', 'female', 'nonbinary'].includes(presentationValue) ? presentationValue : 'female';
        const catalog = window.SvgAfricanCharacterCatalog;
        const current = this._getSvgAfricanCharacterFormConfig();
        if (catalog?.getPreset(current.preset)?.category) {
            const variant = catalog.getPreset(current.preset.replace(/-(male|female)-premium$/, `-${presentation}-premium`));
            const next = { ...current, identity: { ...current.identity, presentation } };
            if (variant) {
                next.preset = variant.id;
                next.name = variant.name;
                next.assetCharacterId = variant.assetCharacterId;
                delete next.assetId;
            }
            // Keep occupation, chosen clothing, proportions and colors while changing presentation.
            delete next.presentation;
            this._applySvgAfricanBuilderConfigToForm(catalog.normalizeConfig(next), { preservePieceOverrides: false });
            this._svgAfricanLastPresentation = presentation;
            return;
        }
        const presentationPreset = this._getSvgAfricanPresentationPreset(presentation);
        if (
            this._isSvgAfricanPremiumIntegrityEnabled()
            && this._svgAfricanBuilderPreserveBasicSvg !== true
            && typeof this._applySvgAfricanBuilderConfigToForm === 'function'
        ) {
            const catalog = window.SvgAfricanCharacterCatalog;
            const premiumAssets = window.SvgAfricanPremiumAssets;
            const currentView = document.getElementById('svg-african-view')?.value || 'front';
            const currentThreeQuarterArtwork = document.getElementById('svg-african-three-quarter-artwork')?.value || 'projected';
            const base = catalog?.normalizeConfig?.({ preset: presentationPreset }) || null;
            if (base) {
                base.view = currentView;
                base.sideFacing = currentView.endsWith('left') ? 'left' : 'right';
                base.threeQuarterArtwork = currentThreeQuarterArtwork;
                base.styling = {
                    ...(base.styling || {}),
                    view: currentView,
                    sideFacing: base.sideFacing,
                    threeQuarterArtwork: currentThreeQuarterArtwork
                };
                const asset = premiumAssets?.resolveAssetForConfig?.(base);
                const premiumConfig = asset && premiumAssets?.normalizePremiumConfig
                    ? premiumAssets.normalizePremiumConfig(asset, base)
                    : base;
                this._applySvgAfricanBuilderConfigToForm(premiumConfig, { preservePieceOverrides: false });
                this._svgAfricanLastPresentation = presentation;
                return;
            }
        }
        this._setSvgAfricanSelectIfAvailable('svg-african-preset', presentationPreset);
        const defaults = {
            female: {
                headType: 'balanced',
                face: 'oval',
                eyes: 'almond',
                nose: 'soft',
                lips: 'defined',
                hair: 'braids',
                facialHair: 'none',
                body: 'average',
                height: 'average',
                outfit: 'lecturer',
                footwear: 'formal',
                accessories: ['glasses', 'notebook', 'earrings']
            },
            male: {
                headType: 'broad-short',
                face: 'oval',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'natural',
                hair: 'low-cut',
                facialHair: 'short-beard',
                body: 'athletic',
                height: 'average',
                outfit: 'business-suit',
                footwear: 'formal',
                accessories: ['glasses', 'notebook']
            },
            nonbinary: {
                headType: 'balanced',
                face: 'soft-diamond',
                eyes: 'almond',
                nose: 'rounded',
                lips: 'natural',
                hair: 'twists',
                facialHair: 'none',
                body: 'average',
                height: 'average',
                outfit: 'smart-casual',
                footwear: 'loafers',
                accessories: ['watch']
            }
        }[presentation];
        if (!defaults) return;

        [
            ['svg-african-head-type', defaults.headType],
            ['svg-african-face', defaults.face],
            ['svg-african-eyes', defaults.eyes],
            ['svg-african-nose', defaults.nose],
            ['svg-african-lips', defaults.lips],
            ['svg-african-hair', defaults.hair],
            ['svg-african-facial-hair', defaults.facialHair],
            ['svg-african-body', defaults.body],
            ['svg-african-height', defaults.height]
        ].forEach(([id, value]) => this._setSvgAfricanSelectIfAvailable(id, value));

        const profession = document.getElementById('svg-african-profession')?.value || '';
        if (profession && profession !== 'none') {
            this._applySvgAfricanProfessionDefaults(profession);
        } else {
            this._setSvgAfricanSelectIfAvailable('svg-african-outfit', defaults.outfit);
            this._setSvgAfricanSelectIfAvailable('svg-african-footwear', defaults.footwear);
            this._setSvgAfricanAccessories(defaults.accessories);
        }
        if (!this._isSvgAfricanCustomPiecesEnabled()) this._resetSvgAfricanOutfitDrivenControls();
        this._syncSvgAfricanOutfitCompatibility();
        this._syncSvgAfricanClothingCompatibility();
        this._syncSvgAfricanResolvedOutfitSummary();
        this._svgAfricanLastPresentation = presentation;
    }

    _bindSvgAfricanBuilderPreviewEvents() {
        const modal = document.getElementById('svg-african-character-modal');
        if (!modal || modal.dataset.svgAfricanBuilderPreviewBound === '1') return;
        modal.dataset.svgAfricanBuilderPreviewBound = '1';
        const refresh = (event) => {
            const target = event.target;
            if (!target?.matches?.('select,input')) return;
            if (target.closest('#svg-african-builder-multiview, #svg-african-comparison-controls')) return;
            this._setSvgAfricanBuilderCloseGuard(false, { focus: false });
            if (target.matches('#svg-african-custom-pieces')) {
                this._syncSvgAfricanClothingOverrideMode({ resetAuto: !target.checked });
                return;
            }
            if (target.matches('#svg-african-presentation')) {
                this._applySvgAfricanPresentationDefaults(target.value);
            }
            if (target.matches('#svg-african-profession')) {
                this._applySvgAfricanProfessionDefaults(target.value);
            }
            if (target.matches('#svg-african-view,#svg-african-three-quarter-artwork')) {
                this._syncSvgAfricanThreeQuarterArtworkControl();
            }
            const customPieces = this._isSvgAfricanCustomPiecesEnabled();
            if (!customPieces && target.matches('#svg-african-presentation,#svg-african-cultural-style,#svg-african-outfit')) {
                this._resetSvgAfricanOutfitDrivenControls();
            }
            if (target.matches('#svg-african-presentation,#svg-african-cultural-style,#svg-african-outfit,#svg-african-top-clothing,#svg-african-sleeve-length,#svg-african-bottom-clothing,#svg-african-clothing-palette,#svg-african-fabric-design,#svg-african-neck-tie-type,#svg-african-neck-tie-design')) {
                this._syncSvgAfricanOutfitCompatibility();
                this._syncSvgAfricanClothingCompatibility();
                this._syncSvgAfricanResolvedOutfitSummary();
            }
            if (target.matches('[data-svg-african-color]')) {
                const colorToggle = document.getElementById('svg-african-color-enable');
                if (colorToggle) colorToggle.checked = true;
            }
            if (target.matches('#svg-african-color-enable,[data-svg-african-color]')) {
                this._syncSvgAfricanColorOverrideMode();
            }
            const focusRequest = this._getSvgAfricanBuilderFocusRequestForControl(target);
            if (focusRequest) this._svgAfricanBuilderFocusRequest = focusRequest;
            this._scheduleSvgAfricanBuilderPreview({
                historyInteraction: {
                    controlId: target.id || target.dataset?.svgAfricanAdjust || target.dataset?.svgAfricanColor || '',
                    label: this._getSvgAfricanBuilderHistoryLabel(target),
                    coalesce: event.type === 'input'
                }
            });
        };
        modal.addEventListener('input', refresh);
        modal.addEventListener('change', refresh);
    }

    _applySvgAfricanProfessionDefaults(professionId = '') {
        const value = id => document.getElementById(id)?.value || '';
        const presentation = value('svg-african-presentation') || 'female';
        const isMale = presentation === 'male';
        const isFemale = presentation === 'female';
        const withGenderAccessory = (base = []) => isFemale ? [...base, 'earrings'] : base;
        const defaults = {
            doctor: { outfit: 'doctor', footwear: 'clinical', accessories: withGenderAccessory(['id-badge', 'stethoscope']) },
            nurse: { outfit: 'nurse', footwear: 'clinical', accessories: withGenderAccessory(['id-badge']) },
            'laboratory-scientist': { outfit: 'lab-coat', footwear: 'clinical', accessories: ['id-badge', 'glasses'] },
            pharmacist: { outfit: 'lab-coat', footwear: 'clinical', accessories: ['id-badge'] },
            'community-health': { outfit: 'scrubs', footwear: 'clinical', accessories: ['id-badge'] },
            lecturer: { outfit: isMale ? 'business-suit' : (isFemale ? 'lecturer' : 'smart-casual'), footwear: 'formal', accessories: withGenderAccessory(['glasses', 'notebook']) },
            student: { outfit: 'student-casual', footwear: 'sneakers', accessories: withGenderAccessory(['notebook', 'backpack']) },
            administrator: { outfit: isMale ? 'business-suit' : (isFemale ? 'corporate-dress' : 'pant-suit'), footwear: 'formal', accessories: withGenderAccessory(['id-badge']) },
            entrepreneur: { outfit: 'smart-casual', footwear: 'loafers', accessories: withGenderAccessory(['watch']) },
            technology: { outfit: 'office-casual', footwear: 'sneakers', accessories: ['id-badge'] },
            'business-executive': { outfit: isMale ? 'executive-suit' : 'pant-suit', footwear: 'formal', accessories: withGenderAccessory(['watch']) },
            lawyer: { outfit: 'lawyer-black-suit', footwear: 'formal', accessories: ['glasses'] },
            banker: { outfit: 'banker-suit', footwear: 'formal', accessories: ['id-badge', 'watch'] },
            teacher: { outfit: 'teacher-cardigan', footwear: 'formal', accessories: withGenderAccessory(['notebook']) },
            engineer: { outfit: 'engineer-field', footwear: 'casual', accessories: ['id-badge'] },
            scientist: { outfit: 'scientist-coat', footwear: 'clinical', accessories: ['id-badge', 'glasses'] },
            'media-presenter': { outfit: 'media-presenter', footwear: 'formal', accessories: withGenderAccessory(['glasses']) },
            chef: { outfit: 'chef-uniform', footwear: 'clinical', accessories: ['id-badge'] },
            pilot: { outfit: 'pilot-uniform', footwear: 'formal', accessories: ['id-badge'] },
            'police-officer': { outfit: 'security-uniform', footwear: 'formal', accessories: ['id-badge'] },
            'security-officer': { outfit: 'security-uniform', footwear: 'formal', accessories: ['id-badge'] },
            soldier: { outfit: 'military-fatigues', footwear: 'casual', accessories: [] },
            artisan: { outfit: 'artisan-workwear', footwear: 'casual', accessories: ['watch'] },
            farmer: { outfit: 'farmer-workwear', footwear: 'casual', accessories: [] },
            athlete: { outfit: 'tracksuit', footwear: 'sneakers', accessories: [] },
            'religious-leader': { outfit: 'religious-formal', footwear: 'formal', accessories: withGenderAccessory([]) },
            'event-host': { outfit: 'event-formal', footwear: 'formal', accessories: withGenderAccessory(['watch']) }
        }[professionId];
        if (!defaults) return;
        const customPieces = this._isSvgAfricanCustomPiecesEnabled();
        this._setSvgAfricanSelectIfAvailable('svg-african-outfit', defaults.outfit);
        if (!customPieces) this._resetSvgAfricanOutfitDrivenControls();
        this._setSvgAfricanSelectIfAvailable('svg-african-footwear', defaults.footwear);
        this._setSvgAfricanAccessories(defaults.accessories);
        this._syncSvgAfricanOutfitCompatibility();
        this._syncSvgAfricanClothingCompatibility();
        this._syncSvgAfricanResolvedOutfitSummary();
    }

    _getSvgAfricanBuilderMotionCatalog(view = 'front') {
        const JointCtor = this.jointSystem?.constructor || globalThis.JointSystem;
        const normalizedView = String(view || 'front').toLowerCase();
        let poseCatalog = {};
        let movementCatalog = {};
        if (normalizedView === 'side-right') {
            poseCatalog = JointCtor?._buildHumanSideDualArmaturePoseCatalogRight?.() || {};
            movementCatalog = JointCtor?._buildHumanSideDualArmatureMovementCatalogRight?.() || {};
        } else if (normalizedView === 'side-left' || normalizedView === 'side') {
            poseCatalog = JointCtor?._buildHumanSideDualArmaturePoseCatalog?.() || {};
            movementCatalog = JointCtor?._buildHumanSideDualArmatureMovementCatalog?.() || {};
        } else if (normalizedView === 'back' || normalizedView.startsWith('back-3q-')) {
            poseCatalog = JointCtor?._buildHumanBackArmaturePoseCatalog?.() || {};
            movementCatalog = JointCtor?._buildHumanBackArmatureMovementCatalog?.() || {};
        } else {
            poseCatalog = JointCtor?._buildHumanFrontArmaturePoseCatalog?.() || {};
            movementCatalog = JointCtor?._buildHumanFrontArmatureMovementCatalog?.() || {};
        }
        const compatibilityKeys = new Set(['generic', normalizedView]);
        if (normalizedView.startsWith('side')) compatibilityKeys.add('side');
        else {
            compatibilityKeys.add(normalizedView.startsWith('back') ? 'back' : 'front');
            if (normalizedView.includes('-3q-')) compatibilityKeys.add(normalizedView.replace(/-(left|right)$/, ''));
        }
        const matchesView = this.jointSystem?._armatureMovementMatchesCurrentView;
        if (matchesView) {
            const filter = catalog => Object.fromEntries(Object.entries(catalog).filter(([key, entry]) => (
                matchesView.call(this.jointSystem, null, { ...entry, key }, compatibilityKeys)
            )));
            poseCatalog = filter(poseCatalog);
            movementCatalog = filter(movementCatalog);
        }
        return { poseCatalog, movementCatalog, view: normalizedView };
    }

    _resolveSvgAfricanBuilderMotionDefinition(actionKey = 'idle', view = 'front') {
        const action = String(actionKey || 'idle').toLowerCase();
        const catalogs = this._getSvgAfricanBuilderMotionCatalog(view);
        const scoreEntry = (key, entry, kind) => {
            const text = `${key} ${entry?.name || ''} ${entry?.semanticAction || ''}`.toLowerCase();
            let score = -1000;
            if (action === 'idle') {
                if (/idle[- ]?breathe/.test(text)) score = 160;
                else if (/\bidle\b/.test(text)) score = kind === 'movement' ? 120 : 80;
            } else if (action === 'walk') {
                if (entry?.semanticAction === 'locomotion.walk') score = 130;
                else if (/\bwalk\b/.test(text)) score = 90;
                if (/walk[- ]?cycle|walk[- ]?in[- ]?place/.test(text)) score += 45;
                if (/to[- ]?point|and[- ]?back|return|flip/.test(text)) score -= 80;
                if (/forward|travel/.test(text)) score -= 18;
            } else if (['stroll', 'strut', 'run'].includes(action)) {
                if (entry?.semanticAction === `locomotion.${action}`) score = 140;
                else if (new RegExp(`\\b${action}\\b`).test(text)) score = 110;
                if (new RegExp(`${action}[- ]?cycle|${action}[- ]?in[- ]?place`).test(text)) score += 35;
                if (/to[- ]?point|and[- ]?back|return|flip/.test(text)) score -= 90;
                if (/forward|travel/.test(text)) score -= 22;
            } else if (action === 'point') {
                if (/point(?:ing)?[- ]?(?:left|right|up|forward)?/.test(text)) score = kind === 'pose' ? 150 : 115;
                if (/to[- ]?point|walk/.test(text)) score -= 90;
            } else if (action === 'wave') {
                if (/\b(wave|waving|greet)(?:[- ]?cycle)?\b/.test(text)) score = kind === 'movement' ? 150 : 110;
            } else if (action === 'present') {
                if (entry?.semanticAction === 'communication.present-explain') score = 150;
                else if (/present[- ]?explain|\bexplain\b|\bpresent\b/.test(text)) score = 115;
            } else if (action === 'read') {
                if (/\b(read|reading)(?:[- ]?book)?\b/.test(text)) score = kind === 'movement' ? 150 : 110;
                if (/write|typing|phone/.test(text)) score -= 100;
            } else if (action === 'write') {
                if (/\b(write|writing)(?:[- ]?seated|[- ]?board)?\b/.test(text)) score = kind === 'movement' ? 150 : 110;
                if (/typing|read/.test(text)) score -= 100;
            } else if (action === 'type') {
                if (/\b(type|typing)(?:[- ]?seated)?\b/.test(text)) score = kind === 'movement' ? 150 : 110;
                if (/writing|read/.test(text)) score -= 100;
            } else if (action === 'pick-up') {
                if (entry?.semanticAction === 'object.pick-up-drop') score = 155;
                else if (/pick[- ]?up|pickup/.test(text)) score = kind === 'movement' ? 140 : 95;
                if (/\bcenter\b/.test(text) || key === 'pick-up-drop' || key === 'pick-up-drop-side') score += 18;
                if (/\bleft\b|\bright\b/.test(text)) score -= 8;
            } else if (action === 'squat') {
                if (/\bsquat(?:ting)?\b/.test(text)) score = kind === 'movement' ? 145 : 115;
                if (/pick[- ]?up|pickup/.test(text)) score -= 90;
            } else if (action === 'sit') {
                if (/\b(sit|sitting|sit[- ]?to[- ]?stand|sit[- ]?down)\b/.test(text)) score = kind === 'movement' ? 145 : 110;
                if (/read|write|typing/.test(text)) score -= 100;
            } else if (action === 'pray') {
                if (entry?.semanticAction === 'communication.prayer') score = 150;
                else if (/\b(pray|prayer|praying)\b/.test(text)) score = kind === 'movement' ? 140 : 110;
            }
            if (kind === 'movement' && Array.isArray(entry?.keyframes) && entry.keyframes.length > 1) score += 12;
            return score;
        };

        const candidates = [];
        Object.entries(catalogs.movementCatalog).forEach(([key, entry]) => {
            candidates.push({ key, entry, kind: 'movement', score: scoreEntry(key, entry, 'movement') });
        });
        Object.entries(catalogs.poseCatalog).forEach(([key, entry]) => {
            candidates.push({ key, entry, kind: 'pose', score: scoreEntry(key, entry, 'pose') });
        });
        candidates.sort((a, b) => b.score - a.score || a.key.localeCompare(b.key));
        const selected = candidates[0];
        if (!selected || selected.score < 0) return null;

        let keyframes = Array.isArray(selected.entry?.keyframes)
            ? selected.entry.keyframes.map(frame => ({ ...frame }))
            : [];
        let duration = Math.max(600, Number(selected.entry?.duration) || 1800);
        if (selected.kind === 'pose') {
            keyframes = action === 'idle'
                ? [{ t: 0, pose: selected.key }, { t: 1, pose: selected.key }]
                : [
                    { t: 0, pose: 'idle' },
                    { t: 0.22, pose: selected.key },
                    { t: 0.78, pose: selected.key },
                    { t: 1, pose: 'idle' }
                ];
            duration = action === 'idle' ? 2200 : 2400;
        }
        const virtualArmature = {
            root: { _svgCharacterConfig: { view: catalogs.view, styling: { view: catalogs.view } } },
            parts: {}
        };
        const attentionTrack = this.jointSystem?._getArmatureMovementAttentionTrack?.(
            selected.key,
            selected.entry,
            virtualArmature
        ) || [];
        return {
            ...selected,
            ...catalogs,
            action,
            name: selected.entry?.name || action,
            duration,
            keyframes: keyframes
                .map(frame => ({ ...frame, t: Math.max(0, Math.min(1, Number(frame.t) || 0)) }))
                .sort((a, b) => a.t - b.t),
            attentionTrack
        };
    }

    _resolveSvgAfricanBuilderMotionFrame(frame = {}, poseCatalog = {}) {
        const idle = poseCatalog?.idle || {};
        const pose = frame?.pose ? poseCatalog?.[frame.pose] : null;
        const source = pose || {};
        const merge = (idleMap, sourceMap, frameMap) => ({
            ...(idleMap || {}),
            ...(sourceMap || {}),
            ...(frameMap || {})
        });
        const legacyOffsetX = frame?.offsets?.torso?.x;
        const legacyOffsetY = frame?.offsets?.torso?.y;
        return {
            angles: merge(idle.jointAngles, source.jointAngles, frame.jointAngles),
            partAngles: merge(idle.partAngles, source.partAngles, frame.partAngles),
            jointTilts: merge(idle.jointTilts, source.jointTilts, frame.jointTilts),
            partTilts: merge(idle.partTilts, source.partTilts, frame.partTilts),
            dx: Number.isFinite(frame.dx) ? frame.dx : (Number.isFinite(legacyOffsetX) ? legacyOffsetX : (Number(source.dx) || 0)),
            dy: Number.isFinite(frame.dy) ? frame.dy : (Number.isFinite(legacyOffsetY) ? legacyOffsetY : (Number(source.dy) || 0)),
            layerOrderOverride: frame.layerOrderOverride || source.layerOrderOverride || null
        };
    }

    _sampleSvgAfricanBuilderMotionDefinition(definition, progress = 0) {
        const frames = Array.isArray(definition?.keyframes) ? definition.keyframes : [];
        if (!frames.length) return null;
        const t = Math.max(0, Math.min(1, Number(progress) || 0));
        let before = frames[0];
        let after = frames[frames.length - 1];
        for (let index = 0; index < frames.length - 1; index++) {
            if (t >= frames[index].t && t <= frames[index + 1].t) {
                before = frames[index];
                after = frames[index + 1];
                break;
            }
        }
        const a = this._resolveSvgAfricanBuilderMotionFrame(before, definition.poseCatalog);
        const b = this._resolveSvgAfricanBuilderMotionFrame(after, definition.poseCatalog);
        const span = Math.max(0, Number(after.t) - Number(before.t));
        const rawLocal = span > 0 ? (t - Number(before.t)) / span : 0;
        const local = rawLocal * rawLocal * (3 - 2 * rawLocal);
        const lerp = (from, to) => {
            const start = Number.isFinite(Number(from)) ? Number(from) : (Number(to) || 0);
            const end = Number.isFinite(Number(to)) ? Number(to) : start;
            return start + (end - start) * local;
        };
        const lerpMap = (left = {}, right = {}) => {
            const result = {};
            new Set([...Object.keys(left || {}), ...Object.keys(right || {})]).forEach(key => {
                const leftValue = left?.[key];
                const rightValue = right?.[key];
                if (typeof leftValue === 'number' || typeof rightValue === 'number') {
                    result[key] = lerp(leftValue, rightValue);
                    return;
                }
                if ((leftValue && typeof leftValue === 'object') || (rightValue && typeof rightValue === 'object')) {
                    result[key] = {
                        x: lerp(leftValue?.x, rightValue?.x),
                        y: lerp(leftValue?.y, rightValue?.y)
                    };
                }
            });
            return result;
        };
        const attention = this.jointSystem?._sampleArmatureAttentionTrack?.(definition.attentionTrack, t) || null;
        return {
            angles: lerpMap(a.angles, b.angles),
            partAngles: lerpMap(a.partAngles, b.partAngles),
            jointTilts: lerpMap(a.jointTilts, b.jointTilts),
            partTilts: lerpMap(a.partTilts, b.partTilts),
            dx: lerp(a.dx, b.dx),
            dy: lerp(a.dy, b.dy),
            attention,
            layerOrderOverride: local < 0.5 ? a.layerOrderOverride : b.layerOrderOverride
        };
    }

    _applySvgAfricanBuilderMotionFace(attention = null) {
        const context = this._svgAfricanBuilderPreviewRenderContext;
        const head = document.querySelector('#svg-african-builder-preview [data-svg-african-preview-role="head-neck"]');
        if (!head) return;
        if (!attention || !context?.premiumAssets || !context?.assetId) {
            if (head._svgAfricanPreviewBaseSrc && head.src !== head._svgAfricanPreviewBaseSrc) {
                head.src = head._svgAfricanPreviewBaseSrc;
            }
            head._svgAfricanMotionFaceKey = '';
            return;
        }
        const faceState = { ...(context.faceState || {}) };
        ['gazeX', 'gazeY', 'browRaise', 'headNod', 'headTilt', 'listening'].forEach(property => {
            if (Number.isFinite(Number(attention[property]))) faceState[property] = Number(attention[property]);
        });
        const stateKey = ['gazeX', 'gazeY', 'browRaise', 'headNod', 'headTilt', 'listening']
            .map(property => `${property}:${(Math.round((Number(faceState[property]) || 0) * 4) / 4).toFixed(2)}`)
            .join('|');
        if (head._svgAfricanMotionFaceKey === stateKey) return;
        const rawSvg = context.premiumAssets.renderPartSvg?.(
            context.assetId,
            'head-neck',
            context.config,
            `${context.instanceId}-motion`,
            { faceState }
        );
        if (!rawSvg) return;
        const previewSvg = this._resolveSvgAfricanBuilderSvgPaintVars(rawSvg, context.palette);
        head.src = this._svgAfricanSvgToDataUrl(previewSvg);
        head._svgAfricanMotionFaceKey = stateKey;
    }

    _setSvgAfricanBuilderPreviewLayout(mode = 'single') {
        const multiple = mode === 'multiple';
        const preview = document.getElementById('svg-african-builder-preview');
        const grid = document.getElementById('svg-african-builder-multiview');
        if (!preview || !grid) return false;
        if (multiple && document.getElementById('svg-african-preview-multiple')?.disabled) return false;
        if (multiple && this._svgAfricanBuilderPreviewLayout !== 'multiple') {
            this._svgAfricanBuilderSingleViewport = { left: preview.scrollLeft, top: preview.scrollTop };
            this._stopSvgAfricanBuilderMotionCheck({ reset: true });
        }
        if (!multiple) {
            this._disposeSvgAfricanBuilderMultiView();
            this._svgAfricanBuilderSingleViewportRestore = this._svgAfricanBuilderSingleViewport || null;
            this._svgAfricanBuilderSingleViewport = null;
        }
        this._svgAfricanBuilderPreviewLayout = multiple ? 'multiple' : 'single';
        preview.closest('.svg-african-builder-preview-pane')?.classList.toggle('is-multiview', multiple);
        preview.hidden = multiple;
        grid.hidden = !multiple;
        const comparisonControls = document.getElementById('svg-african-comparison-controls');
        if (comparisonControls) {
            comparisonControls.hidden = !multiple;
            const count = document.getElementById('svg-african-comparison-count');
            const focus = document.getElementById('svg-african-comparison-focus');
            count.onchange = () => {
                this._disposeSvgAfricanBuilderMultiView();
                this._svgAfricanBuilderMultiViews = count.value === '8'
                    ? ['front', 'front-3q-right', 'side-right', 'back-3q-right', 'back', 'back-3q-left', 'side-left', 'front-3q-left']
                    : ['front', 'front-3q-right', 'side-right', 'back'];
                grid.replaceChildren();
                this._scheduleSvgAfricanBuilderPreview();
            };
            focus.onchange = () => { this._svgAfricanBuilderComparisonFocus = focus.value; this._scheduleSvgAfricanBuilderPreview(); };
        }
        ['single', 'multiple'].forEach(key => {
            document.getElementById(`svg-african-preview-${key}`)?.setAttribute('aria-pressed', key === this._svgAfricanBuilderPreviewLayout ? 'true' : 'false');
        });
        document.querySelectorAll('#svg-african-character-modal [id^="svg-african-preview-zoom-"], #svg-african-character-modal [id^="svg-african-preview-focus-"]').forEach(button => { button.disabled = multiple; });
        this._syncSvgAfricanBuilderMotionCheckControls();
        this._syncSvgAfricanThreeQuarterArtworkControl();
        this._scheduleSvgAfricanBuilderPreview();
        return true;
    }

    _disposeSvgAfricanBuilderMultiView() {
        this._svgAfricanBuilderMultiViewGeneration = (this._svgAfricanBuilderMultiViewGeneration || 0) + 1;
        (this._svgAfricanBuilderMultiViewStates || []).forEach(state => this._disposeSvgAfricanBuilderMotionSandbox(state));
        this._svgAfricanBuilderMultiViewStates = [];
        this._svgAfricanBuilderMultiViewResizeObserver?.disconnect();
        this._svgAfricanBuilderMultiViewResizeObserver = null;
    }

    async _refreshSvgAfricanBuilderMultiView(config, asset, comparisonMode) {
        const grid = document.getElementById('svg-african-builder-multiview');
        const modal = document.getElementById('svg-african-character-modal');
        if (!grid || grid.hidden || modal?.classList.contains('hidden')) return;
        this._disposeSvgAfricanBuilderMultiView();
        const generation = this._svgAfricanBuilderMultiViewGeneration;
        const current = () => generation === this._svgAfricanBuilderMultiViewGeneration && grid.isConnected && !grid.hidden && !modal?.classList.contains('hidden');
        const premiumAssets = window.SvgAfricanPremiumAssets;
        const views = premiumAssets.listViewOptions().filter(entry => entry.enabled !== false);
        this._svgAfricanBuilderMultiViews ||= ['front', 'front-3q-right', 'side-right', 'back'];
        grid.dataset.angleCount = String(this._svgAfricanBuilderMultiViews.length);
        grid.dataset.previewTheme = this._svgAfricanBuilderPreviewTheme || 'light';
        grid.dataset.previewComparison = comparisonMode;
        grid.setAttribute('aria-busy', 'true');
        const caption = document.getElementById('svg-african-builder-preview-caption');
        if (caption) caption.textContent = `${config.name || asset.name} - ${comparisonMode === 'opening' ? 'Original' : 'Draft'}`;
        this._renderSvgAfricanBuilderArtworkStatus(premiumAssets.getArtworkRenderStatus?.(asset, config), [], config, asset);
        this._renderSvgAfricanBuilderPalette(premiumAssets.getPalette?.(config));

        if (!grid.children.length) {
            this._svgAfricanBuilderMultiViews.forEach((view, index) => {
                const tile = document.createElement('section');
                tile.className = 'svg-african-builder-angle';
                const select = document.createElement('select');
                select.setAttribute('aria-label', `Comparison angle ${index + 1}`);
                views.forEach(entry => select.add(new Option(entry.name, entry.id)));
                select.value = view;
                select.addEventListener('change', () => {
                    this._svgAfricanBuilderMultiViews[index] = select.value;
                    this._scheduleSvgAfricanBuilderPreview();
                });
                const surface = document.createElement('div');
                surface.className = 'svg-african-builder-angle-surface';
                tile.append(select, surface);
                grid.appendChild(tile);
            });
        }

        const states = [];
        this._svgAfricanBuilderMultiViewStates = states;
        const draw = state => {
            const sandbox = state.sandbox;
            if (!current() || !sandbox?.ready || sandbox.disposed) return;
            const surface = sandbox.host;
            const width = Math.max(1, surface.clientWidth);
            const height = Math.max(1, surface.clientHeight);
            const ratio = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
            sandbox.canvas.width = Math.ceil(width * ratio);
            sandbox.canvas.height = Math.ceil(height * ratio);
            sandbox.pixelRatio = ratio;
            sandbox.targetBounds = { minX: 10, minY: 10, maxX: Math.max(11, width - 10), maxY: Math.max(11, height - 10) };
            this._renderSvgAfricanBuilderMotionSandbox(sandbox);
        };
        const loadTile = async (tile, index) => {
            const surface = tile.querySelector('.svg-african-builder-angle-surface');
            const view = this._svgAfricanBuilderMultiViews[index];
            tile.dataset.view = view;
            tile.querySelector('select').value = view;
            const status = document.createElement('span');
            status.className = 'svg-african-builder-angle-status';
            status.textContent = 'Loading...';
            status.setAttribute('role', 'status');
            surface.replaceChildren(status);
            // View changes belong to isolated inspection rigs, never the live draft or Stage.
            const candidate = JSON.parse(JSON.stringify(config));
            candidate.view = view;
            candidate.sideFacing = view.endsWith('left') ? 'left' : 'right';
            candidate.styling = { ...candidate.styling, view, sideFacing: candidate.sideFacing };
            const normalized = window.SvgAfricanCharacterCatalog.normalizeConfig(candidate);
            const state = { sandbox: null };
            states.push(state);
            try {
                const loader = window.SvgAfricanAuthoredArtworkLoader;
                const assetId = this._resolveSvgAfricanAuthoredAssetId(normalized);
                if (assetId && loader?.ensureLoaded && !loader.isLoaded?.(assetId)) {
                    await loader.ensureLoaded({ assetId, reason: 'svg-african-multiview' });
                }
                if (!current()) return;
                state.sandbox = this._createSvgAfricanBuilderMotionSandbox(state, { config: normalized });
                const sandbox = state.sandbox;
                if (!sandbox || !await this._waitForSvgAfricanBuilderMotionImages(sandbox)) throw new Error('Preview unavailable');
                if (!current() || sandbox.disposed) return;
                sandbox.manager._resolvePins?.();
                const inspected = this._svgAfricanBuilderComparisonFocus === 'head'
                    ? sandbox.manager.objects.filter(obj => obj._svgCharacterPartKey === 'head-neck') : sandbox.manager.objects;
                sandbox.stageBounds = this._getSvgAfricanBuilderMotionBounds(inspected);
                if (!sandbox.stageBounds) throw new Error('Preview unavailable');
                const canvas = document.createElement('canvas');
                canvas.setAttribute('role', 'img');
                canvas.setAttribute('aria-label', views.find(entry => entry.id === view)?.name || view);
                canvas.dataset.view = view;
                canvas.dataset.artworkMode = normalized.styling?.threeQuarterArtwork || 'projected';
                sandbox.canvas = canvas;
                sandbox.host = surface;
                surface.replaceChildren(canvas);
                sandbox.ready = true;
                sandbox.stage.requestRender = () => draw(state);
                draw(state);
            } catch (_) {
                this._disposeSvgAfricanBuilderMotionSandbox(state);
                if (!current()) return;
                const retry = document.createElement('button');
                retry.type = 'button';
                retry.className = 'btn-sm svg-african-builder-angle-status';
                retry.textContent = 'Retry preview';
                retry.addEventListener('click', () => this._scheduleSvgAfricanBuilderPreview());
                surface.replaceChildren(retry);
            }
        };
        await Promise.all([...grid.children].map(loadTile));
        if (!current()) return;
        grid.setAttribute('aria-busy', 'false');
        const diagnosticParts = states.flatMap(state => state.sandbox?.manager?.objects || [])
            .map(obj => ({ src: obj.imageSrc || '' }));
        this._syncSvgAfricanBuilderControlDiagnostics(diagnosticParts, config, premiumAssets.getArtworkRenderStatus?.(asset, config), asset);
        this._svgAfricanBuilderMultiViewResizeObserver = new ResizeObserver(() => states.forEach(draw));
        [...grid.querySelectorAll('.svg-african-builder-angle-surface')].forEach(surface => this._svgAfricanBuilderMultiViewResizeObserver.observe(surface));
    }

    _createSvgAfricanBuilderMotionSandbox(state, options = {}) {
        const sourceManager = this.objects;
        const sourceRuntime = this.jointSystem;
        const context = this._svgAfricanBuilderPreviewRenderContext;
        const sourceConfig = options.config || context?.config;
        if (!sourceManager || !sourceRuntime || !sourceConfig) return null;

        const stage = {
            canvas: {
                width: Math.max(960, Number(this.stage?.width) || 1920),
                height: Math.max(540, Number(this.stage?.height) || 1080)
            },
            width: Math.max(960, Number(this.stage?.width) || 1920),
            height: Math.max(540, Number(this.stage?.height) || 1080),
            zoom: 1,
            requestRender: () => {}
        };
        const manager = Object.create(Object.getPrototypeOf(sourceManager));
        Object.assign(manager, {
            stage,
            objects: [],
            selectedIds: [],
            selectedObjects: [],
            selectionAnchorId: null,
            groups: {},
            groupNames: {},
            layers: [{ id: 'layer-1', name: 'Builder Motion', visible: true, locked: false }],
            activeLayerId: 'layer-1',
            _suppressHistory: true,
            _recordSnapshots: null,
            _isRecording: false,
            animations: null
        });
        manager.addObject = function addBuilderMotionObject(obj) {
            if (!obj) return;
            if (!Number.isFinite(Number(obj.layer))) obj.layer = this.objects.length + 1;
            obj.layerId = obj.layerId || this.activeLayerId;
            obj._svgAfricanBuilderMotionSandbox = true;
            this.objects.push(obj);
        };
        manager.getObjectById = function getBuilderMotionObjectById(id) {
            return this.objects.find(obj => obj?.id === id) || null;
        };
        manager.getSelectedObjects = function getBuilderMotionSelectedObjects() {
            return this.selectedIds.map(id => this.getObjectById(id)).filter(Boolean);
        };
        manager.select = function selectBuilderMotionObjects(ids = []) {
            this.selectedIds = [...ids];
            this.selectedObjects = this.getSelectedObjects();
            this.selectionAnchorId = this.selectedIds[0] || null;
        };
        manager.updateObjectList = () => {};
        manager.updateProperties = () => {};
        manager.isObjectLayerVisible = () => true;
        manager._isObjectInViewport = () => true;
        manager._getLayerOrderAnimObjectIds = () => new Set();

        const runtime = Object.create(Object.getPrototypeOf(sourceRuntime));
        Object.assign(runtime, {
            objects: manager,
            stage,
            animations: null,
            _currentArmature: null,
            _previewAnim: null,
            _armatureAnim: null,
            _armatureLayerMode: false,
            _codeArmatureMovementCatalog: {}
        });
        runtime.openArmaturePanel = () => {};
        runtime.closeArmaturePanel = () => {};
        runtime._updateArmaturePanelPlayState = () => {};

        const config = JSON.parse(JSON.stringify(sourceConfig));
        let armature = null;
        const bus = typeof eventBus !== 'undefined' ? eventBus : null;
        const originalEmit = bus?.emit;
        if (bus && typeof originalEmit === 'function') {
            bus.emit = function emitBuilderMotionEvent(name, ...args) {
                if (name === 'history:push' || name === 'selection:changed' || name === 'object:added') return undefined;
                return originalEmit.call(this, name, ...args);
            };
        }
        try {
            armature = runtime.createSvgAfricanCharacter?.(config, {
                ignoreSelectionReference: true
            }) || null;
        } finally {
            if (bus && typeof originalEmit === 'function') bus.emit = originalEmit;
        }
        if (!armature?.root) return null;
        manager.objects.forEach(obj => { obj._svgAfricanBuilderMotionSandbox = true; });
        return {
            state,
            runtime,
            manager,
            stage,
            armature,
            canvas: null,
            host: null,
            targetBounds: null,
            stageBounds: null,
            ready: false,
            disposed: false,
            frameCount: 0
        };
    }

    _getSvgAfricanBuilderMotionBounds(objects = []) {
        const visible = objects.filter(obj => obj && obj.visible !== false && obj._armatureHideFromFit !== true);
        if (!visible.length) return null;
        return visible.reduce((bounds, obj) => {
            const box = obj.getBounds?.() || {
                x: Number(obj.x) || 0,
                y: Number(obj.y) || 0,
                width: Math.abs(Number(obj.width) || 1),
                height: Math.abs(Number(obj.height) || 1)
            };
            const left = Number(box.x) || 0;
            const top = Number(box.y) || 0;
            const right = Number.isFinite(Number(box.right)) ? Number(box.right) : left + Math.abs(Number(box.width) || 1);
            const bottom = Number.isFinite(Number(box.bottom)) ? Number(box.bottom) : top + Math.abs(Number(box.height) || 1);
            bounds.minX = Math.min(bounds.minX, left);
            bounds.minY = Math.min(bounds.minY, top);
            bounds.maxX = Math.max(bounds.maxX, right);
            bounds.maxY = Math.max(bounds.maxY, bottom);
            return bounds;
        }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    }

    _mountSvgAfricanBuilderMotionCanvas(sandbox) {
        const preview = document.getElementById('svg-african-builder-preview');
        const host = preview?.querySelector?.('.svg-african-builder-preview-canvas');
        if (!host || sandbox?.disposed) return false;
        const sourceNodes = [...host.querySelectorAll('[data-svg-african-preview-role]')];
        if (!sourceNodes.length) return false;
        const targetBounds = sourceNodes.reduce((bounds, node) => {
            const left = Number.parseFloat(node.style.left) || node.offsetLeft || 0;
            const top = Number.parseFloat(node.style.top) || node.offsetTop || 0;
            const width = Number.parseFloat(node.style.width) || node.offsetWidth || 1;
            const height = Number.parseFloat(node.style.height) || node.offsetHeight || 1;
            bounds.minX = Math.min(bounds.minX, left);
            bounds.minY = Math.min(bounds.minY, top);
            bounds.maxX = Math.max(bounds.maxX, left + width);
            bounds.maxY = Math.max(bounds.maxY, top + height);
            return bounds;
        }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
        const stageBounds = this._getSvgAfricanBuilderMotionBounds(sandbox.manager.objects);
        if (!stageBounds) return false;

        const canvas = document.createElement('canvas');
        canvas.className = 'svg-african-builder-rig-motion-canvas';
        canvas.dataset.svgAfricanMotionRenderer = 'pose-armature';
        canvas.setAttribute('aria-hidden', 'true');
        const width = Math.max(1, Math.ceil(host.clientWidth || Number.parseFloat(host.style.width) || 1));
        const height = Math.max(1, Math.ceil(host.clientHeight || Number.parseFloat(host.style.height) || 1));
        const pixelRatio = Math.max(1, Math.min(2, Number(window.devicePixelRatio) || 1));
        canvas.width = Math.ceil(width * pixelRatio);
        canvas.height = Math.ceil(height * pixelRatio);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        host.classList.add('is-rig-motion-preview');
        host.appendChild(canvas);
        sandbox.canvas = canvas;
        sandbox.host = host;
        sandbox.targetBounds = targetBounds;
        sandbox.stageBounds = stageBounds;
        sandbox.pixelRatio = pixelRatio;
        sandbox.stage.requestRender = () => {
            if (!sandbox.disposed && sandbox.ready) this._renderSvgAfricanBuilderMotionSandbox(sandbox);
        };
        return true;
    }

    _renderSvgAfricanBuilderMotionSandbox(sandbox) {
        if (!sandbox?.ready || sandbox.disposed || !sandbox.canvas?.isConnected) return false;
        const ctx = sandbox.canvas.getContext('2d');
        const source = sandbox.stageBounds;
        const target = sandbox.targetBounds;
        if (!ctx || !source || !target) return false;
        const sourceWidth = Math.max(1, source.maxX - source.minX);
        const sourceHeight = Math.max(1, source.maxY - source.minY);
        const targetWidth = Math.max(1, target.maxX - target.minX);
        const targetHeight = Math.max(1, target.maxY - target.minY);
        const scale = Math.min(targetWidth / sourceWidth, targetHeight / sourceHeight);
        const sourceCenterX = (source.minX + source.maxX) * 0.5;
        const sourceCenterY = (source.minY + source.maxY) * 0.5;
        const targetCenterX = (target.minX + target.maxX) * 0.5;
        const targetCenterY = (target.minY + target.maxY) * 0.5;
        const offsetX = targetCenterX - sourceCenterX * scale;
        const offsetY = targetCenterY - sourceCenterY * scale;
        const pixelRatio = sandbox.pixelRatio || 1;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, sandbox.canvas.width, sandbox.canvas.height);
        ctx.setTransform(pixelRatio * scale, 0, 0, pixelRatio * scale, pixelRatio * offsetX, pixelRatio * offsetY);
        ctx.imageSmoothingEnabled = true;
        if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
        sandbox.manager.renderScene?.(ctx, {
            includeEditorArtifacts: false,
            resolvePins: true,
            renderOptions: { quality: 'preview' }
        });
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        sandbox.frameCount += 1;
        sandbox.canvas.dataset.svgAfricanMotionFrame = String(sandbox.frameCount);
        sandbox.canvas.dataset.svgAfricanMotionReady = 'true';
        return true;
    }

    _waitForSvgAfricanBuilderMotionImages(sandbox, timeoutMs = 3200) {
        const started = performance.now();
        return new Promise(resolve => {
            const check = () => {
                if (!sandbox || sandbox.disposed) {
                    resolve(false);
                    return;
                }
                const images = sandbox.manager.objects.filter(obj => obj?.type === 'image' && obj.visible !== false);
                const ready = images.length > 0 && images.every(obj => {
                    const image = obj.imageElement;
                    return !!image && (image.complete !== false) && !!(image.naturalWidth || image.width);
                });
                if (ready) {
                    resolve(true);
                    return;
                }
                if (performance.now() - started >= timeoutMs) {
                    resolve(false);
                    return;
                }
                requestAnimationFrame(check);
            };
            check();
        });
    }

    _disposeSvgAfricanBuilderMotionSandbox(state = this._svgAfricanBuilderMotionCheck) {
        const sandbox = state?.sandbox;
        if (!sandbox) return;
        sandbox.disposed = true;
        try { sandbox.runtime?._stopArmatureMovement?.(sandbox.armature); } catch (_) {}
        sandbox.stage.requestRender = () => {};
        sandbox.host?.classList?.remove('is-rig-motion-preview');
        sandbox.canvas?.remove?.();
        sandbox.manager?.objects?.forEach?.(obj => {
            obj.imageElement = null;
            obj.textureImageElement = null;
        });
        state.sandbox = null;
    }

    async _startSvgAfricanBuilderRigMotion(state) {
        if (!state?.playing || this._svgAfricanBuilderMotionCheck !== state) return false;
        const generation = (state.generation || 0) + 1;
        state.generation = generation;
        this._disposeSvgAfricanBuilderMotionSandbox(state);
        this._syncSvgAfricanBuilderMotionCheckControls({ stateLabel: `Preparing ${state.definition?.name || state.action}` });
        const sandbox = this._createSvgAfricanBuilderMotionSandbox(state);
        if (!sandbox || !this._mountSvgAfricanBuilderMotionCanvas(sandbox)) {
            if (sandbox) sandbox.disposed = true;
            state.playing = false;
            this._syncSvgAfricanBuilderMotionCheckControls({ stateLabel: 'Unavailable' });
            return false;
        }
        state.sandbox = sandbox;
        const imagesReady = await this._waitForSvgAfricanBuilderMotionImages(sandbox);
        if (
            !imagesReady
            || sandbox.disposed
            || !state.playing
            || state.generation !== generation
            || this._svgAfricanBuilderMotionCheck !== state
        ) {
            if (state.sandbox === sandbox) this._disposeSvgAfricanBuilderMotionSandbox(state);
            if (state.playing && state.generation === generation) {
                state.playing = false;
                this._syncSvgAfricanBuilderMotionCheckControls({ stateLabel: 'Preview unavailable' });
            }
            return false;
        }

        sandbox.ready = true;
        this._renderSvgAfricanBuilderMotionSandbox(sandbox);
        const definition = state.definition;
        const movement = definition.kind === 'pose'
            ? {
                name: definition.name,
                duration: definition.duration,
                repeat: Infinity,
                easing: 'ease-in-out',
                keyframes: definition.keyframes.map(frame => ({ ...frame }))
            }
            : {
                ...(definition.entry || {}),
                name: definition.name,
                duration: definition.duration,
                repeat: Infinity,
                keyframes: definition.keyframes.map(frame => ({ ...frame }))
            };
        sandbox.runtime._playArmatureMovement?.(sandbox.armature, definition.key, {
            movementEntryOverride: movement
        });
        this._syncSvgAfricanBuilderMotionCheckControls();
        return true;
    }

    _applySvgAfricanBuilderMotionCheckFrame(progress = 0) {
        const state = this._svgAfricanBuilderMotionCheck;
        const preview = document.getElementById('svg-african-builder-preview');
        const canvas = preview?.querySelector?.('.svg-african-builder-preview-canvas');
        if (!state?.definition || !canvas) return false;
        const sample = this._sampleSvgAfricanBuilderMotionDefinition(state.definition, progress);
        if (!sample) return false;
        const view = String(state.definition.view || 'front');
        const safeScale = Number(canvas.dataset.svgAfricanPreviewScale) || 1;
        const rootX = Math.max(-30, Math.min(30, (Number(sample.dx) || 0) * safeScale * 0.08));
        const rootY = Math.max(-48, Math.min(48, (Number(sample.dy) || 0) * safeScale * 0.6));
        const angles = sample.angles || {};
        const partAngles = sample.partAngles || {};
        const partTilts = sample.partTilts || {};
        const roleToJoint = {
            'right-arm': 'right-shoulder',
            'left-arm': 'left-shoulder',
            'front-arm': 'front-shoulder',
            'back-arm': 'back-shoulder',
            'right-leg': 'right-hip',
            'left-leg': 'left-hip',
            'front-leg': 'front-hip',
            'back-leg': 'back-hip'
        };
        const layerOrder = Array.isArray(sample.layerOrderOverride) ? sample.layerOrderOverride : [];
        const layerMap = new Map(layerOrder.map((role, index) => [role, 20 + index * 10]));
        canvas.querySelectorAll('[data-svg-african-preview-role]').forEach((node, index) => {
            const role = String(node.dataset.svgAfricanPreviewRole || '');
            const jointName = roleToJoint[role];
            let rotation = Number(partAngles[role]) || 0;
            if (jointName) rotation += (Number(angles[jointName]) || 0) * 0.88;
            if (role === 'torso') rotation += (Number(angles.waist) || 0) * 0.34;
            if (role === 'head-neck') {
                rotation += (Number(angles.neck) || 0) * 0.62;
                rotation += (Number(sample.attention?.headTilt) || 0) * 0.42;
                rotation += (Number(sample.attention?.headPitch) || 0) * (view.startsWith('side-') ? 0.24 : 0.12);
            }
            if (node.dataset.svgAfricanPreviewGarment) {
                rotation = (Number(partAngles.torso) || 0) * 0.14;
            }
            const tilt = partTilts[role] || {};
            const scaleX = Math.max(0.72, Math.cos((Number(tilt.y) || 0) * Math.PI / 180));
            const scaleY = Math.max(0.72, Math.cos((Number(tilt.x) || 0) * Math.PI / 180));
            node.style.transform = `translate(${rootX.toFixed(2)}px, ${rootY.toFixed(2)}px) rotate(${rotation.toFixed(2)}deg) scale(${scaleX.toFixed(4)}, ${scaleY.toFixed(4)})`;
            node.style.zIndex = String(layerMap.get(role) ?? Number(node.dataset.svgAfricanPreviewBaseZ || index + 1));
        });
        this._applySvgAfricanBuilderMotionFace(sample.attention);
        return true;
    }

    _syncSvgAfricanBuilderMotionCheckControls(options = {}) {
        const state = this._svgAfricanBuilderMotionCheck;
        const playing = state?.playing === true;
        const play = document.getElementById('svg-african-builder-motion-play');
        const stop = document.getElementById('svg-african-builder-motion-stop');
        const status = document.getElementById('svg-african-builder-motion-state');
        const select = document.getElementById('svg-african-builder-motion-select');
        const view = document.querySelector('#svg-african-builder-preview .svg-african-builder-preview-canvas')?.dataset?.svgAfricanPreviewView
            || this._svgAfricanBuilderPreviewRenderContext?.view || 'front';
        select?.querySelectorAll('option').forEach(option => {
            const available = !!this._resolveSvgAfricanBuilderMotionDefinition(option.value, view);
            option.disabled = !available;
            option.hidden = !available;
        });
        if (select?.selectedOptions?.[0]?.disabled) select.value = 'idle';
        play?.classList.toggle('is-active', playing);
        play?.setAttribute('aria-pressed', playing ? 'true' : 'false');
        if (play) play.disabled = this._svgAfricanBuilderPreviewLayout === 'multiple';
        if (select) select.disabled = this._svgAfricanBuilderPreviewLayout === 'multiple';
        if (stop) stop.disabled = !playing;
        if (status) status.textContent = options.stateLabel || (playing ? `Playing ${state.definition?.name || state.action}` : 'Ready');
    }

    _stopSvgAfricanBuilderMotionCheck(options = {}) {
        const state = this._svgAfricanBuilderMotionCheck;
        if (state?.raf) cancelAnimationFrame(state.raf);
        if (state?.rebuildFrame) cancelAnimationFrame(state.rebuildFrame);
        if (state) state.generation = (state.generation || 0) + 1;
        this._disposeSvgAfricanBuilderMotionSandbox(state);
        if (state) {
            state.playing = false;
            state.raf = null;
            state.rebuildFrame = null;
            state.lastTimestamp = null;
            state.elapsed = 0;
            state.progress = 0;
        }
        if (options.reset !== false) {
            document.querySelectorAll('#svg-african-builder-preview [data-svg-african-preview-role]').forEach(node => {
                node.style.transform = '';
                node.style.zIndex = node.dataset.svgAfricanPreviewBaseZ || '';
                if (node._svgAfricanPreviewBaseSrc && node.src !== node._svgAfricanPreviewBaseSrc) {
                    node.src = node._svgAfricanPreviewBaseSrc;
                }
                node._svgAfricanMotionFaceKey = '';
            });
        }
        this._syncSvgAfricanBuilderMotionCheckControls({ stateLabel: options.stateLabel || 'Ready' });
    }

    _playSvgAfricanBuilderMotionCheck(actionKey = 'idle') {
        const preview = document.getElementById('svg-african-builder-preview');
        const canvas = preview?.querySelector?.('.svg-african-builder-preview-canvas');
        const view = canvas?.dataset?.svgAfricanPreviewView || this._svgAfricanBuilderPreviewRenderContext?.view || 'front';
        const definition = this._resolveSvgAfricanBuilderMotionDefinition(actionKey, view);
        this._stopSvgAfricanBuilderMotionCheck({ reset: true, stateLabel: definition ? 'Starting' : 'Unavailable' });
        if (!definition) return false;
        const state = {
            action: String(actionKey || 'idle'),
            definition,
            view,
            playing: true,
            raf: null,
            elapsed: 0,
            progress: 0,
            lastTimestamp: null,
            generation: 0,
            sandbox: null,
            rebuildFrame: null
        };
        this._svgAfricanBuilderMotionCheck = state;
        void this._startSvgAfricanBuilderRigMotion(state);
        return true;
    }

    _scheduleSvgAfricanBuilderPreview(options = {}) {
        if (!options.skipHistory) {
            this._captureSvgAfricanBuilderHistory(options.historyInteraction || null);
        }
        this._syncSvgAfricanBuilderEditContext?.();
        this._syncSvgAfricanBuilderHistoryControls?.();
        this._syncSvgAfricanBuilderSelectionSummary?.();
        if (this._svgAfricanBuilderPreviewFrame) {
            cancelAnimationFrame(this._svgAfricanBuilderPreviewFrame);
        }
        this._svgAfricanBuilderPreviewFrame = requestAnimationFrame(() => {
            this._svgAfricanBuilderPreviewFrame = null;
            this._refreshSvgAfricanBuilderPreview();
        });
    }

    _getSvgAfricanBuilderFocusRequestForControl(control) {
        if (!control?.matches?.('select,input')) return null;
        const id = String(control.id || '');
        const adjust = String(control.dataset?.svgAfricanAdjust || '');
        const liveAdjust = String(control.dataset?.svgAfricanLiveAdjust || '');
        const color = String(control.dataset?.svgAfricanColor || '');
        const key = `${id} ${adjust} ${liveAdjust} ${color}`.toLowerCase();
        if (/foot|feet|shoe|footwear/.test(key)) {
            return { roles: ['right-leg', 'left-leg', 'front-leg', 'back-leg'], region: 'feet', anchorY: 0.76 };
        }
        if (/abdomen|tummy|belly|pregnan/.test(key)) {
            return { roles: ['torso'], region: 'abdomen', anchorY: 0.52 };
        }
        if (/chest|breast|back-curve|buttock|seat-profile/.test(key)) {
            return { roles: ['torso'], region: 'torso-profile', anchorY: 0.48 };
        }
        if (/preset|presentation|age|body|height/.test(key)) {
            return { mode: 'home' };
        }
        if (/face|head|hair|eye|nose|lip|neck|brow|facial-hair|headwear|glass|cheek|jaw|chin|occiput|ear/.test(key)) {
            return { roles: ['head-neck'], anchorY: 0.35 };
        }
        if (/arm|hand|shoulder|muscle/.test(key)) {
            return { roles: ['right-arm', 'left-arm', 'front-arm', 'back-arm', 'torso'], anchorY: 0.44 };
        }
        if (/leg|foot|hip|bottom|skirt|wrapper|footwear/.test(key)) {
            return { roles: ['right-leg', 'left-leg', 'front-leg', 'back-leg', 'torso'], anchorY: 0.68 };
        }
        if (/torso|top|sleeve|tie|clothing|outfit|profession|fabric|palette|cultural|accessor|color/.test(key)) {
            return { roles: ['torso', 'right-arm', 'left-arm', 'front-arm', 'back-arm', 'right-leg', 'left-leg', 'front-leg', 'back-leg'], anchorY: 0.5 };
        }
        return null;
    }

    _requestSvgAfricanBuilderPreviewFocus(request = null) {
        const next = request || { mode: 'home' };
        this._svgAfricanBuilderFocusRequest = next;
        this._svgAfricanBuilderPreviewNeedsCenter = next.mode === 'home';
        this._svgAfricanBuilderUserPannedPreview = false;
        this._scheduleSvgAfricanBuilderPreview();
    }

    _getSvgAfricanBuilderPreviewFocusBounds(parts = [], request = null) {
        if (!request || request.mode === 'home') return null;
        const roles = new Set(Array.isArray(request.roles) ? request.roles : []);
        if (!roles.size) return null;
        const focusParts = parts.filter(item => item?.profile && roles.has(item.role));
        if (!focusParts.length) return null;
        const region = String(request.region || '').toLowerCase();
        return focusParts.reduce((box, item) => {
            const p = item.profile;
            let minX = p.x;
            let minY = p.y;
            let maxX = p.x + p.width;
            let maxY = p.y + p.height;
            if (region === 'feet' && /leg$/.test(item.role)) {
                minX = p.x - p.width * 0.18;
                maxX = p.x + p.width * 1.18;
                minY = p.y + p.height * 0.74;
                maxY = p.y + p.height;
            } else if (region === 'abdomen' && item.role === 'torso') {
                minX = p.x + p.width * 0.08;
                maxX = p.x + p.width * 0.92;
                minY = p.y + p.height * 0.34;
                maxY = p.y + p.height * 0.78;
            } else if (region === 'torso-profile' && item.role === 'torso') {
                minX = p.x;
                maxX = p.x + p.width;
                minY = p.y + p.height * 0.10;
                maxY = p.y + p.height * 0.94;
            }
            box.minX = Math.min(box.minX, minX);
            box.minY = Math.min(box.minY, minY);
            box.maxX = Math.max(box.maxX, maxX);
            box.maxY = Math.max(box.maxY, maxY);
            return box;
        }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
    }

    _resetSvgAfricanBuilderPreviewViewport() {
        const modal = document.getElementById('svg-african-character-modal');
        const preview = document.getElementById('svg-african-builder-preview');
        const pane = modal?.querySelector?.('.svg-african-builder-preview-pane');
        const form = modal?.querySelector?.('.svg-african-form');
        const modalBody = modal?.querySelector?.('.modal-body');
        [preview, pane, form, modalBody].forEach(node => {
            if (!node) return;
            node.scrollLeft = 0;
            node.scrollTop = 0;
        });
        this._svgAfricanBuilderPreviewNeedsCenter = true;
        this._svgAfricanBuilderFocusRequest = { mode: 'home' };
        this._svgAfricanBuilderUserPannedPreview = false;
    }

    _orderSvgAfricanBuilderPreviewParts(parts = [], config = null) {
        const ordered = Array.isArray(parts) ? [...parts] : [];
        const hasLongTorsoGarment = globalThis.ArmatureGarmentPolicies?.hasLongTorsoGarment?.({
            _svgCharacterConfig: config || {}
        }) === true;
        if (!hasLongTorsoGarment || ordered.length < 3) return ordered;

        const torso = ordered.find(item => item?.role === 'torso');
        const head = ordered.find(item => item?.role === 'head-neck');
        if (!torso) return ordered;
        const withoutTorsoHead = ordered.filter(item => item !== torso && item !== head);
        const lastLegIndex = withoutTorsoHead.reduce(
            (latest, item, index) => (/^(?:right|left|front|back)-leg$/.test(String(item?.role || '')) ? index : latest),
            -1
        );
        if (lastLegIndex < 0) return ordered;
        return [
            ...withoutTorsoHead.slice(0, lastLegIndex + 1),
            torso,
            ...(head ? [head] : []),
            ...withoutTorsoHead.slice(lastLegIndex + 1)
        ];
    }

    _getSvgAfricanBuilderGarmentPreviewParts(premiumAssets, asset, config, adjustments, parts, palette, instanceId = 'builder-preview') {
        if (!asset?.id || typeof premiumAssets?.renderContinuousGarmentSpecs !== 'function') return [];
        const torso = parts.find(item => item?.role === 'torso')?.profile;
        const legs = parts
            .filter(item => /^(?:right|left|front|back)-leg$/.test(String(item?.role || '')))
            .map(item => item.profile)
            .filter(Boolean)
            .slice(0, 2);
        if (!torso || legs.length < 2) return [];

        const specs = premiumAssets.renderContinuousGarmentSpecs(
            asset.id,
            config,
            `${instanceId}-garment`,
            { adjustments: adjustments || {} }
        );
        if (!Array.isArray(specs) || !specs.length) return [];

        const legLeft = Math.min(...legs.map(leg => Number(leg.x) || 0));
        const legRight = Math.max(...legs.map(leg => (Number(leg.x) || 0) + Math.abs(Number(leg.width) || 0)));
        const legTop = Math.min(...legs.map(leg => Number(leg.y) || 0));
        const legHeight = legs.reduce(
            (sum, leg) => sum + Math.max(1, Math.abs(Number(leg.height) || 1)),
            0
        ) / legs.length;
        const legUnionWidth = Math.max(1, legRight - legLeft);
        const torsoWidth = Math.max(1, Math.abs(Number(torso.width) || 1));

        return specs.map((spec, index) => {
            const sidePadding = Math.max(0, Number(spec.sidePaddingRatio) || 0);
            const width = Math.max(
                legUnionWidth * (1 + sidePadding * 2),
                torsoWidth * Math.max(0.5, Number(spec.torsoWidthRatio) || 0.84)
            );
            const height = Math.max(18, legHeight * Math.max(0.10, Number(spec.coverageRatio) || 0.54));
            const centerX = (Number(torso.x) || 0)
                + (Number(torso.width) || 0) * (0.5 + (Number(spec.centerOffsetRatio) || 0));
            const rawSvg = String(spec.svg || '');
            const previewSvg = rawSvg
                ? this._resolveSvgAfricanBuilderSvgPaintVars(rawSvg, palette)
                : '';
            return {
                role: spec.roleKey || `svg-african-garment-${index}`,
                profile: {
                    x: centerX - width * 0.5,
                    y: legTop - legHeight * Math.max(0, Number(spec.topOverlapRatio) || 0),
                    width,
                    height
                },
                svg: previewSvg,
                src: previewSvg ? this._svgAfricanSvgToDataUrl(previewSvg) : spec.imageSrc,
                source: '',
                isGarmentPreview: true,
                garmentSlot: String(spec.slotKey || 'lower')
            };
        }).filter(item => item.profile && item.src);
    }

    _refreshSvgAfricanBuilderPreview() {
        const preview = document.getElementById('svg-african-builder-preview');
        if (!preview) return;

        const catalog = window.SvgAfricanCharacterCatalog;
        const premiumAssets = window.SvgAfricanPremiumAssets;
        const renderer = window.SvgAfricanCharacterRenderer;
        if (!catalog?.normalizeConfig) {
            preview.innerHTML = '<div class="svg-african-builder-preview-empty">Preview unavailable</div>';
            this._renderSvgAfricanBuilderArtworkStatus(null);
            this._renderSvgAfricanBuilderPalette(null);
            this._syncSvgAfricanBuilderControlDiagnostics([], null, null, null);
            return;
        }

        const previewSession = this._svgAfricanBuilderEditSession;
        const openingConfig = previewSession?.openingHistoryEntry?.config || null;
        const comparisonMode = this._svgAfricanBuilderPreviewComparison === 'opening'
            && openingConfig
            && this._hasUnsavedSvgAfricanBuilderDraft?.() === true
            ? 'opening'
            : 'current';
        this._svgAfricanBuilderPreviewComparison = comparisonMode;
        const rawConfig = comparisonMode === 'opening'
            ? JSON.parse(JSON.stringify(openingConfig))
            : this._getSvgAfricanCharacterFormConfig();
        const config = catalog.normalizeConfig(rawConfig) || rawConfig;
        const previewContext = previewSession?.mode === 'edit' && previewSession.rootId
            ? `edit-${previewSession.rootId}`
            : 'create-draft';
        const previewInstanceId = `builder-preview-${previewContext}-${comparisonMode}`.replace(/[^a-zA-Z0-9_-]+/g, '-');
        preview.dataset.previewTheme = this._svgAfricanBuilderPreviewTheme || 'light';
        preview.dataset.previewComparison = comparisonMode;
        preview.parentElement.dataset.previewComparison = comparisonMode;
        const assetId = config.assetCharacterId || config.assetId || null;
        const asset = premiumAssets?.resolveAssetForConfig?.(config)
            || (assetId && premiumAssets?.get ? premiumAssets.get(assetId) : null);
        if (asset && premiumAssets?.normalizePremiumConfig) {
            Object.assign(config, premiumAssets.normalizePremiumConfig(asset, config));
        }
        const multipleButton = document.getElementById('svg-african-preview-multiple');
        const canInspect = !!asset && config.useBasicSvg !== true && config.preferBasicSvg !== true && config.disablePremiumPresetUpgrade !== true;
        if (multipleButton) multipleButton.disabled = !canInspect;
        if (this._svgAfricanBuilderPreviewLayout === 'multiple') {
            if (!canInspect) {
                this._setSvgAfricanBuilderPreviewLayout('single');
                return;
            }
            void this._refreshSvgAfricanBuilderMultiView(config, asset, comparisonMode);
            return;
        }
        const authoredLoader = window.SvgAfricanAuthoredArtworkLoader;
        // The form selection is authoritative here. Asset metadata can temporarily
        // describe the projected fallback while scripts or a previous view load.
        const authoredAssetId = this._resolveSvgAfricanAuthoredAssetId(config);
        const authoredRequestKey = authoredLoader?.getBundleId?.(authoredAssetId) || authoredAssetId;
        const authoredLoadFailed = !!authoredRequestKey
            && this._svgAfricanAuthoredArtworkLoadFailures?.has?.(authoredRequestKey);
        if (
            authoredAssetId
            && authoredLoader?.ensureLoaded
            && !authoredLoader.isLoaded?.(authoredAssetId)
            && !authoredLoadFailed
        ) {
            preview.innerHTML = '<div class="svg-african-builder-preview-empty">Loading premium artwork...</div>';
            this._renderSvgAfricanBuilderArtworkStatus(null);
            this._renderSvgAfricanBuilderPalette(null);
            this._syncSvgAfricanBuilderControlDiagnostics([], config, null, asset);
            if (!this._svgAfricanAuthoredArtworkLoadPromises?.has?.(authoredRequestKey)) {
                void this._ensureSvgAfricanAuthoredArtwork({
                    reason: 'svg-african-builder-preview',
                    assetId: authoredAssetId
                });
            }
            return;
        }
        const adjustments = premiumAssets?.getAdjustments?.(config) || config.premiumAdjustments || {};
        const manifest = asset ? premiumAssets.getAssetManifest?.(asset.id) : null;
        let captionText = 'SVG African Character - front';
        let previewPalette = null;
        let artworkStatus = null;
        let parts = [];

        if (asset && premiumAssets?.renderPartSvg && premiumAssets?.getPartProfile) {
            previewPalette = premiumAssets.getPalette?.(config) || null;
            artworkStatus = premiumAssets.getArtworkRenderStatus?.(asset, config) || null;
            const roles = (manifest?.order?.length ? manifest.order : (manifest?.roles || premiumAssets.roles || []))
                .filter(role => !!premiumAssets.getPartProfile(asset.id, role, adjustments));
            parts = roles.map(role => {
                const rawSvg = premiumAssets.renderPartSvg(asset.id, role, config, previewInstanceId);
                const previewSvg = this._resolveSvgAfricanBuilderSvgPaintVars(rawSvg, previewPalette);
                const source = rawSvg.match(/data-svg-african-artwork-source="([^"]+)"/)?.[1] || '';
                return {
                    role,
                    profile: premiumAssets.getPartProfile(asset.id, role, adjustments),
                    svg: previewSvg,
                    src: this._svgAfricanSvgToDataUrl(previewSvg),
                    source
                };
            }).filter(item => item.profile && item.src);
            parts = this._orderSvgAfricanBuilderPreviewParts(parts, config);
            const garmentParts = this._getSvgAfricanBuilderGarmentPreviewParts(
                premiumAssets,
                asset,
                config,
                adjustments,
                parts,
                previewPalette,
                previewInstanceId
            );
            if (garmentParts.length) {
                const lastLegIndex = parts.reduce(
                    (latest, item, index) => (/^(?:right|left|front|back)-leg$/.test(String(item?.role || '')) ? index : latest),
                    -1
                );
                parts.splice(lastLegIndex + 1, 0, ...garmentParts);
            }
            captionText = `${manifest?.name || asset.name || 'Premium SVG African Character'} - ${manifest?.view || 'front'}`;
        } else if (renderer?.renderPartDataUrl) {
            const profile = Number(config.rendererVersion ?? 3) >= 3 && renderer.frontBodyProfileV3
                ? renderer.frontBodyProfileV3
                : renderer.frontArtProfile;
            const roles = ['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm'];
            const getProfile = (role) => {
                const direct = profile?.parts?.[role];
                if (direct?.x != null) return direct;
                if (/arm$/.test(role) && profile?.parts?.arm) {
                    const side = role.startsWith('right') ? -1 : 1;
                    return {
                        ...profile.parts.arm,
                        x: (profile.parts.torso?.x ?? 0) + (profile.parts.torso?.width ?? 140) / 2 + side * 68 - (profile.parts.arm.width ?? 90) / 2,
                        y: (profile.parts.torso?.y ?? 0) - 6
                    };
                }
                if (/leg$/.test(role) && profile?.parts?.leg) {
                    const side = role.startsWith('right') ? -1 : 1;
                    return {
                        ...profile.parts.leg,
                        x: (profile.parts.torso?.x ?? 0) + (profile.parts.torso?.width ?? 140) / 2 + side * 28 - (profile.parts.leg.width ?? 92) / 2,
                        y: (profile.parts.torso?.y ?? 0) + (profile.parts.torso?.height ?? 170) - 8
                    };
                }
                return direct || null;
            };
            parts = roles.map(role => {
                const rawSvg = renderer.renderPart?.(role, config, previewInstanceId) || '';
                const previewSvg = rawSvg
                    ? this._resolveSvgAfricanBuilderSvgPaintVars(rawSvg, null)
                    : '';
                return {
                    role,
                    profile: getProfile(role),
                    svg: previewSvg,
                    src: previewSvg
                        ? this._svgAfricanSvgToDataUrl(previewSvg)
                        : renderer.renderPartDataUrl(role, config, previewInstanceId)
                };
            }).filter(item => item.profile && item.src);
            captionText = `${config.name || 'Procedural SVG African Character'} - front`;
        }

        if (parts.length === 0) {
            preview.innerHTML = '<div class="svg-african-builder-preview-empty">Preview unavailable</div>';
            this._renderSvgAfricanBuilderArtworkStatus(null);
            this._renderSvgAfricanBuilderPalette(null);
            this._syncSvgAfricanBuilderControlDiagnostics([], config, artworkStatus, asset);
            return;
        }

        const bounds = parts.reduce((box, item) => {
            const p = item.profile;
            box.minX = Math.min(box.minX, p.x);
            box.minY = Math.min(box.minY, p.y);
            box.maxX = Math.max(box.maxX, p.x + p.width);
            box.maxY = Math.max(box.maxY, p.y + p.height);
            return box;
        }, { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });

        const viewWidth = preview.clientWidth || 300;
        const viewHeight = preview.clientHeight || 430;
        const padding = 20;
        const sourceWidth = Math.max(1, bounds.maxX - bounds.minX);
        const sourceHeight = Math.max(1, bounds.maxY - bounds.minY);
        const scale = Math.min(
            (viewWidth - padding * 2) / sourceWidth,
            (viewHeight - padding * 2) / sourceHeight
        );
        const zoom = Math.max(0.55, Math.min(2.4, Number(this._svgAfricanBuilderPreviewZoom || 1)));
        const safeScale = (Number.isFinite(scale) && scale > 0 ? scale : 1) * zoom;
        const contentWidth = sourceWidth * safeScale;
        const contentHeight = sourceHeight * safeScale;
        let canvasWidth = Math.ceil(Math.max(viewWidth, contentWidth + padding * 2));
        let canvasHeight = Math.ceil(Math.max(viewHeight, contentHeight + padding * 2));
        if (zoom > 1.01) {
            const panMargin = Math.ceil((zoom - 1) * 80) + 2;
            canvasWidth = Math.max(canvasWidth, viewWidth + panMargin);
            canvasHeight = Math.max(canvasHeight, viewHeight + panMargin);
        }
        const contentLeft = contentWidth > viewWidth - padding * 2 ? padding : (canvasWidth - contentWidth) / 2;
        const contentTop = contentHeight > viewHeight - padding * 2 ? padding : (canvasHeight - contentHeight) / 2;
        const offsetX = contentLeft - bounds.minX * safeScale;
        const offsetY = contentTop - bounds.minY * safeScale;
        const previousScrollLeft = preview.scrollLeft || 0;
        const previousScrollTop = preview.scrollTop || 0;
        const shouldCenter = this._svgAfricanBuilderPreviewNeedsCenter || !preview.querySelector('.svg-african-builder-preview-canvas');
        const focusRequest = this._svgAfricanBuilderFocusRequest || null;
        const canvas = document.createElement('div');
        canvas.className = 'svg-african-builder-preview-canvas';
        canvas.dataset.svgAfricanPreviewPreset = String(config.preset || '');
        canvas.dataset.svgAfricanPreviewView = String(manifest?.view || config.view || config.styling?.view || '');
        canvas.dataset.svgAfricanPreviewAssetId = String(asset?.id || '');
        canvas.dataset.svgAfricanPreviewComparison = comparisonMode;
        canvas.dataset.svgAfricanPreviewScale = String(safeScale);
        canvas.style.width = `${canvasWidth}px`;
        canvas.style.height = `${canvasHeight}px`;

        parts.forEach((item, index) => {
            const p = item.profile;
            const node = document.createElement('img');
            node.alt = item.role;
            node.decoding = 'async';
            node.src = item.src || this._svgAfricanSvgToDataUrl(item.svg || '');
            node.draggable = false;
            node.dataset.svgAfricanPreviewRole = item.role;
            if (item.isGarmentPreview) {
                node.dataset.svgAfricanPreviewGarment = item.garmentSlot || 'lower';
            }
            node.style.left = `${offsetX + p.x * safeScale}px`;
            node.style.top = `${offsetY + p.y * safeScale}px`;
            node.style.width = `${p.width * safeScale}px`;
            node.style.height = `${p.height * safeScale}px`;
            node.style.transformOrigin = `${Math.max(0, Math.min(1, Number(p.pivotX ?? 0.5))) * 100}% ${Math.max(0, Math.min(1, Number(p.pivotY ?? (item.isGarmentPreview ? 0.08 : 0.5)))) * 100}%`;
            node.style.zIndex = String(index + 1);
            node.dataset.svgAfricanPreviewBaseZ = String(index + 1);
            node.style.setProperty('object-fit', 'fill', 'important');
            node.style.setProperty('object-position', '0 0', 'important');
            node.style.setProperty('forced-color-adjust', 'none', 'important');
            node.style.setProperty('color-scheme', 'only light', 'important');
            node.style.setProperty('mix-blend-mode', 'normal', 'important');
            node.style.setProperty('opacity', '1', 'important');
            node._svgAfricanPreviewBaseSrc = node.src;
            canvas.appendChild(node);
        });

        preview.replaceChildren(canvas);
        const resolvedView = String(manifest?.view || config.view || config.styling?.view || 'front');
        const previousMotionView = this._svgAfricanBuilderPreviewRenderContext?.view;
        this._svgAfricanBuilderPreviewRenderContext = {
            premiumAssets: asset ? premiumAssets : null,
            assetId: asset?.id || '',
            config,
            instanceId: previewInstanceId,
            palette: previewPalette,
            faceState: asset ? (premiumAssets?.getFaceState?.(config) || config.faceState || {}) : {},
            view: resolvedView
        };
        if (previousMotionView !== resolvedView) this._syncSvgAfricanBuilderMotionCheckControls();
        const motionState = this._svgAfricanBuilderMotionCheck;
        if (motionState?.playing) {
            if (motionState.view !== resolvedView) {
                const nextDefinition = this._resolveSvgAfricanBuilderMotionDefinition(motionState.action, resolvedView);
                if (nextDefinition) {
                    motionState.definition = nextDefinition;
                    motionState.view = resolvedView;
                    motionState.elapsed = 0;
                    motionState.progress = 0;
                    motionState.lastTimestamp = null;
                } else {
                    this._stopSvgAfricanBuilderMotionCheck({ reset: true, stateLabel: 'Unavailable' });
                }
            }
            if (motionState.playing) {
                if (motionState.rebuildFrame) cancelAnimationFrame(motionState.rebuildFrame);
                motionState.rebuildFrame = requestAnimationFrame(() => {
                    motionState.rebuildFrame = null;
                    if (this._svgAfricanBuilderMotionCheck === motionState && motionState.playing) {
                        void this._startSvgAfricanBuilderRigMotion(motionState);
                    }
                });
            }
        }
        const pannable = canvasWidth > viewWidth + 2 || canvasHeight > viewHeight + 2;
        preview.classList.toggle('is-pannable', pannable);
        preview.closest?.('.svg-african-builder-preview-pane')?.classList.toggle('is-pannable', pannable);
        const viewportRenderId = (this._svgAfricanBuilderViewportRenderId || 0) + 1;
        this._svgAfricanBuilderViewportRenderId = viewportRenderId;
        requestAnimationFrame(() => {
            if (this._svgAfricanBuilderViewportRenderId !== viewportRenderId || !canvas.isConnected) return;
            const maxLeft = Math.max(0, preview.scrollWidth - preview.clientWidth);
            const maxTop = Math.max(0, preview.scrollHeight - preview.clientHeight);
            let targetLeft = shouldCenter ? maxLeft / 2 : Math.min(previousScrollLeft, maxLeft);
            let targetTop = shouldCenter ? 0 : Math.min(previousScrollTop, maxTop);
            const restoredViewport = this._svgAfricanBuilderSingleViewportRestore;
            const focusBounds = this._getSvgAfricanBuilderPreviewFocusBounds(parts, focusRequest);
            if (focusRequest?.mode === 'home') {
                targetLeft = maxLeft / 2;
                targetTop = 0;
            } else if (focusBounds) {
                const focusLeft = offsetX + focusBounds.minX * safeScale;
                const focusTop = offsetY + focusBounds.minY * safeScale;
                const focusWidth = Math.max(1, (focusBounds.maxX - focusBounds.minX) * safeScale);
                const focusHeight = Math.max(1, (focusBounds.maxY - focusBounds.minY) * safeScale);
                const anchorY = Math.max(0.18, Math.min(0.82, Number(focusRequest?.anchorY ?? 0.45)));
                targetLeft = focusLeft + focusWidth / 2 - preview.clientWidth / 2;
                targetTop = focusTop + focusHeight / 2 - preview.clientHeight * anchorY;
            }
            if (restoredViewport) {
                targetLeft = restoredViewport.left;
                targetTop = restoredViewport.top;
                this._svgAfricanBuilderSingleViewportRestore = null;
            }
            preview.scrollLeft = Math.round(Math.max(0, Math.min(targetLeft, maxLeft)));
            preview.scrollTop = Math.round(Math.max(0, Math.min(targetTop, maxTop)));
            this._svgAfricanBuilderPreviewNeedsCenter = false;
            this._svgAfricanBuilderFocusRequest = null;
            this._svgAfricanBuilderUserPannedPreview = false;
        });
        const caption = document.getElementById('svg-african-builder-preview-caption');
        if (caption) {
            caption.textContent = comparisonMode === 'opening'
                ? `Opening draft - ${captionText}`
                : captionText;
        }
        this._renderSvgAfricanBuilderArtworkStatus(artworkStatus, parts, config, asset);
        this._renderSvgAfricanBuilderPalette(previewPalette);
        this._syncSvgAfricanBuilderControlDiagnostics(parts, config, artworkStatus, asset);
    }

    _renderSvgAfricanBuilderArtworkStatus(status = null, parts = [], config = null, asset = null) {
        const host = document.getElementById('svg-african-builder-artwork-status');
        const restoreButton = document.getElementById('btn-svg-african-restore-authored');
        if (!host) return;
        if (!status) {
            host.replaceChildren();
            if (restoreButton) restoreButton.hidden = true;
            return;
        }

        const sources = (Array.isArray(parts) ? parts : []).map(part => part?.source).filter(Boolean);
        const descriptor = window.SvgAfricanArtworkQuality?.describe?.(status, sources) || {
            kind: status.authoredActive ? 'authored' : (status.authoredAvailable ? 'fallback' : 'procedural'),
            label: status.authoredActive ? 'Authored SVG' : (status.authoredAvailable ? 'Procedural fallback' : 'Procedural SVG'),
            title: ''
        };
        const badge = document.createElement('span');
        badge.className = `svg-african-builder-artwork-badge is-${descriptor.kind}`;
        badge.textContent = descriptor.label;
        badge.title = descriptor.title || descriptor.detail || descriptor.label;
        badge.dataset.artworkQuality = descriptor.kind;
        const fragment = document.createDocumentFragment();
        fragment.appendChild(badge);
        const changedPaths = Array.isArray(descriptor.changedPaths)
            ? descriptor.changedPaths
            : (Array.isArray(status.changedPaths) ? status.changedPaths : []);
        const detailText = descriptor.kind === 'fallback' && changedPaths.length
            ? `Authored SVG cannot represent: ${changedPaths.slice(0, 5).map(path => this._formatSvgAfricanArtworkChangePath(path)).join(', ')}${changedPaths.length > 5 ? `, +${changedPaths.length - 5} more` : ''}.`
            : (descriptor.detail || '');
        if (detailText) {
            const detail = document.createElement('span');
            detail.className = 'svg-african-builder-artwork-detail';
            detail.textContent = detailText;
            fragment.appendChild(detail);
        }
        host.replaceChildren(fragment);
        if (restoreButton) {
            restoreButton.hidden = !(status.authoredAvailable === true && status.authoredActive !== true);
            restoreButton.dataset.authoredAssetId = status.authoredSourceAssetId
                || this._resolveSvgAfricanAuthoredAssetId(config)
                || asset?.id
                || '';
        }
    }

    _createSvgAfricanBuilderPreviewSvg(svgText = '') {
        try {
            const parser = new DOMParser();
            const parsed = parser.parseFromString(String(svgText || ''), 'image/svg+xml');
            if (parsed.querySelector('parsererror')) return null;
            const svg = parsed.documentElement;
            if (!svg || String(svg.tagName || '').toLowerCase() !== 'svg') return null;
            const node = document.importNode(svg, true);
            node.classList.add('svg-african-builder-inline-part');
            node.setAttribute('focusable', 'false');
            node.setAttribute('aria-hidden', 'true');
            return this._freezeSvgAfricanBuilderInlinePaints(node);
        } catch (_) {
            return null;
        }
    }

    _freezeSvgAfricanBuilderInlinePaints(svgNode) {
        if (!svgNode?.querySelectorAll) return svgNode;
        const nodes = [svgNode, ...svgNode.querySelectorAll('*')];
        svgNode.style.setProperty('color', '#111827', 'important');
        svgNode.style.setProperty('background', 'transparent', 'important');
        svgNode.style.setProperty('forced-color-adjust', 'none', 'important');
        nodes.forEach(node => {
            ['fill', 'stroke'].forEach(attr => {
                const value = String(node.getAttribute(attr) || '').trim();
                if (!value) return;
                node.style.setProperty(attr, value, 'important');
            });
        });
        return svgNode;
    }

    _resolveSvgAfricanBuilderSvgPaintVars(svgText = '', palette = null) {
        const svg = String(svgText || '');
        if (!svg) return svg;
        const vars = {
            skin: palette?.skin,
            'skin-light': palette?.skinLight,
            'skin-shade': palette?.skinShade,
            shade: palette?.shade,
            hair: palette?.hair,
            'hair-light': palette?.hairLight,
            ink: palette?.ink,
            lip: palette?.lip,
            blush: palette?.blush,
            cloth: palette?.blazer || palette?.cloth,
            'cloth-shade': palette?.blazerShade || palette?.clothShade,
            blouse: palette?.blouse,
            skirt: palette?.skirt,
            accent: palette?.accent,
            tie: palette?.tie,
            shoe: palette?.shoe,
            glass: palette?.glass,
            headwear: palette?.headwear,
            'headwear-shade': palette?.headwearShade
        };
        const resolved = svg.replace(/var\(--([a-z0-9-]+)\)/gi, (match, key) => {
            const value = this._normalizeSvgAfricanWearColor(vars[String(key || '').toLowerCase()]);
            return value || match;
        });
        return this._isolateSvgAfricanBuilderPreviewPaints(resolved);
    }

    _isolateSvgAfricanBuilderPreviewPaints(svgText = '') {
        const svg = String(svgText || '');
        if (!svg || !/<svg\b/i.test(svg) || /data-svg-african-builder-paint-isolation=/i.test(svg)) return svg;
        const isolated = svg.replace(
            /<svg\b/i,
            '<svg data-svg-african-builder-paint-isolation="v1"'
        );
        const paintGuard = '<style data-svg-african-builder-paint-guard="v1">:root,svg{color:#111827!important;color-scheme:only light!important;forced-color-adjust:none!important;background-color:transparent!important}*{forced-color-adjust:none!important}</style>';
        return isolated.replace(/(<svg\b[^>]*>)/i, `$1${paintGuard}`);
    }

    _svgAfricanSvgToDataUrl(svgText = '') {
        const svg = String(svgText || '');
        if (!svg) return '';
        return window.SvgCharacterUtils?.svgToDataUrl
            ? window.SvgCharacterUtils.svgToDataUrl(svg)
            : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    _renderSvgAfricanBuilderPalette(palette = null) {
        const host = document.getElementById('svg-african-builder-palette');
        if (!host) return;
        if (!palette) {
            host.replaceChildren();
            return;
        }
        const entries = [
            ['Skin', palette.skin],
            ['Hair', palette.hair],
            ['Pupil/Brow', palette.ink],
            ['Top', palette.blazer || palette.cloth],
            ['Tie', palette.tie],
            ['Bottom', palette.skirt],
            ['Headgear', palette.headwear],
            ['Glasses', palette.glass],
            ['Accent', palette.accent]
        ].filter(([, color]) => this._normalizeSvgAfricanWearColor(color));
        const fragment = document.createDocumentFragment();
        entries.forEach(([label, color]) => {
            const swatch = document.createElement('span');
            swatch.className = 'svg-african-builder-swatch';
            swatch.style.setProperty('--swatch-color', color);
            swatch.textContent = label;
            swatch.title = `${label}: ${color}`;
            fragment.appendChild(swatch);
        });
        host.replaceChildren(fragment);
    }

    _decodeSvgAfricanBuilderDataUrl(src = '') {
        const text = String(src || '');
        if (!text.startsWith('data:image/svg+xml')) return '';
        const comma = text.indexOf(',');
        if (comma < 0) return '';
        const payload = text.slice(comma + 1);
        try {
            return decodeURIComponent(payload);
        } catch (_) {
            try {
                return atob(payload);
            } catch (_) {
                return '';
            }
        }
    }

    _isSvgAfricanPremiumIntegrityEnabled() {
        const toggle = document.getElementById('svg-african-premium-integrity');
        if (toggle) return toggle.checked === true;
        return this._svgAfricanBuilderPremiumIntegrityEnabled !== false;
    }

    _formatSvgAfricanArtworkChangePath(path = '') {
        const raw = String(path || '').trim();
        const labels = {
            'identity.ageGroup': 'Age',
            'identity.body': 'Body type',
            'identity.eyes': 'Eye style',
            'identity.face': 'Face shape',
            'identity.facialHair': 'Facial hair',
            'identity.hair': 'Hair style',
            'identity.headType': 'Head type',
            'identity.height': 'Height',
            'identity.lips': 'Lip style',
            'identity.nose': 'Nose style',
            'identity.presentation': 'Presentation',
            'styling.bottomClothing': 'Bottom clothing',
            'styling.culturalStyle': 'Cultural style',
            'styling.customPieces': 'Custom clothing pieces',
            'styling.fabricDesign': 'Fabric design',
            'styling.footwear': 'Footwear',
            'styling.headwear': 'Headwear',
            'styling.neckTieDesign': 'Tie design',
            'styling.neckTieType': 'Tie type',
            'styling.outfit': 'Outfit',
            'styling.profession': 'Profession',
            'styling.skirtLength': 'Bottom length',
            'styling.sleeveLength': 'Sleeve length',
            'styling.topClothing': 'Top clothing',
            artworkPayload: 'Authored artwork payload',
            runtimeEnabled: 'Authored artwork availability',
            signature: 'Character styling'
        };
        if (labels[raw]) return labels[raw];
        if (raw.startsWith('styling.accessories.')) {
            const accessory = raw.slice('styling.accessories.'.length);
            return `Accessory: ${accessory.replace(/[-_]/g, ' ')}`;
        }
        const leaf = raw.split('.').filter(Boolean).pop() || raw;
        return leaf
            .replace(/[-_]/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/^./, char => char.toUpperCase());
    }

    _clearSvgAfricanPremiumControlLocks() {
        document.querySelectorAll('[data-svg-african-premium-locked="1"]').forEach(control => {
            control.disabled = control.dataset.svgAfricanPremiumPreviousDisabled === '1';
            const previousAria = control.dataset.svgAfricanPremiumPreviousAriaDisabled;
            if (previousAria) control.setAttribute('aria-disabled', previousAria);
            else control.removeAttribute('aria-disabled');
            const row = control.closest?.('label');
            if (row) {
                row.classList.remove('is-premium-locked');
                if (row.title === row.dataset.svgAfricanPremiumLockTitle) {
                    row.title = row.dataset.svgAfricanPremiumPreviousTitle || '';
                }
                delete row.dataset.svgAfricanPremiumPreviousTitle;
                delete row.dataset.svgAfricanPremiumLockTitle;
            }
            delete control.dataset.svgAfricanPremiumLocked;
            delete control.dataset.svgAfricanPremiumPreviousDisabled;
            delete control.dataset.svgAfricanPremiumPreviousAriaDisabled;
        });
    }

    _setSvgAfricanPremiumControlLocked(control, locked, title = '') {
        if (!control) return false;
        const row = control.closest?.('label');
        if (!locked) return false;
        if (control.dataset.svgAfricanPremiumLocked !== '1') {
            control.dataset.svgAfricanPremiumPreviousDisabled = control.disabled ? '1' : '0';
            control.dataset.svgAfricanPremiumPreviousAriaDisabled = control.getAttribute('aria-disabled') || '';
            if (row) row.dataset.svgAfricanPremiumPreviousTitle = row.title || '';
        }
        control.dataset.svgAfricanPremiumLocked = '1';
        control.disabled = true;
        control.setAttribute('aria-disabled', 'true');
        if (row) {
            row.classList.add('is-premium-locked');
            row.dataset.svgAfricanPremiumLockTitle = title;
            row.title = title;
        }
        return true;
    }

    _getSvgAfricanBuilderAuthoredCapability(config = null, asset = null) {
        const premiumAssets = window.SvgAfricanPremiumAssets;
        const catalog = window.SvgAfricanCharacterCatalog;
        const raw = config || this._getSvgAfricanCharacterFormConfig();
        const normalized = catalog?.normalizeConfig?.(raw) || raw || {};
        const resolvedAsset = asset
            || premiumAssets?.resolveAssetForConfig?.(normalized)
            || (normalized.assetCharacterId && premiumAssets?.get?.(normalized.assetCharacterId))
            || null;
        const authoredAssetId = this._resolveSvgAfricanAuthoredAssetId(normalized)
            || resolvedAsset?.configAssetId
            || resolvedAsset?.id
            || '';
        const pack = window.SvgAfricanAuthoredArtwork?.getPackInfo?.(authoredAssetId) || null;
        const controls = pack?.controls || null;
        return {
            config: normalized,
            asset: resolvedAsset,
            authoredAssetId,
            pack,
            controls,
            supportedAccessories: new Set(pack?.supportedAccessories || [])
        };
    }

    _syncSvgAfricanPremiumIntegrityControls(config = null, asset = null, artworkStatus = null) {
        this._clearSvgAfricanPremiumControlLocks();
        this._syncSvgAfricanClothingOverrideMode?.({ resetAuto: false, schedulePreview: false });

        const enabled = this._isSvgAfricanPremiumIntegrityEnabled()
            && this._svgAfricanBuilderPreserveBasicSvg !== true;
        const container = document.querySelector('.svg-african-premium-integrity');
        const summary = document.getElementById('svg-african-premium-integrity-summary');
        const collectionPreset = window.SvgAfricanCharacterCatalog?.getPreset((config || this._getSvgAfricanCharacterFormConfig()).preset)?.category;
        if (container) container.hidden = !!collectionPreset;
        if (collectionPreset) return { enabled: false, lockedCount: 0, capability: null };
        container?.classList.toggle('is-flexible', !enabled);
        container?.classList.toggle(
            'is-fallback',
            enabled && artworkStatus?.authoredAvailable === true && artworkStatus?.authoredActive !== true
        );
        if (!enabled) {
            if (summary) summary.textContent = 'Flexible editing; unsupported edits may use procedural artwork';
            return { enabled: false, lockedCount: 0, capability: null };
        }

        const capability = this._getSvgAfricanBuilderAuthoredCapability(config, asset);
        const controls = capability.controls;
        if (!controls) {
            if (summary) {
                summary.textContent = capability.pack?.loaded === false
                    ? 'Loading authored control map'
                    : 'Authored control map unavailable';
            }
            return { enabled: true, lockedCount: 0, capability };
        }

        const identityControls = new Set(controls.identity || []);
        const stylingControls = new Set(controls.styling || []);
        const adjustmentControls = new Set(controls.adjustments || []);
        const faceControls = new Set(controls.faceState || []);
        const lockTitle = 'Unavailable for this authored SVG view. Turn off Keep authored SVG quality to use the procedural renderer.';
        let lockedCount = 0;
        const lock = (control, shouldLock = true, title = lockTitle) => {
            if (shouldLock && this._setSvgAfricanPremiumControlLocked(control, true, title)) lockedCount += 1;
        };
        const lockId = (id, shouldLock = true, title = lockTitle) => lock(document.getElementById(id), shouldLock, title);

        [
            ['svg-african-age', 'ageGroup'],
            ['svg-african-skin', 'skinTone'],
            ['svg-african-head-type', 'headType'],
            ['svg-african-face', 'face'],
            ['svg-african-eyes', 'eyes'],
            ['svg-african-nose', 'nose'],
            ['svg-african-lips', 'lips'],
            ['svg-african-hair', 'hair'],
            ['svg-african-hair-color', 'hairColor'],
            ['svg-african-facial-hair', 'facialHair'],
            ['svg-african-body', 'body'],
            ['svg-african-height', 'height']
        ].forEach(([id, property]) => lockId(id, !identityControls.has(property)));

        [
            ['svg-african-profession', 'profession'],
            ['svg-african-outfit', 'outfit'],
            ['svg-african-top-clothing', 'topClothing'],
            ['svg-african-sleeve-length', 'sleeveLength'],
            ['svg-african-bottom-clothing', 'bottomClothing'],
            ['svg-african-skirt-length', 'skirtLength'],
            ['svg-african-clothing-palette', 'clothingPalette'],
            ['svg-african-fabric-design', 'fabricDesign'],
            ['svg-african-neck-tie-type', 'neckTieType'],
            ['svg-african-neck-tie-design', 'neckTieDesign'],
            ['svg-african-headwear', 'headwear'],
            ['svg-african-footwear', 'footwear'],
            ['svg-african-cultural-style', 'culturalStyle']
        ].forEach(([id, property]) => {
            const supported = stylingControls.has(property);
            const control = document.getElementById(id);
            if (supported && property === 'clothingPalette' && control) {
                control.disabled = false;
                control.removeAttribute('aria-disabled');
                control.closest?.('label')?.classList.remove('is-auto-driven');
            }
            lock(control, !supported);
        });

        lockId('svg-african-custom-pieces', true, 'Individual garment replacement leaves the authored SVG pack. Turn off Keep authored SVG quality to customize separate pieces.');
        const colorSupported = stylingControls.has('colorOverrides');
        lockId('svg-african-color-enable', !colorSupported);
        document.querySelectorAll('[data-svg-african-color]').forEach(control => lock(control, !colorSupported));

        const faceProperties = Object.keys(window.SvgAfricanPremiumAssets?.faceProperties || {});
        const facePresetSupported = faceProperties.length > 0
            && faceProperties.every(property => faceControls.has(property));
        lockId(
            'svg-african-face-preset',
            !facePresetSupported,
            'Facial expression presets are not visible in this authored view.'
        );

        const view = String(capability.pack?.view || capability.config?.view || 'front');
        const hiddenBackAdjustments = new Set([
            'browHeight', 'browLength', 'browRidge', 'cheekFullness', 'chinHeight', 'chinProjection',
            'eyeHeight', 'eyeSize', 'eyeSpacing', 'faceShapeStrength', 'faceWidth', 'jawDepth',
            'lipFullness', 'lipHeight', 'lipWidth', 'noseLength', 'noseWidth'
        ]);
        document.querySelectorAll('[data-svg-african-adjust]').forEach(control => {
            const property = control.dataset.svgAfricanAdjust;
            const hiddenInView = view === 'back' && hiddenBackAdjustments.has(property);
            lock(
                control,
                !adjustmentControls.has(property) || hiddenInView,
                hiddenInView
                    ? 'This facial adjustment is not visible from the authored back view.'
                    : lockTitle
            );
        });

        const accessoriesSupported = stylingControls.has('accessories');
        document.querySelectorAll('#svg-african-accessories input').forEach(control => {
            const supported = accessoriesSupported && capability.supportedAccessories.has(control.value);
            lock(
                control,
                !supported,
                control.checked
                    ? 'This accessory is baked into the authored artwork for this preset.'
                    : 'This accessory has no authored artwork in the current preset and view.'
            );
        });

        if (summary) {
            const viewLabel = String(capability.pack?.view || capability.config?.view || 'current').replace(/-/g, ' ');
            summary.textContent = `${viewLabel}: ${lockedCount} unavailable controls hidden from authored editing`;
        }
        return { enabled: true, lockedCount, capability };
    }

    _restoreSvgAfricanAuthoredDefaults(options = {}) {
        const premiumAssets = window.SvgAfricanPremiumAssets;
        const catalog = window.SvgAfricanCharacterCatalog;
        if (!premiumAssets?.getAssetRenderDefaults || !catalog?.normalizeConfig) return false;

        const rawConfig = this._getSvgAfricanCharacterFormConfig();
        const config = catalog.normalizeConfig(rawConfig) || rawConfig;
        const asset = premiumAssets.resolveAssetForConfig?.(config)
            || (config.assetCharacterId && premiumAssets.get?.(config.assetCharacterId));
        if (!asset) return false;
        const status = premiumAssets.getArtworkRenderStatus?.(asset, config) || null;
        if (options.onlyIfFallback && status?.authoredActive === true) return false;

        const capability = this._getSvgAfricanBuilderAuthoredCapability(config, asset);
        if (!capability.controls || capability.pack?.loaded === false) return false;
        const defaults = premiumAssets.getAssetRenderDefaults(capability.authoredAssetId) || {};
        const identity = { ...(defaults.identity || {}) };
        const styling = { ...(defaults.styling || {}) };
        const adjustments = { ...(defaults.premiumAdjustments || {}) };
        const identityControls = new Set(capability.controls.identity || []);
        const stylingControls = new Set(capability.controls.styling || []);
        const adjustmentControls = new Set(capability.controls.adjustments || []);
        const currentIdentity = config.identity || {};
        const currentStyling = config.styling || {};
        const currentAdjustments = premiumAssets.getAdjustments?.(config) || config.premiumAdjustments || {};

        identityControls.forEach(property => {
            if (currentIdentity[property] != null) identity[property] = currentIdentity[property];
        });
        stylingControls.forEach(property => {
            if (property === 'accessories') return;
            if (currentStyling[property] != null) styling[property] = currentStyling[property];
        });
        ['view', 'sideFacing', 'threeQuarterArtwork'].forEach(property => {
            if (currentStyling[property] != null) styling[property] = currentStyling[property];
        });
        adjustmentControls.forEach(property => {
            if (currentAdjustments[property] != null) adjustments[property] = currentAdjustments[property];
        });

        const baselineAccessories = Array.isArray(defaults.styling?.accessories)
            ? defaults.styling.accessories
            : [];
        if (stylingControls.has('accessories')) {
            const currentAccessories = Array.isArray(currentStyling.accessories) ? currentStyling.accessories : [];
            const baselineUnsupported = baselineAccessories.filter(item => !capability.supportedAccessories.has(item));
            const selectedSupported = currentAccessories.filter(item => capability.supportedAccessories.has(item));
            styling.accessories = [...new Set([...baselineUnsupported, ...selectedSupported])];
        } else {
            styling.accessories = [...baselineAccessories];
        }
        styling.customPieces = false;

        const faceProperties = Object.keys(premiumAssets.faceProperties || {});
        const faceControls = new Set(capability.controls.faceState || []);
        const facePresetSupported = faceProperties.length > 0
            && faceProperties.every(property => faceControls.has(property));
        const facePreset = facePresetSupported
            ? String(rawConfig._svgAfricanFacePreset || rawConfig.facePreset || '')
            : '';
        const restored = premiumAssets.normalizePremiumConfig?.(asset, {
            preset: rawConfig.preset || config.preset,
            identity,
            styling,
            premiumAdjustments: adjustments,
            facePreset,
            _svgAfricanFacePreset: facePreset,
            _svgAfricanFaceState: facePreset ? premiumAssets.getFacePresetState?.(facePreset) || {} : {}
        }) || {
            preset: rawConfig.preset || config.preset,
            identity,
            styling,
            premiumAdjustments: adjustments
        };

        this._svgAfricanBuilderPreserveBasicSvg = false;
        const toggle = document.getElementById('svg-african-premium-integrity');
        if (toggle) toggle.checked = true;
        this._svgAfricanBuilderPremiumIntegrityEnabled = true;
        const applied = this.applySvgAfricanBuilderConfig(restored, { preservePieceOverrides: false });
        if (applied && !options.silent) Utils.showToast('Authored SVG artwork restored.', 'success');
        return applied;
    }

    _setSvgAfricanBuilderDiagnosticControlState(ids = [], inactive = false, title = '') {
        ids.forEach(id => {
            const control = document.getElementById(id);
            const row = control?.closest?.('label');
            if (!row) return;
            if (inactive) {
                if (row.dataset.svgAfricanDiagnosticControl !== '1') {
                    row.dataset.svgAfricanDiagnosticPreviousTitle = row.title || '';
                }
                row.dataset.svgAfricanDiagnosticControl = '1';
                row.dataset.svgAfricanControlActive = '0';
                row.dataset.svgAfricanDiagnosticTitle = title || '';
                row.classList.add('is-render-inactive');
                if (title) row.title = title;
            } else if (row.dataset.svgAfricanDiagnosticControl === '1') {
                row.classList.remove('is-render-inactive');
                row.dataset.svgAfricanControlActive = '1';
                if (row.title === row.dataset.svgAfricanDiagnosticTitle) {
                    row.title = row.dataset.svgAfricanDiagnosticPreviousTitle || '';
                }
                delete row.dataset.svgAfricanDiagnosticControl;
                delete row.dataset.svgAfricanDiagnosticPreviousTitle;
                delete row.dataset.svgAfricanDiagnosticTitle;
            }
        });
    }

    _syncSvgAfricanBuilderControlDiagnostics(parts = [], config = null, artworkStatus = null, asset = null) {
        const host = document.getElementById('svg-african-builder-diagnostics');
        const managedRows = [...document.querySelectorAll('[data-svg-african-diagnostic-control="1"]')];
        managedRows.forEach(row => {
            row.classList.remove('is-render-inactive');
            row.dataset.svgAfricanControlActive = '1';
            if (row.title === row.dataset.svgAfricanDiagnosticTitle) {
                row.title = row.dataset.svgAfricanDiagnosticPreviousTitle || '';
            }
            delete row.dataset.svgAfricanDiagnosticControl;
            delete row.dataset.svgAfricanDiagnosticPreviousTitle;
            delete row.dataset.svgAfricanDiagnosticTitle;
        });
        const premiumState = this._syncSvgAfricanPremiumIntegrityControls(config, asset, artworkStatus);
        if (!host) return [];

        const svgText = parts.map(item => String(item?.svg || this._decodeSvgAfricanBuilderDataUrl(item?.src) || ''))
            .join('\n')
            .toLowerCase();
        if (!svgText) {
            if (premiumState.enabled) {
                const chip = document.createElement('span');
                chip.className = 'svg-african-builder-diagnostic-chip is-premium';
                chip.textContent = premiumState.capability?.controls
                    ? `Authored-safe: ${premiumState.lockedCount} controls unavailable`
                    : 'Authored controls loading';
                host.replaceChildren(chip);
            } else {
                host.replaceChildren();
            }
            return [];
        }

        const normalized = window.SvgAfricanCharacterCatalog?.normalizeConfig?.(config || this._getSvgAfricanCharacterFormConfig()) || config || {};
        const identity = normalized.identity || {};
        const styling = normalized.styling || {};
        const clean = value => String(value == null ? '' : value).trim().toLowerCase();
        const has = regex => regex.test(svgText);
        const accessories = new Set([
            ...(Array.isArray(normalized.accessories) ? normalized.accessories : []),
            ...(Array.isArray(styling.accessories) ? styling.accessories : [])
        ].map(clean));
        const hair = clean(normalized.hair || identity.hair);
        const facialHair = clean(normalized.facialHair || identity.facialHair || 'none');
        const headwear = clean(normalized.headwear || styling.headwear || 'none');
        const fabricDesign = clean(normalized.fabricDesign || styling.fabricDesign || 'auto');
        const tieState = this._getSvgAfricanTieVisibility(normalized, normalized);
        const fabricToken = fabricDesign.replace(/[^a-z0-9-]/g, '');
        const diagnostics = [
            {
                label: 'Hair',
                ids: ['svg-african-hair', 'svg-african-hair-color'],
                inactive: hair && hair !== 'bald' && !has(/hair|scalp|braid|cornrow|twist|loc|bun|afro|low-cut|fade/),
                title: 'This headwear or preset currently hides the selected hair artwork.'
            },
            {
                label: 'Facial hair',
                ids: ['svg-african-facial-hair'],
                inactive: facialHair !== 'none' && !has(/facial-hair|beard|mustache|moustache|goatee/),
                title: 'The selected facial hair is not rendered on this preset.'
            },
            {
                label: 'Headwear color',
                ids: ['svg-african-color-headwear'],
                inactive: headwear === 'none' || !has(/headwear|hijab|niqab|khimar|cap|hat|beret|gele|fila|turban|crown/),
                title: 'Headwear color is parked until visible headwear is selected.'
            },
            {
                label: 'Headwear',
                ids: ['svg-african-headwear'],
                inactive: headwear !== 'none' && !has(/headwear|hijab|niqab|khimar|cap|hat|beret|gele|fila|turban|crown/),
                title: 'The selected headwear is not rendered on this preset.'
            },
            {
                label: 'Tie',
                ids: ['svg-african-neck-tie-type', 'svg-african-neck-tie-design', 'svg-african-color-tie'],
                inactive: !tieState.visible,
                title: tieState.tieType === 'none'
                    ? 'Tie controls are parked while No Tie is selected.'
                    : 'Tie controls are parked because this outfit does not render a tie.'
            },
            {
                label: 'Glasses color',
                ids: ['svg-african-color-glasses'],
                inactive: !accessories.has('glasses') && !has(/glass|eyeglass|spectacle/),
                title: 'Glasses color is parked until glasses are visible.'
            },
            {
                label: 'Fabric design',
                ids: ['svg-african-fabric-design'],
                inactive: !!fabricToken && !['auto', 'plain', 'none'].includes(fabricToken) && !svgText.includes(fabricToken),
                title: 'The selected fabric design is not used by this current clothing combination.'
            },
            {
                label: 'Footwear',
                ids: ['svg-african-footwear', 'svg-african-color-shoes'],
                inactive: !has(/shoe|footwear|sneaker|loafer|boot|sandal/),
                title: 'Footwear controls are parked because no visible footwear was found.'
            }
        ];

        const inactive = diagnostics.filter(item => item.inactive);
        diagnostics.forEach(item => this._setSvgAfricanBuilderDiagnosticControlState(item.ids, item.inactive, item.title));

        const fragment = document.createDocumentFragment();
        const makeChip = (text, className = '') => {
            const chip = document.createElement('span');
            chip.className = `svg-african-builder-diagnostic-chip${className ? ` ${className}` : ''}`;
            chip.textContent = text;
            fragment.appendChild(chip);
        };
        if (inactive.length) {
            inactive.slice(0, 4).forEach(item => makeChip(`Parked: ${item.label}`, 'is-parked'));
            if (inactive.length > 4) makeChip(`+${inactive.length - 4} more parked`, 'is-parked');
        } else {
            makeChip('Selected controls active');
        }
        if (premiumState.enabled && premiumState.capability?.controls) {
            makeChip(`Authored-safe: ${premiumState.lockedCount} unavailable`, 'is-premium');
        } else if (premiumState.enabled) {
            makeChip('Authored control map unavailable', 'is-flexible');
        } else {
            makeChip('Flexible renderer editing', 'is-flexible');
        }
        host.replaceChildren(fragment);
        return inactive;
    }

    _getSvgAfricanWearColorFallbacks() {
        return {
            top: '#17345d',
            inner: '#fff4e6',
            tie: '#3b251a',
            bottom: '#182842',
            headwear: '#17345d',
            shoes: '#171717',
            glasses: '#26374f',
            accent: '#c68b2c'
        };
    }

    _normalizeSvgAfricanWearColor(value) {
        const text = String(value || '').trim().toLowerCase();
        return /^#[0-9a-f]{6}$/.test(text) ? text : null;
    }

    _setSvgAfricanJewelry(value) {
        const jewelry = window.SvgAfricanCharacterCatalog.normalizeJewelry(value);
        document.querySelectorAll('#svg-african-jewelry [data-svg-african-jewelry]').forEach(control => {
            const key = control.dataset.svgAfricanJewelry;
            control.value = String(jewelry[key]);
            const output = document.getElementById(`${control.id}-val`);
            if (output) output.value = `${Math.round(Number(control.value) * 100)}%`;
            if (!control.dataset.jewelryBound) {
                control.dataset.jewelryBound = '1';
                control.addEventListener('input', () => { if (output) output.value = `${Math.round(Number(control.value) * 100)}%`; });
            }
        });
    }

    _getSvgAfricanCharacterFormConfig() {
        const value = (id) => document.getElementById(id)?.value || '';
        const accessories = [...document.querySelectorAll('#svg-african-accessories input:checked')]
            .map(input => input.value);
        const colorOverrides = {};
        if (document.getElementById('svg-african-color-enable')?.checked) {
            document.querySelectorAll('[data-svg-african-color]').forEach(input => {
                const prop = input.dataset.svgAfricanColor;
                const color = this._normalizeSvgAfricanWearColor(input.value);
                if (prop && color) colorOverrides[prop] = color;
            });
        }
        const premiumAdjustments = {};
        const adjustmentCatalog = window.SvgAfricanPremiumAssets?.adjustProperties || {};
        document.querySelectorAll('[data-svg-african-adjust]').forEach(input => {
            const prop = input.dataset.svgAfricanAdjust;
            const parsed = Number(input.value);
            const spec = adjustmentCatalog[prop] || {};
            const fallback = Number.isFinite(Number(spec.defaultValue)) ? Number(spec.defaultValue) : 0;
            if (prop && Number.isFinite(parsed) && Math.abs(parsed - fallback) > 0.0001) {
                premiumAdjustments[prop] = parsed;
            }
        });
        const facePresetId = value('svg-african-face-preset');
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        const customPieces = this._isSvgAfricanCustomPiecesEnabled();
        const config = {
            preset: value('svg-african-preset') || 'ada-lecturer-premium',
            premiumAdjustments,
            _svgAfricanCustomPieces: customPieces,
            customPieces,
            identity: {
                presentation: value('svg-african-presentation') || undefined,
                ageGroup: value('svg-african-age') || undefined,
                skinTone: value('svg-african-skin') || undefined,
                headType: value('svg-african-head-type') || 'balanced',
                face: value('svg-african-face') || undefined,
                eyes: value('svg-african-eyes') || undefined,
                nose: value('svg-african-nose') || undefined,
                lips: value('svg-african-lips') || undefined,
                hair: value('svg-african-hair') || undefined,
                hairColor: value('svg-african-hair-color') || undefined,
                facialHair: value('svg-african-facial-hair') || 'none',
                body: value('svg-african-body') || undefined,
                height: value('svg-african-height') || undefined
            },
            styling: {
                profession: value('svg-african-profession') || 'none',
                outfit: value('svg-african-outfit') || undefined,
                topClothing: customPieces ? (value('svg-african-top-clothing') || 'auto') : 'auto',
                bottomClothing: customPieces ? (value('svg-african-bottom-clothing') || 'auto') : 'auto',
                ...(customPieces ? {
                    sleeveLength: value('svg-african-sleeve-length') || 'auto',
                    skirtLength: value('svg-african-skirt-length') || 'at-knee',
                    fabricDesign: value('svg-african-fabric-design') || 'auto'
                } : {}),
                clothingPalette: value('svg-african-clothing-palette') || 'auto',
                neckTieType: value('svg-african-neck-tie-type') || 'auto',
                neckTieDesign: value('svg-african-neck-tie-design') || 'auto',
                headwear: value('svg-african-headwear') || 'none',
                footwear: value('svg-african-footwear') || 'formal',
                accessories,
                jewelry: window.SvgAfricanCharacterCatalog.normalizeJewelry(Object.fromEntries(
                    [...document.querySelectorAll('#svg-african-jewelry [data-svg-african-jewelry]')].map(control => [control.dataset.svgAfricanJewelry, control.value])
                )),
                colorOverrides,
                culturalStyle: value('svg-african-cultural-style') || 'contemporary',
                view: value('svg-african-view') || 'front',
                headArtwork: value('svg-african-head-artwork') || 'original',
                threeQuarterArtwork: value('svg-african-three-quarter-artwork') || 'projected',
                rearTalkingProfile: value('svg-african-rear-talking-profile') || 'hidden',
                customPieces
            }
        };
        config.facePreset = facePresetId;
        config._svgAfricanFacePreset = facePresetId;
        if (facePresetId) {
            config._svgAfricanFaceState = PremiumAssets?.getFacePresetState?.(facePresetId) || {};
        }
        if (this._svgAfricanBuilderPreserveBasicSvg === true) {
            config.useBasicSvg = true;
            config.preferBasicSvg = true;
            config.disablePremiumPresetUpgrade = true;
        }
        return config;
    }

    async copySvgAfricanBuilderConfig() {
        const catalog = window.SvgAfricanCharacterCatalog;
        const raw = this._getSvgAfricanCharacterFormConfig();
        const config = catalog?.normalizeConfig?.(raw) || raw;
        const payload = {
            kind: 'svg-african-builder-config',
            version: 1,
            copiedAt: new Date().toISOString(),
            config
        };
        const text = JSON.stringify(payload, null, 2);
        try {
            if (window.navigator?.clipboard?.writeText) {
                await window.navigator.clipboard.writeText(text);
            } else {
                const textarea = document.createElement('textarea');
                textarea.value = text;
                textarea.setAttribute('readonly', '');
                textarea.style.position = 'fixed';
                textarea.style.left = '-9999px';
                textarea.style.top = '0';
                document.body.appendChild(textarea);
                textarea.select();
                const copied = document.execCommand?.('copy');
                textarea.remove();
                if (!copied) throw new Error('Clipboard copy was not accepted.');
            }
            Utils.showToast('SVG African builder config copied.', 'success');
            return true;
        } catch (error) {
            console.warn('[SVG African Builder] Could not copy config:', error);
            Utils.showToast('Could not copy SVG African builder config.', 'warning');
            return false;
        }
    }

    _parseSvgAfricanBuilderConfigText(text = '') {
        const cleanText = String(text || '')
            .trim()
            .replace(/^```(?:json|javascript|js)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();
        if (!cleanText) return null;
        const parseCandidate = (candidateText) => {
            try {
                return JSON.parse(candidateText);
            } catch (_) {
                return null;
            }
        };
        let parsed = parseCandidate(cleanText);
        if (!parsed) {
            const firstBrace = cleanText.indexOf('{');
            const lastBrace = cleanText.lastIndexOf('}');
            if (firstBrace >= 0 && lastBrace > firstBrace) {
                parsed = parseCandidate(cleanText.slice(firstBrace, lastBrace + 1));
            }
        }
        if (!parsed || typeof parsed !== 'object') return null;
        if (parsed.kind === 'svg-african-builder-config' && parsed.config && typeof parsed.config === 'object') {
            return parsed.config;
        }
        if (parsed.kind === 'svg-african-premium-adjustments' && parsed.adjustments && typeof parsed.adjustments === 'object') {
            return {
                assetCharacterId: parsed.assetId || undefined,
                identityId: parsed.identityId || undefined,
                identity: {
                    identityId: parsed.identityId || undefined
                },
                premiumAdjustments: parsed.adjustments,
                _svgAfricanAdjustments: parsed.adjustments
            };
        }
        if (parsed.config && typeof parsed.config === 'object') return parsed.config;
        if (parsed.identity || parsed.styling || parsed.preset || parsed.assetCharacterId || parsed.premiumAdjustments || parsed._svgAfricanAdjustments) {
            return parsed;
        }
        return null;
    }

    applySvgAfricanBuilderConfig(config, options = {}) {
        const catalog = window.SvgAfricanCharacterCatalog;
        if (!catalog?.normalizeConfig || !config || typeof config !== 'object') {
            Utils.showToast('SVG African config is not valid.', 'warning');
            return false;
        }
        if (!this._applySvgAfricanBuilderConfigToForm) {
            this.openSvgAfricanCharacterLibrary?.();
        }
        const applyToForm = this._applySvgAfricanBuilderConfigToForm;
        if (typeof applyToForm !== 'function') {
            Utils.showToast('SVG African builder is not ready yet.', 'warning');
            return false;
        }
        const normalized = catalog.normalizeConfig(config) || config;
        this._svgAfricanBuilderPreserveBasicSvg = !!(
            config.useBasicSvg
            || config.preferBasicSvg
            || config.disablePremiumPresetUpgrade
            || normalized.useBasicSvg
            || normalized.preferBasicSvg
            || normalized.disablePremiumPresetUpgrade
        );
        if (this._svgAfricanBuilderPreserveBasicSvg) {
            const integrityToggle = document.getElementById('svg-african-premium-integrity');
            if (integrityToggle) integrityToggle.checked = false;
            this._svgAfricanBuilderPremiumIntegrityEnabled = false;
        }
        const preservePieceOverrides = options.preservePieceOverrides != null
            ? options.preservePieceOverrides === true
            : [
                config.styling?.customPieces,
                config.customPieces,
                config._svgAfricanCustomPieces,
                normalized.styling?.customPieces,
                normalized.customPieces,
                normalized._svgAfricanCustomPieces
            ].some(value => value === true);
        applyToForm(normalized, { preservePieceOverrides });
        this._svgAfricanBuilderPreviewZoom = 1;
        const zoomReset = document.getElementById('svg-african-preview-zoom-reset');
        if (zoomReset) zoomReset.textContent = '100%';
        this._resetSvgAfricanBuilderPreviewViewport();
        this._scheduleSvgAfricanBuilderPreview();
        return true;
    }

    async pasteSvgAfricanBuilderConfig(textOverride = null) {
        let text = textOverride;
        if (text == null) {
            try {
                if (window.navigator?.clipboard?.readText) {
                    text = await window.navigator.clipboard.readText();
                }
            } catch (error) {
                console.warn('[SVG African Builder] Could not read clipboard:', error);
            }
        }
        if (!String(text || '').trim() && typeof window.prompt === 'function') {
            text = window.prompt('Paste SVG African builder config JSON') || '';
        }
        const config = this._parseSvgAfricanBuilderConfigText(text);
        if (!config) {
            Utils.showToast('No valid SVG African builder config found.', 'warning');
            return false;
        }
        const applied = this.applySvgAfricanBuilderConfig(config, { preservePieceOverrides: true });
        if (applied) Utils.showToast('SVG African builder config pasted.', 'success');
        return applied;
    }

    _getSvgAfricanSavedConfigStorageKey() {
        return 'animationstage.svgAfricanBuilder.savedConfigs.v1';
    }

    _getSvgAfricanSavedConfigStorage() {
        try {
            return window.localStorage || null;
        } catch (_) {
            return null;
        }
    }

    _readSvgAfricanSavedConfigs() {
        try {
            const storage = this._getSvgAfricanSavedConfigStorage();
            const raw = storage
                ? storage.getItem(this._getSvgAfricanSavedConfigStorageKey())
                : this._svgAfricanSavedConfigMemoryRaw;
            const parsed = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(parsed)) return [];
            return parsed
                .filter(entry => entry && typeof entry === 'object' && entry.id && entry.config)
                .map(entry => ({
                    ...entry,
                    scope: ['identity', 'styling'].includes(entry.scope) ? entry.scope : 'setup'
                }));
        } catch (error) {
            console.warn('[SVG African Builder] Could not read saved setups:', error);
            return [];
        }
    }

    _writeSvgAfricanSavedConfigs(entries = []) {
        try {
            const storage = this._getSvgAfricanSavedConfigStorage();
            const text = JSON.stringify(entries, null, 2);
            if (storage) {
                storage.setItem(this._getSvgAfricanSavedConfigStorageKey(), text);
            } else {
                this._svgAfricanSavedConfigMemoryRaw = text;
            }
            return true;
        } catch (error) {
            console.warn('[SVG African Builder] Could not write saved setups:', error);
            Utils.showToast('Could not save SVG African setup in this browser.', 'warning');
            return false;
        }
    }

    _getSvgAfricanBuilderConfigDefaultName(config = {}) {
        const preset = config.preset || config.assetCharacterId || 'svg-african';
        const presentation = config.presentation || config.identity?.presentation || '';
        const outfit = config.outfit || config.styling?.outfit || '';
        const parts = [
            this._getSvgAfricanSelectLabel?.('svg-african-preset', preset) || preset,
            presentation ? this._getSvgAfricanSelectLabel?.('svg-african-presentation', presentation) || presentation : '',
            outfit ? this._getSvgAfricanSelectLabel?.('svg-african-outfit', outfit) || outfit : ''
        ].filter(Boolean);
        return parts.join(' - ') || 'SVG African Setup';
    }

    _getSvgAfricanSavedScopeLabel(scope = 'setup') {
        if (scope === 'identity') return 'Identity';
        if (scope === 'styling') return 'Styling';
        return 'Setup';
    }

    _splitSvgAfricanSavedAdjustments(adjustments = {}) {
        const stylingKeys = new Set([
            'headwearWidth',
            'headwearHeight',
            'headwearLift',
            'headwearTilt',
            'topWearLength',
            'bottomWearLength'
        ]);
        const identity = {};
        const styling = {};
        Object.entries(adjustments || {}).forEach(([key, value]) => {
            (stylingKeys.has(key) ? styling : identity)[key] = value;
        });
        return { identity, styling };
    }

    _buildSvgAfricanSavedConfig(config = {}, scope = 'setup') {
        const normalizedScope = ['identity', 'styling'].includes(scope) ? scope : 'setup';
        const savedAdjustments = this._splitSvgAfricanSavedAdjustments(config.premiumAdjustments || {});
        if (normalizedScope === 'identity') {
            return {
                engine: config.engine,
                preset: config.preset,
                assetCharacterId: config.assetCharacterId,
                identityId: config.identityId || config.identity?.identityId,
                identity: JSON.parse(JSON.stringify(config.identity || {})),
                premiumAdjustments: JSON.parse(JSON.stringify(savedAdjustments.identity))
            };
        }
        if (normalizedScope === 'styling') {
            const styling = JSON.parse(JSON.stringify(config.styling || {}));
            // View and renderer choice describe the current stage pose, not an outfit.
            delete styling.view;
            delete styling.sideFacing;
            delete styling.threeQuarterArtwork;
            return {
                styling,
                premiumAdjustments: JSON.parse(JSON.stringify(savedAdjustments.styling))
            };
        }
        return JSON.parse(JSON.stringify(config));
    }

    _resolveSvgAfricanSavedEntryConfig(entry = null) {
        if (!entry?.config) return null;
        const catalog = window.SvgAfricanCharacterCatalog;
        const currentRaw = this._getSvgAfricanCharacterFormConfig?.() || {};
        const current = catalog?.normalizeConfig?.(currentRaw) || currentRaw;
        const scope = ['identity', 'styling'].includes(entry.scope) ? entry.scope : 'setup';
        if (scope === 'identity') {
            const savedIdentity = { ...(entry.config.identity || {}) };
            return catalog?.normalizeConfig?.({
                ...current,
                ...savedIdentity,
                engine: entry.config.engine || current.engine,
                preset: entry.config.preset || current.preset,
                assetCharacterId: entry.config.assetCharacterId || current.assetCharacterId,
                identityId: entry.config.identityId || savedIdentity.identityId,
                identity: {
                    ...(current.identity || {}),
                    ...savedIdentity
                },
                styling: { ...(current.styling || {}) },
                premiumAdjustments: {
                    ...(current.premiumAdjustments || {}),
                    ...(entry.config.premiumAdjustments || {})
                }
            }) || entry.config;
        }
        if (scope === 'styling') {
            const savedStyling = { ...(entry.config.styling || {}) };
            return catalog?.normalizeConfig?.({
                ...current,
                ...savedStyling,
                identityId: current.identityId || current.identity?.identityId,
                identity: { ...(current.identity || {}) },
                styling: {
                    ...(current.styling || {}),
                    ...savedStyling
                },
                premiumAdjustments: {
                    ...(current.premiumAdjustments || {}),
                    ...(entry.config.premiumAdjustments || {})
                }
            }) || entry.config;
        }
        return catalog?.normalizeConfig?.(entry.config) || entry.config;
    }

    _refreshSvgAfricanSavedConfigSelect(selectedId = '') {
        const select = document.getElementById('svg-african-saved-configs');
        if (!select) return [];
        const entries = this._readSvgAfricanSavedConfigs()
            .slice()
            .sort((a, b) => String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
        const current = selectedId || select.value || '';
        select.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = entries.length ? 'Saved items' : 'No saved items';
        select.appendChild(placeholder);
        entries.forEach(entry => {
            const option = document.createElement('option');
            option.value = entry.id;
            const preset = entry.config?.preset || entry.config?.assetCharacterId || '';
            const scopeLabel = this._getSvgAfricanSavedScopeLabel(entry.scope);
            option.textContent = preset
                ? `[${scopeLabel}] ${entry.name} (${preset})`
                : `[${scopeLabel}] ${entry.name}`;
            select.appendChild(option);
        });
        select.value = entries.some(entry => entry.id === current) ? current : '';
        const hasSelection = !!select.value;
        const loadButton = document.getElementById('btn-svg-african-load-config');
        const createButton = document.getElementById('btn-svg-african-create-saved-config');
        const applyButton = document.getElementById('btn-svg-african-apply-saved-config');
        const deleteButton = document.getElementById('btn-svg-african-delete-config');
        if (loadButton) loadButton.disabled = !hasSelection;
        if (createButton) createButton.disabled = !hasSelection;
        if (applyButton) applyButton.disabled = !hasSelection;
        if (deleteButton) deleteButton.disabled = !hasSelection;
        return entries;
    }

    saveSvgAfricanBuilderConfig(nameOverride = null, options = {}) {
        const catalog = window.SvgAfricanCharacterCatalog;
        const raw = this._getSvgAfricanCharacterFormConfig();
        const config = catalog?.normalizeConfig?.(raw) || raw;
        const scope = ['identity', 'styling'].includes(options.scope) ? options.scope : 'setup';
        const scopeLabel = this._getSvgAfricanSavedScopeLabel(scope);
        const defaultName = `${this._getSvgAfricanBuilderConfigDefaultName(config)} ${scopeLabel}`;
        let name = nameOverride;
        if (name == null && typeof window.prompt === 'function') {
            name = window.prompt(`Save SVG African ${scopeLabel.toLowerCase()} as`, defaultName);
        }
        name = String(name || '').trim();
        if (!name) return null;

        const entries = this._readSvgAfricanSavedConfigs();
        const now = new Date().toISOString();
        const existing = entries.find(entry =>
            String(entry.name || '').toLowerCase() === name.toLowerCase()
            && (entry.scope || 'setup') === scope
        );
        const entry = {
            id: existing?.id || `svgaf-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            name,
            version: 2,
            scope,
            createdAt: existing?.createdAt || now,
            updatedAt: now,
            config: this._buildSvgAfricanSavedConfig(config, scope)
        };
        const nextEntries = existing
            ? entries.map(item => item.id === existing.id ? entry : item)
            : [...entries, entry];
        if (!this._writeSvgAfricanSavedConfigs(nextEntries)) return null;
        this._refreshSvgAfricanSavedConfigSelect(entry.id);
        Utils.showToast(`SVG African ${scopeLabel.toLowerCase()} saved.`, 'success');
        return entry;
    }

    saveSvgAfricanBuilderIdentity(nameOverride = null) {
        return this.saveSvgAfricanBuilderConfig(nameOverride, { scope: 'identity' });
    }

    saveSvgAfricanBuilderStyling(nameOverride = null) {
        return this.saveSvgAfricanBuilderConfig(nameOverride, { scope: 'styling' });
    }

    loadSvgAfricanSavedConfig(id = null) {
        const select = document.getElementById('svg-african-saved-configs');
        const selectedId = id || select?.value || '';
        const entry = this._readSvgAfricanSavedConfigs().find(item => item.id === selectedId);
        if (!entry) {
            Utils.showToast('Choose a saved SVG African item first.', 'warning');
            this._refreshSvgAfricanSavedConfigSelect();
            return false;
        }
        const resolvedConfig = this._resolveSvgAfricanSavedEntryConfig(entry);
        const applied = this.applySvgAfricanBuilderConfig(resolvedConfig, { preservePieceOverrides: true });
        if (applied) {
            this._refreshSvgAfricanSavedConfigSelect(entry.id);
            Utils.showToast(`Loaded SVG African ${this._getSvgAfricanSavedScopeLabel(entry.scope).toLowerCase()}: ${entry.name}`, 'success');
        }
        return applied;
    }

    createSvgAfricanCharacterFromSavedConfig(id = null) {
        if (!this.jointSystem?.createSvgAfricanCharacter) {
            Utils.showToast('SVG African character builder is not available', 'warning');
            return false;
        }
        const select = document.getElementById('svg-african-saved-configs');
        const selectedId = id || select?.value || '';
        const entry = this._readSvgAfricanSavedConfigs().find(item => item.id === selectedId);
        if (!entry) {
            Utils.showToast('Choose a saved SVG African item first.', 'warning');
            this._refreshSvgAfricanSavedConfigSelect();
            return false;
        }
        const resolvedConfig = this._resolveSvgAfricanSavedEntryConfig(entry);
        this.applySvgAfricanBuilderConfig(resolvedConfig, { preservePieceOverrides: true });
        const armature = this.jointSystem.createSvgAfricanCharacter(
            resolvedConfig,
            this._getSvgAfricanBuilderCreateOptions()
        );
        if (!armature?.root) {
            Utils.showToast(`Could not create saved setup: ${entry.name}`, 'error');
            return false;
        }
        this.closeSvgAfricanCharacterLibrary({ force: true });
        this.jointSystem.openArmaturePanel?.(armature, { compactMode: true });
        Utils.showToast(`Created saved setup: ${entry.name}`, 'success');
        return true;
    }

    applySvgAfricanSavedConfigToSelected(id = null) {
        if (!this.jointSystem?.updateSvgAfricanCharacterAppearance) {
            Utils.showToast('SVG African character builder is not available', 'warning');
            return false;
        }
        const select = document.getElementById('svg-african-saved-configs');
        const selectedId = id || select?.value || '';
        const entry = this._readSvgAfricanSavedConfigs().find(item => item.id === selectedId);
        if (!entry) {
            Utils.showToast('Choose a saved SVG African item first.', 'warning');
            this._refreshSvgAfricanSavedConfigSelect();
            return false;
        }
        const armature = this.jointSystem._resolveSvgAfricanArmature?.();
        if (!armature?.root?._svgCharacter) {
            Utils.showToast('Select an SVG African character first.', 'warning');
            return false;
        }
        const resolvedConfig = this._resolveSvgAfricanSavedEntryConfig(entry);
        this.applySvgAfricanBuilderConfig(resolvedConfig, { preservePieceOverrides: true });
        const ok = this.jointSystem.updateSvgAfricanCharacterAppearance(armature, resolvedConfig);
        if (!ok) {
            Utils.showToast(`Could not apply saved setup: ${entry.name}`, 'error');
            return false;
        }
        this._refreshSvgAfricanSavedConfigSelect(entry.id);
        Utils.showToast(`Applied saved setup: ${entry.name}`, 'success');
        return true;
    }

    deleteSvgAfricanSavedConfig(id = null, options = {}) {
        const select = document.getElementById('svg-african-saved-configs');
        const selectedId = id || select?.value || '';
        const entries = this._readSvgAfricanSavedConfigs();
        const entry = entries.find(item => item.id === selectedId);
        if (!entry) {
            Utils.showToast('Choose a saved SVG African item first.', 'warning');
            this._refreshSvgAfricanSavedConfigSelect();
            return false;
        }
        if (options.skipConfirm !== true && typeof window.confirm === 'function' && !window.confirm(`Delete saved setup "${entry.name}"?`)) {
            return false;
        }
        if (!this._writeSvgAfricanSavedConfigs(entries.filter(item => item.id !== selectedId))) return false;
        this._refreshSvgAfricanSavedConfigSelect();
        Utils.showToast('SVG African saved item deleted.', 'info');
        return true;
    }

    addSvgAfricanCharacter() {
        if (!this.jointSystem?.createSvgAfricanCharacter) {
            Utils.showToast('SVG African character builder is not available', 'warning');
            return;
        }
        const armature = this.jointSystem.createSvgAfricanCharacter(
            this._getSvgAfricanCharacterFormConfig(),
            this._getSvgAfricanBuilderCreateOptions()
        );
        if (!armature?.root) {
            Utils.showToast('Could not create SVG African character', 'error');
            return;
        }
        this.closeSvgAfricanCharacterLibrary({ force: true });
        this.jointSystem.openArmaturePanel?.();
        Utils.showToast('SVG African character created.', 'success');
    }

    duplicateSelectedSvgAfricanCharacter() {
        if (!this.jointSystem?.createSvgAfricanCharacter) {
            Utils.showToast('SVG African character builder is not available', 'warning');
            return false;
        }
        const source = this.jointSystem._resolveSvgAfricanArmature?.();
        if (!source?.root?._svgCharacter || !source.root._svgCharacterConfig) {
            Utils.showToast('Select an SVG African character first.', 'warning');
            return false;
        }
        const sourceX = Number(source.root.x) || 0;
        const sourceY = Number(source.root.y) || 0;
        const sourceWidth = Math.max(1, Number(source.root.width) || 120);
        const config = JSON.parse(JSON.stringify(source.root._svgCharacterConfig));
        config.name = `${config.name || source.root.name || 'SVG African Character'} Copy`;
        const duplicate = this.jointSystem.createSvgAfricanCharacter(config);
        if (!duplicate?.root) {
            Utils.showToast('Could not duplicate SVG African character.', 'error');
            return false;
        }
        duplicate.root.x = sourceX + Math.max(36, sourceWidth * 0.28);
        duplicate.root.y = sourceY;
        this.jointSystem.objects?._resolvePins?.();
        this.jointSystem._captureArmatureStageBasePosition?.(duplicate);
        this.jointSystem.stage?.requestRender?.();
        this.closeSvgAfricanCharacterLibrary({ force: true });
        this.jointSystem.openArmaturePanel?.(duplicate, { compactMode: true });
        Utils.showToast('SVG African character duplicated.', 'success');
        return duplicate;
    }

    updateSelectedSvgAfricanCharacter() {
        if (!this.jointSystem?.updateSvgAfricanCharacterAppearance) {
            Utils.showToast('SVG African character builder is not available', 'warning');
            return false;
        }
        const editState = this._syncSvgAfricanBuilderEditContext();
        if (!editState?.isEdit || !editState.session?.armature?.root?._svgCharacter) {
            Utils.showToast('Right-click an SVG African character and choose Edit SVG African Character first.', 'warning');
            return false;
        }
        const armature = this.jointSystem._resolveSvgAfricanArmature?.(editState.session.armature)
            || editState.session.armature;
        if (!armature?.root?._svgCharacter) {
            Utils.showToast('Select an SVG African character first.', 'warning');
            return false;
        }
        const sessionRoot = editState?.session?.root;
        const sessionRootId = editState?.session?.rootId;
        const sameSessionRoot = !sessionRoot
            || sessionRoot === armature.root
            || (!!sessionRootId && sessionRootId === armature.root.id);
        if (editState?.isEdit && !sameSessionRoot) {
            Utils.showToast('The Stage selection changed. Reopen the Builder for the newly selected character.', 'warning');
            return false;
        }
        if (editState?.isEdit && !editState.structurallyCompatible) {
            Utils.showToast('This view needs a separate armature. Use Create Character instead.', 'info');
            return false;
        }
        if (editState?.isEdit && !editState.dirty) {
            Utils.showToast('No Builder changes to apply.', 'info');
            return false;
        }
        const ok = this.jointSystem.updateSvgAfricanCharacterAppearance(armature, this._getSvgAfricanCharacterFormConfig());
        if (!ok) {
            Utils.showToast('Could not update SVG African character.', 'error');
            return false;
        }
        this.closeSvgAfricanCharacterLibrary({ force: true });
        Utils.showToast('SVG African character updated.', 'success');
        return true;
    }

    addPresenterAvatar(presetId = 'female') {
        const catalog = window.SvgAvatarCatalog;
        if (!catalog?.createInstance) {
            Utils.showToast('Presenter avatars are not available yet', 'warning');
            return;
        }

        const instance = catalog.createInstance(presetId);
        const svg = instance?.svg || catalog.create?.(presetId);
        if (!svg) {
            Utils.showToast('Could not create presenter avatar', 'error');
            return;
        }

        const width = 220;
        const height = 280;
        const x = Math.round((this.stage.width - width) / 2);
        const y = Math.round((this.stage.height - height) / 2);
        const imageSrc = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const obj = new StageObject('image', {
            name: instance.label || 'Presenter Avatar',
            x,
            y,
            width,
            height,
            imageSrc,
            fill: 'none',
            stroke: 'none',
            strokeWidth: 0
        });
        obj.lockAspectRatio = true;
        const presenterProperties = instance.presenterProperties || catalog.presenterProperties || {};
        const presenterState = Object.fromEntries(Object.entries(presenterProperties).map(([key, config]) => [
            key,
            Number.isFinite(Number(config?.defaultValue)) ? Number(config.defaultValue) : 0
        ]));
        obj._svgAvatar = {
            kind: instance.kind || 'presenter-avatar',
            presetId: instance.presetId || presetId,
            instanceId: instance.instanceId || null,
            baseSvg: svg,
            state: presenterState,
            selectors: instance.selectors || {},
            roles: instance.roles || {},
            transparentBackground: instance.transparentBackground !== false,
            vectorSource: instance.vectorSource !== false,
            cropSafe: instance.cropSafe !== false,
            presenterProperties,
            animations: instance.animations || catalog.presenterTimelines || {}
        };

        this.objects.addObject(obj);
        this.objects.select([obj.id]);
        this.objects.setTool?.('select');
        this.stage.requestRender?.();
        this.closePresenterAvatarLibrary();
    }

    _selectedAnimationRigs() {
        const rigs = new Map();
        for (const obj of this.objects.getSelectedObjects()) {
            const context = this.objects._getSvgAfricanCharacterContext?.(obj) || this.objects._getUniversalCharacterContext?.(obj);
            if (context?.armature) rigs.set(context.armature.root.id, context.armature);
        }
        return [...rigs.values()];
    }

    async _openStageAnimateTool(tool) {
        const s = this.jointSystem, rigs = this._selectedAnimationRigs();
        if (this.animations.isPlaying || this.animations._exportingVideo || s._characterSequenceCompiling || s._choreographyCompiling) {
            Utils.showToast('Stop playback or wait for preparation to finish.', 'warning'); return;
        }
        if (tool === 'choreography') {
            const recipe = rigs.length > 1 ? s._newSceneChoreography(rigs.map(rig => rig.root.id)) : null;
            return s._openSceneChoreography(recipe);
        }
        if (rigs.length !== 1) { Utils.showToast('Select one SVG or Universal character.', 'warning'); return; }
        const rig = s._refreshDetectedArmatureReference(rigs[0]) || rigs[0];
        if (tool === 'pose') return s.openArmaturePanel(rig);
        if (tool === 'sequence') return s._openCharacterSequenceEditor(rig);
        if (tool === 'head') {
            if (!s._supportsIndependentSvgHeadTurn(rig)) { Utils.showToast('Head turns require a supported drawn SVG character.', 'warning'); return; }
            return s._openIndependentSvgHeadTurn(rig);
        }
        if (tool === 'body') return s._openBodyTurnEditor(rig);
        if (tool === 'debugger') {
            s._stopArmatureClipPreview();
            const movement = s._createArmaturePoseTransition(rig, 'current');
            return s._openArmatureMovementDebugger(rig, movement.key, { prepared: true, movementEntry: movement });
        }
    }

    _setupStageAnimate() {
        const toggle = document.getElementById('stage-animate'), menu = document.getElementById('stage-animate-menu');
        if (!toggle || !menu) return;
        document.body.append(menu);
        const close = (focus = false) => { menu.classList.add('hidden'); toggle.setAttribute('aria-expanded', 'false'); if (focus) toggle.focus(); };
        toggle.onclick = () => {
            if (!menu.classList.contains('hidden')) { close(); return; }
            const rigs = this._selectedAnimationRigs();
            for (const button of menu.querySelectorAll('button')) {
                button.disabled = button.dataset.animateTool !== 'choreography' && rigs.length !== 1;
                if (button.dataset.animateTool === 'head' && rigs.length === 1) button.disabled = !this.jointSystem._supportsIndependentSvgHeadTurn(rigs[0]);
                button.title = button.disabled ? 'Select a compatible character first' : button.textContent.trim();
            }
            menu.classList.remove('hidden'); toggle.setAttribute('aria-expanded', 'true');
            const rect = toggle.getBoundingClientRect();
            menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - menu.offsetWidth - 8))}px`;
            menu.style.top = `${Math.max(8, Math.min(rect.bottom + 4, innerHeight - menu.offsetHeight - 8))}px`;
            menu.querySelector('button:not(:disabled)')?.focus();
        };
        menu.onclick = event => {
            const button = event.target.closest('[data-animate-tool]'); if (!button || button.disabled) return;
            close(); this._openStageAnimateTool(button.dataset.animateTool).catch(error => Utils.showToast(error.message, 'error'));
        };
        menu.onkeydown = event => {
            if (event.key === 'Escape') { event.preventDefault(); close(true); }
            if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
                event.preventDefault(); const items = [...menu.querySelectorAll('button:not(:disabled)')], index = items.indexOf(document.activeElement);
                items[event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (index + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
            }
        };
        document.addEventListener('pointerdown', event => { if (!menu.contains(event.target) && !toggle.contains(event.target)) close(); });
        window.addEventListener('resize', () => close());
        eventBus.on('selection:changed', () => close());
    }

    _getStageCharacterResizeContext() {
        const selected = this.objects.getSelectedObjects();
        if (!selected.length || this.animations?.isPlaying || this.animations?._exportingVideo
            || this.jointSystem?._crossViewPreparing) return null;
        const context = this.objects._getSvgAfricanCharacterContext?.(selected[0])
            || this.objects._getUniversalCharacterContext?.(selected[0]);
        if (!context) return null;
        const targets = context.jointSystem._getArmatureUniformScaleTargets(context.armature);
        const ids = new Set(targets.map(obj => obj.id));
        if (targets.some(obj => obj.locked) || selected.some(obj => !ids.has(obj.id))) return null;
        return context;
    }

    _setupStageCharacterResize() {
        const toggle = document.getElementById('stage-character-resize');
        const popup = document.getElementById('character-resize-popover');
        const input = document.getElementById('character-resize-percent');
        if (!toggle || !popup || !input) return;
        document.body.appendChild(popup);
        let selectedRootId = null;
        const close = (focus = false) => {
            popup.classList.add('hidden');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.classList.remove('active');
            if (focus) toggle.focus();
        };
        const position = () => {
            if (popup.classList.contains('hidden')) return;
            const anchor = toggle.getBoundingClientRect();
            const bounds = popup.getBoundingClientRect();
            popup.style.left = `${Math.max(8, Math.min(anchor.left, window.innerWidth - bounds.width - 8))}px`;
            popup.style.top = `${Math.max(8, Math.min(anchor.bottom + 6, window.innerHeight - bounds.height - 8))}px`;
        };
        const update = () => {
            const context = this._getStageCharacterResizeContext();
            toggle.disabled = !context;
            toggle.title = context ? 'Resize selected character' : 'Select one unlocked SVG or Universal character to resize';
            const rootId = context?.armature.root.id || null;
            if (rootId !== selectedRootId || !context) { close(); input.value = '100'; }
            selectedRootId = rootId;
            document.getElementById('character-resize-name').textContent = context?.armature.root.name || '';
        };
        const apply = amount => {
            const context = this._getStageCharacterResizeContext();
            if (!context || !Number.isFinite(amount) || amount < .25 || amount > 4) { update(); return; }
            const { jointSystem } = context;
            let rig = context.armature;
            eventBus.emit('history:flush');
            jointSystem._stopArmatureMovement(rig);
            jointSystem._stopArmatureFacialMovement(rig);
            rig = jointSystem._refreshDetectedArmatureReference(rig) || rig;
            if (jointSystem._scaleArmatureUniform(rig, amount, { pushHistory: false })) {
                jointSystem._captureArmatureStageBasePosition(rig);
                if (jointSystem._currentArmature?.root?.id === rig.root.id) jointSystem._updateArmaturePanelPlayState(rig);
                eventBus.emit('history:push');
                input.value = '100';
            }
        };
        toggle.addEventListener('click', () => {
            const opening = popup.classList.contains('hidden');
            update();
            if (!opening || toggle.disabled) { close(); return; }
            popup.classList.remove('hidden');
            toggle.classList.add('active');
            toggle.setAttribute('aria-expanded', 'true');
            position(); input.focus(); input.select();
        });
        popup.querySelector('#character-resize-close').addEventListener('click', () => close(true));
        popup.querySelector('form').addEventListener('submit', event => {
            event.preventDefault();
            if (input.reportValidity()) apply(Number(input.value) / 100);
        });
        popup.querySelectorAll('[data-character-resize]').forEach(button => {
            button.addEventListener('click', () => apply(Number(button.dataset.characterResize)));
        });
        document.addEventListener('click', event => {
            if (!popup.contains(event.target) && !toggle.contains(event.target)) close();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && !popup.classList.contains('hidden')) { event.preventDefault(); close(true); }
        });
        window.addEventListener('resize', position);
        document.addEventListener('scroll', position, true);
        ['selection:changed', 'objects:updated', 'object:removed', 'history:push',
            'playback:started', 'playback:paused', 'playback:stopped'].forEach(event => eventBus.on(event, update));
        update();
    }

    _setupStageZOrderControls() {
        const upBtn = document.getElementById('stage-z-up');
        const downBtn = document.getElementById('stage-z-down');
        const orderInput = document.getElementById('stage-z-order');
        if (!upBtn || !downBtn || !orderInput) return;

        upBtn.addEventListener('click', () => {
            const selected = this.objects.getSelectedObjects();
            if (selected.length !== 1) return;
            this.objects.bringForward();
            this._updateStageZOrderControls();
        });

        downBtn.addEventListener('click', () => {
            const selected = this.objects.getSelectedObjects();
            if (selected.length !== 1) return;
            this.objects.sendBackward();
            this._updateStageZOrderControls();
        });

        const characterToggle = document.getElementById('stage-character-order-toggle');
        const characterPopover = document.getElementById('character-order-popover');
        const characterClose = document.getElementById('character-order-close');
        if (characterPopover && characterPopover.parentElement !== document.body) {
            document.body.appendChild(characterPopover);
        }
        const positionCharacterPopover = () => {
            if (!characterToggle || !characterPopover || characterPopover.classList.contains('hidden')) return;
            const anchor = characterToggle.getBoundingClientRect();
            const margin = 8;
            const width = Math.min(310, Math.max(180, window.innerWidth - margin * 2));
            characterPopover.style.width = `${width}px`;
            const left = Math.max(margin, Math.min(anchor.left, window.innerWidth - width - margin));
            characterPopover.style.left = `${Math.round(left)}px`;
            characterPopover.style.top = `${Math.round(anchor.bottom + 6)}px`;
            const popup = characterPopover.getBoundingClientRect();
            if (popup.bottom > window.innerHeight - margin) {
                characterPopover.style.top = `${Math.max(margin, Math.round(anchor.top - popup.height - 6))}px`;
            }
        };
        characterToggle?.addEventListener('click', event => {
            event.stopPropagation();
            const opening = characterPopover?.classList.contains('hidden');
            characterPopover?.classList.toggle('hidden', !opening);
            characterToggle.classList.toggle('active', !!opening);
            characterToggle.setAttribute('aria-expanded', opening ? 'true' : 'false');
            if (opening) {
                this._updateCharacterOrderPopover(true);
                positionCharacterPopover();
            }
        });
        characterClose?.addEventListener('click', event => {
            event.stopPropagation();
            characterPopover?.classList.add('hidden');
            characterToggle?.classList.remove('active');
            characterToggle?.setAttribute('aria-expanded', 'false');
        });
        characterPopover?.addEventListener('click', event => event.stopPropagation());
        document.addEventListener('click', event => {
            if (!characterPopover || characterPopover.classList.contains('hidden')) return;
            if (characterPopover.contains(event.target) || characterToggle?.contains(event.target)) return;
            characterPopover.classList.add('hidden');
            characterToggle?.classList.remove('active');
            characterToggle?.setAttribute('aria-expanded', 'false');
        });
        window.addEventListener('resize', positionCharacterPopover);
        document.addEventListener('scroll', positionCharacterPopover, true);
        characterPopover?.querySelectorAll('[data-character-order-action]').forEach(button => {
            button.addEventListener('click', () => {
                const action = button.dataset.characterOrderAction;
                if (action === 'front') this.objects.bringCharactersToFront?.();
                if (action === 'forward') this.objects.bringCharactersForward?.();
                if (action === 'backward') this.objects.sendCharactersBackward?.();
                if (action === 'back') this.objects.sendCharactersToBack?.();
                this._updateCharacterOrderPopover(true);
            });
        });

        const updateOrderControls = () => {
            this._updateStageZOrderControls();
            this._updateCharacterOrderPopover(true);
        };
        eventBus.on('selection:changed', updateOrderControls);
        eventBus.on('object:added', updateOrderControls);
        eventBus.on('object:removed', updateOrderControls);
        eventBus.on('history:push', updateOrderControls);
        eventBus.on('character-stack:changed', updateOrderControls);

        this._updateStageZOrderControls();
        this._updateCharacterOrderPopover(true);
    }

    _selectCharacterOrderRows(keys, bundles) {
        this._characterStackSelectionKeys = new Set(keys || []);
        const selectedRootIds = (bundles || this.objects.getCharacterStackBundles?.({ frontToBack: true }) || [])
            .filter(bundle => this._characterStackSelectionKeys.has(bundle.key))
            .map(bundle => bundle.root?.id)
            .filter(Boolean);
        this.objects.select(selectedRootIds);
    }

    _updateCharacterOrderPopover(syncFromStage = false) {
        const list = document.getElementById('character-order-list');
        const empty = document.getElementById('character-order-empty');
        const popover = document.getElementById('character-order-popover');
        if (!list || !empty || !popover) return;
        const bundles = this.objects.getCharacterStackBundles?.({ frontToBack: true }) || [];

        if (syncFromStage) {
            const model = this.objects._getCharacterStackModel?.(this.objects.objects);
            const selectedKeys = new Set();
            this.objects.getSelectedObjects().forEach(obj => {
                const bundle = obj?.id ? model?.byObjectId?.get(String(obj.id)) : null;
                if (bundle) selectedKeys.add(bundle.key);
            });
            this._characterStackSelectionKeys = selectedKeys;
        }
        const selectedKeys = this._characterStackSelectionKeys || new Set();
        const validKeys = new Set(bundles.map(bundle => bundle.key));
        this._characterStackSelectionKeys = new Set([...selectedKeys].filter(key => validKeys.has(key)));

        list.replaceChildren();
        empty.classList.toggle('hidden', bundles.length > 0);
        const actionButtons = popover.querySelectorAll('[data-character-order-action]');
        const reorderModel = this.objects._getCharacterStackModel?.(this.objects.objects);
        const hasNonCharacterObject = (this.objects.objects || []).some(obj =>
            obj?.id && !reorderModel?.byObjectId?.get(String(obj.id)));
        const canReorder = (bundles.length >= 2 || hasNonCharacterObject)
            && this._characterStackSelectionKeys.size > 0;
        actionButtons.forEach(button => {
            button.disabled = !canReorder;
        });

        bundles.forEach((bundle, index) => {
            const row = document.createElement('div');
            row.className = 'character-order-row';
            row.dataset.characterStackKey = bundle.key;
            row.draggable = true;
            row.setAttribute('role', 'option');
            row.setAttribute('aria-selected', this._characterStackSelectionKeys.has(bundle.key) ? 'true' : 'false');
            row.classList.toggle('selected', this._characterStackSelectionKeys.has(bundle.key));

            const icon = document.createElement('span');
            icon.className = 'character-order-row-icon';
            icon.innerHTML = '<i class="fas fa-user"></i>';
            const copy = document.createElement('span');
            copy.className = 'character-order-row-copy';
            const name = document.createElement('span');
            name.className = 'character-order-row-name';
            name.textContent = this.objects.getCharacterStackDisplayName?.(bundle, index) || `Character ${index + 1}`;
            const view = document.createElement('span');
            view.className = 'character-order-row-view';
            view.textContent = this.objects.getCharacterStackViewLabel?.(bundle) || 'Front';
            copy.append(name, view);
            const rank = document.createElement('span');
            rank.className = 'character-order-row-rank';
            rank.textContent = `#${index + 1}`;
            rank.title = index === 0 ? 'Frontmost character' : 'Character depth rank';
            row.append(icon, copy, rank);

            row.addEventListener('click', event => {
                const current = new Set(this._characterStackSelectionKeys || []);
                if (event.shiftKey && this._characterStackSelectionAnchor) {
                    const anchorIndex = bundles.findIndex(entry => entry.key === this._characterStackSelectionAnchor);
                    if (anchorIndex >= 0) {
                        const start = Math.min(anchorIndex, index);
                        const end = Math.max(anchorIndex, index);
                        if (!event.ctrlKey && !event.metaKey) current.clear();
                        bundles.slice(start, end + 1).forEach(entry => current.add(entry.key));
                    }
                } else if (event.ctrlKey || event.metaKey) {
                    if (current.has(bundle.key)) current.delete(bundle.key);
                    else current.add(bundle.key);
                    this._characterStackSelectionAnchor = bundle.key;
                } else {
                    current.clear();
                    current.add(bundle.key);
                    this._characterStackSelectionAnchor = bundle.key;
                }
                this._selectCharacterOrderRows(current, bundles);
            });

            row.addEventListener('dragstart', event => {
                if (!this._characterStackSelectionKeys?.has(bundle.key)) {
                    this._characterStackSelectionKeys = new Set([bundle.key]);
                    list.querySelectorAll('.character-order-row').forEach(entry => {
                        const selected = entry.dataset.characterStackKey === bundle.key;
                        entry.classList.toggle('selected', selected);
                        entry.setAttribute('aria-selected', selected ? 'true' : 'false');
                    });
                }
                this._characterStackDraggedKeys = [...(this._characterStackSelectionKeys || new Set([bundle.key]))];
                this._characterStackDraggedRootIds = bundles
                    .filter(entry => this._characterStackDraggedKeys.includes(entry.key))
                    .map(entry => entry.root?.id)
                    .filter(Boolean);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', JSON.stringify(this._characterStackDraggedKeys));
            });
            row.addEventListener('dragover', event => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                list.querySelectorAll('.drag-over').forEach(entry => entry.classList.remove('drag-over'));
                row.classList.add('drag-over');
            });
            row.addEventListener('dragleave', () => row.classList.remove('drag-over'));
            row.addEventListener('drop', event => {
                event.preventDefault();
                list.querySelectorAll('.drag-over').forEach(entry => entry.classList.remove('drag-over'));
                let movingKeys = this._characterStackDraggedKeys || [];
                try {
                    const transferred = JSON.parse(event.dataTransfer.getData('text/plain') || '[]');
                    if (Array.isArray(transferred) && transferred.length) movingKeys = transferred;
                } catch (_) {}
                const moving = new Set(movingKeys);
                if (moving.has(bundle.key)) return;
                const frontToBack = bundles.map(entry => entry.key).filter(key => !moving.has(key));
                let targetIndex = frontToBack.indexOf(bundle.key);
                if (targetIndex < 0) targetIndex = 0;
                const bounds = row.getBoundingClientRect();
                if (event.clientY > bounds.top + bounds.height / 2) targetIndex += 1;
                frontToBack.splice(targetIndex, 0, ...bundles.map(entry => entry.key).filter(key => moving.has(key)));
                this.objects.setCharacterStackOrder?.(frontToBack, { message: 'Character order updated' });
                if (this._characterStackDraggedRootIds?.length) {
                    this.objects.select(this._characterStackDraggedRootIds);
                }
                this._characterStackDraggedKeys = null;
                this._characterStackDraggedRootIds = null;
            });
            row.addEventListener('dragend', () => {
                this._characterStackDraggedKeys = null;
                this._characterStackDraggedRootIds = null;
                list.querySelectorAll('.drag-over').forEach(entry => entry.classList.remove('drag-over'));
            });
            list.appendChild(row);
        });
    }

    _updateStageZOrderControls() {
        const upBtn = document.getElementById('stage-z-up');
        const downBtn = document.getElementById('stage-z-down');
        const orderInput = document.getElementById('stage-z-order');
        if (!upBtn || !downBtn || !orderInput) return;

        const selected = this.objects.getSelectedObjects();
        if (selected.length !== 1) {
            orderInput.value = '--';
            orderInput.disabled = true;
            upBtn.disabled = true;
            downBtn.disabled = true;
            return;
        }

        const obj = selected[0];
        const sourceList = this.objects.objects || [];
        const drawList = typeof this.objects._orderObjectsByAnimatedLayer === 'function'
            ? this.objects._orderObjectsByAnimatedLayer(
                sourceList,
                typeof this.objects._getLayerOrderAnimObjectIds === 'function'
                    ? this.objects._getLayerOrderAnimObjectIds()
                    : new Set()
            )
            : sourceList;
        const characterBundle = this.objects.getCharacterStackBundleForObject?.(obj) || null;
        const bundleIds = characterBundle
            ? new Set(characterBundle.members.map(member => member.id))
            : null;
        const scopedDrawList = bundleIds
            ? drawList.filter(member => bundleIds.has(member.id))
            : drawList;
        const total = scopedDrawList.length;
        const index = scopedDrawList.indexOf(obj);
        if (index < 0 || total <= 0) {
            orderInput.value = '--';
            orderInput.disabled = true;
            upBtn.disabled = true;
            downBtn.disabled = true;
            return;
        }

        const rank = total - index;
        orderInput.disabled = false;
        orderInput.value = String(rank);
        orderInput.title = characterBundle
            ? `Part order ${rank} of ${total} inside this character. 1 is frontmost.`
            : `Draw order ${rank} of ${total}. 1 is frontmost.`;
        upBtn.title = characterBundle ? 'Move selected part forward inside this character' : 'Move selected object forward';
        downBtn.title = characterBundle ? 'Move selected part backward inside this character' : 'Move selected object backward';
        upBtn.disabled = index >= total - 1;
        downBtn.disabled = index <= 0;
    }

    setupFeedbackReporter() {
        const feedbackBtn = document.getElementById('btn-stage-feedback');
        const feedbackModal = document.getElementById('stage-feedback-modal');
        const closeBtn = feedbackModal?.querySelector('.modal-close');
        const cancelBtn = document.getElementById('btn-stage-feedback-cancel');
        const submitBtn = document.getElementById('btn-stage-feedback-submit');
        const kindEl = document.getElementById('stage-feedback-kind');
        const subjectEl = document.getElementById('stage-feedback-subject');
        const messageEl = document.getElementById('stage-feedback-message');
        const statusEl = document.getElementById('stage-feedback-status');
        const userNameEl = document.getElementById('stage-feedback-user-name');
        const userEmailEl = document.getElementById('stage-feedback-user-email');
        const userSummaryEl = document.getElementById('stage-feedback-user-summary');
        const stageUser = window.__STAGE_USER || {};

        if (userNameEl) {
            userNameEl.textContent = stageUser.name || 'Signed-in user';
        }
        if (userEmailEl) {
            userEmailEl.textContent = stageUser.email || 'No email available';
        }
        if (userSummaryEl && stageUser.email) {
            userSummaryEl.textContent = 'This report will be attached directly to the account currently signed into the stage.';
        }

        const resetStatus = () => {
            if (!statusEl) return;
            statusEl.textContent = '';
            statusEl.className = 'stage-feedback-status hidden';
        };

        const closeModal = () => {
            feedbackModal?.classList.add('hidden');
            resetStatus();
        };

        feedbackBtn?.addEventListener('click', () => {
            feedbackModal?.classList.remove('hidden');
            resetStatus();
            if (messageEl && !messageEl.value.trim()) {
                messageEl.focus();
            }
        });

        closeBtn?.addEventListener('click', closeModal);
        cancelBtn?.addEventListener('click', closeModal);
        feedbackModal?.addEventListener('click', (event) => {
            if (event.target === feedbackModal) {
                closeModal();
            }
        });

        submitBtn?.addEventListener('click', async () => {
            const message = String(messageEl?.value || '').trim();
            if (!message) {
                if (statusEl) {
                    statusEl.textContent = 'Please describe the issue or feedback before sending.';
                    statusEl.className = 'stage-feedback-status is-error';
                }
                messageEl?.focus();
                return;
            }

            const projectName = document.getElementById('project-name-display')?.textContent?.trim() || 'Untitled Animation';
            const payload = new FormData();
            payload.append('csrf_token', String(stageUser.csrf_token || ''));
            payload.append('source', 'stage');
            payload.append('kind', String(kindEl?.value || 'feedback'));
            payload.append('subject', String(subjectEl?.value || '').trim());
            payload.append('message', message);
            payload.append('project_name', projectName);
            payload.append('page_url', window.location.href);

            submitBtn.disabled = true;
            if (statusEl) {
                statusEl.textContent = 'Sending report...';
                statusEl.className = 'stage-feedback-status';
            }

            try {
                const response = await fetch('api/feedback/submit.php', {
                    method: 'POST',
                    body: payload,
                    headers: {
                        'X-Requested-With': 'XMLHttpRequest'
                    }
                });

                const result = await response.json();
                if (!response.ok || !result.ok) {
                    throw new Error(result.error || 'Could not send report');
                }

                if (statusEl) {
                    statusEl.textContent = 'Report sent. Your logged-in account details were attached automatically.';
                    statusEl.className = 'stage-feedback-status is-success';
                }
                if (subjectEl) subjectEl.value = '';
                if (messageEl) messageEl.value = '';
                Utils.showToast('Feedback sent', 'success');

                window.setTimeout(() => {
                    closeModal();
                }, 900);
            } catch (error) {
                if (statusEl) {
                    statusEl.textContent = error.message || 'Could not send report';
                    statusEl.className = 'stage-feedback-status is-error';
                }
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    _setupStagePlaybackControls() {
        const playBtn = document.getElementById('stage-tb-play');
        document.getElementById('stage-tb-start')?.addEventListener('click', () => {
            if (this.timeline?.jumpToStart) {
                this.timeline.jumpToStart();
            } else {
                this.animations.seekToStart?.();
                this.stage.requestRender();
            }
            playBtn?.classList.remove('playing');
            const icon = playBtn?.querySelector('i');
            if (icon) { icon.className = 'fas fa-play'; }
        });
        document.getElementById('stage-tb-end')?.addEventListener('click', () => {
            if (this.timeline?.jumpToEnd) {
                this.timeline.jumpToEnd();
            } else {
                this.animations.seekToEnd?.();
                this.stage.requestRender();
            }
        });
        document.getElementById('stage-tb-prev')?.addEventListener('click', () => {
            this.timeline?.jumpToAdjacentAnimation(-1);
        });
        document.getElementById('stage-tb-next')?.addEventListener('click', () => {
            this.timeline?.jumpToAdjacentAnimation(1);
        });
        playBtn?.addEventListener('click', () => {
            this.animations.playAll();
        });

        // Sync play button icon with playback state
        eventBus.on('playback:started', () => {
            playBtn?.classList.add('playing');
            const icon = playBtn?.querySelector('i');
            if (icon) { icon.className = 'fas fa-pause'; }
        });
        eventBus.on('playback:paused', () => {
            playBtn?.classList.remove('playing');
            const icon = playBtn?.querySelector('i');
            if (icon) { icon.className = 'fas fa-play'; }
        });
        eventBus.on('playback:stopped', () => {
            playBtn?.classList.remove('playing');
            const icon = playBtn?.querySelector('i');
            if (icon) { icon.className = 'fas fa-play'; }
        });
    }

    // === Preview ===

    setupPreview() {
        document.getElementById('btn-preview')?.addEventListener('click', () => {
            this.openPreviewWindow();
        });

        // Preview dropdown: "Preview current scene" mirrors the main button,
        // "Preview all scenes" runs the multi-scene preview. The caret toggle
        // is shown only when there are 2+ scenes (refreshed via _refreshPreviewMenu).
        document.getElementById('btn-preview-current-scene')?.addEventListener('click', () => {
            this.openPreviewWindow();
        });
        document.getElementById('btn-preview-all-scenes-menu')?.addEventListener('click', () => {
            if (this.exporter && typeof this.exporter.previewAllScenes === 'function') {
                this.exporter.previewAllScenes();
            }
        });
        document.getElementById('btn-preview-export-check')?.addEventListener('click', () => {
            if (this.previewExportCompat && typeof this.previewExportCompat.openReport === 'function') {
                this.previewExportCompat.openReport();
            } else {
                Utils.showToast('Preview/export checker is not available', 'warning');
            }
        });

        this._refreshPreviewMenu();
        // Re-evaluate caret visibility when scenes change.
        if (typeof eventBus !== 'undefined') {
            eventBus.on?.('scenes:updated', () => this._refreshPreviewMenu());
            eventBus.on?.('scene:added', () => this._refreshPreviewMenu());
            eventBus.on?.('scene:removed', () => this._refreshPreviewMenu());
            eventBus.on?.('scene:changed', () => this._refreshPreviewMenu());
        }
    }

    _refreshPreviewMenu() {
        const caret = document.getElementById('btn-preview-caret');
        if (!caret) return;
        const hasMultipleScenes = Array.isArray(this.scenes) && this.scenes.length > 1;
        caret.classList.toggle('hidden', !hasMultipleScenes);
    }
    /**
     * Open a new browser window that renders the animation as it would appear
     * when exported — a standalone, self-contained HTML5 canvas playback.
     * Supports interaction (click/hover triggers) if any animations use them.
     */
    openPreviewWindow() {
        const animatedObjs = this.objects.objects.filter(o => o.animations && o.animations.length > 0);
        if (animatedObjs.length === 0 && this.objects.objects.length === 0) {
            Utils.showToast('Nothing to preview — add objects and animations first', 'warning');
            return;
        }

        // Note: animation `generated` properties are refreshed from current object pose
        // inside Exporter.exportHTML5() so the preview reflects manual repositioning done
        // after an animation was first applied.

        if (this.exporter.exportHTML5({
            includeControls: true,
            autoplay: true,
            loop: false,
            responsive: true,
            openInWindow: true,
            showJointContours: false,
            forceCurrentScene: true,
            documentTitle: `Preview — ${this.exporter.projectName || 'Animation Stage'}`
        })) {
            return;
        }

        const w = this.stage.width;
        const h = this.stage.height;
        const bgColor = this.stage.bgColor || '#1e1e2e';
        const { objectCode, animCode, gifDecoderCode } = this.exporter.createCurrentHTML5PlaybackBundle({
            includeGifDecoder: true
        });

        // Serialize stage background config for preview
        const isTransparent = this.stage.bgType === 'transparent';
        const bgConfig = isTransparent
            ? { bgType: 'transparent', bgColor: 'transparent', bgOpacity: 0 }
            : {
                bgType: this.stage.bgType || 'solid',
                bgColor: this.stage.bgColor || '#1a1a2e',
                bgOpacity: this.stage.bgOpacity ?? 1,
                bgGradStart: this.stage.bgGradStart || '#1a1a2e',
                bgGradEnd: this.stage.bgGradEnd || '#4a90d9',
                bgGradAngle: this.stage.bgGradAngle ?? 180,
                bgPatternType: this.stage.bgPatternType || 'stripes',
                bgPatternColor: this.stage.bgPatternColor || '#ffffff',
                bgPatternScale: this.stage.bgPatternScale ?? 1,
                bgImageSrc: this.stage.bgImageSrc || null,
                bgImageFit: this.stage.bgImageFit || 'cover'
            };
        const bgConfigCode = `const bgConfig = ${JSON.stringify(bgConfig)};`;
        const characterStackRuntimeCode = globalThis.CharacterStackPolicy?.getRuntimeSource?.('previewCharacterStackPolicy') || '';

        // Build the self-contained HTML for the preview window
        const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Preview — ${(typeof Utils !== 'undefined' && Utils.escapeHtml ? Utils.escapeHtml(this.exporter.projectName || 'Animation Stage') : 'Animation Stage')}</title>
<style>
* { margin:0; padding:0; box-sizing:border-box; }
body {
    background: #0f0f1a;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    height: 100vh; width: 100vw;
    overflow: hidden;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    color: #ddd;
}
.canvas-wrap {
    flex: 1; display: flex; align-items: center; justify-content: center;
    width: 100%; padding: 16px;
    min-height: 0;
}
canvas {
    background: ${isTransparent ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 16px 16px' : '#0a0a14'};
    box-shadow: 0 4px 32px rgba(0,0,0,0.6);
    border: 1px solid #2a2a45;
    border-radius: 6px;
    max-width: 100%; max-height: 100%;
    object-fit: contain;
}
.controls {
    padding: 10px 16px;
    display: flex; gap: 8px; align-items: center;
    background: #161625;
    border-top: 1px solid #2a2a45;
    width: 100%;
    justify-content: center;
    flex-shrink: 0;
}
.controls button {
    padding: 7px 18px; background: #6366f1; color: #fff;
    border: none; border-radius: 6px; cursor: pointer;
    font-size: 13px; transition: background 0.2s;
    font-family: inherit;
}
.controls button:hover { background: #5558e6; }
.controls button.active { background: #22c55e; }
.info {
    font-size: 11px; color: #6a6a82;
    margin-left: 12px;
}
</style>
</head>
<body>
<div class="canvas-wrap">
    <canvas id="stage" width="${w}" height="${h}"></canvas>
</div>
<div class="controls">
    <button id="btnPlay" onclick="play()">&#9654; Play</button>
    <button id="btnPause" onclick="pause()">&#10074;&#10074; Pause</button>
    <button id="btnReset" onclick="reset()">&#8634; Reset</button>
    <button id="btnLoop" onclick="toggleLoop()">&#128257; Loop</button>
    <span class="info" id="info">Click Play to start</span>
</div>
<script>
${characterStackRuntimeCode}
const canvas = document.getElementById('stage');
const ctx = canvas.getContext('2d');
const infoEl = document.getElementById('info');

${bgConfigCode}

${objectCode}

${animCode}

${gifDecoderCode}

let startTime = null;
let isPlaying = false;
let looping = false;
let animationId = null;
let totalDuration = 0;
const triggeredAnims = {};
let bgImageEl = null;

// Preload background image if type is 'image'
if (bgConfig.bgType === 'image' && bgConfig.bgImageSrc) {
    bgImageEl = new Image();
    bgImageEl.src = bgConfig.bgImageSrc;
}

// Draw the stage background (matches main app _drawStageBackground)
function drawBackground() {
    const w = canvas.width, h = canvas.height;
    if (bgConfig.bgType === 'transparent') return; // true transparency — skip
    ctx.save();
    ctx.globalAlpha = bgConfig.bgOpacity;
    switch (bgConfig.bgType) {
        case 'linear-gradient': {
            const rad = (bgConfig.bgGradAngle || 0) * Math.PI / 180;
            const r = Math.max(w, h) / 2;
            const cx = w / 2, cy = h / 2;
            const g = ctx.createLinearGradient(cx - r * Math.cos(rad), cy - r * Math.sin(rad),
                cx + r * Math.cos(rad), cy + r * Math.sin(rad));
            g.addColorStop(0, bgConfig.bgGradStart);
            g.addColorStop(1, bgConfig.bgGradEnd);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
        }
        case 'radial-gradient': {
            const r = Math.max(w, h) / 2;
            const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, r);
            g.addColorStop(0, bgConfig.bgGradStart);
            g.addColorStop(1, bgConfig.bgGradEnd);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, w, h);
            break;
        }
        case 'pattern': {
            ctx.fillStyle = bgConfig.bgColor;
            ctx.fillRect(0, 0, w, h);
            const sz = Math.max(8, 16 * (bgConfig.bgPatternScale || 1));
            const pc = document.createElement('canvas');
            pc.width = sz; pc.height = sz;
            const pctx = pc.getContext('2d');
            pctx.fillStyle = bgConfig.bgColor; pctx.fillRect(0, 0, sz, sz);
            pctx.strokeStyle = bgConfig.bgPatternColor; pctx.fillStyle = bgConfig.bgPatternColor;
            pctx.lineWidth = Math.max(1, sz * 0.08);
            switch (bgConfig.bgPatternType) {
                case 'stripes': pctx.beginPath(); pctx.moveTo(0, sz); pctx.lineTo(sz, 0); pctx.moveTo(-sz*0.5, sz*0.5); pctx.lineTo(sz*0.5, -sz*0.5); pctx.moveTo(sz*0.5, sz*1.5); pctx.lineTo(sz*1.5, sz*0.5); pctx.stroke(); break;
                case 'dots': pctx.beginPath(); pctx.arc(sz/2, sz/2, sz*0.15, 0, Math.PI*2); pctx.fill(); break;
                case 'crosshatch': pctx.beginPath(); pctx.moveTo(0, sz); pctx.lineTo(sz, 0); pctx.moveTo(0, 0); pctx.lineTo(sz, sz); pctx.stroke(); break;
                case 'checkerboard': pctx.fillRect(0, 0, sz/2, sz/2); pctx.fillRect(sz/2, sz/2, sz/2, sz/2); break;
            }
            ctx.fillStyle = ctx.createPattern(pc, 'repeat');
            ctx.fillRect(0, 0, w, h);
            break;
        }
        case 'image': {
            if (bgImageEl && bgImageEl.complete && bgImageEl.naturalWidth) {
                const img = bgImageEl;
                switch (bgConfig.bgImageFit) {
                    case 'stretch': ctx.drawImage(img, 0, 0, w, h); break;
                    case 'contain': {
                        const sc = Math.min(w / img.naturalWidth, h / img.naturalHeight);
                        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
                        ctx.fillStyle = bgConfig.bgColor; ctx.fillRect(0, 0, w, h);
                        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
                        break;
                    }
                    case 'tile': {
                        const pat = ctx.createPattern(img, 'repeat');
                        ctx.fillStyle = pat; ctx.fillRect(0, 0, w, h);
                        break;
                    }
                    default: { // cover
                        const sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
                        const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
                        ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
                        break;
                    }
                }
            } else {
                ctx.fillStyle = bgConfig.bgColor; ctx.fillRect(0, 0, w, h);
            }
            break;
        }
        default: { // solid
            ctx.fillStyle = bgConfig.bgColor;
            ctx.fillRect(0, 0, w, h);
            break;
        }
    }
    ctx.restore();
}

// Compute total duration (accounting for repeats)
let hasInfiniteAnim = false;
animations.forEach((anim, idx) => {
    let dur = anim.duration || 0;
    const rc = anim.repeatCount;
    if (rc === Infinity || anim.repeat === true) {
        dur *= 3; // show 3 cycles for infinite
        hasInfiniteAnim = true;
    } else if (rc > 1) dur *= rc;
    const d = (anim.delay || 0) + dur;
    if (d > totalDuration) totalDuration = d;
});
if (totalDuration === 0) totalDuration = ${this.animations.totalDuration || 5000};
else totalDuration = Math.max(totalDuration, ${this.animations.totalDuration || 5000});

const easings = {
    linear: t => t,
    easeIn: t => t * t * t,
    easeOut: t => 1 - Math.pow(1 - t, 3),
    easeInOut: t => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
    bounce: t => { const n=7.5625,d=2.75; if(t<1/d)return n*t*t;else if(t<2/d)return n*(t-=1.5/d)*t+.75;else if(t<2.5/d)return n*(t-=2.25/d)*t+.9375;else return n*(t-=2.625/d)*t+.984375; },
    easeInCubic: t => t*t*t,
    easeOutCubic: t => 1-Math.pow(1-t,3),
    easeInOutCubic: t => t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2,
    elastic: t => t===0?0:t===1?1:Math.pow(2,-10*t)*Math.sin((t-0.075)*2*Math.PI/0.3)+1,
    back: t => { const c1=1.70158,c3=c1+1; return c3*t*t*t-c1*t*t; }
};

// ── Inline RiggingUtils for mesh deformation in preview ──
const RigUtils = {
    _getMode(rig) {
        return rig?.deformationMode === 'mesh' ? 'mesh' : 'skeletal';
    },
    ensureMesh(rig) {
        if (!rig || !rig.pins) return null;
        const density = rig.meshDensity || 8;
        let mesh = rig._meshCache;
        if (!mesh || mesh._density !== density) {
            mesh = RigUtils._buildGrid(density);
            rig._meshCache = mesh;
        }
        const pinHash = rig.pins.map(p => p.id+':'+p.restX.toFixed(5)+','+p.restY.toFixed(5)).join('|');
        const boneHash = (rig.bones || []).map(b => b.parentPinId+'-'+b.childPinId).join('|');
        const fullHash = pinHash + '||' + boneHash + '||' + RigUtils._getMode(rig);
        if (mesh._pinHash !== fullHash) {
            RigUtils._computeWeights(mesh, rig.pins, rig.bones || [], RigUtils._getMode(rig));
            mesh._pinHash = fullHash;
        }
        return mesh;
    },
    _buildGrid(density) {
        const cols = density, rows = density;
        const vertices = [];
        for (let r = 0; r <= rows; r++) {
            for (let c = 0; c <= cols; c++) {
                vertices.push({ origX: c/cols, origY: r/rows, x: c/cols, y: r/rows, weights: [], binding: null });
            }
        }
        const triangles = [];
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tl = r*(cols+1)+c, tr = tl+1, bl = (r+1)*(cols+1)+c, br = bl+1;
                triangles.push([tl,tr,bl]);
                triangles.push([tr,br,bl]);
            }
        }
        return { vertices, triangles, _density: density, _pinHash: null };
    },
    _computeWeights(mesh, pins, bones, mode) {
        mesh.vertices.forEach(v => {
            v.binding = null;
            if (pins.length === 0) { v.weights = []; return; }
            if (mode === 'skeletal' && bones.length > 0) {
                RigUtils._bindVertex(v, pins, bones);
                return;
            }
            let total = 0;
            const weights = [];
            pins.forEach(pin => {
                const dx = v.origX - pin.restX, dy = v.origY - pin.restY;
                const w = 1 / Math.pow(Math.sqrt(dx*dx + dy*dy) + 0.0001, 4);
                weights.push({ pinId: pin.id, weight: w });
                total += w;
            });
            if (total > 0) weights.forEach(w => w.weight /= total);
            v.weights = weights;
        });
    },
    _bindVertex(v, pins, bones) {
        const pinMap = {};
        pins.forEach(pin => { pinMap[pin.id] = pin; });
        let best = null;
        let bestDistSq = Infinity;
        bones.forEach(bone => {
            const p0 = pinMap[bone.parentPinId], p1 = pinMap[bone.childPinId];
            if (!p0 || !p1) return;
            const dx = p1.restX - p0.restX, dy = p1.restY - p0.restY;
            const len = Math.hypot(dx, dy);
            if (len < 1e-6) return;
            const ux = dx / len, uy = dy / len, px = -uy, py = ux;
            const lx = v.origX - p0.restX, ly = v.origY - p0.restY;
            const along = lx * ux + ly * uy;
            const closestAlong = Math.max(0, Math.min(len, along));
            const cx = p0.restX + ux * closestAlong, cy = p0.restY + uy * closestAlong;
            const distSq = (v.origX - cx) ** 2 + (v.origY - cy) ** 2;
            if (distSq < bestDistSq) {
                bestDistSq = distSq;
                best = { type: 'bone', parentPinId: bone.parentPinId, childPinId: bone.childPinId, localAlong: along, localPerp: lx * px + ly * py, unitX: ux, unitY: uy };
            }
        });
        if (!best) {
            let nearest = pins[0], minDistSq = Infinity;
            pins.forEach(pin => {
                const distSq = (v.origX - pin.restX) ** 2 + (v.origY - pin.restY) ** 2;
                if (distSq < minDistSq) { minDistSq = distSq; nearest = pin; }
            });
            v.binding = { type: 'pin', pinId: nearest.id };
            v.weights = [{ pinId: nearest.id, weight: 1 }];
            return;
        }
        v.binding = best;
        v.weights = [];
    },
    deformMesh(rig) {
        const mesh = RigUtils.ensureMesh(rig);
        if (!mesh) return null;
        if (rig.pins.length === 0) return mesh;
        if (RigUtils._getMode(rig) === 'skeletal' && (rig.bones || []).length > 0) {
            const pinMap = {};
            rig.pins.forEach(pin => { pinMap[pin.id] = pin; });
            mesh.vertices.forEach(v => {
                const binding = v.binding;
                if (!binding) { v.x = v.origX; v.y = v.origY; return; }
                if (binding.type === 'pin') {
                    const pin = pinMap[binding.pinId];
                    v.x = pin ? v.origX + (pin.x - pin.restX) : v.origX;
                    v.y = pin ? v.origY + (pin.y - pin.restY) : v.origY;
                    return;
                }
                const parentPin = pinMap[binding.parentPinId], childPin = pinMap[binding.childPinId];
                if (!parentPin || !childPin) { v.x = v.origX; v.y = v.origY; return; }
                const dx = childPin.x - parentPin.x, dy = childPin.y - parentPin.y;
                const len = Math.hypot(dx, dy);
                const ux = len > 1e-6 ? dx / len : binding.unitX;
                const uy = len > 1e-6 ? dy / len : binding.unitY;
                const px = -uy, py = ux;
                v.x = parentPin.x + ux * binding.localAlong + px * binding.localPerp;
                v.y = parentPin.y + uy * binding.localAlong + py * binding.localPerp;
            });
            return mesh;
        }
        const disp = {};
        rig.pins.forEach(p => { disp[p.id] = { dx: p.x - p.restX, dy: p.y - p.restY }; });
        mesh.vertices.forEach(v => {
            let dx = 0, dy = 0;
            v.weights.forEach(w => {
                const d = disp[w.pinId];
                if (d) { dx += d.dx * w.weight; dy += d.dy * w.weight; }
            });
            v.x = v.origX + dx;
            v.y = v.origY + dy;
        });
        return mesh;
    },
    _drawTexturedTriangle(ctx, img, s0x,s0y,s1x,s1y,s2x,s2y, d0x,d0y,d1x,d1y,d2x,d2y) {
        const denom = s0x*(s1y-s2y)+s1x*(s2y-s0y)+s2x*(s0y-s1y);
        if (Math.abs(denom) < 1e-10) return;
        ctx.save();
        ctx.beginPath(); ctx.moveTo(d0x,d0y); ctx.lineTo(d1x,d1y); ctx.lineTo(d2x,d2y); ctx.closePath(); ctx.clip();
        const a=(d0x*(s1y-s2y)+d1x*(s2y-s0y)+d2x*(s0y-s1y))/denom;
        const b=(d0x*(s2x-s1x)+d1x*(s0x-s2x)+d2x*(s1x-s0x))/denom;
        const tx=d0x-a*s0x-b*s0y;
        const c=(d0y*(s1y-s2y)+d1y*(s2y-s0y)+d2y*(s0y-s1y))/denom;
        const d=(d0y*(s2x-s1x)+d1y*(s0x-s2x)+d2y*(s1x-s0x))/denom;
        const ty=d0y-c*s0x-d*s0y;
        ctx.transform(a,c,b,d,tx,ty);
        ctx.drawImage(img,0,0);
        ctx.restore();
    },
    renderDeformed(ctx, obj) {
        const rig = obj.rigging;
        if (!rig || !rig.pins || rig.pins.length === 0) return false;
        const hasMoved = rig.pins.some(p => Math.abs(p.x-p.restX)>0.0005||Math.abs(p.y-p.restY)>0.0005);
        if (!hasMoved) return false;
        const mesh = RigUtils.deformMesh(rig);
        if (!mesh || !obj._imgEl) return false;
        const imgW = obj._imgEl.naturalWidth || obj._imgEl.width;
        const imgH = obj._imgEl.naturalHeight || obj._imgEl.height;
        ctx.save();
        const filters = [];
        if (obj.imgBrightness) filters.push('brightness('+(1+obj.imgBrightness/100)+')');
        if (obj.imgContrast) filters.push('contrast('+(1+obj.imgContrast/100)+')');
        if (obj.imgSaturation) filters.push('saturate('+(1+obj.imgSaturation/100)+')');
        if (obj.imgHue) filters.push('hue-rotate('+obj.imgHue+'deg)');
        if (obj.imgBlur) filters.push('blur('+obj.imgBlur+'px)');
        if (obj.imgGrayscale) filters.push('grayscale('+obj.imgGrayscale+'%)');
        if (obj.imgSepia) filters.push('sepia('+obj.imgSepia+'%)');
        if (obj.imgInvert) filters.push('invert('+obj.imgInvert+'%)');
        if (filters.length > 0) ctx.filter = filters.join(' ');
        mesh.triangles.forEach(tri => {
            const v0=mesh.vertices[tri[0]], v1=mesh.vertices[tri[1]], v2=mesh.vertices[tri[2]];
            const s0x=v0.origX*imgW, s0y=v0.origY*imgH;
            const s1x=v1.origX*imgW, s1y=v1.origY*imgH;
            const s2x=v2.origX*imgW, s2y=v2.origY*imgH;
            const d0x=-obj.width/2+v0.x*obj.width, d0y=-obj.height/2+v0.y*obj.height;
            const d1x=-obj.width/2+v1.x*obj.width, d1y=-obj.height/2+v1.y*obj.height;
            const d2x=-obj.width/2+v2.x*obj.width, d2y=-obj.height/2+v2.y*obj.height;
            RigUtils._drawTexturedTriangle(ctx, obj._imgEl, s0x,s0y,s1x,s1y,s2x,s2y, d0x,d0y,d1x,d1y,d2x,d2y);
        });
        ctx.filter = 'none';
        if (obj.imgTintAmount > 0) {
            ctx.globalAlpha = obj.imgTintAmount/100;
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = obj.imgTintColor||'#ffffff';
            ctx.fillRect(-obj.width/2,-obj.height/2,obj.width,obj.height);
            ctx.globalCompositeOperation = 'source-over';
            ctx.globalAlpha = obj.opacity ?? 1;
        }
        ctx.restore();
        return true;
    },
    interpolatePoses(p1, p2, t) {
        const result = {};
        const keys = new Set([...Object.keys(p1||{}), ...Object.keys(p2||{})]);
        keys.forEach(id => {
            const a = p1?.[id], b = p2?.[id];
            if (a && b) result[id] = { x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t };
            else if (a) result[id] = { x: a.x, y: a.y };
            else if (b) result[id] = { x: b.x, y: b.y };
        });
        return result;
    },
    interpolateKeyframePoses(kfs, progress) {
        if (!kfs || kfs.length === 0) return {};
        if (kfs.length === 1) return kfs[0].pose;
        if (progress <= kfs[0].t) return kfs[0].pose;
        if (progress >= kfs[kfs.length-1].t) return kfs[kfs.length-1].pose;
        let k0 = kfs[0], k1 = kfs[kfs.length-1];
        for (let i = 0; i < kfs.length-1; i++) {
            if (progress >= kfs[i].t && progress <= kfs[i+1].t) { k0 = kfs[i]; k1 = kfs[i+1]; break; }
        }
        const range = k1.t - k0.t;
        const localT = range > 0 ? (progress - k0.t) / range : 0;
        return RigUtils.interpolatePoses(k0.pose, k1.pose, localT);
    },
    applyPose(obj, pose) {
        if (!obj.rigging || !pose) return;
        obj.rigging.pins.forEach(pin => {
            if (pose[pin.id]) { pin.x = pose[pin.id].x; pin.y = pose[pin.id].y; }
        });
    }
};

// Lightweight JointSystem fallback for standalone preview windows.
// The editor loads these helpers from joint-tune-skeleton.js, but the preview
// HTML is self-contained, so joint-rotation animations need local equivalents.
var JointSystem = {
    evaluateJointAnim: function(config, elapsedMs) {
        if (!config || !config.keyframes || !config.keyframes.length) return null;
        var single = config.singleCycleDuration || config.duration || 1000;
        var repeats = config.repeatCycles || 1;
        var totalDuration = single * repeats;
        if (elapsedMs >= totalDuration) return null;
        var cycleTime = elapsedMs % single;
        var t = single > 0 ? cycleTime / single : 1;
        var kfs = config.keyframes;
        var before = kfs[0], after = kfs[kfs.length - 1];
        for (var i = 0; i < kfs.length - 1; i++) {
            if (t >= kfs[i].t && t <= kfs[i + 1].t) {
                before = kfs[i];
                after = kfs[i + 1];
                break;
            }
        }
        var range = after.t - before.t;
        var localT = range > 0 ? (t - before.t) / range : 0;
        var baseAngle = typeof config.baseAngle === 'number' ? config.baseAngle : 0;
        var angle = baseAngle + (before.angle || 0) + (((after.angle || 0) - (before.angle || 0)) * localT);
        var state = {
            angle: Math.max(-180, Math.min(180, angle)),
            tiltX: null,
            tiltY: null,
            x: null,
            y: null
        };
        if (config.hasTiltX) {
            var baseTiltX = typeof config.baseTiltX === 'number' ? config.baseTiltX : 0;
            var tiltX = baseTiltX + (before.tiltX || 0) + (((after.tiltX || 0) - (before.tiltX || 0)) * localT);
            state.tiltX = Math.max(-45, Math.min(45, tiltX));
        }
        if (config.hasTiltY) {
            var baseTiltY = typeof config.baseTiltY === 'number' ? config.baseTiltY : 0;
            var tiltY = baseTiltY + (before.tiltY || 0) + (((after.tiltY || 0) - (before.tiltY || 0)) * localT);
            state.tiltY = Math.max(-45, Math.min(45, tiltY));
        }
        if (config.hasX) {
            var baseX = typeof config.baseX === 'number' ? config.baseX : 0;
            state.x = baseX + (before.x || 0) + (((after.x || 0) - (before.x || 0)) * localT);
        }
        if (config.hasY) {
            var baseY = typeof config.baseY === 'number' ? config.baseY : 0;
            state.y = baseY + (before.y || 0) + (((after.y || 0) - (before.y || 0)) * localT);
        }
        return state;
    },
    _normalizeJointAnimTargetName: function(name) {
        return String(name || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    },
    resolveJointAnimTarget: function(obj, config) {
        config = config || {};
        if (!obj) return null;
        if ((config.targetMode || 'base') !== 'joint') return { mode: 'base', obj: obj };
        var joints = Array.isArray(obj.joints) ? obj.joints : [];
        if (!joints.length) return null;
        var joint = null;
        if (config.targetJointId) {
            joint = joints.find(function(jt) { return jt && jt.id === config.targetJointId; }) || null;
        }
        if (!joint && config.targetJointName) {
            var needle = JointSystem._normalizeJointAnimTargetName(config.targetJointName);
            joint = joints.find(function(jt) { return JointSystem._normalizeJointAnimTargetName(jt && jt.name) === needle; }) || null;
        }
        return joint ? { mode: 'joint', obj: obj, joint: joint } : null;
    },
    applyJointAnimState: function(obj, config, motionState) {
        if (!obj || !config || !motionState) return false;
        var targetMode = config.targetMode || 'base';
        var target = JointSystem.resolveJointAnimTarget(obj, config);
        if (targetMode === 'joint') {
            if (!target || target.mode !== 'joint') return false;
            target.joint.angle = motionState.angle;
            if (typeof motionState.tiltX === 'number') target.joint.tiltX = motionState.tiltX;
            if (typeof motionState.tiltY === 'number') target.joint.tiltY = motionState.tiltY;
            return true;
        }
        obj.jointBaseAngle = motionState.angle;
        if (typeof motionState.tiltX === 'number') obj.tiltX = motionState.tiltX;
        if (typeof motionState.tiltY === 'number') obj.tiltY = motionState.tiltY;
        if (!obj.pinnedTo && typeof motionState.x === 'number') obj.x = motionState.x;
        if (!obj.pinnedTo && typeof motionState.y === 'number') obj.y = motionState.y;
        return true;
    }
};

// Store originals
objects.forEach(obj => {
    obj._orig = Object.assign({}, obj);
    // Deep-clone joints array so angle mutations don't corrupt original
    if (obj.joints && obj.joints.length > 0) {
        obj._orig.joints = JSON.parse(JSON.stringify(obj.joints));
    }
    // Deep-clone flex pins for reset
    if (obj.flexPins && obj.flexPins.length > 0) {
        obj._orig.flexPins = JSON.parse(JSON.stringify(obj.flexPins));
    }
    // Deep-clone rigging pins for rest-state reset
    if (obj.rigging && obj.rigging.pins) {
        obj._orig._rigPins = obj.rigging.pins.map(p => ({ id: p.id, x: p.x, y: p.y, restX: p.restX, restY: p.restY }));
    }
});

// Preload images for image objects
let imagesLoading = 0;
objects.forEach(obj => {
    if (obj.type === 'image' && obj.imageSrc) {
        imagesLoading++;
        const img = new Image();
        let didLoad = false;
        const handleLoad = () => {
            if (didLoad) return;
            didLoad = true;
            obj._imgEl = img;
            _decodeGifFrames(obj);
            imagesLoading--;
            if (imagesLoading <= 0) { ctx.clearRect(0,0,canvas.width,canvas.height); drawBackground(); applyJointAngles(objects); resolvePinsPreview(objects); drawPreviewObjectsInLayerOrder(ctx, objects); drawPinContoursPreview(ctx, objects); }
        };
        img.onload = handleLoad;
        img.onerror = () => { imagesLoading--; };
        img.src = obj.imageSrc;
        if (img.complete && (img.naturalWidth || img.width)) handleLoad();
    }
    if (obj.textureImageSrc) {
        imagesLoading++;
        const texImg = new Image();
        let didLoad = false;
        const handleLoad = () => {
            if (didLoad) return;
            didLoad = true;
            obj._textureImgEl = texImg;
            imagesLoading--;
            if (imagesLoading <= 0) { ctx.clearRect(0,0,canvas.width,canvas.height); drawBackground(); applyJointAngles(objects); resolvePinsPreview(objects); drawPreviewObjectsInLayerOrder(ctx, objects); drawPinContoursPreview(ctx, objects); }
        };
        texImg.onload = handleLoad;
        texImg.onerror = () => { imagesLoading--; };
        texImg.src = obj.textureImageSrc;
        if (texImg.complete && (texImg.naturalWidth || texImg.width)) handleLoad();
    }
    // Deep-clone pathPoints for originals
    if ((obj.type === 'path' || obj.type === 'scribble' || obj.type === 'freeform') && obj.pathPoints) {
        obj._orig.pathPoints = obj.pathPoints.map(p => ({x:p.x, y:p.y}));
    }
});

function _isPreviewArmatureOrFaceObject(obj) {
    if (!obj) return false;
    return !!(
        obj._armatureRoleKey || obj.armatureRoleKey ||
        obj._armaturePartKey || obj.armaturePartKey ||
        obj._ucRole || obj.ucRole ||
        obj._facialRole || obj.facialRole ||
        obj.pinnedTo || obj.pinTarget ||
        (typeof obj.name === 'string' && /^(Face:|Head Neck|Torso|Front Arm|Back Arm|Right Arm|Left Arm|Front Leg|Back Leg|Right Leg|Left Leg|Scalp Hair)/i.test(obj.name))
    );
}

function _shouldStepPreviewProperty(obj, key, fromValue, toValue) {
    if (!key) return false;
    if (key === 'visible') return true;
    if (key === 'imageSrc' || key === 'textureImageSrc') return true;
    if (key === '_armatureDrawLayer' || key === 'armatureDrawLayer') return true;
    if (key === 'layer' && _isPreviewArmatureOrFaceObject(obj)) return true;
    if (/^jointCrossOffset_\d+$/.test(String(key))) return true;
    if ((key === 'scaleX' || key === 'flipH' || key === 'flipV') && _isPreviewArmatureOrFaceObject(obj)) {
        if (key === 'flipH' || key === 'flipV') return true;
        const a = Number(fromValue), b = Number(toValue);
        return Number.isFinite(a) && Number.isFinite(b) && a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b);
    }
    return false;
}

function _resolvePreviewAnimatedValue(obj, key, fromValue, toValue, progress, interpolatedValue) {
    return _shouldStepPreviewProperty(obj, key, fromValue, toValue)
        ? (progress < 0.5 ? fromValue : toValue)
        : interpolatedValue;
}

function _setAnimatedPreviewProperty(obj, key, value) {
    if ((key === 'layer' || key === '_armatureDrawLayer' || key === 'armatureDrawLayer') && _isPreviewArmatureOrFaceObject(obj)) {
        const layerValue = Number(value);
        if (Number.isFinite(layerValue)) obj._armatureDrawLayer = Math.round(layerValue);
        return;
    }
    if (key === 'imageSrc') {
        if (obj.imageSrc !== value) {
            obj.imageSrc = value;
            if (value) {
                const img = new Image();
                let didLoad = false;
                const handleLoad = () => {
                    if (didLoad) return;
                    didLoad = true;
                    obj._imgEl = img;
                    _decodeGifFrames(obj);
                };
                img.onload = handleLoad;
                img.src = value;
                if (img.complete && (img.naturalWidth || img.width)) handleLoad();
            } else {
                obj._imgEl = null;
            }
        }
        return;
    }
    if (key === 'textureImageSrc') {
        if (obj.textureImageSrc !== value) {
            obj.textureImageSrc = value;
            if (value) {
                const texImg = new Image();
                let didLoad = false;
                const handleLoad = () => {
                    if (didLoad) return;
                    didLoad = true;
                    obj._textureImgEl = texImg;
                };
                texImg.onload = handleLoad;
                texImg.src = value;
                if (texImg.complete && (texImg.naturalWidth || texImg.width)) handleLoad();
            } else {
                obj._textureImgEl = null;
            }
        }
        return;
    }
    if (key === 'visible') {
        obj.visible = value === true || value === 1 || value === '1';
        return;
    }
    obj[key] = value;
    const jointMatch = String(key).match(/^jointAngle_(\d+)$/);
    if (jointMatch && obj.joints && obj.joints.length) {
        const sortedJoints = obj.joints.slice().sort((a, b) => a.position - b.position);
        const joint = sortedJoints[Number(jointMatch[1])];
        if (joint) joint.angle = value;
        return;
    }
    const tiltMatch = String(key).match(/^jointTilt([XY])_(\d+)$/);
    if (tiltMatch && obj.joints && obj.joints.length) {
        const axis = tiltMatch[1] === 'X' ? 'tiltX' : 'tiltY';
        const sortedJoints = obj.joints.slice().sort((a, b) => a.position - b.position);
        const joint = sortedJoints[Number(tiltMatch[2])];
        if (joint) joint[axis] = value;
        return;
    }
    const crossMatch = String(key).match(/^jointCrossOffset_(\d+)$/);
    if (crossMatch && obj.joints && obj.joints.length) {
        const sortedJoints = obj.joints.slice().sort((a, b) => a.position - b.position);
        const joint = sortedJoints[Number(crossMatch[1])];
        if (joint) joint.crossOffset = value;
        return;
    }
    const flexMatch = String(key).match(/^flexPinAngle_(\d+)$/);
    if (flexMatch && obj.flexPins && obj.flexPins.length) {
        const sortedFlexPins = obj.flexPins.slice().sort((a, b) => a.position - b.position);
        const pin = sortedFlexPins[Number(flexMatch[1])];
        if (pin) pin.angle = Number(value) || 0;
    }
}

function _getPreviewTextureFill(ctx, obj) {
    const img = obj && obj._textureImgEl;
    if (!img || !img.complete || !(img.naturalWidth || img.width)) return null;
    const pat = ctx.createPattern(img, 'no-repeat');
    if (pat && typeof pat.setTransform === 'function' && typeof DOMMatrix !== 'undefined') {
        const srcW = Math.max(1, img.naturalWidth || img.width || Math.abs(obj.width) || 1);
        const srcH = Math.max(1, img.naturalHeight || img.height || Math.abs(obj.height) || 1);
        pat.setTransform(
            new DOMMatrix()
                .translateSelf(-obj.width / 2, -obj.height / 2)
                .scaleSelf((obj.width || 1) / srcW, (obj.height || 1) / srcH)
        );
    }
    return pat;
}

function _previewHasTextureImage(obj) {
    const img = obj && obj._textureImgEl;
    return !!(obj && obj.type !== 'image' && img && img.complete && (img.naturalWidth || img.width));
}

function _drawPreviewTextureIntoCurrentPath(ctx, obj) {
    if (!_previewHasTextureImage(obj)) return false;
    const img = obj._textureImgEl;
    ctx.save();
    ctx.clip();
    const imgFilters = [];
    if (obj.imgBrightness) imgFilters.push('brightness(' + (1 + obj.imgBrightness / 100) + ')');
    if (obj.imgContrast) imgFilters.push('contrast(' + (1 + obj.imgContrast / 100) + ')');
    if (obj.imgSaturation) imgFilters.push('saturate(' + (1 + obj.imgSaturation / 100) + ')');
    if (obj.imgHue) imgFilters.push('hue-rotate(' + obj.imgHue + 'deg)');
    if (obj.imgBlur) imgFilters.push('blur(' + obj.imgBlur + 'px)');
    if (obj.imgGrayscale) imgFilters.push('grayscale(' + obj.imgGrayscale + '%)');
    if (obj.imgSepia) imgFilters.push('sepia(' + obj.imgSepia + '%)');
    if (obj.imgInvert) imgFilters.push('invert(' + obj.imgInvert + '%)');
    if (imgFilters.length > 0) ctx.filter = imgFilters.join(' ');
    ctx.drawImage(img, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
    ctx.filter = 'none';
    if (obj.imgTintAmount > 0) {
        ctx.globalAlpha = obj.imgTintAmount / 100;
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = obj.imgTintColor || '#ffffff';
        ctx.fillRect(-obj.width / 2, -obj.height / 2, obj.width, obj.height);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = obj.opacity ?? 1;
    }
    ctx.restore();
    return true;
}

function resolveFill(ctx, obj) {
    const hw = obj.width/2, hh = obj.height/2;
    const textureFill = obj.type !== 'image' ? _getPreviewTextureFill(ctx, obj) : null;
    if (textureFill) return textureFill;
    if (obj.fillType === 'linear-gradient' && obj.gradientStops && obj.gradientStops.length >= 2) {
        const rad = (obj.gradientAngle || 0) * Math.PI / 180;
        const r = Math.max(obj.width, obj.height) / 2;
        const g = ctx.createLinearGradient(-r*Math.cos(rad), -r*Math.sin(rad), r*Math.cos(rad), r*Math.sin(rad));
        obj.gradientStops.forEach(s => g.addColorStop(s.offset, s.color));
        return g;
    }
    if (obj.fillType === 'radial-gradient' && obj.gradientStops && obj.gradientStops.length >= 2) {
        const r = Math.max(obj.width, obj.height) / 2;
        const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
        obj.gradientStops.forEach(s => g.addColorStop(s.offset, s.color));
        return g;
    }
    if (obj.fillType === 'pattern' && obj.patternType && obj.patternType !== 'none') {
        const sz = Math.max(8, 16 * (obj.patternScale || 1));
        const pc = document.createElement('canvas');
        pc.width = sz; pc.height = sz;
        const pctx = pc.getContext('2d');
        pctx.fillStyle = obj.fill; pctx.fillRect(0,0,sz,sz);
        pctx.strokeStyle = obj.patternColor||'#fff'; pctx.fillStyle = obj.patternColor||'#fff';
        pctx.lineWidth = Math.max(1, sz*0.08);
        switch(obj.patternType){
            case 'stripes': pctx.beginPath(); pctx.moveTo(0,sz); pctx.lineTo(sz,0); pctx.moveTo(-sz*0.5,sz*0.5); pctx.lineTo(sz*0.5,-sz*0.5); pctx.moveTo(sz*0.5,sz*1.5); pctx.lineTo(sz*1.5,sz*0.5); pctx.stroke(); break;
            case 'dots': pctx.beginPath(); pctx.arc(sz/2,sz/2,sz*0.15,0,Math.PI*2); pctx.fill(); break;
            case 'crosshatch': pctx.beginPath(); pctx.moveTo(0,sz); pctx.lineTo(sz,0); pctx.moveTo(0,0); pctx.lineTo(sz,sz); pctx.stroke(); break;
            case 'checkerboard': pctx.fillRect(0,0,sz/2,sz/2); pctx.fillRect(sz/2,sz/2,sz/2,sz/2); break;
        }
        return ctx.createPattern(pc, 'repeat');
    }
    return obj.fill || '#666';
}

function _normalizePreviewJointDirection(direction) {
    switch (direction) {
        case 'vertical-bt': return 'vertical-bt';
        case 'horizontal':
        case 'horizontal-lr': return 'horizontal-lr';
        case 'horizontal-rl': return 'horizontal-rl';
        case 'vertical':
        case 'vertical-tb':
        default: return 'vertical-tb';
    }
}

function _getPreviewJointDirectionMeta(direction) {
    var value = _normalizePreviewJointDirection(direction);
    return {
        value: value,
        isVertical: value.indexOf('vertical') === 0,
        isReverse: value === 'vertical-bt' || value === 'horizontal-rl'
    };
}

${'function ' + StageObject.renderFlexLayer.toString()}
${'function ' + StageObject.flexRegionLockAt.toString()}
${'function ' + StageObject.stabilizeFlexGrid.toString()}
function _drawWithFlexPreview(ctx, obj, drawContent, isolated) {
    var pins = obj.flexPins;
    if (!pins || !pins.length) { drawContent(); return; }
    var hasAngle = false;
    for (var i = 0; i < pins.length; i++) { if (Math.abs(pins[i].angle) > 0.1) { hasAngle = true; break; } }
    if (!hasAngle) { drawContent(); return; }
    if (!isolated && pins.some(function(pin){ return pin.maskMode === 'exclude' && pin.maskPathN && pin.maskPathN.length >= 3; })) {
        renderFlexLayer(ctx, function(layer){ _drawWithFlexPreview(layer, obj, drawContent, true); });
        return;
    }
    var renderContent = drawContent;
    drawContent = function(target){ return renderContent(target || ctx); };
    var isVert = obj.flexDirection === 'vertical';
    var fixedRegionMode = obj.flexFixedRegionMode === 'grid' ? 'grid' : 'overlay';
    var gridDensity = Math.max(0.35, Math.min(1.5, Number(obj.flexGridDensity == null ? 0.6 : obj.flexGridDensity)));
    var segs = 40, w = obj.width, h = obj.height;
    var segAngles = [];
    var _clamp01 = function(v){ return Math.max(0, Math.min(1, v)); };
    var _pointInPolyN = function(x, y, poly){
        var inside = false;
        for (var i2 = 0, j2 = poly.length - 1; i2 < poly.length; j2 = i2++) {
            var xi = _clamp01(Number(poly[i2].x));
            var yi = _clamp01(Number(poly[i2].y));
            var xj = _clamp01(Number(poly[j2].x));
            var yj = _clamp01(Number(poly[j2].y));
            var intersects = ((yi > y) !== (yj > y)) &&
                (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-6) + xi);
            if (intersects) inside = !inside;
        }
        return inside;
    };
    var _getGlobalExcludeLockAt = function(px, py){
        var lock = flexRegionLockAt(pins, _clamp01(px), _clamp01(py));
        return lock;
    };
    var _getPinRegionWeight = function(pin, t){
        var path = pin && Array.isArray(pin.maskPathN) ? pin.maskPathN : null;
        var strength = Math.max(0, Math.min(1, Number(pin.maskStrength == null ? 1 : pin.maskStrength)));
        var samples = 13;
        var weightSum = 0;
        for (var si = 0; si < samples; si++) {
            var u = (si + 0.5) / samples;
            var px = isVert ? u : t;
            var py = isVert ? t : u;
            var baseMask = 1;
            if (path && path.length >= 3) {
                var inRegion = _pointInPolyN(px, py, path) ? 1 : 0;
                var hardMask = pin.maskMode === 'include' ? inRegion : (1 - inRegion);
                baseMask = 1 - strength * (1 - hardMask);
            }
            var globalLock = _getGlobalExcludeLockAt(px, py);
            weightSum += baseMask * (1 - globalLock);
        }
        return _clamp01(weightSum / samples);
    };
    var _getPinPointRegionWeight = function(pin, t, u){
        var path = pin && Array.isArray(pin.maskPathN) ? pin.maskPathN : null;
        var strength = Math.max(0, Math.min(1, Number(pin.maskStrength == null ? 1 : pin.maskStrength)));
        var px = isVert ? u : t;
        var py = isVert ? t : u;
        var baseMask = 1;
        if (path && path.length >= 3) {
            var inRegion = _pointInPolyN(_clamp01(px), _clamp01(py), path) ? 1 : 0;
            var hardMask = pin.maskMode === 'include' ? inRegion : (1 - inRegion);
            baseMask = 1 - strength * (1 - hardMask);
        }
        var globalLock = _getGlobalExcludeLockAt(px, py);
        return baseMask * (1 - globalLock);
    };
    var _drawFixedRegionOverlays = function(){
        for (var pi3 = 0; pi3 < pins.length; pi3++) {
            var pin = pins[pi3];
            if (!pin || pin.maskMode !== 'exclude') continue;
            var path = Array.isArray(pin.maskPathN) ? pin.maskPathN : null;
            if (!path || path.length < 3) continue;
            var strength = Math.max(0, Math.min(1, Number(pin.maskStrength == null ? 1 : pin.maskStrength)));
            if (strength <= 0.0001) continue;

            // Remove bent pixels under fixed region first to avoid ghost overlap.
            ctx.save();
            ctx.globalAlpha *= strength;
            ctx.globalCompositeOperation = 'destination-out';
            ctx.beginPath();
            for (var di = 0; di < path.length; di++) {
                var dpx = -w / 2 + _clamp01(Number(path[di].x)) * w;
                var dpy = -h / 2 + _clamp01(Number(path[di].y)) * h;
                if (di === 0) ctx.moveTo(dpx, dpy);
                else ctx.lineTo(dpx, dpy);
            }
            ctx.closePath();
            ctx.fillStyle = '#000';
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.globalAlpha *= strength;
            ctx.beginPath();
            for (var i3 = 0; i3 < path.length; i3++) {
                var px3 = -w / 2 + _clamp01(Number(path[i3].x)) * w;
                var py3 = -h / 2 + _clamp01(Number(path[i3].y)) * h;
                if (i3 === 0) ctx.moveTo(px3, py3);
                else ctx.lineTo(px3, py3);
            }
            ctx.closePath();
            ctx.clip();
            drawContent();
            ctx.restore();
        }
    };
    var aboveSplit = 0;
    var hasAbovePin = false;
    for (var pi2 = 0; pi2 < pins.length; pi2++) {
        if (pins[pi2].influenceSide === 'above') {
            hasAbovePin = true;
            var pinPos = Math.max(0, Math.min(1, Number(pins[pi2].position || 0)));
            aboveSplit = Math.max(aboveSplit, Math.min(segs, Math.max(1, Math.floor(pinPos * segs) + 1)));
        }
    }
    for (var s = 0; s < segs; s++) segAngles[s] = 0;
    var pinDistributions = [];
    for (var pi = 0; pi < pins.length; pi++) {
        var pin = pins[pi];
        var sigma = Math.max(0.03, (pin.spread || 0.25) / 2);
        var inv2s2 = 1 / (2 * sigma * sigma);
        var side = pin.influenceSide === 'above' ? 'above' : 'below';
        var totalW = 0, ws = [];
        for (var s = 0; s < segs; s++) {
            var t = (s + 0.5) / segs;
            if (side === 'below' && t < pin.position) { ws.push(0); continue; }
            if (side === 'above' && t > pin.position) { ws.push(0); continue; }
            var d = t - pin.position;
            var wt = Math.exp(-d * d * inv2s2);
            ws.push(wt); totalW += wt;
        }
        pinDistributions.push({ pin: pin, ws: ws, totalW: totalW });
        if (totalW > 0) {
            for (var s = 0; s < segs; s++) {
                var t = (s + 0.5) / segs;
                var regionWeight = _getPinRegionWeight(pin, t);
                if (regionWeight <= 0.0001) continue;
                var contribution = pin.angle * (ws[s] / totalW) * regionWeight;
                segAngles[s] += contribution;
            }
        }
    }
    var _drawTrue2DGrid = function(){
        var srcW = Math.max(1, Math.ceil(Math.abs(w)));
        var srcH = Math.max(1, Math.ceil(Math.abs(h)));
        if (srcW < 2 || srcH < 2) return false;

        var srcCanvas = document.createElement('canvas');
        srcCanvas.width = srcW; srcCanvas.height = srcH;
        var srcCtx = srcCanvas.getContext('2d');
        ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'textAlign', 'textBaseline'].forEach(function(key){ srcCtx[key] = ctx[key]; });
        srcCtx.imageSmoothingEnabled = true;
        srcCtx.imageSmoothingQuality = 'high';
        srcCtx.translate(srcW / 2, srcH / 2);
        drawContent(srcCtx);

        var rows = Math.max(12, Math.min(140, Math.round((srcH / 5) * gridDensity)));
        var cols = Math.max(10, Math.min(100, Math.round((srcW / 8) * gridDensity)));
        var rowH = h / rows;
        var colW = w / cols;

        var theta = [];
        for (var r = 0; r <= rows; r++) {
            theta[r] = [];
            var tVal = r / rows;
            var sIdx = Math.max(0, Math.min(segs - 1, Math.floor(tVal * segs)));
            for (var c = 0; c <= cols; c++) {
                var u = c / cols;
                var aSum = 0;
                for (var di = 0; di < pinDistributions.length; di++) {
                    var dist = pinDistributions[di];
                    if (!dist.totalW || dist.totalW <= 0) continue;
                    var base = dist.pin.angle * (dist.ws[sIdx] / dist.totalW);
                    var rw = _getPinPointRegionWeight(dist.pin, tVal, u);
                    if (rw <= 0.0001) continue;
                    aSum += base * rw;
                }
                theta[r][c] = aSum;
            }
        }

        var disp = [];
        for (var r2 = 0; r2 <= rows; r2++) {
            disp[r2] = [];
            for (var c2 = 0; c2 <= cols; c2++) disp[r2][c2] = 0;
        }
        if (isVert) {
            for (var c3 = 0; c3 <= cols; c3++) {
                for (var r3 = 1; r3 <= rows; r3++) {
                    var radV = theta[r3 - 1][c3] * Math.PI / 180;
                    disp[r3][c3] = disp[r3 - 1][c3] + Math.tan(radV) * rowH;
                }
            }
        } else {
            for (var r4 = 0; r4 <= rows; r4++) {
                for (var c4 = 1; c4 <= cols; c4++) {
                    var radH = theta[r4][c4 - 1] * Math.PI / 180;
                    disp[r4][c4] = disp[r4][c4 - 1] + Math.tan(radH) * colW;
                }
            }
        }

        // Full-strength protection wins over accumulated upstream displacement.
        for (var lr = 0; lr <= rows; lr++) {
            for (var lc = 0; lc <= cols; lc++) {
                disp[lr][lc] *= 1 - _getGlobalExcludeLockAt(lc / cols, lr / rows);
            }
        }
        obj._flexGeometryDiagnostics = stabilizeFlexGrid(disp, w, h, isVert);
        for (var rr = 0; rr < rows; rr++) {
            for (var cc = 0; cc < cols; cc++) {
                var sx = (cc / cols) * srcW;
                var sy = (rr / rows) * srcH;
                var sw = Math.max(1, (srcW / cols) + 0.5);
                var sh = Math.max(1, (srcH / rows) + 0.5);
                var srcBleed = 0.8;
                var sxB = Math.max(0, sx - srcBleed);
                var syB = Math.max(0, sy - srcBleed);
                var swB = Math.min(srcW - sxB, sw + srcBleed * 2);
                var shB = Math.min(srcH - syB, sh + srcBleed * 2);

                var x00, y00, x10, y10, x01, y01, x11, y11;
                if (isVert) {
                    x00 = -w / 2 + cc * colW + disp[rr][cc];
                    y00 = -h / 2 + rr * rowH;
                    x10 = -w / 2 + (cc + 1) * colW + disp[rr][cc + 1];
                    y10 = -h / 2 + rr * rowH;
                    x01 = -w / 2 + cc * colW + disp[rr + 1][cc];
                    y01 = -h / 2 + (rr + 1) * rowH;
                    x11 = -w / 2 + (cc + 1) * colW + disp[rr + 1][cc + 1];
                    y11 = -h / 2 + (rr + 1) * rowH;
                } else {
                    x00 = -w / 2 + cc * colW;
                    y00 = -h / 2 + rr * rowH + disp[rr][cc];
                    x10 = -w / 2 + (cc + 1) * colW;
                    y10 = -h / 2 + rr * rowH + disp[rr][cc + 1];
                    x01 = -w / 2 + cc * colW;
                    y01 = -h / 2 + (rr + 1) * rowH + disp[rr + 1][cc];
                    x11 = -w / 2 + (cc + 1) * colW;
                    y11 = -h / 2 + (rr + 1) * rowH + disp[rr + 1][cc + 1];
                }

                var a = (x10 - x00) / sw;
                var b = (y10 - y00) / sw;
                var cM = (x01 - x00) / sh;
                var d = (y01 - y00) / sh;

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x00, y00);
                ctx.lineTo(x10, y10);
                ctx.lineTo(x11, y11);
                ctx.lineTo(x01, y01);
                ctx.closePath();
                ctx.clip();
                ctx.transform(a, b, cM, d, x00, y00);
                ctx.drawImage(srcCanvas, sxB, syB, swB, shB, -srcBleed, -srcBleed, swB, shB);
                ctx.restore();
            }
        }
        return true;
    };

    if (fixedRegionMode === 'grid' && _drawTrue2DGrid()) {
        _drawFixedRegionOverlays();
        return;
    }
    // Surface-cache for image type: pre-render to offscreen canvas, then slice per segment
    if (obj.type === 'image' && obj._imgEl && obj._imgEl.complete && obj._imgEl.naturalWidth) {
        var tmpW = Math.max(1, Math.ceil(Math.abs(w)));
        var tmpH = Math.max(1, Math.ceil(Math.abs(h)));
        var tmpCanvas = document.createElement('canvas');
        tmpCanvas.width = tmpW; tmpCanvas.height = tmpH;
        var tmpCtx = tmpCanvas.getContext('2d');
        // Apply CSS image filters
        var imgFilters = [];
        if (obj.imgBrightness) imgFilters.push('brightness(' + (1 + obj.imgBrightness / 100) + ')');
        if (obj.imgContrast)   imgFilters.push('contrast('   + (1 + obj.imgContrast   / 100) + ')');
        if (obj.imgSaturation) imgFilters.push('saturate('   + (1 + obj.imgSaturation / 100) + ')');
        if (obj.imgHue)        imgFilters.push('hue-rotate(' + obj.imgHue + 'deg)');
        if (obj.imgBlur)       imgFilters.push('blur('       + obj.imgBlur + 'px)');
        if (obj.imgGrayscale)  imgFilters.push('grayscale('  + obj.imgGrayscale + '%)');
        if (obj.imgSepia)      imgFilters.push('sepia('      + obj.imgSepia + '%)');
        if (obj.imgInvert)     imgFilters.push('invert('     + obj.imgInvert + '%)');
        if (imgFilters.length > 0) tmpCtx.filter = imgFilters.join(' ');
        // Border radius clip on the offscreen canvas
        if (obj.borderRadius > 0) {
            tmpCtx.beginPath();
            if (tmpCtx.roundRect) tmpCtx.roundRect(0, 0, tmpW, tmpH, obj.borderRadius);
            else tmpCtx.rect(0, 0, tmpW, tmpH);
            tmpCtx.clip();
        }
        var imgSrc = (typeof _getGifFrame !== 'undefined') ? _getGifFrame(obj) : obj._imgEl;
        tmpCtx.drawImage(imgSrc, 0, 0, tmpW, tmpH);
        tmpCtx.filter = 'none';
        // Color tint overlay
        if (obj.imgTintAmount > 0) {
            tmpCtx.globalAlpha = obj.imgTintAmount / 100;
            tmpCtx.globalCompositeOperation = 'source-atop';
            tmpCtx.fillStyle = obj.imgTintColor || '#ffffff';
            tmpCtx.fillRect(0, 0, tmpW, tmpH);
            tmpCtx.globalCompositeOperation = 'source-over';
            tmpCtx.globalAlpha = 1;
        }
        // Slice per segment using drawImage instead of clip-and-redraw
        var overlap = 1;
        var drawSurfaceSegment = function(segmentCtx, meta) {
            ctx.save();
            for (var j = 0; j < meta.seg; j++) {
                if (Math.abs(segAngles[j]) < 0.001) continue;
                var ratio = j / segs;
                var px, py;
                if (isVert) { px = 0; py = -h / 2 + h * ratio; }
                else { px = -w / 2 + w * ratio; py = 0; }
                segmentCtx.translate(px, py); segmentCtx.rotate(segAngles[j] * Math.PI / 180); segmentCtx.translate(-px, -py);
            }
            var s0 = meta.s0, s1 = meta.s1;
            if (isVert) {
                var destY = -h / 2 + h * s0, destH = h * (s1 - s0);
                var srcY = Math.max(0, Math.round(s0 * tmpH - overlap));
                var srcH = Math.min(tmpH - srcY, Math.ceil(destH + 2 * overlap));
                if (srcH > 0) {
                    segmentCtx.beginPath(); segmentCtx.rect(-w / 2 - 1, destY - overlap, w + 2, srcH + 0.5); segmentCtx.clip();
                    segmentCtx.drawImage(tmpCanvas, 0, srcY, tmpW, srcH, -w / 2, destY - overlap, w, srcH);
                }
            } else {
                var destX = -w / 2 + w * s0, destW = w * (s1 - s0);
                var srcX = Math.max(0, Math.round(s0 * tmpW - overlap));
                var srcW = Math.min(tmpW - srcX, Math.ceil(destW + 2 * overlap));
                if (srcW > 0) {
                    segmentCtx.beginPath(); segmentCtx.rect(destX - overlap, -h / 2 - 1, srcW + 0.5, h + 2); segmentCtx.clip();
                    segmentCtx.drawImage(tmpCanvas, srcX, 0, srcW, tmpH, destX - overlap, -h / 2, srcW, h);
                }
            }
            segmentCtx.restore();
        };
        if (isVert && hasAbovePin && aboveSplit < segs) {
            for (var seg = aboveSplit - 1; seg >= 0; seg--) {
                ctx.save();
                for (var j = aboveSplit - 1; j > seg; j--) {
                    if (Math.abs(segAngles[j]) < 0.001) continue;
                    var ratio = (j + 1) / segs;
                    var px, py;
                    if (isVert) { px = 0; py = -h / 2 + h * ratio; }
                    else { px = -w / 2 + w * ratio; py = 0; }
                    ctx.translate(px, py); ctx.rotate(segAngles[j] * Math.PI / 180); ctx.translate(-px, -py);
                }
                var s0a = seg / segs, s1a = (seg + 1) / segs;
                if (isVert) {
                    var destYa = -h / 2 + h * s0a, destHa = h * (s1a - s0a);
                    var srcYa = Math.max(0, Math.round(s0a * tmpH - overlap));
                    var srcHa = Math.min(tmpH - srcYa, Math.ceil(destHa + 2 * overlap));
                    if (srcHa > 0) {
                        ctx.beginPath(); ctx.rect(-w / 2 - 1, destYa - overlap, w + 2, srcHa + 0.5); ctx.clip();
                        ctx.drawImage(tmpCanvas, 0, srcYa, tmpW, srcHa, -w / 2, destYa - overlap, w, srcHa);
                    }
                } else {
                    var destXa = -w / 2 + w * s0a, destWa = w * (s1a - s0a);
                    var srcXa = Math.max(0, Math.round(s0a * tmpW - overlap));
                    var srcWa = Math.min(tmpW - srcXa, Math.ceil(destWa + 2 * overlap));
                    if (srcWa > 0) {
                        ctx.beginPath(); ctx.rect(destXa - overlap, -h / 2 - 1, srcWa + 0.5, h + 2); ctx.clip();
                        ctx.drawImage(tmpCanvas, srcXa, 0, srcWa, tmpH, destXa - overlap, -h / 2, srcWa, h);
                    }
                }
                ctx.restore();
            }
            for (var seg2 = aboveSplit; seg2 < segs; seg2++) {
                ctx.save();
                for (var j2 = aboveSplit; j2 < seg2; j2++) {
                    if (Math.abs(segAngles[j2]) < 0.001) continue;
                    var ratio2 = j2 / segs;
                    var px2, py2;
                    if (isVert) { px2 = 0; py2 = -h / 2 + h * ratio2; }
                    else { px2 = -w / 2 + w * ratio2; py2 = 0; }
                    ctx.translate(px2, py2); ctx.rotate(segAngles[j2] * Math.PI / 180); ctx.translate(-px2, -py2);
                }
                var s0b = seg2 / segs, s1b = (seg2 + 1) / segs;
                if (isVert) {
                    var destYb = -h / 2 + h * s0b, destHb = h * (s1b - s0b);
                    var srcYb = Math.max(0, Math.round(s0b * tmpH - overlap));
                    var srcHb = Math.min(tmpH - srcYb, Math.ceil(destHb + 2 * overlap));
                    if (srcHb > 0) {
                        ctx.beginPath(); ctx.rect(-w / 2 - 1, destYb - overlap, w + 2, srcHb + 0.5); ctx.clip();
                        ctx.drawImage(tmpCanvas, 0, srcYb, tmpW, srcHb, -w / 2, destYb - overlap, w, srcHb);
                    }
                } else {
                    var destXb = -w / 2 + w * s0b, destWb = w * (s1b - s0b);
                    var srcXb = Math.max(0, Math.round(s0b * tmpW - overlap));
                    var srcWb = Math.min(tmpW - srcXb, Math.ceil(destWb + 2 * overlap));
                    if (srcWb > 0) {
                        ctx.beginPath(); ctx.rect(destXb - overlap, -h / 2 - 1, srcWb + 0.5, h + 2); ctx.clip();
                        ctx.drawImage(tmpCanvas, srcXb, 0, srcWb, tmpH, destXb - overlap, -h / 2, srcWb, h);
                    }
                }
                ctx.restore();
            }
        } else {
        for (var seg = 0; seg < segs; seg++) {
            ctx.save();
            for (var j = 0; j < seg; j++) {
                if (Math.abs(segAngles[j]) < 0.001) continue;
                var ratio = j / segs;
                var px, py;
                if (isVert) { px = 0; py = -h / 2 + h * ratio; }
                else { px = -w / 2 + w * ratio; py = 0; }
                ctx.translate(px, py); ctx.rotate(segAngles[j] * Math.PI / 180); ctx.translate(-px, -py);
            }
            var s0 = seg / segs, s1 = (seg + 1) / segs;
            if (isVert) {
                var destY = -h / 2 + h * s0, destH = h * (s1 - s0);
                var srcY = Math.max(0, Math.round(s0 * tmpH - overlap));
                var srcH = Math.min(tmpH - srcY, Math.ceil(destH + 2 * overlap));
                if (srcH > 0) {
                    ctx.beginPath(); ctx.rect(-w / 2 - 1, destY - overlap, w + 2, srcH + 0.5); ctx.clip();
                    ctx.drawImage(tmpCanvas, 0, srcY, tmpW, srcH, -w / 2, destY - overlap, w, srcH);
                }
            } else {
                var destX = -w / 2 + w * s0, destW = w * (s1 - s0);
                var srcX = Math.max(0, Math.round(s0 * tmpW - overlap));
                var srcW = Math.min(tmpW - srcX, Math.ceil(destW + 2 * overlap));
                if (srcW > 0) {
                    ctx.beginPath(); ctx.rect(destX - overlap, -h / 2 - 1, srcW + 0.5, h + 2); ctx.clip();
                    ctx.drawImage(tmpCanvas, srcX, 0, srcW, tmpH, destX - overlap, -h / 2, srcW, h);
                }
            }
            ctx.restore();
        }
        }
        // Stroke drawn once after all segments
        if (obj.strokeWidth > 0) {
            ctx.strokeStyle = obj.stroke || '#000';
            ctx.lineWidth = obj.strokeWidth;
            ctx.strokeRect(-w / 2, -h / 2, w, h);
        }
        _drawFixedRegionOverlays();
        return;
    }
    // Clip-and-redraw for non-image types
    for (var seg = 0; seg < segs; seg++) {
        ctx.save();
        for (var j = 0; j < seg; j++) {
            if (Math.abs(segAngles[j]) < 0.001) continue;
            var ratio = j / segs;
            var px, py;
            if (isVert) { px = 0; py = -h / 2 + h * ratio; }
            else { px = -w / 2 + w * ratio; py = 0; }
            ctx.translate(px, py); ctx.rotate(segAngles[j] * Math.PI / 180); ctx.translate(-px, -py);
        }
        ctx.beginPath();
        var s0 = seg / segs, s1 = (seg + 1) / segs;
        if (isVert) { var sy = -h / 2 + h * s0, sh = h * (s1 - s0); ctx.rect(-w / 2 - 1, sy, w + 2, sh + 0.5); }
        else { var sx = -w / 2 + w * s0, sw2 = w * (s1 - s0); ctx.rect(sx, -h / 2 - 1, sw2 + 0.5, h + 2); }
        ctx.clip();
        drawContent();
        ctx.restore();
    }
    _drawFixedRegionOverlays();
}

function _getPreviewCrossWidth(obj, t, isVert, crossT) {
    t = Math.max(0, Math.min(1, t));
    var fullCross = isVert ? obj.width : obj.height;
    if (obj.type === 'image') {
        var span = isVert
            ? _prvGetOpaqueHorizontalSpanAtRow(obj._imgEl, t, crossT != null ? crossT : 0.5)
            : _prvGetOpaqueVerticalSpanAtColumn(obj._imgEl, t, crossT != null ? crossT : 0.5);
        if (span) {
            return isVert
                ? span.sizePixels * (obj.width / Math.max(1, span.bitmapWidth))
                : span.sizePixels * (obj.height / Math.max(1, span.bitmapHeight));
        }
        return fullCross;
    }
    switch (obj.type) {
        case 'circle': var inner = 1 - Math.pow(2*t-1, 2); return inner > 0 ? fullCross * Math.sqrt(inner) : 0;
        case 'triangle': return isVert ? fullCross * t : fullCross;
        case 'diamond': return fullCross * (t <= 0.5 ? t*2 : (1-t)*2);
        case 'star': case 'polygon': var R = Math.min(obj.width, obj.height)/2; var d = (t-0.5)*(isVert ? obj.height : obj.width); return Math.abs(d)>=R ? 0 : 2*Math.sqrt(R*R - d*d);
        case 'freeform':
            if (obj.closedPath !== false && obj.pathPoints && obj.pathPoints.length >= 3) {
                var pts = obj.pathPoints, minC = Infinity, maxC = -Infinity;
                if (isVert) {
                    var tgtY = obj.y + obj.height*t;
                    for (var i=0; i<pts.length; i++) {
                        var p1 = pts[i], p2 = pts[(i+1)%pts.length];
                        if ((p1.y<=tgtY && p2.y>=tgtY)||(p2.y<=tgtY && p1.y>=tgtY)) {
                            if (Math.abs(p2.y-p1.y)<0.001) { minC=Math.min(minC,p1.x,p2.x); maxC=Math.max(maxC,p1.x,p2.x); }
                            else { var f=(tgtY-p1.y)/(p2.y-p1.y); var ix=p1.x+f*(p2.x-p1.x); minC=Math.min(minC,ix); maxC=Math.max(maxC,ix); }
                        }
                    }
                } else {
                    var tgtX = obj.x + obj.width*t;
                    for (var i=0; i<pts.length; i++) {
                        var p1 = pts[i], p2 = pts[(i+1)%pts.length];
                        if ((p1.x<=tgtX && p2.x>=tgtX)||(p2.x<=tgtX && p1.x>=tgtX)) {
                            if (Math.abs(p2.x-p1.x)<0.001) { minC=Math.min(minC,p1.y,p2.y); maxC=Math.max(maxC,p1.y,p2.y); }
                            else { var f=(tgtX-p1.x)/(p2.x-p1.x); var iy=p1.y+f*(p2.y-p1.y); minC=Math.min(minC,iy); maxC=Math.max(maxC,iy); }
                        }
                    }
                }
                if (minC !== Infinity) return maxC - minC;
            }
            return fullCross;
        default: return fullCross;
    }
}

function _drawWithJointsPreview(ctx, obj, drawContent) {
    var jts = obj.joints.slice().sort(function(a,b){return a.position-b.position});
    var dir = _getPreviewJointDirectionMeta(obj.jointDirection);
    var axisRatio = function(position) { return dir.isReverse ? 1 - position : position; };
    var ps = [0]; jts.forEach(function(j){ps.push(j.position)}); ps.push(1);
    var w = obj.width, h = obj.height;
    var objSF = obj.contourSize != null ? obj.contourSize : 1;
    var objCC = obj.contourColor || null;
    var partKey = String(obj._armatureRoleKey || obj._armaturePartKey || (obj.bodyPartData && obj.bodyPartData.partKey) || '').toLowerCase();
    var suppressHeadNeckJointContours = partKey === 'head-neck' || partKey === 'neck' || /head[- ]?neck/.test(partKey);
    var headNeckSegmentOverlap = suppressHeadNeckJointContours ? Math.max(2, Math.min(w, h) * 0.045) : 0;
    // Draw contour discs BEFORE segments so bone edges overlap and cover disc edges
    if (obj.jointContours && !suppressHeadNeckJointContours) {
        jts.forEach(function(jt) {
            var jr = axisRatio(jt.position);
            var co = jt.crossOffset != null ? jt.crossOffset : 0.5;
            var crossW = _getPreviewCrossWidth(obj, jr, dir.isVertical, co);
            var sf = jt.contourSize != null ? jt.contourSize : objSF;
            var cRadius = (crossW / 2) * sf;
            if (cRadius <= 0) return;
            var cColor = jt.contourColor || objCC || null;
            var jpx = dir.isVertical ? -w/2 + w*co : -w/2 + w*jr;
            var jpy = dir.isVertical ? -h/2 + h*jr : -h/2 + h*co;
            ctx.save();
            for (var ji2=0; ji2<jts.length; ji2++) {
                if (jts[ji2].position >= jt.position) break;
                var sj = jts[ji2], sjr = axisRatio(sj.position);
                var sjco = sj.crossOffset != null ? sj.crossOffset : 0.5;
                var sx2 = dir.isVertical ? -w/2 + w*sjco : -w/2 + w*sjr;
                var sy2 = dir.isVertical ? -h/2 + h*sjr : -h/2 + h*sjco;
                ctx.translate(sx2, sy2); ctx.rotate(sj.angle*Math.PI/180);
                var stx=Math.max(-45,Math.min(45,sj.tiltX||0)),sty=Math.max(-45,Math.min(45,sj.tiltY||0));
                if(Math.abs(stx)>0.01||Math.abs(sty)>0.01){var tr2=stx*Math.PI/180,tr3=sty*Math.PI/180;ctx.transform(Math.max(0.2,Math.cos(tr3)),-Math.tan(tr3)*0.18,Math.tan(tr2)*0.18,Math.max(0.2,Math.cos(tr2)),0,0);}
                ctx.translate(-sx2, -sy2);
            }
            if (!cColor && obj.type === 'image' && obj._imgEl) {
                var sampleX2 = dir.isVertical ? co : jr;
                var sampleY2 = dir.isVertical ? jr : co;
                cColor = _prvSampleColorAt(obj._imgEl, sampleX2, sampleY2);
            }
            ctx.fillStyle = cColor || '#888';
            ctx.beginPath();
            ctx.arc(jpx, jpy, cRadius, 0, Math.PI*2);
            ctx.fill();
            ctx.restore();
        });
    }
    for (var si=0; si<ps.length-1; si++) {
        ctx.save();
        for (var ji=0; ji<si; ji++) {
            var jt=jts[ji];
            var jr = axisRatio(jt.position);
            var co = jt.crossOffset != null ? jt.crossOffset : 0.5;
            var jpx= dir.isVertical ? -w/2 + w*co : -w/2 + w*jr;
            var jpy= dir.isVertical ? -h/2 + h*jr : -h/2 + h*co;
            ctx.translate(jpx,jpy); ctx.rotate(jt.angle*Math.PI/180);
            var jtx=Math.max(-45,Math.min(45,jt.tiltX||0)),jty=Math.max(-45,Math.min(45,jt.tiltY||0));
            if(Math.abs(jtx)>0.01||Math.abs(jty)>0.01){var txr=jtx*Math.PI/180,tyr=jty*Math.PI/180;ctx.transform(Math.max(0.2,Math.cos(tyr)),-Math.tan(tyr)*0.18,Math.tan(txr)*0.18,Math.max(0.2,Math.cos(txr)),0,0);}
            ctx.translate(-jpx,-jpy);
        }
        ctx.beginPath();
        var start = axisRatio(ps[si]);
        var end = axisRatio(ps[si+1]);
        if(dir.isVertical){var sy=-h/2+h*Math.min(start,end),sh=h*Math.abs(end-start); ctx.rect(-w/2-1,sy-headNeckSegmentOverlap,w+2,sh+0.5+headNeckSegmentOverlap*2);}
        else{var sx=-w/2+w*Math.min(start,end),sw=w*Math.abs(end-start); ctx.rect(sx-headNeckSegmentOverlap,-h/2-1,sw+0.5+headNeckSegmentOverlap*2,h+2);}
        ctx.clip();
        drawContent();
        ctx.restore();
    }
}

function _drawRigContoursPreview(ctx, obj) {
    if (!obj.rigging || !obj.rigging.bones) return;
    var pins = obj.rigging.pins;
    var bones = obj.rigging.bones;
    var sampled = obj._imgEl ? _prvSampleColorAt(obj._imgEl, 0.5, 0.5) : null;
    var color = obj.contourColor || sampled || obj.pinContourColor || '#888';
    var sf = obj.contourSize != null ? obj.contourSize : 1;
    for (var bi = 0; bi < bones.length; bi++) {
        var bone = bones[bi];
        var cp = null;
        for (var pi = 0; pi < pins.length; pi++) {
            if (pins[pi].id === bone.childPinId) { cp = pins[pi]; break; }
        }
        if (!cp) continue;
        var pp = null;
        for (var pi = 0; pi < pins.length; pi++) {
            if (pins[pi].id === bone.parentPinId) { pp = pins[pi]; break; }
        }
        if (!pp) continue;
        var cx = (cp.x - 0.5) * obj.width;
        var cy = (cp.y - 0.5) * obj.height;
        var dx = (cp.x - pp.x) * obj.width;
        var dy = (cp.y - pp.y) * obj.height;
        var boneLen = Math.sqrt(dx * dx + dy * dy);
        var r = Math.max(4, boneLen * 0.25) * sf;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }
}

// ── Contour pixel helpers for preview ──
var _prvContourPixCache = new WeakMap();
function _prvGetContourPixels(imgEl) {
    if (!imgEl) return null;
    var cached = _prvContourPixCache.get(imgEl);
    if (cached) return cached;
    try {
        var w = imgEl.naturalWidth || imgEl.width;
        var h = imgEl.naturalHeight || imgEl.height;
        if (!w || !h) return null;
        var cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        var cx = cv.getContext('2d', { willReadFrequently: true });
        cx.drawImage(imgEl, 0, 0, w, h);
        var result = { pixels: cx.getImageData(0, 0, w, h).data, w: w, h: h };
        _prvContourPixCache.set(imgEl, result);
        return result;
    } catch (e) { return null; }
}
function _prvGetOpaqueHorizontalSpanAtRow(imgEl, normalizedY, normalizedX) {
    var px = _prvGetContourPixels(imgEl);
    if (!px) return null;
    normalizedX = normalizedX != null ? normalizedX : 0.5;
    var w = px.w, h = px.h, pixels = px.pixels;
    var centerRow = Math.round(Math.max(0, Math.min(h - 1, normalizedY * (h - 1))));
    var band = Math.max(1, Math.round(h * 0.025));
    var rStart = Math.max(0, centerRow - band);
    var rEnd = Math.min(h - 1, centerRow + band);
    var targetX = Math.round(Math.max(0, Math.min(w - 1, normalizedX * (w - 1))));
    var best = null;
    for (var row = rStart; row <= rEnd; row++) {
        var rowOffset = row * w * 4;
        var x = 0;
        while (x < w) {
            while (x < w && pixels[rowOffset + x * 4 + 3] < 128) x++;
            if (x >= w) break;
            var start = x;
            while (x < w && pixels[rowOffset + x * 4 + 3] >= 128) x++;
            var end = x - 1;
            var size = end - start + 1;
            var contains = targetX >= start && targetX <= end;
            var dist = contains ? 0 : Math.min(Math.abs(targetX - start), Math.abs(targetX - end));
            var rowPenalty = Math.abs(row - centerRow) * 2;
            var score = (contains ? 100000 : 0) - dist * 8 - rowPenalty + size * 0.25;
            if (!best || score > best.score) {
                best = { start: start, end: end, row: row, size: size, score: score };
            }
        }
    }
    if (!best) return null;
    var denom = Math.max(1, w - 1);
    return {
        startPixel: best.start,
        endPixel: best.end,
        rowPixel: best.row,
        sizePixels: best.size,
        bitmapWidth: w,
        bitmapHeight: h,
        start: best.start / denom,
        end: best.end / denom,
        center: ((best.start + best.end) * 0.5) / denom
    };
}
function _prvGetOpaqueVerticalSpanAtColumn(imgEl, normalizedX, normalizedY) {
    var px = _prvGetContourPixels(imgEl);
    if (!px) return null;
    normalizedY = normalizedY != null ? normalizedY : 0.5;
    var w = px.w, h = px.h, pixels = px.pixels;
    var centerCol = Math.round(Math.max(0, Math.min(w - 1, normalizedX * (w - 1))));
    var band = Math.max(1, Math.round(w * 0.025));
    var cStart = Math.max(0, centerCol - band);
    var cEnd = Math.min(w - 1, centerCol + band);
    var targetY = Math.round(Math.max(0, Math.min(h - 1, normalizedY * (h - 1))));
    var best = null;
    for (var col = cStart; col <= cEnd; col++) {
        var y = 0;
        while (y < h) {
            while (y < h && pixels[(y * w + col) * 4 + 3] < 128) y++;
            if (y >= h) break;
            var start = y;
            while (y < h && pixels[(y * w + col) * 4 + 3] >= 128) y++;
            var end = y - 1;
            var size = end - start + 1;
            var contains = targetY >= start && targetY <= end;
            var dist = contains ? 0 : Math.min(Math.abs(targetY - start), Math.abs(targetY - end));
            var colPenalty = Math.abs(col - centerCol) * 2;
            var score = (contains ? 100000 : 0) - dist * 8 - colPenalty + size * 0.25;
            if (!best || score > best.score) {
                best = { start: start, end: end, col: col, size: size, score: score };
            }
        }
    }
    if (!best) return null;
    var denom = Math.max(1, h - 1);
    return {
        startPixel: best.start,
        endPixel: best.end,
        colPixel: best.col,
        sizePixels: best.size,
        bitmapWidth: w,
        bitmapHeight: h,
        start: best.start / denom,
        end: best.end / denom,
        center: ((best.start + best.end) * 0.5) / denom
    };
}
function _prvMeasureOpaqueWidth(imgEl, normalizedY) {
    var span = _prvGetOpaqueHorizontalSpanAtRow(imgEl, normalizedY, 0.5);
    return span ? span.sizePixels : 0;
}
function _prvSampleColorAt(imgEl, normalizedX, normalizedY) {
    var px = _prvGetContourPixels(imgEl);
    if (!px) return null;
    var w = px.w, h = px.h, pixels = px.pixels;
    var sx = Math.round(normalizedX * (w - 1));
    var sy = Math.round(normalizedY * (h - 1));
    var sr = Math.max(3, Math.round(Math.min(w, h) * 0.06));
    var x0 = Math.max(0, sx - sr), y0 = Math.max(0, sy - sr);
    var x1 = Math.min(w, sx + sr + 1), y1 = Math.min(h, sy + sr + 1);
    var rs = 0, gs = 0, bs = 0, cnt = 0;
    for (var row = y0; row < y1; row++) {
        for (var col = x0; col < x1; col++) {
            var idx = (row * w + col) * 4;
            if (pixels[idx + 3] < 128) continue;
            rs += pixels[idx]; gs += pixels[idx + 1]; bs += pixels[idx + 2]; cnt++;
        }
    }
    if (cnt === 0) return null;
    rs = Math.round(rs / cnt); gs = Math.round(gs / cnt); bs = Math.round(bs / cnt);
    return '#' + ((1 << 24) + (rs << 16) + (gs << 8) + bs).toString(16).slice(1);
}

function _getPreviewArmatureAttachmentJoint(obj) {
    var roleKey = obj && (obj._armaturePartKey || obj._armatureRoleKey || (obj.bodyPartData && obj.bodyPartData.partKey) || '');
    if (!roleKey || !Array.isArray(obj.joints) || obj.joints.length === 0) return null;
    var partKey = String(roleKey).toLowerCase();
    var joints = obj.joints.slice().sort(function(a, b) { return a.position - b.position; });
    var byName = new Map(joints.map(function(jt) {
        return [String((jt && jt.name) || '').toLowerCase(), jt];
    }));

    if (partKey === 'head-neck') {
        return byName.get('neck') || joints[0] || null;
    }
    if (partKey.endsWith('-arm') || partKey === 'left-arm' || partKey === 'right-arm') {
        for (var index = 0; index < joints.length; index++) {
            var joint = joints[index];
            if (String((joint && joint.name) || '').toLowerCase().indexOf('shoulder') !== -1) return joint;
        }
        return joints[0] || null;
    }
    return null;
}

function _getPreviewArmatureAttachmentJointWorldPosition(obj, jt) {
    if (!jt || !obj || !Array.isArray(obj.joints) || obj.joints.length === 0) return null;
    var dir = _getPreviewJointDirectionMeta(obj.jointDirection);
    var sorted = obj.joints.slice().sort(function(a, b) { return a.position - b.position; });
    var targetIndex = sorted.findIndex(function(sj) { return (sj && sj.id) === (jt && jt.id); });
    if (targetIndex < 0) return _getPreviewJointWorldPosition(obj, jt);

    var axisRatio = dir.isReverse ? 1 - jt.position : jt.position;
    var co = jt.crossOffset != null ? jt.crossOffset : 0.5;
    var point = {
        x: dir.isVertical ? obj.x + obj.width * co : obj.x + obj.width * axisRatio,
        y: dir.isVertical ? obj.y + obj.height * axisRatio : obj.y + obj.height * co
    };

    for (var index = 0; index < targetIndex; index++) {
        var sj = sorted[index];
        var sjRatio = dir.isReverse ? 1 - sj.position : sj.position;
        var sjCo = sj.crossOffset != null ? sj.crossOffset : 0.5;
        var pivot = {
            x: dir.isVertical ? obj.x + obj.width * sjCo : obj.x + obj.width * sjRatio,
            y: dir.isVertical ? obj.y + obj.height * sjRatio : obj.y + obj.height * sjCo
        };
        var rad = (sj.angle || 0) * Math.PI / 180;
        var cos = Math.cos(rad);
        var sin = Math.sin(rad);
        var dx = point.x - pivot.x;
        var dy = point.y - pivot.y;
        var rx = dx * cos - dy * sin;
        var ry = dx * sin + dy * cos;
        var tiltX = Math.max(-45, Math.min(45, sj.tiltX || 0));
        var tiltY = Math.max(-45, Math.min(45, sj.tiltY || 0));
        if (Math.abs(tiltX) > 0.01 || Math.abs(tiltY) > 0.01) {
            var radX = tiltX * Math.PI / 180;
            var radY = tiltY * Math.PI / 180;
            var a = Math.max(0.2, Math.cos(radY));
            var b = -Math.tan(radY) * 0.18;
            var c = Math.tan(radX) * 0.18;
            var d = Math.max(0.2, Math.cos(radX));
            var tx = rx * a + ry * c;
            var ty = rx * b + ry * d;
            rx = tx;
            ry = ty;
        }
        point = { x: pivot.x + rx, y: pivot.y + ry };
    }

    return _transformPreviewDisplayPoint(obj, point);
}

function drawPinContoursPreview(ctx, objects) {
    for (var i = 0; i < objects.length; i++) {
        var obj = objects[i];
        if (!obj.pinContour || !obj.pinnedTo || obj.visible === false) continue;
        var parent = null;
        for (var j = 0; j < objects.length; j++) {
            if (objects[j].id === obj.pinnedTo) { parent = objects[j]; break; }
        }
        if (!parent) continue;
        var pvx = obj.pivotX !== undefined ? obj.pivotX : 0.5;
        var pvy = obj.pivotY !== undefined ? obj.pivotY : 0.5;
        var sf = obj.contourSize != null ? obj.contourSize : 1;

        // Measure child limb width at its pivot row (connecting edge)
        var anchorY = obj.pinAnchorY != null ? obj.pinAnchorY : 0.5;
        var anchorX = obj.pinAnchorX != null ? obj.pinAnchorX : 0.5;
        var partKey = obj._armatureRoleKey || obj._armaturePartKey || ((obj.bodyPartData && obj.bodyPartData.partKey) ? obj.bodyPartData.partKey : '');
        var childDirection = _getPreviewJointDirectionMeta(obj.jointDirection);
        var attachmentJoint = obj._armatureAttachmentPin ? _getPreviewArmatureAttachmentJoint(obj) : null;
        var attachmentAxisRatio = attachmentJoint
            ? (childDirection.isReverse ? 1 - attachmentJoint.position : attachmentJoint.position)
            : (childDirection.isVertical ? pvy : pvx);
        var attachmentCrossRatio = attachmentJoint
            ? (attachmentJoint.crossOffset != null ? attachmentJoint.crossOffset : 0.5)
            : (childDirection.isVertical ? pvx : pvy);
        var pivot = attachmentJoint
            ? (_getPreviewArmatureAttachmentJointWorldPosition(obj, attachmentJoint) || _getPreviewObjectWorldPoint(obj, pvx, pvy))
            : _getPreviewObjectWorldPoint(obj, pvx, pvy);
        var isShoulder = /upper-?arm/i.test(partKey) || /^(r|l)-arm$/i.test(partKey) || /(left|right|front|back)-arm$/i.test(partKey);
        var childImg = obj._imgEl;
        var parentImg = parent._imgEl;
        var widthSampleY = isShoulder ? Math.max(pvy, Math.min(0.2, pvy + 0.035)) : pvy;
        var childStageW = _getPreviewCrossWidthAbs(obj, attachmentAxisRatio, childDirection.isVertical, attachmentCrossRatio);
        var parentStageW = 0;
        if (isShoulder && parentImg) {
            var parentSpan = _prvGetOpaqueHorizontalSpanAtRow(parentImg, anchorY, anchorX);
            if (parentSpan) {
                var anchorPx = Math.max(
                    parentSpan.startPixel,
                    Math.min(
                        parentSpan.endPixel,
                        Math.round(Math.max(0, Math.min(1, anchorX)) * Math.max(1, parentSpan.bitmapWidth - 1))
                    )
                );
                var edgeDepthPx = Math.min(
                    Math.abs(anchorPx - parentSpan.startPixel),
                    Math.abs(parentSpan.endPixel - anchorPx)
                );
                var socketPixels = Math.max(1, edgeDepthPx * 2 + 1);
                parentStageW = socketPixels * (parent.width / Math.max(1, parentSpan.bitmapWidth));
            }
        }

        var crossW;
        if (isShoulder && parentStageW > 0) {
            var localArmW = Math.max(childStageW || 0, Math.min(obj.width, obj.height) * 0.2);
            var localSocketW = Math.max(parentStageW || 0, 0);
            crossW = Math.max(localArmW, localSocketW);
            crossW = Math.min(
                crossW,
                Math.max(localArmW * 1.12, localSocketW * 1.15, Math.min(obj.width, obj.height) * 0.7)
            );
        } else if (childStageW > 0) {
            crossW = childStageW;
        } else {
            crossW = Math.min(obj.width, obj.height) * 0.5;
        }

        // Pin contours should follow the originating limb diameter rather than
        // reading like a broad bridge between connected parts.
        var isNeckLike = /head[- ]?neck|^neck$/i.test(partKey);
        if (isNeckLike || /neck/i.test(partKey)) continue;
        if (isShoulder) crossW *= 0.84;
        else if (/head/i.test(partKey) && !isNeckLike) crossW *= 0.45;
        else if (isNeckLike || /neck/i.test(partKey)) crossW *= 0.74;
        else crossW *= 0.82;

        crossW *= sf;
        if (isNeckLike || /neck/i.test(partKey)) {
            crossW = Math.min(crossW, Math.max(3, Math.min(obj.width, obj.height) * 0.24));
        }
        if (isNeckLike) {
            if (crossW < 2) continue;
            var neckColor = (childImg ? _prvSampleColorAt(childImg, attachmentCrossRatio, attachmentAxisRatio) : null) || obj.contourColor || obj.pinContourColor || '#888';
            ctx.save();
            ctx.globalAlpha = obj.opacity ?? 1;
            ctx.beginPath();
            ctx.arc(pivot.x, pivot.y, crossW / 2, 0, Math.PI * 2);
            ctx.fillStyle = neckColor;
            ctx.fill();
            ctx.restore();
            continue;
        }

        var parentExtension = isShoulder ? crossW * 0.04 : crossW * 0.18;
        var childExtension = isShoulder ? crossW * 0.12 : crossW * 0.2;
        var mainLen = crossW + parentExtension + childExtension;
        if (crossW < 2) continue;

        // Limb axis from child rotation
        var localDX = (0.5 - pvx) * obj.width;
        var localDY = (0.5 - pvy) * obj.height;
        if (isShoulder) {
            var outerDir = anchorX < 0.5 ? -1 : 1;
            var targetXRatio = Math.max(0, Math.min(1, 0.5 + outerDir * 0.28));
            var targetYRatio = Math.max(pvy + 0.2, 0.24);
            localDX = (targetXRatio - pvx) * obj.width;
            localDY = (targetYRatio - pvy) * obj.height;
        }
        var localLen = Math.sqrt(localDX * localDX + localDY * localDY);
        var axAngle;
        if (localLen > 0.5) {
            var rot = (obj.rotation || 0) * Math.PI / 180;
            var cosR = Math.cos(rot), sinR = Math.sin(rot);
            axAngle = Math.atan2(localDX * sinR + localDY * cosR, localDX * cosR - localDY * sinR);
        } else {
            var pCX = parent.x + parent.width * 0.5;
            var pCY = parent.y + parent.height * 0.5;
            axAngle = Math.atan2(pivot.y - pCY, pivot.x - pCX);
        }

        // Sample color from child limb at the pivot point
        var childColor = childImg ? _prvSampleColorAt(childImg, attachmentCrossRatio, attachmentAxisRatio) : null;
        var parentColor = isShoulder && parentImg ? _prvSampleColorAt(parentImg, anchorX, anchorY) : null;
        var color = obj.contourColor || childColor || parentColor || obj.pinContourColor || '#888';
        ctx.save();
        ctx.globalAlpha = obj.opacity ?? 1;
        ctx.translate(pivot.x, pivot.y);
        ctx.rotate(axAngle - Math.PI / 2 + ((obj.contourRotation || 0) * Math.PI / 180));
        var hw = crossW / 2;
        var drawTop = -(crossW / 2) - parentExtension;
        ctx.beginPath();
        ctx.roundRect(-hw, drawTop, crossW, mainLen, hw);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
    }
}

function _transformPreviewDisplayPoint(obj, point, options) {
    options = options || {};
    var includeDepthScale = options.includeDepthScale !== false;
    var includeTilt = options.includeTilt !== false;
    var pivotX = obj.x + obj.width * (obj.pivotX ?? 0.5);
    var pivotY = obj.y + obj.height * (obj.pivotY ?? 0.5);
    var depthScale = includeDepthScale ? _previewGetDepthScale(obj) : 1;
    var effScaleX = (obj.scaleX ?? 1) * depthScale * (obj.flipH ? -1 : 1);
    var effScaleY = (obj.scaleY ?? 1) * depthScale * (obj.flipV ? -1 : 1);
    var tilt = includeTilt ? getPreviewTiltTransform(obj) : { a: 1, b: 0, c: 0, d: 1, active: false };
    var rad = (obj.rotation || 0) * Math.PI / 180;
    var cos = Math.cos(rad), sin = Math.sin(rad);
    var dx = (point.x - pivotX) * effScaleX;
    var dy = (point.y - pivotY) * effScaleY;
    if (tilt.active) {
        var tiltedX = dx * tilt.a + dy * tilt.c;
        var tiltedY = dx * tilt.b + dy * tilt.d;
        dx = tiltedX;
        dy = tiltedY;
    }
    if (obj.rotation) {
        var rotatedX = dx * cos - dy * sin;
        var rotatedY = dx * sin + dy * cos;
        dx = rotatedX;
        dy = rotatedY;
    }
    return {
        x: pivotX + dx,
        y: pivotY + dy
    };
}

function _getPreviewObjectWorldPoint(obj, anchorX, anchorY) {
    var baseX = obj.x + obj.width * (anchorX != null ? anchorX : 0.5);
    var baseY = obj.y + obj.height * (anchorY != null ? anchorY : 0.5);
    return _transformPreviewDisplayPoint(obj, { x: baseX, y: baseY });
}

function _getPreviewPinTargetJoint(parent, child) {
    if (!parent || !child || child.pinTargetType !== 'joint' || !Array.isArray(parent.joints) || parent.joints.length === 0) return null;
    return parent.joints.find(function(jt) {
        return (child.pinJointId && jt.id === child.pinJointId) ||
            (child.pinJointName && jt.name === child.pinJointName);
    }) || null;
}

function _getPreviewJointWorldPosition(obj, jt) {
    var dir = _getPreviewJointDirectionMeta(obj.jointDirection);
    var axisRatio = dir.isReverse ? 1 - jt.position : jt.position;
    var co = jt.crossOffset != null ? jt.crossOffset : 0.5;
    var px = dir.isVertical ? obj.x + obj.width * co : obj.x + obj.width * axisRatio;
    var py = dir.isVertical ? obj.y + obj.height * axisRatio : obj.y + obj.height * co;
    var sorted = (obj.joints || []).slice().sort(function(a, b) { return a.position - b.position; });
    for (var i = 0; i < sorted.length; i++) {
        var sj = sorted[i];
        if (sj.position >= jt.position) break;
        var sjRatio = dir.isReverse ? 1 - sj.position : sj.position;
        var sjCo = sj.crossOffset != null ? sj.crossOffset : 0.5;
        var sjx = dir.isVertical ? obj.x + obj.width * sjCo : obj.x + obj.width * sjRatio;
        var sjy = dir.isVertical ? obj.y + obj.height * sjRatio : obj.y + obj.height * sjCo;
        var srad = (sj.angle || 0) * Math.PI / 180;
        var scos = Math.cos(srad), ssin = Math.sin(srad);
        var dx = px - sjx, dy = py - sjy;
        var rx = dx * scos - dy * ssin;
        var ry = dx * ssin + dy * scos;
        var stx = Math.max(-45, Math.min(45, sj.tiltX || 0));
        var sty = Math.max(-45, Math.min(45, sj.tiltY || 0));
        if (Math.abs(stx) > 0.01 || Math.abs(sty) > 0.01) {
            var trX = stx * Math.PI / 180;
            var trY = sty * Math.PI / 180;
            var a = Math.max(0.2, Math.cos(trY));
            var b = -Math.tan(trY) * 0.18;
            var c = Math.tan(trX) * 0.18;
            var d = Math.max(0.2, Math.cos(trX));
            var tx = rx * a + ry * c;
            var ty = rx * b + ry * d;
            rx = tx;
            ry = ty;
        }
        px = sjx + rx;
        py = sjy + ry;
    }
    if (obj.rotation) {
        var pivotX = obj.x + obj.width * (obj.pivotX ?? 0.5);
        var pivotY = obj.y + obj.height * (obj.pivotY ?? 0.5);
        var rad = obj.rotation * Math.PI / 180;
        var cos = Math.cos(rad), sin = Math.sin(rad);
        var dx = px - pivotX, dy = py - pivotY;
        px = pivotX + dx * cos - dy * sin;
        py = pivotY + dx * sin + dy * cos;
    }
    return { x: px, y: py };
}

function _getPreviewJointWorldAngle(obj, jt) {
    if (!jt) return obj.rotation || 0;
    var sorted = (obj.joints || []).slice().sort(function(a, b) { return a.position - b.position; });
    var handedness = (((obj.scaleX != null ? obj.scaleX : 1) * (obj.flipH ? -1 : 1)) * ((obj.scaleY != null ? obj.scaleY : 1) * (obj.flipV ? -1 : 1))) < 0 ? -1 : 1;
    var angle = obj.rotation || 0;
    for (var i = 0; i < sorted.length; i++) {
        var sj = sorted[i];
        angle += (sj.angle || 0) * handedness;
        if (sj.id === jt.id) break;
        if (sj.position >= jt.position) break;
    }
    return angle;
}

function _applyPreviewTiltTransformToVector(x, y, tilt) {
    if (!tilt || !tilt.active) return { x: x, y: y };
    return {
        x: x * tilt.a + y * tilt.c,
        y: x * tilt.b + y * tilt.d
    };
}

function _getPreviewPinTargetTransform(parent, child) {
    if (!parent) return null;
    var joint = _getPreviewPinTargetJoint(parent, child);
    if (joint) {
        var point = _getPreviewJointWorldPosition(parent, joint);
        var dir = _getPreviewJointDirectionMeta(parent.jointDirection);
        var axisRatio = dir.isReverse ? 1 - joint.position : joint.position;
        var combinedTiltX = Math.max(-45, Math.min(45, (parent.tiltX || 0) + (joint.tiltX || 0)));
        var combinedTiltY = Math.max(-45, Math.min(45, (parent.tiltY || 0) + (joint.tiltY || 0)));
        return {
            x: point.x,
            y: point.y,
            rotation: _getPreviewJointWorldAngle(parent, joint),
            tiltX: combinedTiltX,
            tiltY: combinedTiltY,
            tiltTransform: {
                a: Math.max(0.2, Math.cos(combinedTiltY * Math.PI / 180)),
                b: -Math.tan(combinedTiltY * Math.PI / 180) * 0.18,
                c: Math.tan(combinedTiltX * Math.PI / 180) * 0.18,
                d: Math.max(0.2, Math.cos(combinedTiltX * Math.PI / 180)),
                active: Math.abs(combinedTiltX) > 0.01 || Math.abs(combinedTiltY) > 0.01
            },
            joint: joint,
            anchorX: dir.isVertical ? (joint.crossOffset != null ? joint.crossOffset : 0.5) : axisRatio,
            anchorY: dir.isVertical ? axisRatio : (joint.crossOffset != null ? joint.crossOffset : 0.5)
        };
    }
    var anchorX = child.pinAnchorX != null ? child.pinAnchorX : 0.5;
    var anchorY = child.pinAnchorY != null ? child.pinAnchorY : 0.5;
    var point = _getPreviewObjectWorldPoint(parent, anchorX, anchorY);
    return {
        x: point.x,
        y: point.y,
        rotation: parent.rotation || 0,
        tiltX: parent.tiltX || 0,
        tiltY: parent.tiltY || 0,
        tiltTransform: getPreviewTiltTransform(parent),
        joint: null,
        anchorX: anchorX,
        anchorY: anchorY
    };
}

function resolvePinsPreview(objects) {
    var lookup = {};
    objects.forEach(function(o){ lookup[o.id] = o; });
    for (var pass=0; pass<10; pass++) {
        var moved = false;
        objects.forEach(function(obj) {
            var pinParentId = obj.pinnedTo || obj._ucGarmentForPartId || obj.ucGarmentForPartId || obj._facialParentHead || obj.facialParentHead || null;
            if (!pinParentId) {
                if (obj.bodyPartData && obj.jointBaseAngle !== undefined) {
                    obj.rotation = obj.jointBaseAngle;
                }
                return;
            }
            var parent = lookup[pinParentId];
            if (!parent) return;
            var target = _getPreviewPinTargetTransform(parent, obj);
            if (!target) return;
            var mode = obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static');
            if (mode === 'inherit') {
                if (obj._armaturePartKey) {
                    obj.rotation = (target.rotation || 0) + (obj.jointBaseAngle || 0);
                } else {
                    obj.rotation = target.rotation || 0;
                }
            } else if (mode === 'joint') {
                obj.rotation = (target.rotation || 0) + (obj.jointBaseAngle || 0);
            }
            if (mode === 'inherit' || mode === 'joint') {
                obj.tiltX = Math.max(-45, Math.min(45, (target.tiltX || 0) + (obj.pinBaseTiltX || 0)));
                obj.tiltY = Math.max(-45, Math.min(45, (target.tiltY || 0) + (obj.pinBaseTiltY || 0)));
            }

            var rad = (target.rotation || 0) * Math.PI / 180;
            var cos = Math.cos(rad), sin = Math.sin(rad);
            var worldOffsetX = ((obj.pinOffsetX||0)*cos - (obj.pinOffsetY||0)*sin);
            var worldOffsetY = ((obj.pinOffsetX||0)*sin + (obj.pinOffsetY||0)*cos);
            var tiltedOffset = _applyPreviewTiltTransformToVector(worldOffsetX, worldOffsetY, target.tiltTransform);
            var desiredPivotWorldX = target.x + tiltedOffset.x;
            var desiredPivotWorldY = target.y + tiltedOffset.y;
            var attachmentJoint = obj._armatureAttachmentPin ? _getPreviewArmatureAttachmentJoint(obj) : null;
            if (attachmentJoint) {
                var attachmentWorld = _getPreviewArmatureAttachmentJointWorldPosition(obj, attachmentJoint) || _getPreviewJointWorldPosition(obj, attachmentJoint);
                var pivotWorld = _getPreviewObjectWorldPoint(obj, obj.pivotX ?? 0.5, obj.pivotY ?? 0.5);
                if (attachmentWorld && pivotWorld) {
                    desiredPivotWorldX += pivotWorld.x - attachmentWorld.x;
                    desiredPivotWorldY += pivotWorld.y - attachmentWorld.y;
                }
            }
            var nx = desiredPivotWorldX - obj.width*(obj.pivotX??0.5);
            var ny = desiredPivotWorldY - obj.height*(obj.pivotY??0.5);
            if (Math.abs(obj.x-nx)>0.01 || Math.abs(obj.y-ny)>0.01) {
                moved = true;
                if (obj.pathPoints && obj.pathPoints.length > 0) {
                    var pdx = nx - obj.x, pdy = ny - obj.y;
                    obj.pathPoints.forEach(function(p) { p.x += pdx; p.y += pdy; });
                }
            }
            obj.x = nx; obj.y = ny;
            if (obj._pinInheritParentJointName && (mode === 'inherit' || mode === 'joint')) {
                var inheritedJointName = obj._pinInheritParentJointName;
                var inheritedJoint = (parent.joints || []).find(function(jt) { return jt && jt.name === inheritedJointName; });
                if (inheritedJoint) obj.rotation += inheritedJoint.angle || 0;
            }
            if (obj.pinSyncJoints && parent.joints && parent.joints.length > 0 && obj.joints && obj.joints.length > 0) {
                var parentJoints = parent.joints.slice().sort(function(a, b) { return a.position - b.position; });
                var childJoints = obj.joints.slice().sort(function(a, b) { return a.position - b.position; });
                var parentByName = {};
                parentJoints.forEach(function(jt) {
                    var name = String((jt && jt.name) || '').toLowerCase().trim();
                    if (name) parentByName[name] = jt;
                });
                childJoints.forEach(function(childJoint, index) {
                    var childName = String((childJoint && childJoint.name) || '').toLowerCase().trim();
                    var parentJoint = (childName && parentByName[childName]) ? parentByName[childName] : parentJoints[index];
                    if (!parentJoint) return;
                    childJoint.angle = parentJoint.angle ?? 0;
                    childJoint.tiltX = parentJoint.tiltX ?? 0;
                    childJoint.tiltY = parentJoint.tiltY ?? 0;
                    childJoint.crossOffset = parentJoint.crossOffset ?? 0.5;
                });
            }
        });
        if (!moved) break;
    }
}

function applyJointAngles(objects) {
    objects.forEach(function(obj) {
        if (!obj.joints || !obj.joints.length) return;
        var sorted = obj.joints.slice().sort(function(a,b){return a.position-b.position});
        for (var i = 0; i < sorted.length; i++) {
            var key = 'jointAngle_' + i;
            if (obj[key] !== undefined) sorted[i].angle = obj[key];
            var txKey = 'jointTiltX_' + i;
            if (obj[txKey] !== undefined) sorted[i].tiltX = obj[txKey];
            var tyKey = 'jointTiltY_' + i;
            if (obj[tyKey] !== undefined) sorted[i].tiltY = obj[tyKey];
            var coKey = 'jointCrossOffset_' + i;
            if (obj[coKey] !== undefined) sorted[i].crossOffset = obj[coKey];
        }
    });
}

function getPreviewTiltTransform(obj) {
    const tiltX = Math.max(-45, Math.min(45, obj.tiltX || 0));
    const tiltY = Math.max(-45, Math.min(45, obj.tiltY || 0));
    if (Math.abs(tiltX) < 0.01 && Math.abs(tiltY) < 0.01) {
        return { a: 1, b: 0, c: 0, d: 1, active: false };
    }
    const tx = tiltX * Math.PI / 180;
    const ty = tiltY * Math.PI / 180;
    return {
        a: Math.max(0.2, Math.cos(ty)),
        b: -Math.tan(ty) * 0.18,
        c: Math.tan(tx) * 0.18,
        d: Math.max(0.2, Math.cos(tx)),
        active: true
    };
}

function _previewSupportsDepthExtrusionType(obj) {
    const type = obj && obj.type;
    const isClosedFreeform = obj && obj.type === 'freeform' && obj.closedPath !== false
        && Array.isArray(obj.pathPoints) && obj.pathPoints.length >= 3;
    if (isClosedFreeform) return true;
    return [
        'image', 'rectangle', 'circle', 'triangle', 'star', 'polygon', 'diamond',
        'heart', 'roundedRectangle'
    ].indexOf(type) !== -1;
}

function _previewSupportsDepthScaleType(type) {
    return type === 'image' || type === 'icon';
}

function _previewGetDepthValue(obj) {
    const raw = typeof obj.depth === 'number' ? obj.depth : parseFloat(obj.depth);
    return Number.isFinite(raw) ? raw : 0;
}

function _previewGetDepthScale(obj) {
    const depth = _previewGetDepthValue(obj);
    const rawPerspective = typeof obj.depthPerspective === 'number' ? obj.depthPerspective : parseFloat(obj.depthPerspective);
    const perspective = Number.isFinite(rawPerspective) ? Math.max(0, Math.min(100, rawPerspective)) / 100 : 0;
    if (!_previewSupportsDepthScaleType(obj.type) || Math.abs(depth) < 0.01 || perspective <= 0.001) return 1;
    return Math.max(0.15, Math.min(6, 1 + depth * 0.004 * perspective));
}

function _previewHexToRgb(hex) {
    const safe = (typeof hex === 'string' ? hex.trim() : '').replace(/^#/, '');
    if (/^[0-9a-f]{3}$/i.test(safe)) {
        return {
            r: parseInt(safe[0] + safe[0], 16),
            g: parseInt(safe[1] + safe[1], 16),
            b: parseInt(safe[2] + safe[2], 16)
        };
    }
    if (/^[0-9a-f]{6}$/i.test(safe)) {
        return {
            r: parseInt(safe.slice(0, 2), 16),
            g: parseInt(safe.slice(2, 4), 16),
            b: parseInt(safe.slice(4, 6), 16)
        };
    }
    return { r: 74, g: 144, b: 217 };
}

function _previewRgbToHex(r, g, b) {
    const toHex = (v) => {
        const n = Math.max(0, Math.min(255, Math.round(v)));
        return n.toString(16).padStart(2, '0');
    };
    return '#' + toHex(r) + toHex(g) + toHex(b);
}

function _previewShadeHex(hex, amount) {
    const rgb = _previewHexToRgb(hex);
    const mix = (channel) => {
        if (amount >= 0) return Math.round(channel + (255 - channel) * amount);
        return Math.round(channel * (1 + amount));
    };
    return _previewRgbToHex(mix(rgb.r), mix(rgb.g), mix(rgb.b));
}

function _previewDepthFillBase(obj) {
    if (typeof obj.fill === 'string' && obj.fill.charAt(0) === '#') return obj.fill;
    if (typeof obj.stroke === 'string' && obj.stroke.charAt(0) === '#') return obj.stroke;
    return '#4a90d9';
}

function _previewDepthSideFillBase(obj) {
    if (typeof obj.depthSideColor === 'string' && /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(obj.depthSideColor)) {
        return obj.depthSideColor;
    }
    return _previewDepthFillBase(obj);
}

function _previewRoundedRectPoints(obj) {
    const w = obj.width || 0;
    const h = obj.height || 0;
    const hw = w / 2;
    const hh = h / 2;
    const r = Math.max(0, Math.min(Math.abs(obj.borderRadius || 0), Math.abs(hw), Math.abs(hh)));
    if (r < 0.01) {
        return [
            { x: -hw, y: -hh },
            { x: hw, y: -hh },
            { x: hw, y: hh },
            { x: -hw, y: hh }
        ];
    }
    const points = [];
    const corners = [
        { cx: hw - r, cy: -hh + r, start: -Math.PI / 2, end: 0 },
        { cx: hw - r, cy: hh - r, start: 0, end: Math.PI / 2 },
        { cx: -hw + r, cy: hh - r, start: Math.PI / 2, end: Math.PI },
        { cx: -hw + r, cy: -hh + r, start: Math.PI, end: Math.PI * 1.5 }
    ];
    const steps = 6;
    corners.forEach(corner => {
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const angle = corner.start + (corner.end - corner.start) * t;
            points.push({
                x: corner.cx + Math.cos(angle) * r,
                y: corner.cy + Math.sin(angle) * r
            });
        }
    });
    return points;
}

function _previewGetDepthBasePolygon(obj) {
    const cx = obj.x + obj.width / 2;
    const cy = obj.y + obj.height / 2;
    switch (obj.type) {
        case 'image':
            return _previewGetImageAlphaDepthPolygon(obj)
                || [
                    { x: -obj.width / 2, y: -obj.height / 2 },
                    { x: obj.width / 2, y: -obj.height / 2 },
                    { x: obj.width / 2, y: obj.height / 2 },
                    { x: -obj.width / 2, y: obj.height / 2 }
                ];
        case 'rectangle':
            return _previewRoundedRectPoints({ width: obj.width, height: obj.height, borderRadius: obj.borderRadius || 0 });
        case 'roundedRectangle':
            return _previewRoundedRectPoints(obj);
        case 'circle': {
            const pts = [];
            const steps = 48;
            for (let i = 0; i < steps; i++) {
                const angle = (i / steps) * Math.PI * 2;
                pts.push({
                    x: Math.cos(angle) * obj.width / 2,
                    y: Math.sin(angle) * obj.height / 2
                });
            }
            return pts;
        }
        case 'triangle':
            return [
                { x: 0, y: -obj.height / 2 },
                { x: obj.width / 2, y: obj.height / 2 },
                { x: -obj.width / 2, y: obj.height / 2 }
            ];
        case 'star': {
            const pts = [];
            const spikes = 10;
            const outerR = Math.min(obj.width, obj.height) / 2;
            const innerR = outerR * (obj.innerRadius || 0.4);
            for (let i = 0; i < spikes; i++) {
                const angle = (i * Math.PI / 5) - Math.PI / 2;
                const radius = i % 2 === 0 ? outerR : innerR;
                pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
            }
            return pts;
        }
        case 'polygon': {
            const pts = [];
            const sides = Math.max(3, obj.sides || 6);
            const radius = Math.min(obj.width, obj.height) / 2;
            for (let i = 0; i < sides; i++) {
                const angle = (i * Math.PI * 2 / sides) - Math.PI / 2;
                pts.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
            }
            return pts;
        }
        case 'diamond':
            return [
                { x: 0, y: -obj.height / 2 },
                { x: obj.width / 2, y: 0 },
                { x: 0, y: obj.height / 2 },
                { x: -obj.width / 2, y: 0 }
            ];
        case 'heart': {
            const pts = [];
            const steps = 48;
            for (let i = 0; i < steps; i++) {
                const t = (i / steps) * Math.PI * 2;
                const hx = 16 * Math.pow(Math.sin(t), 3);
                const hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
                pts.push({ x: hx * (obj.width / 36), y: hy * (obj.height / 36) });
            }
            return pts;
        }
        case 'freeform':
            if (obj.closedPath !== false && Array.isArray(obj.pathPoints) && obj.pathPoints.length >= 3) {
                return obj.pathPoints.map(point => ({ x: point.x - cx, y: point.y - cy }));
            }
            return null;
        default:
            return null;
    }
}

function _previewGetImageAlphaDepthPolygon(obj) {
    if (!obj || obj.type !== 'image' || !obj._imgEl) return null;
    const px = _prvGetContourPixels(obj._imgEl);
    if (!px || !px.pixels || !px.w || !px.h) return null;

    const w = px.w;
    const h = px.h;
    const pixels = px.pixels;
    const threshold = 24;
    const samples = Math.max(24, Math.min(96, Math.round(Math.max(w, h) / 10)));
    const rows = [];
    for (let i = 0; i < samples; i += 1) {
        const row = Math.round((i / Math.max(1, samples - 1)) * (h - 1));
        const band = Math.max(0, Math.round(h / samples / 2));
        let minX = w;
        let maxX = -1;
        for (let yy = Math.max(0, row - band); yy <= Math.min(h - 1, row + band); yy += 1) {
            const offset = yy * w * 4;
            for (let xx = 0; xx < w; xx += 1) {
                if (pixels[offset + xx * 4 + 3] >= threshold) {
                    if (xx < minX) minX = xx;
                    if (xx > maxX) maxX = xx;
                }
            }
        }
        if (maxX >= minX) rows.push({ y: row, minX, maxX });
    }
    if (rows.length < 2) return null;

    const isFullRect = rows.length >= samples * 0.9 && rows.every(row => row.minX <= 1 && row.maxX >= w - 2);
    if (isFullRect) return null;

    const denomX = Math.max(1, w - 1);
    const denomY = Math.max(1, h - 1);
    const left = rows.map(row => ({ x: -obj.width / 2 + (row.minX / denomX) * obj.width, y: -obj.height / 2 + (row.y / denomY) * obj.height }));
    const right = rows.slice().reverse().map(row => ({ x: -obj.width / 2 + (row.maxX / denomX) * obj.width, y: -obj.height / 2 + (row.y / denomY) * obj.height }));
    const raw = left.concat(right);
    const simplified = [];
    raw.forEach(point => {
        const prev = simplified[simplified.length - 1];
        if (!prev || Math.abs(prev.x - point.x) > Math.max(0.25, Math.abs(obj.width) * 0.003) || Math.abs(prev.y - point.y) > Math.max(0.25, Math.abs(obj.height) * 0.003)) {
            simplified.push(point);
        }
    });
    if (simplified.length >= 3) {
        const first = simplified[0];
        const last = simplified[simplified.length - 1];
        if (Math.abs(first.x - last.x) < 0.25 && Math.abs(first.y - last.y) < 0.25) simplified.pop();
    }
    return simplified.length >= 3 ? simplified : null;
}

function _previewSampleImageDepthEdgeColor(obj, edgeStart, edgeEnd, frontCenter) {
    if (!obj || obj.type !== 'image' || obj.depthSideMode === 'color' || !obj._imgEl) return null;
    const px = _prvGetContourPixels(obj._imgEl);
    if (!px || !px.pixels || !px.w || !px.h) return null;
    const samples = 13;
    const radius = 1;
    let r = 0, g = 0, b = 0, count = 0;
    for (let i = 0; i < samples; i += 1) {
        const t = samples === 1 ? 0.5 : i / (samples - 1);
        let localX = edgeStart.x + (edgeEnd.x - edgeStart.x) * t;
        let localY = edgeStart.y + (edgeEnd.y - edgeStart.y) * t;
        if (frontCenter) {
            localX += (frontCenter.x - localX) * 0.055;
            localY += (frontCenter.y - localY) * 0.055;
        }
        const ix = Math.max(0, Math.min(px.w - 1, Math.round(((localX + obj.width / 2) / Math.max(1, obj.width)) * (px.w - 1))));
        const iy = Math.max(0, Math.min(px.h - 1, Math.round(((localY + obj.height / 2) / Math.max(1, obj.height)) * (px.h - 1))));
        for (let yy = Math.max(0, iy - radius); yy <= Math.min(px.h - 1, iy + radius); yy += 1) {
            for (let xx = Math.max(0, ix - radius); xx <= Math.min(px.w - 1, ix + radius); xx += 1) {
                const idx = (yy * px.w + xx) * 4;
                if (px.pixels[idx + 3] < 24) continue;
                r += px.pixels[idx];
                g += px.pixels[idx + 1];
                b += px.pixels[idx + 2];
                count += 1;
            }
        }
    }
    if (!count) return null;
    return _previewRgbToHex(r / count, g / count, b / count);
}

function _previewPolygonCentroid(points) {
    let x = 0, y = 0;
    for (let i = 0; i < points.length; i++) {
        x += points[i].x;
        y += points[i].y;
    }
    const len = Math.max(1, points.length);
    return { x: x / len, y: y / len };
}

function _previewPolygonSignedArea(points) {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
        const next = points[(i + 1) % points.length];
        area += points[i].x * next.y - next.x * points[i].y;
    }
    return area / 2;
}

function _previewGetDepthExtrusionGeometry(obj) {
    const front = _previewGetDepthBasePolygon(obj);
    const depth = _previewGetDepthValue(obj);
    if (!front || front.length < 3 || Math.abs(depth) < 0.01) return null;
    const dx = Math.cos(-Math.PI / 4) * depth;
    const dy = Math.sin(-Math.PI / 4) * depth;
    const back = front.map(point => ({ x: point.x + dx, y: point.y + dy }));
    const orientation = _previewPolygonSignedArea(front) >= 0 ? 1 : -1;
    const quads = [];
    for (let i = 0; i < front.length; i++) {
        const next = (i + 1) % front.length;
        const edgeDx = front[next].x - front[i].x;
        const edgeDy = front[next].y - front[i].y;
        const outward = orientation >= 0
            ? { x: edgeDy, y: -edgeDx }
            : { x: -edgeDy, y: edgeDx };
        if (outward.x * dx + outward.y * dy > 0) {
            const quad = [front[i], front[next], back[next], back[i]];
            quad.edgeIndex = i;
            quads.push(quad);
        }
    }
    return { front, quads, extrusion: { dx, dy, active: true } };
}

function _previewDrawImageDepthLayer(ctx, obj, img, offsetX, offsetY, shadeAlpha) {
    if (!obj || !img || !(img.naturalWidth || img.width)) return false;
    const width = Math.max(1, obj.width || 1);
    const height = Math.max(1, obj.height || 1);
    const srcW = Math.max(1, img.naturalWidth || img.width || width);
    const srcH = Math.max(1, img.naturalHeight || img.height || height);
    const isCompressionActive = ((obj?._compressionRig?.amount || 0) > 0) || ((obj?._compressionPair?.amount || 0) > 0);
    const zoom = Number.isFinite(Number(obj.imageZoom)) ? Number(obj.imageZoom) : 1;
    const panX = Number.isFinite(Number(obj.imagePanX)) ? Number(obj.imagePanX) : 0;
    const panY = Number.isFinite(Number(obj.imagePanY)) ? Number(obj.imagePanY) : 0;
    const useCropFit = zoom > 1.0001 || Math.abs(panX) > 0.0001 || Math.abs(panY) > 0.0001;
    const x = -width / 2 + offsetX;
    const y = -height / 2 + offsetY;

    ctx.save();
    ctx.imageSmoothingEnabled = true;
    if ('imageSmoothingQuality' in ctx) ctx.imageSmoothingQuality = 'high';
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    if (obj.borderRadius > 0 && ctx.roundRect) ctx.roundRect(x, y, width, height, obj.borderRadius);
    else ctx.rect(x, y, width, height);
    ctx.clip();
    if (isCompressionActive || !useCropFit) {
        ctx.drawImage(img, x, y, width, height);
    } else {
        const safeZoom = Math.max(1, Math.min(2.5, zoom || 1));
        const safePanX = Math.max(-1, Math.min(1, panX || 0));
        const safePanY = Math.max(-1, Math.min(1, panY || 0));
        const coverScale = Math.max(width / srcW, height / srcH);
        const drawW = srcW * coverScale * safeZoom;
        const drawH = srcH * coverScale * safeZoom;
        const extraX = Math.max(0, drawW - width);
        const extraY = Math.max(0, drawH - height);
        const drawX = x - extraX / 2 - safePanX * (extraX / 2);
        const drawY = y - extraY / 2 - safePanY * (extraY / 2);
        ctx.drawImage(img, drawX, drawY, drawW, drawH);
    }
    ctx.globalCompositeOperation = 'source-atop';
    if (obj.depthSideMode === 'color' && obj.depthSideColor) {
        const savedAlpha = ctx.globalAlpha;
        ctx.globalAlpha = savedAlpha * Math.max(0.25, Math.min(0.86, shadeAlpha + 0.08));
        ctx.fillStyle = obj.depthSideColor;
        ctx.fillRect(x, y, width, height);
        ctx.globalAlpha = savedAlpha;
    } else {
        ctx.fillStyle = 'rgba(0, 0, 0, ' + Math.max(0.04, Math.min(0.82, shadeAlpha)) + ')';
        ctx.fillRect(x, y, width, height);
    }
    ctx.restore();
    return true;
}

function _previewRenderImageDepthSilhouette(ctx, obj, geometry) {
    if (!obj || obj.type !== 'image') return false;
    const img = (typeof _getGifFrame === 'function' ? _getGifFrame(obj) : null) || obj._imgEl;
    if (!img || !(img.naturalWidth || img.width)) return false;
    const extrusion = geometry?.extrusion;
    const length = Math.hypot(extrusion?.dx || 0, extrusion?.dy || 0);
    if (!extrusion?.active || length < 0.01) return false;
    const lightRaw = typeof obj.depthLighting === 'number' ? obj.depthLighting : parseFloat(obj.depthLighting);
    const light = Number.isFinite(lightRaw) ? Math.max(0, Math.min(100, lightRaw)) / 100 : 0.45;
    const steps = Math.max(6, Math.min(96, Math.ceil(length * 2)));
    for (let i = steps; i >= 0; i -= 1) {
        const t = i / steps;
        const shade = 0.08 + t * (0.62 - light * 0.22);
        _previewDrawImageDepthLayer(ctx, obj, img, extrusion.dx * t, extrusion.dy * t, shade);
    }
    return true;
}

function _previewRenderDepthExtrusion(ctx, obj) {
    const geometry = _previewGetDepthExtrusionGeometry(obj);
    if (!geometry) return false;
    const baseFill = _previewDepthFillBase(obj);
    const sideBaseFill = _previewDepthSideFillBase(obj);
    const lightRaw = typeof obj.depthLighting === 'number' ? obj.depthLighting : parseFloat(obj.depthLighting);
    const light = Number.isFinite(lightRaw) ? Math.max(0, Math.min(100, lightRaw)) / 100 : 0.45;
    const topFill = _previewShadeHex(baseFill, 0.06 + light * 0.24);
    const sideFill = _previewShadeHex(sideBaseFill, -0.46 + light * 0.28);
    const sideStroke = _previewShadeHex(obj.stroke || sideBaseFill, -0.52 + light * 0.24);
    const frontCenter = _previewPolygonCentroid(geometry.front);
    const quads = geometry.quads.slice().sort((a, b) => {
        const ca = _previewPolygonCentroid(a);
        const cb = _previewPolygonCentroid(b);
        return (ca.x + ca.y) - (cb.x + cb.y);
    });
    quads.forEach(quad => {
        const center = _previewPolygonCentroid(quad);
        const sampledSideColor = obj.type === 'image' ? null : _previewSampleImageDepthEdgeColor(obj, quad[0], quad[1], frontCenter);
        let fill = center.y < frontCenter.y && !sampledSideColor ? topFill : sideFill;
        if (sampledSideColor) {
            const frontMid = {
                x: (quad[0].x + quad[1].x) / 2,
                y: (quad[0].y + quad[1].y) / 2
            };
            const backMid = {
                x: (quad[2].x + quad[3].x) / 2,
                y: (quad[2].y + quad[3].y) / 2
            };
            const grad = ctx.createLinearGradient(frontMid.x, frontMid.y, backMid.x, backMid.y);
            grad.addColorStop(0, _previewShadeHex(sampledSideColor, -0.10 + light * 0.10));
            grad.addColorStop(0.45, _previewShadeHex(sampledSideColor, -0.38 + light * 0.16));
            grad.addColorStop(1, _previewShadeHex(sampledSideColor, -0.72 + light * 0.22));
            fill = grad;
        }
        const drawQuad = obj.type === 'image'
            ? quad.map(point => {
                const dx = point.x - frontCenter.x;
                const dy = point.y - frontCenter.y;
                const len = Math.hypot(dx, dy) || 1;
                const expand = 1.15;
                return { x: point.x + (dx / len) * expand, y: point.y + (dy / len) * expand };
            })
            : quad;
        ctx.beginPath();
        ctx.moveTo(drawQuad[0].x, drawQuad[0].y);
        for (let i = 1; i < drawQuad.length; i++) ctx.lineTo(drawQuad[i].x, drawQuad[i].y);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        if (obj.strokeWidth > 0) {
            ctx.strokeStyle = sideStroke;
            ctx.stroke();
        }
    });
    return true;
}

function drawStandaloneCustomShape(ctx, obj, centered) {
    const ox = centered ? -obj.width / 2 : obj.x;
    const oy = centered ? -obj.height / 2 : obj.y;
    if (obj.type === 'roundedRectangle') {
        const r = Math.min(Math.max(obj.borderRadius || Math.min(obj.width, obj.height) * 0.2, 8), obj.width / 2, obj.height / 2);
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(ox, oy, obj.width, obj.height, r);
        else ctx.rect(ox, oy, obj.width, obj.height);
        ctx.fill();
        if (obj.strokeWidth > 0) ctx.stroke();
        return;
    }
    ctx.beginPath();
    ctx.rect(ox, oy, obj.width, obj.height);
    ctx.fill();
    if (obj.strokeWidth > 0) ctx.stroke();
}

function drawObj(ctx, obj) {
    if (obj.visible === false) return;
    ctx.save();
    // Compute pivot-based rotation & scale (matches main stage renderer)
    const pvx = obj.pivotX !== undefined ? obj.pivotX : 0.5;
    const pvy = obj.pivotY !== undefined ? obj.pivotY : 0.5;
    const pivotAbsX = obj.x + obj.width * pvx;
    const pivotAbsY = obj.y + obj.height * pvy;
    const extrusionActive = _previewSupportsDepthExtrusionType(obj)
        && Math.abs(_previewGetDepthValue(obj)) >= 0.01
        && !(obj.joints && obj.joints.length > 0)
        && !(obj.flexEnabled && obj.flexPins && obj.flexPins.length > 0);
    if (obj.rotation) {
        ctx.translate(pivotAbsX, pivotAbsY);
        ctx.rotate((obj.rotation||0) * Math.PI/180);
        ctx.translate(-pivotAbsX, -pivotAbsY);
    }
    const depthScale = _previewGetDepthScale(obj);
    const effSX = (obj.scaleX||1) * depthScale * (obj.flipH ? -1 : 1);
    const effSY = (obj.scaleY||1) * depthScale * (obj.flipV ? -1 : 1);
    if (effSX !== 1 || effSY !== 1) {
        ctx.translate(pivotAbsX, pivotAbsY);
        ctx.scale(effSX, effSY);
        ctx.translate(-pivotAbsX, -pivotAbsY);
    }
    const tilt = getPreviewTiltTransform(obj);
    // Apply tilt around the object's pivot to match _transformPreviewDisplayPoint()
    // (which is used for joint/pin world positions). Using the object center instead of
    // the pivot here causes pinned limbs to visually disconnect from their parent
    // joints whenever pivot != center (e.g. arms pivoted at the shoulder).
    const imageDepthTiltActive = obj.type === 'image' && extrusionActive;
    if (tilt.active && (!extrusionActive || imageDepthTiltActive)) {
        ctx.translate(pivotAbsX, pivotAbsY);
        ctx.transform(tilt.a, tilt.b, tilt.c, tilt.d, 0, 0);
        ctx.translate(-pivotAbsX, -pivotAbsY);
    }
    ctx.translate(obj.x + obj.width/2, obj.y + obj.height/2);
    ctx.globalAlpha = obj.opacity ?? 1;

    // Glow effect
    if (obj.glowEnabled) {
        ctx.shadowColor = obj.glowColor || '#00bfff';
        ctx.shadowBlur = obj.glowSize || 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }
    // Shadow effect
    else if (obj.shadow) {
        ctx.shadowColor = obj.shadowColor || 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = obj.shadowBlur ?? 10;
        ctx.shadowOffsetX = obj.shadowOffsetX ?? 2;
        ctx.shadowOffsetY = obj.shadowOffsetY ?? 4;
    }

    // Resolve fill (gradient/pattern/solid)
    ctx.fillStyle = resolveFill(ctx, obj);
    ctx.strokeStyle = obj.stroke || '#000';
    ctx.lineWidth = obj.strokeWidth || 0;

    // Stroke dash
    if (obj.strokeDash && obj.strokeDash !== 'solid') {
        const sw = obj.strokeWidth || 2;
        switch(obj.strokeDash) {
            case 'dashed': ctx.setLineDash([sw*4, sw*2]); break;
            case 'dotted': ctx.setLineDash([sw, sw*2]); break;
            case 'dash-dot': ctx.setLineDash([sw*4, sw*2, sw, sw*2]); break;
        }
    } else { ctx.setLineDash([]); }
    ctx.lineCap = obj.strokeCap || 'round';
    ctx.lineJoin = obj.strokeJoin || 'round';

    // Clip animation support (wipe, strips, wheel, wedge)
    const _clipNames = ['_clipWipeRight','_clipWipeLeft','_clipWipeUp','_clipWipeDown',
                        '_clipStripsH','_clipStripsV','_clipWheel','_clipWedge'];
    let _ca = null, _cp = 1;
    for (const cn of _clipNames) { if (obj[cn] !== undefined) { _ca = cn; _cp = obj[cn]; break; } }
    if (_ca !== null) {
        if (_cp <= 0) { ctx.restore(); return; }
        if (_cp < 1) {
            const cw = Math.abs(obj.width) || 1, ch = Math.abs(obj.height) || 1;
            ctx.beginPath();
            switch (_ca) {
                case '_clipWipeRight': ctx.rect(-cw/2, -ch/2, cw * _cp, ch); break;
                case '_clipWipeLeft':  ctx.rect(cw/2 - cw * _cp, -ch/2, cw * _cp, ch); break;
                case '_clipWipeDown':  ctx.rect(-cw/2, -ch/2, cw, ch * _cp); break;
                case '_clipWipeUp':    ctx.rect(-cw/2, ch/2 - ch * _cp, cw, ch * _cp); break;
                case '_clipStripsH': {
                    const n = 10, sh = ch / n;
                    for (let i = 0; i < n; i++) ctx.rect(-cw/2, -ch/2 + i*sh + sh/2*(1-_cp), cw, sh*_cp);
                    break;
                }
                case '_clipStripsV': {
                    const n = 10, sw = cw / n;
                    for (let i = 0; i < n; i++) ctx.rect(-cw/2 + i*sw + sw/2*(1-_cp), -ch/2, sw*_cp, ch);
                    break;
                }
                case '_clipWheel': {
                    const r = Math.sqrt(cw*cw + ch*ch)/2 + 10, spokes = 4;
                    for (let i = 0; i < spokes; i++) {
                        const sa = i*2*Math.PI/spokes - Math.PI/2;
                        ctx.moveTo(0,0); ctx.arc(0,0,r,sa,sa+(2*Math.PI/spokes)*_cp); ctx.lineTo(0,0);
                    }
                    break;
                }
                case '_clipWedge': {
                    const r = Math.sqrt(cw*cw + ch*ch)/2 + 10;
                    ctx.moveTo(0,0); ctx.arc(0,0,r,-Math.PI/2-Math.PI*_cp,-Math.PI/2+Math.PI*_cp);
                    ctx.lineTo(0,0); ctx.closePath();
                    break;
                }
            }
            ctx.clip();
        }
    }

    // Joint-aware rendering: extract shape drawing into a callable
    const _drawShapeAndText = (targetCtx = ctx) => {
    const ctx = targetCtx;
    switch(obj.type) {
        case 'rectangle':
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(-obj.width/2,-obj.height/2,obj.width,obj.height,obj.borderRadius||0);
            else { ctx.rect(-obj.width/2,-obj.height/2,obj.width,obj.height); }
            if (!_drawPreviewTextureIntoCurrentPath(ctx, obj)) ctx.fill();
            if(obj.strokeWidth>0) ctx.stroke();
            break;
        case 'circle':
            ctx.beginPath();
            ctx.ellipse(0,0,obj.width/2,obj.height/2,0,0,Math.PI*2);
            ctx.fill(); if(obj.strokeWidth>0) ctx.stroke();
            break;
        case 'triangle':
            ctx.beginPath();
            ctx.moveTo(0,-obj.height/2);
            ctx.lineTo(obj.width/2,obj.height/2);
            ctx.lineTo(-obj.width/2,obj.height/2);
            ctx.closePath();
            ctx.fill(); if(obj.strokeWidth>0) ctx.stroke();
            break;
        case 'star':
            ctx.beginPath();
            for(let i=0;i<10;i++){const r=i%2===0?Math.min(obj.width,obj.height)/2:Math.min(obj.width,obj.height)/2*(obj.innerRadius||0.4);const a=(i*Math.PI/5)-Math.PI/2;const m=i===0?'moveTo':'lineTo';ctx[m](r*Math.cos(a),r*Math.sin(a));}
            ctx.closePath(); ctx.fill(); if(obj.strokeWidth>0) ctx.stroke();
            break;
        case 'polygon':
            const sides = obj.sides || 6;
            ctx.beginPath();
            for(let i=0;i<sides;i++){const a=(i*2*Math.PI/sides)-Math.PI/2;const r=Math.min(obj.width,obj.height)/2;const m=i===0?'moveTo':'lineTo';ctx[m](r*Math.cos(a),r*Math.sin(a));}
            ctx.closePath(); ctx.fill(); if(obj.strokeWidth>0) ctx.stroke();
            break;
        case 'roundedRectangle':
        case 'parallelogram':
        case 'trapezium':
        case 'hexagon':
        case 'heptagon':
        case 'pie':
        case 'chord':
        case 'teardrop':
        case 'lShape':
        case 'can':
        case 'plaque':
        case 'cube':
        case 'doughnut':
        case 'blockArc':
        case 'brace':
        case 'bracket':
        case 'bentArrow':
        case 'uTurnArrow':
        case 'quadArrow':
        case 'upDownArrow':
        case 'upArrowCallout':
        case 'elbowArrowConnector':
            drawStandaloneCustomShape(ctx, obj, true);
            break;
        case 'diamond':
            ctx.beginPath();
            ctx.moveTo(0,-obj.height/2);
            ctx.lineTo(obj.width/2, 0);
            ctx.lineTo(0, obj.height/2);
            ctx.lineTo(-obj.width/2, 0);
            ctx.closePath();
            ctx.fill(); if(obj.strokeWidth>0) ctx.stroke();
            break;
        case 'heart': {
            const w=obj.width, h=obj.height, topY=h*0.3;
            ctx.beginPath();
            ctx.moveTo(0, -h/2+topY);
            ctx.bezierCurveTo(0,-h/2, -w/2,-h/2, -w/2,-h/2+topY);
            ctx.bezierCurveTo(-w/2,(-h/2+topY+h/2)/2+topY*0.1, 0,h/2*0.6, 0,h/2);
            ctx.bezierCurveTo(0,h/2*0.6, w/2,(-h/2+topY+h/2)/2+topY*0.1, w/2,-h/2+topY);
            ctx.bezierCurveTo(w/2,-h/2, 0,-h/2, 0,-h/2+topY);
            ctx.closePath();
            ctx.fill(); if(obj.strokeWidth>0) ctx.stroke();
            break;
        }
        case 'arrow': {
            const hw=obj.width/2, hh=obj.height/2;
            const len=Math.sqrt(obj.width**2+obj.height**2);
            const sw=obj.strokeWidth||2;
            const headLen=Math.max(sw*4, Math.min(len*0.35, len*0.2+sw*2));
            const angle=Math.atan2(obj.height,obj.width);
            const shaftEndX=hw-headLen*0.5*Math.cos(angle);
            const shaftEndY=hh-headLen*0.5*Math.sin(angle);
            ctx.strokeStyle=obj.fill; ctx.lineWidth=sw; ctx.lineCap='round';
            ctx.beginPath(); ctx.moveTo(-hw,-hh); ctx.lineTo(shaftEndX,shaftEndY); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(hw,hh);
            ctx.lineTo(hw-headLen*Math.cos(angle-Math.PI/6),hh-headLen*Math.sin(angle-Math.PI/6));
            ctx.lineTo(hw-headLen*Math.cos(angle+Math.PI/6),hh-headLen*Math.sin(angle+Math.PI/6));
            ctx.closePath(); ctx.fillStyle=obj.fill; ctx.fill();
            break;
        }
        case 'doubleArrow': {
            const hw=obj.width/2, hh=obj.height/2;
            const len=Math.sqrt(obj.width**2+obj.height**2);
            const sw=obj.strokeWidth||2;
            const headLen=Math.max(sw*4, Math.min(len*0.35, len*0.2+sw*2));
            const angle=Math.atan2(obj.height,obj.width);
            const sx=-hw+headLen*0.5*Math.cos(angle);
            const sy=-hh+headLen*0.5*Math.sin(angle);
            const ex=hw-headLen*0.5*Math.cos(angle);
            const ey=hh-headLen*0.5*Math.sin(angle);
            ctx.strokeStyle=obj.fill; ctx.lineWidth=sw; ctx.lineCap='round';
            ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(ex,ey); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(hw,hh);
            ctx.lineTo(hw-headLen*Math.cos(angle-Math.PI/6),hh-headLen*Math.sin(angle-Math.PI/6));
            ctx.lineTo(hw-headLen*Math.cos(angle+Math.PI/6),hh-headLen*Math.sin(angle+Math.PI/6));
            ctx.closePath(); ctx.fillStyle=obj.fill; ctx.fill();
            const rev=angle+Math.PI;
            ctx.beginPath(); ctx.moveTo(-hw,-hh);
            ctx.lineTo(-hw-headLen*Math.cos(rev-Math.PI/6),-hh-headLen*Math.sin(rev-Math.PI/6));
            ctx.lineTo(-hw-headLen*Math.cos(rev+Math.PI/6),-hh-headLen*Math.sin(rev+Math.PI/6));
            ctx.closePath(); ctx.fillStyle=obj.fill; ctx.fill();
            break;
        }
        case 'curvedArrow': {
            const hw=obj.width/2, hh=obj.height/2;
            const sw=obj.strokeWidth||2;
            ctx.strokeStyle=obj.fill; ctx.lineWidth=sw; ctx.lineCap='round';
            ctx.beginPath();
            ctx.moveTo(-hw,hh);
            ctx.quadraticCurveTo(0,-hh-obj.height*0.3, hw,-hh);
            ctx.stroke();
            const len=Math.sqrt(obj.width**2+obj.height**2);
            const headLen=Math.max(sw*3, Math.min(len*0.3, len*0.15+sw*2));
            const t=0.95,mt=1-t;
            const cpx=0,cpy=-hh-obj.height*0.3;
            const tx2=2*mt*(cpx-(-hw))+2*t*(hw-cpx);
            const ty2=2*mt*(cpy-hh)+2*t*(-hh-cpy);
            const a=Math.atan2(ty2,tx2);
            ctx.beginPath(); ctx.moveTo(hw,-hh);
            ctx.lineTo(hw-headLen*Math.cos(a-Math.PI/6),-hh-headLen*Math.sin(a-Math.PI/6));
            ctx.lineTo(hw-headLen*Math.cos(a+Math.PI/6),-hh-headLen*Math.sin(a+Math.PI/6));
            ctx.closePath(); ctx.fillStyle=obj.fill; ctx.fill();
            break;
        }
        case 'scribble':
            if (obj.pathPoints && obj.pathPoints.length >= 2) {
                const cx=obj.x+obj.width/2, cy=obj.y+obj.height/2;
                ctx.strokeStyle=obj.fill; ctx.lineWidth=obj.strokeWidth||3;
                ctx.lineCap='round'; ctx.lineJoin='round';
                ctx.beginPath();
                ctx.moveTo(obj.pathPoints[0].x-cx,obj.pathPoints[0].y-cy);
                for(let i=1;i<obj.pathPoints.length-1;i++){
                    const xc=(obj.pathPoints[i].x+obj.pathPoints[i+1].x)/2-cx;
                    const yc=(obj.pathPoints[i].y+obj.pathPoints[i+1].y)/2-cy;
                    ctx.quadraticCurveTo(obj.pathPoints[i].x-cx,obj.pathPoints[i].y-cy,xc,yc);
                }
                const last=obj.pathPoints[obj.pathPoints.length-1];
                ctx.lineTo(last.x-cx,last.y-cy);
                ctx.stroke();
            }
            break;
        case 'freeform':
            if (obj.pathPoints && obj.pathPoints.length >= 3) {
                const cx=obj.x+obj.width/2, cy=obj.y+obj.height/2;
                ctx.beginPath();
                ctx.moveTo(obj.pathPoints[0].x-cx,obj.pathPoints[0].y-cy);
                for(let i=1;i<obj.pathPoints.length-1;i++){
                    const xc=(obj.pathPoints[i].x+obj.pathPoints[i+1].x)/2-cx;
                    const yc=(obj.pathPoints[i].y+obj.pathPoints[i+1].y)/2-cy;
                    ctx.quadraticCurveTo(obj.pathPoints[i].x-cx,obj.pathPoints[i].y-cy,xc,yc);
                }
                ctx.closePath();
                ctx.fill(); if(obj.strokeWidth>0) ctx.stroke();
            }
            break;
        case 'text': {
            const transformText = (value) => {
                const text = String(value || '');
                if (obj.textTransform === 'uppercase') return text.toUpperCase();
                if (obj.textTransform === 'lowercase') return text.toLowerCase();
                if (obj.textTransform === 'title') return text.replace(/\b([A-Za-z][A-Za-z'’-]*)\b/g, (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
                return text;
            };
            ctx.fillStyle = obj.textColor || obj.fill || '#fff';
            const fStyle = (obj.fontStyle === 'italic') ? 'italic ' : '';
            ctx.font = fStyle+(obj.fontWeight||'normal')+' '+(obj.fontSize||24)+'px '+(obj.fontFamily||'Arial');
            ctx.textAlign = obj.textAlign || 'center';
            ctx.textBaseline = 'top';
            ctx.shadowColor = obj.shadow ? (obj.shadowColor || 'rgba(0,0,0,0.3)') : 'transparent';
            ctx.shadowBlur = obj.shadow ? (obj.shadowBlur ?? 10) : 0;
            ctx.shadowOffsetX = obj.shadow ? (obj.shadowOffsetX ?? 2) : 0;
            ctx.shadowOffsetY = obj.shadow ? (obj.shadowOffsetY ?? 4) : 0;
            const wordSpacingPx = Number(obj.wordSpacing) || 0;
            if (wordSpacingPx !== 0 && 'wordSpacing' in ctx) {
                try { ctx.wordSpacing = wordSpacingPx + 'px'; } catch (_) { /* unsupported */ }
            }
            const pad = 6;
            const maxW = Math.max(1, (obj.width || 0) - pad * 2);
            const lines = [];
            const listStyle = obj.listStyle || 'none';
            const stripLeadingMarker = (line) => String(line || '').replace(/^\s*(?:[•●◦‣▪▶➤➔→★]|[-–—]|\d{1,3}\.|\d{1,3}\))\s+/, '');
            const markerFor = (index) => {
                switch (listStyle) {
                    case 'bullet': return '•';
                    case 'dash': return '–';
                    case 'check': return '✓';
                    case 'arrow': return '➤';
                    case 'number': return (index + 1) + '.';
                    default: return '';
                }
            };
            let listIndex = 0;
            transformText(obj.text).split('\\n').forEach(paragraph => {
                const hasMarker = listStyle !== 'none' && String(paragraph || '').trim();
                const marker = hasMarker ? markerFor(listIndex++) : '';
                if (hasMarker) paragraph = marker + ' ' + stripLeadingMarker(paragraph);
                const words = paragraph.split(/\s+/).filter(Boolean);
                if (!words.length) {
                    lines.push('');
                    return;
                }
                let currentLine = '';
                words.forEach(word => {
                    const testLine = currentLine ? currentLine + ' ' + word : word;
                    if (ctx.measureText(testLine).width > maxW && currentLine) {
                        lines.push(currentLine);
                        currentLine = word;
                    } else {
                        currentLine = testLine;
                    }
                });
                lines.push(currentLine);
            });
            const lh = (obj.fontSize||24) * (obj.lineHeight||1.4);
            const totalH = lines.length * lh;
            const vAlign = obj.textVerticalAlign || 'middle';
            const vPad = 6;
            let textStartY;
            if (vAlign === 'top') textStartY = -(obj.height || totalH) / 2 + vPad;
            else if (vAlign === 'bottom') textStartY = (obj.height || totalH) / 2 - totalH - vPad;
            else textStartY = -totalH / 2;
            let textX = 0;
            if (obj.textAlign === 'left') textX = -obj.width/2 + pad;
            else if (obj.textAlign === 'right') textX = obj.width/2 - pad;
            const textStrokeWidth = Math.max(0, Number(obj.textStrokeWidth) || 0);
            const backgroundEnabled = !!obj.textBackgroundEnabled;
            const backgroundPadding = Math.max(0, Number(obj.textBackgroundPadding) || 0);
            const backgroundRadius = Math.max(0, Number(obj.textBackgroundRadius) || 0);
            const spacing = Number(obj.letterSpacing) || 0;
            const measureLineWidth = (line) => {
                const chars = Array.from(line || '');
                if (!chars.length) return 0;
                return chars.reduce((sum, char, index) => sum + ctx.measureText(char).width + (index < chars.length - 1 ? spacing : 0), 0);
            };
            const lineWidths = lines.map(measureLineWidth);
            const drawTextBackground = () => {
                if (!backgroundEnabled || !lines.length) return;
                const maxLineWidth = lineWidths.reduce((max, width) => Math.max(max, width), 0);
                const fontSize = obj.fontSize || 24;
                const textHeight = lines.length > 0 ? ((lines.length - 1) * lh) + fontSize : fontSize;
                let blockLeft = textX;
                if (obj.textAlign === 'center') blockLeft = -maxLineWidth / 2;
                else if (obj.textAlign === 'right') blockLeft = textX - maxLineWidth;
                const blockTop = textStartY - backgroundPadding * 0.6;

                ctx.save();
                ctx.shadowColor = 'transparent';
                ctx.shadowBlur = 0;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 0;
                ctx.fillStyle = obj.textBackgroundColor || '#111827';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, textHeight + backgroundPadding * 1.2, backgroundRadius);
                else ctx.rect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, textHeight + backgroundPadding * 1.2);
                ctx.fill();
                ctx.restore();
            };
            const drawCurvedLine = (line, lineIndex) => {
                const chars = Array.from(line || '');
                const curveDegrees = Number(obj.textCurve) || 0;
                const curveRadians = curveDegrees * Math.PI / 180;
                if (Math.abs(curveRadians) < 0.01 || chars.length < 2) return false;
                const advances = chars.map((char, index) => ctx.measureText(char).width + (index < chars.length - 1 ? spacing : 0));
                const totalAdvance = advances.reduce((sum, width) => sum + width, 0);
                if (totalAdvance <= 0) return false;
                const radius = Math.max(totalAdvance / Math.abs(curveRadians), (obj.fontSize || 24) * 1.6);
                const baseLineY = textStartY + lineIndex * lh + (obj.fontSize || 24) * 0.1;
                const circleCenterY = baseLineY + (curveDegrees > 0 ? radius : -radius);
                const baseAngle = curveDegrees > 0 ? -Math.PI / 2 : Math.PI / 2;
                let cursor = -totalAdvance / 2;
                ctx.save();
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                chars.forEach((char, index) => {
                    const charWidth = ctx.measureText(char).width;
                    const midAdvance = cursor + charWidth / 2;
                    const angle = baseAngle + (midAdvance / totalAdvance) * curveRadians;
                    const glyphX = radius * Math.cos(angle);
                    const glyphY = circleCenterY + radius * Math.sin(angle);
                    const rotation = angle + (curveDegrees > 0 ? Math.PI / 2 : -Math.PI / 2);
                    ctx.save();
                    ctx.translate(glyphX, glyphY);
                    ctx.rotate(rotation);
                    if (textStrokeWidth > 0) {
                        ctx.lineWidth = textStrokeWidth;
                        ctx.lineJoin = 'round';
                        ctx.strokeStyle = obj.textStrokeColor || '#000000';
                        ctx.strokeText(char, 0, 0);
                    }
                    ctx.fillText(char, 0, 0);
                    if (obj.textDecoration && obj.textDecoration !== 'none') {
                        ctx.strokeStyle = ctx.fillStyle;
                        ctx.lineWidth = Math.max(1, (obj.fontSize || 24) * 0.06);
                        if (obj.textDecoration.includes('underline')) {
                            ctx.beginPath();
                            ctx.moveTo(-charWidth / 2, (obj.fontSize || 24) * 0.38);
                            ctx.lineTo(charWidth / 2, (obj.fontSize || 24) * 0.38);
                            ctx.stroke();
                        }
                        if (obj.textDecoration.includes('line-through')) {
                            ctx.beginPath();
                            ctx.moveTo(-charWidth / 2, 0);
                            ctx.lineTo(charWidth / 2, 0);
                            ctx.stroke();
                        }
                    }
                    ctx.restore();
                    cursor += advances[index];
                });
                ctx.restore();
                return true;
            };
            drawTextBackground();
            lines.forEach((line, li) => {
                if (drawCurvedLine(line, li)) return;
                const ly = textStartY + li * lh;
                if (obj.letterSpacing && obj.letterSpacing !== 0) {
                    ctx.letterSpacing = obj.letterSpacing + 'px';
                }
                if (textStrokeWidth > 0) {
                    ctx.lineWidth = textStrokeWidth;
                    ctx.lineJoin = 'round';
                    ctx.strokeStyle = obj.textStrokeColor || '#000000';
                    ctx.strokeText(line, textX, ly, maxW);
                }
                ctx.fillText(line, textX, ly, maxW);
                // Text decoration
                if (obj.textDecoration && obj.textDecoration !== 'none') {
                    const tm = ctx.measureText(line);
                    let dx = 0;
                    if (obj.textAlign === 'center') dx = -tm.width/2;
                    else if (obj.textAlign === 'right') dx = -tm.width;
                    if (obj.textDecoration.includes('underline')) {
                        ctx.beginPath();
                        ctx.strokeStyle = ctx.fillStyle;
                        ctx.lineWidth = Math.max(1, (obj.fontSize||24)*0.06);
                        ctx.moveTo(textX+dx, ly+lh*0.85);
                        ctx.lineTo(textX+dx+tm.width, ly+lh*0.85);
                        ctx.stroke();
                    }
                    if (obj.textDecoration.includes('line-through')) {
                        ctx.beginPath();
                        ctx.strokeStyle = ctx.fillStyle;
                        ctx.lineWidth = Math.max(1, (obj.fontSize||24)*0.06);
                        ctx.moveTo(textX+dx, ly+lh*0.45);
                        ctx.lineTo(textX+dx+tm.width, ly+lh*0.45);
                        ctx.stroke();
                    }
                }
            });
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            break;
        }
        case 'line':
            ctx.strokeStyle = obj.stroke || obj.fill;
            ctx.lineWidth = obj.strokeWidth || 2;
            ctx.beginPath();
            ctx.moveTo(-obj.width/2, -obj.height/2);
            ctx.lineTo(obj.width/2, obj.height/2);
            ctx.stroke();
            break;
        case 'image':
            if (obj._imgEl && obj._imgEl.complete && obj._imgEl.naturalWidth) {
                // Try mesh deformation first (bone-pose rigging)
                if (obj.rigging && obj.rigging.pins && obj.rigging.pins.length > 0 && RigUtils.renderDeformed(ctx, obj)) {
                    // Mesh deformation was rendered
                    if (obj.rigContours) _drawRigContoursPreview(ctx, obj);
                    if (obj.strokeWidth > 0) ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
                } else {
                ctx.save();
                // Build CSS filter string from image properties
                const imgFilters = [];
                if (obj.imgBrightness) imgFilters.push('brightness(' + (1 + obj.imgBrightness / 100) + ')');
                if (obj.imgContrast) imgFilters.push('contrast(' + (1 + obj.imgContrast / 100) + ')');
                if (obj.imgSaturation) imgFilters.push('saturate(' + (1 + obj.imgSaturation / 100) + ')');
                if (obj.imgHue) imgFilters.push('hue-rotate(' + obj.imgHue + 'deg)');
                if (obj.imgBlur) imgFilters.push('blur(' + obj.imgBlur + 'px)');
                if (obj.imgGrayscale) imgFilters.push('grayscale(' + obj.imgGrayscale + '%)');
                if (obj.imgSepia) imgFilters.push('sepia(' + obj.imgSepia + '%)');
                if (obj.imgInvert) imgFilters.push('invert(' + obj.imgInvert + '%)');
                if (imgFilters.length > 0) ctx.filter = imgFilters.join(' ');

                const img = _getGifFrame(obj);
                const isCompressionActive = ((obj?._compressionRig?.amount || 0) > 0) || ((obj?._compressionPair?.amount || 0) > 0);
                const mustClipToBounds = true;

                if (mustClipToBounds) {
                    ctx.beginPath();
                    if (obj.borderRadius > 0 && ctx.roundRect) ctx.roundRect(-obj.width/2, -obj.height/2, obj.width, obj.height, obj.borderRadius);
                    else ctx.rect(-obj.width/2, -obj.height/2, obj.width, obj.height);
                    ctx.clip();
                }

                const zoom = Number.isFinite(Number(obj.imageZoom)) ? Number(obj.imageZoom) : 1;
                const panX = Number.isFinite(Number(obj.imagePanX)) ? Number(obj.imagePanX) : 0;
                const panY = Number.isFinite(Number(obj.imagePanY)) ? Number(obj.imagePanY) : 0;
                const useCropFit = zoom > 1.0001 || Math.abs(panX) > 0.0001 || Math.abs(panY) > 0.0001;

                if (isCompressionActive || !useCropFit) {
                    ctx.drawImage(img, -obj.width / 2, -obj.height / 2, obj.width, obj.height);
                } else {
                    const imgW = Math.max(1, img.naturalWidth || img.width || obj.width || 1);
                    const imgH = Math.max(1, img.naturalHeight || img.height || obj.height || 1);
                    const safeZoom = Math.max(1, Math.min(2.5, zoom || 1));
                    const safePanX = Math.max(-1, Math.min(1, panX || 0));
                    const safePanY = Math.max(-1, Math.min(1, panY || 0));
                    const coverScale = Math.max(obj.width / imgW, obj.height / imgH);
                    const drawW = imgW * coverScale * safeZoom;
                    const drawH = imgH * coverScale * safeZoom;
                    const extraX = Math.max(0, drawW - obj.width);
                    const extraY = Math.max(0, drawH - obj.height);
                    const drawX = -obj.width / 2 - extraX / 2 - safePanX * (extraX / 2);
                    const drawY = -obj.height / 2 - extraY / 2 - safePanY * (extraY / 2);
                    ctx.drawImage(img, drawX, drawY, drawW, drawH);
                }
                ctx.filter = 'none';

                // Color tint overlay
                if (obj.imgTintAmount > 0) {
                    ctx.globalAlpha = obj.imgTintAmount / 100;
                    ctx.globalCompositeOperation = 'source-atop';
                    ctx.fillStyle = obj.imgTintColor || '#ffffff';
                    ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
                    ctx.globalCompositeOperation = 'source-over';
                    ctx.globalAlpha = obj.opacity ?? 1;
                }

                ctx.restore();
                if (obj.strokeWidth > 0) ctx.strokeRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
                }
            } else {
                ctx.fillStyle = '#2a2a45';
                ctx.fillRect(-obj.width/2, -obj.height/2, obj.width, obj.height);
                ctx.fillStyle = '#6a6a82';
                ctx.font = '14px Inter, Arial, sans-serif';
                ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('Loading...', 0, 0);
            }
            break;
        case 'path':
            if (obj.pathPoints && obj.pathPoints.length >= 2) {
                ctx.strokeStyle = obj.fill || '#4a90d9';
                ctx.lineWidth = obj.strokeWidth || 2;
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                const cx = obj.x + obj.width/2, cy = obj.y + obj.height/2;
                ctx.beginPath();
                ctx.moveTo(obj.pathPoints[0].x - cx, obj.pathPoints[0].y - cy);
                for (let i = 1; i < obj.pathPoints.length; i++) {
                    ctx.lineTo(obj.pathPoints[i].x - cx, obj.pathPoints[i].y - cy);
                }
                ctx.stroke();
            }
            break;
        case 'icon':
            if (obj.iconPath) {
                const vb = (obj.iconViewBox || '0 0 100 100').split(' ').map(Number);
                const vw = vb[2] || 100, vh = vb[3] || 100;
                const sx = obj.width / vw, sy = obj.height / vh;
                ctx.save();
                ctx.translate(-obj.width/2, -obj.height/2);
                ctx.scale(sx, sy);
                const subPaths = obj.iconPath.split('|');
                for (let si = 0; si < subPaths.length; si++) {
                    const p2 = new Path2D(subPaths[si]);
                    ctx.fill(p2);
                    if (obj.strokeWidth > 0) ctx.stroke(p2);
                }
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.rect(-obj.width/2, -obj.height/2, obj.width, obj.height);
                ctx.fill();
                if (obj.strokeWidth > 0) ctx.stroke();
            }
            break;
        case 'caption':
            if (typeof obj.paintCaption === 'function') {
                obj.paintCaption(ctx, -obj.width/2, -obj.height/2);
            }
            break;
    }
    }; // end _drawShapeAndText

    if (obj.flexEnabled && obj.flexPins && obj.flexPins.length > 0) {
        _drawWithFlexPreview(ctx, obj, _drawShapeAndText);
    } else if (obj.joints && obj.joints.length > 0) {
        _drawWithJointsPreview(ctx, obj, _drawShapeAndText);
    } else {
        if (extrusionActive) _previewRenderDepthExtrusion(ctx, obj);
        _drawShapeAndText();
    }

    // Clear shadow/glow for bevel overlay
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.setLineDash([]);

    // Bevel effect
    if (obj.bevelEnabled && !['line','path','scribble','text'].includes(obj.type)) {
        const b = Math.max(1, obj.bevelSize || 4);
        ctx.save();
        ctx.globalAlpha = 0.5;
        ctx.strokeStyle = obj.bevelHighlight || '#ffffff';
        ctx.lineWidth = b;
        ctx.beginPath();
        ctx.moveTo(-obj.width/2, obj.height/2);
        ctx.lineTo(-obj.width/2, -obj.height/2);
        ctx.lineTo(obj.width/2, -obj.height/2);
        ctx.stroke();
        ctx.strokeStyle = obj.bevelShadow || '#000000';
        ctx.beginPath();
        ctx.moveTo(obj.width/2, -obj.height/2);
        ctx.lineTo(obj.width/2, obj.height/2);
        ctx.lineTo(-obj.width/2, obj.height/2);
        ctx.stroke();
        ctx.restore();
    }

    // Draw text overlay on non-text shapes (e.g. SmartArt labels)
    if (obj.text && obj.type !== 'text' && obj.type !== 'image') {
        const fs = obj.fontSize || 14;
        const fw = obj.fontWeight || 'normal';
        const ff = obj.fontFamily || 'Arial';
        ctx.font = fw + ' ' + fs + 'px ' + ff;
        ctx.fillStyle = obj.textColor || '#ffffff';
        ctx.textAlign = obj.textAlign || 'center';
        ctx.textBaseline = 'top';
        const maxW = obj.width * 0.85;
        const words = obj.text.split(/\\s+/);
        const wLines = [];
        let cur = '';
        for (let wi = 0; wi < words.length; wi++) {
            const test = cur ? cur + ' ' + words[wi] : words[wi];
            if (ctx.measureText(test).width > maxW && cur) {
                wLines.push(cur);
                cur = words[wi];
            } else { cur = test; }
        }
        if (cur) wLines.push(cur);
        const lh = fs * 1.3;
        const totalH = wLines.length * lh;
        const startY = -totalH / 2;
        const backgroundEnabled = !!obj.textBackgroundEnabled;
        const backgroundPadding = Math.max(0, Number(obj.textBackgroundPadding) || 0);
        const backgroundRadius = Math.max(0, Number(obj.textBackgroundRadius) || 0);
        const maxLineWidth = wLines.reduce((max, line) => Math.max(max, ctx.measureText(line).width), 0);
        let offX = 0;
        if (obj.textAlign === 'left') offX = -obj.width * 0.4;
        else if (obj.textAlign === 'right') offX = obj.width * 0.4;
        if (backgroundEnabled && wLines.length) {
            let blockLeft = -maxLineWidth / 2;
            if (obj.textAlign === 'left') blockLeft = offX;
            else if (obj.textAlign === 'right') blockLeft = offX - maxLineWidth;
            // textBaseline='top' for shape-text playback => block starts at startY
            const blockTop = startY - backgroundPadding * 0.5;
            ctx.save();
            ctx.shadowColor = 'transparent';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 0;
            ctx.fillStyle = obj.textBackgroundColor || '#111827';
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, totalH + backgroundPadding, backgroundRadius);
            else ctx.rect(blockLeft - backgroundPadding, blockTop, maxLineWidth + backgroundPadding * 2, totalH + backgroundPadding);
            ctx.fill();
            ctx.restore();
        }
        for (let li = 0; li < wLines.length; li++) {
            ctx.fillText(wLines[li], offX, startY + li * lh, maxW);
        }
    }

    ctx.restore();

    // Reflection effect (drawn below the object, outside main transform)
    if (obj.reflectionEnabled && !['line','path','scribble','text'].includes(obj.type)) {
        ctx.save();
        const rCx = obj.x + obj.width/2, rCy = obj.y + obj.height/2;
        if (obj.rotation) {
            ctx.translate(rCx, rCy);
            ctx.rotate((obj.rotation||0)*Math.PI/180);
            ctx.translate(-rCx, -rCy);
        }
        const gap = obj.reflectionOffset || 0;
        const reflY = obj.y + obj.height + gap;
        ctx.translate(obj.x + obj.width/2, reflY);
        ctx.scale(1, -1);
        ctx.translate(-(obj.x + obj.width/2), -obj.y);
        ctx.beginPath();
        ctx.rect(obj.x - 2, obj.y, obj.width + 4, obj.height);
        ctx.clip();
        ctx.globalAlpha = obj.reflectionOpacity || 0.3;
        ctx.fillStyle = resolveFill(ctx, obj);
        ctx.strokeStyle = obj.stroke || '#000';
        ctx.lineWidth = obj.strokeWidth || 0;
        const hw = obj.width/2, hh = obj.height/2;
        switch(obj.type) {
            case 'rectangle':
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(obj.x, obj.y, obj.width, obj.height, obj.borderRadius||0);
                else ctx.rect(obj.x, obj.y, obj.width, obj.height);
                ctx.fill(); break;
            case 'circle':
                ctx.beginPath(); ctx.ellipse(obj.x+hw, obj.y+hh, hw, hh, 0, 0, Math.PI*2); ctx.fill(); break;
            case 'triangle':
                ctx.beginPath(); ctx.moveTo(obj.x+hw, obj.y); ctx.lineTo(obj.x+obj.width, obj.y+obj.height); ctx.lineTo(obj.x, obj.y+obj.height); ctx.closePath(); ctx.fill(); break;
            case 'roundedRectangle':
            case 'parallelogram':
            case 'trapezium':
            case 'hexagon':
            case 'heptagon':
            case 'pie':
            case 'chord':
            case 'teardrop':
            case 'lShape':
            case 'can':
            case 'plaque':
            case 'cube':
            case 'doughnut':
            case 'blockArc':
            case 'brace':
            case 'bracket':
            case 'bentArrow':
            case 'uTurnArrow':
            case 'quadArrow':
            case 'upDownArrow':
            case 'upArrowCallout':
            case 'elbowArrowConnector':
                drawStandaloneCustomShape(ctx, obj, false);
                break;
            case 'diamond':
                ctx.beginPath(); ctx.moveTo(obj.x+hw, obj.y); ctx.lineTo(obj.x+obj.width, obj.y+hh); ctx.lineTo(obj.x+hw, obj.y+obj.height); ctx.lineTo(obj.x, obj.y+hh); ctx.closePath(); ctx.fill(); break;
            case 'star':
                ctx.beginPath();
                for(let i=0;i<10;i++){const r=i%2===0?Math.min(obj.width,obj.height)/2:Math.min(obj.width,obj.height)/2*(obj.innerRadius||0.4);const a=(i*Math.PI/5)-Math.PI/2;const m=i===0?'moveTo':'lineTo';ctx[m](obj.x+hw+r*Math.cos(a),obj.y+hh+r*Math.sin(a));}
                ctx.closePath(); ctx.fill(); break;
            case 'polygon': {
                const sd = obj.sides||6; ctx.beginPath();
                for(let i=0;i<sd;i++){const a=(i*2*Math.PI/sd)-Math.PI/2;const r=Math.min(obj.width,obj.height)/2;const m=i===0?'moveTo':'lineTo';ctx[m](obj.x+hw+r*Math.cos(a),obj.y+hh+r*Math.sin(a));}
                ctx.closePath(); ctx.fill(); break;
            }
            case 'heart': {
                const w2=obj.width, h2=obj.height, topY2=h2*0.3, cx2=obj.x+hw, cy2=obj.y+hh;
                ctx.beginPath(); ctx.moveTo(cx2, obj.y+topY2);
                ctx.bezierCurveTo(cx2, obj.y, obj.x, obj.y, obj.x, obj.y+topY2);
                ctx.bezierCurveTo(obj.x, (obj.y+topY2+obj.y+h2)/2+topY2*0.1, cx2, obj.y+h2*0.8, cx2, obj.y+h2);
                ctx.bezierCurveTo(cx2, obj.y+h2*0.8, obj.x+w2, (obj.y+topY2+obj.y+h2)/2+topY2*0.1, obj.x+w2, obj.y+topY2);
                ctx.bezierCurveTo(obj.x+w2, obj.y, cx2, obj.y, cx2, obj.y+topY2);
                ctx.closePath(); ctx.fill(); break;
            }
            case 'freeform':
                if (obj.pathPoints && obj.pathPoints.length >= 3) {
                    ctx.beginPath();
                    ctx.moveTo(obj.pathPoints[0].x, obj.pathPoints[0].y);
                    for(let i=1;i<obj.pathPoints.length-1;i++){
                        const xc2=(obj.pathPoints[i].x+obj.pathPoints[i+1].x)/2;
                        const yc2=(obj.pathPoints[i].y+obj.pathPoints[i+1].y)/2;
                        ctx.quadraticCurveTo(obj.pathPoints[i].x,obj.pathPoints[i].y,xc2,yc2);
                    }
                    ctx.closePath(); ctx.fill();
                }
                break;
            case 'image':
                if (obj._imgEl) { ctx.drawImage(obj._imgEl, obj.x, obj.y, obj.width, obj.height); }
                break;
        }
        ctx.restore();
    }
}

function previewEffectDirectionToAngle(direction) {
    const angles = { right:0, 'down-right':Math.PI/4, down:Math.PI/2, 'down-left':Math.PI*3/4, left:Math.PI, 'up-left':-Math.PI*3/4, up:-Math.PI/2, 'up-right':-Math.PI/4 };
    return angles[direction] ?? 0;
}
function previewSeededRandom(seed) {
    const x = Math.sin(seed || 1) * 10000;
    return x - Math.floor(x);
}
function samplePreviewEffectPath(points, t) {
    if (!Array.isArray(points) || points.length < 2) return null;
    const clamped = Math.max(0, Math.min(1, t));
    const idx = clamped * (points.length - 1);
    const i = Math.floor(idx);
    const frac = idx - i;
    const p0 = points[Math.min(i, points.length - 1)];
    const p1 = points[Math.min(i + 1, points.length - 1)];
    if (!p0 || !p1) return null;
    return { x: p0.x + (p1.x - p0.x) * frac, y: p0.y + (p1.y - p0.y) * frac, angle: Math.atan2(p1.y - p0.y, p1.x - p0.x) };
}
function buildPreviewBreakFragments(obj, anim) {
    const count = Math.max(4, Math.min(100, anim.fragmentCount || 16));
    const width = Math.max(1, obj.width || 1), height = Math.max(1, obj.height || 1);
    const cols = Math.max(1, Math.ceil(Math.sqrt(count * (width / Math.max(height, 1)))));
    const rows = Math.max(1, Math.ceil(count / cols));
    const equal = (anim.fragmentMode || 'equal') !== 'variable';
    const seed = anim.seed || 1;
    const direction = anim.breakDirection || 'radial';
    const fragments = [];
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            if (fragments.length >= count) break;
            const rnd = previewSeededRandom(seed + row * 97 + col * 193);
            const rnd2 = previewSeededRandom(seed + row * 151 + col * 251);
            const cellW = width / cols, cellH = height / rows;
            const w = cellW * (equal ? 1 : 0.75 + rnd * 0.25);
            const h = cellH * (equal ? 1 : 0.75 + rnd2 * 0.25);
            const x = obj.x + col * cellW + (cellW - w) / 2;
            const y = obj.y + row * cellH + (cellH - h) / 2;
            const cxNorm = (col + 0.5) / cols - 0.5;
            const cyNorm = (row + 0.5) / rows - 0.5;
            const radialAngle = Math.atan2(cyNorm || (rnd2 - 0.5), cxNorm || (rnd - 0.5));
            const angle = getPreviewBreakDirectionAngle(direction, radialAngle);
            const scatter = (anim.scatter || 180) * (0.55 + rnd * 0.75);
            const spreadJitter = ((anim.spread || 0) * Math.PI / 180) * (rnd2 - 0.5);
            fragments.push({ order: fragments.length, x, y, w, h, dx: Math.cos(angle + spreadJitter) * scatter, dy: Math.sin(angle + spreadJitter) * scatter, rotation: (rnd - 0.5) * Math.PI * 1.75 });
        }
    }
    return fragments;
}
function getPreviewBreakDirectionAngle(direction, radialAngle) {
    if (direction === 'inward') return radialAngle + Math.PI;
    if (direction === 'down') return Math.PI / 2;
    if (direction === 'up') return -Math.PI / 2;
    if (direction === 'left') return Math.PI;
    if (direction === 'right') return 0;
    return radialAngle;
}
function drawPreviewBreakFragmentClip(ctx, fragment, shape = 'slice') {
    const x = fragment.x, y = fragment.y, w = fragment.w, h = fragment.h;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.beginPath();
    if (shape === 'circle') {
        ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
    } else if (shape === 'triangle') {
        ctx.moveTo(cx, y); ctx.lineTo(x + w, y + h); ctx.lineTo(x, y + h); ctx.closePath();
    } else if (shape === 'diamond') {
        ctx.moveTo(cx, y); ctx.lineTo(x + w, cy); ctx.lineTo(cx, y + h); ctx.lineTo(x, cy); ctx.closePath();
    } else if (shape === 'shard') {
        ctx.moveTo(x + w * 0.15, y); ctx.lineTo(x + w, y + h * 0.2); ctx.lineTo(x + w * 0.75, y + h); ctx.lineTo(x, y + h * 0.82); ctx.lineTo(x + w * 0.28, y + h * 0.42); ctx.closePath();
    } else {
        ctx.rect(x, y, w, h);
    }
}
function drawPreviewShootEffect(ctx, effect) {
    const anim = effect.anim || {};
    const count = Math.max(1, anim.pelletCount || 1);
    const size = Math.max(1, anim.pelletSize || 8);
    const distance = Math.max(0, anim.distance || 0);
    const frequency = Math.max(1, anim.frequency || count);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (effect.obj.x + (effect.obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (effect.obj.y + (effect.obj.height || 0) / 2);
    const baseAngle = previewEffectDirectionToAngle(anim.direction || 'right');
    const spreadRad = ((anim.spread || 0) * Math.PI) / 180;
    const mode = anim.shotMode || 'stream';
    const randomness = Math.max(0, Math.min(100, Number.isFinite(anim.randomness) ? anim.randomness : 0)) / 100;
    const gravity = Number.isFinite(anim.gravity) ? anim.gravity : 0;
    const trailLength = Math.max(0, Number.isFinite(anim.trailLength) ? anim.trailLength : 1);
    const fade = anim.fade !== false;
    const seed = anim.seed || 1;
    ctx.save();
    ctx.fillStyle = anim.color || '#f59e0b';
    ctx.strokeStyle = anim.color || '#f59e0b';
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
        const spawnDelay = getPreviewShotSpawnDelay(i, count, effect.duration, frequency, mode);
        const pelletElapsed = effect.localTime - spawnDelay;
        if (pelletElapsed < 0) continue;
        const t = Math.max(0, Math.min(1, pelletElapsed / Math.max(1, effect.duration - spawnDelay)));
        if (t <= 0 || t > 1) continue;
        const rndA = previewSeededRandom(seed + i * 101);
        const rndB = previewSeededRandom(seed + i * 211);
        const rndC = previewSeededRandom(seed + i * 307);
        const angleJitter = (rndA - 0.5) * randomness * (Math.PI / 3);
        const speedFactor = Math.max(0.2, 1 + (rndC - 0.5) * randomness);
        const pelletSize = Math.max(1, size * (1 + (rndB - 0.5) * randomness));
        const angle = baseAngle + (count === 1 ? 0 : ((i / (count - 1)) - 0.5) * spreadRad) + angleJitter;
        const pathPoint = anim.pathMode === 'path' && anim.pathPoints?.length >= 2 ? samplePreviewEffectPath(anim.pathPoints, t) : null;
        const travel = distance * t * speedFactor;
        const x = pathPoint ? pathPoint.x : originX + Math.cos(angle) * travel;
        const y = (pathPoint ? pathPoint.y : originY + Math.sin(angle) * travel) + gravity * t * t;
        const drawAngle = pathPoint?.angle ?? angle;
        const tail = Math.max(pelletSize * 1.5, distance * 0.04) * trailLength * (1 - t * 0.35);
        ctx.globalAlpha = fade ? Math.max(0.05, 1 - t * 0.85) : 1;
        ctx.lineWidth = Math.max(1, pelletSize * 0.45);
        if (tail > 0) {
            ctx.beginPath(); ctx.moveTo(x - Math.cos(drawAngle) * tail, y - Math.sin(drawAngle) * tail); ctx.lineTo(x, y); ctx.stroke();
        }
        drawPreviewPelletShape(ctx, x, y, pelletSize, drawAngle, anim.pelletShape || 'circle');
    }
    ctx.restore();
}

function getPreviewDrawLayer(obj, fallbackIndex) {
    const facialBias = getPreviewFacialLayerBias(obj);
    const raw = Number(obj?._armatureDrawLayer ?? obj?.armatureDrawLayer);
    if (Number.isFinite(raw)) return raw + getPreviewSideRoleLayerBias(obj) + facialBias;
    const layer = Number(obj?.layer);
    if (Number.isFinite(layer)) return layer + getPreviewSideRoleLayerBias(obj) + facialBias;
    return (Number.isFinite(fallbackIndex) ? fallbackIndex : 0) + facialBias;
}

function getPreviewFacialLayerBias(obj) {
    const name = String(obj?.name || '').toLowerCase();
    return (obj?._facialParentHead || obj?.facialParentHead || /^face\s*:/.test(name)) ? 10 : 0;
}

function getPreviewArmatureRole(obj) {
    const visibleName = String(obj?.name || '').toLowerCase();
    if (/front[\s_-]*arm/.test(visibleName)) return 'front-arm';
    if (/front[\s_-]*leg/.test(visibleName)) return 'front-leg';
    if (/back[\s_-]*arm/.test(visibleName)) return 'back-arm';
    if (/back[\s_-]*leg/.test(visibleName)) return 'back-leg';
    const text = String(
        obj?._armatureRoleKey || obj?.armatureRoleKey ||
        obj?._armaturePartKey || obj?.armaturePartKey ||
        obj?._ucRole || obj?.ucRole ||
        obj?.name || ''
    ).toLowerCase();
    if (/front[\s_-]*arm/.test(text)) return 'front-arm';
    if (/front[\s_-]*leg/.test(text)) return 'front-leg';
    if (/back[\s_-]*arm/.test(text)) return 'back-arm';
    if (/back[\s_-]*leg/.test(text)) return 'back-leg';
    return '';
}

function getPreviewSideRoleLayerBias(obj) {
    const role = getPreviewArmatureRole(obj);
    if (role === 'front-arm') return 20;
    if (role === 'front-leg') return 10;
    if (role === 'back-leg') return -10;
    if (role === 'back-arm') return -20;
    return 0;
}

function drawPreviewObjectsInLayerOrder(ctx, drawObjects) {
    const source = drawObjects || [];
    const ordered = typeof previewCharacterStackPolicy !== 'undefined'
        ? previewCharacterStackPolicy.orderObjects(source, (obj, index) => getPreviewDrawLayer(obj, index))
        : source
            .map((obj, index) => ({ obj, index }))
            .sort((a, b) => {
                const layerDelta = getPreviewDrawLayer(a.obj, a.index) - getPreviewDrawLayer(b.obj, b.index);
                return layerDelta || (a.index - b.index);
            })
            .map(entry => entry.obj);
    ordered.forEach(obj => drawObj(ctx, obj));
}
function getPreviewShotSpawnDelay(index, count, duration, frequency, mode = 'stream') {
    if (mode === 'burst') return 0;
    if (mode === 'pulse') {
        const pulses = Math.min(4, Math.max(2, Math.ceil(count / 8)));
        const perPulse = Math.max(1, Math.ceil(count / pulses));
        const pulseIndex = Math.floor(index / perPulse);
        const indexInPulse = index % perPulse;
        const pulseGap = pulses > 1 ? duration * 0.7 / (pulses - 1) : 0;
        return pulseIndex * pulseGap + indexInPulse * Math.min(50, 1000 / Math.max(1, frequency));
    }
    return Math.min(duration / Math.max(1, count), 1000 / Math.max(1, frequency)) * index;
}
function drawPreviewPelletShape(ctx, x, y, size, angle, shape) {
    const half = size / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.beginPath();
    if (shape === 'line') {
        ctx.moveTo(-size, 0); ctx.lineTo(size, 0); ctx.stroke(); ctx.restore(); return;
    }
    if (shape === 'rectangle') ctx.rect(-size, -half, size * 2, size);
    else if (shape === 'square') ctx.rect(-half, -half, size, size);
    else if (shape === 'triangle') { ctx.moveTo(half, 0); ctx.lineTo(-half, -half); ctx.lineTo(-half, half); ctx.closePath(); }
    else if (shape === 'star') {
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? half : half * 0.45;
            const a = -Math.PI / 2 + i * Math.PI / 5;
            const px = Math.cos(a) * r, py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
    } else ctx.arc(0, 0, half, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}
function drawPreviewBreakApartEffect(ctx, effect) {
    const obj = effect.obj, anim = effect.anim || {};
    const savedOpacity = obj.opacity;
    const fragments = buildPreviewBreakFragments(obj, anim);
    const stagger = Math.max(0, Math.min(0.9, anim.fragmentStagger || 0));
    const spin = Math.max(0, Number.isFinite(anim.fragmentSpin) ? anim.fragmentSpin : 1);
    const gravity = Number.isFinite(anim.fragmentGravity) ? anim.fragmentGravity : 0;
    const fade = anim.fragmentFade === true;
    fragments.forEach(fragment => {
        const delay = fragments.length > 1 ? (fragment.order / (fragments.length - 1)) * stagger : 0;
        const progress = Math.max(0, Math.min(1, (effect.progress - delay) / Math.max(0.01, 1 - delay)));
        if (progress <= 0) return;
        const cx = fragment.x + fragment.w / 2, cy = fragment.y + fragment.h / 2;
        ctx.save();
        ctx.translate(cx + fragment.dx * progress, cy + fragment.dy * progress + gravity * progress * progress);
        ctx.rotate(fragment.rotation * spin * progress);
        ctx.translate(-cx, -cy);
        drawPreviewBreakFragmentClip(ctx, fragment, anim.fragmentShape || 'slice'); ctx.clip();
        obj.opacity = (anim.originalOpacity ?? savedOpacity ?? 1) * (fade ? Math.max(0, 1 - progress) : 1);
        drawObj(ctx, obj);
        ctx.restore();
    });
    obj.opacity = savedOpacity;
}
function drawPreviewEffectOverlays(ctx, effects) {
    (effects || []).forEach(effect => {
        const anim = effect.anim || {};
        ctx.save();
        if (anim.blendMode && anim.blendMode !== 'source-over') ctx.globalCompositeOperation = anim.blendMode;
        if (effect.type === 'shoot-pellets') drawPreviewShootEffect(ctx, effect);
        if (effect.type === 'break-apart') drawPreviewBreakApartEffect(ctx, effect);
        if (effect.type === 'ripple-wave') drawPreviewRippleWaveEffect(ctx, effect);
        if (effect.type === 'sparkle-burst') drawPreviewSparkleBurstEffect(ctx, effect);
        if (effect.type === 'echo-trail') drawPreviewEchoTrailEffect(ctx, effect);
        if (effect.type === 'glow-aura') drawPreviewGlowAuraEffect(ctx, effect);
        if (effect.type === 'focus-pulse') drawPreviewFocusPulseEffect(ctx, effect);
        if (effect.type === 'confetti-burst') drawPreviewConfettiBurstEffect(ctx, effect);
        if (effect.type === 'orbit-swarm') drawPreviewOrbitSwarmEffect(ctx, effect);
        if (effect.type === 'smoke-puff') drawPreviewSmokePuffEffect(ctx, effect);
        if (effect.type === 'lightning-arc') drawPreviewLightningArcEffect(ctx, effect);
        if (effect.type === 'magnet-pull') drawPreviewMagnetPullEffect(ctx, effect);
        if (effect.type === 'scan-beam') drawPreviewScanBeamEffect(ctx, effect);
        if (effect.type === 'lens-flare') drawPreviewLensFlareEffect(ctx, effect);
        if (effect.type === 'pixel-burst') drawPreviewPixelBurstEffect(ctx, effect);
        if (effect.type === 'impact-burst') drawPreviewImpactBurstEffect(ctx, effect);
        if (effect.type === 'wave-distort') drawPreviewWaveDistortEffect(ctx, effect);
        if (effect.type === 'liquid-motion') drawPreviewLiquidMotionEffect(ctx, effect);
        if (effect.type === 'melt-drip') drawPreviewMeltDripEffect(ctx, effect);
        if (effect.type === 'brush-reveal') drawPreviewBrushRevealEffect(ctx, effect);
        if (effect.type === 'paint-reveal') drawPreviewPaintRevealEffect(ctx, effect);
        if (effect.type === 'swirl-tornado') drawPreviewSwirlTornadoEffect(ctx, effect);
        if (effect.type === 'fire-flicker') drawPreviewFireFlickerEffect(ctx, effect);
        if (effect.type === 'dust-away') drawPreviewDustAwayEffect(ctx, effect);
        if (effect.type === 'freeze-crack') drawPreviewFreezeCrackEffect(ctx, effect);
        if (effect.type === 'neon-trace') drawPreviewNeonTraceEffect(ctx, effect);
        if (effect.type === 'shadow-pop') drawPreviewShadowPopEffect(ctx, effect);
        if (effect.type === 'explosion-smoke') drawPreviewExplosionSmokeEffect(ctx, effect);
        if (effect.type === 'paint-stroke') drawPreviewPaintStrokeEffect(ctx, effect);
        if (effect.type === 'chromatic-glitch') drawPreviewChromaticGlitchEffect(ctx, effect);
        if (effect.type === 'shockwave-ring') drawPreviewShockwaveRingEffect(ctx, effect);
        if (effect.type === 'magic-portal') drawPreviewMagicPortalEffect(ctx, effect);
        if (effect.type === 'glass-shatter') drawPreviewGlassShatterEffect(ctx, effect);
        if (effect.type === 'electric-charge') drawPreviewElectricChargeEffect(ctx, effect);
        if (effect.type === 'ink-bleed') drawPreviewInkBleedEffect(ctx, effect);
        if (effect.type === 'motion-smear') drawPreviewMotionSmearEffect(ctx, effect);
        if (effect.type === 'stage-shake') drawPreviewStageShakeEffect(ctx, effect);
        if (effect.type === 'mask-reveal') drawPreviewMaskRevealEffect(ctx, effect);
        if (effect.type === 'path-trail') drawPreviewPathTrailEffect(ctx, effect);
        if (effect.type === 'particle-fountain') drawPreviewParticleFountainEffect(ctx, effect);
        if (effect.type === 'light-sweep') drawPreviewLightSweepEffect(ctx, effect);
        if (effect.type === 'weather-effect') drawPreviewWeatherEffect(ctx, effect);
        if (effect.type === 'bubble-rise') drawPreviewBubbleRiseEffect(ctx, effect);
        if (effect.type === 'meteor-shower') drawPreviewMeteorShowerEffect(ctx, effect);
        if (effect.type === 'spotlight-sweep') drawPreviewSpotlightSweepEffect(ctx, effect);
        if (effect.type === 'radial-rays') drawPreviewRadialRaysEffect(ctx, effect);
        if (effect.type === 'outline-pulse') drawPreviewOutlinePulseEffect(ctx, effect);
        if (effect.type === 'speed-lines') drawPreviewSpeedLinesEffect(ctx, effect);
        if (effect.type === 'starfield-warp') drawPreviewStarfieldWarpEffect(ctx, effect);
        if (effect.type === 'color-wash') drawPreviewColorWashEffect(ctx, effect);
        if (effect.type === 'halo-burst') drawPreviewHaloBurstEffect(ctx, effect);
        if (effect.type === 'shadow-cast') drawPreviewShadowCastEffect(ctx, effect);
        if (effect.type === 'energy-shield') drawPreviewEnergyShieldEffect(ctx, effect);
        if (effect.type === 'magnify-lens') drawPreviewMagnifyLensEffect(ctx, effect);
        if (effect.type === 'rainbow-arc') drawPreviewRainbowArcEffect(ctx, effect);
        if (effect.type === 'vignette-pulse') drawPreviewVignettePulseEffect(ctx, effect);
        if (effect.type === 'scan-grid') drawPreviewScanGridEffect(ctx, effect);
        if (effect.type === 'draw-trace') drawPreviewDrawTraceEffect(ctx, effect);
        if (effect.type === 'card-turn') drawPreviewFake3DTurnEffect(ctx, effect, 'card');
        if (effect.type === 'page-turn') drawPreviewFake3DTurnEffect(ctx, effect, 'page');
        if (effect.type === 'flap-swing') drawPreviewFake3DTurnEffect(ctx, effect, 'flap');
        ctx.restore();
    });
}

function drawPreviewDrawTraceEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {}, p = Math.max(0, Math.min(1, effect.progress || 0));
    const overlayAlpha = getPreviewDrawTraceOverlayAlpha(p);
    if (overlayAlpha <= 0) return;
    if ((anim.objectType || obj.type) === 'text' || anim.text || obj.text) {
        drawPreviewDrawTraceTextEffect(ctx, obj, anim, p, overlayAlpha);
        return;
    }
    if (((anim.objectType || obj.type) === 'icon' || anim.iconPath || obj.iconPath) && (anim.iconPath || obj.iconPath) && typeof Path2D !== 'undefined') {
        drawPreviewDrawTraceIconEffect(ctx, obj, anim, p, overlayAlpha);
        return;
    }
    const segments = getPreviewDrawTraceSegments(obj, anim);
    if (!segments.length || p <= 0) return;
    const total = segments.reduce((sum, seg) => sum + Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1), 0);
    if (total <= 0) return;
    const drawnLen = total * p;
    const color = getPreviewDrawTraceColor(obj, anim);
    const lineWidth = Math.max(1, anim.width || obj.strokeWidth || 4);
    const glow = Math.max(0, Math.min(60, Number.isFinite(anim.glow) ? anim.glow : 0));
    const tailFade = Math.max(0, Math.min(1, Number.isFinite(anim.tailFade) ? anim.tailFade : 0));
    const showPen = anim.showPen !== false;
    ctx.save();
    ctx.globalAlpha *= overlayAlpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    if (glow > 0) {
        ctx.shadowColor = color;
        ctx.shadowBlur = glow;
    } else {
        ctx.shadowBlur = 0;
    }
    let penX = null, penY = null;
    if (tailFade > 0) {
        let drawn = 0;
        for (const seg of segments) {
            if (drawn >= drawnLen) break;
            const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
            if (len <= 0.001) continue;
            const segDraw = Math.min(len, drawnLen - drawn);
            const t = segDraw / len;
            const x1 = seg.x1, y1 = seg.y1;
            const x2 = seg.x1 + (seg.x2 - seg.x1) * t;
            const y2 = seg.y1 + (seg.y2 - seg.y1) * t;
            const midDistFromPen = (drawnLen - (drawn + segDraw * 0.5)) / Math.max(1, drawnLen);
            const segAlpha = Math.max(0.04, 1 - tailFade * midDistFromPen);
            ctx.globalAlpha = overlayAlpha * segAlpha;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            drawn += segDraw;
            penX = x2; penY = y2;
        }
    } else {
        let remaining = drawnLen;
        ctx.beginPath();
        segments.forEach(seg => {
            if (remaining <= 0) return;
            const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
            if (len <= 0.001) return;
            const drawLen = Math.min(len, remaining);
            const t = drawLen / len;
            ctx.moveTo(seg.x1, seg.y1);
            const x2 = seg.x1 + (seg.x2 - seg.x1) * t;
            const y2 = seg.y1 + (seg.y2 - seg.y1) * t;
            ctx.lineTo(x2, y2);
            remaining -= drawLen;
            penX = x2; penY = y2;
        });
        ctx.stroke();
    }
    if (showPen && penX !== null && p < 0.995) {
        ctx.shadowBlur = 0;
        const tipR = Math.max(6, lineWidth * 1.6);
        ctx.globalAlpha = overlayAlpha * 0.45;
        ctx.fillStyle = 'rgba(0,0,0,0.65)';
        ctx.beginPath();
        ctx.arc(penX, penY, tipR * 1.3, 0, Math.PI * 2);
        ctx.fill();
        const grad = ctx.createRadialGradient(penX, penY, 0, penX, penY, tipR);
        grad.addColorStop(0, '#ffffff');
        grad.addColorStop(0.55, color);
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.globalAlpha = overlayAlpha;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(penX, penY, tipR, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function getPreviewDrawTraceOverlayAlpha(progress = 0) {
    // Trace ink stays opaque until the drawing is complete, then dissolves
    // quickly as the real object appears.
    if (progress < 0.995) return 1;
    if (progress >= 1) return 0;
    const t = (progress - 0.995) / 0.005;
    return 1 - (t * t * (3 - 2 * t));
}

function getPreviewDrawTraceObjectReveal(progress = 0) {
    if (progress < 0.995) return 0;
    if (progress >= 1) return 1;
    const t = (progress - 0.995) / 0.005;
    return t * t * (3 - 2 * t);
}

function getPreviewDrawTraceColor(obj = {}, cfg = {}) {
    const usable = (value) => {
        if (!value || typeof value !== 'string') return '';
        const v = value.trim();
        if (!v || v === 'transparent' || v === 'none' || v === 'rgba(0,0,0,0)' || v === 'rgba(0, 0, 0, 0)') return '';
        return v;
    };
    return usable(cfg.color) || usable(cfg.drawColor) || usable(obj.stroke) || usable(obj.textStrokeColor) || usable(obj.textColor) || usable(obj.fill) || usable(obj.color) || '#38bdf8';
}

function drawPreviewDrawTraceTextEffect(ctx, obj = {}, cfg = {}, progress = 0, overlayAlpha = 1) {
    if (progress <= 0) return;
    const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
    const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
    const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
    const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
    const text = transformPreviewDrawTraceText(obj.text || cfg.text || '', obj.textTransform || cfg.textTransform);
    if (!text) return;
    const fontSize = Number(obj.fontSize || cfg.fontSize) || 24;
    const lineHeight = fontSize * (Number(obj.lineHeight || cfg.lineHeight) || 1.4);
    const lines = String(text).split('\\n');
    const totalH = lines.length * lineHeight;
    const alignY = obj.textVerticalAlign || cfg.textVerticalAlign || 'middle';
    let startY = y + 6;
    if (alignY === 'middle') startY = y + Math.max(0, (h - totalH) / 2);
    else if (alignY === 'bottom') startY = y + Math.max(0, h - totalH - 6);
    const align = obj.textAlign || cfg.textAlign || 'center';
    let textX = x + w / 2;
    if (align === 'left') textX = x + 6;
    if (align === 'right') textX = x + w - 6;
    const color = getPreviewDrawTraceColor(obj, cfg);
    ctx.save();
    ctx.globalAlpha *= overlayAlpha;
    applyPreviewDrawTraceObjectTransform(ctx, x, y, w, h, Number.isFinite(obj.rotation) ? obj.rotation : cfg.rotation);
    ctx.beginPath();
    ctx.rect(x, y, w * progress, h);
    ctx.clip();
    ctx.font = (obj.fontStyle === 'italic' || cfg.fontStyle === 'italic' ? 'italic ' : '') + (obj.fontWeight || cfg.fontWeight || 'normal') + ' ' + fontSize + 'px ' + (obj.fontFamily || cfg.fontFamily || 'Arial');
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    ctx.strokeStyle = color;
    ctx.fillStyle = obj.textColor || cfg.textColor || obj.fill || cfg.fill || color;
    ctx.lineWidth = Math.max(1, cfg.width || obj.textStrokeWidth || 2);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0, Math.min(10, ctx.lineWidth * 1.2));
    lines.forEach((line, index) => {
        const ly = startY + index * lineHeight;
        ctx.strokeText(line, textX, ly, Math.max(1, w - 12));
        ctx.fillText(line, textX, ly, Math.max(1, w - 12));
    });
    ctx.restore();
}

function drawPreviewDrawTraceIconEffect(ctx, obj = {}, cfg = {}, progress = 0, overlayAlpha = 1) {
    const iconPath = obj.iconPath || cfg.iconPath;
    if (progress <= 0 || !iconPath) return;
    const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
    const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
    const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
    const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
    const color = getPreviewDrawTraceColor(obj, cfg);
    const vb = String(obj.iconViewBox || cfg.iconViewBox || '0 0 100 100').split(/\s+/).map(Number);
    const vbX = vb[0] || 0, vbY = vb[1] || 0, vbW = vb[2] || 100, vbH = vb[3] || 100;
    ctx.save();
    ctx.globalAlpha *= overlayAlpha;
    applyPreviewDrawTraceObjectTransform(ctx, x, y, w, h, Number.isFinite(obj.rotation) ? obj.rotation : cfg.rotation);
    ctx.beginPath();
    ctx.rect(x, y, w * progress, h);
    ctx.clip();
    ctx.translate(x, y);
    ctx.scale(w / vbW, h / vbH);
    ctx.translate(-vbX, -vbY);
    ctx.strokeStyle = color;
    ctx.fillStyle = obj.fill || cfg.fill || color;
    ctx.lineWidth = Math.max(1, (cfg.width || obj.strokeWidth || 4) / Math.max(w / vbW, h / vbH));
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = Math.max(0, Math.min(8, ctx.lineWidth));
    const baseAlpha = ctx.globalAlpha;
    String(iconPath).split('|').forEach(path => {
        const trimmed = path.trim();
        if (!trimmed) return;
        const p = new Path2D(trimmed);
        ctx.stroke(p);
        ctx.globalAlpha = baseAlpha * (0.18 + progress * 0.32);
        ctx.fill(p);
        ctx.globalAlpha = baseAlpha;
    });
    ctx.restore();
}

function applyPreviewDrawTraceObjectTransform(ctx, x, y, w, h, rotation = 0) {
    const angle = ((rotation || 0) * Math.PI) / 180;
    if (!angle) return;
    const cx = x + w / 2, cy = y + h / 2;
    ctx.translate(cx, cy);
    ctx.rotate(angle);
    ctx.translate(-cx, -cy);
}

function transformPreviewDrawTraceText(value, transform = 'none') {
    const text = String(value || '');
    if (transform === 'uppercase') return text.toUpperCase();
    if (transform === 'lowercase') return text.toLowerCase();
    if (transform === 'title') return text.replace(/\\b([A-Za-z][A-Za-z'’-]*)\\b/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
    return text;
}

function getPreviewDrawTraceSegments(obj = {}, cfg = {}) {
    const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
    const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
    const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
    const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
    const type = cfg.objectType || obj.type || 'rectangle';
    const reorder = (pts) => reorderPreviewDrawTracePoints(pts, x, y, w, h, cfg);
    let points = [];
    if (type === 'image') {
        const alphaSegments = getPreviewDrawTraceAlphaSegments(obj, cfg);
        if (alphaSegments.length) return alphaSegments;
    }
    if (Array.isArray(cfg.pathPoints) && cfg.pathPoints.length >= 2) return previewDrawTracePointsToSegments(cfg.pathPoints);
    if (Array.isArray(obj.pathPoints) && obj.pathPoints.length >= 2) return previewDrawTracePointsToSegments(obj.pathPoints);
    if (type === 'circle' || type === 'ellipse') {
        const cx = x + w / 2, cy = y + h / 2;
        for (let i = 0; i <= 72; i++) {
            const a = -Math.PI / 2 + Math.PI * 2 * i / 72;
            points.push({ x: cx + Math.cos(a) * w / 2, y: cy + Math.sin(a) * h / 2 });
        }
        return previewDrawTracePointsToSegments(reorder(rotatePreviewDrawTracePoints(points, obj, cfg)));
    }
    if (type === 'triangle') {
        points = [{ x: x + w / 2, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x: x + w / 2, y }];
        return previewDrawTracePointsToSegments(reorder(rotatePreviewDrawTracePoints(points, obj, cfg)));
    }
    if (type === 'star') {
        const cx = x + w / 2, cy = y + h / 2, outer = Math.min(w, h) / 2, inner = outer * 0.48;
        for (let i = 0; i <= 10; i++) {
            const r = i % 2 === 0 ? outer : inner;
            const a = -Math.PI / 2 + i * Math.PI / 5;
            points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        return previewDrawTracePointsToSegments(reorder(rotatePreviewDrawTracePoints(points, obj, cfg)));
    }
    if (type === 'polygon') {
        const cx = x + w / 2, cy = y + h / 2, sides = Math.max(3, Math.min(16, parseInt(obj.sides || cfg.sides, 10) || 5)), r = Math.min(w, h) / 2;
        for (let i = 0; i <= sides; i++) {
            const a = -Math.PI / 2 + Math.PI * 2 * i / sides;
            points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
        }
        return previewDrawTracePointsToSegments(reorder(rotatePreviewDrawTracePoints(points, obj, cfg)));
    }
    points = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
    return previewDrawTracePointsToSegments(reorder(rotatePreviewDrawTracePoints(points, obj, cfg)));
}

function reorderPreviewDrawTracePoints(points, x, y, w, h, cfg = {}) {
    if (!Array.isArray(points) || points.length < 3) return points;
    const start = (cfg.start || cfg.drawStart || 'top').toLowerCase();
    const clockwise = cfg.clockwise !== false && cfg.drawClockwise !== false;
    const closed = Math.hypot(
        points[0].x - points[points.length - 1].x,
        points[0].y - points[points.length - 1].y
    ) < 0.5;
    const open = closed ? points.slice(0, -1) : points.slice();
    const cx = x + w / 2, cy = y + h / 2;
    const anchors = {
        'top':          { x: cx,    y: y },
        'top-right':    { x: x + w, y: y },
        'right':        { x: x + w, y: cy },
        'bottom-right': { x: x + w, y: y + h },
        'bottom':       { x: cx,    y: y + h },
        'bottom-left':  { x: x,     y: y + h },
        'left':         { x: x,     y: cy },
        'top-left':     { x: x,     y: y }
    };
    const target = anchors[start] || anchors.top;
    let bestIdx = 0, bestDist = Infinity;
    for (let i = 0; i < open.length; i++) {
        const dx = open[i].x - target.x;
        const dy = open[i].y - target.y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    let rotated = open.slice(bestIdx).concat(open.slice(0, bestIdx));
    if (!clockwise) rotated.reverse();
    rotated.push({ x: rotated[0].x, y: rotated[0].y });
    return rotated;
}

function getPreviewDrawTraceAlphaSegments(obj = {}, cfg = {}) {
    const img = obj._imgEl || obj.imageElement || null;
    if (!img || !img.complete) return [];
    const naturalW = img.naturalWidth || img.videoWidth || img.width || 0;
    const naturalH = img.naturalHeight || img.videoHeight || img.height || 0;
    if (!naturalW || !naturalH) return [];
    const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
    const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
    const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
    const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
    const key = [img.currentSrc || img.src || obj.imageSrc || '', naturalW, naturalH, Math.round(w), Math.round(h), obj.rotation || cfg.rotation || 0].join('|');
    if (obj._drawTraceAlphaKey === key && Array.isArray(obj._drawTraceAlphaSegments)) return obj._drawTraceAlphaSegments;
    try {
        const maxSide = 96;
        const scale = Math.min(1, maxSide / Math.max(naturalW, naturalH));
        const sw = Math.max(8, Math.round(naturalW * scale));
        const sh = Math.max(8, Math.round(naturalH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const c = canvas.getContext('2d', { willReadFrequently: true });
        c.clearRect(0, 0, sw, sh);
        c.drawImage(img, 0, 0, sw, sh);
        const alpha = c.getImageData(0, 0, sw, sh).data;
        const opaque = (px, py) => px >= 0 && py >= 0 && px < sw && py < sh && alpha[(py * sw + px) * 4 + 3] > 24;
        const raw = [];
        for (let py = 0; py < sh; py++) {
            for (let px = 0; px < sw; px++) {
                if (!opaque(px, py)) continue;
                if (!opaque(px, py - 1)) raw.push([{ x: px, y: py }, { x: px + 1, y: py }]);
                if (!opaque(px + 1, py)) raw.push([{ x: px + 1, y: py }, { x: px + 1, y: py + 1 }]);
                if (!opaque(px, py + 1)) raw.push([{ x: px + 1, y: py + 1 }, { x: px, y: py + 1 }]);
                if (!opaque(px - 1, py)) raw.push([{ x: px, y: py + 1 }, { x: px, y: py }]);
            }
        }
        const mapped = raw.map(([a, b]) => ({
            x1: x + (a.x / sw) * w,
            y1: y + (a.y / sh) * h,
            x2: x + (b.x / sw) * w,
            y2: y + (b.y / sh) * h
        }));
        const rotated = rotatePreviewDrawTraceSegments(mapped, obj, cfg);
        obj._drawTraceAlphaKey = key;
        obj._drawTraceAlphaSegments = rotated;
        return rotated;
    } catch (err) {
        obj._drawTraceAlphaKey = key;
        obj._drawTraceAlphaSegments = [];
        return [];
    }
}

function rotatePreviewDrawTraceSegments(segments, obj = {}, cfg = {}) {
    const rotation = Number.isFinite(obj.rotation) ? obj.rotation : (cfg.rotation || 0);
    const angle = rotation * Math.PI / 180;
    if (!angle) return segments;
    const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
    const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
    const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
    const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
    const cx = x + w / 2, cy = y + h / 2, cos = Math.cos(angle), sin = Math.sin(angle);
    const rot = (px, py) => {
        const dx = px - cx, dy = py - cy;
        return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    };
    return segments.map(seg => {
        const a = rot(seg.x1, seg.y1), b = rot(seg.x2, seg.y2);
        return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
    });
}

function rotatePreviewDrawTracePoints(points, obj = {}, cfg = {}) {
    const angle = ((Number.isFinite(obj.rotation) ? obj.rotation : (cfg.rotation || 0)) * Math.PI) / 180;
    if (!angle) return points;
    const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
    const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
    const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
    const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
    const cx = x + w / 2, cy = y + h / 2, cos = Math.cos(angle), sin = Math.sin(angle);
    return points.map(point => {
        const dx = point.x - cx, dy = point.y - cy;
        return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
    });
}

function previewDrawTracePointsToSegments(points) {
    const segments = [];
    for (let i = 0; i < points.length - 1; i++) {
        segments.push({ x1: points[i].x, y1: points[i].y, x2: points[i + 1].x, y2: points[i + 1].y });
    }
    return segments;
}

function drawPreviewFreezeCrackEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const progress = Math.max(0, Math.min(1, effect.progress));
    const x = Number.isFinite(anim.x) ? anim.x : (obj.x || 0);
    const y = Number.isFinite(anim.y) ? anim.y : (obj.y || 0);
    const w = Math.max(1, anim.w || obj.width || 1);
    const h = Math.max(1, anim.h || obj.height || 1);
    const cracks = Math.max(0, Math.min(80, anim.cracks || 9));
    const seed = anim.seed || 1;
    ctx.save();
    ctx.globalAlpha = (anim.opacity ?? 0.55) * progress;
    ctx.fillStyle = anim.tint || '#93c5fd';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,255,255,.88)';
    ctx.lineCap = 'round';
    ctx.shadowColor = '#bfdbfe';
    ctx.shadowBlur = 6;
    for (let i = 0; i < cracks; i++) {
        const rndA = previewSeededRandom(seed + i * 97);
        const rndB = previewSeededRandom(seed + i * 163);
        const sx = x + rndA * w;
        const sy = y + rndB * h;
        const len = Math.min(w, h) * (0.15 + previewSeededRandom(seed + i * 211) * 0.36) * progress;
        const branches = 2 + Math.floor(previewSeededRandom(seed + i * 269) * 3);
        ctx.globalAlpha = progress * (0.45 + rndA * 0.35);
        ctx.lineWidth = 1 + rndB * 1.4;
        for (let b = 0; b < branches; b++) {
            const angle = rndA * Math.PI * 2 + b * (Math.PI * 2 / branches) + progress;
            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawPreviewNeonTraceEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const progress = Math.max(0, Math.min(1, effect.progress));
    const x = Number.isFinite(anim.x) ? anim.x : (obj.x || 0);
    const y = Number.isFinite(anim.y) ? anim.y : (obj.y || 0);
    const w = Math.max(1, anim.w || obj.width || 1);
    const h = Math.max(1, anim.h || obj.height || 1);
    const perimeter = 2 * (w + h);
    const drawLen = perimeter * progress;
    const points = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
    ctx.save();
    ctx.strokeStyle = anim.color || '#22d3ee';
    ctx.lineWidth = Math.max(1, anim.width || 5);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = Math.max(0, anim.glow || 18);
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    let remaining = drawLen;
    for (let i = 1; i < points.length && remaining > 0; i++) {
        const a = points[i - 1], b = points[i];
        const seg = Math.hypot(b.x - a.x, b.y - a.y);
        const t = Math.min(1, remaining / Math.max(1, seg));
        ctx.lineTo(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
        remaining -= seg;
    }
    ctx.stroke();
    ctx.restore();
}

function drawPreviewShadowPopEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const offset = Math.max(0, anim.offset || 26) * progress;
    const savedOpacity = obj.opacity;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.5 * (1 - progress * 0.12));
    ctx.shadowColor = anim.color || '#0f172a';
    ctx.shadowBlur = Math.max(0, anim.blur || 18);
    ctx.translate(offset, offset);
    obj.opacity = 0.42;
    drawObj(ctx, obj);
    ctx.restore();
    obj.opacity = savedOpacity;
}

function drawPreviewExplosionSmokeEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const progress = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(240, anim.count || 24));
    const radius = Math.max(1, anim.radius || 180);
    const size = Math.max(1, anim.size || 34);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const seed = anim.seed || 1;
    ctx.save();
    ctx.fillStyle = anim.color || '#64748b';
    for (let i = 0; i < count; i++) {
        const rnd = previewSeededRandom(seed + i * 131);
        const rndB = previewSeededRandom(seed + i * 197);
        const angle = rnd * Math.PI * 2;
        const travel = radius * progress * (0.25 + rndB * 0.9);
        const x = originX + Math.cos(angle) * travel;
        const y = originY + Math.sin(angle) * travel * 0.82 - progress * radius * 0.15;
        ctx.globalAlpha = Math.max(0, 0.42 * (1 - progress) + 0.08);
        ctx.beginPath();
        ctx.arc(x, y, size * (0.35 + rnd * 0.9) * (0.45 + progress), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = Math.max(0, 0.85 * (1 - progress));
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(originX, originY, Math.max(8, size * 0.5) * (1 + progress), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawPreviewPaintStrokeEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const progress = Math.max(0, Math.min(1, effect.progress));
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const length = Math.max(1, anim.length || 220);
    const width = Math.max(1, anim.width || 18);
    const startX = originX - length * 0.45;
    const seed = anim.seed || 1;
    ctx.save();
    ctx.strokeStyle = anim.color || '#ec4899';
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = width * 0.35;
    ctx.beginPath();
    ctx.moveTo(startX, originY + width * 0.4);
    ctx.bezierCurveTo(originX - length * 0.18, originY - width * 2, originX + length * 0.2, originY + width * 2, startX + length * progress, originY - width * 0.5);
    ctx.stroke();
    for (let i = 0; i < Math.max(0, Math.min(240, anim.splatter || 18)) * progress; i++) {
        const rnd = previewSeededRandom(seed + i * 83);
        const rndB = previewSeededRandom(seed + i * 149);
        ctx.globalAlpha = 0.35 + rnd * 0.4;
        ctx.beginPath();
        ctx.arc(startX + length * rnd * progress, originY + (rndB - 0.5) * width * 5, Math.max(1, width * (0.08 + rndB * 0.12)), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewChromaticGlitchEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const intensity = Math.max(1, anim.intensity || 18) * Math.sin(progress * Math.PI);
    const slices = Math.max(1, Math.min(120, anim.slices || 12));
    const shift = Math.max(0, anim.colorShift || 10) * Math.sin(progress * Math.PI);
    const seed = anim.seed || 1;
    const savedOpacity = obj.opacity;
    obj.opacity = savedOpacity || 1;
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.translate(-shift, 0);
    drawObj(ctx, obj);
    ctx.restore();
    ctx.save();
    ctx.globalAlpha = 0.72;
    ctx.translate(shift, 0);
    drawObj(ctx, obj);
    ctx.restore();
    for (let i = 0; i < slices; i++) {
        const rnd = previewSeededRandom(seed + i * 113);
        const y = (obj.y || 0) + ((obj.height || 1) / slices) * i;
        const h = Math.max(2, (obj.height || 1) / slices);
        const dx = (rnd - 0.5) * intensity * 2;
        ctx.save();
        ctx.beginPath();
        ctx.rect((obj.x || 0) - Math.abs(dx) - 8, y, (obj.width || 1) + Math.abs(dx) * 2 + 16, h);
        ctx.clip();
        ctx.translate(dx, 0);
        drawObj(ctx, obj);
        ctx.restore();
    }
    obj.opacity = savedOpacity;
}

function previewColorToRgba(color, alpha = 1) {
    if (typeof color !== 'string') return 'rgba(249,115,22,' + alpha + ')';
    let hex = color.replace('#', '');
    if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
    if (hex.length !== 6) return color;
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function drawPreviewShockwaveRingEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    ctx.save();
    ctx.strokeStyle = anim.color || '#38bdf8';
    ctx.lineWidth = 4;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
    for (let i = 0; i < Math.max(1, anim.rings || 3); i++) {
        const t = Math.max(0, Math.min(1, p - i * 0.12));
        if (!t) continue;
        ctx.globalAlpha = Math.max(0, 0.85 * (1 - t));
        ctx.beginPath();
        ctx.arc(ox, oy, Math.max(1, (anim.radius || 220) * t), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewMagicPortalEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const radius = Math.max(1, anim.radius || 90) * (0.55 + p * 0.45);
    ctx.save();
    ctx.strokeStyle = anim.color || '#8b5cf6';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 20;
    ctx.lineWidth = 3;
    for (let r = 0; r < 3; r++) {
        ctx.globalAlpha = Math.max(0, 0.75 - r * 0.18);
        ctx.beginPath();
        ctx.ellipse(ox, oy, radius * (1 + r * 0.14), radius * (0.36 + r * 0.04), p * Math.PI * 2 + r, 0, Math.PI * 2);
        ctx.stroke();
    }
    for (let i = 0; i < Math.max(3, anim.spokes || 18); i++) {
        const a = (i / Math.max(3, anim.spokes || 18)) * Math.PI * 2 + p * Math.PI * 3;
        ctx.globalAlpha = 0.45;
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(a) * radius * 0.35, oy + Math.sin(a) * radius * 0.18);
        ctx.lineTo(ox + Math.cos(a) * radius, oy + Math.sin(a) * radius * 0.42);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewGlassShatterEffect(ctx, effect) {
    const anim = effect.anim || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const pieces = Math.max(3, Math.min(160, anim.pieces || 24));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (anim.x || 0) + (anim.w || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (anim.y || 0) + (anim.h || 0) / 2;
    ctx.save();
    ctx.fillStyle = anim.color || '#bfdbfe';
    ctx.strokeStyle = 'rgba(255,255,255,.8)';
    for (let i = 0; i < pieces; i++) {
        const rnd = previewSeededRandom((anim.seed || 1) + i * 71);
        const rndB = previewSeededRandom((anim.seed || 1) + i * 137);
        const a = rnd * Math.PI * 2;
        const dist = (anim.spread || 180) * p * (0.2 + rndB);
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.8 * (1 - p * 0.75));
        ctx.translate(ox + Math.cos(a) * dist, oy + Math.sin(a) * dist);
        ctx.rotate(a + p * 4);
        const size = 5 + rnd * 16;
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, size * 0.6);
        ctx.lineTo(-size * 0.8, size * 0.4);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
}

function drawPreviewElectricChargeEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const bolts = Math.max(1, anim.bolts || 10);
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    ctx.save();
    ctx.strokeStyle = anim.color || '#60a5fa';
    ctx.lineWidth = 2.5;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 16;
    ctx.globalAlpha = 0.35 + Math.sin(p * Math.PI) * 0.55;
    for (let i = 0; i < bolts; i++) {
        const a = (i / bolts) * Math.PI * 2 + p * 3 + previewSeededRandom((anim.seed || 1) + i) * 0.7;
        const len = (anim.radius || 120) * (0.45 + previewSeededRandom((anim.seed || 1) + i * 9) * 0.55);
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        for (let s = 1; s <= 4; s++) {
            const jitter = (previewSeededRandom((anim.seed || 1) + i * 41 + s) - 0.5) * 22;
            ctx.lineTo(ox + Math.cos(a) * len * (s / 4) + Math.cos(a + Math.PI / 2) * jitter, oy + Math.sin(a) * len * (s / 4) + Math.sin(a + Math.PI / 2) * jitter);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewInkBleedEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    ctx.save();
    ctx.fillStyle = anim.color || '#111827';
    for (let i = 0; i < Math.max(1, Math.min(240, anim.drops || 28)); i++) {
        const rnd = previewSeededRandom((anim.seed || 1) + i * 67);
        const rndB = previewSeededRandom((anim.seed || 1) + i * 127);
        const a = rnd * Math.PI * 2;
        ctx.globalAlpha = 0.08 + (1 - p * 0.35) * 0.42;
        ctx.beginPath();
        ctx.arc(ox + Math.cos(a) * (anim.spread || 120) * p * rndB, oy + Math.sin(a) * (anim.spread || 120) * p * rndB, (6 + rnd * 24) * p, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewMotionSmearEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const p = Math.max(0, Math.min(1, effect.progress));
    const dirs = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 };
    const angle = dirs[anim.direction] ?? 0;
    const dist = Math.max(1, anim.distance || 90) * Math.sin(p * Math.PI);
    const copies = Math.max(1, Math.min(40, anim.copies || 6));
    const savedOpacity = obj.opacity;
    for (let i = copies; i >= 1; i--) {
        const t = i / copies;
        ctx.save();
        ctx.globalAlpha = 0.12 * (1 - t) + 0.08;
        ctx.translate(-Math.cos(angle) * dist * t, -Math.sin(angle) * dist * t);
        obj.opacity = savedOpacity;
        drawObj(ctx, obj);
        ctx.restore();
    }
    obj.opacity = savedOpacity;
}

function drawPreviewStageShakeEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const p = Math.max(0, Math.min(1, effect.progress));
    const amount = Math.max(1, anim.amount || 16) * (1 - p);
    const dx = Math.sin(p * (anim.frequency || 18) * Math.PI * 2) * amount;
    const dy = Math.cos(p * (anim.frequency || 18) * Math.PI * 1.7) * amount;
    const savedOpacity = obj.opacity;
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.translate(dx, dy);
    drawObj(ctx, obj);
    ctx.restore();
    obj.opacity = savedOpacity;
}

function drawPreviewMaskRevealEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const p = Math.max(0, Math.min(1, effect.progress));
    const x = Number.isFinite(anim.x) ? anim.x : obj.x;
    const y = Number.isFinite(anim.y) ? anim.y : obj.y;
    const w = Math.max(1, anim.w || obj.width || 1);
    const h = Math.max(1, anim.h || obj.height || 1);
    const ox = Number.isFinite(anim.originX) ? anim.originX : x + w / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : y + h / 2;
    const savedOpacity = obj.opacity;
    obj.opacity = 1;
    ctx.save();
    ctx.beginPath();
    if (anim.shape === 'rectangle') {
        const rw = w * p, rh = h * p;
        ctx.rect(ox - rw / 2, oy - rh / 2, rw, rh);
    } else if (anim.shape === 'wipe') {
        ctx.rect(x, y, w * p, h);
    } else {
        ctx.arc(ox, oy, Math.hypot(w, h) * p, 0, Math.PI * 2);
    }
    ctx.clip();
    drawObj(ctx, obj);
    ctx.restore();
    if (anim.feather > 0) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.25 * (1 - p));
        ctx.strokeStyle = 'rgba(255,255,255,.55)';
        ctx.lineWidth = anim.feather;
        ctx.beginPath();
        ctx.arc(ox, oy, Math.hypot(w, h) * p, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }
    obj.opacity = savedOpacity;
}

function drawPreviewPathTrailEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const cx = (obj.x || 0) + (obj.width || 0) / 2;
    const cy = (obj.y || 0) + (obj.height || 0) / 2;
    const dirs = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 };
    const angle = (dirs[anim.direction] ?? 0) + Math.PI;
    const len = Math.max(1, anim.length || 120) * p;
    const width = Math.max(1, anim.width || 16);
    const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    grad.addColorStop(0, previewColorToRgba(anim.color || '#38bdf8', 0.75));
    grad.addColorStop(1, previewColorToRgba(anim.color || '#38bdf8', 0));
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
    ctx.stroke();
    ctx.restore();
}

function drawPreviewParticleFountainEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(400, anim.count || 42));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0);
    ctx.save();
    ctx.fillStyle = anim.color || '#facc15';
    for (let i = 0; i < count; i++) {
        const r1 = previewSeededRandom((anim.seed || 1) + i * 37);
        const r2 = previewSeededRandom((anim.seed || 1) + i * 97);
        const t = Math.max(0, Math.min(1, (p + r1 * 0.55) % 1));
        const a = -Math.PI / 2 + (r1 - 0.5) * 1.45;
        const d = (anim.spread || 150) * t;
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.beginPath();
        ctx.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d + d * d / Math.max(1, anim.spread || 150) * 0.6, 2 + r2 * 5, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewLightSweepEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const x = Number.isFinite(anim.x) ? anim.x : (obj.x || 0);
    const y = Number.isFinite(anim.y) ? anim.y : (obj.y || 0);
    const w = Math.max(1, anim.w || obj.width || 1);
    const h = Math.max(1, anim.h || obj.height || 1);
    const sweepX = x - w + (w * 3) * p;
    const width = Math.max(1, anim.width || 70);
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.translate(sweepX, y + h / 2);
    ctx.rotate(anim.angle || 0);
    const grad = ctx.createLinearGradient(-width, 0, width, 0);
    grad.addColorStop(0, previewColorToRgba(anim.color || '#fff', 0));
    grad.addColorStop(0.5, previewColorToRgba(anim.color || '#fff', 0.75));
    grad.addColorStop(1, previewColorToRgba(anim.color || '#fff', 0));
    ctx.fillStyle = grad;
    ctx.fillRect(-width, -h, width * 2, h * 2);
    ctx.restore();
}

function drawPreviewWeatherEffect(ctx, effect) {
    const anim = effect.anim || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(600, anim.count || 80));
    const w = anim.stageW || canvas.width || 1280;
    const h = anim.stageH || canvas.height || 720;
    ctx.save();
    ctx.strokeStyle = anim.color || '#bfdbfe';
    ctx.fillStyle = anim.color || '#bfdbfe';
    for (let i = 0; i < count; i++) {
        const r1 = previewSeededRandom((anim.seed || 1) + i * 31);
        const r2 = previewSeededRandom((anim.seed || 1) + i * 79);
        const y = ((r2 + p) % 1) * h;
        const x = (r1 * w + (anim.wind || 0) * p) % w;
        ctx.globalAlpha = anim.weather === 'fog' ? 0.08 : 0.5 + r2 * 0.35;
        if (anim.weather === 'snow') {
            ctx.beginPath();
            ctx.arc(x, y, 1.5 + r2 * 3, 0, Math.PI * 2);
            ctx.fill();
        } else if (anim.weather === 'fog') {
            ctx.fillRect(x - 80, y, 160, 18 + r2 * 24);
        } else {
            ctx.lineWidth = 1 + r2 * 1.4;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (anim.wind || 0) * 0.08, y + 18 + r2 * 22);
            ctx.stroke();
        }
    }
    ctx.restore();
}

function drawPreviewBubbleRiseEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(300, anim.count || 34));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0);
    const spread = Math.max(1, anim.spread || 120), size = Math.max(1, anim.size || 18);
    ctx.save();
    ctx.strokeStyle = anim.color || '#7dd3fc';
    ctx.fillStyle = previewColorToRgba(anim.color || '#7dd3fc', 0.1);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < count; i++) {
        const r1 = previewSeededRandom((anim.seed || 1) + i * 53);
        const r2 = previewSeededRandom((anim.seed || 1) + i * 107);
        const t = (p + r1 * 0.8) % 1;
        const x = ox + (r1 - 0.5) * spread + Math.sin(t * Math.PI * 2 + i) * spread * 0.08;
        const y = oy - t * spread * (1.2 + r2);
        ctx.globalAlpha = Math.max(0, 0.75 * (1 - t));
        ctx.beginPath();
        ctx.arc(x, y, size * (0.35 + r2 * 0.8) * (0.7 + t * 0.35), 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewMeteorShowerEffect(ctx, effect) {
    const anim = effect.anim || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(200, anim.count || 18));
    const w = anim.stageW || canvas.width || 1280, h = anim.stageH || canvas.height || 720;
    const angle = Number.isFinite(anim.angle) ? anim.angle : Math.PI / 6;
    const length = Math.max(1, anim.length || 130);
    const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = anim.color || '#fde68a';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    for (let i = 0; i < count; i++) {
        const r1 = previewSeededRandom((anim.seed || 1) + i * 47);
        const r2 = previewSeededRandom((anim.seed || 1) + i * 89);
        const travel = (p + r2 * 0.65) % 1;
        const x = r1 * w + (travel - 0.5) * w * 1.2;
        const y = r2 * h + (travel - 0.5) * h * 0.45;
        ctx.globalAlpha = Math.max(0, 0.8 * (1 - Math.abs(travel - 0.5) * 1.5));
        ctx.lineWidth = 1.5 + r2 * 2.5;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - dx, y - dy);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewSpotlightSweepEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const x = Number.isFinite(anim.x) ? anim.x : (obj.x || 0);
    const y = Number.isFinite(anim.y) ? anim.y : (obj.y || 0);
    const w = Math.max(1, anim.w || obj.width || 1), h = Math.max(1, anim.h || obj.height || 1);
    const stageW = anim.stageW || canvas.width || 1280, stageH = anim.stageH || canvas.height || 720;
    const radius = Math.max(1, anim.radius || 180);
    const sx = x - radius + (w + radius * 2) * p;
    const sy = y + h / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,' + Math.max(0, Math.min(1, anim.dim ?? 0.28)) + ')';
    ctx.fillRect(0, 0, stageW, stageH);
    const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
    grad.addColorStop(0, previewColorToRgba(anim.color || '#fde68a', 0.62));
    grad.addColorStop(0.58, previewColorToRgba(anim.color || '#fde68a', 0.18));
    grad.addColorStop(1, previewColorToRgba(anim.color || '#fde68a', 0));
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawPreviewRadialRaysEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(160, anim.count || 18));
    const len = Math.max(1, anim.length || 220) * p;
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    ctx.save();
    ctx.strokeStyle = anim.color || '#facc15';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
        const a = (i / count) * Math.PI * 2 + p * Math.PI * 0.5;
        ctx.globalAlpha = Math.max(0, 0.65 * (1 - p * 0.35));
        ctx.lineWidth = 1 + (i % 3);
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(a) * len * 0.16, oy + Math.sin(a) * len * 0.16);
        ctx.lineTo(ox + Math.cos(a) * len, oy + Math.sin(a) * len);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewOutlinePulseEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const x = Number.isFinite(anim.x) ? anim.x : (obj.x || 0);
    const y = Number.isFinite(anim.y) ? anim.y : (obj.y || 0);
    const w = Math.max(1, anim.w || obj.width || 1), h = Math.max(1, anim.h || obj.height || 1);
    const rings = Math.max(1, Math.min(12, anim.rings || 3));
    ctx.save();
    ctx.strokeStyle = anim.color || '#38bdf8';
    ctx.lineWidth = Math.max(1, anim.width || 4);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 14;
    for (let i = 0; i < rings; i++) {
        const t = Math.max(0, Math.min(1, p - i * 0.14));
        if (t <= 0) continue;
        const pad = t * Math.max(w, h) * 0.28;
        ctx.globalAlpha = Math.max(0, 0.82 * (1 - t));
        ctx.strokeRect(x - pad, y - pad, w + pad * 2, h + pad * 2);
    }
    ctx.restore();
}

function drawPreviewSpeedLinesEffect(ctx, effect) {
    const anim = effect.anim || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(300, anim.count || 36));
    const stageW = anim.stageW || canvas.width || 1280, stageH = anim.stageH || canvas.height || 720;
    const dirs = { right: 0, left: Math.PI, up: -Math.PI / 2, down: Math.PI / 2 };
    const angle = (dirs[anim.direction] ?? 0) + Math.PI;
    const len = Math.max(1, anim.length || 160);
    ctx.save();
    ctx.strokeStyle = anim.color || '#fff';
    ctx.lineCap = 'round';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    for (let i = 0; i < count; i++) {
        const r1 = previewSeededRandom((anim.seed || 1) + i * 43);
        const r2 = previewSeededRandom((anim.seed || 1) + i * 101);
        const slide = (p + r2) % 1;
        const x = (r1 * stageW + Math.cos(angle + Math.PI) * slide * stageW) % stageW;
        const y = (r2 * stageH + Math.sin(angle + Math.PI) * slide * stageH) % stageH;
        ctx.globalAlpha = 0.18 + r1 * 0.42;
        ctx.lineWidth = 1 + r2 * 2.2;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + Math.cos(angle) * len * (0.35 + r1), y + Math.sin(angle) * len * (0.35 + r1));
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewStarfieldWarpEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(600, anim.count || 90));
    const spread = Math.max(1, anim.spread || 520);
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    ctx.save();
    ctx.strokeStyle = anim.color || '#dbeafe';
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
        const r1 = previewSeededRandom((anim.seed || 1) + i * 59);
        const r2 = previewSeededRandom((anim.seed || 1) + i * 137);
        const a = r1 * Math.PI * 2;
        const d = spread * ((r2 + p) % 1);
        const tail = Math.max(6, d * 0.16 * p);
        ctx.globalAlpha = Math.max(0, 0.75 * (1 - d / spread));
        ctx.lineWidth = 1 + r2 * 1.8;
        ctx.beginPath();
        ctx.moveTo(ox + Math.cos(a) * Math.max(0, d - tail), oy + Math.sin(a) * Math.max(0, d - tail));
        ctx.lineTo(ox + Math.cos(a) * d, oy + Math.sin(a) * d);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewColorWashEffect(ctx, effect) {
    const anim = effect.anim || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const stageW = anim.stageW || canvas.width || 1280, stageH = anim.stageH || canvas.height || 720;
    const alpha = Math.max(0, Math.min(1, anim.opacity ?? 0.35));
    const dir = anim.direction || 'right';
    const grad = (dir === 'up' || dir === 'down')
        ? ctx.createLinearGradient(0, dir === 'up' ? stageH : 0, 0, dir === 'up' ? 0 : stageH)
        : ctx.createLinearGradient(dir === 'left' ? stageW : 0, 0, dir === 'left' ? 0 : stageW, 0);
    grad.addColorStop(0, previewColorToRgba(anim.color || '#38bdf8', 0));
    grad.addColorStop(Math.max(0, p - 0.22), previewColorToRgba(anim.color || '#38bdf8', 0));
    grad.addColorStop(Math.min(1, p), previewColorToRgba(anim.color || '#38bdf8', alpha));
    grad.addColorStop(Math.min(1, p + 0.28), previewColorToRgba(anim.color || '#38bdf8', 0));
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, stageW, stageH);
    ctx.restore();
}

function drawPreviewHaloBurstEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const rings = Math.max(1, Math.min(16, anim.rings || 4));
    const radius = Math.max(1, anim.radius || 190);
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    ctx.save();
    ctx.strokeStyle = anim.color || '#facc15';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    for (let i = 0; i < rings; i++) {
        const t = Math.max(0, Math.min(1, p - i * 0.08));
        if (t <= 0) continue;
        ctx.globalAlpha = Math.max(0, 0.72 * (1 - t));
        ctx.lineWidth = 2 + (rings - i) * 0.7;
        ctx.beginPath();
        ctx.arc(ox, oy, radius * t * (0.35 + i / rings), 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewShadowCastEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const p = Math.max(0, Math.min(1, effect.progress));
    const savedOpacity = obj.opacity;
    const dist = Math.max(1, anim.length || 90) * Math.sin(p * Math.PI);
    const angle = Number.isFinite(anim.angle) ? anim.angle : Math.PI / 5;
    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, anim.opacity ?? 0.35)) * (0.35 + Math.sin(p * Math.PI) * 0.65);
    ctx.translate(Math.cos(angle) * dist, Math.sin(angle) * dist);
    ctx.shadowColor = anim.color || '#020617';
    ctx.shadowBlur = 22;
    obj.opacity = 0.5;
    drawObj(ctx, obj);
    ctx.restore();
    obj.opacity = savedOpacity;
}

function drawPreviewEnergyShieldEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const radius = Math.max(1, anim.radius || 95) * (0.78 + Math.sin(p * Math.PI) * 0.22);
    const bands = Math.max(1, Math.min(18, anim.bands || 4));
    ctx.save();
    ctx.strokeStyle = anim.color || '#22d3ee';
    ctx.fillStyle = previewColorToRgba(anim.color || '#22d3ee', 0.08);
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 18;
    ctx.globalAlpha = 0.45 + Math.sin(p * Math.PI) * 0.45;
    ctx.beginPath();
    ctx.ellipse(ox, oy, radius, radius * 0.72, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 2.4;
    ctx.stroke();
    for (let i = 0; i < bands; i++) {
        ctx.globalAlpha = 0.32 + 0.28 * Math.sin(p * Math.PI);
        ctx.beginPath();
        ctx.ellipse(ox, oy, radius * (0.9 - i * 0.035), radius * (0.22 + i * 0.07), p * Math.PI * 2 + (i / bands) * Math.PI, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewMagnifyLensEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const p = Math.max(0, Math.min(1, effect.progress));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const radius = Math.max(1, anim.radius || 90) * (0.85 + Math.sin(p * Math.PI) * 0.15);
    const savedOpacity = obj.opacity;
    ctx.save();
    ctx.beginPath();
    ctx.arc(ox, oy, radius, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(ox, oy);
    ctx.scale(Math.max(1, anim.zoom || 1.35), Math.max(1, anim.zoom || 1.35));
    ctx.translate(-ox, -oy);
    obj.opacity = 1;
    drawObj(ctx, obj);
    ctx.restore();
    obj.opacity = savedOpacity;
    ctx.save();
    ctx.strokeStyle = anim.color || '#bfdbfe';
    ctx.fillStyle = previewColorToRgba(anim.color || '#bfdbfe', 0.08);
    ctx.lineWidth = 3;
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(ox, oy, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
}

function drawPreviewRainbowArcEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const ox = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const oy = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6', '#ec4899'];
    const bands = Math.max(2, Math.min(colors.length, anim.bands || 6));
    const radius = Math.max(1, anim.radius || 180);
    const width = Math.max(1, anim.width || 10);
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < bands; i++) {
        ctx.strokeStyle = colors[i % colors.length];
        ctx.globalAlpha = Math.max(0, 0.8 * (1 - p * 0.15));
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.arc(ox, oy, radius + i * width * 1.25, Math.PI, Math.PI + Math.PI * p);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewVignettePulseEffect(ctx, effect) {
    const anim = effect.anim || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const w = anim.stageW || canvas.width || 1280, h = anim.stageH || canvas.height || 720;
    const strength = Math.max(0, Math.min(1, anim.strength ?? 0.55)) * Math.sin(p * Math.PI);
    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.hypot(w, h) * 0.55);
    grad.addColorStop(0, previewColorToRgba(anim.color || '#020617', 0));
    grad.addColorStop(1, previewColorToRgba(anim.color || '#020617', strength));
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
}

function drawPreviewScanGridEffect(ctx, effect) {
    const anim = effect.anim || {};
    const p = Math.max(0, Math.min(1, effect.progress));
    const w = anim.stageW || canvas.width || 1280, h = anim.stageH || canvas.height || 720;
    const size = Math.max(4, anim.size || 36);
    ctx.save();
    ctx.strokeStyle = anim.color || '#22d3ee';
    ctx.globalAlpha = Math.max(0, Math.min(1, anim.opacity ?? 0.35));
    ctx.lineWidth = 1;
    const offset = (p * size * 2) % size;
    for (let x = -size + offset; x <= w + size; x += size) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    for (let y = -size + offset; y <= h + size; y += size) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
    }
    ctx.globalAlpha *= 1.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, (p * h) % h);
    ctx.lineTo(w, (p * h) % h);
    ctx.stroke();
    ctx.restore();
}

function drawPreviewFake3DTurnEffect(ctx, effect, mode = 'card') {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const p = Math.max(0, Math.min(1, effect.progress));
    const x = Number.isFinite(anim.x) ? anim.x : (obj.x || 0);
    const y = Number.isFinite(anim.y) ? anim.y : (obj.y || 0);
    const w = Math.max(1, anim.w || obj.width || 1);
    const h = Math.max(1, anim.h || obj.height || 1);
    const savedOpacity = obj.opacity;
    const wave = mode === 'flap' ? Math.sin(p * Math.PI) : Math.cos(p * Math.PI);
    const squeeze = Math.max(0.08, Math.abs(wave));
    const shade = Math.min(0.55, 0.12 + (1 - squeeze) * 0.55);
    let pivotX = x + w / 2;
    let pivotY = y + h / 2;
    ctx.save();
    if (mode === 'page') {
        pivotX = x;
        ctx.translate(pivotX, pivotY);
        ctx.transform(squeeze, 0, (1 - squeeze) * -0.24, 1, 0, 0);
        ctx.translate(-pivotX, -pivotY);
    } else if (mode === 'flap') {
        pivotY = y;
        const sy = Math.max(0.12, Math.cos(p * Math.PI * 0.85));
        ctx.translate(pivotX, pivotY);
        ctx.transform(1, (1 - sy) * 0.18, 0, sy, 0, 0);
        ctx.translate(-pivotX, -pivotY);
    } else {
        ctx.translate(pivotX, pivotY);
        ctx.transform(squeeze, 0, (wave < 0 ? -1 : 1) * (1 - squeeze) * 0.18, 1, 0, 0);
        ctx.translate(-pivotX, -pivotY);
    }
    obj.opacity = 1;
    drawObj(ctx, obj);
    ctx.fillStyle = 'rgba(0,0,0,' + shade + ')';
    ctx.fillRect(x, y, w, h);
    ctx.restore();
    obj.opacity = savedOpacity;
}

function drawPreviewSwirlTornadoEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const progress = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(3, Math.min(140, anim.count || 22));
    const radius = Math.max(1, anim.radius || 130);
    const turns = Math.max(0.1, anim.turns || 2.5);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const seed = anim.seed || 1;
    ctx.save();
    ctx.strokeStyle = anim.color || '#38bdf8';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = ctx.strokeStyle;
    ctx.shadowBlur = 8;
    for (let i = 0; i < count; i++) {
        const rnd = previewSeededRandom(seed + i * 91);
        const heightT = i / Math.max(1, count - 1);
        const baseAngle = heightT * turns * Math.PI * 2 + progress * Math.PI * 4 + rnd * Math.PI * 2;
        const y = originY + (heightT - 0.5) * radius * 1.35;
        const rx = radius * (0.12 + heightT * 0.55) * (0.65 + rnd * 0.45);
        const ry = Math.max(6, rx * 0.34);
        ctx.globalAlpha = Math.max(0, (1 - Math.abs(heightT - progress) * 1.25)) * 0.78;
        ctx.lineWidth = 1.2 + (1 - heightT) * 2.2;
        ctx.beginPath();
        for (let s = 0; s <= 18; s++) {
            const t = s / 18;
            const a = baseAngle + t * Math.PI * 1.35;
            const x = originX + Math.cos(a) * rx * (0.65 + t * 0.35);
            const yy = y + Math.sin(a) * ry + (t - 0.5) * 14;
            if (s === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewFireFlickerEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const progress = Math.max(0, Math.min(1, effect.progress));
    const count = Math.max(1, Math.min(180, anim.count || 28));
    const height = Math.max(1, anim.height || 90);
    const width = Math.max(20, anim.width || 80);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0);
    const color = anim.color || '#f97316';
    const glowColor = previewColorToRgba(color, 0.18);
    const seed = anim.seed || 1;
    ctx.save();
    for (let i = 0; i < count; i++) {
        const rndA = previewSeededRandom(seed + i * 101);
        const rndB = previewSeededRandom(seed + i * 211);
        const wave = Math.sin(progress * Math.PI * 8 + rndA * Math.PI * 2);
        const x = originX + (rndA - 0.5) * width * (0.45 + rndB);
        const flameH = height * (0.35 + rndB * 0.85) * (0.78 + wave * 0.18);
        const baseW = Math.max(3, width / Math.max(12, count) * (1.4 + rndA));
        const y = originY - flameH * progress;
        const grad = ctx.createRadialGradient(x, y + flameH * 0.35, 1, x, y + flameH * 0.45, flameH * 0.65);
        grad.addColorStop(0, previewColorToRgba(color, 0.95));
        grad.addColorStop(0.32, color);
        grad.addColorStop(1, glowColor);
        ctx.fillStyle = grad;
        ctx.globalAlpha = Math.max(0, 1 - progress * 0.18) * (0.45 + rndB * 0.45);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - baseW * (1 + rndB), originY - flameH * 0.45, x - baseW, originY);
        ctx.quadraticCurveTo(x, originY - flameH * 0.12, x + baseW, originY);
        ctx.quadraticCurveTo(x + baseW * (1 + rndA), originY - flameH * 0.5, x, y);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewDustAwayEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(500, anim.count || 80));
    const spread = Math.max(1, anim.spread || 210);
    const sizeBase = Math.max(1, anim.size || 5);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    ctx.save();
    ctx.fillStyle = anim.color || anim.objectColor || '#cbd5e1';
    for (let i = 0; i < count; i++) {
        const rndA = previewSeededRandom(seed + i * 127);
        const rndB = previewSeededRandom(seed + i * 197);
        const rndC = previewSeededRandom(seed + i * 251);
        const sx = (obj.x || originX) + rndA * (obj.width || 1);
        const sy = (obj.y || originY) + rndB * (obj.height || 1);
        const angle = Math.atan2(sy - originY, sx - originX) + (rndC - 0.5) * 1.2;
        const dist = spread * progress * (0.25 + rndC * 0.95);
        const x = sx + Math.cos(angle) * dist;
        const y = sy + Math.sin(angle) * dist - progress * spread * 0.22;
        const size = sizeBase * (0.45 + rndB * 1.1) * Math.max(0.2, 1 - progress * 0.45);
        ctx.globalAlpha = Math.max(0, 1 - progress) * (0.45 + rndA * 0.55);
        ctx.beginPath();
        ctx.rect(x - size / 2, y - size / 2, size, size);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewMeltDripEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const melt = progress * progress;
    const amount = Math.max(1, anim.amount || 90);
    const slices = Math.max(4, Math.min(120, anim.slices || 24));
    const drips = Math.max(0, Math.min(80, anim.drips || 12));
    const seed = anim.seed || 1;
    const savedOpacity = obj.opacity;
    obj.opacity = 1;
    ctx.save();
    for (let i = 0; i < slices; i++) {
        const rnd = previewSeededRandom(seed + i * 101);
        const x = obj.x + i * ((obj.width || 1) / slices);
        const w = (obj.width || 1) / slices + 1;
        const drop = amount * melt * (0.25 + rnd * 0.9);
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, obj.y, w, (obj.height || 1) + drop + 2);
        ctx.clip();
        ctx.translate(0, drop);
        drawObj(ctx, obj);
        ctx.restore();
    }
    ctx.fillStyle = anim.color || obj.fill || obj.stroke || '#ef4444';
    for (let i = 0; i < drips; i++) {
        const rndA = previewSeededRandom(seed + i * 137);
        const rndB = previewSeededRandom(seed + i * 223);
        const x = obj.x + rndA * (obj.width || 1);
        const len = amount * melt * (0.35 + rndB * 0.9);
        const width = Math.max(2, (obj.width || 80) / Math.max(18, drips * 2) * (0.45 + rndA));
        ctx.globalAlpha = Math.max(0, 0.85 - progress * 0.25);
        ctx.beginPath();
        ctx.ellipse(x, obj.y + (obj.height || 1) + len, width * 0.7, width, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x - width * 0.35, obj.y + (obj.height || 1), width * 0.7, len, width * 0.35);
        else ctx.rect(x - width * 0.35, obj.y + (obj.height || 1), width * 0.7, len);
        ctx.fill();
    }
    ctx.restore();
    obj.opacity = savedOpacity;
}

function drawPreviewBrushRevealEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const brush = Math.max(4, anim.brushSize || 54);
    const texture = Math.max(0, Math.min(1, anim.texture ?? 0.45));
    const direction = anim.direction || 'left-right';
    const seed = anim.seed || 1;
    const w = obj.width || 1, h = obj.height || 1;
    const savedOpacity = obj.opacity;
    obj.opacity = 1;
    ctx.save();
    ctx.beginPath();
    const pad = brush * (0.7 + texture);
    if (direction === 'right-left') ctx.rect(obj.x + w * (1 - progress) - pad, obj.y - pad, w * progress + pad * 2, h + pad * 2);
    else if (direction === 'top-bottom') ctx.rect(obj.x - pad, obj.y - pad, w + pad * 2, h * progress + pad * 2);
    else if (direction === 'bottom-top') ctx.rect(obj.x - pad, obj.y + h * (1 - progress) - pad, w + pad * 2, h * progress + pad * 2);
    else ctx.rect(obj.x - pad, obj.y - pad, w * progress + pad * 2, h + pad * 2);
    const blobs = Math.max(6, Math.round((direction.includes('left') || direction.includes('right') ? h : w) / Math.max(8, brush * 0.45)));
    for (let i = 0; i < blobs; i++) {
        const rndA = previewSeededRandom(seed + i * 83);
        const rndB = previewSeededRandom(seed + i * 149);
        const edgeX = direction === 'right-left' ? obj.x + w * (1 - progress) : direction === 'left-right' ? obj.x + w * progress : obj.x + rndA * w;
        const edgeY = direction === 'bottom-top' ? obj.y + h * (1 - progress) : direction === 'top-bottom' ? obj.y + h * progress : obj.y + rndA * h;
        const r = brush * (0.25 + rndB * 0.65) * texture;
        ctx.moveTo(edgeX + r, edgeY);
        ctx.arc(edgeX, edgeY, r, 0, Math.PI * 2);
    }
    ctx.clip();
    drawObj(ctx, obj);
    ctx.restore();
    obj.opacity = savedOpacity;
}

function previewBuildPaintRevealStrokes(x, y, w, h, anim) {
    const brush = Math.max(4, anim.brushSize || 58);
    const direction = anim.direction || 'left-right';
    const seed = anim.seed || 1;
    const pad = brush * 0.55;
    // One brush-wide row per band, with slight overlap so coverage is solid.
    const bandSpacing = brush * 0.78;
    const rand = (k) => previewSeededRandom(seed + k);
    const strokes = [];

    const horizontalRows = (startLeft, reverseOrder = false) => {
        const rows = Math.max(2, Math.ceil((h + pad * 2) / bandSpacing));
        const span = (h + pad * 2) / rows;
        // Iterate either top→bottom or bottom→top so painting actually
        // starts on the requested edge.
        const iter = reverseOrder
            ? Array.from({ length: rows }, (_, i) => rows - 1 - i)
            : Array.from({ length: rows }, (_, i) => i);
        for (let idx = 0; idx < iter.length; idx++) {
            const r = iter[idx];
            const yy = (y - pad) + (r + 0.5) * span + (rand(r * 23) - 0.5) * brush * 0.18;
            const leftToRight = startLeft ? (idx % 2 === 0) : (idx % 2 === 1);
            const x1 = leftToRight ? x - pad : x + w + pad;
            const x2 = leftToRight ? x + w + pad : x - pad;
            strokes.push({ x1, y1: yy, x2, y2: yy });
        }
    };
    const verticalCols = (startTop, reverseOrder = false) => {
        const cols = Math.max(2, Math.ceil((w + pad * 2) / bandSpacing));
        const span = (w + pad * 2) / cols;
        const iter = reverseOrder
            ? Array.from({ length: cols }, (_, i) => cols - 1 - i)
            : Array.from({ length: cols }, (_, i) => i);
        for (let idx = 0; idx < iter.length; idx++) {
            const c = iter[idx];
            const xx = (x - pad) + (c + 0.5) * span + (rand(c * 17) - 0.5) * brush * 0.18;
            const downward = startTop ? (idx % 2 === 0) : (idx % 2 === 1);
            const y1 = downward ? y - pad : y + h + pad;
            const y2 = downward ? y + h + pad : y - pad;
            strokes.push({ x1: xx, y1, x2: xx, y2 });
        }
    };

    if (direction === 'top-bottom') { horizontalRows(true, false); return strokes; }
    if (direction === 'bottom-top') { horizontalRows(true, true); return strokes; }
    if (direction === 'right-left') { verticalCols(true, true); return strokes; }
    if (direction === 'diagonal-down' || direction === 'diagonal-up') {
        const cx = x + w / 2;
        const cy = y + h / 2;
        const angle = direction === 'diagonal-down' ? Math.PI / 4 : -Math.PI / 4;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const diag = Math.hypot(w, h) + pad * 2;
        const rows = Math.max(2, Math.ceil(diag / bandSpacing));
        const span = diag / rows;
        for (let r = 0; r < rows; r++) {
            const localY = -diag / 2 + (r + 0.5) * span + (rand(r * 19) - 0.5) * brush * 0.18;
            const reverse = r % 2 === 1;
            const lx1 = reverse ? diag / 2 + pad : -diag / 2 - pad;
            const lx2 = reverse ? -diag / 2 - pad : diag / 2 + pad;
            // Rotate band-local coords back into stage coords.
            strokes.push({
                x1: cx + lx1 * cos - localY * sin,
                y1: cy + lx1 * sin + localY * cos,
                x2: cx + lx2 * cos - localY * sin,
                y2: cy + lx2 * sin + localY * cos
            });
        }
        return strokes;
    }
    if (direction === 'center-out') {
        const rows = Math.max(2, Math.ceil((h + pad * 2) / bandSpacing));
        const span = (h + pad * 2) / rows;
        const middle = Math.floor(rows / 2);
        const order = [middle];
        for (let off = 1; off <= Math.max(middle, rows - 1 - middle); off++) {
            if (middle + off < rows) order.push(middle + off);
            if (middle - off >= 0) order.push(middle - off);
        }
        for (let i = 0; i < order.length; i++) {
            const r = order[i];
            const yy = (y - pad) + (r + 0.5) * span + (rand(r * 23) - 0.5) * brush * 0.18;
            const leftToRight = i % 2 === 0;
            const x1 = leftToRight ? x - pad : x + w + pad;
            const x2 = leftToRight ? x + w + pad : x - pad;
            strokes.push({ x1, y1: yy, x2, y2: yy });
        }
        return strokes;
    }
    // Default: left-right zigzag rows top→bottom.
    horizontalRows(true);
    return strokes;
}

function previewPaintRevealStrokeWindows(totalStrokes) {
    // Sequential strokes with light overlap — you see ONE band being painted
    // at a time, but consecutive bands flow into each other.
    const overlap = 0.18;
    const denom = Math.max(1, totalStrokes - (totalStrokes - 1) * overlap);
    const slice = 1 / denom;
    return { slice, advance: slice * (1 - overlap) };
}

function drawPreviewPaintRevealMask(ctx, x, y, w, h, progress, anim) {
    // SOLID-white reveal mask. No partial-alpha hairlines — those previously
    // produced dark blotches on the revealed object. The mask is fully opaque
    // wherever the brush has passed.
    const p = Math.max(0, Math.min(1, progress));
    if (p <= 0) return;
    const brush = Math.max(4, anim.brushSize || 58);
    const texture = Math.max(0, Math.min(1, anim.texture ?? 0.55));
    const seed = anim.seed || 1;
    const jitter = brush * (0.04 + texture * 0.10);
    const strokes = previewBuildPaintRevealStrokes(x, y, w, h, anim);
    if (!strokes.length) return;
    const { slice, advance } = previewPaintRevealStrokeWindows(strokes.length);
    ctx.save();
    ctx.strokeStyle = '#fff';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalAlpha = 1;
    for (let i = 0; i < strokes.length; i++) {
        const startT = i * advance;
        const endT = startT + slice;
        let local;
        if (p >= endT) local = 1;
        else if (p <= startT) local = 0;
        else local = (p - startT) / Math.max(0.0001, endT - startT);
        if (local <= 0) continue;
        const s = strokes[i];
        const a = previewSeededRandom(seed + i * 97);
        const b = previewSeededRandom(seed + i * 131);
        const c = previewSeededRandom(seed + i * 173);
        const dx = s.x2 - s.x1;
        const dy = s.y2 - s.y1;
        const ex = s.x1 + dx * local;
        const ey = s.y1 + dy * local;
        const mx = (s.x1 + ex) / 2 + (b - 0.5) * jitter;
        const my = (s.y1 + ey) / 2 + (c - 0.5) * jitter * 0.5;
        // Wider than band-spacing so neighbouring rows merge into solid coverage.
        ctx.lineWidth = brush * (1.05 + a * 0.10);
        ctx.beginPath();
        ctx.moveTo(s.x1, s.y1);
        ctx.quadraticCurveTo(mx, my, ex, ey);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewPaintRevealBrushHead(ctx, strokes, progress, anim) {
    const p = Math.max(0, Math.min(1, progress));
    if (p <= 0 || !strokes || !strokes.length) return;
    const brush = Math.max(4, anim.brushSize || 58);
    const { slice, advance } = previewPaintRevealStrokeWindows(strokes.length);
    // Find the most-recently-active stroke whose window contains p.
    let activeIndex = -1;
    let activeLocal = 0;
    for (let i = strokes.length - 1; i >= 0; i--) {
        const startT = i * advance;
        const endT = startT + slice;
        if (p >= startT && p <= endT) {
            activeIndex = i;
            activeLocal = (p - startT) / Math.max(0.0001, endT - startT);
            break;
        }
    }
    if (activeIndex < 0) return;
    // Soft fade-out near the very end so the head doesn't pop off the object.
    const headFadeStart = 0.92;
    const headAlpha = p > headFadeStart ? Math.max(0, 1 - (p - headFadeStart) / Math.max(0.0001, 1 - headFadeStart)) : 1;
    if (headAlpha <= 0.01) return;
    const s = strokes[activeIndex];
    const ex = s.x1 + (s.x2 - s.x1) * activeLocal;
    const ey = s.y1 + (s.y2 - s.y1) * activeLocal;
    ctx.save();
    const headRadius = brush * 0.55;
    const grad = ctx.createRadialGradient(ex, ey, headRadius * 0.12, ex, ey, headRadius);
    grad.addColorStop(0, 'rgba(255,255,255,' + (0.75 * headAlpha) + ')');
    grad.addColorStop(0.55, 'rgba(255,255,255,' + (0.28 * headAlpha) + ')');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(ex, ey, headRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
}

function drawPreviewPaintRevealEffect(ctx, effect) {
    // The object is auto-hidden during this effect (effectObjectMode default).
    // We render the object onto a temp canvas, mask it with the brush-stroke
    // reveal mask, and composite the revealed portion onto the main canvas.
    // A visible brush head rides the leading tip of the active stroke.
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const progress = Math.max(0, Math.min(1, effect.progress));
    if (progress <= 0) return;
    const canvas = ctx.canvas;
    const temp = document.createElement('canvas');
    temp.width = canvas.width;
    temp.height = canvas.height;
    const tempCtx = temp.getContext('2d');
    const savedOpacity = obj.opacity;
    const savedVisible = obj.visible;
    obj.opacity = 1;
    obj.visible = true;
    drawObj(tempCtx, obj);
    if (progress >= 0.985) {
        ctx.drawImage(temp, 0, 0);
        obj.opacity = savedOpacity;
        obj.visible = savedVisible;
        return;
    }
    const strokes = previewBuildPaintRevealStrokes(obj.x || 0, obj.y || 0, obj.width || 1, obj.height || 1, anim);
    const mask = document.createElement('canvas');
    mask.width = canvas.width;
    mask.height = canvas.height;
    drawPreviewPaintRevealMask(mask.getContext('2d'), obj.x || 0, obj.y || 0, obj.width || 1, obj.height || 1, progress, anim);
    tempCtx.globalCompositeOperation = 'destination-in';
    tempCtx.drawImage(mask, 0, 0);
    tempCtx.globalCompositeOperation = 'source-over';
    ctx.drawImage(temp, 0, 0);
    drawPreviewPaintRevealBrushHead(ctx, strokes, progress, anim);
    obj.opacity = savedOpacity;
    obj.visible = savedVisible;
}

function drawPreviewLiquidMotionEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(300, anim.count || 34));
    const baseSize = Math.max(1, anim.size || 9);
    const spread = Math.max(1, anim.spread || 180);
    const gravity = Number.isFinite(anim.gravity) ? anim.gravity : 160;
    const mode = anim.mode || 'splash';
    const direction = anim.direction || 'down';
    const color = anim.color || '#38bdf8';
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const dirAngles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
    const baseAngle = dirAngles[direction] ?? Math.PI / 2;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < count; i++) {
        const rndA = previewSeededRandom(seed + i * 97);
        const rndB = previewSeededRandom(seed + i * 151);
        const rndC = previewSeededRandom(seed + i * 211);
        const delay = mode === 'drip' || mode === 'flow' ? rndA * 0.55 : rndA * 0.18;
        const t = Math.max(0, Math.min(1, (progress - delay) / Math.max(0.01, 1 - delay)));
        if (t <= 0) continue;
        const angle = direction === 'radial' ? rndA * Math.PI * 2 : baseAngle + (rndB - 0.5) * (mode === 'flow' ? 0.42 : 1.25);
        const distance = spread * t * (0.25 + rndC * 0.95);
        const streamOffset = mode === 'flow' ? (rndB - 0.5) * baseSize * 5 : 0;
        const x = originX + Math.cos(angle) * distance + Math.cos(baseAngle + Math.PI / 2) * streamOffset;
        const y = originY + Math.sin(angle) * distance + gravity * t * t * (mode === 'splash' ? 0.75 : 1) + Math.sin(baseAngle + Math.PI / 2) * streamOffset;
        const size = baseSize * (0.55 + rndB * 0.95) * (mode === 'flow' ? 0.75 : 1);
        ctx.globalAlpha = Math.max(0, 1 - t * 0.72) * (0.55 + rndC * 0.45);
        if (mode === 'flow') {
            ctx.lineWidth = Math.max(1, size * 0.62);
            ctx.beginPath();
            ctx.moveTo(originX + (x - originX) * 0.45, originY + (y - originY) * 0.45);
            ctx.quadraticCurveTo((originX + x) / 2 + (rndB - 0.5) * size * 6, (originY + y) / 2, x, y);
            ctx.stroke();
        } else {
            ctx.beginPath();
            ctx.ellipse(x, y, size * (0.75 + t * 0.25), size * (1.05 + t * 0.55), angle, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.restore();
}

function drawPreviewImpactBurstEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const rings = Math.max(1, Math.min(12, anim.rings || 2));
    const radius = Math.max(1, anim.radius || 180);
    const spikes = Math.max(0, Math.min(120, anim.spikes || 14));
    const width = Math.max(1, anim.width || 5);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const color = anim.color || '#f97316';
    const seed = anim.seed || 1;
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = width * 3;
    for (let i = 0; i < rings; i++) {
        const t = Math.max(0, Math.min(1, (progress - i * 0.08) / Math.max(0.01, 1 - i * 0.08)));
        if (t <= 0) continue;
        ctx.globalAlpha = Math.max(0, 1 - t) * (0.85 - i * 0.08);
        ctx.lineWidth = width * (1 - t * 0.45);
        ctx.beginPath(); ctx.arc(originX, originY, radius * t * (0.75 + i * 0.18), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.lineWidth = Math.max(1, width * 0.65);
    for (let i = 0; i < spikes; i++) {
        const rnd = previewSeededRandom(seed + i * 157);
        const angle = (i / Math.max(1, spikes)) * Math.PI * 2 + rnd * 0.35;
        const inner = radius * progress * (0.12 + rnd * 0.1);
        const outer = radius * progress * (0.45 + rnd * 0.55);
        ctx.globalAlpha = Math.max(0, 1 - progress) * (0.45 + rnd * 0.55);
        ctx.beginPath();
        ctx.moveTo(originX + Math.cos(angle) * inner, originY + Math.sin(angle) * inner);
        ctx.lineTo(originX + Math.cos(angle) * outer, originY + Math.sin(angle) * outer);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewWaveDistortEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const amplitude = Math.max(0, anim.amplitude || 18) * Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
    const frequency = Math.max(0.1, anim.frequency || 3);
    const slices = Math.max(4, Math.min(160, anim.slices || 28));
    const horizontal = (anim.direction || 'horizontal') !== 'vertical';
    const savedOpacity = obj.opacity;
    obj.opacity = 1;
    ctx.save();
    for (let i = 0; i < slices; i++) {
        const t = i / slices;
        const phase = effect.progress * Math.PI * 2;
        const offset = Math.sin(t * Math.PI * 2 * frequency + phase) * amplitude;
        ctx.save();
        ctx.beginPath();
        if (horizontal) {
            const h = (obj.height || 1) / slices + 1;
            const y = obj.y + i * ((obj.height || 1) / slices);
            ctx.rect(obj.x - Math.abs(amplitude) - 2, y, (obj.width || 1) + Math.abs(amplitude) * 2 + 4, h);
            ctx.clip();
            ctx.translate(offset, 0);
        } else {
            const w = (obj.width || 1) / slices + 1;
            const x = obj.x + i * ((obj.width || 1) / slices);
            ctx.rect(x, obj.y - Math.abs(amplitude) - 2, w, (obj.height || 1) + Math.abs(amplitude) * 2 + 4);
            ctx.clip();
            ctx.translate(0, offset);
        }
        drawObj(ctx, obj);
        ctx.restore();
    }
    ctx.restore();
    obj.opacity = savedOpacity;
}

function drawPreviewPixelBurstEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(400, anim.count || 42));
    const spread = Math.max(1, anim.spread || 150);
    const baseSize = Math.max(1, anim.size || 8);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const alpha = anim.fade === false ? 1 : Math.max(0, 1 - progress);
    ctx.save();
    for (let i = 0; i < count; i++) {
        const rnd = previewSeededRandom(seed + i * 127);
        const rnd2 = previewSeededRandom(seed + i * 197);
        const rnd3 = previewSeededRandom(seed + i * 251);
        const angle = rnd * Math.PI * 2;
        const distance = spread * progress * (0.3 + rnd2 * 0.95);
        const size = baseSize * (0.65 + rnd3 * 0.85);
        const x = originX + Math.cos(angle) * distance;
        const y = originY + Math.sin(angle) * distance;
        ctx.globalAlpha = alpha * (0.65 + rnd * 0.35);
        ctx.fillStyle = getPreviewPixelBurstColor(anim, i, rnd);
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + progress * Math.PI * (rnd2 > 0.5 ? 1 : -1));
        ctx.fillRect(-size / 2, -size / 2, size, size);
        ctx.restore();
    }
    ctx.restore();
}

function getPreviewPixelBurstColor(anim, index, rnd) {
    if (anim.colorMode === 'rainbow') {
        const hue = Math.round((index * 47 + rnd * 120) % 360);
        return 'hsl(' + hue + ', 90%, 60%)';
    }
    if (anim.colorMode === 'single') return anim.color || '#38bdf8';
    return anim.objectColor || anim.color || '#38bdf8';
}

function drawPreviewLensFlareEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x || 0) + (obj.width || 0) / 2;
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y || 0) + (obj.height || 0) / 2;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const pulse = Math.sin(progress * Math.PI);
    const intensity = Math.max(0, Math.min(1, anim.intensity ?? 0.75)) * pulse;
    const length = Math.max(1, anim.length || 180);
    const count = Math.max(0, Math.min(20, anim.count || 4));
    const angle = Number.isFinite(anim.angle) ? anim.angle : 0;
    const color = anim.color || '#fef3c7';
    const seed = anim.seed || 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineCap = 'round';
    ctx.shadowColor = color;
    ctx.shadowBlur = 18 + length * 0.04;
    ctx.globalAlpha = intensity;
    ctx.lineWidth = Math.max(1, length * 0.035);
    ctx.beginPath();
    ctx.moveTo(originX - Math.cos(angle) * length * 0.5, originY - Math.sin(angle) * length * 0.5);
    ctx.lineTo(originX + Math.cos(angle) * length * 0.5, originY + Math.sin(angle) * length * 0.5);
    ctx.moveTo(originX - Math.cos(angle + Math.PI / 2) * length * 0.22, originY - Math.sin(angle + Math.PI / 2) * length * 0.22);
    ctx.lineTo(originX + Math.cos(angle + Math.PI / 2) * length * 0.22, originY + Math.sin(angle + Math.PI / 2) * length * 0.22);
    ctx.stroke();
    const core = ctx.createRadialGradient(originX, originY, 0, originX, originY, length * 0.16);
    core.addColorStop(0, color); core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath(); ctx.arc(originX, originY, length * 0.16, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < count; i++) {
        const rnd = previewSeededRandom(seed + i * 151);
        const d = length * (0.25 + i * 0.18);
        const r = length * (0.025 + rnd * 0.04);
        ctx.globalAlpha = intensity * (0.45 - i * 0.018);
        ctx.beginPath();
        ctx.arc(originX + Math.cos(angle) * d, originY + Math.sin(angle) * d, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewScanBeamEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const x = Number.isFinite(anim.x) ? anim.x : (obj.x || 0);
    const y = Number.isFinite(anim.y) ? anim.y : (obj.y || 0);
    const w = Math.max(1, anim.w || obj.width || 1);
    const h = Math.max(1, anim.h || obj.height || 1);
    const width = Math.max(1, anim.width || 28);
    const opacity = Math.max(0, Math.min(1, anim.opacity ?? 0.65));
    const progress = Math.max(0, Math.min(1, effect.progress));
    const color = anim.color || '#22d3ee';
    const direction = anim.direction || 'left-right';
    const sweep = -width + (direction === 'right-left' || direction === 'bottom-top' ? (1 - progress) : progress) * ((direction === 'top-bottom' || direction === 'bottom-top') ? h + width * 2 : w + width * 2);
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    if (anim.glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 0.75;
    }
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (direction === 'top-bottom' || direction === 'bottom-top') {
        const gradient = ctx.createLinearGradient(x, y + sweep - width, x, y + sweep + width);
        gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(0.5, color); gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x - width, y + sweep - width, w + width * 2, width * 2);
    } else if (direction === 'diagonal') {
        const pos = -w + progress * (w + h + width * 2);
        ctx.translate(x + pos, y); ctx.rotate(Math.PI / 4); ctx.fillRect(-width / 2, -h, width, h * 3);
    } else {
        const gradient = ctx.createLinearGradient(x + sweep - width, y, x + sweep + width, y);
        gradient.addColorStop(0, 'rgba(255,255,255,0)'); gradient.addColorStop(0.5, color); gradient.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x + sweep - width, y - width, width * 2, h + width * 2);
    }
    ctx.restore();
}

function drawPreviewMagnetPullEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(240, anim.count || 28));
    const radius = Math.max(1, anim.radius || 180);
    const size = Math.max(1, anim.size || 6);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const pull = anim.mode !== 'push';
    ctx.save();
    ctx.fillStyle = anim.color || '#22c55e';
    ctx.strokeStyle = anim.color || '#22c55e';
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
        const rnd = previewSeededRandom(seed + i * 113);
        const rnd2 = previewSeededRandom(seed + i * 181);
        const angle = rnd * Math.PI * 2;
        const startRadius = radius * (0.35 + rnd2 * 0.85);
        const endRadius = pull ? size * 0.8 : radius * (1.05 + rnd * 0.45);
        const currentRadius = pull
            ? startRadius + (endRadius - startRadius) * progress
            : size * 1.8 + (endRadius - size * 1.8) * progress;
        const wobble = Math.sin(progress * Math.PI * 3 + rnd * Math.PI * 2) * radius * 0.04;
        const x = originX + Math.cos(angle) * (currentRadius + wobble);
        const y = originY + Math.sin(angle) * (currentRadius + wobble);
        const alpha = pull ? (0.25 + progress * 0.75) : Math.max(0, 1 - progress * 0.55);
        ctx.globalAlpha = alpha * (0.55 + rnd2 * 0.45);
        if (anim.trail) {
            const tailRadius = pull ? Math.min(startRadius, currentRadius + radius * 0.18) : Math.max(size, currentRadius - radius * 0.18);
            ctx.lineWidth = Math.max(1, size * 0.28);
            ctx.beginPath();
            ctx.moveTo(originX + Math.cos(angle) * tailRadius, originY + Math.sin(angle) * tailRadius);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, size * (0.55 + rnd * 0.5), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewLightningArcEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(80, anim.count || 5));
    const length = Math.max(1, anim.length || 140);
    const jaggedness = Math.max(0, anim.jaggedness || 26);
    const width = Math.max(1, anim.width || 3);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const flicker = 0.45 + 0.55 * Math.sin(progress * Math.PI * 8);
    const color = anim.color || '#60a5fa';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (anim.glow) {
        ctx.shadowColor = color;
        ctx.shadowBlur = width * 5 + 8;
    }
    for (let i = 0; i < count; i++) {
        const rndA = previewSeededRandom(seed + i * 101);
        const rndB = previewSeededRandom(seed + i * 211);
        const angle = getPreviewLightningDirectionAngle(anim.direction || 'radial', i, count, rndA);
        const boltLength = length * (0.65 + rndB * 0.55);
        const segments = 5 + Math.floor(previewSeededRandom(seed + i * 307) * 5);
        ctx.globalAlpha = Math.max(0, 1 - progress * 0.6) * flicker * (0.65 + rndA * 0.35);
        ctx.beginPath();
        for (let s = 0; s <= segments; s++) {
            const t = s / segments;
            const jitter = s === 0 || s === segments ? 0 : (previewSeededRandom(seed + i * 401 + s * 53) - 0.5) * jaggedness;
            const px = originX + Math.cos(angle) * boltLength * t + Math.cos(angle + Math.PI / 2) * jitter;
            const py = originY + Math.sin(angle) * boltLength * t + Math.sin(angle + Math.PI / 2) * jitter;
            if (s === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function getPreviewLightningDirectionAngle(direction, index, count, rnd = 0) {
    if (direction === 'right') return (rnd - 0.5) * Math.PI * 0.35;
    if (direction === 'left') return Math.PI + (rnd - 0.5) * Math.PI * 0.35;
    if (direction === 'up') return -Math.PI / 2 + (rnd - 0.5) * Math.PI * 0.35;
    if (direction === 'down') return Math.PI / 2 + (rnd - 0.5) * Math.PI * 0.35;
    return (index / Math.max(1, count)) * Math.PI * 2 + rnd * 0.7;
}

function drawPreviewSmokePuffEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(160, anim.count || 18));
    const spread = Math.max(1, anim.spread || 90);
    const baseSize = Math.max(1, anim.size || 28);
    const driftY = Number.isFinite(anim.driftY) ? anim.driftY : -70;
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const opacity = Math.max(0, Math.min(1, anim.opacity ?? 0.45));
    ctx.save();
    ctx.fillStyle = anim.color || '#94a3b8';
    for (let i = 0; i < count; i++) {
        const rnd = previewSeededRandom(seed + i * 109);
        const rnd2 = previewSeededRandom(seed + i * 173);
        const rnd3 = previewSeededRandom(seed + i * 229);
        const angle = rnd * Math.PI * 2;
        const distance = spread * progress * (0.25 + rnd2 * 0.95);
        const x = originX + Math.cos(angle) * distance + (rnd3 - 0.5) * spread * 0.2 * progress;
        const y = originY + Math.sin(angle) * distance * 0.45 + driftY * progress;
        const size = baseSize * (0.55 + rnd2 * 1.2) * (0.45 + progress * 1.2);
        ctx.globalAlpha = opacity * Math.max(0, 1 - progress) * (0.55 + rnd * 0.45);
        ctx.beginPath();
        ctx.ellipse(x, y, size * (0.85 + rnd3 * 0.45), size * (0.65 + rnd * 0.35), rnd3 * Math.PI, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewOrbitSwarmEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(80, anim.count || 8));
    const radius = Math.max(1, anim.radius || 90);
    const size = Math.max(1, anim.size || 7);
    const speed = Number.isFinite(anim.speed) ? anim.speed : 1.5;
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const color = anim.color || '#a78bfa';
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    for (let i = 0; i < count; i++) {
        const rnd = previewSeededRandom(seed + i * 137);
        const rnd2 = previewSeededRandom(seed + i * 263);
        const orbitRadius = radius * (0.68 + rnd * 0.52);
        const angle = (i / count) * Math.PI * 2 + progress * Math.PI * 2 * speed + rnd2 * 0.7;
        const squash = 0.55 + rnd * 0.35;
        const x = originX + Math.cos(angle) * orbitRadius;
        const y = originY + Math.sin(angle) * orbitRadius * squash;
        const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(angle + progress * Math.PI * 2));
        ctx.globalAlpha = alpha;
        if (anim.trail) {
            const tail = size * 3.4;
            ctx.lineWidth = Math.max(1, size * 0.35);
            ctx.beginPath();
            ctx.moveTo(x - Math.cos(angle) * tail, y - Math.sin(angle) * tail * squash);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(x, y, size * (0.55 + rnd2 * 0.45), 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewConfettiBurstEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(400, anim.count || 50));
    const spread = Math.max(1, anim.spread || 220);
    const fall = Number.isFinite(anim.fall) ? anim.fall : 240;
    const baseSize = Math.max(1, anim.size || 8);
    const spin = Math.max(0, Number.isFinite(anim.spin) ? anim.spin : 2);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const seed = anim.seed || 1;
    const progress = Math.max(0, Math.min(1, effect.progress));
    const palette = getPreviewConfettiPalette(anim.palette || 'party', anim.baseColor || '#38bdf8');
    ctx.save();
    for (let i = 0; i < count; i++) {
        const rndA = previewSeededRandom(seed + i * 89);
        const rndB = previewSeededRandom(seed + i * 149);
        const rndC = previewSeededRandom(seed + i * 211);
        const rndD = previewSeededRandom(seed + i * 271);
        const angle = -Math.PI / 2 + (rndA - 0.5) * Math.PI * 1.35;
        const burst = spread * (0.25 + rndB * 0.85) * Math.sin(progress * Math.PI * 0.5);
        const x = originX + Math.cos(angle) * burst + (rndC - 0.5) * spread * 0.18 * progress;
        const y = originY + Math.sin(angle) * burst + fall * progress * progress * (0.55 + rndD * 0.75);
        const size = baseSize * (0.65 + rndC * 0.9);
        const alpha = Math.max(0, 1 - Math.max(0, progress - 0.72) / 0.28);
        ctx.globalAlpha = alpha;
        ctx.fillStyle = palette[i % palette.length];
        drawPreviewConfettiPiece(ctx, x, y, size, (rndA * Math.PI * 2) + progress * spin * Math.PI * 2, i % 3);
    }
    ctx.restore();
}

function drawPreviewConfettiPiece(ctx, x, y, size, angle, variant = 0) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.beginPath();
    if (variant === 1) {
        ctx.rect(-size * 0.18, -size * 0.75, size * 0.36, size * 1.5);
    } else if (variant === 2) {
        ctx.moveTo(0, -size * 0.7); ctx.lineTo(size * 0.55, size * 0.55); ctx.lineTo(-size * 0.55, size * 0.55); ctx.closePath();
    } else {
        ctx.rect(-size * 0.55, -size * 0.35, size * 1.1, size * 0.7);
    }
    ctx.fill();
    ctx.restore();
}

function getPreviewConfettiPalette(name, baseColor) {
    if (name === 'warm') return ['#ef4444', '#f97316', '#facc15', '#fb7185'];
    if (name === 'cool') return ['#06b6d4', '#38bdf8', '#6366f1', '#a78bfa'];
    if (name === 'gold') return ['#f59e0b', '#facc15', '#fde68a', '#ffffff'];
    if (name === 'brand') return [baseColor || '#38bdf8', '#ffffff', '#111827'];
    return ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6', '#ec4899'];
}

function drawPreviewFocusPulseEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const baseRadius = Math.max(1, anim.radius || 80);
    const rings = Math.max(1, Math.min(8, anim.rings || 2));
    const width = Math.max(1, anim.width || 4);
    const color = anim.color || '#f97316';
    const pulse = Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
    const focusRadius = baseRadius * (1 + pulse * 0.18);
    ctx.save();
    if (anim.dim) {
        const canvas = ctx.canvas;
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, ' + Math.max(0, Math.min(0.9, anim.dimOpacity ?? 0.35)) + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalCompositeOperation = 'destination-out';
        const gradient = ctx.createRadialGradient(originX, originY, focusRadius * 0.45, originX, originY, focusRadius * 1.35);
        gradient.addColorStop(0, 'rgba(0,0,0,1)');
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(originX, originY, focusRadius * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    for (let i = 0; i < rings; i++) {
        const delay = rings > 1 ? i / rings : 0;
        const t = Math.max(0, Math.min(1, (effect.progress - delay * 0.35) / Math.max(0.01, 1 - delay * 0.35)));
        if (t <= 0) continue;
        const radius = focusRadius + baseRadius * 0.45 * t + i * width * 2.5;
        ctx.globalAlpha = Math.max(0, 1 - t) * (0.85 - i * 0.08);
        ctx.beginPath();
        ctx.arc(originX, originY, radius, 0, Math.PI * 2);
        ctx.stroke();
    }
    ctx.restore();
}

function drawPreviewGlowAuraEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const savedOpacity = obj.opacity;
    const cx = obj.x + (obj.width || 0) / 2;
    const cy = obj.y + (obj.height || 0) / 2;
    const pulse = Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
    const pulseAmount = anim.pulse || 0;
    const opacity = Math.max(0, Math.min(1, anim.opacity ?? 0.75)) * (1 - pulseAmount * 0.5 + pulseAmount * pulse);
    const scale = Math.max(0.1, (anim.scale || 1.04) + pulseAmount * pulse * 0.08);
    ctx.save();
    ctx.shadowColor = anim.color || '#38bdf8';
    ctx.shadowBlur = Math.max(1, anim.blur || 28) * (0.75 + pulse * 0.5);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);
    ctx.translate(-cx, -cy);
    obj.opacity = savedOpacity * opacity;
    drawObj(ctx, obj);
    ctx.restore();
    obj.opacity = savedOpacity;
}

function drawPreviewEchoTrailEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj;
    if (!obj) return;
    const count = Math.max(1, Math.min(30, anim.count || 4));
    const offsetX = Number.isFinite(anim.offsetX) ? anim.offsetX : -18;
    const offsetY = Number.isFinite(anim.offsetY) ? anim.offsetY : 0;
    const maxOpacity = Math.max(0, Math.min(1, Number.isFinite(anim.opacity) ? anim.opacity : 0.45));
    const scaleStep = Number.isFinite(anim.scaleStep) ? anim.scaleStep : 0;
    const savedOpacity = obj.opacity;
    const cx = obj.x + (obj.width || 0) / 2;
    const cy = obj.y + (obj.height || 0) / 2;
    for (let i = count; i >= 1; i--) {
        const depth = i / count;
        const progressFactor = 0.35 + effect.progress * 0.65;
        const dx = offsetX * i * progressFactor;
        const dy = offsetY * i * progressFactor;
        const scale = Math.max(0.05, 1 + scaleStep * i * effect.progress);
        const fadeFactor = anim.fade === false ? 1 : Math.max(0, 1 - effect.progress);
        obj.opacity = savedOpacity * maxOpacity * fadeFactor * (1 - depth * 0.65);
        ctx.save();
        ctx.translate(cx + dx, cy + dy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        drawObj(ctx, obj);
        ctx.restore();
    }
    obj.opacity = savedOpacity;
}

function drawPreviewSparkleBurstEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const count = Math.max(1, Math.min(200, anim.count || 18));
    const radius = Math.max(1, anim.radius || 140);
    const baseSize = Math.max(1, anim.size || 10);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const seed = anim.seed || 1;
    const color = anim.color || '#facc15';
    const spin = Math.max(0, Number.isFinite(anim.spin) ? anim.spin : 1);
    const fade = anim.fade !== false;
    ctx.save();
    ctx.fillStyle = color;
    ctx.strokeStyle = color;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (let i = 0; i < count; i++) {
        const rndA = previewSeededRandom(seed + i * 97);
        const rndB = previewSeededRandom(seed + i * 151);
        const rndC = previewSeededRandom(seed + i * 211);
        const angle = rndA * Math.PI * 2;
        const travel = radius * effect.progress * (0.45 + rndB * 0.75);
        const twinkle = Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
        const size = baseSize * (0.55 + rndC * 0.9) * Math.max(0.15, twinkle);
        const x = originX + Math.cos(angle) * travel;
        const y = originY + Math.sin(angle) * travel;
        const alpha = fade ? Math.max(0, 1 - effect.progress) : 1;
        ctx.globalAlpha = alpha * (0.55 + rndB * 0.45);
        ctx.lineWidth = Math.max(1, size * 0.18);
        drawPreviewSparkleShape(ctx, x, y, size, angle + effect.progress * Math.PI * 2 * spin, anim.shape || 'star');
    }
    ctx.restore();
}

function drawPreviewSparkleShape(ctx, x, y, size, angle, shape = 'star') {
    const half = size / 2;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle || 0);
    ctx.beginPath();
    if (shape === 'dot') {
        ctx.arc(0, 0, half, 0, Math.PI * 2);
        ctx.fill();
    } else if (shape === 'cross') {
        ctx.moveTo(-half, 0); ctx.lineTo(half, 0); ctx.moveTo(0, -half); ctx.lineTo(0, half); ctx.stroke();
    } else if (shape === 'diamond') {
        ctx.moveTo(0, -half); ctx.lineTo(half, 0); ctx.lineTo(0, half); ctx.lineTo(-half, 0); ctx.closePath(); ctx.fill();
    } else {
        for (let i = 0; i < 8; i++) {
            const r = i % 2 === 0 ? half : half * 0.35;
            const a = -Math.PI / 2 + i * Math.PI / 4;
            const px = Math.cos(a) * r, py = Math.sin(a) * r;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
    }
    ctx.restore();
}

function drawPreviewRippleWaveEffect(ctx, effect) {
    const anim = effect.anim || {}, obj = effect.obj || {};
    const rings = Math.max(1, Math.min(12, anim.rings || 3));
    const maxRadius = Math.max(1, anim.radius || 160);
    const baseRadius = Math.max(1, anim.baseRadius || Math.hypot(obj.width || 0, obj.height || 0) / 2 || 8);
    const lineWidth = Math.max(1, anim.width || 4);
    const originX = Number.isFinite(anim.originX) ? anim.originX : (obj.x + (obj.width || 0) / 2);
    const originY = Number.isFinite(anim.originY) ? anim.originY : (obj.y + (obj.height || 0) / 2);
    const color = anim.color || '#38bdf8';
    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    for (let i = 0; i < rings; i++) {
        const delay = rings > 1 ? i / rings : 0;
        const ringProgress = Math.max(0, Math.min(1, (effect.progress - delay * 0.55) / Math.max(0.01, 1 - delay * 0.55)));
        if (ringProgress <= 0) continue;
        const radius = baseRadius + maxRadius * ringProgress;
        const alpha = anim.fade === false ? 1 : Math.max(0, 1 - ringProgress);
        ctx.globalAlpha = alpha * (1 - i * 0.04);
        ctx.beginPath();
        ctx.arc(originX, originY, radius, 0, Math.PI * 2);
        if (anim.fill) {
            ctx.globalAlpha = alpha * 0.12;
            ctx.fill();
            ctx.globalAlpha = alpha * (1 - i * 0.04);
        }
        ctx.stroke();
    }
    ctx.restore();
}

function renderFrame(timestamp) {
    if (!startTime) startTime = timestamp;
    const elapsed = timestamp - startTime;

    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawBackground();

    // Reset all objects to original each frame
    objects.forEach(obj => {
        const o = obj._orig;
        obj.x=o.x; obj.y=o.y; obj.width=o.width; obj.height=o.height;
        obj.rotation=o.rotation; obj.scaleX=o.scaleX; obj.scaleY=o.scaleY;
        obj.tiltX=o.tiltX || 0; obj.tiltY=o.tiltY || 0; obj.depth=o.depth || 0;
        obj.opacity=o.opacity; obj.fill=o.fill;
        if (Number.isFinite(Number(o._armatureDrawLayer ?? o.armatureDrawLayer))) {
            obj._armatureDrawLayer = Math.round(Number(o._armatureDrawLayer ?? o.armatureDrawLayer));
        } else {
            delete obj._armatureDrawLayer;
        }
        if (Number.isFinite(Number(o.armatureDrawLayer))) obj.armatureDrawLayer = Math.round(Number(o.armatureDrawLayer));
        obj.jointBaseAngle=o.jointBaseAngle||0;
        if(o.text!==undefined) obj.text=o.text;
        // Restore shape type for chain morphing
        if(o.type!==undefined) obj.type=o.type;
        if(o.sides!==undefined) obj.sides=o.sides;
        if(o.innerRadius!==undefined) obj.innerRadius=o.innerRadius;
        if(o.borderRadius!==undefined) obj.borderRadius=o.borderRadius;
        // Clear clip animation properties
        delete obj._clipWipeRight; delete obj._clipWipeLeft;
        delete obj._clipWipeUp; delete obj._clipWipeDown;
        delete obj._clipStripsH; delete obj._clipStripsV;
        delete obj._clipWheel; delete obj._clipWedge;
        // Restore joint angles from deep-cloned original
        if(o.joints && o.joints.length > 0) {
            obj.joints = JSON.parse(JSON.stringify(o.joints));
            // Clear any leftover jointAngle_N / jointTilt / jointCrossOffset properties
            for(let ji=0; ji<o.joints.length; ji++) {
                delete obj['jointAngle_'+ji];
                delete obj['jointTiltX_'+ji];
                delete obj['jointTiltY_'+ji];
                delete obj['jointCrossOffset_'+ji];
            }
        }
        // Restore pathPoints for freeform/path/scribble
        if(o.pathPoints && obj.pathPoints) {
            for(let pi=0; pi<obj.pathPoints.length && pi<o.pathPoints.length; pi++){
                obj.pathPoints[pi].x=o.pathPoints[pi].x; obj.pathPoints[pi].y=o.pathPoints[pi].y;
            }
        }
        // Restore rigging pins to the captured preview baseline. Some recorded
        // deform/pose animations intentionally start from a non-rest pin pose.
        if(obj.rigging && obj.rigging.pins) {
            const rigPins = Array.isArray(o._rigPins) ? o._rigPins : null;
            if (rigPins) {
                const byId = {};
                rigPins.forEach(pin => { if (pin && pin.id) byId[pin.id] = pin; });
                obj.rigging.pins.forEach((pin, idx) => {
                    const base = (pin && pin.id && byId[pin.id]) || rigPins[idx];
                    if (!base) return;
                    pin.x = base.x;
                    pin.y = base.y;
                    if (base.restX !== undefined) pin.restX = base.restX;
                    if (base.restY !== undefined) pin.restY = base.restY;
                });
            } else {
                obj.rigging.pins.forEach(pin => { pin.x = pin.restX; pin.y = pin.restY; });
            }
        }
    });

    // Apply animations
    // Track which properties per object are already being actively animated.
    // This prevents later delayed animations from overriding an active animation's
    // computed value with their static 'from' value.
    const activePropsMap = {};
    const previewEffectFrames = [];
    animations.forEach((anim, animIdx) => {
        const obj = objects.find(o => o.id === anim.objectId);
        if (!obj) return;
        if (!activePropsMap[obj.id]) activePropsMap[obj.id] = new Set();
        const activeAnimProps = activePropsMap[obj.id];

        const trigger = anim.trigger || 'onLoad';
        let effectiveStart = anim.delay || 0;
        if (trigger !== 'onLoad') {
            if (triggeredAnims[animIdx] === undefined) return;
            effectiveStart = triggeredAnims[animIdx] + (anim.delay || 0);
        }
        const ae = elapsed - effectiveStart;
        if (ae < 0) {
            if (anim.type === 'draw-trace') {
                obj.opacity = 0;
                activeAnimProps.add('opacity');
            }
            // Pre-set "from" values for onLoad animations before their delay starts
            // Only if no active animation is already driving this property
            if (trigger === 'onLoad') {
                (anim.properties||[]).forEach(prop => {
                    if (!activeAnimProps.has(prop.key)) {
                        _setAnimatedPreviewProperty(obj, prop.key, prop.from);
                    }
                });
            }
            return;
        }

        if (anim.type === 'shoot-pellets' || anim.type === 'break-apart' || anim.type === 'ripple-wave' || anim.type === 'sparkle-burst' || anim.type === 'echo-trail' || anim.type === 'glow-aura' || anim.type === 'focus-pulse' || anim.type === 'confetti-burst' || anim.type === 'orbit-swarm' || anim.type === 'smoke-puff' || anim.type === 'lightning-arc' || anim.type === 'magnet-pull' || anim.type === 'scan-beam' || anim.type === 'lens-flare' || anim.type === 'pixel-burst' || anim.type === 'impact-burst' || anim.type === 'wave-distort' || anim.type === 'liquid-motion' || anim.type === 'melt-drip' || anim.type === 'brush-reveal' || anim.type === 'paint-reveal' || anim.type === 'swirl-tornado' || anim.type === 'fire-flicker' || anim.type === 'dust-away' || anim.type === 'freeze-crack' || anim.type === 'neon-trace' || anim.type === 'shadow-pop' || anim.type === 'explosion-smoke' || anim.type === 'paint-stroke' || anim.type === 'chromatic-glitch' || anim.type === 'shockwave-ring' || anim.type === 'magic-portal' || anim.type === 'glass-shatter' || anim.type === 'electric-charge' || anim.type === 'ink-bleed' || anim.type === 'motion-smear' || anim.type === 'stage-shake' || anim.type === 'mask-reveal' || anim.type === 'path-trail' || anim.type === 'particle-fountain' || anim.type === 'light-sweep' || anim.type === 'weather-effect' || anim.type === 'bubble-rise' || anim.type === 'meteor-shower' || anim.type === 'spotlight-sweep' || anim.type === 'radial-rays' || anim.type === 'outline-pulse' || anim.type === 'speed-lines' || anim.type === 'starfield-warp' || anim.type === 'color-wash' || anim.type === 'halo-burst' || anim.type === 'shadow-cast' || anim.type === 'energy-shield' || anim.type === 'magnify-lens' || anim.type === 'rainbow-arc' || anim.type === 'vignette-pulse' || anim.type === 'scan-grid' || anim.type === 'draw-trace' || anim.type === 'card-turn' || anim.type === 'page-turn' || anim.type === 'flap-swing') {
            if (ae <= 0) {
                if (anim.type === 'draw-trace') {
                    obj.opacity = 0;
                    activeAnimProps.add('opacity');
                }
                return;
            }
            const duration = anim.duration || 1500;
            const repeat = anim.repeat === true ? Infinity : (anim.repeatCount || 1);
            let localTime = ae;
            if (repeat !== Infinity) localTime = Math.min(ae, duration * repeat);
            let rawProgress = Math.min((localTime % duration) / duration, 1);
            if (repeat !== Infinity && localTime >= duration * repeat) rawProgress = 1;
            const easingFn = easings[anim.easing] || easings.easeOut || easings.linear;
            const progress = easingFn(Math.max(0, Math.min(1, rawProgress)));
            previewEffectFrames.push({
                type: anim.type,
                anim,
                obj,
                progress,
                localTime: Math.min(localTime % duration, duration),
                duration
            });
            if (anim.type === 'break-apart' && anim.originalMode !== 'keep') {
                obj.opacity = 0;
                activeAnimProps.add('opacity');
            }
            if (anim.type === 'draw-trace') {
                obj.opacity = getPreviewDrawTraceObjectReveal(progress);
                activeAnimProps.add('opacity');
            }
            if ((anim.type !== 'draw-trace' && anim.effectObjectMode === 'hide') || (anim.effectObjectMode !== 'show' && (anim.type === 'wave-distort' || anim.type === 'melt-drip' || anim.type === 'brush-reveal' || anim.type === 'paint-reveal' || anim.type === 'dust-away' || anim.type === 'chromatic-glitch' || anim.type === 'glass-shatter' || anim.type === 'mask-reveal' || anim.type === 'card-turn' || anim.type === 'page-turn' || anim.type === 'flap-swing'))) {
                obj.opacity = 0;
                activeAnimProps.add('opacity');
            }
            return;
        }

        // Path-follow
        if (anim.type === 'path-follow' && anim.pathPoints && anim.pathPoints.length >= 2) {
            let t = Math.min(ae / anim.duration, 1);
            t = (easings[anim.easing]||easings.linear)(t);
            const pts = anim.pathPoints;
            const idx = t * (pts.length-1);
            const i = Math.floor(idx); const frac = idx-i;
            const p0 = pts[Math.min(i,pts.length-1)];
            const p1 = pts[Math.min(i+1,pts.length-1)];
            obj.x = (p0.x+(p1.x-p0.x)*frac) - obj.width/2;
            obj.y = (p0.y+(p1.y-p0.y)*frac) - obj.height/2;
            if (anim.alignRotation && (p1.x!==p0.x||p1.y!==p0.y))
                obj.rotation = Math.atan2(p1.y-p0.y,p1.x-p0.x)*180/Math.PI;
            return;
        }

        // Part-keyframe animation (multi-property keyframe interpolation)
        if (anim.type === 'part-keyframe' && anim.keyframes) {
            const dur = anim.duration || 1000;
            const rc = anim.repeatCount || 1;
            const isInf = anim.repeat === true || rc === Infinity;
            const isCycle = (anim.repeatMode === 'cycle') && (rc > 1 || isInf);
            let lt = ae;
            if (!isInf) lt = Math.min(ae, dur * rc);
            const cycleProgress = (lt % dur) / dur;
            let t = cycleProgress;
            if (!isInf && lt >= dur * rc) t = 1;
            // Show original standing pose briefly at start and when playback ends
            const introHold = dur * 0.06;
            const _standingPose = (isInf && ae <= introHold) || (isInf && elapsed >= totalDuration && !looping);
            if (isCycle) { const ci = Math.floor(lt / dur); if (ci % 2 === 1 && !(lt >= dur * rc && !isInf)) t = 1 - t; }
            const o = obj._orig || obj;
            let rmX = 0, rmY = 0, rmScale = 1;
            const rm = anim.rootMotion;
            if (rm && rm.enabled) {
                rmX = (rm.speed || 0) * (lt / 1000);
                rmY = -(rm.bounce || 0) * Math.abs(Math.sin(t * Math.PI * 2));
                if (rm.sway) rmX += rm.sway * Math.sin(t * Math.PI * 2);
                if (rm.scaleFrom != null || rm.scaleTo != null || rm.depthStrength) {
                    const depthT = rm.depthProgressMode === 'forward' ? cycleProgress : t;
                    const depthStrength = rm.depthStrength || 0;
                    const scaleFrom = rm.scaleFrom ?? (1 - depthStrength * 0.35);
                    const scaleTo = rm.scaleTo ?? (1 + depthStrength * 0.08);
                    const approachY = rm.approachY ?? (depthStrength * 26);
                    rmScale = scaleFrom + (scaleTo - scaleFrom) * depthT;
                    rmY += -approachY / 2 + approachY * depthT;
                }
            }
            if (_standingPose) {
                obj.x = (o.x || 0) + rmX;
                obj.y = (o.y || 0);
                obj.rotation = o.rotation || 0;
                obj.scaleX = o.scaleX || 1;
                obj.scaleY = o.scaleY || 1;
                return;
            }
            if (rmX !== 0 || rmY !== 0) { obj.x = (o.x || 0) + rmX; obj.y = (o.y || 0) + rmY; }
            const kfs = anim.keyframes;
            if (rmScale !== 1 && !kfs.scaleX && !kfs.scaleY) {
                obj.scaleX = (o.scaleX || 1) * rmScale;
                obj.scaleY = (o.scaleY || 1) * rmScale;
            }
            for (const kp in kfs) {
                const kfArr = kfs[kp];
                if (!kfArr || kfArr.length === 0) continue;
                let val;
                if (kfArr.length === 1) { val = kfArr[0].v; }
                else if (t <= kfArr[0].t) { val = kfArr[0].v; }
                else if (t >= kfArr[kfArr.length-1].t) { val = kfArr[kfArr.length-1].v; }
                else {
                    val = kfArr[kfArr.length-1].v;
                    for (let ki = 0; ki < kfArr.length - 1; ki++) {
                        const ka = kfArr[ki], kb = kfArr[ki+1];
                        if (t >= ka.t && t <= kb.t) {
                            let st = (t - ka.t) / (kb.t - ka.t);
                            st = st < 0.5 ? 2*st*st : -1+(4-2*st)*st;
                            val = _resolvePreviewAnimatedValue(obj, kp, ka.v, kb.v, st, ka.v + (kb.v - ka.v) * st);
                            break;
                        }
                    }
                }
                if (kp === '_oX') obj.x = (o.x || 0) + val + rmX;
                else if (kp === '_oY') obj.y = (o.y || 0) + val + rmY;
                else if (kp === 'rotation') obj.rotation = (o.rotation || 0) + val;
                else _setAnimatedPreviewProperty(obj, kp, val);
            }
            return;
        }

        // Chain shape morph
        if (anim.type === 'chain-morph') {
            const progress = Math.min(ae / anim.duration, 1);
            // Morph shape at 85% progress (near the target position)
            if (progress >= 0.85) {
                obj.type = anim.morphTo;
                if (anim.morphSides) obj.sides = anim.morphSides;
                if (anim.morphInnerRadius) obj.innerRadius = anim.morphInnerRadius;
                if (anim.morphBorderRadius) obj.borderRadius = anim.morphBorderRadius;
            }
            return;
        }

        // Joint-rotation animation (Joint System movements)
        if (anim.type === 'joint-rotation' && anim.keyframes && anim.keyframes.length > 0) {
            const totalDur = anim.singleCycleDuration * anim.repeatCycles;
            if (ae >= totalDur) return;
            const motionState = JointSystem.evaluateJointAnim(anim, ae);
            if (motionState !== null) {
                JointSystem.applyJointAnimState(obj, anim, motionState);
            }
            return;
        }

        // Bone-pose animation (rigging mesh deformation)
        if (anim.type === 'bone-pose' && anim.keyframes && anim.keyframes.length > 0 && obj.rigging) {
            const duration = anim.duration || 3000;
            const rc = anim.repeatCount || 1;
            const isInfinite = anim.repeat === true || rc === Infinity;
            const isPP = !!anim.pingpong;
            const isCycleMode = (anim.repeatMode === 'cycle') && (rc > 1 || isInfinite);

            let localTime = ae;
            if (!isInfinite) localTime = Math.min(ae, duration * rc);

            let progress = Math.min((localTime % duration) / duration, 1);
            if (!isInfinite && localTime >= duration * rc) progress = 1;

            if (isCycleMode) {
                const cycleIndex = Math.floor(localTime / duration);
                if (cycleIndex % 2 === 1 && !(localTime >= duration * rc && !isInfinite)) {
                    progress = 1 - progress;
                }
            }

            const easeFn = easings[anim.easing] || easings.linear;
            if (isPP) {
                progress = progress < 0.5 ? easeFn(progress * 2) : easeFn(2 - progress * 2);
            } else {
                progress = easeFn(progress);
            }

            const pose = RigUtils.interpolateKeyframePoses(anim.keyframes, progress);
            RigUtils.applyPose(obj, pose);
            return;
        }

        // Continuous recording animation playback
        if (anim.type === 'continuous' && anim.keyframes && anim.keyframes.length > 0) {
            const duration = anim.duration || 3000;
            const rc = anim.repeatCount || 1;
            const isInfinite = anim.repeat === true || rc === Infinity;
            const isCycleMode = (anim.repeatMode === 'cycle') && (rc > 1 || isInfinite);

            let localTime = ae;
            if (!isInfinite) localTime = Math.min(ae, duration * rc);
            let progress = Math.min((localTime % duration) / duration, 1);
            if (!isInfinite && localTime >= duration * rc) progress = 1;

            if (isCycleMode) {
                const cycleIndex = Math.floor(localTime / duration);
                if (cycleIndex % 2 === 1 && !(localTime >= duration * rc && !isInfinite)) {
                    progress = 1 - progress;
                }
            }

            const kfs = anim.keyframes;
            if (progress <= kfs[0].t) {
                if (kfs[0].values) {
                    for (const k of Object.keys(kfs[0].values)) {
                        _setAnimatedPreviewProperty(obj, k, kfs[0].values[k]);
                        activeAnimProps.add(k);
                    }
                }
                if (kfs[0].pose && obj.rigging) RigUtils.applyPose(obj, kfs[0].pose);
            } else if (progress >= kfs[kfs.length - 1].t) {
                const last = kfs[kfs.length - 1];
                if (last.values) {
                    for (const k of Object.keys(last.values)) {
                        _setAnimatedPreviewProperty(obj, k, last.values[k]);
                        activeAnimProps.add(k);
                    }
                }
                if (last.pose && obj.rigging) RigUtils.applyPose(obj, last.pose);
            } else {
                for (let ki = 0; ki < kfs.length - 1; ki++) {
                    if (progress >= kfs[ki].t && progress <= kfs[ki + 1].t) {
                        const rawLt = (progress - kfs[ki].t) / (kfs[ki + 1].t - kfs[ki].t);
                        const lt = anim.segmentEasing === 'easeInOutQuad'
                            ? (rawLt < 0.5
                                ? 2 * rawLt * rawLt
                                : 1 - Math.pow(-2 * rawLt + 2, 2) / 2)
                            : rawLt;
                        const v0 = kfs[ki].values, v1 = kfs[ki + 1].values;
                        if (v0 && v1) {
                            for (const k of Object.keys(v0)) {
                                if (v1[k] !== undefined) {
                                    const interpolatedValue = v0[k] + (v1[k] - v0[k]) * lt;
                                    _setAnimatedPreviewProperty(obj, k, _resolvePreviewAnimatedValue(obj, k, v0[k], v1[k], lt, interpolatedValue));
                                    activeAnimProps.add(k);
                                }
                            }
                        }
                        if (kfs[ki].pose && kfs[ki + 1].pose && obj.rigging) {
                            RigUtils.applyPose(obj, RigUtils.interpolatePoses(kfs[ki].pose, kfs[ki + 1].pose, lt));
                        }
                        break;
                    }
                }
            }
            return;
        }

        // Topple animation (edge pivot)
        if (anim.type === 'topple') {
            const duration = anim.duration || 1000;
            const rc = anim.repeatCount || 1;
            const isInfinite = anim.repeat === true || rc === Infinity;
            const isCycleMode = (anim.repeatMode === 'cycle') && (rc > 1 || isInfinite);

            let localTime = ae;
            if (!isInfinite) localTime = Math.min(ae, duration * rc);
            let rawProg = Math.min((localTime % duration) / duration, 1);
            if (!isInfinite && localTime >= duration * rc) rawProg = 1;

            if (isCycleMode) {
                const ci = Math.floor(localTime / duration);
                if (ci % 2 === 1 && !(localTime >= duration * rc && !isInfinite)) rawProg = 1 - rawProg;
            }

            const ef = easings[anim.easing] || easings.linear;
            const progress = ef(rawProg);

            const angleRad = (anim.angle * progress) * Math.PI / 180;
            const cx = anim.startX + anim.width / 2;
            const cy = anim.startY + anim.height / 2;
            const dx = cx - anim.pivotX;
            const dy = cy - anim.pivotY;
            obj.x = anim.pivotX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad) - anim.width / 2;
            obj.y = anim.pivotY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad) - anim.height / 2;
            obj.rotation = anim.startRotation + anim.angle * progress;
            return;
        }

        // Topple-line animation (rolling box on floor)
        if (anim.type === 'topple-line') {
            const duration = anim.duration || 3200;
            const rc = anim.repeatCount || 1;
            const isInfinite = anim.repeat === true || rc === Infinity;
            const totalDur = duration * rc;

            let localTime = ae;
            if (!isInfinite) localTime = Math.min(ae, totalDur);
            let cycleElapsed = localTime % duration;
            if (!isInfinite && localTime >= totalDur) cycleElapsed = duration;

            const steps = anim.steps;
            const numSteps = steps.length;
            const stepDur = duration / numSteps;
            const stepIdx = Math.min(Math.floor(cycleElapsed / stepDur), numSteps - 1);
            const stepElapsed = cycleElapsed - stepIdx * stepDur;
            let rawProg = Math.min(stepElapsed / stepDur, 1);
            if (cycleElapsed >= duration) rawProg = 1;

            const ef = easings[anim.easing] || easings.linear;
            const prog = ef(rawProg);
            const step = steps[stepIdx];
            const ar = (step.angle * prog) * Math.PI / 180;
            const cx = step.startX + anim.width / 2, cy = step.startY + anim.height / 2;
            const dx = cx - step.pivotX, dy = cy - step.pivotY;
            obj.x = step.pivotX + dx * Math.cos(ar) - dy * Math.sin(ar) - anim.width / 2;
            obj.y = step.pivotY + dx * Math.sin(ar) + dy * Math.cos(ar) - anim.height / 2;
            obj.rotation = step.startRotation + step.angle * prog;
            return;
        }

        // Standard property animation with proper repeat handling
        const singleDur = anim.duration || 1;
        const rc = anim.repeatCount || 1;
        const isInfinite = anim.repeat === true || rc === Infinity;
        const isPingpong = !!anim.pingpong;
        const isCycleMode = (anim.repeatMode === 'cycle') && (rc > 1 || isInfinite);

        let localTime = ae;
        if (!isInfinite) {
            localTime = Math.min(ae, singleDur * rc);
        }

        let cycleTime = localTime % singleDur;
        let t = Math.min(cycleTime / singleDur, 1);

        // If finished all repeats, clamp to end
        if (!isInfinite && localTime >= singleDur * rc) {
            t = 1;
        }

        // Smooth cycle: reverse direction on odd-numbered cycles
        if (isCycleMode) {
            const cycleIndex = Math.floor(localTime / singleDur);
            if (cycleIndex % 2 === 1 && !(localTime >= singleDur * rc && !isInfinite)) {
                t = 1 - t;
            }
        }

        // Pingpong: reverse on each odd cycle or if flagged
        if (isPingpong) {
            t = t < 0.5 ? t * 2 : 2 - t * 2;
        }

        t = (easings[anim.easing]||easings.linear)(t);
        (anim.properties||[]).forEach(prop => {
            activeAnimProps.add(prop.key);
            // Color interpolation for hex string from/to
            if (prop.type === 'color' && typeof prop.from === 'string' && typeof prop.to === 'string') {
                const htr = (h) => { const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(h); return m ? {r:parseInt(m[1],16),g:parseInt(m[2],16),b:parseInt(m[3],16)} : {r:0,g:0,b:0}; };
                const fRgb = htr(prop.from), tRgb = htr(prop.to);
                const r = Math.round(fRgb.r + (tRgb.r - fRgb.r) * t);
                const g = Math.round(fRgb.g + (tRgb.g - fRgb.g) * t);
                const b = Math.round(fRgb.b + (tRgb.b - fRgb.b) * t);
                obj[prop.key] = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                return;
            }
            if (prop.type === 'discrete') {
                const nextVal = t >= 1 ? prop.to : prop.from;
                _setAnimatedPreviewProperty(obj, prop.key, nextVal);
                return;
            }
            const interpolatedValue = prop.from + (prop.to - prop.from) * t;
            _setAnimatedPreviewProperty(obj, prop.key, _resolvePreviewAnimatedValue(obj, prop.key, prop.from, prop.to, t, interpolatedValue));
            // Convert _color RGB components back to hex fill
            if (prop.key === '_colorR' || prop.key === '_colorG' || prop.key === '_colorB') {
                const r = Math.round(Math.max(0, Math.min(255, obj._colorR || 0)));
                const g = Math.round(Math.max(0, Math.min(255, obj._colorG || 0)));
                const b = Math.round(Math.max(0, Math.min(255, obj._colorB || 0)));
                obj.fill = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
            }
        });
    });

    // Sync pathPoints after animations modify x/y/width/height
    objects.forEach(obj => {
        if (obj.pathPoints && obj.pathPoints.length > 0 && obj._orig.pathPoints && obj._orig.pathPoints.length > 0) {
            const o = obj._orig;
            const dx = obj.x - o.x;
            const dy = obj.y - o.y;
            const sx = (o.width && obj.width !== o.width) ? obj.width / o.width : 1;
            const sy = (o.height && obj.height !== o.height) ? obj.height / o.height : 1;
            if (dx !== 0 || dy !== 0 || sx !== 1 || sy !== 1) {
                for (let pi = 0; pi < obj.pathPoints.length && pi < o.pathPoints.length; pi++) {
                    obj.pathPoints[pi].x = obj.x + (o.pathPoints[pi].x - o.x) * sx;
                    obj.pathPoints[pi].y = obj.y + (o.pathPoints[pi].y - o.y) * sy;
                }
            }
        }
    });

    applyJointAngles(objects);
    resolvePinsPreview(objects);
    drawPreviewObjectsInLayerOrder(ctx, objects);
    drawPreviewEffectOverlays(ctx, previewEffectFrames);
    drawPinContoursPreview(ctx, objects);

    infoEl.textContent = 'Time: ' + (elapsed/1000).toFixed(2) + 's / ' + (totalDuration/1000).toFixed(1) + 's';

    if (isPlaying) {
        if (elapsed >= totalDuration) {
            if (looping) {
                startTime = timestamp;
                Object.keys(triggeredAnims).forEach(k => delete triggeredAnims[k]);
                animationId = requestAnimationFrame(renderFrame);
            } else {
                isPlaying = false;
                infoEl.textContent += ' — Finished';
                document.getElementById('btnPlay').textContent = '\\u25b6 Play';
            }
        } else {
            animationId = requestAnimationFrame(renderFrame);
        }
    }
}

// Hit test
function hitTest(x,y) {
    for(let i=objects.length-1;i>=0;i--){const o=objects[i];if(x>=o.x&&x<=o.x+o.width&&y>=o.y&&y<=o.y+o.height)return o;}
    return null;
}
function triggerFor(objId, type) {
    const el = startTime ? performance.now() - (startTime||0) : 0;
    animations.forEach((a,i)=>{if(a.objectId===objId&&a.trigger===type&&triggeredAnims[i]===undefined){triggeredAnims[i]=el;if(!isPlaying)play();}});
}
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();const hit=hitTest((e.clientX-r.left)*(canvas.width/r.width),(e.clientY-r.top)*(canvas.height/r.height));if(hit)triggerFor(hit.id,'onClick');});
let lastHover=null;
canvas.addEventListener('mousemove',e=>{const r=canvas.getBoundingClientRect();const x=(e.clientX-r.left)*(canvas.width/r.width),y=(e.clientY-r.top)*(canvas.height/r.height);const hit=hitTest(x,y);canvas.style.cursor=hit?'pointer':'default';if(hit&&hit.id!==lastHover)triggerFor(hit.id,'onHover');lastHover=hit?hit.id:null;});

function play() {
    if (isPlaying) return;
    isPlaying = true;
    if (!startTime) startTime = performance.now();
    document.getElementById('btnPlay').textContent = '\\u25b6 Playing...';
    animationId = requestAnimationFrame(renderFrame);
}
function pause() {
    isPlaying = false;
    if (animationId) cancelAnimationFrame(animationId);
    document.getElementById('btnPlay').textContent = '\\u25b6 Play';
}
function reset() {
    pause();
    startTime = null;
    Object.keys(triggeredAnims).forEach(k => delete triggeredAnims[k]);
    objects.forEach(obj => {
        Object.assign(obj, obj._orig);
        if (obj._orig && obj._orig.joints) obj.joints = JSON.parse(JSON.stringify(obj._orig.joints));
        if (obj._orig && obj._orig.flexPins) obj.flexPins = JSON.parse(JSON.stringify(obj._orig.flexPins));
    });
    applyInitialFromStates();
    ctx.clearRect(0,0,canvas.width,canvas.height);
    drawBackground();
    applyJointAngles(objects);
    resolvePinsPreview(objects);
    drawPreviewObjectsInLayerOrder(ctx, objects);
    drawPinContoursPreview(ctx, objects);
    infoEl.textContent = 'Click Play to start';
}
function toggleLoop() {
    looping = !looping;
    document.getElementById('btnLoop').classList.toggle('active', looping);
}

// Apply animation "from" states so entry animations start objects hidden/offscreen
function applyInitialFromStates() {
    const initializedPropsByObject = Object.create(null);
    animations
        .filter(anim => (anim.trigger || 'onLoad') === 'onLoad')
        .slice()
        .sort((a, b) => (a.delay || 0) - (b.delay || 0))
        .forEach(anim => {
        if ((anim.trigger || 'onLoad') !== 'onLoad') return;
        const obj = objects.find(o => o.id === anim.objectId);
        if (!obj) return;
        if (!initializedPropsByObject[obj.id]) initializedPropsByObject[obj.id] = new Set();
        const initializedProps = initializedPropsByObject[obj.id];
        (anim.properties||[]).forEach(prop => {
            if (!prop || !prop.key) return;
            if (initializedProps.has(prop.key) && !prop.pingpong) return;
            _setAnimatedPreviewProperty(obj, prop.key, prop.from);
            initializedProps.add(prop.key);
        });
    });
}

// Initial draw — apply from-states first so entry-animated objects start hidden
applyInitialFromStates();
ctx.clearRect(0,0,canvas.width,canvas.height);
drawBackground();
applyJointAngles(objects);
resolvePinsPreview(objects);
drawPreviewObjectsInLayerOrder(ctx, objects);
drawPinContoursPreview(ctx, objects);

// Autoplay
play();
</script>
</body>
</html>`;

        // Open in new window — size to fit screen without scrolling
        const winW = Math.min(w + 80, screen.availWidth - 100);
        const winH = Math.min(h + 120, screen.availHeight - 100);
        const previewWin = window.open('', '_blank', `width=${winW},height=${winH}`);
        if (!previewWin) {
            Utils.showToast('Popup blocked — please allow popups for this site', 'error');
            return;
        }
        previewWin.document.open();
        previewWin.document.write(html);
        previewWin.document.close();

        Utils.showToast('Preview opened in new window', 'info');
    }

    // === Refresh / Cleanup ===

    /**
     * Refresh all panels, clean up stale references after object changes.
     * Useful after deleting shapes — clears dangling references from path animation
     * panel, applied animations list, timeline tracks, object list, etc.
     */
    refreshAll() {
        const existingIds = new Set(this.objects.objects.map(o => o.id));

        // 1. Clean up path animation panel references to deleted objects
        if (this.pathAnimation) {
            if (this.pathAnimation.pathShapeId && !existingIds.has(this.pathAnimation.pathShapeId)) {
                this.pathAnimation.pathShapeId = null;
                const nameEl = document.getElementById('path-shape-name');
                if (nameEl) { nameEl.classList.add('hidden'); nameEl.querySelector('.path-obj-label').textContent = 'None'; }
                document.getElementById('btn-pick-path-shape')?.classList.remove('hidden');
            }
            if (this.pathAnimation.moverId && !existingIds.has(this.pathAnimation.moverId)) {
                this.pathAnimation.moverId = null;
                const nameEl = document.getElementById('path-mover-name');
                if (nameEl) { nameEl.classList.add('hidden'); nameEl.querySelector('.path-obj-label').textContent = 'None'; }
                document.getElementById('btn-pick-path-mover')?.classList.remove('hidden');
            }
            // Clear path cache for deleted objects
            if (this.pathAnimation._pathCache) {
                for (const key of Object.keys(this.pathAnimation._pathCache)) {
                    if (!existingIds.has(key)) delete this.pathAnimation._pathCache[key];
                }
            }
        }

        // 2. Remove animations referencing deleted objects from all remaining objects
        this.objects.objects.forEach(obj => {
            obj.animations = obj.animations.filter(anim => {
                // Remove path animations whose source path shape no longer exists
                if (anim.params?.pathShapeId && !existingIds.has(anim.params.pathShapeId)) {
                    return false;
                }
                return true;
            });
        });

        // 3. Refresh all UI panels
        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.animations.updateAppliedAnimationsList();
        this.animations.updateCodeOutput();
        this.animations.calculateTotalDuration();
        eventBus.emit('timeline:update');
        this.stage.requestRender();

        Utils.showToast('All panels refreshed', 'info');
    }

    // === Keyboard Shortcuts ===

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't intercept when typing in inputs
            if (e.target.matches('input, textarea, select, [contenteditable]')) return;

            const ctrl = e.metaKey || e.ctrlKey;
            const shift = e.shiftKey;

            // Undo/Redo
            // In slice mode, Ctrl+Z or Z undoes the last slice point instead
            if (this.objects._sliceMode && this.objects._slicePoints.length > 0) {
                if ((ctrl && !shift && e.key === 'z') || (!ctrl && !shift && e.key === 'z')) {
                    e.preventDefault();
                    this.objects.sliceUndoLastPoint();
                    return;
                }
            }
            if (ctrl && !shift && e.key === 'z') {
                e.preventDefault();
                this.history.undo();
                return;
            }
            if (ctrl && shift && e.key === 'z') {
                e.preventDefault();
                this.history.redo();
                return;
            }
            if (ctrl && e.key === 'y') {
                e.preventDefault();
                this.history.redo();
                return;
            }

            // Save / Load
            if (ctrl && e.shiftKey && e.key === 'S') {
                e.preventDefault();
                this.exporter.saveProjectAs();
                return;
            }
            if (ctrl && e.key === 's') {
                e.preventDefault();
                this.exporter.saveProject();
                return;
            }
            if (ctrl && e.key === 'o') {
                e.preventDefault();
                this.exporter.loadProject();
                return;
            }

            // Play/Stop
            if (e.key === ' ') {
                e.preventDefault();
                if (this.animations.isPlaying) {
                    this.animations.pause();
                } else {
                    this.animations.playAll();
                }
                return;
            }

            // Preview in a new window
            if (e.altKey && e.key === 'Enter') {
                e.preventDefault();
                this.openPreviewWindow();
                return;
            }

            // Delete
            if (e.key === 'Delete' || e.key === 'Backspace') {
                // In rig mode, delete selected pin
                if (this.objects.rigging && this.objects.rigging.isActive) {
                    e.preventDefault();
                    this.objects.rigging.deleteSelected();
                    return;
                }
                const selected = this.objects.getSelectedObjects();
                if (selected.length > 0) {
                    e.preventDefault();
                    selected.forEach(obj => this.objects.removeObject(obj.id));
                }
                return;
            }

            // Select all
            if (ctrl && e.key === 'a') {
                e.preventDefault();
                this.objects.selectAll();
                return;
            }

            // Deselect
            if (e.key === 'Escape') {
                const svgAfricanModal = document.getElementById('svg-african-character-modal');
                if (svgAfricanModal && !svgAfricanModal.classList.contains('hidden')) {
                    e.preventDefault();
                    this.closeSvgAfricanCharacterLibrary();
                    return;
                }
                this.objects.select([]);
                // Close modals
                document.querySelectorAll('.modal:not(.hidden)').forEach(m => m.classList.add('hidden'));
                return;
            }

            // Duplicate
            if (ctrl && e.key === 'd') {
                e.preventDefault();
                this.objects.duplicateSelected();
                return;
            }

            // Copy
            if (ctrl && !shift && e.key === 'c') {
                if (this.objects.getSelectedObjects().length > 0) {
                    e.preventDefault();
                    this.objects.copySelected();
                }
                return;
            }

            // Cut
            if (ctrl && e.key === 'x') {
                if (this.objects.getSelectedObjects().length > 0) {
                    e.preventDefault();
                    this.objects.cutSelected();
                }
                return;
            }

            // Paste (Ctrl+V) — paste objects from internal clipboard
            if (ctrl && !shift && e.key === 'v') {
                if (this.objects._clipboard && this.objects._clipboard.length > 0) {
                    e.preventDefault();
                    // Paste at centre of current viewport
                    const rect = this.stage.viewport.getBoundingClientRect();
                    const stagePos = this.stage.screenToStage(
                        rect.left + rect.width / 2,
                        rect.top + rect.height / 2
                    );
                    this.objects.pasteFromClipboard(stagePos);
                }
                // If no internal clipboard, fall through to system paste (images) handled in objects.js
                return;
            }

            // Group / Ungroup
            if (ctrl && !shift && e.key === 'g') {
                e.preventDefault();
                this.objects.groupSelected();
                return;
            }
            if (ctrl && shift && e.key === 'g') {
                e.preventDefault();
                this.objects.ungroupSelected();
                return;
            }

            // Toggle grid
            if (e.key === 'g' && !ctrl) {
                this.stage.gridVisible = !this.stage.gridVisible;
                this.stage.needsRender = true;
                return;
            }

            // Toggle snap
            if (e.key === 's' && !ctrl) {
                // Only if not in a tool that uses 's' as shortcut
                // 's' is star tool shortcut, so skip if object manager handles it
                return;
            }

            // Zoom shortcuts
            if (ctrl && (e.key === '=' || e.key === '+')) {
                e.preventDefault();
                this.stage.setZoom(this.stage.zoom + 0.1);
                return;
            }
            if (ctrl && e.key === '-') {
                e.preventDefault();
                this.stage.setZoom(this.stage.zoom - 0.1);
                return;
            }
            if (ctrl && e.key === '0') {
                e.preventDefault();
                this.stage.setZoom(1);
                return;
            }

            // Mode toggle
            if (ctrl && e.key === 'm') {
                e.preventDefault();
                this.mode = this.mode === 'basic' ? 'ai' : 'basic';
                this.applyMode();
                return;
            }

            // Arrow key nudge
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                const selected = this.objects.getSelectedObjects();
                if (selected.length > 0) {
                    e.preventDefault();
                    const step = shift ? 10 : 1;
                    selected.forEach(obj => {
                        let dx = 0, dy = 0;
                        if (e.key === 'ArrowUp') dy = -step;
                        if (e.key === 'ArrowDown') dy = step;
                        if (e.key === 'ArrowLeft') dx = -step;
                        if (e.key === 'ArrowRight') dx = step;

                        if (obj.pinnedTo) {
                            // Nudge the pin offset so _resolvePins keeps the new position
                            obj.pinOffsetX = (obj.pinOffsetX || 0) + dx;
                            obj.pinOffsetY = (obj.pinOffsetY || 0) + dy;
                        } else {
                            obj.x += dx;
                            obj.y += dy;
                            // Also translate pathPoints for path-based objects (absolute coords)
                            if (obj.pathPoints && obj.pathPoints.length > 0) {
                                obj.pathPoints.forEach(p => { p.x += dx; p.y += dy; });
                            }
                        }
                    });
                    this.stage.needsRender = true;
                    this.objects.updateProperties();
                    eventBus.emit('history:push');
                }
            }
        });
    }

    // === Undo/Redo Integration ===

    setupUndoRedo() {
        // Helper to capture full state as a snapshot
        const captureState = () => ({
            type: 'snapshot',
            conversation: JSON.parse(JSON.stringify(this.scenes?.[this.currentSceneIndex]?.conversation || null)),
            objects: this.objects.objects.map(o => o.toJSON()),
            selectedIds: [...this.objects.selectedIds],
            groups: JSON.parse(JSON.stringify(this.objects.groups || {})),
            groupNames: JSON.parse(JSON.stringify(this.objects.groupNames || {})),
            groupCounter: this.objects._groupCounter || 0,
            layers: JSON.parse(JSON.stringify(this.objects.layers || [])),
            activeLayerId: this.objects.activeLayerId,
            layerCounter: this.objects._layerCounter || 1,
            symbols: this.symbols ? this.symbols.toJSON() : null,
            stageBg: {
                bgColor: this.stage.bgColor,
                bgType: this.stage.bgType,
                bgOpacity: this.stage.bgOpacity,
                bgGradStart: this.stage.bgGradStart,
                bgGradEnd: this.stage.bgGradEnd,
                bgGradAngle: this.stage.bgGradAngle,
                bgPatternType: this.stage.bgPatternType,
                bgPatternColor: this.stage.bgPatternColor,
                bgPatternScale: this.stage.bgPatternScale,
                bgImageSrc: this.stage.bgImageSrc,
                bgImageFit: this.stage.bgImageFit
            },
            // Stage Camera state — included so undo/redo also reverts
            // camera keyframe edits (add/move/delete/retime).
            cameraKeyframes: JSON.parse(JSON.stringify(this.stage.cameraKeyframes || [])),
            cameraEnabled: this.stage.cameraEnabled !== false,
            audioTrack: this.audioTimeline?.toJSON
                ? JSON.parse(JSON.stringify(this.audioTimeline.toJSON()))
                : null
        });

        // Push initial baseline state so first undo has somewhere to go
        // Use a short delay to ensure objects are initialized
        setTimeout(() => {
            this.history.push(captureState());
        }, 100);

        // All changes go through history:push as debounced snapshots.
        // The 50ms debounce coalesces rapid-fire events (e.g., compound
        // operations like boolean ops that do multiple add/remove).
        eventBus.on('history:push', () => {
            if (this._isRestoringSnapshot) return;
            if (this.jointSystem?._armatureRecordingBusy || this.jointSystem?._armatureClipPreview) return;
            this.history.pushSnapshot(() => captureState(), 50);
        });

        // Flush pending snapshot immediately (used before destructive ops like boolean)
        eventBus.on('history:flush', () => {
            this.history.flushPending();
        });

        // Handle undo — just restore the snapshot state
        this.history.onUndo = (entry) => {
            if (entry && entry.type === 'snapshot') {
                this._restoreSnapshot(entry);
            }
        };

        // Handle redo — just restore the snapshot state
        this.history.onRedo = (entry) => {
            if (entry && entry.type === 'snapshot') {
                this._restoreSnapshot(entry);
            }
        };
    }

    // === Stage Rendering Pipeline ===

    setupStageRendering() {
        // Tags render on stage
        eventBus.on('stage:render', (ctx) => {
            this.tags.renderTags(ctx);
            // Render destination preview crosshair if active
            this.animations.renderDestinationPreview(ctx);
        });

        // Selection render
        eventBus.on('stage:render-selection', (ctx) => {
            // Objects already handle their own selection rendering
        });

        // Zoom display update
        eventBus.on('stage:zoom', (zoom) => {
            const display = document.getElementById('zoom-level');
            if (display) display.textContent = Math.round(zoom * 100) + '%';
        });

        // Initial render
        this.stage.needsRender = true;
    }

    // === Settings Modal ===

    setupSettings() {
        const settingsBtn = document.getElementById('btn-settings');
        const settingsModal = document.getElementById('settings-modal');

        settingsBtn?.addEventListener('click', () => {
            settingsModal?.classList.remove('hidden');
            this.populateSettings();
        });

        settingsModal?.querySelector('.modal-close')?.addEventListener('click', () => {
            settingsModal?.classList.add('hidden');
        });

        document.getElementById('btn-save-settings')?.addEventListener('click', () => {
            this.applySettings();
            settingsModal?.classList.add('hidden');
        });
        document.getElementById('setting-ai-provider')?.addEventListener('change', () => this.updateAIProviderStatus());
        document.getElementById('setting-ai-key')?.addEventListener('input', () => this.updateAIProviderStatus());
    }

    updateAIProviderStatus() {
        const provider = document.getElementById('setting-ai-provider')?.value;
        const key = document.getElementById('setting-ai-key');
        const endpoint = document.getElementById('setting-ai-endpoint');
        const status = document.getElementById('setting-ai-provider-status');
        const configured = window.__STAGE_USER?.ai_config?.providers?.[provider]?.configured === true;
        if (key) key.placeholder = configured ? 'Server key configured' : 'Enter API key...';
        if (status) status.textContent = configured ? 'Server connection available' : provider === 'builtin' ? '' : 'API key required';
        if (endpoint) endpoint.disabled = configured && !key?.value.trim();
    }

    populateSettings() {
        const theme = document.getElementById('setting-theme');
        const autosave = document.getElementById('setting-autosave');
        const aiProvider = document.getElementById('setting-ai-provider');
        const aiKey = document.getElementById('setting-ai-key');
        const aiEndpoint = document.getElementById('setting-ai-endpoint');
        const hwAccel = document.getElementById('setting-hw-accel');
        const maxObjects = document.getElementById('setting-max-objects');

        if (theme) theme.value = this.theme || (document.body.classList.contains('light-mode') ? 'light' : 'dark');
        if (autosave) autosave.checked = this.autosave ?? true;
        if (aiProvider) aiProvider.value = this.aiProvider || 'builtin';
        if (aiKey) aiKey.value = this.aiApiKey || '';
        if (aiEndpoint) aiEndpoint.value = this.aiEndpoint || '';
        if (hwAccel) hwAccel.checked = this.hwAccel ?? true;
        if (maxObjects) maxObjects.value = this.maxObjects || 500;

        // Show AI prompt quota status
        const aiQuota = window.__STAGE_USER?.ai_quota ?? null;  // null = unlimited
        const aiUsed  = window.__STAGE_USER?.ai_used  ?? 0;
        const aiSection = document.getElementById('ai-settings-section');
        let quotaEl = document.getElementById('ai-quota-info');
        if (!quotaEl && aiSection) {
            quotaEl = document.createElement('p');
            quotaEl.id = 'ai-quota-info';
            quotaEl.style.cssText = 'margin:10px 0 0;font-size:0.82rem;color:var(--text-muted,#888);display:flex;align-items:center;gap:6px';
            aiSection.appendChild(quotaEl);
        }
        if (quotaEl) {
            if (aiQuota === null) {
                quotaEl.innerHTML = '<i class="fas fa-infinity" style="color:#6366f1"></i> Unlimited AI credits';
            } else {
                const aiBonus = window.__STAGE_USER?.ai_bonus ?? 0;
                const injected = window.__STAGE_USER?.ai_remaining;
                const remaining = Number.isFinite(injected) ? injected : Math.max(0, aiQuota - aiUsed) + aiBonus;
                const col = remaining === 0 ? 'var(--danger,#c53030)' : remaining <= 2 ? '#d97706' : 'var(--accent-ai,#7c3aed)';
                const bonusNote = aiBonus > 0 ? ` <span style="opacity:0.8">(incl. ${aiBonus} bonus)</span>` : '';
                quotaEl.innerHTML = `<i class="fas fa-robot" style="color:${col}"></i> <strong>${remaining}</strong> AI credit${remaining !== 1 ? 's' : ''} left this month${bonusNote}<br><span style="font-size:0.92em;opacity:0.75">Monthly allowance ${aiQuota}. Using your own API key below doesn't spend credits.</span>`;
            }
        }
        // Credited users can request more credits (reviewed by an admin)
        if (aiSection && aiQuota !== null && !document.getElementById('ai-credit-request')) {
            const wrap = document.createElement('div');
            wrap.id = 'ai-credit-request';
            wrap.style.cssText = 'margin:8px 0 0';
            wrap.innerHTML = `
                <button type="button" id="ai-credit-request-toggle" style="font-size:0.8rem;padding:4px 10px;border-radius:6px;border:1px solid rgba(124,58,237,.4);background:rgba(124,58,237,.12);color:inherit;cursor:pointer">
                    <i class="fas fa-plus-circle"></i> Request more credits
                </button>
                <div id="ai-credit-request-form" style="display:none;margin-top:8px;flex-direction:column;gap:6px;max-width:320px">
                    <label style="font-size:0.78rem;color:var(--text-muted,#888)">Credits needed
                        <input type="number" id="ai-credit-request-amount" min="1" max="1000" value="50" style="width:100%;margin-top:2px">
                    </label>
                    <label style="font-size:0.78rem;color:var(--text-muted,#888)">Reason (optional)
                        <textarea id="ai-credit-request-reason" rows="2" maxlength="500" placeholder="What are you using AI for?" style="width:100%;margin-top:2px"></textarea>
                    </label>
                    <div style="display:flex;gap:6px;align-items:center">
                        <button type="button" id="ai-credit-request-send" style="font-size:0.8rem;padding:4px 12px;border-radius:6px;border:none;background:#7c3aed;color:#fff;cursor:pointer">Send request</button>
                        <span id="ai-credit-request-status" style="font-size:0.78rem"></span>
                    </div>
                </div>`;
            aiSection.appendChild(wrap);
            const form = wrap.querySelector('#ai-credit-request-form');
            wrap.querySelector('#ai-credit-request-toggle').addEventListener('click', () => {
                form.style.display = form.style.display === 'none' ? 'flex' : 'none';
            });
            wrap.querySelector('#ai-credit-request-send').addEventListener('click', async () => {
                const amount = Math.max(1, Math.min(1000, parseInt(wrap.querySelector('#ai-credit-request-amount').value, 10) || 0));
                const reason = String(wrap.querySelector('#ai-credit-request-reason').value || '').slice(0, 500);
                const statusEl = wrap.querySelector('#ai-credit-request-status');
                statusEl.textContent = 'Sending…';
                try {
                    const res = await fetch('/api/ai/credit-request.php', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': (window.__STAGE_USER && window.__STAGE_USER.csrf_token) || '' },
                        credentials: 'same-origin',
                        body: JSON.stringify({ amount, reason })
                    });
                    const data = await res.json().catch(() => ({}));
                    if (res.ok && data.ok) {
                        statusEl.textContent = 'Sent for review ✓';
                        Utils.showToast('Credit request sent for admin review.', 'success');
                    } else {
                        statusEl.textContent = data.error || 'Request failed';
                    }
                } catch (_) {
                    statusEl.textContent = 'Network error';
                }
            });
        }
        // Buy credits with Stripe (only when billing is configured on the server)
        const billing = window.__STAGE_USER?.billing;
        if (aiSection && billing?.enabled && Array.isArray(billing.packs) && billing.packs.length && !document.getElementById('ai-buy-credits')) {
            const currency = (billing.currency || 'usd').toUpperCase();
            const fmt = (cents) => {
                try { return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format((cents || 0) / 100); }
                catch (_) { return `${currency} ${((cents || 0) / 100).toFixed(2)}`; }
            };
            const buy = document.createElement('div');
            buy.id = 'ai-buy-credits';
            buy.style.cssText = 'margin:10px 0 0';
            const packButtons = billing.packs.map(p =>
                `<button type="button" class="ai-buy-pack" data-pack="${String(p.id).replace(/"/g, '&quot;')}" style="display:flex;justify-content:space-between;align-items:center;gap:12px;text-align:left;padding:8px 12px;border-radius:8px;border:1px solid rgba(124,58,237,.35);background:rgba(124,58,237,.08);color:inherit;cursor:pointer">
                    <span><strong>${Number(p.credits)}</strong> credits</span>
                    <span style="font-weight:600">${fmt(p.amount)}</span>
                </button>`).join('');
            buy.innerHTML = `
                <div style="font-size:0.82rem;color:var(--text-muted,#888);margin-bottom:6px"><i class="fas fa-bolt" style="color:#7c3aed"></i> Buy credits instantly</div>
                <div style="display:flex;flex-direction:column;gap:6px;max-width:320px">${packButtons}</div>
                <span id="ai-buy-status" style="font-size:0.78rem;display:block;margin-top:6px"></span>`;
            aiSection.appendChild(buy);
            const statusEl = buy.querySelector('#ai-buy-status');
            buy.querySelectorAll('.ai-buy-pack').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const pack = btn.getAttribute('data-pack');
                    buy.querySelectorAll('.ai-buy-pack').forEach(b => { b.disabled = true; });
                    statusEl.textContent = 'Redirecting to secure checkout…';
                    try {
                        const res = await fetch('/api/billing/create-checkout.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': (window.__STAGE_USER && window.__STAGE_USER.csrf_token) || '' },
                            credentials: 'same-origin',
                            body: JSON.stringify({ pack })
                        });
                        const data = await res.json().catch(() => ({}));
                        if (res.ok && data.ok && data.url) {
                            window.location.href = data.url;
                        } else {
                            statusEl.textContent = data.error || 'Could not start checkout';
                            buy.querySelectorAll('.ai-buy-pack').forEach(b => { b.disabled = false; });
                        }
                    } catch (_) {
                        statusEl.textContent = 'Network error';
                        buy.querySelectorAll('.ai-buy-pack').forEach(b => { b.disabled = false; });
                    }
                });
            });
        }
        // All authenticated users may configure their own AI key
        if (aiSection) { aiSection.style.opacity = ''; aiSection.style.pointerEvents = ''; aiSection.title = ''; }
        if (aiProvider) aiProvider.disabled = false;
        if (aiKey) { aiKey.disabled = false; aiKey.placeholder = 'Enter API key...'; }
        if (aiEndpoint) aiEndpoint.disabled = false;
        this.updateAIProviderStatus();
    }

    applySettings() {
        const theme = document.getElementById('setting-theme')?.value;
        const autosave = document.getElementById('setting-autosave')?.checked;
        const aiProvider = document.getElementById('setting-ai-provider')?.value;
        const aiKey = document.getElementById('setting-ai-key')?.value;
        const aiEndpoint = document.getElementById('setting-ai-endpoint')?.value;
        const hwAccel = document.getElementById('setting-hw-accel')?.checked;
        const maxObjects = parseInt(document.getElementById('setting-max-objects')?.value);

        if (theme === 'light') {
            document.body.classList.add('light-mode');
        } else {
            document.body.classList.remove('light-mode');
        }

        this.theme = theme === 'light' ? 'light' : 'dark';
        this.autosave = autosave;

        // All users can configure their own AI provider/key (quota enforced server-side)
        this.aiProvider = aiProvider || 'builtin';
        this.aiApiKey   = aiKey || '';
        this.aiEndpoint = aiEndpoint || '';

        this.hwAccel = hwAccel;
        this.maxObjects = maxObjects || 500;
        this._persistSettingsToStorage();

        // Pass API settings to AI mode
        if (this.ai) {
            this.ai.updateAPISettings(this.aiProvider, this.aiApiKey, this.aiEndpoint);
        }

        this.stage.needsRender = true;
        Utils.showToast('Settings applied', 'success');
    }

    // === Context Menu ===

    setupContextMenu() {
        // Close context menu on click anywhere
        document.addEventListener('click', () => {
            document.querySelectorAll('.context-menu').forEach(m => m.remove());
        });

        // Close context menu on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.context-menu').forEach(m => m.remove());
            }
        });
    }

    // === Snapshot Restore (for property undo/redo) ===
    _restoreSnapshot(snapData) {
        if (!snapData || !snapData.objects) return;
        this._isRestoringSnapshot = true;
        if (Object.hasOwn(snapData, 'conversation') && this.scenes?.[this.currentSceneIndex]) {
            this.scenes[this.currentSceneIndex].conversation = JSON.parse(JSON.stringify(snapData.conversation));
        }
        this.objects.objects = snapData.objects.map(d => StageObject.fromJSON(d));
        if (snapData.selectedIds) {
            this.objects.selectedIds = snapData.selectedIds.filter(id =>
                this.objects.objects.some(o => o.id === id)
            );
        }
        // Restore groups from snapshot, or rebuild from object groupId values
        if (snapData.groups) {
            this.objects.groups = JSON.parse(JSON.stringify(snapData.groups));
        } else {
            // Rebuild groups map from object groupId properties
            this.objects.groups = {};
            this.objects.objects.forEach(obj => {
                if (obj.groupId) {
                    if (!this.objects.groups[obj.groupId]) {
                        this.objects.groups[obj.groupId] = [];
                    }
                    this.objects.groups[obj.groupId].push(obj.id);
                }
            });
        }
        // Restore group names and counter
        if (snapData.groupNames) this.objects.groupNames = JSON.parse(JSON.stringify(snapData.groupNames));
        if (snapData.groupCounter != null) this.objects._groupCounter = snapData.groupCounter;
        // Restore layers
        if (snapData.layers && snapData.layers.length > 0) {
            this.objects.layers = JSON.parse(JSON.stringify(snapData.layers));
            this.objects.activeLayerId = snapData.activeLayerId || this.objects.layers[0].id;
            this.objects._layerCounter = snapData.layerCounter || 1;
        }
        // Exit group edit mode if active (the group may no longer exist)
        this.objects._groupEditMode = null;
        // Restore symbols library
        if (this.symbols && snapData.symbols) this.symbols.fromJSON(snapData.symbols);
        // Restore stage background
        if (snapData.stageBg) {
            const bg = snapData.stageBg;
            this.stage.bgColor = bg.bgColor;
            this.stage.bgType = bg.bgType;
            this.stage.bgOpacity = bg.bgOpacity;
            this.stage.bgGradStart = bg.bgGradStart;
            this.stage.bgGradEnd = bg.bgGradEnd;
            this.stage.bgGradAngle = bg.bgGradAngle;
            this.stage.bgPatternType = bg.bgPatternType;
            this.stage.bgPatternColor = bg.bgPatternColor;
            this.stage.bgPatternScale = bg.bgPatternScale;
            this.stage.bgImageFit = bg.bgImageFit;
            if (bg.bgImageSrc && bg.bgImageSrc !== this.stage.bgImageSrc) {
                this.stage.bgImageSrc = bg.bgImageSrc;
                const img = new Image();
                img.onload = () => { if (this.stage.bgImageSrc !== bg.bgImageSrc) return; this.stage.bgImageElement = img; this.stage.needsRender = true; };
                img.src = bg.bgImageSrc;
            } else if (!bg.bgImageSrc) {
                this.stage.bgImageSrc = null;
                this.stage.bgImageElement = null;
            }
            this.stage._updateBgControlVisibility();
            // Sync UI controls
            const bgColorEl = document.getElementById('stage-bg-color');
            if (bgColorEl) bgColorEl.value = bg.bgColor || '#ffffff';
            const bgTypeEl = document.getElementById('stage-bg-type');
            if (bgTypeEl) bgTypeEl.value = bg.bgType || 'solid';
            const bgOpEl = document.getElementById('stage-bg-opacity');
            if (bgOpEl) { bgOpEl.value = Math.round((bg.bgOpacity ?? 1) * 100); }
            const bgOpVal = document.getElementById('stage-bg-opacity-val');
            if (bgOpVal) bgOpVal.textContent = Math.round((bg.bgOpacity ?? 1) * 100) + '%';
        }
        // Restore Stage Camera state (so undo/redo reverts camera keyframes too)
        if (Array.isArray(snapData.cameraKeyframes)) {
            this.stage.cameraKeyframes = JSON.parse(JSON.stringify(snapData.cameraKeyframes));
        }
        if (typeof snapData.cameraEnabled === 'boolean') {
            this.stage.cameraEnabled = snapData.cameraEnabled;
        }
        void this.audioTimeline?.loadFromData?.(snapData.audioTrack || null, { silent: true });
        eventBus.emit?.('camera:keyframes-changed');
        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.animations.updateAppliedAnimationsList();
        this.stage.needsRender = true;
        eventBus.emit('timeline:update');
        this._isRestoringSnapshot = false;
    }

    // === Keyboard Shortcuts Modal ===
    setupShortcutsModal() {
        const modal = document.getElementById('shortcuts-modal');
        if (!modal) return;
        modal.querySelector('.modal-close')?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        // Press ? key to open
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select, [contenteditable]')) return;
            if (e.key === '?' || (e.shiftKey && e.key === '/')) {
                e.preventDefault();
                modal.classList.toggle('hidden');
            }
        });
    }

    // === Scene / Slide Manager ===
    setupSceneManager() {
        this.scenes = [{ id: 'scene_1', name: 'Scene 1', objects: [], stageData: null, audioTrack: null, transitionIn: { type: 'none', duration: 1000 } }];
        this.currentSceneIndex = 0;

        document.getElementById('btn-add-scene')?.addEventListener('click', () => this.addScene());
        document.getElementById('btn-dup-scene')?.addEventListener('click', () => this.duplicateScene());
        document.getElementById('btn-del-scene')?.addEventListener('click', () => this.deleteScene());

        // PageDown/PageUp
        document.addEventListener('keydown', (e) => {
            if (e.target.matches('input, textarea, select, [contenteditable]')) return;
            if (e.key === 'PageDown') { e.preventDefault(); this.nextScene(); }
            if (e.key === 'PageUp') { e.preventDefault(); this.prevScene(); }
        });

        this.renderSceneBar();
    }

    _normalizeSceneTransition(transition) {
        const allowed = new Set([
            'none', 'fade', 'crossfade',
            'wipe-left', 'wipe-right', 'wipe-up', 'wipe-down',
            'slide-left', 'slide-right', 'slide-up', 'slide-down',
            'push-left', 'push-right', 'push-up', 'push-down',
            'morph', 'iris', 'zoom', 'zoom-blur', 'flash'
        ]);
        const type = allowed.has(transition?.type) ? transition.type : 'none';
        const duration = Math.max(150, Math.min(3000, Number(transition?.duration) || 1000));
        return { type, duration };
    }

    _saveCurrentScene() {
        const scene = this.scenes[this.currentSceneIndex];
        if (!scene) return;
        const liveAnimationsById = new Map(
            this.objects.objects.map(obj => [
                obj.id,
                Utils.cloneProjectState(obj.animations || [])
            ])
        );
        const serializeObjectsWithLiveAnimations = () => this.objects.objects.map(obj => {
            const data = obj.toJSON();
            if (liveAnimationsById.has(data.id)) {
                data.animations = Utils.cloneProjectState(liveAnimationsById.get(data.id) || []);
            }
            return data;
        });
        const writeSceneState = () => {
            scene.objects = serializeObjectsWithLiveAnimations();
            scene.stageData = this.stage.getStageData();
            const thumbnail = this._captureSceneThumbnail();
            if (thumbnail) scene.thumbnail = thumbnail;
            scene.audioTrack = this.audioTimeline?.toJSON
                ? JSON.parse(JSON.stringify(this.audioTimeline.toJSON()))
                : null;
            scene.groups = JSON.parse(JSON.stringify(this.objects.groups || {}));
            scene.groupNames = JSON.parse(JSON.stringify(this.objects.groupNames || {}));
            scene.groupCounter = this.objects._groupCounter || 0;
            scene.layers = JSON.parse(JSON.stringify(this.objects.layers || []));
            scene.activeLayerId = this.objects.activeLayerId;
            scene.layerCounter = this.objects._layerCounter || 1;
            if (this.symbols) scene.symbols = this.symbols.toJSON();
        };

        if (this._savingSceneAtAnimationBaseState || !this.exporter?.withObjectsAtAnimationBaseState) {
            writeSceneState();
            return;
        }

        this._savingSceneAtAnimationBaseState = true;
        try {
            this.exporter.withObjectsAtAnimationBaseState(writeSceneState);
        } finally {
            this._savingSceneAtAnimationBaseState = false;
        }
    }

    _captureSceneThumbnail() {
        const source = this.stage?.canvas;
        if (!source || !source.width || !source.height || typeof document === 'undefined') return null;
        try {
            const maxWidth = 240;
            const scale = Math.min(1, maxWidth / source.width);
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(source.width * scale));
            canvas.height = Math.max(1, Math.round(source.height * scale));
            const context = canvas.getContext('2d');
            if (!context) return null;
            context.drawImage(source, 0, 0, canvas.width, canvas.height);
            return canvas.toDataURL('image/jpeg', 0.68);
        } catch (error) {
            // Cross-origin images can make a canvas unreadable. Keep any previous thumbnail.
            console.warn('[Animation Stage] Could not capture scene thumbnail:', error);
            return null;
        }
    }

    _saveCurrentSceneAudioOnly() {
        const scene = this.scenes[this.currentSceneIndex];
        if (!scene) return;
        scene.audioTrack = this.audioTimeline?.toJSON
            ? JSON.parse(JSON.stringify(this.audioTimeline.toJSON()))
            : null;
    }

    _loadScene(idx, preparedObjects = null) {
        const scene = this.scenes[idx];
        if (!scene) return;
        this.audioLipSync?.resetForSceneChange?.();
        this.jointSystem?._stopArmatureMovement?.();
        this.jointSystem?._stopArmatureFacialMovement?.();
        this.jointSystem?._teardownArmaturePanelState?.();
        document.getElementById('armature-panel')?.remove();
        if (this.jointSystem) this.jointSystem._currentArmature = null;
        this.currentSceneIndex = idx;
        this.objects.objects = preparedObjects || scene.objects.map(d => StageObject.fromJSON(d));
        this.objects.selectedIds = [];
        // Restore groups
        if (scene.groups) {
            this.objects.groups = JSON.parse(JSON.stringify(scene.groups));
            this.objects.groupNames = JSON.parse(JSON.stringify(scene.groupNames || {}));
            this.objects._groupCounter = scene.groupCounter || 0;
        } else {
            this.objects.groups = {};
            this.objects.groupNames = {};
        }
        // Restore layers
        if (scene.layers && scene.layers.length > 0) {
            this.objects.layers = JSON.parse(JSON.stringify(scene.layers));
            this.objects.activeLayerId = scene.activeLayerId || this.objects.layers[0].id;
            this.objects._layerCounter = scene.layerCounter || 1;
        } else {
            this.objects.layers = [{ id: 'layer-1', name: 'Layer 1', visible: true, locked: false }];
            this.objects.activeLayerId = 'layer-1';
            this.objects._layerCounter = 1;
        }
        // Restore symbols library
        if (this.symbols) this.symbols.fromJSON(scene.symbols || { library: {}, counter: 0 });
        this.objects._groupEditMode = null;
        if (scene.stageData) this.stage.loadFromData(scene.stageData);
        const audioLoaded = this.audioTimeline?.loadFromData?.(scene.audioTrack || null, { silent: true });
        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.animations.updateAppliedAnimationsList();
        this.timeline?.update();
        this.stage.needsRender = true;
        this.renderSceneBar();
        return audioLoaded;
    }

    addScene() {
        this._saveCurrentScene();
        const num = this.scenes.length + 1;
        this.scenes.push({ id: `scene_${Date.now()}`, name: `Scene ${num}`, objects: [], stageData: this.stage.getStageData(), audioTrack: null, transitionIn: { type: 'none', duration: 1000 } });
        this._loadScene(this.scenes.length - 1);
        Utils.showToast(`Scene ${num} added`, 'success');
    }

    duplicateScene() {
        this._saveCurrentScene();
        const current = this.scenes[this.currentSceneIndex];
        const dup = {
            id: `scene_${Date.now()}`,
            name: current.name + ' Copy',
            conversation: current.conversation ? JSON.parse(JSON.stringify(current.conversation)) : null,
            objects: JSON.parse(JSON.stringify(current.objects)),
            stageData: current.stageData ? JSON.parse(JSON.stringify(current.stageData)) : null,
            audioTrack: current.audioTrack ? JSON.parse(JSON.stringify(current.audioTrack)) : null,
            groups: current.groups ? JSON.parse(JSON.stringify(current.groups)) : {},
            groupNames: current.groupNames ? JSON.parse(JSON.stringify(current.groupNames)) : {},
            groupCounter: current.groupCounter || 0,
            layers: JSON.parse(JSON.stringify(current.layers || [])),
            activeLayerId: current.activeLayerId,
            layerCounter: current.layerCounter || 1,
            symbols: current.symbols ? JSON.parse(JSON.stringify(current.symbols)) : null,
            transitionIn: this._normalizeSceneTransition(current.transitionIn)
        };
        this.scenes.splice(this.currentSceneIndex + 1, 0, dup);
        this._loadScene(this.currentSceneIndex + 1);
        Utils.showToast('Scene duplicated', 'success');
    }

    deleteScene() {
        if (this.scenes.length <= 1) {
            Utils.showToast('Cannot delete the last scene', 'warning');
            return;
        }
        this.scenes.splice(this.currentSceneIndex, 1);
        const newIdx = Math.min(this.currentSceneIndex, this.scenes.length - 1);
        this._loadScene(newIdx);
        Utils.showToast('Scene deleted', 'info');
    }

    nextScene() {
        if (this.currentSceneIndex < this.scenes.length - 1) {
            this._saveCurrentScene();
            this._loadScene(this.currentSceneIndex + 1);
        }
    }

    prevScene() {
        if (this.currentSceneIndex > 0) {
            this._saveCurrentScene();
            this._loadScene(this.currentSceneIndex - 1);
        }
    }

    renderSceneBar() {
        const scroll = document.getElementById('scene-bar-scroll');
        if (!scroll) return;
        const sceneBar = document.getElementById('scene-bar');
        let indicator = document.getElementById('current-scene-indicator');
        if (sceneBar && !indicator) {
            indicator = document.createElement('div');
            indicator.id = 'current-scene-indicator';
            indicator.className = 'current-scene-indicator';
            const actions = sceneBar.querySelector('.scene-bar-actions');
            if (actions && actions.nextSibling) {
                sceneBar.insertBefore(indicator, actions.nextSibling);
            } else {
                sceneBar.insertBefore(indicator, scroll);
            }
        }
        const currentScene = this.scenes[this.currentSceneIndex];
        if (indicator) {
            indicator.textContent = `Visible scene ${this.currentSceneIndex + 1} of ${this.scenes.length}`;
            indicator.title = currentScene?.name || `Scene ${this.currentSceneIndex + 1}`;
        }
        this.audioTimeline?._refreshScopeControls?.();
        scroll.innerHTML = this.scenes.map((scene, i) => {
            const isActive = i === this.currentSceneIndex;
            const active = isActive ? ' active' : '';
            const sceneName = Utils.escapeHtml(scene.name || `Scene ${i + 1}`);
            const ariaCurrent = isActive ? ' aria-current="true"' : '';
            const transition = this._normalizeSceneTransition(scene.transitionIn);
            const transitionLabel = transition.type === 'none'
                ? 'No transition'
                : transition.type.replace(/-/g, ' ');
            const transitionButton = i > 0
                ? `<button type="button" class="scene-transition-btn${transition.type !== 'none' ? ' active' : ''}" data-transition-scene="${i}" title="Transition into ${sceneName}" aria-label="Transition into ${sceneName}">
                    <i class="fas fa-exchange-alt"></i><span>${Utils.escapeHtml(transitionLabel)}</span>
                </button>`
                : '';
            return `${transitionButton}<div class="scene-thumb${active}" data-scene="${i}" title="${sceneName}" role="button" aria-label="${sceneName}"${ariaCurrent}>
                <span class="scene-number">${i + 1}</span>
                <span class="scene-name">${sceneName}</span>
                ${isActive ? '<span class="scene-visible-badge">Visible</span>' : ''}
            </div>`;
        }).join('');
        scroll.querySelectorAll('.scene-thumb').forEach(el => {
            el.addEventListener('click', () => {
                const idx = parseInt(el.dataset.scene);
                if (idx !== this.currentSceneIndex) {
                    this._saveCurrentScene();
                    this._loadScene(idx);
                }
            });
            el.addEventListener('dblclick', () => {
                const idx = parseInt(el.dataset.scene);
                const name = prompt('Scene name:', this.scenes[idx].name);
                if (name) { this.scenes[idx].name = name; this.renderSceneBar(); }
            });
        });
        scroll.querySelectorAll('.scene-transition-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const idx = parseInt(btn.dataset.transitionScene, 10);
                this.openSceneTransitionPicker(idx, btn);
            });
        });
        // Keep the toolbar Preview dropdown caret in sync with scene count.
        if (typeof this._refreshPreviewMenu === 'function') this._refreshPreviewMenu();
    }

    openSceneTransitionPicker(sceneIndex, anchorEl = null) {
        const scene = this.scenes[sceneIndex];
        if (!scene || sceneIndex <= 0) return;
        document.getElementById('scene-transition-popover')?.remove();

        const transition = this._normalizeSceneTransition(scene.transitionIn);
        const popover = document.createElement('div');
        popover.id = 'scene-transition-popover';
        popover.className = 'scene-transition-popover';
        popover.innerHTML = `
            <div class="scene-transition-head">
                <strong>Into Scene ${sceneIndex + 1}</strong>
                <button type="button" class="scene-transition-close" aria-label="Close">&times;</button>
            </div>
            <label>Effect</label>
            <select class="scene-transition-type">
                <option value="none">None</option>
                <option value="fade">Fade</option>
                <option value="crossfade">Crossfade</option>
                <option value="push-left">Push left</option>
                <option value="push-right">Push right</option>
                <option value="push-up">Push up</option>
                <option value="push-down">Push down</option>
                <option value="morph">Morph</option>
                <option value="wipe-left">Wipe left</option>
                <option value="wipe-right">Wipe right</option>
                <option value="wipe-up">Wipe up</option>
                <option value="wipe-down">Wipe down</option>
                <option value="iris">Iris reveal</option>
                <option value="zoom">Zoom</option>
                <option value="zoom-blur">Zoom blur</option>
                <option value="flash">Flash</option>
                <option value="slide-left">Slide left</option>
                <option value="slide-right">Slide right</option>
                <option value="slide-up">Slide up</option>
                <option value="slide-down">Slide down</option>
            </select>
            <label>Duration</label>
            <input class="scene-transition-duration" type="number" min="150" max="3000" step="50" value="${transition.duration}">
            <div class="scene-transition-actions">
                <button type="button" class="scene-transition-preview"><i class="fas fa-eye"></i> Preview All</button>
                <button type="button" class="scene-transition-done">Done</button>
            </div>`;
        document.body.appendChild(popover);

        const typeSelect = popover.querySelector('.scene-transition-type');
        const durationInput = popover.querySelector('.scene-transition-duration');
        typeSelect.value = transition.type;

        const persist = () => {
            scene.transitionIn = this._normalizeSceneTransition({
                type: typeSelect.value,
                duration: durationInput.value
            });
            this.renderSceneBar();
        };
        typeSelect.addEventListener('change', persist);
        durationInput.addEventListener('change', persist);
        const closePopover = () => {
            window.removeEventListener('resize', positionPopover);
            popover.remove();
        };
        popover.querySelector('.scene-transition-close').addEventListener('click', closePopover);
        popover.querySelector('.scene-transition-done').addEventListener('click', () => {
            persist();
            closePopover();
        });
        popover.querySelector('.scene-transition-preview').addEventListener('click', () => {
            persist();
            this.exporter?.previewAllScenes?.();
        });

        function positionPopover() {
            const rect = anchorEl?.getBoundingClientRect?.();
            const margin = 8;
            const width = popover.offsetWidth || 280;
            const height = popover.offsetHeight || 240;
            const maxLeft = Math.max(margin, window.innerWidth - width - margin);
            const maxTop = Math.max(margin, window.innerHeight - height - margin);
            const preferredLeft = rect ? rect.left - 80 : margin;
            const preferredTop = rect ? rect.top - height - 10 : margin;
            popover.style.left = Math.min(maxLeft, Math.max(margin, preferredLeft)) + 'px';
            popover.style.top = Math.min(maxTop, Math.max(margin, preferredTop)) + 'px';
        }
        positionPopover();
        window.addEventListener('resize', positionPopover);
    }

    // === Rulers ===
    setupRulers() {
        this.rulersVisible = false;
        document.getElementById('stage-container')?.classList.remove('rulers-visible');
        const hRuler = document.getElementById('ruler-horizontal');
        const vRuler = document.getElementById('ruler-vertical');
        const corner = document.getElementById('ruler-corner');
        const hCanvas = document.getElementById('ruler-h-canvas');
        const vCanvas = document.getElementById('ruler-v-canvas');

        corner?.addEventListener('click', () => this.toggleRulers());

        // Ctrl+R shortcut
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'r' && !e.shiftKey) {
                if (e.target.matches('input, textarea, select, [contenteditable]')) return;
                e.preventDefault();
                this.toggleRulers();
            }
        });

        // Re-draw rulers on render
        eventBus.on('stage:render', () => {
            if (this.rulersVisible) this.drawRulers();
        });
    }

    toggleRulers() {
        this.rulersVisible = !this.rulersVisible;
        const hRuler = document.getElementById('ruler-horizontal');
        const vRuler = document.getElementById('ruler-vertical');
        const corner = document.getElementById('ruler-corner');
        [hRuler, vRuler, corner].forEach(el => {
            if (el) el.classList.toggle('hidden', !this.rulersVisible);
        });
        document.getElementById('stage-container')?.classList.toggle('rulers-visible', this.rulersVisible);
        this.stage.needsRender = true;
    }

    drawRulers() {
        const hCanvas = document.getElementById('ruler-h-canvas');
        const vCanvas = document.getElementById('ruler-v-canvas');
        if (!hCanvas || !vCanvas) return;

        const dpr = this.stage.dpr;
        const zoom = this.stage.zoom;
        const panX = this.stage.panX;
        const panY = this.stage.panY;

        // Horizontal ruler
        const hRect = hCanvas.parentElement.getBoundingClientRect();
        hCanvas.width = hRect.width * dpr;
        hCanvas.height = 24 * dpr;
        hCanvas.style.width = hRect.width + 'px';
        hCanvas.style.height = '24px';
        const hCtx = hCanvas.getContext('2d');
        hCtx.scale(dpr, dpr);
        hCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary') || '#1e1e2e';
        hCtx.fillRect(0, 0, hRect.width, 24);
        hCtx.fillStyle = '#888';
        hCtx.font = '9px Inter';
        hCtx.textAlign = 'center';

        const step = this._rulerStep(zoom);
        const startX = Math.floor(-panX / zoom / step) * step;
        const endX = startX + hRect.width / zoom + step;
        for (let x = startX; x < endX; x += step) {
            const px = x * zoom + panX;
            hCtx.fillStyle = '#888';
            hCtx.fillText(Math.round(x), px, 10);
            hCtx.fillStyle = '#555';
            hCtx.fillRect(px, 16, 1, 8);
            // minor ticks
            for (let m = 1; m < 5; m++) {
                const mx = (x + m * step / 5) * zoom + panX;
                hCtx.fillRect(mx, 20, 1, 4);
            }
        }

        // Vertical ruler
        const vRect = vCanvas.parentElement.getBoundingClientRect();
        vCanvas.width = 24 * dpr;
        vCanvas.height = vRect.height * dpr;
        vCanvas.style.width = '24px';
        vCanvas.style.height = vRect.height + 'px';
        const vCtx = vCanvas.getContext('2d');
        vCtx.scale(dpr, dpr);
        vCtx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary') || '#1e1e2e';
        vCtx.fillRect(0, 0, 24, vRect.height);
        vCtx.font = '9px Inter';
        vCtx.textAlign = 'center';

        const startY = Math.floor(-panY / zoom / step) * step;
        const endY = startY + vRect.height / zoom + step;
        for (let y = startY; y < endY; y += step) {
            const py = y * zoom + panY;
            vCtx.save();
            vCtx.translate(10, py);
            vCtx.rotate(-Math.PI / 2);
            vCtx.fillStyle = '#888';
            vCtx.fillText(Math.round(y), 0, 0);
            vCtx.restore();
            vCtx.fillStyle = '#555';
            vCtx.fillRect(16, py, 8, 1);
            for (let m = 1; m < 5; m++) {
                const my = (y + m * step / 5) * zoom + panY;
                vCtx.fillRect(20, my, 4, 1);
            }
        }
    }

    _rulerStep(zoom) {
        const pixelStep = 100;
        const raw = pixelStep / zoom;
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const norm = raw / mag;
        if (norm < 2) return 2 * mag;
        if (norm < 5) return 5 * mag;
        return 10 * mag;
    }

    // === Vector Import (SVG, EPS, AI, PDF) ===
    setupSVGImport() {
        document.getElementById('btn-import-svg')?.addEventListener('click', () => {
            document.getElementById('file-input-svg')?.click();
        });
        document.getElementById('btn-import-svg-empty')?.addEventListener('click', () => {
            document.getElementById('file-input-svg')?.click();
        });
        document.getElementById('btn-import-object-empty')?.addEventListener('click', () => {
            this.objects.importObjectJSON();
        });
        document.getElementById('btn-saved-templates-empty')?.addEventListener('click', () => {
            this.objects.showRiggedTemplates();
        });
        document.getElementById('btn-load-sample-empty')?.addEventListener('click', () => {
            this._loadSampleProject();
        });
        document.getElementById('btn-import-object-json')?.addEventListener('click', () => {
            this.objects.importObjectJSON();
        });
        // Rigged Templates modal close
        document.querySelector('#rigged-templates-modal .modal-close')?.addEventListener('click', () => {
            document.getElementById('rigged-templates-modal')?.classList.add('hidden');
        });
        document.getElementById('rigged-templates-modal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) e.currentTarget.classList.add('hidden');
        });
        document.getElementById('file-input-svg')?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            files.forEach((file) => {
                const ext = file.name.split('.').pop().toLowerCase();

                if (ext === 'svg') {
                    const reader = new FileReader();
                    reader.onload = (evt) => this.parseSVGAndImport(evt.target.result);
                    reader.readAsText(file);
                } else if (ext === 'eps' || ext === 'ai') {
                    const reader = new FileReader();
                    reader.onload = (evt) => this._importEPSorAI(evt.target.result, file);
                    reader.readAsText(file);
                } else if (ext === 'pdf') {
                    this._importAsImage(file);
                } else {
                    this._importAsImage(file);
                }
            });
            e.target.value = '';
        });
    }

    // Import EPS or AI file — try embedded SVG, then parse PostScript paths, else fail gracefully
    _importEPSorAI(textContent, file) {
        // Many modern AI/EPS files embed SVG content
        const svgMatch = textContent.match(/<svg[\s\S]*?<\/svg>/i);
        if (svgMatch) {
            Utils.showToast('Found embedded SVG in file — importing shapes...', 'info');
            this.parseSVGAndImport(svgMatch[0]);
            return;
        }
        // Try to parse PostScript drawing commands from EPS
        const shapes = this._parseEPSPaths(textContent);
        if (shapes.length > 0) {
            this._importEPSShapes(shapes);
            return;
        }
        Utils.showToast('No extractable shapes found in this EPS file. Try re-saving as SVG from your design tool.', 'warning');
    }

    // Parse PostScript path commands from EPS text
    _parseEPSPaths(text) {
        const shapes = [];
        let currentPath = [];
        let currentFill = '#4a90d9';
        let currentStroke = '#000000';
        let currentStrokeWidth = 1;
        let inPath = false;

        // Extract BoundingBox for scaling reference
        const bbMatch = text.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
        const bbX = bbMatch ? parseInt(bbMatch[1]) : 0;
        const bbY = bbMatch ? parseInt(bbMatch[2]) : 0;
        const bbW = bbMatch ? (parseInt(bbMatch[3]) - parseInt(bbMatch[1])) : 500;
        const bbH = bbMatch ? (parseInt(bbMatch[4]) - parseInt(bbMatch[2])) : 500;

        // Normalize lines and tokenize
        const lines = text.split('\n');
        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line || line.startsWith('%')) continue;

            // Color: r g b setrgbcolor  OR  r g b rg
            const rgbMatch = line.match(/^\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(?:setrgbcolor|rg|RG)\s*$/);
            if (rgbMatch) {
                const r = Math.round(parseFloat(rgbMatch[1]) * 255);
                const g = Math.round(parseFloat(rgbMatch[2]) * 255);
                const b = Math.round(parseFloat(rgbMatch[3]) * 255);
                const hex = '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
                currentFill = hex;
                currentStroke = hex;
                continue;
            }
            // Gray: g setgray
            const grayMatch = line.match(/^\s*([\d.]+)\s+(?:setgray|g|G)\s*$/);
            if (grayMatch) {
                const v = Math.round(parseFloat(grayMatch[1]) * 255);
                const hex = '#' + v.toString(16).padStart(2, '0').repeat(3);
                currentFill = hex;
                currentStroke = hex;
                continue;
            }
            // CMYK: c m y k setcmykcolor  OR  c m y k k
            const cmykMatch = line.match(/^\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+(?:setcmykcolor|k|K)\s*$/);
            if (cmykMatch) {
                const c = parseFloat(cmykMatch[1]), m = parseFloat(cmykMatch[2]), y = parseFloat(cmykMatch[3]), k = parseFloat(cmykMatch[4]);
                const r = Math.round(255 * (1 - c) * (1 - k));
                const g = Math.round(255 * (1 - m) * (1 - k));
                const b = Math.round(255 * (1 - y) * (1 - k));
                const hex = '#' + [r, g, b].map(v => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
                currentFill = hex;
                currentStroke = hex;
                continue;
            }
            // Stroke width: n setlinewidth  OR  n w
            const lwMatch = line.match(/^\s*([\d.]+)\s+(?:setlinewidth|w)\s*$/);
            if (lwMatch) {
                currentStrokeWidth = parseFloat(lwMatch[1]) || 1;
                continue;
            }

            // Tokenize the line for multi-token path commands
            const tokens = line.split(/\s+/);
            for (let i = 0; i < tokens.length; i++) {
                const tok = tokens[i];

                // newpath
                if (tok === 'newpath') {
                    inPath = true;
                    currentPath = [];
                    continue;
                }

                // x y moveto / m
                if ((tok === 'moveto' || tok === 'm') && i >= 2) {
                    const y = parseFloat(tokens[i - 1]);
                    const x = parseFloat(tokens[i - 2]);
                    if (!isNaN(x) && !isNaN(y)) {
                        inPath = true;
                        currentPath.push({ x, y: bbH - (y - bbY) + bbY });
                    }
                    continue;
                }

                // x y lineto / l
                if ((tok === 'lineto' || tok === 'l' || tok === 'L') && i >= 2) {
                    const y = parseFloat(tokens[i - 1]);
                    const x = parseFloat(tokens[i - 2]);
                    if (!isNaN(x) && !isNaN(y)) {
                        currentPath.push({ x, y: bbH - (y - bbY) + bbY });
                    }
                    continue;
                }

                // x1 y1 x2 y2 x3 y3 curveto / c
                if ((tok === 'curveto' || tok === 'c' || tok === 'C') && i >= 6) {
                    const x3 = parseFloat(tokens[i - 2]);
                    const y3 = parseFloat(tokens[i - 1]);
                    const x2 = parseFloat(tokens[i - 4]);
                    const y2 = parseFloat(tokens[i - 3]);
                    const x1 = parseFloat(tokens[i - 6]);
                    const y1 = parseFloat(tokens[i - 5]);
                    if ([x1,y1,x2,y2,x3,y3].every(n => !isNaN(n))) {
                        // Approximate cubic bezier with sample points
                        const sx = currentPath.length > 0 ? currentPath[currentPath.length - 1].x : x1;
                        const sy = currentPath.length > 0 ? currentPath[currentPath.length - 1].y : bbH - (y1 - bbY) + bbY;
                        const fy = (v) => bbH - (v - bbY) + bbY;
                        for (let t = 0.25; t <= 1; t += 0.25) {
                            const mt = 1 - t;
                            const px = mt*mt*mt*sx + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
                            const py = mt*mt*mt*sy + 3*mt*mt*t*fy(y1) + 3*mt*t*t*fy(y2) + t*t*t*fy(y3);
                            currentPath.push({ x: px, y: py });
                        }
                    }
                    continue;
                }

                // closepath
                if (tok === 'closepath' || tok === 'cp' || tok === 'h') {
                    if (currentPath.length > 0) {
                        currentPath.push({ ...currentPath[0] });
                    }
                    continue;
                }

                // fill / stroke / eofill — finalize the current path
                if (tok === 'fill' || tok === 'eofill' || tok === 'f' || tok === 'F' || tok === 'f*') {
                    if (currentPath.length >= 2) {
                        shapes.push({ points: [...currentPath], fill: currentFill, stroke: 'none', strokeWidth: 0 });
                    }
                    currentPath = [];
                    inPath = false;
                    continue;
                }
                if (tok === 'stroke' || tok === 'S' || tok === 's') {
                    if (currentPath.length >= 2) {
                        shapes.push({ points: [...currentPath], fill: 'none', stroke: currentStroke, strokeWidth: currentStrokeWidth });
                    }
                    currentPath = [];
                    inPath = false;
                    continue;
                }
            }
        }

        // Flush any remaining path
        if (currentPath.length >= 2) {
            shapes.push({ points: [...currentPath], fill: currentFill, stroke: 'none', strokeWidth: 0 });
        }

        return shapes;
    }

    // Import parsed EPS shapes onto the stage
    _importEPSShapes(shapes) {
        // Find bounding box of all shapes
        let allMinX = Infinity, allMinY = Infinity, allMaxX = -Infinity, allMaxY = -Infinity;
        shapes.forEach(s => s.points.forEach(p => {
            allMinX = Math.min(allMinX, p.x); allMinY = Math.min(allMinY, p.y);
            allMaxX = Math.max(allMaxX, p.x); allMaxY = Math.max(allMaxY, p.y);
        }));
        const totalW = allMaxX - allMinX || 500;
        const totalH = allMaxY - allMinY || 500;

        // Scale to fit stage
        const stageW = this.stage.width;
        const stageH = this.stage.height;
        const maxFit = Math.min(stageW * 0.8, stageH * 0.8);
        const scale = Math.min(maxFit / totalW, maxFit / totalH, 1);
        const offX = stageW / 2 - (totalW * scale) / 2;
        const offY = stageH / 2 - (totalH * scale) / 2;

        const allIds = [];
        shapes.forEach(shape => {
            const mapped = shape.points.map(p => ({
                x: (p.x - allMinX) * scale + offX,
                y: (p.y - allMinY) * scale + offY
            }));
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            mapped.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });

            const obj = new StageObject('freeform', {
                x: minX, y: minY,
                width: (maxX - minX) || 10, height: (maxY - minY) || 10,
                fill: shape.fill === 'none' ? 'none' : shape.fill,
                stroke: shape.stroke === 'none' ? '#000' : shape.stroke,
                strokeWidth: shape.strokeWidth * scale,
                pathPoints: mapped
            });
            this.objects.addObject(obj);
            allIds.push(obj.id);
        });

        // Auto-group all imported EPS shapes
        if (allIds.length > 1) {
            const groupId = Utils.generateId('grp');
            this.objects._groupCounter++;
            this.objects.groups[groupId] = [...allIds];
            this.objects.groupNames[groupId] = 'EPS Import';
            allIds.forEach(id => {
                const obj = this.objects.getObjectById(id);
                if (obj) obj.groupId = groupId;
            });
        }

        Utils.showToast(`Imported ${shapes.length} shape(s) from EPS — right-click to ungroup`, 'success');
        this.objects.updateObjectList();
        this.objects.stage.requestRender();
    }

    // Sample project — places a small set of colourful shapes plus a title
    // text object so a brand-new user can immediately try animations, the
    // timeline, and the property editor without first hunting for tools.
    _loadSampleProject() {
        try {
            if (this.objects.objects && this.objects.objects.length > 0) {
                const ok = window.confirm('Loading the sample project will add objects to the current stage. Continue?');
                if (!ok) return;
            }
            const cx = this.stage.width / 2;
            const cy = this.stage.height / 2;
            const created = [];
            const palette = ['#6366f1', '#ec4899', '#10b981', '#f59e0b', '#3b82f6'];

            // Title text
            try {
                const title = new StageObject('text', {
                    x: cx - 180, y: cy - 180,
                    width: 360, height: 70,
                    text: 'Welcome to Animation Stage',
                    fontSize: 28, fontFamily: 'Arial',
                    fill: '#ffffff', textAlign: 'center'
                });
                this.objects.addObject(title);
                created.push(title.id);
            } catch (_) { /* text optional if signature differs */ }

            // Row of circles
            for (let i = 0; i < 5; i++) {
                const r = 36;
                const obj = new StageObject('circle', {
                    x: cx - 200 + i * 100,
                    y: cy - 40,
                    width: r * 2, height: r * 2,
                    fill: palette[i % palette.length]
                });
                this.objects.addObject(obj);
                created.push(obj.id);
            }

            // Rounded rectangle
            const rect = new StageObject('rectangle', {
                x: cx - 120, y: cy + 70,
                width: 240, height: 70,
                fill: '#1f2937',
                borderRadius: 16
            });
            this.objects.addObject(rect);
            created.push(rect.id);

            this.objects.select(created);
            this.objects.updateObjectList();
            this.objects.updateProperties();
            this.stage.requestRender();
            try { eventBus.emit('history:push'); } catch (_) {}
            Utils.showToast('Sample project loaded — try the Animate tab to apply an effect', 'success');
        } catch (e) {
            console.warn('[Sample] failed:', e && e.message);
            Utils.showToast('Could not load sample project', 'error');
        }
    }

    // Import a file as a raster image object
    _importAsImage(file) {
        const reader = new FileReader();
        reader.onload = () => {
            const img = new Image();
            img.onload = () => {
                const maxDim = 400;
                let w = img.naturalWidth || 200;
                let h = img.naturalHeight || 200;
                if (w > maxDim || h > maxDim) {
                    const scale = maxDim / Math.max(w, h);
                    w *= scale;
                    h *= scale;
                }
                const finalize = (imageSrc) => {
                    const obj = new StageObject('image', {
                        x: this.stage.width / 2 - w / 2,
                        y: this.stage.height / 2 - h / 2,
                        width: w, height: h,
                        imageSrc
                    });
                    this.objects.addObject(obj);
                    this.objects.select([obj.id]);
                };
                // Phase 3: Opt-in downscale prompt for large images.
                // Threshold: 2048px on long edge. Preserves alpha (PNG → PNG, JPEG → JPEG q=0.92).
                const DOWNSCALE_THRESHOLD = 2048;
                const natW = img.naturalWidth || 0;
                const natH = img.naturalHeight || 0;
                const longEdge = Math.max(natW, natH);
                if (longEdge > DOWNSCALE_THRESHOLD) {
                    this._promptDownscaleImport(file, img, natW, natH, DOWNSCALE_THRESHOLD).then(finalize);
                } else {
                    finalize(reader.result);
                }
            };
            img.onerror = () => {
                Utils.showToast('Could not load this file format. Try converting to SVG first.', 'error');
            };
            img.src = reader.result;
        };
        reader.readAsDataURL(file);
    }

    // Show modal asking whether to downscale a large imported image. Resolves with the
    // chosen image data URL (downscaled or original). Alpha is preserved.
    _promptDownscaleImport(file, img, natW, natH, threshold) {
        return new Promise((resolve) => {
            const isJpeg = /jpe?g$/i.test(file.name) || file.type === 'image/jpeg';
            const mime = isJpeg ? 'image/jpeg' : 'image/png';
            const scale = threshold / Math.max(natW, natH);
            const targetW = Math.round(natW * scale);
            const targetH = Math.round(natH * scale);

            const modal = document.createElement('div');
            modal.className = 'modal-overlay';
            modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;';
            modal.innerHTML = `
                <div style="background:var(--panel-bg,#2a2a2a);color:var(--text,#eee);padding:20px;border-radius:8px;max-width:440px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
                    <h3 style="margin:0 0 12px 0;font-size:16px;">Large image detected</h3>
                    <p style="margin:0 0 8px 0;font-size:13px;line-height:1.5;">
                        <strong>${Utils.escapeHtml ? Utils.escapeHtml(file.name) : file.name}</strong><br>
                        Original: ${natW} × ${natH}px<br>
                        Downscaled: ${targetW} × ${targetH}px (long edge ${threshold}px)
                    </p>
                    <p style="margin:0 0 16px 0;font-size:12px;opacity:0.75;">
                        Downscaling reduces file size and improves performance. Transparency is preserved.
                    </p>
                    <div style="display:flex;gap:8px;justify-content:flex-end;">
                        <button class="btn-cancel" style="padding:8px 14px;background:#444;color:#eee;border:none;border-radius:4px;cursor:pointer;">Keep original</button>
                        <button class="btn-confirm" style="padding:8px 14px;background:#0a84ff;color:#fff;border:none;border-radius:4px;cursor:pointer;">Downscale</button>
                    </div>
                </div>
            `;
            const cleanup = (result) => {
                modal.remove();
                resolve(result);
            };
            modal.querySelector('.btn-cancel').addEventListener('click', () => {
                cleanup(img.src);
            });
            modal.querySelector('.btn-confirm').addEventListener('click', () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = targetW;
                    canvas.height = targetH;
                    const ctx = canvas.getContext('2d');
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, targetW, targetH);
                    const dataUrl = isJpeg ? canvas.toDataURL(mime, 0.92) : canvas.toDataURL(mime);
                    Utils.showToast(`Image downscaled to ${targetW}×${targetH}px`, 'success');
                    cleanup(dataUrl);
                } catch (err) {
                    console.warn('Downscale failed, keeping original', err);
                    Utils.showToast('Downscale failed — kept original', 'warning');
                    cleanup(img.src);
                }
            });
            modal.addEventListener('click', (e) => {
                if (e.target === modal) cleanup(img.src);
            });
            document.body.appendChild(modal);
            modal.querySelector('.btn-confirm').focus();
        });
    }

    parseSVGAndImport(svgText) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(svgText, 'image/svg+xml');
        const svg = doc.querySelector('svg');
        if (!svg) { Utils.showToast('Invalid SVG file', 'error'); return; }

        // Collect all shapes grouped by their parent <g> element
        const groupMap = new Map(); // parentG element → [StageObject ids]
        const allCreated = [];
        const stageW = this.stage.width;
        const stageH = this.stage.height;

        // Parse the SVG viewBox / dimensions for coordinate mapping
        const vb = svg.getAttribute('viewBox');
        let svgW = parseFloat(svg.getAttribute('width')) || 0;
        let svgH = parseFloat(svg.getAttribute('height')) || 0;
        let vbX = 0, vbY = 0, vbW = svgW, vbH = svgH;
        if (vb) {
            const parts = vb.split(/[\s,]+/).map(Number);
            if (parts.length === 4) { vbX = parts[0]; vbY = parts[1]; vbW = parts[2]; vbH = parts[3]; }
        }
        if (!vbW) vbW = 500;
        if (!vbH) vbH = 500;

        // Scale factor to fit on stage
        const maxFit = Math.min(stageW * 0.8, stageH * 0.8);
        const scaleFit = Math.min(maxFit / vbW, maxFit / vbH, 1);

        // Parse a transform attribute into a simple {tx, ty, sx, sy} object
        const parseTransform = (el) => {
            const t = el.getAttribute('transform') || '';
            let tx = 0, ty = 0, sx = 1, sy = 1;
            // translate(x, y)
            const trMatch = t.match(/translate\(([^)]+)\)/);
            if (trMatch) {
                const nums = trMatch[1].split(/[\s,]+/).map(Number);
                tx = nums[0] || 0; ty = nums[1] || 0;
            }
            // scale(x, y)
            const scMatch = t.match(/scale\(([^)]+)\)/);
            if (scMatch) {
                const nums = scMatch[1].split(/[\s,]+/).map(Number);
                sx = nums[0] || 1; sy = nums.length > 1 ? nums[1] : sx;
            }
            // matrix(a,b,c,d,e,f)
            const mMatch = t.match(/matrix\(([^)]+)\)/);
            if (mMatch) {
                const nums = mMatch[1].split(/[\s,]+/).map(Number);
                if (nums.length >= 6) {
                    sx = nums[0]; sy = nums[3]; tx = nums[4]; ty = nums[5];
                }
            }
            return { tx, ty, sx, sy };
        };

        // Accumulate transforms from parent chain
        const getAccumulatedTransform = (el) => {
            const chain = [];
            let cur = el;
            while (cur && cur !== svg) {
                chain.unshift(parseTransform(cur));
                cur = cur.parentElement;
            }
            let tx = 0, ty = 0, sx = 1, sy = 1;
            chain.forEach(t => {
                tx = tx * t.sx + t.tx;
                ty = ty * t.sy + t.ty;
                sx *= t.sx; sy *= t.sy;
            });
            return { tx, ty, sx, sy };
        };

        // Find the nearest <g> ancestor (for grouping)
        const getNearestGroup = (el) => {
            let p = el.parentElement;
            while (p && p !== svg) {
                if (p.tagName === 'g') return p;
                p = p.parentElement;
            }
            return null;
        };

        // Helper: resolve fill/stroke from element + computed style
        const resolveFill = (el) => {
            let fill = el.getAttribute('fill');
            if (!fill) {
                const style = el.getAttribute('style') || '';
                const m = style.match(/fill:\s*([^;]+)/);
                if (m) fill = m[1].trim();
            }
            return (!fill || fill === 'none') ? '#4a90d9' : fill;
        };
        const resolveStroke = (el) => {
            let stroke = el.getAttribute('stroke');
            if (!stroke) {
                const style = el.getAttribute('style') || '';
                const m = style.match(/stroke:\s*([^;]+)/);
                if (m) stroke = m[1].trim();
            }
            return (!stroke || stroke === 'none') ? '#000' : stroke;
        };
        const resolveStrokeWidth = (el) => {
            let sw = el.getAttribute('stroke-width');
            if (!sw) {
                const style = el.getAttribute('style') || '';
                const m = style.match(/stroke-width:\s*([^;]+)/);
                if (m) sw = m[1].trim();
            }
            return parseFloat(sw) || 0;
        };

        // Apply transform + viewBox mapping to a point
        const mapPoint = (px, py, t) => {
            const x = ((px * t.sx + t.tx) - vbX) * scaleFit;
            const y = ((py * t.sy + t.ty) - vbY) * scaleFit;
            return { x, y };
        };

        // --- Process path elements ---
        svg.querySelectorAll('path').forEach(pathEl => {
            const d = pathEl.getAttribute('d');
            if (!d) return;
            const points = this._parseSVGPathToPoints(d);
            if (points.length < 2) return;
            const t = getAccumulatedTransform(pathEl);

            const mapped = points.map(p => mapPoint(p.x, p.y, t));
            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            mapped.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
            const w = maxX - minX || 10;
            const h = maxY - minY || 10;

            const offX = stageW / 2 - (vbW * scaleFit) / 2;
            const offY = stageH / 2 - (vbH * scaleFit) / 2;
            const adjusted = mapped.map(p => ({ x: p.x + offX, y: p.y + offY }));

            const obj = new StageObject('freeform', {
                x: minX + offX, y: minY + offY, width: w, height: h,
                fill: resolveFill(pathEl),
                stroke: resolveStroke(pathEl),
                strokeWidth: resolveStrokeWidth(pathEl) * scaleFit,
                pathPoints: adjusted
            });
            this.objects.addObject(obj);
            allCreated.push(obj);

            const g = getNearestGroup(pathEl);
            if (g) {
                if (!groupMap.has(g)) groupMap.set(g, []);
                groupMap.get(g).push(obj.id);
            }
        });

        // --- Process rect elements ---
        svg.querySelectorAll('rect').forEach(el => {
            const t = getAccumulatedTransform(el);
            const rx = parseFloat(el.getAttribute('x') || 0);
            const ry = parseFloat(el.getAttribute('y') || 0);
            const w = parseFloat(el.getAttribute('width') || 100) * t.sx * scaleFit;
            const h = parseFloat(el.getAttribute('height') || 100) * t.sy * scaleFit;
            const { x: mx, y: my } = mapPoint(rx, ry, t);
            const offX = stageW / 2 - (vbW * scaleFit) / 2;
            const offY = stageH / 2 - (vbH * scaleFit) / 2;

            const obj = new StageObject('rectangle', {
                x: mx + offX, y: my + offY, width: w, height: h,
                fill: resolveFill(el),
                borderRadius: parseFloat(el.getAttribute('rx') || 0) * scaleFit
            });
            this.objects.addObject(obj);
            allCreated.push(obj);

            const g = getNearestGroup(el);
            if (g) {
                if (!groupMap.has(g)) groupMap.set(g, []);
                groupMap.get(g).push(obj.id);
            }
        });

        // --- Process circle / ellipse elements ---
        svg.querySelectorAll('circle, ellipse').forEach(el => {
            const t = getAccumulatedTransform(el);
            const ecx = parseFloat(el.getAttribute('cx') || 0);
            const ecy = parseFloat(el.getAttribute('cy') || 0);
            const erx = parseFloat(el.getAttribute('rx') || el.getAttribute('r') || 50) * t.sx * scaleFit;
            const ery = parseFloat(el.getAttribute('ry') || el.getAttribute('r') || 50) * t.sy * scaleFit;
            const { x: mx, y: my } = mapPoint(ecx - (erx / (t.sx * scaleFit)), ecy - (ery / (t.sy * scaleFit)), t);
            const offX = stageW / 2 - (vbW * scaleFit) / 2;
            const offY = stageH / 2 - (vbH * scaleFit) / 2;

            const obj = new StageObject('circle', {
                x: mx + offX, y: my + offY, width: erx * 2, height: ery * 2,
                fill: resolveFill(el)
            });
            this.objects.addObject(obj);
            allCreated.push(obj);

            const g = getNearestGroup(el);
            if (g) {
                if (!groupMap.has(g)) groupMap.set(g, []);
                groupMap.get(g).push(obj.id);
            }
        });

        // --- Process line elements ---
        svg.querySelectorAll('line').forEach(el => {
            const t = getAccumulatedTransform(el);
            const x1 = parseFloat(el.getAttribute('x1') || 0);
            const y1 = parseFloat(el.getAttribute('y1') || 0);
            const x2 = parseFloat(el.getAttribute('x2') || 0);
            const y2 = parseFloat(el.getAttribute('y2') || 0);
            const offX = stageW / 2 - (vbW * scaleFit) / 2;
            const offY = stageH / 2 - (vbH * scaleFit) / 2;
            const p1 = mapPoint(x1, y1, t);
            const p2 = mapPoint(x2, y2, t);

            const obj = new StageObject('freeform', {
                x: Math.min(p1.x, p2.x) + offX,
                y: Math.min(p1.y, p2.y) + offY,
                width: Math.abs(p2.x - p1.x) || 2,
                height: Math.abs(p2.y - p1.y) || 2,
                fill: 'none',
                stroke: resolveStroke(el),
                strokeWidth: (resolveStrokeWidth(el) || 1) * scaleFit,
                pathPoints: [
                    { x: p1.x + offX, y: p1.y + offY },
                    { x: p2.x + offX, y: p2.y + offY }
                ]
            });
            this.objects.addObject(obj);
            allCreated.push(obj);

            const g = getNearestGroup(el);
            if (g) {
                if (!groupMap.has(g)) groupMap.set(g, []);
                groupMap.get(g).push(obj.id);
            }
        });

        // --- Process polyline / polygon elements ---
        svg.querySelectorAll('polyline, polygon').forEach(el => {
            const t = getAccumulatedTransform(el);
            const pointsStr = el.getAttribute('points') || '';
            const nums = pointsStr.trim().split(/[\s,]+/).map(Number);
            if (nums.length < 4) return;
            const offX = stageW / 2 - (vbW * scaleFit) / 2;
            const offY = stageH / 2 - (vbH * scaleFit) / 2;
            const pts = [];
            for (let i = 0; i < nums.length - 1; i += 2) {
                const mp = mapPoint(nums[i], nums[i + 1], t);
                pts.push({ x: mp.x + offX, y: mp.y + offY });
            }
            if (el.tagName === 'polygon' && pts.length > 0) pts.push({ ...pts[0] });

            let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
            pts.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });

            const obj = new StageObject('freeform', {
                x: minX, y: minY, width: (maxX - minX) || 10, height: (maxY - minY) || 10,
                fill: resolveFill(el),
                stroke: resolveStroke(el),
                strokeWidth: resolveStrokeWidth(el) * scaleFit,
                pathPoints: pts
            });
            this.objects.addObject(obj);
            allCreated.push(obj);

            const g = getNearestGroup(el);
            if (g) {
                if (!groupMap.has(g)) groupMap.set(g, []);
                groupMap.get(g).push(obj.id);
            }
        });

        // --- Auto-group shapes that came from SVG <g> groups ---
        let groupCount = 0;
        groupMap.forEach((memberIds, gEl) => {
            if (memberIds.length < 2) return;
            const groupId = Utils.generateId('grp');
            this.objects._groupCounter++;
            const gLabel = gEl.getAttribute('id') || gEl.getAttribute('inkscape:label') || `SVG Group ${this.objects._groupCounter}`;
            this.objects.groups[groupId] = [...memberIds];
            this.objects.groupNames[groupId] = gLabel;
            memberIds.forEach(id => {
                const obj = this.objects.getObjectById(id);
                if (obj) obj.groupId = groupId;
            });
            groupCount++;
        });

        const total = allCreated.length;
        if (total > 0) {
            const msg = groupCount > 0
                ? `Imported ${total} shape(s) in ${groupCount} group(s) — right-click to ungroup`
                : `Imported ${total} shape(s) from SVG`;
            Utils.showToast(msg, 'success');
            this.objects.updateObjectList();
            this.objects.stage.requestRender();
        } else {
            Utils.showToast('No shapes found in file', 'warning');
        }
    }

    _parseSVGPathToPoints(d) {
        const points = [];
        const segs = d.match(/[MmLlHhVvCcSsZz][^MmLlHhVvCcSsZz]*/g) || [];
        let cx = 0, cy = 0;
        segs.forEach(seg => {
            const cmd = seg[0];
            const nums = seg.slice(1).trim().split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
            switch (cmd) {
                case 'M': cx = nums[0]; cy = nums[1]; points.push({ x: cx, y: cy }); break;
                case 'm': cx += nums[0]; cy += nums[1]; points.push({ x: cx, y: cy }); break;
                case 'L': for (let i = 0; i < nums.length; i += 2) { cx = nums[i]; cy = nums[i+1]; points.push({ x: cx, y: cy }); } break;
                case 'l': for (let i = 0; i < nums.length; i += 2) { cx += nums[i]; cy += nums[i+1]; points.push({ x: cx, y: cy }); } break;
                case 'H': cx = nums[0]; points.push({ x: cx, y: cy }); break;
                case 'h': cx += nums[0]; points.push({ x: cx, y: cy }); break;
                case 'V': cy = nums[0]; points.push({ x: cx, y: cy }); break;
                case 'v': cy += nums[0]; points.push({ x: cx, y: cy }); break;
                case 'C':
                    for (let i = 0; i < nums.length; i += 6) {
                        // Sample 3 points along the cubic bezier for approximation
                        const x1 = nums[i], y1 = nums[i+1], x2 = nums[i+2], y2 = nums[i+3], x3 = nums[i+4], y3 = nums[i+5];
                        for (let t = 0.33; t <= 1; t += 0.33) {
                            const mt = 1 - t;
                            const px = mt*mt*mt*cx + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
                            const py = mt*mt*mt*cy + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
                            points.push({ x: px, y: py });
                        }
                        cx = x3; cy = y3;
                    }
                    break;
                case 'c':
                    for (let i = 0; i < nums.length; i += 6) {
                        const x1 = cx+nums[i], y1 = cy+nums[i+1], x2 = cx+nums[i+2], y2 = cy+nums[i+3], x3 = cx+nums[i+4], y3 = cy+nums[i+5];
                        for (let t = 0.33; t <= 1; t += 0.33) {
                            const mt = 1 - t;
                            const px = mt*mt*mt*cx + 3*mt*mt*t*x1 + 3*mt*t*t*x2 + t*t*t*x3;
                            const py = mt*mt*mt*cy + 3*mt*mt*t*y1 + 3*mt*t*t*y2 + t*t*t*y3;
                            points.push({ x: px, y: py });
                        }
                        cx = x3; cy = y3;
                    }
                    break;
                case 'S': case 's':
                    for (let i = 0; i < nums.length; i += 4) {
                        if (cmd === 'S') { cx = nums[i+2]; cy = nums[i+3]; }
                        else { cx += nums[i+2]; cy += nums[i+3]; }
                        points.push({ x: cx, y: cy });
                    }
                    break;
                case 'Z': case 'z':
                    if (points.length > 0) points.push({ ...points[0] });
                    break;
            }
        });
        return points;
    }

    // === Easing Mini Preview ===
    setupEasingPreview() {
        const select = document.getElementById('param-easing');
        if (!select) return;

        // Create mini preview canvas next to dropdown
        const canvas = document.createElement('canvas');
        canvas.className = 'easing-mini-preview';
        canvas.width = 80;
        canvas.height = 48;
        select.parentElement?.appendChild(canvas);

        const drawPreview = () => {
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, 80, 48);
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 1;
            ctx.strokeRect(0, 0, 80, 48);

            const easing = select.value;
            const fn = Utils.easings[easing] || Utils.easings.linear;

            ctx.beginPath();
            ctx.strokeStyle = '#6366f1';
            ctx.lineWidth = 2;
            for (let i = 0; i <= 40; i++) {
                const t = i / 40;
                const v = typeof fn === 'function' ? fn(t) : t;
                const x = 4 + t * 72;
                const y = 44 - v * 40;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        };

        select.addEventListener('change', drawPreview);
        drawPreview();
    }

    // === Collapsible Panel Sections ===
    setupCollapsibleSections() {
        // Selectors for all section headers in left and right panels
        const selectors = [
            '#tab-tools > .tool-group > h4',
            '#properties-editor > .prop-section > h4',
            '.anim-subtab-content .anim-category > h4',
            '#applied-animations > h4',
            '#tab-tags > .tag-section > h4',
            '#tab-code > .code-section > h4'
        ];

        // Skip headers that have their own panel logic.
        const skipClasses = ['icon-lib-toggle', 'emoji-lib-toggle', 'anim-parts-toggle', 'prop-lib-toggle'];

        // Section headings that should never be collapsible
        const skipTexts = ['selection'];

        document.querySelectorAll(selectors.join(', ')).forEach(h4 => {
            if (skipClasses.some(cls => h4.classList.contains(cls))) return;

            const parent = h4.parentElement;
            if (!parent) return;

            // Build a unique key from the section text
            const key = (h4.textContent || '').trim().replace(/\s+/g, '-').toLowerCase();
            if (!key) return;

            // Skip sections that should never collapse
            if (skipTexts.includes(key)) return;

            // All left/right panel sections should start collapsed on every app load.
            h4.classList.add('section-toggle');
            const arrow = document.createElement('i');
            arrow.className = 'fas fa-chevron-down section-arrow';
            h4.appendChild(arrow);

            // Wrap all siblings after h4 in a .section-body container
            const body = document.createElement('div');
            body.className = 'section-body collapsed';
            const siblings = [];
            let next = h4.nextElementSibling;
            while (next) {
                siblings.push(next);
                next = next.nextElementSibling;
            }
            // Only wrap if there's content after the h4
            if (siblings.length === 0) return;
            parent.insertBefore(body, siblings[0]);
            siblings.forEach(s => body.appendChild(s));

            // Click handler
            h4.addEventListener('click', () => {
                const isOpen = h4.classList.contains('open');
                if (isOpen) {
                    h4.classList.remove('open');
                    body.classList.add('collapsed');
                } else {
                    h4.classList.add('open');
                    body.classList.remove('collapsed');
                }
            });
        });
    }
}

// === Launch Application ===
const app = new App();
window.app = app; // expose globally for cross-module access (focus, etc.)

// Handle return from Stripe hosted checkout (?purchase=success|cancel)
(function handlePurchaseReturn() {
    try {
        const params = new URLSearchParams(window.location.search);
        const purchase = params.get('purchase');
        if (!purchase) return;
        const notify = () => {
            if (purchase === 'success') {
                Utils.showToast('Payment received — your AI credits have been added.', 'success');
            } else if (purchase === 'cancel') {
                Utils.showToast('Checkout cancelled. No charge was made.', 'info');
            }
        };
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            notify();
        } else {
            window.addEventListener('DOMContentLoaded', notify, { once: true });
        }
        params.delete('purchase');
        const clean = window.location.pathname + (params.toString() ? '?' + params.toString() : '') + window.location.hash;
        window.history.replaceState({}, document.title, clean);
    } catch (_) { /* no-op */ }
})();

// === Global Tooltip System ===
(function initTooltips() {
    const DELAY = 2000; // 2 seconds hover delay
    let timer = null;
    let tooltipEl = null;
    let activeBtn = null;

    function create() {
        tooltipEl = document.createElement('div');
        tooltipEl.className = 'app-tooltip';
        document.body.appendChild(tooltipEl);
    }

    function getTooltipText(el) {
        // data-tooltip takes priority, then title, then aria-label, then inner text
        return el.getAttribute('data-tooltip')
            || el.getAttribute('data-original-title')
            || el.getAttribute('aria-label')
            || el.textContent.trim()
            || null;
    }

    function show(btn, e) {
        if (!tooltipEl) create();
        const text = getTooltipText(btn);
        if (!text || text.length < 1) return;

        tooltipEl.textContent = text;
        tooltipEl.classList.add('visible');

        // Position near the cursor / button
        const rect = btn.getBoundingClientRect();
        const tipW = tooltipEl.offsetWidth;
        const tipH = tooltipEl.offsetHeight;

        let left = rect.left + rect.width / 2 - tipW / 2;
        let top = rect.bottom + 6;

        // Keep within viewport
        if (left < 4) left = 4;
        if (left + tipW > window.innerWidth - 4) left = window.innerWidth - tipW - 4;
        if (top + tipH > window.innerHeight - 4) {
            top = rect.top - tipH - 6; // flip above
        }

        tooltipEl.style.left = left + 'px';
        tooltipEl.style.top = top + 'px';
    }

    function hide() {
        clearTimeout(timer);
        timer = null;
        if (tooltipEl) tooltipEl.classList.remove('visible');
        activeBtn = null;
    }

    // Use event delegation — works for static and dynamic buttons
    document.addEventListener('pointerenter', (e) => {
        if (!e.target || !e.target.closest) return;
        const btn = e.target.closest('button, .tool-btn, .cvbar-btn, .anim-btn, .layout-option, .pivot-btn, [data-tooltip]');
        if (!btn) return;

        // Move native title to data-original-title so the browser tooltip doesn't also appear
        if (btn.hasAttribute('title')) {
            btn.setAttribute('data-original-title', btn.getAttribute('title'));
            btn.removeAttribute('title');
        }

        activeBtn = btn;
        clearTimeout(timer);
        timer = setTimeout(() => {
            if (activeBtn === btn) show(btn, e);
        }, DELAY);
    }, true);

    document.addEventListener('pointerleave', (e) => {
        if (!e.target || !e.target.closest) { hide(); return; }
        const btn = e.target.closest('button, .tool-btn, .cvbar-btn, .anim-btn, .layout-option, .pivot-btn, [data-tooltip]');
        if (btn) {
            // Restore title for accessibility
            if (btn.hasAttribute('data-original-title')) {
                btn.setAttribute('title', btn.getAttribute('data-original-title'));
                btn.removeAttribute('data-original-title');
            }
            hide();
        }
    }, true);

    // Hide on click/scroll/key
    document.addEventListener('pointerdown', hide, true);
    document.addEventListener('scroll', hide, true);
    document.addEventListener('keydown', hide, true);
})();
