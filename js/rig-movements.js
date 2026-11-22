/**
 * RigMovements — Pre-built movement / animation library for rigged characters.
 *
 * Movements are defined as DELTA offsets from rest positions, so they work
 * regardless of where the user drags pins to fit their specific image.
 *
 * Each movement targets one or more rig preset types (human-front, human-side, etc.)
 * and consists of time-keyed keyframes with per-pin deltas { dx, dy }.
 * Pins not listed in a keyframe's deltas stay at their rest position.
 *
 * Format:
 *   keyframe = { t: 0-1, deltas: { 'pin-ID': { dx, dy }, ... } }
 *   t = normalized time (0 = start, 1 = end of one cycle)
 */

class RigMovements {

    /**
     * Get all movements, optionally filtered by rig preset type.
     * @param {string} [presetType] - e.g. 'human-front', 'human-side', 'quadruped', 'upper-body'
     * @returns {Array}
     */
    static getAll(presetType) {
        const all = [
            // ── Human Front ──
            this.waveRight(),
            this.waveLeft(),
            this.nodYes(),
            this.shakeNo(),
            this.shrug(),
            this.jump(),
            this.idleBreath(),
            this.celebrate(),
            this.walkInPlace(),
            this.bow(),
            this.kickRight(),
            this.pointRight(),
            this.clap(),
            this.thinkPose(),
            this.armsCrossed(),
            this.danceGroove(),
            this.sneeze(),
            this.lookAround(),
            this.squat(),
            this.punchRight(),

            // ── Human Side ──
            this.sideWalk(),
            this.sideRun(),
            this.sideIdle(),
            this.sideJump(),
            this.sideCrouch(),
            this.sidePush(),

            // ── Quadruped ──
            this.quadWalk(),
            this.tailWag(),
            this.quadRun(),
            this.quadSit(),
            this.quadShake(),
            this.quadIdle(),

            // ── Simple Upper Body ──
            this.upperWaveRight(),
            this.upperNod(),
            this.upperShrug(),
            this.upperClap(),
            this.upperThink(),

            // ── Bird ──
            this.birdFlap(),
            this.birdGlide(),
            this.birdPeck(),
            this.birdIdle(),

            // ── Fish ──
            this.fishSwim(),
            this.fishIdle(),

            // ── Facial Rig ──
            this.faceSmile(),
            this.faceSurprise(),
            this.faceSad(),
            this.faceBlink(),
            this.faceTalk(),

            // ── Spider ──
            this.spiderWalk(),
            this.spiderIdle(),

            // ── Centaur ──
            this.centaurTrot(),
            this.centaurRear(),

            // ── Generic Biped ──
            this.bipedWalk(),
            this.bipedIdle(),
            this.bipedJump()
        ].map(movement => this._normalizeMovement(movement));
        if (presetType) {
            return all.filter(m => m.presetTypes.includes(presetType));
        }
        return all;
    }

    static getByKey(key) {
        return this.getAll().find(m => m.key === key) || null;
    }

    static _normalizeMovement(movement) {
        if (!movement?.presetTypes?.includes('human-front')) return movement;
        return {
            ...movement,
            keyframes: (movement.keyframes || []).map(kf => ({
                ...kf,
                deltas: this._remapHumanFrontDeltas(kf.deltas || {})
            }))
        };
    }

    static _remapHumanFrontDeltas(deltas) {
        const remap = {
            'pin-6': 'pin-11', 'pin-7': 'pin-12', 'pin-8': 'pin-13', 'pin-9': 'pin-14', 'pin-10': 'pin-15',
            'pin-11': 'pin-6', 'pin-12': 'pin-7', 'pin-13': 'pin-8', 'pin-14': 'pin-9', 'pin-15': 'pin-10',
            'pin-16': 'pin-20', 'pin-17': 'pin-21', 'pin-18': 'pin-22', 'pin-19': 'pin-23',
            'pin-20': 'pin-16', 'pin-21': 'pin-17', 'pin-22': 'pin-18', 'pin-23': 'pin-19'
        };
        const normalized = {};
        Object.keys(deltas || {}).forEach(pinId => {
            normalized[remap[pinId] || pinId] = deltas[pinId];
        });
        return normalized;
    }

    // ═══════════════════════════════════════════════════════
    //  HUMAN FRONT  (24 pins: 0-5 spine, 6-10 character R arm,
    //                11-15 character L arm, 16-19 character R leg, 20-23 character L leg)
    // ═══════════════════════════════════════════════════════

