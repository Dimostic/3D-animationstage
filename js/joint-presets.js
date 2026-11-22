/**
 * ═══════════════════════════════════════════════════════════════
 *  JOINT SYSTEM — Preset joints, body-part assembly & animations
 * ═══════════════════════════════════════════════════════════════
 *
 *  Workflow:
 *  1. User places body-part images on stage (torso, arms, legs, etc.)
 *  2. User opens the Joint Assembly panel
 *  3. User selects a character template (e.g. "Human Front")
 *  4. Each body part is listed with expected pin-point descriptions
 *  5. User assigns stage objects to body-part slots
 *  6. System auto-pins objects with correct anchors, offsets, and
 *     joint rotation setup
 *  7. User can then apply Joint Movements (pre-built animations that
 *     rotate joints across the available range)
 */

// ─────────────────────────────────────────────────────
//  JOINT PRESETS — constraint definitions per character type
// ─────────────────────────────────────────────────────

class JointPresets {

    /**
     * Each preset returns:
     *  { key, name, icon, description, parts[] }
     *
     * Each part:
     *  { partKey, name, icon, parentPartKey (null=root),
     *    anchorOnParent: {x,y},   — where on the PARENT this part attaches (0-1)
     *    pivotOnSelf:    {x,y},   — where on THIS PART the pivot sits (0-1)
     *    defaultAngle,            — rest rotation relative to parent (°)
     *    minAngle, maxAngle,      — joint rotation limits (°)
     *    description }            — UI hint for the user
     */

    static getAll() {
        return [
            this.guidedMotionFront(),
            this.humanFront(),
            this.humanSide(),
            this.quadruped(),
            this.bird(),
            this.spider(),
            this.fish()
        ];
    }

