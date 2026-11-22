/*
 * Premium African/Nigerian SVG character assets.
 * Authored six-part artwork that plugs into the existing Pose Armature.
 */
(function () {
    'use strict';

    const DEFAULT_ASSET_ID = 'ada-lecturer-front';
    const PART_KEYS = Object.freeze(['torso', 'head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg']);
    const SIDE_PART_KEYS = Object.freeze(['torso', 'head-neck', 'front-arm', 'back-arm', 'front-leg', 'back-leg']);
    const DEFAULT_SOURCE_PATH = 'assets/svg-characters/ada-lecturer/front';
    const SVG_OUTPUT_SCALE = 4;
    const PART_FILE_MAP = Object.freeze({
        torso: 'torso.svg',
        'head-neck': 'head-neck.svg',
        'right-arm': 'right-arm.svg',
        'left-arm': 'left-arm.svg',
        'right-leg': 'right-leg.svg',
        'left-leg': 'left-leg.svg'
    });
    const SIDE_PART_FILE_MAP = Object.freeze({
        torso: 'torso.svg',
        'head-neck': 'head-neck.svg',
        'front-arm': 'front-arm.svg',
        'back-arm': 'back-arm.svg',
        'front-leg': 'front-leg.svg',
        'back-leg': 'back-leg.svg'
    });
    const FRONT_PREMIUM_ASSET_PROFILE = 'front-six-part-premium';
    const BACK_PREMIUM_ASSET_PROFILE = 'back-six-part-premium';
    const SIDE_PREMIUM_ASSET_PROFILE = 'side-six-part-premium';
    const FRONT_3Q_PREMIUM_ASSET_PROFILE = 'front-3q-six-part-premium';
    const BACK_3Q_PREMIUM_ASSET_PROFILE = 'back-3q-six-part-premium';
    // The drawn 3/4 renderer is an opt-in per-character pilot. The global flag
    // remains as a test/development default, while persisted character config is
    // always authoritative. Runtime IDs keep both geometry variants cache-safe.
    const DEFAULT_THREE_QUARTER_ARTWORK = globalThis.SVG_AFRICAN_EXPERIMENTAL_AUTHORED_3Q === true
        ? 'experimental-drawn'
        : 'projected';
    const DRAWN_THREE_QUARTER_RUNTIME_SUFFIX = '--experimental-drawn-3q';
    const THREE_QUARTER_PROFILE_FALLBACKS = Object.freeze({
        'front-3q-left': Object.freeze({
            baseTiltY: -45,
            nearArm: 'left-arm',
            farArm: 'right-arm',
            nearLeg: 'left-leg',
            farLeg: 'right-leg',
            layerOrder: Object.freeze(['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'])
        }),
        'front-3q-right': Object.freeze({
            baseTiltY: 45,
            nearArm: 'right-arm',
            farArm: 'left-arm',
            nearLeg: 'right-leg',
            farLeg: 'left-leg',
            layerOrder: Object.freeze(['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm'])
        }),
        'back-3q-left': Object.freeze({
            baseTiltY: 45,
            nearArm: 'left-arm',
            farArm: 'right-arm',
            nearLeg: 'left-leg',
            farLeg: 'right-leg',
            layerOrder: Object.freeze(['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'])
        }),
        'back-3q-right': Object.freeze({
            baseTiltY: -45,
            nearArm: 'right-arm',
            farArm: 'left-arm',
            nearLeg: 'right-leg',
            farLeg: 'left-leg',
            layerOrder: Object.freeze(['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm'])
        })
    });
    const PREMIUM_SUPPORTED_VIEWS = Object.freeze([
        'front',
        'back',
        'side-right',
        'side-left',
        'front-3q-right',
        'front-3q-left',
        'back-3q-right',
        'back-3q-left'
    ]);
    const PREMIUM_PLANNED_VIEWS = Object.freeze([]);
    const PREMIUM_VIEW_OPTIONS = Object.freeze([
        Object.freeze({ id: 'front', name: 'Front', enabled: true }),
        Object.freeze({ id: 'back', name: 'Back', enabled: true }),
        Object.freeze({ id: 'side-right', name: 'Side Right', enabled: true }),
        Object.freeze({ id: 'side-left', name: 'Side Left', enabled: true }),
        Object.freeze({ id: 'front-3q-right', name: '3/4 Front Right', enabled: true }),
        Object.freeze({ id: 'front-3q-left', name: '3/4 Front Left', enabled: true }),
        Object.freeze({ id: 'back-3q-right', name: '3/4 Back Right', enabled: true }),
        Object.freeze({ id: 'back-3q-left', name: '3/4 Back Left', enabled: true })
    ]);
    const FACIAL_LAYER_ROLES = Object.freeze([
        'hair-back',
        'face-base',
        'hairline',
        'hair-front',
        'eye-left',
        'eye-right',
        'pupil-left',
        'pupil-right',
        'brow-left',
        'brow-right',
        'nose',
        'mouth-upper',
        'mouth-lower',
        'glasses',
        'headwear'
    ]);
    const BACK_FACIAL_LAYER_ROLES = Object.freeze([
        'hair-back',
        'headwear',
        'head-motion'
    ]);
    const BACK_3Q_FACIAL_LAYER_ROLES = Object.freeze([
        ...BACK_FACIAL_LAYER_ROLES,
        'face-base',
        'eye-side',
        'pupil-side',
        'brow-side',
        'nose',
        'mouth-upper',
        'mouth-lower',
        'glasses',
        'back-3q-face-reveal'
    ]);
    const SIDE_FACIAL_LAYER_ROLES = Object.freeze([
        'hair-back',
        'face-base',
        'hairline',
        'hair-front',
        'eye-side',
        'iris-side',
        'pupil-side',
        'brow-side',
        'nose',
        'mouth-upper',
        'mouth-lower',
        'glasses',
        'headwear'
    ]);
    const PREMIUM_AUTHORING = Object.freeze({
        view: 'front',
        partConvention: 'anatomical-right-is-viewer-left',
        bodyRoles: 'front-six-part',
        motionOwner: 'existing-pose-armature',
        appearanceOwner: 'svg-premium-asset'
    });
    const PREMIUM_ASSET_REQUIRED_JOINTS = Object.freeze({
        torso: Object.freeze(['waist']),
        'head-neck': Object.freeze(['neck']),
        'right-arm': Object.freeze(['right-shoulder', 'right-elbow', 'right-wrist']),
        'left-arm': Object.freeze(['left-shoulder', 'left-elbow', 'left-wrist']),
        'right-leg': Object.freeze(['right-hip', 'right-knee', 'right-ankle']),
        'left-leg': Object.freeze(['left-hip', 'left-knee', 'left-ankle'])
    });
    const SIDE_PREMIUM_ASSET_REQUIRED_JOINTS = Object.freeze({
        torso: Object.freeze(['waist']),
        'head-neck': Object.freeze(['neck']),
        'front-arm': Object.freeze(['front-shoulder', 'front-elbow', 'front-wrist']),
        'back-arm': Object.freeze(['back-shoulder', 'back-elbow', 'back-wrist']),
        'front-leg': Object.freeze(['front-hip', 'front-knee', 'front-ankle']),
        'back-leg': Object.freeze(['back-hip', 'back-knee', 'back-ankle'])
    });
    const PREMIUM_ASSET_CONTRACT = Object.freeze({
        version: 1,
        assetProfile: FRONT_PREMIUM_ASSET_PROFILE,
        assetProfiles: Object.freeze([
            FRONT_PREMIUM_ASSET_PROFILE,
            BACK_PREMIUM_ASSET_PROFILE,
            SIDE_PREMIUM_ASSET_PROFILE,
            FRONT_3Q_PREMIUM_ASSET_PROFILE,
            BACK_3Q_PREMIUM_ASSET_PROFILE
        ]),
        view: 'front',
        supportedViews: PREMIUM_SUPPORTED_VIEWS,
        plannedViews: PREMIUM_PLANNED_VIEWS,
        engine: 'svg-armature-premium',
        requiredRoles: PART_KEYS,
        sideRequiredRoles: SIDE_PART_KEYS,
        requiredPartFiles: PART_FILE_MAP,
        sideRequiredPartFiles: SIDE_PART_FILE_MAP,
        requiredFacialLayers: FACIAL_LAYER_ROLES,
        requiredJoints: PREMIUM_ASSET_REQUIRED_JOINTS,
        sideRequiredJoints: SIDE_PREMIUM_ASSET_REQUIRED_JOINTS,
        authoring: PREMIUM_AUTHORING
    });
    const IDENTITY_DEFAULT_KEYS = Object.freeze([
        'identityId',
        'presentation',
        'ageGroup',
        'skinTone',
        'headType',
        'face',
        'eyes',
        'nose',
        'lips',
        'hair',
        'hairColor',
        'facialHair',
        'body',
        'height'
    ]);
    const STYLING_DEFAULT_KEYS = Object.freeze([
        'profession',
        'outfit',
        'topClothing',
        'bottomClothing',
        'skirtLength',
        'sleeveLength',
        'clothingPalette',
        'fabricDesign',
        'neckTieType',
        'neckTieDesign',
        'headwear',
        'footwear',
        'accessories',
        'colorOverrides',
        'culturalStyle',
        'view',
        'sideFacing',
        'headArtwork',
        'threeQuarterArtwork',
        'rearTalkingProfile'
    ]);
    const ASSET_RENDER_DEFAULTS = Object.freeze({
        'ada-lecturer-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-ada-lecturer-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'warmBrown',
                face: 'oval',
                eyes: 'almond',
                nose: 'soft',
                lips: 'defined',
                hair: 'braids',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'lecturer',
                outfit: 'lecturer',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'auto',
                clothingPalette: 'navy-gold',
                fabricDesign: 'subtle-trim',
                headwear: 'none',
                footwear: 'formal',
                accessories: Object.freeze(['glasses', 'notebook', 'earrings']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({ hairlineHeight: 0.08, muscleDefinition: -0.02 }),
            visualFingerprint: Object.freeze({
                label: 'female-lecturer',
                requiredSvgTokens: Object.freeze(['hair hair-back braids', 'accessory earrings', 'lecturer'])
            })
        }),
        'male-lecturer-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-male-lecturer-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'deep',
                face: 'oval',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'natural',
                hair: 'low-cut',
                hairColor: 'natural-black',
                facialHair: 'short-beard',
                body: 'athletic',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'lecturer',
                outfit: 'business-suit',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'auto',
                clothingPalette: 'corporate-navy',
                fabricDesign: 'pinstripe',
                headwear: 'none',
                footwear: 'formal',
                accessories: Object.freeze(['glasses', 'notebook']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.09,
                shoulderWidth: 0.12,
                hipWidth: 0.06,
                armLength: -0.08,
                armWidth: 0.07,
                legLength: 0.04,
                legWidth: 0.02,
                muscleDefinition: 0.18,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.03,
                headHeight: 0.01,
                browHeight: 0.04,
                browLength: 0.12
            }),
            visualFingerprint: Object.freeze({
                label: 'male-lecturer',
                requiredSvgTokens: Object.freeze(['low-cut-front-cap', 'facial-hair short-beard', 'business-suit jacket shirt tie male-lecturer'])
            })
        }),
        'female-academic-gown-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-female-academic-gown',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'warmBrown',
                face: 'oval',
                eyes: 'almond',
                nose: 'soft',
                lips: 'defined',
                hair: 'braids',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'lecturer',
                outfit: 'academic-robe',
                topClothing: 'academic-gown-top',
                bottomClothing: 'academic-gown-bottom',
                skirtLength: 'ankle',
                sleeveLength: 'wrist',
                clothingPalette: 'academic-black',
                fabricDesign: 'subtle-trim',
                headwear: 'academic-cap',
                footwear: 'formal',
                accessories: Object.freeze(['glasses', 'diploma', 'earrings']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                hairlineHeight: 0.08,
                muscleDefinition: -0.02,
                armLength: -0.10,
                legLength: 0.04,
                shoulderWidth: -0.02,
                hipWidth: 0.03
            }),
            visualFingerprint: Object.freeze({
                label: 'female-academic-gown',
                requiredSvgTokens: Object.freeze([
                    'academic-cap mortarboard',
                    'academic-gown academic-robe graduation-gown',
                    'diploma-scroll',
                    'accessory earrings'
                ])
            })
        }),
        'male-academic-gown-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-male-academic-gown',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'deep',
                face: 'oval',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'natural',
                hair: 'low-cut',
                hairColor: 'natural-black',
                facialHair: 'short-beard',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'lecturer',
                outfit: 'academic-robe',
                topClothing: 'academic-gown-top',
                bottomClothing: 'academic-gown-bottom',
                skirtLength: 'ankle',
                sleeveLength: 'wrist',
                clothingPalette: 'academic-black',
                fabricDesign: 'subtle-trim',
                headwear: 'academic-cap',
                footwear: 'formal',
                accessories: Object.freeze(['glasses', 'diploma']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.08,
                shoulderWidth: 0.09,
                hipWidth: 0.05,
                armLength: -0.09,
                armWidth: 0.05,
                legLength: 0.04,
                legWidth: 0.01,
                muscleDefinition: 0.14,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.03,
                headHeight: 0.01,
                browHeight: 0.04,
                browLength: 0.12
            }),
            visualFingerprint: Object.freeze({
                label: 'male-academic-gown',
                requiredSvgTokens: Object.freeze([
                    'academic-cap mortarboard',
                    'academic-gown academic-robe graduation-gown',
                    'diploma-scroll',
                    'facial-hair short-beard'
                ])
            })
        }),
        'female-doctor-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-female-doctor-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'bronze',
                face: 'heart',
                eyes: 'round',
                nose: 'soft',
                lips: 'full',
                hair: 'cornrows',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'full',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'doctor',
                outfit: 'doctor',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'auto',
                clothingPalette: 'white-clinical',
                fabricDesign: 'subtle-trim',
                headwear: 'none',
                footwear: 'clinical',
                accessories: Object.freeze(['id-badge', 'stethoscope', 'earrings']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.05,
                torsoLength: 0.04,
                shoulderWidth: -0.09,
                hipWidth: 0.16,
                armLength: -0.09,
                armWidth: -0.01,
                legLength: 0.04,
                legWidth: -0.03,
                muscleDefinition: -0.04,
                handSize: 0.09,
                footSize: 0.05,
                headWidth: 0.06,
                headHeight: 0.04,
                hairVolume: -0.03,
                hairlineHeight: 0.10,
                eyeSize: 0.10,
                browHeight: 0.08,
                browLength: -0.03,
                lipFullness: 0.14
            }),
            visualFingerprint: Object.freeze({
                label: 'female-doctor',
                requiredSvgTokens: Object.freeze(['cornrow-front-cap', 'doctor-coat lab-coat health-profession female-doctor', 'accessory stethoscope', 'accessory earrings'])
            })
        }),
        'male-doctor-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-male-doctor-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'mahogany',
                face: 'oval',
                eyes: 'almond',
                nose: 'rounded',
                lips: 'natural',
                hair: 'fade',
                hairColor: 'natural-black',
                facialHair: 'goatee',
                body: 'athletic',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'doctor',
                outfit: 'doctor',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'auto',
                clothingPalette: 'white-clinical',
                fabricDesign: 'subtle-trim',
                headwear: 'none',
                footwear: 'clinical',
                accessories: Object.freeze(['id-badge', 'stethoscope']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.07,
                torsoLength: 0.05,
                shoulderWidth: 0.08,
                hipWidth: 0.04,
                armLength: -0.06,
                armWidth: 0.05,
                legLength: 0.04,
                legWidth: 0.02,
                muscleDefinition: 0.22,
                handSize: 0.08,
                footSize: 0.06,
                headWidth: 0.03,
                headHeight: 0.02,
                hairlineHeight: 0.09,
                eyeSize: 0.04,
                browHeight: 0.04,
                browLength: 0.08,
                noseWidth: 0.04,
                lipFullness: -0.02
            }),
            visualFingerprint: Object.freeze({
                label: 'male-doctor',
                requiredSvgTokens: Object.freeze(['fade-temple shadow', 'facial-hair goatee', 'doctor-coat lab-coat health-profession male-doctor', 'accessory stethoscope'])
            })
        }),
        'female-student-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-female-student-front',
                presentation: 'female',
                ageGroup: 'young-adult',
                skinTone: 'goldenBrown',
                face: 'oval',
                eyes: 'wide',
                nose: 'soft',
                lips: 'defined',
                hair: 'afro-short',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'slim',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'student',
                outfit: 'student-casual',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'above-knee',
                sleeveLength: 'auto',
                clothingPalette: 'teal-coral',
                fabricDesign: 'plain',
                headwear: 'none',
                footwear: 'casual',
                accessories: Object.freeze(['backpack', 'earrings']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.07,
                torsoLength: -0.03,
                shoulderWidth: -0.12,
                hipWidth: 0.06,
                armLength: -0.10,
                armWidth: -0.04,
                legLength: 0.04,
                legWidth: -0.05,
                muscleDefinition: -0.05,
                handSize: 0.07,
                footSize: 0.08,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: 0.06,
                hairlineHeight: 0.10,
                eyeSize: 0.09,
                browHeight: 0.08,
                browLength: -0.02,
                lipFullness: 0.05
            }),
            visualFingerprint: Object.freeze({
                label: 'female-student',
                requiredSvgTokens: Object.freeze(['afro-front-cap', 'student campus-cardigan blouse backpack-straps female-student', 'accessory earrings'])
            })
        }),
        'male-student-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-male-student-front',
                presentation: 'male',
                ageGroup: 'young-adult',
                skinTone: 'umber',
                face: 'oval',
                eyes: 'almond',
                nose: 'rounded',
                lips: 'natural',
                hair: 'fade',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'slim',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'student',
                outfit: 'student-casual',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'auto',
                clothingPalette: 'sport-blue',
                fabricDesign: 'plain',
                headwear: 'none',
                footwear: 'sneakers',
                accessories: Object.freeze(['backpack', 'notebook']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.01,
                torsoLength: -0.02,
                shoulderWidth: -0.03,
                hipWidth: -0.01,
                armLength: -0.09,
                armWidth: -0.02,
                legLength: 0.04,
                legWidth: -0.03,
                muscleDefinition: 0.08,
                handSize: 0.07,
                footSize: 0.10,
                headWidth: 0.03,
                headHeight: 0.01,
                hairlineHeight: 0.10,
                eyeSize: 0.05,
                browHeight: 0.04,
                browLength: 0.04,
                noseWidth: 0.03,
                lipFullness: -0.04
            }),
            visualFingerprint: Object.freeze({
                label: 'male-student',
                requiredSvgTokens: Object.freeze(['fade-temple shadow', 'student campus-jacket polo backpack-straps male-student'])
            })
        }),
        'neutral-presenter-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-neutral-presenter-front',
                presentation: 'nonbinary',
                ageGroup: 'adult',
                skinTone: 'umber',
                face: 'soft-diamond',
                eyes: 'almond',
                nose: 'rounded',
                lips: 'natural',
                hair: 'twists',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'entrepreneur',
                outfit: 'smart-casual',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'elbow',
                clothingPalette: 'auto',
                fabricDesign: 'plain',
                headwear: 'none',
                footwear: 'loafers',
                accessories: Object.freeze(['watch']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.01,
                torsoLength: 0.02,
                shoulderWidth: 0.01,
                hipWidth: 0.04,
                armLength: -0.08,
                armWidth: 0,
                legLength: 0.04,
                legWidth: -0.02,
                muscleDefinition: 0.04,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.04,
                headHeight: 0.02,
                hairVolume: 0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.06,
                browHeight: 0.05,
                browLength: 0.02,
                noseWidth: 0.03,
                lipFullness: 0.02
            }),
            visualFingerprint: Object.freeze({
                label: 'neutral-presenter',
                requiredSvgTokens: Object.freeze(['twist-front-cap', 'shirt collar placket'])
            })
        }),
        'iro-buba-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-iro-buba-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'bronze',
                face: 'soft-diamond',
                eyes: 'almond',
                nose: 'rounded',
                lips: 'full',
                hair: 'natural-bun',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'full',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'entrepreneur',
                outfit: 'iro-buba',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'ankle',
                sleeveLength: 'auto',
                clothingPalette: 'ankara-warm',
                fabricDesign: 'ankara',
                headwear: 'gele',
                footwear: 'sandals',
                accessories: Object.freeze(['beads', 'earrings']),
                culturalStyle: 'yoruba',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.03,
                torsoLength: 0.18,
                shoulderWidth: -0.08,
                hipWidth: 0.18,
                armLength: -0.08,
                armWidth: -0.02,
                legLength: 0.04,
                legWidth: -0.03,
                muscleDefinition: -0.03,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.06,
                headHeight: 0.04,
                neckWidth: 0.02,
                neckHeight: -0.02,
                hairVolume: 0.03,
                hairlineHeight: 0.10,
                eyeSize: 0.08,
                browHeight: 0.08,
                browLength: -0.02,
                lipFullness: 0.14
            }),
            visualFingerprint: Object.freeze({
                label: 'iro-buba',
                requiredSvgTokens: Object.freeze(['headwear gele crown', 'iro-buba buba blouse wrapper traditional-yoruba premium-traditional', 'accessory beads traditional-necklace'])
            })
        }),
        'ankara-creative-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-ankara-creative-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'honey',
                face: 'heart',
                eyes: 'wide',
                nose: 'soft',
                lips: 'full',
                hair: 'twists',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'entrepreneur',
                outfit: 'ankara-peplum',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'above-knee',
                sleeveLength: 'bell',
                clothingPalette: 'ankara-warm',
                fabricDesign: 'ankara',
                headwear: 'wrapped-gele',
                footwear: 'sandals',
                accessories: Object.freeze(['earrings']),
                culturalStyle: 'ankara',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.02,
                torsoLength: 0.04,
                shoulderWidth: -0.08,
                hipWidth: 0.13,
                armLength: -0.09,
                armWidth: -0.02,
                legLength: 0.04,
                legWidth: -0.03,
                muscleDefinition: -0.03,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: 0.04,
                hairlineHeight: 0.11,
                eyeSize: 0.09,
                browHeight: 0.08,
                browLength: -0.01,
                lipFullness: 0.12
            }),
            visualFingerprint: Object.freeze({
                label: 'ankara-creative',
                requiredSvgTokens: Object.freeze(['headwear gele crown', 'ankara-motif', 'accessory earrings'])
            })
        }),
        'senator-wear-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-senator-wear-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'deep',
                face: 'oval',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'natural',
                hair: 'fade',
                hairColor: 'natural-black',
                facialHair: 'moustache',
                body: 'athletic',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'administrator',
                outfit: 'senator-wear',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'charcoal-red',
                fabricDesign: 'woven-bands',
                headwear: 'igbo-red-cap',
                footwear: 'loafers',
                accessories: Object.freeze(['watch']),
                culturalStyle: 'igbo',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.08,
                torsoLength: 0.10,
                shoulderWidth: 0.10,
                hipWidth: 0.04,
                armLength: -0.07,
                armWidth: 0.05,
                legLength: 0.04,
                legWidth: 0.02,
                muscleDefinition: 0.20,
                handSize: 0.08,
                footSize: 0.09,
                headWidth: 0.03,
                headHeight: 0.01,
                hairlineHeight: 0.10,
                browHeight: 0.05,
                browLength: 0.08,
                noseWidth: 0.04,
                lipFullness: -0.02
            }),
            visualFingerprint: Object.freeze({
                label: 'senator-wear',
                requiredSvgTokens: Object.freeze(['headwear igbo-red-cap igbo-cap', 'senator-top embroidery placket', 'woven-bands'])
            })
        }),
        'agbada-formal-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-agbada-formal-front',
                presentation: 'male',
                ageGroup: 'older-adult',
                skinTone: 'nightEbony',
                face: 'square',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'defined',
                hair: 'low-cut',
                hairColor: 'natural-black',
                facialHair: 'full-beard',
                body: 'full',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'administrator',
                outfit: 'agbada',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'royal-white',
                fabricDesign: 'woven-bands',
                headwear: 'yoruba-fila',
                footwear: 'loafers',
                accessories: Object.freeze(['beads', 'watch']),
                culturalStyle: 'yoruba',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.16,
                torsoLength: 0.20,
                shoulderWidth: 0.12,
                hipWidth: 0.12,
                armLength: -0.06,
                armWidth: 0.08,
                legLength: 0.04,
                legWidth: 0.02,
                muscleDefinition: 0.10,
                handSize: 0.10,
                footSize: 0.09,
                headWidth: 0.04,
                headHeight: 0.02,
                hairlineHeight: 0.09,
                browHeight: 0.04,
                browLength: 0.10,
                noseWidth: 0.08,
                lipFullness: 0.02
            }),
            visualFingerprint: Object.freeze({
                label: 'agbada-formal',
                requiredSvgTokens: Object.freeze(['headwear yoruba-fila', 'agbada drape embroidery wide-garment', 'accessory beads traditional-necklace'])
            })
        }),
        'george-wrapper-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-george-wrapper-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'mahogany',
                face: 'oval',
                eyes: 'round',
                nose: 'soft',
                lips: 'defined',
                hair: 'locs',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'average',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'administrator',
                outfit: 'george-wrapper',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'ankle',
                sleeveLength: 'elbow',
                clothingPalette: 'burgundy-gold',
                fabricDesign: 'woven-bands',
                headwear: 'turban',
                footwear: 'sandals',
                accessories: Object.freeze(['beads', 'earrings']),
                culturalStyle: 'niger-delta',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.02,
                torsoLength: 0.14,
                shoulderWidth: -0.06,
                hipWidth: 0.16,
                armLength: -0.08,
                armWidth: -0.02,
                legLength: 0.04,
                legWidth: -0.02,
                muscleDefinition: -0.02,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: 0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.07,
                browHeight: 0.07,
                browLength: -0.01,
                lipFullness: 0.08
            }),
            visualFingerprint: Object.freeze({
                label: 'george-wrapper',
                requiredSvgTokens: Object.freeze(['turban crown brow-clear', 'george-wrapper-bottom', 'accessory beads traditional-necklace'])
            })
        }),
        'nurse-female-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-nurse-female-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'umber',
                face: 'round',
                eyes: 'almond',
                nose: 'soft',
                lips: 'defined',
                hair: 'cornrows',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'nurse',
                outfit: 'nurse',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'short',
                clothingPalette: 'clinical-blue',
                fabricDesign: 'subtle-trim',
                headwear: 'none',
                footwear: 'clinical',
                accessories: Object.freeze(['id-badge', 'earrings']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.03,
                torsoLength: 0.02,
                shoulderWidth: -0.06,
                hipWidth: 0.10,
                armLength: -0.09,
                armWidth: -0.02,
                legLength: 0.04,
                legWidth: -0.03,
                muscleDefinition: -0.03,
                handSize: 0.08,
                footSize: 0.06,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: -0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.08,
                browHeight: 0.07,
                browLength: -0.02,
                lipFullness: 0.08
            }),
            visualFingerprint: Object.freeze({
                label: 'female-nurse',
                requiredSvgTokens: Object.freeze(['cornrow-front-cap', 'health-profession nurse', 'scrub-blouse', 'accessory id-badge'])
            })
        }),
        'lab-scientist-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-lab-scientist-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'ebony',
                face: 'long',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'natural',
                hair: 'low-cut',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'slim',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'laboratory-scientist',
                outfit: 'lab-coat',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'white-clinical',
                fabricDesign: 'subtle-trim',
                headwear: 'none',
                footwear: 'clinical',
                accessories: Object.freeze(['id-badge', 'glasses']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.02,
                torsoLength: 0.06,
                shoulderWidth: 0.04,
                hipWidth: -0.02,
                armLength: -0.08,
                armWidth: 0.01,
                legLength: 0.04,
                legWidth: -0.03,
                muscleDefinition: 0.06,
                handSize: 0.07,
                footSize: 0.08,
                headWidth: 0.02,
                headHeight: 0.01,
                hairlineHeight: 0.10,
                eyeSize: 0.03,
                browHeight: 0.04,
                browLength: 0.07,
                noseWidth: 0.07,
                lipFullness: -0.04
            }),
            visualFingerprint: Object.freeze({
                label: 'lab-scientist',
                requiredSvgTokens: Object.freeze(['low-cut-front-cap', 'health-profession laboratory-scientist', 'accessory id-badge', 'accessory glasses'])
            })
        }),
        'business-executive-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-business-executive-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'deep',
                face: 'square',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'natural',
                hair: 'temple-fade',
                hairColor: 'natural-black',
                facialHair: 'short-beard',
                body: 'athletic',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'business-executive',
                outfit: 'executive-suit',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'corporate-navy',
                fabricDesign: 'pinstripe',
                headwear: 'none',
                footwear: 'formal',
                accessories: Object.freeze(['glasses', 'watch']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.08,
                torsoLength: 0.06,
                shoulderWidth: 0.12,
                hipWidth: 0.04,
                armLength: -0.07,
                armWidth: 0.06,
                legLength: 0.04,
                legWidth: 0.02,
                muscleDefinition: 0.24,
                handSize: 0.08,
                footSize: 0.09,
                headWidth: 0.03,
                headHeight: 0.02,
                hairlineHeight: 0.11,
                eyeSize: 0.03,
                browHeight: 0.04,
                browLength: 0.10,
                noseWidth: 0.05,
                lipFullness: -0.03
            }),
            visualFingerprint: Object.freeze({
                label: 'business-executive',
                requiredSvgTokens: Object.freeze(['corporate-wear business-suit', 'executive-suit', 'tie necktie formal-office', 'accessory glasses'])
            })
        }),
        'corporate-woman-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-corporate-woman-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'bronze',
                face: 'oval',
                eyes: 'almond',
                nose: 'soft',
                lips: 'defined',
                hair: 'side-part-bob',
                hairColor: 'soft-black',
                facialHair: 'none',
                body: 'average',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'business-executive',
                outfit: 'pant-suit',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'banker-grey',
                fabricDesign: 'plain',
                headwear: 'none',
                footwear: 'formal',
                accessories: Object.freeze(['earrings', 'id-badge']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.02,
                torsoLength: 0.05,
                shoulderWidth: -0.04,
                hipWidth: 0.11,
                armLength: -0.08,
                armWidth: -0.01,
                legLength: 0.04,
                legWidth: -0.02,
                muscleDefinition: 0.02,
                handSize: 0.08,
                footSize: 0.07,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: 0.02,
                hairlineHeight: 0.11,
                eyeSize: 0.08,
                browHeight: 0.07,
                browLength: -0.01,
                lipFullness: 0.08
            }),
            visualFingerprint: Object.freeze({
                label: 'corporate-woman',
                requiredSvgTokens: Object.freeze(['corporate-wear business-suit', 'pant-suit fitted-waist female-corporate', 'accessory earrings'])
            })
        }),
        'lawyer-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-lawyer-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'mahogany',
                face: 'oval',
                eyes: 'almond',
                nose: 'rounded',
                lips: 'defined',
                hair: 'low-cut',
                hairColor: 'natural-black',
                facialHair: 'goatee',
                body: 'average',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'lawyer',
                outfit: 'lawyer-black-suit',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'lawyer-black',
                fabricDesign: 'plain',
                headwear: 'none',
                footwear: 'formal',
                accessories: Object.freeze(['glasses']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.04,
                torsoLength: 0.07,
                shoulderWidth: 0.07,
                hipWidth: 0.02,
                armLength: -0.07,
                armWidth: 0.03,
                legLength: 0.04,
                legWidth: -0.01,
                muscleDefinition: 0.12,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.03,
                headHeight: 0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.04,
                browHeight: 0.05,
                browLength: 0.08,
                noseWidth: 0.04,
                lipFullness: 0.01
            }),
            visualFingerprint: Object.freeze({
                label: 'lawyer',
                requiredSvgTokens: Object.freeze(['corporate-wear business-suit', 'lawyer legal-bands court-wear', 'facial-hair goatee'])
            })
        }),
        'football-athlete-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-football-athlete-front',
                presentation: 'male',
                ageGroup: 'young-adult',
                skinTone: 'nightEbony',
                face: 'oval',
                eyes: 'almond',
                nose: 'broad',
                lips: 'natural',
                hair: 'fade',
                hairColor: 'blue-black',
                facialHair: 'none',
                body: 'athletic',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'athlete',
                outfit: 'football-kit',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'short',
                clothingPalette: 'sport-green',
                fabricDesign: 'sport-stripes',
                headwear: 'none',
                footwear: 'sneakers',
                accessories: Object.freeze([]),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.04,
                torsoLength: -0.01,
                shoulderWidth: 0.11,
                hipWidth: 0.02,
                armLength: -0.06,
                armWidth: 0.08,
                legLength: 0.04,
                legWidth: 0.07,
                muscleDefinition: 0.36,
                handSize: 0.08,
                footSize: 0.11,
                headWidth: 0.02,
                headHeight: 0.01,
                hairlineHeight: 0.10,
                eyeSize: 0.04,
                browHeight: 0.04,
                browLength: 0.06,
                noseWidth: 0.06,
                lipFullness: -0.03
            }),
            visualFingerprint: Object.freeze({
                label: 'football-athlete',
                requiredSvgTokens: Object.freeze(['sportswear athletic-kit', 'football-kit', 'sports-number jersey-number', 'sports-side-stripe'])
            })
        }),
        'teacher-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-teacher-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'honey',
                face: 'oval',
                eyes: 'almond',
                nose: 'soft',
                lips: 'defined',
                hair: 'natural-bun',
                hairColor: 'soft-black',
                facialHair: 'none',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'teacher',
                outfit: 'teacher-cardigan',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'school-blue',
                fabricDesign: 'plain',
                headwear: 'none',
                footwear: 'formal',
                accessories: Object.freeze(['glasses', 'notebook', 'earrings', 'chalk']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.04,
                torsoLength: 0.02,
                shoulderWidth: -0.07,
                hipWidth: 0.09,
                armLength: -0.09,
                armWidth: -0.02,
                legLength: 0.04,
                legWidth: -0.03,
                muscleDefinition: -0.03,
                handSize: 0.08,
                footSize: 0.07,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: 0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.08,
                browHeight: 0.07,
                browLength: -0.02,
                noseWidth: 0.02,
                lipFullness: 0.07
            }),
            visualFingerprint: Object.freeze({
                label: 'teacher',
                requiredSvgTokens: Object.freeze(['profession-uniform teacher-cardigan', 'teacher-cardigan buttons', 'accessory notebook', 'accessory chalk'])
            })
        }),
        'media-presenter-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-media-presenter-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'bronze',
                face: 'heart',
                eyes: 'wide',
                nose: 'soft',
                lips: 'full',
                hair: 'side-part-bob',
                hairColor: 'auburn',
                facialHair: 'none',
                body: 'average',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'media-presenter',
                outfit: 'media-presenter',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'burgundy-gold',
                fabricDesign: 'subtle-trim',
                headwear: 'none',
                footwear: 'formal',
                accessories: Object.freeze(['earrings', 'lapel-mic']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.02,
                torsoLength: 0.04,
                shoulderWidth: -0.05,
                hipWidth: 0.10,
                armLength: -0.08,
                armWidth: -0.01,
                legLength: 0.04,
                legWidth: -0.02,
                muscleDefinition: 0.02,
                handSize: 0.08,
                footSize: 0.07,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: 0.03,
                hairlineHeight: 0.11,
                eyeSize: 0.10,
                browHeight: 0.08,
                browLength: -0.01,
                noseWidth: 0.01,
                lipFullness: 0.12
            }),
            visualFingerprint: Object.freeze({
                label: 'media-presenter',
                requiredSvgTokens: Object.freeze(['profession-uniform media-blazer', 'media-presenter', 'uniform-front-panel', 'accessory lapel-mic'])
            })
        }),
        'engineer-field-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-engineer-field-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'umber',
                face: 'square',
                eyes: 'almond',
                nose: 'broad',
                lips: 'natural',
                hair: 'fade',
                hairColor: 'natural-black',
                facialHair: 'moustache',
                body: 'athletic',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'engineer',
                outfit: 'engineer-field',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'safety-orange',
                fabricDesign: 'reflective-tape',
                headwear: 'construction-helmet',
                footwear: 'sneakers',
                accessories: Object.freeze(['id-badge', 'tool-belt']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.06,
                torsoLength: 0.05,
                shoulderWidth: 0.12,
                hipWidth: 0.03,
                armLength: -0.06,
                armWidth: 0.06,
                legLength: 0.04,
                legWidth: 0.04,
                muscleDefinition: 0.28,
                handSize: 0.09,
                footSize: 0.10,
                headWidth: 0.03,
                headHeight: 0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.04,
                browHeight: 0.04,
                browLength: 0.08,
                noseWidth: 0.06,
                lipFullness: -0.03
            }),
            visualFingerprint: Object.freeze({
                label: 'engineer-field',
                requiredSvgTokens: Object.freeze(['profession-uniform engineer-vest', 'engineer-vest reflective-vest safety', 'headwear construction-helmet', 'utility-belt engineer-tools'])
            })
        }),
        'chef-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-chef-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'goldenBrown',
                face: 'round',
                eyes: 'almond',
                nose: 'rounded',
                lips: 'defined',
                hair: 'cornrows',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'average',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'chef',
                outfit: 'chef-uniform',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'chef-white',
                fabricDesign: 'plain',
                headwear: 'chef-hat',
                footwear: 'clinical',
                accessories: Object.freeze(['id-badge', 'earrings', 'chef-tools']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.02,
                torsoLength: 0.03,
                shoulderWidth: -0.05,
                hipWidth: 0.10,
                armLength: -0.08,
                armWidth: -0.01,
                legLength: 0.04,
                legWidth: -0.02,
                muscleDefinition: 0.00,
                handSize: 0.08,
                footSize: 0.06,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: -0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.07,
                browHeight: 0.06,
                browLength: -0.02,
                noseWidth: 0.04,
                lipFullness: 0.07
            }),
            visualFingerprint: Object.freeze({
                label: 'chef',
                requiredSvgTokens: Object.freeze(['profession-uniform chef-coat', 'chef-coat double-breasted buttons', 'headwear chef-hat', 'chef-tools utensil-pocket'])
            })
        }),
        'pilot-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-pilot-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'mahogany',
                face: 'oval',
                eyes: 'hooded',
                nose: 'rounded',
                lips: 'natural',
                hair: 'low-cut',
                hairColor: 'natural-black',
                facialHair: 'goatee',
                body: 'athletic',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'pilot',
                outfit: 'pilot-uniform',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'corporate-navy',
                fabricDesign: 'pinstripe',
                headwear: 'pilot-cap',
                footwear: 'formal',
                accessories: Object.freeze(['glasses', 'id-badge', 'rank-badge']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.06,
                torsoLength: 0.06,
                shoulderWidth: 0.10,
                hipWidth: 0.02,
                armLength: -0.07,
                armWidth: 0.04,
                legLength: 0.04,
                legWidth: 0.00,
                muscleDefinition: 0.20,
                handSize: 0.08,
                footSize: 0.08,
                headWidth: 0.03,
                headHeight: 0.02,
                hairlineHeight: 0.10,
                eyeSize: 0.04,
                browHeight: 0.04,
                browLength: 0.09,
                noseWidth: 0.04,
                lipFullness: -0.03
            }),
            visualFingerprint: Object.freeze({
                label: 'pilot',
                requiredSvgTokens: Object.freeze(['profession-uniform pilot-jacket', 'pilot-uniform epaulets rank-stripes', 'headwear pilot-cap', 'rank-badge pilot-wings'])
            })
        }),
        'security-officer-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-security-officer-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'deep',
                face: 'square',
                eyes: 'hooded',
                nose: 'broad',
                lips: 'natural',
                hair: 'buzz-cut',
                hairColor: 'natural-black',
                facialHair: 'none',
                body: 'athletic',
                height: 'average'
            }),
            styling: Object.freeze({
                profession: 'security-officer',
                outfit: 'security-uniform',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'short',
                clothingPalette: 'security-black',
                fabricDesign: 'reflective-tape',
                headwear: 'security-cap',
                footwear: 'formal',
                accessories: Object.freeze(['id-badge', 'radio', 'whistle']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.07,
                torsoLength: 0.04,
                shoulderWidth: 0.14,
                hipWidth: 0.03,
                armLength: -0.06,
                armWidth: 0.07,
                legLength: 0.04,
                legWidth: 0.04,
                muscleDefinition: 0.30,
                handSize: 0.09,
                footSize: 0.10,
                headWidth: 0.03,
                headHeight: 0.01,
                hairlineHeight: 0.10,
                eyeSize: 0.03,
                browHeight: 0.04,
                browLength: 0.10,
                noseWidth: 0.07,
                lipFullness: -0.04
            }),
            visualFingerprint: Object.freeze({
                label: 'security-officer',
                requiredSvgTokens: Object.freeze(['profession-uniform security-shirt', 'security-badge chest-badge', 'headwear security-cap', 'accessory radio', 'accessory whistle'])
            })
        }),
        'soldier-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-soldier-front',
                presentation: 'male',
                ageGroup: 'adult',
                skinTone: 'ebony',
                face: 'long',
                eyes: 'almond',
                nose: 'broad',
                lips: 'natural',
                hair: 'low-cut',
                hairColor: 'blue-black',
                facialHair: 'none',
                body: 'athletic',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'soldier',
                outfit: 'military-fatigues',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'at-knee',
                sleeveLength: 'wrist',
                clothingPalette: 'military-olive',
                fabricDesign: 'camouflage',
                headwear: 'military-beret',
                footwear: 'formal',
                accessories: Object.freeze(['rank-badge', 'radio']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: 0.08,
                torsoLength: 0.05,
                shoulderWidth: 0.15,
                hipWidth: 0.04,
                armLength: -0.06,
                armWidth: 0.08,
                legLength: 0.04,
                legWidth: 0.05,
                muscleDefinition: 0.34,
                handSize: 0.09,
                footSize: 0.11,
                headWidth: 0.02,
                headHeight: 0.01,
                hairlineHeight: 0.10,
                eyeSize: 0.03,
                browHeight: 0.04,
                browLength: 0.09,
                noseWidth: 0.07,
                lipFullness: -0.05
            }),
            visualFingerprint: Object.freeze({
                label: 'soldier',
                requiredSvgTokens: Object.freeze(['profession-uniform military-fatigue-top', 'military-fatigue pockets', 'headwear military-beret', 'rank-badge shoulder-patch', 'accessory radio'])
            })
        }),
        'event-host-premium-front': Object.freeze({
            identity: Object.freeze({
                identityId: 'premium-identity-event-host-front',
                presentation: 'female',
                ageGroup: 'adult',
                skinTone: 'caramel',
                face: 'soft-diamond',
                eyes: 'wide',
                nose: 'soft',
                lips: 'full',
                hair: 'long-waves',
                hairColor: 'dark-brown',
                facialHair: 'none',
                body: 'average',
                height: 'tall'
            }),
            styling: Object.freeze({
                profession: 'event-host',
                outfit: 'event-formal',
                topClothing: 'auto',
                bottomClothing: 'auto',
                skirtLength: 'below-knee',
                sleeveLength: 'elbow',
                clothingPalette: 'teal-coral',
                fabricDesign: 'subtle-trim',
                headwear: 'turban',
                footwear: 'formal',
                accessories: Object.freeze(['earrings', 'beads', 'lapel-mic']),
                culturalStyle: 'contemporary',
                view: 'front',
                sideFacing: 'right'
            }),
            premiumAdjustments: Object.freeze({
                torsoWidth: -0.01,
                torsoLength: 0.06,
                shoulderWidth: -0.05,
                hipWidth: 0.12,
                armLength: -0.08,
                armWidth: -0.01,
                legLength: 0.04,
                legWidth: -0.02,
                muscleDefinition: 0.02,
                handSize: 0.09,
                footSize: 0.08,
                headWidth: 0.05,
                headHeight: 0.03,
                hairVolume: 0.04,
                hairlineHeight: 0.11,
                eyeSize: 0.10,
                browHeight: 0.08,
                browLength: 0.00,
                noseWidth: 0.02,
                lipFullness: 0.14
            }),
            visualFingerprint: Object.freeze({
                label: 'event-host',
                requiredSvgTokens: Object.freeze(['profession-uniform event-top', 'event-formal host-trim', 'accessory beads', 'accessory lapel-mic'])
            })
        })
    });

    const DEFAULT_PALETTE = Object.freeze({
        skin: '#A57252',
        skinShade: '#85563f',
        skinLight: '#C28A66',
        hair: '#1f1512',
        hairLight: '#3a2520',
        ink: '#241714',
        blazer: '#17345d',
        blazerShade: '#0f2442',
        blouse: '#fff4e6',
        skirt: '#182842',
        accent: '#c68b2c',
        tie: '#3b251a',
        shoe: '#171717',
        glass: '#26374f',
        headwear: '#17345d',
        headwearShade: '#0f2442'
    });

    const HEADWEAR_DEFAULT_COLORS = Object.freeze({
        hijab: '#26324f',
        'layered-hijab': '#2d3f68',
        khimar: '#1f2937',
        niqab: '#111827',
        gele: '#17345d',
        'wrapped-gele': '#17345d',
        turban: '#4c1d95',
        'niger-delta-head-tie': '#143f5f',
        'niger-delta-bowler': '#111111',
        'bowler-hat': '#111111',
        'niger-delta-coral-crown': '#b4532b',
        'edo-coral-cap': '#b4532b',
        'crown-cap': '#b4532b',
        'igbo-red-cap': '#b91c2b',
        'isi-agu-cap': '#b91c2b',
        'hausa-embroidered-cap': '#3b2f5b',
        'hausa-cap': '#3b2f5b',
        kufi: '#3b2f5b',
        'yoruba-fila': '#0f766e',
        fila: '#0f766e',
        'abeti-aja': '#0f766e',
        'fulani-hat': '#efe3bf',
        'academic-cap': '#111827',
        fedora: '#2f2a24',
        'wide-brim-hat': '#61422a',
        'cloche-hat': '#5b2a86',
        'bucket-hat': '#334155',
        'baseball-cap': '#1d4ed8',
        beanie: '#374151',
        'top-hat': '#111111',
        'construction-helmet': '#f59e0b',
        'chef-hat': '#f8fafc',
        'pilot-cap': '#14213d',
        'security-cap': '#111827',
        'military-beret': '#3f4a2b'
    });

    const CULTURAL_HEADWEAR_DEFAULTS = Object.freeze({
        'niger-delta': '#101114',
        igbo: '#b91c2b',
        'hausa-fulani': '#3b2f5b',
        yoruba: '#0f766e',
        edo: '#b4532b'
    });

    const CLOTHING_PALETTE_VARIANTS = Object.freeze({
        'navy-gold': Object.freeze({ blazer: '#102a56', blouse: '#f7f0de', skirt: '#172554', accent: '#d6a23a', shoe: '#171717' }),
        'emerald-cream': Object.freeze({ blazer: '#0f5c46', blouse: '#fff4d6', skirt: '#163b32', accent: '#d8b45a', shoe: '#15231d' }),
        'burgundy-gold': Object.freeze({ blazer: '#7f1d2d', blouse: '#fff0df', skirt: '#3f1624', accent: '#d6a13b', shoe: '#221014' }),
        'charcoal-ivory': Object.freeze({ blazer: '#202633', blouse: '#f8f1df', skirt: '#111827', accent: '#9a7a48', shoe: '#111111' }),
        'teal-coral': Object.freeze({ blazer: '#0f6970', blouse: '#fff3e8', skirt: '#1b4050', accent: '#e27b62', shoe: '#17313a' }),
        'indigo-amber': Object.freeze({ blazer: '#26347a', blouse: '#f8efe1', skirt: '#121a45', accent: '#e0a13a', shoe: '#111827' }),
        'clinical-blue': Object.freeze({ blazer: '#eaf7ff', blouse: '#cfefff', skirt: '#176185', accent: '#2795c8', shoe: '#f5fbff' }),
        'white-clinical': Object.freeze({ blazer: '#ffffff', blouse: '#edf6ff', skirt: '#21364f', accent: '#62a8d8', shoe: '#f6f8fb' }),
        'ankara-warm': Object.freeze({ blazer: '#a32958', blouse: '#f3b43f', skirt: '#24377d', accent: '#ffe066', shoe: '#30172a' }),
        'ankara-cool': Object.freeze({ blazer: '#116466', blouse: '#f7d260', skirt: '#2b2f83', accent: '#ec5f67', shoe: '#132b3a' }),
        'sand-red': Object.freeze({ blazer: '#e6d4b8', blouse: '#fff5dc', skirt: '#8f1d2c', accent: '#b91c1c', shoe: '#3b2418' }),
        'green-white': Object.freeze({ blazer: '#ffffff', blouse: '#f7fbef', skirt: '#19724a', accent: '#f0cf4a', shoe: '#19372d' }),
        'red-plaid': Object.freeze({ blazer: '#b91c2b', blouse: '#fff2df', skirt: '#171717', accent: '#f4d35e', shoe: '#251313' }),
        'lime-rose': Object.freeze({ blazer: '#8cc63f', blouse: '#fff7d9', skirt: '#d9468f', accent: '#f2cf45', shoe: '#1f2937' }),
        'saffron-magenta': Object.freeze({ blazer: '#d8691d', blouse: '#fff0d5', skirt: '#9b1b6b', accent: '#22a7b6', shoe: '#30172a' }),
        'turquoise-ivory': Object.freeze({ blazer: '#128b8b', blouse: '#fffaf0', skirt: '#1d4f91', accent: '#f8fafc', shoe: '#15231d' }),
        'vermilion-black': Object.freeze({ blazer: '#ef4426', blouse: '#fff2df', skirt: '#17171c', accent: '#111827', shoe: '#111111' }),
        'olive-cream': Object.freeze({ blazer: '#778b2f', blouse: '#fff5dc', skirt: '#2e2b35', accent: '#c11f2f', shoe: '#1f1a18' }),
        'violet-blue': Object.freeze({ blazer: '#7c4f8d', blouse: '#efe8ff', skirt: '#7189b6', accent: '#f0cf6a', shoe: '#24213a' }),
        'royal-white': Object.freeze({ blazer: '#f8f5ec', blouse: '#fffdf4', skirt: '#6b4a8b', accent: '#f28c28', shoe: '#201719' }),
        'charcoal-red': Object.freeze({ blazer: '#40333a', blouse: '#fff8e7', skirt: '#171717', accent: '#dc3a2d', shoe: '#101010' }),
        'desert-white': Object.freeze({ blazer: '#f7efe0', blouse: '#ffffff', skirt: '#ece1cc', accent: '#3d5f8c', shoe: '#53301f' }),
        'corporate-navy': Object.freeze({ blazer: '#10213f', blouse: '#f8fafc', skirt: '#111827', accent: '#a36a2c', shoe: '#0f172a' }),
        'banker-grey': Object.freeze({ blazer: '#374151', blouse: '#f9fafb', skirt: '#1f2937', accent: '#94a3b8', shoe: '#111827' }),
        'lawyer-black': Object.freeze({ blazer: '#111111', blouse: '#ffffff', skirt: '#171717', accent: '#c9a04f', shoe: '#0a0a0a' }),
        'academic-black': Object.freeze({ blazer: '#111111', blouse: '#f8fafc', skirt: '#0f1115', accent: '#d6a23a', shoe: '#0a0a0a', headwear: '#111827' }),
        'sport-green': Object.freeze({ blazer: '#087f5b', blouse: '#f8fafc', skirt: '#064e3b', accent: '#facc15', shoe: '#f8fafc' }),
        'sport-red': Object.freeze({ blazer: '#b91c1c', blouse: '#ffffff', skirt: '#7f1d1d', accent: '#facc15', shoe: '#f8fafc' }),
        'sport-blue': Object.freeze({ blazer: '#1d4ed8', blouse: '#ffffff', skirt: '#172554', accent: '#38bdf8', shoe: '#f8fafc' }),
        'military-olive': Object.freeze({ blazer: '#556b2f', blouse: '#e9e3c7', skirt: '#37401f', accent: '#a3a36f', shoe: '#1f2414' }),
        'security-black': Object.freeze({ blazer: '#101820', blouse: '#e8eef5', skirt: '#111827', accent: '#f1c40f', shoe: '#050505' }),
        'chef-white': Object.freeze({ blazer: '#ffffff', blouse: '#f8fafc', skirt: '#2f3542', accent: '#d1d5db', shoe: '#f8fafc' }),
        'school-blue': Object.freeze({ blazer: '#1e3a8a', blouse: '#ffffff', skirt: '#172554', accent: '#f59e0b', shoe: '#111827' }),
        'safety-orange': Object.freeze({ blazer: '#f97316', blouse: '#fff7ed', skirt: '#1f2937', accent: '#facc15', shoe: '#111827' })
    });

    const AGE_MORPHS = Object.freeze({
        child: Object.freeze({ headWidth: 0.24, headHeight: 0.18, neckHeight: -0.08, torsoLength: -0.24, torsoWidth: -0.06, shoulderWidth: -0.22, hipWidth: -0.16, armLength: -0.24, legLength: -0.34, armWidth: -0.08, legWidth: -0.10, handSize: -0.10, footSize: -0.12, eyeSize: 0.05, eyeHeight: 0.03, noseLength: -0.05, lipFullness: -0.03 }),
        teen: Object.freeze({ headWidth: 0.11, headHeight: 0.08, neckHeight: -0.04, torsoLength: -0.11, torsoWidth: -0.03, shoulderWidth: -0.10, hipWidth: -0.06, armLength: -0.10, legLength: -0.12, armWidth: -0.04, legWidth: -0.05, handSize: -0.04, footSize: -0.04, eyeSize: 0.02 }),
        'young-adult': Object.freeze({ headWidth: 0.03, headHeight: 0.02, torsoLength: -0.02, legLength: 0.04 }),
        adult: Object.freeze({}),
        'older-adult': Object.freeze({ headWidth: 0.03, headHeight: 0.02, neckHeight: -0.02, torsoLength: 0.04, shoulderWidth: -0.06, hipWidth: 0.02, legLength: -0.03, browHeight: -0.04, eyeHeight: -0.02, muscleDefinition: -0.18 })
    });

    const BODY_MORPHS = Object.freeze({
        slim: Object.freeze({ torsoWidth: -0.16, shoulderWidth: -0.12, hipWidth: -0.08, armWidth: -0.10, legWidth: -0.10, armLength: 0.03, legLength: 0.04, muscleDefinition: -0.08 }),
        average: Object.freeze({}),
        athletic: Object.freeze({ torsoWidth: 0.06, shoulderWidth: 0.18, hipWidth: 0.03, armWidth: 0.09, legWidth: 0.10, muscleDefinition: 0.28, handSize: 0.03, footSize: 0.03 }),
        full: Object.freeze({ torsoWidth: 0.16, shoulderWidth: 0.07, hipWidth: 0.20, armWidth: 0.09, legWidth: 0.12, handSize: 0.03, footSize: 0.04, muscleDefinition: -0.06, abdomenProjection: 0.08, abdomenWidth: 0.10 }),
        obese: Object.freeze({ torsoWidth: 0.27, shoulderWidth: 0.10, hipWidth: 0.30, armWidth: 0.16, legWidth: 0.18, handSize: 0.04, footSize: 0.06, muscleDefinition: -0.16, abdomenProjection: 0.36, abdomenWidth: 0.30 }),
        'tall-lean': Object.freeze({ torsoWidth: -0.10, shoulderWidth: 0.00, hipWidth: -0.06, torsoLength: 0.03, armLength: 0.07, legLength: 0.10, armWidth: -0.07, legWidth: -0.07, muscleDefinition: -0.03 })
    });

    const HEIGHT_MORPHS = Object.freeze({
        short: Object.freeze({ torsoLength: -0.08, armLength: -0.09, legLength: -0.16, footSize: -0.03 }),
        average: Object.freeze({}),
        tall: Object.freeze({ torsoLength: 0.05, armLength: 0.06, legLength: 0.08, footSize: 0.03 }),
        'very-tall': Object.freeze({ torsoLength: 0.09, armLength: 0.10, legLength: 0.16, footSize: 0.05 })
    });

    const FACE_SHAPE_MORPHS = Object.freeze({
        oval: Object.freeze({}),
        round: Object.freeze({ headWidth: 0.006, headHeight: -0.010, neckWidth: -0.004 }),
        heart: Object.freeze({ headWidth: 0.005, headHeight: 0.004, lipFullness: 0.006 }),
        square: Object.freeze({ headWidth: 0.002, neckWidth: 0.002, browLength: 0.002, noseWidth: 0.002 }),
        long: Object.freeze({ headWidth: -0.008, headHeight: 0.020, neckHeight: 0.004, noseLength: 0.006, lipWidth: -0.004 }),
        'soft-diamond': Object.freeze({ headWidth: -0.004, headHeight: 0.006, eyeSpacing: 0.004, lipFullness: 0.004 })
    });

    const EYE_STYLE_MORPHS = Object.freeze({
        almond: Object.freeze({}),
        round: Object.freeze({ eyeSize: 0.06, eyeHeight: 0.05, browHeight: 0.02 }),
        hooded: Object.freeze({ eyeSize: -0.03, eyeHeight: -0.07, browHeight: -0.06, browLength: 0.02 }),
        wide: Object.freeze({ eyeSpacing: 0.08, eyeSize: 0.03, browLength: 0.04 })
    });

    const NOSE_STYLE_MORPHS = Object.freeze({
        soft: Object.freeze({}),
        broad: Object.freeze({ noseWidth: 0.16, noseLength: 0.02 }),
        narrow: Object.freeze({ noseWidth: -0.13, noseLength: 0.04 }),
        rounded: Object.freeze({ noseWidth: 0.07, noseLength: 0.07 })
    });

    const LIP_STYLE_MORPHS = Object.freeze({
        natural: Object.freeze({}),
        full: Object.freeze({ lipFullness: 0.18, lipWidth: 0.07, lipHeight: 0.08 }),
        defined: Object.freeze({ lipFullness: 0.08, lipWidth: 0.04, lipHeight: 0.03 }),
        subtle: Object.freeze({ lipFullness: -0.11, lipWidth: -0.05, lipHeight: -0.06 })
    });

    const PRESENTATION_VISUAL_PROFILES = Object.freeze({
        female: Object.freeze({
            faceWidth: -0.25,
            faceHeight: 0.2,
            foreheadScale: -0.02,
            cheekScale: -0.01,
            jawScale: -0.05,
            chinScale: -0.035,
            chinDrop: 0,
            browStroke: -0.18,
            browHeight: 0.4,
            noseWidth: -0.08,
            noseLength: -0.02,
            lipFullness: 0.10,
            lipWidth: 0.04,
            torsoWidth: -0.02,
            shoulderWidth: -0.06,
            hipWidth: 0.08,
            armWidth: -0.02,
            legWidth: -0.02,
            muscleDefinition: -0.04
        }),
        male: Object.freeze({
            faceWidth: 0.18,
            faceHeight: 0.04,
            foreheadScale: 0.01,
            cheekScale: 0.01,
            jawScale: 0.04,
            chinScale: 0.02,
            chinDrop: 0.18,
            browStroke: 0.18,
            browHeight: -0.12,
            noseWidth: 0.08,
            noseLength: 0.03,
            lipFullness: -0.08,
            lipWidth: -0.04,
            torsoWidth: 0.05,
            shoulderWidth: 0.10,
            hipWidth: -0.03,
            armWidth: 0.04,
            legWidth: 0.03,
            muscleDefinition: 0.12
        }),
        nonbinary: Object.freeze({
            faceWidth: 0.12,
            faceHeight: 0,
            foreheadScale: 0,
            cheekScale: 0.005,
            jawScale: 0.01,
            chinScale: 0,
            chinDrop: 0.12,
            browStroke: 0.08,
            browHeight: 0,
            noseWidth: 0.02,
            noseLength: 0,
            lipFullness: 0,
            lipWidth: 0,
            torsoWidth: 0,
            shoulderWidth: 0.02,
            hipWidth: 0.02,
            armWidth: 0,
            legWidth: 0,
            muscleDefinition: 0.02
        })
    });

    const EYE_STYLE_VISUAL_PROFILES = Object.freeze({
        almond: Object.freeze({ halfWidth: 7.7, halfHeight: 3.4, spacing: 0 }),
        round: Object.freeze({ halfWidth: 7.7, halfHeight: 4.2, spacing: 0 }),
        hooded: Object.freeze({ halfWidth: 7.7, halfHeight: 2.6, spacing: 0 }),
        wide: Object.freeze({ halfWidth: 8.8, halfHeight: 3.4, spacing: 1.5 })
    });
    const NOSE_STYLE_VISUAL_PROFILES = Object.freeze({
        soft: Object.freeze({ halfWidth: 4.15, profileProjection: -0.9, threeQuarterWidth: 0 }),
        broad: Object.freeze({ halfWidth: 5.2, profileProjection: 0.35, threeQuarterWidth: 1.15 }),
        narrow: Object.freeze({ halfWidth: 3.1, profileProjection: -0.55, threeQuarterWidth: -0.85 }),
        rounded: Object.freeze({ halfWidth: 4.15, profileProjection: -0.15, threeQuarterWidth: 0.35 })
    });
    const LIP_STYLE_VISUAL_PROFILES = Object.freeze({
        natural: Object.freeze({ fullness: 1, width: 1, projection: 0, upperColor: '#8e2f33', lowerColor: '#b85b58' }),
        full: Object.freeze({ fullness: 1.28, width: 1.08, projection: 1.1, upperColor: '#8e2f33', lowerColor: '#b85b58' }),
        subtle: Object.freeze({ fullness: 0.68, width: 0.90, projection: -0.7, upperColor: '#8e2f33', lowerColor: '#b85b58' }),
        defined: Object.freeze({ fullness: 1.12, width: 1, projection: 0.55, upperColor: '#7f2730', lowerColor: '#c86662' }),
        wide: Object.freeze({ fullness: 0.95, width: 1.22, projection: 0, upperColor: '#8e2f33', lowerColor: '#b85b58' })
    });

    const FACE_SHAPE_VISUAL_PROFILES = Object.freeze({
        oval: Object.freeze({ faceWidth: 0, faceHeight: 0, foreheadScale: 0.84, cheekScale: 0.92, jawScale: 0.64, chinScale: 0.28, chinDrop: 0 }),
        round: Object.freeze({ faceWidth: 1.1, faceHeight: -1.0, foreheadScale: 0.865, cheekScale: 0.985, jawScale: 0.72, chinScale: 0.34, chinDrop: -0.55 }),
        heart: Object.freeze({ faceWidth: 0.45, faceHeight: 0.25, foreheadScale: 0.92, cheekScale: 0.955, jawScale: 0.57, chinScale: 0.22, chinDrop: 0.55 }),
        square: Object.freeze({ faceWidth: 0.75, faceHeight: -0.25, foreheadScale: 0.875, cheekScale: 0.945, jawScale: 0.76, chinScale: 0.36, chinDrop: 0.42 }),
        long: Object.freeze({ faceWidth: -1.25, faceHeight: 1.35, foreheadScale: 0.815, cheekScale: 0.895, jawScale: 0.58, chinScale: 0.24, chinDrop: 0.75 }),
        'soft-diamond': Object.freeze({ faceWidth: -0.55, faceHeight: 0.35, foreheadScale: 0.85, cheekScale: 0.99, jawScale: 0.55, chinScale: 0.22, chinDrop: 0.38 })
    });
    const FACE_SHAPE_PROFILE_BLEND = 0.24;

    const HEAD_TYPE_VISUAL_PROFILES = Object.freeze({
        balanced: Object.freeze({ crownLift: 0, crownShift: -0.4, occiputDepth: 1.6, templeDepth: 1.0, foreheadShift: 0.8, facialDepth: 0.7, chinDrop: -0.5, frontWidth: 2.4, frontHeight: -0.7, hairlineDrop: 2.4 }),
        'round-cranium': Object.freeze({ crownLift: -0.8, crownShift: -1.2, occiputDepth: 4.4, templeDepth: 1.8, foreheadShift: 1.4, facialDepth: 1.2, chinDrop: -1.4, frontWidth: 2.6, frontHeight: -0.5, hairlineDrop: 2.8 }),
        'long-narrow': Object.freeze({ crownLift: -5.0, crownShift: 1.0, occiputDepth: -2.4, templeDepth: -1.5, foreheadShift: -0.9, facialDepth: -1.3, chinDrop: 3.2, frontWidth: -2.2, frontHeight: 3.4, hairlineDrop: 1.8 }),
        'broad-short': Object.freeze({ crownLift: 3.1, crownShift: -1.5, occiputDepth: 5.5, templeDepth: 2.3, foreheadShift: 1.9, facialDepth: 2.2, chinDrop: -2.3, frontWidth: 4.3, frontHeight: -2.7, hairlineDrop: 3.0 }),
        'high-crown': Object.freeze({ crownLift: -6.3, crownShift: -0.5, occiputDepth: 1.7, templeDepth: 0.5, foreheadShift: 0.4, facialDepth: 0.2, chinDrop: 0.7, frontWidth: 0.7, frontHeight: 3.8, hairlineDrop: 2.1 }),
        'low-crown': Object.freeze({ crownLift: 4.2, crownShift: 0.4, occiputDepth: 2.4, templeDepth: 1.3, foreheadShift: 1.1, facialDepth: 0.9, chinDrop: -1.0, frontWidth: 2.1, frontHeight: -2.8, hairlineDrop: 2.8 })
    });

    const SIDE_FACE_SHAPE_PROFILES = Object.freeze({
        oval: Object.freeze({ cheek: 0, jawDepth: 0, chin: 0, chinDrop: 0, forehead: 0 }),
        round: Object.freeze({ cheek: 1.8, jawDepth: 1.4, chin: -0.7, chinDrop: -1.2, forehead: 0.6 }),
        heart: Object.freeze({ cheek: 1.4, jawDepth: -1.5, chin: 0.7, chinDrop: 0.5, forehead: 1.1 }),
        square: Object.freeze({ cheek: 0.8, jawDepth: 2.2, chin: 1.0, chinDrop: 0.7, forehead: 0.6 }),
        long: Object.freeze({ cheek: -0.7, jawDepth: -0.4, chin: 0.4, chinDrop: 2.7, forehead: -0.5 }),
        'soft-diamond': Object.freeze({ cheek: 2.0, jawDepth: -1.2, chin: 0.3, chinDrop: 0.8, forehead: -0.2 })
    });

    const TOP_BY_OUTFIT = Object.freeze({
        ...Object.fromEntries(['field-shirt', 'bib-overalls', 'mechanic-coveralls', 'trade-apron', 'vendor-apron', 'fishing-vest', 'driver-uniform', 'clerical-shirt'].map(id => [id, id])),
        casual: 'shirt',
        'smart-casual': 'shirt',
        'business-suit': 'suit',
        'plain-business-suit': 'plain-business-suit',
        'corporate-dress': 'blazer',
        'executive-suit': 'executive-suit',
        'double-breasted-suit': 'double-breasted-suit',
        'three-piece-suit': 'three-piece-suit',
        'pant-suit': 'pant-suit',
        'corporate-blouse-skirt': 'office-blouse',
        'formal-shirt-tie': 'formal-shirt-tie',
        'lawyer-black-suit': 'lawyer-gown-top',
        'banker-suit': 'banker-jacket',
        'office-casual': 'corporate-vest',
        'teacher-cardigan': 'teacher-cardigan',
        'media-presenter': 'media-blazer',
        'engineer-field': 'engineer-vest',
        'scientist-coat': 'lab-coat',
        'chef-uniform': 'chef-coat',
        'pilot-uniform': 'pilot-jacket',
        'security-uniform': 'security-shirt',
        'military-fatigues': 'military-fatigue-top',
        'artisan-workwear': 'workwear-shirt',
        'farmer-workwear': 'workwear-shirt',
        tracksuit: 'tracksuit-top',
        'football-kit': 'jersey-top',
        'basketball-kit': 'jersey-top',
        'gym-wear': 'gym-top',
        'event-formal': 'event-top',
        'religious-formal': 'religious-robe-top',
        lecturer: 'blazer',
        'academic-robe': 'academic-gown-top',
        doctor: 'lab-coat',
        scrubs: 'scrubs-top',
        nurse: 'scrubs-top',
        'lab-coat': 'lab-coat',
        student: 'shirt',
        'student-casual': 't-shirt',
        'ankara-dress': 'blouse',
        'ankara-shirt': 'shirt',
        'ankara-peplum': 'blouse',
        'senator-wear': 'senator-top',
        agbada: 'agbada-top',
        'iro-buba': 'buba',
        'george-wrapper': 'buba',
        'isi-agu': 'shirt',
        'baban-riga': 'agbada-top',
        dashiki: 'dashiki-top',
        'modest-dress': 'modest-top',
        'maasai-wrap': 'dashiki-top',
        'sari-wrap': 'blouse',
        suspenders: 'suspenders-shirt',
        'mandarin-suit': 'mandarin-jacket',
        'cheongsam-dress': 'cheongsam-top',
        'kimono-robe': 'kimono-top',
        'folk-vest-apron': 'folk-vest',
        poncho: 'poncho-top',
        'embroidered-national-robe': 'embroidered-robe-top',
        'linen-drape': 'linen-drape-top'
    });

    const BOTTOM_BY_OUTFIT = Object.freeze({
        ...Object.fromEntries(['field-shirt', 'bib-overalls', 'mechanic-coveralls', 'trade-apron', 'vendor-apron', 'fishing-vest', 'driver-uniform', 'clerical-shirt'].map(id => [id, 'trousers'])),
        casual: 'trousers',
        'smart-casual': 'trousers',
        'business-suit': 'trousers',
        'plain-business-suit': 'plain-suit-trousers',
        'corporate-dress': 'skirt-straight',
        'executive-suit': 'suit-trousers',
        'double-breasted-suit': 'suit-trousers',
        'three-piece-suit': 'suit-trousers',
        'pant-suit': 'wide-leg-trousers',
        'corporate-blouse-skirt': 'pencil-skirt',
        'formal-shirt-tie': 'suit-trousers',
        'lawyer-black-suit': 'suit-trousers',
        'banker-suit': 'suit-trousers',
        'office-casual': 'trousers',
        'teacher-cardigan': 'skirt-straight',
        'media-presenter': 'suit-trousers',
        'engineer-field': 'workwear-trousers',
        'scientist-coat': 'trousers',
        'chef-uniform': 'chef-trousers',
        'pilot-uniform': 'pilot-trousers',
        'security-uniform': 'security-trousers',
        'military-fatigues': 'military-fatigue-pants',
        'artisan-workwear': 'workwear-trousers',
        'farmer-workwear': 'workwear-trousers',
        tracksuit: 'tracksuit-pants',
        'football-kit': 'football-shorts',
        'basketball-kit': 'basketball-shorts',
        'gym-wear': 'gym-leggings',
        'event-formal': 'event-skirt',
        'religious-formal': 'religious-robe-bottom',
        lecturer: 'skirt-straight',
        'academic-robe': 'academic-gown-bottom',
        doctor: 'trousers',
        scrubs: 'scrubs-pants',
        nurse: 'scrubs-pants',
        'lab-coat': 'trousers',
        student: 'skirt-pleated',
        'student-casual': 'trousers',
        'ankara-dress': 'skirt-straight',
        'ankara-shirt': 'trousers',
        'ankara-peplum': 'skirt-straight',
        'senator-wear': 'senator-trousers',
        agbada: 'senator-trousers',
        'iro-buba': 'iro-wrapper',
        'george-wrapper': 'george-wrapper-bottom',
        'isi-agu': 'trousers',
        'baban-riga': 'senator-trousers',
        dashiki: 'trousers',
        'modest-dress': 'skirt-straight',
        'maasai-wrap': 'maasai-wrapper',
        'sari-wrap': 'sari-wrapper',
        suspenders: 'trousers',
        'mandarin-suit': 'trousers',
        'cheongsam-dress': 'cheongsam-skirt',
        'kimono-robe': 'kimono-robe-bottom',
        'folk-vest-apron': 'apron-skirt',
        poncho: 'trousers',
        'embroidered-national-robe': 'robe-bottom',
        'linen-drape': 'linen-drape-bottom'
    });

    const SLEEVE_BY_TOP = Object.freeze({
        'field-shirt': 'elbow',
        'bib-overalls': 'elbow',
        'mechanic-coveralls': 'wrist',
        'trade-apron': 'elbow',
        'vendor-apron': 'elbow',
        'fishing-vest': 'elbow',
        'driver-uniform': 'elbow',
        'clerical-shirt': 'wrist',
        blouse: 'elbow',
        't-shirt': 'short',
        shirt: 'elbow',
        safari: 'wrist',
        blazer: 'wrist',
        suit: 'wrist',
        'plain-business-suit': 'wrist',
        'executive-suit': 'wrist',
        'double-breasted-suit': 'wrist',
        'three-piece-suit': 'wrist',
        'pant-suit': 'wrist',
        'formal-shirt-tie': 'wrist',
        'lawyer-gown-top': 'wrist',
        'academic-gown-top': 'wrist',
        'banker-jacket': 'wrist',
        'office-blouse': 'elbow',
        'corporate-vest': 'short',
        'teacher-cardigan': 'wrist',
        'media-blazer': 'wrist',
        'engineer-vest': 'short',
        'chef-coat': 'wrist',
        'pilot-jacket': 'wrist',
        'security-shirt': 'short',
        'military-fatigue-top': 'wrist',
        'workwear-shirt': 'elbow',
        'tracksuit-top': 'wrist',
        'jersey-top': 'short',
        'gym-top': 'sleeveless',
        'school-shirt': 'short',
        'event-top': 'elbow',
        'religious-robe-top': 'wrist',
        'senator-top': 'wrist',
        'agbada-top': 'wrist',
        buba: 'three-quarter',
        'dashiki-top': 'elbow',
        'modest-top': 'wrist',
        'suspenders-shirt': 'wrist',
        'mandarin-jacket': 'wrist',
        'cheongsam-top': 'short',
        'kimono-top': 'wrist',
        'folk-vest': 'wrist',
        'poncho-top': 'elbow',
        'embroidered-robe-top': 'wrist',
        'linen-drape-top': 'shoulder',
        'scrubs-top': 'short',
        'lab-coat': 'wrist'
    });

    const SLEEVE_END_Y = Object.freeze({
        sleeveless: 20,
        shoulder: 48,
        short: 84,
        elbow: 124,
        'three-quarter': 166,
        wrist: 207
    });

    const FACE_PROPERTIES = Object.freeze({
        blink: { min: 0, max: 1, defaultValue: 0 },
        mouthOpen: { min: 0, max: 1, defaultValue: 0.08 },
        mouthWide: { min: -1, max: 1, defaultValue: 0 },
        mouthRound: { min: 0, max: 1, defaultValue: 0 },
        lipPress: { min: 0, max: 1, defaultValue: 0 },
        jawOpen: { min: 0, max: 1, defaultValue: 0 },
        mouthOpeningGain: { min: 0.75, max: 3.2, defaultValue: 1 },
        teethVisibility: { min: 0, max: 1, defaultValue: .6 },
        upperLipLift: { min: -1, max: 1, defaultValue: 0 },
        lowerLipDrop: { min: -1, max: 1, defaultValue: 0 },
        smile: { min: -1, max: 1, defaultValue: 0.22 },
        gazeX: { min: -8, max: 8, defaultValue: 0 },
        gazeY: { min: -5, max: 5, defaultValue: 0 },
        browRaise: { min: -6, max: 6, defaultValue: 0 },
        headNod: { min: -8, max: 8, defaultValue: 0 },
        headTilt: { min: -8, max: 8, defaultValue: 0 },
        headTurn: { min: -1, max: 1, defaultValue: 0 },
        frontHeadYaw: { min: -3, max: 3, defaultValue: 0 },
        rearFaceReveal: { min: 0, max: 1, defaultValue: 0 },
        listening: { min: 0, max: 1, defaultValue: 0 }
    });

    const FACE_ANIMATIONS = Object.freeze({
        speaking: Object.freeze([
            { t: 0, mouthOpen: 0.08, upperLipLift: 0, lowerLipDrop: 0, smile: 0.22, browRaise: 0, headNod: 0 },
            { t: 0.18, mouthOpen: 0.52, upperLipLift: 0.18, lowerLipDrop: 0.62, smile: 0.26, browRaise: 0.7, headNod: 0.4 },
            { t: 0.38, mouthOpen: 0.18, upperLipLift: 0.04, lowerLipDrop: 0.16, smile: 0.20, browRaise: 0.1, headNod: -0.2 },
            { t: 0.58, mouthOpen: 0.60, upperLipLift: 0.22, lowerLipDrop: 0.72, smile: 0.28, browRaise: 0.5, headNod: 0.5 },
            { t: 0.78, mouthOpen: 0.20, upperLipLift: 0.05, lowerLipDrop: 0.18, smile: 0.22, browRaise: 0.1, headNod: -0.1 },
            { t: 1, mouthOpen: 0.08, upperLipLift: 0, lowerLipDrop: 0, smile: 0.22, browRaise: 0, headNod: 0 }
        ]),
        listening: Object.freeze([
            { t: 0, listening: 0.25, gazeX: 0, gazeY: 0, browRaise: 0.4, mouthOpen: 0.02 },
            { t: 0.35, listening: 1, gazeX: 1.2, gazeY: 0.6, browRaise: 1.4, mouthOpen: 0.02 },
            { t: 0.75, listening: 0.45, gazeX: -1.0, gazeY: 0.2, browRaise: 0.7, mouthOpen: 0.02 },
            { t: 1, listening: 0.25, gazeX: 0, gazeY: 0, browRaise: 0.4, mouthOpen: 0.02 }
        ]),
        blink: Object.freeze([
            { t: 0, blink: 0 },
            { t: 0.42, blink: 1 },
            { t: 0.62, blink: 1 },
            { t: 1, blink: 0 }
        ]),
        emphasis: Object.freeze([
            { t: 0, browRaise: 0, gazeX: 0, headTilt: 0 },
            { t: 0.45, browRaise: 2.2, gazeX: 1.8, headTilt: -2.2 },
            { t: 1, browRaise: 0, gazeX: 0, headTilt: 0 }
        ])
    });

    const FACE_PRESETS = Object.freeze({
        neutral: Object.freeze({
            id: 'neutral',
            name: 'Neutral',
            description: 'Relaxed face with natural mouth rest.',
            state: Object.freeze({ blink: 0, mouthOpen: 0.08, smile: 0.22, gazeX: 0, gazeY: 0, browRaise: 0, headNod: 0, headTilt: 0, headTurn: 0, rearFaceReveal: 0, listening: 0 })
        }),
        'warm-smile': Object.freeze({
            id: 'warm-smile',
            name: 'Warm Smile',
            description: 'Friendly smile for introductions and greetings.',
            state: Object.freeze({ blink: 0, mouthOpen: 0.03, smile: 0.62, gazeX: 0, gazeY: 0, browRaise: 0.45, headNod: 0, headTilt: 0, headTurn: 0, rearFaceReveal: 0, listening: 0 })
        }),
        speaking: Object.freeze({
            id: 'speaking',
            name: 'Speaking',
            description: 'Open speaking mouth with light brow energy.',
            state: Object.freeze({ blink: 0, mouthOpen: 0.44, upperLipLift: 0.16, lowerLipDrop: 0.54, smile: 0.18, gazeX: 0, gazeY: 0, browRaise: 0.55, headNod: 0.7, headTilt: 0, headTurn: 0, rearFaceReveal: 0, listening: 0 })
        }),
        listening: Object.freeze({
            id: 'listening',
            name: 'Listening',
            description: 'Attentive listening expression with softened mouth.',
            state: Object.freeze({ blink: 0, mouthOpen: 0.02, smile: 0.12, gazeX: 0.6, gazeY: 0.2, browRaise: 1.2, headNod: 0, headTilt: -1.2, headTurn: 0, rearFaceReveal: 0, listening: 0.8 })
        }),
        'serious-focus': Object.freeze({
            id: 'serious-focus',
            name: 'Serious Focus',
            description: 'Composed, professional, slightly serious face.',
            state: Object.freeze({ blink: 0, mouthOpen: 0.01, smile: -0.22, gazeX: 0, gazeY: -0.1, browRaise: -0.45, headNod: 0, headTilt: 0, headTurn: 0, rearFaceReveal: 0, listening: 0 })
        })
    });

    const FACE_RIG_SCHEMA = Object.freeze({
        version: 3,
        targetPart: 'head-neck',
        renderMode: 'rerender-svg-state',
        motionGroup: 'head-motion',
        layers: FACIAL_LAYER_ROLES,
        stateProperties: Object.freeze(Object.keys(FACE_PROPERTIES)),
        presets: Object.freeze(Object.keys(FACE_PRESETS)),
        layerBindings: Object.freeze({
            blink: Object.freeze(['eye-left', 'eye-right', 'pupil-left', 'pupil-right']),
            gazeX: Object.freeze(['pupil-left', 'pupil-right']),
            gazeY: Object.freeze(['pupil-left', 'pupil-right']),
            browRaise: Object.freeze(['brow-left', 'brow-right']),
            mouthOpen: Object.freeze(['mouth-upper', 'mouth-lower']),
            mouthWide: Object.freeze(['mouth-upper', 'mouth-lower']),
            mouthRound: Object.freeze(['mouth-upper', 'mouth-lower']),
            lipPress: Object.freeze(['mouth-upper', 'mouth-lower']),
            jawOpen: Object.freeze(['mouth-upper', 'mouth-lower']),
            mouthOpeningGain: Object.freeze(['mouth-upper', 'mouth-lower', 'mouth-opening']),
            upperLipLift: Object.freeze(['mouth-upper']),
            lowerLipDrop: Object.freeze(['mouth-lower']),
            smile: Object.freeze(['mouth-upper', 'mouth-lower']),
            headNod: Object.freeze(['head-motion']),
            headTilt: Object.freeze(['head-motion']),
            listening: Object.freeze(['face-base'])
        })
    });
    const SIDE_FACE_LAYER_BINDINGS = Object.freeze({
        blink: Object.freeze(['eye-side', 'iris-side', 'pupil-side']),
        gazeX: Object.freeze(['iris-side', 'pupil-side']),
        gazeY: Object.freeze(['iris-side', 'pupil-side']),
        browRaise: Object.freeze(['brow-side']),
        mouthOpen: Object.freeze(['mouth-upper', 'mouth-lower']),
        mouthWide: Object.freeze(['mouth-upper', 'mouth-lower']),
        mouthRound: Object.freeze(['mouth-upper', 'mouth-lower']),
        lipPress: Object.freeze(['mouth-upper', 'mouth-lower']),
        jawOpen: Object.freeze(['mouth-upper', 'mouth-lower']),
        mouthOpeningGain: Object.freeze(['mouth-upper', 'mouth-lower', 'mouth-opening']),
        upperLipLift: Object.freeze(['mouth-upper']),
        lowerLipDrop: Object.freeze(['mouth-lower']),
        smile: Object.freeze(['mouth-upper', 'mouth-lower']),
        headNod: Object.freeze(['head-motion']),
        headTilt: Object.freeze(['head-motion']),
        listening: Object.freeze(['face-base'])
    });
    const BACK_3Q_FACE_LAYER_BINDINGS = Object.freeze({
        blink: Object.freeze(['eye-side', 'pupil-side']),
        gazeX: Object.freeze(['pupil-side']),
        gazeY: Object.freeze(['pupil-side']),
        browRaise: Object.freeze(['brow-side']),
        mouthOpen: Object.freeze(['mouth-upper', 'mouth-lower']),
        mouthWide: Object.freeze(['mouth-upper', 'mouth-lower']),
        mouthRound: Object.freeze(['mouth-upper', 'mouth-lower']),
        lipPress: Object.freeze(['mouth-upper', 'mouth-lower']),
        jawOpen: Object.freeze(['mouth-upper', 'mouth-lower']),
        mouthOpeningGain: Object.freeze(['mouth-upper', 'mouth-lower', 'mouth-opening']),
        upperLipLift: Object.freeze(['mouth-upper']),
        lowerLipDrop: Object.freeze(['mouth-lower']),
        smile: Object.freeze(['mouth-upper', 'mouth-lower']),
        headNod: Object.freeze(['head-motion']),
        headTilt: Object.freeze(['head-motion']),
        headTurn: Object.freeze(['back-3q-face-reveal']),
        rearFaceReveal: Object.freeze(['back-3q-face-reveal']),
        listening: Object.freeze(['face-base'])
    });
    const FRONT_3Q_FACE_LAYER_BINDINGS = Object.freeze({
        ...FACE_RIG_SCHEMA.layerBindings,
        // This state is intentionally dormant in front artwork. It is carried
        // through a recorded turnaround and becomes renderable after the view
        // changes to the corresponding back 3/4 asset.
        rearFaceReveal: Object.freeze(['back-3q-face-reveal'])
    });

    const ADJUST_PROPERTIES = Object.freeze({
        headScale: { min: -0.30, max: 0.36, defaultValue: 0 },
        headWidth: { min: -0.30, max: 0.36, defaultValue: 0 },
        headHeight: { min: -0.25, max: 0.32, defaultValue: 0 },
        faceWidth: { min: -0.45, max: 0.55, defaultValue: 0 },
        foreheadProjection: { min: -0.35, max: 0.45, defaultValue: 0 },
        browRidge: { min: -0.40, max: 0.45, defaultValue: 0 },
        cheekFullness: { min: -0.40, max: 0.48, defaultValue: 0 },
        jawDepth: { min: -0.40, max: 0.48, defaultValue: 0 },
        chinProjection: { min: -0.40, max: 0.48, defaultValue: 0 },
        chinHeight: { min: -0.35, max: 0.40, defaultValue: 0 },
        occiputDepth: { min: -0.35, max: 0.45, defaultValue: 0 },
        earSize: { min: -0.35, max: 0.42, defaultValue: 0 },
        earHeight: { min: -0.35, max: 0.35, defaultValue: 0 },
        hairVolume: { min: -0.35, max: 0.42, defaultValue: 0 },
        hairlineHeight: { min: -0.35, max: 0.45, defaultValue: 0 },
        headwearWidth: { min: -0.45, max: 0.55, defaultValue: 0 },
        headwearHeight: { min: -0.45, max: 0.55, defaultValue: 0 },
        headwearLift: { min: -0.55, max: 0.55, defaultValue: 0 },
        headwearTilt: { min: -0.55, max: 0.55, defaultValue: 0 },
        neckLength: { min: -0.32, max: 0.32, defaultValue: 0 },
        neckWidth: { min: -0.35, max: 0.35, defaultValue: 0 },
        neckHeight: { min: -0.32, max: 0.32, defaultValue: 0 },
        torsoWidth: { min: -0.34, max: 0.34, defaultValue: 0 },
        torsoLength: { min: -0.30, max: 0.40, defaultValue: 0 },
        topWearLength: { min: -0.45, max: 0.55, defaultValue: 0 },
        chestProjection: { min: -0.30, max: 0.50, defaultValue: 0 },
        breastProjection: { min: -0.30, max: 0.55, defaultValue: 0 },
        abdomenProjection: { min: -0.35, max: 1, defaultValue: 0 },
        abdomenWidth: { min: -0.30, max: 0.55, defaultValue: 0 },
        backCurve: { min: -0.35, max: 0.45, defaultValue: 0 },
        buttockProjection: { min: -0.30, max: 0.55, defaultValue: 0 },
        armLength: { min: -0.34, max: 0.30, defaultValue: 0 },
        armWidth: { min: -0.36, max: 0.38, defaultValue: 0 },
        handSize: { min: -0.35, max: 0.45, defaultValue: 0 },
        legLength: { min: -0.32, max: 0.45, defaultValue: 0 },
        legWidth: { min: -0.36, max: 0.38, defaultValue: 0 },
        bottomWearLength: { min: -0.45, max: 0.55, defaultValue: 0 },
        muscleDefinition: { min: -0.45, max: 0.55, defaultValue: 0 },
        footSize: { min: -0.35, max: 0.42, defaultValue: 0 },
        shoulderWidth: { min: -0.34, max: 0.34, defaultValue: 0 },
        hipWidth: { min: -0.34, max: 0.38, defaultValue: 0 },
        eyeSize: { min: -0.35, max: 0.45, defaultValue: 0 },
        eyeSpacing: { min: -0.35, max: 0.45, defaultValue: 0 },
        eyeHeight: { min: -0.40, max: 0.40, defaultValue: 0 },
        browHeight: { min: -0.50, max: 0.58, defaultValue: 0 },
        browLength: { min: -0.42, max: 0.55, defaultValue: 0 },
        faceShapeStrength: { min: -1, max: 1, defaultValue: 0 },
        noseWidth: { min: -0.35, max: 0.42, defaultValue: 0 },
        noseLength: { min: -0.40, max: 0.45, defaultValue: 0 },
        lipFullness: { min: -0.40, max: 0.50, defaultValue: 0 },
        lipHeight: { min: -0.40, max: 0.40, defaultValue: 0 },
        lipWidth: { min: -0.35, max: 0.45, defaultValue: 0 }
    });

    const ASSETS = Object.freeze({
        [DEFAULT_ASSET_ID]: Object.freeze({
            id: DEFAULT_ASSET_ID,
            presetId: 'ada-lecturer-premium',
            name: 'Ada - Premium Lecturer',
            view: 'front',
            engine: 'svg-armature-premium',
            assetProfile: 'front-six-part-premium',
            sourcePath: DEFAULT_SOURCE_PATH,
            masterFile: 'master.svg',
            partFiles: PART_FILE_MAP,
            facialLayers: FACIAL_LAYER_ROLES,
            authoring: PREMIUM_AUTHORING,
            calibrationVersion: 1,
            reference: Object.freeze({ width: 260, height: 644 }),
            roles: PART_KEYS,
            order: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm']),
            parts: Object.freeze({
                'head-neck': Object.freeze({ x: 79, y: 43, width: 98, height: 150, pivotX: 0.5, pivotY: 0.86 }),
                torso: Object.freeze({ x: 62, y: 148, width: 135, height: 223, pivotX: 0.5, pivotY: 0.30 }),
                'right-arm': Object.freeze({ x: 31, y: 179, width: 66.5, height: 224, pivotX: 0.52, pivotY: 0.08 }),
                'left-arm': Object.freeze({ x: 164, y: 178, width: 66.5, height: 224, pivotX: 0.48, pivotY: 0.08 }),
                'right-leg': Object.freeze({ x: 72, y: 326, width: 56, height: 317, pivotX: 0.52, pivotY: 0.06 }),
                'left-leg': Object.freeze({ x: 132, y: 326, width: 56, height: 317, pivotX: 0.48, pivotY: 0.06 })
            }),
            joints: Object.freeze({
                torso: Object.freeze({
                    waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
                }),
                'head-neck': Object.freeze({
                    neck: Object.freeze({ position: 0.17, crossOffset: 0.50 })
                }),
                'right-arm': Object.freeze({
                    'right-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.72 }),
                    'right-elbow': Object.freeze({ position: 0.46, crossOffset: 0.48 }),
                    'right-wrist': Object.freeze({ position: 0.84, crossOffset: 0.44 })
                }),
                'left-arm': Object.freeze({
                    'left-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.28 }),
                    'left-elbow': Object.freeze({ position: 0.46, crossOffset: 0.52 }),
                    'left-wrist': Object.freeze({ position: 0.84, crossOffset: 0.56 })
                }),
                'right-leg': Object.freeze({
                    'right-hip': Object.freeze({ position: 0.06, crossOffset: 0.58 }),
                    'right-knee': Object.freeze({ position: 0.48, crossOffset: 0.51 }),
                    'right-ankle': Object.freeze({ position: 0.85, crossOffset: 0.48 })
                }),
                'left-leg': Object.freeze({
                    'left-hip': Object.freeze({ position: 0.06, crossOffset: 0.42 }),
                    'left-knee': Object.freeze({ position: 0.48, crossOffset: 0.49 }),
                    'left-ankle': Object.freeze({ position: 0.85, crossOffset: 0.52 })
                })
            }),
            pins: Object.freeze({
                'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'left-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.36, anchorY: 0.84, rotation: 'inherit' }),
                'left-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.64, anchorY: 0.84, rotation: 'inherit' })
            })
        }),
        'male-lecturer-front': Object.freeze({
            id: 'male-lecturer-front',
            presetId: 'male-lecturer-premium',
            name: 'Male Lecturer - Premium',
            view: 'front',
            engine: 'svg-armature-premium',
            assetProfile: 'front-six-part-premium',
            sourcePath: 'assets/svg-characters/male-lecturer/front',
            masterFile: 'master.svg',
            partFiles: PART_FILE_MAP,
            facialLayers: FACIAL_LAYER_ROLES,
            authoring: PREMIUM_AUTHORING,
            calibrationVersion: 1,
            reference: Object.freeze({ width: 268, height: 666 }),
            roles: PART_KEYS,
            order: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm']),
            parts: Object.freeze({
                'head-neck': Object.freeze({ x: 83, y: 42, width: 96, height: 148, pivotX: 0.5, pivotY: 0.86 }),
                torso: Object.freeze({ x: 58, y: 146, width: 148, height: 230, pivotX: 0.5, pivotY: 0.30 }),
                'right-arm': Object.freeze({ x: 24, y: 178, width: 68, height: 232, pivotX: 0.54, pivotY: 0.08 }),
                'left-arm': Object.freeze({ x: 176, y: 178, width: 68, height: 232, pivotX: 0.46, pivotY: 0.08 }),
                'right-leg': Object.freeze({ x: 74, y: 331, width: 58, height: 334, pivotX: 0.52, pivotY: 0.06 }),
                'left-leg': Object.freeze({ x: 136, y: 331, width: 58, height: 334, pivotX: 0.48, pivotY: 0.06 })
            }),
            joints: Object.freeze({
                torso: Object.freeze({
                    waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
                }),
                'head-neck': Object.freeze({
                    neck: Object.freeze({ position: 0.17, crossOffset: 0.50 })
                }),
                'right-arm': Object.freeze({
                    'right-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.70 }),
                    'right-elbow': Object.freeze({ position: 0.46, crossOffset: 0.48 }),
                    'right-wrist': Object.freeze({ position: 0.84, crossOffset: 0.44 })
                }),
                'left-arm': Object.freeze({
                    'left-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.30 }),
                    'left-elbow': Object.freeze({ position: 0.46, crossOffset: 0.52 }),
                    'left-wrist': Object.freeze({ position: 0.84, crossOffset: 0.56 })
                }),
                'right-leg': Object.freeze({
                    'right-hip': Object.freeze({ position: 0.06, crossOffset: 0.58 }),
                    'right-knee': Object.freeze({ position: 0.48, crossOffset: 0.51 }),
                    'right-ankle': Object.freeze({ position: 0.85, crossOffset: 0.48 })
                }),
                'left-leg': Object.freeze({
                    'left-hip': Object.freeze({ position: 0.06, crossOffset: 0.42 }),
                    'left-knee': Object.freeze({ position: 0.48, crossOffset: 0.49 }),
                    'left-ankle': Object.freeze({ position: 0.85, crossOffset: 0.52 })
                })
            }),
            pins: Object.freeze({
                'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'left-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.37, anchorY: 0.84, rotation: 'inherit' }),
                'left-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.63, anchorY: 0.84, rotation: 'inherit' })
            })
        }),
        'female-doctor-front': Object.freeze({
            id: 'female-doctor-front',
            presetId: 'female-doctor-premium',
            name: 'Female Doctor - Premium',
            view: 'front',
            engine: 'svg-armature-premium',
            assetProfile: 'front-six-part-premium',
            sourcePath: 'assets/svg-characters/female-doctor/front',
            masterFile: 'master.svg',
            partFiles: PART_FILE_MAP,
            facialLayers: FACIAL_LAYER_ROLES,
            authoring: PREMIUM_AUTHORING,
            calibrationVersion: 1,
            reference: Object.freeze({ width: 260, height: 650 }),
            roles: PART_KEYS,
            order: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm']),
            parts: Object.freeze({
                'head-neck': Object.freeze({ x: 80, y: 39, width: 96, height: 148, pivotX: 0.5, pivotY: 0.86 }),
                torso: Object.freeze({ x: 58, y: 145, width: 144, height: 228, pivotX: 0.5, pivotY: 0.30 }),
                'right-arm': Object.freeze({ x: 28, y: 176, width: 68, height: 228, pivotX: 0.52, pivotY: 0.08 }),
                'left-arm': Object.freeze({ x: 166, y: 176, width: 68, height: 228, pivotX: 0.48, pivotY: 0.08 }),
                'right-leg': Object.freeze({ x: 73, y: 330, width: 56, height: 319, pivotX: 0.52, pivotY: 0.06 }),
                'left-leg': Object.freeze({ x: 132, y: 330, width: 56, height: 319, pivotX: 0.48, pivotY: 0.06 })
            }),
            joints: Object.freeze({
                torso: Object.freeze({
                    waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
                }),
                'head-neck': Object.freeze({
                    neck: Object.freeze({ position: 0.17, crossOffset: 0.50 })
                }),
                'right-arm': Object.freeze({
                    'right-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.72 }),
                    'right-elbow': Object.freeze({ position: 0.46, crossOffset: 0.48 }),
                    'right-wrist': Object.freeze({ position: 0.84, crossOffset: 0.44 })
                }),
                'left-arm': Object.freeze({
                    'left-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.28 }),
                    'left-elbow': Object.freeze({ position: 0.46, crossOffset: 0.52 }),
                    'left-wrist': Object.freeze({ position: 0.84, crossOffset: 0.56 })
                }),
                'right-leg': Object.freeze({
                    'right-hip': Object.freeze({ position: 0.06, crossOffset: 0.58 }),
                    'right-knee': Object.freeze({ position: 0.48, crossOffset: 0.51 }),
                    'right-ankle': Object.freeze({ position: 0.85, crossOffset: 0.48 })
                }),
                'left-leg': Object.freeze({
                    'left-hip': Object.freeze({ position: 0.06, crossOffset: 0.42 }),
                    'left-knee': Object.freeze({ position: 0.48, crossOffset: 0.49 }),
                    'left-ankle': Object.freeze({ position: 0.85, crossOffset: 0.52 })
                })
            }),
            pins: Object.freeze({
                'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'left-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.36, anchorY: 0.84, rotation: 'inherit' }),
                'left-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.64, anchorY: 0.84, rotation: 'inherit' })
            })
        }),
        'male-doctor-front': Object.freeze({
            id: 'male-doctor-front',
            presetId: 'male-doctor-premium',
            name: 'Male Doctor - Premium',
            view: 'front',
            engine: 'svg-armature-premium',
            assetProfile: 'front-six-part-premium',
            sourcePath: 'assets/svg-characters/male-doctor/front',
            masterFile: 'master.svg',
            partFiles: PART_FILE_MAP,
            facialLayers: FACIAL_LAYER_ROLES,
            authoring: PREMIUM_AUTHORING,
            calibrationVersion: 1,
            reference: Object.freeze({ width: 268, height: 670 }),
            roles: PART_KEYS,
            order: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm']),
            parts: Object.freeze({
                'head-neck': Object.freeze({ x: 83, y: 39, width: 96, height: 148, pivotX: 0.5, pivotY: 0.86 }),
                torso: Object.freeze({ x: 58, y: 145, width: 148, height: 232, pivotX: 0.5, pivotY: 0.30 }),
                'right-arm': Object.freeze({ x: 24, y: 177, width: 68, height: 232, pivotX: 0.54, pivotY: 0.08 }),
                'left-arm': Object.freeze({ x: 176, y: 177, width: 68, height: 232, pivotX: 0.46, pivotY: 0.08 }),
                'right-leg': Object.freeze({ x: 74, y: 332, width: 58, height: 337, pivotX: 0.52, pivotY: 0.06 }),
                'left-leg': Object.freeze({ x: 136, y: 332, width: 58, height: 337, pivotX: 0.48, pivotY: 0.06 })
            }),
            joints: Object.freeze({
                torso: Object.freeze({
                    waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
                }),
                'head-neck': Object.freeze({
                    neck: Object.freeze({ position: 0.17, crossOffset: 0.50 })
                }),
                'right-arm': Object.freeze({
                    'right-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.70 }),
                    'right-elbow': Object.freeze({ position: 0.46, crossOffset: 0.48 }),
                    'right-wrist': Object.freeze({ position: 0.84, crossOffset: 0.44 })
                }),
                'left-arm': Object.freeze({
                    'left-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.30 }),
                    'left-elbow': Object.freeze({ position: 0.46, crossOffset: 0.52 }),
                    'left-wrist': Object.freeze({ position: 0.84, crossOffset: 0.56 })
                }),
                'right-leg': Object.freeze({
                    'right-hip': Object.freeze({ position: 0.06, crossOffset: 0.58 }),
                    'right-knee': Object.freeze({ position: 0.48, crossOffset: 0.51 }),
                    'right-ankle': Object.freeze({ position: 0.85, crossOffset: 0.48 })
                }),
                'left-leg': Object.freeze({
                    'left-hip': Object.freeze({ position: 0.06, crossOffset: 0.42 }),
                    'left-knee': Object.freeze({ position: 0.48, crossOffset: 0.49 }),
                    'left-ankle': Object.freeze({ position: 0.85, crossOffset: 0.52 })
                })
            }),
            pins: Object.freeze({
                'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'left-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.37, anchorY: 0.84, rotation: 'inherit' }),
                'left-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.63, anchorY: 0.84, rotation: 'inherit' })
            })
        }),
        'female-student-front': Object.freeze({
            id: 'female-student-front',
            presetId: 'female-student-premium',
            name: 'Female Student - Premium',
            view: 'front',
            engine: 'svg-armature-premium',
            assetProfile: 'front-six-part-premium',
            sourcePath: 'assets/svg-characters/female-student/front',
            masterFile: 'master.svg',
            partFiles: PART_FILE_MAP,
            facialLayers: FACIAL_LAYER_ROLES,
            authoring: PREMIUM_AUTHORING,
            calibrationVersion: 1,
            reference: Object.freeze({ width: 258, height: 648 }),
            roles: PART_KEYS,
            order: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm']),
            parts: Object.freeze({
                'head-neck': Object.freeze({ x: 80, y: 37, width: 96, height: 148, pivotX: 0.5, pivotY: 0.86 }),
                torso: Object.freeze({ x: 56, y: 145, width: 144, height: 224, pivotX: 0.5, pivotY: 0.30 }),
                'right-arm': Object.freeze({ x: 28, y: 178, width: 66, height: 224, pivotX: 0.52, pivotY: 0.08 }),
                'left-arm': Object.freeze({ x: 164, y: 178, width: 66, height: 224, pivotX: 0.48, pivotY: 0.08 }),
                'right-leg': Object.freeze({ x: 72, y: 324, width: 56, height: 323, pivotX: 0.52, pivotY: 0.06 }),
                'left-leg': Object.freeze({ x: 132, y: 324, width: 56, height: 323, pivotX: 0.48, pivotY: 0.06 })
            }),
            joints: Object.freeze({
                torso: Object.freeze({
                    waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
                }),
                'head-neck': Object.freeze({
                    neck: Object.freeze({ position: 0.17, crossOffset: 0.50 })
                }),
                'right-arm': Object.freeze({
                    'right-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.72 }),
                    'right-elbow': Object.freeze({ position: 0.46, crossOffset: 0.48 }),
                    'right-wrist': Object.freeze({ position: 0.84, crossOffset: 0.44 })
                }),
                'left-arm': Object.freeze({
                    'left-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.28 }),
                    'left-elbow': Object.freeze({ position: 0.46, crossOffset: 0.52 }),
                    'left-wrist': Object.freeze({ position: 0.84, crossOffset: 0.56 })
                }),
                'right-leg': Object.freeze({
                    'right-hip': Object.freeze({ position: 0.06, crossOffset: 0.58 }),
                    'right-knee': Object.freeze({ position: 0.48, crossOffset: 0.51 }),
                    'right-ankle': Object.freeze({ position: 0.85, crossOffset: 0.48 })
                }),
                'left-leg': Object.freeze({
                    'left-hip': Object.freeze({ position: 0.06, crossOffset: 0.42 }),
                    'left-knee': Object.freeze({ position: 0.48, crossOffset: 0.49 }),
                    'left-ankle': Object.freeze({ position: 0.85, crossOffset: 0.52 })
                })
            }),
            pins: Object.freeze({
                'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'left-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.36, anchorY: 0.84, rotation: 'inherit' }),
                'left-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.64, anchorY: 0.84, rotation: 'inherit' })
            })
        }),
        'male-student-front': Object.freeze({
            id: 'male-student-front',
            presetId: 'male-student-premium',
            name: 'Male Student - Premium',
            view: 'front',
            engine: 'svg-armature-premium',
            assetProfile: 'front-six-part-premium',
            sourcePath: 'assets/svg-characters/male-student/front',
            masterFile: 'master.svg',
            partFiles: PART_FILE_MAP,
            facialLayers: FACIAL_LAYER_ROLES,
            authoring: PREMIUM_AUTHORING,
            calibrationVersion: 1,
            reference: Object.freeze({ width: 262, height: 656 }),
            roles: PART_KEYS,
            order: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm']),
            parts: Object.freeze({
                'head-neck': Object.freeze({ x: 82, y: 37, width: 94, height: 146, pivotX: 0.5, pivotY: 0.86 }),
                torso: Object.freeze({ x: 57, y: 145, width: 146, height: 226, pivotX: 0.5, pivotY: 0.30 }),
                'right-arm': Object.freeze({ x: 27, y: 178, width: 66, height: 226, pivotX: 0.53, pivotY: 0.08 }),
                'left-arm': Object.freeze({ x: 169, y: 178, width: 66, height: 226, pivotX: 0.47, pivotY: 0.08 }),
                'right-leg': Object.freeze({ x: 74, y: 326, width: 57, height: 329, pivotX: 0.52, pivotY: 0.06 }),
                'left-leg': Object.freeze({ x: 134, y: 326, width: 57, height: 329, pivotX: 0.48, pivotY: 0.06 })
            }),
            joints: Object.freeze({
                torso: Object.freeze({
                    waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
                }),
                'head-neck': Object.freeze({
                    neck: Object.freeze({ position: 0.17, crossOffset: 0.50 })
                }),
                'right-arm': Object.freeze({
                    'right-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.70 }),
                    'right-elbow': Object.freeze({ position: 0.46, crossOffset: 0.48 }),
                    'right-wrist': Object.freeze({ position: 0.84, crossOffset: 0.44 })
                }),
                'left-arm': Object.freeze({
                    'left-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.30 }),
                    'left-elbow': Object.freeze({ position: 0.46, crossOffset: 0.52 }),
                    'left-wrist': Object.freeze({ position: 0.84, crossOffset: 0.56 })
                }),
                'right-leg': Object.freeze({
                    'right-hip': Object.freeze({ position: 0.06, crossOffset: 0.58 }),
                    'right-knee': Object.freeze({ position: 0.48, crossOffset: 0.51 }),
                    'right-ankle': Object.freeze({ position: 0.85, crossOffset: 0.48 })
                }),
                'left-leg': Object.freeze({
                    'left-hip': Object.freeze({ position: 0.06, crossOffset: 0.42 }),
                    'left-knee': Object.freeze({ position: 0.48, crossOffset: 0.49 }),
                    'left-ankle': Object.freeze({ position: 0.85, crossOffset: 0.52 })
                })
            }),
            pins: Object.freeze({
                'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'left-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.37, anchorY: 0.84, rotation: 'inherit' }),
                'left-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.63, anchorY: 0.84, rotation: 'inherit' })
            })
        }),
        'iro-buba-premium-front': Object.freeze({
            id: 'iro-buba-premium-front',
            presetId: 'iro-buba-premium',
            name: 'Iro & Buba Woman - Premium',
            view: 'front',
            engine: 'svg-armature-premium',
            assetProfile: 'front-six-part-premium',
            sourcePath: 'assets/svg-characters/iro-buba-woman/front',
            masterFile: 'master.svg',
            partFiles: PART_FILE_MAP,
            facialLayers: FACIAL_LAYER_ROLES,
            authoring: PREMIUM_AUTHORING,
            calibrationVersion: 1,
            reference: Object.freeze({ width: 270, height: 668 }),
            roles: PART_KEYS,
            order: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm', 'left-arm']),
            parts: Object.freeze({
                'head-neck': Object.freeze({ x: 84, y: 35, width: 98, height: 150, pivotX: 0.5, pivotY: 0.86 }),
                torso: Object.freeze({ x: 54, y: 144, width: 154, height: 246, pivotX: 0.5, pivotY: 0.30 }),
                'right-arm': Object.freeze({ x: 24, y: 177, width: 68, height: 228, pivotX: 0.53, pivotY: 0.08 }),
                'left-arm': Object.freeze({ x: 178, y: 177, width: 68, height: 228, pivotX: 0.47, pivotY: 0.08 }),
                'right-leg': Object.freeze({ x: 80, y: 337, width: 60, height: 330, pivotX: 0.52, pivotY: 0.06 }),
                'left-leg': Object.freeze({ x: 136, y: 337, width: 60, height: 330, pivotX: 0.48, pivotY: 0.06 })
            }),
            joints: Object.freeze({
                torso: Object.freeze({
                    waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
                }),
                'head-neck': Object.freeze({
                    neck: Object.freeze({ position: 0.17, crossOffset: 0.50 })
                }),
                'right-arm': Object.freeze({
                    'right-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.72 }),
                    'right-elbow': Object.freeze({ position: 0.46, crossOffset: 0.48 }),
                    'right-wrist': Object.freeze({ position: 0.84, crossOffset: 0.44 })
                }),
                'left-arm': Object.freeze({
                    'left-shoulder': Object.freeze({ position: 0.08, crossOffset: 0.28 }),
                    'left-elbow': Object.freeze({ position: 0.46, crossOffset: 0.52 }),
                    'left-wrist': Object.freeze({ position: 0.84, crossOffset: 0.56 })
                }),
                'right-leg': Object.freeze({
                    'right-hip': Object.freeze({ position: 0.06, crossOffset: 0.58 }),
                    'right-knee': Object.freeze({ position: 0.48, crossOffset: 0.51 }),
                    'right-ankle': Object.freeze({ position: 0.85, crossOffset: 0.48 })
                }),
                'left-leg': Object.freeze({
                    'left-hip': Object.freeze({ position: 0.06, crossOffset: 0.42 }),
                    'left-knee': Object.freeze({ position: 0.48, crossOffset: 0.49 }),
                    'left-ankle': Object.freeze({ position: 0.85, crossOffset: 0.52 })
                })
            }),
            pins: Object.freeze({
                'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'left-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
                'right-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.37, anchorY: 0.84, rotation: 'inherit' }),
                'left-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: 0.63, anchorY: 0.84, rotation: 'inherit' })
            })
        })
    });

    const PREMIUM_ASSET_ALIASES = Object.freeze({
        ...Object.fromEntries((globalThis.SvgAfricanCharacterCatalog?.listPresets() || []).filter(preset => preset.category).map(preset => [preset.assetCharacterId, Object.freeze({
            baseAssetId: preset.identity.presentation === 'female' ? 'ada-lecturer-front' : 'male-lecturer-front',
            id: preset.assetCharacterId, presetId: preset.id, name: preset.name,
            sourcePath: `assets/svg-characters/community/${preset.id}/front`,
            artworkFamily: 'community-parametric'
        })])),
        'female-academic-gown-premium-front': Object.freeze({
            baseAssetId: 'ada-lecturer-front',
            id: 'female-academic-gown-premium-front',
            presetId: 'female-academic-gown-premium',
            name: 'Female Academic Gown - Premium',
            sourcePath: 'assets/svg-characters/female-academic-gown/front',
            reference: Object.freeze({ width: 270, height: 670 })
        }),
        'male-academic-gown-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'male-academic-gown-premium-front',
            presetId: 'male-academic-gown-premium',
            name: 'Male Academic Gown - Premium',
            sourcePath: 'assets/svg-characters/male-academic-gown/front',
            reference: Object.freeze({ width: 276, height: 682 })
        }),
        'ankara-creative-premium-front': Object.freeze({
            baseAssetId: 'ada-lecturer-front',
            id: 'ankara-creative-premium-front',
            presetId: 'ankara-creative-premium',
            name: 'Ankara Creative - Premium',
            sourcePath: 'assets/svg-characters/ankara-creative/front',
            reference: Object.freeze({ width: 268, height: 664 }),
            parts: Object.freeze({
                ...ASSETS['ada-lecturer-front'].parts,
                'right-leg': Object.freeze({ ...ASSETS['ada-lecturer-front'].parts['right-leg'], x: 72, width: 61 }),
                'left-leg': Object.freeze({ ...ASSETS['ada-lecturer-front'].parts['left-leg'], x: 127, width: 61 })
            })
        }),
        'senator-wear-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'senator-wear-premium-front',
            presetId: 'senator-wear-premium',
            name: 'Senator Wear Man - Premium',
            sourcePath: 'assets/svg-characters/senator-wear/front',
            reference: Object.freeze({ width: 270, height: 674 })
        }),
        'agbada-formal-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'agbada-formal-premium-front',
            presetId: 'agbada-formal-premium',
            name: 'Agbada Formal - Premium',
            sourcePath: 'assets/svg-characters/agbada-formal/front',
            reference: Object.freeze({ width: 284, height: 676 })
        }),
        'george-wrapper-premium-front': Object.freeze({
            baseAssetId: 'iro-buba-premium-front',
            id: 'george-wrapper-premium-front',
            presetId: 'george-wrapper-premium',
            name: 'George Wrapper Woman - Premium',
            sourcePath: 'assets/svg-characters/george-wrapper/front',
            reference: Object.freeze({ width: 272, height: 676 })
        }),
        'nurse-female-premium-front': Object.freeze({
            baseAssetId: 'female-doctor-front',
            id: 'nurse-female-premium-front',
            presetId: 'nurse-female-premium',
            name: 'Female Nurse - Premium',
            sourcePath: 'assets/svg-characters/nurse-female/front',
            reference: Object.freeze({ width: 266, height: 660 })
        }),
        'lab-scientist-premium-front': Object.freeze({
            baseAssetId: 'male-doctor-front',
            id: 'lab-scientist-premium-front',
            presetId: 'lab-scientist-premium',
            name: 'Laboratory Scientist - Premium',
            sourcePath: 'assets/svg-characters/lab-scientist/front',
            reference: Object.freeze({ width: 266, height: 682 })
        }),
        'business-executive-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'business-executive-premium-front',
            presetId: 'business-executive-premium',
            name: 'Business Executive - Premium',
            sourcePath: 'assets/svg-characters/business-executive/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'corporate-woman-premium-front': Object.freeze({
            baseAssetId: 'ada-lecturer-front',
            id: 'corporate-woman-premium-front',
            presetId: 'corporate-woman-premium',
            name: 'Corporate Woman - Premium',
            sourcePath: 'assets/svg-characters/corporate-woman/front',
            reference: Object.freeze({ width: 266, height: 668 })
        }),
        'lawyer-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'lawyer-premium-front',
            presetId: 'lawyer-premium',
            name: 'Lawyer - Premium',
            sourcePath: 'assets/svg-characters/lawyer/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'football-athlete-premium-front': Object.freeze({
            baseAssetId: 'male-student-front',
            id: 'football-athlete-premium-front',
            presetId: 'football-athlete-premium',
            name: 'Football Athlete - Premium',
            sourcePath: 'assets/svg-characters/football-athlete/front',
            reference: Object.freeze({ width: 266, height: 676 })
        }),
        'teacher-premium-front': Object.freeze({
            baseAssetId: 'ada-lecturer-front',
            id: 'teacher-premium-front',
            presetId: 'teacher-premium',
            name: 'Teacher - Premium',
            sourcePath: 'assets/svg-characters/teacher/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'media-presenter-premium-front': Object.freeze({
            baseAssetId: 'ada-lecturer-front',
            id: 'media-presenter-premium-front',
            presetId: 'media-presenter-premium',
            name: 'Media Presenter - Premium',
            sourcePath: 'assets/svg-characters/media-presenter/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'engineer-field-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'engineer-field-premium-front',
            presetId: 'engineer-field-premium',
            name: 'Field Engineer - Premium',
            sourcePath: 'assets/svg-characters/engineer-field/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'chef-premium-front': Object.freeze({
            baseAssetId: 'female-doctor-front',
            id: 'chef-premium-front',
            presetId: 'chef-premium',
            name: 'Chef - Premium',
            sourcePath: 'assets/svg-characters/chef/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'pilot-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'pilot-premium-front',
            presetId: 'pilot-premium',
            name: 'Pilot - Premium',
            sourcePath: 'assets/svg-characters/pilot/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'security-officer-premium-front': Object.freeze({
            baseAssetId: 'male-lecturer-front',
            id: 'security-officer-premium-front',
            presetId: 'security-officer-premium',
            name: 'Security Officer - Premium',
            sourcePath: 'assets/svg-characters/security-officer/front',
            reference: Object.freeze({ width: 270, height: 680 })
        }),
        'soldier-premium-front': Object.freeze({
            baseAssetId: 'male-student-front',
            id: 'soldier-premium-front',
            presetId: 'soldier-premium',
            name: 'Soldier - Premium',
            sourcePath: 'assets/svg-characters/soldier/front',
            reference: Object.freeze({ width: 266, height: 676 })
        }),
        'neutral-presenter-premium-front': Object.freeze({
            baseAssetId: 'male-student-front',
            id: 'neutral-presenter-premium-front',
            presetId: 'neutral-presenter-premium',
            name: 'Neutral Presenter - Premium',
            sourcePath: 'assets/svg-characters/neutral-presenter/front',
            reference: Object.freeze({ width: 264, height: 660 })
        }),
        'event-host-premium-front': Object.freeze({
            baseAssetId: 'ada-lecturer-front',
            id: 'event-host-premium-front',
            presetId: 'event-host-premium',
            name: 'Event Host - Premium',
            sourcePath: 'assets/svg-characters/event-host/front',
            reference: Object.freeze({ width: 270, height: 680 })
        })
    });

    const assetAliasCache = Object.create(null);
    const generatedViewAssetCache = Object.create(null);

    function normalizeThreeQuarterArtworkMode(value = DEFAULT_THREE_QUARTER_ARTWORK) {
        const normalized = String(value || '').trim().toLowerCase();
        return ['experimental-drawn', 'authored-3q', 'drawn', 'experimental'].includes(normalized)
            ? 'experimental-drawn'
            : 'projected';
    }

    function stripDrawnThreeQuarterRuntimeSuffix(assetId = '') {
        const id = String(assetId || '').trim();
        return id.endsWith(DRAWN_THREE_QUARTER_RUNTIME_SUFFIX)
            ? id.slice(0, -DRAWN_THREE_QUARTER_RUNTIME_SUFFIX.length)
            : id;
    }

    function hasDrawnThreeQuarterRuntimeSuffix(assetId = '') {
        return String(assetId || '').trim().endsWith(DRAWN_THREE_QUARTER_RUNTIME_SUFFIX);
    }

    function getThreeQuarterArtworkMode(config = {}, asset = null) {
        const configuredMode = config?.styling?.threeQuarterArtwork ?? config?.threeQuarterArtwork;
        if (configuredMode != null && String(configuredMode).trim()) {
            return normalizeThreeQuarterArtworkMode(configuredMode);
        }
        if (asset?.threeQuarterArtworkMode) {
            return normalizeThreeQuarterArtworkMode(asset.threeQuarterArtworkMode);
        }
        if (hasDrawnThreeQuarterRuntimeSuffix(asset?.id || config?.assetCharacterId || config?.assetId)) {
            return 'experimental-drawn';
        }
        return normalizeThreeQuarterArtworkMode(DEFAULT_THREE_QUARTER_ARTWORK);
    }

    function getThreeQuarterRuntimeAssetId(assetId = '', mode = DEFAULT_THREE_QUARTER_ARTWORK) {
        const baseId = stripDrawnThreeQuarterRuntimeSuffix(assetId);
        const match = baseId.match(/-(front|back)-3q-(left|right)$/);
        return match && normalizeThreeQuarterArtworkMode(mode) === 'experimental-drawn'
            ? `${baseId}${DRAWN_THREE_QUARTER_RUNTIME_SUFFIX}`
            : baseId;
    }

    function normalizePremiumView(value = 'front') {
        const view = String(value || 'front').trim().toLowerCase();
        return PREMIUM_SUPPORTED_VIEWS.includes(view) ? view : 'front';
    }

    function isSidePremiumView(view = '') {
        return /^side-(left|right)$/.test(String(view || ''));
    }

    function isThreeQuarterPremiumView(view = '') {
        return /^(front|back)-3q-(left|right)$/.test(String(view || ''));
    }

    function isBackThreeQuarterPremiumView(view = '') {
        return /^back-3q-(left|right)$/.test(String(view || ''));
    }

    function isBackPremiumView(view = '') {
        const text = String(view || '');
        return text === 'back' || text.startsWith('back-3q-');
    }

    function getPremiumViewSide(view = '') {
        const match = String(view || '').match(/-(left|right)$/);
        return match ? match[1] : '';
    }

    function getThreeQuarterGazeBaseline(view = '') {
        const normalizedView = normalizePremiumView(view);
        if (normalizedView === 'front-3q-right') return 4.8;
        if (normalizedView === 'front-3q-left') return -4.8;
        return 0;
    }

    function getThreeQuarterViewProfile(view = '') {
        const normalizedView = normalizePremiumView(view);
        if (!isThreeQuarterPremiumView(normalizedView)) return null;
        const liveProfile = globalThis.JointSystem?._getArmatureViewProfile?.(normalizedView);
        const fallback = THREE_QUARTER_PROFILE_FALLBACKS[normalizedView];
        if (!liveProfile && !fallback) return null;
        return {
            ...(fallback || {}),
            ...(liveProfile || {}),
            layerOrder: [
                ...((liveProfile?.layerOrder || fallback?.layerOrder || []))
            ]
        };
    }

    function getPremiumAssetProfileForView(view = 'front') {
        const normalizedView = normalizePremiumView(view);
        if (isSidePremiumView(normalizedView)) return SIDE_PREMIUM_ASSET_PROFILE;
        if (normalizedView.startsWith('front-3q-')) return FRONT_3Q_PREMIUM_ASSET_PROFILE;
        if (normalizedView.startsWith('back-3q-')) return BACK_3Q_PREMIUM_ASSET_PROFILE;
        return normalizedView === 'back' ? BACK_PREMIUM_ASSET_PROFILE : FRONT_PREMIUM_ASSET_PROFILE;
    }

    function getPremiumPartKeysForAsset(asset = null) {
        return isSidePremiumView(asset?.view) ? SIDE_PART_KEYS : PART_KEYS;
    }

    function getPremiumPartFileMapForAsset(asset = null) {
        return isSidePremiumView(asset?.view) ? SIDE_PART_FILE_MAP : PART_FILE_MAP;
    }

    function getPremiumJointContractForAsset(asset = null) {
        return isSidePremiumView(asset?.view) ? SIDE_PREMIUM_ASSET_REQUIRED_JOINTS : PREMIUM_ASSET_REQUIRED_JOINTS;
    }

    function getPremiumFacialLayersForAsset(asset = null) {
        if (isSidePremiumView(asset?.view)) return SIDE_FACIAL_LAYER_ROLES;
        if (isBackThreeQuarterPremiumView(asset?.view)) return BACK_3Q_FACIAL_LAYER_ROLES;
        if (isBackPremiumView(asset?.view)) return BACK_FACIAL_LAYER_ROLES;
        return FACIAL_LAYER_ROLES;
    }

    function getAssetAuthoring(asset = null, options = {}) {
        const view = normalizePremiumView(asset?.view || asset?.authoring?.view || PREMIUM_AUTHORING.view);
        if (isSidePremiumView(view)) {
            const side = getPremiumViewSide(view) || 'right';
            return {
                ...PREMIUM_AUTHORING,
                ...(asset?.authoring || {}),
                view,
                partConvention: 'profile-side-front-back-roles',
                bodyRoles: 'side-dual-six-part',
                anatomicalNearArm: side === 'left' ? 'left-arm' : 'right-arm',
                anatomicalFarArm: side === 'left' ? 'right-arm' : 'left-arm',
                anatomicalNearLeg: side === 'left' ? 'left-leg' : 'right-leg',
                anatomicalFarLeg: side === 'left' ? 'right-leg' : 'left-leg',
                neutralLayerOrder: 'far-arm far-leg torso head-neck near-leg near-arm'
            };
        }
        if (isThreeQuarterPremiumView(view)) {
            const profile = getThreeQuarterViewProfile(view);
            const side = profile?.lean || getPremiumViewSide(view) || 'right';
            const usesDrawnThreeQuarter = options.drawnThreeQuarter === true
                || getThreeQuarterArtworkMode({}, asset) === 'experimental-drawn';
            if (usesDrawnThreeQuarter) {
                return {
                    ...PREMIUM_AUTHORING,
                    ...(asset?.authoring || {}),
                    view,
                    bodyRoles: view.startsWith('back') ? 'back-3q-six-part' : 'front-3q-six-part',
                    viewTransform: 'authored-three-quarter',
                    projectionMode: 'authored-3q',
                    anatomicalNearArm: profile?.nearArm || (side === 'left' ? 'left-arm' : 'right-arm'),
                    anatomicalFarArm: profile?.farArm || (side === 'left' ? 'right-arm' : 'left-arm'),
                    anatomicalNearLeg: profile?.nearLeg || (side === 'left' ? 'left-leg' : 'right-leg'),
                    anatomicalFarLeg: profile?.farLeg || (side === 'left' ? 'right-leg' : 'left-leg'),
                    structuralTiltY: 0,
                    neutralLayerOrder: 'far-leg far-arm torso head-neck near-leg near-arm'
                };
            }
            return {
                ...PREMIUM_AUTHORING,
                ...(asset?.authoring || {}),
                view,
                bodyRoles: view.startsWith('back') ? 'back-3q-six-part' : 'front-3q-six-part',
                viewTransform: 'profile-tilt-three-quarter',
                projectionMode: 'profile-tilt-3q',
                viewProfileAuthority: 'UC_VIEW_PROFILES',
                anatomicalNearArm: profile?.nearArm || (side === 'left' ? 'left-arm' : 'right-arm'),
                anatomicalFarArm: profile?.farArm || (side === 'left' ? 'right-arm' : 'left-arm'),
                anatomicalNearLeg: profile?.nearLeg || (side === 'left' ? 'left-leg' : 'right-leg'),
                anatomicalFarLeg: profile?.farLeg || (side === 'left' ? 'right-leg' : 'left-leg'),
                structuralTiltY: Number(profile?.baseTiltY) || 0,
                neutralLayerOrder: 'far-arm far-leg torso head-neck near-leg near-arm'
            };
        }
        return {
            ...PREMIUM_AUTHORING,
            ...(asset?.authoring || {}),
            view,
            bodyRoles: isBackPremiumView(view) ? 'back-six-part' : 'front-six-part',
            viewTransform: undefined
        };
    }

    function getViewVariantAssetId(assetId = DEFAULT_ASSET_ID, view = 'front') {
        const normalizedView = normalizePremiumView(view);
        const preserveDrawnMode = hasDrawnThreeQuarterRuntimeSuffix(assetId);
        const rawId = stripDrawnThreeQuarterRuntimeSuffix(assetId || DEFAULT_ASSET_ID) || DEFAULT_ASSET_ID;
        const suffixPattern = /-(back|side-left|side-right|front-3q-left|front-3q-right|back-3q-left|back-3q-right)$/;
        if (normalizedView === 'front') return rawId.replace(suffixPattern, '-front');
        const frontId = rawId
            .replace(suffixPattern, '-front');
        if (normalizedView === 'back') {
            return /-front$/.test(frontId) ? frontId.replace(/-front$/, '-back') : `${frontId}-back`;
        }
        const variantId = /-front$/.test(frontId)
            ? frontId.replace(/-front$/, `-${normalizedView}`)
            : `${frontId}-${normalizedView}`;
        return preserveDrawnMode && isThreeQuarterPremiumView(normalizedView)
            ? getThreeQuarterRuntimeAssetId(variantId, 'experimental-drawn')
            : variantId;
    }

    function getAssetNameForView(asset, view) {
        const baseName = String(asset?.name || asset?.id || 'Premium Character')
            .replace(/\s*-\s*Back\s+Premium$/i, '')
            .replace(/\s*-\s*Side\s+(?:Left|Right)\s+Premium$/i, '')
            .replace(/\s*-\s*Premium$/i, '');
        if (isSidePremiumView(view)) {
            return `${baseName} - ${view.endsWith('left') ? 'Side Left' : 'Side Right'} Premium`;
        }
        if (isThreeQuarterPremiumView(view)) {
            const viewLabel = view.startsWith('back') ? 'Back 3/4' : 'Front 3/4';
            const sideLabel = view.endsWith('left') ? 'Left' : 'Right';
            return `${baseName} - ${viewLabel} ${sideLabel} Premium`;
        }
        return view === 'back' ? `${baseName} - Back Premium` : `${baseName} - Premium`;
    }

    function buildSidePartProfiles(frontAsset, view) {
        const frontParts = frontAsset?.parts || {};
        const torso = frontParts.torso || { x: 62, y: 148, width: 135, height: 223, pivotX: 0.5, pivotY: 0.30 };
        const head = frontParts['head-neck'] || { x: 79, y: 43, width: 98, height: 150, pivotX: 0.5, pivotY: 0.86 };
        const arm = frontParts['right-arm'] || frontParts['left-arm'] || { x: 31, y: 179, width: 66, height: 224, pivotX: 0.5, pivotY: 0.08 };
        const leg = frontParts['right-leg'] || frontParts['left-leg'] || { x: 72, y: 326, width: 56, height: 317, pivotX: 0.5, pivotY: 0.06 };
        const centerX = torso.x + torso.width * 0.5;
        const sideSign = view === 'side-left' ? -1 : 1;
        const torsoWidth = Math.max(124, torso.width * 0.92);
        const headWidth = Math.max(88, head.width * 0.96);
        const armWidth = Math.max(50, arm.width * 0.78);
        const legWidth = Math.max(50, leg.width * 0.90);
        return Object.freeze({
            torso: Object.freeze({
                x: centerX - torsoWidth * 0.5,
                y: torso.y,
                width: torsoWidth,
                height: torso.height,
                pivotX: 0.5,
                pivotY: torso.pivotY ?? 0.30,
                layer: 2,
                renderZ: 2
            }),
            'head-neck': Object.freeze({
                x: centerX - headWidth * 0.52 + sideSign * 7,
                y: head.y,
                width: headWidth,
                height: head.height,
                pivotX: view === 'side-left' ? 0.56 : 0.44,
                pivotY: head.pivotY ?? 0.86,
                layer: 3,
                renderZ: 3
            }),
            'back-arm': Object.freeze({
                x: centerX - armWidth * 0.50 - sideSign * 2,
                y: arm.y + 1,
                width: armWidth,
                height: arm.height,
                pivotX: 0.5,
                pivotY: arm.pivotY ?? 0.08,
                layer: 1,
                renderZ: 1
            }),
            'front-arm': Object.freeze({
                x: centerX - armWidth * 0.50 + sideSign * 2,
                y: arm.y + 1,
                width: armWidth,
                height: arm.height,
                pivotX: 0.5,
                pivotY: arm.pivotY ?? 0.08,
                layer: 5,
                renderZ: 5
            }),
            'back-leg': Object.freeze({
                x: centerX - legWidth * 0.62 - sideSign * 6,
                y: leg.y,
                width: legWidth,
                height: leg.height,
                pivotX: 0.5,
                pivotY: leg.pivotY ?? 0.06,
                layer: 0,
                renderZ: 0
            }),
            'front-leg': Object.freeze({
                x: centerX - legWidth * 0.40 + sideSign * 8,
                y: leg.y,
                width: legWidth,
                height: leg.height,
                pivotX: 0.5,
                pivotY: leg.pivotY ?? 0.06,
                layer: 4,
                renderZ: 4
            })
        });
    }

    function buildSideJointProfiles() {
        return Object.freeze({
            torso: Object.freeze({
                waist: Object.freeze({ position: 0.30, crossOffset: 0.50 })
            }),
            'head-neck': Object.freeze({
                neck: Object.freeze({ position: 0.15, crossOffset: 0.52 })
            }),
            'front-arm': Object.freeze({
                'front-shoulder': Object.freeze({ position: 0.06, crossOffset: 0.50 }),
                'front-elbow': Object.freeze({ position: 0.42, crossOffset: 0.50 }),
                'front-wrist': Object.freeze({ position: 0.69, crossOffset: 0.50 })
            }),
            'back-arm': Object.freeze({
                'back-shoulder': Object.freeze({ position: 0.06, crossOffset: 0.50 }),
                'back-elbow': Object.freeze({ position: 0.42, crossOffset: 0.50 }),
                'back-wrist': Object.freeze({ position: 0.69, crossOffset: 0.50 })
            }),
            'front-leg': Object.freeze({
                'front-hip': Object.freeze({ position: 0.06, crossOffset: 0.50 }),
                'front-knee': Object.freeze({ position: 0.44, crossOffset: 0.50 }),
                'front-ankle': Object.freeze({ position: 0.80, crossOffset: 0.50 })
            }),
            'back-leg': Object.freeze({
                'back-hip': Object.freeze({ position: 0.06, crossOffset: 0.50 }),
                'back-knee': Object.freeze({ position: 0.44, crossOffset: 0.50 }),
                'back-ankle': Object.freeze({ position: 0.80, crossOffset: 0.50 })
            })
        });
    }

    function buildSidePinProfiles(view) {
        const rightFacing = view === 'side-right';
        return Object.freeze({
            'head-neck': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
            'back-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
            'front-arm': Object.freeze({ parent: 'torso', mode: 'joint', joint: 'waist', rotation: 'inherit' }),
            'front-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: rightFacing ? 0.57 : 0.43, anchorY: 0.79, rotation: 'inherit' }),
            'back-leg': Object.freeze({ parent: 'torso', mode: 'anchor', anchorX: rightFacing ? 0.45 : 0.55, anchorY: 0.79, rotation: 'inherit' })
        });
    }

    function buildAuthoredThreeQuarterPartProfiles(frontAsset, view) {
        const frontParts = frontAsset?.parts || {};
        const torso = frontParts.torso || { x: 62, y: 148, width: 135, height: 223, pivotX: 0.5, pivotY: 0.30 };
        const head = frontParts['head-neck'] || { x: 79, y: 43, width: 98, height: 150, pivotX: 0.5, pivotY: 0.86 };
        const rightArm = frontParts['right-arm'] || { x: 31, y: 179, width: 66, height: 224, pivotX: 0.52, pivotY: 0.08 };
        const leftArm = frontParts['left-arm'] || rightArm;
        const rightLeg = frontParts['right-leg'] || { x: 72, y: 326, width: 56, height: 317, pivotX: 0.52, pivotY: 0.06 };
        const leftLeg = frontParts['left-leg'] || rightLeg;
        const side = getPremiumViewSide(view) || 'right';
        const facingBack = view.startsWith('back');
        const nearArmKey = side === 'left' ? 'left-arm' : 'right-arm';
        const nearLegKey = side === 'left' ? 'left-leg' : 'right-leg';
        const stageLeftArmKey = facingBack ? 'left-arm' : 'right-arm';
        const stageLeftLegKey = facingBack ? 'left-leg' : 'right-leg';
        const centerX = torso.x + torso.width * 0.5;
        const torsoWidth = torso.width * (facingBack ? 0.78 : 0.92);
        const torsoX = centerX - torsoWidth * 0.5;
        const headWidth = head.width * 1.07;
        const headCenterX = centerX;
        const armSource = { 'right-arm': rightArm, 'left-arm': leftArm };
        const legSource = { 'right-leg': rightLeg, 'left-leg': leftLeg };
        const stageRightLeg = stageLeftLegKey === 'right-leg' ? 'left-leg' : 'right-leg';
        // Keep the perspective cue subtle. The authored SVG already narrows its
        // far-side silhouette, so strongly compressing the stage object here as
        // well made the rear arm and leg look unnaturally thin.
        const legWidthFor = partKey => legSource[partKey].width * (partKey === nearLegKey ? 1.14 : 1.00);
        const stageLeftLegWidth = legWidthFor(stageLeftLegKey);
        const stageRightLegWidth = legWidthFor(stageRightLeg);
        const legGap = 3;
        const legGroupX = centerX - (stageLeftLegWidth + legGap + stageRightLegWidth) * 0.5;
        const profiles = {
            torso: {
                ...torso,
                x: torsoX,
                width: torsoWidth,
                pivotX: 0.5,
                pivotY: torso.pivotY ?? 0.30,
                layer: 3,
                renderZ: 3,
                tiltX: 0,
                tiltY: 0
            },
            'head-neck': {
                ...head,
                x: headCenterX - headWidth * 0.5,
                y: head.y - 1,
                width: headWidth,
                pivotX: 0.5,
                pivotY: head.pivotY ?? 0.86,
                layer: 4,
                renderZ: 4,
                tiltX: 0,
                tiltY: 0
            }
        };
        ['right-arm', 'left-arm'].forEach(partKey => {
            const source = armSource[partKey];
            const near = partKey === nearArmKey;
            const stageLeft = partKey === stageLeftArmKey;
            const width = source.width * (near ? 1.10 : 0.96);
            const shoulderInset = near ? 5 : 10;
            const shoulderX = stageLeft ? torsoX + shoulderInset : torsoX + torsoWidth - shoulderInset;
            profiles[partKey] = {
                ...source,
                x: shoulderX - width * 0.52,
                y: source.y + (near ? -1 : 7),
                width,
                height: source.height * (near ? 1 : 0.96),
                pivotX: 0.52,
                pivotY: source.pivotY ?? 0.08,
                layer: near ? 5 : 2,
                renderZ: near ? 5 : 2,
                tiltX: 0,
                tiltY: 0
            };
        });
        ['right-leg', 'left-leg'].forEach(partKey => {
            const source = legSource[partKey];
            const near = partKey === nearLegKey;
            const stageLeft = partKey === stageLeftLegKey;
            const width = source.width * (near ? 1.14 : 1.00);
            const frontFacingPivotX = side === 'left'
                ? (near ? 0.31 : 0.74)
                : (near ? 0.69 : 0.26);
            profiles[partKey] = {
                ...source,
                x: stageLeft ? legGroupX : legGroupX + stageLeftLegWidth + legGap,
                y: source.y + (near ? 0 : 5),
                width,
                height: source.height * (near ? 1 : 0.975),
                pivotX: facingBack ? 1 - frontFacingPivotX : frontFacingPivotX,
                pivotY: source.pivotY ?? 0.06,
                layer: near ? 1 : 0,
                renderZ: near ? 1 : 0,
                tiltX: 0,
                tiltY: 0
            };
        });
        return Object.freeze(Object.fromEntries(Object.entries(profiles).map(([key, value]) => [key, Object.freeze(value)])));
    }

    function buildAuthoredThreeQuarterJointProfiles(frontAsset, view) {
        const source = cloneDeep(frontAsset?.joints || {});
        const side = getPremiumViewSide(view) || 'right';
        const facingBack = view.startsWith('back');
        const nearArm = side === 'left' ? 'left-arm' : 'right-arm';
        const nearLeg = side === 'left' ? 'left-leg' : 'right-leg';
        Object.entries(source).forEach(([partKey, joints]) => {
            Object.entries(joints || {}).forEach(([jointKey, spec]) => {
                const isArm = /arm$/.test(partKey);
                const isLeg = /leg$/.test(partKey);
                const near = partKey === nearArm || partKey === nearLeg;
                const frontFacingCrossOffset = isArm
                    ? (side === 'left' ? 0.47 : 0.53)
                    : (isLeg
                        ? (side === 'left' ? (near ? 0.31 : 0.74) : (near ? 0.69 : 0.26))
                        : 0.5);
                const crossOffset = isLeg && facingBack
                    ? 1 - frontFacingCrossOffset
                    : frontFacingCrossOffset;
                source[partKey][jointKey] = {
                    ...spec,
                    crossOffset,
                    tiltX: 0,
                    tiltY: 0
                };
            });
        });
        return Object.freeze(Object.fromEntries(Object.entries(source).map(([partKey, joints]) => [
            partKey,
            Object.freeze(Object.fromEntries(Object.entries(joints).map(([jointKey, spec]) => [jointKey, Object.freeze(spec)])))
        ])));
    }

    function buildAuthoredThreeQuarterPinProfiles(frontAsset, view) {
        const pins = cloneDeep(frontAsset?.pins || {});
        const side = getPremiumViewSide(view) || 'right';
        const facingBack = view.startsWith('back');
        const stageLeftLeg = facingBack ? 'left-leg' : 'right-leg';
        const nearLeg = side === 'left' ? 'left-leg' : 'right-leg';
        ['right-leg', 'left-leg'].forEach(partKey => {
            const stageLeft = partKey === stageLeftLeg;
            const near = partKey === nearLeg;
            pins[partKey] = {
                ...(pins[partKey] || {}),
                parent: 'torso',
                mode: 'anchor',
                anchorX: stageLeft ? (near ? 0.34 : 0.40) : (near ? 0.66 : 0.60),
                anchorY: 0.84,
                rotation: 'inherit'
            };
        });
        ['head-neck', 'right-arm', 'left-arm'].forEach(partKey => {
            pins[partKey] = {
                ...(pins[partKey] || {}),
                parent: 'torso',
                mode: 'joint',
                joint: 'waist',
                rotation: 'inherit'
            };
        });
        return Object.freeze(Object.fromEntries(Object.entries(pins).map(([key, value]) => [key, Object.freeze(value)])));
    }

    function getAuthoredThreeQuarterLayerOrder(view) {
        const side = getPremiumViewSide(view) || 'right';
        const nearArm = side === 'left' ? 'left-arm' : 'right-arm';
        const farArm = side === 'left' ? 'right-arm' : 'left-arm';
        const nearLeg = side === 'left' ? 'left-leg' : 'right-leg';
        const farLeg = side === 'left' ? 'right-leg' : 'left-leg';
        return Object.freeze([farLeg, nearLeg, farArm, 'torso', 'head-neck', nearArm]);
    }

    function freezePartProfiles(profiles = {}) {
        return Object.freeze(Object.fromEntries(
            Object.entries(profiles).map(([key, value]) => [key, Object.freeze(value)])
        ));
    }

    function freezeJointProfiles(profiles = {}) {
        return Object.freeze(Object.fromEntries(Object.entries(profiles).map(([partKey, joints]) => [
            partKey,
            Object.freeze(Object.fromEntries(
                Object.entries(joints || {}).map(([jointKey, spec]) => [jointKey, Object.freeze(spec)])
            ))
        ])));
    }

    function buildBackPartProfiles(frontAsset) {
        const parts = cloneDeep(frontAsset?.parts || {});
        const torso = parts.torso;
        if (!torso) return freezePartProfiles(parts);
        const torsoCenterX = (Number(torso.x) || 0) + (Number(torso.width) || 0) * 0.5;

        ['right-arm', 'left-arm', 'right-leg', 'left-leg'].forEach(partKey => {
            const part = parts[partKey];
            if (!part) return;
            const width = Number(part.width) || 0;
            part.x = (2 * torsoCenterX) - ((Number(part.x) || 0) + width);
            if (Number.isFinite(Number(part.pivotX))) {
                part.pivotX = 1 - Number(part.pivotX);
            }
        });

        return freezePartProfiles(parts);
    }

    function buildBackJointProfiles(frontAsset) {
        const joints = cloneDeep(frontAsset?.joints || {});
        ['right-arm', 'left-arm', 'right-leg', 'left-leg'].forEach(partKey => {
            Object.values(joints[partKey] || {}).forEach(spec => {
                if (Number.isFinite(Number(spec?.crossOffset))) {
                    spec.crossOffset = 1 - Number(spec.crossOffset);
                }
            });
        });
        return freezeJointProfiles(joints);
    }

    function buildBackPinProfiles(frontAsset) {
        const pins = cloneDeep(frontAsset?.pins || {});
        ['right-arm', 'left-arm', 'right-leg', 'left-leg'].forEach(partKey => {
            const pin = pins[partKey];
            if (pin && Number.isFinite(Number(pin.anchorX))) {
                pin.anchorX = 1 - Number(pin.anchorX);
            }
        });
        return Object.freeze(Object.fromEntries(
            Object.entries(pins).map(([key, value]) => [key, Object.freeze(value)])
        ));
    }

    function buildProfileTiltThreeQuarterPartProfiles(frontAsset, view) {
        const parts = cloneDeep(
            isBackPremiumView(view)
                ? buildBackPartProfiles(frontAsset)
                : (frontAsset?.parts || {})
        );
        const profile = getThreeQuarterViewProfile(view);
        const lean = profile?.lean || getPremiumViewSide(view) || 'right';
        const leanSign = lean === 'left' ? -1 : 1;
        if (parts.torso) {
            parts.torso = {
                ...parts.torso,
                pivotX: parts.torso.pivotX ?? 0.5,
                pivotY: parts.torso.pivotY ?? 0.30
            };
        }
        if (parts['head-neck']) {
            parts['head-neck'] = {
                ...parts['head-neck'],
                x: (Number(parts['head-neck'].x) || 0) + leanSign * 2,
                pivotX: lean === 'left' ? 0.52 : 0.48,
                pivotY: parts['head-neck'].pivotY ?? 0.86
            };
        }
        return Object.freeze(Object.fromEntries(Object.entries(parts).map(([key, value]) => [key, Object.freeze(value)])));
    }

    function buildThreeQuarterPartProfiles(frontAsset, view, drawnThreeQuarter = false) {
        return drawnThreeQuarter
            ? buildAuthoredThreeQuarterPartProfiles(frontAsset, view)
            : buildProfileTiltThreeQuarterPartProfiles(frontAsset, view);
    }

    function buildThreeQuarterJointProfiles(frontAsset, view, drawnThreeQuarter = false) {
        return drawnThreeQuarter
            ? buildAuthoredThreeQuarterJointProfiles(frontAsset, view)
            : (isBackPremiumView(view) ? buildBackJointProfiles(frontAsset) : frontAsset.joints);
    }

    function buildThreeQuarterPinProfiles(frontAsset, view, drawnThreeQuarter = false) {
        return drawnThreeQuarter
            ? buildAuthoredThreeQuarterPinProfiles(frontAsset, view)
            : (isBackPremiumView(view) ? buildBackPinProfiles(frontAsset) : frontAsset.pins);
    }

    function getThreeQuarterLayerOrder(view, frontAsset = null, drawnThreeQuarter = false) {
        if (drawnThreeQuarter) return getAuthoredThreeQuarterLayerOrder(view);
        const profileOrder = getThreeQuarterViewProfile(view)?.layerOrder;
        if (Array.isArray(profileOrder) && profileOrder.length) return Object.freeze([...profileOrder]);
        if (isBackPremiumView(view)) {
            return Object.freeze(['right-arm', 'left-arm', 'right-leg', 'left-leg', 'torso', 'head-neck']);
        }
        return Object.freeze([...(frontAsset?.order || PART_KEYS)]);
    }

    function resolveAliasedAsset(assetId) {
        const alias = PREMIUM_ASSET_ALIASES[assetId];
        if (!alias) return null;
        if (assetAliasCache[assetId]) return assetAliasCache[assetId];
        const base = ASSETS[alias.baseAssetId];
        if (!base) return null;
        const resolved = Object.freeze({
            ...base,
            ...alias,
            roles: alias.roles || base.roles,
            order: alias.order || base.order,
            parts: alias.parts || base.parts,
            joints: alias.joints || base.joints,
            pins: alias.pins || base.pins,
            partFiles: alias.partFiles || base.partFiles,
            facialLayers: alias.facialLayers || base.facialLayers,
            authoring: alias.authoring || base.authoring,
            masterFile: alias.masterFile || base.masterFile,
            assetProfile: alias.assetProfile || base.assetProfile,
            engine: alias.engine || base.engine,
            view: alias.view || base.view,
            calibrationVersion: alias.calibrationVersion || base.calibrationVersion
        });
        assetAliasCache[assetId] = resolved;
        return resolved;
    }

    function resolveGeneratedViewAsset(assetId, options = {}) {
        const requestedId = String(assetId || '').trim();
        const baseId = stripDrawnThreeQuarterRuntimeSuffix(requestedId);
        const requestedMode = options.threeQuarterArtwork
            || (hasDrawnThreeQuarterRuntimeSuffix(requestedId) ? 'experimental-drawn' : DEFAULT_THREE_QUARTER_ARTWORK);
        const drawnThreeQuarter = normalizeThreeQuarterArtworkMode(requestedMode) === 'experimental-drawn';
        const id = getThreeQuarterRuntimeAssetId(baseId, drawnThreeQuarter ? 'experimental-drawn' : 'projected');
        if (!baseId || !/-(back|side-left|side-right|front-3q-left|front-3q-right|back-3q-left|back-3q-right)$/.test(baseId)) return null;
        if (generatedViewAssetCache[id]) return generatedViewAssetCache[id];
        const match = baseId.match(/-(back|side-left|side-right|front-3q-left|front-3q-right|back-3q-left|back-3q-right)$/);
        const view = normalizePremiumView(match?.[1] || 'front');
        const isSide = isSidePremiumView(view);
        const isThreeQuarter = isThreeQuarterPremiumView(view);
        const useDrawnThreeQuarter = isThreeQuarter && drawnThreeQuarter;
        const frontId = getViewVariantAssetId(baseId, 'front');
        const frontAsset = ASSETS[frontId] || resolveAliasedAsset(frontId);
        if (!frontAsset) return null;
        const frontSource = String(frontAsset.sourcePath || DEFAULT_SOURCE_PATH);
        const sourcePath = /\/front$/.test(frontSource)
            ? frontSource.replace(/\/front$/, `/${view}`)
            : `${frontSource.replace(/\/(?:back|side-left|side-right|front-3q-left|front-3q-right|back-3q-left|back-3q-right)$/, '')}/${view}`;
        const roles = isSide ? SIDE_PART_KEYS : (frontAsset.roles || PART_KEYS);
        const parts = isSide
            ? buildSidePartProfiles(frontAsset, view)
            : (isThreeQuarter
                ? buildThreeQuarterPartProfiles(frontAsset, view, useDrawnThreeQuarter)
                : (isBackPremiumView(view) ? buildBackPartProfiles(frontAsset) : frontAsset.parts));
        const joints = isSide
            ? buildSideJointProfiles()
            : (isThreeQuarter
                ? buildThreeQuarterJointProfiles(frontAsset, view, useDrawnThreeQuarter)
                : (isBackPremiumView(view) ? buildBackJointProfiles(frontAsset) : frontAsset.joints));
        const pins = isSide
            ? buildSidePinProfiles(view)
            : (isThreeQuarter
                ? buildThreeQuarterPinProfiles(frontAsset, view, useDrawnThreeQuarter)
                : (isBackPremiumView(view) ? buildBackPinProfiles(frontAsset) : frontAsset.pins));
        const partFiles = isSide ? SIDE_PART_FILE_MAP : (frontAsset.partFiles || PART_FILE_MAP);
        const order = isSide
            ? Object.freeze(['back-leg', 'back-arm', 'torso', 'head-neck', 'front-leg', 'front-arm'])
            : (isThreeQuarter
                ? getThreeQuarterLayerOrder(view, frontAsset, useDrawnThreeQuarter)
                : (isBackPremiumView(view)
                ? Object.freeze(['right-arm', 'left-arm', 'right-leg', 'left-leg', 'torso', 'head-neck'])
                : Object.freeze([...(frontAsset.order || PART_KEYS)])));
        const threeQuarterProfile = isThreeQuarter ? getThreeQuarterViewProfile(view) : null;
        const resolved = Object.freeze({
            ...frontAsset,
            id,
            configAssetId: baseId,
            threeQuarterArtworkMode: useDrawnThreeQuarter ? 'experimental-drawn' : 'projected',
            name: getAssetNameForView(frontAsset, view),
            view,
            assetProfile: getPremiumAssetProfileForView(view),
            sourcePath,
            roles,
            order,
            parts,
            joints,
            pins,
            partFiles,
            facialLayers: getPremiumFacialLayersForAsset({ view }),
            authoring: Object.freeze(getAssetAuthoring({
                ...frontAsset,
                view,
                threeQuarterArtworkMode: useDrawnThreeQuarter ? 'experimental-drawn' : 'projected'
            }, { drawnThreeQuarter: useDrawnThreeQuarter })),
            sideAnatomy: isSide ? Object.freeze({
                facing: getPremiumViewSide(view) || 'right',
                nearArm: view === 'side-left' ? 'left-arm' : 'right-arm',
                farArm: view === 'side-left' ? 'right-arm' : 'left-arm',
                nearLeg: view === 'side-left' ? 'left-leg' : 'right-leg',
                farLeg: view === 'side-left' ? 'right-leg' : 'left-leg',
                layerOrder: ['back-leg', 'back-arm', 'torso', 'head-neck', 'front-leg', 'front-arm']
            }) : undefined,
            threeQuarterAnatomy: isThreeQuarter ? Object.freeze({
                projectionMode: useDrawnThreeQuarter ? 'authored-3q' : 'profile-tilt-3q',
                artworkMode: useDrawnThreeQuarter ? 'experimental-drawn' : 'projected',
                fallbackMode: 'projected',
                viewProfileAuthority: useDrawnThreeQuarter ? 'authored-artwork' : 'UC_VIEW_PROFILES',
                facing: view.startsWith('back') ? 'back' : 'front',
                side: threeQuarterProfile?.lean || getPremiumViewSide(view) || 'right',
                nearArm: threeQuarterProfile?.nearArm || (view.endsWith('left') ? 'left-arm' : 'right-arm'),
                farArm: threeQuarterProfile?.farArm || (view.endsWith('left') ? 'right-arm' : 'left-arm'),
                nearLeg: threeQuarterProfile?.nearLeg || (view.endsWith('left') ? 'left-leg' : 'right-leg'),
                farLeg: threeQuarterProfile?.farLeg || (view.endsWith('left') ? 'right-leg' : 'left-leg'),
                structuralTiltY: useDrawnThreeQuarter ? 0 : (Number(threeQuarterProfile?.baseTiltY) || 0),
                layerOrder: [...order]
            }) : undefined,
            masterFile: frontAsset.masterFile || 'master.svg',
            engine: frontAsset.engine || PREMIUM_ASSET_CONTRACT.engine,
            calibrationVersion: frontAsset.calibrationVersion || 1
        });
        generatedViewAssetCache[id] = resolved;
        return resolved;
    }

    function resolveAssetForConfig(config = {}) {
        const requestedView = normalizePremiumView(config?.styling?.view || config?.view || 'front');
        const explicitId = config?.assetCharacterId || config?.assetId || (
            config?.engine === PREMIUM_ASSET_CONTRACT.engine ? DEFAULT_ASSET_ID : null
        );
        if (!explicitId) return null;
        const requestedMode = getThreeQuarterArtworkMode(config);
        const resolvedMode = requestedMode === 'experimental-drawn'
            && isThreeQuarterPremiumView(requestedView)
            && typeof globalThis.SvgAfricanThreeQuarterRenderer?.renderPartSvg !== 'function'
                ? 'projected'
                : requestedMode;
        const variantId = getThreeQuarterRuntimeAssetId(
            getViewVariantAssetId(explicitId, requestedView),
            resolvedMode
        );
        const resolved = get(variantId) || get(explicitId) || null;
        return config._realisticCharacter && globalThis.RealisticCharacter
            ? globalThis.RealisticCharacter.assetFor(resolved, config) : resolved;
    }

    function listViewOptions() {
        return PREMIUM_VIEW_OPTIONS.map(entry => ({ ...entry }));
    }

    function getAllAssets() {
        return [
            ...Object.values(ASSETS),
            ...Object.keys(PREMIUM_ASSET_ALIASES)
                .map(resolveAliasedAsset)
                .filter(Boolean)
        ];
    }

    function clamp(value, min, max) {
        const num = Number(value);
        return Number.isFinite(num) ? Math.max(min, Math.min(max, num)) : min;
    }

    function stateFromCatalog(catalog, values = {}) {
        return Object.fromEntries(Object.entries(catalog).map(([key, spec]) => {
            const fallback = Number.isFinite(Number(spec.defaultValue)) ? Number(spec.defaultValue) : 0;
            const raw = values && Object.prototype.hasOwnProperty.call(values, key) ? values[key] : fallback;
            return [key, clamp(raw, spec.min, spec.max)];
        }));
    }

    function getDefaultFaceState() {
        return stateFromCatalog(FACE_PROPERTIES);
    }

    function getDefaultAdjustments() {
        return stateFromCatalog(ADJUST_PROPERTIES);
    }

    function getFaceState(config = {}, override = null) {
        return stateFromCatalog(FACE_PROPERTIES, {
            ...(config._svgAfricanFaceState || {}),
            ...(config.faceState || {}),
            ...(override || {})
        });
    }

    function getFacePreset(id = 'neutral') {
        const key = String(id || 'neutral').trim();
        return FACE_PRESETS[key] || FACE_PRESETS.neutral;
    }

    function getFacePresetState(id = 'neutral', override = null) {
        const preset = getFacePreset(id);
        return getFaceState({ faceState: preset?.state || {} }, override);
    }

    function listFacePresets() {
        return Object.values(FACE_PRESETS).map(preset => ({
            id: preset.id,
            name: preset.name,
            description: preset.description,
            state: cloneDeep(preset.state)
        }));
    }

    function getFaceAnimationFrameMap(id = '') {
        const frames = FACE_ANIMATIONS[String(id || '').trim()];
        if (!Array.isArray(frames)) return null;
        const frameMap = {};
        frames.forEach(frame => {
            const t = clamp(frame?.t, 0, 1);
            Object.entries(frame || {}).forEach(([property, value]) => {
                if (property === 't' || !FACE_PROPERTIES[property]) return;
                frameMap[property] = frameMap[property] || [];
                frameMap[property].push([t, clamp(value, FACE_PROPERTIES[property].min, FACE_PROPERTIES[property].max)]);
            });
        });
        return cloneDeep(frameMap);
    }

    function hasOwn(obj, key) {
        return !!obj && Object.prototype.hasOwnProperty.call(obj, key);
    }

    function getAssetRenderDefaults(assetId = DEFAULT_ASSET_ID) {
        const id = stripDrawnThreeQuarterRuntimeSuffix(assetId);
        const collectionPreset = globalThis.SvgAfricanCharacterCatalog?.getPreset(id.replace(/-(front|back|side-left|side-right|front-3q-left|front-3q-right|back-3q-left|back-3q-right)$/, ''));
        if (collectionPreset?.category) {
            const view = id.slice(collectionPreset.id.length + 1) || 'front';
            return {
                identity: cloneDeep(collectionPreset.identity),
                styling: { ...cloneDeep(collectionPreset.styling), view, sideFacing: view.endsWith('left') ? 'left' : 'right' },
                premiumAdjustments: cloneDeep(collectionPreset.premiumAdjustments),
                visualFingerprint: { label: id, requiredSvgTokens: ['premium-part'] }
            };
        }
        const direct = ASSET_RENDER_DEFAULTS[id];
        if (direct) return direct;
        if (/-(front|back)-3q-(left|right)$/.test(id)) {
            const match = id.match(/-(front|back)-3q-(left|right)$/);
            const view = `${match[1]}-3q-${match[2]}`;
            const frontId = getViewVariantAssetId(id, 'front');
            const frontDefaults = ASSET_RENDER_DEFAULTS[frontId] || {};
            const styling = {
                ...cloneDeep(frontDefaults.styling || {}),
                view,
                sideFacing: match[2]
            };
            const fingerprint = cloneDeep(frontDefaults.visualFingerprint || {});
            if (fingerprint.label) fingerprint.label = `${fingerprint.label}-${view}`;
            const tokens = Array.isArray(fingerprint.requiredSvgTokens) ? fingerprint.requiredSvgTokens : [];
            const viewTokens = view.startsWith('back')
                ? ['back-view-premium', 'three-quarter-premium', view]
                : ['three-quarter-premium', view];
            fingerprint.requiredSvgTokens = Object.freeze([...tokens, ...viewTokens]);
            return {
                ...cloneDeep(frontDefaults),
                styling: Object.freeze(styling),
                visualFingerprint: Object.freeze(fingerprint)
            };
        }
        if (/-back$/.test(id)) {
            const frontId = getViewVariantAssetId(id, 'front');
            const frontDefaults = ASSET_RENDER_DEFAULTS[frontId] || {};
            const styling = {
                ...cloneDeep(frontDefaults.styling || {}),
                view: 'back',
                sideFacing: 'right'
            };
            const fingerprint = cloneDeep(frontDefaults.visualFingerprint || {});
            if (fingerprint.label) fingerprint.label = `${fingerprint.label}-back`;
            const tokens = Array.isArray(fingerprint.requiredSvgTokens) ? fingerprint.requiredSvgTokens : [];
            fingerprint.requiredSvgTokens = Object.freeze([...tokens, 'back-view-premium']);
            return {
                ...cloneDeep(frontDefaults),
                styling: Object.freeze(styling),
                visualFingerprint: Object.freeze(fingerprint)
            };
        }
        if (/-side-(left|right)$/.test(id)) {
            const frontId = getViewVariantAssetId(id, 'front');
            const view = /-side-left$/.test(id) ? 'side-left' : 'side-right';
            const frontDefaults = ASSET_RENDER_DEFAULTS[frontId] || {};
            const styling = {
                ...cloneDeep(frontDefaults.styling || {}),
                view,
                sideFacing: view.endsWith('left') ? 'left' : 'right'
            };
            const fingerprint = cloneDeep(frontDefaults.visualFingerprint || {});
            if (fingerprint.label) fingerprint.label = `${fingerprint.label}-${view}`;
            const tokens = Array.isArray(fingerprint.requiredSvgTokens) ? fingerprint.requiredSvgTokens : [];
            fingerprint.requiredSvgTokens = Object.freeze([...tokens, 'side-view-premium']);
            return {
                ...cloneDeep(frontDefaults),
                styling: Object.freeze(styling),
                visualFingerprint: Object.freeze(fingerprint)
            };
        }
        return {};
    }

    function copyRootFields(source = {}, keys = []) {
        const result = {};
        keys.forEach(key => {
            if (hasOwn(source, key)) result[key] = source[key];
        });
        return result;
    }

    function normalizePremiumConfig(assetOrId = DEFAULT_ASSET_ID, config = {}) {
        const asset = typeof assetOrId === 'string' ? get(assetOrId) : assetOrId;
        const raw = (config && typeof config === 'object') ? config : {};
        const assetId = asset?.configAssetId
            || stripDrawnThreeQuarterRuntimeSuffix(asset?.id || raw.assetCharacterId || raw.assetId || DEFAULT_ASSET_ID);
        const defaults = getAssetRenderDefaults(assetId);
        const rootIdentity = copyRootFields(raw, IDENTITY_DEFAULT_KEYS);
        const rootStyling = copyRootFields(raw, STYLING_DEFAULT_KEYS);
        const identity = {
            ...cloneDeep(defaults.identity || {}),
            ...rootIdentity,
            ...cloneDeep(raw.identity || {})
        };
        const styling = {
            ...cloneDeep(defaults.styling || {}),
            ...rootStyling,
            ...cloneDeep(raw.styling || {})
        };

        if (Array.isArray(raw.accessories)) styling.accessories = [...raw.accessories];
        if (Array.isArray(raw.styling?.accessories)) styling.accessories = [...raw.styling.accessories];
        if (!Array.isArray(styling.accessories) && Array.isArray(defaults.styling?.accessories)) {
            styling.accessories = [...defaults.styling.accessories];
        }
        if (raw.colorOverrides && typeof raw.colorOverrides === 'object') {
            styling.colorOverrides = cloneDeep(raw.colorOverrides);
        }
        if (raw.styling?.colorOverrides && typeof raw.styling.colorOverrides === 'object') {
            styling.colorOverrides = cloneDeep(raw.styling.colorOverrides);
        }
        const normalizedView = normalizePremiumView(asset?.view || styling.view || raw.view || defaults.styling?.view || 'front');
        const profileSide = getPremiumViewSide(normalizedView);
        styling.view = normalizedView;
        styling.sideFacing = profileSide
            ? profileSide
            : (['left', 'right'].includes(styling.sideFacing) ? styling.sideFacing : 'right');
        styling.threeQuarterArtwork = getThreeQuarterArtworkMode(raw, asset);

        return {
            ...raw,
            engine: PREMIUM_ASSET_CONTRACT.engine,
            assetCharacterId: assetId,
            assetId,
            view: normalizedView,
            sideFacing: styling.sideFacing,
            threeQuarterArtwork: styling.threeQuarterArtwork,
            identity,
            styling,
            premiumAdjustments: {
                ...cloneDeep(defaults.premiumAdjustments || {}),
                ...cloneDeep(raw.premiumAdjustments || {})
            }
        };
    }

    function isCompleteAdjustmentState(values = {}) {
        if (!values || typeof values !== 'object') return false;
        return Object.keys(ADJUST_PROPERTIES).every(key => hasOwn(values, key));
    }

    function getAdjustments(config = {}, override = null) {
        const raw = {};
        const seenSources = new Set();
        mergeAdjustmentOverrides(raw, config.premiumAdjustments, { additive: true, skipDefaultMorphReset: true, seenSources });
        mergeAdjustmentOverrides(raw, config._svgAfricanAdjustments, { additive: true, skipDefaultMorphReset: true, seenSources });
        mergeAdjustmentOverrides(raw, config.adjustments, { additive: true, skipDefaultMorphReset: true, seenSources });
        mergeMorph(raw, getIdentityMorphAdjustments(config, raw));
        mergeAdjustmentOverrides(raw, override, { additive: true, skipDefaultMorphReset: true, seenSources });
        const legacyHeadScale = Number(raw.headScale);
        if (Number.isFinite(legacyHeadScale) && Math.abs(legacyHeadScale) > 0.0001) {
            if (!hasOwn(raw, 'headWidth')) raw.headWidth = legacyHeadScale;
            if (!hasOwn(raw, 'headHeight')) raw.headHeight = legacyHeadScale * 0.70;
            raw.headScale = 0;
        }
        const legacyNeckLength = Number(raw.neckLength);
        if (Number.isFinite(legacyNeckLength) && Math.abs(legacyNeckLength) > 0.0001) {
            if (!hasOwn(raw, 'neckHeight')) raw.neckHeight = legacyNeckLength;
            raw.neckLength = 0;
        }
        return stateFromCatalog(ADJUST_PROPERTIES, raw);
    }

    function resolveRenderAdjustments(config = {}, override = null) {
        if (isCompleteAdjustmentState(override)) {
            return stateFromCatalog(ADJUST_PROPERTIES, override);
        }
        return getAdjustments(config, override);
    }

    function getAdjustmentValue(adjustments = {}, key) {
        const spec = ADJUST_PROPERTIES[key] || {};
        const fallback = Number.isFinite(Number(spec.defaultValue)) ? Number(spec.defaultValue) : 0;
        const raw = hasOwn(adjustments, key) ? Number(adjustments[key]) : fallback;
        return clamp(Number.isFinite(raw) ? raw : fallback, Number(spec.min ?? -1), Number(spec.max ?? 1));
    }

    function getHeadWidthAdjustment(adjustments = {}) {
        return getAdjustmentValue(adjustments, 'headWidth');
    }

    function getHeadHeightAdjustment(adjustments = {}) {
        return getAdjustmentValue(adjustments, 'headHeight');
    }

    function getNeckWidthAdjustment(adjustments = {}) {
        return getAdjustmentValue(adjustments, 'neckWidth');
    }

    function getNeckHeightAdjustment(adjustments = {}) {
        return getAdjustmentValue(adjustments, 'neckHeight');
    }

    function cloneProfile(profile) {
        return profile ? { ...profile } : null;
    }

    function cloneDeep(value) {
        if (value == null) return value;
        try { return JSON.parse(JSON.stringify(value)); }
        catch (_) {
            if (Array.isArray(value)) return value.map(item => cloneDeep(item));
            if (typeof value === 'object') return { ...value };
            return value;
        }
    }

    function getAdjustedTorsoProfile(asset, adjusted) {
        const torso = cloneProfile(asset?.parts?.torso);
        if (!torso) return null;
        const centerX = torso.x + torso.width * 0.5;
        const abdomenProjection = getAdjustmentValue(adjusted, 'abdomenProjection');
        const abdomenWidth = getAdjustmentValue(adjusted, 'abdomenWidth');
        const chestProjection = getAdjustmentValue(adjusted, 'chestProjection');
        const breastProjection = getAdjustmentValue(adjusted, 'breastProjection');
        const backCurve = getAdjustmentValue(adjusted, 'backCurve');
        const buttockProjection = getAdjustmentValue(adjusted, 'buttockProjection');
        const widthScale = 1
            + adjusted.torsoWidth * 0.96
            + adjusted.shoulderWidth * 0.24
            + adjusted.hipWidth * 0.18
            + Math.max(0, chestProjection) * 0.08
            + Math.max(0, breastProjection) * 0.07
            + Math.max(0, abdomenProjection) * 0.14
            + Math.max(0, abdomenWidth) * 0.22
            + Math.max(0, buttockProjection) * 0.08
            + Math.max(0, -backCurve) * 0.04;
        const heightScale = 1 + adjusted.torsoLength * 0.90;
        const nextWidth = torso.width * widthScale;
        torso.x = centerX - nextWidth * 0.5;
        torso.width = nextWidth;
        torso.height = torso.height * heightScale;
        return torso;
    }

    function hexToRgb(hex) {
        const normalized = String(hex || '').replace('#', '').trim();
        if (!/^[0-9a-f]{6}$/i.test(normalized)) return null;
        return {
            r: parseInt(normalized.slice(0, 2), 16),
            g: parseInt(normalized.slice(2, 4), 16),
            b: parseInt(normalized.slice(4, 6), 16)
        };
    }

    function rgbToHex(rgb) {
        const toHex = value => clamp(Math.round(value), 0, 255).toString(16).padStart(2, '0');
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    }

    function mix(hex, target, amount) {
        const a = hexToRgb(hex) || hexToRgb(DEFAULT_PALETTE.skin);
        const b = hexToRgb(target) || { r: 255, g: 255, b: 255 };
        const t = clamp(amount, 0, 1);
        return rgbToHex({
            r: a.r + (b.r - a.r) * t,
            g: a.g + (b.g - a.g) * t,
            b: a.b + (b.b - a.b) * t
        });
    }

    function normalizeHexColor(value) {
        const text = String(value || '').trim();
        const match = text.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i);
        if (!match) return null;
        const body = match[1];
        const expanded = body.length === 3
            ? body.split('').map(ch => ch + ch).join('')
            : body;
        return `#${expanded.toLowerCase()}`;
    }

    function getColorOverrides(config = {}) {
        const styling = readStyling(config);
        const raw = styling.colorOverrides || config.colorOverrides || {};
        return raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    }

    function applyColorOverrides(palette, config = {}) {
        const overrides = getColorOverrides(config);
        const next = { ...palette };
        const slotMap = {
            top: 'blazer',
            outer: 'blazer',
            jacket: 'blazer',
            shirt: 'blouse',
            blouse: 'blouse',
            inner: 'blouse',
            tie: 'tie',
            necktie: 'tie',
            bottom: 'skirt',
            skirt: 'skirt',
            wrapper: 'skirt',
            shoes: 'shoe',
            shoe: 'shoe',
            footwear: 'shoe',
            glasses: 'glass',
            eyeglasses: 'glass',
            glass: 'glass',
            headwear: 'headwear',
            headgear: 'headwear',
            accent: 'accent'
        };
        Object.entries(slotMap).forEach(([sourceKey, paletteKey]) => {
            const color = normalizeHexColor(overrides[sourceKey]);
            if (color) next[paletteKey] = color;
        });
        if (normalizeHexColor(overrides.top) || normalizeHexColor(overrides.outer) || normalizeHexColor(overrides.jacket)) {
            next.blazerShade = mix(next.blazer, '#05070c', 0.35);
        }
        if (normalizeHexColor(overrides.headwear) || normalizeHexColor(overrides.headgear)) {
            next.headwearShade = mix(next.headwear, '#05070c', 0.35);
        }
        next.headwear = next.headwear || next.blazer;
        next.headwearShade = next.headwearShade || mix(next.headwear, '#05070c', 0.35);
        return next;
    }

    function normalizeId(value, fallback) {
        const text = String(value || '').trim();
        return text || fallback;
    }

    function getPresentationVisualProfile(value = 'female') {
        const key = normalizeId(value, 'female');
        return PRESENTATION_VISUAL_PROFILES[key] || PRESENTATION_VISUAL_PROFILES.female;
    }

    function getFacialStyleProfile(config = {}) {
        const identity = readIdentity(config);
        return {
            eyes: EYE_STYLE_VISUAL_PROFILES[identity.eyes || config.eyes] || EYE_STYLE_VISUAL_PROFILES.almond,
            nose: NOSE_STYLE_VISUAL_PROFILES[identity.nose || config.nose] || NOSE_STYLE_VISUAL_PROFILES.soft,
            lips: LIP_STYLE_VISUAL_PROFILES[identity.lips || config.lips] || LIP_STYLE_VISUAL_PROFILES.natural,
            presentation: getPresentationVisualProfile(identity.presentation || config.presentation)
        };
    }

    function getFaceShapeSpec(value = 'oval') {
        const key = normalizeId(value, 'oval');
        const source = globalThis.SvgAfricanCharacterCatalog?.faceShapes || {};
        return source[key] || Object.values(source).find(item => item?.id === key) || { id: 'oval', rx: 34, ry: 42 };
    }

    function getFaceShapeVisualProfile(value = 'oval', adjustments = {}) {
        const spec = getFaceShapeSpec(value);
        const base = FACE_SHAPE_VISUAL_PROFILES.oval;
        const selected = FACE_SHAPE_VISUAL_PROFILES[spec.id] || FACE_SHAPE_VISUAL_PROFILES[value] || base;
        const strength = getAdjustmentValue(adjustments, 'faceShapeStrength');
        const blend = clamp(FACE_SHAPE_PROFILE_BLEND + strength * 0.34, 0.04, 0.78);
        const profile = {};
        new Set([...Object.keys(base), ...Object.keys(selected)]).forEach(key => {
            const baseValue = Number(base[key] ?? 0);
            const selectedValue = Number(selected[key] ?? baseValue);
            profile[key] = baseValue + (selectedValue - baseValue) * blend;
        });
        if (spec.id === 'oval' && Math.abs(strength) > 0.0001) {
            profile.faceWidth += strength * 0.75;
            profile.faceHeight += strength * 0.45;
            profile.cheekScale += strength * 0.018;
            profile.jawScale += strength * 0.028;
            profile.chinScale += strength * 0.018;
            profile.chinDrop += strength * 0.28;
        }
        return profile;
    }

    function readIdentity(config = {}) {
        return config.identity || config || {};
    }

    function readStyling(config = {}) {
        return config.styling || config || {};
    }

    function mergeMorph(target, morph, weight = 1) {
        Object.entries(morph || {}).forEach(([key, value]) => {
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return;
            target[key] = (target[key] || 0) + numeric * weight;
        });
    }

    function getIdentityMorphAdjustments(config = {}, adjustmentSource = {}) {
        const identity = readIdentity(config);
        const result = {};
        mergeMorph(result, AGE_MORPHS[normalizeId(identity.ageGroup || config.ageGroup, 'adult')]);
        mergeMorph(result, BODY_MORPHS[normalizeId(identity.body || config.body, 'average')]);
        mergeMorph(result, HEIGHT_MORPHS[normalizeId(identity.height || config.height, 'average')]);
        const faceShapeWeight = clamp(0.24 + getAdjustmentValue(adjustmentSource, 'faceShapeStrength') * 0.30, 0.03, 0.64);
        mergeMorph(result, FACE_SHAPE_MORPHS[normalizeId(identity.face || config.face, 'oval')], faceShapeWeight);
        mergeMorph(result, EYE_STYLE_MORPHS[normalizeId(identity.eyes || config.eyes, 'almond')]);
        mergeMorph(result, NOSE_STYLE_MORPHS[normalizeId(identity.nose || config.nose, 'soft')]);
        mergeMorph(result, LIP_STYLE_MORPHS[normalizeId(identity.lips || config.lips, 'natural')]);
        return result;
    }

    function resolveTopClothing(config = {}) {
        const styling = readStyling(config);
        const outfit = normalizeId(styling.outfit || config.outfit, 'lecturer');
        const top = normalizeId(styling.topClothing || config.topClothing, 'auto');
        if (top && top !== 'auto') return top;
        return TOP_BY_OUTFIT[outfit] || 'shirt';
    }

    function resolveBottomClothing(config = {}) {
        const styling = readStyling(config);
        const identity = readIdentity(config);
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const outfit = normalizeId(styling.outfit || config.outfit, 'lecturer');
        const bottom = normalizeId(styling.bottomClothing || config.bottomClothing, 'auto');
        if (bottom && bottom !== 'auto') return bottom;
        if (presentation !== 'male' && outfit === 'student-casual') return 'skirt-pleated';
        const resolved = BOTTOM_BY_OUTFIT[outfit] || (presentation === 'male' ? 'trousers' : 'skirt-straight');
        if (presentation === 'male' && /skirt|wrapper|iro/.test(resolved)) return 'trousers';
        return resolved;
    }

    function resolveSkirtLength(config = {}) {
        const styling = readStyling(config);
        return normalizeId(styling.skirtLength || config.skirtLength, 'at-knee');
    }

    function resolveSleeveLength(config = {}, topClothing = null) {
        const styling = readStyling(config);
        const explicit = normalizeId(styling.sleeveLength || config.sleeveLength, 'auto');
        if (explicit && explicit !== 'auto' && hasOwn(SLEEVE_END_Y, explicit)) return explicit;
        const top = normalizeId(topClothing || resolveTopClothing(config), 'shirt');
        return SLEEVE_BY_TOP[top] || 'short';
    }

    function resolveNeckTieType(config = {}) {
        const styling = readStyling(config);
        return normalizeId(styling.neckTieType || styling.tieType || config.neckTieType || config.tieType, 'auto');
    }

    function resolveNeckTieDesign(config = {}) {
        const styling = readStyling(config);
        return normalizeId(styling.neckTieDesign || styling.tieDesign || config.neckTieDesign || config.tieDesign, 'auto');
    }

    function renderNeckTieDesignMarkup(id, design = 'auto', tieType = 'standard', y = 55, shapePath = '') {
        const tieDesign = normalizeId(design, 'auto');
        if (!tieDesign || tieDesign === 'auto' || tieDesign === 'solid') return '';

        const roleText = `tie-design tie-design-${tieDesign} necktie-pattern`.replace(/\s+/g, ' ').trim();
        const lightStroke = 'var(--blouse)';
        const accentStroke = 'var(--accent)';
        const clipId = `${id}-design-clip`;
        const clip = shapePath ? `<clipPath id="${clipId}"><path d="${shapePath}"/></clipPath>` : '';
        const clipAttr = shapePath ? ` clip-path="url(#${clipId})"` : '';

        if (tieType === 'bow-tie' || tieType === 'bowtie') {
            if (tieDesign === 'dots') {
                return `<g id="${id}-design" data-svg-african-role="${roleText}" fill="${lightStroke}" opacity=".66">
        <circle cx="58" cy="${y + 6}" r="1.1"/><circle cx="63" cy="${y + 8}" r="1"/><circle cx="77" cy="${y + 8}" r="1"/><circle cx="82" cy="${y + 6}" r="1.1"/>
    </g>`;
            }
            if (tieDesign === 'geometric-accent') {
                return `<g id="${id}-design" data-svg-african-role="${roleText}" fill="none" stroke="${accentStroke}" stroke-width="1.15" opacity=".74" stroke-linecap="round" stroke-linejoin="round">
        <path d="M55 ${y + 7} L62 ${y + 4} L67 ${y + 7} M72 ${y + 7} L79 ${y + 4} L84 ${y + 7}"/>
    </g>`;
            }
            return `<g id="${id}-design" data-svg-african-role="${roleText}" fill="none" stroke="${tieDesign === 'regimental' ? accentStroke : lightStroke}" stroke-width="${tieDesign === 'double-stripe' ? '1.2' : '1.6'}" opacity=".64" stroke-linecap="round">
        <path d="M54 ${y + 5} L65 ${y + 10} M72 ${y + 10} L83 ${y + 5}"/>
        ${tieDesign === 'double-stripe' || tieDesign === 'regimental' ? `<path d="M58 ${y + 3} L67 ${y + 7} M70 ${y + 7} L79 ${y + 3}"/>` : ''}
    </g>`;
        }

        if (tieDesign === 'dots') {
            return `${clip}<g id="${id}-design" data-svg-african-role="${roleText}"${clipAttr} fill="${lightStroke}" opacity=".64">
        <circle cx="67" cy="${y + 16}" r="1.15"/><circle cx="70" cy="${y + 29}" r="1.05"/><circle cx="66" cy="${y + 43}" r="1.1"/><circle cx="71" cy="${y + 57}" r="1.05"/>
    </g>`;
        }
        if (tieDesign === 'geometric-accent') {
            return `${clip}<g id="${id}-design" data-svg-african-role="${roleText}"${clipAttr} fill="none" stroke="${accentStroke}" stroke-width="1.2" opacity=".76" stroke-linecap="round" stroke-linejoin="round">
        <path d="M68 ${y + 11} L72 ${y + 18} L68 ${y + 25} L64 ${y + 18} Z"/>
        <path d="M68 ${y + 38} L73 ${y + 47} L68 ${y + 56} L63 ${y + 47} Z"/>
    </g>`;
        }

        const stroke = tieDesign === 'regimental' ? accentStroke : lightStroke;
        const width = tieDesign === 'double-stripe' ? '1.35' : '1.75';
        const extra = tieDesign === 'double-stripe' || tieDesign === 'regimental'
            ? `<path d="M57 ${y + 27} L75 ${y + 10} M58 ${y + 59} L78 ${y + 39}" stroke="${lightStroke}" stroke-width="1.05" opacity=".46"/>`
            : '';
        return `${clip}<g id="${id}-design" data-svg-african-role="${roleText}"${clipAttr} fill="none" stroke="${stroke}" stroke-width="${width}" opacity=".68" stroke-linecap="round">
        <path d="M58 ${y + 18} L74 ${y + 2} M58 ${y + 43} L76 ${y + 25} M60 ${y + 68} L78 ${y + 50}"/>
        ${extra}
    </g>`;
    }

    function renderNeckTieMarkup(type = 'auto', options = {}) {
        const requested = normalizeId(type, 'auto');
        const defaultType = normalizeId(options.defaultType || 'standard', 'standard');
        const tieType = requested === 'auto' ? defaultType : requested;
        if (tieType === 'none') return '';

        const id = options.id || 'tie';
        const role = String(options.role || 'formal-office').trim();
        const y = Number.isFinite(Number(options.y)) ? Number(options.y) : 55;
        const design = normalizeId(options.design || options.tieDesign || 'auto', 'auto');
        const defaultDesign = normalizeId(options.defaultDesign || 'solid', 'solid');
        const tieDesign = design === 'auto' ? defaultDesign : design;
        const roleText = `tie necktie ${role} visible-neck-tie tie-type-${tieType} tie-design-${tieDesign}`.replace(/\s+/g, ' ').trim();

        if (tieType === 'bow-tie' || tieType === 'bowtie') {
            return `<g id="${id}" data-svg-african-role="${roleText}">
        <path id="${id}-left-wing" d="M67 ${y + 3} C58 ${y - 2} 51 ${y + 3} 51 ${y + 11} C58 ${y + 11} 63 ${y + 9} 67 ${y + 6} Z" fill="var(--tie)"/>
        <path id="${id}-right-wing" d="M69 ${y + 6} C73 ${y + 9} 78 ${y + 11} 85 ${y + 11} C85 ${y + 3} 78 ${y - 2} 69 ${y + 3} Z" fill="var(--tie)"/>
        <path id="${id}-knot" d="M65 ${y + 2} C67 ${y} 70 ${y} 72 ${y + 2} L72 ${y + 10} C70 ${y + 12} 67 ${y + 12} 65 ${y + 10} Z" fill="var(--tie)" opacity=".96"/>
        ${renderNeckTieDesignMarkup(id, tieDesign, tieType, y)}
    </g>`;
        }

        let tiePath = '';
        if (tieType === 'slim') {
            tiePath = `M66.5 ${y} L70.5 ${y} L72.5 ${y + 59} L68.5 ${y + 76} L64.5 ${y + 59} Z`;
        } else if (tieType === 'wide') {
            tiePath = `M64.5 ${y} L72.5 ${y} L78 ${y + 65} L68.5 ${y + 82} L59 ${y + 65} Z`;
        } else {
            tiePath = `M66 ${y} L71 ${y} L75 ${y + 61} L68 ${y + 79} L61 ${y + 61} Z`;
        }

        return `<g id="${id}" data-svg-african-role="${roleText}">
        <path id="${id}-shape" d="${tiePath}" fill="var(--tie)"/>
        ${renderNeckTieDesignMarkup(id, tieDesign, tieType, y, tiePath)}
    </g>`;
    }

    function isSkirtLikeBottom(bottom = '') {
        return /skirt|wrapper|iro|george|robe|kimono|cheongsam|apron|drape|gown/.test(String(bottom || ''));
    }

    function getSkirtLegCoverage(skirtLength = 'at-knee') {
        return ({
            'above-knee': 96,
            'at-knee': 138,
            'below-knee': 178,
            ankle: 214
        })[normalizeId(skirtLength, 'at-knee')] || 138;
    }

    function resolveClothingPalette(config = {}) {
        const styling = readStyling(config);
        return normalizeId(styling.clothingPalette || config.clothingPalette, 'auto');
    }

    function resolveFabricDesign(config = {}) {
        const styling = readStyling(config);
        return normalizeId(styling.fabricDesign || config.fabricDesign, 'auto');
    }

    function resolveEffectiveFabricDesign(config = {}, styleText = '') {
        const requested = resolveFabricDesign(config);
        if (requested && requested !== 'auto') return requested;
        const text = String(styleText || '').toLowerCase();
        if (/plain-business-suit|plain-suit-trousers/.test(text)) return 'plain';
        if (/military|fatigue|camouflage|soldier/.test(text)) return 'camouflage';
        if (/security|reflective|engineer/.test(text)) return 'reflective-tape';
        if (/football|basketball|tracksuit|gym|athlete|sports|jersey/.test(text)) return 'sport-stripes';
        if (/school|student-uniform/.test(text)) return 'school-check';
        if (/banker|executive|double-breasted|three-piece|formal-shirt-tie|lawyer|corporate/.test(text)) return 'pinstripe';
        if (/academic-robe|academic-gown/.test(text)) return 'subtle-trim';
        if (/maasai/.test(text)) return 'maasai-plaid';
        if (/mandarin|cheongsam|qipao|east-asian/.test(text)) return 'mandarin-frogs';
        if (/kimono/.test(text)) return 'kimono-floral';
        if (/poncho|serape|latin-american/.test(text)) return 'poncho-stripes';
        if (/folk|apron|dirndl|lederhosen|folk-european/.test(text)) return 'folk-embroidery';
        if (/embroidered-national-robe|middle-eastern/.test(text)) return 'robe-medallions';
        if (/linen|toga|ancient-mediterranean/.test(text)) return 'linen-border';
        if (/sari|world-drape/.test(text)) return 'sari-drape';
        if (/striped-wrapper/.test(text)) return 'striped-wrapper';
        if (/dashiki|south-african/.test(text)) return 'dashiki-border';
        if (/beaded/.test(text)) return 'beaded-bands';
        if (/robe|kimono|circular/.test(text)) return 'circular-robe';
        if (/ankara/.test(text)) return 'ankara-motif';
        if (/iro|wrapper|george|agbada|senator|buba|yoruba|igbo|hausa|niger-delta/.test(text)) return 'woven-bands';
        if (/business|suit|blazer|lecturer|doctor|nurse|lab-coat|clinical|scrubs/.test(text)) return 'subtle-trim';
        return 'plain';
    }

    function renderFabricDesignMarkup(design, options = {}) {
        const id = normalizeId(design, 'plain');
        if (!id || id === 'auto' || id === 'plain') return '';
        const role = options.role || 'fabric-design';
        const x1 = Number.isFinite(Number(options.x1)) ? Number(options.x1) : 18;
        const x2 = Number.isFinite(Number(options.x2)) ? Number(options.x2) : 118;
        const y1 = Number.isFinite(Number(options.y1)) ? Number(options.y1) : 54;
        const y2 = Number.isFinite(Number(options.y2)) ? Number(options.y2) : 152;
        const w = Math.max(8, x2 - x1);
        const h = Math.max(12, y2 - y1);
        const cx = x1 + w * 0.5;
        const cy = y1 + h * 0.5;
        const dx = w * 0.22;
        const dy = h * 0.22;
        const opacity = options.compact ? '.20' : '.24';
        const strokeWidth = options.compact ? '1.05' : '1.25';

        if (id === 'subtle-trim') {
            return `<g id="${role}" data-svg-african-role="fabric-design subtle-trim ${role}" fill="none" stroke-linecap="round" opacity=".62">
        <path d="M${x1 + w * 0.12} ${y1 + h * 0.14} C${x1 + w * 0.32} ${y1 + h * 0.22} ${x2 - w * 0.32} ${y1 + h * 0.22} ${x2 - w * 0.12} ${y1 + h * 0.14}" stroke="var(--accent)" stroke-width="${strokeWidth}"/>
        <path d="M${x1 + w * 0.16} ${y2 - h * 0.16} C${x1 + w * 0.36} ${y2 - h * 0.08} ${x2 - w * 0.36} ${y2 - h * 0.08} ${x2 - w * 0.16} ${y2 - h * 0.16}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".34"/>
    </g>`;
        }
        if (id === 'pinstripe') {
            const stripes = [0.14, 0.30, 0.70, 0.86]
                .map(pos => `<path d="M${(x1 + w * pos).toFixed(1)} ${y1} C${(x1 + w * (pos - 0.02)).toFixed(1)} ${cy} ${(x1 + w * (pos + 0.02)).toFixed(1)} ${cy} ${(x1 + w * pos).toFixed(1)} ${y2}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".18"/>`)
                .join('');
            return `<g id="${role}" data-svg-african-role="fabric-design pinstripe ${role}" fill="none" stroke-linecap="round">${stripes}</g>`;
        }
        if (id === 'sport-stripes') {
            return `<g id="${role}" data-svg-african-role="fabric-design sport-stripes athletic-kit ${role}" fill="none" stroke-linecap="round" opacity=".82">
        <path d="M${x1 + w * 0.10} ${y1 + h * 0.16} L${x2 - w * 0.10} ${y1 + h * 0.16}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 1.6).toFixed(2)}"/>
        <path d="M${x1 + w * 0.18} ${y1 + h * 0.32} L${x2 - w * 0.18} ${y1 + h * 0.32}" stroke="#ffffff" stroke-width="${(Number(strokeWidth) + 0.8).toFixed(2)}" opacity=".68"/>
        <path d="M${x1 + w * 0.18} ${y2 - h * 0.18} L${x2 - w * 0.18} ${y2 - h * 0.18}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.9).toFixed(2)}"/>
    </g>`;
        }
        if (id === 'camouflage') {
            return `<g id="${role}" data-svg-african-role="fabric-design camouflage military-fatigue ${role}" opacity=".36">
        <path d="M${x1 + w * 0.12} ${y1 + h * 0.20} C${x1 + w * 0.28} ${y1 + h * 0.07} ${x1 + w * 0.42} ${y1 + h * 0.22} ${x1 + w * 0.30} ${y1 + h * 0.36} C${x1 + w * 0.19} ${y1 + h * 0.45} ${x1 + w * 0.05} ${y1 + h * 0.34} ${x1 + w * 0.12} ${y1 + h * 0.20} Z" fill="#1f2a16"/>
        <path d="M${x1 + w * 0.58} ${y1 + h * 0.18} C${x1 + w * 0.75} ${y1 + h * 0.06} ${x2 - w * 0.05} ${y1 + h * 0.24} ${x2 - w * 0.20} ${y1 + h * 0.40} C${x1 + w * 0.66} ${y1 + h * 0.52} ${x1 + w * 0.45} ${y1 + h * 0.34} ${x1 + w * 0.58} ${y1 + h * 0.18} Z" fill="#89945d"/>
        <path d="M${x1 + w * 0.30} ${y2 - h * 0.34} C${x1 + w * 0.46} ${y2 - h * 0.48} ${x1 + w * 0.66} ${y2 - h * 0.33} ${x1 + w * 0.54} ${y2 - h * 0.14} C${x1 + w * 0.38} ${y2 - h * 0.02} ${x1 + w * 0.16} ${y2 - h * 0.18} ${x1 + w * 0.30} ${y2 - h * 0.34} Z" fill="#d6c88e"/>
    </g>`;
        }
        if (id === 'reflective-tape') {
            return `<g id="${role}" data-svg-african-role="fabric-design reflective-tape safety-workwear ${role}" fill="none" stroke-linecap="round" opacity=".88">
        <path d="M${x1 + w * 0.10} ${y1 + h * 0.20} L${x2 - w * 0.10} ${y1 + h * 0.20}" stroke="#facc15" stroke-width="${(Number(strokeWidth) + 2.0).toFixed(2)}"/>
        <path d="M${x1 + w * 0.16} ${y1 + h * 0.20} L${x2 - w * 0.16} ${y1 + h * 0.20}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".78"/>
        <path d="M${x1 + w * 0.18} ${y2 - h * 0.18} L${x2 - w * 0.18} ${y2 - h * 0.18}" stroke="#facc15" stroke-width="${(Number(strokeWidth) + 1.2).toFixed(2)}"/>
    </g>`;
        }
        if (id === 'school-check') {
            return `<g id="${role}" data-svg-african-role="fabric-design school-check student-uniform ${role}" fill="none" stroke-linecap="square" opacity=".52">
        <path d="M${x1 + w * 0.18} ${y1} L${x1 + w * 0.18} ${y2} M${x1 + w * 0.50} ${y1} L${x1 + w * 0.50} ${y2} M${x1 + w * 0.82} ${y1} L${x1 + w * 0.82} ${y2}" stroke="#ffffff" stroke-width="${strokeWidth}"/>
        <path d="M${x1} ${y1 + h * 0.24} L${x2} ${y1 + h * 0.24} M${x1} ${y1 + h * 0.52} L${x2} ${y1 + h * 0.52} M${x1} ${y1 + h * 0.80} L${x2} ${y1 + h * 0.80}" stroke="var(--accent)" stroke-width="${strokeWidth}"/>
    </g>`;
        }
        if (id === 'geometric') {
            return `<g id="${role}" data-svg-african-role="fabric-design geometric ${role}" fill="none" stroke-linecap="round" opacity="${opacity}">
        <path d="M${cx} ${y1 + dy * 0.35} L${cx + dx} ${cy} L${cx} ${y2 - dy * 0.35} L${cx - dx} ${cy} Z" stroke="var(--accent)" stroke-width="${strokeWidth}"/>
        <path d="M${x1 + w * 0.18} ${cy - dy * 0.45} L${x1 + w * 0.32} ${cy} L${x1 + w * 0.18} ${cy + dy * 0.45} L${x1 + w * 0.04} ${cy} Z" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".82"/>
        <path d="M${x2 - w * 0.18} ${cy - dy * 0.45} L${x2 - w * 0.04} ${cy} L${x2 - w * 0.18} ${cy + dy * 0.45} L${x2 - w * 0.32} ${cy} Z" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".82"/>
    </g>`;
        }
        if (id === 'ankara-motif') {
            return `<g id="${role}" data-svg-african-role="fabric-design ankara-motif ${role}" opacity=".78">
        <circle cx="${x1 + w * 0.25}" cy="${y1 + h * 0.28}" r="${Math.max(1.5, w * 0.028).toFixed(1)}" fill="var(--accent)"/>
        <circle cx="${x2 - w * 0.24}" cy="${y1 + h * 0.38}" r="${Math.max(1.5, w * 0.026).toFixed(1)}" fill="var(--blouse)" opacity=".7"/>
        <path d="M${cx} ${y1 + h * 0.22} L${cx + dx * 0.58} ${y1 + h * 0.34} L${cx} ${y1 + h * 0.47} L${cx - dx * 0.58} ${y1 + h * 0.34} Z" fill="var(--accent)" opacity=".48"/>
        <path d="M${x1 + w * 0.18} ${y2 - h * 0.34} C${x1 + w * 0.34} ${y2 - h * 0.46} ${x1 + w * 0.48} ${y2 - h * 0.22} ${x1 + w * 0.64} ${y2 - h * 0.34}" fill="none" stroke="var(--blouse)" stroke-width="${strokeWidth}" stroke-linecap="round" opacity=".55"/>
        <path d="M${x2 - w * 0.30} ${y2 - h * 0.20} L${x2 - w * 0.18} ${y2 - h * 0.10} L${x2 - w * 0.06} ${y2 - h * 0.20}" fill="none" stroke="var(--accent)" stroke-width="${strokeWidth}" stroke-linecap="round" opacity=".72"/>
    </g>`;
        }
        if (id === 'floral') {
            return `<g id="${role}" data-svg-african-role="fabric-design floral ${role}" opacity=".62">
        <g transform="translate(${cx} ${cy})">
            <circle cx="0" cy="0" r="${Math.max(1.6, w * 0.024).toFixed(1)}" fill="var(--accent)"/>
            <ellipse cx="0" cy="${(-dy * 0.18).toFixed(1)}" rx="${Math.max(1.6, w * 0.028).toFixed(1)}" ry="${Math.max(2.2, h * 0.045).toFixed(1)}" fill="var(--blouse)" opacity=".58"/>
            <ellipse cx="${(dx * 0.18).toFixed(1)}" cy="0" rx="${Math.max(2.2, w * 0.040).toFixed(1)}" ry="${Math.max(1.5, h * 0.027).toFixed(1)}" fill="var(--blouse)" opacity=".50"/>
            <ellipse cx="${(-dx * 0.18).toFixed(1)}" cy="0" rx="${Math.max(2.2, w * 0.040).toFixed(1)}" ry="${Math.max(1.5, h * 0.027).toFixed(1)}" fill="var(--blouse)" opacity=".50"/>
        </g>
        <path d="M${x1 + w * 0.20} ${y2 - h * 0.18} C${x1 + w * 0.34} ${y2 - h * 0.32} ${x1 + w * 0.44} ${y2 - h * 0.24} ${x1 + w * 0.53} ${y2 - h * 0.12}" fill="none" stroke="var(--accent)" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </g>`;
        }
        if (id === 'woven-bands') {
            return `<g id="${role}" data-svg-african-role="fabric-design woven-bands ${role}" fill="none" stroke-linecap="round" opacity=".74">
        <path d="M${x1 + w * 0.08} ${y1 + h * 0.18} L${x2 - w * 0.08} ${y1 + h * 0.18}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.55).toFixed(2)}"/>
        <path d="M${x1 + w * 0.12} ${y1 + h * 0.30} L${cx - w * 0.08} ${y1 + h * 0.21} L${cx + w * 0.08} ${y1 + h * 0.30} L${x2 - w * 0.12} ${y1 + h * 0.21}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".62"/>
        <path d="M${x1 + w * 0.12} ${y2 - h * 0.16} L${x2 - w * 0.12} ${y2 - h * 0.16}" stroke="var(--accent)" stroke-width="${strokeWidth}" opacity=".72"/>
    </g>`;
        }
        if (id === 'dashiki-border') {
            return `<g id="${role}" data-svg-african-role="fabric-design dashiki-border ${role}" fill="none" stroke-linecap="round" opacity=".86">
        <path d="M${cx} ${y1 + h * 0.08} L${cx - w * 0.15} ${y1 + h * 0.24} M${cx} ${y1 + h * 0.08} L${cx + w * 0.15} ${y1 + h * 0.24}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.75).toFixed(2)}"/>
        <path d="M${x1 + w * 0.14} ${y1 + h * 0.24} L${x1 + w * 0.24} ${y1 + h * 0.31} L${x1 + w * 0.34} ${y1 + h * 0.24} M${x2 - w * 0.34} ${y1 + h * 0.24} L${x2 - w * 0.24} ${y1 + h * 0.31} L${x2 - w * 0.14} ${y1 + h * 0.24}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".78"/>
        <path d="M${x1 + w * 0.10} ${y2 - h * 0.13} L${x2 - w * 0.10} ${y2 - h * 0.13}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.9).toFixed(2)}"/>
        <path d="M${x1 + w * 0.16} ${y2 - h * 0.21} L${x1 + w * 0.27} ${y2 - h * 0.13} L${x1 + w * 0.38} ${y2 - h * 0.21} M${x2 - w * 0.38} ${y2 - h * 0.21} L${x2 - w * 0.27} ${y2 - h * 0.13} L${x2 - w * 0.16} ${y2 - h * 0.21}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".70"/>
    </g>`;
        }
        if (id === 'maasai-plaid') {
            return `<g id="${role}" data-svg-african-role="fabric-design maasai-plaid ${role}" fill="none" stroke-linecap="square" opacity=".72">
        <path d="M${x1 + w * 0.22} ${y1} L${x1 + w * 0.22} ${y2} M${x1 + w * 0.50} ${y1} L${x1 + w * 0.50} ${y2} M${x1 + w * 0.78} ${y1} L${x1 + w * 0.78} ${y2}" stroke="#101010" stroke-width="${(Number(strokeWidth) + 0.55).toFixed(2)}"/>
        <path d="M${x1 + w * 0.12} ${y1} L${x1 + w * 0.12} ${y2} M${x1 + w * 0.64} ${y1} L${x1 + w * 0.64} ${y2}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".66"/>
        <path d="M${x1} ${y1 + h * 0.25} L${x2} ${y1 + h * 0.25} M${x1} ${y1 + h * 0.50} L${x2} ${y1 + h * 0.50} M${x1} ${y1 + h * 0.75} L${x2} ${y1 + h * 0.75}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.4).toFixed(2)}"/>
        <path d="M${x1} ${y1 + h * 0.36} L${x2} ${y1 + h * 0.36} M${x1} ${y1 + h * 0.62} L${x2} ${y1 + h * 0.62}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".56"/>
    </g>`;
        }
        if (id === 'striped-wrapper') {
            return `<g id="${role}" data-svg-african-role="fabric-design striped-wrapper ${role}" fill="none" stroke-linecap="round" opacity=".82">
        <path d="M${x1} ${y1 + h * 0.20} L${x2} ${y1 + h * 0.20} M${x1} ${y1 + h * 0.42} L${x2} ${y1 + h * 0.42} M${x1} ${y1 + h * 0.64} L${x2} ${y1 + h * 0.64} M${x1} ${y1 + h * 0.84} L${x2} ${y1 + h * 0.84}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.7).toFixed(2)}"/>
        <path d="M${x1 + w * 0.08} ${y1 + h * 0.31} L${x2 - w * 0.08} ${y1 + h * 0.31} M${x1 + w * 0.08} ${y1 + h * 0.53} L${x2 - w * 0.08} ${y1 + h * 0.53}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".54"/>
    </g>`;
        }
        if (id === 'sari-drape') {
            return `<g id="${role}" data-svg-african-role="fabric-design sari-drape ${role}" fill="none" stroke-linecap="round" opacity=".84">
        <path d="M${x1 + w * 0.88} ${y1 + h * 0.06} C${x1 + w * 0.70} ${y1 + h * 0.30} ${x1 + w * 0.40} ${y1 + h * 0.56} ${x1 + w * 0.12} ${y2 - h * 0.05}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 1.9).toFixed(2)}"/>
        <path d="M${x1 + w * 0.80} ${y1 + h * 0.10} C${x1 + w * 0.60} ${y1 + h * 0.35} ${x1 + w * 0.36} ${y1 + h * 0.58} ${x1 + w * 0.18} ${y2 - h * 0.07}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".62"/>
        <path d="M${x1 + w * 0.10} ${y2 - h * 0.15} L${x2 - w * 0.10} ${y2 - h * 0.15}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".54"/>
    </g>`;
        }
        if (id === 'circular-robe') {
            return `<g id="${role}" data-svg-african-role="fabric-design circular-robe ${role}" fill="none" stroke-linecap="round" opacity=".70">
        <circle cx="${x1 + w * 0.27}" cy="${y1 + h * 0.32}" r="${Math.max(3.4, w * 0.06).toFixed(1)}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.3).toFixed(2)}"/>
        <circle cx="${x2 - w * 0.24}" cy="${y1 + h * 0.48}" r="${Math.max(3.1, w * 0.055).toFixed(1)}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".68"/>
        <circle cx="${cx}" cy="${y2 - h * 0.24}" r="${Math.max(3.6, w * 0.065).toFixed(1)}" stroke="var(--accent)" stroke-width="${strokeWidth}" opacity=".74"/>
        <path d="M${x1 + w * 0.12} ${y2 - h * 0.10} L${x2 - w * 0.12} ${y2 - h * 0.10}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.5).toFixed(2)}"/>
    </g>`;
        }
        if (id === 'beaded-bands') {
            const beadR = Math.max(1.2, w * 0.018).toFixed(1);
            const beads = [0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80]
                .map(pos => `<circle cx="${(x1 + w * pos).toFixed(1)}" cy="${(y1 + h * 0.25).toFixed(1)}" r="${beadR}" fill="var(--accent)"/>`)
                .join('');
            return `<g id="${role}" data-svg-african-role="fabric-design beaded-bands ${role}" opacity=".82">
        <path d="M${x1 + w * 0.14} ${y1 + h * 0.22} C${x1 + w * 0.34} ${y1 + h * 0.34} ${x2 - w * 0.34} ${y1 + h * 0.34} ${x2 - w * 0.14} ${y1 + h * 0.22}" fill="none" stroke="var(--blouse)" stroke-width="${strokeWidth}" stroke-linecap="round" opacity=".62"/>
        ${beads}
        <path d="M${x1 + w * 0.10} ${y2 - h * 0.18} L${x2 - w * 0.10} ${y2 - h * 0.18} M${x1 + w * 0.18} ${y2 - h * 0.10} L${x2 - w * 0.18} ${y2 - h * 0.10}" fill="none" stroke="var(--accent)" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </g>`;
        }
        if (id === 'mandarin-frogs') {
            return `<g id="${role}" data-svg-african-role="fabric-design mandarin-frogs frog-buttons standing-collar ${role}" fill="none" stroke-linecap="round" opacity=".84">
        <path d="M${cx} ${y1 + h * 0.08} L${cx} ${y2 - h * 0.08}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.8).toFixed(2)}"/>
        <path d="M${cx - w * 0.04} ${y1 + h * 0.22} C${cx - w * 0.20} ${y1 + h * 0.15} ${cx - w * 0.22} ${y1 + h * 0.30} ${cx - w * 0.06} ${y1 + h * 0.30} M${cx + w * 0.04} ${y1 + h * 0.22} C${cx + w * 0.20} ${y1 + h * 0.15} ${cx + w * 0.22} ${y1 + h * 0.30} ${cx + w * 0.06} ${y1 + h * 0.30}" stroke="var(--blouse)" stroke-width="${strokeWidth}"/>
        <path d="M${cx - w * 0.04} ${y1 + h * 0.43} C${cx - w * 0.20} ${y1 + h * 0.36} ${cx - w * 0.22} ${y1 + h * 0.51} ${cx - w * 0.06} ${y1 + h * 0.51} M${cx + w * 0.04} ${y1 + h * 0.43} C${cx + w * 0.20} ${y1 + h * 0.36} ${cx + w * 0.22} ${y1 + h * 0.51} ${cx + w * 0.06} ${y1 + h * 0.51}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".78"/>
        <path d="M${x1 + w * 0.15} ${y2 - h * 0.11} L${x2 - w * 0.15} ${y2 - h * 0.11}" stroke="var(--accent)" stroke-width="${strokeWidth}" opacity=".72"/>
    </g>`;
        }
        if (id === 'kimono-floral') {
            return `<g id="${role}" data-svg-african-role="fabric-design kimono-floral robe-floral ${role}" opacity=".62">
        <circle cx="${x1 + w * 0.30}" cy="${y1 + h * 0.28}" r="${Math.max(2.2, w * 0.038).toFixed(1)}" fill="var(--accent)"/>
        <circle cx="${x1 + w * 0.25}" cy="${y1 + h * 0.23}" r="${Math.max(1.2, w * 0.020).toFixed(1)}" fill="var(--blouse)"/>
        <circle cx="${x2 - w * 0.28}" cy="${y1 + h * 0.56}" r="${Math.max(2.0, w * 0.034).toFixed(1)}" fill="var(--blouse)" opacity=".66"/>
        <path d="M${x1 + w * 0.18} ${y2 - h * 0.18} C${x1 + w * 0.34} ${y2 - h * 0.34} ${x1 + w * 0.50} ${y2 - h * 0.28} ${x1 + w * 0.64} ${y2 - h * 0.40}" fill="none" stroke="var(--accent)" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </g>`;
        }
        if (id === 'poncho-stripes') {
            return `<g id="${role}" data-svg-african-role="fabric-design poncho-stripes serape-bands ${role}" fill="none" stroke-linecap="round" opacity=".86">
        <path d="M${x1 + w * 0.04} ${y1 + h * 0.22} L${x2 - w * 0.04} ${y1 + h * 0.22}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 1.0).toFixed(2)}"/>
        <path d="M${x1 + w * 0.08} ${y1 + h * 0.36} L${x2 - w * 0.08} ${y1 + h * 0.36}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".78"/>
        <path d="M${x1 + w * 0.12} ${y1 + h * 0.52} L${x2 - w * 0.12} ${y1 + h * 0.52}" stroke="var(--accent)" stroke-width="${strokeWidth}" opacity=".82"/>
        <path d="M${x1 + w * 0.18} ${y1 + h * 0.68} L${x2 - w * 0.18} ${y1 + h * 0.68}" stroke="#ffffff" stroke-width="${strokeWidth}" opacity=".52"/>
    </g>`;
        }
        if (id === 'folk-embroidery') {
            return `<g id="${role}" data-svg-african-role="fabric-design folk-embroidery apron-vest ${role}" fill="none" stroke-linecap="round" opacity=".78">
        <path d="M${x1 + w * 0.20} ${y1 + h * 0.16} C${x1 + w * 0.32} ${y1 + h * 0.24} ${x1 + w * 0.42} ${y1 + h * 0.24} ${x1 + w * 0.52} ${y1 + h * 0.16}" stroke="var(--accent)" stroke-width="${strokeWidth}"/>
        <path d="M${x2 - w * 0.20} ${y1 + h * 0.16} C${x2 - w * 0.32} ${y1 + h * 0.24} ${x2 - w * 0.42} ${y1 + h * 0.24} ${x2 - w * 0.52} ${y1 + h * 0.16}" stroke="var(--accent)" stroke-width="${strokeWidth}"/>
        <path d="M${cx} ${y1 + h * 0.32} L${cx} ${y2 - h * 0.10}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".58"/>
        <path d="M${x1 + w * 0.18} ${y2 - h * 0.16} L${x2 - w * 0.18} ${y2 - h * 0.16}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.6).toFixed(2)}"/>
    </g>`;
        }
        if (id === 'robe-medallions') {
            return `<g id="${role}" data-svg-african-role="fabric-design robe-medallions national-robe ${role}" fill="none" opacity=".70">
        <circle cx="${cx}" cy="${y1 + h * 0.30}" r="${Math.max(4, w * 0.07).toFixed(1)}" stroke="var(--accent)" stroke-width="${strokeWidth}"/>
        <circle cx="${x1 + w * 0.28}" cy="${y1 + h * 0.58}" r="${Math.max(2.6, w * 0.045).toFixed(1)}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".74"/>
        <circle cx="${x2 - w * 0.28}" cy="${y1 + h * 0.58}" r="${Math.max(2.6, w * 0.045).toFixed(1)}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".74"/>
        <path d="M${x1 + w * 0.12} ${y1 + h * 0.12} L${x1 + w * 0.12} ${y2 - h * 0.10} M${x2 - w * 0.12} ${y1 + h * 0.12} L${x2 - w * 0.12} ${y2 - h * 0.10}" stroke="var(--accent)" stroke-width="${strokeWidth}" stroke-linecap="round"/>
    </g>`;
        }
        if (id === 'linen-border') {
            return `<g id="${role}" data-svg-african-role="fabric-design linen-border toga-drape ${role}" fill="none" stroke-linecap="round" opacity=".76">
        <path d="M${x1 + w * 0.12} ${y1 + h * 0.16} C${x1 + w * 0.32} ${y1 + h * 0.26} ${x2 - w * 0.32} ${y1 + h * 0.26} ${x2 - w * 0.12} ${y1 + h * 0.16}" stroke="var(--accent)" stroke-width="${(Number(strokeWidth) + 0.45).toFixed(2)}"/>
        <path d="M${x1 + w * 0.18} ${y2 - h * 0.18} L${x2 - w * 0.18} ${y2 - h * 0.18}" stroke="var(--accent)" stroke-width="${strokeWidth}" opacity=".78"/>
        <path d="M${x1 + w * 0.28} ${y2 - h * 0.28} L${x2 - w * 0.28} ${y2 - h * 0.28}" stroke="var(--blouse)" stroke-width="${strokeWidth}" opacity=".50"/>
    </g>`;
        }
        return '';
    }

    function mergeAdjustmentOverrides(target, values = {}, options = {}) {
        if (!values || typeof values !== 'object') return;
        if (options.seenSources) {
            const signature = Object.entries(values)
                .filter(([key, value]) => ADJUST_PROPERTIES[key] && Number.isFinite(Number(value)))
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([key, value]) => `${key}:${Number(value).toFixed(6)}`)
                .join('|');
            if (!signature || options.seenSources.has(signature)) return;
            options.seenSources.add(signature);
        }
        Object.entries(values).forEach(([key, value]) => {
            const spec = ADJUST_PROPERTIES[key];
            if (!spec) return;
            const numeric = Number(value);
            if (!Number.isFinite(numeric)) return;
            const fallback = Number.isFinite(Number(spec.defaultValue)) ? Number(spec.defaultValue) : 0;
            const current = Number(target[key]);
            if (options.skipDefaultMorphReset && Math.abs(numeric - fallback) <= 0.0001) {
                return;
            }
            if (options.additive) {
                target[key] = (Number.isFinite(current) ? current : fallback) + numeric - fallback;
            } else {
                target[key] = numeric;
            }
        });
    }

    function hasAccessory(config = {}, accessoryId) {
        const source = Array.isArray(config.styling?.accessories)
            ? config.styling.accessories
            : (Array.isArray(config.accessories) ? config.accessories : []);
        return source.some(item => String(item || '').trim() === accessoryId);
    }

    function getSkinColor(config = {}) {
        const Catalog = globalThis.SvgAfricanCharacterCatalog;
        return Catalog?.skinColor?.(config) || DEFAULT_PALETTE.skin;
    }

    function getHairPalette(config = {}) {
        const Catalog = globalThis.SvgAfricanCharacterCatalog;
        const identity = readIdentity(config);
        const spec = Catalog?.hairColorSpec?.(identity.hairColor || config.hairColor);
        const photoHair = config._photoCharacter?.vector || config._photoCharacter?.appearance;
        const photoColor = normalizeHexColor(photoHair?.hairColor);
        const color = photoColor || spec?.color || DEFAULT_PALETTE.hair;
        return {
            hair: color,
            hairLight: photoColor ? mix(color, '#ffffff', 0.24) : spec?.light || mix(color, '#ffffff', 0.24)
        };
    }

    function getHeadwearPalette(config = {}, fallbackColor = DEFAULT_PALETTE.blazer) {
        const styling = readStyling(config);
        const headwear = normalizeId(styling.headwear || config.headwear, 'none');
        const culturalStyle = normalizeId(styling.culturalStyle || config.culturalStyle, 'contemporary');
        const isWearingHeadwear = headwear && headwear !== 'none';
        const color = isWearingHeadwear
            ? (HEADWEAR_DEFAULT_COLORS[headwear] || CULTURAL_HEADWEAR_DEFAULTS[culturalStyle] || DEFAULT_PALETTE.headwear)
            : (normalizeHexColor(fallbackColor) || DEFAULT_PALETTE.headwear);

        return {
            headwear: color,
            headwearShade: mix(color, '#05070c', 0.36)
        };
    }

    function getPalette(config = {}) {
        const skin = normalizeHexColor(config._realisticCharacter?.mode === 'hybrid' ? config._realisticCharacter.hybrid?.skin : null) || normalizeHexColor(config._photoCharacter?.skin) || getSkinColor(config);
        const hairPalette = getHairPalette(config);
        const styling = config.styling || config || {};
        const identity = config.identity || config || {};
        const outfit = normalizeId(styling.outfit || config.outfit, 'lecturer');
        const topClothing = resolveTopClothing(config);
        const bottomClothing = resolveBottomClothing(config);
        const culturalStyle = normalizeId(styling.culturalStyle || config.culturalStyle, 'contemporary');
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const profession = normalizeId(styling.profession || config.profession, '');
        const footwear = normalizeId(styling.footwear || config.footwear, 'formal');
        const styleText = `${outfit} ${topClothing} ${bottomClothing} ${profession} ${culturalStyle}`;
        const isAnkara = /ankara/.test(styleText);
        const isDashiki = /dashiki|south-african/.test(styleText);
        const isMaasai = /maasai|east-african/.test(styleText);
        const isSariDrape = /sari|world-drape/.test(styleText);
        const isMandarin = /mandarin|cheongsam|qipao|east-asian/.test(styleText);
        const isKimono = /kimono/.test(styleText);
        const isPoncho = /poncho|serape|latin-american/.test(styleText);
        const isFolkCostume = /folk|apron|dirndl|lederhosen|folk-european/.test(styleText);
        const isEmbroideredRobe = /embroidered-national-robe|middle-eastern/.test(styleText);
        const isLinenDrape = /linen|toga|ancient-mediterranean/.test(styleText);
        const isHealth = /doctor|nurse|lab-coat|scrubs|laboratory|pharmacist|community-health/.test(styleText);
        const isCorporate = /business|suit|blazer|executive|banker|lawyer|corporate|formal-shirt-tie|media-presenter/.test(styleText);
        const isSports = /tracksuit|football|basketball|gym|athlete|sports|jersey/.test(styleText);
        const isMilitary = /military|fatigue|soldier/.test(styleText);
        const isSecurity = /security|police/.test(styleText);
        const isChef = /chef/.test(styleText);
        const isWorkwear = /engineer|artisan|farmer|workwear/.test(styleText);
        const isSchool = /school|student-uniform/.test(styleText);
        const isFormal = /business|lecturer|suit|blazer|executive|banker|lawyer|corporate|senator|agbada|wrapper|buba|dashiki|modest|sari|mandarin|cheongsam|kimono|robe|linen/.test(styleText);

        let blazer = DEFAULT_PALETTE.blazer;
        let blouse = DEFAULT_PALETTE.blouse;
        let skirt = DEFAULT_PALETTE.skirt;
        let accent = DEFAULT_PALETTE.accent;
        let tie = DEFAULT_PALETTE.tie;
        let shoe = DEFAULT_PALETTE.shoe;

        if (culturalStyle === 'yoruba') {
            blazer = '#1f5f46';
            blouse = '#fff5dc';
            skirt = '#5b2a86';
            accent = '#d9a441';
        } else if (culturalStyle === 'igbo') {
            blazer = '#8f1d2c';
            blouse = '#fff4e8';
            skirt = '#1e293b';
            accent = '#d8b453';
        } else if (culturalStyle === 'hausa-fulani') {
            blazer = '#efe8d5';
            blouse = '#fffaf0';
            skirt = '#2f4054';
            accent = '#6f8fb3';
        } else if (culturalStyle === 'niger-delta') {
            blazer = '#143f5f';
            blouse = '#f7e6c5';
            skirt = '#5f273e';
            accent = '#d6a044';
        } else if (culturalStyle === 'east-african' || isMaasai) {
            blazer = '#b91c2b';
            blouse = '#fff2df';
            skirt = '#191919';
            accent = '#f2c94c';
        } else if (culturalStyle === 'south-african' || isDashiki) {
            blazer = '#91c844';
            blouse = '#fff7dc';
            skirt = '#d83f87';
            accent = '#f4d24a';
        } else if (culturalStyle === 'world-drape' || isSariDrape) {
            blazer = '#d8691d';
            blouse = '#fff2d9';
            skirt = '#8f1d67';
            accent = '#22a6b5';
        } else if (culturalStyle === 'east-asian' || isMandarin || isKimono) {
            blazer = isKimono ? '#7c4f8d' : '#ef4426';
            blouse = isKimono ? '#efe8ff' : '#fff2df';
            skirt = isKimono ? '#7189b6' : '#17171c';
            accent = isKimono ? '#f0cf6a' : '#111827';
        } else if (culturalStyle === 'folk-european' || isFolkCostume) {
            blazer = '#778b2f';
            blouse = '#fff5dc';
            skirt = '#2e2b35';
            accent = '#c11f2f';
        } else if (culturalStyle === 'latin-american' || isPoncho) {
            blazer = '#7aa13d';
            blouse = '#fff2d8';
            skirt = '#40333a';
            accent = '#f0c13f';
        } else if (culturalStyle === 'middle-eastern' || isEmbroideredRobe) {
            blazer = '#405f92';
            blouse = '#f8f1df';
            skirt = '#263247';
            accent = '#d8b45a';
        } else if (culturalStyle === 'ancient-mediterranean' || isLinenDrape) {
            blazer = '#f7efe0';
            blouse = '#ffffff';
            skirt = '#ece1cc';
            accent = '#3d5f8c';
        } else if (config.assetCharacterId === 'iro-buba-premium-front') {
            blazer = '#6f2d8f';
            blouse = '#fff2c7';
            skirt = '#143f5f';
            accent = '#f4b43c';
            shoe = '#5b2a86';
        } else if (config.assetCharacterId === 'female-doctor-front') {
            blazer = '#fdfefe';
            blouse = '#dff4ff';
            skirt = '#174966';
            accent = '#1f9ad0';
            shoe = '#f6f8fb';
        } else if (config.assetCharacterId === 'female-student-front') {
            blazer = '#2c6a73';
            blouse = '#fff4dc';
            skirt = '#2a3f66';
            accent = '#f28c38';
            shoe = '#1f2937';
        } else if (config.assetCharacterId === 'male-student-front') {
            blazer = '#314f72';
            blouse = '#f5efe0';
            skirt = '#1e293b';
            accent = '#f0a13a';
            shoe = '#172033';
        } else if (config.assetCharacterId === 'male-doctor-front') {
            blazer = '#f8fbff';
            blouse = '#f2f7ff';
            skirt = '#172947';
            accent = '#2f7fbf';
            shoe = '#f7f9fc';
        } else if (config.assetCharacterId === 'male-lecturer-front') {
            blazer = '#14213d';
            blouse = '#f8fafc';
            skirt = '#0d1325';
            accent = '#a46a2f';
        } else if (isAnkara) {
            blazer = '#9b2f61';
            blouse = '#f3b43f';
            skirt = '#213b7a';
            accent = '#ffdb63';
        } else if (isHealth) {
            blazer = '#f6f7fb';
            blouse = '#dbeefe';
            skirt = '#173b57';
            accent = '#2b8cc4';
            tie = '#1f3f66';
            shoe = '#f3f6fb';
        } else if (isChef) {
            blazer = '#ffffff';
            blouse = '#f8fafc';
            skirt = '#2f3542';
            accent = '#d1d5db';
            shoe = '#f8fafc';
        } else if (isMilitary) {
            blazer = '#556b2f';
            blouse = '#e9e3c7';
            skirt = '#37401f';
            accent = '#a3a36f';
            shoe = '#1f2414';
        } else if (isSecurity) {
            blazer = '#101820';
            blouse = '#e8eef5';
            skirt = '#111827';
            accent = '#f1c40f';
            shoe = '#050505';
        } else if (isSports) {
            blazer = '#0f766e';
            blouse = '#f8fafc';
            skirt = '#064e3b';
            accent = '#facc15';
            shoe = '#f8fafc';
        } else if (isWorkwear) {
            blazer = '#f97316';
            blouse = '#fff7ed';
            skirt = '#1f2937';
            accent = '#facc15';
            shoe = '#111827';
        } else if (isSchool) {
            blazer = '#1e3a8a';
            blouse = '#ffffff';
            skirt = '#172554';
            accent = '#f59e0b';
            shoe = '#111827';
        } else if (isCorporate) {
            blazer = '#111827';
            blouse = '#f8fafc';
            skirt = '#101827';
            accent = '#7a4f25';
            tie = '#3b251a';
        } else if (!isFormal) {
            blazer = '#2f5f57';
            blouse = '#f8e8c8';
            skirt = '#272f41';
            accent = '#e0a43b';
        }

        if (/sneaker/.test(footwear)) shoe = '#f7fafc';
        else if (/sandal/.test(footwear)) shoe = accent;
        else if (/clinical/.test(footwear)) shoe = '#eef5fb';
        else if (/loafer/.test(footwear)) shoe = '#3b2418';
        else if (/shorts/.test(bottomClothing)) skirt = mix(skirt, '#ffffff', 0.08);

        const headwearPalette = getHeadwearPalette(config, blazer);
        const palette = {
            ...DEFAULT_PALETTE,
            skin,
            skinShade: mix(skin, '#3a2018', 0.22),
            skinLight: mix(skin, '#f0c39f', 0.18),
            ...hairPalette,
            blazer,
            blazerShade: mix(blazer, '#05070c', 0.35),
            blazerLight: mix(blazer, '#ffffff', 0.20),
            blouse,
            skirt,
            accent,
            tie,
            shoe,
            ...headwearPalette
        };
        const paletteVariant = CLOTHING_PALETTE_VARIANTS[resolveClothingPalette(config)];
        if (!paletteVariant) return applyColorOverrides(palette, config);
        const nextPalette = {
            ...palette,
            ...paletteVariant
        };
        nextPalette.blazerShade = paletteVariant.blazerShade || mix(nextPalette.blazer, '#05070c', 0.35);
        nextPalette.blazerLight = paletteVariant.blazerLight || mix(nextPalette.blazer, '#ffffff', 0.20);
        nextPalette.headwear = paletteVariant.headwear || palette.headwear || nextPalette.blazer;
        nextPalette.headwearShade = paletteVariant.headwearShade || mix(nextPalette.headwear, '#05070c', 0.35);
        return applyColorOverrides(nextPalette, config);
    }

    function svgShell(partKey, width, height, body, palette = DEFAULT_PALETTE) {
        const outputWidth = Math.max(1, Math.round(width * SVG_OUTPUT_SCALE));
        const outputHeight = Math.max(1, Math.round(height * SVG_OUTPUT_SCALE));
        return [
            `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${outputWidth}" height="${outputHeight}" role="img" aria-label="${partKey}" data-svg-african-resolution-scale="${SVG_OUTPUT_SCALE}" shape-rendering="geometricPrecision" ${styleVars(palette)}>`,
            '<defs>',
            '<filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">',
            '<feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.18"/>',
            '</filter>',
            '<linearGradient id="skinGrad" x1="0" y1="0" x2="0" y2="1">',
            '<stop offset="0" stop-color="var(--skin-light)"/>',
            '<stop offset="1" stop-color="var(--skin)"/>',
            '</linearGradient>',
            '<linearGradient id="clothGrad" x1="0" y1="0" x2="1" y2="1">',
            '<stop offset="0" stop-color="var(--cloth)"/>',
            '<stop offset="1" stop-color="var(--cloth-shade)"/>',
            '</linearGradient>',
            '</defs>',
            body,
            '</svg>'
        ].join('');
    }

    function styleVars(p) {
        return `style="--skin:${p.skin};--skin-light:${p.skinLight};--skin-shade:${p.skinShade};--cloth:${p.blazer};--cloth-shade:${p.blazerShade};--cloth-light:${mix(p.blazer || DEFAULT_PALETTE.blazer, '#ffffff', 0.20)};--blouse:${p.blouse};--skirt:${p.skirt};--accent:${p.accent};--tie:${p.tie || DEFAULT_PALETTE.tie};--hair:${p.hair};--hair-light:${p.hairLight};--ink:${p.ink};--shoe:${p.shoe};--glass:${p.glass};--headwear:${p.headwear || p.blazer};--headwear-shade:${p.headwearShade || p.blazerShade}"`;
    }

    const CLOSE_CROP_HAIRS = new Set(['buzz-cut', 'low-cut', 'fade', 'temple-fade', 'waves']);
    const AFRO_HAIRS = new Set(['afro', 'afro-full', 'afro-short', 'tapered-afro', 'twist-out', 'wash-and-go']);
    const BRAID_HAIRS = new Set(['braids', 'box-braids', 'fulani-braids']);
    const CORNROW_HAIRS = new Set(['cornrows', 'flat-twist', 'ghana-weaving']);
    const LOC_TWIST_HAIRS = new Set(['locs', 'twists', 'sisterlocks', 'goddess-locs']);
    const SWEPT_MENS_HAIRS = new Set(['quiff', 'pompadour', 'faux-hawk', 'spiky-top', 'brush-up']);
    const PARTED_MENS_HAIRS = new Set(['side-part', 'comb-over', 'textured-crop', 'caesar', 'angular-fringe']);
    const BOB_HAIRS = new Set(['pixie-cut', 'bob', 'round-bob', 'side-part-bob']);
    const LONG_HAIRS = new Set(['shoulder-length', 'long-straight', 'long-waves', 'side-swept-long']);
    const PONYTAIL_HAIRS = new Set(['ponytail', 'low-ponytail', 'updo']);
    const SIDE_BRAID_HAIRS = new Set(['side-braid', 'single-braid']);
    const FULL_COVER_HEADWEAR = new Set([
        'gele', 'wrapped-gele', 'turban',
        'hijab', 'layered-hijab', 'khimar', 'niqab',
        'niger-delta-head-tie'
    ]);
    const MODEST_HEADWEAR = new Set(['hijab', 'layered-hijab', 'khimar', 'niqab']);
    const REGIONAL_HEADWEAR = new Set([
        'niger-delta-head-tie', 'niger-delta-bowler', 'bowler-hat',
        'niger-delta-coral-crown', 'edo-coral-cap',
        'igbo-red-cap', 'isi-agu-cap',
        'hausa-embroidered-cap', 'hausa-cap', 'fulani-hat',
        'yoruba-fila', 'fila', 'abeti-aja', 'kufi', 'crown-cap'
    ]);
    const REGIONAL_FITTED_CAPS = new Set([
        'niger-delta-coral-crown', 'edo-coral-cap', 'crown-cap',
        'igbo-red-cap', 'isi-agu-cap',
        'hausa-embroidered-cap', 'hausa-cap', 'kufi',
        'yoruba-fila', 'fila', 'abeti-aja'
    ]);
    const GENERAL_HATS = new Set([
        'academic-cap', 'fedora', 'wide-brim-hat', 'cloche-hat',
        'bucket-hat', 'baseball-cap', 'beanie', 'top-hat',
        'construction-helmet', 'chef-hat', 'pilot-cap',
        'security-cap', 'military-beret'
    ]);
    const FRONT_HEADWEAR_BROW_CLEARANCE_LIFT = Object.freeze({
        'gele': 6,
        'wrapped-gele': 6,
        'crown-cap': 6,
        'niger-delta-bowler': 7,
        'bowler-hat': 7,
        'niger-delta-coral-crown': 6,
        'edo-coral-cap': 6,
        'hausa-embroidered-cap': 6,
        'hausa-cap': 6,
        'fulani-hat': 8,
        'academic-cap': 6,
        'fedora': 6,
        'wide-brim-hat': 12,
        'cloche-hat': 8,
        'bucket-hat': 11,
        'baseball-cap': 3,
        'beanie': 8,
        'top-hat': 6,
        'construction-helmet': 9,
        'chef-hat': 8,
        'pilot-cap': 7,
        'security-cap': 6,
        'military-beret': 7
    });
    const HEADWEAR_SUPPRESSES_HAIRLINE = new Set([
        ...FULL_COVER_HEADWEAR,
        ...REGIONAL_HEADWEAR,
        ...GENERAL_HATS
    ]);

    function renderOutsideHairStrands(kind = 'locs', layer = 'back') {
        const isTwist = kind === 'twists' || kind === 'flat-twist';
        const isSisterlocks = kind === 'sisterlocks';
        const isGoddess = kind === 'goddess-locs';
        const width = isSisterlocks ? 3.2 : isTwist ? 4.2 : isGoddess ? 5.6 : 4.8;
        const opacity = layer === 'front' ? '.96' : '1';
        const role = layer === 'front'
            ? `hair-front-side-locks outside-neck outside-face no-face-crossing ${kind}`
            : `hair-side-locks outside-neck outside-face no-face-crossing ${kind}`;
        const detail = isGoddess
            ? '<circle cx="18" cy="102" r="2.1" fill="var(--accent)"/><circle cx="80" cy="102" r="2.1" fill="var(--accent)"/>'
            : '';
        return `<g data-svg-african-role="${role}" fill="none" stroke="var(--hair)" stroke-width="${width}" stroke-linecap="round" opacity="${opacity}">
            <path d="M13 55 C5 73 8 94 20 116"/>
            <path d="M85 55 C93 73 90 94 78 116"/>
            <path d="M21 58 C14 79 16 99 27 124" opacity=".82"/>
            <path d="M77 58 C84 79 82 99 71 124" opacity=".82"/>
        </g>${detail}`;
    }

    function renderBraidedPlaits(id, paths, options = {}) {
        const safeId = String(id || 'braided-plaits').replace(/[^a-zA-Z0-9_-]+/g, '-');
        const normalizedPaths = Array.isArray(paths) ? paths.filter(Boolean) : [];
        if (!normalizedPaths.length) return '';
        const width = Number.isFinite(Number(options.width)) ? Number(options.width) : 5.2;
        const detailWidth = Number.isFinite(Number(options.detailWidth)) ? Number(options.detailWidth) : Math.max(1.15, width * 0.28);
        const role = String(options.role || 'braid-plaits individual-braids segmented-braids').trim();
        const dash = String(options.dash || '2.4 2.8');
        const basePaths = normalizedPaths.map((d, index) => `<path id="${safeId}-${index + 1}" d="${d}"/>`).join('');
        const segmentPaths = normalizedPaths.map(d => `<path d="${d}"/>`).join('');
        return `<g id="${safeId}" data-svg-african-role="${role}" fill="none" stroke="var(--hair)" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${basePaths}</g>
    <g id="${safeId}-segments" data-svg-african-role="braid-segments plait-pattern visible-braid-texture" fill="none" stroke="var(--hair-light)" stroke-width="${detailWidth.toFixed(2)}" stroke-dasharray="${dash}" stroke-linecap="round" opacity=".72">${segmentPaths}</g>`;
    }

    function renderScalpCap(id, d, extra = '') {
        return `<path id="${id}" data-svg-african-role="hair-cap scalp-cover crown-cover" d="${d}" fill="var(--hair)"/>${extra}`;
    }

    function renderSwoopMensHair(hair) {
        const cap = renderScalpCap(`${hair}-cap`, 'M10 61 C7 35 24 13 50 11 C75 12 91 33 88 61 C74 49 62 44 50 44 C36 44 24 49 10 61 Z');
        const topPath = hair === 'pompadour'
            ? 'M18 40 C22 14 39 0 61 5 C76 9 87 24 88 45 C74 35 58 31 43 34 C33 36 24 39 18 40 Z'
            : hair === 'faux-hawk'
                ? 'M23 44 C27 20 40 5 50 3 C61 7 73 22 78 45 C66 37 57 33 50 33 C42 33 34 37 23 44 Z'
                : hair === 'spiky-top'
                    ? 'M15 44 L25 21 L33 38 L43 12 L52 37 L63 11 L71 38 L83 20 L88 45 C74 38 62 35 50 35 C37 35 25 38 15 44 Z'
                    : hair === 'brush-up'
                        ? 'M16 43 C21 20 37 8 52 6 C70 8 83 22 87 44 C74 36 62 33 50 33 C37 33 26 37 16 43 Z'
                        : 'M15 44 C24 23 42 12 63 16 C75 19 84 29 87 43 C70 35 52 33 34 39 C26 42 20 44 15 44 Z';
        const detail = hair === 'spiky-top'
            ? '<path data-svg-african-role="spike-texture crown-only no-face-crossing" d="M31 34 L38 20 M49 33 L53 17 M67 34 L73 20" fill="none" stroke="var(--hair-light)" stroke-width="1.25" opacity=".22" stroke-linecap="round"/>'
            : '<path data-svg-african-role="swept-texture crown-only no-face-crossing" d="M25 33 C38 23 55 20 74 28 M22 44 C40 35 60 35 82 43" fill="none" stroke="var(--hair-light)" stroke-width="1.35" opacity=".22" stroke-linecap="round"/>';
        return `<g id="hair-back" data-svg-african-role="hair hair-back swept-mens-hair ${hair}">${cap}<path id="${hair}-swept-top" data-svg-african-role="hair-cap scalp-cover crown-cover raised-front-volume" d="${topPath}" fill="var(--hair)"/>${detail}</g>`;
    }

    function renderPartedMensHair(hair) {
        const capPath = hair === 'caesar'
            ? 'M14 57 C12 38 27 18 49 16 C72 17 88 37 85 58 C72 49 61 46 49 46 C37 46 26 49 14 57 Z'
            : hair === 'textured-crop'
                ? 'M10 61 C7 34 23 13 49 11 C77 12 93 35 88 62 C74 49 62 44 49 44 C35 44 22 49 10 61 Z'
                : 'M9 61 C7 36 24 14 50 12 C76 13 92 36 88 62 C72 48 59 43 47 44 C34 45 22 50 9 61 Z';
        const fringe = hair === 'angular-fringe'
            ? '<path id="angular-fringe-sweep" data-svg-african-role="intentional-fringe brow-clear raised-hairline" d="M16 41 C32 30 54 29 82 38 C68 40 50 43 30 47 C22 48 17 46 16 41 Z" fill="var(--hair)"/>'
            : hair === 'comb-over'
                ? '<path id="comb-over-sweep" data-svg-african-role="comb-over directional-sweep brow-clear crown-only no-face-crossing" d="M18 42 C31 26 55 20 83 32 C70 39 50 43 27 46 C22 46 19 44 18 42 Z" fill="var(--hair)"/>'
                : hair === 'caesar'
                    ? '<path id="caesar-fringe" data-svg-african-role="caesar short-straight-fringe brow-clear" d="M18 40 C35 36 65 36 82 40 L79 45 C62 42 38 42 20 45 Z" fill="var(--hair)"/>'
                    : hair === 'textured-crop'
                        ? '<path id="textured-crop-fringe" data-svg-african-role="textured-crop choppy-fringe brow-clear" d="M15 41 L25 35 L33 40 L43 33 L52 39 L63 33 L72 40 L84 36 L86 43 C68 40 34 40 15 41 Z" fill="var(--hair)"/>'
                        : '';
        const partDetail = hair === 'side-part'
            ? '<path data-svg-african-role="side-part clean-part crown-only no-face-crossing" d="M34 23 C41 30 52 35 67 38" fill="none" stroke="var(--hair-light)" stroke-width="1.8" opacity=".32" stroke-linecap="round"/>'
            : hair === 'comb-over'
                ? '<path data-svg-african-role="comb-over sweep-texture crown-only no-face-crossing" d="M24 36 C39 27 58 26 77 32 M29 42 C47 34 65 34 82 39" fill="none" stroke="var(--hair-light)" stroke-width="1.35" opacity=".25" stroke-linecap="round"/>'
                : hair === 'caesar'
                    ? '<path data-svg-african-role="caesar horizontal-texture crown-only no-face-crossing" d="M23 31 C37 28 62 28 76 32 M22 37 C39 34 61 34 79 37" fill="none" stroke="var(--hair-light)" stroke-width="1.1" opacity=".2" stroke-linecap="round"/>'
                    : '<path data-svg-african-role="crop-texture crown-only no-face-crossing" d="M24 38 C34 33 46 31 58 33 M39 27 C50 24 62 26 74 32" fill="none" stroke="var(--hair-light)" stroke-width="1.2" opacity=".2" stroke-linecap="round"/>';
        return `<g id="hair-back" data-svg-african-role="hair hair-back parted-mens-hair ${hair}">${renderScalpCap(`${hair}-cap`, capPath)}${fringe}${partDetail}</g>`;
    }

    function renderBobBackHair(hair) {
        const isPixie = hair === 'pixie-cut';
        const cap = isPixie
            ? 'M12 61 C8 37 25 15 50 12 C76 14 91 36 87 62 C73 50 62 45 50 45 C37 45 24 50 12 61 Z'
            : hair === 'round-bob'
                ? 'M3 65 C-1 36 15 12 43 6 C74 0 97 22 97 57 C98 84 89 108 75 121 C64 105 60 82 50 62 C39 83 31 106 17 121 C5 106 0 84 3 65 Z'
                : 'M6 66 C1 39 16 15 43 8 C71 2 93 22 94 55 C93 77 86 99 75 110 C66 93 61 76 50 59 C39 78 29 96 18 110 C8 95 3 79 6 66 Z';
        const lobes = isPixie
            ? '<path data-svg-african-role="pixie-side-taper outside-face no-face-crossing" d="M17 59 C14 69 15 80 22 88 M83 59 C86 69 85 80 78 88" fill="none" stroke="var(--hair)" stroke-width="5" stroke-linecap="round"/>'
            : hair === 'round-bob'
                ? '<path data-svg-african-role="round-bob-side-volume outside-neck outside-face no-face-crossing" d="M10 56 C3 79 7 108 25 126 M88 56 C96 79 92 108 73 126" fill="none" stroke="var(--hair)" stroke-width="11" stroke-linecap="round"/>'
                : '<path data-svg-african-role="bob-side-volume outside-neck outside-face no-face-crossing" d="M12 58 C7 78 11 102 25 121 M86 58 C92 78 88 102 73 121" fill="none" stroke="var(--hair)" stroke-width="8" stroke-linecap="round"/>';
        const detail = hair === 'side-part-bob'
            ? '<path data-svg-african-role="bob-side-part crown-only no-face-crossing" d="M34 23 C45 31 59 35 77 38" fill="none" stroke="var(--hair-light)" stroke-width="1.5" opacity=".24" stroke-linecap="round"/>'
            : '<path data-svg-african-role="bob-shine crown-only no-face-crossing" d="M24 44 C35 32 49 27 67 31" fill="none" stroke="var(--hair-light)" stroke-width="1.4" opacity=".18" stroke-linecap="round"/>';
        return `<g id="hair-back" data-svg-african-role="hair hair-back bob-family ${hair}"><path id="${hair}-back-mass" data-svg-african-role="hair-cap scalp-cover crown-cover" d="${cap}" fill="var(--hair)"/>${lobes}${detail}</g>`;
    }

    function renderLongBackHair(hair) {
        const waveDetail = hair === 'long-waves'
            ? '<path data-svg-african-role="wave-long-detail outside-neck outside-face no-face-crossing" d="M15 65 C28 86 21 105 31 126 M85 65 C72 86 79 105 68 126" fill="none" stroke="var(--hair-light)" stroke-width="1.8" opacity=".2" stroke-linecap="round"/>'
            : '';
        const sweep = hair === 'side-swept-long'
            ? '<path id="side-swept-front-mass" data-svg-african-role="side-swept-volume brow-clear raised-hairline" d="M13 42 C27 24 50 16 79 28 C68 39 48 46 23 49 C17 49 14 47 13 42 Z" fill="var(--hair)"/>'
            : '';
        const curtain = hair === 'shoulder-length'
            ? 'M6 67 C1 38 16 14 45 7 C73 3 94 22 95 57 C96 81 88 104 75 119 C66 106 59 82 50 61 C41 83 33 106 21 119 C9 105 2 85 6 67 Z'
            : hair === 'long-straight'
                ? 'M5 68 C0 38 16 14 45 7 C73 3 94 22 96 57 L91 147 C79 153 70 151 64 143 L50 61 L36 143 C29 151 19 152 8 146 Z'
                : 'M5 68 C0 38 16 14 45 7 C73 3 94 22 96 57 C98 91 88 127 73 145 C64 127 58 88 50 61 C42 88 35 127 23 145 C9 127 1 95 5 68 Z';
        return `<g id="hair-back" data-svg-african-role="hair hair-back long-hair ${hair}"><path id="${hair}-curtain" data-svg-african-role="hair-cap scalp-cover crown-cover long-curtain outside-neck" d="${curtain}" fill="var(--hair)"/>${sweep}${waveDetail}<path d="M20 56 C31 40 45 33 63 34 M76 55 C69 43 60 37 49 35" fill="none" stroke="var(--hair-light)" stroke-width="1.35" opacity=".16" stroke-linecap="round"/></g>`;
    }

    function renderPonytailBackHair(hair) {
        const tail = hair === 'updo'
            ? '<circle id="updo-bun" data-svg-african-role="updo-bun crown-cover" cx="50" cy="12" r="16" fill="var(--hair)"/><path d="M38 13 C45 7 58 7 65 14" fill="none" stroke="var(--hair-light)" stroke-width="1.4" opacity=".18" stroke-linecap="round"/>'
            : hair === 'low-ponytail'
                ? '<path id="low-ponytail-tail" data-svg-african-role="ponytail outside-neck no-face-crossing" d="M50 64 C48 86 50 112 57 141" fill="none" stroke="var(--hair)" stroke-width="14" stroke-linecap="round"/>'
                : '<path id="ponytail-tail" data-svg-african-role="ponytail outside-neck no-face-crossing" d="M76 45 C101 63 100 97 79 123" fill="none" stroke="var(--hair)" stroke-width="13" stroke-linecap="round"/>';
        return `<g id="hair-back" data-svg-african-role="hair hair-back ponytail-family ${hair}">${renderScalpCap(`${hair}-cap`, 'M10 60 C7 35 24 13 50 11 C76 13 92 35 88 61 C75 50 62 45 50 45 C37 45 24 50 10 60 Z')}${tail}</g>`;
    }

    function renderSideBraidBackHair(hair) {
        const braidPath = hair === 'single-braid'
            ? 'M50 56 C49 78 50 103 51 134'
            : 'M81 56 C96 75 93 102 75 132';
        return `<g id="hair-back" data-svg-african-role="hair hair-back side-braid-family ${hair}">${renderScalpCap(`${hair}-cap`, 'M8 62 C5 36 23 12 50 10 C78 12 93 36 89 63 C74 50 62 45 50 45 C36 45 23 50 8 62 Z')}<path id="${hair}-braid" data-svg-african-role="side-braid outside-neck outside-face no-face-crossing" d="${braidPath}" fill="none" stroke="var(--hair)" stroke-width="8" stroke-linecap="round"/><path d="${braidPath}" fill="none" stroke="var(--hair-light)" stroke-width="1.5" opacity=".2" stroke-dasharray="4 5" stroke-linecap="round"/></g>`;
    }

    function wrapHeadwearFit(markup, adjustments = {}, headwear = 'headwear') {
        if (!markup) return '';
        const headwearKey = String(headwear || 'headwear').replace(/-front$/, '');
        const browClearanceLift = Number(FRONT_HEADWEAR_BROW_CLEARANCE_LIFT[headwearKey]) || 0;
        const widthScale = 1 + getAdjustmentValue(adjustments, 'headwearWidth') * 0.80;
        const heightScale = 1 + getAdjustmentValue(adjustments, 'headwearHeight') * 0.65;
        const yShift = -getAdjustmentValue(adjustments, 'headwearLift') * 24 - browClearanceLift;
        const tilt = getAdjustmentValue(adjustments, 'headwearTilt') * 18;
        if (
            Math.abs(widthScale - 1) < 0.001 &&
            Math.abs(heightScale - 1) < 0.001 &&
            Math.abs(yShift) < 0.001 &&
            Math.abs(tilt) < 0.001 &&
            Math.abs(browClearanceLift) < 0.001
        ) {
            return markup;
        }
        const safeId = String(headwear || 'headwear').replace(/[^a-zA-Z0-9_-]+/g, '-');
        return `<g id="${safeId}-headwear-fit" data-svg-african-role="headwear-fit adjustable-headwear ${safeId} brow-clearance-profile" data-svg-african-brow-clearance-lift="${browClearanceLift}" transform="translate(0 ${yShift.toFixed(2)}) translate(50 55) rotate(${tilt.toFixed(2)}) scale(${widthScale.toFixed(3)} ${heightScale.toFixed(3)}) translate(-50 -55)">${markup}</g>`;
    }

    function renderStructuredCapScalpUnderlay(headwear, id = headwear, extraRoles = '') {
        const safeId = String(id || headwear || 'headwear').replace(/[^a-zA-Z0-9_-]+/g, '-');
        const roles = `headwear cap-underlay structured-cap ${headwear || ''} ${extraRoles || ''} scalp-cover crown-cover brow-clear on-scalp continuous-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-gap no-scalp-opening no-translucent-center`
            .replace(/\s+/g, ' ')
            .trim();
        return `<path id="${safeId}-scalp-underlay" data-svg-african-role="${roles}" d="M9 55 C8 28 26 9 50 8 C75 9 92 28 91 55 C77 64 23 64 9 55 Z" fill="var(--headwear)" opacity=".99"/>`;
    }

    function renderHairBeneathHeadwear(id = 'headwear') {
        const safeId = String(id || 'headwear').replace(/[^a-zA-Z0-9_-]+/g, '-');
        return `<path id="${safeId}-scalp-hair-underlay" data-svg-african-role="hair hair-back hair-cap hair-under-headwear full-scalp-hair-underlay continuous-scalp-hair fitted-to-scalp overlaps-headwear-edge visible-below-headgear no-bald-gap" d="M7 68 C4 37 22 10 49 8 C78 9 95 37 91 69 C80 77 19 77 7 68 Z" fill="var(--hair)" opacity="1"/>`;
    }

    function renderModestHeadwear(headwear, adjustments = {}) {
        const isLayered = headwear === 'layered-hijab' || headwear === 'khimar' || headwear === 'niqab';
        const isKhimar = headwear === 'khimar' || headwear === 'niqab';
        const drapePath = isKhimar
            ? 'M3 66 C1 34 20 7 50 5 C80 7 98 34 97 67 C97 100 88 130 78 146 L22 146 C12 130 3 100 3 66 Z'
            : 'M4 64 C2 33 21 8 50 6 C79 8 97 33 96 64 C96 96 88 126 77 146 L23 146 C12 126 4 96 4 64 Z';
        const faceFrame = isKhimar
            ? 'M23 57 C25 50 36 48 50 48 C64 48 75 50 77 57 C78 75 69 96 56 103 C52 105 47 105 43 103 C30 96 22 75 23 57 Z'
            : 'M21 57 C23 50 35 47 50 47 C65 47 77 50 79 57 C80 76 70 97 56 104 C52 106 47 106 43 104 C30 97 20 76 21 57 Z';
        const layer = isLayered
            ? '<path id="hijab-layer-fold" data-svg-african-role="headwear-fold layered-hijab cloth-layer brow-clear" d="M14 50 C31 36 67 34 86 49 M19 72 C35 63 64 63 80 72" fill="none" stroke="var(--accent)" stroke-width="3.2" opacity=".7" stroke-linecap="round"/>'
            : '<path id="hijab-soft-fold" data-svg-african-role="headwear-fold hijab cloth-layer brow-clear" d="M13 51 C30 37 69 37 87 51" fill="none" stroke="var(--headwear-shade)" stroke-width="2.8" opacity=".55" stroke-linecap="round"/>';
        const veil = headwear === 'niqab'
            ? '<path id="niqab-lower-veil" data-svg-african-role="headwear niqab lower-face-veil full-neck-cover lower-nose-cover mouth-cover modest-face-cover" d="M17 58 C34 52 66 52 84 58 L84 146 L16 146 Z" fill="var(--headwear)" opacity=".98"/><path id="niqab-eye-window" data-svg-african-role="niqab-eye-window brow-clear eyes-visible upper-nose-visible" d="M20 56 C35 49 65 49 80 56 L80 72 C65 76 35 76 20 72 Z" fill="none" stroke="var(--accent)" stroke-width="2.2" opacity=".72" stroke-linejoin="round" stroke-linecap="round"/>'
            : '';
        return wrapHeadwearFit(`<g id="hair-back" data-svg-african-role="hair headwear modest-headwear ${headwear} hijab scalp-cover neck-cover">
        <path id="${headwear}-outer-drape" data-svg-african-role="headwear-drape ${headwear} full-scalp-cover continuous-scalp-cover shoulder-drape neck-cover ear-cover forehead-cover" d="${drapePath}" fill="var(--headwear)"/>
        <path id="${headwear}-shade-left" data-svg-african-role="headwear-shadow side-drape modest-ear-cover" d="M7 62 C16 86 24 111 30 136 C18 121 10 93 7 62 Z" fill="var(--headwear-shade)" opacity=".34"/>
        <path id="${headwear}-shade-right" data-svg-african-role="headwear-shadow side-drape modest-ear-cover" d="M93 62 C84 86 76 111 70 136 C82 121 90 93 93 62 Z" fill="var(--headwear-shade)" opacity=".28"/>
        <path id="${headwear}-face-opening" data-svg-african-role="face-opening ${headwear} brow-clear nose-clear eye-clear cheek-clear mouth-clear neck-covered" d="${faceFrame}" fill="none" stroke="var(--accent)" stroke-width="2.4" opacity=".72" stroke-linecap="round" stroke-linejoin="round"/>
        ${layer}
        ${veil}
    </g>`, adjustments, headwear);
    }

    function renderModestHeadwearFrontOverlay(config, adjustments = {}) {
        const headwear = normalizeId(config.styling?.headwear || config.headwear, 'none');
        if (!MODEST_HEADWEAR.has(headwear)) return '';
        const isKhimar = headwear === 'khimar' || headwear === 'niqab';
        const outer = isKhimar
            ? 'M2 64 C1 31 20 5 50 4 C81 5 99 31 98 65 C99 99 90 131 82 146 L18 146 C10 131 1 99 2 64 Z'
            : 'M3 63 C2 32 21 7 50 5 C80 7 98 32 97 63 C98 96 90 128 80 146 L20 146 C10 128 2 96 3 63 Z';
        const hijabFaceOpening = isKhimar
            ? 'M23 57 C25 50 36 48 50 48 C64 48 75 50 77 57 C78 75 69 96 56 103 C52 105 47 105 43 103 C30 96 22 75 23 57 Z'
            : 'M21 57 C23 50 35 47 50 47 C65 47 77 50 79 57 C80 76 70 97 56 104 C52 106 47 106 43 104 C30 97 20 76 21 57 Z';
        const niqabEyeOpening = 'M19 55 C34 48 66 48 81 55 L81 72 C66 76 34 76 19 72 Z M45 70 C48 68 52 68 55 70 C54 74 52 77 50 79 C48 77 46 74 45 70 Z';
        const hijabCover = headwear === 'niqab'
            ? ''
            : `<path id="${headwear}-front-cover" data-svg-african-role="headwear-front ${headwear} front-overlay full-scalp-cover forehead-cover side-face-cover ear-cover neck-cover nose-clear eye-clear brow-clear cheek-clear mouth-clear" fill="var(--headwear)" fill-rule="evenodd" d="${outer} ${hijabFaceOpening}"/>
        <path id="${headwear}-front-side-shade" data-svg-african-role="headwear-front-shadow side-face-cover ear-cover" d="M8 65 C17 84 24 108 30 133 M92 65 C83 84 76 108 70 133" fill="none" stroke="var(--headwear-shade)" stroke-width="7" opacity=".26" stroke-linecap="round"/>`;
        const niqabCover = headwear === 'niqab'
            ? `<path id="niqab-front-cover" data-svg-african-role="headwear-front niqab front-overlay full-head-cover full-neck-cover side-face-cover ear-cover forehead-cover lower-face-cover lower-nose-cover mouth-cover eyes-visible upper-nose-visible" fill="var(--headwear)" fill-rule="evenodd" d="${outer} ${niqabEyeOpening}"/>
        <path id="niqab-visible-eye-band" data-svg-african-role="niqab-eye-window front-overlay eyes-visible upper-nose-visible lower-face-covered" d="M20 56 C35 49 65 49 80 56 M20 72 C35 76 65 76 80 72 M47 68 C49 71 50 75 50 79" fill="none" stroke="var(--accent)" stroke-width="2.2" opacity=".82" stroke-linejoin="round" stroke-linecap="round"/>
        <path id="niqab-veil-fold" data-svg-african-role="niqab veil-fold front-overlay lower-face-cover" d="M31 84 C41 91 60 91 71 84 M29 113 C42 119 60 119 73 113" fill="none" stroke="var(--headwear-shade)" stroke-width="1.8" opacity=".35" stroke-linecap="round"/>`
            : '';
        const trimStroke = headwear === 'layered-hijab' ? 'var(--accent)' : 'var(--headwear-shade)';
        const layeredTrim = headwear === 'layered-hijab' || headwear === 'khimar'
            ? '<path id="modest-front-layer-trim" data-svg-african-role="headwear-front layered-fold brow-clear front-overlay" d="M20 66 C35 57 65 57 80 66" fill="none" stroke="var(--accent)" stroke-width="2.2" opacity=".58" stroke-linecap="round"/>'
            : '';
        return wrapHeadwearFit(`<g id="${headwear}-front-overlay" data-svg-african-role="headwear-front modest-headwear ${headwear} front-overlay continuous-scalp-cover brow-clear">
        ${hijabCover}
        ${niqabCover}
        <path id="${headwear}-front-face-frame" data-svg-african-role="face-opening ${headwear} front-overlay brow-clear ${headwear === 'niqab' ? 'eyes-visible upper-nose-visible lower-face-covered' : 'nose-clear eye-clear cheek-clear mouth-clear neck-covered'}" d="${headwear === 'niqab' ? 'M20 56 C35 49 65 49 80 56 M20 72 C35 76 65 76 80 72' : hijabFaceOpening}" fill="none" stroke="${trimStroke}" stroke-width="2.6" opacity=".82" stroke-linecap="round" stroke-linejoin="round"/>
        ${layeredTrim}
    </g>`, adjustments, `${headwear}-front`);
    }

    function renderRegionalHeadwear(headwear, hair, adjustments = {}) {
        if (headwear === 'niger-delta-head-tie') {
            const baseHair = hair === 'bald' ? '' : renderHairBeneathHeadwear('niger-delta-head-tie-regional');
            return wrapHeadwearFit(`<g id="hair-back" data-svg-african-role="hair headwear regional-headwear niger-delta-head-tie scalp-cover crown-cover">
        ${baseHair}
        <path id="niger-delta-head-tie-fan" data-svg-african-role="headwear niger-delta-head-tie fan-wrap coral-ready brow-clear" d="M2 60 C6 24 31 4 62 8 C91 11 106 33 95 68 C74 47 30 45 2 60 Z" fill="var(--headwear)"/>
        <path id="niger-delta-head-tie-fold" data-svg-african-role="headwear-fold niger-delta-head-tie pleat" d="M9 51 C32 30 72 20 98 39 M16 39 C40 55 68 55 90 38 M34 16 C50 28 75 28 88 18" fill="none" stroke="var(--accent)" stroke-width="4" opacity=".78" stroke-linecap="round"/>
        <path id="niger-delta-head-tie-tail" data-svg-african-role="headwear-tail side-wrap" d="M11 59 C16 79 26 92 42 98 C26 101 11 88 5 68 Z" fill="var(--headwear-shade)" opacity=".36"/>
    </g>`, adjustments, headwear);
        }
        const baseHair = hair === 'bald' ? '' : renderHairBeneathHeadwear(`${headwear}-regional`);
        let cap = '';
        if (headwear === 'niger-delta-bowler' || headwear === 'bowler-hat') {
            cap = `<g id="${headwear}-bowler" data-svg-african-role="headwear ${headwear} niger-delta-bowler bowler-hat formal-hat">
        <path id="${headwear}-bowler-shadow" data-svg-african-role="headwear ${headwear} bowler-shadow brow-clear" d="M5 50 C22 39 74 39 91 50 C76 61 20 61 5 50 Z" fill="var(--headwear-shade)" opacity=".95"/>
        <path id="${headwear}-bowler-brim" data-svg-african-role="headwear ${headwear} bowler-brim brim brow-clear" d="M3 48 C21 36 76 36 93 48 C77 57 19 57 3 48 Z" fill="var(--headwear)"/>
        <path id="${headwear}-bowler-crown" data-svg-african-role="headwear ${headwear} bowler-crown crown scalp-cover brow-clear" d="M17 48 C17 20 31 5 49 5 C68 5 83 21 83 48 C66 42 34 42 17 48 Z" fill="var(--headwear)"/>
        <path id="${headwear}-bowler-highlight" d="M27 18 C40 11 60 12 74 20" fill="none" stroke="#ffffff" stroke-width="2.1" opacity=".14" stroke-linecap="round"/>
        <path id="${headwear}-bowler-band" data-svg-african-role="headwear ${headwear} bowler-band" d="M19 38 C36 43 64 43 82 38" fill="none" stroke="#242424" stroke-width="4.2" opacity=".9" stroke-linecap="round"/>
    </g>`;
        } else if (headwear === 'niger-delta-coral-crown' || headwear === 'edo-coral-cap' || headwear === 'crown-cap') {
            const crownRole = headwear === 'crown-cap'
                ? 'headwear crown-cap beadwork crown scalp-cover brow-clear'
                : `headwear ${headwear} coral-bead-cap crown scalp-cover brow-clear`;
            cap = `<path id="${headwear}-cap-dome" data-svg-african-role="${crownRole} continuous-scalp-cover" d="M12 58 C10 35 25 16 50 13 C76 15 91 35 89 58 C75 51 63 48 50 48 C37 48 25 51 12 58 Z" fill="var(--headwear)"/>
        <path id="${headwear}-front-band" data-svg-african-role="${crownRole} front-band" d="M15 48 C31 41 69 41 86 48 L84 60 C66 54 35 54 17 60 Z" fill="var(--headwear-shade)" opacity=".96"/>
        <g id="${headwear}-beads" data-svg-african-role="${crownRole} coral-beadwork">
            <path data-svg-african-role="coral-bead-row ${headwear}" d="M17 50 C34 44 67 44 84 50" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round"/>
            <path data-svg-african-role="coral-bead-row ${headwear}" d="M22 39 C37 32 64 32 79 39" fill="none" stroke="var(--accent)" stroke-width="2.3" stroke-linecap="round" opacity=".9"/>
            <circle cx="25" cy="43" r="2.1" fill="var(--accent)"/><circle cx="38" cy="38" r="2.1" fill="var(--accent)"/><circle cx="51" cy="36" r="2.1" fill="var(--accent)"/><circle cx="64" cy="38" r="2.1" fill="var(--accent)"/><circle cx="77" cy="43" r="2.1" fill="var(--accent)"/>
            <circle cx="31" cy="53" r="1.7" fill="var(--accent)"/><circle cx="45" cy="51" r="1.7" fill="var(--accent)"/><circle cx="58" cy="51" r="1.7" fill="var(--accent)"/><circle cx="72" cy="53" r="1.7" fill="var(--accent)"/>
        </g>`;
        } else if (headwear === 'igbo-red-cap' || headwear === 'isi-agu-cap') {
            const role = headwear === 'igbo-red-cap'
                ? 'headwear igbo-red-cap igbo-cap red-cap crown scalp-cover brow-clear'
                : 'headwear isi-agu-cap igbo-cap crown scalp-cover brow-clear';
            cap = `<path id="${headwear}" data-svg-african-role="${role}" d="M12 45 L15 31 C21 20 36 14 53 15 C71 15 85 25 88 39 L88 47 C74 51 29 51 12 45 Z" fill="var(--headwear)"/>
        <path id="${headwear}-flat-top" data-svg-african-role="${headwear} flat-top" d="M21 30 C34 19 66 18 81 31 C64 27 39 27 21 30 Z" fill="var(--headwear-shade)" opacity=".32"/>
        <path id="${headwear}-base-band" data-svg-african-role="${headwear} front-band brow-clear" d="M15 41 C32 48 68 48 86 41" fill="none" stroke="var(--accent)" stroke-width="2.7" opacity=".82" stroke-linecap="round"/>
        <path id="${headwear}-side-stitch" data-svg-african-role="${headwear} side-stitch" d="M22 30 C20 36 20 42 23 48 M78 31 C81 37 80 43 77 48" fill="none" stroke="var(--headwear-shade)" stroke-width="1.4" opacity=".55" stroke-linecap="round"/>
        <circle id="${headwear}-top-button" data-svg-african-role="${headwear} top-button" cx="51" cy="18" r="2.2" fill="var(--accent)" opacity=".9"/>`;
        } else if (headwear === 'kufi') {
            cap = `<path id="kufi-cap" data-svg-african-role="headwear kufi crown scalp-cover brow-clear" d="M16 43 C19 25 32 15 50 15 C68 15 82 25 85 43 C69 50 32 50 16 43 Z" fill="var(--headwear)"/>
        <path id="kufi-rim" data-svg-african-role="kufi embroidered-rim brow-clear" d="M19 41 C34 46 67 46 82 41" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".72" stroke-linecap="round"/>
        <path id="kufi-pattern" data-svg-african-role="kufi small-embroidery" d="M27 35 C38 39 62 39 74 35 M31 27 C42 30 59 30 70 27" fill="none" stroke="var(--accent)" stroke-width="1.45" opacity=".58" stroke-linecap="round"/>`;
        } else if (headwear === 'hausa-cap' || headwear === 'hausa-embroidered-cap') {
            const isEmbroidered = headwear === 'hausa-embroidered-cap';
            cap = `<path id="${headwear}-cap" data-svg-african-role="headwear ${headwear} hausa-embroidered-cap hausa-cap embroidered-cylinder crown scalp-cover brow-clear" d="M16 18 C27 9 71 9 82 18 L85 51 C70 59 30 59 15 51 Z" fill="var(--headwear)"/>
        <path id="${headwear}-top" data-svg-african-role="${headwear} flat-top embroidered-top northern-cap" d="M16 18 C29 8 69 8 82 18 C69 26 29 26 16 18 Z" fill="var(--headwear-shade)" opacity=".92"/>
        <path id="${headwear}-gold-rim" data-svg-african-role="${headwear} gold-rim brow-clear" d="M17 19 C30 27 68 27 81 19 M17 49 C34 56 67 56 83 49" fill="none" stroke="var(--accent)" stroke-width="2.35" opacity=".86" stroke-linecap="round"/>
        <path id="${headwear}-embroidery" data-svg-african-role="${headwear} embroidery vertical northern-cap" d="M25 24 L25 50 M34 25 L34 54 M44 26 L44 55 M54 26 L54 55 M64 25 L64 54 M74 24 L74 50" fill="none" stroke="var(--accent)" stroke-width="${isEmbroidered ? '1.75' : '1.15'}" opacity="${isEmbroidered ? '.82' : '.52'}" stroke-linecap="round"/>
        ${isEmbroidered ? `<path id="${headwear}-front-motif" data-svg-african-role="${headwear} embroidered-front-motif northern-cap" d="M39 31 C44 35 49 35 54 31 C58 36 58 44 49 49 C40 44 40 36 39 31 Z" fill="none" stroke="var(--accent)" stroke-width="1.45" opacity=".72"/>` : ''}`;
        } else if (headwear === 'fulani-hat') {
            cap = '<path id="fulani-hat-brim" data-svg-african-role="headwear fulani-hat brim crown brow-clear" d="M4 55 C23 42 78 42 97 55 C76 65 25 65 4 55 Z" fill="var(--headwear-shade)" opacity=".9"/><path id="fulani-hat-cone" data-svg-african-role="headwear fulani-hat conical-crown scalp-cover" d="M30 48 L51 9 L73 48 C60 43 43 43 30 48 Z" fill="var(--headwear)"/><path d="M39 34 C48 39 57 39 66 34" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".7" stroke-linecap="round"/>';
        } else if (headwear === 'yoruba-fila' || headwear === 'fila') {
            const role = headwear === 'fila'
                ? 'headwear fila crown scalp-cover brow-clear'
                : 'headwear yoruba-fila fila yoruba-cap crown scalp-cover brow-clear';
            cap = `<path id="${headwear}-cap" data-svg-african-role="${role}" d="M9 48 C14 27 31 15 55 17 C73 18 86 31 89 49 C70 45 31 43 9 48 Z" fill="var(--headwear)"/>
        <path id="${headwear}-fold" data-svg-african-role="${headwear} folded-fila yoruba-cap asymmetric-fold" d="M24 21 C43 8 70 12 89 33 C68 28 47 30 23 41 Z" fill="var(--headwear-shade)" opacity=".72"/>
        <path id="${headwear}-side-flap" data-svg-african-role="${headwear} fila-side-flap" d="M12 45 C20 50 31 50 41 45 C31 53 19 55 10 50 Z" fill="var(--headwear-shade)" opacity=".4"/>
        <path id="${headwear}-bead-line" data-svg-african-role="${headwear} beaded-band brow-clear" d="M16 40 C33 33 68 34 85 42" fill="none" stroke="var(--accent)" stroke-width="2.8" opacity=".84" stroke-linecap="round"/>
        <circle cx="34" cy="34" r="1.7" fill="var(--accent)" opacity=".9"/><circle cx="50" cy="32" r="1.7" fill="var(--accent)" opacity=".9"/><circle cx="66" cy="34" r="1.7" fill="var(--accent)" opacity=".9"/>`;
        } else if (headwear === 'abeti-aja') {
            cap = '<path id="abeti-aja-crown" data-svg-african-role="headwear abeti-aja yoruba-cap crown scalp-cover brow-clear" d="M15 45 C19 25 35 15 52 16 C70 17 84 29 87 47 C72 43 31 42 15 45 Z" fill="var(--headwear)"/><path id="abeti-aja-left-ear" data-svg-african-role="abeti-aja-ear side-flap" d="M16 43 C2 48 0 62 13 68 C15 59 17 51 22 44 Z" fill="var(--headwear-shade)"/><path id="abeti-aja-right-ear" data-svg-african-role="abeti-aja-ear side-flap" d="M85 44 C98 49 99 62 87 68 C85 59 83 51 78 44 Z" fill="var(--headwear-shade)"/>';
        }
        const scalpUnderlay = REGIONAL_FITTED_CAPS.has(headwear)
            ? renderStructuredCapScalpUnderlay(headwear, `${headwear}-regional`, 'regional-headwear fitted-cap')
            : '';
        return wrapHeadwearFit(`<g id="hair-back" data-svg-african-role="hair hair-back headwear-with-hair regional-headwear ${headwear}">${baseHair}${scalpUnderlay}${cap}</g>`, adjustments, headwear);
    }

    function renderRegionalHeadwearFrontOverlay(headwear, adjustments = {}) {
        if (!REGIONAL_HEADWEAR.has(headwear) || FULL_COVER_HEADWEAR.has(headwear)) return '';
        let overlay = '';
        if (headwear === 'niger-delta-bowler' || headwear === 'bowler-hat') {
            overlay = `<path id="${headwear}-front-crown" data-svg-african-role="headwear-front ${headwear} niger-delta-bowler bowler-hat crown scalp-cover brow-clear continuous-scalp-cover" d="M17 48 C17 21 31 7 49 7 C68 7 83 22 83 48 C66 43 34 43 17 48 Z" fill="var(--headwear)"/>
        <path id="${headwear}-front-brim" data-svg-african-role="headwear-front ${headwear} niger-delta-bowler bowler-hat brim brow-clear continuous-scalp-cover" d="M3 49 C22 37 74 37 93 49 C78 58 18 58 3 49 Z" fill="var(--headwear-shade)"/>
        <path id="${headwear}-front-brim-highlight" d="M12 48 C29 43 70 43 86 48" fill="none" stroke="#ffffff" stroke-width="1.15" opacity=".13" stroke-linecap="round"/>
        <path id="${headwear}-front-band" data-svg-african-role="headwear-front ${headwear} bowler-band brow-clear" d="M19 38 C36 43 64 43 82 38" fill="none" stroke="#1b171b" stroke-width="4.2" opacity=".96" stroke-linecap="round"/>
        <path id="${headwear}-front-accent-band" d="M77 39 C80 41 81 43 82 46" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".68" stroke-linecap="round"/>`;
        } else if (headwear === 'hausa-cap' || headwear === 'hausa-embroidered-cap' || headwear === 'kufi') {
            if (headwear === 'kufi') {
                overlay = `<path id="kufi-front-panel" data-svg-african-role="headwear-front kufi crown scalp-cover brow-clear continuous-scalp-cover" d="M16 31 C20 20 33 14 50 14 C68 14 81 20 85 31 L84 48 C68 55 32 55 16 48 Z" fill="var(--headwear)" opacity=".98"/>
        <path id="kufi-front-pattern" data-svg-african-role="kufi front-embroidery brow-clear" d="M21 40 C36 45 64 45 79 40 M31 28 L31 50 M42 25 L42 53 M53 25 L53 53 M64 25 L64 52 M75 28 L75 49" fill="none" stroke="var(--accent)" stroke-width="1.15" opacity=".6" stroke-linecap="round"/>`;
            } else {
                overlay = `<path id="${headwear}-front-panel" data-svg-african-role="headwear-front ${headwear} hausa-embroidered-cap hausa-cap embroidered-cylinder scalp-cover brow-clear continuous-scalp-cover" d="M16 18 C28 10 70 10 82 18 L85 51 C69 59 30 59 15 51 Z" fill="var(--headwear)" opacity=".99"/>
        <path id="${headwear}-front-top" data-svg-african-role="${headwear} flat-top northern-cap" d="M16 18 C29 8 69 8 82 18 C69 26 29 26 16 18 Z" fill="var(--headwear-shade)" opacity=".88"/>
        <path id="${headwear}-front-rim" data-svg-african-role="${headwear} front-rim northern-cap brow-clear" d="M17 49 C34 56 67 56 83 49" fill="none" stroke="var(--accent)" stroke-width="2.35" opacity=".88" stroke-linecap="round"/>
        <path id="${headwear}-front-embroidery" data-svg-african-role="${headwear} front-embroidery northern-cap brow-clear" d="M22 22 C36 29 64 29 78 22 M28 23 L28 53 M38 24 L38 55 M49 24 L49 56 M60 24 L60 55 M72 23 L72 53" fill="none" stroke="var(--accent)" stroke-width="1.45" opacity=".84" stroke-linecap="round"/>`;
            }
        } else if (headwear === 'igbo-red-cap' || headwear === 'isi-agu-cap') {
            overlay = `<path id="${headwear}-front-cap" data-svg-african-role="headwear-front ${headwear} igbo-cap red-cap crown scalp-cover brow-clear continuous-scalp-cover" d="M12 45 L15 31 C21 20 36 14 53 15 C71 15 85 25 88 39 L88 48 C74 54 29 54 12 48 Z" fill="var(--headwear)" opacity=".98"/>
        <path id="${headwear}-front-flat-top" data-svg-african-role="${headwear} flat-top" d="M21 30 C34 19 66 18 81 31 C64 27 39 27 21 30 Z" fill="var(--headwear-shade)" opacity=".28"/>
        <path id="${headwear}-front-band" data-svg-african-role="headwear-front ${headwear} igbo-cap red-cap accent-band brow-clear" d="M16 41 C32 48 68 48 85 41" fill="none" stroke="var(--accent)" stroke-width="2.7" opacity=".9" stroke-linecap="round"/>
        <circle id="${headwear}-front-button" cx="51" cy="18" r="2.1" fill="var(--accent)" opacity=".88"/>`;
        } else if (headwear === 'yoruba-fila' || headwear === 'fila') {
            overlay = `<path id="${headwear}-front-cap" data-svg-african-role="headwear-front ${headwear} fila yoruba-cap crown scalp-cover brow-clear continuous-scalp-cover" d="M9 49 C14 28 31 16 55 17 C73 18 86 31 89 50 C70 46 31 44 9 49 Z" fill="var(--headwear)" opacity=".98"/>
        <path id="${headwear}-front-fold" data-svg-african-role="headwear-front ${headwear} fila yoruba-cap folded-fila brow-clear" d="M23 36 C43 25 69 28 87 42 C68 37 48 37 22 45 Z" fill="var(--headwear-shade)" opacity=".74"/>
        <path id="${headwear}-front-band" data-svg-african-role="${headwear === 'fila' ? 'headwear fila crown scalp-cover brow-clear' : 'headwear-front yoruba-fila fila yoruba-cap beaded-band brow-clear'}" d="M16 40 C34 33 68 34 85 42" fill="none" stroke="var(--accent)" stroke-width="2.8" opacity=".88" stroke-linecap="round"/>
        <circle cx="34" cy="36" r="1.45" fill="var(--accent)" opacity=".86"/><circle cx="50" cy="34" r="1.45" fill="var(--accent)" opacity=".86"/><circle cx="66" cy="36" r="1.45" fill="var(--accent)" opacity=".86"/>`;
        } else if (headwear === 'abeti-aja') {
            overlay = '<path id="abeti-aja-front-band" data-svg-african-role="headwear-front abeti-aja yoruba-cap brow-clear" d="M17 42 C34 35 67 35 84 42" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity=".78" stroke-linecap="round"/>';
        } else if (headwear === 'niger-delta-coral-crown' || headwear === 'edo-coral-cap' || headwear === 'crown-cap') {
            overlay = `<path id="${headwear}-front-band-overlay" data-svg-african-role="headwear-front ${headwear} coral-band brow-clear continuous-scalp-cover" d="M15 48 C32 41 69 41 86 48 L84 59 C66 54 35 54 17 59 Z" fill="var(--headwear-shade)" opacity=".94"/>
        <path id="${headwear}-front-beads-upper" data-svg-african-role="headwear-front ${headwear} coral-bead-row brow-clear" d="M20 41 C36 34 66 34 82 41" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-linecap="round"/>
        <path id="${headwear}-front-beads-lower" data-svg-african-role="headwear-front ${headwear} coral-bead-row brow-clear" d="M18 51 C34 45 67 45 84 51" fill="none" stroke="var(--accent)" stroke-width="3.1" stroke-linecap="round"/>
        <circle cx="29" cy="45" r="1.8" fill="var(--accent)"/><circle cx="43" cy="42" r="1.8" fill="var(--accent)"/><circle cx="57" cy="42" r="1.8" fill="var(--accent)"/><circle cx="71" cy="45" r="1.8" fill="var(--accent)"/>`;
        }
        return overlay
            ? wrapHeadwearFit(`<g id="${headwear}-front-headwear" data-svg-african-role="headwear-front regional-headwear ${headwear} brow-clear">${overlay}</g>`, adjustments, `${headwear}-front`)
            : '';
    }

    function renderGeneralHat(headwear, hair, adjustments = {}) {
        const baseHair = hair === 'bald' ? '' : renderHairBeneathHeadwear(`${headwear}-general`);
        let hat = '';
        if (headwear === 'academic-cap') {
            hat = '<path id="academic-scalp-cap" data-svg-african-role="headwear academic-cap mortarboard skullcap scalp-cover continuous-scalp-cover brow-clear" d="M12 58 C11 35 26 18 50 16 C75 18 90 35 88 58 C73 50 62 47 50 47 C38 47 27 50 12 58 Z" fill="var(--headwear-shade)"/><path id="academic-cap-board-shadow" data-svg-african-role="headwear academic-cap mortarboard board shadow" d="M10 33 L51 13 L92 33 L51 52 Z" fill="rgba(0,0,0,.28)"/><path id="academic-cap-board" data-svg-african-role="headwear academic-cap mortarboard board square-cap" d="M8 29 L51 8 L95 30 L51 51 Z" fill="var(--headwear)"/><path id="academic-cap-top-plane" data-svg-african-role="headwear academic-cap mortarboard top-plane" d="M21 30 L51 16 L82 31 L51 45 Z" fill="rgba(255,255,255,.08)"/><path id="academic-cap-band" data-svg-african-role="headwear academic-cap band scalp-cover brow-clear" d="M20 47 C35 40 66 40 82 47 L80 59 C64 53 36 53 21 59 Z" fill="var(--headwear-shade)"/><path id="academic-cap-band-highlight" data-svg-african-role="headwear academic-cap band highlight" d="M25 49 C40 45 62 45 76 49" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="2" stroke-linecap="round"/><path id="academic-cap-tassel-cord" data-svg-african-role="headwear academic-cap tassel side-face-drop above-ear" d="M51 12 C62 18 76 24 82 36 C85 45 84 55 80 64" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/><path id="academic-cap-tassel-tail" data-svg-african-role="headwear academic-cap tassel tail side-face-drop above-ear" d="M80 62 C84 66 86 71 86 76 M80 62 C79 68 78 73 78 78 M80 62 C82 68 81 74 82 79" fill="none" stroke="var(--accent)" stroke-width="1.7" stroke-linecap="round"/><circle cx="51" cy="12" r="3" fill="var(--accent)"/><circle id="academic-cap-side-knot" cx="80" cy="62" r="2" fill="var(--accent)"/>';
        } else if (headwear === 'fedora') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'fedora', 'fedora on-head')}<path id="fedora-brim" data-svg-african-role="headwear fedora brim brow-clear on-head" d="M6 50 C26 42 76 42 96 50 C78 59 25 59 6 50 Z" fill="var(--headwear-shade)"/><path id="fedora-crown" data-svg-african-role="headwear fedora crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M21 48 C23 24 36 12 52 12 C70 13 80 26 81 48 C64 43 38 43 21 48 Z" fill="var(--headwear)"/><path d="M24 38 C40 43 62 43 78 38" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity=".8" stroke-linecap="round"/>`;
        } else if (headwear === 'wide-brim-hat') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'wide-brim-hat', 'wide-brim-hat sun-hat on-head')}<path id="wide-brim-hat-brim" data-svg-african-role="headwear wide-brim-hat sun-hat brim brow-clear on-head" d="M-3 55 C20 37 81 37 104 55 C78 68 23 68 -3 55 Z" fill="var(--headwear-shade)"/><path id="wide-brim-hat-crown" data-svg-african-role="headwear wide-brim-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M18 50 C21 25 35 12 52 12 C71 13 84 27 85 51 C67 43 36 43 18 50 Z" fill="var(--headwear)"/>`;
        } else if (headwear === 'cloche-hat') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'cloche-hat', 'cloche-hat on-head')}<path id="cloche-hat" data-svg-african-role="headwear cloche-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M11 56 C9 29 26 11 50 10 C76 11 91 30 90 56 C72 64 29 64 11 56 Z" fill="var(--headwear)"/><path id="cloche-ribbon" data-svg-african-role="cloche-ribbon brow-clear on-head" d="M17 46 C33 52 67 52 84 46" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".85" stroke-linecap="round"/>`;
        } else if (headwear === 'bucket-hat') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'bucket-hat', 'bucket-hat on-head')}<path id="bucket-hat-crown" data-svg-african-role="headwear bucket-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M16 37 C27 22 72 22 84 37 L90 58 C70 66 29 66 11 58 Z" fill="var(--headwear)"/><path data-svg-african-role="bucket-hat brim brow-clear on-head" d="M12 56 C33 49 68 49 88 56" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".65" stroke-linecap="round"/>`;
        } else if (headwear === 'baseball-cap') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'baseball-cap', 'baseball-cap on-head')}<path id="baseball-cap-crown" data-svg-african-role="headwear baseball-cap crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M12 51 C15 26 32 13 52 14 C71 15 86 28 90 51 C73 45 29 45 12 51 Z" fill="var(--headwear)"/><path id="baseball-cap-visor" data-svg-african-role="headwear baseball-cap visor brow-clear on-head" d="M58 47 C76 46 92 52 100 62 C84 62 69 57 57 50 Z" fill="var(--headwear-shade)"/><path d="M31 17 C42 29 49 39 52 50 M66 18 C59 30 54 40 52 50" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity=".52" stroke-linecap="round"/>`;
        } else if (headwear === 'beanie') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'beanie', 'beanie knit-cap on-head')}<path id="beanie-cap" data-svg-african-role="headwear beanie knit-cap scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M10 52 C9 27 27 10 50 10 C75 10 92 28 90 53 C73 60 28 60 10 52 Z" fill="var(--headwear)"/><path data-svg-african-role="beanie-ribbing brow-clear on-head" d="M17 47 L17 57 M29 45 L29 59 M40 44 L40 60 M51 44 L51 60 M62 44 L62 60 M74 45 L74 59 M85 47 L85 57" fill="none" stroke="var(--headwear-shade)" stroke-width="1.6" opacity=".75"/>`;
        } else if (headwear === 'top-hat') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'top-hat', 'top-hat on-head')}<path id="top-hat-brim" data-svg-african-role="headwear top-hat brim brow-clear on-head" d="M8 51 C28 43 74 43 94 51 C77 59 25 59 8 51 Z" fill="var(--headwear-shade)"/><path id="top-hat-crown" data-svg-african-role="headwear top-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M25 13 L77 13 L81 49 C64 44 37 44 21 49 Z" fill="var(--headwear)"/><path d="M27 35 L77 35" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".82"/>`;
        } else if (headwear === 'construction-helmet') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'construction-helmet', 'construction-helmet safety-helmet engineer hard-hat on-head')}<path id="construction-helmet-dome" data-svg-african-role="headwear construction-helmet safety-helmet engineer hard-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M9 55 C9 27 27 10 50 10 C74 10 91 28 91 55 C72 49 28 49 9 55 Z" fill="var(--headwear)"/><path id="construction-helmet-ridge" data-svg-african-role="headwear construction-helmet center-ridge safety on-head" d="M50 12 C46 27 46 43 50 56" fill="none" stroke="var(--accent)" stroke-width="4" opacity=".56" stroke-linecap="round"/><path id="construction-helmet-side-band" data-svg-african-role="headwear construction-helmet side-band brow-clear on-head no-scalp-gap" d="M11 51 C27 56 73 56 89 51 L87 54 C70 58 30 58 13 54 Z" fill="var(--headwear-shade)" opacity=".42"/><path id="construction-helmet-brim" data-svg-african-role="headwear construction-helmet brim brow-clear on-head" d="M4 56 C24 49 77 49 98 56 C81 65 20 65 4 56 Z" fill="var(--headwear-shade)"/><path id="construction-helmet-highlight" d="M20 35 C34 24 66 24 81 37" fill="none" stroke="#ffffff" stroke-width="2.2" opacity=".20" stroke-linecap="round"/>`;
        } else if (headwear === 'chef-hat') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'chef-hat', 'chef-hat toque on-head')}<path id="chef-hat-full-scalp-seal" data-svg-african-role="headwear chef-hat toque full-scalp-cover full-hair-coverage no-scalp-gap" d="M3 52 C1 22 20 -2 50 -2 C81 -2 100 22 97 53 C78 58 22 58 3 52 Z" fill="var(--headwear)" stroke="var(--headwear)" stroke-width="3" stroke-linejoin="round"/><path id="chef-hat-band" data-svg-african-role="headwear chef-hat toque band scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M14 45 C31 37 70 37 87 45 L85 59 C67 54 33 54 16 59 Z" fill="var(--headwear-shade)"/><path id="chef-hat-puff" data-svg-african-role="headwear chef-hat toque puff crown scalp-cover on-head full-hair-coverage" d="M7 47 C1 31 12 17 27 20 C32 5 48 2 57 16 C68 3 86 11 85 28 C97 29 101 43 88 51 C70 43 29 43 7 47 Z" fill="var(--headwear)"/><path id="chef-hat-folds" data-svg-african-role="chef-hat toque folds on-head" d="M28 21 C33 31 34 40 31 49 M51 16 C50 29 50 39 51 48 M75 25 C69 33 68 41 71 49" fill="none" stroke="var(--headwear-shade)" stroke-width="1.5" opacity=".45" stroke-linecap="round"/>`;
        } else if (headwear === 'pilot-cap') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'pilot-cap', 'pilot-cap airline-cap on-head')}<path id="pilot-cap-crown" data-svg-african-role="headwear pilot-cap airline-cap crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M12 50 C14 27 30 14 51 14 C73 15 88 28 90 51 C72 46 29 45 12 50 Z" fill="var(--headwear)"/><path id="pilot-cap-band" data-svg-african-role="headwear pilot-cap rank-band brow-clear on-head" d="M15 43 C32 49 70 49 87 43" fill="none" stroke="var(--accent)" stroke-width="3.5" opacity=".9" stroke-linecap="round"/><path id="pilot-cap-visor" data-svg-african-role="headwear pilot-cap visor brow-clear on-head" d="M14 50 C33 59 70 59 88 50 C78 64 24 64 14 50 Z" fill="var(--headwear-shade)"/><path id="pilot-cap-badge" data-svg-african-role="headwear pilot-cap badge wings on-head" d="M42 36 C47 33 55 33 60 36 M47 35 L51 30 L55 35 M39 38 C44 41 58 41 63 38" fill="none" stroke="var(--accent)" stroke-width="1.6" opacity=".9" stroke-linecap="round"/>`;
        } else if (headwear === 'security-cap') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'security-cap', 'security-cap uniform-cap on-head')}<path id="security-cap-crown" data-svg-african-role="headwear security-cap uniform-cap crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M12 51 C14 28 30 15 51 15 C73 16 88 29 90 52 C72 46 29 46 12 51 Z" fill="var(--headwear)"/><path id="security-cap-panel-lines" data-svg-african-role="headwear security-cap panel-lines on-head" d="M31 20 C41 31 47 41 50 51 M68 21 C60 32 54 42 51 51" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".56" stroke-linecap="round"/><path id="security-cap-visor" data-svg-african-role="headwear security-cap visor brow-clear on-head" d="M9 51 C29 59 73 59 93 51 C80 63 22 63 9 51 Z" fill="var(--headwear-shade)"/><path id="security-cap-badge" data-svg-african-role="headwear security-cap badge on-head" d="M48 35 L53 35 L56 41 L50.5 46 L45 41 Z" fill="var(--accent)" opacity=".9"/>`;
        } else if (headwear === 'military-beret') {
            hat = `${renderStructuredCapScalpUnderlay(headwear, 'military-beret', 'military-beret beret soldier on-head')}<path id="military-beret-body" data-svg-african-role="headwear military-beret beret soldier crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M10 47 C18 26 37 17 61 20 C78 23 91 34 90 48 C69 44 40 47 19 56 C13 55 9 52 10 47 Z" fill="var(--headwear)"/><path id="military-beret-band" data-svg-african-role="headwear military-beret band brow-clear on-head" d="M17 52 C36 47 68 45 88 49 C76 57 39 61 17 56 Z" fill="var(--headwear-shade)" opacity=".9"/><path id="military-beret-badge" data-svg-african-role="headwear military-beret badge on-head" d="M70 34 L76 38 L75 46 L68 47 L65 40 Z" fill="var(--accent)" opacity=".88"/>`;
        }
        return wrapHeadwearFit(`<g id="hair-back" data-svg-african-role="hair hair-back headwear-with-hair general-hat ${headwear}">${baseHair}${hat}</g>`, adjustments, headwear);
    }

    function renderGeneralHeadwearFrontOverlay(headwear, adjustments = {}) {
        if (!GENERAL_HATS.has(headwear)) return '';
        let overlay = '';
        if (headwear === 'academic-cap') {
            overlay = `<path id="academic-cap-front-scalp" data-svg-african-role="headwear-front academic-cap mortarboard skullcap scalp-cover continuous-scalp-cover brow-clear on-head" d="M12 57 C12 35 27 18 50 16 C75 18 89 35 88 57 C73 50 62 47 50 47 C38 47 27 50 12 57 Z" fill="var(--headwear-shade)" opacity=".98"/>
        <path id="academic-cap-front-board-shadow" data-svg-african-role="headwear-front academic-cap mortarboard board shadow on-head" d="M10 33 L51 13 L92 33 L51 52 Z" fill="rgba(0,0,0,.28)"/>
        <path id="academic-cap-front-board" data-svg-african-role="headwear-front academic-cap mortarboard board square-cap on-head" d="M8 29 L51 8 L95 30 L51 51 Z" fill="var(--headwear)"/>
        <path id="academic-cap-front-band" data-svg-african-role="headwear-front academic-cap band scalp-cover brow-clear on-head" d="M20 47 C35 40 66 40 82 47 L80 59 C64 53 36 53 21 59 Z" fill="var(--headwear-shade)"/>
        <path id="academic-cap-front-tassel" data-svg-african-role="headwear-front academic-cap tassel side-face-drop above-ear on-head" d="M51 12 C62 18 76 24 82 36 C85 45 84 55 80 64 M80 62 C84 66 86 71 86 76 M80 62 C79 68 78 73 78 78 M80 62 C82 68 81 74 82 79" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
        <circle id="academic-cap-front-side-knot" cx="80" cy="62" r="2" fill="var(--accent)"/>
        <circle id="academic-cap-front-button" cx="51" cy="12" r="3" fill="var(--accent)"/>`;
        } else if (headwear === 'fedora') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'fedora-front', 'headwear-front fedora on-head')}
        <path id="fedora-front-brim" data-svg-african-role="headwear-front fedora brim brow-clear on-head" d="M6 50 C26 42 76 42 96 50 C78 59 25 59 6 50 Z" fill="var(--headwear-shade)"/>
        <path id="fedora-front-crown" data-svg-african-role="headwear-front fedora crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M21 48 C23 24 36 12 52 12 C70 13 80 26 81 48 C64 43 38 43 21 48 Z" fill="var(--headwear)"/>
        <path id="fedora-front-band" d="M24 38 C40 43 62 43 78 38" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity=".8" stroke-linecap="round"/>`;
        } else if (headwear === 'wide-brim-hat') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'wide-brim-hat-front', 'headwear-front wide-brim-hat sun-hat on-head')}
        <path id="wide-brim-hat-front-brim" data-svg-african-role="headwear-front wide-brim-hat sun-hat brim brow-clear on-head" d="M-3 55 C20 37 81 37 104 55 C78 68 23 68 -3 55 Z" fill="var(--headwear-shade)"/>
        <path id="wide-brim-hat-front-crown" data-svg-african-role="headwear-front wide-brim-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M18 50 C21 25 35 12 52 12 C71 13 84 27 85 51 C67 43 36 43 18 50 Z" fill="var(--headwear)"/>`;
        } else if (headwear === 'cloche-hat') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'cloche-hat-front', 'headwear-front cloche-hat on-head')}
        <path id="cloche-hat-front-crown" data-svg-african-role="headwear-front cloche-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M11 56 C9 29 26 11 50 10 C76 11 91 30 90 56 C72 64 29 64 11 56 Z" fill="var(--headwear)"/>
        <path id="cloche-hat-front-ribbon" data-svg-african-role="headwear-front cloche-ribbon brow-clear on-head" d="M17 46 C33 52 67 52 84 46" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".85" stroke-linecap="round"/>`;
        } else if (headwear === 'bucket-hat') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'bucket-hat-front', 'headwear-front bucket-hat on-head')}
        <path id="bucket-hat-front-crown" data-svg-african-role="headwear-front bucket-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M16 37 C27 22 72 22 84 37 L90 58 C70 66 29 66 11 58 Z" fill="var(--headwear)"/>
        <path id="bucket-hat-front-brim" data-svg-african-role="headwear-front bucket-hat brim brow-clear on-head" d="M12 56 C33 49 68 49 88 56" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".65" stroke-linecap="round"/>`;
        } else if (headwear === 'baseball-cap') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'baseball-cap-front', 'headwear-front baseball-cap on-head')}
        <path id="baseball-cap-front-crown" data-svg-african-role="headwear-front baseball-cap crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M12 51 C15 26 32 13 52 14 C71 15 86 28 90 51 C73 45 29 45 12 51 Z" fill="var(--headwear)"/>
        <path id="baseball-cap-front-visor" data-svg-african-role="headwear-front baseball-cap visor brow-clear on-head" d="M58 47 C76 46 92 52 100 62 C84 62 69 57 57 50 Z" fill="var(--headwear-shade)"/>
        <path id="baseball-cap-front-panels" d="M31 17 C42 29 49 39 52 50 M66 18 C59 30 54 40 52 50" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity=".52" stroke-linecap="round"/>`;
        } else if (headwear === 'beanie') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'beanie-front', 'headwear-front beanie knit-cap on-head')}
        <path id="beanie-front-cap" data-svg-african-role="headwear-front beanie knit-cap scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M10 52 C9 27 27 10 50 10 C75 10 92 28 90 53 C73 60 28 60 10 52 Z" fill="var(--headwear)"/>
        <path id="beanie-front-ribbing" data-svg-african-role="headwear-front beanie-ribbing brow-clear on-head" d="M17 47 L17 57 M29 45 L29 59 M40 44 L40 60 M51 44 L51 60 M62 44 L62 60 M74 45 L74 59 M85 47 L85 57" fill="none" stroke="var(--headwear-shade)" stroke-width="1.6" opacity=".75"/>`;
        } else if (headwear === 'top-hat') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'top-hat-front', 'headwear-front top-hat on-head')}
        <path id="top-hat-front-brim" data-svg-african-role="headwear-front top-hat brim brow-clear on-head" d="M8 51 C28 43 74 43 94 51 C77 59 25 59 8 51 Z" fill="var(--headwear-shade)"/>
        <path id="top-hat-front-crown" data-svg-african-role="headwear-front top-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M25 13 L77 13 L81 49 C64 44 37 44 21 49 Z" fill="var(--headwear)"/>
        <path id="top-hat-front-band" d="M27 35 L77 35" fill="none" stroke="var(--accent)" stroke-width="3" opacity=".82"/>`;
        } else if (headwear === 'construction-helmet') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'construction-helmet-front', 'headwear-front construction-helmet safety-helmet engineer hard-hat on-head')}
        <path id="construction-helmet-front-dome" data-svg-african-role="headwear-front construction-helmet safety-helmet engineer hard-hat crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M9 55 C9 27 27 10 50 10 C74 10 91 28 91 55 C72 49 28 49 9 55 Z" fill="var(--headwear)"/>
        <path id="construction-helmet-front-ridge" data-svg-african-role="headwear-front construction-helmet center-ridge safety on-head" d="M50 12 C46 27 46 43 50 56" fill="none" stroke="var(--accent)" stroke-width="4" opacity=".56" stroke-linecap="round"/>
        <path id="construction-helmet-front-side-band" data-svg-african-role="headwear-front construction-helmet side-band brow-clear on-head no-scalp-gap" d="M11 51 C27 56 73 56 89 51 L87 54 C70 58 30 58 13 54 Z" fill="var(--headwear-shade)" opacity=".42"/>
        <path id="construction-helmet-front-brim" data-svg-african-role="headwear-front construction-helmet brim brow-clear on-head" d="M4 56 C24 49 77 49 98 56 C81 65 20 65 4 56 Z" fill="var(--headwear-shade)"/>`;
        } else if (headwear === 'chef-hat') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'chef-hat-front', 'headwear-front chef-hat toque on-head')}
        <path id="chef-hat-front-full-scalp-seal" data-svg-african-role="headwear-front chef-hat toque full-scalp-cover full-hair-coverage no-scalp-gap" d="M3 52 C1 22 20 -2 50 -2 C81 -2 100 22 97 53 C78 58 22 58 3 52 Z" fill="var(--headwear)" stroke="var(--headwear)" stroke-width="3" stroke-linejoin="round"/>
        <path id="chef-hat-front-band" data-svg-african-role="headwear-front chef-hat toque band scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M14 45 C31 37 70 37 87 45 L85 59 C67 54 33 54 16 59 Z" fill="var(--headwear-shade)"/>
        <path id="chef-hat-front-puff" data-svg-african-role="headwear-front chef-hat toque puff crown scalp-cover brow-clear on-head full-hair-coverage" d="M7 47 C1 31 12 17 27 20 C32 5 48 2 57 16 C68 3 86 11 85 28 C97 29 101 43 88 51 C70 43 29 43 7 47 Z" fill="var(--headwear)"/>
        <path id="chef-hat-front-folds" data-svg-african-role="headwear-front chef-hat toque folds on-head" d="M28 21 C33 31 34 40 31 49 M51 16 C50 29 50 39 51 48 M75 25 C69 33 68 41 71 49" fill="none" stroke="var(--headwear-shade)" stroke-width="1.5" opacity=".45" stroke-linecap="round"/>`;
        } else if (headwear === 'pilot-cap') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'pilot-cap-front', 'headwear-front pilot-cap airline-cap on-head')}
        <path id="pilot-cap-front-crown" data-svg-african-role="headwear-front pilot-cap airline-cap crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M12 50 C14 27 30 14 51 14 C73 15 88 28 90 51 C72 46 29 45 12 50 Z" fill="var(--headwear)"/>
        <path id="pilot-cap-front-band" data-svg-african-role="headwear-front pilot-cap rank-band brow-clear on-head" d="M15 43 C32 49 70 49 87 43" fill="none" stroke="var(--accent)" stroke-width="3.5" opacity=".9" stroke-linecap="round"/>
        <path id="pilot-cap-front-visor" data-svg-african-role="headwear-front pilot-cap visor brow-clear on-head" d="M14 50 C33 59 70 59 88 50 C78 64 24 64 14 50 Z" fill="var(--headwear-shade)"/>
        <path id="pilot-cap-front-badge" data-svg-african-role="headwear-front pilot-cap badge wings on-head" d="M42 36 C47 33 55 33 60 36 M47 35 L51 30 L55 35 M39 38 C44 41 58 41 63 38" fill="none" stroke="var(--accent)" stroke-width="1.6" opacity=".9" stroke-linecap="round"/>`;
        } else if (headwear === 'security-cap') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'security-cap-front', 'headwear-front security-cap uniform-cap on-head')}
        <path id="security-cap-front-crown" data-svg-african-role="headwear-front security-cap uniform-cap crown scalp-cover brow-clear on-head continuous-scalp-cover no-scalp-gap" d="M12 51 C14 28 30 15 51 15 C73 16 88 29 90 52 C72 46 29 46 12 51 Z" fill="var(--headwear)"/>
        <path id="security-cap-front-panels" data-svg-african-role="headwear-front security-cap panel-lines on-head" d="M31 20 C41 31 47 41 50 51 M68 21 C60 32 54 42 51 51" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".56" stroke-linecap="round"/>
        <path id="security-cap-front-visor" data-svg-african-role="headwear-front security-cap visor brow-clear on-head" d="M9 51 C29 59 73 59 93 51 C80 63 22 63 9 51 Z" fill="var(--headwear-shade)"/>
        <path id="security-cap-front-badge" data-svg-african-role="headwear-front security-cap badge on-head" d="M48 35 L53 35 L56 41 L50.5 46 L45 41 Z" fill="var(--accent)" opacity=".9"/>`;
        } else if (headwear === 'military-beret') {
            overlay = `${renderStructuredCapScalpUnderlay(headwear, 'military-beret-front', 'headwear-front military-beret beret soldier on-head')}
        <path id="military-beret-front-body" data-svg-african-role="headwear-front military-beret beret soldier crown scalp-cover brow-clear continuous-scalp-cover on-head no-scalp-gap" d="M10 47 C17 26 36 16 60 19 C79 22 91 34 90 49 C71 45 39 47 18 57 C13 55 9 51 10 47 Z" fill="var(--headwear)" opacity=".99"/>
        <path id="military-beret-front-band" data-svg-african-role="headwear-front military-beret beret-band brow-clear on-head" d="M17 51 C35 46 70 45 88 49 C77 58 39 61 17 56 Z" fill="var(--headwear-shade)" opacity=".96"/>
        <path id="military-beret-front-badge" data-svg-african-role="headwear-front military-beret beret-badge soldier-badge on-head" d="M70 33 L77 38 L76 46 L68 48 L64 40 Z" fill="var(--accent)" opacity=".92"/>
        <path id="military-beret-front-highlight" d="M24 38 C40 30 65 31 82 42" fill="none" stroke="#ffffff" stroke-width="1.4" opacity=".14" stroke-linecap="round"/>`;
        }
        return overlay
            ? wrapHeadwearFit(`<g id="${headwear}-front-headwear" data-svg-african-role="headwear-front general-hat ${headwear} brow-clear on-head">${overlay}</g>`, adjustments, `${headwear}-front`)
            : '';
    }

    function renderTraditionalHeadwearFrontOverlay(headwear, adjustments = {}) {
        if (headwear !== 'gele' && headwear !== 'wrapped-gele' && headwear !== 'turban') return '';
        let overlay = '';
        if (headwear === 'turban') {
            overlay = `<path id="turban-front-crown" data-svg-african-role="headwear-front turban crown scalp-cover crown-cover brow-clear continuous-scalp-cover on-head premium-traditional-headwear" d="M9 51 C9 29 27 11 50 10 C76 10 91 29 90 52 C75 46 63 43 50 43 C37 43 24 46 9 51 Z" fill="var(--headwear)" opacity=".99"/>
        <path id="turban-front-brow-band" data-svg-african-role="headwear-front turban brow-band brow-clear on-head" d="M14 48 C31 42 69 42 87 48 L84 58 C66 53 34 53 17 58 Z" fill="var(--headwear-shade)" opacity=".90"/>
        <path id="turban-front-fold-primary" data-svg-african-role="headwear-front headwear-fold turban cloth-fold brow-clear on-head" d="M12 43 C30 27 68 23 90 39" fill="none" stroke="var(--accent)" stroke-width="4.6" opacity=".82" stroke-linecap="round"/>
        <path id="turban-front-fold-secondary" data-svg-african-role="headwear-front headwear-fold turban cloth-fold brow-clear on-head" d="M16 34 C37 49 64 49 85 33" fill="none" stroke="var(--blouse)" stroke-width="4.2" opacity=".72" stroke-linecap="round"/>`;
        } else {
            const isWrapped = headwear === 'wrapped-gele';
            const crownId = isWrapped ? 'wrapped-gele-front-crown' : 'gele-front-crown';
            const wingOpacity = isWrapped ? '.20' : '.36';
            const pleatStroke = isWrapped ? '3.5' : '4.8';
            overlay = `<path id="${crownId}" data-svg-african-role="headwear-front ${headwear} gele crown scalp-cover crown-cover brow-clear continuous-scalp-cover on-head premium-traditional-headwear" d="${isWrapped ? 'M8 58 C7 32 25 10 53 8 C82 9 95 32 90 59 C72 48 29 48 8 58 Z' : 'M2 62 C2 31 24 5 55 4 C88 6 101 32 95 66 C79 49 25 48 2 62 Z'}" fill="var(--headwear)" opacity=".99"/>
        <path id="${headwear}-front-wing-left" data-svg-african-role="headwear-front ${headwear} headwrap-wing brow-clear on-head" d="M7 55 C11 28 31 9 55 6 C35 23 23 43 20 65 C14 64 9 60 7 55 Z" fill="var(--headwear-shade)" opacity="${wingOpacity}"/>
        <path id="${headwear}-front-wing-right" data-svg-african-role="headwear-front ${headwear} headwrap-wing brow-clear on-head" d="M93 57 C94 33 80 13 56 6 C73 24 82 45 79 67 C85 66 91 62 93 57 Z" fill="var(--headwear-shade)" opacity="${wingOpacity}"/>
        <path id="${headwear}-front-forehead-band" data-svg-african-role="headwear-front ${headwear} brow-band brow-clear on-head" d="M10 53 C30 46 70 46 91 53 C76 60 25 60 10 53 Z" fill="var(--headwear-shade)" opacity=".78"/>
        <path id="${headwear}-front-fold-primary" data-svg-african-role="headwear-front headwear-fold ${headwear} pleat brow-clear on-head" d="M8 49 C29 27 70 18 94 36" fill="none" stroke="var(--accent)" stroke-width="${pleatStroke}" opacity=".78" stroke-linecap="round"/>
        <path id="${headwear}-front-fold-secondary" data-svg-african-role="headwear-front headwear-fold ${headwear} pleat brow-clear on-head" d="${isWrapped ? 'M16 39 C40 52 63 52 86 38' : 'M12 38 C38 55 66 54 90 38'}" fill="none" stroke="var(--skirt)" stroke-width="${isWrapped ? '3.2' : '3.8'}" opacity=".64" stroke-linecap="round"/>
        <path id="${headwear}-front-fold-tertiary" data-svg-african-role="headwear-front headwear-fold ${headwear} pleat brow-clear on-head" d="M25 19 C40 29 70 29 84 20" fill="none" stroke="var(--blouse)" stroke-width="2.8" opacity=".58" stroke-linecap="round"/>`;
        }
        return wrapHeadwearFit(`<g id="${headwear}-front-headwear" data-svg-african-role="headwear-front premium-traditional-headwear ${headwear} brow-clear on-head continuous-scalp-cover female-headwear">${overlay}</g>`, adjustments, `${headwear}-front`);
    }

    function renderHair(config, p, adjustments = {}, faceScale = {}) {
        const hair = normalizeId(config.identity?.hair || config.hair, 'braids');
        const headwear = normalizeId(config.styling?.headwear || config.headwear, 'none');
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const headType = normalizeId(config.identity?.headType || config.headType, 'balanced');
        const headProfile = HEAD_TYPE_VISUAL_PROFILES[headType] || HEAD_TYPE_VISUAL_PROFILES.balanced;
        const headWidth = getHeadWidthAdjustment(adjustments);
        const headHeight = getHeadHeightAdjustment(adjustments);
        const hairVolume = getAdjustmentValue(adjustments, 'hairVolume');
        const headTypeHairWidth = headwear === 'none' ? (headProfile.frontWidth || 0) * 0.012 : 0;
        const headTypeHairHeight = headwear === 'none' ? (headProfile.frontHeight || 0) * 0.008 : 0;
        const hairScaleX = (1 + hairVolume * 0.44 + headWidth * 0.22 + headTypeHairWidth) * (faceScale.x || 1);
        const hairScaleY = (1 + hairVolume * 0.34 + headHeight * 0.18 + headTypeHairHeight) * (faceScale.y || 1);
        const naturallyFramesEars = presentation !== 'male' && (
            BRAID_HAIRS.has(hair) ||
            (BOB_HAIRS.has(hair) && hair !== 'pixie-cut') ||
            LONG_HAIRS.has(hair) ||
            SIDE_BRAID_HAIRS.has(hair) ||
            LOC_TWIST_HAIRS.has(hair)
        );
        const revealsHairUnderHeadwear = hair !== 'bald'
            && headwear !== 'none'
            && !MODEST_HEADWEAR.has(headwear);
        const framesEars = presentation !== 'male'
            && ((headwear === 'none' && naturallyFramesEars) || revealsHairUnderHeadwear);
        const femaleHairEndY = naturallyFramesEars ? 110 : 94;
        const femaleHairReturnY = naturallyFramesEars ? 98 : 84;
        const earBackHair = framesEars
            ? `<g id="female-ear-back-hair" data-svg-african-role="hair hair-back female-ear-back-hair behind-ear below-ear ear-gap-cover continuous-temple-to-nape-hair ${revealsHairUnderHeadwear ? 'hair-under-headwear visible-below-headgear' : ''}">
        <path id="female-ear-back-left" d="M9 48 C2 61 3 ${naturallyFramesEars ? 88 : 80} 16 ${femaleHairEndY} C21 ${femaleHairReturnY} 21 73 16 54 C14 50 12 48 9 48 Z" fill="var(--hair)"/>
        <path id="female-ear-back-right" d="M89 48 C96 61 95 ${naturallyFramesEars ? 88 : 80} 82 ${femaleHairEndY} C77 ${femaleHairReturnY} 77 73 82 54 C84 50 86 48 89 48 Z" fill="var(--hair)"/>
    </g>`
            : '';
        const shortHeadwearHair = revealsHairUnderHeadwear && presentation === 'male'
            ? `<g id="male-headwear-hair-reveal" data-svg-african-role="hair hair-back hair-under-headwear visible-below-headgear behind-ear lower-ear-hairline">
        <path id="male-headwear-hair-left" d="M9 51 C7 61 8 75 13 86 C18 82 19 68 16 55 C14 52 12 51 9 51 Z" fill="var(--hair)"/>
        <path id="male-headwear-hair-right" d="M89 51 C91 61 90 75 85 86 C80 82 79 68 82 55 C84 52 86 51 89 51 Z" fill="var(--hair)"/>
    </g>`
            : '';
        const wrapHair = (markup) => {
            let photoDrape = '';
            if (config._photoCharacter && revealsHairUnderHeadwear && (LONG_HAIRS.has(hair) || BOB_HAIRS.has(hair) || BRAID_HAIRS.has(hair) || PONYTAIL_HAIRS.has(hair))) {
                const end = BOB_HAIRS.has(hair) ? 112 : 146;
                const paths = [
                    `M9 51 C2 73 6 103 3 ${end - 8} Q3 ${end + 7} 20 ${end} C29 ${end - 13} 22 97 22 73 L22 51Z`,
                    `M89 51 C96 73 92 103 95 ${end - 8} Q95 ${end + 7} 78 ${end} C69 ${end - 13} 76 97 76 73 L76 51Z`
                ];
                photoDrape = `<g data-svg-african-role="photo-hair-drape hair-under-headwear">${paths.map(d => `<path d="${d}" fill="var(--hair)"/>`).join('')}</g>`;
                if (PONYTAIL_HAIRS.has(hair)) photoDrape = '<path data-svg-african-role="photo-hair-drape ponytail hair-under-headwear" d="M11 48 C-1 61 8 86 3 110 C-2 127 3 143 14 147 C27 131 15 110 22 87 C27 66 23 53 11 48Z" fill="var(--hair)"/>';
                if (BRAID_HAIRS.has(hair)) {
                    const braids = [9, 17, 81, 89].map(x => `M${x} 51 C${x - 3} 80 ${x + 3} 111 ${x} 143`);
                    photoDrape = `<g data-svg-african-role="photo-hair-drape braids hair-under-headwear" fill="none" stroke-linecap="round">${braids.map(d => `<path d="${d}" stroke="var(--hair)" stroke-width="6"/><path d="${d}" stroke="var(--hair-light)" stroke-width="2" stroke-dasharray="2 3"/>`).join('')}</g>`;
                }
            }
            const composed = `${photoDrape}${earBackHair}${shortHeadwearHair}${markup || ''}`;
            if (!composed) return '';
            const tagged = `<g data-svg-african-role="hairstyle" data-svg-african-hair-style="${hair}">${composed}</g>`;
            if (Math.abs(hairScaleX - 1) < 0.001 && Math.abs(hairScaleY - 1) < 0.001) return tagged;
            return `<g transform="translate(49 54) scale(${hairScaleX.toFixed(3)} ${hairScaleY.toFixed(3)}) translate(-49 -54)">${tagged}</g>`;
        };
        if (MODEST_HEADWEAR.has(headwear)) {
            return wrapHair(renderModestHeadwear(headwear, adjustments));
        }
        if (REGIONAL_HEADWEAR.has(headwear)) {
            return wrapHair(renderRegionalHeadwear(headwear, hair, adjustments));
        }
        if (GENERAL_HATS.has(headwear)) {
            return wrapHair(renderGeneralHat(headwear, hair, adjustments));
        }
        if (headwear === 'gele' || headwear === 'wrapped-gele' || headwear === 'turban') {
            const baseHair = hair === 'bald' ? '' : renderHairBeneathHeadwear(`${headwear}-traditional`);
            const cap = headwear === 'turban'
                ? '<path id="turban-crown" data-svg-african-role="hair-cap scalp-cover crown-cover" data-svg-african-headwear="turban crown brow-clear" d="M13 50 C12 27 28 12 51 10 C77 9 91 27 88 51 C78 42 26 42 13 50 Z" fill="var(--headwear)"/><path id="turban-fold-primary" data-svg-african-role="headwear-fold brow-clear" d="M12 44 C27 28 65 21 89 38" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><path id="turban-fold-secondary" data-svg-african-role="headwear-fold brow-clear" d="M17 34 C38 48 63 47 84 31" fill="none" stroke="var(--blouse)" stroke-width="5" stroke-linecap="round"/>'
                : '<path id="gele-crown" data-svg-african-role="hair-cap scalp-cover crown-cover" data-svg-african-headwear="gele crown brow-clear" d="M3 61 C1 29 23 3 55 2 C88 4 101 31 93 66 C80 48 25 46 3 61 Z" fill="var(--headwear)"/><path id="gele-side-wing-left" data-svg-african-role="headwear-wing gele brow-clear" d="M8 55 C10 26 30 8 55 5 C34 21 22 42 20 65 C15 64 11 60 8 55 Z" fill="var(--headwear-shade)" opacity=".42"/><path id="gele-side-wing-right" data-svg-african-role="headwear-wing gele brow-clear" d="M92 57 C93 31 80 11 56 5 C72 23 80 45 78 67 C84 66 89 62 92 57 Z" fill="var(--headwear-shade)" opacity=".38"/><path id="gele-fold-primary" data-svg-african-role="headwear-fold gele pleat brow-clear" d="M8 49 C29 26 70 16 94 35" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round"/><path id="gele-fold-secondary" data-svg-african-role="headwear-fold gele pleat brow-clear" d="M12 37 C38 54 65 53 90 37" fill="none" stroke="var(--skirt)" stroke-width="4" stroke-linecap="round"/><path id="gele-fold-tertiary" data-svg-african-role="headwear-fold gele pleat brow-clear" d="M24 18 C39 29 70 29 84 19" fill="none" stroke="var(--blouse)" stroke-width="3" stroke-linecap="round" opacity=".72"/><circle cx="82" cy="28" r="4" fill="var(--accent)"/><g id="gele-role-marker" data-svg-african-role="headwear gele crown" opacity="0"></g>';
            return wrapHair(wrapHeadwearFit(`<g id="hair-back" data-svg-african-role="hair headwear premium-traditional-headwear">${baseHair}${cap}</g>`, adjustments, headwear));
        }
        if (hair === 'bald') {
            return '';
        }
        if (CLOSE_CROP_HAIRS.has(hair)) {
            const capPath = hair === 'buzz-cut'
                ? 'M13 58 C10 38 26 18 49 17 C74 18 89 38 85 58 C72 48 62 44 49 44 C36 44 25 48 13 58 Z'
                : hair === 'temple-fade'
                    ? 'M14 58 C12 35 27 14 50 12 C74 13 89 34 86 59 C73 49 63 45 50 45 C37 45 26 49 14 58 Z'
                    : 'M10 61 C5 36 22 14 49 12 C78 13 93 36 88 62 C76 49 63 43 49 43 C35 43 22 49 10 61 Z';
            const cap = renderScalpCap(`${hair}-cap`, capPath);
            const fadeDetail = hair === 'temple-fade'
                ? '<path data-svg-african-role="fade-temple shadow temple-fade clean-temple-cut" d="M12 55 C19 49 25 46 33 44 M87 55 C80 49 74 46 66 44" fill="none" stroke="var(--skin-shade)" stroke-width="5.2" opacity=".72" stroke-linecap="round"/><path data-svg-african-role="temple-fade edge-line" d="M17 51 C23 47 29 45 35 44 M82 51 C76 47 70 45 64 44" fill="none" stroke="var(--hair-light)" stroke-width="1.4" opacity=".4" stroke-linecap="round"/>'
                : hair === 'fade'
                    ? '<path data-svg-african-role="fade-temple shadow fade soft-gradient-edge" d="M11 58 C20 49 29 45 38 44 M87 59 C78 49 70 45 61 44" fill="none" stroke="var(--hair-light)" stroke-width="3.2" opacity=".2" stroke-linecap="round"/>'
                    : '';
            const waveDetail = hair === 'waves'
                ? '<path data-svg-african-role="wave-pattern" d="M18 52 C28 43 40 39 51 40 M25 37 C38 29 61 29 74 38 M33 25 C44 20 58 20 68 26" fill="none" stroke="var(--hair-light)" stroke-width="1.6" opacity=".36" stroke-linecap="round"/>'
                : '<path d="M16 56 C26 40 38 31 50 31 C64 31 77 41 83 57" fill="none" stroke="var(--hair-light)" stroke-width="2.2" opacity=".24" stroke-linecap="round"/>';
            return wrapHair(`<g id="hair-back" data-svg-african-role="hair hair-back close-crop ${hair}">${cap}${fadeDetail}${waveDetail}</g>`);
        }
        if (hair === 'high-top-fade') {
            return wrapHair('<g id="hair-back" data-svg-african-role="hair hair-back high-top-fade"><path id="high-top-mass" data-svg-african-role="hair-cap scalp-cover crown-cover vertical-volume" d="M20 59 C16 35 23 13 38 6 C48 1 65 2 75 8 C86 17 90 38 85 60 C74 47 63 42 50 42 C37 42 27 47 20 59 Z" fill="var(--hair)"/><path d="M25 19 C38 10 63 10 78 22 M23 34 C39 26 65 27 83 37" fill="none" stroke="var(--hair-light)" stroke-width="1.7" opacity=".24" stroke-linecap="round"/></g>');
        }
        if (SWEPT_MENS_HAIRS.has(hair)) {
            return wrapHair(renderSwoopMensHair(hair));
        }
        if (PARTED_MENS_HAIRS.has(hair)) {
            return wrapHair(renderPartedMensHair(hair));
        }
        if (BOB_HAIRS.has(hair)) {
            return wrapHair(renderBobBackHair(hair));
        }
        if (LONG_HAIRS.has(hair)) {
            return wrapHair(renderLongBackHair(hair));
        }
        if (PONYTAIL_HAIRS.has(hair)) {
            return wrapHair(renderPonytailBackHair(hair));
        }
        if (SIDE_BRAID_HAIRS.has(hair)) {
            return wrapHair(renderSideBraidBackHair(hair));
        }
        if (BRAID_HAIRS.has(hair)) {
            const braidWidth = hair === 'box-braids' ? 5.8 : hair === 'fulani-braids' ? 4.2 : 4.8;
            const braidPaths = hair === 'box-braids'
                ? [
                    'M12 57 C6 78 9 106 22 135',
                    'M24 58 C17 83 20 112 31 140',
                    'M86 57 C92 78 89 106 76 135',
                    'M74 58 C81 83 78 112 67 140'
                ]
                : hair === 'fulani-braids'
                    ? [
                        'M13 56 C7 76 10 100 21 124',
                        'M23 59 C17 82 20 108 30 134',
                        'M85 56 C91 76 88 100 77 124',
                        'M75 59 C81 82 78 108 68 134'
                    ]
                    : [
                        'M11 57 C5 77 8 103 20 132',
                        'M20 58 C13 81 16 110 28 140',
                        'M29 60 C23 86 25 113 35 143',
                        'M87 57 C93 77 90 103 78 132',
                        'M78 58 C85 81 82 110 70 140',
                        'M69 60 C75 86 73 113 63 143'
                    ];
            const beadMarkup = hair === 'fulani-braids'
                ? '<circle cx="21" cy="124" r="2.2" fill="var(--accent)"/><circle cx="77" cy="124" r="2.2" fill="var(--accent)"/><path data-svg-african-role="fulani-center-braid crown-only no-face-crossing" d="M50 18 C49 31 49 43 50 55" fill="none" stroke="var(--hair-light)" stroke-width="2.2" opacity=".62" stroke-dasharray="2 2.2" stroke-linecap="round"/>'
                : '';
            const rootRows = hair === 'box-braids'
                ? 'M18 48 L29 31 M31 52 L40 24 M45 54 L49 18 M58 54 L57 19 M71 52 L68 27 M82 48 L76 34'
                : 'M16 49 C24 32 35 21 49 12 M28 52 C35 31 42 19 50 12 M42 54 C46 31 49 19 50 12 M57 54 C55 31 52 19 51 12 M71 52 C65 31 58 19 51 12 M83 49 C75 32 64 21 51 12';
            return wrapHair(`<g id="hair-back" data-svg-african-role="hair hair-back ${hair} braided-hair" data-svg-african-hair-style="${hair}">
    <path id="hair-back-mass" data-svg-african-role="hair-cap scalp-cover crown-cover braided-crown" d="M5 66 C0 41 10 21 30 10 C43 1 64 1 78 11 C96 24 100 48 90 70 C78 58 64 52 49 52 C33 52 19 58 5 66 Z" fill="var(--hair)"/>
    <path id="braid-root-sections" data-svg-african-role="braid-roots crown-partings visible-braid-texture" d="${rootRows}" fill="none" stroke="var(--hair-light)" stroke-width="1.35" opacity=".64" stroke-linecap="round"/>
    ${renderBraidedPlaits(`${hair}-rear-plaits`, braidPaths, { width: braidWidth, detailWidth: hair === 'box-braids' ? 1.65 : 1.4, role: `hair-side-locks outside-neck outside-face no-face-crossing braid-plaits individual-braids segmented-braids ${hair}` })}
    <path id="braided-hairline-base" data-svg-african-role="braided-hairline scalp-cover" d="M11 65 C22 52 36 46 50 46 C64 46 77 52 87 65 C76 58 63 54 50 54 C37 54 23 58 11 65 Z" fill="var(--hair)"/>
    ${beadMarkup}
</g>`);
        }
        if (AFRO_HAIRS.has(hair)) {
            const volumeTransform = hair === 'afro-short'
                ? ' transform="translate(49 45) scale(.86 .82) translate(-49 -45)"'
                : hair === 'afro-full'
                    ? ' transform="translate(49 48) scale(1.12 1.10) translate(-49 -48)"'
                    : hair === 'wash-and-go'
                        ? ' transform="translate(49 48) scale(.94 .91) translate(-49 -48)"'
                        : '';
            const tapered = hair === 'tapered-afro'
                ? '<path id="tapered-afro-cap" data-svg-african-role="hair-cap scalp-cover crown-cover tapered-afro" d="M11 63 C5 42 12 24 30 13 C43 3 67 3 81 15 C96 27 98 51 87 68 C72 53 27 52 11 63 Z" fill="var(--hair)"/>'
                : '<path id="afro-cap" data-svg-african-role="hair-cap scalp-cover crown-cover" d="M7 65 C-2 42 7 21 27 10 C40 -3 69 -3 83 11 C101 23 103 49 89 70 C73 53 27 52 7 65 Z" fill="var(--hair)"/>';
            const texture = hair === 'twist-out'
                ? '<g data-svg-african-role="twist-out coil-clusters"><circle cx="18" cy="43" r="8" fill="var(--hair-light)" opacity=".19"/><circle cx="32" cy="23" r="7" fill="var(--hair-light)" opacity=".16"/><circle cx="50" cy="15" r="7" fill="var(--hair-light)" opacity=".15"/><circle cx="68" cy="24" r="7" fill="var(--hair-light)" opacity=".15"/><circle cx="81" cy="44" r="7" fill="var(--hair-light)" opacity=".16"/></g>'
                : hair === 'wash-and-go'
                    ? '<g data-svg-african-role="wash-and-go small-curl-texture"><circle cx="20" cy="42" r="4" fill="var(--hair-light)" opacity=".18"/><circle cx="31" cy="29" r="3.5" fill="var(--hair-light)" opacity=".16"/><circle cx="44" cy="20" r="4" fill="var(--hair-light)" opacity=".15"/><circle cx="58" cy="20" r="3.5" fill="var(--hair-light)" opacity=".14"/><circle cx="72" cy="31" r="4" fill="var(--hair-light)" opacity=".15"/><circle cx="80" cy="45" r="3.5" fill="var(--hair-light)" opacity=".15"/></g>'
                : '<circle cx="21" cy="35" r="11" fill="var(--hair-light)" opacity=".22"/><circle cx="73" cy="35" r="12" fill="var(--hair-light)" opacity=".18"/><circle cx="49" cy="16" r="13" fill="var(--hair-light)" opacity=".12"/>';
            return wrapHair(`<g id="hair-back" data-svg-african-role="hair hair-back ${hair}"${volumeTransform}>${tapered}${texture}</g>`);
        }
        if (hair === 'afro-puff') {
            return wrapHair('<g id="hair-back" data-svg-african-role="hair hair-back afro-puff"><path id="puff-base-cap" data-svg-african-role="hair-cap scalp-cover crown-cover" d="M11 59 C8 36 25 15 50 14 C76 15 92 37 88 60 C74 49 63 45 50 45 C36 45 24 49 11 59 Z" fill="var(--hair)"/><circle id="afro-puff-volume" data-svg-african-role="top-puff natural-volume" cx="50" cy="10" r="24" fill="var(--hair)"/><circle cx="38" cy="9" r="9" fill="var(--hair-light)" opacity=".13"/><circle cx="62" cy="11" r="8" fill="var(--hair-light)" opacity=".12"/></g>');
        }
        if (hair === 'bantu-knots') {
            return wrapHair('<g id="hair-back" data-svg-african-role="hair hair-back bantu-knots"><path id="bantu-under-cap" data-svg-african-role="hair-cap scalp-cover crown-cover" d="M13 58 C10 37 27 17 50 16 C74 17 90 38 86 59 C73 49 62 45 50 45 C37 45 25 49 13 58 Z" fill="var(--hair)"/><circle cx="25" cy="25" r="9" fill="var(--hair)"/><circle cx="39" cy="12" r="9" fill="var(--hair)"/><circle cx="58" cy="12" r="9" fill="var(--hair)"/><circle cx="74" cy="26" r="9" fill="var(--hair)"/><path d="M21 25 C25 20 30 21 33 25 M54 12 C58 8 64 9 67 13" fill="none" stroke="var(--hair-light)" stroke-width="1.2" opacity=".22" stroke-linecap="round"/></g>');
        }
        if (hair === 'natural-bun') {
            return wrapHair('<g id="hair-back" data-svg-african-role="hair hair-back"><path id="bun-cap" data-svg-african-role="hair-cap scalp-cover crown-cover" d="M9 59 C7 35 24 15 49 14 C75 15 92 36 89 60 C78 51 64 47 49 47 C34 47 21 51 9 59 Z" fill="var(--hair)"/><path id="bun-back-roll" data-svg-african-role="natural-bun back-volume low-profile-bun" d="M24 29 C35 19 63 19 75 30 C67 27 33 27 24 29 Z" fill="var(--hair)" opacity=".72"/><path d="M24 33 C39 27 62 28 76 36" fill="none" stroke="var(--hair-light)" stroke-width="1.7" opacity=".22" stroke-linecap="round"/></g>');
        }
        if (CORNROW_HAIRS.has(hair)) {
            const rowWidth = hair === 'ghana-weaving' ? 2.8 : hair === 'flat-twist' ? 2.05 : 1.45;
            const opacity = hair === 'flat-twist' ? '.42' : hair === 'ghana-weaving' ? '.72' : '.5';
            const rows = hair === 'ghana-weaving'
                ? 'M14 50 C24 28 35 17 49 11 M23 53 C31 29 40 17 50 11 M34 54 C40 30 45 18 50 11 M45 55 C48 31 50 19 51 11 M57 55 C55 31 53 19 51 11 M69 53 C63 29 58 17 51 11 M82 50 C73 28 62 17 51 11'
                : 'M18 48 C26 27 36 17 49 12 M30 50 C37 29 43 18 50 12 M43 51 C47 29 50 18 51 12 M57 51 C55 29 53 18 51 12 M72 48 C65 27 58 17 51 12';
            const ghanaExtension = hair === 'ghana-weaving'
                ? '<path id="ghana-weaving-gathered-braid" data-svg-african-role="ghana-weaving gathered-feed-in-braid outside-neck outside-face no-face-crossing" d="M82 52 C96 69 95 94 82 122 C78 131 75 138 75 145" fill="none" stroke="var(--hair)" stroke-width="8.4" stroke-linecap="round"/><path data-svg-african-role="ghana-weaving braid-pattern outside-face" d="M82 57 C91 75 90 96 80 120 C77 128 75 136 75 143" fill="none" stroke="var(--hair-light)" stroke-width="1.7" stroke-dasharray="4 4" opacity=".48" stroke-linecap="round"/>'
                : '';
            return wrapHair(`<g id="hair-back" data-svg-african-role="hair hair-back ${hair}"><path id="cornrow-cap" data-svg-african-role="hair-cap scalp-cover crown-cover" d="M10 61 C7 35 24 13 50 11 C76 12 93 35 88 62 C73 49 28 49 10 61 Z" fill="var(--hair)"/><path data-svg-african-role="${hair} crown-rows" d="${rows}" fill="none" stroke="var(--hair-light)" stroke-width="${rowWidth}" opacity="${opacity}" stroke-linecap="round"/>${ghanaExtension}</g>`);
        }
        if (LOC_TWIST_HAIRS.has(hair)) {
            const capId = hair === 'twists' ? 'twist-cap' : 'loc-cap';
            const capPath = hair === 'twists'
                ? 'M10 61 C7 36 24 14 50 12 C77 14 92 36 88 63 C74 50 62 45 50 45 C37 45 24 50 10 61 Z'
                : 'M9 62 C6 36 23 12 50 10 C79 12 93 36 88 64 C73 50 27 50 9 62 Z';
            const texture = hair === 'twists'
                ? '<path data-svg-african-role="twist-texture crown-only no-face-crossing" d="M25 48 C31 34 39 23 49 13 M39 50 C44 35 48 23 50 12 M61 50 C57 35 53 23 50 12 M75 48 C69 34 61 23 51 13" fill="none" stroke="var(--hair-light)" stroke-width="1.35" opacity=".26" stroke-linecap="round"/>'
                : '<path data-svg-african-role="loc-texture crown-only no-face-crossing" d="M20 51 C29 39 40 32 52 31 M32 24 C44 16 60 16 72 25 M72 34 C79 42 83 51 84 61" fill="none" stroke="var(--hair-light)" stroke-width="1.45" opacity=".22" stroke-linecap="round"/>';
            return wrapHair(`<g id="hair-back" data-svg-african-role="hair hair-back ${hair}">${renderScalpCap(capId, capPath)}${renderOutsideHairStrands(hair, 'back')}${texture}</g>`);
        }
        return wrapHair('<g id="hair-back" data-svg-african-role="hair hair-back"><path id="default-hair-cap" data-svg-african-role="hair-cap scalp-cover crown-cover" d="M9 63 C6 36 24 11 51 10 C79 12 93 36 87 66 C73 50 27 50 9 63 Z" fill="var(--hair)"/><path d="M14 58 C27 41 42 34 62 36 C51 45 40 53 25 63 Z" fill="var(--hair-light)" opacity=".32"/><path d="M69 37 C77 43 82 51 85 63 C75 57 68 50 61 39 Z" fill="var(--hair-light)" opacity=".18"/></g>');
    }

    function renderHairline(config, p, adjustments = {}, faceScale = {}) {
        const hair = normalizeId(config.identity?.hair || config.hair, 'braids');
        const headwear = normalizeId(config.styling?.headwear || config.headwear, 'none');
        if (hair === 'bald' || HEADWEAR_SUPPRESSES_HAIRLINE.has(headwear)) return '';
        const hairUnderHeadwear = headwear !== 'none' && !MODEST_HEADWEAR.has(headwear);
        const headType = normalizeId(config.identity?.headType || config.headType, 'balanced');
        const headProfile = HEAD_TYPE_VISUAL_PROFILES[headType] || HEAD_TYPE_VISUAL_PROFILES.balanced;
        const headWidth = getHeadWidthAdjustment(adjustments);
        const headHeight = getHeadHeightAdjustment(adjustments);
        const hairVolume = getAdjustmentValue(adjustments, 'hairVolume');
        const hairlineLift = getAdjustmentValue(adjustments, 'hairlineHeight') * 10;
        const hairScaleX = (1 + hairVolume * 0.30 + headWidth * 0.14) * (faceScale.x || 1);
        const hairScaleY = (1 + hairVolume * 0.22 + headHeight * 0.10) * (faceScale.y || 1);
        const capLeft = (6 - headWidth * 7).toFixed(1);
        const capRight = (92 + headWidth * 7).toFixed(1);
        const crownY = (10 - headHeight * 2.5 - Math.max(0, hairVolume) * 2 - Math.max(0, hairlineLift) * 0.15).toFixed(1);
        const baseEdgeY = CLOSE_CROP_HAIRS.has(hair) || SWEPT_MENS_HAIRS.has(hair) || PARTED_MENS_HAIRS.has(hair)
            ? 49.5
            : hair === 'natural-bun' || hair === 'afro-puff' || hair === 'bantu-knots' || PONYTAIL_HAIRS.has(hair)
                ? 48.5
                : CORNROW_HAIRS.has(hair) || BOB_HAIRS.has(hair) || LONG_HAIRS.has(hair) || SIDE_BRAID_HAIRS.has(hair)
                    ? 48.5
                    : LOC_TWIST_HAIRS.has(hair)
                        ? 49
                    : 49.5;
        const edgeYValue = clamp(
            baseEdgeY + (headProfile.hairlineDrop || 0) - hairlineLift + Math.max(0, hairVolume) * 0.45 + Math.max(0, headHeight) * 0.35,
            44,
            53
        );
        const edgeY = edgeYValue.toFixed(1);
        const templeY = Math.min(edgeYValue + 2.5, 54).toFixed(1);
        const crownArc = `M${capLeft} ${templeY} C9 31 28 ${crownY} 49 ${crownY} C71 ${crownY} 89 31 ${capRight} ${templeY}`;
        let hairlineStyle = 'natural-rounded';
        let lowerHairlinePath = `C79 ${(edgeYValue - 1).toFixed(1)} 68 ${(edgeYValue - 1.2).toFixed(1)} 59 ${edgeY} C55 ${(edgeYValue + 1.1).toFixed(1)} 52 ${(edgeYValue + 1.5).toFixed(1)} 49 ${(edgeYValue + 1.5).toFixed(1)} C45 ${(edgeYValue + 1.5).toFixed(1)} 42 ${(edgeYValue + 1.1).toFixed(1)} 38 ${edgeY} C29 ${(edgeYValue - 1.2).toFixed(1)} 19 ${(edgeYValue - 1).toFixed(1)} ${capLeft} ${templeY} Z`;
        if (CLOSE_CROP_HAIRS.has(hair)) {
            hairlineStyle = 'close-crop';
            lowerHairlinePath = `C79 ${(edgeYValue - 0.8).toFixed(1)} 68 ${(edgeYValue - 1.4).toFixed(1)} 57 ${edgeY} C52 ${(edgeYValue + 0.6).toFixed(1)} 46 ${(edgeYValue + 0.6).toFixed(1)} 40 ${edgeY} C29 ${(edgeYValue - 1.4).toFixed(1)} 19 ${(edgeYValue - 0.8).toFixed(1)} ${capLeft} ${templeY} Z`;
        } else if (SWEPT_MENS_HAIRS.has(hair)) {
            hairlineStyle = 'swept-asymmetric';
            lowerHairlinePath = `C78 ${(edgeYValue - 2).toFixed(1)} 66 ${(edgeYValue - 3.2).toFixed(1)} 56 ${(edgeYValue - 1.8).toFixed(1)} C49 ${(edgeYValue - 0.8).toFixed(1)} 42 ${(edgeYValue + 1.5).toFixed(1)} 34 ${(edgeYValue + 0.7).toFixed(1)} C25 ${(edgeYValue - 0.2).toFixed(1)} 17 ${(edgeYValue - 0.5).toFixed(1)} ${capLeft} ${templeY} Z`;
        } else if (PARTED_MENS_HAIRS.has(hair)) {
            hairlineStyle = 'soft-side-part';
            lowerHairlinePath = `C79 ${(edgeYValue - 1).toFixed(1)} 70 ${(edgeYValue - 1.7).toFixed(1)} 62 ${(edgeYValue - 0.7).toFixed(1)} C56 ${edgeY} 52 ${(edgeYValue + 2).toFixed(1)} 47 ${(edgeYValue + 1).toFixed(1)} C40 ${(edgeYValue - 0.4).toFixed(1)} 31 ${(edgeYValue - 1.5).toFixed(1)} 22 ${(edgeYValue - 0.4).toFixed(1)} C17 ${edgeY} 12 ${(edgeYValue + 0.6).toFixed(1)} ${capLeft} ${templeY} Z`;
        } else if (BRAID_HAIRS.has(hair) || CORNROW_HAIRS.has(hair)) {
            hairlineStyle = 'braided-temple-contour';
            lowerHairlinePath = `C79 ${(edgeYValue - 0.4).toFixed(1)} 70 ${(edgeYValue - 1.8).toFixed(1)} 62 ${(edgeYValue - 0.8).toFixed(1)} C57 ${edgeY} 54 ${(edgeYValue + 2.2).toFixed(1)} 49 ${(edgeYValue + 2.2).toFixed(1)} C44 ${(edgeYValue + 2.2).toFixed(1)} 40 ${edgeY} 35 ${(edgeYValue - 0.8).toFixed(1)} C27 ${(edgeYValue - 1.8).toFixed(1)} 18 ${(edgeYValue - 0.4).toFixed(1)} ${capLeft} ${templeY} Z`;
        } else if (BOB_HAIRS.has(hair) || LONG_HAIRS.has(hair) || SIDE_BRAID_HAIRS.has(hair)) {
            hairlineStyle = 'temple-framed';
            lowerHairlinePath = `C81 ${edgeY} 74 ${(edgeYValue + 0.9).toFixed(1)} 68 ${(edgeYValue - 0.5).toFixed(1)} C61 ${(edgeYValue - 2).toFixed(1)} 56 ${(edgeYValue - 0.8).toFixed(1)} 50 ${(edgeYValue + 1).toFixed(1)} C43 ${(edgeYValue - 0.8).toFixed(1)} 37 ${(edgeYValue - 2).toFixed(1)} 30 ${(edgeYValue - 0.5).toFixed(1)} C23 ${(edgeYValue + 0.9).toFixed(1)} 17 ${edgeY} ${capLeft} ${templeY} Z`;
        } else if (LOC_TWIST_HAIRS.has(hair)) {
            hairlineStyle = 'loc-twist-wave';
            lowerHairlinePath = `C80 ${(edgeYValue - 0.6).toFixed(1)} 73 ${(edgeYValue + 1.2).toFixed(1)} 66 ${edgeY} C59 ${(edgeYValue - 1.3).toFixed(1)} 54 ${(edgeYValue + 1.7).toFixed(1)} 48 ${(edgeYValue + 0.7).toFixed(1)} C42 ${(edgeYValue - 0.6).toFixed(1)} 36 ${(edgeYValue + 1.2).toFixed(1)} 29 ${edgeY} C22 ${(edgeYValue - 1).toFixed(1)} 16 ${(edgeYValue + 0.6).toFixed(1)} ${capLeft} ${templeY} Z`;
        } else if (AFRO_HAIRS.has(hair) || hair === 'natural-bun' || hair === 'afro-puff' || hair === 'bantu-knots' || PONYTAIL_HAIRS.has(hair)) {
            hairlineStyle = 'natural-pulled-back';
            lowerHairlinePath = `C80 ${(edgeYValue - 0.6).toFixed(1)} 72 ${(edgeYValue - 1.5).toFixed(1)} 63 ${(edgeYValue - 0.3).toFixed(1)} C57 ${(edgeYValue + 0.5).toFixed(1)} 54 ${(edgeYValue + 2.1).toFixed(1)} 49 ${(edgeYValue + 2.1).toFixed(1)} C44 ${(edgeYValue + 2.1).toFixed(1)} 40 ${(edgeYValue + 0.5).toFixed(1)} 34 ${(edgeYValue - 0.3).toFixed(1)} C25 ${(edgeYValue - 1.5).toFixed(1)} 17 ${(edgeYValue - 0.6).toFixed(1)} ${capLeft} ${templeY} Z`;
        }
        const hairlinePath = `${crownArc} ${lowerHairlinePath}`;
        const detail = CORNROW_HAIRS.has(hair)
            ? '<path data-svg-african-role="hair-detail brow-clear crown-only" d="M24 37 C31 30 39 25 49 21 M37 38 C42 31 47 26 50 21 M61 38 C57 31 53 26 50 21 M74 37 C67 30 59 25 50 21" fill="none" stroke="var(--hair-light)" stroke-width="1.05" stroke-linecap="round" opacity=".22"/>'
            : LOC_TWIST_HAIRS.has(hair)
                ? '<path data-svg-african-role="hair-detail brow-clear crown-only no-face-crossing" d="M20 36 C31 31 42 29 54 30 M64 31 C72 34 78 37 83 39" fill="none" stroke="var(--hair-light)" stroke-width="1.1" stroke-linecap="round" opacity=".11"/>'
                : SWEPT_MENS_HAIRS.has(hair)
                    ? '<path data-svg-african-role="hair-detail brow-clear crown-only no-face-crossing" d="M23 34 C38 25 58 23 78 31 M20 39 C38 34 61 34 84 40" fill="none" stroke="var(--hair-light)" stroke-width="1.1" stroke-linecap="round" opacity=".18"/>'
                    : PARTED_MENS_HAIRS.has(hair)
                        ? '<path data-svg-african-role="hair-detail brow-clear crown-only no-face-crossing" d="M32 27 C43 34 57 38 74 39" fill="none" stroke="var(--hair-light)" stroke-width="1.2" stroke-linecap="round" opacity=".20"/>'
                        : '<path data-svg-african-role="hair-detail brow-clear" d="M20 36 C32 31 43 30 56 31 M63 31 C72 34 78 37 83 39" fill="none" stroke="var(--hair-light)" stroke-width="1.1" stroke-linecap="round" opacity=".09"/>';
        const headwearRoles = hairUnderHeadwear
            ? 'hair-under-headwear visible-below-headgear overlaps-headwear-edge no-bald-gap'
            : '';
        return `<g id="hairline" data-svg-african-role="hairline hair-cap full-scalp-cover continuous-scalp-cover crown-to-temple-cover brow-clear ${headwearRoles}" transform="translate(49 55) scale(${hairScaleX.toFixed(3)} ${hairScaleY.toFixed(3)}) translate(-49 -55)">
        <path id="hair-cap-front" data-svg-african-role="hair-cap scalp-cover full-scalp-cover continuous-scalp-cover crown-cover temple-cover forehead-hairline brow-clear no-scalp-gap authored-hairline ${headwearRoles}" data-svg-african-hairline-y="${edgeY}" data-svg-african-hairline-style="${hairlineStyle}" d="${hairlinePath}" fill="var(--hair)"/>
        ${detail}
    </g>`;
    }

    function renderHairFront(config, p, adjustments = {}, faceScale = {}) {
        const hair = normalizeId(config.identity?.hair || config.hair, 'braids');
        const headwear = normalizeId(config.styling?.headwear || config.headwear, 'none');
        if (hair === 'bald' || HEADWEAR_SUPPRESSES_HAIRLINE.has(headwear)) return '';
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const headType = normalizeId(config.identity?.headType || config.headType, 'balanced');
        const headProfile = HEAD_TYPE_VISUAL_PROFILES[headType] || HEAD_TYPE_VISUAL_PROFILES.balanced;
        const headWidth = getHeadWidthAdjustment(adjustments);
        const headHeight = getHeadHeightAdjustment(adjustments);
        const hairVolume = getAdjustmentValue(adjustments, 'hairVolume');
        const hairlineLift = getAdjustmentValue(adjustments, 'hairlineHeight') * 10;
        const hairScaleX = (1 + hairVolume * 0.28 + headWidth * 0.12) * (faceScale.x || 1);
        const hairScaleY = (1 + hairVolume * 0.20 + headHeight * 0.08) * (faceScale.y || 1);
        const frontShiftY = ((headProfile.hairlineDrop || 0) - hairlineLift).toFixed(2);
        const wrapFront = markup => `<g id="hair-front" data-svg-african-role="hair-front" data-svg-african-hair-style="${hair}" data-svg-african-brow-clear="true" transform="translate(0 ${frontShiftY}) translate(49 54) scale(${hairScaleX.toFixed(3)} ${hairScaleY.toFixed(3)}) translate(-49 -54)">${markup}</g>`;
        const femaleAttachments = presentation !== 'male'
            ? '<path id="hair-face-attachments" data-svg-african-role="hair-front-side-locks outside-neck outside-face no-face-crossing" data-svg-african-hair-attachment="female" d="M14 58 C9 72 11 88 20 102 M84 58 C89 72 87 88 78 102" fill="none" stroke="var(--hair)" stroke-width="4.2" stroke-linecap="round"/>'
            : '';
        if (BRAID_HAIRS.has(hair)) {
            const frontPaths = hair === 'box-braids'
                ? ['M14 52 C8 72 11 96 21 122', 'M84 52 C90 72 87 96 77 122']
                : hair === 'fulani-braids'
                    ? ['M13 52 C8 71 10 94 20 118', 'M85 52 C90 71 88 94 78 118']
                    : ['M13 52 C7 71 10 96 21 124', 'M20 55 C14 77 17 102 27 131', 'M85 52 C91 71 88 96 77 124', 'M78 55 C84 77 81 102 71 131'];
            const rootDetail = hair === 'box-braids'
                ? 'M22 38 L30 49 M34 34 L40 49 M48 32 L49 49 M62 34 L58 49 M76 38 L68 49'
                : hair === 'fulani-braids'
                    ? 'M20 39 C29 34 39 31 49 30 M34 40 C40 34 45 31 50 30 M50 42 L50 29 M65 40 C60 34 55 31 50 30 M79 39 C70 34 60 31 51 30'
                    : 'M18 39 C27 33 38 30 49 29 M30 41 C37 34 44 30 50 29 M43 42 C47 34 49 30 50 29 M57 42 C55 34 52 30 51 29 M70 41 C64 34 57 30 51 29 M82 39 C73 33 62 30 51 29';
            const beads = hair === 'fulani-braids'
                ? '<circle cx="20" cy="119" r="2" fill="var(--accent)"/><circle cx="78" cy="119" r="2" fill="var(--accent)"/>'
                : '';
            return wrapFront(`<path id="braided-front-cap" data-svg-african-role="braided-front-cap scalp-cover brow-clear raised-hairline ${hair}" d="M11 41 C22 32 36 28 50 28 C65 28 79 33 87 42 C75 39 62 37 50 37 C36 37 23 39 11 41 Z" fill="var(--hair)"/>
    <path id="braid-front-root-sections" data-svg-african-role="braid-roots crown-partings visible-braid-texture ${hair}" d="${rootDetail}" fill="none" stroke="var(--hair-light)" stroke-width="1.25" opacity=".68" stroke-linecap="round"/>
    ${renderBraidedPlaits(`${hair}-front-plaits`, frontPaths, { width: hair === 'box-braids' ? 5.2 : hair === 'fulani-braids' ? 4 : 4.35, detailWidth: 1.3, role: `hair-front-side-locks outside-neck outside-face no-face-crossing braid-plaits individual-braids segmented-braids ${hair}` })}
    ${beads}`);
        }
        if (CLOSE_CROP_HAIRS.has(hair)) {
            const waves = hair === 'waves'
                ? '<path data-svg-african-role="wave-front-detail brow-clear" d="M21 37 C31 34 41 34 51 36 M47 34 C58 31 70 33 79 37" fill="none" stroke="var(--hair-light)" stroke-width="1.1" opacity=".34" stroke-linecap="round"/>'
                : '';
            const frontCap = hair === 'temple-fade'
                ? 'M21 37 C29 32 39 30 50 30 C62 30 72 33 79 37 C69 36 60 35 50 35 C39 35 30 36 21 37 Z'
                : hair === 'buzz-cut'
                    ? 'M20 37 C28 34 39 33 49 33 C60 33 70 34 78 37 C68 37 59 36 49 36 C39 36 30 37 20 37 Z'
                    : 'M16 38 C26 33 37 32 49 32 C62 32 73 33 82 38 C71 38 61 37 49 37 C37 37 27 38 16 38 Z';
            const fadeEdge = hair === 'temple-fade'
                ? '<path data-svg-african-role="temple-fade front-edge" d="M18 38 C22 35 26 34 30 33 M80 38 C76 35 72 34 68 33" fill="none" stroke="var(--skin-shade)" stroke-width="2.6" opacity=".64" stroke-linecap="round"/>'
                : hair === 'fade'
                    ? '<path data-svg-african-role="fade front-gradient" d="M17 38 C25 35 31 34 38 33 M81 38 C73 35 67 34 60 33" fill="none" stroke="var(--hair-light)" stroke-width="1.5" opacity=".28" stroke-linecap="round"/>'
                    : '';
            return wrapFront(`<path data-svg-african-role="low-cut-front-cap brow-clear raised-hairline ${hair}" d="${frontCap}" fill="var(--hair)" opacity=".95"/>${fadeEdge}${waves}`);
        }
        if (hair === 'high-top-fade') {
            return wrapFront('<path data-svg-african-role="high-top-front brow-clear raised-hairline" d="M19 39 C27 28 37 23 50 23 C63 23 75 29 84 40 C73 38 62 36 50 36 C38 36 27 38 19 39 Z" fill="var(--hair)"/><path d="M28 28 C40 22 60 22 73 29" fill="none" stroke="var(--hair-light)" stroke-width="1.3" opacity=".18" stroke-linecap="round"/>');
        }
        if (SWEPT_MENS_HAIRS.has(hair)) {
            const top = hair === 'spiky-top'
                ? '<path data-svg-african-role="spiky-front brow-clear raised-hairline" d="M16 40 L26 24 L33 38 L43 20 L51 37 L62 19 L70 38 L82 24 L86 41 C72 37 61 35 50 35 C37 35 27 37 16 40 Z" fill="var(--hair)"/>'
                : hair === 'faux-hawk'
                    ? '<path data-svg-african-role="faux-hawk-front brow-clear raised-hairline" d="M22 40 C29 25 41 18 50 17 C59 18 70 25 78 40 C66 36 58 34 50 34 C42 34 34 36 22 40 Z" fill="var(--hair)"/>'
                    : '<path data-svg-african-role="swept-front brow-clear raised-hairline" d="M15 41 C26 29 45 24 72 29 C65 36 46 40 24 43 C19 43 16 42 15 41 Z" fill="var(--hair)"/>';
            return wrapFront(`${top}<path data-svg-african-role="swept-front-detail crown-only no-face-crossing" d="M27 35 C43 29 59 28 77 34" fill="none" stroke="var(--hair-light)" stroke-width="1.1" opacity=".18" stroke-linecap="round"/>`);
        }
        if (PARTED_MENS_HAIRS.has(hair)) {
            const fringe = hair === 'angular-fringe'
                ? '<path data-svg-african-role="angular-fringe-front brow-clear raised-hairline" d="M14 40 C31 31 52 31 83 39 C68 40 49 43 29 47 C21 48 16 46 14 40 Z" fill="var(--hair)"/>'
                : hair === 'comb-over'
                    ? '<path data-svg-african-role="comb-over-front directional-sweep brow-clear raised-hairline" d="M16 41 C30 27 53 23 84 34 C70 40 51 43 28 45 C22 46 18 44 16 41 Z" fill="var(--hair)"/>'
                    : hair === 'textured-crop'
                        ? '<path data-svg-african-role="textured-crop-front choppy-fringe brow-clear raised-hairline" d="M15 40 L24 35 L32 39 L42 33 L51 39 L61 33 L70 39 L83 36 L85 42 C68 39 34 39 15 40 Z" fill="var(--hair)"/>'
                        : hair === 'caesar'
                            ? '<path data-svg-african-role="caesar-front straight-fringe brow-clear raised-hairline" d="M18 38 C32 34 66 34 81 38 L79 43 C63 40 37 40 20 43 Z" fill="var(--hair)"/>'
                            : '<path data-svg-african-role="parted-front brow-clear raised-hairline" d="M15 39 C27 33 40 31 50 32 C64 31 76 34 84 39 C72 38 61 37 50 37 C37 37 26 38 15 39 Z" fill="var(--hair)"/>';
            const detail = hair === 'comb-over'
                ? '<path data-svg-african-role="comb-over-lines crown-only no-face-crossing" d="M24 35 C40 28 59 27 78 33 M27 40 C44 34 63 34 81 38" fill="none" stroke="var(--hair-light)" stroke-width="1.15" opacity=".24" stroke-linecap="round"/>'
                : hair === 'caesar'
                    ? '<path data-svg-african-role="caesar-lines crown-only no-face-crossing" d="M25 32 C40 29 61 29 75 32" fill="none" stroke="var(--hair-light)" stroke-width="1" opacity=".2" stroke-linecap="round"/>'
                    : '<path data-svg-african-role="part-line crown-only no-face-crossing" d="M33 29 C43 34 58 37 75 38" fill="none" stroke="var(--hair-light)" stroke-width="1.15" opacity=".22" stroke-linecap="round"/>';
            return wrapFront(`${fringe}${detail}`);
        }
        if (BOB_HAIRS.has(hair)) {
            const sideLocks = hair === 'pixie-cut'
                ? '<path data-svg-african-role="pixie-front-side brow-clear outside-face no-face-crossing" d="M16 52 C14 65 16 78 24 89 M84 52 C86 65 84 78 76 89" fill="none" stroke="var(--hair)" stroke-width="4.6" stroke-linecap="round"/>'
                : hair === 'round-bob'
                    ? '<path data-svg-african-role="round-bob-front-side-locks outside-neck outside-face no-face-crossing" d="M10 51 C4 76 9 105 27 124 M88 51 C95 76 90 105 71 124" fill="none" stroke="var(--hair)" stroke-width="10.4" stroke-linecap="round"/>'
                    : '<path data-svg-african-role="bob-front-side-locks outside-neck outside-face no-face-crossing" d="M13 52 C8 75 12 98 26 118 M85 52 C91 75 87 98 72 118" fill="none" stroke="var(--hair)" stroke-width="7.2" stroke-linecap="round"/>';
            const front = hair === 'side-part-bob'
                ? '<path data-svg-african-role="side-part-bob-front brow-clear raised-hairline" d="M13 40 C30 26 54 24 84 39 C67 39 50 42 31 47 C22 49 16 46 13 40 Z" fill="var(--hair)"/>'
                : '<path data-svg-african-role="bob-front-cap brow-clear raised-hairline" d="M13 40 C24 33 37 31 50 31 C65 31 78 34 86 41 C74 40 62 38 50 38 C37 38 25 39 13 40 Z" fill="var(--hair)"/>';
            return wrapFront(`${front}${sideLocks}`);
        }
        if (LONG_HAIRS.has(hair)) {
            const sweep = hair === 'side-swept-long'
                ? '<path data-svg-african-role="side-swept-long-front brow-clear raised-hairline" d="M12 40 C27 23 52 16 83 31 C70 42 48 48 24 50 C18 49 14 46 12 40 Z" fill="var(--hair)"/>'
                : '<path data-svg-african-role="long-front-cap brow-clear raised-hairline" d="M13 40 C25 32 37 30 50 30 C65 30 78 33 87 41 C75 39 63 38 50 38 C37 38 25 39 13 40 Z" fill="var(--hair)"/>';
            const sideLocks = hair === 'shoulder-length'
                ? 'M12 57 C8 76 12 96 25 116 M87 57 C91 76 87 96 73 116'
                : hair === 'long-straight'
                    ? 'M12 57 L19 139 M87 57 L80 139'
                    : 'M12 57 C8 78 11 104 24 131 M87 57 C92 78 88 104 74 131';
            return wrapFront(`${sweep}<path data-svg-african-role="long-front-side-locks outside-neck outside-face no-face-crossing ${hair}" d="${sideLocks}" fill="none" stroke="var(--hair)" stroke-width="6.8" stroke-linecap="round"/>`);
        }
        if (PONYTAIL_HAIRS.has(hair)) {
            const updo = hair === 'updo'
                ? '<circle data-svg-african-role="updo-front-bun crown-cover brow-clear" cx="50" cy="23" r="10" fill="var(--hair)"/>'
                : '';
            return wrapFront(`<path data-svg-african-role="ponytail-front-cap brow-clear raised-hairline" d="M14 39 C25 33 37 31 50 31 C64 31 76 33 85 39 C74 38 62 37 50 37 C38 37 26 38 14 39 Z" fill="var(--hair)"/>${updo}${femaleAttachments}`);
        }
        if (SIDE_BRAID_HAIRS.has(hair)) {
            const braid = hair === 'single-braid'
                ? '<path data-svg-african-role="single-braid-front outside-neck outside-face no-face-crossing" d="M83 56 C94 76 91 101 75 127" fill="none" stroke="var(--hair)" stroke-width="6.5" stroke-linecap="round" opacity=".96"/>'
                : '<path data-svg-african-role="side-braid-front outside-neck outside-face no-face-crossing" d="M84 55 C94 76 90 101 73 126" fill="none" stroke="var(--hair)" stroke-width="6.8" stroke-linecap="round"/>';
            return wrapFront(`<path data-svg-african-role="side-braid-front-cap brow-clear raised-hairline" d="M12 40 C25 31 39 28 56 31 C50 37 38 41 23 42 C18 42 14 41 12 40 Z" fill="var(--hair)"/><path data-svg-african-role="side-braid-front-sweep brow-clear raised-hairline" d="M60 31 C75 34 84 42 85 53 C77 48 68 41 55 36 Z" fill="var(--hair)"/>${braid}`);
        }
        if (AFRO_HAIRS.has(hair)) {
            const texture = hair === 'twist-out'
                ? '<g data-svg-african-role="twist-out front-coil-clusters"><circle cx="18" cy="39" r="3.4" fill="var(--hair-light)" opacity=".18"/><circle cx="31" cy="34" r="3" fill="var(--hair-light)" opacity=".16"/><circle cx="68" cy="34" r="3" fill="var(--hair-light)" opacity=".15"/><circle cx="81" cy="40" r="3.4" fill="var(--hair-light)" opacity=".16"/></g>'
                : hair === 'wash-and-go'
                    ? '<g data-svg-african-role="wash-and-go front-small-curls"><circle cx="18" cy="40" r="2" fill="var(--hair-light)" opacity=".18"/><circle cx="27" cy="36" r="1.8" fill="var(--hair-light)" opacity=".16"/><circle cx="72" cy="36" r="1.8" fill="var(--hair-light)" opacity=".15"/><circle cx="81" cy="40" r="2" fill="var(--hair-light)" opacity=".16"/></g>'
                : '<circle cx="23" cy="39" r="3.6" fill="var(--hair-light)" opacity=".12"/><circle cx="77" cy="39" r="3.6" fill="var(--hair-light)" opacity=".1"/>';
            const frontCap = hair === 'afro-full'
                ? 'M5 42 C18 32 34 27 50 27 C68 27 84 33 94 43 C78 41 64 40 50 40 C34 40 19 41 5 42 Z'
                : hair === 'afro-short'
                    ? 'M15 39 C25 34 37 32 50 32 C64 32 76 35 84 40 C72 39 61 38 50 38 C37 38 26 39 15 39 Z'
                    : 'M10 40 C21 34 35 30 50 30 C66 30 80 34 88 41 C75 40 63 39 50 39 C36 39 23 39 10 40 Z';
            return wrapFront(`<path data-svg-african-role="afro-front-cap brow-clear raised-hairline ${hair}" d="${frontCap}" fill="var(--hair)"/>${texture}`);
        }
        if (hair === 'afro-puff') {
            return wrapFront('<path data-svg-african-role="afro-puff-front-cap brow-clear raised-hairline" d="M14 38 C25 33 37 31 50 31 C64 31 76 33 85 38 C74 38 62 37 50 37 C38 37 26 38 14 38 Z" fill="var(--hair)"/><circle cx="50" cy="22" r="14" fill="var(--hair)" opacity=".96"/>');
        }
        if (hair === 'bantu-knots') {
            return wrapFront('<path data-svg-african-role="bantu-front-cap brow-clear raised-hairline" d="M16 39 C26 34 38 32 50 32 C63 32 74 34 83 39 C73 38 62 37 50 37 C38 37 27 38 16 39 Z" fill="var(--hair)"/><circle cx="25" cy="31" r="5.5" fill="var(--hair)"/><circle cx="40" cy="24" r="5.5" fill="var(--hair)"/><circle cx="58" cy="24" r="5.5" fill="var(--hair)"/><circle cx="74" cy="31" r="5.5" fill="var(--hair)"/>');
        }
        if (hair === 'natural-bun') {
            return wrapFront('<path id="bun-front-hairline" data-svg-african-role="natural-bun front-cap brow-clear raised-hairline" d="M14 38 C25 33 37 31 50 31 C64 31 76 33 85 38 C74 38 62 37 50 37 C38 37 26 38 14 38 Z" fill="var(--hair)"/><path d="M22 37 C35 33 49 32 63 35" fill="none" stroke="var(--hair-light)" stroke-width="1.25" opacity=".14" stroke-linecap="round"/>' + femaleAttachments);
        }
        if (CORNROW_HAIRS.has(hair)) {
            const rowWidth = hair === 'ghana-weaving' ? 2.35 : hair === 'flat-twist' ? 1.65 : 1.15;
            const rowOpacity = hair === 'flat-twist' ? '.34' : hair === 'ghana-weaving' ? '.66' : '.28';
            const rows = hair === 'ghana-weaving'
                ? 'M18 38 C27 32 37 30 49 30 M27 40 C35 33 42 30 50 30 M38 41 C43 34 47 31 50 30 M50 42 L50 30 M62 41 C57 34 53 31 50 30 M73 40 C65 33 58 30 50 30 M82 38 C73 32 63 30 51 30'
                : 'M23 37 C31 33 38 32 49 32 M37 38 C42 34 46 32 50 32 M62 38 C58 34 54 32 50 32 M76 37 C68 33 61 32 51 32';
            const extension = hair === 'ghana-weaving'
                ? '<path id="ghana-weaving-front-braid" data-svg-african-role="ghana-weaving feed-in-braid outside-neck outside-face no-face-crossing" d="M83 49 C94 69 93 96 79 125" fill="none" stroke="var(--hair)" stroke-width="7.4" stroke-linecap="round"/><path data-svg-african-role="ghana-weaving braid-pattern outside-face" d="M83 55 C90 73 89 95 79 122" fill="none" stroke="var(--hair-light)" stroke-width="1.5" stroke-dasharray="4 4" opacity=".46" stroke-linecap="round"/>'
                : '';
            return wrapFront(`<path data-svg-african-role="cornrow-front-cap brow-clear raised-hairline ${hair}" d="M15 38 C25 32 37 32 50 32 C63 32 75 32 84 38 C74 37 62 36 50 36 C38 36 26 37 15 38 Z" fill="var(--hair)"/><path data-svg-african-role="${hair} cornrow-lines brow-clear raised-hairline crown-only" d="${rows}" fill="none" stroke="var(--hair-light)" stroke-width="${rowWidth}" opacity="${rowOpacity}" stroke-linecap="round"/>${extension}`);
        }
        if (LOC_TWIST_HAIRS.has(hair)) {
            const capRole = hair === 'twists' ? 'twist-front-cap' : 'loc-front-cap';
            const texture = hair === 'twists'
                ? '<path data-svg-african-role="twist-front-texture crown-only no-face-crossing" d="M27 39 C35 34 43 32 50 32 M72 39 C65 34 57 32 50 32" fill="none" stroke="var(--hair-light)" stroke-width="1.1" opacity=".2" stroke-linecap="round"/>'
                : '';
            return wrapFront(`<path data-svg-african-role="${capRole} brow-clear raised-hairline no-face-crossing" d="M11 40 C23 34 36 31 50 31 C65 31 78 34 87 40 C74 39 62 38 50 38 C37 38 24 39 11 40 Z" fill="var(--hair)"/>${texture}${renderOutsideHairStrands(hair, 'front')}`);
        }
        return wrapFront('<path data-svg-african-role="default-front-cap brow-clear raised-hairline" d="M12 39 C24 33 39 30 57 32 C51 37 40 40 24 41 C18 41 14 40 12 39 Z" fill="var(--hair)"/><path data-svg-african-role="default-front-cap brow-clear raised-hairline" d="M72 32 C81 36 84 43 81 49 C76 44 69 40 59 36 Z" fill="var(--hair)"/>' + femaleAttachments);
    }

    function renderHeadNeck(config, p, options = {}) {
        const state = getFaceState(config, options.faceState);
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const view = normalizePremiumView(config.styling?.view || config.view || 'front');
        const viewGazeBaseline = getThreeQuarterGazeBaseline(view);
        const faceShape = getFaceShapeSpec(config.identity?.face || config.face);
        const faceProfile = getFaceShapeVisualProfile(config.identity?.face || config.face, adjustments);
        const headType = normalizeId(config.identity?.headType || config.headType, 'balanced');
        const headProfile = HEAD_TYPE_VISUAL_PROFILES[headType] || HEAD_TYPE_VISUAL_PROFILES.balanced;
        const eyeStyle = normalizeId(config.identity?.eyes || config.eyes, 'almond');
        const noseStyle = normalizeId(config.identity?.nose || config.nose, 'soft');
        const lipStyle = normalizeId(config.identity?.lips || config.lips, 'natural');
        const facialStyle = getFacialStyleProfile(config);
        const headwear = normalizeId(config.styling?.headwear || config.headwear, 'none');
        const isModestHeadwear = MODEST_HEADWEAR.has(headwear);
        const isNiqab = headwear === 'niqab';
        const showGlasses = hasAccessory(config, 'glasses') && !isNiqab;
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const ageGroup = normalizeId(config.identity?.ageGroup || config.ageGroup, 'adult');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const facialHair = normalizeId(config.identity?.facialHair || config.facialHair, 'none');
        const showFacialHair = presentation === 'male' && facialHair !== 'none' && !isNiqab;
        const assetId = normalizeId(config.assetCharacterId || config.assetId, '');
        const isMaleLecturerAsset = assetId === 'male-lecturer-front';
        const isFemaleDoctorAsset = assetId === 'female-doctor-front';
        const isMaleDoctorAsset = assetId === 'male-doctor-front';
        const isFemaleStudentAsset = assetId === 'female-student-front';
        const isMaleStudentAsset = assetId === 'male-student-front';
        const presentationProfile = getPresentationVisualProfile(presentation);
        const blink = clamp(state.blink, 0, 1);
        const mouthOpen = clamp(state.mouthOpen, 0, 1);
        const mouthWide = clamp(state.mouthWide, -1, 1);
        const mouthRound = clamp(state.mouthRound, 0, 1);
        const lipPress = clamp(state.lipPress, 0, 1);
        const jawOpen = clamp(state.jawOpen, 0, 1);
        const mouthOpeningGain = clamp(state.mouthOpeningGain ?? 1, 0.75, 3.2);
        const upperLipLift = clamp(state.upperLipLift, -1, 1);
        const lowerLipDrop = clamp(state.lowerLipDrop, -1, 1);
        const speechMouthOpen = clamp(mouthOpen + jawOpen * 0.42 - lipPress * 0.22, 0, 1);
        const smile = clamp(state.smile, -1, 1);
        const browRaise = clamp(state.browRaise, -6, 6);
        // A 3/4 head should look into its facing direction. Facial gaze remains
        // additive so expression and timeline animation can still look around.
        const gazeX = clamp(state.gazeX + viewGazeBaseline, -8, 8);
        const gazeY = clamp(state.gazeY, -5, 5);
        const headNod = clamp(state.headNod, -8, 8);
        const headTilt = clamp(state.headTilt, -8, 8);
        const headWidth = getHeadWidthAdjustment(adjustments);
        const headHeight = getHeadHeightAdjustment(adjustments);
        const faceWidth = getAdjustmentValue(adjustments, 'faceWidth');
        const neckWidth = getNeckWidthAdjustment(adjustments);
        const neckHeight = getNeckHeightAdjustment(adjustments);
        // Amplify face-shape width/height so silhouettes actually differ; features reproject to match.
        const faceRx = clamp((Number(faceShape.rx) || 34) + 1.5 + (faceProfile.faceWidth || 0) * 5 + (presentationProfile.faceWidth || 0) + (headProfile.frontWidth || 0) + headWidth * 11 + faceWidth * 12, 28, 45);
        const faceRy = clamp((Number(faceShape.ry) || 42) + (faceProfile.faceHeight || 0) * 5 + (presentationProfile.faceHeight || 0) + (headProfile.frontHeight || 0) + headHeight * 9, 35, 50);
        // Neutral basis (oval, no manual width/height adjustments): a default face reads at scale 1.0 so features + hair scale together with the outline.
        const neutralFaceRx = clamp((Number(faceShape.rx) || 34) + 1.5 + (presentationProfile.faceWidth || 0) + (headProfile.frontWidth || 0), 28, 45);
        const neutralFaceRy = clamp((Number(faceShape.ry) || 42) + (presentationProfile.faceHeight || 0) + (headProfile.frontHeight || 0), 35, 50);
        const featureScaleX = clamp(faceRx / neutralFaceRx, 0.85, 1.22);
        const featureScaleY = clamp(faceRy / neutralFaceRy, 0.85, 1.18);
        const faceLeft = 49 - faceRx;
        const faceRight = 49 + faceRx;
        const faceTop = 61 - faceRy;
        const faceBottom = 61 + faceRy;
        const foreheadScale = clamp((faceProfile.foreheadScale ?? 0.84) + (presentationProfile.foreheadScale || 0) + getAdjustmentValue(adjustments, 'foreheadProjection') * 0.16, 0.68, 1.16);
        const cheekScale = clamp((faceProfile.cheekScale ?? 0.92) + (presentationProfile.cheekScale || 0), 0.76, 1.08);
        const jawScale = clamp((faceProfile.jawScale ?? 0.64) + (presentationProfile.jawScale || 0), 0.46, 0.92);
        const chinScale = clamp((faceProfile.chinScale ?? 0.28) + (presentationProfile.chinScale || 0), 0.16, 0.52);
        const chinDrop = (faceProfile.chinDrop || 0) + (presentationProfile.chinDrop || 0);
        const foreheadLeft = 49 - faceRx * foreheadScale;
        const foreheadRight = 49 + faceRx * foreheadScale;
        const crownLeft = 49 - faceRx * Math.min(0.58, foreheadScale * 0.70);
        const crownRight = 49 + faceRx * Math.min(0.58, foreheadScale * 0.70);
        const cheekLeft = 49 - faceRx * cheekScale;
        const cheekRight = 49 + faceRx * cheekScale;
        const jawLeft = 49 - faceRx * jawScale;
        const jawRight = 49 + faceRx * jawScale;
        const chinLeft = 49 - faceRx * chinScale;
        const chinRight = 49 + faceRx * chinScale;
        const chinYValue = clamp(faceBottom + 1 + chinDrop, 96, 108);
        const eyeScale = 1 + getAdjustmentValue(adjustments, 'eyeSize');
        const eyeSpacingAdjust = getAdjustmentValue(adjustments, 'eyeSpacing');
        const eyeHeightShift = getAdjustmentValue(adjustments, 'eyeHeight') * -6;
        const browHeightAdjust = getAdjustmentValue(adjustments, 'browHeight');
        const browLengthAdjust = getAdjustmentValue(adjustments, 'browLength');
        const browLift = browRaise + browHeightAdjust * 11 + (presentationProfile.browHeight || 0);
        const browHalf = 8 * (1 + browLengthAdjust * 0.62);
        const browOuterHalf = browHalf;
        const browInnerHalf = browHalf * 0.44;
        const assetBrowNudge = (isMaleLecturerAsset || isMaleDoctorAsset || isMaleStudentAsset) ? 0.14 : (isFemaleDoctorAsset ? -0.12 : 0);
        const browStrokeBase = clamp(2.6 + (presentationProfile.browStroke || 0) + assetBrowNudge, 1.9, 3.35);
        const browStroke = Math.max(1.4, browStrokeBase * (1 + browLengthAdjust * 0.24));
        const browLeftCx = 49 - 12 * featureScaleX;
        const browRightCx = 49 + 13 * featureScaleX;
        const browTopY = 61 - 3 * featureScaleY;
        const browPeakY = 61 - 6 * featureScaleY;
        const browLeftPath = `M${(browLeftCx - browOuterHalf).toFixed(1)} ${(browTopY - browLift).toFixed(1)} C${(browLeftCx - browInnerHalf).toFixed(1)} ${(browPeakY - browLift * 1.1).toFixed(1)} ${(browLeftCx + browInnerHalf).toFixed(1)} ${(browPeakY - browLift).toFixed(1)} ${(browLeftCx + browOuterHalf).toFixed(1)} ${(browTopY - browLift * 0.7).toFixed(1)}`;
        const browRightPath = `M${(browRightCx - browOuterHalf).toFixed(1)} ${(browTopY - browLift * 0.7).toFixed(1)} C${(browRightCx - browInnerHalf).toFixed(1)} ${(browPeakY - browLift).toFixed(1)} ${(browRightCx + browInnerHalf).toFixed(1)} ${(browPeakY - browLift * 1.1).toFixed(1)} ${(browRightCx + browOuterHalf).toFixed(1)} ${(browTopY - browLift).toFixed(1)}`;
        const eyeHeight = Math.max(0.7, facialStyle.eyes.halfHeight * eyeScale * (1 - blink * 0.82));
        const eyeWidth = facialStyle.eyes.halfWidth * eyeScale;
        const eyeCy = 61 + 5 * featureScaleY + eyeHeightShift;
        const eyeSpread = (11.6 + facialStyle.eyes.spacing + eyeSpacingAdjust * 5) * featureScaleX;
        const leftEyeCx = 50 - eyeSpread;
        const rightEyeCx = 50 + eyeSpread;
        const eyePath = (cx) => `M${(cx - eyeWidth).toFixed(1)} ${eyeCy.toFixed(1)} C${(cx - eyeWidth * 0.35).toFixed(1)} ${(eyeCy - eyeHeight).toFixed(1)} ${(cx + eyeWidth * 0.35).toFixed(1)} ${(eyeCy - eyeHeight).toFixed(1)} ${(cx + eyeWidth).toFixed(1)} ${eyeCy.toFixed(1)} C${(cx + eyeWidth * 0.35).toFixed(1)} ${(eyeCy + eyeHeight).toFixed(1)} ${(cx - eyeWidth * 0.35).toFixed(1)} ${(eyeCy + eyeHeight).toFixed(1)} ${(cx - eyeWidth).toFixed(1)} ${eyeCy.toFixed(1)} Z`;
        const pupilY = eyeCy + gazeY * 0.18;
        const pupilDx = gazeX * 0.23;
        const noseW = facialStyle.nose.halfWidth * (1 + getAdjustmentValue(adjustments, 'noseWidth') * 1.35 + (presentationProfile.noseWidth || 0));
        const noseLength = getAdjustmentValue(adjustments, 'noseLength') + (presentationProfile.noseLength || 0);
        const noseTopY = 61 + 6 * featureScaleY - Math.max(0, noseLength) * 1.5 + Math.min(0, noseLength) * 1.2;
        const noseMidY = 61 + 13 * featureScaleY + noseLength * 1.8;
        const noseTipY = 61 + 23 * featureScaleY + noseLength * 5.2;
        const lipStyleFullness = facialStyle.lips.fullness;
        const lipStyleWidth = facialStyle.lips.width;
        const lipStyleTint = facialStyle.lips.upperColor;
        const lipStyleLowerTint = facialStyle.lips.lowerColor;
        const lipFull = lipStyleFullness * (1 + getAdjustmentValue(adjustments, 'lipFullness') * 1.18 + (presentationProfile.lipFullness || 0));
        const lipHeightShift = getAdjustmentValue(adjustments, 'lipHeight') * -6;
        const mouthY = 61 + 30 * featureScaleY + lipHeightShift;
        const speechWidthScale = clamp(1 + mouthWide * 0.22 - mouthRound * 0.34 - lipPress * 0.06, 0.56, 1.28);
        const mouthHalfWidth = 14.2 * lipStyleWidth * (1 + getAdjustmentValue(adjustments, 'lipWidth') * 0.55 + (presentationProfile.lipWidth || 0));
        const mouthCornerHalfWidth = mouthHalfWidth * clamp(1 + mouthWide * 0.1 - mouthRound * 0.24 - lipPress * 0.02, 0.7, 1.14);
        const mouthControlHalfWidth = mouthHalfWidth * speechWidthScale;
        const mouthLeft = (50 - mouthCornerHalfWidth).toFixed(1);
        const mouthRight = (50 + mouthCornerHalfWidth).toFixed(1);
        const mouthInnerHalfWidth = mouthHalfWidth * clamp(0.78 * speechWidthScale, 0.44, 0.9);
        const mouthInnerLeft = (50 - mouthInnerHalfWidth).toFixed(1);
        const mouthInnerRight = (50 + mouthInnerHalfWidth).toFixed(1);
        const mouthCurve = 2 + smile * 4;
        const upperTravel = (speechMouthOpen * 0.38 + upperLipLift * 0.92 + mouthRound * 0.08 - lipPress * 0.1) * mouthOpeningGain;
        const lowerTravel = (speechMouthOpen * 0.94 + jawOpen * 0.5 + lowerLipDrop * 0.68 - lipPress * 0.13) * mouthOpeningGain;
        const mouthDepth = Math.max(0.7, (2.8 + speechMouthOpen * 5.8 * mouthOpeningGain + mouthRound * 0.85) * lipFull * (1 - lipPress * 0.55));
        const openVisibility = clamp((speechMouthOpen - 0.025) * 4.4, 0, 1);
        const cavityOpacity = clamp((speechMouthOpen - 0.015) * 1.18, 0, 0.98) * (1 - lipPress * 0.72);
        const teethCue = Math.max(0, mouthWide) * 0.45 + Math.max(0, upperLipLift) * 2
            + lipPress * 0.9 * openVisibility;
        const teethOpacity = clamp(teethCue * (0.32 + openVisibility * 0.68) * (1 - jawOpen * 0.72) * (1 - mouthRound * 0.85), 0, 0.9);
        const tongueOpacity = clamp((speechMouthOpen - 0.1) * 1.65 * Math.pow(Math.max(0, 1 - jawOpen * 0.92), 1.4)
            * (1 - Math.abs(mouthWide) * 0.72) * (1 - mouthRound * 0.88)
            * (1 - Math.max(0, lowerLipDrop) * 0.58), 0, 0.36);
        const upperY = mouthY - upperTravel;
        const lowerY = mouthY + lowerTravel;
        const mouthCornerY = mouthY;
        const mouthUpperPath = `M${mouthLeft} ${mouthCornerY.toFixed(1)} C${(50 - mouthControlHalfWidth * 0.54).toFixed(1)} ${(upperY - 1.7 + smile).toFixed(1)} ${(50 + mouthControlHalfWidth * 0.46).toFixed(1)} ${(upperY - 1.7 + smile).toFixed(1)} ${mouthRight} ${mouthCornerY.toFixed(1)} C${(50 + mouthControlHalfWidth * 0.54).toFixed(1)} ${(mouthY + 2.0 + speechMouthOpen * 0.24).toFixed(1)} ${(50 - mouthControlHalfWidth * 0.54).toFixed(1)} ${(mouthY + 2.0 + speechMouthOpen * 0.24).toFixed(1)} ${mouthLeft} ${mouthCornerY.toFixed(1)} Z`;
        const mouthLowerPath = `M${mouthLeft} ${mouthCornerY.toFixed(1)} C${(50 - mouthControlHalfWidth * 0.46).toFixed(1)} ${(lowerY + mouthCurve + mouthDepth * 0.2).toFixed(1)} ${(50 + mouthControlHalfWidth * 0.46).toFixed(1)} ${(lowerY + mouthCurve + mouthDepth * 0.2).toFixed(1)} ${mouthRight} ${mouthCornerY.toFixed(1)} C${(50 + mouthControlHalfWidth * 0.62).toFixed(1)} ${(lowerY + mouthDepth * 0.58).toFixed(1)} ${(50 - mouthControlHalfWidth * 0.54).toFixed(1)} ${(lowerY + mouthDepth * 0.58).toFixed(1)} ${mouthLeft} ${mouthCornerY.toFixed(1)} Z`;
        const mouthInnerPath = `M${mouthInnerLeft} ${(mouthY + 0.2).toFixed(1)} C${(50 - mouthControlHalfWidth * 0.31).toFixed(1)} ${(upperY + 1.0).toFixed(1)} ${(50 + mouthControlHalfWidth * 0.38).toFixed(1)} ${(upperY + 1.0).toFixed(1)} ${mouthInnerRight} ${(mouthY + 0.2).toFixed(1)} C${(50 + mouthControlHalfWidth * 0.46).toFixed(1)} ${(lowerY + 2.0).toFixed(1)} ${(50 - mouthControlHalfWidth * 0.46).toFixed(1)} ${(lowerY + 2.0).toFixed(1)} ${mouthInnerLeft} ${(mouthY + 0.2).toFixed(1)} Z`;
        const headTransform = `translate(0 ${(-headNod * 0.22).toFixed(2)}) rotate(${(headTilt * 0.45).toFixed(2)} 49 74)`;
        const neckDelta = neckHeight * 14;
        const neckJoinYValue = clamp(faceBottom - 4, 96, 104);
        const neckShoulderY = 118 + neckDelta * 0.45;
        const neckBottomValue = clamp(134 + neckDelta, 130, 140);
        const neckTopLeftValue = 37.5 - neckWidth * 4.2;
        const neckTopRightValue = 60.5 + neckWidth * 4.2;
        const neckBaseLeftValue = 33.5 - neckWidth * 5.2;
        const neckBaseRightValue = 67.5 + neckWidth * 5.2;
        const neckJoinY = neckJoinYValue.toFixed(1);
        const neckTopLeft = neckTopLeftValue.toFixed(1);
        const neckTopRight = neckTopRightValue.toFixed(1);
        const neckBaseLeft = neckBaseLeftValue.toFixed(1);
        const neckBaseRight = neckBaseRightValue.toFixed(1);
        const neckMid = neckShoulderY.toFixed(1);
        const neckBottom = neckBottomValue.toFixed(1);
        const neckFootY = Math.min(145, neckBottomValue + 5).toFixed(1);
        const chinY = chinYValue.toFixed(1);
        const faceNeckPath = `M${foreheadLeft.toFixed(1)} 58 C${foreheadLeft.toFixed(1)} ${(faceTop + 12).toFixed(1)} ${crownLeft.toFixed(1)} ${faceTop.toFixed(1)} 49 ${faceTop.toFixed(1)} C${crownRight.toFixed(1)} ${faceTop.toFixed(1)} ${foreheadRight.toFixed(1)} ${(faceTop + 12).toFixed(1)} ${foreheadRight.toFixed(1)} 58 C${faceRight.toFixed(1)} 75 ${cheekRight.toFixed(1)} 88 ${jawRight.toFixed(1)} ${(chinYValue - 7).toFixed(1)} C${chinRight.toFixed(1)} ${(chinYValue - 1).toFixed(1)} ${(57 + neckWidth * 1.4).toFixed(1)} ${(neckJoinYValue + 1).toFixed(1)} ${neckTopRight} ${neckJoinY} C${(62 + neckWidth * 1.6).toFixed(1)} ${(neckJoinYValue + 9).toFixed(1)} ${(62 + neckWidth * 2.2).toFixed(1)} ${(neckShoulderY - 2).toFixed(1)} ${neckBaseRight} ${neckBottom} L${neckBaseRight} ${neckFootY} C58.5 ${(Number(neckFootY) + 1).toFixed(1)} 42 ${(Number(neckFootY) + 1).toFixed(1)} ${neckBaseLeft} ${neckFootY} L${neckBaseLeft} ${neckBottom} C${(36 - neckWidth * 2.2).toFixed(1)} ${(neckShoulderY - 2).toFixed(1)} ${(36 - neckWidth * 1.6).toFixed(1)} ${(neckJoinYValue + 9).toFixed(1)} ${neckTopLeft} ${neckJoinY} C${(41 - neckWidth * 1.4).toFixed(1)} ${(neckJoinYValue + 1).toFixed(1)} ${chinLeft.toFixed(1)} ${(chinYValue - 1).toFixed(1)} ${jawLeft.toFixed(1)} ${(chinYValue - 7).toFixed(1)} C${cheekLeft.toFixed(1)} 88 ${faceLeft.toFixed(1)} 75 ${foreheadLeft.toFixed(1)} 58 Z`;
        const jawPath = `M${jawLeft.toFixed(1)} ${(chinYValue - 9).toFixed(1)} C${(42 - chinScale * 2).toFixed(1)} ${(chinYValue - 1).toFixed(1)} ${(56 + chinScale * 2).toFixed(1)} ${(chinYValue - 1).toFixed(1)} ${jawRight.toFixed(1)} ${(chinYValue - 9).toFixed(1)}`;
        const femaleFaceCueRole = isFemaleStudentAsset
            ? 'female-face-cue student soft-cheek youthful'
            : 'female-face-cue soft-cheek';
        const presentationCueMarkup = presentation === 'male'
            ? ''
            : presentation === 'nonbinary'
                ? `<path id="presentation-neutral-cheek-plane" data-svg-african-role="presentation-nonbinary androgynous-face-cue balanced-cheek" d="M${cheekLeft.toFixed(1)} 82 C36 91 43 95 49 95 C56 95 63 91 ${cheekRight.toFixed(1)} 82" fill="none" stroke="var(--skin-light)" stroke-width="0.9" opacity=".08" stroke-linecap="round"/>`
                : `<path id="presentation-female-cheek-cue" data-svg-african-role="${femaleFaceCueRole}" d="M${(cheekLeft + 4).toFixed(1)} 82 C34 88 40 91 46 92 M${(cheekRight - 4).toFixed(1)} 82 C65 88 59 91 53 92" fill="none" stroke="var(--skin-light)" stroke-width="${isFemaleDoctorAsset ? '1.0' : '0.9'}" opacity=".08" stroke-linecap="round"/>`;
        // Lenses centered on the reprojected eyes so they track eye spread/height.
        const lensW = (eyeWidth * 2 + 4).toFixed(1);
        const lensH = (13 * featureScaleY).toFixed(1);
        const lensY = (eyeCy - 6.5 * featureScaleY).toFixed(1);
        const glassesMarkup = showGlasses
            ? `<g id="glasses" data-svg-african-role="accessory glasses">
        <rect x="${(leftEyeCx - eyeWidth - 2).toFixed(1)}" y="${lensY}" width="${lensW}" height="${lensH}" rx="5" fill="none" stroke="var(--glass)" stroke-width="2"/>
        <rect x="${(rightEyeCx - eyeWidth - 2).toFixed(1)}" y="${lensY}" width="${lensW}" height="${lensH}" rx="5" fill="none" stroke="var(--glass)" stroke-width="2"/>
        <path d="M${(leftEyeCx + eyeWidth + 2).toFixed(1)} ${eyeCy.toFixed(1)} L${(rightEyeCx - eyeWidth - 2).toFixed(1)} ${eyeCy.toFixed(1)}" stroke="var(--glass)" stroke-width="2" stroke-linecap="round"/>
    </g>`
            : '';
        const beardOpacity = facialHair === 'short-beard' ? '.055' : '.22';
        const sideburnMarkup = showFacialHair && facialHair !== 'moustache'
            ? ''
            : '';
        // Follow the reprojected mouth vertically and the face width horizontally (no Y-scale keeps the beard off the neck).
        const facialHairTransform = `translate(50 ${mouthY.toFixed(1)}) scale(${featureScaleX.toFixed(3)} 1) translate(-50 -91)`;
        const facialHairMarkup = showFacialHair
            ? `<g id="facial-hair" data-svg-african-role="facial-hair ${facialHair}" transform="${facialHairTransform}">
        ${sideburnMarkup}
        <path id="moustache" d="M39 86 C43 83 47 84 50 87 C53 84 58 83 62 86 C57 90 53 90 50 88 C47 90 43 90 39 86 Z" fill="var(--hair)" opacity=".86"/>
        ${facialHair === 'moustache' ? '' : `<path id="beard-shadow" d="M36 96 C42 105 58 106 64 96 C62 110 39 110 36 96 Z" fill="var(--hair)" opacity="${beardOpacity}"/>`}
        ${facialHair === 'short-beard' ? '' : ''}
        ${facialHair === 'goatee' ? '<path id="goatee" d="M46 97 C49 106 54 106 57 97 C54 100 49 100 46 97 Z" fill="var(--hair)" opacity=".78"/>' : ''}
    </g>`
            : '';
        const earringMarkup = !isModestHeadwear && hasAccessory(config, 'earrings')
            ? `<g id="earrings" data-svg-african-role="accessory earrings traditional-jewelry" transform="translate(49 61) scale(${featureScaleX.toFixed(3)} ${featureScaleY.toFixed(3)}) translate(-49 -61)" fill="var(--accent)" stroke="var(--skirt)" stroke-width="0.8">
        <circle cx="17" cy="82" r="2.5"/>
        <circle cx="81" cy="82" r="2.5"/>
        <path d="M17 85 C15 91 18 97 22 100" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
        <path d="M81 85 C83 91 80 97 76 100" fill="none" stroke="var(--accent)" stroke-width="1.5" stroke-linecap="round"/>
    </g>`
            : '';
        const earMarkup = isModestHeadwear
            ? ''
            : `<g data-svg-african-role="ears" transform="translate(49 61) scale(${featureScaleX.toFixed(3)} ${featureScaleY.toFixed(3)}) translate(-49 -61)"><path id="ear-left" d="M15 61 C7 61 6 78 14 83 C20 83 23 76 22 67 C21 63 19 61 15 61 Z" fill="var(--skin)"/>
    <path id="ear-right" d="M80 61 C88 61 89 78 81 83 C75 83 72 76 73 67 C74 63 76 61 80 61 Z" fill="var(--skin)"/>
    <path id="ear-left-inner" d="M15 66 C18 69 18 75 15 78" fill="none" stroke="var(--skin-shade)" stroke-width="1.25" opacity=".45" stroke-linecap="round"/>
    <path id="ear-right-inner" d="M80 66 C77 69 77 75 80 78" fill="none" stroke="var(--skin-shade)" stroke-width="1.25" opacity=".45" stroke-linecap="round"/></g>`;
        const faceGuideMarkup = presentation === 'male'
            ? ''
            : `<path id="jaw" data-svg-african-role="jaw-line face-shape-${faceShape.id}" d="${jawPath}" fill="none" stroke="var(--skin-shade)" stroke-width="0.65" opacity=".028" stroke-linecap="round"/>
        <g transform="translate(49 61) scale(${featureScaleX.toFixed(3)} ${featureScaleY.toFixed(3)}) translate(-49 -61)"><path id="cheek-left" d="M28 86 C33 91 39 94 45 95" fill="none" stroke="var(--skin-shade)" stroke-width="0.65" opacity=".026" stroke-linecap="round"/>
        <path id="cheek-right" d="M71 86 C65 91 59 94 53 95" fill="none" stroke="var(--skin-shade)" stroke-width="0.65" opacity=".026" stroke-linecap="round"/></g>`;
const body = `
<g ${styleVars(p)} data-svg-african-role="head-neck premium-part presentation-${presentation} age-${ageGroup} body-${bodyType} height-${heightType} head-type-${headType} face-shape-${faceShape.id} eyes-${eyeStyle} nose-${noseStyle} lips-${lipStyle}">
    <g id="head-motion" data-svg-african-role="head-motion hair-face-glasses" transform="${headTransform}">
    ${renderHair(config, p, adjustments, { x: featureScaleX, y: featureScaleY })}
    ${earMarkup}
    <g id="face-rig" data-svg-african-role="face-rig">
    <g id="face-base" data-svg-african-role="face-base">
    <path id="face-neck" data-svg-african-role="face skin neck neck-anchor collar-overlap smooth-neck-margin single-piece-neck" d="${faceNeckPath}" fill="url(#skinGrad)" filter="url(#softShadow)"/>
    ${faceGuideMarkup}
    ${presentationCueMarkup}
    </g>
    ${renderHairline(config, p, adjustments, { x: featureScaleX, y: featureScaleY })}
    ${renderHairFront(config, p, adjustments, { x: featureScaleX, y: featureScaleY })}
    ${renderRegionalHeadwearFrontOverlay(headwear, adjustments)}
    ${renderGeneralHeadwearFrontOverlay(headwear, adjustments)}
    ${renderTraditionalHeadwearFrontOverlay(headwear, adjustments)}
    <g id="features" data-svg-african-role="face features" data-svg-african-view-gaze="${viewGazeBaseline.toFixed(1)}">
        <path id="brow-left" d="${browLeftPath}" fill="none" stroke="var(--ink)" stroke-width="${browStroke.toFixed(2)}" stroke-linecap="round"/>
        <path id="brow-right" d="${browRightPath}" fill="none" stroke="var(--ink)" stroke-width="${browStroke.toFixed(2)}" stroke-linecap="round"/>
        <path id="eye-left" data-svg-african-role="eye-left eye-white" d="${eyePath(leftEyeCx)}" fill="#ffffff"/>
        <path id="eye-right" data-svg-african-role="eye-right eye-white" d="${eyePath(rightEyeCx)}" fill="#ffffff"/>
        <path id="eyelid-left" d="M${(leftEyeCx - eyeWidth).toFixed(1)} ${(eyeCy - 0.3).toFixed(1)} C${(leftEyeCx - 2.5).toFixed(1)} ${(eyeCy - eyeHeight - 1.2).toFixed(1)} ${(leftEyeCx + 3.2).toFixed(1)} ${(eyeCy - eyeHeight - 1).toFixed(1)} ${(leftEyeCx + eyeWidth).toFixed(1)} ${(eyeCy - 0.2).toFixed(1)}" fill="none" stroke="var(--ink)" stroke-width="0.9" opacity=".45" stroke-linecap="round"/>
        <path id="eyelid-right" d="M${(rightEyeCx - eyeWidth).toFixed(1)} ${(eyeCy - 0.2).toFixed(1)} C${(rightEyeCx - 3.2).toFixed(1)} ${(eyeCy - eyeHeight - 1).toFixed(1)} ${(rightEyeCx + 2.5).toFixed(1)} ${(eyeCy - eyeHeight - 1.2).toFixed(1)} ${(rightEyeCx + eyeWidth).toFixed(1)} ${(eyeCy - 0.3).toFixed(1)}" fill="none" stroke="var(--ink)" stroke-width="0.9" opacity=".45" stroke-linecap="round"/>
        <ellipse id="pupil-left" data-svg-african-role="pupil-left pupil" cx="${(leftEyeCx + pupilDx).toFixed(1)}" cy="${pupilY.toFixed(1)}" rx="${(2.4 * eyeScale).toFixed(1)}" ry="${(Math.max(0.5, 2.4 * eyeScale * (1 - blink * 0.75))).toFixed(1)}" fill="var(--ink)"/>
        <ellipse id="pupil-right" data-svg-african-role="pupil-right pupil" cx="${(rightEyeCx + pupilDx).toFixed(1)}" cy="${pupilY.toFixed(1)}" rx="${(2.4 * eyeScale).toFixed(1)}" ry="${(Math.max(0.5, 2.4 * eyeScale * (1 - blink * 0.75))).toFixed(1)}" fill="var(--ink)"/>
        <circle id="eye-highlight-left" cx="${(leftEyeCx + pupilDx + 0.8).toFixed(1)}" cy="${(pupilY - 0.9).toFixed(1)}" r="0.6" fill="#ffffff" opacity=".75"/>
        <circle id="eye-highlight-right" cx="${(rightEyeCx + pupilDx + 0.8).toFixed(1)}" cy="${(pupilY - 0.9).toFixed(1)}" r="0.6" fill="#ffffff" opacity=".75"/>
        <path id="nose" data-svg-african-role="nose" d="M49 ${noseTopY.toFixed(1)} C47.5 ${noseMidY.toFixed(1)} ${(49 - noseW).toFixed(1)} ${(noseTipY - 5).toFixed(1)} ${(49 - noseW * 0.55).toFixed(1)} ${noseTipY.toFixed(1)} C49 ${(noseTipY + 2).toFixed(1)} ${(51 + noseW * 0.55).toFixed(1)} ${(noseTipY + 2).toFixed(1)} ${(51 + noseW).toFixed(1)} ${noseTipY.toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width="2" stroke-linecap="round"/>
        <path id="nose-bridge-highlight" d="M53 ${(noseTopY + 2).toFixed(1)} C55 ${(noseMidY + 0.5).toFixed(1)} 55 ${(noseTipY - 4).toFixed(1)} 53 ${noseTipY.toFixed(1)}" fill="none" stroke="var(--skin-light)" stroke-width="1" opacity=".25" stroke-linecap="round"/>
        <g id="mouth" data-svg-african-role="mouth">
            <path id="mouth-opening" data-svg-african-role="mouth-opening oral-cavity" d="${mouthInnerPath}" fill="#351014" opacity="${cavityOpacity.toFixed(2)}"/>
            <path id="mouth-teeth" data-svg-african-role="mouth-teeth teeth" d="M${mouthInnerLeft} ${(mouthY + 1.9).toFixed(1)} Q50 ${(mouthY + 3.0 - upperTravel * 0.45).toFixed(1)} ${mouthInnerRight} ${(mouthY + 1.9).toFixed(1)} Q50 ${(mouthY + 4.2).toFixed(1)} ${mouthInnerLeft} ${(mouthY + 1.9).toFixed(1)} Z" fill="#fffaf2" opacity="${teethOpacity.toFixed(2)}"/>
            <ellipse id="mouth-tongue" data-svg-african-role="mouth-tongue tongue" cx="50" cy="${(lowerY + 1.1).toFixed(1)}" rx="${Math.max(1.8, mouthHalfWidth * 0.34).toFixed(1)}" ry="${Math.max(0.6, mouthDepth * 0.16).toFixed(1)}" fill="#c96f72" opacity="${tongueOpacity.toFixed(2)}"/>
            <path id="mouth-upper" data-svg-african-role="mouth-upper upper-lip" data-svg-african-lip-style="${lipStyle}" d="${mouthUpperPath}" fill="${lipStyleTint}"/>
            <path id="mouth-lower" data-svg-african-role="mouth-lower lower-lip" data-svg-african-lip-style="${lipStyle}" d="${mouthLowerPath}" fill="${lipStyleLowerTint}" opacity=".92"/>
            <path id="mouth-highlight" data-svg-african-role="lip-highlight" d="M${mouthInnerLeft} ${mouthCornerY.toFixed(1)} C${(50 - mouthHalfWidth * 0.23).toFixed(1)} ${(mouthY + Math.max(1, smile * 3) - upperTravel * 0.35).toFixed(1)} ${(50 + mouthHalfWidth * 0.38).toFixed(1)} ${(mouthY + Math.max(1, smile * 3) - upperTravel * 0.35).toFixed(1)} ${mouthInnerRight} ${mouthCornerY.toFixed(1)}" fill="none" stroke="#f2a7a0" stroke-width="1.2" opacity="${clamp(0.58 * Math.max(0, 1 - speechMouthOpen * 2.2) * Math.max(0, 1 - mouthRound * 1.45), 0, 0.58).toFixed(2)}"/>
        </g>
        ${facialHairMarkup}
        ${earringMarkup}
    </g>
    ${renderModestHeadwearFrontOverlay(config, adjustments)}
    </g>
    ${glassesMarkup}
    </g>
</g>`;
        return svgShell('head-neck', 94, 146, body, p);
    }

    function renderOccupationGarment(top, options = {}) {
        if (!['field-shirt', 'bib-overalls', 'mechanic-coveralls', 'trade-apron', 'vendor-apron', 'fishing-vest', 'driver-uniform', 'clerical-shirt'].includes(top)) return '';
        const back = options.back === true;
        const side = options.side === true;
        const hem = Number.isFinite(options.hem) ? options.hem : 211;
        const waist = Number.isFinite(options.waist) ? options.waist : 143;
        const apron = /apron/.test(top);
        const bib = top === 'bib-overalls';
        const vest = top === 'fishing-vest';
        const left = side ? 51 : 38, right = side ? 101 : 98;
        const mid = side ? 86 : 68;
        let detail = '';
        if (back) {
            if (bib || apron) detail = `<path d="M43 40 L92 ${waist} M93 40 L44 ${waist}" stroke="var(--cloth-shade)" stroke-width="8" fill="none"/><path d="M30 ${waist} Q68 ${waist + 9} 106 ${waist}" fill="none" stroke="var(--accent)" stroke-width="4"/>`;
            else detail = '<path d="M29 64 Q68 73 107 64" fill="none" stroke="var(--cloth-shade)" stroke-width="2"/>';
        } else if (bib || apron) {
            detail = `<path d="M${left + 5} 42 L${left + 5} 79 M${right - 5} 42 L${right - 5} 79" stroke="var(--cloth-shade)" stroke-width="7"/><path d="M${left} 70 H${right} L${right - 1} 109 Q${right + 4} 127 ${right + 9} ${waist} L${right + 12} ${hem} Q${mid} ${hem + 5} ${left - 12} ${hem} L${left - 9} ${waist} Q${left - 4} 127 ${left + 1} 109Z" fill="var(--cloth-shade)"/><path d="M${left + 9} 90 H${right - 9} V112 Q${mid} 118 ${left + 9} 112Z" fill="var(--cloth)" stroke="var(--accent)" stroke-width="1"/><path d="M${left - 4} ${waist + 15} H${right + 4} V${Math.min(hem - 8, waist + 42)} H${left - 4}Z" fill="var(--cloth)"/><path d="M${mid} ${waist + 15} V${Math.min(hem - 8, waist + 42)}" stroke="var(--cloth-shade)" stroke-width="1.5"/>`;
        } else if (vest) {
            detail = `<path d="M${left - 10} 44 L${left + 12} 40 L${mid - 3} 81 V${waist + 12} H${left - 12}Z M${right - 12} 40 L${right + 10} 44 L${right + 12} ${waist + 12} H${mid + 4} V81Z" fill="var(--cloth-shade)"/><path d="M${left - 6} 83 H${mid - 9} V104 H${left - 6}Z M${mid + 9} 83 H${right + 6} V104 H${mid + 9}Z M${left - 6} 117 H${mid - 9} V140 H${left - 6}Z M${mid + 9} 117 H${right + 6} V140 H${mid + 9}Z" fill="var(--cloth)" stroke="var(--accent)" stroke-width="1.1"/>`;
        } else {
            detail = `<path d="M${mid} 60 V${top === 'mechanic-coveralls' ? hem - 5 : waist}" stroke="var(--cloth-shade)" stroke-width="2"/><path d="M${left - 1} 81 H${left + 19} V103 Q${left + 9} 110 ${left - 1} 103Z M${right - 19} 81 H${right + 1} V103 Q${right - 9} 110 ${right - 19} 103Z" fill="var(--cloth-shade)" opacity=".55"/>`;
            if (top === 'mechanic-coveralls') detail += `<path d="M30 ${waist} H106" stroke="var(--accent)" stroke-width="3"/><path d="M${mid} 62 V${waist - 3}" stroke="var(--accent)" stroke-width="1" stroke-dasharray="2 3"/>`;
            if (top === 'clerical-shirt') detail = `<path d="M48 45 Q68 54 88 45 L85 60 Q68 65 51 60Z" fill="var(--cloth-shade)"/><rect x="${mid - 4}" y="49" width="8" height="11" fill="#f5f6f4"/>`;
        }
        return `<g data-svg-african-role="occupation-garment ${top} ${back ? 'rear' : side ? 'profile' : 'front'}" stroke-linejoin="round">${detail}</g>`;
    }

    function renderTorso(config, p, options = {}) {
        const outfit = normalizeId(config.styling?.outfit || config.outfit, 'lecturer');
        const topClothing = resolveTopClothing(config);
        const bottomClothing = resolveBottomClothing(config);
        const skirtLength = resolveSkirtLength(config);
        const profession = normalizeId(config.styling?.profession || config.profession, '');
        const culturalStyle = normalizeId(config.styling?.culturalStyle || config.culturalStyle, 'contemporary');
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const ageGroup = normalizeId(config.identity?.ageGroup || config.ageGroup, 'adult');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const neckTieType = resolveNeckTieType(config);
        const neckTieDesign = resolveNeckTieDesign(config);
        const presentationProfile = getPresentationVisualProfile(presentation);
        const styleText = `${config.assetCharacterId || ''} ${outfit} ${topClothing} ${bottomClothing} ${profession} ${culturalStyle}`;
        const isPlainBusinessSuit = outfit === 'plain-business-suit' || topClothing === 'plain-business-suit' || bottomClothing === 'plain-suit-trousers';
        const fabricDesign = resolveEffectiveFabricDesign(config, styleText);
        const isHealth = /doctor|nurse|lab-coat|scrubs|laboratory|pharmacist|community-health/.test(styleText);
        const isStudent = /student|campus|university/.test(styleText);
        const isTraditionalWrapper = presentation !== 'male' && /iro-buba|george-wrapper|wrapper/.test(styleText);
        const isDashikiTop = topClothing === 'dashiki-top';
        const isModestTop = topClothing === 'modest-top';
        const isSuspendersTop = topClothing === 'suspenders-shirt';
        const isMandarinTop = topClothing === 'mandarin-jacket';
        const isCheongsamTop = topClothing === 'cheongsam-top';
        const isKimonoTop = topClothing === 'kimono-top';
        const isFolkVestTop = topClothing === 'folk-vest';
        const isPonchoTop = topClothing === 'poncho-top';
        const isEmbroideredRobeTop = topClothing === 'embroidered-robe-top';
        const isLinenDrapeTop = topClothing === 'linen-drape-top';
        const isAcademicGownTop = topClothing === 'academic-gown-top' || outfit === 'academic-robe';
        const isAcademicGownBottom = bottomClothing === 'academic-gown-bottom';
        const isCorporateTop = /executive-suit|double-breasted-suit|three-piece-suit|pant-suit|formal-shirt-tie|lawyer-gown-top|banker-jacket|office-blouse|corporate-vest|media-blazer|business|suit|blazer|lawyer|banker|executive|corporate/.test(styleText);
        const isSportsTop = /tracksuit-top|jersey-top|gym-top|football|basketball|tracksuit|gym|athlete|sports|jersey/.test(styleText);
        const isUniformTop = /teacher-cardigan|engineer-vest|chef-coat|pilot-jacket|security-shirt|military-fatigue-top|event-top|workwear-shirt|school-shirt|chef|pilot|security|police|soldier|military|engineer|artisan|farmer|workwear|school|teacher|media-presenter|event-host|event-formal/.test(styleText);
        const hasSpecialTopDetail = isDashikiTop || isModestTop || isSuspendersTop || isMandarinTop || isCheongsamTop || isKimonoTop || isFolkVestTop || isPonchoTop || isEmbroideredRobeTop || isLinenDrapeTop || isAcademicGownTop || isCorporateTop || isSportsTop || isUniformTop;
        const isFemale = presentation === 'female';
        const isNonbinary = presentation === 'nonbinary';
        const hasSkirtOrWrapperBottom = isSkirtLikeBottom(bottomClothing);
        const isMaleStudent = isStudent && !isFemale;
        const isMaleBusiness = presentation === 'male' && /business|suit|blazer|executive|banker|lawyer|corporate|formal-shirt-tie/.test(styleText);
        const shouldShowCorporateTie = topClothing === 'formal-shirt-tie'
            || topClothing === 'corporate-vest'
            || /suit|banker|lawyer|executive|media/.test(styleText);
        const isTrouserBottom = /trouser|pants|shorts/.test(bottomClothing) || (presentation === 'male' && !isSkirtLikeBottom(bottomClothing));
        const isPleatedBottom = /pleated/.test(bottomClothing);
        const isWrapperBottom = /wrapper|iro|george/.test(bottomClothing);
        const isCheongsamBottom = bottomClothing === 'cheongsam-skirt';
        const isApronBottom = bottomClothing === 'apron-skirt';
        const isWorldRobeBottom = /academic-gown-bottom|kimono-robe-bottom|robe-bottom|linen-drape-bottom/.test(bottomClothing);
        const isFemaleDoctorAsset = config.assetCharacterId === 'female-doctor-front';
        const isMaleDoctorAsset = config.assetCharacterId === 'male-doctor-front';
        const healthRole = isMaleDoctorAsset
            ? 'male-doctor'
            : isFemaleDoctorAsset
                ? 'female-doctor'
                : /nurse|scrubs/.test(styleText)
                    ? 'nurse'
                    : /laboratory|scientist|lab-coat/.test(styleText)
                        ? 'laboratory-scientist'
                        : 'clinical';
        const lapel = isHealth ? '#f8fbff' : p.blazer;
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const presentationTorsoWidth = getAdjustmentValue(adjustments, 'torsoWidth') + (presentationProfile.torsoWidth || 0);
        const presentationShoulderWidth = getAdjustmentValue(adjustments, 'shoulderWidth') + (presentationProfile.shoulderWidth || 0);
        const presentationHipWidth = getAdjustmentValue(adjustments, 'hipWidth') + (presentationProfile.hipWidth || 0);
        const shoulderSoftness = 1 - Math.abs(presentationShoulderWidth) * 0.36;
        const chestProjection = getAdjustmentValue(adjustments, 'chestProjection');
        const breastProjection = getAdjustmentValue(adjustments, 'breastProjection');
        const backCurve = getAdjustmentValue(adjustments, 'backCurve');
        const buttockProjection = getAdjustmentValue(adjustments, 'buttockProjection');
        const torsoWide = presentationTorsoWidth * 15 + chestProjection * 4 + (isFemale ? breastProjection * 3 : 0);
        const shoulderWide = presentationShoulderWidth * 17;
        const torsoLong = getAdjustmentValue(adjustments, 'torsoLength') * 44;
        const topWearLength = getAdjustmentValue(adjustments, 'topWearLength');
        const bottomWearLength = getAdjustmentValue(adjustments, 'bottomWearLength');
        const hipShift = presentationHipWidth * 18 + buttockProjection * 4 - backCurve * 1.5;
        const abdomenProjection = getAdjustmentValue(adjustments, 'abdomenProjection');
        const abdomenWidth = getAdjustmentValue(adjustments, 'abdomenWidth');
        const abdomenGain = Math.max(0, abdomenProjection);
        const abdomenCurve = abdomenGain * (1 + abdomenGain * 0.55);
        const abdomenSlim = Math.max(0, -abdomenProjection);
        const abdomenSide = clamp(abdomenWidth * 15 + abdomenCurve * 18 - abdomenSlim * 8, -6, 32);
        const muscleDefinition = clamp(getAdjustmentValue(adjustments, 'muscleDefinition') + (presentationProfile.muscleDefinition || 0), -0.45, 0.55);
        const muscleGain = Math.max(0, muscleDefinition);
        const softnessGain = Math.max(0, -muscleDefinition);
        const isMalePresentation = presentation === 'male';
        const visibleMuscleGain = isMalePresentation ? 0 : muscleGain;
        const muscleStroke = (isMalePresentation ? 0.75 + visibleMuscleGain * 0.85 : 1.15 + muscleGain * 2.15).toFixed(2);
        const muscleOpacity = (isMalePresentation ? Math.min(0.055, visibleMuscleGain * 0.16) : 0.12 + muscleGain * 0.60).toFixed(3);
        const softOpacity = (softnessGain * 0.28).toFixed(3);
        const skirtExtra = isAcademicGownBottom
            ? 18
            : isSkirtLikeBottom(bottomClothing)
            ? ({ 'above-knee': -10, 'at-knee': 0, 'below-knee': 8, ankle: 14 }[skirtLength] || 0)
            : 0;
        const lowerGarmentLengthShift = isSkirtLikeBottom(bottomClothing) ? bottomWearLength * 48 : topWearLength * 30;
        const torsoBottom = 219 + torsoLong + skirtExtra + lowerGarmentLengthShift;
        const waistY = 137 + torsoLong * 0.35;
        const skirtTopY = waistY;
        const topHemY = clamp(waistY + topWearLength * 42, waistY - 22, waistY + 28);
        const topLengthFill = isHealth ? '#f8fbff' : (isAcademicGownTop ? '#111827' : 'var(--cloth)');
        const lowerTorsoMarkup = isPlainBusinessSuit
            ? `<path id="plain-business-suit-lower" data-svg-african-role="plain-business-suit lower-jacket solid-color-suit no-lines" d="M31 ${waistY} C50 ${waistY + 5} 86 ${waistY + 5} 105 ${waistY} L101 ${torsoBottom + 1} L35 ${torsoBottom + 1} Z" fill="var(--cloth)" opacity=".99"/>
    <path id="plain-business-suit-trouser-waist" data-svg-african-role="plain-business-suit trouser-waist solid-color-suit no-lines" d="M36 ${torsoBottom - 18} C52 ${torsoBottom - 13} 84 ${torsoBottom - 13} 100 ${torsoBottom - 18} L100 ${torsoBottom + 1} L36 ${torsoBottom + 1} Z" fill="var(--cloth)" opacity=".96"/>`
            : ((hasSkirtOrWrapperBottom && !isTrouserBottom) || isWorldRobeBottom)
            ? isCheongsamBottom
                ? `<path id="cheongsam-waist" data-svg-african-role="cheongsam waistband fitted-dress true-skirt-starts-at-waist no-center-slit" d="M38 ${waistY} C55 ${waistY + 4} 82 ${waistY + 4} 99 ${waistY} L103 ${waistY + 12} C84 ${waistY + 19} 52 ${waistY + 19} 33 ${waistY + 12} Z" fill="var(--accent)" opacity=".88"/>
    <path id="cheongsam-skirt" data-svg-african-role="cheongsam-skirt lower-torso fitted-dress no-center-slit" d="M34 ${skirtTopY + 4} C53 ${skirtTopY + 11} 84 ${skirtTopY + 11} 103 ${skirtTopY + 4} L101 ${torsoBottom + 2} C83 ${torsoBottom + 7} 53 ${torsoBottom + 7} 35 ${torsoBottom + 2} Z" fill="var(--skirt)"/>
    <path id="cheongsam-side-trim" d="M91 ${skirtTopY + 10} C95 ${skirtTopY + 45} 95 ${torsoBottom - 14} 91 ${torsoBottom + 1}" fill="none" stroke="var(--accent)" stroke-width="2.1" opacity=".72" stroke-linecap="round"/>`
            : isWorldRobeBottom
                ? isAcademicGownBottom
                    ? `<path id="academic-gown-waistband" data-svg-african-role="academic-gown academic-robe graduation-gown university-regalia waistband true-robe-starts-at-waist no-center-slit" d="M27 ${waistY} C50 ${waistY + 5} 88 ${waistY + 5} 110 ${waistY} L113 ${waistY + 15} C89 ${waistY + 23} 47 ${waistY + 23} 24 ${waistY + 15} Z" fill="var(--accent)" opacity=".88"/>
    <path id="academic-gown-bottom" data-svg-african-role="academic-gown academic-robe graduation-gown lower-torso full-length-garment no-center-slit broad-robe-panel" d="M22 ${skirtTopY + 2} C48 ${skirtTopY + 12} 89 ${skirtTopY + 12} 115 ${skirtTopY + 2} L123 ${torsoBottom + 7} C95 ${torsoBottom + 15} 41 ${torsoBottom + 15} 13 ${torsoBottom + 7} Z" fill="var(--skirt)"/>
    <path id="academic-gown-bottom-shadow" data-svg-african-role="academic-gown lower-robe-depth no-center-slit" d="M26 ${skirtTopY + 13} C38 ${skirtTopY + 37} 41 ${torsoBottom - 18} 36 ${torsoBottom + 5} M110 ${skirtTopY + 13} C99 ${skirtTopY + 38} 96 ${torsoBottom - 18} 101 ${torsoBottom + 5}" stroke="var(--cloth-shade)" stroke-width="5.2" opacity=".32" stroke-linecap="round"/>
    <path id="academic-gown-side-folds" data-svg-african-role="academic-gown-folds side-folds hood-trim no-center-slit" d="M38 ${skirtTopY + 19} C35 ${skirtTopY + 58} 33 ${torsoBottom - 7} 31 ${torsoBottom + 3} M55 ${skirtTopY + 26} C53 ${skirtTopY + 67} 52 ${torsoBottom - 9} 50 ${torsoBottom + 5} M83 ${skirtTopY + 26} C85 ${skirtTopY + 67} 86 ${torsoBottom - 9} 88 ${torsoBottom + 5} M98 ${skirtTopY + 19} C102 ${skirtTopY + 58} 105 ${torsoBottom - 7} 106 ${torsoBottom + 3}" stroke="#ffffff" stroke-width="1.15" opacity=".14" stroke-linecap="round"/>
    <path id="academic-gown-hem" data-svg-african-role="academic-gown hem gold-trim" d="M20 ${torsoBottom + 4} C47 ${torsoBottom + 14} 91 ${torsoBottom + 14} 118 ${torsoBottom + 4}" fill="none" stroke="var(--accent)" stroke-width="2.2" opacity=".78" stroke-linecap="round"/>`
                    : `<path id="robe-waistband" data-svg-african-role="robe waistband ${bottomClothing} true-robe-starts-at-waist no-center-slit" d="M29 ${waistY} C50 ${waistY + 5} 87 ${waistY + 5} 108 ${waistY} L110 ${waistY + 15} C89 ${waistY + 23} 48 ${waistY + 23} 27 ${waistY + 15} Z" fill="var(--accent)" opacity=".88"/>
    <path id="world-robe-bottom" data-svg-african-role="robe lower-torso ${bottomClothing} full-length-garment no-center-slit" d="M27 ${skirtTopY + 3} C50 ${skirtTopY + 12} 87 ${skirtTopY + 12} 110 ${skirtTopY + 3} L116 ${torsoBottom + 5} C91 ${torsoBottom + 12} 46 ${torsoBottom + 12} 21 ${torsoBottom + 5} Z" fill="var(--skirt)"/>
    <path id="robe-side-folds" data-svg-african-role="robe-folds side-folds no-center-slit" d="M40 ${skirtTopY + 20} C37 ${skirtTopY + 58} 35 ${torsoBottom - 8} 34 ${torsoBottom + 2} M96 ${skirtTopY + 20} C100 ${skirtTopY + 58} 103 ${torsoBottom - 8} 104 ${torsoBottom + 2}" stroke="#ffffff" stroke-width="1.1" opacity=".13" stroke-linecap="round"/>`
            : isApronBottom
                ? `<path id="folk-apron-waist" data-svg-african-role="folk-apron waistband true-skirt-starts-at-waist no-center-slit" d="M31 ${waistY} C50 ${waistY + 5} 87 ${waistY + 5} 106 ${waistY} L107 ${waistY + 13} C88 ${waistY + 20} 49 ${waistY + 20} 30 ${waistY + 13} Z" fill="var(--accent)" opacity=".94"/>
    <path id="folk-apron-skirt" data-svg-african-role="folk-apron apron-skirt lower-torso no-center-slit" d="M31 ${skirtTopY + 7} C51 ${skirtTopY + 13} 86 ${skirtTopY + 13} 106 ${skirtTopY + 7} L108 ${torsoBottom + 1} C87 ${torsoBottom + 7} 50 ${torsoBottom + 7} 29 ${torsoBottom + 1} Z" fill="var(--skirt)"/>
    <path id="folk-apron-front-panel" data-svg-african-role="apron-front-panel" d="M47 ${skirtTopY + 11} C58 ${skirtTopY + 15} 78 ${skirtTopY + 15} 89 ${skirtTopY + 11} L91 ${torsoBottom - 2} C77 ${torsoBottom + 2} 59 ${torsoBottom + 2} 45 ${torsoBottom - 2} Z" fill="var(--blouse)" opacity=".20"/>`
            : (isTraditionalWrapper || isWrapperBottom)
                ? `<path id="wrapper-waistband" data-svg-african-role="iro-buba waistband wrapper-waist ${bottomClothing} true-wrapper-starts-at-waist no-center-slit" d="M27 ${waistY} C49 ${waistY + 4} 88 ${waistY + 4} 110 ${waistY} L112 ${waistY + 16} C90 ${waistY + 24} 47 ${waistY + 24} 25 ${waistY + 16} Z" fill="var(--accent)" opacity=".96"/>
    <path id="iro-wrapper-skirt" data-svg-african-role="iro-buba wrapper ${bottomClothing} lower-torso traditional-skirt true-skirt-starts-at-waist no-center-slit" d="M25 ${skirtTopY} C48 ${skirtTopY + 8} 89 ${skirtTopY + 8} 112 ${skirtTopY} L119 ${torsoBottom + 4} C91 ${torsoBottom + 12} 45 ${torsoBottom + 12} 18 ${torsoBottom + 4} Z" fill="var(--skirt)"/>
    <path id="wrapper-side-drape" data-svg-african-role="iro-wrapper ${bottomClothing} side-drape side-fold-not-center" d="M93 ${skirtTopY + 10} C105 ${skirtTopY + 28} 112 ${torsoBottom - 17} 103 ${torsoBottom + 3} C96 ${torsoBottom - 21} 94 ${skirtTopY + 35} 93 ${skirtTopY + 10} Z" fill="var(--cloth-shade)" opacity=".42"/>
    ${bottomClothing === 'sari-wrapper' ? `<path id="wrapper-diagonal-sash" data-svg-african-role="sari-wrapper diagonal-sash draped-wrapper" d="M107 ${skirtTopY + 2} C83 ${skirtTopY + 36} 55 ${torsoBottom - 24} 24 ${torsoBottom + 5}" fill="none" stroke="var(--accent)" stroke-width="5.2" opacity=".76" stroke-linecap="round"/>` : ''}
    <path id="wrapper-folds" data-svg-african-role="wrapper-pleats ${bottomClothing} side-folds no-center-slit" d="M42 ${skirtTopY + 18} C39 ${skirtTopY + 54} 36 ${torsoBottom - 10} 34 ${torsoBottom + 1} M56 ${skirtTopY + 20} C54 ${skirtTopY + 58} 53 ${torsoBottom - 8} 52 ${torsoBottom + 5} M82 ${skirtTopY + 20} C84 ${skirtTopY + 58} 85 ${torsoBottom - 8} 86 ${torsoBottom + 5} M96 ${skirtTopY + 18} C99 ${skirtTopY + 54} 103 ${torsoBottom - 10} 105 ${torsoBottom + 1}" stroke="#ffffff" stroke-width="1" opacity=".12" stroke-linecap="round"/>`
                : (isStudent || isPleatedBottom)
                ? `<path id="student-waistband" data-svg-african-role="student waistband true-skirt-starts-at-waist no-center-slit" d="M33 ${waistY} C51 ${waistY + 4} 86 ${waistY + 4} 104 ${waistY} L105 ${waistY + 14} C86 ${waistY + 22} 51 ${waistY + 22} 32 ${waistY + 14} Z" fill="var(--accent)" opacity=".96"/>
    <path id="student-pleated-skirt" data-svg-african-role="student-skirt campus-pleated-skirt lower-torso true-skirt-starts-at-waist no-center-slit" d="M32 ${skirtTopY} C51 ${skirtTopY + 8} 86 ${skirtTopY + 8} 105 ${skirtTopY} L112 ${torsoBottom - 2} C91 ${torsoBottom + 5} 47 ${torsoBottom + 5} 25 ${torsoBottom - 2} Z" fill="var(--skirt)"/>
    <path id="student-skirt-side-pleats" data-svg-african-role="pleats side-folds no-center-slit" d="M44 ${skirtTopY + 18} C41 ${skirtTopY + 52} 39 ${torsoBottom - 9} 38 ${torsoBottom - 3} M57 ${skirtTopY + 20} C55 ${skirtTopY + 55} 55 ${torsoBottom - 7} 54 ${torsoBottom} M80 ${skirtTopY + 20} C82 ${skirtTopY + 55} 82 ${torsoBottom - 7} 83 ${torsoBottom} M93 ${skirtTopY + 18} C96 ${skirtTopY + 52} 98 ${torsoBottom - 9} 98 ${torsoBottom - 3}" stroke="#ffffff" stroke-width="1.1" opacity=".13" stroke-linecap="round"/>`
                : `<path id="skirt-waistband" data-svg-african-role="skirt waistband true-skirt-starts-at-waist no-center-slit" d="M34 ${waistY} C52 ${waistY + 7} 84 ${waistY + 7} 103 ${waistY} L108 ${waistY + 22} C88 ${waistY + 32} 49 ${waistY + 32} 28 ${waistY + 22} Z" fill="var(--skirt)"/>
    <path id="skirt" data-svg-african-role="skirt lower-torso true-skirt-starts-at-waist no-center-slit" d="M29 ${skirtTopY + 12} C48 ${skirtTopY + 19} 89 ${skirtTopY + 19} 107 ${skirtTopY + 12} L101 ${torsoBottom + 1} L35 ${torsoBottom + 1} Z" fill="var(--skirt)"/>
    <path id="skirt-hemline" data-svg-african-role="skirt-hemline no-center-slit" d="M35 ${torsoBottom} C51 ${torsoBottom + 4} 85 ${torsoBottom + 4} 101 ${torsoBottom}" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity=".35" stroke-linecap="round"/>`
            : `<path id="jacket-lower" data-svg-african-role="jacket lower-torso" d="M31 ${waistY} C51 ${waistY + 6} 84 ${waistY + 6} 105 ${waistY} L101 ${torsoBottom + 1} L72 ${torsoBottom + 1} L68 ${waistY + 11} L63 ${torsoBottom + 1} L35 ${torsoBottom + 1} Z" fill="var(--cloth)" opacity=".96"/>
    <path id="trouser-waist" data-svg-african-role="${/shorts/.test(bottomClothing) ? 'shorts-waist' : 'trouser-waist'}" d="M36 ${torsoBottom - 20} C52 ${torsoBottom - 14} 84 ${torsoBottom - 14} 100 ${torsoBottom - 20} L100 ${torsoBottom + 1} L36 ${torsoBottom + 1} Z" fill="var(--skirt)" opacity=".92"/>
    <path id="jacket-center" d="M68 ${waistY + 3} L68 ${torsoBottom}" stroke="#101827" stroke-width="1.2" opacity=".36"/>`;
        const topLengthMarkup = Math.abs(topWearLength) < 0.005
            ? ''
            : topWearLength > 0
                ? `<path id="top-wear-length-extension" data-svg-african-role="top-wear-length adjustable-top-hem extended-top hem-${topWearLength.toFixed(2)}" d="M31 ${waistY - 2} C51 ${waistY + 4} 85 ${waistY + 4} 105 ${waistY - 2} L103 ${topHemY} C86 ${topHemY + 5} 50 ${topHemY + 5} 33 ${topHemY} Z" fill="${topLengthFill}" opacity=".98"/>`
                : `<path id="top-wear-length-shortened" data-svg-african-role="top-wear-length adjustable-top-hem shortened-top hem-${topWearLength.toFixed(2)}" d="M32 ${topHemY} C51 ${topHemY + 5} 85 ${topHemY + 5} 104 ${topHemY} L105 ${waistY + 3} C86 ${waistY + 8} 50 ${waistY + 8} 31 ${waistY + 3} Z" fill="var(--skirt)" opacity=".98"/>`;
        const stethoscopeMarkup = hasAccessory(config, 'stethoscope')
            ? `<g id="stethoscope" data-svg-african-role="accessory stethoscope" stroke="#26343f" stroke-width="2.2" fill="none" stroke-linecap="round">
        <path d="M44 43 C40 81 51 101 63 111"/>
        <path d="M92 43 C96 81 85 101 73 111"/>
        <path d="M63 111 C66 118 70 118 73 111"/>
        <circle cx="68" cy="130" r="5.2" fill="#26343f"/>
    </g>`
            : '';
        const idBadgeMarkup = hasAccessory(config, 'id-badge')
            ? `<g id="id-badge" data-svg-african-role="accessory id-badge">
        <rect x="89" y="89" width="19" height="27" rx="2.5" fill="#eef6ff" stroke="#7ba7c7" stroke-width="1.1"/>
        <rect x="93" y="94" width="11" height="3" rx="1" fill="#2b8cc4"/>
        <circle cx="98.5" cy="104" r="3" fill="var(--skin)"/>
        <path d="M92 111 L105 111" stroke="#64748b" stroke-width="1"/>
    </g>`
            : '';
        const notebookMarkup = hasAccessory(config, 'notebook')
            ? `<g id="notebook" data-svg-african-role="accessory notebook" transform="rotate(-8 28 168)">
        <rect x="17" y="148" width="24" height="34" rx="2.5" fill="#f7f1db" stroke="#9f7a32" stroke-width="1.3"/>
        <path d="M23 153 L23 178 M29 153 L29 178" stroke="#d7bd78" stroke-width="1"/>
</g>`
            : '';
        const diplomaMarkup = hasAccessory(config, 'diploma')
            ? `<g id="diploma-scroll" data-svg-african-role="accessory diploma diploma-scroll certificate graduation-prop convocation-scroll" transform="rotate(-10 101 162)">
        <path id="diploma-shadow" d="M83 150 C95 145 111 145 122 151 L119 176 C106 181 91 181 80 176 Z" fill="#000000" opacity=".18"/>
        <path id="diploma-paper" d="M80 147 C93 142 109 142 122 148 L119 174 C106 179 91 179 78 174 Z" fill="#fff7d6" stroke="#b48735" stroke-width="1.25"/>
        <path id="diploma-ribbon" data-svg-african-role="diploma-ribbon academic-accent" d="M98 145 L103 178 M92 160 C99 156 107 156 114 160" fill="none" stroke="var(--accent)" stroke-width="3.1" stroke-linecap="round"/>
        <path id="diploma-paper-lines" d="M86 154 C94 151 106 151 116 154 M86 164 C94 162 105 162 115 164" fill="none" stroke="#c7a45b" stroke-width="1" opacity=".65" stroke-linecap="round"/>
</g>`
            : '';
        const showChalk = hasAccessory(config, 'chalk') || /teacher/.test(styleText);
        const showLapelMic = hasAccessory(config, 'lapel-mic') || /media-presenter|event-host/.test(styleText);
        const showToolBelt = hasAccessory(config, 'tool-belt')
            || (!globalThis.SvgAfricanCharacterCatalog?.getPreset(config.preset)?.category && /engineer|workwear/.test(styleText));
        const showChefTools = hasAccessory(config, 'chef-tools') || /chef/.test(styleText);
        const showRankBadge = hasAccessory(config, 'rank-badge') || /pilot|soldier|military/.test(styleText);
        const showRadio = hasAccessory(config, 'radio') || /security|soldier|military/.test(styleText);
        const showWhistle = hasAccessory(config, 'whistle') || /security/.test(styleText);
        const rolePropMarkup = `
    ${showChalk ? `<g id="teacher-chalk" data-svg-african-role="accessory chalk teacher-tool classroom-prop">
        <rect x="105" y="127" width="16" height="3.4" rx="1.7" fill="#f8fafc" stroke="#dbeafe" stroke-width=".8"/>
        <path d="M108 132 C114 135 120 135 124 132" fill="none" stroke="#94a3b8" stroke-width=".9" opacity=".42" stroke-linecap="round"/>
    </g>` : ''}
    ${showLapelMic ? `<g id="lapel-mic" data-svg-african-role="accessory lapel-mic microphone presenter-mic">
        <circle cx="79" cy="66" r="2.6" fill="#101827" stroke="#f8fafc" stroke-width=".8"/>
        <path d="M80 69 C88 79 87 98 93 111" fill="none" stroke="#101827" stroke-width=".9" opacity=".55" stroke-linecap="round"/>
    </g>` : ''}
    ${showToolBelt ? `<g id="engineer-tool-belt" data-svg-african-role="utility-belt engineer-tools accessory tool-belt">
        <path d="M34 ${waistY + 8} C53 ${waistY + 14} 83 ${waistY + 14} 102 ${waistY + 8}" fill="none" stroke="#43311d" stroke-width="5.2" opacity=".92" stroke-linecap="round"/>
        <rect x="44" y="${waistY + 12}" width="10" height="18" rx="2" fill="#9f6b32" stroke="#4a341e" stroke-width=".9"/>
        <path d="M88 ${waistY + 12} L101 ${waistY + 29} M98 ${waistY + 13} L85 ${waistY + 30}" stroke="#7c8b9a" stroke-width="2.2" stroke-linecap="round"/>
    </g>` : ''}
    ${showChefTools ? `<g id="chef-utensil-pocket" data-svg-african-role="chef-tools utensil-pocket accessory kitchen-tools">
        <path d="M87 103 C97 106 104 106 111 102 L109 127 C101 131 92 130 86 125 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.1" opacity=".72"/>
        <path d="M92 99 L94 124 M98 98 L99 124 M104 99 L102 124" stroke="#475569" stroke-width="1.2" stroke-linecap="round"/>
        <circle cx="92" cy="98" r="1.8" fill="#475569"/>
    </g>` : ''}
    ${showRankBadge && /pilot/.test(styleText) ? `<g id="pilot-wings" data-svg-african-role="rank-badge pilot-wings accessory aviation-insignia">
        <path d="M52 76 C59 70 77 70 84 76 M59 76 L68 67 L77 76" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity=".9" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M39 84 L56 84 M80 84 L97 84" stroke="var(--accent)" stroke-width="2.2" opacity=".82" stroke-linecap="round"/>
    </g>` : ''}
    ${showRankBadge && /soldier|military/.test(styleText) ? `<g id="military-rank-patch" data-svg-african-role="rank-badge shoulder-patch military-chevron accessory">
        <path d="M94 77 L103 85 L112 77 M96 86 L103 93 L110 86" fill="none" stroke="var(--accent)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` : ''}
    ${showRadio ? `<g id="radio" data-svg-african-role="accessory radio shoulder-radio duty-radio">
        <rect x="25" y="72" width="12" height="22" rx="2.2" fill="#111827" stroke="#475569" stroke-width="1"/>
        <path d="M31 71 L27 60" stroke="#111827" stroke-width="1.6" stroke-linecap="round"/>
        <path d="M34 78 L46 88" stroke="#111827" stroke-width="1" opacity=".55" stroke-linecap="round"/>
        <circle cx="31" cy="82" r="2" fill="var(--accent)" opacity=".85"/>
    </g>` : ''}
    ${showWhistle ? `<g id="security-whistle" data-svg-african-role="accessory whistle security-whistle duty-whistle">
        <path d="M69 74 C76 86 80 100 79 116" fill="none" stroke="#d9c27a" stroke-width="1.4" opacity=".82" stroke-linecap="round"/>
        <path d="M76 116 C82 114 86 118 84 123 C82 128 73 127 72 121 C72 119 73 117 76 116 Z" fill="#e4c766" stroke="#9f7a32" stroke-width=".9"/>
    </g>` : ''}
`;
        const feminineContourMarkup = isFemale
            ? `<g id="female-body-contour" data-svg-african-role="female-body-cue bust-under-clothing waist-contour" fill="none" stroke-linecap="round">
        <path d="M${(41 - breastProjection * 3).toFixed(1)} 78 C49 ${(69 - breastProjection * 4).toFixed(1)} 59 ${(69 - breastProjection * 4).toFixed(1)} 66 79 M70 79 C77 ${(69 - breastProjection * 4).toFixed(1)} 88 ${(69 - breastProjection * 4).toFixed(1)} ${(95 + breastProjection * 3).toFixed(1)} 78" stroke="#ffffff" stroke-width="${isFemaleDoctorAsset ? '2.1' : '1.7'}" opacity="${isHealth ? '.32' : '.18'}"/>
        <path d="M35 ${waistY - 4} C49 ${waistY + 7} 87 ${waistY + 7} 101 ${waistY - 4}" stroke="${isHealth ? '#b8c6d7' : '#ffffff'}" stroke-width="1.4" opacity="${isHealth ? '.32' : '.16'}"/>
    </g>`
            : '';
        const muscleDefinitionMarkup = muscleDefinition >= 0
            ? `<g id="torso-muscle-definition" data-svg-african-role="muscle-definition torso-contour athletic-definition" fill="none" stroke="#ffffff" stroke-linecap="round" opacity="${muscleOpacity}">
        <path d="M37 69 C48 61 58 62 66 74 M70 74 C78 62 90 61 99 69" stroke-width="${muscleStroke}"/>
        <path d="M43 95 C51 104 59 108 68 108 C77 108 86 104 94 95" stroke-width="${(muscleStroke * 0.78).toFixed(2)}" opacity=".62"/>
        <path d="M49 ${waistY - 18} C57 ${waistY - 8} 78 ${waistY - 8} 87 ${waistY - 18}" stroke-width="${(muscleStroke * 0.62).toFixed(2)}" opacity=".45"/>
    </g>`
            : `<g id="torso-muscle-definition" data-svg-african-role="muscle-definition soft-body torso-contour" fill="none" stroke="#ffffff" stroke-linecap="round" opacity="${softOpacity}">
        <path d="M39 82 C51 91 83 91 96 82" stroke-width="1.45"/>
        <path d="M37 ${waistY - 7} C51 ${waistY + 4} 85 ${waistY + 4} 99 ${waistY - 7}" stroke-width="1.35"/>
    </g>`;
        const abdomenActive = bodyType === 'obese' || Math.abs(abdomenProjection) > 0.015 || Math.abs(abdomenWidth) > 0.015;
        const abdomenCx = 68;
        const abdomenTop = waistY + 5;
        const abdomenBottom = Math.min(torsoBottom - 5, waistY + 70 + abdomenCurve * 24);
        const abdomenMid = (abdomenTop + abdomenBottom) * 0.5 + abdomenCurve * 5;
        const abdomenRx = clamp(18 + Math.max(0, abdomenWidth) * 26 + abdomenCurve * 20 - Math.max(0, -abdomenWidth) * 8, 12, 54);
        const abdomenPush = abdomenCurve * 12;
        const abdomenShadowOpacity = clamp(0.08 + abdomenGain * 0.30 + Math.max(0, abdomenWidth) * 0.16 + (bodyType === 'obese' ? 0.08 : 0), 0.06, 0.50).toFixed(3);
        const abdomenHighlightOpacity = clamp(0.07 + abdomenGain * 0.20 + Math.max(0, abdomenWidth) * 0.08, 0.04, 0.30).toFixed(3);
        const abdomenMarkup = abdomenActive
            ? `<g id="abdomen-form" data-svg-african-role="abdomen tummy belly protruding-abdomen pregnancy-capable clothing-contour" fill="none" stroke-linecap="round" stroke-linejoin="round">
        <path id="abdomen-bulge-shadow" d="M${(abdomenCx - abdomenRx).toFixed(1)} ${abdomenTop.toFixed(1)} C${(abdomenCx - abdomenRx - 5).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx - abdomenRx * 0.48).toFixed(1)} ${(abdomenBottom + abdomenPush * 0.5).toFixed(1)} ${abdomenCx.toFixed(1)} ${(abdomenBottom + abdomenPush).toFixed(1)} C${(abdomenCx + abdomenRx * 0.48).toFixed(1)} ${(abdomenBottom + abdomenPush * 0.5).toFixed(1)} ${(abdomenCx + abdomenRx + 5).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx + abdomenRx).toFixed(1)} ${abdomenTop.toFixed(1)}" stroke="var(--cloth-shade)" stroke-width="${(2.4 + abdomenGain * 1.8).toFixed(2)}" opacity="${abdomenShadowOpacity}"/>
        <path id="abdomen-front-highlight" d="M${(abdomenCx - abdomenRx * 0.55).toFixed(1)} ${(abdomenTop + 11).toFixed(1)} C${(abdomenCx - abdomenRx * 0.25).toFixed(1)} ${(abdomenMid + 3).toFixed(1)} ${(abdomenCx + abdomenRx * 0.25).toFixed(1)} ${(abdomenMid + 3).toFixed(1)} ${(abdomenCx + abdomenRx * 0.55).toFixed(1)} ${(abdomenTop + 11).toFixed(1)}" stroke="#ffffff" stroke-width="1.5" opacity="${abdomenHighlightOpacity}"/>
        <path id="abdomen-lower-cloth-push" d="M${(abdomenCx - abdomenRx * 0.72).toFixed(1)} ${(abdomenBottom - 2).toFixed(1)} C${(abdomenCx - abdomenRx * 0.28).toFixed(1)} ${(abdomenBottom + 5 + abdomenPush * 0.35).toFixed(1)} ${(abdomenCx + abdomenRx * 0.28).toFixed(1)} ${(abdomenBottom + 5 + abdomenPush * 0.35).toFixed(1)} ${(abdomenCx + abdomenRx * 0.72).toFixed(1)} ${(abdomenBottom - 2).toFixed(1)}" stroke="var(--accent)" stroke-width="1.35" opacity="${clamp(0.15 + abdomenGain * 0.25, 0.10, 0.36).toFixed(3)}"/>
    </g>`
            : '';
        const maternityDrapeGain = isFemale ? clamp((abdomenGain - 0.14) / 0.86, 0, 1) : 0;
        const maternityDrapeMarkup = maternityDrapeGain > 0
            ? (() => {
                const drapeTop = Math.max(waistY - 7, abdomenTop - 2);
                const drapeHem = Math.min(torsoBottom - 4, abdomenBottom + 17 + maternityDrapeGain * 9);
                const drapeHalfWidth = clamp(abdomenRx * 0.78 + maternityDrapeGain * 5, 18, 48);
                const drapeLeft = abdomenCx - drapeHalfWidth;
                const drapeRight = abdomenCx + drapeHalfWidth;
                const isFlowingBottom = hasSkirtOrWrapperBottom || isWorldRobeBottom || isTraditionalWrapper;
                const isStructuredOuter = isAcademicGownTop || isHealth || isCorporateTop || isUniformTop;
                if (isFlowingBottom) {
                    return `<g id="maternity-drape" data-svg-african-role="maternity-drape pregnancy-clothing-fit flowing-lower-garment ${bottomClothing} no-center-slit" data-svg-african-drape="flowing">
        <path id="maternity-flowing-panel" d="M${drapeLeft.toFixed(1)} ${drapeTop.toFixed(1)} C${(drapeLeft - 4).toFixed(1)} ${abdomenMid.toFixed(1)} ${(drapeLeft - 2).toFixed(1)} ${(drapeHem - 7).toFixed(1)} ${(drapeLeft + 3).toFixed(1)} ${drapeHem.toFixed(1)} C${(abdomenCx - 17).toFixed(1)} ${(drapeHem + 5).toFixed(1)} ${(abdomenCx + 17).toFixed(1)} ${(drapeHem + 5).toFixed(1)} ${(drapeRight - 3).toFixed(1)} ${drapeHem.toFixed(1)} C${(drapeRight + 2).toFixed(1)} ${(drapeHem - 7).toFixed(1)} ${(drapeRight + 4).toFixed(1)} ${abdomenMid.toFixed(1)} ${drapeRight.toFixed(1)} ${drapeTop.toFixed(1)} C${(abdomenCx + 18).toFixed(1)} ${(drapeTop + 8).toFixed(1)} ${(abdomenCx - 18).toFixed(1)} ${(drapeTop + 8).toFixed(1)} ${drapeLeft.toFixed(1)} ${drapeTop.toFixed(1)} Z" fill="var(--skirt)" opacity="${(0.14 + maternityDrapeGain * 0.12).toFixed(3)}"/>
        <path id="maternity-flowing-fold-left" d="M${(abdomenCx - 15).toFixed(1)} ${(abdomenTop + 12).toFixed(1)} C${(abdomenCx - 21).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx - 20).toFixed(1)} ${(drapeHem - 5).toFixed(1)} ${(abdomenCx - 14).toFixed(1)} ${drapeHem.toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.2" opacity="${(0.18 + maternityDrapeGain * 0.18).toFixed(3)}" stroke-linecap="round"/>
        <path id="maternity-flowing-fold-right" d="M${(abdomenCx + 15).toFixed(1)} ${(abdomenTop + 12).toFixed(1)} C${(abdomenCx + 21).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx + 20).toFixed(1)} ${(drapeHem - 5).toFixed(1)} ${(abdomenCx + 14).toFixed(1)} ${drapeHem.toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.2" opacity="${(0.18 + maternityDrapeGain * 0.18).toFixed(3)}" stroke-linecap="round"/>
    </g>`;
                }
                if (isStructuredOuter) {
                    return `<g id="maternity-drape" data-svg-african-role="maternity-drape pregnancy-clothing-fit structured-outerwear ${topClothing}" data-svg-african-drape="structured">
        <path id="maternity-structured-hem" d="M${drapeLeft.toFixed(1)} ${drapeTop.toFixed(1)} C${(drapeLeft - 2).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx - 20).toFixed(1)} ${(drapeHem + 2).toFixed(1)} ${abdomenCx.toFixed(1)} ${(drapeHem + 5).toFixed(1)} C${(abdomenCx + 20).toFixed(1)} ${(drapeHem + 2).toFixed(1)} ${(drapeRight + 2).toFixed(1)} ${abdomenMid.toFixed(1)} ${drapeRight.toFixed(1)} ${drapeTop.toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="${(1.4 + maternityDrapeGain).toFixed(2)}" opacity="${(0.20 + maternityDrapeGain * 0.18).toFixed(3)}" stroke-linecap="round"/>
        <path id="maternity-structured-fold-left" d="M${(abdomenCx - 22).toFixed(1)} ${(abdomenTop + 8).toFixed(1)} C${(abdomenCx - 29).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx - 24).toFixed(1)} ${drapeHem.toFixed(1)} ${(abdomenCx - 18).toFixed(1)} ${(drapeHem + 3).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="${(0.10 + maternityDrapeGain * 0.12).toFixed(3)}" stroke-linecap="round"/>
        <path id="maternity-structured-fold-right" d="M${(abdomenCx + 22).toFixed(1)} ${(abdomenTop + 8).toFixed(1)} C${(abdomenCx + 29).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx + 24).toFixed(1)} ${drapeHem.toFixed(1)} ${(abdomenCx + 18).toFixed(1)} ${(drapeHem + 3).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.1" opacity="${(0.10 + maternityDrapeGain * 0.12).toFixed(3)}" stroke-linecap="round"/>
    </g>`;
                }
                return `<g id="maternity-drape" data-svg-african-role="maternity-drape pregnancy-clothing-fit soft-top ${topClothing}" data-svg-african-drape="soft-top">
        <path id="maternity-top-hem" d="M${drapeLeft.toFixed(1)} ${drapeTop.toFixed(1)} C${(drapeLeft - 1).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx - 18).toFixed(1)} ${(drapeHem + 1).toFixed(1)} ${abdomenCx.toFixed(1)} ${(drapeHem + 4).toFixed(1)} C${(abdomenCx + 18).toFixed(1)} ${(drapeHem + 1).toFixed(1)} ${(drapeRight + 1).toFixed(1)} ${abdomenMid.toFixed(1)} ${drapeRight.toFixed(1)} ${drapeTop.toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="${(1.3 + maternityDrapeGain * 0.8).toFixed(2)}" opacity="${(0.18 + maternityDrapeGain * 0.16).toFixed(3)}" stroke-linecap="round"/>
        <path id="maternity-top-side-folds" d="M${(abdomenCx - 20).toFixed(1)} ${(abdomenTop + 9).toFixed(1)} C${(abdomenCx - 27).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx - 22).toFixed(1)} ${drapeHem.toFixed(1)} ${(abdomenCx - 16).toFixed(1)} ${(drapeHem + 2).toFixed(1)} M${(abdomenCx + 20).toFixed(1)} ${(abdomenTop + 9).toFixed(1)} C${(abdomenCx + 27).toFixed(1)} ${abdomenMid.toFixed(1)} ${(abdomenCx + 22).toFixed(1)} ${drapeHem.toFixed(1)} ${(abdomenCx + 16).toFixed(1)} ${(drapeHem + 2).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1" opacity="${(0.08 + maternityDrapeGain * 0.13).toFixed(3)}" stroke-linecap="round"/>
    </g>`;
            })()
            : '';
        const occupationGarment = renderOccupationGarment(topClothing, { hem: torsoBottom - 4, waist: waistY });
        const collectionShirt = !!globalThis.SvgAfricanCharacterCatalog?.getPreset(config.preset)?.category
            && ['shirt', 'school-shirt', 'senator-top', 'agbada-top', 'buba'].includes(topClothing);
        const upperGarmentMarkup = occupationGarment || collectionShirt
            ? `<path d="M27 40 Q68 25 109 40 L103 ${torsoBottom} H33Z" fill="var(--cloth)"/><path d="M49 38 L68 57 L87 38" fill="none" stroke="var(--blouse)" stroke-width="4"/>${occupationGarment}`
            : isAcademicGownTop
            ? `<g id="academic-gown-top-front" data-svg-african-role="academic-gown academic-robe graduation-gown university-regalia formal-academic convocation-regalia">
        <path id="academic-gown-outer" data-svg-african-role="academic-gown robe-body broad-shoulder-drape wide-sleeve-ready" d="M14 43 C29 28 49 28 66 39 C83 28 106 28 124 43 C130 82 124 133 113 ${torsoBottom - 1} C93 ${torsoBottom + 7} 43 ${torsoBottom + 7} 23 ${torsoBottom - 1} C13 133 8 82 14 43 Z" fill="url(#clothGrad)" opacity=".99"/>
        <path id="academic-gown-inner-shirt" data-svg-african-role="academic-shirt-front visible-neck-opening" d="M49 38 C56 48 62 54 68 55 C75 54 81 48 88 38 L85 151 C78 157 58 157 51 151 Z" fill="var(--blouse)" opacity=".97"/>
        <path id="academic-gown-v-opening" data-svg-african-role="academic-gown v-opening shirt-visible" d="M44 37 L68 87 L92 37 C82 51 75 65 68 80 C61 65 54 51 44 37 Z" fill="var(--blouse)" opacity=".94"/>
        <path id="academic-gown-yoke" data-svg-african-role="academic-gown yoke shoulder-yoke graduation-hood-anchor" d="M31 42 C45 31 56 34 68 44 C80 34 93 31 106 42 C95 54 81 61 68 62 C55 61 42 54 31 42 Z" fill="var(--cloth-shade)" opacity=".66"/>
        <path id="academic-gown-hood-left" data-svg-african-role="academic-hood graduation-stole faculty-hood left gold-trim" d="M43 40 C48 71 55 103 65 143 C57 135 50 123 43 106 C36 82 32 58 28 42 Z" fill="var(--accent)" opacity=".86"/>
        <path id="academic-gown-hood-right" data-svg-african-role="academic-hood graduation-stole faculty-hood right gold-trim" d="M93 40 C88 71 81 103 71 143 C79 135 87 123 94 106 C101 82 105 58 108 42 Z" fill="var(--accent)" opacity=".86"/>
        <path id="academic-gown-hood-inner" data-svg-african-role="academic-hood inner-lining visible-hood-lining" d="M54 47 C59 63 64 75 68 86 C73 75 78 63 83 47 C77 56 72 65 68 76 C64 65 59 56 54 47 Z" fill="var(--skirt)" opacity=".88"/>
        <path id="academic-gown-faculty-piping" data-svg-african-role="academic-gown faculty-piping hood-trim" d="M42 43 C48 78 55 112 64 141 M94 43 C88 78 81 112 72 141 M50 40 C60 49 76 49 86 40" fill="none" stroke="#ffffff" stroke-width="1.55" opacity=".26" stroke-linecap="round"/>
        <path id="academic-gown-collar-shadow" d="M47 38 C56 48 79 48 89 38" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".20" stroke-linecap="round"/>
        <path id="academic-gown-front-folds" data-svg-african-role="academic-gown robe-folds side-folds no-center-slit" d="M31 58 C28 93 29 136 35 ${torsoBottom - 8} M105 58 C108 93 107 136 101 ${torsoBottom - 8} M56 64 C52 104 52 147 56 ${torsoBottom - 9} M80 64 C84 104 84 147 80 ${torsoBottom - 9}" fill="none" stroke="#ffffff" stroke-width="1.25" opacity=".13" stroke-linecap="round"/>
    </g>`
            : isMandarinTop
            ? `<g id="mandarin-jacket-front" data-svg-african-role="mandarin-jacket tang-suit standing-collar world-costume">
        <path id="mandarin-jacket-body" data-svg-african-role="standing-collar-jacket front-panel" d="M25 39 C39 28 54 30 68 38 C82 30 97 28 111 39 C116 75 113 124 104 163 C84 157 52 157 32 163 C23 124 20 75 25 39 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="mandarin-collar" data-svg-african-role="mandarin-collar high-neck" d="M52 35 C60 42 76 42 84 35 L84 54 C77 60 59 60 52 54 Z" fill="var(--cloth-shade)" opacity=".96"/>
        <path id="mandarin-placket" d="M68 49 L68 148" stroke="var(--accent)" stroke-width="2.4" opacity=".78" stroke-linecap="round"/>
        <path id="mandarin-frog-buttons" data-svg-african-role="frog-buttons mandarin-frogs" d="M59 69 C48 63 46 75 59 76 M77 69 C88 63 90 75 77 76 M59 96 C48 90 46 102 59 103 M77 96 C88 90 90 102 77 103 M59 123 C48 117 46 129 59 130 M77 123 C88 117 90 129 77 130" fill="none" stroke="var(--blouse)" stroke-width="1.7" opacity=".82" stroke-linecap="round"/>
    </g>`
            : isCheongsamTop
                ? `<g id="cheongsam-top-front" data-svg-african-role="cheongsam-top qipao fitted-dress world-costume">
        <path id="cheongsam-bodice" data-svg-african-role="cheongsam-bodice fitted-front-panel" d="M35 39 C48 29 58 31 68 39 C78 31 89 29 101 39 C105 74 101 122 96 151 C79 157 57 157 40 151 C35 122 31 74 35 39 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="cheongsam-neck" data-svg-african-role="mandarin-collar skin-visible-qipao-neck" d="M52 36 C61 43 75 43 84 36 L80 56 C74 61 62 61 56 56 Z" fill="var(--skin)" opacity=".92"/>
        <path id="cheongsam-diagonal-panel" data-svg-african-role="diagonal-closure qipao-panel" d="M82 39 C73 56 60 70 43 84" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity=".82" stroke-linecap="round"/>
        <path id="cheongsam-side-buttons" d="M73 52 C82 49 86 53 83 60 M63 64 C72 61 76 65 73 72" fill="none" stroke="var(--blouse)" stroke-width="1.6" opacity=".76" stroke-linecap="round"/>
    </g>`
                : isKimonoTop
                    ? `<g id="kimono-top-front" data-svg-african-role="kimono-top wrap-robe world-costume">
        <path id="kimono-left-panel" data-svg-african-role="kimono-panel left-wrap" d="M18 43 C34 29 50 31 66 51 C57 86 49 128 44 165 C31 124 23 80 18 43 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="kimono-right-panel" data-svg-african-role="kimono-panel right-wrap" d="M118 43 C101 29 86 31 70 51 C80 86 88 128 93 165 C105 124 113 80 118 43 Z" fill="var(--cloth-shade)" opacity=".94"/>
        <path id="kimono-v-neck" data-svg-african-role="crossed-v-neck skin-visible" d="M48 36 L68 64 L88 36 C80 45 73 53 68 61 C63 53 56 45 48 36 Z" fill="var(--skin)" opacity=".92"/>
        <path id="kimono-obi" data-svg-african-role="obi belt" d="M30 118 C50 126 86 126 106 118 L106 139 C85 148 51 148 30 139 Z" fill="var(--accent)" opacity=".94"/>
    </g>`
                    : isFolkVestTop
                        ? `<g id="folk-vest-front" data-svg-african-role="folk-vest blouse apron world-costume">
        <path id="folk-blouse" data-svg-african-role="folk-blouse white-shirt" d="M43 38 C52 49 61 55 68 56 C76 55 84 49 93 38 L90 151 C82 157 55 157 47 151 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="folk-vest-left" data-svg-african-role="folk-vest left-panel" d="M21 42 C35 31 49 33 62 52 C55 84 50 119 47 151 C35 114 27 76 21 42 Z" fill="var(--cloth)" opacity=".95"/>
        <path id="folk-vest-right" data-svg-african-role="folk-vest right-panel" d="M115 42 C101 31 87 33 74 52 C81 84 86 119 89 151 C101 114 109 76 115 42 Z" fill="var(--cloth)" opacity=".95"/>
        <path id="folk-lacing" data-svg-african-role="folk-lacing corset-front" d="M59 66 L77 78 M77 66 L59 78 M59 91 L77 103 M77 91 L59 103" fill="none" stroke="var(--accent)" stroke-width="1.7" opacity=".86" stroke-linecap="round"/>
    </g>`
                        : isPonchoTop
                            ? `<g id="poncho-top-front" data-svg-african-role="poncho-top serape world-costume wide-garment">
        <path id="poncho-body" data-svg-african-role="poncho-body wide-overlayer" d="M14 45 C32 29 52 30 68 42 C84 30 104 29 122 45 L113 152 C93 169 43 169 23 152 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="poncho-neck-hole" data-svg-african-role="poncho-neck skin-visible" d="M47 39 C57 50 79 50 89 39 C82 59 74 67 68 68 C62 67 54 59 47 39 Z" fill="var(--skin)" opacity=".92"/>
        <path id="poncho-band-a" d="M22 80 C45 92 91 92 114 80" fill="none" stroke="var(--accent)" stroke-width="5" opacity=".8" stroke-linecap="round"/>
        <path id="poncho-band-b" d="M25 106 C48 118 88 118 111 106" fill="none" stroke="var(--blouse)" stroke-width="3" opacity=".68" stroke-linecap="round"/>
        <path id="poncho-fringe" data-svg-african-role="poncho-fringe" d="M28 153 L25 162 M45 160 L43 169 M68 164 L68 173 M91 160 L93 169 M108 153 L111 162" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity=".72" stroke-linecap="round"/>
    </g>`
                            : isEmbroideredRobeTop
                                ? `<g id="embroidered-robe-top-front" data-svg-african-role="embroidered-robe-top national-robe world-costume">
        <path id="embroidered-robe-body" data-svg-african-role="robe-front-panel long-coat" d="M24 38 C38 28 53 30 68 40 C83 30 98 28 112 38 C119 81 115 133 106 171 C84 162 52 162 30 171 C21 133 17 81 24 38 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="robe-inner-shirt" d="M51 39 C58 50 64 57 68 58 C73 57 79 50 86 39 L82 153 C76 158 60 158 54 153 Z" fill="var(--blouse)" opacity=".90"/>
        <path id="robe-front-borders" data-svg-african-role="embroidered-borders" d="M42 43 C45 82 45 124 39 164 M94 43 C91 82 91 124 97 164" fill="none" stroke="var(--accent)" stroke-width="3.2" opacity=".82" stroke-linecap="round"/>
    </g>`
                                : isLinenDrapeTop
                                    ? `<g id="linen-drape-top-front" data-svg-african-role="linen-drape-top toga-drape world-costume">
        <path id="linen-base-wrap" data-svg-african-role="linen-base-wrap one-shoulder" d="M35 41 C50 31 86 31 101 41 C105 79 101 125 96 159 C76 154 57 154 39 159 C34 125 31 79 35 41 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="linen-diagonal-drape" data-svg-african-role="diagonal-drape sash" d="M28 38 C54 63 78 96 108 150 L98 163 C72 119 49 78 24 51 Z" fill="var(--cloth)" opacity=".94"/>
        <path id="linen-belt" data-svg-african-role="linen-belt" d="M35 121 C54 128 84 128 103 121" fill="none" stroke="var(--accent)" stroke-width="3.4" opacity=".82" stroke-linecap="round"/>
    </g>`
                                    : isDashikiTop
            ? `<g id="dashiki-top-front" data-svg-african-role="dashiki-top african-tunic geometric-collar premium-african">
        <path id="dashiki-tunic" data-svg-african-role="dashiki-tunic long-top front-panel" d="M22 39 C37 26 52 29 65 38 C76 29 99 30 114 43 C120 82 117 126 109 172 C88 165 49 165 28 172 C20 126 16 81 22 39 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="dashiki-neck-opening" data-svg-african-role="dashiki-neck skin-visible" d="M49 36 C56 45 62 50 68 51 C75 50 81 45 88 36 L79 76 C72 81 63 81 56 76 Z" fill="var(--skin)" opacity=".94"/>
        <path id="dashiki-collar-border" data-svg-african-role="dashiki-border collar-border" d="M48 38 L58 78 C64 84 73 84 79 78 L89 38" fill="none" stroke="var(--accent)" stroke-width="2.7" opacity=".9" stroke-linecap="round" stroke-linejoin="round"/>
        <path id="dashiki-hem-border" d="M28 159 C48 166 88 166 108 159" fill="none" stroke="var(--accent)" stroke-width="3.2" opacity=".86" stroke-linecap="round"/>
    </g>`
            : isModestTop
                ? `<g id="modest-top-front" data-svg-african-role="modest-top long-sleeve high-neck covered-tunic">
        <path id="modest-long-top" data-svg-african-role="modest-long-top front-panel" d="M27 38 C40 29 55 29 68 37 C81 29 96 29 109 38 C114 76 111 128 105 ${torsoBottom - 3} C84 ${torsoBottom + 5} 52 ${torsoBottom + 5} 31 ${torsoBottom - 3} C25 128 22 76 27 38 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="modest-high-neck" data-svg-african-role="high-neck modest-collar" d="M54 33 C61 40 75 40 82 33 L84 55 C77 60 60 60 53 55 Z" fill="var(--blouse)" opacity=".92"/>
        <path id="modest-center-trim" d="M68 52 L68 ${Math.min(torsoBottom - 20, 150)}" stroke="var(--accent)" stroke-width="1.7" opacity=".68" stroke-linecap="round"/>
        <path id="modest-hem-trim" d="M34 ${torsoBottom - 12} C51 ${torsoBottom - 4} 85 ${torsoBottom - 4} 102 ${torsoBottom - 12}" fill="none" stroke="var(--accent)" stroke-width="2.2" opacity=".75" stroke-linecap="round"/>
    </g>`
                : isSuspendersTop
                    ? `<g id="suspenders-shirt-front" data-svg-african-role="suspenders-shirt shirt suspenders smart-casual">
        <path id="suspenders-shirt-body" data-svg-african-role="shirt-front" d="M47 38 C54 49 61 55 68 56 C75 55 82 49 89 38 L85 153 C78 158 58 158 51 153 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="suspenders-collar-left" d="M48 37 L64 55 L55 67 C49 59 45 48 48 37 Z" fill="#ffffff" opacity=".96"/>
        <path id="suspenders-collar-right" d="M88 37 L72 55 L81 67 C87 59 91 48 88 37 Z" fill="#ffffff" opacity=".96"/>
        <path id="suspender-left-strap" data-svg-african-role="suspender strap left" d="M48 55 C42 85 39 120 38 153" stroke="var(--cloth)" stroke-width="5.3" opacity=".92" stroke-linecap="round"/>
        <path id="suspender-right-strap" data-svg-african-role="suspender strap right" d="M88 55 C94 85 97 120 98 153" stroke="var(--cloth)" stroke-width="5.3" opacity=".92" stroke-linecap="round"/>
        <path id="suspenders-pocket" d="M80 82 C89 85 97 85 105 82 L105 100 C98 104 89 104 81 100 Z" fill="var(--cloth)" opacity=".14"/>
    </g>`
                    : (isTraditionalWrapper || topClothing === 'buba')
            ? `<g id="iro-buba-front" data-svg-african-role="iro-buba buba blouse wrapper traditional-yoruba premium-traditional">
        <path id="buba-blouse" data-svg-african-role="buba-blouse blouse front-panel traditional-top" d="M29 39 C42 29 56 28 68 37 C80 28 95 29 108 39 C114 77 111 124 102 165 C84 156 53 156 34 165 C25 124 22 77 29 39 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="buba-neckline" data-svg-african-role="wide-neckline skin-visible" d="M44 35 C53 48 60 54 68 55 C76 54 84 48 93 35 C82 42 55 42 44 35 Z" fill="var(--skin)" opacity=".94"/>
        <path id="buba-gold-neck-trim" data-svg-african-role="embroidered-neck-trim" d="M43 38 C54 47 82 47 94 38" fill="none" stroke="var(--accent)" stroke-width="2.4" opacity=".86" stroke-linecap="round"/>
        <path id="buba-left-panel" d="M20 43 C35 32 50 33 62 52 C56 82 50 116 46 153 C35 116 27 76 20 43 Z" fill="var(--cloth-shade)" opacity=".26"/>
        <path id="buba-right-panel" d="M116 43 C101 32 86 33 74 52 C80 82 86 116 90 153 C101 116 109 76 116 43 Z" fill="var(--cloth-shade)" opacity=".26"/>
    </g>`
            : isSportsTop
                ? `<g id="sportswear-front" data-svg-african-role="sportswear athletic-kit ${topClothing} ${outfit} jersey tracksuit gym-wear">
        <path id="sports-top-body" data-svg-african-role="sports-top jersey-front athletic-front-panel" d="M31 40 C43 30 56 29 68 38 C80 29 93 30 105 40 C109 70 106 124 99 154 C82 160 54 160 37 154 C30 124 27 70 31 40 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="sports-neck" data-svg-african-role="sports-neckline breathable-collar skin-visible" d="${topClothing === 'gym-top' ? 'M47 36 C54 52 60 66 68 78 C76 66 82 52 89 36 C79 45 57 45 47 36 Z' : 'M49 36 C57 44 79 44 87 36 L82 55 C75 62 61 62 54 55 Z'}" fill="${topClothing === 'gym-top' ? 'var(--skin)' : 'var(--blouse)'}" opacity=".95"/>
        <path id="sports-side-panel-left" data-svg-african-role="sports-contrast-panel side-stripe" d="M30 48 C35 77 36 118 36 150" fill="none" stroke="var(--accent)" stroke-width="5" opacity=".78" stroke-linecap="round"/>
        <path id="sports-side-panel-right" data-svg-african-role="sports-contrast-panel side-stripe" d="M106 48 C101 77 100 118 100 150" fill="none" stroke="var(--accent)" stroke-width="5" opacity=".78" stroke-linecap="round"/>
        <text id="sports-number" data-svg-african-role="sports-number jersey-number" x="68" y="112" font-size="34" text-anchor="middle" font-family="Arial, sans-serif" font-weight="700" fill="var(--blouse)" opacity=".72">7</text>
        ${topClothing === 'tracksuit-top' ? '<path id="tracksuit-zip" data-svg-african-role="tracksuit zipper" d="M68 51 L68 150" stroke="#ffffff" stroke-width="1.8" opacity=".7"/>' : ''}
    </g>`
                : isUniformTop
                    ? `<g id="profession-uniform-front" data-svg-african-role="profession-uniform ${topClothing} ${outfit} workwear professional-life-situation">
        <path id="uniform-body" data-svg-african-role="uniform-front-panel" d="M27 40 C40 30 55 30 68 38 C81 30 96 30 109 40 C114 75 111 126 103 160 C83 156 53 156 33 160 C25 126 22 75 27 40 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="uniform-collar-left" d="M48 38 L64 56 L55 69 C49 60 45 49 48 38 Z" fill="var(--blouse)" opacity=".94"/>
        <path id="uniform-collar-right" d="M88 38 L72 56 L81 69 C87 60 91 49 88 38 Z" fill="var(--blouse)" opacity=".94"/>
        ${topClothing === 'chef-coat' ? '<path id="chef-double-breast" data-svg-african-role="chef-coat double-breasted buttons" d="M55 48 C66 75 73 111 75 151 M83 49 C72 75 65 111 62 151" fill="none" stroke="#d1d5db" stroke-width="1.6" opacity=".86"/><circle cx="59" cy="76" r="2" fill="#9ca3af"/><circle cx="77" cy="76" r="2" fill="#9ca3af"/><circle cx="63" cy="103" r="2" fill="#9ca3af"/><circle cx="73" cy="103" r="2" fill="#9ca3af"/>' : ''}
        ${topClothing === 'pilot-jacket' ? '<path id="pilot-epaulets" data-svg-african-role="pilot-uniform epaulets rank-stripes" d="M29 52 L52 48 M84 48 L107 52 M41 81 L55 81 M81 81 L95 81" stroke="var(--accent)" stroke-width="2.2" opacity=".85" stroke-linecap="round"/>' : ''}
        ${topClothing === 'security-shirt' ? '<path id="security-badge" data-svg-african-role="security-badge chest-badge" d="M91 75 L99 79 L97 91 L91 96 L85 91 L83 79 Z" fill="var(--accent)" opacity=".88"/>' : ''}
        ${topClothing === 'military-fatigue-top' ? '<path id="military-chest-pockets" data-svg-african-role="military-fatigue pockets" d="M34 78 L57 78 L57 100 L34 100 Z M80 78 L103 78 L103 100 L80 100 Z" fill="#1f2a16" opacity=".42"/>' : ''}
        ${topClothing === 'engineer-vest' ? '<path id="engineer-reflective-vest" data-svg-african-role="engineer-vest reflective-vest safety" d="M35 48 L53 153 M101 48 L83 153 M34 107 C50 113 86 113 102 107" stroke="#facc15" stroke-width="5" opacity=".82" stroke-linecap="round"/>' : ''}
        ${topClothing === 'teacher-cardigan' ? '<path id="teacher-cardigan-placket" data-svg-african-role="teacher-cardigan buttons" d="M68 53 L68 150" stroke="var(--accent)" stroke-width="1.4" opacity=".58"/><circle cx="68" cy="76" r="2.1" fill="var(--accent)"/><circle cx="68" cy="101" r="2.1" fill="var(--accent)"/><circle cx="68" cy="126" r="2.1" fill="var(--accent)"/>' : ''}
        ${topClothing === 'event-top' ? '<path id="event-host-sash" data-svg-african-role="event-formal host-trim sash lapel" d="M41 45 C57 72 76 106 96 151" fill="none" stroke="var(--accent)" stroke-width="5" opacity=".76" stroke-linecap="round"/><path id="event-host-brooch" data-svg-african-role="event-formal host-trim brooch" d="M88 86 C91 81 97 81 100 86 C97 91 91 91 88 86 Z" fill="var(--accent)" opacity=".9"/>' : ''}
        <path id="uniform-pocket-left" d="M35 86 C43 89 51 89 59 86 L58 105 C49 109 40 107 34 103 Z" fill="#ffffff" opacity=".14"/>
        <path id="uniform-pocket-right" d="M78 86 C86 89 94 89 102 86 L103 103 C96 107 87 109 78 105 Z" fill="#ffffff" opacity=".14"/>
    </g>`
                    : (isStudent || topClothing === 't-shirt')
                ? isMaleStudent
                ? `<g id="male-student-campus-front" data-svg-african-role="student campus-jacket polo backpack-straps male-student">
        <path id="student-shirt-front" data-svg-african-role="student-shirt polo front-panel" d="M47 38 C54 49 61 55 68 56 C75 55 82 49 89 38 L84 151 C78 156 59 156 52 151 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="student-collar-left" d="M48 37 L64 55 L55 67 C49 59 45 48 48 37 Z" fill="#ffffff" opacity=".94"/>
        <path id="student-collar-right" d="M88 37 L72 55 L81 67 C87 59 91 48 88 37 Z" fill="#ffffff" opacity=".94"/>
        <path id="student-campus-jacket-left" d="M19 43 C33 31 48 33 62 52 C56 82 51 116 47 151 C35 114 27 76 19 43 Z" fill="var(--cloth)" opacity=".92"/>
        <path id="student-campus-jacket-right" d="M117 43 C102 31 88 33 74 52 C80 82 85 116 89 151 C101 114 109 76 117 43 Z" fill="var(--cloth)" opacity=".92"/>
        <path id="student-backpack-strap-left" data-svg-african-role="backpack-strap" d="M31 45 C27 79 29 113 36 148" fill="none" stroke="#172033" stroke-width="4.2" opacity=".72" stroke-linecap="round"/>
        <path id="student-backpack-strap-right" data-svg-african-role="backpack-strap" d="M105 45 C109 79 107 113 100 148" fill="none" stroke="#172033" stroke-width="4.2" opacity=".72" stroke-linecap="round"/>
        <path id="student-shirt-placket" d="M68 58 L68 136" stroke="#172033" stroke-width="1.4" opacity=".32"/>
        <path id="student-pocket" d="M84 88 L103 86" stroke="#ffffff" stroke-width="1.5" opacity=".42" stroke-linecap="round"/>
    </g>`
                : `<g id="student-campus-front" data-svg-african-role="student campus-cardigan blouse backpack-straps female-student">
        <path id="student-blouse-front" data-svg-african-role="student-blouse blouse front-panel" d="M47 38 C53 49 60 55 68 56 C76 55 83 49 89 38 C86 93 83 132 80 153 C75 157 61 157 56 153 C53 132 50 93 47 38 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="student-neckline" d="M47 34 C54 43 61 48 68 49 C76 48 83 43 89 34 C79 40 57 40 47 34 Z" fill="var(--skin)" opacity=".93"/>
        <path id="student-cardigan-left" d="M19 42 C33 31 48 33 62 52 C56 82 51 115 47 150 C35 114 27 75 19 42 Z" fill="var(--cloth)" opacity=".92"/>
        <path id="student-cardigan-right" d="M117 42 C102 31 88 33 74 52 C80 82 85 115 89 150 C101 114 109 75 117 42 Z" fill="var(--cloth)" opacity=".92"/>
        <path id="student-backpack-strap-left" data-svg-african-role="backpack-strap" d="M31 45 C27 78 29 112 36 146" fill="none" stroke="#1b3540" stroke-width="4.2" opacity=".72" stroke-linecap="round"/>
        <path id="student-backpack-strap-right" data-svg-african-role="backpack-strap" d="M105 45 C109 78 107 112 100 146" fill="none" stroke="#1b3540" stroke-width="4.2" opacity=".72" stroke-linecap="round"/>
        <path id="student-pocket-left" d="M30 92 C39 95 47 95 56 92 L54 111 C45 115 36 113 29 108 Z" fill="#ffffff" opacity=".13"/>
        <path id="student-pocket-right" d="M80 92 C89 95 98 95 107 92 L108 108 C100 113 91 115 82 111 Z" fill="#ffffff" opacity=".13"/>
    </g>`
            : isPlainBusinessSuit
                ? `<g id="plain-business-suit-front" data-svg-african-role="corporate-wear business-suit plain-business-suit solid-color-suit no-lines single-color-suit jacket shirt tie">
        <path id="plain-business-jacket" data-svg-african-role="plain-business-suit jacket-shell single-color-suit no-lines" d="M24 40 C38 30 54 30 68 39 C82 30 98 30 112 40 C118 79 114 126 105 159 C84 154 52 154 31 159 C22 126 18 79 24 40 Z" fill="var(--cloth)" opacity=".99"/>
        <path id="plain-suit-shirt-front" data-svg-african-role="shirt-front visible-neck-shirt" d="M49 38 C55 48 61 55 68 56 C75 55 81 48 88 38 L83 145 C77 151 59 151 53 145 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="plain-suit-collar-left" data-svg-african-role="shirt-collar visible-neck-shirt" d="M49 38 L64 56 L55 69 C49 60 45 49 49 38 Z" fill="#ffffff"/>
        <path id="plain-suit-collar-right" data-svg-african-role="shirt-collar visible-neck-shirt" d="M88 38 L72 56 L81 69 C87 60 91 49 88 38 Z" fill="#ffffff"/>
        ${renderNeckTieMarkup(neckTieType, { id: 'plain-suit-tie', role: 'formal-office plain-business-suit', y: 56, design: neckTieDesign })}
    </g>`
            : (isCorporateTop || isMaleBusiness || topClothing === 'suit' || topClothing === 'blazer')
                ? `<g id="corporate-front" data-svg-african-role="corporate-wear business-suit jacket shirt tie male-lecturer ${topClothing} ${outfit}">
        <path id="shirt-front" data-svg-african-role="shirt-front" d="M49 38 C55 48 61 54 68 55 C75 54 81 48 88 38 L83 146 C77 151 59 151 53 146 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="collar-left" d="M49 38 L64 55 L54 68 C48 58 45 49 49 38 Z" fill="#ffffff"/>
        <path id="collar-right" d="M88 38 L72 55 L82 68 C88 58 92 49 88 38 Z" fill="#ffffff"/>
        ${topClothing === 'office-blouse' ? '<path id="office-blouse-v-neck" data-svg-african-role="office-blouse v-neck skin-visible" d="M48 38 C56 53 62 65 68 75 C75 65 81 53 89 38 C79 45 57 45 48 38 Z" fill="var(--skin)" opacity=".93"/>' : ''}
        ${shouldShowCorporateTie ? renderNeckTieMarkup(neckTieType, { id: 'tie', role: 'formal-office corporate-wear', y: 55, design: neckTieDesign }) : ''}
        ${topClothing === 'three-piece-suit' || topClothing === 'corporate-vest' ? '<path id="waistcoat" data-svg-african-role="three-piece-suit waistcoat corporate-vest" d="M53 59 C61 66 75 66 83 59 L86 145 C78 151 58 151 50 145 Z" fill="var(--cloth-shade)" opacity=".72"/><path id="waistcoat-v" d="M55 60 L68 91 L81 60" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".35"/>' : ''}
        <path id="left-lapel" d="M20 42 C35 31 48 33 62 52 C55 81 49 112 45 146 C34 109 26 72 20 42 Z" fill="var(--cloth-shade)" opacity=".92"/>
        <path id="right-lapel" d="M116 42 C101 31 88 33 74 52 C81 81 87 112 91 146 C102 109 110 72 116 42 Z" fill="var(--cloth-shade)" opacity=".92"/>
        ${topClothing === 'double-breasted-suit' ? '<g id="double-breasted-buttons" data-svg-african-role="double-breasted-suit buttons"><path d="M51 58 C61 80 69 112 72 146 M85 57 C77 80 70 112 66 146" fill="none" stroke="#ffffff" stroke-width="1.1" opacity=".24"/><circle cx="58" cy="82" r="2.1" fill="var(--accent)"/><circle cx="78" cy="82" r="2.1" fill="var(--accent)"/><circle cx="60" cy="108" r="2.1" fill="var(--accent)"/><circle cx="76" cy="108" r="2.1" fill="var(--accent)"/></g>' : ''}
        ${topClothing === 'lawyer-gown-top' ? '<path id="legal-bands" data-svg-african-role="lawyer legal-bands court-wear" d="M61 54 L65 79 M75 54 L71 79" stroke="#ffffff" stroke-width="3.2" opacity=".9" stroke-linecap="round"/>' : ''}
        ${topClothing === 'banker-jacket' ? '<path id="banker-pocket-square" data-svg-african-role="banker pocket-square pinstripe" d="M89 88 L105 84 L105 91 Z" fill="var(--accent)" opacity=".72"/>' : ''}
        ${topClothing === 'pant-suit' ? '<path id="pant-suit-soft-waist" data-svg-african-role="pant-suit fitted-waist female-corporate" d="M39 126 C52 138 84 138 97 126" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity=".42" stroke-linecap="round"/>' : ''}
        <path id="suit-pocket" d="M87 93 L106 90" stroke="#d7dde8" stroke-width="1.5" opacity=".75" stroke-linecap="round"/>
    </g>`
            : (isHealth || topClothing === 'lab-coat' || topClothing === 'scrubs-top')
                ? `<g id="doctor-coat-front" data-svg-african-role="doctor-coat lab-coat health-profession ${healthRole}">
        ${isMaleDoctorAsset
            ? `<path id="doctor-shirt-front" data-svg-african-role="shirt-front clinical-shirt" d="M49 39 C56 50 62 56 68 57 C75 56 81 50 88 39 L84 151 C78 155 59 155 53 151 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="doctor-collar-left" d="M49 39 L64 57 L54 69 C48 59 45 49 49 39 Z" fill="#ffffff"/>
        <path id="doctor-collar-right" d="M88 39 L72 57 L82 69 C88 59 92 49 88 39 Z" fill="#ffffff"/>
        ${renderNeckTieMarkup(neckTieType, { id: 'clinical-tie', role: 'clinical-tie', y: 57, defaultType: 'slim', design: neckTieDesign })}`
            : `<path id="doctor-scrub-front" data-svg-african-role="scrub-blouse" d="M49 39 C56 52 62 63 68 73 C75 63 81 52 88 39 C86 94 84 127 81 150 C75 154 60 154 54 150 C51 127 49 94 49 39 Z" fill="var(--blouse)" opacity=".98"/>
        <path id="doctor-neckline" d="M47 34 C54 43 60 48 68 49 C77 48 84 43 89 34 C80 40 57 40 47 34 Z" fill="var(--skin)" opacity=".93"/>`}
        <path id="coat-left-panel" d="M18 42 C33 30 49 33 62 52 C57 84 51 119 47 157 L38 ${torsoBottom} L28 ${torsoBottom} C28 154 24 96 18 42 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="coat-right-panel" d="M118 42 C103 30 87 33 74 52 C80 84 86 119 90 157 L98 ${torsoBottom} L108 ${torsoBottom} C108 154 112 96 118 42 Z" fill="var(--cloth)" opacity=".98"/>
        <path id="coat-center-opening" d="M62 55 C61 86 61 118 64 ${torsoBottom - 8} M74 55 C76 86 76 118 72 ${torsoBottom - 8}" stroke="#cfd9e6" stroke-width="1.6" opacity=".72" stroke-linecap="round"/>
        <path id="doctor-pocket-left" d="M29 106 C38 109 46 109 55 106 L54 126 C44 130 35 128 29 124 Z" fill="#dceaf7" opacity=".88"/>
        <path id="doctor-pocket-right" d="M81 106 C90 109 98 109 107 106 L107 124 C100 128 91 130 82 126 Z" fill="#dceaf7" opacity=".88"/>
        <path id="doctor-coat-hem" d="M31 ${torsoBottom - 3} C51 ${torsoBottom + 5} 85 ${torsoBottom + 5} 105 ${torsoBottom - 3}" fill="none" stroke="#cfd9e6" stroke-width="1.4" opacity=".7"/>
    </g>`
            : `<path id="blouse" data-svg-african-role="blouse front-panel" d="M49 39 C55 51 61 63 68 75 C75 63 82 51 88 39 C84 101 82 156 79 ${torsoBottom} L57 ${torsoBottom} C54 156 52 101 49 39 Z" fill="var(--blouse)" opacity=".98"/>
    <path id="neckline" d="M47 34 C53 44 60 49 68 50 C77 49 84 44 89 34 C78 41 58 41 47 34 Z" fill="var(--skin)" opacity=".92"/>
    <path id="collar-shadow" d="M48 38 C58 45 78 45 88 38" fill="none" stroke="#ffffff" stroke-width="1.6" opacity=".2" stroke-linecap="round"/>
    <path id="left-lapel" d="M20 42 C35 32 49 33 62 52 C56 79 50 111 45 146 C34 108 26 72 20 42 Z" fill="${lapel}" opacity=".8"/>
    <path id="right-lapel" d="M116 42 C101 32 87 33 74 52 C80 79 86 111 91 146 C102 108 110 72 116 42 Z" fill="${lapel}" opacity=".8"/>`;
        const topDetailMarkup = topClothing === 'senator-top'
            ? `<g id="senator-top-detail" data-svg-african-role="senator-top embroidery placket" fill="none" stroke-linecap="round">
        <path d="M68 43 L68 133" stroke="var(--accent)" stroke-width="2.2" opacity=".82"/>
        <path d="M57 49 C60 61 64 68 68 72 C73 68 77 61 80 49" stroke="var(--accent)" stroke-width="1.5" opacity=".72"/>
        <path d="M45 86 C56 91 80 91 92 86 M45 112 C56 117 80 117 92 112" stroke="var(--accent)" stroke-width="1.2" opacity=".38"/>
    </g>`
            : topClothing === 'agbada-top'
                ? `<g id="agbada-top-detail" data-svg-african-role="agbada drape embroidery wide-garment" fill="none" stroke-linecap="round">
        <path d="M15 48 C34 80 41 133 33 ${torsoBottom - 2}" stroke="var(--accent)" stroke-width="2.2" opacity=".55"/>
        <path d="M121 48 C102 80 95 133 103 ${torsoBottom - 2}" stroke="var(--accent)" stroke-width="2.2" opacity=".55"/>
        <path d="M55 72 C61 84 75 84 81 72 M49 119 C58 126 78 126 87 119" stroke="var(--accent)" stroke-width="1.5" opacity=".6"/>
    </g>`
                : topClothing === 'safari'
                    ? `<g id="safari-top-detail" data-svg-african-role="safari-jacket pockets" fill="none" stroke-linecap="round">
        <path d="M36 76 L55 76 L55 101 L36 101 Z M81 76 L100 76 L100 101 L81 101 Z" fill="#ffffff" opacity=".13" stroke="var(--accent)" stroke-width="1.1"/>
        <path d="M68 49 L68 146" stroke="var(--accent)" stroke-width="1.3" opacity=".46"/>
        <circle cx="68" cy="72" r="2" fill="var(--accent)" stroke="none"/><circle cx="68" cy="98" r="2" fill="var(--accent)" stroke="none"/><circle cx="68" cy="124" r="2" fill="var(--accent)" stroke="none"/>
    </g>`
                    : topClothing === 'shirt'
                        ? `<g id="shirt-top-detail" data-svg-african-role="shirt collar placket" fill="none" stroke-linecap="round">
        <path d="M48 38 L64 56 L55 66 M88 38 L72 56 L81 66" stroke="#ffffff" stroke-width="2.2" opacity=".52"/>
        <path d="M68 58 L68 137" stroke="var(--accent)" stroke-width="1.2" opacity=".44"/>
    </g>`
                        : '';
        const beadNecklaceMarkup = hasAccessory(config, 'beads')
            ? `<g id="beads-necklace" data-svg-african-role="accessory beads traditional-necklace" fill="var(--accent)" stroke="var(--skirt)" stroke-width=".6">
        <circle cx="53" cy="50" r="2.2"/><circle cx="59" cy="55" r="2.2"/><circle cx="66" cy="58" r="2.3"/><circle cx="73" cy="55" r="2.2"/><circle cx="79" cy="50" r="2.2"/>
    </g>`
            : '';
        const torsoDetailMarkup = isTraditionalWrapper
            ? `<g id="traditional-pattern" data-svg-african-role="traditional-pattern ankara-motif iro-buba-detail" fill="none" stroke-linecap="round">
        <path d="M38 78 C50 70 84 70 98 80" stroke="var(--accent)" stroke-width="1.5" opacity=".55"/>
        <path d="M36 105 C50 97 86 99 101 108" stroke="var(--blouse)" stroke-width="1.2" opacity=".36"/>
        <path d="M42 132 C55 126 82 126 94 132" stroke="var(--accent)" stroke-width="1.35" opacity=".44"/>
        <circle cx="48" cy="92" r="2.3" fill="var(--accent)" stroke="none" opacity=".82"/>
        <circle cx="88" cy="92" r="2.3" fill="var(--accent)" stroke="none" opacity=".82"/>
        <path d="M50 116 L58 110 L66 116 L58 122 Z M75 116 L83 110 L91 116 L83 122 Z" fill="var(--blouse)" stroke="none" opacity=".48"/>
    </g>
    ${beadNecklaceMarkup}`
            : hasSpecialTopDetail || occupationGarment || collectionShirt
                ? ''
                : `<path id="accent-trim" d="M24 ${130 + torsoLong * 0.25} C46 ${141 + torsoLong * 0.25} 91 ${141 + torsoLong * 0.25} 113 ${130 + torsoLong * 0.25}" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    <path id="button-line" d="M68 58 L68 134" stroke="#1b2638" stroke-width="1.5" opacity=".55"/>
    <circle cx="68" cy="72" r="2.4" fill="#192437"/>
    <circle cx="68" cy="98" r="2.4" fill="#192437"/>
    <circle cx="68" cy="124" r="2.4" fill="#192437"/>
    <path id="pocket-left" d="M29 82 C39 85 47 85 56 82 L54 103 C44 107 35 105 28 100 Z" fill="#ffffff" opacity=".14"/>
    <path id="pocket-right" d="M80 82 C89 85 98 85 107 82 L108 100 C100 105 91 107 82 103 Z" fill="#ffffff" opacity=".14"/>`;
        const fabricDesignMarkup = isPlainBusinessSuit ? '' : renderFabricDesignMarkup(fabricDesign, {
            role: 'torso-fabric-design',
            x1: isTraditionalWrapper || isWrapperBottom ? 24 : 27,
            x2: isTraditionalWrapper || isWrapperBottom ? 113 : 109,
            y1: 56,
            y2: torsoBottom - 8
        });
        const torsoBackFill = isPlainBusinessSuit ? 'var(--cloth)' : 'var(--cloth-shade)';
        const torsoMainFill = isPlainBusinessSuit ? 'var(--cloth)' : 'url(#clothGrad)';
        const torsoMainFilter = isPlainBusinessSuit ? '' : ' filter="url(#softShadow)"';
        const torsoPresentationRole = isFemale ? 'female-torso' : (isNonbinary ? 'nonbinary-torso neutral-torso' : 'male-torso');
        const body = `
<g ${styleVars(p)} data-svg-african-role="torso premium-part presentation-${presentation} age-${ageGroup} body-${bodyType} height-${heightType} ${torsoPresentationRole}">
    <path id="shoulder-back" d="M${17 - torsoWide - shoulderWide} 41 C30 ${21 + shoulderSoftness} 46 18 63 24 C72 20 90 20 105 27 C118 32 ${124 + torsoWide + shoulderWide} 37 ${121 + torsoWide + shoulderWide} 49 C124 82 121 110 ${116 + torsoWide * 0.5 + abdomenSide * 0.30} 130 L${103 + hipShift + torsoWide * 0.25 + abdomenSide * 0.34} ${torsoBottom} L${33 - hipShift - torsoWide * 0.25 - abdomenSide * 0.34} ${torsoBottom} L${20 - torsoWide * 0.5 - abdomenSide * 0.30} 130 C15 110 12 82 ${17 - torsoWide - shoulderWide} 41 Z" fill="${torsoBackFill}" opacity=".95"/>
    <path id="shoulder-socket-left" data-svg-african-role="shoulder-socket left" d="M${16 - torsoWide - shoulderWide} 45 C27 30 42 24 57 30 C45 35 36 45 30 60 C24 57 19 51 ${16 - torsoWide - shoulderWide} 45 Z" fill="${torsoBackFill}" opacity=".98"/>
    <path id="shoulder-socket-right" data-svg-african-role="shoulder-socket right" d="M${120 + torsoWide + shoulderWide} 45 C109 30 94 24 79 30 C91 35 100 45 106 60 C112 57 117 51 ${120 + torsoWide + shoulderWide} 45 Z" fill="${torsoBackFill}" opacity=".98"/>
    <path id="torso-main" data-svg-african-role="clothing torso abdomen-responsive" d="M${20 - torsoWide - shoulderWide} 42 C34 ${28 + shoulderSoftness} 51 25 66 31 C79 25 102 ${27 + shoulderSoftness} ${116 + torsoWide + shoulderWide} 42 C121 70 118 115 ${108 + torsoWide * 0.45 + abdomenSide} 162 L${99 + hipShift + torsoWide * 0.18 + abdomenSide * 0.45} ${torsoBottom} L${37 - hipShift - torsoWide * 0.18 - abdomenSide * 0.45} ${torsoBottom} L${28 - torsoWide * 0.45 - abdomenSide} 162 C18 115 15 70 ${20 - torsoWide - shoulderWide} 42 Z" fill="${torsoMainFill}"${torsoMainFilter}/>
    ${upperGarmentMarkup}
    ${topDetailMarkup}
    ${lowerTorsoMarkup}
    ${topLengthMarkup}
    ${fabricDesignMarkup}
    ${isPlainBusinessSuit ? '' : abdomenMarkup}
    ${maternityDrapeMarkup}
    ${isPlainBusinessSuit ? '' : feminineContourMarkup}
    ${isPlainBusinessSuit ? '' : muscleDefinitionMarkup}
    ${torsoDetailMarkup}
    ${isTraditionalWrapper ? '' : beadNecklaceMarkup}
    ${stethoscopeMarkup}
    ${idBadgeMarkup}
    ${notebookMarkup}
    ${diplomaMarkup}
    ${rolePropMarkup}
</g>`;
        return svgShell('torso', 136, Math.max(224, Math.ceil(torsoBottom + 14)), body, p);
    }

    function renderArm(partKey, config, p, options = {}) {
        const isRight = partKey === 'right-arm';
        const outfit = normalizeId(config.styling?.outfit || config.outfit, 'lecturer');
        const topClothing = resolveTopClothing(config);
        const profession = normalizeId(config.styling?.profession || config.profession, '');
        const culturalStyle = normalizeId(config.styling?.culturalStyle || config.culturalStyle, 'contemporary');
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const presentationProfile = getPresentationVisualProfile(presentation);
        const styleText = `${config.assetCharacterId || ''} ${outfit} ${topClothing} ${profession} ${culturalStyle}`;
        const isPlainBusinessSuit = outfit === 'plain-business-suit' || topClothing === 'plain-business-suit';
        const fabricDesign = resolveEffectiveFabricDesign(config, styleText);
        const isHealth = /doctor|nurse|lab-coat|scrubs|laboratory|pharmacist|community-health/.test(styleText);
        const isStudent = /student|campus|university/.test(`${config.assetCharacterId || ''} ${outfit} ${profession}`);
        const isAcademicGown = /academic-robe|academic-gown-top/.test(styleText);
        const isTraditional = /ankara|senator|agbada|buba|dashiki|modest|maasai|sari|mandarin|cheongsam|kimono|poncho|folk|robe|linen|drape/.test(styleText)
            || (presentation !== 'male' && /iro-buba|george-wrapper|wrapper/.test(styleText));
        const isCorporateSleeve = /executive-suit|double-breasted-suit|three-piece-suit|pant-suit|formal-shirt-tie|lawyer-gown-top|banker-jacket|office-blouse|corporate-vest|media-blazer|business|suit|blazer|lawyer|banker|executive|corporate/.test(styleText);
        const isSportsSleeve = /tracksuit-top|jersey-top|gym-top|football|basketball|tracksuit|gym|athlete|sports|jersey/.test(styleText);
        const isUniformSleeve = /teacher-cardigan|engineer-vest|chef-coat|pilot-jacket|security-shirt|military-fatigue-top|event-top|workwear-shirt|school-shirt|chef|pilot|security|police|soldier|military|engineer|artisan|farmer|workwear|school|teacher|event-host|event-formal/.test(styleText);
        const ageGroup = normalizeId(config.identity?.ageGroup || config.ageGroup, 'adult');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const sleeveKind = isAcademicGown
            ? 'academic-gown-sleeve graduation-sleeve'
            : isHealth
                ? 'lab-coat-sleeve'
                : isSportsSleeve
                ? 'sports-sleeve'
                : isUniformSleeve
                    ? 'uniform-sleeve'
                    : isTraditional
                        ? 'traditional-buba-sleeve'
                        : isStudent
                            ? 'student-sleeve'
                            : isCorporateSleeve
                                ? 'suit-sleeve'
                                : 'lecturer-sleeve';
        const sleeveLength = resolveSleeveLength(config, topClothing);
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const muscleDefinition = clamp(getAdjustmentValue(adjustments, 'muscleDefinition') + (presentationProfile.muscleDefinition || 0), -0.45, 0.55);
        const muscleGain = Math.max(0, muscleDefinition);
        const softnessGain = Math.max(0, -muscleDefinition);
        const isMalePresentation = presentation === 'male';
        const visibleMuscleGain = isMalePresentation ? 0 : muscleGain;
        const armWidthScale = 1 + (getAdjustmentValue(adjustments, 'armWidth') + (presentationProfile.armWidth || 0)) * 1.05 + Math.min(0, muscleDefinition) * 0.04;
        const handScale = 1 + getAdjustmentValue(adjustments, 'handSize') * 1.20;
        const armDefinitionOpacity = (isMalePresentation ? Math.min(0.045, visibleMuscleGain * 0.12) : 0.10 + muscleGain * 0.55 + softnessGain * 0.12).toFixed(3);
        const armDefinitionStroke = (isMalePresentation ? 0.75 + visibleMuscleGain * 0.75 : 1.1 + muscleGain * 1.8).toFixed(2);
        const bicepsBulge = muscleGain * 7.5;
        const forearmBulge = muscleGain * 4.5;
        const sleeveWidth = isAcademicGown ? 10 : (isTraditional || topClothing === 'agbada-top' ? 4 : (isSportsSleeve ? 1.5 : 0));
        const sleeveEnd = clamp(SLEEVE_END_Y[sleeveLength] ?? SLEEVE_END_Y.short, 18, 207);
        const sleeveMidY = Math.max(42, Math.min(158, sleeveEnd * 0.68));
        const sleeveLowerY = Math.max(30, sleeveEnd - 11);
        const sleeveIsVisible = sleeveEnd > 22;
        const handPath = isRight
            ? 'M22 205 C18 214 19 226 23 237 C26 246 38 249 44 241 C50 233 47 218 40 207 C35 212 28 212 22 205 Z'
            : 'M44 205 C48 214 47 226 43 237 C40 246 28 249 22 241 C16 233 19 218 26 207 C31 212 38 212 44 205 Z';
        const skinArm = isRight
            ? `M48 7 C${32 - bicepsBulge * 0.20} 9 ${20 - bicepsBulge * 0.26} 28 ${18 - bicepsBulge * 0.32} 66 C${15 - forearmBulge * 0.20} 107 18 158 21 207 C29 213 40 213 48 207 C47 156 ${47 + forearmBulge * 0.34} 105 ${52 + bicepsBulge * 0.52} 61 C${55 + bicepsBulge * 0.34} 35 58 15 48 7 Z`
            : `M18 7 C${34 + bicepsBulge * 0.20} 9 ${47 + bicepsBulge * 0.26} 28 ${49 + bicepsBulge * 0.32} 66 C${52 + forearmBulge * 0.20} 107 48 158 45 207 C37 213 26 213 18 207 C19 156 ${19 - forearmBulge * 0.34} 105 ${14 - bicepsBulge * 0.52} 61 C${11 - bicepsBulge * 0.34} 35 8 15 18 7 Z`;
        const sleeve = isRight
            ? `M${48 + sleeveWidth} 7 C${32 - bicepsBulge * 0.25} 9 ${19 - sleeveWidth - bicepsBulge * 0.35} 28 ${17 - sleeveWidth - bicepsBulge * 0.45} 66 C${15 - forearmBulge * 0.16} ${sleeveMidY} ${18 - forearmBulge * 0.08} ${sleeveLowerY} 21 ${sleeveEnd} C29 ${sleeveEnd + 6} 40 ${sleeveEnd + 6} 48 ${sleeveEnd} C47 ${sleeveLowerY} ${47 + forearmBulge * 0.34} ${sleeveMidY} ${52 + bicepsBulge * 0.62 + sleeveWidth} 61 C${55 + bicepsBulge * 0.42 + sleeveWidth} 35 ${58 + sleeveWidth} 15 ${48 + sleeveWidth} 7 Z`
            : `M${18 - sleeveWidth} 7 C${34 + bicepsBulge * 0.25} 9 ${47 + sleeveWidth + bicepsBulge * 0.35} 28 ${49 + sleeveWidth + bicepsBulge * 0.45} 66 C${51 + forearmBulge * 0.16} ${sleeveMidY} ${48 + forearmBulge * 0.08} ${sleeveLowerY} 45 ${sleeveEnd} C37 ${sleeveEnd + 6} 26 ${sleeveEnd + 6} 18 ${sleeveEnd} C19 ${sleeveLowerY} ${19 - forearmBulge * 0.34} ${sleeveMidY} ${14 - bicepsBulge * 0.62 - sleeveWidth} 61 C${11 - bicepsBulge * 0.42 - sleeveWidth} 35 ${8 - sleeveWidth} 15 ${18 - sleeveWidth} 7 Z`;
        const seam = isRight
            ? `M38 18 C30 57 30 ${Math.max(70, sleeveEnd * 0.58).toFixed(1)} 35 ${Math.max(34, sleeveEnd - 10).toFixed(1)}`
            : `M28 18 C36 57 36 ${Math.max(70, sleeveEnd * 0.58).toFixed(1)} 31 ${Math.max(34, sleeveEnd - 10).toFixed(1)}`;
        const muscleBulgeMarkup = !isMalePresentation && muscleGain > 0.04
            ? `<path id="biceps-bulge" data-svg-african-role="muscle-bulge biceps triceps" d="${isRight ? `M49 49 C57 64 55 88 49 101 M20 51 C15 69 15 88 21 104` : `M17 49 C9 64 11 88 17 101 M46 51 C51 69 51 88 45 104`}" fill="none" stroke="#ffffff" stroke-width="${(1.4 + muscleGain * 2).toFixed(2)}" opacity="${(0.16 + muscleGain * 0.42).toFixed(2)}" stroke-linecap="round"/>`
            : '';
        const sleeveHemMarkup = sleeveIsVisible
            ? `<path id="sleeve-hem" data-svg-african-role="sleeve-hem sleeve-length-${sleeveLength} ${sleeveLength === 'wrist' ? 'cuff' : 'open-sleeve'}" d="${isRight ? `M${21 - sleeveWidth * 0.25} ${sleeveEnd - 1} C29 ${sleeveEnd + 5} 40 ${sleeveEnd + 5} ${48 + sleeveWidth * 0.25} ${sleeveEnd - 1}` : `M${18 - sleeveWidth * 0.25} ${sleeveEnd - 1} C26 ${sleeveEnd + 5} 37 ${sleeveEnd + 5} ${45 + sleeveWidth * 0.25} ${sleeveEnd - 1}`}" fill="none" stroke="var(--accent)" stroke-width="${sleeveLength === 'wrist' ? 5 : 2.4}" opacity=".88" stroke-linecap="round"/>`
            : '';
        const sleeveFabricMarkup = sleeveIsVisible && !isPlainBusinessSuit
            ? renderFabricDesignMarkup(fabricDesign, {
                role: 'sleeve-fabric-design',
                x1: 15 - sleeveWidth,
                x2: 51 + sleeveWidth,
                y1: 26,
                y2: Math.max(34, sleeveEnd - 5),
                compact: true
            })
            : '';
        const armRoleDetailMarkup = sleeveIsVisible
            ? `${isAcademicGown ? `<g id="academic-gown-sleeve-detail" data-svg-african-role="academic-gown-sleeve graduation-sleeve robe-sleeve ${isRight ? 'right' : 'left'} sleeve-detail">
        <path d="${isRight ? `M14 ${Math.max(42, sleeveEnd - 104)} C24 ${Math.max(49, sleeveEnd - 96)} 45 ${Math.max(49, sleeveEnd - 96)} 54 ${Math.max(42, sleeveEnd - 104)} M15 ${sleeveEnd - 13} C27 ${sleeveEnd - 3} 45 ${sleeveEnd - 3} 54 ${sleeveEnd - 13}` : `M12 ${Math.max(42, sleeveEnd - 104)} C21 ${Math.max(49, sleeveEnd - 96)} 43 ${Math.max(49, sleeveEnd - 96)} 52 ${Math.max(42, sleeveEnd - 104)} M12 ${sleeveEnd - 13} C23 ${sleeveEnd - 3} 42 ${sleeveEnd - 3} 51 ${sleeveEnd - 13}`}" fill="none" stroke="var(--accent)" stroke-width="1.9" opacity=".80" stroke-linecap="round"/>
        <path id="academic-sleeve-bell-opening" data-svg-african-role="academic-gown-sleeve bell-sleeve-opening" d="${isRight ? `M13 ${sleeveEnd - 2} C27 ${sleeveEnd + 8} 45 ${sleeveEnd + 8} 55 ${sleeveEnd - 2}` : `M11 ${sleeveEnd - 2} C23 ${sleeveEnd + 8} 42 ${sleeveEnd + 8} 52 ${sleeveEnd - 2}`}" fill="none" stroke="var(--cloth-shade)" stroke-width="3.1" opacity=".82" stroke-linecap="round"/>
        <path d="${isRight ? `M18 35 C24 76 25 130 22 ${sleeveEnd - 9} M50 35 C43 82 43 137 48 ${sleeveEnd - 9}` : `M17 35 C24 82 24 137 19 ${sleeveEnd - 9} M49 35 C42 76 41 130 44 ${sleeveEnd - 9}`}" fill="none" stroke="#ffffff" stroke-width="1.05" opacity=".12" stroke-linecap="round"/>
    </g>` : ''}
    ${/engineer|workwear/.test(styleText) ? `<path id="engineer-reflective-sleeve-band" data-svg-african-role="engineer reflective-sleeve-band safety sleeve-detail" d="${isRight ? `M18 ${Math.max(56, sleeveEnd - 44)} C28 ${Math.max(61, sleeveEnd - 39)} 41 ${Math.max(61, sleeveEnd - 39)} 50 ${Math.max(56, sleeveEnd - 44)}` : `M16 ${Math.max(56, sleeveEnd - 44)} C26 ${Math.max(61, sleeveEnd - 39)} 39 ${Math.max(61, sleeveEnd - 39)} 48 ${Math.max(56, sleeveEnd - 44)}`}" fill="none" stroke="#fef08a" stroke-width="4" opacity=".82" stroke-linecap="round"/>` : ''}
    ${/pilot/.test(styleText) ? `<g id="pilot-sleeve-rank" data-svg-african-role="pilot sleeve-rank-stripes rank-badge sleeve-detail">
        <path d="${isRight ? `M22 ${sleeveEnd - 20} L47 ${sleeveEnd - 20} M24 ${sleeveEnd - 13} L45 ${sleeveEnd - 13}` : `M18 ${sleeveEnd - 20} L43 ${sleeveEnd - 20} M20 ${sleeveEnd - 13} L41 ${sleeveEnd - 13}`}" stroke="var(--accent)" stroke-width="2.2" opacity=".92" stroke-linecap="round"/>
    </g>` : ''}
    ${/security|police/.test(styleText) ? `<path id="security-shoulder-patch" data-svg-african-role="security shoulder-patch uniform-patch sleeve-detail" d="${isRight ? 'M43 36 L53 44 L49 56 L37 53 L35 42 Z' : 'M23 36 L13 44 L17 56 L29 53 L31 42 Z'}" fill="var(--accent)" opacity=".82"/>` : ''}
    ${/soldier|military/.test(styleText) ? `<g id="military-shoulder-patch" data-svg-african-role="military shoulder-patch rank-badge sleeve-detail">
        <path d="${isRight ? 'M42 34 L54 43 L49 58 L35 55 L34 42 Z' : 'M24 34 L12 43 L17 58 L31 55 L32 42 Z'}" fill="#304529" opacity=".95"/>
        <path d="${isRight ? 'M39 48 L45 53 L52 47' : 'M27 48 L21 53 L14 47'}" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    </g>` : ''}
    ${/chef/.test(styleText) ? `<path id="chef-cuff-roll" data-svg-african-role="chef cuff-roll sleeve-detail" d="${isRight ? `M21 ${sleeveEnd - 10} C30 ${sleeveEnd - 3} 40 ${sleeveEnd - 3} 49 ${sleeveEnd - 10}` : `M17 ${sleeveEnd - 10} C26 ${sleeveEnd - 3} 36 ${sleeveEnd - 3} 45 ${sleeveEnd - 10}`}" fill="none" stroke="#dbeafe" stroke-width="3.2" opacity=".78" stroke-linecap="round"/>` : ''}
    ${/teacher/.test(styleText) ? `<path id="teacher-elbow-patch" data-svg-african-role="teacher elbow-patch cardigan sleeve-detail" d="${isRight ? 'M23 91 C31 86 41 88 46 96 C41 104 30 105 23 99 Z' : 'M20 96 C25 88 35 86 43 91 C43 100 36 105 25 103 Z'}" fill="var(--accent)" opacity=".22"/>` : ''}`
            : '';
        const sleeveFill = isPlainBusinessSuit ? 'var(--cloth)' : 'url(#clothGrad)';
        const sleeveFilter = isPlainBusinessSuit ? '' : ' filter="url(#softShadow)"';
        const watchMarkup = hasAccessory(config, 'watch') && !isRight
            ? `<g id="watch" data-svg-african-role="accessory watch wristwatch">
        <rect x="22" y="210" width="22" height="7" rx="3.5" fill="var(--accent)" opacity=".92"/>
        <circle cx="33" cy="213.5" r="5" fill="var(--ink)" stroke="var(--accent)" stroke-width="1.4"/>
        <path d="M33 210.7 L33 213.5 L35.2 214.7" fill="none" stroke="#ffffff" stroke-width=".8" stroke-linecap="round"/>
    </g>`
            : '';
        const body = `
<g ${styleVars(p)} data-svg-african-role="${partKey} premium-part arm presentation-${presentation} age-${ageGroup} body-${bodyType} height-${heightType}">
    <g id="arm-clothing-shape" data-svg-african-role="arm-width-region" transform="translate(33 130) scale(${armWidthScale.toFixed(3)} 1) translate(-33 -130)">
    <path id="arm-skin-base" data-svg-african-role="arm-skin visible-arm-below-sleeve sleeve-length-${sleeveLength}" d="${skinArm}" fill="url(#skinGrad)"/>
    <path id="shoulder-cap" data-svg-african-role="shoulder-cap shoulder-overlap" data-svg-african-sleeve-length="${sleeveLength}" d="${isRight ? 'M47 7 C31 6 20 16 14 36 C27 30 43 31 56 43 C56 27 54 14 47 7 Z' : 'M19 7 C35 6 46 16 52 36 C39 30 23 31 10 43 C10 27 12 14 19 7 Z'}" fill="var(--cloth)" opacity=".98"/>
    ${sleeveIsVisible ? `<path id="sleeve" data-svg-african-role="sleeve arm-clothing ${sleeveKind} sleeve-length-${sleeveLength} ${isPlainBusinessSuit ? 'plain-business-suit solid-color-suit no-lines' : ''}" d="${sleeve}" fill="${sleeveFill}"${sleeveFilter}/>` : ''}
    ${sleeveFabricMarkup}
    ${armRoleDetailMarkup}
    ${sleeveIsVisible && !isPlainBusinessSuit ? `<path id="sleeve-highlight" d="${seam}" fill="none" stroke="#ffffff" stroke-width="2" opacity=".18" stroke-linecap="round"/>` : ''}
    ${isPlainBusinessSuit ? '' : muscleBulgeMarkup}
    ${isPlainBusinessSuit ? '' : `<path id="arm-muscle-definition" data-svg-african-role="muscle-definition arm-contour ${isRight ? 'right-arm' : 'left-arm'}" d="${isRight ? 'M43 44 C35 67 32 91 33 116 C34 146 38 172 42 194' : 'M23 44 C31 67 34 91 33 116 C32 146 28 172 24 194'}" fill="none" stroke="#ffffff" stroke-width="${armDefinitionStroke}" opacity="${armDefinitionOpacity}" stroke-linecap="round"/>`}
    ${isPlainBusinessSuit ? '' : sleeveHemMarkup}
    <path id="wrist" d="${isRight ? 'M24 209 C30 212 38 212 42 209 L42 222 C37 226 30 226 24 222 Z' : 'M24 209 C28 212 36 212 42 209 L42 222 C36 226 29 226 24 222 Z'}" fill="var(--skin)"/>
    </g>
    <path id="hand" data-svg-african-role="hand ${isRight ? 'right-hand' : 'left-hand'}" transform="translate(33 224) scale(${handScale.toFixed(3)}) translate(-33 -224)" d="${handPath}" fill="url(#skinGrad)"/>
    <path id="thumb" data-svg-african-role="thumb" d="${isRight ? 'M40 217 C50 220 52 231 45 236' : 'M26 217 C16 220 14 231 21 236'}" fill="none" stroke="var(--skin-shade)" stroke-width="3" stroke-linecap="round"/>
    <path id="wrist-crease" d="${isRight ? 'M25 213 C31 216 38 216 43 213' : 'M23 213 C28 216 35 216 41 213'}" fill="none" stroke="var(--skin-shade)" stroke-width="1.2" opacity=".28" stroke-linecap="round"/>
    <path id="finger-lines" d="${isRight ? 'M28 226 L29 241 M34 227 L35 243 M40 227 L40 240' : 'M38 226 L37 241 M32 227 L31 243 M26 227 L26 240'}" stroke="var(--skin-shade)" stroke-width="1.15" stroke-linecap="round" opacity=".42"/>
    ${watchMarkup}
</g>`;
        return svgShell(partKey, 66, 260, body, p);
    }

    function renderLeg(partKey, config, p, options = {}) {
        const isRight = partKey === 'right-leg';
        const outfit = normalizeId(config.styling?.outfit || config.outfit, 'lecturer');
        const bottomClothing = resolveBottomClothing(config);
        const skirtLength = resolveSkirtLength(config);
        const profession = normalizeId(config.styling?.profession || config.profession, '');
        const footwear = normalizeId(config.styling?.footwear || config.footwear, 'formal');
        const culturalStyle = normalizeId(config.styling?.culturalStyle || config.culturalStyle, 'contemporary');
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const ageGroup = normalizeId(config.identity?.ageGroup || config.ageGroup, 'adult');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const presentationProfile = getPresentationVisualProfile(presentation);
        const styleText = `${config.assetCharacterId || ''} ${outfit} ${bottomClothing} ${profession} ${footwear} ${culturalStyle}`;
        const isPlainBusinessSuit = outfit === 'plain-business-suit' || bottomClothing === 'plain-suit-trousers';
        const fabricDesign = resolveEffectiveFabricDesign(config, styleText);
        const isRobeLikeBottom = /academic-gown|kimono|robe|linen-drape/.test(bottomClothing);
        const isAcademicGownBottom = bottomClothing === 'academic-gown-bottom';
        const isSkirtBottom = (presentation !== 'male' && isSkirtLikeBottom(bottomClothing)) || isRobeLikeBottom;
        const isShorts = /shorts/.test(bottomClothing);
        const isTrouser = !isSkirtBottom && !isShorts && (
            presentation === 'male'
            || /trouser|pants|shorts|business|suit|doctor|nurse|lab-coat|scrubs|senator|baban-riga|executive|banker|lawyer|corporate|tracksuit|football|basketball|gym|athlete|sports|security|police|military|fatigue|chef|pilot|engineer|artisan|farmer|workwear|school/.test(styleText)
        );
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const bottomWearLength = getAdjustmentValue(adjustments, 'bottomWearLength');
        const muscleDefinition = clamp(getAdjustmentValue(adjustments, 'muscleDefinition') + (presentationProfile.muscleDefinition || 0), -0.45, 0.55);
        const muscleGain = Math.max(0, muscleDefinition);
        const softnessGain = Math.max(0, -muscleDefinition);
        const isMalePresentation = presentation === 'male';
        const visibleMuscleGain = isMalePresentation ? 0 : muscleGain;
        const legWidthScale = 1 + (getAdjustmentValue(adjustments, 'legWidth') + (presentationProfile.legWidth || 0)) * 1.05 + Math.min(0, muscleDefinition) * 0.04;
        const footScale = 1 + getAdjustmentValue(adjustments, 'footSize') * 1.15;
        const legDefinitionOpacity = (isMalePresentation ? Math.min(0.040, visibleMuscleGain * 0.10) : 0.10 + muscleGain * 0.52 + softnessGain * 0.08).toFixed(3);
        const legDefinitionStroke = (isMalePresentation ? 0.65 + visibleMuscleGain * 0.65 : 0.95 + muscleGain * 1.85).toFixed(2);
        const quadBulge = muscleGain * 6.2;
        const calfBulge = muscleGain * 4.8;
        const skirtCoverage = isAcademicGownBottom ? 190 : getSkirtLegCoverage(skirtLength);
        const visibleLegTop = isSkirtBottom
            ? clamp(skirtCoverage + bottomWearLength * 70, 34, 218)
            : isShorts
                ? clamp(90 + bottomWearLength * 65, 48, 150)
                : 52;
        const showLowerLeg = !isSkirtBottom || visibleLegTop < 205;
        const calf = (isSkirtBottom || isShorts)
            ? (isRight
                ? `M13 ${visibleLegTop} C22 ${visibleLegTop + 6} 34 ${visibleLegTop + 6} 42 ${visibleLegTop} L38 210 C31 216 18 216 10 210 L13 ${visibleLegTop} Z`
                : `M14 ${visibleLegTop} C23 ${visibleLegTop + 6} 35 ${visibleLegTop + 6} 44 ${visibleLegTop} L46 210 C38 216 25 216 18 210 L14 ${visibleLegTop} Z`)
            : (isRight
                ? `M${13 - quadBulge * 0.22} ${visibleLegTop} C${23 + quadBulge * 0.28} ${visibleLegTop + 7} ${34 + quadBulge * 0.22} ${visibleLegTop + 7} ${42 + quadBulge * 0.28} ${visibleLegTop} C${45 + calfBulge * 0.25} 100 ${43 + calfBulge * 0.35} 156 ${38 + calfBulge * 0.18} 210 C31 216 18 216 ${10 - calfBulge * 0.15} 210 C${8 - calfBulge * 0.18} 156 ${8 - quadBulge * 0.10} 100 ${13 - quadBulge * 0.22} ${visibleLegTop} Z`
                : `M${14 - quadBulge * 0.20} ${visibleLegTop} C23 ${visibleLegTop + 7} ${34 + quadBulge * 0.28} ${visibleLegTop + 7} ${44 + quadBulge * 0.22} ${visibleLegTop} C${49 + quadBulge * 0.10} 100 ${48 + calfBulge * 0.18} 156 ${46 + calfBulge * 0.15} 210 C38 216 25 216 ${18 - calfBulge * 0.18} 210 C${14 - calfBulge * 0.35} 156 ${12 - quadBulge * 0.24} 100 ${14 - quadBulge * 0.20} ${visibleLegTop} Z`);
        const foot = isRight
            ? 'M9 210 C18 218 32 218 39 210 L47 236 C34 244 13 243 1 234 Z'
            : 'M18 210 C25 218 39 218 48 210 L55 234 C42 243 21 244 7 236 Z';
        const upperFill = isPlainBusinessSuit ? 'var(--cloth)' : ((isSkirtBottom || isShorts || isTrouser) ? 'var(--skirt)' : 'url(#skinGrad)');
        const legFill = isPlainBusinessSuit ? 'var(--cloth)' : (isTrouser ? 'var(--skirt)' : 'url(#skinGrad)');
        const legStroke = isTrouser ? '#ffffff' : 'var(--skin-shade)';
        const shoeFill = footwear === 'sandals' ? 'url(#skinGrad)' : 'var(--shoe)';
        const footwearDetail = footwear === 'sneakers'
            ? `<path id="sneaker-sole" data-svg-african-role="sneaker sole" d="${isRight ? 'M4 235 C18 240 36 241 50 234' : 'M6 234 C20 241 39 240 53 235'}" fill="none" stroke="#ffffff" stroke-width="3" opacity=".85" stroke-linecap="round"/>
    <path id="sneaker-accent" data-svg-african-role="sneaker accent" d="${isRight ? 'M15 224 L37 224' : 'M19 224 L43 224'}" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".9" stroke-linecap="round"/>`
            : footwear === 'sandals'
                ? `<path id="sandal-strap" data-svg-african-role="sandal straps" d="${isRight ? 'M14 224 L42 232 M29 218 L33 238' : 'M14 232 L43 224 M29 218 L33 238'}" fill="none" stroke="var(--shoe)" stroke-width="2.4" opacity=".9" stroke-linecap="round"/>`
                : footwear === 'clinical'
                    ? `<path id="clinical-shoe-top" data-svg-african-role="clinical-shoe" d="${isRight ? 'M11 221 C22 226 37 226 47 222' : 'M9 222 C20 226 36 226 48 221'}" fill="none" stroke="#d9eefb" stroke-width="3" opacity=".88" stroke-linecap="round"/>`
                    : '';
        const isPleatedSkirt = /pleated/.test(bottomClothing);
        const isWrapperLeg = /wrapper|iro|george|academic-gown|kimono|robe|cheongsam|apron|drape/.test(bottomClothing);
        const skirtCoverRole = isSkirtBottom
            ? `skirt-leg-cover painted-limb-cover lower-garment-overlay true-skirt starts-at-waist covers-leg-to-hem no-center-slit ${bottomClothing} ${skirtLength} hidden-upper-leg`
            : isShorts
                ? `shorts-leg leg-clothing ${bottomClothing} adjustable-bottom-hem`
                : 'upper-leg-underlap hidden-by-torso';
        const skirtPanelPath = isRight
            ? `M0 0 C16 8 40 8 56 0 L56 ${visibleLegTop - 6} C43 ${visibleLegTop + 8} 14 ${visibleLegTop + 8} 0 ${visibleLegTop - 6} Z`
            : `M0 0 C16 8 40 8 56 0 L56 ${visibleLegTop - 6} C43 ${visibleLegTop + 8} 14 ${visibleLegTop + 8} 0 ${visibleLegTop - 6} Z`;
        const upperLegPath = isSkirtBottom
            ? skirtPanelPath
            : (isRight
                ? `M9 0 C21 8 35 8 45 0 L42 ${visibleLegTop + 3} C32 ${visibleLegTop + 8} 20 ${visibleLegTop + 8} 9 ${visibleLegTop + 3} Z`
                : `M11 0 C22 8 36 8 48 0 L47 ${visibleLegTop + 3} C37 ${visibleLegTop + 8} 25 ${visibleLegTop + 8} 15 ${visibleLegTop + 3} Z`);
        const skirtFoldMarkup = isPleatedSkirt
            ? `<path id="skirt-leg-pleats" data-svg-african-role="skirt-pleats side-folds no-center-slit" d="M12 10 C11 ${Math.max(44, visibleLegTop * 0.43).toFixed(1)} 9 ${(visibleLegTop - 8).toFixed(1)} M44 10 C46 ${Math.max(44, visibleLegTop * 0.43).toFixed(1)} 48 ${(visibleLegTop - 8).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1" opacity=".14" stroke-linecap="round"/>`
            : isWrapperLeg
                ? `<path id="wrapper-leg-folds" data-svg-african-role="wrapper-folds side-folds no-center-slit" d="M13 12 C15 ${Math.max(46, visibleLegTop * 0.45).toFixed(1)} 11 ${(visibleLegTop - 9).toFixed(1)} M43 12 C41 ${Math.max(46, visibleLegTop * 0.45).toFixed(1)} 46 ${(visibleLegTop - 9).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width=".95" opacity=".11" stroke-linecap="round"/>`
                : '';
        const skirtPleatMarkup = isSkirtBottom
            ? `<path id="skirt-leg-hem" data-svg-african-role="skirt-hem ${bottomClothing} ${skirtLength} no-center-slit" d="M2 ${visibleLegTop - 6} C16 ${visibleLegTop + 8} 42 ${visibleLegTop + 8} 54 ${visibleLegTop - 6}" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".72" stroke-linecap="round"/>
    ${skirtFoldMarkup}`
            : '';
        const lowerGarmentFabricMarkup = (isSkirtBottom || isShorts || isTrouser) && !isPlainBusinessSuit
            ? renderFabricDesignMarkup(fabricDesign, {
                role: 'leg-fabric-design',
                x1: 8,
                x2: 48,
                y1: isSkirtBottom || isShorts ? 10 : visibleLegTop + 5,
                y2: isSkirtBottom || isShorts ? Math.max(24, visibleLegTop - 9) : 205,
                compact: true
            })
            : '';
        const legUniformDetailMarkup = (isTrouser || isShorts) && !isPlainBusinessSuit && /tracksuit-pants|football-shorts|basketball-shorts|gym-leggings|security-trousers|military-fatigue-pants|chef-trousers|pilot-trousers|workwear-trousers|school-trousers|suit-trousers/.test(bottomClothing)
            ? `<path id="leg-uniform-stripe" data-svg-african-role="leg-detail ${bottomClothing} sports-side-stripe uniform-stripe ${isShorts ? 'shorts-stripe' : 'trouser-crease'}" d="${isShorts ? (isRight ? `M39 10 L39 ${Math.max(24, visibleLegTop - 8)}` : `M17 10 L17 ${Math.max(24, visibleLegTop - 8)}`) : (isRight ? `M39 ${visibleLegTop + 6} C41 103 40 156 36 204` : `M17 ${visibleLegTop + 6} C15 103 16 156 20 204`)}" fill="none" stroke="${/suit-trousers|chef-trousers/.test(bottomClothing) ? '#ffffff' : 'var(--accent)'}" stroke-width="${/sports|football|basketball|tracksuit|gym/.test(styleText) ? '2.8' : '1.6'}" opacity="${/suit-trousers|chef-trousers/.test(bottomClothing) ? '.24' : '.72'}" stroke-linecap="round"/>`
            : '';
        const legRoleDetailMarkup = `${/engineer|workwear/.test(styleText) ? `<path id="engineer-leg-reflective-band" data-svg-african-role="engineer work-boot reflective-leg-band safety leg-detail" d="${isRight ? 'M12 167 C23 172 35 172 42 167' : 'M14 167 C25 172 38 172 45 167'}" fill="none" stroke="#fef08a" stroke-width="4.2" opacity=".78" stroke-linecap="round"/>` : ''}
    ${/security|police/.test(styleText) ? `<path id="security-duty-boot-top" data-svg-african-role="security duty-boot uniform-boot leg-detail" d="${isRight ? 'M12 194 C22 201 36 201 41 194 L39 211 C31 216 19 216 10 211 Z' : 'M16 194 C25 201 39 201 44 194 L46 211 C38 216 26 216 18 211 Z'}" fill="#111827" opacity=".72"/>` : ''}
    ${/soldier|military/.test(styleText) ? `<g id="military-combat-boot" data-svg-african-role="soldier combat-boot military-boot leg-detail">
        <path d="${isRight ? 'M11 190 C23 198 37 198 42 190 L39 211 C31 216 19 216 10 211 Z' : 'M15 190 C26 198 40 198 45 190 L46 211 C38 216 26 216 18 211 Z'}" fill="#182216" opacity=".86"/>
        <path d="${isRight ? 'M16 202 L37 202 M15 208 L38 208' : 'M19 202 L41 202 M18 208 L42 208'}" stroke="#6b7d50" stroke-width="1.1" opacity=".7" stroke-linecap="round"/>
    </g>` : ''}
    ${/pilot/.test(styleText) ? `<path id="pilot-trouser-press" data-svg-african-role="pilot trouser-crease formal-uniform leg-detail" d="${isRight ? `M28 ${visibleLegTop + 9} C29 104 29 156 27 207` : `M29 ${visibleLegTop + 9} C28 104 28 156 30 207`}" fill="none" stroke="#ffffff" stroke-width="1.4" opacity=".22" stroke-linecap="round"/>` : ''}
    ${/chef/.test(styleText) ? `<path id="chef-non-slip-shoe" data-svg-african-role="chef non-slip-shoe kitchen-footwear leg-detail" d="${isRight ? 'M5 235 C18 241 37 241 50 234' : 'M6 234 C20 241 40 241 53 235'}" fill="none" stroke="#cbd5e1" stroke-width="2.4" opacity=".9" stroke-linecap="round"/>` : ''}`;
        const lowerLegDetailVisible = showLowerLeg && (!isSkirtBottom || visibleLegTop <= 190);
        const legShadeMarkup = lowerLegDetailVisible && !isPlainBusinessSuit
            ? `<path id="leg-shade" d="${isRight ? `M38 ${visibleLegTop + 10} C38 ${visibleLegTop + 32} 37 178 34 203` : `M18 ${visibleLegTop + 10} C18 ${visibleLegTop + 32} 19 178 22 203`}" fill="none" stroke="${legStroke}" stroke-width="1.5" opacity="${isTrouser ? '.16' : '.25'}"/>`
            : '';
        const legMusclePath = isSkirtBottom
            ? (isRight
                ? `M${20 - quadBulge * 0.12} ${visibleLegTop + 12} C${19 - calfBulge * 0.12} ${visibleLegTop + 34} ${23 - calfBulge * 0.10} 184 ${37 + calfBulge * 0.14} 190`
                : `M${36 + quadBulge * 0.12} ${visibleLegTop + 12} C${37 + calfBulge * 0.12} ${visibleLegTop + 34} ${33 + calfBulge * 0.10} 184 ${19 - calfBulge * 0.14} 190`)
            : (isRight
                ? `M${20 - quadBulge * 0.22} ${visibleLegTop + 13} C${16 - quadBulge * 0.14} 91 ${17 - calfBulge * 0.18} 135 ${20 - calfBulge * 0.10} 178 C24 188 31 191 ${37 + calfBulge * 0.18} 184`
                : `M${36 + quadBulge * 0.22} ${visibleLegTop + 13} C${40 + quadBulge * 0.14} 91 ${39 + calfBulge * 0.18} 135 ${36 + calfBulge * 0.10} 178 C32 188 25 191 ${19 - calfBulge * 0.18} 184`);
        const muscleDetailMarkup = lowerLegDetailVisible && !isPlainBusinessSuit
            ? `<path id="leg-muscle-definition" data-svg-african-role="muscle-definition leg-contour ${isRight ? 'right-leg' : 'left-leg'}" d="${legMusclePath}" fill="none" stroke="${legStroke}" stroke-width="${legDefinitionStroke}" opacity="${legDefinitionOpacity}" stroke-linecap="round"/>
    ${!isMalePresentation && muscleGain > 0.04 && !isTrouser ? `<path id="calf-bulge" data-svg-african-role="muscle-bulge calf quad" d="${isRight ? `M41 ${Math.max(visibleLegTop + 28, 132)} C48 152 46 184 39 202` : `M16 ${Math.max(visibleLegTop + 28, 132)} C9 152 11 184 18 202`}" fill="none" stroke="var(--skin-light)" stroke-width="${(1.1 + muscleGain * 1.7).toFixed(2)}" opacity="${(0.14 + muscleGain * 0.28).toFixed(2)}" stroke-linecap="round"/>` : ''}`
            : '';
        const body = `
<g ${styleVars(p)} data-svg-african-role="${partKey} premium-part leg presentation-${presentation} age-${ageGroup} body-${bodyType} height-${heightType}">
    <g id="leg-body-shape" data-svg-african-role="leg-width-region" transform="translate(28 105) scale(${legWidthScale.toFixed(3)} 1) translate(-28 -105)">
    <path id="upper-leg-underlap" data-svg-african-role="${skirtCoverRole}" d="${upperLegPath}" fill="${upperFill}"/>
    ${skirtPleatMarkup}
    ${showLowerLeg ? `<path id="${isTrouser ? 'trouser-leg' : 'leg-skin'}" data-svg-african-role="${isTrouser ? `trouser-leg leg-clothing ${bottomClothing} ${isPlainBusinessSuit ? 'plain-business-suit solid-color-suit no-lines' : ''}` : `leg-skin visible-lower-leg ${isShorts ? 'below-shorts-hem skin-below-shorts' : 'below-skirt-hem'}`}" d="${calf}" fill="${legFill}"/>` : ''}
    ${lowerGarmentFabricMarkup}
    ${legUniformDetailMarkup}
    ${legRoleDetailMarkup}
    ${legShadeMarkup}
    ${muscleDetailMarkup}
    </g>
    <path id="shoe" data-svg-african-role="footwear foot ${footwear}" transform="translate(28 224) scale(${footScale.toFixed(3)} 1) translate(-28 -224)" d="${foot}" fill="${shoeFill}"/>
    <path id="shoe-shine" d="${isRight ? 'M15 224 C27 228 41 228 51 224' : 'M5 224 C17 228 31 228 42 224'}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".22"/>
    ${footwearDetail}
</g>`;
        return svgShell(partKey, 56, 260, body, p);
    }

    function getContinuousGarmentDescriptor(bottomClothing = '') {
        const value = normalizeId(bottomClothing, '').toLowerCase();
        if (!value || /shorts|trouser|pants|leggings/.test(value)) return null;
        if (/academic-gown/.test(value)) {
            return { kind: 'academic-gown', adapterId: 'academic-gown', continuityType: 'full-length' };
        }
        if (/linen-drape|cheongsam/.test(value)) {
            return { kind: 'gown', adapterId: 'gown', continuityType: 'full-length' };
        }
        if (/religious-robe|kimono-robe|(?:^|-)robe-bottom/.test(value)) {
            return { kind: 'robe', adapterId: 'robe', continuityType: 'full-length' };
        }
        if (/wrapper|\biro\b|george/.test(value)) {
            return { kind: 'wrapper', adapterId: 'wrapper', continuityType: 'waist-to-hem' };
        }
        if (/skirt/.test(value)) {
            return { kind: 'skirt', adapterId: 'skirt', continuityType: 'waist-to-hem' };
        }
        return null;
    }

    function isContinuousLowerGarmentBottom(bottomClothing = '') {
        return getContinuousGarmentDescriptor(bottomClothing)?.continuityType === 'waist-to-hem';
    }

    function isContinuousLongGarmentBottom(bottomClothing = '') {
        return getContinuousGarmentDescriptor(bottomClothing)?.continuityType === 'full-length';
    }

    function isContinuousGarmentBottom(bottomClothing = '') {
        return !!getContinuousGarmentDescriptor(bottomClothing);
    }

    function getContinuousOuterGarmentDescriptor(topClothing = '') {
        const value = normalizeId(topClothing, '').toLowerCase();
        if (/lab-coat|scientist-coat|doctor-coat|long-coat|trench-coat/.test(value)) {
            return {
                kind: 'long-coat',
                adapterId: 'long-coat',
                continuityType: 'outer-coat',
                slotKey: 'outer'
            };
        }
        return null;
    }

    function renderContinuousOuterGarmentSpec(assetId, config = {}, instanceId = '', options = {}) {
        const asset = get(assetId);
        if (!asset) return null;

        const renderConfig = normalizePremiumConfig(asset, config);
        const topClothing = resolveTopClothing(renderConfig);
        const descriptor = getContinuousOuterGarmentDescriptor(topClothing);
        if (!descriptor) return null;

        const adjustments = resolveRenderAdjustments(renderConfig, options.adjustments);
        const styling = readStyling(renderConfig);
        const outfit = normalizeId(styling.outfit || renderConfig.outfit, 'doctor');
        const profession = normalizeId(styling.profession || renderConfig.profession, 'doctor');
        const culturalStyle = normalizeId(styling.culturalStyle || renderConfig.culturalStyle, 'contemporary');
        const sideView = isSidePremiumView(asset.view);
        const sideFacing = sideView ? (getPremiumViewSide(asset.view) || 'right') : null;
        const backView = String(asset.view || '').startsWith('back');
        const threeQuarter = String(asset.view || '').includes('3q');
        const palette = getPalette(renderConfig);
        const fabricDesign = resolveEffectiveFabricDesign(
            renderConfig,
            `${asset.id} ${outfit} ${topClothing} ${profession} ${culturalStyle}`
        );
        const topWearLength = getAdjustmentValue(adjustments, 'topWearLength');
        const coverage = clamp(132 + topWearLength * 52, 102, 178);
        const svgWidth = sideView ? 112 : 128;
        const svgHeight = Math.max(112, Math.round(coverage + 12));
        const topY = 3;
        const hemY = svgHeight - 5;
        const centerX = sideView
            ? 64
            : 64 + (threeQuarter ? (String(asset.view).endsWith('right') ? 5 : -5) : 0);
        const clipId = 'continuous-outer-coat-clip';
        let coatPath = '';
        let coatMarkup = '';

        if (sideView) {
            coatPath = `M22 ${topY + 5} C38 ${topY - 1} 75 ${topY} 88 ${topY + 8} C98 38 101 ${Math.max(54, svgHeight * 0.48).toFixed(1)} 96 ${hemY} C75 ${hemY + 3} 37 ${hemY + 3} 15 ${hemY} C12 ${Math.max(58, svgHeight * 0.54).toFixed(1)} 14 26 22 ${topY + 5} Z`;
            coatMarkup = `
    <path id="continuous-outer-coat-side-tail" data-svg-african-role="continuous-outer-coat coat-tail side-coat-profile long-coat" d="${coatPath}" fill="var(--cloth)" filter="url(#softShadow)"/>
    <path id="continuous-outer-coat-side-front-opening" data-svg-african-role="coat-front-opening side-opening intentional-front-opening" d="M84 13 C91 43 93 ${(hemY * 0.66).toFixed(1)} 88 ${hemY - 4}" fill="none" stroke="var(--cloth-shade)" stroke-width="2" opacity=".56" stroke-linecap="round"/>
    <path id="continuous-outer-coat-side-pocket" data-svg-african-role="lab-coat pocket side-pocket" d="M67 ${(svgHeight * 0.43).toFixed(1)} C76 ${(svgHeight * 0.40).toFixed(1)} 85 ${(svgHeight * 0.41).toFixed(1)} 91 ${(svgHeight * 0.45).toFixed(1)} L88 ${(svgHeight * 0.61).toFixed(1)} C80 ${(svgHeight * 0.64).toFixed(1)} 72 ${(svgHeight * 0.63).toFixed(1)} 66 ${(svgHeight * 0.59).toFixed(1)} Z" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity=".48"/>`;
        } else if (backView) {
            coatPath = `M10 ${topY + 7} C34 ${topY - 2} 94 ${topY - 2} 118 ${topY + 7} C123 43 122 ${(svgHeight * 0.62).toFixed(1)} 116 ${hemY} C87 ${hemY + 3} 41 ${hemY + 3} 12 ${hemY} C6 ${(svgHeight * 0.62).toFixed(1)} 5 43 10 ${topY + 7} Z`;
            coatMarkup = `
    <path id="continuous-outer-coat-back-tail" data-svg-african-role="continuous-outer-coat coat-tail closed-back-coat long-coat" d="${coatPath}" fill="var(--cloth)" filter="url(#softShadow)"/>
    <path id="continuous-outer-coat-back-vent" data-svg-african-role="coat-back-vent rear-tail-detail" d="M64 ${(svgHeight * 0.57).toFixed(1)} L64 ${hemY - 2}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.7" opacity=".42" stroke-linecap="round"/>
    <path id="continuous-outer-coat-back-belt" data-svg-african-role="lab-coat rear-belt" d="M29 ${(svgHeight * 0.35).toFixed(1)} C48 ${(svgHeight * 0.39).toFixed(1)} 80 ${(svgHeight * 0.39).toFixed(1)} 99 ${(svgHeight * 0.35).toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="2.2" opacity=".44" stroke-linecap="round"/>`;
        } else {
            const leftInner = centerX - 4;
            const rightInner = centerX + 4;
            const leftPath = `M9 ${topY + 7} C27 ${topY - 1} ${centerX - 17} ${topY + 1} ${leftInner} 13 C${leftInner - 2} 46 ${leftInner - 5} ${(svgHeight * 0.68).toFixed(1)} ${leftInner - 8} ${hemY - 2} C41 ${hemY + 3} 22 ${hemY + 2} 8 ${hemY - 1} C4 ${(svgHeight * 0.63).toFixed(1)} 4 39 9 ${topY + 7} Z`;
            const rightPath = `M119 ${topY + 7} C101 ${topY - 1} ${centerX + 17} ${topY + 1} ${rightInner} 13 C${rightInner + 2} 46 ${rightInner + 5} ${(svgHeight * 0.68).toFixed(1)} ${rightInner + 8} ${hemY - 2} C87 ${hemY + 3} 106 ${hemY + 2} 120 ${hemY - 1} C124 ${(svgHeight * 0.63).toFixed(1)} 124 39 119 ${topY + 7} Z`;
            coatPath = `${leftPath} ${rightPath}`;
            coatMarkup = `
    <path id="continuous-outer-coat-left-tail" data-svg-african-role="continuous-outer-coat coat-tail coat-left-tail intentional-front-opening long-coat" d="${leftPath}" fill="var(--cloth)" filter="url(#softShadow)"/>
    <path id="continuous-outer-coat-right-tail" data-svg-african-role="continuous-outer-coat coat-tail coat-right-tail intentional-front-opening long-coat" d="${rightPath}" fill="var(--cloth)" filter="url(#softShadow)"/>
    <path id="continuous-outer-coat-left-opening" data-svg-african-role="coat-front-opening intentional-front-opening lapel-continuation" d="M${leftInner} 14 C${leftInner - 2} 46 ${leftInner - 5} ${(svgHeight * 0.68).toFixed(1)} ${leftInner - 8} ${hemY - 2}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.8" opacity=".58" stroke-linecap="round"/>
    <path id="continuous-outer-coat-right-opening" data-svg-african-role="coat-front-opening intentional-front-opening lapel-continuation" d="M${rightInner} 14 C${rightInner + 2} 46 ${rightInner + 5} ${(svgHeight * 0.68).toFixed(1)} ${rightInner + 8} ${hemY - 2}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.8" opacity=".58" stroke-linecap="round"/>
    <path id="continuous-outer-coat-left-pocket" data-svg-african-role="lab-coat pocket" d="M20 ${(svgHeight * 0.42).toFixed(1)} C31 ${(svgHeight * 0.39).toFixed(1)} 42 ${(svgHeight * 0.40).toFixed(1)} 50 ${(svgHeight * 0.44).toFixed(1)} L47 ${(svgHeight * 0.61).toFixed(1)} C36 ${(svgHeight * 0.64).toFixed(1)} 27 ${(svgHeight * 0.63).toFixed(1)} 20 ${(svgHeight * 0.59).toFixed(1)} Z" fill="none" stroke="var(--accent)" stroke-width="1.35" opacity=".46"/>
    <path id="continuous-outer-coat-right-pocket" data-svg-african-role="lab-coat pocket" d="M108 ${(svgHeight * 0.42).toFixed(1)} C97 ${(svgHeight * 0.39).toFixed(1)} 86 ${(svgHeight * 0.40).toFixed(1)} 78 ${(svgHeight * 0.44).toFixed(1)} L81 ${(svgHeight * 0.61).toFixed(1)} C92 ${(svgHeight * 0.64).toFixed(1)} 101 ${(svgHeight * 0.63).toFixed(1)} 108 ${(svgHeight * 0.59).toFixed(1)} Z" fill="none" stroke="var(--accent)" stroke-width="1.35" opacity=".46"/>`;
        }

        const pattern = renderFabricDesignMarkup(fabricDesign, {
            role: 'continuous-outer-coat-fabric-design',
            x1: 12,
            x2: svgWidth - 12,
            y1: 18,
            y2: svgHeight - 10,
            compact: false
        });
        const mirrorTransform = sideView && sideFacing === 'left'
            ? ` transform="translate(${svgWidth} 0) scale(-1 1)"`
            : '';
        const viewRoles = sideView
            ? `side-profile-coat side-facing-${sideFacing} mirrored-side-pair`
            : `${backView ? 'back-coat' : (threeQuarter ? 'three-quarter-coat' : 'front-coat')}`;
        const body = `
<defs><clipPath id="${clipId}"><path d="${coatPath}"/></clipPath></defs>
<g ${styleVars(palette)} data-svg-african-role="continuous-outer-coat svg-african-garment-companion outer-layer long-coat lab-coat ${viewRoles} coat-over-lower-garment">
    <g id="continuous-outer-coat-view"${mirrorTransform}>
    ${coatMarkup}
    <g clip-path="url(#${clipId})">${pattern}</g>
    <path id="continuous-outer-coat-hem" data-svg-african-role="coat-hem coat-tail" d="M13 ${hemY - 2} C38 ${hemY + 2} 90 ${hemY + 2} 115 ${hemY - 2}" fill="none" stroke="var(--accent)" stroke-width="1.7" opacity=".48" stroke-linecap="round"/>
    </g>
</g>`;
        const rawSvg = svgShell('continuous-outer-coat', svgWidth, svgHeight, body, palette)
            .replace(/<svg\b/, `<svg data-svg-african-artwork-source="runtime-garment-companion" data-svg-african-view="${asset.view}"`);
        const SvgUtils = globalThis.SvgCharacterUtils;
        const namespace = `${instanceId || 'svgaf-premium'}-${asset.id}-continuous-outer-coat`
            .replace(/[^a-zA-Z0-9_-]+/g, '-');
        const svg = SvgUtils?.namespaceSvg ? SvgUtils.namespaceSvg(rawSvg, namespace) : rawSvg;
        SvgUtils?.assertSafeGeneratedSvg?.(svg);
        const imageSrc = SvgUtils?.svgToDataUrl
            ? SvgUtils.svgToDataUrl(svg)
            : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const viewFamily = sideView ? 'side' : 'front-back-three-quarter';
        const garmentPolicy = globalThis.ArmatureGarmentPolicies?.resolve?.({
            adapterId: descriptor.adapterId,
            kind: descriptor.kind,
            topClothing,
            outfit,
            profession,
            culturalStyle,
            viewFamily
        }) || {
            version: 2,
            adapterId: 'long-coat',
            motionPolicy: 'coat-sway',
            layerPolicy: 'body-drape',
            deformationPolicy: 'coat-panel'
        };

        return {
            roleKey: 'svg-african-outer-coat',
            slotKey: descriptor.slotKey,
            kind: descriptor.kind,
            continuityType: descriptor.continuityType,
            assetId: asset.id,
            view: asset.view,
            topClothing,
            coverage,
            coverageRatio: svgHeight / 260,
            viewFamily,
            sideFacing,
            sidePaddingRatio: sideView ? 0.07 : 0.10,
            torsoWidthRatio: sideView ? 0.88 : 1.02,
            centerOffsetRatio: 0,
            parentAnchorY: sideView ? 0.79 : 0.82,
            topOverlapRatio: sideView ? 0.05 : 0.04,
            garmentPolicy,
            svg,
            imageSrc
        };
    }

    function renderContinuousGarmentSpec(assetId, config = {}, instanceId = '', options = {}) {
        const asset = get(assetId);
        if (!asset) return null;

        const renderConfig = normalizePremiumConfig(asset, config);
        const bottomClothing = resolveBottomClothing(renderConfig);
        const descriptor = getContinuousGarmentDescriptor(bottomClothing);
        if (!descriptor) return null;

        const adjustments = resolveRenderAdjustments(renderConfig, options.adjustments);
        const sideView = isSidePremiumView(asset.view);
        const sideFacing = sideView ? (getPremiumViewSide(asset.view) || 'right') : null;
        const sideLandmarks = sideView ? compileSideTorsoLandmarks(renderConfig, adjustments) : null;
        const skirtLength = resolveSkirtLength(renderConfig);
        const bottomWearLength = getAdjustmentValue(adjustments, 'bottomWearLength');
        const isLongGarment = descriptor.continuityType === 'full-length';
        const coverage = isLongGarment
            ? clamp(218 + bottomWearLength * 42, 198, 232)
            : clamp(getSkirtLegCoverage(skirtLength) + bottomWearLength * 70, 34, 218);
        const styling = readStyling(renderConfig);
        const outfit = normalizeId(styling.outfit || renderConfig.outfit, 'lecturer');
        const profession = normalizeId(styling.profession || renderConfig.profession, '');
        const culturalStyle = normalizeId(styling.culturalStyle || renderConfig.culturalStyle, 'contemporary');
        const styleText = `${asset.id} ${outfit} ${bottomClothing} ${profession} ${culturalStyle}`;
        const fabricDesign = resolveEffectiveFabricDesign(renderConfig, styleText);
        const palette = getPalette(renderConfig);
        const isWrapper = descriptor.kind === 'wrapper';
        const isAcademicGown = descriptor.kind === 'academic-gown';
        const isRobe = descriptor.kind === 'robe';
        const isGown = descriptor.kind === 'gown';
        const isPleated = !isLongGarment && /pleated|circle|event/.test(bottomClothing);
        const isPencil = !isLongGarment && /pencil|straight|corporate/.test(bottomClothing) && !isWrapper;
        const svgWidth = sideView ? 112 : 128;
        const svgHeight = Math.max(52, Math.round(coverage + 12));
        const topY = 3;
        const hemY = svgHeight - 5;
        const frontProjection = sideView
            ? clamp(
                Math.max(0, Number(sideLandmarks?.abdomenProjection) || 0) * 9
                    + Math.max(0, Number(sideLandmarks?.abdomenWidth) || 0) * 4
                    + Math.max(0, Number(sideLandmarks?.hipWidth) || 0) * 3,
                0,
                15
            )
            : 0;
        const rearProjection = sideView
            ? clamp(
                Math.max(0, Number(sideLandmarks?.buttockProjection) || 0) * 8
                    + Math.max(0, Number(sideLandmarks?.hipWidth) || 0) * 3,
                0,
                12
            )
            : 0;
        const topLeft = sideView
            ? (isLongGarment ? 24 : 28)
            : (isAcademicGown ? 7 : (isRobe ? 8 : (isGown ? 10 : (isWrapper ? 7 : 10))));
        const topRight = sideView
            ? (isLongGarment ? 87 : 83)
            : svgWidth - topLeft;
        const hipLeft = sideView
            ? (isLongGarment
                ? clamp(15 - rearProjection, 4, 18)
                : clamp(19 - rearProjection, 7, 22))
            : (isAcademicGown ? 1 : (isRobe ? 3 : (isGown ? 5 : (isPleated ? 2 : (isWrapper ? 4 : 6)))));
        const hipRight = sideView
            ? (isLongGarment
                ? clamp(97 + frontProjection, 94, 110)
                : clamp(93 + frontProjection, 91, 108))
            : svgWidth - hipLeft;
        const hemLeft = sideView
            ? (isAcademicGown ? 4 : (isRobe ? 8 : (isGown ? 11 : (isPleated ? 10 : (isWrapper ? 15 : (isPencil ? 25 : 19))))))
            : (isAcademicGown ? 0 : (isRobe ? 3 : (isGown ? 6 : (isPleated ? 1 : (isWrapper ? 7 : (isPencil ? 17 : 10))))));
        const hemRight = sideView
            ? (isAcademicGown ? 109 : (isRobe ? 105 : (isGown ? 102 : (isPleated ? 105 : (isWrapper ? 99 : (isPencil ? 88 : 95))))))
            : svgWidth - hemLeft;
        const upperCurveY = Math.max(24, svgHeight * 0.24);
        const lowerCurveY = Math.max(upperCurveY + 18, svgHeight * 0.70);
        const topControlLeft = sideView ? topLeft + 15 : (isLongGarment ? 35 : 32);
        const topControlRight = sideView ? topRight - 14 : (isLongGarment ? 93 : 96);
        const hemControlLeft = sideView ? hemLeft + 18 : (isLongGarment ? 31 : 35);
        const hemControlRight = sideView ? hemRight - 18 : (isLongGarment ? 97 : 93);
        const garmentPath = [
            `M${topLeft} ${topY + 4}`,
            `C${topControlLeft} ${topY - 1} ${topControlRight} ${topY - 1} ${topRight} ${topY + 4}`,
            `C${hipRight + 2} ${upperCurveY} ${hemRight + 2} ${lowerCurveY} ${hemRight} ${hemY}`,
            `C${hemControlRight} ${hemY + 3} ${hemControlLeft} ${hemY + 3} ${hemLeft} ${hemY}`,
            `C${hemLeft - 2} ${lowerCurveY} ${hipLeft - 2} ${upperCurveY} ${topLeft} ${topY + 4}`,
            'Z'
        ].join(' ');
        const companionRole = isLongGarment ? 'continuous-body-drape' : 'continuous-lower-garment';
        const clipId = `${companionRole}-clip`;
        const pattern = renderFabricDesignMarkup(fabricDesign, {
            role: `${companionRole}-fabric-design`,
            x1: 10,
            x2: svgWidth - 10,
            y1: Math.max(15, svgHeight * 0.08),
            y2: Math.max(34, svgHeight - 11),
            compact: false
        });
        const longGarmentFolds = isLongGarment
            ? (sideView
                ? `<path id="continuous-side-long-garment-folds" data-svg-african-role="${descriptor.kind}-folds side-profile-folds full-length-folds no-center-seam" d="M${topLeft + 11} 15 C${hipLeft + 13} ${upperCurveY.toFixed(1)} ${hemLeft + 15} ${lowerCurveY.toFixed(1)} ${hemLeft + 11} ${hemY - 4} M${topRight - 9} 15 C${hipRight - 12} ${upperCurveY.toFixed(1)} ${hemRight - 14} ${lowerCurveY.toFixed(1)} ${hemRight - 10} ${hemY - 4}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".15" stroke-linecap="round"/>`
                : `<path id="continuous-long-garment-folds" data-svg-african-role="${descriptor.kind}-folds full-length-folds no-center-seam" d="M25 15 C20 ${upperCurveY.toFixed(1)} 18 ${lowerCurveY.toFixed(1)} ${hemLeft + 13} ${hemY - 4} M45 18 C41 ${upperCurveY.toFixed(1)} 39 ${lowerCurveY.toFixed(1)} 35 ${hemY - 3} M83 18 C87 ${upperCurveY.toFixed(1)} 89 ${lowerCurveY.toFixed(1)} 93 ${hemY - 3} M103 15 C108 ${upperCurveY.toFixed(1)} 110 ${lowerCurveY.toFixed(1)} ${hemRight - 13} ${hemY - 4}" fill="none" stroke="#ffffff" stroke-width="1.15" opacity=".14" stroke-linecap="round"/>`)
            : '';
        const sideFolds = isLongGarment
            ? longGarmentFolds
            : sideView
            ? (isPleated
                ? `<path id="continuous-side-skirt-pleats" data-svg-african-role="skirt-pleats side-profile-folds no-center-seam" d="M${topLeft + 10} 13 C${hipLeft + 13} ${upperCurveY.toFixed(1)} ${hemLeft + 13} ${lowerCurveY.toFixed(1)} ${hemLeft + 9} ${hemY - 3} M${topRight - 8} 13 C${hipRight - 11} ${upperCurveY.toFixed(1)} ${hemRight - 13} ${lowerCurveY.toFixed(1)} ${hemRight - 9} ${hemY - 3}" fill="none" stroke="#ffffff" stroke-width="1.05" opacity=".14" stroke-linecap="round"/>`
                : isWrapper
                    ? `<path id="continuous-side-wrapper-folds" data-svg-african-role="wrapper-folds side-profile-folds no-center-seam" d="M${topLeft + 8} 13 C${hipLeft + 10} ${upperCurveY.toFixed(1)} ${hemLeft + 9} ${lowerCurveY.toFixed(1)} ${hemLeft + 7} ${hemY - 3} M${topRight - 7} 13 C${hipRight - 8} ${upperCurveY.toFixed(1)} ${hemRight - 9} ${lowerCurveY.toFixed(1)} ${hemRight - 7} ${hemY - 3}" fill="none" stroke="#ffffff" stroke-width="1.05" opacity=".14" stroke-linecap="round"/>`
                    : `<path id="continuous-side-skirt-shaping" data-svg-african-role="skirt-side-shaping side-profile-folds no-center-seam" d="M${topLeft + 7} 13 C${hipLeft + 8} ${upperCurveY.toFixed(1)} ${hemLeft + 7} ${lowerCurveY.toFixed(1)} ${hemLeft + 6} ${hemY - 3} M${topRight - 7} 13 C${hipRight - 8} ${upperCurveY.toFixed(1)} ${hemRight - 7} ${lowerCurveY.toFixed(1)} ${hemRight - 6} ${hemY - 3}" fill="none" stroke="#ffffff" stroke-width=".9" opacity=".11" stroke-linecap="round"/>`)
            : isPleated
                ? `<path id="continuous-skirt-pleats" data-svg-african-role="skirt-pleats side-folds no-center-seam" d="M24 14 C20 ${upperCurveY.toFixed(1)} 17 ${lowerCurveY.toFixed(1)} 13 ${hemY - 3} M44 12 C39 ${upperCurveY.toFixed(1)} 35 ${lowerCurveY.toFixed(1)} 31 ${hemY - 2} M84 12 C89 ${upperCurveY.toFixed(1)} 93 ${lowerCurveY.toFixed(1)} 97 ${hemY - 2} M104 14 C108 ${upperCurveY.toFixed(1)} 111 ${lowerCurveY.toFixed(1)} 115 ${hemY - 3}" fill="none" stroke="#ffffff" stroke-width="1.05" opacity=".13" stroke-linecap="round"/>`
                : isWrapper
                    ? `<path id="continuous-wrapper-side-folds" data-svg-african-role="wrapper-folds side-folds no-center-seam" d="M27 13 C22 ${upperCurveY.toFixed(1)} 20 ${lowerCurveY.toFixed(1)} 15 ${hemY - 3} M101 13 C106 ${upperCurveY.toFixed(1)} 108 ${lowerCurveY.toFixed(1)} 113 ${hemY - 3}" fill="none" stroke="#ffffff" stroke-width="1.05" opacity=".14" stroke-linecap="round"/>`
                    : `<path id="continuous-skirt-side-shaping" data-svg-african-role="skirt-side-shaping no-center-seam" d="M24 13 C20 ${upperCurveY.toFixed(1)} 20 ${lowerCurveY.toFixed(1)} ${hemLeft + 5} ${hemY - 3} M104 13 C108 ${upperCurveY.toFixed(1)} 108 ${lowerCurveY.toFixed(1)} ${hemRight - 5} ${hemY - 3}" fill="none" stroke="#ffffff" stroke-width=".9" opacity=".10" stroke-linecap="round"/>`;
        const wrapperDetail = isWrapper
            ? `<path id="continuous-wrapper-overlap" data-svg-african-role="wrapper-overlap side-wrap-fold no-center-slit" d="M${topRight - 11} ${topY + 7} C${topRight - 4} ${upperCurveY.toFixed(1)} ${hemRight - 5} ${lowerCurveY.toFixed(1)} ${hemRight - 7} ${hemY - 4}" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".42" stroke-linecap="round"/>`
            : '';
        const longGarmentDetail = isAcademicGown
            ? `<path id="continuous-academic-gown-trim" data-svg-african-role="academic-gown graduation-gown hem-trim no-center-seam" d="M${hemLeft + 3} ${hemY - 8} C${hemControlLeft} ${hemY - 5} ${hemControlRight} ${hemY - 5} ${hemRight - 3} ${hemY - 8}" fill="none" stroke="var(--accent)" stroke-width="2.5" opacity=".82" stroke-linecap="round"/>`
            : (isRobe
                ? `<path id="continuous-robe-side-borders" data-svg-african-role="robe long-robe side-borders no-center-seam" d="M${topLeft + 8} 15 C${hipLeft + 9} ${upperCurveY.toFixed(1)} ${hemLeft + 9} ${lowerCurveY.toFixed(1)} ${hemLeft + 7} ${hemY - 5} M${topRight - 8} 15 C${hipRight - 9} ${upperCurveY.toFixed(1)} ${hemRight - 9} ${lowerCurveY.toFixed(1)} ${hemRight - 7} ${hemY - 5}" fill="none" stroke="var(--accent)" stroke-width="1.7" opacity=".48" stroke-linecap="round"/>`
                : (isGown
                    ? `<path id="continuous-gown-drape-lines" data-svg-african-role="gown linen-drape soft-drape no-center-seam" d="M${topLeft + 10} 16 C${hipLeft + 13} ${upperCurveY.toFixed(1)} ${hemLeft + 12} ${lowerCurveY.toFixed(1)} ${hemLeft + 10} ${hemY - 5} M${topRight - 10} 16 C${hipRight - 13} ${upperCurveY.toFixed(1)} ${hemRight - 12} ${lowerCurveY.toFixed(1)} ${hemRight - 10} ${hemY - 5}" fill="none" stroke="var(--accent)" stroke-width="1.3" opacity=".34" stroke-linecap="round"/>`
                    : ''));
        const mirrorTransform = sideView && sideFacing === 'left'
            ? ` transform="translate(${svgWidth} 0) scale(-1 1)"`
            : '';
        const viewRoles = sideView
            ? `side-profile-drape side-facing-${sideFacing} mirrored-side-pair hip-following-side-garment${isLongGarment ? ' side-profile-body-drape' : ''}`
            : `front-back-three-quarter-drape${isLongGarment ? ' full-length-body-drape' : ''}`;
        const continuityRoles = isLongGarment
            ? `continuous-body-drape full-length-garment ${descriptor.kind}-panel`
            : 'continuous-lower-garment waist-to-hem';
        const body = `
<defs><clipPath id="${clipId}"><path d="${garmentPath}"/></clipPath></defs>
<g ${styleVars(palette)} data-svg-african-role="${continuityRoles} svg-african-garment-companion ${bottomClothing} ${skirtLength} ${viewRoles} no-center-slit no-center-seam legs-move-under-garment">
    <g id="${companionRole}-view"${mirrorTransform}>
    <path id="${companionRole}-base" d="${garmentPath}" fill="var(--skirt)" filter="url(#softShadow)"/>
    <path id="${companionRole}-side-shade" d="M${topRight - 17} ${topY + 5} C${hipRight - 7} ${upperCurveY.toFixed(1)} ${hemRight - 6} ${lowerCurveY.toFixed(1)} ${hemRight - 4} ${hemY - 1} C${hemRight - 17} ${hemY + 1} ${hemRight - 24} ${hemY} ${hemRight - 30} ${hemY - 1} C${hemRight - 27} ${lowerCurveY.toFixed(1)} ${topRight - 25} ${upperCurveY.toFixed(1)} ${topRight - 17} ${topY + 5} Z" fill="#000000" opacity=".075" clip-path="url(#${clipId})"/>
    <g clip-path="url(#${clipId})">${pattern}</g>
    ${sideFolds}
    ${wrapperDetail}
    ${longGarmentDetail}
    <path id="${companionRole}-waist" data-svg-african-role="waistband starts-at-waist" d="M${topLeft + 1} ${topY + 6} C${topControlLeft} ${topY + 1} ${topControlRight} ${topY + 1} ${topRight - 1} ${topY + 6}" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".52" stroke-linecap="round"/>
    <path id="${companionRole}-hem" data-svg-african-role="garment-hem no-center-slit" d="M${hemLeft + 2} ${hemY - 1} C${hemControlLeft} ${hemY + 1} ${hemControlRight} ${hemY + 1} ${hemRight - 2} ${hemY - 1}" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity=".66" stroke-linecap="round"/>
    </g>
</g>`;
        const rawSvg = svgShell(companionRole, svgWidth, svgHeight, body, palette)
            .replace(/<svg\b/, `<svg data-svg-african-artwork-source="runtime-garment-companion" data-svg-african-view="${asset.view}"`);
        const SvgUtils = globalThis.SvgCharacterUtils;
        const namespace = `${instanceId || 'svgaf-premium'}-${asset.id}-${companionRole}`
            .replace(/[^a-zA-Z0-9_-]+/g, '-');
        const svg = SvgUtils?.namespaceSvg ? SvgUtils.namespaceSvg(rawSvg, namespace) : rawSvg;
        SvgUtils?.assertSafeGeneratedSvg?.(svg);
        const imageSrc = SvgUtils?.svgToDataUrl
            ? SvgUtils.svgToDataUrl(svg)
            : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const garmentKind = isLongGarment
            ? descriptor.kind
            : (isWrapper ? 'wrapper' : (isPleated ? 'pleated-skirt' : 'skirt'));
        const garmentPolicy = globalThis.ArmatureGarmentPolicies?.resolve?.({
            adapterId: descriptor.adapterId,
            kind: garmentKind,
            bottomClothing,
            outfit,
            profession,
            culturalStyle,
            viewFamily: sideView ? 'side' : 'front-back-three-quarter'
        }) || {
            version: 2,
            adapterId: descriptor.adapterId,
            motionPolicy: isAcademicGown || isGown ? 'gown-sway' : (isRobe ? 'robe-sway' : (isWrapper ? 'waist-drape' : 'waist-drape-light')),
            layerPolicy: isLongGarment ? 'body-drape' : 'lower-over-legs',
            deformationPolicy: isAcademicGown || isGown ? 'gown-panel' : (isRobe ? 'robe-panel' : (sideView ? 'side-profile-waist-to-hem' : 'waist-to-hem'))
        };
        return {
            roleKey: isLongGarment ? 'svg-african-body-drape' : 'svg-african-lower-garment',
            slotKey: 'lower',
            kind: garmentKind,
            continuityType: descriptor.continuityType,
            assetId: asset.id,
            view: asset.view,
            bottomClothing,
            skirtLength,
            coverage,
            coverageRatio: svgHeight / 260,
            viewFamily: sideView ? 'side' : 'front-back-three-quarter',
            sideFacing,
            sidePaddingRatio: sideView
                ? (isLongGarment ? (isAcademicGown ? 0.11 : 0.085) : (isWrapper ? 0.075 : (isPleated ? 0.065 : 0.045)))
                : (isLongGarment ? (isAcademicGown ? 0.16 : 0.13) : (isWrapper ? 0.12 : (isPleated ? 0.10 : 0.055))),
            torsoWidthRatio: sideView
                ? clamp(
                    (isLongGarment ? (isAcademicGown ? 0.92 : 0.86) : (isWrapper ? 0.82 : (isPleated ? 0.80 : 0.72)))
                        + Math.max(0, Number(sideLandmarks?.abdomenProjection) || 0) * 0.07
                        + Math.max(0, Number(sideLandmarks?.buttockProjection) || 0) * 0.04,
                    0.70,
                    isLongGarment ? 1.04 : 0.94
                )
                : (isLongGarment ? (isAcademicGown ? 1.08 : 1.0) : (isWrapper ? 0.94 : (isPleated ? 0.92 : 0.84))),
            centerOffsetRatio: 0,
            parentAnchorY: sideView ? 0.79 : (isLongGarment ? 0.82 : 0.84),
            topOverlapRatio: sideView ? (isLongGarment ? 0.035 : 0.025) : (isLongGarment ? 0.03 : 0.018),
            garmentPolicy,
            svg,
            imageSrc
        };
    }

    function renderContinuousGarmentSpecs(assetId, config = {}, instanceId = '', options = {}) {
        return [
            renderContinuousGarmentSpec(assetId, config, instanceId, options),
            renderContinuousOuterGarmentSpec(assetId, config, instanceId, options)
        ].filter(spec => spec?.imageSrc);
    }

    // Kept for saved code blocks and third-party integrations created before
    // full-length robe companions were introduced.
    function renderContinuousLowerGarmentSpec(assetId, config = {}, instanceId = '', options = {}) {
        return renderContinuousGarmentSpec(assetId, config, instanceId, options);
    }

    function renderRearBobHair(hair, hairLift = 0) {
        const compactBob = hair === 'pixie-cut';
        const bottomY = compactBob ? 111 : 134;
        const sideLift = compactBob ? 82 : 108;
        return `<path id="back-bob-hair" data-svg-african-role="hair hair-back back-view-premium bob-hair ${hair} full-scalp-cover ear-framing" d="M8 ${(52 + hairLift).toFixed(1)} C7 22 25 6 49 6 C74 6 91 22 90 ${(52 + hairLift).toFixed(1)} C91 ${(78 + hairLift * 0.3).toFixed(1)} 82 ${sideLift} 69 ${bottomY} C58 ${(bottomY - 8).toFixed(1)} 40 ${(bottomY - 8).toFixed(1)} 29 ${bottomY} C16 ${sideLift} 7 ${(78 + hairLift * 0.3).toFixed(1)} 8 ${(52 + hairLift).toFixed(1)} Z" fill="var(--hair)"/>
    <path id="back-bob-under-curve" data-svg-african-role="hair hair-back bob-under-curve" d="M23 ${(bottomY - 8).toFixed(1)} C36 ${(bottomY - 1).toFixed(1)} 62 ${(bottomY - 1).toFixed(1)} 75 ${(bottomY - 8).toFixed(1)}" fill="none" stroke="var(--hair-light)" stroke-width="1.45" opacity=".17" stroke-linecap="round"/>
    ${hair === 'side-part-bob' ? '<path id="back-side-part-bob-crown" data-svg-african-role="hair-detail side-part-bob crown-only no-face-crossing" d="M35 24 C48 16 67 18 80 29" fill="none" stroke="var(--hair-light)" stroke-width="1.4" opacity=".17" stroke-linecap="round"/>' : ''}`;
    }

    function renderBackHeadwearScalpUnderlay(headwear, extraRole = '') {
        const safeId = String(headwear || 'headwear').replace(/[^a-zA-Z0-9_-]+/g, '-');
        return `<path id="back-${safeId}-scalp-underlay" data-svg-african-role="headwear-underlay back-headwear-underlay ${extraRole} on-scalp sealed-scalp-base no-scalp-opening full-scalp-cover continuous-scalp-cover rear-scalp-coverage" d="M9 53 C8 22 25 4 49 4 C75 4 92 22 91 53 C80 64 19 64 9 53 Z" fill="var(--headwear)" opacity="1"/>`;
    }

    function renderClosedBackGeneralHeadwearMarkup(headwear) {
        const safeId = String(headwear || 'headwear').replace(/[^a-zA-Z0-9_-]+/g, '-');
        let markup = '';
        if (headwear === 'construction-helmet') {
            markup = `<path id="back-construction-helmet-shell" data-svg-african-role="back-headwear-crown construction-helmet safety-helmet engineer hard-hat closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M4 55 C4 24 23 2 50 2 C78 2 95 24 96 55 C78 63 23 63 4 55 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-construction-helmet-lower-margin" data-svg-african-role="construction-helmet rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M7 54 C25 61 75 61 93 54" fill="none" stroke="var(--headwear-shade)" stroke-width="3.8" opacity=".95" stroke-linecap="round"/>
        <path id="back-construction-helmet-ridge" data-svg-african-role="construction-helmet safety-ridge subtle-cap-detail no-translucent-center" d="M50 6 C47 21 47 39 50 54 M22 31 C39 25 63 25 80 31" fill="none" stroke="var(--accent)" stroke-width="1.65" opacity=".38" stroke-linecap="round"/>`;
        } else if (headwear === 'chef-hat') {
            markup = `<path id="back-chef-hat-full-scalp-seal" data-svg-african-role="back-headwear-crown chef-hat toque full-scalp-cover full-hair-coverage no-scalp-gap closed-rear-cap" d="M1 57 C-1 24 19 -2 49 -2 C80 -2 99 24 97 58 C78 65 21 65 1 57 Z" fill="var(--headwear)" stroke="var(--headwear)" stroke-width="3" stroke-linejoin="round" opacity="1"/>
        <path id="back-chef-hat-puff" data-svg-african-role="back-headwear-crown chef-hat toque puffed-top closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below full-hair-coverage" d="M2 56 C-1 38 9 20 25 18 C31 3 47 0 58 9 C70 3 88 14 89 31 C100 35 101 51 91 59 C70 65 25 65 5 59 C3 58 2 57 2 56 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-chef-hat-lower-margin" data-svg-african-role="chef-hat rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M11 56 C29 62 70 62 88 56" fill="none" stroke="var(--headwear-shade)" stroke-width="3.2" opacity=".85" stroke-linecap="round"/>
        <path id="back-chef-hat-folds" data-svg-african-role="chef-hat soft-folds subtle-cap-detail no-translucent-center" d="M28 24 C25 35 26 45 31 54 M49 10 C47 27 47 42 50 55 M72 24 C75 35 74 45 69 54" fill="none" stroke="var(--accent)" stroke-width="1.35" opacity=".22" stroke-linecap="round"/>`;
        } else if (headwear === 'pilot-cap') {
            markup = `<path id="back-pilot-cap-crown" data-svg-african-role="back-headwear-crown pilot-cap officer-cap closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M6 54 C7 25 26 5 50 5 C75 5 93 25 94 54 C76 62 24 62 6 54 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-pilot-cap-lower-margin" data-svg-african-role="pilot-cap rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M9 53 C28 60 72 60 91 53" fill="none" stroke="var(--headwear-shade)" stroke-width="3.6" opacity=".96" stroke-linecap="round"/>
        <path id="back-pilot-cap-piping" data-svg-african-role="pilot-cap gold-piping subtle-cap-detail no-translucent-center" d="M13 42 C31 34 69 34 86 42" fill="none" stroke="var(--accent)" stroke-width="2.1" opacity=".78" stroke-linecap="round"/>`;
        } else if (headwear === 'security-cap') {
            markup = `<path id="back-security-cap-crown" data-svg-african-role="back-headwear-crown security-cap peaked-cap closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M6 55 C7 26 26 5 50 5 C75 5 93 26 94 55 C76 62 24 62 6 55 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-security-cap-lower-margin" data-svg-african-role="security-cap rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M9 54 C28 61 72 61 91 54" fill="none" stroke="var(--headwear-shade)" stroke-width="3.6" opacity=".96" stroke-linecap="round"/>
        <path id="back-security-cap-badge" data-svg-african-role="security-cap rear-badge subtle-cap-detail no-translucent-center" d="M50 37 L54 44 L50 51 L46 44 Z" fill="var(--accent)" opacity=".82"/>`;
        } else if (headwear === 'baseball-cap') {
            markup = `<path id="back-baseball-cap-crown" data-svg-african-role="back-headwear-crown baseball-cap closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M6 55 C6 25 26 4 50 4 C75 4 94 25 94 55 C76 62 24 62 6 55 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-baseball-cap-lower-margin" data-svg-african-role="baseball-cap rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M9 54 C28 61 72 61 91 54" fill="none" stroke="var(--headwear-shade)" stroke-width="3.3" opacity=".90" stroke-linecap="round"/>
        <path id="back-baseball-cap-seam" data-svg-african-role="baseball-cap seam subtle-cap-detail no-translucent-center" d="M50 7 C46 23 46 40 50 55 M22 34 C39 28 63 28 79 34" fill="none" stroke="var(--accent)" stroke-width="1.3" opacity=".28" stroke-linecap="round"/>`;
        } else if (headwear === 'beanie') {
            markup = `<path id="back-beanie-crown" data-svg-african-role="back-headwear-crown beanie knit-cap closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M7 57 C5 28 24 5 49 5 C75 5 93 28 91 57 C74 64 25 64 7 57 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-beanie-lower-margin" data-svg-african-role="beanie rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M10 55 C29 62 70 62 89 55" fill="none" stroke="var(--headwear-shade)" stroke-width="3.1" opacity=".72" stroke-linecap="round"/>
        <path id="back-beanie-ribbing" data-svg-african-role="beanie ribbing subtle-cap-detail no-translucent-center" d="M24 43 L24 58 M38 40 L38 60 M52 40 L52 60 M66 40 L66 58 M80 44 L80 56" fill="none" stroke="var(--headwear-shade)" stroke-width="1.5" opacity=".46" stroke-linecap="round"/>`;
        } else if (headwear === 'fedora' || headwear === 'wide-brim-hat') {
            const wide = headwear === 'wide-brim-hat';
            markup = `<path id="back-${safeId}-crown" data-svg-african-role="back-headwear-crown ${headwear} structured-hat closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M14 50 C13 23 31 4 50 4 C70 4 87 23 86 50 C68 58 32 58 14 50 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-${safeId}-lower-margin" data-svg-african-role="${headwear} rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M19 48 C36 55 64 55 81 48" fill="none" stroke="var(--headwear-shade)" stroke-width="3.4" opacity=".92" stroke-linecap="round"/>
        <path id="back-${safeId}-brim" data-svg-african-role="${headwear} rear-brim worn-over-scalp no-translucent-center" d="${wide ? 'M0 51 C20 42 80 42 99 51 C78 61 21 61 0 51 Z' : 'M5 50 C24 43 75 43 94 50 C77 59 22 59 5 50 Z'}" fill="var(--headwear-shade)" opacity=".98"/>`;
        } else if (headwear === 'cloche-hat' || headwear === 'bucket-hat') {
            markup = `<path id="back-${safeId}-bell" data-svg-african-role="back-headwear-crown ${headwear} bell-hat closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M6 56 C6 25 26 4 50 4 C75 4 94 25 94 56 C76 63 24 63 6 56 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-${safeId}-lower-margin" data-svg-african-role="${headwear} rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M9 55 C28 62 72 62 91 55" fill="none" stroke="var(--headwear-shade)" stroke-width="3.2" opacity=".86" stroke-linecap="round"/>`;
        } else if (headwear === 'top-hat') {
            markup = `<path id="back-top-hat-crown" data-svg-african-role="back-headwear-crown top-hat structured-hat closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M20 10 C38 2 63 2 81 10 L82 51 C65 58 35 58 19 51 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-top-hat-lower-margin" data-svg-african-role="top-hat rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M23 50 C39 57 62 57 78 50" fill="none" stroke="var(--headwear-shade)" stroke-width="3.4" opacity=".92" stroke-linecap="round"/>
        <path id="back-top-hat-brim" data-svg-african-role="top-hat rear-brim worn-over-scalp no-translucent-center" d="M7 54 C26 47 74 47 93 54 C77 63 23 63 7 54 Z" fill="var(--headwear-shade)" opacity=".98"/>`;
        } else {
            markup = `<path id="back-${safeId}-closed-crown" data-svg-african-role="back-headwear-crown ${headwear} closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M6 55 C6 25 26 4 50 4 C75 4 94 25 94 55 C76 62 24 62 6 55 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-${safeId}-lower-margin" data-svg-african-role="${headwear} rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M9 54 C28 61 72 61 91 54" fill="none" stroke="var(--headwear-shade)" stroke-width="3.2" opacity=".92" stroke-linecap="round"/>`;
        }
        return `<g id="back-${safeId}-closed-headwear" data-svg-african-role="headwear back-headwear general-hat regional-headwear ${headwear} structured-cap layer-over-hair closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline continuous-scalp-cover no-scalp-opening no-translucent-center hair-visible-below single-curved-lower-margin above-ears worn-over-scalp back-view-premium">
        ${markup}
    </g>`;
    }

    function renderBackHeadwearMarkup(headwear, options = {}) {
        const isNiqab = !!options.isNiqab;
        const isModestHeadwear = !!options.isModestHeadwear;
        if (headwear === 'none') return '';
        if (isNiqab) {
            return `<path id="back-niqab" data-svg-african-role="headwear back-headwear niqab full-head-cover full-neck-cover back-view-premium" d="M8 48 C8 20 25 7 49 7 C74 7 90 20 90 48 L90 146 L8 146 Z" fill="var(--headwear)"/>
    <path id="back-niqab-crown" data-svg-african-role="headwear-fold niqab rear-crown" d="M16 39 C28 30 70 30 82 39" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".22"/>`;
        }
        if (isModestHeadwear) {
            return `<path id="back-hijab" data-svg-african-role="headwear back-headwear modest-headwear full-scalp-cover continuous-scalp-cover neck-cover back-view-premium ${headwear}" d="M6 50 C6 19 25 5 49 5 C75 5 92 19 92 50 C92 83 82 120 69 146 L29 146 C16 120 6 83 6 50 Z" fill="var(--headwear)"/>
    <path id="back-hijab-fold" data-svg-african-role="headwear-fold back-hijab-fold cloth-drape" d="M20 61 C24 96 31 123 41 146 M78 61 C74 96 67 123 57 146 M26 43 C40 35 60 35 74 43" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity=".28" stroke-linecap="round"/>`;
        }
        if (headwear === 'academic-cap') {
            return `<g id="back-academic-cap-headwear" data-svg-african-role="headwear back-headwear academic-cap mortarboard full-scalp-cover continuous-scalp-cover back-view-premium">
        ${renderBackHeadwearScalpUnderlay(headwear, 'academic-cap skullcap')}
        <path id="back-academic-scalp-cap" data-svg-african-role="academic-cap skullcap full-scalp-cover" d="M13 56 C12 34 27 18 49 16 C73 18 88 34 87 56 C72 50 61 47 49 47 C37 47 27 50 13 56 Z" fill="var(--headwear-shade)"/>
        <path id="back-mortarboard-shadow" data-svg-african-role="academic-cap square-cap rear-board shadow" d="M10 32 L50 12 L91 32 L50 51 Z" fill="rgba(0,0,0,.28)"/>
        <path id="back-mortarboard" data-svg-african-role="academic-cap square-cap rear-board" d="M8 28 L50 7 L94 29 L50 50 Z" fill="var(--headwear)"/>
        <path id="back-academic-band" data-svg-african-role="academic-cap rear-band full-scalp-cover" d="M20 47 C35 40 65 40 80 47 L79 58 C64 53 35 53 20 58 Z" fill="var(--headwear-shade)"/>
        <path id="back-academic-tassel-tail" data-svg-african-role="academic-cap tassel side-face-drop above-ear" d="M50 10 C62 18 75 25 80 37 C83 48 82 58 78 68 M78 67 C82 71 83 76 83 81 M78 67 C77 73 76 78 76 83" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'niger-delta-bowler' || headwear === 'bowler-hat') {
            return `<g id="back-bowler-headwear" data-svg-african-role="headwear back-headwear regional-headwear ${headwear} niger-delta-bowler bowler-hat structured-hat full-scalp-cover continuous-scalp-cover back-view-premium">
        ${renderBackHeadwearScalpUnderlay(headwear, 'niger-delta-bowler bowler-hat structured-hat')}
        <path id="back-bowler-crown" data-svg-african-role="bowler-crown crown full-scalp-cover rear-crown" d="M17 45 C16 19 31 6 49 6 C68 6 82 19 82 45 C66 39 33 39 17 45 Z" fill="var(--headwear)"/>
        <path id="back-bowler-highlight" d="M27 19 C40 12 59 12 72 20" fill="none" stroke="#ffffff" stroke-width="1.7" opacity=".14" stroke-linecap="round"/>
        <path id="back-bowler-band" data-svg-african-role="bowler-band rear-band" d="M19 38 C35 43 63 43 80 38" fill="none" stroke="#1c1b1f" stroke-width="4.2" opacity=".92" stroke-linecap="round"/>
        <path id="back-bowler-brim" data-svg-african-role="bowler-brim rear-brim" d="M5 47 C23 37 75 37 93 47 C77 58 21 58 5 47 Z" fill="var(--headwear-shade)" opacity=".98"/>
    </g>`;
        }
        if (headwear === 'hausa-cap' || headwear === 'hausa-embroidered-cap' || headwear === 'kufi') {
            const isKufi = headwear === 'kufi';
            const embroidery = isKufi
                ? 'M24 39 C36 43 62 43 74 39 M31 28 L31 51 M43 25 L43 54 M55 25 L55 54 M67 28 L67 51'
                : 'M23 24 L23 52 M33 24 L33 56 M44 25 L44 58 M55 25 L55 58 M66 24 L66 56 M76 24 L76 52';
            return `<g id="back-hausa-headwear" data-svg-african-role="headwear back-headwear regional-headwear ${headwear} hausa-embroidered-cap hausa-cap embroidered-cylinder northern-cap full-scalp-cover continuous-scalp-cover back-view-premium">
        ${renderBackHeadwearScalpUnderlay(headwear, 'hausa-cap embroidered-cylinder northern-cap')}
        <path id="back-hausa-cylinder" data-svg-african-role="back-headwear-crown embroidered-cylinder full-scalp-cover" d="${isKufi ? 'M15 42 C18 25 31 15 49 15 C67 15 81 25 84 42 L83 54 C68 62 30 62 15 54 Z' : 'M15 18 C28 9 70 9 83 18 L85 53 C69 63 29 63 13 53 Z'}" fill="var(--headwear)"/>
        <path id="back-hausa-top" data-svg-african-role="northern-cap flat-top rear-top" d="${isKufi ? 'M17 41 C32 47 66 47 82 41' : 'M15 18 C29 8 69 8 83 18 C69 26 29 26 15 18 Z'}" fill="var(--headwear-shade)" opacity=".9"/>
        <path id="back-hausa-band" data-svg-african-role="back-headwear-band northern-cap gold-rim" d="M16 51 C32 58 68 58 84 51" fill="none" stroke="var(--accent)" stroke-width="2.35" opacity=".86" stroke-linecap="round"/>
        <path id="back-hausa-embroidery" data-svg-african-role="northern-cap rear-embroidery" d="${embroidery}" fill="none" stroke="var(--accent)" stroke-width="${headwear === 'hausa-embroidered-cap' ? '1.65' : '1.15'}" opacity="${headwear === 'hausa-embroidered-cap' ? '.78' : '.55'}" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'yoruba-fila' || headwear === 'fila' || headwear === 'abeti-aja') {
            const sideFlaps = headwear === 'abeti-aja'
                ? '<path id="back-abeti-aja-left-flap" data-svg-african-role="abeti-aja side-flap rear-ear-wing" d="M15 44 C3 49 2 63 14 69 C15 60 18 52 23 45 Z" fill="var(--headwear-shade)" opacity=".76"/><path id="back-abeti-aja-right-flap" data-svg-african-role="abeti-aja side-flap rear-ear-wing" d="M83 44 C96 49 97 63 85 69 C83 60 81 52 76 45 Z" fill="var(--headwear-shade)" opacity=".72"/>'
                : '<path id="back-fila-side-fold" data-svg-african-role="fila-side-fold rear-fold" d="M14 45 C23 52 34 53 44 48 C32 58 20 60 11 52 Z" fill="var(--headwear-shade)" opacity=".43"/>';
            return `<g id="back-fila-headwear" data-svg-african-role="headwear back-headwear regional-headwear ${headwear} yoruba-fila fila yoruba-cap folded-fila full-scalp-cover continuous-scalp-cover back-view-premium">
        ${renderBackHeadwearScalpUnderlay(headwear, 'yoruba-fila fila yoruba-cap')}
        <path id="back-fila-crown" data-svg-african-role="back-headwear-crown fila-crown full-scalp-cover" d="M9 48 C14 27 31 15 54 16 C73 17 86 30 89 49 C70 45 31 43 9 48 Z" fill="var(--headwear)"/>
        <path id="back-fila-fold" data-svg-african-role="folded-fila yoruba-cap asymmetric-fold" d="M24 21 C43 8 70 12 89 33 C68 28 47 30 23 41 Z" fill="var(--headwear-shade)" opacity=".72"/>
        ${sideFlaps}
        <path id="back-fila-band" data-svg-african-role="back-headwear-band beaded-band" d="M15 40 C32 33 68 34 85 42" fill="none" stroke="var(--accent)" stroke-width="2.7" opacity=".84" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'igbo-red-cap' || headwear === 'isi-agu-cap') {
            return `<g id="back-igbo-cap-headwear" data-svg-african-role="headwear back-headwear regional-headwear ${headwear} igbo-red-cap igbo-cap red-cap full-scalp-cover continuous-scalp-cover back-view-premium">
        ${renderBackHeadwearScalpUnderlay(headwear, 'igbo-red-cap igbo-cap red-cap')}
        <path id="back-igbo-cap" data-svg-african-role="back-headwear-crown igbo-cap red-cap flat-top full-scalp-cover" d="M11 46 L14 31 C21 19 36 13 53 14 C72 15 86 25 89 40 L89 49 C74 55 27 55 11 49 Z" fill="var(--headwear)"/>
        <path id="back-igbo-flat-top" data-svg-african-role="flat-top rear-top" d="M21 29 C35 18 66 18 81 31 C64 27 39 27 21 29 Z" fill="var(--headwear-shade)" opacity=".30"/>
        <path id="back-igbo-band" data-svg-african-role="back-headwear-band igbo-cap accent-band" d="M15 42 C32 49 68 49 86 42" fill="none" stroke="var(--accent)" stroke-width="2.6" opacity=".84" stroke-linecap="round"/>
        <circle id="back-igbo-button" cx="51" cy="18" r="2.1" fill="var(--accent)" opacity=".86"/>
    </g>`;
        }
        if (headwear === 'niger-delta-coral-crown' || headwear === 'edo-coral-cap' || headwear === 'crown-cap') {
            return `<g id="back-coral-cap-headwear" data-svg-african-role="headwear back-headwear regional-headwear ${headwear} coral-bead-cap edo-coral-cap full-scalp-cover continuous-scalp-cover back-view-premium">
        ${renderBackHeadwearScalpUnderlay(headwear, 'coral-bead-cap edo-coral-cap')}
        <path id="back-coral-cap-dome" data-svg-african-role="back-headwear-crown coral-cap-dome full-scalp-cover" d="M12 57 C10 34 25 15 49 13 C75 15 90 34 88 57 C74 51 62 48 49 48 C36 48 25 51 12 57 Z" fill="var(--headwear)"/>
        <path id="back-coral-band" data-svg-african-role="back-headwear-band coral-band front-band" d="M15 48 C31 41 67 41 84 48 L82 59 C65 54 34 54 16 59 Z" fill="var(--headwear-shade)" opacity=".94"/>
        <path id="back-coral-bead-row-upper" data-svg-african-role="coral-beadwork coral-bead-row" d="M21 40 C36 33 63 33 78 40" fill="none" stroke="var(--accent)" stroke-width="2.3" stroke-linecap="round"/>
        <path id="back-coral-bead-row-lower" data-svg-african-role="coral-beadwork coral-bead-row" d="M18 51 C34 45 66 45 82 51" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
        <circle cx="29" cy="44" r="1.7" fill="var(--accent)"/><circle cx="42" cy="40" r="1.7" fill="var(--accent)"/><circle cx="56" cy="40" r="1.7" fill="var(--accent)"/><circle cx="70" cy="44" r="1.7" fill="var(--accent)"/>
    </g>`;
        }
        if (headwear === 'gele' || headwear === 'wrapped-gele' || headwear === 'turban' || headwear === 'niger-delta-head-tie') {
            const isGele = headwear === 'gele' || headwear === 'wrapped-gele' || headwear === 'niger-delta-head-tie';
            return `<g id="back-headwrap-headwear" data-svg-african-role="headwear back-headwear premium-traditional-headwear ${headwear} ${isGele ? 'gele headwrap' : 'turban'} full-scalp-cover continuous-scalp-cover back-view-premium">
        ${renderBackHeadwearScalpUnderlay(headwear, isGele ? 'gele headwrap' : 'turban')}
        <path id="back-headwrap-crown" data-svg-african-role="back-headwear-crown headwrap-crown full-scalp-cover" d="${isGele ? 'M4 60 C3 28 25 4 54 4 C85 6 98 31 93 63 C77 49 25 48 4 60 Z' : 'M9 52 C9 29 27 10 50 9 C76 10 91 29 90 53 C75 46 63 43 50 43 C37 43 24 46 9 52 Z'}" fill="var(--headwear)"/>
        <path id="back-headwrap-wing-left" data-svg-african-role="headwrap-wing rear-cloth-fold" d="M8 56 C12 30 31 10 54 6 C34 24 23 43 20 66 C14 64 10 60 8 56 Z" fill="var(--headwear-shade)" opacity=".34"/>
        <path id="back-headwrap-wing-right" data-svg-african-role="headwrap-wing rear-cloth-fold" d="M92 57 C94 32 79 12 55 6 C72 24 81 45 78 67 C84 66 90 62 92 57 Z" fill="var(--headwear-shade)" opacity=".31"/>
        <path id="back-headwrap-fold-primary" data-svg-african-role="headwear-fold rear-pleat" d="M9 50 C30 29 70 19 93 37" fill="none" stroke="var(--accent)" stroke-width="${isGele ? '4.2' : '3.6'}" opacity=".76" stroke-linecap="round"/>
        <path id="back-headwrap-fold-secondary" data-svg-african-role="headwear-fold rear-pleat" d="M16 39 C39 53 63 53 86 38" fill="none" stroke="var(--accent)" stroke-width="2.7" opacity=".55" stroke-linecap="round"/>
        </g>`;
        }
        if (GENERAL_HATS.has(headwear) && headwear !== 'academic-cap' && headwear !== 'military-beret') {
            return renderClosedBackGeneralHeadwearMarkup(headwear);
        }
        if (headwear === 'military-beret') {
            return `<g id="back-military-beret-headwear" data-svg-african-role="headwear back-headwear general-hat military-beret beret soldier layer-over-hair closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline continuous-scalp-cover no-scalp-opening no-translucent-center hair-visible-below single-curved-lower-margin above-ears worn-over-scalp back-view-premium">
        <path id="back-military-beret-body" data-svg-african-role="back-headwear-crown military-beret beret-crown closed-rear-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening hair-visible-below" d="M5 54 C8 25 31 5 61 8 C82 10 95 27 93 53 C75 59 33 60 11 56 C7 56 5 55 5 54 Z" fill="var(--headwear)" opacity="1"/>
        <path id="back-military-beret-lower-margin" data-svg-african-role="back-headwear-band military-beret beret-band rear-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M11 53 C31 60 72 59 91 53" fill="none" stroke="var(--headwear-shade)" stroke-width="3.6" opacity=".96" stroke-linecap="round"/>
        <path id="back-military-beret-highlight" data-svg-african-role="military-beret subtle-cap-detail no-translucent-center" d="M23 36 C42 26 70 29 87 44" fill="none" stroke="#ffffff" stroke-width="1.25" opacity=".12" stroke-linecap="round"/>
    </g>`;
        }
        if (/cap|hat|helmet|beanie|fedora|beret|crown/.test(headwear)) {
            return renderClosedBackGeneralHeadwearMarkup(headwear);
        }
        return '';
    }

    function renderBackHeadNeck(config, p, options = {}) {
        const state = getFaceState(config, options.faceState);
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const hair = normalizeId(config.identity?.hair || config.hair, 'low-cut');
        const headwear = normalizeId(config.styling?.headwear || config.headwear, 'none');
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const ageGroup = normalizeId(config.identity?.ageGroup || config.ageGroup, 'adult');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const isModestHeadwear = MODEST_HEADWEAR.has(headwear);
        const isNiqab = headwear === 'niqab';
        const headNod = clamp(state.headNod, -8, 8);
        const headTilt = clamp(state.headTilt, -8, 8);
        const headWidth = getHeadWidthAdjustment(adjustments);
        const headHeight = getHeadHeightAdjustment(adjustments);
        const faceWidth = getAdjustmentValue(adjustments, 'faceWidth');
        const neckWidth = getNeckWidthAdjustment(adjustments);
        const neckHeight = getNeckHeightAdjustment(adjustments);
        const headRx = clamp(37.5 + headWidth * 11 + faceWidth * 4.5, 31, 46);
        const headTopY = clamp(7 - headHeight * 4, 2, 11);
        const headBaseY = clamp(108 + headHeight * 5, 102, 114);
        const neckHalf = clamp(14 + neckWidth * 5.5, 10, 20);
        const neckTopY = clamp(90 + neckHeight * 5, 84, 99);
        const neckBottomY = 146;
        const hairVolume = clamp(getAdjustmentValue(adjustments, 'hairVolume'), -0.35, 0.42);
        const hairLift = clamp(getAdjustmentValue(adjustments, 'hairlineHeight'), -0.35, 0.45) * -6;
        const headTransform = `translate(49 72) rotate(${headTilt.toFixed(2)}) translate(-49 -72) translate(0 ${(headNod * 0.16).toFixed(2)})`;
        const backHairMass = (() => {
            if (hair === 'bald' || isModestHeadwear || isNiqab) return '';
            if (AFRO_HAIRS.has(hair) || hair === 'afro-puff') {
                const puff = hair === 'afro-puff' ? '<circle id="back-afro-puff" cx="49" cy="13" r="15" fill="var(--hair)" opacity=".98"/>' : '';
                return `<path id="back-afro" data-svg-african-role="hair hair-back back-view-premium afro full-scalp-cover" d="M6 56 C4 25 22 4 49 4 C77 4 94 25 92 56 C90 86 75 114 49 116 C23 114 8 86 6 56 Z" fill="var(--hair)"/>${puff}`;
            }
            if (BOB_HAIRS.has(hair)) {
                return renderRearBobHair(hair, hairLift);
            }
            if (hair === 'natural-bun' || PONYTAIL_HAIRS.has(hair)) {
                const bun = hair === 'natural-bun' || hair === 'updo';
                const y = hair === 'low-ponytail' ? 88 : 45;
                return `<g data-svg-african-role="hair hair-back back-view-premium tied-hair ${hair}" data-svg-african-hair-style="${hair}">
    <path d="M10 53 C8 21 25 6 49 6 C74 6 90 21 88 53 C89 79 72 103 49 105 C26 103 9 79 10 53 Z" fill="var(--hair)"/>
    <path d="M18 36 Q49 12 80 36 M17 57 Q49 35 81 57" fill="none" stroke="var(--hair-light)" stroke-width="1.3" opacity=".35"/>
    ${bun ? '<ellipse data-svg-african-role="rear-bun" cx="49" cy="72" rx="19" ry="21" fill="var(--hair)" stroke="var(--hair-light)" stroke-width="1.4"/>' : `<path data-svg-african-role="rear-ponytail" d="M41 ${y} C31 ${y + 21} 39 118 34 142 Q49 151 64 142 C58 116 68 ${y + 21} 57 ${y} Z" fill="var(--hair)" stroke="var(--hair-light)" stroke-width="1"/><path d="M41 ${y + 3} Q49 ${y + 6} 57 ${y + 3}" fill="none" stroke="var(--hair-light)" stroke-width="3"/>`}
</g>`;
            }
            if (LONG_HAIRS.has(hair) || SIDE_BRAID_HAIRS.has(hair)) {
                const earCoverRole = LONG_HAIRS.has(hair) || SIDE_BRAID_HAIRS.has(hair)
                    ? 'ear-covering-hair rear-ear-cover'
                    : 'nape-hair ponytail-family';
                return `<path id="back-long-hair" data-svg-african-role="hair hair-back back-view-premium long-hair full-scalp-cover ${earCoverRole}" d="M8 ${(50 + hairLift).toFixed(1)} C7 20 24 5 49 5 C75 5 91 20 90 ${(50 + hairLift).toFixed(1)} C93 82 86 124 68 143 C59 136 40 136 30 143 C12 124 5 83 8 ${(50 + hairLift).toFixed(1)} Z" fill="var(--hair)"/>`;
            }
            if (LOC_TWIST_HAIRS.has(hair)) {
                const strandWidth = hair === 'sisterlocks' ? 2.7 : (hair === 'twists' || hair === 'flat-twist' ? 4.1 : 4.8);
                const strandOpacity = hair === 'sisterlocks' ? '.82' : '.90';
                return `<path id="back-locs-twists-long-hair" data-svg-african-role="hair hair-back back-view-premium locs-twists ${hair} long-rear-hair full-scalp-cover ear-covering-hair rear-ear-cover" d="M6 ${(51 + hairLift).toFixed(1)} C5 20 23 4 49 4 C76 4 93 20 92 ${(51 + hairLift).toFixed(1)} C94 84 86 127 72 145 C61 137 38 137 27 145 C12 127 4 84 6 ${(51 + hairLift).toFixed(1)} Z" fill="var(--hair)"/>
    <g id="back-locs-twists-long-strands" data-svg-african-role="hair hair-back back-view-premium back-locs-twists-long-strands long-rear-strands ${hair} ear-covering-hair rear-ear-cover" fill="none" stroke="var(--hair)" stroke-width="${strandWidth.toFixed(1)}" stroke-linecap="round" opacity="${strandOpacity}">
        <path d="M14 55 C9 81 13 113 25 143"/>
        <path d="M24 49 C19 79 22 114 33 143"/>
        <path d="M39 47 C35 78 38 112 44 139"/>
        <path d="M59 47 C63 78 60 112 54 139"/>
        <path d="M74 49 C79 79 76 114 65 143"/>
        <path d="M84 55 C89 81 85 113 73 143"/>
    </g>
    <path id="back-locs-twists-detail" data-svg-african-role="hair-detail locs-twists rear-texture subtle-scalp-lines no-scalp-stripe" d="M21 40 C34 25 63 25 77 40 M18 63 C34 54 64 54 81 63" fill="none" stroke="var(--hair-light)" stroke-width="1.1" opacity=".16" stroke-linecap="round"/>`;
            }
            if (BRAID_HAIRS.has(hair)) {
                const rearBraidPaths = hair === 'box-braids'
                    ? ['M13 52 C9 79 12 111 22 143', 'M29 48 C25 78 28 113 34 145', 'M69 48 C73 78 70 113 64 145', 'M85 52 C89 79 86 111 76 143']
                    : hair === 'fulani-braids'
                        ? ['M13 53 C9 78 12 107 22 137', 'M27 49 C23 78 27 111 34 143', 'M71 49 C75 78 71 111 64 143', 'M85 53 C89 78 86 107 76 137']
                        : ['M10 54 C6 78 9 109 19 140', 'M22 50 C17 78 20 113 29 145', 'M36 47 C32 79 35 115 40 144', 'M62 47 C66 79 63 115 58 144', 'M76 50 C81 78 78 113 69 145', 'M88 54 C92 78 89 109 79 140'];
                return `<g id="back-braided-hair" data-svg-african-role="hair hair-back back-view-premium braided full-scalp-cover ear-covering-hair rear-ear-cover ${hair}" data-svg-african-hair-style="${hair}">
    <path id="back-braided-cap" data-svg-african-role="hair-cap scalp-cover crown-cover braided-crown" d="M7 ${(55 + hairLift).toFixed(1)} C6 22 23 4 49 4 C76 4 92 22 91 ${(55 + hairLift).toFixed(1)} C89 78 74 104 49 108 C24 104 9 78 7 ${(55 + hairLift).toFixed(1)} Z" fill="var(--hair)"/>
    <path id="back-braid-root-sections" data-svg-african-role="back-hair-lines braid-roots crown-partings visible-braid-texture" d="M15 43 C24 23 35 11 48 5 M28 49 C35 27 42 12 49 5 M42 51 C46 28 48 13 49 5 M56 51 C53 28 51 13 50 5 M70 49 C63 27 57 12 50 5 M83 43 C74 23 63 11 50 5" fill="none" stroke="var(--hair-light)" stroke-width="1.25" opacity=".66" stroke-linecap="round"/>
    ${renderBraidedPlaits(`back-${hair}-plaits`, rearBraidPaths, { width: hair === 'box-braids' ? 5.5 : hair === 'fulani-braids' ? 4 : 4.45, detailWidth: 1.35, role: `rear-braid-plaits individual-braids segmented-braids ear-covering-hair ${hair}` })}
</g>`;
            }
            if (CORNROW_HAIRS.has(hair)) {
                return `<path id="back-braided-cap" data-svg-african-role="hair hair-back back-view-premium braided full-scalp-cover crown-only ears-visible ${hair}" data-svg-african-hair-style="${hair}" d="M8 ${(54 + hairLift).toFixed(1)} C7 22 24 5 49 5 C75 5 91 22 90 ${(54 + hairLift).toFixed(1)} C89 81 74 105 49 108 C24 105 9 81 8 ${(54 + hairLift).toFixed(1)} Z" fill="var(--hair)"/>
    <path id="back-braid-lines" data-svg-african-role="back-hair-lines crown-only ${hair}" d="M20 36 C30 17 39 8 49 5 M35 43 C40 22 45 11 49 5 M64 43 C59 22 54 11 49 5 M78 36 C68 17 58 8 49 5" fill="none" stroke="var(--hair-light)" stroke-width="1.15" opacity=".42" stroke-linecap="round"/>`;
            }
            return `<path id="back-scalp-hair" data-svg-african-role="hair hair-back back-view-premium full-scalp-cover" d="M10 ${(52 + hairLift).toFixed(1)} C10 21 25 6 49 6 C74 6 88 21 88 ${(52 + hairLift).toFixed(1)} C88 77 72 100 49 103 C26 100 10 77 10 ${(52 + hairLift).toFixed(1)} Z" fill="var(--hair)" opacity=".98"/>`;
        })();
        const rearHeadwear = renderBackHeadwearMarkup(headwear, { isModestHeadwear, isNiqab });
        const hairCoversRearEars = headwear === 'none' && (
            LONG_HAIRS.has(hair) ||
            SIDE_BRAID_HAIRS.has(hair) ||
            BRAID_HAIRS.has(hair) ||
            LOC_TWIST_HAIRS.has(hair)
        );
        const showRearEars = !(isModestHeadwear || isNiqab || hairCoversRearEars);
        const ears = showRearEars ? `
    <path id="back-ear-left" data-svg-african-role="ear back-ear visible-ear left" d="M12 61 C5 64 5 80 14 88 C22 87 25 78 23 67 C22 62 18 60 12 61 Z" fill="var(--skin)"/>
    <path id="back-ear-left-inner" data-svg-african-role="ear-detail back-ear visible-ear" d="M15 68 C12 73 13 80 17 83" fill="none" stroke="var(--skin-shade)" stroke-width="1.35" opacity=".26" stroke-linecap="round"/>
    <path id="back-ear-right" data-svg-african-role="ear back-ear visible-ear right" d="M86 61 C93 64 93 80 84 88 C76 87 73 78 75 67 C76 62 80 60 86 61 Z" fill="var(--skin)"/>
    <path id="back-ear-right-inner" data-svg-african-role="ear-detail back-ear visible-ear" d="M83 68 C86 73 85 80 81 83" fill="none" stroke="var(--skin-shade)" stroke-width="1.35" opacity=".26" stroke-linecap="round"/>`
            : '';
        const rearEarringMarkup = showRearEars && hasAccessory(config, 'earrings')
            ? `<g id="back-earrings" data-svg-african-role="accessory earrings rear-earrings back-view-accessory">
    <circle cx="14" cy="84" r="2.4" fill="var(--accent)"/>
    <path d="M14 86 C12 91 13 96 17 98 C20 95 20 90 17 87" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
    <circle cx="84" cy="84" r="2.4" fill="var(--accent)"/>
    <path d="M84 86 C86 91 85 96 81 98 C78 95 78 90 81 87" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linecap="round"/>
</g>`
            : '';
        const body = `
<g ${styleVars(p)} data-svg-african-role="head-neck premium-part back-view-premium presentation-${presentation} age-${ageGroup} body-${bodyType} height-${heightType}">
    <g id="head-motion" data-svg-african-role="head-motion hair-back rear-head" transform="${headTransform}">
    <path id="back-neck" data-svg-african-role="neck rear-neck smooth-neck-margin wider-back-neck" d="M${(49 - neckHalf).toFixed(1)} ${neckTopY.toFixed(1)} C${(42 - neckWidth * 2).toFixed(1)} 111 ${(40 - neckWidth * 2).toFixed(1)} 132 ${(38.5 - neckWidth).toFixed(1)} ${neckBottomY} L${(59.5 + neckWidth).toFixed(1)} ${neckBottomY} C${(58 + neckWidth * 2).toFixed(1)} 132 ${(56 + neckWidth * 2).toFixed(1)} 111 ${(49 + neckHalf).toFixed(1)} ${neckTopY.toFixed(1)} Z" fill="url(#skinGrad)"/>
    <path id="back-head" data-svg-african-role="skin back-head rear-face-hidden fuller-back-head" d="M${(49 - headRx).toFixed(1)} 54 C${(49 - headRx).toFixed(1)} 25 ${(49 - headRx * 0.55).toFixed(1)} ${headTopY.toFixed(1)} 49 ${headTopY.toFixed(1)} C${(49 + headRx * 0.55).toFixed(1)} ${headTopY.toFixed(1)} ${(49 + headRx).toFixed(1)} 25 ${(49 + headRx).toFixed(1)} 54 C${(49 + headRx * 0.96).toFixed(1)} 84 ${(49 + headRx * 0.54).toFixed(1)} ${(headBaseY - 3).toFixed(1)} 49 ${headBaseY.toFixed(1)} C${(49 - headRx * 0.54).toFixed(1)} ${(headBaseY - 3).toFixed(1)} ${(49 - headRx * 0.96).toFixed(1)} 84 ${(49 - headRx).toFixed(1)} 54 Z" fill="url(#skinGrad)" filter="url(#softShadow)"/>
    ${backHairMass}
    ${rearHeadwear}
    ${ears}
    ${rearEarringMarkup}
    <path id="back-nape-shadow" d="M33 105 C43 113 56 113 65 105" fill="none" stroke="var(--skin-shade)" stroke-width="1.3" opacity=".18" stroke-linecap="round"/>
    </g>
</g>`;
        return svgShell('head-neck', 94, 146, body, p);
    }

    function renderBackTorso(config, p, options = {}) {
        const outfit = normalizeId(config.styling?.outfit || config.outfit, 'lecturer');
        const topClothing = resolveTopClothing(config);
        const bottomClothing = resolveBottomClothing(config);
        const skirtLength = resolveSkirtLength(config);
        const profession = normalizeId(config.styling?.profession || config.profession, '');
        const culturalStyle = normalizeId(config.styling?.culturalStyle || config.culturalStyle, 'contemporary');
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const presentationProfile = getPresentationVisualProfile(presentation);
        const styleText = `${config.assetCharacterId || ''} ${outfit} ${topClothing} ${bottomClothing} ${profession} ${culturalStyle}`;
        const fabricDesign = resolveEffectiveFabricDesign(config, styleText);
        const isAcademicGown = topClothing === 'academic-gown-top' || bottomClothing === 'academic-gown-bottom' || outfit === 'academic-robe';
        const isHealth = /doctor|nurse|lab-coat|scrubs|laboratory|pharmacist|community-health/.test(styleText);
        const isSkirtBottom = isSkirtLikeBottom(bottomClothing);
        const chestProjection = getAdjustmentValue(adjustments, 'chestProjection');
        const breastProjection = getAdjustmentValue(adjustments, 'breastProjection');
        const backCurve = getAdjustmentValue(adjustments, 'backCurve');
        const buttockProjection = getAdjustmentValue(adjustments, 'buttockProjection');
        const torsoWide = (getAdjustmentValue(adjustments, 'torsoWidth') + (presentationProfile.torsoWidth || 0)) * 15
            + chestProjection * 3
            + breastProjection * (presentation === 'female' ? 2 : 0);
        const shoulderWide = (getAdjustmentValue(adjustments, 'shoulderWidth') + (presentationProfile.shoulderWidth || 0)) * 17;
        const hipShift = (getAdjustmentValue(adjustments, 'hipWidth') + (presentationProfile.hipWidth || 0)) * 18
            + buttockProjection * (presentation === 'female' ? 7 : 4);
        const torsoLong = getAdjustmentValue(adjustments, 'torsoLength') * 44;
        const topWearLength = getAdjustmentValue(adjustments, 'topWearLength');
        const bottomWearLength = getAdjustmentValue(adjustments, 'bottomWearLength');
        const abdomenProjection = getAdjustmentValue(adjustments, 'abdomenProjection');
        const abdomenWidth = getAdjustmentValue(adjustments, 'abdomenWidth');
        const abdomenSide = clamp(abdomenWidth * 12 + Math.max(0, abdomenProjection) * 4, -5, 17);
        const shoulderL = clamp(17 - shoulderWide, 4, 28);
        const shoulderR = clamp(119 + shoulderWide, 108, 132);
        const waistL = clamp(36 - torsoWide - abdomenSide * 0.25 + backCurve * 3, 20, 45);
        const waistR = clamp(100 + torsoWide + abdomenSide * 0.25 - backCurve * 3, 91, 116);
        const hipL = clamp(31 - hipShift - abdomenSide * 0.15, 13, 44);
        const hipR = clamp(105 + hipShift + abdomenSide * 0.15, 94, 124);
        const garmentLengthShift = isSkirtBottom ? bottomWearLength * 48 : topWearLength * 30;
        const torsoBottom = clamp(214 + torsoLong + (isSkirtBottom ? getSkirtLegCoverage(skirtLength) * 0.16 : 0) + garmentLengthShift, 184, 306);
        const waistY = 137 + torsoLong * 0.35;
        const topHemY = clamp(waistY + topWearLength * 42, waistY - 22, waistY + 28);
        const clothFill = isHealth ? '#f8fbff' : (isAcademicGown ? '#111827' : 'url(#clothGrad)');
        const rearPanelRole = isAcademicGown ? 'academic-gown rear-robe back-panel' : isHealth ? 'lab-coat rear-panel health-profession' : 'rear-clothing-panel';
        const fabricMarkup = !/plain-business-suit/.test(styleText)
            ? renderFabricDesignMarkup(fabricDesign, { role: 'back-torso-fabric-design', x1: 24, x2: 112, y1: 52, y2: torsoBottom - 14 })
            : '';
        const robeMarkup = isAcademicGown
            ? `<path id="back-academic-yoke" data-svg-african-role="academic-gown rear-yoke" d="M21 50 C45 35 91 35 115 50 L107 78 C84 69 52 69 29 78 Z" fill="#0f172a" opacity=".96"/>
    <path id="back-academic-center-fold" d="M68 56 C66 103 66 165 68 ${torsoBottom - 10}" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".15" stroke-linecap="round"/>`
            : '';
        const healthMarkup = isHealth
            ? `<path id="back-clinical-seam-left" d="M42 58 C39 105 38 155 40 ${torsoBottom - 18}" fill="none" stroke="#dbeafe" stroke-width="1.4" opacity=".62" stroke-linecap="round"/>
    <path id="back-clinical-seam-right" d="M94 58 C97 105 98 155 96 ${torsoBottom - 18}" fill="none" stroke="#dbeafe" stroke-width="1.4" opacity=".62" stroke-linecap="round"/>`
            : '';
        const topLengthMarkup = Math.abs(topWearLength) < 0.005
            ? ''
            : `<path id="back-top-wear-length" data-svg-african-role="top-wear-length adjustable-top-hem ${topWearLength > 0 ? 'extended-top' : 'shortened-top'}" d="M${waistL.toFixed(1)} ${waistY.toFixed(1)} C52 ${(waistY + 5).toFixed(1)} 84 ${(waistY + 5).toFixed(1)} ${waistR.toFixed(1)} ${waistY.toFixed(1)} L${waistR.toFixed(1)} ${topHemY.toFixed(1)} C84 ${(topHemY + 5).toFixed(1)} 52 ${(topHemY + 5).toFixed(1)} ${waistL.toFixed(1)} ${topHemY.toFixed(1)} Z" fill="${topWearLength > 0 ? clothFill : 'var(--skirt)'}" opacity=".98"/>`;
        const rearBackpackMarkup = hasAccessory(config, 'backpack')
            ? `<g id="back-backpack" data-svg-african-role="accessory backpack rear-backpack back-view-accessory">
    <path d="M38 55 C31 75 30 112 33 158 M98 55 C105 75 106 112 103 158" fill="none" stroke="var(--accent)" stroke-width="6" opacity=".88" stroke-linecap="round"/>
    <path d="M35 71 C45 59 91 59 101 71 L106 164 C92 177 44 177 30 164 Z" fill="var(--cloth-shade)" stroke="var(--accent)" stroke-width="1.8"/>
    <path d="M43 68 C51 55 85 55 93 68" fill="none" stroke="var(--accent)" stroke-width="3" stroke-linecap="round"/>
    <path d="M39 119 C54 126 82 126 97 119 L96 157 C82 164 54 164 40 157 Z" fill="var(--cloth-light)" opacity=".32"/>
    <path d="M68 76 L68 158" fill="none" stroke="var(--accent)" stroke-width="1.3" opacity=".5"/>
</g>`
            : '';
        const rearToolBeltMarkup = hasAccessory(config, 'tool-belt')
            ? `<g id="back-tool-belt" data-svg-african-role="accessory tool-belt rear-tool-belt back-view-accessory">
    <path d="M${(hipL + 5).toFixed(1)} ${(waistY + 12).toFixed(1)} C51 ${(waistY + 18).toFixed(1)} 85 ${(waistY + 18).toFixed(1)} ${(hipR - 5).toFixed(1)} ${(waistY + 12).toFixed(1)}" fill="none" stroke="#3b2a1f" stroke-width="5"/>
    <rect x="38" y="${(waistY + 12).toFixed(1)}" width="19" height="24" rx="3" fill="#6b4b31" stroke="#2f2118" stroke-width="1.2"/>
    <rect x="79" y="${(waistY + 12).toFixed(1)}" width="19" height="24" rx="3" fill="#6b4b31" stroke="#2f2118" stroke-width="1.2"/>
</g>`
            : '';
        const rearRadioMarkup = hasAccessory(config, 'radio')
            ? `<g id="back-radio" data-svg-african-role="accessory radio rear-radio back-view-accessory">
    <rect x="27" y="64" width="17" height="31" rx="3" fill="#26313d" stroke="#111827" stroke-width="1.2"/>
    <path d="M31 63 L29 53" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round"/>
    <circle cx="35.5" cy="73" r="3.2" fill="#64748b"/>
    <path d="M31 83 H40 M31 88 H40" stroke="#94a3b8" stroke-width="1.2"/>
</g>`
            : '';
        const body = `
<g ${styleVars(p)} data-svg-african-role="torso premium-part back-view-premium back-torso presentation-${presentation} body-${bodyType} height-${heightType}">
    <path id="back-neck-socket" data-svg-african-role="neck-hidden-under-collar" d="M54 18 C59 25 77 25 82 18 L86 45 L50 45 Z" fill="var(--skin-shade)" opacity=".2"/>
    <path id="back-shoulder-slope" data-svg-african-role="shoulder-slope rear-shoulder" d="M${shoulderL.toFixed(1)} 44 C38 26 98 26 ${shoulderR.toFixed(1)} 44 L${waistR.toFixed(1)} 126 C${(110 + abdomenSide).toFixed(1)} 154 ${hipR.toFixed(1)} ${(torsoBottom - 4).toFixed(1)} ${hipR.toFixed(1)} ${torsoBottom.toFixed(1)} L${hipL.toFixed(1)} ${torsoBottom.toFixed(1)} C${hipL.toFixed(1)} ${(torsoBottom - 4).toFixed(1)} ${(26 - abdomenSide).toFixed(1)} 154 ${waistL.toFixed(1)} 126 Z" fill="${clothFill}" filter="url(#softShadow)"/>
    <path id="back-collar" data-svg-african-role="rear-collar" d="M47 34 C55 42 81 42 89 34 L84 54 C74 62 61 62 52 54 Z" fill="${isHealth ? '#e0f2fe' : 'var(--inner)'}" opacity=".92"/>
    <path id="back-clothing-panel" data-svg-african-role="${rearPanelRole}" d="M${(shoulderL + 9).toFixed(1)} 52 C45 42 91 42 ${(shoulderR - 9).toFixed(1)} 52 L${(hipR - 4).toFixed(1)} ${(torsoBottom - 3).toFixed(1)} C91 ${(torsoBottom + 8).toFixed(1)} 45 ${(torsoBottom + 8).toFixed(1)} ${(hipL + 4).toFixed(1)} ${(torsoBottom - 3).toFixed(1)} Z" fill="${clothFill}" opacity=".98"/>
    ${topLengthMarkup}
    ${fabricMarkup}
    ${robeMarkup}
    ${renderOccupationGarment(topClothing, { back: true, hem: torsoBottom - 4, waist: waistY })}
    ${healthMarkup}
    ${rearBackpackMarkup}
    ${rearToolBeltMarkup}
    ${rearRadioMarkup}
    <path id="back-waist-shadow" d="M${(hipL + 8).toFixed(1)} ${(torsoBottom - 10).toFixed(1)} C52 ${(torsoBottom - 1).toFixed(1)} 84 ${(torsoBottom - 1).toFixed(1)} ${(hipR - 8).toFixed(1)} ${(torsoBottom - 10).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width="1.2" opacity=".18" stroke-linecap="round"/>
</g>`;
        return svgShell('torso', 136, Math.max(224, Math.ceil(torsoBottom + 14)), body, p);
    }

    function renderBackArm(partKey, config, p, options = {}) {
        // Anatomical right appears on stage-right when the character faces away.
        // Shape branches are stage-side branches, so they reverse from front view.
        const isStageLeft = partKey === 'left-arm';
        const topClothing = resolveTopClothing(config);
        const sleeveLength = resolveSleeveLength(config, topClothing);
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const armLength = getAdjustmentValue(adjustments, 'armLength');
        const armWidth = getAdjustmentValue(adjustments, 'armWidth');
        const handSize = getAdjustmentValue(adjustments, 'handSize');
        const muscle = Math.max(0, getAdjustmentValue(adjustments, 'muscleDefinition') + (getPresentationVisualProfile(presentation).muscleDefinition || 0));
        const styleText = `${config.assetCharacterId || ''} ${config.styling?.outfit || config.outfit || ''} ${topClothing} ${config.styling?.profession || config.profession || ''}`;
        const fabricDesign = resolveEffectiveFabricDesign(config, styleText);
        const sleeveEndY = sleeveLength === 'shoulder' ? 30 : sleeveLength === 'elbow' ? 123 : sleeveLength === 'three-quarter' ? 172 : 214;
        const lengthShift = armLength * 28;
        const widthShift = armWidth * 8.2;
        const upperOuter = isStageLeft ? 9 - widthShift * 0.18 : 57 + widthShift * 0.18;
        const upperInner = isStageLeft ? 49 + widthShift : 17 - widthShift;
        const wristOuter = isStageLeft ? 12 - widthShift * 0.18 : 54 + widthShift * 0.18;
        const wristInner = isStageLeft ? 43 + widthShift * 0.45 : 23 - widthShift * 0.45;
        const handScale = 1 + handSize * 0.45;
        const sleevePath = `M${upperOuter.toFixed(1)} 8 C${isStageLeft ? '16' : '50'} -2 ${isStageLeft ? '41' : '25'} -2 ${upperInner.toFixed(1)} 10 C${isStageLeft ? '51' : '15'} 54 ${isStageLeft ? '48' : '18'} 124 ${wristInner.toFixed(1)} ${sleeveEndY.toFixed(1)} C${isStageLeft ? '32' : '34'} ${(sleeveEndY + 10).toFixed(1)} ${isStageLeft ? '20' : '46'} ${(sleeveEndY + 10).toFixed(1)} ${wristOuter.toFixed(1)} ${sleeveEndY.toFixed(1)} C${isStageLeft ? '8' : '58'} 122 ${isStageLeft ? '6' : '60'} 50 ${upperOuter.toFixed(1)} 8 Z`;
        const skinPath = `M${wristOuter.toFixed(1)} ${(sleeveEndY - 2).toFixed(1)} C${isStageLeft ? '21' : '45'} ${(sleeveEndY + 9).toFixed(1)} ${isStageLeft ? '34' : '32'} ${(sleeveEndY + 9).toFixed(1)} ${wristInner.toFixed(1)} ${(sleeveEndY - 2).toFixed(1)} L${isStageLeft ? (40 + widthShift * 0.35).toFixed(1) : (26 - widthShift * 0.35).toFixed(1)} ${(228 + lengthShift).toFixed(1)} C${isStageLeft ? '31' : '35'} ${(237 + lengthShift).toFixed(1)} ${isStageLeft ? '19' : '47'} ${(237 + lengthShift).toFixed(1)} ${isStageLeft ? '11' : '55'} ${(228 + lengthShift).toFixed(1)} Z`;
        const handPath = isStageLeft
            ? `M13 ${(222 + lengthShift).toFixed(1)} C20 ${(214 + lengthShift).toFixed(1)} 34 ${(216 + lengthShift).toFixed(1)} 40 ${(225 + lengthShift).toFixed(1)} C39 ${(239 + lengthShift).toFixed(1)} 25 ${(249 + lengthShift).toFixed(1)} 13 ${(239 + lengthShift).toFixed(1)} Z`
            : `M53 ${(222 + lengthShift).toFixed(1)} C46 ${(214 + lengthShift).toFixed(1)} 32 ${(216 + lengthShift).toFixed(1)} 26 ${(225 + lengthShift).toFixed(1)} C27 ${(239 + lengthShift).toFixed(1)} 41 ${(249 + lengthShift).toFixed(1)} 53 ${(239 + lengthShift).toFixed(1)} Z`;
        const fabricMarkup = sleeveEndY > 58 ? renderFabricDesignMarkup(fabricDesign, {
            role: 'back-arm-fabric-design',
            x1: 12,
            x2: 54,
            y1: 18,
            y2: Math.min(210, sleeveEndY),
            compact: true
        }) : '';
        const body = `
<g ${styleVars(p)} data-svg-african-role="${partKey} premium-part back-view-premium arm presentation-${presentation} body-${bodyType} height-${heightType}">
    <path id="back-shoulder-cap" data-svg-african-role="rear-shoulder-connector wider-back-limb shoulder-cap shoulder-underlap connected-shoulder" d="${isStageLeft ? 'M7 18 C14 2 43 0 64 18 C58 31 25 32 7 18 Z' : 'M59 18 C52 2 23 0 2 18 C8 31 41 32 59 18 Z'}" fill="url(#clothGrad)" opacity=".98"/>
    <path id="back-sleeve" data-svg-african-role="rear-sleeve arm-clothing ${topClothing} sleeve-${sleeveLength}" d="${sleevePath}" fill="url(#clothGrad)" filter="url(#softShadow)"/>
    ${fabricMarkup}
    <path id="back-forearm" data-svg-african-role="rear-forearm skin ${sleeveLength === 'wrist' ? 'mostly-covered' : 'visible'}" d="${skinPath}" fill="url(#skinGrad)" opacity="${sleeveLength === 'wrist' ? '.28' : '1'}"/>
    <path id="back-arm-muscle" data-svg-african-role="rear-muscle-hint biceps triceps" d="${isStageLeft ? 'M39 41 C42 82 41 137 35 178' : 'M27 41 C24 82 25 137 31 178'}" fill="none" stroke="var(--cloth-shade)" stroke-width="${(1 + muscle * 1.3).toFixed(2)}" opacity="${(0.10 + muscle * 0.18).toFixed(2)}" stroke-linecap="round"/>
    <path id="back-hand" data-svg-african-role="hand rear-hand palm thumb wrist-transition" transform="translate(33 ${(233 + lengthShift).toFixed(1)}) scale(${handScale.toFixed(3)}) translate(-33 ${(-233 - lengthShift).toFixed(1)})" d="${handPath}" fill="url(#skinGrad)"/>
    <path id="back-thumb" d="${isStageLeft ? `M35 ${(229 + lengthShift).toFixed(1)} C43 ${(231 + lengthShift).toFixed(1)} 43 ${(239 + lengthShift).toFixed(1)} 35 ${(240 + lengthShift).toFixed(1)}` : `M31 ${(229 + lengthShift).toFixed(1)} C23 ${(231 + lengthShift).toFixed(1)} 23 ${(239 + lengthShift).toFixed(1)} 31 ${(240 + lengthShift).toFixed(1)}`}" fill="none" stroke="var(--skin-shade)" stroke-width="1.1" opacity=".28" stroke-linecap="round"/>
</g>`;
        return svgShell(partKey, 66, 260, body, p);
    }

    function renderBackLeg(partKey, config, p, options = {}) {
        const isStageLeft = partKey === 'left-leg';
        const bottomClothing = resolveBottomClothing(config);
        const skirtLength = resolveSkirtLength(config);
        const footwear = normalizeId(config.styling?.footwear || config.footwear, 'formal');
        const presentation = normalizeId(config.identity?.presentation || config.presentation, 'female');
        const bodyType = normalizeId(config.identity?.body || config.body, 'average');
        const heightType = normalizeId(config.identity?.height || config.height, 'average');
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const styleText = `${config.assetCharacterId || ''} ${config.styling?.outfit || config.outfit || ''} ${bottomClothing} ${config.styling?.profession || config.profession || ''}`;
        const fabricDesign = resolveEffectiveFabricDesign(config, styleText);
        const legLength = getAdjustmentValue(adjustments, 'legLength');
        const legWidth = getAdjustmentValue(adjustments, 'legWidth');
        const footSize = getAdjustmentValue(adjustments, 'footSize');
        const isSkirtBottom = isSkirtLikeBottom(bottomClothing);
        const isShorts = /shorts/.test(bottomClothing);
        const bottomWearLength = getAdjustmentValue(adjustments, 'bottomWearLength');
        const showLowerLegTop = isSkirtBottom
            ? getSkirtLegCoverage(skirtLength) + bottomWearLength * 70
            : isShorts
                ? 90 + bottomWearLength * 65
                : 0;
        const visibleLegTop = clamp(showLowerLegTop, isSkirtBottom || isShorts ? 34 : 0, isSkirtBottom ? 218 : (isShorts ? 150 : 212));
        const lengthShift = legLength * 34;
        const widthShift = legWidth * 7.5;
        const legFill = isSkirtBottom || isShorts ? 'url(#skinGrad)' : 'url(#clothGrad)';
        const upperFill = 'url(#clothGrad)';
        const upperPath = isSkirtBottom || isShorts
            ? `M0 0 C15 8 41 8 56 0 L56 ${visibleLegTop.toFixed(1)} C42 ${(visibleLegTop + 8).toFixed(1)} 14 ${(visibleLegTop + 8).toFixed(1)} 0 ${visibleLegTop.toFixed(1)} Z`
            : `M${(7 - widthShift).toFixed(1)} 0 C19 8 37 8 ${(49 + widthShift).toFixed(1)} 0 L${(45 + widthShift * 0.42).toFixed(1)} ${(212 + lengthShift).toFixed(1)} C35 ${(220 + lengthShift).toFixed(1)} 21 ${(220 + lengthShift).toFixed(1)} ${(11 - widthShift * 0.42).toFixed(1)} ${(212 + lengthShift).toFixed(1)} Z`;
        const calfPath = `M${(10 - widthShift * 0.45).toFixed(1)} ${visibleLegTop.toFixed(1)} C19 ${(visibleLegTop + 8).toFixed(1)} 37 ${(visibleLegTop + 8).toFixed(1)} ${(46 + widthShift * 0.45).toFixed(1)} ${visibleLegTop.toFixed(1)} L${(43 + widthShift * 0.32).toFixed(1)} ${(213 + lengthShift).toFixed(1)} C33 ${(220 + lengthShift).toFixed(1)} 23 ${(220 + lengthShift).toFixed(1)} ${(13 - widthShift * 0.32).toFixed(1)} ${(213 + lengthShift).toFixed(1)} Z`;
        const fabricMarkup = !/plain-suit/.test(styleText) ? renderFabricDesignMarkup(fabricDesign, {
            role: 'back-leg-fabric-design',
            x1: 6,
            x2: 50,
            y1: isSkirtBottom || isShorts ? 8 : visibleLegTop + 6,
            y2: isSkirtBottom || isShorts ? Math.max(24, visibleLegTop - 8) : 208,
            compact: true
        }) : '';
        const footScale = 1 + footSize * 0.42;
        const foot = isStageLeft
            ? `M7 ${(224 + lengthShift).toFixed(1)} C17 ${(218 + lengthShift).toFixed(1)} 39 ${(218 + lengthShift).toFixed(1)} 51 ${(225 + lengthShift).toFixed(1)} C45 ${(236 + lengthShift).toFixed(1)} 19 ${(237 + lengthShift).toFixed(1)} 8 ${(229 + lengthShift).toFixed(1)} Z`
            : `M49 ${(224 + lengthShift).toFixed(1)} C39 ${(218 + lengthShift).toFixed(1)} 17 ${(218 + lengthShift).toFixed(1)} 5 ${(225 + lengthShift).toFixed(1)} C11 ${(236 + lengthShift).toFixed(1)} 37 ${(237 + lengthShift).toFixed(1)} 48 ${(229 + lengthShift).toFixed(1)} Z`;
        const body = `
<g ${styleVars(p)} data-svg-african-role="${partKey} premium-part back-view-premium leg presentation-${presentation} body-${bodyType} height-${heightType}">
    <path id="back-hip-cap" data-svg-african-role="rear-hip-connector wider-back-limb hidden-by-torso hip-underlap connected-hip" d="M${isStageLeft ? '4' : '6'} 3 C17 11 39 11 ${isStageLeft ? '52' : '50'} 3 L${isStageLeft ? '49' : '53'} 28 C38 20 18 20 ${isStageLeft ? '7' : '4'} 28 Z" fill="url(#clothGrad)" opacity=".98"/>
    <path id="back-upper-leg" data-svg-african-role="${isSkirtBottom ? 'rear-skirt-wrapper-cover lower-garment-overlay no-center-slit' : isShorts ? 'rear-shorts shorts-leg leg-clothing adjustable-bottom-hem' : 'rear-trouser-upper hidden-by-torso'} ${bottomClothing}" d="${upperPath}" fill="${upperFill}"/>
    ${isSkirtBottom || isShorts ? `<path id="back-${isShorts ? 'shorts' : 'skirt'}-hem" data-svg-african-role="${isShorts ? 'shorts-hem adjustable-bottom-hem' : 'skirt-hem wrapper-hem no-center-slit'}" d="M3 ${visibleLegTop.toFixed(1)} C17 ${(visibleLegTop + 8).toFixed(1)} 39 ${(visibleLegTop + 8).toFixed(1)} 53 ${visibleLegTop.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".72" stroke-linecap="round"/>` : ''}
    <path id="back-lower-leg" data-svg-african-role="${isSkirtBottom || isShorts ? `visible-lower-leg rear-calf skin ${isShorts ? 'below-shorts-hem skin-below-shorts' : 'below-skirt-hem'}` : 'trouser-leg rear-trouser'} ${bottomClothing}" d="${calfPath}" fill="${legFill}" opacity="${isSkirtBottom && visibleLegTop >= 224 ? '0' : '1'}"/>
    ${fabricMarkup}
    ${isShorts ? '' : `<path id="back-leg-seam" d="${isStageLeft ? `M38 ${(visibleLegTop + 10).toFixed(1)} C40 117 39 171 36 ${(205 + lengthShift).toFixed(1)}` : `M18 ${(visibleLegTop + 10).toFixed(1)} C16 117 17 171 20 ${(205 + lengthShift).toFixed(1)}`}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.15" opacity=".18" stroke-linecap="round"/>`}
    <path id="back-shoe" data-svg-african-role="footwear foot rear-foot ${footwear}" transform="translate(28 ${(224 + lengthShift).toFixed(1)}) scale(${footScale.toFixed(3)} 1) translate(-28 ${(-224 - lengthShift).toFixed(1)})" d="${foot}" fill="var(--shoe)"/>
</g>`;
        return svgShell(partKey, 56, 260, body, p);
    }

    function renderSideHeadwearMarkup(headwear, options = {}) {
        const isNiqab = !!options.isNiqab;
        const isModestHeadwear = !!options.isModestHeadwear;
        if (headwear === 'none') return '';
        const safeId = String(headwear || 'headwear').replace(/[^a-zA-Z0-9_-]+/g, '-');
        if (isNiqab) {
            return `<g id="side-niqab-headwear" data-svg-african-role="headwear side-headwear niqab side-view-premium full-head-cover full-neck-cover continuous-scalp-cover">
        <path id="side-niqab-cover" data-svg-african-role="headwear niqab full-head-neck-cover full-scalp-cover full-neck-cover forehead-cover ear-cover mouth-cover lower-nose-cover" d="M10 56 C9 24 29 7 55 7 C82 7 95 28 93 60 L93 154 L22 154 C12 128 7 87 10 56 Z" fill="var(--headwear)"/>
        <path id="side-niqab-eye-window" data-svg-african-role="niqab-eye-window side-eye-opening eyes-visible upper-nose-visible brow-clear" d="M58 58 C68 53 80 55 88 61 C81 68 67 69 58 63 Z" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".75" stroke-linejoin="round" stroke-linecap="round"/>
        <path id="side-niqab-fold" data-svg-african-role="headwear-fold niqab side-drape" d="M28 83 C30 111 37 136 49 154 M82 73 C78 104 70 134 60 154" fill="none" stroke="var(--headwear-shade)" stroke-width="1.7" opacity=".30" stroke-linecap="round"/>
    </g>`;
        }
        if (isModestHeadwear) {
            return `<g id="side-hijab-headwear" data-svg-african-role="headwear side-headwear modest-headwear ${headwear} side-view-premium full-scalp-cover continuous-scalp-cover neck-cover">
        <path id="side-hijab-cover" data-svg-african-role="headwear hijab full-scalp-cover continuous-scalp-cover neck-cover forehead-cover ear-cover nose-clear eye-clear cheek-clear mouth-clear" d="M9 57 C8 24 29 6 55 6 C82 6 95 27 94 58 C96 92 84 132 69 154 L25 154 C13 129 6 91 9 57 Z" fill="var(--headwear)"/>
        <path id="side-hijab-face-opening" data-svg-african-role="face-opening hijab nose-clear eye-clear cheek-clear mouth-clear brow-clear neck-covered" d="M45 42 C64 43 85 54 88 70 C87 95 69 112 50 111 C32 108 23 90 25 69 C26 54 33 45 45 42 Z" fill="url(#skinGrad)"/>
        <path id="side-hijab-face-rim" data-svg-african-role="headwear-rim hijab brow-clear" d="M45 42 C63 43 84 54 87 70 C86 94 69 110 51 111" fill="none" stroke="var(--headwear-shade)" stroke-width="2.1" opacity=".45" stroke-linecap="round"/>
        <path id="side-hijab-fold" data-svg-african-role="headwear-fold side-pleat" d="M25 81 C28 109 36 135 47 154 M80 71 C76 103 69 133 58 154" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity=".28" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'academic-cap') {
            return `<g id="side-academic-cap-headwear" data-svg-african-role="headwear side-headwear academic-cap mortarboard side-view-premium side-structured-headwear full-scalp-cover continuous-scalp-cover">
        <path id="side-academic-scalp-cap" data-svg-african-role="academic-cap skullcap full-scalp-cover" d="M29 41 C39 28 63 25 85 39 L82 54 C69 59 48 59 34 52 Z" fill="var(--headwear-shade)"/>
        <path id="side-mortarboard" data-svg-african-role="academic-cap square-cap side-board" d="M22 30 L61 13 L96 31 L59 45 Z" fill="var(--headwear)"/>
        <path id="side-academic-band" data-svg-african-role="academic-cap side-band full-scalp-cover" d="M34 41 C48 48 73 48 87 40 L84 54 C69 61 48 60 35 53 Z" fill="var(--headwear-shade)" opacity=".96"/>
        <path id="side-academic-cap-tassel-tail" data-svg-african-role="academic-cap tassel side-face-drop above-ear" d="M86 31 C92 43 89 57 83 70 M83 70 C87 74 88 79 88 84 M83 70 C82 76 80 81 78 85" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'niger-delta-bowler' || headwear === 'bowler-hat') {
            return `<g id="side-bowler-headwear" data-svg-african-role="headwear side-headwear regional-headwear ${headwear} niger-delta-bowler bowler-hat side-view-premium side-structured-headwear full-scalp-cover continuous-scalp-cover">
        <path id="side-bowler-crown" data-svg-african-role="bowler-crown crown full-scalp-cover" d="M24 36 C29 17 48 9 66 12 C81 15 88 25 89 40 C76 48 41 48 24 36 Z" fill="var(--headwear)"/>
        <path id="side-bowler-highlight" d="M36 21 C47 15 64 15 76 22" fill="none" stroke="#ffffff" stroke-width="1.5" opacity=".14" stroke-linecap="round"/>
        <path id="side-bowler-band" data-svg-african-role="bowler-band side-band" d="M26 36 C42 42 72 42 88 38" fill="none" stroke="#1c1b1f" stroke-width="3.5" opacity=".9" stroke-linecap="round"/>
        <path id="side-bowler-brim" data-svg-african-role="bowler-brim side-brim" d="M15 43 C38 53 78 53 96 43 C93 52 82 57 55 57 C30 57 18 52 15 43 Z" fill="var(--headwear-shade)"/>
    </g>`;
        }
        if (headwear === 'hausa-cap' || headwear === 'hausa-embroidered-cap' || headwear === 'kufi') {
            const isKufi = headwear === 'kufi';
            const crown = isKufi
                ? 'M22 42 C27 26 42 17 59 17 C76 18 88 28 91 43 L88 54 C72 61 45 61 28 53 Z'
                : 'M23 19 C37 10 74 10 88 19 L91 53 C75 63 43 63 26 53 Z';
            const embroidery = isKufi
                ? 'M32 40 C45 44 70 44 84 40 M40 29 L40 53 M53 26 L53 56 M66 27 L66 56 M78 30 L78 52'
                : 'M32 25 L32 52 M43 23 L43 57 M55 23 L55 58 M67 23 L67 57 M79 25 L79 52';
            return `<g id="side-hausa-headwear" data-svg-african-role="headwear side-headwear regional-headwear ${headwear} hausa-embroidered-cap hausa-cap embroidered-cylinder northern-cap side-view-premium side-structured-headwear full-scalp-cover continuous-scalp-cover">
        <path id="side-hausa-cylinder" data-svg-african-role="side-headwear-crown embroidered-cylinder full-scalp-cover" d="${crown}" fill="var(--headwear)"/>
        <path id="side-hausa-top" data-svg-african-role="northern-cap flat-top side-top" d="${isKufi ? 'M24 42 C40 48 73 48 89 42' : 'M23 19 C38 9 73 9 88 19 C73 27 38 27 23 19 Z'}" fill="var(--headwear-shade)" opacity=".88"/>
        <path id="side-hausa-band" data-svg-african-role="side-headwear-band northern-cap gold-rim" d="M27 51 C44 59 74 59 90 51" fill="none" stroke="var(--accent)" stroke-width="2.2" opacity=".82" stroke-linecap="round"/>
        <path id="side-hausa-embroidery" data-svg-african-role="northern-cap side-embroidery" d="${embroidery}" fill="none" stroke="var(--accent)" stroke-width="${headwear === 'hausa-embroidered-cap' ? '1.55' : '1.1'}" opacity="${headwear === 'hausa-embroidered-cap' ? '.76' : '.52'}" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'yoruba-fila' || headwear === 'fila' || headwear === 'abeti-aja') {
            const flap = headwear === 'abeti-aja'
                ? '<path id="side-abeti-aja-flap" data-svg-african-role="abeti-aja side-flap ear-wing" d="M27 45 C15 51 13 64 25 71 C27 61 31 52 37 45 Z" fill="var(--headwear-shade)" opacity=".74"/>'
                : '<path id="side-fila-side-fold" data-svg-african-role="fila-side-fold folded-fila" d="M25 45 C35 53 48 54 59 48 C45 59 31 60 21 52 Z" fill="var(--headwear-shade)" opacity=".42"/>';
            return `<g id="side-fila-headwear" data-svg-african-role="headwear side-headwear regional-headwear ${headwear} yoruba-fila fila yoruba-cap folded-fila side-view-premium side-structured-headwear full-scalp-cover continuous-scalp-cover">
        <path id="side-fila-crown" data-svg-african-role="side-headwear-crown fila-crown full-scalp-cover" d="M20 48 C25 28 43 16 65 17 C82 18 92 31 93 49 C74 46 41 44 20 48 Z" fill="var(--headwear)"/>
        <path id="side-fila-fold" data-svg-african-role="folded-fila yoruba-cap asymmetric-fold" d="M36 21 C55 10 78 15 94 34 C75 29 55 31 35 42 Z" fill="var(--headwear-shade)" opacity=".72"/>
        ${flap}
        <path id="side-fila-band" data-svg-african-role="side-headwear-band beaded-band" d="M25 41 C43 34 75 35 91 43" fill="none" stroke="var(--accent)" stroke-width="2.4" opacity=".82" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'igbo-red-cap' || headwear === 'isi-agu-cap') {
            return `<g id="side-igbo-cap-headwear" data-svg-african-role="headwear side-headwear regional-headwear ${headwear} igbo-red-cap igbo-cap red-cap side-view-premium side-structured-headwear full-scalp-cover continuous-scalp-cover">
        <path id="side-igbo-cap" data-svg-african-role="side-headwear-crown igbo-cap red-cap flat-top full-scalp-cover" d="M22 46 L25 31 C33 19 48 13 65 14 C82 15 91 25 92 40 L92 49 C76 56 39 56 22 49 Z" fill="var(--headwear)"/>
        <path id="side-igbo-flat-top" data-svg-african-role="flat-top side-top" d="M32 29 C46 18 75 18 87 31 C70 27 46 27 32 29 Z" fill="var(--headwear-shade)" opacity=".30"/>
        <path id="side-igbo-band" data-svg-african-role="side-headwear-band igbo-cap accent-band" d="M26 42 C43 50 75 50 90 42" fill="none" stroke="var(--accent)" stroke-width="2.4" opacity=".82" stroke-linecap="round"/>
        <circle id="side-igbo-button" cx="65" cy="18" r="2" fill="var(--accent)" opacity=".84"/>
    </g>`;
        }
        if (headwear === 'niger-delta-coral-crown' || headwear === 'edo-coral-cap' || headwear === 'crown-cap') {
            return `<g id="side-coral-cap-headwear" data-svg-african-role="headwear side-headwear regional-headwear ${headwear} coral-bead-cap edo-coral-cap side-view-premium side-structured-headwear full-scalp-cover continuous-scalp-cover">
        <path id="side-coral-cap-dome" data-svg-african-role="side-headwear-crown coral-cap-dome full-scalp-cover" d="M23 56 C21 34 37 15 61 14 C82 15 93 34 91 56 C77 51 63 48 49 48 C39 49 30 52 23 56 Z" fill="var(--headwear)"/>
        <path id="side-coral-band" data-svg-african-role="side-headwear-band coral-band" d="M26 48 C43 42 76 42 91 48 L88 58 C70 54 45 54 28 59 Z" fill="var(--headwear-shade)" opacity=".93"/>
        <path id="side-coral-bead-row" data-svg-african-role="coral-beadwork coral-bead-row" d="M31 42 C47 35 72 35 86 42" fill="none" stroke="var(--accent)" stroke-width="2.4" stroke-linecap="round"/>
    </g>`;
        }
        if (headwear === 'gele' || headwear === 'wrapped-gele' || headwear === 'turban' || headwear === 'niger-delta-head-tie') {
            const isGele = headwear === 'gele' || headwear === 'wrapped-gele' || headwear === 'niger-delta-head-tie';
            return `<g id="side-headwrap-headwear" data-svg-african-role="headwear side-headwear premium-traditional-headwear ${headwear} ${isGele ? 'gele headwrap' : 'turban'} side-view-premium side-structured-headwear full-scalp-cover continuous-scalp-cover">
        <path id="side-headwrap-crown" data-svg-african-role="side-headwear-crown headwrap-crown full-scalp-cover" d="${isGele ? 'M12 60 C12 27 35 5 64 5 C92 7 101 32 94 63 C77 49 34 49 12 60 Z' : 'M20 52 C20 29 38 10 61 9 C84 10 94 29 93 53 C78 46 65 43 52 43 C39 43 28 46 20 52 Z'}" fill="var(--headwear)"/>
        <path id="side-headwrap-wing" data-svg-african-role="headwrap-wing side-cloth-fold" d="M13 58 C17 31 38 10 64 5 C45 24 34 45 31 67 C23 66 17 63 13 58 Z" fill="var(--headwear-shade)" opacity=".34"/>
        <path id="side-headwrap-fold-primary" data-svg-african-role="headwear-fold side-pleat headwrap" d="M15 51 C38 29 75 20 97 38" fill="none" stroke="var(--accent)" stroke-width="${isGele ? '4' : '3.4'}" opacity=".74" stroke-linecap="round"/>
        <path id="side-headwrap-fold-secondary" data-svg-african-role="headwear-fold side-pleat" d="M23 40 C46 53 69 53 91 39" fill="none" stroke="var(--accent)" stroke-width="2.4" opacity=".54" stroke-linecap="round"/>
    </g>`;
        }
        if (['construction-helmet', 'chef-hat', 'pilot-cap', 'security-cap', 'baseball-cap', 'beanie'].includes(headwear)) {
            let markup = '';
            if (headwear === 'construction-helmet') {
                markup = `<path id="side-construction-helmet-shell" data-svg-african-role="side-headwear-crown construction-helmet safety-helmet engineer hard-hat closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M15 56 C13 27 33 5 60 4 C84 4 97 26 96 55 C79 63 36 64 15 56 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-construction-helmet-lower-margin" data-svg-african-role="construction-helmet side-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M17 55 C38 63 77 63 94 55" fill="none" stroke="var(--headwear-shade)" stroke-width="3.7" opacity=".95" stroke-linecap="round"/>
        <path id="side-construction-helmet-ridge" data-svg-african-role="construction-helmet safety-ridge subtle-cap-detail no-translucent-center" d="M60 7 C56 23 56 40 60 55 M30 32 C48 26 73 27 89 35" fill="none" stroke="var(--accent)" stroke-width="1.7" opacity=".38" stroke-linecap="round"/>`;
            } else if (headwear === 'chef-hat') {
                markup = `<path id="side-chef-hat-puff" data-svg-african-role="side-headwear-crown chef-hat toque puffed-top closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M13 57 C8 43 16 27 31 24 C37 8 54 4 65 12 C76 7 91 18 90 33 C99 38 100 52 91 59 C73 64 34 64 14 59 C13 58 13 57 13 57 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-chef-hat-lower-margin" data-svg-african-role="chef-hat side-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M16 57 C36 63 73 63 91 57" fill="none" stroke="var(--headwear-shade)" stroke-width="3.2" opacity=".84" stroke-linecap="round"/>
        <path id="side-chef-hat-folds" data-svg-african-role="chef-hat soft-folds subtle-cap-detail no-translucent-center" d="M31 26 C28 37 29 47 34 56 M58 11 C55 29 56 43 60 57 M78 27 C81 38 80 48 75 57" fill="none" stroke="var(--accent)" stroke-width="1.35" opacity=".22" stroke-linecap="round"/>`;
            } else if (headwear === 'pilot-cap') {
                markup = `<path id="side-pilot-cap-crown" data-svg-african-role="side-headwear-crown pilot-cap officer-cap closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M16 55 C16 28 34 6 60 6 C84 6 97 28 96 55 C78 62 36 62 16 55 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-pilot-cap-lower-margin" data-svg-african-role="pilot-cap side-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M18 54 C38 61 76 61 94 54" fill="none" stroke="var(--headwear-shade)" stroke-width="3.5" opacity=".96" stroke-linecap="round"/>
        <path id="side-pilot-cap-piping" data-svg-african-role="pilot-cap gold-piping subtle-cap-detail no-translucent-center" d="M23 42 C43 34 73 35 91 43" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".78" stroke-linecap="round"/>`;
            } else if (headwear === 'security-cap') {
                markup = `<path id="side-security-cap-crown" data-svg-african-role="side-headwear-crown security-cap peaked-cap closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M16 56 C16 29 34 6 60 6 C84 6 97 29 96 56 C78 63 36 63 16 56 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-security-cap-lower-margin" data-svg-african-role="security-cap side-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M18 55 C38 62 76 62 94 55" fill="none" stroke="var(--headwear-shade)" stroke-width="3.5" opacity=".96" stroke-linecap="round"/>
        <path id="side-security-cap-badge" data-svg-african-role="security-cap side-badge subtle-cap-detail no-translucent-center" d="M62 38 L67 43 L64 51 L57 51 L54 43 Z" fill="var(--accent)" opacity=".82"/>`;
            } else if (headwear === 'beanie') {
                markup = `<path id="side-beanie-crown" data-svg-african-role="side-headwear-crown beanie knit-cap closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M16 58 C13 30 32 6 58 6 C84 6 96 30 94 58 C76 65 36 65 16 58 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-beanie-lower-margin" data-svg-african-role="beanie side-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M18 56 C38 63 76 63 93 56" fill="none" stroke="var(--headwear-shade)" stroke-width="3" opacity=".72" stroke-linecap="round"/>
        <path id="side-beanie-ribbing" data-svg-african-role="beanie ribbing subtle-cap-detail no-translucent-center" d="M33 44 L33 58 M48 40 L48 61 M63 40 L63 61 M78 44 L78 58" fill="none" stroke="var(--headwear-shade)" stroke-width="1.45" opacity=".46" stroke-linecap="round"/>`;
            } else {
                markup = `<path id="side-baseball-cap-crown" data-svg-african-role="side-headwear-crown baseball-cap closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening worn-over-scalp hair-visible-below" d="M16 56 C15 28 34 5 60 5 C85 5 97 28 96 56 C78 63 36 63 16 56 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-baseball-cap-lower-margin" data-svg-african-role="baseball-cap side-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M18 55 C38 62 76 62 94 55" fill="none" stroke="var(--headwear-shade)" stroke-width="3.2" opacity=".90" stroke-linecap="round"/>
        <path id="side-baseball-cap-seam" data-svg-african-role="baseball-cap seam subtle-cap-detail no-translucent-center" d="M60 8 C56 24 56 41 60 56 M30 35 C48 29 73 29 89 35" fill="none" stroke="var(--accent)" stroke-width="1.25" opacity=".28" stroke-linecap="round"/>`;
            }
            return `<g id="side-${safeId}-closed-headwear" data-svg-african-role="headwear side-headwear general-hat regional-headwear ${headwear} structured-cap layer-over-hair closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline continuous-scalp-cover no-scalp-opening no-translucent-center hair-visible-below single-curved-lower-margin above-ears worn-over-scalp side-view-premium">
        ${markup}
    </g>`;
        }
        if (headwear === 'military-beret') {
            return `<g id="side-military-beret-headwear" data-svg-african-role="headwear side-headwear general-hat military-beret beret soldier layer-over-hair closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline continuous-scalp-cover no-scalp-opening no-translucent-center hair-visible-below single-curved-lower-margin above-ears worn-over-scalp side-view-premium side-structured-headwear">
        <path id="side-military-beret-body" data-svg-african-role="side-headwear-crown military-beret beret-crown closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening hair-visible-below" d="M16 55 C23 28 45 7 72 11 C91 14 99 32 95 53 C76 60 38 63 19 58 C16 57 15 56 16 55 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-military-beret-lower-margin" data-svg-african-role="side-headwear-band military-beret beret-band side-lower-margin single-curved-lower-margin above-ears hair-visible-below" d="M21 54 C41 61 77 59 94 53" fill="none" stroke="var(--headwear-shade)" stroke-width="3.5" opacity=".96" stroke-linecap="round"/>
        <path id="side-military-beret-highlight" data-svg-african-role="military-beret subtle-cap-detail no-translucent-center" d="M33 36 C54 25 78 30 92 44" fill="none" stroke="#ffffff" stroke-width="1.2" opacity=".12" stroke-linecap="round"/>
    </g>`;
        }
        if (/cap|hat|helmet|beanie|fedora|beret|crown/.test(headwear)) {
            return `<g id="side-generic-headwear" data-svg-african-role="headwear side-headwear general-hat regional-headwear ${headwear} structured-cap layer-over-hair closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline continuous-scalp-cover no-scalp-opening no-translucent-center hair-visible-below single-curved-lower-margin above-ears worn-over-scalp side-view-premium side-structured-headwear">
        <path id="side-headwear-crown" data-svg-african-role="side-headwear-crown crown closed-side-cap full-scalp-cover top-scalp-covered cap-covers-crown-to-earline no-scalp-opening hair-visible-below" d="M16 56 C15 28 34 5 60 5 C85 5 97 28 96 56 C78 63 36 63 16 56 Z" fill="var(--headwear)" opacity="1"/>
        <path id="side-headwear-band" data-svg-african-role="side-headwear-band single-curved-lower-margin above-ears hair-visible-below" d="M18 55 C38 62 76 62 94 55" fill="none" stroke="var(--accent)" stroke-width="2.1" opacity=".66" stroke-linecap="round"/>
        <path id="side-headwear-brim" data-svg-african-role="side-headwear-brim side-brim worn-over-scalp" d="M13 57 C36 51 78 51 98 57 C83 64 33 64 13 57 Z" fill="var(--headwear-shade)" opacity=".74"/>
    </g>`;
        }
        return '';
    }

    function compileSideHeadLandmarks(config = {}, state = {}, adjustments = {}) {
        const identity = readIdentity(config);
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const presentationProfile = getPresentationVisualProfile(presentation);
        const headType = normalizeId(identity.headType || config.headType, 'balanced');
        const headProfile = HEAD_TYPE_VISUAL_PROFILES[headType] || HEAD_TYPE_VISUAL_PROFILES.balanced;
        const faceShape = normalizeId(identity.face || config.face, 'oval');
        const faceProfile = SIDE_FACE_SHAPE_PROFILES[faceShape] || SIDE_FACE_SHAPE_PROFILES.oval;
        const faceStrength = clamp(0.54 + getAdjustmentValue(adjustments, 'faceShapeStrength') * 0.20, 0.32, 0.78);
        const headWidth = getHeadWidthAdjustment(adjustments);
        const headHeight = getHeadHeightAdjustment(adjustments);
        const faceWidth = getAdjustmentValue(adjustments, 'faceWidth');
        const foreheadProjection = getAdjustmentValue(adjustments, 'foreheadProjection');
        const browRidge = getAdjustmentValue(adjustments, 'browRidge');
        const cheekFullness = getAdjustmentValue(adjustments, 'cheekFullness');
        const jawDepth = getAdjustmentValue(adjustments, 'jawDepth');
        const chinProjection = getAdjustmentValue(adjustments, 'chinProjection');
        const chinHeight = getAdjustmentValue(adjustments, 'chinHeight');
        const occiputDepth = getAdjustmentValue(adjustments, 'occiputDepth');
        const earSize = getAdjustmentValue(adjustments, 'earSize');
        const earHeight = getAdjustmentValue(adjustments, 'earHeight');
        const noseWidth = getAdjustmentValue(adjustments, 'noseWidth');
        const noseLength = getAdjustmentValue(adjustments, 'noseLength');
        const lipFullness = getAdjustmentValue(adjustments, 'lipFullness');
        const lipHeight = getAdjustmentValue(adjustments, 'lipHeight');
        const lipWidth = getAdjustmentValue(adjustments, 'lipWidth');
        const browRaise = clamp(state.browRaise, -6, 6);
        const lowerFaceTaper = presentation === 'female' ? -1.2 : (presentation === 'male' ? 0.25 : -0.45);
        const rearJawTaper = presentation === 'female' ? 2 : (presentation === 'male' ? -0.5 : 0.6);

        const facialStyle = getFacialStyleProfile(config);
        const noseStyleProjection = facialStyle.nose.profileProjection;
        const lipStyleProjection = facialStyle.lips.projection;
        const headTop = clamp(8.5 + headProfile.crownLift - headHeight * 6, 1.5, 14);
        const browY = clamp(58 - browRaise * 0.72 - getAdjustmentValue(adjustments, 'browHeight') * 5, 51, 64);
        const eyeY = clamp(66.5 - getAdjustmentValue(adjustments, 'eyeHeight') * 5, 60.5, 73);
        const mouthY = clamp(91 - lipHeight * 3, 86, 99);
        const profileBackX = clamp(10.5 - headWidth * 6 - faceWidth * 3 - headProfile.occiputDepth - occiputDepth * 6, 2, 20);
        const profileCrownX = clamp(44 + headProfile.crownShift - headWidth, 38, 49);
        const profileForeheadY = clamp(31 + headProfile.crownLift * 0.18 - headHeight * 3, 25, 35);
        const profileForeheadX = clamp(
            72.4 + headWidth * 3.8 + faceWidth * 5.5 + headProfile.foreheadShift + (headProfile.facialDepth || 0) * 0.45 + faceProfile.forehead * faceStrength
                + foreheadProjection * 5 + (presentationProfile.faceWidth || 0),
            60,
            84
        );
        const profileBrowX = clamp(profileForeheadX + 1.15 + browRidge * 2 + presentationProfile.browStroke * 2.2, 62, 85);
        const profileEyeCenterX = clamp(profileBrowX - 7.4 + faceWidth * 1.4 + (headProfile.facialDepth || 0) * 0.35 + getAdjustmentValue(adjustments, 'eyeSpacing') * 3, 54, 76);
        const profileNoseBridgeX = clamp(profileBrowX - 1.8 + browRidge * 0.3, 62, 80);
        const profileNoseBridgeY = clamp(65.5 + noseLength * 0.7, 63, 69);
        const profileNoseTipX = clamp(78.5 + noseStyleProjection + noseLength * 2 + presentationProfile.noseWidth * 9 + presentationProfile.noseLength * 7 + (headProfile.facialDepth || 0) * 0.25, 73.5, 83.5);
        const profileNoseTipY = clamp(75 + noseLength, 72, 79);
        const profileNoseBottomY = clamp(81.2 + noseWidth * 0.8, 78.5, 84);
        const profileCheekX = clamp(63 + faceWidth * 5 + (headProfile.facialDepth || 0) * 0.75 + faceProfile.cheek * faceStrength + cheekFullness * 4 + presentationProfile.cheekScale * 45, 54, 74);
        const profileLipFrontX = clamp(
            Math.max(75.8 + faceWidth * 4 + lipStyleProjection + (headProfile.facialDepth || 0) * 0.4 + lipFullness * 1.5 + lipWidth * 1.8 + presentationProfile.lipFullness * 4, profileNoseTipX - 3),
            68.5,
            82.5
        );
        const profileSubnasaleX = clamp(
            Math.max(profileNoseTipX - 3.8, profileLipFrontX - 3.2),
            68.5,
            82
        );
        const profilePhiltrumX = clamp(
            Math.max(profileSubnasaleX + 0.55, profileLipFrontX - 1.8),
            70,
            83.5
        );
        const profileMouthBackX = clamp(profileCheekX + 2.6 + faceWidth * 1.5 - lipWidth * 1.9 - presentationProfile.lipWidth * 12, 59, 76);
        const profileChinFrontX = clamp(
            72.4 + lowerFaceTaper + faceWidth * 4 + (headProfile.facialDepth || 0) * 0.6 + faceProfile.chin * faceStrength + chinProjection * 4.2 + presentationProfile.chinScale * 22,
            65.5,
            82.5
        );
        const profileChinY = clamp(
            108.8 + (headProfile.chinDrop || 0) + faceProfile.chinDrop * faceStrength + chinHeight * 5 + presentationProfile.chinDrop * 6,
            103,
            121
        );
        const profileJawBackX = clamp(
            30.5 + rearJawTaper - faceWidth * 1.5 - headProfile.templeDepth * 0.5 - faceProfile.jawDepth * faceStrength - jawDepth * 5 - presentationProfile.jawScale * 25,
            20,
            39
        );
        const profileJawY = clamp(102.5 + (headProfile.chinDrop || 0) * 0.35 + faceProfile.chinDrop * faceStrength * 0.35 + chinHeight * 2 + presentationProfile.chinDrop * 4, 98, 110);
        const browStroke = clamp(2.35 + presentationProfile.browStroke * 3, 1.5, 3.1);
        const browArch = clamp(2 + presentationProfile.browHeight * 2, 1.2, 3.2);
        const eyeOpenness = clamp(2.35 + presentationProfile.browHeight * 0.45, 2.1, 2.6);
        const lipFullnessBias = (1 + presentationProfile.lipFullness * 1.4) * facialStyle.lips.fullness;
        const chinRoundness = clamp(4.2 - presentationProfile.chinScale * 40, 3.2, 5.8);
        const earCenterX = clamp(profileBackX + 23 + headProfile.templeDepth * 0.35, 27, 41);
        const earCenterY = clamp((eyeY + profileNoseBottomY) * 0.5 + 3.5 - earHeight * 6, 69, 85);
        const earRx = clamp(7.1 * (1 + earSize * 0.38), 5.5, 9.8);
        const earRy = clamp(14.5 * (1 + earSize * 0.34), 11, 19.5);
        const rearHairEndY = clamp(earCenterY + earRy * 0.78, 80, 101);
        const femaleTempleEndY = clamp(earCenterY + earRy * 0.92, 82, 104);
        const hairlineY = clamp(browY - 9 + (headProfile.hairlineDrop || 0) * 0.22 - getAdjustmentValue(adjustments, 'hairlineHeight') * 5, 42, 53);
        const hairBackX = clamp(profileBackX - 5 - Math.max(0, getAdjustmentValue(adjustments, 'hairVolume')) * 2.5, 2, 18);
        const hairTopY = clamp(headTop - 4 - getAdjustmentValue(adjustments, 'hairVolume') * 7, 0.5, 9);
        const hairFrontX = clamp(profileForeheadX + 3.8, 64, 88);
        const headwearScaleX = clamp(0.82 + headWidth * 0.16 + headProfile.occiputDepth * 0.012 + occiputDepth * 0.08, 0.74, 0.94);
        const headwearScaleY = clamp(0.84 + headHeight * 0.13 - headProfile.crownLift * 0.008, 0.78, 0.96);
        const headwearTranslateX = 8 - (headwearScaleX - 0.82) * 38;
        const headwearTranslateY = -2 + (headTop - 8) * 0.55;

        return Object.freeze({
            headType,
            faceShape,
            faceStrength,
            browStroke,
            browArch,
            eyeOpenness,
            lipFullnessBias,
            chinRoundness,
            headTop,
            browY,
            eyeY,
            mouthY,
            profileBackX,
            profileCrownX,
            profileForeheadX,
            profileForeheadY,
            profileBrowX,
            profileEyeCenterX,
            profileNoseBridgeX,
            profileNoseBridgeY,
            profileNoseTipX,
            profileNoseTipY,
            profileNoseBottomY,
            profileCheekX,
            profileLipFrontX,
            profileSubnasaleX,
            profilePhiltrumX,
            profileMouthBackX,
            profileChinFrontX,
            profileChinY,
            profileJawBackX,
            profileJawY,
            earCenterX,
            earCenterY,
            earRx,
            earRy,
            rearHairEndY,
            femaleTempleEndY,
            hairlineY,
            hairBackX,
            hairTopY,
            hairFrontX,
            headwearScaleX,
            headwearScaleY,
            headwearTranslateX,
            headwearTranslateY
        });
    }

    function renderSideHeadNeck(config, p, options = {}) {
        const state = getFaceState(config, options.faceState);
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const styling = readStyling(config);
        const identity = readIdentity(config);
        const view = normalizePremiumView(styling.view || config.view || 'side-right');
        const isLeft = view === 'side-left';
        const hair = normalizeId(identity.hair || config.hair, 'low-cut');
        const hairColor = normalizeId(identity.hairColor || config.hairColor, 'natural-black');
        const headwear = normalizeId(styling.headwear || config.headwear, 'none');
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const ageGroup = normalizeId(identity.ageGroup || config.ageGroup, 'adult');
        const faceShape = normalizeId(identity.face || config.face, 'oval');
        const headType = normalizeId(identity.headType || config.headType, 'balanced');
        const facialStyle = getFacialStyleProfile(config);
        const isModestHeadwear = MODEST_HEADWEAR.has(headwear);
        const isNiqab = headwear === 'niqab';
        const headNod = clamp(state.headNod, -8, 8);
        const headTilt = clamp(state.headTilt, -8, 8);
        const neckWidth = getNeckWidthAdjustment(adjustments);
        const neckHeight = getNeckHeightAdjustment(adjustments);
        const hairVolume = clamp(getAdjustmentValue(adjustments, 'hairVolume'), -0.35, 0.42);
        const hasStructuredHeadwear = headwear !== 'none' && !isModestHeadwear && !isNiqab;
        const blink = clamp(state.blink, 0, 1);
        const gazeX = clamp(state.gazeX, -8, 8);
        const gazeY = clamp(state.gazeY, -5, 5);
        const mouthOpen = clamp(state.mouthOpen, 0, 1);
        const mouthWide = clamp(state.mouthWide, -1, 1);
        const mouthRound = clamp(state.mouthRound, 0, 1);
        const lipPress = clamp(state.lipPress, 0, 1);
        const jawOpen = clamp(state.jawOpen, 0, 1);
        const mouthOpeningGain = clamp(state.mouthOpeningGain ?? 1, 0.75, 3.2);
        const upperLipLift = clamp(state.upperLipLift, -1, 1);
        const lowerLipDrop = clamp(state.lowerLipDrop, -1, 1);
        const speechMouthOpen = clamp(mouthOpen + jawOpen * 0.42 - lipPress * 0.22, 0, 1);
        const smile = clamp(state.smile, -1, 1);
        const eyeScale = clamp(0.82 + getAdjustmentValue(adjustments, 'eyeSize') * 0.30, 0.64, 1.02);
        const lipFullness = getAdjustmentValue(adjustments, 'lipFullness');
        const browLength = getAdjustmentValue(adjustments, 'browLength');
        const facialHair = normalizeId(identity.facialHair || config.facialHair, 'none');
        const mirror = isLeft ? 'translate(98 0) scale(-1 1)' : '';
        const landmarks = compileSideHeadLandmarks(config, state, adjustments);
        const {
            browStroke,
            browArch,
            eyeOpenness,
            lipFullnessBias,
            chinRoundness,
            headTop,
            browY,
            eyeY,
            mouthY,
            profileBackX,
            profileCrownX,
            profileForeheadX,
            profileForeheadY,
            profileBrowX,
            profileEyeCenterX,
            profileNoseBridgeX,
            profileNoseBridgeY,
            profileNoseTipX,
            profileNoseTipY,
            profileNoseBottomY,
            profileCheekX,
            profileLipFrontX,
            profileSubnasaleX,
            profilePhiltrumX,
            profileMouthBackX,
            profileChinFrontX,
            profileChinY,
            profileJawBackX,
            profileJawY,
            earCenterX,
            earCenterY,
            earRx,
            earRy,
            rearHairEndY,
            femaleTempleEndY,
            hairlineY,
            hairBackX,
            hairTopY,
            hairFrontX,
            headwearScaleX,
            headwearScaleY,
            headwearTranslateX,
            headwearTranslateY
        } = landmarks;
        const upperLipTravel = (speechMouthOpen * 0.32 + upperLipLift * 0.68 + mouthRound * 0.08 - lipPress * 0.08) * mouthOpeningGain;
        const lowerLipTravel = (speechMouthOpen * 0.82 + jawOpen * 0.44 + lowerLipDrop * 0.58 - lipPress * 0.1) * mouthOpeningGain;
        const mouthOpenH = Math.max(0.3, 0.72 + upperLipTravel + lowerLipTravel + lipFullness * 0.92);
        const openVisibility = clamp((speechMouthOpen - 0.025) * 4.4, 0, 1);
        const cavityOpacity = clamp((speechMouthOpen - 0.015) * 1.18, 0, 0.98) * (1 - lipPress * 0.72);
        const teethCue = Math.max(0, mouthWide) * 0.45 + Math.max(0, upperLipLift) * 2
            + lipPress * 0.9 * openVisibility;
        const teethOpacity = clamp(teethCue * (0.32 + openVisibility * 0.68) * (1 - jawOpen * 0.72) * (1 - mouthRound * 0.85), 0, 0.9);
        const tongueOpacity = clamp((speechMouthOpen - 0.1) * 1.65 * Math.pow(Math.max(0, 1 - jawOpen * 0.92), 1.4)
            * (1 - Math.abs(mouthWide) * 0.72) * (1 - mouthRound * 0.88)
            * (1 - Math.max(0, lowerLipDrop) * 0.58), 0, 0.36);
        const speechLipFrontX = profileLipFrontX + mouthRound * 2.2 - mouthWide * 0.35 - lipPress * 0.45;
        const speechMouthBackX = profileMouthBackX - mouthWide * 1.15 + mouthRound * 0.35;
        const speechUpperLipY = mouthY - upperLipTravel;
        const speechLowerLipY = mouthY + lowerLipTravel + 1.2;
        const neckLeft = clamp(37 - neckWidth * 6, 29, 42);
        const neckRight = clamp(58 + neckWidth * 4, 55, 68);
        const neckTop = clamp(99 + neckHeight * 5, 92, 108);
        const neckBottom = clamp(151 + neckHeight * 10, 143, 164);
        const profileUpperLipY = clamp(mouthY - 2.8 - upperLipTravel, 84, 96);
        const profileLowerLipY = clamp(mouthY + mouthOpenH + 1.2, 90, 110);
        const sideBrowSpan = clamp(7.5 * (1 + browLength * 0.62), 4.8, 10.2);
        const eyeStyleWidthScale = facialStyle.eyes.halfWidth / 7.7;
        const eyeStyleHeightScale = facialStyle.eyes.halfHeight / 3.4;
        const eyeHalfWidth = clamp(6.1 * eyeScale * eyeStyleWidthScale, 4.2, 7.6);
        const eyeHalfHeight = clamp(eyeOpenness * eyeScale * eyeStyleHeightScale * (1 - blink * 0.88), 0.28, 3.2);
        const irisX = clamp(profileEyeCenterX + 2.0 + gazeX * 0.18, profileEyeCenterX - 1, profileEyeCenterX + 4.6);
        const irisY = clamp(eyeY + gazeY * 0.16, eyeY - 1.2, eyeY + 1.2);
        const headTransform = `translate(50 76) rotate(${headTilt.toFixed(2)}) translate(-50 -76) translate(0 ${(headNod * 0.18).toFixed(2)})`;
        const longHair = LONG_HAIRS.has(hair) || PONYTAIL_HAIRS.has(hair) || SIDE_BRAID_HAIRS.has(hair);
        const braidedHair = BRAID_HAIRS.has(hair);
        const texturedHair = CORNROW_HAIRS.has(hair) || LOC_TWIST_HAIRS.has(hair) || braidedHair;
        const afroHair = AFRO_HAIRS.has(hair) || hair === 'afro-puff';
        const closeCropHair = CLOSE_CROP_HAIRS.has(hair);
        const hairTempleX = clamp(hairFrontX, 62, 85);
        const hairNapeX = clamp(profileJawBackX - 5, 18, 32);
        const earTop = earCenterY - earRy;
        const earBottom = earCenterY + earRy;
        const earLeft = earCenterX - earRx;
        const earRight = earCenterX + earRx;
        const rearHairEndX = clamp(earCenterX - earRx * 0.72, profileBackX + 3, earCenterX - 2);
        const sideRearCloseCropPath = `M${hairBackX.toFixed(1)} ${rearHairEndY.toFixed(1)} C${(hairBackX - 3).toFixed(1)} 45 ${(profileBackX + 3).toFixed(1)} 17 ${profileCrownX.toFixed(1)} ${hairTopY.toFixed(1)} C${(profileCrownX + 17).toFixed(1)} ${hairTopY.toFixed(1)} ${(hairTempleX + 3).toFixed(1)} ${(profileForeheadY + 1).toFixed(1)} ${hairTempleX.toFixed(1)} ${hairlineY.toFixed(1)} C${(hairTempleX - 3).toFixed(1)} ${(hairlineY + 5).toFixed(1)} ${(earRight + 2).toFixed(1)} ${(earTop - 1).toFixed(1)} ${(earRight - 1).toFixed(1)} ${(earTop + 3).toFixed(1)} C${(earCenterX + earRx * 0.18).toFixed(1)} ${(earCenterY + earRy * 0.38).toFixed(1)} ${rearHairEndX.toFixed(1)} ${rearHairEndY.toFixed(1)} ${hairBackX.toFixed(1)} ${rearHairEndY.toFixed(1)} Z`;
        const sideRearScalpPath = `M${hairBackX.toFixed(1)} ${rearHairEndY.toFixed(1)} C${(hairBackX - 3).toFixed(1)} 43 ${(profileBackX + 2).toFixed(1)} 16 ${profileCrownX.toFixed(1)} ${hairTopY.toFixed(1)} C${(profileCrownX + 18).toFixed(1)} ${hairTopY.toFixed(1)} ${(hairTempleX + 4).toFixed(1)} ${(profileForeheadY + 1).toFixed(1)} ${hairTempleX.toFixed(1)} ${hairlineY.toFixed(1)} C${(hairTempleX - 3).toFixed(1)} ${(hairlineY + 5).toFixed(1)} ${(earRight + 2).toFixed(1)} ${(earTop - 1).toFixed(1)} ${(earRight - 1).toFixed(1)} ${(earTop + 3).toFixed(1)} C${(earCenterX + earRx * 0.18).toFixed(1)} ${(earCenterY + earRy * 0.38).toFixed(1)} ${rearHairEndX.toFixed(1)} ${rearHairEndY.toFixed(1)} ${hairBackX.toFixed(1)} ${rearHairEndY.toFixed(1)} Z`;
        const sideRearBobPath = `M${hairBackX.toFixed(1)} ${hairlineY.toFixed(1)} C${(hairBackX - 2).toFixed(1)} 26 ${(profileBackX + 8).toFixed(1)} ${hairTopY.toFixed(1)} ${profileCrownX.toFixed(1)} ${hairTopY.toFixed(1)} C${(profileCrownX + 15).toFixed(1)} ${hairTopY.toFixed(1)} ${(hairTempleX + 5).toFixed(1)} ${(profileForeheadY + 1).toFixed(1)} ${(hairTempleX + 2).toFixed(1)} ${hairlineY.toFixed(1)} C${(profileCheekX - 4).toFixed(1)} 61 ${(profileCheekX - 8).toFixed(1)} 82 ${(profileJawBackX + 7).toFixed(1)} 105 C${(profileJawBackX + 5).toFixed(1)} 123 ${(profileJawBackX + 1).toFixed(1)} 136 ${hairNapeX.toFixed(1)} 142 C${(hairBackX + 7).toFixed(1)} 138 ${(hairBackX + 1).toFixed(1)} 129 ${hairBackX.toFixed(1)} 117 C${(hairBackX + 3).toFixed(1)} 95 ${(hairBackX - 2).toFixed(1)} 76 ${hairBackX.toFixed(1)} ${hairlineY.toFixed(1)} Z`;
        const sideRearLongPath = `M${hairBackX.toFixed(1)} ${hairlineY.toFixed(1)} C${(hairBackX - 2).toFixed(1)} 26 ${(profileBackX + 8).toFixed(1)} ${hairTopY.toFixed(1)} ${profileCrownX.toFixed(1)} ${hairTopY.toFixed(1)} C${(profileCrownX + 14).toFixed(1)} ${hairTopY.toFixed(1)} ${(hairTempleX + 4).toFixed(1)} ${(profileForeheadY + 1).toFixed(1)} ${(hairTempleX + 1).toFixed(1)} ${hairlineY.toFixed(1)} C${(profileCheekX - 5).toFixed(1)} 61 ${(profileCheekX - 9).toFixed(1)} 84 ${(profileJawBackX + 6).toFixed(1)} 110 C${(profileJawBackX + 4).toFixed(1)} 131 ${(profileJawBackX + 1).toFixed(1)} 150 ${hairNapeX.toFixed(1)} 157 C${(hairBackX + 5).toFixed(1)} 160 ${(hairBackX - 1).toFixed(1)} 157 ${(hairBackX - 3).toFixed(1)} 152 C${(hairBackX + 1).toFixed(1)} 123 ${(hairBackX - 3).toFixed(1)} 86 ${hairBackX.toFixed(1)} ${hairlineY.toFixed(1)} Z`;
        const scalpBackShell = '';
        const hairBack = (() => {
            if (hair === 'bald' || isModestHeadwear || isNiqab) return '';
            if (closeCropHair) {
                return `<path id="side-close-crop-hair" data-svg-african-role="hair hair-back close-crop ${hair} side-view-premium full-scalp-cover side-profile-hair-wrap side-scalp-full-cover side-crown-complete clean-side-profile-hair side-hair-clean-back short-hair-above-nape fitted-scalp-hair hair-ends-lower-ear ordinary-hair-earline not-headgear-above-ear ${hairColor}" d="${sideRearCloseCropPath}" fill="var(--hair)"/>`;
            }
            if (afroHair) {
                const puff = hair === 'afro-puff'
                    ? '<circle id="side-afro-puff" cx="45" cy="13" r="15" fill="var(--hair)" opacity=".98"/>'
                    : '';
                return `<path id="side-afro" data-svg-african-role="hair hair-back side-view-premium full-scalp-cover side-profile-hair-wrap side-scalp-full-cover side-crown-complete clean-side-profile-hair side-hair-clean-back ${hairColor}" d="M${(hairBackX - 4).toFixed(1)} ${(hairlineY + 7).toFixed(1)} C${(hairBackX - 7).toFixed(1)} 25 ${(profileBackX + 6).toFixed(1)} ${(hairTopY - 2).toFixed(1)} ${(profileCrownX + 2).toFixed(1)} ${(hairTopY - 2).toFixed(1)} C${(profileCrownX + 22).toFixed(1)} ${(hairTopY - 1).toFixed(1)} ${(hairFrontX + 10).toFixed(1)} 15 ${(hairFrontX + 12).toFixed(1)} ${(profileForeheadY + 4).toFixed(1)} C${(hairFrontX + 8).toFixed(1)} 40 ${hairTempleX.toFixed(1)} 43 ${(profileCheekX - 3).toFixed(1)} 49 C${(profileCheekX - 9).toFixed(1)} 62 ${(profileJawBackX + 7).toFixed(1)} 96 ${hairNapeX.toFixed(1)} 114 C${(hairBackX + 8).toFixed(1)} 122 ${(hairBackX + 1).toFixed(1)} 120 ${(hairBackX - 2).toFixed(1)} 116 C${(hairBackX - 7).toFixed(1)} 101 ${(hairBackX - 8).toFixed(1)} 79 ${(hairBackX - 4).toFixed(1)} ${(hairlineY + 7).toFixed(1)} Z" fill="var(--hair)"/>${puff}`;
            }
            if (BOB_HAIRS.has(hair)) {
                const compactBob = hair === 'pixie-cut';
                const sideEnd = compactBob ? 104 : 136;
                const crownPath = compactBob
                    ? sideRearScalpPath
                    : sideRearBobPath;
                return `<g id="side-bob-hair" data-svg-african-role="hair hair-back side-view-premium bob-hair ${hair} full-scalp-cover side-profile-hair-wrap side-scalp-full-cover side-crown-complete clean-side-profile-hair side-hair-clean-back ear-framing ${hairColor}">
        <path id="side-bob-crown" data-svg-african-role="hair-cap scalp-cover crown-cover full-scalp-cover" d="${crownPath}" fill="var(--hair)"/>
        <path id="side-bob-under-curve" data-svg-african-role="bob-under-curve outside-neck" d="M24 ${(sideEnd - 8).toFixed(1)} C35 ${sideEnd.toFixed(1)} 55 ${sideEnd.toFixed(1)} 68 ${(sideEnd - 8).toFixed(1)}" fill="none" stroke="var(--hair-light)" stroke-width="1.35" opacity=".18" stroke-linecap="round"/>
        ${hair === 'side-part-bob' ? '<path id="side-bob-part" data-svg-african-role="hair-detail side-part-bob crown-only no-face-crossing" d="M38 25 C51 17 70 19 84 31" fill="none" stroke="var(--hair-light)" stroke-width="1.3" opacity=".18" stroke-linecap="round"/>' : ''}
    </g>`;
            }
            if (longHair) {
                return `<path id="side-long-hair" data-svg-african-role="hair hair-back side-view-premium long-hair rear-hair-curtain behind-head behind-neck no-neck-overlap no-face-overlap full-scalp-cover side-profile-hair-wrap side-scalp-full-cover side-crown-complete clean-side-profile-hair side-hair-clean-back ${hairColor}" d="${sideRearLongPath}" fill="var(--hair)"/>`;
            }
            if (braidedHair) {
                const sideBraidPaths = hair === 'box-braids'
                    ? ['M23 53 C17 80 20 118 30 157', 'M38 49 C32 82 35 121 41 159', 'M65 51 C72 78 70 111 61 149']
                    : hair === 'fulani-braids'
                        ? ['M22 53 C17 78 20 111 29 148', 'M36 49 C31 80 34 116 41 154', 'M66 51 C72 76 70 106 62 143']
                        : ['M20 54 C14 79 17 114 27 153', 'M31 51 C25 81 28 119 36 158', 'M43 48 C38 83 41 122 46 159', 'M67 52 C74 79 71 112 62 150'];
                return `<g id="side-braided-hair" data-svg-african-role="hair hair-back side-view-premium braided-hair ${hair} full-scalp-cover side-profile-hair-wrap side-scalp-full-cover side-crown-complete clean-side-profile-hair side-hair-clean-back ear-framing ${hairColor}" data-svg-african-hair-style="${hair}">
        <path id="side-braided-cap" data-svg-african-role="hair-cap scalp-cover crown-cover fitted-scalp-hair" d="${sideRearScalpPath}" fill="var(--hair)"/>
        <path id="side-braid-root-sections" data-svg-african-role="side-hair-lines braid-roots crown-partings visible-braid-texture" d="M27 36 C38 18 48 10 56 8 M40 44 C47 23 52 13 56 8 M57 45 C58 25 58 14 56 8 M72 42 C67 24 61 13 56 8" fill="none" stroke="var(--hair-light)" stroke-width="1.15" opacity=".62" stroke-linecap="round"/>
        ${renderBraidedPlaits(`side-${hair}-plaits`, sideBraidPaths, { width: hair === 'box-braids' ? 5.2 : hair === 'fulani-braids' ? 4 : 4.35, detailWidth: 1.3, role: `side-braid-plaits individual-braids segmented-braids behind-ear outside-face no-face-crossing ${hair}` })}
    </g>`;
            }
            if (texturedHair) {
                return `<path id="side-braided-cap" data-svg-african-role="hair hair-back side-view-premium braided full-scalp-cover side-profile-hair-wrap side-scalp-full-cover side-crown-complete clean-side-profile-hair side-hair-clean-back fitted-scalp-hair hair-ends-lower-ear ordinary-hair-earline not-headgear-above-ear ${hairColor}" d="${sideRearScalpPath}" fill="var(--hair)"/>
    <path id="side-braid-lines" data-svg-african-role="side-hair-lines crown-only clean-side-profile-hair" d="M27 36 C38 18 48 10 56 8 M42 43 C47 24 52 13 56 8 M72 42 C67 24 61 13 56 8" fill="none" stroke="var(--hair-light)" stroke-width=".9" opacity=".12" stroke-linecap="round"/>`;
            }
            return `<path id="side-scalp-hair" data-svg-african-role="hair hair-back side-view-premium full-scalp-cover side-profile-hair-wrap side-scalp-full-cover side-crown-complete clean-side-profile-hair side-hair-clean-back fitted-scalp-hair hair-ends-lower-ear ordinary-hair-earline not-headgear-above-ear ${hairColor}" d="${sideRearScalpPath}" fill="var(--hair)"/>`;
        })();
        const sideHairlineY = hairlineY;
        const sideHairCapTop = hairTopY;
        const faceFramingHair = longHair || BOB_HAIRS.has(hair);
        const baseHairFront = (!isModestHeadwear && !isNiqab && !hasStructuredHeadwear && hair !== 'bald')
            ? (closeCropHair
                ? `<path id="side-close-crop-hairline" data-svg-african-role="hairline hair-front hairline-detail close-crop ${hair} side-view-premium side-hair-clean-front full-scalp-cover brow-clear natural-temple-line" d="M${(profileCrownX + 6).toFixed(1)} ${(sideHairCapTop + 1).toFixed(1)} C${(profileCrownX + 18).toFixed(1)} ${(sideHairCapTop + 3).toFixed(1)} ${(hairFrontX + 1).toFixed(1)} ${(profileForeheadY + 1).toFixed(1)} ${hairFrontX.toFixed(1)} ${sideHairlineY.toFixed(1)} C${(hairFrontX - 3).toFixed(1)} ${(sideHairlineY + 3).toFixed(1)} ${(earCenterX + earRx + 2).toFixed(1)} ${(earCenterY - earRy - 2).toFixed(1)} ${(earCenterX + earRx * 0.45).toFixed(1)} ${(earCenterY - earRy + 1).toFixed(1)}" fill="none" stroke="var(--hair-light)" stroke-width=".85" stroke-linecap="round" opacity=".16"/>`
                : faceFramingHair
                    ? `<g id="side-face-framing-hair" data-svg-african-role="hairline hair-front side-view-premium side-hair-clean-front full-scalp-cover brow-clear face-framing-hair natural-forward-hairline no-bald-temple">
        <path id="side-face-framing-sweep" data-svg-african-role="hair-front fringe temple-cover brow-clear" d="M${(profileCrownX + 1).toFixed(1)} ${(sideHairCapTop + 1).toFixed(1)} C${(profileCrownX + 24).toFixed(1)} ${(sideHairCapTop + 1).toFixed(1)} ${(hairFrontX + 6).toFixed(1)} ${(profileForeheadY - 3).toFixed(1)} ${hairFrontX.toFixed(1)} ${sideHairlineY.toFixed(1)} C${(hairFrontX - 4).toFixed(1)} ${(sideHairlineY + 4).toFixed(1)} ${(earCenterX + earRx + 2).toFixed(1)} ${(earCenterY - earRy - 2).toFixed(1)} ${(earCenterX + earRx * 0.35).toFixed(1)} ${(earCenterY - earRy + 1).toFixed(1)} C${(earCenterX + earRx).toFixed(1)} ${(earCenterY - earRy - 8).toFixed(1)} ${(profileCrownX + 3).toFixed(1)} ${(profileForeheadY - 5).toFixed(1)} ${(profileCrownX + 1).toFixed(1)} ${(sideHairCapTop + 1).toFixed(1)} Z" fill="var(--hair)" opacity=".99"/>
        <path id="side-face-framing-lock" data-svg-african-role="hair-front face-framing-lock beside-ear beside-cheek behind-jaw natural-side-lock no-face-crossing" d="M${(earCenterX - earRx * 0.45).toFixed(1)} ${(earCenterY - earRy + 3).toFixed(1)} C${(earCenterX - earRx - 2).toFixed(1)} ${(earCenterY + 8).toFixed(1)} ${(profileJawBackX + 3).toFixed(1)} 107 ${(profileJawBackX + 5).toFixed(1)} 124 C${(profileJawBackX + 13).toFixed(1)} 117 ${(profileJawBackX + 14).toFixed(1)} 108 ${(profileJawBackX + 10).toFixed(1)} 99 C${(profileJawBackX + 5).toFixed(1)} 85 ${(profileJawBackX + 7).toFixed(1)} 69 ${(earCenterX + earRx * 0.55).toFixed(1)} ${(earCenterY - earRy + 2).toFixed(1)} Z" fill="var(--hair)" opacity=".96"/>
    </g>`
                    : `<g id="side-natural-hairline" data-svg-african-role="hairline hair-front side-view-premium side-hair-clean-front full-scalp-cover brow-clear natural-forward-hairline no-bald-temple">
        <path id="side-natural-temple" data-svg-african-role="hair-front temple-cover fitted-to-earline brow-clear" d="M${hairFrontX.toFixed(1)} ${sideHairlineY.toFixed(1)} C${(hairFrontX - 3).toFixed(1)} ${(sideHairlineY + 3).toFixed(1)} ${(earCenterX + earRx + 2).toFixed(1)} ${(earCenterY - earRy - 2).toFixed(1)} ${(earCenterX + earRx * 0.4).toFixed(1)} ${(earCenterY - earRy + 1).toFixed(1)} C${(earCenterX + earRx).toFixed(1)} ${(earCenterY - earRy - 7).toFixed(1)} ${(hairFrontX - 2).toFixed(1)} ${(sideHairlineY - 3).toFixed(1)} ${hairFrontX.toFixed(1)} ${sideHairlineY.toFixed(1)} Z" fill="var(--hair)" opacity=".99"/>
        <path id="side-natural-hairline-edge" data-svg-african-role="hairline-detail brow-clear" d="M${(profileCrownX + 9).toFixed(1)} ${(sideHairCapTop + 2).toFixed(1)} C${(profileCrownX + 20).toFixed(1)} ${(sideHairCapTop + 5).toFixed(1)} ${(hairFrontX + 1).toFixed(1)} ${(profileForeheadY + 3).toFixed(1)} ${hairFrontX.toFixed(1)} ${sideHairlineY.toFixed(1)}" fill="none" stroke="var(--hair-light)" stroke-width=".8" stroke-linecap="round" opacity=".14"/>
    </g>`)
            : '';
        const femaleTempleLock = presentation === 'female'
            && hair !== 'bald'
            && !isModestHeadwear
            && !isNiqab
            && !hasStructuredHeadwear
            ? `<path id="side-female-temple-lock" data-svg-african-role="hair-front female-temple-lock beside-visible-ear front-side-face-balance no-face-crossing hair-ends-lower-ear ordinary-hair-earline" d="M${(hairFrontX - 1).toFixed(1)} ${(hairlineY + 1).toFixed(1)} C${(hairFrontX - 5).toFixed(1)} ${(hairlineY + 7).toFixed(1)} ${(earRight + 2).toFixed(1)} ${(earTop + 1).toFixed(1)} ${(earRight + 1).toFixed(1)} ${(earTop + 6).toFixed(1)} C${earRight.toFixed(1)} ${(earCenterY + 5).toFixed(1)} ${(earCenterX + 3).toFixed(1)} ${femaleTempleEndY.toFixed(1)} ${earCenterX.toFixed(1)} ${femaleTempleEndY.toFixed(1)} C${(earCenterX + 5).toFixed(1)} ${(earCenterY + 5).toFixed(1)} ${(earCenterX + earRx * 0.72).toFixed(1)} ${(earTop + 3).toFixed(1)} ${(earCenterX + earRx * 0.62).toFixed(1)} ${earTop.toFixed(1)} C${(earRight + 5).toFixed(1)} ${(earTop - 4).toFixed(1)} ${(hairFrontX - 3).toFixed(1)} ${(hairlineY - 3).toFixed(1)} ${(hairFrontX - 1).toFixed(1)} ${(hairlineY + 1).toFixed(1)} Z" fill="var(--hair)" opacity=".97"/>`
            : '';
        const hairFront = `${baseHairFront}${femaleTempleLock}`;
        const headwearHairDropY = clamp(
            earBottom + (presentation === 'female' ? (faceFramingHair ? 15 : 7) : 1),
            earBottom,
            122
        );
        const structuredHeadwearHairReveal = hasStructuredHeadwear && hair !== 'bald'
            ? `<g id="side-headwear-hair-reveal" data-svg-african-role="hair hair-back hair-under-headwear visible-below-headgear behind-visible-ear below-visible-ear fitted-to-scalp headwear-hair-layer ${presentation === 'female' ? 'female-headwear-hair' : 'male-headwear-hair'}">
        <path id="side-headwear-scalp-hair-underlay" data-svg-african-role="hair hair-cap hair-under-headwear full-scalp-hair-underlay continuous-scalp-hair fitted-to-scalp overlaps-headwear-edge no-bald-gap" d="M${(hairBackX - 2).toFixed(1)} ${(rearHairEndY + 5).toFixed(1)} C${(hairBackX - 5).toFixed(1)} 38 ${(profileBackX + 2).toFixed(1)} 14 ${profileCrownX.toFixed(1)} ${hairTopY.toFixed(1)} C${(profileCrownX + 24).toFixed(1)} ${(hairTopY - 0.5).toFixed(1)} ${(hairFrontX + 6).toFixed(1)} ${(profileForeheadY - 5).toFixed(1)} ${hairFrontX.toFixed(1)} ${hairlineY.toFixed(1)} C${(hairFrontX - 2).toFixed(1)} ${(hairlineY + 6).toFixed(1)} ${(earRight + 2).toFixed(1)} ${(earTop - 2).toFixed(1)} ${(earRight - 1).toFixed(1)} ${(earTop + 3).toFixed(1)} C${(earCenterX + earRx * 0.12).toFixed(1)} ${(earCenterY + earRy * 0.45).toFixed(1)} ${(rearHairEndX + 1).toFixed(1)} ${(rearHairEndY + 5).toFixed(1)} ${(hairBackX - 2).toFixed(1)} ${(rearHairEndY + 5).toFixed(1)} Z" fill="var(--hair)" opacity="1"/>
        <path id="side-headwear-rear-hair" data-svg-african-role="hair-under-headwear rear-hair-reveal behind-ear lower-ear-hairline" d="M${hairBackX.toFixed(1)} ${(earTop - 5).toFixed(1)} C${(hairBackX - 2).toFixed(1)} ${(earCenterY - 2).toFixed(1)} ${(hairBackX + 1).toFixed(1)} ${(rearHairEndY + 5).toFixed(1)} ${(hairBackX + 9).toFixed(1)} ${(rearHairEndY + 7).toFixed(1)} C${(earLeft - 3).toFixed(1)} ${(earBottom + 3).toFixed(1)} ${(earLeft - 2).toFixed(1)} ${(earTop + 5).toFixed(1)} ${earCenterX.toFixed(1)} ${(earTop + 2).toFixed(1)} C${(earLeft - 2).toFixed(1)} ${(earTop - 2).toFixed(1)} ${(hairBackX + 4).toFixed(1)} ${(earTop - 7).toFixed(1)} ${hairBackX.toFixed(1)} ${(earTop - 5).toFixed(1)} Z" fill="var(--hair)"/>
        <path id="side-headwear-temple-hair" data-svg-african-role="hair-under-headwear temple-hair-reveal beside-ear below-ear no-face-crossing" d="M${(earRight - 1).toFixed(1)} ${(earTop + 1).toFixed(1)} C${(earRight + 3).toFixed(1)} ${(earCenterY - 1).toFixed(1)} ${(earRight + 2).toFixed(1)} ${(headwearHairDropY - 3).toFixed(1)} ${(earCenterX + 3).toFixed(1)} ${headwearHairDropY.toFixed(1)} C${(earCenterX + 6).toFixed(1)} ${(earCenterY + 5).toFixed(1)} ${(earCenterX + earRx * 0.72).toFixed(1)} ${(earTop + 4).toFixed(1)} ${(earRight - 1).toFixed(1)} ${(earTop + 1).toFixed(1)} Z" fill="var(--hair)" opacity=".98"/>
    </g>`
            : '';
        const structuredHeadwearScalpCover = hasStructuredHeadwear
            ? `<path id="side-headwear-scalp-cover" data-svg-african-role="headwear side-headwear side-headwear-scalp-cover layer-over-hair fitted-to-skull full-scalp-cover side-crown-complete continuous-scalp-cover top-scalp-covered cap-covers-crown-to-earline brow-clear no-scalp-gap" d="M${(hairBackX - 1).toFixed(1)} ${(hairlineY + 1).toFixed(1)} C${(hairBackX - 2).toFixed(1)} 25 ${(profileBackX + 8).toFixed(1)} ${(hairTopY - 1).toFixed(1)} ${profileCrownX.toFixed(1)} ${(hairTopY - 1).toFixed(1)} C${(profileCrownX + 15).toFixed(1)} ${(hairTopY - 1).toFixed(1)} ${(hairFrontX + 4).toFixed(1)} ${(profileForeheadY + 1).toFixed(1)} ${(hairFrontX + 3).toFixed(1)} ${(hairlineY - 1).toFixed(1)} C${(hairFrontX - 10).toFixed(1)} ${(hairlineY + 5).toFixed(1)} ${(profileBackX + 11).toFixed(1)} ${(hairlineY + 6).toFixed(1)} ${(hairBackX - 1).toFixed(1)} ${(hairlineY + 1).toFixed(1)} Z" fill="var(--headwear)" opacity="1"/>`
            : '';
        const continuousScalpCap = hair !== 'bald' && !isModestHeadwear && !isNiqab && !hasStructuredHeadwear
            ? `<path id="side-continuous-scalp-cap" data-svg-african-role="hair hair-cap scalp-cover full-scalp-cover front-to-back-scalp-cover side-scalp-full-cover side-crown-complete fitted-scalp-hair hair-ends-lower-ear ordinary-hair-earline not-headgear-above-ear hair-above-brow no-scalp-gap no-bald-temple ${hairColor}" d="M${hairBackX.toFixed(1)} ${rearHairEndY.toFixed(1)} C${(hairBackX - 4).toFixed(1)} 42 ${(profileBackX + 1).toFixed(1)} 16 ${profileCrownX.toFixed(1)} ${hairTopY.toFixed(1)} C${(profileCrownX + 24).toFixed(1)} ${(hairTopY - 0.5).toFixed(1)} ${(hairFrontX + 6).toFixed(1)} ${(profileForeheadY - 5).toFixed(1)} ${hairFrontX.toFixed(1)} ${hairlineY.toFixed(1)} C${(hairFrontX - 2).toFixed(1)} ${(hairlineY + 4).toFixed(1)} ${(earRight + 2).toFixed(1)} ${(earTop - 3).toFixed(1)} ${(earRight - 1).toFixed(1)} ${(earTop + 2).toFixed(1)} C${(earCenterX + earRx * 0.18).toFixed(1)} ${(earCenterY + earRy * 0.38).toFixed(1)} ${rearHairEndX.toFixed(1)} ${rearHairEndY.toFixed(1)} ${hairBackX.toFixed(1)} ${rearHairEndY.toFixed(1)} Z" fill="var(--hair)" opacity="1"/>
    <path id="side-front-scalp-seal" data-svg-african-role="hair hair-front scalp-cover front-scalp-seal no-exposed-scalp-wedge brow-clear" d="M${(profileCrownX + 1).toFixed(1)} ${(hairTopY + 0.5).toFixed(1)} C${(profileCrownX + 27).toFixed(1)} ${(hairTopY - 1).toFixed(1)} ${(hairFrontX + 8).toFixed(1)} ${(profileForeheadY - 5).toFixed(1)} ${(hairFrontX + 1).toFixed(1)} ${hairlineY.toFixed(1)} L${(hairFrontX - 4).toFixed(1)} ${(hairlineY + 1).toFixed(1)} C${(hairFrontX + 1).toFixed(1)} ${(profileForeheadY - 4).toFixed(1)} ${(profileCrownX + 18).toFixed(1)} ${(hairTopY + 1).toFixed(1)} ${(profileCrownX + 1).toFixed(1)} ${(hairTopY + 0.5).toFixed(1)} Z" fill="var(--hair)" opacity="1"/>
    <path id="side-scalp-flow" data-svg-african-role="hair-detail crown-flow subtle-hair-volume" d="M${(hairBackX + 7).toFixed(1)} ${(hairlineY - 6).toFixed(1)} C${(profileBackX + 8).toFixed(1)} 20 ${(profileCrownX + 1).toFixed(1)} ${(hairTopY + 4).toFixed(1)} ${(hairFrontX - 6).toFixed(1)} ${(profileForeheadY - 1).toFixed(1)}" fill="none" stroke="var(--hair-light)" stroke-width="1.05" opacity=".13" stroke-linecap="round"/>`
            : '';
        const rawHeadwearMarkup = renderSideHeadwearMarkup(headwear, { isModestHeadwear, isNiqab });
        const headwearMarkup = (!isModestHeadwear && !isNiqab && rawHeadwearMarkup)
            ? rawHeadwearMarkup
                .replace(/^<g\s+/, `<g transform="translate(${headwearTranslateX.toFixed(2)} ${headwearTranslateY.toFixed(2)}) scale(${headwearScaleX.toFixed(3)} ${headwearScaleY.toFixed(3)})" `)
                .replace('side-view-premium', 'side-view-premium side-headwear-above-brows side-headwear-fitted-to-skull frontmost-structured-headwear')
            : rawHeadwearMarkup;
        const skinFace = isNiqab ? '' : `
    <path id="side-face" data-svg-african-role="face-base skin side-view-premium profile-face profile-face-refined clean-side-profile-face profile-nose-lips-chin clean-profile-nose premium-profile-head-shape refined-side-skull forehead-clean smooth-convex-forehead strong-convex-forehead single-continuous-profile-contour anatomical-side-profile reference-profile-landmarks defined-profile-planes shallow-nasolabial-transition rounded-chin head-type-${headType} face-shape-${faceShape}" data-svg-african-profile-back-x="${profileBackX.toFixed(1)}" data-svg-african-profile-forehead-x="${profileForeheadX.toFixed(1)}" data-svg-african-profile-nose-x="${profileNoseTipX.toFixed(1)}" data-svg-african-profile-philtrum-x="${profilePhiltrumX.toFixed(1)}" data-svg-african-profile-lip-x="${profileLipFrontX.toFixed(1)}" d="
        M${profileBackX.toFixed(1)} 67
        C${Math.max(2, profileBackX - 6).toFixed(1)} 43 ${(profileBackX + 1).toFixed(1)} 16 ${profileCrownX.toFixed(1)} ${headTop.toFixed(1)}
        C${(profileCrownX + 18).toFixed(1)} ${(headTop - 0.5).toFixed(1)} ${(profileForeheadX - 1).toFixed(1)} ${(profileForeheadY - 15).toFixed(1)} ${(profileForeheadX + 1.8).toFixed(1)} ${profileForeheadY.toFixed(1)}
        C${(profileForeheadX + 4.8).toFixed(1)} ${(profileForeheadY + 8).toFixed(1)} ${(profileBrowX + 1.8).toFixed(1)} ${(browY - 8).toFixed(1)} ${profileBrowX.toFixed(1)} ${browY.toFixed(1)}
        C${(profileBrowX + 0.2).toFixed(1)} ${(browY + 3.5).toFixed(1)} ${(profileNoseBridgeX - 1.2).toFixed(1)} ${(profileNoseBridgeY - 2.5).toFixed(1)} ${profileNoseBridgeX.toFixed(1)} ${profileNoseBridgeY.toFixed(1)}
        C${(profileNoseBridgeX + 0.8).toFixed(1)} ${(profileNoseBridgeY + 2.3).toFixed(1)} ${(profileNoseTipX - 2.4).toFixed(1)} ${(profileNoseTipY - 3).toFixed(1)} ${profileNoseTipX.toFixed(1)} ${profileNoseTipY.toFixed(1)}
        C${(profileNoseTipX + 0.65).toFixed(1)} ${(profileNoseTipY + 1.5).toFixed(1)} ${(profileNoseTipX - 0.6).toFixed(1)} ${(profileNoseBottomY - 0.2).toFixed(1)} ${profileSubnasaleX.toFixed(1)} ${(profileNoseBottomY + 0.8).toFixed(1)}
        C${(profileSubnasaleX + 0.4).toFixed(1)} ${(profileNoseBottomY + 1.8).toFixed(1)} ${(profilePhiltrumX - 0.2).toFixed(1)} ${(profileUpperLipY - 1).toFixed(1)} ${profilePhiltrumX.toFixed(1)} ${profileUpperLipY.toFixed(1)}
        C${(profilePhiltrumX + 0.45).toFixed(1)} ${(profileUpperLipY + 0.1).toFixed(1)} ${(profileLipFrontX - 0.7).toFixed(1)} ${(profileUpperLipY - 0.2).toFixed(1)} ${profileLipFrontX.toFixed(1)} ${mouthY.toFixed(1)}
        C${(profileLipFrontX + 0.85).toFixed(1)} ${(mouthY + 1.6).toFixed(1)} ${(profileLipFrontX + 0.2).toFixed(1)} ${profileLowerLipY.toFixed(1)} ${(profileLipFrontX - 1.2).toFixed(1)} ${(profileLowerLipY + 0.8).toFixed(1)}
        C${(profileLipFrontX - 2.2).toFixed(1)} ${(profileLowerLipY + 2.7).toFixed(1)} ${(profileChinFrontX + 0.5).toFixed(1)} ${(profileChinY - 7).toFixed(1)} ${profileChinFrontX.toFixed(1)} ${profileChinY.toFixed(1)}
        C${(profileChinFrontX - 2.2).toFixed(1)} ${(profileChinY + chinRoundness).toFixed(1)} ${(profileJawBackX + 16).toFixed(1)} ${(profileChinY + chinRoundness - 0.2).toFixed(1)} ${profileJawBackX.toFixed(1)} ${profileJawY.toFixed(1)}
        C${(profileJawBackX - 6).toFixed(1)} 99 ${(profileBackX + 1).toFixed(1)} 83 ${profileBackX.toFixed(1)} 67 Z" fill="var(--skin)" stroke="var(--skin-shade)" stroke-width=".42" stroke-linejoin="round"/>
    <path id="side-brow-plane" data-svg-african-role="profile-plane brow-to-nasion distinct-facial-landmark no-eye-to-mouth-line" d="M${(profileBrowX - 4.5).toFixed(1)} ${(browY + 1.8).toFixed(1)} C${(profileBrowX - 1.8).toFixed(1)} ${(browY + 2.4).toFixed(1)} ${(profileNoseBridgeX - 2).toFixed(1)} ${(profileNoseBridgeY - 2).toFixed(1)} ${profileNoseBridgeX.toFixed(1)} ${profileNoseBridgeY.toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".85" opacity=".24" stroke-linecap="round"/>
    <path id="side-nose-underplane" data-svg-african-role="profile-plane nose-base distinct-facial-landmark shallow-nasolabial-transition" d="M${(profileNoseTipX - 0.8).toFixed(1)} ${(profileNoseBottomY - 0.2).toFixed(1)} C${(profileNoseTipX - 2).toFixed(1)} ${(profileNoseBottomY + 0.9).toFixed(1)} ${(profileSubnasaleX + 0.2).toFixed(1)} ${(profileNoseBottomY + 1).toFixed(1)} ${profileSubnasaleX.toFixed(1)} ${(profileNoseBottomY + 1.2).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".78" opacity=".30" stroke-linecap="round"/>
    <path id="side-philtrum" data-svg-african-role="profile-plane philtrum distinct-facial-landmark" d="M${profilePhiltrumX.toFixed(1)} ${(profileNoseBottomY + 2).toFixed(1)} C${(profilePhiltrumX - 0.3).toFixed(1)} ${(profileUpperLipY - 1.8).toFixed(1)} ${(profilePhiltrumX - 0.2).toFixed(1)} ${(profileUpperLipY - 0.8).toFixed(1)} ${profilePhiltrumX.toFixed(1)} ${profileUpperLipY.toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".68" opacity=".24" stroke-linecap="round"/>
    <path id="side-chin-crease" data-svg-african-role="profile-plane lower-lip-chin distinct-facial-landmark" d="M${(profileLipFrontX - 7).toFixed(1)} ${(profileLowerLipY + 3.5).toFixed(1)} C${(profileLipFrontX - 4).toFixed(1)} ${(profileLowerLipY + 4.5).toFixed(1)} ${(profileChinFrontX - 2).toFixed(1)} ${(profileChinY - 7.5).toFixed(1)} ${(profileChinFrontX - 1).toFixed(1)} ${(profileChinY - 6.5).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".7" opacity=".12" stroke-linecap="round"/>
    <path id="side-jawline" data-svg-african-role="profile-jawline chin-to-neck side-view-premium subtle-profile-contour rounded-jaw-sweep" d="M${(profileLipFrontX - 3).toFixed(1)} ${(profileLowerLipY + 2).toFixed(1)} C${(profileChinFrontX + 0.5).toFixed(1)} ${(profileChinY - 4).toFixed(1)} ${profileChinFrontX.toFixed(1)} ${profileChinY.toFixed(1)} C${(profileChinFrontX - 5).toFixed(1)} ${(profileChinY + 5).toFixed(1)} ${(profileJawBackX + 12).toFixed(1)} ${(profileChinY + 5).toFixed(1)} ${profileJawBackX.toFixed(1)} ${profileJawY.toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".85" opacity=".10" stroke-linecap="round"/>`;
        const sideEarMarkup = isNiqab || isModestHeadwear ? '' : `
    <path id="side-ear" data-svg-african-role="ear side-view-premium side-ear-behind-jaw profile-ear visible-side-ear ear-over-hair-safe landmark-driven-ear" d="M${earCenterX.toFixed(1)} ${earTop.toFixed(1)} C${earLeft.toFixed(1)} ${(earTop + 2).toFixed(1)} ${(earLeft - 1).toFixed(1)} ${(earCenterY - 2).toFixed(1)} ${(earLeft + 1).toFixed(1)} ${(earCenterY + 5).toFixed(1)} C${(earLeft + 3).toFixed(1)} ${(earBottom - 2).toFixed(1)} ${(earCenterX + 1).toFixed(1)} ${(earBottom + 1).toFixed(1)} ${(earRight - 1).toFixed(1)} ${(earBottom - 5).toFixed(1)} C${(earRight + 3).toFixed(1)} ${(earCenterY + 5).toFixed(1)} ${(earRight + 1).toFixed(1)} ${(earTop + 4).toFixed(1)} ${earCenterX.toFixed(1)} ${earTop.toFixed(1)} Z" fill="url(#skinGrad)"/>
    <path id="side-ear-inner" data-svg-african-role="ear-detail side-view-premium visible-side-ear landmark-driven-ear" d="M${(earCenterX + 1).toFixed(1)} ${(earTop + earRy * 0.42).toFixed(1)} C${(earRight - 1).toFixed(1)} ${(earTop + earRy * 0.30).toFixed(1)} ${(earRight - 1).toFixed(1)} ${(earCenterY + 2).toFixed(1)} ${(earCenterX + 2).toFixed(1)} ${(earCenterY + 4).toFixed(1)} M${(earCenterX + 1).toFixed(1)} ${(earBottom - 5).toFixed(1)} C${(earCenterX - 3).toFixed(1)} ${(earCenterY + 3).toFixed(1)} ${(earCenterX - 2).toFixed(1)} ${(earTop + 7).toFixed(1)} ${(earCenterX + 3).toFixed(1)} ${(earTop + 5).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width="1.45" opacity=".48" stroke-linecap="round"/>`;
        const sideEarringMarkup = !isNiqab && !isModestHeadwear && hasAccessory(config, 'earrings')
            ? `<g id="side-earring" data-svg-african-role="accessory earrings side-earring visible-ear-jewelry landmark-driven-earring" fill="var(--accent)" stroke="var(--skirt)" stroke-width=".65">
    <circle id="side-earring-stud" cx="${(earCenterX + 1).toFixed(1)}" cy="${(earBottom - 3).toFixed(1)}" r="2.15"/>
    <path id="side-earring-drop" d="M${(earCenterX + 1).toFixed(1)} ${(earBottom - 1).toFixed(1)} C${(earCenterX + 4).toFixed(1)} ${(earBottom + 4).toFixed(1)} ${(earCenterX + 3).toFixed(1)} ${(earBottom + 9).toFixed(1)} ${(earCenterX + 0.5).toFixed(1)} ${(earBottom + 12).toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="1.45" stroke-linecap="round"/>
    <ellipse id="side-earring-drop-gem" cx="${(earCenterX + 0.5).toFixed(1)}" cy="${(earBottom + 13).toFixed(1)}" rx="2.3" ry="3.1" stroke-width=".55"/>
</g>`
            : '';
        const showSideFacialHair = presentation === 'male' && facialHair !== 'none' && !isNiqab;
        const sideFacialHairMarkup = showSideFacialHair
            ? `<g id="side-facial-hair" data-svg-african-role="facial-hair side-facial-hair ${facialHair} side-view-premium">
    <path id="side-moustache" d="M${(profileMouthBackX + 1).toFixed(1)} ${(mouthY - 3.7).toFixed(1)} C${(profileLipFrontX - 7).toFixed(1)} ${(mouthY - 5).toFixed(1)} ${(profileLipFrontX - 2).toFixed(1)} ${(mouthY - 4.4).toFixed(1)} ${(profileLipFrontX - 0.8).toFixed(1)} ${(mouthY - 2.8).toFixed(1)} C${(profileLipFrontX - 4).toFixed(1)} ${(mouthY - 2.1).toFixed(1)} ${(profileMouthBackX + 4).toFixed(1)} ${(mouthY - 2).toFixed(1)} ${(profileMouthBackX + 1).toFixed(1)} ${(mouthY - 3.7).toFixed(1)} Z" fill="var(--hair)" opacity=".82"/>
    ${facialHair === 'moustache' ? '' : `<path id="side-beard-contour" d="M${(profileLipFrontX - 2).toFixed(1)} ${(profileLowerLipY + 3).toFixed(1)} C${(profileChinFrontX + 1).toFixed(1)} ${(profileChinY - 3).toFixed(1)} ${profileChinFrontX.toFixed(1)} ${(profileChinY + 1).toFixed(1)} C${(profileChinFrontX - 8).toFixed(1)} ${(profileChinY + 7).toFixed(1)} ${(profileJawBackX + 11).toFixed(1)} ${(profileChinY + 7).toFixed(1)} ${(profileJawBackX + 1).toFixed(1)} ${(profileJawY + 1).toFixed(1)}" fill="none" stroke="var(--hair)" stroke-width="${facialHair === 'full-beard' ? '4.4' : '2.4'}" opacity="${facialHair === 'short-beard' ? '.28' : '.68'}" stroke-linecap="round"/>`}
    ${facialHair === 'goatee' ? `<path id="side-goatee" d="M${(profileLipFrontX - 6).toFixed(1)} ${(profileLowerLipY + 2).toFixed(1)} C${(profileLipFrontX - 3).toFixed(1)} ${(profileLowerLipY + 8).toFixed(1)} ${(profileChinFrontX - 2).toFixed(1)} ${(profileChinY - 4).toFixed(1)} ${(profileChinFrontX - 5).toFixed(1)} ${(profileChinY - 1).toFixed(1)} C${(profileChinFrontX - 9).toFixed(1)} ${(profileChinY - 6).toFixed(1)} ${(profileLipFrontX - 9).toFixed(1)} ${(profileLowerLipY + 5).toFixed(1)} ${(profileLipFrontX - 6).toFixed(1)} ${(profileLowerLipY + 2).toFixed(1)} Z" fill="var(--hair)" opacity=".72"/>` : ''}
</g>`
            : '';
        const irisRy = clamp(2.05 * eyeScale * (1 - blink * 0.82), 0.32, 2.2);
        const sideEyeMarkup = `<path id="side-eye" data-svg-african-role="eye-side side-view-premium profile-eye smaller-side-eye clean-side-eye landmark-driven-eye ${isNiqab ? 'visible-eye niqab-open-eye' : ''}" d="M${(profileEyeCenterX - eyeHalfWidth).toFixed(1)} ${eyeY.toFixed(1)} C${(profileEyeCenterX - eyeHalfWidth * 0.36).toFixed(1)} ${(eyeY - eyeHalfHeight).toFixed(1)} ${(profileEyeCenterX + eyeHalfWidth * 0.42).toFixed(1)} ${(eyeY - eyeHalfHeight * 0.92).toFixed(1)} ${(profileEyeCenterX + eyeHalfWidth).toFixed(1)} ${eyeY.toFixed(1)} C${(profileEyeCenterX + eyeHalfWidth * 0.42).toFixed(1)} ${(eyeY + eyeHalfHeight).toFixed(1)} ${(profileEyeCenterX - eyeHalfWidth * 0.36).toFixed(1)} ${(eyeY + eyeHalfHeight).toFixed(1)} ${(profileEyeCenterX - eyeHalfWidth).toFixed(1)} ${eyeY.toFixed(1)} Z" fill="#fff"/>
    <path id="side-upper-eyelid" data-svg-african-role="upper-eyelid side-view-premium profile-eye-contour distinct-eye-plane" d="M${(profileEyeCenterX - eyeHalfWidth).toFixed(1)} ${eyeY.toFixed(1)} C${(profileEyeCenterX - eyeHalfWidth * 0.36).toFixed(1)} ${(eyeY - eyeHalfHeight).toFixed(1)} ${(profileEyeCenterX + eyeHalfWidth * 0.42).toFixed(1)} ${(eyeY - eyeHalfHeight * 0.92).toFixed(1)} ${(profileEyeCenterX + eyeHalfWidth).toFixed(1)} ${eyeY.toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".72" opacity=".5" stroke-linecap="round"/>
    <ellipse id="side-iris" data-svg-african-role="iris-side side-view-premium profile-iris smaller-side-eye clean-side-eye landmark-driven-eye" cx="${irisX.toFixed(1)}" cy="${irisY.toFixed(1)}" rx="${(1.9 * eyeScale).toFixed(1)}" ry="${irisRy.toFixed(1)}" fill="#5b3a26"/>
    <circle id="side-pupil" data-svg-african-role="pupil-side side-view-premium profile-pupil smaller-side-eye clean-side-eye landmark-driven-eye" cx="${(irisX + 0.2).toFixed(1)}" cy="${irisY.toFixed(1)}" r="${clamp(1.08 * eyeScale * (1 - blink * 0.72), 0.25, 1.2).toFixed(1)}" fill="#1e1410"/>
    <circle id="side-eye-highlight" data-svg-african-role="eye-highlight side-view-premium" cx="${(irisX - 0.4).toFixed(1)}" cy="${(irisY - 0.7).toFixed(1)}" r=".45" fill="#fff" opacity="${blink > 0.82 ? '0' : '.9'}"/>`;
        const faceFeatures = isNiqab
            ? sideEyeMarkup
            : `
    <path id="side-brow" data-svg-african-role="brow-side side-view-premium profile-brow brow-below-headwear" d="M${(profileEyeCenterX - sideBrowSpan).toFixed(1)} ${browY.toFixed(1)} C${(profileEyeCenterX - sideBrowSpan * 0.38).toFixed(1)} ${(browY - browArch).toFixed(1)} ${(profileEyeCenterX + sideBrowSpan * 0.38).toFixed(1)} ${(browY - browArch * 0.85).toFixed(1)} ${(profileEyeCenterX + sideBrowSpan).toFixed(1)} ${(browY + 0.1).toFixed(1)}" fill="none" stroke="var(--hair)" stroke-width="${browStroke.toFixed(2)}" stroke-linecap="round"/>
    ${sideEyeMarkup}
    <path id="side-nose-ala" data-svg-african-role="nose-ala side-view-premium distinct-nose-plane" d="M${(profileNoseTipX - 4.2).toFixed(1)} ${(profileNoseBottomY - 1.4).toFixed(1)} C${(profileNoseTipX - 3.2).toFixed(1)} ${(profileNoseBottomY - 2).toFixed(1)} ${(profileNoseTipX - 1.5).toFixed(1)} ${(profileNoseBottomY - 1.8).toFixed(1)} ${(profileNoseTipX - 0.9).toFixed(1)} ${(profileNoseBottomY - 0.8).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".68" opacity=".24" stroke-linecap="round"/>
    <ellipse id="side-nostril" data-svg-african-role="nostril side-view-premium refined-side-nostril single-side-nostril clean-side-nostril no-eye-to-mouth-line nostril-under-nose-tip" cx="${(profileNoseTipX - 2.5).toFixed(1)}" cy="${(profileNoseBottomY - 0.7).toFixed(1)}" rx=".82" ry=".42" fill="#2a1712" opacity=".27"/>
    <path id="side-mouth-fill" data-svg-african-role="mouth-fill mouth-opening oral-cavity side-view-premium profile-lips natural-side-mouth compact-profile-mouth refined-side-mouth" d="M${speechMouthBackX.toFixed(1)} ${(mouthY + 0.4).toFixed(1)} C${(speechLipFrontX - 5).toFixed(1)} ${(speechUpperLipY - 0.7 - smile * 0.5).toFixed(1)} ${(speechLipFrontX - 1).toFixed(1)} ${(speechUpperLipY - 0.2).toFixed(1)} ${speechLipFrontX.toFixed(1)} ${(speechUpperLipY + 0.7).toFixed(1)} C${(speechLipFrontX - 1).toFixed(1)} ${(speechLowerLipY + 0.5).toFixed(1)} ${(speechLipFrontX - 6).toFixed(1)} ${(speechLowerLipY + 0.7).toFixed(1)} ${(speechMouthBackX + 0.5).toFixed(1)} ${(mouthY + 1.1).toFixed(1)} Z" fill="#351014" opacity="${cavityOpacity.toFixed(2)}"/>
    <path id="side-mouth-teeth" data-svg-african-role="mouth-teeth teeth side-view-premium" d="M${(speechMouthBackX + 1).toFixed(1)} ${(mouthY + 0.5).toFixed(1)} C${(speechLipFrontX - 4).toFixed(1)} ${(speechUpperLipY - 0.1).toFixed(1)} ${(speechLipFrontX - 1).toFixed(1)} ${(speechUpperLipY + 0.2).toFixed(1)} ${(speechLipFrontX - 0.2).toFixed(1)} ${(speechUpperLipY + 0.8).toFixed(1)} C${(speechLipFrontX - 3).toFixed(1)} ${(speechUpperLipY + 1.6).toFixed(1)} ${(speechMouthBackX + 2).toFixed(1)} ${(mouthY + 1.5).toFixed(1)} ${(speechMouthBackX + 1).toFixed(1)} ${(mouthY + 0.5).toFixed(1)} Z" fill="#fffaf2" opacity="${teethOpacity.toFixed(2)}"/>
    <ellipse id="side-mouth-tongue" data-svg-african-role="mouth-tongue tongue side-view-premium" cx="${(speechLipFrontX - 4.3).toFixed(1)}" cy="${(speechLowerLipY + 0.1).toFixed(1)}" rx="2.9" ry=".72" fill="#c96f72" opacity="${tongueOpacity.toFixed(2)}"/>
    <path id="side-mouth-upper" data-svg-african-side-mouth-fullness="${clamp(lipFullnessBias * (1 + lipFullness * .72), .68, 1.55).toFixed(4)}" data-svg-african-role="mouth-upper side-view-premium profile-lips profile-lips-chin natural-side-mouth refined-side-mouth" data-svg-african-profile-lip-fullness="${lipFullnessBias.toFixed(3)}" d="M${speechMouthBackX.toFixed(1)} ${mouthY.toFixed(1)} C${(speechLipFrontX - 5).toFixed(1)} ${(speechUpperLipY - 1.25 * lipFullnessBias - smile * 0.55).toFixed(1)} ${(speechLipFrontX - 1).toFixed(1)} ${(speechUpperLipY - 0.55 * lipFullnessBias).toFixed(1)} ${speechLipFrontX.toFixed(1)} ${(speechUpperLipY + 0.2).toFixed(1)}" fill="none" stroke="${facialStyle.lips.upperColor}" stroke-width="${((1 + lipFullness * 0.36) * lipFullnessBias).toFixed(1)}" stroke-linecap="round" stroke-linejoin="round"/>
    <path id="side-mouth-lower" data-svg-african-role="mouth-lower side-view-premium profile-lips profile-lips-chin natural-side-mouth refined-side-mouth" d="M${(speechMouthBackX + 1).toFixed(1)} ${(mouthY + 1.2).toFixed(1)} C${(speechLipFrontX - 5).toFixed(1)} ${(speechLowerLipY + 0.9 + smile * 0.32).toFixed(1)} ${(speechLipFrontX - 1).toFixed(1)} ${(speechLowerLipY + 0.65).toFixed(1)} ${(speechLipFrontX - 0.5).toFixed(1)} ${(speechLowerLipY - 0.05).toFixed(1)}" fill="none" stroke="${facialStyle.lips.lowerColor}" stroke-width="${(0.68 + lipFullness * 0.24).toFixed(1)}" stroke-linecap="round"/>`;
        const glassesMarkup = !Array.isArray(styling.accessories) || !styling.accessories.includes('glasses')
            ? ''
            : `<g id="side-glasses" data-svg-african-role="accessory glasses side-view-premium fitted-side-glasses no-floating-eye-ring open-profile-frame">
    <path id="side-glasses-lens" data-svg-african-role="side-profile-glasses-frame fitted-lens browline-frame no-lower-eye-ring" d="M${(profileEyeCenterX - 7).toFixed(1)} ${(eyeY - 0.5).toFixed(1)} C${(profileEyeCenterX - 3).toFixed(1)} ${(eyeY - 4.1).toFixed(1)} ${(profileEyeCenterX + 5).toFixed(1)} ${(eyeY - 3.8).toFixed(1)} ${(profileEyeCenterX + 8).toFixed(1)} ${(eyeY - 0.3).toFixed(1)} M${(profileEyeCenterX - 7).toFixed(1)} ${(eyeY - 0.5).toFixed(1)} L${(profileEyeCenterX - 6).toFixed(1)} ${(eyeY + 2).toFixed(1)} M${(profileEyeCenterX + 8).toFixed(1)} ${(eyeY - 0.3).toFixed(1)} L${(profileEyeCenterX + 7).toFixed(1)} ${(eyeY + 2).toFixed(1)}" fill="none" stroke="var(--glass)" stroke-width="1.8" stroke-linecap="round"/>
    <path id="side-glasses-temple" data-svg-african-role="side-glasses-temple fitted-to-ear landmark-driven-glasses" d="M${(profileEyeCenterX - 7).toFixed(1)} ${(eyeY - 0.5).toFixed(1)} C${(profileEyeCenterX - 14).toFixed(1)} ${(eyeY - 2).toFixed(1)} ${(earCenterX + 8).toFixed(1)} ${(earCenterY - earRy * 0.55).toFixed(1)} ${(earCenterX + 2).toFixed(1)} ${(earCenterY - earRy * 0.52).toFixed(1)} M${(profileEyeCenterX + 7).toFixed(1)} ${(eyeY + 0.2).toFixed(1)} L${(profileEyeCenterX + 11).toFixed(1)} ${(eyeY + 1).toFixed(1)}" fill="none" stroke="var(--glass)" stroke-width="1.6" stroke-linecap="round" opacity=".9"/>
</g>`;
        const body = `
<g ${styleVars(p)} data-svg-african-role="head-neck premium-part side-view-premium presentation-${presentation} age-${ageGroup} head-type-${headType} face-shape-${faceShape}">
    <g id="side-facing-root" transform="${mirror}">
    <g id="head-motion" data-svg-african-role="head-motion side-head" transform="${headTransform}">
    ${scalpBackShell}
    ${hairBack}
    <path id="side-neck" data-svg-african-role="neck side-view-premium smooth-neck-margin" d="M${neckLeft.toFixed(1)} ${neckTop.toFixed(1)} C${(neckLeft + 1).toFixed(1)} 119 ${(neckLeft + 3).toFixed(1)} 139 ${(neckLeft + 1).toFixed(1)} ${neckBottom.toFixed(1)} L${neckRight.toFixed(1)} ${neckBottom.toFixed(1)} C${(neckRight - 2).toFixed(1)} 138 ${(neckRight - 2).toFixed(1)} 119 ${(neckRight - 4).toFixed(1)} ${neckTop.toFixed(1)} Z" fill="url(#skinGrad)"/>
    ${skinFace}
    ${continuousScalpCap}
    ${hairFront}
    ${structuredHeadwearHairReveal}
    ${sideEarMarkup}
    ${sideEarringMarkup}
    ${isModestHeadwear || isNiqab ? headwearMarkup : ''}
    ${faceFeatures}
    ${sideFacialHairMarkup}
    ${glassesMarkup}
    ${hasStructuredHeadwear ? structuredHeadwearScalpCover : ''}
    ${hasStructuredHeadwear ? headwearMarkup : ''}
    </g>
    </g>
</g>`;
        const sideSvg = setSvgRootAttributes(svgShell('head-neck', 98, 164, body, p), {
            'data-svg-african-facial-style-version': '2',
            'data-svg-african-neck-socket-x': isLeft ? 98 - (neckLeft + 1 + neckRight) / 2 : (neckLeft + 1 + neckRight) / 2,
            'data-svg-african-neck-base-y': neckBottom
        });
        return globalThis.SvgAfricanAuthoredControls?.applySideMouth?.(sideSvg, {
            state,
            baseBack: profileMouthBackX,
            baseFront: profileLipFrontX,
            baseY: mouthY,
            widthScale: 1,
            fullnessScale: clamp(lipFullnessBias * (1 + lipFullness * .72), .68, 1.55),
            offsetY: 0,
            upperColor: facialStyle.lips.upperColor,
            lowerColor: facialStyle.lips.lowerColor
        }) || sideSvg;
    }

    function compileSideTorsoLandmarks(config = {}, adjustmentsOverride = null) {
        const styling = readStyling(config);
        const identity = readIdentity(config);
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const profile = getPresentationVisualProfile(presentation);
        const adjustments = resolveRenderAdjustments(config, adjustmentsOverride);
        const topClothing = resolveTopClothing(config);
        const bottomClothing = resolveBottomClothing(config);
        const outfit = normalizeId(styling.outfit || config.outfit, 'lecturer');
        const profession = normalizeId(styling.profession || config.profession, '');
        const torsoWidth = getAdjustmentValue(adjustments, 'torsoWidth') + (profile.torsoWidth || 0);
        const shoulderWidth = getAdjustmentValue(adjustments, 'shoulderWidth') + (profile.shoulderWidth || 0);
        const chestProjection = getAdjustmentValue(adjustments, 'chestProjection');
        const breastProjection = getAdjustmentValue(adjustments, 'breastProjection');
        const abdomenProjection = getAdjustmentValue(adjustments, 'abdomenProjection');
        const abdomenWidth = getAdjustmentValue(adjustments, 'abdomenWidth');
        const backCurve = getAdjustmentValue(adjustments, 'backCurve');
        const buttockProjection = getAdjustmentValue(adjustments, 'buttockProjection');
        const hipWidth = getAdjustmentValue(adjustments, 'hipWidth') + (profile.hipWidth || 0);
        const torsoLength = getAdjustmentValue(adjustments, 'torsoLength');
        const topWearLength = getAdjustmentValue(adjustments, 'topWearLength');
        const bottomWearLength = getAdjustmentValue(adjustments, 'bottomWearLength');
        const isSkirtBottom = isSkirtLikeBottom(bottomClothing);
        const isAcademicGown = topClothing === 'academic-gown-top' || bottomClothing === 'academic-gown-bottom' || outfit === 'academic-robe';
        const isHealth = /doctor|nurse|lab-coat|scrubs|laboratory|pharmacist|community-health/.test(`${outfit} ${topClothing} ${profession}`);

        const shoulderFront = clamp(93 + shoulderWidth * 11 + torsoWidth * 4, 82, 108);
        const shoulderBack = clamp(23 - shoulderWidth * 5 - torsoWidth * 3, 12, 31);
        const neckSeatBack = clamp(48 - shoulderWidth * 1.2, 44, 51);
        const neckSeatFront = clamp(85 + shoulderWidth * 1.2, 82, 90);
        const shoulderApexY = clamp(38 - Math.max(0, shoulderWidth) * 2, 34, 41);
        const armSocketX = clamp((neckSeatBack + neckSeatFront) * 0.5, 64, 70);
        const armSocketY = clamp(55 - torsoWidth * 1.5, 51, 58);
        const chestFront = clamp(99 + torsoWidth * 12 + chestProjection * 14, 84, 116);
        const breastGain = presentation === 'female'
            ? 5 + breastProjection * 18
            : breastProjection * 5;
        const breastFront = clamp(chestFront + breastGain, 86, 122);
        const abdomenGain = Math.max(0, abdomenProjection);
        const abdomenCurve = abdomenGain * (1 + abdomenGain * 0.55);
        const abdomenSlim = Math.max(0, -abdomenProjection);
        const abdomenFront = clamp(95 + torsoWidth * 10 + abdomenCurve * 22 - abdomenSlim * 15 + abdomenWidth * 10, 76, 127);
        const abdomenRoundness = clamp(4.5 + abdomenGain * 5.5 + Math.max(0, abdomenWidth) * 2.5, 4, 12);
        const abdomenUpperX = abdomenFront - abdomenRoundness * 0.42;
        const abdomenLowerX = abdomenFront - abdomenRoundness * 0.24;
        const abdomenControlX = abdomenFront + abdomenRoundness * 0.16;
        const frontHip = clamp(99 + torsoWidth * 7 + hipWidth * 12 + Math.max(0, buttockProjection) * 2, 84, 119);
        const upperBack = clamp(21 - torsoWidth * 4, 13, 29);
        const backWaist = clamp(31 - torsoWidth * 4 + backCurve * 13, 18, 43);
        const rearSeat = clamp(20 - torsoWidth * 3 - hipWidth * 7 - buttockProjection * (presentation === 'female' ? 16 : 10), 5, 31);
        const rearBottom = clamp(25 - torsoWidth * 3 - hipWidth * 5 - buttockProjection * 8, 11, 35);
        const garmentLengthShift = isSkirtBottom ? bottomWearLength * 48 : topWearLength * 30;
        const bottomY = clamp(214 + torsoLength * 42 + garmentLengthShift, 184, 282);
        const waistY = 143;
        const topHemY = clamp(waistY + topWearLength * 42, waistY - 22, waistY + 28);

        return Object.freeze({
            presentation,
            profile,
            adjustments,
            topClothing,
            bottomClothing,
            outfit,
            profession,
            isSkirtBottom,
            isAcademicGown,
            isHealth,
            torsoWidth,
            shoulderWidth,
            chestProjection,
            breastProjection,
            abdomenProjection,
            abdomenWidth,
            backCurve,
            buttockProjection,
            hipWidth,
            torsoLength,
            topWearLength,
            bottomWearLength,
            shoulderFront,
            shoulderBack,
            neckSeatBack,
            neckSeatFront,
            shoulderApexY,
            armSocketX,
            armSocketY,
            chestFront,
            breastFront,
            abdomenGain,
            abdomenFront,
            abdomenRoundness,
            abdomenUpperX,
            abdomenLowerX,
            abdomenControlX,
            frontHip,
            upperBack,
            backWaist,
            rearSeat,
            rearBottom,
            bottomY,
            waistY,
            topHemY
        });
    }

    function renderSideTorso(config, p, options = {}) {
        const styling = readStyling(config);
        const identity = readIdentity(config);
        const view = normalizePremiumView(styling.view || config.view || 'side-right');
        const isLeft = view === 'side-left';
        const topClothing = resolveTopClothing(config);
        const bottomClothing = resolveBottomClothing(config);
        const outfit = normalizeId(styling.outfit || config.outfit, 'lecturer');
        const profession = normalizeId(styling.profession || config.profession, '');
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const bodyType = normalizeId(identity.body || config.body, 'average');
        const heightType = normalizeId(identity.height || config.height, 'average');
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const fabricDesign = resolveEffectiveFabricDesign(config, `${outfit} ${topClothing} ${bottomClothing} ${profession}`);
        const landmarks = compileSideTorsoLandmarks(config, adjustments);
        const {
            isAcademicGown,
            isHealth,
            isSkirtBottom,
            torsoWidth,
            topWearLength,
            shoulderFront,
            shoulderBack,
            neckSeatBack,
            neckSeatFront,
            shoulderApexY,
            armSocketX,
            armSocketY,
            chestFront,
            breastFront,
            abdomenGain,
            abdomenFront,
            abdomenRoundness,
            abdomenUpperX,
            abdomenLowerX,
            abdomenControlX,
            frontHip,
            upperBack,
            backWaist,
            rearSeat,
            rearBottom,
            bottomY,
            waistY,
            topHemY
        } = landmarks;
        const mirror = isLeft ? 'translate(132 0) scale(-1 1)' : '';
        const clothFill = isHealth ? '#f8fbff' : (isAcademicGown ? '#111827' : 'url(#clothGrad)');
        const fabricMarkup = renderFabricDesignMarkup(fabricDesign, {
            role: 'side-torso-fabric-design',
            x1: 26,
            x2: 108,
            y1: 54,
            y2: bottomY - 14,
            compact: true
        });
        const tieType = resolveNeckTieType(config);
        const tieDesign = resolveNeckTieDesign(config);
        const tieMarkup = /suit|lecturer|corporate|academic|doctor/.test(`${outfit} ${topClothing} ${profession}`)
            ? renderNeckTieMarkup(tieType, { id: 'side-tie', role: 'side-formal', y: 58, design: tieDesign, defaultType: presentation === 'female' ? 'slim' : 'standard' })
            : '';
        const sideStethoscopeMarkup = hasAccessory(config, 'stethoscope')
            ? `<g id="side-stethoscope" data-svg-african-role="accessory stethoscope side-view-accessory" fill="none" stroke="#26343f" stroke-linecap="round">
    <path d="M55 45 C53 69 61 89 78 99 C84 103 87 111 85 120" stroke-width="2.2"/>
    <path d="M81 45 C86 65 87 84 78 99" stroke-width="2.2"/>
    <circle cx="85" cy="124" r="4.8" fill="#26343f" stroke-width="1"/>
</g>`
            : '';
        const sideIdBadgeMarkup = hasAccessory(config, 'id-badge')
            ? `<g id="side-id-badge" data-svg-african-role="accessory id-badge side-view-accessory">
    <path d="M82 68 C88 75 91 83 92 91" fill="none" stroke="var(--accent)" stroke-width="1.35" opacity=".72"/>
    <rect x="83" y="89" width="18" height="25" rx="2.4" fill="#eef6ff" stroke="#7ba7c7" stroke-width="1"/>
    <rect x="87" y="94" width="10" height="2.8" rx="1" fill="#2b8cc4"/>
    <circle cx="92" cy="103" r="2.7" fill="var(--skin)"/>
</g>`
            : '';
        const sideBeadsMarkup = hasAccessory(config, 'beads')
            ? `<path id="side-beads" data-svg-african-role="accessory beads necklace side-view-accessory" d="M52 49 C58 67 72 75 86 66" fill="none" stroke="var(--accent)" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="1 4"/>`
            : '';
        const sideLapelMicMarkup = hasAccessory(config, 'lapel-mic')
            ? `<g id="side-lapel-mic" data-svg-african-role="accessory lapel-mic side-view-accessory"><circle cx="81" cy="72" r="2.4" fill="#172033"/><path d="M81 75 C83 82 84 88 84 94" fill="none" stroke="#172033" stroke-width="1" opacity=".58"/></g>`
            : '';
        const sideBackpackBodyMarkup = hasAccessory(config, 'backpack')
            ? `<g id="side-backpack-body" data-svg-african-role="accessory backpack side-backpack rear-profile behind-torso side-view-accessory">
    <path d="M25 69 C10 77 5 105 8 151 C11 169 21 178 37 174 L45 83 C40 74 33 69 25 69 Z" fill="var(--cloth-shade)" stroke="var(--accent)" stroke-width="1.6"/>
    <path d="M11 123 C21 128 31 128 40 123 L38 160 C28 166 19 164 12 156 Z" fill="var(--cloth-light)" opacity=".32"/>
</g>`
            : '';
        const sideBackpackStrapMarkup = hasAccessory(config, 'backpack')
            ? `<path id="side-backpack-strap" data-svg-african-role="accessory backpack-strap side-view-accessory" d="M38 54 C50 72 52 101 48 127" fill="none" stroke="var(--accent)" stroke-width="5.5" opacity=".9" stroke-linecap="round"/>`
            : '';
        const sideToolBeltMarkup = hasAccessory(config, 'tool-belt')
            ? `<g id="side-tool-belt" data-svg-african-role="accessory tool-belt side-tool-belt side-view-accessory">
    <path d="M${backWaist.toFixed(1)} ${(waistY + 11).toFixed(1)} C52 ${(waistY + 17).toFixed(1)} 78 ${(waistY + 17).toFixed(1)} ${(abdomenFront - 2).toFixed(1)} ${(waistY + 10).toFixed(1)}" fill="none" stroke="#3b2a1f" stroke-width="5"/>
    <rect x="35" y="${(waistY + 11).toFixed(1)}" width="20" height="25" rx="3" fill="#6b4b31" stroke="#2f2118" stroke-width="1.2"/>
    <rect x="73" y="${(waistY + 11).toFixed(1)}" width="17" height="22" rx="3" fill="#6b4b31" stroke="#2f2118" stroke-width="1.2"/>
</g>`
            : '';
        const sideRadioMarkup = hasAccessory(config, 'radio')
            ? `<g id="side-radio" data-svg-african-role="accessory radio side-radio side-view-accessory">
    <rect x="36" y="67" width="16" height="30" rx="3" fill="#26313d" stroke="#111827" stroke-width="1.2"/>
    <path d="M40 66 L38 56" fill="none" stroke="#111827" stroke-width="2" stroke-linecap="round"/>
    <circle cx="44" cy="76" r="3" fill="#64748b"/>
</g>`
            : '';
        const sideWhistleMarkup = hasAccessory(config, 'whistle')
            ? `<g id="side-whistle" data-svg-african-role="accessory whistle side-whistle side-view-accessory">
    <path d="M67 55 C69 71 76 82 83 92" fill="none" stroke="var(--accent)" stroke-width="1.6"/>
    <path d="M80 91 L89 91 L91 97 L83 101 L78 97 Z" fill="#cbd5e1" stroke="#64748b" stroke-width="1"/>
</g>`
            : '';
        const topLengthMarkup = Math.abs(topWearLength) < 0.005
            ? ''
            : `<path id="side-top-wear-length" data-svg-african-role="top-wear-length adjustable-top-hem ${topWearLength > 0 ? 'extended-top' : 'shortened-top'}" d="M${backWaist.toFixed(1)} ${waistY} C${backWaist.toFixed(1)} ${(waistY + 10).toFixed(1)} ${abdomenFront.toFixed(1)} ${(waistY + 10).toFixed(1)} ${abdomenFront.toFixed(1)} ${waistY} L${frontHip.toFixed(1)} ${topHemY.toFixed(1)} L${rearSeat.toFixed(1)} ${topHemY.toFixed(1)} Z" fill="${topWearLength > 0 ? clothFill : 'var(--skirt)'}" opacity=".98"/>`;
        const maternityDrapeGain = presentation === 'female' ? clamp((abdomenGain - 0.14) / 0.86, 0, 1) : 0;
        const maternitySideDrapeMarkup = maternityDrapeGain > 0
            ? (() => {
                const drapeStartY = 127;
                const drapeEndY = Math.min(bottomY - 7, 190 + maternityDrapeGain * 18);
                const isFlowing = isSkirtBottom || isAcademicGown;
                const role = isFlowing ? 'flowing-lower-garment' : (isHealth ? 'structured-outerwear' : 'soft-top');
                const fill = isFlowing ? 'var(--skirt)' : clothFill;
                return `<g id="side-maternity-drape" data-svg-african-role="maternity-drape side-maternity-drape pregnancy-clothing-fit ${role} ${topClothing} ${bottomClothing}" data-svg-african-drape="${role}">
        <path id="side-maternity-fabric-fall" d="M${backWaist.toFixed(1)} ${drapeStartY} C${(backWaist + 7).toFixed(1)} 147 ${(abdomenUpperX - 2).toFixed(1)} 132 ${abdomenUpperX.toFixed(1)} 136 C${abdomenControlX.toFixed(1)} 141 ${abdomenControlX.toFixed(1)} 153 ${abdomenLowerX.toFixed(1)} 162 C${(abdomenLowerX - 2).toFixed(1)} 171 ${(frontHip + 2).toFixed(1)} ${(drapeEndY - 10).toFixed(1)} ${frontHip.toFixed(1)} ${drapeEndY.toFixed(1)} C${(frontHip - 20).toFixed(1)} ${(drapeEndY + 5).toFixed(1)} ${(rearSeat + 15).toFixed(1)} ${(drapeEndY + 5).toFixed(1)} ${rearSeat.toFixed(1)} ${drapeEndY.toFixed(1)} C${(backWaist + 3).toFixed(1)} 174 ${(backWaist - 1).toFixed(1)} 148 ${backWaist.toFixed(1)} ${drapeStartY} Z" fill="${fill}" opacity="${(0.10 + maternityDrapeGain * 0.13).toFixed(3)}"/>
        <path id="side-maternity-fabric-fold" d="M${(abdomenFront - 9).toFixed(1)} 151 C${(abdomenFront - 13).toFixed(1)} 165 ${(frontHip - 8).toFixed(1)} ${(drapeEndY - 3).toFixed(1)} ${(frontHip - 14).toFixed(1)} ${drapeEndY.toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.3" opacity="${(0.18 + maternityDrapeGain * 0.18).toFixed(3)}" stroke-linecap="round"/>
    </g>`;
            })()
            : '';
        const body = `
<g ${styleVars(p)} data-svg-african-role="torso premium-part side-view-premium landmark-driven-side-torso presentation-${presentation} body-${bodyType} height-${heightType}">
    <g id="side-torso-root" transform="${mirror}">
    <path id="side-neck-socket" data-svg-african-role="neck-hidden-under-collar side-neck-seat integrated-neck-shoulder" d="M${neckSeatBack.toFixed(1)} 17 C${(neckSeatBack + 9).toFixed(1)} 29 ${(neckSeatFront - 10).toFixed(1)} 29 ${neckSeatFront.toFixed(1)} 17 L${(neckSeatFront + 3).toFixed(1)} 49 L${(neckSeatBack - 1).toFixed(1)} 49 Z" fill="var(--skin-shade)" opacity=".14"/>
    ${sideBackpackBodyMarkup}
    <path id="side-torso-shape" data-svg-african-role="side-torso clothing ${topClothing} ${bottomClothing} side-profile-torso anatomical-side-torso landmark-driven-side-torso integrated-neck-shoulder shoulder-to-hip-flow chest-profile breast-profile abdomen-profile pregnancy-capable-abdomen smooth-convex-abdomen broad-rounded-abdomen-apex back-curve-profile buttock-profile" data-svg-african-shoulder-socket-x="${armSocketX.toFixed(1)}" data-svg-african-shoulder-socket-y="${armSocketY.toFixed(1)}" data-svg-african-abdomen-front="${abdomenFront.toFixed(1)}" data-svg-african-abdomen-upper-x="${abdomenUpperX.toFixed(1)}" data-svg-african-abdomen-lower-x="${abdomenLowerX.toFixed(1)}" data-svg-african-abdomen-roundness="${abdomenRoundness.toFixed(1)}" d="M${shoulderBack.toFixed(1)} 55 C${(shoulderBack + 3).toFixed(1)} 46 ${(neckSeatBack - 7).toFixed(1)} ${(shoulderApexY + 2).toFixed(1)} ${neckSeatBack.toFixed(1)} ${shoulderApexY.toFixed(1)} C${(neckSeatBack + 8).toFixed(1)} ${(shoulderApexY + 5).toFixed(1)} ${(neckSeatFront - 9).toFixed(1)} ${(shoulderApexY + 5).toFixed(1)} ${neckSeatFront.toFixed(1)} ${shoulderApexY.toFixed(1)} C${(shoulderFront - 2).toFixed(1)} ${(shoulderApexY + 1).toFixed(1)} ${(shoulderFront + 4).toFixed(1)} 48 ${(shoulderFront + 7).toFixed(1)} 55 C${chestFront.toFixed(1)} 66 ${chestFront.toFixed(1)} 79 ${breastFront.toFixed(1)} 94 C${breastFront.toFixed(1)} 107 ${(chestFront - 1).toFixed(1)} 119 ${abdomenUpperX.toFixed(1)} 134 C${abdomenControlX.toFixed(1)} 139 ${abdomenControlX.toFixed(1)} 153 ${abdomenLowerX.toFixed(1)} 160 C${(abdomenLowerX - 2).toFixed(1)} 171 ${frontHip.toFixed(1)} 184 ${frontHip.toFixed(1)} ${bottomY.toFixed(1)} L${rearBottom.toFixed(1)} ${bottomY.toFixed(1)} C${rearSeat.toFixed(1)} ${(bottomY - 10).toFixed(1)} ${rearSeat.toFixed(1)} 197 ${rearSeat.toFixed(1)} 184 C${rearSeat.toFixed(1)} 169 ${backWaist.toFixed(1)} 153 ${backWaist.toFixed(1)} 138 C${backWaist.toFixed(1)} 121 ${upperBack.toFixed(1)} 96 ${shoulderBack.toFixed(1)} 55 Z" fill="${clothFill}" filter="url(#softShadow)"/>
    <ellipse id="side-arm-socket-depth" data-svg-african-role="arm-socket-depth side-shoulder-seat near-arm-attachment" cx="${armSocketX.toFixed(1)}" cy="${armSocketY.toFixed(1)}" rx="19" ry="12" fill="var(--cloth-shade)" opacity=".10"/>
    <path id="side-back-shoulder-roll" data-svg-african-role="side-shoulder-roll rear-shoulder rounded-shoulder-profile integrated-neck-shoulder" d="M${(shoulderBack + 3).toFixed(1)} 53 C${(neckSeatBack - 7).toFixed(1)} ${(shoulderApexY + 2).toFixed(1)} ${neckSeatBack.toFixed(1)} ${shoulderApexY.toFixed(1)} ${(neckSeatBack + 7).toFixed(1)} ${(shoulderApexY + 4).toFixed(1)}" fill="none" stroke="var(--cloth-light)" stroke-width="3" opacity=".16" stroke-linecap="round"/>
    ${maternitySideDrapeMarkup}
    ${topLengthMarkup}
    <path id="side-chest-plane" data-svg-african-role="side-chest-plane side-profile-depth chest-breast-under-clothing" d="M${(chestFront - 7).toFixed(1)} 66 C${(breastFront - 2).toFixed(1)} 86 ${(breastFront - 3).toFixed(1)} 105 ${(chestFront - 5).toFixed(1)} 122" fill="none" stroke="var(--cloth-light)" stroke-width="1.5" opacity=".14" stroke-linecap="round"/>
    <path id="side-back-plane" data-svg-african-role="side-back-plane spine-concavity seat-transition" d="M${(upperBack + 5).toFixed(1)} 82 C${(backWaist + 4).toFixed(1)} 119 ${(backWaist + 4).toFixed(1)} 151 ${(rearSeat + 5).toFixed(1)} 184" fill="none" stroke="var(--cloth-shade)" stroke-width="1.2" opacity=".12" stroke-linecap="round"/>
    <path id="side-collar" data-svg-african-role="side-collar shirt-neck side-neck-opening integrated-neck-shoulder" d="M${neckSeatBack.toFixed(1)} 42 C${(neckSeatBack + 10).toFixed(1)} 53 ${(neckSeatFront - 10).toFixed(1)} 53 ${neckSeatFront.toFixed(1)} 42 L${(neckSeatFront - 2).toFixed(1)} 65 C${(neckSeatFront - 11).toFixed(1)} 72 ${(neckSeatBack + 10).toFixed(1)} 72 ${(neckSeatBack + 2).toFixed(1)} 65 Z" fill="${isHealth ? '#dbeafe' : 'var(--inner)'}" opacity=".94"/>
    ${tieMarkup}
    ${fabricMarkup}
    ${sideBeadsMarkup}
    ${renderOccupationGarment(topClothing, { side: true, hem: bottomY - 4, waist: waistY })}
    ${sideStethoscopeMarkup}
    ${sideIdBadgeMarkup}
    ${sideLapelMicMarkup}
    ${sideBackpackStrapMarkup}
    ${sideToolBeltMarkup}
    ${sideRadioMarkup}
    ${sideWhistleMarkup}
    ${isAcademicGown ? `<path id="side-academic-gown-panel" data-svg-african-role="academic-gown side-panel" d="M22 52 C48 70 91 70 108 52 C106 101 103 158 99 ${bottomY.toFixed(1)} L24 ${bottomY.toFixed(1)} C22 160 21 99 22 52 Z" fill="#0f172a" opacity=".92"/>` : ''}
    ${isHealth ? `<path id="side-lab-coat-front" data-svg-african-role="lab-coat side-opening" d="M85 55 C96 95 97 158 93 ${(bottomY - 5).toFixed(1)}" fill="none" stroke="#bfdbfe" stroke-width="2" opacity=".8"/>` : ''}
    <path id="side-waist-shadow" d="M${(rearBottom + 5).toFixed(1)} ${(bottomY - 12).toFixed(1)} C52 ${(bottomY - 4).toFixed(1)} 82 ${(bottomY - 4).toFixed(1)} ${(frontHip - 5).toFixed(1)} ${(bottomY - 12).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width="1.2" opacity=".18" stroke-linecap="round"/>
    </g>
</g>`;
        return svgShell('torso', 132, Math.max(224, Math.ceil(bottomY + 14)), body, p);
    }

    function renderSideArm(partKey, config, p, options = {}) {
        const styling = readStyling(config);
        const identity = readIdentity(config);
        const view = normalizePremiumView(styling.view || config.view || 'side-right');
        const isLeft = view === 'side-left';
        const isFront = partKey === 'front-arm';
        const topClothing = resolveTopClothing(config);
        const sleeveLength = resolveSleeveLength(config, topClothing);
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const bodyType = normalizeId(identity.body || config.body, 'average');
        const heightType = normalizeId(identity.height || config.height, 'average');
        const anatomicalArm = isFront
            ? (isLeft ? 'left-arm' : 'right-arm')
            : (isLeft ? 'right-arm' : 'left-arm');
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const armLength = getAdjustmentValue(adjustments, 'armLength');
        const armWidth = getAdjustmentValue(adjustments, 'armWidth');
        const handSize = getAdjustmentValue(adjustments, 'handSize');
        const muscle = Math.max(0, getAdjustmentValue(adjustments, 'muscleDefinition') + (getPresentationVisualProfile(presentation).muscleDefinition || 0));
        const fabricDesign = resolveEffectiveFabricDesign(config, `${styling.outfit || ''} ${topClothing} ${styling.profession || ''}`);
        const sleeveEndY = sleeveLength === 'shoulder' ? 34 : sleeveLength === 'elbow' ? 122 : sleeveLength === 'three-quarter' ? 170 : 212;
        const lengthShift = armLength * 28;
        const widthShift = armWidth * 6;
        const mirror = isLeft ? 'translate(54 0) scale(-1 1)' : '';
        const shoulderShift = isFront ? 1.1 : -0.7;
        const shoulderDepth = isFront ? 1.3 : -0.9;
        const sleevePath = `M${(12 - widthShift).toFixed(1)} 27 C18 ${(11 - shoulderShift).toFixed(1)} 41 ${(11 + shoulderShift).toFixed(1)} ${(51 + widthShift).toFixed(1)} 26 C49 63 ${(46 + widthShift * 0.32).toFixed(1)} 113 ${(42 + widthShift * 0.45).toFixed(1)} ${sleeveEndY.toFixed(1)} C35 ${(sleeveEndY + 7).toFixed(1)} 24 ${(sleeveEndY + 7).toFixed(1)} ${(17 - widthShift * 0.45).toFixed(1)} ${sleeveEndY.toFixed(1)} C12 112 9 65 ${(12 - widthShift).toFixed(1)} 27 Z`;
        const skinPath = `M${(18 - widthShift * 0.35).toFixed(1)} ${(sleeveEndY - 2).toFixed(1)} C25 ${(sleeveEndY + 7).toFixed(1)} 36 ${(sleeveEndY + 7).toFixed(1)} ${(42 + widthShift * 0.35).toFixed(1)} ${(sleeveEndY - 2).toFixed(1)} C42 ${(sleeveEndY + 48).toFixed(1)} ${(40 + widthShift * 0.18).toFixed(1)} ${(193 + lengthShift).toFixed(1)} ${(37 + widthShift * 0.2).toFixed(1)} ${(222 + lengthShift).toFixed(1)} C32 ${(230 + lengthShift).toFixed(1)} 25 ${(230 + lengthShift).toFixed(1)} ${(20 - widthShift * 0.2).toFixed(1)} ${(222 + lengthShift).toFixed(1)} C17 ${(192 + lengthShift).toFixed(1)} 16 ${(sleeveEndY + 48).toFixed(1)} ${(18 - widthShift * 0.35).toFixed(1)} ${(sleeveEndY - 2).toFixed(1)} Z`;
        const handScale = 1 + handSize * 0.46;
        const body = `
<g ${styleVars(p)} data-svg-african-role="${partKey} premium-part side-view-premium arm tapered-side-arm ${isFront ? 'near-arm front-arm front-of-torso' : 'far-arm back-arm behind-torso'} ${anatomicalArm} presentation-${presentation} body-${bodyType} height-${heightType}" opacity="${isFront ? '1' : '.88'}">
    <g id="side-arm-root" transform="${mirror}">
    <path id="side-shoulder-cap" data-svg-african-role="shoulder-cap upper-arm-origin side-view-premium side-shoulder-overlap shoulder-joined-to-torso shoulder-connection-mid-upper-torso shoulder-mid-upper-torso rounded-shoulder-cap seated-shoulder" d="M${(12 - widthShift).toFixed(1)} 27 C18 ${(13 - shoulderDepth).toFixed(1)} 40 ${(13 + shoulderDepth).toFixed(1)} ${(51 + widthShift).toFixed(1)} 26 C47 38 21 40 ${(12 - widthShift).toFixed(1)} 27 Z" fill="url(#clothGrad)" opacity="${isFront ? '.92' : '.64'}"/>
    <path id="side-arm-sleeve" data-svg-african-role="sleeve side-arm ${topClothing}" d="${sleevePath}" fill="url(#clothGrad)" filter="url(#softShadow)"/>
    ${isFront ? `<path id="side-near-arm-depth-edge" data-svg-african-role="near-arm-depth-edge front-of-torso visible-side-arm-edge clear-near-arm-over-torso" d="M${(46 + widthShift * 0.15).toFixed(1)} 27 C51 76 ${(47 + widthShift * 0.25).toFixed(1)} 132 ${(40 + widthShift * 0.25).toFixed(1)} ${(sleeveEndY - 7).toFixed(1)}" fill="none" stroke="var(--cloth-light)" stroke-width="2.15" opacity=".52" stroke-linecap="round"/>
    <path id="side-near-arm-front-plane" data-svg-african-role="near-arm-front-plane front-of-torso visible-side-arm-edge clear-near-arm-over-torso" d="M${(35 + widthShift * 0.12).toFixed(1)} 22 C45 51 ${(45 + widthShift * 0.18).toFixed(1)} 116 ${(39 + widthShift * 0.20).toFixed(1)} ${(sleeveEndY - 9).toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.15" opacity=".20" stroke-linecap="round"/>` : `<path id="side-far-arm-shadow-edge" data-svg-african-role="far-arm-shadow-edge behind-torso" d="M${(16 - widthShift * 0.12).toFixed(1)} 38 C13 82 ${(15 - widthShift * 0.18).toFixed(1)} 139 ${(19 - widthShift * 0.18).toFixed(1)} ${(sleeveEndY - 10).toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.2" opacity=".18" stroke-linecap="round"/>`}
    ${renderFabricDesignMarkup(fabricDesign, { role: 'side-arm-fabric-design', x1: 18, x2: 44, y1: 22, y2: sleeveEndY - 8, compact: true })}
    ${sleeveEndY < 215 ? `<path id="side-forearm" data-svg-african-role="skin forearm wrist-transition" d="${skinPath}" fill="url(#skinGrad)"/>` : ''}
    <path id="side-hand" data-svg-african-role="hand palm thumb wrist side-view-premium profile-hand anatomical-open-side-hand tapered-wrist" transform="translate(30 ${(226 + lengthShift).toFixed(1)}) scale(${handScale.toFixed(3)}) translate(-30 ${(-226 - lengthShift).toFixed(1)})" d="M21 ${(217 + lengthShift).toFixed(1)} C25 ${(213 + lengthShift).toFixed(1)} 34 ${(213 + lengthShift).toFixed(1)} 38 ${(217 + lengthShift).toFixed(1)} C40 ${(221 + lengthShift).toFixed(1)} 41 ${(226 + lengthShift).toFixed(1)} 43 ${(231 + lengthShift).toFixed(1)} C45 ${(237 + lengthShift).toFixed(1)} 41 ${(244 + lengthShift).toFixed(1)} 34 ${(248 + lengthShift).toFixed(1)} C28 ${(250 + lengthShift).toFixed(1)} 21 ${(246 + lengthShift).toFixed(1)} 19 ${(239 + lengthShift).toFixed(1)} L17 ${(228 + lengthShift).toFixed(1)} C17 ${(223 + lengthShift).toFixed(1)} 18 ${(219 + lengthShift).toFixed(1)} 21 ${(217 + lengthShift).toFixed(1)} Z" fill="url(#skinGrad)"/>
    <path id="side-thumb" data-svg-african-role="thumb profile-thumb separated-thumb" d="M38 ${(220 + lengthShift).toFixed(1)} C46 ${(223 + lengthShift).toFixed(1)} 48 ${(231 + lengthShift).toFixed(1)} 43 ${(236 + lengthShift).toFixed(1)} C40 ${(238 + lengthShift).toFixed(1)} 37 ${(236 + lengthShift).toFixed(1)} 36 ${(232 + lengthShift).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width="1.35" opacity=".34" stroke-linecap="round"/>
    <path id="side-finger-separation" data-svg-african-role="finger-separation anatomical-open-side-hand" d="M23 ${(234 + lengthShift).toFixed(1)} C25 ${(240 + lengthShift).toFixed(1)} 28 ${(244 + lengthShift).toFixed(1)} 32 ${(246 + lengthShift).toFixed(1)} M28 ${(233 + lengthShift).toFixed(1)} C30 ${(239 + lengthShift).toFixed(1)} 33 ${(242 + lengthShift).toFixed(1)} 36 ${(243 + lengthShift).toFixed(1)}" fill="none" stroke="var(--skin-shade)" stroke-width=".82" opacity=".22" stroke-linecap="round"/>
    ${muscle > 0.08 ? `<path id="side-arm-muscle" data-svg-african-role="muscle-definition arm-contour" d="M38 49 C44 82 41 116 34 140" fill="none" stroke="var(--skin-light)" stroke-width="${(1.1 + muscle * 1.4).toFixed(2)}" opacity="${(0.12 + muscle * 0.16).toFixed(2)}" stroke-linecap="round"/>` : ''}
    </g>
</g>`;
        return svgShell(partKey, 54, 260, body, p);
    }

    function renderSideLeg(partKey, config, p, options = {}) {
        const styling = readStyling(config);
        const identity = readIdentity(config);
        const view = normalizePremiumView(styling.view || config.view || 'side-right');
        const isLeft = view === 'side-left';
        const isFront = partKey === 'front-leg';
        const bottomClothing = resolveBottomClothing(config);
        const skirtLength = resolveSkirtLength(config);
        const footwear = normalizeId(styling.footwear || config.footwear, 'formal');
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const bodyType = normalizeId(identity.body || config.body, 'average');
        const heightType = normalizeId(identity.height || config.height, 'average');
        const anatomicalLeg = isFront
            ? (isLeft ? 'left-leg' : 'right-leg')
            : (isLeft ? 'right-leg' : 'left-leg');
        const adjustments = resolveRenderAdjustments(config, options.adjustments);
        const legLength = getAdjustmentValue(adjustments, 'legLength');
        const legWidth = getAdjustmentValue(adjustments, 'legWidth');
        const footSize = getAdjustmentValue(adjustments, 'footSize');
        const bottomWearLength = getAdjustmentValue(adjustments, 'bottomWearLength');
        const muscle = Math.max(0, getAdjustmentValue(adjustments, 'muscleDefinition') + (getPresentationVisualProfile(presentation).muscleDefinition || 0));
        const fabricDesign = resolveEffectiveFabricDesign(config, `${styling.outfit || ''} ${bottomClothing} ${styling.profession || ''}`);
        const lengthShift = legLength * 36;
        const widthShift = legWidth * 6;
        const footScale = 1 + footSize * 0.42;
        const isSkirtBottom = isSkirtLikeBottom(bottomClothing);
        const isShorts = /shorts/.test(bottomClothing);
        const visibleLegTop = isSkirtBottom
            ? clamp(getSkirtLegCoverage(skirtLength) + bottomWearLength * 70, 34, 224)
            : isShorts
                ? clamp(90 + bottomWearLength * 65, 48, 150)
                : 10;
        const mirror = isLeft ? 'translate(58 0) scale(-1 1)' : '';
        const trouserPath = `M${(10 - widthShift).toFixed(1)} 9 C23 0 41 1 ${(51 + widthShift).toFixed(1)} 10 C51 73 ${(48 + widthShift * 0.32).toFixed(1)} 130 ${(44 + widthShift * 0.35).toFixed(1)} ${(170 + lengthShift * 0.45).toFixed(1)} C43 ${(190 + lengthShift * 0.65).toFixed(1)} ${(41 + widthShift * 0.24).toFixed(1)} ${(209 + lengthShift).toFixed(1)} ${(38 + widthShift * 0.18).toFixed(1)} ${(220 + lengthShift).toFixed(1)} C32 ${(226 + lengthShift).toFixed(1)} 25 ${(226 + lengthShift).toFixed(1)} ${(18 - widthShift * 0.18).toFixed(1)} ${(220 + lengthShift).toFixed(1)} C15 ${(207 + lengthShift).toFixed(1)} ${(13 - widthShift * 0.30).toFixed(1)} ${(186 + lengthShift * 0.60).toFixed(1)} ${(13 - widthShift * 0.35).toFixed(1)} ${(165 + lengthShift * 0.42).toFixed(1)} C11 124 8 72 ${(10 - widthShift).toFixed(1)} 9 Z`;
        const shortsPath = `M${(10 - widthShift).toFixed(1)} 9 C23 0 41 1 ${(51 + widthShift).toFixed(1)} 10 C51 ${(visibleLegTop * 0.55).toFixed(1)} ${(48 + widthShift * 0.32).toFixed(1)} ${(visibleLegTop - 12).toFixed(1)} ${(43 + widthShift * 0.30).toFixed(1)} ${visibleLegTop.toFixed(1)} C36 ${(visibleLegTop + 7).toFixed(1)} 24 ${(visibleLegTop + 7).toFixed(1)} ${(17 - widthShift * 0.30).toFixed(1)} ${visibleLegTop.toFixed(1)} C12 ${(visibleLegTop - 13).toFixed(1)} 8 ${(visibleLegTop * 0.55).toFixed(1)} ${(10 - widthShift).toFixed(1)} 9 Z`;
        const lowerLegPath = `M${(17 - widthShift * 0.3).toFixed(1)} ${visibleLegTop.toFixed(1)} C24 ${(visibleLegTop + 7).toFixed(1)} 37 ${(visibleLegTop + 7).toFixed(1)} ${(43 + widthShift * 0.3).toFixed(1)} ${visibleLegTop.toFixed(1)} C43 ${(visibleLegTop + 50).toFixed(1)} ${(42 + widthShift * 0.2).toFixed(1)} ${(196 + lengthShift).toFixed(1)} ${(38 + widthShift * 0.22).toFixed(1)} ${(219 + lengthShift).toFixed(1)} C33 ${(226 + lengthShift).toFixed(1)} 25 ${(226 + lengthShift).toFixed(1)} ${(18 - widthShift * 0.22).toFixed(1)} ${(219 + lengthShift).toFixed(1)} C15 ${(194 + lengthShift).toFixed(1)} 15 ${(visibleLegTop + 50).toFixed(1)} ${(17 - widthShift * 0.3).toFixed(1)} ${visibleLegTop.toFixed(1)} Z`;
        const footPath = `M10 ${(225 + lengthShift).toFixed(1)} C21 ${(216 + lengthShift).toFixed(1)} 43 ${(218 + lengthShift).toFixed(1)} 57 ${(228 + lengthShift).toFixed(1)} C54 ${(237 + lengthShift).toFixed(1)} 27 ${(240 + lengthShift).toFixed(1)} 9 ${(232 + lengthShift).toFixed(1)} Z`;
        const body = `
<g ${styleVars(p)} data-svg-african-role="${partKey} premium-part side-view-premium leg side-profile-leg ${isFront ? 'near-leg front-leg front-depth-leg' : 'far-leg back-leg rear-depth-leg'} ${anatomicalLeg} presentation-${presentation} body-${bodyType} height-${heightType}" opacity="${isFront ? '1' : '.9'}">
    <g id="side-leg-root" transform="${mirror}">
    <path id="side-hip-cap" data-svg-african-role="hip-cap upper-leg-origin side-view-premium side-hip-overlap" d="M${(9 - widthShift).toFixed(1)} 11 C23 0 42 1 ${(52 + widthShift).toFixed(1)} 11 C43 22 19 22 ${(9 - widthShift).toFixed(1)} 11 Z" fill="${isSkirtBottom ? 'var(--skirt)' : 'url(#clothGrad)'}" opacity="${isFront ? '.96' : '.88'}"/>
    <path id="side-upper-leg" data-svg-african-role="${isSkirtBottom ? 'covered-by-skirt-wrapper opaque-upper-thigh-clothing' : isShorts ? `side-shorts shorts-leg leg-clothing opaque-upper-thigh-clothing adjustable-bottom-hem ${bottomClothing}` : `trouser-leg leg-clothing opaque-upper-thigh-clothing ${bottomClothing}`}" d="${isShorts ? shortsPath : trouserPath}" fill="${isSkirtBottom ? 'var(--skirt)' : 'url(#clothGrad)'}" opacity="1"/>
    ${isSkirtBottom || isShorts ? `<path id="side-visible-calf" data-svg-african-role="visible-lower-leg ${isShorts ? 'below-shorts-hem skin-below-shorts' : 'below-skirt-hem'} skin" d="${lowerLegPath}" fill="url(#skinGrad)" opacity="${isSkirtBottom && visibleLegTop >= 224 ? '0' : '1'}"/>` : ''}
    ${isShorts ? `<path id="side-shorts-hem" data-svg-african-role="shorts-hem adjustable-bottom-hem" d="M17 ${visibleLegTop.toFixed(1)} C24 ${(visibleLegTop + 7).toFixed(1)} 36 ${(visibleLegTop + 7).toFixed(1)} 43 ${visibleLegTop.toFixed(1)}" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".72" stroke-linecap="round"/>` : ''}
    ${!isSkirtBottom ? renderFabricDesignMarkup(fabricDesign, { role: 'side-leg-fabric-design', x1: 16, x2: 45, y1: 24, y2: isShorts ? Math.max(30, visibleLegTop - 8) : 204, compact: true }) : ''}
    ${isShorts ? '' : `<path id="side-leg-shade" d="M38 ${Math.max(visibleLegTop + 10, 30).toFixed(1)} C42 101 40 166 35 ${(209 + lengthShift).toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="1.15" opacity=".20" stroke-linecap="round"/>`}
    ${muscle > 0.08 && !isSkirtBottom ? `<path id="side-leg-muscle" data-svg-african-role="muscle-definition calf-contour" d="M21 ${Math.max(visibleLegTop + 12, 86).toFixed(1)} C17 120 19 168 25 200" fill="none" stroke="var(--skin-light)" stroke-width="${(1 + muscle * 1.2).toFixed(2)}" opacity="${(0.10 + muscle * 0.14).toFixed(2)}" stroke-linecap="round"/>` : ''}
    <path id="side-shoe" data-svg-african-role="footwear foot side-foot anatomical-side-foot ${footwear}" transform="translate(30 ${(226 + lengthShift).toFixed(1)}) scale(${footScale.toFixed(3)} 1) translate(-30 ${(-226 - lengthShift).toFixed(1)})" d="${footPath}" fill="var(--shoe)"/>
    <path id="side-shoe-highlight" d="M20 ${(225 + lengthShift).toFixed(1)} C31 ${(228 + lengthShift).toFixed(1)} 45 ${(228 + lengthShift).toFixed(1)} 54 ${(225 + lengthShift).toFixed(1)}" fill="none" stroke="#ffffff" stroke-width="1.1" opacity=".22" stroke-linecap="round"/>
    </g>
</g>`;
        return svgShell(partKey, 58, 260, body, p);
    }

    const RENDERERS = Object.freeze({
        'head-neck': renderHeadNeck,
        torso: renderTorso,
        'right-arm': (config, palette, options) => renderArm('right-arm', config, palette, options),
        'left-arm': (config, palette, options) => renderArm('left-arm', config, palette, options),
        'right-leg': (config, palette, options) => renderLeg('right-leg', config, palette, options),
        'left-leg': (config, palette, options) => renderLeg('left-leg', config, palette, options)
    });

    const BACK_RENDERERS = Object.freeze({
        'head-neck': renderBackHeadNeck,
        torso: renderBackTorso,
        'right-arm': (config, palette, options) => renderBackArm('right-arm', config, palette, options),
        'left-arm': (config, palette, options) => renderBackArm('left-arm', config, palette, options),
        'right-leg': (config, palette, options) => renderBackLeg('right-leg', config, palette, options),
        'left-leg': (config, palette, options) => renderBackLeg('left-leg', config, palette, options)
    });

    const SIDE_RENDERERS = Object.freeze({
        'head-neck': renderSideHeadNeck,
        torso: renderSideTorso,
        'front-arm': (config, palette, options) => renderSideArm('front-arm', config, palette, options),
        'back-arm': (config, palette, options) => renderSideArm('back-arm', config, palette, options),
        'front-leg': (config, palette, options) => renderSideLeg('front-leg', config, palette, options),
        'back-leg': (config, palette, options) => renderSideLeg('back-leg', config, palette, options)
    });

    function get(assetId = DEFAULT_ASSET_ID) {
        return ASSETS[assetId] || resolveAliasedAsset(assetId) || resolveGeneratedViewAsset(assetId) || null;
    }

    function canonicalizeArtworkValue(value) {
        if (Array.isArray(value)) return value.map(canonicalizeArtworkValue);
        if (value && typeof value === 'object') {
            return Object.keys(value).sort().reduce((result, key) => {
                const next = value[key];
                if (typeof next === 'undefined' || typeof next === 'function') return result;
                result[key] = canonicalizeArtworkValue(next);
                return result;
            }, {});
        }
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.round(value * 1000000) / 1000000;
        }
        return value;
    }

    function buildArtworkRenderSignature(asset, renderConfig, renderOptions) {
        const identity = cloneDeep(renderConfig?.identity || {});
        const styling = cloneDeep(renderConfig?.styling || {});
        const faceState = cloneDeep(renderOptions?.faceState || {});
        delete identity.identityId;
        // Renderer selection does not alter the authored front/back source pack.
        delete styling.headArtwork;
        delete styling.threeQuarterArtwork;
        delete styling.rearTalkingProfile;
        // Jewelry is composed after artwork selection, including authored packs.
        delete styling.jewelry;
        // Rear 3/4 face motion is layered over the authored back artwork and
        // must not invalidate an otherwise compatible artwork signature.
        delete faceState.headTurn;
        delete faceState.frontHeadYaw;
        delete faceState.rearFaceReveal;
        // Lip-sync opening gain is applied by the live face runtime and does
        // not change which authored head source is compatible.
        delete faceState.mouthOpeningGain;
        delete faceState.teethVisibility;
        return JSON.stringify(canonicalizeArtworkValue({
            contractVersion: 1,
            assetId: asset?.id || '',
            view: asset?.view || renderConfig?.view || 'front',
            identity,
            styling,
            adjustments: cloneDeep(renderOptions?.adjustments || {}),
            faceState
        }));
    }

    function getAuthoredSourceAsset(asset) {
        if (!asset || asset?.threeQuarterAnatomy?.projectionMode !== 'profile-tilt-3q') return asset || null;
        const sourceView = isBackPremiumView(asset.view) ? 'back' : 'front';
        return get(getViewVariantAssetId(asset.id, sourceView)) || asset;
    }

    function getAuthoredRenderContext(asset, renderConfig, renderOptions = {}) {
        const sourceAsset = getAuthoredSourceAsset(asset);
        if (!asset || !sourceAsset || sourceAsset.id === asset.id) {
            return {
                asset: sourceAsset || asset,
                config: renderConfig,
                options: renderOptions,
                projected: false,
                sourceView: sourceAsset?.view || asset?.view || 'front'
            };
        }

        const sourceDefaults = getAssetRenderDefaults(sourceAsset.id);
        const sourceView = sourceAsset.view || (isBackPremiumView(asset.view) ? 'back' : 'front');
        const sourceSideFacing = sourceDefaults?.styling?.sideFacing || 'right';
        const sourceConfig = normalizePremiumConfig(sourceAsset, {
            ...renderConfig,
            assetCharacterId: sourceAsset.id,
            assetId: sourceAsset.id,
            view: sourceView,
            sideFacing: sourceSideFacing,
            styling: {
                ...(renderConfig?.styling || {}),
                view: sourceView,
                sideFacing: sourceSideFacing
            }
        });
        const sourceFaceState = {
            ...(renderOptions?.faceState || {})
        };
        if (String(asset.view || '').startsWith('front-3q-')) {
            sourceFaceState.gazeX = clamp(
                Number(sourceFaceState.gazeX || 0) + getThreeQuarterGazeBaseline(asset.view),
                FACE_PROPERTIES.gazeX.min,
                FACE_PROPERTIES.gazeX.max
            );
        }

        return {
            asset: sourceAsset,
            config: sourceConfig,
            options: {
                ...renderOptions,
                faceState: sourceFaceState
            },
            projected: true,
            sourceView
        };
    }

    function getArtworkRenderSignature(assetOrId = DEFAULT_ASSET_ID, config = {}, options = {}) {
        const asset = typeof assetOrId === 'string' ? get(assetOrId) : assetOrId;
        if (!asset) return '';
        const renderConfig = options.normalizedConfig ? config : normalizePremiumConfig(asset, config);
        const renderOptions = {
            faceState: getFaceState(renderConfig, options.faceState),
            adjustments: resolveRenderAdjustments(renderConfig, options.adjustments)
        };
        const authoredContext = getAuthoredRenderContext(asset, renderConfig, renderOptions);
        return buildArtworkRenderSignature(authoredContext.asset, authoredContext.config, authoredContext.options);
    }

    function getArtworkSourceMetadata(asset) {
        const drawnThreeQuarter = isThreeQuarterPremiumView(asset?.view)
            && getThreeQuarterArtworkMode({}, asset) === 'experimental-drawn';
        if (drawnThreeQuarter) {
            return {
                runtimeArtworkSource: 'experimental-drawn-three-quarter',
                authoredSourceAssetId: asset?.configAssetId || stripDrawnThreeQuarterRuntimeSuffix(asset?.id),
                authoredProjection: 'authored-3q',
                authoredRuntimeReady: !!globalThis.SvgAfricanThreeQuarterRenderer?.renderPartSvg,
                authoredCompatibility: 'experimental-opt-in',
                authoredArtworkVersion: 'three-quarter-pilot-v1',
                authoredQualityStage: 'experimental',
                authoredFallback: 'profile-tilt-3q',
                authoredReferenceAvailable: false,
                authoredReferencePath: '',
                plannedSourcePath: asset?.sourcePath || ''
            };
        }
        const authoredSourceAsset = getAuthoredSourceAsset(asset);
        const authoredPack = globalThis.SvgAfricanAuthoredArtwork?.getPackInfo?.(authoredSourceAsset?.id);
        const authoredRuntimeReady = authoredPack?.ok === true
            && authoredPack?.runtimeEnabled === true
            && authoredPack?.partsLoaded !== false;
        const hasAuthoredReference = authoredPack?.ok === true
            || (authoredSourceAsset?.id === DEFAULT_ASSET_ID && authoredSourceAsset?.view === 'front');
        return {
            runtimeArtworkSource: authoredRuntimeReady
                ? 'authored-svg-files-with-procedural-fallback'
                : 'procedural-renderer',
            authoredSourceAssetId: authoredSourceAsset?.id || asset?.id || '',
            authoredProjection: authoredSourceAsset?.id !== asset?.id ? 'profile-tilt-3q' : 'none',
            authoredRuntimeReady,
            authoredCompatibility: authoredRuntimeReady ? (authoredPack.compatibility || 'exact-signature') : '',
            authoredArtworkVersion: authoredRuntimeReady ? (authoredPack.artworkVersion || '') : '',
            authoredQualityStage: authoredRuntimeReady ? (authoredPack.qualityStage || '') : '',
            authoredFallback: authoredRuntimeReady ? (authoredPack.fallback || 'procedural-renderer') : '',
            authoredReferenceAvailable: hasAuthoredReference,
            authoredReferencePath: hasAuthoredReference
                ? `${authoredSourceAsset?.sourcePath || DEFAULT_SOURCE_PATH}/${authoredSourceAsset?.masterFile || 'master.svg'}`
                : '',
            plannedSourcePath: asset?.sourcePath || ''
        };
    }

    function getArtworkRenderStatus(assetOrId = DEFAULT_ASSET_ID, config = {}, options = {}) {
        const asset = typeof assetOrId === 'string' ? get(assetOrId) : assetOrId;
        if (!asset) {
            return {
                source: 'unavailable',
                authoredAvailable: false,
                authoredActive: false,
                changedPaths: ['asset']
            };
        }
        const drawnThreeQuarter = isThreeQuarterPremiumView(asset.view)
            && getThreeQuarterArtworkMode(config, asset) === 'experimental-drawn';
        if (drawnThreeQuarter) {
            const available = !!globalThis.SvgAfricanThreeQuarterRenderer?.renderPartSvg;
            return {
                assetId: asset.id,
                authoredSourceAssetId: asset.configAssetId || stripDrawnThreeQuarterRuntimeSuffix(asset.id),
                authoredProjection: 'authored-3q',
                source: available ? 'experimental-drawn-three-quarter' : 'profile-tilt-3q',
                authoredAvailable: available,
                authoredActive: available,
                experimental: true,
                artworkVersion: 'three-quarter-pilot-v1',
                qualityStage: 'experimental',
                fallback: 'profile-tilt-3q',
                changedPaths: available ? [] : ['threeQuarterRenderer']
            };
        }
        const renderConfig = options.normalizedConfig ? config : normalizePremiumConfig(asset, config);
        const renderOptions = {
            faceState: getFaceState(renderConfig, options.faceState),
            adjustments: resolveRenderAdjustments(renderConfig, options.adjustments)
        };
        const authoredContext = getAuthoredRenderContext(asset, renderConfig, renderOptions);
        const registry = globalThis.SvgAfricanAuthoredArtwork;
        const pack = registry?.getPackInfo?.(authoredContext.asset?.id);
        const signature = buildArtworkRenderSignature(
            authoredContext.asset,
            authoredContext.config,
            authoredContext.options
        );
        const compatibility = registry?.explainCompatibility?.(authoredContext.asset?.id, signature)
            || { compatible: false, available: !!pack, changedPaths: pack ? ['signature'] : [] };
        const authoredAvailable = pack?.ok === true && pack?.runtimeEnabled === true;
        const authoredActive = authoredAvailable
            && pack?.partsLoaded !== false
            && compatibility.compatible === true;
        return {
            assetId: asset.id,
            authoredSourceAssetId: authoredContext.asset?.id || asset.id,
            authoredProjection: authoredContext.projected ? 'profile-tilt-3q' : 'none',
            source: authoredActive ? 'authored-svg-files' : 'procedural-renderer',
            authoredAvailable,
            authoredActive,
            artworkVersion: pack?.artworkVersion || '',
            qualityStage: pack?.qualityStage || 'procedural',
            fallback: pack?.fallback || 'procedural-renderer',
            changedPaths: [...(compatibility.changedPaths || [])]
        };
    }

    function list() {
        return getAllAssets().map(asset => ({
            ...(() => {
                const defaults = getAssetRenderDefaults(asset.id);
                return {
                    identityDefaults: cloneDeep(defaults.identity || {}),
                    stylingDefaults: cloneDeep(defaults.styling || {}),
                    premiumAdjustmentDefaults: cloneDeep(defaults.premiumAdjustments || {}),
                    visualFingerprint: cloneDeep(defaults.visualFingerprint || null)
                };
            })(),
            id: asset.id,
            presetId: asset.presetId,
            name: asset.name,
            view: asset.view,
            engine: asset.engine,
            assetProfile: asset.assetProfile || FRONT_PREMIUM_ASSET_PROFILE,
            ...getArtworkSourceMetadata(asset),
            sourcePath: asset.sourcePath || '',
            masterFile: asset.masterFile || '',
            partFiles: { ...(asset.partFiles || {}) },
            roles: [...asset.roles]
        }));
    }

    function getAssetManifest(assetId = DEFAULT_ASSET_ID) {
        const asset = get(assetId);
        if (!asset) return null;
        const roleKeys = getPremiumPartKeysForAsset(asset);
        return {
            id: asset.id,
            presetId: asset.presetId,
            name: asset.name,
            view: asset.view,
            engine: asset.engine,
            assetProfile: asset.assetProfile || FRONT_PREMIUM_ASSET_PROFILE,
            ...getArtworkSourceMetadata(asset),
            sourcePath: asset.sourcePath || DEFAULT_SOURCE_PATH,
            masterFile: asset.masterFile || 'master.svg',
            partFiles: { ...(asset.partFiles || getPremiumPartFileMapForAsset(asset)) },
            roles: [...(asset.roles || roleKeys)],
            order: [...(asset.order || [])],
            reference: cloneDeep(asset.reference),
            parts: cloneDeep(asset.parts),
            joints: cloneDeep(asset.joints),
            pins: cloneDeep(asset.pins),
            facialLayers: [...(asset.facialLayers || getPremiumFacialLayersForAsset(asset))],
            authoring: cloneDeep(getAssetAuthoring(asset)),
            identityDefaults: cloneDeep(getAssetRenderDefaults(asset.id).identity || {}),
            stylingDefaults: cloneDeep(getAssetRenderDefaults(asset.id).styling || {}),
            premiumAdjustmentDefaults: cloneDeep(getAssetRenderDefaults(asset.id).premiumAdjustments || {}),
            visualFingerprint: cloneDeep(getAssetRenderDefaults(asset.id).visualFingerprint || null),
            calibrationVersion: asset.calibrationVersion || 1
        };
    }

    function validatePremiumAsset(assetOrId = DEFAULT_ASSET_ID) {
        const asset = typeof assetOrId === 'string' ? get(assetOrId) : assetOrId;
        const assetId = asset?.id || String(assetOrId || '');
        const errors = [];
        const warnings = [];
        const fail = message => errors.push(`${assetId || 'unknown'}: ${message}`);
        const warn = message => warnings.push(`${assetId || 'unknown'}: ${message}`);

        if (!asset) {
            fail('asset is not registered');
            return { ok: false, assetId, errors, warnings };
        }
        if (asset.engine !== PREMIUM_ASSET_CONTRACT.engine) fail(`engine must be ${PREMIUM_ASSET_CONTRACT.engine}`);
        if (!PREMIUM_ASSET_CONTRACT.supportedViews.includes(asset.view)) fail(`view must be one of ${PREMIUM_ASSET_CONTRACT.supportedViews.join(', ')}`);
        if (!PREMIUM_ASSET_CONTRACT.assetProfiles.includes(asset.assetProfile || '')) fail(`assetProfile must be one of ${PREMIUM_ASSET_CONTRACT.assetProfiles.join(', ')}`);
        const artworkSource = getArtworkSourceMetadata(asset);
        if (!['procedural-renderer', 'authored-svg-files', 'authored-svg-files-with-procedural-fallback', 'experimental-drawn-three-quarter'].includes(artworkSource.runtimeArtworkSource)) {
            fail(`unsupported runtime artwork source ${artworkSource.runtimeArtworkSource}`);
        }
        if (!asset.sourcePath) fail('sourcePath is required');
        if (!asset.masterFile) fail('masterFile is required');
        if (!asset.presetId) fail('presetId is required');

        const requiredRoles = [...getPremiumPartKeysForAsset(asset)];
        const requiredJoints = getPremiumJointContractForAsset(asset);
        const requiredFacialLayers = getPremiumFacialLayersForAsset(asset);
        const roles = Array.isArray(asset.roles) ? asset.roles : [];
        requiredRoles.forEach(role => {
            if (!roles.includes(role)) fail(`missing role ${role}`);
            if (!asset.parts?.[role]) fail(`missing part profile ${role}`);
            if (!asset.partFiles?.[role]) fail(`missing part file ${role}`);
        });
        if (roles.length !== requiredRoles.length) {
            warn(`expected ${requiredRoles.length} roles, found ${roles.length}`);
        }
        const order = Array.isArray(asset.order) ? asset.order : [];
        requiredRoles.forEach(role => {
            if (!order.includes(role)) fail(`layer order does not include ${role}`);
        });
        Object.entries(requiredJoints).forEach(([partKey, joints]) => {
            joints.forEach(jointKey => {
                if (!asset.joints?.[partKey]?.[jointKey]) fail(`missing joint ${partKey}.${jointKey}`);
            });
        });
        requiredRoles
            .filter(role => role !== 'torso')
            .forEach(role => {
                if (!asset.pins?.[role]) fail(`missing pin metadata for ${role}`);
            });
        requiredFacialLayers.forEach(role => {
            if (!Array.isArray(asset.facialLayers) || !asset.facialLayers.includes(role)) {
                warn(`facial layer ${role} is not declared`);
            }
        });
        Object.entries(getAssetAuthoring(asset)).forEach(([key, value]) => {
            if (asset.authoring?.[key] !== value) fail(`authoring.${key} must be ${value}`);
        });

        const defaults = getAssetRenderDefaults(asset.id);
        if (!defaults.identity?.presentation) fail('identity defaults are required');
        if (!defaults.styling?.outfit) fail('styling defaults are required');
        if (!defaults.visualFingerprint?.label) fail('visual fingerprint label is required');
        if (!Array.isArray(defaults.visualFingerprint?.requiredSvgTokens) || !defaults.visualFingerprint.requiredSvgTokens.length) {
            fail('visual fingerprint SVG tokens are required');
        }

        return { ok: errors.length === 0, assetId: asset.id, errors, warnings };
    }

    function validatePremiumCatalog() {
        const seenFingerprints = new Map();
        const results = getAllAssets().map(asset => {
            const result = validatePremiumAsset(asset);
            const label = getAssetRenderDefaults(asset.id).visualFingerprint?.label || '';
            if (label) {
                const existing = seenFingerprints.get(label);
                if (existing) result.errors.push(`${asset.id}: visual fingerprint duplicates ${existing}`);
                seenFingerprints.set(label, asset.id);
            }
            result.ok = result.errors.length === 0;
            return result;
        });
        return {
            ok: results.every(result => result.ok),
            results,
            errors: results.flatMap(result => result.errors),
            warnings: results.flatMap(result => result.warnings)
        };
    }

    function getPartProfile(assetId = DEFAULT_ASSET_ID, partKey, adjustments = {}) {
        const asset = get(assetId);
        const base = cloneProfile(asset?.parts?.[partKey]);
        if (!asset || !base) return null;
        const adjusted = getAdjustments({ premiumAdjustments: adjustments });
        const isSideAsset = isSidePremiumView(asset.view);
        const isBackAsset = isBackPremiumView(asset.view);
        const isAuthoredThreeQuarter = asset?.threeQuarterAnatomy?.projectionMode === 'authored-3q';
        const baseTorsoProfile = asset.parts?.torso || null;
        const centerX = base.x + base.width * 0.5;
        const torsoProfile = partKey === 'torso' ? null : getAdjustedTorsoProfile(asset, adjusted);

        if (partKey === 'head-neck') {
            const widthScale = 1 + getHeadWidthAdjustment(adjusted) * 1.30 + getNeckWidthAdjustment(adjusted) * 0.24;
            const heightScale = 1 + getHeadHeightAdjustment(adjusted) * 1.22 + getNeckHeightAdjustment(adjusted) * 0.30;
            const nextWidth = base.width * widthScale;
            const nextHeight = base.height * heightScale;
            const neckSocketY = torsoProfile
                ? torsoProfile.y + torsoProfile.height * 0.108
                : base.y + base.height * base.pivotY;
            const torsoCenterX = torsoProfile
                ? torsoProfile.x + torsoProfile.width * 0.5
                : centerX;
            const authoredOffsetX = isAuthoredThreeQuarter && baseTorsoProfile
                ? centerX - (baseTorsoProfile.x + baseTorsoProfile.width * 0.5)
                : -1.5;
            base.x = torsoCenterX + authoredOffsetX - nextWidth * 0.5;
            base.y = neckSocketY - nextHeight * base.pivotY;
            base.width = nextWidth;
            base.height = nextHeight;
        } else if (partKey === 'torso') {
            const nextTorso = getAdjustedTorsoProfile(asset, adjusted);
            Object.assign(base, nextTorso);
        } else if (/arm$/.test(partKey)) {
            const nextHeight = base.height * (1 + adjusted.armLength * 1.38);
            const muscle = getAdjustmentValue(adjusted, 'muscleDefinition');
            const nextWidth = base.width * (1 + adjusted.armWidth * 1.02 + adjusted.handSize * 0.16 + Math.min(0, muscle) * 0.04);
            const shoulderTargetX = torsoProfile
                ? (isSideAsset
                    ? torsoProfile.x + torsoProfile.width * (partKey === 'front-arm' ? (asset.view === 'side-right' ? 0.52 : 0.48) : (asset.view === 'side-right' ? 0.48 : 0.52))
                    : (isBackAsset
                        ? torsoProfile.x + (partKey === 'right-arm'
                            ? torsoProfile.width - clamp(torsoProfile.width * 0.09, 10, 18)
                            : clamp(torsoProfile.width * 0.09, 10, 18))
                    : (isAuthoredThreeQuarter && baseTorsoProfile
                        ? torsoProfile.x + torsoProfile.width * clamp(
                            ((base.x + base.width * base.pivotX) - baseTorsoProfile.x) / Math.max(1, baseTorsoProfile.width),
                            0,
                            1
                        )
                        : (partKey === 'right-arm' ? torsoProfile.x + 4 : torsoProfile.x + torsoProfile.width - 1))))
                : centerX;
            const shoulderTargetY = torsoProfile
                ? torsoProfile.y + torsoProfile.height * (isSideAsset ? 0.225 : (isBackAsset ? 0.205 : 0.219))
                : base.y + base.height * base.pivotY;
            base.x = shoulderTargetX - nextWidth * base.pivotX;
            base.y = shoulderTargetY - nextHeight * base.pivotY;
            base.width = nextWidth;
            base.height = nextHeight;
        } else if (/leg$/.test(partKey)) {
            const rawLegLength = clamp(adjusted.legLength, -0.32, 0.45);
            const effectiveLegLength = rawLegLength > 0
                ? 0.45 * Math.pow(rawLegLength / 0.45, 1.55)
                : rawLegLength;
            const nextHeight = base.height * (1 + effectiveLegLength * 1.28);
            const muscle = getAdjustmentValue(adjusted, 'muscleDefinition');
            const nextWidth = base.width * (1 + adjusted.legWidth * 1.02 + adjusted.footSize * 0.12 + Math.min(0, muscle) * 0.04);
            const pivotTargetY = (isSideAsset || isBackAsset || isAuthoredThreeQuarter) && torsoProfile
                ? torsoProfile.y + torsoProfile.height * (isSideAsset ? 0.79 : 0.84)
                : base.y + base.height * base.pivotY;
            if (isSideAsset && torsoProfile) {
                const frontLeg = partKey === 'front-leg';
                const hipFactor = frontLeg
                    ? (asset.view === 'side-right' ? 0.57 : 0.43)
                    : (asset.view === 'side-right' ? 0.45 : 0.55);
                const hipTargetX = torsoProfile.x + torsoProfile.width * hipFactor;
                base.x = hipTargetX - nextWidth * base.pivotX;
            } else if (isAuthoredThreeQuarter && torsoProfile && baseTorsoProfile) {
                const baseHipX = base.x + base.width * base.pivotX;
                const hipFactor = clamp((baseHipX - baseTorsoProfile.x) / Math.max(1, baseTorsoProfile.width), 0, 1);
                base.x = torsoProfile.x + torsoProfile.width * hipFactor - nextWidth * base.pivotX;
            } else {
                const widthDelta = nextWidth - base.width;
                const rightLeg = /right-leg/.test(partKey);
                const outwardDirection = isBackAsset
                    ? (rightLeg ? 1 : -1)
                    : (rightLeg ? -1 : 1);
                const outwardShift = outwardDirection * widthDelta * 0.45;
                base.x = centerX - nextWidth * 0.5 + outwardShift;
            }
            base.y = pivotTargetY - nextHeight * base.pivotY;
            base.width = nextWidth;
            base.height = nextHeight;
        }

        return base;
    }

    function insertIntoHeadMotionGroup(svg, markup, behindHead = false) {
        const source = String(svg || '');
        if (!source || !markup || source.includes('data-svg-african-face-reveal=')) return source;
        const openingGroups = /<g\b[^>]*>/gi;
        let opening = null;
        while ((opening = openingGroups.exec(source))) {
            const tag = opening[0];
            if (behindHead
                ? /data-svg-african-role=["']socket-anchored-rear-head-fit/i.test(tag)
                : /data-svg-african-role=["'][^"']*head-motion/i.test(tag) || /id=["'][^"']*head-motion/i.test(tag)) break;
        }
        if (!opening) return source;
        if (behindHead) {
            const index = opening.index + opening[0].length;
            return `${source.slice(0, index)}${markup}${source.slice(index)}`;
        }

        const groupTags = /<\/?g\b[^>]*>/gi;
        groupTags.lastIndex = opening.index + opening[0].length;
        let depth = 1;
        let tag = null;
        while ((tag = groupTags.exec(source))) {
            if (/^<g\b/i.test(tag[0])) depth += 1;
            else depth -= 1;
            if (depth === 0) {
                return `${source.slice(0, tag.index)}${markup}${source.slice(tag.index)}`;
            }
        }
        return source;
    }

    function renderBackThreeQuarterFaceReveal(asset, config = {}, faceState = {}) {
        if (!isBackThreeQuarterPremiumView(asset?.view)) return '';
        const state = getFaceState(config, faceState);
        const identity = readIdentity(config);
        const styling = readStyling(config);
        const side = getPremiumViewSide(asset.view) || 'right';
        const headwear = normalizeId(styling.headwear || config.headwear, 'none');
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const facialHair = normalizeId(identity.facialHair || config.facialHair, 'none');
        const isNiqab = headwear === 'niqab';
        const talkingProfile = styling.rearTalkingProfile === 'experimental'
            && styling.threeQuarterArtwork === 'experimental-drawn';
        const hasGlasses = hasAccessory(config, 'glasses');
        const legacyTurn = clamp(state.headTurn, FACE_PROPERTIES.headTurn.min, FACE_PROPERTIES.headTurn.max);
        const explicitReveal = clamp(
            state.rearFaceReveal,
            FACE_PROPERTIES.rearFaceReveal.min,
            FACE_PROPERTIES.rearFaceReveal.max
        );
        // `headTurn` remains a read-only compatibility fallback for projects
        // recorded before rear-face visibility had its own animation channel.
        const revealAmount = talkingProfile ? 1 : Math.max(explicitReveal, Math.max(0, legacyTurn));
        const revealProgress = clamp((revealAmount - 0.16) / 0.44, 0, 1);
        const revealOpacity = revealProgress * revealProgress * (3 - 2 * revealProgress);
        const revealScale = clamp(0.58 + revealAmount * 0.28, 0.58, 0.86);
        const eyeOpen = Math.max(0.14, 1 - state.blink * 0.82);
        const gazeDirection = side === 'left' ? -1 : 1;
        const pupilX = clamp(81.2 + state.gazeX * 0.12 * gazeDirection, 78.7, 83.6);
        const pupilY = clamp(66.4 + state.gazeY * 0.12, 64.8, 68.0);
        const mouthWide = clamp(state.mouthWide, -1, 1);
        const mouthRound = clamp(state.mouthRound, 0, 1);
        const lipPress = clamp(state.lipPress, 0, 1);
        const jawOpen = clamp(state.jawOpen, 0, 1);
        const mouthOpeningGain = clamp(state.mouthOpeningGain ?? 1, 0.75, 3.2);
        const upperLipLift = clamp(state.upperLipLift, -1, 1);
        const lowerLipDrop = clamp(state.lowerLipDrop, -1, 1);
        const speechMouthOpen = clamp(state.mouthOpen + jawOpen * 0.42 - lipPress * 0.22, 0, 1);
        const mouthScaleX = clamp(1 + state.smile * 0.08 + mouthWide * 0.18 - mouthRound * 0.26, 0.62, 1.28);
        const mouthScaleY = clamp(1 + speechMouthOpen * 0.1 * mouthOpeningGain + mouthRound * 0.05 - lipPress * 0.08, 0.9, 1.45);
        const mouthShiftY = clamp(-state.smile * 0.55, -0.55, 0.55);
        const upperLipTravel = (speechMouthOpen * 0.3 + upperLipLift * 0.58 - lipPress * 0.07) * mouthOpeningGain;
        const lowerLipTravel = (speechMouthOpen * 0.72 + jawOpen * 0.38 + lowerLipDrop * 0.52 - lipPress * 0.09) * mouthOpeningGain;
        const openVisibility = clamp((speechMouthOpen - 0.025) * 4.4, 0, 1);
        const cavityOpacity = clamp((speechMouthOpen - 0.015) * 1.18, 0, 0.98) * (1 - lipPress * 0.72);
        const teethCue = Math.max(0, mouthWide) * 0.45 + Math.max(0, upperLipLift) * 2
            + lipPress * 0.9 * openVisibility;
        const teethOpacity = clamp(teethCue * (0.32 + openVisibility * 0.68) * (1 - jawOpen * 0.72) * (1 - mouthRound * 0.85), 0, 0.9);
        const tongueOpacity = clamp((speechMouthOpen - 0.1) * 1.65 * Math.pow(Math.max(0, 1 - jawOpen * 0.92), 1.4)
            * (1 - Math.abs(mouthWide) * 0.72) * (1 - mouthRound * 0.88)
            * (1 - Math.max(0, lowerLipDrop) * 0.58), 0, 0.36);
        const frameColor = headwear === 'none' ? 'var(--hair)' : 'var(--headwear)';
        const mirror = side === 'left' && !talkingProfile ? 'translate(98 0) scale(-1 1)' : '';
        const profileContour = 'M60 52 C72 49 82 50 84 56 C85 62 84 67 87 71 C90 74 90 77 87 79 C87 86 86 93 80 98 C73 104 62 108 50 110 L45 99 C54 89 61 80 64 70 C64 62 59 56 60 52 Z';
        const lowerFace = isNiqab ? `
            <path id="back-3q-niqab-plane" data-svg-african-role="headwear niqab lower-face-cover mouth-cover" d="M72 71 C78 69 84 71 88 75 C88 87 83 97 77 102 C73 95 71 83 72 71 Z" fill="var(--headwear)"/>
            <path id="back-3q-niqab-rim" d="M73 72 C78 74 84 74 87 72" fill="none" stroke="var(--headwear-shade)" stroke-width="1.3" opacity=".58" stroke-linecap="round"/>`
            : `
            <path id="back-3q-cheek-highlight" d="M76 72 C81 75 84 82 83 91" fill="none" stroke="var(--skin-light)" stroke-width="1.15" opacity=".22" stroke-linecap="round"/>
            <path id="back-3q-nose" data-svg-african-role="nose rear-three-quarter-nose" d="M84 67 C84.6 70.5 88 72.5 88.7 75 C88 76.8 86.4 77.5 84.5 76.7" fill="none" stroke="var(--skin-shade)" stroke-width="1.35" opacity=".72" stroke-linecap="round" stroke-linejoin="round"/>
            <g id="back-3q-mouth" data-svg-african-role="mouth rear-three-quarter-mouth" transform="translate(83 87) scale(${mouthScaleX.toFixed(4)} ${mouthScaleY.toFixed(4)}) translate(-83 -87) translate(0 ${mouthShiftY.toFixed(2)})">
                <path id="back-3q-mouth-opening" data-svg-african-role="mouth-opening oral-cavity" d="M79.1 87 C81.3 ${(86.5 - upperLipTravel).toFixed(2)} 84.5 ${(86.7 - upperLipTravel).toFixed(2)} 86.6 87.2 C85.3 ${(88.1 + lowerLipTravel).toFixed(2)} 80.4 ${(88.2 + lowerLipTravel).toFixed(2)} 79.1 87 Z" fill="#351014" opacity="${cavityOpacity.toFixed(2)}"/>
                <path id="back-3q-mouth-teeth" data-svg-african-role="mouth-teeth teeth" d="M79.7 87 C81.8 ${(86.7 - upperLipTravel * 0.55).toFixed(2)} 84.4 ${(86.9 - upperLipTravel * 0.55).toFixed(2)} 86 87.3 C83.8 87.9 81.5 87.8 79.7 87 Z" fill="#fffaf2" opacity="${teethOpacity.toFixed(2)}"/>
                <ellipse id="back-3q-mouth-tongue" data-svg-african-role="mouth-tongue tongue" cx="83" cy="${(88.2 + lowerLipTravel).toFixed(2)}" rx="2.1" ry=".55" fill="#c96f72" opacity="${tongueOpacity.toFixed(2)}"/>
                <path id="back-3q-mouth-upper" data-svg-african-role="mouth-upper rear-three-quarter-mouth" d="M78.5 86.5 C81 ${(85.5 - upperLipTravel).toFixed(2)} 84.4 ${(85.7 - upperLipTravel).toFixed(2)} 87 86.8" fill="none" stroke="#8e3d43" stroke-width="1.3" stroke-linecap="round"/>
                <path id="back-3q-mouth-lower" data-svg-african-role="mouth-lower rear-three-quarter-mouth" d="M79.2 87.8 C81.6 ${(89.1 + lowerLipTravel).toFixed(2)} 84.1 ${(89.1 + lowerLipTravel).toFixed(2)} 86.2 87.8" fill="none" stroke="#d96d73" stroke-width="1.15" stroke-linecap="round"/>
            </g>
            ${presentation === 'male' && facialHair !== 'none' ? `<path id="back-3q-facial-hair" data-svg-african-role="facial-hair ${facialHair}" d="M76 91 C78.5 99 84 102 87 93 C85 101 80 105 76 99 Z" fill="var(--hair)" opacity="${facialHair === 'short-beard' ? '.20' : '.48'}"/>` : ''}`;

        return `
        <g id="back-3q-face-side" data-svg-african-role="rear-three-quarter-face-side ${side}" data-svg-african-facing="${side}" transform="${mirror}${talkingProfile ? ' translate(12 0)' : ''}" data-svg-african-talking-profile="${talkingProfile ? 'experimental' : 'hidden'}">
            ${talkingProfile ? `<defs><clipPath id="rear-profile-contour"><path d="${profileContour}"/></clipPath></defs>` : ''}
            <g id="back-3q-face-reveal" data-svg-african-role="face-base back-3q-face-reveal rear-three-quarter-face" data-svg-african-face-reveal="true" data-svg-african-idle-hidden="${talkingProfile ? 'false' : 'true'}" data-svg-african-face-anchor="88" data-svg-african-head-turn="${legacyTurn.toFixed(3)}" data-svg-african-rear-face-reveal="${revealAmount.toFixed(3)}" opacity="${revealOpacity.toFixed(3)}" visibility="${revealOpacity > 0.001 ? 'visible' : 'hidden'}" pointer-events="none" transform="translate(88 0) scale(${revealScale.toFixed(4)} 1) translate(-88 0)">
                <g${talkingProfile ? ' clip-path="url(#rear-profile-contour)"' : ''}>
                <path id="back-3q-face-plane" d="${talkingProfile ? profileContour : 'M72 52 C76 49 82 50 84 56 C85 62 84 67 87 71 C90 74 90 77 87 79 C87 88 83 98 77 102 C73 95 71 84 72 72 C71 63 71 56 72 52 Z'}" fill="${isNiqab ? 'var(--headwear)' : 'var(--skin)'}"/>
                ${isNiqab ? '<path id="back-3q-niqab-eye-window" data-svg-african-role="niqab-eye-window eyes-visible upper-nose-visible" d="M74.5 61 C78.5 58.8 84 60 87 64.5 C84.5 70 78.8 70.8 74.5 68 Z" fill="var(--skin)"/>' : '<path id="back-3q-temple-light" d="M74 55 C77.5 51.8 82.5 54 83.7 59" fill="none" stroke="var(--skin-light)" stroke-width="1.1" opacity=".22" stroke-linecap="round"/>'}
                <g id="back-3q-eye" data-svg-african-role="eye-side rear-three-quarter-eye" transform="translate(0 66.4) scale(1 ${eyeOpen.toFixed(4)}) translate(0 -66.4)">
                    <path d="M75.5 66.4 C78 63.5 83 63.7 85.8 66.4 C83.1 69 78.2 69 75.5 66.4 Z" fill="#ffffff"/>
                    <circle id="back-3q-iris" cx="${pupilX.toFixed(2)}" cy="${pupilY.toFixed(2)}" r="2.15" fill="#5f3d2a"/>
                    <circle id="back-3q-pupil" data-svg-african-role="pupil-side rear-three-quarter-pupil" cx="${pupilX.toFixed(2)}" cy="${pupilY.toFixed(2)}" r="1.08" fill="var(--ink)"/>
                    <circle id="back-3q-eye-highlight" cx="${(pupilX + 0.45).toFixed(2)}" cy="${(pupilY - 0.55).toFixed(2)}" r=".42" fill="#ffffff" opacity=".82"/>
                </g>
                <path id="back-3q-brow" data-svg-african-role="brow-side rear-three-quarter-brow" d="M75 60.5 C78.5 58.4 82.8 58.6 85.6 60.8" fill="none" stroke="var(--ink)" stroke-width="2.1" stroke-linecap="round" transform="translate(0 ${(-state.browRaise).toFixed(2)})"/>
                ${lowerFace}
                ${hasGlasses ? '<path id="back-3q-glasses" data-svg-african-role="glasses accessory" d="M74.5 63 C77 60.8 83.6 61 86.7 64 L86.5 69 C83.4 71.5 77 71.5 74.5 69 Z M74.5 64.8 L71.5 63.2" fill="none" stroke="var(--glass)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' : ''}
                <path id="back-3q-face-frame" d="M72 52 C75.5 48.8 81 49 84 53.5" fill="none" stroke="${frameColor}" stroke-width="2.8" stroke-linecap="round"/>
                </g>
            </g>
        </g>`;
    }

    function injectBackThreeQuarterFaceReveal(svg, asset, config, faceState) {
        if (!isBackThreeQuarterPremiumView(asset?.view)) return svg;
        const styling = readStyling(config);
        const behindHead = styling.rearTalkingProfile === 'experimental'
            && styling.threeQuarterArtwork === 'experimental-drawn';
        return insertIntoHeadMotionGroup(svg, renderBackThreeQuarterFaceReveal(asset, config, faceState), behindHead);
    }

    function getCalibrationSnapshot(assetId = DEFAULT_ASSET_ID, adjustments = {}) {
        const asset = get(assetId);
        if (!asset) return null;
        const adjusted = getAdjustments(normalizePremiumConfig(asset, { premiumAdjustments: adjustments }));
        const parts = {};
        (asset.roles || PART_KEYS).forEach(partKey => {
            const profile = getPartProfile(asset.id, partKey, adjusted);
            if (profile) parts[partKey] = profile;
        });
        return {
            kind: 'svg-african-premium-calibration',
            version: asset.calibrationVersion || 1,
            assetId: asset.id,
            assetProfile: asset.assetProfile || FRONT_PREMIUM_ASSET_PROFILE,
            sourcePath: asset.sourcePath || DEFAULT_SOURCE_PATH,
            masterFile: asset.masterFile || 'master.svg',
            partFiles: { ...(asset.partFiles || getPremiumPartFileMapForAsset(asset)) },
            view: asset.view,
            reference: cloneDeep(asset.reference),
            adjustments: cloneDeep(adjusted),
            order: [...(asset.order || [])],
            parts,
            joints: cloneDeep(asset.joints),
            pins: cloneDeep(asset.pins),
            authoring: cloneDeep(getAssetAuthoring(asset))
        };
    }

    function getFacialLayerRoles(assetId = DEFAULT_ASSET_ID) {
        const asset = get(assetId);
        return [...(asset?.facialLayers || getPremiumFacialLayersForAsset(asset))];
    }

    function getFacialRigSchema(assetId = DEFAULT_ASSET_ID) {
        const asset = get(assetId);
        if (!asset) return null;
        const isSide = isSidePremiumView(asset.view);
        const isBack = isBackPremiumView(asset.view);
        const isBackThreeQuarter = isBackThreeQuarterPremiumView(asset.view);
        const isThreeQuarter = isThreeQuarterPremiumView(asset.view);
        const backBindings = {
            headNod: ['head-motion'],
            headTilt: ['head-motion']
        };
        const layerBindings = isBackThreeQuarter
            ? BACK_3Q_FACE_LAYER_BINDINGS
            : (isBack
                ? backBindings
                : (isSide
                    ? SIDE_FACE_LAYER_BINDINGS
                    : (isThreeQuarter ? FRONT_3Q_FACE_LAYER_BINDINGS : FACE_RIG_SCHEMA.layerBindings)));
        return {
            ...cloneDeep(FACE_RIG_SCHEMA),
            assetId: asset.id,
            assetProfile: asset.assetProfile || FRONT_PREMIUM_ASSET_PROFILE,
            stateProperties: Object.keys(layerBindings),
            layerBindings: cloneDeep(layerBindings),
            supportsFacialFeatures: !isBack || isBackThreeQuarter,
            availableLayers: [...(asset.facialLayers || getPremiumFacialLayersForAsset(asset))]
        };
    }

    function setSvgRootAttributes(svg = '', attributes = {}) {
        const source = String(svg || '');
        return source.replace(/<svg\b[^>]*>/i, rootTag => {
            let nextTag = rootTag;
            const serialized = [];
            Object.entries(attributes).forEach(([name, value]) => {
                const escapedName = String(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                nextTag = nextTag.replace(
                    new RegExp(`\\s${escapedName}\\s*=\\s*(?:"[^"]*"|'[^']*')`, 'gi'),
                    ''
                );
                const escapedValue = String(value ?? '')
                    .replace(/&/g, '&amp;')
                    .replace(/"/g, '&quot;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                serialized.push(`${name}="${escapedValue}"`);
            });
            const close = nextTag.endsWith('/>') ? '/>' : '>';
            return `${nextTag.slice(0, -close.length)} ${serialized.join(' ')}${close}`;
        });
    }

    function renderPartSvg(assetId, partKey, config = {}, instanceId = '', options = {}) {
        const asset = get(assetId);
        const renderers = isSidePremiumView(asset?.view) ? SIDE_RENDERERS : (isBackPremiumView(asset?.view) ? BACK_RENDERERS : RENDERERS);
        if (!asset || !asset.parts?.[partKey] || !renderers[partKey]) return '';
        const renderConfig = normalizePremiumConfig(asset, globalThis.PhotoCharacterRig?.prepareConfig(config, asset.view) || config);
        if (renderConfig._realisticCharacter && globalThis.RealisticCharacter && (renderConfig._realisticCharacter.mode !== 'hybrid' || partKey === 'head-neck')) {
            const raw = globalThis.RealisticCharacter.render(renderConfig, partKey, asset.view);
            const root = new DOMParser().parseFromString(raw, 'image/svg+xml').documentElement;
            root.setAttribute('data-svg-african-view', asset.view);
            root.setAttribute('data-svg-african-artwork-source', 'realistic-textured');
            globalThis.SvgAfricanFaceRuntime?.applyState(root, getFaceState(renderConfig, options.faceState));
            const marked = new XMLSerializer().serializeToString(root);
            const utils = globalThis.SvgCharacterUtils;
            const svg = utils?.namespaceSvg ? utils.namespaceSvg(marked, `${instanceId || 'realistic'}-${partKey}`) : marked;
            utils?.assertSafeGeneratedSvg?.(svg);
            return svg;
        }
        const palette = getPalette(renderConfig);
        const renderOptions = {
            ...options,
            faceState: getFaceState(renderConfig, options.faceState),
            adjustments: resolveRenderAdjustments(renderConfig, options.adjustments)
        };
        const photoHair = config._photoCharacter?.vector || config._photoCharacter?.appearance;
        if (photoHair && asset.view !== 'front' && (!config._photoCharacter.vector || photoHair.viewMode === 'catalog')) {
            renderOptions.adjustments = { ...renderOptions.adjustments, hairVolume: clamp(photoHair.hairVolume - 1, -.35, .42) };
        }
        const authoredContext = getAuthoredRenderContext(asset, renderConfig, renderOptions);
        const threeQuarterRenderer = globalThis.SvgAfricanThreeQuarterRenderer;
        const usesAuthoredThreeQuarter = isThreeQuarterPremiumView(asset.view)
            && getThreeQuarterArtworkMode(renderConfig, asset) === 'experimental-drawn'
            && typeof threeQuarterRenderer?.renderPartSvg === 'function';
        const authoredRegistry = globalThis.SvgAfricanAuthoredArtwork;
        const authoredSourceAssetId = authoredContext.asset?.id || asset.id;
        const authoredSignature = buildArtworkRenderSignature(
            authoredContext.asset,
            authoredContext.config,
            authoredContext.options
        );
        const authoredPack = authoredRegistry?.getPackInfo?.(authoredSourceAssetId);
        let authoredRaw = !usesAuthoredThreeQuarter && options.artworkSource !== 'procedural-renderer'
            ? authoredRegistry?.getCompatiblePartSvg?.(authoredSourceAssetId, partKey, authoredSignature)
            : '';
        if (authoredRaw && authoredPack?.compatibility === 'authored-controls-v1') {
            const authoredControls = globalThis.SvgAfricanAuthoredControls;
            if (authoredControls?.version === 'authored-controls-v1' && typeof authoredControls.apply === 'function') {
                authoredRaw = authoredControls.apply(authoredRaw, partKey, {
                    adjustments: authoredContext.options.adjustments,
                    faceState: authoredContext.options.faceState,
                    palette,
                    identity: authoredContext.config.identity,
                    styling: authoredContext.config.styling,
                    baseline: authoredRegistry.getControlBaseline?.(authoredSourceAssetId)
                });
            } else {
                authoredRaw = '';
            }
        }
        let drawnThreeQuarterRaw = '';
        if (usesAuthoredThreeQuarter) {
            try {
                drawnThreeQuarterRaw = threeQuarterRenderer.renderPartSvg(asset, partKey, renderConfig, palette, renderOptions) || '';
            } catch (error) {
                console.warn(`[SVG African] Drawn 3/4 ${partKey} failed; using the stable projected renderer.`, error);
            }
        }
        const artworkSource = authoredRaw
            ? 'authored-svg-files'
            : (drawnThreeQuarterRaw ? 'experimental-drawn-three-quarter' : 'procedural-renderer');
        const baseRaw = authoredRaw
            || drawnThreeQuarterRaw
            || renderers[partKey](renderConfig, palette, renderOptions);
        const handRaw = globalThis.RealisticCharacter?.applyHybridHands(baseRaw, partKey, renderConfig, asset.view) || baseRaw;
        const raw = globalThis.PhotoCharacterRig?.applyArtwork(handRaw, partKey, renderConfig, asset.view) || handRaw;
        const rendered = partKey === 'head-neck'
            ? injectBackThreeQuarterFaceReveal(raw, asset, renderConfig, renderOptions.faceState)
            : raw;
        const sourceView = isBackPremiumView(asset.view)
            ? 'back'
            : (isSidePremiumView(asset.view) ? 'side' : 'front');
        const projectionMode = isThreeQuarterPremiumView(asset.view)
            ? (drawnThreeQuarterRaw ? 'authored-3q' : 'profile-tilt-3q')
            : 'authored-view';
        const faceStateMetadata = encodeURIComponent(JSON.stringify(renderOptions.faceState));
        let marked = setSvgRootAttributes(rendered, {
            'data-svg-african-artwork-source': raw !== baseRaw ? 'hybrid-photo' : artworkSource,
            'data-svg-african-authored-source-asset': authoredRaw ? authoredSourceAssetId : asset.id,
            'data-svg-african-projection': projectionMode,
            'data-svg-african-view': asset.view,
            'data-svg-african-source-view': sourceView,
            'data-svg-african-face-state': faceStateMetadata
        });
        if (isThreeQuarterPremiumView(asset.view) && !marked.includes('data-svg-african-role="three-quarter-premium')) {
            marked = marked.replace(/<svg\b/, `<svg data-svg-african-role="three-quarter-premium ${asset.view}"`);
        }
        if (renderConfig._photoCharacter && marked.includes('data-photo-face="v1"') && globalThis.SvgAfricanFaceRuntime) {
            const photoRoot = new DOMParser().parseFromString(marked, 'image/svg+xml').documentElement;
            globalThis.SvgAfricanFaceRuntime.applyState(photoRoot, renderOptions.faceState);
            marked = new XMLSerializer().serializeToString(photoRoot);
        }
        marked = globalThis.SvgAfricanJewelry?.apply(marked, partKey, renderConfig, { view: asset.view, adjustments: renderOptions.adjustments }) || marked;
        const matchedSideHead = isSidePremiumView(asset.view) && config.styling?.headArtwork === 'matched';
        if (partKey === 'head-neck' && isSidePremiumView(asset.view) && config._independentHeadTurn && !config._headTurnFullRange && !matchedSideHead && !config._photoCharacter && !config._realisticCharacter) {
            const root = new DOMParser().parseFromString(marked, 'image/svg+xml').documentElement;
            const face = root.querySelector('#side-face'), eye = root.querySelector('#side-iris');
            if (face && eye) {
                const group = (name, ids) => {
                    const nodes = ids.map(id => root.querySelector(`[id="${id}"]`)).filter(Boolean);
                    const wrapper = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'g');
                    wrapper.setAttribute('data-side-turn-part', name);
                    nodes[0].parentNode.insertBefore(wrapper, nodes[0]);
                    nodes.forEach(node => wrapper.appendChild(node));
                    return wrapper;
                };
                const eyes = group('near-eye', ['side-brow', 'side-eye', 'side-upper-eyelid', 'side-iris', 'side-pupil', 'side-eye-highlight', 'side-glasses-lens']);
                const far = eyes.cloneNode(true);
                far.setAttribute('data-side-turn-part', 'far-eye');
                for (const element of far.querySelectorAll('[id]')) { element.setAttribute('data-side-turn-source', element.id); element.removeAttribute('id'); }
                const clip = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg', 'clipPath');
                clip.id = 'side-head-turn-face-clip';clip.setAttribute('data-side-turn-clip','true');clip.setAttribute('clipPathUnits','userSpaceOnUse');
                const outline = face.cloneNode(false);outline.removeAttribute('id');clip.appendChild(outline);root.appendChild(clip);
                const farClip = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g');
                farClip.setAttribute('clip-path','url(#side-head-turn-face-clip)');farClip.appendChild(far);
                eyes.parentNode.insertBefore(farClip, eyes);
                group('mouth', ['side-mouth-fill','side-mouth-teeth','side-mouth-tongue','side-mouth-upper','side-mouth-lower','side-philtrum','side-chin-crease']);
                const nose = group('nose', ['side-nose-underplane','side-nose-ala','side-nostril','side-brow-plane']);
                const contour = face.getAttribute('d').match(/[MC][^MCZ]*/gi);
                if (contour?.length > 6) {
                    const start = contour[3].match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g).slice(-2);
                    const line = root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','path');
                    line.setAttribute('data-side-turn-nose-bridge','true');
                    line.setAttribute('d',`M${start.join(' ')} ${contour.slice(4,7).join(' ')}`);
                    line.setAttribute('fill','none');line.setAttribute('stroke','var(--skin-shade)');line.setAttribute('stroke-width','.7');
                    nose.appendChild(line);
                }
                root.setAttribute('data-side-head-turn', 'true');
                root.setAttribute('data-side-turn-eye-x', eye.getAttribute('cx'));
                root.setAttribute('data-side-turn-eye-y', eye.getAttribute('cy'));
                root.setAttribute('data-side-turn-outline-x', face.getAttribute('data-svg-african-profile-forehead-x'));
                globalThis.SvgAfricanFaceRuntime?.applyState(root, renderOptions.faceState);
                marked = new XMLSerializer().serializeToString(root);
            }
        }
        const independentThreeQuarter = /^(front|back)-3q-(left|right)$/.test(asset.view) && getThreeQuarterArtworkMode(config, asset) === 'experimental-drawn';
        const rearThreeQuarter = independentThreeQuarter && asset.view.startsWith('back-3q');
        const fullRange = matchedSideHead || (!!config._headTurnFullRange && (asset.view === 'front' || isSidePremiumView(asset.view)));
        if (partKey === 'head-neck' && (['front', 'back'].includes(asset.view) || independentThreeQuarter || fullRange) && (config._independentHeadTurn || config.styling?.headArtwork === 'matched') && !config._photoCharacter && !config._realisticCharacter) {
            const parser = new DOMParser(), front = parser.parseFromString(marked, 'image/svg+xml').documentElement;
            const box = front.getAttribute('viewBox').split(/[ ,]+/).map(Number), w = box[2], h = box[3];
            const socket = (root, width, height, profile) => {
                const x = Number(root.getAttribute('data-svg-african-neck-socket-x') ?? root.querySelector('[data-svg-african-neck-socket-x]')?.getAttribute('data-svg-african-neck-socket-x'));
                const y = Number(root.getAttribute('data-svg-african-neck-base-y') ?? root.querySelector('[data-svg-african-neck-base-y]')?.getAttribute('data-svg-african-neck-base-y'));
                return { x: x > 0 ? x : width * (profile?.pivotX ?? .5), y: y > 0 ? y : height * (profile?.pivotY ?? .86) };
            };
            const targetSocket = socket(front, w, h, asset.parts['head-neck']);
            const shell = parser.parseFromString(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" data-independent-head-turn="true" data-head-turn-base="${asset.view}" data-svg-african-view="${asset.view}"/>`, 'image/svg+xml').documentElement;
            const matched = fullRange || rearThreeQuarter || config.styling?.headArtwork === 'matched' || config._headTurnConstruction === 'matched';
            if(fullRange)shell.setAttribute('data-head-turn-full-range','true');
            let shared = null;
            if (matched) {
                const neutralFace = Object.fromEntries(Object.entries(FACE_PROPERTIES).map(([key, spec]) => [key, spec.defaultValue]));
                const sharedView = asset.view.startsWith('back') ? 'back-3q-right' : 'front-3q-right';
                const angles = fullRange ? [-3,-2,-1,0,1,2,3] : [-2,-1,0,1,2], middle=(angles.length-1)/2;
                const frames = angles.map(yaw => {
                    let artwork = globalThis.SvgAfricanThreeQuarterRenderer.renderPartSvg(
                        { ...asset, view: sharedView }, partKey, renderConfig, palette,
                        { ...renderOptions, faceState: neutralFace, sharedHeadYaw: yaw, fullHeadRange:fullRange });
                    artwork = globalThis.SvgAfricanJewelry?.apply(artwork, partKey, renderConfig, { view: sharedView, adjustments: renderOptions.adjustments }) || artwork;
                    return parser.parseFromString(artwork, 'image/svg+xml').documentElement;
                });
                const elements = frames.map(frame => [frame, ...frame.querySelectorAll('*')]);
                const geometry = ['d', 'cx', 'cy', 'rx', 'ry', 'r', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'width', 'height', 'transform', 'opacity'];
                const numeric = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:[eE][-+]?\d+)?/g;
                elements[middle].forEach((element, index) => {
                    if (index === 0) return;
                    const attributes = {};
                    for (const name of geometry) {
                        const values = elements.map(nodes => nodes[index]?.getAttribute(name));
                        if (values.every(value => value !== null && value !== undefined) && values.every(value => value.replace(numeric, '#') === values[middle].replace(numeric, '#'))) attributes[name] = values;
                    }
                    if (Object.keys(attributes).length) element.setAttribute('data-head-turn-geometry', JSON.stringify(attributes));
                });
                frames[middle].setAttribute('data-svg-african-face-state', encodeURIComponent(JSON.stringify(neutralFace)));
                shared = new XMLSerializer().serializeToString(frames[middle]);
                shell.setAttribute('data-head-turn-construction', 'matched');
            }
            for (const side of matched ? [asset.view] : independentThreeQuarter ? [asset.view, 'viewer'] : [asset.view, 'left', 'right']) {
                const variantId = independentThreeQuarter ? getViewVariantAssetId(stripDrawnThreeQuarterRuntimeSuffix(asset.id), 'front') : getThreeQuarterRuntimeAssetId(asset.id.replace(/-(front|back)$/, `-${asset.view}-3q-${side}`), 'experimental-drawn');
                const variant = shared ? (globalThis.SvgCharacterUtils?.namespaceSvg(shared, `${instanceId}-shared-${side}`) || shared) : side === asset.view ? marked : renderPartSvg(variantId, partKey,
                    { ...config, _independentHeadTurn: false, styling: { ...config.styling, headArtwork: 'original', rearTalkingProfile: asset.view === 'back' ? 'off' : config.styling?.rearTalkingProfile, threeQuarterArtwork: 'experimental-drawn' } }, `${instanceId}-head-${side}`,
                    { ...options, faceState: asset.view === 'back' ? { ...renderOptions.faceState, headTurn: 0, rearFaceReveal: 0 } : renderOptions.faceState });
                if (!variant) continue;
                const node = parser.parseFromString(variant, 'image/svg+xml').documentElement;
                const variantBox = node.getAttribute('viewBox').split(/[ ,]+/).map(Number);
                const scale = Math.min(w / variantBox[2], h / variantBox[3]);
                const sourceSocket = socket(node, variantBox[2], variantBox[3], get(variantId)?.parts?.['head-neck']);
                node.setAttribute('data-head-turn-view', side); node.setAttribute('width', variantBox[2] * scale); node.setAttribute('height', variantBox[3] * scale);
                node.setAttribute('x', side === asset.view && !matched ? 0 : targetSocket.x - sourceSocket.x * scale);
                node.setAttribute('y', side === asset.view && !matched ? 0 : targetSocket.y - sourceSocket.y * scale);
                node.setAttribute('preserveAspectRatio', 'xMidYMid meet'); node.setAttribute('overflow', 'visible');
                shell.appendChild(shell.ownerDocument.importNode(node, true));
            }
            globalThis.SvgAfricanFaceRuntime?.applyState(shell, renderOptions.faceState);
            marked = new XMLSerializer().serializeToString(shell);
        }
        const SvgUtils = globalThis.SvgCharacterUtils;
        const namespace = `${instanceId || 'svgaf-premium'}-${asset.id}-${partKey}`.replace(/[^a-zA-Z0-9_-]+/g, '-');
        const svg = SvgUtils?.namespaceSvg ? SvgUtils.namespaceSvg(marked, namespace) : marked;
        SvgUtils?.assertSafeGeneratedSvg?.(svg);
        return svg;
    }

    function renderPartDataUrl(assetId, partKey, config = {}, instanceId = '', options = {}) {
        const svg = renderPartSvg(assetId, partKey, config, instanceId, options);
        const SvgUtils = globalThis.SvgCharacterUtils;
        return SvgUtils?.svgToDataUrl ? SvgUtils.svgToDataUrl(svg) : `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    }

    const api = Object.freeze({
        defaultAssetId: DEFAULT_ASSET_ID,
        roles: PART_KEYS,
        faceProperties: FACE_PROPERTIES,
        faceAnimations: FACE_ANIMATIONS,
        facePresets: FACE_PRESETS,
        adjustProperties: ADJUST_PROPERTIES,
        premiumAssetContract: PREMIUM_ASSET_CONTRACT,
        list,
        get,
        resolveAssetForConfig,
        getViewVariantAssetId,
        listViewOptions,
        normalizePremiumView,
        listFacePresets,
        getFaceAnimationFrameMap,
        getFacePreset,
        getFacePresetState,
        getDefaultFaceState,
        getDefaultAdjustments,
        getFaceState,
        getThreeQuarterGazeBaseline,
        getAdjustments,
        resolveAdjustments: resolveRenderAdjustments,
        getPalette,
        getAssetRenderDefaults,
        getArtworkRenderSignature,
        normalizePremiumConfig,
        getAssetManifest,
        getArtworkSourceMetadata,
        getArtworkRenderStatus,
        getCalibrationSnapshot,
        getFacialLayerRoles,
        getFacialRigSchema,
        resolveTopClothing,
        renderOccupationGarment,
        resolveBottomClothing,
        resolveSkirtLength,
        resolveSleeveLength,
        resolveNeckTieType,
        resolveNeckTieDesign,
        resolveEffectiveFabricDesign,
        isSkirtLikeBottom,
        getSkirtLegCoverage,
        compileSideHeadLandmarks,
        getFacialStyleProfile,
        compileSideTorsoLandmarks,
        headTypeProfiles: HEAD_TYPE_VISUAL_PROFILES,
        sideFaceShapeProfiles: SIDE_FACE_SHAPE_PROFILES,
        threeQuarterProjectionMode: DEFAULT_THREE_QUARTER_ARTWORK === 'experimental-drawn' ? 'authored-3q' : 'profile-tilt-3q',
        experimentalAuthoredThreeQuarter: DEFAULT_THREE_QUARTER_ARTWORK === 'experimental-drawn',
        threeQuarterArtworkModes: Object.freeze(['projected', 'experimental-drawn']),
        normalizeThreeQuarterArtworkMode,
        getThreeQuarterArtworkMode,
        getThreeQuarterRuntimeAssetId,
        validatePremiumAsset,
        validatePremiumCatalog,
        getPartProfile,
        getDefaultAssetId: () => DEFAULT_ASSET_ID,
        sideRoles: SIDE_PART_KEYS,
        isContinuousGarmentBottom,
        isContinuousLowerGarmentBottom,
        isContinuousLongGarmentBottom,
        renderContinuousGarmentSpecs,
        renderContinuousGarmentSpec,
        renderContinuousOuterGarmentSpec,
        renderContinuousLowerGarmentSpec,
        renderPartSvg,
        renderPartDataUrl
    });

    if (typeof window !== 'undefined') window.SvgAfricanPremiumAssets = api;
    if (typeof globalThis !== 'undefined' && !globalThis.SvgAfricanPremiumAssets) {
        globalThis.SvgAfricanPremiumAssets = api;
    }
})();