    /** Wave Right Hand — right arm raises, hand oscillates L/R */
    static waveRight() {
        const arm = {
            'pin-11': { dx: 0, dy: -0.02 },
            'pin-12': { dx: -0.04, dy: -0.14 },
            'pin-13': { dx: -0.08, dy: -0.28 },
            'pin-14': { dx: -0.12, dy: -0.38 },
            'pin-15': { dx: -0.14, dy: -0.42 }
        };
        const waveL = { ...arm,
            'pin-14': { dx: -0.18, dy: -0.38 },
            'pin-15': { dx: -0.22, dy: -0.40 }
        };
        const waveR = { ...arm,
            'pin-14': { dx: -0.06, dy: -0.38 },
            'pin-15': { dx: -0.04, dy: -0.40 }
        };
        return {
            key: 'wave-right', name: 'Wave Right Hand',
            icon: 'fa-hand-paper', category: 'Gestures',
            description: 'Right arm raises and waves side to side',
            presetTypes: ['human-front'],
            duration: 2000, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.15, deltas: arm },
                { t: 0.30, deltas: waveL },
                { t: 0.50, deltas: waveR },
                { t: 0.70, deltas: waveL },
                { t: 0.85, deltas: arm },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Wave Left Hand — left arm raises, hand oscillates L/R */
    static waveLeft() {
        const arm = {
            'pin-6':  { dx: 0, dy: -0.02 },
            'pin-7':  { dx: 0.04, dy: -0.14 },
            'pin-8':  { dx: 0.08, dy: -0.28 },
            'pin-9':  { dx: 0.12, dy: -0.38 },
            'pin-10': { dx: 0.14, dy: -0.42 }
        };
        const waveL = { ...arm,
            'pin-9':  { dx: 0.18, dy: -0.38 },
            'pin-10': { dx: 0.22, dy: -0.40 }
        };
        const waveR = { ...arm,
            'pin-9':  { dx: 0.06, dy: -0.38 },
            'pin-10': { dx: 0.04, dy: -0.40 }
        };
        return {
            key: 'wave-left', name: 'Wave Left Hand',
            icon: 'fa-hand-paper', category: 'Gestures',
            description: 'Left arm raises and waves side to side',
            presetTypes: ['human-front'],
            duration: 2000, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.15, deltas: arm },
                { t: 0.30, deltas: waveL },
                { t: 0.50, deltas: waveR },
                { t: 0.70, deltas: waveL },
                { t: 0.85, deltas: arm },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Nod Yes — head bobs up and down */
    static nodYes() {
        const down = {
            'pin-0': { dx: 0, dy: 0.04 },
            'pin-1': { dx: 0, dy: 0.03 },
            'pin-2': { dx: 0, dy: 0.01 }
        };
        const up = {
            'pin-0': { dx: 0, dy: -0.02 },
            'pin-1': { dx: 0, dy: -0.01 }
        };
        return {
            key: 'nod-yes', name: 'Nod Yes',
            icon: 'fa-check-circle', category: 'Gestures',
            description: 'Head nods up and down',
            presetTypes: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: down },
                { t: 0.50, deltas: up },
                { t: 0.75, deltas: down },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Shake Head No — head tilts left then right */
    static shakeNo() {
        const left = {
            'pin-0': { dx: -0.04, dy: 0 },
            'pin-1': { dx: -0.03, dy: 0 },
            'pin-2': { dx: -0.01, dy: 0 }
        };
        const right = {
            'pin-0': { dx: 0.04, dy: 0 },
            'pin-1': { dx: 0.03, dy: 0 },
            'pin-2': { dx: 0.01, dy: 0 }
        };
        return {
            key: 'shake-no', name: 'Shake Head No',
            icon: 'fa-times-circle', category: 'Gestures',
            description: 'Head shakes left and right',
            presetTypes: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.20, deltas: left },
                { t: 0.50, deltas: right },
                { t: 0.80, deltas: left },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Shrug — both shoulders rise, head sinks slightly */
    static shrug() {
        const peak = {
            'pin-0':  { dx: 0, dy: 0.01 },
            'pin-1':  { dx: 0, dy: 0.01 },
            'pin-6':  { dx: -0.01, dy: -0.05 },
            'pin-7':  { dx: -0.01, dy: -0.04 },
            'pin-8':  { dx: 0, dy: -0.03 },
            'pin-9':  { dx: 0.01, dy: -0.02 },
            'pin-10': { dx: 0.02, dy: -0.01 },
            'pin-11': { dx: 0.01, dy: -0.05 },
            'pin-12': { dx: 0.01, dy: -0.04 },
            'pin-13': { dx: 0, dy: -0.03 },
            'pin-14': { dx: -0.01, dy: -0.02 },
            'pin-15': { dx: -0.02, dy: -0.01 }
        };
        return {
            key: 'shrug', name: 'Shrug',
            icon: 'fa-meh', category: 'Gestures',
            description: 'Both shoulders rise — "I don\'t know" gesture',
            presetTypes: ['human-front'],
            duration: 1800, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: peak },
                { t: 0.55, deltas: peak },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Jump — crouch, launch, airborne, land */
    static jump() {
        const all = (dy) => ({
            'pin-0':  { dx: 0, dy }, 'pin-1':  { dx: 0, dy },
            'pin-2':  { dx: 0, dy }, 'pin-3':  { dx: 0, dy },
            'pin-4':  { dx: 0, dy }, 'pin-5':  { dx: 0, dy },
            'pin-6':  { dx: 0, dy }, 'pin-7':  { dx: 0, dy },
            'pin-8':  { dx: 0, dy }, 'pin-9':  { dx: 0, dy },
            'pin-10': { dx: 0, dy }, 'pin-11': { dx: 0, dy },
            'pin-12': { dx: 0, dy }, 'pin-13': { dx: 0, dy },
            'pin-14': { dx: 0, dy }, 'pin-15': { dx: 0, dy },
            'pin-16': { dx: 0, dy }, 'pin-17': { dx: 0, dy },
            'pin-18': { dx: 0, dy }, 'pin-19': { dx: 0, dy },
            'pin-20': { dx: 0, dy }, 'pin-21': { dx: 0, dy },
            'pin-22': { dx: 0, dy }, 'pin-23': { dx: 0, dy }
        });
        const crouch = {
            ...all(0.04),
            // Knees bend outward
            'pin-17': { dx: -0.03, dy: 0.02 },
            'pin-21': { dx: 0.03, dy: 0.02 },
            // Arms swing back
            'pin-9':  { dx: -0.03, dy: 0.02 },
            'pin-10': { dx: -0.04, dy: 0.02 },
            'pin-14': { dx: 0.03, dy: 0.02 },
            'pin-15': { dx: 0.04, dy: 0.02 }
        };
        const air = {
            ...all(-0.08),
            // Arms rise
            'pin-7':  { dx: 0.02, dy: -0.14 },
            'pin-8':  { dx: 0.04, dy: -0.16 },
            'pin-9':  { dx: 0.04, dy: -0.18 },
            'pin-10': { dx: 0.04, dy: -0.20 },
            'pin-12': { dx: -0.02, dy: -0.14 },
            'pin-13': { dx: -0.04, dy: -0.16 },
            'pin-14': { dx: -0.04, dy: -0.18 },
            'pin-15': { dx: -0.04, dy: -0.20 },
            // Legs tuck slightly
            'pin-18': { dx: 0, dy: -0.12 },
            'pin-19': { dx: 0, dy: -0.14 },
            'pin-22': { dx: 0, dy: -0.12 },
            'pin-23': { dx: 0, dy: -0.14 }
        };
        return {
            key: 'jump', name: 'Jump',
            icon: 'fa-arrow-up', category: 'Full Body',
            description: 'Crouch, launch into air, and land',
            presetTypes: ['human-front'],
            duration: 2500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.15, deltas: crouch },
                { t: 0.35, deltas: air },
                { t: 0.50, deltas: air },
                { t: 0.70, deltas: {} },
                { t: 0.85, deltas: { ...all(0.02) } },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Idle Breathing — subtle chest expansion */
    static idleBreath() {
        const inhale = {
            'pin-2':  { dx: 0, dy: -0.004 },
            'pin-3':  { dx: 0, dy: -0.008 },
            'pin-6':  { dx: -0.006, dy: -0.006 },
            'pin-11': { dx: 0.006, dy: -0.006 },
            'pin-7':  { dx: -0.004, dy: -0.004 },
            'pin-12': { dx: 0.004, dy: -0.004 },
            'pin-0':  { dx: 0, dy: -0.003 },
            'pin-1':  { dx: 0, dy: -0.003 }
        };
        return {
            key: 'idle-breath', name: 'Idle Breathing',
            icon: 'fa-lungs', category: 'Idle',
            description: 'Subtle breathing cycle — chest gently expands and contracts',
            presetTypes: ['human-front'],
            duration: 3000, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.45, deltas: inhale },
                { t: 0.55, deltas: inhale },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Celebrate — both arms raise overhead */
    static celebrate() {
        const half = {
            'pin-6':  { dx: -0.01, dy: -0.02 },
            'pin-7':  { dx: 0.02, dy: -0.06 },
            'pin-8':  { dx: 0.03, dy: -0.10 },
            'pin-9':  { dx: 0.04, dy: -0.14 },
            'pin-10': { dx: 0.05, dy: -0.16 },
            'pin-11': { dx: 0.01, dy: -0.02 },
            'pin-12': { dx: -0.02, dy: -0.06 },
            'pin-13': { dx: -0.03, dy: -0.10 },
            'pin-14': { dx: -0.04, dy: -0.14 },
            'pin-15': { dx: -0.05, dy: -0.16 }
        };
        const full = {
            'pin-0':  { dx: 0, dy: -0.01 },
            'pin-1':  { dx: 0, dy: -0.005 },
            'pin-6':  { dx: -0.01, dy: -0.03 },
            'pin-7':  { dx: 0.04, dy: -0.10 },
            'pin-8':  { dx: 0.06, dy: -0.16 },
            'pin-9':  { dx: 0.08, dy: -0.22 },
            'pin-10': { dx: 0.09, dy: -0.24 },
            'pin-11': { dx: 0.01, dy: -0.03 },
            'pin-12': { dx: -0.04, dy: -0.10 },
            'pin-13': { dx: -0.06, dy: -0.16 },
            'pin-14': { dx: -0.08, dy: -0.22 },
            'pin-15': { dx: -0.09, dy: -0.24 }
        };
        return {
            key: 'celebrate', name: 'Celebrate',
            icon: 'fa-trophy', category: 'Full Body',
            description: 'Both arms raise overhead in celebration',
            presetTypes: ['human-front'],
            duration: 2500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: half },
                { t: 0.50, deltas: full },
                { t: 0.75, deltas: full },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Walk in Place — front-view walk with hip sway and alternating leg lift */
    static walkInPlace() {
        // Phase A: left leg up, body shifts right
        const phaseA = {
            // Body sway right
            'pin-3':  { dx: 0.01, dy: 0 },
            'pin-4':  { dx: 0.01, dy: 0 },
            'pin-5':  { dx: 0.02, dy: 0 },
            // Left leg lifts (knee bends)
            'pin-17': { dx: -0.02, dy: -0.06 },
            'pin-18': { dx: -0.03, dy: -0.04 },
            'pin-19': { dx: -0.03, dy: -0.04 },
            // Right leg straight (planted)
            'pin-21': { dx: 0.01, dy: 0.01 },
            // Counter arm swing
            'pin-9':  { dx: 0.03, dy: -0.02 },
            'pin-10': { dx: 0.04, dy: -0.02 },
            'pin-14': { dx: -0.03, dy: 0.02 },
            'pin-15': { dx: -0.04, dy: 0.02 }
        };
        // Phase B: right leg up, body shifts left
        const phaseB = {
            'pin-3':  { dx: -0.01, dy: 0 },
            'pin-4':  { dx: -0.01, dy: 0 },
            'pin-5':  { dx: -0.02, dy: 0 },
            'pin-21': { dx: 0.02, dy: -0.06 },
            'pin-22': { dx: 0.03, dy: -0.04 },
            'pin-23': { dx: 0.03, dy: -0.04 },
            'pin-17': { dx: -0.01, dy: 0.01 },
            'pin-9':  { dx: -0.03, dy: 0.02 },
            'pin-10': { dx: -0.04, dy: 0.02 },
            'pin-14': { dx: 0.03, dy: -0.02 },
            'pin-15': { dx: 0.04, dy: -0.02 }
        };
        return {
            key: 'walk-in-place', name: 'Walk in Place',
            icon: 'fa-shoe-prints', category: 'Locomotion',
            description: 'Front-view walking with hip sway and leg lift',
            presetTypes: ['human-front'],
            duration: 2000, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: phaseA },
                { t: 0.25, deltas: {} },
                { t: 0.50, deltas: phaseB },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: phaseA }
            ]
        };
    }

    /** Bow — subtle head and upper-body tilt (2D-friendly) */
    static bow() {
        const full = {
            // Keep deltas small — large Y offsets cause mesh distortion in 2D
            'pin-0':  { dx: 0, dy: 0.08 },
            'pin-1':  { dx: 0, dy: 0.06 },
            'pin-2':  { dx: 0, dy: 0.04 },
            'pin-3':  { dx: 0, dy: 0.02 },
            // Arms relax slightly
            'pin-9':  { dx: 0.03, dy: 0.03 },
            'pin-10': { dx: 0.04, dy: 0.03 },
            'pin-14': { dx: -0.03, dy: 0.03 },
            'pin-15': { dx: -0.04, dy: 0.03 }
        };
        return {
            key: 'bow', name: 'Bow',
            icon: 'fa-praying-hands', category: 'Gestures',
            description: 'Torso bends forward in a respectful bow',
            presetTypes: ['human-front'],
            duration: 3000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: full },
                { t: 0.65, deltas: full },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Kick Right — right leg swings forward and up */
    static kickRight() {
        const wind = {
            'pin-21': { dx: 0.02, dy: -0.01 },
            'pin-3':  { dx: 0, dy: 0.01 }
        };
        const kick = {
            // Right leg forward and up (conservative to avoid mesh distortion)
            'pin-20': { dx: -0.01, dy: -0.01 },
            'pin-21': { dx: -0.04, dy: -0.10 },
            'pin-22': { dx: -0.06, dy: -0.16 },
            'pin-23': { dx: -0.07, dy: -0.18 },
            // Body leans back slightly
            'pin-0':  { dx: 0.01, dy: -0.02 },
            'pin-1':  { dx: 0.01, dy: -0.01 },
            'pin-3':  { dx: 0, dy: -0.01 },
            // Arms counterbalance
            'pin-9':  { dx: 0.04, dy: -0.04 },
            'pin-10': { dx: 0.05, dy: -0.04 },
            'pin-14': { dx: -0.02, dy: 0.02 },
            'pin-15': { dx: -0.03, dy: 0.02 }
        };
        return {
            key: 'kick-right', name: 'Kick Right',
            icon: 'fa-futbol', category: 'Full Body',
            description: 'Right leg kicks forward and up',
            presetTypes: ['human-front'],
            duration: 2000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.18, deltas: wind },
                { t: 0.45, deltas: kick },
                { t: 0.60, deltas: kick },
                { t: 0.80, deltas: {} },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Point Right — right arm extends to the side at shoulder height */
    static pointRight() {
        const extend = {
            'pin-11': { dx: 0.01, dy: -0.01 },
            'pin-12': { dx: 0.06, dy: -0.10 },
            'pin-13': { dx: 0.06, dy: -0.18 },
            'pin-14': { dx: 0.06, dy: -0.24 },
            'pin-15': { dx: 0.06, dy: -0.28 }
        };
        return {
            key: 'point-right', name: 'Point Right',
            icon: 'fa-hand-point-right', category: 'Gestures',
            description: 'Right arm extends and points to the side',
            presetTypes: ['human-front'],
            duration: 2200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: extend },
                { t: 0.70, deltas: extend },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  HUMAN SIDE  (18 pins: 0-5 spine, 6-9 arm,
    //               10-13 front leg, 14-17 back leg)
    // ═══════════════════════════════════════════════════════

    /** Side Walk Cycle — classic bipedal walk from profile view */
    static sideWalk() {
        // Contact A: front leg forward, back leg back
        const contactA = {
            // Front leg reaches forward (left = smaller x)
            'pin-11': { dx: -0.06, dy: -0.02 },
            'pin-12': { dx: -0.06, dy: -0.01 },
            'pin-13': { dx: -0.08, dy: -0.01 },
            // Back leg pushes back
            'pin-15': { dx: 0.05, dy: 0.01 },
            'pin-16': { dx: 0.06, dy: 0 },
            'pin-17': { dx: 0.07, dy: 0 },
            // Arm counter-swing (back)
            'pin-7':  { dx: 0.05, dy: -0.02 },
            'pin-8':  { dx: 0.06, dy: -0.01 },
            'pin-9':  { dx: 0.07, dy: -0.01 },
            // Body tilt
            'pin-1':  { dx: -0.01, dy: 0 }
        };
        // Pass A: legs pass through, body rises
        const passA = {
            // Body slightly higher
            'pin-0':  { dx: 0, dy: -0.015 },
            'pin-1':  { dx: 0, dy: -0.015 },
            'pin-2':  { dx: 0, dy: -0.01 },
            // Back leg mid-swing (knee lifts)
            'pin-15': { dx: -0.02, dy: -0.06 },
            'pin-16': { dx: -0.02, dy: -0.04 },
            'pin-17': { dx: -0.02, dy: -0.04 },
            // Arm passes through center
            'pin-7':  { dx: -0.01, dy: -0.01 },
            'pin-8':  { dx: -0.01, dy: 0 },
            'pin-9':  { dx: -0.01, dy: 0 }
        };
        // Contact B: legs swapped
        const contactB = {
            'pin-11': { dx: 0.05, dy: 0.01 },
            'pin-12': { dx: 0.06, dy: 0 },
            'pin-13': { dx: 0.07, dy: 0 },
            'pin-15': { dx: -0.06, dy: -0.02 },
            'pin-16': { dx: -0.06, dy: -0.01 },
            'pin-17': { dx: -0.08, dy: -0.01 },
            'pin-7':  { dx: -0.05, dy: -0.02 },
            'pin-8':  { dx: -0.06, dy: -0.01 },
            'pin-9':  { dx: -0.07, dy: -0.01 },
            'pin-1':  { dx: 0.01, dy: 0 }
        };
        // Pass B: front leg mid-swing
        const passB = {
            'pin-0':  { dx: 0, dy: -0.015 },
            'pin-1':  { dx: 0, dy: -0.015 },
            'pin-2':  { dx: 0, dy: -0.01 },
            'pin-11': { dx: -0.02, dy: -0.06 },
            'pin-12': { dx: -0.02, dy: -0.04 },
            'pin-13': { dx: -0.02, dy: -0.04 },
            'pin-7':  { dx: 0.01, dy: -0.01 },
            'pin-8':  { dx: 0.01, dy: 0 },
            'pin-9':  { dx: 0.01, dy: 0 }
        };
        return {
            key: 'side-walk', name: 'Walk Cycle',
            icon: 'fa-walking', category: 'Locomotion',
            description: 'Side-view walking cycle with arm swing and body bob',
            presetTypes: ['human-side'],
            duration: 2000, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: contactA },
                { t: 0.25, deltas: passA },
                { t: 0.50, deltas: contactB },
                { t: 0.75, deltas: passB },
                { t: 1.00, deltas: contactA }
            ]
        };
    }

    /** Side Run Cycle — faster stride with airborne phase */
    static sideRun() {
        const pushA = {
            'pin-11': { dx: -0.10, dy: -0.04 },
            'pin-12': { dx: -0.10, dy: -0.02 },
            'pin-13': { dx: -0.12, dy: -0.02 },
            'pin-15': { dx: 0.08, dy: 0.02 },
            'pin-16': { dx: 0.10, dy: 0.01 },
            'pin-17': { dx: 0.11, dy: 0.01 },
            'pin-7':  { dx: 0.08, dy: -0.04 },
            'pin-8':  { dx: 0.10, dy: -0.03 },
            'pin-9':  { dx: 0.11, dy: -0.03 },
            'pin-3':  { dx: -0.02, dy: -0.01 }
        };
        const airA = {
            // All body rises
            'pin-0':  { dx: 0, dy: -0.03 },
            'pin-1':  { dx: 0, dy: -0.03 },
            'pin-2':  { dx: 0, dy: -0.025 },
            'pin-3':  { dx: -0.01, dy: -0.02 },
            'pin-4':  { dx: 0, dy: -0.02 },
            'pin-5':  { dx: 0, dy: -0.02 },
            'pin-11': { dx: -0.04, dy: -0.10 },
            'pin-12': { dx: -0.04, dy: -0.08 },
            'pin-13': { dx: -0.04, dy: -0.08 },
            'pin-15': { dx: 0.02, dy: -0.08 },
            'pin-16': { dx: 0.04, dy: -0.06 },
            'pin-17': { dx: 0.04, dy: -0.06 },
            'pin-7':  { dx: 0.02, dy: -0.06 },
            'pin-8':  { dx: 0.02, dy: -0.05 },
            'pin-9':  { dx: 0.02, dy: -0.05 }
        };
        const pushB = {
            'pin-11': { dx: 0.08, dy: 0.02 },
            'pin-12': { dx: 0.10, dy: 0.01 },
            'pin-13': { dx: 0.11, dy: 0.01 },
            'pin-15': { dx: -0.10, dy: -0.04 },
            'pin-16': { dx: -0.10, dy: -0.02 },
            'pin-17': { dx: -0.12, dy: -0.02 },
            'pin-7':  { dx: -0.08, dy: -0.04 },
            'pin-8':  { dx: -0.10, dy: -0.03 },
            'pin-9':  { dx: -0.11, dy: -0.03 },
            'pin-3':  { dx: 0.02, dy: -0.01 }
        };
        const airB = {
            'pin-0':  { dx: 0, dy: -0.03 },
            'pin-1':  { dx: 0, dy: -0.03 },
            'pin-2':  { dx: 0, dy: -0.025 },
            'pin-3':  { dx: 0.01, dy: -0.02 },
            'pin-4':  { dx: 0, dy: -0.02 },
            'pin-5':  { dx: 0, dy: -0.02 },
            'pin-11': { dx: 0.02, dy: -0.08 },
            'pin-12': { dx: 0.04, dy: -0.06 },
            'pin-13': { dx: 0.04, dy: -0.06 },
            'pin-15': { dx: -0.04, dy: -0.10 },
            'pin-16': { dx: -0.04, dy: -0.08 },
            'pin-17': { dx: -0.04, dy: -0.08 },
            'pin-7':  { dx: -0.02, dy: -0.06 },
            'pin-8':  { dx: -0.02, dy: -0.05 },
            'pin-9':  { dx: -0.02, dy: -0.05 }
        };
        return {
            key: 'side-run', name: 'Run Cycle',
            icon: 'fa-running', category: 'Locomotion',
            description: 'Side-view run with wide strides and airborne phases',
            presetTypes: ['human-side'],
            duration: 1400, easing: 'linear', repeat: 5,
            keyframes: [
                { t: 0.00, deltas: pushA },
                { t: 0.25, deltas: airA },
                { t: 0.50, deltas: pushB },
                { t: 0.75, deltas: airB },
                { t: 1.00, deltas: pushA }
            ]
        };
    }

    /** Side Idle — subtle weight-shifting sway */
    static sideIdle() {
        const sway = {
            'pin-0':  { dx: -0.005, dy: -0.003 },
            'pin-1':  { dx: -0.005, dy: -0.003 },
            'pin-2':  { dx: -0.004, dy: -0.002 },
            'pin-3':  { dx: -0.003, dy: -0.002 },
            'pin-6':  { dx: -0.003, dy: -0.002 },
            'pin-7':  { dx: -0.004, dy: -0.002 },
            'pin-8':  { dx: -0.005, dy: -0.001 },
            'pin-9':  { dx: -0.005, dy: -0.001 }
        };
        return {
            key: 'side-idle', name: 'Idle Stand',
            icon: 'fa-male', category: 'Idle',
            description: 'Subtle side-view weight shift and sway',
            presetTypes: ['human-side'],
            duration: 3500, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.45, deltas: sway },
                { t: 0.55, deltas: sway },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  QUADRUPED  (19 pins: 0-6 spine+tail,
    //   7-9 FL, 10-12 FR, 13-15 RL, 16-18 RR)
    // ═══════════════════════════════════════════════════════

    /** Quadruped Walk — diagonal gait: FL+RR then FR+RL */
    static quadWalk() {
        // Phase A: FL + RR forward, FR + RL back
        const phaseA = {
            // FL forward (smaller x)
            'pin-7':  { dx: -0.04, dy: -0.02 },
            'pin-8':  { dx: -0.05, dy: -0.01 },
            'pin-9':  { dx: -0.06, dy: 0 },
            // RR forward
            'pin-16': { dx: -0.04, dy: -0.02 },
            'pin-17': { dx: -0.05, dy: -0.01 },
            'pin-18': { dx: -0.06, dy: 0 },
            // FR back (larger x)
            'pin-10': { dx: 0.03, dy: 0.01 },
            'pin-11': { dx: 0.04, dy: 0.01 },
            'pin-12': { dx: 0.04, dy: 0 },
            // RL back
            'pin-13': { dx: 0.03, dy: 0.01 },
            'pin-14': { dx: 0.04, dy: 0.01 },
            'pin-15': { dx: 0.04, dy: 0 },
            // Body sinks slightly
            'pin-2':  { dx: 0, dy: 0.005 },
            'pin-3':  { dx: 0, dy: 0.005 }
        };
        // Pass A: legs pass through verticals, body rises
        const passA = {
            'pin-2':  { dx: 0, dy: -0.01 },
            'pin-3':  { dx: 0, dy: -0.01 },
            'pin-4':  { dx: 0, dy: -0.008 },
            // FL passing (knee lifts)
            'pin-8':  { dx: -0.02, dy: -0.04 },
            'pin-9':  { dx: -0.02, dy: -0.03 },
            // RR passing
            'pin-17': { dx: -0.02, dy: -0.04 },
            'pin-18': { dx: -0.02, dy: -0.03 }
        };
        // Phase B: FR + RL forward, FL + RR back
        const phaseB = {
            'pin-10': { dx: -0.04, dy: -0.02 },
            'pin-11': { dx: -0.05, dy: -0.01 },
            'pin-12': { dx: -0.06, dy: 0 },
            'pin-13': { dx: -0.04, dy: -0.02 },
            'pin-14': { dx: -0.05, dy: -0.01 },
            'pin-15': { dx: -0.06, dy: 0 },
            'pin-7':  { dx: 0.03, dy: 0.01 },
            'pin-8':  { dx: 0.04, dy: 0.01 },
            'pin-9':  { dx: 0.04, dy: 0 },
            'pin-16': { dx: 0.03, dy: 0.01 },
            'pin-17': { dx: 0.04, dy: 0.01 },
            'pin-18': { dx: 0.04, dy: 0 },
            'pin-2':  { dx: 0, dy: 0.005 },
            'pin-3':  { dx: 0, dy: 0.005 }
        };
        // Pass B
        const passB = {
            'pin-2':  { dx: 0, dy: -0.01 },
            'pin-3':  { dx: 0, dy: -0.01 },
            'pin-4':  { dx: 0, dy: -0.008 },
            'pin-11': { dx: -0.02, dy: -0.04 },
            'pin-12': { dx: -0.02, dy: -0.03 },
            'pin-14': { dx: -0.02, dy: -0.04 },
            'pin-15': { dx: -0.02, dy: -0.03 }
        };
        return {
            key: 'quad-walk', name: 'Walk (Quadruped)',
            icon: 'fa-paw', category: 'Locomotion',
            description: 'Diagonal gait walk cycle for four-legged animals',
            presetTypes: ['quadruped'],
            duration: 2200, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: phaseA },
                { t: 0.25, deltas: passA },
                { t: 0.50, deltas: phaseB },
                { t: 0.75, deltas: passB },
                { t: 1.00, deltas: phaseA }
            ]
        };
    }

    /** Tail Wag — tail oscillates side to side (or up/down in profile) */
    static tailWag() {
        const left = {
            'pin-5': { dx: 0, dy: -0.04 },
            'pin-6': { dx: 0, dy: -0.08 }
        };
        const right = {
            'pin-5': { dx: 0, dy: 0.04 },
            'pin-6': { dx: 0, dy: 0.08 }
        };
        return {
            key: 'tail-wag', name: 'Tail Wag',
            icon: 'fa-dog', category: 'Idle',
            description: 'Tail wags back and forth excitedly',
            presetTypes: ['quadruped'],
            duration: 800, easing: 'easeInOut', repeat: 8,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: left },
                { t: 0.50, deltas: {} },
                { t: 0.75, deltas: right },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  SIMPLE UPPER BODY  (11 pins: 0-4 spine,
    //   5-7 L arm, 8-10 R arm)
    // ═══════════════════════════════════════════════════════

    /** Upper Wave Right — right arm raises and waves (upper-body preset) */
    static upperWaveRight() {
        const arm = {
            'pin-8':  { dx: 0.01, dy: -0.04 },
            'pin-9':  { dx: -0.06, dy: -0.24 },
            'pin-10': { dx: -0.10, dy: -0.40 }
        };
        const waveL = {
            'pin-8':  { dx: 0.01, dy: -0.04 },
            'pin-9':  { dx: -0.12, dy: -0.24 },
            'pin-10': { dx: -0.18, dy: -0.38 }
        };
        const waveR = {
            'pin-8':  { dx: 0.01, dy: -0.04 },
            'pin-9':  { dx: 0.02, dy: -0.24 },
            'pin-10': { dx: 0.02, dy: -0.38 }
        };
        return {
            key: 'upper-wave-right', name: 'Wave Right',
            icon: 'fa-hand-paper', category: 'Gestures',
            description: 'Right arm raises and waves (upper body)',
            presetTypes: ['upper-body'],
            duration: 2000, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.15, deltas: arm },
                { t: 0.30, deltas: waveL },
                { t: 0.50, deltas: waveR },
                { t: 0.70, deltas: waveL },
                { t: 0.85, deltas: arm },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Upper Nod — head nod for upper-body preset */
    static upperNod() {
        const down = {
            'pin-0': { dx: 0, dy: 0.04 },
            'pin-1': { dx: 0, dy: 0.03 },
            'pin-2': { dx: 0, dy: 0.01 }
        };
        const up = {
            'pin-0': { dx: 0, dy: -0.02 },
            'pin-1': { dx: 0, dy: -0.01 }
        };
        return {
            key: 'upper-nod', name: 'Nod',
            icon: 'fa-check-circle', category: 'Gestures',
            description: 'Head nods up and down (upper body)',
            presetTypes: ['upper-body'],
            duration: 1200, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: down },
                { t: 0.50, deltas: up },
                { t: 0.75, deltas: down },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Upper Shrug — shoulders rise (upper-body preset) */
    static upperShrug() {
        const peak = {
            'pin-0':  { dx: 0, dy: 0.01 },
            'pin-1':  { dx: 0, dy: 0.01 },
            'pin-5':  { dx: -0.01, dy: -0.05 },
            'pin-6':  { dx: 0, dy: -0.04 },
            'pin-7':  { dx: 0.02, dy: -0.02 },
            'pin-8':  { dx: 0.01, dy: -0.05 },
            'pin-9':  { dx: 0, dy: -0.04 },
            'pin-10': { dx: -0.02, dy: -0.02 }
        };
        return {
            key: 'upper-shrug', name: 'Shrug',
            icon: 'fa-meh', category: 'Gestures',
            description: 'Shoulders rise in a shrug (upper body)',
            presetTypes: ['upper-body'],
            duration: 1800, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: peak },
                { t: 0.55, deltas: peak },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    // ═══════════════════════════════════════════════════════
    //  ADDITIONAL HUMAN FRONT MOVEMENTS
    // ═══════════════════════════════════════════════════════

    /** Clap — hands come together at center */
    static clap() {
        const apart = {};
        const together = {
            // Left hand moves right
            'pin-7':  { dx: 0.06, dy: -0.02 },
            'pin-8':  { dx: 0.12, dy: -0.06 },
            'pin-9':  { dx: 0.18, dy: -0.10 },
            'pin-10': { dx: 0.20, dy: -0.12 },
            // Right hand moves left
            'pin-12': { dx: -0.06, dy: -0.02 },
            'pin-13': { dx: -0.12, dy: -0.06 },
            'pin-14': { dx: -0.18, dy: -0.10 },
            'pin-15': { dx: -0.20, dy: -0.12 }
        };
        return {
            key: 'clap', name: 'Clap',
            icon: 'fa-hands', category: 'Gestures',
            description: 'Hands clap together rhythmically',
            presetTypes: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: apart },
                { t: 0.40, deltas: together },
                { t: 0.55, deltas: together },
                { t: 1.00, deltas: apart }
            ]
        };
    }

    /** Think Pose — hand on chin, head tilts */
    static thinkPose() {
        const pose = {
            // Head tilts slightly
            'pin-0':  { dx: -0.02, dy: 0.01 },
            'pin-1':  { dx: -0.015, dy: 0.01 },
            // Right arm raises to chin
            'pin-12': { dx: -0.04, dy: -0.04 },
            'pin-13': { dx: -0.14, dy: -0.16 },
            'pin-14': { dx: -0.22, dy: -0.26 },
            'pin-15': { dx: -0.24, dy: -0.30 }
        };
        return {
            key: 'think-pose', name: 'Think / Ponder',
            icon: 'fa-brain', category: 'Gestures',
            description: 'Hand on chin, head tilts — thinking pose',
            presetTypes: ['human-front'],
            duration: 3000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: pose },
                { t: 0.70, deltas: pose },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Arms Crossed — both arms fold across chest */
    static armsCrossed() {
        const crossed = {
            // Left arm crosses to right
            'pin-7':  { dx: 0.04, dy: -0.01 },
            'pin-8':  { dx: 0.12, dy: -0.06 },
            'pin-9':  { dx: 0.16, dy: -0.08 },
            'pin-10': { dx: 0.18, dy: -0.06 },
            // Right arm crosses to left
            'pin-12': { dx: -0.04, dy: -0.01 },
            'pin-13': { dx: -0.12, dy: -0.04 },
            'pin-14': { dx: -0.16, dy: -0.06 },
            'pin-15': { dx: -0.18, dy: -0.04 }
        };
        return {
            key: 'arms-crossed', name: 'Arms Crossed',
            icon: 'fa-user-shield', category: 'Gestures',
            description: 'Arms fold across the chest',
            presetTypes: ['human-front'],
            duration: 2500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: crossed },
                { t: 0.70, deltas: crossed },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Dance Groove — hip sway with arm pump */
    static danceGroove() {
        const left = {
            'pin-5':  { dx: -0.03, dy: 0 },
            'pin-4':  { dx: -0.02, dy: 0 },
            'pin-3':  { dx: -0.01, dy: 0 },
            // Left arm up
            'pin-8':  { dx: 0.04, dy: -0.08 },
            'pin-9':  { dx: 0.06, dy: -0.12 },
            'pin-10': { dx: 0.07, dy: -0.14 },
            // Right arm down
            'pin-14': { dx: -0.02, dy: 0.02 },
            'pin-15': { dx: -0.02, dy: 0.03 },
            // Knees bend
            'pin-17': { dx: -0.02, dy: -0.02 },
            'pin-21': { dx: 0.02, dy: 0.01 }
        };
        const right = {
            'pin-5':  { dx: 0.03, dy: 0 },
            'pin-4':  { dx: 0.02, dy: 0 },
            'pin-3':  { dx: 0.01, dy: 0 },
            // Right arm up
            'pin-13': { dx: -0.04, dy: -0.08 },
            'pin-14': { dx: -0.06, dy: -0.12 },
            'pin-15': { dx: -0.07, dy: -0.14 },
            // Left arm down
            'pin-9':  { dx: 0.02, dy: 0.02 },
            'pin-10': { dx: 0.02, dy: 0.03 },
            'pin-17': { dx: -0.02, dy: 0.01 },
            'pin-21': { dx: 0.02, dy: -0.02 }
        };
        return {
            key: 'dance-groove', name: 'Dance Groove',
            icon: 'fa-music', category: 'Full Body',
            description: 'Hip sway side-to-side with alternating arm pump',
            presetTypes: ['human-front'],
            duration: 1600, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: left },
                { t: 0.25, deltas: {} },
                { t: 0.50, deltas: right },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: left }
            ]
        };
    }

    /** Sneeze — head recoils, body bends */
    static sneeze() {
        const wind = {
            'pin-0':  { dx: 0, dy: -0.02 },
            'pin-1':  { dx: 0, dy: -0.015 },
            'pin-3':  { dx: 0, dy: -0.005 }
        };
        const snap = {
            'pin-0':  { dx: 0, dy: 0.06 },
            'pin-1':  { dx: 0, dy: 0.05 },
            'pin-2':  { dx: 0, dy: 0.03 },
            'pin-3':  { dx: 0, dy: 0.01 },
            // Arms jerk
            'pin-9':  { dx: 0.03, dy: 0.02 },
            'pin-10': { dx: 0.04, dy: 0.02 },
            'pin-14': { dx: -0.03, dy: 0.02 },
            'pin-15': { dx: -0.04, dy: 0.02 }
        };
        return {
            key: 'sneeze', name: 'Sneeze',
            icon: 'fa-head-side-virus', category: 'Gestures',
            description: 'Head snaps forward in a sneeze',
            presetTypes: ['human-front'],
            duration: 1500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: wind },
                { t: 0.40, deltas: snap },
                { t: 0.55, deltas: snap },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Look Around — head turns left then right */
    static lookAround() {
        const left = {
            'pin-0': { dx: -0.04, dy: 0.01 },
            'pin-1': { dx: -0.03, dy: 0.005 },
            'pin-2': { dx: -0.01, dy: 0 }
        };
        const right = {
            'pin-0': { dx: 0.04, dy: 0.01 },
            'pin-1': { dx: 0.03, dy: 0.005 },
            'pin-2': { dx: 0.01, dy: 0 }
        };
        return {
            key: 'look-around', name: 'Look Around',
            icon: 'fa-eye', category: 'Gestures',
            description: 'Head turns to look left then right',
            presetTypes: ['human-front'],
            duration: 3000, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.20, deltas: left },
                { t: 0.35, deltas: left },
                { t: 0.50, deltas: {} },
                { t: 0.65, deltas: right },
                { t: 0.80, deltas: right },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Squat — knees bend, body drops, arms in T-pose */
    static squat() {
        const down = {
            'pin-3':  { dx: 0, dy: 0.03 },
            'pin-4':  { dx: 0, dy: 0.04 },
            'pin-5':  { dx: 0, dy: 0.05 },
            'pin-17': { dx: -0.04, dy: 0.02 },
            'pin-18': { dx: -0.02, dy: 0.04 },
            'pin-19': { dx: -0.01, dy: 0.04 },
            'pin-21': { dx: 0.04, dy: 0.02 },
            'pin-22': { dx: 0.02, dy: 0.04 },
            'pin-23': { dx: 0.01, dy: 0.04 },
            // Arms extended horizontally (T-pose) - shoulders 90/-90, elbows 0
            'pin-9':  { dx: 0.18, dy: 0 },
            'pin-10': { dx: 0.20, dy: 0 },
            'pin-14': { dx: -0.18, dy: 0 },
            'pin-15': { dx: -0.20, dy: 0 }
        };
        return {
            key: 'squat', name: 'Squat',
            icon: 'fa-dumbbell', category: 'Full Body',
            description: 'Knees bend, body drops, arms extended in T-pose',
            presetTypes: ['human-front'],
            duration: 2500, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: down },
                { t: 0.55, deltas: down },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Punch Right — right arm thrusts forward, body twists */
    static punchRight() {
        const wind = {
            'pin-12': { dx: 0.03, dy: 0.01 },
            'pin-13': { dx: 0.04, dy: 0.02 },
            'pin-14': { dx: 0.05, dy: 0.03 },
            'pin-15': { dx: 0.05, dy: 0.03 },
            'pin-3':  { dx: 0.01, dy: 0 }
        };
        const punch = {
            'pin-12': { dx: -0.04, dy: -0.02 },
            'pin-13': { dx: -0.12, dy: -0.10 },
            'pin-14': { dx: -0.18, dy: -0.14 },
            'pin-15': { dx: -0.20, dy: -0.16 },
            'pin-3':  { dx: -0.02, dy: 0.01 },
            'pin-4':  { dx: -0.01, dy: 0 }
        };
        return {
            key: 'punch-right', name: 'Punch Right',
            icon: 'fa-fist-raised', category: 'Full Body',
            description: 'Right arm thrusts forward in a punch',
            presetTypes: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.20, deltas: wind },
                { t: 0.40, deltas: punch },
                { t: 0.55, deltas: punch },
                { t: 0.80, deltas: {} },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  ADDITIONAL HUMAN SIDE MOVEMENTS
    // ═══════════════════════════════════════════════════════

    /** Side Jump — crouch and spring upward */
    static sideJump() {
        const crouch = {
            'pin-0': { dx: 0, dy: 0.02 }, 'pin-1': { dx: 0, dy: 0.02 },
            'pin-2': { dx: 0, dy: 0.02 }, 'pin-3': { dx: 0, dy: 0.03 },
            'pin-4': { dx: 0, dy: 0.03 }, 'pin-5': { dx: 0, dy: 0.03 },
            'pin-11': { dx: -0.02, dy: 0.02 },
            'pin-12': { dx: -0.02, dy: 0.02 },
            'pin-15': { dx: 0.02, dy: 0.02 },
            'pin-16': { dx: 0.02, dy: 0.02 }
        };
        const air = {
            'pin-0': { dx: 0, dy: -0.06 }, 'pin-1': { dx: 0, dy: -0.06 },
            'pin-2': { dx: 0, dy: -0.05 }, 'pin-3': { dx: 0, dy: -0.05 },
            'pin-4': { dx: 0, dy: -0.05 }, 'pin-5': { dx: 0, dy: -0.05 },
            'pin-6': { dx: 0, dy: -0.05 },
            'pin-7': { dx: -0.02, dy: -0.08 },
            'pin-8': { dx: -0.03, dy: -0.09 },
            'pin-9': { dx: -0.03, dy: -0.10 },
            'pin-10': { dx: 0, dy: -0.05 },
            'pin-11': { dx: 0, dy: -0.08 },
            'pin-12': { dx: 0, dy: -0.08 },
            'pin-13': { dx: 0, dy: -0.08 },
            'pin-14': { dx: 0, dy: -0.05 },
            'pin-15': { dx: 0, dy: -0.08 },
            'pin-16': { dx: 0, dy: -0.08 },
            'pin-17': { dx: 0, dy: -0.08 }
        };
        return {
            key: 'side-jump', name: 'Jump (Side)',
            icon: 'fa-arrow-up', category: 'Full Body',
            description: 'Side-view crouch and jump',
            presetTypes: ['human-side'],
            duration: 2200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.15, deltas: crouch },
                { t: 0.35, deltas: air },
                { t: 0.50, deltas: air },
                { t: 0.70, deltas: {} },
                { t: 0.85, deltas: { 'pin-5': { dx: 0, dy: 0.01 } } },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Side Crouch — lower body drops, stays low */
    static sideCrouch() {
        const low = {
            // Drop torso deeper than crouch for a true squat profile.
            'pin-0': { dx: 0, dy: 0.04 }, 'pin-1': { dx: 0, dy: 0.05 },
            'pin-2': { dx: 0.01, dy: 0.06 }, 'pin-3': { dx: 0.01, dy: 0.08 },
            'pin-4': { dx: 0, dy: 0.08 }, 'pin-5': { dx: 0, dy: 0.08 },
            // Front leg: deeper hip/knee compression.
            'pin-11': { dx: -0.08, dy: 0.08 },
            'pin-12': { dx: -0.10, dy: 0.14 },
            'pin-13': { dx: -0.12, dy: 0.18 },
            // Back leg: slightly deeper than front leg.
            'pin-15': { dx: 0.09, dy: 0.10 },
            'pin-16': { dx: 0.12, dy: 0.16 },
            'pin-17': { dx: 0.14, dy: 0.20 },
            // Arm counterbalance for side squat profile.
            'pin-7': { dx: -0.03, dy: 0.01 },
            'pin-8': { dx: -0.05, dy: 0.02 },
            'pin-9': { dx: -0.06, dy: 0.03 }
        };
        return {
            key: 'side-crouch', name: 'Crouch (Side)',
            icon: 'fa-level-down-alt', category: 'Full Body',
            description: 'Side-view deep squat with strong knee compression',
            presetTypes: ['human-side'],
            duration: 2000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: low },
                { t: 0.70, deltas: low },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Side Push — arms extend forward, body leans */
    static sidePush() {
        const push = {
            'pin-3': { dx: -0.02, dy: 0.01 },
            'pin-6': { dx: -0.02, dy: -0.01 },
            'pin-7': { dx: -0.08, dy: -0.06 },
            'pin-8': { dx: -0.12, dy: -0.08 },
            'pin-9': { dx: -0.14, dy: -0.08 },
            'pin-0': { dx: -0.01, dy: 0.01 },
            'pin-1': { dx: -0.01, dy: 0.01 }
        };
        return {
            key: 'side-push', name: 'Push (Side)',
            icon: 'fa-hands-helping', category: 'Gestures',
            description: 'Arms push forward from side view',
            presetTypes: ['human-side'],
            duration: 2000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: push },
                { t: 0.65, deltas: push },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  ADDITIONAL QUADRUPED MOVEMENTS
    // ═══════════════════════════════════════════════════════

    /** Quadruped Run — faster gait with airborne phase */
    static quadRun() {
        const pushA = {
            'pin-7': { dx: -0.06, dy: -0.03 }, 'pin-8': { dx: -0.07, dy: -0.02 }, 'pin-9': { dx: -0.08, dy: 0 },
            'pin-16': { dx: -0.06, dy: -0.03 }, 'pin-17': { dx: -0.07, dy: -0.02 }, 'pin-18': { dx: -0.08, dy: 0 },
            'pin-10': { dx: 0.05, dy: 0.02 }, 'pin-11': { dx: 0.06, dy: 0.01 }, 'pin-12': { dx: 0.06, dy: 0 },
            'pin-13': { dx: 0.05, dy: 0.02 }, 'pin-14': { dx: 0.06, dy: 0.01 }, 'pin-15': { dx: 0.06, dy: 0 },
            'pin-0': { dx: -0.02, dy: -0.01 }, 'pin-1': { dx: -0.01, dy: -0.005 }
        };
        const airA = {
            'pin-0': { dx: -0.01, dy: -0.03 }, 'pin-1': { dx: -0.005, dy: -0.02 },
            'pin-2': { dx: 0, dy: -0.015 }, 'pin-3': { dx: 0, dy: -0.015 }, 'pin-4': { dx: 0, dy: -0.015 },
            'pin-7': { dx: -0.03, dy: -0.06 }, 'pin-8': { dx: -0.03, dy: -0.05 }, 'pin-9': { dx: -0.03, dy: -0.04 },
            'pin-10': { dx: 0.02, dy: -0.04 }, 'pin-11': { dx: 0.02, dy: -0.04 }, 'pin-12': { dx: 0.02, dy: -0.04 },
            'pin-13': { dx: 0.02, dy: -0.04 }, 'pin-14': { dx: 0.02, dy: -0.04 }, 'pin-15': { dx: 0.02, dy: -0.04 },
            'pin-16': { dx: -0.02, dy: -0.05 }, 'pin-17': { dx: -0.02, dy: -0.04 }, 'pin-18': { dx: -0.02, dy: -0.04 }
        };
        const pushB = {
            'pin-10': { dx: -0.06, dy: -0.03 }, 'pin-11': { dx: -0.07, dy: -0.02 }, 'pin-12': { dx: -0.08, dy: 0 },
            'pin-13': { dx: -0.06, dy: -0.03 }, 'pin-14': { dx: -0.07, dy: -0.02 }, 'pin-15': { dx: -0.08, dy: 0 },
            'pin-7': { dx: 0.05, dy: 0.02 }, 'pin-8': { dx: 0.06, dy: 0.01 }, 'pin-9': { dx: 0.06, dy: 0 },
            'pin-16': { dx: 0.05, dy: 0.02 }, 'pin-17': { dx: 0.06, dy: 0.01 }, 'pin-18': { dx: 0.06, dy: 0 },
            'pin-0': { dx: 0.02, dy: -0.01 }, 'pin-1': { dx: 0.01, dy: -0.005 }
        };
        return {
            key: 'quad-run', name: 'Run (Quadruped)',
            icon: 'fa-bolt', category: 'Locomotion',
            description: 'Running gait with airborne phase',
            presetTypes: ['quadruped'],
            duration: 1600, easing: 'linear', repeat: 5,
            keyframes: [
                { t: 0.00, deltas: pushA },
                { t: 0.25, deltas: airA },
                { t: 0.50, deltas: pushB },
                { t: 0.75, deltas: airA },
                { t: 1.00, deltas: pushA }
            ]
        };
    }

    /** Quadruped Sit — rear legs fold, front stays */
    static quadSit() {
        const sit = {
            'pin-4': { dx: 0.02, dy: 0.04 },
            'pin-5': { dx: 0.03, dy: 0.05 },
            'pin-6': { dx: 0.04, dy: 0.06 },
            'pin-13': { dx: -0.02, dy: 0.04 }, 'pin-14': { dx: -0.04, dy: 0.04 }, 'pin-15': { dx: -0.04, dy: 0.02 },
            'pin-16': { dx: 0.02, dy: 0.04 }, 'pin-17': { dx: 0.04, dy: 0.04 }, 'pin-18': { dx: 0.04, dy: 0.02 },
            'pin-0': { dx: -0.01, dy: -0.02 }, 'pin-1': { dx: -0.005, dy: -0.01 }
        };
        return {
            key: 'quad-sit', name: 'Sit (Quadruped)',
            icon: 'fa-chair', category: 'Gestures',
            description: 'Rear legs fold into sitting position',
            presetTypes: ['quadruped'],
            duration: 2500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.35, deltas: sit },
                { t: 0.70, deltas: sit },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Quadruped Shake — body shakes left to right */
    static quadShake() {
        const left = {
            'pin-0': { dx: 0, dy: -0.03 }, 'pin-1': { dx: 0, dy: -0.02 },
            'pin-2': { dx: 0, dy: -0.015 }, 'pin-3': { dx: 0, dy: -0.01 },
            'pin-5': { dx: 0, dy: -0.02 }, 'pin-6': { dx: 0, dy: -0.04 }
        };
        const right = {
            'pin-0': { dx: 0, dy: 0.03 }, 'pin-1': { dx: 0, dy: 0.02 },
            'pin-2': { dx: 0, dy: 0.015 }, 'pin-3': { dx: 0, dy: 0.01 },
            'pin-5': { dx: 0, dy: 0.02 }, 'pin-6': { dx: 0, dy: 0.04 }
        };
        return {
            key: 'quad-shake', name: 'Shake (Quadruped)',
            icon: 'fa-sync', category: 'Gestures',
            description: 'Body shakes side to side — shaking off water',
            presetTypes: ['quadruped'],
            duration: 1000, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: left },
                { t: 0.50, deltas: {} },
                { t: 0.75, deltas: right },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Quadruped Idle — subtle breathing/weight shift */
    static quadIdle() {
        const breathe = {
            'pin-2': { dx: 0, dy: -0.005 }, 'pin-3': { dx: 0, dy: -0.008 },
            'pin-0': { dx: -0.003, dy: -0.003 },
            'pin-5': { dx: 0, dy: -0.003 }, 'pin-6': { dx: 0, dy: -0.005 }
        };
        return {
            key: 'quad-idle', name: 'Idle (Quadruped)',
            icon: 'fa-paw', category: 'Idle',
            description: 'Subtle breathing and weight shift',
            presetTypes: ['quadruped'],
            duration: 3500, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.45, deltas: breathe },
                { t: 0.55, deltas: breathe },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  ADDITIONAL UPPER BODY MOVEMENTS
    // ═══════════════════════════════════════════════════════

    /** Upper Clap — hands clap in center (upper body) */
    static upperClap() {
        const together = {
            'pin-5': { dx: 0.04, dy: -0.02 },
            'pin-6': { dx: 0.12, dy: -0.08 },
            'pin-7': { dx: 0.18, dy: -0.14 },
            'pin-8': { dx: -0.04, dy: -0.02 },
            'pin-9': { dx: -0.12, dy: -0.08 },
            'pin-10': { dx: -0.18, dy: -0.14 }
        };
        return {
            key: 'upper-clap', name: 'Clap',
            icon: 'fa-hands', category: 'Gestures',
            description: 'Hands clap together (upper body)',
            presetTypes: ['upper-body'],
            duration: 1200, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.40, deltas: together },
                { t: 0.55, deltas: together },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Upper Think — hand to chin (upper body) */
    static upperThink() {
        const pose = {
            'pin-0': { dx: -0.02, dy: 0.01 },
            'pin-1': { dx: -0.015, dy: 0.01 },
            'pin-8': { dx: -0.02, dy: -0.04 },
            'pin-9': { dx: -0.10, dy: -0.18 },
            'pin-10': { dx: -0.18, dy: -0.30 }
        };
        return {
            key: 'upper-think', name: 'Think',
            icon: 'fa-brain', category: 'Gestures',
            description: 'Hand on chin — pondering (upper body)',
            presetTypes: ['upper-body'],
            duration: 3000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: pose },
                { t: 0.70, deltas: pose },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  BIRD MOVEMENTS  (17 pins: 0 head, 1 beak, 2 neck,
    //   3 chest, 4 mid, 5 tail base, 6 tail tip,
    //   7-9 L wing, 10-12 R wing, 13-14 L leg, 15-16 R leg)
    // ═══════════════════════════════════════════════════════

    /** Bird Wing Flap — wings beat up and down */
    static birdFlap() {
        const up = {
            'pin-7': { dx: 0, dy: -0.04 },
            'pin-8': { dx: 0, dy: -0.10 },
            'pin-9': { dx: 0, dy: -0.16 },
            'pin-10': { dx: 0, dy: 0.04 },
            'pin-11': { dx: 0, dy: 0.10 },
            'pin-12': { dx: 0, dy: 0.16 }
        };
        const down = {
            'pin-7': { dx: 0, dy: 0.03 },
            'pin-8': { dx: 0, dy: 0.06 },
            'pin-9': { dx: 0, dy: 0.08 },
            'pin-10': { dx: 0, dy: -0.03 },
            'pin-11': { dx: 0, dy: -0.06 },
            'pin-12': { dx: 0, dy: -0.08 }
        };
        return {
            key: 'bird-flap', name: 'Wing Flap',
            icon: 'fa-dove', category: 'Locomotion',
            description: 'Wings beat up and down in flight',
            presetTypes: ['bird'],
            duration: 1200, easing: 'easeInOut', repeat: 6,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: up },
                { t: 0.50, deltas: {} },
                { t: 0.75, deltas: down },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Bird Glide — wings spread, body rocks subtly */
    static birdGlide() {
        const spread = {
            'pin-8': { dx: -0.03, dy: -0.06 },
            'pin-9': { dx: -0.06, dy: -0.10 },
            'pin-11': { dx: -0.03, dy: 0.06 },
            'pin-12': { dx: -0.06, dy: 0.10 }
        };
        const tilt = {
            ...spread,
            'pin-3': { dx: 0, dy: 0.01 },
            'pin-0': { dx: 0, dy: -0.01 }
        };
        return {
            key: 'bird-glide', name: 'Glide',
            icon: 'fa-wind', category: 'Locomotion',
            description: 'Wings spread for soaring/gliding',
            presetTypes: ['bird'],
            duration: 4000, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, deltas: spread },
                { t: 0.45, deltas: tilt },
                { t: 0.55, deltas: tilt },
                { t: 1.00, deltas: spread }
            ]
        };
    }

    /** Bird Peck — head dips down and back */
    static birdPeck() {
        const peck = {
            'pin-0': { dx: -0.04, dy: 0.06 },
            'pin-1': { dx: -0.06, dy: 0.08 },
            'pin-2': { dx: -0.02, dy: 0.03 }
        };
        return {
            key: 'bird-peck', name: 'Peck',
            icon: 'fa-seedling', category: 'Gestures',
            description: 'Head dips down to peck',
            presetTypes: ['bird'],
            duration: 1000, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.35, deltas: peck },
                { t: 0.50, deltas: peck },
                { t: 0.70, deltas: {} },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Bird Idle — subtle body bob and tail flick */
    static birdIdle() {
        const bob = {
            'pin-0': { dx: -0.005, dy: 0.005 },
            'pin-1': { dx: -0.003, dy: 0.003 },
            'pin-5': { dx: 0, dy: -0.003 },
            'pin-6': { dx: 0, dy: -0.006 }
        };
        return {
            key: 'bird-idle', name: 'Idle (Bird)',
            icon: 'fa-feather', category: 'Idle',
            description: 'Subtle head bob and tail flick',
            presetTypes: ['bird'],
            duration: 3000, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.40, deltas: bob },
                { t: 0.60, deltas: bob },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  FISH MOVEMENTS  (12 pins: 0 mouth, 1 head,
    //   2-4 spine, 5 tail base, 6-7 tail, 8 dorsal,
    //   9-10 pectorals, 11 ventral)
    // ═══════════════════════════════════════════════════════

    /** Fish Swim — sinusoidal spine undulation */
    static fishSwim() {
        const curveA = {
            'pin-0': { dx: 0, dy: -0.02 },
            'pin-1': { dx: 0, dy: -0.015 },
            'pin-3': { dx: 0, dy: 0.015 },
            'pin-4': { dx: 0, dy: 0.02 },
            'pin-5': { dx: 0, dy: -0.02 },
            'pin-6': { dx: 0, dy: -0.04 },
            'pin-7': { dx: 0, dy: -0.03 },
            'pin-9': { dx: 0.01, dy: 0.02 },
            'pin-10': { dx: 0.01, dy: -0.02 }
        };
        const curveB = {
            'pin-0': { dx: 0, dy: 0.02 },
            'pin-1': { dx: 0, dy: 0.015 },
            'pin-3': { dx: 0, dy: -0.015 },
            'pin-4': { dx: 0, dy: -0.02 },
            'pin-5': { dx: 0, dy: 0.02 },
            'pin-6': { dx: 0, dy: 0.04 },
            'pin-7': { dx: 0, dy: 0.03 },
            'pin-9': { dx: 0.01, dy: -0.02 },
            'pin-10': { dx: 0.01, dy: 0.02 }
        };
        return {
            key: 'fish-swim', name: 'Swim',
            icon: 'fa-fish', category: 'Locomotion',
            description: 'Sinusoidal spine undulation — swimming motion',
            presetTypes: ['fish'],
            duration: 1800, easing: 'linear', repeat: 6,
            keyframes: [
                { t: 0.00, deltas: curveA },
                { t: 0.25, deltas: {} },
                { t: 0.50, deltas: curveB },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: curveA }
            ]
        };
    }

    /** Fish Idle — gentle drift and fin movement */
    static fishIdle() {
        const drift = {
            'pin-9': { dx: 0.005, dy: 0.01 },
            'pin-10': { dx: 0.005, dy: -0.01 },
            'pin-8': { dx: 0.003, dy: -0.005 },
            'pin-11': { dx: 0.003, dy: 0.005 },
            'pin-6': { dx: 0, dy: -0.008 },
            'pin-7': { dx: 0, dy: 0.008 }
        };
        return {
            key: 'fish-idle', name: 'Idle (Fish)',
            icon: 'fa-water', category: 'Idle',
            description: 'Gentle fin and tail drift',
            presetTypes: ['fish'],
            duration: 3500, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.45, deltas: drift },
                { t: 0.55, deltas: drift },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  FACIAL RIG MOVEMENTS  (15 pins: 0 forehead,
    //   1 chin, 2-3 L brow, 4-5 R brow, 6-7 eyes,
    //   8 nose, 9-12 mouth, 13-14 cheeks)
    // ═══════════════════════════════════════════════════════

    /** Smile — corners rise, cheeks push up */
    static faceSmile() {
        const smile = {
            'pin-9':  { dx: -0.02, dy: -0.02 },
            'pin-11': { dx: 0.02, dy: -0.02 },
            'pin-12': { dx: 0, dy: -0.01 },
            'pin-13': { dx: -0.01, dy: -0.02 },
            'pin-14': { dx: 0.01, dy: -0.02 },
            'pin-6':  { dx: 0, dy: 0.005 },
            'pin-7':  { dx: 0, dy: 0.005 }
        };
        return {
            key: 'face-smile', name: 'Smile',
            icon: 'fa-smile', category: 'Expressions',
            description: 'Mouth corners rise, cheeks push up',
            presetTypes: ['face'],
            duration: 2000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: smile },
                { t: 0.70, deltas: smile },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Surprise — brows raise, mouth opens, eyes widen */
    static faceSurprise() {
        const surprise = {
            'pin-2':  { dx: 0, dy: -0.03 },
            'pin-3':  { dx: 0, dy: -0.03 },
            'pin-4':  { dx: 0, dy: -0.03 },
            'pin-5':  { dx: 0, dy: -0.03 },
            'pin-6':  { dx: 0, dy: -0.01 },
            'pin-7':  { dx: 0, dy: -0.01 },
            'pin-12': { dx: 0, dy: 0.03 },
            'pin-1':  { dx: 0, dy: 0.01 },
            'pin-9':  { dx: -0.01, dy: 0 },
            'pin-11': { dx: 0.01, dy: 0 }
        };
        return {
            key: 'face-surprise', name: 'Surprise',
            icon: 'fa-surprise', category: 'Expressions',
            description: 'Brows up, mouth drops open, eyes widen',
            presetTypes: ['face'],
            duration: 1800, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.25, deltas: surprise },
                { t: 0.70, deltas: surprise },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Sad — brows droop, mouth corners drop */
    static faceSad() {
        const sad = {
            'pin-2':  { dx: 0.01, dy: 0.02 },
            'pin-3':  { dx: 0, dy: 0.01 },
            'pin-4':  { dx: -0.01, dy: 0.02 },
            'pin-5':  { dx: 0, dy: 0.01 },
            'pin-9':  { dx: 0, dy: 0.02 },
            'pin-11': { dx: 0, dy: 0.02 },
            'pin-12': { dx: 0, dy: 0.01 },
            'pin-13': { dx: 0, dy: 0.01 },
            'pin-14': { dx: 0, dy: 0.01 }
        };
        return {
            key: 'face-sad', name: 'Sad',
            icon: 'fa-frown', category: 'Expressions',
            description: 'Brows droop, mouth corners pull down',
            presetTypes: ['face'],
            duration: 2500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: sad },
                { t: 0.70, deltas: sad },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Blink — eyes close and reopen quickly */
    static faceBlink() {
        const closed = {
            'pin-6': { dx: 0, dy: 0.015 },
            'pin-7': { dx: 0, dy: 0.015 },
            'pin-2': { dx: 0, dy: 0.005 },
            'pin-4': { dx: 0, dy: 0.005 }
        };
        return {
            key: 'face-blink', name: 'Blink',
            icon: 'fa-eye-slash', category: 'Expressions',
            description: 'Quick eye blink cycle',
            presetTypes: ['face'],
            duration: 600, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: closed },
                { t: 0.50, deltas: closed },
                { t: 0.70, deltas: {} },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Talk — mouth opens and closes rhythmically */
    static faceTalk() {
        const open = {
            'pin-12': { dx: 0, dy: 0.025 },
            'pin-1':  { dx: 0, dy: 0.01 },
            'pin-9':  { dx: -0.005, dy: 0 },
            'pin-11': { dx: 0.005, dy: 0 }
        };
        const half = {
            'pin-12': { dx: 0, dy: 0.012 },
            'pin-9':  { dx: -0.003, dy: 0 },
            'pin-11': { dx: 0.003, dy: 0 }
        };
        return {
            key: 'face-talk', name: 'Talk',
            icon: 'fa-comment', category: 'Expressions',
            description: 'Mouth opens and closes — speaking animation',
            presetTypes: ['face'],
            duration: 1000, easing: 'easeInOut', repeat: 6,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.15, deltas: open },
                { t: 0.35, deltas: half },
                { t: 0.55, deltas: open },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  SPIDER MOVEMENTS  (19 pins: 0 head, 1 thorax, 2 abdomen,
    //   3-4 L1, 5-6 L2, 7-8 L3, 9-10 L4,
    //   11-12 R1, 13-14 R2, 15-16 R3, 17-18 R4)
    // ═══════════════════════════════════════════════════════

    /** Spider Walk — alternating tetrapod gait (L1+L3+R2+R4 then L2+L4+R1+R3) */
    static spiderWalk() {
        const stepA = {
            // Group A forward: L1, L3, R2, R4
            'pin-3': { dx: -0.02, dy: -0.02 }, 'pin-4': { dx: -0.04, dy: -0.03 },
            'pin-7': { dx: -0.02, dy: -0.02 }, 'pin-8': { dx: -0.04, dy: -0.03 },
            'pin-13': { dx: -0.02, dy: 0.02 }, 'pin-14': { dx: -0.04, dy: 0.03 },
            'pin-17': { dx: -0.02, dy: 0.02 }, 'pin-18': { dx: -0.04, dy: 0.03 },
            // Group B back: L2, L4, R1, R3
            'pin-5': { dx: 0.02, dy: 0.01 }, 'pin-6': { dx: 0.03, dy: 0.02 },
            'pin-9': { dx: 0.02, dy: 0.01 }, 'pin-10': { dx: 0.03, dy: 0.02 },
            'pin-11': { dx: 0.02, dy: -0.01 }, 'pin-12': { dx: 0.03, dy: -0.02 },
            'pin-15': { dx: 0.02, dy: -0.01 }, 'pin-16': { dx: 0.03, dy: -0.02 }
        };
        const stepB = {
            'pin-5': { dx: -0.02, dy: -0.02 }, 'pin-6': { dx: -0.04, dy: -0.03 },
            'pin-9': { dx: -0.02, dy: -0.02 }, 'pin-10': { dx: -0.04, dy: -0.03 },
            'pin-11': { dx: -0.02, dy: 0.02 }, 'pin-12': { dx: -0.04, dy: 0.03 },
            'pin-15': { dx: -0.02, dy: 0.02 }, 'pin-16': { dx: -0.04, dy: 0.03 },
            'pin-3': { dx: 0.02, dy: 0.01 }, 'pin-4': { dx: 0.03, dy: 0.02 },
            'pin-7': { dx: 0.02, dy: 0.01 }, 'pin-8': { dx: 0.03, dy: 0.02 },
            'pin-13': { dx: 0.02, dy: -0.01 }, 'pin-14': { dx: 0.03, dy: -0.02 },
            'pin-17': { dx: 0.02, dy: -0.01 }, 'pin-18': { dx: 0.03, dy: -0.02 }
        };
        return {
            key: 'spider-walk', name: 'Walk (Spider)',
            icon: 'fa-spider', category: 'Locomotion',
            description: 'Alternating tetrapod gait — 4 legs move at a time',
            presetTypes: ['spider'],
            duration: 1600, easing: 'linear', repeat: 5,
            keyframes: [
                { t: 0.00, deltas: stepA },
                { t: 0.25, deltas: {} },
                { t: 0.50, deltas: stepB },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: stepA }
            ]
        };
    }

    /** Spider Idle — legs twitch, body pulses */
    static spiderIdle() {
        const pulse = {
            'pin-0': { dx: -0.003, dy: 0 },
            'pin-2': { dx: 0.003, dy: 0 },
            'pin-4': { dx: -0.005, dy: -0.005 },
            'pin-12': { dx: -0.005, dy: 0.005 },
            'pin-8': { dx: -0.005, dy: -0.003 },
            'pin-16': { dx: -0.005, dy: 0.003 }
        };
        return {
            key: 'spider-idle', name: 'Idle (Spider)',
            icon: 'fa-spider', category: 'Idle',
            description: 'Subtle leg twitches and body pulse',
            presetTypes: ['spider'],
            duration: 3000, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.40, deltas: pulse },
                { t: 0.60, deltas: pulse },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  CENTAUR MOVEMENTS  (27 pins: 0-3 upper body,
    //   4-6 L arm, 7-9 R arm, 10-14 horse body/tail,
    //   15-17 FL, 18-20 FR, 21-23 RL, 24-26 RR)
    // ═══════════════════════════════════════════════════════

    /** Centaur Trot — four-legged trot with arm counterbalance */
    static centaurTrot() {
        const phaseA = {
            // FL + RR forward
            'pin-15': { dx: -0.04, dy: -0.02 }, 'pin-16': { dx: -0.04, dy: -0.01 }, 'pin-17': { dx: -0.05, dy: 0 },
            'pin-24': { dx: -0.04, dy: -0.02 }, 'pin-25': { dx: -0.04, dy: -0.01 }, 'pin-26': { dx: -0.05, dy: 0 },
            // FR + RL back
            'pin-18': { dx: 0.03, dy: 0.01 }, 'pin-19': { dx: 0.04, dy: 0.01 }, 'pin-20': { dx: 0.04, dy: 0 },
            'pin-21': { dx: 0.03, dy: 0.01 }, 'pin-22': { dx: 0.04, dy: 0.01 }, 'pin-23': { dx: 0.04, dy: 0 },
            // Arm counter
            'pin-5': { dx: 0.02, dy: -0.01 }, 'pin-6': { dx: 0.03, dy: -0.01 },
            'pin-8': { dx: -0.02, dy: 0.01 }, 'pin-9': { dx: -0.03, dy: 0.01 }
        };
        const phaseB = {
            'pin-18': { dx: -0.04, dy: -0.02 }, 'pin-19': { dx: -0.04, dy: -0.01 }, 'pin-20': { dx: -0.05, dy: 0 },
            'pin-21': { dx: -0.04, dy: -0.02 }, 'pin-22': { dx: -0.04, dy: -0.01 }, 'pin-23': { dx: -0.05, dy: 0 },
            'pin-15': { dx: 0.03, dy: 0.01 }, 'pin-16': { dx: 0.04, dy: 0.01 }, 'pin-17': { dx: 0.04, dy: 0 },
            'pin-24': { dx: 0.03, dy: 0.01 }, 'pin-25': { dx: 0.04, dy: 0.01 }, 'pin-26': { dx: 0.04, dy: 0 },
            'pin-5': { dx: -0.02, dy: 0.01 }, 'pin-6': { dx: -0.03, dy: 0.01 },
            'pin-8': { dx: 0.02, dy: -0.01 }, 'pin-9': { dx: 0.03, dy: -0.01 }
        };
        return {
            key: 'centaur-trot', name: 'Trot (Centaur)',
            icon: 'fa-horse', category: 'Locomotion',
            description: 'Four-legged trot with arm counterbalance',
            presetTypes: ['centaur'],
            duration: 2000, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: phaseA },
                { t: 0.25, deltas: {} },
                { t: 0.50, deltas: phaseB },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: phaseA }
            ]
        };
    }

    /** Centaur Rear — front legs lift, arms raise */
    static centaurRear() {
        const rear = {
            'pin-0': { dx: 0, dy: -0.04 }, 'pin-1': { dx: 0, dy: -0.03 },
            'pin-2': { dx: 0, dy: -0.02 }, 'pin-3': { dx: 0, dy: -0.01 },
            'pin-15': { dx: -0.03, dy: -0.08 }, 'pin-16': { dx: -0.03, dy: -0.06 }, 'pin-17': { dx: -0.02, dy: -0.06 },
            'pin-18': { dx: 0.02, dy: -0.08 }, 'pin-19': { dx: 0.02, dy: -0.06 }, 'pin-20': { dx: 0.02, dy: -0.06 },
            'pin-5': { dx: -0.03, dy: -0.08 }, 'pin-6': { dx: -0.04, dy: -0.12 },
            'pin-8': { dx: 0.03, dy: -0.08 }, 'pin-9': { dx: 0.04, dy: -0.12 },
            'pin-13': { dx: 0.01, dy: 0.02 }, 'pin-14': { dx: 0.02, dy: 0.03 }
        };
        return {
            key: 'centaur-rear', name: 'Rear Up (Centaur)',
            icon: 'fa-horse', category: 'Full Body',
            description: 'Front legs lift, arms raise overhead',
            presetTypes: ['centaur'],
            duration: 3000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.30, deltas: rear },
                { t: 0.60, deltas: rear },
                { t: 1.00, deltas: {} }
            ]
        };
    }


    // ═══════════════════════════════════════════════════════
    //  GENERIC BIPED MOVEMENTS  (17 pins: 0-4 head/spine,
    //   5-6 L arm, 7-8 R arm, 9-11 L leg, 12-14 R leg,
    //   15-16 tail)
    // ═══════════════════════════════════════════════════════

    /** Biped Walk — generic two-legged walk with arm swing */
    static bipedWalk() {
        const phaseA = {
            'pin-3': { dx: 0.01, dy: 0 },
            'pin-9': { dx: 0, dy: -0.01 },
            'pin-10': { dx: -0.02, dy: -0.04 },
            'pin-11': { dx: -0.02, dy: -0.03 },
            'pin-13': { dx: 0.01, dy: 0.01 },
            'pin-5': { dx: 0.02, dy: -0.01 }, 'pin-6': { dx: 0.03, dy: -0.01 },
            'pin-7': { dx: -0.02, dy: 0.01 }, 'pin-8': { dx: -0.03, dy: 0.01 },
            'pin-15': { dx: 0.01, dy: 0 }, 'pin-16': { dx: 0.02, dy: 0 }
        };
        const phaseB = {
            'pin-3': { dx: -0.01, dy: 0 },
            'pin-12': { dx: 0, dy: -0.01 },
            'pin-13': { dx: 0.02, dy: -0.04 },
            'pin-14': { dx: 0.02, dy: -0.03 },
            'pin-10': { dx: -0.01, dy: 0.01 },
            'pin-5': { dx: -0.02, dy: 0.01 }, 'pin-6': { dx: -0.03, dy: 0.01 },
            'pin-7': { dx: 0.02, dy: -0.01 }, 'pin-8': { dx: 0.03, dy: -0.01 },
            'pin-15': { dx: -0.01, dy: 0 }, 'pin-16': { dx: -0.02, dy: 0 }
        };
        return {
            key: 'biped-walk', name: 'Walk (Biped)',
            icon: 'fa-shoe-prints', category: 'Locomotion',
            description: 'Two-legged walk with arm/tail swing',
            presetTypes: ['biped'],
            duration: 2000, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, deltas: phaseA },
                { t: 0.25, deltas: {} },
                { t: 0.50, deltas: phaseB },
                { t: 0.75, deltas: {} },
                { t: 1.00, deltas: phaseA }
            ]
        };
    }

    /** Biped Idle — subtle weight shift */
    static bipedIdle() {
        const sway = {
            'pin-0': { dx: -0.003, dy: -0.003 },
            'pin-1': { dx: -0.003, dy: -0.003 },
            'pin-2': { dx: -0.002, dy: -0.002 },
            'pin-6': { dx: -0.004, dy: -0.002 },
            'pin-8': { dx: -0.004, dy: -0.002 },
            'pin-16': { dx: 0.003, dy: 0.003 }
        };
        return {
            key: 'biped-idle', name: 'Idle (Biped)',
            icon: 'fa-robot', category: 'Idle',
            description: 'Subtle weight shift and sway',
            presetTypes: ['biped'],
            duration: 3500, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.45, deltas: sway },
                { t: 0.55, deltas: sway },
                { t: 1.00, deltas: {} }
            ]
        };
    }

    /** Biped Jump — crouch and spring */
    static bipedJump() {
        const cr = {
            'pin-0': { dx: 0, dy: 0.02 }, 'pin-1': { dx: 0, dy: 0.02 },
            'pin-2': { dx: 0, dy: 0.02 }, 'pin-3': { dx: 0, dy: 0.03 },
            'pin-4': { dx: 0, dy: 0.03 },
            'pin-10': { dx: -0.02, dy: 0.02 }, 'pin-13': { dx: 0.02, dy: 0.02 }
        };
        const air = {
            'pin-0': { dx: 0, dy: -0.06 }, 'pin-1': { dx: 0, dy: -0.06 },
            'pin-2': { dx: 0, dy: -0.05 }, 'pin-3': { dx: 0, dy: -0.05 },
            'pin-4': { dx: 0, dy: -0.05 },
            'pin-5': { dx: -0.02, dy: -0.08 }, 'pin-6': { dx: -0.03, dy: -0.10 },
            'pin-7': { dx: 0.02, dy: -0.08 }, 'pin-8': { dx: 0.03, dy: -0.10 },
            'pin-9': { dx: 0, dy: -0.05 }, 'pin-10': { dx: 0, dy: -0.07 }, 'pin-11': { dx: 0, dy: -0.08 },
            'pin-12': { dx: 0, dy: -0.05 }, 'pin-13': { dx: 0, dy: -0.07 }, 'pin-14': { dx: 0, dy: -0.08 },
            'pin-15': { dx: 0, dy: -0.04 }, 'pin-16': { dx: 0, dy: -0.05 }
        };
        return {
            key: 'biped-jump', name: 'Jump (Biped)',
            icon: 'fa-arrow-up', category: 'Full Body',
            description: 'Crouch and spring into the air',
            presetTypes: ['biped'],
            duration: 2200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, deltas: {} },
                { t: 0.15, deltas: cr },
                { t: 0.35, deltas: air },
                { t: 0.50, deltas: air },
                { t: 0.70, deltas: {} },
                { t: 1.00, deltas: {} }
            ]
        };
    }
}