    static guidedMotionFront() {
        return {
            key: 'guided-motion-front', name: 'Guided Motion Rig', icon: 'fa-person-rays',
            motionPresetKey: 'human-front',
            rigType: 'guided-motion',
            description: 'Simple front-facing rig with whole flexible arms and legs, a head/neck piece, and a torso root',
            parts: [
                {
                    partKey: 'torso', name: 'Torso', icon: 'fa-vest', parentPartKey: null,
                    anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.3 },
                    defaultAngle: 0, minAngle: -15, maxAngle: 15,
                    description: 'Central body and parent of the motion rig'
                },
                {
                    partKey: 'head-neck', name: 'Head / Neck', icon: 'fa-head-side', parentPartKey: 'torso',
                    anchorOnParent: { x: 0.5, y: 0.02 }, pivotOnSelf: { x: 0.5, y: 0.96 },
                    defaultAngle: 0, minAngle: -40, maxAngle: 40,
                    description: 'Combined head and neck with an internal neck flex anchor'
                },
                {
                    partKey: 'l-arm', name: 'Left Arm', icon: 'fa-hand', parentPartKey: 'torso',
                    anchorOnParent: { x: 0.96, y: 0.12 }, pivotOnSelf: { x: 0.12, y: 0.04 },
                    defaultAngle: 0, minAngle: -145, maxAngle: 145,
                    description: 'Whole left arm with an internal elbow flex anchor'
                },
                {
                    partKey: 'r-arm', name: 'Right Arm', icon: 'fa-hand', parentPartKey: 'torso',
                    anchorOnParent: { x: 0.04, y: 0.12 }, pivotOnSelf: { x: 0.88, y: 0.04 },
                    defaultAngle: 0, minAngle: -145, maxAngle: 145,
                    description: 'Whole right arm with an internal elbow flex anchor'
                },
                {
                    partKey: 'l-leg', name: 'Left Leg', icon: 'fa-shoe-prints', parentPartKey: 'torso',
                    anchorOnParent: { x: 0.72, y: 0.96 }, pivotOnSelf: { x: 0.45, y: 0.02 },
                    defaultAngle: 0, minAngle: -90, maxAngle: 55,
                    description: 'Whole left leg with an internal knee flex anchor'
                },
                {
                    partKey: 'r-leg', name: 'Right Leg', icon: 'fa-shoe-prints', parentPartKey: 'torso',
                    anchorOnParent: { x: 0.28, y: 0.96 }, pivotOnSelf: { x: 0.55, y: 0.02 },
                    defaultAngle: 0, minAngle: -55, maxAngle: 90,
                    description: 'Whole right leg with an internal knee flex anchor'
                }
            ]
        };
    }

    // ═══════════════════════════════════════════
    //  HUMAN FRONT-FACING
    // ═══════════════════════════════════════════
    static humanFront() {
        return {
            key: 'human-front', name: 'Human (Front)', icon: 'fa-person',
            description: 'Front-facing human: head, neck, torso, upper/lower arms, hands, upper/lower legs, feet',
            parts: [
                // Root — torso is the parent of everything
                {
                    partKey: 'torso', name: 'Torso', icon: 'fa-vest',
                    parentPartKey: null,
                    anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.3 },
                    defaultAngle: 0, minAngle: -15, maxAngle: 15,
                    description: 'Main body/chest — root of the skeleton'
                },
                // Neck
                {
                    partKey: 'neck', name: 'Neck', icon: 'fa-neck',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.5, y: 0.06 },
                    pivotOnSelf: { x: 0.5, y: 1.0 },
                    defaultAngle: 0, minAngle: -10, maxAngle: 10,
                    description: 'Neck — attaches to top-center of torso'
                },
                // Head
                {
                    partKey: 'head', name: 'Head', icon: 'fa-head-side',
                    parentPartKey: 'neck',
                    anchorOnParent: { x: 0.5, y: 0.0 },
                    pivotOnSelf: { x: 0.5, y: 1.0 },
                    defaultAngle: 0, minAngle: -35, maxAngle: 35,
                    description: 'Head — attaches to top of neck'
                },
                // Left upper arm (character-left in front view)
                {
                    partKey: 'l-upper-arm', name: 'L Upper Arm', icon: 'fa-hand',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.91, y: 0.30 },
                    pivotOnSelf: { x: 0.0, y: 0.0 },
                    defaultAngle: 0, minAngle: -135, maxAngle: 135,
                    description: 'Left upper arm — attaches to character-left shoulder (viewer-right)'
                },
                // Left forearm
                {
                    partKey: 'l-forearm', name: 'L Forearm', icon: 'fa-hand-paper',
                    parentPartKey: 'l-upper-arm',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -150, maxAngle: 5,
                    description: 'Left forearm — attaches to bottom of left upper arm (elbow)'
                },
                // Left hand
                {
                    partKey: 'l-hand', name: 'L Hand', icon: 'fa-hand-sparkles',
                    parentPartKey: 'l-forearm',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -70, maxAngle: 70,
                    description: 'Left hand — attaches to bottom of left forearm (wrist)'
                },
                // Right upper arm (character-right in front view)
                {
                    partKey: 'r-upper-arm', name: 'R Upper Arm', icon: 'fa-hand',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.07, y: 0.30 },
                    pivotOnSelf: { x: 1.0, y: 0.0 },
                    defaultAngle: 0, minAngle: -135, maxAngle: 135,
                    description: 'Right upper arm — attaches to character-right shoulder (viewer-left)'
                },
                // Right forearm
                {
                    partKey: 'r-forearm', name: 'R Forearm', icon: 'fa-hand-paper',
                    parentPartKey: 'r-upper-arm',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -5, maxAngle: 150,
                    description: 'Right forearm — attaches to bottom of right upper arm (elbow)'
                },
                // Right hand
                {
                    partKey: 'r-hand', name: 'R Hand', icon: 'fa-hand-sparkles',
                    parentPartKey: 'r-forearm',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -70, maxAngle: 70,
                    description: 'Right hand — attaches to bottom of right forearm (wrist)'
                },
                // Left upper leg (character-left in front view)
                {
                    partKey: 'l-upper-leg', name: 'L Upper Leg', icon: 'fa-socks',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.89, y: 0.96 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -45, maxAngle: 90,
                    description: 'Left upper leg — attaches to character-left hip (viewer-right)'
                },
                // Left lower leg
                {
                    partKey: 'l-lower-leg', name: 'L Lower Leg', icon: 'fa-shoe-prints',
                    parentPartKey: 'l-upper-leg',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -130, maxAngle: 5,
                    description: 'Left lower leg — attaches to bottom of left upper leg (knee)'
                },
                // Left foot
                {
                    partKey: 'l-foot', name: 'L Foot', icon: 'fa-socks',
                    parentPartKey: 'l-lower-leg',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.7, y: 0.0 },
                    defaultAngle: 0, minAngle: -45, maxAngle: 30,
                    description: 'Left foot — attaches to bottom of left lower leg (ankle)'
                },
                // Right upper leg (character-right in front view)
                {
                    partKey: 'r-upper-leg', name: 'R Upper Leg', icon: 'fa-socks',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.09, y: 0.96 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -90, maxAngle: 45,
                    description: 'Right upper leg — attaches to character-right hip (viewer-left)'
                },
                // Right lower leg
                {
                    partKey: 'r-lower-leg', name: 'R Lower Leg', icon: 'fa-shoe-prints',
                    parentPartKey: 'r-upper-leg',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -5, maxAngle: 130,
                    description: 'Right lower leg — attaches to bottom of right upper leg (knee)'
                },
                // Right foot
                {
                    partKey: 'r-foot', name: 'R Foot', icon: 'fa-socks',
                    parentPartKey: 'r-lower-leg',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.3, y: 0.0 },
                    defaultAngle: 0, minAngle: -30, maxAngle: 45,
                    description: 'Right foot — attaches to bottom of right lower leg (ankle)'
                }
            ]
        };
    }

    // ═══════════════════════════════════════════
    //  HUMAN SIDE-FACING
    // ═══════════════════════════════════════════
    static humanSide() {
        return {
            key: 'human-side', name: 'Human (Side)', icon: 'fa-person-walking',
            description: 'Side-facing human: head, torso, arm, forearm, hand, upper/lower leg, foot',
            parts: [
                {
                    partKey: 'torso', name: 'Torso', icon: 'fa-vest',
                    parentPartKey: null,
                    anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.3 },
                    defaultAngle: 0, minAngle: -20, maxAngle: 20,
                    description: 'Main body — root'
                },
                {
                    partKey: 'head', name: 'Head', icon: 'fa-head-side',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.4, y: 0.0 },
                    pivotOnSelf: { x: 0.5, y: 1.0 },
                    defaultAngle: 0, minAngle: -30, maxAngle: 30,
                    description: 'Head — attaches to top of torso'
                },
                {
                    partKey: 'upper-arm', name: 'Upper Arm', icon: 'fa-hand',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.5, y: 0.08 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -160, maxAngle: 60,
                    description: 'Upper arm — attaches to shoulder'
                },
                {
                    partKey: 'forearm', name: 'Forearm', icon: 'fa-hand-paper',
                    parentPartKey: 'upper-arm',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: 0, maxAngle: 150,
                    description: 'Forearm — attaches to elbow'
                },
                {
                    partKey: 'hand', name: 'Hand', icon: 'fa-hand-sparkles',
                    parentPartKey: 'forearm',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -60, maxAngle: 60,
                    description: 'Hand — attaches to wrist'
                },
                {
                    partKey: 'upper-leg', name: 'Upper Leg', icon: 'fa-socks',
                    parentPartKey: 'torso',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -45, maxAngle: 110,
                    description: 'Upper leg — attaches to hip'
                },
                {
                    partKey: 'lower-leg', name: 'Lower Leg', icon: 'fa-shoe-prints',
                    parentPartKey: 'upper-leg',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -130, maxAngle: 0,
                    description: 'Lower leg — attaches to knee'
                },
                {
                    partKey: 'foot', name: 'Foot', icon: 'fa-socks',
                    parentPartKey: 'lower-leg',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.3, y: 0.0 },
                    defaultAngle: 0, minAngle: -40, maxAngle: 30,
                    description: 'Foot — attaches to ankle'
                }
            ]
        };
    }

    // ═══════════════════════════════════════════
    //  QUADRUPED (dog, horse, cat, etc.)
    // ═══════════════════════════════════════════
    static quadruped() {
        return {
            key: 'quadruped', name: 'Quadruped (Side)', icon: 'fa-dog',
            description: 'Side-facing four-legged animal: head, body, tail, 4 legs',
            parts: [
                {
                    partKey: 'body', name: 'Body', icon: 'fa-dog',
                    parentPartKey: null,
                    anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.4 },
                    defaultAngle: 0, minAngle: -10, maxAngle: 10,
                    description: 'Main body — root'
                },
                {
                    partKey: 'head', name: 'Head', icon: 'fa-head-side',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.0, y: 0.15 },
                    pivotOnSelf: { x: 0.8, y: 0.7 },
                    defaultAngle: 0, minAngle: -40, maxAngle: 30,
                    description: 'Head — attaches to front-top of body'
                },
                {
                    partKey: 'tail', name: 'Tail', icon: 'fa-wind',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 1.0, y: 0.2 },
                    pivotOnSelf: { x: 0.0, y: 0.5 },
                    defaultAngle: 0, minAngle: -60, maxAngle: 60,
                    description: 'Tail — attaches to rear-top of body'
                },
                // Front left
                {
                    partKey: 'fl-upper', name: 'FL Upper Leg', icon: 'fa-bone',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.15, y: 0.9 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -45, maxAngle: 45,
                    description: 'Front left upper leg — attaches to front-bottom of body'
                },
                {
                    partKey: 'fl-lower', name: 'FL Lower Leg', icon: 'fa-bone',
                    parentPartKey: 'fl-upper',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -5, maxAngle: 90,
                    description: 'Front left lower leg — attaches to FL knee'
                },
                // Front right
                {
                    partKey: 'fr-upper', name: 'FR Upper Leg', icon: 'fa-bone',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.25, y: 0.9 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -45, maxAngle: 45,
                    description: 'Front right upper leg — front-bottom of body (behind FL)'
                },
                {
                    partKey: 'fr-lower', name: 'FR Lower Leg', icon: 'fa-bone',
                    parentPartKey: 'fr-upper',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -5, maxAngle: 90,
                    description: 'Front right lower leg — attaches to FR knee'
                },
                // Rear left
                {
                    partKey: 'rl-upper', name: 'RL Upper Leg', icon: 'fa-bone',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.8, y: 0.9 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -60, maxAngle: 30,
                    description: 'Rear left upper leg — attaches to rear-bottom of body'
                },
                {
                    partKey: 'rl-lower', name: 'RL Lower Leg', icon: 'fa-bone',
                    parentPartKey: 'rl-upper',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -90, maxAngle: 5,
                    description: 'Rear left lower leg — attaches to RL knee'
                },
                // Rear right
                {
                    partKey: 'rr-upper', name: 'RR Upper Leg', icon: 'fa-bone',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.9, y: 0.9 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -60, maxAngle: 30,
                    description: 'Rear right upper leg — rear-bottom (behind RL)'
                },
                {
                    partKey: 'rr-lower', name: 'RR Lower Leg', icon: 'fa-bone',
                    parentPartKey: 'rr-upper',
                    anchorOnParent: { x: 0.5, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -90, maxAngle: 5,
                    description: 'Rear right lower leg — attaches to RR knee'
                }
            ]
        };
    }

    // ═══════════════════════════════════════════
    //  BIRD
    // ═══════════════════════════════════════════
    static bird() {
        return {
            key: 'bird', name: 'Bird', icon: 'fa-dove',
            description: 'Bird: body, head, tail, two wings (upper+lower), two legs',
            parts: [
                {
                    partKey: 'body', name: 'Body', icon: 'fa-dove',
                    parentPartKey: null,
                    anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.5 },
                    defaultAngle: 0, minAngle: -15, maxAngle: 15,
                    description: 'Body — root'
                },
                {
                    partKey: 'head', name: 'Head', icon: 'fa-head-side',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.1, y: 0.2 },
                    pivotOnSelf: { x: 0.7, y: 0.8 },
                    defaultAngle: 0, minAngle: -30, maxAngle: 30,
                    description: 'Head+beak — attaches to front-top of body'
                },
                {
                    partKey: 'tail', name: 'Tail', icon: 'fa-feather',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 1.0, y: 0.4 },
                    pivotOnSelf: { x: 0.0, y: 0.5 },
                    defaultAngle: 0, minAngle: -30, maxAngle: 30,
                    description: 'Tail feathers — attaches to rear of body'
                },
                {
                    partKey: 'l-wing-upper', name: 'L Wing (Upper)', icon: 'fa-feather-alt',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.35, y: 0.1 },
                    pivotOnSelf: { x: 0.9, y: 0.5 },
                    defaultAngle: 0, minAngle: -80, maxAngle: 80,
                    description: 'Left upper wing — attaches to top-front of body'
                },
                {
                    partKey: 'l-wing-lower', name: 'L Wing (Lower)', icon: 'fa-feather',
                    parentPartKey: 'l-wing-upper',
                    anchorOnParent: { x: 0.0, y: 0.5 },
                    pivotOnSelf: { x: 1.0, y: 0.5 },
                    defaultAngle: 0, minAngle: -30, maxAngle: 90,
                    description: 'Left lower/tip wing — attaches to outer end of upper wing'
                },
                {
                    partKey: 'r-wing-upper', name: 'R Wing (Upper)', icon: 'fa-feather-alt',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.35, y: 0.9 },
                    pivotOnSelf: { x: 0.9, y: 0.5 },
                    defaultAngle: 0, minAngle: -80, maxAngle: 80,
                    description: 'Right upper wing — attaches to bottom-front of body'
                },
                {
                    partKey: 'r-wing-lower', name: 'R Wing (Lower)', icon: 'fa-feather',
                    parentPartKey: 'r-wing-upper',
                    anchorOnParent: { x: 0.0, y: 0.5 },
                    pivotOnSelf: { x: 1.0, y: 0.5 },
                    defaultAngle: 0, minAngle: -90, maxAngle: 30,
                    description: 'Right lower/tip wing — attaches to outer end of upper wing'
                },
                {
                    partKey: 'l-leg', name: 'L Leg', icon: 'fa-bone',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.55, y: 0.85 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -40, maxAngle: 40,
                    description: 'Left leg — attaches to lower body'
                },
                {
                    partKey: 'r-leg', name: 'R Leg', icon: 'fa-bone',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.65, y: 0.85 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -40, maxAngle: 40,
                    description: 'Right leg — attaches to lower body'
                }
            ]
        };
    }

    // ═══════════════════════════════════════════
    //  SPIDER
    // ═══════════════════════════════════════════
    static spider() {
        const legs = [];
        const legNames = ['Front','Mid-Front','Mid-Rear','Rear'];
        const xPositions = [0.15, 0.35, 0.6, 0.8];
        ['l','r'].forEach(side => {
            const yAnchor = side === 'l' ? 0.0 : 1.0;
            legNames.forEach((ln, i) => {
                legs.push({
                    partKey: `${side}-${ln.toLowerCase().replace(/[- ]/g,'')}-leg`,
                    name: `${side.toUpperCase()} ${ln} Leg`,
                    icon: 'fa-spider',
                    parentPartKey: 'body',
                    anchorOnParent: { x: xPositions[i], y: yAnchor },
                    pivotOnSelf: { x: side === 'l' ? 1.0 : 0.0, y: 0.5 },
                    defaultAngle: 0, minAngle: -50, maxAngle: 50,
                    description: `${side.toUpperCase()} ${ln} leg — radiates from body`
                });
            });
        });
        return {
            key: 'spider', name: 'Spider', icon: 'fa-spider',
            description: 'Spider: body, 8 radial legs (top-down view)',
            parts: [
                {
                    partKey: 'body', name: 'Body', icon: 'fa-circle',
                    parentPartKey: null,
                    anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.5 },
                    defaultAngle: 0, minAngle: -15, maxAngle: 15,
                    description: 'Central body — root'
                },
                ...legs
            ]
        };
    }

    // ═══════════════════════════════════════════
    //  FISH (side view)
    // ═══════════════════════════════════════════
    static fish() {
        return {
            key: 'fish', name: 'Fish', icon: 'fa-fish',
            description: 'Side-view fish: body, head/mouth, tail, fins',
            parts: [
                {
                    partKey: 'body', name: 'Body', icon: 'fa-fish',
                    parentPartKey: null,
                    anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.5 },
                    defaultAngle: 0, minAngle: -10, maxAngle: 10,
                    description: 'Fish body — root'
                },
                {
                    partKey: 'head', name: 'Head/Mouth', icon: 'fa-head-side',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.0, y: 0.5 },
                    pivotOnSelf: { x: 1.0, y: 0.5 },
                    defaultAngle: 0, minAngle: -15, maxAngle: 15,
                    description: 'Head — attaches to front of body'
                },
                {
                    partKey: 'tail', name: 'Tail Fin', icon: 'fa-wind',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 1.0, y: 0.5 },
                    pivotOnSelf: { x: 0.0, y: 0.5 },
                    defaultAngle: 0, minAngle: -40, maxAngle: 40,
                    description: 'Tail fin — attaches to rear of body'
                },
                {
                    partKey: 'dorsal', name: 'Dorsal Fin', icon: 'fa-caret-up',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.4, y: 0.0 },
                    pivotOnSelf: { x: 0.5, y: 1.0 },
                    defaultAngle: 0, minAngle: -15, maxAngle: 15,
                    description: 'Top fin — attaches to top of body'
                },
                {
                    partKey: 'pectoral', name: 'Pectoral Fin', icon: 'fa-fan',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.25, y: 0.75 },
                    pivotOnSelf: { x: 0.8, y: 0.2 },
                    defaultAngle: 0, minAngle: -30, maxAngle: 30,
                    description: 'Side fin — attaches near front-bottom of body'
                },
                {
                    partKey: 'ventral', name: 'Ventral Fin', icon: 'fa-caret-down',
                    parentPartKey: 'body',
                    anchorOnParent: { x: 0.55, y: 1.0 },
                    pivotOnSelf: { x: 0.5, y: 0.0 },
                    defaultAngle: 0, minAngle: -15, maxAngle: 15,
                    description: 'Bottom fin — attaches to underside of body'
                }
            ]
        };
    }
}

