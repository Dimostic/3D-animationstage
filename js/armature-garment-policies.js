/**
 * Shared garment behavior contracts for UC and SVG armatures.
 * Artwork remains character-specific; motion, depth and deformation intent live here.
 */
(function() {
    'use strict';

    const VERSION = 2;
    const freeze = value => Object.freeze(value);
    const normalize = value => String(value || '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const MOTION_POLICIES = freeze({
        none: freeze({ rotation: 0, tiltX: 0, tiltY: 0, scaleX: 0, scaleY: 0 }),
        'waist-drape-light': freeze({ rotation: 0.55, tiltX: 0.35, tiltY: 0.65, scaleX: 0.005, scaleY: 0.0025 }),
        'waist-drape': freeze({ rotation: 0.8, tiltX: 0.55, tiltY: 0.95, scaleX: 0.007, scaleY: 0.0035 }),
        'robe-sway': freeze({ rotation: 1.5, tiltX: 1.1, tiltY: 1.7, scaleX: 0.012, scaleY: 0.006 }),
        'coat-sway': freeze({ rotation: 0.85, tiltX: 0.65, tiltY: 0.9, scaleX: 0.006, scaleY: 0.003 }),
        'gown-sway': freeze({ rotation: 1.15, tiltX: 0.8, tiltY: 1.25, scaleX: 0.009, scaleY: 0.0045 })
    });

    // Deformation is intentionally separate from whole-object motion. The
    // transform keeps the waist anchor fixed while allowing the hem to lag and
    // lift slightly during locomotion. Values are conservative normalized
    // coefficients so authored silhouettes remain recognizable.
    const DEFORMATION_POLICIES = freeze({
        rigid: freeze({ shearX: 0, liftY: 0 }),
        'limb-overlay': freeze({ shearX: 0, liftY: 0 }),
        'waist-to-hem': freeze({ shearX: 0.026, liftY: 0.006 }),
        'side-profile-waist-to-hem': freeze({ shearX: 0.030, liftY: 0.007 }),
        'robe-panel': freeze({ shearX: 0.046, liftY: 0.010 }),
        'coat-panel': freeze({ shearX: 0.022, liftY: 0.005 }),
        'gown-panel': freeze({ shearX: 0.034, liftY: 0.008 })
    });

    const ADAPTERS = freeze({
        overlay: freeze({
            id: 'overlay',
            motionPolicy: 'none',
            layerPolicy: 'follow-parent',
            deformationPolicy: 'rigid'
        }),
        sleeve: freeze({
            id: 'sleeve',
            motionPolicy: 'none',
            layerPolicy: 'sleeve-over-limb',
            deformationPolicy: 'limb-overlay'
        }),
        skirt: freeze({
            id: 'skirt',
            motionPolicy: 'waist-drape-light',
            layerPolicy: 'lower-over-legs',
            deformationPolicy: 'waist-to-hem'
        }),
        wrapper: freeze({
            id: 'wrapper',
            motionPolicy: 'waist-drape',
            layerPolicy: 'lower-over-legs',
            deformationPolicy: 'waist-to-hem'
        }),
        robe: freeze({
            id: 'robe',
            motionPolicy: 'robe-sway',
            layerPolicy: 'body-drape',
            deformationPolicy: 'robe-panel'
        }),
        'long-coat': freeze({
            id: 'long-coat',
            motionPolicy: 'coat-sway',
            layerPolicy: 'body-drape',
            deformationPolicy: 'coat-panel'
        }),
        gown: freeze({
            id: 'gown',
            motionPolicy: 'gown-sway',
            layerPolicy: 'body-drape',
            deformationPolicy: 'gown-panel'
        }),
        'academic-gown': freeze({
            id: 'academic-gown',
            motionPolicy: 'gown-sway',
            layerPolicy: 'body-drape',
            deformationPolicy: 'gown-panel'
        })
    });

    const LONG_TORSO_GARMENT_IDS = freeze(new Set([
        'agbada',
        'agbada-top',
        'agbada2',
        'agbada3',
        'royal-agbada',
        'royal-agbada-painted',
        'baban-riga',
        'senator',
        'senator-wear',
        'senator-top',
        'senator2',
        'senator3',
        'senator-shirt',
        'senator-shirt-panel',
        'senator-shirt-stripe',
        'executive-tunic-suit',
        'chief',
        'kaftan',
        'buba-wrapper',
        'dress'
    ]));

    function hasLongTorsoGarment(source = {}) {
        if (!source || typeof source !== 'object') return false;
        const svgConfig = source._svgCharacterConfig || source.svgCharacterConfig || {};
        const ucConfig = source._ucCharacterStyleConfig || source.ucCharacterStyleConfig || {};
        const config = Object.keys(svgConfig).length ? svgConfig : ucConfig;
        const styling = config.styling || source.styling || {};
        const clothing = config.clothing || source.clothing || ucConfig.clothing || {};
        const ids = [
            clothing.topStyle,
            clothing.topClothing,
            clothing.outfitPreset,
            clothing.outfit,
            styling.topStyle,
            styling.topClothing,
            styling.outfitPreset,
            styling.outfit,
            config.topStyle,
            config.topClothing,
            config.outfitPreset,
            config.outfit,
            source.topStyle,
            source.topClothing,
            source.outfitPreset,
            source.outfit
        ].map(normalize).filter(Boolean);
        return ids.some(id => LONG_TORSO_GARMENT_IDS.has(id));
    }

    function explicitValue(source, underscored, serialized, plain) {
        if (!source || typeof source !== 'object') return '';
        return source[underscored] || source[serialized] || source[plain] || '';
    }

    function inferAdapterId(source = {}) {
        const explicit = normalize(explicitValue(
            source,
            '_ucGarmentAdapterId',
            'ucGarmentAdapterId',
            'adapterId'
        ));
        if (ADAPTERS[explicit]) return explicit;

        const name = normalize(source.name);
        const partKey = normalize(source._ucGarmentPartKey || source.ucGarmentPartKey || source.partKey);
        const kind = normalize(source._svgAfricanGarmentKind || source.svgAfricanGarmentKind || source.kind);
        const text = [
            name,
            partKey,
            kind,
            source.bottomClothing,
            source.topClothing,
            source.outfit,
            source.profession,
            source.culturalStyle
        ].map(normalize).filter(Boolean).join(' ');

        if (/sleeve/.test(text)) return 'sleeve';
        if (/academic-gown|graduation-gown|convocation-gown/.test(text)) return 'academic-gown';
        if (/lab-coat|long-coat|trench-coat|doctor-coat/.test(text)) return 'long-coat';
        if (/bubu-gown|evening-gown|long-dress|ceremonial-gown/.test(text)) return 'gown';
        if (/wrapper|\biro\b|george/.test(text)) return 'wrapper';
        if (/skirt|dress-lower|dress-skirt/.test(text)) return 'skirt';
        if (/agbada|baban-riga|kaftan|robe|long-tunic|senator-shirt/.test(text)) return 'robe';
        return 'overlay';
    }

    function resolve(source = {}) {
        const adapterId = inferAdapterId(source);
        const adapter = ADAPTERS[adapterId] || ADAPTERS.overlay;
        const explicitMotion = normalize(explicitValue(
            source,
            '_ucGarmentMotionPolicy',
            'ucGarmentMotionPolicy',
            'motionPolicy'
        ));
        const explicitLayer = normalize(explicitValue(
            source,
            '_ucGarmentLayerPolicy',
            'ucGarmentLayerPolicy',
            'layerPolicy'
        ));
        const explicitDeformation = normalize(explicitValue(
            source,
            '_ucGarmentDeformationPolicy',
            'ucGarmentDeformationPolicy',
            'deformationPolicy'
        ));
        const viewFamily = normalize(source.viewFamily || source._svgAfricanGarmentViewFamily || source.svgAfricanGarmentViewFamily);
        const deformationPolicy = explicitDeformation || (
            viewFamily === 'side' && (adapterId === 'skirt' || adapterId === 'wrapper')
                ? 'side-profile-waist-to-hem'
                : adapter.deformationPolicy
        );

        return {
            version: VERSION,
            adapterId,
            motionPolicy: MOTION_POLICIES[explicitMotion] ? explicitMotion : adapter.motionPolicy,
            layerPolicy: explicitLayer || adapter.layerPolicy,
            deformationPolicy
        };
    }

    function applyToObject(obj, source = {}) {
        if (!obj || typeof obj !== 'object') return null;
        const merged = { ...obj, ...source };
        const sourceOverrides = [
            ['adapterId', 'ucGarmentAdapterId', '_ucGarmentAdapterId'],
            ['motionPolicy', 'ucGarmentMotionPolicy', '_ucGarmentMotionPolicy'],
            ['layerPolicy', 'ucGarmentLayerPolicy', '_ucGarmentLayerPolicy'],
            ['deformationPolicy', 'ucGarmentDeformationPolicy', '_ucGarmentDeformationPolicy']
        ];
        const sourceAdapter = source.adapterId || source.ucGarmentAdapterId || source._ucGarmentAdapterId;
        if (sourceAdapter) {
            sourceOverrides.slice(1).forEach(([plain, serialized, underscored]) => {
                if (source[plain] || source[serialized] || source[underscored]) return;
                delete merged[plain];
                delete merged[serialized];
                delete merged[underscored];
            });
        }
        sourceOverrides.forEach(([plain, serialized, underscored]) => {
            const value = source[plain] || source[serialized] || source[underscored];
            if (value) merged[underscored] = value;
        });
        const policy = resolve(merged);
        obj._ucGarmentPolicyVersion = policy.version;
        obj._ucGarmentAdapterId = policy.adapterId;
        obj._ucGarmentMotionPolicy = policy.motionPolicy;
        obj._ucGarmentLayerPolicy = policy.layerPolicy;
        obj._ucGarmentDeformationPolicy = policy.deformationPolicy;
        return policy;
    }

    function getMovementEnergy(moveKey = '') {
        const key = normalize(moveKey);
        if (/run|jog|sprint|jump|leap/.test(key)) return 1.25;
        if (/stroll|sneak|tiptoe/.test(key)) return 0.72;
        if (/dance/.test(key)) return 1.1;
        if (/walk|march|strut|step/.test(key)) return 1;
        if (/jab|boxing|punch|guard|eat|drink|read|write|type|aim|hands-on-hips/.test(key)) return 0.45;
        return 0;
    }

    function sampleMotion(source = {}, state = {}) {
        const resolved = typeof source === 'string' && MOTION_POLICIES[normalize(source)]
            ? { motionPolicy: normalize(source) }
            : resolve(source);
        const coefficients = MOTION_POLICIES[resolved.motionPolicy] || MOTION_POLICIES.none;
        const energy = state.reset ? 0 : getMovementEnergy(state.moveKey);
        const phase = Number.isFinite(state.cycleT)
            ? state.cycleT
            : (Number.isFinite(state.localT) ? state.localT : 0);
        const sway = Math.sin(phase * Math.PI * 2);
        const bounce = Math.sin(phase * Math.PI * 4);
        return {
            active: energy > 0 && resolved.motionPolicy !== 'none',
            energy,
            rotation: sway * energy * coefficients.rotation,
            tiltX: Math.abs(bounce) * energy * coefficients.tiltX,
            tiltY: sway * energy * coefficients.tiltY,
            scaleX: 1 + Math.abs(sway) * energy * coefficients.scaleX,
            scaleY: 1 - Math.abs(bounce) * energy * coefficients.scaleY
        };
    }

    function sampleDeformation(source = {}, state = {}) {
        const resolved = resolve(source);
        const coefficients = DEFORMATION_POLICIES[resolved.deformationPolicy] || DEFORMATION_POLICIES.rigid;
        const energy = state.reset ? 0 : getMovementEnergy(state.moveKey);
        const rawPhase = Number.isFinite(state.cycleT)
            ? state.cycleT
            : (Number.isFinite(state.localT) ? state.localT : 0);
        const phase = rawPhase - Math.floor(rawPhase);
        const sway = Math.sin(phase * Math.PI * 2);
        const lift = Math.abs(Math.sin(phase * Math.PI * 2));
        const facing = normalize(
            source.sideFacing
            || source._svgAfricanGarmentFacing
            || source.svgAfricanGarmentFacing
        );
        const facingSign = facing === 'left' ? -1 : 1;
        const adapterStrength = resolved.adapterId === 'wrapper'
            ? 1.15
            : (resolved.adapterId === 'skirt' ? 0.85 : 1);
        const active = energy > 0 && (coefficients.shearX > 0 || coefficients.liftY > 0);

        return {
            active,
            energy,
            shearX: active ? sway * energy * coefficients.shearX * adapterStrength * facingSign : 0,
            scaleY: active ? 1 - lift * energy * coefficients.liftY * adapterStrength : 1
        };
    }

    const api = Object.freeze({
        version: VERSION,
        adapters: ADAPTERS,
        motionPolicies: MOTION_POLICIES,
        deformationPolicies: DEFORMATION_POLICIES,
        inferAdapterId,
        hasLongTorsoGarment,
        resolve,
        applyToObject,
        getMovementEnergy,
        sampleMotion,
        sampleDeformation
    });

    if (typeof window !== 'undefined') window.ArmatureGarmentPolicies = api;
    if (typeof globalThis !== 'undefined' && !globalThis.ArmatureGarmentPolicies) {
        globalThis.ArmatureGarmentPolicies = api;
    }
})();
