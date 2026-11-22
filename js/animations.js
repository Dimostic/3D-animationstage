/* ============================================
   Animation Stage - Animation System
   Pre-built animations, custom animations, playback
   ============================================ */

class AnimationEngine {
    constructor(stageManager, objectManager) {
        this.stage = stageManager;
        this.objects = objectManager;
        this.runningAnimations = [];
        this.isPlaying = false;
        this.isPaused = false;
        this.startTime = 0;
        this.currentTime = 0;
        this.totalDuration = 5000; // 5 seconds default
        this.minDuration = 5000; // user-adjustable minimum timeline duration
        this.playbackSpeed = 1;
        this.looping = false;
        this.autoReturn = false; // auto-return playhead after last animation
        this.selectedAnimType = null;
        this.selectedAppliedAnimId = null;

        // Re-apply mode state
        this._reapplyAnimId = null;
        this._reapplyObjId = null;
        this._conflictPending = null;
        this._skipConflictCheck = false;

        // Trigger system: tracks when non-onLoad animations are activated
        // Key = anim.id, Value = timestamp (ms) when triggered
        this._triggeredAnims = {};
        this._hoveredObjId = null; // currently hovered object during playback
        this._interactivePreview = false; // true when in interactive preview mode

        // Click-to-set-destination state
        this.isPickingDestination = false;
        this.destinationTarget = null;    // { x, y } stage coords
        this.destinationSourceObj = null; // source object for visual line
        this.isPickingPelletPath = false;
        this.isPickingEffectOrigin = false;

        // Code panel scope state
        this._codeScopeMode = 'auto'; // auto | object | character | selection
        this._codeScopeAnchorId = null;

        // Play loop generation — incremented on every new playAll() start so any
        // stale in-flight RAF callbacks from a previous run recognise they are
        // outdated and exit without touching state.
        this._playGeneration = 0;
        
        // Code run safety lock: prevents rapid successive test/apply runs
        this._codeRunLocked = false;
        this._lastCodeRunUnlockTime = 0;
        
        // Pre-built animation definitions
        this.library = this.buildAnimationLibrary();
        
        this.init();
    }

    init() {
        this.bindEvents();
        this.bindCodePanel();
        this.bindTimingInputButtons();
        this.updateTimingReferenceOptions();
        eventBus.on('stage:render-overlay', (ctx) => this.renderEffectOverlays(ctx));
    }

    buildAnimationLibrary() {
        return {
            // Movement
            'linear-move': {
                name: 'Linear Move',
                category: 'movement',
                params: { distance: 200, direction: 'right', duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    return this.generateMovementProps(obj, params);
                }
            },
            'move-to-point': {
                name: 'Move To Point',
                category: 'movement',
                params: { targetX: 0, targetY: 0, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const tx = Number.isFinite(parseFloat(params.targetX)) ? parseFloat(params.targetX) : obj.x;
                    const ty = Number.isFinite(parseFloat(params.targetY)) ? parseFloat(params.targetY) : obj.y;
                    const dur = (params.duration || 1) * 1000;
                    const easing = params.easing || 'easeInOut';
                    return [
                        { property: 'x', from: obj.x, to: tx, duration: dur, easing },
                        { property: 'y', from: obj.y, to: ty, duration: dur, easing }
                    ];
                }
            },
            'bounce': {
                name: 'Bounce',
                category: 'movement',
                params: { distance: 150, direction: 'up', scale: 1.12, duration: 1, easing: 'bounce' },
                generate: (obj, params) => {
                    const moveProps = this.generateMovementProps(obj, params, { easing: 'bounce' });
                    const props = Array.isArray(moveProps) ? moveProps : [moveProps];
                    const squash = Math.max(1, parseFloat(params.scale) || 1.12);
                    props.push(
                        { property: 'scaleX', from: obj.scaleX || 1, to: (obj.scaleX || 1) * squash, duration: params.duration * 450, easing: 'easeOut', pingpong: true },
                        { property: 'scaleY', from: obj.scaleY || 1, to: (obj.scaleY || 1) / squash, duration: params.duration * 450, easing: 'easeOut', pingpong: true }
                    );
                    return props;
                }
            },
            'bounce-solid': {
                name: 'Bounce Off Solid',
                category: 'movement',
                params: { solidSurfaceId: '', bounceHeight: 160, bounceCompression: 1.18, direction: 'down', duration: 1, easing: 'bounce' },
                generate: (obj, params) => {
                    const surface = params.solidSurfaceId ? this.objects.getObjectById(params.solidSurfaceId) : null;
                    const objH = Math.max(1, obj.height || 1);
                    const impactY = surface
                        ? (surface.y - objH)
                        : ((this.stage?.height || 720) - objH);
                    const height = Math.max(1, parseFloat(params.bounceHeight) || 160);
                    const compression = Math.max(1, parseFloat(params.bounceCompression) || 1.18);
                    const startY = Math.min(obj.y, impactY - height);
                    const dur = Math.max(0.05, parseFloat(params.duration) || 1) * 1000;
                    return [
                        { property: 'y', from: startY, to: impactY, duration: dur, easing: 'bounce', pingpong: true },
                        { property: 'scaleX', from: obj.scaleX || 1, to: (obj.scaleX || 1) * compression, duration: dur * 0.34, easing: 'easeOut', pingpong: true },
                        { property: 'scaleY', from: obj.scaleY || 1, to: (obj.scaleY || 1) / compression, duration: dur * 0.34, easing: 'easeOut', pingpong: true }
                    ];
                }
            },
            'jump': {
                name: 'Jump',
                category: 'movement',
                params: { direction: 'up', distance: 120, scale: 1.16, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'up';
                    const dist = Math.max(1, parseFloat(params.distance) || 120);
                    const dur = Math.max(0.05, parseFloat(params.duration) || 0.8) * 1000;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.16);
                    const props = [
                        { property: 'y', from: obj.y, to: obj.y - dist, duration: dur * 0.5, easing: params.easing || 'easeOut', pingpong: true },
                        { property: 'scaleX', from: obj.scaleX || 1, to: (obj.scaleX || 1) * scale, duration: dur * 0.28, easing: 'easeOut', pingpong: true },
                        { property: 'scaleY', from: obj.scaleY || 1, to: (obj.scaleY || 1) / scale, duration: dur * 0.28, easing: 'easeOut', pingpong: true }
                    ];
                    if (dir.includes('left') || dir === 'left') {
                        props.push({ property: 'x', from: obj.x, to: obj.x - dist, duration: dur, easing: 'easeInOut' });
                    } else if (dir.includes('right') || dir === 'right') {
                        props.push({ property: 'x', from: obj.x, to: obj.x + dist, duration: dur, easing: 'easeInOut' });
                    }
                    return props;
                }
            },
            'pendulum': {
                name: 'Pendulum',
                category: 'movement',
                params: { distance: 100, direction: 'right', duration: 2, easing: 'easeInOut' },
                generate: (obj, params) => {
                    if (this.isDiagonal(params.direction)) {
                        const d = params.distance / 2;
                        const cos = Math.cos(Math.PI / 4);
                        const sin = Math.sin(Math.PI / 4);
                        const signX = params.direction.includes('right') ? 1 : -1;
                        const signY = params.direction.includes('up') ? -1 : 1;
                        return [
                            { property: 'x', from: obj.x - d * cos * signX, to: obj.x + d * cos * signX, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true },
                            { property: 'y', from: obj.y - d * sin * signY, to: obj.y + d * sin * signY, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true }
                        ];
                    }
                    const prop = this.getDirectionProperty(params.direction);
                    return {
                        property: prop,
                        from: obj[prop] - params.distance / 2,
                        to: obj[prop] + params.distance / 2,
                        duration: params.duration * 1000,
                        easing: 'easeInOut',
                        pingpong: true
                    };
                }
            },
            'follow-path': {
                name: 'Follow Path',
                category: 'movement',
                params: { duration: 3, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'path',
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'shoot-pellets': {
                name: 'Shoot Pellets',
                category: 'effects',
                params: {
                    direction: 'right',
                    distance: 360,
                    pelletCount: 16,
                    pelletSize: 8,
                    pelletShape: 'circle',
                    shotMode: 'stream',
                    pelletColor: '#f59e0b',
                    pelletPathMode: 'straight',
                    pelletPathShape: '',
                    pelletPathShapeId: '',
                    pelletPathStart: 0,
                    pelletPathEnd: 100,
                    pelletPathReverse: false,
                    frequency: 12,
                    trailLength: 1,
                    shotRandomness: 0,
                    shotGravity: 0,
                    pelletFade: true,
                    spread: 0,
                    duration: 1.5,
                    easing: 'linear'
                },
                generate: (obj, params) => ({
                    type: 'shoot-pellets',
                    duration: (params.duration || 1.5) * 1000,
                    easing: params.easing || 'linear',
                    direction: params.direction || 'right',
                    distance: Math.max(0, parseFloat(params.distance) || 360),
                    pelletCount: Math.max(1, Math.round(parseFloat(params.pelletCount) || 16)),
                    pelletSize: Math.max(1, parseFloat(params.pelletSize) || 8),
                    pelletShape: params.pelletShape || 'circle',
                    shotMode: params.shotMode || 'stream',
                    frequency: Math.max(1, parseFloat(params.frequency) || 12),
                    trailLength: Math.max(0, parseFloat(params.trailLength) || 0),
                    randomness: Math.max(0, Math.min(100, parseFloat(params.shotRandomness) || 0)),
                    gravity: Number.isFinite(parseFloat(params.shotGravity)) ? parseFloat(params.shotGravity) : 0,
                    fade: params.pelletFade !== false,
                    spread: Math.max(0, parseFloat(params.spread) || 0),
                    color: params.pelletColor || obj.stroke || obj.fill || '#f59e0b',
                    pathMode: params.pelletPathMode || 'straight',
                    pathShapeId: params.pelletPathShapeId || '',
                    pathPoints: this._resolvePelletPathPoints(params),
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2
                })
            },
            'break-apart': {
                name: 'Break Apart',
                category: 'effects',
                params: { fragmentCount: 16, fragmentMode: 'equal', fragmentShape: 'slice', breakDirection: 'radial', scatter: 180, fragmentStagger: 0, fragmentSpin: 1, fragmentGravity: 0, fragmentFade: false, spread: 80, originalMode: 'hide', duration: 1.5, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'break-apart',
                    duration: (params.duration || 1.5) * 1000,
                    easing: params.easing || 'easeOut',
                    fragmentCount: Math.max(4, Math.round(parseFloat(params.fragmentCount) || 16)),
                    fragmentMode: params.fragmentMode || 'equal',
                    fragmentShape: params.fragmentShape || 'slice',
                    breakDirection: params.breakDirection || 'radial',
                    scatter: Math.max(0, parseFloat(params.scatter) || 180),
                    fragmentStagger: Math.max(0, Math.min(0.9, parseFloat(params.fragmentStagger) || 0)),
                    fragmentSpin: Math.max(0, parseFloat(params.fragmentSpin) || 0),
                    fragmentGravity: Number.isFinite(parseFloat(params.fragmentGravity)) ? parseFloat(params.fragmentGravity) : 0,
                    fragmentFade: params.fragmentFade === true,
                    spread: Math.max(0, parseFloat(params.spread) || 80),
                    originalMode: params.originalMode || 'hide',
                    seed: this._hashString(`${obj.id}:${obj.type}:${obj.x}:${obj.y}:${obj.width}:${obj.height}`),
                    originalOpacity: obj.opacity ?? 1
                })
            },
            'ripple-wave': {
                name: 'Ripple Wave',
                category: 'effects',
                params: { rippleRings: 3, rippleRadius: 160, rippleWidth: 4, rippleColor: '#38bdf8', rippleFill: false, rippleFade: true, duration: 1.4, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'ripple-wave',
                    duration: (params.duration || 1.4) * 1000,
                    easing: params.easing || 'easeOut',
                    rings: Math.max(1, Math.min(12, Math.round(parseFloat(params.rippleRings) || 3))),
                    radius: Math.max(1, parseFloat(params.rippleRadius) || 160),
                    width: Math.max(1, parseFloat(params.rippleWidth) || 4),
                    color: params.rippleColor || obj.stroke || obj.fill || '#38bdf8',
                    fill: params.rippleFill === true,
                    fade: params.rippleFade !== false,
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    baseRadius: Math.max(8, Math.hypot(obj.width || 0, obj.height || 0) / 2)
                })
            },
            'sparkle-burst': {
                name: 'Sparkle Burst',
                category: 'effects',
                params: { sparkleCount: 18, sparkleRadius: 140, sparkleSize: 10, sparkleShape: 'star', sparkleColor: '#facc15', sparkleSpin: 1, sparkleFade: true, duration: 1.2, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'sparkle-burst',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeOut',
                    count: Math.max(1, Math.min(200, Math.round(parseFloat(params.sparkleCount) || 18))),
                    radius: Math.max(1, parseFloat(params.sparkleRadius) || 140),
                    size: Math.max(1, parseFloat(params.sparkleSize) || 10),
                    shape: params.sparkleShape || 'star',
                    color: params.sparkleColor || obj.stroke || obj.fill || '#facc15',
                    spin: Math.max(0, parseFloat(params.sparkleSpin) || 0),
                    fade: params.sparkleFade !== false,
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:sparkle:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'echo-trail': {
                name: 'Echo Trail',
                category: 'effects',
                params: { echoCount: 4, echoOffsetX: -18, echoOffsetY: 0, echoOpacity: 0.45, echoScaleStep: 0, echoFade: true, duration: 1.2, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'echo-trail',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeOut',
                    count: Math.max(1, Math.min(30, Math.round(parseFloat(params.echoCount) || 4))),
                    offsetX: Number.isFinite(parseFloat(params.echoOffsetX)) ? parseFloat(params.echoOffsetX) : -18,
                    offsetY: Number.isFinite(parseFloat(params.echoOffsetY)) ? parseFloat(params.echoOffsetY) : 0,
                    opacity: Math.max(0, Math.min(1, parseFloat(params.echoOpacity) || 0.45)),
                    scaleStep: Number.isFinite(parseFloat(params.echoScaleStep)) ? parseFloat(params.echoScaleStep) : 0,
                    fade: params.echoFade !== false
                })
            },
            'glow-aura': {
                name: 'Glow Aura',
                category: 'effects',
                params: { glowColor: '#38bdf8', glowBlur: 28, glowOpacity: 0.75, glowPulse: 0.35, glowScale: 1.04, duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'glow-aura',
                    duration: (params.duration || 1.4) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.glowColor || obj.stroke || obj.fill || '#38bdf8',
                    blur: Math.max(1, parseFloat(params.glowBlur) || 28),
                    opacity: Math.max(0, Math.min(1, parseFloat(params.glowOpacity) || 0.75)),
                    pulse: Math.max(0, Math.min(1, parseFloat(params.glowPulse) || 0.35)),
                    scale: Math.max(0.1, parseFloat(params.glowScale) || 1.04)
                })
            },
            'focus-pulse': {
                name: 'Focus Pulse',
                category: 'effects',
                params: { focusColor: '#f97316', focusRadius: 80, focusRings: 2, focusWidth: 4, focusDim: false, focusDimOpacity: 0.35, duration: 1.4, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'focus-pulse',
                    duration: (params.duration || 1.4) * 1000,
                    easing: params.easing || 'easeOut',
                    color: params.focusColor || '#f97316',
                    radius: Math.max(1, parseFloat(params.focusRadius) || Math.max(40, Math.hypot(obj.width || 0, obj.height || 0) / 2)),
                    rings: Math.max(1, Math.min(8, Math.round(parseFloat(params.focusRings) || 2))),
                    width: Math.max(1, parseFloat(params.focusWidth) || 4),
                    dim: params.focusDim === true,
                    dimOpacity: Math.max(0, Math.min(0.9, parseFloat(params.focusDimOpacity) || 0.35)),
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2
                })
            },
            'confetti-burst': {
                name: 'Confetti Burst',
                category: 'effects',
                params: { confettiCount: 50, confettiSpread: 220, confettiFall: 240, confettiSize: 8, confettiSpin: 2, confettiPalette: 'party', duration: 1.8, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'confetti-burst',
                    duration: (params.duration || 1.8) * 1000,
                    easing: params.easing || 'easeOut',
                    count: Math.max(1, Math.min(400, Math.round(parseFloat(params.confettiCount) || 50))),
                    spread: Math.max(1, parseFloat(params.confettiSpread) || 220),
                    fall: Number.isFinite(parseFloat(params.confettiFall)) ? parseFloat(params.confettiFall) : 240,
                    size: Math.max(1, parseFloat(params.confettiSize) || 8),
                    spin: Math.max(0, parseFloat(params.confettiSpin) || 0),
                    palette: params.confettiPalette || 'party',
                    baseColor: obj.fill || obj.stroke || '#38bdf8',
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:confetti:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'orbit-swarm': {
                name: 'Orbit Swarm',
                category: 'effects',
                params: { orbitCount: 8, orbitRadius: 90, orbitSize: 7, orbitColor: '#a78bfa', orbitSpeed: 1.5, orbitTrail: true, duration: 1.8, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'orbit-swarm',
                    duration: (params.duration || 1.8) * 1000,
                    easing: params.easing || 'linear',
                    count: Math.max(1, Math.min(80, Math.round(parseFloat(params.orbitCount) || 8))),
                    radius: Math.max(1, parseFloat(params.orbitRadius) || 90),
                    size: Math.max(1, parseFloat(params.orbitSize) || 7),
                    color: params.orbitColor || obj.stroke || obj.fill || '#a78bfa',
                    speed: Number.isFinite(parseFloat(params.orbitSpeed)) ? parseFloat(params.orbitSpeed) : 1.5,
                    trail: params.orbitTrail !== false,
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:orbit:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'smoke-puff': {
                name: 'Smoke Puff',
                category: 'effects',
                params: { smokeCount: 18, smokeSpread: 90, smokeSize: 28, smokeDriftY: -70, smokeColor: '#94a3b8', smokeOpacity: 0.45, duration: 1.6, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'smoke-puff',
                    duration: (params.duration || 1.6) * 1000,
                    easing: params.easing || 'easeOut',
                    count: Math.max(1, Math.min(160, Math.round(parseFloat(params.smokeCount) || 18))),
                    spread: Math.max(1, parseFloat(params.smokeSpread) || 90),
                    size: Math.max(1, parseFloat(params.smokeSize) || 28),
                    driftY: Number.isFinite(parseFloat(params.smokeDriftY)) ? parseFloat(params.smokeDriftY) : -70,
                    color: params.smokeColor || '#94a3b8',
                    opacity: Math.max(0, Math.min(1, parseFloat(params.smokeOpacity) || 0.45)),
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:smoke:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'lightning-arc': {
                name: 'Lightning Arc',
                category: 'effects',
                params: { lightningCount: 5, lightningLength: 140, lightningJaggedness: 26, lightningWidth: 3, lightningColor: '#60a5fa', lightningDirection: 'radial', lightningGlow: true, duration: 0.9, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'lightning-arc',
                    duration: (params.duration || 0.9) * 1000,
                    easing: params.easing || 'linear',
                    count: Math.max(1, Math.min(80, Math.round(parseFloat(params.lightningCount) || 5))),
                    length: Math.max(1, parseFloat(params.lightningLength) || 140),
                    jaggedness: Math.max(0, parseFloat(params.lightningJaggedness) || 26),
                    width: Math.max(1, parseFloat(params.lightningWidth) || 3),
                    color: params.lightningColor || obj.stroke || obj.fill || '#60a5fa',
                    direction: params.lightningDirection || 'radial',
                    glow: params.lightningGlow !== false,
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:lightning:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'magnet-pull': {
                name: 'Magnet Pull',
                category: 'effects',
                params: { magnetCount: 28, magnetRadius: 180, magnetSize: 6, magnetColor: '#22c55e', magnetMode: 'pull', magnetTrail: true, duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'magnet-pull',
                    duration: (params.duration || 1.4) * 1000,
                    easing: params.easing || 'easeInOut',
                    count: Math.max(1, Math.min(240, Math.round(parseFloat(params.magnetCount) || 28))),
                    radius: Math.max(1, parseFloat(params.magnetRadius) || 180),
                    size: Math.max(1, parseFloat(params.magnetSize) || 6),
                    color: params.magnetColor || obj.stroke || obj.fill || '#22c55e',
                    mode: params.magnetMode || 'pull',
                    trail: params.magnetTrail !== false,
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:magnet:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'scan-beam': {
                name: 'Scan Beam',
                category: 'effects',
                params: { scanColor: '#22d3ee', scanWidth: 28, scanOpacity: 0.65, scanDirection: 'left-right', scanGlow: true, duration: 1.3, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'scan-beam',
                    duration: (params.duration || 1.3) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.scanColor || obj.stroke || obj.fill || '#22d3ee',
                    width: Math.max(1, parseFloat(params.scanWidth) || 28),
                    opacity: Math.max(0, Math.min(1, parseFloat(params.scanOpacity) || 0.65)),
                    direction: params.scanDirection || 'left-right',
                    glow: params.scanGlow !== false,
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1)
                })
            },
            'lens-flare': {
                name: 'Lens Flare',
                category: 'effects',
                params: { flareColor: '#fef3c7', flareIntensity: 0.75, flareLength: 180, flareCount: 4, flareAngle: 0, duration: 1.2, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'lens-flare',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeOut',
                    color: params.flareColor || obj.stroke || obj.fill || '#fef3c7',
                    intensity: Math.max(0, Math.min(1, parseFloat(params.flareIntensity) || 0.75)),
                    length: Math.max(1, parseFloat(params.flareLength) || 180),
                    count: Math.max(0, Math.min(20, Math.round(parseFloat(params.flareCount) || 4))),
                    angle: ((parseFloat(params.flareAngle) || 0) * Math.PI) / 180,
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:flare:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'pixel-burst': {
                name: 'Pixel Burst',
                category: 'effects',
                params: { pixelCount: 42, pixelSpread: 150, pixelSize: 8, pixelColorMode: 'object', pixelColor: '#38bdf8', pixelFade: true, duration: 1.1, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'pixel-burst',
                    duration: (params.duration || 1.1) * 1000,
                    easing: params.easing || 'easeOut',
                    count: Math.max(1, Math.min(400, Math.round(parseFloat(params.pixelCount) || 42))),
                    spread: Math.max(1, parseFloat(params.pixelSpread) || 150),
                    size: Math.max(1, parseFloat(params.pixelSize) || 8),
                    colorMode: params.pixelColorMode || 'object',
                    color: params.pixelColor || obj.fill || obj.stroke || '#38bdf8',
                    objectColor: obj.fill || obj.stroke || '#38bdf8',
                    fade: params.pixelFade !== false,
                    originX: obj.x + (obj.width || 0) / 2,
                    originY: obj.y + (obj.height || 0) / 2,
                    seed: this._hashString(`${obj.id}:pixels:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'impact-burst': {
                name: 'Impact Burst',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, impactRings: 2, impactRadius: 180, impactSpikes: 14, impactWidth: 5, impactColor: '#f97316', duration: 0.9, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'impact-burst',
                        duration: (params.duration || 0.9) * 1000,
                        easing: params.easing || 'easeOut',
                        rings: Math.max(1, Math.min(12, Math.round(parseFloat(params.impactRings) || 2))),
                        radius: Math.max(1, parseFloat(params.impactRadius) || 180),
                        spikes: Math.max(0, Math.min(120, Math.round(parseFloat(params.impactSpikes) || 14))),
                        width: Math.max(1, parseFloat(params.impactWidth) || 5),
                        color: params.impactColor || obj.stroke || obj.fill || '#f97316',
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:impact:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'wave-distort': {
                name: 'Wave Distort',
                category: 'effects',
                params: { waveAmplitude: 18, waveFrequency: 3, waveSlices: 28, waveDirection: 'horizontal', duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'wave-distort',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    amplitude: Math.max(0, parseFloat(params.waveAmplitude) || 18),
                    frequency: Math.max(0.1, parseFloat(params.waveFrequency) || 3),
                    slices: Math.max(4, Math.min(160, Math.round(parseFloat(params.waveSlices) || 28))),
                    direction: params.waveDirection || 'horizontal'
                })
            },
            // NOTE: 'flag-wave' removed — it rendered via the same 'wave-distort' type with
            // only param-preset differences. Users can achieve the same visual by adjusting
            // 'wave-distort' amplitude/frequency.
            'liquid-motion': {
                name: 'Liquid',
                category: 'effects',
                params: { effectPreset: 'custom', effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, liquidMode: 'splash', liquidPreset: 'water', liquidColor: '#38bdf8', liquidCount: 34, liquidSize: 9, liquidSpread: 180, liquidGravity: 160, liquidDirection: 'down', duration: 1.4, easing: 'easeOut' },
                generate: (obj, params) => {
                    const presets = {
                        'water-splash': { liquidMode: 'splash', liquidPreset: 'water', liquidColor: '#38bdf8', liquidCount: 46, liquidSize: 8, liquidSpread: 220, liquidGravity: 190, liquidDirection: 'radial' },
                        'blood-splatter': { liquidMode: 'splash', liquidPreset: 'blood', liquidColor: '#b91c1c', liquidCount: 64, liquidSize: 7, liquidSpread: 250, liquidGravity: 90, liquidDirection: 'radial' },
                        'paint-pour': { liquidMode: 'flow', liquidPreset: 'paint', liquidColor: '#f59e0b', liquidCount: 42, liquidSize: 12, liquidSpread: 190, liquidGravity: 260, liquidDirection: 'down' },
                        'slime-drip': { liquidMode: 'drip', liquidPreset: 'slime', liquidColor: '#65a30d', liquidCount: 30, liquidSize: 13, liquidSpread: 115, liquidGravity: 320, liquidDirection: 'down' }
                    };
                    if (presets[params.effectPreset]) params = { ...params, ...presets[params.effectPreset] };
                    const presetColors = { water: '#38bdf8', blood: '#b91c1c', paint: '#f59e0b', slime: '#65a30d' };
                    const preset = params.liquidPreset || 'water';
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'liquid-motion',
                        duration: (params.duration || 1.4) * 1000,
                        easing: params.easing || 'easeOut',
                        mode: params.liquidMode || 'splash',
                        preset,
                        color: params.liquidColor || presetColors[preset] || '#38bdf8',
                        count: Math.max(1, Math.min(300, Math.round(parseFloat(params.liquidCount) || 34))),
                        size: Math.max(1, parseFloat(params.liquidSize) || 9),
                        spread: Math.max(1, parseFloat(params.liquidSpread) || 180),
                        gravity: parseFloat(params.liquidGravity) || 0,
                        direction: params.liquidDirection || 'down',
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:liquid:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'melt-drip': {
                name: 'Melt',
                category: 'effects',
                params: { effectPreset: 'custom', meltAmount: 90, meltDrips: 12, meltSlices: 24, meltColor: '#ef4444', duration: 1.5, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const presets = {
                        'wax-melt': { meltAmount: 95, meltDrips: 16, meltSlices: 28, meltColor: '#f59e0b' },
                        'ice-melt': { meltAmount: 70, meltDrips: 22, meltSlices: 30, meltColor: '#67e8f9' },
                        'toxic-melt': { meltAmount: 125, meltDrips: 18, meltSlices: 26, meltColor: '#84cc16' }
                    };
                    if (presets[params.effectPreset]) params = { ...params, ...presets[params.effectPreset] };
                    return {
                        type: 'melt-drip',
                        duration: (params.duration || 1.5) * 1000,
                        easing: params.easing || 'easeInOut',
                        amount: Math.max(1, parseFloat(params.meltAmount) || 90),
                        drips: Math.max(0, Math.min(80, Math.round(parseFloat(params.meltDrips) || 12))),
                        slices: Math.max(4, Math.min(120, Math.round(parseFloat(params.meltSlices) || 24))),
                        color: params.meltColor || obj.fill || obj.stroke || '#ef4444',
                        seed: this._hashString(`${obj.id}:melt:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'brush-reveal': {
                name: 'Brush Reveal',
                category: 'effects',
                params: { effectPreset: 'custom', revealDirection: 'left-right', revealBrushSize: 54, revealTexture: 0.45, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const presets = {
                        'soft-brush': { revealBrushSize: 80, revealTexture: 0.2 },
                        'rough-paint': { revealBrushSize: 54, revealTexture: 0.75 },
                        'dry-brush': { revealBrushSize: 34, revealTexture: 1 }
                    };
                    if (presets[params.effectPreset]) params = { ...params, ...presets[params.effectPreset] };
                    return {
                        type: 'brush-reveal',
                        duration: (params.duration || 1.2) * 1000,
                        easing: params.easing || 'easeInOut',
                        direction: params.revealDirection || 'left-right',
                        brushSize: Math.max(4, parseFloat(params.revealBrushSize) || 54),
                        texture: Math.max(0, Math.min(1, parseFloat(params.revealTexture) || 0.45)),
                        seed: this._hashString(`${obj.id}:reveal:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'paint-reveal': {
                name: 'Paint Reveal',
                category: 'effects',
                params: { effectPreset: 'custom', revealDirection: 'left-right', revealBrushSize: 58, revealTexture: 0.55, duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const presets = {
                        'soft-brush': { revealBrushSize: 86, revealTexture: 0.25 },
                        'rough-paint': { revealBrushSize: 58, revealTexture: 0.75 },
                        'dry-brush': { revealBrushSize: 36, revealTexture: 1 }
                    };
                    if (presets[params.effectPreset]) params = { ...params, ...presets[params.effectPreset] };
                    return {
                        type: 'paint-reveal',
                        duration: (params.duration || 1.4) * 1000,
                        easing: params.easing || 'easeInOut',
                        direction: params.revealDirection || 'left-right',
                        brushSize: Math.max(4, parseFloat(params.revealBrushSize) || 58),
                        texture: Math.max(0, Math.min(1, parseFloat(params.revealTexture) || 0.55)),
                        seed: this._hashString(`${obj.id}:paint-reveal:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'swirl-tornado': {
                name: 'Swirl Tornado',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, swirlCount: 22, swirlRadius: 130, swirlTurns: 2.5, swirlColor: '#38bdf8', duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'swirl-tornado',
                        duration: (params.duration || 1.4) * 1000,
                        easing: params.easing || 'easeInOut',
                        count: Math.max(3, Math.min(140, Math.round(parseFloat(params.swirlCount) || 22))),
                        radius: Math.max(1, parseFloat(params.swirlRadius) || 130),
                        turns: Math.max(0.1, parseFloat(params.swirlTurns) || 2.5),
                        color: params.swirlColor || obj.stroke || obj.fill || '#38bdf8',
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:swirl:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'fire-flicker': {
                name: 'Fire Flicker',
                category: 'effects',
                params: { effectOrigin: 'bottom', effectOriginX: 0, effectOriginY: 0, flameCount: 28, flameHeight: 90, flameColor: '#f97316', duration: 1.1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'fire-flicker',
                        duration: (params.duration || 1.1) * 1000,
                        easing: params.easing || 'easeInOut',
                        count: Math.max(1, Math.min(180, Math.round(parseFloat(params.flameCount) || 28))),
                        height: Math.max(1, parseFloat(params.flameHeight) || 90),
                        color: params.flameColor || '#f97316',
                        width: Math.max(20, (obj.width || 80) * 0.8),
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:fire:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'dust-away': {
                name: 'Dust Away',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, dustCount: 80, dustSpread: 210, dustSize: 5, dustColor: '#cbd5e1', duration: 1.4, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'dust-away',
                        duration: (params.duration || 1.4) * 1000,
                        easing: params.easing || 'easeOut',
                        count: Math.max(1, Math.min(500, Math.round(parseFloat(params.dustCount) || 80))),
                        spread: Math.max(1, parseFloat(params.dustSpread) || 210),
                        size: Math.max(1, parseFloat(params.dustSize) || 5),
                        color: params.dustColor || obj.fill || obj.stroke || '#cbd5e1',
                        objectColor: obj.fill || obj.stroke || '#cbd5e1',
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:dust:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'freeze-crack': {
                name: 'Freeze Crack',
                category: 'effects',
                params: { freezeCracks: 9, freezeTint: '#93c5fd', freezeOpacity: 0.55, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'freeze-crack',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    cracks: Math.max(0, Math.min(80, Math.round(parseFloat(params.freezeCracks) || 9))),
                    tint: params.freezeTint || '#93c5fd',
                    opacity: Math.max(0, Math.min(1, parseFloat(params.freezeOpacity) || 0.55)),
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1),
                    seed: this._hashString(`${obj.id}:freeze:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'neon-trace': {
                name: 'Neon Trace',
                category: 'effects',
                params: { neonColor: '#22d3ee', neonWidth: 5, neonGlow: 18, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'neon-trace',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.neonColor || obj.stroke || obj.fill || '#22d3ee',
                    width: Math.max(1, parseFloat(params.neonWidth) || 5),
                    glow: Math.max(0, parseFloat(params.neonGlow) || 18),
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1),
                    seed: this._hashString(`${obj.id}:neon:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'shadow-pop': {
                name: 'Shadow Pop',
                category: 'effects',
                params: { shadowColor: '#0f172a', shadowOffset: 26, shadowBlur: 18, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'shadow-pop',
                    duration: (params.duration || 0.8) * 1000,
                    easing: params.easing || 'easeOut',
                    color: params.shadowColor || '#0f172a',
                    offset: Math.max(0, parseFloat(params.shadowOffset) || 26),
                    blur: Math.max(0, parseFloat(params.shadowBlur) || 18)
                })
            },
            'explosion-smoke': {
                name: 'Explosion Smoke',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, explosionCount: 24, explosionRadius: 180, explosionSmokeSize: 34, explosionColor: '#64748b', duration: 1.2, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'explosion-smoke',
                        duration: (params.duration || 1.2) * 1000,
                        easing: params.easing || 'easeOut',
                        count: Math.max(1, Math.min(240, Math.round(parseFloat(params.explosionCount) || 24))),
                        radius: Math.max(1, parseFloat(params.explosionRadius) || 180),
                        size: Math.max(1, parseFloat(params.explosionSmokeSize) || 34),
                        color: params.explosionColor || '#64748b',
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:explosion:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'paint-stroke': {
                name: 'Paint Stroke',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, paintColor: '#ec4899', paintWidth: 18, paintLength: 220, paintSplatter: 18, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'paint-stroke',
                        duration: (params.duration || 1) * 1000,
                        easing: params.easing || 'easeInOut',
                        color: params.paintColor || obj.fill || '#ec4899',
                        width: Math.max(1, parseFloat(params.paintWidth) || 18),
                        length: Math.max(1, parseFloat(params.paintLength) || 220),
                        splatter: Math.max(0, Math.min(240, Math.round(parseFloat(params.paintSplatter) || 18))),
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:paint:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                    };
                }
            },
            'chromatic-glitch': {
                name: 'Chromatic Glitch',
                category: 'effects',
                params: { glitchIntensity: 18, glitchSlices: 12, glitchColorShift: 10, duration: 0.7, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'chromatic-glitch',
                    duration: (params.duration || 0.7) * 1000,
                    easing: params.easing || 'easeInOut',
                    intensity: Math.max(1, parseFloat(params.glitchIntensity) || 18),
                    slices: Math.max(1, Math.min(120, Math.round(parseFloat(params.glitchSlices) || 12))),
                    colorShift: Math.max(0, parseFloat(params.glitchColorShift) || 10),
                    seed: this._hashString(`${obj.id}:glitch:${obj.x}:${obj.y}:${obj.width}:${obj.height}`)
                })
            },
            'shockwave-ring': {
                name: 'Shockwave Ring',
                category: 'effects',
                params: { effectPreset: 'custom', effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, shockwaveRings: 3, shockwaveRadius: 220, shockwaveColor: '#38bdf8', duration: 1, easing: 'easeOut' },
                generate: (obj, params) => {
                    params = this._applyEffectPreset('shockwave-ring', params);
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'shockwave-ring',
                        duration: (params.duration || 1) * 1000,
                        easing: params.easing || 'easeOut',
                        rings: Math.max(1, Math.min(40, Math.round(parseFloat(params.shockwaveRings) || 3))),
                        radius: Math.max(1, parseFloat(params.shockwaveRadius) || 220),
                        color: params.shockwaveColor || '#38bdf8',
                        originX: origin.x,
                        originY: origin.y
                    };
                }
            },
            'magic-portal': {
                name: 'Magic Portal',
                category: 'effects',
                params: { effectPreset: 'custom', effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, portalColor: '#8b5cf6', portalRadius: 90, portalSpokes: 18, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => {
                    params = this._applyEffectPreset('magic-portal', params);
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'magic-portal',
                        duration: (params.duration || 1.2) * 1000,
                        easing: params.easing || 'easeInOut',
                        color: params.portalColor || '#8b5cf6',
                        radius: Math.max(1, parseFloat(params.portalRadius) || 90),
                        spokes: Math.max(3, Math.min(120, Math.round(parseFloat(params.portalSpokes) || 18))),
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:portal:${obj.x}:${obj.y}`)
                    };
                }
            },
            'glass-shatter': {
                name: 'Shatter Glass',
                category: 'effects',
                params: { effectPreset: 'custom', effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, shatterPieces: 24, shatterSpread: 180, shatterColor: '#bfdbfe', duration: 1, easing: 'easeOut' },
                generate: (obj, params) => {
                    params = this._applyEffectPreset('glass-shatter', params);
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'glass-shatter',
                        duration: (params.duration || 1) * 1000,
                        easing: params.easing || 'easeOut',
                        pieces: Math.max(3, Math.min(160, Math.round(parseFloat(params.shatterPieces) || 24))),
                        spread: Math.max(1, parseFloat(params.shatterSpread) || 180),
                        color: params.shatterColor || '#bfdbfe',
                        x: obj.x,
                        y: obj.y,
                        w: Math.max(1, obj.width || 1),
                        h: Math.max(1, obj.height || 1),
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:shatter:${obj.x}:${obj.y}`)
                    };
                }
            },
            'electric-charge': {
                name: 'Electric Charge',
                category: 'effects',
                params: { effectPreset: 'custom', effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, chargeBolts: 10, chargeRadius: 120, chargeColor: '#60a5fa', duration: 0.9, easing: 'easeInOut' },
                generate: (obj, params) => {
                    params = this._applyEffectPreset('electric-charge', params);
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'electric-charge',
                        duration: (params.duration || 0.9) * 1000,
                        easing: params.easing || 'easeInOut',
                        bolts: Math.max(1, Math.min(100, Math.round(parseFloat(params.chargeBolts) || 10))),
                        radius: Math.max(1, parseFloat(params.chargeRadius) || 120),
                        color: params.chargeColor || '#60a5fa',
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:charge:${obj.x}:${obj.y}`)
                    };
                }
            },
            'ink-bleed': {
                name: 'Ink Bleed',
                category: 'effects',
                params: { effectPreset: 'custom', effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, inkColor: '#111827', inkSpread: 120, inkDrops: 28, duration: 1.4, easing: 'easeOut' },
                generate: (obj, params) => {
                    params = this._applyEffectPreset('ink-bleed', params);
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'ink-bleed',
                        duration: (params.duration || 1.4) * 1000,
                        easing: params.easing || 'easeOut',
                        color: params.inkColor || '#111827',
                        spread: Math.max(1, parseFloat(params.inkSpread) || 120),
                        drops: Math.max(1, Math.min(240, Math.round(parseFloat(params.inkDrops) || 28))),
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:ink:${obj.x}:${obj.y}`)
                    };
                }
            },
            'motion-smear': {
                name: 'Motion Smear',
                category: 'effects',
                params: { direction: 'right', smearDistance: 90, smearCopies: 6, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'motion-smear',
                    duration: (params.duration || 0.8) * 1000,
                    easing: params.easing || 'easeOut',
                    direction: params.direction || 'right',
                    distance: Math.max(1, parseFloat(params.smearDistance) || 90),
                    copies: Math.max(1, Math.min(40, Math.round(parseFloat(params.smearCopies) || 6)))
                })
            },
            'stage-shake': {
                name: 'Stage Shake',
                category: 'effects',
                params: { shakeAmount: 16, shakeFrequency: 18, duration: 0.6, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'stage-shake',
                    duration: (params.duration || 0.6) * 1000,
                    easing: params.easing || 'easeInOut',
                    amount: Math.max(1, parseFloat(params.shakeAmount) || 16),
                    frequency: Math.max(1, parseFloat(params.shakeFrequency) || 18),
                    seed: this._hashString(`${obj.id}:shake:${obj.x}:${obj.y}`)
                })
            },
            'camera-zoom': {
                name: 'Camera Zoom',
                category: 'effects',
                params: { scale: 1.35, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const zoom = Math.max(0.1, parseFloat(params.scale) || 1.35);
                    const duration = (params.duration || 1) * 1000;
                    return [
                        { property: 'scaleX', from: sx, to: sx * zoom, duration, easing: params.easing || 'easeInOut' },
                        { property: 'scaleY', from: sy, to: sy * zoom, duration, easing: params.easing || 'easeInOut' }
                    ];
                }
            },
            'mask-reveal': {
                name: 'Mask Reveal',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, maskShape: 'circle', maskFeather: 10, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'mask-reveal',
                        duration: (params.duration || 1) * 1000,
                        easing: params.easing || 'easeInOut',
                        shape: params.maskShape || 'circle',
                        feather: Math.max(0, parseFloat(params.maskFeather) || 0),
                        x: obj.x,
                        y: obj.y,
                        w: Math.max(1, obj.width || 1),
                        h: Math.max(1, obj.height || 1),
                        originX: origin.x,
                        originY: origin.y
                    };
                }
            },
            'path-trail': {
                name: 'Path Trail',
                category: 'effects',
                params: { direction: 'right', trailColor: '#38bdf8', pathTrailLength: 120, trailWidth: 16, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'path-trail',
                    duration: (params.duration || 1) * 1000,
                    easing: params.easing || 'easeOut',
                    direction: params.direction || 'right',
                    color: params.trailColor || '#38bdf8',
                    length: Math.max(1, parseFloat(params.pathTrailLength) || 120),
                    width: Math.max(1, parseFloat(params.trailWidth) || 16)
                })
            },
            'particle-fountain': {
                name: 'Particle Fountain',
                category: 'effects',
                params: { effectOrigin: 'bottom', effectOriginX: 0, effectOriginY: 0, fountainCount: 42, fountainSpread: 150, fountainColor: '#facc15', duration: 1.3, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'particle-fountain',
                        duration: (params.duration || 1.3) * 1000,
                        easing: params.easing || 'easeOut',
                        count: Math.max(1, Math.min(400, Math.round(parseFloat(params.fountainCount) || 42))),
                        spread: Math.max(1, parseFloat(params.fountainSpread) || 150),
                        color: params.fountainColor || '#facc15',
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:fountain:${obj.x}:${obj.y}`)
                    };
                }
            },
            'light-sweep': {
                name: 'Light Sweep',
                category: 'effects',
                params: { sweepColor: '#ffffff', sweepWidth: 70, sweepAngle: -18, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'light-sweep',
                    duration: (params.duration || 1) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.sweepColor || '#ffffff',
                    width: Math.max(1, parseFloat(params.sweepWidth) || 70),
                    angle: ((parseFloat(params.sweepAngle) || 0) * Math.PI) / 180,
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1)
                })
            },
            'weather-effect': {
                name: 'Weather',
                category: 'effects',
                params: { weatherType: 'rain', weatherCount: 80, weatherColor: '#bfdbfe', weatherWind: 40, duration: 1.6, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'weather-effect',
                    duration: (params.duration || 1.6) * 1000,
                    easing: params.easing || 'linear',
                    weather: params.weatherType || 'rain',
                    count: Math.max(1, Math.min(600, Math.round(parseFloat(params.weatherCount) || 80))),
                    color: params.weatherColor || '#bfdbfe',
                    wind: parseFloat(params.weatherWind) || 0,
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    seed: this._hashString(`${obj.id}:weather:${obj.x}:${obj.y}`)
                })
            },
            'bubble-rise': {
                name: 'Bubble Rise',
                category: 'effects',
                params: { effectOrigin: 'bottom', effectOriginX: 0, effectOriginY: 0, bubbleCount: 34, bubbleSize: 18, bubbleColor: '#7dd3fc', bubbleSpread: 120, duration: 1.4, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'bubble-rise',
                        duration: (params.duration || 1.4) * 1000,
                        easing: params.easing || 'easeOut',
                        count: Math.max(1, Math.min(300, Math.round(parseFloat(params.bubbleCount) || 34))),
                        size: Math.max(1, parseFloat(params.bubbleSize) || 18),
                        color: params.bubbleColor || '#7dd3fc',
                        spread: Math.max(1, parseFloat(params.bubbleSpread) || 120),
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:bubbles:${obj.x}:${obj.y}`)
                    };
                }
            },
            'meteor-shower': {
                name: 'Meteor Shower',
                category: 'effects',
                params: { meteorCount: 18, meteorColor: '#fde68a', meteorAngle: 28, meteorLength: 130, duration: 1.2, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'meteor-shower',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'linear',
                    count: Math.max(1, Math.min(200, Math.round(parseFloat(params.meteorCount) || 18))),
                    color: params.meteorColor || '#fde68a',
                    angle: ((parseFloat(params.meteorAngle) || 28) * Math.PI) / 180,
                    length: Math.max(1, parseFloat(params.meteorLength) || 130),
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    seed: this._hashString(`${obj.id}:meteor:${obj.x}:${obj.y}`)
                })
            },
            'spotlight-sweep': {
                name: 'Spotlight Sweep',
                category: 'effects',
                params: { spotlightColor: '#fde68a', spotlightRadius: 180, spotlightDim: 0.28, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'spotlight-sweep',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.spotlightColor || '#fde68a',
                    radius: Math.max(1, parseFloat(params.spotlightRadius) || 180),
                    dim: Math.max(0, Math.min(1, parseFloat(params.spotlightDim) || 0.28)),
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1),
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720
                })
            },
            'radial-rays': {
                name: 'Radial Rays',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, rayCount: 18, rayLength: 220, rayColor: '#facc15', duration: 1, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'radial-rays',
                        duration: (params.duration || 1) * 1000,
                        easing: params.easing || 'easeOut',
                        count: Math.max(1, Math.min(160, Math.round(parseFloat(params.rayCount) || 18))),
                        length: Math.max(1, parseFloat(params.rayLength) || 220),
                        color: params.rayColor || '#facc15',
                        originX: origin.x,
                        originY: origin.y
                    };
                }
            },
            'outline-pulse': {
                name: 'Outline Pulse',
                category: 'effects',
                params: { outlinePulseColor: '#38bdf8', outlinePulseWidth: 4, outlinePulseRings: 3, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'outline-pulse',
                    duration: (params.duration || 1) * 1000,
                    easing: params.easing || 'easeOut',
                    color: params.outlinePulseColor || '#38bdf8',
                    width: Math.max(1, parseFloat(params.outlinePulseWidth) || 4),
                    rings: Math.max(1, Math.min(12, Math.round(parseFloat(params.outlinePulseRings) || 3))),
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1)
                })
            },
            'speed-lines': {
                name: 'Speed Lines',
                category: 'effects',
                params: { speedLineCount: 36, speedLineLength: 160, speedLineColor: '#ffffff', speedLineDirection: 'right', duration: 0.8, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'speed-lines',
                    duration: (params.duration || 0.8) * 1000,
                    easing: params.easing || 'linear',
                    count: Math.max(1, Math.min(300, Math.round(parseFloat(params.speedLineCount) || 36))),
                    length: Math.max(1, parseFloat(params.speedLineLength) || 160),
                    color: params.speedLineColor || '#ffffff',
                    direction: params.speedLineDirection || 'right',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    seed: this._hashString(`${obj.id}:speed:${obj.x}:${obj.y}`)
                })
            },
            'starfield-warp': {
                name: 'Starfield Warp',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, starCount: 90, starColor: '#dbeafe', starSpread: 520, duration: 1.1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'starfield-warp',
                        duration: (params.duration || 1.1) * 1000,
                        easing: params.easing || 'easeInOut',
                        count: Math.max(1, Math.min(600, Math.round(parseFloat(params.starCount) || 90))),
                        color: params.starColor || '#dbeafe',
                        spread: Math.max(1, parseFloat(params.starSpread) || 520),
                        originX: origin.x,
                        originY: origin.y,
                        seed: this._hashString(`${obj.id}:starfield:${obj.x}:${obj.y}`)
                    };
                }
            },
            'color-wash': {
                name: 'Color Wash',
                category: 'effects',
                params: { washColor: '#38bdf8', washOpacity: 0.35, washDirection: 'right', duration: 0.9, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'color-wash',
                    duration: (params.duration || 0.9) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.washColor || '#38bdf8',
                    opacity: Math.max(0, Math.min(1, parseFloat(params.washOpacity) || 0.35)),
                    direction: params.washDirection || 'right',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720
                })
            },
            'halo-burst': {
                name: 'Halo Burst',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, haloColor: '#facc15', haloRadius: 190, haloRings: 4, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'halo-burst',
                        duration: (params.duration || 1) * 1000,
                        easing: params.easing || 'easeOut',
                        color: params.haloColor || '#facc15',
                        radius: Math.max(1, parseFloat(params.haloRadius) || 190),
                        rings: Math.max(1, Math.min(16, Math.round(parseFloat(params.haloRings) || 4))),
                        originX: origin.x,
                        originY: origin.y
                    };
                }
            },
            'shadow-cast': {
                name: 'Shadow Cast',
                category: 'effects',
                params: { shadowCastColor: '#020617', shadowCastLength: 90, shadowCastAngle: 35, shadowCastOpacity: 0.35, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'shadow-cast',
                    duration: (params.duration || 1) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.shadowCastColor || '#020617',
                    length: Math.max(1, parseFloat(params.shadowCastLength) || 90),
                    angle: ((parseFloat(params.shadowCastAngle) || 35) * Math.PI) / 180,
                    opacity: Math.max(0, Math.min(1, parseFloat(params.shadowCastOpacity) || 0.35))
                })
            },
            'energy-shield': {
                name: 'Energy Shield',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, shieldColor: '#22d3ee', shieldRadius: 95, shieldBands: 4, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'energy-shield',
                        duration: (params.duration || 1) * 1000,
                        easing: params.easing || 'easeInOut',
                        color: params.shieldColor || '#22d3ee',
                        radius: Math.max(1, parseFloat(params.shieldRadius) || 95),
                        bands: Math.max(1, Math.min(18, Math.round(parseFloat(params.shieldBands) || 4))),
                        originX: origin.x,
                        originY: origin.y
                    };
                }
            },
            'magnify-lens': {
                name: 'Magnify Lens',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, lensRadius: 90, lensZoom: 1.35, lensColor: '#bfdbfe', duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'magnify-lens',
                        duration: (params.duration || 1.2) * 1000,
                        easing: params.easing || 'easeInOut',
                        radius: Math.max(1, parseFloat(params.lensRadius) || 90),
                        zoom: Math.max(1, parseFloat(params.lensZoom) || 1.35),
                        color: params.lensColor || '#bfdbfe',
                        originX: origin.x,
                        originY: origin.y
                    };
                }
            },
            'rainbow-arc': {
                name: 'Rainbow Arc',
                category: 'effects',
                params: { effectOrigin: 'center', effectOriginX: 0, effectOriginY: 0, rainbowRadius: 180, rainbowWidth: 10, rainbowBands: 6, duration: 1.1, easing: 'easeOut' },
                generate: (obj, params) => {
                    const origin = this._resolveEffectOrigin(obj, params);
                    return {
                        type: 'rainbow-arc',
                        duration: (params.duration || 1.1) * 1000,
                        easing: params.easing || 'easeOut',
                        radius: Math.max(1, parseFloat(params.rainbowRadius) || 180),
                        width: Math.max(1, parseFloat(params.rainbowWidth) || 10),
                        bands: Math.max(2, Math.min(12, Math.round(parseFloat(params.rainbowBands) || 6))),
                        originX: origin.x,
                        originY: origin.y
                    };
                }
            },
            'vignette-pulse': {
                name: 'Vignette Pulse',
                category: 'effects',
                params: { vignetteColor: '#020617', vignetteStrength: 0.55, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'vignette-pulse',
                    duration: (params.duration || 1) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: params.vignetteColor || '#020617',
                    strength: Math.max(0, Math.min(1, parseFloat(params.vignetteStrength) || 0.55)),
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720
                })
            },
            'scan-grid': {
                name: 'Scan Grid',
                category: 'effects',
                params: { gridColor: '#22d3ee', gridSize: 36, gridOpacity: 0.35, duration: 1.2, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'scan-grid',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'linear',
                    color: params.gridColor || '#22d3ee',
                    size: Math.max(4, parseFloat(params.gridSize) || 36),
                    opacity: Math.max(0, Math.min(1, parseFloat(params.gridOpacity) || 0.35)),
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720
                })
            },
            'draw-trace': {
                name: 'Draw Trace',
                category: 'effects',
                worksWith: ['any'],
                params: {
                    drawColor: '#38bdf8', drawUseCustom: false, drawWidth: 4,
                    drawGlow: 0, drawStart: 'top', drawClockwise: true, drawTailFade: 0, drawShowPen: true,
                    duration: 1.8, easing: 'easeInOut', afterPlayback: 'keep'
                },
                generate: (obj, params) => ({
                    type: 'draw-trace',
                    duration: (params.duration || 1.8) * 1000,
                    easing: params.easing || 'easeInOut',
                    color: this._getDrawTraceColor(obj, params),
                    drawUseCustom: !!params.drawUseCustom,
                    width: Math.max(1, Math.min(80, parseFloat(params.drawWidth || obj.strokeWidth) || 4)),
                    glow: Math.max(0, Math.min(60, parseFloat(params.drawGlow) || 0)),
                    start: String(params.drawStart || 'top'),
                    clockwise: params.drawClockwise !== false,
                    tailFade: Math.max(0, Math.min(1, parseFloat(params.drawTailFade) || 0)),
                    showPen: params.drawShowPen !== false,
                    x: obj.x || 0,
                    y: obj.y || 0,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1),
                    rotation: obj.rotation || 0,
                    objectType: obj.type || 'rectangle',
                    sides: obj.sides || 5,
                    pathPoints: Array.isArray(obj.pathPoints) ? obj.pathPoints.map(p => ({ x: p.x, y: p.y })) : null,
                    text: obj.text || '',
                    textColor: obj.textColor || obj.fill || obj.color || '',
                    textStrokeColor: obj.textStrokeColor || obj.stroke || '',
                    textStrokeWidth: Number(obj.textStrokeWidth) || 0,
                    fontSize: obj.fontSize || 24,
                    fontFamily: obj.fontFamily || 'Arial',
                    fontWeight: obj.fontWeight || 'normal',
                    fontStyle: obj.fontStyle || 'normal',
                    textAlign: obj.textAlign || 'center',
                    textVerticalAlign: obj.textVerticalAlign || 'middle',
                    lineHeight: obj.lineHeight || 1.4,
                    textTransform: obj.textTransform || 'none',
                    iconPath: obj.iconPath || null,
                    iconViewBox: obj.iconViewBox || '0 0 100 100',
                    fill: obj.fill || obj.color || '',
                    stroke: obj.stroke || '',
                    strokeWidth: Number(obj.strokeWidth) || 0,
                    effectObjectMode: 'hide',
                    afterPlayback: 'keep'
                })
            },
            'spawn-copies': {
                name: 'Spawn',
                category: 'effects',
                params: {
                    spawnCount: 1,
                    spawnOffsetX: 40,
                    spawnOffsetY: 40,
                    spawnLayout: 'offset',
                    spawnScaleStep: 0,
                    spawnRotationStep: 0,
                    spawnColorVariation: 0,
                    spawnAvoidOverlap: false,
                    spawnSpacing: 12,
                    spawnClearOriginal: false,
                    spawnIncludeAnimations: false,
                    spawnAsGroup: false,
                    duration: 0.1,
                    easing: 'linear'
                },
                generate: () => ({
                    type: 'spawn-copies',
                    duration: 100
                })
            },

            // === DATA / NUMERIC EFFECTS (Phase 1) ===
            // counter-roll & percent-tick draw a number overlay centered on the
            // object's bounding box. Works with any object type (text, rectangle,
            // circle, etc.) since the renderer only uses the object's x/y/width/height
            // for positioning — the object stays visible underneath the number.
            'counter-roll': {
                name: 'Counter Roll',
                category: 'effects',
                worksWith: ['text', 'any'],
                params: {
                    duration: 1.6,
                    easing: 'easeOut',
                    counterFrom: 0,
                    counterTo: 100,
                    counterPrefix: '',
                    counterSuffix: '',
                    counterDecimals: 0,
                    counterFontSize: 64,
                    counterColor: '#0f172a'
                },
                generate: (obj, params) => ({
                    type: 'counter-roll',
                    duration: (params.duration || 1.6) * 1000,
                    easing: params.easing || 'easeOut',
                    from: Number.isFinite(parseFloat(params.counterFrom)) ? parseFloat(params.counterFrom) : 0,
                    to: Number.isFinite(parseFloat(params.counterTo)) ? parseFloat(params.counterTo) : 100,
                    prefix: params.counterPrefix ?? '',
                    suffix: params.counterSuffix ?? '',
                    decimals: Math.max(0, Math.min(4, parseInt(params.counterDecimals) || 0)),
                    fontSize: Math.max(8, parseFloat(params.counterFontSize) || Math.max(18, Math.min(180, (obj.fontSize || obj.height || 64) * 0.9))),
                    fontFamily: obj.fontFamily || 'Inter, system-ui, sans-serif',
                    color: params.counterColor || obj.fill || obj.color || '#0f172a',
                    x: obj.x || 0,
                    y: obj.y || 0,
                    w: Math.max(1, obj.width || 200),
                    h: Math.max(1, obj.height || 64)
                })
            },
            'percent-tick': {
                name: 'Percent Tick',
                category: 'effects',
                worksWith: ['text', 'any'],
                params: {
                    duration: 1.6,
                    easing: 'easeOut',
                    counterFrom: 0,
                    counterTo: 100,
                    counterPrefix: '',
                    counterSuffix: '%',
                    counterDecimals: 0,
                    counterFontSize: 64,
                    counterColor: '#0f172a'
                },
                generate: (obj, params) => ({
                    type: 'counter-roll',
                    duration: (params.duration || 1.6) * 1000,
                    easing: params.easing || 'easeOut',
                    from: Number.isFinite(parseFloat(params.counterFrom)) ? parseFloat(params.counterFrom) : 0,
                    to: Number.isFinite(parseFloat(params.counterTo)) ? parseFloat(params.counterTo) : 100,
                    prefix: params.counterPrefix ?? '',
                    suffix: params.counterSuffix ?? '%',
                    decimals: Math.max(0, Math.min(4, parseInt(params.counterDecimals) || 0)),
                    fontSize: Math.max(8, parseFloat(params.counterFontSize) || Math.max(18, Math.min(180, (obj.fontSize || obj.height || 64) * 0.9))),
                    fontFamily: obj.fontFamily || 'Inter, system-ui, sans-serif',
                    color: params.counterColor || obj.fill || obj.color || '#0f172a',
                    x: obj.x || 0,
                    y: obj.y || 0,
                    w: Math.max(1, obj.width || 200),
                    h: Math.max(1, obj.height || 64)
                })
            },
            'progress-bar': {
                name: 'Progress Bar',
                category: 'effects',
                worksWith: ['rectangle', 'any'],
                params: { duration: 1.8, easing: 'easeInOut', progressDirection: 'left-right' },
                generate: (obj, params) => ({
                    type: 'progress-bar',
                    duration: (params.duration || 1.8) * 1000,
                    easing: params.easing || 'easeInOut',
                    direction: params.progressDirection || 'left-right',
                    x: obj.x || 0,
                    y: obj.y || 0,
                    w: Math.max(20, obj.width || 240),
                    h: Math.max(8, Math.min(80, (obj.height || 24))),
                    fillColor: obj.fill || obj.color || '#38bdf8',
                    bgColor: 'rgba(15,23,42,0.18)',
                    radius: Math.max(2, Math.min(20, (obj.height || 24) * 0.4)),
                    showLabel: true,
                    labelColor: '#0f172a'
                })
            },
            'bar-chart': {
                name: 'Bar Chart Grow',
                category: 'effects',
                worksWith: ['rectangle', 'circle', 'image', 'any'],
                params: {
                    duration: 1.4,
                    easing: 'easeOut',
                    barValues: '12, 34, 56, 78, 42',
                    barColor: '',
                    barGap: 0.18,
                    barStagger: 0.12
                },
                generate: (obj, params) => {
                    const seed = this._hashString(`${obj.id}:barchart`);
                    const raw = String(params.barValues ?? '').trim();
                    let nums = raw ? raw.split(',').map(s => parseFloat(s.trim())).filter(n => Number.isFinite(n)) : [];
                    if (!nums.length) {
                        nums = [];
                        for (let i = 0; i < 5; i++) {
                            nums.push(0.35 + this._seededRandom(seed + i * 53) * 0.65);
                        }
                    }
                    const max = Math.max.apply(null, nums.concat([0.0001]));
                    const heights = nums.map(v => Math.max(0, Math.min(1, v / max)));
                    const bars = heights.length;
                    return {
                        type: 'bar-chart',
                        duration: (params.duration || 1.4) * 1000,
                        easing: params.easing || 'easeOut',
                        x: obj.x || 0,
                        y: obj.y || 0,
                        w: Math.max(60, obj.width || 240),
                        h: Math.max(40, obj.height || 160),
                        bars,
                        heights,
                        color: params.barColor || obj.fill || obj.color || '#38bdf8',
                        gap: Math.max(0, Math.min(0.5, parseFloat(params.barGap) || 0.18)),
                        stagger: Math.max(0, Math.min(0.6, parseFloat(params.barStagger) || 0.12))
                    };
                }
            },

            // === REVEAL MASK EFFECTS (Phase 2) ===
            'iris-reveal': {
                name: 'Iris Reveal',
                category: 'effects',
                params: { duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'iris-reveal',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x || 0, y: obj.y || 0,
                    w: Math.max(1, obj.width || 200), h: Math.max(1, obj.height || 200),
                    color: '#0f172a'
                })
            },
            'clock-wipe': {
                name: 'Clock Wipe',
                category: 'effects',
                params: { duration: 1.4, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'clock-wipe',
                    duration: (params.duration || 1.4) * 1000,
                    easing: params.easing || 'linear',
                    x: obj.x || 0, y: obj.y || 0,
                    w: Math.max(1, obj.width || 200), h: Math.max(1, obj.height || 200),
                    color: '#0f172a',
                    clockwise: true
                })
            },
            'blinds-reveal': {
                name: 'Blinds',
                category: 'effects',
                params: { duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'blinds-reveal',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x || 0, y: obj.y || 0,
                    w: Math.max(1, obj.width || 200), h: Math.max(1, obj.height || 200),
                    slats: 6,
                    orientation: 'horizontal',
                    color: '#0f172a'
                })
            },
            'checker-reveal': {
                name: 'Checkerboard',
                category: 'effects',
                params: { duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'checker-reveal',
                    duration: (params.duration || 1.4) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x || 0, y: obj.y || 0,
                    w: Math.max(1, obj.width || 200), h: Math.max(1, obj.height || 200),
                    cols: 6,
                    rows: 4,
                    color: '#0f172a',
                    stagger: 0.5
                })
            },
            'diamond-wipe': {
                name: 'Diamond Wipe',
                category: 'effects',
                params: { duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'diamond-wipe',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x || 0, y: obj.y || 0,
                    w: Math.max(1, obj.width || 200), h: Math.max(1, obj.height || 200),
                    color: '#0f172a'
                })
            },

            // === CINEMATIC CAMERA EFFECTS (Phase 3) ===
            'dolly-zoom': {
                name: 'Dolly Zoom',
                category: 'effects',
                params: { scale: 1.4, duration: 1.6, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1, sy = obj.scaleY || 1;
                    const z = Math.max(0.2, parseFloat(params.scale) || 1.4);
                    const dur = (params.duration || 1.6) * 1000;
                    const ease = params.easing || 'easeInOut';
                    return [
                        { property: 'scaleX', from: sx, to: sx * z, duration: dur, easing: ease },
                        { property: 'scaleY', from: sy, to: sy * (z * 0.78), duration: dur, easing: ease },
                        { property: 'rotation', from: (obj.rotation || 0) - 2, to: (obj.rotation || 0) + 2, duration: dur, easing: 'easeInOut', pingpong: true }
                    ];
                }
            },
            'whip-pan': {
                name: 'Whip Pan',
                category: 'effects',
                worksWith: ['any'],
                params: { direction: 'right', duration: 0.7, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'whip-pan',
                    duration: (params.duration || 0.7) * 1000,
                    easing: params.easing || 'easeInOut',
                    direction: params.direction || 'right',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    color: '#0b1220',
                    lines: 40
                })
            },
            'handheld-sway': {
                name: 'Handheld Sway',
                category: 'effects',
                params: { amount: 6, duration: 3.5, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const a = Math.max(1, parseFloat(params.amount) || 6);
                    const dur = (params.duration || 3.5) * 1000;
                    const bx = obj.x || 0, by = obj.y || 0;
                    const br = obj.rotation || 0;
                    return [
                        { property: 'x', from: bx - a, to: bx + a, duration: dur * 1.0, easing: 'easeInOut', pingpong: true },
                        { property: 'y', from: by - a * 0.6, to: by + a * 0.6, duration: dur * 1.3, easing: 'easeInOut', pingpong: true },
                        { property: 'rotation', from: br - 0.7, to: br + 0.7, duration: dur * 1.6, easing: 'easeInOut', pingpong: true }
                    ];
                }
            },
            'rack-focus': {
                name: 'Rack Focus',
                category: 'effects',
                worksWith: ['any'],
                params: { duration: 1.8, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'rack-focus',
                    duration: (params.duration || 1.8) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x || 0, y: obj.y || 0,
                    w: Math.max(1, obj.width || 200), h: Math.max(1, obj.height || 200),
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    dim: 0.7,
                    feather: 140
                })
            },
            'letterbox-bars': {
                name: 'Letterbox',
                category: 'effects',
                worksWith: ['any'],
                params: { duration: 1.0, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'letterbox-bars',
                    duration: (params.duration || 1.0) * 1000,
                    easing: params.easing || 'easeOut',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    barRatio: 0.12,
                    color: '#000000'
                })
            },

            // === MOTION PATHS (Phase 4) ===
            'figure-eight': {
                name: 'Figure-8',
                category: 'movement',
                params: { distance: 120, turns: 1, duration: 4, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'parametric-path',
                    pathType: 'figure-eight',
                    radius: Math.max(10, parseFloat(params.distance) || 120),
                    turns: Number.isFinite(parseFloat(params.turns)) ? parseFloat(params.turns) : 1,
                    cx: obj.x, cy: obj.y,
                    duration: (params.duration || 4) * 1000,
                    easing: params.easing || 'linear'
                })
            },
            'spiral-path': {
                name: 'Spiral Path',
                category: 'movement',
                params: { distance: 160, turns: 3, duration: 3.5, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'parametric-path',
                    pathType: 'spiral',
                    radius: Math.max(10, parseFloat(params.distance) || 160),
                    turns: Number.isFinite(parseFloat(params.turns)) ? parseFloat(params.turns) : 3,
                    cx: obj.x, cy: obj.y,
                    duration: (params.duration || 3.5) * 1000,
                    easing: params.easing || 'easeInOut'
                })
            },
            'brownian-drift': {
                name: 'Brownian Drift',
                category: 'movement',
                params: { distance: 50, duration: 5, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'parametric-path',
                    pathType: 'brownian',
                    radius: Math.max(5, parseFloat(params.distance) || 50),
                    cx: obj.x, cy: obj.y,
                    seed: this._hashString(`${obj.id}:brownian:${obj.x}:${obj.y}`),
                    duration: (params.duration || 5) * 1000,
                    easing: params.easing || 'linear'
                })
            },
            'heart-path': {
                name: 'Heart Path',
                category: 'movement',
                params: { distance: 100, turns: 1, duration: 4, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'parametric-path',
                    pathType: 'heart',
                    radius: Math.max(10, parseFloat(params.distance) || 100),
                    turns: Number.isFinite(parseFloat(params.turns)) ? parseFloat(params.turns) : 1,
                    cx: obj.x, cy: obj.y,
                    duration: (params.duration || 4) * 1000,
                    easing: params.easing || 'easeInOut'
                })
            },

            // === COLOR / MATERIAL (Phase 5) ===
            'hue-cycle': {
                name: 'Hue Cycle',
                category: 'effects',
                params: { duration: 2.0, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'hue-cycle',
                    duration: (params.duration || 2.0) * 1000,
                    easing: params.easing || 'linear',
                    x: obj.x, y: obj.y, w: obj.width || 200, h: obj.height || 200,
                    alpha: 0.4
                })
            },
            'saturation-pulse': {
                name: 'Saturation Pulse',
                category: 'effects',
                params: { duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'saturation-pulse',
                    duration: (params.duration || 1.2) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x, y: obj.y, w: obj.width || 200, h: obj.height || 200,
                    maxDesat: 0.65
                })
            },
            'invert-flash': {
                name: 'Invert Flash',
                category: 'effects',
                params: { duration: 0.4, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'invert-flash',
                    duration: (params.duration || 0.4) * 1000,
                    easing: params.easing || 'easeOut',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    maxOpacity: 0.85
                })
            },
            'duotone-shift': {
                name: 'Duotone Shift',
                category: 'effects',
                params: { duration: 1.8, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'duotone-shift',
                    duration: (params.duration || 1.8) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x, y: obj.y, w: obj.width || 200, h: obj.height || 200,
                    colorA: '#0ea5e9',
                    colorB: '#f43f5e',
                    alpha: 0.5
                })
            },
            'tint-wash': {
                name: 'Tint Wash',
                category: 'effects',
                params: { duration: 3.0, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'tint-wash',
                    duration: (params.duration || 3.0) * 1000,
                    easing: params.easing || 'linear',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    alpha: 0.18
                })
            },

            // === TEXT GAPS (Phase 6) ===
            'matrix-scramble': {
                name: 'Matrix Scramble',
                category: 'text',
                worksWith: ['text'],
                params: { duration: 1.6, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'matrix-scramble',
                    duration: (params.duration || 1.6) * 1000,
                    easing: params.easing || 'easeOut',
                    text: String(obj.text || obj.content || 'TEXT'),
                    seed: this._hashString(`${obj.id}:matrix`)
                })
            },
            'karaoke-highlight': {
                name: 'Karaoke Highlight',
                category: 'text',
                worksWith: ['text'],
                params: { duration: 2.5, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'karaoke-highlight',
                    duration: (params.duration || 2.5) * 1000,
                    easing: params.easing || 'linear',
                    x: obj.x, y: obj.y,
                    w: obj.width || 200, h: obj.height || 40,
                    color: '#facc15',
                    alpha: 0.5
                })
            },
            'counter-text': {
                name: 'Number Counter',
                category: 'text',
                worksWith: ['text'],
                params: { from: 0, to: 100, duration: 2, easing: 'easeOut' },
                generate: (obj, params) => ({
                    type: 'counter-text',
                    from: Number.isFinite(parseFloat(params.from)) ? parseFloat(params.from) : 0,
                    to: Number.isFinite(parseFloat(params.to)) ? parseFloat(params.to) : 100,
                    duration: (params.duration || 2) * 1000,
                    easing: params.easing || 'easeOut',
                    prefix: '',
                    suffix: '',
                    decimals: 0
                })
            },

            // === CHARACTER / RIG IDLE (Phase 7) ===
            'idle-breathe': {
                name: 'Idle Breathe',
                category: 'movement',
                params: { amount: 0.04, duration: 3.5, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const amt = Math.max(0.005, Math.min(0.2, parseFloat(params.amount) || 0.04));
                    const sx = obj.scaleX || 1, sy = obj.scaleY || 1;
                    const dur = (params.duration || 3.5) * 1000;
                    return [
                        { property: 'scaleX', from: sx, to: sx * (1 + amt * 0.5), duration: dur, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleY', from: sy, to: sy * (1 + amt), duration: dur, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'head-nod': {
                name: 'Head Nod',
                category: 'rotation',
                params: { angle: 8, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const ang = Math.max(1, Math.min(45, parseFloat(params.angle) || 8));
                    const r = obj.rotation || 0;
                    const dur = (params.duration || 1.2) * 1000;
                    return [
                        { property: 'rotation', from: r - ang * 0.3, to: r + ang, duration: dur, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'wave-gesture': {
                name: 'Wave Gesture',
                category: 'rotation',
                params: { angle: 18, duration: 1.0, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const ang = Math.max(2, Math.min(60, parseFloat(params.angle) || 18));
                    const r = obj.rotation || 0;
                    const dur = (params.duration || 1.0) * 1000;
                    return [
                        { property: 'rotation', from: r - ang, to: r + ang, duration: dur, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'idle-sway': {
                name: 'Idle Sway',
                category: 'movement',
                params: { distance: 12, angle: 2, duration: 4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dist = Math.max(2, Math.min(80, parseFloat(params.distance) || 12));
                    const ang = Math.max(0.5, Math.min(15, parseFloat(params.angle) || 2));
                    const r = obj.rotation || 0;
                    const dur = (params.duration || 4) * 1000;
                    return [
                        { property: 'x', from: obj.x - dist * 0.5, to: obj.x + dist * 0.5, duration: dur, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'rotation', from: r - ang, to: r + ang, duration: dur, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },

            // === AUDIO-REACTIVE (Phase 8) ===
            // Simulated waveform (no analyser plumbing) — driven by sine envelopes.
            'beat-pulse': {
                name: 'Beat Pulse',
                category: 'effects',
                params: { duration: 2.0, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'beat-pulse',
                    duration: (params.duration || 2.0) * 1000,
                    easing: params.easing || 'linear',
                    x: obj.x, y: obj.y, w: obj.width || 200, h: obj.height || 200,
                    bpm: 120,
                    color: '#22d3ee'
                })
            },
            'waveform-bounce': {
                name: 'Waveform',
                category: 'effects',
                params: { duration: 3.0, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'waveform-bounce',
                    duration: (params.duration || 3.0) * 1000,
                    easing: params.easing || 'linear',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    bars: 32,
                    color: '#a78bfa',
                    seed: this._hashString(`${obj.id}:wf`)
                })
            },
            'vu-meter': {
                name: 'VU Meter',
                category: 'effects',
                params: { duration: 2.5, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'vu-meter',
                    duration: (params.duration || 2.5) * 1000,
                    easing: params.easing || 'linear',
                    x: obj.x, y: obj.y, w: obj.width || 200, h: obj.height || 200,
                    seed: this._hashString(`${obj.id}:vu`)
                })
            },

            // === PHYSICS (Phase 9) ===
            'spring-snap': {
                name: 'Spring Snap',
                category: 'movement',
                params: { distance: 80, duration: 0.9, easing: 'easeOutBack' },
                generate: (obj, params) => {
                    const dist = Math.max(10, parseFloat(params.distance) || 80);
                    const dur = (params.duration || 0.9) * 1000;
                    return [
                        { property: 'x', from: obj.x - dist, to: obj.x, duration: dur, easing: params.easing || 'easeOutBack' },
                        { property: 'scaleX', from: (obj.scaleX || 1) * 1.25, to: obj.scaleX || 1, duration: dur * 0.6, easing: 'easeOut' },
                        { property: 'scaleY', from: (obj.scaleY || 1) * 0.75, to: obj.scaleY || 1, duration: dur * 0.6, easing: 'easeOut' }
                    ];
                }
            },
            'gravity-settle': {
                name: 'Gravity Settle',
                category: 'movement',
                params: { distance: 220, duration: 1.4, easing: 'easeOutBounce' },
                generate: (obj, params) => {
                    const dist = Math.max(20, parseFloat(params.distance) || 220);
                    const dur = (params.duration || 1.4) * 1000;
                    return [
                        { property: 'y', from: obj.y - dist, to: obj.y, duration: dur, easing: params.easing || 'easeOutBounce' },
                        { property: 'scaleY', from: (obj.scaleY || 1) * 0.9, to: obj.scaleY || 1, duration: dur * 0.3, delay: dur * 0.7, easing: 'easeOut' }
                    ];
                }
            },
            'inertia-drag': {
                name: 'Inertia Drag',
                category: 'movement',
                params: { distance: 150, duration: 1.2, easing: 'easeOutCubic' },
                generate: (obj, params) => {
                    const dist = Math.max(10, parseFloat(params.distance) || 150);
                    const dur = (params.duration || 1.2) * 1000;
                    const r = obj.rotation || 0;
                    return [
                        { property: 'x', from: obj.x, to: obj.x + dist, duration: dur, easing: params.easing || 'easeOutCubic' },
                        { property: 'rotation', from: r, to: r + 12, duration: dur * 0.5, easing: 'easeOut' },
                        { property: 'rotation', from: r + 12, to: r, duration: dur * 0.5, delay: dur * 0.5, easing: 'easeOut' }
                    ];
                }
            },

            // === RETRO FILTERS (Phase 10) ===
            'old-film': {
                name: 'Old Film',
                category: 'effects',
                worksWith: ['any'],
                params: { duration: 3.0, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'old-film',
                    duration: (params.duration || 3.0) * 1000,
                    easing: params.easing || 'linear',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    seed: this._hashString(`${obj.id}:film`)
                })
            },
            'vhs-scanlines': {
                name: 'VHS Scanlines',
                category: 'effects',
                worksWith: ['any'],
                params: { duration: 3.0, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'vhs-scanlines',
                    duration: (params.duration || 3.0) * 1000,
                    easing: params.easing || 'linear',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720
                })
            },
            'film-grain': {
                name: 'Film Grain',
                category: 'effects',
                worksWith: ['any'],
                params: { duration: 2.5, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'film-grain',
                    duration: (params.duration || 2.5) * 1000,
                    easing: params.easing || 'linear',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720,
                    density: 0.08,
                    seed: this._hashString(`${obj.id}:grain`)
                })
            },
            'crt-bend': {
                name: 'CRT Bend',
                category: 'effects',
                worksWith: ['any'],
                params: { duration: 2.0, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'crt-bend',
                    duration: (params.duration || 2.0) * 1000,
                    easing: params.easing || 'easeInOut',
                    stageW: this.stage?.width || 1280,
                    stageH: this.stage?.height || 720
                })
            },

            // === OBJECT TRANSITIONS (Phase 11) ===
            // Single-object variants (pair-linking would require timeline plumbing; deferred).
            'crossfade': {
                name: 'Crossfade',
                category: 'transitions',
                params: { duration: 0.8, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dur = (params.duration || 0.8) * 1000;
                    const baseOpacity = obj.opacity ?? 1;
                    return [
                        { property: 'opacity', from: 0, to: baseOpacity, duration: dur, easing: params.easing || 'easeInOut' }
                    ];
                }
            },
            'morph-shape': {
                name: 'Morph Shape',
                category: 'transitions',
                params: { duration: 0.9, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dur = (params.duration || 0.9) * 1000;
                    const sx = obj.scaleX || 1, sy = obj.scaleY || 1;
                    const r = obj.rotation || 0;
                    return [
                        { property: 'scaleX', from: sx * 0.2, to: sx * 1.15, duration: dur * 0.55, easing: 'easeOut' },
                        { property: 'scaleX', from: sx * 1.15, to: sx, duration: dur * 0.45, delay: dur * 0.55, easing: 'easeOut' },
                        { property: 'scaleY', from: sy * 1.6, to: sy * 0.9, duration: dur * 0.55, easing: 'easeOut' },
                        { property: 'scaleY', from: sy * 0.9, to: sy, duration: dur * 0.45, delay: dur * 0.55, easing: 'easeOut' },
                        { property: 'rotation', from: r - 25, to: r, duration: dur, easing: params.easing || 'easeInOut' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: dur * 0.5, easing: 'easeOut' }
                    ];
                }
            },
            'match-cut': {
                name: 'Match Cut',
                category: 'transitions',
                params: { duration: 0.5, easing: 'easeOut' },
                generate: (obj, params) => {
                    const dur = (params.duration || 0.5) * 1000;
                    const sx = obj.scaleX || 1, sy = obj.scaleY || 1;
                    return [
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: dur * 0.25, easing: 'linear' },
                        { property: 'scaleX', from: sx * 1.4, to: sx, duration: dur, easing: params.easing || 'easeOut' },
                        { property: 'scaleY', from: sy * 1.4, to: sy, duration: dur, easing: params.easing || 'easeOut' }
                    ];
                }
            },

            'morph-pulse': {
                name: 'Morph Pulse',
                category: 'effects',
                params: { scale: 1.28, degrees: 8, duration: 1.1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.28);
                    const degrees = Math.max(0, parseFloat(params.degrees) || 8);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 1.1) * 1000;
                    return [
                        { property: 'scaleX', from: sx / scale, to: sx * scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleY', from: sy * scale, to: sy / scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'rotation', from: rotation - degrees, to: rotation + degrees, duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'zoom-pop': {
                name: 'Zoom Pop',
                category: 'effects',
                params: { scale: 1.45, duration: 0.7, easing: 'bounce' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.45);
                    const duration = (params.duration || 0.7) * 1000;
                    return [
                        { property: 'scaleX', from: sx * 0.18, to: sx * scale, duration: duration * 0.7, easing: params.easing || 'bounce', pingpong: true },
                        { property: 'scaleY', from: sy * 0.18, to: sy * scale, duration: duration * 0.7, easing: params.easing || 'bounce', pingpong: true },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: duration * 0.55, easing: 'easeOut' }
                    ];
                }
            },
            'elastic-warp': {
                name: 'Elastic Warp',
                category: 'effects',
                params: { scale: 1.32, duration: 0.9, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.32);
                    const duration = (params.duration || 0.9) * 1000;
                    return [
                        { property: 'scaleX', from: sx / scale, to: sx * scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleY', from: sy * scale, to: sy / scale, duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'hover-sway': {
                name: 'Hover Sway',
                category: 'effects',
                params: { distance: 22, degrees: 4, duration: 1.6, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 22);
                    const degrees = Math.max(0, parseFloat(params.degrees) || 4);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 1.6) * 1000;
                    return [
                        { property: 'y', from: obj.y - distance, to: obj.y + distance, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'x', from: obj.x - distance * 0.35, to: obj.x + distance * 0.35, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'rotation', from: rotation - degrees, to: rotation + degrees, duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'pulse-flash': {
                name: 'Pulse Flash',
                category: 'effects',
                params: { scale: 1.16, amount: 0.35, duration: 0.8, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const baseOpacity = obj.opacity ?? 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.16);
                    const amount = Math.max(0, Math.min(0.95, parseFloat(params.amount) || 0.35));
                    const duration = (params.duration || 0.8) * 1000;
                    return [
                        { property: 'scaleX', from: sx, to: sx * scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleY', from: sy, to: sy * scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'opacity', from: Math.max(0, baseOpacity - amount), to: baseOpacity, duration: duration * 0.5, easing: 'linear', pingpong: true }
                    ];
                }
            },
            'boomerang-motion': {
                name: 'Boomerang Motion',
                category: 'effects',
                params: { distance: 120, direction: 'right', degrees: 18, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 120);
                    const degrees = Math.max(0, parseFloat(params.degrees) || 18);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 1) * 1000;
                    const dir = params.direction || 'right';
                    const props = [
                        { property: 'rotation', from: rotation - degrees, to: rotation + degrees, duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                    if (dir.includes('left')) {
                        props.push({ property: 'x', from: obj.x, to: obj.x - distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    } else if (dir.includes('up')) {
                        props.push({ property: 'y', from: obj.y, to: obj.y - distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    } else if (dir.includes('down')) {
                        props.push({ property: 'y', from: obj.y, to: obj.y + distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    } else {
                        props.push({ property: 'x', from: obj.x, to: obj.x + distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    }
                    return props;
                }
            },
            'snap-back': {
                name: 'Snap Back',
                category: 'effects',
                params: { distance: 60, scale: 1.18, duration: 0.55, easing: 'bounce' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const distance = Math.max(1, parseFloat(params.distance) || 60);
                    const scale = Math.max(1, parseFloat(params.scale) || 1.18);
                    const duration = (params.duration || 0.55) * 1000;
                    return [
                        { property: 'x', from: obj.x + distance, to: obj.x, duration, easing: params.easing || 'bounce' },
                        { property: 'scaleX', from: sx * scale, to: sx, duration, easing: params.easing || 'bounce' },
                        { property: 'scaleY', from: sy / scale, to: sy, duration, easing: params.easing || 'bounce' }
                    ];
                }
            },
            'spin-pop': {
                name: 'Spin Pop',
                category: 'effects',
                params: { scale: 1.25, degrees: 360, duration: 0.85, easing: 'easeOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const rotation = obj.rotation || 0;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.25);
                    const degrees = parseFloat(params.degrees) || 360;
                    const duration = (params.duration || 0.85) * 1000;
                    return [
                        { property: 'scaleX', from: sx * 0.25, to: sx * scale, duration: duration * 0.75, easing: params.easing || 'easeOut', pingpong: true },
                        { property: 'scaleY', from: sy * 0.25, to: sy * scale, duration: duration * 0.75, easing: params.easing || 'easeOut', pingpong: true },
                        { property: 'rotation', from: rotation, to: rotation + degrees, duration, easing: 'linear' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: duration * 0.45, easing: 'easeOut' }
                    ];
                }
            },
            'drift-fade': {
                name: 'Drift Fade',
                category: 'effects',
                params: { distance: 80, direction: 'up', duration: 1.2, easing: 'easeOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 80);
                    const duration = (params.duration || 1.2) * 1000;
                    const dir = params.direction || 'up';
                    const props = [
                        { property: 'opacity', from: obj.opacity ?? 1, to: 0, duration, easing: params.easing || 'easeOut' }
                    ];
                    if (dir.includes('left')) {
                        props.push({ property: 'x', from: obj.x, to: obj.x - distance, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('right')) {
                        props.push({ property: 'x', from: obj.x, to: obj.x + distance, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('down')) {
                        props.push({ property: 'y', from: obj.y, to: obj.y + distance, duration, easing: params.easing || 'easeOut' });
                    } else {
                        props.push({ property: 'y', from: obj.y, to: obj.y - distance, duration, easing: params.easing || 'easeOut' });
                    }
                    return props;
                }
            },
            'orbit-pulse': {
                name: 'Orbit Pulse',
                category: 'effects',
                params: { distance: 28, scale: 1.14, duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 28);
                    const scale = Math.max(1, parseFloat(params.scale) || 1.14);
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const duration = (params.duration || 1.4) * 1000;
                    return [
                        { property: 'x', from: obj.x - distance, to: obj.x + distance, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'y', from: obj.y - distance * 0.65, to: obj.y + distance * 0.65, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleX', from: sx, to: sx * scale, duration: duration * 0.6, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleY', from: sy, to: sy * scale, duration: duration * 0.6, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'lift-drop': {
                name: 'Lift Drop',
                category: 'effects',
                params: { distance: 90, scale: 1.08, duration: 0.95, easing: 'bounce' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 90);
                    const scale = Math.max(1, parseFloat(params.scale) || 1.08);
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const duration = (params.duration || 0.95) * 1000;
                    return [
                        { property: 'y', from: obj.y - distance, to: obj.y, duration, easing: params.easing || 'bounce' },
                        { property: 'scaleX', from: sx * scale, to: sx, duration: duration * 0.45, easing: 'easeOut', pingpong: true },
                        { property: 'scaleY', from: sy / scale, to: sy, duration: duration * 0.45, easing: 'easeOut', pingpong: true }
                    ];
                }
            },
            'skid-slide': {
                name: 'Skid Slide',
                category: 'effects',
                params: { distance: 130, degrees: 7, direction: 'right', duration: 0.85, easing: 'easeOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 130);
                    const degrees = Math.max(0, parseFloat(params.degrees) || 7);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 0.85) * 1000;
                    const dir = params.direction || 'right';
                    const props = [
                        { property: 'rotation', from: rotation - degrees, to: rotation, duration, easing: params.easing || 'easeOut' }
                    ];
                    if (dir.includes('left')) {
                        props.push({ property: 'x', from: obj.x + distance, to: obj.x, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('up')) {
                        props.push({ property: 'y', from: obj.y + distance, to: obj.y, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('down')) {
                        props.push({ property: 'y', from: obj.y - distance, to: obj.y, duration, easing: params.easing || 'easeOut' });
                    } else {
                        props.push({ property: 'x', from: obj.x - distance, to: obj.x, duration, easing: params.easing || 'easeOut' });
                    }
                    return props;
                }
            },
            'reveal-bounce': {
                name: 'Reveal Bounce',
                category: 'effects',
                params: { scale: 1.22, duration: 0.85, easing: 'bounce' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.22);
                    const duration = (params.duration || 0.85) * 1000;
                    return [
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: duration * 0.5, easing: 'easeOut' },
                        { property: 'scaleX', from: sx / scale, to: sx, duration, easing: params.easing || 'bounce' },
                        { property: 'scaleY', from: sy / scale, to: sy, duration, easing: params.easing || 'bounce' }
                    ];
                }
            },
            'slide-in': {
                name: 'Slide In',
                category: 'movement',
                params: { direction: 'left', distance: 200, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => {
                    const offscreen = this.getOffscreenPosition(obj, params.direction);
                    if (offscreen.props) {
                        // Diagonal
                        return [
                            { property: offscreen.props[0], from: offscreen.values[0], to: obj[offscreen.props[0]], duration: params.duration * 1000, easing: params.easing },
                            { property: offscreen.props[1], from: offscreen.values[1], to: obj[offscreen.props[1]], duration: params.duration * 1000, easing: params.easing }
                        ];
                    }
                    return {
                        property: offscreen.prop,
                        from: offscreen.value,
                        to: obj[offscreen.prop],
                        duration: params.duration * 1000,
                        easing: params.easing
                    };
                }
            },
            'slide-out': {
                name: 'Slide Out',
                category: 'movement',
                params: { direction: 'right', distance: 200, duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => {
                    const offscreen = this.getOffscreenPosition(obj, params.direction);
                    if (offscreen.props) {
                        // Diagonal
                        return [
                            { property: offscreen.props[0], from: obj[offscreen.props[0]], to: offscreen.values[0], duration: params.duration * 1000, easing: params.easing },
                            { property: offscreen.props[1], from: obj[offscreen.props[1]], to: offscreen.values[1], duration: params.duration * 1000, easing: params.easing }
                        ];
                    }
                    return {
                        property: offscreen.prop,
                        from: obj[offscreen.prop],
                        to: offscreen.value,
                        duration: params.duration * 1000,
                        easing: params.easing
                    };
                }
            },

            // Topple (Edge Pivot)
            'topple': {
                name: 'Topple (Edge Pivot)',
                category: 'movement',
                params: { direction: 'right', duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => {
                    const W = obj.width;
                    const H = obj.height;
                    const isRight = params.direction !== 'left';
                    const anglePerStep = isRight ? 90 : -90;
                    const rotRad = (obj.rotation || 0) * Math.PI / 180;
                    const cx = obj.x + W / 2;
                    const cy = obj.y + H / 2;
                    // Bottom-right or bottom-left corner in world space
                    const localPX = isRight ? W / 2 : -W / 2;
                    const localPY = H / 2;
                    const pivotX = cx + localPX * Math.cos(rotRad) - localPY * Math.sin(rotRad);
                    const pivotY = cy + localPX * Math.sin(rotRad) + localPY * Math.cos(rotRad);
                    return {
                        type: 'topple',
                        duration: params.duration * 1000,
                        easing: params.easing,
                        direction: isRight ? 'right' : 'left',
                        angle: anglePerStep,
                        pivotX: pivotX,
                        pivotY: pivotY,
                        startX: obj.x,
                        startY: obj.y,
                        startRotation: obj.rotation || 0,
                        width: W,
                        height: H
                    };
                }
            },

            // Topple Straight Line (rolling box on floor)
            'topple-line': {
                name: 'Topple Straight Line',
                category: 'movement',
                params: { direction: 'right', degrees: 360, duration: 3.2, easing: 'easeIn' },
                generate: (obj, params) => {
                    const W = obj.width, H = obj.height;
                    const numSteps = Math.max(1, Math.round(Math.abs(params.degrees || 360) / 90));
                    const isRight = params.direction !== 'left';
                    const stepAngle = isRight ? 90 : -90;
                    // Corner cycle: which local corner becomes the floor-level pivot at each step
                    const rc = [[1,1],[1,-1],[-1,-1],[-1,1]];   // right: BR,TR,TL,BL
                    const lc = [[-1,1],[-1,-1],[1,-1],[1,1]];    // left:  BL,TL,TR,BR
                    const corners = isRight ? rc : lc;
                    let curX = obj.x, curY = obj.y, curRot = obj.rotation || 0;
                    const steps = [];
                    for (let i = 0; i < numSteps; i++) {
                        const [sx, sy] = corners[i % 4];
                        const lpx = sx * W / 2, lpy = sy * H / 2;
                        const rotRad = curRot * Math.PI / 180;
                        const cx = curX + W / 2, cy = curY + H / 2;
                        const pvX = cx + lpx * Math.cos(rotRad) - lpy * Math.sin(rotRad);
                        const pvY = cy + lpx * Math.sin(rotRad) + lpy * Math.cos(rotRad);
                        steps.push({ pivotX: pvX, pivotY: pvY, startX: curX, startY: curY, startRotation: curRot, angle: stepAngle });
                        // Compute end state for next step
                        const dx = cx - pvX, dy = cy - pvY;
                        const aR = stepAngle * Math.PI / 180;
                        curX = pvX + dx * Math.cos(aR) - dy * Math.sin(aR) - W / 2;
                        curY = pvY + dx * Math.sin(aR) + dy * Math.cos(aR) - H / 2;
                        curRot += stepAngle;
                    }
                    return {
                        type: 'topple-line',
                        duration: (params.duration || 3.2) * 1000,
                        easing: params.easing || 'easeIn',
                        direction: isRight ? 'right' : 'left',
                        steps: steps,
                        numSteps: numSteps,
                        startX: obj.x, startY: obj.y,
                        startRotation: obj.rotation || 0,
                        width: W, height: H
                    };
                }
            },

            // Rotation
            'spin-cw': {
                name: 'Spin Clockwise',
                category: 'rotation',
                params: { degrees: 360, duration: 1, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'rotation',
                    from: obj.rotation,
                    to: obj.rotation + params.degrees,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'spin-ccw': {
                name: 'Spin Counter-Clockwise',
                category: 'rotation',
                params: { degrees: 360, duration: 1, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'rotation',
                    from: obj.rotation,
                    to: obj.rotation - params.degrees,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'wobble': {
                name: 'Wobble',
                category: 'rotation',
                params: { degrees: 15, duration: 0.5, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'rotation',
                    from: obj.rotation - params.degrees,
                    to: obj.rotation + params.degrees,
                    duration: params.duration * 1000,
                    easing: 'easeInOut',
                    pingpong: true
                })
            },
            'half-turn': {
                name: 'Half Turn',
                category: 'rotation',
                params: { duration: 0.6, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'rotation',
                    from: obj.rotation,
                    to: obj.rotation + 180,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },

            // Scale
            'grow': {
                name: 'Grow',
                category: 'scale',
                params: { scale: 1.5, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: params.scale, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: obj.scaleY, to: params.scale, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'shrink': {
                name: 'Shrink',
                category: 'scale',
                params: { scale: 0.5, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: params.scale, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: obj.scaleY, to: params.scale, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'pulse': {
                name: 'Pulse',
                category: 'scale',
                params: { scale: 1.2, duration: 0.6, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: params.scale, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true },
                    { property: 'scaleY', from: obj.scaleY, to: params.scale, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true }
                ])
            },
            // NOTE: 'squash-stretch' is defined in the 'combos' category below (see line ~2587).
            // A duplicate 'squash-stretch' key previously lived here under 'scale' but was
            // silently overwritten by the combos entry. Removed to avoid confusion.

            // Opacity
            'fade-in': {
                name: 'Fade In',
                category: 'opacity',
                params: { duration: 1, easing: 'easeIn' },
                generate: (obj, params) => ({
                    property: 'opacity',
                    from: 0,
                    to: 1,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'fade-out': {
                name: 'Fade Out',
                category: 'opacity',
                params: { duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ({
                    property: 'opacity',
                    from: 1,
                    to: 0,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'blink': {
                name: 'Blink',
                category: 'opacity',
                params: { duration: 0.3, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'opacity',
                    from: 1,
                    to: 0,
                    duration: params.duration * 1000,
                    easing: 'linear',
                    pingpong: true
                })
            },
            'dissolve': {
                name: 'Dissolve',
                category: 'opacity',
                params: { duration: 2, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'opacity',
                    from: 1,
                    to: 0,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },

            // Text
            'typewriter': {
                name: 'Typewriter',
                category: 'text',
                params: { cps: 10, duration: 2, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'typewriter',
                    text: obj.text,
                    cps: params.cps,
                    duration: params.duration * 1000
                })
            },
            'letter-spin': {
                name: 'Letter Spin',
                category: 'text',
                params: { degrees: 360, scale: 1.08, duration: 1.5, easing: 'easeOut' },
                generate: (obj, params) => {
                    const rotation = obj.rotation || 0;
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const degrees = parseFloat(params.degrees) || 360;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.08);
                    const duration = (params.duration || 1.5) * 1000;
                    return [
                        { property: 'rotation', from: rotation, to: rotation + degrees, duration, easing: params.easing || 'easeOut' },
                        { property: 'scaleX', from: sx * scale, to: sx, duration: duration * 0.65, easing: params.easing || 'easeOut' },
                        { property: 'scaleY', from: sy * scale, to: sy, duration: duration * 0.65, easing: params.easing || 'easeOut' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: duration * 0.45, easing: 'easeOut' }
                    ];
                }
            },
            'word-fade': {
                name: 'Word Fade',
                category: 'text',
                params: { amount: 0.18, distance: 18, duration: 2, easing: 'easeIn' },
                generate: (obj, params) => {
                    const baseOpacity = obj.opacity ?? 1;
                    const amount = Math.max(0, Math.min(0.95, parseFloat(params.amount) || 0.18));
                    const distance = Math.max(0, parseFloat(params.distance) || 18);
                    const duration = (params.duration || 2) * 1000;
                    return [
                        { property: 'opacity', from: Math.max(0, baseOpacity - amount), to: baseOpacity, duration, easing: params.easing || 'easeIn', pingpong: true },
                        { property: 'y', from: obj.y + distance, to: obj.y, duration, easing: params.easing || 'easeIn' }
                    ];
                }
            },
            'line-reveal': {
                name: 'Line Reveal',
                category: 'text',
                params: { direction: 'left', duration: 1.5, easing: 'easeOut' },
                generate: (obj, params) => {
                    const distance = Math.max(24, Math.min(220, (obj.width || 120) * 0.35));
                    const duration = (params.duration || 1.5) * 1000;
                    const dir = params.direction || 'left';
                    const props = [
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration, easing: params.easing || 'easeOut' }
                    ];
                    if (dir.includes('right')) {
                        props.push({ property: 'x', from: obj.x + distance, to: obj.x, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('up')) {
                        props.push({ property: 'y', from: obj.y - distance, to: obj.y, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('down')) {
                        props.push({ property: 'y', from: obj.y + distance, to: obj.y, duration, easing: params.easing || 'easeOut' });
                    } else {
                        props.push({ property: 'x', from: obj.x - distance, to: obj.x, duration, easing: params.easing || 'easeOut' });
                    }
                    return props;
                }
            },
            'text-pop': {
                name: 'Text Pop',
                category: 'text',
                params: { scale: 1.18, duration: 0.7, easing: 'easeOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.18);
                    const duration = (params.duration || 0.7) * 1000;
                    return [
                        { property: 'scaleX', from: sx, to: sx * scale, duration, easing: params.easing || 'easeOut', pingpong: true },
                        { property: 'scaleY', from: sy, to: sy * scale, duration, easing: params.easing || 'easeOut', pingpong: true }
                    ];
                }
            },
            'text-rise': {
                name: 'Text Rise',
                category: 'text',
                params: { distance: 36, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 36);
                    const duration = (params.duration || 1) * 1000;
                    return [
                        { property: 'y', from: obj.y + distance, to: obj.y, duration, easing: params.easing || 'easeOut' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration, easing: params.easing || 'easeOut' }
                    ];
                }
            },
            'text-breathe': {
                name: 'Text Breathe',
                category: 'text',
                params: { scale: 1.08, duration: 1.8, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.08);
                    const duration = (params.duration || 1.8) * 1000;
                    return [
                        { property: 'scaleX', from: sx, to: sx * scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleY', from: sy, to: sy * scale, duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'text-jitter': {
                name: 'Text Jitter',
                category: 'text',
                params: { amount: 8, duration: 0.45, easing: 'linear' },
                generate: (obj, params) => {
                    const amount = Math.max(1, parseFloat(params.amount) || 8);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 0.45) * 1000;
                    return [
                        { property: 'x', from: obj.x - amount, to: obj.x + amount, duration, easing: params.easing || 'linear', pingpong: true },
                        { property: 'rotation', from: rotation - 2, to: rotation + 2, duration, easing: params.easing || 'linear', pingpong: true }
                    ];
                }
            },
            'text-slam': {
                name: 'Text Slam',
                category: 'text',
                params: { distance: 70, scale: 1.22, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 70);
                    const scale = Math.max(1, parseFloat(params.scale) || 1.22);
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const duration = (params.duration || 0.8) * 1000;
                    return [
                        { property: 'y', from: obj.y - distance, to: obj.y, duration, easing: params.easing || 'easeOut' },
                        { property: 'scaleX', from: sx * scale, to: sx, duration, easing: params.easing || 'easeOut' },
                        { property: 'scaleY', from: sy * scale, to: sy, duration, easing: params.easing || 'easeOut' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration, easing: params.easing || 'easeOut' }
                    ];
                }
            },
            'text-wave': {
                name: 'Text Wave',
                category: 'text',
                params: { amount: 18, degrees: 6, duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const amount = Math.max(1, parseFloat(params.amount) || 18);
                    const degrees = Math.max(0, parseFloat(params.degrees) || 6);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 1.4) * 1000;
                    return [
                        { property: 'y', from: obj.y - amount, to: obj.y + amount, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'rotation', from: rotation - degrees, to: rotation + degrees, duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'text-flicker': {
                name: 'Text Flicker',
                category: 'text',
                params: { amount: 0.35, duration: 0.6, easing: 'linear' },
                generate: (obj, params) => {
                    const baseOpacity = obj.opacity ?? 1;
                    const amount = Math.max(0, Math.min(0.95, parseFloat(params.amount) || 0.35));
                    const duration = (params.duration || 0.6) * 1000;
                    return [
                        { property: 'opacity', from: Math.max(0, baseOpacity - amount), to: baseOpacity, duration, easing: params.easing || 'linear', pingpong: true }
                    ];
                }
            },
            'text-tilt': {
                name: 'Text Tilt',
                category: 'text',
                params: { degrees: 12, duration: 0.75, easing: 'easeOut' },
                generate: (obj, params) => {
                    const degrees = Math.max(1, parseFloat(params.degrees) || 12);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 0.75) * 1000;
                    return [
                        { property: 'rotation', from: rotation - degrees, to: rotation, duration, easing: params.easing || 'easeOut' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration, easing: params.easing || 'easeOut' }
                    ];
                }
            },
            'text-drift': {
                name: 'Text Drift',
                category: 'text',
                params: { distance: 44, direction: 'right', duration: 1.6, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 44);
                    const duration = (params.duration || 1.6) * 1000;
                    const props = [
                        { property: 'opacity', from: obj.opacity ?? 1, to: Math.max(0.25, (obj.opacity ?? 1) * 0.7), duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                    if ((params.direction || 'right').includes('left')) {
                        props.push({ property: 'x', from: obj.x + distance, to: obj.x - distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    } else if ((params.direction || 'right').includes('up')) {
                        props.push({ property: 'y', from: obj.y + distance, to: obj.y - distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    } else if ((params.direction || 'right').includes('down')) {
                        props.push({ property: 'y', from: obj.y - distance, to: obj.y + distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    } else {
                        props.push({ property: 'x', from: obj.x - distance, to: obj.x + distance, duration, easing: params.easing || 'easeInOut', pingpong: true });
                    }
                    return props;
                }
            },
            'text-stamp': {
                name: 'Text Stamp',
                category: 'text',
                params: { scale: 1.65, degrees: 4, duration: 0.65, easing: 'bounce' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.65);
                    const degrees = Math.max(0, parseFloat(params.degrees) || 4);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 0.65) * 1000;
                    return [
                        { property: 'scaleX', from: sx * scale, to: sx, duration, easing: params.easing || 'bounce' },
                        { property: 'scaleY', from: sy * scale, to: sy, duration, easing: params.easing || 'bounce' },
                        { property: 'rotation', from: rotation - degrees, to: rotation, duration, easing: params.easing || 'bounce' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration, easing: params.easing || 'bounce' }
                    ];
                }
            },
            'text-bounce': {
                name: 'Text Bounce',
                category: 'text',
                params: { distance: 48, scale: 1.14, duration: 0.9, easing: 'bounce' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const distance = Math.max(1, parseFloat(params.distance) || 48);
                    const scale = Math.max(1, parseFloat(params.scale) || 1.14);
                    const duration = (params.duration || 0.9) * 1000;
                    return [
                        { property: 'y', from: obj.y - distance, to: obj.y, duration, easing: params.easing || 'bounce' },
                        { property: 'scaleX', from: sx * scale, to: sx, duration: duration * 0.55, easing: 'easeOut', pingpong: true },
                        { property: 'scaleY', from: sy / scale, to: sy, duration: duration * 0.55, easing: 'easeOut', pingpong: true }
                    ];
                }
            },
            'text-swing': {
                name: 'Text Swing',
                category: 'text',
                params: { degrees: 12, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const degrees = Math.max(1, parseFloat(params.degrees) || 12);
                    const rotation = obj.rotation || 0;
                    const duration = (params.duration || 1.2) * 1000;
                    return [
                        { property: 'rotation', from: rotation - degrees, to: rotation + degrees, duration, easing: params.easing || 'easeInOut', pingpong: true }
                    ];
                }
            },
            'text-zoom': {
                name: 'Text Zoom',
                category: 'text',
                params: { scale: 1.4, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.4);
                    const duration = (params.duration || 0.8) * 1000;
                    return [
                        { property: 'scaleX', from: sx / scale, to: sx, duration, easing: params.easing || 'easeOut' },
                        { property: 'scaleY', from: sy / scale, to: sy, duration, easing: params.easing || 'easeOut' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: duration * 0.65, easing: 'easeOut' }
                    ];
                }
            },
            'text-blur-in': {
                name: 'Text Blur In',
                category: 'text',
                params: { scale: 1.18, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.18);
                    const duration = (params.duration || 1) * 1000;
                    return [
                        { property: 'scaleX', from: sx * scale, to: sx, duration, easing: params.easing || 'easeOut' },
                        { property: 'scaleY', from: sy * scale, to: sy, duration, easing: params.easing || 'easeOut' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration, easing: params.easing || 'easeOut' }
                    ];
                }
            },
            'text-slide-reveal': {
                name: 'Text Slide Reveal',
                category: 'text',
                params: { distance: 64, direction: 'left', duration: 0.9, easing: 'easeOut' },
                generate: (obj, params) => {
                    const distance = Math.max(1, parseFloat(params.distance) || 64);
                    const duration = (params.duration || 0.9) * 1000;
                    const dir = params.direction || 'left';
                    const props = [
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: duration * 0.72, easing: params.easing || 'easeOut' }
                    ];
                    if (dir.includes('right')) {
                        props.push({ property: 'x', from: obj.x + distance, to: obj.x, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('up')) {
                        props.push({ property: 'y', from: obj.y - distance, to: obj.y, duration, easing: params.easing || 'easeOut' });
                    } else if (dir.includes('down')) {
                        props.push({ property: 'y', from: obj.y + distance, to: obj.y, duration, easing: params.easing || 'easeOut' });
                    } else {
                        props.push({ property: 'x', from: obj.x - distance, to: obj.x, duration, easing: params.easing || 'easeOut' });
                    }
                    return props;
                }
            },
            'text-highlight-pulse': {
                name: 'Text Highlight Pulse',
                category: 'text',
                params: { scale: 1.1, amount: 0.22, duration: 0.8, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const baseOpacity = obj.opacity ?? 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.1);
                    const amount = Math.max(0, Math.min(0.9, parseFloat(params.amount) || 0.22));
                    const duration = (params.duration || 0.8) * 1000;
                    return [
                        { property: 'scaleX', from: sx, to: sx * scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'scaleY', from: sy, to: sy * scale, duration, easing: params.easing || 'easeInOut', pingpong: true },
                        { property: 'opacity', from: Math.max(0, baseOpacity - amount), to: baseOpacity, duration: duration * 0.5, easing: 'linear', pingpong: true }
                    ];
                }
            },
            'text-type-pop': {
                name: 'Text Type Pop',
                category: 'text',
                params: { scale: 1.22, distance: 16, duration: 0.65, easing: 'bounce' },
                generate: (obj, params) => {
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const scale = Math.max(1, parseFloat(params.scale) || 1.22);
                    const distance = Math.max(0, parseFloat(params.distance) || 16);
                    const duration = (params.duration || 0.65) * 1000;
                    return [
                        { property: 'scaleX', from: sx / scale, to: sx, duration, easing: params.easing || 'bounce' },
                        { property: 'scaleY', from: sy / scale, to: sy, duration, easing: params.easing || 'bounce' },
                        { property: 'y', from: obj.y + distance, to: obj.y, duration, easing: params.easing || 'bounce' },
                        { property: 'opacity', from: 0, to: obj.opacity ?? 1, duration: duration * 0.55, easing: 'easeOut' }
                    ];
                }
            },

            // Combos
            'bounce-spin': {
                name: 'Bounce + Spin',
                category: 'combos',
                params: { distance: 150, direction: 'up', degrees: 360, duration: 1.5, easing: 'bounce' },
                generate: (obj, params) => {
                    const moveProps = this.generateMovementProps(obj, params, { easing: 'bounce' });
                    const rotProp = { property: 'rotation', from: obj.rotation, to: obj.rotation + params.degrees, duration: params.duration * 1000, easing: 'linear' };
                    return Array.isArray(moveProps) ? [...moveProps, rotProp] : [moveProps, rotProp];
                }
            },
            'fade-move': {
                name: 'Fade + Move',
                category: 'combos',
                params: { distance: 100, direction: 'up', duration: 1, easing: 'easeOut' },
                generate: (obj, params) => {
                    const fadeProp = { property: 'opacity', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing };
                    if (this.isDiagonal(params.direction)) {
                        const cos = Math.cos(Math.PI / 4);
                        const sin = Math.sin(Math.PI / 4);
                        const signX = params.direction.includes('right') ? 1 : -1;
                        const signY = params.direction.includes('up-') || params.direction === 'up' ? -1 : 1;
                        return [
                            fadeProp,
                            { property: 'x', from: obj.x + params.distance * cos * signX, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                            { property: 'y', from: obj.y + params.distance * sin * signY, to: obj.y, duration: params.duration * 1000, easing: params.easing }
                        ];
                    }
                    const prop = params.direction === 'up' || params.direction === 'down' ? 'y' : 'x';
                    const dist = params.direction === 'up' || params.direction === 'left' ? -params.distance : params.distance;
                    return [
                        fadeProp,
                        { property: prop, from: obj[prop] + dist, to: obj[prop], duration: params.duration * 1000, easing: params.easing }
                    ];
                }
            },
            'scale-rotate': {
                name: 'Scale + Rotate',
                category: 'combos',
                params: { scale: 1.5, degrees: 180, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: params.scale, duration: params.duration * 1000, easing: params.easing, pingpong: true },
                    { property: 'scaleY', from: obj.scaleY, to: params.scale, duration: params.duration * 1000, easing: params.easing, pingpong: true },
                    { property: 'rotation', from: obj.rotation, to: obj.rotation + params.degrees, duration: params.duration * 1000, easing: params.easing }
                ])
            },

            // === NEW MOVEMENT ANIMATIONS ===
            'zigzag': {
                name: 'Zigzag',
                category: 'movement',
                params: { distance: 150, direction: 'right', duration: 2, easing: 'linear' },
                generate: (obj, params) => {
                    if (this.isDiagonal(params.direction)) {
                        const moveProps = this.generateMovementProps(obj, params);
                        return Array.isArray(moveProps) ? moveProps : [moveProps];
                    }
                    const isVert = params.direction === 'up' || params.direction === 'down';
                    const mainProp = isVert ? 'y' : 'x';
                    const crossProp = isVert ? 'x' : 'y';
                    const sign = (params.direction === 'down' || params.direction === 'right') ? 1 : -1;
                    return [
                        { property: mainProp, from: obj[mainProp], to: obj[mainProp] + params.distance * sign, duration: params.duration * 1000, easing: params.easing },
                        { property: crossProp, from: obj[crossProp] - 40, to: obj[crossProp] + 40, duration: params.duration * 500, easing: 'easeInOut', pingpong: true }
                    ];
                }
            },
            'orbit': {
                name: 'Orbit',
                category: 'movement',
                params: { distance: 100, turns: 1, duration: 3, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'orbit',
                    centerX: obj.x,
                    centerY: obj.y,
                    radius: params.distance,
                    turns: Number.isFinite(parseFloat(params.turns)) ? parseFloat(params.turns) : 1,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'float': {
                name: 'Float',
                category: 'movement',
                params: { distance: 20, degrees: 2, duration: 2, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    {
                        property: 'y',
                        from: obj.y - params.distance / 2,
                        to: obj.y + params.distance / 2,
                        duration: params.duration * 1000,
                        easing: 'easeInOut',
                        pingpong: true
                    },
                    {
                        property: 'rotation',
                        from: obj.rotation - (parseFloat(params.degrees) || 0),
                        to: obj.rotation + (parseFloat(params.degrees) || 0),
                        duration: params.duration * 1000,
                        easing: 'easeInOut',
                        pingpong: true
                    }
                ])
            },
            'fly': {
                name: 'Fly',
                category: 'movement',
                params: { distance: 260, direction: 'right', degrees: 8, duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const moveProps = this.generateMovementProps(obj, params);
                    const props = Array.isArray(moveProps) ? moveProps : [moveProps];
                    const degrees = parseFloat(params.degrees) || 0;
                    const dur = Math.max(0.05, parseFloat(params.duration) || 1.4) * 1000;
                    props.push({
                        property: 'rotation',
                        from: obj.rotation - degrees,
                        to: obj.rotation + degrees,
                        duration: dur * 0.5,
                        easing: 'easeInOut',
                        pingpong: true
                    });
                    return props;
                }
            },
            'wind-drift': {
                name: 'Wind Drift',
                category: 'movement',
                params: { effectPreset: 'custom', distance: 80, direction: 'right', degrees: 6, duration: 2.4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    if (params.effectPreset === 'light-breeze') {
                        params = { ...params, distance: 45, degrees: 3, duration: params.duration || 2.8 };
                    } else if (params.effectPreset === 'storm-drift') {
                        params = { ...params, distance: 180, degrees: 14, duration: params.duration || 1.5 };
                    }
                    const moveProps = this.generateMovementProps(obj, params);
                    const props = Array.isArray(moveProps) ? moveProps : [moveProps];
                    const drift = Math.max(0, parseFloat(params.distance) || 80);
                    const degrees = parseFloat(params.degrees) || 6;
                    const dur = Math.max(0.05, parseFloat(params.duration) || 2.4) * 1000;
                    props.push(
                        { property: 'y', from: obj.y - drift * 0.18, to: obj.y + drift * 0.18, duration: dur * 0.5, easing: 'easeInOut', pingpong: true },
                        { property: 'rotation', from: obj.rotation - degrees, to: obj.rotation + degrees, duration: dur * 0.5, easing: 'easeInOut', pingpong: true }
                    );
                    return props;
                }
            },
            'shake': {
                name: 'Shake',
                category: 'movement',
                params: { distance: 10, duration: 0.5, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'x',
                    from: obj.x - params.distance,
                    to: obj.x + params.distance,
                    duration: params.duration * 200,
                    easing: 'linear',
                    pingpong: true
                })
            },
            'drop': {
                name: 'Drop',
                category: 'movement',
                params: { distance: 300, duration: 1, easing: 'bounce' },
                generate: (obj, params) => ({
                    property: 'y',
                    from: obj.y - params.distance,
                    to: obj.y,
                    duration: params.duration * 1000,
                    easing: 'bounce'
                })
            },

            // === NEW ROTATION ANIMATIONS ===
            'flip-x': {
                name: 'Flip X',
                category: 'rotation',
                params: { duration: 0.8, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'scaleX',
                    from: 1,
                    to: -1,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'flip-y': {
                name: 'Flip Y',
                category: 'rotation',
                params: { duration: 0.8, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'scaleY',
                    from: 1,
                    to: -1,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'card-turn': {
                name: 'Card Turn',
                category: 'rotation',
                params: { duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'card-turn',
                    duration: (params.duration || 1) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1)
                })
            },
            'page-turn': {
                name: 'Page Turn',
                category: 'rotation',
                params: { duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'page-turn',
                    duration: (params.duration || 1) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1)
                })
            },
            'flap-swing': {
                name: 'Flap Swing',
                category: 'rotation',
                params: { duration: 0.9, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    type: 'flap-swing',
                    duration: (params.duration || 0.9) * 1000,
                    easing: params.easing || 'easeInOut',
                    x: obj.x,
                    y: obj.y,
                    w: Math.max(1, obj.width || 1),
                    h: Math.max(1, obj.height || 1)
                })
            },
            'swing': {
                name: 'Swing',
                category: 'rotation',
                params: { degrees: 30, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'rotation',
                    from: obj.rotation - params.degrees,
                    to: obj.rotation + params.degrees,
                    duration: params.duration * 1000,
                    easing: 'easeInOut',
                    pingpong: true
                })
            },

            // === NEW SCALE ANIMATIONS ===
            'pop-in': {
                name: 'Pop In',
                category: 'scale',
                params: { duration: 0.5, easing: 'elastic' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: obj.scaleX, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'scaleY', from: 0, to: obj.scaleY, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'opacity', from: 0, to: obj.opacity, duration: params.duration * 500, easing: 'easeOut' }
                ])
            },
            'pop-out': {
                name: 'Pop Out',
                category: 'scale',
                params: { duration: 0.5, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: obj.scaleY, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: obj.opacity, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'breathe': {
                name: 'Breathe',
                category: 'scale',
                params: { scale: 1.1, duration: 2, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: params.scale, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true },
                    { property: 'scaleY', from: obj.scaleY, to: params.scale, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true }
                ])
            },
            'rubber-band': {
                name: 'Rubber Band',
                category: 'scale',
                params: { amount: 0.4, duration: 0.8, easing: 'elastic' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: obj.scaleX + params.amount, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'scaleY', from: obj.scaleY + params.amount, to: obj.scaleY, duration: params.duration * 1000, easing: 'elastic' }
                ])
            },

            // === NEW OPACITY ANIMATIONS ===
            'flicker': {
                name: 'Flicker',
                category: 'opacity',
                params: { duration: 0.2, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'opacity',
                    from: 1,
                    to: 0.2,
                    duration: params.duration * 200,
                    easing: 'linear',
                    pingpong: true
                })
            },
            'glow-pulse': {
                name: 'Glow Pulse',
                category: 'opacity',
                params: { duration: 1.5, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'opacity',
                    from: 0.4,
                    to: 1,
                    duration: params.duration * 1000,
                    easing: 'easeInOut',
                    pingpong: true
                })
            },

            // === NEW COMBO ANIMATIONS ===
            'spiral-in': {
                name: 'Spiral In',
                category: 'combos',
                params: { scale: 0.1, degrees: 720, duration: 2, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: params.scale, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: params.scale, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 500, easing: 'easeOut' }
                ])
            },
            'zoom-slide': {
                name: 'Zoom + Slide',
                category: 'combos',
                params: { distance: 200, direction: 'left', scale: 0.5, duration: 1.2, easing: 'easeOut' },
                generate: (obj, params) => {
                    const scaleProps = [
                        { property: 'scaleX', from: params.scale, to: 1, duration: params.duration * 1000, easing: params.easing },
                        { property: 'scaleY', from: params.scale, to: 1, duration: params.duration * 1000, easing: params.easing }
                    ];
                    if (this.isDiagonal(params.direction)) {
                        const cos = Math.cos(Math.PI / 4);
                        const sin = Math.sin(Math.PI / 4);
                        const signX = params.direction.includes('right') ? 1 : -1;
                        const signY = params.direction.includes('up') ? -1 : 1;
                        return [
                            { property: 'x', from: obj.x + params.distance * cos * signX, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                            { property: 'y', from: obj.y + params.distance * sin * signY, to: obj.y, duration: params.duration * 1000, easing: params.easing },
                            ...scaleProps
                        ];
                    }
                    const prop = params.direction === 'up' || params.direction === 'down' ? 'y' : 'x';
                    const dist = params.direction === 'up' || params.direction === 'left' ? -params.distance : params.distance;
                    return [
                        { property: prop, from: obj[prop] + dist, to: obj[prop], duration: params.duration * 1000, easing: params.easing },
                        ...scaleProps
                    ];
                }
            },
            'jelly': {
                name: 'Jelly',
                category: 'combos',
                params: { amount: 0.3, duration: 1, easing: 'elastic' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1 + params.amount, to: 1, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'scaleY', from: 1 - params.amount, to: 1, duration: params.duration * 1000, easing: 'elastic' }
                ])
            },
            'swing-fade': {
                name: 'Swing + Fade',
                category: 'combos',
                params: { degrees: 20, duration: 1.5, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation + params.degrees, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 500, easing: 'easeOut' }
                ])
            },
            'tilt-sway-x': {
                name: 'Tilt Sway X',
                category: 'combos',
                params: { degrees: 18, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => this._buildTiltAnimation(obj, [
                    {
                        property: 'tiltX',
                        from: (obj.tiltX ?? 0) - params.degrees,
                        to: (obj.tiltX ?? 0) + params.degrees,
                        duration: params.duration * 1000,
                        easing: params.easing,
                        pingpong: true
                    }
                ])
            },
            'tilt-sway-y': {
                name: 'Tilt Sway Y',
                category: 'combos',
                params: { degrees: 18, duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => this._buildTiltAnimation(obj, [
                    {
                        property: 'tiltY',
                        from: (obj.tiltY ?? 0) - params.degrees,
                        to: (obj.tiltY ?? 0) + params.degrees,
                        duration: params.duration * 1000,
                        easing: params.easing,
                        pingpong: true
                    }
                ])
            },
            'tilt-orbit': {
                name: 'Tilt Orbit',
                category: 'combos',
                params: { degrees: 16, duration: 1.4, easing: 'easeInOut' },
                generate: (obj, params) => this._buildTiltAnimation(obj, [
                    {
                        property: 'tiltX',
                        from: (obj.tiltX ?? 0) - params.degrees,
                        to: (obj.tiltX ?? 0) + params.degrees,
                        duration: params.duration * 1000,
                        easing: params.easing,
                        pingpong: true
                    },
                    {
                        property: 'tiltY',
                        from: (obj.tiltY ?? 0) + params.degrees,
                        to: (obj.tiltY ?? 0) - params.degrees,
                        duration: params.duration * 1000,
                        easing: params.easing,
                        pingpong: true
                    }
                ])
            },

            // === NEW COMBO ANIMATIONS (motion-graphics building blocks) ===
            'squash-stretch': {
                name: 'Squash & Stretch',
                category: 'combos',
                params: { amount: 0.35, duration: 0.6, easing: 'easeOut' },
                generate: (obj, params) => {
                    const a = Math.max(0.05, Math.min(0.9, parseFloat(params.amount) || 0.35));
                    const dur = Math.max(0.05, parseFloat(params.duration) || 0.6) * 1000;
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    return [
                        { property: 'scaleX', from: sx, to: sx * (1 + a), duration: dur * 0.35, easing: 'easeOut', pingpong: true },
                        { property: 'scaleY', from: sy, to: sy * (1 - a), duration: dur * 0.35, easing: 'easeOut', pingpong: true }
                    ];
                }
            },
            'mograph-pop': {
                name: 'Mograph Pop',
                category: 'combos',
                params: { scale: 1.18, degrees: 8, duration: 0.7, easing: 'easeOut' },
                generate: (obj, params) => {
                    const s = Math.max(1.01, parseFloat(params.scale) || 1.18);
                    const deg = parseFloat(params.degrees) || 8;
                    const dur = Math.max(0.1, parseFloat(params.duration) || 0.7) * 1000;
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    return [
                        { property: 'scaleX', from: 0, to: sx * s, duration: dur * 0.55, easing: 'easeOut' },
                        { property: 'scaleY', from: 0, to: sy * s, duration: dur * 0.55, easing: 'easeOut' },
                        { property: 'scaleX', from: sx * s, to: sx, duration: dur * 0.45, easing: 'elastic', delay: dur * 0.55 },
                        { property: 'scaleY', from: sy * s, to: sy, duration: dur * 0.45, easing: 'elastic', delay: dur * 0.55 },
                        { property: 'rotation', from: (obj.rotation || 0) - deg, to: (obj.rotation || 0), duration: dur, easing: 'easeOut' },
                        { property: 'opacity', from: 0, to: 1, duration: dur * 0.4, easing: 'easeOut' }
                    ];
                }
            },
            'smear-to-pose': {
                name: 'Smear To Pose',
                category: 'combos',
                params: { distance: 220, direction: 'right', stretch: 1.45, duration: 0.55, easing: 'easeOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'right';
                    const dist = Math.max(20, parseFloat(params.distance) || 220);
                    const stretch = Math.max(1.05, parseFloat(params.stretch) || 1.45);
                    const dur = Math.max(0.1, parseFloat(params.duration) || 0.55) * 1000;
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    const axis = (dir === 'up' || dir === 'down') ? 'y' : 'x';
                    const sign = (dir === 'right' || dir === 'down') ? 1 : -1;
                    const anticipate = -sign * dist * 0.15;
                    const start = (obj[axis] || 0) + anticipate;
                    const end = obj[axis] || 0;
                    const stretchAxis = axis === 'x' ? 'scaleX' : 'scaleY';
                    const baseStretch = axis === 'x' ? sx : sy;
                    return [
                        { property: axis, from: start, to: end, duration: dur, easing: params.easing || 'easeOut' },
                        { property: stretchAxis, from: baseStretch * stretch, to: baseStretch, duration: dur * 0.7, easing: 'easeOut' }
                    ];
                }
            },
            // NOTE: 'cinemagraph-loop' removed — the existing scale-category 'breathe'
            // and rotation tilt-sway combos cover the same perpetual breath/sway behavior.
            'hand-drawn-wobble': {
                name: 'Hand-drawn Wobble',
                category: 'combos',
                params: { jitter: 2, degrees: 1.2, duration: 0.18, easing: 'linear' },
                generate: (obj, params) => {
                    const jit = Math.max(0.2, parseFloat(params.jitter) || 2);
                    const deg = Math.max(0.1, parseFloat(params.degrees) || 1.2);
                    const dur = Math.max(0.05, parseFloat(params.duration) || 0.18) * 1000;
                    return [
                        { property: 'x', from: (obj.x || 0) - jit, to: (obj.x || 0) + jit, duration: dur, easing: 'linear', pingpong: true },
                        { property: 'y', from: (obj.y || 0) - jit * 0.7, to: (obj.y || 0) + jit * 0.7, duration: dur * 1.1, easing: 'linear', pingpong: true },
                        { property: 'rotation', from: (obj.rotation || 0) - deg, to: (obj.rotation || 0) + deg, duration: dur * 0.9, easing: 'linear', pingpong: true }
                    ];
                }
            },
            'anticipate-release': {
                name: 'Anticipate & Release',
                category: 'combos',
                params: { distance: 60, direction: 'right', duration: 0.9, easing: 'easeOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'right';
                    const d = Math.max(10, parseFloat(params.distance) || 60);
                    const dur = Math.max(0.1, parseFloat(params.duration) || 0.9) * 1000;
                    const axis = (dir === 'up' || dir === 'down') ? 'y' : 'x';
                    const sign = (dir === 'right' || dir === 'down') ? 1 : -1;
                    const base = obj[axis] || 0;
                    const pullBack = base - sign * d * 0.3;
                    const overshoot = base + sign * d * 1.15;
                    return [
                        { property: axis, from: base, to: pullBack, duration: dur * 0.25, easing: 'easeOut' },
                        { property: axis, from: pullBack, to: overshoot, duration: dur * 0.45, easing: 'easeIn', delay: dur * 0.25 },
                        { property: axis, from: overshoot, to: base, duration: dur * 0.3, easing: 'easeOut', delay: dur * 0.7 }
                    ];
                }
            },
            'overshoot-settle': {
                name: 'Overshoot Settle',
                category: 'combos',
                params: { scale: 1.25, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => {
                    const s = Math.max(1.05, parseFloat(params.scale) || 1.25);
                    const dur = Math.max(0.1, parseFloat(params.duration) || 0.8) * 1000;
                    const sx = obj.scaleX || 1;
                    const sy = obj.scaleY || 1;
                    return [
                        { property: 'scaleX', from: sx, to: sx * s, duration: dur * 0.4, easing: 'easeOut' },
                        { property: 'scaleY', from: sy, to: sy * s, duration: dur * 0.4, easing: 'easeOut' },
                        { property: 'scaleX', from: sx * s, to: sx * (1 - (s - 1) * 0.3), duration: dur * 0.3, easing: 'easeInOut', delay: dur * 0.4 },
                        { property: 'scaleY', from: sy * s, to: sy * (1 - (s - 1) * 0.3), duration: dur * 0.3, easing: 'easeInOut', delay: dur * 0.4 },
                        { property: 'scaleX', from: sx * (1 - (s - 1) * 0.3), to: sx, duration: dur * 0.3, easing: 'easeOut', delay: dur * 0.7 },
                        { property: 'scaleY', from: sy * (1 - (s - 1) * 0.3), to: sy, duration: dur * 0.3, easing: 'easeOut', delay: dur * 0.7 }
                    ];
                }
            },
            // NOTE: 'wiggle' removed — the existing rotation-category 'wobble' covers the
            // same pingpong rotation oscillation; users can lower wobble's degrees/duration
            // for a tighter wiggle effect.
            // NOTE: 'hover-float' removed — the existing movement-category 'float' already
            // provides a y-axis pingpong float (with optional rotation) and is more flexible.
            // NOTE: 'heartbeat' removed — the emphasis-category 'emph-heartbeat' covers the
            // same rhythmic scale pulse.
            // NOTE: 'flip-reveal' removed — the entry-category 'entry-flip' already provides
            // a scaleX-based flip entry with fade.

            // === ENTRY ANIMATIONS ===
            'entry-fade': {
                name: 'Fade In',
                category: 'entry',
                params: { direction: 'up', distance: 50, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'up';
                    const dist = params.distance || 50;
                    const dur = params.duration * 1000;
                    const props = [
                        { property: 'opacity', from: 0, to: 1, duration: dur, easing: params.easing }
                    ];
                    if (dir === 'up' || dir === 'up-left' || dir === 'up-right')
                        props.push({ property: 'y', from: obj.y + dist, to: obj.y, duration: dur, easing: params.easing });
                    else if (dir === 'down' || dir === 'down-left' || dir === 'down-right')
                        props.push({ property: 'y', from: obj.y - dist, to: obj.y, duration: dur, easing: params.easing });
                    if (dir === 'left' || dir === 'up-left' || dir === 'down-left')
                        props.push({ property: 'x', from: obj.x + dist, to: obj.x, duration: dur, easing: params.easing });
                    else if (dir === 'right' || dir === 'up-right' || dir === 'down-right')
                        props.push({ property: 'x', from: obj.x - dist, to: obj.x, duration: dur, easing: params.easing });
                    return props;
                }
            },
            'entry-zoom': {
                name: 'Zoom In',
                category: 'entry',
                params: { duration: 0.6, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 400, easing: 'easeOut' }
                ])
            },
            'entry-fly-left': {
                name: 'Fly In Left',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'x', from: -obj.width - 50, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-fly-right': {
                name: 'Fly In Right',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'x', from: this.stage.width + 50, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-fly-top': {
                name: 'Fly In Top',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'y', from: -obj.height - 50, to: obj.y, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-fly-bottom': {
                name: 'Fly In Bottom',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'y', from: this.stage.height + 50, to: obj.y, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-bounce': {
                name: 'Bounce In',
                category: 'entry',
                params: { duration: 1, easing: 'bounce' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: 'bounce' },
                    { property: 'scaleY', from: 0, to: 1, duration: params.duration * 1000, easing: 'bounce' },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-spin': {
                name: 'Spin In',
                category: 'entry',
                params: { degrees: 720, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-flip': {
                name: 'Flip In',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'rotation', from: obj.rotation - 90, to: obj.rotation, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 400, easing: 'easeOut' }
                ])
            },
            'entry-wipe': {
                name: 'Wipe In',
                category: 'entry',
                params: { direction: 'right', duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'right';
                    const clipMap = { right: '_clipWipeRight', left: '_clipWipeLeft', up: '_clipWipeUp', down: '_clipWipeDown' };
                    return [
                        { property: clipMap[dir] || '_clipWipeRight', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing }
                    ];
                }
            },
            'entry-strips': {
                name: 'Strips',
                category: 'entry',
                params: { direction: 'horizontal', duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'horizontal';
                    const prop = dir === 'vertical' ? '_clipStripsV' : '_clipStripsH';
                    return [
                        { property: prop, from: 0, to: 1, duration: params.duration * 1000, easing: params.easing }
                    ];
                }
            },
            'entry-wedge': {
                name: 'Wedge',
                category: 'entry',
                params: { duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: '_clipWedge', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'entry-tilt-left': {
                name: 'Tilt In Left',
                category: 'entry',
                params: { degrees: 16, distance: 90, duration: 0.9, easing: 'easeOut' },
                generate: (obj, params) => this._buildTiltAnimation(obj, [
                    { property: 'x', from: obj.x - params.distance, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                    { property: 'tiltY', from: (obj.tiltY ?? 0) - params.degrees, to: obj.tiltY ?? 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 550, easing: 'easeOut' }
                ])
            },
            'entry-tilt-right': {
                name: 'Tilt In Right',
                category: 'entry',
                params: { degrees: 16, distance: 90, duration: 0.9, easing: 'easeOut' },
                generate: (obj, params) => this._buildTiltAnimation(obj, [
                    { property: 'x', from: obj.x + params.distance, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                    { property: 'tiltY', from: (obj.tiltY ?? 0) + params.degrees, to: obj.tiltY ?? 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 550, easing: 'easeOut' }
                ])
            },

            // === EXIT ANIMATIONS ===
            'exit-fade': {
                name: 'Fade Out',
                category: 'exit',
                params: { direction: 'down', distance: 50, duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => {
                    const dir = params.direction || 'down';
                    const dist = params.distance || 50;
                    const dur = params.duration * 1000;
                    const props = [
                        { property: 'opacity', from: 1, to: 0, duration: dur, easing: params.easing }
                    ];
                    if (dir === 'up' || dir === 'up-left' || dir === 'up-right')
                        props.push({ property: 'y', from: obj.y, to: obj.y - dist, duration: dur, easing: params.easing });
                    else if (dir === 'down' || dir === 'down-left' || dir === 'down-right')
                        props.push({ property: 'y', from: obj.y, to: obj.y + dist, duration: dur, easing: params.easing });
                    if (dir === 'left' || dir === 'up-left' || dir === 'down-left')
                        props.push({ property: 'x', from: obj.x, to: obj.x - dist, duration: dur, easing: params.easing });
                    else if (dir === 'right' || dir === 'up-right' || dir === 'down-right')
                        props.push({ property: 'x', from: obj.x, to: obj.x + dist, duration: dur, easing: params.easing });
                    return props;
                }
            },
            'exit-zoom': {
                name: 'Zoom Out',
                category: 'exit',
                params: { duration: 0.6, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-fly-left': {
                name: 'Fly Out Left',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x, to: -obj.width - 50, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-fly-right': {
                name: 'Fly Out Right',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x, to: this.stage.width + 50, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-fly-top': {
                name: 'Fly Out Top',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'y', from: obj.y, to: -obj.height - 50, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-fly-bottom': {
                name: 'Fly Out Bottom',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'y', from: obj.y, to: this.stage.height + 50, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-shrink': {
                name: 'Shrink Out',
                category: 'exit',
                params: { duration: 0.6, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-spin': {
                name: 'Spin Out',
                category: 'exit',
                params: { degrees: 720, duration: 1, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'rotation', from: obj.rotation, to: obj.rotation + params.degrees, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleX', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-flip': {
                name: 'Flip Out',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'rotation', from: obj.rotation, to: obj.rotation + 90, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-collapse': {
                name: 'Collapse Out',
                category: 'exit',
                params: { direction: 'up', duration: 0.6, easing: 'easeIn' },
                generate: (obj, params) => {
                    const dir = params.direction || 'up';
                    const prop = (dir === 'left' || dir === 'right') ? 'width' : 'height';
                    const from = prop === 'width' ? obj.width : obj.height;
                    return [
                        { property: prop, from: from, to: 0, duration: params.duration * 1000, easing: params.easing },
                        { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                    ];
                }
            },
            'exit-tilt-left': {
                name: 'Tilt Out Left',
                category: 'exit',
                params: { degrees: 16, distance: 90, duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => this._buildTiltAnimation(obj, [
                    { property: 'x', from: obj.x, to: obj.x - params.distance, duration: params.duration * 1000, easing: params.easing },
                    { property: 'tiltY', from: obj.tiltY ?? 0, to: (obj.tiltY ?? 0) - params.degrees, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-tilt-right': {
                name: 'Tilt Out Right',
                category: 'exit',
                params: { degrees: 16, distance: 90, duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => this._buildTiltAnimation(obj, [
                    { property: 'x', from: obj.x, to: obj.x + params.distance, duration: params.duration * 1000, easing: params.easing },
                    { property: 'tiltY', from: obj.tiltY ?? 0, to: (obj.tiltY ?? 0) + params.degrees, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },

            // === EMPHASIS ANIMATIONS ===
            'emph-pulse': {
                name: 'Pulse',
                category: 'emphasis',
                params: { scale: 1.3, duration: 0.5, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: params.scale, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true },
                    { property: 'scaleY', from: 1, to: params.scale, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true }
                ])
            },
            'emph-shake': {
                name: 'Shake',
                category: 'emphasis',
                params: { direction: 'right', distance: 15, duration: 0.6, easing: 'linear' },
                generate: (obj, params) => {
                    const dir = params.direction || 'right';
                    const dist = params.distance || 15;
                    const prop = (dir === 'up' || dir === 'down') ? 'y' : 'x';
                    const base = prop === 'x' ? obj.x : obj.y;
                    return { property: prop, from: base - dist, to: base + dist, duration: params.duration * 200, easing: 'linear', pingpong: true };
                }
            },
            'emph-wobble': {
                name: 'Wobble',
                category: 'emphasis',
                params: { degrees: 20, distance: 30, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation + params.degrees, duration: params.duration * 1000, easing: 'easeInOut', pingpong: true },
                    { property: 'x', from: obj.x - params.distance, to: obj.x + params.distance, duration: params.duration * 500, easing: 'easeInOut', pingpong: true }
                ])
            },
            'emph-bounce': {
                name: 'Bounce',
                category: 'emphasis',
                params: { direction: 'up', distance: 30, duration: 0.8, easing: 'bounce' },
                generate: (obj, params) => {
                    const dir = params.direction || 'up';
                    const dist = params.distance || 30;
                    let prop, from, to;
                    if (dir === 'down') { prop = 'y'; from = obj.y; to = obj.y + dist; }
                    else if (dir === 'left') { prop = 'x'; from = obj.x; to = obj.x - dist; }
                    else if (dir === 'right') { prop = 'x'; from = obj.x; to = obj.x + dist; }
                    else { prop = 'y'; from = obj.y; to = obj.y - dist; }
                    return { property: prop, from, to, duration: params.duration * 1000, easing: 'bounce', pingpong: true };
                }
            },
            'emph-flash': {
                name: 'Flash',
                category: 'emphasis',
                params: { duration: 0.3, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'opacity', from: 1, to: 0,
                    duration: params.duration * 200, easing: 'linear', pingpong: true
                })
            },
            'emph-rubber': {
                name: 'Rubber Band',
                category: 'emphasis',
                params: { amount: 0.4, duration: 1, easing: 'elastic' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: 1 + params.amount, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'scaleY', from: 1 + params.amount, to: 1, duration: params.duration * 1000, easing: 'elastic' }
                ])
            },
            'emph-tada': {
                name: 'Tada',
                category: 'emphasis',
                params: { degrees: 10, scale: 1.1, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0.9, to: params.scale, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'scaleY', from: 0.9, to: params.scale, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation + params.degrees, duration: params.duration * 500, easing: 'easeInOut', pingpong: true }
                ])
            },
            'emph-jello': {
                name: 'Jello',
                category: 'emphasis',
                params: { amount: 0.2, duration: 1, easing: 'elastic' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1 + params.amount, to: 1, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'scaleY', from: 1 - params.amount, to: 1, duration: params.duration * 1000, easing: 'elastic' }
                ])
            },
            'emph-heartbeat': {
                name: 'Heartbeat',
                category: 'emphasis',
                params: { scale: 1.3, duration: 0.6, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: params.scale, duration: params.duration * 500, easing: 'easeInOut', pingpong: true },
                    { property: 'scaleY', from: 1, to: params.scale, duration: params.duration * 500, easing: 'easeInOut', pingpong: true }
                ])
            },
            'emph-swing': {
                name: 'Swing',
                category: 'emphasis',
                params: { degrees: 25, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation + params.degrees,
                    duration: params.duration * 1000, easing: 'easeInOut', pingpong: true
                })
            },
            'presenter-speak': {
                name: 'Presenter Speak',
                category: 'emphasis',
                requiresPresenterAvatar: true,
                params: { duration: 1.8, easing: 'easeInOut', repeat: '2', repeatMode: 'cycle', afterPlayback: 'return' },
                generate: (obj, params) => {
                    const frames = {
                        mouthOpen: [[0, 0.08], [0.18, 0.52], [0.38, 0.18], [0.58, 0.62], [0.78, 0.20], [1, 0.08]],
                        smile: [[0, 0.22], [0.50, 0.28], [1, 0.22]],
                        browRaise: [[0, 0], [0.40, 0.8], [0.82, 0.15], [1, 0]],
                        headNod: [[0, 0], [0.42, 0.65], [0.76, -0.25], [1, 0]]
                    };
                    return [
                        ...this._generateSvgAvatarMotion(obj, params, frames),
                        ...this._generateSvgAfricanFaceMotion(obj, params, this._getSvgAfricanFaceAnimationFrameMap('speaking') || frames)
                    ];
                }
            },
            'presenter-listen': {
                name: 'Presenter Listen',
                category: 'emphasis',
                requiresPresenterAvatar: true,
                params: { duration: 1.6, easing: 'easeInOut', repeat: '2', repeatMode: 'cycle', afterPlayback: 'return' },
                generate: (obj, params) => {
                    const frames = {
                        listening: [[0, 0.25], [0.35, 1], [0.75, 0.45], [1, 0.25]],
                        gazeX: [[0, -1.5], [0.45, 1.5], [1, 0]],
                        gazeY: [[0, 0], [0.50, 1], [1, 0]],
                        browRaise: [[0, 0.8], [0.55, 1.6], [1, 0.6]],
                        headNod: [[0, 0], [0.42, 3], [0.72, -1], [1, 0]],
                        mouthOpen: [[0, 0.02], [1, 0.02]]
                    };
                    return [
                        ...this._generateSvgAvatarMotion(obj, params, frames),
                        ...this._generateSvgAfricanFaceMotion(obj, params, this._getSvgAfricanFaceAnimationFrameMap('listening') || frames)
                    ];
                }
            },
            'presenter-blink': {
                name: 'Presenter Blink',
                category: 'emphasis',
                requiresPresenterAvatar: true,
                params: { duration: 0.28, easing: 'linear', repeat: '1', repeatMode: 'restart', afterPlayback: 'return' },
                generate: (obj, params) => {
                    const frames = { blink: [[0, 0], [0.42, 1], [0.62, 1], [1, 0]] };
                    return [
                        ...this._generateSvgAvatarMotion(obj, params, frames),
                        ...this._generateSvgAfricanFaceMotion(obj, params, this._getSvgAfricanFaceAnimationFrameMap('blink') || frames)
                    ];
                }
            },
            'presenter-emphasis': {
                name: 'Presenter Emphasis',
                category: 'emphasis',
                requiresPresenterAvatar: true,
                params: { duration: 1, easing: 'easeInOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'return' },
                generate: (obj, params) => {
                    const frames = {
                        browRaise: [[0, 0], [0.42, 2.8], [1, 0]],
                        gazeX: [[0, 0], [0.45, 2.2], [1, 0]],
                        headTilt: [[0, 0], [0.45, -3], [1, 0]],
                        torsoSway: [[0, 0], [0.45, 2], [1, 0]],
                        handEmphasis: [[0, 0], [0.45, 1], [1, 0]]
                    };
                    return [
                        ...this._generateSvgAvatarMotion(obj, params, frames),
                        ...this._generateSvgAfricanFaceMotion(obj, params, this._getSvgAfricanFaceAnimationFrameMap('emphasis') || frames)
                    ];
                }
            },
            'svg-african-speak': {
                name: 'SVG African Speak',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 1.8, easing: 'easeInOut', repeat: '2', repeatMode: 'cycle', afterPlayback: 'return' },
                generate: (obj, params) => this._generateSvgAfricanFaceMotion(
                    obj,
                    params,
                    this._getSvgAfricanFaceAnimationFrameMap('speaking')
                )
            },
            'svg-african-listen': {
                name: 'SVG African Listen',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 1.6, easing: 'easeInOut', repeat: '2', repeatMode: 'cycle', afterPlayback: 'return' },
                generate: (obj, params) => this._generateSvgAfricanFaceMotion(
                    obj,
                    params,
                    this._getSvgAfricanFaceAnimationFrameMap('listening')
                )
            },
            'svg-african-blink': {
                name: 'SVG African Blink',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 0.28, easing: 'linear', repeat: '1', repeatMode: 'restart', afterPlayback: 'return' },
                generate: (obj, params) => this._generateSvgAfricanFaceMotion(
                    obj,
                    params,
                    this._getSvgAfricanFaceAnimationFrameMap('blink')
                )
            },
            'svg-african-emphasis': {
                name: 'SVG African Emphasis',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 1, easing: 'easeInOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'return' },
                generate: (obj, params) => this._generateSvgAfricanFaceMotion(
                    obj,
                    params,
                    this._getSvgAfricanFaceAnimationFrameMap('emphasis')
                )
            },
            'svg-african-rear-3q-face-reveal': {
                name: 'SVG African Back 3/4 Face Reveal',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                requiresSvgAfricanThreeQuarter: true,
                allowDisjointPropertyOverlap: true,
                params: { amount: 0.52, duration: 2, easing: 'easeInOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'return', startMode: 'with-previous' },
                generate: (obj, params) => {
                    const parsedAmount = Number(params?.amount);
                    const amount = Math.max(0, Math.min(1, Number.isFinite(parsedAmount) ? parsedAmount : 0.52));
                    const current = Math.max(0, Math.min(1, Number(this._getSvgAfricanFaceMotionValue(obj, 'rearFaceReveal')) || 0));
                    return this._generateSvgAfricanFaceMotion(obj, params, {
                        rearFaceReveal: [[0, current], [0.16, amount], [0.84, amount], [1, current]]
                    }).map(config => ({
                        ...config,
                        _svgAfricanRear3qFaceReveal: true
                    }));
                }
            },
            'svg-african-face-neutral': {
                name: 'SVG African Face Neutral',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 0.35, easing: 'easeInOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'keep' },
                generate: (obj, params) => this._generateSvgAfricanFacePresetMotion(obj, params, 'neutral')
            },
            'svg-african-warm-smile': {
                name: 'SVG African Warm Smile',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 0.45, easing: 'easeOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'keep' },
                generate: (obj, params) => this._generateSvgAfricanFacePresetMotion(obj, params, 'warm-smile')
            },
            'svg-african-speaking-face': {
                name: 'SVG African Speaking Face',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 0.35, easing: 'easeOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'keep' },
                generate: (obj, params) => this._generateSvgAfricanFacePresetMotion(obj, params, 'speaking')
            },
            'svg-african-listening-face': {
                name: 'SVG African Listening Face',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 0.4, easing: 'easeOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'keep' },
                generate: (obj, params) => this._generateSvgAfricanFacePresetMotion(obj, params, 'listening')
            },
            'svg-african-serious-focus': {
                name: 'SVG African Serious Focus',
                category: 'emphasis',
                requiresSvgAfricanPremium: true,
                allowDisjointPropertyOverlap: true,
                params: { duration: 0.45, easing: 'easeInOut', repeat: '1', repeatMode: 'restart', afterPlayback: 'keep' },
                generate: (obj, params) => this._generateSvgAfricanFacePresetMotion(obj, params, 'serious-focus')
            },

            // === ADDITIONAL POWERPOINT ENTRY ANIMATIONS ===
            'entry-split': {
                name: 'Split',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 400, easing: 'easeOut' }
                ])
            },
            'entry-wheel': {
                name: 'Wheel',
                category: 'entry',
                params: { spokes: 4, duration: 1.2, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: '_clipWheel', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'entry-float-up': {
                name: 'Float Up',
                category: 'entry',
                params: { distance: 60, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'y', from: obj.y + params.distance, to: obj.y, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 600, easing: 'easeOut' }
                ])
            },
            'entry-float-down': {
                name: 'Float Down',
                category: 'entry',
                params: { distance: 60, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'y', from: obj.y - params.distance, to: obj.y, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 600, easing: 'easeOut' }
                ])
            },
            'entry-float-left': {
                name: 'Float Left',
                category: 'entry',
                params: { distance: 60, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x + params.distance, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 600, easing: 'easeOut' }
                ])
            },
            'entry-float-right': {
                name: 'Float Right',
                category: 'entry',
                params: { distance: 60, duration: 1, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x - params.distance, to: obj.x, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 600, easing: 'easeOut' }
                ])
            },
            'entry-grow-turn': {
                name: 'Grow & Turn',
                category: 'entry',
                params: { degrees: 90, duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 0, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-rise-up': {
                name: 'Rise Up',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'y', from: this.stage.height + 50, to: obj.y, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 0.5, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 400, easing: 'easeOut' }
                ])
            },
            'entry-swivel': {
                name: 'Swivel',
                category: 'entry',
                params: { duration: 0.8, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'rotation', from: obj.rotation - 45, to: obj.rotation, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 300, easing: 'easeOut' }
                ])
            },
            'entry-expand': {
                name: 'Expand',
                category: 'entry',
                params: { duration: 0.6, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0.1, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 0.1, to: 1, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'entry-compress': {
                name: 'Compress',
                category: 'entry',
                params: { duration: 0.6, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 3, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 3, to: 1, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 400, easing: 'easeOut' }
                ])
            },
            'entry-stretchy': {
                name: 'Stretchy',
                category: 'entry',
                params: { duration: 1, easing: 'elastic' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 0, to: 1, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'scaleY', from: 2, to: 1, duration: params.duration * 1000, easing: 'elastic' },
                    { property: 'opacity', from: 0, to: 1, duration: params.duration * 200, easing: 'easeOut' }
                ])
            },

            // === ADDITIONAL POWERPOINT EXIT ANIMATIONS ===
            'exit-split': {
                name: 'Split Out',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-wheel': {
                name: 'Wheel Out',
                category: 'exit',
                params: { duration: 1, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: '_clipWheel', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-wipe': {
                name: 'Wipe Out',
                category: 'exit',
                params: { direction: 'left', duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'left';
                    const clipMap = { right: '_clipWipeRight', left: '_clipWipeLeft', up: '_clipWipeUp', down: '_clipWipeDown' };
                    return [
                        { property: clipMap[dir] || '_clipWipeLeft', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                    ];
                }
            },
            'exit-strips': {
                name: 'Strips Out',
                category: 'exit',
                params: { direction: 'horizontal', duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'horizontal';
                    const prop = dir === 'vertical' ? '_clipStripsV' : '_clipStripsH';
                    return [
                        { property: prop, from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                    ];
                }
            },
            'exit-wedge': {
                name: 'Wedge Out',
                category: 'exit',
                params: { duration: 1.2, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: '_clipWedge', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-float-up': {
                name: 'Float Up Out',
                category: 'exit',
                params: { distance: 60, duration: 1, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'y', from: obj.y, to: obj.y - params.distance, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-float-down': {
                name: 'Float Down Out',
                category: 'exit',
                params: { distance: 60, duration: 1, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'y', from: obj.y, to: obj.y + params.distance, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-float-left': {
                name: 'Float Left Out',
                category: 'exit',
                params: { distance: 60, duration: 1, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x, to: obj.x - params.distance, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-float-right': {
                name: 'Float Right Out',
                category: 'exit',
                params: { distance: 60, duration: 1, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x, to: obj.x + params.distance, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-sink-down': {
                name: 'Sink Down',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'y', from: obj.y, to: this.stage.height + 50, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 1, to: 0.5, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-swivel': {
                name: 'Swivel Out',
                category: 'exit',
                params: { duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'rotation', from: obj.rotation, to: obj.rotation + 45, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'exit-shrink-turn': {
                name: 'Shrink & Turn',
                category: 'exit',
                params: { degrees: 90, duration: 0.8, easing: 'easeIn' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing },
                    { property: 'rotation', from: obj.rotation, to: obj.rotation + params.degrees, duration: params.duration * 1000, easing: params.easing },
                    { property: 'opacity', from: 1, to: 0, duration: params.duration * 1000, easing: params.easing }
                ])
            },

            // === ADDITIONAL POWERPOINT EMPHASIS ANIMATIONS ===
            'emph-grow-shrink': {
                name: 'Grow/Shrink',
                category: 'emphasis',
                params: { scale: 1.5, duration: 0.8, easing: 'easeInOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: 1, to: params.scale, duration: params.duration * 1000, easing: params.easing },
                    { property: 'scaleY', from: 1, to: params.scale, duration: params.duration * 1000, easing: params.easing }
                ])
            },
            'emph-spin': {
                name: 'Spin',
                category: 'emphasis',
                params: { degrees: 360, duration: 1, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'rotation', from: obj.rotation, to: obj.rotation + params.degrees,
                    duration: params.duration * 1000, easing: params.easing
                })
            },
            'emph-teeter': {
                name: 'Teeter',
                category: 'emphasis',
                params: { degrees: 8, duration: 0.5, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation + params.degrees,
                    duration: params.duration * 500, easing: 'easeInOut', pingpong: true
                })
            },
            'emph-color-pulse': {
                name: 'Color Pulse',
                category: 'emphasis',
                params: { duration: 0.6, easing: 'easeInOut' },
                generate: (obj, params) => ({
                    property: 'opacity', from: 1, to: 0.4,
                    duration: params.duration * 500, easing: 'easeInOut', pingpong: true
                })
            },
            'emph-shimmer': {
                name: 'Shimmer',
                category: 'emphasis',
                params: { direction: 'right', distance: 10, duration: 0.4, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'right';
                    const dist = params.distance || 10;
                    const prop = (dir === 'up' || dir === 'down') ? 'y' : 'x';
                    const base = prop === 'x' ? obj.x : obj.y;
                    return { property: prop, from: base - dist, to: base + dist, duration: params.duration * 400, easing: 'easeInOut', pingpong: true };
                }
            },
            'emph-wave': {
                name: 'Wave',
                category: 'emphasis',
                params: { direction: 'up', distance: 20, degrees: 5, duration: 1, easing: 'easeInOut' },
                generate: (obj, params) => {
                    const dir = params.direction || 'up';
                    const dist = params.distance || 20;
                    const prop = (dir === 'left' || dir === 'right') ? 'x' : 'y';
                    const base = prop === 'x' ? obj.x : obj.y;
                    return [
                        { property: prop, from: base - dist, to: base + dist, duration: params.duration * 500, easing: 'easeInOut', pingpong: true },
                        { property: 'rotation', from: obj.rotation - params.degrees, to: obj.rotation + params.degrees, duration: params.duration * 500, easing: 'easeInOut', pingpong: true }
                    ];
                }
            },
            'emph-blink': {
                name: 'Blink',
                category: 'emphasis',
                params: { duration: 0.15, easing: 'linear' },
                generate: (obj, params) => ({
                    property: 'opacity', from: 1, to: 0,
                    duration: params.duration * 150, easing: 'linear', pingpong: true
                })
            },
            'emph-bold-reveal': {
                name: 'Bold Reveal',
                category: 'emphasis',
                params: { scale: 1.15, duration: 0.4, easing: 'easeOut' },
                generate: (obj, params) => ([
                    { property: 'scaleX', from: obj.scaleX, to: params.scale, duration: params.duration * 400, easing: params.easing },
                    { property: 'scaleY', from: obj.scaleY, to: params.scale, duration: params.duration * 400, easing: params.easing }
                ])
            },

            // === ADDITIONAL MOTION PATH ANIMATIONS ===
            'motion-circle': {
                name: 'Circle',
                category: 'movement',
                params: { radius: 100, turns: 1, duration: 3, easing: 'linear' },
                generate: (obj, params) => ({
                    type: 'orbit',
                    property: 'x',
                    cx: obj.x + obj.width / 2,
                    cy: obj.y + obj.height / 2,
                    radius: params.radius,
                    turns: Number.isFinite(parseFloat(params.turns)) ? parseFloat(params.turns) : 1,
                    duration: params.duration * 1000,
                    easing: params.easing
                })
            },
            'motion-figure8': {
                name: 'Figure 8',
                category: 'movement',
                params: { size: 80, duration: 4, easing: 'linear' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x - params.size, to: obj.x + params.size, duration: params.duration * 500, easing: 'easeInOut', pingpong: true },
                    { property: 'y', from: obj.y - params.size / 2, to: obj.y + params.size / 2, duration: params.duration * 250, easing: 'easeInOut', pingpong: true }
                ])
            },
            'motion-wave': {
                name: 'S-Curve',
                category: 'movement',
                params: { amplitude: 60, distance: 200, duration: 2, easing: 'linear' },
                generate: (obj, params) => ([
                    { property: 'x', from: obj.x, to: obj.x + params.distance, duration: params.duration * 1000, easing: 'linear' },
                    { property: 'y', from: obj.y, to: obj.y + params.amplitude, duration: params.duration * 500, easing: 'easeInOut', pingpong: true }
                ])
            },

            // === WALK CYCLE ANIMATIONS (icon frame-swap) ===
            'walk-cycle-side': {
                name: 'Walk Side',
                category: 'walk-cycle',
                params: { distance: 65, duration: 0.85, easing: 'linear' },
                generate: (obj, params) => {
                    if (obj.type !== 'icon') return [];
                    const facingLeft = (obj.scaleX || 1) * (obj.flipH ? -1 : 1) < 0;
                    return {
                        type: 'walk-cycle',
                        frames: AnimationEngine.WALK_FRAMES_SIDE,
                        fps: 8,
                        duration: params.duration * 1000,
                        easing: params.easing,
                        moveX: params.distance * (facingLeft ? -1 : 1),
                        bobFactor: 0.025
                    };
                }
            },
            'walk-cycle-front': {
                name: 'Walk Front',
                category: 'walk-cycle',
                params: { duration: 0.9, easing: 'linear' },
                generate: (obj, params) => {
                    if (obj.type !== 'icon') return [];
                    return {
                        type: 'walk-cycle',
                        frames: AnimationEngine.WALK_FRAMES_FRONT,
                        fps: 7,
                        duration: params.duration * 1000,
                        easing: params.easing,
                        moveX: 0,
                        bobFactor: 0.008
                    };
                }
            },
            'walk-cycle-run': {
                name: 'Run Side',
                category: 'walk-cycle',
                params: { distance: 100, duration: 0.36, easing: 'linear' },
                generate: (obj, params) => {
                    if (obj.type !== 'icon') return [];
                    const facingLeft = (obj.scaleX || 1) * (obj.flipH ? -1 : 1) < 0;
                    return {
                        type: 'walk-cycle',
                        frames: AnimationEngine.RUN_FRAMES_SIDE,
                        fps: 16,
                        duration: params.duration * 1000,
                        easing: params.easing,
                        moveX: params.distance * (facingLeft ? -1 : 1),
                        bobFactor: 0.10
                    };
                }
            }
        };
    }

    _applyEffectPreset(type, params = {}) {
        const preset = params.effectPreset || 'custom';
        if (!preset || preset === 'custom') return { ...params };
        const next = { ...params };
        const presets = {
            'soft-smoke': { explosionCount: 34, explosionRadius: 140, explosionSmokeSize: 42, explosionColor: '#94a3b8', smokeOpacity: 0.32 },
            'big-blast': { explosionCount: 54, explosionRadius: 300, explosionSmokeSize: 48, explosionColor: '#475569', shockwaveRings: 4, shockwaveRadius: 320 },
            'wet-paint': { paintColor: '#ec4899', paintWidth: 26, paintLength: 280, paintSplatter: 36, liquidPreset: 'paint' },
            'heavy-glitch': { glitchIntensity: 34, glitchSlices: 24, glitchColorShift: 22 },
            'cartoon-bounce': { bounceHeight: 220, bounceCompression: 1.32, duration: 0.9, easing: 'bounce' },
            'magic-blue': { portalColor: '#38bdf8', portalRadius: 120, portalSpokes: 28, shockwaveColor: '#38bdf8' },
            'electric-hot': { chargeBolts: 18, chargeRadius: 180, chargeColor: '#facc15', lightningColor: '#facc15', flameColor: '#facc15' },
            'dark-ink': { inkColor: '#020617', inkSpread: 180, inkDrops: 48 }
        };
        return { ...next, ...(presets[preset] || {}) };
    }

    _isEffectOverlayType(type) {
        return ['shoot-pellets', 'break-apart', 'ripple-wave', 'sparkle-burst', 'echo-trail', 'glow-aura', 'focus-pulse', 'confetti-burst', 'orbit-swarm', 'smoke-puff', 'lightning-arc', 'magnet-pull', 'scan-beam', 'lens-flare', 'pixel-burst', 'impact-burst', 'wave-distort', 'liquid-motion', 'melt-drip', 'brush-reveal', 'paint-reveal', 'swirl-tornado', 'fire-flicker', 'dust-away', 'freeze-crack', 'neon-trace', 'shadow-pop', 'explosion-smoke', 'paint-stroke', 'chromatic-glitch', 'shockwave-ring', 'magic-portal', 'glass-shatter', 'electric-charge', 'ink-bleed', 'motion-smear', 'stage-shake', 'camera-zoom', 'mask-reveal', 'path-trail', 'particle-fountain', 'light-sweep', 'weather-effect', 'bubble-rise', 'meteor-shower', 'spotlight-sweep', 'radial-rays', 'outline-pulse', 'speed-lines', 'starfield-warp', 'color-wash', 'halo-burst', 'shadow-cast', 'energy-shield', 'magnify-lens', 'rainbow-arc', 'vignette-pulse', 'scan-grid', 'draw-trace', 'morph-pulse', 'zoom-pop', 'elastic-warp', 'hover-sway', 'pulse-flash', 'boomerang-motion', 'snap-back', 'spin-pop', 'drift-fade', 'orbit-pulse', 'lift-drop', 'skid-slide', 'reveal-bounce', 'card-turn', 'page-turn', 'flap-swing', 'counter-roll', 'progress-bar', 'bar-chart', 'iris-reveal', 'clock-wipe', 'blinds-reveal', 'checker-reveal', 'diamond-wipe', 'whip-pan', 'rack-focus', 'letterbox-bars', 'hue-cycle', 'saturation-pulse', 'invert-flash', 'duotone-shift', 'tint-wash', 'karaoke-highlight', 'beat-pulse', 'waveform-bounce', 'vu-meter', 'old-film', 'vhs-scanlines', 'film-grain', 'crt-bend'].includes(type);
    }

    /**
     * Returns a Set of effect types best-suited to the currently selected object(s).
     * Used purely for visual hinting (border glow) in the animate panel.
     */
    _getSuggestedEffectTypes() {
        const suggested = new Set();
        try {
            const selected = this.objects?.getSelectedObjects?.() || [];
            if (!selected.length) return suggested;
            const kinds = new Set(selected.map(o => (o?.type || '').toLowerCase()));
            const has = (k) => kinds.has(k);
            if (has('text')) {
                ['typewriter', 'text-reveal', 'glitch-text', 'wavy-text', 'neon-flicker', 'shake', 'bounce', 'pulse', 'glow-aura', 'outline-pulse', 'color-wash', 'brush-reveal', 'paint-reveal', 'ink-bleed', 'wobble', 'emph-heartbeat', 'entry-flip'].forEach(t => suggested.add(t));
            }
            if (has('image') || has('svg')) {
                ['fade-in', 'zoom-in', 'zoom-pop', 'slide-in', 'reveal-bounce', 'mask-reveal', 'brush-reveal', 'paint-reveal', 'paint-stroke', 'glow-aura', 'lens-flare', 'vignette-pulse', 'parallax-drift', 'tilt-orbit', 'breathe', 'float', 'entry-flip'].forEach(t => suggested.add(t));
            }
            if (selected.some(o => this._getSvgAfricanPremiumHeadObject?.(o))) {
                [
                    'svg-african-speak',
                    'svg-african-listen',
                    'svg-african-blink',
                    'svg-african-emphasis',
                    'svg-african-face-neutral',
                    'svg-african-warm-smile',
                    'svg-african-speaking-face',
                    'svg-african-listening-face',
                    'svg-african-serious-focus'
                ].forEach(t => suggested.add(t));
            }
            if (has('shape') || has('rect') || has('circle') || has('polygon')) {
                ['pop', 'morph-pulse', 'elastic-warp', 'spin-pop', 'shockwave-ring', 'pulse-flash', 'halo-burst', 'outline-pulse', 'mograph-pop', 'squash-stretch', 'overshoot-settle', 'emph-heartbeat', 'wobble'].forEach(t => suggested.add(t));
            }
            if (has('group') || has('joint-rig') || has('rig')) {
                ['hover-sway', 'lift-drop', 'reveal-bounce', 'smear-to-pose', 'hand-drawn-wobble', 'tilt-orbit', 'walk-cycle', 'anticipate-release', 'float'].forEach(t => suggested.add(t));
            }
        } catch (_) { /* non-fatal */ }
        return suggested;
    }


    // Helper methods for animation generation
    getDirectionProperty(dir) {
        // Diagonal directions return 'x' as primary; secondary handled via array return
        return (dir === 'up' || dir === 'down') ? 'y' : 'x';
    }

    getDirectionFrom(obj, dir) {
        return (dir === 'up' || dir === 'down') ? obj.y : obj.x;
    }

    getDirectionTo(obj, dir, distance) {
        const sw = this.stage.width;
        const sh = this.stage.height;
        switch (dir) {
            case 'right': return Math.min(obj.x + distance, sw - obj.width);
            case 'left':  return Math.max(obj.x - distance, 0);
            case 'up':    return Math.max(obj.y - distance, 0);
            case 'down':  return Math.min(obj.y + distance, sh - obj.height);
            // Diagonal: return primary axis (x) target
            case 'up-right':   return Math.min(obj.x + distance * Math.cos(Math.PI / 4), sw - obj.width);
            case 'down-right': return Math.min(obj.x + distance * Math.cos(Math.PI / 4), sw - obj.width);
            case 'down-left':  return Math.max(obj.x - distance * Math.cos(Math.PI / 4), 0);
            case 'up-left':    return Math.max(obj.x - distance * Math.cos(Math.PI / 4), 0);
            default:      return Math.min(obj.x + distance, sw - obj.width);
        }
    }

    // Get secondary axis (Y) target for diagonal directions
    getDirectionToY(obj, dir, distance) {
        const sh = this.stage.height;
        switch (dir) {
            case 'up-right':   return Math.max(obj.y - distance * Math.sin(Math.PI / 4), 0);
            case 'up-left':    return Math.max(obj.y - distance * Math.sin(Math.PI / 4), 0);
            case 'down-right': return Math.min(obj.y + distance * Math.sin(Math.PI / 4), sh - obj.height);
            case 'down-left':  return Math.min(obj.y + distance * Math.sin(Math.PI / 4), sh - obj.height);
            default: return obj.y;
        }
    }

    isDiagonal(dir) {
        return ['up-right', 'down-right', 'down-left', 'up-left'].includes(dir);
    }

    // Generate movement properties - returns single object for cardinal, array for diagonal
    generateMovementProps(obj, params, opts = {}) {
        const dir = params.direction;
        const distance = params.distance;
        const duration = (opts.duration || params.duration) * 1000;
        const easing = opts.easing || params.easing;

        if (this.isDiagonal(dir)) {
            return [
                {
                    property: 'x',
                    from: opts.fromX !== undefined ? opts.fromX : obj.x,
                    to: this.getDirectionTo(obj, dir, distance),
                    duration, easing,
                    ...(opts.extra || {})
                },
                {
                    property: 'y',
                    from: opts.fromY !== undefined ? opts.fromY : obj.y,
                    to: this.getDirectionToY(obj, dir, distance),
                    duration, easing,
                    ...(opts.extra || {})
                }
            ];
        }
        return {
            property: this.getDirectionProperty(dir),
            from: opts.from !== undefined ? opts.from : this.getDirectionFrom(obj, dir),
            to: this.getDirectionTo(obj, dir, distance),
            duration, easing,
            ...(opts.extra || {})
        };
    }

    getOffscreenPosition(obj, dir) {
        const sw = this.stage.width;
        const sh = this.stage.height;
        switch (dir) {
            case 'left': return { prop: 'x', value: -obj.width - 50 };
            case 'right': return { prop: 'x', value: sw + 50 };
            case 'up': return { prop: 'y', value: -obj.height - 50 };
            case 'down': return { prop: 'y', value: sh + 50 };
            case 'up-right': return { props: ['x', 'y'], values: [sw + 50, -obj.height - 50] };
            case 'down-right': return { props: ['x', 'y'], values: [sw + 50, sh + 50] };
            case 'down-left': return { props: ['x', 'y'], values: [-obj.width - 50, sh + 50] };
            case 'up-left': return { props: ['x', 'y'], values: [-obj.width - 50, -obj.height - 50] };
            default: return { prop: 'x', value: -obj.width - 50 };
        }
    }

    _supportsTiltAnimation(obj) {
        if (typeof StageObject !== 'undefined' && typeof StageObject.supportsTiltType === 'function') {
            return StageObject.supportsTiltType(obj.type);
        }
        return obj.type === 'image' || obj.type === 'icon';
    }

    _buildTiltAnimation(obj, configs) {
        if (!this._supportsTiltAnimation(obj)) {
            return [];
        }
        return configs;
    }

    _supportsAnimationSpeed(type, def) {
        if (!def) return false;
        if (def.params?.animationSpeed !== undefined) return true;
        if (def.category === 'movement' || def.category === 'rotation') return true;
        if (def.params?.degrees !== undefined || def.params?.turns !== undefined) return true;
        return [
            'rotate',
            'spin',
            'rotation',
            'entry-spin',
            'flip',
            'orbit',
            'follow-path',
            'figure-eight',
            'spiral-path',
            'brownian-drift',
            'heart-path'
        ].some(key => String(type || '').includes(key));
    }

    _getAnimationSpeedFactor(params = {}) {
        const raw = parseFloat(params.animationSpeed);
        return Number.isFinite(raw) ? Math.max(0.05, Math.min(20, raw)) : 1;
    }

    _scaleRangeAroundMidpoint(from, to, speed) {
        if (!Number.isFinite(from) || !Number.isFinite(to)) return { from, to };
        const mid = (from + to) / 2;
        const half = (to - from) / 2;
        return {
            from: mid - half * speed,
            to: mid + half * speed
        };
    }

    _applyAnimationSpeedIntensity(config, speed, def) {
        if (!config || speed === 1) return config;
        const next = { ...config };

        if (Number.isFinite(next.turns)) {
            next.turns *= speed;
        }

        if (next.property === 'rotation' && Number.isFinite(next.from) && Number.isFinite(next.to)) {
            if (next.pingpong) {
                Object.assign(next, this._scaleRangeAroundMidpoint(next.from, next.to, speed));
            } else if (def?.category === 'entry') {
                next.from = next.to - ((next.to - next.from) * speed);
            } else {
                next.to = next.from + ((next.to - next.from) * speed);
            }
        } else if ((next.property === 'x' || next.property === 'y') && next.pingpong && Number.isFinite(next.from) && Number.isFinite(next.to)) {
            Object.assign(next, this._scaleRangeAroundMidpoint(next.from, next.to, speed));
        }

        return next;
    }

    _resolveGeneratedConfigs(def, obj, params, type = this.selectedAnimType) {
        if (!def) return [];
        const presetParams = this._applyEffectPreset(def?.name ? type : '', params);
        const generated = def.generate(obj, presetParams);
        if (!generated) return [];
        const speed = this._getAnimationSpeedFactor(presetParams);
        return (Array.isArray(generated) ? generated : [generated]).filter(Boolean).map(config => {
            const speedConfig = this._applyAnimationSpeedIntensity(config, speed, def);
            if (config?.type && this._isEffectOverlayType(config.type)) {
                return {
                    ...speedConfig,
                    blendMode: presetParams.effectBlendMode || speedConfig.blendMode || 'source-over',
                    effectObjectMode: presetParams.effectObjectMode || speedConfig.effectObjectMode || 'auto'
                };
            }
            return speedConfig;
        });
    }

    _normalizeAfterPlayback(value, fallback = 'return') {
        return value === 'keep' || value === 'return' ? value : fallback;
    }

    _getDefaultAfterPlaybackForDefinition(type, def) {
        const explicit = def?.params?.afterPlayback;
        if (explicit === 'keep' || explicit === 'return') {
            return explicit;
        }
        return def?.category === 'emphasis' ? 'return' : 'keep';
    }

    _inferAfterPlaybackFromGenerated(generated) {
        const configs = (Array.isArray(generated) ? generated : [generated]).filter(Boolean);
        const persistentTypes = new Set([
            'orbit',
            'path-follow',
            'typewriter',
            'topple',
            'topple-line',
            'walk-cycle',
            'bone-pose',
            'joint-rotation',
            'continuous',
            'part-keyframe'
        ]);

        for (const config of configs) {
            if (!config) continue;
            if (persistentTypes.has(config.type)) {
                return 'keep';
            }
            if (typeof config.property === 'string' && !config.pingpong && config.from !== config.to) {
                return 'keep';
            }
        }

        return 'return';
    }

    _getAnimationAfterPlayback(anim, fallback = 'return') {
        if (!anim) return fallback;

        if (anim.type === 'path-follow') {
            return 'keep';
        }

        const generatedConfigs = this._sanitizeGeneratedConfigsForAnimation(anim, anim.generated);
        if (generatedConfigs.some(config => config.type === 'path-follow')) {
            return 'keep';
        }

        const explicit = anim.afterPlayback ?? anim.params?.afterPlayback;
        if (explicit === 'keep' || explicit === 'return') {
            return explicit;
        }

        if (anim.generated) {
            return this._inferAfterPlaybackFromGenerated(anim.generated);
        }

        if (anim.type && this.library?.[anim.type]) {
            return this._getDefaultAfterPlaybackForDefinition(anim.type, this.library[anim.type]);
        }

        return fallback;
    }

    _animationKeepsFinalState(anim) {
        return this._getAnimationAfterPlayback(anim) === 'keep';
    }

    _getAnimationRepeatCount(anim) {
        if (!anim) return 1;
        if (anim.repeat === '-1' || anim.repeat === true) return Infinity;
        if (anim.repeat === 'pingpong') return 1;

        const parsed = parseInt(anim.repeatCount ?? anim.repeat, 10);
        return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    }

    _getAnimationPlaybackState(anim, duration, elapsed) {
        const keepsFinalState = this._animationKeepsFinalState(anim);
        const repeatCount = this._getAnimationRepeatCount(anim);
        const totalDuration = Number.isFinite(duration) && duration > 0 && repeatCount !== Infinity
            ? duration * repeatCount
            : Infinity;

        if (!Number.isFinite(duration) || duration <= 0 || elapsed < 0) {
            return { apply: false, elapsed, repeatCount, totalDuration, keepsFinalState };
        }

        if (repeatCount === Infinity) {
            return { apply: true, elapsed, repeatCount, totalDuration, keepsFinalState };
        }

        if (elapsed < totalDuration) {
            return { apply: true, elapsed, repeatCount, totalDuration, keepsFinalState };
        }

        if (!keepsFinalState) {
            return { apply: false, elapsed, repeatCount, totalDuration, keepsFinalState };
        }

        return { apply: true, elapsed: totalDuration, repeatCount, totalDuration, keepsFinalState };
    }

    _applyPersistentPlaybackState(preservedTime) {
        if (!(this.originalStates instanceof Map) || preservedTime <= 0) return false;

        const hasPersistentAnimations = this.objects.objects.some(obj =>
            (obj.animations || []).some(anim => this._animationKeepsFinalState(anim))
        );
        if (!hasPersistentAnimations) return false;

        this.applyAnimationsAtTime(preservedTime, { finalPose: true, persistentOnly: true });
        return true;
    }

    _resolvePathFollowConfig(anim, config) {
        if (!anim || !config || config.type !== 'path-follow') return config;

        const params = anim.params || {};
        const pathShapeId = params.pathShapeId;
        const pathManager = window.app?.pathAnimation;
        const pathObj = pathShapeId ? this.objects.getObjectById(pathShapeId) : null;
        if (!pathManager || !pathObj || typeof pathManager.getShapePath !== 'function' || typeof pathManager._buildTravelPath !== 'function') {
            return config;
        }

        const parsedStart = parseFloat(params.startPct);
        const parsedEnd = parseFloat(params.endPct);
        const startPct = Number.isFinite(parsedStart) ? parsedStart / 100 : 0;
        const endPct = Number.isFinite(parsedEnd) ? parsedEnd / 100 : 1;

        try {
            const basePoints = pathManager.getShapePath(pathObj, 300);
            const travelPath = pathManager._buildTravelPath(pathObj, basePoints, startPct, endPct, !!params.reverseDirection);
            if (travelPath?.points?.length >= 2) {
                config.pathPoints = travelPath.points;
            }
        } catch (_) {
            return config;
        }

        return config;
    }

    _collectAnimationProperties(source, properties = new Set()) {
        if (!source) return properties;
        if (Array.isArray(source)) {
            source.forEach(item => this._collectAnimationProperties(item, properties));
            return properties;
        }
        if (typeof source === 'object') {
            if (typeof source.property === 'string' && !source.property.startsWith('_')) {
                properties.add(source.property);
            }
            if (Array.isArray(source.properties)) {
                source.properties.forEach(property => {
                    if (typeof property === 'string' && !property.startsWith('_')) properties.add(property);
                });
            }
            Object.values(source).forEach(value => this._collectAnimationProperties(value, properties));
        }
        return properties;
    }

    _canLayerDisjointAnimation(def, generated, existingAnim) {
        if (!def?.allowDisjointPropertyOverlap) return false;
        const nextProperties = this._collectAnimationProperties(generated);
        const existingProperties = this._collectAnimationProperties(existingAnim?.generated);
        if (!nextProperties.size || !existingProperties.size) return false;
        return Array.from(nextProperties).every(property => !existingProperties.has(property));
    }

    _formatAnimationPropertyLabel(property) {
        const labels = {
            x: 'X',
            y: 'Y',
            rotation: 'Z Rotation',
            depth: 'Depth',
            tiltX: 'X Tilt',
            tiltY: 'Y Tilt',
            scaleX: 'Scale X',
            scaleY: 'Scale Y',
            opacity: 'Opacity',
            width: 'Width',
            height: 'Height',
            fill: 'Fill',
            stroke: 'Stroke',
            strokeWidth: 'Stroke Width',
            borderRadius: 'Corner Radius',
            svgAvatarState: 'Presenter State',
            svgAvatar_blink: 'Presenter Blink',
            svgAvatar_mouthOpen: 'Presenter Mouth',
            svgAvatar_smile: 'Presenter Smile',
            svgAvatar_gazeX: 'Presenter Gaze X',
            svgAvatar_gazeY: 'Presenter Gaze Y',
            svgAvatar_browRaise: 'Presenter Brows',
            svgAvatar_headNod: 'Presenter Head Nod',
            svgAvatar_headTilt: 'Presenter Head Tilt',
            svgAvatar_torsoSway: 'Presenter Torso',
            svgAvatar_handEmphasis: 'Presenter Hands',
            svgAvatar_listening: 'Presenter Listen',
            svgAfricanFaceState: 'SVG African Face State',
            svgAfricanAdjustments: 'SVG African Shape State',
            svgAfricanFace_blink: 'SVG African Blink',
            svgAfricanFace_mouthOpen: 'SVG African Mouth',
            svgAfricanFace_mouthWide: 'SVG African Mouth Width',
            svgAfricanFace_mouthRound: 'SVG African Mouth Roundness',
            svgAfricanFace_lipPress: 'SVG African Lip Press',
            svgAfricanFace_jawOpen: 'SVG African Jaw',
            svgAfricanFace_upperLipLift: 'SVG African Upper Lip',
            svgAfricanFace_lowerLipDrop: 'SVG African Lower Lip',
            svgAfricanFace_smile: 'SVG African Smile',
            svgAfricanFace_gazeX: 'SVG African Gaze X',
            svgAfricanFace_gazeY: 'SVG African Gaze Y',
            svgAfricanFace_browRaise: 'SVG African Brows',
            svgAfricanFace_headNod: 'SVG African Head Nod',
            svgAfricanFace_headTilt: 'SVG African Head Tilt',
            svgAfricanFace_headTurn: 'SVG African Head Turn',
            svgAfricanFace_rearFaceReveal: 'SVG African Rear Face Reveal',
            svgAfricanFace_listening: 'SVG African Listen'
        };
        if (labels[property]) return labels[property];
        if (String(property || '').startsWith('svgAvatar_')) {
            return String(property).replace(/^svgAvatar_/, 'Presenter ')
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, ch => ch.toUpperCase());
        }
        if (String(property || '').startsWith('svgAfricanFace_')) {
            return String(property).replace(/^svgAfricanFace_/, 'SVG African ')
                .replace(/([A-Z])/g, ' $1')
                .replace(/^./, ch => ch.toUpperCase());
        }
        return property.replace(/([A-Z])/g, ' $1').replace(/^./, ch => ch.toUpperCase());
    }

    _getAnimationPropertySummary(anim) {
        const collected = Array.from(this._collectAnimationProperties(anim.generated));
        if (!collected.length) {
            return [];
        }
        const visible = collected.slice(0, 4).map(prop => this._formatAnimationPropertyLabel(prop));
        if (collected.length > 4) {
            visible.push(`+${collected.length - 4}`);
        }
        return visible;
    }

    _hexToRgb(hex) {
        if (!hex || typeof hex !== 'string') return null;
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
        if (hex.length !== 6) return null;
        return {
            r: parseInt(hex.substring(0, 2), 16),
            g: parseInt(hex.substring(2, 4), 16),
            b: parseInt(hex.substring(4, 6), 16)
        };
    }

    _isArmatureOrFacialAnimatedObject(obj) {
        return !!(
            obj?._armatureRoleKey || obj?.armatureRoleKey ||
            obj?._armaturePartKey || obj?.armaturePartKey ||
            obj?._ucCharacterFamilyId || obj?.ucCharacterFamilyId ||
            obj?._ucCharacterVariantKey || obj?.ucCharacterVariantKey ||
            obj?._ucGarmentLayer || obj?.ucGarmentLayer ||
            obj?._ucGarmentPartKey || obj?.ucGarmentPartKey ||
            obj?._facialParentHead || obj?.facialParentHead ||
            obj?.bodyPartData?.partKey || obj?.bodyPartData?.roleKey ||
            (Array.isArray(obj?.joints) && obj.joints.length)
        );
    }

    _isSvgPresenterAvatarObject(obj) {
        return !!(obj?.type === 'image' && obj?._svgAvatar?.kind === 'presenter-avatar');
    }

    _getSvgAfricanPremiumHeadObject(seed) {
        const rawSeed = seed?.raw || seed;
        const allObjects = this.objects?.objects || [];
        const isPremium = obj => !!(
            obj &&
            (obj._characterAppearanceProvider === 'svg-african-premium' ||
                obj._svgCharacterPremiumPart === true ||
                obj._svgAfricanPremiumAssetId ||
                obj._svgCharacterPremiumAssetId ||
                obj._svgCharacterConfig?.assetCharacterId ||
                obj._svgCharacterConfig?.premiumAssetId)
        );
        const partKey = obj => obj?._svgCharacterPremiumPartKey || obj?._svgCharacterPartKey || obj?.bodyPartData?.partKey || '';
        const instanceId = obj => obj?._svgCharacterInstanceId || obj?._svgCharacterConfig?.instanceId || obj?._svgCharacterConfig?._svgCharacterInstanceId || '';
        const identityId = obj => obj?._svgCharacterIdentityId || obj?._svgCharacterConfig?.identityId || obj?._svgCharacterIdentity?.identityId || '';
        const headCandidates = () => allObjects.filter(obj => isPremium(obj) && obj?.type === 'image' && partKey(obj) === 'head-neck');

        if (isPremium(rawSeed) && rawSeed?.type === 'image' && partKey(rawSeed) === 'head-neck') return rawSeed;

        const byInstance = instanceId(rawSeed);
        if (byInstance) {
            const match = headCandidates().find(obj => instanceId(obj) === byInstance || obj._svgCharacterInstanceId === byInstance);
            if (match) return match;
        }

        const groupId = rawSeed?.groupId || rawSeed?._groupId || '';
        if (groupId) {
            const grouped = headCandidates().filter(obj => obj.groupId === groupId || obj._groupId === groupId);
            if (grouped.length === 1) return grouped[0];
        }

        const byIdentity = identityId(rawSeed);
        if (byIdentity) {
            const matches = headCandidates().filter(obj => identityId(obj) === byIdentity);
            if (matches.length === 1) return matches[0];
        }

        const candidates = headCandidates();
        return candidates.length === 1 ? candidates[0] : null;
    }

    _isSvgAfricanPremiumFaceObject(obj) {
        return !!this._getSvgAfricanPremiumHeadObject(obj);
    }

    _isSvgAfricanThreeQuarterFaceObject(obj) {
        const head = this._getSvgAfricanPremiumHeadObject(obj);
        if (!head) return false;
        const config = head._svgCharacterConfig || {};
        const view = String(
            head._svgCharacterViewProfileKey
            || config.view
            || config.styling?.view
            || ''
        ).trim().toLowerCase().replace(/[:_]/g, '-');
        return /^(front|back)-3q-(left|right)$/.test(view);
    }

    _getSvgAvatarPropertyCatalog(obj) {
        return obj?._svgAvatar?.presenterProperties || window.SvgAvatarCatalog?.presenterProperties || {};
    }

    _getSvgAfricanFacePropertyCatalog() {
        return window.SvgAfricanPremiumAssets?.faceProperties || {};
    }

    _getSvgAfricanFaceSupportedProperties(obj) {
        const head = this._getSvgAfricanPremiumHeadObject(obj);
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets || (typeof window !== 'undefined' ? window.SvgAfricanPremiumAssets : null);
        const config = head?._svgCharacterConfig || {};
        const assetId = head?._svgCharacterPremiumAssetId
            || head?._svgAfricanPremiumAssetId
            || config.assetCharacterId
            || config.assetId;
        const stateProperties = assetId ? PremiumAssets?.getFacialRigSchema?.(assetId)?.stateProperties : null;
        return new Set(Array.isArray(stateProperties) && stateProperties.length
            ? stateProperties
            : Object.keys(this._getSvgAfricanFacePropertyCatalog()));
    }

    _getSvgAvatarDefaultState(obj) {
        const catalog = this._getSvgAvatarPropertyCatalog(obj);
        return Object.fromEntries(Object.entries(catalog).map(([key, config]) => [
            key,
            Number.isFinite(Number(config?.defaultValue)) ? Number(config.defaultValue) : 0
        ]));
    }

    _getSvgAvatarState(obj) {
        if (!this._isSvgPresenterAvatarObject(obj)) return {};
        obj._svgAvatar.state = { ...this._getSvgAvatarDefaultState(obj), ...(obj._svgAvatar.state || {}) };
        return obj._svgAvatar.state;
    }

    _getSvgAfricanFaceDefaultState() {
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        if (PremiumAssets?.getDefaultFaceState) return PremiumAssets.getDefaultFaceState();
        const catalog = this._getSvgAfricanFacePropertyCatalog();
        return Object.fromEntries(Object.entries(catalog).map(([key, config]) => [
            key,
            Number.isFinite(Number(config?.defaultValue)) ? Number(config.defaultValue) : 0
        ]));
    }

    _getSvgAfricanFaceState(obj) {
        const head = this._getSvgAfricanPremiumHeadObject(obj);
        if (!head) return {};
        head._svgAfricanFaceState = {
            ...this._getSvgAfricanFaceDefaultState(),
            ...(head._svgCharacterConfig?._svgAfricanFaceState || {}),
            ...(head._svgAfricanFaceState || {})
        };
        return head._svgAfricanFaceState;
    }

    _clampSvgAvatarValue(obj, prop, value) {
        const config = this._getSvgAvatarPropertyCatalog(obj)?.[prop] || {};
        const min = Number.isFinite(Number(config.min)) ? Number(config.min) : -Infinity;
        const max = Number.isFinite(Number(config.max)) ? Number(config.max) : Infinity;
        const fallback = Number.isFinite(Number(config.defaultValue)) ? Number(config.defaultValue) : 0;
        const numeric = Number(value);
        return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
    }

    _clampSvgAfricanFaceValue(prop, value) {
        const config = this._getSvgAfricanFacePropertyCatalog()?.[prop] || {};
        const min = Number.isFinite(Number(config.min)) ? Number(config.min) : -Infinity;
        const max = Number.isFinite(Number(config.max)) ? Number(config.max) : Infinity;
        const fallback = Number.isFinite(Number(config.defaultValue)) ? Number(config.defaultValue) : 0;
        const numeric = Number(value);
        return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
    }

    _quantizeSvgAvatarState(obj) {
        const state = this._getSvgAvatarState(obj);
        const stepFor = {
            blink: 0.1,
            mouthOpen: 0.08,
            smile: 0.08,
            handEmphasis: 0.08,
            listening: 0.1,
            gazeX: 0.25,
            gazeY: 0.25,
            browRaise: 0.25,
            headNod: 0.25,
            headTilt: 0.25,
            torsoSway: 0.25
        };
        return Object.fromEntries(Object.entries(state).map(([prop, value]) => {
            const numeric = Number(value);
            const step = stepFor[prop] || 0.1;
            return [
                prop,
                Number.isFinite(numeric) ? Math.round(numeric / step) * step : value
            ];
        }));
    }

    _quantizeSvgAfricanFaceState(obj) {
        const state = this._getSvgAfricanFaceState(obj);
        const stepFor = {
            blink: 0.08,
            mouthOpen: 0.06,
            mouthWide: 0.06,
            mouthRound: 0.06,
            lipPress: 0.06,
            jawOpen: 0.06,
            upperLipLift: 0.06,
            lowerLipDrop: 0.06,
            smile: 0.06,
            listening: 0.08,
            gazeX: 0.2,
            gazeY: 0.2,
            browRaise: 0.2,
            headNod: 0.2,
            headTilt: 0.2,
            headTurn: 0.04,
            frontHeadYaw: 0.02,
            rearFaceReveal: 0.04
        };
        return Object.fromEntries(Object.entries(state).map(([prop, value]) => {
            const numeric = Number(value);
            const step = stepFor[prop] || 0.1;
            return [
                prop,
                Number.isFinite(numeric) ? Math.round(numeric / step) * step : value
            ];
        }));
    }

    _decodeSvgAvatarDataUrl(src) {
        const text = String(src || '');
        if (!text.startsWith('data:image/svg+xml')) return '';
        const comma = text.indexOf(',');
        if (comma < 0) return '';
        const payload = text.slice(comma + 1);
        try {
            return text.slice(0, comma).includes(';base64')
                ? atob(payload)
                : decodeURIComponent(payload);
        } catch (_) {
            return '';
        }
    }

    _encodeSvgAvatarDataUrl(svg) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg || '')}`;
    }

    _renderSvgAvatarStateToImage(obj) {
        if (!this._isSvgPresenterAvatarObject(obj)) return false;
        if (typeof this.objects?._renderSvgAvatarStateToImage === 'function') {
            return this.objects._renderSvgAvatarStateToImage(obj);
        }
        if (!window.SvgAvatarCatalog?.applyPresenterState) return false;
        const sourceSvg = obj._svgAvatar.baseSvg || this._decodeSvgAvatarDataUrl(obj.imageSrc);
        if (!sourceSvg) return false;
        try {
            const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml');
            const root = doc.documentElement;
            if (!root || root.nodeName.toLowerCase() === 'parsererror') return false;
            const renderState = this._quantizeSvgAvatarState(obj);
            const renderKey = JSON.stringify(renderState);
            if (obj._svgAvatar._lastRenderKey === renderKey) return true;
            obj._svgAvatar._lastRenderKey = renderKey;
            const applied = window.SvgAvatarCatalog.applyPresenterState(root, renderState);
            if (applied) obj._svgAvatar.state = { ...applied };
            const nextSvg = new XMLSerializer().serializeToString(root);
            const nextSrc = this._encodeSvgAvatarDataUrl(nextSvg);
            obj._svgAvatar.currentSvg = nextSvg;
            obj.imageSrc = nextSrc;
            obj.loadImage?.(nextSrc);
            return true;
        } catch (_) {
            return false;
        }
    }

    _syncSvgAfricanFaceStateToCharacter(head) {
        const instanceId = head?._svgCharacterInstanceId;
        if (!instanceId) return;
        const state = { ...this._getSvgAfricanFaceState(head) };
        (this.objects?.objects || []).forEach(obj => {
            if (obj?._svgCharacterInstanceId !== instanceId) return;
            if (obj._svgCharacterConfig && typeof obj._svgCharacterConfig === 'object') {
                obj._svgCharacterConfig._svgAfricanFaceState = { ...state };
            }
            if ((obj._svgCharacterPremiumPartKey || obj._svgCharacterPartKey || obj.bodyPartData?.partKey) === 'torso') {
                obj._svgAfricanFaceState = { ...state };
            }
        });
    }

    _renderSvgAfricanFaceStateToImage(obj, options = {}) {
        const head = this._getSvgAfricanPremiumHeadObject(obj);
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        if (!head || !PremiumAssets?.renderPartDataUrl) return false;
        const transient = options.transient === true || head._svgAfricanFaceTransientRender === true;
        const state = this._getSvgAfricanFaceState(head);
        const renderState = this._quantizeSvgAfricanFaceState(head);
        const config = {
            ...(head._svgCharacterConfig || {}),
            _svgAfricanFaceState: state,
            premiumAdjustments: head._svgAfricanAdjustments || head._svgCharacterConfig?.premiumAdjustments || {}
        };
        const assetId = head._svgCharacterPremiumAssetId || head._svgAfricanPremiumAssetId || config.assetCharacterId || PremiumAssets.getDefaultAssetId?.();
        if (!assetId) return false;
        try {
            const appearanceKey = JSON.stringify({
                independentHeadTurn: config._independentHeadTurn === true,
                headTurnConstruction: config._headTurnConstruction || 'legacy',
                headTurnFullRange: config._headTurnFullRange === true,
                identity: config.identity || {},
                styling: config.styling || {},
                photoRevision: config._photoCharacter?.revision || '',
                realisticRevision: config._realisticCharacter?.revision || '',
                colors: config.colorOverrides || config.colors || {}
            });
            const renderKey = JSON.stringify({ state: renderState, adjustments: config.premiumAdjustments, assetId, appearanceKey });
            if (!transient && head._svgAfricanLastFaceRenderKey === renderKey && head.imageElement) return true;
            if (transient) head._svgAfricanLastTransientFaceRenderKey = renderKey;
            else head._svgAfricanLastFaceRenderKey = renderKey;
            head._svgAfricanFaceRenderCache = head._svgAfricanFaceRenderCache instanceof Map
                ? head._svgAfricanFaceRenderCache
                : new Map();
            // Photo textures are much larger than authored SVG paths.
            const faceCacheLimit = (config._photoCharacter || config._realisticCharacter) ? 24 : Math.max(96, Math.min(
                640,
                Number(head._svgAfricanFaceCacheLimit) || 96
            ));
            let src = head._svgAfricanFaceRenderCache.get(renderKey);
            if (!src) {
                src = PremiumAssets.renderPartDataUrl(assetId, 'head-neck', config, head._svgCharacterInstanceId || 'svgaf-premium', {
                    faceState: renderState,
                    adjustments: config.premiumAdjustments
                });
                head._svgAfricanFaceRenderCache.set(renderKey, src);
                if (head._svgAfricanFaceRenderCache.size > faceCacheLimit) {
                    const oldestKey = head._svgAfricanFaceRenderCache.keys().next().value;
                    head._svgAfricanFaceRenderCache.delete(oldestKey);
                }
            }

            if (!transient) {
                head.imageSrc = src;
                head._svgCharacterConfig = config;
                this._syncSvgAfricanFaceStateToCharacter(head);
            }

            // Lip-sync frames are temporary display images. Loading them through
            // StageObject.loadImage() changes imageSrc and races the base-state
            // restore performed on every timeline tick, so the closed/base mouth
            // can repeatedly win. Cache decoded images separately and let render()
            // prefer the transient override without changing the authored asset.
            if (typeof Image === 'undefined') {
                if (!transient) head.loadImage?.(src);
                return !transient;
            }
            head._svgAfricanFaceImageCache = head._svgAfricanFaceImageCache instanceof Map
                ? head._svgAfricanFaceImageCache
                : new Map();
            let record = head._svgAfricanFaceImageCache.get(renderKey);
            if (!record) {
                const image = new Image();
                let resolveReady;
                const ready = new Promise(resolve => { resolveReady = resolve; });
                record = { image, ready };
                image.onload = () => resolveReady(image);
                image.onerror = () => resolveReady(null);
                image.src = src;
                head._svgAfricanFaceImageCache.set(renderKey, record);
                if (head._svgAfricanFaceImageCache.size > faceCacheLimit) {
                    const oldestKey = head._svgAfricanFaceImageCache.keys().next().value;
                    head._svgAfricanFaceImageCache.delete(oldestKey);
                }
            }

            const requestId = (head._svgAfricanFaceImageRequestId || 0) + 1;
            head._svgAfricanFaceImageRequestId = requestId;
            const applyImage = image => {
                if (!image || !(image.complete && (image.naturalWidth || image.width))) return false;
                if (requestId < (head._svgAfricanFaceImageAppliedId || 0)) return false;
                if (transient && head._svgAfricanFaceTransientActive !== true) return false;
                head._svgAfricanFaceImageAppliedId = requestId;
                if (transient) {
                    head._audioLipSyncImageElement = image;
                } else {
                    head.imageElement = image;
                }
                this.stage?.requestRender?.();
                return true;
            };
            if (record.image.complete && (record.image.naturalWidth || record.image.width)) {
                applyImage(record.image);
            }
            const pending = record.ready.then(image => {
                applyImage(image);
                return image;
            });
            head._svgAfricanFacePendingImagePromise = pending;
            void pending.finally(() => {
                if (head._svgAfricanFacePendingImagePromise === pending) {
                    head._svgAfricanFacePendingImagePromise = null;
                }
            });
            return true;
        } catch (_) {
            return false;
        }
    }

    _queueSvgAvatarStateRender(obj) {
        if (!this._isSvgPresenterAvatarObject(obj)) return false;
        this._svgAvatarRenderQueue = this._svgAvatarRenderQueue || new Set();
        this._svgAvatarRenderQueue.add(obj);
        if (obj._svgAvatar._renderQueued) return true;
        obj._svgAvatar._renderQueued = true;
        const render = () => {
            if (!obj?._svgAvatar) return;
            obj._svgAvatar._renderQueued = false;
            if (this._svgAvatarRenderQueue) {
                this._svgAvatarRenderQueue.delete(obj);
            }
            this._renderSvgAvatarStateToImage(obj);
            this.stage?.requestRender?.();
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(render);
        } else {
            setTimeout(render, 16);
        }
        return true;
    }

    _queueSvgAfricanFaceStateRender(obj, options = {}) {
        const head = this._getSvgAfricanPremiumHeadObject(obj);
        if (!head) return false;
        if (options.transient === true) {
            head._svgAfricanFaceTransientRender = true;
            head._svgAfricanFaceTransientActive = true;
        }
        this._svgAfricanFaceRenderQueue = this._svgAfricanFaceRenderQueue || new Set();
        this._svgAfricanFaceRenderQueue.add(head);
        if (head._svgAfricanRenderQueued) return true;
        head._svgAfricanRenderQueued = true;
        const render = () => {
            // A synchronous export/playback flush may have consumed this queue
            // before its scheduled callback runs.
            if (!head._svgAfricanRenderQueued) return;
            head._svgAfricanRenderQueued = false;
            this._svgAfricanFaceRenderQueue?.delete(head);
            const transient = head._svgAfricanFaceTransientRender === true;
            head._svgAfricanFaceTransientRender = false;
            this._renderSvgAfricanFaceStateToImage(head, { transient });
            this.stage?.requestRender?.();
        };
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(render);
        } else {
            setTimeout(render, 16);
        }
        return true;
    }

    _flushSvgAvatarStateRenders() {
        const queued = Array.from(this._svgAvatarRenderQueue || []);
        if (!queued.length) return false;
        this._svgAvatarRenderQueue.clear();
        let rendered = false;
        queued.forEach(obj => {
            if (!obj?._svgAvatar) return;
            obj._svgAvatar._renderQueued = false;
            rendered = this._renderSvgAvatarStateToImage(obj) || rendered;
        });
        return rendered;
    }

    _flushSvgAfricanFaceStateRenders() {
        const queued = Array.from(this._svgAfricanFaceRenderQueue || []);
        if (!queued.length) return false;
        this._svgAfricanFaceRenderQueue.clear();
        let rendered = false;
        queued.forEach(obj => {
            if (!obj) return;
            obj._svgAfricanRenderQueued = false;
            const transient = obj._svgAfricanFaceTransientRender === true;
            obj._svgAfricanFaceTransientRender = false;
            rendered = this._renderSvgAfricanFaceStateToImage(obj, { transient }) || rendered;
        });
        return rendered;
    }

    _svgAvatarHasRole(obj, role) {
        const svg = String(obj?._svgAvatar?.baseSvg || obj?._svgAvatar?.currentSvg || obj?.imageSrc || '');
        return svg.includes(`data-avatar-role="${role}"`) ||
            svg.includes(`id="${role}"`) ||
            svg.includes(`-${role}"`);
    }

    _svgAvatarHasHands(obj) {
        return this._svgAvatarHasRole(obj, 'avHandL') || this._svgAvatarHasRole(obj, 'avHandR');
    }

    _getSvgAvatarMotionValue(obj, prop) {
        return this._getSvgAvatarState(obj)?.[prop] ?? 0;
    }

    _getSvgAfricanFaceMotionValue(obj, prop) {
        return this._getSvgAfricanFaceState(obj)?.[prop] ?? 0;
    }

    _generateSvgAvatarMotion(obj, params, frameMap) {
        if (!this._isSvgPresenterAvatarObject(obj)) return [];
        const catalog = this._getSvgAvatarPropertyCatalog(obj);
        const duration = Math.max(0.05, Number(params?.duration) || 1) * 1000;
        const easing = params?.easing || 'easeInOut';
        return Object.entries(frameMap || {}).flatMap(([prop, pairs]) => {
            if (!catalog[prop]) return [];
            if (prop === 'handEmphasis' && !this._svgAvatarHasHands(obj)) return [];
            const keyframes = (Array.isArray(pairs) ? pairs : [])
                .map(([t, value]) => ({
                    t: Math.max(0, Math.min(1, Number(t) || 0)),
                    value: this._clampSvgAvatarValue(obj, prop, value)
                }))
                .sort((a, b) => a.t - b.t);
            if (keyframes.length < 2) return [];
            return [{
                property: `svgAvatar_${prop}`,
                from: this._getSvgAvatarMotionValue(obj, prop),
                to: keyframes[keyframes.length - 1].value,
                keyframes,
                duration,
                easing
            }];
        });
    }

    _generateSvgAfricanFaceMotion(obj, params, frameMap) {
        const head = this._getSvgAfricanPremiumHeadObject(obj);
        if (!head) return [];
        const catalog = this._getSvgAfricanFacePropertyCatalog();
        const supportedProperties = this._getSvgAfricanFaceSupportedProperties(head);
        const duration = Math.max(0.05, Number(params?.duration) || 1) * 1000;
        const easing = params?.easing || 'easeInOut';
        return Object.entries(frameMap || {}).flatMap(([prop, pairs]) => {
            if (!catalog[prop] || !supportedProperties.has(prop)) return [];
            const keyframes = (Array.isArray(pairs) ? pairs : [])
                .map(([t, value]) => ({
                    t: Math.max(0, Math.min(1, Number(t) || 0)),
                    value: this._clampSvgAfricanFaceValue(prop, value)
                }))
                .sort((a, b) => a.t - b.t);
            if (keyframes.length < 2) return [];
            return [{
                property: `svgAfricanFace_${prop}`,
                from: this._getSvgAfricanFaceMotionValue(head, prop),
                to: keyframes[keyframes.length - 1].value,
                keyframes,
                duration,
                easing
            }];
        });
    }

    _getSvgAfricanFaceAnimationFrameMap(animationId) {
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets || (typeof window !== 'undefined' ? window.SvgAfricanPremiumAssets : null);
        return PremiumAssets?.getFaceAnimationFrameMap?.(animationId) || null;
    }

    _generateSvgAfricanFacePresetMotion(obj, params, presetId) {
        const head = this._getSvgAfricanPremiumHeadObject(obj);
        if (!head) return [];
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets || (typeof window !== 'undefined' ? window.SvgAfricanPremiumAssets : null);
        const targetState = PremiumAssets?.getFacePresetState?.(presetId);
        if (!targetState) return [];
        const catalog = this._getSvgAfricanFacePropertyCatalog();
        const currentState = this._getSvgAfricanFaceState(head);
        const frameMap = {};
        Object.entries(targetState).forEach(([prop, value]) => {
            if (!catalog[prop]) return;
            const from = currentState[prop] ?? this._getSvgAfricanFaceMotionValue(head, prop);
            frameMap[prop] = [[0, from], [1, value]];
        });
        return this._generateSvgAfricanFaceMotion(head, params, frameMap);
    }

    _resolvePresenterAnimationTargets(selectedObjects, def) {
        if (!def?.requiresPresenterAvatar && !def?.requiresSvgAfricanPremium) return selectedObjects;
        const targets = [];
        const seen = new Set();
        (selectedObjects || []).forEach(obj => {
            let target = def?.requiresSvgAfricanPremium
                ? this._getSvgAfricanPremiumHeadObject(obj)
                : (this._isSvgPresenterAvatarObject(obj) ? obj : this._getSvgAfricanPremiumHeadObject(obj));
            if (target && def?.requiresSvgAfricanThreeQuarter
                && !this._isSvgAfricanThreeQuarterFaceObject(target)) {
                target = null;
            }
            if (!target || seen.has(target.id)) return;
            seen.add(target.id);
            targets.push(target);
        });
        return targets;
    }

    _requiresSpecialAnimationTarget(def) {
        return !!(
            def?.requiresPresenterAvatar
            || def?.requiresSvgAfricanPremium
            || def?.requiresSvgAfricanThreeQuarter
        );
    }

    _getSpecialAnimationTargetMessage(def, genericMessage = 'This animation currently supports images, icons, rectangles, and rounded rectangles only') {
        if (def?.requiresSvgAfricanThreeQuarter) return 'Select a premium SVG African 3/4 character first. This overlay becomes visible only in back 3/4 view.';
        if (def?.requiresSvgAfricanPremium) return 'Select a premium SVG African character first.';
        if (def?.requiresPresenterAvatar) return 'Select an SVG Presenter Avatar or premium SVG African character first.';
        return genericMessage;
    }

    _isLegacyPresenterSpeakBodyProperty(property) {
        const key = String(property || '');
        return key === 'svgAvatar_torsoSway' || key === 'svgAvatar_handEmphasis';
    }

    _shouldDropGeneratedConfigForAnimation(anim, config) {
        const type = String(anim?.type || '').toLowerCase();
        const name = String(anim?.name || '').toLowerCase();
        if (type !== 'presenter-speak' && name !== 'presenter speak') return false;
        return this._isLegacyPresenterSpeakBodyProperty(config?.property || config?.key);
    }

    _sanitizeGeneratedConfigsForAnimation(anim, generated) {
        const configs = (Array.isArray(generated) ? generated : [generated]).filter(Boolean);
        return configs.filter(config => (
            !this._shouldDropGeneratedConfigForAnimation(anim, config)
            && !this._isInactiveGeneratedConfig(config)
        ));
    }

    _isInactiveGeneratedConfig(config) {
        return config?.type === 'audio-lip-sync' && config.audioRefreshRequired === true;
    }

    _shouldStepAnimatedProperty(obj, property, fromVal, toVal) {
        if (property === 'armatureViewState') return true;
        if (!property) return false;
        if (property === 'visible' || property === 'activityRootId') return true;
        if (property === 'imageSrc' || property === 'textureImageSrc' || property === 'svgAvatarState' || property === 'svgAfricanFaceState' || property === 'svgAfricanAdjustments' || property === 'svgArmatureView') return true;
        if (property === '_armatureDrawLayer' || property === 'armatureDrawLayer') return true;
        if (property === 'layer' && this._isArmatureOrFacialAnimatedObject(obj)) return true;
        if (/^jointCrossOffset_\d+$/.test(property)) return true;
        if ((property === 'scaleX' || property === 'flipH' || property === 'flipV') && this._isArmatureOrFacialAnimatedObject(obj)) {
            const a = Number(fromVal);
            const b = Number(toVal);
            if (property === 'flipH' || property === 'flipV') return true;
            return Number.isFinite(a) && Number.isFinite(b) && a !== 0 && b !== 0 && Math.sign(a) !== Math.sign(b);
        }
        return false;
    }

    _resolveAnimatedPropertyValue(obj, property, fromVal, toVal, progress, interpolatedValue) {
        if (property === 'armatureViewState' && globalThis.ArmatureViewState?.interpolate) {
            return globalThis.ArmatureViewState.interpolate(fromVal, toVal, progress);
        }
        if (this._shouldStepAnimatedProperty(obj, property, fromVal, toVal)) {
            return progress < 0.5 ? fromVal : toVal;
        }
        return interpolatedValue;
    }

    _queueSvgArmatureTimelineViewSync(obj, view) {
        if (!obj || obj._characterAppearanceProvider !== 'svg-african-premium') return;
        const role = String(obj._armatureRoleKey || obj._armaturePartKey || obj.bodyPartData?.partKey || '').toLowerCase();
        if (obj.pinnedTo && role !== 'torso') return;
        const normalizedView = String(view || '').trim().toLowerCase();
        if (!normalizedView) return;
        if (!(this._pendingSvgArmatureTimelineViews instanceof Map)) {
            this._pendingSvgArmatureTimelineViews = new Map();
        }
        this._pendingSvgArmatureTimelineViews.set(obj.id, { root: obj, view: normalizedView });
    }

    _flushSvgArmatureTimelineViewSyncs() {
        if (typeof window !== 'undefined') window.app?.jointSystem?._syncArmatureCrossViewPanel?.();
        const pending = this._pendingSvgArmatureTimelineViews;
        this._pendingSvgArmatureTimelineViews = new Map();
        if (!(pending instanceof Map) || pending.size === 0) return;
        const jointSystem = typeof window !== 'undefined' ? window.app?.jointSystem : null;
        if (!jointSystem?._syncSvgAfricanPremiumTimelineView) return;

        pending.forEach(({ root, view }) => {
            if (!root?.id) return;
            let armature = jointSystem._currentArmature?.root?.id === root.id
                ? jointSystem._currentArmature
                : null;
            if (!armature?.root) {
                const pool = (this.objects?.objects || []).filter(obj => obj && (obj.id === root.id || obj.pinnedTo === root.id));
                armature = jointSystem._detectArmatureFromPool?.(pool) || null;
            }
            if (!armature?.root) return;
            jointSystem._syncSvgAfricanPremiumTimelineView(armature, view, {
                rebuildPanel: !this._exportingVideo,
                updateObjectList: !this._exportingVideo
            });
        });
    }

    _setAnimatedPropertyValue(obj, property, value) {
        if (!obj || !property) return;
        if (property === 'armatureViewState') {
            const previousImage = obj.imageSrc;
            if (globalThis.ArmatureViewState?.apply(obj, value)) {
                this._pendingSvgArmatureTimelineViews?.delete(obj.id);
                if (previousImage !== obj.imageSrc) {
                    const cached = obj._crossViewImages?.get(obj.imageSrc);
                    if (cached) { obj._imageLoadRequestId = (obj._imageLoadRequestId || 0) + 1; obj.imageElement = cached; }
                    else if (obj.imageSrc) obj.loadImage?.(obj.imageSrc, { preserveDimensions: true });
                }
            }
            return;
        }
        const usesArmatureDrawLayer = (target) => !!(
            target?._armatureRoleKey || target?.armatureRoleKey ||
            target?._armaturePartKey || target?.armaturePartKey ||
            target?._ucGarmentLayer || target?.ucGarmentLayer ||
            target?._ucGarmentPartKey || target?.ucGarmentPartKey ||
            target?.bodyPartData?.partKey || target?.bodyPartData?.roleKey ||
            (Array.isArray(target?.joints) && target.joints.length)
        );
        if (property === 'imageSrc') {
            if (obj.imageSrc !== value) {
                obj.imageSrc = value;
                if (value) obj.loadImage?.(value);
            }
        } else if (property === 'svgArmatureView') {
            this._queueSvgArmatureTimelineViewSync(obj, value);
        } else if (property === 'svgAvatarState') {
            if (obj._svgAvatar) {
                try {
                    obj._svgAvatar.state = typeof value === 'string'
                        ? JSON.parse(value || 'null') || {}
                        : JSON.parse(JSON.stringify(value || {}));
                    this._queueSvgAvatarStateRender(obj);
                } catch (_) {}
            }
        } else if (String(property).startsWith('svgAvatar_')) {
            if (this._isSvgPresenterAvatarObject(obj)) {
                const prop = String(property).slice('svgAvatar_'.length);
                if (this._getSvgAvatarPropertyCatalog(obj)?.[prop]) {
                    const state = this._getSvgAvatarState(obj);
                    state[prop] = this._clampSvgAvatarValue(obj, prop, value);
                    this._queueSvgAvatarStateRender(obj);
                }
            }
        } else if (property === 'svgAfricanFaceState') {
            const head = this._getSvgAfricanPremiumHeadObject(obj);
            if (head) {
                try {
                    head._svgAfricanFaceState = typeof value === 'string'
                        ? JSON.parse(value || 'null') || {}
                        : JSON.parse(JSON.stringify(value || {}));
                    this._queueSvgAfricanFaceStateRender(head, { transient: true });
                } catch (_) {}
            }
        } else if (property === 'svgAfricanAdjustments') {
            try {
                obj._svgAfricanAdjustments = typeof value === 'string'
                    ? JSON.parse(value || 'null') || {}
                    : JSON.parse(JSON.stringify(value || {}));
                if (obj._svgCharacterConfig && typeof obj._svgCharacterConfig === 'object') {
                    obj._svgCharacterConfig.premiumAdjustments = JSON.parse(JSON.stringify(obj._svgAfricanAdjustments));
                }
            } catch (_) {}
        } else if (String(property).startsWith('svgAfricanFace_')) {
            const head = this._getSvgAfricanPremiumHeadObject(obj);
            if (head) {
                const prop = String(property).slice('svgAfricanFace_'.length);
                if (this._getSvgAfricanFacePropertyCatalog()?.[prop]) {
                    const state = this._getSvgAfricanFaceState(head);
                    state[prop] = this._clampSvgAfricanFaceValue(prop, value);
                    this._queueSvgAfricanFaceStateRender(head, { transient: true });
                }
            }
        } else if (property === 'textureImageSrc') {
            if (obj.textureImageSrc !== value) {
                obj.textureImageSrc = value;
                if (value) obj.loadTextureImage?.(value);
            }
        } else if ((property === 'layer' || property === '_armatureDrawLayer' || property === 'armatureDrawLayer') && usesArmatureDrawLayer(obj)) {
            const drawLayer = Number(value);
            if (Number.isFinite(drawLayer)) obj._armatureDrawLayer = Math.round(drawLayer);
        } else if ((property === 'tiltX' || property === 'tiltY') && this.objects?._setObjectTiltDriverValue) {
            this.objects._setObjectTiltDriverValue(obj, property, value);
        } else if (property === 'visible') {
            obj.visible = value === true || value === 1 || value === '1';
        } else {
            obj[property] = value;
        }

        const jtMatch = property.match(/^jointAngle_(\d+)$/);
        if (jtMatch && obj.joints) {
            const jtIdx = parseInt(jtMatch[1]);
            const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
            if (sorted[jtIdx]) sorted[jtIdx].angle = value;
        }

        const jtTiltMatch = property.match(/^jointTilt([XY])_(\d+)$/);
        if (jtTiltMatch && obj.joints) {
            const axis = jtTiltMatch[1] === 'X' ? 'tiltX' : 'tiltY';
            const jtIdx = parseInt(jtTiltMatch[2]);
            const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
            if (sorted[jtIdx]) sorted[jtIdx][axis] = value;
        }

        const jtCrossMatch = property.match(/^jointCrossOffset_(\d+)$/);
        if (jtCrossMatch && obj.joints) {
            const jtIdx = parseInt(jtCrossMatch[1]);
            const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
            if (sorted[jtIdx]) sorted[jtIdx].crossOffset = value;
        }

        const flexMatch = property.match(/^flexPinAngle_(\d+)$/);
        if (flexMatch && obj.flexPins) {
            const flexIdx = parseInt(flexMatch[1]);
            const sorted = [...obj.flexPins].sort((a, b) => a.position - b.position);
            if (sorted[flexIdx]) sorted[flexIdx].angle = value;
        }

        if (property === '_colorR' || property === '_colorG' || property === '_colorB') {
            const r = Math.round(Math.max(0, Math.min(255, obj._colorR || 0)));
            const g = Math.round(Math.max(0, Math.min(255, obj._colorG || 0)));
            const b = Math.round(Math.max(0, Math.min(255, obj._colorB || 0)));
            obj.fill = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        }
    }

    bindEvents() {
        this.setupEffectButtonThumbnails();
        this.setupAnimationFavorites();
        this.setupRecentEffects();
        this.setupEffectUserPresets();
        // Animation buttons — clicking a card just selects it. We deliberately do
        // NOT auto-preview here: PowerPoint-style behavior is that the stage
        // shows the authored base state until the user explicitly clicks Play
        // or scrubs the timeline. Use the dedicated Preview button to preview
        // without applying.
        document.querySelectorAll('.anim-btn[data-anim]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectAnimation(btn.dataset.anim);
                this.recordRecentEffect(btn.dataset.anim);
                document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
            });
        });

        // Animation search
        document.getElementById('anim-search-input')?.addEventListener('input', (e) => {
            this.filterAnimations(e.target.value);
        });

        // Random Effect dice button — picks one of the currently-visible animations
        document.getElementById('anim-random-btn')?.addEventListener('click', () => {
            const visible = [...document.querySelectorAll('.anim-btn[data-anim]:not(.anim-favorite-clone):not(.anim-recent-clone)')]
                .filter(b => b.style.display !== 'none' && b.closest('.anim-category')?.style.display !== 'none');
            if (!visible.length) {
                if (window.Utils?.showToast) Utils.showToast('No animations available to randomize', 'warning');
                return;
            }
            const pick = visible[Math.floor(Math.random() * visible.length)];
            try { pick.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (_) {}
            pick.click();
            pick.classList.add('selected');
            // brief flash highlight
            pick.style.transition = 'box-shadow 0.4s, transform 0.4s';
            pick.style.boxShadow = '0 0 0 2px var(--accent-primary), 0 0 16px rgba(99, 102, 241, 0.6)';
            setTimeout(() => { pick.style.boxShadow = ''; }, 900);
        });

        // Re-run filter when selection changes so target-suggested hints update
        if (window.eventBus && !this._animSelectionHookBound) {
            this._animSelectionHookBound = true;
            const refresh = () => {
                if (document.getElementById('basic-animations')) {
                    this.filterAnimations(document.getElementById('anim-search-input')?.value || '');
                }
            };
            window.eventBus.on?.('selection:changed', refresh);
            window.eventBus.on?.('objects:selected', refresh);
        }
        document.querySelectorAll('.anim-filter-chip[data-anim-filter]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.activeAnimationFilter = btn.dataset.animFilter || 'all';
                document.querySelectorAll('.anim-filter-chip').forEach(chip => chip.classList.toggle('active', chip === btn));
                this.filterAnimations(document.getElementById('anim-search-input')?.value || '');
            });
        });
        this.activeEffectGroup = localStorage.getItem('animationStage.effectGroup.v1') || 'all';
        document.querySelectorAll('.anim-effect-group-chip[data-effect-group]').forEach(btn => {
            btn.dataset.baseLabel = btn.textContent.trim();
            btn.classList.toggle('active', btn.dataset.effectGroup === this.activeEffectGroup);
            btn.addEventListener('click', () => {
                this.activeEffectGroup = btn.dataset.effectGroup || 'all';
                localStorage.setItem('animationStage.effectGroup.v1', this.activeEffectGroup);
                document.querySelectorAll('.anim-effect-group-chip').forEach(chip => chip.classList.toggle('active', chip === btn));
                this.filterAnimations(document.getElementById('anim-search-input')?.value || '');
            });
        });
        document.getElementById('anim-reset-filters')?.addEventListener('click', () => {
            const search = document.getElementById('anim-search-input');
            if (search) search.value = '';
            this.activeAnimationFilter = 'all';
            this.activeEffectGroup = 'all';
            localStorage.setItem('animationStage.effectGroup.v1', 'all');
            document.querySelectorAll('.anim-filter-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.animFilter === 'all'));
            document.querySelectorAll('.anim-effect-group-chip').forEach(chip => chip.classList.toggle('active', chip.dataset.effectGroup === 'all'));
            this.filterAnimations('');
        });
        document.querySelectorAll('.panel-tab[data-tab]').forEach(tab => {
            tab.addEventListener('click', () => {
                if (tab.dataset.tab !== 'animations') this._hideImplementationToolbar();
            });
        });
        const advancedEffectsToggle = document.getElementById('anim-show-advanced-effects');
        if (advancedEffectsToggle) {
            advancedEffectsToggle.checked = localStorage.getItem('animationStage.showAdvancedEffects.v1') === '1';
            advancedEffectsToggle.addEventListener('change', () => {
                localStorage.setItem('animationStage.showAdvancedEffects.v1', advancedEffectsToggle.checked ? '1' : '0');
                this.filterAnimations(document.getElementById('anim-search-input')?.value || '');
            });
            this.filterAnimations(document.getElementById('anim-search-input')?.value || '');
        }

        // Apply animation
        document.getElementById('btn-apply-anim')?.addEventListener('click', () => this.applySelectedAnimation());
        document.getElementById('btn-preview-anim')?.addEventListener('click', () => this.previewSelectedAnimation());
        document.getElementById('btn-cancel-anim')?.addEventListener('click', () => this.cancelAnimation());
        document.getElementById('btn-cancel-reapply')?.addEventListener('click', () => {
            this._clearReapplyMode();
            this.cancelAnimation();
        });
        const animParamsPanel = document.getElementById('anim-params');
        animParamsPanel?.addEventListener('input', () => this.updateEffectPreviewThumbnail());
        animParamsPanel?.addEventListener('change', () => this.updateEffectPreviewThumbnail());
        // Live re-apply: when the user is editing an already-applied animation
        // (re-apply mode), changing any param (direction, brush size, color,
        // duration, etc.) auto-pushes the new settings onto the existing
        // animation so the change is immediately visible on the stage.
        // Debounced so slider drags don't spam history.
        const scheduleLiveReapply = (delay = 250) => {
            if (!this._reapplyAnimId) return;
            clearTimeout(this._liveReapplyTimer);
            this._liveReapplyTimer = setTimeout(() => {
                if (!this._reapplyAnimId) return;
                try { this.applySelectedAnimation(); } catch (_) {}
            }, delay);
        };
        const isLiveReapplyTarget = (target) => {
            if (!target || target.nodeType !== 1) return false;
            if (target.closest('button')) return false;
            return target.matches('input, select, textarea');
        };
        animParamsPanel?.addEventListener('input', (e) => {
            if (isLiveReapplyTarget(e.target)) scheduleLiveReapply(300);
        });
        animParamsPanel?.addEventListener('change', (e) => {
            if (isLiveReapplyTarget(e.target)) scheduleLiveReapply(60);
        });
        document.getElementById('param-effect-preset')?.addEventListener('change', () => this.applySelectedEffectPresetToControls());
        document.getElementById('btn-apply-effect-pack')?.addEventListener('click', () => this.applySelectedEffectPackToControls());
        document.getElementById('param-effect-user-preset')?.addEventListener('change', () => this.renderEffectUserPresets());
        document.getElementById('btn-save-effect-user-preset')?.addEventListener('click', () => this.saveCurrentEffectUserPreset());
        document.getElementById('btn-apply-effect-user-preset')?.addEventListener('click', () => this.applySelectedEffectUserPreset());
        document.getElementById('btn-delete-effect-user-preset')?.addEventListener('click', () => this.deleteSelectedEffectUserPreset());

        // Category collapse is handled by app.js setupCollapsibleSections()

        // Pick destination button — enter destination-picking mode
        document.getElementById('btn-pick-dest')?.addEventListener('click', () => {
            this.startPickingDestination();
        });

        // Pick target X/Y button — same picking flow but fills targetX/targetY exactly
        document.getElementById('btn-pick-target-xy')?.addEventListener('click', () => {
            this._isPickTargetXY = true;
            this.startPickingDestination();
        });

        // Listen for destination picked from ObjectManager
        eventBus.on('destination:picked', (pos) => {
            this.onDestinationPicked(pos);
        });

        document.getElementById('btn-pick-pellet-path-shape')?.addEventListener('click', () => this.startPickingPelletPath());
        document.getElementById('btn-clear-pellet-path-shape')?.addEventListener('click', () => {
            this._setPelletPathShape(null);
        });
        document.getElementById('btn-pick-effect-origin')?.addEventListener('click', () => this.startPickingEffectOrigin());
        eventBus.on('stage:click', (pos) => {
            if (this.isPickingEffectOrigin) {
                this.onEffectOriginPicked(pos);
                return;
            }
            if (!this.isPickingPelletPath) return;
            this.handlePelletPathPick(pos);
        });

        // === Custom Multi-Property Animation Builder ===
        document.getElementById('custom-anim-builder')?.addEventListener('pointerdown', () => {
            this._showImplementationToolbar({
                tool: 'animation-custom',
                label: 'Custom Animation',
                hint: 'Apply custom animation or cancel',
                applyText: 'Apply Custom',
                onApply: () => this.applyCustomAnimation(),
                onCancel: () => this.cancelAnimation()
            });
        });
        document.getElementById('btn-add-custom-prop')?.addEventListener('click', () => {
            this.addCustomPropertyRow();
        });
        document.getElementById('btn-apply-custom-anim')?.addEventListener('click', () => {
            this.applyCustomAnimation();
        });
        document.getElementById('btn-preview-custom-anim')?.addEventListener('click', () => {
            this.previewCustomAnimation();
        });

        // Add initial row
        this.addCustomPropertyRow();

        // Clean up applied animations list and timeline when objects are deleted
        eventBus.on('object:removed', () => {
            this._invalidateTimelineExtentsCache();
            this.updateAppliedAnimationsList();
            this.calculateTotalDuration();
            this.updateTimingReferenceOptions();
            eventBus.emit('timeline:update');
        });

        eventBus.on('object:added', () => {
            this._invalidateTimelineExtentsCache();
            this.updateTimingReferenceOptions();
        });

        // Keep the applied animations panel in sync with stage selection changes.
        eventBus.on('selection:changed', () => {
            this.updateAppliedAnimationsList();
        });

        eventBus.on('object:updated', () => {
            this._invalidateTimelineExtentsCache();
            this.updateAppliedAnimationsList();
            this.updateTimingReferenceOptions();
        });

        // Any animation mutation invalidates the global-extents memo.
        eventBus.on('animation:applied', () => this._invalidateTimelineExtentsCache());
        eventBus.on('history:push',       () => this._invalidateTimelineExtentsCache());
        eventBus.on('timeline:update',    () => this._invalidateTimelineExtentsCache());

        // === Chain Animation Builder ===
        this.chainObjects = []; // Array of { obj, keepAfter: false }
        this.chainAddMode = false;

        document.getElementById('chain-builder')?.addEventListener('pointerdown', () => {
            this._showImplementationToolbar({
                tool: 'animation-chain',
                label: 'Chain Animation',
                hint: 'Apply chain animation or cancel',
                applyText: 'Apply Chain',
                onApply: () => this.applyChainAnimation(),
                onCancel: () => this.cancelAnimation()
            });
        });

        document.getElementById('btn-chain-add')?.addEventListener('click', () => {
            this.chainAddMode = !this.chainAddMode;
            const btn = document.getElementById('btn-chain-add');
            if (this.chainAddMode) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-crosshairs"></i> Click on stage...';
                Utils.showToast('Click objects on the stage to add them to the chain', 'info');
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-plus"></i> Add Object';
            }
        });

        document.getElementById('btn-chain-clear')?.addEventListener('click', () => {
            this.chainObjects = [];
            this.updateChainList();
        });

        document.getElementById('btn-chain-apply')?.addEventListener('click', () => {
            this.applyChainAnimation();
        });

        document.getElementById('btn-chain-preview')?.addEventListener('click', () => {
            this.previewChainAnimation();
        });

        // === Stage Sequence Animation Builder ===
        this.sequenceObjects = [];
        this.sequenceAddMode = false;

        document.getElementById('sequence-entry-builder')?.addEventListener('pointerdown', () => {
            this._showImplementationToolbar({
                tool: 'animation-sequence',
                label: 'Stage Sequence',
                hint: 'Apply sequence animation or cancel',
                applyText: 'Apply Sequence',
                onApply: () => this.applySequenceAnimation(),
                onCancel: () => this.cancelAnimation()
            });
        });

        document.getElementById('btn-sequence-add')?.addEventListener('click', () => {
            this.sequenceAddMode = !this.sequenceAddMode;
            const btn = document.getElementById('btn-sequence-add');
            if (this.sequenceAddMode) {
                btn.classList.add('active');
                btn.innerHTML = '<i class="fas fa-crosshairs"></i> Click objects...';
                Utils.showToast('Click objects on stage in the order they should appear', 'info');
            } else {
                btn.classList.remove('active');
                btn.innerHTML = '<i class="fas fa-plus"></i> Add Object';
            }
        });

        document.getElementById('btn-sequence-clear')?.addEventListener('click', () => {
            this.sequenceObjects = [];
            this.updateSequenceList();
        });

        document.getElementById('btn-sequence-apply')?.addEventListener('click', () => {
            this.applySequenceAnimation();
        });

        document.getElementById('btn-sequence-preview')?.addEventListener('click', () => {
            this.previewSequenceAnimation();
        });

        // Listen for object selection to add to chain or sequence
        eventBus.on('selection:changed', (ids) => {
            if (!ids.length) return;
            if (!(this.chainAddMode || this.sequenceAddMode)) return;

            // Detect if the selection is a complete group
            let groupId = null;
            if (ids.length >= 2) {
                const first = this.objects.getObjectById(ids[0]);
                if (first?.groupId && this.objects.groups[first.groupId]) {
                    const members = this.objects.groups[first.groupId];
                    if (members.length === ids.length && ids.every(id => members.includes(id))) {
                        groupId = first.groupId;
                    }
                }
            }

            if (groupId) {
                // Group selected — add all members in z-order as a group entry
                const memberObjs = this.objects.groups[groupId]
                    .map(id => this.objects.getObjectById(id))
                    .filter(Boolean)
                    .sort((a, b) => (a.zOrder || 0) - (b.zOrder || 0));
                const groupName = this.objects.groupNames[groupId] || 'Group';

                if (this.chainAddMode) {
                    // Add the group as one chain entry (obj = first member, _groupObjs tracks all)
                    const alreadyAdded = memberObjs.some(o => this.chainObjects.find(e => e.obj.id === o.id));
                    if (!alreadyAdded) {
                        this.chainObjects.push({
                            obj: memberObjs[0],
                            keepAfter: false,
                            _groupObjs: memberObjs,
                            _groupId: groupId,
                            _groupName: groupName
                        });
                        this.updateChainList();
                    }
                }
                if (this.sequenceAddMode) {
                    // Add each member of the group individually (in z-order)
                    let added = 0;
                    memberObjs.forEach(obj => {
                        if (!this.sequenceObjects.find(o => o.id === obj.id)) {
                            this.sequenceObjects.push(obj);
                            added++;
                        }
                    });
                    if (added > 0) {
                        this.updateSequenceList();
                        Utils.showToast(`Added ${added} objects from "${groupName}" to sequence`, 'info');
                    }
                }
            } else if (ids.length === 1) {
                const obj = this.objects.getObjectById(ids[0]);
                if (obj) {
                    if (this.chainAddMode && !this.chainObjects.find(entry => entry.obj.id === obj.id)) {
                        this.chainObjects.push({ obj, keepAfter: false });
                        this.updateChainList();
                    }
                    if (this.sequenceAddMode && !this.sequenceObjects.find(o => o.id === obj.id)) {
                        this.sequenceObjects.push(obj);
                        this.updateSequenceList();
                    }
                }
            }
        });
    }

    setupAnimationFavorites() {
        this.animationFavoritesKey = 'animationStage.animationFavorites.v1';
        this.animationFavorites = this._loadAnimationFavorites();
        this.decorateAnimationFavoriteButtons();
        this.renderAnimationFavorites();
    }

    _loadAnimationFavorites() {
        try {
            const stored = JSON.parse(localStorage.getItem(this.animationFavoritesKey) || '[]');
            return new Set(Array.isArray(stored) ? stored.filter(Boolean) : []);
        } catch (_) {
            return new Set();
        }
    }

    _saveAnimationFavorites() {
        try {
            localStorage.setItem(this.animationFavoritesKey, JSON.stringify([...this.animationFavorites]));
        } catch (_) {}
    }

    decorateAnimationFavoriteButtons() {
        document.querySelectorAll('.anim-btn[data-anim]:not(.anim-favorite-clone)').forEach(btn => {
            if (btn.querySelector('.anim-fav-toggle')) return;
            const fav = document.createElement('span');
            fav.className = 'anim-fav-toggle';
            fav.title = 'Add to favorites';
            fav.setAttribute('role', 'button');
            fav.setAttribute('tabindex', '0');
            fav.innerHTML = '<i class="far fa-star"></i>';
            fav.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.toggleAnimationFavorite(btn.dataset.anim);
            });
            fav.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                event.stopPropagation();
                this.toggleAnimationFavorite(btn.dataset.anim);
            });
            btn.appendChild(fav);
        });
        this.updateAnimationFavoriteButtons();
    }

    toggleAnimationFavorite(type) {
        if (!type) return;
        if (this.animationFavorites.has(type)) {
            this.animationFavorites.delete(type);
        } else {
            this.animationFavorites.add(type);
        }
        this._saveAnimationFavorites();
        this.updateAnimationFavoriteButtons();
        this.renderAnimationFavorites();
    }

    updateAnimationFavoriteButtons() {
        document.querySelectorAll('.anim-btn[data-anim]').forEach(btn => {
            const active = this.animationFavorites?.has(btn.dataset.anim);
            btn.classList.toggle('is-favorite', !!active);
            const fav = btn.querySelector('.anim-fav-toggle');
            if (fav) {
                fav.title = active ? 'Remove from favorites' : 'Add to favorites';
                fav.innerHTML = `<i class="${active ? 'fas' : 'far'} fa-star"></i>`;
            }
        });
    }

    renderAnimationFavorites() {
        const panel = document.getElementById('anim-favorites');
        const grid = document.getElementById('anim-favorites-grid');
        if (!panel || !grid) return;
        grid.innerHTML = '';
        const favoriteTypes = [...(this.animationFavorites || [])].filter(type => document.querySelector(`.anim-btn[data-anim="${CSS.escape(type)}"]:not(.anim-favorite-clone)`));
        panel.classList.toggle('hidden', favoriteTypes.length === 0);
        favoriteTypes.forEach(type => {
            const source = document.querySelector(`.anim-btn[data-anim="${CSS.escape(type)}"]:not(.anim-favorite-clone)`);
            if (!source) return;
            const clone = source.cloneNode(true);
            clone.classList.add('anim-favorite-clone', 'is-favorite');
            const fav = clone.querySelector('.anim-fav-toggle');
            if (fav) {
                fav.title = 'Remove from favorites';
                fav.innerHTML = '<i class="fas fa-star"></i>';
                fav.addEventListener('click', (event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    this.toggleAnimationFavorite(type);
                });
            }
            clone.addEventListener('click', () => {
                this.selectAnimation(type);
                this.recordRecentEffect(type);
                document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('selected'));
                document.querySelectorAll(`.anim-btn[data-anim="${CSS.escape(type)}"]`).forEach(b => b.classList.add('selected'));
            });
            grid.appendChild(clone);
        });
    }

    setupRecentEffects() {
        this.recentEffectsKey = 'animationStage.recentEffects.v1';
        this.recentEffects = this._loadRecentEffects();
        this.renderRecentEffects();
    }

    _loadRecentEffects() {
        try {
            const stored = JSON.parse(localStorage.getItem(this.recentEffectsKey) || '[]');
            return Array.isArray(stored) ? stored.filter(type => this.library[type]?.category === 'effects') : [];
        } catch (_) {
            return [];
        }
    }

    _saveRecentEffects() {
        try {
            localStorage.setItem(this.recentEffectsKey, JSON.stringify(this.recentEffects || []));
        } catch (_) {}
    }

    recordRecentEffect(type) {
        if (!type || this.library[type]?.category !== 'effects') return;
        this.recentEffects = [type, ...(this.recentEffects || []).filter(item => item !== type)].slice(0, 8);
        this._saveRecentEffects();
        this.renderRecentEffects();
    }

    renderRecentEffects() {
        const panel = document.getElementById('anim-recent-effects');
        const grid = document.getElementById('anim-recent-effects-grid');
        if (!panel || !grid) return;
        grid.innerHTML = '';
        const recentTypes = (this.recentEffects || []).filter(type => document.querySelector(`.anim-btn[data-anim="${CSS.escape(type)}"]:not(.anim-recent-clone)`));
        panel.classList.toggle('hidden', recentTypes.length === 0);
        recentTypes.forEach(type => {
            const source = document.querySelector(`.anim-btn[data-anim="${CSS.escape(type)}"]:not(.anim-recent-clone)`);
            if (!source) return;
            const clone = source.cloneNode(true);
            clone.classList.add('anim-recent-clone');
            const fav = clone.querySelector('.anim-fav-toggle');
            if (fav) fav.remove();
            clone.addEventListener('click', () => {
                this.selectAnimation(type);
                this.recordRecentEffect(type);
                document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('selected'));
                document.querySelectorAll(`.anim-btn[data-anim="${CSS.escape(type)}"]`).forEach(b => b.classList.add('selected'));
            });
            grid.appendChild(clone);
        });
    }

    updateEffectGroupCounts(showAdvancedEffects = false) {
        const advancedEffectTypes = this._getAdvancedEffectTypes();
        const counts = { all: 0 };
        document.querySelectorAll('.anim-btn[data-anim]:not(.anim-favorite-clone):not(.anim-recent-clone)').forEach(btn => {
            const type = btn.dataset.anim;
            if (this.library[type]?.category !== 'effects') return;
            if (!showAdvancedEffects && advancedEffectTypes.has(type)) return;
            const group = this._getEffectGroup(type);
            counts.all += 1;
            counts[group] = (counts[group] || 0) + 1;
        });
        document.querySelectorAll('.anim-effect-group-chip[data-effect-group]').forEach(chip => {
            const group = chip.dataset.effectGroup || 'all';
            const label = chip.dataset.baseLabel || chip.textContent.trim();
            chip.dataset.baseLabel = label.replace(/\s+\d+$/, '');
            chip.textContent = `${chip.dataset.baseLabel} ${counts[group] || 0}`;
        });
    }

    setupEffectUserPresets() {
        this.effectUserPresetsKey = 'animationStage.effectUserPresets.v1';
        this.effectUserPresets = this._loadEffectUserPresets();
        this.renderEffectUserPresets();
    }

    _loadEffectUserPresets() {
        try {
            const stored = JSON.parse(localStorage.getItem(this.effectUserPresetsKey) || '[]');
            return Array.isArray(stored) ? stored.filter(p => p && p.type && p.name && p.values) : [];
        } catch (_) {
            return [];
        }
    }

    _saveEffectUserPresets() {
        try {
            localStorage.setItem(this.effectUserPresetsKey, JSON.stringify(this.effectUserPresets || []));
        } catch (_) {}
    }

    renderEffectUserPresets() {
        const select = document.getElementById('param-effect-user-preset');
        if (!select) return;
        const current = select.value;
        const options = (this.effectUserPresets || []).filter(p => p.type === this.selectedAnimType);
        select.innerHTML = '<option value="">Saved Preset</option>';
        options.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            select.appendChild(option);
        });
        select.value = options.some(p => p.id === current) ? current : '';
        const hasSelection = !!select.value;
        document.getElementById('btn-apply-effect-user-preset')?.toggleAttribute('disabled', !hasSelection);
        document.getElementById('btn-delete-effect-user-preset')?.toggleAttribute('disabled', !hasSelection);
    }

    saveCurrentEffectUserPreset() {
        if (!this.selectedAnimType) {
            Utils.showToast('Select an animation first', 'warning');
            return;
        }
        const values = this._collectVisibleEffectUserPresetValues();
        if (!Object.keys(values).length) {
            Utils.showToast('No effect settings to save for this animation', 'warning');
            return;
        }
        const def = this.library[this.selectedAnimType];
        const fallbackName = `${def?.name || this.selectedAnimType} preset`;
        const name = (window.prompt('Preset name', fallbackName) || '').trim().slice(0, 48);
        if (!name) return;
        const existing = (this.effectUserPresets || []).find(p => p.type === this.selectedAnimType && p.name.toLowerCase() === name.toLowerCase());
        if (existing) {
            existing.values = values;
            existing.updatedAt = Date.now();
        } else {
            this.effectUserPresets.push({
                id: Utils.generateId('fxpreset'),
                type: this.selectedAnimType,
                name,
                values,
                updatedAt: Date.now()
            });
        }
        this.effectUserPresets = this.effectUserPresets.slice(-80);
        this._saveEffectUserPresets();
        this.renderEffectUserPresets();
        const select = document.getElementById('param-effect-user-preset');
        if (select) select.value = existing?.id || this.effectUserPresets[this.effectUserPresets.length - 1]?.id || '';
        this.renderEffectUserPresets();
        Utils.showToast(`Saved "${name}" preset`, 'success');
    }

    applySelectedEffectUserPreset() {
        const select = document.getElementById('param-effect-user-preset');
        const preset = (this.effectUserPresets || []).find(p => p.id === select?.value);
        if (!preset) return;
        if (preset.type !== this.selectedAnimType) {
            Utils.showToast('This preset belongs to a different animation', 'warning');
            return;
        }
        this._applyEffectUserPresetValues(preset.values || {});
        this.updateEffectPreviewThumbnail();
        Utils.showToast(`Applied "${preset.name}" preset`, 'success');
    }

    deleteSelectedEffectUserPreset() {
        const select = document.getElementById('param-effect-user-preset');
        const preset = (this.effectUserPresets || []).find(p => p.id === select?.value);
        if (!preset) return;
        this.effectUserPresets = this.effectUserPresets.filter(p => p.id !== preset.id);
        this._saveEffectUserPresets();
        this.renderEffectUserPresets();
        Utils.showToast(`Deleted "${preset.name}" preset`, 'success');
    }

    _collectVisibleEffectUserPresetValues() {
        const values = {};
        document.querySelectorAll('#anim-params .param-field').forEach(field => {
            if (field.style.display === 'none') return;
            field.querySelectorAll('input[id^="param-"], select[id^="param-"], textarea[id^="param-"]').forEach(el => {
                if (!el.id || this._isEffectUserPresetExcludedControl(el.id)) return;
                values[el.id] = el.type === 'checkbox' ? !!el.checked : el.value;
            });
        });
        return values;
    }

    _isEffectUserPresetExcludedControl(id) {
        return new Set([
            'param-start',
            'param-delay',
            'param-duration',
            'param-easing',
            'param-repeat',
            'param-repeat-mode',
            'param-after-playback',
            'param-trigger',
            'param-reference-object',
            'param-reference-relation',
            'param-begin',
            'param-end',
            'param-effect-preset'
        ]).has(id);
    }

    _applyEffectUserPresetValues(values) {
        Object.entries(values || {}).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (!el) return;
            const field = el.closest('.param-field');
            if (field && field.style.display === 'none') return;
            if (el.type === 'checkbox') {
                el.checked = !!value;
            } else {
                el.value = value;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
    }

    setupEffectButtonThumbnails() {
        const effectTypes = new Set(['shoot-pellets', 'break-apart', 'ripple-wave', 'sparkle-burst', 'echo-trail', 'glow-aura', 'focus-pulse', 'confetti-burst', 'orbit-swarm', 'smoke-puff', 'lightning-arc', 'magnet-pull', 'scan-beam', 'lens-flare', 'pixel-burst', 'impact-burst', 'wave-distort', 'liquid-motion', 'melt-drip', 'brush-reveal', 'paint-reveal', 'swirl-tornado', 'fire-flicker', 'dust-away', 'freeze-crack', 'neon-trace', 'shadow-pop', 'explosion-smoke', 'paint-stroke', 'chromatic-glitch', 'shockwave-ring', 'magic-portal', 'glass-shatter', 'electric-charge', 'ink-bleed', 'motion-smear', 'stage-shake', 'camera-zoom', 'mask-reveal', 'path-trail', 'particle-fountain', 'light-sweep', 'weather-effect', 'bubble-rise', 'meteor-shower', 'spotlight-sweep', 'radial-rays', 'outline-pulse', 'speed-lines', 'starfield-warp', 'color-wash', 'halo-burst', 'shadow-cast', 'energy-shield', 'magnify-lens', 'rainbow-arc', 'vignette-pulse', 'scan-grid', 'morph-pulse', 'zoom-pop', 'elastic-warp', 'hover-sway', 'pulse-flash', 'boomerang-motion', 'snap-back', 'spin-pop', 'drift-fade', 'orbit-pulse', 'lift-drop', 'skid-slide', 'reveal-bounce']);
        const colors = {
            'fire-flicker': '#f97316',
            'electric-charge': '#facc15',
            'magic-portal': '#8b5cf6',
            'ink-bleed': '#111827',
            'paint-stroke': '#ec4899',
            'paint-reveal': '#22c55e',
            'shockwave-ring': '#38bdf8',
            'chromatic-glitch': '#22d3ee',
            'glass-shatter': '#bfdbfe',
            'explosion-smoke': '#64748b'
, 'camera-zoom': '#facc15', 'morph-pulse': '#a78bfa', 'zoom-pop': '#fb7185', 'elastic-warp': '#a78bfa', 'hover-sway': '#34d399', 'pulse-flash': '#fde047', 'boomerang-motion': '#60a5fa', 'snap-back': '#fb923c', 'spin-pop': '#f472b6', 'drift-fade': '#94a3b8', 'orbit-pulse': '#818cf8', 'lift-drop': '#38bdf8', 'skid-slide': '#fb923c', 'reveal-bounce': '#22c55e', 'path-trail': '#38bdf8', 'particle-fountain': '#facc15', 'light-sweep': '#ffffff', 'weather-effect': '#bfdbfe', 'bubble-rise': '#7dd3fc', 'meteor-shower': '#fde68a', 'spotlight-sweep': '#fde68a', 'radial-rays': '#facc15', 'outline-pulse': '#38bdf8', 'speed-lines': '#ffffff', 'starfield-warp': '#dbeafe', 'color-wash': '#38bdf8', 'halo-burst': '#facc15', 'shadow-cast': '#020617', 'energy-shield': '#22d3ee', 'magnify-lens': '#bfdbfe', 'rainbow-arc': '#f472b6', 'vignette-pulse': '#020617', 'scan-grid': '#22d3ee'
        };
        document.querySelectorAll('.anim-btn[data-anim]').forEach(btn => {
            const type = btn.dataset.anim;
            if (!effectTypes.has(type) || btn.querySelector('.anim-btn-viz')) return;
            const viz = document.createElement('span');
            viz.className = `anim-btn-viz viz-${type}`;
            const c = colors[type] || '#38bdf8';
            viz.style.cssText = `display:block;width:34px;height:5px;border-radius:999px;margin:5px auto 0;background:${c};box-shadow:0 0 9px ${c};opacity:.82;`;
            if (type.includes('ring') || type.includes('portal') || type.includes('ripple')) {
                viz.style.height = '18px';
                viz.style.width = '28px';
                viz.style.border = `2px solid ${c}`;
                viz.style.background = 'transparent';
            }
            if (type.includes('burst') || type.includes('shatter') || type.includes('explosion')) {
                viz.style.height = '18px';
                viz.style.width = '18px';
                viz.style.borderRadius = '50%';
            }
            btn.appendChild(viz);
        });
    }

    applySelectedEffectPresetToControls() {
        const presetEl = document.getElementById('param-effect-preset');
        if (!presetEl || !this.selectedAnimType) return;
        const params = this.getAnimationParams();
        const next = this._applyEffectPreset(this.selectedAnimType, params);
        const map = {
            explosionCount: 'param-explosion-count', explosionRadius: 'param-explosion-radius', explosionSmokeSize: 'param-explosion-smoke-size', explosionColor: 'param-explosion-color',
            paintColor: 'param-paint-color', paintWidth: 'param-paint-width', paintLength: 'param-paint-length', paintSplatter: 'param-paint-splatter',
            glitchIntensity: 'param-glitch-intensity', glitchSlices: 'param-glitch-slices', glitchColorShift: 'param-glitch-color-shift',
            shockwaveRings: 'param-shockwave-rings', shockwaveRadius: 'param-shockwave-radius', shockwaveColor: 'param-shockwave-color',
            portalColor: 'param-portal-color', portalRadius: 'param-portal-radius', portalSpokes: 'param-portal-spokes',
            chargeBolts: 'param-charge-bolts', chargeRadius: 'param-charge-radius', chargeColor: 'param-charge-color',
            flameColor: 'param-flame-color',
            inkColor: 'param-ink-color', inkSpread: 'param-ink-spread', inkDrops: 'param-ink-drops',
            bounceHeight: 'param-bounce-height', bounceCompression: 'param-bounce-compression', duration: 'param-duration', easing: 'param-easing'
        };
        Object.entries(map).forEach(([key, id]) => {
            if (next[key] === undefined || next[key] === params[key]) return;
            const el = document.getElementById(id);
            if (el) el.value = next[key];
        });
        presetEl.value = 'custom';
        this.updateEffectPreviewThumbnail();
    }

    applySelectedEffectPackToControls() {
        const packEl = document.getElementById('param-effect-pack');
        if (!packEl || !packEl.value) return;
        const strengthEl = document.getElementById('param-effect-pack-strength');
        const strength = Math.max(0.25, Math.min(2, parseFloat(strengthEl?.value || 1) || 1));
        const values = this._getEffectPackValues(packEl.value);
        Object.entries(values).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (!el) return;
            const field = el.closest('.param-field');
            if (field && field.style.display === 'none') return;
            const nextValue = this._scaleEffectPackValue(id, value, strength);
            if (el.type === 'checkbox') {
                el.checked = !!nextValue;
            } else {
                el.value = nextValue;
            }
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        });
        const presetEl = document.getElementById('param-effect-preset');
        const presetField = presetEl?.closest('.param-field');
        if (presetEl && (!presetField || presetField.style.display !== 'none')) presetEl.value = 'custom';
        this.updateEffectPreviewThumbnail();
        const strengthLabel = strengthEl?.selectedOptions?.[0]?.textContent || 'Normal';
        Utils.showToast(`Applied ${strengthLabel.toLowerCase()} ${packEl.value.replace('-', ' ')} pack`, 'success');
    }

    _scaleEffectPackValue(id, value, strength) {
        if (typeof value !== 'number' || !Number.isFinite(value) || strength === 1) return value;
        const key = String(id || '').toLowerCase();
        if (key.includes('compression')) return this._roundPackNumber(1 + ((value - 1) * strength));
        if (key.includes('opacity') || key.includes('dim') || key.includes('strength')) {
            return this._roundPackNumber(Math.max(0, Math.min(1, value * strength)));
        }
        const scaled = Math.max(0, value * strength);
        if (/(count|copies|rings|bolts|spokes|bands|slices|drops|cracks)/.test(key)) {
            return Math.max(1, Math.round(scaled));
        }
        return this._roundPackNumber(scaled);
    }

    _roundPackNumber(value) {
        return Math.round(value * 100) / 100;
    }

    _getEffectPackValues(pack) {
        const packs = {
            cinematic: {
                'param-effect-blend-mode': 'source-over',
                'param-effect-object-mode': 'auto',
                'param-shake-amount': 24,
                'param-shake-frequency': 18,
                'param-smear-distance': 140,
                'param-smear-copies': 8,
                'param-shadow-cast-color': '#020617',
                'param-shadow-cast-length': 130,
                'param-shadow-cast-opacity': 0.42,
                'param-vignette-strength': 0.68,
                'param-sweep-width': 100,
                'param-spotlight-dim': 0.38
            },
            cartoon: {
                'param-effect-blend-mode': 'source-over',
                'param-bounce-height': 230,
                'param-bounce-compression': 1.32,
                'param-sparkle-count': 28,
                'param-sparkle-size': 14,
                'param-sparkle-color': '#facc15',
                'param-outline-pulse-color': '#f97316',
                'param-outline-pulse-width': 6,
                'param-halo-color': '#facc15',
                'param-halo-rings': 5
            },
            magic: {
                'param-effect-blend-mode': 'lighter',
                'param-portal-color': '#8b5cf6',
                'param-portal-radius': 130,
                'param-portal-spokes': 30,
                'param-ray-color': '#facc15',
                'param-ray-count': 28,
                'param-halo-color': '#a78bfa',
                'param-shield-color': '#8b5cf6',
                'param-star-color': '#f5d0fe',
                'param-star-count': 130
            },
            'sci-fi': {
                'param-effect-blend-mode': 'lighter',
                'param-grid-color': '#22d3ee',
                'param-grid-size': 28,
                'param-grid-opacity': 0.42,
                'param-charge-color': '#60a5fa',
                'param-charge-bolts': 18,
                'param-shield-color': '#22d3ee',
                'param-shield-bands': 7,
                'param-speed-line-color': '#dbeafe',
                'param-star-color': '#bfdbfe'
            },
            weather: {
                'param-weather-type': 'rain',
                'param-weather-count': 160,
                'param-weather-color': '#bfdbfe',
                'param-weather-wind': 85,
                'param-smoke-count': 65,
                'param-smoke-opacity': 0.26,
                'param-bubble-color': '#7dd3fc',
                'param-bubble-count': 48
            },
            fire: {
                'param-effect-blend-mode': 'lighter',
                'param-flame-color': '#ef4444',
                'param-flame-count': 56,
                'param-flame-height': 145,
                'param-explosion-color': '#475569',
                'param-explosion-count': 58,
                'param-sparkle-color': '#facc15',
                'param-meteor-color': '#f97316',
                'param-halo-color': '#f97316'
            },
            water: {
                'param-effect-blend-mode': 'source-over',
                'param-liquid-mode': 'splash',
                'param-liquid-preset': 'water',
                'param-liquid-color': '#38bdf8',
                'param-liquid-count': 70,
                'param-liquid-spread': 260,
                'param-liquid-gravity': 210,
                'param-bubble-color': '#7dd3fc',
                'param-bubble-count': 70,
                'param-ripple-color': '#38bdf8'
            }
        };
        return packs[pack] || {};
    }

    // --- Custom Multi-Property Animation Builder ---
    addCustomPropertyRow() {
        const container = document.getElementById('custom-anim-props');
        if (!container) return;

        const row = document.createElement('div');
        row.className = 'custom-prop-row';
        row.innerHTML = `
            <select class="custom-prop-select" title="Property to animate">
                <option value="x">X Position</option>
                <option value="y">Y Position</option>
                <optgroup label="Diagonal Movement">
                    <option value="diag-45">↗ 45° (Up-Right)</option>
                    <option value="diag-135">↘ 135° (Down-Right)</option>
                    <option value="diag-225">↙ 225° (Down-Left)</option>
                    <option value="diag-315">↖ 315° (Up-Left)</option>
                </optgroup>
                <optgroup label="Dimensions">
                    <option value="width">Width</option>
                    <option value="height">Height</option>
                </optgroup>
                <optgroup label="Transform">
                    <option value="rotation">Rotation</option>
                    <option value="depth">Depth</option>
                    <option value="tiltX">X Tilt</option>
                    <option value="tiltY">Y Tilt</option>
                    <option value="scaleX">Scale X</option>
                    <option value="scaleY">Scale Y</option>
                    <option value="opacity">Opacity</option>
                </optgroup>
                <optgroup label="Color">
                    <option value="fill">Fill Color</option>
                    <option value="stroke">Stroke Color</option>
                </optgroup>
            </select>
            <div class="custom-input-wrap">
                <input type="text" class="custom-from" placeholder="From" title="Starting value — type a number or click ● for current">
                <button class="btn-current-val btn-from-current" title="Use current object value"><i class="fas fa-bullseye"></i></button>
            </div>
            <div class="custom-input-wrap">
                <input type="text" class="custom-to" placeholder="To" title="Target value — type a number or pick from stage">
                <button class="btn-pick-custom-dest hidden" title="Click stage to pick destination"><i class="fas fa-crosshairs"></i></button>
            </div>
            <button class="btn-remove-prop" title="Remove"><i class="fas fa-times"></i></button>
        `;

        // Remove row
        row.querySelector('.btn-remove-prop').addEventListener('click', () => {
            row.remove();
        });

        // Helper: is this a color property?
        const isColorProp = (prop) => prop === 'fill' || prop === 'stroke';

        // Helper: is this a diagonal property?
        const isDiagProp = (prop) => prop.startsWith('diag-');

        // Update input fields based on selected property type
        const updateInputType = () => {
            const prop = row.querySelector('.custom-prop-select').value;
            const fromInput = row.querySelector('.custom-from');
            const toInput = row.querySelector('.custom-to');
            const btnFromCurrent = row.querySelector('.btn-from-current');
            const pickBtn = row.querySelector('.btn-pick-custom-dest');

            if (isColorProp(prop)) {
                // Switch to color inputs
                fromInput.type = 'color';
                fromInput.value = '#6c5ce7';
                fromInput.placeholder = '';
                fromInput.title = 'Starting color';
                toInput.type = 'color';
                toInput.value = '#00b894';
                toInput.placeholder = '';
                toInput.title = 'Target color';
                pickBtn.classList.add('hidden');
                // Auto-fill from current object color
                const objs = this.objects.getSelectedObjects();
                if (objs.length > 0 && objs[0][prop]) {
                    fromInput.value = objs[0][prop];
                }
            } else if (isDiagProp(prop)) {
                // Diagonal: "From" is distance, "To" is hidden
                fromInput.type = 'number';
                fromInput.value = '200';
                fromInput.placeholder = 'Distance (px)';
                fromInput.title = 'Movement distance in pixels';
                toInput.type = 'text';
                toInput.value = '';
                toInput.placeholder = '(auto)';
                toInput.title = 'Computed from distance & angle';
                toInput.disabled = true;
                pickBtn.classList.add('hidden');
            } else {
                // Standard numeric
                fromInput.type = 'text';
                fromInput.placeholder = 'From';
                fromInput.title = 'Starting value — type a number or click ● for current';
                toInput.type = 'text';
                toInput.placeholder = 'To';
                toInput.title = 'Target value — type a number or pick from stage';
                toInput.disabled = false;
                // Show pick button for x/y
                if (prop === 'x' || prop === 'y') {
                    pickBtn.classList.remove('hidden');
                } else {
                    pickBtn.classList.add('hidden');
                }
                // Auto-fill from current value
                const objs = this.objects.getSelectedObjects();
                if (objs.length > 0) {
                    const val = objs[0][prop];
                    if (val !== undefined) fromInput.value = Math.round(val * 100) / 100;
                }
            }
        };

        // "Use current value" button for From field
        row.querySelector('.btn-from-current').addEventListener('click', () => {
            const prop = row.querySelector('.custom-prop-select').value;
            const objs = this.objects.getSelectedObjects();
            if (objs.length === 0) {
                Utils.showToast('Select an object first', 'warning');
                return;
            }
            const obj = objs[0];
            if (isColorProp(prop)) {
                const val = obj[prop];
                if (val) row.querySelector('.custom-from').value = val;
            } else if (!isDiagProp(prop)) {
                const val = obj[prop];
                if (val !== undefined) {
                    row.querySelector('.custom-from').value = Math.round(val * 100) / 100;
                }
            }
        });

        // Property change handler
        row.querySelector('.custom-prop-select').addEventListener('change', updateInputType);

        // Pick destination for X/Y "To" field — click on stage
        row.querySelector('.btn-pick-custom-dest').addEventListener('click', () => {
            this.startCustomDestinationPick(row);
        });

        // Initial setup
        updateInputType();

        container.appendChild(row);
    }

    // --- Pick destination on stage for custom X/Y ---
    startCustomDestinationPick(row) {
        const objs = this.objects.getSelectedObjects();
        if (objs.length === 0) {
            Utils.showToast('Select an object first', 'warning');
            return;
        }

        // Store context for the pick
        this._customPickRow = row;
        this._customPickProp = row.querySelector('.custom-prop-select').value;
        this.isPickingDestination = true;
        this.destinationSourceObj = objs[0];
        this._isCustomPick = true;

        this.stage.viewport.style.cursor = 'crosshair';
        row.querySelector('.btn-pick-custom-dest')?.classList.add('active');
        Utils.showToast('Click on the stage to set the target position', 'info');
    }

    applyCustomAnimation() {
        return this._buildCustomAnimation(false);
    }

    previewCustomAnimation() {
        return this._buildCustomAnimation(true);
    }

    _buildCustomAnimation(previewOnly) {
        const selected = this.objects.getSelectedObjects();
        if (selected.length === 0) {
            Utils.showToast('Select objects first', 'warning');
            return;
        }

        const rows = document.querySelectorAll('#custom-anim-props .custom-prop-row');
        if (rows.length === 0) {
            Utils.showToast('Add at least one property', 'warning');
            return;
        }

        const duration = parseFloat(document.getElementById('param-duration')?.value) || 1;
        const _easEl = document.getElementById('param-easing');
        const easing = (_easEl?.value === 'custom' && _easEl.dataset.bezier) ? _easEl.dataset.bezier : (_easEl?.value || 'easeInOut');
        const repeat = document.getElementById('param-repeat')?.value || '1';
        const timing = this.getTimingParams('custom-timeline');

        const configs = [];
        const dropped = []; // { property, reason }
        const seenProps = new Set();
        const duplicates = [];

        const propLabel = (p) => this._formatAnimationPropertyLabel ? this._formatAnimationPropertyLabel(p) : p;

        rows.forEach((row, rowIdx) => {
            const prop = row.querySelector('.custom-prop-select').value;
            const fromVal = row.querySelector('.custom-from').value.trim();
            const toVal = row.querySelector('.custom-to').value.trim();

            // Detect duplicate property rows (later rows would overwrite earlier ones at runtime)
            if (!prop.startsWith('diag-')) {
                if (seenProps.has(prop)) {
                    duplicates.push(prop);
                } else {
                    seenProps.add(prop);
                }
            }

            // Handle color properties (fill, stroke)
            if (prop === 'fill' || prop === 'stroke') {
                if (!fromVal || !toVal) {
                    dropped.push({ property: prop, reason: 'missing color' });
                    return;
                }
                configs.push({
                    property: prop,
                    from: fromVal,
                    to: toVal,
                    type: 'color',
                    duration: duration * 1000,
                    easing: easing
                });
                return;
            }

            // Handle diagonal movement
            if (prop.startsWith('diag-')) {
                const distance = parseFloat(fromVal) || 200;
                const angleMap = { 'diag-45': 45, 'diag-135': 135, 'diag-225': 225, 'diag-315': 315 };
                const angleDeg = angleMap[prop] || 45;
                const signX = (angleDeg === 45 || angleDeg === 135) ? 1 : -1;
                const signY = (angleDeg === 225 || angleDeg === 135) ? 1 : -1;
                const absDist = distance * Math.cos(Math.PI / 4); // equal x and y for 45° diagonals
                configs.push({
                    property: 'x',
                    from: '__currentX__',
                    to: '__currentX_plus__' + (signX * absDist),
                    type: 'diagonal',
                    _offset: signX * absDist,
                    duration: duration * 1000,
                    easing: easing
                });
                configs.push({
                    property: 'y',
                    from: '__currentY__',
                    to: '__currentY_plus__' + (signY * absDist),
                    type: 'diagonal',
                    _offset: signY * absDist,
                    duration: duration * 1000,
                    easing: easing
                });
                return;
            }

            // Standard numeric property
            let from = parseFloat(fromVal);
            const to = parseFloat(toVal);
            if (isNaN(from)) {
                if (selected.length > 0) {
                    const val = selected[0][prop];
                    if (typeof val === 'number' && !isNaN(val)) from = val;
                    else {
                        dropped.push({ property: prop, reason: 'no current value to use for "From"' });
                        return;
                    }
                } else {
                    dropped.push({ property: prop, reason: 'no selection for "From"' });
                    return;
                }
            }
            if (isNaN(to)) {
                dropped.push({ property: prop, reason: 'missing "To" value' });
                return;
            }
            if (from === to) {
                dropped.push({ property: prop, reason: '"From" equals "To" (no change)' });
                return;
            }

            configs.push({
                property: prop,
                from: from,
                to: to,
                duration: duration * 1000,
                easing: easing
            });
        });

        if (dropped.length > 0) {
            const summary = dropped.map(d => `${propLabel(d.property)} (${d.reason})`).join(', ');
            console.warn('[custom-anim] dropped rows:', dropped);
            Utils.showToast(`Skipped: ${summary}`, 'warning');
        }
        if (duplicates.length > 0) {
            const dupLabels = [...new Set(duplicates)].map(propLabel).join(', ');
            console.warn('[custom-anim] duplicate property rows:', duplicates);
            Utils.showToast(`Duplicate property rows merged — only the last value will run for: ${dupLabels}`, 'warning');
        }

        if (configs.length === 0) {
            Utils.showToast('Fill in From and To values', 'warning');
            return;
        }

        // Resolve diagonal placeholders per-object
        const resolveConfigs = (obj) => {
            return configs.map(cfg => {
                if (cfg.type === 'diagonal') {
                    const baseProp = cfg.property; // 'x' or 'y'
                    return {
                        ...cfg,
                        from: obj[baseProp],
                        to: obj[baseProp] + cfg._offset
                    };
                }
                return cfg;
            });
        };

        if (previewOnly) {
            const originals = selected.map(obj => ({
                id: obj.id,
                x: obj.x, y: obj.y,
                width: obj.width, height: obj.height,
                rotation: obj.rotation,
                depth: obj.depth,
                tiltX: obj.tiltX,
                tiltY: obj.tiltY,
                scaleX: obj.scaleX, scaleY: obj.scaleY,
                opacity: obj.opacity,
                fill: obj.fill, stroke: obj.stroke,
                text: obj.text
            }));

            let previewEndMs = 0;
            selected.forEach(obj => {
                const schedule = this._resolveAnimationSchedule(timing, duration * 1000, obj.animations || []);
                if (schedule.error) return;
                const resolved = resolveConfigs(obj).map(cfg => ({
                    ...cfg,
                    duration: schedule.durationMs,
                    easing: easing
                }));
                previewEndMs = Math.max(previewEndMs, schedule.delayMs + schedule.durationMs);
                setTimeout(() => {
                    resolved.forEach(cfg => {
                        if (cfg.type === 'color') {
                            this.runColorAnimation(obj, cfg);
                        } else {
                            this.runPropertyAnimation(obj, cfg);
                        }
                    });
                }, schedule.delayMs);
            });

            const totalDuration = previewEndMs + 100;
            setTimeout(() => {
                originals.forEach(orig => {
                    const obj = this.objects.getObjectById(orig.id);
                    if (obj) Object.assign(obj, orig);
                });
                this.stage.requestRender();
            }, totalDuration);

            Utils.showToast('Previewing custom animation', 'info');
            return;
        }

        // Apply to all selected objects
        const repeatMode = document.getElementById('param-repeat-mode')?.value || 'restart';
        const afterPlayback = this._normalizeAfterPlayback(document.getElementById('param-after-playback')?.value || 'keep', 'keep');
        selected.forEach(obj => {
            const schedule = this._resolveAnimationSchedule(timing, duration * 1000, obj.animations || []);
            if (schedule.error) return;
            const resolved = resolveConfigs(obj);

            // Build generated configs matching the standard animation format
            const generated = resolved.map(cfg => {
                if (cfg.type === 'color') {
                    return {
                        property: cfg.property,
                        from: cfg.from,
                        to: cfg.to,
                        duration: schedule.durationMs,
                        easing: cfg.easing,
                        type: 'color'
                    };
                }
                return {
                    property: cfg.property,
                    from: cfg.from,
                    to: cfg.to,
                    duration: schedule.durationMs,
                    easing: cfg.easing
                };
            });

            const animData = {
                id: Utils.generateId('anim'),
                type: 'custom',
                name: `Custom (${resolved.map(c => c.property).join('+')})`,
                params: {
                    duration: schedule.durationMs / 1000,
                    delay: timing.delay,
                    easing,
                    repeat,
                    repeatMode,
                    afterPlayback,
                    configs: resolved,
                    startMode: timing.startMode,
                    referenceObjectId: timing.referenceObjectId,
                    referenceRelation: timing.referenceRelation,
                    beginTime: schedule.beginTime,
                    endTime: schedule.endTime
                },
                delay: schedule.delayMs,
                repeat: repeat,
                repeatMode: repeatMode,
                afterPlayback,
                trigger: timing.trigger,
                startMode: timing.startMode,
                generated: generated
            };
            obj.animations.push(animData);
        });

        eventBus.emit('animation:applied', { type: 'custom', objects: selected });
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        this.updateAppliedAnimationsList();
        this.updateCodeOutput();
        Utils.showToast(`Custom animation applied to ${selected.length} object(s)`, 'success');
        this._collapseAnimationPanelAfterApply();
    }

    // --- Click-to-set-destination ---

    // === Chain Animation System ===
    updateChainList() {
        const container = document.getElementById('chain-object-list');
        if (!container) return;

        if (this.chainObjects.length === 0) {
            container.innerHTML = `<div class="empty-state small">
                <i class="fas fa-plus-circle"></i>
                <p>Click objects to add them to the chain</p>
            </div>`;
            return;
        }

        const icons = {
            rectangle: 'fa-square', circle: 'fa-circle', triangle: 'fa-play',
            star: 'fa-star', polygon: 'fa-hexagon', line: 'fa-minus',
            text: 'fa-font', image: 'fa-image', path: 'fa-bezier-curve'
        };

        let html = '';
        this.chainObjects.forEach((entry, idx) => {
            const obj = entry.obj;
            const isGroup = !!entry._groupObjs;
            const displayName = isGroup ? (entry._groupName || 'Group') : obj.name;
            const displayIcon = isGroup ? 'fa-object-group' : (icons[obj.type] || 'fa-cube');
            const memberCount = isGroup ? ` (${entry._groupObjs.length})` : '';
            const isFirst = idx === 0;
            if (idx > 0) {
                html += `<div class="chain-arrow"><i class="fas fa-arrow-down"></i> morphs into</div>`;
            }
            const keepClass = entry.keepAfter ? 'active' : '';
            const keepIcon = entry.keepAfter ? 'fa-eye' : 'fa-eye-slash';
            const keepTitle = entry.keepAfter ? 'Will keep after animation (click to delete)' : 'Will be removed after animation (click to keep)';
            const roleLabel = isFirst ? '<span class="chain-role">Source</span>' : '<span class="chain-role target">Target</span>';
            html += `<div class="chain-item" data-chain-idx="${idx}">
                <span class="chain-idx">${idx + 1}</span>
                <i class="fas ${displayIcon} chain-obj-icon"></i>
                <span class="chain-obj-name">${displayName}${memberCount}</span>
                ${roleLabel}
                <button class="chain-keep-btn ${keepClass}" data-idx="${idx}" title="${keepTitle}"><i class="fas ${keepIcon}"></i></button>
                <button class="chain-remove" data-idx="${idx}" title="Remove from chain"><i class="fas fa-times"></i></button>
            </div>`;
        });
        container.innerHTML = html;

        // Bind remove buttons
        container.querySelectorAll('.chain-remove').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                this.chainObjects.splice(idx, 1);
                this.updateChainList();
            });
        });

        // Bind keep/delete toggle buttons
        container.querySelectorAll('.chain-keep-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const idx = parseInt(btn.dataset.idx);
                this.chainObjects[idx].keepAfter = !this.chainObjects[idx].keepAfter;
                this.updateChainList();
            });
        });
    }

    _getChainProperties() {
        const checkboxes = document.querySelectorAll('.chain-prop-checkboxes input[type="checkbox"]');
        const props = [];
        checkboxes.forEach(cb => {
            if (cb.checked) props.push(cb.value);
        });
        return props;
    }

    _buildChainAnimations(sourceObj, chainEntries, stepDuration, easing, props) {
        // Generate animations where sourceObj transforms through each chain target's state
        const animations = [];
        let cumulativeDelay = 0;

        for (let i = 0; i < chainEntries.length; i++) {
            const target = chainEntries[i].obj;
            const prevState = i === 0 ? sourceObj : chainEntries[i - 1].obj;
            const configs = [];

            // Shape morphing: record target type so the object changes shape at step boundary
            if (props.includes('shape') && prevState.type !== target.type) {
                configs.push({
                    property: '_chainType',
                    _morphTo: target.type,
                    _morphSides: target.sides,
                    _morphInnerRadius: target.innerRadius,
                    _morphBorderRadius: target.borderRadius,
                    from: 0, to: 1, // progress marker for when morph happens
                    duration: stepDuration * 1000,
                    easing
                });
            }

            if (props.includes('position')) {
                if (prevState.x !== target.x) {
                    configs.push({ property: 'x', from: prevState.x, to: target.x, duration: stepDuration * 1000, easing });
                }
                if (prevState.y !== target.y) {
                    configs.push({ property: 'y', from: prevState.y, to: target.y, duration: stepDuration * 1000, easing });
                }
            }
            if (props.includes('size')) {
                if (prevState.width !== target.width) {
                    configs.push({ property: 'width', from: prevState.width, to: target.width, duration: stepDuration * 1000, easing });
                }
                if (prevState.height !== target.height) {
                    configs.push({ property: 'height', from: prevState.height, to: target.height, duration: stepDuration * 1000, easing });
                }
            }
            if (props.includes('rotation')) {
                if (prevState.rotation !== target.rotation) {
                    configs.push({ property: 'rotation', from: prevState.rotation, to: target.rotation, duration: stepDuration * 1000, easing });
                }
            }
            if (props.includes('opacity')) {
                if (prevState.opacity !== target.opacity) {
                    configs.push({ property: 'opacity', from: prevState.opacity, to: target.opacity, duration: stepDuration * 1000, easing });
                }
            }
            if (props.includes('scale')) {
                if (prevState.scaleX !== target.scaleX) {
                    configs.push({ property: 'scaleX', from: prevState.scaleX, to: target.scaleX, duration: stepDuration * 1000, easing });
                }
                if (prevState.scaleY !== target.scaleY) {
                    configs.push({ property: 'scaleY', from: prevState.scaleY, to: target.scaleY, duration: stepDuration * 1000, easing });
                }
            }
            if (props.includes('color')) {
                if (prevState.fill !== target.fill) {
                    // Convert hex to RGB for interpolation
                    const fromRgb = this._hexToRgb(prevState.fill);
                    const toRgb = this._hexToRgb(target.fill);
                    if (fromRgb && toRgb) {
                        configs.push({ property: '_colorR', from: fromRgb.r, to: toRgb.r, duration: stepDuration * 1000, easing });
                        configs.push({ property: '_colorG', from: fromRgb.g, to: toRgb.g, duration: stepDuration * 1000, easing });
                        configs.push({ property: '_colorB', from: fromRgb.b, to: toRgb.b, duration: stepDuration * 1000, easing });
                    }
                }
            }

            // Add delay so each step runs after previous
            if (configs.length > 0) {
                animations.push({
                    delay: cumulativeDelay * 1000,
                    targetName: target.name,
                    targetType: target.type,
                    configs: configs
                });
            }
            cumulativeDelay += stepDuration;
        }

        return animations;
    }

    applyChainAnimation() {
        if (this.chainObjects.length < 2) {
            Utils.showToast('Add at least 2 objects to the chain', 'warning');
            return;
        }

        const stepDuration = parseFloat(document.getElementById('chain-step-duration')?.value) || 1;
        const easing = document.getElementById('chain-easing')?.value || 'easeInOut';
        const trigger = document.getElementById('chain-trigger')?.value || 'onLoad';
        const outputMode = document.getElementById('chain-output-mode')?.value || 'merged';
        const timing = this.getTimingParams('chain-timeline');
        const props = this._getChainProperties();
        if (props.length === 0) {
            Utils.showToast('Select at least one property to animate', 'warning');
            return;
        }

        const sourceEntry = this.chainObjects[0];
        const targetEntries = this.chainObjects.slice(1);
        const hasGroups = sourceEntry._groupObjs || targetEntries.some(e => e._groupObjs);

        if (hasGroups) {
            // Group-aware chain: each member of the source group chains to the
            // corresponding member of each target group (matched by index/z-order)
            const sourceObjs = sourceEntry._groupObjs || [sourceEntry.obj];
            const sourceName = sourceEntry._groupName || sourceEntry.obj.name;
            const targetGroupNames = targetEntries.map(e => e._groupName || e.obj.name);

            let appliedCount = 0;
            sourceObjs.forEach((srcObj, memberIdx) => {
                // Build a per-member target list by picking the matching member from each target entry
                const memberTargetEntries = targetEntries.map(entry => {
                    const memberObjs = entry._groupObjs || [entry.obj];
                    // Match by index, clamped to available members
                    const targetObj = memberObjs[Math.min(memberIdx, memberObjs.length - 1)];
                    return { obj: targetObj, keepAfter: entry.keepAfter };
                });

                const rawChainAnims = this._buildChainAnimations(srcObj, memberTargetEntries, stepDuration, easing, props);
                const chainGroupId = Utils.generateId('chain');
                const totalSteps = rawChainAnims.length;
                const schedule = this._resolveAnimationSchedule(timing, stepDuration * totalSteps * 1000, srcObj.animations || []);
                if (schedule.error) return;
                const resolvedStepDuration = totalSteps > 0 ? (schedule.durationMs / totalSteps) / 1000 : stepDuration;
                const chainAnims = this._buildChainAnimations(srcObj, memberTargetEntries, resolvedStepDuration, easing, props);

                const allConfigs = [];
                chainAnims.forEach(step => {
                    step.configs.forEach(cfg => {
                        allConfigs.push({ ...cfg, _stepDelay: step.delay });
                    });
                });

                if (outputMode === 'separate') {
                    const stepDurMs = (totalSteps > 0 ? schedule.durationMs / totalSteps : 1000);
                    chainAnims.forEach((step, idx) => {
                        const stepDelayMs = schedule.delayMs + idx * stepDurMs;
                        const stepConfigs = step.configs.map(cfg => ({ ...cfg, duration: stepDurMs }));
                        const stepAnim = {
                            id: Utils.generateId('chain'),
                            type: 'chain',
                            name: `Chain ${idx + 1}/${totalSteps} → ${step.targetName}`,
                            params: {
                                duration: stepDurMs / 1000,
                                easing,
                                steps: 1,
                                delay: timing.delay,
                                startMode: timing.startMode,
                                referenceObjectId: timing.referenceObjectId,
                                referenceRelation: timing.referenceRelation,
                                beginTime: stepDelayMs / 1000,
                                endTime: (stepDelayMs + stepDurMs) / 1000
                            },
                            delay: stepDelayMs,
                            repeat: '1',
                            trigger: trigger,
                            startMode: timing.startMode,
                            generated: stepConfigs,
                            _chainStepMeta: {
                                sourceId: srcObj.id,
                                targetId: memberTargetEntries[idx]?.obj?.id,
                                chainGroupId,
                                stepIndex: idx,
                                totalSteps
                            }
                        };
                        if (idx === totalSteps - 1 && !sourceEntry.keepAfter) {
                            stepAnim._deleteSourceAfter = true;
                        }
                        srcObj.animations.push(stepAnim);
                    });
                    appliedCount++;
                    return;
                }

                const animData = {
                    id: chainGroupId,
                    type: 'chain',
                    name: `Chain → ${targetGroupNames.join(' → ')}`,
                    params: {
                        duration: schedule.durationMs / 1000,
                        easing,
                        steps: totalSteps,
                        delay: timing.delay,
                        startMode: timing.startMode,
                        referenceObjectId: timing.referenceObjectId,
                        referenceRelation: timing.referenceRelation,
                        beginTime: schedule.beginTime,
                        endTime: schedule.endTime
                    },
                    delay: schedule.delayMs,
                    repeat: '1',
                    trigger: trigger,
                    startMode: timing.startMode,
                    generated: allConfigs,
                    _chainMeta: {
                        sourceId: srcObj.id,
                        targetIds: memberTargetEntries.map(e => e.obj.id),
                        stepDuration: resolvedStepDuration,
                        props: props
                    }
                };
                if (!sourceEntry.keepAfter) {
                    animData._deleteSourceAfter = true;
                }
                srcObj.animations.push(animData);
                appliedCount++;
            });

            // Delete target objects that are not marked "keep"
            const deletedNames = [];
            targetEntries.forEach(entry => {
                if (!entry.keepAfter) {
                    const objs = entry._groupObjs || [entry.obj];
                    objs.forEach(o => {
                        deletedNames.push(o.name);
                        this.objects.removeObject(o.id);
                    });
                }
            });

            this.chainObjects = [];
            this.updateChainList();
            eventBus.emit('animation:applied', { type: 'chain', objects: sourceObjs });
            eventBus.emit('timeline:update');
            this.updateAppliedAnimationsList();
            this.updateCodeOutput();
            this.stage.requestRender();
            eventBus.emit('history:push');

            let msg = `Group chain applied to ${appliedCount} object(s) from "${sourceName}"`;
            if (deletedNames.length > 0) msg += ` — removed ${deletedNames.length} target(s)`;
            Utils.showToast(msg, 'success');
            this._collapseAnimationPanelAfterApply();
            return;
        }

        // Original single-object chain logic
        const sourceObj = sourceEntry.obj;
        const rawChainAnims = this._buildChainAnimations(sourceObj, targetEntries, stepDuration, easing, props);

        // Build target names for display
        const targetNames = targetEntries.map(e => e.obj.name).join(' → ');
        const chainGroupId = Utils.generateId('chain');
        const totalSteps = rawChainAnims.length;
        const schedule = this._resolveAnimationSchedule(timing, stepDuration * totalSteps * 1000, sourceObj.animations || []);
        if (schedule.error) {
            Utils.showToast(schedule.error, 'warning');
            return;
        }
        const resolvedStepDuration = totalSteps > 0 ? (schedule.durationMs / totalSteps) / 1000 : stepDuration;
        const chainAnims = this._buildChainAnimations(sourceObj, targetEntries, resolvedStepDuration, easing, props);

        // Create one consolidated chain animation entry that contains all step configs
        // This keeps the applied-animations list clean (one entry per chain)
        const allConfigs = [];
        chainAnims.forEach(step => {
            step.configs.forEach(cfg => {
                // Each config gets the step's delay baked in
                allConfigs.push({ ...cfg, _stepDelay: step.delay });
            });
        });

        if (outputMode === 'separate') {
            // Emit one animation entry per step on the source object so each step
            // appears as its own draggable bar in the timeline.
            const stepDurMs = (totalSteps > 0 ? schedule.durationMs / totalSteps : 1000);
            chainAnims.forEach((step, idx) => {
                const stepDelayMs = schedule.delayMs + idx * stepDurMs;
                const stepConfigs = step.configs.map(cfg => {
                    // Strip per-step delay since this whole entry already starts at the step time
                    const { _stepDelay, ...rest } = cfg;
                    return { ...rest, duration: stepDurMs };
                });
                const stepAnim = {
                    id: Utils.generateId('chain'),
                    type: 'chain',
                    name: `Chain ${idx + 1}/${totalSteps} → ${step.targetName}`,
                    params: {
                        duration: stepDurMs / 1000,
                        easing,
                        steps: 1,
                        delay: timing.delay,
                        startMode: timing.startMode,
                        referenceObjectId: timing.referenceObjectId,
                        referenceRelation: timing.referenceRelation,
                        beginTime: stepDelayMs / 1000,
                        endTime: (stepDelayMs + stepDurMs) / 1000
                    },
                    delay: stepDelayMs,
                    repeat: '1',
                    trigger: trigger,
                    startMode: timing.startMode,
                    generated: stepConfigs,
                    _chainStepMeta: {
                        sourceId: sourceObj.id,
                        targetId: targetEntries[idx]?.obj?.id,
                        chainGroupId,
                        stepIndex: idx,
                        totalSteps
                    }
                };
                if (idx === totalSteps - 1 && !sourceEntry.keepAfter) {
                    stepAnim._deleteSourceAfter = true;
                }
                sourceObj.animations.push(stepAnim);
            });
        } else {
            const animData = {
            id: chainGroupId,
            type: 'chain',
            name: `Chain → ${targetNames}`,
            params: {
                duration: schedule.durationMs / 1000,
                easing,
                steps: totalSteps,
                delay: timing.delay,
                startMode: timing.startMode,
                referenceObjectId: timing.referenceObjectId,
                referenceRelation: timing.referenceRelation,
                beginTime: schedule.beginTime,
                endTime: schedule.endTime
            },
            delay: schedule.delayMs,
            repeat: '1',
            trigger: trigger,
            startMode: timing.startMode,
            generated: allConfigs,
            _chainMeta: {
                sourceId: sourceObj.id,
                targetIds: targetEntries.map(e => e.obj.id),
                stepDuration: resolvedStepDuration,
                props: props
            }
        };
        sourceObj.animations.push(animData);
        // Delete source if not marked "keep" (store flag on animation so playback engine handles end-state)
        if (!sourceEntry.keepAfter) {
            animData._deleteSourceAfter = true;
        }
        }

        // Delete target objects that are not marked "keep"
        const deletedNames = [];
        const keptNames = [];
        targetEntries.forEach(entry => {
            if (!entry.keepAfter) {
                deletedNames.push(entry.obj.name);
                this.objects.removeObject(entry.obj.id);
            } else {
                keptNames.push(entry.obj.name);
            }
        });

        // Clear chain builder
        this.chainObjects = [];
        this.updateChainList();

        eventBus.emit('animation:applied', { type: 'chain', objects: [sourceObj] });
        eventBus.emit('timeline:update');
        this.updateAppliedAnimationsList();
        this.updateCodeOutput();
        this.stage.requestRender();

        eventBus.emit('history:push');

        let msg = `Chain animation applied (${totalSteps} steps) to "${sourceObj.name}"`;
        if (deletedNames.length > 0) msg += ` — removed: ${deletedNames.join(', ')}`;
        if (keptNames.length > 0) msg += ` — kept: ${keptNames.join(', ')}`;
        Utils.showToast(msg, 'success');
        this._collapseAnimationPanelAfterApply();
    }

    previewChainAnimation() {
        if (this.chainObjects.length < 2) {
            Utils.showToast('Add at least 2 objects to the chain', 'warning');
            return;
        }

        const stepDuration = parseFloat(document.getElementById('chain-step-duration')?.value) || 1;
        const easing = document.getElementById('chain-easing')?.value || 'easeInOut';
        const timing = this.getTimingParams('chain-timeline');
        const props = this._getChainProperties();
        if (props.length === 0) {
            Utils.showToast('Select at least one property to animate', 'warning');
            return;
        }

        const sourceEntry = this.chainObjects[0];
        const sourceObjs = sourceEntry._groupObjs || [sourceEntry.obj];
        const targetEntries = this.chainObjects.slice(1);

        // Store originals for all source members
        const originals = sourceObjs.map(srcObj => ({
            obj: srcObj,
            x: srcObj.x, y: srcObj.y,
            width: srcObj.width, height: srcObj.height,
            rotation: srcObj.rotation,
            scaleX: srcObj.scaleX, scaleY: srcObj.scaleY,
            opacity: srcObj.opacity,
            fill: srcObj.fill,
            type: srcObj.type,
            sides: srcObj.sides,
            innerRadius: srcObj.innerRadius,
            borderRadius: srcObj.borderRadius
        }));

        // Build and preview chain for each source member
        let previewEndMs = 0;
        sourceObjs.forEach((srcObj, memberIdx) => {
            const memberTargetEntries = targetEntries.map(entry => {
                const memberObjs = entry._groupObjs || [entry.obj];
                return { obj: memberObjs[Math.min(memberIdx, memberObjs.length - 1)], keepAfter: entry.keepAfter };
            });
            const rawChainAnims = this._buildChainAnimations(srcObj, memberTargetEntries, stepDuration, easing, props);
            const totalSteps = rawChainAnims.length;
            const schedule = this._resolveAnimationSchedule(timing, stepDuration * totalSteps * 1000, srcObj.animations || []);
            if (schedule.error) return;
            const resolvedStepDuration = totalSteps > 0 ? (schedule.durationMs / totalSteps) / 1000 : stepDuration;
            const chainAnims = this._buildChainAnimations(srcObj, memberTargetEntries, resolvedStepDuration, easing, props);
            previewEndMs = Math.max(previewEndMs, schedule.delayMs + schedule.durationMs);

            // Play each step sequentially, including shape morphing
            chainAnims.forEach(step => {
                setTimeout(() => {
                    step.configs.forEach(cfg => {
                        if (cfg.property === '_chainType') {
                            const morphDelay = cfg.duration * 0.85;
                            setTimeout(() => {
                                srcObj.type = cfg._morphTo;
                                if (cfg._morphSides !== undefined) srcObj.sides = cfg._morphSides;
                                if (cfg._morphInnerRadius !== undefined) srcObj.innerRadius = cfg._morphInnerRadius;
                                if (cfg._morphBorderRadius !== undefined) srcObj.borderRadius = cfg._morphBorderRadius;
                                this.stage.requestRender();
                            }, morphDelay);
                        } else {
                            this.runPropertyAnimation(srcObj, cfg);
                        }
                    });
                }, schedule.delayMs + step.delay);
            });
        });

        // Restore after all steps complete
        const totalDuration = previewEndMs + 200;
        setTimeout(() => {
            originals.forEach(orig => {
                Object.assign(orig.obj, {
                    x: orig.x, y: orig.y,
                    width: orig.width, height: orig.height,
                    rotation: orig.rotation,
                    scaleX: orig.scaleX, scaleY: orig.scaleY,
                    opacity: orig.opacity,
                    fill: orig.fill,
                    type: orig.type,
                    sides: orig.sides,
                    innerRadius: orig.innerRadius,
                    borderRadius: orig.borderRadius
                });
            });
            this.stage.requestRender();
        }, totalDuration);

        Utils.showToast('Previewing chain animation', 'info');
    }

    // === Stage Sequence Animation ===
    updateSequenceList() {
        const list = document.getElementById('sequence-object-list');
        if (!list) return;
        if (this.sequenceObjects.length === 0) {
            list.innerHTML = '<div class="sequence-empty">Click "Add Object" then select objects on stage in order</div>';
            return;
        }
        list.innerHTML = this.sequenceObjects.map((obj, i) => `
            <div class="sequence-item">
                <span class="sequence-index">${i + 1}</span>
                <span class="sequence-name">${Utils.escapeHtml(obj.name || obj.type)}</span>
                <button class="btn-icon sequence-remove" data-idx="${i}" title="Remove"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
        list.querySelectorAll('.sequence-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                this.sequenceObjects.splice(idx, 1);
                this.updateSequenceList();
            });
        });
    }

    applySequenceAnimation() {
        if (this.sequenceObjects.length === 0) {
            Utils.showToast('Add objects to sequence first', 'warning');
            return;
        }
        const entryStyle = document.getElementById('sequence-entry-style')?.value || 'entry-fade';
        const delayBetween = parseFloat(document.getElementById('sequence-delay')?.value) || 0.3;
        const durationEach = parseFloat(document.getElementById('sequence-duration')?.value) || 0.8;
        const easing = document.getElementById('sequence-easing')?.value || 'easeOut';
        const outputMode = document.getElementById('sequence-output-mode')?.value || 'separate';
        const timing = this.getTimingParams('sequence-timeline');

        const def = this.library[entryStyle];
        if (!def) {
            Utils.showToast('Invalid entry style selected', 'error');
            return;
        }

        const baseBlockMs = ((this.sequenceObjects.length - 1) * delayBetween + durationEach) * 1000;
        const schedule = this._resolveAnimationSchedule(timing, baseBlockMs, this.sequenceObjects[0]?.animations || []);
        if (schedule.error) {
            Utils.showToast(schedule.error, 'warning');
            return;
        }
        const scale = baseBlockMs > 0 ? schedule.durationMs / baseBlockMs : 1;
        const resolvedDelayBetween = delayBetween * scale;
        const resolvedDurationEach = durationEach * scale;
        const appliedObjectCount = this.sequenceObjects.length;

        if (outputMode === 'merged' && appliedObjectCount > 1) {
            // "Merged" sequence: keep one animation entry per object (each
            // object must own its own configs to play correctly), but tag every
            // entry with the same sequence group id and a shared display name.
            // The applied-animations list groups entries with the same
            // _sequenceGroupId under a single collapsible row for compactness.
            const seqGroupId = Utils.generateId('seq');
            const seqName = `${def.name} × ${appliedObjectCount}`;
            this.sequenceObjects.forEach((obj, i) => {
                const effectiveDelay = schedule.delayMs + (i * resolvedDelayBetween * 1000);
                const params = { ...def.params, duration: resolvedDurationEach, easing: easing };
                obj.animations.push({
                    id: Utils.generateId('anim'),
                    type: entryStyle,
                    name: seqName,
                    params: {
                        ...params,
                        delay: timing.delay,
                        startMode: timing.startMode,
                        referenceObjectId: timing.referenceObjectId,
                        referenceRelation: timing.referenceRelation,
                        beginTime: i === 0 ? schedule.beginTime : effectiveDelay / 1000,
                        endTime: i === appliedObjectCount - 1 ? schedule.endTime : (effectiveDelay / 1000) + resolvedDurationEach
                    },
                    delay: effectiveDelay,
                    repeat: '1',
                    repeatMode: 'restart',
                    trigger: 'onLoad',
                    startMode: timing.startMode,
                    generated: this._resolveGeneratedConfigs(def, obj, params, entryStyle),
                    _sequenceGroupId: seqGroupId,
                    _sequenceIndex: i
                });
            });
        } else {
            this.sequenceObjects.forEach((obj, i) => {
            const effectiveDelay = schedule.delayMs + (i * resolvedDelayBetween * 1000);
            const params = { ...def.params, duration: resolvedDurationEach, easing: easing };
            const animData = {
                id: Utils.generateId('anim'),
                type: entryStyle,
                name: def.name,
                params: {
                    ...params,
                    delay: timing.delay,
                    startMode: timing.startMode,
                    referenceObjectId: timing.referenceObjectId,
                    referenceRelation: timing.referenceRelation,
                    beginTime: i === 0 ? schedule.beginTime : effectiveDelay / 1000,
                    endTime: i === this.sequenceObjects.length - 1 ? schedule.endTime : (effectiveDelay / 1000) + resolvedDurationEach
                },
                delay: effectiveDelay,
                repeat: '1',
                repeatMode: 'restart',
                trigger: 'onLoad',
                startMode: timing.startMode,
                generated: this._resolveGeneratedConfigs(def, obj, params, entryStyle)
            };
            obj.animations.push(animData);
        });
        }

        const totalMs = schedule.delayMs + schedule.durationMs;
        if (totalMs > this.totalDuration) {
            this.totalDuration = totalMs + 500;
            eventBus.emit('timeline:duration-changed', this.totalDuration);
        }

        // Reset builder
        this.sequenceAddMode = false;
        const addBtn = document.getElementById('btn-sequence-add');
        if (addBtn) { addBtn.classList.remove('active'); addBtn.innerHTML = '<i class="fas fa-plus"></i> Add Object'; }
        this.sequenceObjects = [];
        this.updateSequenceList();

        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        Utils.showToast(`Sequence applied to ${appliedObjectCount} object(s)`, 'success');
        this._collapseAnimationPanelAfterApply();
    }

    previewSequenceAnimation() {
        if (this.sequenceObjects.length === 0) {
            Utils.showToast('Add objects to sequence first', 'warning');
            return;
        }
        const entryStyle = document.getElementById('sequence-entry-style')?.value || 'entry-fade';
        const delayBetween = parseFloat(document.getElementById('sequence-delay')?.value) || 0.3;
        const durationEach = parseFloat(document.getElementById('sequence-duration')?.value) || 0.8;
        const easing = document.getElementById('sequence-easing')?.value || 'easeOut';
        const timing = this.getTimingParams('sequence-timeline');

        const def = this.library[entryStyle];
        if (!def) return;

        const baseBlockMs = ((this.sequenceObjects.length - 1) * delayBetween + durationEach) * 1000;
        const schedule = this._resolveAnimationSchedule(timing, baseBlockMs, this.sequenceObjects[0]?.animations || []);
        if (schedule.error) {
            Utils.showToast(schedule.error, 'warning');
            return;
        }
        const scale = baseBlockMs > 0 ? schedule.durationMs / baseBlockMs : 1;
        const resolvedDelayBetween = delayBetween * scale;
        const resolvedDurationEach = durationEach * scale;

        // Save original states
        const originals = this.sequenceObjects.map(obj => ({
            obj,
            opacity: obj.opacity,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY,
            rotation: obj.rotation
        }));

        // Pre-hide all sequence objects
        this.sequenceObjects.forEach(obj => { obj.opacity = 0; });
        this.stage.requestRender();

        // Animate each with delay
        this.sequenceObjects.forEach((obj, i) => {
            const delay = schedule.delayMs + (i * resolvedDelayBetween * 1000);
            const params = { ...def.params, duration: resolvedDurationEach, easing };
            const configs = this._resolveGeneratedConfigs(def, obj, params, entryStyle);
            setTimeout(() => {
                configs.forEach(cfg => this.runPropertyAnimation(obj, cfg));
            }, delay);
        });

        // Restore after complete
        const totalDuration = schedule.delayMs + schedule.durationMs + 300;
        setTimeout(() => {
            originals.forEach(orig => {
                Object.assign(orig.obj, {
                    opacity: orig.opacity, x: orig.x, y: orig.y,
                    width: orig.width, height: orig.height,
                    scaleX: orig.scaleX, scaleY: orig.scaleY,
                    rotation: orig.rotation
                });
            });
            this.stage.requestRender();
        }, totalDuration);

        Utils.showToast('Previewing sequence animation', 'info');
    }

    startPickingDestination() {
        const selectedObjects = this.objects.getSelectedObjects();
        if (selectedObjects.length === 0) {
            Utils.showToast('Select an object first', 'warning');
            return;
        }
        if (!this.selectedAnimType) {
            Utils.showToast('Select an animation first', 'warning');
            return;
        }
        const def = this.library[this.selectedAnimType];
        if (!def || (def.category !== 'movement' && def.category !== 'combos')) {
            Utils.showToast('Destination only applies to movement animations', 'info');
            return;
        }
        this.isPickingDestination = true;
        this.destinationTarget = null;
        this.destinationSourceObj = selectedObjects[0];
        this.stage.viewport.style.cursor = 'crosshair';
        Utils.showToast('Click on the stage to set the animation destination', 'info');
        document.getElementById('btn-pick-dest')?.classList.add('active');
    }

    cancelPickingDestination() {
        this.isPickingDestination = false;
        this.destinationTarget = null;
        this.destinationSourceObj = null;
        this._isCustomPick = false;
        this._customPickRow = null;
        this._customPickProp = null;
        this._isPickTargetXY = false;
        this.stage.viewport.style.cursor = '';
        document.getElementById('btn-pick-dest')?.classList.remove('active');
        document.querySelectorAll('.btn-pick-custom-dest.active').forEach(b => b.classList.remove('active'));
    }

    onDestinationPicked(pos) {
        if (!this.isPickingDestination || !this.destinationSourceObj) return;
        const obj = this.destinationSourceObj;

        // === Target X/Y pick mode (Move To Point) ===
        if (this._isPickTargetXY) {
            this._isPickTargetXY = false;
            const tx = document.getElementById('param-target-x');
            const ty = document.getElementById('param-target-y');
            if (tx) tx.value = Math.round(pos.x * 100) / 100;
            if (ty) ty.value = Math.round(pos.y * 100) / 100;
            this.destinationTarget = { x: pos.x, y: pos.y };
            Utils.showToast(`Target set to (${Math.round(pos.x)}, ${Math.round(pos.y)})`, 'success');
            this.stage.requestRender();
            this.cancelPickingDestination();
            return;
        }

        // === Custom animation pick mode ===
        if (this._isCustomPick && this._customPickRow) {
            const prop = this._customPickProp; // 'x' or 'y'
            const toInput = this._customPickRow.querySelector('.custom-to');
            if (toInput) {
                toInput.value = Math.round(pos[prop] * 100) / 100;
            }

            // If both X and Y rows exist, also fill the other coordinate
            const allRows = document.querySelectorAll('#custom-anim-props .custom-prop-row');
            const otherProp = prop === 'x' ? 'y' : 'x';
            allRows.forEach(r => {
                if (r !== this._customPickRow && r.querySelector('.custom-prop-select').value === otherProp) {
                    const otherTo = r.querySelector('.custom-to');
                    if (otherTo && !otherTo.value) {
                        otherTo.value = Math.round(pos[otherProp] * 100) / 100;
                    }
                }
            });

            Utils.showToast(`Target ${prop.toUpperCase()} set to ${Math.round(pos[prop])}`, 'success');
            this.stage.requestRender();
            this.cancelPickingDestination();
            return;
        }

        // === Library animation pick mode ===
        // Reject if clicked the same spot as the object center
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;
        if (Math.abs(pos.x - cx) < 5 && Math.abs(pos.y - cy) < 5) {
            Utils.showToast('Click a different point than the object\'s current position', 'warning');
            return;
        }

        this.destinationTarget = { x: pos.x, y: pos.y };

        // Auto-calculate distance and best direction from the destination
        const dx = pos.x - obj.x;
        const dy = pos.y - obj.y;
        const dist = Math.round(Math.sqrt(dx * dx + dy * dy));

        // Set the main direction based on the dominant axis
        let dir;
        if (Math.abs(dx) >= Math.abs(dy)) {
            dir = dx >= 0 ? 'right' : 'left';
        } else {
            dir = dy >= 0 ? 'down' : 'up';
        }

        // Update direction and distance in the params panel
        const dirEl = document.getElementById('param-direction');
        const distEl = document.getElementById('param-distance');
        if (dirEl) dirEl.value = dir;
        if (distEl) distEl.value = dist;

        Utils.showToast(`Destination set — ${dir} ${dist}px`, 'success');
        this.stage.requestRender();
        this.cancelPickingDestination();
    }

    // Draw the destination crosshair + dashed line on stage (called during render)
    renderDestinationPreview(ctx) {
        if (!this.destinationTarget || !this.destinationSourceObj) return;
        const obj = this.destinationSourceObj;
        const dest = this.destinationTarget;
        const cx = obj.x + obj.width / 2;
        const cy = obj.y + obj.height / 2;

        ctx.save();
        // Dashed line from object center to destination
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.7)';
        ctx.lineWidth = 1.5 / this.stage.zoom;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(dest.x, dest.y);
        ctx.stroke();

        // Crosshair at destination
        const size = 12 / this.stage.zoom;
        ctx.setLineDash([]);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2 / this.stage.zoom;
        ctx.beginPath();
        ctx.moveTo(dest.x - size, dest.y);
        ctx.lineTo(dest.x + size, dest.y);
        ctx.moveTo(dest.x, dest.y - size);
        ctx.lineTo(dest.x, dest.y + size);
        ctx.stroke();

        // Filled circle at center
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(dest.x, dest.y, 3 / this.stage.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    selectAnimation(type) {
        const def = this.library[type];
        if (!def) {
            this.selectedAnimType = null;
            document.getElementById('anim-params')?.classList.add('hidden');
            document.querySelectorAll('.anim-btn').forEach(button => button.classList.remove('selected'));
            Utils.showToast('This animation is no longer available. Choose another animation.', 'warning');
            return;
        }

        // A card preview can still be running when the user changes effects.
        // Restore the object before the next animation reads its starting state.
        this._cancelAllPreviews();
        this.selectedAnimType = type;
        const paramsPanel = document.getElementById('anim-params');
        paramsPanel?.classList.remove('hidden');

        // Show the animation type name in the settings header
        const titleEl = document.getElementById('anim-params-title');
        if (titleEl) {
            titleEl.textContent = `${def.name} — Settings`;
        }

        // Compatibility hint — shows which object types this effect was designed for
        let hintEl = document.getElementById('anim-params-compat');
        if (!hintEl && titleEl && titleEl.parentNode) {
            hintEl = document.createElement('div');
            hintEl.id = 'anim-params-compat';
            hintEl.style.cssText = 'font-size:11px;color:#94a3b8;margin:4px 0 8px;line-height:1.35;';
            titleEl.parentNode.insertBefore(hintEl, titleEl.nextSibling);
        }
        if (hintEl) {
            const works = Array.isArray(def.worksWith) ? def.worksWith : null;
            if (works && works.length) {
                const labels = { text: 'text', rectangle: 'rectangles', circle: 'circles', polygon: 'polygons', star: 'stars', image: 'images', icon: 'icons', path: 'paths', any: 'any object (uses bounding box)' };
                const list = works.map(k => labels[k] || k).join(', ');
                hintEl.textContent = 'Best for: ' + list;
                hintEl.style.display = 'block';
            } else {
                hintEl.style.display = 'none';
            }
        }

        const supportsAnimationSpeed = this._supportsAnimationSpeed(type, def);
        const defKeys = Object.keys(def.params);
        if (supportsAnimationSpeed && !defKeys.includes('animationSpeed')) {
            defKeys.push('animationSpeed');
        }

        // Always-visible fields
        const alwaysVisible = ['start', 'duration', 'easing', 'repeat', 'repeatMode', 'afterPlayback', 'trigger', 'referenceObject', 'referenceRelation', 'begin', 'end'];
        // Conditionally-visible fields — shown only when the animation defines them
        const conditionalFields = [
            'direction', 'distance', 'turns', 'degrees', 'animationSpeed', 'scale', 'amount', 'cps', 'targetX', 'targetY',
            'pelletCount', 'pelletSize', 'pelletShape', 'shotMode', 'pelletColor', 'pelletPathMode', 'pelletPathShape', 'pelletPathStart', 'pelletPathEnd', 'pelletPathReverse',
            'frequency', 'trailLength', 'shotRandomness', 'shotGravity', 'pelletFade', 'spread', 'fragmentCount', 'fragmentMode', 'fragmentShape', 'breakDirection', 'scatter',
            'fragmentStagger', 'fragmentSpin', 'fragmentGravity', 'fragmentFade', 'originalMode', 'rippleRings', 'rippleRadius', 'rippleWidth', 'rippleColor', 'rippleFill', 'rippleFade',
            'sparkleCount', 'sparkleRadius', 'sparkleSize', 'sparkleShape', 'sparkleColor', 'sparkleSpin', 'sparkleFade',
            'echoCount', 'echoOffsetX', 'echoOffsetY', 'echoOpacity', 'echoScaleStep', 'echoFade',
            'glowColor', 'glowBlur', 'glowOpacity', 'glowPulse', 'glowScale',
            'focusColor', 'focusRadius', 'focusRings', 'focusWidth', 'focusDim', 'focusDimOpacity',
            'confettiCount', 'confettiSpread', 'confettiFall', 'confettiSize', 'confettiSpin', 'confettiPalette',
            'orbitCount', 'orbitRadius', 'orbitSize', 'orbitColor', 'orbitSpeed', 'orbitTrail',
            'smokeCount', 'smokeSpread', 'smokeSize', 'smokeDriftY', 'smokeColor', 'smokeOpacity',
            'lightningCount', 'lightningLength', 'lightningJaggedness', 'lightningWidth', 'lightningColor', 'lightningDirection', 'lightningGlow',
            'magnetCount', 'magnetRadius', 'magnetSize', 'magnetColor', 'magnetMode', 'magnetTrail',
            'scanColor', 'scanWidth', 'scanOpacity', 'scanDirection', 'scanGlow',
            'flareColor', 'flareIntensity', 'flareLength', 'flareCount', 'flareAngle',
            'pixelCount', 'pixelSpread', 'pixelSize', 'pixelColorMode', 'pixelColor', 'pixelFade',
            'impactRings', 'impactRadius', 'impactSpikes', 'impactWidth', 'impactColor',
            'waveAmplitude', 'waveFrequency', 'waveSlices', 'waveDirection',
            'effectPreset', 'effectOrigin', 'effectOriginX', 'effectOriginY', 'effectOriginPicker', 'effectBlendMode', 'effectObjectMode',
            'liquidMode', 'liquidPreset', 'liquidColor', 'liquidCount', 'liquidSize', 'liquidSpread', 'liquidGravity', 'liquidDirection',
            'meltAmount', 'meltDrips', 'meltSlices', 'meltColor',
            'revealDirection', 'revealBrushSize', 'revealTexture',
            'swirlCount', 'swirlRadius', 'swirlTurns', 'swirlColor',
            'flameCount', 'flameHeight', 'flameColor',
            'dustCount', 'dustSpread', 'dustSize', 'dustColor',
            'freezeCracks', 'freezeTint', 'freezeOpacity',
            'neonColor', 'neonWidth', 'neonGlow',
            'shadowColor', 'shadowOffset', 'shadowBlur',
            'explosionCount', 'explosionRadius', 'explosionSmokeSize', 'explosionColor',
            'paintColor', 'paintWidth', 'paintLength', 'paintSplatter',
            'glitchIntensity', 'glitchSlices', 'glitchColorShift',
            'shockwaveRings', 'shockwaveRadius', 'shockwaveColor',
            'portalColor', 'portalRadius', 'portalSpokes',
            'shatterPieces', 'shatterSpread', 'shatterColor',
            'chargeBolts', 'chargeRadius', 'chargeColor',
            'inkColor', 'inkSpread', 'inkDrops',
            'smearDistance', 'smearCopies',
            'shakeAmount', 'shakeFrequency',
            'maskShape', 'maskFeather',
            'trailColor', 'pathTrailLength', 'trailWidth',
            'fountainCount', 'fountainSpread', 'fountainColor',
            'sweepColor', 'sweepWidth', 'sweepAngle',
            'weatherType', 'weatherCount', 'weatherColor', 'weatherWind',
            'bubbleCount', 'bubbleSize', 'bubbleColor', 'bubbleSpread',
            'meteorCount', 'meteorColor', 'meteorAngle', 'meteorLength',
            'spotlightColor', 'spotlightRadius', 'spotlightDim',
            'rayCount', 'rayLength', 'rayColor',
            'outlinePulseColor', 'outlinePulseWidth', 'outlinePulseRings',
            'speedLineCount', 'speedLineLength', 'speedLineColor', 'speedLineDirection',
            'starCount', 'starColor', 'starSpread',
            'washColor', 'washOpacity', 'washDirection',
            'haloColor', 'haloRadius', 'haloRings',
            'shadowCastColor', 'shadowCastLength', 'shadowCastAngle', 'shadowCastOpacity',
            'shieldColor', 'shieldRadius', 'shieldBands',
            'lensRadius', 'lensZoom', 'lensColor',
            'rainbowRadius', 'rainbowWidth', 'rainbowBands',
            'vignetteColor', 'vignetteStrength',
            'gridColor', 'gridSize', 'gridOpacity',
            'drawColor', 'drawUseCustom', 'drawWidth',
            'drawGlow', 'drawStart', 'drawClockwise', 'drawTailFade', 'drawShowPen',
            'solidSurfaceId', 'bounceHeight', 'bounceCompression',
            'spawnCount', 'spawnOffsetX', 'spawnOffsetY', 'spawnLayout', 'spawnScaleStep', 'spawnRotationStep', 'spawnColorVariation',
            'spawnAvoidOverlap', 'spawnSpacing', 'spawnClearOriginal', 'spawnIncludeAnimations', 'spawnAsGroup',
            'counterFrom', 'counterTo', 'counterPrefix', 'counterSuffix', 'counterDecimals', 'counterFontSize', 'counterColor',
            'barValues', 'barColor', 'barGap', 'barStagger',
            'progressDirection'
        ];

        document.querySelectorAll('#anim-params .param-field[data-param]').forEach(field => {
            const param = field.dataset.param;
            if (alwaysVisible.includes(param)) {
                field.style.display = 'flex';
            } else if (conditionalFields.includes(param)) {
                const isEffect = def.category === 'effects';
                const commonEffectControls = ['effectPreset', 'effectBlendMode', 'effectObjectMode'];
                const originControls = ['effectOrigin', 'effectOriginX', 'effectOriginY', 'effectOriginPicker'];
                const shouldShow = defKeys.includes(param) || (isEffect && commonEffectControls.includes(param)) || (isEffect && defKeys.includes('effectOrigin') && originControls.includes(param));
                field.style.display = shouldShow ? 'flex' : 'none';
            } else {
                field.style.display = 'none';
            }
        });

        // Set values from animation defaults
        document.getElementById('param-duration').value  = def.params.duration  ?? 1;
        const speedEl = document.getElementById('param-animation-speed');
        if (speedEl) speedEl.value = def.params.animationSpeed ?? 1;
        document.getElementById('param-delay').value     = 0;
        document.getElementById('param-repeat').value    = def.params.repeat ?? '1';
        document.getElementById('param-repeat-mode').value = def.params.repeatMode || 'restart';
        document.getElementById('param-easing').value    = def.params.easing    ?? 'easeInOut';
        document.getElementById('param-after-playback').value = this._getDefaultAfterPlaybackForDefinition(type, def);
        document.getElementById('param-trigger').value   = 'onLoad';
        const startModeEl = document.getElementById('param-start');
        if (startModeEl) startModeEl.value = def.params.startMode || 'after-previous';
        const referenceObjectEl = document.getElementById('param-reference-object');
        const referenceRelationEl = document.getElementById('param-reference-relation');
        const beginEl = document.getElementById('param-begin');
        const endEl = document.getElementById('param-end');
        if (referenceObjectEl) referenceObjectEl.value = '';
        if (referenceRelationEl) referenceRelationEl.value = 'after-reference';
        if (beginEl) beginEl.value = '';
        if (endEl) endEl.value = '';
        this._updateTimingReferenceOverrideState('param');

        // Conditional field values
        if (def.params.direction !== undefined)
            document.getElementById('param-direction').value = def.params.direction;
        if (def.params.distance !== undefined)
            document.getElementById('param-distance').value = def.params.distance;
        if (def.params.turns !== undefined)
            document.getElementById('param-turns').value = def.params.turns;
        if (def.params.degrees !== undefined)
            document.getElementById('param-degrees').value = def.params.degrees;
        if (def.params.scale !== undefined)
            document.getElementById('param-scale').value = def.params.scale;
        if (def.params.amount !== undefined)
            document.getElementById('param-amount').value = def.params.amount;
        if (def.params.cps !== undefined)
            document.getElementById('param-cps').value = def.params.cps;
        if (def.params.pelletCount !== undefined)
            document.getElementById('param-pellet-count').value = def.params.pelletCount;
        if (def.params.pelletSize !== undefined)
            document.getElementById('param-pellet-size').value = def.params.pelletSize;
        if (def.params.pelletShape !== undefined)
            document.getElementById('param-pellet-shape').value = def.params.pelletShape;
        if (def.params.shotMode !== undefined)
            document.getElementById('param-shot-mode').value = def.params.shotMode;
        if (def.params.pelletColor !== undefined)
            document.getElementById('param-pellet-color').value = def.params.pelletColor;
        if (def.params.pelletPathMode !== undefined)
            document.getElementById('param-pellet-path-mode').value = def.params.pelletPathMode;
        if (def.params.pelletPathShapeId !== undefined)
            this._setPelletPathShape(def.params.pelletPathShapeId ? this.objects.getObjectById(def.params.pelletPathShapeId) : null, { silent: true });
        if (def.params.pelletPathStart !== undefined)
            document.getElementById('param-pellet-path-start').value = def.params.pelletPathStart;
        if (def.params.pelletPathEnd !== undefined)
            document.getElementById('param-pellet-path-end').value = def.params.pelletPathEnd;
        if (def.params.pelletPathReverse !== undefined)
            document.getElementById('param-pellet-path-reverse').checked = !!def.params.pelletPathReverse;
        if (def.params.frequency !== undefined)
            document.getElementById('param-frequency').value = def.params.frequency;
        if (def.params.trailLength !== undefined)
            document.getElementById('param-trail-length').value = def.params.trailLength;
        if (def.params.shotRandomness !== undefined)
            document.getElementById('param-shot-randomness').value = def.params.shotRandomness;
        if (def.params.shotGravity !== undefined)
            document.getElementById('param-shot-gravity').value = def.params.shotGravity;
        if (def.params.pelletFade !== undefined)
            document.getElementById('param-pellet-fade').checked = !!def.params.pelletFade;
        if (def.params.spread !== undefined)
            document.getElementById('param-spread').value = def.params.spread;
        if (def.params.fragmentCount !== undefined)
            document.getElementById('param-fragment-count').value = def.params.fragmentCount;
        if (def.params.fragmentMode !== undefined)
            document.getElementById('param-fragment-mode').value = def.params.fragmentMode;
        if (def.params.fragmentShape !== undefined)
            document.getElementById('param-fragment-shape').value = def.params.fragmentShape;
        if (def.params.breakDirection !== undefined)
            document.getElementById('param-break-direction').value = def.params.breakDirection;
        if (def.params.scatter !== undefined)
            document.getElementById('param-scatter').value = def.params.scatter;
        if (def.params.fragmentStagger !== undefined)
            document.getElementById('param-fragment-stagger').value = def.params.fragmentStagger;
        if (def.params.fragmentSpin !== undefined)
            document.getElementById('param-fragment-spin').value = def.params.fragmentSpin;
        if (def.params.fragmentGravity !== undefined)
            document.getElementById('param-fragment-gravity').value = def.params.fragmentGravity;
        if (def.params.fragmentFade !== undefined)
            document.getElementById('param-fragment-fade').checked = !!def.params.fragmentFade;
        if (def.params.originalMode !== undefined)
            document.getElementById('param-original-mode').value = def.params.originalMode;
        if (def.params.rippleRings !== undefined)
            document.getElementById('param-ripple-rings').value = def.params.rippleRings;
        if (def.params.rippleRadius !== undefined)
            document.getElementById('param-ripple-radius').value = def.params.rippleRadius;
        if (def.params.rippleWidth !== undefined)
            document.getElementById('param-ripple-width').value = def.params.rippleWidth;
        if (def.params.rippleColor !== undefined)
            document.getElementById('param-ripple-color').value = def.params.rippleColor;
        if (def.params.rippleFill !== undefined)
            document.getElementById('param-ripple-fill').checked = !!def.params.rippleFill;
        if (def.params.rippleFade !== undefined)
            document.getElementById('param-ripple-fade').checked = !!def.params.rippleFade;
        if (def.params.sparkleCount !== undefined)
            document.getElementById('param-sparkle-count').value = def.params.sparkleCount;
        if (def.params.sparkleRadius !== undefined)
            document.getElementById('param-sparkle-radius').value = def.params.sparkleRadius;
        if (def.params.sparkleSize !== undefined)
            document.getElementById('param-sparkle-size').value = def.params.sparkleSize;
        if (def.params.sparkleShape !== undefined)
            document.getElementById('param-sparkle-shape').value = def.params.sparkleShape;
        if (def.params.sparkleColor !== undefined)
            document.getElementById('param-sparkle-color').value = def.params.sparkleColor;
        if (def.params.sparkleSpin !== undefined)
            document.getElementById('param-sparkle-spin').value = def.params.sparkleSpin;
        if (def.params.sparkleFade !== undefined)
            document.getElementById('param-sparkle-fade').checked = !!def.params.sparkleFade;
        if (def.params.echoCount !== undefined)
            document.getElementById('param-echo-count').value = def.params.echoCount;
        if (def.params.echoOffsetX !== undefined)
            document.getElementById('param-echo-offset-x').value = def.params.echoOffsetX;
        if (def.params.echoOffsetY !== undefined)
            document.getElementById('param-echo-offset-y').value = def.params.echoOffsetY;
        if (def.params.echoOpacity !== undefined)
            document.getElementById('param-echo-opacity').value = def.params.echoOpacity;
        if (def.params.echoScaleStep !== undefined)
            document.getElementById('param-echo-scale-step').value = def.params.echoScaleStep;
        if (def.params.echoFade !== undefined)
            document.getElementById('param-echo-fade').checked = !!def.params.echoFade;
        if (def.params.glowColor !== undefined)
            document.getElementById('param-glow-color').value = def.params.glowColor;
        if (def.params.glowBlur !== undefined)
            document.getElementById('param-glow-blur').value = def.params.glowBlur;
        if (def.params.glowOpacity !== undefined)
            document.getElementById('param-glow-opacity').value = def.params.glowOpacity;
        if (def.params.glowPulse !== undefined)
            document.getElementById('param-glow-pulse').value = def.params.glowPulse;
        if (def.params.glowScale !== undefined)
            document.getElementById('param-glow-scale').value = def.params.glowScale;
        if (def.params.focusColor !== undefined)
            document.getElementById('param-focus-color').value = def.params.focusColor;
        if (def.params.focusRadius !== undefined)
            document.getElementById('param-focus-radius').value = def.params.focusRadius;
        if (def.params.focusRings !== undefined)
            document.getElementById('param-focus-rings').value = def.params.focusRings;
        if (def.params.focusWidth !== undefined)
            document.getElementById('param-focus-width').value = def.params.focusWidth;
        if (def.params.focusDim !== undefined)
            document.getElementById('param-focus-dim').checked = !!def.params.focusDim;
        if (def.params.focusDimOpacity !== undefined)
            document.getElementById('param-focus-dim-opacity').value = def.params.focusDimOpacity;
        if (def.params.confettiCount !== undefined)
            document.getElementById('param-confetti-count').value = def.params.confettiCount;
        if (def.params.confettiSpread !== undefined)
            document.getElementById('param-confetti-spread').value = def.params.confettiSpread;
        if (def.params.confettiFall !== undefined)
            document.getElementById('param-confetti-fall').value = def.params.confettiFall;
        if (def.params.confettiSize !== undefined)
            document.getElementById('param-confetti-size').value = def.params.confettiSize;
        if (def.params.confettiSpin !== undefined)
            document.getElementById('param-confetti-spin').value = def.params.confettiSpin;
        if (def.params.confettiPalette !== undefined)
            document.getElementById('param-confetti-palette').value = def.params.confettiPalette;
        if (def.params.orbitCount !== undefined)
            document.getElementById('param-orbit-count').value = def.params.orbitCount;
        if (def.params.orbitRadius !== undefined)
            document.getElementById('param-orbit-radius').value = def.params.orbitRadius;
        if (def.params.orbitSize !== undefined)
            document.getElementById('param-orbit-size').value = def.params.orbitSize;
        if (def.params.orbitColor !== undefined)
            document.getElementById('param-orbit-color').value = def.params.orbitColor;
        if (def.params.orbitSpeed !== undefined)
            document.getElementById('param-orbit-speed').value = def.params.orbitSpeed;
        if (def.params.orbitTrail !== undefined)
            document.getElementById('param-orbit-trail').checked = !!def.params.orbitTrail;
        if (def.params.smokeCount !== undefined)
            document.getElementById('param-smoke-count').value = def.params.smokeCount;
        if (def.params.smokeSpread !== undefined)
            document.getElementById('param-smoke-spread').value = def.params.smokeSpread;
        if (def.params.smokeSize !== undefined)
            document.getElementById('param-smoke-size').value = def.params.smokeSize;
        if (def.params.smokeDriftY !== undefined)
            document.getElementById('param-smoke-drift-y').value = def.params.smokeDriftY;
        if (def.params.smokeColor !== undefined)
            document.getElementById('param-smoke-color').value = def.params.smokeColor;
        if (def.params.smokeOpacity !== undefined)
            document.getElementById('param-smoke-opacity').value = def.params.smokeOpacity;
        if (def.params.lightningCount !== undefined)
            document.getElementById('param-lightning-count').value = def.params.lightningCount;
        if (def.params.lightningLength !== undefined)
            document.getElementById('param-lightning-length').value = def.params.lightningLength;
        if (def.params.lightningJaggedness !== undefined)
            document.getElementById('param-lightning-jaggedness').value = def.params.lightningJaggedness;
        if (def.params.lightningWidth !== undefined)
            document.getElementById('param-lightning-width').value = def.params.lightningWidth;
        if (def.params.lightningColor !== undefined)
            document.getElementById('param-lightning-color').value = def.params.lightningColor;
        if (def.params.lightningDirection !== undefined)
            document.getElementById('param-lightning-direction').value = def.params.lightningDirection;
        if (def.params.lightningGlow !== undefined)
            document.getElementById('param-lightning-glow').checked = !!def.params.lightningGlow;
        if (def.params.magnetCount !== undefined)
            document.getElementById('param-magnet-count').value = def.params.magnetCount;
        if (def.params.magnetRadius !== undefined)
            document.getElementById('param-magnet-radius').value = def.params.magnetRadius;
        if (def.params.magnetSize !== undefined)
            document.getElementById('param-magnet-size').value = def.params.magnetSize;
        if (def.params.magnetColor !== undefined)
            document.getElementById('param-magnet-color').value = def.params.magnetColor;
        if (def.params.magnetMode !== undefined)
            document.getElementById('param-magnet-mode').value = def.params.magnetMode;
        if (def.params.magnetTrail !== undefined)
            document.getElementById('param-magnet-trail').checked = !!def.params.magnetTrail;
        if (def.params.scanColor !== undefined)
            document.getElementById('param-scan-color').value = def.params.scanColor;
        if (def.params.scanWidth !== undefined)
            document.getElementById('param-scan-width').value = def.params.scanWidth;
        if (def.params.scanOpacity !== undefined)
            document.getElementById('param-scan-opacity').value = def.params.scanOpacity;
        if (def.params.scanDirection !== undefined)
            document.getElementById('param-scan-direction').value = def.params.scanDirection;
        if (def.params.scanGlow !== undefined)
            document.getElementById('param-scan-glow').checked = !!def.params.scanGlow;
        if (def.params.flareColor !== undefined)
            document.getElementById('param-flare-color').value = def.params.flareColor;
        if (def.params.flareIntensity !== undefined)
            document.getElementById('param-flare-intensity').value = def.params.flareIntensity;
        if (def.params.flareLength !== undefined)
            document.getElementById('param-flare-length').value = def.params.flareLength;
        if (def.params.flareCount !== undefined)
            document.getElementById('param-flare-count').value = def.params.flareCount;
        if (def.params.flareAngle !== undefined)
            document.getElementById('param-flare-angle').value = def.params.flareAngle;
        if (def.params.pixelCount !== undefined)
            document.getElementById('param-pixel-count').value = def.params.pixelCount;
        if (def.params.pixelSpread !== undefined)
            document.getElementById('param-pixel-spread').value = def.params.pixelSpread;
        if (def.params.pixelSize !== undefined)
            document.getElementById('param-pixel-size').value = def.params.pixelSize;
        if (def.params.pixelColorMode !== undefined)
            document.getElementById('param-pixel-color-mode').value = def.params.pixelColorMode;
        if (def.params.pixelColor !== undefined)
            document.getElementById('param-pixel-color').value = def.params.pixelColor;
        if (def.params.pixelFade !== undefined)
            document.getElementById('param-pixel-fade').checked = !!def.params.pixelFade;
        if (def.params.impactRings !== undefined)
            document.getElementById('param-impact-rings').value = def.params.impactRings;
        if (def.params.impactRadius !== undefined)
            document.getElementById('param-impact-radius').value = def.params.impactRadius;
        if (def.params.impactSpikes !== undefined)
            document.getElementById('param-impact-spikes').value = def.params.impactSpikes;
        if (def.params.impactWidth !== undefined)
            document.getElementById('param-impact-width').value = def.params.impactWidth;
        if (def.params.impactColor !== undefined)
            document.getElementById('param-impact-color').value = def.params.impactColor;
        if (def.params.waveAmplitude !== undefined)
            document.getElementById('param-wave-amplitude').value = def.params.waveAmplitude;
        if (def.params.waveFrequency !== undefined)
            document.getElementById('param-wave-frequency').value = def.params.waveFrequency;
        if (def.params.waveSlices !== undefined)
            document.getElementById('param-wave-slices').value = def.params.waveSlices;
        if (def.params.waveDirection !== undefined)
            document.getElementById('param-wave-direction').value = def.params.waveDirection;
        this.updateSolidSurfaceOptions();
        if (def.params.effectPreset !== undefined)
            document.getElementById('param-effect-preset').value = def.params.effectPreset;
        if (def.params.effectOrigin !== undefined)
            document.getElementById('param-effect-origin').value = def.params.effectOrigin;
        if (def.params.effectOriginX !== undefined)
            document.getElementById('param-effect-origin-x').value = def.params.effectOriginX;
        if (def.params.effectOriginY !== undefined)
            document.getElementById('param-effect-origin-y').value = def.params.effectOriginY;
        if (def.params.liquidMode !== undefined)
            document.getElementById('param-liquid-mode').value = def.params.liquidMode;
        if (def.params.liquidPreset !== undefined)
            document.getElementById('param-liquid-preset').value = def.params.liquidPreset;
        if (def.params.liquidColor !== undefined)
            document.getElementById('param-liquid-color').value = def.params.liquidColor;
        if (def.params.liquidCount !== undefined)
            document.getElementById('param-liquid-count').value = def.params.liquidCount;
        if (def.params.liquidSize !== undefined)
            document.getElementById('param-liquid-size').value = def.params.liquidSize;
        if (def.params.liquidSpread !== undefined)
            document.getElementById('param-liquid-spread').value = def.params.liquidSpread;
        if (def.params.liquidGravity !== undefined)
            document.getElementById('param-liquid-gravity').value = def.params.liquidGravity;
        if (def.params.liquidDirection !== undefined)
            document.getElementById('param-liquid-direction').value = def.params.liquidDirection;
        if (def.params.meltAmount !== undefined)
            document.getElementById('param-melt-amount').value = def.params.meltAmount;
        if (def.params.meltDrips !== undefined)
            document.getElementById('param-melt-drips').value = def.params.meltDrips;
        if (def.params.meltSlices !== undefined)
            document.getElementById('param-melt-slices').value = def.params.meltSlices;
        if (def.params.meltColor !== undefined)
            document.getElementById('param-melt-color').value = def.params.meltColor;
        if (def.params.revealDirection !== undefined)
            document.getElementById('param-reveal-direction').value = def.params.revealDirection;
        if (def.params.revealBrushSize !== undefined)
            document.getElementById('param-reveal-brush-size').value = def.params.revealBrushSize;
        if (def.params.revealTexture !== undefined)
            document.getElementById('param-reveal-texture').value = def.params.revealTexture;
        if (def.params.swirlCount !== undefined)
            document.getElementById('param-swirl-count').value = def.params.swirlCount;
        if (def.params.swirlRadius !== undefined)
            document.getElementById('param-swirl-radius').value = def.params.swirlRadius;
        if (def.params.swirlTurns !== undefined)
            document.getElementById('param-swirl-turns').value = def.params.swirlTurns;
        if (def.params.swirlColor !== undefined)
            document.getElementById('param-swirl-color').value = def.params.swirlColor;
        if (def.params.flameCount !== undefined)
            document.getElementById('param-flame-count').value = def.params.flameCount;
        if (def.params.flameHeight !== undefined)
            document.getElementById('param-flame-height').value = def.params.flameHeight;
        if (def.params.flameColor !== undefined)
            document.getElementById('param-flame-color').value = def.params.flameColor;
        if (def.params.dustCount !== undefined)
            document.getElementById('param-dust-count').value = def.params.dustCount;
        if (def.params.dustSpread !== undefined)
            document.getElementById('param-dust-spread').value = def.params.dustSpread;
        if (def.params.dustSize !== undefined)
            document.getElementById('param-dust-size').value = def.params.dustSize;
        if (def.params.dustColor !== undefined)
            document.getElementById('param-dust-color').value = def.params.dustColor;
        if (def.params.freezeCracks !== undefined)
            document.getElementById('param-freeze-cracks').value = def.params.freezeCracks;
        if (def.params.freezeTint !== undefined)
            document.getElementById('param-freeze-tint').value = def.params.freezeTint;
        if (def.params.freezeOpacity !== undefined)
            document.getElementById('param-freeze-opacity').value = def.params.freezeOpacity;
        if (def.params.neonColor !== undefined)
            document.getElementById('param-neon-color').value = def.params.neonColor;
        if (def.params.neonWidth !== undefined)
            document.getElementById('param-neon-width').value = def.params.neonWidth;
        if (def.params.neonGlow !== undefined)
            document.getElementById('param-neon-glow').value = def.params.neonGlow;
        if (def.params.drawColor !== undefined)
            document.getElementById('param-draw-color').value = def.params.drawColor;
        if (def.params.drawUseCustom !== undefined)
            document.getElementById('param-draw-use-custom').checked = !!def.params.drawUseCustom;
        if (def.params.drawWidth !== undefined)
            document.getElementById('param-draw-width').value = def.params.drawWidth;
        if (def.params.drawGlow !== undefined) {
            const el = document.getElementById('param-draw-glow');
            if (el) el.value = def.params.drawGlow;
        }
        if (def.params.drawStart !== undefined) {
            const el = document.getElementById('param-draw-start');
            if (el) el.value = def.params.drawStart;
        }
        if (def.params.drawClockwise !== undefined) {
            const el = document.getElementById('param-draw-clockwise');
            if (el) el.checked = def.params.drawClockwise !== false;
        }
        if (def.params.drawTailFade !== undefined) {
            const el = document.getElementById('param-draw-tail-fade');
            if (el) el.value = def.params.drawTailFade;
        }
        if (def.params.drawShowPen !== undefined) {
            const el = document.getElementById('param-draw-show-pen');
            if (el) el.checked = def.params.drawShowPen !== false;
        }
        if (def.params.shadowColor !== undefined)
            document.getElementById('param-shadow-color').value = def.params.shadowColor;
        if (def.params.shadowOffset !== undefined)
            document.getElementById('param-shadow-offset').value = def.params.shadowOffset;
        if (def.params.shadowBlur !== undefined)
            document.getElementById('param-shadow-blur').value = def.params.shadowBlur;
        if (def.params.explosionCount !== undefined)
            document.getElementById('param-explosion-count').value = def.params.explosionCount;
        if (def.params.explosionRadius !== undefined)
            document.getElementById('param-explosion-radius').value = def.params.explosionRadius;
        if (def.params.explosionSmokeSize !== undefined)
            document.getElementById('param-explosion-smoke-size').value = def.params.explosionSmokeSize;
        if (def.params.explosionColor !== undefined)
            document.getElementById('param-explosion-color').value = def.params.explosionColor;
        if (def.params.paintColor !== undefined)
            document.getElementById('param-paint-color').value = def.params.paintColor;
        if (def.params.paintWidth !== undefined)
            document.getElementById('param-paint-width').value = def.params.paintWidth;
        if (def.params.paintLength !== undefined)
            document.getElementById('param-paint-length').value = def.params.paintLength;
        if (def.params.paintSplatter !== undefined)
            document.getElementById('param-paint-splatter').value = def.params.paintSplatter;
        if (def.params.glitchIntensity !== undefined)
            document.getElementById('param-glitch-intensity').value = def.params.glitchIntensity;
        if (def.params.glitchSlices !== undefined)
            document.getElementById('param-glitch-slices').value = def.params.glitchSlices;
        if (def.params.glitchColorShift !== undefined)
            document.getElementById('param-glitch-color-shift').value = def.params.glitchColorShift;
        [
            ['shockwaveRings', 'param-shockwave-rings'],
            ['shockwaveRadius', 'param-shockwave-radius'],
            ['shockwaveColor', 'param-shockwave-color'],
            ['portalColor', 'param-portal-color'],
            ['portalRadius', 'param-portal-radius'],
            ['portalSpokes', 'param-portal-spokes'],
            ['shatterPieces', 'param-shatter-pieces'],
            ['shatterSpread', 'param-shatter-spread'],
            ['shatterColor', 'param-shatter-color'],
            ['chargeBolts', 'param-charge-bolts'],
            ['chargeRadius', 'param-charge-radius'],
            ['chargeColor', 'param-charge-color'],
            ['inkColor', 'param-ink-color'],
            ['inkSpread', 'param-ink-spread'],
            ['inkDrops', 'param-ink-drops'],
            ['smearDistance', 'param-smear-distance'],
            ['smearCopies', 'param-smear-copies'],
            ['shakeAmount', 'param-shake-amount'],
            ['shakeFrequency', 'param-shake-frequency'],
            ['maskShape', 'param-mask-shape'],
            ['maskFeather', 'param-mask-feather'],
            ['trailColor', 'param-trail-color'],
            ['pathTrailLength', 'param-trail-length-effect'],
            ['trailWidth', 'param-trail-width'],
            ['fountainCount', 'param-fountain-count'],
            ['fountainSpread', 'param-fountain-spread'],
            ['fountainColor', 'param-fountain-color'],
            ['sweepColor', 'param-sweep-color'],
            ['sweepWidth', 'param-sweep-width'],
            ['sweepAngle', 'param-sweep-angle'],
            ['weatherType', 'param-weather-type'],
            ['weatherCount', 'param-weather-count'],
            ['weatherColor', 'param-weather-color'],
            ['weatherWind', 'param-weather-wind'],
            ['bubbleCount', 'param-bubble-count'],
            ['bubbleSize', 'param-bubble-size'],
            ['bubbleColor', 'param-bubble-color'],
            ['bubbleSpread', 'param-bubble-spread'],
            ['meteorCount', 'param-meteor-count'],
            ['meteorColor', 'param-meteor-color'],
            ['meteorAngle', 'param-meteor-angle'],
            ['meteorLength', 'param-meteor-length'],
            ['spotlightColor', 'param-spotlight-color'],
            ['spotlightRadius', 'param-spotlight-radius'],
            ['spotlightDim', 'param-spotlight-dim'],
            ['rayCount', 'param-ray-count'],
            ['rayLength', 'param-ray-length'],
            ['rayColor', 'param-ray-color'],
            ['outlinePulseColor', 'param-outline-pulse-color'],
            ['outlinePulseWidth', 'param-outline-pulse-width'],
            ['outlinePulseRings', 'param-outline-pulse-rings'],
            ['speedLineCount', 'param-speed-line-count'],
            ['speedLineLength', 'param-speed-line-length'],
            ['speedLineColor', 'param-speed-line-color'],
            ['speedLineDirection', 'param-speed-line-direction'],
            ['starCount', 'param-star-count'],
            ['starColor', 'param-star-color'],
            ['starSpread', 'param-star-spread'],
            ['washColor', 'param-wash-color'],
            ['washOpacity', 'param-wash-opacity'],
            ['washDirection', 'param-wash-direction'],
            ['haloColor', 'param-halo-color'],
            ['haloRadius', 'param-halo-radius'],
            ['haloRings', 'param-halo-rings'],
            ['shadowCastColor', 'param-shadow-cast-color'],
            ['shadowCastLength', 'param-shadow-cast-length'],
            ['shadowCastAngle', 'param-shadow-cast-angle'],
            ['shadowCastOpacity', 'param-shadow-cast-opacity'],
            ['shieldColor', 'param-shield-color'],
            ['shieldRadius', 'param-shield-radius'],
            ['shieldBands', 'param-shield-bands'],
            ['lensRadius', 'param-lens-radius'],
            ['lensZoom', 'param-lens-zoom'],
            ['lensColor', 'param-lens-color'],
            ['rainbowRadius', 'param-rainbow-radius'],
            ['rainbowWidth', 'param-rainbow-width'],
            ['rainbowBands', 'param-rainbow-bands'],
            ['vignetteColor', 'param-vignette-color'],
            ['vignetteStrength', 'param-vignette-strength'],
            ['gridColor', 'param-grid-color'],
            ['gridSize', 'param-grid-size'],
            ['gridOpacity', 'param-grid-opacity'],
            ['effectBlendMode', 'param-effect-blend-mode'],
            ['effectObjectMode', 'param-effect-object-mode'],
            ['counterFrom', 'param-counter-from'],
            ['counterTo', 'param-counter-to'],
            ['counterPrefix', 'param-counter-prefix'],
            ['counterSuffix', 'param-counter-suffix'],
            ['counterDecimals', 'param-counter-decimals'],
            ['counterFontSize', 'param-counter-font-size'],
            ['counterColor', 'param-counter-color'],
            ['barValues', 'param-bar-values'],
            ['barColor', 'param-bar-color'],
            ['barGap', 'param-bar-gap'],
            ['barStagger', 'param-bar-stagger'],
            ['progressDirection', 'param-progress-direction']
        ].forEach(([key, id]) => {
            if (def.params[key] !== undefined) {
                const el = document.getElementById(id);
                if (el) el.value = def.params[key];
            }
        });
        if (def.params.solidSurfaceId !== undefined)
            document.getElementById('param-solid-surface-id').value = def.params.solidSurfaceId;
        if (def.params.bounceHeight !== undefined)
            document.getElementById('param-bounce-height').value = def.params.bounceHeight;
        if (def.params.bounceCompression !== undefined)
            document.getElementById('param-bounce-compression').value = def.params.bounceCompression;
        if (def.params.spawnCount !== undefined)
            document.getElementById('param-spawn-count').value = def.params.spawnCount;
        if (def.params.spawnOffsetX !== undefined)
            document.getElementById('param-spawn-offset-x').value = def.params.spawnOffsetX;
        if (def.params.spawnOffsetY !== undefined)
            document.getElementById('param-spawn-offset-y').value = def.params.spawnOffsetY;
        if (def.params.spawnLayout !== undefined)
            document.getElementById('param-spawn-layout').value = def.params.spawnLayout;
        if (def.params.spawnScaleStep !== undefined)
            document.getElementById('param-spawn-scale-step').value = def.params.spawnScaleStep;
        if (def.params.spawnRotationStep !== undefined)
            document.getElementById('param-spawn-rotation-step').value = def.params.spawnRotationStep;
        if (def.params.spawnColorVariation !== undefined)
            document.getElementById('param-spawn-color-variation').value = def.params.spawnColorVariation;
        if (def.params.spawnAvoidOverlap !== undefined)
            document.getElementById('param-spawn-avoid-overlap').checked = !!def.params.spawnAvoidOverlap;
        if (def.params.spawnSpacing !== undefined)
            document.getElementById('param-spawn-spacing').value = def.params.spawnSpacing;
        if (def.params.spawnClearOriginal !== undefined)
            document.getElementById('param-spawn-clear-original').checked = !!def.params.spawnClearOriginal;
        if (def.params.spawnIncludeAnimations !== undefined)
            document.getElementById('param-spawn-include-animations').checked = !!def.params.spawnIncludeAnimations;
        if (def.params.spawnAsGroup !== undefined)
            document.getElementById('param-spawn-as-group').checked = !!def.params.spawnAsGroup;

        // Target X / Y — default to the selected object's current center so the field is meaningful
        if (def.params.targetX !== undefined || def.params.targetY !== undefined) {
            const sel = this.objects.getSelectedObjects?.() || [];
            const ref = sel[0];
            const tx = document.getElementById('param-target-x');
            const ty = document.getElementById('param-target-y');
            if (tx) tx.value = ref ? Math.round(ref.x + ref.width / 2) : (def.params.targetX ?? 0);
            if (ty) ty.value = ref ? Math.round(ref.y + ref.height / 2) : (def.params.targetY ?? 0);
        }

        // Scroll the params panel into view
        this.updateEffectPreviewThumbnail();
        this.renderEffectUserPresets();
        setTimeout(() => paramsPanel?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
        this._showImplementationToolbar({
            tool: 'animation-main',
            label: 'Animation',
            hint: 'Apply this animation or cancel',
            onApply: () => this.applySelectedAnimation(),
            onCancel: () => this.cancelAnimation()
        });
    }

    updateEffectPreviewThumbnail() {
        const wrap = document.getElementById('anim-effect-preview');
        const canvas = document.getElementById('anim-effect-preview-canvas');
        const nameEl = document.getElementById('anim-effect-preview-name');
        const kindEl = document.getElementById('anim-effect-preview-kind');
        const def = this.selectedAnimType ? this.library[this.selectedAnimType] : null;
        if (!wrap || !canvas || !def) {
            wrap?.classList.add('hidden');
            return;
        }
        wrap.classList.remove('hidden');
        if (nameEl) nameEl.textContent = def.name || 'Preview';
        if (kindEl) kindEl.textContent = def.category || 'animation';

        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        const w = canvas.width;
        const h = canvas.height;
        const params = this.getAnimationParams();
        ctx.clearRect(0, 0, w, h);
        ctx.save();
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(148,163,184,.18)';
        for (let x = 10; x < w; x += 20) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, h);
            ctx.stroke();
        }
        for (let y = 10; y < h; y += 20) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        const type = this.selectedAnimType;
        const cx = w * 0.48;
        const cy = h * 0.52;
        const objectColor = params.liquidColor || params.meltColor || params.impactColor || '#60a5fa';
        const drawBase = (x = cx - 24, y = cy - 18, alpha = 1) => {
            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.fillStyle = objectColor;
            ctx.strokeStyle = 'rgba(255,255,255,.75)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x, y, 48, 36, 7);
            else ctx.rect(x, y, 48, 36);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        };
        const arrow = (x1, y1, x2, y2, color = '#22c55e') => {
            const angle = Math.atan2(y2 - y1, x2 - x1);
            ctx.save();
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 3;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(x2, y2);
            ctx.lineTo(x2 - 10 * Math.cos(angle - 0.55), y2 - 10 * Math.sin(angle - 0.55));
            ctx.lineTo(x2 - 10 * Math.cos(angle + 0.55), y2 - 10 * Math.sin(angle + 0.55));
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        };

        if (['liquid-motion', 'shoot-pellets', 'confetti-burst', 'pixel-burst', 'impact-burst', 'sparkle-burst', 'dust-away'].includes(type)) {
            drawBase(cx - 24, cy - 18, .9);
            const count = type === 'impact-burst' ? 10 : 22;
            ctx.fillStyle = params.liquidColor || params.pixelColor || params.impactColor || '#38bdf8';
            ctx.strokeStyle = ctx.fillStyle;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                const r = 18 + (i % 5) * 7;
                const x = cx + Math.cos(a) * r;
                const y = cy + Math.sin(a) * r * .72 + (type === 'liquid-motion' ? 10 : 0);
                ctx.globalAlpha = .45 + (i % 4) * .12;
                if (type === 'impact-burst') {
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(x, y);
                    ctx.stroke();
                } else {
                    ctx.beginPath();
                    ctx.arc(x, y, 2.5 + (i % 3), 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (type === 'melt-drip') {
            drawBase(cx - 24, cy - 24, .95);
            ctx.fillStyle = params.meltColor || '#ef4444';
            for (let i = 0; i < 7; i++) {
                const x = cx - 22 + i * 7;
                const len = 15 + (i % 4) * 7;
                ctx.globalAlpha = .75;
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(x, cy + 9, 5, len, 3);
                else ctx.rect(x, cy + 9, 5, len);
                ctx.fill();
                ctx.beginPath();
                ctx.arc(x + 2.5, cy + 9 + len, 3.5, 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'brush-reveal') {
            ctx.save();
            ctx.beginPath();
            ctx.rect(cx - 24, cy - 18, 36, 36);
            for (let i = 0; i < 6; i++) {
                ctx.arc(cx + 8 + i * 7, cy - 18 + (i % 3) * 12, 9, 0, Math.PI * 2);
            }
            ctx.clip();
            drawBase(cx - 24, cy - 18, 1);
            ctx.restore();
            arrow(cx - 55, cy + 28, cx + 55, cy + 28, '#f59e0b');
        } else if (type === 'paint-reveal') {
            ctx.save();
            ctx.beginPath();
            for (let i = 0; i < 7; i++) {
                const y = cy - 20 + i * 7;
                ctx.moveTo(cx - 28, y);
                ctx.quadraticCurveTo(cx - 2, y - 8 + (i % 2) * 10, cx + 24, y + 2);
            }
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.lineWidth = 12;
            ctx.strokeStyle = '#fff';
            ctx.stroke();
            ctx.globalCompositeOperation = 'source-in';
            drawBase(cx - 24, cy - 18, 1);
            ctx.restore();
            arrow(cx - 55, cy + 28, cx + 55, cy + 28, '#22c55e');
        } else if (type === 'fire-flicker') {
            drawBase(cx - 24, cy - 10, .45);
            for (let i = 0; i < 10; i++) {
                const x = cx - 28 + i * 6;
                const flameH = 22 + (i % 4) * 8;
                const grad = ctx.createRadialGradient(x, cy + 10, 1, x, cy + 8, flameH);
                grad.addColorStop(0, '#fef3c7');
                grad.addColorStop(.45, params.flameColor || '#f97316');
                grad.addColorStop(1, 'rgba(239,68,68,0)');
                ctx.fillStyle = grad;
                ctx.globalAlpha = .8;
                ctx.beginPath();
                ctx.moveTo(x, cy - flameH);
                ctx.quadraticCurveTo(x - 7, cy - 8, x - 3, cy + 12);
                ctx.quadraticCurveTo(x, cy + 2, x + 4, cy + 12);
                ctx.quadraticCurveTo(x + 8, cy - 8, x, cy - flameH);
                ctx.fill();
            }
        } else if (type === 'swirl-tornado') {
            ctx.strokeStyle = params.swirlColor || '#38bdf8';
            ctx.lineWidth = 3;
            for (let i = 0; i < 7; i++) {
                const y = cy - 30 + i * 10;
                const rx = 12 + i * 5;
                ctx.globalAlpha = .35 + i * .08;
                ctx.beginPath();
                ctx.ellipse(cx, y, rx, Math.max(5, rx * .3), i * .22, 0, Math.PI * 1.7);
                ctx.stroke();
            }
        } else if (type === 'freeze-crack') {
            drawBase(cx - 24, cy - 18, .65);
            ctx.fillStyle = params.freezeTint || '#93c5fd';
            ctx.globalAlpha = .45;
            ctx.fillRect(cx - 24, cy - 18, 48, 36);
            ctx.strokeStyle = 'rgba(255,255,255,.9)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 6; i++) {
                const x = cx - 18 + i * 7;
                ctx.beginPath();
                ctx.moveTo(x, cy - 12 + (i % 3) * 8);
                ctx.lineTo(x + 12, cy - 2 + (i % 2) * 10);
                ctx.stroke();
            }
        } else if (type === 'neon-trace') {
            drawBase(cx - 24, cy - 18, .25);
            ctx.strokeStyle = params.neonColor || '#22d3ee';
            ctx.lineWidth = params.neonWidth || 5;
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = params.neonGlow || 18;
            ctx.strokeRect(cx - 28, cy - 22, 56, 44);
        } else if (type === 'shadow-pop') {
            ctx.save();
            ctx.globalAlpha = .4;
            ctx.fillStyle = params.shadowColor || '#0f172a';
            ctx.filter = `blur(${Math.max(0, params.shadowBlur || 18) / 3}px)`;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(cx - 12, cy - 2, 48, 36, 7);
            else ctx.rect(cx - 12, cy - 2, 48, 36);
            ctx.fill();
            ctx.restore();
            drawBase(cx - 24, cy - 18, 1);
        } else if (type === 'explosion-smoke') {
            drawBase(cx - 24, cy - 18, .7);
            const count = 18;
            ctx.fillStyle = params.explosionColor || '#64748b';
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                const r = 18 + (i % 5) * 8;
                ctx.globalAlpha = .25 + (i % 4) * .1;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r * .75, 7 + (i % 5), 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = .85;
            ctx.fillStyle = '#f97316';
            ctx.beginPath();
            ctx.arc(cx, cy, 10, 0, Math.PI * 2);
            ctx.fill();
        } else if (type === 'paint-stroke') {
            drawBase(cx - 24, cy - 18, .35);
            ctx.strokeStyle = params.paintColor || '#ec4899';
            ctx.lineWidth = Math.max(4, Math.min(24, params.paintWidth || 18));
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.beginPath();
            ctx.moveTo(cx - 58, cy + 18);
            ctx.bezierCurveTo(cx - 26, cy - 30, cx + 20, cy + 34, cx + 58, cy - 18);
            ctx.stroke();
            ctx.fillStyle = ctx.strokeStyle;
            for (let i = 0; i < 12; i++) {
                ctx.globalAlpha = .5 + (i % 3) * .15;
                ctx.beginPath();
                ctx.arc(cx - 45 + i * 9, cy - 22 + (i % 5) * 10, 2 + (i % 3), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'chromatic-glitch') {
            ctx.save();
            ctx.globalAlpha = .75;
            ctx.fillStyle = '#ef4444';
            ctx.fillRect(cx - 29, cy - 18, 48, 36);
            ctx.fillStyle = '#22d3ee';
            ctx.fillRect(cx - 18, cy - 18, 48, 36);
            ctx.restore();
            drawBase(cx - 24, cy - 18, .85);
            ctx.fillStyle = '#e2e8f0';
            for (let i = 0; i < 6; i++) {
                ctx.globalAlpha = .75;
                ctx.fillRect(cx - 36 + (i % 2) * 12, cy - 22 + i * 8, 72 - i * 6, 3);
            }
        } else if (['shockwave-ring', 'magic-portal', 'electric-charge'].includes(type)) {
            ctx.strokeStyle = params.shockwaveColor || params.portalColor || params.chargeColor || '#38bdf8';
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 14;
            for (let i = 0; i < 4; i++) {
                ctx.globalAlpha = .75 - i * .12;
                ctx.lineWidth = 2 + (i % 2);
                ctx.beginPath();
                if (type === 'electric-charge') {
                    const a = i * Math.PI / 2;
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(a) * 48, cy + Math.sin(a) * 28);
                } else {
                    ctx.ellipse(cx, cy, 16 + i * 9, (10 + i * 5) * (type === 'magic-portal' ? .45 : 1), i * .35, 0, Math.PI * 2);
                }
                ctx.stroke();
            }
        } else if (type === 'glass-shatter') {
            drawBase(cx - 24, cy - 18, .28);
            ctx.fillStyle = params.shatterColor || '#bfdbfe';
            ctx.strokeStyle = 'rgba(255,255,255,.8)';
            for (let i = 0; i < 12; i++) {
                const a = i / 12 * Math.PI * 2;
                ctx.save();
                ctx.translate(cx + Math.cos(a) * (18 + i), cy + Math.sin(a) * (12 + i));
                ctx.rotate(a);
                ctx.beginPath();
                ctx.moveTo(0, -7);
                ctx.lineTo(6, 5);
                ctx.lineTo(-6, 4);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
        } else if (type === 'ink-bleed') {
            ctx.fillStyle = params.inkColor || '#111827';
            for (let i = 0; i < 14; i++) {
                const a = i / 14 * Math.PI * 2;
                ctx.globalAlpha = .38;
                ctx.beginPath();
                ctx.arc(cx + Math.cos(a) * (i * 2.3), cy + Math.sin(a) * (i * 1.7), 5 + (i % 5), 0, Math.PI * 2);
                ctx.fill();
            }
        } else if (type === 'motion-smear' || type === 'stage-shake') {
            for (let i = 5; i >= 0; i--) drawBase(cx - 24 - i * 7, cy - 18 + (type === 'stage-shake' && i % 2 ? 3 : 0), .12 + i * .09);
        } else if (type === 'wave-distort') {
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 5;
            for (let i = -2; i <= 2; i++) {
                ctx.beginPath();
                for (let x = -24; x <= 24; x += 4) {
                    const y = Math.sin((x + i * 6) / 8) * 6;
                    if (x === -24) ctx.moveTo(cx + x, cy + i * 8 + y);
                    else ctx.lineTo(cx + x, cy + i * 8 + y);
                }
                ctx.stroke();
            }
        } else if (type === 'bounce-solid') {
            drawBase(cx - 24, cy - 34, 1);
            ctx.fillStyle = '#94a3b8';
            ctx.fillRect(cx - 58, cy + 27, 116, 6);
            arrow(cx, cy - 8, cx, cy + 20, '#22c55e');
            arrow(cx + 18, cy + 20, cx + 18, cy - 18, '#f59e0b');
        } else if (type === 'wind-drift' || type === 'float' || type === 'fly' || type === 'jump' || def.category === 'movement') {
            drawBase(cx - 24, cy - 18, 1);
            arrow(cx - 58, cy + 22, cx + 58, cy - 10, '#22c55e');
            ctx.strokeStyle = 'rgba(125,211,252,.85)';
            ctx.lineWidth = 2;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.moveTo(22, 20 + i * 16);
                ctx.bezierCurveTo(62, 4 + i * 16, 86, 38 + i * 8, 122, 18 + i * 14);
                ctx.stroke();
            }
        } else {
            drawBase(cx - 24, cy - 18, 1);
            ctx.strokeStyle = '#a78bfa';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(cx, cy, 34, 0.2, Math.PI * 1.8);
            ctx.stroke();
            arrow(cx + 28, cy - 16, cx + 36, cy - 24, '#a78bfa');
        }
        ctx.restore();
    }

    _showImplementationToolbar(config = {}) {
        if (typeof this.objects?._showImplementationFloatingToolbar !== 'function') return;
        const tool = config.tool || 'animation-main';
        if (this._activeImplementationToolbarTool && this._activeImplementationToolbarTool !== tool) {
            this._hideImplementationToolbar(this._activeImplementationToolbarTool);
        }
        this.objects._showImplementationFloatingToolbar({
            tool,
            label: config.label || 'Animation',
            hint: config.hint || 'Apply or cancel this animation setup',
            applyText: config.applyText || 'Apply',
            cancelText: config.cancelText || 'Cancel',
            onApply: config.onApply,
            onCancel: config.onCancel
        });
        this._activeImplementationToolbarTool = tool;
    }

    _hideImplementationToolbar(tool = null) {
        if (typeof this.objects?._hideImplementationFloatingToolbar !== 'function') return;
        const activeTool = tool || this._activeImplementationToolbarTool;
        if (!activeTool) return;
        this.objects._hideImplementationFloatingToolbar(activeTool);
        if (!tool || tool === this._activeImplementationToolbarTool) {
            this._activeImplementationToolbarTool = null;
        }
    }

    cancelAnimation() {
        this._cancelAllPreviews();
        this.selectedAnimType = null;
        document.getElementById('anim-params')?.classList.add('hidden');
        document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('selected'));
        const titleEl = document.getElementById('anim-params-title');
        if (titleEl) titleEl.textContent = 'Animation Settings';
        this._hideImplementationToolbar();
    }

    // After a successful Apply, collapse the picker/params so it's clear the
    // animation was applied. Skip in re-apply mode (user is editing in place).
    _collapseAnimationPanelAfterApply() {
        if (this._reapplyAnimId) return;
        this.selectedAnimType = null;
        document.getElementById('anim-params')?.classList.add('hidden');
        document.querySelectorAll('.anim-btn').forEach(b => b.classList.remove('selected'));
        const titleEl = document.getElementById('anim-params-title');
        if (titleEl) titleEl.textContent = 'Animation Settings';
        const wrap = document.getElementById('applied-animations');
        const list = document.getElementById('applied-anim-list');
        (wrap || list)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        if (list) {
            list.classList.remove('just-applied-pulse');
            // force reflow so animation restarts when re-added
            void list.offsetWidth;
            list.classList.add('just-applied-pulse');
            setTimeout(() => list.classList.remove('just-applied-pulse'), 1200);
        }
        this._hideImplementationToolbar();
    }

    filterAnimations(query) {
        query = query.toLowerCase();
        const container = document.getElementById('basic-animations');
        const activeFilter = this.activeAnimationFilter || 'all';
        const filterActive = activeFilter !== 'all';
        const showAdvancedEffects = !!document.getElementById('anim-show-advanced-effects')?.checked;
        const advancedEffectTypes = this._getAdvancedEffectTypes();
        const activeEffectGroup = this.activeEffectGroup || 'all';
        const groupActive = activeEffectGroup !== 'all';
        const effectGroupChips = document.getElementById('anim-effect-group-chips');
        const shouldShowEffectGroups = activeFilter === 'all' || activeFilter === 'effects' || query.length > 0;
        const groupFilterApplies = groupActive && shouldShowEffectGroups;
        const shouldShowStatus = query.length > 0 || filterActive || groupFilterApplies;
        effectGroupChips?.classList.toggle('visible', shouldShowEffectGroups);
        this.updateEffectGroupCounts(showAdvancedEffects);
        const suggestedTypes = this._getSuggestedEffectTypes();
        // Toggle search-active class to show all sub-tabs when searching
        if (container) {
            container.classList.toggle('search-active', query.length > 0 || filterActive || groupFilterApplies);
        }
        document.querySelectorAll('.anim-btn').forEach(btn => {
            const name = btn.querySelector('span')?.textContent.toLowerCase() || '';
            const type = btn.dataset.anim || '';
            const cat = btn.closest('.anim-category')?.dataset.category || '';
            const textMatch = !query || name.includes(query) || type.includes(query);
            const filterMatch = activeFilter === 'all'
                || (activeFilter === 'favorites' && this.animationFavorites?.has(type))
                || cat === activeFilter;
            const groupMatch = !groupFilterApplies || (cat === 'effects' && this._getEffectGroup(type) === activeEffectGroup);
            const hideAdvanced = !query && !showAdvancedEffects && cat === 'effects' && advancedEffectTypes.has(type);
            btn.classList.toggle('is-advanced-effect', advancedEffectTypes.has(type));
            btn.classList.toggle('is-layerable', this._isEffectOverlayType(type));
            btn.classList.toggle('is-target-suggested', suggestedTypes.has(type));
            btn.style.display = textMatch && filterMatch && groupMatch && !hideAdvanced ? '' : 'none';
        });
        document.querySelectorAll('.anim-category').forEach(cat => {
            const buttons = [...cat.querySelectorAll('.anim-btn')];
            if (!buttons.length) {
                // Keep utility/builders (Chain, Path, Sequence, Custom) visible in normal browse mode.
                const shouldShowUtility = !query && !filterActive && !groupFilterApplies;
                cat.style.display = shouldShowUtility && !cat.classList.contains('hidden') ? '' : 'none';
                return;
            }
            const hasVisible = buttons.some(b => b.style.display !== 'none');
            cat.style.display = hasVisible && !cat.classList.contains('hidden') ? '' : 'none';
        });
        const visibleCount = [...document.querySelectorAll('.anim-btn[data-anim]:not(.anim-favorite-clone):not(.anim-recent-clone)')]
            .filter(btn => btn.style.display !== 'none' && btn.closest('.anim-category')?.style.display !== 'none').length;
        const status = document.getElementById('anim-filter-status');
        const empty = document.getElementById('anim-empty-state');
        const filterLabel = activeFilter === 'all' ? 'all' : activeFilter;
        const groupLabel = groupFilterApplies ? `, ${activeEffectGroup}` : '';
        if (status) {
            status.textContent = `${visibleCount} animation${visibleCount === 1 ? '' : 's'} shown (${filterLabel}${groupLabel})`;
            status.classList.toggle('visible', shouldShowStatus && visibleCount > 0);
        }
        empty?.classList.toggle('hidden', visibleCount > 0 || !shouldShowStatus);
    }

    _getAdvancedEffectTypes() {
        return new Set([
            'magnet-pull',
            'scan-beam',
            'lens-flare',
            'pixel-burst',
            'impact-burst',
            'wave-distort',
            'melt-drip',
            'brush-reveal',
            'paint-reveal',
            'swirl-tornado',
            'dust-away',
            'freeze-crack',
            'neon-trace',
            'explosion-smoke',
            'paint-stroke',
            'chromatic-glitch',
            'shockwave-ring',
            'magic-portal',
            'glass-shatter',
            'electric-charge',
            'ink-bleed',
            'motion-smear',
            'mask-reveal',
            'path-trail',
            'particle-fountain',
            'meteor-shower',
            'spotlight-sweep',
            'radial-rays',
            'speed-lines',
            'starfield-warp',
            'shadow-cast',
            'energy-shield',
            'magnify-lens',
            'rainbow-arc',
            'vignette-pulse',
            'scan-grid',
            'morph-pulse',
            'zoom-pop',
            'elastic-warp',
            'hover-sway',
            'pulse-flash',
            'boomerang-motion',
            'snap-back',
            'spin-pop',
            'drift-fade',
            'orbit-pulse',
            'lift-drop',
            'skid-slide',
            'reveal-bounce'
        ]);
    }

    _getEffectGroup(type) {
        // NOTE: order matters — first match wins. Keep camera/reveal/object before
        // the broader motion/light buckets so overlapping types resolve to the
        // more specific group (e.g. camera-zoom → camera, spotlight-sweep → camera).
        const groups = {
            camera: new Set([
                'stage-shake', 'camera-zoom', 'vignette-pulse', 'spotlight-sweep', 'starfield-warp',
                'whip-pan', 'rack-focus', 'letterbox-bars'
            ]),
            reveal: new Set([
                'brush-reveal', 'paint-reveal', 'mask-reveal', 'scan-beam', 'paint-stroke', 'shadow-pop', 'draw-trace',
                'reveal-bounce', 'drift-fade',
                'iris-reveal', 'clock-wipe', 'blinds-reveal', 'checker-reveal', 'diamond-wipe'
            ]),
            object: new Set([
                'spawn-copies', 'glass-shatter', 'shadow-cast', 'magnet-pull'
            ]),
            particles: new Set([
                'shoot-pellets', 'break-apart', 'sparkle-burst', 'confetti-burst', 'orbit-swarm',
                'smoke-puff', 'pixel-burst', 'impact-burst', 'liquid-motion', 'melt-drip',
                'dust-away', 'freeze-crack', 'explosion-smoke', 'particle-fountain', 'weather-effect',
                'bubble-rise', 'meteor-shower'
            ]),
            light: new Set([
                'glow-aura', 'focus-pulse', 'lightning-arc', 'lens-flare', 'fire-flicker',
                'neon-trace', 'electric-charge', 'light-sweep', 'radial-rays',
                'outline-pulse', 'color-wash', 'halo-burst', 'energy-shield', 'rainbow-arc',
                'pulse-flash'
            ]),
            distortion: new Set([
                'ripple-wave', 'wave-distort', 'swirl-tornado', 'chromatic-glitch', 'ink-bleed',
                'scan-grid', 'magnify-lens'
            ]),
            motion: new Set([
                'morph-pulse', 'zoom-pop', 'elastic-warp', 'hover-sway', 'boomerang-motion',
                'snap-back', 'spin-pop', 'drift-fade', 'orbit-pulse', 'lift-drop', 'skid-slide',
                'reveal-bounce', 'motion-smear', 'path-trail', 'speed-lines'
            ]),
            data: new Set([
                'counter-roll', 'progress-bar', 'bar-chart'
            ]),
            color: new Set([
                'hue-cycle', 'saturation-pulse', 'invert-flash', 'duotone-shift', 'tint-wash'
            ]),
            audio: new Set([
                'beat-pulse', 'waveform-bounce', 'vu-meter'
            ]),
            retro: new Set([
                'old-film', 'vhs-scanlines', 'film-grain', 'crt-bend'
            ])
        };
        for (const [group, items] of Object.entries(groups)) {
            if (items.has(type)) return group;
        }
        return 'motion';
    }

    bindTimingInputButtons() {
        document.querySelectorAll('[data-fill-time-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.fillTimeTarget);
                if (!target) return;
                const seconds = ((this.currentTime || 0) / 1000).toFixed(2).replace(/\.00$/, '');
                target.value = seconds;
                target.dispatchEvent(new Event('input', { bubbles: true }));
            });
        });

        document.querySelectorAll('[data-fill-object-target]').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById(btn.dataset.fillObjectTarget);
                if (!target) return;
                const selected = this.objects.getSelectedObjects();
                const anchorId = this.objects.selectionAnchorId;
                const targetObj = (anchorId && selected.find(obj => obj.id === anchorId)) || selected[0];
                if (!targetObj) {
                    Utils.showToast('Select the reference object on stage first', 'warning');
                    return;
                }
                target.value = targetObj.id;
                target.dispatchEvent(new Event('change', { bubbles: true }));
            });
        });

        document.querySelectorAll('[id$="-reference-object"]').forEach(select => {
            const prefix = select.id.replace(/-reference-object$/, '');
            select.addEventListener('change', () => this._updateTimingReferenceOverrideState(prefix));
            this._updateTimingReferenceOverrideState(prefix);
        });

        // Keep duration / begin / end in sync so editing one updates the others.
        // Without this, when re-applying an animation the saved begin+end pair
        // overrides the duration field in _resolveAnimationSchedule, so changing
        // duration alone has no visible effect.
        this._bindTimingSyncListeners('param');
    }

    _bindTimingSyncListeners(prefix = 'param') {
        const durEl = document.getElementById(`${prefix}-duration`);
        const beginEl = document.getElementById(`${prefix}-begin`);
        const endEl = document.getElementById(`${prefix}-end`);
        if (!durEl || !beginEl || !endEl) return;
        if (durEl._timingSyncBound) return;
        durEl._timingSyncBound = true;

        const num = (el) => {
            const v = parseFloat(el.value);
            return Number.isFinite(v) ? v : null;
        };
        const fmt = (v) => {
            const r = Math.round(v * 1000) / 1000;
            return String(r);
        };

        // Duration changed → if begin set, recompute end = begin + duration.
        // If only end set, recompute begin = max(0, end - duration).
        const syncEndFromDuration = () => {
            const d = num(durEl);
            if (d === null || d <= 0) return;
            const b = num(beginEl);
            const e = num(endEl);
            if (b !== null) {
                endEl.value = fmt(b + d);
            } else if (e !== null) {
                beginEl.value = fmt(Math.max(0, e - d));
            }
        };
        durEl.addEventListener('input', syncEndFromDuration);
        durEl.addEventListener('change', syncEndFromDuration);

        // Begin changed → if duration set, recompute end = begin + duration.
        const syncEndFromBegin = () => {
            const b = num(beginEl);
            const d = num(durEl);
            if (b === null || d === null || d <= 0) return;
            endEl.value = fmt(b + d);
        };
        beginEl.addEventListener('input', syncEndFromBegin);
        beginEl.addEventListener('change', syncEndFromBegin);

        // End changed → recompute duration = end - begin (begin defaults to 0).
        const syncDurationFromEnd = () => {
            const e = num(endEl);
            if (e === null) return;
            const b = num(beginEl) ?? 0;
            const d = e - b;
            if (d > 0) durEl.value = fmt(d);
        };
        endEl.addEventListener('input', syncDurationFromEnd);
        endEl.addEventListener('change', syncDurationFromEnd);
    }

    _getTimingReferenceObjectLabel(obj) {
        if (!obj) return 'Unknown Object';
        const suffix = obj.type ? ` (${obj.type})` : '';
        return `${obj.name || 'Unnamed'}${suffix}`;
    }

    _resolveEffectOrigin(obj, params = {}) {
        const w = obj?.width || 0;
        const h = obj?.height || 0;
        const origin = params.effectOrigin || 'center';
        if (origin === 'custom') {
            const x = parseFloat(params.effectOriginX);
            const y = parseFloat(params.effectOriginY);
            return {
                x: Number.isFinite(x) ? x : (obj.x + w / 2),
                y: Number.isFinite(y) ? y : (obj.y + h / 2)
            };
        }
        const map = {
            top: { x: obj.x + w / 2, y: obj.y },
            bottom: { x: obj.x + w / 2, y: obj.y + h },
            left: { x: obj.x, y: obj.y + h / 2 },
            right: { x: obj.x + w, y: obj.y + h / 2 },
            center: { x: obj.x + w / 2, y: obj.y + h / 2 }
        };
        return map[origin] || map.center;
    }

    startPickingEffectOrigin() {
        this.isPickingEffectOrigin = true;
        const originEl = document.getElementById('param-effect-origin');
        if (originEl) originEl.value = 'custom';
        Utils.showToast('Click the stage where this effect should start', 'info');
        this._showEffectOriginHint();
    }

    onEffectOriginPicked(pos) {
        this.isPickingEffectOrigin = false;
        const originEl = document.getElementById('param-effect-origin');
        const xEl = document.getElementById('param-effect-origin-x');
        const yEl = document.getElementById('param-effect-origin-y');
        if (originEl) originEl.value = 'custom';
        if (xEl) xEl.value = Math.round(pos.x);
        if (yEl) yEl.value = Math.round(pos.y);
        this._hideEffectOriginHint();
        this.updateEffectPreviewThumbnail();
        Utils.showToast(`Effect origin set to ${Math.round(pos.x)}, ${Math.round(pos.y)}`, 'success');
    }

    _showEffectOriginHint() {
        this._hideEffectOriginHint();
        const viewport = this.stage?.viewport;
        if (!viewport) return;
        const hint = document.createElement('div');
        hint.id = 'effect-origin-pick-hint';
        hint.innerHTML = '<i class="fas fa-crosshairs"></i><span>Click stage to set effect origin</span>';
        hint.style.cssText = 'position:absolute;left:50%;top:12px;transform:translateX(-50%);z-index:70;background:rgba(15,23,42,.9);color:#fff;border:1px solid rgba(148,163,184,.35);border-radius:6px;padding:8px 12px;font-size:12px;display:flex;align-items:center;gap:8px;pointer-events:none;';
        viewport.style.position = 'relative';
        viewport.appendChild(hint);
    }

    _hideEffectOriginHint() {
        document.getElementById('effect-origin-pick-hint')?.remove();
    }

    updateTimingReferenceOptions() {
        const stageObjects = this.objects.objects || [];
        document.querySelectorAll('[id$="-reference-object"]').forEach(select => {
            const currentValue = select.value;
            const options = ['<option value="">Use timeline settings</option>'];
            stageObjects.forEach(obj => {
                const safeId = (typeof Utils !== 'undefined' && Utils.escapeHtml) ? Utils.escapeHtml(String(obj.id)) : String(obj.id);
                const safeLabel = (typeof Utils !== 'undefined' && Utils.escapeHtml) ? Utils.escapeHtml(this._getTimingReferenceObjectLabel(obj)) : this._getTimingReferenceObjectLabel(obj);
                options.push(`<option value="${safeId}">${safeLabel}</option>`);
            });
            select.innerHTML = options.join('');
            if (currentValue && stageObjects.some(obj => obj.id === currentValue)) {
                select.value = currentValue;
            }
            const prefix = select.id.replace(/-reference-object$/, '');
            this._updateTimingReferenceOverrideState(prefix);
        });
        this.updateSolidSurfaceOptions();
    }

    updateSolidSurfaceOptions() {
        const select = document.getElementById('param-solid-surface-id');
        if (!select) return;
        const selectedIds = new Set((this.objects.getSelectedObjects?.() || []).map(obj => obj.id));
        const currentValue = select.value;
        const options = ['<option value="">Stage bottom</option>'];
        (this.objects.objects || []).forEach(obj => {
            if (selectedIds.has(obj.id)) return;
            const safeId = (typeof Utils !== 'undefined' && Utils.escapeHtml) ? Utils.escapeHtml(String(obj.id)) : String(obj.id);
            const safeLabel = (typeof Utils !== 'undefined' && Utils.escapeHtml) ? Utils.escapeHtml(this._getTimingReferenceObjectLabel(obj)) : this._getTimingReferenceObjectLabel(obj);
            options.push(`<option value="${safeId}">${safeLabel}</option>`);
        });
        select.innerHTML = options.join('');
        if (currentValue && (this.objects.objects || []).some(obj => obj.id === currentValue)) {
            select.value = currentValue;
        }
    }

    _updateTimingReferenceOverrideState(prefix = 'param') {
        const referenceEl = document.getElementById(`${prefix}-reference-object`);
        const relationEl = document.getElementById(`${prefix}-reference-relation`);
        const hasReference = !!referenceEl?.value;
        if (relationEl) relationEl.disabled = !hasReference;

        ['start', 'delay', 'begin', 'end'].forEach(suffix => {
            const field = document.getElementById(`${prefix}-${suffix}`);
            if (!field) return;
            field.disabled = hasReference;
            field.closest('.param-field')?.classList.toggle('timing-overridden', hasReference);
        });
    }

    startPickingPelletPath() {
        this.isPickingPelletPath = true;
        this.stage.viewport.style.cursor = 'crosshair';
        this.objects._pathPickActive = true;
        document.getElementById('btn-pick-pellet-path-shape')?.classList.add('active');
        Utils.showToast('Click a path or shape on the stage for pellets to follow', 'info');
    }

    cancelPickingPelletPath() {
        this.isPickingPelletPath = false;
        this.stage.viewport.style.cursor = '';
        this.objects._pathPickActive = false;
        document.getElementById('btn-pick-pellet-path-shape')?.classList.remove('active');
    }

    handlePelletPathPick(pos) {
        const hit = this.objects.hitTest(pos.x, pos.y);
        if (!hit) {
            Utils.showToast('No path or shape at that position', 'warning');
            return;
        }
        const hasPath = Array.isArray(hit.pathPoints) && hit.pathPoints.length >= 2;
        const canSampleShape = ['rectangle', 'circle', 'triangle', 'star', 'polygon', 'diamond', 'heart', 'line', 'arrow', 'doubleArrow', 'curvedArrow'].includes(hit.type);
        if (!hasPath && !canSampleShape) {
            Utils.showToast('Pick a drawn path, freeform line, or shape outline', 'warning');
            return;
        }
        this._setPelletPathShape(hit);
        const modeEl = document.getElementById('param-pellet-path-mode');
        if (modeEl) modeEl.value = 'path';
        this.cancelPickingPelletPath();
        this.stage.requestRender();
        Utils.showToast(`Pellet path set: ${hit.name || hit.type}`, 'success');
    }

    _setPelletPathShape(objOrId, options = {}) {
        const obj = typeof objOrId === 'string' ? this.objects.getObjectById(objOrId) : objOrId;
        const idEl = document.getElementById('param-pellet-path-shape-id');
        const tag = document.getElementById('pellet-path-shape-name');
        const label = tag?.querySelector('.path-obj-label');
        if (obj) {
            if (idEl) idEl.value = obj.id;
            if (label) label.textContent = obj.name || obj.type || 'Path';
            tag?.classList.remove('hidden');
        } else {
            if (idEl) idEl.value = '';
            if (label) label.textContent = 'None';
            tag?.classList.add('hidden');
            if (!options.silent) Utils.showToast('Pellet path cleared', 'info');
        }
    }

    _resolvePelletPathPoints(params = {}) {
        if ((params.pelletPathMode || 'straight') !== 'path' || !params.pelletPathShapeId) return null;
        const pathManager = window.app?.pathAnimation;
        const pathObj = this.objects.getObjectById(params.pelletPathShapeId);
        if (!pathObj) return null;
        try {
            let points = [];
            if (pathManager && typeof pathManager.getShapePath === 'function') {
                const basePoints = pathManager.getShapePath(pathObj, 300);
                if (pathManager._buildTravelPath && basePoints?.length >= 2) {
                    const start = Math.max(0, Math.min(1, (parseFloat(params.pelletPathStart) || 0) / 100));
                    const end = Math.max(0, Math.min(1, (parseFloat(params.pelletPathEnd) || 100) / 100));
                    const travelPath = pathManager._buildTravelPath(pathObj, basePoints, start, end, !!params.pelletPathReverse);
                    points = travelPath?.points || [];
                } else {
                    points = basePoints || [];
                }
            } else if (Array.isArray(pathObj.pathPoints)) {
                points = pathObj.pathPoints;
            }
            return points?.length >= 2 ? points.map(p => ({ x: p.x, y: p.y })) : null;
        } catch (_) {
            return null;
        }
    }

    _getObjectTimelineExtents(objectId, excludeAnim = null) {
        if (!objectId) return null;
        const obj = this.objects.getObjectById(objectId);
        if (!obj) return null;
        const animations = (obj.animations || []).filter(anim => anim !== excludeAnim);
        return this._getTimelineExtents(animations);
    }

    _parseOptionalSeconds(value) {
        if (value === '' || value === null || value === undefined) return null;
        const parsed = parseFloat(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    getTimingParams(prefix = 'param') {
        const getValue = (suffix) => document.getElementById(`${prefix}-${suffix}`)?.value;
        const beginRaw = getValue('begin');
        const endRaw = getValue('end');
        return {
            delay: parseFloat(getValue('delay') || 0),
            startMode: getValue('start') || 'after-previous',
            beginTime: this._parseOptionalSeconds(beginRaw),
            endTime: this._parseOptionalSeconds(endRaw),
            hasBeginOverride: beginRaw !== '' && beginRaw !== null && beginRaw !== undefined,
            hasEndOverride: endRaw !== '' && endRaw !== null && endRaw !== undefined,
            referenceObjectId: getValue('reference-object') || '',
            referenceRelation: getValue('reference-relation') || 'after-reference',
            trigger: getValue('trigger') || document.getElementById('param-trigger')?.value || 'onLoad'
        };
    }

    _getDefinitionParamKeys(type, def) {
        const keys = new Set(Object.keys(def?.params || {}));
        if (this._supportsAnimationSpeed(type, def)) keys.add('animationSpeed');
        if (def?.category === 'effects') {
            ['effectPreset', 'effectBlendMode', 'effectObjectMode'].forEach(key => keys.add(key));
            if (keys.has('effectOrigin')) {
                ['effectOriginX', 'effectOriginY'].forEach(key => keys.add(key));
            }
        }
        return keys;
    }

    _filterAnimationParamsForDefinition(params, type, def) {
        const universalKeys = new Set([
            'duration', 'repeat', 'repeatMode', 'afterPlayback', 'easing',
            'delay', 'startMode', 'beginTime', 'endTime',
            'hasBeginOverride', 'hasEndOverride',
            'referenceObjectId', 'referenceRelation', 'trigger'
        ]);
        const definitionKeys = this._getDefinitionParamKeys(type, def);
        return Object.fromEntries(Object.entries(params || {}).filter(([key]) => (
            universalKeys.has(key) || definitionKeys.has(key)
        )));
    }

    getAnimationParams() {
        const easEl = document.getElementById('param-easing');
        const easingValue = (easEl?.value === 'custom' && easEl.dataset.bezier) ? easEl.dataset.bezier : (easEl?.value || 'easeInOut');
        return {
            duration: parseFloat(document.getElementById('param-duration')?.value || 1),
            repeat: document.getElementById('param-repeat')?.value || '1',
            repeatMode: document.getElementById('param-repeat-mode')?.value || 'restart',
            afterPlayback: this._normalizeAfterPlayback(document.getElementById('param-after-playback')?.value || 'keep', 'keep'),
            easing: easingValue,
            direction: document.getElementById('param-direction')?.value || 'right',
            distance: parseInt(document.getElementById('param-distance')?.value || 200),
            turns: parseFloat(document.getElementById('param-turns')?.value || 1),
            degrees: parseFloat(document.getElementById('param-degrees')?.value || 360),
            animationSpeed: parseFloat(document.getElementById('param-animation-speed')?.value || 1),
            scale: parseFloat(document.getElementById('param-scale')?.value || 1.5),
            amount: parseFloat(document.getElementById('param-amount')?.value || 0.3),
            cps: parseInt(document.getElementById('param-cps')?.value || 10),
            pelletCount: parseInt(document.getElementById('param-pellet-count')?.value || 16),
            pelletSize: parseFloat(document.getElementById('param-pellet-size')?.value || 8),
            pelletShape: document.getElementById('param-pellet-shape')?.value || 'circle',
            shotMode: document.getElementById('param-shot-mode')?.value || 'stream',
            pelletColor: document.getElementById('param-pellet-color')?.value || '#f59e0b',
            pelletPathMode: document.getElementById('param-pellet-path-mode')?.value || 'straight',
            pelletPathShapeId: document.getElementById('param-pellet-path-shape-id')?.value || '',
            pelletPathStart: parseFloat(document.getElementById('param-pellet-path-start')?.value || 0),
            pelletPathEnd: parseFloat(document.getElementById('param-pellet-path-end')?.value || 100),
            pelletPathReverse: !!document.getElementById('param-pellet-path-reverse')?.checked,
            frequency: parseFloat(document.getElementById('param-frequency')?.value || 12),
            trailLength: parseFloat(document.getElementById('param-trail-length')?.value || 1),
            shotRandomness: parseFloat(document.getElementById('param-shot-randomness')?.value || 0),
            shotGravity: parseFloat(document.getElementById('param-shot-gravity')?.value || 0),
            pelletFade: !!document.getElementById('param-pellet-fade')?.checked,
            spread: parseFloat(document.getElementById('param-spread')?.value || 0),
            fragmentCount: parseInt(document.getElementById('param-fragment-count')?.value || 16),
            fragmentMode: document.getElementById('param-fragment-mode')?.value || 'equal',
            fragmentShape: document.getElementById('param-fragment-shape')?.value || 'slice',
            breakDirection: document.getElementById('param-break-direction')?.value || 'radial',
            scatter: parseFloat(document.getElementById('param-scatter')?.value || 180),
            fragmentStagger: parseFloat(document.getElementById('param-fragment-stagger')?.value || 0),
            fragmentSpin: parseFloat(document.getElementById('param-fragment-spin')?.value || 1),
            fragmentGravity: parseFloat(document.getElementById('param-fragment-gravity')?.value || 0),
            fragmentFade: !!document.getElementById('param-fragment-fade')?.checked,
            originalMode: document.getElementById('param-original-mode')?.value || 'hide',
            rippleRings: parseInt(document.getElementById('param-ripple-rings')?.value || 3),
            rippleRadius: parseFloat(document.getElementById('param-ripple-radius')?.value || 160),
            rippleWidth: parseFloat(document.getElementById('param-ripple-width')?.value || 4),
            rippleColor: document.getElementById('param-ripple-color')?.value || '#38bdf8',
            rippleFill: !!document.getElementById('param-ripple-fill')?.checked,
            rippleFade: !!document.getElementById('param-ripple-fade')?.checked,
            sparkleCount: parseInt(document.getElementById('param-sparkle-count')?.value || 18),
            sparkleRadius: parseFloat(document.getElementById('param-sparkle-radius')?.value || 140),
            sparkleSize: parseFloat(document.getElementById('param-sparkle-size')?.value || 10),
            sparkleShape: document.getElementById('param-sparkle-shape')?.value || 'star',
            sparkleColor: document.getElementById('param-sparkle-color')?.value || '#facc15',
            sparkleSpin: parseFloat(document.getElementById('param-sparkle-spin')?.value || 1),
            sparkleFade: !!document.getElementById('param-sparkle-fade')?.checked,
            echoCount: parseInt(document.getElementById('param-echo-count')?.value || 4),
            echoOffsetX: parseFloat(document.getElementById('param-echo-offset-x')?.value || -18),
            echoOffsetY: parseFloat(document.getElementById('param-echo-offset-y')?.value || 0),
            echoOpacity: parseFloat(document.getElementById('param-echo-opacity')?.value || 0.45),
            echoScaleStep: parseFloat(document.getElementById('param-echo-scale-step')?.value || 0),
            echoFade: !!document.getElementById('param-echo-fade')?.checked,
            glowColor: document.getElementById('param-glow-color')?.value || '#38bdf8',
            glowBlur: parseFloat(document.getElementById('param-glow-blur')?.value || 28),
            glowOpacity: parseFloat(document.getElementById('param-glow-opacity')?.value || 0.75),
            glowPulse: parseFloat(document.getElementById('param-glow-pulse')?.value || 0.35),
            glowScale: parseFloat(document.getElementById('param-glow-scale')?.value || 1.04),
            focusColor: document.getElementById('param-focus-color')?.value || '#f97316',
            focusRadius: parseFloat(document.getElementById('param-focus-radius')?.value || 80),
            focusRings: parseInt(document.getElementById('param-focus-rings')?.value || 2),
            focusWidth: parseFloat(document.getElementById('param-focus-width')?.value || 4),
            focusDim: !!document.getElementById('param-focus-dim')?.checked,
            focusDimOpacity: parseFloat(document.getElementById('param-focus-dim-opacity')?.value || 0.35),
            confettiCount: parseInt(document.getElementById('param-confetti-count')?.value || 50),
            confettiSpread: parseFloat(document.getElementById('param-confetti-spread')?.value || 220),
            confettiFall: parseFloat(document.getElementById('param-confetti-fall')?.value || 240),
            confettiSize: parseFloat(document.getElementById('param-confetti-size')?.value || 8),
            confettiSpin: parseFloat(document.getElementById('param-confetti-spin')?.value || 2),
            confettiPalette: document.getElementById('param-confetti-palette')?.value || 'party',
            orbitCount: parseInt(document.getElementById('param-orbit-count')?.value || 8),
            orbitRadius: parseFloat(document.getElementById('param-orbit-radius')?.value || 90),
            orbitSize: parseFloat(document.getElementById('param-orbit-size')?.value || 7),
            orbitColor: document.getElementById('param-orbit-color')?.value || '#a78bfa',
            orbitSpeed: parseFloat(document.getElementById('param-orbit-speed')?.value || 1.5),
            orbitTrail: !!document.getElementById('param-orbit-trail')?.checked,
            smokeCount: parseInt(document.getElementById('param-smoke-count')?.value || 18),
            smokeSpread: parseFloat(document.getElementById('param-smoke-spread')?.value || 90),
            smokeSize: parseFloat(document.getElementById('param-smoke-size')?.value || 28),
            smokeDriftY: parseFloat(document.getElementById('param-smoke-drift-y')?.value || -70),
            smokeColor: document.getElementById('param-smoke-color')?.value || '#94a3b8',
            smokeOpacity: parseFloat(document.getElementById('param-smoke-opacity')?.value || 0.45),
            lightningCount: parseInt(document.getElementById('param-lightning-count')?.value || 5),
            lightningLength: parseFloat(document.getElementById('param-lightning-length')?.value || 140),
            lightningJaggedness: parseFloat(document.getElementById('param-lightning-jaggedness')?.value || 26),
            lightningWidth: parseFloat(document.getElementById('param-lightning-width')?.value || 3),
            lightningColor: document.getElementById('param-lightning-color')?.value || '#60a5fa',
            lightningDirection: document.getElementById('param-lightning-direction')?.value || 'radial',
            lightningGlow: !!document.getElementById('param-lightning-glow')?.checked,
            magnetCount: parseInt(document.getElementById('param-magnet-count')?.value || 28),
            magnetRadius: parseFloat(document.getElementById('param-magnet-radius')?.value || 180),
            magnetSize: parseFloat(document.getElementById('param-magnet-size')?.value || 6),
            magnetColor: document.getElementById('param-magnet-color')?.value || '#22c55e',
            magnetMode: document.getElementById('param-magnet-mode')?.value || 'pull',
            magnetTrail: !!document.getElementById('param-magnet-trail')?.checked,
            scanColor: document.getElementById('param-scan-color')?.value || '#22d3ee',
            scanWidth: parseFloat(document.getElementById('param-scan-width')?.value || 28),
            scanOpacity: parseFloat(document.getElementById('param-scan-opacity')?.value || 0.65),
            scanDirection: document.getElementById('param-scan-direction')?.value || 'left-right',
            scanGlow: !!document.getElementById('param-scan-glow')?.checked,
            flareColor: document.getElementById('param-flare-color')?.value || '#fef3c7',
            flareIntensity: parseFloat(document.getElementById('param-flare-intensity')?.value || 0.75),
            flareLength: parseFloat(document.getElementById('param-flare-length')?.value || 180),
            flareCount: parseInt(document.getElementById('param-flare-count')?.value || 4),
            flareAngle: parseFloat(document.getElementById('param-flare-angle')?.value || 0),
            pixelCount: parseInt(document.getElementById('param-pixel-count')?.value || 42),
            pixelSpread: parseFloat(document.getElementById('param-pixel-spread')?.value || 150),
            pixelSize: parseFloat(document.getElementById('param-pixel-size')?.value || 8),
            pixelColorMode: document.getElementById('param-pixel-color-mode')?.value || 'object',
            pixelColor: document.getElementById('param-pixel-color')?.value || '#38bdf8',
            pixelFade: !!document.getElementById('param-pixel-fade')?.checked,
            impactRings: parseInt(document.getElementById('param-impact-rings')?.value || 2),
            impactRadius: parseFloat(document.getElementById('param-impact-radius')?.value || 180),
            impactSpikes: parseInt(document.getElementById('param-impact-spikes')?.value || 14),
            impactWidth: parseFloat(document.getElementById('param-impact-width')?.value || 5),
            impactColor: document.getElementById('param-impact-color')?.value || '#f97316',
            waveAmplitude: parseFloat(document.getElementById('param-wave-amplitude')?.value || 18),
            waveFrequency: parseFloat(document.getElementById('param-wave-frequency')?.value || 3),
            waveSlices: parseInt(document.getElementById('param-wave-slices')?.value || 28),
            waveDirection: document.getElementById('param-wave-direction')?.value || 'horizontal',
            effectPreset: document.getElementById('param-effect-preset')?.value || 'custom',
            effectOrigin: document.getElementById('param-effect-origin')?.value || 'center',
            effectOriginX: parseFloat(document.getElementById('param-effect-origin-x')?.value || 0),
            effectOriginY: parseFloat(document.getElementById('param-effect-origin-y')?.value || 0),
            effectBlendMode: document.getElementById('param-effect-blend-mode')?.value || 'source-over',
            effectObjectMode: document.getElementById('param-effect-object-mode')?.value || 'auto',
            liquidMode: document.getElementById('param-liquid-mode')?.value || 'splash',
            liquidPreset: document.getElementById('param-liquid-preset')?.value || 'water',
            liquidColor: document.getElementById('param-liquid-color')?.value || '#38bdf8',
            liquidCount: parseInt(document.getElementById('param-liquid-count')?.value || 34),
            liquidSize: parseFloat(document.getElementById('param-liquid-size')?.value || 9),
            liquidSpread: parseFloat(document.getElementById('param-liquid-spread')?.value || 180),
            liquidGravity: parseFloat(document.getElementById('param-liquid-gravity')?.value || 160),
            liquidDirection: document.getElementById('param-liquid-direction')?.value || 'down',
            meltAmount: parseFloat(document.getElementById('param-melt-amount')?.value || 90),
            meltDrips: parseInt(document.getElementById('param-melt-drips')?.value || 12),
            meltSlices: parseInt(document.getElementById('param-melt-slices')?.value || 24),
            meltColor: document.getElementById('param-melt-color')?.value || '#ef4444',
            revealDirection: document.getElementById('param-reveal-direction')?.value || 'left-right',
            revealBrushSize: parseFloat(document.getElementById('param-reveal-brush-size')?.value || 54),
            revealTexture: parseFloat(document.getElementById('param-reveal-texture')?.value || 0.45),
            swirlCount: parseInt(document.getElementById('param-swirl-count')?.value || 22),
            swirlRadius: parseFloat(document.getElementById('param-swirl-radius')?.value || 130),
            swirlTurns: parseFloat(document.getElementById('param-swirl-turns')?.value || 2.5),
            swirlColor: document.getElementById('param-swirl-color')?.value || '#38bdf8',
            flameCount: parseInt(document.getElementById('param-flame-count')?.value || 28),
            flameHeight: parseFloat(document.getElementById('param-flame-height')?.value || 90),
            flameColor: document.getElementById('param-flame-color')?.value || '#f97316',
            dustCount: parseInt(document.getElementById('param-dust-count')?.value || 80),
            dustSpread: parseFloat(document.getElementById('param-dust-spread')?.value || 210),
            dustSize: parseFloat(document.getElementById('param-dust-size')?.value || 5),
            dustColor: document.getElementById('param-dust-color')?.value || '#cbd5e1',
            freezeCracks: parseInt(document.getElementById('param-freeze-cracks')?.value || 9),
            freezeTint: document.getElementById('param-freeze-tint')?.value || '#93c5fd',
            freezeOpacity: parseFloat(document.getElementById('param-freeze-opacity')?.value || 0.55),
            neonColor: document.getElementById('param-neon-color')?.value || '#22d3ee',
            neonWidth: parseFloat(document.getElementById('param-neon-width')?.value || 5),
            neonGlow: parseFloat(document.getElementById('param-neon-glow')?.value || 18),
            drawColor: document.getElementById('param-draw-color')?.value || '#38bdf8',
            drawUseCustom: !!document.getElementById('param-draw-use-custom')?.checked,
            drawWidth: parseFloat(document.getElementById('param-draw-width')?.value || 4),
            drawGlow: parseFloat(document.getElementById('param-draw-glow')?.value || 0),
            drawStart: document.getElementById('param-draw-start')?.value || 'top',
            drawClockwise: !!(document.getElementById('param-draw-clockwise')?.checked ?? true),
            drawTailFade: parseFloat(document.getElementById('param-draw-tail-fade')?.value || 0),
            drawShowPen: !!(document.getElementById('param-draw-show-pen')?.checked ?? true),
            shadowColor: document.getElementById('param-shadow-color')?.value || '#0f172a',
            shadowOffset: parseFloat(document.getElementById('param-shadow-offset')?.value || 26),
            shadowBlur: parseFloat(document.getElementById('param-shadow-blur')?.value || 18),
            explosionCount: parseInt(document.getElementById('param-explosion-count')?.value || 24),
            explosionRadius: parseFloat(document.getElementById('param-explosion-radius')?.value || 180),
            explosionSmokeSize: parseFloat(document.getElementById('param-explosion-smoke-size')?.value || 34),
            explosionColor: document.getElementById('param-explosion-color')?.value || '#64748b',
            paintColor: document.getElementById('param-paint-color')?.value || '#ec4899',
            paintWidth: parseFloat(document.getElementById('param-paint-width')?.value || 18),
            paintLength: parseFloat(document.getElementById('param-paint-length')?.value || 220),
            paintSplatter: parseInt(document.getElementById('param-paint-splatter')?.value || 18),
            glitchIntensity: parseFloat(document.getElementById('param-glitch-intensity')?.value || 18),
            glitchSlices: parseInt(document.getElementById('param-glitch-slices')?.value || 12),
            glitchColorShift: parseFloat(document.getElementById('param-glitch-color-shift')?.value || 10),
            shockwaveRings: parseInt(document.getElementById('param-shockwave-rings')?.value || 3),
            shockwaveRadius: parseFloat(document.getElementById('param-shockwave-radius')?.value || 220),
            shockwaveColor: document.getElementById('param-shockwave-color')?.value || '#38bdf8',
            portalColor: document.getElementById('param-portal-color')?.value || '#8b5cf6',
            portalRadius: parseFloat(document.getElementById('param-portal-radius')?.value || 90),
            portalSpokes: parseInt(document.getElementById('param-portal-spokes')?.value || 18),
            shatterPieces: parseInt(document.getElementById('param-shatter-pieces')?.value || 24),
            shatterSpread: parseFloat(document.getElementById('param-shatter-spread')?.value || 180),
            shatterColor: document.getElementById('param-shatter-color')?.value || '#bfdbfe',
            chargeBolts: parseInt(document.getElementById('param-charge-bolts')?.value || 10),
            chargeRadius: parseFloat(document.getElementById('param-charge-radius')?.value || 120),
            chargeColor: document.getElementById('param-charge-color')?.value || '#60a5fa',
            inkColor: document.getElementById('param-ink-color')?.value || '#111827',
            inkSpread: parseFloat(document.getElementById('param-ink-spread')?.value || 120),
            inkDrops: parseInt(document.getElementById('param-ink-drops')?.value || 28),
            smearDistance: parseFloat(document.getElementById('param-smear-distance')?.value || 90),
            smearCopies: parseInt(document.getElementById('param-smear-copies')?.value || 6),
            shakeAmount: parseFloat(document.getElementById('param-shake-amount')?.value || 16),
            shakeFrequency: parseFloat(document.getElementById('param-shake-frequency')?.value || 18),
            maskShape: document.getElementById('param-mask-shape')?.value || 'circle',
            maskFeather: parseFloat(document.getElementById('param-mask-feather')?.value || 10),
            trailColor: document.getElementById('param-trail-color')?.value || '#38bdf8',
            pathTrailLength: parseFloat(document.getElementById('param-trail-length-effect')?.value || 120),
            trailWidth: parseFloat(document.getElementById('param-trail-width')?.value || 16),
            fountainCount: parseInt(document.getElementById('param-fountain-count')?.value || 42),
            fountainSpread: parseFloat(document.getElementById('param-fountain-spread')?.value || 150),
            fountainColor: document.getElementById('param-fountain-color')?.value || '#facc15',
            sweepColor: document.getElementById('param-sweep-color')?.value || '#ffffff',
            sweepWidth: parseFloat(document.getElementById('param-sweep-width')?.value || 70),
            sweepAngle: parseFloat(document.getElementById('param-sweep-angle')?.value || -18),
            weatherType: document.getElementById('param-weather-type')?.value || 'rain',
            weatherCount: parseInt(document.getElementById('param-weather-count')?.value || 80),
            weatherColor: document.getElementById('param-weather-color')?.value || '#bfdbfe',
            weatherWind: parseFloat(document.getElementById('param-weather-wind')?.value || 40),
            bubbleCount: parseInt(document.getElementById('param-bubble-count')?.value || 34),
            bubbleSize: parseFloat(document.getElementById('param-bubble-size')?.value || 18),
            bubbleColor: document.getElementById('param-bubble-color')?.value || '#7dd3fc',
            bubbleSpread: parseFloat(document.getElementById('param-bubble-spread')?.value || 120),
            meteorCount: parseInt(document.getElementById('param-meteor-count')?.value || 18),
            meteorColor: document.getElementById('param-meteor-color')?.value || '#fde68a',
            meteorAngle: parseFloat(document.getElementById('param-meteor-angle')?.value || 28),
            meteorLength: parseFloat(document.getElementById('param-meteor-length')?.value || 130),
            spotlightColor: document.getElementById('param-spotlight-color')?.value || '#fde68a',
            spotlightRadius: parseFloat(document.getElementById('param-spotlight-radius')?.value || 180),
            spotlightDim: parseFloat(document.getElementById('param-spotlight-dim')?.value || 0.28),
            rayCount: parseInt(document.getElementById('param-ray-count')?.value || 18),
            rayLength: parseFloat(document.getElementById('param-ray-length')?.value || 220),
            rayColor: document.getElementById('param-ray-color')?.value || '#facc15',
            outlinePulseColor: document.getElementById('param-outline-pulse-color')?.value || '#38bdf8',
            outlinePulseWidth: parseFloat(document.getElementById('param-outline-pulse-width')?.value || 4),
            outlinePulseRings: parseInt(document.getElementById('param-outline-pulse-rings')?.value || 3),
            speedLineCount: parseInt(document.getElementById('param-speed-line-count')?.value || 36),
            speedLineLength: parseFloat(document.getElementById('param-speed-line-length')?.value || 160),
            speedLineColor: document.getElementById('param-speed-line-color')?.value || '#ffffff',
            speedLineDirection: document.getElementById('param-speed-line-direction')?.value || 'right',
            starCount: parseInt(document.getElementById('param-star-count')?.value || 90),
            starColor: document.getElementById('param-star-color')?.value || '#dbeafe',
            starSpread: parseFloat(document.getElementById('param-star-spread')?.value || 520),
            washColor: document.getElementById('param-wash-color')?.value || '#38bdf8',
            washOpacity: parseFloat(document.getElementById('param-wash-opacity')?.value || 0.35),
            washDirection: document.getElementById('param-wash-direction')?.value || 'right',
            haloColor: document.getElementById('param-halo-color')?.value || '#facc15',
            haloRadius: parseFloat(document.getElementById('param-halo-radius')?.value || 190),
            haloRings: parseInt(document.getElementById('param-halo-rings')?.value || 4),
            shadowCastColor: document.getElementById('param-shadow-cast-color')?.value || '#020617',
            shadowCastLength: parseFloat(document.getElementById('param-shadow-cast-length')?.value || 90),
            shadowCastAngle: parseFloat(document.getElementById('param-shadow-cast-angle')?.value || 35),
            shadowCastOpacity: parseFloat(document.getElementById('param-shadow-cast-opacity')?.value || 0.35),
            shieldColor: document.getElementById('param-shield-color')?.value || '#22d3ee',
            shieldRadius: parseFloat(document.getElementById('param-shield-radius')?.value || 95),
            shieldBands: parseInt(document.getElementById('param-shield-bands')?.value || 4),
            lensRadius: parseFloat(document.getElementById('param-lens-radius')?.value || 90),
            lensZoom: parseFloat(document.getElementById('param-lens-zoom')?.value || 1.35),
            lensColor: document.getElementById('param-lens-color')?.value || '#bfdbfe',
            rainbowRadius: parseFloat(document.getElementById('param-rainbow-radius')?.value || 180),
            rainbowWidth: parseFloat(document.getElementById('param-rainbow-width')?.value || 10),
            rainbowBands: parseInt(document.getElementById('param-rainbow-bands')?.value || 6),
            vignetteColor: document.getElementById('param-vignette-color')?.value || '#020617',
            vignetteStrength: parseFloat(document.getElementById('param-vignette-strength')?.value || 0.55),
            gridColor: document.getElementById('param-grid-color')?.value || '#22d3ee',
            gridSize: parseFloat(document.getElementById('param-grid-size')?.value || 36),
            gridOpacity: parseFloat(document.getElementById('param-grid-opacity')?.value || 0.35),
            solidSurfaceId: document.getElementById('param-solid-surface-id')?.value || '',
            bounceHeight: parseFloat(document.getElementById('param-bounce-height')?.value || 160),
            bounceCompression: parseFloat(document.getElementById('param-bounce-compression')?.value || 1.18),
            spawnCount: parseInt(document.getElementById('param-spawn-count')?.value || 1),
            spawnOffsetX: parseFloat(document.getElementById('param-spawn-offset-x')?.value || 40),
            spawnOffsetY: parseFloat(document.getElementById('param-spawn-offset-y')?.value || 40),
            spawnLayout: document.getElementById('param-spawn-layout')?.value || 'offset',
            spawnScaleStep: parseFloat(document.getElementById('param-spawn-scale-step')?.value || 0),
            spawnRotationStep: parseFloat(document.getElementById('param-spawn-rotation-step')?.value || 0),
            spawnColorVariation: parseFloat(document.getElementById('param-spawn-color-variation')?.value || 0),
            spawnAvoidOverlap: !!document.getElementById('param-spawn-avoid-overlap')?.checked,
            spawnSpacing: parseFloat(document.getElementById('param-spawn-spacing')?.value || 12),
            spawnClearOriginal: !!document.getElementById('param-spawn-clear-original')?.checked,
            spawnIncludeAnimations: !!document.getElementById('param-spawn-include-animations')?.checked,
            spawnAsGroup: !!document.getElementById('param-spawn-as-group')?.checked,
            counterFrom: parseFloat(document.getElementById('param-counter-from')?.value ?? 0),
            counterTo: parseFloat(document.getElementById('param-counter-to')?.value ?? 100),
            counterPrefix: document.getElementById('param-counter-prefix')?.value ?? '',
            counterSuffix: document.getElementById('param-counter-suffix')?.value ?? '',
            counterDecimals: parseInt(document.getElementById('param-counter-decimals')?.value ?? 0),
            counterFontSize: parseFloat(document.getElementById('param-counter-font-size')?.value ?? 64),
            counterColor: document.getElementById('param-counter-color')?.value || '#0f172a',
            barValues: document.getElementById('param-bar-values')?.value ?? '',
            barColor: document.getElementById('param-bar-color')?.value || '',
            barGap: parseFloat(document.getElementById('param-bar-gap')?.value ?? 0.18),
            barStagger: parseFloat(document.getElementById('param-bar-stagger')?.value ?? 0.12),
            progressDirection: document.getElementById('param-progress-direction')?.value || 'left-right',
            targetX: parseFloat(document.getElementById('param-target-x')?.value),
            targetY: parseFloat(document.getElementById('param-target-y')?.value),
            ...this.getTimingParams('param')
        };
    }

    _getAnimationRepeatCount(anim) {
        if (!anim) return 1;
        if (anim.repeat === '-1') return 3;
        if (anim.repeat === 'pingpong') return 2;
        return Math.max(1, parseInt(anim.repeat, 10) || 1);
    }

    _getAnimationDurationMs(anim) {
        const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim?.generated);
        let maxDuration = 0;
        configs.forEach(cfg => {
            if (!cfg?.duration) return;
            maxDuration = Math.max(maxDuration, (cfg._stepDelay || 0) + cfg.duration);
        });
        return maxDuration * this._getAnimationRepeatCount(anim);
    }

    _getTimelineExtents(anims = []) {
        let latestStart = 0;
        let latestEnd = 0;
        anims.forEach(anim => {
            if (!anim) return;
            const start = anim.delay || 0;
            const duration = this._getAnimationDurationMs(anim);
            if (!(duration > 0)) return;
            const end = start + duration;
            latestStart = Math.max(latestStart, start);
            latestEnd = Math.max(latestEnd, end);
        });
        return { latestStart, latestEnd };
    }

    _getGlobalTimelineExtents(excludeAnim = null) {
        // Memoize the heavy traversal — invalidated by `timeline:update` /
        // `history:push` / `animation:applied` (see constructor).
        if (excludeAnim === null && this._gteCache) {
            return this._gteCache;
        }
        const animations = [];
        this.objects.objects.forEach(obj => {
            (obj.animations || []).forEach(anim => {
                if (anim !== excludeAnim) animations.push(anim);
            });
        });
        const result = this._getTimelineExtents(animations);
        if (excludeAnim === null) this._gteCache = result;
        return result;
    }

    _invalidateTimelineExtentsCache() {
        this._gteCache = null;
    }

    _resolveAnimationSchedule(timing, durationMs, existingAnims = [], options = {}) {
        let effectiveDurationMs = Math.max(100, Math.round(durationMs || 0));
        const shouldUseBeginOverride = timing.hasBeginOverride === true || (timing.hasBeginOverride === undefined && timing._manualTiming === true);
        const shouldUseEndOverride = timing.hasEndOverride === true || (timing.hasEndOverride === undefined && timing._manualTiming === true);
        const beginOverrideMs = shouldUseBeginOverride && Number.isFinite(timing.beginTime) ? Math.max(0, Math.round(timing.beginTime * 1000)) : null;
        const endOverrideMs = shouldUseEndOverride && Number.isFinite(timing.endTime) ? Math.max(0, Math.round(timing.endTime * 1000)) : null;
        const offsetMs = Math.round((timing.delay || 0) * 1000);
        let delayMs = 0;

        if (timing.referenceObjectId) {
            const referenceExtents = this._getObjectTimelineExtents(timing.referenceObjectId, options.excludeAnim || null);
            if (!referenceExtents) {
                return { error: 'Reference object is no longer available' };
            }
            switch (timing.referenceRelation) {
                case 'with-reference':
                    delayMs = referenceExtents.latestStart;
                    break;
                case 'before-reference':
                    delayMs = referenceExtents.latestStart - effectiveDurationMs;
                    break;
                case 'after-reference':
                default:
                    delayMs = referenceExtents.latestEnd;
                    break;
            }
        } else if (beginOverrideMs !== null && endOverrideMs !== null) {
            if (endOverrideMs <= beginOverrideMs) {
                return { error: 'End point must be after begin point' };
            }
            effectiveDurationMs = endOverrideMs - beginOverrideMs;
            delayMs = beginOverrideMs;
        } else if (beginOverrideMs !== null) {
            delayMs = beginOverrideMs;
        } else if (endOverrideMs !== null) {
            delayMs = Math.max(0, endOverrideMs - effectiveDurationMs);
        } else {
            const objectExtents = this._getTimelineExtents(existingAnims);
            const globalExtents = this._getGlobalTimelineExtents(options.excludeAnim || null);
            switch (timing.startMode) {
                case 'with-previous':
                    delayMs = objectExtents.latestStart + offsetMs;
                    break;
                case 'after-previous':
                    delayMs = objectExtents.latestEnd + offsetMs;
                    break;
                case 'after-last-global':
                    delayMs = globalExtents.latestEnd + offsetMs;
                    break;
                case 'with-last-global':
                    delayMs = globalExtents.latestStart + offsetMs;
                    break;
                case 'before-last-global':
                    delayMs = globalExtents.latestStart - effectiveDurationMs - offsetMs;
                    break;
                case 'from-start':
                default:
                    delayMs = offsetMs;
                    break;
            }
        }

        delayMs = Math.max(0, Math.round(delayMs));
        return {
            delayMs,
            durationMs: effectiveDurationMs,
            beginTime: delayMs / 1000,
            endTime: (delayMs + effectiveDurationMs) / 1000
        };
    }

    applySelectedAnimation() {
        // Stop any auto-preview rAF loops and snap objects back to their
        // authored state. Without this, the new animation is recorded against
        // mid-preview values (e.g. opacity 0.6 instead of 1) and the object
        // appears slightly faded immediately after Apply.
        this._cancelAllPreviews();
        if (this.isPlaying) {
            this.pause();
        }
        // Re-apply mode for recorded/non-library animations: update timing in place
        if (this._reapplyAnimId && !this.selectedAnimType) {
            const obj = this.objects.getObjectById(this._reapplyObjId);
            if (!obj) {
                Utils.showToast('Re-apply failed: object no longer exists', 'warning');
                this._clearReapplyMode();
                return;
            }
            const idx = obj.animations.findIndex(a => a.id === this._reapplyAnimId);
            if (idx < 0) {
                Utils.showToast('Re-apply failed: animation no longer exists on object', 'warning');
                this._clearReapplyMode();
                return;
            }
            {
                    const anim = obj.animations[idx];
                    const params = this.getAnimationParams();
                    const schedule = this._resolveAnimationSchedule(params, params.duration * 1000, obj.animations.filter(a => a.id !== anim.id), { excludeAnim: anim });
                    if (schedule.error) {
                        Utils.showToast(schedule.error, 'warning');
                        return;
                    }
                    const newDurMs = schedule.durationMs;
                    const newDelayMs = schedule.delayMs;
                    // Update generated configs with new duration/easing
                    const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim.generated);
                    configs.forEach(cfg => {
                        if (cfg) {
                            cfg.duration = newDurMs;
                            cfg.easing = params.easing;
                        }
                    });
                    anim.delay = newDelayMs;
                    anim.params = {
                        ...anim.params,
                        duration: newDurMs / 1000,
                        easing: params.easing,
                        afterPlayback: params.afterPlayback,
                        delay: params.delay,
                        beginTime: schedule.beginTime,
                        endTime: schedule.endTime
                    };
                    anim.repeat = params.repeat;
                    anim.repeatMode = params.repeatMode || 'restart';
                    anim.afterPlayback = params.afterPlayback;
                    anim.trigger = params.trigger;
                    anim.startMode = params.startMode;
                    Utils.showToast(`Updated "${anim.name}" timing`, 'success');
            }
            eventBus.emit('history:push');
            this.updateAppliedAnimationsList();
            this.updateCodeOutput();
            this.calculateTotalDuration();
            eventBus.emit('timeline:update');
            // Keep reapply selection so the user can adjust again
            return;
        }

        if (!this.selectedAnimType) {
            Utils.showToast('Select an animation type first', 'warning');
            return;
        }

        // Redirect follow-path to the dedicated Path Animation panel
        if (this.selectedAnimType === 'follow-path') {
            const pathCategory = document.querySelector('[data-category="path-anim"]');
            if (pathCategory) {
                pathCategory.scrollIntoView({ behavior: 'smooth', block: 'start' });
                pathCategory.style.outline = '2px solid var(--accent-primary)';
                setTimeout(() => pathCategory.style.outline = '', 2000);
            }
            Utils.showToast('Use the "Move Along Shape" panel below to set up path animation — pick a path shape and a mover object', 'info');
            return;
        }

        const selectedObjects = this.objects.getSelectedObjects();
        if (selectedObjects.length === 0) {
            Utils.showToast('Select an object first', 'warning');
            return;
        }

        let params = this.getAnimationParams();
        const def = this.library[this.selectedAnimType];
        if (!def) return;
        params = this._filterAnimationParamsForDefinition(params, this.selectedAnimType, def);

        if (this.selectedAnimType === 'spawn-copies') {
            const created = this._spawnEditableCopies(selectedObjects, params);
            if (created > 0) {
                this.updateCodeOutput();
                eventBus.emit('animation:applied', { type: this.selectedAnimType, objects: selectedObjects });
                eventBus.emit('history:push');
                Utils.showToast(`Spawned ${created} editable object(s)`, 'success');
                this._collapseAnimationPanelAfterApply();
            }
            return;
        }

        // Re-apply mode: replace existing animation instead of adding new one
        if (this._reapplyAnimId) {
            const obj = this.objects.getObjectById(this._reapplyObjId);
            if (!obj) {
                Utils.showToast('Re-apply failed: original object not found. Re-select the animation.', 'warning');
                this._clearReapplyMode();
                return;
            }
            const idx = obj.animations.findIndex(a => a.id === this._reapplyAnimId);
            if (idx < 0) {
                Utils.showToast('Re-apply failed: animation not found on object. Re-select the animation.', 'warning');
                this._clearReapplyMode();
                return;
            }
            {
                    const schedule = this._resolveAnimationSchedule(params, params.duration * 1000, obj.animations.filter(a => a.id !== this._reapplyAnimId), { excludeAnim: obj.animations[idx] });
                    if (schedule.error) {
                        Utils.showToast(schedule.error, 'warning');
                        this._clearReapplyMode();
                        return;
                    }
                    const resolvedParams = {
                        ...params,
                        duration: schedule.durationMs / 1000,
                        beginTime: schedule.beginTime,
                        endTime: schedule.endTime
                    };
                    const generated = this._resolveGeneratedConfigs(def, obj, resolvedParams);
                    if (!generated.length) {
                        Utils.showToast(this._getSpecialAnimationTargetMessage(def), 'warning');
                        this._clearReapplyMode();
                        return;
                    }
                    obj.animations[idx] = {
                        id: this._reapplyAnimId, // keep same id
                        type: this.selectedAnimType,
                        name: def.name,
                        params: { ...resolvedParams },
                        delay: schedule.delayMs,
                        repeat: resolvedParams.repeat,
                        repeatMode: resolvedParams.repeatMode || 'restart',
                        afterPlayback: resolvedParams.afterPlayback,
                        trigger: resolvedParams.trigger,
                        startMode: resolvedParams.startMode,
                        generated: generated
                    };
                    // Keep reapply selection so the user can tweak more than once
                    this.updateAppliedAnimationsList();
                    this.updateCodeOutput();
                    this.calculateTotalDuration();
                    eventBus.emit('timeline:update');
                    eventBus.emit('history:push');
                    Utils.showToast(`Updated "${def.name}" animation`, 'success');
                    return;
            }
        }

        const targetObjects = this._resolvePresenterAnimationTargets(selectedObjects, def);
        if (targetObjects.length === 0) {
            Utils.showToast(this._getSpecialAnimationTargetMessage(def), 'warning');
            return;
        }
        let appliedCount = 0;
        let skippedCount = 0;
        const groupApplyId = targetObjects.length > 1 ? Utils.generateId('apgrp') : null;
        targetObjects.forEach(obj => {
            // Check for conflicting animation at the same start time
            const existingAnims = obj.animations || [];
            const schedule = this._resolveAnimationSchedule(params, params.duration * 1000, existingAnims);
            if (schedule.error) {
                skippedCount++;
                Utils.showToast(schedule.error, 'warning');
                return;
            }
            const resolvedParams = {
                ...params,
                duration: schedule.durationMs / 1000,
                beginTime: schedule.beginTime,
                endTime: schedule.endTime
            };
            const generated = this._resolveGeneratedConfigs(def, obj, resolvedParams);
            if (!generated.length) {
                skippedCount++;
                return;
            }

            // Detect overlapping animation at the same start point
            const newDur = schedule.durationMs;
            const newStart = schedule.delayMs;
            const newEnd = newStart + newDur;
            const overlaps = existingAnims.filter(a => {
                const aConfigs = Array.isArray(a.generated) ? a.generated : [a.generated];
                const aDur = aConfigs.reduce((m, c) => Math.max(m, c?.duration || 0), 0);
                const aStart = a.delay || 0;
                const aEnd = aStart + aDur;
                return newStart < aEnd && newEnd > aStart;
            });
            const isLayerableEffect = (type) => this._isEffectOverlayType(type);
            const overlap = overlaps.find(existing => {
                const effectsCanLayer = isLayerableEffect(this.selectedAnimType) && isLayerableEffect(existing?.type);
                const propertiesCanLayer = this._canLayerDisjointAnimation(def, generated, existing);
                return !effectsCanLayer && !propertiesCanLayer;
            });
            if (overlap && !this._skipConflictCheck) {
                this._conflictPending = { obj, effectiveDelay: schedule.delayMs, params: { ...resolvedParams }, def, overlap };
                this._showConflictDialog(obj, overlap, def);
                return; // handled asynchronously
            }

            if (this._applyAnimToObject(obj, schedule.delayMs, resolvedParams, def, generated, groupApplyId)) {
                appliedCount++;
            }
        });

        if (!this._conflictPending && appliedCount > 0) {
            this.updateAppliedAnimationsList();
            this.updateCodeOutput();
            eventBus.emit('animation:applied', { type: this.selectedAnimType, objects: targetObjects });
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            const suffix = skippedCount > 0 ? ` (${skippedCount} skipped)` : '';
            Utils.showToast(`Applied "${def.name}" to ${appliedCount} object(s)${suffix}`, 'success');
            this._collapseAnimationPanelAfterApply();
        } else if (!this._conflictPending && skippedCount > 0) {
            Utils.showToast(this._getSpecialAnimationTargetMessage(def), 'warning');
        }
    }

    // Helper: actually push the animation data onto an object
    _applyAnimToObject(obj, effectiveDelay, params, def, generated = null, groupApplyId = null) {
        const configs = generated || this._resolveGeneratedConfigs(def, obj, params);
        if (!configs.length) return false;
        const animData = {
            id: Utils.generateId('anim'),
            type: this.selectedAnimType,
            name: def.name,
            params: { ...params },
            delay: effectiveDelay,
            repeat: params.repeat,
            repeatMode: params.repeatMode || 'restart',
            afterPlayback: params.afterPlayback,
            trigger: params.trigger,
            startMode: params.startMode,
            generated: configs
        };
        if (groupApplyId) animData._groupApplyId = groupApplyId;
        obj.animations.push(animData);
        return true;
    }

    _spawnEditableCopies(sourceObjects, params = {}) {
        const count = Math.max(1, Math.min(100, parseInt(params.spawnCount, 10) || 1));
        const offsetX = Number.isFinite(parseFloat(params.spawnOffsetX)) ? parseFloat(params.spawnOffsetX) : 40;
        const offsetY = Number.isFinite(parseFloat(params.spawnOffsetY)) ? parseFloat(params.spawnOffsetY) : 40;
        const layout = params.spawnLayout || 'offset';
        const scaleStep = Number.isFinite(parseFloat(params.spawnScaleStep)) ? parseFloat(params.spawnScaleStep) : 0;
        const rotationStep = Number.isFinite(parseFloat(params.spawnRotationStep)) ? parseFloat(params.spawnRotationStep) : 0;
        const colorVariation = Math.max(0, Math.min(100, parseFloat(params.spawnColorVariation) || 0));
        const avoidOverlap = !!params.spawnAvoidOverlap;
        const spacing = Math.max(0, parseFloat(params.spawnSpacing) || 0);
        const clearOriginal = !!params.spawnClearOriginal;
        const includeAnimations = !!params.spawnIncludeAnimations;
        const spawnAsGroup = !!params.spawnAsGroup;
        const createdIds = [];
        const createdObjects = [];

        const oldSuppress = this.objects._suppressHistory;
        this.objects._suppressHistory = true;
        try {
            sourceObjects.forEach(source => {
                if (!source || typeof source.toJSON !== 'function') return;
                for (let i = 1; i <= count; i++) {
                    const data = Utils.deepClone(source.toJSON());
                    const scale = Math.max(0.05, 1 + scaleStep * i);
                    const footprint = {
                        width: Math.max(1, (source.width || 1) * scale),
                        height: Math.max(1, (source.height || 1) * scale)
                    };
                    const placement = this._getSpawnPlacement(i, count, layout, offsetX, offsetY, {
                        avoidOverlap,
                        spacing,
                        clearOriginal,
                        footprint
                    });
                    data.id = Utils.generateId('obj');
                    data.name = `${String(source.name || source.type || 'Object').replace(/ \((copy|clone|spawn \d+)\)$/i, '')} (spawn ${i})`;
                    data.x = (data.x || 0) + placement.x;
                    data.y = (data.y || 0) + placement.y;
                    data.width = Math.max(1, (data.width || 1) * scale);
                    data.height = Math.max(1, (data.height || 1) * scale);
                    data.scaleX = (data.scaleX || 1) * scale;
                    data.scaleY = (data.scaleY || 1) * scale;
                    data.rotation = (data.rotation || 0) + rotationStep * i;
                    this._applySpawnColorVariation(data, colorVariation, i);
                    if (Array.isArray(data.pathPoints)) {
                        data.pathPoints = data.pathPoints.map(point => ({
                            ...point,
                            x: (source.x || 0) + (point.x - (source.x || 0)) * scale + placement.x,
                            y: (source.y || 0) + (point.y - (source.y || 0)) * scale + placement.y
                        }));
                    }
                    if (!includeAnimations) data.animations = [];
                    delete data.groupId;
                    delete data.pinnedTo;
                    const clone = StageObject.fromJSON(data);
                    this.objects.addObject(clone);
                    createdIds.push(clone.id);
                    createdObjects.push(clone);
                }
            });
        } finally {
            this.objects._suppressHistory = oldSuppress;
        }

        if (createdIds.length) {
            if (spawnAsGroup && createdIds.length > 1) {
                const groupId = 'group_' + (this.objects._groupCounter++);
                this.objects.groups[groupId] = [...createdIds];
                this.objects.groupNames[groupId] = 'Spawn Group';
                createdObjects.forEach(obj => { obj.groupId = groupId; });
            }
            this.objects.select(createdIds);
            this.objects.updateObjectList();
            this.stage.requestRender();
        }
        return createdIds.length;
    }

    _getSpawnPlacement(index, count, layout, offsetX, offsetY, options = {}) {
        const footprint = options.footprint || { width: 1, height: 1 };
        const spacing = options.avoidOverlap ? (options.spacing || 0) : 0;
        const stepX = options.avoidOverlap ? Math.max(Math.abs(offsetX), footprint.width + spacing) * (offsetX < 0 ? -1 : 1) : offsetX;
        const stepY = options.avoidOverlap ? Math.max(Math.abs(offsetY), footprint.height + spacing) * (offsetY < 0 ? -1 : 1) : offsetY;
        const clearX = options.clearOriginal ? (footprint.width + spacing) * (offsetX < 0 ? -1 : 1) : 0;
        const clearY = options.clearOriginal ? (footprint.height + spacing) * (offsetY < 0 ? -1 : 1) : 0;
        if (layout === 'row') return { x: stepX * index + clearX, y: 0 };
        if (layout === 'column') return { x: 0, y: stepY * index + clearY };
        if (layout === 'grid') {
            const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
            const zero = index - 1;
            return { x: clearX + (zero % cols) * stepX, y: clearY + Math.floor(zero / cols) * stepY };
        }
        if (layout === 'circle') {
            const minCircumference = options.avoidOverlap ? count * (Math.max(footprint.width, footprint.height) + spacing) : 0;
            const minRadius = minCircumference > 0 ? minCircumference / (Math.PI * 2) : 0;
            const radius = Math.max(1, Math.hypot(offsetX, offsetY), minRadius);
            const angle = ((index - 1) / count) * Math.PI * 2;
            const extra = options.clearOriginal ? Math.max(footprint.width, footprint.height) + spacing : 0;
            return { x: Math.cos(angle) * (radius + extra), y: Math.sin(angle) * (radius + extra) };
        }
        if (layout === 'spiral') {
            const baseRadius = Math.max(1, Math.hypot(offsetX, offsetY), options.avoidOverlap ? Math.max(footprint.width, footprint.height) + spacing : 1);
            const radius = baseRadius * index / Math.max(1, count);
            const angle = (index - 1) * 0.75 * Math.PI;
            return { x: Math.cos(angle) * (radius + (options.clearOriginal ? Math.max(footprint.width, footprint.height) + spacing : 0)), y: Math.sin(angle) * (radius + (options.clearOriginal ? Math.max(footprint.width, footprint.height) + spacing : 0)) };
        }
        if (layout === 'scatter') {
            const radius = Math.max(1, Math.hypot(offsetX, offsetY), options.avoidOverlap ? Math.max(footprint.width, footprint.height) + spacing : 1) * Math.max(1, index)
                + (options.clearOriginal ? Math.max(footprint.width, footprint.height) + spacing : 0);
            const angle = this._seededRandom(index * 997) * Math.PI * 2;
            const mag = 0.35 + this._seededRandom(index * 1291) * 0.65;
            return { x: Math.cos(angle) * radius * mag, y: Math.sin(angle) * radius * mag };
        }
        return { x: stepX * index + clearX, y: stepY * index + clearY };
    }

    _applySpawnColorVariation(data, amount, index) {
        if (!amount) return;
        const shiftColor = (hex) => {
            const rgb = this._hexToRgb(hex);
            if (!rgb) return hex;
            const delta = (this._seededRandom(index * 1777) - 0.5) * amount * 2;
            const adjust = (v, extra = 0) => Math.max(0, Math.min(255, Math.round(v + delta + extra)));
            return '#' + ((1 << 24) + (adjust(rgb.r, index * 3) << 16) + (adjust(rgb.g, -index * 2) << 8) + adjust(rgb.b, index)).toString(16).slice(1);
        };
        if (typeof data.fill === 'string' && data.fill.startsWith('#')) data.fill = shiftColor(data.fill);
        if (typeof data.stroke === 'string' && data.stroke.startsWith('#')) data.stroke = shiftColor(data.stroke);
        if (typeof data.textColor === 'string' && data.textColor.startsWith('#')) data.textColor = shiftColor(data.textColor);
    }

    // Show a conflict dialog when a new animation overlaps an existing one
    _showConflictDialog(obj, existingAnim, newDef) {
        // Remove any previous dialog
        document.getElementById('anim-conflict-dialog')?.remove();

        const dialog = document.createElement('div');
        dialog.id = 'anim-conflict-dialog';
        dialog.className = 'anim-conflict-overlay';
        dialog.innerHTML = `
            <div class="anim-conflict-box">
                <h4><i class="fas fa-exclamation-triangle"></i> Animation Overlap</h4>
                <p>This object already has <strong>"${existingAnim.name}"</strong> overlapping this time range.</p>
                <p>Adding <strong>"${newDef.name}"</strong> will run both simultaneously.</p>
                <div class="anim-conflict-actions">
                    <button id="conflict-replace" class="btn-primary btn-sm"><i class="fas fa-exchange-alt"></i> Replace Existing</button>
                    <button id="conflict-keep-both" class="btn-secondary btn-sm"><i class="fas fa-layer-group"></i> Keep Both</button>
                    <button id="conflict-cancel" class="btn-ghost btn-sm"><i class="fas fa-times"></i> Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(dialog);

        const cleanup = () => {
            dialog.remove();
            this._conflictPending = null;
        };

        document.getElementById('conflict-replace').addEventListener('click', () => {
            const pending = this._conflictPending;
            // Remove the overlapping animation
            obj.animations = obj.animations.filter(a => a.id !== existingAnim.id);
            this._applyAnimToObject(pending.obj, pending.effectiveDelay, pending.params, pending.def);
            this.updateAppliedAnimationsList();
            this.updateCodeOutput();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            Utils.showToast(`Replaced "${existingAnim.name}" with "${newDef.name}"`, 'success');
            this._collapseAnimationPanelAfterApply();
            cleanup();
        });

        document.getElementById('conflict-keep-both').addEventListener('click', () => {
            const pending = this._conflictPending;
            this._applyAnimToObject(pending.obj, pending.effectiveDelay, pending.params, pending.def);
            this.updateAppliedAnimationsList();
            this.updateCodeOutput();
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            Utils.showToast(`Added "${newDef.name}" alongside "${existingAnim.name}"`, 'success');
            this._collapseAnimationPanelAfterApply();
            cleanup();
        });

        document.getElementById('conflict-cancel').addEventListener('click', () => {
            Utils.showToast('Animation cancelled', 'info');
            cleanup();
        });
    }

    previewSelectedAnimation(silent) {
        const selectedObjects = this.objects.getSelectedObjects();
        if (selectedObjects.length === 0 || !this.selectedAnimType) {
            if (!silent) Utils.showToast('Select an object and animation', 'warning');
            return;
        }

        // Redirect follow-path to the dedicated Path Animation panel
        if (this.selectedAnimType === 'follow-path') {
            if (!silent) Utils.showToast('Use the "Move Along Shape" panel below to preview path animation', 'info');
            return;
        }

        // Cancel any in-progress card preview first
        this._cancelCardPreview();

        let params = this.getAnimationParams();
        const def = this.library[this.selectedAnimType];
        if (!def) {
            Utils.showToast('Animation type not found', 'warning');
            return;
        }
        params = this._filterAnimationParamsForDefinition(params, this.selectedAnimType, def);
        const targetObjects = this._resolvePresenterAnimationTargets(selectedObjects, def);
        if (targetObjects.length === 0) {
            if (!silent) {
                Utils.showToast(this._getSpecialAnimationTargetMessage(def), 'warning');
            }
            return;
        }

        // Store original state
        const originals = targetObjects.map(obj => ({
            id: obj.id,
            x: obj.x, y: obj.y,
            width: obj.width, height: obj.height,
            rotation: obj.rotation,
            depth: obj.depth,
            tiltX: obj.tiltX,
            tiltY: obj.tiltY,
            scaleX: obj.scaleX, scaleY: obj.scaleY,
            opacity: obj.opacity,
            text: obj.text,
            fill: obj.fill,
            stroke: obj.stroke
            , imageSrc: obj.imageSrc
            , svgAvatar: obj._svgAvatar ? JSON.parse(JSON.stringify(obj._svgAvatar)) : null
            , svgAfricanFaceState: obj._svgAfricanFaceState ? JSON.parse(JSON.stringify(obj._svgAfricanFaceState)) : null
            , svgAfricanAdjustments: obj._svgAfricanAdjustments ? JSON.parse(JSON.stringify(obj._svgAfricanAdjustments)) : null
            , svgAfricanCharacterConfig: obj._svgCharacterConfig ? JSON.parse(JSON.stringify(obj._svgCharacterConfig)) : null
        }));

        // Run preview animation
        const delay = (params.delay || 0) * 1000;
        let previewedCount = 0;
        // Track the start setTimeout so we can cancel it if Apply/Play happens
        // before it fires — otherwise it would call runPropertyAnimation, which
        // synchronously writes the 'from' value (e.g. opacity=0) and leaves the
        // object stuck at that value because the rAF loop bails on its first
        // tick due to the bumped preview generation.
        const previewGen = (this._previewGeneration = (this._previewGeneration || 0) + 1);
        this._cardPreviewStartTimer = setTimeout(() => {
            this._cardPreviewStartTimer = null;
            // If a newer preview/play has started while we were waiting, abort.
            if (this._previewGeneration !== previewGen) return;
            targetObjects.forEach(obj => {
                const configs = this._resolveGeneratedConfigs(def, obj, params);
                if (!configs.length) return;
                previewedCount++;
                configs.forEach(cfg => {
                    if (cfg.type === 'typewriter') {
                        this.runTypewriter(obj, cfg);
                    } else if (cfg.type === 'matrix-scramble') {
                        this.runMatrixScramble(obj, cfg);
                    } else if (cfg.type === 'counter-text') {
                        this.runCounterText(obj, cfg);
                    } else if (cfg.type === 'topple') {
                        this.runToppleAnimation(obj, cfg);
                    } else if (cfg.type === 'topple-line') {
                        this.runToppleLineAnimation(obj, cfg);
                    } else if (cfg.type === 'orbit') {
                        this.runOrbitAnimation(obj, cfg);
                    } else if (cfg.type === 'parametric-path') {
                        this.runParametricPathAnimation(obj, cfg);
                    } else if (cfg.type === 'walk-cycle') {
                        this._runWalkCyclePreview(obj, cfg, originals);
                    } else if (cfg.type === 'part-keyframe') {
                        this._runPartKeyframePreview(obj, cfg);
                    } else if (cfg.property) {
                        this.runPropertyAnimation(obj, cfg);
                    }
                });
            });
            if (previewedCount === 0 && !silent) {
                Utils.showToast(this._getSpecialAnimationTargetMessage(def), 'warning');
            }
        }, delay);

        // Restore after animation
        const previewSpeed = this._supportsAnimationSpeed(this.selectedAnimType, def) ? this._getAnimationSpeedFactor(params) : 1;
        const totalDuration = ((params.duration / previewSpeed) + params.delay) * 1000 + 100;
        this._cardPreviewOriginals = originals;
        this._cardPreviewRestoreTimer = setTimeout(() => {
            this._restoreCardPreview();
        }, totalDuration);
    }

    _cancelCardPreview() {
        if (this._cardPreviewStartTimer) {
            clearTimeout(this._cardPreviewStartTimer);
            this._cardPreviewStartTimer = null;
        }
        if (this._cardPreviewRestoreTimer) {
            clearTimeout(this._cardPreviewRestoreTimer);
            this._restoreCardPreview();
        } else if (this._cardPreviewOriginals) {
            // No restore timer (rare race) but we still have snapshot — use it.
            this._restoreCardPreview();
        }
    }

    _restoreCardPreview() {
        if (this._cardPreviewOriginals) {
            this._cardPreviewOriginals.forEach(orig => {
                const obj = this.objects.getObjectById(orig.id);
                if (obj) {
                    Object.assign(obj, orig);
                    if (orig.svgAvatar) {
                        obj._svgAvatar = JSON.parse(JSON.stringify(orig.svgAvatar));
                        obj.imageSrc = orig.imageSrc;
                        if (obj.imageSrc) obj.loadImage?.(obj.imageSrc);
                    }
                    if (orig.svgAfricanFaceState || orig.svgAfricanAdjustments || orig.svgAfricanCharacterConfig) {
                        obj._svgAfricanFaceState = orig.svgAfricanFaceState
                            ? JSON.parse(JSON.stringify(orig.svgAfricanFaceState))
                            : obj._svgAfricanFaceState;
                        obj._svgAfricanAdjustments = orig.svgAfricanAdjustments
                            ? JSON.parse(JSON.stringify(orig.svgAfricanAdjustments))
                            : obj._svgAfricanAdjustments;
                        obj._svgCharacterConfig = orig.svgAfricanCharacterConfig
                            ? JSON.parse(JSON.stringify(orig.svgAfricanCharacterConfig))
                            : obj._svgCharacterConfig;
                        obj.imageSrc = orig.imageSrc;
                        if (obj.imageSrc) obj.loadImage?.(obj.imageSrc);
                    }
                    delete obj.svgAvatar;
                }
            });
            this.stage.requestRender();
        }
        this._cardPreviewOriginals = null;
        this._cardPreviewRestoreTimer = null;
    }

    // Run a single animation
    runAnimation(obj, config, params = {}) {
        const delay = (params.delay || 0) * 1000;
        
        const configs = Array.isArray(config) ? config : [config];
        
        setTimeout(() => {
            configs.forEach(cfg => {
                if (cfg.type === 'typewriter') {
                    this.runTypewriter(obj, cfg);
                } else if (cfg.type === 'matrix-scramble') {
                    this.runMatrixScramble(obj, cfg);
                } else if (cfg.type === 'counter-text') {
                    this.runCounterText(obj, cfg);
                } else if (cfg.type === 'topple') {
                    this.runToppleAnimation(obj, cfg);
                } else if (cfg.type === 'topple-line') {
                    this.runToppleLineAnimation(obj, cfg);
                } else if (cfg.type === 'orbit') {
                    this.runOrbitAnimation(obj, cfg);
                } else if (cfg.type === 'parametric-path') {
                    this.runParametricPathAnimation(obj, cfg);
                } else if (cfg.type === 'walk-cycle') {
                    this._runWalkCyclePreview(obj, cfg);
                } else if (cfg.type === 'part-keyframe') {
                    this._runPartKeyframePreview(obj, cfg);
                } else if (cfg.property) {
                    this.runPropertyAnimation(obj, cfg);
                }
            });
        }, delay);
    }

    _runWalkCyclePreview(obj, config) {
        if (!config.frames || obj.type !== 'icon') return;
        const frames = config.frames;
        const fps = config.fps || 6;
        const duration = config.duration || 2000;
        const moveX = config.moveX || 0;
        const origX = obj.x;
        const origY = obj.y;
        const origPath = obj.iconPath;
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            if (elapsed >= duration) {
                obj.iconPath = origPath;
                obj.x = origX;
                obj.y = origY;
                this.stage.requestRender();
                return;
            }
            const progress = elapsed / duration;
            const frameIdx = Math.floor(elapsed / (1000 / fps)) % frames.length;
            obj.iconPath = frames[frameIdx];
            if (moveX) obj.x = origX + moveX * progress;
            // Subtle bob
            const bobFactor = config.bobFactor || 0.02;
            const bobPhase = (elapsed % (2000 / fps)) / (2000 / fps);
            obj.y = origY + Math.sin(bobPhase * Math.PI * 2) * (obj.height * bobFactor);
            this.stage.requestRender();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    _runPartKeyframePreview(obj, config) {
        if (!config.keyframes) return;
        const dur = config.duration || 1000;
        const kfs = config.keyframes;
        const rm = config.rootMotion;
        const orig = { x: obj.x, y: obj.y, rotation: obj.rotation, scaleX: obj.scaleX, scaleY: obj.scaleY };
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            if (elapsed >= dur) {
                Object.assign(obj, orig);
                this.stage.requestRender();
                return;
            }
            const t = (elapsed % dur) / dur;
            // Root motion: cumulative forward + cyclic bounce
            let rootX = 0, rootY = 0;
            if (rm && rm.enabled) {
                rootX = (rm.speed || 0) * (elapsed / 1000);
                rootY = -(rm.bounce || 0) * Math.abs(Math.sin(t * Math.PI * 2));
                if (rm.sway) rootX += rm.sway * Math.sin(t * Math.PI * 2);
            }
            if (rootX !== 0 || rootY !== 0) {
                obj.x = orig.x + rootX;
                obj.y = orig.y + rootY;
            }
            for (const kp in kfs) {
                const kfArr = kfs[kp];
                if (!kfArr || kfArr.length === 0) continue;
                let val;
                if (kfArr.length === 1) { val = kfArr[0].v; }
                else if (t <= kfArr[0].t) { val = kfArr[0].v; }
                else if (t >= kfArr[kfArr.length - 1].t) { val = kfArr[kfArr.length - 1].v; }
                else {
                    val = kfArr[kfArr.length - 1].v;
                    for (let ki = 0; ki < kfArr.length - 1; ki++) {
                        const ka = kfArr[ki], kb = kfArr[ki + 1];
                        if (t >= ka.t && t <= kb.t) {
                            let st = (t - ka.t) / (kb.t - ka.t);
                            st = st < 0.5 ? 2 * st * st : -1 + (4 - 2 * st) * st;
                            val = ka.v + (kb.v - ka.v) * st;
                            break;
                        }
                    }
                }
                if (kp === '_oX') obj.x = orig.x + val + rootX;
                else if (kp === '_oY') obj.y = orig.y + val + rootY;
                else if (kp === 'rotation') obj.rotation = (orig.rotation || 0) + val;
                else if (kp === 'scaleX') obj.scaleX = val;
                else if (kp === 'scaleY') obj.scaleY = val;
            }
            this.stage.requestRender();
            requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    runToppleLineAnimation(obj, config) {
        const { duration = 3200, easing = 'easeIn', steps, width, height } = config;
        const numSteps = steps.length;
        const stepDur = duration / numSteps;
        const easingFn = Utils.getEasing(easing);
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const stepIdx = Math.min(Math.floor(elapsed / stepDur), numSteps - 1);
            const stepElapsed = elapsed - stepIdx * stepDur;
            const rawProg = Math.min(stepElapsed / stepDur, 1);
            const prog = easingFn(rawProg);
            const step = steps[stepIdx];
            const ar = (step.angle * prog) * Math.PI / 180;
            const cx = step.startX + width / 2, cy = step.startY + height / 2;
            const dx = cx - step.pivotX, dy = cy - step.pivotY;
            obj.x = step.pivotX + dx * Math.cos(ar) - dy * Math.sin(ar) - width / 2;
            obj.y = step.pivotY + dx * Math.sin(ar) + dy * Math.cos(ar) - height / 2;
            obj.rotation = step.startRotation + step.angle * prog;
            this.stage.requestRender();
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    runToppleAnimation(obj, config) {
        const { duration = 1000, easing = 'easeIn', angle, pivotX, pivotY, startX, startY, startRotation, width, height } = config;
        const easingFn = Utils.getEasing(easing);
        const startTime = performance.now();
        const cx = startX + width / 2, cy = startY + height / 2;
        const dx = cx - pivotX, dy = cy - pivotY;

        const animate = (now) => {
            const elapsed = now - startTime;
            const rawProg = Math.min(elapsed / duration, 1);
            const prog = easingFn(rawProg);
            const ar = (angle * prog) * Math.PI / 180;
            obj.x = pivotX + dx * Math.cos(ar) - dy * Math.sin(ar) - width / 2;
            obj.y = pivotY + dx * Math.sin(ar) + dy * Math.cos(ar) - height / 2;
            obj.rotation = startRotation + angle * prog;
            this.stage.requestRender();
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    runOrbitAnimation(obj, config) {
        const { centerX, centerY, radius = 100, duration = 3000, easing = 'linear' } = config;
        const easingFn = Utils.getEasing(easing);
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const rawProg = Math.min(elapsed / duration, 1);
            const prog = easingFn(rawProg);
            const orbitPos = this._getOrbitPosition(obj, config, prog);
            obj.x = orbitPos.x;
            obj.y = orbitPos.y;
            this.stage.requestRender();
            if (elapsed < duration) {
                requestAnimationFrame(animate);
            }
        };
        requestAnimationFrame(animate);
    }

    runParametricPathAnimation(obj, config) {
        const { pathType = 'figure-eight', radius = 100, turns = 1, duration = 3000, easing = 'linear', cx, cy, seed = 1 } = config;
        const easingFn = Utils.getEasing(easing);
        const startTime = performance.now();
        const generation = this._previewGeneration || 0;
        const baseX = Number.isFinite(cx) ? cx : obj.x;
        const baseY = Number.isFinite(cy) ? cy : obj.y;

        // Precompute brownian waypoints for smooth path (every 0.05s).
        let bwp = null;
        if (pathType === 'brownian') {
            const steps = 24;
            bwp = [];
            let bx = 0, by = 0;
            for (let i = 0; i <= steps; i++) {
                bwp.push({ x: bx, y: by });
                const ang = this._seededRandom(seed + i * 137) * Math.PI * 2;
                const dist = this._seededRandom(seed + i * 211) * radius * 0.4;
                bx += Math.cos(ang) * dist;
                by += Math.sin(ang) * dist;
                // gentle pull back to center
                bx *= 0.9; by *= 0.9;
            }
        }

        const sample = (t) => {
            // t in 0..1
            switch (pathType) {
                case 'figure-eight': {
                    const a = t * Math.PI * 2 * turns;
                    // Lemniscate of Bernoulli
                    const s = Math.sin(a), c = Math.cos(a);
                    const denom = 1 + s * s;
                    return { x: radius * c / denom, y: radius * s * c / denom };
                }
                case 'spiral': {
                    const a = t * Math.PI * 2 * turns;
                    const r = radius * t;
                    return { x: r * Math.cos(a), y: r * Math.sin(a) };
                }
                case 'heart': {
                    const a = t * Math.PI * 2 * turns;
                    const s = 16;
                    const hx = s * Math.pow(Math.sin(a), 3);
                    const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
                    return { x: hx * (radius / s), y: hy * (radius / s) * 0.85 };
                }
                case 'brownian': {
                    const seg = t * (bwp.length - 1);
                    const i = Math.floor(seg);
                    const f = seg - i;
                    const a = bwp[i] || { x: 0, y: 0 };
                    const b = bwp[Math.min(bwp.length - 1, i + 1)] || a;
                    return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
                }
                default: return { x: 0, y: 0 };
            }
        };

        const animate = (now) => {
            if ((this._previewGeneration || 0) !== generation) return;
            const elapsed = now - startTime;
            const rawT = Math.min(elapsed / duration, 1);
            const t = easingFn(rawT);
            const pos = sample(t);
            obj.x = baseX + pos.x;
            obj.y = baseY + pos.y;
            this.stage.requestRender();
            if (elapsed < duration) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
    }

    _getOrbitPosition(obj, config, progress) {
        const turns = Number.isFinite(parseFloat(config.turns)) ? parseFloat(config.turns) : 1;
        const angle = progress * Math.PI * 2 * turns;
        const radius = config.radius || 100;
        const baseObj = obj._original || obj;
        const hasLegacyAnchor = Number.isFinite(config.centerX) || Number.isFinite(config.centerY);

        if (hasLegacyAnchor) {
            const anchorX = Number.isFinite(config.centerX) ? config.centerX : baseObj.x;
            const anchorY = Number.isFinite(config.centerY) ? config.centerY : baseObj.y;
            return {
                x: anchorX + Math.cos(angle) * radius,
                y: anchorY + Math.sin(angle) * radius
            };
        }

        const orbitCX = Number.isFinite(config.cx) ? config.cx : (baseObj.x + baseObj.width / 2);
        const orbitCY = Number.isFinite(config.cy) ? config.cy : (baseObj.y + baseObj.height / 2);
        return {
            x: orbitCX + Math.cos(angle) * radius - (baseObj.width / 2),
            y: orbitCY + Math.sin(angle) * radius - (baseObj.height / 2)
        };
    }

    runPropertyAnimation(obj, config) {
        const {
            property, from, to, duration, easing = 'easeInOut', pingpong = false, keyframes
        } = config;
        
        const easingFn = Utils.getEasing(easing);
        const startTime = performance.now();
        // Snapshot the current preview generation so this rAF loop can bail out
        // if the user clicks Apply or Play (which bumps the generation).
        const generation = this._previewGeneration || 0;
        this._setAnimatedPropertyValue(obj, property, from);

        const animate = (now) => {
            // Cancel mid-flight if a newer preview/play has started.
            if ((this._previewGeneration || 0) !== generation) return;
            let elapsed = now - startTime;
            let progress = Math.min(elapsed / duration, 1);
            
            if (pingpong) {
                progress = progress < 0.5 
                    ? easingFn(progress * 2) 
                    : easingFn(2 - progress * 2);
            } else {
                progress = easingFn(progress);
            }

            // Use keyframe interpolation if available
            if (config.type === 'discrete') {
                this._setAnimatedPropertyValue(obj, property, progress >= 1 ? to : from);
            } else if (keyframes && keyframes.length >= 2) {
                const keyframeValue = typeof KeyframeEditor !== 'undefined'
                    ? KeyframeEditor.interpolateKeyframes(keyframes, progress)
                    : this._interpolateCodeValueKeyframes(keyframes, progress);
                this._setAnimatedPropertyValue(obj, property, keyframeValue);
            } else {
                this._setAnimatedPropertyValue(obj, property, Utils.lerp(from, to, progress));
            }

            this.stage.requestRender();

            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                this._setAnimatedPropertyValue(obj, property, pingpong ? from : to);
                // Clean up clip properties when animation completes (reveal fully done)
                if (property.startsWith('_clip') && obj[property] >= 1) {
                    delete obj[property];
                }
                this.stage.requestRender();
            }
        };
        
        requestAnimationFrame(animate);
    }

    /**
     * Cancel any in-flight card-preview animations and restore the affected
     * objects to the state they were in BEFORE the preview started. This makes
     * the stage authoritative for the authored base state again — essential
     * before applying a new animation or starting playback, otherwise mid-frame
     * preview values leak into the recorded animation or the captured
     * originalStates and cause objects to look slightly faded after play.
     */
    _cancelAllPreviews() {
        // Bump the generation token so any outstanding rAF loops bail out on
        // their next tick AND any pending preview start setTimeout aborts.
        this._previewGeneration = (this._previewGeneration || 0) + 1;
        // Restore from the most recent card-preview snapshot if one is active,
        // and clear the pending start timer.
        if (this._cardPreviewStartTimer || this._cardPreviewRestoreTimer || this._cardPreviewOriginals) {
            this._cancelCardPreview();
        }
    }

    // Interpolate between two hex colors
    runColorAnimation(obj, config) {
        const { property, from, to, duration, easing = 'easeInOut' } = config;
        const easingFn = Utils.getEasing(easing);
        const startTime = performance.now();

        const fromRgb = this._hexToRgb(from) || { r: 0, g: 0, b: 0 };
        const toRgb = this._hexToRgb(to) || { r: 255, g: 255, b: 255 };

        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = easingFn(Math.min(elapsed / duration, 1));

            const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * progress);
            const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * progress);
            const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * progress);
            obj[property] = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);

            this.stage.requestRender();

            if (elapsed < duration) {
                requestAnimationFrame(animate);
            } else {
                obj[property] = to;
                this.stage.requestRender();
            }
        };

        requestAnimationFrame(animate);
    }

    runTypewriter(obj, config) {
        const fullText = config.text;
        const totalDuration = config.duration;
        const startTime = performance.now();
        
        const animate = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / totalDuration, 1);
            const chars = Math.floor(progress * fullText.length);
            obj.text = fullText.substring(0, chars);
            this.stage.requestRender();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                obj.text = fullText;
            }
        };
        
        requestAnimationFrame(animate);
    }

    runMatrixScramble(obj, config) {
        const fullText = String(config.text ?? obj.text ?? '');
        const totalDuration = config.duration || 1600;
        const seed = config.seed || 1;
        const easingFn = Utils.getEasing(config.easing || 'easeOut');
        const charset = '!<>-_\\/[]{}—=+*^?#ABCDEF0123456789';
        const startTime = performance.now();

        const animate = (now) => {
            const elapsed = now - startTime;
            const rawT = Math.min(elapsed / totalDuration, 1);
            const t = easingFn(rawT);
            const lockCount = Math.floor(t * fullText.length);
            let out = '';
            for (let i = 0; i < fullText.length; i++) {
                const ch = fullText[i];
                if (i < lockCount || /\s/.test(ch)) {
                    out += ch;
                } else {
                    const r = this._seededRandom(seed + i * 31 + Math.floor(elapsed / 50));
                    out += charset[Math.floor(r * charset.length)];
                }
            }
            obj.text = out;
            this.stage.requestRender();
            if (rawT < 1) {
                requestAnimationFrame(animate);
            } else {
                obj.text = fullText;
                this.stage.requestRender();
            }
        };
        requestAnimationFrame(animate);
    }

    runCounterText(obj, config) {
        const from = Number.isFinite(config.from) ? config.from : 0;
        const to = Number.isFinite(config.to) ? config.to : 100;
        const decimals = Math.max(0, Math.min(4, config.decimals ?? 0));
        const prefix = config.prefix || '';
        const suffix = config.suffix || '';
        const totalDuration = config.duration || 2000;
        const easingFn = Utils.getEasing(config.easing || 'easeOut');
        const startTime = performance.now();
        const format = (v) => `${prefix}${v.toFixed(decimals)}${suffix}`;

        const animate = (now) => {
            const elapsed = now - startTime;
            const rawT = Math.min(elapsed / totalDuration, 1);
            const t = easingFn(rawT);
            const value = from + (to - from) * t;
            obj.text = format(value);
            this.stage.requestRender();
            if (rawT < 1) {
                requestAnimationFrame(animate);
            } else {
                obj.text = format(to);
                this.stage.requestRender();
            }
        };
        requestAnimationFrame(animate);
    }

    // Play all animations (for preview/export)
    playAll(interactive = false, range = null) {
        if (globalThis.app?.animations === this) {
            if (globalThis.app.jointSystem?._armatureRecordingBusy) return;
            globalThis.app.jointSystem?._stopArmatureClipPreview?.();
        }
        if (range && (!Number.isFinite(range.start) || !Number.isFinite(range.end) || range.start < 0 || range.end <= range.start)) return;
        if (this.isPlaying) {
            this.pause();
            if (!range) return;
        }
        this._playbackRange = range;

        // Cancel any in-flight card-preview rAF loops and restore objects to
        // their pre-preview state BEFORE we snapshot originalStates. Otherwise
        // a half-finished fade-in preview leaks its mid-frame opacity into the
        // captured base state, and finishPlayback later restores objects to
        // that faded value, which the user perceives as "objects look slightly
        // transparent after the animation completes".
        this._cancelAllPreviews();

        this._preserveFinalPose = false;
        this.isPlaying = true;
        this._interactivePreview = interactive;

        // Resume from pause: offset startTime to account for already-elapsed time
        if (!range && this.isPaused && this.currentTime > 0) {
            this.isPaused = false;
            this.startTime = performance.now() - (this.currentTime / this.playbackSpeed);
            // originalStates should still be intact from before pause
        } else {
            this.isPaused = false;
            // Reset trigger tracking
            this._triggeredAnims = {};
            this._hoveredObjId = null;

            if (this.originalStates) {
                for (const [id, state] of this.originalStates) {
                    const obj = this.objects.getObjectById(id);
                    if (obj) this._restoreFullState(obj, state);
                }
            }

            // Store original states as Map keyed by object ID (robust against reordering)
            this.originalStates = new Map();
            this.objects.objects.forEach(obj => {
                this.originalStates.set(obj.id, Utils.cloneProjectState(obj.toJSON()));
            });

            // Regenerate animation data so position-based animations use current object positions
            this.objects.objects.forEach(obj => {
                if (obj.animations && this.library) {
                    obj.animations.forEach(anim => {
                        if (anim.type && anim.params) {
                            const def = this.library[anim.type];
                            if (def && typeof def.generate === 'function') {
                                anim.generated = this._resolveGeneratedConfigs(def, obj, anim.params, anim.type);
                            }
                        }
                    });
                }
            });

            // Calculate total duration
            this.calculateTotalDuration();

            this.currentTime = range?.start ?? 0;
            this.startTime = performance.now() - this.currentTime / this.playbackSpeed;
            this.applyAnimationsAtTime(this.currentTime, { timelinePreview: true });
        }

        // If interactive preview, show the overlay hint and bind listeners
        if (interactive) {
            this._showInteractiveOverlay();
        }

        // Increment play generation so any stale RAF loop from a previous run
        // knows to self-terminate (see playLoop generation guard).
        this._playGeneration = (this._playGeneration || 0) + 1;
        const _thisGeneration = this._playGeneration;
        this.playLoop(_thisGeneration);
        if (!this.isPlaying) return;
        eventBus.emit('playback:started');
        document.getElementById('tl-play').innerHTML = '<i class="fas fa-pause"></i>';
    }

    /**
     * Restore a full set of properties from a saved state onto an object.
     * Used by stop(), loop reset, and _restoreAfterExport.
     */
    _restoreFullState(obj, state) {
        obj._crossViewBlend = null;
        if (obj.realistic3D && globalThis.Realistic3DLibrary) {
            for (const key of Realistic3DLibrary.channels) obj[key]=Number.isFinite(state[key]) ? state[key] : 0;
        }
        if (state.armatureAttachmentPin !== undefined) obj._armatureAttachmentPin = state.armatureAttachmentPin === true;
        if (state.armatureViewState) globalThis.ArmatureViewState?.apply(obj, state.armatureViewState, true);
        obj.x = state.x; obj.y = state.y;
        obj.width = state.width; obj.height = state.height;
        obj.activityRootId = state.activityRootId || null;
        if (state.sceneAsset?.activityKit || obj.sceneAsset?.activityKit) obj.sceneAsset = state.sceneAsset ? Utils.deepClone(state.sceneAsset) : undefined;
        if (obj.sceneAsset) obj._armatureDrawLayer = state.armatureDrawLayer ?? state._armatureDrawLayer;
        obj.pivotX = state.pivotX ?? .5; obj.pivotY = state.pivotY ?? .5;
        if (Number(state.svgAfricanPremiumBaseScale) > 0) obj._svgAfricanPremiumBaseScale = Number(state.svgAfricanPremiumBaseScale);
        obj.rotation = state.rotation;
        obj.scaleX = state.scaleX; obj.scaleY = state.scaleY;
        obj.depth = state.depth ?? 0;
        obj.tiltX = state.tiltX ?? 0;
        obj.tiltY = state.tiltY ?? 0;
        obj.jointBaseAngle = state.jointBaseAngle ?? 0;
        obj.armatureSeatDepth = state.armatureSeatDepth ?? 0;
        obj.armatureKneelDepth = state.armatureKneelDepth ?? 0;
        obj.armatureReachDepth = state.armatureReachDepth ?? 0;
        obj.limbLengthMode = state.limbLengthMode || 'natural';
        obj.limbLengthCompensation = state.limbLengthCompensation ?? .5;
        obj.limbReachStretch = state.limbReachStretch ?? 0;
        obj.armatureSeatLean = state.armatureSeatLean ?? 0;
        if (state.flexPins) obj.flexPins = Utils.deepClone(state.flexPins);
        obj.opacity = state.opacity;
        obj.fill = state.fill;
        if (state.stroke !== undefined) obj.stroke = state.stroke;
        if (state.strokeWidth !== undefined) obj.strokeWidth = state.strokeWidth;
        if (state.iconPath !== undefined) obj.iconPath = state.iconPath;
        if (state.iconViewBox !== undefined) obj.iconViewBox = state.iconViewBox;
        if (state.text !== undefined) obj.text = state.text;
        if (state.type !== undefined) obj.type = state.type;
        if (state.sides !== undefined) obj.sides = state.sides;
        if (state.innerRadius !== undefined) obj.innerRadius = state.innerRadius;
        if (state.borderRadius !== undefined) obj.borderRadius = state.borderRadius;
        if (state.visible !== undefined) obj.visible = state.visible;
        if (state.flipH !== undefined) obj.flipH = state.flipH;
        if (state.flipV !== undefined) obj.flipV = state.flipV;
        if (state.fontFamily !== undefined) obj.fontFamily = state.fontFamily;
        if (state.fontSize !== undefined) obj.fontSize = state.fontSize;
        if (state.fillType !== undefined) obj.fillType = state.fillType;
        if (state.gradientStops) obj.gradientStops = JSON.parse(JSON.stringify(state.gradientStops));
        if (state.gradientAngle !== undefined) obj.gradientAngle = state.gradientAngle;
        if (state.patternType !== undefined) obj.patternType = state.patternType;
        if (state.patternColor !== undefined) obj.patternColor = state.patternColor;
        if (state.patternScale !== undefined) obj.patternScale = state.patternScale;
        if (state.imageSrc !== undefined && state.imageSrc !== obj.imageSrc) {
            obj.imageSrc = state.imageSrc;
            if (obj.imageSrc) obj.loadImage?.(obj.imageSrc);
        }
        const restoredSvgArmatureView = state.svgCharacterViewProfileKey || state._svgCharacterViewProfileKey;
        if (restoredSvgArmatureView) {
            this._queueSvgArmatureTimelineViewSync(obj, restoredSvgArmatureView);
        }
        const restoredSvgAvatar = state.svgAvatar ?? state._svgAvatar;
        if (restoredSvgAvatar !== undefined) {
            obj._svgAvatar = restoredSvgAvatar ? JSON.parse(JSON.stringify(restoredSvgAvatar)) : null;
            if (obj._svgAvatar && typeof this.objects?._renderSvgAvatarStateToImage === 'function') {
                this.objects._renderSvgAvatarStateToImage(obj);
            }
        }
        const hasSvgAfricanFaceState = Object.prototype.hasOwnProperty.call(state, 'svgAfricanFaceState')
            || Object.prototype.hasOwnProperty.call(state, '_svgAfricanFaceState');
        if (hasSvgAfricanFaceState) {
            const restoredFaceState = state.svgAfricanFaceState ?? state._svgAfricanFaceState;
            const nextFaceState = restoredFaceState
                ? JSON.parse(JSON.stringify(restoredFaceState))
                : null;
            const faceStateChanged = JSON.stringify(obj._svgAfricanFaceState || null)
                !== JSON.stringify(nextFaceState);
            obj._svgAfricanFaceState = nextFaceState;
            const partKey = obj._svgCharacterPremiumPartKey
                || obj._svgCharacterPartKey
                || obj.bodyPartData?.partKey
                || '';
            if (faceStateChanged && partKey === 'head-neck') {
                this._queueSvgAfricanFaceStateRender?.(obj);
            }
        }
        if (state.faceRig !== undefined) obj.faceRig = state.faceRig ? JSON.parse(JSON.stringify(state.faceRig)) : null;
        if (state.faceRigExpression !== undefined) obj.faceRigExpression = state.faceRigExpression || 'neutral';
        if (state.faceRigStrength !== undefined) obj.faceRigStrength = Number(state.faceRigStrength) || 0;
        if (state.faceRigLookX !== undefined) obj.faceRigLookX = Number(state.faceRigLookX) || 0;
        if (state.faceRigLookY !== undefined) obj.faceRigLookY = Number(state.faceRigLookY) || 0;
        if (state.faceRigMouthOpen !== undefined) obj.faceRigMouthOpen = Number(state.faceRigMouthOpen) || 0;
        if (state.textureImageSrc !== undefined && state.textureImageSrc !== obj.textureImageSrc) {
            obj.textureImageSrc = state.textureImageSrc;
            if (obj.textureImageSrc) obj.loadTextureImage?.(obj.textureImageSrc);
        }
        if (state.facialExpression !== undefined) obj._facialExpression = state.facialExpression;
        if (state.facialFeatures !== undefined) {
            obj._facialFeatures = state.facialFeatures ? JSON.parse(JSON.stringify(state.facialFeatures)) : null;
        }
        if (state.facialProportions !== undefined) {
            obj._facialProportions = state.facialProportions ? JSON.parse(JSON.stringify(state.facialProportions)) : null;
            if (!obj._facialProportions) {
                delete obj._facialDrawCtx;
            }
        }
        if (state.facialDrawContext !== undefined) {
            if (state.facialDrawContext && typeof state.facialDrawContext === 'object') {
                obj._facialDrawCtx = JSON.parse(JSON.stringify(state.facialDrawContext));
            } else {
                delete obj._facialDrawCtx;
            }
        } else if (obj._facialDrawCtx && typeof obj._facialDrawCtx.view !== 'string') {
            // Legacy snapshots stored a blank CanvasRenderingContext2D here. It has
            // no character style or view data, so let the Universal rig repair it.
            delete obj._facialDrawCtx;
        }
        if (state.facialLocalRect !== undefined) {
            obj._facialLocalRect = state.facialLocalRect ? JSON.parse(JSON.stringify(state.facialLocalRect)) : null;
        }
        if (state.facialUseAnchorPin !== undefined) obj._facialUseAnchorPin = state.facialUseAnchorPin === true;
        if (state.facialFeatureKey !== undefined) obj._facialFeatureKey = state.facialFeatureKey;
        if (state.facialParentHead !== undefined) obj._facialParentHead = state.facialParentHead;
        if (state.facialBasePinOffsetX !== undefined) obj._facialBasePinOffsetX = state.facialBasePinOffsetX;
        if (state.facialBasePinOffsetY !== undefined) obj._facialBasePinOffsetY = state.facialBasePinOffsetY;
        if (state.facialBaseRotation !== undefined) obj._facialBaseRotation = state.facialBaseRotation;
        // Clean up temp color interpolation properties
        delete obj._colorR; delete obj._colorG; delete obj._colorB;
        // Clean up clip animation properties
        delete obj._clipWipeRight; delete obj._clipWipeLeft;
        delete obj._clipWipeUp; delete obj._clipWipeDown;
        delete obj._clipStripsH; delete obj._clipStripsV;
        delete obj._clipWheel; delete obj._clipWedge;
        // Clean up part-keyframe originals
        delete obj._pkfOriginals;
        // Restore pathPoints
        if (state.pathPoints && state.pathPoints.length > 0) {
            obj.pathPoints = JSON.parse(JSON.stringify(state.pathPoints));
        }
        // Restore rigging pin positions
        if (state.rigging) {
            // Preserve mesh cache across restores for performance
            const prevCache = obj.rigging?._meshCache;
            obj.rigging = JSON.parse(JSON.stringify(state.rigging));
            if (prevCache && prevCache._density === obj.rigging.meshDensity) {
                obj.rigging._meshCache = prevCache;
            }
        }
        // Restore pin properties
        if (state.pinnedTo !== undefined) obj.pinnedTo = state.pinnedTo;
        if (state.pinOffsetX !== undefined) obj.pinOffsetX = state.pinOffsetX;
        if (state.pinOffsetY !== undefined) obj.pinOffsetY = state.pinOffsetY;
        if (state.pinAnchorX !== undefined) obj.pinAnchorX = state.pinAnchorX;
        if (state.pinAnchorY !== undefined) obj.pinAnchorY = state.pinAnchorY;
        if (state.pinTargetType !== undefined) obj.pinTargetType = state.pinTargetType;
        if (state.pinJointId !== undefined) obj.pinJointId = state.pinJointId;
        if (state.pinJointName !== undefined) obj.pinJointName = state.pinJointName;
        if (state.pinRotationMode !== undefined) obj.pinRotationMode = state.pinRotationMode;
        if (state.pinInheritRotation !== undefined) obj.pinInheritRotation = state.pinInheritRotation;
        if (state.pinBaseTiltX !== undefined) obj.pinBaseTiltX = state.pinBaseTiltX;
        if (state.pinBaseTiltY !== undefined) obj.pinBaseTiltY = state.pinBaseTiltY;
        if (state.pinContour !== undefined) obj.pinContour = state.pinContour;
        if (state.pinContourColor !== undefined) obj.pinContourColor = state.pinContourColor;
        if (state.pinSyncJoints !== undefined) obj.pinSyncJoints = state.pinSyncJoints;
        if (state._pinInheritParentJointName !== undefined) obj._pinInheritParentJointName = state._pinInheritParentJointName;
        // Restore joint angles
        if (state.joints) {
            obj.joints = JSON.parse(JSON.stringify(state.joints));
        }
        if (state.jointDirection !== undefined) obj.jointDirection = state.jointDirection;
        if (state.jointContours !== undefined) obj.jointContours = state.jointContours;
        if (state.contourSize !== undefined) obj.contourSize = state.contourSize;
        if (state.contourColor !== undefined) obj.contourColor = state.contourColor;
        if (state.contourFillMode !== undefined) obj.contourFillMode = state.contourFillMode;
        if (state.contourPatternType !== undefined) obj.contourPatternType = state.contourPatternType;
        if (state.contourPatternColor !== undefined) obj.contourPatternColor = state.contourPatternColor;
        if (state.contourPatternScale !== undefined) obj.contourPatternScale = state.contourPatternScale;
        if (state.contourGradientStart !== undefined) obj.contourGradientStart = state.contourGradientStart;
        if (state.contourGradientEnd !== undefined) obj.contourGradientEnd = state.contourGradientEnd;
        if (state.contourGradientAngle !== undefined) obj.contourGradientAngle = state.contourGradientAngle;
        if (state.contourRotation !== undefined) obj.contourRotation = state.contourRotation;
        if (state.bodyPartData !== undefined) {
            obj.bodyPartData = state.bodyPartData ? JSON.parse(JSON.stringify(state.bodyPartData)) : null;
        }
        if (state._armatureRoleKey !== undefined) obj._armatureRoleKey = state._armatureRoleKey;
        if (state._armaturePartKey !== undefined) obj._armaturePartKey = state._armaturePartKey;
        if (state._armatureAttachmentPin !== undefined) obj._armatureAttachmentPin = state._armatureAttachmentPin;
    }

    pause() {
        this._playbackRange = null;
        this.isPlaying = false;
        this.isPaused = true;
        eventBus.emit('playback:paused');
        document.getElementById('tl-play').innerHTML = '<i class="fas fa-play"></i>';
    }

    _endPlayback(options = {}) {
        this._playbackRange = null;
        const {
            restoreOriginalState = true,
            clearSavedState = true,
            resetTime = true,
            preservedTime = this.currentTime,
            preservePersistentAnimations = false
        } = options;

        this.isPlaying = false;
        this.isPaused = false;
        this._interactivePreview = false;
        this._hoveredObjId = null;
        this._hideInteractiveOverlay();

        if (restoreOriginalState && this.originalStates) {
            for (const [id, state] of this.originalStates) {
                const obj = this.objects.getObjectById(id);
                if (obj) this._restoreFullState(obj, state);
            }
        }
        const keptPersistentState = preservePersistentAnimations && restoreOriginalState
            ? this._applyPersistentPlaybackState(preservedTime)
            : false;
        if (typeof window !== 'undefined') {
            window.app?.audioLipSync?.clearFrameOverrides?.();
        }

        if (clearSavedState && restoreOriginalState && !keptPersistentState) {
            this.originalStates = null;
        }

        this._preserveFinalPose = !restoreOriginalState || keptPersistentState;
        if (!restoreOriginalState && this.originalStates && preservedTime > 0) {
            this.applyAnimationsAtTime(preservedTime, { finalPose: true });
        }

        this._triggeredAnims = {};

        this.currentTime = resetTime ? 0 : preservedTime;
        this.stage.requestRender();
        eventBus.emit('playback:stopped');
        eventBus.emit('timeline:time', this.currentTime);
        document.getElementById('tl-play').innerHTML = '<i class="fas fa-play"></i>';
        document.getElementById('tl-time').textContent = Utils.formatTime(this.currentTime);
        document.title = 'Animation Stage 3D';

        if (keptPersistentState) {
            requestAnimationFrame(() => {
                if (this.isPlaying || !this._preserveFinalPose) return;
                this.applyAnimationsAtTime(preservedTime, { finalPose: true, persistentOnly: true });
                this.stage.requestRender();
            });
        }
    }

    stop() {
        // Keep persistent (e.g. path-follow) end-state when stopping, so the
        // object doesn't jump back to its start position. preservedTime uses
        // the current playhead so the persistent re-apply sees a valid time.
        const preservedTime = (this.currentTime > 0 ? this.currentTime : (this.totalDuration || 0));
        this._preserveFinalPose = true;
        this._endPlayback({
            restoreOriginalState: true,
            clearSavedState: true,
            resetTime: true,
            preservedTime,
            preservePersistentAnimations: true
        });
    }

    finishPlayback(preservedTime = this.currentTime) {
        // Restore the authored/base state first, then re-apply only the animations
        // that are configured to keep their end state after playback finishes.
        this._endPlayback({
            restoreOriginalState: true,
            clearSavedState: true,
            resetTime: false,
            preservedTime,
            preservePersistentAnimations: true
        });
    }

    /**
     * Restore every object to its captured pre-animation/base state without
     * resetting the playhead. Used when a scrub gesture ends so the stage shows
     * the authored appearance, while the playhead stays where the user left it.
     */
    restoreBaseState() {
        if (this.isPlaying) return;
        if (this.originalStates instanceof Map) {
            for (const [id, state] of this.originalStates) {
                const obj = this.objects.getObjectById(id);
                if (obj) this._restoreFullState(obj, state);
            }
            this.originalStates = null;
        }
        this._preserveFinalPose = false;
        this.stage.requestRender();
    }

    _stopLiveStageMotionForSeek() {
        try {
            const jointSystem = window.app?.jointSystem || window.jointSystem || null;
            if (!jointSystem) return;
            const armature = jointSystem._refreshDetectedArmatureReference?.(jointSystem._currentArmature)
                || jointSystem._currentArmature
                || jointSystem._detectSelectedArmature?.()
                || jointSystem._detectArmature?.();
            if (armature?.root) {
                jointSystem._stopArmatureMovement?.(armature);
                jointSystem._stopArmatureFacialMovement?.(armature);
            } else {
                jointSystem._stopArmatureMovement?.();
                jointSystem._stopArmatureFacialMovement?.();
            }
        } catch (error) {
            console.warn('[Animation Stage] Could not stop live motion before seeking:', error);
        }
    }

    previewTimelineAt(time) {
        this._preserveFinalPose = false;
        this._ensureOriginalStatesSnapshot();
        this.currentTime = time;
        this.applyAnimationsAtTime(time, { timelinePreview: true });
        this.stage.requestRender();
        eventBus.emit('timeline:time', time);
        const timeEl = document.getElementById('tl-time');
        if (timeEl) timeEl.textContent = Utils.formatTime(time);
        return time;
    }

    _ensureOriginalStatesSnapshot() {
        if (this.originalStates instanceof Map) return;
        this.originalStates = new Map();
        this.objects.objects.forEach(obj => {
            this.originalStates.set(obj.id, Utils.cloneProjectState(obj.toJSON()));
        });
    }

    _isEntranceAnimation(anim) {
        const type = anim?.type || '';
        return type.startsWith('entry-')
            || ['fade-in', 'slide-in', 'pop-in', 'spiral-in', 'zoom-slide'].includes(type);
    }

    _isExitAnimation(anim) {
        const type = anim?.type || '';
        return type.startsWith('exit-')
            || ['fade-out', 'slide-out', 'pop-out', 'dissolve'].includes(type);
    }

    _getAnimationSpan(anim) {
        const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim?.generated);
        let start = anim?.delay || 0;
        let duration = 0;
        configs.forEach(config => {
            if (!config || !config.duration) return;
            const configStartOffset = config._stepDelay || 0;
            const repeat = anim?.repeat === '-1' ? 1 : (parseInt(anim?.repeat, 10) || 1);
            duration = Math.max(duration, configStartOffset + config.duration * repeat);
        });
        if (!duration && anim?.params?.duration) duration = Number(anim.params.duration) * 1000;
        return { start, end: start + duration, duration };
    }

    _applyTimelinePreviewVisibility(obj, time, original) {
        if (!obj.animations || obj.animations.length === 0) return;

        const visibilityEvents = obj.animations
            .map(anim => {
                if (this._isEntranceAnimation(anim)) return { kind: 'entrance', ...this._getAnimationSpan(anim) };
                if (this._isExitAnimation(anim)) return { kind: 'exit', ...this._getAnimationSpan(anim) };
                return null;
            })
            .filter(event => event && event.duration >= 0)
            .sort((a, b) => a.start - b.start || (a.kind === 'exit' ? -1 : 1));

        if (visibilityEvents.length === 0) return;

        let visible = original?.visible !== false;
        const firstEntrance = visibilityEvents.find(event => event.kind === 'entrance');
        if (firstEntrance && time < firstEntrance.start) {
            visible = false;
        }

        visibilityEvents.forEach(event => {
            if (event.kind === 'entrance' && time >= event.start) {
                visible = true;
            } else if (event.kind === 'exit' && time >= event.end) {
                visible = false;
            }
        });

        obj.visible = visible;
    }

    seekToStart() {
        this._cancelAllPreviews();
        this._stopLiveStageMotionForSeek();
        this._preserveFinalPose = false;

        if (this.isPlaying || this.isPaused) {
            this._endPlayback({
                restoreOriginalState: true,
                clearSavedState: true,
                resetTime: true,
                preservedTime: 0,
                preservePersistentAnimations: false
            });
        } else {
            this.restoreBaseState();
        }

        this._triggeredAnims = {};
        this._preserveFinalPose = false;
        this._ensureOriginalStatesSnapshot();
        this.currentTime = 0;
        this.applyAnimationsAtTime(0, { finalPose: false, timelinePreview: true });
        if (this.objects?._resolvePins) this.objects._resolvePins();
        this.stage.requestRender();
        eventBus.emit('timeline:time', 0);
        eventBus.emit('playback:stopped');
        const playBtn = document.getElementById('tl-play');
        if (playBtn) playBtn.innerHTML = '<i class="fas fa-play"></i>';
        const timeEl = document.getElementById('tl-time');
        if (timeEl) timeEl.textContent = Utils.formatTime(0);
        this._preserveFinalPose = false;

        return 0;
    }

    seekToEnd() {
        const targetTime = this.totalDuration || this.getLastAnimationEnd() || 5000;

        if (this.isPlaying || this.isPaused) {
            this._endPlayback({
                restoreOriginalState: true,
                clearSavedState: false,
                resetTime: false,
                preservedTime: targetTime,
                preservePersistentAnimations: false
            });
        }

        this._preserveFinalPose = false;
        this._ensureOriginalStatesSnapshot();
        this.currentTime = targetTime;
        this.applyAnimationsAtTime(targetTime, { finalPose: true, timelinePreview: true });
        this.stage.requestRender();
        eventBus.emit('timeline:time', targetTime);
        const timeEl = document.getElementById('tl-time');
        if (timeEl) timeEl.textContent = Utils.formatTime(targetTime);

        return targetTime;
    }

    playLoop(generation) {
        // If a newer playAll() has started, this loop is stale — exit silently.
        if (generation !== undefined && generation !== this._playGeneration) {
            return;
        }
        if (!this.isPlaying) {
            return;
        }

        const now = performance.now();
        this.currentTime = (now - this.startTime) * this.playbackSpeed;
        if (this._playbackRange && this.currentTime >= this._playbackRange.end) {
            const start = this._playbackRange.start;
            this.pause();
            this.isPaused = false;
            this.previewTimelineAt(start);
            return;
        }

        // Auto-return: stop after the last animation ends, not after full timeline
        // Disable auto-return during interactive preview so user can still trigger animations
        if (this.autoReturn && !this.looping && !this._interactivePreview) {
            const lastEnd = this.getLastAnimationEnd();
            if (lastEnd > 0 && this.currentTime >= lastEnd) {
                this.currentTime = lastEnd;
                this.applyAnimationsAtTime(this.currentTime, { finalPose: true });
                this.stage.render();
                this.stage.needsRender = false;
                document.getElementById('tl-time').textContent = Utils.formatTime(this.currentTime);
                eventBus.emit('timeline:time', this.currentTime);
                this.finishPlayback(this.currentTime);
                return;
            }
        }

        if (this.currentTime >= this.totalDuration) {
            if (this.looping || this._interactivePreview) {
                this.currentTime = 0;
                this.startTime = now;
                // Reset states (full property restore for loop)
                if (this.originalStates) {
                    for (const [id, state] of this.originalStates) {
                        const obj = this.objects.getObjectById(id);
                        if (obj) this._restoreFullState(obj, state);
                    }
                }
                if (this._interactivePreview) {
                    this._triggeredAnims = {};
                }
            } else {
                this.currentTime = this.totalDuration;
                this.applyAnimationsAtTime(this.currentTime, { finalPose: true });
                this.stage.render();
                this.stage.needsRender = false;
                document.getElementById('tl-time').textContent = Utils.formatTime(this.currentTime);
                eventBus.emit('timeline:time', this.currentTime);
                this.finishPlayback(this.currentTime);
                return;
            }
        }

        // Apply animations at current time
        this.applyAnimationsAtTime(this.currentTime);
        this._flushSvgAvatarStateRenders();
        this._flushSvgAfricanFaceStateRenders();

        // Render immediately in the same rAF callback so there's no 1-frame
        // lag between animation computation and display (matching preview behaviour)
        this.stage.render();
        this.stage.needsRender = false;

        // Update time display
        document.getElementById('tl-time').textContent = Utils.formatTime(this.currentTime);
        eventBus.emit('timeline:time', this.currentTime);
        
        requestAnimationFrame(() => this.playLoop(generation));
    }

    applyAnimationsAtTime(time, options = {}) {
        if (options.finalPose === undefined && this._preserveFinalPose && !this.isPlaying) {
            options = { ...options, finalPose: true };
        }
        const timelinePreview = !!options.timelinePreview || this.isPlaying;
        this._activeEffectFrames = [];
        this._pendingSvgArmatureTimelineViews = new Map();
        const audioLipSyncFrames = [];
        const clearInactiveLipSyncFrames = () => {
            this.objects.objects.forEach(obj => {
                const hasSvgFaceFrames = obj?._svgAfricanFaceImageCache instanceof Map
                    || Object.prototype.hasOwnProperty.call(obj || {}, '_svgAfricanFaceTransientActive');
                if (hasSvgFaceFrames && obj._svgAfricanFaceTransientActive !== true) {
                    delete obj._audioLipSyncImageElement;
                } else if (!hasSvgFaceFrames && obj._audioLipSyncFrameActive !== true) {
                    delete obj._audioLipSyncImageElement;
                    delete obj._audioLipSyncPendingSource;
                    delete obj._audioLipSyncViseme;
                    delete obj._audioLipSyncEyeState;
                    delete obj._audioLipSyncBrowState;
                }
                delete obj._audioLipSyncFrameActive;
            });
        };
        this.objects.objects.forEach((obj) => {
            if (obj?.isSpriteSequence) obj._spriteTimelineTime = Math.max(0, Number(time) || 0);
            if (obj?.realistic3D) delete obj._realistic3DSpeech;
            const hasSvgFaceFrames = obj?._svgAfricanFaceImageCache instanceof Map
                || Object.prototype.hasOwnProperty.call(obj || {}, '_svgAfricanFaceTransientActive');
            if (hasSvgFaceFrames) obj._svgAfricanFaceTransientActive = false;
            else obj._audioLipSyncFrameActive = false;
        });

        // PowerPoint-style authoring behavior: with the playhead parked at the
        // beginning, objects should remain in their authored state until the
        // user actually plays or scrubs forward. Seeking to t=0 outside
        // playback therefore restores the base state and stops there.
        if (!timelinePreview && !this.isPlaying && !options.finalPose && time <= 0) {
            this.objects.objects.forEach((obj) => {
                if (!this.originalStates || !(this.originalStates instanceof Map)) return;
                const original = this.originalStates.get(obj.id);
                if (original) this._restoreFullState(obj, original);
            });
            this._flushSvgArmatureTimelineViewSyncs();
            clearInactiveLipSyncFrames();
            return;
        }

        let pathFollowApplied = 0;
        let propSets = 0;
        let objsProcessed = 0;
        let objsWithAnims = 0;
        let animsSkipped = 0;
        let firstAnimObj = null;
        let firstAnimInfo = null;

        this.objects.objects.forEach((obj) => {
            if (!this.originalStates || !(this.originalStates instanceof Map)) return;
            const original = this.originalStates.get(obj.id);
            if (!original) return;

            objsProcessed++;

            // Restore object to original state before applying any animations
            this._restoreFullState(obj, original);
            if (timelinePreview) {
                this._applyTimelinePreviewVisibility(obj, time, original);
            }

            if (!obj.animations || obj.animations.length === 0) return;
            objsWithAnims++;

            // Track properties actively driven by running animations for this object.
            // This prevents not-yet-started chain steps or later animations from
            // overriding a currently-active animation's computed value with their
            // static 'from' value — which was causing "haphazard" playback.
            const activeAnimProps = new Set();

            obj.animations.forEach(anim => {
                try {
                    if (!anim || !anim.generated) { animsSkipped++; return; }
                    if (options.persistentOnly && !this._animationKeepsFinalState(anim)) {
                        return;
                    }

                    const trigger = anim.trigger || 'onLoad';

                    let animStart = anim.delay || 0;
                    if (trigger !== 'onLoad') {
                        const triggerTime = this._triggeredAnims[anim.id];
                        if (triggerTime === undefined) {
                            animsSkipped++;
                            return;
                        }
                        animStart = triggerTime + (anim.delay || 0);
                    }

                    const gen = anim.generated;

                    // === PATH-FOLLOW: direct check ===
                    if (gen && !Array.isArray(gen) && gen.type === 'path-follow') {
                        const pathConfig = this._resolvePathFollowConfig(anim, gen);
                        const elapsed = time - animStart;
                        const playback = this._getAnimationPlaybackState(anim, pathConfig.duration || 0, elapsed);
                        if (!playback.apply) return;
                        this._applyPathFollowAtTime(obj, anim, pathConfig, animStart + playback.elapsed, animStart);
                        pathFollowApplied++;
                        activeAnimProps.add('x');
                        activeAnimProps.add('y');
                        if (!firstAnimObj) {
                            firstAnimObj = obj;
                            firstAnimInfo = `path-follow pts=${pathConfig.pathPoints?.length}`;
                        }
                        return;
                    }

                    // === STANDARD: iterate generated configs ===
                    const configs = this._sanitizeGeneratedConfigsForAnimation(anim, gen);

                    configs.forEach(config => {
                        if (!config) return;

                        // Chain animations: each config may have a per-step delay
                        const configStart = animStart + (config._stepDelay || 0);

                        if (config.type === 'audio-lip-sync') {
                            const elapsed = time - configStart;
                            const duration = Math.max(1, Number(config.duration) || 1);
                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;
                            audioLipSyncFrames.push({
                                owner: obj,
                                animation: anim,
                                config,
                                localTimeMs: Math.min(duration, Math.max(0, playback.elapsed))
                            });
                            return;
                        }

                        if (this._isEffectOverlayType(config.type)) {
                            const elapsed = time - configStart;
                            const duration = config.duration || 1500;
                            if (elapsed <= 0) {
                                if (config.type === 'draw-trace') {
                                    obj.opacity = 0;
                                    activeAnimProps.add('opacity');
                                }
                                return;
                            }
                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;

                            const repeat = playback.repeatCount;
                            let localTime = playback.elapsed;
                            if (repeat !== Infinity) localTime = Math.min(playback.elapsed, duration * repeat);
                            let rawProgress = Math.min((localTime % duration) / duration, 1);
                            if (repeat !== Infinity && localTime >= duration * repeat) rawProgress = 1;
                            const easingFn = Utils.getEasing(config.easing || 'easeOut');
                            const progress = easingFn(Math.max(0, Math.min(1, rawProgress)));

                            this._activeEffectFrames.push({
                                type: config.type,
                                obj,
                                config,
                                progress,
                                localTime: Math.min(localTime % duration, duration),
                                duration
                            });

                            if (config.type === 'break-apart' && config.originalMode !== 'keep') {
                                obj.opacity = 0;
                                activeAnimProps.add('opacity');
                            }
                            if (config.type === 'draw-trace') {
                                obj.opacity = this._getDrawTraceObjectReveal(progress);
                                activeAnimProps.add('opacity');
                            }
                            if ((config.type !== 'draw-trace' && config.effectObjectMode === 'hide') || (config.effectObjectMode !== 'show' && (config.type === 'wave-distort' || config.type === 'melt-drip' || config.type === 'brush-reveal' || config.type === 'paint-reveal' || config.type === 'dust-away' || config.type === 'chromatic-glitch' || config.type === 'glass-shatter'))) {
                                obj.opacity = 0;
                                activeAnimProps.add('opacity');
                            }
                            return;
                        }

                        if (config.type === 'path-follow') {
                            const pathConfig = this._resolvePathFollowConfig(anim, config);
                            const elapsed = time - configStart;
                            const playback = this._getAnimationPlaybackState(anim, pathConfig.duration || 0, elapsed);
                            if (!playback.apply) return;
                            this._applyPathFollowAtTime(obj, anim, pathConfig, configStart + playback.elapsed, configStart);
                            pathFollowApplied++;
                            activeAnimProps.add('x');
                            activeAnimProps.add('y');
                            return;
                        }

                        // Handle walk-cycle animation (icon frame swapping)
                        if (config.type === 'walk-cycle') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 2000;
                            if (elapsed < 0) return;
                            const frames = config.frames;
                            if (!frames || frames.length === 0 || obj.type !== 'icon') return;

                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;

                            const repeat = playback.repeatCount;
                            const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;

                            let localTime = playback.elapsed;
                            if (repeat !== Infinity) localTime = Math.min(playback.elapsed, duration * repeat);
                            let progress = Math.min((localTime % duration) / duration, 1);
                            if (localTime >= duration * repeat && repeat !== Infinity) progress = 1;

                            if (isCycleMode) {
                                const cycleIndex = Math.floor(localTime / duration);
                                if (cycleIndex % 2 === 1 && !(localTime >= duration * repeat && repeat !== Infinity)) {
                                    progress = 1 - progress;
                                }
                            }

                            // Determine which frame to show based on FPS
                            const fps = config.fps || 6;
                            const frameDur = 1000 / fps;
                            const frameIdx = Math.floor((localTime % duration) / frameDur) % frames.length;
                            obj.iconPath = frames[frameIdx];
                            activeAnimProps.add('iconPath');

                            // Apply horizontal movement if specified
                            if (config.moveX) {
                                const easingFn = Utils.getEasing(config.easing || 'linear');
                                const moveProgress = easingFn(progress);
                                const origX = original.x;
                                obj.x = origX + config.moveX * moveProgress;
                                activeAnimProps.add('x');
                            }

                            // Subtle vertical bob for realism
                            const bobFactor = config.bobFactor || 0.02;
                            const bobAmount = obj.height * bobFactor;
                            const bobPhase = (localTime % (frameDur * 2)) / (frameDur * 2);
                            obj.y = original.y + Math.sin(bobPhase * Math.PI * 2) * bobAmount;
                            activeAnimProps.add('y');
                            return;
                        }

                        // Handle bone-pose animation (rigging deformation)
                        if (config.type === 'bone-pose') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 3000;
                            if (elapsed < 0) return;
                            if (!config.keyframes || config.keyframes.length === 0 || !obj.rigging) return;

                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;

                            const repeat = playback.repeatCount;
                            const isPingpong = anim.repeat === 'pingpong';

                            const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;

                            let localTime = playback.elapsed;
                            if (repeat !== Infinity) localTime = Math.min(playback.elapsed, duration * repeat);
                            let progress = Math.min((localTime % duration) / duration, 1);
                            if (localTime >= duration * repeat && repeat !== Infinity) progress = 1;

                            // Smooth cycle: reverse direction on odd-numbered cycles
                            if (isCycleMode) {
                                const cycleIndex = Math.floor(localTime / duration);
                                if (cycleIndex % 2 === 1 && !(localTime >= duration * repeat && repeat !== Infinity)) {
                                    progress = 1 - progress;
                                }
                            }

                            const easingFn = Utils.getEasing(config.easing || 'easeInOut');
                            if (isPingpong) {
                                progress = progress < 0.5
                                    ? easingFn(progress * 2)
                                    : easingFn(2 - progress * 2);
                            } else {
                                progress = easingFn(progress);
                            }

                            const pose = RiggingUtils.interpolateKeyframePoses(config.keyframes, progress);
                            RiggingUtils.applyPoseToObject(obj, pose);
                            activeAnimProps.add('_rigging');
                            return;
                        }

                        // Handle joint-rotation animation (from Joint System)
                        if (config.type === 'joint-rotation') {
                            const elapsed = time - configStart;
                            if (elapsed < 0) return;
                            const totalDuration = (config.singleCycleDuration || 0) * (config.repeatCycles || 1);
                            const playback = this._getAnimationPlaybackState(anim, totalDuration, elapsed);
                            if (!playback.apply) return;
                            const evalElapsed = playback.keepsFinalState && playback.totalDuration !== Infinity && playback.elapsed >= playback.totalDuration
                                ? Math.max(0, playback.totalDuration - 0.0001)
                                : playback.elapsed;
                            const motionState = JointSystem.evaluateJointAnim(config, evalElapsed);
                            if (motionState !== null) {
                                const targetMode = config.targetMode || 'base';
                                const target = JointSystem.resolveJointAnimTarget(obj, config);
                                const applied = JointSystem.applyJointAnimState(obj, config, motionState);
                                if (!applied) return;
                                if (targetMode === 'joint' && target?.mode === 'joint') {
                                    const key = target.joint?.id || config.targetJointName || config.partKey || 'joint';
                                    activeAnimProps.add(`jointAngle:${key}`);
                                    if (typeof motionState.tiltX === 'number') activeAnimProps.add(`jointTiltX:${key}`);
                                    if (typeof motionState.tiltY === 'number') activeAnimProps.add(`jointTiltY:${key}`);
                                } else if (targetMode === 'flex' && target?.mode === 'flex') {
                                    const key = target.flexPin?.id || config.targetFlexPinName || config.partKey || 'flex';
                                    activeAnimProps.add(`flexPinAngle:${key}`);
                                } else {
                                    activeAnimProps.add('jointBaseAngle');
                                    if (typeof motionState.tiltX === 'number') activeAnimProps.add('tiltX');
                                    if (typeof motionState.tiltY === 'number') activeAnimProps.add('tiltY');
                                    if (!obj.pinnedTo && typeof motionState.x === 'number') activeAnimProps.add('x');
                                    if (!obj.pinnedTo && typeof motionState.y === 'number') activeAnimProps.add('y');
                                }
                            }
                            return;
                        }

                        // Handle continuous recording animation
                        if (config.type === 'continuous') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 3000;
                            if (elapsed < 0) return;
                            const kfs = config.keyframes;
                            if (!kfs || kfs.length === 0) return;

                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;

                            const repeat = playback.repeatCount;
                            const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;

                            let localTime = playback.elapsed;
                            if (repeat !== Infinity) localTime = Math.min(playback.elapsed, duration * repeat);
                            let progress = Math.min((localTime % duration) / duration, 1);
                            if (localTime >= duration * repeat && repeat !== Infinity) progress = 1;

                            if (isCycleMode) {
                                const cycleIndex = Math.floor(localTime / duration);
                                if (cycleIndex % 2 === 1 && !(localTime >= duration * repeat && repeat !== Infinity)) {
                                    progress = 1 - progress;
                                }
                            }

                            // Find surrounding keyframes and interpolate
                            if (progress <= kfs[0].t) {
                                if (kfs[0].values) { for (const k of Object.keys(kfs[0].values)) { this._setAnimatedPropertyValue(obj, k, kfs[0].values[k]); activeAnimProps.add(k); } }
                                if (kfs[0].pose && obj.rigging) { RiggingUtils.applyPoseToObject(obj, kfs[0].pose); activeAnimProps.add('_rigging'); }
                            } else if (progress >= kfs[kfs.length - 1].t) {
                                const last = kfs[kfs.length - 1];
                                if (last.values) { for (const k of Object.keys(last.values)) { this._setAnimatedPropertyValue(obj, k, last.values[k]); activeAnimProps.add(k); } }
                                if (last.pose && obj.rigging) { RiggingUtils.applyPoseToObject(obj, last.pose); activeAnimProps.add('_rigging'); }
                            } else {
                                for (let ki = 0; ki < kfs.length - 1; ki++) {
                                    if (progress >= kfs[ki].t && progress <= kfs[ki + 1].t) {
                                        const rawLocalT = (progress - kfs[ki].t) / (kfs[ki + 1].t - kfs[ki].t);
                                        const localT = config.segmentEasing === 'easeInOutQuad'
                                            ? (rawLocalT < 0.5
                                                ? 2 * rawLocalT * rawLocalT
                                                : 1 - Math.pow(-2 * rawLocalT + 2, 2) / 2)
                                            : rawLocalT;
                                        const v0 = kfs[ki].values, v1 = kfs[ki + 1].values;
                                        if (v0 && v1) {
                                            for (const k of Object.keys(v0)) {
                                                if (v1[k] !== undefined) {
                                                    const interpolatedValue = v0[k] + (v1[k] - v0[k]) * localT;
                                                    const resolvedValue = this._resolveAnimatedPropertyValue(obj, k, v0[k], v1[k], localT, interpolatedValue);
                                                    this._setAnimatedPropertyValue(obj, k, resolvedValue);
                                                    activeAnimProps.add(k);
                                                }
                                            }
                                        }
                                        if (kfs[ki].pose && kfs[ki + 1].pose && obj.rigging) {
                                            const pose = RiggingUtils.interpolatePoses(kfs[ki].pose, kfs[ki + 1].pose, localT);
                                            RiggingUtils.applyPoseToObject(obj, pose);
                                            activeAnimProps.add('_rigging');
                                        }
                                        break;
                                    }
                                }
                            }
                            // Map joint virtual properties to the joints array
                            if (obj.joints && obj.joints.length > 0) {
                                const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                                for (let ji = 0; ji < sorted.length; ji++) {
                                    if (obj['jointAngle_' + ji] !== undefined) sorted[ji].angle = obj['jointAngle_' + ji];
                                    if (obj['jointTiltX_' + ji] !== undefined) sorted[ji].tiltX = obj['jointTiltX_' + ji];
                                    if (obj['jointTiltY_' + ji] !== undefined) sorted[ji].tiltY = obj['jointTiltY_' + ji];
                                    if (obj['jointCrossOffset_' + ji] !== undefined) sorted[ji].crossOffset = obj['jointCrossOffset_' + ji];
                                }
                            }
                            if (obj.flexPins && obj.flexPins.length > 0) {
                                const sortedFlexPins = [...obj.flexPins].sort((a, b) => a.position - b.position);
                                for (let fi = 0; fi < sortedFlexPins.length; fi++) {
                                    if (obj['flexPinAngle_' + fi] !== undefined) sortedFlexPins[fi].angle = obj['flexPinAngle_' + fi];
                                }
                            }
                            return;
                        }

                        // Handle topple animation (edge pivot rotation)
                        if (config.type === 'topple') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 1000;
                            if (elapsed < 0) return;

                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;

                            const repeat = playback.repeatCount;
                            const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;

                            let localTime = playback.elapsed;
                            if (repeat !== Infinity) localTime = Math.min(playback.elapsed, duration * repeat);
                            let rawProg = Math.min((localTime % duration) / duration, 1);
                            if (localTime >= duration * repeat && repeat !== Infinity) rawProg = 1;

                            if (isCycleMode) {
                                const ci = Math.floor(localTime / duration);
                                if (ci % 2 === 1 && !(localTime >= duration * repeat && repeat !== Infinity)) rawProg = 1 - rawProg;
                            }

                            const easingFn = Utils.getEasing(config.easing || 'easeIn');
                            const progress = easingFn(rawProg);

                            const angleRad = (config.angle * progress) * Math.PI / 180;
                            const cx = config.startX + config.width / 2;
                            const cy = config.startY + config.height / 2;
                            const dx = cx - config.pivotX;
                            const dy = cy - config.pivotY;
                            obj.x = config.pivotX + dx * Math.cos(angleRad) - dy * Math.sin(angleRad) - config.width / 2;
                            obj.y = config.pivotY + dx * Math.sin(angleRad) + dy * Math.cos(angleRad) - config.height / 2;
                            obj.rotation = config.startRotation + config.angle * progress;

                            activeAnimProps.add('x');
                            activeAnimProps.add('y');
                            activeAnimProps.add('rotation');
                            return;
                        }

                        // Handle topple-line animation (rolling box on floor)
                        if (config.type === 'topple-line') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 3200;
                            if (elapsed < 0) return;

                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;

                            const repeat = playback.repeatCount;
                            const totalDur = duration * repeat;

                            let localTime = playback.elapsed;
                            if (repeat !== Infinity) localTime = Math.min(playback.elapsed, totalDur);
                            let cycleElapsed = localTime % duration;
                            if (localTime >= totalDur && repeat !== Infinity) cycleElapsed = duration;

                            const steps = config.steps;
                            const numSteps = steps.length;
                            const stepDur = duration / numSteps;
                            const stepIdx = Math.min(Math.floor(cycleElapsed / stepDur), numSteps - 1);
                            const stepElapsed = cycleElapsed - stepIdx * stepDur;
                            let rawProg = Math.min(stepElapsed / stepDur, 1);
                            if (cycleElapsed >= duration) rawProg = 1;

                            const easingFn = Utils.getEasing(config.easing || 'easeIn');
                            const prog = easingFn(rawProg);
                            const step = steps[stepIdx];
                            const ar = (step.angle * prog) * Math.PI / 180;
                            const cx = step.startX + config.width / 2, cy = step.startY + config.height / 2;
                            const dx = cx - step.pivotX, dy = cy - step.pivotY;
                            obj.x = step.pivotX + dx * Math.cos(ar) - dy * Math.sin(ar) - config.width / 2;
                            obj.y = step.pivotY + dx * Math.sin(ar) + dy * Math.cos(ar) - config.height / 2;
                            obj.rotation = step.startRotation + step.angle * prog;

                            activeAnimProps.add('x');
                            activeAnimProps.add('y');
                            activeAnimProps.add('rotation');
                            return;
                        }

                        // Handle orbit animations (circular motion)
                        if (config.type === 'orbit') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 3000;
                            if (elapsed < 0) return;

                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;

                            const repeat = playback.repeatCount;
                            const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;
                            let localTime = playback.elapsed;
                            if (repeat !== Infinity) {
                                localTime = Math.min(playback.elapsed, duration * repeat);
                            }
                            let rawProgress = (localTime % duration) / duration;
                            if (repeat !== Infinity && localTime >= duration * repeat) {
                                rawProgress = 1;
                            }
                            // Smooth cycle: reverse direction on odd cycles
                            if (isCycleMode) {
                                const cycleIndex = Math.floor(localTime / duration);
                                if (cycleIndex % 2 === 1 && !(localTime >= duration * repeat && repeat !== Infinity)) {
                                    rawProgress = 1 - rawProgress;
                                }
                            }
                            const easingFn = Utils.getEasing(config.easing || 'linear');
                            const progress = easingFn(rawProgress);
                            const orbitPos = this._getOrbitPosition(obj, config, progress);
                            obj.x = orbitPos.x;
                            obj.y = orbitPos.y;
                            activeAnimProps.add('x');
                            activeAnimProps.add('y');
                            return;
                        }

                        // Handle typewriter animation in timeline
                        if (config.type === 'typewriter') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 2000;
                            if (elapsed < 0) return;
                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;
                            const fullText = config.text || original.text || '';
                            const progress = Math.min(playback.elapsed / duration, 1);
                            const chars = Math.floor(progress * fullText.length);
                            obj.text = fullText.substring(0, chars);
                            activeAnimProps.add('text');
                            return;
                        }

                        // Handle matrix-scramble animation in timeline
                        if (config.type === 'matrix-scramble') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 1600;
                            if (elapsed < 0) return;
                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;
                            const fullText = String(config.text ?? original.text ?? '');
                            const easingFn = Utils.getEasing(config.easing || 'easeOut');
                            const rawT = Math.min(playback.elapsed / duration, 1);
                            const t = easingFn(rawT);
                            const lockCount = Math.floor(t * fullText.length);
                            const seed = config.seed || 1;
                            const charset = '!<>-_\\/[]{}—=+*^?#ABCDEF0123456789';
                            let out = '';
                            for (let i = 0; i < fullText.length; i++) {
                                const ch = fullText[i];
                                if (i < lockCount || /\s/.test(ch)) {
                                    out += ch;
                                } else {
                                    const r = this._seededRandom(seed + i * 31 + Math.floor(playback.elapsed / 50));
                                    out += charset[Math.floor(r * charset.length)];
                                }
                            }
                            obj.text = (rawT >= 1) ? fullText : out;
                            activeAnimProps.add('text');
                            return;
                        }

                        // Handle counter-text animation in timeline
                        if (config.type === 'counter-text') {
                            const elapsed = time - configStart;
                            const duration = config.duration || 2000;
                            if (elapsed < 0) return;
                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;
                            const from = Number.isFinite(config.from) ? config.from : 0;
                            const to = Number.isFinite(config.to) ? config.to : 100;
                            const decimals = Math.max(0, Math.min(4, config.decimals ?? 0));
                            const easingFn = Utils.getEasing(config.easing || 'easeOut');
                            const rawT = Math.min(playback.elapsed / duration, 1);
                            const t = easingFn(rawT);
                            const value = from + (to - from) * t;
                            obj.text = `${config.prefix || ''}${value.toFixed(decimals)}${config.suffix || ''}`;
                            activeAnimProps.add('text');
                            return;
                        }

                        // Handle chain shape morphing: change type when progress >= threshold
                        if (config.property === '_chainType') {
                            const { from, to, duration, easing: cfgEasing = 'easeInOut', _morphTo, _morphSides, _morphInnerRadius, _morphBorderRadius } = config;
                            const elapsed = time - configStart;
                            if (elapsed >= 0 && duration > 0) {
                                const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                                if (!playback.apply) return;
                                const progress = Math.min(playback.elapsed / duration, 1);
                                // Morph shape at 85% progress (near the target position)
                                if (progress >= 0.85) {
                                    obj.type = _morphTo;
                                    if (_morphSides !== undefined) obj.sides = _morphSides;
                                    if (_morphInnerRadius !== undefined) obj.innerRadius = _morphInnerRadius;
                                    if (_morphBorderRadius !== undefined) obj.borderRadius = _morphBorderRadius;
                                }
                                activeAnimProps.add('_chainType');
                            }
                            return;
                        }

                        // ── Part-keyframe animation (multi-property keyframe interpolation) ──
                        if (config.type === 'part-keyframe' && config.keyframes) {
                            const elapsed = time - configStart;
                            if (elapsed < 0) return;
                            const duration = config.duration || 1000;
                            const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                            if (!playback.apply) return;
                            // Lazily capture original values on first hit
                            if (!obj._pkfOriginals) {
                                const savedState = this.originalStates?.get(obj.id);
                                obj._pkfOriginals = {
                                    x: savedState?.x ?? obj.x,
                                    y: savedState?.y ?? obj.y,
                                    rotation: savedState?.rotation ?? (obj.rotation || 0),
                                    scaleX: savedState?.scaleX ?? (obj.scaleX || 1),
                                    scaleY: savedState?.scaleY ?? (obj.scaleY || 1)
                                };
                            }
                            if (typeof PartKeyframeHandler !== 'undefined') {
                                PartKeyframeHandler.apply(obj, obj._pkfOriginals, config, playback.elapsed, anim, activeAnimProps, options.finalPose);
                            }
                            return;
                        }

                        if (!config.property) { animsSkipped++; return; }

                        const { property, from, to, duration, easing = 'easeInOut', pingpong } = config;
                        if (!duration || duration <= 0) { animsSkipped++; return; }

                        let fromVal = from;
                        let toVal = to;
                        if (anim.type === 'face-set' && (property === 'x' || property === 'y')) {
                            // face-set animations bake insertion-time coordinates into from/to.
                            // When the face-set is moved after insertion, treat from/to as a
                            // relative delta applied from the object's current base position,
                            // so brows and mouth follow the object instead of snapping back.
                            const currentBase = Number.isFinite(original?.[property])
                                ? Number(original[property])
                                : null;
                            if (Number.isFinite(currentBase) && Number.isFinite(from) && Number.isFinite(to)) {
                                const delta = Number(to) - Number(from);
                                fromVal = currentBase;
                                toVal = currentBase + delta;
                            }
                        }
                        if (anim.type === 'face-set-motion' && Number.isFinite(config._faceSetRelativeDelta)) {
                            const baseline = Number.isFinite(original?.[property])
                                ? Number(original[property])
                                : (Number.isFinite(from) ? Number(from) : 0);
                            fromVal = baseline;
                            toVal = baseline + Number(config._faceSetRelativeDelta);
                        }

                        const elapsed = time - configStart;

                        if (elapsed < 0) {
                            // Before an animation starts, keep the authored/base state.
                            // Applying the generated "from" state here makes entry
                            // animations leak onto the stage before playback or scrub.
                            return;
                        }

                        const playback = this._getAnimationPlaybackState(anim, duration, elapsed);
                        if (!playback.apply) return;

                        // Mark this property as actively animated
                        activeAnimProps.add(property);

                        let isPingpong = !!pingpong;
                        const repeat = playback.repeatCount;
                        if (anim.repeat === 'pingpong') { isPingpong = true; }

                        const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;

                        let localTime = playback.elapsed;
                        const singleDuration = duration;

                        if (repeat !== Infinity) {
                            localTime = Math.min(playback.elapsed, singleDuration * repeat);
                        }

                        let cycleTime = localTime % singleDuration;
                        let progress = Math.min(cycleTime / singleDuration, 1);

                        if (localTime >= singleDuration * repeat && repeat !== Infinity) {
                            progress = 1;
                        }

                        const easingFn = Utils.getEasing(easing);

                        // Smooth cycle: reverse direction on odd-numbered cycles
                        if (isCycleMode && repeat > 1) {
                            const cycleIndex = Math.floor(localTime / singleDuration);
                            if (cycleIndex % 2 === 1 && !(localTime >= singleDuration * repeat && repeat !== Infinity)) {
                                progress = 1 - progress;
                            }
                        }

                        if (isPingpong) {
                            progress = progress < 0.5
                                ? easingFn(progress * 2)
                                : easingFn(2 - progress * 2);
                        } else {
                            progress = easingFn(progress);
                        }

                        // Color interpolation for hex color configs
                        if (config.type === 'color') {
                            const fromRgb = this._hexToRgb(fromVal) || { r: 0, g: 0, b: 0 };
                            const toRgb = this._hexToRgb(toVal) || { r: 255, g: 255, b: 255 };
                            const r = Math.round(fromRgb.r + (toRgb.r - fromRgb.r) * progress);
                            const g = Math.round(fromRgb.g + (toRgb.g - fromRgb.g) * progress);
                            const b = Math.round(fromRgb.b + (toRgb.b - fromRgb.b) * progress);
                            obj[property] = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                            propSets++;
                            return;
                        }

                        if (config.type === 'discrete') {
                            this._setAnimatedPropertyValue(obj, property, progress >= 1 ? toVal : fromVal);
                            propSets++;
                            return;
                        }

                        const keyframeValue = config.keyframes && config.keyframes.length >= 2
                            ? this._interpolateCodeValueKeyframes(config.keyframes, progress)
                            : null;
                        const interpolatedVal = keyframeValue !== null
                            ? keyframeValue
                            : Utils.lerp(fromVal, toVal, progress);
                        const newVal = this._resolveAnimatedPropertyValue(obj, property, fromVal, toVal, progress, interpolatedVal);
                        this._setAnimatedPropertyValue(obj, property, newVal);
                        if (anim.type === 'face-set' || anim.type === 'face-set-motion') {
                            this._traceFaceSetPlayback(obj, anim, property, {
                                fromVal,
                                toVal,
                                value: newVal,
                                progress,
                                elapsed,
                                configStart,
                                time
                            });
                        }
                        propSets++;

                        if (!firstAnimObj) {
                            firstAnimObj = obj;
                            firstAnimInfo = `${property}: ${fromVal?.toFixed?.(1) ?? fromVal} → ${toVal?.toFixed?.(1) ?? toVal} (p=${progress.toFixed(2)}, val=${typeof newVal === 'number' ? newVal.toFixed(1) : newVal})`;
                        }
                    });
                } catch (err) {
                    console.warn('Animation error for', anim.name || anim.id, ':', err);
                }
            });

            // Sync pathPoints after all animations applied (if x/y/width/height changed)
            if (obj.pathPoints && obj.pathPoints.length > 0 && original.pathPoints && original.pathPoints.length > 0) {
                const dx = obj.x - original.x;
                const dy = obj.y - original.y;
                const sx = (original.width && obj.width !== original.width) ? obj.width / original.width : 1;
                const sy = (original.height && obj.height !== original.height) ? obj.height / original.height : 1;
                if (dx !== 0 || dy !== 0 || sx !== 1 || sy !== 1) {
                    for (let pi = 0; pi < obj.pathPoints.length && pi < original.pathPoints.length; pi++) {
                        obj.pathPoints[pi].x = obj.x + (original.pathPoints[pi].x - original.x) * sx;
                        obj.pathPoints[pi].y = obj.y + (original.pathPoints[pi].y - original.y) * sy;
                    }
                }
            }
        });

        this._flushSvgArmatureTimelineViewSyncs();
        if (audioLipSyncFrames.length && typeof window !== 'undefined') {
            window.app?.audioLipSync?.applyTimelineClips?.(audioLipSyncFrames);
            this._flushSvgAfricanFaceStateRenders();
        }
        clearInactiveLipSyncFrames();

        // ===== Scripting / Expressions pass =====
        // Run AFTER all standard animations so expressions can read the
        // animated baseline via `value` and either replace or modify it.
        // Done as a separate object pass so cross-object references (e.g.
        // layer("Other").x) always see the post-animation pose.
        try {
            if (typeof window !== 'undefined' && window.app && window.app.expressions) {
                window.app.expressions.applyAll(time, this.objects.objects);
            }
        } catch (_) { /* per-expression errors handled inside engine */ }

        // Cascade animated parent positions/rotations to pinned children so
        // a pinned wheel follows its animated car, etc. Mirrors what manual
        // dragging does after each move.
        try {
            if (this.objects && typeof this.objects._resolvePins === 'function') {
                this.objects._resolvePins();
            }
        } catch (_) { /* pin resolution is non-critical */ }

        // Force render (skip during video export to avoid flashing the main stage)
        if (!this._exportingVideo) {
            this.stage.needsRender = true;
            this.stage.requestRender();
        }
    }

    renderEffectOverlays(ctx) {
        const frames = this._activeEffectFrames || [];
        if (!ctx || frames.length === 0) return;
        frames.forEach(effect => {
            const cfg = effect.config || {};
            ctx.save();
            if (cfg.blendMode && cfg.blendMode !== 'source-over') {
                ctx.globalCompositeOperation = cfg.blendMode;
            }
            if (effect.type === 'shoot-pellets') this._renderShootEffect(ctx, effect);
            if (effect.type === 'break-apart') this._renderBreakApartEffect(ctx, effect);
            if (effect.type === 'ripple-wave') this._renderRippleWaveEffect(ctx, effect);
            if (effect.type === 'sparkle-burst') this._renderSparkleBurstEffect(ctx, effect);
            if (effect.type === 'echo-trail') this._renderEchoTrailEffect(ctx, effect);
            if (effect.type === 'glow-aura') this._renderGlowAuraEffect(ctx, effect);
            if (effect.type === 'focus-pulse') this._renderFocusPulseEffect(ctx, effect);
            if (effect.type === 'confetti-burst') this._renderConfettiBurstEffect(ctx, effect);
            if (effect.type === 'orbit-swarm') this._renderOrbitSwarmEffect(ctx, effect);
            if (effect.type === 'smoke-puff') this._renderSmokePuffEffect(ctx, effect);
            if (effect.type === 'lightning-arc') this._renderLightningArcEffect(ctx, effect);
            if (effect.type === 'magnet-pull') this._renderMagnetPullEffect(ctx, effect);
            if (effect.type === 'scan-beam') this._renderScanBeamEffect(ctx, effect);
            if (effect.type === 'lens-flare') this._renderLensFlareEffect(ctx, effect);
            if (effect.type === 'pixel-burst') this._renderPixelBurstEffect(ctx, effect);
            if (effect.type === 'impact-burst') this._renderImpactBurstEffect(ctx, effect);
            if (effect.type === 'wave-distort') this._renderWaveDistortEffect(ctx, effect);
            if (effect.type === 'liquid-motion') this._renderLiquidMotionEffect(ctx, effect);
            if (effect.type === 'melt-drip') this._renderMeltDripEffect(ctx, effect);
            if (effect.type === 'brush-reveal') this._renderBrushRevealEffect(ctx, effect);
            if (effect.type === 'paint-reveal') this._renderPaintRevealEffect(ctx, effect);
            if (effect.type === 'swirl-tornado') this._renderSwirlTornadoEffect(ctx, effect);
            if (effect.type === 'fire-flicker') this._renderFireFlickerEffect(ctx, effect);
            if (effect.type === 'dust-away') this._renderDustAwayEffect(ctx, effect);
            if (effect.type === 'freeze-crack') this._renderFreezeCrackEffect(ctx, effect);
            if (effect.type === 'neon-trace') this._renderNeonTraceEffect(ctx, effect);
            if (effect.type === 'shadow-pop') this._renderShadowPopEffect(ctx, effect);
            if (effect.type === 'explosion-smoke') this._renderExplosionSmokeEffect(ctx, effect);
            if (effect.type === 'paint-stroke') this._renderPaintStrokeEffect(ctx, effect);
            if (effect.type === 'chromatic-glitch') this._renderChromaticGlitchEffect(ctx, effect);
            if (effect.type === 'shockwave-ring') this._renderShockwaveRingEffect(ctx, effect);
            if (effect.type === 'magic-portal') this._renderMagicPortalEffect(ctx, effect);
            if (effect.type === 'glass-shatter') this._renderGlassShatterEffect(ctx, effect);
            if (effect.type === 'electric-charge') this._renderElectricChargeEffect(ctx, effect);
            if (effect.type === 'ink-bleed') this._renderInkBleedEffect(ctx, effect);
            if (effect.type === 'motion-smear') this._renderMotionSmearEffect(ctx, effect);
            if (effect.type === 'stage-shake') this._renderStageShakeEffect(ctx, effect);
            if (effect.type === 'mask-reveal') this._renderMaskRevealEffect(ctx, effect);
            if (effect.type === 'path-trail') this._renderPathTrailEffect(ctx, effect);
            if (effect.type === 'particle-fountain') this._renderParticleFountainEffect(ctx, effect);
            if (effect.type === 'light-sweep') this._renderLightSweepEffect(ctx, effect);
            if (effect.type === 'weather-effect') this._renderWeatherEffect(ctx, effect);
            if (effect.type === 'bubble-rise') this._renderBubbleRiseEffect(ctx, effect);
            if (effect.type === 'meteor-shower') this._renderMeteorShowerEffect(ctx, effect);
            if (effect.type === 'spotlight-sweep') this._renderSpotlightSweepEffect(ctx, effect);
            if (effect.type === 'radial-rays') this._renderRadialRaysEffect(ctx, effect);
            if (effect.type === 'outline-pulse') this._renderOutlinePulseEffect(ctx, effect);
            if (effect.type === 'speed-lines') this._renderSpeedLinesEffect(ctx, effect);
            if (effect.type === 'starfield-warp') this._renderStarfieldWarpEffect(ctx, effect);
            if (effect.type === 'color-wash') this._renderColorWashEffect(ctx, effect);
            if (effect.type === 'halo-burst') this._renderHaloBurstEffect(ctx, effect);
            if (effect.type === 'shadow-cast') this._renderShadowCastEffect(ctx, effect);
            if (effect.type === 'energy-shield') this._renderEnergyShieldEffect(ctx, effect);
            if (effect.type === 'magnify-lens') this._renderMagnifyLensEffect(ctx, effect);
            if (effect.type === 'rainbow-arc') this._renderRainbowArcEffect(ctx, effect);
            if (effect.type === 'vignette-pulse') this._renderVignettePulseEffect(ctx, effect);
            if (effect.type === 'scan-grid') this._renderScanGridEffect(ctx, effect);
            if (effect.type === 'draw-trace') this._renderDrawTraceEffect(ctx, effect);
            if (effect.type === 'card-turn') this._renderFake3DTurnEffect(ctx, effect, 'card');
            if (effect.type === 'page-turn') this._renderFake3DTurnEffect(ctx, effect, 'page');
            if (effect.type === 'flap-swing') this._renderFake3DTurnEffect(ctx, effect, 'flap');
            if (effect.type === 'counter-roll') this._renderCounterRollEffect(ctx, effect);
            if (effect.type === 'progress-bar') this._renderProgressBarEffect(ctx, effect);
            if (effect.type === 'bar-chart') this._renderBarChartEffect(ctx, effect);
            if (effect.type === 'iris-reveal') this._renderIrisRevealEffect(ctx, effect);
            if (effect.type === 'clock-wipe') this._renderClockWipeEffect(ctx, effect);
            if (effect.type === 'blinds-reveal') this._renderBlindsRevealEffect(ctx, effect);
            if (effect.type === 'checker-reveal') this._renderCheckerRevealEffect(ctx, effect);
            if (effect.type === 'diamond-wipe') this._renderDiamondWipeEffect(ctx, effect);
            if (effect.type === 'whip-pan') this._renderWhipPanEffect(ctx, effect);
            if (effect.type === 'rack-focus') this._renderRackFocusEffect(ctx, effect);
            if (effect.type === 'letterbox-bars') this._renderLetterboxBarsEffect(ctx, effect);
            if (effect.type === 'hue-cycle') this._renderHueCycleEffect(ctx, effect);
            if (effect.type === 'saturation-pulse') this._renderSaturationPulseEffect(ctx, effect);
            if (effect.type === 'invert-flash') this._renderInvertFlashEffect(ctx, effect);
            if (effect.type === 'duotone-shift') this._renderDuotoneShiftEffect(ctx, effect);
            if (effect.type === 'tint-wash') this._renderTintWashEffect(ctx, effect);
            if (effect.type === 'karaoke-highlight') this._renderKaraokeHighlightEffect(ctx, effect);
            if (effect.type === 'beat-pulse') this._renderBeatPulseEffect(ctx, effect);
            if (effect.type === 'waveform-bounce') this._renderWaveformBounceEffect(ctx, effect);
            if (effect.type === 'vu-meter') this._renderVuMeterEffect(ctx, effect);
            if (effect.type === 'old-film') this._renderOldFilmEffect(ctx, effect);
            if (effect.type === 'vhs-scanlines') this._renderVhsScanlinesEffect(ctx, effect);
            if (effect.type === 'film-grain') this._renderFilmGrainEffect(ctx, effect);
            if (effect.type === 'crt-bend') this._renderCrtBendEffect(ctx, effect);
            ctx.restore();
        });
    }

    _renderDrawTraceEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const overlayAlpha = this._getDrawTraceOverlayAlpha(progress);
        if (overlayAlpha <= 0) return;
        const source = effect.obj || cfg;
        if ((source.objectType || source.type) === 'text' || source.text) {
            this._renderDrawTraceTextEffect(ctx, source, cfg, progress, overlayAlpha);
            return;
        }
        if (((source.objectType || source.type) === 'icon' || source.iconPath) && source.iconPath && typeof Path2D !== 'undefined') {
            this._renderDrawTraceIconEffect(ctx, source, cfg, progress, overlayAlpha);
            return;
        }
        const segments = this._getDrawTraceSegments(effect.obj || cfg);
        if (!segments.length || progress <= 0) return;
        const total = segments.reduce((sum, seg) => sum + Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1), 0);
        if (total <= 0) return;
        const drawnLen = total * progress;
        const color = this._getDrawTraceColor(effect.obj || cfg, cfg);
        const lineWidth = Math.max(1, cfg.width || effect.obj?.strokeWidth || 4);
        // Glow: explicit param, default 0 = no glow.
        const glow = Math.max(0, Math.min(60, Number.isFinite(cfg.glow) ? cfg.glow : 0));
        // Tail fade: 0 = ink stays, 1 = full fade behind the pen.
        const tailFade = Math.max(0, Math.min(1, Number.isFinite(cfg.tailFade) ? cfg.tailFade : 0));
        const showPen = cfg.showPen !== false;
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
            // Per-segment fade so ink closer to the pen is brightest and the
            // oldest part fades according to tailFade.
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
                // Age of this segment, 0 = at pen tip, 1 = at start.
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
            // Single-path stroke (matches the old behaviour, just faster).
            let remaining = drawnLen;
            ctx.beginPath();
            for (const seg of segments) {
                if (remaining <= 0) break;
                const len = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
                if (len <= 0.001) continue;
                const drawLen = Math.min(len, remaining);
                const t = drawLen / len;
                ctx.moveTo(seg.x1, seg.y1);
                const x2 = seg.x1 + (seg.x2 - seg.x1) * t;
                const y2 = seg.y1 + (seg.y2 - seg.y1) * t;
                ctx.lineTo(x2, y2);
                remaining -= drawLen;
                penX = x2; penY = y2;
            }
            ctx.stroke();
        }
        // Visible pen tip at the leading edge — bright with dark halo for contrast.
        if (showPen && penX !== null && progress < 0.995) {
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

    _getDrawTraceOverlayAlpha(progress = 0) {
        // Trace ink stays opaque until the drawing is complete, then dissolves
        // quickly as the real object appears.
        if (progress < 0.995) return 1;
        if (progress >= 1) return 0;
        const t = (progress - 0.995) / 0.005;
        return 1 - (t * t * (3 - 2 * t));
    }

    _getDrawTraceObjectReveal(progress = 0) {
        // Object stays hidden while the edge draws, then appears only at the
        // final handoff as the trace line fades away.
        if (progress < 0.995) return 0;
        if (progress >= 1) return 1;
        const t = (progress - 0.995) / 0.005;
        return t * t * (3 - 2 * t);
    }

    _getDrawTraceColor(obj = {}, params = {}) {
        const usable = (value) => {
            if (!value || typeof value !== 'string') return '';
            const v = value.trim();
            if (!v || v === 'transparent' || v === 'none' || v === 'rgba(0,0,0,0)' || v === 'rgba(0, 0, 0, 0)') return '';
            return v;
        };
        if (params.drawUseCustom) return usable(params.drawColor) || usable(params.color) || '#38bdf8';
        return usable(params.color) || usable(obj.stroke) || usable(obj.textStrokeColor) || usable(obj.textColor) || usable(obj.fill) || usable(obj.color) || usable(params.drawColor) || '#38bdf8';
    }

    _renderDrawTraceTextEffect(ctx, obj = {}, cfg = {}, progress = 0, overlayAlpha = 1) {
        if (progress <= 0) return;
        const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
        const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
        const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
        const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
        const text = this._transformDrawTraceText(obj.text || cfg.text || '', obj.textTransform || cfg.textTransform);
        if (!text) return;
        const fontSize = Number(obj.fontSize || cfg.fontSize) || 24;
        const lineHeight = fontSize * (Number(obj.lineHeight || cfg.lineHeight) || 1.4);
        const lines = String(text).split('\n');
        const totalH = lines.length * lineHeight;
        let startY = y + 6;
        const alignY = obj.textVerticalAlign || cfg.textVerticalAlign || 'middle';
        if (alignY === 'middle') startY = y + Math.max(0, (h - totalH) / 2);
        else if (alignY === 'bottom') startY = y + Math.max(0, h - totalH - 6);
        let textX = x + w / 2;
        const align = obj.textAlign || cfg.textAlign || 'center';
        if (align === 'left') textX = x + 6;
        if (align === 'right') textX = x + w - 6;
        const color = this._getDrawTraceColor(obj, cfg);
        ctx.save();
        ctx.globalAlpha *= overlayAlpha;
        this._applyDrawTraceObjectTransform(ctx, x, y, w, h, Number.isFinite(obj.rotation) ? obj.rotation : cfg.rotation);
        ctx.beginPath();
        ctx.rect(x, y, w * progress, h);
        ctx.clip();
        ctx.font = `${obj.fontStyle === 'italic' || cfg.fontStyle === 'italic' ? 'italic ' : ''}${obj.fontWeight || cfg.fontWeight || 'normal'} ${fontSize}px ${obj.fontFamily || cfg.fontFamily || 'Arial'}`;
        ctx.textAlign = align;
        ctx.textBaseline = 'top';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.strokeStyle = color;
        ctx.fillStyle = obj.textColor || cfg.textColor || obj.fill || cfg.fill || color;
        ctx.lineWidth = Math.max(1, cfg.width || obj.textStrokeWidth || 2);
        ctx.shadowColor = color;
        ctx.shadowBlur = Math.max(0, Math.min(10, ctx.lineWidth * 1.2));
        lines.forEach((line, index) => {
            const ly = startY + index * lineHeight;
            ctx.strokeText(line, textX, ly, Math.max(1, w - 12));
            ctx.fillText(line, textX, ly, Math.max(1, w - 12));
        });
        ctx.restore();
    }

    _renderDrawTraceIconEffect(ctx, obj = {}, cfg = {}, progress = 0, overlayAlpha = 1) {
        if (progress <= 0 || !obj.iconPath) return;
        const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
        const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
        const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (cfg.w || 1));
        const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (cfg.h || 1));
        const color = this._getDrawTraceColor(obj, cfg);
        const vb = String(obj.iconViewBox || cfg.iconViewBox || '0 0 100 100').split(/\s+/).map(Number);
        const vbX = vb[0] || 0, vbY = vb[1] || 0, vbW = vb[2] || 100, vbH = vb[3] || 100;
        ctx.save();
        ctx.globalAlpha *= overlayAlpha;
        this._applyDrawTraceObjectTransform(ctx, x, y, w, h, Number.isFinite(obj.rotation) ? obj.rotation : cfg.rotation);
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
        String(obj.iconPath).split('|').forEach(path => {
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

    _applyDrawTraceObjectTransform(ctx, x, y, w, h, rotation = 0) {
        const angle = ((rotation || 0) * Math.PI) / 180;
        if (!angle) return;
        const cx = x + w / 2, cy = y + h / 2;
        ctx.translate(cx, cy);
        ctx.rotate(angle);
        ctx.translate(-cx, -cy);
    }

    _transformDrawTraceText(value, transform = 'none') {
        const text = String(value || '');
        if (transform === 'uppercase') return text.toUpperCase();
        if (transform === 'lowercase') return text.toLowerCase();
        if (transform === 'title') return text.replace(/\b([A-Za-z][A-Za-z'’-]*)\b/g, word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase());
        return text;
    }

    _getDrawTraceSegments(obj = {}) {
        const x = Number.isFinite(obj.x) ? obj.x : 0;
        const y = Number.isFinite(obj.y) ? obj.y : 0;
        const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (obj.w || 1));
        const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (obj.h || 1));
        const type = obj.objectType || obj.type || 'rectangle';
        // For closed shapes we can rotate the points so drawing starts on a
        // specific edge and walks clockwise/counter-clockwise.
        const reorder = (pts) => this._reorderDrawTracePointsForStart(pts, x, y, w, h, obj);
        let points = [];
        if (type === 'image') {
            const alphaSegments = this._getDrawTraceAlphaSegments(obj);
            if (alphaSegments.length) return alphaSegments;
        }
        if (Array.isArray(obj.pathPoints) && obj.pathPoints.length >= 2) {
            points = obj.pathPoints.map(p => ({ x: p.x, y: p.y }));
            return this._pointsToDrawTraceSegments(points, false);
        }
        if (type === 'circle' || type === 'ellipse') {
            const cx = x + w / 2, cy = y + h / 2;
            const steps = 72;
            for (let i = 0; i <= steps; i++) {
                const a = -Math.PI / 2 + (Math.PI * 2 * i) / steps;
                points.push({ x: cx + Math.cos(a) * w / 2, y: cy + Math.sin(a) * h / 2 });
            }
            return this._pointsToDrawTraceSegments(reorder(this._rotateDrawTracePoints(points, obj)), false);
        }
        if (type === 'triangle') {
            points = [{ x: x + w / 2, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x: x + w / 2, y }];
            return this._pointsToDrawTraceSegments(reorder(this._rotateDrawTracePoints(points, obj)), false);
        }
        if (type === 'star') {
            const cx = x + w / 2, cy = y + h / 2;
            const outer = Math.min(w, h) / 2;
            const inner = outer * 0.48;
            for (let i = 0; i <= 10; i++) {
                const r = i % 2 === 0 ? outer : inner;
                const a = -Math.PI / 2 + i * Math.PI / 5;
                points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
            }
            return this._pointsToDrawTraceSegments(reorder(this._rotateDrawTracePoints(points, obj)), false);
        }
        if (type === 'polygon') {
            const cx = x + w / 2, cy = y + h / 2;
            const sides = Math.max(3, Math.min(16, parseInt(obj.sides, 10) || 5));
            const r = Math.min(w, h) / 2;
            for (let i = 0; i <= sides; i++) {
                const a = -Math.PI / 2 + (Math.PI * 2 * i) / sides;
                points.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
            }
            return this._pointsToDrawTraceSegments(reorder(this._rotateDrawTracePoints(points, obj)), false);
        }
        points = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
        return this._pointsToDrawTraceSegments(reorder(this._rotateDrawTracePoints(points, obj)), false);
    }

    _reorderDrawTracePointsForStart(points, x, y, w, h, obj = {}) {
        if (!Array.isArray(points) || points.length < 3) return points;
        const start = (obj.start || obj.drawStart || 'top').toLowerCase();
        const clockwise = obj.clockwise !== false && obj.drawClockwise !== false;
        const closed = Math.hypot(
            points[0].x - points[points.length - 1].x,
            points[0].y - points[points.length - 1].y
        ) < 0.5;
        // Work with an open polyline so we can rotate & reverse cleanly.
        const open = closed ? points.slice(0, -1) : points.slice();
        const cx = x + w / 2, cy = y + h / 2;
        // Anchor coordinate for the requested start edge.
        const anchors = {
            'top':          { x: cx,         y: y },
            'top-right':    { x: x + w,      y: y },
            'right':        { x: x + w,      y: cy },
            'bottom-right': { x: x + w,      y: y + h },
            'bottom':       { x: cx,         y: y + h },
            'bottom-left':  { x: x,          y: y + h },
            'left':         { x: x,          y: cy },
            'top-left':     { x: x,          y: y }
        };
        const target = anchors[start] || anchors.top;
        // Find the polyline vertex closest to the anchor.
        let bestIdx = 0;
        let bestDist = Infinity;
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

    _getDrawTraceAlphaSegments(obj = {}) {
        const img = obj._imgEl || obj.imageElement || null;
        if (!img || !img.complete) return [];
        const naturalW = img.naturalWidth || img.videoWidth || img.width || 0;
        const naturalH = img.naturalHeight || img.videoHeight || img.height || 0;
        if (!naturalW || !naturalH) return [];
        const x = Number.isFinite(obj.x) ? obj.x : 0;
        const y = Number.isFinite(obj.y) ? obj.y : 0;
        const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (obj.w || 1));
        const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (obj.h || 1));
        const key = [img.currentSrc || img.src || obj.imageSrc || '', naturalW, naturalH, Math.round(w), Math.round(h), obj.rotation || 0].join('|');
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
            const rotated = this._rotateDrawTraceSegments(mapped, obj);
            obj._drawTraceAlphaKey = key;
            obj._drawTraceAlphaSegments = rotated;
            return rotated;
        } catch (err) {
            obj._drawTraceAlphaKey = key;
            obj._drawTraceAlphaSegments = [];
            return [];
        }
    }

    _rotateDrawTraceSegments(segments, obj = {}) {
        const angle = ((obj.rotation || 0) * Math.PI) / 180;
        if (!angle) return segments;
        const x = Number.isFinite(obj.x) ? obj.x : 0;
        const y = Number.isFinite(obj.y) ? obj.y : 0;
        const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (obj.w || 1));
        const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (obj.h || 1));
        const cx = x + w / 2, cy = y + h / 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        const rot = (px, py) => {
            const dx = px - cx, dy = py - cy;
            return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
        };
        return segments.map(seg => {
            const a = rot(seg.x1, seg.y1), b = rot(seg.x2, seg.y2);
            return { x1: a.x, y1: a.y, x2: b.x, y2: b.y };
        });
    }

    _rotateDrawTracePoints(points, obj = {}) {
        const angle = ((obj.rotation || 0) * Math.PI) / 180;
        if (!angle) return points;
        const x = Number.isFinite(obj.x) ? obj.x : 0;
        const y = Number.isFinite(obj.y) ? obj.y : 0;
        const w = Math.max(1, Number.isFinite(obj.width) ? obj.width : (obj.w || 1));
        const h = Math.max(1, Number.isFinite(obj.height) ? obj.height : (obj.h || 1));
        const cx = x + w / 2, cy = y + h / 2;
        const cos = Math.cos(angle), sin = Math.sin(angle);
        return points.map(p => {
            const dx = p.x - cx, dy = p.y - cy;
            return { x: cx + dx * cos - dy * sin, y: cy + dx * sin + dy * cos };
        });
    }

    _pointsToDrawTraceSegments(points, closePath = false) {
        const segments = [];
        for (let i = 0; i < points.length - 1; i++) {
            segments.push({ x1: points[i].x, y1: points[i].y, x2: points[i + 1].x, y2: points[i + 1].y });
        }
        if (closePath && points.length > 2) {
            const a = points[points.length - 1], b = points[0];
            segments.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y });
        }
        return segments;
    }

    _renderFreezeCrackEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 1);
        const h = Math.max(1, cfg.h || effect.obj?.height || 1);
        const cracks = Math.max(0, Math.min(80, cfg.cracks || 9));
        const seed = cfg.seed || 1;
        ctx.save();
        ctx.globalAlpha = (cfg.opacity ?? 0.55) * progress;
        ctx.fillStyle = cfg.tint || '#93c5fd';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(255,255,255,.88)';
        ctx.lineCap = 'round';
        ctx.shadowColor = '#bfdbfe';
        ctx.shadowBlur = 6;
        for (let i = 0; i < cracks; i++) {
            const rndA = this._seededRandom(seed + i * 97);
            const rndB = this._seededRandom(seed + i * 163);
            const sx = x + rndA * w;
            const sy = y + rndB * h;
            const len = Math.min(w, h) * (0.15 + this._seededRandom(seed + i * 211) * 0.36) * progress;
            const branches = 2 + Math.floor(this._seededRandom(seed + i * 269) * 3);
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

    _renderNeonTraceEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 1);
        const h = Math.max(1, cfg.h || effect.obj?.height || 1);
        const perimeter = 2 * (w + h);
        const drawLen = perimeter * progress;
        const points = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }];
        ctx.save();
        ctx.strokeStyle = cfg.color || '#22d3ee';
        ctx.lineWidth = Math.max(1, cfg.width || 5);
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = Math.max(0, cfg.glow || 18);
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

    _traceFaceSetPlayback(obj, anim, property, snapshot = {}) {
        const enabled = !!(
            window.__FACE_SET_DEBUG_TRACKING__ ||
            window.localStorage?.getItem('faceSetDebugTracking') === '1' ||
            window.location?.search?.includes('faceSetDebug=1')
        );
        if (!enabled || !obj || !anim || !property) return;

        const key = `${obj.id}:${anim.id}:${property}`;
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        if (!this._faceSetTraceLast) this._faceSetTraceLast = {};
        if (now - (this._faceSetTraceLast[key] || 0) < 100) return;
        this._faceSetTraceLast[key] = now;

        const record = {
            time: Math.round(snapshot.time ?? this.currentTime ?? 0),
            objectId: obj.id,
            objectName: obj.name || obj.type,
            groupId: obj.groupId || null,
            faceRole: obj.faceSet?.role || null,
            facialKey: obj._facialFeatureKey || null,
            parentHead: obj._facialParentHead || null,
            animationId: anim.id,
            animationType: anim.type,
            property,
            from: snapshot.fromVal,
            to: snapshot.toVal,
            value: snapshot.value,
            progress: snapshot.progress,
            x: obj.x,
            y: obj.y,
            width: obj.width,
            height: obj.height,
            rotation: obj.rotation,
            scaleX: obj.scaleX,
            scaleY: obj.scaleY
        };

        if (!this._faceSetTraceBuffer) this._faceSetTraceBuffer = [];
        this._faceSetTraceBuffer.push(record);
        if (this._faceSetTraceBuffer.length > 200) this._faceSetTraceBuffer.shift();
    }

    getFaceSetTraceBuffer() {
        return Array.isArray(this._faceSetTraceBuffer) ? [...this._faceSetTraceBuffer] : [];
    }

    dumpFaceSetTrace(limit = 50) {
        const rows = this.getFaceSetTraceBuffer().slice(-Math.max(1, limit));
        return rows;
    }

    clearFaceSetTraceBuffer() {
        this._faceSetTraceBuffer = [];
        this._faceSetTraceLast = {};
    }

    _renderShadowPopEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const offset = Math.max(0, cfg.offset || 26) * progress;
        const savedOpacity = obj.opacity;
        ctx.save();
        ctx.globalAlpha = Math.max(0, 0.5 * (1 - progress * 0.12));
        ctx.shadowColor = cfg.color || '#0f172a';
        ctx.shadowBlur = Math.max(0, cfg.blur || 18);
        ctx.translate(offset, offset);
        obj.opacity = 0.42;
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _effectColorToRgba(color, alpha = 1) {
        const rgb = this._hexToRgb(color);
        if (!rgb) return color || `rgba(249,115,22,${alpha})`;
        return `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`;
    }

    _renderExplosionSmokeEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(240, cfg.count || 24));
        const radius = Math.max(1, cfg.radius || 180);
        const size = Math.max(1, cfg.size || 34);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const seed = cfg.seed || 1;
        ctx.save();
        ctx.fillStyle = cfg.color || '#64748b';
        for (let i = 0; i < count; i++) {
            const rnd = this._seededRandom(seed + i * 131);
            const rndB = this._seededRandom(seed + i * 197);
            const angle = rnd * Math.PI * 2;
            const travel = radius * progress * (0.25 + rndB * 0.9);
            const x = originX + Math.cos(angle) * travel;
            const y = originY + Math.sin(angle) * travel * 0.82 - progress * radius * 0.15;
            const puff = size * (0.35 + rnd * 0.9) * (0.45 + progress);
            ctx.globalAlpha = Math.max(0, 0.42 * (1 - progress) + 0.08);
            ctx.beginPath();
            ctx.arc(x, y, puff, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = Math.max(0, 0.85 * (1 - progress));
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(originX, originY, Math.max(8, size * 0.5) * (1 + progress), 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderPaintStrokeEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const length = Math.max(1, cfg.length || 220);
        const width = Math.max(1, cfg.width || 18);
        const seed = cfg.seed || 1;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#ec4899';
        ctx.fillStyle = ctx.strokeStyle;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = width * 0.35;
        ctx.beginPath();
        const startX = originX - length * 0.45;
        const endX = startX + length * progress;
        ctx.moveTo(startX, originY + width * 0.4);
        ctx.bezierCurveTo(originX - length * 0.18, originY - width * 2, originX + length * 0.2, originY + width * 2, endX, originY - width * 0.5);
        ctx.stroke();
        const splatter = Math.max(0, Math.min(240, cfg.splatter || 18));
        for (let i = 0; i < splatter * progress; i++) {
            const rnd = this._seededRandom(seed + i * 83);
            const rndB = this._seededRandom(seed + i * 149);
            const x = startX + length * rnd * progress;
            const y = originY + (rndB - 0.5) * width * 5;
            ctx.globalAlpha = 0.35 + rnd * 0.4;
            ctx.beginPath();
            ctx.arc(x, y, Math.max(1, width * (0.08 + rndB * 0.12)), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderChromaticGlitchEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const intensity = Math.max(1, cfg.intensity || 18) * Math.sin(progress * Math.PI);
        const slices = Math.max(1, Math.min(120, cfg.slices || 12));
        const shift = Math.max(0, cfg.colorShift || 10) * Math.sin(progress * Math.PI);
        const seed = cfg.seed || 1;
        const savedOpacity = obj.opacity;
        obj.opacity = savedOpacity || 1;
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.translate(-shift, 0);
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        ctx.save();
        ctx.globalAlpha = 0.72;
        ctx.translate(shift, 0);
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        for (let i = 0; i < slices; i++) {
            const rnd = this._seededRandom(seed + i * 113);
            const y = (obj.y || 0) + ((obj.height || 1) / slices) * i;
            const h = Math.max(2, (obj.height || 1) / slices);
            const dx = (rnd - 0.5) * intensity * 2;
            ctx.save();
            ctx.beginPath();
            ctx.rect((obj.x || 0) - Math.abs(dx) - 8, y, (obj.width || 1) + Math.abs(dx) * 2 + 16, h);
            ctx.clip();
            ctx.translate(dx, 0);
            obj.render(ctx, { quality: 'editor' });
            ctx.restore();
        }
        obj.opacity = savedOpacity;
    }

    _renderShockwaveRingEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const rings = Math.max(1, cfg.rings || 3);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#38bdf8';
        ctx.lineWidth = 4;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 14;
        for (let i = 0; i < rings; i++) {
            const t = Math.max(0, Math.min(1, progress - i * 0.12));
            if (t <= 0) continue;
            ctx.globalAlpha = Math.max(0, 0.85 * (1 - t));
            ctx.beginPath();
            ctx.arc(originX, originY, Math.max(1, (cfg.radius || 220) * t), 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderMagicPortalEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const radius = Math.max(1, cfg.radius || 90) * (0.55 + progress * 0.45);
        const spokes = Math.max(3, cfg.spokes || 18);
        ctx.save();
        ctx.strokeStyle = cfg.color || '#8b5cf6';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 20;
        ctx.lineWidth = 3;
        for (let r = 0; r < 3; r++) {
            ctx.globalAlpha = Math.max(0, 0.75 - r * 0.18);
            ctx.beginPath();
            ctx.ellipse(originX, originY, radius * (1 + r * 0.14), radius * (0.36 + r * 0.04), progress * Math.PI * 2 + r, 0, Math.PI * 2);
            ctx.stroke();
        }
        for (let i = 0; i < spokes; i++) {
            const a = (i / spokes) * Math.PI * 2 + progress * Math.PI * 3;
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(originX + Math.cos(a) * radius * 0.35, originY + Math.sin(a) * radius * 0.18);
            ctx.lineTo(originX + Math.cos(a) * radius, originY + Math.sin(a) * radius * 0.42);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderGlassShatterEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const pieces = Math.max(3, Math.min(160, cfg.pieces || 24));
        const seed = cfg.seed || 1;
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (cfg.x || 0) + (cfg.w || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (cfg.y || 0) + (cfg.h || 0) / 2;
        ctx.save();
        ctx.fillStyle = cfg.color || '#bfdbfe';
        ctx.strokeStyle = 'rgba(255,255,255,.8)';
        for (let i = 0; i < pieces; i++) {
            const rnd = this._seededRandom(seed + i * 71);
            const rndB = this._seededRandom(seed + i * 137);
            const a = rnd * Math.PI * 2;
            const dist = (cfg.spread || 180) * progress * (0.2 + rndB);
            const x = originX + Math.cos(a) * dist;
            const y = originY + Math.sin(a) * dist;
            const size = 5 + rnd * 16;
            ctx.save();
            ctx.globalAlpha = Math.max(0, 0.8 * (1 - progress * 0.75));
            ctx.translate(x, y);
            ctx.rotate(a + progress * 4);
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

    _renderElectricChargeEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const bolts = Math.max(1, cfg.bolts || 10);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const seed = cfg.seed || 1;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#60a5fa';
        ctx.lineWidth = 2.5;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 16;
        ctx.globalAlpha = 0.35 + Math.sin(progress * Math.PI) * 0.55;
        for (let i = 0; i < bolts; i++) {
            const a = (i / bolts) * Math.PI * 2 + progress * 3 + this._seededRandom(seed + i) * 0.7;
            const len = (cfg.radius || 120) * (0.45 + this._seededRandom(seed + i * 9) * 0.55);
            ctx.beginPath();
            ctx.moveTo(originX, originY);
            for (let s = 1; s <= 4; s++) {
                const t = s / 4;
                const jitter = (this._seededRandom(seed + i * 41 + s) - 0.5) * 22;
                ctx.lineTo(originX + Math.cos(a) * len * t + Math.cos(a + Math.PI / 2) * jitter, originY + Math.sin(a) * len * t + Math.sin(a + Math.PI / 2) * jitter);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderInkBleedEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const drops = Math.max(1, Math.min(240, cfg.drops || 28));
        const seed = cfg.seed || 1;
        ctx.save();
        ctx.fillStyle = cfg.color || '#111827';
        for (let i = 0; i < drops; i++) {
            const rnd = this._seededRandom(seed + i * 67);
            const rndB = this._seededRandom(seed + i * 127);
            const a = rnd * Math.PI * 2;
            const dist = (cfg.spread || 120) * progress * rndB;
            ctx.globalAlpha = 0.08 + (1 - progress * 0.35) * 0.42;
            ctx.beginPath();
            ctx.arc(originX + Math.cos(a) * dist, originY + Math.sin(a) * dist, (6 + rnd * 24) * progress, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderMotionSmearEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const copies = Math.max(1, Math.min(40, cfg.copies || 6));
        const angle = this._directionToAngle(cfg.direction || 'right');
        const dist = Math.max(1, cfg.distance || 90) * Math.sin(progress * Math.PI);
        const savedOpacity = obj.opacity;
        for (let i = copies; i >= 1; i--) {
            const t = i / copies;
            ctx.save();
            ctx.globalAlpha = 0.12 * (1 - t) + 0.08;
            ctx.translate(-Math.cos(angle) * dist * t, -Math.sin(angle) * dist * t);
            obj.opacity = savedOpacity;
            obj.render(ctx, { quality: 'editor' });
            ctx.restore();
        }
        obj.opacity = savedOpacity;
    }

    _renderStageShakeEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const amount = Math.max(1, cfg.amount || 16) * (1 - progress);
        const freq = Math.max(1, cfg.frequency || 18);
        const dx = Math.sin(progress * freq * Math.PI * 2) * amount;
        const dy = Math.cos(progress * freq * Math.PI * 1.7) * amount;
        const savedOpacity = obj.opacity;
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.translate(dx, dy);
        obj.opacity = savedOpacity;
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _renderMaskRevealEffect(ctx, effect) {
        const cfg = effect.config || {}, obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : obj.x;
        const y = Number.isFinite(cfg.y) ? cfg.y : obj.y;
        const w = Math.max(1, cfg.w || obj.width || 1);
        const h = Math.max(1, cfg.h || obj.height || 1);
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : x + w / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : y + h / 2;
        const savedOpacity = obj.opacity;
        obj.opacity = 1;
        ctx.save();
        ctx.beginPath();
        if (cfg.shape === 'rectangle') {
            const rw = w * p, rh = h * p;
            ctx.rect(ox - rw / 2, oy - rh / 2, rw, rh);
        } else if (cfg.shape === 'wipe') {
            ctx.rect(x, y, w * p, h);
        } else {
            ctx.arc(ox, oy, Math.hypot(w, h) * p, 0, Math.PI * 2);
        }
        ctx.clip();
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        if (cfg.feather > 0) {
            ctx.save();
            ctx.globalAlpha = Math.max(0, 0.25 * (1 - p));
            ctx.strokeStyle = 'rgba(255,255,255,.55)';
            ctx.lineWidth = cfg.feather;
            ctx.beginPath();
            ctx.arc(ox, oy, Math.hypot(w, h) * p, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }
        obj.opacity = savedOpacity;
    }

    _renderPathTrailEffect(ctx, effect) {
        const cfg = effect.config || {}, obj = effect.obj || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const cx = (obj.x || 0) + (obj.width || 0) / 2;
        const cy = (obj.y || 0) + (obj.height || 0) / 2;
        const angle = this._directionToAngle(cfg.direction || 'right') + Math.PI;
        const len = Math.max(1, cfg.length || 120) * p;
        const width = Math.max(1, cfg.width || 16);
        const grad = ctx.createLinearGradient(cx, cy, cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        grad.addColorStop(0, this._effectColorToRgba(cfg.color || '#38bdf8', 0.75));
        grad.addColorStop(1, this._effectColorToRgba(cfg.color || '#38bdf8', 0));
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

    _renderParticleFountainEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(400, cfg.count || 42));
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0);
        ctx.save();
        ctx.fillStyle = cfg.color || '#facc15';
        for (let i = 0; i < count; i++) {
            const r1 = this._seededRandom((cfg.seed || 1) + i * 37);
            const r2 = this._seededRandom((cfg.seed || 1) + i * 97);
            const t = Math.max(0, Math.min(1, (p + r1 * 0.55) % 1));
            const a = -Math.PI / 2 + (r1 - 0.5) * 1.45;
            const d = (cfg.spread || 150) * t;
            ctx.globalAlpha = Math.max(0, 1 - t);
            ctx.beginPath();
            ctx.arc(ox + Math.cos(a) * d, oy + Math.sin(a) * d + d * d / Math.max(1, cfg.spread || 150) * 0.6, 2 + r2 * 5, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    }

    _renderLightSweepEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = cfg.x || effect.obj?.x || 0, y = cfg.y || effect.obj?.y || 0;
        const w = Math.max(1, cfg.w || effect.obj?.width || 1), h = Math.max(1, cfg.h || effect.obj?.height || 1);
        const sweepX = x - w + (w * 3) * p;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        ctx.translate(sweepX, y + h / 2);
        ctx.rotate(cfg.angle || 0);
        const grad = ctx.createLinearGradient(-cfg.width, 0, cfg.width, 0);
        grad.addColorStop(0, this._effectColorToRgba(cfg.color || '#fff', 0));
        grad.addColorStop(0.5, this._effectColorToRgba(cfg.color || '#fff', 0.75));
        grad.addColorStop(1, this._effectColorToRgba(cfg.color || '#fff', 0));
        ctx.fillStyle = grad;
        ctx.fillRect(-Math.max(1, cfg.width || 70), -h, Math.max(1, cfg.width || 70) * 2, h * 2);
        ctx.restore();
    }

    _renderWeatherEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(600, cfg.count || 80));
        const w = cfg.stageW || this.stage?.width || 1280;
        const h = cfg.stageH || this.stage?.height || 720;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#bfdbfe';
        ctx.fillStyle = cfg.color || '#bfdbfe';
        for (let i = 0; i < count; i++) {
            const r1 = this._seededRandom((cfg.seed || 1) + i * 31);
            const r2 = this._seededRandom((cfg.seed || 1) + i * 79);
            const y = ((r2 + p) % 1) * h;
            const x = (r1 * w + (cfg.wind || 0) * p) % w;
            ctx.globalAlpha = cfg.weather === 'fog' ? 0.08 : 0.5 + r2 * 0.35;
            if (cfg.weather === 'snow') {
                ctx.beginPath();
                ctx.arc(x, y, 1.5 + r2 * 3, 0, Math.PI * 2);
                ctx.fill();
            } else if (cfg.weather === 'fog') {
                ctx.fillRect(x - 80, y, 160, 18 + r2 * 24);
            } else {
                ctx.lineWidth = 1 + r2 * 1.4;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x + (cfg.wind || 0) * 0.08, y + 18 + r2 * 22);
                ctx.stroke();
            }
        }
        ctx.restore();
    }

    _renderBubbleRiseEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(300, cfg.count || 34));
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0);
        const spread = Math.max(1, cfg.spread || 120);
        const size = Math.max(1, cfg.size || 18);
        ctx.save();
        ctx.strokeStyle = cfg.color || '#7dd3fc';
        ctx.fillStyle = this._effectColorToRgba(cfg.color || '#7dd3fc', 0.1);
        ctx.lineWidth = 1.5;
        for (let i = 0; i < count; i++) {
            const r1 = this._seededRandom((cfg.seed || 1) + i * 53);
            const r2 = this._seededRandom((cfg.seed || 1) + i * 107);
            const t = (p + r1 * 0.8) % 1;
            const x = ox + (r1 - 0.5) * spread + Math.sin(t * Math.PI * 2 + i) * spread * 0.08;
            const y = oy - t * spread * (1.2 + r2);
            const radius = size * (0.35 + r2 * 0.8) * (0.7 + t * 0.35);
            ctx.globalAlpha = Math.max(0, 0.75 * (1 - t));
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderMeteorShowerEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(200, cfg.count || 18));
        const w = cfg.stageW || this.stage?.width || 1280;
        const h = cfg.stageH || this.stage?.height || 720;
        const angle = Number.isFinite(cfg.angle) ? cfg.angle : Math.PI / 6;
        const length = Math.max(1, cfg.length || 130);
        const dx = Math.cos(angle) * length;
        const dy = Math.sin(angle) * length;
        ctx.save();
        ctx.lineCap = 'round';
        ctx.strokeStyle = cfg.color || '#fde68a';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        for (let i = 0; i < count; i++) {
            const r1 = this._seededRandom((cfg.seed || 1) + i * 47);
            const r2 = this._seededRandom((cfg.seed || 1) + i * 89);
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

    _renderSpotlightSweepEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 1);
        const h = Math.max(1, cfg.h || effect.obj?.height || 1);
        const stageW = cfg.stageW || this.stage?.width || 1280;
        const stageH = cfg.stageH || this.stage?.height || 720;
        const radius = Math.max(1, cfg.radius || 180);
        const sx = x - radius + (w + radius * 2) * p;
        const sy = y + h / 2;
        ctx.save();
        ctx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, cfg.dim ?? 0.28))})`;
        ctx.fillRect(0, 0, stageW, stageH);
        const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, radius);
        grad.addColorStop(0, this._effectColorToRgba(cfg.color || '#fde68a', 0.62));
        grad.addColorStop(0.58, this._effectColorToRgba(cfg.color || '#fde68a', 0.18));
        grad.addColorStop(1, this._effectColorToRgba(cfg.color || '#fde68a', 0));
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sx, sy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }

    _renderRadialRaysEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(160, cfg.count || 18));
        const len = Math.max(1, cfg.length || 220) * p;
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#facc15';
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

    _renderOutlinePulseEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 1);
        const h = Math.max(1, cfg.h || effect.obj?.height || 1);
        const rings = Math.max(1, Math.min(12, cfg.rings || 3));
        ctx.save();
        ctx.strokeStyle = cfg.color || '#38bdf8';
        ctx.lineWidth = Math.max(1, cfg.width || 4);
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

    _renderSpeedLinesEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(300, cfg.count || 36));
        const stageW = cfg.stageW || this.stage?.width || 1280;
        const stageH = cfg.stageH || this.stage?.height || 720;
        const angle = this._directionToAngle(cfg.direction || 'right') + Math.PI;
        const len = Math.max(1, cfg.length || 160);
        ctx.save();
        ctx.strokeStyle = cfg.color || '#fff';
        ctx.lineCap = 'round';
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 8;
        for (let i = 0; i < count; i++) {
            const r1 = this._seededRandom((cfg.seed || 1) + i * 43);
            const r2 = this._seededRandom((cfg.seed || 1) + i * 101);
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

    _renderStarfieldWarpEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(600, cfg.count || 90));
        const spread = Math.max(1, cfg.spread || 520);
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#dbeafe';
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
            const r1 = this._seededRandom((cfg.seed || 1) + i * 59);
            const r2 = this._seededRandom((cfg.seed || 1) + i * 137);
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

    _renderColorWashEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const stageW = cfg.stageW || this.stage?.width || 1280;
        const stageH = cfg.stageH || this.stage?.height || 720;
        const alpha = Math.max(0, Math.min(1, cfg.opacity ?? 0.35));
        const dir = cfg.direction || 'right';
        const grad = (dir === 'up' || dir === 'down')
            ? ctx.createLinearGradient(0, dir === 'up' ? stageH : 0, 0, dir === 'up' ? 0 : stageH)
            : ctx.createLinearGradient(dir === 'left' ? stageW : 0, 0, dir === 'left' ? 0 : stageW, 0);
        grad.addColorStop(0, this._effectColorToRgba(cfg.color || '#38bdf8', 0));
        grad.addColorStop(Math.max(0, p - 0.22), this._effectColorToRgba(cfg.color || '#38bdf8', 0));
        grad.addColorStop(Math.min(1, p), this._effectColorToRgba(cfg.color || '#38bdf8', alpha));
        grad.addColorStop(Math.min(1, p + 0.28), this._effectColorToRgba(cfg.color || '#38bdf8', 0));
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, stageW, stageH);
        ctx.restore();
    }

    _renderHaloBurstEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const rings = Math.max(1, Math.min(16, cfg.rings || 4));
        const radius = Math.max(1, cfg.radius || 190);
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#facc15';
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

    _renderShadowCastEffect(ctx, effect) {
        const cfg = effect.config || {}, obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const p = Math.max(0, Math.min(1, effect.progress));
        const savedOpacity = obj.opacity;
        const dist = Math.max(1, cfg.length || 90) * Math.sin(p * Math.PI);
        const angle = Number.isFinite(cfg.angle) ? cfg.angle : Math.PI / 5;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, cfg.opacity ?? 0.35)) * (0.35 + Math.sin(p * Math.PI) * 0.65);
        ctx.translate(Math.cos(angle) * dist, Math.sin(angle) * dist);
        ctx.shadowColor = cfg.color || '#020617';
        ctx.shadowBlur = 22;
        obj.opacity = 0.5;
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _renderEnergyShieldEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const radius = Math.max(1, cfg.radius || 95) * (0.78 + Math.sin(p * Math.PI) * 0.22);
        const bands = Math.max(1, Math.min(18, cfg.bands || 4));
        ctx.save();
        ctx.strokeStyle = cfg.color || '#22d3ee';
        ctx.fillStyle = this._effectColorToRgba(cfg.color || '#22d3ee', 0.08);
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 18;
        ctx.globalAlpha = 0.45 + Math.sin(p * Math.PI) * 0.45;
        ctx.beginPath();
        ctx.ellipse(ox, oy, radius, radius * 0.72, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 2.4;
        ctx.stroke();
        for (let i = 0; i < bands; i++) {
            const a = p * Math.PI * 2 + (i / bands) * Math.PI;
            ctx.globalAlpha = 0.32 + 0.28 * Math.sin(p * Math.PI);
            ctx.beginPath();
            ctx.ellipse(ox, oy, radius * (0.9 - i * 0.035), radius * (0.22 + i * 0.07), a, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderMagnifyLensEffect(ctx, effect) {
        const cfg = effect.config || {}, obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const p = Math.max(0, Math.min(1, effect.progress));
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x || 0) + (obj.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y || 0) + (obj.height || 0) / 2;
        const radius = Math.max(1, cfg.radius || 90) * (0.85 + Math.sin(p * Math.PI) * 0.15);
        const zoom = Math.max(1, cfg.zoom || 1.35);
        const savedOpacity = obj.opacity;
        ctx.save();
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.clip();
        ctx.translate(ox, oy);
        ctx.scale(zoom, zoom);
        ctx.translate(-ox, -oy);
        obj.opacity = 1;
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        obj.opacity = savedOpacity;
        ctx.save();
        ctx.strokeStyle = cfg.color || '#bfdbfe';
        ctx.fillStyle = this._effectColorToRgba(cfg.color || '#bfdbfe', 0.08);
        ctx.lineWidth = 3;
        ctx.shadowColor = ctx.strokeStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(ox, oy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
    }

    _renderRainbowArcEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const ox = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const oy = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const colors = ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6', '#ec4899'];
        const bands = Math.max(2, Math.min(colors.length, cfg.bands || 6));
        const radius = Math.max(1, cfg.radius || 180);
        const width = Math.max(1, cfg.width || 10);
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

    _renderVignettePulseEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const w = cfg.stageW || this.stage?.width || 1280;
        const h = cfg.stageH || this.stage?.height || 720;
        const strength = Math.max(0, Math.min(1, cfg.strength ?? 0.55)) * Math.sin(p * Math.PI);
        const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.18, w / 2, h / 2, Math.hypot(w, h) * 0.55);
        grad.addColorStop(0, this._effectColorToRgba(cfg.color || '#020617', 0));
        grad.addColorStop(1, this._effectColorToRgba(cfg.color || '#020617', strength));
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    _renderCounterRollEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const from = Number.isFinite(cfg.from) ? cfg.from : 0;
        const to = Number.isFinite(cfg.to) ? cfg.to : 100;
        const decimals = Math.max(0, Math.min(4, cfg.decimals ?? 0));
        const value = from + (to - from) * p;
        const text = `${cfg.prefix || ''}${value.toFixed(decimals)}${cfg.suffix || ''}`;
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 200);
        const h = Math.max(1, cfg.h || effect.obj?.height || 64);
        const fontSize = Math.max(10, cfg.fontSize || 48);
        ctx.save();
        ctx.font = `700 ${fontSize}px ${cfg.fontFamily || 'Inter, system-ui, sans-serif'}`;
        ctx.fillStyle = cfg.color || '#0f172a';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);
        ctx.restore();
    }

    _renderProgressBarEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 240);
        const h = Math.max(1, cfg.h || 24);
        const r = Math.max(0, Math.min(h / 2, cfg.radius || h * 0.4));
        const roundRect = (rx, ry, rw, rh, rad) => {
            const cr = Math.min(rad, rw / 2, rh / 2);
            ctx.beginPath();
            ctx.moveTo(rx + cr, ry);
            ctx.arcTo(rx + rw, ry, rx + rw, ry + rh, cr);
            ctx.arcTo(rx + rw, ry + rh, rx, ry + rh, cr);
            ctx.arcTo(rx, ry + rh, rx, ry, cr);
            ctx.arcTo(rx, ry, rx + rw, ry, cr);
            ctx.closePath();
        };
        ctx.save();
        ctx.fillStyle = cfg.bgColor || 'rgba(15,23,42,0.18)';
        roundRect(x, y, w, h, r);
        ctx.fill();
        ctx.fillStyle = cfg.fillColor || '#38bdf8';
        const dir = cfg.direction || 'left-right';
        if (dir === 'right-left') {
            const fillW = Math.max(0, w * p);
            if (fillW > 0.5) {
                roundRect(x + w - fillW, y, fillW, h, r);
                ctx.fill();
            }
        } else if (dir === 'down-up') {
            const fillH = Math.max(0, h * p);
            if (fillH > 0.5) {
                roundRect(x, y + h - fillH, w, fillH, r);
                ctx.fill();
            }
        } else if (dir === 'up-down') {
            const fillH = Math.max(0, h * p);
            if (fillH > 0.5) {
                roundRect(x, y, w, fillH, r);
                ctx.fill();
            }
        } else {
            // default left-right
            const fillW = Math.max(0, w * p);
            if (fillW > 0.5) {
                roundRect(x, y, fillW, h, r);
                ctx.fill();
            }
        }
        if (cfg.showLabel) {
            ctx.font = `600 ${Math.max(10, Math.min(h * 0.65, 18))}px Inter, system-ui, sans-serif`;
            ctx.fillStyle = cfg.labelColor || '#0f172a';
            ctx.textAlign = 'right';
            ctx.textBaseline = 'middle';
            ctx.fillText(`${Math.round(p * 100)}%`, x + w - 8, y + h / 2);
        }
        ctx.restore();
    }

    _renderBarChartEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || 240);
        const h = Math.max(1, cfg.h || 160);
        const bars = Math.max(1, Math.min(40, cfg.bars || 5));
        const heights = Array.isArray(cfg.heights) && cfg.heights.length === bars ? cfg.heights : Array.from({ length: bars }, () => 0.6);
        const gapRatio = Math.max(0, Math.min(0.5, cfg.gap ?? 0.18));
        const stagger = Math.max(0, Math.min(0.6, cfg.stagger ?? 0.12));
        const totalGap = gapRatio * w;
        const barW = (w - totalGap) / bars;
        const gapW = bars > 1 ? totalGap / (bars - 1) : 0;
        ctx.save();
        ctx.fillStyle = cfg.color || '#38bdf8';
        for (let i = 0; i < bars; i++) {
            const start = i * stagger;
            const localP = Math.max(0, Math.min(1, (p - start) / Math.max(0.0001, 1 - start)));
            const bh = heights[i] * h * localP;
            const bx = x + i * (barW + gapW);
            const by = y + h - bh;
            ctx.fillRect(bx, by, barW, bh);
        }
        ctx.restore();
    }

    // === Phase 2: Reveal mask renderers ===
    _renderIrisRevealEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = cfg.x || 0, y = cfg.y || 0;
        const w = Math.max(1, cfg.w || 200), h = Math.max(1, cfg.h || 200);
        const cx = x + w / 2, cy = y + h / 2;
        const maxR = Math.hypot(w, h) * 0.55;
        const r = maxR * p;
        ctx.save();
        ctx.fillStyle = cfg.color || '#0f172a';
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.arc(cx, cy, r, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.restore();
    }

    _renderClockWipeEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = cfg.x || 0, y = cfg.y || 0;
        const w = Math.max(1, cfg.w || 200), h = Math.max(1, cfg.h || 200);
        const cx = x + w / 2, cy = y + h / 2;
        const maxR = Math.hypot(w, h) * 0.6;
        const clockwise = cfg.clockwise !== false;
        const sweep = Math.PI * 2 * p;
        const start = -Math.PI / 2;
        const end = clockwise ? start + sweep : start - sweep;
        ctx.save();
        ctx.fillStyle = cfg.color || '#0f172a';
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, maxR, start, end, !clockwise);
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.restore();
    }

    _renderBlindsRevealEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = cfg.x || 0, y = cfg.y || 0;
        const w = Math.max(1, cfg.w || 200), h = Math.max(1, cfg.h || 200);
        const slats = Math.max(1, Math.min(40, cfg.slats || 6));
        const horizontal = (cfg.orientation || 'horizontal') === 'horizontal';
        ctx.save();
        ctx.fillStyle = cfg.color || '#0f172a';
        if (horizontal) {
            const sh = h / slats;
            const remaining = sh * (1 - p);
            for (let i = 0; i < slats; i++) {
                ctx.fillRect(x, y + i * sh, w, remaining);
            }
        } else {
            const sw = w / slats;
            const remaining = sw * (1 - p);
            for (let i = 0; i < slats; i++) {
                ctx.fillRect(x + i * sw, y, remaining, h);
            }
        }
        ctx.restore();
    }

    _renderCheckerRevealEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = cfg.x || 0, y = cfg.y || 0;
        const w = Math.max(1, cfg.w || 200), h = Math.max(1, cfg.h || 200);
        const cols = Math.max(1, Math.min(40, cfg.cols || 6));
        const rows = Math.max(1, Math.min(40, cfg.rows || 4));
        const cw = w / cols, ch = h / rows;
        const stagger = Math.max(0, Math.min(0.9, cfg.stagger ?? 0.5));
        ctx.save();
        ctx.fillStyle = cfg.color || '#0f172a';
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                const odd = (row + col) % 2 === 0;
                const start = odd ? 0 : stagger;
                const localP = Math.max(0, Math.min(1, (p - start) / Math.max(0.0001, 1 - start)));
                const alpha = 1 - localP;
                if (alpha <= 0) continue;
                ctx.globalAlpha = alpha;
                ctx.fillRect(x + col * cw, y + row * ch, cw + 0.5, ch + 0.5);
            }
        }
        ctx.restore();
    }

    _renderDiamondWipeEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = cfg.x || 0, y = cfg.y || 0;
        const w = Math.max(1, cfg.w || 200), h = Math.max(1, cfg.h || 200);
        const cx = x + w / 2, cy = y + h / 2;
        const maxR = (Math.max(w, h)) * 0.75;
        const r = maxR * p;
        ctx.save();
        ctx.fillStyle = cfg.color || '#0f172a';
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.moveTo(cx, cy - r);
        ctx.lineTo(cx + r, cy);
        ctx.lineTo(cx, cy + r);
        ctx.lineTo(cx - r, cy);
        ctx.closePath();
        ctx.fill('evenodd');
        ctx.restore();
    }

    // === Phase 3: Cinematic camera renderers ===
    _renderWhipPanEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        const dir = cfg.direction || 'right';
        const horizontal = dir === 'left' || dir === 'right';
        const lines = Math.max(4, Math.min(120, cfg.lines || 40));
        // bell curve: peak at p=0.5
        const intensity = Math.sin(p * Math.PI);
        ctx.save();
        // dark wash
        ctx.fillStyle = cfg.color || '#0b1220';
        ctx.globalAlpha = 0.35 * intensity;
        ctx.fillRect(0, 0, sw, sh);
        // streaks
        ctx.globalAlpha = 0.85 * intensity;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.2;
        const len = Math.max(sw, sh) * 1.1 * intensity;
        for (let i = 0; i < lines; i++) {
            const t = i / (lines - 1);
            ctx.beginPath();
            if (horizontal) {
                const yy = t * sh;
                const x0 = (dir === 'right') ? -len + t * 80 : sw + len - t * 80;
                const x1 = (dir === 'right') ? x0 + len : x0 - len;
                ctx.moveTo(x0, yy);
                ctx.lineTo(x1, yy);
            } else {
                const xx = t * sw;
                const y0 = (dir === 'down') ? -len + t * 80 : sh + len - t * 80;
                const y1 = (dir === 'down') ? y0 + len : y0 - len;
                ctx.moveTo(xx, y0);
                ctx.lineTo(xx, y1);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderRackFocusEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const obj = effect.obj || {};
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        // Track the live object position so the spotlight follows it across the stage.
        const x = Number.isFinite(obj.x) ? obj.x : (cfg.x || 0);
        const y = Number.isFinite(obj.y) ? obj.y : (cfg.y || 0);
        const w = Math.max(1, obj.width || cfg.w || 200);
        const h = Math.max(1, obj.height || cfg.h || 200);
        const dim = Math.max(0, Math.min(1, cfg.dim ?? 0.78));
        const feather = Math.max(20, cfg.feather || 160);
        // Quick ease-in, hold, quick ease-out so the spotlight is clearly visible
        // for most of the effect's duration rather than peaking only at the midpoint.
        let env;
        if (p < 0.15) env = p / 0.15;
        else if (p > 0.85) env = (1 - p) / 0.15;
        else env = 1;
        const alpha = dim * env;
        const cx = x + w / 2, cy = y + h / 2;
        // Spotlight hole sized to the object's bounding box plus a little padding.
        const innerR = Math.max(w, h) * 0.55;
        const outerR = innerR + feather;
        // Radial gradient: transparent inside the spotlight, fully dim at the edge.
        // Canvas radial gradients clamp to the final color stop OUTSIDE outerR, so
        // filling the whole stage with this gradient darkens every pixel beyond the
        // spotlight without needing extra band fills (which would double-darken).
        const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, `rgba(0,0,0,${alpha})`);
        ctx.save();
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sw, sh);
        ctx.restore();
    }

    _renderLetterboxBarsEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        const barH = sh * Math.max(0, Math.min(0.45, cfg.barRatio ?? 0.12)) * p;
        ctx.save();
        ctx.fillStyle = cfg.color || '#000000';
        ctx.fillRect(0, 0, sw, barH);
        ctx.fillRect(0, sh - barH, sw, barH);
        ctx.restore();
    }

    _renderHueCycleEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 200);
        const h = Math.max(1, cfg.h || effect.obj?.height || 200);
        const hue = (p * 360) % 360;
        const fade = Math.sin(p * Math.PI);
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = (cfg.alpha ?? 0.4) * fade;
        ctx.fillStyle = `hsl(${hue}, 80%, 55%)`;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    _renderSaturationPulseEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 200);
        const h = Math.max(1, cfg.h || effect.obj?.height || 200);
        // Desaturate by overlaying mid-gray with multiply blend; pulse amount
        const intensity = Math.sin(p * Math.PI) * (cfg.maxDesat ?? 0.65);
        ctx.save();
        ctx.globalCompositeOperation = 'saturation';
        ctx.globalAlpha = Math.max(0, Math.min(1, intensity));
        ctx.fillStyle = '#808080';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    _renderInvertFlashEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        // Quick rise then fall in opacity using sin curve
        const fade = Math.sin(p * Math.PI);
        ctx.save();
        ctx.globalCompositeOperation = 'difference';
        ctx.globalAlpha = (cfg.maxOpacity ?? 0.85) * fade;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, sw, sh);
        ctx.restore();
    }

    _renderDuotoneShiftEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 200);
        const h = Math.max(1, cfg.h || effect.obj?.height || 200);
        const env = Math.sin(p * Math.PI); // 0 → 1 → 0
        const baseAlpha = (cfg.alpha ?? 0.85);
        ctx.save();
        // Shadow color (multiply) — strongest at start, eases out
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = Math.max(0, baseAlpha * env * (1 - p * 0.4));
        ctx.fillStyle = cfg.colorA || '#0ea5e9';
        ctx.fillRect(x, y, w, h);
        // Highlight color (screen) — strongest near end
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = Math.max(0, baseAlpha * env * (0.6 + p * 0.4));
        ctx.fillStyle = cfg.colorB || '#f43f5e';
        ctx.fillRect(x, y, w, h);
        ctx.restore();
    }

    _renderTintWashEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        const hue = (p * 360) % 360;
        const fade = Math.sin(p * Math.PI);
        ctx.save();
        ctx.globalCompositeOperation = 'soft-light';
        ctx.globalAlpha = (cfg.alpha ?? 0.18) * fade * 2;
        ctx.fillStyle = `hsl(${hue}, 70%, 55%)`;
        ctx.fillRect(0, 0, sw, sh);
        ctx.restore();
    }

    _renderMatrixScrambleEffect(ctx, effect) {
        // Deprecated overlay implementation — matrix-scramble now mutates obj.text
        // directly via runMatrixScramble(). Kept as a no-op for backward compatibility
        // with any saved projects that still reference the overlay path.
    }

    _renderKaraokeHighlightEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const obj = effect.obj || {};
        const x = Number.isFinite(cfg.x) ? cfg.x : (obj.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (obj.y || 0);
        const w = Math.max(1, cfg.w || obj.width || 200);
        const h = Math.max(1, cfg.h || obj.height || 40);
        // Translucent highlighter bar drawn on top — visible on both light and
        // dark stages. Slight vertical inset to feel like a highlighter band.
        const padY = Math.max(2, h * 0.12);
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, cfg.alpha ?? 0.45));
        ctx.fillStyle = cfg.color || '#facc15';
        ctx.fillRect(x, y + padY, w * p, h - padY * 2);
        // Soft leading edge glow
        const edgeX = x + w * p;
        const grad = ctx.createLinearGradient(edgeX - 14, 0, edgeX, 0);
        grad.addColorStop(0, 'rgba(250,204,21,0)');
        grad.addColorStop(1, 'rgba(250,204,21,0.85)');
        ctx.fillStyle = grad;
        ctx.fillRect(edgeX - 14, y + padY, 14, h - padY * 2);
        ctx.restore();
    }

    _renderBeatPulseEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 200);
        const h = Math.max(1, cfg.h || effect.obj?.height || 200);
        const cx = x + w / 2, cy = y + h / 2;
        const bpm = cfg.bpm || 120;
        const beats = (p * (cfg.duration / 1000) * bpm / 60);
        const beatPhase = beats - Math.floor(beats); // 0..1 each beat
        const beatEnv = Math.pow(1 - beatPhase, 2); // sharp attack, decay
        const baseR = Math.max(w, h) * 0.4;
        const r = baseR + beatEnv * baseR * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = cfg.color || '#22d3ee';
        ctx.globalAlpha = 0.55 * beatEnv;
        ctx.lineWidth = 4 + beatEnv * 6;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.stroke();
        // second ring
        ctx.globalAlpha = 0.3 * beatEnv;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, r * 1.25, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
    }

    _renderWaveformBounceEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        const bars = Math.max(8, cfg.bars || 32);
        const seed = cfg.seed || 1;
        const bw = sw / bars;
        const maxH = sh * 0.18;
        const baseY = sh - 8;
        ctx.save();
        ctx.fillStyle = cfg.color || '#a78bfa';
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < bars; i++) {
            const phase = this._seededRandom(seed + i * 13);
            const freq = 2 + this._seededRandom(seed + i * 17) * 4;
            const amp = 0.4 + Math.abs(Math.sin(p * Math.PI * freq + phase * Math.PI * 2)) * 0.6;
            const bh = maxH * amp;
            ctx.fillRect(i * bw + bw * 0.15, baseY - bh, bw * 0.7, bh);
        }
        ctx.restore();
    }

    _renderVuMeterEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(40, cfg.w || effect.obj?.width || 200);
        const h = Math.max(40, cfg.h || effect.obj?.height || 200);
        const seed = cfg.seed || 1;
        const segs = 12;
        const segH = h / segs;
        const level = 0.45 + 0.55 * Math.abs(Math.sin(p * Math.PI * 6 + this._seededRandom(seed) * Math.PI));
        const litCount = Math.floor(level * segs);
        ctx.save();
        for (let i = 0; i < segs; i++) {
            const fromTop = segs - 1 - i;
            const lit = i < litCount;
            let color = '#22c55e';
            if (i >= segs * 0.6) color = '#facc15';
            if (i >= segs * 0.85) color = '#ef4444';
            ctx.globalAlpha = lit ? 0.9 : 0.18;
            ctx.fillStyle = color;
            ctx.fillRect(x + w + 6, y + fromTop * segH + 2, 14, segH - 4);
        }
        ctx.restore();
    }

    _renderOldFilmEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        const seed = cfg.seed || 1;
        ctx.save();
        // Sepia tint
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#c8a26a';
        ctx.fillRect(0, 0, sw, sh);
        // Vignette
        const grad = ctx.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * 0.3, sw / 2, sh / 2, Math.max(sw, sh) * 0.7);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(1, 'rgba(0,0,0,0.65)');
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sw, sh);
        // Hair/scratch lines: 2-3 vertical streaks
        const t = Math.floor(p * 18);
        ctx.strokeStyle = 'rgba(255,240,200,0.5)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 3; i++) {
            const sx = this._seededRandom(seed + t * 19 + i * 7) * sw;
            ctx.beginPath();
            ctx.moveTo(sx, 0);
            ctx.lineTo(sx + (this._seededRandom(seed + t * 23 + i) - 0.5) * 12, sh);
            ctx.stroke();
        }
        // Flicker
        const flick = 1 + (this._seededRandom(seed + t * 29) - 0.5) * 0.18;
        ctx.globalAlpha = Math.max(0, 0.15 * (1 - flick));
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, sw, sh);
        ctx.restore();
    }

    _renderVhsScanlinesEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        ctx.save();
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = '#000000';
        for (let y = 0; y < sh; y += 3) {
            ctx.fillRect(0, y, sw, 1);
        }
        // Tracking band drift
        const bandY = (p * sh * 2) % (sh + 80) - 40;
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#22d3ee';
        ctx.fillRect(0, bandY, sw, 24);
        ctx.restore();
    }

    _renderFilmGrainEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        const density = Math.max(0.01, Math.min(0.5, cfg.density || 0.08));
        const seed = cfg.seed || 1;
        const t = Math.floor(p * 60);
        // ~3% of pixels at density=0.08 — visible without tanking perf
        const dots = Math.floor(sw * sh * density / 25);
        ctx.save();
        ctx.globalCompositeOperation = 'overlay';
        ctx.globalAlpha = 0.85;
        for (let i = 0; i < dots; i++) {
            const x = this._seededRandom(seed + t * 131 + i * 7) * sw;
            const y = this._seededRandom(seed + t * 197 + i * 11) * sh;
            const v = this._seededRandom(seed + t * 251 + i * 13);
            ctx.fillStyle = v > 0.5 ? '#ffffff' : '#000000';
            ctx.fillRect(x, y, 2, 2);
        }
        ctx.restore();
    }

    _renderCrtBendEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const sw = cfg.stageW || this.stage?.width || 1280;
        const sh = cfg.stageH || this.stage?.height || 720;
        const intensity = Math.sin(p * Math.PI);
        ctx.save();
        // Curved-edge vignette to simulate CRT corners
        const grad = ctx.createRadialGradient(sw / 2, sh / 2, Math.min(sw, sh) * 0.35, sw / 2, sh / 2, Math.max(sw, sh) * 0.6);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.7, `rgba(0,0,0,${0.25 * intensity})`);
        grad.addColorStop(1, `rgba(0,0,0,${0.85 * intensity})`);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, sw, sh);
        // RGB fringe lines
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.15 * intensity;
        ctx.fillStyle = '#ff0040';
        ctx.fillRect(0, 0, sw, sh);
        ctx.fillStyle = '#00d4ff';
        ctx.fillRect(2, 0, sw, sh);
        // Scanlines lite
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.25;
        ctx.fillStyle = '#000000';
        for (let y = 0; y < sh; y += 4) {
            ctx.fillRect(0, y, sw, 1);
        }
        ctx.restore();
    }

    _renderScanGridEffect(ctx, effect) {
        const cfg = effect.config || {};
        const p = Math.max(0, Math.min(1, effect.progress));
        const w = cfg.stageW || this.stage?.width || 1280;
        const h = cfg.stageH || this.stage?.height || 720;
        const size = Math.max(4, cfg.size || 36);
        ctx.save();
        ctx.strokeStyle = cfg.color || '#22d3ee';
        ctx.globalAlpha = Math.max(0, Math.min(1, cfg.opacity ?? 0.35));
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

    _renderFake3DTurnEffect(ctx, effect, mode = 'card') {
        const cfg = effect.config || {}, obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const p = Math.max(0, Math.min(1, effect.progress));
        const x = Number.isFinite(cfg.x) ? cfg.x : (obj.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (obj.y || 0);
        const w = Math.max(1, cfg.w || obj.width || 1);
        const h = Math.max(1, cfg.h || obj.height || 1);
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
        obj.render(ctx, { quality: 'editor' });
        ctx.fillStyle = `rgba(0,0,0,${shade})`;
        ctx.fillRect(x, y, w, h);
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _renderSwirlTornadoEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(3, Math.min(140, cfg.count || 22));
        const radius = Math.max(1, cfg.radius || 130);
        const turns = Math.max(0.1, cfg.turns || 2.5);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const color = cfg.color || '#38bdf8';
        const seed = cfg.seed || 1;
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = color;
        ctx.shadowBlur = 8;
        for (let i = 0; i < count; i++) {
            const rnd = this._seededRandom(seed + i * 91);
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
                if (s === 0) ctx.moveTo(x, yy);
                else ctx.lineTo(x, yy);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderFireFlickerEffect(ctx, effect) {
        const cfg = effect.config || {};
        const progress = Math.max(0, Math.min(1, effect.progress));
        const count = Math.max(1, Math.min(180, cfg.count || 28));
        const height = Math.max(1, cfg.height || 90);
        const width = Math.max(20, cfg.width || 80);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0);
        const color = cfg.color || '#f97316';
        const glowColor = this._effectColorToRgba(color, 0.18);
        const seed = cfg.seed || 1;
        ctx.save();
        for (let i = 0; i < count; i++) {
            const rndA = this._seededRandom(seed + i * 101);
            const rndB = this._seededRandom(seed + i * 211);
            const wave = Math.sin(progress * Math.PI * 8 + rndA * Math.PI * 2);
            const x = originX + (rndA - 0.5) * width * (0.45 + rndB);
            const flameH = height * (0.35 + rndB * 0.85) * (0.78 + wave * 0.18);
            const baseW = Math.max(3, width / Math.max(12, count) * (1.4 + rndA));
            const y = originY - flameH * progress;
            const grad = ctx.createRadialGradient(x, y + flameH * 0.35, 1, x, y + flameH * 0.45, flameH * 0.65);
            grad.addColorStop(0, this._effectColorToRgba(color, 0.95));
            grad.addColorStop(0.36, color);
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

    _renderDustAwayEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(500, cfg.count || 80));
        const spread = Math.max(1, cfg.spread || 210);
        const sizeBase = Math.max(1, cfg.size || 5);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x || 0) + (obj.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y || 0) + (obj.height || 0) / 2;
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        ctx.save();
        ctx.fillStyle = cfg.color || cfg.objectColor || '#cbd5e1';
        for (let i = 0; i < count; i++) {
            const rndA = this._seededRandom(seed + i * 127);
            const rndB = this._seededRandom(seed + i * 197);
            const rndC = this._seededRandom(seed + i * 251);
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

    _renderMeltDripEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const melt = progress * progress;
        const amount = Math.max(1, cfg.amount || 90);
        const slices = Math.max(4, Math.min(120, cfg.slices || 24));
        const drips = Math.max(0, Math.min(80, cfg.drips || 12));
        const seed = cfg.seed || 1;
        const savedOpacity = obj.opacity;
        obj.opacity = 1;
        ctx.save();
        for (let i = 0; i < slices; i++) {
            const rnd = this._seededRandom(seed + i * 101);
            const x = obj.x + i * ((obj.width || 1) / slices);
            const w = (obj.width || 1) / slices + 1;
            const drop = amount * melt * (0.25 + rnd * 0.9);
            ctx.save();
            ctx.beginPath();
            ctx.rect(x, obj.y, w, (obj.height || 1) + drop + 2);
            ctx.clip();
            ctx.translate(0, drop);
            obj.render(ctx, { quality: 'editor' });
            ctx.restore();
        }
        ctx.fillStyle = cfg.color || obj.fill || obj.stroke || '#ef4444';
        for (let i = 0; i < drips; i++) {
            const rndA = this._seededRandom(seed + i * 137);
            const rndB = this._seededRandom(seed + i * 223);
            const x = obj.x + rndA * (obj.width || 1);
            const len = amount * melt * (0.35 + rndB * 0.9);
            const width = Math.max(2, (obj.width || 80) / Math.max(18, drips * 2) * (0.45 + rndA));
            ctx.globalAlpha = Math.max(0, 0.85 - progress * 0.25);
            ctx.beginPath();
            ctx.ellipse(x, obj.y + (obj.height || 1) + len, width * 0.7, width, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.beginPath();
            ctx.roundRect?.(x - width * 0.35, obj.y + (obj.height || 1), width * 0.7, len, width * 0.35);
            if (!ctx.roundRect) ctx.rect(x - width * 0.35, obj.y + (obj.height || 1), width * 0.7, len);
            ctx.fill();
        }
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _renderBrushRevealEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const brush = Math.max(4, cfg.brushSize || 54);
        const texture = Math.max(0, Math.min(1, cfg.texture ?? 0.45));
        const direction = cfg.direction || 'left-right';
        const seed = cfg.seed || 1;
        const w = obj.width || 1;
        const h = obj.height || 1;
        const savedOpacity = obj.opacity;
        obj.opacity = 1;
        ctx.save();
        ctx.beginPath();
        const pad = brush * (0.7 + texture);
        if (direction === 'right-left') {
            ctx.rect(obj.x + w * (1 - progress) - pad, obj.y - pad, w * progress + pad * 2, h + pad * 2);
        } else if (direction === 'top-bottom') {
            ctx.rect(obj.x - pad, obj.y - pad, w + pad * 2, h * progress + pad * 2);
        } else if (direction === 'bottom-top') {
            ctx.rect(obj.x - pad, obj.y + h * (1 - progress) - pad, w + pad * 2, h * progress + pad * 2);
        } else {
            ctx.rect(obj.x - pad, obj.y - pad, w * progress + pad * 2, h + pad * 2);
        }
        const blobs = Math.max(6, Math.round((direction.includes('left') || direction.includes('right') ? h : w) / Math.max(8, brush * 0.45)));
        for (let i = 0; i < blobs; i++) {
            const rndA = this._seededRandom(seed + i * 83);
            const rndB = this._seededRandom(seed + i * 149);
            const edgeX = direction === 'right-left' ? obj.x + w * (1 - progress) : direction === 'left-right' ? obj.x + w * progress : obj.x + rndA * w;
            const edgeY = direction === 'bottom-top' ? obj.y + h * (1 - progress) : direction === 'top-bottom' ? obj.y + h * progress : obj.y + rndA * h;
            const r = brush * (0.25 + rndB * 0.65) * texture;
            ctx.moveTo(edgeX + r, edgeY);
            ctx.arc(edgeX, edgeY, r, 0, Math.PI * 2);
        }
        ctx.clip();
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _renderPaintRevealEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const progress = Math.max(0, Math.min(1, effect.progress));
        if (progress <= 0) return;
        const savedOpacity = obj.opacity;
        const savedVisible = obj.visible;
        obj.opacity = 1;
        obj.visible = true;
        const canvas = ctx.canvas;
        const temp = document.createElement('canvas');
        temp.width = canvas.width;
        temp.height = canvas.height;
        const tempCtx = temp.getContext('2d');
        obj.render(tempCtx, { quality: 'editor' });
        if (progress >= 0.985) {
            ctx.drawImage(temp, 0, 0);
            obj.opacity = savedOpacity;
            obj.visible = savedVisible;
            return;
        }

        const strokes = this._buildPaintRevealStrokes(obj.x || 0, obj.y || 0, obj.width || 1, obj.height || 1, cfg);
        const mask = document.createElement('canvas');
        mask.width = canvas.width;
        mask.height = canvas.height;
        this._drawPaintRevealMask(mask.getContext('2d'), obj.x || 0, obj.y || 0, obj.width || 1, obj.height || 1, progress, cfg, (seed) => this._seededRandom(seed), strokes);

        tempCtx.globalCompositeOperation = 'destination-in';
        tempCtx.drawImage(mask, 0, 0);
        tempCtx.globalCompositeOperation = 'source-over';
        ctx.drawImage(temp, 0, 0);
        // Visible brush head riding the active stroke's leading tip.
        this._drawPaintRevealBrushHead(ctx, strokes, progress, cfg);
        obj.opacity = savedOpacity;
        obj.visible = savedVisible;
    }

    _buildPaintRevealStrokes(x, y, w, h, cfg = {}) {
        const brush = Math.max(4, cfg.brushSize || 58);
        const direction = cfg.direction || 'left-right';
        const seed = cfg.seed || 1;
        const pad = brush * 0.55;
        const bandSpacing = brush * 0.78;
        const rand = (k) => this._seededRandom(seed + k);
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
                // Zigzag still depends on visit order, not row index, so the
                // first painted row always starts from the requested side.
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
        // Default: left-right zigzag.
        horizontalRows(true);
        return strokes;
    }

    _paintRevealStrokeWindows(totalStrokes) {
        const overlap = 0.18;
        const denom = Math.max(1, totalStrokes - (totalStrokes - 1) * overlap);
        const slice = 1 / denom;
        return { slice, advance: slice * (1 - overlap) };
    }

    _drawPaintRevealMask(ctx, x, y, w, h, progress, cfg = {}, rand = (seed) => this._seededRandom(seed), strokes = null) {
        // SOLID-white reveal mask — no partial-alpha hairlines so the revealed
        // object never shows dark blotches.
        const p = Math.max(0, Math.min(1, progress));
        if (p <= 0) return;
        const brush = Math.max(4, cfg.brushSize || 58);
        const texture = Math.max(0, Math.min(1, cfg.texture ?? 0.55));
        const seed = cfg.seed || 1;
        const jitter = brush * (0.04 + texture * 0.10);
        const buildStrokes = strokes || this._buildPaintRevealStrokes(x, y, w, h, cfg);
        if (!buildStrokes.length) return;
        const { slice, advance } = this._paintRevealStrokeWindows(buildStrokes.length);
        ctx.save();
        ctx.strokeStyle = '#fff';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = 1;
        for (let i = 0; i < buildStrokes.length; i++) {
            const startT = i * advance;
            const endT = startT + slice;
            let local;
            if (p >= endT) local = 1;
            else if (p <= startT) local = 0;
            else local = (p - startT) / Math.max(0.0001, endT - startT);
            if (local <= 0) continue;
            const s = buildStrokes[i];
            const a = rand(seed + i * 97);
            const b = rand(seed + i * 131);
            const c = rand(seed + i * 173);
            const dx = s.x2 - s.x1;
            const dy = s.y2 - s.y1;
            const ex = s.x1 + dx * local;
            const ey = s.y1 + dy * local;
            const mx = (s.x1 + ex) / 2 + (b - 0.5) * jitter;
            const my = (s.y1 + ey) / 2 + (c - 0.5) * jitter * 0.5;
            ctx.lineWidth = brush * (1.05 + a * 0.10);
            ctx.beginPath();
            ctx.moveTo(s.x1, s.y1);
            ctx.quadraticCurveTo(mx, my, ex, ey);
            ctx.stroke();
        }
        ctx.restore();
    }

    _drawPaintRevealBrushHead(ctx, strokes, progress, cfg = {}) {
        const p = Math.max(0, Math.min(1, progress));
        if (p <= 0 || !strokes || !strokes.length) return;
        const brush = Math.max(4, cfg.brushSize || 58);
        const { slice, advance } = this._paintRevealStrokeWindows(strokes.length);
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

    _renderLiquidMotionEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(300, cfg.count || 34));
        const baseSize = Math.max(1, cfg.size || 9);
        const spread = Math.max(1, cfg.spread || 180);
        const gravity = Number.isFinite(cfg.gravity) ? cfg.gravity : 160;
        const mode = cfg.mode || 'splash';
        const direction = cfg.direction || 'down';
        const color = cfg.color || '#38bdf8';
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x || 0) + (obj.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y || 0) + (obj.height || 0) / 2;
        const dirAngles = { right: 0, down: Math.PI / 2, left: Math.PI, up: -Math.PI / 2 };
        const baseAngle = dirAngles[direction] ?? Math.PI / 2;
        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < count; i++) {
            const rndA = this._seededRandom(seed + i * 97);
            const rndB = this._seededRandom(seed + i * 151);
            const rndC = this._seededRandom(seed + i * 211);
            const delay = mode === 'drip' || mode === 'flow' ? rndA * 0.55 : rndA * 0.18;
            const t = Math.max(0, Math.min(1, (progress - delay) / Math.max(0.01, 1 - delay)));
            if (t <= 0) continue;
            const angle = direction === 'radial'
                ? rndA * Math.PI * 2
                : baseAngle + (rndB - 0.5) * (mode === 'flow' ? 0.42 : 1.25);
            const distance = spread * t * (0.25 + rndC * 0.95);
            const gravityY = gravity * t * t * (mode === 'splash' ? 0.75 : 1);
            const streamOffset = mode === 'flow' ? (rndB - 0.5) * baseSize * 5 : 0;
            const x = originX + Math.cos(angle) * distance + Math.cos(baseAngle + Math.PI / 2) * streamOffset;
            const y = originY + Math.sin(angle) * distance + gravityY + Math.sin(baseAngle + Math.PI / 2) * streamOffset;
            const size = baseSize * (0.55 + rndB * 0.95) * (mode === 'flow' ? 0.75 : 1);
            const alpha = Math.max(0, 1 - t * 0.72) * (0.55 + rndC * 0.45);
            ctx.globalAlpha = alpha;
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

    _renderImpactBurstEffect(ctx, effect) {
        const cfg = effect.config || {};
        const rings = Math.max(1, Math.min(12, cfg.rings || 2));
        const radius = Math.max(1, cfg.radius || 180);
        const spikes = Math.max(0, Math.min(120, cfg.spikes || 14));
        const width = Math.max(1, cfg.width || 5);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const color = cfg.color || '#f97316';
        const seed = cfg.seed || 1;

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
            ctx.beginPath();
            ctx.arc(originX, originY, radius * t * (0.75 + i * 0.18), 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.lineWidth = Math.max(1, width * 0.65);
        for (let i = 0; i < spikes; i++) {
            const rnd = this._seededRandom(seed + i * 157);
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

    _renderWaveDistortEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const amplitude = Math.max(0, cfg.amplitude || 18) * Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
        const frequency = Math.max(0.1, cfg.frequency || 3);
        const slices = Math.max(4, Math.min(160, cfg.slices || 28));
        const horizontal = (cfg.direction || 'horizontal') !== 'vertical';
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
            obj.render(ctx, { quality: 'editor' });
            ctx.restore();
        }
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _renderPixelBurstEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(400, cfg.count || 42));
        const spread = Math.max(1, cfg.spread || 150);
        const baseSize = Math.max(1, cfg.size || 8);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x || 0) + (obj.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y || 0) + (obj.height || 0) / 2;
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const alpha = cfg.fade === false ? 1 : Math.max(0, 1 - progress);

        ctx.save();
        for (let i = 0; i < count; i++) {
            const rnd = this._seededRandom(seed + i * 127);
            const rnd2 = this._seededRandom(seed + i * 197);
            const rnd3 = this._seededRandom(seed + i * 251);
            const angle = rnd * Math.PI * 2;
            const distance = spread * progress * (0.3 + rnd2 * 0.95);
            const size = baseSize * (0.65 + rnd3 * 0.85);
            const x = originX + Math.cos(angle) * distance;
            const y = originY + Math.sin(angle) * distance;
            ctx.globalAlpha = alpha * (0.65 + rnd * 0.35);
            ctx.fillStyle = this._getPixelBurstColor(cfg, i, rnd);
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle + progress * Math.PI * (rnd2 > 0.5 ? 1 : -1));
            ctx.fillRect(-size / 2, -size / 2, size, size);
            ctx.restore();
        }
        ctx.restore();
    }

    _getPixelBurstColor(cfg, index, rnd) {
        if (cfg.colorMode === 'rainbow') {
            const hue = Math.round((index * 47 + rnd * 120) % 360);
            return `hsl(${hue}, 90%, 60%)`;
        }
        if (cfg.colorMode === 'single') return cfg.color || '#38bdf8';
        return cfg.objectColor || cfg.color || '#38bdf8';
    }

    _renderLensFlareEffect(ctx, effect) {
        const cfg = effect.config || {};
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj?.x || 0) + (effect.obj?.width || 0) / 2;
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj?.y || 0) + (effect.obj?.height || 0) / 2;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const pulse = Math.sin(progress * Math.PI);
        const intensity = Math.max(0, Math.min(1, cfg.intensity ?? 0.75)) * pulse;
        const length = Math.max(1, cfg.length || 180);
        const count = Math.max(0, Math.min(20, cfg.count || 4));
        const angle = Number.isFinite(cfg.angle) ? cfg.angle : 0;
        const color = cfg.color || '#fef3c7';
        const seed = cfg.seed || 1;

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
        core.addColorStop(0, color);
        core.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = core;
        ctx.beginPath();
        ctx.arc(originX, originY, length * 0.16, 0, Math.PI * 2);
        ctx.fill();

        for (let i = 0; i < count; i++) {
            const rnd = this._seededRandom(seed + i * 151);
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

    _renderScanBeamEffect(ctx, effect) {
        const cfg = effect.config || {};
        const x = Number.isFinite(cfg.x) ? cfg.x : (effect.obj?.x || 0);
        const y = Number.isFinite(cfg.y) ? cfg.y : (effect.obj?.y || 0);
        const w = Math.max(1, cfg.w || effect.obj?.width || 1);
        const h = Math.max(1, cfg.h || effect.obj?.height || 1);
        const width = Math.max(1, cfg.width || 28);
        const opacity = Math.max(0, Math.min(1, cfg.opacity ?? 0.65));
        const progress = Math.max(0, Math.min(1, effect.progress));
        const color = cfg.color || '#22d3ee';
        const direction = cfg.direction || 'left-right';
        const sweep = -width + (direction === 'right-left' || direction === 'bottom-top' ? (1 - progress) : progress) * ((direction === 'top-bottom' || direction === 'bottom-top') ? h + width * 2 : w + width * 2);

        ctx.save();
        ctx.globalAlpha = opacity;
        ctx.fillStyle = color;
        if (cfg.glow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = width * 0.75;
        }
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();
        if (direction === 'top-bottom' || direction === 'bottom-top') {
            const gradient = ctx.createLinearGradient(x, y + sweep - width, x, y + sweep + width);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(0.5, color);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x - width, y + sweep - width, w + width * 2, width * 2);
        } else if (direction === 'diagonal') {
            const pos = -w + progress * (w + h + width * 2);
            ctx.translate(x + pos, y);
            ctx.rotate(Math.PI / 4);
            ctx.fillRect(-width / 2, -h, width, h * 3);
        } else {
            const gradient = ctx.createLinearGradient(x + sweep - width, y, x + sweep + width, y);
            gradient.addColorStop(0, 'rgba(255,255,255,0)');
            gradient.addColorStop(0.5, color);
            gradient.addColorStop(1, 'rgba(255,255,255,0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(x + sweep - width, y - width, width * 2, h + width * 2);
        }
        ctx.restore();
    }

    _renderMagnetPullEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(240, cfg.count || 28));
        const radius = Math.max(1, cfg.radius || 180);
        const size = Math.max(1, cfg.size || 6);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const pull = cfg.mode !== 'push';

        ctx.save();
        ctx.fillStyle = cfg.color || '#22c55e';
        ctx.strokeStyle = cfg.color || '#22c55e';
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
            const rnd = this._seededRandom(seed + i * 113);
            const rnd2 = this._seededRandom(seed + i * 181);
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
            if (cfg.trail) {
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

    _renderLightningArcEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(80, cfg.count || 5));
        const length = Math.max(1, cfg.length || 140);
        const jaggedness = Math.max(0, cfg.jaggedness || 26);
        const width = Math.max(1, cfg.width || 3);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const flicker = 0.45 + 0.55 * Math.sin(progress * Math.PI * 8);
        const color = cfg.color || '#60a5fa';

        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (cfg.glow) {
            ctx.shadowColor = color;
            ctx.shadowBlur = width * 5 + 8;
        }
        for (let i = 0; i < count; i++) {
            const rndA = this._seededRandom(seed + i * 101);
            const rndB = this._seededRandom(seed + i * 211);
            const angle = this._getLightningDirectionAngle(cfg.direction || 'radial', i, count, rndA);
            const boltLength = length * (0.65 + rndB * 0.55);
            const segments = 5 + Math.floor(this._seededRandom(seed + i * 307) * 5);
            ctx.globalAlpha = Math.max(0, 1 - progress * 0.6) * flicker * (0.65 + rndA * 0.35);
            ctx.beginPath();
            for (let s = 0; s <= segments; s++) {
                const t = s / segments;
                const jitter = s === 0 || s === segments ? 0 : (this._seededRandom(seed + i * 401 + s * 53) - 0.5) * jaggedness;
                const px = originX + Math.cos(angle) * boltLength * t + Math.cos(angle + Math.PI / 2) * jitter;
                const py = originY + Math.sin(angle) * boltLength * t + Math.sin(angle + Math.PI / 2) * jitter;
                if (s === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    _getLightningDirectionAngle(direction, index, count, rnd = 0) {
        if (direction === 'right') return (rnd - 0.5) * Math.PI * 0.35;
        if (direction === 'left') return Math.PI + (rnd - 0.5) * Math.PI * 0.35;
        if (direction === 'up') return -Math.PI / 2 + (rnd - 0.5) * Math.PI * 0.35;
        if (direction === 'down') return Math.PI / 2 + (rnd - 0.5) * Math.PI * 0.35;
        return (index / Math.max(1, count)) * Math.PI * 2 + rnd * 0.7;
    }

    _renderSmokePuffEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(160, cfg.count || 18));
        const spread = Math.max(1, cfg.spread || 90);
        const baseSize = Math.max(1, cfg.size || 28);
        const driftY = Number.isFinite(cfg.driftY) ? cfg.driftY : -70;
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const opacity = Math.max(0, Math.min(1, cfg.opacity ?? 0.45));

        ctx.save();
        ctx.fillStyle = cfg.color || '#94a3b8';
        for (let i = 0; i < count; i++) {
            const rnd = this._seededRandom(seed + i * 109);
            const rnd2 = this._seededRandom(seed + i * 173);
            const rnd3 = this._seededRandom(seed + i * 229);
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

    _renderOrbitSwarmEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(80, cfg.count || 8));
        const radius = Math.max(1, cfg.radius || 90);
        const size = Math.max(1, cfg.size || 7);
        const speed = Number.isFinite(cfg.speed) ? cfg.speed : 1.5;
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const color = cfg.color || '#a78bfa';

        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        for (let i = 0; i < count; i++) {
            const rnd = this._seededRandom(seed + i * 137);
            const rnd2 = this._seededRandom(seed + i * 263);
            const orbitRadius = radius * (0.68 + rnd * 0.52);
            const angle = (i / count) * Math.PI * 2 + progress * Math.PI * 2 * speed + rnd2 * 0.7;
            const squash = 0.55 + rnd * 0.35;
            const x = originX + Math.cos(angle) * orbitRadius;
            const y = originY + Math.sin(angle) * orbitRadius * squash;
            const alpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(angle + progress * Math.PI * 2));
            ctx.globalAlpha = alpha;
            if (cfg.trail) {
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

    _renderConfettiBurstEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(400, cfg.count || 50));
        const spread = Math.max(1, cfg.spread || 220);
        const fall = Number.isFinite(cfg.fall) ? cfg.fall : 240;
        const baseSize = Math.max(1, cfg.size || 8);
        const spin = Math.max(0, Number.isFinite(cfg.spin) ? cfg.spin : 2);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const seed = cfg.seed || 1;
        const progress = Math.max(0, Math.min(1, effect.progress));
        const palette = this._getConfettiPalette(cfg.palette || 'party', cfg.baseColor || '#38bdf8');

        ctx.save();
        for (let i = 0; i < count; i++) {
            const rndA = this._seededRandom(seed + i * 89);
            const rndB = this._seededRandom(seed + i * 149);
            const rndC = this._seededRandom(seed + i * 211);
            const rndD = this._seededRandom(seed + i * 271);
            const angle = -Math.PI / 2 + (rndA - 0.5) * Math.PI * 1.35;
            const burst = spread * (0.25 + rndB * 0.85) * Math.sin(progress * Math.PI * 0.5);
            const x = originX + Math.cos(angle) * burst + (rndC - 0.5) * spread * 0.18 * progress;
            const y = originY + Math.sin(angle) * burst + fall * progress * progress * (0.55 + rndD * 0.75);
            const size = baseSize * (0.65 + rndC * 0.9);
            const alpha = Math.max(0, 1 - Math.max(0, progress - 0.72) / 0.28);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = palette[i % palette.length];
            this._drawConfettiPiece(ctx, x, y, size, (rndA * Math.PI * 2) + progress * spin * Math.PI * 2, i % 3);
        }
        ctx.restore();
    }

    _drawConfettiPiece(ctx, x, y, size, angle, variant = 0) {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.beginPath();
        if (variant === 1) {
            ctx.rect(-size * 0.18, -size * 0.75, size * 0.36, size * 1.5);
        } else if (variant === 2) {
            ctx.moveTo(0, -size * 0.7);
            ctx.lineTo(size * 0.55, size * 0.55);
            ctx.lineTo(-size * 0.55, size * 0.55);
            ctx.closePath();
        } else {
            ctx.rect(-size * 0.55, -size * 0.35, size * 1.1, size * 0.7);
        }
        ctx.fill();
        ctx.restore();
    }

    _getConfettiPalette(name, baseColor) {
        if (name === 'warm') return ['#ef4444', '#f97316', '#facc15', '#fb7185'];
        if (name === 'cool') return ['#06b6d4', '#38bdf8', '#6366f1', '#a78bfa'];
        if (name === 'gold') return ['#f59e0b', '#facc15', '#fde68a', '#ffffff'];
        if (name === 'brand') return [baseColor || '#38bdf8', '#ffffff', '#111827'];
        return ['#ef4444', '#f97316', '#facc15', '#22c55e', '#38bdf8', '#8b5cf6', '#ec4899'];
    }

    _renderFocusPulseEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const baseRadius = Math.max(1, cfg.radius || 80);
        const rings = Math.max(1, Math.min(8, cfg.rings || 2));
        const width = Math.max(1, cfg.width || 4);
        const color = cfg.color || '#f97316';
        const pulse = Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
        const focusRadius = baseRadius * (1 + pulse * 0.18);

        ctx.save();
        if (cfg.dim) {
            const canvas = ctx.canvas;
            ctx.save();
            ctx.fillStyle = `rgba(0, 0, 0, ${Math.max(0, Math.min(0.9, cfg.dimOpacity ?? 0.35))})`;
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

    _renderGlowAuraEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const savedOpacity = obj.opacity;
        const cx = obj.x + (obj.width || 0) / 2;
        const cy = obj.y + (obj.height || 0) / 2;
        const pulse = Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
        const opacity = Math.max(0, Math.min(1, cfg.opacity ?? 0.75)) * (1 - (cfg.pulse || 0) * 0.5 + (cfg.pulse || 0) * pulse);
        const scale = Math.max(0.1, (cfg.scale || 1.04) + (cfg.pulse || 0) * pulse * 0.08);

        ctx.save();
        ctx.shadowColor = cfg.color || '#38bdf8';
        ctx.shadowBlur = Math.max(1, cfg.blur || 28) * (0.75 + pulse * 0.5);
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.translate(-cx, -cy);
        obj.opacity = savedOpacity * opacity;
        obj.render(ctx, { quality: 'editor' });
        ctx.restore();
        obj.opacity = savedOpacity;
    }

    _renderEchoTrailEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj;
        if (!obj || typeof obj.render !== 'function') return;
        const count = Math.max(1, Math.min(30, cfg.count || 4));
        const offsetX = Number.isFinite(cfg.offsetX) ? cfg.offsetX : -18;
        const offsetY = Number.isFinite(cfg.offsetY) ? cfg.offsetY : 0;
        const maxOpacity = Math.max(0, Math.min(1, Number.isFinite(cfg.opacity) ? cfg.opacity : 0.45));
        const scaleStep = Number.isFinite(cfg.scaleStep) ? cfg.scaleStep : 0;
        const savedOpacity = obj.opacity;
        const cx = obj.x + (obj.width || 0) / 2;
        const cy = obj.y + (obj.height || 0) / 2;

        for (let i = count; i >= 1; i--) {
            const depth = i / count;
            const progressFactor = 0.35 + effect.progress * 0.65;
            const dx = offsetX * i * progressFactor;
            const dy = offsetY * i * progressFactor;
            const scale = Math.max(0.05, 1 + scaleStep * i * effect.progress);
            const fadeFactor = cfg.fade === false ? 1 : Math.max(0, 1 - effect.progress);
            obj.opacity = savedOpacity * maxOpacity * fadeFactor * (1 - depth * 0.65);
            ctx.save();
            ctx.translate(cx + dx, cy + dy);
            ctx.scale(scale, scale);
            ctx.translate(-cx, -cy);
            obj.render(ctx, { quality: 'editor' });
            ctx.restore();
        }
        obj.opacity = savedOpacity;
    }

    _renderSparkleBurstEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const count = Math.max(1, Math.min(200, cfg.count || 18));
        const radius = Math.max(1, cfg.radius || 140);
        const baseSize = Math.max(1, cfg.size || 10);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const seed = cfg.seed || 1;
        const color = cfg.color || '#facc15';
        const spin = Math.max(0, Number.isFinite(cfg.spin) ? cfg.spin : 1);
        const fade = cfg.fade !== false;

        ctx.save();
        ctx.fillStyle = color;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        for (let i = 0; i < count; i++) {
            const rndA = this._seededRandom(seed + i * 97);
            const rndB = this._seededRandom(seed + i * 151);
            const rndC = this._seededRandom(seed + i * 211);
            const angle = rndA * Math.PI * 2;
            const travel = radius * effect.progress * (0.45 + rndB * 0.75);
            const twinkle = Math.sin(Math.max(0, Math.min(1, effect.progress)) * Math.PI);
            const size = baseSize * (0.55 + rndC * 0.9) * Math.max(0.15, twinkle);
            const x = originX + Math.cos(angle) * travel;
            const y = originY + Math.sin(angle) * travel;
            const alpha = fade ? Math.max(0, 1 - effect.progress) : 1;
            ctx.globalAlpha = alpha * (0.55 + rndB * 0.45);
            ctx.lineWidth = Math.max(1, size * 0.18);
            this._drawSparkleShape(ctx, x, y, size, angle + effect.progress * Math.PI * 2 * spin, cfg.shape || 'star');
        }
        ctx.restore();
    }

    _drawSparkleShape(ctx, x, y, size, angle, shape = 'star') {
        const half = size / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.beginPath();
        if (shape === 'dot') {
            ctx.arc(0, 0, half, 0, Math.PI * 2);
            ctx.fill();
        } else if (shape === 'cross') {
            ctx.moveTo(-half, 0);
            ctx.lineTo(half, 0);
            ctx.moveTo(0, -half);
            ctx.lineTo(0, half);
            ctx.stroke();
        } else if (shape === 'diamond') {
            ctx.moveTo(0, -half);
            ctx.lineTo(half, 0);
            ctx.lineTo(0, half);
            ctx.lineTo(-half, 0);
            ctx.closePath();
            ctx.fill();
        } else {
            for (let i = 0; i < 8; i++) {
                const r = i % 2 === 0 ? half : half * 0.35;
                const a = -Math.PI / 2 + i * Math.PI / 4;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }

    _renderRippleWaveEffect(ctx, effect) {
        const cfg = effect.config || {};
        const obj = effect.obj || {};
        const rings = Math.max(1, Math.min(12, cfg.rings || 3));
        const maxRadius = Math.max(1, cfg.radius || 160);
        const baseRadius = Math.max(1, cfg.baseRadius || Math.hypot(obj.width || 0, obj.height || 0) / 2 || 8);
        const lineWidth = Math.max(1, cfg.width || 4);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (obj.x + (obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (obj.y + (obj.height || 0) / 2);
        const color = cfg.color || '#38bdf8';

        ctx.save();
        ctx.strokeStyle = color;
        ctx.fillStyle = color;
        ctx.lineWidth = lineWidth;
        for (let i = 0; i < rings; i++) {
            const delay = rings > 1 ? i / rings : 0;
            const ringProgress = Math.max(0, Math.min(1, (effect.progress - delay * 0.55) / Math.max(0.01, 1 - delay * 0.55)));
            if (ringProgress <= 0) continue;
            const radius = baseRadius + maxRadius * ringProgress;
            const alpha = cfg.fade === false ? 1 : Math.max(0, 1 - ringProgress);
            ctx.globalAlpha = alpha * (1 - i * 0.04);
            ctx.beginPath();
            ctx.arc(originX, originY, radius, 0, Math.PI * 2);
            if (cfg.fill) {
                ctx.globalAlpha = alpha * 0.12;
                ctx.fill();
                ctx.globalAlpha = alpha * (1 - i * 0.04);
            }
            ctx.stroke();
        }
        ctx.restore();
    }

    _renderShootEffect(ctx, effect) {
        const cfg = effect.config || {};
        const count = Math.max(1, cfg.pelletCount || 1);
        const size = Math.max(1, cfg.pelletSize || 8);
        const distance = Math.max(0, cfg.distance || 0);
        const frequency = Math.max(1, cfg.frequency || count);
        const originX = Number.isFinite(cfg.originX) ? cfg.originX : (effect.obj.x + (effect.obj.width || 0) / 2);
        const originY = Number.isFinite(cfg.originY) ? cfg.originY : (effect.obj.y + (effect.obj.height || 0) / 2);
        const baseAngle = this._directionToAngle(cfg.direction || 'right');
        const spreadRad = ((cfg.spread || 0) * Math.PI) / 180;
        const mode = cfg.shotMode || 'stream';
        const randomness = Math.max(0, Math.min(100, Number.isFinite(cfg.randomness) ? cfg.randomness : 0)) / 100;
        const gravity = Number.isFinite(cfg.gravity) ? cfg.gravity : 0;
        const trailLength = Math.max(0, Number.isFinite(cfg.trailLength) ? cfg.trailLength : 1);
        const fade = cfg.fade !== false;
        const seed = cfg.seed || 1;

        ctx.save();
        ctx.fillStyle = cfg.color || '#f59e0b';
        ctx.strokeStyle = cfg.color || '#f59e0b';
        ctx.lineCap = 'round';

        for (let i = 0; i < count; i++) {
            const spawnDelay = this._getShotSpawnDelay(i, count, effect.duration, frequency, mode);
            const pelletElapsed = effect.localTime - spawnDelay;
            if (pelletElapsed < 0) continue;
            const pelletDuration = Math.max(1, effect.duration - spawnDelay);
            const t = Math.max(0, Math.min(1, pelletElapsed / pelletDuration));
            if (t <= 0 || t > 1) continue;

            const rndA = this._seededRandom(seed + i * 101);
            const rndB = this._seededRandom(seed + i * 211);
            const rndC = this._seededRandom(seed + i * 307);
            const spreadOffset = count === 1 ? 0 : ((i / (count - 1)) - 0.5) * spreadRad;
            const angleJitter = (rndA - 0.5) * randomness * (Math.PI / 3);
            const speedFactor = Math.max(0.2, 1 + (rndC - 0.5) * randomness);
            const pelletSize = Math.max(1, size * (1 + (rndB - 0.5) * randomness));
            const angle = baseAngle + spreadOffset + angleJitter;
            const travel = distance * t * speedFactor;
            const pathPoint = cfg.pathMode === 'path' && cfg.pathPoints?.length >= 2
                ? this._sampleEffectPath(cfg.pathPoints, t)
                : null;
            const x = pathPoint ? pathPoint.x : originX + Math.cos(angle) * travel;
            const y = (pathPoint ? pathPoint.y : originY + Math.sin(angle) * travel) + gravity * t * t;
            const drawAngle = pathPoint?.angle ?? angle;
            const tail = Math.max(pelletSize * 1.5, distance * 0.04) * trailLength * (1 - t * 0.35);
            const alpha = fade ? Math.max(0.05, 1 - t * 0.85) : 1;

            ctx.globalAlpha = alpha;
            ctx.lineWidth = Math.max(1, pelletSize * 0.45);
            if (tail > 0) {
                ctx.beginPath();
                ctx.moveTo(x - Math.cos(drawAngle) * tail, y - Math.sin(drawAngle) * tail);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            this._drawPelletShape(ctx, x, y, pelletSize, drawAngle, cfg.pelletShape || 'circle');
        }
        ctx.restore();
    }

    _getShotSpawnDelay(index, count, duration, frequency, mode = 'stream') {
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

    _drawPelletShape(ctx, x, y, size, angle, shape = 'circle') {
        const half = size / 2;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle || 0);
        ctx.beginPath();
        if (shape === 'line') {
            ctx.moveTo(-size, 0);
            ctx.lineTo(size, 0);
            ctx.stroke();
            ctx.restore();
            return;
        }
        if (shape === 'rectangle') {
            ctx.rect(-size, -half, size * 2, size);
        } else if (shape === 'square') {
            ctx.rect(-half, -half, size, size);
        } else if (shape === 'triangle') {
            ctx.moveTo(half, 0);
            ctx.lineTo(-half, -half);
            ctx.lineTo(-half, half);
            ctx.closePath();
        } else if (shape === 'star') {
            for (let i = 0; i < 10; i++) {
                const r = i % 2 === 0 ? half : half * 0.45;
                const a = -Math.PI / 2 + i * Math.PI / 5;
                const px = Math.cos(a) * r;
                const py = Math.sin(a) * r;
                if (i === 0) ctx.moveTo(px, py);
                else ctx.lineTo(px, py);
            }
            ctx.closePath();
        } else {
            ctx.arc(0, 0, half, 0, Math.PI * 2);
        }
        ctx.fill();
        ctx.restore();
    }

    _sampleEffectPath(points, t) {
        if (!Array.isArray(points) || points.length < 2) return null;
        const clamped = Math.max(0, Math.min(1, t));
        const idx = clamped * (points.length - 1);
        const i = Math.floor(idx);
        const frac = idx - i;
        const p0 = points[Math.min(i, points.length - 1)];
        const p1 = points[Math.min(i + 1, points.length - 1)];
        if (!p0 || !p1) return null;
        return {
            x: p0.x + (p1.x - p0.x) * frac,
            y: p0.y + (p1.y - p0.y) * frac,
            angle: Math.atan2(p1.y - p0.y, p1.x - p0.x)
        };
    }

    _renderBreakApartEffect(ctx, effect) {
        const obj = effect.obj;
        const cfg = effect.config || {};
        if (!obj || typeof obj.render !== 'function') return;
        const fragments = this._buildBreakFragments(obj, cfg);
        const savedOpacity = obj.opacity;
        const stagger = Math.max(0, Math.min(0.9, cfg.fragmentStagger || 0));
        const spin = Math.max(0, Number.isFinite(cfg.fragmentSpin) ? cfg.fragmentSpin : 1);
        const gravity = Number.isFinite(cfg.fragmentGravity) ? cfg.fragmentGravity : 0;
        const fade = cfg.fragmentFade === true;

        fragments.forEach(fragment => {
            const delay = fragments.length > 1 ? (fragment.order / (fragments.length - 1)) * stagger : 0;
            const progress = Math.max(0, Math.min(1, (effect.progress - delay) / Math.max(0.01, 1 - delay)));
            if (progress <= 0) return;
            const cx = fragment.x + fragment.w / 2;
            const cy = fragment.y + fragment.h / 2;
            const dx = fragment.dx * progress;
            const dy = fragment.dy * progress + gravity * progress * progress;
            const rot = fragment.rotation * spin * progress;

            ctx.save();
            ctx.translate(cx + dx, cy + dy);
            ctx.rotate(rot);
            ctx.translate(-cx, -cy);
            this._drawBreakFragmentClip(ctx, fragment, cfg.fragmentShape || 'slice');
            ctx.clip();
            obj.opacity = (cfg.originalOpacity ?? savedOpacity ?? 1) * (fade ? Math.max(0, 1 - progress) : 1);
            obj.render(ctx, { quality: 'editor' });
            ctx.restore();
        });

        obj.opacity = savedOpacity;
    }

    _buildBreakFragments(obj, cfg) {
        const count = Math.max(4, Math.min(100, cfg.fragmentCount || 16));
        const width = Math.max(1, obj.width || 1);
        const height = Math.max(1, obj.height || 1);
        const cols = Math.max(1, Math.ceil(Math.sqrt(count * (width / Math.max(height, 1)))));
        const rows = Math.max(1, Math.ceil(count / cols));
        const equal = (cfg.fragmentMode || 'equal') !== 'variable';
        const seed = cfg.seed || 1;
        const direction = cfg.breakDirection || 'radial';
        const fragments = [];

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                if (fragments.length >= count) break;
                const rnd = this._seededRandom(seed + row * 97 + col * 193);
                const rnd2 = this._seededRandom(seed + row * 151 + col * 251);
                const cellW = width / cols;
                const cellH = height / rows;
                const shrinkW = equal ? 1 : 0.75 + rnd * 0.25;
                const shrinkH = equal ? 1 : 0.75 + rnd2 * 0.25;
                const w = cellW * shrinkW;
                const h = cellH * shrinkH;
                const x = obj.x + col * cellW + (cellW - w) / 2;
                const y = obj.y + row * cellH + (cellH - h) / 2;
                const cxNorm = (col + 0.5) / cols - 0.5;
                const cyNorm = (row + 0.5) / rows - 0.5;
                const radialAngle = Math.atan2(cyNorm || (rnd2 - 0.5), cxNorm || (rnd - 0.5));
                const angle = this._getBreakDirectionAngle(direction, radialAngle);
                const scatter = (cfg.scatter || 180) * (0.55 + rnd * 0.75);
                const spreadJitter = ((cfg.spread || 0) * Math.PI / 180) * (rnd2 - 0.5);
                fragments.push({
                    order: fragments.length,
                    x, y, w, h,
                    dx: Math.cos(angle + spreadJitter) * scatter,
                    dy: Math.sin(angle + spreadJitter) * scatter,
                    rotation: (rnd - 0.5) * Math.PI * 1.75
                });
            }
        }
        return fragments;
    }

    _drawBreakFragmentClip(ctx, fragment, shape = 'slice') {
        const x = fragment.x;
        const y = fragment.y;
        const w = fragment.w;
        const h = fragment.h;
        const cx = x + w / 2;
        const cy = y + h / 2;
        ctx.beginPath();
        if (shape === 'circle') {
            ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, Math.PI * 2);
        } else if (shape === 'triangle') {
            ctx.moveTo(cx, y);
            ctx.lineTo(x + w, y + h);
            ctx.lineTo(x, y + h);
            ctx.closePath();
        } else if (shape === 'diamond') {
            ctx.moveTo(cx, y);
            ctx.lineTo(x + w, cy);
            ctx.lineTo(cx, y + h);
            ctx.lineTo(x, cy);
            ctx.closePath();
        } else if (shape === 'shard') {
            ctx.moveTo(x + w * 0.15, y);
            ctx.lineTo(x + w, y + h * 0.2);
            ctx.lineTo(x + w * 0.75, y + h);
            ctx.lineTo(x, y + h * 0.82);
            ctx.lineTo(x + w * 0.28, y + h * 0.42);
            ctx.closePath();
        } else {
            ctx.rect(x, y, w, h);
        }
    }

    _getBreakDirectionAngle(direction, radialAngle) {
        if (direction === 'inward') return radialAngle + Math.PI;
        if (direction === 'down') return Math.PI / 2;
        if (direction === 'up') return -Math.PI / 2;
        if (direction === 'left') return Math.PI;
        if (direction === 'right') return 0;
        return radialAngle;
    }

    _directionToAngle(direction) {
        const angles = {
            right: 0,
            'down-right': Math.PI / 4,
            down: Math.PI / 2,
            'down-left': Math.PI * 3 / 4,
            left: Math.PI,
            'up-left': -Math.PI * 3 / 4,
            up: -Math.PI / 2,
            'up-right': -Math.PI / 4
        };
        return angles[direction] ?? 0;
    }

    _hashString(value) {
        let hash = 2166136261;
        const text = String(value || '');
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
    }

    _seededRandom(seed) {
        const x = Math.sin(seed || 1) * 10000;
        return x - Math.floor(x);
    }

    /**
     * Apply path-follow animation at a specific time.
     * Interpolates object position along a stored path.
     */
    _applyPathFollowAtTime(obj, anim, config, time, animStartOverride) {
        const animStart = animStartOverride !== undefined ? animStartOverride : (anim.delay || 0);
        const elapsed = time - animStart;
        const pathPoints = config.pathPoints;
        const duration = config.duration;
        const easing = config.easing || 'easeInOut';
        const alignRotation = config.alignRotation;

        if (!pathPoints || pathPoints.length < 2) return;
        if (!duration || duration <= 0) return;
        if (elapsed < 0) return; // not started yet

        let repeat = 1;
        if (anim.repeat === '-1') repeat = Infinity;
        else repeat = parseInt(anim.repeat) || 1;

        let localTime = elapsed;
        if (repeat !== Infinity) {
            localTime = Math.min(elapsed, duration * repeat);
        }

        let cycleTime = localTime % duration;
        let progress = Math.min(cycleTime / duration, 1);

        if (localTime >= duration * repeat && repeat !== Infinity) {
            progress = 1;
        }

        const easingFn = Utils.getEasing(easing);
        progress = easingFn(progress);

        // Clamp progress to [0,1]
        progress = Math.max(0, Math.min(1, progress));

        // Interpolate position on path
        const totalPts = pathPoints.length;
        const idx = progress * (totalPts - 1);
        const i = Math.floor(idx);
        const frac = idx - i;
        const p0 = pathPoints[Math.min(i, totalPts - 1)];
        const p1 = pathPoints[Math.min(i + 1, totalPts - 1)];

        if (!p0 || !p1) return;

        const px = p0.x + (p1.x - p0.x) * frac;
        const py = p0.y + (p1.y - p0.y) * frac;

        // Center the object on the path point
        const halfW = (obj.width || 0) / 2;
        const halfH = (obj.height || 0) / 2;
        obj.x = px - halfW;
        obj.y = py - halfH;

        if (alignRotation && (p1.x !== p0.x || p1.y !== p0.y)) {
            obj.rotation = Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
        }
    }

    // ============================
    // TRIGGER SYSTEM
    // ============================

    /**
     * Trigger animations for a specific object and trigger type.
     * Called during interactive preview when user clicks/hovers objects.
     */
    triggerAnimationsForObject(objId, triggerType) {
        const obj = this.objects.getObjectById(objId);
        if (!obj) return;
        let triggered = false;
        obj.animations.forEach(anim => {
            if ((anim.trigger || 'onLoad') === triggerType && !this._triggeredAnims[anim.id]) {
                this._triggeredAnims[anim.id] = this.currentTime;
                triggered = true;
            }
        });
        if (triggered) {
            Utils.showToast(`${triggerType} triggered on ${obj.name}`, 'info');
        }
    }

    /**
     * Check if any object has non-onLoad trigger animations.
     */
    hasInteractiveTriggers() {
        return this.objects.objects.some(obj =>
            obj.animations.some(a => a.trigger && a.trigger !== 'onLoad')
        );
    }

    // ============================
    // INTERACTIVE PREVIEW OVERLAY
    // ============================

    _showInteractiveOverlay() {
        // Remove existing overlay if any
        this._hideInteractiveOverlay();

        // Create a transparent overlay that captures click/hover events on canvas
        const viewport = this.stage.viewport;
        const overlay = document.createElement('div');
        overlay.id = 'interactive-preview-overlay';
        overlay.style.cssText = `
            position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            z-index: 60;
            cursor: pointer;
        `;
        viewport.style.position = 'relative';
        viewport.appendChild(overlay);

        // Show hint banner
        const hint = document.createElement('div');
        hint.id = 'interactive-preview-hint';
        hint.innerHTML = `
            <i class="fas fa-hand-pointer"></i>
            <span>Interactive Preview — Click or hover objects to trigger animations</span>
            <button id="btn-stop-interactive" title="Stop preview"><i class="fas fa-times"></i> Stop</button>
        `;
        viewport.appendChild(hint);

        // Bind stop button
        document.getElementById('btn-stop-interactive')?.addEventListener('click', () => {
            this.stop();
        });

        // Click handler — trigger onClick animations
        this._overlayClickHandler = (e) => {
            const pos = this.stage.screenToStage(e.clientX, e.clientY);

            // Hit test all visible objects
            for (let i = this.objects.objects.length - 1; i >= 0; i--) {
                const obj = this.objects.objects[i];
                if (!obj.visible) continue;
                if (obj.containsPoint(pos.x, pos.y)) {
                    this.triggerAnimationsForObject(obj.id, 'onClick');
                    break;
                }
            }
        };

        // Hover handler — trigger onHover animations
        this._overlayMoveHandler = (e) => {
            const pos = this.stage.screenToStage(e.clientX, e.clientY);

            let hoveredId = null;
            for (let i = this.objects.objects.length - 1; i >= 0; i--) {
                const obj = this.objects.objects[i];
                if (!obj.visible) continue;
                if (obj.containsPoint(pos.x, pos.y)) {
                    hoveredId = obj.id;
                    overlay.style.cursor = 'pointer';
                    break;
                }
            }
            if (!hoveredId) {
                overlay.style.cursor = 'default';
            }

            // Trigger onHover when entering an object
            if (hoveredId && hoveredId !== this._hoveredObjId) {
                this.triggerAnimationsForObject(hoveredId, 'onHover');
            }
            this._hoveredObjId = hoveredId;
        };

        overlay.addEventListener('click', this._overlayClickHandler);
        overlay.addEventListener('mousemove', this._overlayMoveHandler);
    }

    _hideInteractiveOverlay() {
        const overlay = document.getElementById('interactive-preview-overlay');
        if (overlay) overlay.remove();
        const hint = document.getElementById('interactive-preview-hint');
        if (hint) hint.remove();
        this._overlayClickHandler = null;
        this._overlayMoveHandler = null;
    }

    // ============================
    // PLAYBACK DIAGNOSTIC OVERLAY
    // ============================

    calculateTotalDuration() {
        let maxEnd = this.minDuration;
        this.objects.objects.forEach(obj => {
            if (obj.type === 'caption') (obj.segments || []).forEach(cue => { maxEnd = Math.max(maxEnd, Number(cue.endMs) || 0); });
            obj.animations.forEach(anim => {
                const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim.generated);
                let repeatCount = 1;
                if (anim.repeat === '-1') repeatCount = 3; // infinite shown as 3 cycles
                else if (anim.repeat === 'pingpong') repeatCount = 2;
                else repeatCount = Math.max(1, parseInt(anim.repeat) || 1);

                configs.forEach(config => {
                    if (config && config.duration) {
                        // Skip chain morph configs (they share timing with position configs)
                        if (config.property === '_chainType') return;
                        // Chain configs have per-step delay baked in
                        const configDelay = (anim.delay || 0) + (config._stepDelay || 0);
                        const end = configDelay + config.duration * repeatCount;
                        maxEnd = Math.max(maxEnd, end);
                    }
                });
            });
        });
        // Include stage camera keyframes — add 500ms padding past the last
        // keyframe so users can comfortably scrub/extend.
        const stage = window.app?.stage;
        const camKfs = Array.isArray(stage?.cameraKeyframes) ? stage.cameraKeyframes : [];
        if (camKfs.length) {
            const lastCamTime = camKfs.reduce((m, k) => Math.max(m, k.time || 0), 0);
            maxEnd = Math.max(maxEnd, lastCamTime + 500);
        }
        const audioDuration = window.app?.audioTimeline?.getTimelineDurationMs?.()
            || window.app?.audioTimeline?.getDurationMs?.()
            || 0;
        if (audioDuration > 0) {
            maxEnd = Math.max(maxEnd, audioDuration);
        }
        this.totalDuration = maxEnd;
        document.getElementById('tl-duration').textContent = Utils.formatTime(this.totalDuration);
        // Sync the duration input
        const durInput = document.getElementById('tl-duration-input');
        if (durInput) durInput.value = Math.ceil(this.minDuration / 1000);
    }

    /**
     * Get the actual end time of the last animation (ignoring minimum timeline duration).
     */
    getLastAnimationEnd() {
        let maxEnd = 0;
        this.objects.objects.forEach(obj => {
            if (obj.type === 'caption') (obj.segments || []).forEach(cue => { maxEnd = Math.max(maxEnd, Number(cue.endMs) || 0); });
            obj.animations.forEach(anim => {
                const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim.generated);
                configs.forEach(config => {
                    if (config && config.duration) {
                        const delay = (anim.delay || 0) + (config._stepDelay || 0);
                        const repeat = anim.repeat === '-1' ? 1 : (parseInt(anim.repeat) || 1);
                        maxEnd = Math.max(maxEnd, delay + config.duration * repeat);
                    }
                });
            });
        });
        const audioEnd = window.app?.audioTimeline?.getTimelineDurationMs?.()
            || window.app?.audioTimeline?.getDurationMs?.()
            || 0;
        maxEnd = Math.max(maxEnd, Math.max(0, Number(audioEnd) || 0));
        return maxEnd;
    }

    // Toggle the Apply button between "Apply" and "Re-apply" modes
    _updateApplyButtonState() {
        const btn = document.getElementById('btn-apply-anim');
        const banner = document.getElementById('reapply-banner');
        const bannerText = document.getElementById('reapply-banner-text');
        if (!btn) return;
        if (this._reapplyAnimId) {
            btn.innerHTML = '<i class="fas fa-sync-alt"></i> Re-apply';
            btn.classList.add('reapply-mode');
            btn.title = 'Update the selected animation with new parameters';
            // Show reapply banner
            if (banner) {
                banner.classList.remove('hidden');
                // Get animation name for the banner
                const obj = this.objects.getObjectById(this._reapplyObjId);
                const anim = obj?.animations.find(a => a.id === this._reapplyAnimId);
                if (bannerText && anim) {
                    bannerText.textContent = `Editing "${anim.name}" \u2014 change settings and click Re-apply`;
                }
            }
        } else {
            btn.innerHTML = '<i class="fas fa-check"></i> Apply';
            btn.classList.remove('reapply-mode');
            btn.title = '';
            if (banner) banner.classList.add('hidden');
        }
    }

    // Load an applied animation's settings into the editor for re-apply
    _loadAppliedAnimForEdit(obj, animId) {
        const anim = obj.animations.find(a => a.id === animId);
        if (!anim) return;

        // Load the animation type into the params panel
        if (anim.type && anim.type !== 'custom' && anim.type !== 'chain' && anim.type !== 'recorded' && this.library[anim.type]) {
            this.selectAnimation(anim.type);
        } else {
            // For recorded/custom/chain types, just show the params panel with generic settings
            const paramsPanel = document.getElementById('anim-params');
            paramsPanel?.classList.remove('hidden');
            const titleEl = document.getElementById('anim-params-title');
            if (titleEl) titleEl.textContent = `${anim.name} \u2014 Settings`;
            // Show only universal fields for non-library animations
            document.querySelectorAll('#anim-params .param-field[data-param]').forEach(field => {
                const param = field.dataset.param;
                const universal = ['start', 'duration', 'easing', 'repeat', 'repeatMode', 'afterPlayback', 'trigger', 'referenceObject', 'referenceRelation', 'begin', 'end'];
                field.style.display = universal.includes(param) ? 'flex' : 'none';
            });
        }

        // Populate param fields from stored params
        const params = anim.params || {};
        const durEl = document.getElementById('param-duration');
        const delEl = document.getElementById('param-delay');
        const easEl = document.getElementById('param-easing');
        const repEl = document.getElementById('param-repeat');
        const afterPlaybackEl = document.getElementById('param-after-playback');
        if (durEl) durEl.value = params.duration ?? 1;
        const speedEl = document.getElementById('param-animation-speed');
        if (speedEl) speedEl.value = params.animationSpeed ?? 1;
        if (delEl) delEl.value = params.delay ?? 0;
        if (easEl) {
            const ev = params.easing || 'easeInOut';
            if (typeof ev === 'string' && ev.startsWith('cubic-bezier(')) {
                easEl.value = 'custom';
                easEl.dataset.bezier = ev;
            } else {
                easEl.value = ev;
                delete easEl.dataset.bezier;
            }
        }
        if (repEl) repEl.value = params.repeat ?? 1;
        if (afterPlaybackEl) afterPlaybackEl.value = this._getAnimationAfterPlayback(anim);

        // Set repeat mode dropdown
        const repModeEl = document.getElementById('param-repeat-mode');
        if (repModeEl) repModeEl.value = anim.repeatMode || params.repeatMode || 'restart';

        // Set trigger dropdown
        const trigEl = document.getElementById('param-trigger');
        if (trigEl) trigEl.value = anim.trigger || 'onLoad';

        // Set start mode dropdown
        const startEl = document.getElementById('param-start');
        if (startEl) startEl.value = anim.startMode || 'after-previous';
        const referenceObjectEl = document.getElementById('param-reference-object');
        const referenceRelationEl = document.getElementById('param-reference-relation');
        const beginEl = document.getElementById('param-begin');
        const endEl = document.getElementById('param-end');
        if (referenceObjectEl) referenceObjectEl.value = params.referenceObjectId || '';
        if (referenceRelationEl) referenceRelationEl.value = params.referenceRelation || 'after-reference';
        const restoreBeginOverride = params.hasBeginOverride === true;
        const restoreEndOverride = params.hasEndOverride === true;
        if (beginEl) beginEl.value = restoreBeginOverride ? (params.beginTime ?? '') : '';
        if (endEl) endEl.value = restoreEndOverride ? (params.endTime ?? '') : '';
        this._updateTimingReferenceOverrideState('param');

        // Restore type-specific params (direction, distance, degrees, scale, amount, cps)
        if (params.direction !== undefined) {
            const el = document.getElementById('param-direction');
            if (el) el.value = params.direction;
        }
        if (params.distance !== undefined) {
            const el = document.getElementById('param-distance');
            if (el) el.value = params.distance;
        }
        if (params.turns !== undefined) {
            const el = document.getElementById('param-turns');
            if (el) el.value = params.turns;
        }
        if (params.degrees !== undefined) {
            const el = document.getElementById('param-degrees');
            if (el) el.value = params.degrees;
        }
        if (params.scale !== undefined) {
            const el = document.getElementById('param-scale');
            if (el) el.value = params.scale;
        }
        if (params.amount !== undefined) {
            const el = document.getElementById('param-amount');
            if (el) el.value = params.amount;
        }
        if (params.cps !== undefined) {
            const el = document.getElementById('param-cps');
            if (el) el.value = params.cps;
        }
        if (params.pelletCount !== undefined) {
            const el = document.getElementById('param-pellet-count');
            if (el) el.value = params.pelletCount;
        }
        if (params.pelletSize !== undefined) {
            const el = document.getElementById('param-pellet-size');
            if (el) el.value = params.pelletSize;
        }
        if (params.pelletShape !== undefined) {
            const el = document.getElementById('param-pellet-shape');
            if (el) el.value = params.pelletShape;
        }
        if (params.shotMode !== undefined) {
            const el = document.getElementById('param-shot-mode');
            if (el) el.value = params.shotMode;
        }
        if (params.pelletColor !== undefined) {
            const el = document.getElementById('param-pellet-color');
            if (el) el.value = params.pelletColor;
        }
        if (params.pelletPathMode !== undefined) {
            const el = document.getElementById('param-pellet-path-mode');
            if (el) el.value = params.pelletPathMode;
        }
        if (params.pelletPathShapeId !== undefined) {
            this._setPelletPathShape(params.pelletPathShapeId ? this.objects.getObjectById(params.pelletPathShapeId) : null, { silent: true });
        }
        if (params.pelletPathStart !== undefined) {
            const el = document.getElementById('param-pellet-path-start');
            if (el) el.value = params.pelletPathStart;
        }
        if (params.pelletPathEnd !== undefined) {
            const el = document.getElementById('param-pellet-path-end');
            if (el) el.value = params.pelletPathEnd;
        }
        if (params.pelletPathReverse !== undefined) {
            const el = document.getElementById('param-pellet-path-reverse');
            if (el) el.checked = !!params.pelletPathReverse;
        }
        if (params.frequency !== undefined) {
            const el = document.getElementById('param-frequency');
            if (el) el.value = params.frequency;
        }
        if (params.trailLength !== undefined) {
            const el = document.getElementById('param-trail-length');
            if (el) el.value = params.trailLength;
        }
        if (params.shotRandomness !== undefined) {
            const el = document.getElementById('param-shot-randomness');
            if (el) el.value = params.shotRandomness;
        }
        if (params.shotGravity !== undefined) {
            const el = document.getElementById('param-shot-gravity');
            if (el) el.value = params.shotGravity;
        }
        if (params.pelletFade !== undefined) {
            const el = document.getElementById('param-pellet-fade');
            if (el) el.checked = !!params.pelletFade;
        }
        if (params.spread !== undefined) {
            const el = document.getElementById('param-spread');
            if (el) el.value = params.spread;
        }
        if (params.fragmentCount !== undefined) {
            const el = document.getElementById('param-fragment-count');
            if (el) el.value = params.fragmentCount;
        }
        if (params.fragmentMode !== undefined) {
            const el = document.getElementById('param-fragment-mode');
            if (el) el.value = params.fragmentMode;
        }
        if (params.fragmentShape !== undefined) {
            const el = document.getElementById('param-fragment-shape');
            if (el) el.value = params.fragmentShape;
        }
        if (params.breakDirection !== undefined) {
            const el = document.getElementById('param-break-direction');
            if (el) el.value = params.breakDirection;
        }
        if (params.scatter !== undefined) {
            const el = document.getElementById('param-scatter');
            if (el) el.value = params.scatter;
        }
        if (params.fragmentStagger !== undefined) {
            const el = document.getElementById('param-fragment-stagger');
            if (el) el.value = params.fragmentStagger;
        }
        if (params.fragmentSpin !== undefined) {
            const el = document.getElementById('param-fragment-spin');
            if (el) el.value = params.fragmentSpin;
        }
        if (params.fragmentGravity !== undefined) {
            const el = document.getElementById('param-fragment-gravity');
            if (el) el.value = params.fragmentGravity;
        }
        if (params.fragmentFade !== undefined) {
            const el = document.getElementById('param-fragment-fade');
            if (el) el.checked = !!params.fragmentFade;
        }
        if (params.originalMode !== undefined) {
            const el = document.getElementById('param-original-mode');
            if (el) el.value = params.originalMode;
        }
        if (params.rippleRings !== undefined) {
            const el = document.getElementById('param-ripple-rings');
            if (el) el.value = params.rippleRings;
        }
        if (params.rippleRadius !== undefined) {
            const el = document.getElementById('param-ripple-radius');
            if (el) el.value = params.rippleRadius;
        }
        if (params.rippleWidth !== undefined) {
            const el = document.getElementById('param-ripple-width');
            if (el) el.value = params.rippleWidth;
        }
        if (params.rippleColor !== undefined) {
            const el = document.getElementById('param-ripple-color');
            if (el) el.value = params.rippleColor;
        }
        if (params.rippleFill !== undefined) {
            const el = document.getElementById('param-ripple-fill');
            if (el) el.checked = !!params.rippleFill;
        }
        if (params.rippleFade !== undefined) {
            const el = document.getElementById('param-ripple-fade');
            if (el) el.checked = !!params.rippleFade;
        }
        if (params.sparkleCount !== undefined) {
            const el = document.getElementById('param-sparkle-count');
            if (el) el.value = params.sparkleCount;
        }
        if (params.sparkleRadius !== undefined) {
            const el = document.getElementById('param-sparkle-radius');
            if (el) el.value = params.sparkleRadius;
        }
        if (params.sparkleSize !== undefined) {
            const el = document.getElementById('param-sparkle-size');
            if (el) el.value = params.sparkleSize;
        }
        if (params.sparkleShape !== undefined) {
            const el = document.getElementById('param-sparkle-shape');
            if (el) el.value = params.sparkleShape;
        }
        if (params.sparkleColor !== undefined) {
            const el = document.getElementById('param-sparkle-color');
            if (el) el.value = params.sparkleColor;
        }
        if (params.sparkleSpin !== undefined) {
            const el = document.getElementById('param-sparkle-spin');
            if (el) el.value = params.sparkleSpin;
        }
        if (params.sparkleFade !== undefined) {
            const el = document.getElementById('param-sparkle-fade');
            if (el) el.checked = !!params.sparkleFade;
        }
        if (params.echoCount !== undefined) {
            const el = document.getElementById('param-echo-count');
            if (el) el.value = params.echoCount;
        }
        if (params.echoOffsetX !== undefined) {
            const el = document.getElementById('param-echo-offset-x');
            if (el) el.value = params.echoOffsetX;
        }
        if (params.echoOffsetY !== undefined) {
            const el = document.getElementById('param-echo-offset-y');
            if (el) el.value = params.echoOffsetY;
        }
        if (params.echoOpacity !== undefined) {
            const el = document.getElementById('param-echo-opacity');
            if (el) el.value = params.echoOpacity;
        }
        if (params.echoScaleStep !== undefined) {
            const el = document.getElementById('param-echo-scale-step');
            if (el) el.value = params.echoScaleStep;
        }
        if (params.echoFade !== undefined) {
            const el = document.getElementById('param-echo-fade');
            if (el) el.checked = !!params.echoFade;
        }
        if (params.glowColor !== undefined) {
            const el = document.getElementById('param-glow-color');
            if (el) el.value = params.glowColor;
        }
        if (params.glowBlur !== undefined) {
            const el = document.getElementById('param-glow-blur');
            if (el) el.value = params.glowBlur;
        }
        if (params.glowOpacity !== undefined) {
            const el = document.getElementById('param-glow-opacity');
            if (el) el.value = params.glowOpacity;
        }
        if (params.glowPulse !== undefined) {
            const el = document.getElementById('param-glow-pulse');
            if (el) el.value = params.glowPulse;
        }
        if (params.glowScale !== undefined) {
            const el = document.getElementById('param-glow-scale');
            if (el) el.value = params.glowScale;
        }
        if (params.focusColor !== undefined) {
            const el = document.getElementById('param-focus-color');
            if (el) el.value = params.focusColor;
        }
        if (params.focusRadius !== undefined) {
            const el = document.getElementById('param-focus-radius');
            if (el) el.value = params.focusRadius;
        }
        if (params.focusRings !== undefined) {
            const el = document.getElementById('param-focus-rings');
            if (el) el.value = params.focusRings;
        }
        if (params.focusWidth !== undefined) {
            const el = document.getElementById('param-focus-width');
            if (el) el.value = params.focusWidth;
        }
        if (params.focusDim !== undefined) {
            const el = document.getElementById('param-focus-dim');
            if (el) el.checked = !!params.focusDim;
        }
        if (params.focusDimOpacity !== undefined) {
            const el = document.getElementById('param-focus-dim-opacity');
            if (el) el.value = params.focusDimOpacity;
        }
        if (params.confettiCount !== undefined) {
            const el = document.getElementById('param-confetti-count');
            if (el) el.value = params.confettiCount;
        }
        if (params.confettiSpread !== undefined) {
            const el = document.getElementById('param-confetti-spread');
            if (el) el.value = params.confettiSpread;
        }
        if (params.confettiFall !== undefined) {
            const el = document.getElementById('param-confetti-fall');
            if (el) el.value = params.confettiFall;
        }
        if (params.confettiSize !== undefined) {
            const el = document.getElementById('param-confetti-size');
            if (el) el.value = params.confettiSize;
        }
        if (params.confettiSpin !== undefined) {
            const el = document.getElementById('param-confetti-spin');
            if (el) el.value = params.confettiSpin;
        }
        if (params.confettiPalette !== undefined) {
            const el = document.getElementById('param-confetti-palette');
            if (el) el.value = params.confettiPalette;
        }
        if (params.orbitCount !== undefined) {
            const el = document.getElementById('param-orbit-count');
            if (el) el.value = params.orbitCount;
        }
        if (params.orbitRadius !== undefined) {
            const el = document.getElementById('param-orbit-radius');
            if (el) el.value = params.orbitRadius;
        }
        if (params.orbitSize !== undefined) {
            const el = document.getElementById('param-orbit-size');
            if (el) el.value = params.orbitSize;
        }
        if (params.orbitColor !== undefined) {
            const el = document.getElementById('param-orbit-color');
            if (el) el.value = params.orbitColor;
        }
        if (params.orbitSpeed !== undefined) {
            const el = document.getElementById('param-orbit-speed');
            if (el) el.value = params.orbitSpeed;
        }
        if (params.orbitTrail !== undefined) {
            const el = document.getElementById('param-orbit-trail');
            if (el) el.checked = !!params.orbitTrail;
        }
        if (params.smokeCount !== undefined) {
            const el = document.getElementById('param-smoke-count');
            if (el) el.value = params.smokeCount;
        }
        if (params.smokeSpread !== undefined) {
            const el = document.getElementById('param-smoke-spread');
            if (el) el.value = params.smokeSpread;
        }
        if (params.smokeSize !== undefined) {
            const el = document.getElementById('param-smoke-size');
            if (el) el.value = params.smokeSize;
        }
        if (params.smokeDriftY !== undefined) {
            const el = document.getElementById('param-smoke-drift-y');
            if (el) el.value = params.smokeDriftY;
        }
        if (params.smokeColor !== undefined) {
            const el = document.getElementById('param-smoke-color');
            if (el) el.value = params.smokeColor;
        }
        if (params.smokeOpacity !== undefined) {
            const el = document.getElementById('param-smoke-opacity');
            if (el) el.value = params.smokeOpacity;
        }
        if (params.lightningCount !== undefined) {
            const el = document.getElementById('param-lightning-count');
            if (el) el.value = params.lightningCount;
        }
        if (params.lightningLength !== undefined) {
            const el = document.getElementById('param-lightning-length');
            if (el) el.value = params.lightningLength;
        }
        if (params.lightningJaggedness !== undefined) {
            const el = document.getElementById('param-lightning-jaggedness');
            if (el) el.value = params.lightningJaggedness;
        }
        if (params.lightningWidth !== undefined) {
            const el = document.getElementById('param-lightning-width');
            if (el) el.value = params.lightningWidth;
        }
        if (params.lightningColor !== undefined) {
            const el = document.getElementById('param-lightning-color');
            if (el) el.value = params.lightningColor;
        }
        if (params.lightningDirection !== undefined) {
            const el = document.getElementById('param-lightning-direction');
            if (el) el.value = params.lightningDirection;
        }
        if (params.lightningGlow !== undefined) {
            const el = document.getElementById('param-lightning-glow');
            if (el) el.checked = !!params.lightningGlow;
        }
        if (params.magnetCount !== undefined) {
            const el = document.getElementById('param-magnet-count');
            if (el) el.value = params.magnetCount;
        }
        if (params.magnetRadius !== undefined) {
            const el = document.getElementById('param-magnet-radius');
            if (el) el.value = params.magnetRadius;
        }
        if (params.magnetSize !== undefined) {
            const el = document.getElementById('param-magnet-size');
            if (el) el.value = params.magnetSize;
        }
        if (params.magnetColor !== undefined) {
            const el = document.getElementById('param-magnet-color');
            if (el) el.value = params.magnetColor;
        }
        if (params.magnetMode !== undefined) {
            const el = document.getElementById('param-magnet-mode');
            if (el) el.value = params.magnetMode;
        }
        if (params.magnetTrail !== undefined) {
            const el = document.getElementById('param-magnet-trail');
            if (el) el.checked = !!params.magnetTrail;
        }
        if (params.scanColor !== undefined) {
            const el = document.getElementById('param-scan-color');
            if (el) el.value = params.scanColor;
        }
        if (params.scanWidth !== undefined) {
            const el = document.getElementById('param-scan-width');
            if (el) el.value = params.scanWidth;
        }
        if (params.scanOpacity !== undefined) {
            const el = document.getElementById('param-scan-opacity');
            if (el) el.value = params.scanOpacity;
        }
        if (params.scanDirection !== undefined) {
            const el = document.getElementById('param-scan-direction');
            if (el) el.value = params.scanDirection;
        }
        if (params.scanGlow !== undefined) {
            const el = document.getElementById('param-scan-glow');
            if (el) el.checked = !!params.scanGlow;
        }
        if (params.flareColor !== undefined) {
            const el = document.getElementById('param-flare-color');
            if (el) el.value = params.flareColor;
        }
        if (params.flareIntensity !== undefined) {
            const el = document.getElementById('param-flare-intensity');
            if (el) el.value = params.flareIntensity;
        }
        if (params.flareLength !== undefined) {
            const el = document.getElementById('param-flare-length');
            if (el) el.value = params.flareLength;
        }
        if (params.flareCount !== undefined) {
            const el = document.getElementById('param-flare-count');
            if (el) el.value = params.flareCount;
        }
        if (params.flareAngle !== undefined) {
            const el = document.getElementById('param-flare-angle');
            if (el) el.value = params.flareAngle;
        }
        if (params.pixelCount !== undefined) {
            const el = document.getElementById('param-pixel-count');
            if (el) el.value = params.pixelCount;
        }
        if (params.pixelSpread !== undefined) {
            const el = document.getElementById('param-pixel-spread');
            if (el) el.value = params.pixelSpread;
        }
        if (params.pixelSize !== undefined) {
            const el = document.getElementById('param-pixel-size');
            if (el) el.value = params.pixelSize;
        }
        if (params.pixelColorMode !== undefined) {
            const el = document.getElementById('param-pixel-color-mode');
            if (el) el.value = params.pixelColorMode;
        }
        if (params.pixelColor !== undefined) {
            const el = document.getElementById('param-pixel-color');
            if (el) el.value = params.pixelColor;
        }
        if (params.pixelFade !== undefined) {
            const el = document.getElementById('param-pixel-fade');
            if (el) el.checked = !!params.pixelFade;
        }
        if (params.impactRings !== undefined) {
            const el = document.getElementById('param-impact-rings');
            if (el) el.value = params.impactRings;
        }
        if (params.impactRadius !== undefined) {
            const el = document.getElementById('param-impact-radius');
            if (el) el.value = params.impactRadius;
        }
        if (params.impactSpikes !== undefined) {
            const el = document.getElementById('param-impact-spikes');
            if (el) el.value = params.impactSpikes;
        }
        if (params.impactWidth !== undefined) {
            const el = document.getElementById('param-impact-width');
            if (el) el.value = params.impactWidth;
        }
        if (params.impactColor !== undefined) {
            const el = document.getElementById('param-impact-color');
            if (el) el.value = params.impactColor;
        }
        if (params.waveAmplitude !== undefined) {
            const el = document.getElementById('param-wave-amplitude');
            if (el) el.value = params.waveAmplitude;
        }
        if (params.waveFrequency !== undefined) {
            const el = document.getElementById('param-wave-frequency');
            if (el) el.value = params.waveFrequency;
        }
        if (params.waveSlices !== undefined) {
            const el = document.getElementById('param-wave-slices');
            if (el) el.value = params.waveSlices;
        }
        if (params.waveDirection !== undefined) {
            const el = document.getElementById('param-wave-direction');
            if (el) el.value = params.waveDirection;
        }
        [
            ['liquidMode', 'param-liquid-mode'],
            ['liquidPreset', 'param-liquid-preset'],
            ['liquidColor', 'param-liquid-color'],
            ['liquidCount', 'param-liquid-count'],
            ['liquidSize', 'param-liquid-size'],
            ['liquidSpread', 'param-liquid-spread'],
            ['liquidGravity', 'param-liquid-gravity'],
            ['liquidDirection', 'param-liquid-direction'],
            ['effectPreset', 'param-effect-preset'],
            ['effectOrigin', 'param-effect-origin'],
            ['effectOriginX', 'param-effect-origin-x'],
            ['effectOriginY', 'param-effect-origin-y'],
            ['effectBlendMode', 'param-effect-blend-mode'],
            ['effectObjectMode', 'param-effect-object-mode'],
            ['meltAmount', 'param-melt-amount'],
            ['meltDrips', 'param-melt-drips'],
            ['meltSlices', 'param-melt-slices'],
            ['meltColor', 'param-melt-color'],
            ['revealDirection', 'param-reveal-direction'],
            ['revealBrushSize', 'param-reveal-brush-size'],
            ['revealTexture', 'param-reveal-texture'],
            ['swirlCount', 'param-swirl-count'],
            ['swirlRadius', 'param-swirl-radius'],
            ['swirlTurns', 'param-swirl-turns'],
            ['swirlColor', 'param-swirl-color'],
            ['flameCount', 'param-flame-count'],
            ['flameHeight', 'param-flame-height'],
            ['flameColor', 'param-flame-color'],
            ['dustCount', 'param-dust-count'],
            ['dustSpread', 'param-dust-spread'],
            ['dustSize', 'param-dust-size'],
            ['dustColor', 'param-dust-color'],
            ['freezeCracks', 'param-freeze-cracks'],
            ['freezeTint', 'param-freeze-tint'],
            ['freezeOpacity', 'param-freeze-opacity'],
            ['neonColor', 'param-neon-color'],
            ['neonWidth', 'param-neon-width'],
            ['neonGlow', 'param-neon-glow'],
            ['drawColor', 'param-draw-color'],
            ['drawWidth', 'param-draw-width'],
            ['drawGlow', 'param-draw-glow'],
            ['drawStart', 'param-draw-start'],
            ['drawTailFade', 'param-draw-tail-fade'],
            ['shadowColor', 'param-shadow-color'],
            ['shadowOffset', 'param-shadow-offset'],
            ['shadowBlur', 'param-shadow-blur'],
            ['explosionCount', 'param-explosion-count'],
            ['explosionRadius', 'param-explosion-radius'],
            ['explosionSmokeSize', 'param-explosion-smoke-size'],
            ['explosionColor', 'param-explosion-color'],
            ['paintColor', 'param-paint-color'],
            ['paintWidth', 'param-paint-width'],
            ['paintLength', 'param-paint-length'],
            ['paintSplatter', 'param-paint-splatter'],
            ['glitchIntensity', 'param-glitch-intensity'],
            ['glitchSlices', 'param-glitch-slices'],
            ['glitchColorShift', 'param-glitch-color-shift'],
            ['shockwaveRings', 'param-shockwave-rings'],
            ['shockwaveRadius', 'param-shockwave-radius'],
            ['shockwaveColor', 'param-shockwave-color'],
            ['portalColor', 'param-portal-color'],
            ['portalRadius', 'param-portal-radius'],
            ['portalSpokes', 'param-portal-spokes'],
            ['shatterPieces', 'param-shatter-pieces'],
            ['shatterSpread', 'param-shatter-spread'],
            ['shatterColor', 'param-shatter-color'],
            ['chargeBolts', 'param-charge-bolts'],
            ['chargeRadius', 'param-charge-radius'],
            ['chargeColor', 'param-charge-color'],
            ['inkColor', 'param-ink-color'],
            ['inkSpread', 'param-ink-spread'],
            ['inkDrops', 'param-ink-drops'],
            ['smearDistance', 'param-smear-distance'],
            ['smearCopies', 'param-smear-copies'],
            ['shakeAmount', 'param-shake-amount'],
            ['shakeFrequency', 'param-shake-frequency'],
            ['maskShape', 'param-mask-shape'],
            ['maskFeather', 'param-mask-feather'],
            ['trailColor', 'param-trail-color'],
            ['pathTrailLength', 'param-trail-length-effect'],
            ['trailWidth', 'param-trail-width'],
            ['fountainCount', 'param-fountain-count'],
            ['fountainSpread', 'param-fountain-spread'],
            ['fountainColor', 'param-fountain-color'],
            ['sweepColor', 'param-sweep-color'],
            ['sweepWidth', 'param-sweep-width'],
            ['sweepAngle', 'param-sweep-angle'],
            ['weatherType', 'param-weather-type'],
            ['weatherCount', 'param-weather-count'],
            ['weatherColor', 'param-weather-color'],
            ['weatherWind', 'param-weather-wind'],
            ['bubbleCount', 'param-bubble-count'],
            ['bubbleSize', 'param-bubble-size'],
            ['bubbleColor', 'param-bubble-color'],
            ['bubbleSpread', 'param-bubble-spread'],
            ['meteorCount', 'param-meteor-count'],
            ['meteorColor', 'param-meteor-color'],
            ['meteorAngle', 'param-meteor-angle'],
            ['meteorLength', 'param-meteor-length'],
            ['spotlightColor', 'param-spotlight-color'],
            ['spotlightRadius', 'param-spotlight-radius'],
            ['spotlightDim', 'param-spotlight-dim'],
            ['rayCount', 'param-ray-count'],
            ['rayLength', 'param-ray-length'],
            ['rayColor', 'param-ray-color'],
            ['outlinePulseColor', 'param-outline-pulse-color'],
            ['outlinePulseWidth', 'param-outline-pulse-width'],
            ['outlinePulseRings', 'param-outline-pulse-rings'],
            ['speedLineCount', 'param-speed-line-count'],
            ['speedLineLength', 'param-speed-line-length'],
            ['speedLineColor', 'param-speed-line-color'],
            ['speedLineDirection', 'param-speed-line-direction'],
            ['starCount', 'param-star-count'],
            ['starColor', 'param-star-color'],
            ['starSpread', 'param-star-spread'],
            ['washColor', 'param-wash-color'],
            ['washOpacity', 'param-wash-opacity'],
            ['washDirection', 'param-wash-direction'],
            ['haloColor', 'param-halo-color'],
            ['haloRadius', 'param-halo-radius'],
            ['haloRings', 'param-halo-rings'],
            ['shadowCastColor', 'param-shadow-cast-color'],
            ['shadowCastLength', 'param-shadow-cast-length'],
            ['shadowCastAngle', 'param-shadow-cast-angle'],
            ['shadowCastOpacity', 'param-shadow-cast-opacity'],
            ['shieldColor', 'param-shield-color'],
            ['shieldRadius', 'param-shield-radius'],
            ['shieldBands', 'param-shield-bands'],
            ['lensRadius', 'param-lens-radius'],
            ['lensZoom', 'param-lens-zoom'],
            ['lensColor', 'param-lens-color'],
            ['rainbowRadius', 'param-rainbow-radius'],
            ['rainbowWidth', 'param-rainbow-width'],
            ['rainbowBands', 'param-rainbow-bands'],
            ['vignetteColor', 'param-vignette-color'],
            ['vignetteStrength', 'param-vignette-strength'],
            ['gridColor', 'param-grid-color'],
            ['gridSize', 'param-grid-size'],
            ['gridOpacity', 'param-grid-opacity'],
            ['solidSurfaceId', 'param-solid-surface-id'],
            ['bounceHeight', 'param-bounce-height'],
            ['bounceCompression', 'param-bounce-compression']
        ].forEach(([key, id]) => {
            if (params[key] !== undefined) {
                const el = document.getElementById(id);
                if (el) el.value = params[key];
            }
        });
        if (params.drawUseCustom !== undefined) {
            const el = document.getElementById('param-draw-use-custom');
            if (el) el.checked = !!params.drawUseCustom;
        }
        if (params.drawClockwise !== undefined) {
            const el = document.getElementById('param-draw-clockwise');
            if (el) el.checked = params.drawClockwise !== false;
        }
        if (params.drawShowPen !== undefined) {
            const el = document.getElementById('param-draw-show-pen');
            if (el) el.checked = params.drawShowPen !== false;
        }
        if (params.spawnCount !== undefined) {
            const el = document.getElementById('param-spawn-count');
            if (el) el.value = params.spawnCount;
        }
        if (params.spawnOffsetX !== undefined) {
            const el = document.getElementById('param-spawn-offset-x');
            if (el) el.value = params.spawnOffsetX;
        }
        if (params.spawnOffsetY !== undefined) {
            const el = document.getElementById('param-spawn-offset-y');
            if (el) el.value = params.spawnOffsetY;
        }
        if (params.spawnLayout !== undefined) {
            const el = document.getElementById('param-spawn-layout');
            if (el) el.value = params.spawnLayout;
        }
        if (params.spawnScaleStep !== undefined) {
            const el = document.getElementById('param-spawn-scale-step');
            if (el) el.value = params.spawnScaleStep;
        }
        if (params.spawnRotationStep !== undefined) {
            const el = document.getElementById('param-spawn-rotation-step');
            if (el) el.value = params.spawnRotationStep;
        }
        if (params.spawnColorVariation !== undefined) {
            const el = document.getElementById('param-spawn-color-variation');
            if (el) el.value = params.spawnColorVariation;
        }
        if (params.spawnAvoidOverlap !== undefined) {
            const el = document.getElementById('param-spawn-avoid-overlap');
            if (el) el.checked = !!params.spawnAvoidOverlap;
        }
        if (params.spawnSpacing !== undefined) {
            const el = document.getElementById('param-spawn-spacing');
            if (el) el.value = params.spawnSpacing;
        }
        if (params.spawnClearOriginal !== undefined) {
            const el = document.getElementById('param-spawn-clear-original');
            if (el) el.checked = !!params.spawnClearOriginal;
        }
        if (params.spawnIncludeAnimations !== undefined) {
            const el = document.getElementById('param-spawn-include-animations');
            if (el) el.checked = !!params.spawnIncludeAnimations;
        }
        if (params.spawnAsGroup !== undefined) {
            const el = document.getElementById('param-spawn-as-group');
            if (el) el.checked = !!params.spawnAsGroup;
        }
        if (params.targetX !== undefined && Number.isFinite(params.targetX)) {
            const el = document.getElementById('param-target-x');
            if (el) el.value = params.targetX;
        }
        if (params.targetY !== undefined && Number.isFinite(params.targetY)) {
            const el = document.getElementById('param-target-y');
            if (el) el.value = params.targetY;
        }

        // Set re-apply flags so Apply replaces instead of adding
        this._reapplyAnimId = animId;
        this._reapplyObjId = obj.id;
        this._updateApplyButtonState();
    }

    // Clear re-apply mode and revert button
    _clearReapplyMode() {
        this._reapplyAnimId = null;
        this._reapplyObjId = null;
        this.selectedAppliedAnimId = null;
        this._updateApplyButtonState();
    }

    _getAppliedAnimationsTarget(selected = this.objects.getSelectedObjects()) {
        if (!selected.length) return null;
        const anchorId = this.objects.selectionAnchorId;
        if (anchorId) {
            const anchored = selected.find(obj => obj.id === anchorId);
            if (anchored) return anchored;
        }
        return selected[0];
    }

    _getGroupAppliedAnimationTargets(anchorObj, anchorAnim) {
        const selected = this.objects.getSelectedObjects();
        const targets = selected.length > 1 ? selected : [anchorObj];
        return targets
            .map(obj => {
                const anim = (obj.animations || []).find(candidate => (
                    candidate.id === anchorAnim.id
                    || (anchorAnim._groupApplyId && candidate._groupApplyId === anchorAnim._groupApplyId)
                    || this._isEquivalentAppliedAnimation(candidate, anchorAnim)
                ));
                return anim ? { obj, anim } : null;
            })
            .filter(Boolean);
    }

    _isEquivalentAppliedAnimation(candidate, reference) {
        if (!candidate || !reference) return false;
        const norm = (value) => value == null ? '' : String(value);
        const num = (value) => Math.round((Number(value) || 0) * 1000) / 1000;
        return norm(candidate.type) === norm(reference.type)
            && norm(candidate.name) === norm(reference.name)
            && num(candidate.delay) === num(reference.delay)
            && num(candidate.params?.duration) === num(reference.params?.duration)
            && norm(candidate.params?.easing) === norm(reference.params?.easing)
            && norm(candidate.repeat) === norm(reference.repeat)
            && norm(candidate.repeatMode) === norm(reference.repeatMode)
            && norm(candidate.trigger || 'onLoad') === norm(reference.trigger || 'onLoad')
            && norm(candidate.startMode) === norm(reference.startMode);
    }

    // Update applied animations list
    updateAppliedAnimationsList() {
        const listEl = document.getElementById('applied-anim-list');
        if (!listEl) return;

        const selected = this.objects.getSelectedObjects();
        if (selected.length === 0) {
            listEl.innerHTML = '<div class="empty-state small"><p>Select an object to see animations</p></div>';
            this._clearReapplyMode();
            return;
        }

        const obj = this._getAppliedAnimationsTarget(selected);
        if (!obj) {
            listEl.innerHTML = '<div class="empty-state small"><p>Select an object to see animations</p></div>';
            this._clearReapplyMode();
            return;
        }
        if (obj.animations.length === 0) {
            listEl.innerHTML = '<div class="empty-state small"><p>No animations applied</p></div>';
            this._clearReapplyMode();
            return;
        }

        listEl.innerHTML = obj.animations.map(anim => {
            const isChain = anim.type === 'chain';
            const icon = isChain ? '<i class="fas fa-link" style="margin-right:4px;opacity:.6"></i>' : '';
            const dur = anim.params?.duration || 0;
            const startSec = Math.max(0, Number(anim.delay || 0) / 1000);
            const endSec = Math.max(startSec, startSec + Math.max(0, Number(dur) || 0));
            const trigLabel = anim.trigger && anim.trigger !== 'onLoad' ? ` <small class="anim-trigger-tag">${anim.trigger}</small>` : '';
            const stepsLabel = isChain && anim.params?.steps ? ` <small class="anim-steps-tag">${anim.params.steps} steps</small>` : '';
            const faceRangeBadge = anim.type === 'face-set-motion'
                ? ` <small class="anim-range-badge">${startSec.toFixed(1)}s-${endSec.toFixed(1)}s</small>`
                : '';
            const propertySummary = this._getAnimationPropertySummary(anim);
            const propsMarkup = propertySummary.length
                ? `<div class="anim-props">${propertySummary.map(label => `<span class="anim-prop-tag">${label}</span>`).join('')}</div>`
                : '';
            const selClass = this.selectedAppliedAnimId === anim.id ? ' selected' : '';
            return `<div class="applied-anim-item${isChain ? ' chain-anim' : ''}${selClass}" data-anim-id="${anim.id}">
                <div class="anim-main">
                    <div class="anim-name-row">
                        <span class="anim-name">${icon}${Utils.escapeHtml(anim.name)}${trigLabel}${stepsLabel}${faceRangeBadge}</span>
                        <span class="anim-duration">${dur}s</span>
                    </div>
                    ${propsMarkup}
                </div>
                <span class="anim-remove" data-anim-id="${anim.id}"><i class="fas fa-times"></i></span>
            </div>`;
        }).join('');

        // Click to select/deselect an applied animation
        listEl.querySelectorAll('.applied-anim-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.anim-remove')) return;
                const animId = item.dataset.animId;
                const wasSelected = this.selectedAppliedAnimId === animId;
                this.selectedAppliedAnimId = wasSelected ? null : animId;

                // Update selected class
                listEl.querySelectorAll('.applied-anim-item').forEach(el => el.classList.remove('selected'));

                if (this.selectedAppliedAnimId) {
                    item.classList.add('selected');
                    // Auto-load animation params into editor and switch to re-apply mode
                    this._loadAppliedAnimForEdit(obj, animId);
                } else {
                    // Deselected — revert to normal Apply mode
                    this._clearReapplyMode();
                }
            });
        });

        // Bind remove
        listEl.querySelectorAll('.anim-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const animId = btn.dataset.animId;
                const anchorAnim = (obj.animations || []).find(a => a.id === animId);
                if (!anchorAnim) return;
                const removals = this._getGroupAppliedAnimationTargets(obj, anchorAnim);
                removals.forEach(({ obj: targetObj, anim }) => {
                    targetObj.animations = (targetObj.animations || []).filter(a => a.id !== anim.id);
                });
                if (this.selectedAppliedAnimId === animId) this._clearReapplyMode();
                this.updateAppliedAnimationsList();
                this.updateCodeOutput();
                eventBus.emit('timeline:update');
                eventBus.emit('history:push');
            });
        });

        // Sync button state with current selection
        this._updateApplyButtonState();
    }

    bindCodePanel() {
        if (this._codePanelBound) return;
        this._codePanelBound = true;

        const codeEl = document.getElementById('code-output');
        if (codeEl) {
            codeEl.setAttribute('contenteditable', 'true');
            codeEl.setAttribute('spellcheck', 'false');
            codeEl.setAttribute('aria-label', 'Editable animation code');
            codeEl.addEventListener('mousedown', (e) => {
                if (e.button !== 2) return;
                // Preserve an insertion point for context-menu paste.
                this._focusCodeEditorAtPoint(e.clientX, e.clientY);
            });
            codeEl.addEventListener('contextmenu', (e) => {
                // Right-click can clear selection/caret in some browsers; restore it.
                this._focusCodeEditorAtPoint(e.clientX, e.clientY);
            });
            codeEl.addEventListener('beforeinput', (e) => {
                const inputType = String(e?.inputType || '');
                if (inputType.startsWith('insert') || inputType.startsWith('delete')) {
                    this._clearCodeGuidanceIfActive();
                }
            });
            codeEl.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = e.clipboardData?.getData('text/plain')
                    || window.clipboardData?.getData('Text')
                    || '';
                this._pasteCodePlainText(text);
            });
        }

        document.getElementById('code-language')?.addEventListener('change', () => {
            this._importedActionPlanActive = false;
            this.updateCodeOutput();
        });
        document.getElementById('btn-cancel-code')?.addEventListener('click', () => {
            if (this._restrictedCodeRun) this._restrictedCodeRun.cancelled = true;
            this._isolatedCodeAbort?.abort();
        });
        document.getElementById('btn-copy-code')?.addEventListener('click', () => this.copyCodeOutput());
        document.getElementById('btn-paste-code')?.addEventListener('click', () => this.pasteCodeFromClipboard());
        document.getElementById('btn-clear-code')?.addEventListener('click', () => this.clearCodeOutput());
        document.getElementById('btn-run-code')?.addEventListener('click', () => this.runCodeOutput('test'));
        document.getElementById('btn-apply-code')?.addEventListener('click', () => this.runCodeOutput('apply'));
        document.getElementById('btn-save-code-template')?.addEventListener('click', () => this.openSaveCodeTemplateDialog());
        document.getElementById('btn-export-code')?.addEventListener('click', () => this.exportCodeOutput());
        document.getElementById('btn-import-action-plan')?.addEventListener('click', () => document.getElementById('import-action-plan-file')?.click());
        document.getElementById('import-action-plan-file')?.addEventListener('change', async event => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (!file) return;
            try { await this.importRestrictedActionPlan(file); }
            catch (error) { Utils.showToast(error.message || 'Action plan import failed.', 'error'); }
        });
        document.getElementById('btn-code-use-character')?.addEventListener('click', () => this.useSelectedCharacterScope());
        document.getElementById('btn-save-selected-motion-template')?.addEventListener('click', () => this.saveSelectedAnimationAsMotionTemplate());
        document.getElementById('btn-open-motion-template-library')?.addEventListener('click', () => {
            if (window.app?.projectDoctor?.openMotionPresetBuilder) {
                window.app.projectDoctor.openMotionPresetBuilder();
            } else {
                Utils.showToast('Motion Presets are not available yet.', 'warning');
            }
        });
        document.getElementById('code-scope-chip')?.addEventListener('click', () => {
            this._codeScopeMode = 'auto';
            this._codeScopeAnchorId = null;
            this.updateCodeScopeChip({ mode: 'auto', targets: this.objects.getSelectedObjects?.() || [] });
            Utils.showToast('Code scope reset to Auto.', 'info');
        });
        document.querySelectorAll('#code-templates .template-item[data-template]').forEach(item => {
            item.addEventListener('click', () => this.insertCodeTemplate(item.dataset.template));
        });
        document.getElementById('saved-code-templates')?.addEventListener('click', (event) => {
            const deleteBtn = event.target.closest?.('[data-delete-code-template]');
            if (deleteBtn) {
                event.stopPropagation();
                this.deleteSavedCodeTemplate(deleteBtn.dataset.deleteCodeTemplate);
                return;
            }
            const item = event.target.closest?.('.template-item[data-saved-template]');
            if (item) this.insertSavedCodeTemplate(item.dataset.savedTemplate);
        });

        this.updateCodeScopeChip();
        this.renderSavedCodeTemplates();
        this._syncCodeGuidanceState();
    }

    _isCodeGuidanceText(text) {
        const t = String(text || '').replace(/\r\n/g, '\n').trim();
        if (!t) return false;
        if (t.startsWith('// Animation code will appear here')) return true;
        if (t.startsWith('// Select an object and apply animations to see generated code')) return true;
        if (t.startsWith('// Select an object, character, or body part on the stage first.')) return true;
        if (t.startsWith('// No animations to export')) return true;
        if (t.startsWith('# No animations to export')) return true;
        if (t.startsWith('# Python code is for copy/export only.')) return true;
        return false;
    }

    _syncCodeGuidanceState() {
        const codeEl = document.getElementById('code-output');
        if (!codeEl) return;
        codeEl.dataset.guidance = this._isCodeGuidanceText(codeEl.textContent) ? '1' : '0';
    }

    _clearCodeGuidanceIfActive() {
        const codeEl = document.getElementById('code-output');
        if (!codeEl || codeEl.dataset.guidance !== '1') return;
        this._setCodeText('');
        codeEl.dataset.guidance = '0';
    }

    _placeCodeCaretAtEnd() {
        const codeEl = document.getElementById('code-output');
        if (!codeEl) return;
        const selection = window.getSelection?.();
        if (!selection) return;
        const range = document.createRange();
        range.selectNodeContents(codeEl);
        range.collapse(false);
        selection.removeAllRanges();
        selection.addRange(range);
    }

    _focusCodeEditorAtPoint(clientX, clientY) {
        const codeEl = document.getElementById('code-output');
        if (!codeEl) return;
        codeEl.focus();

        const selection = window.getSelection?.();
        if (!selection) return;

        let range = null;
        if (document.caretRangeFromPoint) {
            range = document.caretRangeFromPoint(clientX, clientY);
        } else if (document.caretPositionFromPoint) {
            const pos = document.caretPositionFromPoint(clientX, clientY);
            if (pos && pos.offsetNode) {
                range = document.createRange();
                range.setStart(pos.offsetNode, pos.offset);
                range.collapse(true);
            }
        }

        if (!range || !codeEl.contains(range.startContainer)) {
            this._placeCodeCaretAtEnd();
            return;
        }

        selection.removeAllRanges();
        selection.addRange(range);
    }

    _isCodeSelectionInsideEditor() {
        const codeEl = document.getElementById('code-output');
        const selection = window.getSelection?.();
        if (!codeEl || !selection || !selection.rangeCount) return false;
        const range = selection.getRangeAt(0);
        return codeEl.contains(range.startContainer) && codeEl.contains(range.endContainer);
    }

    _pasteCodePlainText(text) {
        const codeEl = document.getElementById('code-output');
        if (!codeEl) return;

        const pasteText = String(text ?? '');
        codeEl.focus();

        const replaceAll = codeEl.dataset.guidance === '1'
            || codeEl.dataset.emptyAnchor === '1'
            || !this._getCodeText().trim()
            || !this._isCodeSelectionInsideEditor();

        if (replaceAll) {
            this._setCodeText(pasteText);
            this._placeCodeCaretAtEnd();
            return;
        }

        const selection = window.getSelection?.();
        if (!selection || !selection.rangeCount) {
            this._setCodeText(pasteText);
            this._placeCodeCaretAtEnd();
            return;
        }

        const range = selection.getRangeAt(0);
        range.deleteContents();
        const node = document.createTextNode(pasteText);
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        codeEl.dataset.guidance = '0';
        codeEl.dataset.emptyAnchor = '0';
    }

    _scopeLabel(mode) {
        if (mode === 'object') return 'Selected Object';
        if (mode === 'character') return 'Selected Character';
        if (mode === 'selection') return 'Selection';
        return 'Auto';
    }

    updateCodeScopeChip(scope = null) {
        const chip = document.getElementById('code-scope-chip');
        if (!chip) return;
        const mode = scope?.mode || this._codeScopeMode || 'auto';
        const count = Number(scope?.targets?.length || 0);
        const suffix = count > 0 ? ` (${count})` : '';
        chip.textContent = `Scope: ${this._scopeLabel(mode)}${suffix}`;
        chip.title = `Current code run scope: ${this._scopeLabel(mode)}${suffix}`;
    }

    useSelectedCharacterScope() {
        const selected = this.objects.getSelectedObjects?.() || [];
        const base = selected[0] || null;
        if (!base) {
            Utils.showToast('Select a character part first, then click Use Selected Character.', 'warning');
            return;
        }
        const parts = this._findCodeCharacterParts(base);
        if (!parts.length) {
            Utils.showToast('Could not resolve character parts from the current selection.', 'warning');
            return;
        }
        const ids = Array.from(new Set(parts.map(p => p?.id).filter(Boolean)));
        if (!ids.length) {
            Utils.showToast('Could not resolve selectable character part IDs.', 'warning');
            return;
        }
        this.objects.select?.(ids);
        this._codeScopeMode = 'character';
        this._codeScopeAnchorId = base.id || null;
        this.updateCodeScopeChip({ mode: 'character', targets: parts });
        Utils.showToast(`Character scope set (${ids.length} parts).`, 'success');
    }

    _resolveCodeScope(mode = 'auto') {
        const selected = this.objects.getSelectedObjects?.() || [];
        const all = this.objects.objects || [];
        const anchor = (this._codeScopeAnchorId && this.objects.getObjectById?.(this._codeScopeAnchorId)) || selected[0] || null;
        const safeMode = mode || 'auto';

        if (safeMode === 'selection') {
            return { mode: 'selection', base: anchor, targets: selected.slice(), characterParts: anchor ? this._findCodeCharacterParts(anchor) : [] };
        }

        if (safeMode === 'object') {
            const target = anchor || null;
            return { mode: 'object', base: target, targets: target ? [target] : [], characterParts: target ? this._findCodeCharacterParts(target) : [] };
        }

        if (safeMode === 'character') {
            const target = anchor || null;
            const parts = target ? this._findCodeCharacterParts(target) : [];
            return { mode: 'character', base: target, targets: parts.length ? parts : (target ? [target] : []), characterParts: parts };
        }

        // Auto mode: if one likely character part is selected, prefer character scope.
        if (selected.length === 1 && this._isLikelyCodeCharacterPart(selected[0])) {
            const parts = this._findCodeCharacterParts(selected[0]);
            if (parts.length > 1) {
                return { mode: 'character', base: selected[0], targets: parts, characterParts: parts };
            }
        }
        if (selected.length > 1) {
            return { mode: 'selection', base: selected[0] || null, targets: selected.slice(), characterParts: selected[0] ? this._findCodeCharacterParts(selected[0]) : [] };
        }
        if (selected.length === 1) {
            return { mode: 'object', base: selected[0], targets: selected.slice(), characterParts: this._findCodeCharacterParts(selected[0]) };
        }
        return { mode: 'auto', base: null, targets: [], characterParts: [], allTargets: all.slice() };
    }

    _promptCodeRunScope() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-modal-overlay';
            overlay.innerHTML = `
                <div class="confirm-modal-box code-scope-modal">
                    <h3>Select Code Run Scope</h3>
                    <p>Run code against your selected part, the full selected character, or all selected objects.</p>
                    <div class="confirm-modal-actions code-scope-actions">
                        <button class="confirm-modal-cancel" data-scope="cancel">Cancel</button>
                        <button class="confirm-modal-cancel" data-scope="object">Selected Part</button>
                        <button class="confirm-modal-confirm" data-scope="character">Selected Character</button>
                        <button class="confirm-modal-cancel" data-scope="selection">All Selected</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            const close = (value) => {
                overlay.remove();
                resolve(value);
            };

            overlay.querySelectorAll('[data-scope]').forEach(btn => {
                btn.addEventListener('click', () => close(btn.getAttribute('data-scope')));
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close('cancel');
            });
        });
    }

    _promptCodeRunNoSelection() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'confirm-modal-overlay';
            overlay.innerHTML = `
                <div class="confirm-modal-box code-scope-modal">
                    <h3>No Selection Found</h3>
                    <p>Select a character part or object, then run code again. You can also run the script on all stage objects.</p>
                    <div class="confirm-modal-actions code-scope-actions">
                        <button class="confirm-modal-cancel" data-action="cancel">Cancel</button>
                        <button class="confirm-modal-confirm" data-action="all">Run On All Objects</button>
                    </div>
                </div>`;
            document.body.appendChild(overlay);

            const close = (value) => {
                overlay.remove();
                resolve(value);
            };

            overlay.querySelectorAll('[data-action]').forEach(btn => {
                btn.addEventListener('click', () => close(btn.getAttribute('data-action')));
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) close('cancel');
            });
        });
    }

    async _resolveCodeScopeForRun() {
        const selected = this.objects.getSelectedObjects?.() || [];
        if (!selected.length) {
            const action = await this._promptCodeRunNoSelection();
            if (action === 'all') {
                const all = this.objects.objects || [];
                const scope = {
                    mode: 'selection',
                    base: all[0] || null,
                    targets: all,
                    characterParts: []
                };
                this.updateCodeScopeChip(scope);
                return scope;
            }
            Utils.showToast('Select a character or object first.', 'warning');
            return null;
        }

        let mode = this._codeScopeMode || 'auto';
        if (mode === 'auto') {
            const choice = await this._promptCodeRunScope();
            if (!choice || choice === 'cancel') return null;
            mode = choice;
            this._codeScopeMode = choice;
            this._codeScopeAnchorId = selected[0]?.id || null;
        }

        const scope = this._resolveCodeScope(mode);
        this.updateCodeScopeChip(scope);
        return scope;
    }

    _getCodeText() {
        const raw = document.getElementById('code-output')?.textContent || '';
        const normalized = raw.replace(/\u200B/g, '');
        return normalized === '\n' ? '' : normalized;
    }

    _setCodeText(code, language = document.getElementById('code-language')?.value || 'javascript') {
        this._importedActionPlanActive = false;
        const codeEl = document.getElementById('code-output');
        if (!codeEl) return;
        if (window.AnimStageHighlight?.apply) {
            window.AnimStageHighlight.apply(codeEl, code, language);
        } else {
            codeEl.textContent = code;
        }
        // Keep a text-node caret anchor when empty so context-menu paste remains reliable.
        if (!String(code || '').length) {
            codeEl.textContent = '\u200B';
            codeEl.dataset.emptyAnchor = '1';
        } else {
            codeEl.dataset.emptyAnchor = '0';
        }
        codeEl.dataset.guidance = this._isCodeGuidanceText(code) ? '1' : '0';
    }

    clearCodeOutput() {
        this._setCodeText('');
        const codeEl = document.getElementById('code-output');
        if (codeEl) {
            codeEl.focus();
            this._placeCodeCaretAtEnd();
        }
        Utils.showToast('Code box cleared', 'info');
    }

    async pasteCodeFromClipboard() {
        if (!navigator.clipboard?.readText) {
            const codeEl = document.getElementById('code-output');
            codeEl?.focus();
            Utils.showToast('Clipboard paste is blocked by this browser. Use right-click Paste or Ctrl+V.', 'warning');
            return;
        }

        try {
            const text = await navigator.clipboard.readText();
            if (!String(text || '').length) {
                Utils.showToast('Clipboard is empty', 'warning');
                return;
            }
            this._setCodeText(text);
            const codeEl = document.getElementById('code-output');
            if (codeEl) {
                codeEl.focus();
                this._placeCodeCaretAtEnd();
            }
            Utils.showToast('Clipboard code pasted', 'success');
        } catch (err) {
            console.warn('[Code Panel] Clipboard paste failed:', err);
            const codeEl = document.getElementById('code-output');
            codeEl?.focus();
            Utils.showToast('Clipboard permission was blocked. Use right-click Paste or Ctrl+V.', 'warning');
        }
    }

    copyCodeOutput() {
        const code = this._getCodeText();
        if (!code.trim()) {
            Utils.showToast('No code to copy', 'warning');
            return;
        }
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(code)
                .then(() => Utils.showToast('Code copied', 'success'))
                .catch(() => this._fallbackCopyCode(code));
        } else {
            this._fallbackCopyCode(code);
        }
    }

    _fallbackCopyCode(code) {
        const ta = document.createElement('textarea');
        ta.value = code;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            Utils.showToast('Code copied', 'success');
        } catch (_) {
            Utils.showToast('Unable to copy code', 'error');
        } finally {
            document.body.removeChild(ta);
        }
    }

    exportCodeOutput() {
        const language = document.getElementById('code-language')?.value || 'javascript';
        const code = this._getCodeText();
        if (!code.trim()) {
            Utils.showToast('No code to export', 'warning');
            return;
        }
        const ext = language === 'json' ? 'json' : language === 'python' ? 'py' : 'js';
        const blob = new Blob([code], { type: language === 'json' ? 'application/json' : language === 'python' ? 'text/x-python' : 'text/javascript' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `animation-stage-code.${ext}`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            URL.revokeObjectURL(a.href);
            document.body.removeChild(a);
        }, 0);
    }

    _validateCodeRunState() {
        // Layer 1: Check if a run is already in progress
        if (this._codeRunLocked) {
            return { ok: false, message: 'Code run in progress. Please wait...' };
        }

        // Layer 2: Check if playback is still running
        if (this.isPlaying || this.isPaused) {
            return { ok: false, message: 'Playback is still active. Click Stop first.' };
        }

        // Layer 3: Check if any dynamic rig properties remain (residual state)
        const hasDynamicProps = (this.objects.objects || []).some(obj => {
            return Object.keys(obj).some(k => 
                /^(?:jointAngle|jointTiltX|jointTiltY|jointCrossOffset|flexPinAngle|flexPinOffset|_jointTransform|_lastAnimatedValue)_\d+$/.test(k)
            );
        });
        if (hasDynamicProps) {
            // This is a recovery scenario - dynamic properties weren't cleaned up
            // Log warning but allow run to proceed (cleanup will happen automatically)
            console.warn('[Safeguard] Detected residual dynamic properties. Will clean up before test.');
        }

        return { ok: true };
    }

    async runCodeOutput(mode = 'test') {
        // --- Safety layer 1: Validate pre-run state ---
        const validation = this._validateCodeRunState();
        if (!validation.ok) {
            Utils.showToast(validation.message, 'warning');
            return;
        }
        
        // --- Safety layer 2: Acquire run lock ---
        this._codeRunLocked = true;
        try {
            return await this._runCodeOutputLocked(mode);
        } finally {
            this._codeRunLocked = false;
        }
    }

    async _runCodeOutputLocked(mode) {
        
        const language = document.getElementById('code-language')?.value || 'javascript';
        const code = this._getCodeText();
        if (!code.trim()) {
            Utils.showToast('No code to run', 'warning');
            this._codeRunLocked = false;
            return;
        }
        if (!['javascript', 'json', 'sandbox'].includes(language)) {
            Utils.showToast('Only JavaScript can run inside the browser stage', 'warning');
            return;
        }

        const runScope = await this._resolveCodeScopeForRun();
        if (!runScope) return;

        const applyMode = mode === 'apply';
        const fingerprint = this._fingerprintCode(code);
        if (applyMode && this._hasAppliedCodeFingerprint(fingerprint)) {
            const proceed = typeof Utils.showConfirm === 'function'
                ? await Utils.showConfirm('This code already appears to be applied to the timeline. Apply it again anyway?', 'Code Already Applied')
                : window.confirm?.('This code already appears to be applied to the timeline. Apply it again anyway?');
            if (!proceed) return;
        }

        if (applyMode) {
            // Cancel any pending test-restore timer so it cannot erase the
            // about-to-be-applied animations after it fires.
            if (this._codeTestRestoreTimer) {
                clearTimeout(this._codeTestRestoreTimer);
                this._codeTestRestoreTimer = null;
            }
            // If a prior test session is still "live" (test was playing and not yet
            // auto-restored), restore the baseline now so that `from` values in the
            // upcoming Apply animation capture the true pre-animation state, not a
            // mid-playback value.
            if (this._lastCodeTestSession) {
                this._restoreCodeTestSession(this._lastCodeTestSession);
                this._lastCodeTestSession = null;
            }
        } else {
            // --- Test mode pre-run cleanup ---
            // Cancel any pending restore timer from a prior test run.
            if (this._codeTestRestoreTimer) {
                clearTimeout(this._codeTestRestoreTimer);
                this._codeTestRestoreTimer = null;
            }
            // Stop any current playback so we return to authored (non-animated) state.
            // This must happen BEFORE restoring the test session, because _endPlayback
            // restores from originalStates (which may hold test animations), and then
            // the session restore removes the test animations on top.
            if (this.isPlaying || this.isPaused) {
                this.stop();
            }
            // CRITICAL: Clear dynamic properties that may have been set by Apply mode
            // playback or previous animations. These (e.g. jointAngle_0 = -88) would
            // otherwise be captured as baseline values in the upcoming snapshot.
            // Regex includes edge case properties: computed transform states, last values
            (this.objects.objects || []).forEach(obj => {
                Object.keys(obj).forEach(k => {
                    if (/^(?:jointAngle|jointTiltX|jointTiltY|jointCrossOffset|flexPinAngle|flexPinOffset|_jointTransform|_lastAnimatedValue)_\d+$/.test(k)) {
                        delete obj[k];
                    }
                });
            });
            // Restore code-test baseline if a previous test session is still pending.
            // This removes the previous run's test animations from obj.animations so the
            // snapshot we're about to take is a truly clean authored state.
            if (this._lastCodeTestSession) {
                this._restoreCodeTestSession(this._lastCodeTestSession);
                this._lastCodeTestSession = null;
            }
        }

        const testSession = applyMode ? null : this._beginCodeTestSession();
        
        this._codeRunMode = applyMode ? 'apply' : 'test';
        this._activeCodeRunId = testSession?.id || null;
        this._activeCodeFingerprint = fingerprint;
        this._activeCodeStartOffsetMs = applyMode && document.getElementById('code-apply-at-cursor')?.checked
            ? Math.max(0, Number(this.currentTime) || 0)
            : 0;
        try {
            if (language === 'sandbox') {
                const controller = new AbortController();
                this._isolatedCodeAbort = controller;
                try {
                    const objects = (runScope.targets || []).map(obj => ({ id: obj.id, name: obj.name,
                        x: obj.x, y: obj.y, width: obj.width, height: obj.height, rotation: obj.rotation }));
                    const plan = await CodeSandbox.run(code, { objects, selectedId: runScope.base?.id || objects[0]?.id }, { signal: controller.signal });
                    if (controller.signal.aborted) throw new Error('Code preparation cancelled.');
                    await this._runRestrictedActions(JSON.stringify(plan), runScope);
                } finally { this._isolatedCodeAbort = null; }
            } else if (language === 'json') {
                await this._runRestrictedActions(code, runScope);
            } else if (/class\s+AnimationStagePlayback/.test(code) && !/\bstage\s*\./.test(code)) {
                const imported = this.importPlaybackCode(code, {
                    mode: applyMode ? 'apply' : 'test',
                    testRunId: testSession?.id || null,
                    codeFingerprint: fingerprint,
                    startOffsetMs: this._activeCodeStartOffsetMs,
                    scope: runScope
                });
                if (imported <= 0) {
                    this._restoreCodeTestSession(testSession);
                    Utils.showToast(this._lastCodeImportIssue || 'No matching stage objects found in the generated code. Select the character or use current object IDs.', 'warning');
                    return;
                }
            } else {
                const stageApi = this.createCodeStageApi(runScope);
                const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
                const fn = new AsyncFunction('stage', 'objects', 'selected', 'app', 'Utils', 'eventBus', code);
                await fn(stageApi, stageApi.objects, stageApi.selected, window.app, Utils, eventBus);
                
                this.stage.requestRender();
                eventBus.emit('object:updated', this.objects.getSelectedObjects()[0] || null);
            }
            if (applyMode) {
                Utils.showToast('Code applied to timeline', 'success');
            } else {
                const previewMs = this._getCodeTestDuration(testSession?.id) || 2500;
                this.seekToStart();
                this.playAll();
                this._scheduleCodeTestRestore(testSession, previewMs);
                Utils.showToast('Testing code on stage only. Nothing was saved to the timeline.', 'info');
            }
        } catch (err) {
            this._restoreCodeTestSession(testSession);
            console.error('[Code Panel] Run failed:', err);
            Utils.showToast(`Code error: ${err?.message || err}`, 'error');
        } finally {
            this._codeRunMode = null;
            this._activeCodeRunId = null;
            this._activeCodeFingerprint = null;
            this._activeCodeStartOffsetMs = 0;
            this._lastCodeRunUnlockTime = Date.now();
        }
    }

    _fingerprintCode(code) {
        const text = String(code || '').replace(/\s+/g, ' ').trim();
        let hash = 2166136261;
        for (let i = 0; i < text.length; i++) {
            hash ^= text.charCodeAt(i);
            hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
        }
        return `code_${(hash >>> 0).toString(36)}`;
    }

    async importRestrictedActionPlan(file) {
        if (this._codeRunLocked) throw new Error('Wait for the current code operation to finish.');
        if (this.isPlaying || this.isPaused || this._lastCodeTestSession) throw new Error('Stop playback and finish the current code test before importing.');
        if (!file || file.size > 1024 * 1024) throw new Error('Choose an action-plan JSON file no larger than 1 MB.');
        this._codeRunLocked = true;
        try {
            const text = (await file.text()).replace(/^\uFEFF/, '');
            if (text.length > 1024 * 1024) throw new Error('Action plan exceeds 1 MB.');
            const plan = JSON.parse(text);
            if (plan?.format !== 'animstage-actions' || plan.version !== 1 || !Array.isArray(plan.actions) || !plan.actions.length || plan.actions.length > 1000) {
                throw new Error('Expected animstage-actions version 1 with 1-1000 actions.');
            }
            const ids = [...new Set(plan.actions.map(action => action?.target))];
            if (ids.some(id => typeof id !== 'string' || !id || id === 'selected')) throw new Error('Imported plans must use explicit object IDs, not selection aliases.');
            const targets = ids.map(id => this.objects.getObjectById(id));
            const missing = ids.filter((id, index) => !targets[index]);
            if (missing.length) throw new Error(`${missing.length} target object(s) are missing from this scene. Restore the recording's starting project and select the correct scene first.`);
            const scope = { mode: 'selection', base: targets[0], targets };
            const summary = await this._runRestrictedActions(text, scope, { validateOnly: true });
            const approved = await Utils.showConfirm(
                `Load ${summary.actionCount} actions for ${targets.length} objects (${(summary.startMs / 1000).toFixed(2)}-${(summary.endMs / 1000).toFixed(2)} s)? This replaces the code editor, selects the targets and uses absolute timeline timing. No animation will be applied.`,
                'Import Action Plan');
            if (!approved) return false;
            if (this.isPlaying || this.isPaused || targets.some(object => this.objects.getObjectById(object.id) !== object)) throw new Error('The scene changed during import. Try again.');
            this.objects.select(ids);
            this._codeScopeMode = 'selection'; this._codeScopeAnchorId = ids[0];
            const language = document.getElementById('code-language');
            if (language) language.value = 'json';
            const cursor = document.getElementById('code-apply-at-cursor');
            if (cursor) cursor.checked = false;
            this._setCodeText(JSON.stringify(plan, null, 2), 'json');
            this._importedActionPlanActive = true;
            this.updateCodeScopeChip(scope);
            Utils.showToast('Action plan loaded. Nothing has been applied.', 'success');
            return true;
        } finally { this._codeRunLocked = false; }
    }

    async _runRestrictedActions(code, scope, options = {}) {
        if (code.length > 1024 * 1024) throw new Error('Restricted action plan exceeds 1 MB.');
        const plan = JSON.parse(code);
        if (plan?.format !== 'animstage-actions' || plan.version !== 1 ||
            !Array.isArray(plan.actions) || !plan.actions.length || plan.actions.length > 1000) {
            throw new Error('Expected animstage-actions version 1 with 1-1000 actions.');
        }
        const targets = new Map((scope.targets || []).map(obj => [obj.id, obj]));
        const token = { cancelled: false }, started = Date.now(), pending = new Map();
        this._restrictedCodeRun = token;
        const number = (value, min, max, label) => {
            if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error(`Invalid ${label}.`);
            return value;
        };
        try {
            for (let i = 0; i < plan.actions.length; i++) {
                if (i % 25 === 0) await new Promise(resolve => setTimeout(resolve, 0));
                if (token.cancelled) throw new Error('Action preparation cancelled. Nothing was added.');
                if (Date.now() - started > 5000) throw new Error('Action preparation timed out. Nothing was added.');
                const action = plan.actions[i];
                const obj = action?.target === 'selected' ? scope.base || scope.targets?.[0] : targets.get(action?.target);
                if (!obj || !targets.has(obj.id) || this.objects.getObjectById(obj.id) !== obj) throw new Error(`Action ${i + 1} targets an object outside the current selection.`);
                const property = action.property;
                if (typeof property !== 'string' || !/^(?:x|y|width|height|rotation|opacity|scale[XY]|tilt[XY]|joint(?:Angle|Tilt[XY]|CrossOffset)_\d+|flexPin(?:Angle|Offset)_\d+)$/.test(property) ||
                    !this._isCodeAnimationPropertySupported(obj, property)) throw new Error(`Unsupported action property: ${property}`);
                const from = number(action.from, -1e6, 1e6, 'from'), to = number(action.to, -1e6, 1e6, 'to');
                if (property === 'opacity' && [from, to].some(v => v < 0 || v > 1)) throw new Error('Opacity must be between 0 and 1.');
                if (/^(width|height)$/.test(property) && Math.min(from, to) <= 0) throw new Error('Dimensions must be positive.');
                if (/^scale/.test(property) && from * to <= 0) throw new Error('Scale cannot cross zero within an action.');
                const duration = number(action.durationMs, 1, 3600000, 'durationMs');
                const delay = number(action.delayMs ?? 0, 0, 86400000, 'delayMs');
                const easing = action.easing || 'linear';
                if (!['linear', 'easeInOut', 'easeInOutQuad', 'easeInQuad', 'easeOutQuad'].includes(easing)) throw new Error('Unsupported easing.');
                const list = pending.get(obj) || [];
                list.push({ id: Utils.generateId('anim'), type: 'custom-code', name: `Action ${property}`,
                    params: { duration: duration / 1000, codeFingerprint: this._activeCodeFingerprint },
                    delay: delay + (options.validateOnly ? 0 : (this._activeCodeStartOffsetMs || 0)), repeat: 0, repeatMode: 'restart', trigger: 'onLoad',
                    generated: [{ property, from, to, duration, easing }], _codeTestRunId: this._activeCodeRunId || undefined });
                pending.set(obj, list);
            }
            if (options.validateOnly) {
                const tracks = [...pending.values()].flat();
                return { actionCount: tracks.length, startMs: Math.min(...tracks.map(track => track.delay)),
                    endMs: Math.max(...tracks.map(track => track.delay + track.generated[0].duration)) };
            }
            // Publish only after the entire bounded data plan validates. No imported code runs.
            const originals = new Map([...pending.keys()].map(obj => [obj, obj.animations]));
            try {
                for (const [obj, additions] of pending) {
                    if (this.objects.getObjectById(obj.id) !== obj) throw new Error('Scene changed during preparation.');
                    obj.animations = [...(obj.animations || []), ...additions];
                }
                this.stage.requestRender();
                eventBus.emit('timeline:update');
                if (this._codeRunMode !== 'test') eventBus.emit('history:push');
            } catch (error) {
                for (const [obj, animations] of originals) obj.animations = animations;
                throw error;
            }
            if (this._codeRunMode !== 'test') {
                const actions = [...pending].flatMap(([obj, tracks]) => tracks.map(track => {
                    const config = track.generated[0];
                    return { target: obj.id, property: config.property, from: config.from, to: config.to,
                        durationMs: config.duration, delayMs: track.delay, easing: config.easing };
                }));
                this.objects.recordPropertyReplayPlan?.({ format: 'animstage-actions', version: 1, actions });
            }
        } finally { if (this._restrictedCodeRun === token) this._restrictedCodeRun = null; }
    }

    _hasAppliedCodeFingerprint(fingerprint) {
        if (!fingerprint) return false;
        return (this.objects.objects || []).some(obj =>
            (obj.animations || []).some(anim => anim?.params?.codeFingerprint === fingerprint)
        );
    }

    _cloneCodeTestValue(value) {
        if (value === undefined || value === null) return value;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (_) {
            return value;
        }
    }

    _beginCodeTestSession() {
        const id = Utils.generateId ? Utils.generateId('code_test') : `code_test_${Date.now()}`;
        // Cancel any pending restore timer from a previous test so we start clean.
        if (this._codeTestRestoreTimer) {
            clearTimeout(this._codeTestRestoreTimer);
            this._codeTestRestoreTimer = null;
        }
        // If a previous test session is still pending restore, dismiss it silently
        // so we don't carry stale state into the new session.
        this._lastCodeTestSession = null;

        const objectStates = new Map();
        let totalAnims = 0;
        (this.objects.objects || []).forEach(obj => {
            // Capture all standard transform properties.
            const snap = {
                animations: this._cloneCodeTestValue(obj.animations || []),
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation,
                opacity: obj.opacity,
                scaleX: obj.scaleX,
                scaleY: obj.scaleY,
                tiltX: obj.tiltX,
                tiltY: obj.tiltY,
                pinBaseTiltX: obj.pinBaseTiltX,
                pinBaseTiltY: obj.pinBaseTiltY,
                pinRotationOffset: obj.pinRotationOffset,
                visible: obj.visible,
                joints: this._cloneCodeTestValue(obj.joints),
                flexPins: this._cloneCodeTestValue(obj.flexPins),
                // Capture dynamic rig shortcut properties (jointAngle_n, flexPinAngle_n, etc.)
                // that the animation engine writes directly onto the object at runtime.
                _dynProps: {}
            };
            Object.keys(obj).forEach(k => {
                if (/^(?:jointAngle|jointTiltX|jointTiltY|jointCrossOffset|flexPinAngle|flexPinOffset)_\d+$/.test(k)) {
                    snap._dynProps[k] = obj[k];
                }
            });
            totalAnims += snap.animations.length;
            objectStates.set(obj.id, snap);
        });
        const session = { id, objectStates, currentTime: this.currentTime || 0, wasPlaying: !!this.isPlaying };
        this._lastCodeTestSession = session;
        return session;
    }

    _restoreCodeTestSession(session) {
        if (!session) return;
        if (this._codeTestRestoreTimer) {
            clearTimeout(this._codeTestRestoreTimer);
            this._codeTestRestoreTimer = null;
        }
        if (this._lastCodeTestSession === session) {
            this._lastCodeTestSession = null;
        }
        this.stop();
        (this.objects.objects || []).forEach(obj => {
            // CRITICAL: Clear all dynamic rig properties FIRST before restoring
            // from snapshot, otherwise residual animated values (e.g. jointAngle_0 = -88)
            // will persist and be treated as baseline in the next test.
            const propsToDelete = Object.keys(obj).filter(k =>
                /^(?:jointAngle|jointTiltX|jointTiltY|jointCrossOffset|flexPinAngle|flexPinOffset)_\d+$/.test(k)
            );
            propsToDelete.forEach(k => {
                delete obj[k];
            });
            
            const state = session.objectStates.get(obj.id);
            if (!state) {
                obj.animations = (obj.animations || []).filter(anim => anim?._codeTestRunId !== session.id);
                return;
            }
            Object.assign(obj, {
                x: state.x,
                y: state.y,
                width: state.width,
                height: state.height,
                rotation: state.rotation,
                opacity: state.opacity,
                scaleX: state.scaleX,
                scaleY: state.scaleY,
                tiltX: state.tiltX,
                tiltY: state.tiltY,
                pinBaseTiltX: state.pinBaseTiltX,
                pinBaseTiltY: state.pinBaseTiltY,
                pinRotationOffset: state.pinRotationOffset,
                visible: state.visible
            });
            // Restore dynamic rig shortcut properties.
            if (state._dynProps) {
                Object.assign(obj, state._dynProps);
            }
            obj.joints = this._cloneCodeTestValue(state.joints);
            obj.flexPins = this._cloneCodeTestValue(state.flexPins);
            obj.animations = this._cloneCodeTestValue(state.animations || []);
        });
        this.currentTime = session.currentTime || 0;
        this.stage.requestRender();
        eventBus.emit('timeline:update');
        eventBus.emit('object:updated', this.objects.getSelectedObjects?.()[0] || null);
    }

    _scheduleCodeTestRestore(session, previewMs) {
        if (!session) return;
        this._codeTestRestoreTimer = setTimeout(() => {
            // Only restore if this session is still the active one — if Apply was
            // clicked in the meantime, _lastCodeTestSession will have been cleared
            // and the timer already cancelled; this guard is a safety fallback.
            if (this._lastCodeTestSession === session) {
                this._restoreCodeTestSession(session);
                Utils.showToast('Code test finished. Timeline was not changed.', 'info');
            }
        }, Math.max(800, Math.min(30000, Number(previewMs) || 2500)) + 700);
    }

    _getCodeTestDuration(testRunId) {
        let maxEnd = 0;
        (this.objects.objects || []).forEach(obj => {
            (obj.animations || []).forEach(anim => {
                if (testRunId && anim?._codeTestRunId !== testRunId) return;
                const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim.generated);
                configs.filter(Boolean).forEach(cfg => {
                    maxEnd = Math.max(maxEnd, (anim.delay || 0) + (cfg._stepDelay || 0) + (cfg.duration || anim.params?.duration * 1000 || 1000));
                });
            });
        });
        return maxEnd;
    }

    createCodeStageApi(scope = null) {
        const engine = this;
        const manager = this.objects;
        const effectiveScope = scope || this._resolveCodeScope(this._codeScopeMode || 'auto');
        const scopeTargets = Array.isArray(effectiveScope.targets) && effectiveScope.targets.length
            ? effectiveScope.targets.filter(Boolean)
            : (manager.getSelectedObjects?.() || []);
        const scopeTargetIds = new Set(scopeTargets.map(obj => obj?.id).filter(Boolean));
        const scopeBase = effectiveScope.base || scopeTargets[0] || null;

        const normalizeTargets = (target) => {
            if (!target) return [];
            if (target._codeTargets) return target._codeTargets.filter(Boolean);
            if (target._codeObject) return [target._codeObject].filter(Boolean);
            if (Array.isArray(target)) {
                return target.flatMap(item => normalizeTargets(item));
            }
            if (target === 'scope') {
                return scopeTargets.slice();
            }
            if (typeof target === 'string') {
                const found = manager.getObjectById?.(target)
                    || manager.objects.find(obj => obj.name === target)
                    || manager.objects.find(obj => String(obj.name || '').toLowerCase() === target.toLowerCase());
                return found ? [found] : [];
            }
            if (target.id) return [target];
            return [];
        };
        const wrap = (obj) => {
            if (!obj) return null;
            return {
                _codeObject: obj,
                get id() { return obj.id; },
                get name() { return obj.name; },
                get raw() { return obj; },
                set(props = {}) { engine._applyCodeProperties([obj], props); return this; },
                animate(props = {}) { engine._applyCodeAnimation([obj], props); return this; },
                moveBy(dx = 0, dy = 0, duration = 1) {
                    engine._applyCodeAnimation([obj], { x: (obj.x || 0) + dx, y: (obj.y || 0) + dy, duration });
                    return this;
                },
                rotateBy(deg = 0, duration = 1) {
                    engine._applyCodeAnimation([obj], { rotation: (obj.rotation || 0) + deg, duration });
                    return this;
                }
            };
        };
        const wrapMany = (targets) => {
            const list = targets.filter(Boolean);
            return {
                _codeTargets: list,
                get raw() { return list; },
                get length() { return list.length; },
                at(index = 0) { return wrap(list[index]); },
                set(props = {}) { engine._applyCodeProperties(list, props); return this; },
                animate(props = {}) { engine._applyCodeAnimation(list, props); return this; },
                forEach(fn) { list.forEach((obj, index) => fn(wrap(obj), index, obj)); return this; },
                part(key) {
                    const parts = engine._findCodeCharacterParts(list[0]);
                    return wrap(engine._findBestCodePart(parts, key));
                },
                parts(key) {
                    const parts = engine._findCodeCharacterParts(list[0]);
                    if (!key) return wrapMany(parts);
                    const ranked = engine._rankCodePartMatches(parts, key).map(entry => entry.obj);
                    return wrapMany(ranked);
                }
            };
        };
        return {
            get objects() { return manager.objects.map(wrap); },
            get selected() { return wrap(scopeTargets[0] || manager.getSelectedObjects?.()[0] || null); },
            get selection() { return wrapMany(scopeTargets.length ? scopeTargets : (manager.getSelectedObjects?.() || [])); },
            get all() { return wrapMany(manager.objects || []); },
            getObject(idOrName) { return wrap(normalizeTargets(idOrName)[0]); },
            object(idOrName) { return wrap(normalizeTargets(idOrName)[0]); },
            find(name) { return wrap(normalizeTargets(name)[0]); },
            select(idsOrTargets) {
                const ids = normalizeTargets(idsOrTargets).map(obj => obj.id);
                manager.select?.(ids);
                return wrapMany(manager.getSelectedObjects?.() || []);
            },
            character(target) {
                const base = normalizeTargets(target)[0]
                    || scopeBase
                    || manager.getSelectedObjects?.()[0]
                    || null;
                return wrapMany(engine._findCodeCharacterParts(base));
            },
            set(target, props) { engine._applyCodeProperties(normalizeTargets(target), props); return this; },
            animate(target, props) { engine._applyCodeAnimation(normalizeTargets(target), props); return this; },
            play() { engine.seekToStart(); engine.playAll(); return this; },
            pause() { engine.pause(); return this; },
            stop() { engine.stop(); return this; },
            render() { engine.stage.requestRender(); return this; },
            scope() {
                return {
                    mode: effectiveScope.mode,
                    count: scopeTargets.length,
                    ids: Array.from(scopeTargetIds)
                };
            }
        };
    }

    _normalizeCodeMatchText(value) {
        return String(value || '')
            .toLowerCase()
            .replace(/[–—]/g, '-')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

    _getCodePartAliases(value) {
        if (window.BodyPartRoles?.getAliases) {
            const sharedAliases = window.BodyPartRoles.getAliases(value);
            if (sharedAliases.length) return sharedAliases;
        }
        const raw = String(value || '').toLowerCase().replace(/[–—]/g, '-').trim();
        const headline = raw.split(/\s*[-:]\s*/)[0] || raw;
        const aliases = new Set([
            this._normalizeCodeMatchText(raw),
            this._normalizeCodeMatchText(headline)
        ]);
        const add = (...items) => items.forEach(item => {
            const normalized = this._normalizeCodeMatchText(item);
            if (normalized) aliases.add(normalized);
        });

        if (/\b(torso|trunk|body)\b/.test(raw)) add('torso', 'trunk', 'body');
        if (/\b(head\s*neck|head-neck|head|neck)\b/.test(raw)) add('head-neck', 'head neck', 'head', 'neck');
        if (/\b(right|front)\b.*\barm\b/.test(raw) || /\barm\b.*\b(right|front)\b/.test(raw)) add('right-arm', 'right arm', 'front-arm', 'front arm');
        if (/\b(left|back)\b.*\barm\b/.test(raw) || /\barm\b.*\b(left|back)\b/.test(raw)) add('left-arm', 'left arm', 'back-arm', 'back arm');
        if (/\b(right|front)\b.*\bleg\b/.test(raw) || /\bleg\b.*\b(right|front)\b/.test(raw)) add('right-leg', 'right leg', 'front-leg', 'front leg');
        if (/\b(left|back)\b.*\bleg\b/.test(raw) || /\bleg\b.*\b(left|back)\b/.test(raw)) add('left-leg', 'left leg', 'back-leg', 'back leg');
        if (/\bmouth|lip\b/.test(raw)) add('mouth', 'face-mouth', 'lip', 'lips');
        if (/\beye\b/.test(raw)) add('eye', 'eyes');
        if (/\bbrow|eyebrow\b/.test(raw)) add('brow', 'eyebrow', 'brows', 'eyebrows');

        return Array.from(aliases).filter(Boolean);
    }

    _matchesCodePart(obj, key) {
        if (window.BodyPartRoles?.matches?.(obj, key)) return true;
        const needles = this._getCodePartAliases(key);
        if (!needles.length) return false;
        const hay = [
            obj?.name,
            obj?._armatureRoleKey,
            obj?._armaturePartKey,
            obj?.bodyPartData?.partKey,
            obj?.bodyPartData?.jointName,
            ...(Array.isArray(obj?.tags) ? obj.tags : [])
        ].flatMap(v => this._getCodePartAliases(v));
        if (!hay.length) return false;

        const intent = this._inferCodePartIntent(key);
        if (intent === 'arm' && !hay.some(v => /arm/.test(v))) return false;
        if (intent === 'leg' && !hay.some(v => /leg/.test(v))) return false;
        if (intent === 'eye' && !hay.some(v => /eye/.test(v))) return false;
        if (intent === 'mouth' && !hay.some(v => /mouth|lip/.test(v))) return false;

        return needles.some(needle => hay.some(value => (
            value === needle
            || (needle.length >= 6 && value.length >= 6 && value.includes(needle))
            || (needle.length >= 6 && value.length >= 6 && needle.includes(value))
        )));
    }

    _inferCodePartIntent(value) {
        const raw = this._normalizeCodeMatchText(value || '');
        if (/arm/.test(raw)) return 'arm';
        if (/leg/.test(raw)) return 'leg';
        if (/eye/.test(raw)) return 'eye';
        if (/mouth|lip/.test(raw)) return 'mouth';
        if (/brow/.test(raw)) return 'brow';
        return 'generic';
    }

    _scoreCodePartMatch(obj, key) {
        let score = 0;
        if (window.BodyPartRoles?.score) {
            score = Math.max(score, window.BodyPartRoles.score(obj, key));
        }
        const intent = this._inferCodePartIntent(key);
        const name = this._normalizeCodeMatchText(obj?.name || '');
        const role = this._normalizeCodeMatchText(obj?._armatureRoleKey || obj?._armaturePartKey || obj?.bodyPartData?.partKey || obj?.bodyPartData?.jointName || '');
        const text = `${name} ${role}`.trim();
        const jointsCount = Array.isArray(obj?.joints) ? obj.joints.length : 0;
        const flexCount = Array.isArray(obj?.flexPins) ? obj.flexPins.length : 0;

        if (intent === 'arm') {
            if (/arm/.test(text)) score += 70;
            if (/right|front/.test(this._normalizeCodeMatchText(key)) && /right|front/.test(text)) score += 25;
            if (/left|back/.test(this._normalizeCodeMatchText(key)) && /left|back/.test(text)) score += 25;
            if (/eye|brow|mouth|lip/.test(text)) score -= 120;
        }
        if (intent === 'leg') {
            if (/leg/.test(text)) score += 70;
            if (/right|front/.test(this._normalizeCodeMatchText(key)) && /right|front/.test(text)) score += 25;
            if (/left|back/.test(this._normalizeCodeMatchText(key)) && /left|back/.test(text)) score += 25;
            if (/eye|brow|mouth|lip|arm/.test(text)) score -= 80;
        }
        if (intent === 'eye' && /eye/.test(text)) score += 80;
        if (intent === 'mouth' && /mouth|lip/.test(text)) score += 80;

        score += Math.min(40, jointsCount * 10);
        if (jointsCount > 0) score += 30;
        if (flexCount > 0) score += 8;
        if (obj?._armatureRoleKey || obj?._armaturePartKey || obj?.bodyPartData?.partKey) score += 6;

        return score;
    }

    _rankCodePartMatches(parts, key) {
        return (parts || [])
            .filter(obj => this._matchesCodePart(obj, key))
            .map(obj => ({ obj, score: this._scoreCodePartMatch(obj, key) }))
            .sort((a, b) => b.score - a.score);
    }

    _findBestCodePart(parts, key) {
        const ranked = this._rankCodePartMatches(parts, key);
        return ranked[0]?.obj || null;
    }

    _findCodeCharacterParts(baseObj) {
        if (!baseObj) return [];
        const all = this.objects.objects || [];
        if (window.BodyPartRoles?.findCharacterParts) {
            const sharedParts = window.BodyPartRoles.findCharacterParts(all, baseObj);
            if (sharedParts.length > 1) return sharedParts;
        }
        if (baseObj.groupId) {
            const grouped = all.filter(obj => obj.groupId === baseObj.groupId);
            if (grouped.length) return grouped;
        }
        const rootOf = (obj) => {
            let current = obj;
            const seen = new Set();
            while (current?.pinnedTo && !seen.has(current.id)) {
                seen.add(current.id);
                const parent = this.objects.getObjectById?.(current.pinnedTo);
                if (!parent) break;
                current = parent;
            }
            return current || obj;
        };
        const root = rootOf(baseObj);
        const byRoot = all.filter(obj => rootOf(obj)?.id === root.id);
        if (byRoot.length > 1) return byRoot;
        const role = baseObj._armatureRoleKey || baseObj._armaturePartKey || baseObj.bodyPartData?.partKey;
        if (role) {
            const related = all.filter(obj => obj === baseObj || obj.groupId === baseObj.groupId || obj.pinnedTo === baseObj.pinnedTo);
            const characterParts = all.filter(obj => this._isLikelyCodeCharacterPart(obj));
            if (characterParts.includes(baseObj) && characterParts.length > related.length) return characterParts;
            return related;
        }
        return [baseObj];
    }

    _isLikelyCodeCharacterPart(obj) {
        if (!obj) return false;
        if (window.BodyPartRoles?.resolveObjectRole?.(obj)) return true;
        if (obj._armatureRoleKey || obj._armaturePartKey || obj.bodyPartData?.partKey || obj.bodyPartData?.jointName) return true;
        return /\b(torso|trunk|head|neck|arm|leg|hand|foot|mouth|eye|brow)\b/i.test(String(obj.name || ''));
    }

    _applyCodeProperties(targets, props = {}) {
        targets.filter(Boolean).forEach(obj => {
            Object.entries(props || {}).forEach(([key, value]) => {
                if (key === 'duration' || key === 'delay' || key === 'easing' || key === 'repeat') return;
                if (key in obj || ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'scaleX', 'scaleY', 'fill', 'stroke', 'visible', 'tiltX', 'tiltY'].includes(key)) {
                    obj[key] = value;
                }
            });
        });
        this.stage.requestRender();
        eventBus.emit('timeline:update');
        if (this._codeRunMode !== 'test') {
            eventBus.emit('history:push');
            this.updateCodeOutput();
        }
    }

    _applyCodeAnimation(targets, props = {}) {
        const durationMs = this._normalizeCodeDuration(props.duration ?? 1);
        const delayMs = this._normalizeCodeDuration(props.delay ?? 0);
        const easing = props.easing || 'easeInOut';
        const repeat = Math.max(0, parseInt(props.repeat || 0, 10));
        const staticAllowed = ['x', 'y', 'width', 'height', 'rotation', 'opacity', 'scaleX', 'scaleY', 'tiltX', 'tiltY', 'pinBaseTiltX', 'pinBaseTiltY', 'pinRotationOffset'];
        const metaKeys = new Set(['name', 'duration', 'delay', 'easing', 'repeat', 'repeatMode', 'trigger']);

        // Accept both standard transform props and rig-specific dynamic props.
        const allowed = Object.keys(props || {}).filter(prop => {
            if (metaKeys.has(prop)) return false;
            if (staticAllowed.includes(prop)) return true;
            return /^joint(?:Angle|Tilt[XY]|CrossOffset)_\d+$/.test(prop)
                || /^flexPin(?:Angle|Offset|Tilt[XY])?_\d+$/.test(prop);
        });

        targets.filter(Boolean).forEach(obj => {
            const generated = [];
            allowed.forEach(prop => {
                if (!this._isCodeAnimationPropertySupported(obj, prop)) return;
                const from = Number(obj[prop] ?? (prop === 'scaleX' || prop === 'scaleY' || prop === 'opacity' ? 1 : 0));
                const to = Number(props[prop]);
                if (!Number.isFinite(to)) return;
                generated.push({ property: prop, from, to, duration: durationMs, easing });
            });
            if (!generated.length) return;
            obj.animations = obj.animations || [];
            obj.animations.push({
                id: Utils.generateId ? Utils.generateId('anim') : `anim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                type: 'custom-code',
                name: props.name || `Code (${generated.map(cfg => cfg.property).join('+')})`,
                params: { ...props, duration: durationMs / 1000, delay: delayMs / 1000, codeFingerprint: this._activeCodeFingerprint || undefined },
                delay: delayMs + (this._activeCodeStartOffsetMs || 0),
                repeat,
                repeatMode: props.repeatMode || 'restart',
                trigger: props.trigger || 'onLoad',
                generated,
                _codeTestRunId: this._activeCodeRunId || undefined
            });
        });
        eventBus.emit('animation:applied', { type: 'custom-code', objects: targets });
        eventBus.emit('timeline:update');
        if (this._codeRunMode !== 'test') {
            eventBus.emit('history:push');
            this.updateAppliedAnimationsList();
            this.updateCodeOutput();
        }
    }

    _normalizeCodeDuration(value) {
        const n = Math.max(0, Number(value) || 0);
        return n > 20 ? n : n * 1000;
    }

    importPlaybackCode(code, options = {}) {
        this._lastCodeImportIssue = null;
        const playbackCode = this._extractPlaybackClassBlock(code) || code;
        let PlaybackClass = null;
        let playbackAnimations = [];
        try {
            PlaybackClass = new Function(`${playbackCode}\n; return typeof AnimationStagePlayback !== 'undefined' ? AnimationStagePlayback : null;`)();
        } catch (err) {
            playbackAnimations = this._extractPlaybackAnimations(playbackCode);
            if (!playbackAnimations.length) {
                throw new Error(`Generated playback code could not be parsed: ${err.message || err}`);
            }
        }

        if (typeof PlaybackClass === 'function' && !playbackAnimations.length) {
            const fakeCanvas = { getContext: () => ({}) };
            const playback = new PlaybackClass(fakeCanvas);
            playbackAnimations = Array.isArray(playback.animations) ? playback.animations : [];
        }
        if (!playbackAnimations.length) return 0;

        const labelById = this._extractPlaybackObjectLabels(playbackCode);
        const scopedBase = options.scope?.base || this.objects.getSelectedObjects?.()[0] || null;
        const selectedParts = options.scope?.characterParts || this._findCodeCharacterParts(scopedBase);
        let importedCount = 0;
        let unsupportedCount = 0;
        let unmatchedCount = 0;

        playbackAnimations.forEach(entry => {
            const target = this._resolvePlaybackCodeTarget(entry.objectId, labelById.get(entry.objectId), selectedParts);
            if (!target || !entry.property) {
                unmatchedCount++;
                return;
            }
            if (!this._isCodeAnimationPropertySupported(target, entry.property)) {
                unsupportedCount++;
                return;
            }
            const keyframes = Array.isArray(entry.keyframes)
                ? entry.keyframes
                    .map(kf => ({ t: Math.max(0, Math.min(1, Number(kf.t) || 0)), value: Number(kf.value) }))
                    .filter(kf => Number.isFinite(kf.value))
                    .sort((a, b) => a.t - b.t)
                : [];
            if (keyframes.length < 2) {
                const from = Number(entry.from);
                const to = Number(entry.to);
                if (Number.isFinite(from) && Number.isFinite(to)) {
                    keyframes.push({ t: 0, value: from }, { t: 1, value: to });
                }
            }
            if (keyframes.length < 2) return;

            const duration = Math.max(1, Number(entry.duration) || 1000);
            target.animations = target.animations || [];
            target.animations.push({
                id: Utils.generateId ? Utils.generateId('anim') : `anim_${Date.now()}_${Math.random().toString(36).slice(2)}`,
                type: 'custom-code',
                name: `Code ${labelById.get(entry.objectId) || target.name || entry.property}`,
                params: {
                    duration: duration / 1000,
                    delay: (Number(entry.delay) || 0) / 1000,
                    importedFromCode: true,
                    codeFingerprint: options.codeFingerprint || undefined
                },
                delay: Math.max(0, Number(entry.delay) || 0) + (Number(options.startOffsetMs) || 0),
                repeat: Math.max(0, Number(entry.repeat) || 0),
                repeatMode: entry.repeatMode || 'restart',
                trigger: entry.trigger || 'onLoad',
                generated: [{
                    property: entry.property,
                    from: keyframes[0].value,
                    to: keyframes[keyframes.length - 1].value,
                    duration,
                    easing: entry.easing || 'easeInOut',
                    keyframes
                }],
                _codeTestRunId: options.testRunId || undefined
            });
            importedCount++;
        });

        if (importedCount > 0) {
            eventBus.emit('animation:applied', { type: 'custom-code-import', objects: this.objects.getSelectedObjects?.() || [] });
            eventBus.emit('timeline:update');
            if (options.mode !== 'test') {
                eventBus.emit('history:push');
                this.updateAppliedAnimationsList();
                this.updateCodeOutput();
            }
        }
        if (!importedCount && unsupportedCount > 0) {
            this._lastCodeImportIssue = `${unsupportedCount} generated code animation(s) were skipped because they target joint/flex properties on objects without those controls. Select rigged body parts for jointAngle code, or use x/y/rotation/scale for face parts.`;
        } else if (!importedCount && unmatchedCount > 0) {
            this._lastCodeImportIssue = 'No matching stage objects found in the generated code. Select the character or use current object IDs.';
        }
        return importedCount;
    }

    _isCodeAnimationPropertySupported(obj, property) {
        const prop = String(property || '');
        if (/^joint(?:Angle|Tilt[XY]|CrossOffset)_\d+$/.test(prop)) {
            return Array.isArray(obj?.joints) && obj.joints.length > 0;
        }
        if (/^flexPin(?:Angle|Offset|Tilt[XY])?_\d+$/.test(prop)) {
            return Array.isArray(obj?.flexPins) && obj.flexPins.length > 0;
        }
        return true;
    }

    _extractPlaybackClassBlock(code) {
        let text = String(code || '').replace(/^\s*```(?:javascript|js)?\s*/i, '').replace(/\s*```\s*$/i, '');
        const classIndex = text.search(/class\s+AnimationStagePlayback\b/);
        if (classIndex < 0) return text.trim();
        const braceIndex = text.indexOf('{', classIndex);
        if (braceIndex < 0) return text.slice(classIndex).trim();
        const endIndex = this._findBalancedCodeEnd(text, braceIndex, '{', '}');
        return endIndex > braceIndex ? text.slice(classIndex, endIndex + 1).trim() : text.slice(classIndex).trim();
    }

    _findBalancedCodeEnd(text, startIndex, openChar, closeChar) {
        let depth = 0;
        let quote = '';
        let escaped = false;
        let lineComment = false;
        let blockComment = false;
        for (let i = startIndex; i < text.length; i++) {
            const ch = text[i];
            const next = text[i + 1];
            if (lineComment) {
                if (ch === '\n' || ch === '\r') lineComment = false;
                continue;
            }
            if (blockComment) {
                if (ch === '*' && next === '/') {
                    blockComment = false;
                    i++;
                }
                continue;
            }
            if (quote) {
                if (escaped) {
                    escaped = false;
                } else if (ch === '\\') {
                    escaped = true;
                } else if (ch === quote) {
                    quote = '';
                }
                continue;
            }
            if (ch === '/' && next === '/') {
                lineComment = true;
                i++;
                continue;
            }
            if (ch === '/' && next === '*') {
                blockComment = true;
                i++;
                continue;
            }
            if (ch === '"' || ch === "'" || ch === '`') {
                quote = ch;
                continue;
            }
            if (ch === openChar) depth++;
            if (ch === closeChar) {
                depth--;
                if (depth === 0) return i;
            }
        }
        return -1;
    }

    _extractPlaybackAnimations(code) {
        const animations = [];
        const text = String(code || '');
        const pushPattern = /this\.animations\.push\s*\(/g;
        let match;
        while ((match = pushPattern.exec(text))) {
            const objectStart = text.indexOf('{', match.index);
            if (objectStart < 0) continue;
            const objectEnd = this._findBalancedCodeEnd(text, objectStart, '{', '}');
            if (objectEnd <= objectStart) continue;
            const block = text.slice(objectStart, objectEnd + 1);
            const entry = this._parsePlaybackAnimationBlock(block);
            if (entry) animations.push(entry);
            pushPattern.lastIndex = objectEnd + 1;
        }
        return animations;
    }

    _parsePlaybackAnimationBlock(block) {
        const readString = (name) => {
            const match = new RegExp(`${name}\\s*:\\s*['"]([^'"]+)['"]`).exec(block);
            return match ? match[1] : '';
        };
        const readNumber = (name, fallback = 0) => {
            const match = new RegExp(`${name}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)`).exec(block);
            return match ? Number(match[1]) : fallback;
        };
        const objectId = readString('objectId');
        const property = readString('property');
        if (!objectId || !property) return null;
        const keyframes = [];
        const keyframesIndex = block.search(/keyframes\s*:/);
        if (keyframesIndex >= 0) {
            const arrayStart = block.indexOf('[', keyframesIndex);
            const arrayEnd = arrayStart >= 0 ? this._findBalancedCodeEnd(block, arrayStart, '[', ']') : -1;
            const keyframeText = arrayEnd > arrayStart ? block.slice(arrayStart + 1, arrayEnd) : '';
            const kfPattern = /\{\s*t\s*:\s*(-?\d+(?:\.\d+)?)\s*,\s*value\s*:\s*(-?\d+(?:\.\d+)?)\s*\}/g;
            let kf;
            while ((kf = kfPattern.exec(keyframeText))) {
                keyframes.push({ t: Number(kf[1]), value: Number(kf[2]) });
            }
        }
        if (keyframes.length < 2) {
            const from = readNumber('from', NaN);
            const to = readNumber('to', NaN);
            if (Number.isFinite(from) && Number.isFinite(to)) {
                keyframes.push({ t: 0, value: from }, { t: 1, value: to });
            }
        }
        return {
            objectId,
            property,
            keyframes,
            duration: readNumber('duration', 1000),
            delay: readNumber('delay', 0),
            repeat: readNumber('repeat', 0),
            repeatMode: readString('repeatMode') || 'restart',
            trigger: readString('trigger') || 'onLoad',
            easing: readString('easing') || 'easeInOut'
        };
    }

    _extractPlaybackObjectLabels(code) {
        const labels = new Map();
        const pattern = /\/\/\s*([^\n\r]+)[\s\S]{0,320}?this\.objects\[['"]([^'"]+)['"]\]\s*=/g;
        let match;
        while ((match = pattern.exec(code))) {
            labels.set(match[2], String(match[1] || '').trim());
        }
        return labels;
    }

    _resolvePlaybackCodeTarget(objectId, label, selectedParts = []) {
        if (objectId) {
            const byId = this.objects.getObjectById?.(objectId);
            if (byId) return byId;
        }
        const candidates = selectedParts.length ? selectedParts : (this.objects.objects || []);
        const aliases = this._getCodePartAliases(label);
        if (aliases.length) {
            const ranked = candidates
                .flatMap(obj => aliases.map(alias => ({ obj, alias })))
                .filter(entry => this._matchesCodePart(entry.obj, entry.alias))
                .map(entry => ({ obj: entry.obj, score: this._scoreCodePartMatch(entry.obj, entry.alias) }))
                .sort((a, b) => b.score - a.score);
            const byPart = ranked[0]?.obj;
            if (byPart) return byPart;
            const byName = candidates.find(obj => {
                const name = this._normalizeCodeMatchText(obj?.name);
                return aliases.some(alias => name === alias || name.includes(alias) || alias.includes(name));
            });
            if (byName) return byName;
        }
        return null;
    }

    _interpolateCodeValueKeyframes(keyframes, progress) {
        if (!Array.isArray(keyframes) || keyframes.length === 0) return null;
        const t = Math.max(0, Math.min(1, Number(progress) || 0));
        const kfs = keyframes
            .map(kf => ({ t: Math.max(0, Math.min(1, Number(kf.t) || 0)), value: Number(kf.value) }))
            .filter(kf => Number.isFinite(kf.value))
            .sort((a, b) => a.t - b.t);
        if (!kfs.length) return null;
        if (t <= kfs[0].t) return kfs[0].value;
        if (t >= kfs[kfs.length - 1].t) return kfs[kfs.length - 1].value;
        for (let i = 0; i < kfs.length - 1; i++) {
            const a = kfs[i];
            const b = kfs[i + 1];
            if (t >= a.t && t <= b.t) {
                const span = Math.max(0.0001, b.t - a.t);
                const local = (t - a.t) / span;
                return Utils.lerp(a.value, b.value, local);
            }
        }
        return kfs[kfs.length - 1].value;
    }

    _getSavedCodeTemplateStorageKey() {
        return 'animationStage.savedCodeTemplates.v1';
    }

    _loadSavedCodeTemplates() {
        try {
            const parsed = JSON.parse(localStorage.getItem(this._getSavedCodeTemplateStorageKey()) || '[]');
            return Array.isArray(parsed) ? parsed.filter(item => item && item.id && item.code) : [];
        } catch (_) {
            return [];
        }
    }

    _saveSavedCodeTemplates(templates) {
        try {
            localStorage.setItem(this._getSavedCodeTemplateStorageKey(), JSON.stringify(templates || []));
        } catch (error) {
            console.warn('[Code Panel] Could not save code templates:', error);
            Utils.showToast('Could not save code template in this browser.', 'warning');
        }
    }

    _makeCodeTemplateId() {
        return `code_tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    }

    renderSavedCodeTemplates() {
        const list = document.getElementById('saved-code-templates');
        if (!list) return;
        const templates = this._loadSavedCodeTemplates();
        if (!templates.length) {
            list.innerHTML = '<div class="template-empty">No saved code templates yet.</div>';
            return;
        }
        const esc = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;'
        }[ch]));
        list.innerHTML = templates.map(template => `
            <div class="template-item saved-code-template-item" data-saved-template="${esc(template.id)}" title="Insert saved code template">
                <i class="fas fa-code"></i>
                <span>${esc(template.name || 'Saved Code')}</span>
                <small>${esc(template.language || 'javascript')}${template.reusableCharacter ? ' · character' : ''}${template.motionPreset ? ' · motion' : ''}</small>
                <button type="button" class="template-delete-btn" data-delete-code-template="${esc(template.id)}" title="Delete template"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    insertSavedCodeTemplate(templateId) {
        const template = this._loadSavedCodeTemplates().find(item => String(item.id) === String(templateId));
        if (!template) {
            Utils.showToast('Saved code template was not found.', 'warning');
            this.renderSavedCodeTemplates();
            return;
        }
        const languageEl = document.getElementById('code-language');
        if (languageEl) languageEl.value = template.language || 'javascript';
        this._setCodeText(template.code || '', template.language || 'javascript');
        Utils.showToast(`Inserted "${template.name || 'Saved Code'}".`, 'success');
    }

    async deleteSavedCodeTemplate(templateId) {
        const templates = this._loadSavedCodeTemplates();
        const template = templates.find(item => String(item.id) === String(templateId));
        if (!template) return;
        const proceed = typeof Utils.showConfirm === 'function'
            ? await Utils.showConfirm(`Delete "${template.name || 'Saved Code'}"?`, 'Delete Code Template')
            : window.confirm?.(`Delete "${template.name || 'Saved Code'}"?`);
        if (!proceed) return;
        this._saveSavedCodeTemplates(templates.filter(item => String(item.id) !== String(templateId)));
        this.renderSavedCodeTemplates();
        Utils.showToast('Code template deleted.', 'success');
    }

    openSaveCodeTemplateDialog() {
        const code = this._getCodeText();
        const language = document.getElementById('code-language')?.value || 'javascript';
        if (!code.trim() || this._isCodeGuidanceText(code)) {
            Utils.showToast('Add or paste reusable code before saving a template.', 'warning');
            return;
        }
        document.getElementById('save-code-template-modal')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'save-code-template-modal';
        overlay.className = 'confirm-modal-overlay save-code-template-modal';
        overlay.innerHTML = `
            <div class="confirm-modal-box code-scope-modal save-code-template-box">
                <h3>Save Code Template</h3>
                <p>Save the current code for reuse. Code written with <code>stage.selected</code>, <code>stage.selection</code>, or <code>stage.character()</code> is easiest to reuse on other objects and characters.</p>
                <label class="code-template-field">
                    <span>Template name</span>
                    <input id="save-code-template-name" type="text" value="Custom code template">
                </label>
                <label class="prop-checkbox">
                    <input id="save-code-template-character" type="checkbox">
                    <span>Also save selected Universal Character as reusable character template</span>
                </label>
                <label class="prop-checkbox">
                    <input id="save-code-template-motion" type="checkbox">
                    <span>Also save selected object's current animations as a motion template</span>
                </label>
                <div class="confirm-modal-actions code-scope-actions">
                    <button class="confirm-modal-cancel" data-action="cancel">Cancel</button>
                    <button class="confirm-modal-confirm" data-action="save">Save Template</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.addEventListener('click', event => {
            if (event.target === overlay) close();
        });
        overlay.querySelector('[data-action="cancel"]')?.addEventListener('click', close);
        overlay.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
            const name = overlay.querySelector('#save-code-template-name')?.value?.trim() || 'Custom code template';
            const saveCharacter = !!overlay.querySelector('#save-code-template-character')?.checked;
            const saveMotion = !!overlay.querySelector('#save-code-template-motion')?.checked;
            const saved = await this.saveCodeAsTemplate({ name, code, language, saveCharacter, saveMotion });
            if (saved) close();
        });
        setTimeout(() => overlay.querySelector('#save-code-template-name')?.select?.(), 0);
    }

    async saveCodeAsTemplate(options = {}) {
        const code = String(options.code ?? this._getCodeText() ?? '');
        const language = options.language || document.getElementById('code-language')?.value || 'javascript';
        const name = String(options.name || 'Custom code template').trim();
        if (!code.trim() || this._isCodeGuidanceText(code)) {
            Utils.showToast('No reusable code to save.', 'warning');
            return null;
        }
        const fingerprint = this._fingerprintCode(`${language}:${code}`);
        const templates = this._loadSavedCodeTemplates();
        const duplicate = templates.find(item => item.fingerprint === fingerprint);
        if (duplicate) {
            const proceed = typeof Utils.showConfirm === 'function'
                ? await Utils.showConfirm(`"${duplicate.name}" already uses the same code. Save another copy anyway?`, 'Duplicate Code Template')
                : window.confirm?.(`"${duplicate.name}" already uses the same code. Save another copy anyway?`);
            if (!proceed) return null;
        }

        const projectDoctor = window.app?.projectDoctor || null;
        const characterTemplate = options.saveCharacter
            ? projectDoctor?.saveReusableCharacter?.({ name: `${name} character` })
            : null;
        const motionPreset = options.saveMotion
            ? projectDoctor?.saveMotionPresetFromSelection?.({ name: `${name} motion` })
            : null;
        const template = {
            id: this._makeCodeTemplateId(),
            name,
            language,
            code,
            fingerprint,
            createdAt: Date.now(),
            reusableCharacter: !!characterTemplate,
            motionPreset: !!motionPreset
        };
        templates.unshift(template);
        this._saveSavedCodeTemplates(templates.slice(0, 60));
        this.renderSavedCodeTemplates();
        Utils.showToast(`Saved "${template.name}" as a code template.`, 'success');
        return template;
    }

    saveSelectedAnimationAsMotionTemplate() {
        const projectDoctor = window.app?.projectDoctor || null;
        if (!projectDoctor?.saveMotionPresetFromSelection) {
            Utils.showToast('Motion template saving is not available yet.', 'warning');
            return null;
        }
        return projectDoctor.saveMotionPresetFromSelection();
    }

    insertCodeTemplate(template) {
        const templates = {
            bounce: `// Bounce selected object or character parts\nstage.selection.animate({ y: stage.selected.raw.y - 120, duration: 0.45, easing: 'easeOut', repeat: 1 });\nstage.play();`,
            orbit: `// Orbit selected object around the center of the stage\nconst obj = stage.selected;\nif (obj) {\n  obj.animate({ x: 560, y: 260, rotation: 360, duration: 2, easing: 'easeInOut' });\n  stage.play();\n}`,
            particle: `// Quick scatter: move selected objects outward\nstage.selection.forEach((obj, i) => {\n  const angle = (i / Math.max(1, stage.selection.length)) * Math.PI * 2;\n  obj.animate({ x: obj.raw.x + Math.cos(angle) * 120, y: obj.raw.y + Math.sin(angle) * 120, opacity: 0.2, duration: 1.2 });\n});\nstage.play();`,
            wave: `// Wave selected character arm or selected objects\nconst character = stage.character();\nconst arm = character.part('right-arm') || character.part('front-arm') || stage.selected;\nif (arm) arm.animate({ rotation: arm.raw.rotation - 35, duration: 0.35, repeat: 5, easing: 'easeInOut' });\nstage.play();`,
            stagger: `// Stagger selected objects from left to right\nstage.selection.forEach((obj, i) => {\n  obj.animate({ y: obj.raw.y - 60, opacity: 1, delay: i * 0.15, duration: 0.6, easing: 'easeOut' });\n});\nstage.play();`
        };
        const code = templates[template];
        if (!code) return;
        const languageEl = document.getElementById('code-language');
        if (languageEl) languageEl.value = 'javascript';
        this._setCodeText(code, 'javascript');
    }

    // Code generation
    updateCodeOutput() {
        const language = document.getElementById('code-language')?.value || 'javascript';
        if (this._importedActionPlanActive && language === 'json') return;
        const code = this.generateCode(language);
        this._setCodeText(code, language);
    }

    generateCode(language = 'javascript') {
        if (language === 'sandbox') return `const target = stage.objects.find(object => object.id === stage.selectedId);\nreturn {\n  format: "animstage-actions", version: 1,\n  actions: [{ target: target.id, property: "rotation",\n    from: target.rotation || 0, to: (target.rotation || 0) + 15,\n    durationMs: 1000, delayMs: 0, easing: "easeInOutQuad" }]\n};`;
        if (language === 'json') {
            const selected = this.objects.getSelectedObjects?.()[0];
            return JSON.stringify({ format: 'animstage-actions', version: 1, actions: selected ? [{
                target: selected.id, property: 'rotation', from: Number(selected.rotation) || 0,
                to: (Number(selected.rotation) || 0) + 15, durationMs: 1000, delayMs: 0, easing: 'easeInOutQuad'
            }] : [] }, null, 2);
        }
        const objects = this.objects.objects.filter(obj => obj.animations.length > 0);
        
        if (objects.length === 0) {
            return language === 'javascript'
                ? '// No animations to export\n// Select objects and apply animations first'
                : '# No animations to export\n# Select objects and apply animations first';
        }

        if (language === 'javascript') {
            return this.generateJavaScript(objects);
        } else {
            return this.generatePython(objects);
        }
    }

    generateJavaScript(objects) {
        let code = `// Animation Stage - Generated JavaScript\n`;
        code += `// Generated: ${new Date().toISOString()}\n\n`;
        code += `class AnimationStagePlayback {\n`;
        code += `    constructor(canvas) {\n`;
        code += `        this.canvas = canvas;\n`;
        code += `        this.ctx = canvas.getContext('2d');\n`;
        code += `        this.objects = {};\n`;
        code += `        this.animations = [];\n`;
        code += `        this.init();\n`;
        code += `    }\n\n`;
        code += `    init() {\n`;

        objects.forEach(obj => {
            code += `        // ${obj.name}\n`;
            code += `        this.objects['${obj.id}'] = {\n`;
            code += `            type: '${obj.type}',\n`;
            code += `            x: ${Math.round(obj.x)}, y: ${Math.round(obj.y)},\n`;
            code += `            width: ${Math.round(obj.width)}, height: ${Math.round(obj.height)},\n`;
            code += `            fill: '${obj.fill}',\n`;
            code += `            rotation: ${obj.rotation},\n`;
            code += `            opacity: ${obj.opacity}\n`;
            code += `        };\n\n`;

            obj.animations.forEach(anim => {
                const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim.generated);
                configs.forEach(config => {
                    if (!config || !config.property) return;
                    if (!this._isCodeAnimationPropertySupported(obj, config.property)) return;
                    code += `        this.animations.push({\n`;
                    code += `            objectId: '${obj.id}',\n`;
                    code += `            property: '${config.property}',\n`;
                    code += `            from: ${config.from?.toFixed(2) || 0},\n`;
                    code += `            to: ${config.to?.toFixed(2) || 0},\n`;
                    code += `            duration: ${config.duration},\n`;
                    code += `            delay: ${anim.delay || 0},\n`;
                    code += `            easing: '${config.easing || 'easeInOut'}'\n`;
                    code += `        });\n`;
                });
            });
        });

        code += `    }\n\n`;
        code += `    play() {\n`;
        code += `        const startTime = performance.now();\n`;
        code += `        const animate = (now) => {\n`;
        code += `            const elapsed = now - startTime;\n`;
        code += `            this.update(elapsed);\n`;
        code += `            this.render();\n`;
        code += `            requestAnimationFrame(animate);\n`;
        code += `        };\n`;
        code += `        requestAnimationFrame(animate);\n`;
        code += `    }\n`;
        code += `}\n`;

        return code;
    }

    generatePython(objects) {
        let code = `# Animation Stage - Generated Python\n`;
        code += `# Generated: ${new Date().toISOString()}\n`;
        code += `# Requires: pygame or similar rendering library\n\n`;
        code += `import math\nimport time\n\n`;
        code += `class AnimationStagePlayback:\n`;
        code += `    def __init__(self):\n`;
        code += `        self.objects = {}\n`;
        code += `        self.animations = []\n`;
        code += `        self.setup()\n\n`;
        code += `    def setup(self):\n`;

        objects.forEach(obj => {
            code += `        # ${obj.name}\n`;
            code += `        self.objects['${obj.id}'] = {\n`;
            code += `            'type': '${obj.type}',\n`;
            code += `            'x': ${Math.round(obj.x)}, 'y': ${Math.round(obj.y)},\n`;
            code += `            'width': ${Math.round(obj.width)}, 'height': ${Math.round(obj.height)},\n`;
            code += `            'fill': '${obj.fill}',\n`;
            code += `            'rotation': ${obj.rotation},\n`;
            code += `            'opacity': ${obj.opacity}\n`;
            code += `        }\n\n`;

            obj.animations.forEach(anim => {
                const configs = this._sanitizeGeneratedConfigsForAnimation(anim, anim.generated);
                configs.forEach(config => {
                    if (!config || !config.property) return;
                    if (!this._isCodeAnimationPropertySupported(obj, config.property)) return;
                    code += `        self.animations.append({\n`;
                    code += `            'object_id': '${obj.id}',\n`;
                    code += `            'property': '${config.property}',\n`;
                    code += `            'from_val': ${config.from?.toFixed(2) || 0},\n`;
                    code += `            'to_val': ${config.to?.toFixed(2) || 0},\n`;
                    code += `            'duration': ${config.duration},\n`;
                    code += `            'delay': ${anim.delay || 0},\n`;
                    code += `            'easing': '${config.easing || 'easeInOut'}'\n`;
                    code += `        })\n`;
                });
            });
        });

        code += `\n    def play(self):\n`;
        code += `        start_time = time.time() * 1000\n`;
        code += `        # Main animation loop\n`;
        code += `        while True:\n`;
        code += `            elapsed = time.time() * 1000 - start_time\n`;
        code += `            self.update(elapsed)\n`;
        code += `            self.render()\n`;

        return code;
    }

    // Get state for serialization
    toJSON() {
        return {
            totalDuration: this.totalDuration,
            minDuration: this.minDuration,
            playbackSpeed: this.playbackSpeed,
            looping: this.looping,
            autoReturn: this.autoReturn
        };
    }

    loadFromData(data) {
        if (data.totalDuration) this.totalDuration = data.totalDuration;
        if (data.minDuration) this.minDuration = data.minDuration;
        if (data.playbackSpeed) this.playbackSpeed = data.playbackSpeed;
        if (data.looping !== undefined) this.looping = data.looping;
        if (data.autoReturn !== undefined) this.autoReturn = data.autoReturn;
    }
}

// === Walk Cycle Frame Data ===
// Each array contains SVG path strings (100x100 viewBox) representing sequential poses.
// Side walk: 6 frames — contact, recoil, passing, high-point, contact(mirror), passing(mirror)
AnimationEngine.WALK_FRAMES_SIDE = [
    // Frame 1: Contact — right leg forward, left leg back, arms opposite
    'M52 8 C58 8 63 13 63 19 C63 25 58 30 52 30 C46 30 41 25 41 19 C41 13 46 8 52 8 Z M42 33 L60 33 C64 33 67 36 67 40 L67 55 L72 48 L77 50 L67 60 L63 55 L58 95 L50 95 L52 62 L44 62 L40 95 L32 95 L42 55 L34 50 L30 55 L35 40 C35 36 38 33 42 33 Z',
    // Frame 2: Recoil — slight knee bend, weight shifts
    'M52 10 C58 10 63 15 63 21 C63 27 58 32 52 32 C46 32 41 27 41 21 C41 15 46 10 52 10 Z M42 35 L60 35 C64 35 67 38 67 42 L67 55 L70 50 L75 52 L67 58 L62 55 L60 70 L55 95 L47 95 L50 65 L45 65 L38 95 L30 95 L40 60 L36 52 L32 55 L37 42 C37 38 40 35 42 35 Z',
    // Frame 3: Passing — one leg straight, other passing alongside
    'M52 8 C58 8 63 13 63 19 C63 25 58 30 52 30 C46 30 41 25 41 19 C41 13 46 8 52 8 Z M42 33 L60 33 C64 33 67 36 67 40 L67 55 L68 50 L73 51 L67 58 L62 55 L55 95 L47 95 L50 60 L46 60 L43 95 L35 95 L44 55 L38 52 L35 54 L37 40 C37 36 40 33 42 33 Z',
    // Frame 4: High point — pushing off, body higher
    'M52 7 C58 7 63 12 63 18 C63 24 58 29 52 29 C46 29 41 24 41 18 C41 12 46 7 52 7 Z M42 32 L60 32 C64 32 67 35 67 39 L67 53 L70 47 L75 49 L67 56 L63 53 L56 95 L48 95 L52 58 L48 58 L42 95 L34 95 L44 53 L37 49 L33 52 L37 39 C37 35 40 32 42 32 Z',
    // Frame 5: Contact mirrored — left leg forward, right leg back
    'M52 8 C58 8 63 13 63 19 C63 25 58 30 52 30 C46 30 41 25 41 19 C41 13 46 8 52 8 Z M42 33 L60 33 C64 33 67 36 67 40 L67 55 L34 50 L30 55 L42 55 L44 62 L40 95 L48 95 L50 62 L58 62 L62 95 L70 95 L60 55 L72 48 L77 50 L67 60 L67 55 L67 40 C67 36 64 33 60 33 Z',
    // Frame 6: Passing mirrored
    'M52 8 C58 8 63 13 63 19 C63 25 58 30 52 30 C46 30 41 25 41 19 C41 13 46 8 52 8 Z M42 33 L60 33 C64 33 67 36 67 40 L67 55 L68 50 L73 51 L67 58 L60 55 L57 95 L49 95 L52 60 L48 60 L46 95 L38 95 L44 55 L38 52 L35 54 L37 40 C37 36 40 33 42 33 Z'
];

// Front walk: 6 frames — standing, left step, passing, standing, right step, passing
AnimationEngine.WALK_FRAMES_FRONT = [
    // Frame 1: Neutral standing, slight arm positions
    'M50 8 C56 8 61 13 61 19 C61 25 56 30 50 30 C44 30 39 25 39 19 C39 13 44 8 50 8 Z M38 33 L62 33 C66 33 69 36 69 40 L69 55 L63 58 L63 52 L58 95 L53 95 L53 52 L47 52 L47 95 L42 95 L42 52 L37 58 L31 55 L31 40 C31 36 34 33 38 33 Z',
    // Frame 2: Left step out, right arm forward
    'M50 9 C56 9 61 14 61 20 C61 26 56 31 50 31 C44 31 39 26 39 20 C39 14 44 9 50 9 Z M38 34 L62 34 C66 34 69 37 69 41 L69 55 L64 56 L64 52 L60 95 L55 95 L54 52 L46 52 L44 95 L39 95 L38 52 L36 56 L30 55 L31 41 C31 37 34 34 38 34 Z',
    // Frame 3: Passing — legs together
    'M50 8 C56 8 61 13 61 19 C61 25 56 30 50 30 C44 30 39 25 39 19 C39 13 44 8 50 8 Z M38 33 L62 33 C66 33 69 36 69 40 L69 55 L62 56 L62 52 L56 95 L52 95 L52 52 L48 52 L48 95 L44 95 L44 52 L38 56 L31 55 L31 40 C31 36 34 33 38 33 Z',
    // Frame 4: Neutral standing again
    'M50 8 C56 8 61 13 61 19 C61 25 56 30 50 30 C44 30 39 25 39 19 C39 13 44 8 50 8 Z M38 33 L62 33 C66 33 69 36 69 40 L69 55 L63 58 L63 52 L58 95 L53 95 L53 52 L47 52 L47 95 L42 95 L42 52 L37 58 L31 55 L31 40 C31 36 34 33 38 33 Z',
    // Frame 5: Right step out, left arm forward
    'M50 9 C56 9 61 14 61 20 C61 26 56 31 50 31 C44 31 39 26 39 20 C39 14 44 9 50 9 Z M38 34 L62 34 C66 34 69 37 69 41 L69 55 L64 56 L64 52 L56 95 L51 95 L52 52 L48 52 L46 95 L41 95 L42 52 L36 56 L30 55 L31 41 C31 37 34 34 38 34 Z',
    // Frame 6: Passing — legs together
    'M50 8 C56 8 61 13 61 19 C61 25 56 30 50 30 C44 30 39 25 39 19 C39 13 44 8 50 8 Z M38 33 L62 33 C66 33 69 36 69 40 L69 55 L62 56 L62 52 L56 95 L52 95 L52 52 L48 52 L48 95 L44 95 L44 52 L38 56 L31 55 L31 40 C31 36 34 33 38 33 Z'
];

// Run cycle: 6 frames — faster stride, more dynamic poses with leaning torso
AnimationEngine.RUN_FRAMES_SIDE = [
    // Frame 1: Push off — back leg extended, front knee high
    'M54 6 C60 6 65 11 65 17 C65 23 60 28 54 28 C48 28 43 23 43 17 C43 11 48 6 54 6 Z M44 31 L62 31 C66 31 69 34 69 38 L69 50 L75 42 L80 45 L69 55 L64 50 L56 95 L48 95 L53 55 L42 60 L35 95 L27 95 L38 52 L30 46 L26 50 L36 38 C36 34 40 31 44 31 Z',
    // Frame 2: Flight phase — both feet off ground
    'M55 5 C61 5 66 10 66 16 C66 22 61 27 55 27 C49 27 44 22 44 16 C44 10 49 5 55 5 Z M45 30 L63 30 C67 30 70 33 70 37 L70 48 L73 44 L78 46 L70 52 L65 48 L60 80 L55 95 L47 95 L50 58 L44 58 L40 80 L35 95 L27 95 L40 48 L34 46 L30 48 L37 37 C37 33 40 30 45 30 Z',
    // Frame 3: Landing — front foot striking
    'M54 7 C60 7 65 12 65 18 C65 24 60 29 54 29 C48 29 43 24 43 18 C43 12 48 7 54 7 Z M44 32 L62 32 C66 32 69 35 69 39 L69 52 L74 46 L79 48 L69 56 L64 52 L55 95 L47 95 L52 58 L45 58 L38 95 L30 95 L42 52 L32 48 L28 52 L37 39 C37 35 40 32 44 32 Z',
    // Frame 4: Push off mirrored
    'M54 6 C60 6 65 11 65 17 C65 23 60 28 54 28 C48 28 43 23 43 17 C43 11 48 6 54 6 Z M44 31 L62 31 C66 31 69 34 69 38 L69 50 L30 46 L26 50 L38 52 L42 60 L35 95 L43 95 L48 55 L53 55 L56 95 L64 95 L58 50 L75 42 L80 45 L69 55 L69 50 L69 38 C69 34 66 31 62 31 Z',
    // Frame 5: Flight mirrored
    'M55 5 C61 5 66 10 66 16 C66 22 61 27 55 27 C49 27 44 22 44 16 C44 10 49 5 55 5 Z M45 30 L63 30 C67 30 70 33 70 37 L70 48 L73 44 L78 46 L70 52 L62 48 L58 80 L53 95 L45 95 L48 58 L44 58 L42 80 L37 95 L29 95 L42 48 L34 46 L30 48 L37 37 C37 33 40 30 45 30 Z',
    // Frame 6: Landing mirrored
    'M54 7 C60 7 65 12 65 18 C65 24 60 29 54 29 C48 29 43 24 43 18 C43 12 48 7 54 7 Z M44 32 L62 32 C66 32 69 35 69 39 L69 52 L74 46 L79 48 L69 56 L62 52 L57 95 L49 95 L52 58 L46 58 L40 95 L32 95 L44 52 L34 48 L30 52 L37 39 C37 35 40 32 44 32 Z'
];