const HUMAN_FRONT_STATIC_POSES = [
    {
        id: 'builtin-human-front-confident',
        name: 'Confident',
        category: 'Idle & Standing',
        icon: 'fa-user',
        description: 'Hands-on-hips stance with the elbows flared outward.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 54, 'r-forearm': -116, 'r-hand': -18,
            'l-upper-arm': -54, 'l-forearm': 116, 'l-hand': 18
        },
        contacts: {
            'r-hand': { tag: 'r-waist', offsetX: -14, offsetY: 6, iterations: 11 },
            'l-hand': { tag: 'l-waist', offsetX: 14, offsetY: 6, iterations: 11 }
        },
        frontViewLayerOverride: ['torso', 'head-neck', 'right-leg', 'left-leg', 'left-arm', 'right-arm'],
        agbadaArmLayerMode: 'respect-arm-order'
    },
    {
        id: 'builtin-human-front-crossed-arms',
        name: 'Crossed Arms',
        category: 'Idle & Standing',
        icon: 'fa-times',
        description: 'Arms folded sharply across the chest in a tough waiting pose.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 45, 'r-forearm': -130,
            'l-upper-arm': -45, 'l-forearm': 130
        },
        frontViewLayerOverride: ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'],
        layerOrderOverride: ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'],
        agbadaArmLayerMode: 'respect-arm-order'
    },
    {
        id: 'builtin-human-front-sad-exhausted',
        name: 'Sad / Exhausted',
        category: 'Idle & Standing',
        icon: 'fa-frown',
        description: 'Head tilts and the arms dangle low in a slouched pose.',
        presetKey: 'human-front',
        angles: {
            'head': -15,
            'r-upper-arm': 10, 'r-forearm': 5,
            'l-upper-arm': -10, 'l-forearm': -5
        }
    },
    {
        id: 'builtin-human-front-friendly-wave',
        name: 'Friendly Wave',
        category: 'Expressions & Communication',
        icon: 'fa-hand-peace',
        description: 'Right arm lifted into a friendly greeting pose.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 104, 'r-forearm': 34, 'r-hand': 18,
            'l-upper-arm': -15, 'l-forearm': -10
        },
        contacts: {
            'r-hand': { tag: 'r-ear', offsetX: -18, offsetY: 10, iterations: 10 }
        }
    },
    {
        id: 'builtin-human-front-handshake-front-spec',
        name: 'Handshake (Front View - Spec)',
        category: 'Social',
        icon: 'fa-handshake',
        description: 'Front-view handshake pose with active right arm and idle left arm, using exact provided values.',
        presetKey: 'human-front',
        angles: {
            torso: 0,
            head: 0,
            'r-upper-arm': 23,
            'r-forearm': 0,
            'r-hand': 0,
            'l-upper-arm': 0,
            'l-forearm': 0,
            'l-hand': 0
        },
        tilts: {
            'r-upper-arm': { x: 43 },
            'l-upper-arm': { x: 0 }
        }
    },
    {
        id: 'builtin-human-front-squat-front-spec',
        name: 'Squat (Front View - Spec)',
        category: 'Fitness',
        icon: 'fa-dumbbell',
        description: 'Front-view squat preset for universal-character pose armature.',
        presetKey: 'human-front',
        dy: 110,
        angles: {
            torso: 0,
            head: 0,
            'r-upper-arm': 90, 'r-forearm': 0, 'r-hand': 4,
            'l-upper-arm': -90, 'l-forearm': 0, 'l-hand': -4,
            'r-upper-leg': 84, 'r-lower-leg': -88, 'r-foot': 0,
            'l-upper-leg': -84, 'l-lower-leg': 88, 'l-foot': 0
        }
    },
    {
        id: 'builtin-human-front-pointing-accusing',
        name: 'Pointing / Accusing',
        category: 'Expressions & Communication',
        icon: 'fa-hand-point-right',
        description: 'Right arm straight out while the left arm braces on the hip.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 90, 'r-forearm': 0,
            'l-upper-arm': -49, 'l-forearm': 107
        }
    },
    {
        id: 'builtin-human-front-shocked-cheeks',
        name: 'Shocked / Hands on Cheeks',
        category: 'Expressions & Communication',
        icon: 'fa-exclamation-circle',
        description: 'Both hands reach forward to the cheeks while the elbows stay below the shoulders.',
        presetKey: 'human-front',
        angles: {
            'head': 0,
            'r-upper-arm': 10, 'r-forearm': 125, 'r-hand': 0,
            'l-upper-arm': -10, 'l-forearm': -125, 'l-hand': 0
        },
        contacts: {
            'r-hand': { tag: 'r-cheek', offsetX: -6, offsetY: 24, iterations: 12 },
            'l-hand': { tag: 'l-cheek', offsetX: 6, offsetY: 24, iterations: 12 }
        }
    },
    {
        id: 'builtin-human-front-thinking-chin',
        name: 'Thinking / Scratching Chin',
        category: 'Expressions & Communication',
        icon: 'fa-brain',
        description: 'Right forearm lifts toward the chin with the elbow low and the shoulder reaching forward.',
        presetKey: 'human-front',
        angles: {
            'head': -10,
            'r-upper-arm': 10, 'r-forearm': 125, 'r-hand': 0,
            'l-upper-arm': 0, 'l-forearm': 0
        },
        contacts: {
            'r-hand': { tag: 'jaw', offsetX: -6, offsetY: 18, iterations: 12 }
        }
    },
    {
        id: 'builtin-human-front-boxing-guard',
        name: 'Boxing Guard / Defense',
        category: 'Action & Combat',
        icon: 'fa-shield-alt',
        description: 'Wide defensive stance with both forearms guarding the face.',
        presetKey: 'human-front',
        angles: {
            'r-upper-leg': 10, 'r-lower-leg': -8, 'r-foot': -6,
            'l-upper-leg': -10, 'l-lower-leg': 8, 'l-foot': 6,
            'r-upper-arm': 34, 'r-forearm': -118, 'r-hand': -10,
            'l-upper-arm': -34, 'l-forearm': 118, 'l-hand': 10
        },
        contacts: {
            'r-hand': { tag: 'r-cheek', offsetX: -10, offsetY: 6, iterations: 10 },
            'l-hand': { tag: 'l-cheek', offsetX: 10, offsetY: 6, iterations: 10 }
        }
    },
    {
        id: 'builtin-human-front-power-punch',
        name: 'Power Punch (Right Hook)',
        category: 'Action & Combat',
        icon: 'fa-fist-raised',
        description: 'Right hook follow-through across the chest with the left arm guarding.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': -80, 'r-forearm': 0,
            'l-upper-arm': -70, 'l-forearm': 140,
            'r-upper-leg': 20, 'r-lower-leg': -10
        }
    },
    {
        id: 'builtin-human-front-star-jump',
        name: 'Star Jump (Mid-Air)',
        category: 'Action & Combat',
        icon: 'fa-star',
        description: 'Mid-air spread with arms high and legs split wide.',
        presetKey: 'human-front',
        dy: -70,
        angles: {
            'r-upper-arm': 175, 'l-upper-arm': -175,
            'r-upper-leg': 45, 'r-lower-leg': -15, 'r-foot': 25,
            'l-upper-leg': -45, 'l-lower-leg': 15, 'l-foot': -25
        }
    },
    {
        id: 'builtin-human-front-walk-right-contact',
        name: 'Walk: Right Foot Forward',
        category: 'Locomotion',
        icon: 'fa-shoe-prints',
        description: 'Front-view walk contact pose with the right foot leading.',
        presetKey: 'human-front',
        angles: {
            'r-upper-leg': 15, 'r-lower-leg': 0, 'r-foot': -10,
            'l-upper-leg': -5, 'l-lower-leg': 0,
            'r-upper-arm': 10,
            'l-upper-arm': -35, 'l-forearm': -15
        }
    },
    {
        id: 'builtin-human-front-walk-left-contact',
        name: 'Walk: Left Foot Forward',
        category: 'Locomotion',
        icon: 'fa-shoe-prints',
        description: 'Front-view walk contact pose with the left foot leading.',
        presetKey: 'human-front',
        angles: {
            'l-upper-leg': -15, 'l-lower-leg': 0, 'l-foot': 10,
            'r-upper-leg': 5, 'r-lower-leg': 0,
            'l-upper-arm': -10,
            'r-upper-arm': 35, 'r-forearm': 15
        }
    },
    {
        id: 'builtin-human-front-neutral-a-pose',
        name: 'Neutral (A-Pose)',
        category: 'Idle & Standing',
        icon: 'fa-person',
        description: 'Balanced front-facing A-pose with the limbs opened slightly away from the body.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 5,
            'l-upper-arm': -5,
            'r-upper-leg': 3,
            'l-upper-leg': -3
        }
    },
    {
        id: 'builtin-human-front-wide-stance',
        name: 'Wide Stance',
        category: 'Idle & Standing',
        icon: 'fa-person',
        description: 'Broader planted stance with both legs opened outward and the arms slightly flared.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 10,
            'l-upper-arm': -10,
            'r-upper-leg': 15,
            'l-upper-leg': -15
        }
    },
    {
        id: 'builtin-human-front-jumping-jack-up',
        name: 'Jumping Jack (Up)',
        category: 'Action & Combat',
        icon: 'fa-child-reaching',
        description: 'Open jumping-jack peak pose with raised arms, wide legs, and lifted body.',
        presetKey: 'human-front',
        dy: -48,
        angles: {
            'r-upper-arm': 150,
            'l-upper-arm': -150,
            'r-upper-leg': 25,
            'l-upper-leg': -25
        }
    },
    {
        id: 'builtin-human-front-t-pose',
        name: 'T-Pose',
        category: 'Idle & Standing',
        icon: 'fa-person-rays',
        description: 'Reference T-pose with both arms fully horizontal.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 90,
            'l-upper-arm': -90
        }
    },
    {
        id: 'builtin-human-front-victory',
        name: 'Victory',
        category: 'Expressions & Communication',
        icon: 'fa-trophy',
        description: 'Raised-arm victory pose with a slight lateral body lean and a small hop.',
        presetKey: 'human-front',
        dy: -18,
        angles: {
            'torso': -5,
            'head': -10,
            'r-upper-arm': 160,
            'l-upper-arm': -160,
            'r-upper-leg': 10,
            'l-upper-leg': -10
        }
    },
    {
        id: 'builtin-human-front-guided-ready-neutral',
        name: 'Guided Ready (Neutral)',
        category: 'Idle & Standing',
        icon: 'fa-shield-alt',
        description: 'Compact balanced guard stance optimized for guided-motion front assemblies.',
        presetKey: 'human-front',
        angles: {
            'torso': 2,
            'head': -2,
            'r-upper-arm': 18, 'r-forearm': -32,
            'l-upper-arm': -18, 'l-forearm': 32,
            'r-upper-leg': 8,
            'l-upper-leg': -8
        }
    },
    {
        id: 'builtin-human-front-guided-step-contact-r',
        name: 'Guided Step Contact (Right)',
        category: 'Locomotion',
        icon: 'fa-shoe-prints',
        description: 'Front step contact with the character right leg leading and natural arm counter-swing.',
        presetKey: 'human-front',
        angles: {
            'torso': 2,
            'r-upper-leg': 20, 'r-lower-leg': -12, 'r-foot': 8,
            'l-upper-leg': -8, 'l-lower-leg': -6,
            'r-upper-arm': -10, 'r-forearm': 12,
            'l-upper-arm': 14, 'l-forearm': -10
        }
    },
    {
        id: 'builtin-human-front-guided-step-contact-l',
        name: 'Guided Step Contact (Left)',
        category: 'Locomotion',
        icon: 'fa-shoe-prints',
        description: 'Front step contact with the character left leg leading and mirrored arm counter-swing.',
        presetKey: 'human-front',
        angles: {
            'torso': -2,
            'l-upper-leg': -20, 'l-lower-leg': 12, 'l-foot': -8,
            'r-upper-leg': 8, 'r-lower-leg': 6,
            'l-upper-arm': 10, 'l-forearm': -12,
            'r-upper-arm': -14, 'r-forearm': 10
        }
    },
    {
        id: 'builtin-human-front-guided-jab-ready',
        name: 'Guided Jab Ready',
        category: 'Action & Combat',
        icon: 'fa-fist-raised',
        description: 'Lead hand retracts while strike hand is loaded for a fast front jab.',
        presetKey: 'human-front',
        angles: {
            'torso': -4,
            'r-upper-arm': 24, 'r-forearm': -92,
            'l-upper-arm': -22, 'l-forearm': 86,
            'r-upper-leg': 10,
            'l-upper-leg': -10
        }
    },
    {
        id: 'builtin-human-front-guided-jab-impact',
        name: 'Guided Jab Impact',
        category: 'Action & Combat',
        icon: 'fa-fist-raised',
        description: 'Impact key pose with torso drive and forward extension of the strike arm.',
        presetKey: 'human-front',
        angles: {
            'torso': 6,
            'r-upper-arm': 6, 'r-forearm': -6, 'r-hand': 0,
            'l-upper-arm': -24, 'l-forearm': 90,
            'r-upper-leg': 12,
            'l-upper-leg': -8
        }
    },
    {
        id: 'builtin-human-front-look-up-subtle',
        name: 'Look Up (Subtle)',
        category: '3D Simulation',
        icon: 'fa-eye',
        description: 'Subtle upward look driven by head pitch instead of strong body rotation.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 5,
            'l-upper-arm': -5,
            'r-upper-leg': 3,
            'l-upper-leg': -3
        },
        tilts: {
            'head': { x: -15 }
        }
    },
    {
        id: 'builtin-human-front-look-down-subtle',
        name: 'Look Down (Subtle)',
        category: '3D Simulation',
        icon: 'fa-eye-low-vision',
        description: 'Subtle downward look driven by head pitch.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 5,
            'l-upper-arm': -5,
            'r-upper-leg': 3,
            'l-upper-leg': -3
        },
        tilts: {
            'head': { x: 15 }
        }
    },
    {
        id: 'builtin-human-front-look-left-3d',
        name: 'Look Left (3D)',
        category: '3D Simulation',
        icon: 'fa-eye',
        description: 'Subtle head yaw to the character left for a front-view 3D cheat.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 5,
            'l-upper-arm': -5,
            'r-upper-leg': 3,
            'l-upper-leg': -3
        },
        tilts: {
            'head': { y: -20 }
        }
    },
    {
        id: 'builtin-human-front-look-right-3d',
        name: 'Look Right (3D)',
        category: '3D Simulation',
        icon: 'fa-eye',
        description: 'Subtle head yaw to the character right for a front-view 3D cheat.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 5,
            'l-upper-arm': -5,
            'r-upper-leg': 3,
            'l-upper-leg': -3
        },
        tilts: {
            'head': { y: 20 }
        }
    },
    {
        id: 'builtin-human-front-stride-forward-tilt',
        name: 'Stride Forward (Tilt)',
        category: '3D Simulation',
        icon: 'fa-person-walking',
        description: 'Mid-walk contact pose using Tilt X to push the right leg toward the camera and the left leg behind, with opposing arm swing.',
        presetKey: 'human-front',
        angles: {
            'torso': 2, 'head': -2,
            'l-upper-arm': 4, 'r-upper-arm': -4
        },
        tilts: {
            'r-upper-leg': { x: 28 }, 'r-lower-leg': { x: 18 }, 'r-foot': { x: 10 },
            'l-upper-leg': { x: -22 }, 'l-lower-leg': { x: -10 }, 'l-foot': { x: -6 },
            'l-upper-arm': { x: 26 }, 'l-forearm': { x: 14 },
            'r-upper-arm': { x: -22 }, 'r-forearm': { x: -10 }
        }
    },
    {
        id: 'builtin-human-front-jab-tilt',
        name: 'Front Jab (Tilt)',
        category: '3D Simulation',
        icon: 'fa-fist-raised',
        description: 'Right arm extended forward in a jab — elbow nearly straight (Z) and the whole arm chain foreshortened toward the camera via Tilt X. Left arm guards.',
        presetKey: 'human-front',
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
    },
    {
        id: 'builtin-human-front-front-kick-tilt',
        name: 'Front Kick (Tilt)',
        category: '3D Simulation',
        icon: 'fa-shoe-prints',
        description: 'Right leg lifted forward with knee nearly straight (Z) and foreshortened toward the camera via Tilt X — reads as a kick at the viewer rather than a sideways high-step.',
        presetKey: 'human-front',
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
    },
    {
        id: 'builtin-human-front-reach-forward-tilt',
        name: 'Reach Forward (Tilt)',
        category: '3D Simulation',
        icon: 'fa-hand-point-up',
        description: 'Both arms reach toward the camera via Tilt X, with a small forward torso lean. Useful as a pickup or grab pose.',
        presetKey: 'human-front',
        angles: {
            'r-upper-arm': 4, 'r-forearm': -8,
            'l-upper-arm': -4, 'l-forearm': 8,
            'torso': 0
        },
        tilts: {
            'r-upper-arm': { x: 32 }, 'r-forearm': { x: 26 }, 'r-hand': { x: 14 },
            'l-upper-arm': { x: 32 }, 'l-forearm': { x: 26 }, 'l-hand': { x: 14 },
            'torso': { x: -8 }, 'head': { x: -4 }
        }
    },
    {
        id: 'builtin-human-front-breathe-in-tilt',
        name: 'Breathe In (Tilt)',
        category: '3D Simulation',
        icon: 'fa-lungs',
        description: 'Chest-rise inhale pose driven by Tilt Y on torso and neck. Head tilts slightly back via Tilt X — no sideways head turn.',
        presetKey: 'human-front',
        angles: {},
        tilts: {
            'torso': { y: -5 }, 'neck': { y: -3 }, 'head': { x: -3 },
            'l-upper-arm': { y: 3 }, 'r-upper-arm': { y: -3 }
        }
    },
    {
        id: 'builtin-human-front-holding-baby',
        name: 'Holding Baby',
        category: 'Care & Nurture',
        icon: 'fa-baby',
        description: 'Cradling a baby close to the chest with both arms rounded inward.',
        presetKey: 'human-front',
        angles: {
            'torso': 4,
            'head': -8,
            'r-upper-arm': 44, 'r-forearm': -98, 'r-hand': -10,
            'l-upper-arm': -44, 'l-forearm': 98, 'l-hand': 10
        },
        contacts: {
            'r-hand': { tag: 'sternum', offsetX: -10, offsetY: 18, iterations: 10 },
            'l-hand': { tag: 'sternum', offsetX: 10, offsetY: 18, iterations: 10 }
        }
    },
    {
        id: 'builtin-human-front-carry-bag',
        name: 'Carry Bag',
        category: 'Object Interaction',
        icon: 'fa-bag-shopping',
        description: 'Casual one-handed carry pose with the bag hanging at the side.',
        presetKey: 'human-front',
        angles: {
            'torso': 2,
            'head': 0,
            'r-upper-arm': 16, 'r-forearm': -14, 'r-hand': 6,
            'l-upper-arm': -4, 'l-forearm': 2, 'l-hand': 0,
            'r-upper-leg': 4, 'l-upper-leg': -4
        }
    },
    {
        id: 'builtin-human-front-taking-photo-selfie',
        name: 'Taking Photo / Selfie',
        category: 'Social',
        icon: 'fa-camera',
        description: 'Arm raised as if holding a phone or camera for a selfie, with a slight head tilt.',
        presetKey: 'human-front',
        angles: {
            'torso': -4,
            'head': -10,
            'r-upper-arm': 104, 'r-forearm': -6, 'r-hand': 8,
            'l-upper-arm': -8, 'l-forearm': 2, 'l-hand': 0
        }
    },
    {
        id: 'builtin-human-front-doctor-examining',
        name: 'Doctor / Nurse Examining',
        category: 'Work',
        icon: 'fa-user-doctor',
        description: 'Attentive examining pose with one hand forward and the other ready to note observations.',
        presetKey: 'human-front',
        angles: {
            'torso': 4,
            'head': -6,
            'r-upper-arm': 30, 'r-forearm': -60, 'r-hand': -4,
            'l-upper-arm': -6, 'l-forearm': 6, 'l-hand': 0
        }
    },
    {
        id: 'builtin-human-front-hug',
        name: 'Hug',
        category: 'Social',
        icon: 'fa-heart',
        description: 'Warm embrace pose with both arms wrapping inward around the chest.',
        presetKey: 'human-front',
        angles: {
            'torso': 6,
            'head': -8,
            'r-upper-arm': 60, 'r-forearm': 120, 'r-hand': 18,
            'l-upper-arm': -60, 'l-forearm': -120, 'l-hand': -18
        }
    },
    {
        id: 'builtin-human-front-carry-load-on-head',
        name: 'Carry Load on Head',
        category: 'Object Interaction',
        icon: 'fa-boxes-stacked',
        description: 'Balanced overhead carry pose with both hands supporting the load and elbows bent to guide it upward.',
        presetKey: 'human-front',
        angles: {
            'torso': -4,
            'head': 6,
            'r-upper-arm': 140, 'r-forearm': 70, 'r-hand': 0,
            'l-upper-arm': -140, 'l-forearm': -70, 'l-hand': 0
        },
        contacts: {
            'r-hand': { tag: 'head-top', offsetX: -10, offsetY: -8, iterations: 10, preserveBend: true },
            'l-hand': { tag: 'head-top', offsetX: 10, offsetY: -8, iterations: 10, preserveBend: true }
        }
    },
    {
        id: 'builtin-human-front-market-vendor',
        name: 'Market / Vendor',
        category: 'Work',
        icon: 'fa-store',
        description: 'Friendly sales pose with one hand presenting and the other resting ready to gesture again.',
        presetKey: 'human-front',
        angles: {
            'torso': 2,
            'head': -2,
            'r-upper-arm': 36, 'r-forearm': -34, 'r-hand': 6,
            'l-upper-arm': -6, 'l-forearm': 4, 'l-hand': 0
        }
    },
    {
        id: 'builtin-human-front-sweep',
        name: 'Sweep',
        category: 'Domestic',
        icon: 'fa-broom',
        description: 'Forward-bent sweeping pose with the sweeping arm working low and the torso leaning into the stroke.',
        presetKey: 'human-front',
        angles: {
            'torso': 20,
            'head': -12,
            'r-upper-arm': 72, 'r-forearm': -52, 'r-hand': -10,
            'l-upper-arm': -52, 'l-forearm': 38, 'l-hand': 6,
            'r-upper-leg': 14, 'l-upper-leg': -10
        }
    },
    {
        id: 'builtin-human-front-mop',
        name: 'Mop',
        category: 'Domestic',
        icon: 'fa-hand-sparkles',
        description: 'Low two-handed mop push with a bent torso and both arms working the handle forward.',
        presetKey: 'human-front',
        angles: {
            'torso': 22,
            'head': -10,
            'r-upper-arm': 74, 'r-forearm': -54, 'r-hand': -8,
            'l-upper-arm': -70, 'l-forearm': 50, 'l-hand': 8,
            'r-upper-leg': 12, 'l-upper-leg': -12
        }
    },
    {
        id: 'builtin-human-front-wash-hands',
        name: 'Wash Hands',
        category: 'Domestic',
        icon: 'fa-hands-bubbles',
        description: 'Hands together in front of the torso for a washing or scrubbing action.',
        presetKey: 'human-front',
        angles: {
            'torso': 4,
            'head': -2,
            'r-upper-arm': 38, 'r-forearm': -92, 'r-hand': -8,
            'l-upper-arm': -38, 'l-forearm': 92, 'l-hand': 8
        }
    },
    {
        id: 'builtin-human-front-feed-child',
        name: 'Feed Child',
        category: 'Care & Nurture',
        icon: 'fa-child',
        description: 'Care pose with both hands cupped forward at chest height for feeding.',
        presetKey: 'human-front',
        angles: {
            'torso': 5,
            'head': -6,
            'r-upper-arm': 34, 'r-forearm': -88, 'r-hand': -10,
            'l-upper-arm': -26, 'l-forearm': 80, 'l-hand': 8
        }
    },
    {
        id: 'builtin-human-front-lift-child',
        name: 'Lift Child',
        category: 'Care & Nurture',
        icon: 'fa-child-reaching',
        description: 'Lifted-child support pose with both arms raised and the torso slightly braced.',
        presetKey: 'human-front',
        angles: {
            'torso': -4,
            'head': -8,
            'r-upper-arm': 64, 'r-forearm': -110, 'r-hand': 0,
            'l-upper-arm': -64, 'l-forearm': 110, 'l-hand': 0
        }
    },
    {
        id: 'builtin-human-front-assist-elderly',
        name: 'Assist Elderly',
        category: 'Care & Nurture',
        icon: 'fa-hands-helping',
        description: 'Supportive helping pose with one arm offering balance and the other steadying the posture.',
        presetKey: 'human-front',
        angles: {
            'torso': 5,
            'head': -8,
            'r-upper-arm': 24, 'r-forearm': -54, 'r-hand': -4,
            'l-upper-arm': -10, 'l-forearm': 10, 'l-hand': 0,
            'r-upper-leg': 6, 'l-upper-leg': -4
        }
    },
    {
        id: 'builtin-human-front-check-pulse',
        name: 'Check Pulse',
        category: 'Care & Nurture',
        icon: 'fa-heart-pulse',
        description: 'Medical check pose with one hand extended for a pulse or wrist check.',
        presetKey: 'human-front',
        angles: {
            'torso': 4,
            'head': -4,
            'r-upper-arm': 24, 'r-forearm': -78, 'r-hand': -10,
            'l-upper-arm': -10, 'l-forearm': 12, 'l-hand': 0
        }
    },
    {
        id: 'builtin-human-front-fold-clothes',
        name: 'Fold Clothes',
        category: 'Domestic',
        icon: 'fa-shirt',
        description: 'Folding pose with both hands working across a flat garment or cloth.',
        presetKey: 'human-front',
        angles: {
            'torso': 6,
            'head': -6,
            'r-upper-arm': 32, 'r-forearm': -78, 'r-hand': -6,
            'l-upper-arm': -30, 'l-forearm': 82, 'l-hand': 6
        }
    },
    {
        id: 'builtin-human-front-cook-stir-pot',
        name: 'Cook / Stir Pot',
        category: 'Domestic',
        icon: 'fa-utensils',
        description: 'Kitchen stirring pose with one hand active and the other steadying the pot.',
        presetKey: 'human-front',
        angles: {
            'torso': 5,
            'head': -4,
            'r-upper-arm': 20, 'r-forearm': -92, 'r-hand': -6,
            'l-upper-arm': -16, 'l-forearm': 18, 'l-hand': 2
        }
    },
    {
        id: 'builtin-human-front-argue',
        name: 'Argue',
        category: 'Social',
        icon: 'fa-comment-dots',
        description: 'Animated debate pose with one hand raised and the body leaning into the point.',
        presetKey: 'human-front',
        angles: {
            'torso': 8,
            'head': 4,
            'r-upper-arm': 52, 'r-forearm': 2, 'r-hand': 0,
            'l-upper-arm': -8, 'l-forearm': 4, 'l-hand': 0
        }
    },
    {
        id: 'builtin-human-front-panic',
        name: 'Panic',
        category: 'Emotion',
        icon: 'fa-triangle-exclamation',
        description: 'Startled panic pose with the arms thrown high and the torso recoiling from the sudden shock.',
        presetKey: 'human-front',
        angles: {
            'torso': -8,
            'head': -18,
            'r-upper-arm': 132, 'r-forearm': -18, 'r-hand': 6,
            'l-upper-arm': -132, 'l-forearm': 18, 'l-hand': -6
        }
    },
    {
        id: 'builtin-human-front-laugh',
        name: 'Laugh',
        category: 'Emotion',
        icon: 'fa-face-laugh',
        description: 'Relaxed laughing pose with the shoulders lifted and the head tipped back slightly.',
        presetKey: 'human-front',
        angles: {
            'torso': -4,
            'head': -10,
            'r-upper-arm': 24, 'r-forearm': -54, 'r-hand': 6,
            'l-upper-arm': -24, 'l-forearm': 54, 'l-hand': -6
        }
    },
    {
        id: 'builtin-human-front-cry',
        name: 'Cry',
        category: 'Emotion',
        icon: 'fa-face-sad-tear',
        description: 'Downcast crying pose with the head lowered and the arms softened in front.',
        presetKey: 'human-front',
        angles: {
            'torso': 10,
            'head': 24,
            'r-upper-arm': 18, 'r-forearm': -96, 'r-hand': -4,
            'l-upper-arm': -18, 'l-forearm': 96, 'l-hand': 4
        }
    },
    {
        id: 'builtin-human-front-climb-stairs',
        name: 'Climb Stairs',
        category: 'Locomotion',
        icon: 'fa-stairs',
        description: 'One-step climbing pose with a lifted knee and a slight upward body drive.',
        presetKey: 'human-front',
        angles: {
            'torso': 8,
            'head': -4,
            'r-upper-arm': 16, 'r-forearm': -12,
            'l-upper-arm': -20, 'l-forearm': 8,
            'r-upper-leg': 34, 'r-lower-leg': -48, 'r-foot': 8,
            'l-upper-leg': -4, 'l-lower-leg': 12
        }
    },
    {
        id: 'builtin-human-front-limp',
        name: 'Limp',
        category: 'Locomotion',
        icon: 'fa-person-walking',
        description: 'Uneven walking stance with one leg carrying less weight than the other.',
        presetKey: 'human-front',
        angles: {
            'torso': 6,
            'head': 0,
            'r-upper-arm': 22, 'r-forearm': -14,
            'l-upper-arm': -10, 'l-forearm': 8,
            'r-upper-leg': 20, 'r-lower-leg': -14,
            'l-upper-leg': -6, 'l-lower-leg': 8
        }
    },
    {
        id: 'builtin-human-front-tired-slump',
        name: 'Tired Slump',
        category: 'Resting',
        icon: 'fa-bed',
        description: 'Heavy slumped posture with drooping shoulders and a fatigued head tilt.',
        presetKey: 'human-front',
        angles: {
            'torso': 14,
            'head': 18,
            'r-upper-arm': 16, 'r-forearm': 24,
            'l-upper-arm': -16, 'l-forearm': -24
        }
    },
    {
        id: 'builtin-human-front-pick-from-shelf',
        name: 'Pick From Shelf',
        category: 'Object Interaction',
        icon: 'fa-box-open',
        description: 'Hold an object taken from a shelf with the other arm relaxed.',
        presetKey: 'human-front',
        angles: { torso: 0, head: 0, 'r-upper-arm': 15, 'r-forearm': -75, 'l-upper-arm': 0, 'l-forearm': 0 }
    },
    {
        id: 'builtin-human-front-push-cart',
        name: 'Push Cart',
        category: 'Object Interaction',
        icon: 'fa-cart-shopping',
        description: 'Forward push stance with both arms extended as if pushing a cart or trolley.',
        presetKey: 'human-front',
        angles: {
            'torso': 10,
            'head': -4,
            'r-upper-arm': 46, 'r-forearm': -34, 'r-hand': -8,
            'l-upper-arm': -46, 'l-forearm': 34, 'l-hand': 8
        }
    },
    {
        id: 'builtin-human-front-place-on-table',
        name: 'Place on Table',
        category: 'Object Interaction',
        icon: 'fa-table',
        description: 'Place a small object on a table with the other arm relaxed.',
        presetKey: 'human-front',
        angles: {
            torso: 0, head: 8,
            'r-upper-arm': 20, 'r-forearm': -65, 'r-hand': 0,
            'l-upper-arm': 0, 'l-forearm': 0, 'l-hand': 0
        }
    },
    {
        id: 'builtin-human-front-pull-suitcase',
        name: 'Pull Suitcase',
        category: 'Object Interaction',
        icon: 'fa-suitcase',
        description: 'Travel pose with one arm pulling back as if dragging a rolling suitcase.',
        presetKey: 'human-front',
        angles: {
            'torso': -6,
            'head': -2,
            'r-upper-arm': 16, 'r-forearm': -28, 'r-hand': -6,
            'l-upper-arm': -4, 'l-forearm': 2, 'l-hand': 0,
            'r-upper-leg': 4, 'l-upper-leg': -4
        }
    },
    {
        id: 'builtin-human-front-angry-stomp',
        name: 'Angry Stomp',
        category: 'Emotion',
        icon: 'fa-face-angry',
        description: 'Grounded angry stance with one foot ready to stomp and the arms held tight.',
        presetKey: 'human-front',
        angles: {
            'torso': 6,
            'head': 6,
            'r-upper-arm': 20, 'r-forearm': -20, 'r-hand': 0,
            'l-upper-arm': -20, 'l-forearm': 20, 'l-hand': 0,
            'r-upper-leg': 22, 'r-lower-leg': -34,
            'l-upper-leg': -10, 'l-lower-leg': 8
        }
    }
];

