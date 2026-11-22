/**
 * Joint System — Universal Character build/weight axes & proportion profiles
 * (split from joint-universal-char.js for maintainability)
 *
 * Build (frame + muscle) and Weight (softness) normalization, option lists,
 * per-part scale normalization, numeric clamp, and the composed body-profile
 * + legacy bodyType bridging. All methods live on JointSystem.prototype.
 */

Object.assign(JointSystem.prototype, {

    // ── Build / Weight axes (split body-type model) ──
    // Build = frame + musculature; Weight = body fat / softness. They compose
    // into the body profile, replacing the legacy single bodyType axis.
    _ucNormalizeBuild(build) {
        const valid = ['petite', 'slim', 'average', 'athletic', 'muscular'];
        const aliases = { normal: 'average', regular: 'average', lean: 'slim', small: 'petite', toned: 'athletic', buff: 'muscular' };
        return Utils.normalizeWithAliases(build, valid, aliases, 'average');
    },

    _ucNormalizeWeight(weight) {
        const valid = ['lean', 'average', 'soft', 'heavy', 'obese'];
        const aliases = { normal: 'average', regular: 'average', slim: 'lean', thin: 'lean', chubby: 'soft', plump: 'soft', heavyset: 'heavy', overweight: 'heavy', large: 'heavy', obese2: 'obese' };
        return Utils.normalizeWithAliases(weight, valid, aliases, 'average');
    },

    _ucGetBuildOptions() {
        return [
            { val: 'petite', label: 'Petite' },
            { val: 'slim', label: 'Slim' },
            { val: 'average', label: 'Average' },
            { val: 'athletic', label: 'Athletic' },
            { val: 'muscular', label: 'Muscular' }
        ];
    },

    _ucGetWeightOptions() {
        return [
            { val: 'lean', label: 'Lean' },
            { val: 'average', label: 'Average' },
            { val: 'soft', label: 'Soft' },
            { val: 'heavy', label: 'Heavy' },
            { val: 'obese', label: 'Very Heavy' }
        ];
    },

    _ucClampNum(v, min, max, fallback) {
        const n = Number(v);
        if (!Number.isFinite(n)) return fallback;
        return Math.min(max, Math.max(min, n));
    },

    _ucDefaultMuscleForBuild(build) {
        switch (this._ucNormalizeBuild(build)) {
            case 'petite': return 38;
            case 'slim': return 35;
            case 'athletic': return 70;
            case 'muscular': return 92;
            default: return 50;
        }
    },

    // Per-part size sliders: independent width/height per part (50–160%, default 100).
    // Accepts legacy numeric values (applied to both axes) for back-compat.
    _ucNormalizePartScale(ps = {}) {
        const c = (v) => this._ucClampNum(v, 50, 160, 100);
        const src = ps && typeof ps === 'object' ? ps : {};
        const pair = (o) => {
            if (o && typeof o === 'object') return { w: c(o.w), h: c(o.h) };
            return { w: c(o), h: c(o) };
        };
        return {
            overall: c(src.overall),
            head: pair(src.head), neck: pair(src.neck), torso: pair(src.torso),
            arms: pair(src.arms), legs: pair(src.legs)
        };
    },

    _ucGetBuildProfile(build) {
        switch (this._ucNormalizeBuild(build)) {
            case 'petite':   return { widthMult: 0.86, shoulderMult: 0.88, waistMult: 0.92, hipMult: 0.92, limbWidthMult: 0.80, limbLengthMult: 0.94, torsoLengthMult: 0.96 };
            case 'slim':     return { widthMult: 0.88, shoulderMult: 0.96, waistMult: 0.88, hipMult: 0.94, limbWidthMult: 0.80, limbLengthMult: 1.06, torsoLengthMult: 1.00 };
            case 'athletic': return { widthMult: 1.04, shoulderMult: 1.16, waistMult: 0.92, hipMult: 1.00, limbWidthMult: 1.16, limbLengthMult: 1.02, torsoLengthMult: 1.00 };
            case 'muscular': return { widthMult: 1.14, shoulderMult: 1.34, waistMult: 0.98, hipMult: 1.06, limbWidthMult: 1.45, limbLengthMult: 1.00, torsoLengthMult: 1.01 };
            default:         return { widthMult: 1.00, shoulderMult: 1.00, waistMult: 1.00, hipMult: 1.00, limbWidthMult: 1.00, limbLengthMult: 1.00, torsoLengthMult: 1.00 };
        }
    },

    _ucGetWeightProfile(weight) {
        switch (this._ucNormalizeWeight(weight)) {
            case 'lean':  return { widthMult: 0.94, waistMult: 0.86, hipMult: 0.96, limbWidthMult: 0.92, bellyExtraHeads: 0 };
            case 'soft':  return { widthMult: 1.06, waistMult: 1.18, hipMult: 1.10, limbWidthMult: 1.06, bellyExtraHeads: 0.06 };
            case 'heavy': return { widthMult: 1.14, waistMult: 1.36, hipMult: 1.18, limbWidthMult: 1.12, bellyExtraHeads: 0.15 };
            case 'obese': return { widthMult: 1.20, waistMult: 1.52, hipMult: 1.26, limbWidthMult: 1.17, bellyExtraHeads: 0.22 };
            default:      return { widthMult: 1.00, waistMult: 1.00, hipMult: 1.00, limbWidthMult: 1.00, bellyExtraHeads: 0 };
        }
    },

    // Compose build + weight into a single body profile (gender adds hip width).
    _ucGetComposedBodyProfile(build, weight, gender = 'male') {
        const b = this._ucGetBuildProfile(build);
        const w = this._ucGetWeightProfile(weight);
        const isFemale = gender === 'female';
        return {
            widthMult: b.widthMult * w.widthMult,
            shoulderMult: b.shoulderMult,
            waistMult: b.waistMult * w.waistMult,
            hipMult: b.hipMult * w.hipMult * (isFemale ? 1.10 : 1.0),
            limbWidthMult: b.limbWidthMult * w.limbWidthMult,
            limbLengthMult: b.limbLengthMult,
            torsoLengthMult: b.torsoLengthMult,
            bellyExtraHeads: w.bellyExtraHeads
        };
    },

    // Legacy bodyType → (build, weight) for back-compat with saved characters.
    _ucBodyTypeToBuildWeight(bodyType) {
        switch (this._ucNormalizeBodyType(bodyType)) {
            case 'petite':     return { build: 'petite', weight: 'average' };
            case 'slim':       return { build: 'slim', weight: 'lean' };
            case 'tall':       return { build: 'slim', weight: 'average' };
            case 'athletic':   return { build: 'athletic', weight: 'average' };
            case 'muscular':   return { build: 'muscular', weight: 'average' };
            case 'curvy':      return { build: 'slim', weight: 'soft' };
            case 'stocky':     return { build: 'athletic', weight: 'soft' };
            case 'plus-size':  return { build: 'average', weight: 'heavy' };
            case 'overweight': return { build: 'average', weight: 'obese' };
            default:           return { build: 'average', weight: 'average' };
        }
    },

    // (build, weight) → representative legacy bodyType string for keys/captions
    // and the legacy boolean helpers.
    _ucBuildWeightToBodyType(build, weight) {
        const b = this._ucNormalizeBuild(build);
        const w = this._ucNormalizeWeight(weight);
        if (w === 'obese') return 'overweight';
        if (w === 'heavy') return 'plus-size';
        if (b === 'muscular') return 'muscular';
        if (b === 'athletic') return w === 'soft' ? 'stocky' : 'athletic';
        if (w === 'soft') return 'curvy';
        if (b === 'petite') return 'petite';
        if (b === 'slim') return w === 'lean' ? 'slim' : 'slim';
        return 'normal';
    },

});
