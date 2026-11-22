/**
 * Joint System — Armature detection, promotion, catalogs & posing
 * (split from joint-system.js for maintainability)
 */

JointSystem._armatureDefinitionsRebasedToDown = false;
JointSystem._rebaseArmatureJointAngleMapToDownBaseline = function(jointAngles) {
        if (!jointAngles || typeof jointAngles !== 'object') return;
        Object.keys(jointAngles).forEach(jointName => {
            if (!/shoulder/.test(String(jointName || '').toLowerCase())) return;
            const current = jointAngles[jointName];
            if (!Number.isFinite(current)) return;
            jointAngles[jointName] = current - 80;
        });
    }

JointSystem._ensureArmatureDefinitionsUseDownBaseline = function() {
        if (JointSystem._armatureDefinitionsRebasedToDown) return;
        if (!JointSystem.ARMATURE_POSES || !JointSystem.ARMATURE_MOVEMENTS) return;

        Object.values(JointSystem.ARMATURE_POSES || {}).forEach(pose => {
            JointSystem._rebaseArmatureJointAngleMapToDownBaseline(pose?.jointAngles);
        });

        Object.values(JointSystem.ARMATURE_MOVEMENTS || {}).forEach(move => {
            (move?.keyframes || []).forEach(keyframe => {
                JointSystem._rebaseArmatureJointAngleMapToDownBaseline(keyframe?.jointAngles);
            });
        });

        JointSystem._armatureDefinitionsRebasedToDown = true;
    }

JointSystem._humanFrontArmaturePoseCatalog = null;
JointSystem._humanFrontArmatureMovementCatalog = null;
JointSystem._humanBackArmaturePoseCatalog = null;
JointSystem._humanBackArmatureMovementCatalog = null;
JointSystem._humanSideArmaturePoseCatalog = null;
JointSystem._humanSideArmatureMovementCatalog = null;
JointSystem._humanSideDualArmaturePoseCatalog = null;
JointSystem._humanSideDualArmatureMovementCatalog = null;
JointSystem._slugifyArmatureCatalogKey = function(value = '', fallback = 'pose') {
        const slug = String(value || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        return slug || fallback;
    }

JointSystem._convertHumanFrontAnglesToArmaturePoseData = function(angles = {}) {
        const jointAngles = {};
        const partAngles = {};
        const setJoint = (jointName, sourceKey, invert = false) => {
            const value = angles?.[sourceKey];
            if (!Number.isFinite(value)) return;
            jointAngles[jointName] = invert ? -value : value;
        };

        setJoint('right-shoulder', 'r-upper-arm');
        setJoint('left-shoulder', 'l-upper-arm', true);
        setJoint('right-elbow', 'r-forearm');
        setJoint('left-elbow', 'l-forearm', true);
        setJoint('right-wrist', 'r-hand');
        setJoint('left-wrist', 'l-hand', true);

        setJoint('right-hip', 'r-upper-leg');
        setJoint('left-hip', 'l-upper-leg', true);
        setJoint('right-knee', 'r-lower-leg');
        setJoint('left-knee', 'l-lower-leg', true);
        setJoint('right-ankle', 'r-foot');
        setJoint('left-ankle', 'l-foot', true);

        setJoint('neck', 'head');
        setJoint('waist', 'waist');
        setJoint('waist', 'waistJoint');

        if (Number.isFinite(angles?.torso)) {
            partAngles.torso = angles.torso;
        }

        return { jointAngles, partAngles };
    }

JointSystem._convertHumanBackAnglesToArmaturePoseData = function(angles = {}) {
        const jointAngles = {};
        const partAngles = {};
        const setJoint = (jointName, sourceKey, invert = false) => {
            const value = angles?.[sourceKey];
            if (!Number.isFinite(value)) return;
            jointAngles[jointName] = invert ? -value : value;
        };

        // Back-view pose definitions are already authored in the rig's runtime
        // left/right sign space. Preserve those signs directly so mirrored
        // pairs like hands-on-hips and wide stance keep opposite limb angles.
        setJoint('right-shoulder', 'r-upper-arm');
        setJoint('left-shoulder', 'l-upper-arm');
        setJoint('right-elbow', 'r-forearm');
        setJoint('left-elbow', 'l-forearm');
        setJoint('right-wrist', 'r-hand');
        setJoint('left-wrist', 'l-hand');

        setJoint('right-hip', 'r-upper-leg');
        setJoint('left-hip', 'l-upper-leg');
        setJoint('right-knee', 'r-lower-leg');
        setJoint('left-knee', 'l-lower-leg');
        setJoint('right-ankle', 'r-foot');
        setJoint('left-ankle', 'l-foot');

        setJoint('neck', 'head');
        setJoint('waist', 'waist');
        setJoint('waist', 'waistJoint');

        if (Number.isFinite(angles?.torso)) {
            partAngles.torso = angles.torso;
        }

        return { jointAngles, partAngles };
    }

JointSystem._convertHumanFrontTiltsToArmaturePoseData = function(tilts = {}) {
        const jointTilts = {};
        const partTilts = {};
        const setJointTilt = (jointName, sourceKey) => {
            const value = tilts?.[sourceKey];
            if (!value || typeof value !== 'object') return;
            const x = Number.isFinite(value.x) ? value.x : 0;
            const y = Number.isFinite(value.y) ? value.y : 0;
            if (!x && !y) return;
            jointTilts[jointName] = { x, y };
        };
        const setPartTilt = (partKey, sourceKey) => {
            const value = tilts?.[sourceKey];
            if (!value || typeof value !== 'object') return;
            const x = Number.isFinite(value.x) ? value.x : 0;
            const y = Number.isFinite(value.y) ? value.y : 0;
            if (!x && !y) return;
            partTilts[partKey] = { x, y };
        };

        setPartTilt('torso', 'torso');
        setPartTilt('head-neck', 'head');
        setPartTilt('head-neck', 'neck');

        setJointTilt('right-shoulder', 'r-upper-arm');
        setJointTilt('left-shoulder', 'l-upper-arm');
        setJointTilt('right-elbow', 'r-forearm');
        setJointTilt('left-elbow', 'l-forearm');
        setJointTilt('right-wrist', 'r-hand');
        setJointTilt('left-wrist', 'l-hand');
        setJointTilt('right-hip', 'r-upper-leg');
        setJointTilt('left-hip', 'l-upper-leg');
        setJointTilt('right-knee', 'r-lower-leg');
        setJointTilt('left-knee', 'l-lower-leg');
        setJointTilt('right-ankle', 'r-foot');
        setJointTilt('left-ankle', 'l-foot');

        return { jointTilts, partTilts };
    }

JointSystem._convertHumanFrontContactsToArmature = function(contacts = {}) {
        const result = {};
        const mapKey = (sourceKey) => {
            switch (sourceKey) {
                case 'r-hand':
                    return 'right-hand';
                case 'l-hand':
                    return 'left-hand';
                case 'r-foot':
                    return 'right-foot';
                case 'l-foot':
                    return 'left-foot';
                default:
                    return sourceKey;
            }
        };
        Object.entries(contacts || {}).forEach(([sourceKey, spec]) => {
            const mapped = mapKey(sourceKey);
            if (!mapped) return;
            result[mapped] = JSON.parse(JSON.stringify(spec));
        });
        return result;
    }

JointSystem._cloneArmatureCatalogEntry = function(entry) {
        return entry ? Utils.deepClone(entry) : entry;
    }

JointSystem._copyArmatureLayerOverrideFields = function(target, source) {
        if (!target || !source) return target;
        ['frontViewLayerOverride', 'backViewLayerOverride', 'layerOrderOverride'].forEach(prop => {
            if (Array.isArray(source[prop])) {
                target[prop] = Utils.deepClone(source[prop]);
            }
        });
        if (source.threeQuarterLayerOverride === true) {
            target.threeQuarterLayerOverride = true;
        }
        if (source.torsoFrontmost === true) {
            target.torsoFrontmost = true;
        }
        if (source.agbadaArmLayerMode) {
            target.agbadaArmLayerMode = source.agbadaArmLayerMode;
        }
        return target;
    }

JointSystem._normalizeArmatureMovementCatalogEntryDefaults = function(catalog) {
        if (!catalog || typeof catalog !== 'object') return catalog;
        Object.values(catalog).forEach(entry => {
            if (!entry || typeof entry !== 'object') return;
            if (entry.repeat === null) entry.repeat = Infinity;
        });
        return catalog;
    }

JointSystem._applyDefaultArmatureMovementCompatibility = function(catalog, compatibility = []) {
        if (!catalog || typeof catalog !== 'object') return catalog;
        const defaults = Array.isArray(compatibility) ? compatibility.filter(Boolean) : [];
        if (!defaults.length) return catalog;
        Object.values(catalog).forEach(entry => {
            if (!entry || typeof entry !== 'object') return;
            if (!Array.isArray(entry.viewCompatibility) || !entry.viewCompatibility.length) {
                entry.viewCompatibility = Utils.deepClone(defaults);
            }
        });
        return catalog;
    }

JointSystem._applyDefaultArmaturePoseCompatibility = function(catalog, compatibility = []) {
        return JointSystem._applyDefaultArmatureMovementCompatibility(catalog, compatibility);
    }

JointSystem.ARMATURE_ANATOMY_CONVENTIONS = Object.freeze({
        angle: 'clockwise-positive-visible-plane',
        tilt: 'depth-simulation',
        rotation: 'whole-part-or-root-orientation',
        travel: 'stage-dx-dy',
        scale: 'perspective-or-style-only',
        frontBackLocomotion: 'alternate-limb-depth-tilts',
        sideLocomotion: 'visible-plane-joint-angles',
        threeQuarterLocomotion: 'side-like-joint-swing-with-stable-y-tilt'
    });

JointSystem.UC_VIEW_PROFILES = Object.freeze({
        front: Object.freeze({
            key: 'front',
            schema: 'front',
            family: 'front',
            facing: 'front',
            lean: null,
            movementPlane: 'depth-tilt',
            forwardAxis: 'dy',
            forwardSign: 1,
            baseTiltY: 0,
            nearArm: null,
            farArm: null,
            nearLeg: null,
            farLeg: null,
            anatomicalRightStageSide: 'left',
            layerOrder: Object.freeze(['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'])
        }),
        back: Object.freeze({
            key: 'back',
            schema: 'back',
            family: 'back',
            facing: 'back',
            lean: null,
            movementPlane: 'depth-tilt',
            forwardAxis: 'dy',
            forwardSign: -1,
            baseTiltY: 0,
            nearArm: null,
            farArm: null,
            nearLeg: null,
            farLeg: null,
            anatomicalRightStageSide: 'right',
            layerOrder: Object.freeze(['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'])
        }),
        'side-left': Object.freeze({
            key: 'side-left',
            schema: 'sideDual',
            family: 'side',
            facing: 'left',
            lean: null,
            movementPlane: 'visible-plane',
            forwardAxis: 'dx',
            forwardSign: -1,
            baseTiltY: 0,
            nearArm: 'front-arm',
            farArm: 'back-arm',
            nearLeg: 'front-leg',
            farLeg: 'back-leg',
            anatomicalRightStageSide: null,
            layerOrder: Object.freeze(['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'])
        }),
        'side-right': Object.freeze({
            key: 'side-right',
            schema: 'sideDual',
            family: 'side',
            facing: 'right',
            lean: null,
            movementPlane: 'visible-plane',
            forwardAxis: 'dx',
            forwardSign: 1,
            baseTiltY: 0,
            nearArm: 'front-arm',
            farArm: 'back-arm',
            nearLeg: 'front-leg',
            farLeg: 'back-leg',
            anatomicalRightStageSide: null,
            layerOrder: Object.freeze(['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'])
        }),
        'front-3q-left': Object.freeze({
            key: 'front-3q-left',
            schema: 'front',
            family: 'front-3q',
            facing: 'front',
            lean: 'left',
            movementPlane: 'three-quarter-visible-plane',
            forwardAxis: 'dx',
            forwardSign: -1,
            baseTiltY: -45,
            nearArm: 'left-arm',
            farArm: 'right-arm',
            nearLeg: 'left-leg',
            farLeg: 'right-leg',
            anatomicalRightStageSide: 'left',
            layerOrder: Object.freeze(['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm']),
            flipsTo: 'back-3q-right'
        }),
        'front-3q-right': Object.freeze({
            key: 'front-3q-right',
            schema: 'front',
            family: 'front-3q',
            facing: 'front',
            lean: 'right',
            movementPlane: 'three-quarter-visible-plane',
            forwardAxis: 'dx',
            forwardSign: 1,
            baseTiltY: 45,
            nearArm: 'right-arm',
            farArm: 'left-arm',
            nearLeg: 'right-leg',
            farLeg: 'left-leg',
            anatomicalRightStageSide: 'left',
            layerOrder: Object.freeze(['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm']),
            flipsTo: 'back-3q-left'
        }),
        'back-3q-left': Object.freeze({
            key: 'back-3q-left',
            schema: 'back',
            family: 'back-3q',
            facing: 'back',
            lean: 'left',
            movementPlane: 'three-quarter-visible-plane',
            forwardAxis: 'dx',
            forwardSign: -1,
            baseTiltY: 45,
            nearArm: 'left-arm',
            farArm: 'right-arm',
            nearLeg: 'left-leg',
            farLeg: 'right-leg',
            anatomicalRightStageSide: 'right',
            layerOrder: Object.freeze(['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm']),
            flipsTo: 'front-3q-right'
        }),
        'back-3q-right': Object.freeze({
            key: 'back-3q-right',
            schema: 'back',
            family: 'back-3q',
            facing: 'back',
            lean: 'right',
            movementPlane: 'three-quarter-visible-plane',
            forwardAxis: 'dx',
            forwardSign: 1,
            baseTiltY: -45,
            nearArm: 'right-arm',
            farArm: 'left-arm',
            nearLeg: 'right-leg',
            farLeg: 'left-leg',
            anatomicalRightStageSide: 'right',
            layerOrder: Object.freeze(['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm']),
            flipsTo: 'front-3q-left'
        })
    });

JointSystem._normalizeArmatureViewProfileKey = function(viewName = '') {
        const normalized = String(viewName || '').trim().toLowerCase()
            .replace(/3\/4/g, '3q')
            .replace(/\bthree[-\s]*quarter\b/g, '3q')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        if (!normalized) return 'generic';
        if (normalized === 'front') return 'front';
        if (normalized === 'back') return 'back';
        if (normalized === 'side' || normalized === 'side-dual') return 'side-left';
        if (normalized === 'side-left' || normalized === 'side-dual-left' || normalized === 'left-side') return 'side-left';
        if (normalized === 'side-right' || normalized === 'side-dual-right' || normalized === 'right-side') return 'side-right';
        if (normalized === 'front3qleft' || normalized === 'front-3q-left' || normalized === '3q-front-left') return 'front-3q-left';
        if (normalized === 'front3qright' || normalized === 'front-3q-right' || normalized === '3q-front-right') return 'front-3q-right';
        if (normalized === 'back3qleft' || normalized === 'back-3q-left' || normalized === '3q-back-left') return 'back-3q-left';
        if (normalized === 'back3qright' || normalized === 'back-3q-right' || normalized === '3q-back-right') return 'back-3q-right';
        return normalized;
    };

JointSystem._getArmatureViewProfile = function(viewName = '', options = {}) {
        const rawViewName = String(viewName || '').trim().toLowerCase();
        let key = JointSystem._normalizeArmatureViewProfileKey(viewName);
        if (options && typeof options === 'object') {
            const facingOption = String(options.facing || options.direction || options.sideFacing || '').toLowerCase();
            const isGenericSideRequest = rawViewName === 'side' || rawViewName === 'side-dual'
                || key === 'side' || key === 'side-left';
            if (isGenericSideRequest && facingOption === 'right') {
                key = 'side-right';
            } else if (isGenericSideRequest && facingOption === 'left') {
                key = 'side-left';
            }
        }
        if (!JointSystem.UC_VIEW_PROFILES[key] && options && typeof options === 'object') {
            const family = String(options.family || options.viewFamily || '').toLowerCase();
            const facing = String(options.facing || options.direction || options.sideFacing || '').toLowerCase();
            const lean = String(options.lean || options.threeQuarterLean || '').toLowerCase();
            if (family.includes('3q') || family.includes('3/4') || lean) {
                const side = lean === 'left' || facing === 'left' ? 'left' : 'right';
                key = family.includes('back') || String(options.view || '').includes('back')
                    ? `back-3q-${side}`
                    : `front-3q-${side}`;
            } else if (family.includes('side') || key === 'side') {
                key = facing === 'right' ? 'side-right' : 'side-left';
            } else if (family.includes('back')) {
                key = 'back';
            } else if (family.includes('front')) {
                key = 'front';
            }
        }
        const profile = JointSystem.UC_VIEW_PROFILES[key];
        return profile ? { ...profile, layerOrder: [...(profile.layerOrder || [])] } : null;
    };

JointSystem._getArmatureViewProfileLayerOrder = function(viewName = '', options = {}) {
        const profile = JointSystem._getArmatureViewProfile(viewName, options);
        if (Array.isArray(profile?.layerOrder) && profile.layerOrder.length) {
            return Utils.deepClone(profile.layerOrder);
        }
        if (Array.isArray(options?.layerOrder) && options.layerOrder.length) {
            return Utils.deepClone(options.layerOrder);
        }
        const viewKind = options?.viewKind || JointSystem._getArmatureSemanticViewKind?.(viewName);
        const fallback = JointSystem.ARMATURE_SEMANTIC_LAYER_ORDERS?.[viewKind];
        return Array.isArray(fallback) ? Utils.deepClone(fallback) : [];
    };

JointSystem.ARMATURE_VIEW_SCHEMAS = Object.freeze({
        front: Object.freeze({
            joints: Object.freeze(['waist', 'neck', 'right-shoulder', 'right-elbow', 'right-wrist', 'left-shoulder', 'left-elbow', 'left-wrist', 'right-hip', 'right-knee', 'right-ankle', 'left-hip', 'left-knee', 'left-ankle']),
            parts: Object.freeze(['torso', 'head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg'])
        }),
        back: Object.freeze({
            joints: Object.freeze(['waist', 'neck', 'right-shoulder', 'right-elbow', 'right-wrist', 'left-shoulder', 'left-elbow', 'left-wrist', 'right-hip', 'right-knee', 'right-ankle', 'left-hip', 'left-knee', 'left-ankle']),
            parts: Object.freeze(['torso', 'head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg'])
        }),
        side: Object.freeze({
            joints: Object.freeze(['waist', 'neck', 'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle', 'front-shoulder', 'front-elbow', 'front-wrist', 'back-shoulder', 'back-elbow', 'back-wrist', 'front-hip', 'front-knee', 'front-ankle', 'back-hip', 'back-knee', 'back-ankle']),
            parts: Object.freeze(['torso', 'head-neck', 'arm', 'leg', 'front-arm', 'back-arm', 'front-leg', 'back-leg'])
        }),
        sideDual: Object.freeze({
            joints: Object.freeze(['waist', 'neck', 'front-shoulder', 'front-elbow', 'front-wrist', 'back-shoulder', 'back-elbow', 'back-wrist', 'front-hip', 'front-knee', 'front-ankle', 'back-hip', 'back-knee', 'back-ankle', 'shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle']),
            parts: Object.freeze(['torso', 'head-neck', 'front-arm', 'back-arm', 'front-leg', 'back-leg', 'arm', 'leg'])
        })
    });

JointSystem.ARMATURE_CONTACT_TARGETS = Object.freeze([
        'ear',
        'forehead',
        'ground',
        'head-top',
        'jaw',
        'l-armpit',
        'l-cheek',
        'l-ear',
        'l-waist',
        'mouth',
        'r-armpit',
        'r-cheek',
        'r-ear',
        'r-waist',
        'sternum',
        'umbilical-area',
        'waist'
    ]);

JointSystem._getArmatureViewSchema = function(viewName = '') {
        const profile = JointSystem._getArmatureViewProfile(viewName);
        if (profile?.schema && JointSystem.ARMATURE_VIEW_SCHEMAS[profile.schema]) {
            return JointSystem.ARMATURE_VIEW_SCHEMAS[profile.schema];
        }
        const normalized = JointSystem._normalizeArmatureViewProfileKey(viewName);
        if (normalized === 'side-dual' || normalized === 'sidedual') return JointSystem.ARMATURE_VIEW_SCHEMAS.sideDual;
        return null;
    }

JointSystem.ARMATURE_SEMANTIC_ACTIONS = Object.freeze({
        PRESENT_EXPLAIN: 'communication.present-explain',
        PHONE_CALL: 'communication.phone-call',
        MICROPHONE_TALK: 'communication.microphone-talk',
        PRAYER: 'communication.prayer',
        CARRY_TRAY: 'object.carry-tray',
        PICK_UP_DROP: 'object.pick-up-drop',
        WALK: 'locomotion.walk',
        STRUT: 'locomotion.strut',
        STROLL: 'locomotion.stroll',
        RUN: 'locomotion.run',
        FLIP: 'orientation.flip'
    });

JointSystem.ARMATURE_SEMANTIC_COVERAGE_CONTRACTS = Object.freeze({
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.PHONE_CALL]: Object.freeze(['front', 'back', 'side-left', 'side-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.MICROPHONE_TALK]: Object.freeze(['front', 'back', 'side-left', 'side-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.PRESENT_EXPLAIN]: Object.freeze(['front', 'back', 'side-left', 'side-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.PICK_UP_DROP]: Object.freeze(['front', 'back', 'side-left', 'side-right', 'front-3q-left', 'front-3q-right', 'back-3q-left', 'back-3q-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.WALK]: Object.freeze(['front', 'back', 'side-left', 'side-right', 'front-3q-left', 'front-3q-right', 'back-3q-left', 'back-3q-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.STRUT]: Object.freeze(['front-3q-left', 'front-3q-right', 'back-3q-left', 'back-3q-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.STROLL]: Object.freeze(['front-3q-left', 'front-3q-right', 'back-3q-left', 'back-3q-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN]: Object.freeze(['front', 'back', 'side-left', 'side-right', 'front-3q-left', 'front-3q-right', 'back-3q-left', 'back-3q-right']),
        [JointSystem.ARMATURE_SEMANTIC_ACTIONS.FLIP]: Object.freeze(['front', 'back', 'side-left', 'side-right', 'front-3q-left', 'front-3q-right', 'back-3q-left', 'back-3q-right'])
    });

JointSystem._inferArmatureSemanticCoverageVariant = function(kind = 'move', key = '', entry = {}) {
        const normalizeToken = value => String(value || '')
            .trim()
            .toLowerCase()
            .replace(/3\/4/g, '3q')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        if (entry?.semanticVariant) {
            return `${kind}:${normalizeToken(entry.semanticVariant) || 'base'}`;
        }
        if (entry?.semanticAction === JointSystem.ARMATURE_SEMANTIC_ACTIONS.FLIP) {
            return `${kind}:flip`;
        }
        const text = `${key} ${entry?.key || ''} ${entry?.name || ''}`.toLowerCase();
        const variantParts = [];
        [
            ['center', /(?:\bcenter\b|pick-up-drop-center|pickup-center)/],
            ['left', /(?:\bleft\b|pick-up-drop-left|pickup-left)/],
            ['right', /(?:\bright\b|pick-up-drop-right|pickup-right)/],
            ['alternate', /alternate/],
            ['pre-contact', /(?:pre-ear|pre-mouth|prep|prepare)/],
            ['carry-load', /(?:carry-load|carry load)/],
            ['limp', /\blimp\b/],
            ['power', /\bpower\b/],
            ['guided', /\bguided\b/],
            ['tilt', /\btilt\b/],
            ['cycle', /\bcycle\b/],
            ['contact', /\bcontact\b/],
            ['passing', /\bpassing\b/],
            ['forward', /(?:forward|travel)/],
            ['to-point-back', /to-point-and-back/],
            ['strong', /strong/],
            ['loop', /loop/],
            ['run', /\brun\b/],
            ['walk', /\bwalk\b/],
            ['strut', /\bstrut\b/],
            ['stroll', /\bstroll\b/]
        ].forEach(([label, pattern]) => {
            if (pattern.test(text)) variantParts.push(label);
        });
        if (!variantParts.length) variantParts.push('base');
        return `${kind}:${[...new Set(variantParts)].join('+')}`;
    };

JointSystem._isIntentionalArmatureSemanticCoverageDuplicate = function(semanticAction = '', viewKey = '', variant = '', sources = []) {
        if (!Array.isArray(sources) || sources.length < 2) return false;
        if (semanticAction === JointSystem.ARMATURE_SEMANTIC_ACTIONS.FLIP && variant === 'move:flip') {
            return sources.every(source => /\.move\.turn-around-flip$/.test(source));
        }
        if (/^side-/.test(viewKey)) {
            const sideFamilies = sources.map(source => String(source || '').split('.')[0]);
            if (sideFamilies.every(name => /^side(?:Dual(?:Left|Right))?$/.test(name))) {
                return true;
            }
        }
        if (semanticAction === JointSystem.ARMATURE_SEMANTIC_ACTIONS.PICK_UP_DROP) {
            const hasSemantic = sources.some(source => /\.move\.semantic-pick-up-drop-/.test(source));
            const hasLegacy = sources.some(source => /\.move\.pick-up-drop/.test(source));
            if (hasSemantic && hasLegacy) return true;
        }
        return false;
    };

JointSystem._buildArmatureSemanticCoverageReport = function(items = [], options = {}) {
        const contracts = options.contracts || JointSystem.ARMATURE_SEMANTIC_COVERAGE_CONTRACTS || {};
        const normalizeView = value => JointSystem._normalizeArmatureViewProfileKey?.(value) || String(value || '').toLowerCase();
        const coverage = {};
        const warnings = [];
        const missing = [];
        const duplicates = [];
        (Array.isArray(items) ? items : []).forEach(item => {
            const entry = item?.entry || {};
            const semanticAction = String(entry?.semanticAction || '').trim();
            if (!semanticAction || !contracts[semanticAction]) return;
            const views = Array.isArray(item?.declaredViews) && item.declaredViews.length
                ? item.declaredViews
                : (Array.isArray(entry.viewCompatibility) && entry.viewCompatibility.length ? entry.viewCompatibility : ['generic']);
            const byView = coverage[semanticAction] || {};
            const variant = JointSystem._inferArmatureSemanticCoverageVariant(item?.kind || 'move', item?.key || entry.key || '', entry);
            views.forEach(view => {
                const viewKey = normalizeView(view);
                const list = byView[viewKey] || [];
                list.push({
                    source: item?.source || `${item?.catalogName || 'catalog'}.${item?.kind || 'move'}.${item?.key || entry.key || '(unknown)'}`,
                    variant
                });
                byView[viewKey] = list;
            });
            coverage[semanticAction] = byView;
        });
        Object.entries(coverage).forEach(([semanticAction, byView]) => {
            Object.entries(byView).forEach(([viewKey, sources]) => {
                const byVariant = sources.reduce((memo, item) => {
                    const variant = item?.variant || 'base';
                    const list = memo[variant] || [];
                    list.push(item?.source || String(item));
                    memo[variant] = list;
                    return memo;
                }, {});
                Object.entries(byVariant)
                    .filter(([, list]) => list.length > 1)
                    .forEach(([variant, list]) => {
                        if (JointSystem._isIntentionalArmatureSemanticCoverageDuplicate(semanticAction, viewKey, variant, list)) return;
                        const message = `semantic coverage duplicate ${semanticAction}.${viewKey}.${variant}: ${list.join(', ')}`;
                        warnings.push(message);
                        duplicates.push({ semanticAction, viewKey, variant, sources: list });
                    });
            });
        });
        Object.entries(contracts).forEach(([semanticAction, requiredViews]) => {
            const byView = coverage[semanticAction] || {};
            (requiredViews || []).forEach(viewKey => {
                const normalizedView = normalizeView(viewKey);
                if (!byView[normalizedView]?.length) {
                    const message = `semantic coverage missing ${semanticAction}.${normalizedView}`;
                    warnings.push(message);
                    missing.push({ semanticAction, viewKey: normalizedView });
                }
            });
        });
        return { coverage, warnings, missing, duplicates };
    };

JointSystem.ARMATURE_SEMANTIC_ACTION_RULES = Object.freeze([
        {
            match: /(?:present-explain|explain|present)/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PRESENT_EXPLAIN,
            motionIntent: 'open-palmed communication gesture'
        },
        {
            match: /microphone/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.MICROPHONE_TALK,
            motionIntent: 'hand-to-mouth communication gesture'
        },
        {
            match: /phone-call/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PHONE_CALL,
            motionIntent: 'hand-to-ear communication gesture'
        },
        {
            match: /prayer/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PRAYER,
            motionIntent: 'hands-meet-near-sternum gesture'
        },
        {
            match: /carry-tray/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.CARRY_TRAY,
            motionIntent: 'two-hand-supported object gesture'
        },
        {
            match: /pick-up|pickup|drop-object|drop object/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PICK_UP_DROP,
            motionIntent: 'squat-and-reach object interaction'
        },
        {
            match: /run/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
            motionIntent: 'faster alternating gait'
        },
        {
            match: /strut/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STRUT,
            motionIntent: 'expressive alternating gait'
        },
        {
            match: /stroll/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STROLL,
            motionIntent: 'relaxed alternating gait'
        },
        {
            match: /walk/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.WALK,
            motionIntent: 'neutral alternating gait'
        },
        {
            match: /turn-around-flip|flip/i,
            semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.FLIP,
            motionIntent: 'view-orientation transition'
        }
    ]);

JointSystem.ARMATURE_SEMANTIC_LAYER_ORDERS = Object.freeze({
        front: Object.freeze(['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm']),
        back: Object.freeze(['right-leg', 'left-leg', 'torso', 'head-neck', 'left-arm', 'right-arm']),
        sideDual: Object.freeze(['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'])
    });

JointSystem._getArmatureSemanticLayerOrder = function(viewName = '', options = {}) {
        return JointSystem._getArmatureViewProfileLayerOrder(viewName, {
            ...options,
            viewKind: options?.viewKind || JointSystem._getArmatureSemanticViewKind(viewName)
        });
    }

JointSystem._getArmatureSemanticViewKind = function(viewName = '') {
        const normalized = String(viewName || '').toLowerCase();
        if (normalized === 'side-dual' || normalized === 'sidedual' || normalized.startsWith('side-dual') || normalized.startsWith('side-')) {
            return 'sideDual';
        }
        if (normalized === 'back' || normalized.startsWith('back-3q')) {
            return 'back';
        }
        return 'front';
    }

JointSystem._getArmatureSemanticNearSide = function(viewName = '', fallback = 'right') {
        const normalized = String(viewName || '').toLowerCase();
        if (normalized.includes('left')) return 'left';
        if (normalized.includes('right')) return 'right';
        return fallback === 'left' ? 'left' : 'right';
    }

JointSystem._copyFiniteArmatureSemanticValue = function(target, key, value) {
        if (!target || !key || !Number.isFinite(value)) return;
        target[key] = value;
    }

JointSystem._getArmatureSemanticRoleMap = function(viewName = 'front', options = {}) {
        const profile = JointSystem._getArmatureViewProfile(viewName);
        const viewKind = JointSystem._getArmatureSemanticViewKind(viewName);
        const nearSide = JointSystem._getArmatureSemanticNearSide(viewName, options.nearSide);
        const farSide = nearSide === 'right' ? 'left' : 'right';
        const normalizePart = value => String(value || '').trim().toLowerCase();
        const sideFromPart = (partName, fallback = '') => normalizePart(partName).replace(/-(arm|leg)$/, '') || fallback;
        const sidePart = (side, kind) => `${side}-${kind}`;

        const nearArmPart = normalizePart(profile?.nearArm)
            || (viewKind === 'sideDual' ? 'front-arm' : sidePart(nearSide, 'arm'));
        const farArmPart = normalizePart(profile?.farArm)
            || (viewKind === 'sideDual' ? 'back-arm' : sidePart(farSide, 'arm'));
        const nearLegPart = normalizePart(profile?.nearLeg)
            || (viewKind === 'sideDual' ? 'front-leg' : sidePart(nearSide, 'leg'));
        const farLegPart = normalizePart(profile?.farLeg)
            || (viewKind === 'sideDual' ? 'back-leg' : sidePart(farSide, 'leg'));
        const rightArmPart = viewKind === 'sideDual'
            ? (nearSide === 'right' ? nearArmPart : farArmPart)
            : 'right-arm';
        const leftArmPart = viewKind === 'sideDual'
            ? (nearSide === 'left' ? nearArmPart : farArmPart)
            : 'left-arm';
        const rightLegPart = viewKind === 'sideDual'
            ? (nearSide === 'right' ? nearLegPart : farLegPart)
            : 'right-leg';
        const leftLegPart = viewKind === 'sideDual'
            ? (nearSide === 'left' ? nearLegPart : farLegPart)
            : 'left-leg';

        return {
            viewName,
            viewKind,
            viewProfileKey: profile?.key || null,
            nearSide,
            farSide,
            nearArm: sideFromPart(nearArmPart, nearSide),
            farArm: sideFromPart(farArmPart, farSide),
            nearLeg: sideFromPart(nearLegPart, nearSide),
            farLeg: sideFromPart(farLegPart, farSide),
            rightArm: sideFromPart(rightArmPart, 'right'),
            leftArm: sideFromPart(leftArmPart, 'left'),
            rightLeg: sideFromPart(rightLegPart, 'right'),
            leftLeg: sideFromPart(leftLegPart, 'left'),
            parts: {
                nearArm: nearArmPart,
                farArm: farArmPart,
                nearLeg: nearLegPart,
                farLeg: farLegPart,
                rightArm: rightArmPart,
                leftArm: leftArmPart,
                rightLeg: rightLegPart,
                leftLeg: leftLegPart
            }
        };
    }

JointSystem._getArmatureSemanticContactSourceMap = function(viewName = 'front', options = {}) {
        const roleMap = JointSystem._getArmatureSemanticRoleMap(viewName, options);
        const handFromArm = partName => {
            const part = String(partName || '').trim().toLowerCase();
            if (!part) return '';
            return part.replace(/-arm$/, '-hand');
        };
        const nearHand = handFromArm(roleMap.parts?.nearArm);
        const farHand = handFromArm(roleMap.parts?.farArm);
        const rightHand = handFromArm(roleMap.parts?.rightArm);
        const leftHand = handFromArm(roleMap.parts?.leftArm);
        return {
            nearHand: nearHand || 'right-hand',
            farHand: farHand || 'left-hand',
            rightHand: rightHand || 'right-hand',
            leftHand: leftHand || 'left-hand',
            hand: nearHand || 'right-hand'
        };
    }

JointSystem._compileArmatureSemanticFrame = function(frame = {}, viewName = 'front', options = {}) {
        const profile = JointSystem._getArmatureViewProfile(viewName);
        const viewKind = JointSystem._getArmatureSemanticViewKind(viewName);
        const roleMap = JointSystem._getArmatureSemanticRoleMap(viewName, options);
        const nearSide = roleMap.nearSide;
        const farSide = roleMap.farSide;
        const result = {};
        const jointAngles = {};
        const jointTilts = {};
        const partAngles = {};
        const partTilts = {};
        const semanticTrace = {
            viewName,
            viewKind,
            viewProfileKey: profile?.key || null,
            layerAuthority: Array.isArray(profile?.layerOrder) && profile.layerOrder.length
                ? 'UC_VIEW_PROFILES'
                : (Array.isArray(options?.layerOrder) && options.layerOrder.length ? 'explicit-option' : 'legacy-fallback'),
            nearSide,
            farSide,
            roleMap: Utils.deepClone(roleMap.parts || {}),
            contactSourceMap: JointSystem._getArmatureSemanticContactSourceMap(viewName, options),
            limbs: {},
            contacts: {}
        };
        const layerOrder = JointSystem._getArmatureSemanticLayerOrder(viewName, {
            viewKind,
            layerOrder: options.layerOrder
        });

        if (Number.isFinite(frame.t)) result.t = frame.t;
        if (Number.isFinite(frame.dx)) result.dx = frame.dx;
        if (Number.isFinite(frame.dy)) result.dy = frame.dy;
        if (frame.attention && typeof frame.attention === 'object') {
            result.attention = Utils.deepClone(frame.attention);
        }

        const setJoint = (jointName, value) => {
            JointSystem._copyFiniteArmatureSemanticValue(jointAngles, jointName, value);
        };
        const setJointTilt = (jointName, tilt) => {
            if (!jointName || !tilt || typeof tilt !== 'object') return false;
            const x = Number.isFinite(tilt.x) ? tilt.x : 0;
            const y = Number.isFinite(tilt.y) ? tilt.y : 0;
            if (x || y) {
                jointTilts[jointName] = { x, y };
                return true;
            }
            return false;
        };
        const setPartTilt = (partName, tilt) => {
            if (!partName || !tilt || typeof tilt !== 'object') return;
            const x = Number.isFinite(tilt.x) ? tilt.x : 0;
            const y = Number.isFinite(tilt.y) ? tilt.y : 0;
            if (x || y) partTilts[partName] = { x, y };
        };
        const setPartAngle = (partName, value) => {
            JointSystem._copyFiniteArmatureSemanticValue(partAngles, partName, value);
        };

        const applyArm = (semanticKey, arm = {}) => {
            const runtimeSide = roleMap[semanticKey];
            if (!runtimeSide || !arm || typeof arm !== 'object') return;
            const tilts = arm.tilts || arm.segmentTilts || {};
            const shoulderTilt = arm.shoulderTilt || arm.upperArmTilt || arm.upperTilt || tilts.shoulder || tilts.upperArm || tilts.upper || arm.tilt;
            const elbowTilt = arm.elbowTilt || arm.forearmTilt || arm.lowerTilt || tilts.elbow || tilts.forearm || tilts.lower;
            const wristTilt = arm.wristTilt || arm.handTilt || tilts.wrist || tilts.hand || tilts.distal;
            semanticTrace.limbs[semanticKey] = {
                runtimeSide,
                runtimePart: `${runtimeSide}-arm`,
                joints: [`${runtimeSide}-shoulder`, `${runtimeSide}-elbow`, `${runtimeSide}-wrist`],
                tiltChannels: {}
            };
            setJoint(`${runtimeSide}-shoulder`, arm.shoulder);
            setJoint(`${runtimeSide}-elbow`, arm.elbow);
            setJoint(`${runtimeSide}-wrist`, arm.wrist);
            if (setJointTilt(`${runtimeSide}-shoulder`, shoulderTilt)) semanticTrace.limbs[semanticKey].tiltChannels.upperArm = `${runtimeSide}-shoulder`;
            if (setJointTilt(`${runtimeSide}-elbow`, elbowTilt)) semanticTrace.limbs[semanticKey].tiltChannels.forearm = `${runtimeSide}-elbow`;
            if (setJointTilt(`${runtimeSide}-wrist`, wristTilt)) semanticTrace.limbs[semanticKey].tiltChannels.hand = `${runtimeSide}-wrist`;
        };

        const applyLeg = (semanticKey, leg = {}) => {
            const runtimeSide = roleMap[semanticKey];
            if (!runtimeSide || !leg || typeof leg !== 'object') return;
            const tilts = leg.tilts || leg.segmentTilts || {};
            const hipTilt = leg.hipTilt || leg.thighTilt || leg.upperLegTilt || leg.upperTilt || tilts.hip || tilts.thigh || tilts.upper || leg.tilt;
            const kneeTilt = leg.kneeTilt || leg.shinTilt || leg.lowerTilt || tilts.knee || tilts.shin || tilts.lower;
            const ankleTilt = leg.ankleTilt || leg.footTilt || tilts.ankle || tilts.foot || tilts.distal;
            semanticTrace.limbs[semanticKey] = {
                runtimeSide,
                runtimePart: `${runtimeSide}-leg`,
                joints: [`${runtimeSide}-hip`, `${runtimeSide}-knee`, `${runtimeSide}-ankle`],
                tiltChannels: {}
            };
            setJoint(`${runtimeSide}-hip`, leg.hip);
            setJoint(`${runtimeSide}-knee`, leg.knee);
            setJoint(`${runtimeSide}-ankle`, leg.ankle);
            if (setJointTilt(`${runtimeSide}-hip`, hipTilt)) semanticTrace.limbs[semanticKey].tiltChannels.thigh = `${runtimeSide}-hip`;
            if (setJointTilt(`${runtimeSide}-knee`, kneeTilt)) semanticTrace.limbs[semanticKey].tiltChannels.shin = `${runtimeSide}-knee`;
            if (setJointTilt(`${runtimeSide}-ankle`, ankleTilt)) semanticTrace.limbs[semanticKey].tiltChannels.foot = `${runtimeSide}-ankle`;
        };

        const limbs = frame.limbs || {};
        ['rightArm', 'leftArm', 'nearArm', 'farArm'].forEach(key => applyArm(key, limbs[key]));
        ['rightLeg', 'leftLeg', 'nearLeg', 'farLeg'].forEach(key => applyLeg(key, limbs[key]));

        if (frame.torso && typeof frame.torso === 'object') {
            setJoint('waist', frame.torso.waist);
            setPartAngle('torso', frame.torso.plane);
            setPartTilt('torso', frame.torso.tilt);
        }
        if (frame.head && typeof frame.head === 'object') {
            setJoint('neck', frame.head.neck ?? frame.head.plane);
            setPartTilt('head-neck', frame.head.tilt);
        }

        if (profile?.movementPlane === 'three-quarter-visible-plane' && Number.isFinite(profile.baseTiltY)) {
            ['torso', 'head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg'].forEach(partName => {
                const current = partTilts[partName] || {};
                partTilts[partName] = {
                    x: Number.isFinite(current.x) ? current.x : 0,
                    y: profile.baseTiltY
                };
            });
        }

        const contactSourceMap = semanticTrace.contactSourceMap || JointSystem._getArmatureSemanticContactSourceMap(viewName, options);
        const contacts = {};
        Object.entries(frame.contacts || {}).forEach(([sourceName, spec]) => {
            if (!spec || typeof spec !== 'object') return;
            const source = contactSourceMap[sourceName] || sourceName;
            const tag = spec.tag || spec.target || spec.bodyTag;
            if (!source || !tag) return;
            semanticTrace.contacts[sourceName] = { runtimeSource: source, target: tag };
            contacts[source] = {
                tag,
                offsetX: Number.isFinite(spec.offsetX) ? spec.offsetX : 0,
                offsetY: Number.isFinite(spec.offsetY) ? spec.offsetY : 0,
                iterations: Number.isFinite(spec.iterations) ? spec.iterations : 10
            };
        });

        if (Object.keys(jointAngles).length) result.jointAngles = jointAngles;
        if (Object.keys(jointTilts).length) result.jointTilts = jointTilts;
        if (Object.keys(partAngles).length) result.partAngles = partAngles;
        if (Object.keys(partTilts).length) result.partTilts = partTilts;
        if (Object.keys(contacts).length) result.contacts = contacts;
        if (Array.isArray(layerOrder) && layerOrder.length) {
            result.layerOrderOverride = Utils.deepClone(layerOrder);
            if (viewKind === 'back') result.backViewLayerOverride = Utils.deepClone(layerOrder);
            if (viewKind === 'front') result.frontViewLayerOverride = Utils.deepClone(layerOrder);
            semanticTrace.layerOrder = Utils.deepClone(layerOrder);
        }
        result.semanticTrace = semanticTrace;
        return result;
    }

JointSystem._compileArmatureSemanticMovement = function(spec = {}, viewName = 'front', options = {}) {
        const profile = JointSystem._getArmatureViewProfile(viewName);
        const viewKind = JointSystem._getArmatureSemanticViewKind(viewName);
        const keyframesByView = spec.keyframesByView && typeof spec.keyframesByView === 'object'
            ? spec.keyframesByView
            : null;
        const keyframes = keyframesByView?.[viewName]
            || keyframesByView?.[viewKind]
            || keyframesByView?.default
            || spec.keyframes
            || [];
        const viewCompatibility = Array.isArray(options.viewCompatibility)
            ? options.viewCompatibility
            : [viewName];
        const key = spec.key || JointSystem._slugifyArmatureCatalogKey(`${spec.action || 'semantic'}-${viewName}`, 'semantic-move');
        const movement = {
            key,
            name: spec.name || key,
            icon: spec.icon || 'fa-play',
            category: spec.category || 'Other',
            description: spec.description || '',
            duration: spec.duration || 1000,
            repeat: spec.repeat ?? 1,
            viewCompatibility,
            semanticAction: spec.action || '',
            semanticFamily: String(spec.action || '').split('.')[0] || 'uncategorized',
            motionIntent: spec.motionIntent || '',
            authoringConvention: 'semantic-armature-schema-v1',
            generatedFromSemanticSchema: true,
            semanticCompilerVersion: 1,
            keyframes: keyframes.map(frame =>
                JointSystem._compileArmatureSemanticFrame(frame, viewName, {
                    nearSide: spec.nearSide,
                    layerOrder: spec.layerOrder || options.layerOrder
                })
            )
        };
        const movementLayerOrder = JointSystem._getArmatureSemanticLayerOrder(viewName, { viewKind });
        if (Array.isArray(movementLayerOrder) && movementLayerOrder.length) {
            movement.layerOrderOverride = Utils.deepClone(movementLayerOrder);
            if (viewKind === 'back') movement.backViewLayerOverride = Utils.deepClone(movementLayerOrder);
            if (viewKind === 'front') movement.frontViewLayerOverride = Utils.deepClone(movementLayerOrder);
        }
        if (profile) {
            movement.viewProfileKey = profile.key;
            movement.viewFamily = profile.family;
            movement.movementPlane = profile.movementPlane;
            movement.forwardAxis = profile.forwardAxis;
            movement.forwardSign = profile.forwardSign;
            movement.baseTiltY = profile.baseTiltY;
            movement.nearArm = profile.nearArm;
            movement.farArm = profile.farArm;
            movement.nearLeg = profile.nearLeg;
            movement.farLeg = profile.farLeg;
            movement.viewProfileLayerAuthority = true;
        }
        ['footPlantPolicy', 'contactTargetPolicy', 'contactSourcePolicy', 'movementPhases', 'attentionTrack', 'auditNotes'].forEach(prop => {
            if (spec[prop] == null) return;
            movement[prop] = Utils.deepClone(spec[prop]);
        });
        if (!movement.semanticAction) delete movement.semanticAction;
        return movement;
    }

JointSystem._summarizeArmatureSemanticTrace = function(entry = {}) {
        const frames = Array.isArray(entry?.keyframes) && entry.keyframes.length
            ? entry.keyframes
            : [entry].filter(Boolean);
        const summary = {
            compilerVersion: Number.isFinite(entry?.semanticCompilerVersion) ? entry.semanticCompilerVersion : null,
            frameCount: frames.length,
            tracedFrames: 0,
            views: [],
            viewKinds: [],
            roleMaps: {},
            limbs: {},
            contacts: {}
        };
        const views = new Set();
        const viewKinds = new Set();
        const rememberMapping = (bucket, semanticKey, mapping = {}, frameIndex) => {
            if (!semanticKey || !mapping || typeof mapping !== 'object') return;
            const item = bucket[semanticKey] || {
                runtimeSides: new Set(),
                runtimeParts: new Set(),
                runtimeSources: new Set(),
                targets: new Set(),
                joints: new Set(),
                frames: new Set()
            };
            if (mapping.runtimeSide) item.runtimeSides.add(String(mapping.runtimeSide));
            if (mapping.runtimePart) item.runtimeParts.add(String(mapping.runtimePart));
            if (mapping.runtimeSource) item.runtimeSources.add(String(mapping.runtimeSource));
            if (mapping.target) item.targets.add(String(mapping.target));
            (Array.isArray(mapping.joints) ? mapping.joints : []).forEach(jointName => {
                if (jointName) item.joints.add(String(jointName));
            });
            item.frames.add(frameIndex);
            bucket[semanticKey] = item;
        };
        frames.forEach((frame, frameIndex) => {
            const trace = frame?.semanticTrace;
            if (!trace || typeof trace !== 'object' || Array.isArray(trace)) return;
            summary.tracedFrames += 1;
            if (trace.viewName) views.add(String(trace.viewName));
            if (trace.viewKind) viewKinds.add(String(trace.viewKind));
            if (trace.viewName && trace.roleMap && typeof trace.roleMap === 'object' && !Array.isArray(trace.roleMap)) {
                summary.roleMaps[String(trace.viewName)] = {
                    ...(summary.roleMaps[String(trace.viewName)] || {}),
                    ...trace.roleMap
                };
            }
            Object.entries(trace.limbs || {}).forEach(([semanticKey, mapping]) => {
                rememberMapping(summary.limbs, semanticKey, mapping, frameIndex);
            });
            Object.entries(trace.contacts || {}).forEach(([semanticKey, mapping]) => {
                rememberMapping(summary.contacts, semanticKey, mapping, frameIndex);
            });
        });
        const finalizeBucket = bucket => Object.fromEntries(Object.entries(bucket).map(([semanticKey, item]) => [semanticKey, {
            runtimeSides: [...item.runtimeSides].sort(),
            runtimeParts: [...item.runtimeParts].sort(),
            runtimeSources: [...item.runtimeSources].sort(),
            targets: [...item.targets].sort(),
            joints: [...item.joints].sort(),
            frames: [...item.frames].sort((a, b) => a - b)
        }]));
        summary.views = [...views].sort();
        summary.viewKinds = [...viewKinds].sort();
        summary.limbs = finalizeBucket(summary.limbs);
        summary.contacts = finalizeBucket(summary.contacts);
        return summary;
    };

JointSystem._validateArmatureSemanticTrace = function(entry = {}) {
        const errors = [];
        const warnings = [];
        const summary = JointSystem._summarizeArmatureSemanticTrace?.(entry) || null;
        const frames = Array.isArray(entry?.keyframes) && entry.keyframes.length
            ? entry.keyframes
            : [entry].filter(Boolean);
        const normalizeToken = value => String(value || '')
            .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        const normalizeView = value => JointSystem._normalizeArmatureViewProfileKey?.(value) || normalizeToken(value);
        const declaredViews = Array.isArray(entry?.viewCompatibility)
            ? entry.viewCompatibility.map(normalizeView).filter(Boolean)
            : [];
        const declaredTargets = Array.isArray(entry?.contactTargetPolicy)
            ? entry.contactTargetPolicy.map(normalizeToken).filter(Boolean)
            : [];
        const declaredSources = Array.isArray(entry?.contactSourcePolicy)
            ? entry.contactSourcePolicy.map(normalizeToken).filter(Boolean)
            : [];
        const actualTargets = new Set();
        const actualSources = new Set();
        const semanticSources = new Set();
        const targetMatchesPolicy = (actual, policy) => actual === policy || actual.endsWith(`-${policy}`);
        const sourceMatchesPolicy = (actual, policy, semanticKey = '') => {
            if (semanticKey === policy) return true;
            if (policy === 'near-hand' && (semanticKey === 'near-hand' || actual.endsWith('-hand'))) return true;
            if (policy === 'far-hand' && (semanticKey === 'far-hand' || actual.endsWith('-hand'))) return true;
            return actual === policy;
        };

        if (entry?.generatedFromSemanticSchema === true && entry.semanticCompilerVersion !== 1) {
            errors.push('Generated semantic movement is missing semanticCompilerVersion 1.');
        }
        if (entry?.generatedFromSemanticSchema === true && (!summary || summary.tracedFrames !== frames.length || summary.frameCount !== frames.length)) {
            errors.push(`Semantic trace covers ${summary?.tracedFrames || 0}/${summary?.frameCount || 0} frame(s), expected ${frames.length}.`);
        }
        if (declaredViews.length && summary?.views?.length) {
            summary.views.map(normalizeView).forEach(viewKey => {
                if (viewKey && !declaredViews.includes(viewKey)) {
                    errors.push(`Trace view "${viewKey}" is not declared in viewCompatibility (${declaredViews.join(', ') || 'none'}).`);
                }
            });
        }

        const checkLimbMapping = (frame, frameIndex) => {
            const trace = frame?.semanticTrace;
            if (!trace || typeof trace !== 'object' || Array.isArray(trace)) {
                if (entry?.generatedFromSemanticSchema === true) {
                    errors.push(`Frame ${frameIndex} is missing semanticTrace.`);
                }
                return;
            }
            const viewName = normalizeView(trace.viewName || '');
            const roleMap = JointSystem._getArmatureSemanticRoleMap?.(viewName, { nearSide: trace.nearSide }) || {};
            const expectedParts = roleMap.parts || {};
            const tracedRoleMap = trace.roleMap && typeof trace.roleMap === 'object' && !Array.isArray(trace.roleMap)
                ? trace.roleMap
                : {};
            Object.entries(expectedParts).forEach(([semanticKey, expectedPart]) => {
                const tracedPart = normalizeToken(tracedRoleMap[semanticKey] || '');
                if (tracedPart && expectedPart && tracedPart !== expectedPart) {
                    errors.push(`Frame ${frameIndex} trace.roleMap.${semanticKey} is "${tracedPart}", expected "${expectedPart}" for ${viewName || trace.viewName || 'view'}.`);
                }
            });
            Object.entries(trace.limbs || {}).forEach(([semanticKey, mapping]) => {
                const expectedPart = expectedParts[semanticKey];
                const runtimePart = normalizeToken(mapping?.runtimePart || '');
                if (expectedPart && runtimePart && runtimePart !== expectedPart) {
                    errors.push(`Frame ${frameIndex} maps ${semanticKey} to "${runtimePart}", expected "${expectedPart}" for ${viewName || trace.viewName || 'view'}.`);
                }
                const joints = Array.isArray(mapping?.joints) ? mapping.joints.map(normalizeToken).filter(Boolean) : [];
                if (!runtimePart || !joints.length) {
                    errors.push(`Frame ${frameIndex} semantic limb "${semanticKey}" is incomplete.`);
                    return;
                }
                const prefix = runtimePart.replace(/-(arm|leg)$/, '');
                const expectedJoint = runtimePart.endsWith('-arm') ? `${prefix}-shoulder` : `${prefix}-hip`;
                if (expectedJoint && !joints.includes(expectedJoint)) {
                    errors.push(`Frame ${frameIndex} semantic limb "${semanticKey}" uses joints ${joints.join(', ') || 'none'}; expected ${expectedJoint}.`);
                }
            });
            Object.entries(trace.contacts || {}).forEach(([semanticKey, mapping]) => {
                const runtimeSource = normalizeToken(mapping?.runtimeSource || '');
                const target = normalizeToken(mapping?.target || '');
                const normalizedSemanticKey = normalizeToken(semanticKey);
                const expectedContactMap = JointSystem._getArmatureSemanticContactSourceMap?.(viewName, { nearSide: trace.nearSide }) || {};
                const expectedSource = normalizeToken(expectedContactMap[semanticKey] || expectedContactMap[normalizedSemanticKey] || '');
                if (!runtimeSource || !target) {
                    errors.push(`Frame ${frameIndex} semantic contact "${semanticKey}" is incomplete.`);
                    return;
                }
                if (expectedSource && runtimeSource !== expectedSource) {
                    errors.push(`Frame ${frameIndex} semantic contact "${semanticKey}" maps to "${runtimeSource}", expected "${expectedSource}" for ${viewName || trace.viewName || 'view'}.`);
                }
                actualSources.add(runtimeSource);
                semanticSources.add(normalizedSemanticKey);
                actualTargets.add(target);
            });
        };
        frames.forEach(checkLimbMapping);

        declaredTargets.forEach(policy => {
            const found = [...actualTargets].some(target => targetMatchesPolicy(target, policy));
            if (!found) {
                errors.push(`contactTargetPolicy "${policy}" was not satisfied by trace targets (${[...actualTargets].sort().join(', ') || 'none'}).`);
            }
        });
        declaredSources.forEach(policy => {
            const found = [...actualSources].some(source => sourceMatchesPolicy(source, policy))
                || [...semanticSources].some(source => sourceMatchesPolicy('', policy, source));
            if (!found) {
                warnings.push(`contactSourcePolicy "${policy}" was not satisfied by trace sources (${[...actualSources].sort().join(', ') || 'none'}).`);
            }
        });

        return {
            ok: errors.length === 0,
            errors,
            warnings,
            summary
        };
    };

JointSystem.ARMATURE_GOLDEN_FIXTURE_FORMAT = 'animstage-armature-golden-fixture';
JointSystem.ARMATURE_GOLDEN_FIXTURE_VERSION = 1;

JointSystem._normalizeArmatureFixtureView = function(viewName = '') {
        return JointSystem._normalizeArmatureViewProfileKey(viewName);
    }

JointSystem._inferArmatureSemanticActionFromEntry = function(entry = {}, fallbackKey = '') {
        if (entry?.semanticAction) return String(entry.semanticAction);
        const text = `${fallbackKey || ''} ${entry?.key || ''} ${entry?.name || ''} ${entry?.category || ''} ${entry?.description || ''}`;
        const rule = (JointSystem.ARMATURE_SEMANTIC_ACTION_RULES || []).find(candidate => candidate?.match?.test?.(text));
        return rule?.semanticAction || '';
    }

JointSystem._collectArmatureFixtureMapKeys = function(entry = {}) {
        const keys = {
            jointAngles: new Set(),
            jointTilts: new Set(),
            partAngles: new Set(),
            partTilts: new Set(),
            contacts: new Set(),
            layerParts: new Set()
        };
        const collectFrame = frame => {
            if (!frame || typeof frame !== 'object') return;
            Object.keys(frame.jointAngles || {}).forEach(key => keys.jointAngles.add(key));
            Object.keys(frame.jointTilts || {}).forEach(key => keys.jointTilts.add(key));
            Object.keys(frame.partAngles || {}).forEach(key => keys.partAngles.add(key));
            Object.keys(frame.partTilts || {}).forEach(key => keys.partTilts.add(key));
            Object.keys(frame.contacts || {}).forEach(key => keys.contacts.add(key));
            [
                ...(frame.layerOrderOverride || []),
                ...(frame.frontViewLayerOverride || []),
                ...(frame.backViewLayerOverride || [])
            ].forEach(key => keys.layerParts.add(key));
        };
        collectFrame(entry);
        (entry.keyframes || []).forEach(collectFrame);
        return Object.fromEntries(Object.entries(keys).map(([key, set]) => [key, [...set].sort()]));
    }

JointSystem._summarizeArmatureGoldenFixture = function(entry = {}, kind = 'movement') {
        const maps = JointSystem._collectArmatureFixtureMapKeys(entry);
        const frames = kind === 'movement' && Array.isArray(entry.keyframes) ? entry.keyframes : [entry];
        const contactTargets = new Set();
        const dxValues = [];
        const dyValues = [];
        frames.forEach(frame => {
            if (!frame || typeof frame !== 'object') return;
            if (Number.isFinite(frame.dx)) dxValues.push(frame.dx);
            if (Number.isFinite(frame.dy)) dyValues.push(frame.dy);
            Object.values(frame.contacts || {}).forEach(contact => {
                const tag = contact?.tag || contact?.target || contact?.bodyTag;
                if (tag) contactTargets.add(String(tag));
            });
        });
        const first = frames[0] || {};
        const last = frames[frames.length - 1] || {};
        const sameMap = prop => JSON.stringify(first[prop] || {}) === JSON.stringify(last[prop] || {});
        const summary = {
            frameCount: frames.length,
            joints: maps.jointAngles,
            jointTilts: maps.jointTilts,
            parts: [...new Set([...maps.partAngles, ...maps.partTilts])].sort(),
            contacts: maps.contacts,
            contactTargets: [...contactTargets].sort(),
            layerParts: maps.layerParts,
            hasTravel: dxValues.some(value => Math.abs(value) > 0.001) || dyValues.some(value => Math.abs(value) > 0.001),
            travel: {
                dxMin: dxValues.length ? Math.min(...dxValues) : 0,
                dxMax: dxValues.length ? Math.max(...dxValues) : 0,
                dyMin: dyValues.length ? Math.min(...dyValues) : 0,
                dyMax: dyValues.length ? Math.max(...dyValues) : 0
            },
            usesTiltX: frames.some(frame =>
                Object.values(frame?.jointTilts || {}).some(tilt => Number.isFinite(tilt?.x) && Math.abs(tilt.x) > 0.001) ||
                Object.values(frame?.partTilts || {}).some(tilt => Number.isFinite(tilt?.x) && Math.abs(tilt.x) > 0.001)
            ),
            usesTiltY: frames.some(frame =>
                Object.values(frame?.jointTilts || {}).some(tilt => Number.isFinite(tilt?.y) && Math.abs(tilt.y) > 0.001) ||
                Object.values(frame?.partTilts || {}).some(tilt => Number.isFinite(tilt?.y) && Math.abs(tilt.y) > 0.001)
            ),
            startEndMatch: frames.length > 1 && sameMap('jointAngles') && sameMap('jointTilts') && sameMap('partAngles') && sameMap('partTilts')
        };
        const semanticTraceSummary = JointSystem._summarizeArmatureSemanticTrace?.(entry);
        if (semanticTraceSummary?.tracedFrames) {
            summary.semanticTrace = semanticTraceSummary;
        }
        return summary;
    }

JointSystem._validateArmatureGoldenFixtureAnatomy = function(fixture = {}, viewKey = 'generic', frames = []) {
        const warnings = [];
        const profile = JointSystem._getArmatureViewProfile(viewKey);
        if (!profile) {
            return { warnings };
        }

        const semanticAction = String(fixture.semanticAction || fixture.logicalAction || '').toLowerCase();
        const isLocomotion = semanticAction.startsWith('locomotion.');
        const nonEmptyFrames = Array.isArray(frames) ? frames.filter(frame => frame && typeof frame === 'object') : [];
        const layerForFrame = frame => (
            Array.isArray(frame?.layerOrderOverride) ? frame.layerOrderOverride
                : Array.isArray(frame?.frontViewLayerOverride) ? frame.frontViewLayerOverride
                    : Array.isArray(frame?.backViewLayerOverride) ? frame.backViewLayerOverride
                        : []
        );
        const signOf = value => {
            if (!Number.isFinite(value) || Math.abs(value) < 0.001) return 0;
            return value > 0 ? 1 : -1;
        };

        if (isLocomotion && profile.movementPlane === 'depth-tilt') {
            const tiltSigns = new Set();
            nonEmptyFrames.forEach(frame => {
                Object.values(frame.jointTilts || {}).forEach(tilt => {
                    const sign = signOf(tilt?.x);
                    if (sign) tiltSigns.add(sign);
                });
                Object.values(frame.partTilts || {}).forEach(tilt => {
                    const sign = signOf(tilt?.x);
                    if (sign) tiltSigns.add(sign);
                });
            });
            if (tiltSigns.size < 2) {
                warnings.push(`${viewKey}: depth locomotion should alternate positive and negative tiltX rather than relying only on visible-plane joint angles.`);
            }
        }

        if (isLocomotion && profile.movementPlane === 'visible-plane') {
            const hasArmSwing = nonEmptyFrames.some(frame =>
                Number.isFinite(frame?.jointAngles?.['front-shoulder']) ||
                Number.isFinite(frame?.jointAngles?.['back-shoulder'])
            );
            const hasLegSwing = nonEmptyFrames.some(frame =>
                Number.isFinite(frame?.jointAngles?.['front-hip']) ||
                Number.isFinite(frame?.jointAngles?.['back-hip'])
            );
            if (!hasArmSwing || !hasLegSwing) {
                warnings.push(`${viewKey}: side locomotion should include front/back shoulder and hip swing angles.`);
            }
        }

        if (isLocomotion && profile.movementPlane === 'three-quarter-visible-plane') {
            const expectedTiltY = Number.isFinite(profile.baseTiltY) ? profile.baseTiltY : 0;
            const checkedParts = new Set(['torso', 'head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg']);
            nonEmptyFrames.forEach((frame, index) => {
                Object.entries(frame.partTilts || {}).forEach(([partName, tilt]) => {
                    if (!checkedParts.has(partName)) return;
                    const y = Number.isFinite(tilt?.y) ? tilt.y : 0;
                    if (Math.abs(y - expectedTiltY) > 0.001) {
                        warnings.push(`${viewKey}.frame[${index}] changes ${partName}.tiltY to ${y}; 3/4 movement should preserve idle tiltY ${expectedTiltY}.`);
                    }
                });
            });
        }

        if (profile.nearArm && profile.farArm) {
            nonEmptyFrames.forEach((frame, index) => {
                const order = layerForFrame(frame);
                if (!order.length) return;
                const torsoIndex = order.indexOf('torso');
                const nearArmIndex = order.indexOf(profile.nearArm);
                const farArmIndex = order.indexOf(profile.farArm);
                if (torsoIndex === -1) return;
                if (nearArmIndex !== -1 && nearArmIndex <= torsoIndex) {
                    warnings.push(`${viewKey}.frame[${index}] places near arm "${profile.nearArm}" behind torso.`);
                }
                if (farArmIndex !== -1 && farArmIndex >= torsoIndex) {
                    warnings.push(`${viewKey}.frame[${index}] places far arm "${profile.farArm}" in front of torso.`);
                }
            });
        }

        if (/communication\.(phone-call|microphone-talk|prayer|present-explain)/.test(semanticAction)) {
            const hasContacts = nonEmptyFrames.some(frame => frame?.contacts && Object.keys(frame.contacts).length);
            if (!hasContacts && /phone-call|microphone-talk|prayer/.test(semanticAction)) {
                warnings.push(`${viewKey}: ${semanticAction} has no contact targets; hand placement may drift across views.`);
            }
        }

        return { warnings };
    }

JointSystem._buildArmatureGoldenFixture = function(options = {}) {
        const kind = options.kind === 'pose' ? 'pose' : 'movement';
        const entry = options.entry && typeof options.entry === 'object'
            ? Utils.deepClone(options.entry)
            : {};
        const sourceKey = String(options.key || entry.key || '').trim();
        const viewKey = JointSystem._normalizeArmatureFixtureView(options.viewKey || (entry.viewCompatibility || [])[0] || 'generic');
        const logicalAction = String(options.logicalAction || JointSystem._inferArmatureSemanticActionFromEntry(entry, sourceKey) || '').trim();
        const idBase = `${logicalAction || sourceKey || kind}-${viewKey}-${Date.now()}`;
        const id = String(options.id || idBase)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || `fixture-${Date.now()}`;
        const viewCompatibility = Array.isArray(options.viewCompatibility) && options.viewCompatibility.length
            ? options.viewCompatibility.map(JointSystem._normalizeArmatureFixtureView).filter(Boolean)
            : (Array.isArray(entry.viewCompatibility) && entry.viewCompatibility.length
                ? entry.viewCompatibility.map(JointSystem._normalizeArmatureFixtureView).filter(Boolean)
                : [viewKey]);
        return {
            format: JointSystem.ARMATURE_GOLDEN_FIXTURE_FORMAT,
            version: JointSystem.ARMATURE_GOLDEN_FIXTURE_VERSION,
            id,
            kind,
            key: sourceKey || id,
            name: options.name || entry.name || sourceKey || (kind === 'pose' ? 'Golden Pose' : 'Golden Movement'),
            logicalAction,
            semanticFamily: logicalAction ? logicalAction.split('.')[0] : '',
            viewKey,
            viewCompatibility: [...new Set(viewCompatibility)],
            quality: options.quality || 'approved',
            source: {
                capturedAt: options.capturedAt || new Date().toISOString(),
                sourceType: options.sourceType || 'catalog',
                sourceKey,
                characterName: options.characterName || ''
            },
            constraints: Utils.deepClone(options.constraints || {}),
            notes: Array.isArray(options.notes) ? Utils.deepClone(options.notes) : [],
            anatomySummary: JointSystem._summarizeArmatureGoldenFixture(entry, kind),
            entry
        };
    }

JointSystem._validateArmatureGoldenFixture = function(fixture = {}) {
        const errors = [];
        const warnings = [];
        const normalize = JointSystem._normalizeArmatureFixtureView;
        if (fixture?.format !== JointSystem.ARMATURE_GOLDEN_FIXTURE_FORMAT) errors.push('Fixture format is missing or invalid.');
        if (fixture?.version !== JointSystem.ARMATURE_GOLDEN_FIXTURE_VERSION) warnings.push('Fixture version differs from the current schema.');
        if (!fixture?.kind || !['pose', 'movement'].includes(fixture.kind)) errors.push('Fixture kind must be pose or movement.');
        if (!fixture?.entry || typeof fixture.entry !== 'object') errors.push('Fixture is missing an entry payload.');
        if (!fixture?.logicalAction) warnings.push('Fixture has no logical semantic action.');
        const fixtureAction = String(fixture?.logicalAction || '').trim();
        const entryAction = String(
            fixture?.entry?.logicalAction ||
            fixture?.entry?.semanticAction ||
            ''
        ).trim();
        if (fixtureAction && entryAction && fixtureAction !== entryAction) {
            errors.push(`Fixture logical action "${fixtureAction}" does not match entry action "${entryAction}".`);
        }
        const viewKeys = Array.isArray(fixture.viewCompatibility) && fixture.viewCompatibility.length
            ? fixture.viewCompatibility.map(normalize)
            : [normalize(fixture.viewKey)];
        if (!viewKeys.length || viewKeys.includes('generic')) warnings.push('Fixture has no specific view compatibility.');
        const entryViewKeys = Array.isArray(fixture?.entry?.viewCompatibility) && fixture.entry.viewCompatibility.length
            ? fixture.entry.viewCompatibility.map(normalize).filter(Boolean)
            : [];
        if (viewKeys.length && entryViewKeys.length && !entryViewKeys.some(viewKey => viewKeys.includes(viewKey))) {
            errors.push(`Fixture view compatibility "${viewKeys.join(', ')}" does not match entry view compatibility "${entryViewKeys.join(', ')}".`);
        }
        const contactTargets = new Set((JointSystem.ARMATURE_CONTACT_TARGETS || []).map(value => normalize(value)));
        const validateEntryForView = viewKey => {
            const schema = JointSystem._getArmatureViewSchema(viewKey);
            if (!schema) {
                warnings.push(`No schema found for view "${viewKey}".`);
                return;
            }
            const allowedJoints = new Set(schema.joints || []);
            const allowedParts = new Set(schema.parts || []);
            const frames = fixture.kind === 'movement' && Array.isArray(fixture.entry?.keyframes)
                ? fixture.entry.keyframes
                : [fixture.entry];
            frames.forEach((frame, index) => {
                const label = `${viewKey}.frame[${index}]`;
                Object.keys(frame?.jointAngles || {}).forEach(key => {
                    if (!allowedJoints.has(key)) errors.push(`${label} uses unsupported joint "${key}".`);
                });
                Object.keys(frame?.jointTilts || {}).forEach(key => {
                    if (!allowedJoints.has(key)) errors.push(`${label} uses unsupported joint tilt "${key}".`);
                });
                Object.keys(frame?.partAngles || {}).forEach(key => {
                    if (!allowedParts.has(key)) errors.push(`${label} uses unsupported part "${key}".`);
                });
                Object.keys(frame?.partTilts || {}).forEach(key => {
                    if (!allowedParts.has(key)) errors.push(`${label} uses unsupported part tilt "${key}".`);
                });
                [
                    ...(frame?.layerOrderOverride || []),
                    ...(frame?.frontViewLayerOverride || []),
                    ...(frame?.backViewLayerOverride || [])
                ].forEach(key => {
                    if (!allowedParts.has(key)) errors.push(`${label} uses unsupported layer part "${key}".`);
                });
                Object.entries(frame?.contacts || {}).forEach(([source, contact]) => {
                    const target = normalize(contact?.tag || contact?.target || contact?.bodyTag || '');
                    if (!target || !contactTargets.has(target)) errors.push(`${label}.contacts.${source} targets unknown body tag "${target || 'none'}".`);
                });
            });
            const anatomyReport = JointSystem._validateArmatureGoldenFixtureAnatomy(fixture, viewKey, frames);
            (anatomyReport.warnings || []).forEach(warning => warnings.push(warning));
        };
        viewKeys.forEach(validateEntryForView);
        return { ok: errors.length === 0, errors, warnings };
    }

JointSystem._buildArmatureSemanticPickupSpecs = function() {
        const idleFrame = { t: 0 };
        const endFrame = { t: 1 };
        const frontSquatA = {
            t: 0.18,
            dy: 44,
            head: { tilt: { x: -3, y: 0 } },
            limbs: {
                rightLeg: { hip: 42, knee: -46, ankle: 0 },
                leftLeg: { hip: 42, knee: -46, ankle: 0 },
                rightArm: { shoulder: 10, elbow: -2, wrist: 1 },
                leftArm: { shoulder: -8, elbow: 2, wrist: -1 }
            }
        };
        const frontSquatB = {
            t: 0.34,
            dy: 90,
            head: { tilt: { x: -4, y: 0 } },
            limbs: {
                rightLeg: { hip: 84, knee: -88, ankle: 0 },
                leftLeg: { hip: 84, knee: -88, ankle: 0 },
                rightArm: { shoulder: 18, elbow: -4, wrist: 2 },
                leftArm: { shoulder: -14, elbow: 4, wrist: -2 }
            }
        };
        const frontDeepLegs = {
            rightLeg: { hip: 92, knee: -98, ankle: 0 },
            leftLeg: { hip: 92, knee: -98, ankle: 0 }
        };
        const backSquatA = {
            t: 0.2,
            dy: 55,
            head: { tilt: { x: -4, y: 0 } },
            limbs: {
                leftLeg: { hip: 36, knee: -50, ankle: 0 },
                rightLeg: { hip: -33, knee: 40, ankle: 0 },
                leftArm: { shoulder: 10, elbow: -8, wrist: 1 },
                rightArm: { shoulder: -4, elbow: 4, wrist: 1 }
            }
        };
        const backSquatB = {
            t: 0.36,
            dy: 110,
            head: { tilt: { x: -6, y: 0 } },
            limbs: {
                leftLeg: { hip: 73, knee: -102, ankle: 0 },
                rightLeg: { hip: -66, knee: 81, ankle: 0 },
                leftArm: { shoulder: 30, elbow: -4, wrist: 2 },
                rightArm: { shoulder: 10, elbow: 0, wrist: 1 }
            }
        };
        const backDeepLegs = {
            leftLeg: { hip: 73, knee: -102, ankle: 0 },
            rightLeg: { hip: -66, knee: 81, ankle: 0 }
        };
        const sideFrame = (t, waist, frontShoulder, frontElbow, frontHip, frontKnee, options = {}) => ({
            t,
            dy: options.dy,
            torso: { waist },
            limbs: {
                frontArm: { shoulder: frontShoulder, elbow: frontElbow, wrist: options.frontWrist ?? 0 },
                backArm: { shoulder: options.backShoulder ?? 0, elbow: options.backElbow ?? 0, wrist: 0 },
                frontLeg: { hip: frontHip, knee: frontKnee, ankle: 0 },
                backLeg: { hip: options.backHip ?? 0, knee: options.backKnee ?? 0, ankle: 0 }
            },
            contacts: options.contacts
        });
        const sidePickupFrames = [
            sideFrame(0, 0, 4, -8, 0, 0),
            sideFrame(0.18, 28, -22, -4, -18, 26, { dy: 18 }),
            sideFrame(0.36, 68, -68, 0, -42, 62, { dy: 54 }),
            sideFrame(0.52, 95, -95, 0, -55, 80, { dy: 86, contacts: { nearHand: { target: 'ground', offsetX: 0, offsetY: 0, iterations: 16 } } }),
            sideFrame(0.66, 88, -68, -42, -55, 80, { dy: 86, frontWrist: -6, contacts: { nearHand: { target: 'ground', offsetX: 0, offsetY: -8, iterations: 12 } } }),
            sideFrame(0.82, 34, -18, -30, -24, 36, { dy: 28, frontWrist: -4 }),
            sideFrame(1, 0, 4, -8, 0, 0)
        ];
        const frontBySide = {
            center: [
                idleFrame,
                frontSquatA,
                { ...frontSquatB, dy: 98, torso: { waist: -18 } },
                {
                    t: 0.52,
                    dy: 140,
                    torso: { waist: -67 },
                    head: { tilt: { x: -8, y: 0 } },
                    limbs: {
                        ...frontDeepLegs,
                        rightArm: { shoulder: 30, elbow: 0, wrist: 4 },
                        leftArm: { shoulder: -10, elbow: 0, wrist: 4 }
                    },
                    contacts: { rightHand: { target: 'ground', offsetX: 0, offsetY: 0, iterations: 18 } }
                },
                {
                    t: 0.66,
                    dy: 132,
                    torso: { waist: -46 },
                    head: { tilt: { x: -6, y: 0 } },
                    limbs: {
                        ...frontDeepLegs,
                        rightArm: { shoulder: 36, elbow: -44, wrist: 6 },
                        leftArm: { shoulder: -10, elbow: -4, wrist: 2 }
                    },
                    contacts: { rightHand: { target: 'ground', offsetX: 0, offsetY: -14, iterations: 12 } }
                },
                {
                    t: 0.84,
                    dy: 54,
                    torso: { waist: -16 },
                    head: { tilt: { x: -3, y: 0 } },
                    limbs: {
                        rightLeg: { hip: 32, knee: -38, ankle: 0 },
                        leftLeg: { hip: 32, knee: -38, ankle: 0 },
                        rightArm: { shoulder: 18, elbow: -36, wrist: 4 },
                        leftArm: { shoulder: -6, elbow: -4, wrist: 2 }
                    }
                },
                endFrame
            ],
            right: [
                idleFrame,
                frontSquatA,
                frontSquatB,
                {
                    t: 0.52,
                    dy: 116,
                    torso: { waist: -76 },
                    head: { tilt: { x: -8, y: 0 } },
                    limbs: {
                        ...frontDeepLegs,
                        rightArm: { shoulder: 82, elbow: -4, wrist: 6 },
                        leftArm: { shoulder: -10, elbow: 0, wrist: -4 }
                    },
                    contacts: { rightHand: { target: 'ground', offsetX: 22, offsetY: 0, iterations: 16 } }
                },
                {
                    t: 0.7,
                    dy: 96,
                    torso: { waist: -50 },
                    head: { tilt: { x: -6, y: 0 } },
                    limbs: {
                        rightLeg: { hip: 62, knee: -68, ankle: 0 },
                        leftLeg: { hip: 62, knee: -68, ankle: 0 },
                        rightArm: { shoulder: 60, elbow: -10, wrist: 4 },
                        leftArm: { shoulder: -8, elbow: 0, wrist: -3 }
                    }
                },
                {
                    t: 0.84,
                    dy: 24,
                    torso: { waist: -12 },
                    head: { tilt: { x: -3, y: 0 } },
                    limbs: {
                        rightLeg: { hip: 22, knee: -28, ankle: 0 },
                        leftLeg: { hip: 22, knee: -28, ankle: 0 },
                        rightArm: { shoulder: 18, elbow: -18, wrist: 2 },
                        leftArm: { shoulder: -4, elbow: -4, wrist: -2 }
                    }
                },
                endFrame
            ],
            left: [
                idleFrame,
                {
                    ...frontSquatA,
                    limbs: {
                        rightLeg: { hip: 42, knee: -46, ankle: 0 },
                        leftLeg: { hip: 42, knee: -46, ankle: 0 },
                        rightArm: { shoulder: 8, elbow: -2, wrist: 1 },
                        leftArm: { shoulder: -10, elbow: 2, wrist: -1 }
                    }
                },
                {
                    ...frontSquatB,
                    limbs: {
                        rightLeg: { hip: 84, knee: -88, ankle: 0 },
                        leftLeg: { hip: 84, knee: -88, ankle: 0 },
                        rightArm: { shoulder: 14, elbow: -4, wrist: 2 },
                        leftArm: { shoulder: -18, elbow: 4, wrist: -2 }
                    }
                },
                {
                    t: 0.52,
                    dy: 116,
                    torso: { waist: 76 },
                    head: { tilt: { x: -8, y: 0 } },
                    limbs: {
                        ...frontDeepLegs,
                        rightArm: { shoulder: 10, elbow: 0, wrist: 4 },
                        leftArm: { shoulder: -82, elbow: 4, wrist: -6 }
                    },
                    contacts: { leftHand: { target: 'ground', offsetX: -22, offsetY: 0, iterations: 16 } }
                },
                {
                    t: 0.7,
                    dy: 96,
                    torso: { waist: 50 },
                    head: { tilt: { x: -6, y: 0 } },
                    limbs: {
                        rightLeg: { hip: 62, knee: -68, ankle: 0 },
                        leftLeg: { hip: 62, knee: -68, ankle: 0 },
                        rightArm: { shoulder: 8, elbow: 0, wrist: 3 },
                        leftArm: { shoulder: -60, elbow: 10, wrist: -4 }
                    }
                },
                {
                    t: 0.84,
                    dy: 24,
                    torso: { waist: 12 },
                    head: { tilt: { x: -3, y: 0 } },
                    limbs: {
                        rightLeg: { hip: 22, knee: -28, ankle: 0 },
                        leftLeg: { hip: 22, knee: -28, ankle: 0 },
                        rightArm: { shoulder: 4, elbow: -4, wrist: 2 },
                        leftArm: { shoulder: -18, elbow: 18, wrist: -2 }
                    }
                },
                endFrame
            ]
        };
        const backBySide = {
            center: [
                idleFrame,
                backSquatA,
                backSquatB,
                {
                    t: 0.52,
                    dy: 110,
                    torso: { waist: 13 },
                    head: { tilt: { x: -4, y: 0 } },
                    limbs: {
                        ...backDeepLegs,
                        leftArm: { shoulder: 55, elbow: 75, wrist: 0 },
                        rightArm: { shoulder: -17, elbow: 0, wrist: 0 }
                    },
                    contacts: { leftHand: { target: 'ground', offsetX: 0, offsetY: 0, iterations: 16 } }
                },
                {
                    t: 0.68,
                    dy: 78,
                    torso: { waist: 8 },
                    head: { tilt: { x: -3, y: 0 } },
                    limbs: {
                        leftLeg: { hip: 70, knee: -72, ankle: 0 },
                        rightLeg: { hip: -78, knee: 62, ankle: 0 },
                        leftArm: { shoulder: 40, elbow: 50, wrist: 0 },
                        rightArm: { shoulder: -12, elbow: 0, wrist: 0 }
                    }
                },
                {
                    t: 0.84,
                    dy: 22,
                    torso: { waist: 3 },
                    head: { tilt: { x: -2, y: 0 } },
                    limbs: {
                        leftLeg: { hip: 24, knee: -30, ankle: 0 },
                        rightLeg: { hip: -28, knee: 24, ankle: 0 },
                        leftArm: { shoulder: 18, elbow: 24, wrist: 0 },
                        rightArm: { shoulder: -6, elbow: 0, wrist: 0 }
                    }
                },
                endFrame
            ],
            left: [
                idleFrame,
                backSquatA,
                backSquatB,
                {
                    t: 0.52,
                    dy: 110,
                    torso: { waist: -61 },
                    head: { tilt: { x: -8, y: 0 } },
                    limbs: {
                        ...backDeepLegs,
                        leftArm: { shoulder: 90, elbow: 0, wrist: 0 },
                        rightArm: { shoulder: 21, elbow: 0, wrist: 0 }
                    },
                    contacts: { leftHand: { target: 'ground', offsetX: -22, offsetY: 0, iterations: 16 } }
                },
                {
                    t: 0.68,
                    dy: 78,
                    torso: { waist: -42 },
                    head: { tilt: { x: -5, y: 0 } },
                    limbs: {
                        leftLeg: { hip: 50, knee: -70, ankle: 0 },
                        rightLeg: { hip: -45, knee: 56, ankle: 0 },
                        leftArm: { shoulder: 62, elbow: -8, wrist: -2 },
                        rightArm: { shoulder: 16, elbow: 0, wrist: 0 }
                    }
                },
                endFrame
            ],
            right: [
                idleFrame,
                backSquatA,
                backSquatB,
                {
                    t: 0.52,
                    dy: 110,
                    torso: { waist: 54 },
                    head: { tilt: { x: -8, y: 16 } },
                    limbs: {
                        ...backDeepLegs,
                        leftArm: { shoulder: 1, elbow: 0, wrist: 0 },
                        rightArm: { shoulder: -63, elbow: 0, wrist: 0 }
                    },
                    contacts: { rightHand: { target: 'ground', offsetX: 22, offsetY: 0, iterations: 16 } }
                },
                {
                    t: 0.68,
                    dy: 78,
                    torso: { waist: 32 },
                    head: { tilt: { x: -5, y: 10 } },
                    limbs: {
                        leftLeg: { hip: 50, knee: -70, ankle: 0 },
                        rightLeg: { hip: -45, knee: 56, ankle: 0 },
                        leftArm: { shoulder: 4, elbow: -3, wrist: 0 },
                        rightArm: { shoulder: -44, elbow: 12, wrist: 2 }
                    }
                },
                endFrame
            ]
        };
        const labels = {
            center: ['Semantic Pick Up Center / Drop Object', 'Schema-generated planted-feet pickup between the legs with a visible ground reach and lift beat.'],
            left: ['Semantic Pick Up Left / Drop Object', 'Schema-generated planted-feet pickup from the left side using the left hand.'],
            right: ['Semantic Pick Up Right / Drop Object', 'Schema-generated planted-feet pickup from the right side using the right hand.']
        };
        return ['center', 'left', 'right'].map(side => Object.freeze({
            action: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PICK_UP_DROP,
            key: `semantic-pick-up-drop-${side}`,
            name: labels[side][0],
            icon: 'fa-hand-holding',
            category: 'Daily Activities',
            description: labels[side][1],
            duration: 2400,
            repeat: 1,
            motionIntent: 'squat-and-reach object interaction',
            footPlantPolicy: 'planted-feet-through-reach-and-lift',
            contactTargetPolicy: ['ground'],
            movementPhases: ['idle', 'squat', 'reach', 'lift', 'stand'],
            auditNotes: ['Generated comparison preset', 'Start and end frames intentionally return to idle'],
            keyframesByView: {
                front: frontBySide[side],
                back: backBySide[side],
                sideDual: sidePickupFrames
            }
        }));
    };

JointSystem.ARMATURE_SEMANTIC_COMMUNICATION_MOVEMENT_SPECS = Object.freeze([
        Object.freeze({
            action: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PRESENT_EXPLAIN,
            key: 'semantic-present-explain',
            name: 'Semantic Present / Explain',
            icon: 'fa-person-chalkboard',
            category: 'Communication',
            description: 'Schema-generated open-palmed explanation gesture with predictable near/far arm mapping.',
            visibleInGeneratedCatalogs: false,
            experimentalReason: 'Hidden until rebuilt from verified front/back/side fixture poses; the generic role mapper can produce anatomically poor arm motion.',
            duration: 1800,
            repeat: Infinity,
            motionIntent: 'open-palmed communication gesture',
            keyframes: [
                {
                    t: 0,
                    torso: { plane: 1 },
                    head: { plane: 2 },
                    limbs: {
                        nearArm: { shoulder: 18, elbow: -58, wrist: -4 },
                        farArm: { shoulder: -4, elbow: -12 }
                    }
                },
                {
                    t: 0.5,
                    torso: { plane: -2 },
                    head: { plane: 3 },
                    limbs: {
                        nearArm: { shoulder: -22, elbow: -66, wrist: 8 },
                        farArm: { shoulder: -2, elbow: -10 }
                    }
                },
                {
                    t: 1,
                    torso: { plane: 1 },
                    head: { plane: 2 },
                    limbs: {
                        nearArm: { shoulder: 18, elbow: -58, wrist: -4 },
                        farArm: { shoulder: -4, elbow: -12 }
                    }
                }
            ]
        }),
        Object.freeze({
            action: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PHONE_CALL,
            key: 'semantic-phone-call',
            name: 'Semantic Phone Call',
            icon: 'fa-phone',
            category: 'Communication',
            description: 'Schema-generated hand-to-ear phone pose using the near hand for each view.',
            visibleInGeneratedCatalogs: false,
            experimentalReason: 'Hidden until contact targets are solved from verified per-view fixtures instead of generic near-hand mapping.',
            duration: 1800,
            repeat: Infinity,
            motionIntent: 'hand-to-ear communication gesture',
            contactTargetPolicy: ['ear'],
            contactSourcePolicy: ['near-hand'],
            movementPhases: ['hand-to-ear', 'hold'],
            keyframes: [
                {
                    t: 0,
                    limbs: { nearArm: { shoulder: -85, elbow: -140, wrist: 0 } },
                    contacts: { nearHand: { target: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }
                },
                {
                    t: 1,
                    limbs: { nearArm: { shoulder: -85, elbow: -140, wrist: 0 } },
                    contacts: { nearHand: { target: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }
                }
            ]
        }),
        Object.freeze({
            action: JointSystem.ARMATURE_SEMANTIC_ACTIONS.MICROPHONE_TALK,
            key: 'semantic-microphone-talk',
            name: 'Semantic Microphone Talk',
            icon: 'fa-microphone',
            category: 'Communication',
            description: 'Schema-generated hand-to-mouth microphone pose using the near hand for each view.',
            visibleInGeneratedCatalogs: false,
            experimentalReason: 'Hidden with the contact-gesture batch until the compiler uses validated view-specific hand-to-face fixtures.',
            duration: 1700,
            repeat: Infinity,
            motionIntent: 'hand-to-mouth communication gesture',
            contactTargetPolicy: ['mouth'],
            contactSourcePolicy: ['near-hand'],
            movementPhases: ['hand-to-mouth', 'hold'],
            keyframes: [
                {
                    t: 0,
                    head: { plane: 2 },
                    limbs: { nearArm: { shoulder: -34, elbow: -150, wrist: -2 } },
                    contacts: { nearHand: { target: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }
                },
                {
                    t: 1,
                    head: { plane: 2 },
                    limbs: { nearArm: { shoulder: -34, elbow: -150, wrist: -2 } },
                    contacts: { nearHand: { target: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }
                }
            ]
        }),
        Object.freeze({
            action: JointSystem.ARMATURE_SEMANTIC_ACTIONS.PRAYER,
            key: 'semantic-prayer-worship',
            name: 'Semantic Prayer / Worship',
            icon: 'fa-hands-praying',
            category: 'Gestures',
            description: 'Schema-generated prayer loop with both hands meeting at the sternum.',
            visibleInGeneratedCatalogs: false,
            experimentalReason: 'Hidden until the compiler can preserve mirrored elbow flexion and view-specific hand contacts reliably.',
            duration: 2200,
            repeat: Infinity,
            motionIntent: 'hands-meet-near-sternum gesture',
            contactTargetPolicy: ['sternum'],
            contactSourcePolicy: ['right-hand', 'left-hand'],
            movementPhases: ['hands-meet', 'bow', 'return'],
            keyframes: [
                {
                    t: 0,
                    head: { plane: 3 },
                    limbs: {
                        rightArm: { shoulder: 66, elbow: -104, wrist: -6 },
                        leftArm: { shoulder: -66, elbow: 104, wrist: 6 }
                    },
                    contacts: {
                        rightHand: { target: 'sternum', offsetX: 4, offsetY: 18, iterations: 16 },
                        leftHand: { target: 'sternum', offsetX: -4, offsetY: 18, iterations: 16 }
                    }
                },
                {
                    t: 0.5,
                    torso: { tilt: { x: 4, y: 0 } },
                    head: { plane: 7, tilt: { x: 5, y: 0 } },
                    limbs: {
                        rightArm: { shoulder: 70, elbow: -108, wrist: -6 },
                        leftArm: { shoulder: -70, elbow: 108, wrist: 6 }
                    },
                    contacts: {
                        rightHand: { target: 'sternum', offsetX: 4, offsetY: 20, iterations: 16 },
                        leftHand: { target: 'sternum', offsetX: -4, offsetY: 20, iterations: 16 }
                    }
                },
                {
                    t: 1,
                    head: { plane: 3 },
                    limbs: {
                        rightArm: { shoulder: 66, elbow: -104, wrist: -6 },
                        leftArm: { shoulder: -66, elbow: 104, wrist: 6 }
                    },
                    contacts: {
                        rightHand: { target: 'sternum', offsetX: 4, offsetY: 18, iterations: 16 },
                        leftHand: { target: 'sternum', offsetX: -4, offsetY: 18, iterations: 16 }
                    }
                }
            ]
        }),
        Object.freeze({
            action: JointSystem.ARMATURE_SEMANTIC_ACTIONS.CARRY_TRAY,
            key: 'semantic-carry-tray-balance',
            name: 'Semantic Carry Tray Balance',
            icon: 'fa-grip-lines',
            category: 'Daily Activities',
            description: 'Schema-generated two-hand tray carry with balanced forearms and stable torso.',
            visibleInGeneratedCatalogs: false,
            experimentalReason: 'Hidden until back/side tray poses are generated from verified support-arm fixtures.',
            duration: 1800,
            repeat: Infinity,
            motionIntent: 'two-hand-supported object gesture',
            contactTargetPolicy: ['sternum'],
            contactSourcePolicy: ['right-hand', 'left-hand'],
            movementPhases: ['support-tray', 'balance'],
            keyframes: [
                {
                    t: 0,
                    torso: { plane: -1 },
                    head: { plane: 1 },
                    limbs: {
                        rightArm: { shoulder: 34, elbow: -92, wrist: -4 },
                        leftArm: { shoulder: -34, elbow: 92, wrist: 4 }
                    },
                    contacts: {
                        rightHand: { target: 'sternum', offsetX: 26, offsetY: 54, iterations: 12 },
                        leftHand: { target: 'sternum', offsetX: -26, offsetY: 54, iterations: 12 }
                    }
                },
                {
                    t: 0.5,
                    torso: { plane: 1 },
                    head: { plane: -1 },
                    limbs: {
                        rightArm: { shoulder: 32, elbow: -88, wrist: -2 },
                        leftArm: { shoulder: -32, elbow: 88, wrist: 2 }
                    },
                    contacts: {
                        rightHand: { target: 'sternum', offsetX: 28, offsetY: 56, iterations: 12 },
                        leftHand: { target: 'sternum', offsetX: -28, offsetY: 56, iterations: 12 }
                    }
                },
                {
                    t: 1,
                    torso: { plane: -1 },
                    head: { plane: 1 },
                    limbs: {
                        rightArm: { shoulder: 34, elbow: -92, wrist: -4 },
                        leftArm: { shoulder: -34, elbow: 92, wrist: 4 }
                    },
                    contacts: {
                        rightHand: { target: 'sternum', offsetX: 26, offsetY: 54, iterations: 12 },
                        leftHand: { target: 'sternum', offsetX: -26, offsetY: 54, iterations: 12 }
                    }
                }
            ]
        }),
        ...JointSystem._buildArmatureSemanticPickupSpecs()
    ]);

JointSystem._getArmatureSemanticFixtureApproval = function(spec = {}, viewName = '', options = {}) {
        const fixtures = Array.isArray(options.goldenFixtures) ? options.goldenFixtures : [];
        const expectedAction = String(spec.semanticAction || spec.action || '').trim();
        if (!fixtures.length || !expectedAction) return null;

        const normalize = JointSystem._normalizeArmatureFixtureView;
        const targetView = normalize(viewName);
        const viewCompatibility = Array.isArray(options.viewCompatibility) && options.viewCompatibility.length
            ? options.viewCompatibility.map(normalize).filter(Boolean)
            : [targetView].filter(Boolean);
        const acceptedQualities = new Set(['approved', 'golden']);
        return fixtures.find(fixture => {
            if (!fixture || typeof fixture !== 'object') return false;
            if (fixture.kind && fixture.kind !== 'movement') return false;
            if (!acceptedQualities.has(String(fixture.quality || 'approved').toLowerCase())) return false;
            const fixtureAction = String(
                fixture.logicalAction ||
                fixture.semanticAction ||
                fixture.entry?.semanticAction ||
                ''
            ).trim();
            if (fixtureAction !== expectedAction) return false;

            const fixtureViews = Array.isArray(fixture.viewCompatibility) && fixture.viewCompatibility.length
                ? fixture.viewCompatibility.map(normalize).filter(Boolean)
                : [normalize(fixture.viewKey)].filter(Boolean);
            const matchesView = fixtureViews.some(view =>
                view === targetView || viewCompatibility.includes(view)
            );
            if (!matchesView) return false;

            const validation = JointSystem._validateArmatureGoldenFixture?.(fixture);
            return validation?.ok !== false;
        }) || null;
    }

JointSystem._shouldExposeArmatureSemanticSpec = function(spec = {}, viewName = '', options = {}) {
        if (!spec || typeof spec !== 'object') return { expose: false, fixture: null };
        if (spec.visibleInGeneratedCatalogs !== false) return { expose: true, fixture: null };
        if (options.includeExperimentalSemantic) return { expose: true, fixture: null };
        if (!options.includeFixtureApprovedSemantic) return { expose: false, fixture: null };
        const fixture = JointSystem._getArmatureSemanticFixtureApproval(spec, viewName, options);
        return { expose: !!fixture, fixture };
    }

JointSystem._addArmatureSemanticCommunicationMovements = function(catalog, viewName, options = {}) {
        if (!catalog || typeof catalog !== 'object') return catalog;
        const normalizedView = String(viewName || '').trim().toLowerCase();
        if (!normalizedView) return catalog;
        const suffix = normalizedView.replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
        const viewCompatibility = Array.isArray(options.viewCompatibility) && options.viewCompatibility.length
            ? options.viewCompatibility
            : [normalizedView];

        (JointSystem.ARMATURE_SEMANTIC_COMMUNICATION_MOVEMENT_SPECS || []).forEach(spec => {
            if (!spec) return;
            const exposure = JointSystem._shouldExposeArmatureSemanticSpec(spec, normalizedView, {
                ...options,
                viewCompatibility
            });
            if (!exposure.expose) {
                return;
            }
            const compiled = JointSystem._compileArmatureSemanticMovement(
                {
                    ...spec,
                    key: `${spec.key}-${suffix}`,
                    name: `${spec.name} (${options.label || normalizedView})`
                },
                normalizedView,
                { viewCompatibility }
            );
            if (exposure.fixture) {
                compiled.fixtureGatedSemantic = true;
                compiled.unlockedByGoldenFixture = true;
                compiled.goldenFixtureSourceId = exposure.fixture.id || exposure.fixture.key || '';
            }
            catalog[compiled.key] = compiled;
        });
        return catalog;
    }

JointSystem._tagArmatureSemanticAction = function(entry, semanticAction, options = {}) {
        if (!entry || typeof entry !== 'object' || !semanticAction) return entry;
        if (!entry.semanticAction) {
            entry.semanticAction = semanticAction;
        }
        if (!entry.semanticFamily) {
            entry.semanticFamily = String(semanticAction).split('.')[0] || 'uncategorized';
        }
        if (options.motionIntent && !entry.motionIntent) {
            entry.motionIntent = options.motionIntent;
        }
        if (!entry.authoringConvention) {
            entry.authoringConvention = JointSystem.ARMATURE_ANATOMY_CONVENTIONS.angle;
        }
        return entry;
    }

JointSystem._tagArmatureCatalogSemanticActions = function(catalog, rules = JointSystem.ARMATURE_SEMANTIC_ACTION_RULES) {
        if (!catalog || typeof catalog !== 'object') return catalog;
        const usableRules = Array.isArray(rules) ? rules : [];
        Object.entries(catalog).forEach(([key, entry]) => {
            if (!entry || typeof entry !== 'object') return;
            const haystack = `${key} ${entry.name || ''} ${entry.category || ''} ${entry.description || ''}`;
            const rule = usableRules.find(candidate => candidate?.match?.test?.(haystack));
            if (!rule) return;
            JointSystem._tagArmatureSemanticAction(entry, rule.semanticAction, rule);
        });
        return catalog;
    }

JointSystem.FRONT_ARMS_OVER_TORSO_LAYER_ORDER = ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'];

JointSystem._applyFrontArmsOverTorsoLayering = function(entry) {
        if (!entry) return entry;
        const order = Utils.deepClone(JointSystem.FRONT_ARMS_OVER_TORSO_LAYER_ORDER);
        if (Array.isArray(entry.keyframes)) {
            entry.keyframes.forEach(frame => {
                if (!frame || Array.isArray(frame.backViewLayerOverride)) return;
                frame.frontViewLayerOverride = Utils.deepClone(order);
                frame.layerOrderOverride = Utils.deepClone(order);
                frame.threeQuarterLayerOverride = true;
            });
        } else if (!Array.isArray(entry.backViewLayerOverride)) {
            entry.frontViewLayerOverride = Utils.deepClone(order);
            entry.layerOrderOverride = Utils.deepClone(order);
            entry.threeQuarterLayerOverride = true;
        }
        return entry;
    }

// ── Armature → human-front bridge ──────────────────────────────────────────
// Inverse of the human-front → armature converters above. Used to surface the
// richer hand-authored ARMATURE_MOVEMENTS in the front-angle Joint Movements
// picker (deduped by name) WITHOUT re-authoring them — the same bridge pattern
// used for expressive poses. ARMATURE_MOVEMENTS jointAngles are already rebased
// to the down baseline at runtime, so they map 1:1 onto front relative angles
// (left side negated, matching _convertHumanFrontAnglesToArmaturePoseData).
JointSystem._convertArmatureJointAnglesToHumanFront = function(jointAngles = {}, partAngles = {}) {
        const angles = {};
        const set = (frontKey, jointName, invert = false) => {
            const v = jointAngles?.[jointName];
            if (Number.isFinite(v)) angles[frontKey] = invert ? -v : v;
        };
        set('r-upper-arm', 'right-shoulder');
        set('l-upper-arm', 'left-shoulder', true);
        set('r-forearm', 'right-elbow');
        set('l-forearm', 'left-elbow', true);
        set('r-hand', 'right-wrist');
        set('l-hand', 'left-wrist', true);
        set('r-upper-leg', 'right-hip');
        set('l-upper-leg', 'left-hip', true);
        set('r-lower-leg', 'right-knee');
        set('l-lower-leg', 'left-knee', true);
        set('r-foot', 'right-ankle');
        set('l-foot', 'left-ankle', true);
        if (Number.isFinite(jointAngles?.['neck'])) angles.head = jointAngles['neck'];
        if (Number.isFinite(partAngles?.torso)) angles.torso = partAngles.torso;
        return angles;
    }

JointSystem._convertArmatureTiltsToHumanFront = function(jointTilts = {}, partTilts = {}) {
        const tilts = {};
        const copyTiltFrom = (frontKey, source, sourceKey) => {
            const v = source?.[sourceKey];
            if (!v || typeof v !== 'object') return;
            const x = Number.isFinite(v.x) ? v.x : 0;
            const y = Number.isFinite(v.y) ? v.y : 0;
            if (!x && !y) return;
            tilts[frontKey] = { x, y };
        };
        const copyPartTilt = (frontKey, sourceKey) => copyTiltFrom(frontKey, partTilts, sourceKey);
        const copyJointTilt = (frontKey, sourceKey) => copyTiltFrom(frontKey, jointTilts, sourceKey);

        copyPartTilt('torso', 'torso');
        copyPartTilt('head', 'head-neck');
        copyPartTilt('r-upper-arm', 'right-arm');
        copyPartTilt('l-upper-arm', 'left-arm');
        copyPartTilt('r-upper-leg', 'right-leg');
        copyPartTilt('l-upper-leg', 'left-leg');

        copyJointTilt('r-upper-arm', 'right-shoulder');
        copyJointTilt('l-upper-arm', 'left-shoulder');
        copyJointTilt('r-forearm', 'right-elbow');
        copyJointTilt('l-forearm', 'left-elbow');
        copyJointTilt('r-hand', 'right-wrist');
        copyJointTilt('l-hand', 'left-wrist');
        copyJointTilt('r-upper-leg', 'right-hip');
        copyJointTilt('l-upper-leg', 'left-hip');
        copyJointTilt('r-lower-leg', 'right-knee');
        copyJointTilt('l-lower-leg', 'left-knee');
        copyJointTilt('r-foot', 'right-ankle');
        copyJointTilt('l-foot', 'left-ankle');
        copyJointTilt('head', 'neck');
        return tilts;
    }

JointSystem._convertArmatureContactsToHumanFront = function(contacts = {}) {
        const result = {};
        const mapKey = (sourceKey) => {
            switch (sourceKey) {
                case 'right-hand': return 'r-hand';
                case 'left-hand': return 'l-hand';
                case 'right-foot': return 'r-foot';
                case 'left-foot': return 'l-foot';
                default: return sourceKey;
            }
        };
        Object.entries(contacts || {}).forEach(([sourceKey, spec]) => {
            const mapped = mapKey(sourceKey);
            if (!mapped) return;
            result[mapped] = JSON.parse(JSON.stringify(spec));
        });
        return result;
    }

// Convert one ARMATURE_MOVEMENTS entry into a front-angle JointMovements-shaped
// movement. Resolves keyframes that reference a named armature pose, converts
// jointAngles/partAngles/tilts/contacts/dx/dy, and carries layer-order overrides.
JointSystem._convertArmatureMovementToHumanFront = function(key, entry) {
        if (!entry || !Array.isArray(entry.keyframes) || !entry.keyframes.length) return null;
        const resolveFrameAngles = (kf) => {
            let jointAngles = kf.jointAngles;
            let partAngles = kf.partAngles;
            if (kf.pose && (!jointAngles || !Object.keys(jointAngles).length)) {
                const pose = JointSystem.ARMATURE_POSES?.[kf.pose];
                if (pose) {
                    jointAngles = pose.jointAngles;
                    partAngles = pose.partAngles;
                }
            }
            return { jointAngles: jointAngles || {}, partAngles: partAngles || {} };
        };
        const keyframes = entry.keyframes.map(kf => {
            const { jointAngles, partAngles } = resolveFrameAngles(kf);
            const frame = { t: kf.t };
            frame.angles = JointSystem._convertArmatureJointAnglesToHumanFront(jointAngles, partAngles);
            const tilts = JointSystem._convertArmatureTiltsToHumanFront(kf.jointTilts, kf.partTilts);
            if (Object.keys(tilts).length) frame.tilts = tilts;
            const hasDx = Number.isFinite(kf.dx);
            const hasDy = Number.isFinite(kf.dy);
            if (kf.offsets && typeof kf.offsets === 'object') {
                frame.offsets = JSON.parse(JSON.stringify(kf.offsets));
            }
            if (hasDx || hasDy) {
                const offsets = frame.offsets && typeof frame.offsets === 'object' ? frame.offsets : {};
                const torso = offsets.torso && typeof offsets.torso === 'object' ? { ...offsets.torso } : {};
                if (hasDx) torso.x = kf.dx;
                if (hasDy) torso.y = kf.dy;
                frame.offsets = { ...offsets, torso };
            }
            const contacts = JointSystem._convertArmatureContactsToHumanFront(kf.contacts);
            if (Object.keys(contacts).length) frame.contacts = contacts;
            JointSystem._copyArmatureLayerOverrideFields(frame, kf);
            return frame;
        });
        return {
            key: 'armature-move-' + key,
            name: entry.name || key,
            icon: entry.icon || 'fa-play',
            category: entry.category || 'Action',
            description: entry.description || `Ported from the Pose Armature "${entry.name || key}" movement.`,
            presetKeys: ['human-front'],
            duration: entry.duration || 1000,
            easing: entry.easing || 'easeInOut',
            repeat: entry.repeat ?? 1,
            keyframes
        };
    }

// The hand-authored action movements that live only in ARMATURE_MOVEMENTS (i.e.
// not already produced from JointMovements). Converted on demand to front-angle
// so the Joint Movements picker can offer them for any assembled human rig.
JointSystem._getArmaturePortedFrontMovements = function() {
        const keys = [
            'walk-cycle', 'run-cycle', 'idle-breathe', 'wave-cycle', 'jump', 'dance',
            'nod-yes', 'jumping-jacks', 'clap', 'shake-head', 'beckon', 'look-around',
            'present-explain', 'present-explain-alternate-right', 'present-explain-alternate-left',
            'listen-agree', 'startled-reaction', 'call-attention', 'phone-call-pre-ear-loop',
            'sway', 'fidget', 'march', 'sneak', 'punch-combo', 'kick-combo', 'boxing',
            'celebrate-bounce', 'excited-hop', 'turn-right', 'turn-left'
        ];
        const out = [];
        keys.forEach(key => {
            const entry = JointSystem.ARMATURE_MOVEMENTS?.[key];
            if (!entry) return;
            const move = JointSystem._convertArmatureMovementToHumanFront(key, entry);
            if (move) out.push(move);
        });
        return out;
    }

JointSystem._shouldRebuildHumanFrontArmatureMovementCatalog = function(catalog) {
        if (!catalog) return true;
        if (Object.values(catalog).some(move => move?.repeat === null)) return true;
        if (catalog.wave && catalog['wave-cycle']) return true;
        if (catalog.idle && catalog['idle-breathe']) return true;
        if ([
            'present-explain',
            'present-explain-alternate-right',
            'present-explain-alternate-left',
            'listen-agree',
            'startled-reaction',
            'call-attention',
            'phone-call-loop',
            'phone-call-pre-ear-loop',
            'microphone-talk',
            'prayer-worship-loop',
            'carry-tray-walk-prep',
            'front-strut-forward-y',
            'front-stroll-forward-y',
            'front-3q-walk-to-point-and-back-left',
            'front-3q-walk-to-point-and-back-right',
            'front-3q-strut-to-point-and-back-left',
            'front-3q-strut-to-point-and-back-right',
            'front-3q-stroll-to-point-and-back-left',
            'front-3q-stroll-to-point-and-back-right',
            'guided-run-travel',
            'front-3q-run-to-point-and-back-left',
            'front-3q-run-to-point-and-back-right',
            'guided-strong-run-travel',
            'front-3q-strong-run-to-point-and-back-left',
            'front-3q-strong-run-to-point-and-back-right',
            'strut-to-point-and-back',
            'stroll-to-point-and-back',
            'turn-around-flip'
        ].some(key => !catalog[key])) return true;
        if (catalog.clap?.keyframes?.some(frame => frame && !Array.isArray(frame.layerOrderOverride))) return true;
        if (catalog['punch-combo']?.keyframes?.some(frame => frame && !frame.pose && !Array.isArray(frame.layerOrderOverride))) return true;
        return false;
    }

JointSystem._shouldRebuildHumanSideArmatureMovementCatalog = function(catalog) {
        if (!catalog) return true;
        if (Object.values(catalog).some(move => move?.repeat === null)) return true;
        if ([
            'idle-breathe',
            'wave',
            'present-explain',
            'walk-cycle',
            'run-cycle',
            'walk-to-point-and-back',
            'walk-cycle-compare-loop',
            'turn-around-flip',
            'nod-yes',
            'shake-head',
            'look-around',
            'look-up-return',
            'look-down-return'
        ].some(key => !catalog[key])) return true;
        return false;
    };

JointSystem._ensureArmatureFrontBackFlipMovement = function(catalog, facing = 'front') {
        if (!catalog) return catalog;
        if (!catalog['turn-around-flip']) {
            const fromLabel = facing === 'back' ? 'back' : 'front';
            const toLabel = facing === 'back' ? 'front' : 'back';
            catalog['turn-around-flip'] = {
                name: 'Turn Around (Flip)',
                icon: 'fa-arrows-left-right',
                category: 'Travel',
                description: `Turn this ${fromLabel}-view character to ${toLabel} view in place. Use between walk cycles when the character needs to face the opposite direction.`,
                duration: 420,
                repeat: 1,
                flipInPlace: true,
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.FLIP,
                semanticFamily: 'orientation',
                motionIntent: 'view-orientation transition',
                authoringConvention: JointSystem.ARMATURE_ANATOMY_CONVENTIONS.rotation,
                viewCompatibility: ['front', 'back', 'front-3q-left', 'front-3q-right', 'back-3q-left', 'back-3q-right'],
                keyframes: [
                    { t: 0, jointAngles: {}, partAngles: {} },
                    { t: 1, jointAngles: {}, partAngles: {} }
                ]
            };
        }
        return catalog;
    };

JointSystem._finalizeHumanFrontArmatureMovementCatalog = function(catalog) {
        if (!catalog) return catalog;

        JointSystem._normalizeArmatureMovementCatalogEntryDefaults(catalog);
        JointSystem._applyDefaultArmatureMovementCompatibility(catalog, ['front']);
        JointSystem._addHumanFrontBackHeadMovements(catalog, 'front');
        JointSystem._ensureArmatureFrontBackFlipMovement(catalog, 'front');
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'front', {
            label: 'Front',
            viewCompatibility: ['front']
        });
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'front-3q-left', {
            label: 'Front 3/4 Left',
            viewCompatibility: ['front-3q-left']
        });
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'front-3q-right', {
            label: 'Front 3/4 Right',
            viewCompatibility: ['front-3q-right']
        });
        JointSystem._tagArmatureCatalogSemanticActions(catalog);

        if (catalog.wave) {
            catalog.wave.name = 'Wave Right';
        }
        if (catalog.idle) {
            catalog.idle.name = 'Idle Breathe';
        }
        if (catalog['hands-on-hips']) {
            catalog['hands-on-hips'].name = 'Hands on Hips Hold';
        }
        if (catalog.confident) {
            catalog.confident.name = 'Confident Stance';
        }
        if (catalog.nod) {
            catalog.nod.name = 'Nod Yes (Simple)';
        }
        if (catalog.boxing) {
            catalog.boxing.name = 'Boxing Stance';
        }

        // Remove legacy duplicates now covered by the curated front-move set.
        if (catalog.wave && catalog['wave-cycle']) {
            delete catalog['wave-cycle'];
        }
        if (catalog.idle && catalog['idle-breathe']) {
            delete catalog['idle-breathe'];
        }
        if (catalog['front-walk-cycle'] && catalog['walk-cycle']) {
            delete catalog['walk-cycle'];
        }

        [
            'clap',
            'beckon',
            'present-explain',
            'present-explain-alternate-right',
            'present-explain-alternate-left',
            'listen-agree',
            'startled-reaction',
            'call-attention',
            'phone-call-loop',
            'microphone-talk',
            'prayer-worship-loop',
            'carry-tray-walk-prep',
            'punch-combo',
            'boxing',
            'boxing-jab',
            'front-jab',
            'uppercut',
            'guard',
            'aiming-prop-two-hand',
            'reading-book',
            'writing-typing',
            'read-book-seated',
            'write-seated',
            'type-seated',
            'eat',
            'drink',
            'talking-gesture',
            'talking-gestures',
            'drinking',
            'sit-eating',
            'arms-crossed',
            'crossed-arms',
            'handshake',
            'handshake-front',
            'combat-idle',
            'combat-ready',
            'defensive-guard'
        ].forEach(key => {
            if (catalog[key]) JointSystem._applyFrontArmsOverTorsoLayering(catalog[key]);
        });

        return catalog;
    }

JointSystem._finalizeHumanSideArmatureMovementCatalog = function(catalog) {
        if (!catalog) return catalog;

        JointSystem._normalizeArmatureMovementCatalogEntryDefaults(catalog);
        JointSystem._applyDefaultArmatureMovementCompatibility(catalog, ['side']);
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        if (catalog.wave) {
            catalog.wave.name = 'Wave Loop';
        }
        if (catalog['guard-bob']) {
            catalog['guard-bob'].name = 'Boxing Guard Bob';
        }
        if (catalog['tip-toe-sneak']) {
            catalog['tip-toe-sneak'].name = 'Sneak / Tip-Toe';
        }
        if (catalog['read-book-seated'] && catalog['read-book-side-seated']) {
            catalog['read-book-seated'].name = 'Read Book (Seated · Basic)';
        }
        if (catalog['write-seated'] && catalog['write-side-seated']) {
            catalog['write-seated'].name = 'Write (Seated · Basic)';
        }
        if (catalog['type-seated'] && catalog['type-side-seated']) {
            catalog['type-seated'].name = 'Type (Seated · Basic)';
        }

        JointSystem._alignPhoneMovementPoses(catalog, JointSystem._buildHumanSideArmaturePoseCatalog(), '-side');
        return catalog;
    }

JointSystem._alignPhoneMovementPoses = function(catalog, poses, suffix = '') {
    for (const key of ['phone-call', 'phone-call-pre-ear', 'hold-microphone']) {
        const move = catalog[key === 'hold-microphone' ? 'microphone-talk' : `${key}-loop`], pose = poses[`${key}${suffix}`];
        if (!move?.keyframes?.length || !pose) continue;
        const first = { ...move.keyframes[0].jointAngles };
        for (const frame of move.keyframes) {
            for (const [joint, value] of Object.entries(pose.jointAngles || {})) {
                if (/shoulder|elbow|wrist/.test(joint)) frame.jointAngles[joint] = value + ((frame.jointAngles[joint] ?? first[joint] ?? 0) - (first[joint] ?? 0));
            }
            frame.contacts = Utils.deepClone(pose.contacts || {});
        }
    }
};

JointSystem._addHandgunViewPresets = function(catalog, view, movement = false) {
    const side = view !== 'back';
    const pose = side ? (view === 'side-dual'
        ? JointSystem._buildHumanSideDualArmState({ frontShoulder: -85, frontElbow: -5, frontWrist: 0 })
        : JointSystem._convertHumanSideAnglesToArmaturePoseData({ 'upper-arm': -85, forearm: -5, hand: 0 }))
        : { jointAngles: {}, contacts: { 'right-hand': { targetPart: 'torso', x: .6, y: .2, mouthReach: true, palmGrip: .5 } } };
    pose.layerOrderOverride = side ? (view === 'side-dual'
        ? ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm']
        : ['leg', 'torso', 'head-neck', 'arm'])
        : ['right-arm', 'left-arm', 'right-leg', 'left-leg', 'head-neck', 'torso'];
    const suffix = side ? 'side' : 'back';
    if (!movement) {
        catalog[`aim-handgun-${suffix}`] = { ...pose, name: 'Aim Handgun Forward', icon: 'fa-bullseye', category: 'Action', viewCompatibility: [side ? 'side' : 'back'] };
        JointSystem._addRiflePresets(catalog);
        return;
    }
    const frame = (t, recoil = false) => {
        const result = { ...Utils.deepClone(pose), t, shootingRecoil: recoil };
        if (recoil && side) {
            const shoulder = Object.keys(result.jointAngles).find(key => /shoulder/.test(key));
            result.jointAngles[shoulder] += 4;
        } else if (recoil) result.contacts['right-hand'].y = .17;
        return result;
    };
    catalog[`shoot-handgun-${suffix}`] = { name: 'Shoot Handgun Forward', icon: 'fa-bullseye', category: 'Action',
        duration: 3000, repeat: 1, easing: 'easeInOut', smoothContacts: true, restContactTransitions: true,
        viewCompatibility: [side ? 'side' : 'back'],
        keyframes: [{ t: 0, jointAngles: {} }, frame(.3), frame(.48), frame(.52, true), frame(.62), frame(.75), { t: 1, jointAngles: {} }] };
    JointSystem._addRiflePresets(catalog);
};

// Shared action metadata keeps the movement picker and activity-kit mapping aligned.
JointSystem.lifeScenarios = [
    { id: 'market-produce', name: 'Market - Show Produce', prop: 'life-produce', duration: 4200, beats: [[.2,'right',.38],[.42,'right',.28,.06],[.7,'right',.34]] },
    { id: 'market-price', name: 'Market - Display Price Sign', prop: 'life-price-sign', duration: 4600, beats: [[.25,'right',.28],[.68,'right',.28],[.8,'right',.34]] },
    { id: 'market-receipt', name: 'Market - Offer Receipt', prop: 'life-receipt', duration: 3800, beats: [[.2,'right',.5],[.48,'right',.34,.12],[.7,'right',.34,.12]] },
    { id: 'travel-ticket', name: 'Travel - Show Ticket', prop: 'life-ticket', duration: 3800, beats: [[.2,'right',.43],[.45,'right',.27,.06],[.72,'right',.27,.06]] },
    { id: 'office-id', name: 'Office - Show ID Badge', prop: 'life-id-badge', duration: 4000, beats: [[.2,'right',.28],[.4,'right',.22],[.7,'right',.22]] },
    { id: 'office-envelope', name: 'Office - Offer Envelope', prop: 'life-envelope', duration: 4400, beats: [[.2,'right',.48],[.45,'right',.35,.13],[.72,'right',.35,.13]] },
    { id: 'home-keys', name: 'Home - Offer Keys', prop: 'life-keys', duration: 3600, swing: 10, beats: [[.2,'right',.4],[.4,'right',.3,.08],[.6,'right',.34,.06],[.8,'right',.3,.08]] },
    { id: 'home-bottle', name: 'Home - Offer Water Bottle', prop: 'life-water-bottle', duration: 4200, beats: [[.2,'right',.5],[.48,'right',.36,.08],[.72,'right',.36,.08]] },
    { id: 'clinic-package', name: 'Clinic - Show Medicine Package', prop: 'life-medicine-box', duration: 4800, beats: [[.2,'right',.32],[.4,'right',.27,.04],[.62,'right',.3,-.02],[.8,'right',.3]] },
    { id: 'clinic-sample', name: 'Clinic - Inspect Sealed Sample', prop: 'life-sample', duration: 4800, lookDown: true, swing: 5, beats: [[.2,'right',.36],[.4,'right',.28],[.6,'right',.32,.03],[.8,'right',.36]] },
    { id: 'school-card', name: 'Classroom - Show Learning Card', prop: 'life-learning-card', duration: 5000, beats: [[.2,'right',.3],[.42,'right',.24,.06],[.65,'right',.24,-.02],[.8,'right',.3]] },
    { id: 'sports-flag', name: 'Sports - Signal With Flag', prop: 'life-signal-flag', duration: 4200, swing: 24, beats: [[.2,'right',.27],[.35,'right',.16,.12],[.5,'right',.26,.04],[.65,'right',.16,.12],[.8,'right',.27]] },
    { id: 'celebration-trophy', name: 'Celebration - Raise Trophy', prop: 'life-trophy', duration: 5000, beats: [[.22,'right',.4],[.45,'right',.2],[.72,'right',.2],[.84,'right',.35]] },
    { id: 'community-bell', name: 'Community - Ring Handbell', prop: 'life-handbell', duration: 4000, swing: 22, beats: [[.18,'right',.35],[.32,'right',.28],[.45,'right',.4],[.58,'right',.28],[.72,'right',.4],[.84,'right',.35]] },
    { id: 'culture-calabash', name: 'Community - Offer Calabash', prop: 'life-calabash', duration: 5000, twoHands: true, beats: [[.2,'both',.57],[.45,'both',.44,.04],[.72,'both',.44,.04],[.84,'both',.54]] },
    { id: 'market-basket', name: 'Market - Show Woven Basket', prop: 'life-woven-basket', duration: 5000, twoHands: true, beats: [[.22,'both',.6],[.45,'both',.5,.04],[.72,'both',.5,.04],[.84,'both',.58]] },
    { id: 'home-remote', name: 'Home - Use Remote Control', prop: 'life-remote', duration: 4000, swing: 5, beats: [[.2,'right',.42],[.4,'right',.32,.08],[.52,'right',.35,.07],[.68,'right',.32,.08],[.8,'right',.42]] },
    { id: 'travel-passport', name: 'Travel - Show Passport', prop: 'life-passport', duration: 4200, beats: [[.2,'right',.4],[.43,'right',.26,.05],[.72,'right',.26,.05]] },
    { id: 'workshop-wrench', name: 'Workshop - Inspect Wrench', prop: 'life-wrench', duration: 4600, lookDown: true, swing: 15, beats: [[.2,'right',.42],[.4,'right',.3,.02],[.6,'right',.36,.04],[.8,'right',.42]] },
    { id: 'garden-seeds', name: 'Garden - Show Seed Packet', prop: 'life-seed-packet', duration: 4200, beats: [[.2,'right',.45],[.45,'right',.3,.04],[.72,'right',.3,.04]] },
    { id: 'celebration-gift', name: 'Celebration - Offer Gift Box', prop: 'life-gift-box', duration: 5000, twoHands: true, beats: [[.22,'both',.55],[.45,'both',.43,.03],[.72,'both',.43,.03],[.85,'both',.52]] },
    { id: 'home-flower', name: 'Home - Offer Flower', prop: 'life-flower', duration: 4800, beats: [[.2,'right',.46],[.45,'right',.34,.1],[.74,'right',.34,.1]] },
    { id: 'work-checklist', name: 'Work - Check Clipboard', prop: 'life-clipboard', duration: 5200, lookDown: true, beats: [[.2,'right',.44],[.4,'right',.38],[.6,'right',.4,.02],[.8,'right',.44]] },
    { id: 'travel-map', name: 'Travel - Examine Folded Map', prop: 'life-map', duration: 5200, twoHands: true, lookDown: true, beats: [[.2,'both',.53],[.4,'both',.44],[.65,'both',.46,.02],[.8,'both',.5]] }
];

JointSystem._addScenarioMovements = function(catalog, view) {
    const side = view.startsWith('side'), dual = view === 'side-dual', rear = view === 'back';
    const layers = side ? (dual ? ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm']
        : ['leg', 'torso', 'head-neck', 'arm']) : rear
        ? ['left-arm', 'right-arm', 'left-leg', 'right-leg', 'head-neck', 'torso']
        : ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'];
    const frame = (t, hand = '', y = .4, spread = 0) => {
        const result = { t, jointAngles: {}, contacts: {}, layerOrderOverride: [...layers] };
        for (const which of hand === 'both' ? ['right', 'left'] : hand ? [hand] : []) {
            if (side) {
                if (!dual && which === 'left') continue;
                const prefix = dual ? (which === 'right' ? 'front-' : 'back-') : '';
                result.jointAngles[`${prefix}shoulder`] = -22 - (0.4 - y) * 80;
                result.jointAngles[`${prefix}elbow`] = -72 - spread * 70;
                result.jointAngles[`${prefix}wrist`] = 0;
            } else {
                const x = which === 'right' ? .42 - spread : .58 + spread;
                result.contacts[`${which}-hand`] = { targetPart: 'torso', x: rear ? 1 - x : x, y,
                    mouthReach: true, palmGrip: .65, iterations: 24 };
            }
        }
        return result;
    };
    const add = (key, name, frames, options = {}) => {
        if (key.startsWith('gesture-') && !side) {
            for (const pose of frames) for (const contact of Object.values(pose.contacts)) contact.y -= .14;
        }
        catalog[key] = { name, icon: 'fa-comments', category: 'Communication', duration: 4200,
            repeat: 1, easing: 'easeInOut', smoothContacts: true, restContactTransitions: true,
            viewCompatibility: [side ? 'side' : view], keyframes: frames, ...options };
    };
    for (const hand of ['right', 'left']) {
        if (side && !dual && hand === 'left') continue;
        const label = side ? (hand === 'right' ? 'Front Hand' : 'Back Hand') : `${hand === 'right' ? 'Right' : 'Left'} Hand`;
        add(`gesture-forward-${hand}`, `Forward Gesture (${label})`, [frame(0), frame(.2, hand),
            frame(.38, hand, .32, .03), frame(.55, hand), frame(.72, hand, .35), frame(1)]);
    }
    if (!side || dual) {
        add('gesture-forward-alternate', 'Forward Gestures (Alternating)', [frame(0), frame(.12, 'right'),
            frame(.24, 'right', .32, .03), frame(.36, 'right'), frame(.48), frame(.6, 'left'),
            frame(.72, 'left', .32, .03), frame(.84, 'left'), frame(1)], { duration: 6000 });
        add('gesture-forward-emphasis', 'Forward Gestures (Two-Hand Emphasis)', [frame(0), frame(.2, 'both'),
            frame(.4, 'both', .31, .04), frame(.62, 'both'), frame(.78, 'both', .35, .02), frame(1)]);
    }
    add('scenario-show-document', 'Show Document', [frame(0), frame(.25, 'right', .3), frame(.45, 'right', .3, .03),
        frame(.72, 'right', .3), frame(1)], { category: 'Daily Activities', icon: 'fa-file-lines' });
    add('scenario-review-tablet', 'Review Tablet', [frame(0), frame(.22, 'both', .48), frame(.4, 'both', .46),
        frame(.58, 'both', .48), frame(.78, 'both', .46), frame(1)], { category: 'Daily Activities', icon: 'fa-tablet-screen-button',
            attentionTrack: [
                { t: 0, gazeY: 0, headNod: 0, headPitch: 0 },
                { t: .22, target: 'work-surface', gazeY: 5, headNod: 1.5, headPitch: side ? 0 : -12 },
                { t: .78, target: 'work-surface', gazeY: 5, headNod: 1.5, headPitch: side ? 0 : -12 },
                { t: 1, gazeY: 0, headNod: 0, headPitch: 0 }
            ] });
    add('scenario-inspect-flashlight', 'Inspect With Flashlight', [frame(0), frame(.2, 'right', .4),
        frame(.4, 'right', .34, .08), frame(.62, 'right', .43, -.02), frame(.8, 'right', .4), frame(1)],
        { category: 'Daily Activities', icon: 'fa-lightbulb', duration: 5000 });
    const conversations = [
        ['introduce-self', 'Introduce Yourself', [[.2,'right',.34,-.05],[.5,'right',.34,-.05],[.72,'right',.38]], 4200],
        ['reassure', 'Gentle Reassurance', [[.25,'right',.42,.02],[.45,'right',.38,.06],[.65,'right',.42,.02],[.8,'right',.38,.06]], 5200],
        ['decline', 'Politely Decline', [[.2,'both',.34],[.4,'both',.31,.08],[.6,'both',.36,.02],[.78,'both',.31,.08]], 4400],
        ['weigh-options', 'Weigh Two Options', [[.16,'right',.38],[.3,'right',.32,.08],[.44],[.6,'left',.38],[.74,'left',.32,.08],[.88]], 6000],
        ['welcome', 'Warm Welcome', [[.2,'both',.4,-.04],[.48,'both',.3,.14],[.7,'both',.34,.1]], 4800],
        ['request-turn', 'Request a Turn to Speak', [[.22,'right',.24],[.42,'right',.15,.03],[.72,'right',.15,.03]], 4200],
        ['thank-you', 'Thank You - Hand to Chest', [[.22,'right',.35,-.06],[.62,'right',.35,-.06],[.8,'right',.4]], 4400],
        ['measured-beats', 'Measured Speaking Beats', [[.18,'right',.4],[.3,'right',.32],[.42,'right',.4],[.54,'right',.32],[.66,'right',.4],[.78,'right',.32]], 5200],
        ['invite-response', 'Invite a Response', [[.2,'right',.4],[.42,'right',.32,.12],[.75,'right',.32,.12]], 5000],
        ['clarify', 'Clarify With Both Hands', [[.18,'both',.4],[.36,'both',.32,.05],[.52,'both',.4,-.02],[.7,'both',.32,.05]], 4800],
        ['small-greeting', 'Small Greeting', [[.18,'right',.28],[.32,'right',.2,.06],[.45,'right',.26,.02],[.58,'right',.2,.06],[.78,'right',.28]], 3800],
        ['acknowledge', 'Acknowledge and Respond', [[.2,'right',.36,-.05],[.38,'right',.36,-.05],[.6,'right',.3,.1],[.8,'right',.38,.04]], 4800]
    ];
    for (const [id, name, beats, duration] of conversations) {
        if (side && !dual && beats.some(beat => ['left', 'both'].includes(beat[1]))) continue;
        add(`gesture-life-${id}`, name, [frame(0), ...beats.map(beat => frame(...beat)), frame(1)], { duration,
            description: 'Forward conversational gesture with a steady torso and a return to neutral.' });
    }
    for (const scenario of JointSystem.lifeScenarios) {
        if (side && !dual && scenario.twoHands) continue;
        const options = { category: 'Daily Activities', icon: 'fa-hand-holding', duration: scenario.duration,
            description: `${scenario.name}. Optional fitted activity prop; returns to neutral without transferring ownership.` };
        if (scenario.lookDown) options.attentionTrack = [
            { t: 0, gazeY: 0, headNod: 0, headPitch: 0 },
            { t: .2, gazeY: 4, headNod: 1, headPitch: side ? 0 : -8 },
            { t: .8, gazeY: 4, headNod: 1, headPitch: side ? 0 : -8 },
            { t: 1, gazeY: 0, headNod: 0, headPitch: 0 }
        ];
        add(`scenario-${scenario.id}`, scenario.name, [frame(0), ...scenario.beats.map(beat => frame(...beat)), frame(1)], options);
    }
};

JointSystem._addRiflePresets = function(catalog) {
    for (const [key, entry] of Object.entries(catalog)) {
        if (!/^(aim|shoot)-handgun-/.test(key)) continue;
        const rifle = Utils.deepClone(entry);
        rifle.name = rifle.name.replace('Handgun', 'Rifle');
        rifle.description = 'Two-handed rifle aim with a supported fore-end and stylized recoil.';
        for (const frame of rifle.keyframes || [rifle]) {
            if (frame.contacts?.['right-hand']) {
                frame.contacts['left-hand'] = { ...frame.contacts['right-hand'], x: key.endsWith('back') ? .48 : .52 };
            }
            if ('front-shoulder' in (frame.jointAngles || {})) {
                Object.assign(frame.jointAngles, { 'front-shoulder': -42 + (frame.shootingRecoil ? 4 : 0), 'front-elbow': -48,
                    'back-shoulder': -65, 'back-elbow': -25 });
            }
        }
        catalog[key.replace('handgun', 'rifle')] = rifle;
    }
};

JointSystem._refineMouthActionContacts = function(catalog) {
    for (const [key, entry] of Object.entries(catalog)) {
        if (!/^(eat(?:-|$)|sit-eating|drink|hold-microphone|microphone-talk|think(?:ing)?(?:-|$)|shocked-cheeks$)/.test(key)) continue;
        entry.smoothContacts = true;
        if (/^think(?:ing)?(?:-|$)/.test(key)) entry.restContactTransitions = true;
        if (/^(eat|drink)/.test(key) && entry.keyframes?.length === 6) {
            const phases = [0, .08, .48, .58, .94, 1];
            entry.keyframes.forEach((frame, i) => { frame.t = phases[i]; });
        }
        if (entry.keyframes?.length && /^(eat|drink)/.test(key)) {
            for (const frames of [entry.keyframes, [...entry.keyframes].reverse()]) {
                if (!Object.keys(frames[0].contacts || {}).length) {
                    const held = frames.find(frame => Object.keys(frame.contacts || {}).length);
                    if (held) frames[0].contacts = Utils.deepClone(held.contacts);
                }
            }
        }
        for (const frame of entry.keyframes || [entry]) {
            for (const [sourceKey, spec] of Object.entries(frame.contacts || {})) {
                if (!spec || typeof spec !== 'object') continue;
                spec.preserveBend = true;
                spec.mouthReach = true;
                if (/microphone/.test(key)) spec.palmGrip = .45;
                if (/^think(?:ing)?(?:-|$)/.test(key)) {
                    spec.palmGrip = .8;
                    if (/^(right|left)-hand$/.test(sourceKey)) {
                        spec.offsetX = 0;
                        spec.offsetY = 0;
                    }
                }
                spec.keepElbowDown = true;
                spec.shoulderLimit = 70;
                spec.wristLimit = 18;
                if (spec.tag === 'mouth') {
                    // Grip the cup/microphone below the lips, rather than folding
                    // the whole hand onto the face.
                    spec.offsetY = Math.max(spec.offsetY || 0, /microphone/.test(key) ? 24 : 8);
                    spec.iterations = 16;
                }
            }
            if ((key === 'eat' || key === 'sit-eating') && frame.jointAngles
                && ('left-shoulder' in frame.jointAngles || 'left-elbow' in frame.jointAngles)) {
                Object.assign(frame.jointAngles, { 'left-shoulder': 0, 'left-elbow': 0, 'left-wrist': 0 });
                frame.contacts = { ...frame.contacts };
                delete frame.contacts['left-hand'];
            }
        }
    }
};

JointSystem._refineDeskHandMovements = function(catalog, view) {
    for (const [key, move] of Object.entries(catalog)) {
        if (!/^(write|type)(-side)?-seated$/.test(key) || !move.keyframes?.length) continue;
        const typing = key.startsWith('type'), first = move.keyframes[0].jointAngles || {};
        move.smoothContacts = true;
        move.keyframes.forEach((frame, index, frames) => {
            const pulse = index === 0 || index === frames.length - 1 ? 0 : (index % 2 ? 1 : -1);
            if (view === 'front') {
                // Move the IK targets as well as the joints; fixed contacts erase
                // the authored strokes when the solver runs after interpolation.
                frame.contacts = Utils.deepClone(frame.contacts || {});
                for (const [role, sign] of [['right-hand', 1], ['left-hand', -1]]) {
                    const base = frame.contacts[role] || { tag: 'sternum', offsetX: -20 * sign, offsetY: 76 };
                    frame.contacts[role] = { ...base,
                        offsetX: (base.offsetX || 0) + (typing ? sign * pulse * 3 : (sign === 1 ? pulse * 12 : 0)),
                        offsetY: (base.offsetY || 0) + (typing ? sign * pulse * 9 : (sign === 1 ? pulse * 6 : 0)),
                        iterations: 16, preserveBend: true, keepElbowDown: true, shoulderLimit: 55, wristLimit: 12
                    };
                }
            } else {
                const primary = view === 'back' ? 'right-' : ('front-elbow' in first ? 'front-' : '');
                const secondary = view === 'back' ? 'left-' : ('back-elbow' in first ? 'back-' : null);
                for (const [prefix, active] of [[primary, true], [secondary, typing]]) {
                    if (prefix === null) continue;
                    const phase = prefix === secondary && view !== 'back' ? -pulse : pulse;
                    for (const [joint, amount] of [['shoulder', 1], ['elbow', typing ? 4 : 3], ['wrist', 8]]) {
                        const name = `${prefix}${joint}`;
                        if (Number.isFinite(first[name])) frame.jointAngles[name] = first[name] + (active ? phase * amount : 0);
                    }
                }
            }
        });
    }
};

JointSystem._projectSeatedMovements = function(catalog) {
    for (const [key, move] of Object.entries(catalog)) {
        if (!/seated|sit-eating|^eat$|writing-typing|sit-stand-transition|^sit-to-stand$/.test(key) || !move.keyframes?.length) continue;
        const transition = key === 'sit-stand-transition' || key === 'sit-to-stand';
        const peak = Math.max(1, ...move.keyframes.map(frame => Math.abs(frame.jointAngles?.['right-hip'] || 0)));
        move.grounding = 'planted';
        for (const frame of move.keyframes) {
            frame.seatDepth = transition ? Math.abs(frame.jointAngles?.['right-hip'] || 0) / peak : 1;
            frame.jointAngles = { ...frame.jointAngles };
            frame.jointTilts = { ...frame.jointTilts };
            for (const name of ['right-hip', 'left-hip', 'right-knee', 'left-knee', 'right-ankle', 'left-ankle']) {
                frame.jointAngles[name] = 0;
                frame.jointTilts[name] = { x: 0, y: 0 };
            }
            frame.partAngles = { ...frame.partAngles, torso: 0 };
            frame.dy = 0;
        }
    }
};

JointSystem._addHumanSideHeadMovements = function(catalog, viewCompatibility = ['side']) {
        if (!catalog || typeof catalog !== 'object') return catalog;

        const compatibility = Array.isArray(viewCompatibility)
            ? viewCompatibility.filter(Boolean)
            : ['side'];
        const frame = (t, neck = 0, tiltX = 0, tiltY = 0) => ({
            t,
            jointAngles: { neck },
            partTilts: {
                'head-neck': { x: tiltX, y: tiltY }
            }
        });
        const base = {
            icon: 'fa-head-side-virus',
            category: 'Head Movement',
            easing: 'easeInOut',
            viewCompatibility: compatibility.length ? compatibility : ['side'],
            auditNotes: ['Head-neck only', 'Starts and ends at the neutral side-view pose']
        };

        Object.assign(catalog, {
            'nod-yes': {
                ...base,
                name: 'Nod Yes',
                description: 'Natural side-view agreement nod driven only by the neck joint.',
                duration: 900,
                repeat: 2,
                keyframes: [
                    frame(0.00),
                    frame(0.18, -5),
                    frame(0.40, 14),
                    frame(0.62, -4),
                    frame(0.82, 10),
                    frame(1.00)
                ]
            },
            'shake-head': {
                ...base,
                name: 'Shake Head No',
                description: 'Side-view refusal gesture using restrained out-of-plane head turns at the neck.',
                duration: 1100,
                repeat: 2,
                keyframes: [
                    frame(0.00),
                    frame(0.20, -1, 1, -12),
                    frame(0.42, 1, 1, 12),
                    frame(0.64, -1, 1, -10),
                    frame(0.84, 1, 1, 8),
                    frame(1.00)
                ]
            },
            'look-around': {
                ...base,
                icon: 'fa-eye',
                name: 'Look Around',
                description: 'Side-view scan that turns the head in depth while the torso remains still.',
                duration: 2200,
                repeat: 2,
                keyframes: [
                    frame(0.00),
                    frame(0.18, -1, 1, -12),
                    frame(0.36, -1, 1, -12),
                    frame(0.50),
                    frame(0.64, 1, 1, 12),
                    frame(0.82, 1, 1, 12),
                    frame(1.00)
                ]
            },
            'look-up-return': {
                ...base,
                icon: 'fa-eye',
                name: 'Look Up & Return',
                description: 'Side-view upward look articulated at the neck, followed by a smooth neutral return.',
                duration: 1400,
                repeat: 1,
                keyframes: [
                    frame(0.00),
                    frame(0.28, -18),
                    frame(0.68, -18),
                    frame(1.00)
                ]
            },
            'look-down-return': {
                ...base,
                icon: 'fa-eye-low-vision',
                name: 'Look Down & Return',
                description: 'Side-view downward look articulated at the neck, followed by a smooth neutral return.',
                duration: 1400,
                repeat: 1,
                keyframes: [
                    frame(0.00),
                    frame(0.28, 16),
                    frame(0.68, 16),
                    frame(1.00)
                ]
            }
        });

        return catalog;
    }

JointSystem._addHumanFrontBackHeadMovements = function(catalog, facing = 'front') {
        if (!catalog || typeof catalog !== 'object') return catalog;
        const isBack = facing === 'back';
        const label = isBack ? 'rear' : 'front';
        const viewCompatibility = isBack
            ? ['back', 'back-3q-left', 'back-3q-right']
            : ['front', 'front-3q-left', 'front-3q-right'];
        const frame = (t, neck = 0, tiltX = 0, tiltY = 0) => ({
            t,
            jointAngles: { neck },
            jointTilts: { neck: { x: tiltX, y: tiltY } }
        });
        const base = {
            icon: 'fa-head-side-virus',
            category: 'Head Movement',
            easing: 'easeInOut',
            viewCompatibility,
            auditNotes: ['Head-neck only', 'Supports straight and 3/4 character views', 'Starts and ends neutral']
        };

        Object.assign(catalog, {
            'nod-yes': {
                ...base,
                name: 'Nod Yes',
                description: `Natural ${label}-view agreement nod articulated at the neck.`,
                duration: 900,
                repeat: 2,
                keyframes: [
                    frame(0.00),
                    frame(0.18, -5, -2),
                    frame(0.40, 14, 4),
                    frame(0.62, -4, -1),
                    frame(0.82, 10, 3),
                    frame(1.00)
                ]
            },
            'shake-head': {
                ...base,
                name: 'Shake Head No',
                description: `Restrained ${label}-view refusal gesture driven only by the neck joint.`,
                duration: 1100,
                repeat: 2,
                keyframes: [
                    frame(0.00),
                    frame(0.20, -2, 0, -11),
                    frame(0.42, 2, 0, 11),
                    frame(0.64, -2, 0, -9),
                    frame(0.84, 1, 0, 8),
                    frame(1.00)
                ]
            },
            'look-around': {
                ...base,
                icon: 'fa-eye',
                name: 'Look Around',
                description: `${isBack ? 'Rear' : 'Front'} and 3/4 head scan with the torso held still.`,
                duration: 2200,
                repeat: 2,
                keyframes: [
                    frame(0.00),
                    frame(0.18, -2, 0, -12),
                    frame(0.36, -2, 0, -12),
                    frame(0.50),
                    frame(0.64, 2, 0, 12),
                    frame(0.82, 2, 0, 12),
                    frame(1.00)
                ]
            },
            'look-up-return': {
                ...base,
                icon: 'fa-eye',
                name: 'Look Up & Return',
                description: `${isBack ? 'Rear' : 'Front'} and 3/4 upward look followed by a smooth neutral return.`,
                duration: 1400,
                repeat: 1,
                keyframes: [
                    frame(0.00),
                    frame(0.28, -18, -5),
                    frame(0.68, -18, -5),
                    frame(1.00)
                ]
            },
            'look-down-return': {
                ...base,
                icon: 'fa-eye-low-vision',
                name: 'Look Down & Return',
                description: `${isBack ? 'Rear' : 'Front'} and 3/4 downward look followed by a smooth neutral return.`,
                duration: 1400,
                repeat: 1,
                keyframes: [
                    frame(0.00),
                    frame(0.28, 16, 5),
                    frame(0.68, 16, 5),
                    frame(1.00)
                ]
            }
        });
        return catalog;
    }

JointSystem._buildHumanFrontArmaturePoseCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (JointSystem._humanFrontArmaturePoseCatalog) {
            return JointSystem._humanFrontArmaturePoseCatalog;
        }

        const catalog = {
            idle: {
                name: 'Idle',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Neutral front-facing idle with limbs straight down.',
                jointAngles: {},
                partAngles: {}
            }
        };

        HUMAN_FRONT_STATIC_POSES.forEach(poseDef => {
            const keyBase = String(poseDef.id || poseDef.name || 'pose')
                .replace(/^builtin-human-front-/, '');
            const key = JointSystem._slugifyArmatureCatalogKey(keyBase, 'pose');
            const converted = JointSystem._convertHumanFrontAnglesToArmaturePoseData(poseDef.angles || {});
            const convertedTilts = JointSystem._convertHumanFrontTiltsToArmaturePoseData(poseDef.tilts || {});
            catalog[key] = {
                name: poseDef.name === 'Confident' ? 'Confident Stance' : poseDef.name,
                icon: poseDef.icon || 'fa-person',
                category: poseDef.category || 'Standing',
                description: poseDef.description || '',
                jointAngles: converted.jointAngles,
                partAngles: converted.partAngles,
                contacts: JointSystem._convertHumanFrontContactsToArmature(poseDef.contacts || {})
            };
            if (Object.keys(convertedTilts.jointTilts).length) {
                catalog[key].jointTilts = convertedTilts.jointTilts;
            }
            if (Object.keys(convertedTilts.partTilts).length) {
                catalog[key].partTilts = convertedTilts.partTilts;
            }
            if (typeof poseDef.dy === 'number') {
                catalog[key].dy = poseDef.dy;
            }
            JointSystem._copyArmatureLayerOverrideFields(catalog[key], poseDef);
        });

        [
            'relaxed',
            'attention',
            'arms-up',
            'arms-crossed',
            'point-right',
            'point-up',
            'wave-both',
            'thumbs-up',
            'facepalm',
            'surrender',
            'hands-on-hips',
            'walk-right-forward',
            'walk-left-forward',
            'lunge-right',
            'tip-toe',
            'sit',
            'squat',
            'kick-right',
            'kick-left',
            'punch-right',
            'punch-left',
            'guard',
            'uppercut',
            'aiming-prop-two-hand',
            'drinking',
            'reading-book',
            'writing-typing',
            'sit-eating',
            'phone-call',
            'hold-microphone',
            'prayer-hands',
            'carry-tray',
            'excited',
            'sad',
            'angry',
            'surprised',
            'shy'
        ].forEach(key => {
            if (catalog[key] || !JointSystem.ARMATURE_POSES[key]) return;
            catalog[key] = JointSystem._cloneArmatureCatalogEntry(JointSystem.ARMATURE_POSES[key]);
        });

        const frontCommunicationLayerOrder = ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'];
        const buildFrontCommunicationPose = (name, icon, description, angles, contacts) => {
            const converted = JointSystem._convertHumanFrontAnglesToArmaturePoseData(angles || {});
            return {
                name,
                icon,
                category: 'Communication',
                description,
                jointAngles: converted.jointAngles,
                partAngles: converted.partAngles,
                contacts: JointSystem._convertHumanFrontContactsToArmature(contacts || {}),
                frontViewLayerOverride: frontCommunicationLayerOrder,
                layerOrderOverride: frontCommunicationLayerOrder,
                agbadaArmLayerMode: 'respect-arm-order'
            };
        };
        catalog['phone-call'] = buildFrontCommunicationPose(
            'Phone Call',
            'fa-phone',
            'Front-view listening pose with the right hand anchored beside the ear.',
            { torso: 0, head: 0, 'r-upper-arm': 55, 'r-forearm': 145, 'r-hand': 0, 'l-upper-arm': 0, 'l-forearm': 0 },
            { 'r-hand': { tag: 'r-ear', offsetX: -4, offsetY: 6, iterations: 16, preserveBend: true } }
        );
        catalog['phone-call-pre-ear'] = buildFrontCommunicationPose(
            'Phone Call (Pre-Ear)',
            'fa-phone-volume',
            'Front-view near-ear prep pose that stops short of contact.',
            { torso: 0, head: -2, 'r-upper-arm': 50, 'r-forearm': 132, 'r-hand': 0, 'l-upper-arm': 0, 'l-forearm': 0 },
            { 'r-hand': { tag: 'r-ear', offsetX: -12, offsetY: 12, iterations: 16, preserveBend: true } }
        );
        catalog['hold-microphone'] = buildFrontCommunicationPose(
            'Hold Microphone',
            'fa-microphone',
            'Front-view microphone pose with the right hand anchored to the mouth line.',
            { torso: 0, head: 0, 'r-upper-arm': 10, 'r-forearm': -120, 'r-hand': 0, 'l-upper-arm': 0, 'l-forearm': 0 },
            { 'r-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }
        );

        // Static activities use the held frame of the same action, not legacy
        // dummy angles (which use a different left-arm convention).
        const activities = [
            ['reading-book', { torso: 4, 'r-upper-arm': 34, 'r-forearm': -94, 'r-hand': -8, 'l-upper-arm': -34, 'l-forearm': 94, 'l-hand': 8 }, -10],
            ['writing-typing', { torso: 3, 'r-upper-arm': 14, 'r-forearm': -74, 'r-hand': 2, 'l-upper-arm': -14, 'l-forearm': 74, 'l-hand': -2,
                'r-upper-leg': 60, 'r-lower-leg': -90, 'r-foot': 0, 'l-upper-leg': -60, 'l-lower-leg': 90, 'l-foot': 0 }, -8]
        ];
        activities.forEach(([key, angles, headTilt]) => {
            const converted = JointSystem._convertHumanFrontAnglesToArmaturePoseData(angles);
            const tilts = JointSystem._convertHumanFrontTiltsToArmaturePoseData({ head: { x: headTilt, y: 0 } });
            catalog[key] = {
                ...catalog[key], ...converted,
                jointTilts: tilts.jointTilts || {}, partTilts: tilts.partTilts || {},
                contacts: {}, layerOrderOverride: frontCommunicationLayerOrder,
                preserveFrontLeftLowerSigns: false,
                frontViewLayerOverride: frontCommunicationLayerOrder,
                agbadaArmLayerMode: 'respect-arm-order'
            };
        });

        const frontHold = (key, angles, contacts = {}) => {
            Object.assign(catalog[key], JointSystem._convertHumanFrontAnglesToArmaturePoseData(angles), {
                contacts, frontAngleConvention: 'mirrored', frontViewLayerOverride: frontCommunicationLayerOrder,
                layerOrderOverride: frontCommunicationLayerOrder, agbadaArmLayerMode: 'respect-arm-order'
            });
        };
        frontHold('attention', { 'r-upper-arm': 0, 'r-forearm': 0, 'l-upper-arm': 0, 'l-forearm': 0, head: 0 });
        frontHold('relaxed', { 'r-upper-arm': 4, 'r-forearm': -8, 'l-upper-arm': -6, 'l-forearm': 10, head: 2 });
        frontHold('hands-on-hips', { 'r-upper-arm': 44, 'r-forearm': -105, 'l-upper-arm': -44, 'l-forearm': 105 }, {
            'right-hand': { tag: 'r-waist', offsetX: -4, offsetY: -10, iterations: 16 },
            'left-hand': { tag: 'l-waist', offsetX: 4, offsetY: -10, iterations: 16 }
        });
        const crossedContacts = {
            'right-hand': { tag: 'l-armpit', offsetY: 62, iterations: 16 },
            'left-hand': { tag: 'r-armpit', offsetY: 74, iterations: 16 }
        };
        for (const key of ['arms-crossed', 'crossed-arms']) frontHold(key, {
            'r-upper-arm': 20, 'r-forearm': -126, 'l-upper-arm': -24, 'l-forearm': 122
        }, crossedContacts);
        frontHold('drinking', { 'r-upper-arm': 22, 'r-forearm': -138, 'r-hand': 8, 'l-upper-arm': -3, 'l-forearm': 4, head: -3 }, {
            'right-hand': { tag: 'mouth', offsetX: -8, offsetY: 8, iterations: 16 }
        });
        frontHold('reading-book', { 'r-upper-arm': 16, 'r-forearm': -106, 'l-upper-arm': -16, 'l-forearm': 106 }, {
            'right-hand': { tag: 'sternum', offsetX: -22, offsetY: 38, iterations: 16 },
            'left-hand': { tag: 'sternum', offsetX: 22, offsetY: 38, iterations: 16 }
        });
        frontHold('excited', { 'r-upper-arm': 130, 'r-forearm': 10, 'l-upper-arm': -130, 'l-forearm': -10, head: -4 });
        frontHold('shy', { 'r-upper-arm': -8, 'r-forearm': -35, 'l-upper-arm': 8, 'l-forearm': 35, head: 5 }, {
            'right-hand': { tag: 'umbilical-area', offsetX: -4, offsetY: 8, iterations: 16 },
            'left-hand': { tag: 'umbilical-area', offsetX: 4, offsetY: 8, iterations: 16 }
        });
        catalog['sit-eating'].jointAngles['right-shoulder'] = 22;
        catalog['sit-eating'].jointAngles['right-elbow'] = -138;
        catalog['sit-eating'].jointAngles['left-shoulder'] = 12;
        catalog['sit-eating'].jointAngles['left-elbow'] = -100;
        frontHold('sit', { torso: 0, head: 0,
            'r-upper-arm': 8, 'r-forearm': -24, 'r-hand': 0,
            'l-upper-arm': -8, 'l-forearm': 24, 'l-hand': 0,
            'r-foot': 0, 'l-foot': 0 });
        catalog.sit.description = 'Upright seated pose with forward-facing thighs, vertical shins and feet resting on the floor.';
        for (const key of ['sit', 'sit-eating', 'writing-typing']) {
            Object.assign(catalog[key].jointAngles, { 'right-hip': 0, 'left-hip': 0, 'right-knee': 0, 'left-knee': 0 });
            catalog[key].jointTilts = { ...catalog[key].jointTilts, 'right-hip': { x: 0, y: 0 }, 'left-hip': { x: 0, y: 0 } };
            catalog[key].seatDepth = 1;
            catalog[key].grounding = 'planted';
            catalog[key].partAngles = { torso: 0 };
            catalog[key].dy = 70;
            catalog[key].preserveFrontLeftLowerSigns = false;
        }
        catalog['writing-typing'].contacts = {
            'right-hand': { tag: 'sternum', offsetX: -20, offsetY: 76, iterations: 16 },
            'left-hand': { tag: 'sternum', offsetX: 20, offsetY: 76, iterations: 16 }
        };

        [
            'hands-on-hips',
            'arms-crossed',
            'crossed-arms',
            'point-right',
            'point-up',
            'wave-both',
            'thumbs-up',
            'facepalm',
            'surrender',
            'punch-right',
            'punch-left',
            'guard',
            'uppercut',
            'aiming-prop-two-hand',
            'drinking',
            'reading-book',
            'writing-typing',
            'sit-eating',
            'combat-idle',
            'combat-ready',
            'handshake',
            'handshake-front'
        ].forEach(key => {
            if (catalog[key]) JointSystem._applyFrontArmsOverTorsoLayering(catalog[key]);
        });

        for (const [key, name, source] of [
            ['read-book-seated', 'Read Book (Seated)', 'reading-book'],
            ['write-seated', 'Write (Seated)', 'writing-typing'],
            ['type-seated', 'Type (Seated)', 'writing-typing']
        ]) {
            const pose = Utils.deepClone(catalog[source]), seated = catalog['writing-typing'];
            Object.assign(pose, { name, category: 'Daily Activities', grounding: 'planted', dy: seated.dy, seatDepth: 1 });
            for (const joint of ['right-hip', 'left-hip', 'right-knee', 'left-knee']) pose.jointAngles[joint] = seated.jointAngles[joint];
            pose.jointTilts = { ...pose.jointTilts, ...Utils.deepClone(seated.jointTilts) };
            pose.partAngles = { ...pose.partAngles, torso: 0 };
            catalog[key] = pose;
        }
        catalog['aim-handgun-front'] = {
            name: 'Aim Handgun Forward', icon: 'fa-bullseye', category: 'Action',
            description: 'One-handed foreshortened aim in front of the chest.',
            jointAngles: {},
            contacts: { 'right-hand': { targetPart: 'torso', x: .4, y: .2,
                mouthReach: true, palmGrip: .5, iterations: 24 } },
            layerOrderOverride: ['right-leg', 'left-leg', 'torso', 'head-neck', 'left-arm', 'right-arm']
        };
        JointSystem._addRiflePresets(catalog);
        Object.values(catalog).forEach(pose => { pose.frontAngleConvention = 'mirrored'; });
        JointSystem._applyDefaultArmaturePoseCompatibility(catalog, ['front']);
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._humanFrontArmaturePoseCatalog = catalog;
        return catalog;
    }

JointSystem._buildHumanFrontArmatureMovementCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (!JointSystem._shouldRebuildHumanFrontArmatureMovementCatalog(JointSystem._humanFrontArmatureMovementCatalog)) {
            return JointSystem._humanFrontArmatureMovementCatalog;
        }

        const catalog = {};
        const frontMoves = JointMovements.getAll().filter(move =>
            Array.isArray(move?.presetKeys) && move.presetKeys.includes('human-front')
        );

        frontMoves.forEach(move => {
            const key = JointSystem._slugifyArmatureCatalogKey(String(move.key || move.name || 'move').replace(/^hf-/, ''), 'move');
            catalog[key] = {
                name: move.name,
                icon: move.icon || 'fa-play',
                category: move.category || 'Other',
                description: move.description || '',
                duration: move.duration || 1000,
                repeat: move.repeat ?? 1,
                ...(Array.isArray(move.viewCompatibility) ? { viewCompatibility: [...move.viewCompatibility] } : {}),
                ...(move.semanticAction ? { semanticAction: move.semanticAction } : {}),
                ...(move.semanticFamily ? { semanticFamily: move.semanticFamily } : {}),
                ...(move.motionIntent ? { motionIntent: move.motionIntent } : {}),
                ...(move.authoringConvention ? { authoringConvention: move.authoringConvention } : {}),
                ...(move.rootTravel && typeof move.rootTravel === 'object' ? { rootTravel: Utils.deepClone(move.rootTravel) } : {}),
                ...(typeof move.absoluteTravel === 'boolean' ? { absoluteTravel: move.absoluteTravel } : {}),
                ...(move.walkTravelLoopFinalFromStart ? { walkTravelLoopFinalFromStart: true } : {}),
                ...(move.walkTravelLoopKeepTerminal ? { walkTravelLoopKeepTerminal: true } : {}),
                ...(move.skipStartIdleBookend ? { skipStartIdleBookend: true } : {}),
                ...(move.skipEndIdleBookend ? { skipEndIdleBookend: true } : {}),
                ...(move.depthMotionPolicy ? { depthMotionPolicy: move.depthMotionPolicy } : {}),
                ...(move.anatomyMotionPolicy ? { anatomyMotionPolicy: move.anatomyMotionPolicy } : {}),
                contacts: JointSystem._convertHumanFrontContactsToArmature(move.contacts || {}),
                keyframes: (move.keyframes || []).map(kf => {
                const converted = JointSystem._convertHumanFrontAnglesToArmaturePoseData(kf.angles || {});
                const convertedTilts = JointSystem._convertHumanFrontTiltsToArmaturePoseData(kf.tilts || {});
                const result = { t: kf.t };
                if (Object.keys(converted.jointAngles).length) result.jointAngles = converted.jointAngles;
                if (Object.keys(converted.partAngles).length) result.partAngles = converted.partAngles;
                if (Object.keys(convertedTilts.jointTilts).length) result.jointTilts = convertedTilts.jointTilts;
                if (Object.keys(convertedTilts.partTilts).length) result.partTilts = convertedTilts.partTilts;
                if (typeof kf.dx === 'number') result.dx = kf.dx;
                else if (typeof kf?.offsets?.torso?.x === 'number') result.dx = kf.offsets.torso.x;
                if (typeof kf.dy === 'number') result.dy = kf.dy;
                else if (typeof kf?.offsets?.torso?.y === 'number') result.dy = kf.offsets.torso.y;
                const contacts = JointSystem._convertHumanFrontContactsToArmature(kf.contacts || {});
                if (Object.keys(contacts).length) result.contacts = contacts;
                JointSystem._copyArmatureLayerOverrideFields(result, kf);
                return result;
            })
            };
        });

        const clapOpen = catalog.clap.keyframes[0], clapClosed = catalog.clap.keyframes[1];
        catalog.clap = {
            ...catalog.clap, duration: 900, repeat: 4, easing: 'easeInOut', smoothContacts: true,
            description: 'Palms meet at chest height, briefly touch, then separate for the next clap.',
            keyframes: [[0, .23], [.38, 0], [.45, 0], [.85, .23], [1, .23]].map(([t, gap]) => ({
                ...JointSystem._cloneArmatureCatalogEntry(gap < .1 ? clapClosed : clapOpen), t,
                contacts: Object.fromEntries(['right-hand', 'left-hand'].map((hand, i) => [hand, {
                    targetPart: 'torso', x: .5, y: .32, offsetXRatio: (i ? 1 : -1) * gap,
                    palmGrip: .55, keepElbowDown: true, preserveBend: true, wristLimit: 15, iterations: 48
                }]))
            }))
        };

        const buildFrontFrame = (t, angles = {}, options = {}) => {
            const converted = JointSystem._convertHumanFrontAnglesToArmaturePoseData(angles);
            const convertedTilts = JointSystem._convertHumanFrontTiltsToArmaturePoseData(options?.tilts || {});
            const frame = { t };
            if (Object.keys(converted.jointAngles).length) frame.jointAngles = converted.jointAngles;
            if (Object.keys(converted.partAngles).length) frame.partAngles = converted.partAngles;
            if (Object.keys(convertedTilts.jointTilts).length) frame.jointTilts = convertedTilts.jointTilts;
            if (Object.keys(convertedTilts.partTilts).length) frame.partTilts = convertedTilts.partTilts;
            if (options?.jointTilts && Object.keys(options.jointTilts).length) frame.jointTilts = Utils.deepClone(options.jointTilts);
            if (options?.partTilts && Object.keys(options.partTilts).length) frame.partTilts = Utils.deepClone(options.partTilts);
            if (typeof options?.dx === 'number') frame.dx = options.dx;
            if (typeof options?.dy === 'number') frame.dy = options.dy;
            const contacts = JointSystem._convertHumanFrontContactsToArmature(options?.contacts || {});
            if (Object.keys(contacts).length) frame.contacts = contacts;
            JointSystem._copyArmatureLayerOverrideFields(frame, options);
            return frame;
        };
        catalog['kneel-to-stand'] = {
            ...catalog['kneel-to-stand'],
            description: 'Lower onto one knee with the other foot planted, pause, then rise smoothly to standing.',
            duration: 3200, repeat: 1, easing: 'easeInOut', grounding: 'planted',
            keyframes: [[0, 0], [.42, 1], [.58, 1], [1, 0]].map(([t, kneelDepth]) => ({
                t, kneelDepth, jointAngles: {}, partAngles: { torso: 0 },
                jointTilts: { waist: { x: -5 * kneelDepth, y: 0 } },
                partTilts: { 'head-neck': { x: -4 * kneelDepth, y: 0 } }
            }))
        };
        const seatedFront = {
            'r-upper-leg': 60, 'r-lower-leg': -90, 'r-foot': 0,
            'l-upper-leg': -60, 'l-lower-leg': 90, 'l-foot': 0
        };
        const frontLayerOrder = ['left-leg', 'right-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'];
        const frontHeadDown = (x) => ({ layerOrderOverride: frontLayerOrder, tilts: { head: { x, y: 0 } } });
        for (const key of ['wash-hands', 'fold-clothes']) {
            catalog[key] = {
                ...catalog[key], duration: key === 'fold-clothes' ? 3200 : 2400,
                repeat: key === 'fold-clothes' ? 1 : 4, easing: 'easeInOut',
                keyframes: [0, .25, .5, .75, 1].map(t => buildFrontFrame(t, {
                    torso: 0, head: 0,
                    'r-upper-arm': 24, 'r-forearm': -85 + 3 * Math.sin(t * Math.PI * 2), 'r-hand': 0,
                    'l-upper-arm': -24, 'l-forearm': 85 + 3 * Math.sin(t * Math.PI * 2), 'l-hand': 0,
                    'r-upper-leg': 0, 'r-lower-leg': 0, 'r-foot': 0, 'l-upper-leg': 0, 'l-lower-leg': 0, 'l-foot': 0
                }, frontHeadDown(-12)))
            };
        }
        catalog['push-cart'] = {
            ...catalog['push-cart'], name: 'Push Cart', icon: 'fa-cart-shopping', category: 'Object Handling',
            duration: 2400, repeat: 4, easing: 'easeInOut',
            keyframes: [0, .25, .5, .75, 1].map(t => buildFrontFrame(t, {
                torso: 0, head: 0, 'r-upper-arm': 20, 'r-forearm': -75 + 3 * Math.sin(t * Math.PI * 2), 'r-hand': 0,
                'l-upper-arm': -20, 'l-forearm': 75 - 3 * Math.sin(t * Math.PI * 2), 'l-hand': 0,
                'r-upper-leg': 0, 'r-lower-leg': 0, 'r-foot': 0, 'l-upper-leg': 0, 'l-lower-leg': 0, 'l-foot': 0
            }, { layerOrderOverride: frontLayerOrder }))
        };
        catalog['carry-tray-walk-prep'] = {
            name: 'Carry Tray Balance', icon: 'fa-grip-lines', category: 'Daily Activities',
            description: 'Support a tray with small forearm adjustments and both feet planted.',
            duration: 2400, repeat: 4, easing: 'easeInOut',
            keyframes: [0, .25, .5, .75, 1].map(t => buildFrontFrame(t, {
                torso: 0, head: 0,
                'r-upper-arm': 14, 'r-forearm': -88 + 2 * Math.sin(t * Math.PI * 2), 'r-hand': 0,
                'l-upper-arm': -14, 'l-forearm': 88 - 2 * Math.sin(t * Math.PI * 2), 'l-hand': 0,
                'r-upper-leg': 0, 'r-lower-leg': 0, 'r-foot': 0,
                'l-upper-leg': 0, 'l-lower-leg': 0, 'l-foot': 0
            }, { layerOrderOverride: frontLayerOrder, contacts: {
                'r-hand': { tag: 'sternum', offsetX: 26, offsetY: 48, iterations: 24 },
                'l-hand': { tag: 'sternum', offsetX: -26, offsetY: 48, iterations: 24 }
            } }))
        };
        const frontPhoneContact = { 'r-hand': { tag: 'r-ear', offsetX: 4, offsetY: 10, iterations: 12 } };
        const frontPhonePreEarContact = { 'r-hand': { tag: 'r-ear', offsetX: 12, offsetY: 12, iterations: 10 } };
        const frontMicrophoneContact = { 'r-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } };
        const frontCommunicationOptions = (contacts) => ({
            contacts,
            frontViewLayerOverride: frontLayerOrder,
            layerOrderOverride: frontLayerOrder,
            agbadaArmLayerMode: 'respect-arm-order'
        });
        catalog['phone-call-loop'] = {
            name: 'Phone Call / Listening',
            icon: 'fa-phone',
            category: 'Communication',
            description: 'Front-view phone listening loop with the right hand kept beside the ear by contact targeting.',
            duration: 1800,
            repeat: Infinity,
            keyframes: [
                buildFrontFrame(0.00, { torso: 0, head: 0, 'r-upper-arm': -85, 'r-forearm': -140, 'r-hand': 0, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhoneContact)),
                buildFrontFrame(0.30, { torso: 0, head: -1, 'r-upper-arm': -88, 'r-forearm': -136, 'r-hand': 3, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhoneContact)),
                buildFrontFrame(0.64, { torso: 0, head: 1, 'r-upper-arm': -82, 'r-forearm': -144, 'r-hand': -2, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhoneContact)),
                buildFrontFrame(1.00, { torso: 0, head: 0, 'r-upper-arm': -85, 'r-forearm': -140, 'r-hand': 0, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhoneContact))
            ]
        };
        catalog['phone-call-pre-ear-loop'] = {
            name: 'Phone Call / Pre-Ear',
            icon: 'fa-phone-volume',
            category: 'Communication',
            description: 'Front-view near-ear prep loop that holds just short of ear contact.',
            duration: 1700,
            repeat: Infinity,
            keyframes: [
                buildFrontFrame(0.00, { torso: 0, head: -2, 'r-upper-arm': -68, 'r-forearm': -118, 'r-hand': 4, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhonePreEarContact)),
                buildFrontFrame(0.34, { torso: 0, head: -3, 'r-upper-arm': -72, 'r-forearm': -114, 'r-hand': 6, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhonePreEarContact)),
                buildFrontFrame(0.70, { torso: 0, head: -1, 'r-upper-arm': -64, 'r-forearm': -122, 'r-hand': 2, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhonePreEarContact)),
                buildFrontFrame(1.00, { torso: 0, head: -2, 'r-upper-arm': -68, 'r-forearm': -118, 'r-hand': 4, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontPhonePreEarContact))
            ]
        };
        catalog['microphone-talk'] = {
            name: 'Microphone Talk',
            icon: 'fa-microphone',
            category: 'Communication',
            description: 'Front-view microphone talk loop with the right hand kept on the mouth path.',
            duration: 1700,
            repeat: Infinity,
            keyframes: [
                buildFrontFrame(0.00, { torso: 0, head: 2, 'r-upper-arm': -34, 'r-forearm': -150, 'r-hand': -2, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontMicrophoneContact)),
                buildFrontFrame(0.28, { torso: 0, head: 4, 'r-upper-arm': -38, 'r-forearm': -154, 'r-hand': 2, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontMicrophoneContact)),
                buildFrontFrame(0.60, { torso: 0, head: 1, 'r-upper-arm': -30, 'r-forearm': -146, 'r-hand': -4, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontMicrophoneContact)),
                buildFrontFrame(1.00, { torso: 0, head: 2, 'r-upper-arm': -34, 'r-forearm': -150, 'r-hand': -2, 'l-upper-arm': 0, 'l-forearm': 0 }, frontCommunicationOptions(frontMicrophoneContact))
            ]
        };
        catalog['read-book-seated'] = {
            name: 'Read Book (Seated)',
            icon: 'fa-book-open',
            category: 'Daily Activities',
            description: 'Front-facing seated reading loop with both hands holding a book at chest height.',
            duration: 2200,
            repeat: Infinity,
            keyframes: [
                buildFrontFrame(0.00, { torso: 4, 'r-upper-arm': 34, 'r-forearm': -94, 'r-hand': -8, 'l-upper-arm': -34, 'l-forearm': 94, 'l-hand': 8, ...seatedFront }, frontHeadDown(-10)),
                buildFrontFrame(0.34, { torso: 5, 'r-upper-arm': 36, 'r-forearm': -98, 'r-hand': -4, 'l-upper-arm': -36, 'l-forearm': 98, 'l-hand': 4, ...seatedFront }, frontHeadDown(-13)),
                buildFrontFrame(0.66, { torso: 3, 'r-upper-arm': 32, 'r-forearm': -90, 'r-hand': -10, 'l-upper-arm': -32, 'l-forearm': 90, 'l-hand': 10, ...seatedFront }, frontHeadDown(-8)),
                buildFrontFrame(1.00, { torso: 4, 'r-upper-arm': 34, 'r-forearm': -94, 'r-hand': -8, 'l-upper-arm': -34, 'l-forearm': 94, 'l-hand': 8, ...seatedFront }, frontHeadDown(-10))
            ]
        };
        catalog['write-seated'] = {
            name: 'Write (Seated)',
            icon: 'fa-pen',
            category: 'Daily Activities',
            description: 'Front-facing seated writing loop with one hand making small pen strokes while the other steadies the page.',
            duration: 1500,
            repeat: Infinity,
            keyframes: [
                buildFrontFrame(0.00, { torso: 5, 'r-upper-arm': 18, 'r-forearm': -82, 'r-hand': -14, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seatedFront }, frontHeadDown(-12)),
                buildFrontFrame(0.25, { torso: 5, 'r-upper-arm': 20, 'r-forearm': -84, 'r-hand': 8, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seatedFront }, frontHeadDown(-14)),
                buildFrontFrame(0.50, { torso: 4, 'r-upper-arm': 16, 'r-forearm': -78, 'r-hand': -18, 'l-upper-arm': -18, 'l-forearm': 74, 'l-hand': 2, ...seatedFront }, frontHeadDown(-11)),
                buildFrontFrame(0.75, { torso: 5, 'r-upper-arm': 20, 'r-forearm': -84, 'r-hand': 8, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seatedFront }, frontHeadDown(-14)),
                buildFrontFrame(1.00, { torso: 5, 'r-upper-arm': 18, 'r-forearm': -82, 'r-hand': -14, 'l-upper-arm': -16, 'l-forearm': 72, 'l-hand': 4, ...seatedFront }, frontHeadDown(-12))
            ]
        };
        catalog['type-seated'] = {
            name: 'Type (Seated)',
            icon: 'fa-keyboard',
            category: 'Daily Activities',
            description: 'Front-facing seated typing loop with alternating wrist taps from both hands.',
            duration: 1200,
            repeat: Infinity,
            keyframes: [
                buildFrontFrame(0.00, { torso: 3, 'r-upper-arm': 14, 'r-forearm': -74, 'r-hand': 2, 'l-upper-arm': -14, 'l-forearm': 74, 'l-hand': -2, ...seatedFront }, frontHeadDown(-8)),
                buildFrontFrame(0.25, { torso: 3, 'r-upper-arm': 16, 'r-forearm': -78, 'r-hand': -9, 'l-upper-arm': -12, 'l-forearm': 70, 'l-hand': 9, ...seatedFront }, frontHeadDown(-9)),
                buildFrontFrame(0.50, { torso: 2, 'r-upper-arm': 12, 'r-forearm': -70, 'r-hand': 8, 'l-upper-arm': -16, 'l-forearm': 78, 'l-hand': -8, ...seatedFront }, frontHeadDown(-7)),
                buildFrontFrame(0.75, { torso: 3, 'r-upper-arm': 16, 'r-forearm': -78, 'r-hand': -9, 'l-upper-arm': -12, 'l-forearm': 70, 'l-hand': 9, ...seatedFront }, frontHeadDown(-9)),
                buildFrontFrame(1.00, { torso: 3, 'r-upper-arm': 14, 'r-forearm': -74, 'r-hand': 2, 'l-upper-arm': -14, 'l-forearm': 74, 'l-hand': -2, ...seatedFront }, frontHeadDown(-8))
            ]
        };
        catalog['reach-overhead-front'] = {
            name: 'Reach Overhead',
            icon: 'fa-hand-point-up',
            category: 'Object Interaction',
            description: 'Front-facing reach above the head with both arms, then return to idle.',
            duration: 1800,
            repeat: 1,
            contacts: {},
            viewCompatibility: ['front', 'front-3q-left', 'front-3q-right'],
            auditNotes: ['Starts and ends in idle posture'],
            keyframes: [
                buildFrontFrame(0.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }, { layerOrderOverride: frontLayerOrder }),
                buildFrontFrame(0.24, { torso: -3, 'r-upper-arm': 48, 'r-forearm': -14, 'r-hand': 4, 'l-upper-arm': -48, 'l-forearm': 14, 'l-hand': -4 }, { ...frontHeadDown(-4), dy: -6 }),
                buildFrontFrame(0.52, { torso: -6, 'r-upper-arm': 132, 'r-forearm': -18, 'r-hand': 8, 'l-upper-arm': -132, 'l-forearm': 18, 'l-hand': -8 }, { ...frontHeadDown(-10), dy: -14 }),
                buildFrontFrame(0.74, { torso: -4, 'r-upper-arm': 112, 'r-forearm': -28, 'r-hand': 6, 'l-upper-arm': -112, 'l-forearm': 28, 'l-hand': -6 }, { ...frontHeadDown(-7), dy: -9 }),
                buildFrontFrame(1.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }, { layerOrderOverride: frontLayerOrder })
            ]
        };
        catalog['carry-object-front'] = {
            name: 'Carry Object',
            icon: 'fa-box',
            category: 'Object Interaction',
            description: 'Front-facing carry posture with both forearms supporting an object near the waist.',
            duration: 2200,
            repeat: Infinity,
            contacts: {},
            viewCompatibility: ['front', 'front-3q-left', 'front-3q-right'],
            keyframes: [
                buildFrontFrame(0.00, { torso: 1, 'r-upper-arm': 18, 'r-forearm': -82, 'r-hand': -6, 'l-upper-arm': -18, 'l-forearm': 82, 'l-hand': 6 }, { layerOrderOverride: frontLayerOrder, dy: 0 }),
                buildFrontFrame(0.32, { torso: 2, 'r-upper-arm': 20, 'r-forearm': -88, 'r-hand': -2, 'l-upper-arm': -20, 'l-forearm': 88, 'l-hand': 2 }, { layerOrderOverride: frontLayerOrder, dy: -4 }),
                buildFrontFrame(0.66, { torso: 1, 'r-upper-arm': 16, 'r-forearm': -78, 'r-hand': -8, 'l-upper-arm': -16, 'l-forearm': 78, 'l-hand': 8 }, { layerOrderOverride: frontLayerOrder, dy: 2 }),
                buildFrontFrame(1.00, { torso: 1, 'r-upper-arm': 18, 'r-forearm': -82, 'r-hand': -6, 'l-upper-arm': -18, 'l-forearm': 82, 'l-hand': 6 }, { layerOrderOverride: frontLayerOrder, dy: 0 })
            ]
        };
        catalog['push-pull-front'] = {
            name: 'Push / Pull',
            icon: 'fa-arrows-left-right',
            category: 'Object Interaction',
            description: 'Front-facing two-hand push forward and recoil, useful for doors, carts, and resistance gestures.',
            duration: 1900,
            repeat: 1,
            contacts: {},
            viewCompatibility: ['front', 'front-3q-left', 'front-3q-right'],
            auditNotes: ['Starts and ends in idle posture'],
            keyframes: [
                buildFrontFrame(0.00, { torso: 0, 'r-upper-arm': 4, 'l-upper-arm': -4 }, { layerOrderOverride: frontLayerOrder }),
                buildFrontFrame(0.22, { torso: 4, 'r-upper-arm': 32, 'r-forearm': -72, 'r-hand': -4, 'l-upper-arm': -32, 'l-forearm': 72, 'l-hand': 4 }, { ...frontHeadDown(-2), dy: -2 }),
                buildFrontFrame(0.48, { torso: -7, 'r-upper-arm': 58, 'r-forearm': -22, 'r-hand': 8, 'l-upper-arm': -58, 'l-forearm': 22, 'l-hand': -8 }, { ...frontHeadDown(-4), dy: -6 }),
                buildFrontFrame(0.70, { torso: 6, 'r-upper-arm': 24, 'r-forearm': -84, 'r-hand': -8, 'l-upper-arm': -24, 'l-forearm': 84, 'l-hand': 8 }, { ...frontHeadDown(-1), dy: 2 }),
                buildFrontFrame(1.00, { torso: 0, 'r-upper-arm': 4, 'l-upper-arm': -4 }, { layerOrderOverride: frontLayerOrder })
            ]
        };
        const createFrontPickup = side => {
            const center = side === 'center', working = side === 'left' ? 'left' : 'right';
            const other = working === 'right' ? 'left' : 'right';
            const frame = (t, depth, lift = 0) => ({
                t, pickupDepth: depth, seatDepth: .5 * depth,
                jointAngles: {
                    'right-hip': 95 * depth, 'left-hip': 95 * depth,
                    'right-knee': -155 * depth, 'left-knee': -155 * depth,
                    'right-ankle': 0, 'left-ankle': 0,
                    waist: center ? 0 : (working === 'left' ? 12 : -12) * depth,
                    'right-shoulder': center ? -16 * depth + 36 * lift : 0,
                    'left-shoulder': center ? -16 * depth + 36 * lift : 0,
                    'right-elbow': center ? -45 * lift : 0,
                    'left-elbow': center ? -45 * lift : 0,
                    'right-wrist': 0, 'left-wrist': 0,
                    ...(!center ? {
                        [working + '-shoulder']: 12 * depth - 24 * lift,
                        [working + '-elbow']: -4 * depth - 60 * lift,
                        [other + '-shoulder']: 12 * depth,
                        [other + '-elbow']: -38 * depth
                    } : {})
                },
                partTilts: { torso: { x: 42 * depth, y: 0 }, 'head-neck': { x: -12 * depth, y: 0 } },
                layerOrderOverride: frontLayerOrder
            });
            return {
                name: `Pick Up ${side[0].toUpperCase() + side.slice(1)} / Drop Object`,
                icon: 'fa-hand-holding', category: 'Daily Activities',
                description: center ? 'Two-hand center reach with a forward lean, planted feet and a controlled lift.'
                    : `Pick up on the character's ${side} side with the ${side} hand, then return to standing.`,
                duration: 3400, repeat: 1, easing: 'easeInOut', grounding: 'planted-stance', contacts: {},
                viewCompatibility: ['front', 'front-3q-left', 'front-3q-right'],
                auditNotes: ['Feet remain on their original ground plane', 'Mirrored left/right reach', 'Distinct reach and lift phases'],
                keyframes: [
                    { t: 0, pose: 'idle', layerOrderOverride: frontLayerOrder },
                    frame(.22, .4), frame(.44, 1), frame(.54, 1),
                    frame(.7, .72, 1), frame(.84, .3, .5),
                    { t: 1, pose: 'idle', layerOrderOverride: frontLayerOrder }
                ]
            };
        };
        catalog['pick-up-drop'] = createFrontPickup('center');
        catalog['pick-up-drop-left'] = createFrontPickup('left');
        catalog['pick-up-drop-right'] = createFrontPickup('right');
        catalog['sit-stand-transition'] = {
            name: 'Sit Down / Stand Up',
            icon: 'fa-chair',
            category: 'Daily Activities',
            description: 'Front-facing transition from standing to seated and back to standing.',
            duration: 2200,
            repeat: 1,
            keyframes: [
                buildFrontFrame(0.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }, { layerOrderOverride: frontLayerOrder }),
                buildFrontFrame(0.22, { torso: 8, 'r-upper-arm': 12, 'r-forearm': -18, 'l-upper-arm': -12, 'l-forearm': 18, 'r-upper-leg': 24, 'r-lower-leg': -44, 'l-upper-leg': -24, 'l-lower-leg': 44 }, { ...frontHeadDown(-6), dy: 20 }),
                buildFrontFrame(0.44, { torso: 5, 'r-upper-arm': 10, 'r-forearm': -24, 'l-upper-arm': -10, 'l-forearm': 24, ...seatedFront }, { ...frontHeadDown(-4), dy: 42 }),
                buildFrontFrame(0.62, { torso: 5, 'r-upper-arm': 10, 'r-forearm': -24, 'l-upper-arm': -10, 'l-forearm': 24, ...seatedFront }, { ...frontHeadDown(-4), dy: 42 }),
                buildFrontFrame(0.82, { torso: 8, 'r-upper-arm': 12, 'r-forearm': -18, 'l-upper-arm': -12, 'l-forearm': 18, 'r-upper-leg': 24, 'r-lower-leg': -44, 'l-upper-leg': -24, 'l-lower-leg': 44 }, { ...frontHeadDown(-6), dy: 20 }),
                buildFrontFrame(1.00, { torso: 0, 'r-upper-arm': 3, 'l-upper-arm': -3 }, { layerOrderOverride: frontLayerOrder })
            ]
        };
        // Pitch at the neck without replacing the head's view-dependent yaw.
        for (const frame of catalog['sit-stand-transition'].keyframes) {
            const pitch = frame.partTilts?.['head-neck']?.x || 0;
            if (frame.partTilts) delete frame.partTilts['head-neck'];
            frame.jointTilts = { ...frame.jointTilts, neck: { x: pitch, y: 0 } };
        }
        catalog['sit-to-stand'] = {
            name: 'Sit to Stand', icon: 'fa-chair', category: 'Movement',
            description: 'Start seated, lean forward over the feet, then rise once to an upright standing position.',
            duration: 2000, repeat: 1, easing: 'easeInOut',
            viewCompatibility: ['front', 'front-3q-left', 'front-3q-right'],
            keyframes: [
                buildFrontFrame(0, { ...seatedFront, 'r-upper-arm': 8, 'r-forearm': -20, 'l-upper-arm': -8, 'l-forearm': 20 }, { layerOrderOverride: frontLayerOrder, jointTilts: { neck: { x: -4, y: 0 }, waist: { x: 0, y: 0 } } }),
                buildFrontFrame(.20, { ...seatedFront, 'r-upper-arm': 12, 'r-forearm': -24, 'l-upper-arm': -12, 'l-forearm': 24 }, { layerOrderOverride: frontLayerOrder, jointTilts: { neck: { x: -8, y: 0 }, waist: { x: -12, y: 0 } } }),
                buildFrontFrame(.65, { 'r-upper-leg': 24, 'l-upper-leg': -24, 'r-upper-arm': 6, 'r-forearm': -10, 'l-upper-arm': -6, 'l-forearm': 10 }, { layerOrderOverride: frontLayerOrder, jointTilts: { neck: { x: -4, y: 0 }, waist: { x: -6, y: 0 } } }),
                buildFrontFrame(1, {}, { layerOrderOverride: frontLayerOrder, jointTilts: { neck: { x: 0, y: 0 }, waist: { x: 0, y: 0 } } })
            ]
        };
        [
            'walk-cycle',
            'run-cycle',
            'idle-breathe',
            'wave-cycle',
            'jump',
            'dance',
            'nod-yes',
            'jumping-jacks',
            'clap',
            'shake-head',
            'beckon',
            'look-around',
            'present-explain',
            'present-explain-alternate-right',
            'present-explain-alternate-left',
            'listen-agree',
            'startled-reaction',
            'call-attention',
            'phone-call-loop',
            'microphone-talk',
            'prayer-worship-loop',
            'carry-tray-walk-prep',
            'sway',
            'fidget',
            'march',
            'sneak',
            'punch-combo',
            'kick-combo',
            'boxing',
            'celebrate-bounce',
            'excited-hop',
            'turn-right',
            'turn-left'
        ].forEach(key => {
            if (catalog[key] || !JointSystem.ARMATURE_MOVEMENTS[key]) return;
            catalog[key] = JointSystem._cloneArmatureCatalogEntry(JointSystem.ARMATURE_MOVEMENTS[key]);
        });

        if (catalog['front-walk-forward']) {
            const roundMotionValue = (value) => Math.round(value * 1000) / 1000;
            const ensureFrontYTravel = (entry, travelY = 180, force = false) => {
                if (!entry || typeof entry !== 'object') return entry;
                const rootTravel = entry.rootTravel && typeof entry.rootTravel === 'object'
                    ? { ...entry.rootTravel }
                    : {};
                if (force || (!Number.isFinite(rootTravel.dy) && !Number.isFinite(rootTravel.y) && !Number.isFinite(rootTravel.distanceY))) {
                    rootTravel.dy = travelY;
                    delete rootTravel.y;
                    delete rootTravel.distanceY;
                }
                entry.rootTravel = rootTravel;
                entry.absoluteTravel = true;
                entry.walkTravelLoopFinalFromStart = true;
                entry.walkTravelLoopKeepTerminal = true;
                entry.easing = entry.easing || 'linear';
                entry.repeat = entry.repeat === Infinity ? 1 : (entry.repeat ?? 1);
                return entry;
            };
            const scaleMotionMap = (map, factor) => {
                if (!map || typeof map !== 'object' || !Number.isFinite(factor) || factor === 1) return;
                Object.keys(map).forEach(key => {
                    const value = map[key];
                    if (typeof value === 'number') {
                        map[key] = roundMotionValue(value * factor);
                    } else if (value && typeof value === 'object') {
                        ['x', 'y'].forEach(axis => {
                            if (Number.isFinite(value[axis])) value[axis] = roundMotionValue(value[axis] * factor);
                        });
                    }
                });
            };
            const createFrontTravelVariant = (sourceKey, overrides = {}) => {
                const entry = JointSystem._cloneArmatureCatalogEntry(catalog[sourceKey]);
                if (!entry) return null;
                entry.name = overrides.name || entry.name;
                entry.icon = overrides.icon || entry.icon || 'fa-person-walking';
                entry.category = overrides.category || 'Guided Essentials';
                entry.description = overrides.description || entry.description || '';
                entry.duration = overrides.duration || entry.duration || 4000;
                entry.repeat = overrides.repeat ?? 1;
                entry.easing = overrides.easing || entry.easing || 'linear';
                const angleScale = Number.isFinite(overrides.angleScale) ? overrides.angleScale : 1;
                const tiltScale = Number.isFinite(overrides.tiltScale) ? overrides.tiltScale : 1;
                if (Array.isArray(entry.keyframes) && (angleScale !== 1 || tiltScale !== 1)) {
                    entry.keyframes = entry.keyframes.map(frame => {
                        const next = Utils.deepClone(frame);
                        scaleMotionMap(next.jointAngles, angleScale);
                        scaleMotionMap(next.partAngles, angleScale);
                        scaleMotionMap(next.jointTilts, tiltScale);
                        scaleMotionMap(next.partTilts, tiltScale);
                        return next;
                    });
                }
                const hasTravelOverride = Number.isFinite(overrides.travelY);
                return ensureFrontYTravel(entry, hasTravelOverride ? overrides.travelY : 180, hasTravelOverride);
            };
            ensureFrontYTravel(catalog['front-walk-forward'], 180);
            const frontWalk = JointSystem._cloneArmatureCatalogEntry(catalog['front-walk-forward']);
            catalog['front-strut-forward-y'] = createFrontTravelVariant('front-walk-forward', {
                name: 'Front Strut Forward (Y)',
                icon: 'fa-person-walking-arrow-up',
                description: 'Energetic front-view strut that travels on the Y axis. Use Movement Blend Y px to set exact distance.',
                duration: 3200,
                angleScale: 1.12,
                tiltScale: 1.18,
                travelY: 190
            });
            catalog['front-stroll-forward-y'] = createFrontTravelVariant('front-walk-forward', {
                name: 'Front Stroll Forward (Y)',
                icon: 'fa-person-walking-arrow-up',
                description: 'Relaxed front-view stroll that travels on the Y axis. Use Movement Blend Y px to set exact distance.',
                duration: 4600,
                angleScale: 0.72,
                tiltScale: 0.72,
                travelY: 145
            });
            if (catalog['guided-run']) {
                const frontRunTravel = JointSystem._cloneArmatureCatalogEntry(catalog['guided-run']);
                catalog['guided-run-travel'] = {
                    ...frontRunTravel,
                    key: 'guided-run-travel',
                    name: 'Guided 3/4 Run Forward',
                    icon: 'fa-person-running-arrow-right',
                    category: 'Travel',
                    description: 'Fast 3/4-front run that travels on the X axis. Right-facing runs right; left-facing runs left.',
                    duration: frontRunTravel.duration || 780,
                    repeat: 1,
                    easing: 'linear',
                    absoluteTravel: false,
                    rootTravel: { x: 240 },
                    walkTravelLoopFinalFromStart: true,
                    walkTravelLoopKeepTerminal: true,
                    skipStartIdleBookend: true,
                    skipEndIdleBookend: true,
                    viewCompatibility: ['front-3q-left', 'front-3q-right'],
                    _front3qRunTravel: true
                };
                catalog['guided-strong-run-travel'] = {
                    ...frontRunTravel,
                    key: 'guided-strong-run-travel',
                    name: 'Guided 3/4 Strong Run Forward',
                    icon: 'fa-person-running-arrow-right',
                    category: 'Travel',
                    description: 'Stronger 3/4-front run that travels on the X axis. Right-facing runs right; left-facing runs left.',
                    duration: frontRunTravel.duration || 780,
                    repeat: 1,
                    easing: 'linear',
                    absoluteTravel: false,
                    rootTravel: { x: 260 },
                    walkTravelLoopFinalFromStart: true,
                    walkTravelLoopKeepTerminal: true,
                    skipStartIdleBookend: true,
                    skipEndIdleBookend: true,
                    viewCompatibility: ['front-3q-left', 'front-3q-right'],
                    _front3qRunTravel: true,
                    _front3qStrongRunTravel: true
                };
            }
            const createFront3qTurnAroundVariant = (sourceKey, facing, overrides = {}) => {
                const entry = JointSystem._cloneArmatureCatalogEntry(catalog[sourceKey]);
                if (!entry) return null;
                const opposite = facing === 'left' ? 'right' : 'left';
                const returnKey = overrides.returnKey || null;
                const facingLabel = facing === 'left' ? 'Left' : 'Right';
                return {
                    ...entry,
                    key: overrides.key || entry.key,
                    name: overrides.name || entry.name,
                    icon: overrides.icon || entry.icon || 'fa-person-walking-arrow-loop-left',
                    category: overrides.category || 'Travel',
                    description: overrides.description || entry.description || '',
                    duration: overrides.duration || Math.max(3000, (entry.duration || 1650) * 2),
                    repeat: overrides.repeat ?? 1,
                    frontBackTurnAround: true,
                    frontBackForwardKey: sourceKey,
                    frontBackReturnKey: returnKey,
                    frontBackReturnKeyByLean: returnKey ? { [opposite]: returnKey } : undefined,
                    frontBackReturnKeyByView: returnKey ? { [`back-3q-${opposite}`]: returnKey } : undefined,
                    viewCompatibility: [`front-3q-${facing}`],
                    semanticAction: overrides.semanticAction || entry.semanticAction || '',
                    semanticFamily: overrides.semanticFamily || (overrides.semanticAction ? String(overrides.semanticAction).split('.')[0] : entry.semanticFamily) || '',
                    motionIntent: overrides.motionIntent || entry.motionIntent || '3/4 locomotion with turn-around return',
                    authoringConvention: overrides.authoringConvention || entry.authoringConvention || JointSystem.ARMATURE_ANATOMY_CONVENTIONS.angle,
                    directionLabel: `Front 3/4 ${facingLabel}`,
                    turnAround: false,
                    _front3qPointAndBack: true,
                    _frontBack3qReturnLean: opposite
                };
            };
            if (catalog['guided-strut-travel']) {
                catalog['front-3q-walk-to-point-and-back-left'] = createFront3qTurnAroundVariant('guided-strut-travel', 'left', {
                    key: 'front-3q-walk-to-point-and-back-left',
                    name: '3/4 Front Walk to Point and Back (Left)',
                    description: '3/4-front-left walk to an X-axis target, flip to back 3/4 right, then walk back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.WALK,
                    returnKey: 'guided-back-3q-strut-forward-right'
                });
                catalog['front-3q-walk-to-point-and-back-right'] = createFront3qTurnAroundVariant('guided-strut-travel', 'right', {
                    key: 'front-3q-walk-to-point-and-back-right',
                    name: '3/4 Front Walk to Point and Back (Right)',
                    description: '3/4-front-right walk to an X-axis target, flip to back 3/4 left, then walk back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.WALK,
                    returnKey: 'guided-back-3q-strut-forward-left'
                });
                catalog['front-3q-strut-to-point-and-back-left'] = createFront3qTurnAroundVariant('guided-strut-travel', 'left', {
                    key: 'front-3q-strut-to-point-and-back-left',
                    name: '3/4 Front Strut to Point and Back (Left)',
                    description: '3/4-front-left strut to an X-axis target, flip to back 3/4 right, then strut back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STRUT,
                    returnKey: 'guided-back-3q-strut-forward-right'
                });
                catalog['front-3q-strut-to-point-and-back-right'] = createFront3qTurnAroundVariant('guided-strut-travel', 'right', {
                    key: 'front-3q-strut-to-point-and-back-right',
                    name: '3/4 Front Strut to Point and Back (Right)',
                    description: '3/4-front-right strut to an X-axis target, flip to back 3/4 left, then strut back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STRUT,
                    returnKey: 'guided-back-3q-strut-forward-left'
                });
            }
            if (catalog['guided-stroll-travel']) {
                catalog['front-3q-stroll-to-point-and-back-left'] = createFront3qTurnAroundVariant('guided-stroll-travel', 'left', {
                    key: 'front-3q-stroll-to-point-and-back-left',
                    name: '3/4 Front Stroll to Point and Back (Left)',
                    description: '3/4-front-left relaxed stroll to an X-axis target, flip to back 3/4 right, then stroll back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STROLL,
                    returnKey: 'guided-back-3q-stroll-forward-right'
                });
                catalog['front-3q-stroll-to-point-and-back-right'] = createFront3qTurnAroundVariant('guided-stroll-travel', 'right', {
                    key: 'front-3q-stroll-to-point-and-back-right',
                    name: '3/4 Front Stroll to Point and Back (Right)',
                    description: '3/4-front-right relaxed stroll to an X-axis target, flip to back 3/4 left, then stroll back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STROLL,
                    returnKey: 'guided-back-3q-stroll-forward-left'
                });
            }
            if (catalog['guided-run-travel']) {
                catalog['front-3q-run-to-point-and-back-left'] = createFront3qTurnAroundVariant('guided-run-travel', 'left', {
                    key: 'front-3q-run-to-point-and-back-left',
                    name: '3/4 Front Run to Point and Back (Left)',
                    icon: 'fa-person-running-arrow-left',
                    description: '3/4-front-left run to an X-axis target, flip to back 3/4 right, then run back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                    returnKey: 'guided-back-3q-run-forward-right',
                    duration: 4300
                });
                catalog['front-3q-run-to-point-and-back-right'] = createFront3qTurnAroundVariant('guided-run-travel', 'right', {
                    key: 'front-3q-run-to-point-and-back-right',
                    name: '3/4 Front Run to Point and Back (Right)',
                    icon: 'fa-person-running-arrow-right',
                    description: '3/4-front-right run to an X-axis target, flip to back 3/4 left, then run back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                    returnKey: 'guided-back-3q-run-forward-left',
                    duration: 4300
                });
            }
            if (catalog['guided-strong-run-travel']) {
                catalog['front-3q-strong-run-to-point-and-back-left'] = createFront3qTurnAroundVariant('guided-strong-run-travel', 'left', {
                    key: 'front-3q-strong-run-to-point-and-back-left',
                    name: '3/4 Front Strong Run to Point and Back (Left)',
                    icon: 'fa-person-running-arrow-left',
                    description: '3/4-front-left strong run to an X-axis target, flip to back 3/4 right, then strong run back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                    returnKey: 'guided-back-3q-strong-run-forward-right',
                    duration: 3900
                });
                catalog['front-3q-strong-run-to-point-and-back-right'] = createFront3qTurnAroundVariant('guided-strong-run-travel', 'right', {
                    key: 'front-3q-strong-run-to-point-and-back-right',
                    name: '3/4 Front Strong Run to Point and Back (Right)',
                    icon: 'fa-person-running-arrow-right',
                    description: '3/4-front-right strong run to an X-axis target, flip to back 3/4 left, then strong run back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                    returnKey: 'guided-back-3q-strong-run-forward-left',
                    duration: 3900
                });
            }
            catalog['walk-to-point-and-back'] = {
                ...frontWalk,
                name: 'Walk to Point and Back',
                icon: 'fa-person-walking-arrow-loop-left',
                category: 'Travel',
                description: 'Front-view walk to a Y target, turn to back view, then walk back to the start. Use Movement Blend Y px for exact distance.',
                duration: frontWalk.duration || 4000,
                repeat: 1,
                frontBackTurnAround: true,
                frontBackForwardKey: 'front-walk-forward',
                frontBackReturnKey: 'guided-back-strut-forward-y',
                front3qTurnAroundKeyByLean: {
                    left: 'front-3q-walk-to-point-and-back-left',
                    right: 'front-3q-walk-to-point-and-back-right'
                },
                viewCompatibility: ['front'],
                turnAround: false
            };
            if (catalog['front-strut-forward-y']) {
                const frontStrut = JointSystem._cloneArmatureCatalogEntry(catalog['front-strut-forward-y']);
                catalog['strut-to-point-and-back'] = {
                    ...frontStrut,
                    name: 'Strut to Point and Back',
                    icon: 'fa-person-walking-arrow-loop-left',
                    category: 'Travel',
                    description: 'Front-view strut to a Y target, turn to back view, then strut back to the start. Use Movement Blend Y px for exact distance.',
                    duration: frontStrut.duration || 3200,
                    repeat: 1,
                    frontBackTurnAround: true,
                    frontBackForwardKey: 'front-strut-forward-y',
                    frontBackReturnKey: 'guided-back-strut-forward-y',
                    front3qTurnAroundKeyByLean: {
                        left: 'front-3q-strut-to-point-and-back-left',
                        right: 'front-3q-strut-to-point-and-back-right'
                    },
                    viewCompatibility: ['front'],
                    turnAround: false
                };
            }
            if (catalog['front-stroll-forward-y']) {
                const frontStroll = JointSystem._cloneArmatureCatalogEntry(catalog['front-stroll-forward-y']);
                catalog['stroll-to-point-and-back'] = {
                    ...frontStroll,
                    name: 'Stroll to Point and Back',
                    icon: 'fa-person-walking-arrow-loop-left',
                    category: 'Travel',
                    description: 'Front-view relaxed stroll to a Y target, turn to back view, then stroll back to the start. Use Movement Blend Y px for exact distance.',
                    duration: frontStroll.duration || 4600,
                    repeat: 1,
                    frontBackTurnAround: true,
                    frontBackForwardKey: 'front-stroll-forward-y',
                    frontBackReturnKey: 'guided-back-stroll-forward-y',
                    front3qTurnAroundKeyByLean: {
                        left: 'front-3q-stroll-to-point-and-back-left',
                        right: 'front-3q-stroll-to-point-and-back-right'
                    },
                    viewCompatibility: ['front'],
                    turnAround: false
                };
            }
        }

        // Keep the held animation frame aligned with the corrected static pose,
        // retaining each authored frame's small gesture/wrist variations.
        const heldPoses = JointSystem._buildHumanFrontArmaturePoseCatalog();
        const aim = Utils.deepClone(heldPoses['aim-handgun-front']);
        const aimFrame = (t, recoil = false) => ({ t, shootingRecoil: recoil, jointAngles: {},
            contacts: { 'right-hand': { ...aim.contacts['right-hand'], y: recoil ? .17 : .2 } },
            layerOrderOverride: [...aim.layerOrderOverride] });
        catalog['shoot-handgun-front'] = {
            name: 'Shoot Handgun Forward', icon: 'fa-bullseye', category: 'Action',
            description: 'Idle, raise forward, aim, stylized recoil, settle and return to idle.',
            duration: 3000, repeat: 1, easing: 'easeInOut', viewCompatibility: ['front'],
            smoothContacts: true, restContactTransitions: true,
            keyframes: [{ t: 0, jointAngles: {} }, aimFrame(.3), aimFrame(.48),
                aimFrame(.52, true), aimFrame(.62), aimFrame(.75), { t: 1, jointAngles: {} }]
        };
        JointSystem._addRiflePresets(catalog);
        for (const [moveKey, poseKey] of [
            ['phone-call-loop', 'phone-call'], ['phone-call-pre-ear-loop', 'phone-call-pre-ear'],
            ['microphone-talk', 'hold-microphone'], ['read-book-seated', 'reading-book'],
            ['write-seated', 'writing-typing'], ['type-seated', 'writing-typing']
        ]) {
            const move = catalog[moveKey], pose = heldPoses[poseKey];
            if (!move?.keyframes?.length || !pose) continue;
            const first = { ...move.keyframes[0].jointAngles };
            for (const frame of move.keyframes) {
                for (const [name, value] of Object.entries(pose.jointAngles)) {
                    frame.jointAngles[name] = value + ((frame.jointAngles[name] ?? first[name] ?? 0) - (first[name] ?? 0));
                }
                frame.contacts = Utils.deepClone(pose.contacts || {});
                frame.frontAngleConvention = 'mirrored';
                frame.jointTilts = { ...frame.jointTilts, ...Utils.deepClone(pose.jointTilts || {}) };
                if (moveKey.endsWith('seated')) {
                    const seated = heldPoses['writing-typing'];
                    for (const name of ['right-hip', 'left-hip', 'right-knee', 'left-knee']) frame.jointAngles[name] = seated.jointAngles[name];
                    for (const name of ['right-hip', 'left-hip']) frame.jointTilts[name] = { ...seated.jointTilts[name] };
                    frame.partAngles = { ...frame.partAngles, torso: 0 };
                    frame.dy = seated.dy;
                    frame.seatDepth = 1;
                }
            }
            move.frontAngleConvention = 'mirrored';
        }
        JointSystem._projectSeatedMovements(catalog);
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._refineDeskHandMovements(catalog, 'front');
        JointSystem._addScenarioMovements(catalog, 'front');
        JointSystem._humanFrontArmatureMovementCatalog = JointSystem._finalizeHumanFrontArmatureMovementCatalog(catalog);
        return catalog;
    }

JointSystem._buildHumanBackArmaturePoseCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (JointSystem._humanBackArmaturePoseCatalog) {
            return JointSystem._humanBackArmaturePoseCatalog;
        }

        const workingArmsBehindTorsoOrder = ['right-arm', 'left-arm', 'left-leg', 'right-leg', 'head-neck', 'torso'];
        const bothArmsBehindOrder = ['right-leg', 'left-leg', 'left-arm', 'right-arm', 'torso', 'head-neck'];
        const poseDefs = [
            // ── Category 1: Basic Stances ──
            {
                key: 'idle',
                name: 'Neutral Standing',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Neutral rear-view rest pose with all limbs straight down.',
                angles: {}
            },
            {
                key: 'a-pose',
                name: 'A-Pose (Slight Spread)',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Arms and legs slightly spread from the body.',
                angles: { 'l-upper-arm': 15, 'r-upper-arm': -15, 'l-upper-leg': 10, 'r-upper-leg': -10 }
            },
            {
                key: 't-pose',
                name: 'T-Pose',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Arms fully extended to both sides.',
                angles: { 'l-upper-arm': 90, 'r-upper-arm': -90 }
            },
            {
                key: 'hands-on-hips-back',
                name: 'Hands on Hips',
                icon: 'fa-user',
                category: 'Standing',
                description: 'Rear-view hands-on-hips stance with elbows visible.',
                angles: {
                    'l-upper-arm': 35, 'l-forearm': -70, 'l-hand': -20,
                    'r-upper-arm': -35, 'r-forearm': 70, 'r-hand': 20,
                    'l-upper-leg': 5, 'r-upper-leg': -5
                }
            },
            {
                key: 'wide-stance',
                name: 'Wide Stance (Aggressive)',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Wide aggressive stance with arms slightly raised.',
                angles: {
                    head: 10,
                    'l-upper-arm': 25, 'l-forearm': -10, 'l-hand': -10,
                    'r-upper-arm': -25, 'r-forearm': 10, 'r-hand': 10,
                    'l-upper-leg': 25, 'l-foot': -15,
                    'r-upper-leg': -25, 'r-foot': 15
                }
            },

            // ── Category 2: Expressive & Emotional ──
            {
                key: 'arms-crossed-behind-back',
                name: 'Arms Crossed (Behind Back)',
                icon: 'fa-hands',
                category: 'Gestures',
                description: 'Both arms folded behind the back, forearms crossing the lower back.',
                angles: {
                    'l-upper-arm': -15, 'l-forearm': -42, 'l-hand': -15,
                    'r-upper-arm': 15, 'r-forearm': 39, 'r-hand': 15
                },
                backViewLayerOverride: bothArmsBehindOrder,
                layerOrderOverride: bothArmsBehindOrder,
                threeQuarterLayerOverride: true
            },
            {
                key: 'reaching-up',
                name: 'Reaching Up (Stretch)',
                icon: 'fa-hands',
                category: 'Gestures',
                description: 'Both arms raised overhead in a stretch, on toes.',
                angles: {
                    head: -15,
                    'l-upper-arm': 170, 'r-upper-arm': -170,
                    'l-foot': 15, 'r-foot': -15
                }
            },
            {
                key: 'defeated-slumped',
                name: 'Defeated / Slumped',
                icon: 'fa-person',
                category: 'Expressive',
                description: 'Slumped posture with head dropped forward.',
                angles: {
                    torso: 15, head: 20,
                    'l-upper-arm': -5, 'l-forearm': 10, 'l-hand': 15,
                    'r-upper-arm': 5, 'r-forearm': -10, 'r-hand': -15,
                    'l-upper-leg': 10, 'l-lower-leg': 15, 'l-foot': -5,
                    'r-upper-leg': -10, 'r-lower-leg': -15, 'r-foot': 5
                }
            },
            {
                key: 'waving-right-hand',
                name: 'Waving (Right Hand)',
                icon: 'fa-hand',
                category: 'Gestures',
                description: 'Back-view wave with the right arm raised high.',
                angles: {
                    torso: -5,
                    'r-upper-arm': -140, 'r-forearm': -45, 'r-hand': -20,
                    'l-upper-leg': 5
                }
            },
            {
                key: 'phone-call-back',
                name: 'Phone Call',
                icon: 'fa-phone',
                category: 'Communication',
                description: 'Rear-view listening pose with the right hand lifted toward the ear.',
                angles: {
                    torso: 0, head: 0,
                    'r-upper-arm': -113, 'r-forearm': -125, 'r-hand': 0,
                    'l-upper-arm': 0, 'l-forearm': 0, 'l-hand': 0
                },
                contacts: { 'right-hand': { tag: 'r-ear', offsetX: 4, offsetY: 10, iterations: 12 } },
                backViewLayerOverride: ['left-arm', 'right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm']
            },
            {
                key: 'phone-call-pre-ear-back',
                name: 'Phone Call (Pre-Ear)',
                icon: 'fa-phone-volume',
                category: 'Communication',
                description: 'Rear-view near-ear prep pose that stops short of contact.',
                angles: {
                    torso: 0, head: -2,
                    'r-upper-arm': -108, 'r-forearm': -122, 'r-hand': 2,
                    'l-upper-arm': 0, 'l-forearm': 0, 'l-hand': 0
                },
                contacts: { 'right-hand': { tag: 'r-ear', offsetX: 12, offsetY: 12, iterations: 10 } },
                backViewLayerOverride: ['right-leg', 'left-leg', 'torso', 'head-neck', 'left-arm', 'right-arm']
            },
            {
                key: 'read-book-seated-back',
                name: 'Read Book (Seated)',
                icon: 'fa-book-open',
                category: 'Daily Activities',
                description: 'Rear-view seated book-reading pose with the elbows folded inward toward the chest.',
                angles: {
                    torso: 4, head: -6,
                    'l-upper-arm': 34, 'l-forearm': -94, 'l-hand': 8,
                    'r-upper-arm': -34, 'r-forearm': 94, 'r-hand': -8,
                    'l-upper-leg': 58, 'l-lower-leg': -82,
                    'r-upper-leg': -58, 'r-lower-leg': 82
                },
                backViewLayerOverride: workingArmsBehindTorsoOrder,
                threeQuarterLayerOverride: true,
                torsoFrontmost: true
            },
            {
                key: 'write-seated-back',
                name: 'Write (Seated)',
                icon: 'fa-pen',
                category: 'Daily Activities',
                description: 'Rear-view seated writing pose with the elbows tucked and the forearms moving in a small writing arc.',
                angles: {
                    torso: 5, head: -8,
                    'l-upper-arm': 20, 'l-forearm': -74, 'l-hand': 4,
                    'r-upper-arm': -20, 'r-forearm': 74, 'r-hand': -4,
                    'l-upper-leg': 58, 'l-lower-leg': -82,
                    'r-upper-leg': -58, 'r-lower-leg': 82
                },
                backViewLayerOverride: workingArmsBehindTorsoOrder,
                threeQuarterLayerOverride: true,
                torsoFrontmost: true
            },
            {
                key: 'type-seated-back',
                name: 'Type (Seated)',
                icon: 'fa-keyboard',
                category: 'Daily Activities',
                description: 'Rear-view seated typing pose with the arms held close to the keyboard for a stable working posture.',
                angles: {
                    torso: 3, head: -6,
                    'l-upper-arm': 18, 'l-forearm': -70, 'l-hand': 2,
                    'r-upper-arm': -18, 'r-forearm': 70, 'r-hand': -2,
                    'l-upper-leg': 58, 'l-lower-leg': -82,
                    'r-upper-leg': -58, 'r-lower-leg': 82
                },
                backViewLayerOverride: workingArmsBehindTorsoOrder,
                threeQuarterLayerOverride: true,
                torsoFrontmost: true
            },
            {
                key: 'hold-microphone-back',
                name: 'Hold Microphone',
                icon: 'fa-microphone',
                category: 'Communication',
                description: 'Rear-view speaking pose with the right hand raised in front of the mouth line.',
                angles: {
                    torso: 0, head: 1,
                    'r-upper-arm': -14, 'r-forearm': -120, 'r-hand': 0,
                    'l-upper-arm': 0, 'l-forearm': 0, 'l-hand': 0
                },
                contacts: { 'right-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } },
                backViewLayerOverride: ['right-leg', 'left-leg', 'torso', 'head-neck', 'left-arm', 'right-arm']
            },
            {
                key: 'hands-behind-head',
                name: 'Hands Behind Head (Relaxed)',
                icon: 'fa-person',
                category: 'Gestures',
                description: 'Relaxed rear-view pose with both hands behind the head.',
                angles: {
                    torso: -5, head: -10,
                    'l-upper-arm': 150, 'l-forearm': 70, 'l-hand': 10,
                    'r-upper-arm': -150, 'r-forearm': -75, 'r-hand': -10,
                    'r-upper-leg': -10, 'r-lower-leg': 5
                },
                backViewLayerOverride: ['right-leg', 'left-leg', 'torso', 'head-neck', 'left-arm', 'right-arm']
            },

            // ── Category 3: Action & Combat ──
            {
                key: 'defensive-guard',
                name: 'Defensive Guard',
                icon: 'fa-shield-halved',
                category: 'Action',
                description: 'Wide defensive guard stance from behind.',
                angles: {
                    torso: 5, head: -5,
                    'l-upper-arm': 45, 'l-forearm': -90, 'l-hand': -10,
                    'r-upper-arm': -45, 'r-forearm': 90, 'r-hand': 10,
                    'l-upper-leg': 15, 'l-lower-leg': 10, 'l-foot': -5,
                    'r-upper-leg': -15, 'r-lower-leg': -10, 'r-foot': 5
                }
            },
            {
                key: 'preparing-to-throw',
                name: 'Preparing to Throw (Right Hand)',
                icon: 'fa-hand-back-fist',
                category: 'Action',
                description: 'Right hand raised to throw, torso twisted.',
                angles: {
                    torso: 15, head: -10,
                    'l-upper-arm': 80, 'l-forearm': -20,
                    'r-upper-arm': -110, 'r-forearm': 80, 'r-hand': 20,
                    'l-upper-leg': 10, 'l-lower-leg': 15,
                    'r-upper-leg': -20, 'r-lower-leg': -5, 'r-foot': 15
                }
            },
            {
                key: 'jumping-mid-air',
                name: 'Jumping (Mid-Air Spread)',
                icon: 'fa-person-falling',
                category: 'Action',
                description: 'Mid-air rear-view jump with controlled leg spread.',
                angles: {
                    head: -10,
                    'l-upper-arm': 130, 'l-forearm': -20, 'l-hand': -10,
                    'r-upper-arm': -130, 'r-forearm': 20, 'r-hand': 10,
                    'l-upper-leg': 24, 'l-lower-leg': 10, 'l-foot': -8,
                    'r-upper-leg': -24, 'r-lower-leg': -10, 'r-foot': 8
                },
                dy: -30
            },
            {
                key: 'high-kick-left',
                name: 'High Side Kick (Left Leg)',
                icon: 'fa-person-running',
                category: 'Action',
                description: 'Left leg kicked high to the side.',
                angles: {
                    torso: -15,
                    'l-upper-arm': 80, 'l-forearm': -20,
                    'r-upper-arm': -30, 'r-forearm': 40,
                    'l-upper-leg': 90, 'l-foot': -15,
                    'r-upper-leg': -5
                }
            },
            {
                key: 'high-kick-right',
                name: 'High Side Kick (Right Leg)',
                icon: 'fa-person-running',
                category: 'Action',
                description: 'Right leg kicked high to the side.',
                angles: {
                    torso: 15,
                    'l-upper-arm': 30, 'l-forearm': -40,
                    'r-upper-arm': -80, 'r-forearm': 20,
                    'l-upper-leg': 5,
                    'r-upper-leg': -90, 'r-foot': 15
                }
            },

            // ── Category 4: Exaggerated Movement ──
            {
                key: 'walk-away-contact-left',
                name: 'Walking Away (Contact Left)',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Rear-view walk contact pose with left foot forward.',
                angles: {
                    torso: 3,
                    'l-upper-arm': 10, 'l-forearm': -5,
                    'r-upper-arm': -20, 'r-forearm': 8,
                    'l-upper-leg': 12, 'l-foot': -5,
                    'r-upper-leg': 6, 'r-lower-leg': -15, 'r-foot': 8
                },
                dy: -3
            },
            {
                key: 'walk-away-passing-right',
                name: 'Walking Away (Passing Right)',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Rear-view walk passing pose with right foot lifted.',
                angles: {
                    'l-upper-arm': 3, 'r-upper-arm': -3,
                    'r-upper-leg': -18, 'r-lower-leg': -30, 'r-foot': 10
                },
                dy: -4
            },
            {
                key: 'walk-away-contact-right',
                name: 'Walking Away (Contact Right)',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Rear-view walk contact pose with right foot forward.',
                angles: {
                    torso: -3,
                    'l-upper-arm': 20, 'l-forearm': -8,
                    'r-upper-arm': -10, 'r-forearm': 5,
                    'l-upper-leg': -6, 'l-lower-leg': 15, 'l-foot': -8,
                    'r-upper-leg': -12, 'r-foot': 5
                },
                dy: -3
            },
            {
                key: 'walk-away-passing-left',
                name: 'Walking Away (Passing Left)',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Rear-view walk passing pose with left foot lifted.',
                angles: {
                    'l-upper-arm': 3, 'r-upper-arm': -3,
                    'l-upper-leg': 18, 'l-lower-leg': 30, 'l-foot': -10
                },
                dy: -4
            },
            {
                key: 'running-away',
                name: 'Running Away (Airborne)',
                icon: 'fa-person-running',
                category: 'Locomotion',
                description: 'Mid-air running pose from behind with spread limbs.',
                angles: {
                    torso: 6, head: -3,
                    'l-upper-arm': 30, 'l-forearm': -40,
                    'r-upper-arm': -50, 'r-forearm': 20,
                    'l-upper-leg': 18, 'l-lower-leg': 6, 'l-foot': -6,
                    'r-upper-leg': -25, 'r-lower-leg': -40, 'r-foot': 8
                },
                dy: -15
            },

            // ── Category 5: Situational & Expressive ──
            {
                key: 'y-pose-victory',
                name: 'Y-Pose (Victory / Cheering)',
                icon: 'fa-trophy',
                category: 'Expressive',
                description: 'Both arms raised in a Y shape, celebrating.',
                angles: {
                    head: -20,
                    'l-upper-arm': 140, 'r-upper-arm': -140,
                    'l-upper-leg': 15, 'l-foot': -5,
                    'r-upper-leg': -15, 'r-foot': 5
                }
            },
            {
                key: 'hands-clasped-behind-back',
                name: 'Hands Clasped Behind Back',
                icon: 'fa-hands',
                category: 'Gestures',
                description: 'Resting pose with hands clasped behind the back.',
                angles: {
                    'l-upper-arm': 15, 'l-forearm': -30, 'l-hand': -45,
                    'r-upper-arm': -15, 'r-forearm': 30, 'r-hand': 45,
                    'l-upper-leg': 5, 'r-upper-leg': -5
                },
                backViewLayerOverride: bothArmsBehindOrder,
                threeQuarterLayerOverride: true
            },
            {
                key: 'scratching-back-of-head',
                name: 'Scratching Back of Head (Right)',
                icon: 'fa-head-side-virus',
                category: 'Gestures',
                description: 'Right hand reaches the back of the head.',
                angles: {
                    torso: -3, head: -8,
                    'l-upper-arm': 8,
                    'r-upper-arm': -150, 'r-forearm': -80, 'r-hand': 15,
                    'r-upper-leg': -5
                },
                backViewLayerOverride: ['left-arm', 'right-leg', 'left-leg', 'torso', 'head-neck', 'right-arm']
            },
            {
                key: 'pointing-up-left-arm',
                name: 'Pointing Up and Away (Left)',
                icon: 'fa-hand-point-up',
                category: 'Gestures',
                description: 'Left arm pointing up and away from the body.',
                angles: {
                    torso: 10, head: -15,
                    'l-upper-arm': 135, 'l-hand': -10,
                    'r-upper-arm': -10, 'r-forearm': 5,
                    'l-upper-leg': 10, 'r-upper-leg': -10
                }
            },
            {
                key: 'handshake-back-spec',
                name: 'Handshake (Back View - Spec)',
                icon: 'fa-handshake',
                category: 'Social',
                description: 'Back-view handshake pose with active right arm and idle left arm using exact provided values.',
                angles: {
                    torso: 0,
                    head: 0,
                    'r-upper-arm': -23, 'r-forearm': 0, 'r-hand': -8,
                    'l-upper-arm': 0, 'l-forearm': 0, 'l-hand': 0
                },
                tilts: {
                    'r-upper-arm': { x: 45 },
                    'l-upper-arm': { x: 0 }
                }
            },
            {
                key: 'shrugging',
                name: 'Shrugging (Palms Out)',
                icon: 'fa-person-shrugging',
                category: 'Expressive',
                description: 'Shrug with elbows bent at right angles, palms facing outward.',
                angles: {
                    head: 10,
                    'l-upper-arm': 45, 'l-forearm': -40, 'l-hand': 30,
                    'r-upper-arm': -45, 'r-forearm': 40, 'r-hand': -30,
                    'l-upper-leg': 10, 'r-upper-leg': -10
                }
            },
            {
                key: 'squat-back-true-sides',
                name: 'Deep Squat (Back View - True Sides)',
                icon: 'fa-dumbbell',
                category: 'Fitness',
                description: 'Back-view squat using body drop plus realistic hip and knee flexion.',
                angles: {
                    head: 0,
                    'l-upper-arm': 90, 'l-forearm': 0, 'l-hand': 0,
                    'r-upper-arm': -90, 'r-forearm': 0, 'r-hand': 0,
                    'l-upper-leg': 73, 'l-lower-leg': -102, 'l-foot': 0,
                    'r-upper-leg': -66, 'r-lower-leg': 81, 'r-foot': 0
                },
                dy: 110
            },
            {
                key: 'falling-backwards',
                name: 'Falling Backwards (Arms Flailing)',
                icon: 'fa-person-falling-burst',
                category: 'Action',
                description: 'Arms flailing while falling backwards.',
                angles: {
                    torso: -15, head: -25,
                    'l-upper-arm': 160, 'l-forearm': -30, 'l-hand': -20,
                    'r-upper-arm': -160, 'r-forearm': 30, 'r-hand': 20,
                    'l-upper-leg': 20, 'l-lower-leg': 10, 'l-foot': -15,
                    'r-upper-leg': -40, 'r-lower-leg': -20, 'r-foot': 20
                }
            },
            {
                key: 'balancing-one-leg',
                name: 'Balancing on One Leg (Right Out)',
                icon: 'fa-person',
                category: 'Action',
                description: 'Balancing on the left leg with right leg extended out.',
                angles: {
                    torso: 10,
                    'l-upper-arm': 70, 'l-hand': -10,
                    'r-upper-arm': -80, 'r-forearm': 15, 'r-hand': 10,
                    'r-upper-leg': -60, 'r-lower-leg': -10, 'r-foot': 15
                }
            },
            {
                key: 'attention-back',
                name: 'Attention (Back View)',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Straight rear-view attention stance with hands at the sides.',
                angles: {
                    head: 0,
                    torso: 0,
                    'l-upper-arm': 2, 'l-forearm': -3,
                    'r-upper-arm': -2, 'r-forearm': 3,
                    'l-upper-leg': 0, 'r-upper-leg': 0
                }
            },
            {
                key: 'relaxed-back',
                name: 'Relaxed (Back View)',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Soft rear-view standing pose with relaxed shoulders and knees.',
                angles: {
                    head: -2,
                    torso: 1,
                    'l-upper-arm': 8, 'l-forearm': -8, 'l-hand': -4,
                    'r-upper-arm': -8, 'r-forearm': 8, 'r-hand': 4,
                    'l-upper-leg': 4, 'l-lower-leg': -4,
                    'r-upper-leg': -4, 'r-lower-leg': 4
                }
            },
            {
                key: 'back-3q-left-stance',
                name: '3/4 Back Stance (Left)',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Back 3/4-left stance with the torso turned while the rear-facing head and limbs remain cleanly aligned.',
                angles: {
                    torso: 0,
                    head: 0,
                    'l-upper-arm': 0, 'l-forearm': 0,
                    'r-upper-arm': 0, 'r-forearm': 0,
                    'l-upper-leg': 0,
                    'r-upper-leg': 0
                },
                tilts: {
                    torso: { y: 45 },
                    head: { y: 0 },
                    'l-upper-arm': { y: 0 },
                    'r-upper-arm': { y: 0 },
                    'l-upper-leg': { y: 0 },
                    'r-upper-leg': { y: 0 }
                },
                backViewLayerOverride: ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm']
            },
            {
                key: 'back-3q-right-stance',
                name: '3/4 Back Stance (Right)',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Back 3/4-right stance using the corrected right-facing rear layer stack.',
                angles: {
                    torso: 0,
                    head: 0,
                    'l-upper-arm': 0, 'l-forearm': 0,
                    'r-upper-arm': 0, 'r-forearm': 0,
                    'l-upper-leg': 0,
                    'r-upper-leg': 0
                },
                tilts: {
                    torso: { y: -45 },
                    head: { y: -45 },
                    'l-upper-arm': { y: -45 },
                    'r-upper-arm': { y: -45 },
                    'l-upper-leg': { y: -45 },
                    'r-upper-leg': { y: -45 }
                },
                backViewLayerOverride: ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm']
            },

            // ── Category 6: Seated ──
            {
                key: 'sit-back-true-sides',
                name: 'Sit (Back View - True Sides)',
                icon: 'fa-chair',
                category: 'Seated',
                description: 'Back-view seated pose using screen-true left/right limb mapping with restrained knees.',
                angles: {
                    head: 0,
                    'l-upper-arm': 26, 'l-forearm': -77, 'l-hand': 0,
                    'r-upper-arm': -21, 'r-forearm': 66, 'r-hand': 0,
                    'l-upper-leg': 58, 'l-lower-leg': -62, 'l-foot': -3,
                    'r-upper-leg': -58, 'r-lower-leg': 62, 'r-foot': 3
                },
                dy: 82
            }
        ];

        const catalog = {};
        poseDefs.forEach(poseDef => {
            const converted = JointSystem._convertHumanBackAnglesToArmaturePoseData(poseDef.angles || {});
            const convertedTilts = JointSystem._convertHumanFrontTiltsToArmaturePoseData(poseDef.tilts || {});
            catalog[poseDef.key] = {
                name: poseDef.name,
                icon: poseDef.icon || 'fa-person',
                category: poseDef.category || 'Standing',
                description: poseDef.description || '',
                jointAngles: converted.jointAngles,
                partAngles: converted.partAngles
            };
            if (Object.keys(convertedTilts.jointTilts).length) {
                catalog[poseDef.key].jointTilts = convertedTilts.jointTilts;
            }
            if (Object.keys(convertedTilts.partTilts).length) {
                catalog[poseDef.key].partTilts = convertedTilts.partTilts;
            }
            if (typeof poseDef.dy === 'number') {
                catalog[poseDef.key].dy = poseDef.dy;
            }
            if (poseDef.contacts && Object.keys(poseDef.contacts).length) {
                catalog[poseDef.key].contacts = Utils.deepClone(poseDef.contacts);
            }
            JointSystem._copyArmatureLayerOverrideFields(catalog[poseDef.key], poseDef);
        });

        for (const key of ['read-book-seated-back', 'write-seated-back', 'type-seated-back', 'sit-back-true-sides']) {
            const pose = catalog[key];
            Object.assign(pose.jointAngles, { 'right-hip': 0, 'left-hip': 0, 'right-knee': 0, 'left-knee': 0, 'right-ankle': 0, 'left-ankle': 0 });
            pose.jointTilts = { ...pose.jointTilts, 'right-hip': { x: 0, y: 0 }, 'left-hip': { x: 0, y: 0 } };
            pose.seatDepth = 1;
            pose.partAngles = { ...pose.partAngles, torso: 0 };
            pose.dy = 70;
        }
        const eating = JointSystem._cloneArmatureCatalogEntry(catalog['sit-back-true-sides']);
        const reach = catalog['hold-microphone-back'];
        eating.jointAngles = { ...eating.jointAngles, ...reach.jointAngles };
        Object.assign(eating, {
            name: 'Sitting + Eating (Back)', icon: 'fa-utensils', category: 'Daily Activities',
            description: 'Seated hand-to-mouth hold on the far side of the torso.',
            grounding: 'planted', dy: 0, seatDepth: 1,
            contacts: { 'right-hand': { tag: 'mouth', offsetX: 0, offsetY: 8, iterations: 16 } },
            backViewLayerOverride: [...workingArmsBehindTorsoOrder],
            layerOrderOverride: [...workingArmsBehindTorsoOrder],
            threeQuarterLayerOverride: true, torsoFrontmost: true
        });
        catalog['sit-eating-back'] = eating;
        JointSystem._applyDefaultArmaturePoseCompatibility(catalog, ['back']);
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._addHandgunViewPresets(catalog, 'back');
        JointSystem._humanBackArmaturePoseCatalog = catalog;
        return catalog;
    }

JointSystem._buildHumanBackArmatureMovementCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (JointSystem._humanBackArmatureMovementCatalog) {
            return JointSystem._humanBackArmatureMovementCatalog;
        }

        const frame = (t, angles = {}, dy = 0, tilts = null) => {
            const options = dy && typeof dy === 'object'
                ? { ...dy }
                : { dy, tilts };
            const converted = JointSystem._convertHumanBackAnglesToArmaturePoseData(angles);
            const convertedTilts = JointSystem._convertHumanFrontTiltsToArmaturePoseData(options.tilts || {});
            const result = { t };
            if (Object.keys(converted.jointAngles).length) result.jointAngles = converted.jointAngles;
            if (Object.keys(converted.partAngles).length) result.partAngles = converted.partAngles;
            if (Object.keys(convertedTilts.jointTilts).length) result.jointTilts = convertedTilts.jointTilts;
            if (Object.keys(convertedTilts.partTilts).length) result.partTilts = convertedTilts.partTilts;
            if (Number.isFinite(options.dx) && Math.abs(options.dx) > 0.001) result.dx = options.dx;
            if (Number.isFinite(options.dy) && Math.abs(options.dy) > 0.001) result.dy = options.dy;
            if (options.contacts && Object.keys(options.contacts).length) result.contacts = Utils.deepClone(options.contacts);
            JointSystem._copyArmatureLayerOverrideFields(result, options);
            return result;
        };
        const moveFrame = (t, angles = {}, options = {}) => {
            const converted = JointSystem._convertHumanBackAnglesToArmaturePoseData(angles);
            const convertedTilts = JointSystem._convertHumanFrontTiltsToArmaturePoseData(options.tilts || {});
            const result = { t };
            if (Object.keys(converted.jointAngles).length) result.jointAngles = converted.jointAngles;
            if (Object.keys(converted.partAngles).length) result.partAngles = converted.partAngles;
            if (Object.keys(convertedTilts.jointTilts).length) result.jointTilts = convertedTilts.jointTilts;
            if (Object.keys(convertedTilts.partTilts).length) result.partTilts = convertedTilts.partTilts;
            if (Number.isFinite(options.dx) && Math.abs(options.dx) > 0.001) result.dx = options.dx;
            if (Number.isFinite(options.dy) && Math.abs(options.dy) > 0.001) result.dy = options.dy;
            if (options.contacts && Object.keys(options.contacts).length) result.contacts = Utils.deepClone(options.contacts);
            if (Array.isArray(options.backViewLayerOverride)) result.backViewLayerOverride = [...options.backViewLayerOverride];
            if (Array.isArray(options.layerOrderOverride)) result.layerOrderOverride = [...options.layerOrderOverride];
            if (options.agbadaArmLayerMode) result.agbadaArmLayerMode = options.agbadaArmLayerMode;
            return result;
        };

        // ── Walk cycle key poses (subtle back-facing convention) ──
        const walkContactL = {
            torso: 3,
            'l-upper-arm': 10, 'l-forearm': -5,
            'r-upper-arm': -20, 'r-forearm': 8,
            'l-upper-leg': 12, 'l-foot': -5,
            'r-upper-leg': 6, 'r-lower-leg': -15, 'r-foot': 8
        };
        const walkPassingR = {
            'l-upper-arm': 3, 'r-upper-arm': -3,
            'r-upper-leg': -18, 'r-lower-leg': -30, 'r-foot': 10
        };
        const walkContactR = {
            torso: -3,
            'l-upper-arm': 20, 'l-forearm': -8,
            'r-upper-arm': -10, 'r-forearm': 5,
            'l-upper-leg': -6, 'l-lower-leg': 15, 'l-foot': -8,
            'r-upper-leg': -12, 'r-foot': 5
        };
        const walkPassingL = {
            'l-upper-arm': 3, 'r-upper-arm': -3,
            'l-upper-leg': 18, 'l-lower-leg': 30, 'l-foot': -10
        };

        // ── Run cycle key poses (subtle back-facing convention) ──
        const runContactL = {
            torso: 3, head: -1,
            'l-upper-arm': 10, 'l-forearm': -8,
            'r-upper-arm': -14, 'r-forearm': 8,
            'l-upper-leg': 10, 'l-lower-leg': 4, 'l-foot': -3,
            'r-upper-leg': -12, 'r-lower-leg': -10, 'r-foot': 4
        };
        const runContactR = {
            torso: -3, head: 1,
            'l-upper-arm': -10, 'l-forearm': 8,
            'r-upper-arm': 14, 'r-forearm': -8,
            'l-upper-leg': -12, 'l-lower-leg': -10, 'l-foot': 4,
            'r-upper-leg': 10, 'r-lower-leg': 4, 'r-foot': -3
        };
        const runMidFlight = {
            head: -1,
            'l-upper-arm': 0, 'l-forearm': 0,
            'r-upper-arm': 0, 'r-forearm': 0,
            'l-upper-leg': 0, 'l-lower-leg': 0, 'l-foot': 0,
            'r-upper-leg': 0, 'r-lower-leg': 0, 'r-foot': 0
        };

        // ── Wave shapes ──
        const waveBase = { torso: -5, 'r-upper-arm': -140, 'r-forearm': -45, 'r-hand': -20, 'l-upper-leg': 5 };
        const waveHigh = { torso: -5, 'r-upper-arm': -150, 'r-forearm': -30, 'r-hand': -10, 'l-upper-leg': 5 };
        const waveLow  = { torso: -5, 'r-upper-arm': -130, 'r-forearm': -55, 'r-hand': -25, 'l-upper-leg': 5 };
        const backLayerOrder = ['right-arm', 'left-arm', 'right-leg', 'left-leg', 'torso', 'head-neck'];
        const workingArmsBehindTorsoOrder = ['right-arm', 'left-arm', 'left-leg', 'right-leg', 'head-neck', 'torso'];
        const back3qLeftLayerOrder = ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const back3qRightLayerOrder = ['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm'];
        const makeBack3qTilt = (y) => ({
            torso: { y },
            head: { y },
            'l-upper-arm': { y },
            'r-upper-arm': { y },
            'l-upper-leg': { y },
            'r-upper-leg': { y }
        });
        const back3qLeftTilt = makeBack3qTilt(45);
        const back3qRightTilt = makeBack3qTilt(-45);
        const makeBack3qStrideTilt = (y, phase = 0, scale = 1) => {
            const swing = Math.max(-1, Math.min(1, Number(phase) || 0)) * scale;
            const armX = 24 * swing;
            const legX = 18 * swing;
            return {
                torso: { x: 0, y },
                head: { x: 0, y },
                'r-upper-arm': { x: armX, y },
                'l-upper-arm': { x: -armX, y },
                'r-upper-leg': { x: -legX, y },
                'l-upper-leg': { x: legX, y }
            };
        };
        const back3qLeftStrideTiltA = makeBack3qStrideTilt(45, -1, 1);
        const back3qLeftStrideTiltB = makeBack3qStrideTilt(45, 1, 1);
        const back3qRightStrideTiltA = makeBack3qStrideTilt(-45, 1, 1);
        const back3qRightStrideTiltB = makeBack3qStrideTilt(-45, -1, 1);
        const back3qLeftStrollTiltA = makeBack3qStrideTilt(45, -1, 0.66);
        const back3qLeftStrollTiltB = makeBack3qStrideTilt(45, 1, 0.66);
        const back3qRightStrollTiltA = makeBack3qStrideTilt(-45, 1, 0.66);
        const back3qRightStrollTiltB = makeBack3qStrideTilt(-45, -1, 0.66);
        const withBackWalkSwingTilt = (baseTilts = {}, phase = 1, options = {}) => {
            const armX = Number.isFinite(options.armX) ? options.armX : 45;
            const legX = Number.isFinite(options.legX) ? options.legX : 35;
            const swing = Number.isFinite(phase) ? phase : 0;
            const merge = (key, x) => ({ ...(baseTilts[key] || {}), x });
            return {
                torso: baseTilts.torso ? { ...baseTilts.torso } : {},
                head: baseTilts.head ? { ...baseTilts.head } : {},
                'l-upper-arm': merge('l-upper-arm', armX * swing),
                'r-upper-arm': merge('r-upper-arm', -armX * swing),
                'l-upper-leg': merge('l-upper-leg', -legX * swing),
                'r-upper-leg': merge('r-upper-leg', legX * swing)
            };
        };
        const backStrutA = {
            torso: 3, head: 0,
            'r-upper-arm': -24, 'r-forearm': 26, 'r-hand': 5,
            'l-upper-arm': 24, 'l-forearm': -26, 'l-hand': -5,
            'r-upper-leg': 30, 'r-lower-leg': -20, 'r-foot': 9,
            'l-upper-leg': -16, 'l-lower-leg': -8, 'l-foot': -2
        };
        const backStrutB = {
            torso: 3, head: 0,
            'r-upper-arm': 24, 'r-forearm': 20, 'r-hand': 4,
            'l-upper-arm': -24, 'l-forearm': -20, 'l-hand': -4,
            'r-upper-leg': -16, 'r-lower-leg': -8, 'r-foot': -2,
            'l-upper-leg': 20, 'l-lower-leg': -14, 'l-foot': 7
        };
        const backStrollA = {
            torso: -2, head: 0,
            'l-upper-arm': -14, 'l-forearm': -16,
            'r-upper-arm': 14, 'r-forearm': 16,
            'l-upper-leg': 18, 'l-lower-leg': -12, 'l-foot': 5,
            'r-upper-leg': -9, 'r-lower-leg': -5, 'r-foot': -1
        };
        const backStrollB = {
            torso: -2, head: 0,
            'l-upper-arm': 14, 'l-forearm': -18,
            'r-upper-arm': -14, 'r-forearm': 18,
            'l-upper-leg': -9, 'l-lower-leg': -5, 'l-foot': -1,
            'r-upper-leg': 12, 'r-lower-leg': -8, 'r-foot': 4
        };
        const backTiltWalkHorizonA = {
            torso: -2, head: 2,
            'r-upper-arm': -18, 'r-forearm': 12,
            'l-upper-arm': 18, 'l-forearm': -12,
            'r-upper-leg': 24, 'r-lower-leg': -12, 'r-foot': 4,
            'l-upper-leg': -16, 'l-lower-leg': 8, 'l-foot': -3
        };
        const backTiltWalkHorizonMid = {
            torso: 0, head: 0,
            'r-upper-arm': 0, 'r-forearm': 0,
            'l-upper-arm': 0, 'l-forearm': 0,
            'r-upper-leg': 0, 'r-lower-leg': 0, 'r-foot': 0,
            'l-upper-leg': 0, 'l-lower-leg': 0, 'l-foot': 0
        };
        const backTiltWalkHorizonB = {
            torso: 2, head: -2,
            'r-upper-arm': 18, 'r-forearm': 12,
            'l-upper-arm': -18, 'l-forearm': -12,
            'r-upper-leg': -16, 'r-lower-leg': 8, 'r-foot': -3,
            'l-upper-leg': 24, 'l-lower-leg': -12, 'l-foot': 4
        };
        const scaleBackTiltWalkPose = (pose = {}, scale = 1) => {
            const out = {};
            Object.entries(pose).forEach(([key, value]) => {
                out[key] = Number.isFinite(value) ? Number((value * scale).toFixed(3)) : value;
            });
            return out;
        };
        const backTiltWalkHorizonSoftA = {
            ...scaleBackTiltWalkPose(backTiltWalkHorizonA, 0.35),
            torso: -1.5,
            head: 1
        };
        const backTiltWalkHorizonSoftB = {
            ...scaleBackTiltWalkPose(backTiltWalkHorizonB, 0.35),
            torso: 1.5,
            head: -1
        };
        const backTiltWalkHorizonTiltsA = {
            torso: { x: 0, y: 0 },
            head: { x: 0, y: 0 },
            'r-upper-arm': { x: -35, y: 0 },
            'l-upper-arm': { x: 35, y: 0 },
            'r-upper-leg': { x: 35, y: 0 },
            'l-upper-leg': { x: -35, y: 0 }
        };
        const backTiltWalkHorizonTiltsSoftA = {
            torso: { x: 0, y: 0 },
            head: { x: 0, y: 0 },
            'r-upper-arm': { x: -8, y: 0 },
            'l-upper-arm': { x: 8, y: 0 },
            'r-upper-leg': { x: 8, y: 0 },
            'l-upper-leg': { x: -8, y: 0 }
        };
        const backTiltWalkHorizonTiltsMid = {
            torso: { x: 0, y: 0 },
            head: { x: 0, y: 0 },
            'r-upper-arm': { x: 0, y: 0 },
            'l-upper-arm': { x: 0, y: 0 },
            'r-upper-leg': { x: 0, y: 0 },
            'l-upper-leg': { x: 0, y: 0 }
        };
        const backTiltWalkHorizonTiltsB = {
            torso: { x: 0, y: 0 },
            head: { x: 0, y: 0 },
            'r-upper-arm': { x: 35, y: 0 },
            'l-upper-arm': { x: -35, y: 0 },
            'r-upper-leg': { x: -35, y: 0 },
            'l-upper-leg': { x: 35, y: 0 }
        };
        const backTiltWalkHorizonTiltsSoftB = {
            torso: { x: 0, y: 0 },
            head: { x: 0, y: 0 },
            'r-upper-arm': { x: 8, y: 0 },
            'l-upper-arm': { x: -8, y: 0 },
            'r-upper-leg': { x: -8, y: 0 },
            'l-upper-leg': { x: 8, y: 0 }
        };
        const backWalkForwardLayerOrder = ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const makeBackWalkForwardFrame = (t, shoulder = 0, torso = 0, tilt = 0, dy = 0) => {
            const armTilt = Math.max(-35, Math.min(35, tilt));
            return moveFrame(t, {
                'r-upper-arm': -shoulder,
                'l-upper-arm': shoulder,
                head: shoulder > 0 ? -2 : (shoulder < 0 ? 2 : 0),
                torso
            }, {
                dx: 0,
                dy,
                tilts: {
                    torso: { x: 0, y: -Math.min(4, Math.abs(armTilt) / 8) },
                    head: { x: 0, y: 0 },
                    'r-upper-arm': { x: armTilt, y: 0 },
                    'l-upper-arm': { x: -armTilt, y: 0 },
                    'r-upper-leg': { x: -armTilt, y: 0 },
                    'l-upper-leg': { x: armTilt, y: 0 }
                },
                backViewLayerOverride: backWalkForwardLayerOrder,
                agbadaArmLayerMode: 'respect-arm-order'
            });
        };
        const makeBackWalkForwardFrames = (travel = -160, strideScale = 1) => {
            const samples = [
                [0.000, 0, 0, 0, 0],
                [0.062, 1, -1, -14, 15 / 160],
                [0.125, 3, -2, -30, 25 / 160],
                [0.187, 1, -1, -14, 35 / 160],
                [0.250, 0, 0, 0, 40 / 160],
                [0.312, -1, 1, 14, 50 / 160],
                [0.375, -3, 2, 30, 65 / 160],
                [0.437, -1, 1, 14, 75 / 160],
                [0.500, 0, 0, 0, 85 / 160],
                [0.562, 1, -1, -14, 90 / 160],
                [0.625, 3, -2, -30, 100 / 160],
                [0.687, 1, -1, -14, 115 / 160],
                [0.750, 0, 0, 0, 125 / 160],
                [0.812, -1, 1, 14, 135 / 160],
                [0.875, -3, 2, 30, 140 / 160],
                [0.937, -1, 1, 14, 155 / 160],
                [1.000, 0, 0, 0, 1]
            ];
            return samples.map(([t, shoulder, torso, tilt, progress]) => (
                makeBackWalkForwardFrame(
                    t,
                    shoulder * strideScale,
                    torso * strideScale,
                    tilt * strideScale,
                    travel * progress
                )
            ));
        };
        const makeBackWalkForwardMovement = (options = {}) => ({
            name: options.name || 'Back Walk Forward (Horizon Travel)',
            icon: options.icon || 'fa-person-walking-arrow-up',
            category: options.category || 'Guided Essentials',
            description: options.description || 'Back-facing walk moving up the stage with full arm/leg swing sync. Use Movement Blend Y px to set the exact distance.',
            duration: options.duration || 4000,
            easing: 'linear',
            repeat: options.repeat === Infinity ? Infinity : (Number.isFinite(options.repeat) ? options.repeat : 1),
            depthMotionPolicy: 'front-back-tilt-walk',
            anatomyMotionPolicy: 'front-back-tilt-walk',
            keyframes: makeBackWalkForwardFrames(
                Number.isFinite(options.travel) ? options.travel : -160,
                Number.isFinite(options.strideScale) ? options.strideScale : 1
            )
        });
        const makeBackRunForwardFrame = (t, phase = 0, dy = 0, lift = 0) => {
            const swing = Math.max(-1, Math.min(1, phase));
            const armTilt = 38 * swing;
            const legTilt = -34 * swing;
            const drive = Math.abs(swing);
            return moveFrame(t, {
                torso: 1.5 * swing,
                head: -0.75 * swing,
                'r-upper-arm': -8 * swing,
                'r-forearm': 6 * swing,
                'l-upper-arm': 8 * swing,
                'l-forearm': -6 * swing,
                'r-upper-leg': 10 * swing,
                'r-lower-leg': -8 * drive,
                'r-foot': 3 * swing,
                'l-upper-leg': -10 * swing,
                'l-lower-leg': -8 * drive,
                'l-foot': -3 * swing
            }, {
                dx: 0,
                dy: dy + lift,
                tilts: {
                    torso: { x: 0, y: -Math.min(3, drive * 2.5) },
                    head: { x: 0, y: 0 },
                    'r-upper-arm': { x: armTilt, y: 0 },
                    'l-upper-arm': { x: -armTilt, y: 0 },
                    'r-upper-leg': { x: legTilt, y: 0 },
                    'l-upper-leg': { x: -legTilt, y: 0 }
                },
                backViewLayerOverride: backWalkForwardLayerOrder,
                agbadaArmLayerMode: 'respect-arm-order'
            });
        };
        const makeBackRunForwardFrames = (travel = -240, strideScale = 1) => {
            const samples = [
                [0.000, 0, 0, 0],
                [0.062, -0.55, 14 / 240, -8],
                [0.125, -1, 28 / 240, -16],
                [0.187, -0.55, 42 / 240, -8],
                [0.250, 0, 58 / 240, -4],
                [0.312, 0.55, 72 / 240, -8],
                [0.375, 1, 88 / 240, -16],
                [0.437, 0.55, 102 / 240, -8],
                [0.500, 0, 118 / 240, -4],
                [0.562, -0.55, 132 / 240, -8],
                [0.625, -1, 148 / 240, -16],
                [0.687, -0.55, 162 / 240, -8],
                [0.750, 0, 178 / 240, -4],
                [0.812, 0.55, 194 / 240, -8],
                [0.875, 1, 212 / 240, -16],
                [0.937, 0.55, 228 / 240, -8],
                [1.000, 0, 1, 0]
            ];
            return samples.map(([t, phase, progress, lift]) => (
                makeBackRunForwardFrame(
                    t,
                    phase * strideScale,
                    travel * progress,
                    lift * Math.min(1.25, Math.max(0.4, strideScale))
                )
            ));
        };
        const makeBackRunForwardMovement = (options = {}) => ({
            name: options.name || 'Back Run Forward (Horizon Travel)',
            icon: options.icon || 'fa-person-running',
            category: options.category || 'Guided Essentials',
            description: options.description || 'Back-facing run moving up the stage with stronger arm drive, airborne lift, and distance-aware Y travel.',
            duration: options.duration || 2200,
            easing: 'linear',
            repeat: 1,
            keyframes: makeBackRunForwardFrames(
                Number.isFinite(options.travel) ? options.travel : -240,
                Number.isFinite(options.strideScale) ? options.strideScale : 1
            )
        });
        const makeBack3qStridePose = (facing = 'right', phase = 1, scale = 1) => {
            const isRight = facing === 'right';
            const dir = isRight ? 1 : -1;
            const front = isRight ? 'r' : 'l';
            const back = isRight ? 'l' : 'r';
            const rearFlexSign = (side) => side === 'r' ? 1 : -1;
            const pose = {
                torso: 2 * dir,
                head: (4 + Math.abs(phase)) * dir
            };
            // Rear 3/4 should read like a back-view walk, not a front-view arm pump:
            // upper limbs/hips carry the swing, while elbows and knees show only
            // a small rear-facing bend and the feet stay almost neutral.
            pose[`${front}-upper-arm`] = 26 * dir * phase * scale;
            pose[`${back}-upper-arm`] = -20 * dir * phase * scale;
            pose[`${front}-forearm`] = rearFlexSign(front) * 7 * scale;
            pose[`${back}-forearm`] = rearFlexSign(back) * 5 * scale;
            pose[`${front}-hand`] = rearFlexSign(front) * 2 * scale;
            pose[`${back}-hand`] = rearFlexSign(back) * 1.5 * scale;
            pose[`${front}-upper-leg`] = -20 * dir * phase * scale;
            pose[`${back}-upper-leg`] = 16 * dir * phase * scale;
            pose[`${front}-lower-leg`] = rearFlexSign(front) * 5 * scale;
            pose[`${back}-lower-leg`] = rearFlexSign(back) * 3 * scale;
            pose[`${front}-foot`] = 0;
            pose[`${back}-foot`] = 0;
            return pose;
        };
        const back3qStrutRightA = makeBack3qStridePose('right', 1, 1);
        const back3qStrutRightB = makeBack3qStridePose('right', -1, 1);
        const back3qStrutLeftA = makeBack3qStridePose('left', 1, 1);
        const back3qStrutLeftB = makeBack3qStridePose('left', -1, 1);
        const back3qStrollRightA = makeBack3qStridePose('right', 1, 0.62);
        const back3qStrollRightB = makeBack3qStridePose('right', -1, 0.62);
        const back3qStrollLeftA = makeBack3qStridePose('left', 1, 0.62);
        const back3qStrollLeftB = makeBack3qStridePose('left', -1, 0.62);
        const back3qIdlePose = {
            torso: 0, head: 0,
            'r-upper-arm': 0, 'r-forearm': 0, 'r-hand': 0,
            'l-upper-arm': 0, 'l-forearm': 0, 'l-hand': 0,
            'r-upper-leg': 0, 'r-lower-leg': 0, 'r-foot': 0,
            'l-upper-leg': 0, 'l-lower-leg': 0, 'l-foot': 0
        };
        const makeBack3qLoopFrames = (poseA, poseB, options = {}) => {
            const isRight = options.facing !== 'left';
            const dir = isRight ? 1 : -1;
            const layerOrder = options.layerOrder || back3qRightLayerOrder;
            const tiltY = Number.isFinite(options.tiltY)
                ? options.tiltY
                : (isRight ? -45 : 45);
            const travel = Number.isFinite(options.travel) ? options.travel : null;
            const strideBob = Number.isFinite(options.strideBob) ? options.strideBob : -3;
            const passBob = Number.isFinite(options.passBob) ? options.passBob : -6;
            const scale = Number.isFinite(options.scale) ? options.scale : 1;
            const contact = (phase = 1) => ({
                'right-shoulder': 20 * dir * phase * scale,
                'left-shoulder': -20 * dir * phase * scale,
                'right-elbow': 5 * dir * phase * scale,
                'left-elbow': -5 * dir * phase * scale,
                'right-wrist': 2 * dir * phase * scale,
                'left-wrist': -2 * dir * phase * scale,
                'right-hip': -18 * dir * phase * scale,
                'left-hip': 18 * dir * phase * scale,
                'right-knee': 5 * dir * phase * scale,
                'left-knee': -5 * dir * phase * scale,
                'right-ankle': 2 * dir * phase * scale,
                'left-ankle': -2 * dir * phase * scale,
                neck: 0
            });
            const pass = (phase = 1) => ({
                'right-shoulder': 8 * dir * phase * scale,
                'left-shoulder': -8 * dir * phase * scale,
                'right-elbow': 2 * dir * phase * scale,
                'left-elbow': -2 * dir * phase * scale,
                'right-wrist': 0,
                'left-wrist': 0,
                'right-hip': -6 * dir * phase * scale,
                'left-hip': 6 * dir * phase * scale,
                'right-knee': 2 * dir * phase * scale,
                'left-knee': -2 * dir * phase * scale,
                'right-ankle': 0,
                'left-ankle': 0,
                neck: 0
            });
            const partTilts = () => ({
                torso: { x: 0, y: tiltY },
                'head-neck': { x: 0, y: tiltY }
            });
            const jointTilts = (phase = 0) => ({
                'right-shoulder': { x: 16 * dir * phase, y: tiltY },
                'left-shoulder': { x: -16 * dir * phase, y: tiltY },
                'right-hip': { x: -12 * dir * phase, y: tiltY },
                'left-hip': { x: 12 * dir * phase, y: tiltY }
            });
            const rawFrame = (t, jointAngles, progress, dy, torsoAngle, passPhase = 0) => {
                const next = {
                    t,
                    dy,
                    jointAngles,
                    partAngles: { torso: torsoAngle },
                    jointTilts: jointTilts(passPhase),
                    partTilts: partTilts(),
                    backViewLayerOverride: layerOrder,
                    layerOrderOverride: layerOrder,
                    agbadaArmLayerMode: 'respect-arm-order'
                };
                if (Number.isFinite(travel)) next.dx = Math.round(travel * progress * 1000) / 1000;
                return next;
            };
            return [
                rawFrame(0.000, contact(1), 0.000, strideBob, 1 * dir * scale, 0),
                rawFrame(0.125, pass(1), 0.125, passBob, 0, 1),
                rawFrame(0.250, contact(-1), 0.250, strideBob, -1 * dir * scale, 0),
                rawFrame(0.375, pass(-1), 0.375, passBob, 0, -1),
                rawFrame(0.500, contact(1), 0.500, strideBob, 1 * dir * scale, 0),
                rawFrame(0.625, pass(1), 0.625, passBob, 0, 1),
                rawFrame(0.750, contact(-1), 0.750, strideBob, -1 * dir * scale, 0),
                rawFrame(0.875, pass(-1), 0.875, passBob, 0, -1),
                rawFrame(1.000, contact(1), 1.000, strideBob, 1 * dir * scale, 0)
            ];
        };
        const makeBack3qRunFrames = (options = {}) => {
            const isRight = options.facing !== 'left';
            const dir = isRight ? 1 : -1;
            const layerOrder = options.layerOrder || (isRight ? back3qRightLayerOrder : back3qLeftLayerOrder);
            const tiltY = Number.isFinite(options.tiltY) ? options.tiltY : (isRight ? -45 : 45);
            const scale = Number.isFinite(options.scale) ? options.scale : 1;
            const shoulderDrive = Number.isFinite(options.shoulderDrive) ? options.shoulderDrive : 34;
            const elbowDrive = Number.isFinite(options.elbowDrive) ? options.elbowDrive : 12;
            const elbowLift = Number.isFinite(options.elbowLift) ? options.elbowLift : 6;
            const wristDrive = Number.isFinite(options.wristDrive) ? options.wristDrive : 4;
            const hipDrive = Number.isFinite(options.hipDrive) ? options.hipDrive : 30;
            const kneeDrive = Number.isFinite(options.kneeDrive) ? options.kneeDrive : 10;
            const kneeLift = Number.isFinite(options.kneeLift) ? options.kneeLift : 6;
            const ankleDrive = Number.isFinite(options.ankleDrive) ? options.ankleDrive : 4;
            const liftScale = Number.isFinite(options.liftScale) ? options.liftScale : 1;
            const maxDrive = Number.isFinite(options.maxDrive) ? Math.max(1, Math.abs(options.maxDrive)) : 1;
            const contactPhase = Number.isFinite(options.contactPhase) ? options.contactPhase : 1;
            const passPhase = Number.isFinite(options.passPhase) ? options.passPhase : 0.45;
            const flightPhase = Number.isFinite(options.flightPhase) ? options.flightPhase : 0;
            const torsoLean = Number.isFinite(options.torsoLean) ? options.torsoLean : 0;
            const backArmShoulderScale = Number.isFinite(options.backArmShoulderScale) ? options.backArmShoulderScale : 1;
            const backArmElbowScale = Number.isFinite(options.backArmElbowScale) ? options.backArmElbowScale : 1;
            const matchBackArmSwing = options.matchBackArmSwing === true;
            const backwardSwingScale = Number.isFinite(options.backwardSwingScale) ? options.backwardSwingScale : 1;
            const backwardElbowScale = Number.isFinite(options.backwardElbowScale) ? options.backwardElbowScale : 1;
            const jointTilts = (phase = 0) => ({
                'right-shoulder': { x: 12 * dir * phase, y: tiltY },
                'left-shoulder': { x: -12 * dir * phase, y: tiltY },
                'right-hip': { x: -10 * dir * phase, y: tiltY },
                'left-hip': { x: 10 * dir * phase, y: tiltY }
            });
            const partTilts = () => ({
                torso: { x: 0, y: tiltY },
                'head-neck': { x: 0, y: tiltY }
            });
            const pose = (phase = 1, flight = 0) => {
                const lift = Math.max(0, Math.min(1, Number(flight) || 0));
                const drive = Math.max(-maxDrive, Math.min(maxDrive, Number(phase) || 0));
                const isBackArm = (side) => matchBackArmSwing || (isRight ? side === 'left' : side === 'right');
                const isBackwardArmSwing = (side, shoulderValue) => (
                    side === 'right' ? shoulderValue < 0 : shoulderValue > 0
                );
                const shapeShoulder = (side, value) => {
                    let shaped = value;
                    if (isBackwardArmSwing(side, shaped)) shaped *= backwardSwingScale;
                    if (isBackArm(side)) shaped *= backArmShoulderScale;
                    return shaped;
                };
                const shapeElbow = (side, value, shoulderValue) => {
                    let shaped = value;
                    if (isBackwardArmSwing(side, shoulderValue)) shaped *= backwardElbowScale;
                    if (isBackArm(side)) shaped *= backArmElbowScale;
                    return shaped;
                };
                const rightShoulder = shapeShoulder('right', shoulderDrive * dir * drive * scale);
                const leftShoulder = shapeShoulder('left', -shoulderDrive * dir * drive * scale);
                return {
                    'right-shoulder': rightShoulder,
                    'left-shoulder': leftShoulder,
                    'right-elbow': shapeElbow('right', (elbowDrive * dir * drive + elbowLift * dir * lift) * scale, rightShoulder),
                    'left-elbow': shapeElbow('left', (-elbowDrive * dir * drive - elbowLift * dir * lift) * scale, leftShoulder),
                    'right-wrist': wristDrive * dir * drive * scale,
                    'left-wrist': -wristDrive * dir * drive * scale,
                    'right-hip': -hipDrive * dir * drive * scale,
                    'left-hip': hipDrive * dir * drive * scale,
                    'right-knee': (kneeDrive * dir * drive + kneeLift * dir * lift) * scale,
                    'left-knee': (-kneeDrive * dir * drive - kneeLift * dir * lift) * scale,
                    'right-ankle': -ankleDrive * dir * drive * scale,
                    'left-ankle': ankleDrive * dir * drive * scale,
                    neck: 0
                };
            };
            const rawFrame = (t, phase, dy, torsoAngle, tiltPhase = phase, flight = 0) => ({
                t,
                dy,
                jointAngles: pose(phase, flight),
                partAngles: { torso: torsoLean + torsoAngle },
                jointTilts: jointTilts(tiltPhase),
                partTilts: partTilts(),
                backViewLayerOverride: layerOrder,
                layerOrderOverride: layerOrder,
                agbadaArmLayerMode: 'respect-arm-order',
                _back3qAuthoredForRight: isRight,
                _back3qAuthoredForLeft: !isRight
            });
            return [
                rawFrame(0.000, contactPhase, -5, 2 * dir * scale, contactPhase, 0),
                rawFrame(0.125, passPhase, -15 * liftScale, 1 * dir * scale, passPhase, 0.8),
                rawFrame(0.250, flightPhase, -22 * liftScale, 0, flightPhase, 1),
                rawFrame(0.375, -passPhase, -15 * liftScale, -1 * dir * scale, -passPhase, 0.8),
                rawFrame(0.500, -contactPhase, -5, -2 * dir * scale, -contactPhase, 0),
                rawFrame(0.625, -passPhase, -15 * liftScale, -1 * dir * scale, -passPhase, 0.8),
                rawFrame(0.750, -flightPhase, -22 * liftScale, 0, -flightPhase, 1),
                rawFrame(0.875, passPhase, -15 * liftScale, 1 * dir * scale, passPhase, 0.8),
                rawFrame(1.000, contactPhase, -5, 2 * dir * scale, contactPhase, 0)
            ];
        };
        const makeBack3qRunMovement = (facing = 'right', variant = 'standard') => {
            const isRight = facing === 'right';
            const isStrong = variant === 'strong';
            const directionName = isRight ? 'Right' : 'Left';
            const layerOrder = isRight ? back3qRightLayerOrder : back3qLeftLayerOrder;
            return {
                name: `Guided 3/4 Back ${isStrong ? 'Strong ' : ''}Run ${directionName}`,
                icon: 'fa-person-running',
                category: 'Guided Essentials',
                description: isStrong
                    ? `Stronger 3/4-back-${facing} run with deeper rear-view elbow/knee flexion and larger shoulder/hip drive.`
                    : `Fast 3/4-back-${facing} run with rear-view elbow and knee bends, stable 3/4 tilt, and corrected back-view layer order.`,
                duration: isStrong ? 780 : 860,
                repeat: Infinity,
                easing: 'easeInOut',
                _back3qAuthoredForRight: isRight,
                _back3qAuthoredForLeft: !isRight,
                viewCompatibility: [isRight ? 'back-3q-right' : 'back-3q-left'],
                directionLabel: `Back 3/4 ${directionName}`,
                auditNotes: [
                    isStrong ? 'Back 3/4 strong run loop' : 'Back 3/4 run loop',
                    'Rear 3/4 layer order',
                    'Stable full-part 3/4 Y tilt'
                ],
                keyframes: makeBack3qRunFrames({
                    layerOrder,
                    facing,
                    tiltY: isRight ? -45 : 45,
                    scale: 1,
                    shoulderDrive: isStrong ? 54 : 34,
                    elbowDrive: isStrong ? 30 : 12,
                    elbowLift: isStrong ? 24 : 6,
                    wristDrive: isStrong ? 10 : 4,
                    hipDrive: isStrong ? 56 : 30,
                    kneeDrive: isStrong ? 30 : 10,
                    kneeLift: isStrong ? 34 : 6,
                    ankleDrive: isStrong ? 14 : 4,
                    liftScale: isStrong ? 1.35 : 1,
                    maxDrive: isStrong ? 1.22 : 1,
                    contactPhase: isStrong ? 1.12 : 1,
                    passPhase: isStrong ? 0.68 : 0.45,
                    flightPhase: isStrong ? 0.24 : 0,
                    torsoLean: isStrong ? 10 * (isRight ? 1 : -1) : 0,
                    backArmShoulderScale: isStrong ? 0.78 : 1,
                    backArmElbowScale: isStrong ? 0.55 : 1,
                    matchBackArmSwing: isStrong,
                    backwardSwingScale: isStrong ? 0.68 : 1,
                    backwardElbowScale: isStrong ? 0.45 : 1
                })
            };
        };
        const makeBack3qRunForwardMovement = (facing = 'right', variant = 'standard') => {
            const isRight = facing === 'right';
            const isStrong = variant === 'strong';
            const directionName = isRight ? 'Right' : 'Left';
            const directionSign = isRight ? 1 : -1;
            const source = makeBack3qRunMovement(facing, variant);
            const baseFrames = Array.isArray(source.keyframes) ? source.keyframes : [];
            const travel = directionSign * 240;
            const roundTravel = value => Math.round(value * 1000) / 1000;
            return {
                ...source,
                name: `Guided 3/4 Back ${isStrong ? 'Strong ' : ''}Run Forward ${directionName}`,
                icon: isRight ? 'fa-person-running-arrow-right' : 'fa-person-running-arrow-left',
                category: 'Travel',
                description: `${isStrong ? 'Stronger' : 'Fast'} 3/4-back-${facing} run that uses the working ${isStrong ? 'strong ' : ''}run cycle and travels on the X axis.`,
                duration: source.duration || (isStrong ? 780 : 860),
                repeat: 1,
                easing: 'linear',
                absoluteTravel: true,
                rootTravel: { x: travel },
                walkTravelLoopFinalFromStart: true,
                walkTravelLoopKeepTerminal: true,
                skipStartIdleBookend: true,
                skipEndIdleBookend: true,
                viewCompatibility: [isRight ? 'back-3q-right' : 'back-3q-left'],
                directionLabel: `Back 3/4 ${directionName}`,
                auditNotes: ['Back 3/4 run X-axis travel', 'Rear 3/4 layer order', 'Distance controls repeat run cycles'],
                keyframes: baseFrames.map(frame => {
                    const dx = roundTravel(travel * (Number.isFinite(frame.t) ? frame.t : 0));
                    return {
                        ...frame,
                        dx,
                        offsets: {
                            ...(frame.offsets || {}),
                            torso: {
                                ...((frame.offsets && frame.offsets.torso) || {}),
                                y: Number.isFinite(frame.dy) ? frame.dy : (((frame.offsets || {}).torso || {}).y || 0)
                            }
                        }
                    };
                })
            };
        };
        const makeBack3qForwardMovement = (facing = 'right', mode = 'strut') => {
            const isRight = facing === 'right';
            const isStrut = mode === 'strut';
            const sign = isRight ? 1 : -1;
            const travel = sign * (isStrut ? 180 : 140);
            const layerOrder = isRight ? back3qRightLayerOrder : back3qLeftLayerOrder;
            const baseTilt = isRight ? back3qRightTilt : back3qLeftTilt;
            const poseA = isStrut
                ? (isRight ? back3qStrutRightA : back3qStrutLeftA)
                : (isRight ? back3qStrollRightA : back3qStrollLeftA);
            const poseB = isStrut
                ? (isRight ? back3qStrutRightB : back3qStrutLeftB)
                : (isRight ? back3qStrollRightB : back3qStrollLeftB);
            const tiltA = isStrut
                ? (isRight ? back3qRightStrideTiltA : back3qLeftStrideTiltA)
                : (isRight ? back3qRightStrollTiltA : back3qLeftStrollTiltA);
            const tiltB = isStrut
                ? (isRight ? back3qRightStrideTiltB : back3qLeftStrideTiltB)
                : (isRight ? back3qRightStrollTiltB : back3qLeftStrollTiltB);
            const lowBob = isStrut ? -3 : -2;
            const highBob = isStrut ? -6 : -4;
            const directionName = isRight ? 'Right' : 'Left';
            const moveName = isStrut ? 'Strut' : 'Stroll';
            return {
                name: `Guided 3/4 Back ${moveName} Forward ${directionName}`,
                icon: isRight ? 'fa-person-walking-arrow-right' : 'fa-person-walking-arrow-left',
                category: 'Travel',
                description: `${isStrut ? 'Confident' : 'Relaxed'} 3/4-back-${facing} ${moveName.toLowerCase()} that travels on the X axis while preserving the rear 3/4 tilt and layer order.`,
                duration: isStrut ? 3300 : 4600,
                repeat: 1,
                easing: 'linear',
                absoluteTravel: true,
                walkTravelLoopFinalFromStart: true,
                walkTravelLoopKeepTerminal: true,
                skipStartIdleBookend: true,
                skipEndIdleBookend: true,
                _back3qAuthoredForRight: isRight,
                _back3qAuthoredForLeft: !isRight,
                viewCompatibility: [isRight ? 'back-3q-right' : 'back-3q-left'],
                directionLabel: `Back 3/4 ${directionName}`,
                auditNotes: ['Back 3/4 X-axis travel', 'Rear 3/4 layer order', 'Distance controls repeat stride cycles'],
                keyframes: makeBack3qLoopFrames(poseA, poseB, {
                    layerOrder,
                    facing,
                    tiltY: isRight ? -45 : 45,
                    travel,
                    strideBob: lowBob,
                    passBob: highBob,
                    scale: isStrut ? 1 : 0.62
                })
            };
        };

        const catalog = {
            idle: {
                name: 'Idle Breathe',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Subtle rear-view idle breathing loop.',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, {}),
                    frame(0.40, { torso: 1, head: -1 }, -2),
                    frame(0.70, { torso: 1, head: -1 }, -2),
                    frame(1.00, {})
                ]
            },
            'read-book-seated': {
                name: 'Read Book (Seated)',
                icon: 'fa-book-open',
                category: 'Daily Activities',
                description: 'Rear-view seated reading loop using the same inward elbow fold as the front-view version.',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, { torso: 4, head: -6, 'l-upper-arm': 34, 'l-forearm': -94, 'l-hand': 8, 'r-upper-arm': -34, 'r-forearm': 94, 'r-hand': -8, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.34, { torso: 5, head: -8, 'l-upper-arm': 36, 'l-forearm': -98, 'l-hand': 4, 'r-upper-arm': -36, 'r-forearm': 98, 'r-hand': -4, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.66, { torso: 3, head: -5, 'l-upper-arm': 32, 'l-forearm': -90, 'l-hand': 10, 'r-upper-arm': -32, 'r-forearm': 90, 'r-hand': -10, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(1.00, { torso: 4, head: -6, 'l-upper-arm': 34, 'l-forearm': -94, 'l-hand': 8, 'r-upper-arm': -34, 'r-forearm': 94, 'r-hand': -8, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true })
                ]
            },
            'write-seated': {
                name: 'Write (Seated)',
                icon: 'fa-pen',
                category: 'Daily Activities',
                description: 'Rear-view seated writing loop with small forearm movement and stable posture.',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, { torso: 5, head: -8, 'l-upper-arm': 18, 'l-forearm': -82, 'l-hand': 4, 'r-upper-arm': -18, 'r-forearm': 82, 'r-hand': -4, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.25, { torso: 5, head: -8, 'l-upper-arm': 20, 'l-forearm': -84, 'l-hand': 0, 'r-upper-arm': -20, 'r-forearm': 84, 'r-hand': 0, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.50, { torso: 4, head: -7, 'l-upper-arm': 16, 'l-forearm': -78, 'l-hand': 0, 'r-upper-arm': -16, 'r-forearm': 78, 'r-hand': 0, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.75, { torso: 5, head: -8, 'l-upper-arm': 20, 'l-forearm': -84, 'l-hand': 0, 'r-upper-arm': -20, 'r-forearm': 84, 'r-hand': 0, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(1.00, { torso: 5, head: -8, 'l-upper-arm': 18, 'l-forearm': -82, 'l-hand': 4, 'r-upper-arm': -18, 'r-forearm': 82, 'r-hand': -4, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true })
                ]
            },
            'type-seated': {
                name: 'Type (Seated)',
                icon: 'fa-keyboard',
                category: 'Daily Activities',
                description: 'Rear-view seated typing loop with alternating wrist taps and a stable keyboard posture.',
                duration: 1200,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, { torso: 3, head: -6, 'l-upper-arm': 14, 'l-forearm': -74, 'l-hand': 2, 'r-upper-arm': -14, 'r-forearm': 74, 'r-hand': -2, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.25, { torso: 3, head: -6, 'l-upper-arm': 16, 'l-forearm': -78, 'l-hand': -6, 'r-upper-arm': -16, 'r-forearm': 78, 'r-hand': 6, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.50, { torso: 2, head: -5, 'l-upper-arm': 12, 'l-forearm': -70, 'l-hand': 8, 'r-upper-arm': -12, 'r-forearm': 70, 'r-hand': -8, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(0.75, { torso: 3, head: -6, 'l-upper-arm': 16, 'l-forearm': -78, 'l-hand': -6, 'r-upper-arm': -16, 'r-forearm': 78, 'r-hand': 6, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true }),
                    frame(1.00, { torso: 3, head: -6, 'l-upper-arm': 14, 'l-forearm': -74, 'l-hand': 2, 'r-upper-arm': -14, 'r-forearm': 74, 'r-hand': -2, 'l-upper-leg': 58, 'l-lower-leg': -82, 'r-upper-leg': -58, 'r-lower-leg': 82 }, { tilts: { head: { x: 0, y: 0 } }, backViewLayerOverride: workingArmsBehindTorsoOrder, threeQuarterLayerOverride: true, torsoFrontmost: true })
                ]
            },
            'listen-agree': {
                name: 'Listen / Agree (Back)',
                icon: 'fa-head-side-virus',
                category: 'Communication',
                description: 'Back-view listening and nodding agreement with small rear-visible arm shifts.',
                duration: 1600,
                repeat: 3,
                keyframes: [
                    frame(0.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.22, { torso: 1, head: 8, 'r-upper-arm': -8, 'r-forearm': 8, 'l-upper-arm': 6, 'l-forearm': -6 }, { dy: -1, backViewLayerOverride: backLayerOrder }),
                    frame(0.46, { torso: 0, head: -3, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.68, { torso: -1, head: 7, 'r-upper-arm': -6, 'r-forearm': 6, 'l-upper-arm': 8, 'l-forearm': -8 }, { dy: -1, backViewLayerOverride: backLayerOrder }),
                    frame(1.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder })
                ]
            },
            'call-attention': {
                name: 'Call Attention (Back)',
                icon: 'fa-hand',
                category: 'Communication',
                description: 'Back-view raised-hand attention gesture visible from behind.',
                duration: 1300,
                repeat: 2,
                keyframes: [
                    frame(0.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.22, { torso: -3, head: -4, 'r-upper-arm': -132, 'r-forearm': -38, 'r-hand': -12, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.42, { torso: -3, head: -4, 'r-upper-arm': -142, 'r-forearm': -28, 'r-hand': 14, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.62, { torso: -3, head: -4, 'r-upper-arm': -132, 'r-forearm': -38, 'r-hand': -12, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(1.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder })
                ]
            },
            'phone-call-loop': {
                name: 'Phone Call / Listening (Back)',
                icon: 'fa-phone',
                category: 'Communication',
                description: 'Rear-view phone listening loop with a subtle head and wrist drift.',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, { torso: 0, head: 0, 'r-upper-arm': -113, 'r-forearm': -125, 'r-hand': 0, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 4, offsetY: 10, iterations: 12 } }, backViewLayerOverride: backLayerOrder }),
                    frame(0.28, { torso: 0, head: -1, 'r-upper-arm': -116, 'r-forearm': -121, 'r-hand': 4, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 4, offsetY: 10, iterations: 12 } }, backViewLayerOverride: backLayerOrder }),
                    frame(0.58, { torso: 0, head: 1, 'r-upper-arm': -110, 'r-forearm': -129, 'r-hand': -2, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 4, offsetY: 10, iterations: 12 } }, backViewLayerOverride: backLayerOrder }),
                    frame(1.00, { torso: 0, head: 0, 'r-upper-arm': -113, 'r-forearm': -125, 'r-hand': 0, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 4, offsetY: 10, iterations: 12 } }, backViewLayerOverride: backLayerOrder })
                ]
            },
            'phone-call-pre-ear-loop': {
                name: 'Phone Call / Pre-Ear (Back)',
                icon: 'fa-phone-volume',
                category: 'Communication',
                description: 'Rear-view near-ear prep loop that stays just off contact.',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, { torso: 0, head: -2, 'r-upper-arm': -96, 'r-forearm': -108, 'r-hand': 4, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 12, offsetY: 12, iterations: 10 } }, backViewLayerOverride: backLayerOrder }),
                    frame(0.34, { torso: 0, head: -4, 'r-upper-arm': -100, 'r-forearm': -104, 'r-hand': 6, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 12, offsetY: 12, iterations: 10 } }, backViewLayerOverride: backLayerOrder }),
                    frame(0.70, { torso: 0, head: -1, 'r-upper-arm': -92, 'r-forearm': -112, 'r-hand': 2, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 12, offsetY: 12, iterations: 10 } }, backViewLayerOverride: backLayerOrder }),
                    frame(1.00, { torso: 0, head: -2, 'r-upper-arm': -96, 'r-forearm': -108, 'r-hand': 4, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'r-ear', offsetX: 12, offsetY: 12, iterations: 10 } }, backViewLayerOverride: backLayerOrder })
                ]
            },
            'microphone-talk': {
                name: 'Microphone Talk (Back)',
                icon: 'fa-microphone',
                category: 'Communication',
                description: 'Rear-view microphone-talk loop with the right hand held closer to the mouth line than phone-call.',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, { torso: 0, head: 2, 'r-upper-arm': -78, 'r-forearm': -142, 'r-hand': -6, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, backViewLayerOverride: backLayerOrder }),
                    frame(0.28, { torso: 0, head: 4, 'r-upper-arm': -82, 'r-forearm': -146, 'r-hand': -2, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, backViewLayerOverride: backLayerOrder }),
                    frame(0.60, { torso: 0, head: 1, 'r-upper-arm': -74, 'r-forearm': -138, 'r-hand': -8, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, backViewLayerOverride: backLayerOrder }),
                    frame(1.00, { torso: 0, head: 2, 'r-upper-arm': -78, 'r-forearm': -142, 'r-hand': -6, 'l-upper-arm': 0, 'l-forearm': 0 }, { contacts: { 'right-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, backViewLayerOverride: backLayerOrder })
                ]
            },
            'present-explain-back': {
                name: 'Present / Explain (Back)',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Back-view explanation gesture using rear-visible outward hand beats without obscured chest presentation.',
                duration: 1800,
                repeat: Infinity,
                viewCompatibility: ['back'],
                keyframes: [
                    frame(0.00, { torso: 1, head: 2, 'r-upper-arm': -14, 'r-forearm': 8, 'r-hand': 2, 'l-upper-arm': 14, 'l-forearm': -8, 'l-hand': -2 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.24, { torso: 3, head: 1, 'r-upper-arm': -17, 'r-forearm': -14, 'r-hand': 5, 'l-upper-arm': 16, 'l-forearm': -6, 'l-hand': -2 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.52, { torso: -2, head: 3, 'r-upper-arm': -16, 'r-forearm': 6, 'r-hand': 2, 'l-upper-arm': 17, 'l-forearm': 15, 'l-hand': -5 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.78, { torso: 2, head: 2, 'r-upper-arm': -38, 'r-forearm': -22, 'r-hand': 4, 'l-upper-arm': 22, 'l-forearm': 18, 'l-hand': -3 }, { backViewLayerOverride: backLayerOrder }),
                    frame(1.00, { torso: 1, head: 2, 'r-upper-arm': -14, 'r-forearm': 8, 'r-hand': 2, 'l-upper-arm': 14, 'l-forearm': -8, 'l-hand': -2 }, { backViewLayerOverride: backLayerOrder })
                ]
            },
            'present-explain-back-3q-left': {
                name: 'Present / Explain (Back 3/4 Left)',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Back 3/4-left explanation gesture using rear-visible outward hand beats and the proper rear 3/4 layer stack.',
                duration: 1800,
                repeat: Infinity,
                viewCompatibility: ['back-3q-left'],
                keyframes: [
                    frame(0.00, { torso: 1, head: 2, 'r-upper-arm': -14, 'r-forearm': 8, 'r-hand': 2, 'l-upper-arm': 14, 'l-forearm': -8, 'l-hand': -2 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(0.24, { torso: 3, head: 1, 'r-upper-arm': -17, 'r-forearm': -14, 'r-hand': 5, 'l-upper-arm': 16, 'l-forearm': -6, 'l-hand': -2 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(0.52, { torso: -2, head: 3, 'r-upper-arm': -16, 'r-forearm': 6, 'r-hand': 2, 'l-upper-arm': 17, 'l-forearm': 15, 'l-hand': -5 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(0.78, { torso: 2, head: 2, 'r-upper-arm': -38, 'r-forearm': -22, 'r-hand': 4, 'l-upper-arm': 22, 'l-forearm': 18, 'l-hand': -3 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(1.00, { torso: 1, head: 2, 'r-upper-arm': -14, 'r-forearm': 8, 'r-hand': 2, 'l-upper-arm': 14, 'l-forearm': -8, 'l-hand': -2 }, { backViewLayerOverride: back3qLeftLayerOrder })
                ]
            },
            'present-explain-back-3q-right': {
                name: 'Present / Explain (Back 3/4 Right)',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Back 3/4-right explanation gesture using rear-visible outward hand beats and the proper rear 3/4 layer stack.',
                duration: 1800,
                repeat: Infinity,
                viewCompatibility: ['back-3q-right'],
                keyframes: [
                    frame(0.00, { torso: 1, head: 2, 'r-upper-arm': -14, 'r-forearm': 8, 'r-hand': 2, 'l-upper-arm': 14, 'l-forearm': -8, 'l-hand': -2 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(0.24, { torso: 3, head: 1, 'r-upper-arm': -17, 'r-forearm': -14, 'r-hand': 5, 'l-upper-arm': 16, 'l-forearm': -6, 'l-hand': -2 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(0.52, { torso: -2, head: 3, 'r-upper-arm': -16, 'r-forearm': 6, 'r-hand': 2, 'l-upper-arm': 17, 'l-forearm': 15, 'l-hand': -5 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(0.78, { torso: 2, head: 2, 'r-upper-arm': -38, 'r-forearm': -22, 'r-hand': 4, 'l-upper-arm': 22, 'l-forearm': 18, 'l-hand': -3 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(1.00, { torso: 1, head: 2, 'r-upper-arm': -14, 'r-forearm': 8, 'r-hand': 2, 'l-upper-arm': 14, 'l-forearm': -8, 'l-hand': -2 }, { backViewLayerOverride: back3qRightLayerOrder })
                ]
            },
            'present-explain-alternate-back': {
                name: 'Present / Explain - Alternate (Back)',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Back-view alternating explanation beats, using one rear-visible arm at a time.',
                duration: 2400,
                repeat: Infinity,
                viewCompatibility: ['back'],
                keyframes: [
                    frame(0.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.20, { torso: 3, head: 1, 'r-upper-arm': -34, 'r-forearm': 14, 'r-hand': 5, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.38, { torso: 1, head: 3, 'r-upper-arm': -22, 'r-forearm': 10, 'r-hand': -3, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.55, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder }),
                    frame(0.76, { torso: -3, head: -1, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 34, 'l-forearm': -14, 'l-hand': -5 }, { backViewLayerOverride: backLayerOrder }),
                    frame(1.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: backLayerOrder })
                ]
            },
            'present-explain-alternate-back-3q-left': {
                name: 'Present / Explain - Alternate (Back 3/4 Left)',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Back 3/4-left alternating explanation beats with rear-visible arm motion and the correct rear 3/4 layer stack.',
                duration: 2400,
                repeat: Infinity,
                viewCompatibility: ['back-3q-left'],
                keyframes: [
                    frame(0.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(0.20, { torso: 3, head: 1, 'r-upper-arm': -28, 'r-forearm': 12, 'r-hand': 5, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(0.38, { torso: 1, head: 3, 'r-upper-arm': -18, 'r-forearm': 8, 'r-hand': -3, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(0.55, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(0.76, { torso: -3, head: -1, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 28, 'l-forearm': -12, 'l-hand': -5 }, { backViewLayerOverride: back3qLeftLayerOrder }),
                    frame(1.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qLeftLayerOrder })
                ]
            },
            'present-explain-alternate-back-3q-right': {
                name: 'Present / Explain - Alternate (Back 3/4 Right)',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Back 3/4-right alternating explanation beats with rear-visible arm motion and the correct rear 3/4 layer stack.',
                duration: 2400,
                repeat: Infinity,
                viewCompatibility: ['back-3q-right'],
                keyframes: [
                    frame(0.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(0.20, { torso: 3, head: 1, 'r-upper-arm': -28, 'r-forearm': 12, 'r-hand': 5, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(0.38, { torso: 1, head: 3, 'r-upper-arm': -18, 'r-forearm': 8, 'r-hand': -3, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(0.55, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(0.76, { torso: -3, head: -1, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 28, 'l-forearm': -12, 'l-hand': -5 }, { backViewLayerOverride: back3qRightLayerOrder }),
                    frame(1.00, { torso: 0, head: 0, 'r-upper-arm': -4, 'r-forearm': 4, 'l-upper-arm': 4, 'l-forearm': -4 }, { backViewLayerOverride: back3qRightLayerOrder })
                ]
            },
            'walk-away': {
                name: 'Walking Away',
                icon: 'fa-person-walking',
                category: 'Guided Essentials',
                description: 'Full rear-view walk cycle with alternating X-tilt arm and leg swing.',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    moveFrame(0.00, walkContactL, { dy: -4, tilts: withBackWalkSwingTilt({ torso: { y: -4 }, head: { y: -2 } }, 1), backViewLayerOverride: backLayerOrder }),
                    moveFrame(0.25, walkPassingR, { dy: -6, tilts: withBackWalkSwingTilt({ torso: { y: 0 }, head: { y: 0 } }, 0), backViewLayerOverride: backLayerOrder }),
                    moveFrame(0.50, walkContactR, { dy: -4, tilts: withBackWalkSwingTilt({ torso: { y: 4 }, head: { y: 2 } }, -1), backViewLayerOverride: backLayerOrder }),
                    moveFrame(0.75, walkPassingL, { dy: -6, tilts: withBackWalkSwingTilt({ torso: { y: 0 }, head: { y: 0 } }, 0), backViewLayerOverride: backLayerOrder }),
                    moveFrame(1.00, walkContactL, { dy: -4, tilts: withBackWalkSwingTilt({ torso: { y: -4 }, head: { y: -2 } }, 1), backViewLayerOverride: backLayerOrder })
                ]
            },
            'tilt-walk-away': {
                ...makeBackWalkForwardMovement({
                    name: 'Tilt Walk Away Horizon Travel',
                    description: 'Rear-view walk moving up the stage with alternating X-tilt limb swing and smooth front-walk-style step cadence.',
                    duration: 4000,
                    travel: -160
                })
            },
            'back-walk-forward-horizon-long': {
                ...makeBackWalkForwardMovement({
                    name: 'Back Walk Forward (Horizon Travel)',
                    description: 'Back-facing walk moving up the stage with full arm/leg swing sync. Use Movement Blend Y px to set the exact distance.',
                    duration: 4000,
                    travel: -160
                })
            },
            'back-run-forward-horizon': {
                ...makeBackRunForwardMovement({
                    name: 'Back Run Forward (Horizon Travel)',
                    description: 'Back-facing run moving up the stage with stronger arm drive, airborne lift, and distance-aware Y travel.',
                    duration: 2200,
                    travel: -240,
                    strideScale: 1
                })
            },
            'guided-back-run-forward-y': {
                ...makeBackRunForwardMovement({
                    name: 'Guided Back Run Forward (Y)',
                    description: 'Rear-view run that travels forward away from the viewer on the Y axis. Use Movement Blend Y px to set the exact distance.',
                    duration: 2200,
                    travel: -240,
                    strideScale: 1.05
                })
            },
            'guided-back-strut': {
                ...makeBackWalkForwardMovement({
                    name: 'Guided Back Strut',
                    icon: 'fa-person-walking',
                    description: 'Confident straight-back strut in place, using rear-view X-tilt arm and leg swing instead of side-view crossing.',
                    duration: 2600,
                    travel: 0,
                    strideScale: 1.15,
                    repeat: Infinity
                })
            },
            'guided-back-stroll': {
                ...makeBackWalkForwardMovement({
                    name: 'Guided Back Stroll',
                    icon: 'fa-person-walking',
                    description: 'Relaxed straight-back stroll in place with smaller rear-view X-tilt arm and leg swing.',
                    duration: 3600,
                    travel: 0,
                    strideScale: 0.7,
                    repeat: Infinity
                })
            },
            'guided-back-strut-forward-y': {
                ...makeBackWalkForwardMovement({
                    name: 'Guided Back Strut Forward (Y)',
                    description: 'Rear-view strut that walks forward away from the viewer on the Y axis. Use Movement Blend Y px to set the exact distance.',
                    duration: 3000,
                    travel: -180,
                    strideScale: 1.15
                })
            },
            'guided-back-stroll-forward-y': {
                ...makeBackWalkForwardMovement({
                    name: 'Guided Back Stroll Forward (Y)',
                    description: 'Relaxed rear-view stroll that walks forward away from the viewer on the Y axis.',
                    duration: 4200,
                    travel: -140,
                    strideScale: 0.75
                })
            },
            'guided-back-3q-strut-left': {
                name: 'Guided 3/4 Back Strut Left',
                icon: 'fa-person-walking-arrow-left',
                category: 'Guided Essentials',
                description: 'Slower 3/4-back-left strut with corrected rear layer order and full 3/4 tilt.',
                duration: 1650,
                repeat: Infinity,
                viewCompatibility: ['back-3q-left'],
                directionLabel: 'Back 3/4 Left',
                auditNotes: ['Uses rear 3/4 layer order', 'Full-part 3/4 Y tilt'],
                keyframes: makeBack3qLoopFrames(back3qStrutLeftA, back3qStrutLeftB, {
                    layerOrder: back3qLeftLayerOrder,
                    facing: 'left',
                    tiltY: 45,
                    strideBob: -3,
                    passBob: -6,
                    scale: 1
                })
            },
            'guided-back-3q-strut-right': {
                name: 'Guided 3/4 Back Strut Right',
                icon: 'fa-person-walking-arrow-right',
                category: 'Guided Essentials',
                description: 'Slower 3/4-back-right strut using the corrected recorded rear layer stack.',
                duration: 1650,
                repeat: Infinity,
                viewCompatibility: ['back-3q-right'],
                directionLabel: 'Back 3/4 Right',
                auditNotes: ['Uses rear 3/4 layer order', 'Full-part 3/4 Y tilt'],
                keyframes: makeBack3qLoopFrames(back3qStrutRightA, back3qStrutRightB, {
                    layerOrder: back3qRightLayerOrder,
                    facing: 'right',
                    tiltY: -45,
                    strideBob: -3,
                    passBob: -6,
                    scale: 1
                })
            },
            'guided-back-3q-stroll-left': {
                name: 'Guided 3/4 Back Stroll Left',
                icon: 'fa-person-walking-arrow-left',
                category: 'Guided Essentials',
                description: 'Soft 3/4-back-left stroll with corrected rear layer order and small arm swing.',
                duration: 2600,
                repeat: Infinity,
                viewCompatibility: ['back-3q-left'],
                directionLabel: 'Back 3/4 Left',
                auditNotes: ['Uses rear 3/4 layer order', 'Full-part 3/4 Y tilt'],
                keyframes: makeBack3qLoopFrames(back3qStrollLeftA, back3qStrollLeftB, {
                    layerOrder: back3qLeftLayerOrder,
                    facing: 'left',
                    tiltY: 45,
                    strideBob: -2,
                    passBob: -4,
                    scale: 0.62
                })
            },
            'guided-back-3q-stroll-right': {
                name: 'Guided 3/4 Back Stroll Right',
                icon: 'fa-person-walking-arrow-right',
                category: 'Guided Essentials',
                description: 'Soft 3/4-back-right stroll with corrected rear layer order and small arm swing.',
                duration: 2600,
                repeat: Infinity,
                viewCompatibility: ['back-3q-right'],
                directionLabel: 'Back 3/4 Right',
                auditNotes: ['Uses rear 3/4 layer order', 'Full-part 3/4 Y tilt'],
                keyframes: makeBack3qLoopFrames(back3qStrollRightA, back3qStrollRightB, {
                    layerOrder: back3qRightLayerOrder,
                    facing: 'right',
                    tiltY: -45,
                    strideBob: -2,
                    passBob: -4,
                    scale: 0.62
                })
            },
            'guided-back-3q-run-left': makeBack3qRunMovement('left'),
            'guided-back-3q-run-right': makeBack3qRunMovement('right'),
            'guided-back-3q-strong-run-left': makeBack3qRunMovement('left', 'strong'),
            'guided-back-3q-strong-run-right': makeBack3qRunMovement('right', 'strong'),
            'guided-back-3q-run-forward-left': makeBack3qRunForwardMovement('left'),
            'guided-back-3q-run-forward-right': makeBack3qRunForwardMovement('right'),
            'guided-back-3q-strong-run-forward-left': makeBack3qRunForwardMovement('left', 'strong'),
            'guided-back-3q-strong-run-forward-right': makeBack3qRunForwardMovement('right', 'strong'),
            'guided-back-3q-strut-forward-left': makeBack3qForwardMovement('left', 'strut'),
            'guided-back-3q-strut-forward-right': makeBack3qForwardMovement('right', 'strut'),
            'guided-back-3q-stroll-forward-left': makeBack3qForwardMovement('left', 'stroll'),
            'guided-back-3q-stroll-forward-right': makeBack3qForwardMovement('right', 'stroll'),
            'run-away': {
                name: 'Running Away',
                icon: 'fa-person-running',
                category: 'Guided Essentials',
                description: 'Rear-view running cycle with airborne spread and alternating X-tilt limb drive.',
                duration: 900,
                repeat: Infinity,
                keyframes: [
                    moveFrame(0.00, runContactL, { dy: -8, tilts: withBackWalkSwingTilt({ torso: { y: -3 }, head: { y: -1 } }, 1, { armX: 38, legX: 34 }), backViewLayerOverride: backLayerOrder }),
                    moveFrame(0.25, runMidFlight, { dy: -20, tilts: withBackWalkSwingTilt({ torso: { y: 0 }, head: { y: 0 } }, 0, { armX: 38, legX: 34 }), backViewLayerOverride: backLayerOrder }),
                    moveFrame(0.50, runContactR, { dy: -8, tilts: withBackWalkSwingTilt({ torso: { y: 3 }, head: { y: 1 } }, -1, { armX: 38, legX: 34 }), backViewLayerOverride: backLayerOrder }),
                    moveFrame(0.75, runMidFlight, { dy: -20, tilts: withBackWalkSwingTilt({ torso: { y: 0 }, head: { y: 0 } }, 0, { armX: 38, legX: 34 }), backViewLayerOverride: backLayerOrder }),
                    moveFrame(1.00, runContactL, { dy: -8, tilts: withBackWalkSwingTilt({ torso: { y: -3 }, head: { y: -1 } }, 1, { armX: 38, legX: 34 }), backViewLayerOverride: backLayerOrder })
                ]
            },
            wave: {
                name: 'Wave Right Hand',
                icon: 'fa-hand',
                category: 'Gestures',
                description: 'Rear-view right-hand waving loop.',
                duration: 1200,
                repeat: 3,
                keyframes: [
                    frame(0.00, waveBase),
                    frame(0.30, waveHigh),
                    frame(0.60, waveLow),
                    frame(1.00, waveBase)
                ]
            },
            'hands-on-hips': {
                name: 'Hands on Hips Hold',
                icon: 'fa-user',
                category: 'Standing',
                description: 'Rear-view hands-on-hips with idle sway.',
                duration: 2000,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, {
                        'l-upper-arm': 35, 'l-forearm': -70, 'l-hand': -20,
                        'r-upper-arm': -35, 'r-forearm': 70, 'r-hand': 20,
                        'l-upper-leg': 5, 'r-upper-leg': -5
                    }),
                    frame(0.50, {
                        torso: 2,
                        'l-upper-arm': 37, 'l-forearm': -72, 'l-hand': -20,
                        'r-upper-arm': -33, 'r-forearm': 68, 'r-hand': 20,
                        'l-upper-leg': 5, 'r-upper-leg': -5
                    }, -1),
                    frame(1.00, {
                        'l-upper-arm': 35, 'l-forearm': -70, 'l-hand': -20,
                        'r-upper-arm': -35, 'r-forearm': 70, 'r-hand': 20,
                        'l-upper-leg': 5, 'r-upper-leg': -5
                    })
                ]
            },
            shrug: {
                name: 'Shrug',
                icon: 'fa-person-shrugging',
                category: 'Gestures',
                description: 'Rear-view shrug with palms out.',
                duration: 1400,
                repeat: 2,
                keyframes: [
                    frame(0.00, {}),
                    frame(0.30, {
                        head: 10,
                        'l-upper-arm': 45, 'l-forearm': -40, 'l-hand': 30,
                        'r-upper-arm': -45, 'r-forearm': 40, 'r-hand': -30,
                        'l-upper-leg': 10, 'r-upper-leg': -10
                    }, -3),
                    frame(0.70, {
                        head: 10,
                        'l-upper-arm': 45, 'l-forearm': -40, 'l-hand': 30,
                        'r-upper-arm': -45, 'r-forearm': 40, 'r-hand': -30,
                        'l-upper-leg': 10, 'r-upper-leg': -10
                    }, -3),
                    frame(1.00, {})
                ]
            },
            'pick-up-drop': {
                name: 'Pick Up Center / Drop Object',
                icon: 'fa-hand-holding',
                category: 'Daily Activities',
                description: 'Rear-view center pickup between the legs, with planted feet and return to idle.',
                duration: 2200,
                repeat: 1,
                keyframes: [
                    frame(0.00, { waist: 0, 'l-upper-arm': 4, 'r-upper-arm': -4 }),
                    frame(0.20, {
                        waist: 4,
                        'l-upper-arm': 20, 'l-forearm': 28, 'l-hand': 0,
                        'r-upper-arm': -8, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 45, 'l-lower-leg': -48, 'l-foot': 0,
                        'r-upper-leg': -48, 'r-lower-leg': 42, 'r-foot': 0
                    }, 50, { head: { x: -3, y: 0 } }),
                    frame(0.36, {
                        waist: 9,
                        'l-upper-arm': 38, 'l-forearm': 52, 'l-hand': 0,
                        'r-upper-arm': -12, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 82, 'l-lower-leg': -84, 'l-foot': 0,
                        'r-upper-leg': -86, 'r-lower-leg': 70, 'r-foot': 0
                    }, 90, { head: { x: -4, y: 0 } }),
                    frame(0.52, {
                        waist: 13,
                        'l-upper-arm': 55, 'l-forearm': 75, 'l-hand': 0,
                        'r-upper-arm': -17, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 108, 'l-lower-leg': -106, 'l-foot': 0,
                        'r-upper-leg': -122, 'r-lower-leg': 90, 'r-foot': 0
                    }, 110, { head: { x: -4, y: 0 } }),
                    frame(0.68, {
                        waist: 8,
                        'l-upper-arm': 40, 'l-forearm': 50, 'l-hand': 0,
                        'r-upper-arm': -12, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 70, 'l-lower-leg': -72, 'l-foot': 0,
                        'r-upper-leg': -78, 'r-lower-leg': 62, 'r-foot': 0
                    }, 78, { head: { x: -3, y: 0 } }),
                    frame(0.84, {
                        waist: 3,
                        'l-upper-arm': 18, 'l-forearm': 24, 'l-hand': 0,
                        'r-upper-arm': -6, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 24, 'l-lower-leg': -30, 'l-foot': 0,
                        'r-upper-leg': -28, 'r-lower-leg': 24, 'r-foot': 0
                    }, 22, { head: { x: -2, y: 0 } }),
                    frame(1.00, { waist: 0, 'l-upper-arm': 4, 'r-upper-arm': -4 })
                ]
            },
            'pick-up-drop-left': {
                name: 'Pick Up Left / Drop Object',
                icon: 'fa-hand-holding',
                category: 'Daily Activities',
                description: 'Rear-view pickup from the left side using the left arm, with waist turning left and return to idle.',
                duration: 2200,
                repeat: 1,
                keyframes: [
                    frame(0.00, { waist: 0, 'l-upper-arm': 4, 'r-upper-arm': -4 }),
                    frame(0.20, {
                        waist: -8,
                        'l-upper-arm': 10, 'l-forearm': -8, 'l-hand': 1,
                        'r-upper-arm': -4, 'r-forearm': 4, 'r-hand': 1,
                        'l-upper-leg': 36, 'l-lower-leg': -50, 'l-foot': 0,
                        'r-upper-leg': -33, 'r-lower-leg': 40, 'r-foot': 0
                    }, 55, { head: { x: -4, y: 0 } }),
                    frame(0.36, {
                        waist: -18,
                        'l-upper-arm': 30, 'l-forearm': -4, 'l-hand': 2,
                        'r-upper-arm': 10, 'r-forearm': 0, 'r-hand': 1,
                        'l-upper-leg': 73, 'l-lower-leg': -102, 'l-foot': 0,
                        'r-upper-leg': -66, 'r-lower-leg': 81, 'r-foot': 0
                    }, 110, { head: { x: -6, y: 0 } }),
                    frame(0.52, {
                        waist: -61,
                        'l-upper-arm': 90, 'l-forearm': 0, 'l-hand': 0,
                        'r-upper-arm': 21, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 73, 'l-lower-leg': -102, 'l-foot': 0,
                        'r-upper-leg': -66, 'r-lower-leg': 81, 'r-foot': 0
                    }, 110, { head: { x: -8, y: 0 } }),
                    frame(0.68, {
                        waist: -42,
                        'l-upper-arm': 62, 'l-forearm': -8, 'l-hand': -2,
                        'r-upper-arm': 16, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 50, 'l-lower-leg': -70, 'l-foot': 0,
                        'r-upper-leg': -45, 'r-lower-leg': 56, 'r-foot': 0
                    }, 78, { head: { x: -5, y: 0 } }),
                    frame(0.84, {
                        waist: -12,
                        'l-upper-arm': 18, 'l-forearm': -16, 'l-hand': -4,
                        'r-upper-arm': 8, 'r-forearm': 0, 'r-hand': 2
                    }, 18, { head: { x: -2, y: 0 } }),
                    frame(1.00, { waist: 0, 'l-upper-arm': 4, 'r-upper-arm': -4 })
                ]
            },
            'pick-up-drop-right': {
                name: 'Pick Up Right / Drop Object',
                icon: 'fa-hand-holding',
                category: 'Daily Activities',
                description: 'Rear-view pickup from the right side using the right arm, with waist turning right and return to idle.',
                duration: 2200,
                repeat: 1,
                keyframes: [
                    frame(0.00, { waist: 0, 'l-upper-arm': 4, 'r-upper-arm': -4 }),
                    frame(0.20, {
                        waist: 6,
                        'l-upper-arm': 4, 'l-forearm': -4, 'l-hand': -1,
                        'r-upper-arm': -10, 'r-forearm': 8, 'r-hand': -1,
                        'l-upper-leg': 36, 'l-lower-leg': -50, 'l-foot': 0,
                        'r-upper-leg': -33, 'r-lower-leg': 40, 'r-foot': 0
                    }, 55, { head: { x: -4, y: 12 }, torso: { x: 0, y: 10 } }),
                    frame(0.36, {
                        waist: 12,
                        'l-upper-arm': 6, 'l-forearm': -6, 'l-hand': -1,
                        'r-upper-arm': -18, 'r-forearm': 8, 'r-hand': -2,
                        'l-upper-leg': 73, 'l-lower-leg': -102, 'l-foot': 0,
                        'r-upper-leg': -66, 'r-lower-leg': 81, 'r-foot': 0
                    }, 110, { head: { x: -6, y: 14 }, torso: { x: 0, y: 12 } }),
                    frame(0.52, {
                        waist: 54,
                        'l-upper-arm': 1, 'l-forearm': 0, 'l-hand': 0,
                        'r-upper-arm': -63, 'r-forearm': 0, 'r-hand': 0,
                        'l-upper-leg': 73, 'l-lower-leg': -102, 'l-foot': 0,
                        'r-upper-leg': -66, 'r-lower-leg': 81, 'r-foot': 0
                    }, 110, { head: { x: -8, y: 16 }, torso: { x: 0, y: 14 } }),
                    frame(0.68, {
                        waist: 32,
                        'l-upper-arm': 4, 'l-forearm': -3, 'l-hand': 0,
                        'r-upper-arm': -44, 'r-forearm': 12, 'r-hand': 2,
                        'l-upper-leg': 50, 'l-lower-leg': -70, 'l-foot': 0,
                        'r-upper-leg': -45, 'r-lower-leg': 56, 'r-foot': 0
                    }, 78, { head: { x: -5, y: 10 }, torso: { x: 0, y: 8 } }),
                    frame(0.84, {
                        waist: 8,
                        'l-upper-arm': 8, 'l-forearm': -8, 'l-hand': -2,
                        'r-upper-arm': -12, 'r-forearm': 22, 'r-hand': 4
                    }, 18, { head: { x: -2, y: 4 }, torso: { x: 0, y: 3 } }),
                    frame(1.00, { waist: 0, 'l-upper-arm': 4, 'r-upper-arm': -4 })
                ]
            },
            'sit-stand-transition': {
                name: 'Sit Down / Stand Up',
                icon: 'fa-chair',
                category: 'Daily Activities',
                description: 'Rear-view transition from standing to seated and back with controlled knees.',
                duration: 2200,
                repeat: 1,
                keyframes: [
                    frame(0.00, { 'l-upper-arm': 3, 'r-upper-arm': -3 }),
                    frame(0.22, {
                        torso: 8,
                        'l-upper-arm': 12, 'l-forearm': -18,
                        'r-upper-arm': -12, 'r-forearm': 18,
                        'l-upper-leg': 16, 'l-lower-leg': -20, 'l-foot': -2,
                        'r-upper-leg': -16, 'r-lower-leg': 20, 'r-foot': 2
                    }, 14, { head: { x: -5, y: 0 } }),
                    frame(0.44, {
                        torso: 5,
                        'l-upper-arm': 10, 'l-forearm': -24,
                        'r-upper-arm': -10, 'r-forearm': 24,
                        'l-upper-leg': 42, 'l-lower-leg': -48, 'l-foot': -3,
                        'r-upper-leg': -42, 'r-lower-leg': 48, 'r-foot': 3
                    }, 34, { head: { x: -4, y: 0 } }),
                    frame(0.62, {
                        torso: 5,
                        'l-upper-arm': 10, 'l-forearm': -24,
                        'r-upper-arm': -10, 'r-forearm': 24,
                        'l-upper-leg': 42, 'l-lower-leg': -48, 'l-foot': -3,
                        'r-upper-leg': -42, 'r-lower-leg': 48, 'r-foot': 3
                    }, 34, { head: { x: -4, y: 0 } }),
                    frame(0.82, {
                        torso: 8,
                        'l-upper-arm': 12, 'l-forearm': -18,
                        'r-upper-arm': -12, 'r-forearm': 18,
                        'l-upper-leg': 16, 'l-lower-leg': -20, 'l-foot': -2,
                        'r-upper-leg': -16, 'r-lower-leg': 20, 'r-foot': 2
                    }, 14, { head: { x: -5, y: 0 } }),
                    frame(1.00, { 'l-upper-arm': 3, 'r-upper-arm': -3 })
                ]
            },
            jump: {
                name: 'Jump',
                icon: 'fa-person-falling',
                category: 'Action',
                description: 'Rear-view jump with controlled mid-air leg spread.',
                duration: 1200,
                repeat: 1,
                keyframes: [
                    frame(0.00, {}),
                    frame(0.20, {
                        torso: 10,
                        'l-upper-leg': 10, 'l-lower-leg': -14, 'l-foot': -2,
                        'r-upper-leg': -10, 'r-lower-leg': 14, 'r-foot': 2
                    }, 6),
                    frame(0.45, {
                        head: -10,
                        'l-upper-arm': 130, 'l-forearm': -20, 'l-hand': -10,
                        'r-upper-arm': -130, 'r-forearm': 20, 'r-hand': 10,
                        'l-upper-leg': 24, 'l-lower-leg': 10, 'l-foot': -8,
                        'r-upper-leg': -24, 'r-lower-leg': -10, 'r-foot': 8
                    }, -30),
                    frame(0.70, {
                        head: -10,
                        'l-upper-arm': 130, 'l-forearm': -20, 'l-hand': -10,
                        'r-upper-arm': -130, 'r-forearm': 20, 'r-hand': 10,
                        'l-upper-leg': 24, 'l-lower-leg': 10, 'l-foot': -8,
                        'r-upper-leg': -24, 'r-lower-leg': -10, 'r-foot': 8
                    }, -30),
                    frame(0.90, {
                        torso: 5,
                        'l-upper-leg': 6, 'l-lower-leg': -8, 'l-foot': -1,
                        'r-upper-leg': -6, 'r-lower-leg': 8, 'r-foot': 1
                    }, 4),
                    frame(1.00, {})
                ]
            },
            'defensive-guard-bob': {
                name: 'Defensive Guard Bob',
                icon: 'fa-shield-halved',
                category: 'Action',
                description: 'Rear-view guard stance with bobbing sway.',
                duration: 1600,
                repeat: Infinity,
                keyframes: [
                    frame(0.00, {
                        torso: 5, head: -5,
                        'l-upper-arm': 45, 'l-forearm': -90, 'l-hand': -10,
                        'r-upper-arm': -45, 'r-forearm': 90, 'r-hand': 10,
                        'l-upper-leg': 15, 'l-lower-leg': 10, 'l-foot': -5,
                        'r-upper-leg': -15, 'r-lower-leg': -10, 'r-foot': 5
                    }),
                    frame(0.30, {
                        torso: 3, head: -3,
                        'l-upper-arm': 48, 'l-forearm': -88, 'l-hand': -10,
                        'r-upper-arm': -42, 'r-forearm': 92, 'r-hand': 10,
                        'l-upper-leg': 17, 'l-lower-leg': 15, 'l-foot': -5,
                        'r-upper-leg': -13, 'r-lower-leg': -5, 'r-foot': 5
                    }, 5),
                    frame(0.70, {
                        torso: 7, head: -7,
                        'l-upper-arm': 42, 'l-forearm': -92, 'l-hand': -10,
                        'r-upper-arm': -48, 'r-forearm': 88, 'r-hand': 10,
                        'l-upper-leg': 13, 'l-lower-leg': 5, 'l-foot': -5,
                        'r-upper-leg': -17, 'r-lower-leg': -15, 'r-foot': 5
                    }, 5),
                    frame(1.00, {
                        torso: 5, head: -5,
                        'l-upper-arm': 45, 'l-forearm': -90, 'l-hand': -10,
                        'r-upper-arm': -45, 'r-forearm': 90, 'r-hand': 10,
                        'l-upper-leg': 15, 'l-lower-leg': 10, 'l-foot': -5,
                        'r-upper-leg': -15, 'r-lower-leg': -10, 'r-foot': 5
                    })
                ]
            },
            celebrate: {
                name: 'Celebrate (Victory)',
                icon: 'fa-trophy',
                category: 'Expressive',
                description: 'Rear-view Y-pose celebration bounce.',
                duration: 1400,
                repeat: 3,
                keyframes: [
                    frame(0.00, {
                        head: -20,
                        'l-upper-arm': 140, 'r-upper-arm': -140,
                        'l-upper-leg': 15, 'l-foot': -5,
                        'r-upper-leg': -15, 'r-foot': 5
                    }),
                    frame(0.25, {
                        head: -25,
                        'l-upper-arm': 150, 'r-upper-arm': -130,
                        'l-upper-leg': 15, 'l-foot': -5,
                        'r-upper-leg': -15, 'r-foot': 5
                    }, -12),
                    frame(0.50, {
                        head: -20,
                        'l-upper-arm': 140, 'r-upper-arm': -140,
                        'l-upper-leg': 15, 'l-foot': -5,
                        'r-upper-leg': -15, 'r-foot': 5
                    }),
                    frame(0.75, {
                        head: -25,
                        'l-upper-arm': 130, 'r-upper-arm': -150,
                        'l-upper-leg': 15, 'l-foot': -5,
                        'r-upper-leg': -15, 'r-foot': 5
                    }, -12),
                    frame(1.00, {
                        head: -20,
                        'l-upper-arm': 140, 'r-upper-arm': -140,
                        'l-upper-leg': 15, 'l-foot': -5,
                        'r-upper-leg': -15, 'r-foot': 5
                    })
                ]
            },
            crouch: {
                name: 'Crouch / Squat',
                icon: 'fa-person',
                category: 'Action',
                description: 'Rear-view crouch using body drop plus realistic hip and knee flexion.',
                duration: 1800,
                repeat: 1,
                keyframes: [
                    frame(0.00, {}),
                    frame(0.35, {
                        torso: 8, head: 4,
                        'l-upper-arm': 14, 'l-forearm': -10,
                        'r-upper-arm': -14, 'r-forearm': 10,
                        'l-upper-leg': 73, 'l-lower-leg': -102, 'l-foot': 0,
                        'r-upper-leg': -66, 'r-lower-leg': 81, 'r-foot': 0
                    }, 110),
                    frame(0.65, {
                        torso: 8, head: 4,
                        'l-upper-arm': 14, 'l-forearm': -10,
                        'r-upper-arm': -14, 'r-forearm': 10,
                        'l-upper-leg': 73, 'l-lower-leg': -102, 'l-foot': 0,
                        'r-upper-leg': -66, 'r-lower-leg': 81, 'r-foot': 0
                    }, 110),
                    frame(1.00, {})
                ]
            },
            'look-around': {
                name: 'Look Around',
                icon: 'fa-magnifying-glass',
                category: 'Gestures',
                description: 'Rear-view head turning left and right.',
                duration: 2400,
                repeat: 2,
                keyframes: [
                    frame(0.00, {}),
                    frame(0.20, { torso: -5, head: -15 }),
                    frame(0.50, { torso: 5, head: 15 }),
                    frame(0.80, { torso: -3, head: -10 }),
                    frame(1.00, {})
                ]
            }
        };

        const createBack3qPointBackVariant = (sourceKey, facing, overrides = {}) => {
            const entry = JointSystem._cloneArmatureCatalogEntry(catalog[sourceKey]);
            if (!entry) return null;
            const sign = facing === 'left' ? -1 : 1;
            const sourceFrames = Array.isArray(entry.keyframes) ? entry.keyframes : [];
            const sortedFrames = [...sourceFrames].sort((a, b) => {
                const at = Number.isFinite(a?.t) ? a.t : 0;
                const bt = Number.isFinite(b?.t) ? b.t : 0;
                return at - bt;
            });
            const travelDistance = Math.max(1, Math.abs(overrides.distance || 180));
            const cycleCount = Math.max(2, Math.min(8, Math.round(travelDistance / 55)));
            const frames = [];
            const frameLocalT = (frame, index) => Number.isFinite(frame?.t)
                ? Math.max(0, Math.min(1, frame.t))
                : (index / Math.max(1, sortedFrames.length - 1));
            const pushCycle = (cycleIndex, direction) => {
                const halfStart = direction === 1 ? 0 : 0.5;
                sortedFrames.forEach((frame, index) => {
                    if (cycleIndex > 0 && index === 0) return;
                    if (direction === -1 && cycleIndex === 0 && index === 0) return;
                    const sourceT = frameLocalT(frame, index);
                    const cycleProgress = Math.max(0, Math.min(1, (cycleIndex + sourceT) / cycleCount));
                    const next = Utils.deepClone(frame);
                    next.t = Math.round((halfStart + cycleProgress * 0.5) * 1000) / 1000;
                    const outwardProgress = direction === 1 ? cycleProgress : (1 - cycleProgress);
                    next.dx = Math.round(sign * outwardProgress * travelDistance * 1000) / 1000;
                    frames.push(next);
                });
            };
            for (let i = 0; i < cycleCount; i++) pushCycle(i, 1);
            for (let i = 0; i < cycleCount; i++) pushCycle(i, -1);
            frames.sort((a, b) => (a.t || 0) - (b.t || 0));
            if (frames.length) {
                frames[0].t = 0;
                frames[0].dx = 0;
                frames[frames.length - 1].t = 1;
                frames[frames.length - 1].dx = 0;
            }
            if (!frames.length) {
                sourceFrames.forEach((frame, index) => {
                const sourceT = Number.isFinite(frame?.t)
                    ? Math.max(0, Math.min(1, frame.t))
                    : (index / Math.max(1, sourceFrames.length - 1));
                const next = Utils.deepClone(frame);
                next.t = Math.round(sourceT * 480) / 1000;
                next.dx = Math.round(sign * sourceT * travelDistance * 1000) / 1000;
                frames.push(next);
                });
            }
            return {
                ...entry,
                key: overrides.key || entry.key,
                name: overrides.name || entry.name,
                icon: overrides.icon || entry.icon || 'fa-person-walking-arrow-loop-left',
                category: overrides.category || 'Travel',
                description: overrides.description || entry.description || '',
                duration: overrides.duration || Math.max(3000, (entry.duration || 1650) * 2),
                repeat: overrides.repeat ?? 1,
                easing: overrides.easing || entry.easing || 'linear',
                keyframes: frames.length ? frames : entry.keyframes,
                turnAround: false,
                frontBackTurnAround: false,
                absoluteTravel: true,
                selfContainedTravel: true,
                viewCompatibility: [`back-3q-${facing}`],
                directionLabel: `Back 3/4 ${facing === 'left' ? 'Left' : 'Right'}`,
                _back3qPointAndBack: true
            };
        };
        const createBack3qTurnAroundVariant = (sourceKey, facing, overrides = {}) => {
            const entry = JointSystem._cloneArmatureCatalogEntry(catalog[sourceKey]);
            if (!entry) return null;
            const opposite = facing === 'left' ? 'right' : 'left';
            const returnKey = overrides.returnKey || null;
            return {
                ...entry,
                key: overrides.key || entry.key,
                name: overrides.name || entry.name,
                icon: overrides.icon || entry.icon || 'fa-person-walking-arrow-loop-left',
                category: overrides.category || 'Travel',
                description: overrides.description || entry.description || '',
                duration: overrides.duration || Math.max(3000, (entry.duration || 1650) * 2),
                repeat: overrides.repeat ?? 1,
                frontBackTurnAround: true,
                frontBackForwardKey: sourceKey,
                frontBackReturnKey: returnKey,
                frontBackReturnKeyByLean: returnKey ? { [opposite]: returnKey } : undefined,
                frontBackReturnKeyByView: returnKey ? { [`front-3q-${opposite}`]: returnKey } : undefined,
                viewCompatibility: [`back-3q-${facing}`],
                semanticAction: overrides.semanticAction || entry.semanticAction || '',
                semanticFamily: overrides.semanticFamily || (overrides.semanticAction ? String(overrides.semanticAction).split('.')[0] : entry.semanticFamily) || '',
                motionIntent: overrides.motionIntent || entry.motionIntent || '3/4 rear locomotion with turn-around return',
                authoringConvention: overrides.authoringConvention || entry.authoringConvention || JointSystem.ARMATURE_ANATOMY_CONVENTIONS.angle,
                directionLabel: `Back 3/4 ${facing === 'left' ? 'Left' : 'Right'}`,
                turnAround: false,
                absoluteTravel: false,
                selfContainedTravel: false,
                _back3qPointAndBack: true,
                _frontBack3qReturnLean: opposite
            };
        };

        if (catalog['guided-back-strut-forward-y']) {
            catalog['back-3q-walk-to-point-and-back-left'] = createBack3qTurnAroundVariant('guided-back-3q-strut-forward-left', 'left', {
                key: 'back-3q-walk-to-point-and-back-left',
                name: '3/4 Back Walk to Point and Back (Left)',
                description: '3/4-back-left walk to an X-axis target, flip to front 3/4 right, then walk back with guided 3/4 stride.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.WALK,
                returnKey: 'guided-strut-travel'
            });
            catalog['back-3q-walk-to-point-and-back-right'] = createBack3qTurnAroundVariant('guided-back-3q-strut-forward-right', 'right', {
                key: 'back-3q-walk-to-point-and-back-right',
                name: '3/4 Back Walk to Point and Back (Right)',
                description: '3/4-back-right walk to an X-axis target, flip to front 3/4 left, then walk back with guided 3/4 stride.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.WALK,
                returnKey: 'guided-strut-travel'
            });
            catalog['back-3q-strut-to-point-and-back-left'] = createBack3qTurnAroundVariant('guided-back-3q-strut-forward-left', 'left', {
                key: 'back-3q-strut-to-point-and-back-left',
                name: '3/4 Back Strut to Point and Back (Left)',
                description: '3/4-back-left strut to an X-axis target, flip to front 3/4 right, then strut back with guided 3/4 rhythm.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STRUT,
                returnKey: 'guided-strut-travel'
            });
            catalog['back-3q-strut-to-point-and-back-right'] = createBack3qTurnAroundVariant('guided-back-3q-strut-forward-right', 'right', {
                key: 'back-3q-strut-to-point-and-back-right',
                name: '3/4 Back Strut to Point and Back (Right)',
                description: '3/4-back-right strut to an X-axis target, flip to front 3/4 left, then strut back with guided 3/4 rhythm.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STRUT,
                returnKey: 'guided-strut-travel'
            });
            const backStrut = JointSystem._cloneArmatureCatalogEntry(catalog['guided-back-strut-forward-y']);
            catalog['walk-to-point-and-back'] = {
                ...backStrut,
                name: 'Walk to Point and Back',
                icon: 'fa-person-walking-arrow-loop-left',
                category: 'Travel',
                description: 'Back-view strut to a Y target, turn to front view, then walk back to the start. Use Movement Blend Y px for exact distance.',
                duration: backStrut.duration || 3000,
                repeat: 1,
                frontBackTurnAround: true,
                frontBackForwardKey: 'guided-back-strut-forward-y',
                frontBackReturnKey: 'front-walk-forward',
                frontBackForwardKeyByLean: {
                    left: 'guided-back-3q-strut-forward-left',
                    right: 'guided-back-3q-strut-forward-right'
                },
                back3qTurnAroundKeyByLean: {
                    left: 'back-3q-walk-to-point-and-back-left',
                    right: 'back-3q-walk-to-point-and-back-right'
                },
                viewCompatibility: ['back'],
                turnAround: false
            };
            catalog['strut-to-point-and-back'] = {
                ...backStrut,
                name: 'Strut to Point and Back',
                icon: 'fa-person-walking-arrow-loop-left',
                category: 'Travel',
                description: 'Back-view strut to a Y target, turn to front view, then strut back to the start. Use Movement Blend Y px for exact distance.',
                duration: backStrut.duration || 3000,
                repeat: 1,
                frontBackTurnAround: true,
                frontBackForwardKey: 'guided-back-strut-forward-y',
                frontBackReturnKey: 'front-strut-forward-y',
                frontBackForwardKeyByLean: {
                    left: 'guided-back-3q-strut-forward-left',
                    right: 'guided-back-3q-strut-forward-right'
                },
                back3qTurnAroundKeyByLean: {
                    left: 'back-3q-strut-to-point-and-back-left',
                    right: 'back-3q-strut-to-point-and-back-right'
                },
                viewCompatibility: ['back'],
                turnAround: false
            };
        }
        if (catalog['guided-back-stroll-forward-y']) {
            catalog['back-3q-stroll-to-point-and-back-left'] = createBack3qTurnAroundVariant('guided-back-3q-stroll-forward-left', 'left', {
                key: 'back-3q-stroll-to-point-and-back-left',
                name: '3/4 Back Stroll to Point and Back (Left)',
                description: '3/4-back-left relaxed stroll to an X-axis target, flip to front 3/4 right, then stroll back with guided 3/4 rhythm.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STROLL,
                returnKey: 'guided-stroll-travel',
                duration: 4200
            });
            catalog['back-3q-stroll-to-point-and-back-right'] = createBack3qTurnAroundVariant('guided-back-3q-stroll-forward-right', 'right', {
                key: 'back-3q-stroll-to-point-and-back-right',
                name: '3/4 Back Stroll to Point and Back (Right)',
                description: '3/4-back-right relaxed stroll to an X-axis target, flip to front 3/4 left, then stroll back with guided 3/4 rhythm.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.STROLL,
                returnKey: 'guided-stroll-travel',
                duration: 4200
            });
            const backStroll = JointSystem._cloneArmatureCatalogEntry(catalog['guided-back-stroll-forward-y']);
            catalog['stroll-to-point-and-back'] = {
                ...backStroll,
                name: 'Stroll to Point and Back',
                icon: 'fa-person-walking-arrow-loop-left',
                category: 'Travel',
                description: 'Back-view relaxed stroll to a Y target, turn to front view, then walk back to the start.',
                duration: backStroll.duration || 4200,
                repeat: 1,
                frontBackTurnAround: true,
                frontBackForwardKey: 'guided-back-stroll-forward-y',
                frontBackReturnKey: 'front-stroll-forward-y',
                frontBackForwardKeyByLean: {
                    left: 'guided-back-3q-stroll-forward-left',
                    right: 'guided-back-3q-stroll-forward-right'
                },
                back3qTurnAroundKeyByLean: {
                    left: 'back-3q-stroll-to-point-and-back-left',
                    right: 'back-3q-stroll-to-point-and-back-right'
                },
                viewCompatibility: ['back'],
                turnAround: false
            };
        }
        if (catalog['guided-back-3q-run-forward-left'] && catalog['guided-back-3q-run-forward-right']) {
            catalog['back-3q-run-to-point-and-back-left'] = createBack3qTurnAroundVariant('guided-back-3q-run-forward-left', 'left', {
                key: 'back-3q-run-to-point-and-back-left',
                name: '3/4 Back Run to Point and Back (Left)',
                icon: 'fa-person-running-arrow-left',
                description: '3/4-back-left run to an X-axis target, flip to front 3/4 right, then run back to the start.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                returnKey: 'guided-run-travel',
                duration: 4300
            });
            catalog['back-3q-run-to-point-and-back-right'] = createBack3qTurnAroundVariant('guided-back-3q-run-forward-right', 'right', {
                key: 'back-3q-run-to-point-and-back-right',
                name: '3/4 Back Run to Point and Back (Right)',
                icon: 'fa-person-running-arrow-right',
                description: '3/4-back-right run to an X-axis target, flip to front 3/4 left, then run back to the start.',
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                returnKey: 'guided-run-travel',
                duration: 4300
            });
            if (catalog['guided-back-3q-strong-run-forward-left'] && catalog['guided-back-3q-strong-run-forward-right']) {
                catalog['back-3q-strong-run-to-point-and-back-left'] = createBack3qTurnAroundVariant('guided-back-3q-strong-run-forward-left', 'left', {
                    key: 'back-3q-strong-run-to-point-and-back-left',
                    name: '3/4 Back Strong Run to Point and Back (Left)',
                    icon: 'fa-person-running-arrow-left',
                    description: '3/4-back-left strong run to an X-axis target, flip to front 3/4 right, then run back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                    returnKey: 'guided-strong-run-travel',
                    duration: 3600
                });
                catalog['back-3q-strong-run-to-point-and-back-right'] = createBack3qTurnAroundVariant('guided-back-3q-strong-run-forward-right', 'right', {
                    key: 'back-3q-strong-run-to-point-and-back-right',
                    name: '3/4 Back Strong Run to Point and Back (Right)',
                    icon: 'fa-person-running-arrow-right',
                    description: '3/4-back-right strong run to an X-axis target, flip to front 3/4 left, then run back to the start.',
                    semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.RUN,
                    returnKey: 'guided-strong-run-travel',
                    duration: 3600
                });
            }
        }

        JointSystem._normalizeArmatureMovementCatalogEntryDefaults(catalog);
        JointSystem._applyDefaultArmatureMovementCompatibility(catalog, ['back']);
        JointSystem._addHumanFrontBackHeadMovements(catalog, 'back');
        JointSystem._ensureArmatureFrontBackFlipMovement(catalog, 'back');
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'back', {
            label: 'Back',
            viewCompatibility: ['back']
        });
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'back-3q-left', {
            label: 'Back 3/4 Left',
            viewCompatibility: ['back-3q-left']
        });
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'back-3q-right', {
            label: 'Back 3/4 Right',
            viewCompatibility: ['back-3q-right']
        });
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        const seatedPoses = JointSystem._buildHumanBackArmaturePoseCatalog();
        for (const key of ['read-book-seated', 'write-seated', 'type-seated']) {
            const pose = seatedPoses[`${key}-back`];
            for (const frame of catalog[key].keyframes) {
                for (const name of ['right-hip', 'left-hip', 'right-knee', 'left-knee', 'right-ankle', 'left-ankle']) frame.jointAngles[name] = pose.jointAngles[name];
                frame.jointTilts = { ...frame.jointTilts, ...Utils.deepClone(pose.jointTilts) };
                frame.partAngles = { ...frame.partAngles, torso: 0 };
                frame.dy = pose.dy;
                frame.seatDepth = 1;
            }
        }
        const eatingHold = seatedPoses['sit-eating-back'];
        const eatingFrame = (t, raised) => {
            const pose = JointSystem._cloneArmatureCatalogEntry(eatingHold);
            if (!raised) {
                pose.jointAngles['right-shoulder'] = 12;
                pose.jointAngles['right-elbow'] = -85;
                pose.contacts = { 'right-hand': { tag: 'sternum', offsetX: 0, offsetY: 48, iterations: 16 } };
            }
            return { ...pose, t };
        };
        catalog['eat-seated-back'] = {
            name: 'Eat / Hand to Mouth (Seated, Back)', icon: 'fa-utensils', category: 'Daily Activities',
            duration: 2400, repeat: Infinity, easing: 'easeInOut', grounding: 'planted', smoothContacts: true,
            viewCompatibility: ['back', 'back-3q-left', 'back-3q-right'],
            keyframes: [eatingFrame(0, false), eatingFrame(.08, false), eatingFrame(.48, true),
                eatingFrame(.58, true), eatingFrame(.94, false), eatingFrame(1, false)]
        };
        JointSystem._projectSeatedMovements(catalog);
        JointSystem._alignPhoneMovementPoses(catalog, seatedPoses, '-back');
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._refineDeskHandMovements(catalog, 'back');
        JointSystem._addHandgunViewPresets(catalog, 'back', true);
        JointSystem._addScenarioMovements(catalog, 'back');
        JointSystem._humanBackArmatureMovementCatalog = catalog;
        return catalog;
    }

JointSystem._convertHumanSideAnglesToArmaturePoseData = function(angles = {}) {
        const jointAngles = {};
        const partAngles = {};
        const setJoint = (jointNames, sourceKey) => {
            const value = angles?.[sourceKey];
            if (!Number.isFinite(value)) return;
            [].concat(jointNames || []).forEach(jointName => {
                if (jointName) jointAngles[jointName] = value;
            });
        };

        setJoint('shoulder', 'upper-arm');
        setJoint('elbow', 'forearm');
        setJoint('wrist', 'hand');

        setJoint(['hip', 'front-hip', 'back-hip'], 'upper-leg');
        setJoint(['knee', 'front-knee', 'back-knee'], 'lower-leg');
        setJoint(['ankle', 'front-ankle', 'back-ankle'], 'foot');

        if (Number.isFinite(angles?.head)) {
            jointAngles.neck = angles.head;
        }

        if (Number.isFinite(angles?.torso)) {
            partAngles.torso = angles.torso;
        }

        return { jointAngles, partAngles };
    }

JointSystem._buildHumanSideArmaturePoseCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (JointSystem._humanSideArmaturePoseCatalog) {
            return JointSystem._humanSideArmaturePoseCatalog;
        }

        const catalog = {
            idle: {
                name: 'Idle',
                icon: 'fa-person-walking',
                category: 'Standing',
                description: 'Neutral side-facing idle with the limb chains resting down.',
                jointAngles: {},
                partAngles: {}
            }
        };

        const poseDefs = [
            {
                key: 'walk-step-forward',
                name: 'Walk Step',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Side-view walk step pose.',
                angles: { 'upper-arm': -30, 'forearm': 40, 'upper-leg': 30, 'lower-leg': -40 }
            },
            {
                key: 'walk-step-recover',
                name: 'Walk Recover',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Side-view recovery pose in the walk cycle.',
                angles: { 'upper-arm': 20, 'forearm': 10, 'upper-leg': -20, 'lower-leg': -10 }
            },
            {
                key: 'run-push',
                name: 'Run Push',
                icon: 'fa-person-running',
                category: 'Locomotion',
                description: 'Side-view run push pose.',
                angles: { 'upper-arm': -50, 'forearm': 80, 'upper-leg': 50, 'lower-leg': -70 }
            },
            {
                key: 'run-recover',
                name: 'Run Recover',
                icon: 'fa-person-running',
                category: 'Locomotion',
                description: 'Side-view run recovery pose.',
                angles: { 'upper-arm': 30, 'forearm': 20, 'upper-leg': -30, 'lower-leg': -20 }
            },
            {
                key: 'kick-side',
                name: 'Kick',
                icon: 'fa-shoe-prints',
                category: 'Action',
                description: 'Side-view kick extension.',
                angles: { 'upper-leg': 60, 'lower-leg': -10, 'torso': 8 }
            },
            {
                key: 'crouch-side',
                name: 'Crouch',
                icon: 'fa-level-down-alt',
                category: 'Action',
                description: 'Side-view crouch pose.',
                angles: { 'upper-leg': 113, 'lower-leg': -113, 'torso': 0, 'upper-arm': -71, 'forearm': -8 }
            },
            {
                key: 'punch-side',
                name: 'Punch',
                icon: 'fa-fist-raised',
                category: 'Action',
                description: 'Side-view punch extension.',
                angles: { 'upper-arm': 10, 'forearm': 5, 'torso': 12 }
            },
            {
                key: 'bow-side',
                name: 'Bow',
                icon: 'fa-praying-hands',
                category: 'Gestures',
                description: 'Side-view bow pose.',
                angles: { 'torso': 45, 'upper-arm': -30, 'forearm': 20, 'head': 10 }
            },
            {
                key: 'jump-air',
                name: 'Jump Air',
                icon: 'fa-arrow-up',
                category: 'Action',
                description: 'Side-view jump airborne pose.',
                angles: { 'upper-leg': -20, 'lower-leg': -10, 'torso': -5, 'upper-arm': -50, 'forearm': 30 }
            },
            {
                key: 'idle-relaxed-side',
                name: 'Relaxed',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Relaxed side-view idle with a soft bend in the limbs.',
                angles: { 'upper-arm': -8, 'forearm': 18, 'upper-leg': 4, 'lower-leg': -8, 'head': -2 }
            },
            {
                key: 'hands-on-hips-side',
                name: 'Hands on Hips',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Side-view confident stance with the arm resting on the hip.',
                angles: { 'upper-arm': 12, 'forearm': 112, 'hand': 10, 'torso': 2 },
                contacts: { 'hand': { tag: 'waist', offsetX: 8, offsetY: 6, iterations: 10 } }
            },
            {
                key: 'wave-side',
                name: 'Wave',
                icon: 'fa-hand-peace',
                category: 'Gestures',
                description: 'Side-view wave pose with the hand lifted near the face.',
                angles: { 'upper-arm': -72, 'forearm': 46, 'hand': 14, 'head': -4 },
                contacts: { 'hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 9 } }
            },
            {
                key: 'guard-side',
                name: 'Guard',
                icon: 'fa-shield-halved',
                category: 'Action',
                description: 'Side-view defensive guard pose.',
                angles: { 'upper-arm': 24, 'forearm': -112, 'hand': -4, 'upper-leg': 10, 'lower-leg': -12, 'torso': 4 }
            },
            {
                key: 'salute-side',
                name: 'Salute',
                icon: 'fa-person-military-pointing',
                category: 'Gestures',
                description: 'Side-view salute at the brow.',
                angles: { 'upper-arm': -36, 'forearm': -112, 'hand': 8, 'head': -6 },
                contacts: { 'hand': { tag: 'forehead', offsetX: 6, offsetY: 8, iterations: 10 } }
            },
            {
                key: 'sit-side',
                name: 'Sit',
                icon: 'fa-chair',
                category: 'Locomotion',
                description: 'Side-view seated pose.',
                angles: { 'upper-leg': 58, 'lower-leg': -88, 'torso': 6, 'head': -8, 'upper-arm': 4, 'forearm': 22 }
            },
            {
                key: 'tip-toe-side',
                name: 'Tip-Toe',
                icon: 'fa-shoe-prints',
                category: 'Locomotion',
                description: 'Side-view tip-toe stance.',
                angles: { 'upper-leg': 4, 'lower-leg': -8, 'foot': -26, 'torso': -2 }
            },
            {
                key: 'run-drive',
                name: 'Run Drive',
                icon: 'fa-person-running',
                category: 'Locomotion',
                description: 'Side-view sprint drive pose.',
                angles: { 'upper-arm': -54, 'forearm': 76, 'upper-leg': 52, 'lower-leg': -68, 'foot': 10, 'torso': -4 }
            },
            {
                key: 'run-reach',
                name: 'Run Reach',
                icon: 'fa-person-running',
                category: 'Locomotion',
                description: 'Side-view sprint recovery pose.',
                angles: { 'upper-arm': 34, 'forearm': 18, 'upper-leg': -32, 'lower-leg': -18, 'foot': -8, 'torso': 4 }
            },
            {
                key: 'attention-side',
                name: 'Attention',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Straight side-view attention stance.',
                angles: { 'upper-arm': -2, 'forearm': 6, 'upper-leg': 0, 'lower-leg': -2, torso: 0, head: 0 }
            },
            {
                key: 'lean-back-side',
                name: 'Lean Back',
                icon: 'fa-person',
                category: 'Standing',
                description: 'Relaxed side-view lean back pose.',
                angles: { torso: -10, 'upper-arm': 4, forearm: 18, 'upper-leg': -6, 'lower-leg': -4, head: -6 }
            },
            {
                key: 'thinking-side',
                name: 'Thinking',
                icon: 'fa-face-thinking',
                category: 'Gestures',
                description: 'Side-view thoughtful pose with the hand lifted near the chin.',
                angles: { 'upper-arm': -30, forearm: -96, hand: 10, torso: 2, head: -8 },
                contacts: { 'hand': { tag: 'jaw', offsetX: 6, offsetY: -8, iterations: 10 } }
            },
            {
                key: 'phone-call-side',
                name: 'Phone Call',
                icon: 'fa-phone',
                category: 'Communication',
                description: 'Side-view listening pose with the visible hand lifted beside the ear.',
                angles: { 'upper-arm': -25, forearm: -145, hand: 0, torso: 0, head: 0 },
                contacts: { 'hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }
            },
            {
                key: 'phone-call-pre-ear-side',
                name: 'Phone Call (Pre-Ear)',
                icon: 'fa-phone-volume',
                category: 'Communication',
                description: 'Side-view near-ear prep pose that stops short of contact.',
                angles: { 'upper-arm': -22, forearm: -132, hand: 3, torso: 0, head: -1 },
                contacts: { 'hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } }
            },
            {
                key: 'hold-microphone-side',
                name: 'Hold Microphone',
                icon: 'fa-microphone',
                category: 'Communication',
                description: 'Side-view microphone pose with the hand held in front of the mouth.',
                angles: { 'upper-arm': -24, forearm: -136, hand: -4, torso: 0, head: 1 },
                contacts: { 'hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }
            },
            {
                key: 'point-forward-side',
                name: 'Point Forward',
                icon: 'fa-hand-point-right',
                category: 'Gestures',
                description: 'Side-view forward point in the facing direction.',
                angles: { 'upper-arm': 8, forearm: -8, hand: 0, torso: 4 }
            },
            {
                key: 'point-up-side',
                name: 'Point Up',
                icon: 'fa-hand-point-up',
                category: 'Gestures',
                description: 'Side-view upward point.',
                angles: { 'upper-arm': -70, forearm: -20, hand: 8, torso: -2, head: -6 }
            },
            {
                key: 'read-book-seated-side',
                name: 'Read Book (Seated)',
                icon: 'fa-book-open',
                category: 'Daily Activities',
                description: 'Side-view seated book-reading pose with the elbows bent inward to the chest.',
                angles: { torso: 5, head: -6, 'upper-arm': -20, forearm: -84, hand: 0, 'upper-leg': 58, 'lower-leg': -82 }
            },
            {
                key: 'write-seated-side',
                name: 'Write (Seated)',
                icon: 'fa-pen',
                category: 'Daily Activities',
                description: 'Side-view seated writing pose with a small forearm stroke and steady base posture.',
                angles: { torso: 5, head: -8, 'upper-arm': -12, forearm: -66, hand: 0, 'upper-leg': 58, 'lower-leg': -82 }
            },
            {
                key: 'type-seated-side',
                name: 'Type (Seated)',
                icon: 'fa-keyboard',
                category: 'Daily Activities',
                description: 'Side-view seated typing pose with the hands close to the keyboard in a stable working posture.',
                angles: { torso: 3, head: -6, 'upper-arm': -18, forearm: -74, hand: 4, 'upper-leg': 58, 'lower-leg': -82 }
            },
            {
                key: 'look-up-side',
                name: 'Look Up',
                icon: 'fa-eye',
                category: 'Gestures',
                description: 'Side-view upward gaze pose.',
                angles: { head: -24, torso: -6, 'upper-arm': -6, forearm: 12 }
            },
            {
                key: 'look-down-side',
                name: 'Look Down',
                icon: 'fa-eye-low-vision',
                category: 'Gestures',
                description: 'Side-view downward gaze pose.',
                angles: { head: 18, torso: 6, 'upper-arm': 2, forearm: 18 }
            },
            {
                key: 'brace-side',
                name: 'Brace',
                icon: 'fa-shield',
                category: 'Action',
                description: 'Side-view braced action pose.',
                angles: { torso: 10, 'upper-arm': 18, forearm: -72, hand: -6, 'upper-leg': 18, 'lower-leg': -24, foot: 8 }
            },
            {
                key: 'sneak-ready-side',
                name: 'Sneak Ready',
                icon: 'fa-user-secret',
                category: 'Locomotion',
                description: 'Side-view ready-to-sneak stance.',
                angles: { torso: 8, 'upper-arm': -10, forearm: 24, 'upper-leg': 20, 'lower-leg': -32, foot: -10, head: 4 }
            },
            {
                key: 'celebrate-side',
                name: 'Celebrate',
                icon: 'fa-hands-clapping',
                category: 'Action',
                description: 'Side-view celebratory lifted arm pose.',
                angles: { 'upper-arm': -84, forearm: 44, hand: 14, torso: -4, head: -4 }
            }
        ];

        poseDefs.forEach(def => {
            const converted = JointSystem._convertHumanSideAnglesToArmaturePoseData(def.angles || {});
            catalog[def.key] = {
                name: def.name,
                icon: def.icon || 'fa-person-walking',
                category: def.category || 'Other',
                description: def.description || '',
                jointAngles: converted.jointAngles,
                partAngles: converted.partAngles
            };
            if (def.contacts && Object.keys(def.contacts).length) {
                catalog[def.key].contacts = Utils.deepClone(def.contacts);
            }
            JointSystem._copyArmatureLayerOverrideFields(catalog[def.key], def);
        });

        JointSystem._applyDefaultArmaturePoseCompatibility(catalog, ['side']);
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._addHandgunViewPresets(catalog, 'side');
        JointSystem._humanSideArmaturePoseCatalog = catalog;
        return catalog;
    }

JointSystem._buildHumanSideArmatureMovementCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (
            JointSystem._humanSideArmatureMovementCatalog
            && !JointSystem._shouldRebuildHumanSideArmatureMovementCatalog(JointSystem._humanSideArmatureMovementCatalog)
        ) {
            return JointSystem._humanSideArmatureMovementCatalog;
        }

        const catalog = {};
        const sideMoves = JointMovements.getAll().filter(move =>
            Array.isArray(move?.presetKeys) && move.presetKeys.includes('human-side')
        );

        sideMoves.forEach(move => {
            const key = JointSystem._slugifyArmatureCatalogKey(String(move.key || move.name || 'move').replace(/^hs-/, ''), 'move');
            catalog[key] = {
                name: move.name,
                icon: move.icon || 'fa-play',
                category: move.category || 'Other',
                description: move.description || '',
                duration: move.duration || 1000,
                repeat: move.repeat ?? 1,
                ...(Array.isArray(move.viewCompatibility) ? { viewCompatibility: [...move.viewCompatibility] } : {}),
                ...(move.semanticAction ? { semanticAction: move.semanticAction } : {}),
                ...(move.semanticFamily ? { semanticFamily: move.semanticFamily } : {}),
                ...(move.motionIntent ? { motionIntent: move.motionIntent } : {}),
                ...(move.authoringConvention ? { authoringConvention: move.authoringConvention } : {}),
                ...(move.rootTravel && typeof move.rootTravel === 'object' ? { rootTravel: Utils.deepClone(move.rootTravel) } : {}),
                ...(typeof move.absoluteTravel === 'boolean' ? { absoluteTravel: move.absoluteTravel } : {}),
                contacts: Utils.deepClone(move.contacts || {}),
                keyframes: (move.keyframes || []).map(kf => {
                    const converted = JointSystem._convertHumanSideAnglesToArmaturePoseData(kf.angles || {});
                    const result = { t: kf.t };
                    if (Object.keys(converted.jointAngles).length) result.jointAngles = converted.jointAngles;
                    if (Object.keys(converted.partAngles).length) result.partAngles = converted.partAngles;
                    if (typeof kf.dx === 'number') result.dx = kf.dx;
                    else if (typeof kf?.offsets?.torso?.x === 'number') result.dx = kf.offsets.torso.x;
                    if (typeof kf.dy === 'number') result.dy = kf.dy;
                    else if (typeof kf?.offsets?.torso?.y === 'number') result.dy = kf.offsets.torso.y;
                    if (kf.contacts && Object.keys(kf.contacts).length) result.contacts = Utils.deepClone(kf.contacts);
                    JointSystem._copyArmatureLayerOverrideFields(result, kf);
                    return result;
                })
            };
        });

        const extraMoves = {
            'idle-breathe': {
                name: 'Idle Breathe',
                icon: 'fa-wind',
                category: 'Standing',
                description: 'Subtle side-view breathing loop.',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: {} },
                    { t: 0.35, angles: { head: -2, 'upper-arm': -4, torso: -2 } },
                    { t: 0.65, angles: { head: -2, 'upper-arm': -4, torso: -2 } },
                    { t: 1.00, angles: {} }
                ]
            },
            'wave': {
                name: 'Wave',
                icon: 'fa-hand-peace',
                category: 'Gestures',
                description: 'Side-view waving loop.',
                duration: 1400,
                repeat: 3,
                keyframes: [
                    { t: 0.00, angles: { 'upper-arm': -68, forearm: 42, hand: 8 } },
                    { t: 0.30, angles: { 'upper-arm': -72, forearm: 48, hand: 16 } },
                    { t: 0.55, angles: { 'upper-arm': -72, forearm: 48, hand: -16 } },
                    { t: 0.78, angles: { 'upper-arm': -72, forearm: 48, hand: 16 } },
                    { t: 1.00, angles: { 'upper-arm': -68, forearm: 42, hand: 8 } }
                ]
            },
            'present-explain': {
                name: 'Present / Explain',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Side-view explaining gesture with the visible arm opening forward and returning to a relaxed speaking pose.',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 1, head: 2, 'upper-arm': 18, forearm: -58, hand: -4 } },
                    { t: 0.24, angles: { torso: 3, head: 1, 'upper-arm': -10, forearm: -78, hand: -10 } },
                    { t: 0.52, angles: { torso: -2, head: 3, 'upper-arm': -22, forearm: -66, hand: 8 } },
                    { t: 0.78, angles: { torso: 2, head: 2, 'upper-arm': -6, forearm: -76, hand: -6 } },
                    { t: 1.00, angles: { torso: 1, head: 2, 'upper-arm': 18, forearm: -58, hand: -4 } }
                ]
            },
            'present-explain-alternate': {
                name: 'Present / Explain - Alternate',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Side-view explain loop alternating between visible-hand presentation and relaxed listening beats.',
                duration: 2400,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -18, hand: 0 } },
                    { t: 0.20, angles: { torso: 3, head: 1, 'upper-arm': -12, forearm: -76, hand: -8 } },
                    { t: 0.38, angles: { torso: -2, head: 3, 'upper-arm': -24, forearm: -64, hand: 10 } },
                    { t: 0.55, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -18, hand: 0 } },
                    { t: 0.76, angles: { torso: 2, head: -2, 'upper-arm': 26, forearm: -44, hand: 6 } },
                    { t: 1.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -18, hand: 0 } }
                ]
            },
            'walk-to-point-and-back': {
                name: 'Walk to Point and Back',
                icon: 'fa-person-walking-arrow-loop-left',
                category: 'Travel',
                description: 'A side-view turn-around: walk forward to a target, turn to face the other way, then walk back to the start. Set a Movement Blend X distance for the exact reach. (Turn-around plays live; timeline records the forward walk.)',
                duration: 3200,
                repeat: 1,
                turnAround: true,
                turnAroundForwardKey: 'walk-to-point-and-back',
                turnAroundReturnKey: 'walk-to-point-and-back',
                rootTravel: { x: 176 },
                absoluteTravel: false,
                keyframes: [
                    { t: 0.000, dx: 0, angles: { torso: 1, head: 0, 'upper-arm': -22, forearm: 20, 'upper-leg': 24, 'lower-leg': -28, foot: 6 } },
                    { t: 0.125, dx: 22, angles: { torso: 2, head: 0, 'upper-arm': 8, forearm: 10, 'upper-leg': 8, 'lower-leg': -10, foot: -4 } },
                    { t: 0.250, dx: 44, angles: { torso: 1, head: 0, 'upper-arm': 22, forearm: 20, 'upper-leg': -24, 'lower-leg': -28, foot: -8 } },
                    { t: 0.375, dx: 66, angles: { torso: 2, head: 0, 'upper-arm': 8, forearm: 10, 'upper-leg': 8, 'lower-leg': -10, foot: -4 } },
                    { t: 0.500, dx: 88, angles: { torso: 1, head: 0, 'upper-arm': -22, forearm: 20, 'upper-leg': 24, 'lower-leg': -28, foot: 6 } },
                    { t: 0.625, dx: 110, angles: { torso: 2, head: 0, 'upper-arm': 8, forearm: 10, 'upper-leg': 8, 'lower-leg': -10, foot: -4 } },
                    { t: 0.750, dx: 132, angles: { torso: 1, head: 0, 'upper-arm': 22, forearm: 20, 'upper-leg': -24, 'lower-leg': -28, foot: -8 } },
                    { t: 0.875, dx: 154, angles: { torso: 2, head: 0, 'upper-arm': 8, forearm: 10, 'upper-leg': 8, 'lower-leg': -10, foot: -4 } },
                    { t: 1.000, dx: 176, angles: { torso: 1, head: 0, 'upper-arm': -22, forearm: 20, 'upper-leg': 24, 'lower-leg': -28, foot: 6 } }
                ]
            },
            'walk-cycle-compare-loop': {
                name: 'Walk Cycle (Loop Compare)',
                icon: 'fa-repeat',
                category: 'Travel',
                description: 'Single looping side-view walk cycle that advances forward a few strides for comparison against the walk-to-point travel preset.',
                duration: 1800,
                repeat: 4,
                keyframes: [
                    { t: 0.00, dx: 0, angles: { torso: 2, head: 0, 'upper-arm': -20, forearm: 14, 'upper-leg': 34, 'lower-leg': -18, foot: 8 } },
                    { t: 0.25, dx: 13, angles: { torso: 3, head: 0, 'upper-arm': 8, forearm: 6, 'upper-leg': 6, 'lower-leg': -8, foot: 0 } },
                    { t: 0.50, dx: 26, angles: { torso: 2, head: 0, 'upper-arm': 20, forearm: 14, 'upper-leg': -34, 'lower-leg': -18, foot: -8 } },
                    { t: 0.75, dx: 39, angles: { torso: 3, head: 0, 'upper-arm': -8, forearm: 6, 'upper-leg': 6, 'lower-leg': -8, foot: 0 } },
                    { t: 1.00, dx: 52, angles: { torso: 2, head: 0, 'upper-arm': -20, forearm: 14, 'upper-leg': 34, 'lower-leg': -18, foot: 8 } }
                ]
            },
            'turn-around-flip': {
                name: 'Turn Around (Flip)',
                icon: 'fa-arrows-left-right',
                category: 'Travel',
                description: 'Turn to face the opposite direction in place. Play or record it on its own between walk cycles: walk out with a walk cycle, turn around, then walk back any distance with another walk cycle.',
                duration: 420,
                repeat: 1,
                flipInPlace: true,
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.FLIP,
                semanticFamily: 'orientation',
                motionIntent: 'view-orientation transition',
                authoringConvention: JointSystem.ARMATURE_ANATOMY_CONVENTIONS.rotation,
                keyframes: [
                    { t: 0, angles: {} },
                    { t: 1, angles: {} }
                ]
            },
            'listen-agree': {
                name: 'Listen / Agree',
                icon: 'fa-head-side-virus',
                category: 'Communication',
                description: 'Side-view nodding agreement with small hand and torso shifts.',
                duration: 1600,
                repeat: 3,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: 0, 'upper-arm': 2, forearm: -10 } },
                    { t: 0.22, angles: { torso: 2, head: 9, 'upper-arm': -4, forearm: -16 } },
                    { t: 0.46, angles: { torso: 0, head: -3, 'upper-arm': 2, forearm: -10 } },
                    { t: 0.68, angles: { torso: -2, head: 7, 'upper-arm': 6, forearm: -14 } },
                    { t: 1.00, angles: { torso: 0, head: 0, 'upper-arm': 2, forearm: -10 } }
                ]
            },
            'call-attention': {
                name: 'Call Attention',
                icon: 'fa-hand',
                category: 'Communication',
                description: 'Side-view attention-getting raised-hand gesture.',
                duration: 1300,
                repeat: 2,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -10, hand: 0 } },
                    { t: 0.22, angles: { torso: -2, head: -3, 'upper-arm': -90, forearm: -52, hand: 12 } },
                    { t: 0.42, angles: { torso: -2, head: -3, 'upper-arm': -98, forearm: -40, hand: -14 } },
                    { t: 0.62, angles: { torso: -2, head: -3, 'upper-arm': -90, forearm: -52, hand: 12 } },
                    { t: 1.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -10, hand: 0 } }
                ]
            },
            'phone-call-loop': {
                name: 'Phone Call / Listening',
                icon: 'fa-phone',
                category: 'Communication',
                description: 'Side-view phone listening loop that holds beside the ear instead of in front of the mouth.',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: 0, 'upper-arm': -85, forearm: -140, hand: 0 }, contacts: { 'hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } } },
                    { t: 0.30, angles: { torso: 0, head: -1, 'upper-arm': -88, forearm: -136, hand: 3 }, contacts: { 'hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } } },
                    { t: 0.64, angles: { torso: 0, head: 1, 'upper-arm': -82, forearm: -144, hand: -2 }, contacts: { 'hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } } },
                    { t: 1.00, angles: { torso: 0, head: 0, 'upper-arm': -85, forearm: -140, hand: 0 }, contacts: { 'hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } } }
                ]
            },
            'phone-call-pre-ear-loop': {
                name: 'Phone Call / Pre-Ear',
                icon: 'fa-phone-volume',
                category: 'Communication',
                description: 'Side-view near-ear prep loop that stays just off the ear.',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: -2, 'upper-arm': -68, forearm: -118, hand: 4 }, contacts: { 'hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } } },
                    { t: 0.34, angles: { torso: 0, head: -3, 'upper-arm': -72, forearm: -114, hand: 6 }, contacts: { 'hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } } },
                    { t: 0.70, angles: { torso: 0, head: -1, 'upper-arm': -64, forearm: -122, hand: 2 }, contacts: { 'hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } } },
                    { t: 1.00, angles: { torso: 0, head: -2, 'upper-arm': -68, forearm: -118, hand: 4 }, contacts: { 'hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } } }
                ]
            },
            'microphone-talk': {
                name: 'Microphone Talk',
                icon: 'fa-microphone',
                category: 'Communication',
                description: 'Side-view microphone talk loop with the hand centered on the mouth path.',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: 2, 'upper-arm': -34, forearm: -150, hand: -2 }, contacts: { 'hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } } },
                    { t: 0.28, angles: { torso: 0, head: 4, 'upper-arm': -38, forearm: -154, hand: 2 }, contacts: { 'hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } } },
                    { t: 0.60, angles: { torso: 0, head: 1, 'upper-arm': -30, forearm: -146, hand: -4 }, contacts: { 'hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } } },
                    { t: 1.00, angles: { torso: 0, head: 2, 'upper-arm': -34, forearm: -150, hand: -2 }, contacts: { 'hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } } }
                ]
            },
            'read-book-seated': {
                name: 'Read Book (Seated)',
                icon: 'fa-book-open',
                category: 'Daily Activities',
                description: 'Side-view reading loop with the elbows folded inward for a seated posture.',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 4, head: -6, 'upper-arm': -24, forearm: -90, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.34, angles: { torso: 5, head: -8, 'upper-arm': -30, forearm: -94, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.66, angles: { torso: 3, head: -5, 'upper-arm': -20, forearm: -86, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 1.00, angles: { torso: 4, head: -6, 'upper-arm': -24, forearm: -90, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } }
                ]
            },
            'write-seated': {
                name: 'Write (Seated)',
                icon: 'fa-pen',
                category: 'Daily Activities',
                description: 'Side-view writing loop with one hand working while the other keeps the page stable.',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 5, head: -8, 'upper-arm': -12, forearm: -66, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.25, angles: { torso: 5, head: -8, 'upper-arm': -10, forearm: -72, hand: 10, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.50, angles: { torso: 4, head: -7, 'upper-arm': -16, forearm: -70, hand: -6, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.75, angles: { torso: 5, head: -8, 'upper-arm': -10, forearm: -72, hand: 10, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 1.00, angles: { torso: 5, head: -8, 'upper-arm': -12, forearm: -66, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } }
                ]
            },
            'type-seated': {
                name: 'Type (Seated)',
                icon: 'fa-keyboard',
                category: 'Daily Activities',
                description: 'Side-view typing loop with alternating wrist taps close to the keyboard.',
                duration: 1200,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 3, head: -6, 'upper-arm': -20, forearm: -74, hand: 2, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.25, angles: { torso: 3, head: -6, 'upper-arm': -18, forearm: -68, hand: -6, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.50, angles: { torso: 2, head: -5, 'upper-arm': -22, forearm: -80, hand: 8, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.75, angles: { torso: 3, head: -6, 'upper-arm': -18, forearm: -68, hand: -6, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 1.00, angles: { torso: 3, head: -6, 'upper-arm': -20, forearm: -74, hand: 2, 'upper-leg': 58, 'lower-leg': -82 } }
                ]
            },
            'read-book-side-seated': {
                name: 'Read Book (Seated)',
                icon: 'fa-book-open',
                category: 'Daily Activities',
                description: 'Side-view reading loop with the elbows folded inward for a seated posture.',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 4, head: -6, 'upper-arm': -24, forearm: -90, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.34, angles: { torso: 5, head: -8, 'upper-arm': -30, forearm: -94, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.66, angles: { torso: 3, head: -5, 'upper-arm': -20, forearm: -86, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 1.00, angles: { torso: 4, head: -6, 'upper-arm': -24, forearm: -90, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } }
                ]
            },
            'write-side-seated': {
                name: 'Write (Seated)',
                icon: 'fa-pen',
                category: 'Daily Activities',
                description: 'Side-view writing loop with one hand working while the other keeps the page stable.',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 5, head: -8, 'upper-arm': -12, forearm: -66, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.25, angles: { torso: 5, head: -8, 'upper-arm': -10, forearm: -72, hand: 10, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.50, angles: { torso: 4, head: -7, 'upper-arm': -16, forearm: -70, hand: -6, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.75, angles: { torso: 5, head: -8, 'upper-arm': -10, forearm: -72, hand: 10, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 1.00, angles: { torso: 5, head: -8, 'upper-arm': -12, forearm: -66, hand: 0, 'upper-leg': 58, 'lower-leg': -82 } }
                ]
            },
            'type-side-seated': {
                name: 'Type (Seated)',
                icon: 'fa-keyboard',
                category: 'Daily Activities',
                description: 'Side-view typing loop with alternating wrist taps close to the keyboard.',
                duration: 1200,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { torso: 3, head: -6, 'upper-arm': -20, forearm: -74, hand: 2, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.25, angles: { torso: 3, head: -6, 'upper-arm': -18, forearm: -68, hand: -6, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.50, angles: { torso: 2, head: -5, 'upper-arm': -22, forearm: -80, hand: 8, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 0.75, angles: { torso: 3, head: -6, 'upper-arm': -18, forearm: -68, hand: -6, 'upper-leg': 58, 'lower-leg': -82 } },
                    { t: 1.00, angles: { torso: 3, head: -6, 'upper-arm': -20, forearm: -74, hand: 2, 'upper-leg': 58, 'lower-leg': -82 } }
                ]
            },
            'pick-up-drop-side': {
                name: 'Pick Up / Drop Object',
                icon: 'fa-hand-holding',
                category: 'Daily Activities',
                description: 'Side-view pick-up using the front arm, a strong waist fold, and a planted front-leg squat.',
                duration: 2100,
                repeat: 1,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -8, hand: 0, 'upper-leg': 0, 'lower-leg': 0, foot: 0 } },
                    { t: 0.18, angles: { torso: 28, head: 0, 'upper-arm': -22, forearm: -4, hand: 0, 'upper-leg': -18, 'lower-leg': 26, foot: 0 } },
                    { t: 0.36, angles: { torso: 68, head: 0, 'upper-arm': -68, forearm: 0, hand: 0, 'upper-leg': -42, 'lower-leg': 62, foot: 0 } },
                    { t: 0.52, angles: { torso: 95, head: 0, 'upper-arm': -95, forearm: 0, hand: 0, 'upper-leg': -55, 'lower-leg': 80, foot: 0 } },
                    { t: 0.66, angles: { torso: 88, head: 0, 'upper-arm': -68, forearm: -42, hand: -6, 'upper-leg': -55, 'lower-leg': 80, foot: 0 } },
                    { t: 0.82, angles: { torso: 34, head: 0, 'upper-arm': -18, forearm: -30, hand: -4, 'upper-leg': -24, 'lower-leg': 36, foot: 0 } },
                    { t: 1.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -8, hand: 0, 'upper-leg': 0, 'lower-leg': 0, foot: 0 } }
                ]
            },
            'sit-stand-side': {
                name: 'Sit Down / Stand Up',
                icon: 'fa-chair',
                category: 'Daily Activities',
                description: 'Side-view transition from standing to chair sitting and back to standing.',
                duration: 2200,
                repeat: 1,
                keyframes: [
                    { t: 0.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -8, hand: 0, 'upper-leg': 0, 'lower-leg': 0, foot: 0 } },
                    { t: 0.22, dy: 18, angles: { torso: 12, head: -6, 'upper-arm': 12, forearm: -24, hand: 0, 'upper-leg': -34, 'lower-leg': 58, foot: 0 } },
                    { t: 0.44, dy: 42, angles: { torso: 6, head: -4, 'upper-arm': 8, forearm: -28, hand: 0, 'upper-leg': -90, 'lower-leg': 90, foot: 0 } },
                    { t: 0.62, dy: 42, angles: { torso: 6, head: -4, 'upper-arm': 8, forearm: -28, hand: 0, 'upper-leg': -90, 'lower-leg': 90, foot: 0 } },
                    { t: 0.82, dy: 18, angles: { torso: 12, head: -6, 'upper-arm': 12, forearm: -24, hand: 0, 'upper-leg': -34, 'lower-leg': 58, foot: 0 } },
                    { t: 1.00, angles: { torso: 0, head: 0, 'upper-arm': 4, forearm: -8, hand: 0, 'upper-leg': 0, 'lower-leg': 0, foot: 0 } }
                ]
            },
            'guard-bob': {
                name: 'Guard Bob',
                icon: 'fa-shield-halved',
                category: 'Action',
                description: 'Side-view boxing guard with a subtle bob.',
                duration: 900,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, dy: 0, angles: { 'upper-arm': 24, forearm: -112, hand: -4, 'upper-leg': 10, 'lower-leg': -12, torso: 4 } },
                    { t: 0.25, dy: -6, angles: { 'upper-arm': 28, forearm: -118, hand: -4, 'upper-leg': 12, 'lower-leg': -16, torso: 6 } },
                    { t: 0.50, dy: 0, angles: { 'upper-arm': 22, forearm: -108, hand: -2, 'upper-leg': 8, 'lower-leg': -10, torso: 3 } },
                    { t: 0.75, dy: -4, angles: { 'upper-arm': 26, forearm: -116, hand: -4, 'upper-leg': 11, 'lower-leg': -15, torso: 5 } },
                    { t: 1.00, dy: 0, angles: { 'upper-arm': 24, forearm: -112, hand: -4, 'upper-leg': 10, 'lower-leg': -12, torso: 4 } }
                ]
            },
            'tip-toe-sneak': {
                name: 'Tip-Toe Sneak',
                icon: 'fa-user-secret',
                category: 'Locomotion',
                description: 'Side-view sneaking locomotion with a light bounce.',
                duration: 1600,
                repeat: 4,
                keyframes: [
                    { t: 0.00, dy: 8, angles: { 'upper-arm': -12, forearm: 24, 'upper-leg': 14, 'lower-leg': -24, foot: -18, torso: 2 } },
                    { t: 0.25, dy: 12, angles: { 'upper-arm': 12, forearm: 16, 'upper-leg': -8, 'lower-leg': -14, foot: -22, torso: 4 } },
                    { t: 0.50, dy: 8, angles: { 'upper-arm': -12, forearm: 24, 'upper-leg': 14, 'lower-leg': -24, foot: -18, torso: 2 } },
                    { t: 0.75, dy: 12, angles: { 'upper-arm': 12, forearm: 16, 'upper-leg': -8, 'lower-leg': -14, foot: -22, torso: 4 } },
                    { t: 1.00, dy: 8, angles: { 'upper-arm': -12, forearm: 24, 'upper-leg': 14, 'lower-leg': -24, foot: -18, torso: 2 } }
                ]
            },
            'walk-cycle': {
                name: 'Walk Cycle',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Looping side-view walk cycle.',
                duration: 1400,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, dy: 4, angles: { 'upper-arm': -22, forearm: 20, 'upper-leg': 24, 'lower-leg': -28, foot: 6, torso: 1 } },
                    { t: 0.25, dy: 0, angles: { 'upper-arm': 8, forearm: 10, 'upper-leg': -8, 'lower-leg': -10, foot: -4, torso: 3 } },
                    { t: 0.50, dy: 4, angles: { 'upper-arm': 22, forearm: 20, 'upper-leg': -24, 'lower-leg': -28, foot: -8, torso: 1 } },
                    { t: 0.75, dy: 0, angles: { 'upper-arm': -8, forearm: 10, 'upper-leg': 8, 'lower-leg': -10, foot: 2, torso: 3 } },
                    { t: 1.00, dy: 4, angles: { 'upper-arm': -22, forearm: 20, 'upper-leg': 24, 'lower-leg': -28, foot: 6, torso: 1 } }
                ]
            },
            'run-cycle': {
                name: 'Run Cycle',
                icon: 'fa-person-running',
                category: 'Locomotion',
                description: 'Looping side-view run cycle.',
                duration: 900,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, dy: -6, angles: { 'upper-arm': -48, forearm: 72, 'upper-leg': 52, 'lower-leg': -68, foot: 12, torso: -4 } },
                    { t: 0.25, dy: 0, angles: { 'upper-arm': 10, forearm: 18, 'upper-leg': -10, 'lower-leg': -18, foot: -4, torso: 4 } },
                    { t: 0.50, dy: -8, angles: { 'upper-arm': 42, forearm: 34, 'upper-leg': -48, 'lower-leg': -58, foot: -10, torso: -2 } },
                    { t: 0.75, dy: 0, angles: { 'upper-arm': -12, forearm: 18, 'upper-leg': 12, 'lower-leg': -18, foot: 4, torso: 4 } },
                    { t: 1.00, dy: -6, angles: { 'upper-arm': -48, forearm: 72, 'upper-leg': 52, 'lower-leg': -68, foot: 12, torso: -4 } }
                ]
            },
            'look-around': {
                name: 'Look Around',
                icon: 'fa-eye',
                category: 'Gestures',
                description: 'Side-view head scan using only the head/neck chain.',
                duration: 1800,
                repeat: 2,
                keyframes: [
                    { t: 0.00, angles: { head: 2 } },
                    { t: 0.30, angles: { head: -14 } },
                    { t: 0.65, angles: { head: 10 } },
                    { t: 1.00, angles: { head: 2 } }
                ]
            },
            'sway-side': {
                name: 'Sway Side',
                icon: 'fa-arrows-left-right',
                category: 'Standing',
                description: 'Gentle side-view sway loop.',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, dy: 0, angles: { torso: -3, head: -2, 'upper-arm': -6, forearm: 18 } },
                    { t: 0.50, dy: -4, angles: { torso: 4, head: 3, 'upper-arm': 6, forearm: 10 } },
                    { t: 1.00, dy: 0, angles: { torso: -3, head: -2, 'upper-arm': -6, forearm: 18 } }
                ]
            },
            'fidget-side': {
                name: 'Fidget',
                icon: 'fa-person-circle-question',
                category: 'Standing',
                description: 'Restless side-view fidget loop.',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    { t: 0.00, angles: { head: -2, torso: 0, 'upper-arm': -6, forearm: 18 } },
                    { t: 0.25, angles: { head: 4, torso: 3, 'upper-arm': 10, forearm: -30, hand: 10 } },
                    { t: 0.55, angles: { head: -6, torso: -2, 'upper-arm': -14, forearm: 30, hand: -8 } },
                    { t: 1.00, angles: { head: -2, torso: 0, 'upper-arm': -6, forearm: 18 } }
                ]
            },
            'march-side': {
                name: 'March',
                icon: 'fa-person-military-pointing',
                category: 'Locomotion',
                description: 'Side-view marching loop.',
                duration: 1200,
                repeat: 4,
                keyframes: [
                    { t: 0.00, dy: 0, angles: { 'upper-arm': -20, forearm: 14, 'upper-leg': 34, 'lower-leg': -18, foot: 8, torso: 2 } },
                    { t: 0.25, dy: -4, angles: { 'upper-arm': 8, forearm: 6, 'upper-leg': 6, 'lower-leg': -8, foot: 0, torso: 3 } },
                    { t: 0.50, dy: 0, angles: { 'upper-arm': 20, forearm: 14, 'upper-leg': -34, 'lower-leg': -18, foot: -8, torso: 2 } },
                    { t: 0.75, dy: -4, angles: { 'upper-arm': -8, forearm: 6, 'upper-leg': -6, 'lower-leg': -8, foot: 0, torso: 3 } },
                    { t: 1.00, dy: 0, angles: { 'upper-arm': -20, forearm: 14, 'upper-leg': 34, 'lower-leg': -18, foot: 8, torso: 2 } }
                ]
            },
            'punch-side-loop': {
                name: 'Punch Drill',
                icon: 'fa-fist-raised',
                category: 'Action',
                description: 'Side-view repeated punch action.',
                duration: 1000,
                repeat: 3,
                keyframes: [
                    { t: 0.00, angles: { 'upper-arm': 10, forearm: -34, hand: 0, torso: 2 } },
                    { t: 0.35, angles: { 'upper-arm': 6, forearm: 8, hand: 0, torso: 10 } },
                    { t: 0.55, angles: { 'upper-arm': 2, forearm: 2, hand: 0, torso: 12 } },
                    { t: 1.00, angles: { 'upper-arm': 10, forearm: -34, hand: 0, torso: 2 } }
                ]
            },
            'kick-side-loop': {
                name: 'Kick Drill',
                icon: 'fa-shoe-prints',
                category: 'Action',
                description: 'Side-view repeated front kick action.',
                duration: 1100,
                repeat: 3,
                keyframes: [
                    { t: 0.00, angles: { 'upper-leg': 6, 'lower-leg': -12, foot: 0, torso: 2, 'upper-arm': -12, forearm: 20 } },
                    { t: 0.35, angles: { 'upper-leg': 52, 'lower-leg': 2, foot: 8, torso: 8, 'upper-arm': -18, forearm: 26 } },
                    { t: 0.60, angles: { 'upper-leg': 62, 'lower-leg': -6, foot: 14, torso: 10, 'upper-arm': -20, forearm: 28 } },
                    { t: 1.00, angles: { 'upper-leg': 6, 'lower-leg': -12, foot: 0, torso: 2, 'upper-arm': -12, forearm: 20 } }
                ]
            }
        };

        Object.entries(extraMoves).forEach(([key, move]) => {
            if (catalog[key]) return;
            catalog[key] = {
                ...JointSystem._cloneArmatureCatalogEntry(move),
                keyframes: (move.keyframes || []).map(kf => {
                    const converted = JointSystem._convertHumanSideAnglesToArmaturePoseData(kf.angles || {});
                    const result = { t: kf.t };
                    if (typeof kf.dx === 'number') result.dx = kf.dx;
                    if (typeof kf.dy === 'number') result.dy = kf.dy;
                    if (Object.keys(converted.jointAngles).length) result.jointAngles = converted.jointAngles;
                    if (Object.keys(converted.partAngles).length) result.partAngles = converted.partAngles;
                    if (kf.contacts && Object.keys(kf.contacts).length) result.contacts = Utils.deepClone(kf.contacts);
                    JointSystem._copyArmatureLayerOverrideFields(result, kf);
                    return result;
                })
            };
        });

        JointSystem._addHumanSideHeadMovements(catalog, ['side']);
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._refineDeskHandMovements(catalog, 'side');
        JointSystem._addHandgunViewPresets(catalog, 'side', true);
        JointSystem._addScenarioMovements(catalog, 'side');
        JointSystem._humanSideArmatureMovementCatalog = JointSystem._finalizeHumanSideArmatureMovementCatalog(catalog);
        return catalog;
    }

JointSystem._buildSideCarryTrayContacts = function() {
    return Object.fromEntries(['front-hand', 'back-hand'].map((hand, i) => [hand, {
        targetPart: 'torso', x: .5, y: .675, offsetXRatio: i ? -.48 : -.24, mirrorSide: true,
        palmGrip: .45, keepElbowDown: true, wristLimit: 15, iterations: 48
    }]));
};

JointSystem._buildHumanSideDualArmState = function(spec = {}) {
        const jointAngles = {};
        const partAngles = {};
        const set = (jointName, value) => {
            if (!Number.isFinite(value) || !jointName) return;
            jointAngles[jointName] = value;
        };

        set('front-shoulder', spec.frontShoulder);
        set('front-elbow', spec.frontElbow);
        set('front-wrist', spec.frontWrist);
        set('back-shoulder', spec.backShoulder);
        set('back-elbow', spec.backElbow);
        set('back-wrist', spec.backWrist);

        set('front-hip', spec.frontHip);
        set('front-knee', spec.frontKnee);
        set('front-ankle', spec.frontAnkle);
        set('back-hip', spec.backHip);
        set('back-knee', spec.backKnee);
        set('back-ankle', spec.backAnkle);
        set('waist', Number.isFinite(spec.waistJoint) ? spec.waistJoint : spec.waist);

        const neckAngle = Number.isFinite(spec.neck) ? spec.neck : spec.head;
        set('neck', neckAngle);

        const torsoAngle = Number.isFinite(spec.torso) ? spec.torso : null;
        const headNeckAngle = Number.isFinite(spec.headNeck) ? spec.headNeck : null;

        // In the six-piece side rig, guide "waist" and "neck" values belong to
        // the actual bottom-top joints. Only explicit torso/head-neck overrides
        // should rotate the rigid artwork containers.
        if (Number.isFinite(torsoAngle)) {
            partAngles.torso = torsoAngle;
        }
        if (Number.isFinite(headNeckAngle)) {
            partAngles['head-neck'] = headNeckAngle;
        }

        return { jointAngles, partAngles };
    }

JointSystem._invertArmatureNumericMap = function(map = {}) {
        const result = {};
        Object.entries(map || {}).forEach(([key, value]) => {
            if (Number.isFinite(value)) {
                result[key] = -value;
            }
        });
        return result;
    }

JointSystem._cloneArmatureTiltMap = function(map = {}) {
        const result = {};
        Object.entries(map || {}).forEach(([key, tilt]) => {
            result[key] = {
                x: Number.isFinite(tilt?.x) ? tilt.x : 0,
                y: Number.isFinite(tilt?.y) ? tilt.y : 0
            };
        });
        return result;
    }

JointSystem._mirrorSideDualArmTiltMapForFacing = function(map = {}) {
        const result = {};
        Object.entries(map || {}).forEach(([key, tilt]) => {
            result[key] = {
                x: Number.isFinite(tilt?.x) ? tilt.x : 0,
                y: Number.isFinite(tilt?.y) ? -tilt.y : 0
            };
        });
        return result;
    }

JointSystem._makeRightFacingSideText = function(text = '') {
        return String(text || '')
            .replace(/\bleft-facing\b/gi, 'right-facing')
            .replace(/\bleft facing\b/gi, 'right facing')
            .replace(/\(Left\)/g, '(Right)')
            .replace(/\bLeft\b/g, 'Right');
    }

JointSystem._buildHumanSideDualArmaturePoseCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (JointSystem._humanSideDualArmaturePoseCatalog) {
            return JointSystem._humanSideDualArmaturePoseCatalog;
        }

        const lookAroundJointTilts = {};
        const lookAroundPartTilts = {
            'head-neck': { x: 3, y: 8 }
        };
        const lookDownPartTilts = {
            'head-neck': { x: -10, y: 0 }
        };
        const twistAwayJointTilts = { waist: { x: 0, y: -12 } };
        const twistAwayPartTilts = {
            torso: { x: 0, y: -15 },
            'head-neck': { x: 0, y: -25 }
        };
        const twistTowardJointTilts = { waist: { x: 0, y: 12 } };
        const twistTowardPartTilts = {
            torso: { x: 0, y: 15 },
            'head-neck': { x: 0, y: 25 }
        };
        const tennisPrepJointTilts = { waist: { x: 0, y: -8 } };
        const tennisPrepPartTilts = {
            torso: { x: 0, y: -10 },
            'head-neck': { x: 0, y: -8 }
        };

        const poseDefs = [
            { key: 'idle', name: 'Idle (Neutral)', icon: 'fa-person', category: 'Locomotion', description: 'Neutral left-facing baseline for the six-piece side rig.', state: { waist: 0, neck: 0, frontShoulder: 0, frontElbow: 0, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 } },
            { key: 'walk-cycle-mid', name: 'Walk Cycle (Mid)', icon: 'fa-person-walking', category: 'Locomotion', description: 'Mid-stride walk pose for the default left-facing side rig.', state: { waist: 5, neck: 5, frontShoulder: 30, frontElbow: -10, backShoulder: -30, backElbow: -15, frontHip: -35, frontKnee: 10, backHip: 35, backKnee: 20 } },
            { key: 'run-cycle-mid', name: 'Run Cycle (Mid)', icon: 'fa-person-running', category: 'Locomotion', description: 'Mid-stride run pose with stronger forward lean and wider opposition.', state: { waist: 15, neck: 10, frontShoulder: 52, frontElbow: -28, backShoulder: -58, backElbow: -42, frontHip: -70, frontKnee: 45, backHip: 60, backKnee: 90 } },
            { key: 'sneak-crouch', name: 'Sneak / Crouch', icon: 'fa-user-secret', category: 'Locomotion', description: 'Low sneaking stance with alternating shoulders and compressed knees.', state: { waist: 25, neck: -15, frontShoulder: 20, frontElbow: -40, backShoulder: -30, backElbow: -20, frontHip: -45, frontKnee: 45, backHip: 10, backKnee: 20 } },
            { key: 'squat-side', name: 'Squat (Side)', icon: 'fa-person', category: 'Locomotion', description: 'Balanced squat with forward torso lean and both feet on the ground.', state: { waist: 18, neck: -8, frontShoulder: -65, frontElbow: -12, frontWrist: 0, backShoulder: -65, backElbow: -12, backWrist: 0, frontHip: -75, frontKnee: 115, frontAnkle: -40, backHip: -75, backKnee: 115, backAnkle: -40 } },
            { key: 'squat-side-raised-arms', name: 'Squat (Side Raised Arms)', icon: 'fa-dumbbell', category: 'Fitness', description: 'Side-facing squat with raised back arm and balanced torso lean.', state: { torso: 15, waist: 0, neck: 15, frontShoulder: -70, frontElbow: 10, frontWrist: 0, backShoulder: -95, backElbow: 5, backWrist: 0, frontHip: -85, frontKnee: 90, frontAnkle: 0, backHip: -85, backKnee: 90, backAnkle: 0 }, dy: 110 },
            { key: 'tip-toe', name: 'Tip Toe', icon: 'fa-shoe-prints', category: 'Locomotion', description: 'Light tip-toe stance with a small upward body lift.', state: { waist: 10, neck: 0, frontShoulder: -10, frontElbow: -60, backShoulder: 20, backElbow: -45, frontHip: -15, frontKnee: 10, backHip: 15, backKnee: 10 }, dy: -14 },
            { key: 'jump-airborne', name: 'Jump (Airborne)', icon: 'fa-arrow-up', category: 'Locomotion', description: 'Airborne jump pose lifted clearly off the ground.', state: { frontShoulder: -120, frontElbow: -20, backShoulder: -100, backElbow: -10, frontHip: 10, frontKnee: 70, backHip: -20, backKnee: 20 }, dy: -82 },

            { key: 'punch-straight', name: 'Punch (Straight)', icon: 'fa-hand-fist', category: 'Action', description: 'Straight punch extension using the front arm.', state: { torso: 15, waistJoint: -10, neck: 5, frontShoulder: -90, frontElbow: 0, backShoulder: 45, backElbow: -90, frontHip: -20, frontKnee: 15, backHip: 20, backKnee: 10 }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },
            { key: 'block-defend', name: 'Block / Defend', icon: 'fa-shield-halved', category: 'Action', description: 'Two-arm defensive guard with a slight backward lean through the torso.', state: { waist: -10, neck: 15, frontShoulder: -45, frontElbow: -90, backShoulder: -18, backElbow: -108, frontHip: -10, frontKnee: 10, backHip: 10, backKnee: 5 }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },
            { key: 'lift-heavy-object', name: 'Lift (Heavy Object)', icon: 'fa-dumbbell', category: 'Action', description: 'Heavy lift pose with both arms and legs bracing symmetrically.', state: { waist: 30, neck: -20, frontShoulder: -45, frontElbow: -45, backShoulder: -28, backElbow: -62, frontHip: -60, frontKnee: 60, backHip: -60, backKnee: 60 } },
            { key: 'throw-winding-up', name: 'Throw (Winding up)', icon: 'fa-baseball', category: 'Action', description: 'Pre-throw winding pose with the body twisted open before release.', state: { waist: -20, neck: 10, frontShoulder: 90, frontElbow: -45, backShoulder: -45, backElbow: -20, frontHip: 20, frontKnee: 15, backHip: -30, backKnee: 45 } },
            { key: 'push-wall', name: 'Push (Wall)', icon: 'fa-person-booth', category: 'Action', description: 'Wall push stance with both arms driving forward.', state: { waist: 20, neck: 0, frontShoulder: -80, frontElbow: -20, backShoulder: -62, backElbow: -42, frontHip: -45, frontKnee: 30, backHip: 45, backKnee: 10 } },

            { key: 'excited-cheer', name: 'Excited / Cheer', icon: 'fa-hands-clapping', category: 'Emotion', description: 'Celebratory uplifted pose with both arms thrown high.', state: { waist: -10, neck: -20, frontShoulder: -160, frontElbow: 0, backShoulder: -140, backElbow: 0, frontHip: -10, frontKnee: 5, backHip: 10, backKnee: 5 }, dy: -18 },
            { key: 'sad-defeated', name: 'Sad / Defeated', icon: 'fa-face-sad-tear', category: 'Emotion', description: 'Collapsed defeated pose with the torso and head folded down.', state: { waist: 10, neck: 28, frontShoulder: 18, frontElbow: -14, backShoulder: 22, backElbow: -16, frontHip: -5, frontKnee: 5, backHip: 5, backKnee: 0 } },
            { key: 'angry-fists-down', name: 'Angry (Fists Down)', icon: 'fa-face-angry', category: 'Emotion', description: 'Aggressive grounded stance with both fists kept low and ready.', state: { waist: 10, neck: 15, frontShoulder: 20, frontElbow: -15, backShoulder: 20, backElbow: -15, frontHip: -15, frontKnee: 10, backHip: 15, backKnee: 5 } },
            { key: 'shocked', name: 'Shocked', icon: 'fa-face-surprise', category: 'Emotion', description: 'Recoiling shocked pose with both hands brought to the head.', state: { waist: -4, neck: -4, frontShoulder: -135, frontElbow: -72, backShoulder: -128, backElbow: -97, frontHip: -8, frontKnee: 12, backHip: 12, backKnee: 6 } },
            { key: 'thinking', name: 'Thinking', icon: 'fa-face-thinking', category: 'Emotion', description: 'Thinking pose with the front hand lifted to the face.', state: { waist: 5, neck: 15, frontShoulder: -10, frontElbow: -130, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, contacts: { 'front-hand': { tag: 'jaw', offsetY: -8 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },
            { key: 'phone-call', name: 'Phone Call', icon: 'fa-phone', category: 'Communication', description: 'Two-arm side-view listening pose with the front hand brought beside the ear.', state: { waist: 0, neck: 0, frontShoulder: -85, frontElbow: -140, frontWrist: 0, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, contacts: { 'front-hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },
            { key: 'phone-call-pre-ear', name: 'Phone Call (Pre-Ear)', icon: 'fa-phone-volume', category: 'Communication', description: 'Two-arm side-view near-ear prep pose that stops short of contact.', state: { waist: 0, neck: -1, frontShoulder: -76, frontElbow: -132, frontWrist: 3, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, contacts: { 'front-hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },
            { key: 'hold-microphone', name: 'Hold Microphone', icon: 'fa-microphone', category: 'Communication', description: 'Two-arm side-view microphone pose with the front hand centered toward the mouth line.', state: { waist: 0, neck: 1, frontShoulder: -23, frontElbow: -122, frontWrist: -5, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },

            { key: 'sitting-chair', name: 'Sitting (Chair)', icon: 'fa-chair', category: 'Resting', description: 'Supported seated pose with level thighs and upright shins.', state: { waist: 0, neck: 0, frontShoulder: 0, frontElbow: -45, backShoulder: 0, backElbow: -45, frontHip: -90, frontKnee: 90, backHip: -90, backKnee: 90 }, dy: 52 },
            { key: 'sitting-floor', name: 'Sitting (Floor)', icon: 'fa-rug', category: 'Resting', description: 'Floor-sit pose with tighter leg compression and folded torso.', state: { waist: 10, neck: 15, frontShoulder: -20, frontElbow: -10, backShoulder: 20, backElbow: -30, frontHip: -80, frontKnee: 120, backHip: -100, backKnee: 120 }, dy: 96 },
            { key: 'kneeling', name: 'Kneeling', icon: 'fa-person-praying', category: 'Resting', description: 'Kneeling pose with the front leg folded and the back leg tucked under.', state: { waist: 0, neck: 10, frontShoulder: 0, frontElbow: 0, backShoulder: 0, backElbow: 0, frontHip: -90, frontKnee: 90, backHip: 10, backKnee: 90 }, dy: 76 },
            { key: 'leaning-wall', name: 'Leaning (Wall)', icon: 'fa-person-rays', category: 'Resting', description: 'Casual side lean with the front arm and front hip carrying the support.', state: { waist: -15, neck: -10, frontShoulder: -20, frontElbow: -90, backShoulder: 0, backElbow: 0, frontHip: 15, frontKnee: 0, backHip: -15, backKnee: 15 } },
            { key: 'sleep-fetal', name: 'Sleep / Fetal', icon: 'fa-bed', category: 'Resting', description: 'Curled-up fetal resting pose with both limbs folded inward.', state: { waist: 45, neck: 45, frontShoulder: -45, frontElbow: -90, backShoulder: -30, backElbow: -80, frontHip: -90, frontKnee: 120, backHip: -70, backKnee: 120 }, dy: 108 },

            { key: 'reaching-up', name: 'Reaching Up', icon: 'fa-hand-point-up', category: 'Utility', description: 'High reach pose with both arms extended overhead.', state: { waist: -10, neck: -30, frontShoulder: -170, frontElbow: 0, backShoulder: -150, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 } },
            { key: 'pointing-left', name: 'Pointing (Left)', icon: 'fa-hand-point-left', category: 'Utility', description: 'Default left-facing forward point using the front arm.', state: { waist: 5, neck: 0, frontShoulder: -90, frontElbow: 0, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },
            { key: 'waving', name: 'Waving', icon: 'fa-hand-peace', category: 'Utility', description: 'Raised waving pose with the front arm ready for a looped wave.', state: { waist: 0, neck: 0, frontShoulder: -160, frontElbow: -45, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] },
            { key: 'handshake-side-right', name: 'Handshake (Side Facing - Right)', icon: 'fa-handshake', category: 'Social', description: 'Side-facing handshake pose with slight forward torso lean, active front arm, and stable leg micro-bend stance.', state: { torso: 8, waist: 0, neck: 8, frontShoulder: -45, frontElbow: -35, frontWrist: 0, backShoulder: 10, backElbow: -10, backWrist: 0, frontHip: 5, frontKnee: -5, backHip: -5, backKnee: 5 } },
            { key: 'hit-damage', name: 'Hit / Damage', icon: 'fa-burst', category: 'Utility', description: 'Recoiling hit reaction with the body thrown off-balance.', state: { waist: -25, neck: -40, frontShoulder: 60, frontElbow: -30, backShoulder: 40, backElbow: -20, frontHip: 30, frontKnee: 40, backHip: -20, backKnee: 15 } },
            { key: 'riding-driving', name: 'Riding / Driving', icon: 'fa-car-side', category: 'Utility', description: 'Driving pose with both arms and both legs engaged forward.', state: { waist: 15, neck: -10, frontShoulder: -70, frontElbow: -30, backShoulder: -60, backElbow: -30, frontHip: -80, frontKnee: 70, backHip: -60, backKnee: 70 } },

            { key: 'deep-bow-pick-up', name: 'Deep Bow / Pick Up', icon: 'fa-person', category: 'Core & Spatial', description: 'Deep bow driven from the hip so the torso stays upright while the upper body folds forward.', state: { torso: 0, waistJoint: 95, neck: 0, frontShoulder: 0, frontElbow: 0, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 } },
            { key: 'backbend-limbo', name: 'Backbend / Limbo', icon: 'fa-person', category: 'Core & Spatial', description: 'Extreme backward lean with the chest opened and the head thrown back.', state: { waist: -55, neck: -45, frontShoulder: -110, frontElbow: -20, backShoulder: -130, backElbow: 0, frontHip: 20, frontKnee: 30, backHip: 40, backKnee: 60 } },
            { key: 'look-around-subtle', name: 'Look Around (Subtle)', icon: 'fa-eye', category: 'Core & Spatial', description: 'Subtle look-around pose focused on the head/neck with minimal torso involvement.', state: { waist: 0, neck: 0, frontShoulder: 0, frontElbow: 0, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, jointTilts: lookAroundJointTilts, partTilts: lookAroundPartTilts },
            { key: 'look-down-subtle', name: 'Look Down (Subtle)', icon: 'fa-eye', category: 'Core & Spatial', description: 'Subtle downward look using gentle pitch on the torso and head.', state: { waist: 5, neck: 10, frontShoulder: 0, frontElbow: 0, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, partTilts: lookDownPartTilts },
            { key: 'twist-away', name: 'Twist Away', icon: 'fa-arrows-rotate', category: 'Core & Spatial', description: 'Turn the upper body away using yaw tilt and restrained shoulder opposition.', state: { waist: 0, neck: 0, frontShoulder: 15, frontElbow: -10, backShoulder: -25, backElbow: -10, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, jointTilts: twistAwayJointTilts, partTilts: twistAwayPartTilts },
            { key: 'twist-toward', name: 'Twist Toward', icon: 'fa-arrows-rotate', category: 'Core & Spatial', description: 'Turn the upper body toward the camera plane using opposite yaw tilt and front/back shoulder emphasis.', state: { waist: 0, neck: 0, frontShoulder: -15, frontElbow: -20, backShoulder: 20, backElbow: -20, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, jointTilts: twistTowardJointTilts, partTilts: twistTowardPartTilts },

            { key: 'aiming-gun-two-hand', name: 'Aiming Gun (2-Hand)', icon: 'fa-gun', category: 'Specific Human Activities', description: 'Two-hand aiming pose with the back elbow sharply bent to support the grip.', state: { waist: 0, neck: -15, frontShoulder: -85, frontElbow: -5, backShoulder: -75, backElbow: -40, frontHip: -20, frontKnee: 15, backHip: 20, backKnee: 10 } },
            { key: 'reading-book', name: 'Reading Book', icon: 'fa-book-open', category: 'Specific Human Activities', description: 'Book-reading pose with both hands meeting at chest height.', state: { waist: 15, neck: 30, frontShoulder: -18, frontElbow: -78, backShoulder: -10, backElbow: -92, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 } },
            { key: 'writing-typing', name: 'Writing / Typing', icon: 'fa-pen', category: 'Specific Human Activities', description: 'Seated writing or typing pose with both forearms engaged forward.', state: { waist: 10, neck: 20, frontShoulder: -12, frontElbow: -68, backShoulder: 2, backElbow: -78, frontHip: -90, frontKnee: 90, backHip: -90, backKnee: 90 }, dy: 54 },
            { key: 'farming-hoeing', name: 'Farming (Hoeing)', icon: 'fa-seedling', category: 'Specific Human Activities', description: 'Hoeing pose with both arms extended forward/down while both feet stay grounded.', state: { waist: 28, neck: -6, frontShoulder: -55, frontElbow: -35, backShoulder: -35, backElbow: -40, frontHip: -12, frontKnee: 20, backHip: 10, backKnee: 20 } },
            { key: 'tennis-serve-prep', name: 'Tennis Serve (Prep)', icon: 'fa-baseball', category: 'Specific Human Activities', description: 'Serve preparation pose with a lifted upper body and slight yaw away.', state: { waist: -20, neck: -25, frontShoulder: -160, frontElbow: -15, backShoulder: -80, backElbow: -90, frontHip: 10, frontKnee: 0, backHip: 20, backKnee: 30 }, jointTilts: tennisPrepJointTilts, partTilts: tennisPrepPartTilts },
            { key: 'soccer-kick-swing', name: 'Soccer Kick (Swing)', icon: 'fa-futbol', category: 'Specific Human Activities', description: 'Soccer kick swing with the front leg extended high.', state: { waist: -15, neck: 0, frontShoulder: -45, frontElbow: -20, backShoulder: 60, backElbow: -30, frontHip: -90, frontKnee: 20, backHip: 15, backKnee: 0 } },
            { key: 'carrying-box', name: 'Carrying Box', icon: 'fa-box', category: 'Specific Human Activities', description: 'Two-arm carrying pose with a slight backward lean for balance.', state: { waist: -5, neck: -5, frontShoulder: -10, frontElbow: -100, backShoulder: 18, backElbow: -124, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 } }
        ];

        poseDefs.push(
            { key: 'wash-hands', name: 'Wash Hands', icon: 'fa-hands-bubbles', category: 'Daily Activities', state: { waist: 0, neck: 18, frontShoulder: -22, frontElbow: -72, backShoulder: -25, backElbow: -68 } },
            { key: 'fold-clothes', name: 'Fold Clothes', icon: 'fa-shirt', category: 'Daily Activities', state: { waist: 0, neck: 18, frontShoulder: -22, frontElbow: -72, backShoulder: -25, backElbow: -68 } },
            { key: 'carry-file', name: 'Carry File', icon: 'fa-folder', category: 'Daily Activities', state: { waist: 0, neck: 0, frontShoulder: -12, frontElbow: -80, backShoulder: 0, backElbow: 0 } },
            { key: 'carry-tray', name: 'Carry Tray', icon: 'fa-grip-lines', category: 'Daily Activities', state: { waist: 0, neck: 0, frontShoulder: -14, frontElbow: -85, backShoulder: -22, backElbow: -75 }, contacts: JointSystem._buildSideCarryTrayContacts() },
            { key: 'place-on-table', name: 'Place on Table', icon: 'fa-table', category: 'Object Handling', state: { waist: 0, neck: 10, frontShoulder: -25, frontElbow: -70, backShoulder: 0, backElbow: 0 } },
            { key: 'pull-suitcase', name: 'Pull Suitcase', icon: 'fa-suitcase', category: 'Object Handling', state: { waist: 0, neck: 0, frontShoulder: 20, frontElbow: -10, backShoulder: 0, backElbow: 0 } },
            { key: 'push-cart', name: 'Push Cart', icon: 'fa-cart-shopping', category: 'Object Handling', state: { waist: 0, neck: 0, frontShoulder: -20, frontElbow: -70, backShoulder: -25, backElbow: -65 } },
            { key: 'pick-from-shelf', name: 'Pick From Shelf', icon: 'fa-box-open', category: 'Object Handling', state: { waist: 0, neck: 0, frontShoulder: -20, frontElbow: -75, backShoulder: 0, backElbow: 0 } },
            { key: 'cook-stir-pot', name: 'Cook / Stir Pot', icon: 'fa-utensils', category: 'Daily Activities', state: { waist: 4, neck: 14, frontShoulder: -20, frontElbow: -85, backShoulder: -22, backElbow: -75 } },
            { key: 'write-board', name: 'Write Board', icon: 'fa-chalkboard-user', category: 'Daily Activities', state: { waist: 0, neck: 0, frontShoulder: -55, frontElbow: -60, backShoulder: 0, backElbow: 0 } },
            { key: 'fan-self', name: 'Fan Self', icon: 'fa-fan', category: 'Daily Activities', state: { waist: 0, neck: 0, frontShoulder: -24, frontElbow: -98, frontWrist: 0, backShoulder: 0, backElbow: 0 } },
            { key: 'hand-shaker', name: 'Play Hand Shaker', icon: 'fa-music', category: 'Daily Activities', state: { waist: 0, neck: 0, frontShoulder: -20, frontElbow: -70, frontWrist: 0, backShoulder: 0, backElbow: 0 } },
            { key: 'sweep', name: 'Sweep', icon: 'fa-broom', category: 'Daily Activities', state: { waist: 4, neck: 12, frontShoulder: -24, frontElbow: -52, backShoulder: -38, backElbow: -62 } },
            { key: 'mop', name: 'Mop', icon: 'fa-hand-sparkles', category: 'Daily Activities', state: { waist: 4, neck: 12, frontShoulder: -24, frontElbow: -52, backShoulder: -38, backElbow: -62 } },
            { key: 'carry-bag', name: 'Carry Bag', icon: 'fa-bag-shopping', category: 'Daily Activities', state: { waist: 0, neck: 0, frontShoulder: -6, frontElbow: -10, backShoulder: 0, backElbow: 0 } },
            { key: 'taking-photo-selfie', name: 'Taking Photo / Selfie', icon: 'fa-camera', category: 'Communication', state: { waist: 0, neck: -4, frontShoulder: -85, frontElbow: -15, backShoulder: 0, backElbow: 0 } },
            { key: 'read-book-seated', name: 'Read Book (Seated)', icon: 'fa-book-open', category: 'Daily Activities', state: { waist: 6, neck: 18, frontShoulder: -38, frontElbow: -92, frontWrist: 8, backShoulder: -22, backElbow: -104, backWrist: -6, frontHip: -90, frontKnee: 90, backHip: -90, backKnee: 90 } },
            { key: 'write-seated', name: 'Write (Seated)', icon: 'fa-pen', category: 'Daily Activities', state: { waist: 8, neck: 20, frontShoulder: -18, frontElbow: -80, frontWrist: -10, backShoulder: -4, backElbow: -72, backWrist: 2, frontHip: -90, frontKnee: 90, backHip: -90, backKnee: 90 } },
            { key: 'type-seated', name: 'Type (Seated)', icon: 'fa-keyboard', category: 'Daily Activities', state: { waist: 6, neck: 14, frontShoulder: -12, frontElbow: -70, frontWrist: 2, backShoulder: -10, backElbow: -74, backWrist: -2, frontHip: -90, frontKnee: 90, backHip: -90, backKnee: 90 } }
        );
        const catalog = {};
        poseDefs.forEach(def => {
            const converted = JointSystem._buildHumanSideDualArmState(def.state || {});
            const entry = {
                name: def.name,
                icon: def.icon || 'fa-person-walking',
                category: def.category || 'Other',
                description: def.description || '',
                jointAngles: converted.jointAngles,
                partAngles: converted.partAngles
            };
            if (Number.isFinite(def.dy)) entry.dy = def.dy;
            if (def.jointTilts && Object.keys(def.jointTilts).length) {
                entry.jointTilts = Utils.deepClone(def.jointTilts);
            }
            if (def.partTilts && Object.keys(def.partTilts).length) {
                entry.partTilts = Utils.deepClone(def.partTilts);
            }
            if (def.contacts && Object.keys(def.contacts).length) {
                entry.contacts = Utils.deepClone(def.contacts);
            }
            JointSystem._copyArmatureLayerOverrideFields(entry, def);
            catalog[def.key] = entry;
        });

        for (const [key, shoulder, elbow] of [['phone-call', -30, -145], ['phone-call-pre-ear', -25, -132]]) {
            const corrected = JointSystem._buildHumanSideDualArmState({ frontShoulder: shoulder, frontElbow: elbow });
            for (const joint of ['front-shoulder', 'front-elbow']) catalog[key].jointAngles[joint] = corrected.jointAngles[joint];
            Object.assign(catalog[key].contacts['front-hand'], { preserveBend: true,
                shoulderLimit: 175, wristLimit: 12, offsetY: 24, iterations: 32 });
        }
        JointSystem._applyDefaultArmaturePoseCompatibility(catalog, ['side-left']);
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._addHandgunViewPresets(catalog, 'side-dual');
        JointSystem._humanSideDualArmaturePoseCatalog = catalog;
        return catalog;
    }

JointSystem._buildHumanSideDualArmaturePoseCatalogRight = function() {
        if (JointSystem._humanSideDualArmaturePoseCatalogRight) {
            return JointSystem._humanSideDualArmaturePoseCatalogRight;
        }

        const leftCatalog = JointSystem._buildHumanSideDualArmaturePoseCatalog();
        const catalog = {};

        Object.entries(leftCatalog || {}).forEach(([key, entry]) => {
            const mirrored = JointSystem._cloneArmatureCatalogEntry(entry) || {};
            mirrored.name = JointSystem._makeRightFacingSideText(mirrored.name || '');
            mirrored.description = JointSystem._makeRightFacingSideText(mirrored.description || '');
            mirrored.jointAngles = Utils.deepClone(entry?.jointAngles || {});
            mirrored.partAngles = Utils.deepClone(entry?.partAngles || {});
            mirrored.jointTilts = Utils.deepClone(entry?.jointTilts || {});
            mirrored.partTilts = Utils.deepClone(entry?.partTilts || {});
            mirrored.contacts = Utils.deepClone(entry?.contacts || {});
            mirrored.viewCompatibility = Array.isArray(mirrored.viewCompatibility) && mirrored.viewCompatibility.length
                ? mirrored.viewCompatibility.map(value => value === 'side-left' ? 'side-right' : value)
                : ['side-right'];
            if (typeof entry?.dy === 'number') mirrored.dy = entry.dy;
            if (key === 'pointing-left') {
                mirrored.name = 'Pointing (Right)';
                mirrored.icon = 'fa-hand-point-right';
                mirrored.description = 'Default right-facing forward point using the front arm.';
            }
            catalog[key] = mirrored;
        });

        JointSystem._applyDefaultArmaturePoseCompatibility(catalog, ['side-right']);
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._humanSideDualArmaturePoseCatalogRight = catalog;
        return catalog;
    }

JointSystem._naturalSideGaitPhases = [
    [0, -25, 5, -8], [.08, -20, 12, 0], [.26, 0, 4, 0],
    [.44, 18, 8, 8], [.52, 24, 30, 20], [.68, 0, 48, 0],
    [.84, -20, 20, -4], [1, -25, 5, -8]
];

JointSystem._naturalSideRunPhases = [
    [0, -30, 12, -4], [.08, -20, 24, 0], [.22, 6, 18, 10],
    [.38, 30, 35, 25], [.52, 18, 90, 10], [.66, -15, 100, -5],
    [.82, -35, 45, -8], [1, -30, 12, -4]
];

JointSystem._sampleNaturalSideGait = function(phase, running = false) {
    const p = ((phase % 1) + 1) % 1, gait = running ? JointSystem._naturalSideRunPhases : JointSystem._naturalSideGaitPhases;
    const index = gait.findIndex((point, i) => i < gait.length - 1 && p >= point[0] && p < gait[i + 1][0]);
    const a = gait[Math.max(0, index)], b = gait[Math.max(0, index) + 1];
    const t = (p - a[0]) / (b[0] - a[0]);
    const smoothT = t * t * t * (10 - 15 * t + 6 * t * t);
    return a.slice(1).map((value, i) => value + (b[i + 1] - value) * smoothT);
};

JointSystem._buildHumanSideDualArmatureMovementCatalog = function() {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        if (
            JointSystem._humanSideDualArmatureMovementCatalog
            && !Object.values(JointSystem._humanSideDualArmatureMovementCatalog).some(move => move?.repeat === null)
            && [
                'idle-breathe', 'walk-cycle', 'run-cycle', 'wave', 'present-explain',
                'present-explain-hand-over-hand',
                'nod-yes', 'shake-head', 'look-around', 'look-up-return', 'look-down-return'
            ].every(key => !!JointSystem._humanSideDualArmatureMovementCatalog[key])
        ) {
            return JointSystem._humanSideDualArmatureMovementCatalog;
        }

        const buildFrame = (t, state = {}, dyOrOptions = undefined, maybeOptions = undefined) => {
            const converted = JointSystem._buildHumanSideDualArmState(state);
            const frame = { t };
            let dy = dyOrOptions;
            let options = maybeOptions || {};
            if (dyOrOptions && typeof dyOrOptions === 'object' && !Array.isArray(dyOrOptions)) {
                options = dyOrOptions;
                dy = dyOrOptions.dy;
            }
            if (typeof dy === 'number') frame.dy = dy;
            if (Object.keys(converted.jointAngles).length) frame.jointAngles = converted.jointAngles;
            if (Object.keys(converted.partAngles).length) frame.partAngles = converted.partAngles;
            if (options?.jointTilts && Object.keys(options.jointTilts).length) {
                frame.jointTilts = Utils.deepClone(options.jointTilts);
            }
            if (options?.partTilts && Object.keys(options.partTilts).length) {
                frame.partTilts = Utils.deepClone(options.partTilts);
            }
            if (options?.contacts && Object.keys(options.contacts).length) {
                frame.contacts = Utils.deepClone(options.contacts);
            }
            JointSystem._copyArmatureLayerOverrideFields(frame, options);
            return frame;
        };

        // Side-view depth order by ROLE (far limbs behind, near limbs in front, arm above leg).
        // The turn-around flip relabels roles to the new facing, so this stays correct on the
        // return; without it the walk falls into the dynamic classifier which double-swaps and
        // draws the near-side arm behind the near-side leg.
        const SIDE_NEAR_ARM_LAYER = ['back-leg', 'back-arm', 'torso', 'head-neck', 'front-leg', 'front-arm'];
        const speakingRest = { waist: 0, neck: 0, frontShoulder: 0, frontElbow: 0, frontWrist: 0,
            backShoulder: 0, backElbow: 0, backWrist: 0 };

        const neutral = {};
        const idleBreathe = {
            waist: 2,
            neck: 1,
            frontShoulder: 3,
            frontElbow: -4,
            backShoulder: -3,
            backElbow: -4
        };

        const walkLead = {
            waist: 5,
            neck: 5,
            frontShoulder: 30,
            frontElbow: -15,
            backShoulder: -30,
            backElbow: -10,
            frontHip: -35,
            frontKnee: 10,
            backHip: 35,
            backKnee: 20
        };
        const walkPass = {
            waist: 4,
            neck: 4,
            frontShoulder: 10,
            frontElbow: -8,
            backShoulder: -10,
            backElbow: -10,
            frontHip: -8,
            frontKnee: 6,
            backHip: 8,
            backKnee: 10
        };
        const walkOpp = {
            waist: 5,
            neck: 5,
            frontShoulder: -30,
            frontElbow: -10,
            backShoulder: 30,
            backElbow: -15,
            frontHip: 35,
            frontKnee: 20,
            backHip: -35,
            backKnee: 10
        };
        const walkPassOpp = {
            waist: 4,
            neck: 4,
            frontShoulder: -10,
            frontElbow: -10,
            backShoulder: 10,
            backElbow: -8,
            frontHip: 8,
            frontKnee: 10,
            backHip: -8,
            backKnee: 6
        };

        const runLead = {
            waist: 15,
            neck: 10,
            frontShoulder: 52,
            frontElbow: -28,
            backShoulder: -58,
            backElbow: -42,
            frontHip: -70,
            frontKnee: 45,
            backHip: 60,
            backKnee: 90
        };
        const runPass = {
            waist: 10,
            neck: 8,
            frontShoulder: 16,
            frontElbow: -20,
            backShoulder: -18,
            backElbow: -30,
            frontHip: -12,
            frontKnee: 18,
            backHip: 18,
            backKnee: 35
        };
        const runOpp = {
            waist: 15,
            neck: 10,
            frontShoulder: -58,
            frontElbow: -42,
            backShoulder: 52,
            backElbow: -28,
            frontHip: 60,
            frontKnee: 90,
            backHip: -70,
            backKnee: 45
        };
        const runPassOpp = {
            waist: 10,
            neck: 8,
            frontShoulder: -18,
            frontElbow: -30,
            backShoulder: 16,
            backElbow: -20,
            frontHip: 18,
            frontKnee: 35,
            backHip: -12,
            backKnee: 18
        };

        const sneakLead = {
            waist: 25,
            neck: -15,
            frontShoulder: 20,
            frontElbow: -40,
            backShoulder: -30,
            backElbow: -20,
            frontHip: -45,
            frontKnee: 45,
            backHip: 10,
            backKnee: 20
        };
        const sneakPass = {
            waist: 18,
            neck: -10,
            frontShoulder: 8,
            frontElbow: -34,
            backShoulder: -18,
            backElbow: -18,
            frontHip: -12,
            frontKnee: 20,
            backHip: 8,
            backKnee: 10
        };
        const sneakOpp = {
            waist: 25,
            neck: -15,
            frontShoulder: -30,
            frontElbow: -20,
            backShoulder: 20,
            backElbow: -40,
            frontHip: 10,
            frontKnee: 20,
            backHip: -45,
            backKnee: 45
        };
        const sneakPassOpp = {
            waist: 18,
            neck: -10,
            frontShoulder: -18,
            frontElbow: -18,
            backShoulder: 8,
            backElbow: -34,
            frontHip: 8,
            frontKnee: 10,
            backHip: -12,
            backKnee: 20
        };

        const tipToeLead = {
            waist: 10,
            neck: 0,
            frontShoulder: -10,
            frontElbow: -60,
            backShoulder: 20,
            backElbow: -45,
            frontHip: -15,
            frontKnee: 10,
            backHip: 15,
            backKnee: 10
        };
        const tipToeOpp = {
            waist: 10,
            neck: 0,
            frontShoulder: 20,
            frontElbow: -45,
            backShoulder: -10,
            backElbow: -60,
            frontHip: 15,
            frontKnee: 10,
            backHip: -15,
            backKnee: 10
        };

        const jumpSquat = {
            frontShoulder: 45,
            frontElbow: -10,
            backShoulder: 60,
            backElbow: -20,
            frontHip: -60,
            frontKnee: 90,
            backHip: -60,
            backKnee: 90
        };
        const jumpPushOff = {
            frontShoulder: -45,
            frontElbow: 0,
            backShoulder: -60,
            backElbow: 0,
            frontHip: 10,
            frontKnee: 0,
            backHip: 10,
            backKnee: 0
        };
        const jumpApex = {
            frontShoulder: -110,
            frontElbow: -15,
            backShoulder: -95,
            backElbow: -10,
            frontHip: 10,
            frontKnee: 70,
            backHip: -20,
            backKnee: 20
        };
        const jumpFall = {
            frontShoulder: -120,
            frontElbow: 0,
            backShoulder: -110,
            backElbow: 0,
            frontHip: -20,
            frontKnee: 15,
            backHip: -20,
            backKnee: 15
        };
        const jumpLanding = {
            frontShoulder: -20,
            frontElbow: -45,
            backShoulder: -30,
            backElbow: -60,
            frontHip: -70,
            frontKnee: 100,
            backHip: -70,
            backKnee: 100
        };

        const guardBase = {
            waist: -10,
            neck: 15,
            frontShoulder: -45,
            frontElbow: -90,
            backShoulder: -30,
            backElbow: -90,
            frontHip: -10,
            frontKnee: 10,
            backHip: 10,
            backKnee: 5
        };
        const punchRetract = {
            torso: 10,
            waistJoint: -4,
            neck: 8,
            frontShoulder: -35,
            frontElbow: -70,
            backShoulder: 10,
            backElbow: -85,
            frontHip: -8,
            frontKnee: 10,
            backHip: 10,
            backKnee: 8
        };
        const punchExtend = {
            torso: 15,
            waistJoint: -10,
            neck: 5,
            frontShoulder: -90,
            frontElbow: 0,
            backShoulder: 45,
            backElbow: -90,
            frontHip: -20,
            frontKnee: 15,
            backHip: 20,
            backKnee: 10
        };
        const punchFollowThrough = {
            torso: 18,
            waistJoint: -12,
            neck: 6,
            frontShoulder: -102,
            frontElbow: -6,
            backShoulder: 38,
            backElbow: -96,
            frontHip: -18,
            frontKnee: 16,
            backHip: 18,
            backKnee: 10
        };

        const kickReady = {
            waist: -5,
            neck: 0,
            frontShoulder: -20,
            frontElbow: -10,
            backShoulder: 10,
            backElbow: -15,
            frontHip: 0,
            frontKnee: 10,
            backHip: 0,
            backKnee: 0
        };
        const kickLift = {
            waist: -12,
            neck: 0,
            frontShoulder: -32,
            frontElbow: -18,
            backShoulder: 28,
            backElbow: -24,
            frontHip: -55,
            frontKnee: 48,
            backHip: 12,
            backKnee: 4
        };
        const kickExtend = {
            waist: -15,
            neck: 0,
            frontShoulder: -45,
            frontElbow: -20,
            backShoulder: 60,
            backElbow: -30,
            frontHip: -90,
            frontKnee: 20,
            backHip: 15,
            backKnee: 0
        };

        const marchLead = {
            waist: 10,
            neck: 6,
            frontShoulder: 42,
            frontElbow: -18,
            backShoulder: -42,
            backElbow: -20,
            frontHip: -55,
            frontKnee: 34,
            backHip: 18,
            backKnee: 10
        };
        const marchPass = {
            waist: 6,
            neck: 4,
            frontShoulder: 14,
            frontElbow: -12,
            backShoulder: -14,
            backElbow: -12,
            frontHip: -12,
            frontKnee: 14,
            backHip: 12,
            backKnee: 14
        };
        const marchOpp = {
            waist: 10,
            neck: 6,
            frontShoulder: -42,
            frontElbow: -20,
            backShoulder: 42,
            backElbow: -18,
            frontHip: 18,
            frontKnee: 10,
            backHip: -55,
            backKnee: 34
        };
        const marchPassOpp = {
            waist: 6,
            neck: 4,
            frontShoulder: -14,
            frontElbow: -12,
            backShoulder: 14,
            backElbow: -12,
            frontHip: 12,
            frontKnee: 14,
            backHip: -12,
            backKnee: 14
        };

        const climbStepFront = {
            frontShoulder: -20,
            frontElbow: -15,
            backShoulder: 20,
            backElbow: -10,
            frontHip: -80,
            frontKnee: 90,
            backHip: 0,
            backKnee: 10
        };
        const climbLiftBody = {
            frontShoulder: 0,
            frontElbow: -10,
            backShoulder: 0,
            backElbow: -10,
            frontHip: -15,
            frontKnee: 10,
            backHip: 20,
            backKnee: 15
        };
        const climbStepBack = {
            frontShoulder: 20,
            frontElbow: -10,
            backShoulder: -20,
            backElbow: -15,
            frontHip: 0,
            frontKnee: 10,
            backHip: -80,
            backKnee: 90
        };

        const lookCenterTilts = {
            partTilts: {
                'head-neck': { x: 3, y: 0 }
            }
        };
        const lookLeftTilts = {
            partTilts: {
                'head-neck': { x: 4, y: 8 }
            }
        };
        const lookRightTilts = {
            partTilts: {
                'head-neck': { x: 4, y: -8 }
            }
        };

        const catalog = {
            'idle-breathe': {
                name: 'Idle Breathe',
                icon: 'fa-wind',
                category: 'Standing',
                description: 'Subtle breathing loop around the neutral left-facing six-piece side stance.',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, neutral),
                    buildFrame(0.35, idleBreathe, -2),
                    buildFrame(0.65, idleBreathe, -2),
                    buildFrame(1.00, neutral)
                ]
            },
            'walk-cycle': {
                name: 'Walk Cycle',
                icon: 'fa-person-walking',
                category: 'Locomotion',
                description: 'Alternating left-facing walk cycle built from the guide walk mid-pose. Set a Movement Blend distance to make it travel that far, then stop.',
                duration: 1400,
                repeat: Infinity,
                rootTravel: { distance: 110 },
                keyframes: [
                    buildFrame(0.00, walkLead, 2),
                    buildFrame(0.25, walkPass, 0),
                    buildFrame(0.50, walkOpp, 2),
                    buildFrame(0.75, walkPassOpp, 0),
                    buildFrame(1.00, walkLead, 2)
                ]
            },
            'run-cycle': {
                name: 'Run Cycle',
                icon: 'fa-person-running',
                category: 'Locomotion',
                description: 'Alternating left-facing run cycle rebuilt from the guide run mid-pose. Set a Movement Blend distance to make it travel that far, then stop.',
                duration: 900,
                repeat: Infinity,
                rootTravel: { distance: 190 },
                keyframes: [
                    buildFrame(0.00, runLead, -8),
                    buildFrame(0.25, runPass, -2),
                    buildFrame(0.50, runOpp, -10),
                    buildFrame(0.75, runPassOpp, -2),
                    buildFrame(1.00, runLead, -8)
                ]
            },
            'tip-toe-sneak': {
                name: 'Sneak / Tip-Toe',
                icon: 'fa-user-secret',
                category: 'Locomotion',
                description: 'Alternating sneaking loop derived from the sneak/crouch and tip-toe guide poses.',
                duration: 1600,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, sneakLead, 4),
                    buildFrame(0.25, tipToeLead, -10),
                    buildFrame(0.50, sneakOpp, 4),
                    buildFrame(0.75, tipToeOpp, -10),
                    buildFrame(1.00, sneakLead, 4)
                ]
            },
            'jump-full': {
                name: 'Jump (Full Movement)',
                icon: 'fa-arrow-up',
                category: 'Locomotion',
                description: 'Full jump sequence using anticipation, push-off, airborne apex, fall, and landing from the guide.',
                duration: 1200,
                repeat: 1,
                keyframes: [
                    buildFrame(0.00, neutral, 0),
                    buildFrame(0.15, jumpSquat, 0),
                    buildFrame(0.28, { ...jumpPushOff, frontHip: 0, backHip: 0 }, 0),
                    buildFrame(0.46, jumpApex, -82),
                    buildFrame(0.67, jumpFall, -34),
                    buildFrame(0.76, { ...jumpFall, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }, 0),
                    buildFrame(0.86, jumpLanding, 0),
                    buildFrame(1.00, neutral, 0)
                ]
            },
            'climb-stairs': {
                name: 'Climbing Stairs',
                icon: 'fa-stairs',
                category: 'Locomotion',
                description: 'Step-up sequence based on the guide climbing-stairs keyframes.',
                duration: 1400,
                repeat: 3,
                keyframes: [
                    buildFrame(0.00, climbStepFront, 0),
                    buildFrame(0.35, climbLiftBody, -24),
                    buildFrame(0.70, climbStepBack, -24),
                    buildFrame(1.00, climbStepFront, 0)
                ]
            },
            'wave': {
                name: 'Wave Loop',
                icon: 'fa-hand-peace',
                category: 'Gestures',
                description: 'Looped wave from the guide waving pose, driven by the raised front arm.',
                duration: 1400,
                repeat: 3,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: -160, frontElbow: -45, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.30, { waist: 0, neck: 0, frontShoulder: -164, frontElbow: -30, frontWrist: 12, backShoulder: 0, backElbow: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.55, { waist: 0, neck: 0, frontShoulder: -156, frontElbow: -62, frontWrist: -10, backShoulder: 0, backElbow: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.78, { waist: 0, neck: 0, frontShoulder: -164, frontElbow: -30, frontWrist: 12, backShoulder: 0, backElbow: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: -160, frontElbow: -45, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'present-explain': {
                name: 'Present / Explain',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Side-view presentation gesture with both hands opening forward while the rear shoulder keeps its natural depth.',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 1, neck: 2, frontShoulder: -8, frontElbow: -42, frontWrist: -4, backShoulder: -10, backElbow: -38, backWrist: 3 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.24, { waist: 3, neck: 1, frontShoulder: -22, frontElbow: -74, frontWrist: -10, backShoulder: -16, backElbow: -52, backWrist: 5 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.52, { waist: -2, neck: 3, frontShoulder: -36, frontElbow: -62, frontWrist: 8, backShoulder: -24, backElbow: -58, backWrist: -5 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.78, { waist: 2, neck: 2, frontShoulder: -16, frontElbow: -68, frontWrist: -6, backShoulder: -30, backElbow: -64, backWrist: 8 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 1, neck: 2, frontShoulder: -8, frontElbow: -42, frontWrist: -4, backShoulder: -10, backElbow: -38, backWrist: 3 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'present-explain-alternate': {
                name: 'Present / Explain - Alternate',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Side-view alternating explanation with front and back arm beats while preserving side-view depth order.',
                duration: 2400,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: -8, frontElbow: -34, frontWrist: 0, backShoulder: -10, backElbow: -38, backWrist: 2 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.20, { waist: 3, neck: 1, frontShoulder: -24, frontElbow: -72, frontWrist: -8, backShoulder: -16, backElbow: -50, backWrist: 5 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.38, { waist: -2, neck: 3, frontShoulder: -36, frontElbow: -60, frontWrist: 10, backShoulder: -22, backElbow: -56, backWrist: -5 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.55, { waist: 0, neck: 0, frontShoulder: -12, frontElbow: -42, frontWrist: 1, backShoulder: -12, backElbow: -44, backWrist: -1 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.76, { waist: -1, neck: -2, frontShoulder: -18, frontElbow: -52, frontWrist: -5, backShoulder: -34, backElbow: -68, backWrist: 10 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: -8, frontElbow: -34, frontWrist: 0, backShoulder: -10, backElbow: -38, backWrist: 2 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'present-explain-hand-over-hand': {
                name: 'Present / Explain - One Arm at a Time',
                icon: 'fa-person-chalkboard',
                category: 'Communication',
                description: 'Side-view speaking loop where the front arm completes its gesture and returns to idle before the rear arm moves.',
                duration: 2800,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, speakingRest, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.10, speakingRest, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.26, { ...speakingRest, neck: 1, frontShoulder: -38, frontElbow: -70, frontWrist: -10 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.44, { ...speakingRest, neck: 1 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.54, speakingRest, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.70, { ...speakingRest, neck: -1, backShoulder: -40, backElbow: -72, backWrist: 10 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.88, speakingRest, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(1.00, speakingRest, { layerOrderOverride: SIDE_NEAR_ARM_LAYER })
                ]
            },
            'walk-to-point-and-back': {
                name: 'Walk to Point and Back',
                icon: 'fa-person-walking-arrow-loop-left',
                category: 'Travel',
                description: 'Dual-arm side turn-around: walk forward to a target, turn to face the other way, then walk back to the start. Set a Movement Blend X distance for the exact reach. (Turn-around plays live; timeline records the forward walk.)',
                duration: 3200,
                repeat: 1,
                turnAround: true,
                turnAroundForwardKey: 'walk-to-point-and-back',
                turnAroundReturnKey: 'walk-to-point-and-back',
                rootTravel: { x: 176 },
                absoluteTravel: false,
                keyframes: [
                    { ...buildFrame(0.000, walkLead, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 0 },
                    { ...buildFrame(0.125, walkPass, 0, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 22 },
                    { ...buildFrame(0.250, walkOpp, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 44 },
                    { ...buildFrame(0.375, walkPassOpp, 0, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 66 },
                    { ...buildFrame(0.500, walkLead, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 88 },
                    { ...buildFrame(0.625, walkPass, 0, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 110 },
                    { ...buildFrame(0.750, walkOpp, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 132 },
                    { ...buildFrame(0.875, walkPassOpp, 0, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 154 },
                    { ...buildFrame(1.000, walkLead, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 176 }
                ]
            },
            'walk-cycle-compare-loop': {
                name: 'Walk Cycle (Loop Compare)',
                icon: 'fa-repeat',
                category: 'Travel',
                description: 'Dual-arm side walk cycle that advances forward a few strides for comparison with the walk-to-point travel preset.',
                duration: 1800,
                repeat: 4,
                keyframes: [
                    { ...buildFrame(0.00, walkLead, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 0 },
                    { ...buildFrame(0.25, walkPass, 0, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 13 },
                    { ...buildFrame(0.50, walkOpp, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 26 },
                    { ...buildFrame(0.75, walkPassOpp, 0, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 39 },
                    { ...buildFrame(1.00, walkLead, 2, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }), dx: 52 }
                ]
            },
            'turn-around-flip': {
                name: 'Turn Around (Flip)',
                icon: 'fa-arrows-left-right',
                category: 'Travel',
                description: 'Turn to face the opposite direction in place. Play or record it on its own between walk cycles: walk out with a walk cycle, turn around, then walk back any distance with another walk cycle.',
                duration: 420,
                repeat: 1,
                flipInPlace: true,
                semanticAction: JointSystem.ARMATURE_SEMANTIC_ACTIONS.FLIP,
                semanticFamily: 'orientation',
                motionIntent: 'view-orientation transition',
                authoringConvention: JointSystem.ARMATURE_ANATOMY_CONVENTIONS.rotation,
                keyframes: [
                    buildFrame(0, {}, 0),
                    buildFrame(1, {}, 0)
                ]
            },
            'listen-agree': {
                name: 'Listen / Agree',
                icon: 'fa-head-side-virus',
                category: 'Communication',
                description: 'Side-view listening and nodding agreement with both hands making restrained forward responses.',
                duration: 1600,
                repeat: 3,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: -6, frontElbow: -28, frontWrist: 0, backShoulder: -14, backElbow: -42, backWrist: 2 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.22, { waist: 2, neck: 9, frontShoulder: -12, frontElbow: -38, frontWrist: -4, backShoulder: -28, backElbow: -58, backWrist: 7 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.46, { waist: 0, neck: -3, frontShoulder: -8, frontElbow: -30, frontWrist: 1, backShoulder: -16, backElbow: -44, backWrist: 1 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(0.68, { waist: -2, neck: 7, frontShoulder: -24, frontElbow: -52, frontWrist: 6, backShoulder: -12, backElbow: -40, backWrist: -5 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: -6, frontElbow: -28, frontWrist: 0, backShoulder: -14, backElbow: -42, backWrist: 2 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER })
                ]
            },
            'call-attention': {
                name: 'Call Attention',
                icon: 'fa-hand',
                category: 'Communication',
                description: 'Side-view raised front-arm call-attention gesture.',
                duration: 1300,
                repeat: 2,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: 4, frontElbow: -10, frontWrist: 0, backShoulder: -2, backElbow: -8 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.22, { waist: -2, neck: -3, frontShoulder: -90, frontElbow: -52, frontWrist: 12, backShoulder: -4, backElbow: -12 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.42, { waist: -2, neck: -3, frontShoulder: -98, frontElbow: -40, frontWrist: -14, backShoulder: -4, backElbow: -12 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.62, { waist: -2, neck: -3, frontShoulder: -90, frontElbow: -52, frontWrist: 12, backShoulder: -4, backElbow: -12 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: 4, frontElbow: -10, frontWrist: 0, backShoulder: -2, backElbow: -8 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'phone-call-loop': {
                name: 'Phone Call / Listening',
                icon: 'fa-phone',
                category: 'Communication',
                description: 'Two-arm side-view phone listening loop using the front hand beside the ear.',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: -85, frontElbow: -140, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.30, { waist: 0, neck: -1, frontShoulder: -88, frontElbow: -136, frontWrist: 3, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.64, { waist: 0, neck: 1, frontShoulder: -82, frontElbow: -144, frontWrist: -2, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: -85, frontElbow: -140, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 4, offsetY: 10, iterations: 12 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'phone-call-pre-ear-loop': {
                name: 'Phone Call / Pre-Ear',
                icon: 'fa-phone-volume',
                category: 'Communication',
                description: 'Two-arm side-view near-ear prep loop that holds just off the ear.',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: -2, frontShoulder: -68, frontElbow: -118, frontWrist: 4, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.34, { waist: 0, neck: -3, frontShoulder: -72, frontElbow: -114, frontWrist: 6, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.70, { waist: 0, neck: -1, frontShoulder: -64, frontElbow: -122, frontWrist: 2, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: -2, frontShoulder: -68, frontElbow: -118, frontWrist: 4, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'ear', offsetX: 12, offsetY: 12, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'microphone-talk': {
                name: 'Microphone Talk',
                icon: 'fa-microphone',
                category: 'Communication',
                description: 'Two-arm side-view microphone-talk loop with the front hand centered on the mouth path.',
                duration: 1700,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 2, frontShoulder: -34, frontElbow: -150, frontWrist: -2, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.28, { waist: 0, neck: 4, frontShoulder: -38, frontElbow: -154, frontWrist: 2, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.60, { waist: 0, neck: 1, frontShoulder: -30, frontElbow: -146, frontWrist: -4, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: 2, frontShoulder: -34, frontElbow: -150, frontWrist: -2, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 14 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'guard-bob': {
                name: 'Boxing Guard Bob',
                icon: 'fa-shield-halved',
                category: 'Action',
                description: 'Boxing guard loop derived from the block/defend pose with subtle torso bobbing.',
                duration: 900,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, guardBase, { dy: 0, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.25, { ...guardBase, waist: -8, neck: 18, frontShoulder: -50, backShoulder: -34, frontHip: -12, frontKnee: 14, backHip: 12, backKnee: 8 }, { dy: -4, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.50, { ...guardBase, waist: -12, neck: 12, frontShoulder: -40, backShoulder: -26, frontHip: -8, frontKnee: 8, backHip: 8, backKnee: 4 }, { dy: 0, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.75, { ...guardBase, waist: -9, neck: 17, frontShoulder: -48, backShoulder: -32, frontHip: -11, frontKnee: 13, backHip: 11, backKnee: 7 }, { dy: -3, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, guardBase, { dy: 0, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'look-around': {
                name: 'Look Around',
                icon: 'fa-eye',
                category: 'Gestures',
                description: 'Subtle left/right look driven at the head-neck, without rotating the torso.',
                duration: 1800,
                repeat: 2,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0 }, lookCenterTilts),
                    buildFrame(0.30, { waist: 0, neck: 0 }, lookLeftTilts),
                    buildFrame(0.65, { waist: 0, neck: 0 }, lookRightTilts),
                    buildFrame(1.00, { waist: 0, neck: 0 }, lookCenterTilts)
                ]
            },
            'sway-side': {
                name: 'Sway Side',
                icon: 'fa-arrows-left-right',
                category: 'Standing',
                description: 'Gentle standing sway that shifts the upper body while keeping the side read intact.',
                duration: 1800,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 6, neck: 4, frontShoulder: 12, frontElbow: -8, backShoulder: -12, backElbow: -10, frontHip: -8, backHip: 8 }, 0),
                    buildFrame(0.50, { waist: -4, neck: -2, frontShoulder: -10, frontElbow: -10, backShoulder: 10, backElbow: -8, frontHip: 8, backHip: -8 }, -3),
                    buildFrame(1.00, { waist: 6, neck: 4, frontShoulder: 12, frontElbow: -8, backShoulder: -12, backElbow: -10, frontHip: -8, backHip: 8 }, 0)
                ]
            },
            'fidget-side': {
                name: 'Fidget',
                icon: 'fa-person-circle-question',
                category: 'Standing',
                description: 'Restless side fidget moving from neutral into thinking and shocked beats and back.',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, neutral),
                    buildFrame(0.30, { waist: 5, neck: 15, frontShoulder: -10, frontElbow: -130, backShoulder: 0, backElbow: 0 }),
                    buildFrame(0.60, { waist: -5, neck: -10, frontShoulder: -120, frontElbow: -60, backShoulder: -100, backElbow: -80, frontHip: -10, frontKnee: 15, backHip: 15, backKnee: 5 }),
                    buildFrame(1.00, neutral)
                ]
            },
            'march-side': {
                name: 'March',
                icon: 'fa-person-military-pointing',
                category: 'Locomotion',
                description: 'High-step march loop with clear arm-leg opposition and stronger waist/neck drive than the regular walk cycle.',
                duration: 1200,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, marchLead, 0),
                    buildFrame(0.25, marchPass, -2),
                    buildFrame(0.50, marchOpp, 0),
                    buildFrame(0.75, marchPassOpp, -2),
                    buildFrame(1.00, marchLead, 0)
                ]
            },
            'punch-side-loop': {
                name: 'Punch Drill',
                icon: 'fa-fist-raised',
                category: 'Action',
                description: 'Repeated straight punch drill rebuilt from the punch guide pose.',
                duration: 1000,
                repeat: 3,
                keyframes: [
                    buildFrame(0.00, punchRetract, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.35, punchExtend, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.55, punchFollowThrough, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, punchRetract, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'kick-side-loop': {
                name: 'Kick Drill',
                icon: 'fa-shoe-prints',
                category: 'Action',
                description: 'Repeated front kick drill aligned with the guide soccer-kick swing pose.',
                duration: 1100,
                repeat: 3,
                keyframes: [
                    buildFrame(0.00, kickReady),
                    buildFrame(0.35, kickLift),
                    buildFrame(0.60, kickExtend),
                    buildFrame(1.00, kickReady)
                ]
            },
            'eat-side': {
                name: 'Eat (Side)',
                icon: 'fa-utensils',
                category: 'Daily Activities',
                description: 'Side-view hand-to-mouth eating loop for dual-arm side rigs.',
                duration: 1600,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, {
                        waist: 0,
                        neck: 5,
                        frontShoulder: 34,
                        frontElbow: -96,
                        frontWrist: 0,
                        backShoulder: 0,
                        backElbow: 0,
                        frontHip: -90,
                        frontKnee: 90,
                        frontAnkle: 0,
                        backHip: -70,
                        backKnee: 90,
                        backAnkle: 0
                    }, { contacts: { 'front-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.24, {
                        waist: 0,
                        neck: 7,
                        frontShoulder: 4,
                        frontElbow: -118,
                        frontWrist: 0,
                        backShoulder: 0,
                        backElbow: 0,
                        frontHip: -90,
                        frontKnee: 90,
                        frontAnkle: 0,
                        backHip: -70,
                        backKnee: 90,
                        backAnkle: 0
                    }, { contacts: { 'front-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.44, {
                        waist: 0,
                        neck: 6,
                        frontShoulder: -50,
                        frontElbow: -151,
                        frontWrist: 0,
                        backShoulder: 0,
                        backElbow: 0,
                        frontHip: -90,
                        frontKnee: 90,
                        frontAnkle: 0,
                        backHip: -70,
                        backKnee: 90,
                        backAnkle: 0
                    }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 20 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.62, {
                        waist: 0,
                        neck: 6,
                        frontShoulder: -50,
                        frontElbow: -151,
                        frontWrist: 0,
                        backShoulder: 0,
                        backElbow: 0,
                        frontHip: -90,
                        frontKnee: 90,
                        frontAnkle: 0,
                        backHip: -70,
                        backKnee: 90,
                        backAnkle: 0
                    }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 20 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.82, {
                        waist: 0,
                        neck: 7,
                        frontShoulder: 4,
                        frontElbow: -118,
                        frontWrist: 0,
                        backShoulder: 0,
                        backElbow: 0,
                        frontHip: -90,
                        frontKnee: 90,
                        frontAnkle: 0,
                        backHip: -70,
                        backKnee: 90,
                        backAnkle: 0
                    }, { contacts: { 'front-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, {
                        waist: 0,
                        neck: 5,
                        frontShoulder: 34,
                        frontElbow: -96,
                        frontWrist: 0,
                        backShoulder: 0,
                        backElbow: 0,
                        frontHip: -90,
                        frontKnee: 90,
                        frontAnkle: 0,
                        backHip: -70,
                        backKnee: 90,
                        backAnkle: 0
                    }, { contacts: { 'front-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'drink-side': {
                name: 'Drink (Side)',
                icon: 'fa-mug-hot',
                category: 'Daily Activities',
                description: 'Side-view cup-sip loop with front-path arm motion for dual-arm side rigs.',
                duration: 1400,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: 34, frontElbow: -96, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.24, { waist: 0, neck: -3, frontShoulder: 4, frontElbow: -118, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.36, { waist: 0, neck: -5, frontShoulder: -50, frontElbow: -151, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 20 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.62, { waist: 0, neck: -5, frontShoulder: -50, frontElbow: -151, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'mouth', offsetX: 0, offsetY: 0, iterations: 20 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.80, { waist: 0, neck: -3, frontShoulder: 4, frontElbow: -118, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { contacts: { 'front-hand': { tag: 'sternum', offsetX: -6, offsetY: 42, iterations: 10 } }, layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: 34, frontElbow: -96, frontWrist: 0, backShoulder: 0, backElbow: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'read-book-side-seated': {
                name: 'Read Book (Seated)',
                icon: 'fa-book-open',
                category: 'Daily Activities',
                description: 'Side-view seated reading loop with both hands holding a book near chest height.',
                duration: 2200,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 6, neck: 18, frontShoulder: -38, frontElbow: -92, frontWrist: 8, backShoulder: -22, backElbow: -104, backWrist: -6, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.34, { waist: 7, neck: 22, frontShoulder: -40, frontElbow: -96, frontWrist: 4, backShoulder: -24, backElbow: -108, backWrist: -2, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.66, { waist: 5, neck: 15, frontShoulder: -36, frontElbow: -90, frontWrist: 10, backShoulder: -20, backElbow: -102, backWrist: -8, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 6, neck: 18, frontShoulder: -38, frontElbow: -92, frontWrist: 8, backShoulder: -22, backElbow: -104, backWrist: -6, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'write-side-seated': {
                name: 'Write (Seated)',
                icon: 'fa-pen',
                category: 'Daily Activities',
                description: 'Side-view seated writing loop with small controlled wrist strokes at desk height.',
                duration: 1500,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 8, neck: 20, frontShoulder: -18, frontElbow: -80, frontWrist: -10, backShoulder: -4, backElbow: -72, backWrist: 2, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.25, { waist: 9, neck: 22, frontShoulder: -20, frontElbow: -82, frontWrist: 8, backShoulder: -4, backElbow: -72, backWrist: 2, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.50, { waist: 8, neck: 19, frontShoulder: -16, frontElbow: -78, frontWrist: -14, backShoulder: -5, backElbow: -74, backWrist: 0, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.75, { waist: 9, neck: 22, frontShoulder: -20, frontElbow: -82, frontWrist: 8, backShoulder: -4, backElbow: -72, backWrist: 2, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 8, neck: 20, frontShoulder: -18, frontElbow: -80, frontWrist: -10, backShoulder: -4, backElbow: -72, backWrist: 2, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'type-side-seated': {
                name: 'Type (Seated)',
                icon: 'fa-keyboard',
                category: 'Daily Activities',
                description: 'Side-view seated typing loop with alternating forearm and wrist taps.',
                duration: 1200,
                repeat: Infinity,
                keyframes: [
                    buildFrame(0.00, { waist: 6, neck: 14, frontShoulder: -12, frontElbow: -70, frontWrist: 2, backShoulder: -10, backElbow: -74, backWrist: -2, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.25, { waist: 6, neck: 15, frontShoulder: -14, frontElbow: -74, frontWrist: -8, backShoulder: -8, backElbow: -70, backWrist: 8, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.50, { waist: 5, neck: 13, frontShoulder: -10, frontElbow: -68, frontWrist: 7, backShoulder: -12, backElbow: -76, backWrist: -7, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.75, { waist: 6, neck: 15, frontShoulder: -14, frontElbow: -74, frontWrist: -8, backShoulder: -8, backElbow: -70, backWrist: 8, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 6, neck: 14, frontShoulder: -12, frontElbow: -70, frontWrist: 2, backShoulder: -10, backElbow: -74, backWrist: -2, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'pick-up-drop-side': {
                name: 'Pick Up / Drop Object',
                icon: 'fa-hand-holding',
                category: 'Daily Activities',
                description: 'Side-view pick-up using the front arm, a strong waist fold, and a planted front-leg squat.',
                duration: 2100,
                repeat: 1,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: 4, frontElbow: -8, frontWrist: 0, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, frontAnkle: 0, backHip: 0, backKnee: 0, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.18, { waist: 28, neck: 0, frontShoulder: -22, frontElbow: -4, frontWrist: 0, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: -18, frontKnee: 26, frontAnkle: 0, backHip: 0, backKnee: 0, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.36, { waist: 68, neck: 0, frontShoulder: -68, frontElbow: 0, frontWrist: 0, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: -42, frontKnee: 62, frontAnkle: 0, backHip: 0, backKnee: 0, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.52, { waist: 95, neck: 0, frontShoulder: -95, frontElbow: 0, frontWrist: 0, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: -55, frontKnee: 80, frontAnkle: 0, backHip: 0, backKnee: 0, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.66, { waist: 88, neck: 0, frontShoulder: -68, frontElbow: -42, frontWrist: -6, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: -55, frontKnee: 80, frontAnkle: 0, backHip: 0, backKnee: 0, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(0.82, { waist: 34, neck: 0, frontShoulder: -18, frontElbow: -30, frontWrist: -4, backShoulder: 0, backElbow: 0, backWrist: 0, frontHip: -24, frontKnee: 36, frontAnkle: 0, backHip: 0, backKnee: 0, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: 4, frontElbow: -8, frontWrist: 0, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, frontAnkle: 0, backHip: 0, backKnee: 0, backAnkle: 0 }, { layerOrderOverride: ['back-arm', 'back-leg', 'torso', 'head-neck', 'front-leg', 'front-arm'] })
                ]
            },
            'sit-stand-side': {
                name: 'Sit Down / Stand Up',
                icon: 'fa-chair',
                category: 'Daily Activities',
                description: 'Side-view transition from standing to chair sitting and back to standing.',
                duration: 2200,
                repeat: 1,
                keyframes: [
                    buildFrame(0.00, { waist: 0, neck: 0, frontShoulder: 4, frontElbow: -8, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 }),
                    buildFrame(0.22, { waist: 12, neck: 8, frontShoulder: 12, frontElbow: -24, backShoulder: 4, backElbow: -16, frontHip: -34, frontKnee: 58, backHip: -28, backKnee: 52 }, { dy: 18, partTilts: { 'head-neck': { x: -6, y: 0 } } }),
                    buildFrame(0.44, { waist: 6, neck: 4, frontShoulder: 8, frontElbow: -28, backShoulder: 4, backElbow: -22, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { dy: 42, partTilts: { 'head-neck': { x: -4, y: 0 } } }),
                    buildFrame(0.62, { waist: 6, neck: 4, frontShoulder: 8, frontElbow: -28, backShoulder: 4, backElbow: -22, frontHip: -90, frontKnee: 90, frontAnkle: 0, backHip: -70, backKnee: 90, backAnkle: 0 }, { dy: 42, partTilts: { 'head-neck': { x: -4, y: 0 } } }),
                    buildFrame(0.82, { waist: 12, neck: 8, frontShoulder: 12, frontElbow: -24, backShoulder: 4, backElbow: -16, frontHip: -34, frontKnee: 58, backHip: -28, backKnee: 52 }, { dy: 18, partTilts: { 'head-neck': { x: -6, y: 0 } } }),
                    buildFrame(1.00, { waist: 0, neck: 0, frontShoulder: 4, frontElbow: -8, backShoulder: 0, backElbow: 0, frontHip: 0, frontKnee: 0, backHip: 0, backKnee: 0 })
                ]
            }
        };

        for (const frame of catalog['write-side-seated'].keyframes) {
            frame.jointAngles.waist = 8;
            frame.jointAngles['back-shoulder'] = -4;
            frame.jointAngles['back-elbow'] = -72;
            frame.jointAngles['back-wrist'] = 0;
        }
        catalog.clap = {
            name: 'Clap', icon: 'fa-hands-clapping', category: 'Gestures', duration: 900, repeat: 4,
            smoothContacts: true, easing: 'easeInOut',
            description: 'Both palms meet in front of the chest and separate clearly between claps.',
            keyframes: [[0, .20], [.38, 0], [.45, 0], [.85, .20], [1, .20]].map(([t, gap]) =>
                buildFrame(t, { waist: 0, neck: 0, frontShoulder: -28, frontElbow: -105, frontWrist: 0,
                    backShoulder: -24, backElbow: -100, backWrist: 0 }, {
                    layerOrderOverride: SIDE_NEAR_ARM_LAYER,
                    contacts: Object.fromEntries(['front-hand', 'back-hand'].map((hand, i) => [hand, {
                        targetPart: 'torso', x: .5, y: .32, offsetXRatio: -.55 + (i ? -gap : gap), mirrorSide: true,
                        palmGrip: .55, keepElbowDown: true, preserveBend: true, wristLimit: 15, iterations: 48
                    }]))
                }))
        };
        catalog.sweep = {
            name: 'Sweep', icon: 'fa-broom', category: 'Daily Activities',
            description: 'Two-handed side sweep with a steady torso and a gentle push and return.',
            duration: 2400, repeat: Infinity,
            keyframes: [0, .25, .5, .75, 1].map(t => {
                const swing = Math.sin(t * Math.PI * 2);
                return buildFrame(t, { waist: 4, neck: 12, frontShoulder: -24 - swing * 10,
                    frontElbow: -52 + swing * 8, frontWrist: 0,
                    backShoulder: -38 - swing * 10, backElbow: -62 + swing * 8, backWrist: 0 },
                    { layerOrderOverride: SIDE_NEAR_ARM_LAYER });
            })
        };
        catalog.mop = {
            ...catalog.sweep, name: 'Mop', icon: 'fa-hand-sparkles', duration: 2800,
            description: 'Two-handed mopping with a gentle push and pull and a steady torso.',
            keyframes: catalog.sweep.keyframes.map(frame => ({ ...frame, jointAngles: { ...frame.jointAngles } }))
        };
        for (const [key, name, icon, state] of [
            ['wash-hands', 'Wash Hands', 'fa-hands-bubbles', { neck: 18, frontShoulder: -22, frontElbow: -72, backShoulder: -25, backElbow: -68 }],
            ['fold-clothes', 'Fold Clothes', 'fa-shirt', { neck: 18, frontShoulder: -22, frontElbow: -72, backShoulder: -25, backElbow: -68 }],
            ['carry-file', 'Carry File', 'fa-folder', { frontShoulder: -12, frontElbow: -80, backShoulder: 0, backElbow: 0 }],
            ['carry-tray', 'Carry Tray Balance', 'fa-grip-lines', { frontShoulder: -14, frontElbow: -85, backShoulder: -22, backElbow: -75 }],
            ['carry-object', 'Carry Object', 'fa-box', { frontShoulder: -14, frontElbow: -85, backShoulder: -22, backElbow: -75 }],
            ['place-on-table', 'Place on Table', 'fa-table', { neck: 10, frontShoulder: -25, frontElbow: -70, backShoulder: 0, backElbow: 0 }],
            ['pull-suitcase', 'Pull Suitcase', 'fa-suitcase', { frontShoulder: 20, frontElbow: -10, backShoulder: 0, backElbow: 0 }],
            ['push-cart', 'Push Cart', 'fa-cart-shopping', { frontShoulder: -20, frontElbow: -70, backShoulder: -25, backElbow: -65 }],
            ['pick-from-shelf', 'Pick From Shelf', 'fa-box-open', { frontShoulder: -20, frontElbow: -75, backShoulder: 0, backElbow: 0 }],
            ['cook-stir-pot', 'Cook / Stir Pot', 'fa-utensils', { waist: 4, neck: 14, frontShoulder: -20, frontElbow: -85, backShoulder: -22, backElbow: -75 }],
            ['write-board', 'Write Board', 'fa-chalkboard-user', { frontShoulder: -55, frontElbow: -60, backShoulder: 0, backElbow: 0 }]
        ]) {
            catalog[key] = { name, icon, category: ['place-on-table', 'pull-suitcase', 'push-cart', 'pick-from-shelf'].includes(key) ? 'Object Handling' : 'Daily Activities', duration: key === 'fold-clothes' ? 3200 : 2400, repeat: ['place-on-table', 'pick-from-shelf', 'fold-clothes'].includes(key) ? 1 : 4,
                keyframes: [0, .25, .5, .75, 1].map(t => buildFrame(t, {
                    waist: 0, neck: 0, frontWrist: 0, backWrist: 0, ...state,
                    frontElbow: state.frontElbow + 4 * Math.sin(t * Math.PI * 2)
                }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER,
                    ...(key === 'carry-tray' ? { contacts: JointSystem._buildSideCarryTrayContacts() } : {}) })) };
        }
        catalog['carry-bag'] = {
            name: 'Carry Bag', icon: 'fa-bag-shopping', category: 'Daily Activities',
            description: 'Hold a bag by the side with a small, relaxed arm sway.', duration: 2400, repeat: Infinity,
            keyframes: [0, .25, .5, .75, 1].map(t => buildFrame(t, { waist: 0, neck: 0,
                frontShoulder: -6 + 3 * Math.sin(t * Math.PI * 2), frontElbow: -10, frontWrist: 0,
                backShoulder: 0, backElbow: 0, backWrist: 0 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }))
        };
        catalog['taking-photo-selfie'] = {
            name: 'Taking Photo / Selfie', icon: 'fa-camera', category: 'Communication',
            description: 'Hold a phone forward at eye level, pause for the photo, then relax slightly.', duration: 2600, repeat: Infinity,
            keyframes: [0, .25, .75, 1].map(t => buildFrame(t, { waist: 0, neck: -4,
                frontShoulder: t === 0 || t === 1 ? -82 : -88, frontElbow: -15, frontWrist: 0,
                backShoulder: 0, backElbow: 0, backWrist: 0 }, { layerOrderOverride: SIDE_NEAR_ARM_LAYER }))
        };

        catalog['fan-self'] = {
            name: 'Fan Self', icon: 'fa-fan', category: 'Daily Activities',
            description: 'Gently fan the face with a steady shoulder and a relaxed forearm.',
            duration: 2200, repeat: 4, easing: 'linear',
            keyframes: Array.from({ length: 33 }, (_, i) => {
                const t = i / 32, swing = Math.sin(t * Math.PI * 2);
                return buildFrame(t, { waist: 0, neck: 0, frontShoulder: -24 + 4 * swing,
                    frontElbow: -98 + 14 * swing, frontWrist: 0, backShoulder: 0, backElbow: 0 },
                    { layerOrderOverride: SIDE_NEAR_ARM_LAYER });
            })
        };
        catalog['hand-shaker'] = {
            name: 'Play Hand Shaker', icon: 'fa-music', category: 'Daily Activities',
            description: 'Shake a handheld instrument with a smooth forward and return motion.',
            duration: 1600, repeat: 4, easing: 'linear',
            keyframes: Array.from({ length: 33 }, (_, i) => {
                const t = i / 32, swing = Math.sin(t * Math.PI * 2);
                return buildFrame(t, { waist: 0, neck: 0, frontShoulder: -20 + 6 * swing,
                    frontElbow: -70 + 16 * swing, frontWrist: 0, backShoulder: 0, backElbow: 0 },
                    { layerOrderOverride: SIDE_NEAR_ARM_LAYER });
            })
        };

        const pickup = catalog['pick-up-drop-side'];
        pickup.grounding = 'planted-stance';
        for (const frame of pickup.keyframes) {
            frame.jointAngles['front-hip'] *= 1.2;
            frame.jointAngles['front-knee'] *= 1.5;
            frame.jointAngles['back-hip'] = frame.jointAngles['front-hip'];
            frame.jointAngles['back-knee'] = frame.jointAngles['front-knee'];
        }

        for (const key of ['read-book-side-seated', 'write-side-seated', 'type-side-seated', 'eat-side', 'sit-stand-side']) {
            catalog[key].grounding = 'planted';
            for (const frame of catalog[key].keyframes) {
                for (const joint of ['hip', 'knee', 'ankle']) {
                    frame.jointAngles[`back-${joint}`] = frame.jointAngles[`front-${joint}`] || 0;
                }
            }
        }

        // One stride per leg: contact, loading, mid/terminal stance, pre-swing,
        // initial/mid/terminal swing. The other leg is half a cycle ahead.
        const gait = JointSystem._naturalSideGaitPhases, gaitAt = JointSystem._sampleNaturalSideGait;
        const gaitTimes = [...new Set([0, 1, ...Array.from({ length: 141 }, (_, i) => i / 140), ...gait.flatMap(point => [point[0], (point[0] + .5) % 1]).map(t => Math.round(t * 100) / 100)])].sort((a, b) => a - b);
        catalog['walk-natural-cycle'] = {
            name: 'Natural Walk Cycle (Side)', icon: 'fa-person-walking', category: 'Locomotion',
            description: 'Eight-phase walk with heel contact, weight transfer, toe-off and swing clearance.',
            duration: 1400, repeat: 4, easing: 'linear', grounding: 'gait', naturalGait: true,
            disableCyclicStrideInterpolation: true,
            skipStartIdleBookend: true, skipEndIdleBookend: true,
            semanticAction: 'locomotion.walk', semanticVariant: 'natural-eight-phase',
            footPlantPolicy: 'stance-support-swing-clearance',
            movementPhases: ['initial-contact', 'loading-response', 'mid-stance', 'terminal-stance', 'pre-swing', 'initial-swing', 'mid-swing', 'terminal-swing'],
            keyframes: gaitTimes.map(t => {
                const [hip, knee, pitch] = gaitAt(t), [farHip, farKnee, farPitch] = gaitAt(t + .5);
                const armSwing = Math.cos(t * Math.PI * 2);
                return { ...buildFrame(t, {
                    waist: 0, neck: 0,
                    frontShoulder: 24 * armSwing, frontElbow: -10 + 4 * armSwing, frontWrist: 0,
                    backShoulder: -24 * armSwing, backElbow: -10 - 4 * armSwing, backWrist: 0,
                    frontHip: hip, frontKnee: knee, frontAnkle: pitch - hip - knee,
                    backHip: farHip, backKnee: farKnee, backAnkle: farPitch - farHip - farKnee
                }), gaitPhase: t, layerOrderOverride: [...SIDE_NEAR_ARM_LAYER] };
            })
        };
        const naturalWalk = catalog['walk-natural-cycle'];
        catalog['carry-bag-walk'] = {
            ...naturalWalk, name: 'Carry Bag Walk (Side)', icon: 'fa-bag-shopping',
            description: 'Walk with a bag held low, keeping the free arm swinging naturally.',
            keyframes: naturalWalk.keyframes.map(frame => ({ ...frame,
                jointAngles: { ...frame.jointAngles,
                    'front-shoulder': -6 + 4 * Math.cos(frame.t * Math.PI * 2),
                    'front-elbow': -10, 'front-wrist': 0 }
            }))
        };
        catalog['walk-natural-forward'] = {
            ...naturalWalk, name: 'Natural Walk Forward (Side)', category: 'Travel',
            description: 'Natural side walk over a chosen distance, starting and ending at idle.',
            rootTravel: { x: 180 }, absoluteTravel: false,
            keyframes: naturalWalk.keyframes.map(frame => ({ ...frame, dx: frame.t * 180 }))
        };
        catalog['walk-natural-to-point-and-back'] = {
            ...catalog['walk-natural-forward'], name: 'Natural Walk to Point and Back (Side)',
            icon: 'fa-person-walking-arrow-loop-left', turnAround: true,
            description: 'Natural walk to a chosen point, settle, turn, and walk home to idle.',
            turnAroundForwardKey: 'walk-natural-to-point-and-back',
            turnAroundReturnKey: 'walk-natural-to-point-and-back'
        };
        const runTimes = [...new Set([
            ...Array.from({ length: 101 }, (_, i) => i / 100),
            ...JointSystem._naturalSideRunPhases.flatMap(([t]) => [t, (t + .5) % 1])
        ])].sort((a, b) => a - b);
        catalog['run-natural-cycle'] = {
            name: 'Natural Run Cycle (Side, Experimental)', icon: 'fa-person-running', category: 'Locomotion',
            description: 'Side run with supported loading, toe-off, airborne recovery and idle bookends.',
            duration: 900, repeat: 4, easing: 'linear', grounding: 'gait-run', naturalGait: true,
            disableCyclicStrideInterpolation: true, skipStartIdleBookend: true, skipEndIdleBookend: true,
            semanticAction: 'locomotion.run', semanticVariant: 'natural-side-run',
            keyframes: runTimes.map(t => {
                const [hip, knee, pitch] = JointSystem._sampleNaturalSideGait(t, true);
                const [farHip, farKnee, farPitch] = JointSystem._sampleNaturalSideGait(t + .5, true);
                const swing = Math.cos(2 * Math.PI * t);
                return { ...buildFrame(t, {
                    waist: 0, neck: 0,
                    frontShoulder: 32 * swing, frontElbow: -68 + 10 * swing, frontWrist: 0,
                    backShoulder: -32 * swing, backElbow: -68 - 10 * swing, backWrist: 0,
                    frontHip: hip, frontKnee: knee, frontAnkle: pitch - hip - knee,
                    backHip: farHip, backKnee: farKnee, backAnkle: farPitch - farHip - farKnee
                }), gaitPhase: t, layerOrderOverride: [...SIDE_NEAR_ARM_LAYER] };
            })
        };
        const naturalRun = catalog['run-natural-cycle'];
        catalog['run-natural-forward'] = {
            ...naturalRun, name: 'Natural Run Forward (Side, Experimental)', category: 'Travel',
            description: 'Natural side run over a chosen distance, starting and ending at idle.',
            rootTravel: { x: 240 }, absoluteTravel: false,
            keyframes: naturalRun.keyframes.map(frame => ({ ...frame, dx: frame.t * 240 }))
        };
        catalog['run-natural-to-point-and-back'] = {
            ...catalog['run-natural-forward'], name: 'Natural Run to Point and Back (Side, Experimental)',
            turnAround: true,
            description: 'Natural run to a chosen point, settle, turn, and run home to idle.',
            turnAroundForwardKey: 'run-natural-to-point-and-back',
            turnAroundReturnKey: 'run-natural-to-point-and-back'
        };
        JointSystem._addHumanSideHeadMovements(catalog, ['side-left']);
        JointSystem._normalizeArmatureMovementCatalogEntryDefaults(catalog);
        JointSystem._applyDefaultArmatureMovementCompatibility(catalog, ['side-left']);
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'side-dual-left', {
            label: 'Side Left',
            viewCompatibility: ['side-left']
        });
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._alignPhoneMovementPoses(catalog, JointSystem._buildHumanSideDualArmaturePoseCatalog());
        JointSystem._refineMouthActionContacts(catalog);
        JointSystem._refineDeskHandMovements(catalog, 'side');
        JointSystem._addHandgunViewPresets(catalog, 'side-dual', true);
        JointSystem._addScenarioMovements(catalog, 'side-dual');
        JointSystem._humanSideDualArmatureMovementCatalog = catalog;
        return catalog;
    }

JointSystem._buildHumanSideDualArmatureMovementCatalogRight = function() {
        if (
            JointSystem._humanSideDualArmatureMovementCatalogRight
            && !Object.values(JointSystem._humanSideDualArmatureMovementCatalogRight).some(move => move?.repeat === null)
            && ['nod-yes', 'shake-head', 'look-around', 'look-up-return', 'look-down-return']
                .every(key => !!JointSystem._humanSideDualArmatureMovementCatalogRight[key])
        ) {
            return JointSystem._humanSideDualArmatureMovementCatalogRight;
        }

        const leftCatalog = JointSystem._buildHumanSideDualArmatureMovementCatalog();
        const catalog = {};

        Object.entries(leftCatalog || {}).forEach(([key, move]) => {
            const mirrored = JointSystem._cloneArmatureCatalogEntry(move) || {};
            mirrored.name = JointSystem._makeRightFacingSideText(mirrored.name || '');
            mirrored.description = JointSystem._makeRightFacingSideText(mirrored.description || '');
            mirrored.viewCompatibility = Array.isArray(mirrored.viewCompatibility) && mirrored.viewCompatibility.length
                ? mirrored.viewCompatibility.map(value => value === 'side-left' ? 'side-right' : value)
                : ['side-right'];
            mirrored.keyframes = (move?.keyframes || []).map(frame => {
                const result = JointSystem._cloneArmatureCatalogEntry(frame) || {};
                result.jointAngles = Utils.deepClone(frame?.jointAngles || {});
                result.partAngles = Utils.deepClone(frame?.partAngles || {});
                result.jointTilts = Utils.deepClone(frame?.jointTilts || {});
                result.partTilts = Utils.deepClone(frame?.partTilts || {});
                // Travel dx stays authored as "forward" (positive); the playback
                // layer applies the facing sign, so right-facing must NOT negate it.
                if (typeof frame?.dx === 'number') result.dx = frame.dx;
                if (typeof frame?.dy === 'number') result.dy = frame.dy;
                return result;
            });
            catalog[key] = mirrored;
        });
        Object.keys(catalog).forEach(key => {
            if (catalog[key]?.generatedFromSemanticSchema) {
                delete catalog[key];
            }
        });

        JointSystem._normalizeArmatureMovementCatalogEntryDefaults(catalog);
        JointSystem._applyDefaultArmatureMovementCompatibility(catalog, ['side-right']);
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, 'side-dual-right', {
            label: 'Side Right',
            viewCompatibility: ['side-right']
        });
        JointSystem._tagArmatureCatalogSemanticActions(catalog);
        JointSystem._humanSideDualArmatureMovementCatalogRight = catalog;
        return catalog;
    }


Object.assign(JointSystem.prototype, {

    // ═══════════════════════════════════════════════════════════════

    _normalizeArmatureRoleKey(value = '') {
        const raw = String(value || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        if (!raw) return '';

        const aliases = {
            torso: 'torso',
            body: 'torso',
            trunk: 'torso',
            chest: 'torso',
            'head-neck': 'head-neck',
            headneck: 'head-neck',
            head: 'head-neck',
            neck: 'head-neck',
            'right-arm': 'right-arm',
            rightarm: 'right-arm',
            'r-arm': 'right-arm',
            'left-arm': 'left-arm',
            leftarm: 'left-arm',
            'l-arm': 'left-arm',
            'front-arm': 'front-arm',
            frontarm: 'front-arm',
            'back-arm': 'back-arm',
            backarm: 'back-arm',
            reararm: 'back-arm',
            'right-leg': 'right-leg',
            rightleg: 'right-leg',
            'r-leg': 'right-leg',
            'left-leg': 'left-leg',
            leftleg: 'left-leg',
            'l-leg': 'left-leg',
            'front-leg': 'front-leg',
            frontleg: 'front-leg',
            'back-leg': 'back-leg',
            backleg: 'back-leg',
            rearleg: 'back-leg'
        };
        return aliases[raw] || raw;
    },

    _armatureDeclaresFrontBackRoleModel(root = null) {
        if (!root) return false;
        const normalizeView = (value) => String(value || '')
            .toLowerCase()
            .trim()
            .replace(/[_\s]+/g, '-')
            .replace(/-+/g, '-');
        const declaredViews = [
            root._svgCharacterViewProfileKey,
            root._svgCharacterConfig?.view,
            root._svgCharacterStyling?.view,
            root._ucCharacterStyleConfig?.view,
            root._ucCharacterVariantKey
        ].map(normalizeView).filter(Boolean);
        if (declaredViews.some(view => /^side-(left|right)$/.test(view))) return false;
        if (declaredViews.some(view => /^(front|back)(?:-3q(?:-(left|right))?)?$/.test(view))) return true;

        const promotedProfile = normalizeView(root._armaturePromotedProfile);
        if (promotedProfile === 'front') return true;
        if (promotedProfile === 'side' || promotedProfile === 'side-dual') return false;

        const facing = normalizeView(root._armatureFrontBackFacing || root.armatureFrontBackFacing);
        return facing === 'front' || facing === 'back';
    },

    _getManualAssemblyStableName(obj) {
        if (!obj) return '';
        return String(obj._armatureCanonicalName || obj.name || '');
    },

    _swapLeftRightText(value = '') {
        if (typeof value !== 'string' || !value) return value;
        let out = value;
        out = out
            .replace(/\bRight\b/g, '__ARM_RIGHT_TITLE__')
            .replace(/\bright\b/g, '__ARM_RIGHT_LOWER__')
            .replace(/\bRIGHT\b/g, '__ARM_RIGHT_UPPER__')
            .replace(/\bLeft\b/g, '__ARM_LEFT_TITLE__')
            .replace(/\bleft\b/g, '__ARM_LEFT_LOWER__')
            .replace(/\bLEFT\b/g, '__ARM_LEFT_UPPER__');

        out = out
            .replace(/(^|[-_\s])R(?=($|[-_\s]))/g, '$1__ARM_R_TOKEN__')
            .replace(/(^|[-_\s])r(?=($|[-_\s]))/g, '$1__ARM_r_TOKEN__')
            .replace(/(^|[-_\s])L(?=($|[-_\s]))/g, '$1__ARM_L_TOKEN__')
            .replace(/(^|[-_\s])l(?=($|[-_\s]))/g, '$1__ARM_l_TOKEN__');

        return out
            .replace(/__ARM_RIGHT_TITLE__/g, 'Left')
            .replace(/__ARM_RIGHT_LOWER__/g, 'left')
            .replace(/__ARM_RIGHT_UPPER__/g, 'LEFT')
            .replace(/__ARM_LEFT_TITLE__/g, 'Right')
            .replace(/__ARM_LEFT_LOWER__/g, 'right')
            .replace(/__ARM_LEFT_UPPER__/g, 'RIGHT')
            .replace(/__ARM_R_TOKEN__/g, 'L')
            .replace(/__ARM_r_TOKEN__/g, 'l')
            .replace(/__ARM_L_TOKEN__/g, 'R')
            .replace(/__ARM_l_TOKEN__/g, 'r');
    },

    _classifyManualArmatureAssemblyObject(obj, options = {}) {
        if (!obj) return null;
        const { ignorePromotedRoles = false } = options;
        const ignorePromotedMetadata = ignorePromotedRoles && obj._armaturePromotedFromAssembly;
        const explicitSource = ignorePromotedMetadata
            ? ''
            : (obj._armatureRoleKey || obj._armaturePartKey || '');
        const explicitRole = this._normalizeArmatureRoleKey(explicitSource);
        if (explicitRole === 'head-neck') return { kind: 'head', explicitRole, label: explicitRole };
        if (/(arm)$/.test(explicitRole)) return { kind: 'arm', explicitRole, label: explicitRole };
        if (/(leg)$/.test(explicitRole)) return { kind: 'leg', explicitRole, label: explicitRole };

        const rawParts = [this._getManualAssemblyStableName(obj)];
        if (!ignorePromotedMetadata || !rawParts[0]) {
            rawParts.push(obj.bodyPartData?.partKey || '', obj.bodyPartData?.jointName || '');
        }
        const raw = rawParts.join(' ').toLowerCase();

        if (!raw.trim()) return null;
        if (/(head|neck|face|skull)/.test(raw)) return { kind: 'head', explicitRole: null, label: raw };
        if (/(upper[\s-]*limb|arm|hand|forearm|shoulder)/.test(raw)) return { kind: 'arm', explicitRole: null, label: raw };
        if (/(lower[\s-]*limb|leg|thigh|shin|calf|foot|ankle|hip)/.test(raw)) return { kind: 'leg', explicitRole: null, label: raw };
        return null;
    },

    _getManualAssemblyDirectionalHint(entry) {
        const raw = String(entry?.label || '').toLowerCase();
        if (!raw) return null;

        if (/\bfront\b|\bfore\b|\bnear\b/.test(raw)) return 'front';
        if (/\bback\b|\brear\b|\bfar\b/.test(raw)) return 'back';
        if (/\bright\b|(^|[^a-z0-9])r($|[^a-z0-9])/.test(raw)) return 'right';
        if (/\bleft\b|(^|[^a-z0-9])l($|[^a-z0-9])/.test(raw)) return 'left';
        return null;
    },

    _getManualSideVisualFacing(candidate) {
        const visual = String(candidate?.root?._armatureVisualFacingSide || '').toLowerCase();
        return (visual === 'left' || visual === 'right') ? visual : null;
    },

    _getNamedManualSideRoleOverrides(candidate, facingOverride = null) {
        if (!candidate?.root || !Array.isArray(candidate.children) || candidate.children.length < 4) return new Map();
        if (this._armatureDeclaresFrontBackRoleModel(candidate.root)) return new Map();
        if (this._inferManualAssemblyArmatureProfile(candidate) !== 'side-dual') return new Map();

        const byName = (pattern) => candidate.children.find(obj => pattern.test(this._getManualAssemblyStableName(obj)));
        const head = byName(/\b(head|head[\s-]*neck|neck|face|skull)\b/i);
        const rightArm = byName(/\bright\b.*\b(upper[\s-]*limb|arm|upper[\s-]*arm|forearm|hand|shoulder)\b/i);
        const leftArm = byName(/\bleft\b.*\b(upper[\s-]*limb|arm|upper[\s-]*arm|forearm|hand|shoulder)\b/i);
        const rightLeg = byName(/\bright\b.*\b(lower[\s-]*limb|leg|upper[\s-]*leg|lower[\s-]*leg|thigh|shin|calf|foot|ankle|hip)\b/i);
        const leftLeg = byName(/\bleft\b.*\b(lower[\s-]*limb|leg|upper[\s-]*leg|lower[\s-]*leg|thigh|shin|calf|foot|ankle|hip)\b/i);
        if (!head || !rightArm || !leftArm || !rightLeg || !leftLeg) return new Map();

        const override = String(facingOverride || '').toLowerCase();
        const storedFacing = String(candidate.root._armatureFacingSide || '').toLowerCase();
        const visualFacing = this._getManualSideVisualFacing(candidate);
        const facingSide = (visualFacing === 'left' || visualFacing === 'right')
            ? visualFacing
            : (override === 'left' || override === 'right'
                ? override
                : ((candidate.root._armatureFacingExplicit === true && (storedFacing === 'left' || storedFacing === 'right')) ? storedFacing : 'left'));

        const mapping = new Map();
        mapping.set(head.id, 'head-neck');
        if (facingSide === 'left') {
            mapping.set(leftArm.id, 'front-arm');
            mapping.set(rightArm.id, 'back-arm');
            mapping.set(leftLeg.id, 'front-leg');
            mapping.set(rightLeg.id, 'back-leg');
        } else {
            mapping.set(leftArm.id, 'back-arm');
            mapping.set(rightArm.id, 'front-arm');
            mapping.set(leftLeg.id, 'back-leg');
            mapping.set(rightLeg.id, 'front-leg');
        }
        return mapping;
    },

    _inferManualAssemblyFacingSide(candidate) {
        if (!candidate?.root) return 'right';

        const explicitFacing = String(candidate.root._armatureFacingSide || '').toLowerCase();
        if (candidate.root._armatureFacingExplicit === true && (explicitFacing === 'left' || explicitFacing === 'right')) {
            return explicitFacing;
        }

        const hasNamedLeftAndRightPair = (entries) => {
            if (!Array.isArray(entries) || entries.length < 2) return false;
            let hasLeft = false;
            let hasRight = false;
            entries.forEach(entry => {
                const hint = this._getManualAssemblyDirectionalHint(entry);
                if (hint === 'left') hasLeft = true;
                if (hint === 'right') hasRight = true;
            });
            return hasLeft && hasRight;
        };

        // For named manual side rigs, object order/depth is too ambiguous when
        // the left/right limbs overlap. Default these assemblies to left-facing
        // unless the user has explicitly chosen otherwise.
        if (hasNamedLeftAndRightPair(candidate.arms) && hasNamedLeftAndRightPair(candidate.legs)) {
            return 'left';
        }

        const votes = { left: 0, right: 0 };
        const depthValue = (entry) => Number.isFinite(entry?.obj?.depth) ? entry.obj.depth : 0;
        const centerX = (entry) => entry.obj.x + entry.obj.width * (entry.obj.pivotX ?? 0.5);
        const byFrontDepth = (a, b) => {
            const depthDelta = depthValue(b) - depthValue(a);
            if (Math.abs(depthDelta) > 0.001) return depthDelta;
            return centerX(b) - centerX(a);
        };
        const addVote = (side, weight = 1) => {
            if (side === 'left' || side === 'right') votes[side] += weight;
        };

        [candidate.arms, candidate.legs].forEach(entries => {
            if (!Array.isArray(entries) || entries.length < 2) return;
            const sorted = entries.slice().sort(byFrontDepth);
            const frontHint = this._getManualAssemblyDirectionalHint(sorted[0]);
            const backHint = this._getManualAssemblyDirectionalHint(sorted[sorted.length - 1]);
            // Actor-side convention:
            // - left-facing  => left limbs are front (facing-side, behind in z-depth)
            // - right-facing => right limbs are front (facing-side, behind in z-depth)
            // Depth-front (camera-near) limb is opposite to the facing direction.
            if (frontHint === 'left') addVote('right', 2);
            if (frontHint === 'right') addVote('left', 2);
            if (backHint === 'left') addVote('left', 1.5);
            if (backHint === 'right') addVote('right', 1.5);
        });

        const headEntry = candidate.heads?.[0];
        const facingByFlip = (candidate.root.flipH || headEntry?.obj?.flipH) ? 'left' : 'right';
        addVote(facingByFlip, 0.5);

        return votes.left > votes.right ? 'left' : 'right';
    },

    _getArmatureFacingSide(armature) {
        const stored = String(armature?.root?._armatureFacingSide || '').toLowerCase();
        if (armature?.root?._armatureFacingExplicit === true && (stored === 'left' || stored === 'right')) {
            return stored;
        }
        const ucVariantKey = String(armature?.root?._ucCharacterVariantKey || '').toLowerCase().trim();
        const ucStyleFacing = String(armature?.root?._ucCharacterStyleConfig?.sideFacing || '').toLowerCase().trim();
        if (ucVariantKey === 'side:right' || ucStyleFacing === 'right') return 'right';
        if (ucVariantKey === 'side:left' || ucStyleFacing === 'left') return 'left';
        if (!armature?.root?._armaturePromotedFromAssembly) {
            if (stored === 'left' || stored === 'right') return stored;
            if (this._armatureUsesHumanSideCatalog(armature) || this._armatureUsesHumanSideDualArmCatalog(armature)) {
                return 'left';
            }
            return 'right';
        }
        const candidate = this._collectManualAssemblyArmatureCandidate(this._getArmatureObjects(armature), { ignorePromotedRoles: true });
        const inferred = this._inferManualAssemblyFacingSide(candidate);
        if (inferred === 'left' || inferred === 'right') return inferred;
        return (stored === 'left' || stored === 'right') ? stored : 'right';
    },

    _getArmatureFrontBackFacing(armature) {
        const ucFacing = this._getUniversalCharacterFrontBackFacing?.(armature);
        if (ucFacing === 'front' || ucFacing === 'back') return ucFacing;
        const stored = String(armature?.root?._armatureFrontBackFacing || '').toLowerCase();
        if (stored === 'front' || stored === 'back') return stored;
        return this._inferFrontArmatureViewFacing(armature);
    },

    _getUniversalCharacterFrontBackFacing(armature) {
        const root = armature?.root;
        if (!root) return null;

        const normalizeFacing = (value) => {
            const text = String(value || '')
                .toLowerCase()
                .trim()
                .replace(/3\/4/g, '3q')
                .replace(/\bthree[-\s]*quarter\b/g, '3q')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            if (!text) return null;
            if (text === 'front' || text === 'front-3q' || text.startsWith('front-3q-') || text.startsWith('front3q')) return 'front';
            if (text === 'back' || text === 'back-3q' || text.startsWith('back-3q-') || text.startsWith('back3q')) return 'back';
            return null;
        };

        const stored = normalizeFacing(root._armatureFrontBackFacing);
        if (stored) return stored;

        const variantKey = normalizeFacing(root._ucCharacterVariantKey);
        if (variantKey) return variantKey;

        const styleView = normalizeFacing(root._ucCharacterStyleConfig?.view || root._ucCharacterStyleConfig?.viewVariant);
        if (styleView) return styleView;

        return null;
    },

    _getArmatureFrontBackFacingSignals(armature) {
        const root = armature?.root;
        const normalizeFacing = (value) => {
            const normalized = String(value || '')
                .toLowerCase()
                .trim()
                .replace(/3\/4/g, '3q')
                .replace(/\bthree[-\s]*quarter\b/g, '3q')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');
            if (normalized === 'front' || normalized === 'front-3q' || normalized.startsWith('front-3q-') || normalized.startsWith('front3q')) return 'front';
            if (normalized === 'back' || normalized === 'back-3q' || normalized.startsWith('back-3q-') || normalized.startsWith('back3q')) return 'back';
            return null;
        };
        return {
            variant: normalizeFacing(root?._ucCharacterVariantKey),
            stored: normalizeFacing(root?._armatureFrontBackFacing),
            style: normalizeFacing(root?._ucCharacterStyleConfig?.view || root?._ucCharacterStyleConfig?.viewVariant)
        };
    },

    _resolveDesiredFrontBackFacing(armature, layoutFacing = null) {
        const signals = this._getArmatureFrontBackFacingSignals(armature);
        const normalizedLayout = String(layoutFacing || '').toLowerCase() === 'back'
            ? 'back'
            : (String(layoutFacing || '').toLowerCase() === 'front' ? 'front' : null);

        if (signals.stored) return signals.stored;

        if (
            signals.variant
            && signals.style
            && signals.variant !== signals.style
            && normalizedLayout
            && (normalizedLayout === signals.variant || normalizedLayout === signals.style)
        ) {
            return normalizedLayout;
        }

        return signals.variant || signals.style || normalizedLayout || null;
    },

    _inferFrontArmatureViewFacing(armature) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature) || !armature?.root) return 'front';
        const centerXOf = (obj) => {
            if (!obj) return null;
            const pivotX = Number.isFinite(obj.pivotX) ? obj.pivotX : 0.5;
            return (Number.isFinite(obj.x) ? obj.x : 0) + ((Number.isFinite(obj.width) ? obj.width : 0) * pivotX);
        };

        let frontVotes = 0;
        let backVotes = 0;
        const comparePair = (leftObj, rightObj, weight = 1) => {
            const leftX = centerXOf(leftObj);
            const rightX = centerXOf(rightObj);
            if (!Number.isFinite(leftX) || !Number.isFinite(rightX) || Math.abs(leftX - rightX) < 0.5) return;
            if (leftX > rightX) frontVotes += weight;
            else backVotes += weight;
        };

        comparePair(armature.parts?.['left-arm']?.obj, armature.parts?.['right-arm']?.obj, 2);
        comparePair(armature.parts?.['left-leg']?.obj, armature.parts?.['right-leg']?.obj, 2);

        return backVotes > frontVotes ? 'back' : 'front';
    },

    _setArmatureFrontBackFacing(armature, nextFacing) {
        if (!armature?.root) return false;
        const resolvedFacing = String(nextFacing || '').toLowerCase() === 'back' ? 'back' : 'front';
        const previous = this._getArmatureFrontBackFacing(armature);
        armature.root._armatureFrontBackFacing = resolvedFacing;
        return previous !== resolvedFacing;
    },

    _setArmatureFacingSide(armature, nextFacing, options = {}) {
        if (!armature?.root) return false;
        const resolvedFacing = String(nextFacing || '').toLowerCase() === 'right' ? 'right' : 'left';
        const explicit = options.explicit !== false;
        const sameFacing = armature.root._armatureFacingSide === resolvedFacing;
        const alreadyExplicit = armature.root._armatureFacingExplicit === true;

        if (options.stopMovement !== false) {
            this._stopArmatureMovement(armature);
        }

        armature.root._armatureFacingSide = resolvedFacing;
        if (explicit) {
            armature.root._armatureFacingExplicit = true;
        }

        const forcedNamedPoolRepair = this._forceNamedManualSideAssemblyFromPool(this._getArmatureObjects(armature), resolvedFacing, explicit);
        const forcedNamedRepair = this._forceNamedManualSideArmatureRoles(armature, resolvedFacing, explicit);
        const repaired = this._repairPromotedManualAssemblyArmature(armature);
        const changed = forcedNamedPoolRepair || forcedNamedRepair || repaired || !sameFacing || (explicit && !alreadyExplicit);

        const panel = document.getElementById('armature-panel');
        const facingSelect = panel?.querySelector?.('#armature-facing-side');
        if (facingSelect && facingSelect.value !== resolvedFacing) {
            facingSelect.value = resolvedFacing;
        }

        if (changed) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
            if (options.pushHistory) {
                eventBus.emit('history:push');
            }
        }

        if (options.toast) {
            Utils.showToast(`Side armature set to ${resolvedFacing} facing`, 'success');
        }
        if (options.reopenPanel) {
            this.openArmaturePanel();
        }
        return changed;
    },

    _getArmatureVisualFacingSide(armature) {
        const stored = String(armature?.root?._armatureVisualFacingSide || '').toLowerCase();
        if (stored === 'left' || stored === 'right') return stored;
        const ucVariantKey = String(armature?.root?._ucCharacterVariantKey || '').toLowerCase().trim();
        const ucStyleFacing = String(armature?.root?._ucCharacterStyleConfig?.sideFacing || '').toLowerCase().trim();
        if (ucVariantKey === 'side:right' || ucStyleFacing === 'right') return 'right';
        if (ucVariantKey === 'side:left' || ucStyleFacing === 'left') return 'left';
        return this._getArmatureFacingSide(armature);
    },

    _getArmatureVisualBaseFacingSide(armature) {
        const stored = String(armature?.root?._armatureVisualBaseFacingSide || '').toLowerCase();
        if (stored === 'left' || stored === 'right') return stored;
        const ucVariantKey = String(armature?.root?._ucCharacterVariantKey || '').toLowerCase().trim();
        const ucStyleFacing = String(armature?.root?._ucCharacterStyleConfig?.sideFacing || '').toLowerCase().trim();
        if (ucVariantKey === 'side:right' || ucStyleFacing === 'right') return 'right';
        if (ucVariantKey === 'side:left' || ucStyleFacing === 'left') return 'left';
        return this._getArmatureFacingSide(armature);
    },

    _setArmatureVisualFacingSide(armature, nextFacing) {
        if (!armature?.root) return false;
        const resolvedFacing = String(nextFacing || '').toLowerCase() === 'right' ? 'right' : 'left';
        const previous = this._getArmatureVisualFacingSide(armature);
        armature.root._armatureVisualFacingSide = resolvedFacing;
        const baseStored = String(armature.root._armatureVisualBaseFacingSide || '').toLowerCase();
        if (!(baseStored === 'left' || baseStored === 'right')) {
            armature.root._armatureVisualBaseFacingSide = this._getArmatureFacingSide(armature);
        }
        return previous !== resolvedFacing;
    },

    _buildArmatureJointRefLookup(obj) {
        const jointRefs = {};
        if (!Array.isArray(obj?.joints) || obj.joints.length === 0) return jointRefs;
        [...obj.joints]
            .sort((a, b) => a.position - b.position)
            .forEach(jt => {
                const key = String(jt?.name || '').toLowerCase().replace(/\s+/g, '-');
                if (key) jointRefs[key] = jt;
            });
        return jointRefs;
    },

    _syncArmatureFrontBackDrawOrder(armature) {
        if (!armature?.parts || !Array.isArray(this.objects?.objects)) return false;
        const list = this.objects.objects;
        let changed = false;

        const normalizeDepth = (obj) => {
            const raw = typeof obj?.depth === 'number' ? obj.depth : parseFloat(obj?.depth);
            return Number.isFinite(raw) ? raw : 0;
        };

        const ensureFrontAbove = (frontKey, backKey) => {
            const frontObj = armature.parts?.[frontKey]?.obj;
            const backObj = armature.parts?.[backKey]?.obj;
            if (!frontObj?.id || !backObj?.id || frontObj.id === backObj.id) return;

            const frontIndex = list.findIndex(obj => obj?.id === frontObj.id);
            const backIndex = list.findIndex(obj => obj?.id === backObj.id);
            if (frontIndex >= 0 && backIndex >= 0 && frontIndex < backIndex) {
                const [frontEntry] = list.splice(frontIndex, 1);
                const nextBackIndex = list.findIndex(obj => obj?.id === backObj.id);
                list.splice(nextBackIndex + 1, 0, frontEntry);
                changed = true;
            }

            const frontDepth = normalizeDepth(frontObj);
            const backDepth = normalizeDepth(backObj);
            if (frontDepth < backDepth) {
                frontObj.depth = backDepth;
                backObj.depth = frontDepth;
                changed = true;
            }
        };

        ensureFrontAbove('front-leg', 'back-leg');
        ensureFrontAbove('front-arm', 'back-arm');
        return changed;
    },

    _syncArmatureVisualLayerOrder(armature, visualFacingOverride = null, customOrder = null, layerOptions = {}) {
        if (!armature?.root || !Array.isArray(this.objects?.objects)) return false;

        const list = this.objects.objects;
        const visualFacing = String(visualFacingOverride || this._getArmatureVisualFacingSide(armature)).toLowerCase() === 'right' ? 'right' : 'left';
        const baseFacing = this._getArmatureVisualBaseFacingSide(armature);
        const pool = this._getArmatureObjects(armature).filter(Boolean);
        const candidate = this._collectManualAssemblyArmatureCandidate(pool, { ignorePromotedRoles: true });
        const torso = armature.parts?.torso?.obj || armature.root || candidate?.root;
        const head = armature.parts?.['head-neck']?.obj || candidate?.heads?.[0]?.obj || null;
        const headFeatureIds = new Set(Object.values(head?._facialFeatures || {}).filter(Boolean));
        const headFeatures = list.filter(obj => obj?.id && (
            headFeatureIds.has(obj.id)
            || (head?.id && obj._facialParentHead === head.id)
        ));

        const orderMap = new Map(list.map((obj, index) => [obj?.id, index]));
        const sortByStageOrder = (objs) => [...objs].sort((a, b) => (orderMap.get(a.id) ?? 0) - (orderMap.get(b.id) ?? 0));
        const uniquePush = (arr, seen, obj) => {
            if (!obj?.id || seen.has(obj.id)) return;
            seen.add(obj.id);
            arr.push(obj);
        };

        const seenBack = new Set();
        const seenFront = new Set();
        const backObjects = [];
        const frontObjects = [];
        // The torso's actual scaleX is the reliable mirror signal; the visual-facing fields can
        // desync across chained turn-around flips (leaving the near-side limbs misclassified so an
        // arm stays behind a leg on the return). Canonical armature parts are scaleX=+1.
        const torsoMirrored = Number.isFinite(torso?.scaleX)
            ? torso.scaleX < 0
            : (visualFacing !== baseFacing);
        const classifyVisualLimbSide = (entry) => {
            const hint = this._getManualAssemblyDirectionalHint(entry);
            if (hint === 'left' || hint === 'right') {
                if (visualFacing === 'left') return hint === 'right' ? 'front' : 'back';
                return hint === 'left' ? 'front' : 'back';
            }
            if (hint === 'front' || hint === 'back') {
                const sameAsBase = !torsoMirrored;
                if (sameAsBase) return hint;
                return hint === 'front' ? 'back' : 'front';
            }
            return null;
        };

        const candidateArms = Array.isArray(candidate?.arms) ? candidate.arms : [];
        const candidateLegs = Array.isArray(candidate?.legs) ? candidate.legs : [];
        [...candidateArms, ...candidateLegs].forEach(entry => {
            const side = classifyVisualLimbSide(entry);
            if (side === 'front') uniquePush(frontObjects, seenFront, entry.obj);
            if (side === 'back') uniquePush(backObjects, seenBack, entry.obj);
        });

        if (!frontObjects.length && !backObjects.length) {
            const fallbackEntries = [
                { obj: armature.parts?.['right-arm']?.obj, label: 'right arm' },
                { obj: armature.parts?.['left-arm']?.obj, label: 'left arm' },
                { obj: armature.parts?.['right-leg']?.obj, label: 'right leg' },
                { obj: armature.parts?.['left-leg']?.obj, label: 'left leg' },
                { obj: armature.parts?.['front-arm']?.obj, label: 'front arm' },
                { obj: armature.parts?.['back-arm']?.obj, label: 'back arm' },
                { obj: armature.parts?.['front-leg']?.obj, label: 'front leg' },
                { obj: armature.parts?.['back-leg']?.obj, label: 'back leg' }
            ];
            fallbackEntries.forEach(entry => {
                const side = classifyVisualLimbSide(entry);
                if (side === 'front') uniquePush(frontObjects, seenFront, entry.obj);
                if (side === 'back') uniquePush(backObjects, seenBack, entry.obj);
            });
        }

        const ordered = [];
        const orderedSeen = new Set();
        if (Array.isArray(customOrder) && customOrder.length) {
            customOrder
                .map(key => this._normalizeArmatureRoleKey(key))
                .filter(Boolean)
                .forEach(key => {
                    const obj = key === 'torso'
                        ? (armature.parts?.torso?.obj || armature.root)
                        : armature.parts?.[key]?.obj;
                    uniquePush(ordered, orderedSeen, obj);
                    if (key === 'head-neck') {
                        sortByStageOrder(headFeatures).forEach(feature => uniquePush(ordered, orderedSeen, feature));
                    }
                });
        } else {
            // Within each depth group, side-armature arms should draw above legs so the
            // near-side arm is always in front of the near-side leg — including after a
            // turn-around flip, where raw stage order alone can leave the arm behind.
            const isSideArmature = this._armatureUsesHumanSideCatalog?.(armature)
                || this._armatureUsesHumanSideDualArmCatalog?.(armature);
            const orderLegsBelowArms = (objs) => {
                if (!isSideArmature) return objs;
                const roleOf = (o) => this._normalizeArmatureRoleKey(
                    o?._armatureRoleKey || o?._armaturePartKey || o?.armatureRoleKey || o?.armaturePartKey || ''
                );
                const legs = objs.filter(o => roleOf(o).includes('leg'));
                const others = objs.filter(o => !roleOf(o).includes('leg'));
                return [...legs, ...others];
            };
            const orderedBack = orderLegsBelowArms(sortByStageOrder(backObjects));
            const orderedFront = orderLegsBelowArms(sortByStageOrder(frontObjects));
            orderedBack.forEach(obj => uniquePush(ordered, orderedSeen, obj));
            uniquePush(ordered, orderedSeen, torso);
            uniquePush(ordered, orderedSeen, head);
            sortByStageOrder(headFeatures).forEach(obj => uniquePush(ordered, orderedSeen, obj));
            orderedFront.forEach(obj => uniquePush(ordered, orderedSeen, obj));
        }

        this._promoteArmatureTorsoAboveLegsForLongGarment(armature, ordered);

        this._insertUniversalCharacterGarmentsIntoLayerOrder(armature, ordered, list, {
            keepHeadAboveRobe: true,
            ...layerOptions
        });
        this._enforceThreeQuarterFarArmBehindBodyLayers(armature, ordered, layerOptions);
        const layerValuesChanged = this._stampArmatureLayerValuesFromOrder(ordered);

        if (ordered.length < 3) return false;

        const indexed = ordered
            .map(obj => ({ obj, index: list.findIndex(entry => entry?.id === obj.id) }))
            .filter(entry => entry.index >= 0);
        if (!indexed.length) return false;

        const minIndex = Math.min(...indexed.map(entry => entry.index));
        const idSet = new Set(indexed.map(entry => entry.obj.id));
        const stagedOrder = indexed
            .sort((a, b) => a.index - b.index)
            .map(entry => entry.obj);
        const desiredOrder = ordered.filter(obj => idSet.has(obj.id));

        if (stagedOrder.length === desiredOrder.length && stagedOrder.every((obj, idx) => obj.id === desiredOrder[idx].id)) {
            return layerValuesChanged;
        }

        const remaining = list.filter(obj => !idSet.has(obj?.id));
        remaining.splice(minIndex, 0, ...desiredOrder);
        this.objects.objects = remaining;
        return true;
    },

    _armatureHasLongTorsoGarment(armature) {
        const root = armature?.parts?.torso?.obj || armature?.root || null;
        if (!root) return false;
        if (globalThis.ArmatureGarmentPolicies?.hasLongTorsoGarment?.(root)) {
            return true;
        }
        const styleConfig = root._ucCharacterStyleConfig || root.ucCharacterStyleConfig || {};
        const clothingInput = styleConfig?.clothing || root.clothing || styleConfig || {};
        let clothing = clothingInput;
        if (typeof this._ucGetClothing === 'function') {
            clothing = this._ucGetClothing({ clothing: clothingInput });
        } else if (typeof this._normalizeUniversalCharacterClothing === 'function') {
            clothing = this._normalizeUniversalCharacterClothing(clothingInput);
        }
        if (!clothing || typeof clothing !== 'object') return false;
        if (typeof this._ucLongGarmentCoverage === 'function' && this._ucLongGarmentCoverage(clothing) > 0.05) {
            return true;
        }
        const preset = String(clothing.outfitPreset || '').toLowerCase();
        const topStyle = String(clothing.topStyle || '').toLowerCase();
        return topStyle === 'agbada'
            || ['agbada', 'agbada2', 'agbada3', 'royal-agbada', 'royal-agbada-painted', 'senator', 'senator2', 'senator3', 'senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe', 'chief', 'kaftan', 'buba-wrapper'].includes(preset);
    },

    _promoteArmatureTorsoAboveLegsForLongGarment(armature, desiredOrder) {
        if (!this._armatureHasLongTorsoGarment(armature) || !Array.isArray(desiredOrder) || desiredOrder.length < 3) return false;
        const roleOf = (obj) => String(obj?._armatureRoleKey || obj?._armaturePartKey || '').toLowerCase();
        const torsoIdx = desiredOrder.findIndex(obj => roleOf(obj) === 'torso' || obj?.id === armature?.root?.id);
        if (torsoIdx < 0) return false;
        const torsoObj = desiredOrder[torsoIdx];
        const headObj = armature?.parts?.['head-neck']?.obj || null;
        const headIds = new Set();
        if (headObj?.id) headIds.add(headObj.id);
        Object.values(headObj?._facialFeatures || {}).filter(Boolean).forEach(id => headIds.add(id));
        const isHeadBlock = (obj) => obj?.id && (
            headIds.has(obj.id)
            || roleOf(obj) === 'head-neck'
            || (headObj?.id && obj._facialParentHead === headObj.id)
        );
        const headBlock = desiredOrder.filter(isHeadBlock);
        const headBlockIds = new Set(headBlock.map(obj => obj.id));
        const withoutTorsoHead = desiredOrder.filter(obj => obj?.id !== torsoObj.id && !headBlockIds.has(obj?.id));
        const lastLegIdx = withoutTorsoHead.reduce((last, obj, index) => {
            const role = roleOf(obj);
            return role.includes('leg') ? index : last;
        }, -1);
        if (lastLegIdx < 0) return false;
        const nextOrder = [
            ...withoutTorsoHead.slice(0, lastLegIdx + 1),
            torsoObj,
            ...headBlock,
            ...withoutTorsoHead.slice(lastLegIdx + 1)
        ];
        const changed = nextOrder.length === desiredOrder.length
            && nextOrder.some((obj, index) => obj?.id !== desiredOrder[index]?.id);
        if (!changed) return false;
        desiredOrder.splice(0, desiredOrder.length, ...nextOrder);
        return true;
    },

    _enforceThreeQuarterFarArmBehindBodyLayers(armature, desiredOrder, options = {}) {
        if (!armature?.root || !Array.isArray(desiredOrder) || desiredOrder.length < 3) return false;
        const lean = this._getArmatureFront3qLean?.(armature);
        if (lean !== 'left' && lean !== 'right') return false;
        const facing = this._getArmatureFrontBackFacing?.(armature) === 'back' ? 'back' : 'front';
        // Hands working across the front of the body must not inherit the
        // locomotion rule that tucks the far arm behind the torso.
        if (facing === 'front' && options.threeQuarterLayerOverride === true) return false;
        const profile = JointSystem._getArmatureViewProfile?.(`${facing}-3q-${lean}`);
        const farArmRole = String(profile?.farArm || '').toLowerCase();
        const farArm = armature.parts?.[farArmRole]?.obj || null;
        if (!farArm?.id) return false;

        const normalize = value => String(value || '').trim().toLowerCase();
        const belongsToFarArm = obj => {
            if (!obj?.id) return false;
            if (obj.id === farArm.id) return true;
            const garmentRole = normalize(obj._ucGarmentRoleKey || obj._ucGarmentPartKey);
            const garmentPolicy = normalize(obj._ucGarmentLayerPolicy || obj.ucGarmentLayerPolicy);
            return (obj._ucGarmentForPartId === farArm.id || garmentRole === farArmRole)
                && (
                    obj._ucGarmentLayer === true
                    || obj._ucAgbadaSleeveLayer === true
                    || garmentPolicy === 'sleeve-over-limb'
                    || garmentPolicy === 'follow-parent'
                );
        };
        const farArmBlock = desiredOrder.filter(belongsToFarArm);
        if (!farArmBlock.length) return false;
        const farArmIds = new Set(farArmBlock.map(obj => obj.id));
        const remainder = desiredOrder.filter(obj => !farArmIds.has(obj?.id));
        const nextOrder = [...farArmBlock, ...remainder];
        const changed = nextOrder.some((obj, index) => obj?.id !== desiredOrder[index]?.id);
        if (!changed) return false;
        desiredOrder.splice(0, desiredOrder.length, ...nextOrder);
        return true;
    },

    _stampArmatureLayerValuesFromOrder(desiredOrder) {
        if (!Array.isArray(desiredOrder) || desiredOrder.length < 2) return false;
        const visibleSideRole = (obj) => {
            const role = String(
                obj?._armatureRoleKey
                || obj?.armatureRoleKey
                || obj?._armaturePartKey
                || obj?.armaturePartKey
                || obj?.bodyPartData?.partKey
                || obj?.bodyPartData?.roleKey
                || ''
            ).toLowerCase();
            if (['front-arm', 'front-leg', 'back-arm', 'back-leg', 'torso', 'head-neck'].includes(role)) return role;
            const name = String(obj?.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            if (/\bfront\b/.test(name) && /\barm\b/.test(name)) return 'front-arm';
            if (/\bfront\b/.test(name) && /\bleg\b/.test(name)) return 'front-leg';
            if (/\bback\b/.test(name) && /\barm\b/.test(name)) return 'back-arm';
            if (/\bback\b/.test(name) && /\bleg\b/.test(name)) return 'back-leg';
            if (/\btorso\b/.test(name)) return 'torso';
            if (/\bhead\b/.test(name) || /\bneck\b/.test(name)) return 'head-neck';
            return '';
        };
        const sideLayerOrder = ['back-leg', 'back-arm', 'torso', 'head-neck', 'front-leg', 'front-arm'];
        const sideLayerRank = (obj) => {
            const roleIndex = sideLayerOrder.indexOf(visibleSideRole(obj));
            if (roleIndex >= 0) return roleIndex;

            const garmentPolicy = String(
                obj?._ucGarmentLayerPolicy
                || obj?.ucGarmentLayerPolicy
                || ''
            ).toLowerCase();
            const garmentPartKey = String(
                obj?._ucGarmentPartKey
                || obj?.ucGarmentPartKey
                || ''
            ).toLowerCase();
            // Torso and lower-body drapes cover the legs, but the near arm must
            // remain in front of all body clothing in either side facing.
            if (garmentPolicy === 'lower-over-legs'
                || garmentPolicy === 'body-drape'
                || obj?._svgAfricanGarmentLayer === true
                || obj?._ucAgbadaRobeLayer === true
                || garmentPartKey === 'svg-african-lower-garment'
                || garmentPartKey === 'svg-african-outer-coat'
                || garmentPartKey === 'agbada-robe') {
                return sideLayerOrder.indexOf('front-leg') + 0.5;
            }

            if (garmentPolicy === 'sleeve-over-limb'
                || garmentPolicy === 'follow-parent'
                || obj?._ucAgbadaSleeveLayer === true) {
                const parentId = obj?._ucGarmentForPartId || obj?.ucGarmentForPartId || obj?.pinnedTo || null;
                const parent = parentId
                    ? desiredOrder.find(candidate => candidate?.id === parentId)
                    : null;
                const parentRoleIndex = sideLayerOrder.indexOf(visibleSideRole(parent));
                if (parentRoleIndex >= 0) return parentRoleIndex + 0.1;
            }
            return null;
        };
        const hasVisibleSideRig = desiredOrder.some(obj => visibleSideRole(obj) === 'front-arm')
            && desiredOrder.some(obj => visibleSideRole(obj) === 'front-leg')
            && desiredOrder.some(obj => visibleSideRole(obj) === 'back-arm')
            && desiredOrder.some(obj => visibleSideRole(obj) === 'back-leg');
        const orderForStamp = hasVisibleSideRig
            ? [...desiredOrder].sort((a, b) => {
                const ai = sideLayerRank(a);
                const bi = sideLayerRank(b);
                if (ai != null || bi != null) {
                    return (ai != null ? ai : sideLayerOrder.length) - (bi != null ? bi : sideLayerOrder.length);
                }
                return desiredOrder.indexOf(a) - desiredOrder.indexOf(b);
            })
            : desiredOrder;
        const layers = orderForStamp
            .map(obj => Number(obj?._armatureDrawLayer ?? obj?.armatureDrawLayer ?? obj?.layer))
            .filter(Number.isFinite);
        const baseLayer = layers.length ? Math.min(...layers) : 0;
        let changed = false;
        orderForStamp.forEach((obj, index) => {
            if (!obj?.id) return;
            const nextLayer = baseLayer + index;
            if (Number(obj._armatureDrawLayer) !== nextLayer) {
                obj._armatureDrawLayer = nextLayer;
                changed = true;
            }
        });
        return changed;
    },

    _insertUniversalCharacterGarmentsIntoLayerOrder(armature, desiredOrder, list, options = {}) {
        if (!armature?.root || !Array.isArray(desiredOrder) || !Array.isArray(list)) return false;
        if (typeof this._getUniversalCharacterGarmentObjects !== 'function') return false;

        const garments = this._getUniversalCharacterGarmentObjects(armature)
            .filter(obj => obj?.id && list.some(entry => entry?.id === obj.id));
        if (!garments.length) return false;

        const stageIndex = (obj) => list.findIndex(entry => entry?.id === obj?.id);
        const normalize = (key) => this._normalizeArmatureRoleKey
            ? this._normalizeArmatureRoleKey(key)
            : String(key || '').toLowerCase();
        const objectRole = (obj) => normalize(obj?._armatureRoleKey || obj?._armaturePartKey || '');
        const garmentRole = (obj) => normalize(obj?._ucGarmentRoleKey || obj?._ucGarmentPartKey || '');
        const garmentLayerPolicy = (obj) => normalize(obj?._ucGarmentLayerPolicy || obj?.ucGarmentLayerPolicy || '');
        const pull = (obj) => {
            const idx = desiredOrder.findIndex(entry => entry?.id === obj?.id);
            if (idx >= 0) desiredOrder.splice(idx, 1);
        };
        const insertAfterIndex = (anchorIdx, objs) => {
            if (anchorIdx < 0 || !objs.length) return false;
            const anchorObj = desiredOrder[anchorIdx] || null;
            if (!anchorObj?.id) return false;
            let offset = 1;
            let inserted = false;
            objs
                .sort((a, b) => stageIndex(a) - stageIndex(b))
                .forEach(obj => {
                    pull(obj);
                    const currentAnchorIdx = desiredOrder.findIndex(entry => entry?.id === anchorObj.id);
                    if (currentAnchorIdx < 0) return;
                    desiredOrder.splice(currentAnchorIdx + offset, 0, obj);
                    offset += 1;
                    inserted = true;
                });
            return inserted;
        };
        const findRoleIndex = (role) => {
            const normalizedRole = normalize(role);
            const partObj = armature.parts?.[normalizedRole]?.obj || null;
            return desiredOrder.findIndex(obj => (
                obj?.id && (
                    obj.id === partObj?.id
                    || objectRole(obj) === normalizedRole
                )
            ));
        };
        const sleevesForRole = (role) => {
            const normalizedRole = normalize(role);
            const partObj = armature.parts?.[normalizedRole]?.obj || null;
            return garments.filter(obj => {
                if (!obj?._ucAgbadaSleeveLayer && garmentLayerPolicy(obj) !== 'sleeve-over-limb') return false;
                if (obj._ucGarmentForPartId && obj._ucGarmentForPartId === partObj?.id) return true;
                return garmentRole(obj) === normalizedRole;
            });
        };

        let changed = false;
        ['right-arm', 'back-arm', 'left-arm', 'front-arm'].forEach(role => {
            const idx = findRoleIndex(role);
            const sleeves = sleevesForRole(role);
            if (insertAfterIndex(idx, sleeves)) changed = true;
        });

        const continuousLowerGarments = garments.filter(obj => (
            garmentLayerPolicy(obj) === 'lower-over-legs'
            || obj?._ucGarmentPartKey === 'svg-african-lower-garment'
        ));
        if (continuousLowerGarments.length) {
            const legIndexes = ['right-leg', 'left-leg', 'front-leg', 'back-leg']
                .map(role => findRoleIndex(role))
                .filter(idx => idx >= 0);
            const lowerBodyIdx = legIndexes.length ? Math.max(...legIndexes) : -1;
            if (insertAfterIndex(lowerBodyIdx, continuousLowerGarments)) changed = true;
        }

        const robes = garments.filter(obj => (
            garmentLayerPolicy(obj) === 'body-drape'
            || obj._ucAgbadaRobeLayer
            || obj._ucGarmentPartKey === 'agbada-robe'
            || obj._ucGarmentPartKey === 'svg-african-body-drape'
            || obj._ucGarmentPartKey === 'svg-african-outer-coat'
        ));
        if (robes.length) {
            const roleIndexes = (...roles) => roles
                .map(role => findRoleIndex(role))
                .filter(idx => idx >= 0);
            const sleeveIndexes = garments
                .filter(obj => obj?._ucAgbadaSleeveLayer || garmentLayerPolicy(obj) === 'sleeve-over-limb')
                .map(obj => desiredOrder.findIndex(entry => entry?.id === obj.id))
                .filter(idx => idx >= 0);
            const lowerGarmentIndexes = continuousLowerGarments
                .map(obj => desiredOrder.findIndex(entry => entry?.id === obj.id))
                .filter(idx => idx >= 0);
            const torsoIdx = findRoleIndex('torso');
            const armIndexes = roleIndexes('right-arm', 'left-arm', 'front-arm', 'back-arm');
            const hasSideArmOrder = findRoleIndex('front-arm') >= 0 && findRoleIndex('back-arm') >= 0;
            const robeMode = String(options.agbadaArmLayerMode || (hasSideArmOrder ? 'respect-arm-order' : '')).toLowerCase();
            let bodyIdx;
            if (robeMode === 'respect-arm-order' && torsoIdx >= 0) {
                const firstFrontArmIdx = Math.min(
                    ...armIndexes.filter(idx => idx > torsoIdx),
                    Number.POSITIVE_INFINITY
                );
                const anchoredIndexes = [
                    ...roleIndexes('torso', 'right-leg', 'left-leg', 'front-leg', 'back-leg'),
                    ...armIndexes.filter(idx => idx < firstFrontArmIdx),
                    ...sleeveIndexes.filter(idx => idx < firstFrontArmIdx),
                    ...lowerGarmentIndexes
                ];
                bodyIdx = anchoredIndexes.length ? Math.max(...anchoredIndexes) : torsoIdx;
            } else {
                bodyIdx = Math.max(
                    findRoleIndex('torso'),
                    findRoleIndex('right-leg'),
                    findRoleIndex('left-leg'),
                    findRoleIndex('front-leg'),
                    findRoleIndex('back-leg'),
                    findRoleIndex('right-arm'),
                    findRoleIndex('left-arm'),
                    findRoleIndex('front-arm'),
                    findRoleIndex('back-arm'),
                    ...sleeveIndexes,
                    ...lowerGarmentIndexes
                );
            }
            if (insertAfterIndex(bodyIdx, robes)) changed = true;

            if (options.keepHeadAboveRobe !== false) {
                const headObjs = desiredOrder.filter(obj => objectRole(obj) === 'head-neck' || obj?._facialParentHead);
                const robeIdx = desiredOrder.findIndex(obj => robes.some(robe => robe?.id === obj?.id));
                if (robeIdx >= 0 && headObjs.length && headObjs.some(obj => desiredOrder.findIndex(entry => entry?.id === obj.id) < robeIdx)) {
                    const robeObj = desiredOrder[robeIdx];
                    headObjs.forEach(pull);
                    const currentRobeIdx = desiredOrder.findIndex(obj => obj?.id === robeObj?.id);
                    if (currentRobeIdx >= 0) {
                        headObjs
                            .sort((a, b) => stageIndex(a) - stageIndex(b))
                            .forEach((obj, offset) => desiredOrder.splice(currentRobeIdx + 1 + offset, 0, obj));
                    }
                    changed = true;
                }
            }
        }

        return changed;
    },

    _classifyArmatureEntryVisualSide(entry, visualFacing, baseFacing) {
        const hint = this._getManualAssemblyDirectionalHint(entry);
        if (hint === 'left' || hint === 'right') {
            if (visualFacing === 'left') return hint === 'right' ? 'front' : 'back';
            return hint === 'left' ? 'front' : 'back';
        }
        if (hint === 'front' || hint === 'back') {
            const sameAsBase = visualFacing === baseFacing;
            if (sameAsBase) return hint;
            return hint === 'front' ? 'back' : 'front';
        }
        return null;
    },

    _relabelArmatureJointChainOnObject(obj, targetPartKey) {
        if (!obj || !targetPartKey) return false;
        const specs = this._getArmaturePromotionJointSpecs(targetPartKey);
        if (!specs.length) return false;
        const expectedDirection = this._getArmaturePromotionJointDirection(targetPartKey);
        const sortedExisting = Array.isArray(obj.joints)
            ? [...obj.joints].sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))
            : [];

        if (sortedExisting.length !== specs.length) {
            return this._applyArmatureJointChainToObject(obj, targetPartKey);
        }

        const direction = StageObject.getJointDirectionMeta(expectedDirection);
        obj._armatureRoleKey = targetPartKey;
        obj._armaturePartKey = targetPartKey;
        obj.jointDirection = expectedDirection;
        obj.jointContours = true;
        obj.joints = specs.map((spec, index) => {
            const existing = sortedExisting[index] || {};
            const position = Math.max(0.01, Math.min(0.99, spec.position));
            const desiredCrossOffset = Number.isFinite(spec.crossOffset) ? spec.crossOffset : null;
            const crossOffset = Number.isFinite(existing?.crossOffset)
                ? existing.crossOffset
                : (desiredCrossOffset ?? (
                    obj._getShapeCrossCenterAtPosition
                        ? obj._getShapeCrossCenterAtPosition(position, direction)
                        : 0.5
                ));
            return {
                id: existing?.id || Utils.generateId('jt'),
                name: spec.name,
                position,
                crossOffset: Math.max(0.05, Math.min(0.95, Number.isFinite(crossOffset) ? crossOffset : 0.5)),
                angle: existing?.angle ?? 0,
                tiltX: existing?.tiltX ?? 0,
                tiltY: existing?.tiltY ?? 0,
                contourSize: existing?.contourSize ?? null,
                contourColor: existing?.contourColor ?? null
            };
        });
        return true;
    },

    _syncArmatureVisualJointPrefixes(armature, visualFacingOverride = null) {
        if (!armature?.root) return false;
        if (!(this._armatureUsesHumanSideCatalog(armature) || this._armatureUsesHumanSideDualArmCatalog(armature))) {
            return false;
        }

        const list = this.objects?.objects || [];
        const torso = armature.parts?.torso?.obj || armature.root;
        const torsoIndex = list.findIndex(obj => obj?.id === torso?.id);
        if (!torso?.id || torsoIndex < 0) return false;

        const pool = this._getArmatureObjects(armature).filter(Boolean);
        const candidate = this._collectManualAssemblyArmatureCandidate(pool, { ignorePromotedRoles: true });

        const workEntries = [];
        const addEntry = (obj, kind) => {
            if (!obj?.id) return;
            if (workEntries.some(entry => entry.obj.id === obj.id)) return;
            const stageIndex = list.findIndex(entry => entry?.id === obj.id);
            if (stageIndex < 0) return;
            workEntries.push({ obj, kind, stageIndex });
        };

        (candidate?.arms || []).forEach(entry => addEntry(entry.obj, 'arm'));
        (candidate?.legs || []).forEach(entry => addEntry(entry.obj, 'leg'));

        const fallbackEntries = [
            { obj: armature.parts?.['right-arm']?.obj, kind: 'arm' },
            { obj: armature.parts?.['left-arm']?.obj, kind: 'arm' },
            { obj: armature.parts?.['front-arm']?.obj, kind: 'arm' },
            { obj: armature.parts?.['back-arm']?.obj, kind: 'arm' },
            { obj: armature.parts?.['right-leg']?.obj, kind: 'leg' },
            { obj: armature.parts?.['left-leg']?.obj, kind: 'leg' },
            { obj: armature.parts?.['front-leg']?.obj, kind: 'leg' },
            { obj: armature.parts?.['back-leg']?.obj, kind: 'leg' }
        ];
        fallbackEntries.forEach(entry => addEntry(entry.obj, entry.kind));

        const relabelGroup = (entries, frontPartKey, backPartKey) => {
            const sorted = [...entries].sort((a, b) => a.stageIndex - b.stageIndex);
            if (!sorted.length) return false;
            let localChanged = false;

            if (sorted.length === 1) {
                const only = sorted[0];
                const targetPartKey = only.stageIndex > torsoIndex ? frontPartKey : backPartKey;
                if (this._relabelArmatureJointChainOnObject(only.obj, targetPartKey)) {
                    localChanged = true;
                }
                return localChanged;
            }

            const backEntry = sorted[0];
            const frontEntry = sorted[sorted.length - 1];
            if (this._relabelArmatureJointChainOnObject(backEntry.obj, backPartKey)) {
                localChanged = true;
            }
            if (frontEntry.obj.id !== backEntry.obj.id && this._relabelArmatureJointChainOnObject(frontEntry.obj, frontPartKey)) {
                localChanged = true;
            }

            return localChanged;
        };

        let changed = false;
        const armEntries = workEntries.filter(entry => entry.kind === 'arm');
        const legEntries = workEntries.filter(entry => entry.kind === 'leg');
        if (relabelGroup(armEntries, 'front-arm', 'back-arm')) changed = true;
        if (relabelGroup(legEntries, 'front-leg', 'back-leg')) changed = true;

        if (changed) {
            Object.values(armature.parts || {}).forEach(part => {
                if (part?.obj?.id) {
                    part.joints = this._buildArmatureJointRefLookup(part.obj);
                }
            });
        }

        return changed;
    },

    _swapArmatureDisplayedLeftRightNames(armature) {
        const objects = this._getArmatureObjects(armature).filter(Boolean);
        if (!objects.length) return false;
        let changed = false;

        objects.forEach(obj => {
            if (typeof obj._armatureCanonicalName !== 'string' || !obj._armatureCanonicalName) {
                obj._armatureCanonicalName = String(obj.name || '');
            }
            if (typeof obj.name === 'string' && obj.name) {
                const swappedName = this._swapLeftRightText(obj.name);
                if (swappedName !== obj.name) {
                    obj.name = swappedName;
                    changed = true;
                }
            }
        });

        return changed;
    },

    _mirrorFrontArmatureBodyTagLayout(armature) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature)) return false;
        let changed = false;
        this._getArmatureObjects(armature).forEach(obj => {
            if (!Array.isArray(obj?.bodyTags) || !obj.bodyTags.length) return;
            obj.bodyTags = obj.bodyTags.map(tag => {
                const nextX = Number.isFinite(tag?.x)
                    ? Math.round((1 - tag.x) * 1000) / 1000
                    : tag?.x;
                if (Number.isFinite(tag?.x) && Math.abs(nextX - tag.x) > 0.0005) {
                    changed = true;
                }
                return {
                    ...tag,
                    x: nextX
                };
            });
        });
        return changed;
    },

    _restoreArmatureCanonicalNames(armature) {
        const objects = this._getArmatureObjects(armature).filter(Boolean);
        if (!objects.length) return false;
        let changed = false;
        objects.forEach(obj => {
            if (typeof obj?._armatureCanonicalName !== 'string' || !obj._armatureCanonicalName) return;
            if (obj.name !== obj._armatureCanonicalName) {
                obj.name = obj._armatureCanonicalName;
                changed = true;
            }
        });
        return changed;
    },

    _applyFrontArmatureDisplayedNames(armature, facing = 'front') {
        const objects = this._getArmatureObjects(armature).filter(Boolean);
        if (!objects.length) return false;
        let changed = false;

        objects.forEach(obj => {
            if (typeof obj._armatureCanonicalName !== 'string' || !obj._armatureCanonicalName) {
                obj._armatureCanonicalName = String(obj.name || '');
            }
            const canonicalName = String(obj._armatureCanonicalName || '');
            const nextName = canonicalName;
            if (obj.name !== nextName) {
                obj.name = nextName;
                changed = true;
            }
        });

        return changed;
    },

    _reassignFrontArmatureViewRoles(armature, facing = 'front') {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature)) return false;
        const objects = this._getArmatureObjects(armature);
        const candidate = this._collectManualAssemblyArmatureCandidate(objects, { ignorePromotedRoles: true });
        if (!candidate) return false;

        const neutralizeExplicitRoles = (entries = []) => entries.map(entry => ({
            ...entry,
            explicitRole: null
        }));
        const neutralCandidate = {
            ...candidate,
            heads: neutralizeExplicitRoles(candidate.heads),
            arms: neutralizeExplicitRoles(candidate.arms),
            legs: neutralizeExplicitRoles(candidate.legs)
        };

        const assignments = this._buildManualAssemblyArmatureAssignments(neutralCandidate, 'front', {
            frontBackFacing: String(facing || '').toLowerCase() === 'back' ? 'back' : 'front'
        });
        if (!assignments) return false;

        let changed = false;
        [candidate.root, ...candidate.children].forEach(obj => {
            const roleKey = assignments.get(obj.id);
            if (!roleKey) return;
            if (obj._armatureRoleKey !== roleKey) {
                obj._armatureRoleKey = roleKey;
                changed = true;
            }
            if (obj._armaturePartKey !== roleKey) {
                obj._armaturePartKey = roleKey;
                changed = true;
            }
            if (obj.id !== candidate.root.id && this._applyArmatureJointChainToObject(obj, roleKey)) {
                changed = true;
            }
        });

        return changed;
    },

    _captureFrontArmatureViewLayout(armature, options = {}) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature) || !armature?.root) return null;
        const force = options.force === true;
        const existingLayout = armature.root._armatureFrontViewLayout;
        const storedFacing = this._getArmatureFrontBackFacing(armature);
        if (!force && existingLayout) {
            if (existingLayout._torso || storedFacing !== 'front') {
                return existingLayout;
            }
        }
        if (storedFacing !== 'front' && !existingLayout) {
            return null;
        }

        const snapshot = {};
        const cloneValue = (value, fallback = null) => {
            if (value === undefined) return fallback;
            try {
                return JSON.parse(JSON.stringify(value));
            } catch (_) {
                if (Array.isArray(value)) return value.map(item => ({ ...(item || {}) }));
                if (value && typeof value === 'object') return { ...value };
                return value;
            }
        };
        const cloneJoints = (obj) => Array.isArray(obj?.joints) ? cloneValue(obj.joints, []) : [];
        const rootObj = armature.parts?.torso?.obj || armature.root;
        if (rootObj?.id) {
            snapshot._root = {
                x: Number.isFinite(rootObj.x) ? rootObj.x : 0,
                y: Number.isFinite(rootObj.y) ? rootObj.y : 0
            };
            snapshot._torso = {
                id: rootObj.id,
                jointDirection: rootObj.jointDirection || null,
                jointBaseAngle: Number.isFinite(rootObj.jointBaseAngle) ? rootObj.jointBaseAngle : 0,
                joints: cloneJoints(rootObj),
                jointContours: cloneValue(rootObj.jointContours, false)
            };
        }
        ['head-neck', 'left-arm', 'right-arm', 'left-leg', 'right-leg'].forEach(partKey => {
            const obj = armature.parts?.[partKey]?.obj;
            if (!obj?.id) return;
            snapshot[partKey] = {
                pinTargetType: obj.pinTargetType || 'anchor',
                pinJointId: obj.pinJointId || null,
                pinJointName: obj.pinJointName || null,
                pinAnchorX: Number.isFinite(obj.pinAnchorX) ? obj.pinAnchorX : 0.5,
                pinAnchorY: Number.isFinite(obj.pinAnchorY) ? obj.pinAnchorY : 0.5,
                pinOffsetX: Number.isFinite(obj.pinOffsetX) ? obj.pinOffsetX : 0,
                pinOffsetY: Number.isFinite(obj.pinOffsetY) ? obj.pinOffsetY : 0,
                x: Number.isFinite(obj.x) ? obj.x : 0,
                y: Number.isFinite(obj.y) ? obj.y : 0
            };
        });

        armature.root._armatureFrontViewLayout = snapshot;
        return snapshot;
    },

    _getFrontArmatureViewLayoutSource(partKey, facing, frontLayout) {
        if (!frontLayout || typeof frontLayout !== 'object') return null;
        return frontLayout[partKey] || null;
    },

    _applyFrontArmatureViewLayout(armature, nextFacing, options = {}) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature) || !armature?.root) return false;
        const resolvedFacing = String(nextFacing || '').toLowerCase() === 'back' ? 'back' : 'front';
        const frontLayout = this._captureFrontArmatureViewLayout(armature, {
            force: options.refreshFrontLayout === true
        });
        if (!frontLayout) return false;

        let changed = false;
        if (this._usesFrontBackWaistOnlyTorsoModel?.(armature)) {
            const torsoObj = armature.parts?.torso?.obj || armature.root;
            const torsoSnapshot = frontLayout._torso;
            if (torsoObj?.id && torsoSnapshot?.id === torsoObj.id && Array.isArray(torsoSnapshot.joints)) {
                const current = (() => {
                    try { return JSON.stringify(torsoObj.joints || []); } catch (_) { return ''; }
                })();
                const next = (() => {
                    try { return JSON.stringify(torsoSnapshot.joints || []); } catch (_) { return ''; }
                })();
                if (current !== next) {
                    try {
                        torsoObj.joints = JSON.parse(JSON.stringify(torsoSnapshot.joints));
                    } catch (_) {
                        torsoObj.joints = torsoSnapshot.joints.map(jt => ({ ...(jt || {}) }));
                    }
                    if (torsoSnapshot.jointDirection) torsoObj.jointDirection = torsoSnapshot.jointDirection;
                    if (Number.isFinite(torsoSnapshot.jointBaseAngle)) torsoObj.jointBaseAngle = torsoSnapshot.jointBaseAngle;
                    if (armature.parts?.torso) {
                        armature.parts.torso.joints = this._buildArmatureJointRefLookup(torsoObj);
                    }
                    changed = true;
                }
                if (torsoObj.jointContours !== torsoSnapshot.jointContours) {
                    torsoObj.jointContours = torsoSnapshot.jointContours;
                    changed = true;
                }
            }
        }
        ['head-neck', 'left-arm', 'right-arm', 'left-leg', 'right-leg'].forEach(partKey => {
            const obj = armature.parts?.[partKey]?.obj;
            const source = this._getFrontArmatureViewLayoutSource(partKey, resolvedFacing, frontLayout);
            if (!obj?.id || !source) return;

            const nextTargetType = source.pinTargetType || 'anchor';
            const nextJointId = nextTargetType === 'joint' ? (source.pinJointId || null) : null;
            const nextJointName = nextTargetType === 'joint' ? (source.pinJointName || null) : null;
            const nextAnchorX = Number.isFinite(source.pinAnchorX) ? source.pinAnchorX : (obj.pinAnchorX ?? 0.5);
            const nextAnchorY = Number.isFinite(source.pinAnchorY) ? source.pinAnchorY : (obj.pinAnchorY ?? 0.5);
            const nextOffsetX = Number.isFinite(source.pinOffsetX) ? source.pinOffsetX : (obj.pinOffsetX || 0);
            const nextOffsetY = Number.isFinite(source.pinOffsetY) ? source.pinOffsetY : (obj.pinOffsetY || 0);

            if ((obj.pinTargetType || 'anchor') !== nextTargetType) {
                obj.pinTargetType = nextTargetType;
                changed = true;
            }
            if ((obj.pinJointId || null) !== nextJointId) {
                obj.pinJointId = nextJointId;
                changed = true;
            }
            if ((obj.pinJointName || null) !== nextJointName) {
                obj.pinJointName = nextJointName;
                changed = true;
            }
            if (Math.abs((obj.pinAnchorX ?? 0.5) - nextAnchorX) > 0.0005) {
                obj.pinAnchorX = nextAnchorX;
                changed = true;
            }
            if (Math.abs((obj.pinAnchorY ?? 0.5) - nextAnchorY) > 0.0005) {
                obj.pinAnchorY = nextAnchorY;
                changed = true;
            }
            if (Math.abs((obj.pinOffsetX || 0) - nextOffsetX) > 0.0005) {
                obj.pinOffsetX = nextOffsetX;
                changed = true;
            }
            if (Math.abs((obj.pinOffsetY || 0) - nextOffsetY) > 0.0005) {
                obj.pinOffsetY = nextOffsetY;
                changed = true;
            }

            if (!obj.pinnedTo) {
                if (Number.isFinite(source.x) && Math.abs((obj.x || 0) - source.x) > 0.0005) {
                    obj.x = source.x;
                    changed = true;
                }
                if (Number.isFinite(source.y) && Math.abs((obj.y || 0) - source.y) > 0.0005) {
                    obj.y = source.y;
                    changed = true;
                }
            }
        });

        return changed;
    },

    _detectFrontArmaturePairLayoutFacing(leftObj, rightObj) {
        if (!leftObj?.id || !rightObj?.id) return null;

        const leftAnchor = Number.isFinite(leftObj.pinAnchorX) ? leftObj.pinAnchorX : null;
        const rightAnchor = Number.isFinite(rightObj.pinAnchorX) ? rightObj.pinAnchorX : null;
        if (leftAnchor != null && rightAnchor != null && Math.abs(leftAnchor - rightAnchor) > 0.01) {
            return leftAnchor > rightAnchor ? 'front' : 'back';
        }

        const centerXOf = (obj) => {
            if (!obj) return null;
            const pivotX = Number.isFinite(obj.pivotX) ? obj.pivotX : 0.5;
            return (Number.isFinite(obj.x) ? obj.x : 0) + ((Number.isFinite(obj.width) ? obj.width : 0) * pivotX);
        };
        const leftX = centerXOf(leftObj);
        const rightX = centerXOf(rightObj);
        if (!Number.isFinite(leftX) || !Number.isFinite(rightX) || Math.abs(leftX - rightX) < 0.5) {
            return null;
        }
        return leftX > rightX ? 'front' : 'back';
    },

    _getStoredFrontArmatureFacing(armature) {
        const stored = String(armature?.root?._armatureFrontBackFacing || '').toLowerCase();
        if (stored === 'front' || stored === 'back') return stored;

        const variantKey = String(armature?.root?._ucCharacterVariantKey || '').toLowerCase();
        if (variantKey === 'front' || variantKey === 'back') return variantKey;

        const styleView = String(armature?.root?._ucCharacterStyleConfig?.view || '').toLowerCase();
        if (styleView === 'front' || styleView === 'back') return styleView;
        return null;
    },

    _repairFrontBackArmatureJointRoleNames(armature) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature) || !armature?.parts) return false;
        let changed = false;
        const facing = this._getArmatureFrontBackFacing(armature);
        const centerX = (obj) => (Number(obj?.x) || 0) + ((Number(obj?.width) || 0) * (Number.isFinite(obj?.pivotX) ? obj.pivotX : 0.5));
        const assignStageSidePair = (leftKey, rightKey) => {
            const objects = [armature.parts?.[leftKey]?.obj, armature.parts?.[rightKey]?.obj]
                .filter((obj, index, arr) => obj?.id && arr.findIndex(entry => entry?.id === obj.id) === index)
                .sort((a, b) => centerX(a) - centerX(b));
            if (objects.length < 2) return;

            // Front view: the character's anatomical right is on stage-left.
            // Back view: anatomical right is on stage-right.
            const nextLeftObj = facing === 'back' ? objects[0] : objects[1];
            const nextRightObj = facing === 'back' ? objects[1] : objects[0];
            if (armature.parts[leftKey]?.obj?.id !== nextLeftObj.id) {
                armature.parts[leftKey] = { ...(armature.parts[leftKey] || {}), obj: nextLeftObj };
                changed = true;
            }
            if (armature.parts[rightKey]?.obj?.id !== nextRightObj.id) {
                armature.parts[rightKey] = { ...(armature.parts[rightKey] || {}), obj: nextRightObj };
                changed = true;
            }
        };
        if (facing === 'front' || facing === 'back') {
            assignStageSidePair('left-arm', 'right-arm');
            assignStageSidePair('left-leg', 'right-leg');
        }
        const displayNameMap = {
            'head-neck': 'Head Neck',
            'right-arm': 'Right Arm',
            'left-arm': 'Left Arm',
            'right-leg': 'Right Leg',
            'left-leg': 'Left Leg'
        };
        ['head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg'].forEach(partKey => {
            const obj = armature.parts?.[partKey]?.obj;
            if (!obj?.id) return;
            if (displayNameMap[partKey] && obj.name !== displayNameMap[partKey]) {
                obj.name = displayNameMap[partKey];
                obj._armatureCanonicalName = displayNameMap[partKey];
                changed = true;
            }
            if (obj._armatureRoleKey !== partKey) {
                obj._armatureRoleKey = partKey;
                changed = true;
            }
            if (obj._armaturePartKey !== partKey) {
                obj._armaturePartKey = partKey;
                changed = true;
            }
            if (this._applyArmatureJointChainToObject(obj, partKey)) {
                changed = true;
            }
            armature.parts[partKey].joints = this._buildArmatureJointRefLookup(obj);
        });
        if (changed && !this._usesFrontBackWaistOnlyTorsoModel?.(armature)) {
            this._ensureArmatureTorsoAttachmentRig(armature);
        }
        return changed;
    },

    _repairSvgAfricanPremiumArmatureRoles(armature) {
        if (
            !armature?.root
            || armature.root._characterAppearanceProvider !== 'svg-african-premium'
        ) return false;

        const view = String(
            armature.root._svgCharacterViewProfileKey
            || armature.root._svgCharacterConfig?.view
            || 'front'
        ).toLowerCase();
        const isSide = /^side-(left|right)$/.test(view);
        const expectedRoles = isSide
            ? ['head-neck', 'front-arm', 'back-arm', 'front-leg', 'back-leg']
            : ['head-neck', 'right-arm', 'left-arm', 'right-leg', 'left-leg'];
        const allowedRoles = new Set(['torso', ...expectedRoles]);
        const objects = this._getArmatureObjects?.(armature) || [];
        const byDeclaredRole = new Map();
        let changed = false;
        objects.forEach(obj => {
            const role = this._normalizeArmatureRoleKey(
                obj?._svgCharacterPartKey
                || obj?._svgCharacterPremiumPartKey
                || obj?.bodyPartData?.partKey
                || ''
            );
            if (obj?.id && allowedRoles.has(role) && !byDeclaredRole.has(role)) {
                byDeclaredRole.set(role, obj);
            }
        });

        // Back-view catalogs follow anatomical names: the character's right
        // limb is on stage-right when seen from behind. Characters saved before
        // the rear-layout correction may still carry front-view stage positions;
        // repair those roles once without disturbing their stage placement.
        const anatomicalLayoutVersion = Number(armature.root._svgAfricanAnatomicalLayoutVersion) || 0;
        if (!isSide && view.startsWith('back') && anatomicalLayoutVersion < 2) {
            const centerX = obj => (Number(obj?.x) || 0)
                + (Math.abs(Number(obj?.width) || 0) * (Number.isFinite(obj?.pivotX) ? obj.pivotX : 0.5));
            const alignBackPair = (rightKey, leftKey) => {
                const declaredRight = byDeclaredRole.get(rightKey);
                const declaredLeft = byDeclaredRole.get(leftKey);
                if (!declaredRight?.id || !declaredLeft?.id) return;
                if (centerX(declaredRight) >= centerX(declaredLeft)) return;
                byDeclaredRole.set(rightKey, declaredLeft);
                byDeclaredRole.set(leftKey, declaredRight);
                changed = true;
            };
            alignBackPair('right-arm', 'left-arm');
            alignBackPair('right-leg', 'left-leg');
        }

        const nextParts = {
            torso: armature.parts?.torso || { obj: armature.root, joints: {} }
        };
        const displayNames = {
            'head-neck': 'Head Neck',
            'right-arm': 'Right Arm',
            'left-arm': 'Left Arm',
            'right-leg': 'Right Leg',
            'left-leg': 'Left Leg',
            'front-arm': 'Front Arm',
            'back-arm': 'Back Arm',
            'front-leg': 'Front Leg',
            'back-leg': 'Back Leg'
        };
        const syncPremiumJointChain = (obj, role) => {
            const specs = this._getArmaturePromotionJointSpecs(role);
            const existing = Array.isArray(obj?.joints)
                ? [...obj.joints].sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))
                : [];
            if (!specs.length || existing.length !== specs.length) {
                return this._applyArmatureJointChainToObject(obj, role);
            }

            let jointChanged = false;
            const expectedDirection = this._getArmaturePromotionJointDirection(role);
            if (StageObject.normalizeJointDirection(obj.jointDirection) !== expectedDirection) {
                obj.jointDirection = expectedDirection;
                jointChanged = true;
            }
            existing.forEach((joint, index) => {
                const expectedName = specs[index]?.name;
                if (expectedName && joint.name !== expectedName) {
                    joint.name = expectedName;
                    jointChanged = true;
                }
            });

            const existingProfile = obj._svgAfricanJointProfile;
            if (existingProfile && typeof existingProfile === 'object') {
                const profileValues = Object.values(existingProfile);
                if (profileValues.length === specs.length) {
                    const remappedProfile = {};
                    specs.forEach((spec, index) => {
                        remappedProfile[spec.name] = {
                            ...(profileValues[index] || {}),
                            position: existing[index]?.position,
                            crossOffset: existing[index]?.crossOffset
                        };
                    });
                    const oldKeys = Object.keys(existingProfile);
                    const nextKeys = Object.keys(remappedProfile);
                    if (oldKeys.some((key, index) => key !== nextKeys[index])) jointChanged = true;
                    obj._svgAfricanJointProfile = remappedProfile;
                }
            }
            return jointChanged;
        };

        expectedRoles.forEach(role => {
            const existingPart = armature.parts?.[role];
            const obj = byDeclaredRole.get(role) || existingPart?.obj || existingPart?.raw;
            if (!obj?.id) return;
            if (existingPart?.obj?.id !== obj.id) changed = true;
            if (obj._armatureRoleKey !== role) {
                obj._armatureRoleKey = role;
                changed = true;
            }
            if (obj.armatureRoleKey !== role) {
                obj.armatureRoleKey = role;
                changed = true;
            }
            if (obj._armaturePartKey !== role) {
                obj._armaturePartKey = role;
                changed = true;
            }
            if (obj.armaturePartKey !== role) {
                obj.armaturePartKey = role;
                changed = true;
            }
            if (obj._svgCharacterPartKey !== role) {
                obj._svgCharacterPartKey = role;
                changed = true;
            }
            if (obj._svgCharacterPremiumPartKey !== role) {
                obj._svgCharacterPremiumPartKey = role;
                changed = true;
            }
            if (displayNames[role] && obj.name !== displayNames[role]) {
                obj.name = displayNames[role];
                changed = true;
            }
            if (role === 'head-neck') {
                const headJointNames = [...(obj.joints || [])]
                    .sort((a, b) => (a?.position ?? 0) - (b?.position ?? 0))
                    .map(joint => String(joint?.name || '').toLowerCase());
                const headChainMatches = headJointNames.length === 1
                    && headJointNames[0] === 'neck'
                    && StageObject.normalizeJointDirection(obj.jointDirection) === 'vertical-bt';
                if (!headChainMatches && syncPremiumJointChain(obj, role)) changed = true;
                if (StageObject.normalizeSvgAfricanHeadNeckRig?.(obj, {
                    force: true,
                    view
                })) changed = true;
            } else if (syncPremiumJointChain(obj, role)) {
                changed = true;
            }
            obj.bodyPartData = {
                ...(obj.bodyPartData || {}),
                partKey: role,
                charType: isSide ? 'human-side-dual' : 'human-front'
            };
            nextParts[role] = {
                ...(existingPart || {}),
                obj,
                joints: this._buildArmatureJointRefLookup(obj)
            };
        });

        if (expectedRoles.every(role => nextParts[role]?.obj?.id)) {
            const currentKeys = Object.keys(armature.parts || {});
            const nextKeys = Object.keys(nextParts);
            if (
                currentKeys.length !== nextKeys.length
                || nextKeys.some(key => armature.parts?.[key]?.obj?.id !== nextParts[key]?.obj?.id)
            ) changed = true;
            armature.parts = nextParts;
        }
        const promotedProfile = isSide ? 'side-dual' : 'front';
        if (armature.root._armaturePromotedProfile !== promotedProfile) {
            armature.root._armaturePromotedProfile = promotedProfile;
            changed = true;
        }
        if (armature.root._svgAfricanAnatomicalLayoutVersion !== 2) {
            armature.root._svgAfricanAnatomicalLayoutVersion = 2;
            changed = true;
        }
        Object.values(armature.parts || {}).forEach(part => {
            const obj = part?.obj || part?.raw;
            if (obj && obj._svgAfricanAnatomicalLayoutVersion !== 2) {
                obj._svgAfricanAnatomicalLayoutVersion = 2;
                changed = true;
            }
        });
        return changed;
    },

    _ensureFrontArmatureViewLayoutConsistency(armature) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature) || !armature?.root) return armature;
        // Premium SVG assets carry explicit anatomical role and view metadata.
        // Re-inferring those roles from stage X positions swaps limbs in back
        // and 3/4 views, breaking the pose catalog after a view transition.
        if (armature.root._characterAppearanceProvider === 'svg-african-premium') {
            this._repairSvgAfricanPremiumArmatureRoles(armature);
            return armature;
        }
        if (
            armature.root._armatureFrontBackChoiceInProgress
            || armature.root._svgAfricanPremiumViewSwitchInProgress
        ) return armature;
        const styleConfig = armature.root._ucCharacterStyleConfig || {};
        const styleView = String(styleConfig.view || '').toLowerCase();
        const sideFacing = String(styleConfig.sideFacing || '').toLowerCase();
        if (this._repairFrontBackArmatureJointRoleNames(armature)) {
            armature = this._refreshDetectedArmatureReference(armature) || armature;
        }
        if (
            styleView === 'back-3q'
            && sideFacing === 'right'
            && armature.root._ucBack3qReferencePosture === 'right'
            && this._getArmatureFrontBackFacing(armature) === 'back'
        ) {
            return armature;
        }

        const armFacing = this._detectFrontArmaturePairLayoutFacing(
            armature.parts?.['left-arm']?.obj,
            armature.parts?.['right-arm']?.obj
        );
        const legFacing = this._detectFrontArmaturePairLayoutFacing(
            armature.parts?.['left-leg']?.obj,
            armature.parts?.['right-leg']?.obj
        );

        const layoutFacing = armFacing || legFacing;
        const desiredFacing = this._resolveDesiredFrontBackFacing(armature, layoutFacing)
            || this._getStoredFrontArmatureFacing(armature);
        if (desiredFacing !== 'front' && desiredFacing !== 'back') return armature;

        const currentFacing = this._getArmatureFrontBackFacing(armature);
        const needsFacingSync = currentFacing !== desiredFacing;
        if (!layoutFacing || layoutFacing === desiredFacing) {
            if (!needsFacingSync) return armature;
            return this._applyArmatureFrontBackChoice(armature, desiredFacing, {
                pushHistory: false,
                toast: false,
                rebuildPanel: false,
                enforceLayout: false,
                restoreSavedPose: false
            }) || armature;
        }

        return this._applyArmatureFrontBackChoice(armature, desiredFacing, {
            pushHistory: false,
            toast: false,
            rebuildPanel: false,
            enforceLayout: true,
            restoreSavedPose: false
        }) || armature;
    },

    _swapFrontArmatureRolePairs(armature) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature) || !armature?.parts) return false;

        const swapPairs = [
            ['right-arm', 'left-arm'],
            ['right-leg', 'left-leg']
        ];
        let changed = false;

        swapPairs.forEach(([rightKey, leftKey]) => {
            const rightPart = armature.parts?.[rightKey];
            const leftPart = armature.parts?.[leftKey];
            if (!rightPart?.obj || !leftPart?.obj || rightPart.obj.id === leftPart.obj.id) return;

            const previousRightObj = rightPart.obj;
            const previousLeftObj = leftPart.obj;

            armature.parts[rightKey] = { obj: previousLeftObj, joints: {} };
            armature.parts[leftKey] = { obj: previousRightObj, joints: {} };

            previousLeftObj._armatureRoleKey = rightKey;
            previousLeftObj._armaturePartKey = rightKey;
            previousRightObj._armatureRoleKey = leftKey;
            previousRightObj._armaturePartKey = leftKey;

            this._applyArmatureJointChainToObject(previousLeftObj, rightKey);
            this._applyArmatureJointChainToObject(previousRightObj, leftKey);

            armature.parts[rightKey].joints = this._buildArmatureJointRefLookup(previousLeftObj);
            armature.parts[leftKey].joints = this._buildArmatureJointRefLookup(previousRightObj);
            changed = true;
        });

        if (changed) {
            this._ensureArmatureTorsoAttachmentRig(armature);
        }

        return changed;
    },

    _syncArmatureFrontBackViewLayerOrder(armature, frontBackOverride = null, customBackOrder = null, layerOptions = {}) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature) || !Array.isArray(this.objects?.objects)) {
            return false;
        }

        const facing = String(frontBackOverride || this._getArmatureFrontBackFacing(armature)).toLowerCase() === 'back'
            ? 'back'
            : 'front';
        const list = this.objects.objects;
        // Render order is bottom-to-top (first in array = drawn first = behind).
        // Front view: legs tuck beneath the pelvis/torso overlap, then head and arms.
        // Keeping both hip caps behind the torso is especially important for six-part
        // SVG rigs, whose transparent limb assets intentionally extend into the waist.
        // Back view (default):  upper limbs behind everything (arms tucked behind body),
        //             then lower limbs, torso, head-neck on top.
        // customBackOrder: per-pose override for back-view layer order.
        const defaultBackOrder = ['left-arm', 'right-arm', 'right-leg', 'left-leg', 'torso', 'head-neck'];
        const defaultFrontOrder = ['right-leg', 'left-leg', 'torso', 'head-neck', 'left-arm', 'right-arm'];
        const hasCustomOrder = Array.isArray(customBackOrder) && customBackOrder.length >= 3;
        const desiredKeys = facing === 'back'
            ? (hasCustomOrder ? customBackOrder : defaultBackOrder)
            : (hasCustomOrder ? customBackOrder : defaultFrontOrder);
        const torsoFrontmost = layerOptions.torsoFrontmost === true;
        const desiredOrder = desiredKeys
            .map(key => key === 'torso' ? (armature.parts?.torso?.obj || armature.root) : armature.parts?.[key]?.obj)
            .filter((obj, index, arr) => obj?.id && arr.findIndex(entry => entry?.id === obj.id) === index);

        const headObj = armature.parts?.['head-neck']?.obj || null;
        const headFeatureIds = new Set(Object.values(headObj?._facialFeatures || {}).filter(Boolean));
        const headFeatures = list.filter(obj => obj?.id && (
            headFeatureIds.has(obj.id)
            || (headObj?.id && obj._facialParentHead === headObj.id)
        ));
        const headIdx = desiredOrder.findIndex(o => o._armatureRoleKey === 'head-neck' || o._armaturePartKey === 'head-neck');
        if (headIdx >= 0 && headFeatures.length) {
            [...headFeatures]
                .sort((a, b) => list.findIndex(entry => entry?.id === a.id) - list.findIndex(entry => entry?.id === b.id))
                .forEach((featureObj, offset) => desiredOrder.splice(headIdx + 1 + offset, 0, featureObj));
        }

        if (!torsoFrontmost) {
            this._promoteArmatureTorsoAboveLegsForLongGarment(armature, desiredOrder);
        }

        this._insertUniversalCharacterGarmentsIntoLayerOrder(armature, desiredOrder, list, {
            keepHeadAboveRobe: facing !== 'back',
            ...layerOptions
        });

        // Insert back-view overlays in correct layer order
        if (facing === 'back') {
            // Torso overlay right after the torso part
            const torsoObj = armature.parts?.torso?.obj || armature.root || null;
            const torsoIdx = desiredOrder.findIndex(o => o._armatureRoleKey === 'torso' || o._armaturePartKey === 'torso');
            const torsoOverlays = list.filter(o => {
                const isTorsoOverlay = o._backViewTorsoOverlay || o.name === 'Torso (Back View)';
                if (!isTorsoOverlay) return false;
                return !!torsoObj?.id && (o._backViewTorsoOverlayParentId === torsoObj.id || o.pinnedTo === torsoObj.id);
            });
            if (torsoIdx >= 0 && torsoOverlays.length) {
                torsoOverlays.forEach(h => desiredOrder.splice(torsoIdx + 1, 0, h));
            }
            // Scalp hair right after the head-neck part
            const headIdx = desiredOrder.findIndex(o => o._armatureRoleKey === 'head-neck' || o._armaturePartKey === 'head-neck');
            const scalpHairs = list.filter(o => {
                const isScalpHair = o._backViewScalpHair || o.name === 'Scalp Hair (Back View)';
                if (!isScalpHair) return false;
                return !!headObj?.id && (o._backViewScalpHairParentId === headObj.id || o.pinnedTo === headObj.id);
            });
            if (headIdx >= 0 && scalpHairs.length) {
                const insertAfter = headIdx + 1 + headFeatures.length;
                scalpHairs.forEach((h, offset) => desiredOrder.splice(insertAfter + offset, 0, h));
            }
        }

        if (torsoFrontmost) {
            const torsoObj = armature.parts?.torso?.obj || armature.root || null;
            const torsoIdx = desiredOrder.findIndex(obj => obj?.id && obj.id === torsoObj?.id);
            if (torsoIdx >= 0 && torsoIdx !== desiredOrder.length - 1) {
                desiredOrder.splice(torsoIdx, 1);
                desiredOrder.push(torsoObj);
            }
        }

        this._enforceThreeQuarterFarArmBehindBodyLayers(armature, desiredOrder, layerOptions);

        const layerValuesChanged = this._stampArmatureLayerValuesFromOrder(desiredOrder);

        if (desiredOrder.length < 3) return false;

        const indexed = desiredOrder
            .map(obj => ({ obj, index: list.findIndex(entry => entry?.id === obj.id) }))
            .filter(entry => entry.index >= 0);
        if (!indexed.length) return false;

        const minIndex = Math.min(...indexed.map(entry => entry.index));
        const idSet = new Set(indexed.map(entry => entry.obj.id));
        const stagedOrder = indexed
            .sort((a, b) => a.index - b.index)
            .map(entry => entry.obj);
        const normalizedDesired = desiredOrder.filter(obj => idSet.has(obj.id));

        if (stagedOrder.length === normalizedDesired.length && stagedOrder.every((obj, idx) => obj.id === normalizedDesired[idx].id)) {
            return layerValuesChanged;
        }

        const remaining = list.filter(obj => !idSet.has(obj?.id));
        remaining.splice(minIndex, 0, ...normalizedDesired);
        this.objects.objects = remaining;
        return true;
    },

    _applyArmatureFrontBackChoice(armature, nextFacing, options = {}) {
        if (!armature?.root || !this._armatureUsesUniversalFrontBackCatalog(armature)) return armature;
        if (armature.root._svgAfricanPremiumViewSwitchInProgress === true) return armature;

        if (
            options.skipSvgPremiumViewSwitch !== true
            && armature.root._characterAppearanceProvider === 'svg-african-premium'
            && typeof this._switchSvgAfricanPremiumView === 'function'
        ) {
            const resolvedFacing = String(nextFacing || '').toLowerCase() === 'back' ? 'back' : 'front';
            const currentView = this._getSvgAfricanPremiumViewKey?.(armature) || 'front';
            const currentFacing = currentView.startsWith('back') ? 'back' : 'front';
            const currentLean = /-(left|right)$/.exec(currentView)?.[1] || null;
            const targetLean = currentFacing !== resolvedFacing && currentLean
                ? (currentLean === 'left' ? 'right' : 'left')
                : currentLean;
            const targetView = currentView.includes('-3q-') && targetLean
                ? `${resolvedFacing}-3q-${targetLean}`
                : resolvedFacing;
            return this._switchSvgAfricanPremiumView(armature, targetView, {
                stopMovement: options.stopMovement !== false,
                pushHistory: options.pushHistory,
                toast: options.toast,
                rebuildPanel: options.rebuildPanel
            }) || armature;
        }

        const transitionRoot = armature.root;
        if (transitionRoot._armatureFrontBackChoiceInProgress) {
            return armature;
        }
        transitionRoot._armatureFrontBackChoiceInProgress = true;

        try {
        const resolvedFacing = String(nextFacing || '').toLowerCase() === 'back' ? 'back' : 'front';
        const currentFacing = this._getArmatureFrontBackFacing(armature);
        const threeQuarterLean = this._getArmatureFront3qLean?.(armature);
        const svgViewKey = String(
            armature.root._svgCharacterViewProfileKey
            || armature.root._svgCharacterConfig?.view
            || armature.root._svgCharacterConfig?.styling?.view
            || ''
        ).toLowerCase();
        const isThreeQuarter = threeQuarterLean === 'left'
            || threeQuarterLean === 'right'
            || /(^|-)3q($|-)/.test(svgViewKey);
        const projectionMode = String(armature.root._svgCharacterProjectionMode || '');
        const isAssetDrivenThreeQuarter = isThreeQuarter
            && (projectionMode === 'authored-3q'
                || (armature.root._characterAppearanceProvider === 'svg-african-premium'
                    && projectionMode === 'profile-tilt-3q'));
        // Premium 3/4 assets own their six-part geometry and pin calibration.
        // The generic front/back layout is a fallback for UC/dummy silhouettes and
        // must not overwrite a premium asset during creation or a turn-around.
        const shouldSyncLayout = !isAssetDrivenThreeQuarter && (currentFacing !== resolvedFacing || options.enforceLayout === true);
        const shouldRestoreSavedPose = options.restoreSavedPose !== false;
        if (currentFacing !== resolvedFacing && options.flipVisuals === false) {
            return armature;
        }

        if (shouldSyncLayout && currentFacing === 'front' && !armature.root._armatureFrontViewLayout) {
            this._captureFrontArmatureViewLayout(armature, { force: true });
        }

        let changed = false;

        // ── Save the outgoing view's pose / movement key before stopping ──
        if (currentFacing !== resolvedFacing && shouldRestoreSavedPose) {
            const outgoingKey = this._getArmaturePlayingKey(armature) || null;
            const saveSlot = currentFacing === 'back' ? '_armatureSavedBackPoseKey' : '_armatureSavedFrontPoseKey';
            armature.root[saveSlot] = outgoingKey;
        }

        if (currentFacing !== resolvedFacing || options.stopMovement === true) {
            this._stopArmatureMovement(armature);
        }

        if (this._setArmatureFrontBackFacing(armature, resolvedFacing)) {
            changed = true;
        }

        if (!isAssetDrivenThreeQuarter && this._ucRefreshFrontBackArmaturePartArt?.(armature, resolvedFacing)) {
            changed = true;
        }

        if (shouldSyncLayout) {
            if (this._reassignFrontArmatureViewRoles(armature, resolvedFacing)) changed = true;
            armature = this._refreshDetectedArmatureReference(armature);
            if (!this._usesFrontBackWaistOnlyTorsoModel?.(armature) && this._ensureArmatureTorsoAttachmentRig(armature)) changed = true;
            armature = this._refreshDetectedArmatureReference(armature);
            if (this._applyFrontArmatureViewLayout(armature, resolvedFacing)) changed = true;
            armature = this._refreshDetectedArmatureReference(armature);
            if (this._applyFrontArmatureDisplayedNames(armature, resolvedFacing)) changed = true;
        }

        if (!isAssetDrivenThreeQuarter && currentFacing !== resolvedFacing) {
            if (this._mirrorFrontArmatureBodyTagLayout(armature)) changed = true;
        }

        const panel = document.getElementById('armature-panel');
        const facingSelect = panel?.querySelector?.('#armature-facing-side');
        if (facingSelect && facingSelect.value !== resolvedFacing) {
            facingSelect.value = resolvedFacing;
        }

        armature = this._refreshDetectedArmatureReference(armature);

        if (!isAssetDrivenThreeQuarter && this._syncArmatureFrontBackViewLayerOrder(armature, resolvedFacing)) {
            changed = true;
        }

        // ── Toggle back-view overlays (scalp hair + torso) ──
        if (!isAssetDrivenThreeQuarter && this._syncBackViewScalpHair?.(armature, resolvedFacing)) {
            changed = true;
        }
        if (!isAssetDrivenThreeQuarter && this._syncBackViewTorsoOverlay?.(armature, resolvedFacing)) {
            changed = true;
        }
        // ── Swap leg foot images for back-view appearance ──
        if (!isAssetDrivenThreeQuarter && this._syncBackViewFeet?.(armature, resolvedFacing)) {
            changed = true;
        }

        if (currentFacing !== resolvedFacing) {
            if (shouldRestoreSavedPose) {
                // ── Restore the incoming view's previously-saved pose, or fall back to idle ──
                const restoreSlot = resolvedFacing === 'back' ? '_armatureSavedBackPoseKey' : '_armatureSavedFrontPoseKey';
                const savedKey = armature.root[restoreSlot] || null;
                const incomingCatalog = this._getActiveArmaturePoseCatalog(armature);
                const incomingMovements = this._getActiveArmatureMovementCatalog(armature);

                if (savedKey && (incomingCatalog?.[savedKey] || incomingMovements?.[savedKey])) {
                    // Restore the saved pose or start the saved movement
                    if (incomingMovements?.[savedKey]) {
                        this._applyArmaturePose(armature, incomingCatalog?.['idle'] || { jointAngles: {} });
                        this._playArmatureMovement(armature, savedKey);
                    } else {
                        this._applyArmaturePose(armature, incomingCatalog[savedKey]);
                        armature.root._poseArmaturePlayingKey = savedKey;
                    }
                } else {
                    armature = this._resetArmatureToActiveCatalogIdle(armature) || armature;
                }
            } else {
                armature = this._resetArmatureToActiveCatalogIdle(armature) || armature;
            }
            changed = true;
        }

        if (changed) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
            if (options.pushHistory !== false) {
                eventBus.emit('history:push');
            }
        }

        if (options.toast !== false && changed) {
            Utils.showToast(`Armature set to ${resolvedFacing} view`, 'success');
        }

        if (armature?.root?.id) {
            this._currentArmature = armature;
        }

        if (document.getElementById('armature-panel') && options.rebuildPanel !== false) {
            this._buildArmaturePanel(armature, { preserveState: true, reuseExisting: true });
            this._updateArmaturePanelPlayState(armature);
        }

        return armature;
        } finally {
            transitionRoot._armatureFrontBackChoiceInProgress = false;
            if (armature?.root && armature.root !== transitionRoot) {
                armature.root._armatureFrontBackChoiceInProgress = false;
            }
        }
    },

    _flipFrontArmatureInstant(armature) {
        const liveArmature = (() => {
            const detected = this._detectArmature();
            if (armature?.root?.id && detected?.root?.id === armature.root.id) return detected;
            if (this._currentArmature?.root?.id && detected?.root?.id === this._currentArmature.root.id) return detected;
            return armature || this._currentArmature || detected;
        })();
        if (!liveArmature?.root || !this._armatureUsesUniversalFrontBackCatalog(liveArmature)) return liveArmature;

        const currentFacing = this._getArmatureFrontBackFacing(liveArmature);
        const nextFacing = currentFacing === 'back' ? 'front' : 'back';
        return this._applyArmatureFrontBackChoice(liveArmature, nextFacing, {
            pushHistory: true,
            toast: true,
            flipVisuals: true,
            restoreSavedPose: false
        });
    },

    _swapDummySideArmatureRolePairs(armature) {
        if (!armature?.parts || armature?.root?._armaturePromotedFromAssembly) return false;

        const swapPairs = [
            ['front-arm', 'back-arm'],
            ['front-leg', 'back-leg']
        ];
        let changed = false;
        const displayNames = {
            'front-arm': armature?.root?._armatureStrictSideDummy ? 'Side Arm' : 'Front Arm',
            'back-arm': 'Back Arm',
            'front-leg': 'Front Leg',
            'back-leg': 'Back Leg'
        };

        swapPairs.forEach(([frontKey, backKey]) => {
            const frontPart = armature.parts?.[frontKey];
            const backPart = armature.parts?.[backKey];
            if (!frontPart?.obj || !backPart?.obj) return;

            const previousFrontObj = frontPart.obj;
            const previousBackObj = backPart.obj;

            armature.parts[frontKey] = { obj: previousBackObj, joints: {} };
            armature.parts[backKey] = { obj: previousFrontObj, joints: {} };

            previousBackObj._armatureRoleKey = frontKey;
            previousBackObj._armaturePartKey = frontKey;
            previousFrontObj._armatureRoleKey = backKey;
            previousFrontObj._armaturePartKey = backKey;
            previousBackObj.name = displayNames[frontKey] || previousBackObj.name;
            previousFrontObj.name = displayNames[backKey] || previousFrontObj.name;

            this._applyArmatureJointChainToObject(previousBackObj, frontKey);
            this._applyArmatureJointChainToObject(previousFrontObj, backKey);

            armature.parts[frontKey].joints = this._buildArmatureJointRefLookup(previousBackObj);
            armature.parts[backKey].joints = this._buildArmatureJointRefLookup(previousFrontObj);
            changed = true;
        });

        if (changed) {
            this._ensureArmatureTorsoAttachmentRig(armature);
            this._syncArmatureFrontBackDrawOrder(armature);
        }

        return changed;
    },

    _refreshDetectedArmatureReference(armature) {
        if (armature?.root?.id && Array.isArray(this.objects?.objects)) {
            const rootId = armature.root.id;
            const directPool = this.objects.objects.filter(obj => {
                if (!obj) return false;
                return obj.id === rootId
                    || obj.pinnedTo === rootId
                    || obj._backViewTorsoOverlayParentId === rootId
                    || obj._backViewScalpHairParentId === rootId;
            });
            const direct = this._detectArmatureFromPool?.(directPool);
            if (direct?.root?.id === rootId) {
                const storedFacing = String(armature.root._armatureFrontBackFacing || '').toLowerCase();
                if ((storedFacing === 'front' || storedFacing === 'back') && direct.root._armatureFrontBackFacing !== storedFacing) {
                    direct.root._armatureFrontBackFacing = storedFacing;
                }
                if (this._currentArmature?.root?.id === rootId) {
                    this._currentArmature = direct;
                }
                return direct;
            }
        }
        const refreshed = this._detectArmature();
        if (refreshed?.root?.id && armature?.root?.id && refreshed.root.id === armature.root.id) {
            if (this._currentArmature?.root?.id === armature.root.id) {
                this._currentArmature = refreshed;
            }
            return refreshed;
        }
        return armature;
    },

    _applyArmatureFacingChoice(armature, nextFacing, options = {}) {
        if (!armature?.root) return armature;

        const resolvedFacing = String(nextFacing || '').toLowerCase() === 'right' ? 'right' : 'left';
        if (
            armature.root._characterAppearanceProvider === 'svg-african-premium'
            && typeof this._switchSvgAfricanPremiumView === 'function'
            && /^side-/.test(this._getSvgAfricanPremiumViewKey?.(armature) || '')
        ) {
            return this._switchSvgAfricanPremiumView(armature, `side-${resolvedFacing}`, {
                stopMovement: options.stopMovement !== false,
                pushHistory: options.pushHistory,
                toast: options.toast,
                rebuildPanel: options.rebuildPanel
            }) || armature;
        }
        const currentFacing = this._getArmatureFacingSide(armature);
        const currentVisualFacing = this._getArmatureVisualFacingSide(armature);
        const isSideArmature = this._armatureUsesHumanSideCatalog(armature) || this._armatureUsesHumanSideDualArmCatalog(armature);
        const isSideDualArmature = this._armatureUsesHumanSideDualArmCatalog(armature);
        const skipVisualFlip = options.flipVisuals === false;
        const shouldFlipVisuals = !skipVisualFlip && isSideArmature && currentFacing !== resolvedFacing;
        const snapshot = shouldFlipVisuals ? this._snapshotArmaturePose(armature) : null;
        let changed = false;

        this._stopArmatureMovement(armature);

        if (shouldFlipVisuals) {
            if (this._flipArmatureFacingVisuals(armature, resolvedFacing) > 0) changed = true;
            if (this._swapArmatureDisplayedLeftRightNames(armature)) changed = true;
            if (this._swapDummySideArmatureRolePairs(armature)) changed = true;
        }

        if (isSideArmature && currentVisualFacing !== resolvedFacing) {
            if (this._setArmatureVisualFacingSide(armature, resolvedFacing)) changed = true;
        }
        if (isSideArmature && skipVisualFlip) {
            if (armature.root._armatureVisualBaseFacingSide !== resolvedFacing) {
                armature.root._armatureVisualBaseFacingSide = resolvedFacing;
                changed = true;
            }
        }

        if (this._setArmatureFacingSide(armature, resolvedFacing, {
            explicit: options.explicit !== false,
            pushHistory: false,
            toast: false,
            reopenPanel: false,
            stopMovement: false
        })) {
            changed = true;
        }

        armature = this._refreshDetectedArmatureReference(armature);
        if (isSideArmature) {
            if (this._syncArmatureVisualLayerOrder(armature, resolvedFacing)) changed = true;
            if (this._syncArmatureVisualJointPrefixes(armature, resolvedFacing)) changed = true;
        }
        if (this._syncArmatureFrontBackDrawOrder(armature)) changed = true;

        if (snapshot) {
            const poseToReapply = isSideDualArmature
                ? this._mirrorSideDualArmSnapshotForFacingChange(snapshot)
                : snapshot;
            this._applyArmaturePose(armature, poseToReapply);
            changed = true;
        }

        if (changed) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
            if (options.pushHistory !== false) {
                eventBus.emit('history:push');
            }
        }

        if (options.toast !== false && changed) {
            Utils.showToast(`Armature set to ${resolvedFacing} facing`, 'success');
        }

        if (armature?.root?.id) {
            this._currentArmature = armature;
        }

        return armature;
    },

    _shouldPreserveArmatureCoreCrossOffsetOnFlip(obj, jt) {
        const partKey = String(obj?._armaturePartKey || obj?._armatureRoleKey || '').toLowerCase();
        const jointName = String(jt?.name || '').toLowerCase();
        return (partKey === 'head-neck' && jointName === 'neck')
            || (partKey === 'torso' && jointName === 'waist');
    },

    _getArmatureJointFlippedCrossOffset(armature, obj, jt, nextVisualFacing) {
        const clampCross = (value, fallback = 0.5) => {
            const parsed = typeof value === 'number' ? value : parseFloat(value);
            const num = Number.isFinite(parsed) ? parsed : fallback;
            return Math.max(0.05, Math.min(0.95, num));
        };
        const current = clampCross(jt?.crossOffset, 0.5);
        const baseFacing = this._getArmatureVisualBaseFacingSide(armature);
        const currentVisualFacing = this._getArmatureVisualFacingSide(armature);
        if (!Number.isFinite(jt?._armatureBaseCrossOffset) || currentVisualFacing === baseFacing) {
            jt._armatureBaseCrossOffset = current;
        }
        const base = clampCross(jt._armatureBaseCrossOffset, current);
        if (this._shouldPreserveArmatureCoreCrossOffsetOnFlip(obj, jt)) {
            return base;
        }
        return nextVisualFacing === baseFacing ? base : Math.round((1 - base) * 1000) / 1000;
    },

    _getArmatureVisualMirrorAxisX(armature) {
        const torso = armature?.parts?.torso?.obj || armature?.root || null;
        const torsoPivot = torso?.getPivotPoint?.();
        if (Number.isFinite(torsoPivot?.x)) {
            return torsoPivot.x;
        }
        if (torso && Number.isFinite(torso.x) && Number.isFinite(torso.width)) {
            const pivotX = Number.isFinite(torso.pivotX) ? torso.pivotX : 0.5;
            return torso.x + (torso.width * pivotX);
        }

        const armatureObjects = this._getArmatureObjects(armature).filter(Boolean);
        if (!armatureObjects.length) return null;
        const minX = Math.min(...armatureObjects.map(obj => Number.isFinite(obj?.x) ? obj.x : 0));
        const maxX = Math.max(...armatureObjects.map(obj => {
            const x = Number.isFinite(obj?.x) ? obj.x : 0;
            const width = Number.isFinite(obj?.width) ? obj.width : 0;
            return x + width;
        }));
        return Number.isFinite(minX) && Number.isFinite(maxX) ? ((minX + maxX) / 2) : null;
    },

    _getArmatureVisualReferencePoint(obj) {
        if (!obj) return null;

        if (obj._armatureAttachmentPin && obj._getArmatureAttachmentJoint) {
            const attachmentJoint = obj._getArmatureAttachmentJoint();
            if (attachmentJoint) {
                const attachmentPoint = obj._getArmatureAttachmentJointWorldPosition
                    ? obj._getArmatureAttachmentJointWorldPosition(attachmentJoint)
                    : obj.getJointWorldPosition?.(attachmentJoint);
                if (attachmentPoint && Number.isFinite(attachmentPoint.x) && Number.isFinite(attachmentPoint.y)) {
                    return attachmentPoint;
                }
            }
        }

        const pivot = obj.getPivotPoint?.();
        if (pivot && Number.isFinite(pivot.x) && Number.isFinite(pivot.y)) {
            return pivot;
        }

        if (Number.isFinite(obj.x) && Number.isFinite(obj.y) && Number.isFinite(obj.width) && Number.isFinite(obj.height)) {
            const pivotX = Number.isFinite(obj.pivotX) ? obj.pivotX : 0.5;
            const pivotY = Number.isFinite(obj.pivotY) ? obj.pivotY : 0.5;
            return {
                x: obj.x + (obj.width * pivotX),
                y: obj.y + (obj.height * pivotY)
            };
        }
        return null;
    },

    _getSixPieceSideFacingPinOffsetCalibration(armature, partKey, visualFacing, offset = null) {
        if (!this._usesSixPieceSideTorsoPinModel(armature) || !offset) return offset;
        const torso = armature?.parts?.torso?.obj || armature?.root || null;
        const torsoWidth = Number.isFinite(torso?.width) ? torso.width : 0;
        if (!(torsoWidth > 0)) return offset;

        const facing = String(visualFacing || '').toLowerCase() === 'right' ? 'right' : 'left';
        if (facing !== 'right') return offset;
        let key = String(partKey || '').toLowerCase();
        if (this._isSixPieceSideUpperBodyPart(key)) {
            return offset;
        }
        if (key === 'left-arm' || key === 'right-arm') {
            key = facing === 'right'
                ? (key === 'left-arm' ? 'front-arm' : 'back-arm')
                : (key === 'right-arm' ? 'front-arm' : 'back-arm');
        } else if (key === 'left-leg' || key === 'right-leg') {
            key = facing === 'right'
                ? (key === 'left-leg' ? 'front-leg' : 'back-leg')
                : (key === 'right-leg' ? 'front-leg' : 'back-leg');
        }

        const ratios = {
            'head-neck': 18 / 133,
            'front-arm': -7 / 133,
            'front-leg': 1 / 133
        };
        if (!Object.prototype.hasOwnProperty.call(ratios, key)) return offset;
        return {
            ...offset,
            x: Math.round((torsoWidth * ratios[key]) * 1000) / 1000
        };
    },

    _flipArmatureFacingVisuals(armature, nextVisualFacing = null) {
        if (!armature) return 0;
        const armatureObjects = this._getArmatureObjects(armature).filter(Boolean);
        if (!armatureObjects.length) return 0;
        // Face-rig facial parts (eyes/brows/mouth) are pinned to the head but not in
        // armature.parts. Negating their pinOffsetX doesn't mirror them across a vertical neck
        // joint, so capture their pre-flip world pivot and re-pin them to the mirrored spot below.
        const __facialParts = [];
        const __facialHosts = new Set();
        {
            const armatureIds = new Set(armatureObjects.map(o => o.id));
            const list = this.objects?.objects || [];
            const byId = {};
            list.forEach(o => { if (o?.id) byId[o.id] = o; });
            const featureIds = new Set();
            armatureObjects.forEach(o => {
                if (o?._facialFeatures && typeof o._facialFeatures === 'object') {
                    __facialHosts.add(o);
                    Object.values(o._facialFeatures).forEach(id => { if (id) featureIds.add(id); });
                }
            });
            list.forEach(o => {
                if (!o?.id || armatureIds.has(o.id)) return;
                const parent = o.pinnedTo ? byId[o.pinnedTo] : null;
                const directHost = o._facialParentHead ? byId[o._facialParentHead] : null;
                const parentHost = directHost || parent;
                if (!parentHost || !parentHost._facialFeatures || typeof parentHost._facialFeatures !== 'object') {
                    if (featureIds.has(o.id) || parentHost?.id === o.pinnedTo) {
                        // keep explicit face-feature matches even if host metadata is sparse
                    }
                }
                const registered = featureIds.has(o.id) || (o._facialParentHead && byId[o._facialParentHead]) || o.pinnedTo && byId[o.pinnedTo]?._facialFeatures;
                if (registered || (parentHost && parentHost._facialFeatures && typeof parentHost._facialFeatures === 'object' && (featureIds.has(o.id) || parentHost._facialFeatures[o?.name || ''] === o.id || Object.values(parentHost._facialFeatures).includes(o.id)))) {
                    if (parentHost) __facialHosts.add(parentHost);
                    let pivot = null;
                    try { pivot = o.getPivotPoint ? o.getPivotPoint() : { x: o.x, y: o.y }; } catch (_) { pivot = { x: o.x, y: o.y }; }
                    __facialParts.push({ obj: o, parent: parentHost || parent, pivot });
                }
            });
        }
        const clamp01 = (value, fallback = 0.5) => {
            const parsed = typeof value === 'number' ? value : parseFloat(value);
            const num = Number.isFinite(parsed) ? parsed : fallback;
            return Math.max(0, Math.min(1, num));
        };
        const resolvedNextFacing = String(
            nextVisualFacing || this._getArmatureVisualFacingSide(armature)
        ).toLowerCase() === 'right' ? 'right' : 'left';
        const mirrorAxisX = this._getArmatureVisualMirrorAxisX(armature);
        if (!Number.isFinite(mirrorAxisX)) return 0;
        const moveObjectX = (obj, nextX) => {
            const currentX = Number.isFinite(obj?.x) ? obj.x : 0;
            const dx = nextX - currentX;
            if (Math.abs(dx) < 1e-6) return;
            if (Array.isArray(obj.pathPoints) && obj.pathPoints.length > 0) {
                obj.pathPoints.forEach(point => {
                    point.x += dx;
                    if (point.cp1x !== undefined) point.cp1x += dx;
                    if (point.cp2x !== undefined) point.cp2x += dx;
                });
            }
            obj.x = nextX;
        };

        armatureObjects.forEach(obj => {
            const referenceBefore = this._getArmatureVisualReferencePoint(obj);
            const targetReferenceX = Number.isFinite(referenceBefore?.x)
                ? ((mirrorAxisX * 2) - referenceBefore.x)
                : null;

            if (this.objects?._bakeFlipH) {
                this.objects._bakeFlipH(obj);
            } else {
                obj.scaleX = (Number.isFinite(obj.scaleX) ? obj.scaleX : 1) * -1;
                obj.flipH = false;
            }
            if (Number.isFinite(targetReferenceX)) {
                const referenceAfter = this._getArmatureVisualReferencePoint(obj);
                if (Number.isFinite(referenceAfter?.x)) {
                    moveObjectX(obj, (Number.isFinite(obj?.x) ? obj.x : 0) + (targetReferenceX - referenceAfter.x));
                }
            }

            if (obj.pinnedTo) {
                if (Number.isFinite(obj.pinOffsetX)) {
                    obj.pinOffsetX = -obj.pinOffsetX;
                }
                if (Number.isFinite(obj.pinAnchorX)) {
                    obj.pinAnchorX = Math.round((1 - clamp01(obj.pinAnchorX, 0.5)) * 1000) / 1000;
                }
                if (Number.isFinite(obj.pinBaseTiltY)) {
                    obj.pinBaseTiltY = -obj.pinBaseTiltY;
                }
            }

            if (Array.isArray(obj.joints)) {
                obj.joints.forEach(jt => {
                    if (Number.isFinite(jt?.crossOffset)) {
                        jt.crossOffset = this._getArmatureJointFlippedCrossOffset(
                            armature,
                            obj,
                            jt,
                            resolvedNextFacing
                        );
                    }
                });
            }

            if (Array.isArray(obj.bodyTags)) {
                obj.bodyTags = obj.bodyTags.map(tag => ({
                    ...tag,
                    x: Math.round((1 - clamp01(tag?.x, 0.5)) * 1000) / 1000
                }));
            }
        });

        // The head is now flipped; re-pin each facial part to the mirror of its pre-flip world
        // pivot so it lands on the new facing side (and flip its sprite).
        __facialParts.forEach(entry => {
            const o = entry.obj;
            const parent = entry.parent;
            o.scaleX = (Number.isFinite(o.scaleX) ? o.scaleX : 1) * -1;
            o.flipH = false;
            const hasLocalRect = !!(o._facialLocalRect && Number.isFinite(parent?.width) && parent.width > 0);

            if (hasLocalRect) {
                const rect = o._facialLocalRect;
                const mirroredX = Math.round((parent.width - (rect.x + rect.w)) * 1000) / 1000;
                rect.x = mirroredX;
            }

            if (!hasLocalRect && Number.isFinite(o._facialBasePinOffsetX)) {
                o._facialBasePinOffsetX *= -1;
            }
            if (o.pinnedTo) {
                if (!hasLocalRect && Number.isFinite(o.pinOffsetX)) {
                    o.pinOffsetX = -o.pinOffsetX;
                }
                if (!hasLocalRect && Number.isFinite(o.pinAnchorX)) {
                    o.pinAnchorX = Math.round((1 - clamp01(o.pinAnchorX, 0.5)) * 1000) / 1000;
                }
                if (Number.isFinite(o.pinBaseTiltY)) {
                    o.pinBaseTiltY = -o.pinBaseTiltY;
                }
            }

            if (parent && typeof this._ucConfigureFacialFeaturePin === 'function') {
                this._ucConfigureFacialFeaturePin(parent, o);
            }
            if (Number.isFinite(o._facialBasePinOffsetX)) {
                o.pinOffsetX = o._facialBasePinOffsetX;
            }
            if (Number.isFinite(o._facialBasePinOffsetY)) {
                o.pinOffsetY = o._facialBasePinOffsetY;
            }
        });

        __facialHosts.forEach(host => {
            if (host && typeof this._ucNormalizeFacialFeaturePins === 'function') {
                this._ucNormalizeFacialFeaturePins(host);
            }
        });

        this.objects?.objects?.forEach(obj => {
            const matchHead = obj && obj.pinnedTo && this.objects?.getObjectById?.(obj.pinnedTo);
            const host = matchHead || (obj && obj._facialParentHead ? this.objects?.getObjectById?.(obj._facialParentHead) : null);
            if (host && host._facialFeatures && typeof host._facialFeatures === 'object' && (Object.values(host._facialFeatures).includes(obj.id) || obj._facialParentHead === host.id || obj.pinnedTo === host.id)) {
                if (typeof this._ucConfigureFacialFeaturePin === 'function') {
                    this._ucConfigureFacialFeaturePin(host, obj);
                }
            }
        });

        if (this.objects?._resolvePins) this.objects._resolvePins();

        return armatureObjects.length;
    },

    _flipArmatureFacingForMotion(armature) {
        const liveArmature = (() => {
            const detected = this._detectArmature();
            if (armature?.root?.id && detected?.root?.id === armature.root.id) return detected;
            if (this._currentArmature?.root?.id && detected?.root?.id === this._currentArmature.root.id) return detected;
            return armature || this._currentArmature || detected;
        })();
        if (!liveArmature?.root) return liveArmature;

        const svgOppositeView = this._getSvgAfricanPremiumOppositeViewKey?.(liveArmature);
        if (svgOppositeView && typeof this._switchSvgAfricanPremiumView === 'function') {
            return this._switchSvgAfricanPremiumView(liveArmature, svgOppositeView, {
                stopMovement: false,
                pushHistory: false,
                toast: false,
                rebuildPanel: true
            }) || liveArmature;
        }

        // Lean structural facing flip for mid-motion turn-arounds: mirror in place
        // without stopping playback, pushing history, rebuilding the panel, or toasting.
        const currentVisualFacing = this._getArmatureVisualFacingSide(liveArmature);
        const nextVisualFacing = currentVisualFacing === 'left' ? 'right' : 'left';
        this._flipArmatureFacingVisuals(liveArmature, nextVisualFacing);
        const refreshed = this._refreshDetectedArmatureReference(liveArmature);
        const targetArmature = refreshed || liveArmature;
        this._setArmatureVisualFacingSide(targetArmature, nextVisualFacing);
        this._setArmatureFacingSide(targetArmature, nextVisualFacing, {
            explicit: true,
            pushHistory: false,
            toast: false,
            reopenPanel: false,
            stopMovement: false
        });
        this._forceNamedManualSideAssemblyFromPool(this._getArmatureObjects(targetArmature), nextVisualFacing, false);
        this._syncArmatureVisualLayerOrder(targetArmature, nextVisualFacing);
        this._syncArmatureVisualJointPrefixes(targetArmature, nextVisualFacing);
        // Re-baseline joints for the new facing (matches _flipArmatureFacingInstant); without
        // this the relabeled forearm chain keeps a stale baseline and the return elbow flex is lost.
        const poseCatalog = this._getActiveArmaturePoseCatalog(targetArmature);
        this._applyArmaturePose(targetArmature, poseCatalog?.idle || { jointAngles: {} });
        if (this.objects._resolvePins) this.objects._resolvePins();
        if (targetArmature?.root?.id) this._currentArmature = targetArmature;
        this.stage.requestRender();
        return targetArmature;
    },

    _flipArmatureFacingInstant(armature) {        const liveArmature = (() => {
            const detected = this._detectArmature();
            if (armature?.root?.id && detected?.root?.id === armature.root.id) return detected;
            if (this._currentArmature?.root?.id && detected?.root?.id === this._currentArmature.root.id) return detected;
            return armature || this._currentArmature || detected;
        })();
        if (!liveArmature?.root) return liveArmature;

        const svgOppositeView = this._getSvgAfricanPremiumOppositeViewKey?.(liveArmature);
        if (svgOppositeView && typeof this._switchSvgAfricanPremiumView === 'function') {
            return this._switchSvgAfricanPremiumView(liveArmature, svgOppositeView, {
                stopMovement: true,
                pushHistory: true,
                toast: true,
                rebuildPanel: true
            }) || liveArmature;
        }

        this._stopArmatureMovement(liveArmature);
        const currentVisualFacing = this._getArmatureVisualFacingSide(liveArmature);
        const nextVisualFacing = currentVisualFacing === 'left' ? 'right' : 'left';
        const flippedCount = this._flipArmatureFacingVisuals(liveArmature, nextVisualFacing);
        const refreshed = this._refreshDetectedArmatureReference(liveArmature);
        const targetArmature = refreshed || liveArmature;
        this._setArmatureVisualFacingSide(targetArmature, nextVisualFacing);
        const facingChanged = this._setArmatureFacingSide(targetArmature, nextVisualFacing, {
            explicit: true,
            pushHistory: false,
            toast: false,
            reopenPanel: false,
            stopMovement: false
        });
        const namedRoleChanged = this._forceNamedManualSideAssemblyFromPool(
            this._getArmatureObjects(targetArmature),
            nextVisualFacing,
            false
        );
        const orderChanged = this._syncArmatureVisualLayerOrder(targetArmature, nextVisualFacing);
        const jointsChanged = this._syncArmatureVisualJointPrefixes(targetArmature, nextVisualFacing);
        const poseCatalog = this._getActiveArmaturePoseCatalog(targetArmature);
        const idlePose = poseCatalog?.idle || { jointAngles: {} };
        this._applyArmaturePose(targetArmature, idlePose);

        if (flippedCount > 0 || facingChanged || namedRoleChanged || jointsChanged || orderChanged) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
            eventBus.emit('history:push');
            Utils.showToast('Character flipped horizontally', 'success');
        }

        if (targetArmature?.root?.id) {
            this._currentArmature = targetArmature;
        }

        return targetArmature;
    },

    _collectManualAssemblyArmatureCandidate(pool, options = {}) {
        const poolObjs = Array.isArray(pool) ? pool.filter(obj => obj && !obj._ucGarmentLayer) : [];
        if (poolObjs.length < 4) return null;

        const rootNames = /torso|body|trunk|chest/i;
        const pinnedToIds = new Set(poolObjs.filter(o => o.pinnedTo).map(o => o.pinnedTo));

        let root = null;
        for (const obj of poolObjs) {
            if (pinnedToIds.has(obj.id) && rootNames.test(obj.name || '')) {
                root = obj;
                break;
            }
        }
        if (!root) {
            for (const obj of poolObjs) {
                if (pinnedToIds.has(obj.id)) {
                    root = obj;
                    break;
                }
            }
        }
        if (!root) return null;

        const children = poolObjs.filter(o => o.pinnedTo === root.id);
        if (children.length < 3) return null;

        const heads = [];
        const arms = [];
        const legs = [];
        children.forEach(child => {
            const info = this._classifyManualArmatureAssemblyObject(child, options);
            if (!info) return;
            const entry = { obj: child, ...info };
            if (info.kind === 'head') heads.push(entry);
            if (info.kind === 'arm') arms.push(entry);
            if (info.kind === 'leg') legs.push(entry);
        });

        if (!heads.length || !arms.length || !legs.length) return null;

        const totalJointCount = [root, ...children].reduce((sum, obj) => sum + (Array.isArray(obj.joints) ? obj.joints.length : 0), 0);
        return { root, children, heads, arms, legs, totalJointCount };
    },

    _inferManualAssemblyArmatureProfile(candidate) {
        if (!candidate?.root) return null;

        const torsoCenterX = candidate.root.x + candidate.root.width * (candidate.root.pivotX ?? 0.5);
        const torsoWidth = Math.max(1, Math.abs(candidate.root.width || 0));
        const threshold = Math.max(12, torsoWidth * 0.08);
        const centerX = (entry) => entry.obj.x + entry.obj.width * (entry.obj.pivotX ?? 0.5);
        const hasLeftAndRight = (entries) => {
            let left = false;
            let right = false;
            entries.forEach(entry => {
                const x = centerX(entry);
                if (x < torsoCenterX - threshold) left = true;
                if (x > torsoCenterX + threshold) right = true;
            });
            return left && right;
        };

        if (candidate.arms.length >= 2 && candidate.legs.length >= 2) {
            return (hasLeftAndRight(candidate.arms) && hasLeftAndRight(candidate.legs))
                ? 'front'
                : 'side-dual';
        }
        return null;
    },

    _buildManualAssemblyArmatureAssignments(candidate, profile, options = {}) {
        if (!candidate?.root || !profile) return null;

        const assignments = new Map();
        const frontBackFacing = String(options.frontBackFacing || '').toLowerCase() === 'back' ? 'back' : 'front';
        const centerX = (entry) => entry.obj.x + entry.obj.width * (entry.obj.pivotX ?? 0.5);
        const depthValue = (entry) => Number.isFinite(entry?.obj?.depth) ? entry.obj.depth : 0;
        const byCenterXAsc = (a, b) => centerX(a) - centerX(b);
        const byFrontDepth = (a, b) => {
            const depthDelta = depthValue(b) - depthValue(a);
            if (Math.abs(depthDelta) > 0.001) return depthDelta;
            return centerX(b) - centerX(a);
        };
        const explicitByRole = (entries, role) => entries.find(entry => entry.explicitRole === role) || null;
        const directionalByHint = (entries, hint) => entries.find(entry => this._getManualAssemblyDirectionalHint(entry) === hint) || null;
        const unassigned = (entries) => entries.filter(entry => !assignments.has(entry.obj.id));

        const pickHead = candidate.heads
            .slice()
            .sort((a, b) => (Math.abs((b.obj.height || 0) * (b.obj.width || 0)) - Math.abs((a.obj.height || 0) * (a.obj.width || 0))) || (a.obj.y - b.obj.y))[0];
        if (pickHead) assignments.set(pickHead.obj.id, 'head-neck');

        if (profile === 'front') {
            const assignFrontPair = (entries, leftRole, rightRole) => {
                const explicitRight = explicitByRole(entries, rightRole);
                const explicitLeft = explicitByRole(entries, leftRole);
                if (explicitRight) assignments.set(explicitRight.obj.id, rightRole);
                if (explicitLeft && explicitLeft.obj.id !== explicitRight?.obj.id) assignments.set(explicitLeft.obj.id, leftRole);
                const sorted = entries.slice().sort(byCenterXAsc);
                const remaining = unassigned(entries).slice().sort(byCenterXAsc);
                if (remaining[0]) assignments.set(remaining[0].obj.id, leftRole);
                const afterLeft = unassigned(entries).slice().sort(byCenterXAsc);
                if (afterLeft[afterLeft.length - 1]) assignments.set(afterLeft[afterLeft.length - 1].obj.id, rightRole);
            };
            if (frontBackFacing === 'back') {
                assignFrontPair(candidate.arms, 'left-arm', 'right-arm');
                assignFrontPair(candidate.legs, 'left-leg', 'right-leg');
            } else {
                assignFrontPair(candidate.arms, 'right-arm', 'left-arm');
                assignFrontPair(candidate.legs, 'right-leg', 'left-leg');
            }
        } else if (profile === 'side-dual') {
            const requestedFacing = String(options.sideFacing || '').toLowerCase();
            const facingSide = (requestedFacing === 'left' || requestedFacing === 'right')
                ? requestedFacing
                : (this._getManualSideVisualFacing(candidate) || this._inferManualAssemblyFacingSide(candidate));
            const namedOverrides = this._getNamedManualSideRoleOverrides(candidate, facingSide);
            if (namedOverrides.size) {
                namedOverrides.forEach((roleKey, objectId) => assignments.set(objectId, roleKey));
            }
            // Stage-facing convention:
            // - Face Stage Left  => left limbs are front
            // - Face Stage Right => right limbs are front
            const frontDirectionalHint = facingSide === 'left' ? 'left' : 'right';
            const backDirectionalHint = facingSide === 'left' ? 'right' : 'left';
            const assignSidePair = (entries, frontRole, backRole) => {
                const namedFrontEntries = entries
                    .filter(entry => this._getManualAssemblyDirectionalHint(entry) === 'front')
                    .sort(byFrontDepth);
                const namedBackEntries = entries
                    .filter(entry => this._getManualAssemblyDirectionalHint(entry) === 'back')
                    .sort(byFrontDepth);
                const namedRightEntries = entries
                    .filter(entry => this._getManualAssemblyDirectionalHint(entry) === 'right')
                    .sort(byFrontDepth);
                const namedLeftEntries = entries
                    .filter(entry => this._getManualAssemblyDirectionalHint(entry) === 'left')
                    .sort(byFrontDepth);

                // If the assembly is explicitly named as front/back limbs,
                // use those labels directly. This is the most reliable signal
                // for overlapping side rigs where pinOffsetX is intentionally 0.
                if (namedFrontEntries.length && namedBackEntries.length) {
                    const frontNamed = namedFrontEntries[0];
                    const backNamed = namedBackEntries[0];
                    if (frontNamed) assignments.set(frontNamed.obj.id, frontRole);
                    if (backNamed && backNamed.obj.id !== frontNamed?.obj.id) assignments.set(backNamed.obj.id, backRole);
                    return;
                }

                // If the assembly has explicit actor-side names, use those names
                // as the single source of truth for front/back assignment.
                if (namedRightEntries.length && namedLeftEntries.length) {
                    const frontNamed = facingSide === 'left' ? namedLeftEntries[0] : namedRightEntries[0];
                    const backNamed = facingSide === 'left' ? namedRightEntries[0] : namedLeftEntries[0];
                    if (frontNamed) assignments.set(frontNamed.obj.id, frontRole);
                    if (backNamed && backNamed.obj.id !== frontNamed?.obj.id) assignments.set(backNamed.obj.id, backRole);
                    return;
                }

                const hasLeftRightHints = entries.some(entry => {
                    const hint = this._getManualAssemblyDirectionalHint(entry);
                    return hint === 'left' || hint === 'right';
                });

                // If the artist named the assembly parts as left/right limbs,
                // trust that naming over any previous front/back promotion state.
                if (!hasLeftRightHints) {
                    const explicitFront = explicitByRole(entries, frontRole);
                    const explicitBack = explicitByRole(entries, backRole);
                    if (explicitFront) assignments.set(explicitFront.obj.id, frontRole);
                    if (explicitBack && explicitBack.obj.id !== explicitFront?.obj.id) assignments.set(explicitBack.obj.id, backRole);

                    const directionalFrontNamed = directionalByHint(unassigned(entries), 'front');
                    if (directionalFrontNamed) assignments.set(directionalFrontNamed.obj.id, frontRole);
                    const directionalBackNamed = directionalByHint(unassigned(entries), 'back');
                    if (directionalBackNamed && directionalBackNamed.obj.id !== directionalFrontNamed?.obj.id) {
                        assignments.set(directionalBackNamed.obj.id, backRole);
                    }
                }

                const frontCandidates = unassigned(entries)
                    .filter(entry => this._getManualAssemblyDirectionalHint(entry) === frontDirectionalHint)
                    .sort(byFrontDepth);
                if (frontCandidates[0]) assignments.set(frontCandidates[0].obj.id, frontRole);

                const backCandidates = unassigned(entries)
                    .filter(entry => this._getManualAssemblyDirectionalHint(entry) === backDirectionalHint)
                    .sort(byFrontDepth);
                if (backCandidates[0]) assignments.set(backCandidates[0].obj.id, backRole);

                if (!hasLeftRightHints) {
                    const directionalFront = directionalByHint(unassigned(entries), frontDirectionalHint);
                    if (directionalFront) assignments.set(directionalFront.obj.id, frontRole);
                    const directionalBack = directionalByHint(unassigned(entries), backDirectionalHint);
                    if (directionalBack && directionalBack.obj.id !== directionalFront?.obj.id) assignments.set(directionalBack.obj.id, backRole);
                }

                const remaining = unassigned(entries).slice().sort(byFrontDepth);
                if (remaining[0]) assignments.set(remaining[0].obj.id, frontRole);
                const afterFront = unassigned(entries).slice().sort(byFrontDepth);
                if (afterFront[0]) assignments.set(afterFront[0].obj.id, backRole);
            };
            if (!namedOverrides.size) {
                assignSidePair(candidate.arms, 'front-arm', 'back-arm');
                assignSidePair(candidate.legs, 'front-leg', 'back-leg');
            }
        }

        assignments.set(candidate.root.id, 'torso');
        return assignments;
    },

    _getArmaturePromotionJointSpecs(partKey) {
        switch (partKey) {
            case 'head-neck':
                return [{ name: 'neck', position: 0.10 }];
            case 'right-arm':
                return [
                    { name: 'right-shoulder', position: 0.06 },
                    { name: 'right-elbow', position: 0.42 },
                    { name: 'right-wrist', position: 0.78 }
                ];
            case 'left-arm':
                return [
                    { name: 'left-shoulder', position: 0.06 },
                    { name: 'left-elbow', position: 0.42 },
                    { name: 'left-wrist', position: 0.78 }
                ];
            case 'front-arm':
                return [
                    { name: 'front-shoulder', position: 0.06 },
                    { name: 'front-elbow', position: 0.42 },
                    { name: 'front-wrist', position: 0.78 }
                ];
            case 'back-arm':
                return [
                    { name: 'back-shoulder', position: 0.06 },
                    { name: 'back-elbow', position: 0.42 },
                    { name: 'back-wrist', position: 0.78 }
                ];
            case 'right-leg':
                return [
                    { name: 'right-hip', position: 0.06 },
                    { name: 'right-knee', position: 0.44 },
                    { name: 'right-ankle', position: 0.84 }
                ];
            case 'left-leg':
                return [
                    { name: 'left-hip', position: 0.06 },
                    { name: 'left-knee', position: 0.44 },
                    { name: 'left-ankle', position: 0.84 }
                ];
            case 'front-leg':
                return [
                    { name: 'front-hip', position: 0.06 },
                    { name: 'front-knee', position: 0.44 },
                    { name: 'front-ankle', position: 0.84 }
                ];
            case 'back-leg':
                return [
                    { name: 'back-hip', position: 0.06 },
                    { name: 'back-knee', position: 0.44 },
                    { name: 'back-ankle', position: 0.84 }
                ];
            case 'torso':
                return [
                    { name: 'waist', position: 0.30 }
                ];
            default:
                return [];
        }
    },

    _getArmaturePromotionJointDirection(partKey) {
        if (partKey === 'head-neck') return 'vertical-bt';
        if (partKey === 'torso') return 'vertical-bt';
        return 'vertical-tb';
    },

    _applyArmatureJointChainToObject(obj, partKey, options = {}) {
        if (!obj || !partKey) return false;
        if (partKey === 'torso' && !options.allowTorso) return false;
        const defaultSpecs = this._getArmaturePromotionJointSpecs(partKey);
        const sourceSpecs = Array.isArray(options.customSpecs) && options.customSpecs.length
            ? options.customSpecs
            : defaultSpecs;
        const specs = Array.isArray(options.customSpecs) && options.customSpecs.length && sourceSpecs.length === defaultSpecs.length
            ? sourceSpecs.map((spec, index) => ({
                ...spec,
                name: defaultSpecs[index]?.name || spec.name
            }))
            : sourceSpecs;
        if (!specs.length) return false;
        const expectedDirection = options.customDirection || this._getArmaturePromotionJointDirection(partKey);

        const existingJoints = Array.isArray(obj.joints) ? [...obj.joints] : [];
        const expectedNames = specs.map(spec => spec.name);
        const existingNames = existingJoints
            .sort((a, b) => a.position - b.position)
            .map(jt => String(jt?.name || ''));
        const existingPositions = existingJoints
            .sort((a, b) => a.position - b.position)
            .map(jt => Number.isFinite(jt?.position) ? jt.position : null);
        const existingCrossOffsets = existingJoints
            .sort((a, b) => a.position - b.position)
            .map(jt => Number.isFinite(jt?.crossOffset) ? jt.crossOffset : null);
        const namesMatch = existingNames.length === expectedNames.length
            && existingNames.every((name, index) => name === expectedNames[index]);
        const positionsMatch = existingPositions.length === specs.length
            && existingPositions.every((position, index) => position != null && Math.abs(position - specs[index].position) < 0.0005);
        const crossOffsetsMatch = existingCrossOffsets.length === specs.length
            && existingCrossOffsets.every((crossOffset, index) => {
                if (!Number.isFinite(specs[index].crossOffset)) return true;
                return crossOffset != null && Math.abs(crossOffset - specs[index].crossOffset) < 0.0005;
            });
        if (
            namesMatch
            && positionsMatch
            && crossOffsetsMatch
            && StageObject.normalizeJointDirection(obj.jointDirection) === expectedDirection
            && obj.jointContours
        ) {
            return false;
        }

        const direction = StageObject.getJointDirectionMeta(expectedDirection);
        const existingByName = new Map(
            existingJoints.map(jt => [
                String(jt?.name || '').toLowerCase().replace(/\s+/g, '-'),
                jt
            ])
        );
        // For role swaps (left↔right on front/back switch) the joint names change
        // but positions stay the same. Build a positional fallback so cross-offsets survive.
        const existingSorted = existingJoints.slice().sort((a, b) => a.position - b.position);

        obj.jointDirection = expectedDirection;
        obj.jointContours = true;
        obj.joints = specs.map((spec, idx) => {
            const key = String(spec.name || '').toLowerCase();
            let existing = existingByName.get(key);
            // Positional fallback: if no name match, use existing joint at same index
            // when positions are close (handles left↔right role swaps)
            if (!existing && existingSorted[idx] && Math.abs(existingSorted[idx].position - spec.position) < 0.05) {
                existing = existingSorted[idx];
            }
            const position = Math.max(0.01, Math.min(0.99, spec.position));
            const desiredCrossOffset = Number.isFinite(spec.crossOffset) ? spec.crossOffset : null;
            const crossOffset = existing?.crossOffset ?? desiredCrossOffset ?? (
                obj._getShapeCrossCenterAtPosition
                    ? obj._getShapeCrossCenterAtPosition(position, direction)
                    : 0.5
            );
            const contourScale = Number.isFinite(options.contourScale) ? options.contourScale : 1;
            let contourSize = existing?.contourSize ?? (1.0 * contourScale);
            if (existing?.contourSize == null) {
                // Prefer the pixel-derived size carried on the spec (from
                // _bslComputeImageJointCrossOffsets). Fall back to the default
                // disc size scaled by the optional caller contourScale factor.
                if (Number.isFinite(spec.contourSize)) {
                    // Spec carries a pixel-width-derived size relative to the
                    // part's own cross-dimension — use it directly without an
                    // additional scale factor (the pixel ratio is already correct).
                    contourSize = Math.max(0.20, Math.min(1.0, spec.contourSize));
                } else {
                    const base = /wrist|ankle|hand|foot/i.test(key) ? 0.90 : 1.0;
                    contourSize = base * contourScale;
                }
            }
            return {
                id: existing?.id || Utils.generateId('jt'),
                name: spec.name,
                position,
                crossOffset: Math.max(0.05, Math.min(0.95, Number.isFinite(crossOffset) ? crossOffset : 0.5)),
                angle: existing?.angle ?? 0,
                tiltX: existing?.tiltX ?? 0,
                tiltY: existing?.tiltY ?? 0,
                contourSize,
                contourColor: existing?.contourColor ?? null
            };
        });

        return true;
    },

    _promoteManualAssemblyToPoseArmature(pool) {
        const candidate = this._collectManualAssemblyArmatureCandidate(pool);
        if (!candidate) return false;

        const profile = this._inferManualAssemblyArmatureProfile(candidate);
        if (!profile) return false;
        const facingSide = profile === 'side-dual'
            ? this._inferManualAssemblyFacingSide(candidate)
            : null;

        const assignments = this._buildManualAssemblyArmatureAssignments(candidate, profile);
        if (!assignments || assignments.size < 5) return false;

        let changed = 0;
        const allowTorsoJoints = profile === 'side-dual';
        [candidate.root, ...candidate.children].forEach(obj => {
            const roleKey = assignments.get(obj.id);
            if (!roleKey) return;
            obj._armatureRoleKey = roleKey;
            obj._armaturePartKey = roleKey;
            obj._armaturePromotedFromAssembly = true;
            if (obj.id !== candidate.root.id) {
                obj.pinRotationMode = 'inherit';
                obj.pinInheritRotation = true;
            }
            if (this._applyArmatureJointChainToObject(obj, roleKey, { allowTorso: allowTorsoJoints })) changed++;
        });

        candidate.root._armaturePromotedFromAssembly = true;
        candidate.root._armaturePromotedProfile = profile;
        if (profile === 'front' && !candidate.root._armatureFrontBackFacing) {
            candidate.root._armatureFrontBackFacing = 'front';
        }
        if (facingSide) {
            candidate.root._armatureFacingSide = facingSide;
            candidate.root._armatureFacingExplicit = false;
        }
        if (profile === 'side-dual') {
            candidate.root._armatureSkinStrictSideProfile = candidate.root._armatureSkinStrictSideProfile !== false;
            candidate.root._armatureSkinAutoHiddenLimbs = candidate.root._armatureSkinAutoHiddenLimbs !== false;
        }

        if (changed > 0) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
            eventBus.emit('history:push');
            const profileLabel = profile === 'front' ? 'front' : 'side';
            Utils.showToast(`Converted the pinned ${profileLabel} assembly into a Pose Armature using the existing parts`, 'success');
            return true;
        }
        return false;
    },

    _repairPromotedManualAssemblyArmature(armature) {
        if (!armature?.root?._armaturePromotedFromAssembly) return false;

        const objects = this._getArmatureObjects(armature);
        const candidate = this._collectManualAssemblyArmatureCandidate(objects, { ignorePromotedRoles: true });
        if (!candidate) return false;

        const profile = this._inferManualAssemblyArmatureProfile(candidate);
        if (!profile) return false;
        const visualFacing = this._getManualSideVisualFacing(candidate);
        const facingSide = profile === 'side-dual'
            ? this._inferManualAssemblyFacingSide(candidate)
            : null;

        const assignments = this._buildManualAssemblyArmatureAssignments(candidate, profile, {
            sideFacing: visualFacing || facingSide,
            frontBackFacing: profile === 'front'
                ? this._getArmatureFrontBackFacing(armature)
                : 'front'
        });
        if (!assignments) return false;

        let changed = false;
        [candidate.root, ...candidate.children].forEach(obj => {
            const roleKey = assignments.get(obj.id);
            if (!roleKey) return;
            if (obj._armatureRoleKey !== roleKey) {
                obj._armatureRoleKey = roleKey;
                changed = true;
            }
            if (obj._armaturePartKey !== roleKey) {
                obj._armaturePartKey = roleKey;
                changed = true;
            }
            if (obj.id !== candidate.root.id && this._applyArmatureJointChainToObject(obj, roleKey)) {
                changed = true;
            }
        });

        if (candidate.root._armaturePromotedProfile !== profile) {
            candidate.root._armaturePromotedProfile = profile;
            changed = true;
        }
        if (profile === 'front' && !candidate.root._armatureFrontBackFacing) {
            candidate.root._armatureFrontBackFacing = 'front';
            changed = true;
        }
        if (!visualFacing && facingSide && candidate.root._armatureFacingSide !== facingSide) {
            candidate.root._armatureFacingSide = facingSide;
            changed = true;
        }

        if (changed) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
        }

        return changed;
    },

    _forceNamedManualSideAssemblyFromPool(pool, facingOverride = null, explicitFacing = false) {
        const candidate = this._collectManualAssemblyArmatureCandidate(pool, { ignorePromotedRoles: true });
        if (!candidate) return false;
        if (this._armatureDeclaresFrontBackRoleModel(candidate.root)) return false;
        if (this._inferManualAssemblyArmatureProfile(candidate) !== 'side-dual') return false;

        const mapping = this._getNamedManualSideRoleOverrides(candidate, facingOverride);
        if (!mapping.size) return false;

        const overrideFacing = String(facingOverride || '').toLowerCase();
        const storedFacing = String(candidate.root._armatureFacingSide || '').toLowerCase();
        const visualFacing = this._getManualSideVisualFacing(candidate);
        const facingSide = (visualFacing === 'left' || visualFacing === 'right')
            ? visualFacing
            : ((overrideFacing === 'left' || overrideFacing === 'right')
                ? overrideFacing
                : ((candidate.root._armatureFacingExplicit === true && (storedFacing === 'left' || storedFacing === 'right'))
                    ? storedFacing
                    : this._inferManualAssemblyFacingSide(candidate)));
        let changed = false;

        [candidate.root, ...candidate.children].forEach(obj => {
            const roleKey = obj.id === candidate.root.id ? 'torso' : mapping.get(obj.id);
            if (!roleKey) return;
            if (obj._armatureRoleKey !== roleKey) {
                obj._armatureRoleKey = roleKey;
                changed = true;
            }
            if (obj._armaturePartKey !== roleKey) {
                obj._armaturePartKey = roleKey;
                changed = true;
            }
            if (obj._armaturePromotedFromAssembly !== true) {
                obj._armaturePromotedFromAssembly = true;
                changed = true;
            }
            if (obj.id !== candidate.root.id && this._applyArmatureJointChainToObject(obj, roleKey)) {
                changed = true;
            }
        });

        if (!visualFacing && candidate.root._armatureFacingSide !== facingSide) {
            candidate.root._armatureFacingSide = facingSide;
            changed = true;
        }
        if (explicitFacing && candidate.root._armatureFacingExplicit !== true) {
            candidate.root._armatureFacingExplicit = true;
            changed = true;
        }
        if (candidate.root._armaturePromotedFromAssembly !== true) {
            candidate.root._armaturePromotedFromAssembly = true;
            changed = true;
        }
        if (candidate.root._armaturePromotedProfile !== 'side-dual') {
            candidate.root._armaturePromotedProfile = 'side-dual';
            changed = true;
        }

        if (changed) {
            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
        }

        return changed;
    },

    _forceNamedManualSideArmatureRoles(armature, facingOverride = null, explicitFacing = false) {
        if (!armature?.root) return false;
        return this._forceNamedManualSideAssemblyFromPool(this._getArmatureObjects(armature), facingOverride, explicitFacing);
    },

    /**
     * Detect a Pose Armature on stage.
     * An armature is a root object (torso/body) with children pinned to it,
     * where children have named joints (shoulder, elbow, hip, knee, etc.).
     * Returns { root, parts: { partKey: { obj, joints: { jointName: jointRef } } } } or null.
     */
    _detectArmatureFromPool(pool) {
        const rootNames = /torso|body|trunk|chest/i;
        const poolObjs = Array.isArray(pool) ? pool.filter(obj => obj && !obj._ucGarmentLayer) : [];
        if (poolObjs.length < 3) return null;
        const pinnedToIds = new Set(poolObjs.filter(o => o.pinnedTo).map(o => o.pinnedTo));

        let root = null;
        for (const obj of poolObjs) {
            if (pinnedToIds.has(obj.id) && rootNames.test(obj.name || '')) {
                root = obj;
                break;
            }
        }
        if (!root) {
            for (const obj of poolObjs) {
                if (pinnedToIds.has(obj.id)) {
                    root = obj;
                    break;
                }
            }
        }
        if (!root) return null;

        const children = poolObjs.filter(o => o.pinnedTo === root.id
            && !o._backViewScalpHair && o.name !== 'Scalp Hair (Back View)'
            && !o._backViewTorsoOverlay && o.name !== 'Torso (Back View)');
        if (children.length < 2) return null;

        const usesFrontBackRoleModel = this._armatureDeclaresFrontBackRoleModel(root);
        const namedSideCandidate = usesFrontBackRoleModel
            ? null
            : this._collectManualAssemblyArmatureCandidate([root, ...children], { ignorePromotedRoles: true });
        const namedSideOverrides = usesFrontBackRoleModel
            ? new Map()
            : this._getNamedManualSideRoleOverrides(namedSideCandidate);

        const parts = {};
        parts['torso'] = { obj: root, joints: {} };
        if (root.joints) {
            root.joints.forEach(jt => {
                const key = (jt.name || '').toLowerCase().replace(/\s+/g, '-');
                if (key) parts['torso'].joints[key] = jt;
            });
        }

        children.forEach(child => {
            const declaredFrontBackRole = usesFrontBackRoleModel
                ? this._normalizeArmatureRoleKey(
                    child._svgCharacterPartKey
                    || child._svgCharacterPremiumPartKey
                    || child.bodyPartData?.partKey
                    || ''
                )
                : '';
            const declaredPremiumRole = root._characterAppearanceProvider === 'svg-african-premium'
                ? this._normalizeArmatureRoleKey(
                    child._svgCharacterPartKey
                    || child._svgCharacterPremiumPartKey
                    || child._armatureRoleKey
                    || child._armaturePartKey
                    || child.bodyPartData?.partKey
                    || ''
                )
                : '';
            const explicitRole = this._normalizeArmatureRoleKey(
                declaredFrontBackRole
                || declaredPremiumRole
                || namedSideOverrides.get(child.id)
                || child._armatureRoleKey
                || child._armaturePartKey
                || ''
            );
            const name = (child.name || '').toLowerCase();
            let partKey = explicitRole || name.replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
            if (!partKey) partKey = 'part-' + child.id.slice(-4);

            const jointRefs = {};
            if (child.joints && child.joints.length > 0) {
                const sorted = [...child.joints].sort((a, b) => a.position - b.position);
                sorted.forEach(jt => {
                    const jName = (jt.name || '').toLowerCase().replace(/\s+/g, '-');
                    if (jName) jointRefs[jName] = jt;
                });
            }
            parts[partKey] = { obj: child, joints: jointRefs };
        });

        let jointCount = 0;
        Object.values(parts).forEach(p => { jointCount += Object.keys(p.joints).length; });
        if (jointCount < 3) return null;

        return {
            root,
            parts,
            _normalizedDownBaseline: !!root?._normalizedDownBaseline
        };
    },

    _detectSelectedArmature() {
        const allObjs = this.objects.objects || [];
        const selectedObjs = this.objects.getSelectedObjects?.() || [];
        if (!selectedObjs.length) return null;

        const selectedIds = new Set(selectedObjs.map(obj => obj?.id).filter(Boolean));
        if (this._currentArmature?.root?.id) {
            const currentArmatureObjects = this._getArmatureObjects(this._currentArmature);
            const currentSelectedObjects = currentArmatureObjects.filter(obj => selectedIds.has(obj?.id));
            if (currentSelectedObjects.length) {
                const preferred = this._detectArmatureFromPool(currentArmatureObjects);
                if (preferred?.root?.id === this._currentArmature.root.id) {
                    return preferred;
                }
            }
        }

        const byId = new Map(allObjs.map(obj => [obj?.id, obj]));
        for (const selected of selectedObjs) {
            if (!selected?.id) continue;
            const candidateRoot = selected.pinnedTo ? byId.get(selected.pinnedTo) : selected;
            if (!candidateRoot?.id) continue;
            const pool = [candidateRoot, ...allObjs.filter(obj => obj?.pinnedTo === candidateRoot.id)];
            const detected = this._detectArmatureFromPool(pool);
            if (detected) return detected;
        }

        if (selectedIds.size >= 3) {
            return this._detectArmatureFromPool(allObjs.filter(obj => selectedIds.has(obj?.id)));
        }

        return null;
    },

    _detectArmature() {
        const allObjs = this.objects.objects || [];
        const selectedArmature = this._detectSelectedArmature();
        if (selectedArmature) return selectedArmature;
        return this._detectArmatureFromPool(allObjs);
    },

    _shouldNormalizeArmaturePartToIdleDown(partKey = '') {
        const key = String(partKey || '').toLowerCase();
        if (!key) return false;
        if (/(torso|body|trunk|chest|head|neck|hand|foot|toe|finger|palm)/.test(key)) {
            return false;
        }
        return /(arm|forearm|upper-arm|lower-arm|leg|thigh|shin|calf|limb)/.test(key);
    },

    _normalizeArmatureLimbBaselines(armature) {
        const summary = { candidates: 0, changed: 0, failed: 0 };
        if (!armature || !this.objects?.normalizeObjectDownBaseline) return summary;

        Object.entries(armature.parts || {}).forEach(([partKey, part]) => {
            if (!part?.obj || !this._shouldNormalizeArmaturePartToIdleDown(partKey)) return;
            summary.candidates++;
            const result = this.objects.normalizeObjectDownBaseline(part.obj, {
                bake: true,
                targetFromDown: 0
            });
            if (result.failed) summary.failed++;
            else if (result.changed) summary.changed++;
        });

        const normalized = summary.candidates > 0 && summary.failed === 0;
        armature._normalizedDownBaseline = normalized;
        if (armature?.root) {
            armature.root._normalizedDownBaseline = normalized;
        }
        if (summary.changed && this.objects._resolvePins) this.objects._resolvePins();
        return summary;
    },

    _resetArmatureToIdleBaseline(armature, options = {}) {
        if (!armature) return 0;
        const { resetInnerJoints = true } = options;
        let changed = 0;
        const objects = [];
        const seen = new Set();
        if (armature.root?.id) {
            objects.push(armature.root);
            seen.add(armature.root.id);
        }
        Object.values(armature.parts || {}).forEach(part => {
            if (!part?.obj?.id || seen.has(part.obj.id)) return;
            seen.add(part.obj.id);
            objects.push(part.obj);
        });

        objects.forEach(obj => {
            obj.armatureReachDepth = 0;
            if (this._resetObjectToIdleBaseline(obj, { resetInnerJoints })) changed++;
        });

        const basePosition = this._getArmatureBasePosition(armature, { initialize: false });
        const baseX = Number.isFinite(basePosition?.x) ? basePosition.x : undefined;
        const baseY = Number.isFinite(basePosition?.y) ? basePosition.y : undefined;
        if (
            armature.root && (
                (Number.isFinite(baseX) && Math.abs((armature.root.x ?? 0) - baseX) > 0.001)
                || (Number.isFinite(baseY) && Math.abs((armature.root.y ?? 0) - baseY) > 0.001)
            )
        ) {
            this._setArmatureRootPosition(armature, baseX, baseY);
            changed++;
        }

        if (changed && this.objects?._resolvePins) this.objects._resolvePins();
        return changed;
    },




    _getArmatureJointAuthoringOffset(armature, jointName = '') {
        return 0;
    },

    _getArmatureTorsoAttachmentJointName(partKey = '') {
        switch (String(partKey || '').toLowerCase()) {
            case 'head-neck':
                return 'torso-neck';
            case 'right-arm':
                return 'torso-right-shoulder';
            case 'left-arm':
                return 'torso-left-shoulder';
            case 'front-arm':
                return 'torso-front-shoulder';
            case 'back-arm':
                return 'torso-back-shoulder';
            case 'right-leg':
                return 'torso-right-hip';
            case 'left-leg':
                return 'torso-left-hip';
            case 'front-leg':
                return 'torso-front-hip';
            case 'back-leg':
                return 'torso-back-hip';
            default:
                return '';
        }
    },

    _usesSixPieceSideTorsoPinModel(armature) {
        if (!armature) return false;
        const promotedProfile = String(armature?.root?._armaturePromotedProfile || '').toLowerCase();
        if (promotedProfile === 'side-dual') return true;

        const partKeys = new Set(
            Object.keys(armature?.parts || {}).map(key => String(key || '').toLowerCase())
        );
        Object.values(armature?.parts || {}).forEach(part => {
            const obj = part?.obj;
            const roleKey = String(obj?._armatureRoleKey || obj?._armaturePartKey || '').toLowerCase();
            if (roleKey) partKeys.add(roleKey);
        });
        return partKeys.has('head-neck')
            && partKeys.has('front-arm')
            && partKeys.has('back-arm')
            && partKeys.has('front-leg')
            && partKeys.has('back-leg');
    },

    _usesFrontBackWaistOnlyTorsoModel(armature) {
        if (!armature?.root) return false;
        if (this._armatureUsesHumanFrontCatalog(armature)) return true;
        const promotedProfile = String(armature.root._armaturePromotedProfile || '').toLowerCase();
        if (promotedProfile === 'front') return true;
        const facing = String(armature.root._armatureFrontBackFacing || '').toLowerCase();
        return facing === 'front' || facing === 'back';
    },
    _usesAuthoredFrontBackDummyPinModel(armature) {
        if (!this._usesFrontBackWaistOnlyTorsoModel(armature)) return false;

        const normalizeName = (value = '') => String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
        const matchesJointPin = (partKey, jointName) => {
            const obj = armature?.parts?.[partKey]?.obj;
            return !!obj
                && String(obj.pinTargetType || 'anchor') === 'joint'
                && normalizeName(obj.pinJointName || '') === normalizeName(jointName);
        };
        const matchesAnchorPin = (partKey, anchorX, anchorY) => {
            const obj = armature?.parts?.[partKey]?.obj;
            return !!obj
                && String(obj.pinTargetType || 'anchor') !== 'joint'
                && Number.isFinite(obj.pinAnchorX)
                && Number.isFinite(obj.pinAnchorY)
                && Math.abs(obj.pinAnchorX - anchorX) < 0.0005
                && Math.abs(obj.pinAnchorY - anchorY) < 0.0005;
        };

        const facing = this._getArmatureFrontBackFacing(armature) === 'back' ? 'back' : 'front';
        const rightLegAnchorX = facing === 'back' ? 0.64 : 0.36;
        const leftLegAnchorX = facing === 'back' ? 0.36 : 0.64;

        return matchesJointPin('head-neck', 'waist')
            && matchesJointPin('left-arm', 'waist')
            && matchesJointPin('right-arm', 'waist')
            && matchesAnchorPin('right-leg', rightLegAnchorX, 0.84)
            && matchesAnchorPin('left-leg', leftLegAnchorX, 0.84);
    },

    _isSixPieceSideUpperBodyPart(partKey = '') {
        switch (String(partKey || '').toLowerCase()) {
            case 'head-neck':
            case 'right-arm':
            case 'left-arm':
            case 'front-arm':
            case 'back-arm':
                return true;
            default:
                return false;
        }
    },

    _isSixPieceSideLowerBodyPart(partKey = '') {
        switch (String(partKey || '').toLowerCase()) {
            case 'right-leg':
            case 'left-leg':
            case 'front-leg':
            case 'back-leg':
                return true;
            default:
                return false;
        }
    },

    _getArmatureFrontBackSocketAnchor(partKey = '', child = null, armature = null) {
        const key = String(partKey || '').toLowerCase();
        const currentX = Number.isFinite(child?.pinAnchorX) ? child.pinAnchorX : null;
        const currentY = Number.isFinite(child?.pinAnchorY) ? child.pinAnchorY : null;
        const facing = armature?.root ? this._getArmatureFrontBackFacing(armature) : null;
        const isBackFacing = facing === 'back';
        const fallback = (() => {
            switch (key) {
                case 'head-neck':
                    return { x: 0.50, y: 0.06 };
                case 'right-arm':
                case 'front-arm':
                    return { x: 0.08, y: 0.22 };
                case 'left-arm':
                case 'back-arm':
                    return { x: 0.92, y: 0.22 };
                case 'right-leg':
                case 'front-leg':
                    return { x: isBackFacing ? 0.64 : 0.36, y: 0.84 };
                case 'left-leg':
                case 'back-leg':
                    return { x: isBackFacing ? 0.36 : 0.64, y: 0.84 };
                default:
                    return { x: 0.50, y: 0.50 };
            }
        })();
        return {
            x: currentX ?? fallback.x,
            y: currentY ?? fallback.y
        };
    },

    _getArmatureTorsoAttachmentSpecs(armature) {
        const torso = armature?.parts?.torso?.obj || armature?.root;
        if (!torso) return [];

        const normalizeName = (value = '') => String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
        const existingByName = new Map(
            (torso.joints || []).map(jt => [normalizeName(jt?.name), jt])
        );
        if (this._usesSixPieceSideTorsoPinModel(armature)) {
            const waistExisting = existingByName.get('waist');
            return [{
                name: 'waist',
                position: waistExisting?.position ?? 0.30,
                crossOffset: waistExisting?.crossOffset ?? 0.50
            }];
        }

        if (this._usesFrontBackWaistOnlyTorsoModel(armature)) {
            const waistExisting = existingByName.get('waist');
            return [{
                name: 'waist',
                position: waistExisting?.position ?? 0.30,
                crossOffset: waistExisting?.crossOffset ?? 0.50
            }];
        }

        const specs = [];
        const seen = new Set();
        const addSpec = (name, position, crossOffset) => {
            const key = normalizeName(name);
            if (!key || seen.has(key)) return;
            if (!Number.isFinite(position) || !Number.isFinite(crossOffset)) return;
            specs.push({
                name,
                position: Math.max(0.01, Math.min(0.99, position)),
                crossOffset: Math.max(0.05, Math.min(0.95, crossOffset))
            });
            seen.add(key);
        };

        Object.entries(armature?.parts || {}).forEach(([partKey, part]) => {
            if (partKey === 'torso' || !part?.obj || part.obj.pinnedTo !== torso.id) return;
            const jointName = this._getArmatureTorsoAttachmentJointName(partKey);
            if (!jointName) return;
            const existing = existingByName.get(normalizeName(jointName));
            const position = Number.isFinite(existing?.position)
                ? existing.position
                : (Number.isFinite(part.obj.pinAnchorY) ? (1 - part.obj.pinAnchorY) : null);
            const crossOffset = Number.isFinite(existing?.crossOffset)
                ? existing.crossOffset
                : (Number.isFinite(part.obj.pinAnchorX) ? part.obj.pinAnchorX : null);
            addSpec(jointName, position, crossOffset);
        });

        const waistExisting = existingByName.get('waist');
        addSpec('waist', waistExisting?.position ?? 0.30, waistExisting?.crossOffset ?? 0.50);
        return specs.sort((a, b) => a.position - b.position);
    },

    /**
     * Returns true when every pinned child of the torso already has a full
     * armature joint chain AND uses anchor-based pins (pinTargetType !== 'joint').
     * This indicates a body-slicer assembly where torso-attachment joints
     * and joint-based pin conversion should be skipped.
     *
     * ALSO returns true when the torso already has the expected attachment
     * joints and all children are already using joint-based pins — i.e.
     * _ensureArmatureTorsoAttachmentRig ran in a previous session and the
     * rig was saved/loaded.
     */
    _childrenAlreadyHaveAnchorJointChains(armature) {
        const torso = armature?.parts?.torso?.obj;
        if (!torso) return false;
        const children = Object.entries(armature.parts || {}).filter(([k]) => k !== 'torso');
        if (children.length < 2) return false;

        // Path A: all children use anchor pins + full joint chains (slicer assembly)
        const allAnchorPath = children.every(([partKey, part]) => {
            const child = part?.obj;
            if (!child || child.pinnedTo !== torso.id) return true;
            if (child.pinTargetType === 'joint') return false;
            const roleKey = String(child._armatureRoleKey || child._armaturePartKey || partKey || '').toLowerCase();
            const expectedSpecs = this._getArmaturePromotionJointSpecs(roleKey);
            if (!expectedSpecs.length) return true;
            const existingNames = (child.joints || []).map(j => String(j?.name || ''));
            const expectedNames = expectedSpecs.map(s => s.name);
            return existingNames.length === expectedNames.length
                && existingNames.every((n, i) => n === expectedNames[i]);
        });
        // Front/back human armatures should always be rechecked by the shared
        // torso rig so legacy torso shoulder/hip joints are collapsed back to
        // the waist-only model even when children already have anchor chains.
        if (this._usesFrontBackWaistOnlyTorsoModel(armature)) return false;
        if (allAnchorPath) return true;

        // Path B: all children use joint pins + have full joint chains,
        // AND the torso already has the expected attachment joints.
        // This covers previously-saved armatures where the rig already ran.
        const normalizeName = (v = '') => String(v || '').toLowerCase().trim().replace(/\s+/g, '-');
        const torsoJointNames = new Set(
            (torso.joints || []).map(jt => normalizeName(jt?.name))
        );
        const allJointPath = children.every(([partKey, part]) => {
            const child = part?.obj;
            if (!child || child.pinnedTo !== torso.id) return true;
            // Child must use joint-based pins
            if (child.pinTargetType !== 'joint') return false;
            // Child must have a full joint chain matching its role
            const roleKey = String(child._armatureRoleKey || child._armaturePartKey || partKey || '').toLowerCase();
            const expectedSpecs = this._getArmaturePromotionJointSpecs(roleKey);
            if (!expectedSpecs.length) return true;
            const existingNames = (child.joints || []).map(j => String(j?.name || ''));
            const expectedNames = expectedSpecs.map(s => s.name);
            if (existingNames.length !== expectedNames.length) return false;
            if (!existingNames.every((n, i) => n === expectedNames[i])) return false;
            // The torso attachment joint for this child's role must exist
            const attachName = this._getArmatureTorsoAttachmentJointName(roleKey);
            if (attachName && !torsoJointNames.has(normalizeName(attachName))) return false;
            return true;
        });
        return allJointPath;
    },

    _ensureArmatureTorsoAttachmentRig(armature) {
        if (!armature?.parts?.torso?.obj || !this.objects) return false;

        const torso = armature.parts.torso.obj;
        const preserveAuthoredFrontBackDummyPins = this._usesAuthoredFrontBackDummyPinModel(armature)
            || (
                this._armatureUsesUniversalFrontBackCatalog?.(armature) === true
                && this._usesFrontBackWaistOnlyTorsoModel?.(armature) === true
            );
        const shouldForceFrontBackTorsoRig = !!torso._bslSkipTorsoAttachmentRig
            && this._usesFrontBackWaistOnlyTorsoModel(armature)
            && !preserveAuthoredFrontBackDummyPins;
        // Slicer image parts and side-dual rigs intentionally use anchor-based pins.
        // Front/back human armatures should still receive torso attachment joints,
        // including older saved files that were incorrectly marked to skip them.
        if (torso._bslSkipTorsoAttachmentRig && !shouldForceFrontBackTorsoRig) return false;
        if (shouldForceFrontBackTorsoRig) {
            delete torso._bslSkipTorsoAttachmentRig;
        }

        // State-based detection: if all pinned children already have full
        // armature joint chains AND use anchor-based pins, the slicer (or a
        // previous session) set these up correctly — don't convert to
        // joint-based torso-attachment pins.
        if (preserveAuthoredFrontBackDummyPins) {
            torso._bslSkipTorsoAttachmentRig = true;
            return false;
        }
        if (this._childrenAlreadyHaveAnchorJointChains(armature)) {
            torso._bslSkipTorsoAttachmentRig = true;   // cache for session
            return false;
        }

        const specs = this._getArmatureTorsoAttachmentSpecs(armature);
        const useSixPieceSidePins = this._usesSixPieceSideTorsoPinModel(armature);
        const useFrontBackWaistPins = !useSixPieceSidePins && this._usesFrontBackWaistOnlyTorsoModel(armature);
        const useWaistParentPins = useSixPieceSidePins || useFrontBackWaistPins;
        const visualFacing = this._getArmatureVisualFacingSide(armature);
        if (!specs.length) return false;

        let changed = this._applyArmatureJointChainToObject(torso, 'torso', {
            allowTorso: true,
            customSpecs: specs,
            customDirection: 'vertical-bt'
        });

        const normalizeName = (value = '') => String(value || '').toLowerCase().trim().replace(/\s+/g, '-');
        const torsoJointsByName = new Map(
            (torso.joints || []).map(jt => [normalizeName(jt?.name), jt])
        );
        armature.parts.torso.joints = {};
        (torso.joints || []).forEach(jt => {
            const key = normalizeName(jt?.name);
            if (key) armature.parts.torso.joints[key] = jt;
        });

        Object.entries(armature.parts || {}).forEach(([partKey, part]) => {
            if (partKey === 'torso') return;
            const child = part?.obj;
            if (!child || child.pinnedTo !== torso.id) return;
            const effectivePartKey = String(child._armatureRoleKey || child._armaturePartKey || partKey || '').toLowerCase();
            const wasTargetType = child.pinTargetType || 'anchor';
            const wasJointId = child.pinJointId || null;
            const wasJointName = child.pinJointName || null;
            const desiredRotationMode = 'inherit';

            if (child.pinRotationMode !== desiredRotationMode) {
                child.pinRotationMode = desiredRotationMode;
                changed = true;
            }
            const desiredInheritRotation = desiredRotationMode === 'inherit';
            if (child.pinInheritRotation !== desiredInheritRotation) {
                child.pinInheritRotation = desiredInheritRotation;
                changed = true;
            }

            const setAnchor = (anchorX, anchorY) => {
                if (Number.isFinite(anchorX) && child.pinAnchorX !== anchorX) {
                    child.pinAnchorX = anchorX;
                    changed = true;
                }
                if (Number.isFinite(anchorY) && child.pinAnchorY !== anchorY) {
                    child.pinAnchorY = anchorY;
                    changed = true;
                }
            };

            if (
                (useSixPieceSidePins && this._isSixPieceSideLowerBodyPart(effectivePartKey))
                || (useFrontBackWaistPins && this._isSixPieceSideLowerBodyPart(effectivePartKey))
            ) {
                child.pinTargetType = 'anchor';
                child.pinJointId = null;
                child.pinJointName = null;
                if (useFrontBackWaistPins) {
                    const anchor = this._getArmatureFrontBackSocketAnchor(effectivePartKey, child, armature);
                    setAnchor(anchor.x, anchor.y);
                }
            } else {
                const useUpperBodyWaistPin = useWaistParentPins && this._isSixPieceSideUpperBodyPart(effectivePartKey);
                const targetName = useUpperBodyWaistPin
                    ? 'waist'
                    : this._getArmatureTorsoAttachmentJointName(effectivePartKey);
                if (!targetName) return;
                const targetJoint = torsoJointsByName.get(normalizeName(targetName));
                if (!targetJoint) return;

                const contourAnchor = useFrontBackWaistPins && useUpperBodyWaistPin
                    ? this._getArmatureFrontBackSocketAnchor(effectivePartKey, child, armature)
                    : null;
                const contourJointName = !contourAnchor && useUpperBodyWaistPin
                    ? this._getArmatureTorsoAttachmentJointName(effectivePartKey)
                    : targetName;
                const contourJoint = contourJointName
                    ? torsoJointsByName.get(normalizeName(contourJointName)) || targetJoint
                    : targetJoint;

                child.pinTargetType = 'joint';
                child.pinJointId = targetJoint.id || null;
                child.pinJointName = targetJoint.name || targetName;
                if (contourAnchor) {
                    setAnchor(contourAnchor.x, contourAnchor.y);
                } else {
                    setAnchor(
                        contourJoint?.crossOffset ?? child.pinAnchorX ?? 0.5,
                        1 - (contourJoint?.position ?? (1 - (child.pinAnchorY ?? 0.5)))
                    );
                }
            }

            const useAttachmentPin = useWaistParentPins && this._isSixPieceSideUpperBodyPart(effectivePartKey) && child.pinTargetType === 'joint';
            child._armatureAttachmentPin = !!useAttachmentPin;
            // Attachment pins must stay stable across pose keyframes.
            // Recalibrate only when the pin target/facing changes or the pin was never calibrated.
            const shouldRefreshAttachmentPin = false;
            const sidePinFacingChanged = useSixPieceSidePins
                && child._armaturePinCalibratedFacing !== visualFacing;
            const attachmentFacingChanged = useAttachmentPin
                && child._armatureAttachmentPinCalibratedFacing !== visualFacing;
            const pinTargetChanged = wasTargetType !== child.pinTargetType || wasJointId !== child.pinJointId || wasJointName !== child.pinJointName;
            if (
                pinTargetChanged
                || !Number.isFinite(child.pinOffsetX)
                || !Number.isFinite(child.pinOffsetY)
                || (useAttachmentPin && child._armatureAttachmentPinCalibrated !== true)
                || shouldRefreshAttachmentPin
                || sidePinFacingChanged
                || attachmentFacingChanged
            ) {
                let offset = null;
                if (useWaistParentPins && this.objects?._getPinTargetWorldTransform && this.objects?._getPinOffsetInTargetSpace) {
                    const target = this.objects._getPinTargetWorldTransform(torso, child);
                    if (target) {
                        if (useAttachmentPin && child?._getArmatureAttachmentJoint) {
                            const attachmentJoint = child._getArmatureAttachmentJoint();
                            const attachmentPoint = attachmentJoint
                                ? (
                                    child._getArmatureAttachmentJointWorldPosition
                                        ? child._getArmatureAttachmentJointWorldPosition(attachmentJoint)
                                        : child.getJointWorldPosition(attachmentJoint)
                                )
                                : null;
                            if (attachmentPoint) {
                                offset = this.objects._getPinOffsetInTargetSpace(
                                    target.x,
                                    target.y,
                                    target.rotation,
                                    attachmentPoint.x,
                                    attachmentPoint.y,
                                    target.tiltTransform
                                );
                            }
                            child._armatureAttachmentPinCalibrated = !!offset;
                        } else {
                            const childPivot = child.getPivotPoint?.();
                            if (childPivot) {
                                offset = this.objects._getPinOffsetInTargetSpace(
                                    target.x,
                                    target.y,
                                    target.rotation,
                                    childPivot.x,
                                    childPivot.y,
                                    target.tiltTransform
                                );
                            }
                        }
                    }
                    if (offset) {
                        if (useSixPieceSidePins) {
                            child._armaturePinCalibratedFacing = visualFacing;
                        }
                        if (useAttachmentPin) {
                            child._armatureAttachmentPinCalibratedFacing = visualFacing;
                        }
                    }
                }
                if (!offset) {
                    const childPivot = child.getPivotPoint();
                    offset = this.objects._getPinOffsetForChildTarget
                        ? this.objects._getPinOffsetForChildTarget(torso, child, childPivot.x, childPivot.y)
                        : null;
                    if (offset && useSixPieceSidePins) {
                        child._armaturePinCalibratedFacing = visualFacing;
                    }
                    if (offset && useAttachmentPin) {
                        child._armatureAttachmentPinCalibrated = true;
                        child._armatureAttachmentPinCalibratedFacing = visualFacing;
                    }
                }
                offset = this._getSixPieceSideFacingPinOffsetCalibration(
                    armature,
                    effectivePartKey,
                    visualFacing,
                    offset
                );
                if (offset) {
                    if (Math.abs((child.pinOffsetX || 0) - offset.x) > 0.001 || Math.abs((child.pinOffsetY || 0) - offset.y) > 0.001) {
                        changed = true;
                    }
                    child.pinOffsetX = offset.x;
                    child.pinOffsetY = offset.y;
                }
            }

            if (useSixPieceSidePins) {
                const normalizedOffset = this._getSixPieceSideFacingPinOffsetCalibration(
                    armature,
                    effectivePartKey,
                    visualFacing,
                    {
                        x: Number.isFinite(child.pinOffsetX) ? child.pinOffsetX : 0,
                        y: Number.isFinite(child.pinOffsetY) ? child.pinOffsetY : 0
                    }
                );
                if (normalizedOffset) {
                    if (Math.abs((child.pinOffsetX || 0) - normalizedOffset.x) > 0.001 || Math.abs((child.pinOffsetY || 0) - normalizedOffset.y) > 0.001) {
                        child.pinOffsetX = normalizedOffset.x;
                        child.pinOffsetY = normalizedOffset.y;
                        changed = true;
                    }
                }
            }

            if (pinTargetChanged) {
                changed = true;
            }
        });

        if (changed && this.objects._resolvePins) this.objects._resolvePins();
        return changed;
    },

    _shouldMirrorSideFacingArmature(armature) {
        if (!armature) return false;
        if (this._armatureUsesHumanSideDualArmCatalog(armature)) {
            const facingSide = this._getArmatureVisualFacingSide(armature);
            return facingSide === 'left';
        }
        if (this._armatureUsesHumanSideCatalog(armature)) {
            const facingSide = this._getArmatureVisualFacingSide(armature);
            return facingSide === 'left';
        }
        return false;
    },

    _shouldMirrorFrontArmatureForBackView(armature) {
        // Front/back view uses dedicated back-view catalogs plus a swapped
        // left/right rig layout. Those authored back-view poses should be
        // applied directly without another runtime sign inversion.
        return false;
    },

    _getArmatureFacingMirrorScale(armature) {
        return this._shouldMirrorSideFacingArmature(armature) ? -1 : 1;
    },

    _getArmatureDualArmJointMirrorScale(armature, jointName) {
        return this._getArmatureFacingMirrorScale(armature);
    },

    _getArmatureRuntimeAngle(armature, jointName, authoredAngle = 0) {
        const baseAngle = authoredAngle - this._getArmatureJointAuthoringOffset(armature, jointName);
        const frontBackMirror = this._shouldMirrorFrontArmatureForBackView(armature) ? -1 : 1;
        return baseAngle * this._getArmatureDualArmJointMirrorScale(armature, jointName) * frontBackMirror;
    },

    _getArmatureAuthoredAngle(armature, jointName, runtimeAngle = 0) {
        const frontBackMirror = this._shouldMirrorFrontArmatureForBackView(armature) ? -1 : 1;
        return (runtimeAngle * this._getArmatureDualArmJointMirrorScale(armature, jointName) * frontBackMirror)
            + this._getArmatureJointAuthoringOffset(armature, jointName);
    },

    _getArmatureRuntimePartAngle(armature, partKey, authoredAngle = 0) {
        const frontBackMirror = this._shouldMirrorFrontArmatureForBackView(armature) ? -1 : 1;
        return authoredAngle * this._getArmatureFacingMirrorScale(armature) * frontBackMirror;
    },

    _getArmatureAuthoredPartAngle(armature, partKey, runtimeAngle = 0) {
        const frontBackMirror = this._shouldMirrorFrontArmatureForBackView(armature) ? -1 : 1;
        return runtimeAngle * this._getArmatureFacingMirrorScale(armature) * frontBackMirror;
    },

    _getArmatureRuntimeTilt(armature, axis, authoredTilt = 0) {
        const clamped = Math.max(-45, Math.min(45, Number.isFinite(authoredTilt) ? authoredTilt : 0));
        const frontBackMirror = axis === 'y' && this._shouldMirrorFrontArmatureForBackView(armature) ? -1 : 1;
        return axis === 'y'
            ? clamped * this._getArmatureFacingMirrorScale(armature) * frontBackMirror
            : clamped;
    },

    _isSvgAfricanProfileThreeQuarterArmature(armature) {
        const root = armature?.root;
        if (!root || root._characterAppearanceProvider !== 'svg-african-premium') return false;
        if (root._svgCharacterProjectionMode !== 'profile-tilt-3q') return false;
        const viewKey = String(root._svgCharacterViewProfileKey || '');
        return /^(front|back)-3q-(left|right)$/.test(viewKey);
    },

    _getArmatureRuntimeJointTilt(armature, jointName, axis, authoredTilt = 0) {
        // SVG depth is already projected or drawn into the artwork. Legacy
        // shoulder/hip projection tilts must not compress either representation.
        const drawnSvgThreeQuarter = armature?.root?._characterAppearanceProvider === 'svg-african-premium'
            && armature.root._svgCharacterProjectionMode === 'authored-3q'
            && /^(front|back)-3q-(left|right)$/.test(String(armature.root._svgCharacterViewProfileKey || ''));
        const duplicateProjection = axis === 'y'
            && (this._isSvgAfricanProfileThreeQuarterArmature(armature) || drawnSvgThreeQuarter)
            && /-(shoulder|hip)$/.test(String(jointName || '').toLowerCase())
            && Math.abs(Number(authoredTilt) || 0) >= 40;
        return duplicateProjection ? 0 : this._getArmatureRuntimeTilt(armature, axis, authoredTilt);
    },

    _getArmatureAuthoredTilt(armature, axis, runtimeTilt = 0) {
        const clamped = Math.max(-45, Math.min(45, Number.isFinite(runtimeTilt) ? runtimeTilt : 0));
        const frontBackMirror = axis === 'y' && this._shouldMirrorFrontArmatureForBackView(armature) ? -1 : 1;
        return axis === 'y'
            ? clamped * this._getArmatureFacingMirrorScale(armature) * frontBackMirror
            : clamped;
    },

    _normalizeArmatureTiltValue(value) {
        if (!value || typeof value !== 'object') {
            return { x: 0, y: 0 };
        }
        return {
            x: Math.max(-45, Math.min(45, Number.isFinite(value.x) ? value.x : 0)),
            y: Math.max(-45, Math.min(45, Number.isFinite(value.y) ? value.y : 0))
        };
    },

    _getArmaturePartRuntimeValue(part) {
        const obj = part?.obj;
        if (!obj) return 0;
        const driver = this.objects?._getObjectRotationDriver?.(obj) || 'rotation';
        // Subtract any 3/4-view baseline tilt so authored capture stays neutral.
        // Only set on FS/BS UC parts via _ucApplyThreeQuarterTransform — front/
        // side/back armatures have no such property and are unaffected.
        const baseline = (driver === 'rotation' && Number.isFinite(obj._uc3qBaselineRotation))
            ? obj._uc3qBaselineRotation : 0;
        if (driver === 'jointBaseAngle') {
            return obj.jointBaseAngle || 0;
        }
        return (obj.rotation || 0) - baseline;
    },

    _setArmaturePartAuthoredAngle(armature, partKey, authoredAngle = 0) {
        const part = armature?.parts?.[partKey];
        const obj = part?.obj;
        if (!obj) return;
        const runtimeAngle = this._getArmatureRuntimePartAngle(armature, partKey, authoredAngle);
        const clamped = this._clampJointAngle(runtimeAngle);
        // Preserve 3/4-view baseline tilt (only present on FS/BS UC parts) so
        // pose/movement application doesn't wipe the slanted shoulder/head.
        const baseline = Number.isFinite(obj._uc3qBaselineRotation) ? obj._uc3qBaselineRotation : 0;
        const finalAngle = clamped + baseline;
        if (this.objects?._setObjectRotationDriverValue) {
            const driver = this.objects?._getObjectRotationDriver?.(obj) || 'rotation';
            // jointBaseAngle driver: don't add baseline (baseline is only meaningful for rotation driver).
            this.objects._setObjectRotationDriverValue(obj, driver === 'rotation' ? finalAngle : clamped);
            return;
        }
        const driver = this.objects?._getObjectRotationDriver?.(obj) || 'rotation';
        if (driver === 'jointBaseAngle') {
            obj.jointBaseAngle = clamped;
        } else {
            obj.rotation = finalAngle;
        }
    },

    _captureArmaturePartAuthoredAngle(armature, partKey) {
        const part = armature?.parts?.[partKey];
        const runtimeAngle = this._getArmaturePartRuntimeValue(part);
        return this._getArmatureAuthoredPartAngle(armature, partKey, runtimeAngle);
    },

    _normalizeAuthoredThreeQuarterPartTilt(armature, authoredTilt = null) {
        const normalized = this._normalizeArmatureTiltValue(authoredTilt);
        if (this._isSvgAfricanProfileThreeQuarterArmature(armature)) {
            const viewKey = armature.root._svgCharacterViewProfileKey;
            const profile = JointSystem._getArmatureViewProfile?.(viewKey);
            const baseTiltY = Number(profile?.baseTiltY);
            if (Number.isFinite(baseTiltY)) {
                return { x: normalized.x, y: baseTiltY };
            }
        }
        if (armature?.root?._svgCharacterProjectionMode !== 'authored-3q') return normalized;
        const viewKey = armature.root._svgCharacterViewProfileKey
            || `${this._getArmatureFrontBackFacing?.(armature) === 'back' ? 'back' : 'front'}-3q-${this._getArmatureFront3qLean?.(armature) || 'right'}`;
        const profile = JointSystem._getArmatureViewProfile?.(viewKey);
        const legacyBaseTiltY = Number(profile?.baseTiltY);
        if (!Number.isFinite(legacyBaseTiltY) || Math.abs(legacyBaseTiltY) < 20) return normalized;
        const deltaFromLegacyBase = normalized.y - legacyBaseTiltY;
        return {
            x: normalized.x,
            y: Math.abs(deltaFromLegacyBase) <= 35 ? deltaFromLegacyBase : normalized.y
        };
    },

    _setArmaturePartAuthoredTilt(armature, partKey, authoredTilt = null) {
        const part = armature?.parts?.[partKey];
        const obj = part?.obj;
        if (!obj) return;
        const normalized = this._normalizeAuthoredThreeQuarterPartTilt(armature, authoredTilt);
        const runtimeTiltX = this._getArmatureRuntimeTilt(armature, 'x', normalized.x);
        const runtimeTiltY = this._getArmatureRuntimeTilt(armature, 'y', normalized.y);
        if (this.objects?._setObjectTiltDriverValue) {
            this.objects._setObjectTiltDriverValue(obj, 'tiltX', runtimeTiltX);
            this.objects._setObjectTiltDriverValue(obj, 'tiltY', runtimeTiltY);
            return;
        }
        obj.tiltX = runtimeTiltX;
        obj.tiltY = runtimeTiltY;
    },

    _captureArmaturePartAuthoredTilt(armature, partKey) {
        const part = armature?.parts?.[partKey];
        const obj = part?.obj;
        if (!obj) return { x: 0, y: 0 };
        const mode = obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static');
        if (obj.pinnedTo && (mode === 'inherit' || mode === 'joint')) {
            return {
                x: this._getArmatureAuthoredTilt(armature, 'x', obj.pinBaseTiltX ?? 0),
                y: this._getArmatureAuthoredTilt(armature, 'y', obj.pinBaseTiltY ?? 0)
            };
        }
        return {
            x: this._getArmatureAuthoredTilt(armature, 'x', obj.tiltX ?? 0),
            y: this._getArmatureAuthoredTilt(armature, 'y', obj.tiltY ?? 0)
        };
    },

    _lerpArmatureTiltMaps(mapA = {}, mapB = {}, t = 0) {
        const result = {};
        const allKeys = new Set([...Object.keys(mapA || {}), ...Object.keys(mapB || {})]);
        allKeys.forEach(key => {
            const a = this._normalizeArmatureTiltValue(mapA?.[key]);
            const b = this._normalizeArmatureTiltValue(mapB?.[key]);
            result[key] = {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t
            };
        });
        return result;
    },

    _mirrorArmatureContactMapForFacing(armature, contactMap) {
        const mirrored = this._cloneContactSpecMap(contactMap || {});
        if (!this._shouldMirrorSideFacingArmature(armature) && !this._shouldMirrorFrontArmatureForBackView(armature)) {
            return mirrored;
        }
        Object.values(mirrored).forEach(spec => {
            if (!spec || typeof spec !== 'object') return;
            if (Number.isFinite(spec.offsetX)) {
                spec.offsetX = -spec.offsetX;
            }
        });
        return mirrored;
    },

    _getArmatureJointNameSet(armature) {
        const names = new Set();
        Object.values(armature?.parts || {}).forEach(part => {
            (part?.obj?.joints || []).forEach(jt => {
                const key = (jt.name || '').toLowerCase().replace(/\s+/g, '-');
                if (key) names.add(key);
            });
        });
        return names;
    },

    _armatureObjectHasExpectedJointChain(obj, roleKey = '', armature = null) {
        if (!obj) return false;

        const normalizedRoleKey = String(roleKey || '').toLowerCase();
        const expectedSpecs = normalizedRoleKey === 'torso'
            ? this._getArmatureTorsoAttachmentSpecs(armature)
            : this._getArmaturePromotionJointSpecs(normalizedRoleKey);

        if (!expectedSpecs.length) return false;

        const existingNames = (obj.joints || []).map(jt => String(jt?.name || ''));
        const expectedNames = expectedSpecs.map(spec => String(spec?.name || ''));
        return !!obj.jointContours
            && existingNames.length === expectedNames.length
            && existingNames.every((name, index) => name === expectedNames[index]);
    },

    _armatureHasCompletePoseSetup(armature) {
        if (!armature?.root || !armature?.parts) return false;

        const partEntries = Object.entries(armature.parts || {});
        if (partEntries.length < 3) return false;

        const childrenComplete = partEntries
            .filter(([partKey]) => partKey !== 'torso')
            .every(([partKey, part]) => {
                const obj = part?.obj;
                if (!obj) return false;
                const roleKey = String(obj._armatureRoleKey || obj._armaturePartKey || partKey || '').toLowerCase();
                return this._armatureObjectHasExpectedJointChain(obj, roleKey, armature);
            });
        if (!childrenComplete) return false;

        const torso = armature.parts?.torso?.obj || armature.root;
        if (!torso) return false;

        if (this._armatureObjectHasExpectedJointChain(torso, 'torso', armature)) {
            return true;
        }

        if (this._usesAuthoredFrontBackDummyPinModel(armature)) {
            return true;
        }

        return this._childrenAlreadyHaveAnchorJointChains(armature) || torso._bslSkipTorsoAttachmentRig === true;
    },

    _isGeneratedUniversalFrontBackArmatureReady(armature) {
        const root = armature?.root;
        if (!root || !armature?.parts) return false;
        if (!root._ucCharacterStyleConfig && !root._ucCharacterFamilyId && !root._ucCharacterVariantKey) {
            return false;
        }

        const requiredJoints = {
            torso: ['waist'],
            'head-neck': ['neck'],
            'right-arm': ['right-shoulder', 'right-elbow', 'right-wrist'],
            'left-arm': ['left-shoulder', 'left-elbow', 'left-wrist'],
            'right-leg': ['right-hip', 'right-knee', 'right-ankle'],
            'left-leg': ['left-hip', 'left-knee', 'left-ankle']
        };
        return Object.entries(requiredJoints).every(([partKey, jointNames]) => {
            const obj = armature.parts?.[partKey]?.obj;
            if (!obj) return false;
            const names = new Set((obj.joints || []).map(jt =>
                String(jt?.name || '').toLowerCase().replace(/\s+/g, '-')
            ));
            return jointNames.every(name => names.has(name));
        });
    },

    _isGeneratedUniversalSideArmatureReady(armature) {
        const root = armature?.root;
        if (!root || !armature?.parts) return false;
        if (!root._ucCharacterStyleConfig && !root._ucCharacterFamilyId && !root._ucCharacterVariantKey) {
            return false;
        }

        const requiredJoints = {
            torso: ['waist'],
            'head-neck': ['neck'],
            'front-arm': ['front-shoulder', 'front-elbow', 'front-wrist'],
            'back-arm': ['back-shoulder', 'back-elbow', 'back-wrist'],
            'front-leg': ['front-hip', 'front-knee', 'front-ankle'],
            'back-leg': ['back-hip', 'back-knee', 'back-ankle']
        };
        return Object.entries(requiredJoints).every(([partKey, jointNames]) => {
            const obj = armature.parts?.[partKey]?.obj;
            if (!obj) return false;
            const names = new Set((obj.joints || []).map(jt =>
                String(jt?.name || '').toLowerCase().replace(/\s+/g, '-')
            ));
            return jointNames.every(name => names.has(name));
        });
    },

    _markGeneratedUniversalArmatureBaselineReady(armature) {
        if (!(
            this._isGeneratedUniversalFrontBackArmatureReady(armature)
            || this._isGeneratedUniversalSideArmatureReady(armature)
        )) return false;
        let changed = false;
        if (armature._normalizedDownBaseline !== true) {
            armature._normalizedDownBaseline = true;
            changed = true;
        }
        if (armature.root && armature.root._normalizedDownBaseline !== true) {
            armature.root._normalizedDownBaseline = true;
            changed = true;
        }
        return changed;
    },

    _hasNormalizedArmatureBaseline(armature) {
        return !!(
            armature?._normalizedDownBaseline
            || armature?.root?._normalizedDownBaseline
            || this._isGeneratedUniversalFrontBackArmatureReady(armature)
        );
    },

    _armatureHasFrontUpperLimbPair(armature) {
        if (!this._hasNormalizedArmatureBaseline(armature)) return false;
        const names = this._getArmatureJointNameSet(armature);
        return names.has('left-shoulder') && names.has('right-shoulder');
    },

    _armatureHasFrontLowerLimbPair(armature) {
        if (!this._hasNormalizedArmatureBaseline(armature)) return false;
        const names = this._getArmatureJointNameSet(armature);
        return names.has('left-hip') && names.has('right-hip');
    },

    _armatureUsesFrontUpperLimbMirror(armature) {
        if (!this._armatureHasFrontUpperLimbPair(armature)) return false;
        return this._getArmatureFrontBackFacing(armature) !== 'back';
    },

    _armatureUsesFrontLowerLimbMirror(armature) {
        if (!this._armatureHasFrontLowerLimbPair(armature)) return false;
        return this._getArmatureFrontBackFacing(armature) !== 'back';
    },

    _armatureUsesHumanFrontCatalog(armature) {
        return this._armatureHasFrontUpperLimbPair(armature) && this._armatureHasFrontLowerLimbPair(armature);
    },

    _armatureUsesUniversalFrontBackCatalog(armature) {
        if (!armature?.root || !armature?.parts?.torso?.obj) return false;
        if (this._armatureUsesHumanFrontCatalog(armature)) return true;
        const facing = this._getUniversalCharacterFrontBackFacing?.(armature);
        if (facing !== 'front' && facing !== 'back') return false;
        return !!armature.root._normalizedDownBaseline
            || !!armature.root._ucCharacterStyleConfig
            || !!armature.root._ucCharacterFamilyId
            || !!armature.root._ucCharacterVariantKey
            || armature.root._characterAppearanceProvider === 'svg-african'
            || armature.root._svgCharacter === true;
    },

    _setArmatureRootPosition(armature, nextX = null, nextY = null) {
        const root = armature?.root;
        if (!root) return false;

        const currentX = Number.isFinite(root.x) ? root.x : 0;
        const currentY = Number.isFinite(root.y) ? root.y : 0;
        const targetX = Number.isFinite(nextX) ? nextX : currentX;
        const targetY = Number.isFinite(nextY) ? nextY : currentY;
        const dx = targetX - currentX;
        const dy = targetY - currentY;

        if (Math.abs(dx) <= 0.001 && Math.abs(dy) <= 0.001) return false;

        if (Array.isArray(root.pathPoints) && root.pathPoints.length > 0) {
            root.pathPoints.forEach(point => {
                point.x += dx;
                point.y += dy;
            });
        }

        root.x = targetX;
        root.y = targetY;
        return true;
    },

    _getArmatureCurrentPoseOffset(armature) {
        const root = armature?.root;
        if (!root) {
            return { x: 0, y: 0 };
        }
        return {
            x: Number.isFinite(root._poseArmatureCurrentOffsetX) ? root._poseArmatureCurrentOffsetX : 0,
            y: Number.isFinite(root._poseArmatureCurrentOffsetY) ? root._poseArmatureCurrentOffsetY : 0
        };
    },

    _setArmatureCurrentPoseOffset(armature, offsetX = 0, offsetY = 0) {
        const root = armature?.root;
        if (!root) return { x: 0, y: 0 };

        const nextOffsetX = Number.isFinite(offsetX) ? offsetX : 0;
        const nextOffsetY = Number.isFinite(offsetY) ? offsetY : 0;
        root._poseArmatureCurrentOffsetX = nextOffsetX;
        root._poseArmatureCurrentOffsetY = nextOffsetY;
        return { x: nextOffsetX, y: nextOffsetY };
    },

    _getArmatureBasePosition(armature, { initialize = true } = {}) {
        const root = armature?.root;
        if (!root) {
            const fallbackX = Number.isFinite(this._armatureBaseX) ? this._armatureBaseX : undefined;
            const fallbackY = Number.isFinite(this._armatureBaseY) ? this._armatureBaseY : undefined;
            return (Number.isFinite(fallbackX) || Number.isFinite(fallbackY))
                ? { x: fallbackX, y: fallbackY }
                : undefined;
        }

        if (initialize && !Number.isFinite(root._poseArmatureBaseX)) {
            root._poseArmatureBaseX = Number.isFinite(root.x) ? root.x : 0;
        }
        if (initialize && !Number.isFinite(root._poseArmatureBaseY)) {
            root._poseArmatureBaseY = Number.isFinite(root.y) ? root.y : 0;
        }

        const baseX = Number.isFinite(root._poseArmatureBaseX) ? root._poseArmatureBaseX : undefined;
        const baseY = Number.isFinite(root._poseArmatureBaseY) ? root._poseArmatureBaseY : undefined;
        if (!Number.isFinite(baseX) && !Number.isFinite(baseY)) return undefined;

        if (this._currentArmature?.root?.id === root.id) {
            if (Number.isFinite(baseX)) this._armatureBaseX = baseX;
            if (Number.isFinite(baseY)) this._armatureBaseY = baseY;
        }

        return { x: baseX, y: baseY };
    },

    _setArmatureBasePosition(armature, baseX, baseY) {
        const root = armature?.root;
        if (!root) return undefined;

        const nextX = Number.isFinite(baseX) ? baseX : (Number.isFinite(root._poseArmatureBaseX) ? root._poseArmatureBaseX : undefined);
        const nextY = Number.isFinite(baseY) ? baseY : (Number.isFinite(root._poseArmatureBaseY) ? root._poseArmatureBaseY : undefined);
        if (!Number.isFinite(nextX) && !Number.isFinite(nextY)) return undefined;

        if (Number.isFinite(nextX)) root._poseArmatureBaseX = nextX;
        if (Number.isFinite(nextY)) root._poseArmatureBaseY = nextY;

        if (this._currentArmature?.root?.id === root.id) {
            if (Number.isFinite(nextX)) this._armatureBaseX = nextX;
            if (Number.isFinite(nextY)) this._armatureBaseY = nextY;
        }

        return { x: nextX, y: nextY };
    },

    _captureArmatureCurrentBasePosition(armature) {
        const root = armature?.root;
        if (!root) return undefined;
        return this._setArmatureBasePosition(
            armature,
            Number.isFinite(root.x) ? root.x : undefined,
            Number.isFinite(root.y) ? root.y : undefined
        );
    },

    _captureArmatureStageBasePosition(armature) {
        const root = armature?.root;
        if (!root) return undefined;
        const poseOffset = this._getArmatureCurrentPoseOffset(armature);
        return this._setArmatureBasePosition(
            armature,
            Number.isFinite(root.x) ? (root.x - poseOffset.x) : undefined,
            Number.isFinite(root.y) ? (root.y - poseOffset.y) : undefined
        );
    },

    _getArmatureBaseY(armature, { initialize = true } = {}) {
        const basePosition = this._getArmatureBasePosition(armature, { initialize });
        return Number.isFinite(basePosition?.y) ? basePosition.y : undefined;
    },

    _setArmatureBaseY(armature, baseY) {
        const basePosition = this._setArmatureBasePosition(armature, undefined, baseY);
        return Number.isFinite(basePosition?.y) ? basePosition.y : undefined;
    },

    _resetArmatureToActiveCatalogIdle(armature) {
        if (!armature?.root) return armature;
        let liveArmature = this._refreshDetectedArmatureReference(armature) || armature;
        this._stopArmatureMovement(liveArmature);
        const preserveFrontBackLayout = this._usesFrontBackWaistOnlyTorsoModel?.(liveArmature) === true
            || this._usesAuthoredFrontBackDummyPinModel?.(liveArmature) === true;
        if (!preserveFrontBackLayout) {
            this._ensureArmatureTorsoAttachmentRig(liveArmature);
        }
        const idlePose = this._getActiveArmaturePoseCatalog(liveArmature)?.idle || { jointAngles: {} };
        this._applyArmaturePose(liveArmature, idlePose);
        if (preserveFrontBackLayout) {
            liveArmature = this._refreshDetectedArmatureReference(liveArmature) || liveArmature;
            const usesPremiumAssetGeometry = liveArmature.root?._characterAppearanceProvider === 'svg-african-premium';
            if (!usesPremiumAssetGeometry) {
                const facing = this._getArmatureFrontBackFacing(liveArmature);
                this._applyFrontArmatureViewLayout?.(liveArmature, facing);
            }
            if (this.objects?._resolvePins) this.objects._resolvePins();
        }
        if (Number.isFinite(liveArmature?.root?.x) || Number.isFinite(liveArmature?.root?.y)) {
            this._captureArmatureStageBasePosition(liveArmature);
        }
        liveArmature.root._poseArmaturePlayingKey = null;
        return this._refreshDetectedArmatureReference(liveArmature) || liveArmature;
    },

    _getArmaturePlayingKey(armature) {
        return String(armature?.root?._poseArmaturePlayingKey || '') || null;
    },















    _armatureUsesHumanSideCatalog(armature) {
        if (!this._hasNormalizedArmatureBaseline(armature)) return false;
        const names = this._getArmatureJointNameSet(armature);
        const hasFrontProfile = names.has('left-shoulder') || names.has('right-shoulder');
        if (hasFrontProfile) return false;
        const hasDualArm = names.has('front-shoulder') && names.has('back-shoulder');
        if (hasDualArm) return false;
        const hasArm = names.has('shoulder') && names.has('elbow');
        const hasLeg =
            names.has('hip') ||
            names.has('front-hip') ||
            names.has('back-hip');
        return hasArm && hasLeg;
    },

    _armatureUsesHumanSideDualArmCatalog(armature) {
        if (!this._hasNormalizedArmatureBaseline(armature)) return false;
        const names = this._getArmatureJointNameSet(armature);
        const hasFrontProfile = names.has('left-shoulder') || names.has('right-shoulder');
        if (hasFrontProfile) return false;
        const hasDualArm =
            names.has('front-shoulder') &&
            names.has('front-elbow') &&
            names.has('back-shoulder') &&
            names.has('back-elbow');
        const hasLeg =
            names.has('hip') ||
            (names.has('front-hip') && names.has('back-hip'));
        return hasDualArm && hasLeg;
    },













    _augmentArmatureCatalogWithFixtureApprovedSemanticMovements(armature, catalog) {
        if (!catalog || typeof catalog !== 'object') return catalog;
        if (typeof JointSystem?._addArmatureSemanticCommunicationMovements !== 'function') return catalog;
        const fixtures = this._loadArmatureGoldenFixtures?.() || [];
        if (!Array.isArray(fixtures) || !fixtures.length) return catalog;
        const viewKey = this._getCurrentArmatureFixtureViewKey?.(armature) || '';
        if (!viewKey || viewKey === 'generic') return catalog;
        const label = this._formatArmatureCompatibilityLabel?.(viewKey) || viewKey;
        JointSystem._addArmatureSemanticCommunicationMovements(catalog, viewKey, {
            label,
            viewCompatibility: [viewKey],
            includeFixtureApprovedSemantic: true,
            goldenFixtures: fixtures
        });
        return catalog;
    },

    _getArmatureTalkingGestureEntries(armature, movements = null) {
        if (!armature?.root) return { poses: {}, movements: {} };
        const view = this._getUniversalCharacterCurrentViewSwitchKey(armature);
        if (!movements) {
            if (this._armatureUsesUniversalFrontBackCatalog(armature)) {
                movements = view.startsWith('back') ? JointSystem._buildHumanBackArmatureMovementCatalog()
                    : JointSystem._buildHumanFrontArmatureMovementCatalog();
            } else if (this._armatureUsesHumanSideDualArmCatalog(armature)) {
                movements = this._getArmatureVisualFacingSide(armature) === 'right'
                    ? JointSystem._buildHumanSideDualArmatureMovementCatalogRight() : JointSystem._buildHumanSideDualArmatureMovementCatalog();
            } else movements = JointSystem._buildHumanSideArmatureMovementCatalog();
        }
        const source = movements[`present-explain-alternate-${view}`] || movements['present-explain-hand-over-hand']
            || movements['present-explain-alternate-right'] || movements['present-explain-alternate']
            || movements['present-explain-alternate-back'] || movements['present-explain'];
        if (!source?.keyframes?.length) return { poses: {}, movements: {} };
        const armJoint = key => /shoulder|elbow|wrist/.test(key);
        const primary = key => /^(right|front)-/.test(key);
        const select = (map, side) => Object.fromEntries(Object.entries(map || {})
            .filter(([key]) => armJoint(key) && (side == null || primary(key) === side)));
        const peak = side => source.keyframes.reduce((best, frame) => {
            const score = value => Object.values(select(value.jointAngles, side)).reduce((sum, angle) => sum + Math.abs(angle), 0);
            return score(frame) > score(best) ? frame : best;
        }, source.keyframes[0]);
        const a = peak(true), b = peak(false);
        const rest = Object.fromEntries(source.keyframes.flatMap(frame => Object.keys(select(frame.jointAngles)).map(key => [key, 0])));
        const frame = (t, first, second) => ({
            t, jointAngles: { ...rest, ...(first ? select(a.jointAngles, true) : {}), ...(second ? select(b.jointAngles, false) : {}) },
            jointTilts: { ...(first ? select(a.jointTilts, true) : {}), ...(second ? select(b.jointTilts, false) : {}) },
            ...Object.fromEntries(Object.entries(a).filter(([key]) => /LayerOverride$|layerOrderOverride|preserveFrontLeft/.test(key)))
        });
        const common = { ...source, category: 'Communication', icon: 'fa-comments', armatureGesture: true,
            duration: 3600, repeat: 3, grounding: false, contacts: {}, attention: null,
            viewCompatibility: [view], rootTravel: undefined, absoluteTravel: false };
        const entries = {
            'talk-gestures-alternate': { ...common, name: 'Talking Gestures - Alternating Hands',
                description: 'One hand gestures and returns before the other hand speaks.',
                keyframes: [frame(0), frame(.10), frame(.28, true), frame(.46), frame(.54), frame(.72, false, true), frame(.90), frame(1)] },
            'talk-gestures-both': { ...common, name: 'Talking Gestures - Both Hands',
                description: 'Both hands open together and return in a relaxed speaking beat.',
                keyframes: [frame(0), frame(.15), frame(.4, true, true), frame(.6, true, true), frame(.85), frame(1)] },
            'talk-gestures-one-hand': { ...common, name: 'Talking Gestures - One Hand',
                description: 'The right or front hand makes a speaking beat while the other arm rests.',
                keyframes: [frame(0), frame(.15), frame(.4, true), frame(.6, true), frame(.85), frame(1)] }
        };
        const pose = (name, first, second) => ({ ...common, ...frame(0, first, second), name,
            keyframes: undefined, duration: undefined, repeat: undefined });
        Object.entries(entries).forEach(([key, entry]) => { entry.key = key; });
        return { movements: entries, poses: {
            'talk-gesture-open': { ...pose('Talking Pose - Open Hands', true, true), key: 'talk-gesture-open' },
            'talk-gesture-one-hand': { ...pose('Talking Pose - One Hand', true, false), key: 'talk-gesture-one-hand' }
        } };
    },

    _getArmatureGesturePostures(armature, catalog = this._getActiveArmaturePoseCatalog(armature)) {
        const find = keys => keys.map(key => catalog[key]).find(Boolean);
        return {
            current: null, standing: catalog.idle,
            seated: find(['sitting-chair', 'sit', 'sit-back-true-sides', 'sit-side', 'sit-back']),
            kneeling: find(['kneeling', 'kneel', 'kneel-back', 'kneel-side'])
                || (this._armatureUsesUniversalFrontBackCatalog(armature)
                    ? { ...catalog.idle, seatDepth: 0, kneelDepth: 1, grounding: 'planted', dy: 0 } : undefined)
        };
    },

    _materializeArmatureTalkingEntry(armature, entry) {
        if (!entry?.armatureGesture) return entry;
        const posture = this._armatureGesturePosture || 'current';
        const base = posture === 'current' ? this._snapshotArmaturePose(armature)
            : this._getArmatureGesturePostures(armature)[posture];
        if (!base && posture !== 'current') throw new Error('This talking posture is unavailable in the current view.');
        const compose = frame => ({ ...frame,
            jointAngles: { ...base?.jointAngles, ...frame.jointAngles },
            jointTilts: { ...base?.jointTilts, ...frame.jointTilts },
            partAngles: { ...base?.partAngles }, partTilts: { ...base?.partTilts },
            seatDepth: base?.seatDepth || 0, kneelDepth: base?.kneelDepth || 0,
            dx: 0, dy: posture === 'current' ? 0 : (base?.dy || 0),
            contacts: {}, attention: null
        });
        return { ...entry, ...(!entry.keyframes ? compose(entry) : {}), armatureGesture: false,
            grounding: posture === 'current' ? false : 'planted',
            ...(entry.keyframes ? { keyframes: entry.keyframes.map(compose) } : {}) };
    },

    _getArmatureLimbChoiceEntries(armature) {
        const side = this._armatureUsesHumanSideDualArmCatalog(armature);
        if (!side && !this._armatureUsesUniversalFrontBackCatalog(armature)) return { poses: {}, movements: {} };
        const facing = side
            ? (this._getArmatureVisualFacingSide(armature) || this._getArmatureFacingSide(armature))
            : (this._getUniversalCharacterFrontBackFacing?.(armature) || this._getArmatureFrontBackFacing(armature));
        const view = side ? `side-${facing === 'right' ? 'right' : 'left'}` : facing === 'back' ? 'back' : 'front';
        const rearLean = view === 'back' ? this._getArmatureFront3qLean?.(armature) : null;
        const cacheKey = `${view}:${rearLean || ''}`;
        this._limbChoiceCatalogs ||= {};
        if (this._limbChoiceCatalogs[cacheKey]) return this._limbChoiceCatalogs[cacheKey];
        const poses = {}, movements = {};
        const choices = [
            ['handshake', 'Handshake', 'fa-handshake', 'Social', 'arm', [18, -75, 0], [-45, -35, 0]],
            ['wave', 'Wave', 'fa-hand', 'Communication', 'arm', [65, -125, 10], [-65, -110, 10]],
            ['raise-hand', 'Raise Hand', 'fa-hand', 'Communication', 'arm', [155, -15, 0], [-155, -15, 0]],
            ['point', 'Point', 'fa-hand-point-right', 'Communication', 'arm', [80, -10, 0], [-80, -10, 0]],
            ['kick', 'Kick', 'fa-shoe-prints', 'Action', 'leg', [40, -8, 0], [-65, 10, 0]],
            ['knee-lift', 'Knee Lift', 'fa-person-walking', 'Action', 'leg', [35, -80, 0], [-65, 85, 0]]
        ];
        for (const [action, label, icon, category, limb, frontAngles, sideAngles] of choices) {
            for (const hand of ['left', 'right']) {
                const prefix = side ? (hand === facing ? 'front' : 'back') : hand;
                const other = side ? (prefix === 'front' ? 'back' : 'front') : hand === 'left' ? 'right' : 'left';
                const sign = side ? 1 : (hand === 'right' ? 1 : -1) * (view === 'back' ? -1 : 1);
                const joints = limb === 'arm' ? ['shoulder', 'elbow', 'wrist'] : ['hip', 'knee', 'ankle'];
                const angles = side ? sideAngles : view === 'back' && action === 'handshake'
                    ? [-10, -35, 0] : view === 'back' && action === 'wave' ? [65, 100, 0] : frontAngles;
                const order = side
                    ? ['back-arm', 'back-leg', 'front-leg', 'torso', 'head-neck', 'front-arm']
                    : view === 'back'
                        ? ['left-leg', 'right-leg', 'left-arm', 'right-arm', 'torso', 'head-neck']
                        : ['left-leg', 'right-leg', 'torso', 'head-neck', `${other}-arm`, `${prefix}-arm`];
                const state = (amount, beat = 0) => {
                    const jointAngles = {}, jointTilts = {};
                    for (const role of side ? ['front', 'back'] : ['left', 'right']) {
                        for (const joint of ['shoulder', 'elbow', 'wrist', 'hip', 'knee', 'ankle']) {
                            jointAngles[`${role}-${joint}`] = 0;
                            jointTilts[`${role}-${joint}`] = { x: 0, y: 0 };
                        }
                    }
                    joints.forEach((joint, i) => {
                        jointAngles[`${prefix}-${joint}`] = sign * (angles[i] * amount + (i === 0 ? beat : 0));
                    });
                    if (!side && action === 'handshake') {
                        jointTilts[`${prefix}-shoulder`].x = 40 * amount;
                        if (view === 'back') {
                            const depthSign = rearLean ? (rearLean === 'left' ? -1 : 1) : sign;
                            jointTilts[`${prefix}-shoulder`].x *= depthSign;
                            jointTilts[`${prefix}-elbow`].x = depthSign * 45 * amount;
                            if (rearLean) {
                                const direction = rearLean === 'left' ? 1 : -1;
                                jointAngles[`${prefix}-shoulder`] = direction * 25 * amount;
                                jointAngles[`${prefix}-elbow`] = direction * (35 * amount + beat);
                            }
                        }
                    }
                    if (view === 'back' && action === 'wave') {
                        jointAngles[`${prefix}-shoulder`] = sign * 65 * amount;
                        jointAngles[`${prefix}-elbow`] = sign * (100 * amount + beat);
                    }
                    if (view === 'back' && limb === 'leg') {
                        const direction = rearLean ? (rearLean === 'left' ? 1 : -1) : -sign;
                        jointAngles[`${prefix}-hip`] = direction * (rearLean ? 42 : 2) * amount;
                        jointAngles[`${prefix}-knee`] = -direction * (action === 'knee-lift' ? 65 : 5) * amount;
                        jointTilts[`${prefix}-hip`].x = -direction * 45 * amount;
                        jointTilts[`${prefix}-knee`].x = -direction * (action === 'kick' ? 35 : 0) * amount;
                    }
                    return { jointAngles, jointTilts, partAngles: { torso: 0 },
                        frontAngleConvention: 'mirrored',
                        ...(view === 'back' && ['handshake', 'point'].includes(action)
                            ? { torsoFrontmost: true, backViewLayerOverride: [...order] } : {}),
                        layerOrderOverride: [...order], threeQuarterLayerOverride: true,
                        agbadaArmLayerMode: 'respect-arm-order' };
                };
                const key = `limb-choice-${action}-${hand}`;
                const name = `${label} (${hand === 'left' ? 'Left' : 'Right'} ${limb === 'arm' ? 'Hand' : 'Leg'})`;
                const shared = { key, name, icon, category, limbChoice: { limb, side: hand },
                    description: `${label} using the character's ${hand} ${limb}; return to rest after the movement.`,
                    viewCompatibility: side ? [view] : [view, `${view}-3q`, `${view}-3q-left`, `${view}-3q-right`],
                    frontAngleConvention: 'mirrored',
                    capabilities: { stride: false }, grounding: limb === 'leg' ? false : 'planted' };
                poses[key] = { ...shared, ...state(1) };
                movements[key] = { ...shared, duration: 2200, repeat: 1, keyframes: [
                    { t: 0, ...state(0) }, { t: .3, ...state(1) },
                    { t: .45, ...state(1, action === 'handshake' || action === 'wave' ? -6 : 0) },
                    { t: .6, ...state(1, action === 'handshake' || action === 'wave' ? 6 : 0) },
                    { t: .75, ...state(1) }, { t: 1, ...state(0) }
                ] };
            }
        }
        return (this._limbChoiceCatalogs[cacheKey] = { poses, movements });
    },

    _withBackForwardActionOcclusion(catalog, armature) {
        if (!this._armatureUsesUniversalFrontBackCatalog(armature)
            || (this._getUniversalCharacterFrontBackFacing?.(armature) || this._getArmatureFrontBackFacing(armature)) !== 'back') return catalog;
        const result = { ...catalog };
        const lean = this._getArmatureFront3qLean?.(armature);
        const order = ['left-arm', 'right-arm', 'left-leg', 'right-leg', 'torso', 'head-neck'];
        for (const [key, entry] of Object.entries(catalog)) {
            if (this._codeArmaturePoseCatalog?.[key] || this._codeArmatureMovementCatalog?.[key]
                || entry._videoCaptureView || entry._debuggerRepeatCompiled) continue;
            const text = `${key} ${entry.name || ''}`.toLowerCase();
            // Rear-facing work happens on the far side of the torso. Do not
            // apply this rule to deliberate behind-the-back poses or locomotion.
            if (/behind|locomotion|walk|run|strut|stroll/.test(text)
                || !/(?:^|[\s-])(handshake|read(?:ing)?|write|writing|type|typing|eat|eating|drink|drinking|microphone|phone|clap|prayer|carry)(?:[\s-]|$)/.test(text)) continue;
            const deskAction = /(?:^|[\s-])(read(?:ing)?|write|writing|type|typing)(?:[\s-]|$)/.test(text)
                && !/board/.test(text);
            const apply = frame => {
                const next = { ...frame, torsoFrontmost: true, threeQuarterLayerOverride: true,
                    agbadaArmLayerMode: 'respect-arm-order',
                    layerOrderOverride: [...order], backViewLayerOverride: [...order] };
                if (deskAction && frame.jointAngles) {
                    next.jointAngles = { ...frame.jointAngles };
                    next.jointTilts = { ...frame.jointTilts };
                    for (const role of ['left', 'right']) {
                        const elbow = frame.jointAngles[`${role}-elbow`];
                        if (!Number.isFinite(elbow)) continue;
                        const direction = lean ? (lean === 'left' ? 1 : -1) : role === 'left' ? -1 : 1;
                        next.jointAngles[`${role}-shoulder`] = direction * (lean ? 25 : 8);
                        // Keep the authored writing/typing pulse, but project the
                        // working forearm forward instead of sweeping it across the back.
                        next.jointAngles[`${role}-elbow`] = direction * (lean ? Math.abs(elbow) * .55 : Math.abs(elbow) * .25);
                        next.jointTilts[`${role}-shoulder`] = { x: -direction * 35, y: 0 };
                        next.jointTilts[`${role}-elbow`] = { x: -direction * 40, y: 0 };
                    }
                }
                return next;
            };
            result[key] = apply(entry);
            if (entry.keyframes) result[key].keyframes = entry.keyframes.map(apply);
        }
        return result;
    },

    _getActiveArmaturePoseCatalog(armature) {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        const custom = { ...this._getArmatureLimbChoiceEntries(armature).poses, ...(this._codeArmaturePoseCatalog || {}) };
        let catalog = null;
        const frontBackFacing = this._getUniversalCharacterFrontBackFacing?.(armature);
        const resolvedFrontBackFacing = frontBackFacing || this._getArmatureFrontBackFacing(armature);
        const usesFrontBackCatalog = this._armatureUsesUniversalFrontBackCatalog(armature);
        if (usesFrontBackCatalog) {
            catalog = resolvedFrontBackFacing === 'back'
                ? JointSystem._buildHumanBackArmaturePoseCatalog()
                : JointSystem._buildHumanFrontArmaturePoseCatalog();
            const entries = { ...catalog, ...this._getArmatureTalkingGestureEntries(armature).poses, ...custom };
            if (resolvedFrontBackFacing === 'back' && entries['handshake-back-spec']) {
                entries['handshake-back-spec'] = { ...entries['limb-choice-handshake-right'],
                    key: 'handshake-back-spec', name: entries['handshake-back-spec'].name };
            }
            return this._withBackForwardActionOcclusion(entries, armature);
        }
        if (this._armatureUsesHumanSideDualArmCatalog(armature)) {
            const facingSide = this._getArmatureVisualFacingSide(armature) === 'right'
                ? 'right'
                : (this._getArmatureFacingSide(armature) === 'right' ? 'right' : 'left');
            catalog = facingSide === 'right'
                ? JointSystem._buildHumanSideDualArmaturePoseCatalogRight()
                : JointSystem._buildHumanSideDualArmaturePoseCatalog();
            const movements = facingSide === 'right'
                ? JointSystem._buildHumanSideDualArmatureMovementCatalogRight()
                : JointSystem._buildHumanSideDualArmatureMovementCatalog();
            const eating = movements['eat-side'];
            const mouthFrame = eating?.keyframes?.find(frame =>
                Object.values(frame.contacts || {}).some(contact => contact?.tag === 'mouth'));
            if (mouthFrame) {
                // Use the same solved reach and seated support as the movement.
                const held = JointSystem._cloneArmatureCatalogEntry(mouthFrame);
                delete held.t;
                catalog = { ...catalog, 'sit-eating-side': {
                    ...held, key: 'sit-eating-side', name: 'Sitting + Eating (Side)',
                    icon: 'fa-utensils', category: 'Daily Activities',
                    description: 'Seated hand-to-mouth hold with the other arm resting.',
                    grounding: eating.grounding, smoothContacts: eating.smoothContacts,
                    viewCompatibility: [`side-${facingSide}`]
                } };
            }
            return { ...catalog, ...this._getArmatureTalkingGestureEntries(armature).poses, ...custom };
        }
        if (this._armatureUsesHumanSideCatalog(armature)) {
            catalog = JointSystem._buildHumanSideArmaturePoseCatalog();
            return { ...catalog, ...this._getArmatureTalkingGestureEntries(armature).poses, ...custom };
        }
        return { ...JointSystem.ARMATURE_POSES, ...custom };
    },

    _getActiveArmatureMovementCatalog(armature) {
        JointSystem._ensureArmatureDefinitionsUseDownBaseline();
        const debuggerTemplates = typeof this._getArmatureDebuggerMovementTemplates === 'function'
            ? this._getArmatureDebuggerMovementTemplates()
            : {};
        const custom = {
            ...this._getArmatureLimbChoiceEntries(armature).movements,
            ...debuggerTemplates,
            ...(this._codeArmatureMovementCatalog || {})
        };
        const captureView = this._getUniversalCharacterCurrentViewSwitchKey?.(armature);
        Object.keys(custom).forEach(key => {
            if (custom[key]?._videoCaptureView && custom[key]._videoCaptureView !== captureView) delete custom[key];
        });
        let catalog = null;
        const frontBackFacing = this._getUniversalCharacterFrontBackFacing?.(armature);
        const resolvedFrontBackFacing = frontBackFacing || this._getArmatureFrontBackFacing(armature);
        const usesFrontBackCatalog = this._armatureUsesUniversalFrontBackCatalog(armature);
        if (usesFrontBackCatalog) {
            catalog = resolvedFrontBackFacing === 'back'
                ? JointSystem._buildHumanBackArmatureMovementCatalog()
                : JointSystem._buildHumanFrontArmatureMovementCatalog();
            catalog = this._augmentArmatureCatalogWithFixtureApprovedSemanticMovements(armature, { ...catalog });
            return this._withBackForwardActionOcclusion({ ...catalog, ...this._getArmatureTalkingGestureEntries(armature, catalog).movements, ...custom }, armature);
        }
        if (this._armatureUsesHumanSideDualArmCatalog(armature)) {
            const facingSide = this._getArmatureVisualFacingSide(armature) === 'right'
                ? 'right'
                : (this._getArmatureFacingSide(armature) === 'right' ? 'right' : 'left');
            catalog = facingSide === 'right'
                ? JointSystem._buildHumanSideDualArmatureMovementCatalogRight()
                : JointSystem._buildHumanSideDualArmatureMovementCatalog();
            catalog = this._augmentArmatureCatalogWithFixtureApprovedSemanticMovements(armature, { ...catalog });
            return { ...catalog, ...this._getArmatureTalkingGestureEntries(armature, catalog).movements, ...custom };
        }
        if (this._armatureUsesHumanSideCatalog(armature)) {
            catalog = JointSystem._buildHumanSideArmatureMovementCatalog();
            catalog = this._augmentArmatureCatalogWithFixtureApprovedSemanticMovements(armature, { ...catalog });
            return { ...catalog, ...this._getArmatureTalkingGestureEntries(armature, catalog).movements, ...custom };
        }
        catalog = this._augmentArmatureCatalogWithFixtureApprovedSemanticMovements(armature, { ...JointSystem.ARMATURE_MOVEMENTS });
        return { ...catalog, ...custom };
    },


});
