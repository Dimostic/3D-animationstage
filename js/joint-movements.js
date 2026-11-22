class JointMovements {

    /**
     * Each movement returns:
     *  { key, name, icon, category, description, presetKeys[],
     *    duration, easing, repeat,
     *    keyframes: [ { t: 0-1, angles: { partKey: degrees },
     *                  tilts?: { partKey: { x?, y? } },
     *                  offsets?: { partKey: { x?, y? } } } ] }
     *
     * Angles are RELATIVE to defaultAngle and clamped to the global joint range.
     * Tilt deltas are RELATIVE to the object's current tilt at the time the movement is applied.
     * Position offsets are RELATIVE to the object's current x/y at the time the movement is applied.
     */

    static getAll() {
        return [
            // Human front
            this.hfWave(), this.hfClap(), this.hfWalk(), this.hfHandsOnHips(), this.hfIdle(),
            this.hfFrontWalkCycle(),
            this.hfJump(), this.hfDance(), this.hfNod(), this.hfShrug(),
            this.hfPunch(), this.hfKick(), this.hfBow(), this.hfThink(),
            this.hfPhoneCallPreEar(),
            this.hfPoint(), this.hfTalkingGesture(), this.hfArmsCrossed(), this.hfJumpingJacks(),
            this.hfHeadShake(), this.hfCelebrate(), this.hfCombatIdle(), this.hfStrongmanFlex(),
            this.hfEat(), this.hfDrink(), this.hfAimingPropHold(),
            // Human front — tilt-driven (front-facing depth via Tilt X/Y, with subtle Z assist)
            this.hfWalkCycleTilt(), this.hfRunCycleTilt(),
            this.hfFrontJabTilt(), this.hfFrontKickTilt(),
            this.hfIdleBreatheTilt(), this.hfLookAroundTilt(),
            this.hfTurnRight(), this.hfTurnLeft(),
            ...this.getGuidedFrontEssentials(),
            ...this.getHumanFrontDailyActivities(),
            ...this.getHumanFrontPoseHoldMovements(),
            // Human side
            this.hsWalk(), this.hsRun(), this.hsKick(), this.hsCrouch(),
            this.hsPunch(), this.hsBow(), this.hsEat(), this.hsDrink(), this.hsJump(),
            // Quadruped
            this.qWalk(), this.qRun(), this.qSit(), this.qTailWag(),
            // Bird
            this.bFlap(), this.bGlide(), this.bPeck(),
            // Spider
            this.spWalk(), this.spIdle(),
            // Fish
            this.fSwim(), this.fIdle()
        ];
    }

    static _createPoseHoldMovement(poseDef) {
        const key = poseDef.id
            .replace(/^builtin-human-front-/, 'hf-pose-')
            .replace(/[^a-z0-9-]/gi, '-')
            .replace(/-+/g, '-');
        const activeLayer = {};
        if (Array.isArray(poseDef.frontViewLayerOverride)) activeLayer.frontViewLayerOverride = poseDef.frontViewLayerOverride;
        if (Array.isArray(poseDef.backViewLayerOverride)) activeLayer.backViewLayerOverride = poseDef.backViewLayerOverride;
        if (Array.isArray(poseDef.layerOrderOverride)) activeLayer.layerOrderOverride = poseDef.layerOrderOverride;
        if (poseDef.agbadaArmLayerMode) activeLayer.agbadaArmLayerMode = poseDef.agbadaArmLayerMode;
        return {
            key,
            name: `Pose: ${poseDef.name}`,
            icon: poseDef.icon || 'fa-user',
            category: `Pose Holds · ${poseDef.category}`,
            description: `Animated hold version of the "${poseDef.name}" static pose.`,
            presetKeys: [poseDef.presetKey || 'human-front'],
            duration: 2200,
            easing: 'easeInOut',
            repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.22, angles: { ...poseDef.angles }, contacts: poseDef.contacts ? { ...poseDef.contacts } : undefined, ...activeLayer },
                { t: 0.78, angles: { ...poseDef.angles }, contacts: poseDef.contacts ? { ...poseDef.contacts } : undefined, ...activeLayer },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static getHumanFrontPoseHoldMovements() {
        return HUMAN_FRONT_STATIC_POSES.map(poseDef => this._createPoseHoldMovement(poseDef));
    }

    static getGuidedFrontEssentials() {
        return [
            this.hfGuidedReadyBob(),
            this.hfGuidedPowerWalk(),
            this.hfGuidedRun(),
            this.hfGuidedStrutWalk(),
            this.hfGuidedCasualWalk(),
            this.hfGuidedStrutTravel(),
            this.hfGuidedStrollTravel(),
            this.hfFrontWalkForward(),
            this.hfGuidedGuardShift(),
            this.hfGuidedJabCombo(),
            this.hfGuidedSneakLoop()
        ];
    }

    // Daily-activity movements (front-facing). Authored in the same front-angle space
    // as the other human-front moves so they surface in BOTH the Joint Movements picker
    // (availability-filtered for any assembled human rig) and the Pose Armature catalog.
    static getHumanFrontDailyActivities() {
        const seated = {
            'r-upper-leg': 60, 'r-lower-leg': -90, 'r-foot': 0,
            'l-upper-leg': -60, 'l-lower-leg': 90, 'l-foot': 0
        };
        const frontLayer = ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'];
        const f = (t, angles = {}, extra = {}) => ({ t, angles, frontViewLayerOverride: frontLayer, ...extra });
        const move = (key, name, icon, category, description, duration, repeat, keyframes) => ({
            key,
            name,
            icon,
            category,
            description,
            presetKeys: ['human-front'],
            duration,
            easing: 'easeInOut',
            repeat,
            keyframes
        });
        return [
            {
                key: 'hf-read-book-seated', name: 'Read Book (Seated)', icon: 'fa-book-open',
                category: 'Daily Activities', description: 'Front-facing seated reading loop, both hands holding a book at chest height.',
                presetKeys: ['human-front'], duration: 2200, easing: 'easeInOut', repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 4, 'r-upper-arm': 34, 'r-forearm': -94, 'r-hand': -8, 'l-upper-arm': -34, 'l-forearm': 94, 'l-hand': 8, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.34, angles: { torso: 5, 'r-upper-arm': 36, 'r-forearm': -98, 'r-hand': -4, 'l-upper-arm': -36, 'l-forearm': 98, 'l-hand': 4, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.66, angles: { torso: 3, 'r-upper-arm': 32, 'r-forearm': -90, 'r-hand': -10, 'l-upper-arm': -32, 'l-forearm': 90, 'l-hand': 10, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 1.00, angles: { torso: 4, 'r-upper-arm': 34, 'r-forearm': -94, 'r-hand': -8, 'l-upper-arm': -34, 'l-forearm': 94, 'l-hand': 8, ...seated }, frontViewLayerOverride: frontLayer }
                ]
            },
            {
                key: 'hf-write-seated', name: 'Write (Seated)', icon: 'fa-pen',
                category: 'Daily Activities', description: 'Front-facing seated writing loop; one hand makes small pen strokes while the other steadies the page.',
                presetKeys: ['human-front'], duration: 1500, easing: 'easeInOut', repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 5, 'r-upper-arm': 18, 'r-forearm': -82, 'r-hand': -14, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.25, angles: { torso: 5, 'r-upper-arm': 20, 'r-forearm': -84, 'r-hand': 8, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.50, angles: { torso: 4, 'r-upper-arm': 16, 'r-forearm': -78, 'r-hand': -18, 'l-upper-arm': -18, 'l-forearm': 74, 'l-hand': 2, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.75, angles: { torso: 5, 'r-upper-arm': 20, 'r-forearm': -84, 'r-hand': 8, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 1.00, angles: { torso: 5, 'r-upper-arm': 18, 'r-forearm': -82, 'r-hand': -14, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seated }, frontViewLayerOverride: frontLayer }
                ]
            },
            {
                key: 'hf-type-seated', name: 'Type (Seated)', icon: 'fa-keyboard',
                category: 'Daily Activities', description: 'Front-facing seated typing loop with alternating wrist taps from both hands.',
                presetKeys: ['human-front'], duration: 1200, easing: 'easeInOut', repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 3, 'r-upper-arm': 14, 'r-forearm': -74, 'r-hand': 2, 'l-upper-arm': -14, 'l-forearm': 74, 'l-hand': -2, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.25, angles: { torso: 3, 'r-upper-arm': 16, 'r-forearm': -78, 'r-hand': -9, 'l-upper-arm': -12, 'l-forearm': 70, 'l-hand': 9, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.50, angles: { torso: 2, 'r-upper-arm': 12, 'r-forearm': -70, 'r-hand': 8, 'l-upper-arm': -16, 'l-forearm': 78, 'l-hand': -8, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.75, angles: { torso: 3, 'r-upper-arm': 16, 'r-forearm': -78, 'r-hand': -9, 'l-upper-arm': -12, 'l-forearm': 70, 'l-hand': 9, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 1.00, angles: { torso: 3, 'r-upper-arm': 14, 'r-forearm': -74, 'r-hand': 2, 'l-upper-arm': -14, 'l-forearm': 74, 'l-hand': -2, ...seated }, frontViewLayerOverride: frontLayer }
                ]
            },
            {
                key: 'hf-pick-up-drop', name: 'Pick Up / Drop Object', icon: 'fa-hand-holding',
                category: 'Daily Activities', description: 'Front-facing bend, reach, lift, and place-back movement for simple object handling.',
                presetKeys: ['human-front'], duration: 1800, easing: 'easeInOut', repeat: 1,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, 'r-upper-arm': 4, 'r-forearm': -8, 'r-hand': 0, 'l-upper-arm': -4, 'l-forearm': 8, 'l-hand': 0 }, frontViewLayerOverride: frontLayer },
                    { t: 0.18, angles: { torso: 10, 'r-upper-arm': 34, 'r-forearm': -48, 'r-hand': -10, 'l-upper-arm': -18, 'l-forearm': 24, 'l-hand': 4, 'r-upper-leg': 18, 'r-lower-leg': -34, 'l-upper-leg': -18, 'l-lower-leg': 34 }, offsets: { torso: { y: 14 } }, frontViewLayerOverride: frontLayer },
                    { t: 0.38, angles: { torso: 18, 'r-upper-arm': 58, 'r-forearm': -86, 'r-hand': -18, 'l-upper-arm': -26, 'l-forearm': 32, 'l-hand': 6, 'r-upper-leg': 28, 'r-lower-leg': -58, 'l-upper-leg': -28, 'l-lower-leg': 58 }, offsets: { torso: { y: 34 } }, frontViewLayerOverride: frontLayer },
                    { t: 0.58, angles: { torso: 8, 'r-upper-arm': 20, 'r-forearm': -82, 'r-hand': -6, 'l-upper-arm': -10, 'l-forearm': 16, 'l-hand': 2, 'r-upper-leg': 10, 'r-lower-leg': -20, 'l-upper-leg': -10, 'l-lower-leg': 20 }, offsets: { torso: { y: 8 } }, frontViewLayerOverride: frontLayer },
                    { t: 0.78, angles: { torso: 16, 'r-upper-arm': 54, 'r-forearm': -80, 'r-hand': -16, 'l-upper-arm': -22, 'l-forearm': 28, 'l-hand': 5, 'r-upper-leg': 24, 'r-lower-leg': -50, 'l-upper-leg': -24, 'l-lower-leg': 50 }, offsets: { torso: { y: 30 } }, frontViewLayerOverride: frontLayer },
                    { t: 1.00, angles: { torso: 0, 'r-upper-arm': 4, 'r-forearm': -8, 'r-hand': 0, 'l-upper-arm': -4, 'l-forearm': 8, 'l-hand': 0 }, frontViewLayerOverride: frontLayer }
                ]
            },
            {
                key: 'hf-sit-stand-transition', name: 'Sit Down / Stand Up', icon: 'fa-chair',
                category: 'Daily Activities', description: 'Front-facing transition from standing to seated and back to standing.',
                presetKeys: ['human-front'], duration: 2200, easing: 'easeInOut', repeat: 1,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }, frontViewLayerOverride: frontLayer },
                    { t: 0.22, angles: { torso: 8, 'r-upper-arm': 12, 'r-forearm': -18, 'l-upper-arm': -12, 'l-forearm': 18, 'r-upper-leg': 24, 'r-lower-leg': -44, 'l-upper-leg': -24, 'l-lower-leg': 44 }, frontViewLayerOverride: frontLayer },
                    { t: 0.44, angles: { torso: 5, 'r-upper-arm': 10, 'r-forearm': -24, 'l-upper-arm': -10, 'l-forearm': 24, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.62, angles: { torso: 5, 'r-upper-arm': 10, 'r-forearm': -24, 'l-upper-arm': -10, 'l-forearm': 24, ...seated }, frontViewLayerOverride: frontLayer },
                    { t: 0.82, angles: { torso: 8, 'r-upper-arm': 12, 'r-forearm': -18, 'l-upper-arm': -12, 'l-forearm': 18, 'r-upper-leg': 24, 'r-lower-leg': -44, 'l-upper-leg': -24, 'l-lower-leg': 44 }, frontViewLayerOverride: frontLayer },
                    { t: 1.00, angles: { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }, frontViewLayerOverride: frontLayer }
                ]
            },
            move('greet', 'Greet', 'fa-hand-paper', 'Social', 'Friendly greeting wave with a brief arm lift and settling motion.', 1400, Infinity, [
                f(0.00, { torso: 0, 'r-upper-arm': 8, 'r-forearm': -8, 'r-hand': 0, 'l-upper-arm': -4, 'l-forearm': 2, 'l-hand': 0 }),
                f(0.25, { torso: -2, 'r-upper-arm': 96, 'r-forearm': 20, 'r-hand': 12, 'l-upper-arm': -5, 'l-forearm': 2, 'l-hand': 0 }),
                f(0.52, { torso: -1, 'r-upper-arm': 100, 'r-forearm': 26, 'r-hand': -8, 'l-upper-arm': -6, 'l-forearm': 2, 'l-hand': 0 }),
                f(0.78, { torso: -2, 'r-upper-arm': 96, 'r-forearm': 20, 'r-hand': 12, 'l-upper-arm': -5, 'l-forearm': 2, 'l-hand': 0 }),
                f(1.00, { torso: 0, 'r-upper-arm': 8, 'r-forearm': -8, 'r-hand': 0, 'l-upper-arm': -4, 'l-forearm': 2, 'l-hand': 0 })
            ]),
            move('hug', 'Hug', 'fa-heart', 'Social', 'Looped embrace with both arms pulling inward around the body.', 1800, Infinity, [
                f(0.00, { torso: 2, 'r-upper-arm': 24, 'r-forearm': 10, 'l-upper-arm': -24, 'l-forearm': -10 }),
                f(0.30, { torso: 6, 'r-upper-arm': 62, 'r-forearm': 118, 'r-hand': 18, 'l-upper-arm': -62, 'l-forearm': -118, 'l-hand': -18 }),
                f(0.58, { torso: 7, 'r-upper-arm': 66, 'r-forearm': 124, 'r-hand': 18, 'l-upper-arm': -66, 'l-forearm': -124, 'l-hand': -18 }),
                f(0.85, { torso: 3, 'r-upper-arm': 28, 'r-forearm': 16, 'l-upper-arm': -28, 'l-forearm': -16 }),
                f(1.00, { torso: 2, 'r-upper-arm': 24, 'r-forearm': 10, 'l-upper-arm': -24, 'l-forearm': -10 })
            ]),
            move('handshake', 'Handshake', 'fa-handshake', 'Social', 'Front-facing handshake loop with a small courteous body sway.', 1500, Infinity, [
                f(0.00, { torso: 0, 'r-upper-arm': 18, 'r-forearm': -36, 'l-upper-arm': -6, 'l-forearm': 6 }),
                f(0.30, { torso: 2, 'r-upper-arm': 36, 'r-forearm': -22, 'l-upper-arm': -8, 'l-forearm': 8 }),
                f(0.55, { torso: 1, 'r-upper-arm': 32, 'r-forearm': -18, 'l-upper-arm': -8, 'l-forearm': 8 }),
                f(0.80, { torso: 2, 'r-upper-arm': 36, 'r-forearm': -22, 'l-upper-arm': -8, 'l-forearm': 8 }),
                f(1.00, { torso: 0, 'r-upper-arm': 18, 'r-forearm': -36, 'l-upper-arm': -6, 'l-forearm': 6 })
            ]),
            move('write-board', 'Write Board', 'fa-chalkboard-user', 'Work', 'Board-writing loop with one arm reaching up and the other stabilizing.', 1800, Infinity, [
                f(0.00, { torso: 4, 'r-upper-arm': 28, 'r-forearm': -70, 'l-upper-arm': -10, 'l-forearm': 18 }),
                f(0.35, { torso: 4, 'r-upper-arm': 52, 'r-forearm': -96, 'r-hand': -10, 'l-upper-arm': -12, 'l-forearm': 16 }),
                f(0.62, { torso: 5, 'r-upper-arm': 48, 'r-forearm': -88, 'r-hand': 8, 'l-upper-arm': -12, 'l-forearm': 16 }),
                f(0.85, { torso: 4, 'r-upper-arm': 54, 'r-forearm': -94, 'r-hand': -6, 'l-upper-arm': -12, 'l-forearm': 16 }),
                f(1.00, { torso: 4, 'r-upper-arm': 28, 'r-forearm': -70, 'l-upper-arm': -10, 'l-forearm': 18 })
            ]),
            move('carry-file', 'Carry File', 'fa-folder', 'Work', 'Short carry loop with a file or document held close to the body.', 1600, Infinity, [
                f(0.00, { torso: 1, 'r-upper-arm': 30, 'r-forearm': -64, 'r-hand': -6, 'l-upper-arm': -18, 'l-forearm': 20, 'l-hand': 2 }),
                f(0.35, { torso: 2, 'r-upper-arm': 34, 'r-forearm': -72, 'r-hand': -8, 'l-upper-arm': -20, 'l-forearm': 22, 'l-hand': 2 }),
                f(0.65, { torso: 1, 'r-upper-arm': 28, 'r-forearm': -60, 'r-hand': -4, 'l-upper-arm': -16, 'l-forearm': 18, 'l-hand': 2 }),
                f(1.00, { torso: 1, 'r-upper-arm': 30, 'r-forearm': -64, 'r-hand': -6, 'l-upper-arm': -18, 'l-forearm': 20, 'l-hand': 2 })
            ]),
            move('feed-child', 'Feed Child', 'fa-child', 'Care', 'Gentle feeding loop with both hands cupped forward.', 1700, Infinity, [
                f(0.00, { torso: 4, 'r-upper-arm': 26, 'r-forearm': -72, 'r-hand': -10, 'l-upper-arm': -18, 'l-forearm': 70, 'l-hand': 8 }),
                f(0.35, { torso: 5, 'r-upper-arm': 34, 'r-forearm': -84, 'r-hand': -12, 'l-upper-arm': -24, 'l-forearm': 80, 'l-hand': 10 }),
                f(0.65, { torso: 5, 'r-upper-arm': 30, 'r-forearm': -78, 'r-hand': -8, 'l-upper-arm': -22, 'l-forearm': 76, 'l-hand': 8 }),
                f(1.00, { torso: 4, 'r-upper-arm': 26, 'r-forearm': -72, 'r-hand': -10, 'l-upper-arm': -18, 'l-forearm': 70, 'l-hand': 8 })
            ]),
            move('lift-child', 'Lift Child', 'fa-child-reaching', 'Care', 'Lifting loop that raises a child from waist level to chest height.', 1900, Infinity, [
                f(0.00, { torso: 2, 'r-upper-arm': 22, 'r-forearm': -52, 'l-upper-arm': -22, 'l-forearm': 52 }),
                f(0.30, { torso: -2, 'r-upper-arm': 54, 'r-forearm': -92, 'l-upper-arm': -54, 'l-forearm': 92 }),
                f(0.60, { torso: -4, 'r-upper-arm': 66, 'r-forearm': -110, 'l-upper-arm': -66, 'l-forearm': 110 }),
                f(0.85, { torso: -2, 'r-upper-arm': 54, 'r-forearm': -92, 'l-upper-arm': -54, 'l-forearm': 92 }),
                f(1.00, { torso: 2, 'r-upper-arm': 22, 'r-forearm': -52, 'l-upper-arm': -22, 'l-forearm': 52 })
            ]),
            move('assist-elderly', 'Assist Elderly', 'fa-hands-helping', 'Care', 'Supportive assisting motion with a gentle forward lean.', 1800, Infinity, [
                f(0.00, { torso: 4, 'r-upper-arm': 20, 'r-forearm': -44, 'l-upper-arm': -8, 'l-forearm': 8 }),
                f(0.30, { torso: 6, 'r-upper-arm': 26, 'r-forearm': -56, 'l-upper-arm': -12, 'l-forearm': 12 }),
                f(0.62, { torso: 5, 'r-upper-arm': 24, 'r-forearm': -50, 'l-upper-arm': -10, 'l-forearm': 10 }),
                f(1.00, { torso: 4, 'r-upper-arm': 20, 'r-forearm': -44, 'l-upper-arm': -8, 'l-forearm': 8 })
            ]),
            move('check-pulse', 'Check Pulse', 'fa-heart-pulse', 'Care', 'Medical check loop with one hand checking a wrist pulse.', 1400, Infinity, [
                f(0.00, { torso: 4, 'r-upper-arm': 20, 'r-forearm': -72, 'l-upper-arm': -8, 'l-forearm': 10 }),
                f(0.35, { torso: 5, 'r-upper-arm': 24, 'r-forearm': -78, 'l-upper-arm': -10, 'l-forearm': 12 }),
                f(0.68, { torso: 4, 'r-upper-arm': 22, 'r-forearm': -74, 'l-upper-arm': -10, 'l-forearm': 12 }),
                f(1.00, { torso: 4, 'r-upper-arm': 20, 'r-forearm': -72, 'l-upper-arm': -8, 'l-forearm': 10 })
            ]),
            move('sit-to-stand', 'Sit to Stand', 'fa-chair', 'Movement', 'Standing-to-sitting transition loop used for chair motion and resets.', 2200, 1, [
                f(0.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }),
                f(0.22, { torso: 8, 'r-upper-arm': 12, 'r-forearm': -18, 'l-upper-arm': -12, 'l-forearm': 18, 'r-upper-leg': 24, 'r-lower-leg': -44, 'l-upper-leg': -24, 'l-lower-leg': 44 }),
                f(0.44, { torso: 5, 'r-upper-arm': 10, 'r-forearm': -24, 'l-upper-arm': -10, 'l-forearm': 24, ...seated }),
                f(0.62, { torso: 5, 'r-upper-arm': 10, 'r-forearm': -24, 'l-upper-arm': -10, 'l-forearm': 24, ...seated }),
                f(0.82, { torso: 8, 'r-upper-arm': 12, 'r-forearm': -18, 'l-upper-arm': -12, 'l-forearm': 18, 'r-upper-leg': 24, 'r-lower-leg': -44, 'l-upper-leg': -24, 'l-lower-leg': 44 }),
                f(1.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 })
            ]),
            move('kneel-to-stand', 'Kneel to Stand', 'fa-person-praying', 'Movement', 'Transition from standing to kneeling and back up again.', 2200, 1, [
                f(0.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }),
                f(0.25, { torso: 10, 'r-upper-leg': 24, 'r-lower-leg': -30, 'l-upper-leg': -24, 'l-lower-leg': 30, 'r-upper-arm': 10, 'l-upper-arm': -10 }),
                f(0.48, { torso: 4, 'r-upper-leg': 70, 'r-lower-leg': -78, 'l-upper-leg': -12, 'l-lower-leg': 18, 'r-upper-arm': 8, 'l-upper-arm': -8 }),
                f(0.64, { torso: 4, 'r-upper-leg': 70, 'r-lower-leg': -78, 'l-upper-leg': -12, 'l-lower-leg': 18, 'r-upper-arm': 8, 'l-upper-arm': -8 }),
                f(0.82, { torso: 10, 'r-upper-leg': 24, 'r-lower-leg': -30, 'l-upper-leg': -24, 'l-lower-leg': 30, 'r-upper-arm': 10, 'l-upper-arm': -10 }),
                f(1.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 })
            ]),
            move('carry-load-walk', 'Carry Load Walk', 'fa-box', 'Movement', 'Walking loop with a heavy load balanced overhead.', 1800, Infinity, [
                f(0.00, { torso: -2, 'r-upper-arm': 140, 'r-forearm': 70, 'l-upper-arm': -140, 'l-forearm': -70, 'r-upper-leg': 12, 'r-lower-leg': -6, 'l-upper-leg': -8, 'l-lower-leg': 10 }),
                f(0.30, { torso: -3, 'r-upper-arm': 142, 'r-forearm': 68, 'l-upper-arm': -142, 'l-forearm': -68, 'r-upper-leg': 22, 'r-lower-leg': -18, 'l-upper-leg': -2, 'l-lower-leg': 4 }),
                f(0.60, { torso: -3, 'r-upper-arm': 142, 'r-forearm': 68, 'l-upper-arm': -142, 'l-forearm': -68, 'r-upper-leg': -2, 'r-lower-leg': 4, 'l-upper-leg': 22, 'l-lower-leg': -18 }),
                f(0.90, { torso: -3, 'r-upper-arm': 140, 'r-forearm': 70, 'l-upper-arm': -140, 'l-forearm': -70, 'r-upper-leg': 12, 'r-lower-leg': -6, 'l-upper-leg': -8, 'l-lower-leg': 10 }),
                f(1.00, { torso: -2, 'r-upper-arm': 140, 'r-forearm': 70, 'l-upper-arm': -140, 'l-forearm': -70, 'r-upper-leg': 12, 'r-lower-leg': -6, 'l-upper-leg': -8, 'l-lower-leg': 10 })
            ]),
            move('pick-from-shelf', 'Pick From Shelf', 'fa-box-open', 'Object Handling', 'Reach to a shelf, take an item, then bring it down to a carrying position.', 2400, 1, [
                f(0.00, { torso: 0, 'r-upper-arm': 28, 'r-forearm': -10, 'l-upper-arm': -4, 'l-forearm': 2 }),
                f(0.32, { torso: -2, 'r-upper-arm': 100, 'r-forearm': 8, 'r-hand': 4, 'l-upper-arm': -4, 'l-forearm': 2 }),
                f(0.60, { torso: -1, 'r-upper-arm': 118, 'r-forearm': 18, 'r-hand': 8, 'l-upper-arm': -6, 'l-forearm': 2 }),
                f(0.86, { torso: -1, 'r-upper-arm': 106, 'r-forearm': 10, 'r-hand': 4, 'l-upper-arm': -5, 'l-forearm': 2 }),
                f(1.00, { torso: 0, 'r-upper-arm': 28, 'r-forearm': -10, 'l-upper-arm': -4, 'l-forearm': 2 })
            ]),
            move('place-on-table', 'Place on Table', 'fa-table', 'Object Handling', 'Lowering and setting an object down onto a table or surface.', 2400, 1, [
                f(0.00, { torso: 2, 'r-upper-arm': 24, 'r-forearm': -28, 'l-upper-arm': -12, 'l-forearm': 12 }),
                f(0.32, { torso: 4, 'r-upper-arm': 18, 'r-forearm': -54, 'l-upper-arm': -14, 'l-forearm': 14 }),
                f(0.58, { torso: 5, 'r-upper-arm': 14, 'r-forearm': -72, 'l-upper-arm': -14, 'l-forearm': 14 }),
                f(0.84, { torso: 3, 'r-upper-arm': 18, 'r-forearm': -54, 'l-upper-arm': -14, 'l-forearm': 14 }),
                f(1.00, { torso: 2, 'r-upper-arm': 24, 'r-forearm': -28, 'l-upper-arm': -12, 'l-forearm': 12 })
            ]),
            move('push-cart', 'Push Cart', 'fa-cart-shopping', 'Object Handling', 'Forward push loop with both hands driving an unseen cart or trolley.', 1600, Infinity, [
                f(0.00, { torso: 8, 'r-upper-arm': 36, 'r-forearm': -26, 'l-upper-arm': -36, 'l-forearm': 26, 'r-upper-leg': 8, 'l-upper-leg': -8 }),
                f(0.30, { torso: 10, 'r-upper-arm': 48, 'r-forearm': -30, 'l-upper-arm': -48, 'l-forearm': 30, 'r-upper-leg': 16, 'r-lower-leg': -10, 'l-upper-leg': -4 }),
                f(0.62, { torso: 11, 'r-upper-arm': 50, 'r-forearm': -34, 'l-upper-arm': -50, 'l-forearm': 34, 'r-upper-leg': -4, 'l-upper-leg': 14, 'l-lower-leg': -8 }),
                f(0.88, { torso: 9, 'r-upper-arm': 46, 'r-forearm': -28, 'l-upper-arm': -46, 'l-forearm': 28, 'r-upper-leg': 10, 'l-upper-leg': -10 }),
                f(1.00, { torso: 8, 'r-upper-arm': 36, 'r-forearm': -26, 'l-upper-arm': -36, 'l-forearm': 26, 'r-upper-leg': 8, 'l-upper-leg': -8 })
            ]),
            move('pull-suitcase', 'Pull Suitcase', 'fa-suitcase', 'Object Handling', 'Travel loop with one arm pulling a suitcase behind the body.', 1700, Infinity, [
                f(0.00, { torso: -4, 'head': -2, 'r-upper-arm': 16, 'r-forearm': -30, 'l-upper-arm': -4, 'l-forearm': 2, 'r-upper-leg': 6, 'l-upper-leg': -6 }),
                f(0.30, { torso: -6, 'r-upper-arm': 18, 'r-forearm': -36, 'l-upper-arm': -4, 'l-forearm': 2, 'r-upper-leg': 18, 'r-lower-leg': -12, 'l-upper-leg': -2 }),
                f(0.62, { torso: -5, 'r-upper-arm': 14, 'r-forearm': -28, 'l-upper-arm': -4, 'l-forearm': 2, 'r-upper-leg': -2, 'l-upper-leg': 18, 'l-lower-leg': -12 }),
                f(0.88, { torso: -6, 'r-upper-arm': 18, 'r-forearm': -36, 'l-upper-arm': -4, 'l-forearm': 2, 'r-upper-leg': 18, 'r-lower-leg': -12, 'l-upper-leg': -2 }),
                f(1.00, { torso: -4, 'r-upper-arm': 16, 'r-forearm': -30, 'l-upper-arm': -4, 'l-forearm': 2, 'r-upper-leg': 6, 'l-upper-leg': -6 })
            ]),
            move('sweep', 'Sweep', 'fa-broom', 'Domestic', 'Repeating sweeping loop with a gentle torso lean and a low stroke path.', 1800, Infinity, [
                f(0.00, { torso: 3, 'head': -5, 'r-upper-arm': 44, 'r-forearm': -18, 'r-hand': -6, 'l-upper-arm': -34, 'l-forearm': 14, 'l-hand': 4, 'r-upper-leg': 3, 'l-upper-leg': -3 }),
                f(0.30, { torso: 5, 'r-upper-arm': 54, 'r-forearm': -24, 'r-hand': -8, 'l-upper-arm': -40, 'l-forearm': 18, 'l-hand': 6 }),
                f(0.60, { torso: 4, 'r-upper-arm': 40, 'r-forearm': -14, 'r-hand': -4, 'l-upper-arm': -30, 'l-forearm': 10, 'l-hand': 2 }),
                f(0.88, { torso: 5, 'r-upper-arm': 54, 'r-forearm': -24, 'r-hand': -8, 'l-upper-arm': -40, 'l-forearm': 18, 'l-hand': 6 }),
                f(1.00, { torso: 3, 'head': -5, 'r-upper-arm': 44, 'r-forearm': -18, 'r-hand': -6, 'l-upper-arm': -34, 'l-forearm': 14, 'l-hand': 4 })
            ]),
            move('mop', 'Mop', 'fa-hand-sparkles', 'Domestic', 'Low two-handed mop loop with both hands on the handle.', 1800, Infinity, [
                f(0.00, { torso: 20, 'head': -10, 'r-upper-arm': 50, 'r-forearm': -20, 'r-hand': -4, 'l-upper-arm': -48, 'l-forearm': 18, 'l-hand': 4 }),
                f(0.32, { torso: 22, 'r-upper-arm': 56, 'r-forearm': -24, 'r-hand': -6, 'l-upper-arm': -54, 'l-forearm': 22, 'l-hand': 6 }),
                f(0.64, { torso: 21, 'r-upper-arm': 46, 'r-forearm': -16, 'r-hand': -2, 'l-upper-arm': -44, 'l-forearm': 14, 'l-hand': 2 }),
                f(0.90, { torso: 22, 'r-upper-arm': 56, 'r-forearm': -24, 'r-hand': -6, 'l-upper-arm': -54, 'l-forearm': 22, 'l-hand': 6 }),
                f(1.00, { torso: 20, 'head': -10, 'r-upper-arm': 50, 'r-forearm': -20, 'r-hand': -4, 'l-upper-arm': -48, 'l-forearm': 18, 'l-hand': 4 })
            ]),
            move('cook-stir-pot', 'Cook / Stir Pot', 'fa-utensils', 'Domestic', 'Kitchen stirring loop with one hand active and the other steadying the pot.', 1600, Infinity, [
                f(0.00, { torso: 4, 'head': -4, 'r-upper-arm': 18, 'r-forearm': -84, 'l-upper-arm': -14, 'l-forearm': 14 }),
                f(0.32, { torso: 5, 'r-upper-arm': 22, 'r-forearm': -96, 'r-hand': -8, 'l-upper-arm': -16, 'l-forearm': 18 }),
                f(0.60, { torso: 6, 'r-upper-arm': 24, 'r-forearm': -88, 'r-hand': -2, 'l-upper-arm': -18, 'l-forearm': 16 }),
                f(0.88, { torso: 5, 'r-upper-arm': 22, 'r-forearm': -96, 'r-hand': -8, 'l-upper-arm': -16, 'l-forearm': 18 }),
                f(1.00, { torso: 4, 'head': -4, 'r-upper-arm': 18, 'r-forearm': -84, 'l-upper-arm': -14, 'l-forearm': 14 })
            ]),
            move('wash-hands', 'Wash Hands', 'fa-hands-bubbles', 'Domestic', 'Hand-rubbing loop for washing or scrubbing hands.', 1300, Infinity, [
                f(0.00, { torso: 4, 'head': -2, 'r-upper-arm': 34, 'r-forearm': -88, 'l-upper-arm': -34, 'l-forearm': 88 }),
                f(0.34, { torso: 5, 'r-upper-arm': 40, 'r-forearm': -96, 'l-upper-arm': -40, 'l-forearm': 96 }),
                f(0.66, { torso: 4, 'r-upper-arm': 36, 'r-forearm': -90, 'l-upper-arm': -36, 'l-forearm': 90 }),
                f(1.00, { torso: 4, 'head': -2, 'r-upper-arm': 34, 'r-forearm': -88, 'l-upper-arm': -34, 'l-forearm': 88 })
            ]),
            move('fold-clothes', 'Fold Clothes', 'fa-shirt', 'Domestic', 'Folding loop with both hands working across a garment or cloth.', 1500, Infinity, [
                f(0.00, { torso: 6, 'head': -6, 'r-upper-arm': 30, 'r-forearm': -72, 'l-upper-arm': -30, 'l-forearm': 72 }),
                f(0.30, { torso: 7, 'r-upper-arm': 36, 'r-forearm': -84, 'l-upper-arm': -34, 'l-forearm': 88 }),
                f(0.60, { torso: 6, 'r-upper-arm': 28, 'r-forearm': -76, 'l-upper-arm': -28, 'l-forearm': 78 }),
                f(0.88, { torso: 7, 'r-upper-arm': 36, 'r-forearm': -84, 'l-upper-arm': -34, 'l-forearm': 88 }),
                f(1.00, { torso: 6, 'head': -6, 'r-upper-arm': 30, 'r-forearm': -72, 'l-upper-arm': -30, 'l-forearm': 72 })
            ]),
            move('panic', 'Panic', 'fa-triangle-exclamation', 'Emotion', 'Shocked panic loop with arms up and a slight body recoil.', 1100, Infinity, [
                f(0.00, { torso: -4, 'head': -10, 'r-upper-arm': 120, 'r-forearm': -8, 'l-upper-arm': -120, 'l-forearm': 8 }),
                f(0.28, { torso: -8, 'head': -16, 'r-upper-arm': 144, 'r-forearm': -12, 'l-upper-arm': -144, 'l-forearm': 12 }),
                f(0.56, { torso: -6, 'head': -14, 'r-upper-arm': 138, 'r-forearm': -10, 'l-upper-arm': -138, 'l-forearm': 10 }),
                f(0.84, { torso: -8, 'head': -16, 'r-upper-arm': 144, 'r-forearm': -12, 'l-upper-arm': -144, 'l-forearm': 12 }),
                f(1.00, { torso: -4, 'head': -10, 'r-upper-arm': 120, 'r-forearm': -8, 'l-upper-arm': -120, 'l-forearm': 8 })
            ]),
            move('laugh', 'Laugh', 'fa-face-laugh', 'Emotion', 'Small laughing bounce with the shoulders lifting rhythmically.', 1200, Infinity, [
                f(0.00, { torso: -2, 'head': -6, 'r-upper-arm': 18, 'r-forearm': -40, 'l-upper-arm': -18, 'l-forearm': 40 }),
                f(0.30, { torso: -5, 'head': -12, 'r-upper-arm': 26, 'r-forearm': -54, 'l-upper-arm': -26, 'l-forearm': 54 }),
                f(0.60, { torso: -4, 'head': -10, 'r-upper-arm': 22, 'r-forearm': -48, 'l-upper-arm': -22, 'l-forearm': 48 }),
                f(0.90, { torso: -5, 'head': -12, 'r-upper-arm': 26, 'r-forearm': -54, 'l-upper-arm': -26, 'l-forearm': 54 }),
                f(1.00, { torso: -2, 'head': -6, 'r-upper-arm': 18, 'r-forearm': -40, 'l-upper-arm': -18, 'l-forearm': 40 })
            ]),
            move('cry', 'Cry', 'fa-face-sad-tear', 'Emotion', 'Downcast crying loop with head lowered and shoulders softened.', 1400, Infinity, [
                f(0.00, { torso: 8, 'head': 18, 'r-upper-arm': 16, 'r-forearm': -88, 'l-upper-arm': -16, 'l-forearm': 88 }),
                f(0.32, { torso: 12, 'head': 26, 'r-upper-arm': 22, 'r-forearm': -100, 'l-upper-arm': -22, 'l-forearm': 100 }),
                f(0.64, { torso: 10, 'head': 22, 'r-upper-arm': 18, 'r-forearm': -94, 'l-upper-arm': -18, 'l-forearm': 94 }),
                f(1.00, { torso: 8, 'head': 18, 'r-upper-arm': 16, 'r-forearm': -88, 'l-upper-arm': -16, 'l-forearm': 88 })
            ]),
            move('tired-slump', 'Tired Slump', 'fa-bed', 'Resting', 'Heavy slumped loop with slow fatigue motion through the torso and head.', 1800, Infinity, [
                f(0.00, { torso: 10, 'head': 14, 'r-upper-arm': 12, 'r-forearm': 18, 'l-upper-arm': -12, 'l-forearm': -18 }),
                f(0.35, { torso: 16, 'head': 22, 'r-upper-arm': 18, 'r-forearm': 24, 'l-upper-arm': -18, 'l-forearm': -24 }),
                f(0.65, { torso: 15, 'head': 20, 'r-upper-arm': 16, 'r-forearm': 22, 'l-upper-arm': -16, 'l-forearm': -22 }),
                f(1.00, { torso: 10, 'head': 14, 'r-upper-arm': 12, 'r-forearm': 18, 'l-upper-arm': -12, 'l-forearm': -18 })
            ]),
            move('angry-stomp', 'Angry Stomp', 'fa-face-angry', 'Emotion', 'Short angry stomp loop with a tight upper body and a forceful leg drive.', 1200, Infinity, [
                f(0.00, { torso: 4, 'head': 4, 'r-upper-arm': 14, 'r-forearm': -12, 'l-upper-arm': -14, 'l-forearm': 12, 'r-upper-leg': 10, 'r-lower-leg': -10, 'l-upper-leg': -4, 'l-lower-leg': 6 }),
                f(0.30, { torso: 8, 'head': 6, 'r-upper-arm': 20, 'r-forearm': -18, 'l-upper-arm': -20, 'l-forearm': 18, 'r-upper-leg': 22, 'r-lower-leg': -34, 'l-upper-leg': -10, 'l-lower-leg': 8 }),
                f(0.60, { torso: 6, 'head': 6, 'r-upper-arm': 18, 'r-forearm': -16, 'l-upper-arm': -18, 'l-forearm': 16, 'r-upper-leg': 6, 'r-lower-leg': 4, 'l-upper-leg': -4, 'l-lower-leg': 6 }),
                f(0.90, { torso: 8, 'head': 6, 'r-upper-arm': 20, 'r-forearm': -18, 'l-upper-arm': -20, 'l-forearm': 18, 'r-upper-leg': 22, 'r-lower-leg': -34, 'l-upper-leg': -10, 'l-lower-leg': 8 }),
                f(1.00, { torso: 4, 'head': 4, 'r-upper-arm': 14, 'r-forearm': -12, 'l-upper-arm': -14, 'l-forearm': 12, 'r-upper-leg': 10, 'r-lower-leg': -10, 'l-upper-leg': -4, 'l-lower-leg': 6 })
            ]),
            move('climb-stairs', 'Climb Stairs', 'fa-stairs', 'Movement', 'Step-up loop for stair climbing or elevated walking.', 1400, Infinity, [
                f(0.00, { torso: 6, 'head': -2, 'r-upper-arm': 10, 'r-forearm': -6, 'l-upper-arm': -14, 'l-forearm': 8, 'r-upper-leg': 26, 'r-lower-leg': -34, 'l-upper-leg': -4, 'l-lower-leg': 8 }),
                f(0.30, { torso: 8, 'head': -4, 'r-upper-arm': 16, 'r-forearm': -12, 'l-upper-arm': -20, 'l-forearm': 12, 'r-upper-leg': 34, 'r-lower-leg': -48, 'l-upper-leg': -8, 'l-lower-leg': 12 }),
                f(0.60, { torso: 8, 'head': -4, 'r-upper-arm': 14, 'r-forearm': -10, 'l-upper-arm': -18, 'l-forearm': 10, 'r-upper-leg': -4, 'r-lower-leg': 8, 'l-upper-leg': 28, 'l-lower-leg': -36 }),
                f(0.90, { torso: 8, 'head': -4, 'r-upper-arm': 16, 'r-forearm': -12, 'l-upper-arm': -20, 'l-forearm': 12, 'r-upper-leg': 34, 'r-lower-leg': -48, 'l-upper-leg': -8, 'l-lower-leg': 12 }),
                f(1.00, { torso: 6, 'head': -2, 'r-upper-arm': 10, 'r-forearm': -6, 'l-upper-arm': -14, 'l-forearm': 8, 'r-upper-leg': 26, 'r-lower-leg': -34, 'l-upper-leg': -4, 'l-lower-leg': 8 })
            ]),
            move('limp', 'Limp', 'fa-person-walking', 'Movement', 'Asymmetrical walk loop with one leg carrying less weight than the other.', 1600, Infinity, [
                f(0.00, { torso: 4, 'head': 0, 'r-upper-arm': 16, 'r-forearm': -10, 'l-upper-arm': -8, 'l-forearm': 6, 'r-upper-leg': 18, 'r-lower-leg': -12, 'l-upper-leg': -2, 'l-lower-leg': 4 }),
                f(0.30, { torso: 6, 'head': 0, 'r-upper-arm': 22, 'r-forearm': -14, 'l-upper-arm': -10, 'l-forearm': 8, 'r-upper-leg': 22, 'r-lower-leg': -16, 'l-upper-leg': -6, 'l-lower-leg': 8 }),
                f(0.60, { torso: 5, 'head': 0, 'r-upper-arm': 18, 'r-forearm': -12, 'l-upper-arm': -8, 'l-forearm': 6, 'r-upper-leg': -2, 'r-lower-leg': 4, 'l-upper-leg': 20, 'l-lower-leg': -14 }),
                f(0.90, { torso: 6, 'head': 0, 'r-upper-arm': 22, 'r-forearm': -14, 'l-upper-arm': -10, 'l-forearm': 8, 'r-upper-leg': 22, 'r-lower-leg': -16, 'l-upper-leg': -6, 'l-lower-leg': 8 }),
                f(1.00, { torso: 4, 'head': 0, 'r-upper-arm': 16, 'r-forearm': -10, 'l-upper-arm': -8, 'l-forearm': 6, 'r-upper-leg': 18, 'r-lower-leg': -12, 'l-upper-leg': -2, 'l-lower-leg': 4 })
            ])
        ];
    }

    // ═══ HUMAN FRONT ═══

    static hfWave() {
        return {
            key: 'hf-wave', name: 'Wave', icon: 'fa-hand-peace',
            category: 'Gestures', description: 'Wave right hand',
            presetKeys: ['human-front'],
            duration: 1800, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.14, angles: { 'r-upper-arm': 94, 'r-forearm': 26, 'r-hand': 8 }, contacts: { 'r-hand': { tag: 'r-ear', offsetX: -18, offsetY: 10, iterations: 9 } } },
                { t: 0.30, angles: { 'r-upper-arm': 100, 'r-forearm': 32, 'r-hand': 18 }, contacts: { 'r-hand': { tag: 'r-ear', offsetX: -18, offsetY: 10, iterations: 10 } } },
                { t: 0.50, angles: { 'r-upper-arm': 100, 'r-forearm': 32, 'r-hand': -16 }, contacts: { 'r-hand': { tag: 'r-ear', offsetX: -18, offsetY: 10, iterations: 10 } } },
                { t: 0.70, angles: { 'r-upper-arm': 100, 'r-forearm': 32, 'r-hand': 18 }, contacts: { 'r-hand': { tag: 'r-ear', offsetX: -18, offsetY: 10, iterations: 10 } } },
                { t: 0.88, angles: { 'r-upper-arm': 94, 'r-forearm': 26, 'r-hand': 8 }, contacts: { 'r-hand': { tag: 'r-ear', offsetX: -18, offsetY: 10, iterations: 9 } } },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfClap() {
        const ready = {
            'l-upper-arm': -44, 'l-forearm': 104, 'l-hand': 10,
            'r-upper-arm': 44, 'r-forearm': -104, 'r-hand': -10
        };
        const clap = {
            'l-upper-arm': -24, 'l-forearm': 138, 'l-hand': 18,
            'r-upper-arm': 24, 'r-forearm': -138, 'r-hand': -18
        };
        return {
            key: 'hf-clap', name: 'Clap', icon: 'fa-hands',
            category: 'Gestures', description: 'Hands clap at center',
            presetKeys: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, angles: ready },
                { t: 0.40, angles: clap, contacts: {
                    'r-hand': { tag: 'sternum', offsetX: -8, offsetY: 14, iterations: 8 },
                    'l-hand': { tag: 'sternum', offsetX: 8, offsetY: 14, iterations: 8 }
                } },
                { t: 0.55, angles: clap, contacts: {
                    'r-hand': { tag: 'sternum', offsetX: -8, offsetY: 14, iterations: 8 },
                    'l-hand': { tag: 'sternum', offsetX: 8, offsetY: 14, iterations: 8 }
                } },
                { t: 1.00, angles: ready }
            ]
        };
    }

    static hfTalkingGesture() {
        const rightLead = {
            'r-upper-arm': 30, 'r-forearm': 40, 'r-hand': -6,
            'l-upper-arm': -18, 'l-forearm': -24, 'l-hand': 4,
            head: 3
        };
        const leftLead = {
            'r-upper-arm': 18, 'r-forearm': 24, 'r-hand': 4,
            'l-upper-arm': -30, 'l-forearm': -40, 'l-hand': 6,
            head: -2
        };
        const softBeat = {
            'r-upper-arm': 22, 'r-forearm': 30, 'r-hand': -2,
            'l-upper-arm': -22, 'l-forearm': -30, 'l-hand': 2,
            head: 1
        };
        const frontSpeechLayer = ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'];

        return {
            key: 'hf-talking-gesture',
            name: 'Talking Gesture',
            icon: 'fa-comment-dots',
            category: 'Gestures',
            description: 'Front-facing conversational hand gestures with subtle head motion, then a clean return to idle.',
            presetKeys: ['human-front'],
            duration: 6600,
            easing: 'easeInOut',
            repeat: 1,
            keyframes: [
                { t: 0.00, angles: {}, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.07, angles: rightLead, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.15, angles: softBeat, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.23, angles: leftLead, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.31, angles: softBeat, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.39, angles: rightLead, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.48, angles: { ...leftLead, head: -1 }, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.57, angles: { ...rightLead, head: 2 }, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.66, angles: softBeat, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.75, angles: leftLead, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.84, angles: { ...rightLead, head: 1 }, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.91, angles: softBeat, frontViewLayerOverride: frontSpeechLayer },
                { t: 0.98, angles: {}, frontViewLayerOverride: frontSpeechLayer },
                { t: 1.00, angles: {}, frontViewLayerOverride: frontSpeechLayer }
            ]
        };
    }

    static hfWalk() {
        const a = {
            'r-upper-arm': 15, 'r-forearm': 30,
            'l-upper-arm': -45, 'l-forearm': -10,
            'r-upper-leg': 10, 'r-lower-leg': 25, 'r-foot': 15,
            'l-upper-leg': -5, 'l-lower-leg': 0, 'l-foot': 0
        };
        const b = {
            'r-upper-arm': 45, 'r-forearm': 10,
            'l-upper-arm': -15, 'l-forearm': -30,
            'r-upper-leg': 5, 'r-lower-leg': 0, 'r-foot': 0,
            'l-upper-leg': -10, 'l-lower-leg': -25, 'l-foot': -15
        };
        return {
            key: 'hf-walk', name: 'Walk / March', icon: 'fa-walking',
            category: 'Locomotion', description: 'Front-view marching walk with opposing arm and leg swing',
            presetKeys: ['human-front'],
            duration: 2000, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, angles: a },
                { t: 0.25, angles: {} },
                { t: 0.50, angles: b },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: a }
            ]
        };
    }

    static hfFrontWalkCycle() {
        const contactL = {
            'torso': 3, 'head': -3,
            'l-upper-arm': -10, 'r-upper-arm': 10,
            'l-upper-leg': -8, 'l-lower-leg': 0, 'l-foot': 6,
            'r-upper-leg': 10, 'r-lower-leg': -22, 'r-foot': -8
        };
        const passing = {
            'l-upper-arm': -5, 'r-upper-arm': 5,
            'l-upper-leg': -2, 'l-lower-leg': -6, 'l-foot': 0,
            'r-upper-leg': 2, 'r-lower-leg': -18, 'r-foot': -6
        };
        const contactR = {
            'torso': -3, 'head': 3,
            'l-upper-arm': -10, 'r-upper-arm': 10,
            'l-upper-leg': -10, 'l-lower-leg': 22, 'l-foot': 8,
            'r-upper-leg': 8, 'r-lower-leg': 0, 'r-foot': -6
        };
        return {
            key: 'hf-front-walk-cycle', name: 'Front Walk Cycle', icon: 'fa-person-walking',
            category: 'Locomotion', description: 'Front-perspective walk using alternating contact and passing beats with a light bounce.',
            presetKeys: ['human-front'],
            duration: 1600, easing: 'linear', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: contactL, offsets: { 'torso': { y: -4 } } },
                { t: 0.25, angles: passing, offsets: { 'torso': { y: -10 } } },
                { t: 0.50, angles: contactR, offsets: { 'torso': { y: -4 } } },
                { t: 0.75, angles: passing, offsets: { 'torso': { y: -10 } } },
                { t: 1.00, angles: contactL, offsets: { 'torso': { y: -4 } } }
            ]
        };
    }

    // ─── Tilt-driven front-facing locomotion & gestures ───
    // These movements use Tilt X / Tilt Y to simulate forward/backward depth on a
    // flat 2D rig instead of swinging limbs sideways via Z-rotation. A small Z
    // rotation is layered on top so the result still reads as natural weight-shift.

    static hfWalkCycleTilt() {
        // Right leg forward = +tX on r-leg, -tX on l-leg; arms swing opposite.
        // Torso uses tY for vertical bounce (down on contact, up on passing).
        const contactR = {
            angles: { 'torso': 2, 'head': -2, 'l-upper-arm': 3, 'r-upper-arm': -3 },
            tilts: {
                'r-upper-leg': { x: 28 }, 'r-lower-leg': { x: 18 }, 'r-foot': { x: 10 },
                'l-upper-leg': { x: -22 }, 'l-lower-leg': { x: -10 }, 'l-foot': { x: -6 },
                'l-upper-arm': { x: 26 }, 'l-forearm': { x: 14 },
                'r-upper-arm': { x: -22 }, 'r-forearm': { x: -10 },
                'torso': { y: 4 }
            }
        };
        const passing = {
            angles: { 'torso': 0, 'head': 0 },
            tilts: {
                'r-upper-leg': { x: 4 }, 'r-lower-leg': { x: 0 }, 'r-foot': { x: 0 },
                'l-upper-leg': { x: -4 }, 'l-lower-leg': { x: 0 }, 'l-foot': { x: 0 },
                'l-upper-arm': { x: 6 }, 'l-forearm': { x: 0 },
                'r-upper-arm': { x: -6 }, 'r-forearm': { x: 0 },
                'torso': { y: -2 }
            }
        };
        const contactL = {
            angles: { 'torso': -2, 'head': 2, 'l-upper-arm': -3, 'r-upper-arm': 3 },
            tilts: {
                'l-upper-leg': { x: 28 }, 'l-lower-leg': { x: 18 }, 'l-foot': { x: 10 },
                'r-upper-leg': { x: -22 }, 'r-lower-leg': { x: -10 }, 'r-foot': { x: -6 },
                'r-upper-arm': { x: 26 }, 'r-forearm': { x: 14 },
                'l-upper-arm': { x: -22 }, 'l-forearm': { x: -10 },
                'torso': { y: 4 }
            }
        };
        return {
            key: 'hf-walk-cycle-tilt', name: 'Walk Cycle (Tilt)', icon: 'fa-person-walking',
            category: 'Locomotion',
            description: 'Front-facing walk that pushes legs and arms toward/away from the camera using Tilt X, with subtle Z rotation for hip drop and torso bounce on Tilt Y.',
            presetKeys: ['human-front'],
            duration: 1600, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: contactR.angles, tilts: contactR.tilts, offsets: { 'torso': { y: -2 } } },
                { t: 0.25, angles: passing.angles, tilts: passing.tilts, offsets: { 'torso': { y: -8 } } },
                { t: 0.50, angles: contactL.angles, tilts: contactL.tilts, offsets: { 'torso': { y: -2 } } },
                { t: 0.75, angles: passing.angles, tilts: passing.tilts, offsets: { 'torso': { y: -8 } } },
                { t: 1.00, angles: contactR.angles, tilts: contactR.tilts, offsets: { 'torso': { y: -2 } } }
            ]
        };
    }


  static hfRunCycleTilt() {
        const contactR = {
            angles: { 
                'torso': 2, 'head': -2, 
                // Left arm pumps FORWARD (swings inward slightly but stays flared left)
                'l-upper-arm': -20,
                // Right arm pumps BACKWARD (flares outward right)
                'r-upper-arm': 45,
                // Elbow flexion inward stays consistent
                'l-forearm': 55, 'r-forearm': -55
            },
            tilts: {
                // Leg reaching forward (extended) - slight bend remains to catch weight
                'r-upper-leg': { x: 35 }, 'r-lower-leg': { x: 35 }, 'r-foot': { x: 20 },
                // Leg pushing off far back - hip way back, knee retains flex
                'l-upper-leg': { x: -70 }, 'l-lower-leg': { x: 45 }, 'l-foot': { x: -20 },
                // Left arm pumps FORWARD
                'l-upper-arm': { x: 40 }, 'l-forearm': { x: 40 }, 
                // Right arm pumps BACKWARD
                'r-upper-arm': { x: -40 }, 'r-forearm': { x: -40 }, 
                'torso': { y: 6 }
            }
        };
        const passingL = {
            angles: { 
                'torso': 0, 'head': 0, 
                // Arms pass each other at a neutral outward flare
                'l-upper-arm': -32, 'r-upper-arm': 32, 
                // Elbows transition
                'l-forearm': 50, 'r-forearm': -50 
            },
            tilts: {
                // Right leg is planted, bearing weight mid-stride
                'r-upper-leg': { x: -12 }, 'r-lower-leg': { x: 18 }, 'r-foot': { x: -5 },
                // Left leg is swinging forward, lifting with knee extremely flexed
                'l-upper-leg': { x: 60 }, 'l-lower-leg': { x: 90 }, 'l-foot': { x: 0 },
                // Arms crossing the center
                'l-upper-arm': { x: 0 }, 'l-forearm': { x: 0 },
                'r-upper-arm': { x: 0 }, 'r-forearm': { x: 0 },
                'torso': { y: -4 }
            }
        };
        const contactL = {
            angles: { 
                'torso': -2, 'head': 2, 
                // Left arm pumps BACKWARD (flares outward left)
                'l-upper-arm': -45, 
                // Right arm pumps FORWARD (swings inward slightly but stays flared right)
                'r-upper-arm': 20, 
                // Elbow flexion inward stays consistent
                'l-forearm': 55, 'r-forearm': -55   
            },
            tilts: {
                // Leg reaching forward (extended)
                'l-upper-leg': { x: 35 }, 'l-lower-leg': { x: 35 }, 'l-foot': { x: 20 },
                // Leg pushing off far back
                'r-upper-leg': { x: -70 }, 'r-lower-leg': { x: 45 }, 'r-foot': { x: -20 },
                // Right arm pumps FORWARD
                'r-upper-arm': { x: 40 }, 'r-forearm': { x: 40 }, 
                // Left arm pumps BACKWARD
                'l-upper-arm': { x: -40 }, 'l-forearm': { x: -40 }, 
                'torso': { y: 6 }
            }
        };
        const passingR = {
            angles: { 
                'torso': 0, 'head': 0, 
                'l-upper-arm': -32, 'r-upper-arm': 32, 
                'l-forearm': 50, 'r-forearm': -50 
            },
            tilts: {
                // Left leg is planted, bearing weight mid-stride
                'l-upper-leg': { x: -12 }, 'l-lower-leg': { x: 18 }, 'l-foot': { x: -5 },
                // Right leg is swinging forward, lifting with knee extremely flexed
                'r-upper-leg': { x: 60 }, 'r-lower-leg': { x: 90 }, 'r-foot': { x: 0 },
                'l-upper-arm': { x: 0 }, 'l-forearm': { x: 0 },
                'r-upper-arm': { x: 0 }, 'r-forearm': { x: 0 },
                'torso': { y: -4 }
            }
        };
        return {
            key: 'hf-run-cycle-tilt', name: 'Run Cycle (Tilt)', icon: 'fa-person-running',
            category: 'Locomotion',
            description: 'Front-facing run. Shoulders stay properly flared outward, elbows flex across the torso, and arms alternate using Tilt X.',
            presetKeys: ['human-front'],
            duration: 900, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: contactR.angles, tilts: contactR.tilts, offsets: { 'torso': { y: 0 } } },
                { t: 0.25, angles: passingL.angles, tilts: passingL.tilts, offsets: { 'torso': { y: -12 } } },
                { t: 0.50, angles: contactL.angles, tilts: contactL.tilts, offsets: { 'torso': { y: 0 } } },
                { t: 0.75, angles: passingR.angles, tilts: passingR.tilts, offsets: { 'torso': { y: -12 } } },
                { t: 1.00, angles: contactR.angles, tilts: contactR.tilts, offsets: { 'torso': { y: 0 } } }
            ]
        };
    }









    static hfFrontJabTilt() {
        // Straight jab toward the camera. Wind: arm cocks back with elbow tucked
        // (Z bend) and slight away-tilt. Strike: arm extends nearly straight (Z
        // forearm un-bends to ~0) AND maxes Tilt X so the arm visibly foreshortens
        // toward the camera. Other arm stays in a guard.
        const wind = {
            angles: {
                'r-upper-arm': 30, 'r-forearm': -110, 'r-hand': -10,
                'l-upper-arm': -20, 'l-forearm': 80,
                'torso': -3
            },
            tilts: {
                'r-upper-arm': { x: -10 }, 'r-forearm': { x: -8 },
                'torso': { y: -3 }
            }
        };
        const strike = {
            angles: {
                'r-upper-arm': 8, 'r-forearm': -6, 'r-hand': 0,
                'l-upper-arm': -22, 'l-forearm': 78,
                'torso': 2
            },
            tilts: {
                'r-upper-arm': { x: 38 }, 'r-forearm': { x: 32 }, 'r-hand': { x: 18 },
                'l-upper-arm': { x: -8 }, 'l-forearm': { x: -4 },
                'torso': { y: 4 }
            }
        };
        return {
            key: 'hf-front-jab-tilt', name: 'Front Jab (Tilt)', icon: 'fa-fist-raised',
            category: 'Full Body',
            description: 'Straight jab fired at the camera by maxing Tilt X on the upper/lower arm; Z-rotation stays minimal so the arm reads as foreshortened, not as a sideways swing.',
            presetKeys: ['human-front'],
            duration: 900, easing: 'easeOut', repeat: 2,
            keyframes: [
                { t: 0.00, angles: {}, tilts: {} },
                { t: 0.20, angles: wind.angles, tilts: wind.tilts },
                { t: 0.45, angles: strike.angles, tilts: strike.tilts },
                { t: 0.65, angles: strike.angles, tilts: strike.tilts },
                { t: 1.00, angles: {}, tilts: {} }
            ]
        };
    }

    static hfFrontKickTilt() {
        // Front kick at the viewer. Wind: knee tucks up (Z bend at knee, slight hip
        // raise). Kick: hip lifts the leg up + knee straightens (Z) AND Tilt X
        // foreshortens the leg toward the camera so it reads as a kick at the
        // viewer rather than a high sideways step.
        const wind = {
            angles: {
                'r-upper-leg': 35, 'r-lower-leg': -85, 'r-foot': 10,
                'l-upper-leg': 4,
                'l-upper-arm': -10, 'r-upper-arm': 10,
                'torso': -3, 'head': 4
            },
            tilts: {
                'r-upper-leg': { x: 12 }, 'r-lower-leg': { x: 8 },
                'torso': { y: 4 }
            }
        };
        const kick = {
            angles: {
                'r-upper-leg': 60, 'r-lower-leg': -10, 'r-foot': 18,
                'l-upper-leg': 6,
                'l-upper-arm': -18, 'r-upper-arm': 18,
                'torso': 3, 'head': -2
            },
            tilts: {
                'r-upper-leg': { x: 42 }, 'r-lower-leg': { x: 36 }, 'r-foot': { x: 22 },
                'l-upper-arm': { x: 8 }, 'r-upper-arm': { x: -8 },
                'torso': { y: 2 }
            }
        };
        return {
            key: 'hf-front-kick-tilt', name: 'Front Kick (Tilt)', icon: 'fa-shoe-prints',
            category: 'Full Body',
            description: 'Front kick driven almost entirely by Tilt X on the hip and knee so the leg foreshortens toward the camera instead of high-stepping sideways.',
            presetKeys: ['human-front'],
            duration: 1100, easing: 'easeOut', repeat: 2,
            keyframes: [
                { t: 0.00, angles: {}, tilts: {} },
                { t: 0.22, angles: wind.angles, tilts: wind.tilts, offsets: { 'torso': { y: 6 } } },
                { t: 0.50, angles: kick.angles, tilts: kick.tilts, offsets: { 'torso': { y: -4 } } },
                { t: 0.70, angles: kick.angles, tilts: kick.tilts, offsets: { 'torso': { y: -4 } } },
                { t: 1.00, angles: {}, tilts: {} }
            ]
        };
    }

    static hfTurnRight() {
        // Body turns to the character's right (stage left).
        // All parts tilt with positive tiltY simultaneously to simulate a 3/4 rotation.
        // The character's right arm (default top layer) stays prominent.
        const peakAngles = {
            'r-upper-arm': 12,  // right arm swings slightly forward
            'l-upper-arm': -8   // left arm recedes slightly
        };
        const peakTilts = {
            'torso':       { y: 36 },
            'head':        { y: 40 },
            'r-upper-arm': { y: 34 },
            'l-upper-arm': { y: 38 },
            'r-upper-leg': { y: 22 },
            'l-upper-leg': { y: 22 }
        };
        // Default front layer order already has right-arm on top — no override needed for peak.
        return {
            key: 'hf-turn-right', name: 'Turn Right', icon: 'fa-rotate-right',
            category: 'Gestures',
            description: 'Character turns body to their right (3/4 view), holds briefly, then returns to face front.',
            presetKeys: ['human-front'],
            duration: 2400, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {},           tilts: {} },
                { t: 0.30, angles: peakAngles,   tilts: peakTilts },
                { t: 0.64, angles: peakAngles,   tilts: peakTilts },
                { t: 1.00, angles: {},           tilts: {} }
            ]
        };
    }

    static hfTurnLeft() {
        // Body turns to the character's left (stage right).
        // All parts tilt with negative tiltY. Left arm is layered on top at peak.
        const peakAngles = {
            'l-upper-arm': -12,  // left arm swings slightly forward
            'r-upper-arm': 8     // right arm recedes slightly
        };
        const peakTilts = {
            'torso':       { y: -36 },
            'head':        { y: -40 },
            'l-upper-arm': { y: -34 },
            'r-upper-arm': { y: -38 },
            'l-upper-leg': { y: -22 },
            'r-upper-leg': { y: -22 }
        };
        const leftArmFront = ['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm'];
        return {
            key: 'hf-turn-left', name: 'Turn Left', icon: 'fa-rotate-left',
            category: 'Gestures',
            description: 'Character turns body to their left (3/4 view), holds briefly, then returns to face front.',
            presetKeys: ['human-front'],
            duration: 2400, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {},           tilts: {},           frontViewLayerOverride: ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'] },
                { t: 0.30, angles: peakAngles,   tilts: peakTilts,    frontViewLayerOverride: leftArmFront },
                { t: 0.64, angles: peakAngles,   tilts: peakTilts,    frontViewLayerOverride: leftArmFront },
                { t: 1.00, angles: {},           tilts: {},           frontViewLayerOverride: ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'] }
            ]
        };
    }

    static hfIdleBreatheTilt() {
        // Slow Tilt Y oscillation on torso/neck — chest rises (back arches) on
        // inhale, settles on exhale. Head pitches very slightly back on inhale.
        // No sideways head turn (no head tiltY) so it reads as breathing, not
        // looking around.
        const inhale = {
            angles: { 'torso': 0, 'head': 0 },
            tilts: {
                'torso': { y: -5 }, 'neck': { y: -3 }, 'head': { x: -3 },
                'l-upper-arm': { y: 3 }, 'r-upper-arm': { y: -3 }
            }
        };
        const exhale = {
            angles: { 'torso': 1, 'head': -1 },
            tilts: {
                'torso': { y: 3 }, 'neck': { y: 2 }, 'head': { x: 1 },
                'l-upper-arm': { y: -2 }, 'r-upper-arm': { y: 2 }
            }
        };
        return {
            key: 'hf-idle-breathe-tilt', name: 'Idle Breathe (Tilt)', icon: 'fa-lungs',
            category: 'Idle',
            description: 'Slow oscillating Tilt Y on torso, neck, and head simulates chest rise and fall. Z-rotation stays near zero so the body breathes instead of swaying.',
            presetKeys: ['human-front'],
            duration: 4200, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, angles: {}, tilts: {} },
                { t: 0.40, angles: inhale.angles, tilts: inhale.tilts, offsets: { 'torso': { y: -3 } } },
                { t: 0.60, angles: inhale.angles, tilts: inhale.tilts, offsets: { 'torso': { y: -3 } } },
                { t: 0.85, angles: exhale.angles, tilts: exhale.tilts, offsets: { 'torso': { y: 1 } } },
                { t: 1.00, angles: {}, tilts: {} }
            ]
        };
    }

    static hfLookAroundTilt() {
        // Head pitches up/down (Tilt X) and yaws left/right (Tilt Y) while the
        // neck adds a small follow-through. Z-rotation only adds a curious head cock.
        const lookUp = { tilts: { 'head': { x: -16 }, 'neck': { x: -6 } }, angles: { 'head': 0 } };
        const lookRight = { tilts: { 'head': { y: 22, x: -2 }, 'neck': { y: 8 } }, angles: { 'head': 4 } };
        const lookDown = { tilts: { 'head': { x: 14 }, 'neck': { x: 5 } }, angles: { 'head': 0 } };
        const lookLeft = { tilts: { 'head': { y: -22, x: -2 }, 'neck': { y: -8 } }, angles: { 'head': -4 } };
        return {
            key: 'hf-look-around-tilt', name: 'Look Around (Tilt)', icon: 'fa-eye',
            category: 'Gestures',
            description: 'Head looks up, right, down, and left using Tilt X (pitch) and Tilt Y (yaw); Z-rotation only adds a small curious cock.',
            presetKeys: ['human-front'],
            duration: 4000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {}, tilts: {} },
                { t: 0.20, angles: lookUp.angles, tilts: lookUp.tilts },
                { t: 0.40, angles: lookRight.angles, tilts: lookRight.tilts },
                { t: 0.60, angles: lookDown.angles, tilts: lookDown.tilts },
                { t: 0.80, angles: lookLeft.angles, tilts: lookLeft.tilts },
                { t: 1.00, angles: {}, tilts: {} }
            ]
        };
    }

    static hfHandsOnHips() {
        const pose = {
            'r-upper-arm': 54, 'r-forearm': -116, 'r-hand': -18,
            'l-upper-arm': -54, 'l-forearm': 116, 'l-hand': 18
        };
        const frontLayer = ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'];
        const agbadaLayer = { frontViewLayerOverride: frontLayer, agbadaArmLayerMode: 'respect-arm-order' };
        return {
            key: 'hf-hands-on-hips', name: 'Hands on Hips', icon: 'fa-user',
            category: 'Idle', description: 'Confident idle pose with both hands resting on the hips',
            presetKeys: ['human-front'],
            duration: 2400, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.22, angles: pose, contacts: {
                    'r-hand': { tag: 'r-waist', offsetX: -14, offsetY: 6, iterations: 11 },
                    'l-hand': { tag: 'l-waist', offsetX: 14, offsetY: 6, iterations: 11 }
                }, ...agbadaLayer },
                { t: 0.78, angles: pose, contacts: {
                    'r-hand': { tag: 'r-waist', offsetX: -14, offsetY: 6, iterations: 11 },
                    'l-hand': { tag: 'l-waist', offsetX: 14, offsetY: 6, iterations: 11 }
                }, ...agbadaLayer },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfIdle() {
        const breatheTilt = {
            'torso': { x: 2 },
            'head': { x: -2 }
        };
        return {
            key: 'hf-idle', name: 'Idle Breathe', icon: 'fa-lungs',
            category: 'Idle', description: 'Subtle breathing sway',
            presetKeys: ['human-front'],
            duration: 3500, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.45, angles: { 'torso': 1, 'l-upper-arm': 2, 'r-upper-arm': -2, 'head': -1 }, tilts: breatheTilt },
                { t: 0.55, angles: { 'torso': 1, 'l-upper-arm': 2, 'r-upper-arm': -2, 'head': -1 }, tilts: breatheTilt },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfJump() {
        const anticipation = {
            'r-upper-leg': 45, 'r-lower-leg': -45,
            'l-upper-leg': -45, 'l-lower-leg': 45,
            'r-upper-arm': -20, 'l-upper-arm': 20,
            'head': 10
        };
        const liftoff = {
            'r-upper-leg': -10, 'r-lower-leg': 0, 'r-foot': 30,
            'l-upper-leg': 10, 'l-lower-leg': 0, 'l-foot': -30,
            'r-upper-arm': 160, 'r-forearm': -10,
            'l-upper-arm': -160, 'l-forearm': 10,
            'head': -15
        };
        const apex = {
            'r-upper-leg': 70, 'r-lower-leg': -100, 'r-foot': 0,
            'l-upper-leg': -70, 'l-lower-leg': 100, 'l-foot': 0,
            'r-upper-arm': 120, 'r-forearm': -45,
            'l-upper-arm': -120, 'l-forearm': 45,
            'head': 0
        };
        const landing = {
            'r-upper-leg': 50, 'r-lower-leg': -50, 'r-foot': -15,
            'l-upper-leg': -50, 'l-lower-leg': 50, 'l-foot': 15,
            'r-upper-arm': -30, 'r-forearm': -20,
            'l-upper-arm': 30, 'l-forearm': 20,
            'head': 15
        };
        return {
            key: 'hf-jump', name: 'Jump', icon: 'fa-arrow-up',
            category: 'Full Body', description: 'Five-frame crouch, liftoff, apex, landing, and recovery jump',
            presetKeys: ['human-front'],
            duration: 2200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: anticipation, offsets: { 'torso': { y: 20 } } },
                { t: 0.25, angles: liftoff, offsets: { 'torso': { y: -35 } } },
                { t: 0.50, angles: apex, offsets: { 'torso': { y: -70 } } },
                { t: 0.75, angles: landing, offsets: { 'torso': { y: 25 } } },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfDance() {
        const left = { 'torso': -5, 'l-upper-arm': -80, 'l-forearm': 60, 'r-upper-arm': 15, 'l-upper-leg': -10, 'r-upper-leg': 10 };
        const right = { 'torso': 5, 'r-upper-arm': 80, 'r-forearm': 60, 'l-upper-arm': -15, 'l-upper-leg': 10, 'r-upper-leg': -10 };
        return {
            key: 'hf-dance', name: 'Dance', icon: 'fa-music',
            category: 'Full Body', description: 'Groove side to side',
            presetKeys: ['human-front'],
            duration: 1600, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, angles: left },
                { t: 0.25, angles: {} },
                { t: 0.50, angles: right },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: left }
            ]
        };
    }

    static hfNod() {
        return {
            key: 'hf-nod', name: 'Nod Yes', icon: 'fa-check',
            category: 'Gestures', description: 'Head nods up and down',
            presetKeys: ['human-front'],
            duration: 1500, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: { 'head': 12 } },
                { t: 0.50, angles: { 'head': -5 } },
                { t: 0.75, angles: { 'head': 12 } },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfShrug() {
        const peak = { 'l-upper-arm': -25, 'r-upper-arm': 25, 'l-forearm': 40, 'r-forearm': -40, 'head': -2 };
        return {
            key: 'hf-shrug', name: 'Shrug', icon: 'fa-meh',
            category: 'Gestures', description: 'Arms raise in a shrug',
            presetKeys: ['human-front'],
            duration: 2000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: peak },
                { t: 0.65, angles: peak },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfPunch() {
        const wind = {
            'r-upper-arm': 26, 'r-forearm': -96, 'r-hand': -8,
            'l-upper-arm': -18, 'l-forearm': 62, 'l-hand': 6,
            'torso': -1
        };
        const strike = {
            'r-upper-arm': 6, 'r-forearm': -8, 'r-hand': 0,
            'l-upper-arm': -24, 'l-forearm': 82, 'l-hand': 8,
            'torso': 0
        };
        return {
            key: 'hf-punch', name: 'Punch', icon: 'fa-fist-raised',
            category: 'Full Body', description: 'Right hand punch forward',
            presetKeys: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.15, angles: wind },
                { t: 0.35, angles: strike },
                { t: 0.50, angles: strike },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfKick() {
        const wind = {
            'r-upper-leg': -14, 'r-lower-leg': 52, 'r-foot': 6,
            'l-upper-leg': 6, 'l-lower-leg': -8,
            'l-upper-arm': -10, 'r-upper-arm': 10,
            'torso': -2
        };
        const kick = {
            'r-upper-leg': 42, 'r-lower-leg': 8, 'r-foot': -8,
            'l-upper-leg': -8, 'l-lower-leg': -10, 'l-foot': -2,
            'l-upper-arm': -22, 'r-upper-arm': 22,
            'torso': 2
        };
        return {
            key: 'hf-kick', name: 'Front Kick', icon: 'fa-shoe-prints',
            category: 'Full Body', description: 'Right leg kick from front view',
            presetKeys: ['human-front'],
            duration: 1600, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.15, angles: wind },
                { t: 0.35, angles: kick },
                { t: 0.50, angles: kick },
                { t: 0.80, angles: {} },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfBow() {
        const bow = {
            'torso': 0, 'head': 0,
            'l-upper-arm': 8, 'l-forearm': 10,
            'r-upper-arm': -8, 'r-forearm': -10
        };
        const bowTilt = { 'torso': { x: 22 }, 'head': { x: 12 } };
        return {
            key: 'hf-bow', name: 'Bow', icon: 'fa-praying-hands',
            category: 'Gestures', description: 'Respectful bow forward',
            presetKeys: ['human-front'],
            duration: 3000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: bow, tilts: bowTilt },
                { t: 0.60, angles: bow, tilts: bowTilt },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfThink() {
        const think = {
            'head': -10,
            'r-upper-arm': 10, 'r-forearm': 125, 'r-hand': 0,
            'l-upper-arm': 0, 'l-forearm': 0
        };
        const thinkContact = {
            'r-hand': { tag: 'jaw', offsetX: -6, offsetY: 18, iterations: 12 }
        };
        return {
            key: 'hf-think', name: 'Think / Hand to Chin', icon: 'fa-brain',
            category: 'Gestures', description: 'Hand reaches forward to the chin with the elbow kept below the shoulder',
            presetKeys: ['human-front'],
            duration: 3200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.22, angles: think, contacts: thinkContact, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.78, angles: think, contacts: thinkContact, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfPhoneCallPreEar() {
        const preEar = {
            'head': -8,
            'r-upper-arm': 116, 'r-forearm': 126, 'r-hand': 10,
            'l-upper-arm': -18, 'l-forearm': -8
        };
        const preEarContact = {
            'r-hand': { tag: 'r-ear', offsetX: 12, offsetY: 12, iterations: 10 }
        };
        return {
            key: 'hf-phone-call-pre-ear', name: 'Phone Call (Pre-Ear)', icon: 'fa-phone-volume',
            category: 'Communication', description: 'A near-ear listening prep pose that stops just short of the ear.',
            presetKeys: ['human-front'],
            duration: 2200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.22, angles: preEar, contacts: preEarContact, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.78, angles: preEar, contacts: preEarContact, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfPoint() {
        const point = { 'r-upper-arm': -80, 'r-forearm': -10, 'r-hand': 5, 'head': 5, 'torso': 3 };
        return {
            key: 'hf-point', name: 'Point', icon: 'fa-hand-point-right',
            category: 'Gestures', description: 'Point right hand forward',
            presetKeys: ['human-front'],
            duration: 2000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: point, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.70, angles: point, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfArmsCrossed() {
        const crossed = {
            'r-upper-arm': 45, 'r-forearm': -130, 'r-hand': 8,
            'l-upper-arm': -45, 'l-forearm': 130, 'l-hand': -8,
            'head': -3
        };
        return {
            key: 'hf-arms-crossed', name: 'Arms Crossed', icon: 'fa-times',
            category: 'Gestures', description: 'Cross arms over chest',
            presetKeys: ['human-front'],
            duration: 3000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: crossed, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.70, angles: crossed, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfJumpingJacks() {
        const out = {
            'l-upper-arm': -175, 'r-upper-arm': 175,
            'l-upper-leg': -32, 'r-upper-leg': 32
        };
        return {
            key: 'hf-jumping-jacks', name: 'Jumping Jacks', icon: 'fa-child',
            category: 'Full Body', description: 'Arms and legs spread rhythmically',
            presetKeys: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 6,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: out, offsets: { 'torso': { y: -48 } } },
                { t: 0.50, angles: {} },
                { t: 0.75, angles: out, offsets: { 'torso': { y: -48 } } },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfHeadShake() {
        return {
            key: 'hf-head-shake', name: 'Head Shake No', icon: 'fa-times-circle',
            category: 'Gestures', description: 'Head shakes side to side',
            presetKeys: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.15, angles: { 'head': -15 } },
                { t: 0.40, angles: { 'head': 15 } },
                { t: 0.65, angles: { 'head': -15 } },
                { t: 0.85, angles: { 'head': 15 } },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfCelebrate() {
        const cheer = {
            'r-upper-arm': 160, 'r-forearm': -10,
            'l-upper-arm': -160, 'l-forearm': 10,
            'neck': 5, 'head': 10
        };
        return {
            key: 'hf-celebrate', name: 'Cheer / Celebrate', icon: 'fa-trophy',
            category: 'Full Body', description: 'Arms raised high overhead in a front-view celebration pose',
            presetKeys: ['human-front'],
            duration: 1800, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.20, angles: cheer },
                { t: 0.80, angles: cheer },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfCombatIdle() {
        const stance = {
            'r-upper-leg': 10, 'r-lower-leg': -8, 'r-foot': -6,
            'l-upper-leg': -10, 'l-lower-leg': 8, 'l-foot': 6,
            'r-upper-arm': 28, 'r-forearm': -102, 'r-hand': -8,
            'l-upper-arm': -28, 'l-forearm': 102, 'l-hand': 8
        };
        return {
            key: 'hf-combat-idle', name: 'Combat Idle', icon: 'fa-fist-raised',
            category: 'Idle', description: 'Wide grounded stance with bent arms ready for action',
            presetKeys: ['human-front'],
            duration: 2400, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.22, angles: stance, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.78, angles: stance, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfStrongmanFlex() {
        const flex = {
            'r-upper-arm': 90, 'r-forearm': -90, 'r-hand': 0,
            'l-upper-arm': -90, 'l-forearm': 90, 'l-hand': 0
        };
        return {
            key: 'hf-strongman-flex', name: 'Strongman Flex', icon: 'fa-dumbbell',
            category: 'Gestures', description: 'Front double-biceps flex with arms horizontal and forearms raised',
            presetKeys: ['human-front'],
            duration: 2200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.22, angles: flex },
                { t: 0.78, angles: flex },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfEat() {
        const plate = {
            'l-upper-arm': -26, 'l-forearm': 82, 'l-hand': 8,
            'r-upper-arm': 26, 'r-forearm': -82, 'r-hand': -8,
            'r-upper-leg': 60, 'r-lower-leg': -90, 'r-foot': 0,
            'l-upper-leg': -60, 'l-lower-leg': 90, 'l-foot': 0,
            'head': 5
        };
        const lift = {
            'l-upper-arm': -26, 'l-forearm': 82, 'l-hand': 8,
            'r-upper-arm': 6, 'r-forearm': -104, 'r-hand': -10,
            'r-upper-leg': 60, 'r-lower-leg': -90, 'r-foot': 0,
            'l-upper-leg': -60, 'l-lower-leg': 90, 'l-foot': 0,
            'head': 8
        };
        const bite = {
            'l-upper-arm': -26, 'l-forearm': 82, 'l-hand': 8,
            'r-upper-arm': -18, 'r-forearm': -122, 'r-hand': -10,
            'r-upper-leg': 60, 'r-lower-leg': -90, 'r-foot': 0,
            'l-upper-leg': -60, 'l-lower-leg': 90, 'l-foot': 0,
            'head': 8
        };
        const plateContacts = {
            'r-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 8 },
            'l-hand': { tag: 'sternum', offsetX: 0, offsetY: 42, iterations: 8 }
        };
        const mouthContacts = {
            'r-hand': { tag: 'mouth', offsetX: -8, offsetY: 10, iterations: 14 },
            'l-hand': { tag: 'sternum', offsetX: 0, offsetY: 42, iterations: 8 }
        };
        return {
            key: 'hf-eat', name: 'Eat / Hand to Mouth', icon: 'fa-utensils',
            category: 'Daily Activities',
            description: 'Seated eating loop: one hand supports near the chest while the other moves from plate level to the mouth.',
            presetKeys: ['human-front'],
            duration: 1600, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: plate, offsets: { 'torso': { y: 40 } }, contacts: plateContacts, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.24, angles: lift, offsets: { 'torso': { y: 40 } }, contacts: plateContacts, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.44, angles: bite, offsets: { 'torso': { y: 40 } }, contacts: mouthContacts, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.62, angles: bite, offsets: { 'torso': { y: 40 } }, contacts: mouthContacts, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.82, angles: lift, offsets: { 'torso': { y: 40 } }, contacts: plateContacts, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 1.00, angles: plate, offsets: { 'torso': { y: 40 } }, contacts: plateContacts, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] }
            ]
        };
    }

    static hfDrink() {
        const low = {
            'r-upper-arm': 28, 'r-forearm': -82, 'r-hand': -8,
            'l-upper-arm': -6, 'l-forearm': 4, 'l-hand': 0,
            'head': 0
        };
        const gather = {
            'r-upper-arm': 12, 'r-forearm': -114, 'r-hand': -10,
            'l-upper-arm': -6, 'l-forearm': 4, 'l-hand': 0,
            'head': -4
        };
        const sip = {
            'r-upper-arm': -10, 'r-forearm': -138, 'r-hand': -12,
            'l-upper-arm': -6, 'l-forearm': 4, 'l-hand': 0,
            'head': -6
        };
        return {
            key: 'hf-drink', name: 'Drink / Cup Sip', icon: 'fa-mug-hot',
            category: 'Daily Activities',
            description: 'Cup-sip movement with the right hand lifting to the mouth and returning.',
            presetKeys: ['human-front'],
            duration: 1400, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: low },
                { t: 0.24, angles: gather, contacts: { 'r-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.36, angles: sip, contacts: { 'r-hand': { tag: 'mouth', offsetX: -6, offsetY: 8, iterations: 14 } }, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.62, angles: sip, contacts: { 'r-hand': { tag: 'mouth', offsetX: -6, offsetY: 8, iterations: 14 } }, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.80, angles: gather, contacts: { 'r-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 1.00, angles: low }
            ]
        };
    }

    static hfAimingPropHold() {
        const aim = {
            'r-upper-arm': 12, 'r-forearm': -6, 'r-hand': 0,
            'l-upper-arm': -14, 'l-forearm': 54, 'l-hand': -8,
            'l-upper-leg': -8, 'l-lower-leg': 10,
            'r-upper-leg': 10, 'r-lower-leg': -10,
            'head': -8
        };
        return {
            key: 'hf-aiming-prop-hold', name: 'Aiming Prop Hold', icon: 'fa-bullseye',
            category: 'Action',
            description: 'Two-hand prop aiming pose for storytelling and action staging.',
            presetKeys: ['human-front'],
            duration: 1800, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: aim },
                { t: 0.78, angles: aim },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfGuidedReadyBob() {
        const layerOrder = ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const ready = {
            'torso': 2,
            'head': -2,
            'r-upper-arm': 16, 'r-forearm': -26,
            'l-upper-arm': -16, 'l-forearm': 26,
            'r-upper-leg': 8, 'l-upper-leg': -8
        };
        return {
            key: 'hf-guided-ready-bob', name: 'Guided Ready Bob', icon: 'fa-shield-halved',
            category: 'Guided Essentials', description: 'Compact ready stance with subtle bobbing for guided-motion front rigs.',
            presetKeys: ['human-front'],
            duration: 1300, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: ready, offsets: { 'torso': { y: 0 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.50, angles: { ...ready, 'torso': 4, 'head': -4 }, offsets: { 'torso': { y: 8 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.00, angles: ready, offsets: { 'torso': { y: 0 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    static hfGuidedPowerWalk() {
        const layerOrder = ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const stepA = {
            'torso': 2,
            'r-upper-arm': -8, 'r-forearm': 12,
            'l-upper-arm': 14, 'l-forearm': -8,
            'r-upper-leg': 22, 'r-lower-leg': -14, 'r-foot': 6,
            'l-upper-leg': -10, 'l-lower-leg': -6, 'l-foot': -2
        };
        const stepB = {
            'torso': -2,
            'r-upper-arm': 14, 'r-forearm': -8,
            'l-upper-arm': -8, 'l-forearm': 12,
            'r-upper-leg': -10, 'r-lower-leg': -6, 'r-foot': -2,
            'l-upper-leg': 22, 'l-lower-leg': -14, 'l-foot': 6
        };
        return {
            key: 'hf-guided-power-walk', name: 'Guided Power Walk', icon: 'fa-person-walking',
            category: 'Guided Essentials', description: 'Readable front walk cycle tuned for 6-part guided rigs.',
            presetKeys: ['human-front'],
            duration: 1400, easing: 'linear', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: stepA, offsets: { 'torso': { y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.25, angles: {}, offsets: { 'torso': { y: -8 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.50, angles: stepB, offsets: { 'torso': { y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.75, angles: {}, offsets: { 'torso': { y: -8 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.00, angles: stepA, offsets: { 'torso': { y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    // Faster 3/4-read run. Authored as the left-facing source version; right-facing
    // characters use the dedicated 3/4-right movement adapter in joint-tune-skeleton.
    static hfGuidedRun() {
        const layerOrder = ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const contactA = {
            'torso': 6, 'head': -3,
            'r-upper-arm': -62, 'r-forearm': 36, 'r-hand': -10,
            'l-upper-arm': 54, 'l-forearm': -30, 'l-hand': 8,
            'r-upper-leg': 64, 'r-lower-leg': -56, 'r-foot': 18,
            'l-upper-leg': -42, 'l-lower-leg': 54, 'l-foot': -18
        };
        const flightA = {
            'torso': 8, 'head': -4,
            'r-upper-arm': -38, 'r-forearm': 30, 'r-hand': -6,
            'l-upper-arm': 32, 'l-forearm': -26, 'l-hand': 6,
            'r-upper-leg': 28, 'r-lower-leg': -72, 'r-foot': -6,
            'l-upper-leg': 36, 'l-lower-leg': -64, 'l-foot': 8
        };
        const contactB = {
            'torso': 6, 'head': -3,
            'r-upper-arm': 54, 'r-forearm': -30, 'r-hand': 8,
            'l-upper-arm': -62, 'l-forearm': 36, 'l-hand': -10,
            'r-upper-leg': -42, 'r-lower-leg': 54, 'r-foot': -18,
            'l-upper-leg': 64, 'l-lower-leg': -56, 'l-foot': 18
        };
        const flightB = {
            'torso': 8, 'head': -4,
            'r-upper-arm': 32, 'r-forearm': -26, 'r-hand': 6,
            'l-upper-arm': -38, 'l-forearm': 30, 'l-hand': -6,
            'r-upper-leg': 36, 'r-lower-leg': -64, 'r-foot': 8,
            'l-upper-leg': 28, 'l-lower-leg': -72, 'l-foot': -6
        };
        return {
            key: 'hf-guided-run', name: 'Guided 3/4 Run', icon: 'fa-person-running',
            category: 'Guided Essentials',
            description: 'Fast in-place 3/4 run with torso lean, airborne phases, high knee drive, and bent running arms.',
            presetKeys: ['human-front'],
            duration: 620, easing: 'easeInOut', repeat: Infinity,
            viewCompatibility: ['front-3q-left', 'front-3q-right'],
            semanticAction: 'locomotion.run',
            semanticFamily: 'locomotion',
            motionIntent: '3/4 in-place run loop',
            keyframes: [
                { t: 0.00, angles: contactA, offsets: { 'torso': { y: -4 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.25, angles: flightA, offsets: { 'torso': { y: -26 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.50, angles: contactB, offsets: { 'torso': { y: -4 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.75, angles: flightB, offsets: { 'torso': { y: -26 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.00, angles: contactA, offsets: { 'torso': { y: -4 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    // Energetic 3/4-right strut with balanced alternating swing. Uses a CONSTANT
    // layer order (left arm always behind the torso, right arm always in front) so
    // the character keeps a stable 3/4 read with no per-swing z-order flicker.
    static hfGuidedStrutWalk() {
        // back->front: rear/left-side limbs, torso/head, near/right-side limbs.
        const layerOrder = ['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm'];
        const stepA = {
            'torso': 3, 'head': -2,
            'r-upper-arm': -26, 'r-forearm': 8,
            'l-upper-arm': 26, 'l-forearm': -8,
            'r-upper-leg': 30, 'r-lower-leg': -20, 'r-foot': 9,
            'l-upper-leg': -16, 'l-lower-leg': -8, 'l-foot': -2
        };
        const stepB = {
            'torso': 3, 'head': -2,
            'r-upper-arm': 26, 'r-forearm': -8,
            'l-upper-arm': -26, 'l-forearm': 8,
            'r-upper-leg': -16, 'r-lower-leg': -8, 'r-foot': -2,
            'l-upper-leg': 20, 'l-lower-leg': -14, 'l-foot': 7
        };
        return {
            key: 'hf-guided-strut-walk', name: 'Guided 3/4 Strut', icon: 'fa-person-walking',
            category: 'Guided Essentials', description: 'Energetic 3/4-right strut with wide alternating swing; left arm stays behind the torso, right arm in front.',
            presetKeys: ['human-front'],
            duration: 1050, easing: 'linear', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: stepA, offsets: { 'torso': { y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.25, angles: {}, offsets: { 'torso': { y: -13 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.50, angles: stepB, offsets: { 'torso': { y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.75, angles: {}, offsets: { 'torso': { y: -13 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.00, angles: stepA, offsets: { 'torso': { y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    // Relaxed 3/4-right stroll with gentle alternating swing. CONSTANT layer order
    // (left arm behind torso, right arm in front) - no per-swing z-order flicker.
    static hfGuidedCasualWalk() {
        const layerOrder = ['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm'];
        const stepA = {
            'torso': -2, 'head': 1,
            'l-upper-arm': -16, 'l-forearm': 6,
            'r-upper-arm': 16, 'r-forearm': -6,
            'l-upper-leg': 18, 'l-lower-leg': -12, 'l-foot': 5,
            'r-upper-leg': -9, 'r-lower-leg': -5, 'r-foot': -1
        };
        const stepB = {
            'torso': -2, 'head': 1,
            'l-upper-arm': 16, 'l-forearm': -6,
            'r-upper-arm': -16, 'r-forearm': 6,
            'l-upper-leg': -9, 'l-lower-leg': -5, 'l-foot': -1,
            'r-upper-leg': 12, 'r-lower-leg': -8, 'r-foot': 4
        };
        return {
            key: 'hf-guided-casual-walk', name: 'Guided 3/4 Stroll', icon: 'fa-person-walking',
            category: 'Guided Essentials', description: 'Relaxed 3/4-right stroll with gentle alternating swing; left arm stays behind the torso, right arm in front.',
            presetKeys: ['human-front'],
            duration: 1650, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: stepA, offsets: { 'torso': { y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.25, angles: {}, offsets: { 'torso': { y: -6 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.50, angles: stepB, offsets: { 'torso': { y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.75, angles: {}, offsets: { 'torso': { y: -6 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.00, angles: stepA, offsets: { 'torso': { y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    static hfGuidedStrutTravel() {
        const layerOrder = ['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm'];
        const tiltA = {
            'r-upper-arm': { x: -22, y: 0 },
            'r-forearm': { x: -12, y: 0 },
            'l-upper-arm': { x: 22, y: 0 },
            'l-forearm': { x: 12, y: 0 },
            'r-upper-leg': { x: 18, y: 0 },
            'l-upper-leg': { x: -18, y: 0 }
        };
        const tiltMid = {
            'r-upper-arm': { x: 0, y: 0 },
            'l-upper-arm': { x: 0, y: 0 },
            'r-upper-leg': { x: 0, y: 0 },
            'l-upper-leg': { x: 0, y: 0 }
        };
        const tiltB = {
            'r-upper-arm': { x: 22, y: 0 },
            'r-forearm': { x: 12, y: 0 },
            'l-upper-arm': { x: -22, y: 0 },
            'l-forearm': { x: -12, y: 0 },
            'r-upper-leg': { x: -18, y: 0 },
            'l-upper-leg': { x: 18, y: 0 }
        };
        const stepA = {
            'torso': 3, 'head': -2,
            'r-upper-arm': -26, 'r-forearm': 8,
            'l-upper-arm': 26, 'l-forearm': -8,
            'r-upper-leg': 30, 'r-lower-leg': -20, 'r-foot': 9,
            'l-upper-leg': -16, 'l-lower-leg': -8, 'l-foot': -2
        };
        const stepB = {
            'torso': 3, 'head': -2,
            'r-upper-arm': 26, 'r-forearm': -8,
            'l-upper-arm': -26, 'l-forearm': 8,
            'r-upper-leg': -16, 'r-lower-leg': -8, 'r-foot': -2,
            'l-upper-leg': 20, 'l-lower-leg': -14, 'l-foot': 7
        };
        return {
            key: 'hf-guided-strut-travel', name: 'Guided 3/4 Strut Forward', icon: 'fa-person-walking-arrow-right',
            category: 'Guided Essentials', description: 'Energetic 3/4 strut that moves the character forward across the stage with two visible stride cycles.',
            presetKeys: ['human-front'],
            duration: 3200, easing: 'linear', repeat: 1,
            viewCompatibility: ['front-3q-left', 'front-3q-right'],
            semanticAction: 'locomotion.strut',
            semanticFamily: 'locomotion',
            motionIntent: '3/4 strut forward travel',
            rootTravel: { x: 180 },
            absoluteTravel: false,
            walkTravelLoopFinalFromStart: true,
            walkTravelLoopKeepTerminal: true,
            skipStartIdleBookend: true,
            skipEndIdleBookend: true,
            keyframes: [
                { t: 0.000, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: 0, y: 0 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.060, angles: stepA, tilts: tiltA, offsets: { 'torso': { x: 0, y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.170, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -22.5, y: -13 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.280, angles: stepB, tilts: tiltB, offsets: { 'torso': { x: -45, y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.390, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -67.5, y: -13 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.500, angles: stepA, tilts: tiltA, offsets: { 'torso': { x: -90, y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.610, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -112.5, y: -13 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.720, angles: stepB, tilts: tiltB, offsets: { 'torso': { x: -135, y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.830, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -157.5, y: -13 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.940, angles: stepA, tilts: tiltA, offsets: { 'torso': { x: -180, y: -3 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.000, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -180, y: 0 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    static hfGuidedStrollTravel() {
        const layerOrder = ['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm'];
        const tiltA = {
            'r-upper-arm': { x: -14, y: 0 },
            'r-forearm': { x: -8, y: 0 },
            'l-upper-arm': { x: 14, y: 0 },
            'l-forearm': { x: 8, y: 0 },
            'r-upper-leg': { x: 11, y: 0 },
            'l-upper-leg': { x: -11, y: 0 }
        };
        const tiltMid = {
            'r-upper-arm': { x: 0, y: 0 },
            'l-upper-arm': { x: 0, y: 0 },
            'r-upper-leg': { x: 0, y: 0 },
            'l-upper-leg': { x: 0, y: 0 }
        };
        const tiltB = {
            'r-upper-arm': { x: 14, y: 0 },
            'r-forearm': { x: 8, y: 0 },
            'l-upper-arm': { x: -14, y: 0 },
            'l-forearm': { x: -8, y: 0 },
            'r-upper-leg': { x: -11, y: 0 },
            'l-upper-leg': { x: 11, y: 0 }
        };
        const stepA = {
            'torso': -2, 'head': 1,
            'l-upper-arm': -16, 'l-forearm': 6,
            'r-upper-arm': 16, 'r-forearm': -6,
            'l-upper-leg': 18, 'l-lower-leg': -12, 'l-foot': 5,
            'r-upper-leg': -9, 'r-lower-leg': -5, 'r-foot': -1
        };
        const stepB = {
            'torso': -2, 'head': 1,
            'l-upper-arm': 16, 'l-forearm': -6,
            'r-upper-arm': -16, 'r-forearm': 6,
            'l-upper-leg': -9, 'l-lower-leg': -5, 'l-foot': -1,
            'r-upper-leg': 12, 'r-lower-leg': -8, 'r-foot': 4
        };
        return {
            key: 'hf-guided-stroll-travel', name: 'Guided 3/4 Stroll Forward', icon: 'fa-person-walking-arrow-loop-left',
            category: 'Guided Essentials', description: 'Relaxed 3/4 stroll that moves the character forward across the stage with two visible stride cycles.',
            presetKeys: ['human-front'],
            duration: 4200, easing: 'linear', repeat: 1,
            viewCompatibility: ['front-3q-left', 'front-3q-right'],
            semanticAction: 'locomotion.stroll',
            semanticFamily: 'locomotion',
            motionIntent: '3/4 stroll forward travel',
            rootTravel: { x: 150 },
            absoluteTravel: false,
            walkTravelLoopFinalFromStart: true,
            walkTravelLoopKeepTerminal: true,
            skipStartIdleBookend: true,
            skipEndIdleBookend: true,
            keyframes: [
                { t: 0.000, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: 0, y: 0 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.060, angles: stepA, tilts: tiltA, offsets: { 'torso': { x: 0, y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.170, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -18.75, y: -6 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.280, angles: stepB, tilts: tiltB, offsets: { 'torso': { x: -37.5, y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.390, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -56.25, y: -6 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.500, angles: stepA, tilts: tiltA, offsets: { 'torso': { x: -75, y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.610, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -93.75, y: -6 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.720, angles: stepB, tilts: tiltB, offsets: { 'torso': { x: -112.5, y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.830, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -131.25, y: -6 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.940, angles: stepA, tilts: tiltA, offsets: { 'torso': { x: -150, y: -2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.000, angles: {}, tilts: tiltMid, offsets: { 'torso': { x: -150, y: 0 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    static hfFrontWalkForward() {
        const layerOrder = ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const makeFrame = (t, shoulder = 0, torso = 0, tilt = 0, bobY = 0) => {
            const armTilt = Math.max(-35, Math.min(35, tilt));
            const legTilt = armTilt;
            return {
                t,
                angles: {
                    'r-upper-arm': -shoulder,
                    'l-upper-arm': shoulder,
                    head: shoulder > 0 ? -2 : (shoulder < 0 ? 2 : 0),
                    torso
                },
                tilts: {
                    torso: { x: 0, y: -Math.min(4, Math.abs(armTilt) / 8) },
                    'r-upper-arm': { x: armTilt, y: 0 },
                    'r-forearm': { x: armTilt * 0.55, y: 0 },
                    'l-upper-arm': { x: -armTilt, y: 0 },
                    'l-forearm': { x: -armTilt * 0.55, y: 0 },
                    'r-upper-leg': { x: -armTilt, y: 0 },
                    'r-lower-leg': { x: -armTilt * 0.55, y: 0 },
                    'l-upper-leg': { x: armTilt, y: 0 },
                    'l-lower-leg': { x: armTilt * 0.55, y: 0 }
                },
                dy: bobY,
                frontViewLayerOverride: layerOrder,
                agbadaArmLayerMode: 'respect-arm-order'
            };
        };
        return {
            key: 'hf-front-walk-forward',
            name: 'Front Walk Forward',
            icon: 'fa-person-walking',
            category: 'Guided Essentials',
            description: 'Front-facing walk that travels vertically toward the viewer. Use Movement Blend Y px to set the exact distance.',
            presetKeys: ['human-front'],
            duration: 4000,
            easing: 'linear',
            repeat: 1,
            depthMotionPolicy: 'front-back-tilt-walk',
            anatomyMotionPolicy: 'front-back-tilt-walk',
            keyframes: [
                makeFrame(0.000, 0, 0, 0, 0),
                makeFrame(0.062, 1, -1, -14, -3),
                makeFrame(0.125, 3, -2, -30, -5),
                makeFrame(0.187, 1, -1, -14, -3),
                makeFrame(0.250, 0, 0, 0, 0),
                makeFrame(0.312, -1, 1, 14, -3),
                makeFrame(0.375, -3, 2, 30, -5),
                makeFrame(0.437, -1, 1, 14, -3),
                makeFrame(0.500, 0, 0, 0, 0),
                makeFrame(0.562, 1, -1, -14, -3),
                makeFrame(0.625, 3, -2, -30, -5),
                makeFrame(0.687, 1, -1, -14, -3),
                makeFrame(0.750, 0, 0, 0, 0),
                makeFrame(0.812, -1, 1, 14, -3),
                makeFrame(0.875, -3, 2, 30, -5),
                makeFrame(0.937, -1, 1, 14, -3),
                makeFrame(1.000, 0, 0, 0, 0)
            ]
        };
    }

    static hfGuidedGuardShift() {
        const layerOrder = ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const guard = {
            'r-upper-arm': 30, 'r-forearm': -106,
            'l-upper-arm': -30, 'l-forearm': 106,
            'r-upper-leg': 10, 'l-upper-leg': -10,
            'head': 2
        };
        return {
            key: 'hf-guided-guard-shift', name: 'Guided Guard Shift', icon: 'fa-shield-halved',
            category: 'Guided Essentials', description: 'Defensive left-right weight transfer while keeping a high guard.',
            presetKeys: ['human-front'],
            duration: 1200, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: { ...guard, 'torso': -3 }, offsets: { 'torso': { x: -6, y: 2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 0.50, angles: { ...guard, 'torso': 3 }, offsets: { 'torso': { x: 6, y: 2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' },
                { t: 1.00, angles: { ...guard, 'torso': -3 }, offsets: { 'torso': { x: -6, y: 2 } }, frontViewLayerOverride: layerOrder, agbadaArmLayerMode: 'respect-arm-order' }
            ]
        };
    }

    static hfGuidedJabCombo() {
        const wind = {
            'r-upper-arm': 24, 'r-forearm': -92,
            'l-upper-arm': -22, 'l-forearm': 86,
            'torso': -4
        };
        const strike = {
            'r-upper-arm': 6, 'r-forearm': -6,
            'l-upper-arm': -24, 'l-forearm': 90,
            'torso': 6
        };
        return {
            key: 'hf-guided-jab-combo', name: 'Guided Jab Combo', icon: 'fa-hand-fist',
            category: 'Guided Essentials', description: 'Two quick front jabs with clean recoil timing.',
            presetKeys: ['human-front'],
            duration: 950, easing: 'easeInOut', repeat: 3,
            keyframes: [
                { t: 0.00, angles: wind },
                { t: 0.18, angles: strike, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.36, angles: wind },
                { t: 0.54, angles: strike, frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'] },
                { t: 0.75, angles: wind },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hfGuidedSneakLoop() {
        const sneakA = {
            'torso': 8, 'head': -6,
            'r-upper-arm': 10, 'r-forearm': -10,
            'l-upper-arm': -10, 'l-forearm': 10,
            'r-upper-leg': 16, 'r-lower-leg': -18,
            'l-upper-leg': -8, 'l-lower-leg': -10
        };
        const sneakB = {
            'torso': 8, 'head': -6,
            'r-upper-arm': -10, 'r-forearm': 10,
            'l-upper-arm': 10, 'l-forearm': -10,
            'r-upper-leg': -8, 'r-lower-leg': -10,
            'l-upper-leg': 16, 'l-lower-leg': -18
        };
        return {
            key: 'hf-guided-sneak-loop', name: 'Guided Sneak Loop', icon: 'fa-user-secret',
            category: 'Guided Essentials', description: 'Low stealth step loop tuned for front-facing guided characters.',
            presetKeys: ['human-front'],
            duration: 1500, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: sneakA, offsets: { 'torso': { y: 10 } } },
                { t: 0.50, angles: sneakB, offsets: { 'torso': { y: 12 } } },
                { t: 1.00, angles: sneakA, offsets: { 'torso': { y: 10 } } }
            ]
        };
    }

    // ═══ HUMAN SIDE ═══

    static hsWalk() {
        const a = { 'upper-arm': -30, 'forearm': 40, 'upper-leg': 30, 'lower-leg': -40 };
        const b = { 'upper-arm': 20, 'forearm': 10, 'upper-leg': -20, 'lower-leg': -10 };
        return {
            key: 'hs-walk', name: 'Walk (Side)', icon: 'fa-walking',
            category: 'Locomotion', description: 'Side-view walk cycle',
            presetKeys: ['human-side'],
            duration: 2000, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, angles: a },
                { t: 0.25, angles: {} },
                { t: 0.50, angles: b },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: a }
            ]
        };
    }

    static hsRun() {
        const push = { 'upper-arm': -50, 'forearm': 80, 'upper-leg': 50, 'lower-leg': -70 };
        const pull = { 'upper-arm': 30, 'forearm': 20, 'upper-leg': -30, 'lower-leg': -20 };
        const pushTilt = { 'torso': { x: -7 }, 'head': { x: -4 } };
        const pullTilt = { 'torso': { x: 5 }, 'head': { x: 2 } };
        return {
            key: 'hs-run', name: 'Run (Side)', icon: 'fa-running',
            category: 'Locomotion', description: 'Side-view run cycle',
            presetKeys: ['human-side'],
            duration: 1200, easing: 'linear', repeat: 6,
            keyframes: [
                { t: 0.00, angles: push, tilts: pushTilt },
                { t: 0.25, angles: {} },
                { t: 0.50, angles: pull, tilts: pullTilt },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: push, tilts: pushTilt }
            ]
        };
    }

    static hsKick() {
        const wind = { 'upper-leg': -15, 'lower-leg': -60 };
        const kick = { 'upper-leg': 60, 'lower-leg': -10, 'torso': 8 };
        return {
            key: 'hs-kick', name: 'Kick (Side)', icon: 'fa-shoe-prints',
            category: 'Full Body', description: 'Front kick from side view',
            presetKeys: ['human-side'],
            duration: 1500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.20, angles: wind },
                { t: 0.40, angles: kick },
                { t: 0.55, angles: kick },
                { t: 0.80, angles: {} },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hsCrouch() {
        const low = { 'upper-leg': 60, 'lower-leg': -90, 'torso': 15, 'upper-arm': -20, 'forearm': 40 };
        return {
            key: 'hs-crouch', name: 'Crouch (Side)', icon: 'fa-level-down-alt',
            category: 'Full Body', description: 'Crouch down from side view',
            presetKeys: ['human-side'],
            duration: 2000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.30, angles: low },
                { t: 0.70, angles: low },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hsPunch() {
        const wind = { 'upper-arm': -40, 'forearm': 80, 'torso': -8 };
        const strike = { 'upper-arm': 10, 'forearm': 5, 'torso': 12 };
        return {
            key: 'hs-punch', name: 'Punch (Side)', icon: 'fa-fist-raised',
            category: 'Full Body', description: 'Side-view punch forward',
            presetKeys: ['human-side'],
            duration: 1200, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.15, angles: wind },
                { t: 0.35, angles: strike },
                { t: 0.50, angles: strike },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hsBow() {
        const bow = { 'torso': 45, 'upper-arm': -30, 'forearm': 20, 'head': 10 };
        const bowTilt = { 'torso': { x: 14 }, 'head': { x: 8 } };
        return {
            key: 'hs-bow', name: 'Bow (Side)', icon: 'fa-praying-hands',
            category: 'Gestures', description: 'Side-view respectful bow',
            presetKeys: ['human-side'],
            duration: 3000, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: bow, tilts: bowTilt },
                { t: 0.60, angles: bow, tilts: bowTilt },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static hsEat() {
        const seated = {
            'upper-leg': -90,
            'lower-leg': 90,
            'foot': 0
        };
        const mouthContact = { 'hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 20 } };
        const low = {
            'upper-arm': 34,
            'forearm': -96,
            'hand': 0,
            ...seated,
            'head': 4
        };
        const gather = {
            'upper-arm': 4,
            'forearm': -118,
            'hand': 0,
            ...seated,
            'head': 6
        };
        const bite = {
            'upper-arm': -50,
            'forearm': -151,
            'hand': 0,
            ...seated,
            'head': 6
        };
        return {
            key: 'hs-eat', name: 'Eat (Side)', icon: 'fa-utensils',
            category: 'Daily Activities', description: 'Side-view hand-to-mouth eating loop',
            presetKeys: ['human-side'],
            duration: 1600, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: low },
                { t: 0.24, angles: gather },
                { t: 0.44, angles: bite, contacts: mouthContact },
                { t: 0.62, angles: bite, contacts: mouthContact },
                { t: 0.82, angles: gather },
                { t: 1.00, angles: low }
            ]
        };
    }

    static hsDrink() {
        const mouthContact = { 'hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 20 } };
        const low = {
            'upper-arm': 34,
            'forearm': -96,
            'hand': 0,
            'head': 0
        };
        const gather = {
            'upper-arm': 6,
            'forearm': -116,
            'hand': 0,
            'head': -3
        };
        const sip = {
            'upper-arm': -50,
            'forearm': -151,
            'hand': 0,
            'head': -5
        };
        return {
            key: 'hs-drink', name: 'Drink (Side)', icon: 'fa-mug-hot',
            category: 'Daily Activities', description: 'Side-view cup-sip loop with controlled front-path arm motion',
            presetKeys: ['human-side'],
            duration: 1400, easing: 'easeInOut', repeat: Infinity,
            keyframes: [
                { t: 0.00, angles: low },
                { t: 0.24, angles: gather },
                { t: 0.36, angles: sip, contacts: mouthContact },
                { t: 0.62, angles: sip, contacts: mouthContact },
                { t: 0.80, angles: gather },
                { t: 1.00, angles: low }
            ]
        };
    }

    static hsJump() {
        const crouch = { 'upper-leg': 50, 'lower-leg': -70, 'torso': 10, 'upper-arm': 20 };
        const air = { 'upper-leg': -20, 'lower-leg': -10, 'torso': -5, 'upper-arm': -50, 'forearm': 30 };
        return {
            key: 'hs-jump', name: 'Jump (Side)', icon: 'fa-arrow-up',
            category: 'Full Body', description: 'Side-view jump',
            presetKeys: ['human-side'],
            duration: 2200, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.15, angles: crouch },
                { t: 0.35, angles: air },
                { t: 0.55, angles: air },
                { t: 0.80, angles: {} },
                { t: 1.00, angles: {} }
            ]
        };
    }

    // ═══ QUADRUPED ═══

    static qWalk() {
        const a = {
            'fl-upper': -20, 'fl-lower': 30, 'rr-upper': -20, 'rr-lower': 30,
            'fr-upper': 15, 'fr-lower': 5, 'rl-upper': 15, 'rl-lower': 5
        };
        const b = {
            'fr-upper': -20, 'fr-lower': 30, 'rl-upper': -20, 'rl-lower': 30,
            'fl-upper': 15, 'fl-lower': 5, 'rr-upper': 15, 'rr-lower': 5
        };
        return {
            key: 'q-walk', name: 'Walk (Quadruped)', icon: 'fa-paw',
            category: 'Locomotion', description: 'Diagonal walk gait',
            presetKeys: ['quadruped'],
            duration: 2000, easing: 'linear', repeat: 4,
            keyframes: [
                { t: 0.00, angles: a },
                { t: 0.25, angles: {} },
                { t: 0.50, angles: b },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: a }
            ]
        };
    }

    static qRun() {
        const gather = { 'fl-upper': -35, 'fr-upper': -35, 'rl-upper': 20, 'rr-upper': 20, 'rl-lower': -60, 'rr-lower': -60, 'head': -5 };
        const extend = { 'fl-upper': 20, 'fr-upper': 20, 'fl-lower': 5, 'fr-lower': 5, 'rl-upper': -35, 'rr-upper': -35, 'head': 5 };
        const gatherTilt = { 'body': { x: -6 }, 'head': { x: 4 } };
        const extendTilt = { 'body': { x: 6 }, 'head': { x: -4 } };
        return {
            key: 'q-run', name: 'Run (Quadruped)', icon: 'fa-bolt',
            category: 'Locomotion', description: 'Fast running gait',
            presetKeys: ['quadruped'],
            duration: 1400, easing: 'linear', repeat: 5,
            keyframes: [
                { t: 0.00, angles: gather, tilts: gatherTilt },
                { t: 0.25, angles: {} },
                { t: 0.50, angles: extend, tilts: extendTilt },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: gather, tilts: gatherTilt }
            ]
        };
    }

    static qSit() {
        const sit = { 'rl-upper': -45, 'rr-upper': -45, 'rl-lower': -70, 'rr-lower': -70, 'head': -10, 'tail': 20 };
        return {
            key: 'q-sit', name: 'Sit (Quadruped)', icon: 'fa-chair',
            category: 'Gestures', description: 'Sit on haunches',
            presetKeys: ['quadruped'],
            duration: 2500, easing: 'easeInOut', repeat: 1,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.30, angles: sit },
                { t: 0.70, angles: sit },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static qTailWag() {
        return {
            key: 'q-tail-wag', name: 'Tail Wag', icon: 'fa-heart',
            category: 'Gestures', description: 'Happy tail wagging',
            presetKeys: ['quadruped'],
            duration: 800, easing: 'easeInOut', repeat: 8,
            keyframes: [
                { t: 0.00, angles: { 'tail': -30 } },
                { t: 0.50, angles: { 'tail': 30 } },
                { t: 1.00, angles: { 'tail': -30 } }
            ]
        };
    }

    // ═══ BIRD ═══

    static bFlap() {
        const up = { 'l-wing-upper': -60, 'l-wing-lower': -20, 'r-wing-upper': 60, 'r-wing-lower': 20 };
        const down = { 'l-wing-upper': 30, 'l-wing-lower': 20, 'r-wing-upper': -30, 'r-wing-lower': -20 };
        const upTilt = { 'body': { y: -8 } };
        const downTilt = { 'body': { y: 8 } };
        return {
            key: 'b-flap', name: 'Wing Flap', icon: 'fa-dove',
            category: 'Locomotion', description: 'Wings beat up and down',
            presetKeys: ['bird'],
            duration: 1200, easing: 'easeInOut', repeat: 6,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.25, angles: up, tilts: upTilt },
                { t: 0.50, angles: {} },
                { t: 0.75, angles: down, tilts: downTilt },
                { t: 1.00, angles: {} }
            ]
        };
    }

    static bGlide() {
        const spread = { 'l-wing-upper': -40, 'l-wing-lower': 10, 'r-wing-upper': 40, 'r-wing-lower': -10 };
        return {
            key: 'b-glide', name: 'Glide', icon: 'fa-wind',
            category: 'Locomotion', description: 'Wings spread for gliding',
            presetKeys: ['bird'],
            duration: 4000, easing: 'easeInOut', repeat: 2,
            keyframes: [
                { t: 0.00, angles: spread },
                { t: 0.40, angles: { ...spread, 'body': 3 } },
                { t: 0.60, angles: { ...spread, 'body': -3 } },
                { t: 1.00, angles: spread }
            ]
        };
    }

    static bPeck() {
        const peck = { 'head': 25, 'body': 5 };
        return {
            key: 'b-peck', name: 'Peck', icon: 'fa-seedling',
            category: 'Gestures', description: 'Head dips to peck',
            presetKeys: ['bird'],
            duration: 1000, easing: 'easeInOut', repeat: 4,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.35, angles: peck },
                { t: 0.50, angles: peck },
                { t: 0.70, angles: {} },
                { t: 1.00, angles: {} }
            ]
        };
    }

    // ═══ SPIDER ═══

    static spWalk() {
        // Tetrapod gait: group A (L-front, L-midrear, R-midfront, R-rear) then group B
        const a = {
            'l-front-leg': -25, 'l-midrear-leg': -25, 'r-midfront-leg': -25, 'r-rear-leg': -25,
            'l-midfront-leg': 20, 'l-rear-leg': 20, 'r-front-leg': 20, 'r-midrear-leg': 20
        };
        const b = {
            'l-midfront-leg': -25, 'l-rear-leg': -25, 'r-front-leg': -25, 'r-midrear-leg': -25,
            'l-front-leg': 20, 'l-midrear-leg': 20, 'r-midfront-leg': 20, 'r-rear-leg': 20
        };
        return {
            key: 'sp-walk', name: 'Walk (Spider)', icon: 'fa-spider',
            category: 'Locomotion', description: 'Alternating tetrapod gait',
            presetKeys: ['spider'],
            duration: 1600, easing: 'linear', repeat: 5,
            keyframes: [
                { t: 0.00, angles: a },
                { t: 0.25, angles: {} },
                { t: 0.50, angles: b },
                { t: 0.75, angles: {} },
                { t: 1.00, angles: a }
            ]
        };
    }

    static spIdle() {
        return {
            key: 'sp-idle', name: 'Idle (Spider)', icon: 'fa-spider',
            category: 'Idle', description: 'Subtle leg twitches',
            presetKeys: ['spider'],
            duration: 3000, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.30, angles: { 'l-front-leg': -5, 'r-rear-leg': 5 } },
                { t: 0.50, angles: {} },
                { t: 0.70, angles: { 'r-front-leg': 5, 'l-rear-leg': -5 } },
                { t: 1.00, angles: {} }
            ]
        };
    }

    // ═══ FISH ═══

    static fSwim() {
        const leftSway = { 'body': { y: -6 }, 'head': { y: 3 } };
        const midLeftSway = { 'body': { y: -2 }, 'head': { y: 1 } };
        const rightSway = { 'body': { y: 6 }, 'head': { y: -3 } };
        const midRightSway = { 'body': { y: 2 }, 'head': { y: -1 } };
        return {
            key: 'f-swim', name: 'Swim', icon: 'fa-fish',
            category: 'Locomotion', description: 'Tail undulation for swimming',
            presetKeys: ['fish'],
            duration: 1800, easing: 'linear', repeat: 6,
            keyframes: [
                { t: 0.00, angles: { 'tail': -25, 'pectoral': 10 }, tilts: leftSway },
                { t: 0.25, angles: { 'head': 5, 'pectoral': -5 }, tilts: midLeftSway },
                { t: 0.50, angles: { 'tail': 25, 'pectoral': -10 }, tilts: rightSway },
                { t: 0.75, angles: { 'head': -5, 'pectoral': 5 }, tilts: midRightSway },
                { t: 1.00, angles: { 'tail': -25, 'pectoral': 10 }, tilts: leftSway }
            ]
        };
    }

    static fIdle() {
        return {
            key: 'f-idle', name: 'Idle (Fish)', icon: 'fa-water',
            category: 'Idle', description: 'Gentle fin drift',
            presetKeys: ['fish'],
            duration: 3500, easing: 'easeInOut', repeat: 999,
            keyframes: [
                { t: 0.00, angles: {} },
                { t: 0.40, angles: { 'pectoral': 8, 'dorsal': -3, 'tail': 5 } },
                { t: 0.60, angles: { 'pectoral': -8, 'dorsal': 3, 'tail': -5 } },
                { t: 1.00, angles: {} }
            ]
        };
    }
}


// ─────────────────────────────────────────────────────
//  JOINT SYSTEM MANAGER — UI & Assembly Engine
// ─────────────────────────────────────────────────────
