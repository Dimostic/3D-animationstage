/**
 * Joint System — Universal Character body-shape presets & randomizer
 * (split from joint-universal-char.js for maintainability)
 *
 * localStorage-backed body-shape presets, built-in starter shapes, and the
 * coherent character randomizer. All methods live on JointSystem.prototype.
 */

Object.assign(JointSystem.prototype, {

    _getBodyShapePresetStorageKey() {
        return 'universal-character-body-shape-presets';
    },

    _loadBodyShapePresets() {
        try { return JSON.parse(localStorage.getItem(this._getBodyShapePresetStorageKey())) || []; }
        catch { return []; }
    },

    _saveBodyShapePreset(name, shape) {
        const presets = this._loadBodyShapePresets();
        presets.push({ id: Utils.generateId('ucshape'), name: name || 'Shape', shape: shape || {} });
        localStorage.setItem(this._getBodyShapePresetStorageKey(), JSON.stringify(presets));
        return presets;
    },

    _deleteBodyShapePreset(id) {
        const presets = this._loadBodyShapePresets().filter(p => p.id !== id);
        localStorage.setItem(this._getBodyShapePresetStorageKey(), JSON.stringify(presets));
        return presets;
    },

    _ucBuiltinBodyShapes() {
        const pp = (w, h) => ({ w, h });
        return [
            { id: 'builtin:bodybuilder', name: '★ Bodybuilder', shape: { muscle: 100, bust: 50, hip: 45, shoulder: 90, partScale: { overall: 110, torso: pp(118, 100), arms: pp(120, 100), legs: pp(115, 100), neck: pp(120, 100), head: pp(95, 100) } } },
            { id: 'builtin:athlete', name: '★ Athlete', shape: { muscle: 75, bust: 50, hip: 48, shoulder: 70, partScale: { overall: 100, arms: pp(106, 102), legs: pp(106, 102) } } },
            { id: 'builtin:petite', name: '★ Petite', shape: { muscle: 35, bust: 45, hip: 55, shoulder: 35, partScale: { overall: 88, head: pp(106, 106) } } },
            { id: 'builtin:tall-lean', name: '★ Tall & Lean', shape: { muscle: 40, bust: 45, hip: 45, shoulder: 55, partScale: { overall: 100, torso: pp(92, 110), arms: pp(92, 112), legs: pp(92, 116) } } },
            { id: 'builtin:curvy', name: '★ Curvy', shape: { muscle: 40, bust: 80, hip: 85, shoulder: 45, partScale: { overall: 100, torso: pp(96, 100) } } },
            { id: 'builtin:pregnancy', name: '★ Pregnancy', shape: { muscle: 36, bust: 72, hip: 68, shoulder: 44, belly: 100, partScale: { overall: 100, torso: pp(112, 106), arms: pp(96, 100), legs: pp(98, 100), head: pp(100, 100) } } }
        ];
    },

    _getBodyShapePreset(id) {
        if (String(id).startsWith('builtin:')) return this._ucBuiltinBodyShapes().find(p => p.id === id) || null;
        return this._loadBodyShapePresets().find(p => p.id === id) || null;
    },

    // Generate a coherent random character config (for the Randomize button).
    _ucRandomCharacterConfig(base = {}) {
        const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
        const rnd = (min, max) => Math.round(min + Math.random() * (max - min));
        const gender = pick(['male', 'female', 'neutral']);
        const ageGroup = pick(['child', 'adolescent', 'adult', 'adult', 'adult', 'elderly']);
        const build = pick(['petite', 'slim', 'average', 'average', 'athletic', 'muscular']);
        const weight = pick(['lean', 'average', 'average', 'soft', 'heavy']);
        const skins = ['#FADCBC', '#F1C9A5', '#D2A07A', '#C08C5A', '#A06C3C', '#7A4B2A', '#5A3420', '#3D2114'];
        const hairs = ['#1A1A1A', '#3B2314', '#6B3A2A', '#8B4513', '#A0522D', '#C9A96E', '#E8D5B0', '#9E9E9E', '#E0E0E0'];
        const eyes = ['#4B3424', '#2B1D14', '#171717', '#7A5A2E', '#9B6A2F', '#4F7D58', '#4A6FA5', '#7A8792'];
        const hairOpts = this._ucGetHairStyleOptions(gender).map(o => o.val);
        const facial = gender === 'male' ? pick(['none', 'none', 'stubble', 'mustache', 'goatee', 'short-beard', 'full-beard']) : 'none';
        const outfits = ['custom', 'casual', 'school', 'teacher', 'business', 'corporate', 'lawyer', 'sports', 'security', 'pilot', 'engineer', 'academic', 'scientist', 'mechanic', 'farmer', 'chief', 'clergy', 'graduate', 'doctor', 'nurse', 'scrubs', 'chef', 'construction', 'hospitality', 'dashiki', 'ankara', 'kaftan', 'agbada', 'senator', 'executive-tunic-suit', 'buba-wrapper', 'adire', 'kente', 'modest'];
        return this._normalizeUniversalCharacterConfig({
            ...base,
            gender, ageGroup, build, weight,
            view: 'front',
            skinTone: pick(skins),
            hairColor: pick(hairs),
            eyeColor: pick(eyes),
            scleraColor: 'auto',
            headNeckStyle: pick(['oval', 'round', 'soft', 'defined', 'square', 'heart', 'narrow']),
            hairStyle: pick(hairOpts),
            headwearStyle: 'none',
            facialHair: facial,
            muscle: build === 'muscular' ? rnd(70, 100) : build === 'athletic' ? rnd(55, 80) : rnd(25, 60),
            bust: gender === 'female' ? rnd(45, 85) : rnd(40, 55),
            hip: rnd(40, 70),
            shoulder: rnd(35, 70),
            clothing: { outfitPreset: pick(outfits) }
        });
    },

});
