/**
 * Pose Armature adapter for SVG African Characters.
 * The SVG system supplies appearance; the existing JointSystem owns movement.
 */
(function () {
    'use strict';

    if (typeof JointSystem === 'undefined') return;

    function emit(name, payload) {
        if (typeof eventBus !== 'undefined' && eventBus?.emit) eventBus.emit(name, payload);
    }

    function clone(value) {
        try { return JSON.parse(JSON.stringify(value)); }
        catch (_) { return value && typeof value === 'object' ? { ...value } : value; }
    }

    const IDENTITY_KEYS = ['presentation', 'ageGroup', 'skinTone', 'face', 'eyes', 'nose', 'lips', 'hair', 'hairColor', 'facialHair', 'body', 'height', 'heightScale'];
    const STYLING_KEYS = ['profession', 'outfit', 'customPieces', 'topClothing', 'bottomClothing', 'skirtLength', 'sleeveLength', 'clothingPalette', 'fabricDesign', 'neckTieType', 'neckTieDesign', 'headwear', 'footwear', 'accessories', 'jewelry', 'colorOverrides', 'culturalStyle', 'expression', 'view', 'sideFacing', 'threeQuarterArtwork', 'rearTalkingProfile'];
    const SVG_AFRICAN_LOWER_GARMENT_PART_KEY = 'svg-african-lower-garment';
    const SVG_AFRICAN_BODY_DRAPE_PART_KEY = 'svg-african-body-drape';
    const SVG_AFRICAN_OUTER_COAT_PART_KEY = 'svg-african-outer-coat';
    const SVG_AFRICAN_CONTINUOUS_GARMENT_PART_KEYS = new Set([
        SVG_AFRICAN_LOWER_GARMENT_PART_KEY,
        SVG_AFRICAN_BODY_DRAPE_PART_KEY,
        SVG_AFRICAN_OUTER_COAT_PART_KEY
    ]);

    function getSvgAfricanGarmentName(spec = {}) {
        if (spec.kind === 'long-coat') return 'Long Coat (SVG African)';
        if (spec.kind === 'academic-gown') return 'Academic Gown (SVG African)';
        if (spec.kind === 'robe') return 'Robe (SVG African)';
        if (spec.kind === 'gown') return 'Gown (SVG African)';
        if (spec.kind === 'wrapper') return 'Wrapper (SVG African)';
        return 'Skirt (SVG African)';
    }

    function splitConfigChanges(changes = {}) {
        const identity = { ...(changes.identity || {}) };
        const styling = { ...(changes.styling || {}) };
        IDENTITY_KEYS.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(changes, key)) identity[key] = changes[key];
        });
        STYLING_KEYS.forEach(key => {
            if (Object.prototype.hasOwnProperty.call(changes, key)) styling[key] = changes[key];
        });
        return { identity, styling };
    }

    function normalizedCarrierPathToPoints(obj, carrierPathN) {
        if (!obj || !Array.isArray(carrierPathN) || carrierPathN.length < 3) return null;
        const x = Number(obj.x) || 0;
        const y = Number(obj.y) || 0;
        const w = Math.max(1, Math.abs(Number(obj.width) || 1));
        const h = Math.max(1, Math.abs(Number(obj.height) || 1));
        return carrierPathN.map(point => {
            const nx = Array.isArray(point) ? point[0] : point?.x;
            const ny = Array.isArray(point) ? point[1] : point?.y;
            return {
                x: x + w * Math.max(0, Math.min(1, Number(nx) || 0)),
                y: y + h * Math.max(0, Math.min(1, Number(ny) || 0)),
                segmentType: 'straight'
            };
        });
    }

    function cloneCarrierPath(path = []) {
        return path.map(point => Array.isArray(point) ? [point[0], point[1]] : [point.x, point.y]);
    }

    function getSvgAfricanProfileForConfig(Renderer, config = {}) {
        const version = Number(config?.rendererVersion ?? 3);
        if (version >= 3 && Renderer?.frontBodyProfileV3) return Renderer.frontBodyProfileV3;
        return Renderer?.frontArtProfile || null;
    }

    function getRoleCarrierProfile(profile, partKey) {
        if (!profile?.parts || !partKey) return null;
        const direct = profile.parts[partKey];
        if (direct?.carrierPathN) return direct;
        if (/arm$/.test(partKey) && profile.parts.arm) return profile.parts.arm;
        if (/leg$/.test(partKey) && profile.parts.leg) return profile.parts.leg;
        return direct || null;
    }

    function getSvgAfricanPremiumAssetForConfig(config = {}) {
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!PremiumAssets?.get) return null;
        if (config.useBasicSvg === true || config.preferBasicSvg === true || config.disablePremiumPresetUpgrade === true) {
            return null;
        }
        const resolvedForView = PremiumAssets.resolveAssetForConfig?.(config);
        if (resolvedForView) return resolvedForView;
        const explicitId = config.assetCharacterId || config.assetId || null;
        const assetId = explicitId || (config.engine === 'svg-armature-premium'
            ? PremiumAssets.getDefaultAssetId?.()
            : null);
        return assetId ? PremiumAssets.get(assetId) : null;
    }

    function getThreeQuarterProjectionMode(asset = null) {
        if (!asset || !String(asset.view || '').includes('3q')) return null;
        return asset.threeQuarterAnatomy?.projectionMode
            || asset.authoring?.projectionMode
            || 'profile-tilt-3q';
    }

    function isAuthoredThreeQuarterAsset(asset = null) {
        return getThreeQuarterProjectionMode(asset) === 'authored-3q';
    }

    const SVG_AFRICAN_PREMIUM_VIEWS = new Set([
        'front',
        'back',
        'side-right',
        'side-left',
        'front-3q-right',
        'front-3q-left',
        'back-3q-right',
        'back-3q-left'
    ]);

    function normalizePremiumArmatureView(value = 'front', fallbackSide = 'right') {
        const side = String(fallbackSide || '').toLowerCase() === 'left' ? 'left' : 'right';
        const normalized = String(value || 'front')
            .toLowerCase()
            .trim()
            .replace(/3\/4/g, '3q')
            .replace(/\bthree[-\s]*quarter\b/g, '3q')
            .replace(/:/g, '-')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
        if (SVG_AFRICAN_PREMIUM_VIEWS.has(normalized)) return normalized;
        if (normalized === 'side') return `side-${side}`;
        if (normalized === 'front-3q') return `front-3q-${side}`;
        if (normalized === 'back-3q') return `back-3q-${side}`;
        return normalized === 'back' ? 'back' : 'front';
    }

    function premiumViewToSwitcherKey(view = 'front') {
        const normalized = normalizePremiumArmatureView(view);
        if (/^side-(left|right)$/.test(normalized)) {
            return normalized.replace(/^side-/, 'side:');
        }
        if (/^(front|back)-3q-(left|right)$/.test(normalized)) {
            return normalized.replace(/-(left|right)$/, ':$1');
        }
        return normalized;
    }

    function getOppositePremiumArmatureView(view = 'front') {
        const normalized = normalizePremiumArmatureView(view);
        const opposites = {
            front: 'back',
            back: 'front',
            'side-right': 'side-left',
            'side-left': 'side-right',
            'front-3q-right': 'back-3q-left',
            'front-3q-left': 'back-3q-right',
            'back-3q-right': 'front-3q-left',
            'back-3q-left': 'front-3q-right'
        };
        return opposites[normalized] || 'back';
    }

    function applyPremiumJointProfile(obj, jointProfile = {}) {
        if (!obj || !Array.isArray(obj.joints)) return false;
        let changed = false;
        obj.joints.forEach(joint => {
            const spec = jointProfile[joint?.name];
            if (!spec) return;
            if (Number.isFinite(spec.position)) {
                joint.position = Math.max(0.01, Math.min(0.99, spec.position));
                changed = true;
            }
            if (Number.isFinite(spec.crossOffset)) {
                joint.crossOffset = Math.max(0.05, Math.min(0.95, spec.crossOffset));
                changed = true;
            }
            if (Number.isFinite(spec.contourSize)) {
                joint.contourSize = Math.max(0.2, Math.min(1.4, spec.contourSize));
                changed = true;
            }
        });
        return changed;
    }

    function suppressPremiumHeadNeckContours(obj) {
        if (!obj) return;
        if(obj._svgAfricanJointProfile?.neck?.photographic) {
            obj.jointContours=true;obj.pinContour=false;obj.contourSize=1;obj.contourColor=null;obj.contourFillMode='joint-texture';return;
        }
        obj.jointContours = false;
        obj.pinContour = false;
        obj.contourSize = 1;
        obj.contourColor = null;
    }

    function roundMetric(value, digits = 3) {
        const num = Number(value);
        if (!Number.isFinite(num)) return 0;
        const scale = Math.pow(10, digits);
        return Math.round(num * scale) / scale;
    }

    function finiteOr(value, fallback = 0) {
        const num = Number(value);
        return Number.isFinite(num) ? num : fallback;
    }

    function clampRange(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    function readPremiumPartKey(obj, fallback = '') {
        return obj?._svgCharacterPremiumPartKey
            || obj?._svgCharacterPartKey
            || obj?.bodyPartData?.partKey
            || fallback
            || '';
    }

    function readPremiumPartCalibration(obj, partKey) {
        if (!obj) return null;
        const joints = {};
        (obj.joints || []).forEach(joint => {
            if (!joint?.name) return;
            joints[joint.name] = {
                position: roundMetric(joint.position, 4),
                crossOffset: roundMetric(joint.crossOffset ?? 0.5, 4),
                angle: roundMetric(joint.angle || 0, 3),
                tiltX: roundMetric(joint.tiltX || 0, 3),
                tiltY: roundMetric(joint.tiltY || 0, 3),
                contourSize: Number.isFinite(Number(joint.contourSize)) ? roundMetric(joint.contourSize, 3) : undefined
            };
        });
        return {
            partKey,
            objectId: obj.id || null,
            name: obj.name || '',
            type: obj.type || '',
            x: roundMetric(obj.x),
            y: roundMetric(obj.y),
            width: roundMetric(Math.abs(Number(obj.width) || 0)),
            height: roundMetric(Math.abs(Number(obj.height) || 0)),
            pivotX: roundMetric(obj.pivotX ?? 0.5, 4),
            pivotY: roundMetric(obj.pivotY ?? 0.5, 4),
            rotation: roundMetric(obj.rotation || 0, 3),
            tiltX: roundMetric(obj.tiltX || 0, 3),
            tiltY: roundMetric(obj.tiltY || 0, 3),
            scaleX: roundMetric(obj.scaleX ?? 1, 4),
            scaleY: roundMetric(obj.scaleY ?? 1, 4),
            layer: Number.isFinite(Number(obj.layer)) ? Number(obj.layer) : undefined,
            renderZ: Number.isFinite(Number(obj.renderZ)) ? Number(obj.renderZ) : undefined,
            pin: obj.pinnedTo ? {
                pinnedTo: obj.pinnedTo,
                pinTargetType: obj.pinTargetType || 'anchor',
                pinJointName: obj.pinJointName || undefined,
                pinJointId: obj.pinJointId || undefined,
                pinAnchorX: roundMetric(obj.pinAnchorX ?? 0.5, 4),
                pinAnchorY: roundMetric(obj.pinAnchorY ?? 0.5, 4),
                pinOffsetX: roundMetric(obj.pinOffsetX || 0, 3),
                pinOffsetY: roundMetric(obj.pinOffsetY || 0, 3),
                pinRotationMode: obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'none')
            } : null,
            joints
        };
    }

    function getCalibrationParts(payload = {}) {
        return payload.current?.parts || payload.parts || payload.baseManifest?.parts || {};
    }

    function getCalibrationJoints(payload = {}) {
        return payload.current?.joints || payload.joints || payload.baseManifest?.joints || {};
    }

    function getCalibrationPins(payload = {}) {
        return payload.current?.pins || payload.pins || payload.baseManifest?.pins || {};
    }

    function getCalibrationOrder(payload = {}) {
        return payload.current?.order || payload.order || payload.baseManifest?.order || [];
    }

    function applyPremiumJointCalibration(obj, jointProfile = {}, options = {}) {
        if (!obj || !Array.isArray(obj.joints) || !jointProfile) return false;
        const applyPose = options.applyPose !== false;
        let changed = false;
        obj.joints.forEach(joint => {
            const spec = jointProfile[joint?.name];
            if (!spec) return;
            if (Number.isFinite(Number(spec.position))) {
                joint.position = clampRange(Number(spec.position), 0.01, 0.99);
                changed = true;
            }
            if (Number.isFinite(Number(spec.crossOffset))) {
                joint.crossOffset = clampRange(Number(spec.crossOffset), 0.05, 0.95);
                changed = true;
            }
            if (Number.isFinite(Number(spec.contourSize))) {
                joint.contourSize = clampRange(Number(spec.contourSize), 0.2, 1.4);
                changed = true;
            }
            if (applyPose) {
                if (Number.isFinite(Number(spec.angle))) {
                    joint.angle = Number(spec.angle);
                    changed = true;
                }
                if (Number.isFinite(Number(spec.tiltX))) {
                    joint.tiltX = Number(spec.tiltX);
                    changed = true;
                }
                if (Number.isFinite(Number(spec.tiltY))) {
                    joint.tiltY = Number(spec.tiltY);
                    changed = true;
                }
            }
        });
        return changed;
    }

    function applyPremiumPinCalibration(jointSystem, obj, liveTorso, pin = {}, scale = 1) {
        if (!jointSystem || !obj || !liveTorso || obj === liveTorso || !pin) return false;
        const targetType = (pin.pinTargetType || pin.mode) === 'joint' ? 'joint' : 'anchor';
        const rotationMode = pin.pinRotationMode || pin.rotation || 'inherit';
        if (targetType === 'joint') {
            const jointName = pin.pinJointName || pin.joint || 'waist';
            jointSystem._configureDummyArmatureJointPin?.(obj, liveTorso, jointName, rotationMode);
            const targetJoint = (liveTorso.joints || []).find(joint => joint?.name === jointName);
            obj.pinJointId = targetJoint?.id || obj.pinJointId || null;
            obj.pinJointName = targetJoint?.name || jointName;
        } else {
            const anchorX = Number.isFinite(Number(pin.pinAnchorX ?? pin.anchorX)) ? Number(pin.pinAnchorX ?? pin.anchorX) : 0.5;
            const anchorY = Number.isFinite(Number(pin.pinAnchorY ?? pin.anchorY)) ? Number(pin.pinAnchorY ?? pin.anchorY) : 0.5;
            jointSystem._configureDummyArmaturePin?.(obj, liveTorso, anchorX, anchorY, rotationMode);
            obj.pinJointId = null;
            obj.pinJointName = null;
        }
        obj.pinnedTo = liveTorso.id;
        obj.pinTargetType = targetType;
        obj.pinRotationMode = rotationMode;
        obj.pinInheritRotation = rotationMode === 'inherit' || rotationMode === 'joint';
        if (Number.isFinite(Number(pin.pinAnchorX))) obj.pinAnchorX = Number(pin.pinAnchorX);
        if (Number.isFinite(Number(pin.pinAnchorY))) obj.pinAnchorY = Number(pin.pinAnchorY);
        if (Number.isFinite(Number(pin.pinOffsetX))) obj.pinOffsetX = Number(pin.pinOffsetX) * scale;
        if (Number.isFinite(Number(pin.pinOffsetY))) obj.pinOffsetY = Number(pin.pinOffsetY) * scale;
        if (readPremiumPartKey(obj) === 'head-neck') {
            obj.pinContour = false;
        }
        return true;
    }

    function setObjectCarrierRect(obj, rect, carrierPathN, profileVersion) {
        if (!obj || obj.type !== 'freeform' || !rect) return false;
        obj.x = Math.round(rect.x);
        obj.y = Math.round(rect.y);
        obj.width = Math.max(6, Math.round(rect.width));
        obj.height = Math.max(6, Math.round(rect.height));
        if (Number.isFinite(rect.pivotX)) obj.pivotX = rect.pivotX;
        if (Number.isFinite(rect.pivotY)) obj.pivotY = rect.pivotY;
        const points = normalizedCarrierPathToPoints(obj, carrierPathN);
        if (points) {
            obj.pathPoints = points;
            obj.closedPath = true;
            obj._svgAfricanCarrierPathN = cloneCarrierPath(carrierPathN);
        }
        obj._svgAfricanCarrierPath = true;
        obj._svgAfricanCarrierPathVersion = profileVersion || 2;
        obj._svgAfricanCarrierProfile = 'svg-african-front';
        return !!points;
    }

    JointSystem.prototype._applySvgAfricanCarrierGeometry = function(armature, options = {}) {
        const root = armature?.root;
        if (!root || root._characterAppearanceProvider !== 'svg-african') return false;
        const Renderer = globalThis.SvgAfricanCharacterRenderer;
        const config = options.config || root._svgCharacterConfig || {};
        const profile = getSvgAfricanProfileForConfig(Renderer, config);
        if (!profile?.parts) return false;

        const torso = armature.parts?.torso?.obj || null;
        const useFullBodyProfile = Number(profile.version || 0) >= 3 && torso?.type === 'freeform';
        let applied = 0;

        if (useFullBodyProfile) {
            const torsoProfile = profile.parts.torso;
            const oldTorsoCenterX = (Number(torso.x) || 0) + (Math.abs(Number(torso.width) || 1) * (torso.pivotX ?? 0.5));
            const oldTorsoY = Number(torso.y) || 0;
            const currentTorsoHeight = Math.abs(Number(torso.height) || torsoProfile.height);
            const scale = Math.max(1, Math.min(1.55, currentTorsoHeight / torsoProfile.height));
            const originX = oldTorsoCenterX - ((torsoProfile.x + torsoProfile.width * 0.5) * scale);
            const originY = oldTorsoY - (torsoProfile.y * scale);

            Object.entries(armature.parts || {}).forEach(([partKey, part]) => {
                const obj = part?.obj || part?.raw;
                const directProfile = profile.parts[partKey];
                const carrierProfile = getRoleCarrierProfile(profile, partKey);
                if (!obj || obj.type !== 'freeform' || !carrierProfile) return;
                if (typeof this._storeArmatureAppearanceBackup === 'function') {
                    this._storeArmatureAppearanceBackup(obj);
                }
                const rectProfile = directProfile || carrierProfile;
                const rect = {
                    x: originX + rectProfile.x * scale,
                    y: originY + rectProfile.y * scale,
                    width: rectProfile.width * scale,
                    height: rectProfile.height * scale,
                    pivotX: rectProfile.pivotX ?? carrierProfile.pivotX,
                    pivotY: rectProfile.pivotY ?? carrierProfile.pivotY
                };
                const carrierPathN = rectProfile.carrierPathN || carrierProfile.carrierPathN;
                if (setObjectCarrierRect(obj, rect, carrierPathN, profile.version)) applied += 1;
            });

            const liveTorso = armature.parts?.torso?.obj || torso;
            if (liveTorso) {
                this._configureDummyArmatureJointPin?.(armature.parts?.['head-neck']?.obj, liveTorso, 'waist', 'inherit');
                this._configureDummyArmatureJointPin?.(armature.parts?.['right-arm']?.obj, liveTorso, 'waist', 'inherit');
                this._configureDummyArmatureJointPin?.(armature.parts?.['left-arm']?.obj, liveTorso, 'waist', 'inherit');
                this._configureDummyArmaturePin?.(armature.parts?.['right-leg']?.obj, liveTorso, profile.parts['right-leg']?.pinAnchorX ?? 0.36, profile.parts['right-leg']?.pinAnchorY ?? 0.84, 'inherit');
                this._configureDummyArmaturePin?.(armature.parts?.['left-leg']?.obj, liveTorso, profile.parts['left-leg']?.pinAnchorX ?? 0.64, profile.parts['left-leg']?.pinAnchorY ?? 0.84, 'inherit');
            }
        } else {
            const headProfile = profile.parts?.['head-neck'];
            const carrierPathN = headProfile?.carrierPathN;
            const head = armature.parts?.['head-neck']?.obj || armature.parts?.head?.obj || null;
            if (head?.type === 'freeform') {
                if (typeof this._storeArmatureAppearanceBackup === 'function') {
                    this._storeArmatureAppearanceBackup(head);
                }
                if (setObjectCarrierRect(head, {
                    x: head.x,
                    y: head.y,
                    width: head.width,
                    height: head.height,
                    pivotX: head.pivotX,
                    pivotY: head.pivotY
                }, carrierPathN, headProfile?.version || profile.version || 2)) {
                    applied += 1;
                }
            }
        }

        Object.values(armature.parts || {}).forEach(part => {
            const obj = part?.obj || part?.raw;
            if (!obj || options.reapplyTexture === false || !obj.textureImageSrc || obj.type === 'image') return;
            obj.fillType = 'picture';
            obj.pictureFillMode = 'stretch';
            obj.pictureFillRotation = 0;
        });
        this.objects?._resolvePins?.();
        if (applied > 0) {
            root._svgAfricanCarrierProfileVersion = profile.version || 2;
            root._svgAfricanCarrierProfile = profile.version >= 3 ? 'front-body-v3' : 'front-art-v2';
        }
        return applied > 0;
    };

    JointSystem.prototype._applySvgAfricanPremiumAssetGeometry = function(armature, options = {}) {
        const root = armature?.root;
        if (!root) return false;
        const config = options.config || root._svgCharacterConfig || {};
        let asset = options.asset || getSvgAfricanPremiumAssetForConfig(config);
        if (asset && !asset.realistic && config._realisticCharacter) asset = globalThis.RealisticCharacter.assetFor(asset, config);
        if (!asset?.parts) return false;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        const configHasAdjustments = ['premiumAdjustments', '_svgAfricanAdjustments', 'adjustments']
            .some(key => config?.[key] && typeof config[key] === 'object');
        const adjustmentOverride = Object.prototype.hasOwnProperty.call(options, 'adjustments')
            ? options.adjustments
            : (configHasAdjustments ? null : root._svgAfricanAdjustments);
        const adjustments = PremiumAssets?.resolveAdjustments?.(config, adjustmentOverride)
            || PremiumAssets?.getAdjustments?.(config, adjustmentOverride)
            || config.premiumAdjustments
            || root._svgAfricanAdjustments
            || {};
        const assetManifest = PremiumAssets?.getAssetManifest?.(asset.id) || null;
        const assetCalibration = PremiumAssets?.getCalibrationSnapshot?.(asset.id, adjustments) || null;
        const assetProfile = asset.assetProfile || 'front-six-part-premium';
        const premiumView = String(asset.view || config.view || config.styling?.view || 'front');
        const isSidePremiumAsset = /^side-/.test(premiumView);
        const projectionMode = getThreeQuarterProjectionMode(asset);
        const isAuthoredThreeQuarter = isAuthoredThreeQuarterAsset(asset);

        const torso = armature.parts?.torso?.obj || armature.root;
        const torsoProfile = (asset.realistic ? asset.parts.torso : PremiumAssets?.getPartProfile?.(asset.id, 'torso', adjustments)) || asset.parts.torso;
        const baseTorsoProfile = asset.parts?.torso || torsoProfile;
        if (!torso || !torsoProfile) return false;

        const oldTorsoCenterX = (Number(torso.x) || 0) + Math.abs(Number(torso.width) || torsoProfile.width) * (torso.pivotX ?? 0.5);
        const oldTorsoY = Number(torso.y) || 0;
        const currentTorsoHeight = Math.abs(Number(torso.height) || baseTorsoProfile.height || torsoProfile.height);
        const storedScale = Number(root._svgAfricanPremiumBaseScale);
        const previousTorsoProfile = torso._svgAfricanPartProfile;
        const scale = Number.isFinite(storedScale) && storedScale > 0
            ? storedScale
            : options.preservePartSizes === true && Number(previousTorsoProfile?.height) > 0
                ? currentTorsoHeight / previousTorsoProfile.height
                : Math.max(0.72, Math.min(1.55, currentTorsoHeight / Math.max(1, baseTorsoProfile.height || torsoProfile.height)));
        const originX = oldTorsoCenterX - ((torsoProfile.x + torsoProfile.width * (torsoProfile.pivotX ?? 0.5)) * scale);
        const originY = oldTorsoY - (torsoProfile.y * scale);
        let applied = 0;

        Object.entries(armature.parts || {}).forEach(([partKey, part]) => {
            const obj = part?.obj || part?.raw;
            const profile = (asset.realistic ? asset.parts[partKey] : PremiumAssets?.getPartProfile?.(asset.id, partKey, adjustments)) || asset.parts[partKey];
            if (!obj || !profile) return;
            const previousProfile = obj._svgAfricanPartProfile;
            const sizeRatio = axis => options.preservePartSizes === true && Number(previousProfile?.[axis]) > 0
                ? Number(obj[axis]) / Math.max(8, Math.round(previousProfile[axis] * scale)) : 1;
            const widthRatio = sizeRatio('width'), heightRatio = sizeRatio('height');
            if (typeof this._storeArmatureAppearanceBackup === 'function') {
                this._storeArmatureAppearanceBackup(obj);
            }

            obj.type = 'image';
            obj.x = Math.round(originX + profile.x * scale);
            obj.y = Math.round(originY + profile.y * scale);
            const profileWidth = Math.max(8, Math.round(profile.width * scale));
            const profileHeight = Math.max(8, Math.round(profile.height * scale));
            obj.width = Math.max(8, profileWidth * widthRatio);
            obj.height = Math.max(8, profileHeight * heightRatio);
            obj.pivotX = Number.isFinite(profile.pivotX) ? profile.pivotX : (obj.pivotX ?? 0.5);
            obj.pivotY = Number.isFinite(profile.pivotY) ? profile.pivotY : (obj.pivotY ?? 0.5);
            // Preserve edits around the attachment pivot, not the image's top-left.
            obj.x += (profileWidth - obj.width) * obj.pivotX;
            if (partKey !== 'torso') obj.y += (profileHeight - obj.height) * obj.pivotY;
            obj.fillType = 'solid';
            obj.fill = 'transparent';
            obj.stroke = 'transparent';
            obj.strokeWidth = 0;
            obj.pathPoints = [];
            obj.closedPath = true;
            obj.textureImageSrc = null;
            obj.textureImageElement = null;
            obj._textureImagePromise = null;
            obj.pictureFillMode = 'stretch';
            obj.pictureFillRotation = 0;
            obj.imageZoom = 1;
            obj.imagePanX = 0;
            obj.imagePanY = 0;
            obj.opacity = 1;
            if (asset.realistic) {
                obj.jointContours = /-(arm|leg)$/.test(partKey);
                obj.pinContour = false;
                obj.contourColor = null;
                obj.contourFillMode = 'joint-texture';
                obj.contourSize = 1;
            }
            obj._svgAfricanPremiumAssetId = asset.id;
            obj._svgAfricanAdjustments = clone(adjustments);
            obj._svgCharacterPremiumPart = true;
            obj._svgCharacterPremiumPartKey = partKey;
            obj._armatureRoleKey = partKey;
            obj.armatureRoleKey = partKey;
            obj._armaturePartKey = partKey;
            obj.armaturePartKey = partKey;
            obj._svgAfricanAssetProfile = assetProfile;
            obj._svgCharacterProjectionMode = projectionMode;
            obj._svgAfricanSourcePath = asset.sourcePath || null;
            obj._svgAfricanMasterFile = asset.masterFile || null;
            obj._svgAfricanSourceFile = asset.partFiles?.[partKey] || null;
            obj._svgAfricanPartProfile = clone(profile);
            obj._svgAfricanJointProfile = clone(asset.joints?.[partKey] || {});
            obj._svgAfricanPinProfile = clone(asset.pins?.[partKey] || {});
            obj._svgAfricanCalibrationVersion = asset.calibrationVersion || 1;
            obj._svgAfricanAnatomicalLayoutVersion = 2;
            if (partKey === 'head-neck') {
                suppressPremiumHeadNeckContours(obj);
            }
            applyPremiumJointProfile(obj, asset.joints?.[partKey] || {});
            if (asset.realistic && obj.jointContours) obj.joints?.forEach(joint => {
                joint.contourSize = /(?:^|-)(elbow|knee|wrist|ankle)$/.test(joint.name) ? 1 : 0;
                joint.contourColor = null;
            });
            if (partKey === 'head-neck') {
                StageObject.normalizeSvgAfricanHeadNeckRig?.(obj, {
                    force: true,
                    view: premiumView,
                    position: asset.joints?.[partKey]?.neck?.position
                });
            }
            obj.bodyPartData = {
                ...(obj.bodyPartData || {}),
                partKey,
                charType: isSidePremiumAsset ? 'human-side-dual' : 'human-front'
            };
            applied += 1;
        });

        if (Array.isArray(asset.order) && asset.order.length) {
            asset.order.forEach((partKey, index) => {
                const obj = armature.parts?.[partKey]?.obj || armature.parts?.[partKey]?.raw;
                if (!obj) return;
                obj.layer = index;
                obj.renderZ = index;
                obj._armatureDrawLayer = index;
                obj.armatureDrawLayer = index;
            });
        }

        const liveTorso = armature.parts?.torso?.obj || torso;
        const torsoPinTransform = liveTorso ? {
            rotation: liveTorso.rotation,
            tiltX: liveTorso.tiltX,
            tiltY: liveTorso.tiltY
        } : null;

        // Premium profiles store all six parts in one neutral asset coordinate
        // space. During a 3/4 view switch the outgoing torso is already tilted;
        // deriving pins through that tilt turns the profile's shoulder and neck
        // positions into large, asymmetric offsets. Calibrate against the neutral
        // asset geometry, then restore the structural view transform.
        if (liveTorso) {
            liveTorso.rotation = 0;
            liveTorso.tiltX = 0;
            liveTorso.tiltY = 0;
        }
        try {
            Object.entries(asset.pins || {}).forEach(([partKey, pin]) => {
                const obj = armature.parts?.[partKey]?.obj;
                if (!obj || !liveTorso || partKey === 'torso') return;
                if (pin.mode === 'joint') {
                    this._configureDummyArmatureJointPin?.(obj, liveTorso, pin.joint || 'waist', pin.rotation || 'inherit');
                } else {
                    this._configureDummyArmaturePin?.(
                        obj,
                        liveTorso,
                        Number.isFinite(pin.anchorX) ? pin.anchorX : 0.5,
                        Number.isFinite(pin.anchorY) ? pin.anchorY : 0.5,
                        pin.rotation || 'inherit'
                    );
                }
            });
        } finally {
            if (liveTorso && torsoPinTransform) {
                liveTorso.rotation = torsoPinTransform.rotation;
                liveTorso.tiltX = torsoPinTransform.tiltX;
                liveTorso.tiltY = torsoPinTransform.tiltY;
            }
        }
        if (isSidePremiumAsset && typeof this._syncArmatureVisualLayerOrder === 'function') {
            this._syncArmatureVisualLayerOrder(
                armature,
                premiumView.endsWith('-left') ? 'left' : 'right',
                asset.order
            );
        }
        suppressPremiumHeadNeckContours(armature.parts?.['head-neck']?.obj);

        root._svgAfricanPremiumAssetId = asset.id;
        root._svgAfricanAssetProfile = assetProfile;
        root._svgAfricanSourcePath = asset.sourcePath || null;
        root._svgAfricanMasterFile = asset.masterFile || null;
        root._svgAfricanAssetManifest = clone(assetManifest);
        root._svgAfricanCalibration = clone(assetCalibration);
        root._svgAfricanCalibrationVersion = asset.calibrationVersion || 1;
        root._svgAfricanAnatomicalLayoutVersion = 2;
        root._svgAfricanAdjustments = clone(adjustments);
        root._svgAfricanPremiumBaseScale = scale;
        root._svgCharacterViewProfileKey = premiumView;
        root._svgCharacterProjectionMode = projectionMode;
        if (isSidePremiumAsset) {
            const side = /left$/.test(premiumView) ? 'left' : 'right';
            root._armatureFacingSide = side;
            root.armatureFacingSide = side;
            root._armatureVisualFacingSide = side;
            root.armatureVisualFacingSide = side;
            root._armatureFacingExplicit = true;
        } else {
            const facing = premiumView.startsWith('back') ? 'back' : 'front';
            root._armatureFrontBackFacing = facing;
            root.armatureFrontBackFacing = facing;
        }
        root._normalizedDownBaseline = true;
        if (isAuthoredThreeQuarter && options.skipViewStateSync !== true && typeof this._setArmatureFrontBackThreeQuarterState === 'function') {
            this._setArmatureFrontBackThreeQuarterState(
                armature,
                premiumView.startsWith('back') ? 'back' : 'front',
                premiumView.endsWith('-left') ? 'left' : 'right',
                { applyBaselineTilt: false, applyPinLayout: false, syncLayers: false }
            );
            Object.values(armature.parts || {}).forEach(part => {
                const obj = part?.obj || part?.raw;
                if (!obj) return;
                obj.tiltY = 0;
                if (Number.isFinite(Number(obj.pinBaseTiltY))) obj.pinBaseTiltY = 0;
            });
        }
        this.objects?._resolvePins?.();
        if (isSidePremiumAsset && typeof this._syncArmatureVisualLayerOrder === 'function') {
            this._syncArmatureVisualLayerOrder(
                armature,
                premiumView.endsWith('-left') ? 'left' : 'right',
                asset.order
            );
        }
        return applied > 0;
    };

    JointSystem.prototype._syncSvgAfricanThreeQuarterProjection = function(armature, facing, lean, options = {}) {
        const live = this._refreshDetectedArmatureReference?.(armature) || armature;
        const root = live?.root;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!root || !PremiumAssets || root._characterAppearanceProvider !== 'svg-african-premium') return false;
        if (!(lean === 'left' || lean === 'right')) return false;

        const targetFacing = facing === 'back' ? 'back' : 'front';
        const targetView = `${targetFacing}-3q-${lean}`;
        if (root._svgCharacterConfig?._realisticCharacter && !root._svgCharacterConfig._realisticCharacter.views[targetView]) return live;
        const sourceAssetId = root._svgCharacterPremiumAssetId
            || root._svgAfricanPremiumAssetId
            || root._svgCharacterConfig?.assetCharacterId;
        const targetAssetId = PremiumAssets.getViewVariantAssetId?.(sourceAssetId, targetView);
        const rawTargetAsset = PremiumAssets.get?.(targetAssetId);
        const targetAsset = root._svgCharacterConfig?._realisticCharacter ? globalThis.RealisticCharacter.assetFor(rawTargetAsset, root._svgCharacterConfig) : rawTargetAsset;
        const projectionMode = getThreeQuarterProjectionMode(targetAsset);
        if (!projectionMode) return false;
        if (
            root._svgCharacterProjectionMode === projectionMode
            && root._svgCharacterViewProfileKey === targetView
            && root._svgCharacterPremiumAssetId === targetAsset.id
        ) {
            return false;
        }

        const previousConfig = root._svgCharacterConfig || {};
        const nextConfigInput = {
            ...clone(previousConfig),
            engine: targetAsset.engine || 'svg-armature-premium',
            assetCharacterId: targetAsset.configAssetId || targetAsset.id,
            view: targetView,
            sideFacing: lean,
            styling: {
                ...(clone(previousConfig.styling || root._svgCharacterStyling || {})),
                view: targetView,
                sideFacing: lean
            }
        };
        const nextConfig = PremiumAssets.normalizePremiumConfig?.(targetAsset, nextConfigInput) || nextConfigInput;
        nextConfig.assetCharacterId = targetAsset.configAssetId || targetAsset.id;
        nextConfig.view = targetView;
        nextConfig.sideFacing = lean;
        nextConfig.styling = {
            ...(nextConfig.styling || {}),
            view: targetView,
            sideFacing: lean
        };

        const instanceId = root._svgCharacterInstanceId
            || globalThis.SvgCharacterUtils?.makeInstanceId?.('svgaf')
            || `svgaf-${Date.now().toString(36)}`;
        root._svgCharacterInstanceId = instanceId;
        this._applySvgAfricanPremiumAssetGeometry?.(live, {
            config: nextConfig,
            asset: targetAsset,
            preservePartSizes: true,
            skipViewStateSync: true
        });
        if (projectionMode === 'profile-tilt-3q') {
            // These variants share the calibrated six-part UC attachment layout.
            // Geometry refreshes must not replace its shoulder, neck, and hip pin
            // offsets with values derived from the already projected artwork.
            this._applyFrontArmatureViewLayout?.(live, targetFacing);
        }

        Object.entries(live.parts || {}).forEach(([partKey, part]) => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            const imageSrc = PremiumAssets.renderPartDataUrl(targetAsset.id, partKey, nextConfig, instanceId, {
                faceState: partKey === 'head-neck' ? nextConfig._svgAfricanFaceState : null
            });
            if (imageSrc) {
                obj.imageSrc = imageSrc;
                obj.loadImage?.(imageSrc, { preserveDimensions: true });
            }
            obj._svgCharacterConfig = clone(nextConfig);
            obj._svgCharacterStyling = clone(nextConfig.styling);
            obj._svgCharacterViewProfileKey = targetView;
            obj._svgCharacterProjectionMode = projectionMode;
            obj._svgCharacterPremiumAssetId = targetAsset.id;
            obj._svgAfricanPremiumAssetId = targetAsset.id;
        });

        root._svgCharacterConfig = clone(nextConfig);
        root._svgCharacterStyling = clone(nextConfig.styling);
        root._svgCharacterViewProfileKey = targetView;
        root._svgCharacterProjectionMode = projectionMode;
        root._svgCharacterPremiumAssetId = targetAsset.id;
        root._svgAfricanPremiumAssetId = targetAsset.id;
        root._armatureFrontBackFacing = targetFacing;
        root.armatureFrontBackFacing = targetFacing;
        root._armatureFront3qLean = lean;
        root._armatureFacingSide = lean;
        root.armatureFacingSide = lean;
        root._armatureVisualFacingSide = lean;
        root.armatureVisualFacingSide = lean;
        root._armatureFacingExplicit = true;
        this._syncSvgAfricanContinuousGarment?.(live, {
            asset: targetAsset,
            config: nextConfig,
            updateObjectList: false,
            updateProperties: false,
            render: false
        });
        if (options.resolvePins !== false) this.objects?._resolvePins?.();
        return true;
    };

    JointSystem.prototype._getSvgAfricanPremiumViewKey = function(armature = null) {
        const live = armature?.root ? armature : this._resolveSvgAfricanArmature?.(armature);
        const root = live?.root;
        if (!root || root._characterAppearanceProvider !== 'svg-african-premium') return null;
        const fallbackSide = root._armatureVisualFacingSide
            || root._armatureFacingSide
            || root._svgCharacterConfig?.sideFacing
            || root._svgCharacterStyling?.sideFacing
            || 'right';
        return normalizePremiumArmatureView(
            root._svgCharacterViewProfileKey
                || root._svgCharacterConfig?.view
                || root._svgCharacterStyling?.view
                || root._svgCharacterConfig?.styling?.view
                || root._svgCharacterPremiumAssetId
                || 'front',
            fallbackSide
        );
    };

    JointSystem.prototype._getSvgAfricanPremiumViewSwitcherKey = function(armature = null) {
        const view = this._getSvgAfricanPremiumViewKey?.(armature);
        return view ? premiumViewToSwitcherKey(view) : null;
    };

    JointSystem.prototype._getSvgAfricanPremiumOppositeViewKey = function(armature = null) {
        const view = this._getSvgAfricanPremiumViewKey?.(armature);
        return view ? getOppositePremiumArmatureView(view) : null;
    };

    JointSystem.prototype._isSvgAfricanPremiumViewFamilyCompatible = function(armature, requestedView) {
        const currentView = this._getSvgAfricanPremiumViewKey?.(armature);
        if (!currentView) return false;
        const targetView = normalizePremiumArmatureView(requestedView);
        return currentView.startsWith('side-') === targetView.startsWith('side-');
    };

    JointSystem.prototype._remapSvgAfricanPremiumArmaturePartsForView = function(armature, targetView) {
        if (!armature?.root || !armature.parts) return false;
        const currentView = this._getSvgAfricanPremiumViewKey?.(armature) || 'front';
        const normalizedTarget = normalizePremiumArmatureView(targetView);
        const sourceIsSide = /^side-/.test(currentView)
            || !!(armature.parts['front-arm'] && armature.parts['back-arm']);
        const sourceSide = currentView.endsWith('-left') ? 'left' : 'right';
        const source = armature.parts;
        const torso = source.torso || (armature.root ? { obj: armature.root, joints: {} } : null);
        const head = source['head-neck'] || source.head || null;
        const anatomical = sourceIsSide
            ? {
                'right-arm': sourceSide === 'right' ? source['front-arm'] : source['back-arm'],
                'left-arm': sourceSide === 'left' ? source['front-arm'] : source['back-arm'],
                'right-leg': sourceSide === 'right' ? source['front-leg'] : source['back-leg'],
                'left-leg': sourceSide === 'left' ? source['front-leg'] : source['back-leg']
            }
            : {
                'right-arm': source['right-arm'],
                'left-arm': source['left-arm'],
                'right-leg': source['right-leg'],
                'left-leg': source['left-leg']
            };
        const targetIsSide = /^side-/.test(normalizedTarget);
        const targetSide = normalizedTarget.endsWith('-left') ? 'left' : 'right';
        const next = targetIsSide
            ? {
                torso,
                'head-neck': head,
                'front-arm': targetSide === 'right' ? anatomical['right-arm'] : anatomical['left-arm'],
                'back-arm': targetSide === 'right' ? anatomical['left-arm'] : anatomical['right-arm'],
                'front-leg': targetSide === 'right' ? anatomical['right-leg'] : anatomical['left-leg'],
                'back-leg': targetSide === 'right' ? anatomical['left-leg'] : anatomical['right-leg']
            }
            : {
                torso,
                'head-neck': head,
                'right-arm': anatomical['right-arm'],
                'left-arm': anatomical['left-arm'],
                'right-leg': anatomical['right-leg'],
                'left-leg': anatomical['left-leg']
            };
        if (Object.values(next).some(part => !part?.obj && !part?.raw)) return false;

        const displayNames = {
            torso: armature.root.name || 'SVG African Character',
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
        const charType = targetIsSide ? 'human-side-dual' : 'human-front';
        Object.entries(next).forEach(([partKey, part]) => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            obj.name = displayNames[partKey] || obj.name;
            obj._armatureRoleKey = partKey;
            obj.armatureRoleKey = partKey;
            obj._armaturePartKey = partKey;
            obj.armaturePartKey = partKey;
            obj._svgCharacterPartKey = partKey;
            obj._svgCharacterPremiumPartKey = partKey;
            obj.bodyPartData = { ...(obj.bodyPartData || {}), partKey, charType };
            this._applyArmatureJointChainToObject?.(obj, partKey);
            next[partKey] = {
                ...part,
                obj,
                joints: this._buildArmatureJointRefLookup?.(obj) || {}
            };
        });
        armature.parts = next;
        // Change every view-discovery signal together. The Pose Armature panel
        // re-detects the rig while reopening; leaving a previous front/back
        // variant key in place can make a newly remapped side rig immediately
        // switch back to its outgoing view.
        armature.root._armaturePromotedProfile = targetIsSide ? 'side-dual' : 'front';
        armature.root._ucCharacterVariantKey = premiumViewToSwitcherKey(normalizedTarget);
        if (targetIsSide) {
            armature.root._armatureFrontBackFacing = null;
            armature.root.armatureFrontBackFacing = null;
            armature.root._armatureFront3qLean = null;
        } else {
            const facing = normalizedTarget.startsWith('back') ? 'back' : 'front';
            const lean = /-3q-(left|right)$/.exec(normalizedTarget)?.[1] || null;
            armature.root._armatureFrontBackFacing = facing;
            armature.root.armatureFrontBackFacing = facing;
            armature.root._armatureFront3qLean = lean;
        }
        return true;
    };

    JointSystem.prototype._switchSvgAfricanPremiumView = function(armature, requestedView, options = {}) {
        let live = this._resolveSvgAfricanArmature?.(armature) || armature;
        const root = live?.root;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!root || root._characterAppearanceProvider !== 'svg-african-premium' || !PremiumAssets) return null;

        const fallbackSide = root._armatureVisualFacingSide || root._armatureFacingSide || 'right';
        const targetView = normalizePremiumArmatureView(requestedView, fallbackSide);
        if (root._svgCharacterConfig?._realisticCharacter && !root._svgCharacterConfig._realisticCharacter.views[targetView]) {
            if (typeof Utils !== 'undefined') Utils.showToast?.('Add matching artwork for this view in Realistic Characters first.', 'warning');
            return live;
        }
        const currentView = this._getSvgAfricanPremiumViewKey?.(live) || 'front';
        if (
            options.allowStructuralSwitch !== true
            && currentView.startsWith('side-') !== targetView.startsWith('side-')
        ) {
            return live;
        }
        const sourceAssetId = root._svgCharacterPremiumAssetId
            || root._svgAfricanPremiumAssetId
            || root._svgCharacterConfig?.assetCharacterId
            || PremiumAssets.getDefaultAssetId?.();
        let targetAssetId = PremiumAssets.getViewVariantAssetId?.(sourceAssetId, targetView);
        if (options.threeQuarterArtwork) targetAssetId = PremiumAssets.getThreeQuarterRuntimeAssetId(targetAssetId, options.threeQuarterArtwork);
        const rawTargetAsset = PremiumAssets.get?.(targetAssetId);
        const targetAsset = root._svgCharacterConfig?._realisticCharacter ? globalThis.RealisticCharacter.assetFor(rawTargetAsset, root._svgCharacterConfig) : rawTargetAsset;
        if (!targetAsset?.parts) return null;
        if (
            options.force !== true
            && currentView === targetView
            && String(sourceAssetId || '') === String(targetAsset.id || '')
        ) {
            return live;
        }

        root._svgAfricanPremiumViewSwitchInProgress = true;
        try {
        if (options.stopMovement !== false) this._stopArmatureMovement?.(live);
        if (!this._remapSvgAfricanPremiumArmaturePartsForView?.(live, targetView)) return null;

        const previousConfig = clone(root._svgCharacterConfig || {});
        // Head edits and independent-turn setup may be newer than the torso's copy.
        // Carry only head-owned fields; clothing and body dimensions remain root-owned.
        const headConfig = (live.parts?.['head-neck']?.obj || live.parts?.['head-neck']?.raw)?._svgCharacterConfig;
        if (headConfig) {
            previousConfig.identity = { ...previousConfig.identity };
            for (const key of ['presentation', 'ageGroup', 'skinTone', 'face', 'headType', 'eyes', 'nose', 'lips', 'hair', 'hairColor', 'facialHair']) {
                if (headConfig.identity?.[key] !== undefined) previousConfig.identity[key] = clone(headConfig.identity[key]);
            }
            previousConfig.styling = { ...previousConfig.styling };
            for (const key of ['headArtwork', 'headwear']) {
                if (headConfig.styling?.[key] !== undefined) previousConfig.styling[key] = headConfig.styling[key];
            }
            previousConfig.styling.colorOverrides = { ...previousConfig.styling.colorOverrides };
            for (const [key, value] of Object.entries(headConfig.styling?.colorOverrides || {})) {
                if (/^(hair|skin|headwear|glass|ink)/i.test(key)) previousConfig.styling.colorOverrides[key] = value;
            }
            previousConfig.premiumAdjustments = { ...previousConfig.premiumAdjustments };
            for (const [key, value] of Object.entries(headConfig.premiumAdjustments || {})) {
                if (/head|neck|hair|face|eye|ear|brow|nose|lip|chin|jaw|cheek|forehead|occiput/i.test(key)) previousConfig.premiumAdjustments[key] = value;
            }
            for (const key of ['_independentHeadTurn', '_headTurnConstruction', '_headTurnFullRange']) {
                if (headConfig[key] !== undefined) previousConfig[key] = headConfig[key];
            }
        }
        const identityId = root._svgCharacterIdentityId || previousConfig.identityId || previousConfig.identity?.identityId;
        const identity = clone(previousConfig.identity || root._svgCharacterIdentity || {});
        const sideFacing = targetView.endsWith('-left') ? 'left' : 'right';
        const configInput = {
            ...previousConfig,
            engine: targetAsset.engine || 'svg-armature-premium',
            assetCharacterId: targetAsset.configAssetId || targetAsset.id,
            identityId,
            identity: { ...identity, ...(identityId ? { identityId } : {}) },
            view: targetView,
            sideFacing,
            styling: {
                ...(clone(previousConfig.styling || root._svgCharacterStyling || {})),
                ...(options.threeQuarterArtwork ? { threeQuarterArtwork: options.threeQuarterArtwork } : {}),
                view: targetView,
                sideFacing
            }
        };
        const config = PremiumAssets.normalizePremiumConfig?.(targetAsset, configInput) || configInput;
        config.assetCharacterId = targetAsset.configAssetId || targetAsset.id;
        config.view = targetView;
        config.sideFacing = sideFacing;
        config.identityId = identityId;
        config.identity = { ...identity, ...(identityId ? { identityId } : {}) };
        config.styling = { ...(config.styling || {}), view: targetView, sideFacing };

        Object.values(live.parts || {}).forEach(part => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            obj.rotation = 0;
            obj.tiltX = 0;
            obj.tiltY = 0;
            obj.scaleX = Math.abs(Number(obj.scaleX) || 1);
            obj.scaleY = Math.abs(Number(obj.scaleY) || 1);
            (obj.joints || []).forEach(joint => {
                joint.angle = 0;
                joint.tiltX = 0;
                joint.tiltY = 0;
            });
        });

        this._applySvgAfricanPremiumAssetGeometry?.(live, {
            config,
            asset: targetAsset,
            preservePartSizes: true,
            skipViewStateSync: true
        });

        const instanceId = root._svgCharacterInstanceId
            || globalThis.SvgCharacterUtils?.makeInstanceId?.('svgaf')
            || `svgaf-${Date.now().toString(36)}`;
        root._svgCharacterInstanceId = instanceId;
        Object.entries(live.parts || {}).forEach(([partKey, part]) => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            const imageSrc = PremiumAssets.renderPartDataUrl?.(targetAsset.id, partKey, config, instanceId, {
                faceState: partKey === 'head-neck' ? config._svgAfricanFaceState : null
            });
            if (imageSrc) {
                obj.imageSrc = imageSrc;
                obj.loadImage?.(imageSrc, { preserveDimensions: true });
            }
            obj._characterAppearanceProvider = 'svg-african-premium';
            obj._svgCharacterConfig = clone(config);
            obj._svgCharacterIdentity = clone(config.identity);
            obj._svgCharacterStyling = clone(config.styling);
            obj._svgCharacterIdentityId = identityId;
            obj._svgCharacterViewProfileKey = targetView;
            obj._svgCharacterProjectionMode = getThreeQuarterProjectionMode(targetAsset);
            obj._svgCharacterPremiumAssetId = targetAsset.id;
            obj._svgAfricanPremiumAssetId = targetAsset.id;
            obj._svgCharacterPartKey = partKey;
            obj._svgCharacterPremiumPartKey = partKey;
            obj._armatureRoleKey = partKey;
            obj.armatureRoleKey = partKey;
            obj._armaturePartKey = partKey;
            obj.armaturePartKey = partKey;
            obj.bodyPartData = {
                ...(obj.bodyPartData || {}),
                partKey,
                charType: targetView.startsWith('side-') ? 'human-side-dual' : 'human-front'
            };
            live.parts[partKey].joints = this._buildArmatureJointRefLookup?.(obj) || {};
        });

        root._svgCharacterConfig = clone(config);
        root._svgCharacterIdentity = clone(config.identity);
        root._svgCharacterStyling = clone(config.styling);
        root._svgCharacterIdentityId = identityId;
        root._svgCharacterViewProfileKey = targetView;
        root._svgCharacterProjectionMode = getThreeQuarterProjectionMode(targetAsset);
        root._svgCharacterPremiumAssetId = targetAsset.id;
        root._svgAfricanPremiumAssetId = targetAsset.id;
        root._armaturePromotedProfile = targetView.startsWith('side-') ? 'side-dual' : 'front';
        root._ucCharacterVariantKey = premiumViewToSwitcherKey(targetView);

        const isSide = targetView.startsWith('side-');
        const isThreeQuarter = /^(front|back)-3q-(left|right)$/.test(targetView);
        const frontBackFacing = targetView.startsWith('back') ? 'back' : 'front';
        if (isSide) {
            root._armatureFront3qLean = null;
            root._armatureFrontBackFacing = null;
            root.armatureFrontBackFacing = null;
            root._armatureFacingSide = sideFacing;
            root.armatureFacingSide = sideFacing;
            root._armatureVisualFacingSide = sideFacing;
            root.armatureVisualFacingSide = sideFacing;
            root._armatureVisualBaseFacingSide = sideFacing;
            root._armatureFacingExplicit = true;
            this._syncArmatureVisualLayerOrder?.(live, sideFacing, targetAsset.order);
        } else {
            root._armatureFrontBackFacing = frontBackFacing;
            root.armatureFrontBackFacing = frontBackFacing;
            root._armatureFront3qLean = isThreeQuarter ? sideFacing : null;
            root._armatureFacingSide = isThreeQuarter ? sideFacing : root._armatureFacingSide;
            root.armatureFacingSide = root._armatureFacingSide;
            root._armatureVisualFacingSide = isThreeQuarter ? sideFacing : root._armatureVisualFacingSide;
            root.armatureVisualFacingSide = root._armatureVisualFacingSide;
            if (isThreeQuarter) {
                root._armatureVisualBaseFacingSide = sideFacing;
                this._setArmatureFrontBackThreeQuarterState?.(live, frontBackFacing, sideFacing, {
                    applyBaselineTilt: !isAuthoredThreeQuarterAsset(targetAsset),
                    applyPinLayout: !isAuthoredThreeQuarterAsset(targetAsset),
                    syncLayers: true
                });
            } else {
                Object.values(live.parts || {}).forEach(part => {
                    const obj = part?.obj || part?.raw;
                    if (!obj) return;
                    obj.tiltX = 0;
                    obj.tiltY = 0;
                    if (Number.isFinite(Number(obj.pinBaseTiltX))) obj.pinBaseTiltX = 0;
                    if (Number.isFinite(Number(obj.pinBaseTiltY))) obj.pinBaseTiltY = 0;
                });
                this._syncArmatureFrontBackViewLayerOrder?.(live, frontBackFacing, targetAsset.order);
            }
        }

        const idle = this._getActiveArmaturePoseCatalog?.(live)?.idle || { jointAngles: {} };
        this._applyArmaturePose?.(live, idle);
        this.objects?._resolvePins?.();
        this._syncSvgAfricanContinuousGarment?.(live, {
            asset: targetAsset,
            config,
            updateObjectList: false,
            updateProperties: false,
            render: false
        });
        live = this._refreshDetectedArmatureReference?.(live) || live;
        this._currentArmature = live;
        this._captureArmatureStageBasePosition?.(live);
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        emit('objects:updated');
        if (options.pushHistory !== false && currentView !== targetView) emit('history:push');

        if (
            options.rebuildPanel !== false
            && typeof document !== 'undefined'
            && document.getElementById?.('armature-panel')
            && typeof this._buildArmaturePanel === 'function'
            && typeof this._getDecoratedArmaturePoseEntry === 'function'
            && typeof this._getDecoratedArmatureMovementEntry === 'function'
        ) {
            this._buildArmaturePanel?.(live, { preserveState: false, reuseExisting: true });
            this._updateArmaturePanelPlayState?.(live);
        }
        if (options.toast !== false && currentView !== targetView) {
            const label = premiumViewToSwitcherKey(targetView)
                .replace(/:/g, ' ')
                .replace(/-/g, ' ')
                .replace(/\b\w/g, letter => letter.toUpperCase());
            if (typeof Utils !== 'undefined') Utils.showToast?.(`SVG character switched to ${label}`, 'success');
        }
        return live;
        } finally {
            root._svgAfricanPremiumViewSwitchInProgress = false;
            if (live?.root && live.root !== root) {
                live.root._svgAfricanPremiumViewSwitchInProgress = false;
            }
        }
    };

    JointSystem.prototype._syncSvgAfricanPremiumTimelineView = function(armature, requestedView, options = {}) {
        let live = this._resolveSvgAfricanArmature?.(armature) || armature;
        const root = live?.root;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!root || root._characterAppearanceProvider !== 'svg-african-premium' || !PremiumAssets) return live;

        const fallbackSide = root._armatureVisualFacingSide || root._armatureFacingSide || 'right';
        const targetView = normalizePremiumArmatureView(requestedView, fallbackSide);
        if (root._svgCharacterConfig?._realisticCharacter && !root._svgCharacterConfig._realisticCharacter.views[targetView]) return live;
        const currentView = this._getSvgAfricanPremiumViewKey?.(live) || 'front';
        if (currentView.startsWith('side-') !== targetView.startsWith('side-')) return live;
        if (currentView === targetView) return live;

        if (!this._remapSvgAfricanPremiumArmaturePartsForView?.(live, targetView)) return live;
        const sourceAssetId = root._svgCharacterPremiumAssetId
            || root._svgAfricanPremiumAssetId
            || root._svgCharacterConfig?.assetCharacterId
            || PremiumAssets.getDefaultAssetId?.();
        const targetAssetId = PremiumAssets.getViewVariantAssetId?.(sourceAssetId, targetView);
        const rawTargetAsset = PremiumAssets.get?.(targetAssetId);
        const targetAsset = root._svgCharacterConfig?._realisticCharacter ? globalThis.RealisticCharacter.assetFor(rawTargetAsset, root._svgCharacterConfig) : rawTargetAsset;
        const sideFacing = targetView.endsWith('-left') ? 'left' : 'right';
        const nextConfig = {
            ...clone(root._svgCharacterConfig || {}),
            ...(targetAsset?.id ? { assetCharacterId: targetAsset.configAssetId || targetAsset.id } : {}),
            view: targetView,
            sideFacing,
            styling: {
                ...clone(root._svgCharacterConfig?.styling || root._svgCharacterStyling || {}),
                view: targetView,
                sideFacing
            }
        };

        Object.entries(live.parts || {}).forEach(([partKey, part]) => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            obj._svgCharacterViewProfileKey = targetView;
            obj._svgCharacterConfig = clone(nextConfig);
            obj._svgCharacterStyling = clone(nextConfig.styling);
            obj._svgCharacterPartKey = partKey;
            obj._svgCharacterPremiumPartKey = partKey;
            if (targetAsset?.id) {
                obj._svgCharacterPremiumAssetId = targetAsset.id;
                obj._svgAfricanPremiumAssetId = targetAsset.id;
                // Playback owns dimensions; keep only their authored reference in
                // sync so a later manual turn does not treat perspective as resizing.
                const profile = (targetAsset.realistic ? targetAsset.parts?.[partKey] : PremiumAssets.getPartProfile?.(targetAsset.id, partKey, PremiumAssets.getAdjustments?.(nextConfig)))
                    || targetAsset.parts?.[partKey];
                if (profile) obj._svgAfricanPartProfile = clone(profile);
            }
        });

        root._svgCharacterViewProfileKey = targetView;
        root._svgCharacterConfig = clone(nextConfig);
        root._svgCharacterStyling = clone(nextConfig.styling);
        if (targetAsset?.id) {
            root._svgCharacterPremiumAssetId = targetAsset.id;
            root._svgAfricanPremiumAssetId = targetAsset.id;
        }
        if (targetView.startsWith('side-')) {
            root._armaturePromotedProfile = 'side-dual';
            root._armatureFrontBackFacing = null;
            root.armatureFrontBackFacing = null;
            root._armatureFront3qLean = null;
            root._armatureFacingSide = sideFacing;
            root.armatureFacingSide = sideFacing;
            root._armatureVisualFacingSide = sideFacing;
            root.armatureVisualFacingSide = sideFacing;
            root._armatureVisualBaseFacingSide = sideFacing;
        } else {
            const facing = targetView.startsWith('back') ? 'back' : 'front';
            const lean = /-3q-(left|right)$/.exec(targetView)?.[1] || null;
            root._armaturePromotedProfile = 'front';
            root._armatureFrontBackFacing = facing;
            root.armatureFrontBackFacing = facing;
            root._armatureFront3qLean = lean;
            if (lean) {
                root._armatureFacingSide = lean;
                root.armatureFacingSide = lean;
                root._armatureVisualFacingSide = lean;
                root.armatureVisualFacingSide = lean;
                root._armatureVisualBaseFacingSide = lean;
            }
        }
        root._ucCharacterVariantKey = premiumViewToSwitcherKey(targetView);
        this._syncSvgAfricanContinuousGarment?.(live, {
            asset: targetAsset,
            config: nextConfig,
            updateObjectList: false,
            updateProperties: false,
            render: false
        });
        this._currentArmature = live;

        if (options.rebuildPanel !== false && typeof document !== 'undefined') {
            const panel = document.getElementById?.('armature-panel');
            if (panel && typeof this._buildArmaturePanel === 'function') {
                this._buildArmaturePanel(live, { preserveState: true, reuseExisting: true });
                this._updateArmaturePanelPlayState?.(live);
            }
        }
        if (options.updateObjectList !== false) this.objects?.updateObjectList?.();
        return live;
    };

    JointSystem.prototype._applySvgAfricanAppearanceToPart = function(obj, imageSrc, options = {}) {
        if (!obj || !imageSrc) return false;
        if (typeof this._storeArmatureAppearanceBackup === 'function') {
            this._storeArmatureAppearanceBackup(obj);
        }

        if (obj.type === 'image') {
            obj.imageSrc = imageSrc;
            obj.loadImage?.(imageSrc, { preserveDimensions: true });
        } else {
            obj.fillType = 'picture';
            obj.pictureFillMode = 'stretch';
            obj.pictureFillRotation = 0;
            obj.textureImageSrc = imageSrc;
            obj.textureImageElement = null;
            obj._textureImagePromise = null;
            obj.strokeWidth = 0;
            obj.opacity = 1;
            obj.loadTextureImage?.(imageSrc);
        }
        return true;
    };

    JointSystem.prototype._resolveSvgAfricanArmature = function(armature = null) {
        if (armature?.root) {
            const refreshed = this._refreshDetectedArmatureReference?.(armature);
            return refreshed?.root?.id === armature.root.id ? refreshed : armature;
        }
        const live = this._detectSelectedArmature?.()
            || this._currentArmature
            || this._detectArmature?.();
        return live?.root ? live : null;
    };

    JointSystem.prototype._getSvgAfricanContinuousGarmentObjects = function(armature = null) {
        const live = armature?.root ? armature : this._resolveSvgAfricanArmature?.(armature);
        const root = live?.root;
        if (!root?.id || !Array.isArray(this.objects?.objects)) return [];
        const torso = live.parts?.torso?.obj || root;
        return this.objects.objects.filter(obj => {
            if (!obj?.id || obj._ucGarmentLayer !== true) return false;
            if (!SVG_AFRICAN_CONTINUOUS_GARMENT_PART_KEYS.has(String(obj._ucGarmentPartKey || ''))) return false;
            return obj._ucGarmentRootId === root.id
                || obj._ucGarmentForPartId === torso?.id
                || obj.pinnedTo === torso?.id;
        });
    };

    JointSystem.prototype._removeSvgAfricanContinuousGarment = function(armature = null, options = {}) {
        const live = armature?.root ? armature : this._resolveSvgAfricanArmature?.(armature);
        const garments = this._getSvgAfricanContinuousGarmentObjects?.(live) || [];
        if (!garments.length) return 0;
        const manager = this.objects;
        const previousSuppressHistory = manager?._suppressHistory;
        if (manager) manager._suppressHistory = true;
        try {
            garments.forEach(garment => {
                if (typeof manager?.removeObject === 'function') {
                    manager.removeObject(garment.id);
                } else if (Array.isArray(manager?.objects)) {
                    const index = manager.objects.findIndex(obj => obj?.id === garment.id);
                    if (index >= 0) manager.objects.splice(index, 1);
                }
            });
        } finally {
            if (manager) manager._suppressHistory = previousSuppressHistory;
        }
        if (live?.root) live.root._svgAfricanGarmentIds = [];
        if (options.updateObjectList !== false) manager?.updateObjectList?.();
        if (options.updateProperties !== false) manager?.updateProperties?.();
        if (options.render !== false) this.stage?.requestRender?.();
        return garments.length;
    };

    JointSystem.prototype._syncSvgAfricanContinuousGarment = function(armature = null, options = {}) {
        const live = armature?.root ? armature : this._resolveSvgAfricanArmature?.(armature);
        const root = live?.root;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!root?._svgCharacter || !PremiumAssets) {
            return null;
        }
        if (root._characterAppearanceProvider !== 'svg-african-premium') {
            this._removeSvgAfricanContinuousGarment?.(live, options);
            return null;
        }

        const assetId = options.asset?.id
            || options.assetId
            || root._svgCharacterPremiumAssetId
            || root._svgAfricanPremiumAssetId
            || root._svgCharacterConfig?.assetCharacterId
            || PremiumAssets.getDefaultAssetId?.();
        const asset = options.asset || PremiumAssets.get?.(assetId);
        const config = options.config || root._svgCharacterConfig || {};
        if (config._realisticCharacter && config._realisticCharacter.mode !== 'hybrid') {
            this._removeSvgAfricanContinuousGarment?.(live, options);
            return null;
        }
        const instanceId = root._svgCharacterInstanceId
            || globalThis.SvgCharacterUtils?.makeInstanceId?.('svgaf')
            || `svgaf-${Date.now().toString(36)}`;
        root._svgCharacterInstanceId = instanceId;
        const renderOptions = { adjustments: config.premiumAdjustments || root._svgAfricanAdjustments || {} };
        const renderContinuousGarment = PremiumAssets.renderContinuousGarmentSpec
            || PremiumAssets.renderContinuousLowerGarmentSpec;
        const renderedSpecs = asset?.id && typeof PremiumAssets.renderContinuousGarmentSpecs === 'function'
            ? PremiumAssets.renderContinuousGarmentSpecs(asset.id, config, instanceId, renderOptions)
            : [asset?.id && renderContinuousGarment?.(asset.id, config, instanceId, renderOptions)];
        const specs = (Array.isArray(renderedSpecs) ? renderedSpecs : [renderedSpecs])
            .filter(spec => spec?.imageSrc)
            .sort((a, b) => (a.slotKey === 'outer' ? 1 : 0) - (b.slotKey === 'outer' ? 1 : 0));
        if (!specs.length) {
            this._removeSvgAfricanContinuousGarment?.(live, options);
            return null;
        }

        const torso = live.parts?.torso?.obj || root;
        const legs = [...new Map(
            ['right-leg', 'left-leg', 'front-leg', 'back-leg']
                .map(role => live.parts?.[role]?.obj || live.parts?.[role]?.raw || null)
                .filter(Boolean)
                .map(obj => [obj.id || obj, obj])
        ).values()].slice(0, 2);
        if (!torso || legs.length < 2) {
            this._removeSvgAfricanContinuousGarment?.(live, options);
            return null;
        }

        if (options.resolvePinsBefore !== false) this.objects?._resolvePins?.();
        const legLeft = Math.min(...legs.map(obj => Number(obj.x) || 0));
        const legRight = Math.max(...legs.map(obj => (Number(obj.x) || 0) + Math.abs(Number(obj.width) || 0)));
        const legTop = Math.min(...legs.map(obj => Number(obj.y) || 0));
        const legHeight = legs.reduce((sum, obj) => sum + Math.max(1, Math.abs(Number(obj.height) || 1)), 0) / legs.length;
        const legUnionWidth = Math.max(1, legRight - legLeft);
        const torsoWidth = Math.max(1, Math.abs(Number(torso.width) || 1));
        const legLayers = legs
            .map(obj => Number(obj._armatureDrawLayer ?? obj.armatureDrawLayer ?? obj.layer))
            .filter(Number.isFinite);
        const existing = this._getSvgAfricanContinuousGarmentObjects?.(live) || [];
        const manager = this.objects;
        const previousSuppressHistory = manager?._suppressHistory;
        const slotOf = garment => String(
            garment?._svgAfricanGarmentSlot
            || (garment?._ucGarmentPartKey === SVG_AFRICAN_OUTER_COAT_PART_KEY ? 'outer' : 'lower')
        );
        const desiredSlots = new Set(specs.map(spec => String(spec.slotKey || 'lower')));
        const existingBySlot = new Map();
        const garments = [];
        if (manager) manager._suppressHistory = true;
        try {
            existing.forEach(candidate => {
                const slotKey = slotOf(candidate);
                if (!desiredSlots.has(slotKey) || existingBySlot.has(slotKey)) {
                    if (typeof manager?.removeObject === 'function') manager.removeObject(candidate.id);
                    else if (Array.isArray(manager?.objects)) {
                        const index = manager.objects.findIndex(obj => obj?.id === candidate.id);
                        if (index >= 0) manager.objects.splice(index, 1);
                    }
                    return;
                }
                existingBySlot.set(slotKey, candidate);
            });

            specs.forEach((spec, specIndex) => {
                const slotKey = String(spec.slotKey || 'lower');
                const sidePadding = Math.max(0, Number(spec.sidePaddingRatio) || 0);
                const garmentWidth = Math.max(
                    legUnionWidth * (1 + sidePadding * 2),
                    torsoWidth * Math.max(0.5, Number(spec.torsoWidthRatio) || 0.84)
                );
                const garmentHeight = Math.max(18, legHeight * Math.max(0.10, Number(spec.coverageRatio) || 0.54));
                const torsoCenterX = (Number(torso.x) || 0)
                    + (Number(torso.width) || 0) * (0.5 + (Number(spec.centerOffsetRatio) || 0));
                const garmentX = torsoCenterX - garmentWidth * 0.5;
                const garmentY = legTop - legHeight * Math.max(0, Number(spec.topOverlapRatio) || 0);
                const parentAnchorX = 0.5;
                const parentAnchorY = clampRange(Number(spec.parentAnchorY) || 0.84, 0.05, 0.95);
                const anchorWorldX = (Number(torso.x) || 0) + (Number(torso.width) || 0) * parentAnchorX;
                const anchorWorldY = (Number(torso.y) || 0) + (Number(torso.height) || 0) * parentAnchorY;
                const pivotX = clampRange((anchorWorldX - garmentX) / garmentWidth, 0.02, 0.98);
                const pivotY = clampRange((anchorWorldY - garmentY) / garmentHeight, 0.02, 0.98);
                const drawLayer = (legLayers.length ? Math.max(...legLayers) : Number(torso.layer) || 0)
                    + 0.2
                    + specIndex * 0.05;
                let garment = existingBySlot.get(slotKey) || null;

                if (!garment) {
                    if (typeof StageObject === 'undefined' || typeof manager?.addObject !== 'function') return;
                    garment = new StageObject('image', {
                        x: garmentX,
                        y: garmentY,
                        width: garmentWidth,
                        height: garmentHeight,
                        imageSrc: spec.imageSrc,
                        name: getSvgAfricanGarmentName(spec),
                        layer: drawLayer,
                        opacity: 1
                    });
                    manager.addObject(garment);
                }

                garment.type = 'image';
                garment.name = getSvgAfricanGarmentName(spec);
                garment.x = garmentX;
                garment.y = garmentY;
                garment.width = garmentWidth;
                garment.height = garmentHeight;
                garment.pivotX = pivotX;
                garment.pivotY = pivotY;
                garment.rotation = Number(torso.rotation) || 0;
                garment.tiltX = Number(torso.tiltX) || 0;
                garment.tiltY = Number(torso.tiltY) || 0;
                garment.scaleX = 1;
                garment.scaleY = 1;
                garment.opacity = 1;
                garment.fill = 'transparent';
                garment.stroke = 'transparent';
                garment.strokeWidth = 0;
                garment.imageSrc = spec.imageSrc;
                garment.loadImage?.(spec.imageSrc, { preserveDimensions: true });
                garment.joints = [];
                garment.jointContours = false;
                garment.pinContour = false;
                garment.pinSyncJoints = false;
                garment.pinnedTo = torso.id;
                garment.pinTargetType = 'anchor';
                garment.pinAnchorX = parentAnchorX;
                garment.pinAnchorY = parentAnchorY;
                garment.pinOffsetX = 0;
                garment.pinOffsetY = 0;
                garment.pinRotationMode = 'inherit';
                garment.pinInheritRotation = true;
                garment.pinBaseTiltX = 0;
                garment.pinBaseTiltY = 0;
                garment.layer = drawLayer;
                garment.renderZ = drawLayer;
                garment._armatureDrawLayer = drawLayer;
                garment.armatureDrawLayer = drawLayer;
                garment._characterAppearanceProvider = 'svg-african-premium-garment';
                garment._ucGarmentLayer = true;
                garment._ucGarmentRootId = root.id;
                garment._ucGarmentForPartId = torso.id;
                garment._ucGarmentPartKey = spec.roleKey || SVG_AFRICAN_LOWER_GARMENT_PART_KEY;
                garment._ucGarmentRoleKey = spec.roleKey || SVG_AFRICAN_LOWER_GARMENT_PART_KEY;
                garment._ucGarmentVariantKey = root._svgCharacterViewProfileKey || spec.view || 'front';
                garment._svgAfricanGarmentLayer = true;
                garment._svgAfricanGarmentSlot = slotKey;
                garment._svgAfricanGarmentKind = spec.kind;
                garment._svgAfricanGarmentViewFamily = spec.viewFamily || 'front-back-three-quarter';
                garment._svgAfricanGarmentFacing = spec.sideFacing || null;
                garment._svgAfricanGarmentContinuityType = spec.continuityType || 'waist-to-hem';
                garment._svgCharacterInstanceId = instanceId;
                garment._svgCharacterIdentityId = root._svgCharacterIdentityId || config.identityId || null;
                const garmentPolicy = globalThis.ArmatureGarmentPolicies?.applyToObject?.(garment, {
                    ...(spec.garmentPolicy || {}),
                    kind: spec.kind,
                    bottomClothing: spec.bottomClothing,
                    topClothing: spec.topClothing,
                    viewFamily: spec.viewFamily
                });
                if (!garmentPolicy) {
                    const isOuter = slotKey === 'outer';
                    garment._ucGarmentPolicyVersion = spec.garmentPolicy?.version || 2;
                    garment._ucGarmentAdapterId = spec.garmentPolicy?.adapterId || (isOuter ? 'long-coat' : (spec.kind === 'wrapper' ? 'wrapper' : (spec.kind === 'skirt' || spec.kind === 'pleated-skirt' ? 'skirt' : spec.kind)));
                    garment._ucGarmentMotionPolicy = spec.garmentPolicy?.motionPolicy || (isOuter ? 'coat-sway' : (spec.continuityType === 'full-length' ? 'robe-sway' : (spec.kind === 'wrapper' ? 'waist-drape' : 'waist-drape-light')));
                    garment._ucGarmentLayerPolicy = spec.garmentPolicy?.layerPolicy || (isOuter || spec.continuityType === 'full-length' ? 'body-drape' : 'lower-over-legs');
                    garment._ucGarmentDeformationPolicy = spec.garmentPolicy?.deformationPolicy || (isOuter ? 'coat-panel' : (spec.continuityType === 'full-length' ? 'robe-panel' : (spec.viewFamily === 'side' ? 'side-profile-waist-to-hem' : 'waist-to-hem')));
                }
                garments.push(garment);
            });

            if (Array.isArray(manager?.objects) && garments.length) {
                garments.forEach(garment => {
                    const currentIndex = manager.objects.indexOf(garment);
                    if (currentIndex >= 0) manager.objects.splice(currentIndex, 1);
                });
                const legIndexes = legs
                    .map(obj => manager.objects.indexOf(obj))
                    .filter(index => index >= 0);
                const insertIndex = legIndexes.length ? Math.max(...legIndexes) + 1 : manager.objects.length;
                manager.objects.splice(insertIndex, 0, ...garments);
            }
        } finally {
            if (manager) manager._suppressHistory = previousSuppressHistory;
        }

        root._svgAfricanGarmentIds = garments.map(garment => garment.id).filter(Boolean);
        this.objects?._resolvePins?.();
        if (options.updateObjectList !== false) manager?.updateObjectList?.();
        if (options.updateProperties !== false) manager?.updateProperties?.();
        if (options.render !== false) this.stage?.requestRender?.();
        return garments[0] || null;
    };

    JointSystem.prototype.captureSvgAfricanPremiumCalibration = function(armature = null) {
        const live = this._resolveSvgAfricanArmature?.(armature);
        const root = live?.root;
        if (!root || root._characterAppearanceProvider !== 'svg-african-premium') return null;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        const assetId = root._svgCharacterPremiumAssetId || root._svgAfricanPremiumAssetId || root._svgCharacterConfig?.assetCharacterId || PremiumAssets?.getDefaultAssetId?.();
        const baseManifest = PremiumAssets?.getAssetManifest?.(assetId) || root._svgAfricanAssetManifest || null;
        const currentParts = {};
        const currentJoints = {};
        const currentPins = {};
        const orderedParts = Object.entries(live.parts || {})
            .map(([partKey, part]) => {
                const obj = part?.obj || part?.raw;
                const key = readPremiumPartKey(obj, partKey);
                return obj ? { partKey: key, obj } : null;
            })
            .filter(Boolean)
            .sort((a, b) => (Number(a.obj.layer) || 0) - (Number(b.obj.layer) || 0));

        orderedParts.forEach(({ partKey, obj }) => {
            const calibration = readPremiumPartCalibration(obj, partKey);
            if (!calibration) return;
            currentParts[partKey] = {
                x: calibration.x,
                y: calibration.y,
                width: calibration.width,
                height: calibration.height,
                pivotX: calibration.pivotX,
                pivotY: calibration.pivotY,
                rotation: calibration.rotation,
                tiltX: calibration.tiltX,
                tiltY: calibration.tiltY,
                scaleX: calibration.scaleX,
                scaleY: calibration.scaleY,
                layer: calibration.layer,
                renderZ: calibration.renderZ
            };
            currentJoints[partKey] = calibration.joints;
            if (calibration.pin) currentPins[partKey] = calibration.pin;
        });

        return {
            kind: 'svg-african-premium-calibration',
            version: root._svgAfricanCalibrationVersion || baseManifest?.calibrationVersion || 1,
            assetId,
            assetProfile: root._svgAfricanAssetProfile || baseManifest?.assetProfile || 'front-six-part-premium',
            sourcePath: root._svgAfricanSourcePath || baseManifest?.sourcePath || null,
            masterFile: root._svgAfricanMasterFile || baseManifest?.masterFile || null,
            identityId: root._svgCharacterIdentityId || root._svgCharacterConfig?.identityId || null,
            instanceId: root._svgCharacterInstanceId || null,
            view: root._svgCharacterViewProfileKey || baseManifest?.view || 'front',
            engine: root._svgCharacterEngine || baseManifest?.engine || 'svg-armature-premium',
            baseManifest: clone(baseManifest),
            adjustments: clone(root._svgAfricanAdjustments || root._svgCharacterConfig?.premiumAdjustments || {}),
            faceState: clone(root._svgAfricanFaceState || root._svgCharacterConfig?._svgAfricanFaceState || {}),
            facePreset: root._svgAfricanFacePreset || root._svgCharacterConfig?._svgAfricanFacePreset || root._svgCharacterConfig?.facePreset || '',
            current: {
                order: orderedParts.map(entry => entry.partKey),
                parts: currentParts,
                joints: currentJoints,
                pins: currentPins
            }
        };
    };

    JointSystem.prototype.applySvgAfricanPremiumCalibration = function(armature = null, calibrationInput = null, options = {}) {
        if (calibrationInput == null && (typeof armature === 'string' || armature?.kind === 'svg-african-premium-calibration')) {
            calibrationInput = armature;
            armature = null;
        }

        let payload = calibrationInput;
        if (typeof payload === 'string') {
            try {
                payload = JSON.parse(payload);
            } catch (err) {
                console.warn('[SVG African Character] Could not parse premium calibration JSON:', err);
                return false;
            }
        }
        if (!payload || payload.kind !== 'svg-african-premium-calibration') return false;

        const live = this._resolveSvgAfricanArmature?.(armature);
        const root = live?.root;
        if (!root || root._characterAppearanceProvider !== 'svg-african-premium') return false;

        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!PremiumAssets?.get || !PremiumAssets?.renderPartDataUrl) return false;
        const assetId = payload.assetId || root._svgCharacterPremiumAssetId || root._svgAfricanPremiumAssetId || root._svgCharacterConfig?.assetCharacterId || PremiumAssets.getDefaultAssetId?.();
        const asset = PremiumAssets.get(assetId);
        if (!asset?.parts) return false;
        const calibrationView = String(asset.view || payload.view || 'front');
        const isSidePremiumAsset = /^side-/.test(calibrationView);
        const projectionMode = getThreeQuarterProjectionMode(asset);
        const isAuthoredThreeQuarter = isAuthoredThreeQuarterAsset(asset);

        const partProfiles = getCalibrationParts(payload);
        const jointProfiles = getCalibrationJoints(payload);
        const pinProfiles = getCalibrationPins(payload);
        const order = getCalibrationOrder(payload);
        const sourceTorso = partProfiles.torso || payload.baseManifest?.parts?.torso || asset.parts.torso;
        const liveTorso = live.parts?.torso?.obj || root;
        if (!sourceTorso || !liveTorso) return false;

        const preserveStagePosition = options.preserveStagePosition !== false;
        const applyPose = options.applyPose !== false;
        const sourceTorsoHeight = Math.max(1, Math.abs(finiteOr(sourceTorso.height, asset.parts.torso?.height || liveTorso.height || 1)));
        const liveTorsoHeight = Math.max(1, Math.abs(finiteOr(liveTorso.height, sourceTorsoHeight)));
        const scale = preserveStagePosition
            ? Math.max(0.1, liveTorsoHeight / sourceTorsoHeight)
            : Math.max(0.1, finiteOr(options.scale, 1));
        const targetLeftX = finiteOr(liveTorso.x, 0);
        const targetTopY = finiteOr(liveTorso.y, 0);
        const sourceTopY = finiteOr(sourceTorso.y, 0);
        const originX = preserveStagePosition ? targetLeftX - finiteOr(sourceTorso.x, 0) * scale : 0;
        const originY = preserveStagePosition ? targetTopY - sourceTopY * scale : 0;
        const previousConfig = root._svgCharacterConfig || {};
        const nextAdjustmentsRaw = {
            ...(previousConfig.premiumAdjustments || root._svgAfricanAdjustments || {}),
            ...(payload.adjustments || {})
        };
        const nextFaceStateRaw = {
            ...(previousConfig._svgAfricanFaceState || root._svgAfricanFaceState || {}),
            ...(payload.faceState || {})
        };
        const nextAdjustments = PremiumAssets.getAdjustments?.({ ...previousConfig, premiumAdjustments: nextAdjustmentsRaw }) || nextAdjustmentsRaw;
        const nextFaceState = PremiumAssets.getFaceState?.({ ...previousConfig, _svgAfricanFaceState: nextFaceStateRaw }, nextFaceStateRaw) || nextFaceStateRaw;
        const assetManifest = PremiumAssets.getAssetManifest?.(asset.id) || payload.baseManifest || null;
        const SvgUtils = globalThis.SvgCharacterUtils;
        const instanceId = root._svgCharacterInstanceId || SvgUtils?.makeInstanceId?.('svgaf') || `svgaf-${Date.now().toString(36)}`;
        const config = {
            ...previousConfig,
            engine: asset.engine || 'svg-armature-premium',
            assetCharacterId: asset.id,
            view: calibrationView,
            sideFacing: /-(left|right)$/.test(calibrationView)
                ? (calibrationView.endsWith('left') ? 'left' : 'right')
                : (previousConfig.sideFacing || previousConfig.styling?.sideFacing || 'right'),
            premiumAdjustments: clone(nextAdjustments),
            _svgAfricanFaceState: clone(nextFaceState),
            _svgAfricanFacePreset: payload.facePreset || previousConfig._svgAfricanFacePreset || previousConfig.facePreset || '',
            facePreset: payload.facePreset || previousConfig._svgAfricanFacePreset || previousConfig.facePreset || '',
            identityId: previousConfig.identityId || root._svgCharacterIdentityId || payload.identityId || null,
            identity: clone(previousConfig.identity || root._svgCharacterIdentity || {}),
            styling: {
                ...(previousConfig.styling || root._svgCharacterStyling || {}),
                view: calibrationView,
                sideFacing: /-(left|right)$/.test(calibrationView)
                    ? (calibrationView.endsWith('left') ? 'left' : 'right')
                    : (previousConfig.styling?.sideFacing || previousConfig.sideFacing || 'right')
            }
        };
        root._svgCharacterInstanceId = instanceId;
        root._svgCharacterConfig = clone(config);
        root._svgCharacterIdentityId = config.identityId;
        root._svgCharacterIdentity = clone(config.identity);
        root._svgCharacterStyling = clone(config.styling);
        root._characterAppearanceProvider = 'svg-african-premium';
        root._svgCharacter = true;
        root._svgCharacterEngine = asset.engine || 'svg-armature-premium';
        root._svgCharacterPremiumAssetId = asset.id;
        root._svgAfricanPremiumAssetId = asset.id;
        root._svgAfricanAssetProfile = payload.assetProfile || asset.assetProfile || 'front-six-part-premium';
        root._svgAfricanSourcePath = payload.sourcePath || asset.sourcePath || null;
        root._svgAfricanMasterFile = payload.masterFile || asset.masterFile || null;
        root._svgAfricanAssetManifest = clone(assetManifest);
        root._svgAfricanCalibration = clone(payload);
        root._svgAfricanCalibrationVersion = payload.version || asset.calibrationVersion || 1;
        root._svgAfricanAdjustments = clone(nextAdjustments);
        root._svgAfricanFaceState = clone(nextFaceState);
        root._svgAfricanFacePreset = config._svgAfricanFacePreset || '';
        root._svgAfricanPremiumBaseScale = scale;
        root._svgCharacterViewProfileKey = calibrationView;
        root._svgCharacterProjectionMode = projectionMode;
        if (isSidePremiumAsset) {
            const side = calibrationView.endsWith('left') ? 'left' : 'right';
            root._armatureFacingSide = side;
            root.armatureFacingSide = side;
            root._armatureVisualFacingSide = side;
            root.armatureVisualFacingSide = side;
            root._armatureFacingExplicit = true;
        } else {
            const facing = calibrationView.startsWith('back') ? 'back' : 'front';
            root._armatureFrontBackFacing = facing;
            root.armatureFrontBackFacing = facing;
        }
        root._normalizedDownBaseline = true;

        let appliedParts = 0;
        Object.entries(live.parts || {}).forEach(([fallbackKey, part]) => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            const partKey = readPremiumPartKey(obj, fallbackKey);
            const profile = partProfiles[partKey] || PremiumAssets.getPartProfile?.(asset.id, partKey, nextAdjustments) || asset.parts?.[partKey];
            if (!profile) return;
            if (typeof this._storeArmatureAppearanceBackup === 'function') {
                this._storeArmatureAppearanceBackup(obj);
            }

            const width = Math.max(8, Math.round(Math.abs(finiteOr(profile.width, obj.width || 8)) * scale));
            const height = Math.max(8, Math.round(Math.abs(finiteOr(profile.height, obj.height || 8)) * scale));
            obj.type = 'image';
            obj.x = Math.round(originX + finiteOr(profile.x, obj.x || 0) * scale);
            obj.y = Math.round(originY + finiteOr(profile.y, obj.y || 0) * scale);
            obj.width = width;
            obj.height = height;
            obj.pivotX = Number.isFinite(Number(profile.pivotX)) ? Number(profile.pivotX) : (obj.pivotX ?? 0.5);
            obj.pivotY = Number.isFinite(Number(profile.pivotY)) ? Number(profile.pivotY) : (obj.pivotY ?? 0.5);
            if (applyPose) {
                obj.rotation = finiteOr(profile.rotation, obj.rotation || 0);
                obj.tiltX = finiteOr(profile.tiltX, obj.tiltX || 0);
                obj.tiltY = finiteOr(profile.tiltY, obj.tiltY || 0);
                obj.scaleX = finiteOr(profile.scaleX, obj.scaleX ?? 1);
                obj.scaleY = finiteOr(profile.scaleY, obj.scaleY ?? 1);
            }
            obj.fillType = 'solid';
            obj.fill = 'transparent';
            obj.stroke = 'transparent';
            obj.strokeWidth = 0;
            obj.pathPoints = [];
            obj.closedPath = true;
            obj.textureImageSrc = null;
            obj.textureImageElement = null;
            obj._textureImagePromise = null;
            obj.pictureFillMode = 'stretch';
            obj.pictureFillRotation = 0;
            obj.imageZoom = 1;
            obj.imagePanX = 0;
            obj.imagePanY = 0;
            obj.opacity = 1;
            obj._characterAppearanceProvider = 'svg-african-premium';
            obj._svgCharacter = true;
            obj._svgCharacterPart = true;
            obj._svgCharacterPremiumPart = true;
            obj._svgCharacterPremiumAssetId = asset.id;
            obj._svgAfricanPremiumAssetId = asset.id;
            obj._svgAfricanAdjustments = clone(nextAdjustments);
            if (partKey === 'head-neck' || partKey === 'torso') {
                obj._svgAfricanFaceState = clone(nextFaceState);
            } else {
                obj._svgAfricanFaceState = undefined;
            }
            obj._svgAfricanFacePreset = config._svgAfricanFacePreset || '';
            obj._svgCharacterConfig = clone(config);
            obj._svgCharacterIdentity = clone(config.identity);
            obj._svgCharacterStyling = clone(config.styling);
            obj._svgCharacterInstanceId = instanceId;
            obj._svgCharacterIdentityId = config.identityId;
            obj._svgCharacterPartKey = partKey;
            obj._svgCharacterPremiumPartKey = partKey;
            obj._svgAfricanAssetProfile = root._svgAfricanAssetProfile;
            obj._svgCharacterProjectionMode = projectionMode;
            obj._svgAfricanSourcePath = root._svgAfricanSourcePath;
            obj._svgAfricanMasterFile = root._svgAfricanMasterFile;
            obj._svgAfricanSourceFile = asset.partFiles?.[partKey] || assetManifest?.partFiles?.[partKey] || null;
            obj._svgAfricanPartProfile = clone(profile);
            obj._svgAfricanJointProfile = clone(jointProfiles[partKey] || asset.joints?.[partKey] || {});
            obj._svgAfricanPinProfile = clone(pinProfiles[partKey] || asset.pins?.[partKey] || {});
            obj._svgAfricanCalibrationVersion = root._svgAfricanCalibrationVersion;
            applyPremiumJointCalibration(obj, jointProfiles[partKey] || asset.joints?.[partKey] || {}, { applyPose });
            if (partKey === 'head-neck') {
                suppressPremiumHeadNeckContours(obj);
            }
            obj.bodyPartData = {
                ...(obj.bodyPartData || {}),
                partKey,
                charType: isSidePremiumAsset ? 'human-side-dual' : 'human-front'
            };
            const imageSrc = PremiumAssets.renderPartDataUrl(asset.id, partKey, config, instanceId, {
                faceState: partKey === 'head-neck' ? nextFaceState : null,
                adjustments: nextAdjustments
            });
            this._applySvgAfricanAppearanceToPart(obj, imageSrc, options);
            if (Number.isFinite(Number(profile.layer))) obj.layer = Number(profile.layer);
            if (Number.isFinite(Number(profile.renderZ))) obj.renderZ = Number(profile.renderZ);
            appliedParts += 1;
        });

        Object.entries(pinProfiles || {}).forEach(([partKey, pin]) => {
            const obj = live.parts?.[partKey]?.obj || live.parts?.[partKey]?.raw;
            if (!obj || partKey === 'torso') return;
            applyPremiumPinCalibration(this, obj, liveTorso, pin, scale);
        });

        if (Array.isArray(order) && order.length) {
            order.forEach((partKey, index) => {
                const obj = live.parts?.[partKey]?.obj || live.parts?.[partKey]?.raw;
                if (!obj) return;
                obj.layer = index;
                obj.renderZ = index;
                obj._armatureDrawLayer = index;
                obj.armatureDrawLayer = index;
            });
        }

        root._svgAfricanFaceState = clone(nextFaceState);
        root._svgAfricanAdjustments = clone(nextAdjustments);
        if (!isSidePremiumAsset && calibrationView.includes('3q') && typeof this._setArmatureFrontBackThreeQuarterState === 'function') {
            const facing = calibrationView.startsWith('back') ? 'back' : 'front';
            const lean = calibrationView.endsWith('-left') ? 'left' : 'right';
            this._setArmatureFrontBackThreeQuarterState(live, facing, lean, {
                applyBaselineTilt: !isAuthoredThreeQuarter,
                applyPinLayout: !isAuthoredThreeQuarter,
                syncLayers: !isAuthoredThreeQuarter
            });
            root._svgCharacterViewProfileKey = calibrationView;
        }
        suppressPremiumHeadNeckContours(live.parts?.['head-neck']?.obj);
        this.objects?._resolvePins?.();
        if (isSidePremiumAsset && typeof this._syncArmatureVisualLayerOrder === 'function') {
            this._syncArmatureVisualLayerOrder(
                live,
                calibrationView.endsWith('-left') ? 'left' : 'right',
                order
            );
        }
        this._syncSvgAfricanContinuousGarment?.(live, {
            asset,
            config,
            updateObjectList: false,
            updateProperties: false,
            render: false
        });
        this._captureArmatureStageBasePosition?.(live);
        if (options.updateObjectList !== false) this.objects?.updateObjectList?.();
        if (options.updateProperties !== false) this.objects?.updateProperties?.();
        if (options.render !== false) this.stage?.requestRender?.();
        emit('objects:updated');
        if (options.pushHistory !== false) emit('history:push');
        this._currentArmature = live;
        return { appliedParts, assetId: asset.id, scale };
    };

    JointSystem.prototype._placeSvgAfricanArmatureAt = function(armature, placement = null) {
        const requestedX = Number(placement?.stageX ?? placement?.x);
        const requestedY = Number(placement?.stageY ?? placement?.y);
        if (!Number.isFinite(requestedX) && !Number.isFinite(requestedY)) return null;

        const coreObjects = (typeof this._getArmatureObjects === 'function'
            ? this._getArmatureObjects(armature)
            : [armature?.root, ...Object.values(armature?.parts || {}).map(part => part?.obj)]
        ).filter(Boolean);
        const garmentIds = new Set(armature?.root?._svgAfricanGarmentIds || []);
        const garmentObjects = (this.objects?.objects || []).filter(obj => (
            garmentIds.has(obj?.id)
            || obj?._ucGarmentRootId === armature?.root?.id
        ));
        const objects = [...new Map(
            [...coreObjects, ...garmentObjects]
                .filter(obj => obj?.id)
                .map(obj => [obj.id, obj])
        ).values()];
        const visible = objects.filter(obj => (
            obj.visible !== false
            && Number.isFinite(Number(obj.x))
            && Number.isFinite(Number(obj.y))
            && Number.isFinite(Number(obj.width))
            && Number.isFinite(Number(obj.height))
        ));
        if (!visible.length) return null;

        const left = Math.min(...visible.map(obj => Math.min(Number(obj.x), Number(obj.x) + Number(obj.width))));
        const top = Math.min(...visible.map(obj => Math.min(Number(obj.y), Number(obj.y) + Number(obj.height))));
        const right = Math.max(...visible.map(obj => Math.max(Number(obj.x), Number(obj.x) + Number(obj.width))));
        const bottom = Math.max(...visible.map(obj => Math.max(Number(obj.y), Number(obj.y) + Number(obj.height))));
        const width = Math.max(1, right - left);
        const height = Math.max(1, bottom - top);
        const currentCenterX = left + width * 0.5;
        const currentCenterY = top + height * 0.5;
        const stageWidth = Number(this.stage?.width) > 0
            ? Number(this.stage.width)
            : Number(this.stage?.canvas?.width);
        const stageHeight = Number(this.stage?.height) > 0
            ? Number(this.stage.height)
            : Number(this.stage?.canvas?.height);
        const margin = 12;
        const clampCenter = (value, span, limit) => {
            if (!Number.isFinite(value) || !Number.isFinite(limit) || limit <= 0) return value;
            if (span + margin * 2 >= limit) return limit * 0.5;
            return Math.max(margin + span * 0.5, Math.min(limit - margin - span * 0.5, value));
        };
        const targetCenterX = Number.isFinite(requestedX)
            ? clampCenter(requestedX, width, stageWidth)
            : currentCenterX;
        const targetCenterY = Number.isFinite(requestedY)
            ? clampCenter(requestedY, height, stageHeight)
            : currentCenterY;
        const deltaX = targetCenterX - currentCenterX;
        const deltaY = targetCenterY - currentCenterY;

        objects.forEach(obj => {
            if (Number.isFinite(Number(obj.x))) obj.x = Number(obj.x) + deltaX;
            if (Number.isFinite(Number(obj.y))) obj.y = Number(obj.y) + deltaY;
        });
        this.objects?._resolvePins?.();
        return { x: targetCenterX, y: targetCenterY, deltaX, deltaY, width, height };
    };

    JointSystem.prototype.createSvgAfricanCharacter = function(inputConfig = {}, options = {}) {
        const Catalog = globalThis.SvgAfricanCharacterCatalog;
        const Renderer = globalThis.SvgAfricanCharacterRenderer;
        const SvgUtils = globalThis.SvgCharacterUtils;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!Catalog || !SvgUtils || (!Renderer && !PremiumAssets)) {
            console.error('[SVG African Character] Required modules are not loaded.');
            return null;
        }

        const config = Catalog.normalizeConfig(inputConfig);
        const premiumAsset = getSvgAfricanPremiumAssetForConfig(config);
        if (!Renderer && !premiumAsset) {
            console.error('[SVG African Character] Renderer module is not loaded.');
            return null;
        }
        if (premiumAsset) {
            if (PremiumAssets.normalizePremiumConfig) {
                Object.assign(config, PremiumAssets.normalizePremiumConfig(premiumAsset, config));
            }
            config.engine = premiumAsset.engine || 'svg-armature-premium';
            config.assetCharacterId = premiumAsset.configAssetId || premiumAsset.id;
            config.view = premiumAsset.view || config.styling?.view || config.view || 'front';
            config.sideFacing = config.styling?.sideFacing || config.sideFacing || 'right';
            config._svgAfricanFaceState = PremiumAssets.getFaceState?.(config) || config._svgAfricanFaceState || {};
            config.styling = { ...(config.styling || {}), view: config.view, sideFacing: config.sideFacing };
        }
        const instanceId = SvgUtils.makeInstanceId('svgaf');
        const requestedView = String(config.view || 'front');
        const profile = JointSystem._getArmatureViewProfile?.(requestedView, {
            facing: config.sideFacing,
            sideFacing: config.sideFacing
        });
        const profileKey = profile?.key || JointSystem._normalizeArmatureViewProfileKey?.(requestedView) || requestedView;
        const isSide = /^side-/.test(profileKey) || profile?.family === 'side';
        const projectionMode = getThreeQuarterProjectionMode(premiumAsset);
        const isAuthoredThreeQuarter = isAuthoredThreeQuarterAsset(premiumAsset);

        if (isSide) {
            if (typeof this.createSideDualArmPoseArmatureDummy !== 'function') {
                console.error('[SVG African Character] Side-dual armature constructor is unavailable.');
                return null;
            }
            this.createSideDualArmPoseArmatureDummy({
                ignoreSelectionReference: options.ignoreSelectionReference === true
            });
        } else {
            if (typeof this.createFrontPoseArmatureDummy !== 'function') {
                console.error('[SVG African Character] Front armature constructor is unavailable.');
                return null;
            }
            this.createFrontPoseArmatureDummy({
                ignoreSelectionReference: options.ignoreSelectionReference === true
            });
        }

        let armature = this._detectSelectedArmature?.() || this._detectArmature?.() || this._currentArmature;
        if (!armature?.root) {
            console.error('[SVG African Character] Armature creation/detection failed.');
            return null;
        }

        const root = armature.root;
        root.name = config.name || 'SVG African Character';
        root._characterAppearanceProvider = premiumAsset ? 'svg-african-premium' : 'svg-african';
        root._svgCharacter = true;
        root._svgCharacterVersion = 1;
        root._svgCharacterEngine = premiumAsset ? (premiumAsset.engine || 'svg-armature-premium') : config.engine;
        root._svgCharacterPremiumAssetId = premiumAsset?.id || null;
        root._svgCharacterInstanceId = instanceId;
        root._svgCharacterIdentityId = config.identityId;
        root._svgCharacterConfig = clone(config);
        root._svgCharacterIdentity = clone(config.identity);
        root._svgCharacterStyling = clone(config.styling);
        root._svgCharacterViewProfileKey = profileKey;
        root._svgCharacterProjectionMode = projectionMode;
        root._svgAfricanAdjustments = premiumAsset ? clone(config.premiumAdjustments || {}) : null;
        root._svgAfricanFaceState = premiumAsset ? clone(config._svgAfricanFaceState || {}) : null;
        root._svgAfricanFacePreset = premiumAsset ? (config._svgAfricanFacePreset || config.facePreset || '') : null;

        if (isSide) {
            const side = profileKey.endsWith('-left') ? 'left' : 'right';
            root._armatureFacingSide = side;
            root.armatureFacingSide = side;
            root._armatureVisualFacingSide = side;
            root.armatureVisualFacingSide = side;
            root._armatureFacingExplicit = true;
        } else {
            const facing = profileKey.startsWith('back') ? 'back' : 'front';
            root._armatureFrontBackFacing = facing;
            root.armatureFrontBackFacing = facing;
        }

        if (premiumAsset) {
            this._applySvgAfricanPremiumAssetGeometry?.(armature, { config, asset: premiumAsset });
        } else {
            this._applySvgAfricanCarrierGeometry?.(armature, { config, reapplyTexture: false });
        }

        Object.entries(armature.parts || {}).forEach(([partKey, part]) => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            const imageSrc = premiumAsset
                ? PremiumAssets.renderPartDataUrl(premiumAsset.id, partKey, config, instanceId, {
                    faceState: partKey === 'head-neck' ? config._svgAfricanFaceState : null
                })
                : Renderer.renderPartDataUrl(partKey, config, instanceId);
            this._applySvgAfricanAppearanceToPart(obj, imageSrc, options);
            obj._characterAppearanceProvider = premiumAsset ? 'svg-african-premium' : 'svg-african';
            obj._svgCharacterPart = true;
            obj._svgCharacterPremiumPart = premiumAsset ? true : undefined;
            obj._svgCharacterPremiumAssetId = premiumAsset?.id || undefined;
            obj._svgAfricanPremiumAssetId = premiumAsset?.id || undefined;
            obj._svgAfricanAdjustments = premiumAsset ? clone(config.premiumAdjustments || {}) : undefined;
            obj._svgAfricanFaceState = premiumAsset && partKey === 'head-neck' ? clone(config._svgAfricanFaceState || {}) : undefined;
            obj._svgAfricanFacePreset = premiumAsset ? (config._svgAfricanFacePreset || config.facePreset || '') : undefined;
            obj._svgCharacterConfig = clone(config);
            obj._svgCharacterIdentity = clone(config.identity);
            obj._svgCharacterStyling = clone(config.styling);
            obj._svgCharacterInstanceId = instanceId;
            obj._svgCharacterIdentityId = config.identityId;
            obj._svgCharacterPartKey = partKey;
            obj._svgCharacterPremiumPartKey = premiumAsset ? partKey : undefined;
            obj._svgCharacterViewProfileKey = profileKey;
            obj._svgCharacterProjectionMode = projectionMode;
            if (isSide && (!config._realisticCharacter || config._realisticCharacter.mode === 'hybrid') && /^(front|back)-(arm|leg)$/.test(partKey)) {
                obj.jointContours = true;
                obj.contourSize = 1;
                obj.joints?.forEach(joint => {
                    joint.contourSize = /(?:^|-)(elbow|knee)$/.test(joint.name) ? 1 : 0;
                });
            }
            if (premiumAsset) {
                obj._armatureRoleKey = partKey;
                obj.armatureRoleKey = partKey;
                obj._armaturePartKey = partKey;
                obj.armaturePartKey = partKey;
            }
            obj.bodyPartData = {
                ...(obj.bodyPartData || {}),
                partKey,
                charType: isSide ? 'human-side-dual' : 'human-front'
            };
            if (partKey === 'head-neck') {
                StageObject.normalizeSvgAfricanHeadNeckRig?.(obj, {
                    force: true,
                    view: profileKey,
                    ...(premiumAsset?.joints?.[partKey]?.neck?.position != null
                        ? { position: premiumAsset.joints[partKey].neck.position }
                        : {})
                });
            }
        });

        if (!isSide) {
            const facing = profileKey.startsWith('back') ? 'back' : 'front';
            if (facing === 'back' && !isAuthoredThreeQuarter && typeof this._applyArmatureFrontBackChoice === 'function') {
                armature = this._applyArmatureFrontBackChoice(armature, 'back', {
                    pushHistory: false,
                    toast: false,
                    rebuildPanel: false,
                    restoreSavedPose: false
                }) || armature;
            }

            if (profileKey.includes('3q')) {
                const lean = profileKey.endsWith('-left') ? 'left' : 'right';
                if (typeof this._setArmatureFrontBackThreeQuarterState === 'function') {
                    armature = this._setArmatureFrontBackThreeQuarterState(armature, facing, lean, {
                        applyBaselineTilt: !isAuthoredThreeQuarter,
                        applyPinLayout: !isAuthoredThreeQuarter,
                        syncLayers: !isAuthoredThreeQuarter
                    }) || armature;
                }
            }
        }

        this.objects?._resolvePins?.();
        if (isSide && premiumAsset && typeof this._syncArmatureVisualLayerOrder === 'function') {
            this._syncArmatureVisualLayerOrder(
                armature,
                profileKey.endsWith('-left') ? 'left' : 'right',
                premiumAsset.order
            );
        }
        this._syncSvgAfricanContinuousGarment?.(armature, {
            asset: premiumAsset,
            config,
            updateObjectList: false,
            updateProperties: false,
            render: false
        });
        this._placeSvgAfricanArmatureAt?.(armature, options.placement);
        this._captureArmatureStageBasePosition?.(armature);
        this.objects?.select?.(Object.values(armature.parts || {}).map(part => part?.obj?.id).filter(Boolean));
        this.objects?.updateObjectList?.();
        this.objects?.updateProperties?.();
        this.stage?.requestRender?.();
        emit('history:push');
        this._currentArmature = armature;
        return armature;
    };

    JointSystem.prototype.updateSvgAfricanCharacterAppearance = function(armature, changes = {}, options = {}) {
        let live = this._resolveSvgAfricanArmature?.(armature);
        if (!live?.root?._svgCharacter) return false;
        const Catalog = globalThis.SvgAfricanCharacterCatalog;
        const Renderer = globalThis.SvgAfricanCharacterRenderer;
        const PremiumAssets = globalThis.SvgAfricanPremiumAssets;
        if (!Catalog || (!Renderer && !PremiumAssets)) return false;

        const previous = live.root._svgCharacterConfig || {};
        const split = splitConfigChanges(changes);
        const previousIdentity = previous.identity || live.root._svgCharacterIdentity || {};
        const previousStyling = previous.styling || live.root._svgCharacterStyling || {};
        const requestedPresetId = changes.preset || previous.preset || '';
        const explicitPremiumRequest = !!(
            changes.assetCharacterId
            || changes.engine === 'svg-armature-premium'
            || /-premium$/.test(String(changes.preset || ''))
        );
        const preserveBasicRenderer = explicitPremiumRequest
            ? false
            : (changes.useBasicSvg === true || previous.useBasicSvg === true || live.root._characterAppearanceProvider === 'svg-african');
        const hasFacePresetChange = Object.prototype.hasOwnProperty.call(changes, '_svgAfricanFacePreset')
            || Object.prototype.hasOwnProperty.call(changes, 'facePreset');
        const nextFacePreset = hasFacePresetChange
            ? (changes._svgAfricanFacePreset ?? changes.facePreset ?? '')
            : (previous._svgAfricanFacePreset || previous.facePreset || live.root._svgAfricanFacePreset || '');
        const config = Catalog.normalizeConfig({
            engine: changes.engine || previous.engine || live.root._svgCharacterEngine || undefined,
            assetCharacterId: changes.assetCharacterId || previous.assetCharacterId || live.root._svgCharacterPremiumAssetId || undefined,
            name: changes.name || previous.name,
            _photoCharacter: changes._photoCharacter === null ? null : (changes._photoCharacter || previous._photoCharacter),
            _realisticCharacter: changes._realisticCharacter === null ? null : (changes._realisticCharacter || previous._realisticCharacter),
            preset: requestedPresetId,
            useBasicSvg: preserveBasicRenderer,
            preferBasicSvg: preserveBasicRenderer,
            disablePremiumPresetUpgrade: preserveBasicRenderer,
            premiumAdjustments: {
                ...(previous.premiumAdjustments || live.root._svgAfricanAdjustments || {}),
                ...(changes.premiumAdjustments || changes._svgAfricanAdjustments || {})
            },
            _svgAfricanFaceState: {
                ...(previous._svgAfricanFaceState || live.root._svgAfricanFaceState || {}),
                ...(changes._svgAfricanFaceState || changes.faceState || {})
            },
            _svgAfricanFacePreset: nextFacePreset,
            facePreset: nextFacePreset,
            identity: {
                ...previousIdentity,
                ...split.identity,
                identityId: changes.identityId || split.identity.identityId || previous.identityId || live.root._svgCharacterIdentityId
            },
            styling: {
                ...previousStyling,
                ...split.styling
            },
            identityId: changes.identityId || previous.identityId || live.root._svgCharacterIdentityId
        });
        const previousPremiumAssetId = live.root._svgCharacterPremiumAssetId || previous.assetCharacterId || null;
        let premiumAsset = getSvgAfricanPremiumAssetForConfig(config);
        if (!premiumAsset && previousPremiumAssetId && live.root._characterAppearanceProvider === 'svg-african-premium') {
            premiumAsset = PremiumAssets?.get?.(previousPremiumAssetId) || null;
            if (premiumAsset) {
                if (PremiumAssets.normalizePremiumConfig) {
                    Object.assign(config, PremiumAssets.normalizePremiumConfig(premiumAsset, config));
                }
                config.engine = premiumAsset.engine || 'svg-armature-premium';
                config.assetCharacterId = premiumAsset.configAssetId || premiumAsset.id;
                config.view = premiumAsset.view || config.styling?.view || config.view || 'front';
                config.sideFacing = config.styling?.sideFacing || config.sideFacing || 'right';
                config._svgAfricanFaceState = PremiumAssets.getFaceState?.(config) || config._svgAfricanFaceState || {};
                config.styling = { ...(config.styling || {}), view: config.view, sideFacing: config.sideFacing };
            }
        }
        if (premiumAsset) {
            if (PremiumAssets.normalizePremiumConfig) {
                Object.assign(config, PremiumAssets.normalizePremiumConfig(premiumAsset, config));
            }
            config._svgAfricanFaceState = PremiumAssets.getFaceState?.(config) || config._svgAfricanFaceState || {};
        }

        const requestedView = String(config.view || config.styling?.view || 'front');
        const profile = JointSystem._getArmatureViewProfile?.(requestedView, {
            facing: config.sideFacing,
            sideFacing: config.sideFacing
        });
        const profileKey = profile?.key || JointSystem._normalizeArmatureViewProfileKey?.(requestedView) || requestedView;
        const isRequestedSide = /^side-/.test(profileKey);
        const projectionMode = getThreeQuarterProjectionMode(premiumAsset);
        const isAuthoredThreeQuarter = isAuthoredThreeQuarterAsset(premiumAsset);
        const liveIsSide = !!(live.parts?.['front-arm'] || live.parts?.['back-arm'] || live.parts?.['front-leg'] || live.parts?.['back-leg']);
        if (premiumAsset && isRequestedSide !== liveIsSide) {
            console.warn('[SVG African Character] Side and front/back/3/4 artwork use separate armature structures. Create the requested view as a separate character.');
            if (typeof Utils !== 'undefined') {
                Utils.showToast?.('Side views use a separate SVG armature. Create a new side-view character instead of changing this one.', 'info');
            }
            return false;
        }
        if (isRequestedSide) {
            const side = profileKey.endsWith('-left') ? 'left' : 'right';
            live.root._armatureFacingSide = side;
            live.root.armatureFacingSide = side;
            live.root._armatureVisualFacingSide = side;
            live.root.armatureVisualFacingSide = side;
            live.root._armatureFacingExplicit = true;
            live.root._svgCharacterViewProfileKey = profileKey;
        } else {
            const facing = profileKey.startsWith('back') ? 'back' : 'front';
            if (!isAuthoredThreeQuarter && typeof this._applyArmatureFrontBackChoice === 'function' && live.root._armatureFrontBackFacing !== facing) {
                this._applyArmatureFrontBackChoice(live, facing, {
                    pushHistory: false,
                    toast: false,
                    rebuildPanel: false,
                    restoreSavedPose: false
                });
            } else {
                live.root._armatureFrontBackFacing = facing;
                live.root.armatureFrontBackFacing = facing;
            }
            live.root._svgCharacterViewProfileKey = profileKey;
        }

        live.root._svgCharacterConfig = clone(config);
        live.root._characterAppearanceProvider = premiumAsset ? 'svg-african-premium' : 'svg-african';
        live.root._svgCharacterEngine = premiumAsset ? (premiumAsset.engine || 'svg-armature-premium') : config.engine;
        live.root._svgCharacterPremiumAssetId = premiumAsset?.id || null;
        live.root._svgCharacterIdentityId = config.identityId;
        live.root._svgCharacterIdentity = clone(config.identity);
        live.root._svgCharacterStyling = clone(config.styling);
        live.root._svgCharacterProjectionMode = projectionMode;
        live.root._svgAfricanAdjustments = premiumAsset ? clone(config.premiumAdjustments || {}) : null;
        live.root._svgAfricanFaceState = premiumAsset ? clone(config._svgAfricanFaceState || {}) : null;
        live.root._svgAfricanFacePreset = premiumAsset ? (config._svgAfricanFacePreset || config.facePreset || '') : null;
        const SvgUtils = globalThis.SvgCharacterUtils;
        const instanceId = live.root._svgCharacterInstanceId || SvgUtils?.makeInstanceId?.('svgaf') || `svgaf-${Date.now().toString(36)}`;
        live.root._svgCharacterInstanceId = instanceId;

        if (premiumAsset) {
            this._applySvgAfricanPremiumAssetGeometry?.(live, { config, asset: premiumAsset });
        } else {
            this._applySvgAfricanCarrierGeometry?.(live, { config, reapplyTexture: false });
        }

        Object.entries(live.parts || {}).forEach(([partKey, part]) => {
            const obj = part?.obj || part?.raw;
            if (!obj) return;
            const imageSrc = premiumAsset
                ? PremiumAssets.renderPartDataUrl(premiumAsset.id, partKey, config, instanceId, {
                    faceState: partKey === 'head-neck' ? config._svgAfricanFaceState : null
                })
                : Renderer.renderPartDataUrl(partKey, config, instanceId);
            this._applySvgAfricanAppearanceToPart(obj, imageSrc, options);
            obj._characterAppearanceProvider = premiumAsset ? 'svg-african-premium' : 'svg-african';
            obj._svgCharacterPremiumPart = premiumAsset ? true : undefined;
            obj._svgCharacterPremiumAssetId = premiumAsset?.id || undefined;
            obj._svgAfricanPremiumAssetId = premiumAsset?.id || undefined;
            obj._svgAfricanAdjustments = premiumAsset ? clone(config.premiumAdjustments || {}) : undefined;
            obj._svgAfricanFaceState = premiumAsset && partKey === 'head-neck' ? clone(config._svgAfricanFaceState || {}) : undefined;
            obj._svgAfricanFacePreset = premiumAsset ? (config._svgAfricanFacePreset || config.facePreset || '') : undefined;
            obj._svgCharacterConfig = clone(config);
            obj._svgCharacterIdentity = clone(config.identity);
            obj._svgCharacterStyling = clone(config.styling);
            obj._svgCharacterInstanceId = instanceId;
            obj._svgCharacterIdentityId = config.identityId;
            obj._svgCharacterPartKey = partKey;
            obj._svgCharacterPremiumPartKey = premiumAsset ? partKey : undefined;
            if (premiumAsset) {
                obj._armatureRoleKey = partKey;
                obj.armatureRoleKey = partKey;
                obj._armaturePartKey = partKey;
                obj.armaturePartKey = partKey;
                obj.bodyPartData = {
                    ...(obj.bodyPartData || {}),
                    partKey,
                    charType: isRequestedSide ? 'human-side-dual' : 'human-front'
                };
            }
            if (partKey === 'head-neck') {
                StageObject.normalizeSvgAfricanHeadNeckRig?.(obj, {
                    force: true,
                    view: profileKey,
                    ...(premiumAsset?.joints?.[partKey]?.neck?.position != null
                        ? { position: premiumAsset.joints[partKey].neck.position }
                        : {})
                });
            }
        });

        if (!isRequestedSide && profileKey.includes('3q') && typeof this._setArmatureFrontBackThreeQuarterState === 'function') {
            const facing = profileKey.startsWith('back') ? 'back' : 'front';
            const lean = profileKey.endsWith('-left') ? 'left' : 'right';
            this._setArmatureFrontBackThreeQuarterState(live, facing, lean, {
                applyBaselineTilt: !isAuthoredThreeQuarter,
                applyPinLayout: !isAuthoredThreeQuarter,
                syncLayers: !isAuthoredThreeQuarter
            });
            live.root._svgCharacterViewProfileKey = profileKey;
        }
        this.objects?._resolvePins?.();
        this._syncSvgAfricanContinuousGarment?.(live, {
            asset: premiumAsset,
            config,
            updateObjectList: false,
            updateProperties: false,
            render: false
        });
        if (options.updateObjectList !== false) this.objects?.updateObjectList?.();
        if (options.updateProperties !== false) this.objects?.updateProperties?.();
        if (options.render !== false) this.stage?.requestRender?.();
        emit('objects:updated');
        if (options.pushHistory !== false) emit('history:push');
        return true;
    };
})();