const BODY_TAG_CATEGORY_COLORS = {
    face: '#f59e0b',
    torso: '#10b981',
    limb: '#38bdf8',
    extremity: '#3b82f6',
    balance: '#a855f7',
    sensory: '#ef4444',
    spine: '#14b8a6',
    custom: '#e5e7eb',
    body: '#94a3b8'
};

const BODY_TAG_PRESETS = [
    {
        key: 'human-front',
        name: 'Human Front',
        description: 'Detailed front-facing human landmark set for facial features, torso landmarks, hands, and feet.',
        tags: [
            { key: 'head-top', name: 'Head Top', category: 'face', partKey: 'head', x: 0.50, y: 0.02 },
            { key: 'forehead', name: 'Forehead', category: 'face', partKey: 'head', x: 0.50, y: 0.18 },
            { key: 'l-eyebrow', name: 'L Eyebrow', category: 'face', partKey: 'head', x: 0.73, y: 0.26 },
            { key: 'r-eyebrow', name: 'R Eyebrow', category: 'face', partKey: 'head', x: 0.26, y: 0.26 },
            { key: 'l-eye', name: 'L Eye', category: 'face', partKey: 'head', x: 0.70, y: 0.36 },
            { key: 'r-eye', name: 'R Eye', category: 'face', partKey: 'head', x: 0.28, y: 0.37 },
            { key: 'nose', name: 'Nose', category: 'face', partKey: 'head', x: 0.49, y: 0.45 },
            { key: 'mouth', name: 'Mouth', category: 'face', partKey: 'head', x: 0.49, y: 0.59 },
            { key: 'jaw', name: 'Jaw', category: 'face', partKey: 'head', x: 0.51, y: 0.73 },
            { key: 'l-cheek', name: 'L Cheek', category: 'face', partKey: 'head', x: 0.75, y: 0.57 },
            { key: 'r-cheek', name: 'R Cheek', category: 'face', partKey: 'head', x: 0.26, y: 0.55 },
            { key: 'l-ear', name: 'L Ear', category: 'face', partKey: 'head', x: 0.92, y: 0.43 },
            { key: 'r-ear', name: 'R Ear', category: 'face', partKey: 'head', x: 0.08, y: 0.40 },
            { key: 'sternum', name: 'Sternum', category: 'torso', partKey: 'torso', x: 0.50, y: 0.18 },
            { key: 'l-nipple-area', name: 'L Nipple Area', category: 'torso', partKey: 'torso', x: 0.62, y: 0.28 },
            { key: 'r-nipple-area', name: 'R Nipple Area', category: 'torso', partKey: 'torso', x: 0.38, y: 0.28 },
            { key: 'umbilical-area', name: 'Umbilical Area', category: 'torso', partKey: 'torso', x: 0.50, y: 0.62 },
            { key: 'l-waist', name: 'L Waist', category: 'torso', partKey: 'torso', x: 0.74, y: 0.72 },
            { key: 'r-waist', name: 'R Waist', category: 'torso', partKey: 'torso', x: 0.26, y: 0.72 },
            { key: 'l-armpit', name: 'L Armpit', category: 'torso', partKey: 'torso', x: 0.86, y: 0.22 },
            { key: 'r-armpit', name: 'R Armpit', category: 'torso', partKey: 'torso', x: 0.14, y: 0.22 },
            { key: 'l-hip-side', name: 'L Hip Side', category: 'torso', partKey: 'torso', x: 0.72, y: 0.95 },
            { key: 'r-hip-side', name: 'R Hip Side', category: 'torso', partKey: 'torso', x: 0.28, y: 0.95 },
            { key: 'between-legs', name: 'Between Legs', category: 'balance', partKey: 'torso', x: 0.50, y: 0.99 },
            { key: 'l-fingertips', name: 'L Fingertips', category: 'extremity', partKey: 'l-hand', x: 0.50, y: 0.96 },
            { key: 'r-fingertips', name: 'R Fingertips', category: 'extremity', partKey: 'r-hand', x: 0.50, y: 0.96 },
            { key: 'l-toes', name: 'L Toes', category: 'extremity', partKey: 'l-foot', x: 0.52, y: 0.96 },
            { key: 'r-toes', name: 'R Toes', category: 'extremity', partKey: 'r-foot', x: 0.48, y: 0.96 }
        ]
    },
    {
        key: 'human-side',
        name: 'Human Side',
        description: 'Side-view human landmarks for facial profile, torso, hand, and foot contact points.',
        tags: [
            { key: 'head-top', name: 'Head Top', category: 'face', partKey: 'head', x: 0.54, y: 0.04 },
            { key: 'forehead', name: 'Forehead', category: 'face', partKey: 'head', x: 0.36, y: 0.20 },
            { key: 'eye', name: 'Eye', category: 'face', partKey: 'head', x: 0.38, y: 0.36 },
            { key: 'ear', name: 'Ear', category: 'face', partKey: 'head', x: 0.74, y: 0.42 },
            { key: 'nose-tip', name: 'Nose Tip', category: 'face', partKey: 'head', x: 0.12, y: 0.48 },
            { key: 'mouth', name: 'Mouth', category: 'face', partKey: 'head', x: 0.18, y: 0.66 },
            { key: 'jaw', name: 'Jaw', category: 'face', partKey: 'head', x: 0.36, y: 0.86 },
            { key: 'sternum', name: 'Sternum', category: 'torso', partKey: 'torso', x: 0.42, y: 0.24 },
            { key: 'waist', name: 'Waist', category: 'torso', partKey: 'torso', x: 0.46, y: 0.70 },
            { key: 'hip', name: 'Hip', category: 'torso', partKey: 'torso', x: 0.56, y: 0.96 },
            { key: 'fingertips', name: 'Fingertips', category: 'extremity', partKey: 'hand', x: 0.52, y: 0.96 },
            { key: 'toes', name: 'Toes', category: 'extremity', partKey: 'foot', x: 0.84, y: 0.92 },
            { key: 'heel', name: 'Heel', category: 'extremity', partKey: 'foot', x: 0.18, y: 0.88 }
        ]
    },
    {
        key: 'quadruped',
        name: 'Quadruped',
        description: 'Core animal landmarks for head, spine, chest, belly, tail base, and paws.',
        tags: [
            { key: 'snout-tip', name: 'Snout Tip', category: 'face', partKey: 'head', x: 0.06, y: 0.54 },
            { key: 'eye', name: 'Eye', category: 'face', partKey: 'head', x: 0.42, y: 0.34 },
            { key: 'ear-base', name: 'Ear Base', category: 'face', partKey: 'head', x: 0.62, y: 0.14 },
            { key: 'withers', name: 'Withers', category: 'spine', partKey: 'body', x: 0.24, y: 0.10 },
            { key: 'spine-mid', name: 'Spine Mid', category: 'spine', partKey: 'body', x: 0.52, y: 0.14 },
            { key: 'chest', name: 'Chest', category: 'torso', partKey: 'body', x: 0.18, y: 0.56 },
            { key: 'belly', name: 'Belly', category: 'torso', partKey: 'body', x: 0.54, y: 0.82 },
            { key: 'hip', name: 'Hip', category: 'torso', partKey: 'body', x: 0.80, y: 0.54 },
            { key: 'tail-base', name: 'Tail Base', category: 'balance', partKey: 'tail', x: 0.06, y: 0.50 },
            { key: 'front-left-paw', name: 'Front Left Paw', category: 'extremity', partKey: 'fl-lower', x: 0.50, y: 0.96 },
            { key: 'front-right-paw', name: 'Front Right Paw', category: 'extremity', partKey: 'fr-lower', x: 0.50, y: 0.96 },
            { key: 'rear-left-paw', name: 'Rear Left Paw', category: 'extremity', partKey: 'rl-lower', x: 0.50, y: 0.96 },
            { key: 'rear-right-paw', name: 'Rear Right Paw', category: 'extremity', partKey: 'rr-lower', x: 0.50, y: 0.96 }
        ]
    },
    {
        key: 'bird',
        name: 'Bird',
        description: 'Bird landmarks for beak, eye, chest, body center, tail, wing tips, and feet.',
        tags: [
            { key: 'beak-tip', name: 'Beak Tip', category: 'face', partKey: 'head', x: 0.08, y: 0.46 },
            { key: 'eye', name: 'Eye', category: 'face', partKey: 'head', x: 0.36, y: 0.34 },
            { key: 'crown', name: 'Crown', category: 'face', partKey: 'head', x: 0.50, y: 0.08 },
            { key: 'chest', name: 'Chest', category: 'torso', partKey: 'body', x: 0.28, y: 0.46 },
            { key: 'body-center', name: 'Body Center', category: 'torso', partKey: 'body', x: 0.50, y: 0.52 },
            { key: 'tail-tip', name: 'Tail Tip', category: 'balance', partKey: 'tail', x: 0.96, y: 0.50 },
            { key: 'l-wing-tip', name: 'L Wing Tip', category: 'limb', partKey: 'l-wing-lower', x: 0.06, y: 0.50 },
            { key: 'r-wing-tip', name: 'R Wing Tip', category: 'limb', partKey: 'r-wing-lower', x: 0.06, y: 0.50 },
            { key: 'l-foot', name: 'L Foot', category: 'extremity', partKey: 'l-leg', x: 0.50, y: 0.96 },
            { key: 'r-foot', name: 'R Foot', category: 'extremity', partKey: 'r-leg', x: 0.50, y: 0.96 }
        ]
    },
    {
        key: 'fish',
        name: 'Fish',
        description: 'Fish landmarks for snout, eye, gill, dorsal, pectoral, and tail reference points.',
        tags: [
            { key: 'snout-tip', name: 'Snout Tip', category: 'face', partKey: 'head', x: 0.04, y: 0.52 },
            { key: 'eye', name: 'Eye', category: 'face', partKey: 'head', x: 0.40, y: 0.36 },
            { key: 'gill', name: 'Gill', category: 'face', partKey: 'body', x: 0.18, y: 0.52 },
            { key: 'body-center', name: 'Body Center', category: 'torso', partKey: 'body', x: 0.50, y: 0.52 },
            { key: 'dorsal-base', name: 'Dorsal Base', category: 'spine', partKey: 'dorsal', x: 0.50, y: 0.80 },
            { key: 'pectoral-base', name: 'Pectoral Base', category: 'limb', partKey: 'pectoral', x: 0.82, y: 0.20 },
            { key: 'ventral-base', name: 'Ventral Base', category: 'limb', partKey: 'ventral', x: 0.50, y: 0.10 },
            { key: 'tail-tip', name: 'Tail Tip', category: 'balance', partKey: 'tail', x: 0.98, y: 0.50 }
        ]
    },
    {
        key: 'spider',
        name: 'Spider',
        description: 'Spider landmarks for eye cluster, cephalothorax, abdomen, spinnerets, and front/rear leg tips.',
        tags: [
            { key: 'eye-cluster', name: 'Eye Cluster', category: 'face', partKey: 'body', x: 0.24, y: 0.34 },
            { key: 'cephalothorax', name: 'Cephalothorax', category: 'torso', partKey: 'body', x: 0.34, y: 0.44 },
            { key: 'abdomen-center', name: 'Abdomen Center', category: 'torso', partKey: 'body', x: 0.66, y: 0.50 },
            { key: 'spinnerets', name: 'Spinnerets', category: 'balance', partKey: 'body', x: 0.92, y: 0.54 },
            { key: 'l-front-tip', name: 'L Front Leg Tip', category: 'extremity', partKey: 'l-front-leg', x: 0.08, y: 0.50 },
            { key: 'r-front-tip', name: 'R Front Leg Tip', category: 'extremity', partKey: 'r-front-leg', x: 0.08, y: 0.50 },
            { key: 'l-rear-tip', name: 'L Rear Leg Tip', category: 'extremity', partKey: 'l-rear-leg', x: 0.08, y: 0.50 },
            { key: 'r-rear-tip', name: 'R Rear Leg Tip', category: 'extremity', partKey: 'r-rear-leg', x: 0.08, y: 0.50 }
        ]
    },
    {
        key: 'generic-character',
        name: 'Generic Character',
        description: 'Fallback landmark set for custom characters when no preset-specific template is available.',
        tags: [
            { key: 'head-center', name: 'Head Center', category: 'face', partKey: 'head', x: 0.50, y: 0.50 },
            { key: 'body-center', name: 'Body Center', category: 'torso', partKey: 'torso', x: 0.50, y: 0.50 },
            { key: 'left-contact', name: 'Left Contact', category: 'extremity', partKey: 'l-hand', x: 0.50, y: 0.96 },
            { key: 'right-contact', name: 'Right Contact', category: 'extremity', partKey: 'r-hand', x: 0.50, y: 0.96 },
            { key: 'ground-left', name: 'Ground Left', category: 'balance', partKey: 'l-foot', x: 0.50, y: 0.96 },
            { key: 'ground-right', name: 'Ground Right', category: 'balance', partKey: 'r-foot', x: 0.50, y: 0.96 }
        ]
    }
];


// ─────────────────────────────────────────────────────
//  JOINT MOVEMENTS — pre-built rotation animations
//  Uses joint rotation angles (not delta offsets)
// ─────────────────────────────────────────────────────
