/* ============================================================
   animation-parts.js  —  Professional Animation Parts System
   ============================================================
   Modular character & component animation framework.
   Each "part" is a multi-piece articulated figure with keyframe
   data for every joint/piece, producing smooth coordinated motion.

   Key design decisions (adapted for this app):
   - Parts insert as grouped StageObject icons (reuses existing icon rendering)
   - Animation type 'part-keyframe' drives multi-property interpolation
   - Each piece stores per-property keyframes with easing per segment
   - Works with existing export, preview, and timeline systems
   ============================================================ */

// ── AnimationPart: data container for a single part template ──
class AnimationPart {
    constructor(data) {
        this.id = data.id;
        this.type = data.type;           // 'character', 'face', 'animal', 'limb'
        this.subtype = data.subtype;      // 'male-side-walk', 'blink', etc.
        this.name = data.name;
        this.desc = data.desc || '';
        this.category = data.category;    // maps to UI grid id
        this.tags = data.tags || [];
        this.preview = data.preview || '';  // SVG path for button icon
        this.userPreset = !!data.userPreset;

        // pieces: array of piece definitions
        // Each piece: { name, path, viewBox, oX, oY, w, h, pvX, pvY, zIndex, fill, stroke }
        this.pieces = data.pieces || [];

        // keyframes: object keyed by piece index → property → sorted keyframe array
        // e.g. { 0: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-30}, {t:1.0, v:0}] } }
        this.keyframes = data.keyframes || {};

        // cycle duration in ms, looping, direction
        this.duration = data.duration || 1000;
        this.loop = data.loop !== false;
        this.repeatMode = data.repeatMode || 'cycle';

        // Root motion: cumulative forward translation with physics-based bounce/sway
        // { enabled: bool, speed: px/s, bounce: amplitude, sway: lateral amplitude }
        this.rootMotion = data.rootMotion || null;

        // Skeleton hierarchy (informational: bone→pieces mapping + parent-child)
        this.skeleton = data.skeleton || null;

        // Foot/ground contact points for IK-like corrections
        this.contactPoints = data.contactPoints || [];

        // Physics: center of mass, weight distribution, etc.
        this.physics = data.physics || null;
    }
}

// ── AnimationPartsLibrary: registry of all built-in & user parts ──
class AnimationPartsLibrary {
    constructor() {
        this.parts = new Map();
        this.aliases = new Map();
        this.categories = new Map();
        this.userPresetStorageKey = 'animationStage.customAnimatedParts.v1';
        this._loadBuiltIn();
        this._loadUserPresets();
    }

    register(part) {
        const existing = this.parts.get(part.id);
        if (existing && this.categories.has(existing.category)) {
            this.categories.set(
                existing.category,
                this.categories.get(existing.category).filter(id => id !== part.id)
            );
        }
        this.parts.set(part.id, part);
        if (!this.categories.has(part.category)) this.categories.set(part.category, []);
        this.categories.get(part.category).push(part.id);
    }

    registerAlias(aliasId, targetId) {
        if (!aliasId || !targetId || aliasId === targetId) return;
        this.aliases.set(aliasId, targetId);
    }

    get(id) {
        const resolvedId = this.parts.has(id) ? id : this.aliases.get(id);
        return resolvedId ? this.parts.get(resolvedId) : undefined;
    }

    getByCategory(cat) {
        return (this.categories.get(cat) || []).map(id => this.parts.get(id));
    }

    allCategories() { return [...this.categories.keys()]; }

    clonePart(id, overrides = {}) {
        const part = this.get(id);
        if (!part) return null;
        const raw = JSON.parse(JSON.stringify(part));
        return new AnimationPart({ ...raw, ...overrides });
    }

    saveUserPreset(partData) {
        const presets = this._getStoredUserPresets();
        const clean = JSON.parse(JSON.stringify(partData));
        clean.id = clean.id || `user-${Date.now()}`;
        clean.category = clean.category || 'saved';
        clean.userPreset = true;

        const existingIndex = presets.findIndex(p => p.id === clean.id);
        if (existingIndex >= 0) presets[existingIndex] = clean;
        else presets.push(clean);

        localStorage.setItem(this.userPresetStorageKey, JSON.stringify(presets));
        this.register(new AnimationPart(clean));
        return clean.id;
    }

    renameUserPreset(id, nextName) {
        const name = String(nextName || '').trim();
        if (!name) return null;

        const presets = this._getStoredUserPresets();
        const existingIndex = presets.findIndex(p => p.id === id);
        if (existingIndex < 0) return null;

        presets[existingIndex] = {
            ...presets[existingIndex],
            name
        };

        localStorage.setItem(this.userPresetStorageKey, JSON.stringify(presets));
        this.register(new AnimationPart(presets[existingIndex]));
        return presets[existingIndex];
    }

    deleteUserPreset(id) {
        const presets = this._getStoredUserPresets();
        const nextPresets = presets.filter(p => p.id !== id);
        if (nextPresets.length === presets.length) return false;

        localStorage.setItem(this.userPresetStorageKey, JSON.stringify(nextPresets));

        const existing = this.parts.get(id);
        if (existing && this.categories.has(existing.category)) {
            this.categories.set(
                existing.category,
                this.categories.get(existing.category).filter(partId => partId !== id)
            );
        }
        this.parts.delete(id);
        return true;
    }

    _getStoredUserPresets() {
        try {
            const raw = localStorage.getItem(this.userPresetStorageKey);
            const parsed = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? parsed : [];
        } catch (_) {
            return [];
        }
    }

    _loadUserPresets() {
        this._getStoredUserPresets().forEach(data => {
            try {
                this.register(new AnimationPart(data));
            } catch (_) {
                // Ignore malformed saved presets.
            }
        });
    }

    // ── Easing helpers for keyframe interpolation ──
    static ease(name, t) {
        switch (name) {
            case 'linear': return t;
            case 'easeIn': return t * t;
            case 'easeOut': return t * (2 - t);
            case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
            case 'easeInCubic': return t * t * t;
            case 'easeOutCubic': { const t1 = t - 1; return t1 * t1 * t1 + 1; }
            case 'easeInOutCubic': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
            default: return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        }
    }

    // Interpolate a value from a keyframe array at normalised time t (0–1)
    static interpolateKeyframes(kfArray, t) {
        if (!kfArray || kfArray.length === 0) return 0;
        if (kfArray.length === 1) return kfArray[0].v;

        // Clamp
        if (t <= kfArray[0].t) return kfArray[0].v;
        if (t >= kfArray[kfArray.length - 1].t) return kfArray[kfArray.length - 1].v;

        // Find segment
        for (let i = 0; i < kfArray.length - 1; i++) {
            const a = kfArray[i], b = kfArray[i + 1];
            if (t >= a.t && t <= b.t) {
                const segT = (t - a.t) / (b.t - a.t);
                const eased = AnimationPartsLibrary.ease(a.e || 'easeInOut', segT);
                return a.v + (b.v - a.v) * eased;
            }
        }
        return kfArray[kfArray.length - 1].v;
    }

    // ── Built-in part definitions ──
    _loadBuiltIn() {
        // ──────────────── CHARACTERS ────────────────
        this.register(this._maleWalkSide());
        this.register(this._maleWalkFront());
        this.register(this._femaleWalkSide());
        this.register(this._femaleWalkFront());
        this.register(this._maleRunSide());
        this.register(this._femaleRunSide());
        this.register(this._babyCrawl());

        this.registerAlias('male-walk-side-unsegmented', 'male-walk-side');
        this.registerAlias('female-walk-side-unsegmented', 'female-walk-side');
        this.registerAlias('male-run-side-unsegmented', 'male-run-side');
        this.registerAlias('female-run-side-unsegmented', 'female-run-side');

        // ──────────────── LIMBS (standalone) ────────────────
        this.register(this._legsWalkSide());
        this.register(this._legsWalkSideSegmented());
        this.register(this._legsWalkFront());
        this.register(this._legsRunSide());
        this.register(this._legsRunSideSegmented());
        this.register(this._armsSwingSide());
        this.register(this._armsSwingSideSegmented());
        this.register(this._armsSwingFront());
        this.register(this._armsSwingFrontSegmented());

        // ──────────────── FACE ────────────────
        this.register(this._blinkingEyes());
        this.register(this._talkingMouth());
        this.register(this._eyebrowRaise());

        // ──────────────── ANIMAL ────────────────
        this.register(this._waggingTail());
        this.register(this._quadrupedWalk());
        this.register(this._quadrupedRun());
        this.register(this._quadrupedHop());
        this.register(this._rodentWalkSide());
        this.register(this._rodentWalkFront());
        this.register(this._rodentRunSide());
        this.register(this._rodentRunFront());
        this.register(this._flappingWings());

        // ──────────────── ACTIONS ────────────────
        this.register(this._handWave());
        this.register(this._jump());
        this.register(this._armsRaise());
        this.register(this._headNod());
        this.register(this._headShake());
        this.register(this._clappingHands());
    }

    _maleSideHeadPiece(overrides = {}) {
        return {
            name: 'Head',
            path: 'M7 5 Q10 1 16 2 Q21 3 23 8 Q25 13 24 18 Q23 23 18 26 Q13 29 8 25 Q4 21 4 15 Q4 9 7 5 Z M6 7 Q10 2 16 2 Q21 3 23 7 Q19 6 14 7 Q9 8 6 12 Z M14 12 Q16 10 18 12 Q16 14 14 12 Z M17 12 A1 1 0 1 0 17 11.9 Z M21 16 L22 18 L20 19 M13 22 Q16 24 19 22',
            viewBox: '0 0 28 30',
            oX: 0,
            oY: -72,
            w: 28,
            h: 31,
            pvX: 0.5,
            pvY: 0.88,
            zIndex: 3,
            scaleX: -1,
            fill: '#e8b88a',
            stroke: '#c4956e',
            ...overrides
        };
    }

    _femaleSideHeadPiece(overrides = {}) {
        return {
            name: 'Head',
            path: 'M8 6 Q11 1 17 2 Q23 2 25 7 Q27 12 26 18 Q25 24 19 27 Q13 30 8 26 Q4 22 4 15 Q4 9 8 6 Z M4 9 Q7 -1 16 0 Q24 0 27 8 L27 15 Q24 11 18 10 Q10 10 5 14 Z M15 12 Q17 10 19 12 Q17 14 15 12 Z M18 12 A1 1 0 1 0 18 11.9 Z M22 17 L23 20 L20 19 M13 23 Q17 25 21 23',
            viewBox: '0 0 30 31',
            oX: 0,
            oY: -74,
            w: 30,
            h: 33,
            pvX: 0.5,
            pvY: 0.88,
            zIndex: 3,
            scaleX: -1,
            fill: '#f0c8a0',
            stroke: '#d4a87a',
            ...overrides
        };
    }

    _maleFrontHeadPiece(overrides = {}) {
        return {
            name: 'Head',
            path: 'M18 33 Q10 33 6 27 Q2 22 2 16 Q2 10 7 5 Q11 1 18 1 Q25 1 29 5 Q34 10 34 16 Q34 22 30 27 Q26 33 18 33 Z M8 8 Q11 4 18 3 Q25 4 28 8 Q24 8 18 9 Q12 8 8 8 Z M10 15 Q13 12 16 15 M20 15 Q23 12 26 15 M18 20 L17 24 L19 24 Z M12 27 Q15 30 18 30 Q21 30 24 27',
            viewBox: '0 0 36 34',
            oX: 0,
            oY: -80,
            w: 36,
            h: 37,
            pvX: 0.5,
            pvY: 0.88,
            zIndex: 3,
            fill: '#e8b88a',
            stroke: '#c4956e',
            ...overrides
        };
    }

    _femaleFrontHeadPiece(overrides = {}) {
        return {
            name: 'Head',
            path: 'M18 34 Q10 34 5 28 Q1 23 1 16 Q1 9 6 4 Q10 0 18 0 Q26 0 30 4 Q35 9 35 16 Q35 23 31 28 Q26 34 18 34 Z M4 9 Q7 0 18 -1 Q29 0 32 9 L32 17 Q28 11 18 10 Q8 11 4 17 Z M10 16 Q13 13 16 16 M20 16 Q23 13 26 16 M18 22 L17 26 L19 26 Z M12 29 Q15 32 18 32 Q21 32 24 29',
            viewBox: '0 0 36 35',
            oX: 0,
            oY: -82,
            w: 38,
            h: 39,
            pvX: 0.5,
            pvY: 0.88,
            zIndex: 3,
            fill: '#f0c8a0',
            stroke: '#d4a87a',
            ...overrides
        };
    }

    _sideNeckPiece(overrides = {}) {
        return {
            name: 'Neck',
            path: 'M2 0 L9 0 L9 18 L2 18 Z',
            viewBox: '0 0 12 18',
            oX: 0,
            oY: -56,
            w: 8,
            h: 20,
            pvX: 0.5,
            pvY: 0.15,
            zIndex: 1.95,
            fill: '#e8b88a',
            stroke: '#c4956e',
            ...overrides
        };
    }

    _frontNeckPiece(overrides = {}) {
        return {
            name: 'Neck',
            path: 'M2 0 L12 0 L12 18 L2 18 Z',
            viewBox: '0 0 14 18',
            oX: 0,
            oY: -62,
            w: 11,
            h: 14,
            pvX: 0.5,
            pvY: 0.15,
            zIndex: 2.1,
            fill: '#e8b88a',
            stroke: '#c4956e',
            ...overrides
        };
    }

    _sideShoulderPiece(overrides = {}) {
        return {
            name: 'Shoulders',
            path: 'M3 11 Q8 2 16 3 Q24 4 31 8 L29 12 Q22 11 12 13 L4 14 Z',
            viewBox: '0 0 34 15',
            oX: 0,
            oY: -48,
            w: 29,
            h: 9,
            pvX: 0.5,
            pvY: 0.5,
            zIndex: 2.45,
            fill: '#4a7fb5',
            stroke: '#375e8a',
            ...overrides
        };
    }

    _frontShoulderPiece(overrides = {}) {
        return {
            name: 'Shoulders',
            path: 'M2 11 Q10 2 18 2 Q26 2 34 11 L31 13 Q18 9 5 13 Z',
            viewBox: '0 0 36 14',
            oX: 0,
            oY: -53,
            w: 34,
            h: 9,
            pvX: 0.5,
            pvY: 0.5,
            zIndex: 2.45,
            fill: '#4a7fb5',
            stroke: '#375e8a',
            ...overrides
        };
    }

    _maleSideTorsoPiece(overrides = {}) {
        return {
            name: 'Torso',
            path: 'M22 3 Q15 1 10 6 Q7 10 7 17 L8 29 Q9 37 13 44 L22 44 Q25 38 26 28 L25 13 Q24 6 22 3 Z',
            viewBox: '0 0 32 46',
            oX: 0,
            oY: -34,
            w: 32,
            h: 48,
            pvX: 0.5,
            pvY: 0.15,
            zIndex: 2,
            fill: '#4a7fb5',
            stroke: '#375e8a',
            ...overrides
        };
    }

    _femaleSideTorsoPiece(overrides = {}) {
        return {
            name: 'Torso',
            path: 'M21 3 Q14 2 10 6 Q7 10 7 15 L8 22 Q9 29 13 34 L11 45 Q11 48 15 48 L20 48 Q23 48 23 45 L22 35 Q25 30 25 22 L24 14 Q24 7 21 3 Z',
            viewBox: '0 0 30 47',
            oX: 0,
            oY: -34,
            w: 30,
            h: 50,
            pvX: 0.5,
            pvY: 0.15,
            zIndex: 2,
            fill: '#d45d79',
            stroke: '#a94560',
            ...overrides
        };
    }

    _maleFrontTorsoPiece(overrides = {}) {
        return {
            name: 'Torso',
            path: 'M7 4 Q18 1 29 4 L31 10 L31 34 Q30 42 24 46 L12 46 Q6 42 5 34 L5 10 Z',
            viewBox: '0 0 36 46',
            oX: 0,
            oY: -35,
            w: 36,
            h: 48,
            pvX: 0.5,
            pvY: 0.15,
            zIndex: 2,
            fill: '#4a7fb5',
            stroke: '#375e8a',
            ...overrides
        };
    }

    _femaleFrontTorsoPiece(overrides = {}) {
        return {
            name: 'Torso',
            path: 'M8 4 Q19 1 30 4 L32 11 L31 18 Q30 28 25 34 L27 46 Q27 49 23 49 L15 49 Q11 49 11 46 L13 34 Q8 28 7 18 L6 11 Z',
            viewBox: '0 0 38 50',
            oX: 0,
            oY: -36,
            w: 36,
            h: 52,
            pvX: 0.5,
            pvY: 0.15,
            zIndex: 2,
            fill: '#d45d79',
            stroke: '#a94560',
            ...overrides
        };
    }

    _sideArmPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M5 0 Q10 0 11 4 L11 22 Q11 29 8 35 L7 41 Q7 44 4 44 L2 44 Q0 44 0 41 L1 35 Q3 29 3 22 L3 4 Q3 1 5 0 Z',
            viewBox: '0 0 12 44',
            oX: 0,
            oY: -36,
            w: 12,
            h: 42,
            pvX: 0.5,
            pvY: 0.06,
            zIndex: 1,
            fill,
            stroke,
            ...overrides
        };
    }

    _sideUpperArmPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M3 0 Q7 0 8 3 L8 21 Q8 25 5 28 L3 28 Q1 28 1 24 L1 4 Q1 1 3 0 Z',
            viewBox: '0 0 9 28',
            oX: 0,
            oY: -37,
            w: 10,
            h: 28,
            pvX: 0.5,
            pvY: 0.08,
            zIndex: 1,
            fill,
            stroke,
            ...overrides
        };
    }

    _sideForearmPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M2 0 Q6 0 7 3 L7 22 Q7 28 4 32 L2 32 Q0 32 0 28 L1 22 L1 4 Q1 1 2 0 Z',
            viewBox: '0 0 7 32',
            oX: 0,
            oY: -9,
            w: 8,
            h: 32,
            pvX: 0.5,
            pvY: 0.06,
            zIndex: 1.1,
            fill,
            stroke,
            ...overrides
        };
    }

    _frontArmPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M5 0 Q11 0 12 4 L12 24 Q12 31 9 37 L8 43 Q8 46 5 46 L3 46 Q0 46 0 43 L1 37 Q4 31 4 24 L4 4 Q4 1 5 0 Z',
            viewBox: '0 0 14 46',
            oX: 0,
            oY: -31,
            w: 12,
            h: 44,
            pvX: 0.5,
            pvY: 0.05,
            zIndex: 1,
            fill,
            stroke,
            ...overrides
        };
    }

    _frontUpperArmPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M3 0 Q8 0 9 3 L9 19 Q9 24 6 27 L4 27 Q1 27 1 23 L1 4 Q1 1 3 0 Z',
            viewBox: '0 0 10 27',
            oX: 0,
            oY: -38,
            w: 10,
            h: 27,
            pvX: 0.5,
            pvY: 0.08,
            zIndex: 1,
            fill,
            stroke,
            ...overrides
        };
    }

    _frontForearmPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M2 0 Q6 0 7 3 L7 18 Q7 24 5 29 L6 33 Q6 36 3 36 L2 36 Q0 36 0 33 L1 28 Q2 23 2 18 L2 4 Q2 1 2 0 Z',
            viewBox: '0 0 8 36',
            oX: 0,
            oY: -13,
            w: 8,
            h: 36,
            pvX: 0.5,
            pvY: 0.06,
            zIndex: 1.1,
            fill,
            stroke,
            ...overrides
        };
    }

    _sideLegPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M5 0 Q9 0 10 4 L10 18 Q10 30 8 42 L9 56 Q9 60 6 60 L4 60 Q1 60 1 56 L2 42 Q0 30 0 18 L0 4 Q1 0 5 0 Z',
            viewBox: '0 0 12 60',
            oX: 0,
            oY: 6,
            w: 14,
            h: 60,
            pvX: 0.5,
            pvY: 0.04,
            zIndex: 0,
            fill,
            stroke,
            ...overrides
        };
    }

    _sideThighPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M3 0 Q7 0 8 4 L8 24 Q8 30 5 34 L3 34 Q0 34 0 29 L0 4 Q1 0 3 0 Z',
            viewBox: '0 0 8 34',
            oX: 0,
            oY: 4,
            w: 11,
            h: 34,
            pvX: 0.5,
            pvY: 0.06,
            zIndex: 0,
            fill,
            stroke,
            ...overrides
        };
    }

    _sideShinPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M2 0 Q6 0 7 3 L7 24 Q7 31 5 37 L6 40 L1 40 Q0 40 0 36 L1 24 L0 4 Q1 0 2 0 Z',
            viewBox: '0 0 7 40',
            oX: 0,
            oY: 36,
            w: 9,
            h: 40,
            pvX: 0.5,
            pvY: 0.05,
            zIndex: 0.1,
            fill,
            stroke,
            ...overrides
        };
    }

    _frontLegPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M5 0 Q10 0 11 4 L11 19 Q11 31 9 44 L10 58 Q10 62 7 62 L5 62 Q2 62 2 58 L3 44 Q1 31 1 19 L1 4 Q2 0 5 0 Z',
            viewBox: '0 0 13 62',
            oX: 0,
            oY: 6,
            w: 14,
            h: 62,
            pvX: 0.5,
            pvY: 0.04,
            zIndex: 0,
            fill,
            stroke,
            ...overrides
        };
    }

    _frontThighPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M3 0 Q8 0 9 4 L9 24 Q9 31 6 36 L4 36 Q1 36 1 31 L1 4 Q1 0 3 0 Z',
            viewBox: '0 0 10 36',
            oX: 0,
            oY: 6,
            w: 10,
            h: 36,
            pvX: 0.5,
            pvY: 0.06,
            zIndex: 0,
            fill,
            stroke,
            ...overrides
        };
    }

    _frontShinPiece(name, fill, stroke, overrides = {}) {
        return {
            name,
            path: 'M2 0 Q6 0 7 3 L7 23 Q7 29 5 34 L6 38 Q6 41 3 41 L1 41 Q0 41 0 37 L1 33 Q2 28 2 23 L2 4 Q2 1 2 0 Z',
            viewBox: '0 0 8 41',
            oX: 0,
            oY: 35,
            w: 8,
            h: 41,
            pvX: 0.5,
            pvY: 0.05,
            zIndex: 0.1,
            fill,
            stroke,
            ...overrides
        };
    }

    _faceHeadBasePiece(overrides = {}) {
        return {
            name: 'Head Base',
            path: 'M30 56 Q17 56 10 46 Q4 38 4 26 Q4 15 12 7 Q19 0 30 0 Q41 0 48 7 Q56 15 56 26 Q56 38 50 46 Q43 56 30 56 Z',
            viewBox: '0 0 60 56',
            oX: 0,
            oY: 0,
            w: 58,
            h: 54,
            pvX: 0.5,
            pvY: 0.85,
            zIndex: 0,
            fill: '#e8b88a',
            stroke: '#c4956e',
            ...overrides
        };
    }

    _faceEyePiece(name, oX, oY = -7) {
        return {
            name,
            path: 'M2 16 Q8 6 18 6 Q28 6 34 16 Q28 25 18 25 Q8 25 2 16 Z M13 16 A4 4 0 1 0 13 15.9 Z',
            viewBox: '0 0 36 30',
            oX,
            oY,
            w: 15,
            h: 11,
            pvX: 0.5,
            pvY: 0.5,
            zIndex: 2,
            fill: '#ffffff',
            stroke: '#333333'
        };
    }

    _faceNosePiece(overrides = {}) {
        return {
            name: 'Nose',
            path: 'M10 2 L13 14 L7 14 Z',
            viewBox: '0 0 20 16',
            oX: 3,
            oY: 4,
            w: 8,
            h: 8,
            pvX: 0.5,
            pvY: 0.3,
            zIndex: 3,
            fill: '#d8aa84',
            stroke: '#b88662',
            ...overrides
        };
    }

    _faceMouthPiece(overrides = {}) {
        return {
            name: 'Mouth',
            path: 'M2 6 Q10 14 18 6',
            viewBox: '0 0 20 16',
            oX: 2,
            oY: 15,
            w: 14,
            h: 8,
            pvX: 0.5,
            pvY: 0.5,
            zIndex: 3,
            fill: 'transparent',
            stroke: '#8b4b4b',
            ...overrides
        };
    }

    _faceBrowPiece(name, path, oX) {
        return {
            name,
            path,
            viewBox: '0 0 26 12',
            oX,
            oY: -18,
            w: 16,
            h: 6,
            pvX: 0.5,
            pvY: 1.0,
            zIndex: 4,
            fill: '#6b4423',
            stroke: '#4a2f16'
        };
    }

    // ════════════════════════════════════════════════════
    //  MALE WALK — FRONT VIEW
    // ════════════════════════════════════════════════════
    _maleWalkFront() {
        return new AnimationPart({
            id: 'male-walk-front',
            type: 'character', subtype: 'male-front-walk',
            name: 'Male Walk (Front)',
            desc: 'Full male figure — front-view walk with alternating weight shift',
            category: 'characters',
            tags: ['male', 'walk', 'front', 'human'],
            preview: 'M22 4 A6 7 0 1 1 22 3.9 Z M16 16 L34 16 L34 36 L16 36 Z M10 18 L6 34 M40 18 L44 34 M18 36 L16 56 L14 64 M32 36 L34 56 L36 64',
            duration: 860,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: 0, bounce: 0.65, sway: 0, depthStrength: 0.5, scaleFrom: 0.93, scaleTo: 1.04, approachY: 8, depthProgressMode: 'pingpong' },
            pieces: [
                this._maleFrontHeadPiece(),
                this._maleFrontTorsoPiece(),
                this._frontArmPiece('Left Arm', '#e8b88a', '#c4956e', { oX: -19, zIndex: 2.6 }),
                this._frontArmPiece('Right Arm', '#e8b88a', '#c4956e', { oX: 19, zIndex: 2.7 }),
                this._frontLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -11, zIndex: 0 }),
                this._frontLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 11, zIndex: 0.5 }),
                this._frontNeckPiece(),
                this._frontShoulderPiece()
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:0.5, e:'easeInOut'}, {t:0.25, v:0.9}, {t:0.5, v:0}, {t:0.75, v:-0.9}, {t:1.0, v:0.5}],
                    _oX: [{t:0, v:-1.1, e:'easeInOut'}, {t:0.25, v:-0.2}, {t:0.5, v:1.1}, {t:0.75, v:0.2}, {t:1.0, v:-1.1}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-1.1}, {t:0.5, v:0.1}, {t:0.75, v:-1.0}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:-2.2, e:'easeInOut'}, {t:0.25, v:-0.8}, {t:0.5, v:2.2}, {t:0.75, v:0.8}, {t:1.0, v:-2.2}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-2.1}, {t:0.5, v:0.2}, {t:0.75, v:-2.1}, {t:1.0, v:0}],
                    _oX: [{t:0, v:-2.6, e:'easeInOut'}, {t:0.25, v:-0.4}, {t:0.5, v:2.6}, {t:0.75, v:0.4}, {t:1.0, v:-2.6}]
                },
                2: { rotation: [{t:0, v:13, e:'easeInOutCubic'}, {t:0.22, v:4}, {t:0.5, v:-13}, {t:0.78, v:-3}, {t:1.0, v:13}], _oX: [{t:0, v:-1.0, e:'easeInOut'}, {t:0.25, v:-2.0}, {t:0.5, v:0.8}, {t:0.75, v:1.4}, {t:1.0, v:-1.0}] },
                3: { rotation: [{t:0, v:-13, e:'easeInOutCubic'}, {t:0.22, v:-3}, {t:0.5, v:13}, {t:0.78, v:4}, {t:1.0, v:-13}], _oX: [{t:0, v:1.0, e:'easeInOut'}, {t:0.25, v:2.0}, {t:0.5, v:-0.8}, {t:0.75, v:-1.4}, {t:1.0, v:1.0}] },
                4: { rotation: [{t:0, v:-15, e:'easeInOutCubic'}, {t:0.22, v:-5}, {t:0.5, v:17}, {t:0.78, v:3}, {t:1.0, v:-15}], _oX: [{t:0, v:-1.6, e:'easeInOut'}, {t:0.25, v:-0.5}, {t:0.5, v:1.5}, {t:0.75, v:0.3}, {t:1.0, v:-1.6}] },
                5: { rotation: [{t:0, v:17, e:'easeInOutCubic'}, {t:0.22, v:3}, {t:0.5, v:-15}, {t:0.78, v:-5}, {t:1.0, v:17}], _oX: [{t:0, v:1.6, e:'easeInOut'}, {t:0.25, v:0.5}, {t:0.5, v:-1.5}, {t:0.75, v:-0.3}, {t:1.0, v:1.6}] },
                6: { _oX: [{t:0, v:-1.5, e:'easeInOut'}, {t:0.25, v:-0.3}, {t:0.5, v:1.5}, {t:0.75, v:0.3}, {t:1.0, v:-1.5}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-0.7}, {t:0.5, v:0}, {t:0.75, v:-0.7}, {t:1.0, v:0}] },
                7: { rotation: [{t:0, v:-1.6, e:'easeInOut'}, {t:0.25, v:-0.5}, {t:0.5, v:1.6}, {t:0.75, v:0.5}, {t:1.0, v:-1.6}], _oX: [{t:0, v:-2.1, e:'easeInOut'}, {t:0.25, v:-0.3}, {t:0.5, v:2.1}, {t:0.75, v:0.3}, {t:1.0, v:-2.1}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  FEMALE WALK — FRONT VIEW
    // ════════════════════════════════════════════════════
    _femaleWalkFront() {
        return new AnimationPart({
            id: 'female-walk-front',
            type: 'character', subtype: 'female-front-walk',
            name: 'Female Walk (Front)',
            desc: 'Full female figure — front-view walk with alternating weight shift',
            category: 'characters',
            tags: ['female', 'walk', 'front', 'human'],
            preview: 'M22 3 A5 6 0 1 1 22 2.9 Z M16 14 L34 14 Q35 28 30 34 L20 34 Q15 28 16 14 Z M10 16 L6 32 M40 16 L44 32 M18 34 L16 54 L14 63 M32 34 L34 54 L36 63',
            duration: 940,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: 0, bounce: 0.6, sway: 0, depthStrength: 0.5, scaleFrom: 0.93, scaleTo: 1.04, approachY: 8, depthProgressMode: 'pingpong' },
            pieces: [
                this._femaleFrontHeadPiece(),
                this._femaleFrontTorsoPiece(),
                this._frontArmPiece('Left Arm', '#f0c8a0', '#d4a87a', { oX: -18, zIndex: 2.6 }),
                this._frontArmPiece('Right Arm', '#f0c8a0', '#d4a87a', { oX: 18, zIndex: 2.7 }),
                this._frontLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -10, zIndex: 0 }),
                this._frontLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 10, zIndex: 0.5 }),
                this._frontNeckPiece({ fill: '#f0c8a0', stroke: '#d4a87a' }),
                this._frontShoulderPiece({ fill: '#d45d79', stroke: '#a94560' })
            ],
            keyframes: {
                0: { rotation: [{t:0, v:0.4, e:'easeInOut'}, {t:0.25, v:0.8}, {t:0.5, v:0}, {t:0.75, v:-0.8}, {t:1.0, v:0.4}], _oX: [{t:0, v:-1.0, e:'easeInOut'}, {t:0.25, v:-0.1}, {t:0.5, v:1.0}, {t:0.75, v:0.1}, {t:1.0, v:-1.0}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-1.0}, {t:0.5, v:0.1}, {t:0.75, v:-1.0}, {t:1.0, v:0}] },
                1: {
                    rotation: [{t:0, v:-1.8, e:'easeInOut'}, {t:0.25, v:-0.6}, {t:0.5, v:1.8}, {t:0.75, v:0.6}, {t:1.0, v:-1.8}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-1.9}, {t:0.5, v:0.2}, {t:0.75, v:-1.9}, {t:1.0, v:0}],
                    _oX: [{t:0, v:-2.2, e:'easeInOut'}, {t:0.25, v:-0.3}, {t:0.5, v:2.2}, {t:0.75, v:0.3}, {t:1.0, v:-2.2}]
                },
                2: { rotation: [{t:0, v:11, e:'easeInOutCubic'}, {t:0.22, v:3}, {t:0.5, v:-11}, {t:0.78, v:-3}, {t:1.0, v:11}], _oX: [{t:0, v:-0.9, e:'easeInOut'}, {t:0.25, v:-1.8}, {t:0.5, v:0.7}, {t:0.75, v:1.3}, {t:1.0, v:-0.9}] },
                3: { rotation: [{t:0, v:-11, e:'easeInOutCubic'}, {t:0.22, v:-3}, {t:0.5, v:11}, {t:0.78, v:3}, {t:1.0, v:-11}], _oX: [{t:0, v:0.9, e:'easeInOut'}, {t:0.25, v:1.8}, {t:0.5, v:-0.7}, {t:0.75, v:-1.3}, {t:1.0, v:0.9}] },
                4: { rotation: [{t:0, v:-13, e:'easeInOutCubic'}, {t:0.22, v:-4}, {t:0.5, v:15}, {t:0.78, v:3}, {t:1.0, v:-13}], _oX: [{t:0, v:-1.4, e:'easeInOut'}, {t:0.25, v:-0.4}, {t:0.5, v:1.3}, {t:0.75, v:0.2}, {t:1.0, v:-1.4}] },
                5: { rotation: [{t:0, v:15, e:'easeInOutCubic'}, {t:0.22, v:3}, {t:0.5, v:-13}, {t:0.78, v:-4}, {t:1.0, v:15}], _oX: [{t:0, v:1.4, e:'easeInOut'}, {t:0.25, v:0.4}, {t:0.5, v:-1.3}, {t:0.75, v:-0.2}, {t:1.0, v:1.4}] },
                6: { _oX: [{t:0, v:-1.3, e:'easeInOut'}, {t:0.25, v:-0.3}, {t:0.5, v:1.3}, {t:0.75, v:0.3}, {t:1.0, v:-1.3}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-0.7}, {t:0.5, v:0}, {t:0.75, v:-0.7}, {t:1.0, v:0}] },
                7: { rotation: [{t:0, v:-1.4, e:'easeInOut'}, {t:0.25, v:-0.4}, {t:0.5, v:1.4}, {t:0.75, v:0.4}, {t:1.0, v:-1.4}], _oX: [{t:0, v:-1.8, e:'easeInOut'}, {t:0.25, v:-0.2}, {t:0.5, v:1.8}, {t:0.75, v:0.2}, {t:1.0, v:-1.8}] }
            }
        });
    }

    _maleWalkSide() {
        return new AnimationPart({
            id: 'male-walk-side',
            type: 'character', subtype: 'male-side-walk',
            name: 'Male Walk (Side)',
            desc: 'Full male figure — side-view walk cycle',
            category: 'characters',
            tags: ['male', 'walk', 'side', 'human'],
            preview: 'M20 4 A6 7 0 1 1 20 3.9 Z M16 16 Q24 14 30 18 L29 36 L17 36 Z M13 18 L8 31 L6 41 M31 18 L35 30 L36 40 M18 36 L14 52 L11 64 M27 36 L30 51 L34 63',
            duration: 800,
            rootMotion: { enabled: true, speed: -75, bounce: 3, sway: 0 },
            skeleton: {
                root: { parent: null, pieces: [1] },
                head: { parent: 'root', pieces: [0] },
                backArm: { parent: 'root', pieces: [2] },
                frontArm: { parent: 'root', pieces: [3] },
                backLeg: { parent: 'root', pieces: [4] },
                frontLeg: { parent: 'root', pieces: [5] }
            },
            physics: { centerOfMass: { x: 0, y: -10 }, bounce: 3, sway: 0 },
            contactPoints: [
                { bone: 'backLeg', phase: 0, type: 'heel' },
                { bone: 'frontLeg', phase: 0.5, type: 'heel' }
            ],
            pieces: [
                this._maleSideHeadPiece(),
                this._maleSideTorsoPiece(),
                this._sideArmPiece('Back Arm', '#e8b88a', '#c4956e', { oX: -11, zIndex: 1 }),
                this._sideArmPiece('Front Arm', '#e8b88a', '#c4956e', { oX: 11, zIndex: 5.2 }),
                this._sideLegPiece('Back Leg', '#3a5a8a', '#2d4568', { oX: -8, zIndex: 0 }),
                this._sideLegPiece('Front Leg', '#3a5a8a', '#2d4568', { oX: 8, zIndex: 4.8 }),
                this._sideNeckPiece(),
                this._sideShoulderPiece()
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:0.6, e:'easeInOut'}, {t:0.25, v:-0.6}, {t:0.5, v:0.6}, {t:0.75, v:-0.6}, {t:1.0, v:0.6}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-0.8}, {t:0.25, v:0}, {t:0.625, v:-0.8}, {t:0.75, v:0}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:-2.8, e:'easeInOut'}, {t:0.25, v:-0.8}, {t:0.5, v:2.8}, {t:0.75, v:0.8}, {t:1.0, v:-2.8}],
                    _oX: [{t:0, v:-0.4, e:'easeInOut'}, {t:0.25, v:0.2}, {t:0.5, v:0.4}, {t:0.75, v:-0.2}, {t:1.0, v:-0.4}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                },
                2: { rotation: [{t:0, v:-26, e:'easeInOutCubic'}, {t:0.25, v:-8}, {t:0.5, v:18}, {t:0.75, v:5}, {t:1.0, v:-26}] },
                3: { rotation: [{t:0, v:18, e:'easeInOutCubic'}, {t:0.25, v:5}, {t:0.5, v:-26}, {t:0.75, v:-8}, {t:1.0, v:18}] },
                4: { rotation: [{t:0, v:22, e:'easeInOutCubic'}, {t:0.12, v:10}, {t:0.3, v:-6}, {t:0.5, v:-24}, {t:0.68, v:-12}, {t:0.82, v:5}, {t:1.0, v:22}] },
                5: { rotation: [{t:0, v:-24, e:'easeInOutCubic'}, {t:0.12, v:-12}, {t:0.3, v:5}, {t:0.5, v:22}, {t:0.68, v:10}, {t:0.82, v:-6}, {t:1.0, v:-24}] },
                6: {
                    rotation: [{t:0, v:-1, e:'easeInOut'}, {t:0.5, v:1}, {t:1.0, v:-1}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-0.7}, {t:0.25, v:0}, {t:0.625, v:-0.7}, {t:0.75, v:0}, {t:1.0, v:0}]
                },
                7: {
                    rotation: [{t:0, v:-1.6, e:'easeInOut'}, {t:0.5, v:1.6}, {t:1.0, v:-1.6}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-0.8}, {t:0.25, v:0}, {t:0.625, v:-0.8}, {t:0.75, v:0}, {t:1.0, v:0}]
                }
            }
        });
    }

    _femaleWalkSide() {
        return new AnimationPart({
            id: 'female-walk-side',
            type: 'character', subtype: 'female-side-walk',
            name: 'Female Walk (Side)',
            desc: 'Full female figure — side-view walk cycle',
            category: 'characters',
            tags: ['female', 'walk', 'side', 'human'],
            preview: 'M20 3 A5 6 0 1 1 20 2.9 Z M16 14 Q23 12 29 16 L28 34 L18 34 Q15 28 16 14 Z M13 16 L9 29 L7 39 M29 16 L33 28 L35 38 M18 34 L15 50 L12 62 M27 34 L30 49 L33 61',
            duration: 900,
            rootMotion: { enabled: true, speed: -70, bounce: 2.5, sway: 0 },
            skeleton: {
                root: { parent: null, pieces: [1] },
                head: { parent: 'root', pieces: [0] },
                backArm: { parent: 'root', pieces: [2] },
                frontArm: { parent: 'root', pieces: [3] },
                backLeg: { parent: 'root', pieces: [4] },
                frontLeg: { parent: 'root', pieces: [5] }
            },
            physics: { centerOfMass: { x: 0, y: -8 }, bounce: 2.5, sway: 0 },
            contactPoints: [
                { bone: 'backLeg', phase: 0, type: 'heel' },
                { bone: 'frontLeg', phase: 0.5, type: 'heel' }
            ],
            pieces: [
                this._femaleSideHeadPiece(),
                this._femaleSideTorsoPiece(),
                this._sideArmPiece('Back Arm', '#f0c8a0', '#d4a87a', { oX: -10, zIndex: 1 }),
                this._sideArmPiece('Front Arm', '#f0c8a0', '#d4a87a', { oX: 10, zIndex: 5.2 }),
                this._sideLegPiece('Back Leg', '#3a5a8a', '#2d4568', { oX: -7, zIndex: 0 }),
                this._sideLegPiece('Front Leg', '#3a5a8a', '#2d4568', { oX: 7, zIndex: 4.8 }),
                this._sideNeckPiece({ fill: '#f0c8a0', stroke: '#d4a87a' }),
                this._sideShoulderPiece({ fill: '#d45d79', stroke: '#a94560' })
            ],
            keyframes: {
                0: { rotation: [{t:0, v:0.3, e:'easeInOut'}, {t:0.25, v:-0.9}, {t:0.5, v:0.3}, {t:0.75, v:-0.9}, {t:1.0, v:0.3}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-1.2}, {t:0.25, v:0}, {t:0.625, v:-1.2}, {t:1.0, v:0}] },
                1: {
                    rotation: [{t:0, v:-1.6, e:'easeInOut'}, {t:0.25, v:0.2}, {t:0.5, v:1.6}, {t:0.75, v:-0.2}, {t:1.0, v:-1.6}],
                    _oX: [{t:0, v:-0.8, e:'easeInOut'}, {t:0.25, v:0.6}, {t:0.5, v:0.8}, {t:0.75, v:-0.6}, {t:1.0, v:-0.8}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.3}, {t:0.25, v:0}, {t:0.375, v:-2.3}, {t:0.5, v:0}, {t:0.625, v:-2.3}, {t:0.75, v:0}, {t:0.875, v:-2.3}, {t:1.0, v:0}]
                },
                2: { rotation: [{t:0, v:-20, e:'easeInOutCubic'}, {t:0.25, v:-6}, {t:0.5, v:15}, {t:0.75, v:4}, {t:1.0, v:-20}] },
                3: { rotation: [{t:0, v:15, e:'easeInOutCubic'}, {t:0.25, v:4}, {t:0.5, v:-20}, {t:0.75, v:-6}, {t:1.0, v:15}] },
                4: { rotation: [{t:0, v:16, e:'easeInOutCubic'}, {t:0.15, v:6}, {t:0.3, v:-3}, {t:0.5, v:-18}, {t:0.65, v:-9}, {t:0.8, v:3}, {t:1.0, v:16}] },
                5: { rotation: [{t:0, v:-18, e:'easeInOutCubic'}, {t:0.15, v:-9}, {t:0.3, v:3}, {t:0.5, v:16}, {t:0.65, v:6}, {t:0.8, v:-3}, {t:1.0, v:-18}] },
                6: { rotation: [{t:0, v:-0.8, e:'easeInOut'}, {t:0.5, v:0.8}, {t:1.0, v:-0.8}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-0.7}, {t:1.0, v:0}] },
                7: { rotation: [{t:0, v:-1.2, e:'easeInOut'}, {t:0.5, v:1.2}, {t:1.0, v:-1.2}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-0.9}, {t:1.0, v:0}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  MALE RUN — SIDE VIEW
    // ════════════════════════════════════════════════════
    _maleRunSide() {
        return new AnimationPart({
            id: 'male-run-side',
            type: 'character', subtype: 'male-side-run',
            name: 'Male Run (Side)',
            desc: 'Full male figure — side-view run cycle',
            category: 'characters',
            tags: ['male', 'run', 'side', 'human'],
            preview: 'M20 3 A5 6 0 1 1 20 2.9 Z M16 14 Q23 12 29 17 L28 34 L18 34 Q15 28 16 14 Z M11 16 L5 29 L2 36 M30 16 L35 24 L38 32 M18 34 L12 52 L9 63 M28 34 L34 46 L38 58',
            duration: 360,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: -286, bounce: 24, sway: 0 },
            pieces: [
                this._maleSideHeadPiece(),
                this._maleSideTorsoPiece(),
                this._sideArmPiece('Back Arm', '#e8b88a', '#c4956e', { oX: -10, zIndex: 1 }),
                this._sideArmPiece('Front Arm', '#e8b88a', '#c4956e', { oX: 10, zIndex: 5.2 }),
                this._sideLegPiece('Back Leg', '#3a5a8a', '#2d4568', { oX: -7, zIndex: 0 }),
                this._sideLegPiece('Front Leg', '#3a5a8a', '#2d4568', { oX: 7, zIndex: 4.8 }),
                this._sideNeckPiece(),
                this._sideShoulderPiece()
            ],
            keyframes: {
                // Head: stronger pitch and lift during airborne phases
                0: {
                    rotation: [{t:0, v:-14, e:'easeInOut'}, {t:0.12, v:-9}, {t:0.3, v:-18}, {t:0.5, v:-14}, {t:0.62, v:-9}, {t:0.8, v:-18}, {t:1.0, v:-14}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:3.5}, {t:0.3, v:-9}, {t:0.5, v:0}, {t:0.6, v:3.5}, {t:0.8, v:-9}, {t:1.0, v:0}]
                },
                // Torso: more forward drive and larger airborne rise than walk
                1: {
                    rotation: [{t:0, v:24, e:'easeInOut'}, {t:0.12, v:29}, {t:0.3, v:18}, {t:0.5, v:24}, {t:0.62, v:29}, {t:0.8, v:18}, {t:1.0, v:24}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:5}, {t:0.3, v:-14}, {t:0.5, v:0}, {t:0.6, v:5}, {t:0.8, v:-14}, {t:1.0, v:0}],
                    _oX: [{t:0, v:1.5, e:'easeInOut'}, {t:0.2, v:4.2}, {t:0.5, v:1.5}, {t:0.7, v:4.2}, {t:1.0, v:1.5}]
                },
                // Back Arm: hard sprint pump, quick reversal around mid-stride
                2: { rotation: [{t:0, v:-68, e:'easeInOutCubic'}, {t:0.16, v:-20}, {t:0.34, v:34}, {t:0.5, v:68}, {t:0.66, v:20}, {t:0.84, v:-34}, {t:1.0, v:-68}] },
                // Front Arm: opposite sprint pump
                3: { rotation: [{t:0, v:68, e:'easeInOutCubic'}, {t:0.16, v:20}, {t:0.34, v:-34}, {t:0.5, v:-68}, {t:0.66, v:-20}, {t:0.84, v:34}, {t:1.0, v:68}] },
                // Back Leg: strong push-off to forward knee drive
                4: { rotation: [{t:0, v:62, e:'easeInOutCubic'}, {t:0.14, v:26}, {t:0.3, v:-14}, {t:0.5, v:-54}, {t:0.64, v:-20}, {t:0.82, v:18}, {t:1.0, v:62}] },
                // Front Leg: opposite push-off / knee drive
                5: { rotation: [{t:0, v:-54, e:'easeInOutCubic'}, {t:0.14, v:-20}, {t:0.3, v:18}, {t:0.5, v:62}, {t:0.64, v:26}, {t:0.82, v:-14}, {t:1.0, v:-54}] },
                // Neck: slight fixed lean with larger airborne lift
                6: {
                    rotation: [{t:0, v:-9, e:'easeInOut'}, {t:1.0, v:-9}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-5.5}, {t:0.5, v:0}, {t:0.75, v:-5.5}, {t:1.0, v:0}]
                },
                // Shoulder: torso-driven rock that reads more like sprinting
                7: {
                    rotation: [{t:0, v:10, e:'easeInOut'}, {t:0.22, v:17}, {t:0.5, v:10}, {t:0.72, v:17}, {t:1.0, v:10}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-5.5}, {t:0.5, v:0}, {t:0.75, v:-5.5}, {t:1.0, v:0}]
                }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  FEMALE RUN — SIDE VIEW
    // ════════════════════════════════════════════════════
    _femaleRunSide() {
        return new AnimationPart({
            id: 'female-run-side',
            type: 'character', subtype: 'female-side-run',
            name: 'Female Run (Side)',
            desc: 'Full female figure — side-view run cycle',
            category: 'characters',
            tags: ['female', 'run', 'side', 'human'],
            preview: 'M20 3 A5 6 0 1 1 20 2.9 Z M16 14 Q23 12 29 17 L28 34 L18 34 Q15 28 16 14 Z M11 16 L5 29 L2 36 M30 16 L35 24 L38 32 M18 34 L12 52 L9 63 M28 34 L34 46 L38 58',
            duration: 370,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: -268, bounce: 20, sway: 0 },
            pieces: [
                this._femaleSideHeadPiece({ oX: 2 }),
                this._femaleSideTorsoPiece(),
                this._sideArmPiece('Back Arm', '#f0c8a0', '#d4a87a', { oX: -10, zIndex: 1 }),
                this._sideArmPiece('Front Arm', '#f0c8a0', '#d4a87a', { oX: 10, zIndex: 5.2 }),
                this._sideLegPiece('Back Leg', '#3a5a8a', '#2d4568', { oX: -7, zIndex: 0 }),
                this._sideLegPiece('Front Leg', '#3a5a8a', '#2d4568', { oX: 7, zIndex: 4.8 }),
                this._sideNeckPiece({ fill: '#f0c8a0', stroke: '#d4a87a', oX: 2 }),
                this._sideShoulderPiece({ fill: '#d45d79', stroke: '#a94560' })
            ],
            keyframes: {
                // Head: stronger pitch and lift during airborne phases
                0: {
                    rotation: [{t:0, v:-12, e:'easeInOut'}, {t:0.12, v:-8}, {t:0.3, v:-16}, {t:0.5, v:-12}, {t:0.62, v:-8}, {t:0.8, v:-16}, {t:1.0, v:-12}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:3}, {t:0.3, v:-7.5}, {t:0.5, v:0}, {t:0.6, v:3}, {t:0.8, v:-7.5}, {t:1.0, v:0}]
                },
                // Torso: more forward drive and larger airborne rise than walk
                1: {
                    rotation: [{t:0, v:22, e:'easeInOut'}, {t:0.12, v:26}, {t:0.3, v:17}, {t:0.5, v:22}, {t:0.62, v:26}, {t:0.8, v:17}, {t:1.0, v:22}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:4.2}, {t:0.3, v:-11.5}, {t:0.5, v:0}, {t:0.6, v:4.2}, {t:0.8, v:-11.5}, {t:1.0, v:0}],
                    _oX: [{t:0, v:1.2, e:'easeInOut'}, {t:0.2, v:3.6}, {t:0.5, v:1.2}, {t:0.7, v:3.6}, {t:1.0, v:1.2}]
                },
                // Back Arm: hard sprint pump, quick reversal around mid-stride
                2: { rotation: [{t:0, v:-62, e:'easeInOutCubic'}, {t:0.16, v:-18}, {t:0.34, v:30}, {t:0.5, v:62}, {t:0.66, v:18}, {t:0.84, v:-30}, {t:1.0, v:-62}] },
                // Front Arm: opposite sprint pump
                3: { rotation: [{t:0, v:62, e:'easeInOutCubic'}, {t:0.16, v:18}, {t:0.34, v:-30}, {t:0.5, v:-62}, {t:0.66, v:-18}, {t:0.84, v:30}, {t:1.0, v:62}] },
                // Back Leg: strong push-off to forward knee drive
                4: { rotation: [{t:0, v:56, e:'easeInOutCubic'}, {t:0.14, v:22}, {t:0.3, v:-12}, {t:0.5, v:-48}, {t:0.64, v:-18}, {t:0.82, v:16}, {t:1.0, v:56}] },
                // Front Leg: opposite push-off / knee drive
                5: { rotation: [{t:0, v:-48, e:'easeInOutCubic'}, {t:0.14, v:-18}, {t:0.3, v:16}, {t:0.5, v:56}, {t:0.64, v:22}, {t:0.82, v:-12}, {t:1.0, v:-48}] },
                // Neck: slight fixed lean with larger airborne lift
                6: {
                    rotation: [{t:0, v:-8, e:'easeInOut'}, {t:1.0, v:-8}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-4.6}, {t:0.5, v:0}, {t:0.75, v:-4.6}, {t:1.0, v:0}]
                },
                // Shoulder: torso-driven rock that reads more like sprinting
                7: {
                    rotation: [{t:0, v:9, e:'easeInOut'}, {t:0.22, v:15}, {t:0.5, v:9}, {t:0.72, v:15}, {t:1.0, v:9}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-4.6}, {t:0.5, v:0}, {t:0.75, v:-4.6}, {t:1.0, v:0}]
                }
            }
        });
    }

    _rodentWalkSide() {
        return new AnimationPart({
            id: 'rodent-walk-side',
            type: 'animal', subtype: 'rodent-walk-side',
            name: 'Rodent Walk (Side)',
            desc: 'Small rodent side-view walk cycle with tail drag and short steps',
            category: 'animal',
            tags: ['rodent', 'mouse', 'rat', 'walk', 'side'],
            preview: 'M10 32 Q18 18 34 18 Q48 18 56 28 Q60 32 60 38 Q60 46 52 50 Q40 56 25 54 Q12 52 9 42 M8 38 L1 42 M57 26 L64 21 M56 34 Q68 30 76 35',
            duration: 760,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: -108, bounce: 0.9, sway: 0 },
            pieces: [
                { name: 'Tail', path: 'M2 12 Q18 2 34 8 Q52 15 70 10', viewBox: '0 0 72 22', oX: 36, oY: -2, w: 66, h: 18, pvX: 0.04, pvY: 0.55, zIndex: 0, fill: 'none', stroke: '#8b6a57', strokeWidth: 3 },
                { name: 'Body', path: 'M8 22 Q18 10 34 9 Q55 8 68 18 Q76 24 76 34 Q76 44 68 50 Q56 58 36 58 Q20 58 10 50 Q4 45 4 36 Q4 28 8 22 Z', viewBox: '0 0 80 62', oX: 3, oY: 2, w: 78, h: 42, pvX: 0.48, pvY: 0.55, zIndex: 2, fill: '#8f8a84', stroke: '#625e58' },
                { name: 'Head', path: 'M10 18 Q18 8 34 8 Q46 8 54 16 Q58 21 58 28 Q58 38 49 44 Q42 49 31 49 Q18 49 10 41 Q4 35 4 28 Q4 23 10 18 Z M43 12 L50 5 L51 16', viewBox: '0 0 62 52', oX: -27, oY: -5, w: 38, h: 28, pvX: 0.65, pvY: 0.65, zIndex: 3.2, fill: '#9a958f', stroke: '#625e58' },
                this._sideLegPiece('Back Leg', '#7e7973', '#5f5a55', { oX: 17, oY: 17, w: 11, h: 21, zIndex: 1 }),
                this._sideLegPiece('Front Leg', '#7e7973', '#5f5a55', { oX: -7, oY: 16, w: 10, h: 20, zIndex: 4.1 }),
                this._sideArmPiece('Back Foreleg', '#8a847d', '#625e58', { oX: 5, oY: 14, w: 9, h: 17, zIndex: 1.2 }),
                this._sideArmPiece('Front Foreleg', '#8a847d', '#625e58', { oX: -18, oY: 14, w: 8, h: 16, zIndex: 4.3 })
            ],
            keyframes: {
                0: { rotation: [{t:0, v:2, e:'easeInOut'}, {t:0.35, v:-3}, {t:0.68, v:-4}, {t:1.0, v:2}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.34, v:0.6}, {t:0.68, v:0.2}, {t:1.0, v:0}] },
                1: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:-0.4}, {t:0.42, v:0}, {t:0.66, v:-0.5}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:2, e:'easeInOut'}, {t:0.4, v:-2}, {t:0.72, v:-1}, {t:1.0, v:2}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.36, v:-0.6}, {t:0.72, v:-0.3}, {t:1.0, v:0}] },
                3: { rotation: [{t:0, v:12, e:'easeInOutCubic'}, {t:0.22, v:-4}, {t:0.46, v:-15}, {t:0.72, v:7}, {t:1.0, v:12}] },
                4: { rotation: [{t:0, v:-10, e:'easeInOutCubic'}, {t:0.22, v:8}, {t:0.46, v:15}, {t:0.72, v:-4}, {t:1.0, v:-10}] },
                5: { rotation: [{t:0, v:-7, e:'easeInOutCubic'}, {t:0.22, v:6}, {t:0.46, v:11}, {t:0.72, v:-3}, {t:1.0, v:-7}] },
                6: { rotation: [{t:0, v:9, e:'easeInOutCubic'}, {t:0.22, v:-5}, {t:0.46, v:-12}, {t:0.72, v:4}, {t:1.0, v:9}] }
            }
        });
    }

    _rodentWalkFront() {
        return new AnimationPart({
            id: 'rodent-walk-front',
            type: 'animal', subtype: 'rodent-walk-front',
            name: 'Rodent Walk (Front)',
            desc: 'Rodent front-view walk with alternating weight shift',
            category: 'animal',
            tags: ['rodent', 'mouse', 'rat', 'walk', 'front'],
            preview: 'M30 10 Q18 10 12 18 Q8 24 8 32 Q8 46 18 54 Q22 57 30 57 Q38 57 42 54 Q52 46 52 32 Q52 24 48 18 Q42 10 30 10 M15 32 L12 48 M45 32 L48 48 M22 40 L20 58 M38 40 L40 58',
            duration: 780,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: 0, bounce: 0.45, sway: 0.35, depthStrength: 0, scaleFrom: 1, scaleTo: 1, approachY: 0, depthProgressMode: 'pingpong' },
            pieces: [
                { name: 'Tail', path: 'M30 0 Q25 12 28 26', viewBox: '0 0 40 28', oX: 0, oY: 16, w: 16, h: 18, pvX: 0.5, pvY: 0.0, zIndex: 0, fill: 'none', stroke: '#8b6a57', strokeWidth: 3 },
                { name: 'Body', path: 'M10 20 Q16 8 30 8 Q44 8 50 20 Q54 28 54 38 Q54 50 44 56 Q37 61 30 61 Q23 61 16 56 Q6 50 6 38 Q6 28 10 20 Z', viewBox: '0 0 60 66', oX: 0, oY: 1, w: 60, h: 48, pvX: 0.5, pvY: 0.48, zIndex: 2, fill: '#8f8a84', stroke: '#625e58' },
                { name: 'Head', path: 'M12 18 Q18 8 30 8 Q42 8 48 18 Q52 24 52 32 Q52 41 45 47 Q39 52 30 52 Q21 52 15 47 Q8 41 8 32 Q8 24 12 18 Z M19 12 L14 4 M41 12 L46 4', viewBox: '0 0 60 56', oX: 0, oY: -24, w: 38, h: 34, pvX: 0.5, pvY: 0.72, zIndex: 3, fill: '#9a958f', stroke: '#625e58' },
                this._frontArmPiece('Left Foreleg', '#8a847d', '#625e58', { oX: -13, oY: 12, w: 8, h: 17, zIndex: 1 }),
                this._frontArmPiece('Right Foreleg', '#8a847d', '#625e58', { oX: 13, oY: 12, w: 8, h: 17, zIndex: 5 }),
                this._frontLegPiece('Left Hind Leg', '#7e7973', '#5f5a55', { oX: -8, oY: 17, w: 10, h: 19, zIndex: 1.2 }),
                this._frontLegPiece('Right Hind Leg', '#7e7973', '#5f5a55', { oX: 8, oY: 17, w: 10, h: 19, zIndex: 4.8 })
            ],
            keyframes: {
                0: { _oX: [{t:0, v:-0.6, e:'easeInOut'}, {t:0.25, v:-0.1}, {t:0.5, v:0.6}, {t:0.75, v:0.1}, {t:1.0, v:-0.6}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-0.4}, {t:0.5, v:0.1}, {t:0.75, v:-0.4}, {t:1.0, v:0}] },
                1: { _oX: [{t:0, v:-1.2, e:'easeInOut'}, {t:0.25, v:-0.2}, {t:0.5, v:1.2}, {t:0.75, v:0.2}, {t:1.0, v:-1.2}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-0.8}, {t:0.5, v:0.1}, {t:0.75, v:-0.8}, {t:1.0, v:0}] },
                2: { scaleX: [{t:0, v:1, e:'easeInOut'}, {t:0.25, v:0.985}, {t:0.5, v:1}, {t:0.75, v:0.985}, {t:1.0, v:1}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-0.35}, {t:0.5, v:0}, {t:0.75, v:-0.35}, {t:1.0, v:0}] },
                3: { rotation: [{t:0, v:-10, e:'easeInOutCubic'}, {t:0.22, v:-2}, {t:0.5, v:11}, {t:0.78, v:2}, {t:1.0, v:-10}], _oX: [{t:0, v:-0.7, e:'easeInOut'}, {t:0.25, v:-1.1}, {t:0.5, v:0.5}, {t:0.75, v:0.9}, {t:1.0, v:-0.7}] },
                4: { rotation: [{t:0, v:11, e:'easeInOutCubic'}, {t:0.22, v:2}, {t:0.5, v:-10}, {t:0.78, v:-2}, {t:1.0, v:11}], _oX: [{t:0, v:0.7, e:'easeInOut'}, {t:0.25, v:1.1}, {t:0.5, v:-0.5}, {t:0.75, v:-0.9}, {t:1.0, v:0.7}] },
                5: { rotation: [{t:0, v:9, e:'easeInOutCubic'}, {t:0.22, v:2}, {t:0.5, v:-8}, {t:0.78, v:-2}, {t:1.0, v:9}], _oX: [{t:0, v:1.0, e:'easeInOut'}, {t:0.25, v:0.2}, {t:0.5, v:-0.9}, {t:0.75, v:-0.1}, {t:1.0, v:1.0}] },
                6: { rotation: [{t:0, v:-8, e:'easeInOutCubic'}, {t:0.22, v:-2}, {t:0.5, v:9}, {t:0.78, v:2}, {t:1.0, v:-8}], _oX: [{t:0, v:-1.0, e:'easeInOut'}, {t:0.25, v:-0.2}, {t:0.5, v:0.9}, {t:0.75, v:0.1}, {t:1.0, v:-1.0}] }
            }
        });
    }

    _rodentRunSide() {
        return new AnimationPart({
            id: 'rodent-run-side',
            type: 'animal', subtype: 'rodent-run-side',
            name: 'Rodent Run (Side)',
            desc: 'Small rodent side-view run cycle with quicker compressed strides',
            category: 'animal',
            tags: ['rodent', 'mouse', 'rat', 'run', 'side'],
            preview: 'M10 32 Q18 18 34 18 Q48 18 56 28 Q60 32 60 38 Q60 46 52 50 Q40 56 25 54 Q12 52 9 42 M8 38 L1 42 M57 26 L64 21 M56 34 Q68 30 76 35',
            duration: 460,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: -182, bounce: 1.4, sway: 0 },
            pieces: [
                { name: 'Tail', path: 'M2 12 Q18 0 34 6 Q54 12 72 8', viewBox: '0 0 74 22', oX: 36, oY: -1, w: 68, h: 18, pvX: 0.04, pvY: 0.55, zIndex: 0, fill: 'none', stroke: '#8b6a57', strokeWidth: 3 },
                { name: 'Body', path: 'M8 23 Q18 10 35 10 Q58 9 70 20 Q78 27 78 36 Q78 45 70 50 Q57 57 36 57 Q19 57 9 50 Q4 46 4 37 Q4 29 8 23 Z', viewBox: '0 0 82 60', oX: 2, oY: 2, w: 80, h: 40, pvX: 0.47, pvY: 0.55, zIndex: 2, fill: '#8f8a84', stroke: '#625e58' },
                { name: 'Head', path: 'M10 18 Q18 8 34 8 Q47 8 55 16 Q60 22 60 30 Q60 39 51 45 Q44 50 32 50 Q19 50 10 42 Q4 36 4 29 Q4 23 10 18 Z M46 12 L53 4 L54 16', viewBox: '0 0 64 54', oX: -29, oY: -6, w: 40, h: 29, pvX: 0.66, pvY: 0.66, zIndex: 3.2, fill: '#9a958f', stroke: '#625e58' },
                this._sideLegPiece('Back Leg', '#7e7973', '#5f5a55', { oX: 19, oY: 17, w: 10, h: 19, zIndex: 1 }),
                this._sideLegPiece('Front Leg', '#7e7973', '#5f5a55', { oX: -6, oY: 16, w: 9, h: 18, zIndex: 4.1 }),
                this._sideArmPiece('Back Foreleg', '#8a847d', '#625e58', { oX: 6, oY: 14, w: 8, h: 15, zIndex: 1.2 }),
                this._sideArmPiece('Front Foreleg', '#8a847d', '#625e58', { oX: -19, oY: 14, w: 7, h: 14, zIndex: 4.3 })
            ],
            keyframes: {
                0: { rotation: [{t:0, v:5, e:'easeInOut'}, {t:0.24, v:-3}, {t:0.48, v:-6}, {t:0.72, v:2}, {t:1.0, v:5}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.26, v:0.4}, {t:0.5, v:0.1}, {t:0.74, v:0.5}, {t:1.0, v:0}] },
                1: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:-0.5}, {t:0.42, v:0}, {t:0.66, v:-0.6}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:3, e:'easeInOut'}, {t:0.24, v:-2}, {t:0.5, v:-4}, {t:0.76, v:2}, {t:1.0, v:3}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.24, v:-0.6}, {t:0.5, v:-0.3}, {t:0.76, v:-0.5}, {t:1.0, v:0}] },
                3: { rotation: [{t:0, v:18, e:'easeInOutCubic'}, {t:0.18, v:-2}, {t:0.38, v:-18}, {t:0.62, v:8}, {t:0.82, v:13}, {t:1.0, v:18}] },
                4: { rotation: [{t:0, v:-14, e:'easeInOutCubic'}, {t:0.18, v:8}, {t:0.38, v:19}, {t:0.62, v:-4}, {t:0.82, v:-9}, {t:1.0, v:-14}] },
                5: { rotation: [{t:0, v:-10, e:'easeInOutCubic'}, {t:0.18, v:6}, {t:0.38, v:15}, {t:0.62, v:-3}, {t:0.82, v:-7}, {t:1.0, v:-10}] },
                6: { rotation: [{t:0, v:14, e:'easeInOutCubic'}, {t:0.18, v:-3}, {t:0.38, v:-16}, {t:0.62, v:6}, {t:0.82, v:10}, {t:1.0, v:14}] }
            }
        });
    }

    _rodentRunFront() {
        return new AnimationPart({
            id: 'rodent-run-front',
            type: 'animal', subtype: 'rodent-run-front',
            name: 'Rodent Run (Front)',
            desc: 'Rodent front-view run approaching the viewer without reversing back',
            category: 'animal',
            tags: ['rodent', 'mouse', 'rat', 'run', 'front'],
            preview: 'M30 10 Q18 10 12 18 Q8 24 8 32 Q8 46 18 54 Q22 57 30 57 Q38 57 42 54 Q52 46 52 32 Q52 24 48 18 Q42 10 30 10 M15 32 L12 48 M45 32 L48 48 M22 40 L20 58 M38 40 L40 58',
            duration: 470,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: 0, bounce: 0.8, sway: 0.55, depthStrength: 0, scaleFrom: 1, scaleTo: 1, approachY: 0, depthProgressMode: 'pingpong' },
            pieces: [
                { name: 'Tail', path: 'M30 0 Q25 11 28 24', viewBox: '0 0 40 28', oX: 0, oY: 16, w: 16, h: 17, pvX: 0.5, pvY: 0.0, zIndex: 0, fill: 'none', stroke: '#8b6a57', strokeWidth: 3 },
                { name: 'Body', path: 'M10 20 Q16 8 30 8 Q44 8 50 20 Q54 27 54 36 Q54 48 45 55 Q38 60 30 60 Q22 60 15 55 Q6 48 6 36 Q6 27 10 20 Z', viewBox: '0 0 60 64', oX: 0, oY: 1, w: 60, h: 46, pvX: 0.5, pvY: 0.48, zIndex: 2, fill: '#8f8a84', stroke: '#625e58' },
                { name: 'Head', path: 'M12 18 Q18 8 30 8 Q42 8 48 18 Q52 24 52 32 Q52 40 45 46 Q39 51 30 51 Q21 51 15 46 Q8 40 8 32 Q8 24 12 18 Z M19 12 L14 4 M41 12 L46 4', viewBox: '0 0 60 54', oX: 0, oY: -24, w: 38, h: 33, pvX: 0.5, pvY: 0.72, zIndex: 3, fill: '#9a958f', stroke: '#625e58' },
                this._frontArmPiece('Left Foreleg', '#8a847d', '#625e58', { oX: -13, oY: 12, w: 8, h: 15, zIndex: 1 }),
                this._frontArmPiece('Right Foreleg', '#8a847d', '#625e58', { oX: 13, oY: 12, w: 8, h: 15, zIndex: 5 }),
                this._frontLegPiece('Left Hind Leg', '#7e7973', '#5f5a55', { oX: -8, oY: 17, w: 9, h: 17, zIndex: 1.2 }),
                this._frontLegPiece('Right Hind Leg', '#7e7973', '#5f5a55', { oX: 8, oY: 17, w: 9, h: 17, zIndex: 4.8 })
            ],
            keyframes: {
                0: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.24, v:-0.6}, {t:0.52, v:0}, {t:0.76, v:-0.5}, {t:1.0, v:0}] },
                1: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.24, v:-0.4}, {t:0.52, v:0}, {t:0.76, v:-0.3}, {t:1.0, v:0}] },
                2: { scaleX: [{t:0, v:1, e:'easeInOut'}, {t:0.34, v:0.985}, {t:0.68, v:0.975}, {t:1.0, v:1}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.28, v:-0.7}, {t:0.72, v:-0.4}, {t:1.0, v:0}] },
                3: { rotation: [{t:0, v:-14, e:'easeInOutCubic'}, {t:0.18, v:4}, {t:0.4, v:16}, {t:0.64, v:-3}, {t:0.84, v:-10}, {t:1.0, v:-14}] },
                4: { rotation: [{t:0, v:16, e:'easeInOutCubic'}, {t:0.18, v:-4}, {t:0.4, v:-14}, {t:0.64, v:4}, {t:0.84, v:11}, {t:1.0, v:16}] },
                5: { rotation: [{t:0, v:11, e:'easeInOutCubic'}, {t:0.18, v:-3}, {t:0.4, v:-12}, {t:0.64, v:3}, {t:0.84, v:8}, {t:1.0, v:11}] },
                6: { rotation: [{t:0, v:-12, e:'easeInOutCubic'}, {t:0.18, v:3}, {t:0.4, v:11}, {t:0.64, v:-3}, {t:0.84, v:-8}, {t:1.0, v:-12}] }
            }
        });
    }

    _babyCrawl() {
        return new AnimationPart({
            id: 'baby-crawl',
            type: 'character', subtype: 'baby-crawl-side',
            name: 'Baby Crawl',
            desc: 'A low, drag-heavy baby crawl in side view with staggered limb pulls',
            category: 'characters',
            tags: ['baby', 'crawl', 'side', 'human'],
            preview: 'M18 14 A7 8 0 1 1 18 13.9 Z M17 23 Q25 18 34 22 Q39 26 39 33 L18 33 Q14 29 17 23 Z M16 30 L10 39 L8 45 M32 30 L37 38 L40 44 M21 33 L16 42 L13 48 M31 33 L34 42 L37 47',
            duration: 1960,
            rootMotion: { enabled: true, speed: -14, bounce: 0.08, sway: 0.35 },
            pieces: [
                this._maleSideHeadPiece({ oX: -14, oY: -31, w: 31, h: 33 }),
                { name: 'Body', path: 'M8 14 Q17 8 30 9 Q39 10 45 16 Q49 20 49 26 Q49 33 42 37 Q35 40 24 40 Q13 40 7 36 Q3 33 3 26 Q3 19 8 14 Z', viewBox: '0 0 52 42', oX: 6, oY: -4, w: 48, h: 21, pvX: 0.3, pvY: 0.58, zIndex: 2, fill: '#7bb0e8', stroke: '#4f7fb3' },
                this._sideArmPiece('Back Arm', '#f0c8a0', '#d4a87a', { oX: -8, oY: 10, w: 8, h: 19, zIndex: 1 }),
                this._sideArmPiece('Front Arm', '#f0c8a0', '#d4a87a', { oX: 17, oY: 10, w: 8, h: 19, zIndex: 4.2 }),
                this._sideLegPiece('Back Leg', '#8ea7c5', '#687d96', { oX: 1, oY: 16, w: 8, h: 21, zIndex: 0 }),
                this._sideLegPiece('Front Leg', '#8ea7c5', '#687d96', { oX: 18, oY: 16, w: 8, h: 21, zIndex: 5 }),
                this._sideNeckPiece({ oX: -5, oY: -18, w: 5, h: 10, zIndex: 2.15 }),
                this._sideShoulderPiece({ oX: 1, oY: -12, w: 22, h: 6, zIndex: 2.25, fill: '#7bb0e8', stroke: '#4f7fb3' })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:16, e:'easeInOut'}, {t:0.18, v:13}, {t:0.38, v:9}, {t:0.62, v:12}, {t:0.82, v:17}, {t:1.0, v:16}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.2, v:0.6}, {t:0.5, v:-0.4}, {t:0.78, v:0.3}, {t:1.0, v:0}],
                    _oX: [{t:0, v:0, e:'easeInOut'}, {t:0.24, v:-0.7}, {t:0.56, v:0.8}, {t:0.84, v:-0.2}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:8, e:'easeInOut'}, {t:0.18, v:11}, {t:0.36, v:6}, {t:0.56, v:3}, {t:0.78, v:9}, {t:1.0, v:8}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:0.8}, {t:0.42, v:1.1}, {t:0.66, v:-0.6}, {t:0.86, v:0.5}, {t:1.0, v:0}],
                    _oX: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:-1.4}, {t:0.42, v:-0.2}, {t:0.68, v:1.8}, {t:0.9, v:0.4}, {t:1.0, v:0}],
                    scaleX: [{t:0, v:1, e:'easeInOut'}, {t:0.38, v:0.985}, {t:0.66, v:1.02}, {t:1.0, v:1}]
                },
                2: {
                    rotation: [{t:0, v:38, e:'easeInOutCubic'}, {t:0.16, v:22}, {t:0.34, v:6}, {t:0.58, v:-10}, {t:0.78, v:12}, {t:1.0, v:38}],
                    _oX: [{t:0, v:-1.5, e:'easeInOut'}, {t:0.22, v:-0.5}, {t:0.52, v:2.2}, {t:0.78, v:0.3}, {t:1.0, v:-1.5}],
                    _oY: [{t:0, v:0.4, e:'easeInOut'}, {t:0.26, v:1.2}, {t:0.56, v:-0.8}, {t:0.82, v:0.2}, {t:1.0, v:0.4}]
                },
                3: {
                    rotation: [{t:0, v:-8, e:'easeInOutCubic'}, {t:0.18, v:6}, {t:0.36, v:22}, {t:0.6, v:30}, {t:0.82, v:4}, {t:1.0, v:-8}],
                    _oX: [{t:0, v:1.8, e:'easeInOut'}, {t:0.2, v:-0.4}, {t:0.46, v:-1.8}, {t:0.74, v:0.8}, {t:1.0, v:1.8}],
                    _oY: [{t:0, v:-0.4, e:'easeInOut'}, {t:0.22, v:0.3}, {t:0.52, v:1.2}, {t:0.78, v:-0.8}, {t:1.0, v:-0.4}]
                },
                4: {
                    rotation: [{t:0, v:24, e:'easeInOutCubic'}, {t:0.14, v:12}, {t:0.34, v:-4}, {t:0.56, v:-18}, {t:0.8, v:8}, {t:1.0, v:24}],
                    _oX: [{t:0, v:-0.6, e:'easeInOut'}, {t:0.22, v:0.8}, {t:0.52, v:1.8}, {t:0.8, v:-0.4}, {t:1.0, v:-0.6}],
                    _oY: [{t:0, v:0.8, e:'easeInOut'}, {t:0.24, v:1.4}, {t:0.52, v:-0.6}, {t:0.8, v:0.3}, {t:1.0, v:0.8}]
                },
                5: {
                    rotation: [{t:0, v:-4, e:'easeInOutCubic'}, {t:0.16, v:8}, {t:0.34, v:21}, {t:0.56, v:28}, {t:0.78, v:2}, {t:1.0, v:-4}],
                    _oX: [{t:0, v:1.5, e:'easeInOut'}, {t:0.18, v:0.1}, {t:0.46, v:-1.4}, {t:0.72, v:0.6}, {t:1.0, v:1.5}],
                    _oY: [{t:0, v:-0.4, e:'easeInOut'}, {t:0.22, v:0.4}, {t:0.52, v:1.0}, {t:0.78, v:-0.7}, {t:1.0, v:-0.4}]
                },
                6: { rotation: [{t:0, v:6, e:'easeInOut'}, {t:0.22, v:8}, {t:0.5, v:3}, {t:0.76, v:5}, {t:1.0, v:6}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-0.2}, {t:1.0, v:0}] },
                7: { rotation: [{t:0, v:3, e:'easeInOut'}, {t:0.24, v:5}, {t:0.5, v:1}, {t:0.76, v:2}, {t:1.0, v:3}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-0.2}, {t:1.0, v:0}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  STANDALONE LIMBS
    // ════════════════════════════════════════════════════
    _legsWalkSide() {
        return new AnimationPart({
            id: 'legs-walk-side',
            type: 'limb', subtype: 'legs-side-walk',
            name: 'Legs Walk (Side)',
            desc: 'Two side-view legs replicating the full-character walk cycle',
            category: 'limbs',
            tags: ['legs', 'walk', 'side'],
            preview: 'M18 5 L18 50 L12 58 M32 5 L32 50 L38 58',
            duration: 800,
            rootMotion: { enabled: true, speed: -75, bounce: 3, sway: 0 },
            pieces: [
                this._sideLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -8, zIndex: 0 }),
                this._sideLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 8, zIndex: 1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:22, e:'easeInOutCubic'}, {t:0.12, v:10}, {t:0.3, v:-6}, {t:0.5, v:-24}, {t:0.68, v:-12}, {t:0.82, v:5}, {t:1.0, v:22}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:-24, e:'easeInOutCubic'}, {t:0.12, v:-12}, {t:0.3, v:5}, {t:0.5, v:22}, {t:0.68, v:10}, {t:0.82, v:-6}, {t:1.0, v:-24}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                }
            }
        });
    }

    _legsWalkSideSegmented() {
        return new AnimationPart({
            id: 'legs-walk-side-segmented',
            type: 'limb', subtype: 'legs-side-walk-segmented',
            name: 'Legs Walk (Side, Segmented)',
            desc: 'Two side-view legs with articulated knees replicating the full-character walk',
            category: 'limbs',
            tags: ['legs', 'walk', 'side', 'segmented'],
            preview: 'M18 6 L18 29 L14 52 M32 6 L32 29 L36 52',
            duration: 800,
            rootMotion: { enabled: true, speed: -75, bounce: 3, sway: 0 },
            pieces: [
                this._sideThighPiece('Left Thigh', '#3a5a8a', '#2d4568', { oX: -8, zIndex: 0 }),
                this._sideShinPiece('Left Shin', '#3a5a8a', '#2d4568', { oX: -8, zIndex: 0.1 }),
                this._sideThighPiece('Right Thigh', '#3a5a8a', '#2d4568', { oX: 8, zIndex: 1 }),
                this._sideShinPiece('Right Shin', '#3a5a8a', '#2d4568', { oX: 8, zIndex: 1.1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:22, e:'easeInOutCubic'}, {t:0.12, v:10}, {t:0.3, v:-6}, {t:0.5, v:-24}, {t:0.68, v:-12}, {t:0.82, v:5}, {t:1.0, v:22}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:4, e:'easeInOutCubic'}, {t:0.12, v:1}, {t:0.3, v:-10}, {t:0.5, v:-22}, {t:0.68, v:-9}, {t:0.82, v:3}, {t:1.0, v:4}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-1.8}, {t:0.25, v:0}, {t:0.375, v:-1.8}, {t:0.5, v:0}, {t:0.625, v:-1.8}, {t:0.75, v:0}, {t:0.875, v:-1.8}, {t:1.0, v:0}]
                },
                2: {
                    rotation: [{t:0, v:-24, e:'easeInOutCubic'}, {t:0.12, v:-12}, {t:0.3, v:5}, {t:0.5, v:22}, {t:0.68, v:10}, {t:0.82, v:-6}, {t:1.0, v:-24}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                },
                3: {
                    rotation: [{t:0, v:-22, e:'easeInOutCubic'}, {t:0.12, v:-9}, {t:0.3, v:3}, {t:0.5, v:4}, {t:0.68, v:1}, {t:0.82, v:-10}, {t:1.0, v:-22}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-1.8}, {t:0.25, v:0}, {t:0.375, v:-1.8}, {t:0.5, v:0}, {t:0.625, v:-1.8}, {t:0.75, v:0}, {t:0.875, v:-1.8}, {t:1.0, v:0}]
                }
            }
        });
    }

    _legsWalkFront() {
        return new AnimationPart({
            id: 'legs-walk-front',
            type: 'limb', subtype: 'legs-front-walk',
            name: 'Legs Walk (Front)',
            desc: 'Two front-view legs replicating the full-character front walk',
            category: 'limbs',
            tags: ['legs', 'walk', 'front'],
            preview: 'M16 5 L16 50 L12 58 M34 5 L34 50 L38 58',
            duration: 860,
            rootMotion: { enabled: true, speed: 0, bounce: 0.65, sway: 0, depthStrength: 0.5, scaleFrom: 0.93, scaleTo: 1.04, approachY: 8, depthProgressMode: 'pingpong' },
            pieces: [
                this._frontLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -11, zIndex: 0 }),
                this._frontLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 11, zIndex: 0.5 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:-15, e:'easeInOutCubic'}, {t:0.22, v:-5}, {t:0.5, v:17}, {t:0.78, v:3}, {t:1.0, v:-15}],
                    _oX: [{t:0, v:-1.6, e:'easeInOut'}, {t:0.25, v:-0.5}, {t:0.5, v:1.5}, {t:0.75, v:0.3}, {t:1.0, v:-1.6}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-2.1}, {t:0.5, v:0.2}, {t:0.75, v:-2.1}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:17, e:'easeInOutCubic'}, {t:0.22, v:3}, {t:0.5, v:-15}, {t:0.78, v:-5}, {t:1.0, v:17}],
                    _oX: [{t:0, v:1.6, e:'easeInOut'}, {t:0.25, v:0.5}, {t:0.5, v:-1.5}, {t:0.75, v:-0.3}, {t:1.0, v:1.6}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-2.1}, {t:0.5, v:0.2}, {t:0.75, v:-2.1}, {t:1.0, v:0}]
                }
            }
        });
    }

    _legsRunSide() {
        return new AnimationPart({
            id: 'legs-run-side',
            type: 'limb', subtype: 'legs-side-run',
            name: 'Legs Run (Side)',
            desc: 'Two side-view running legs replicating the full-character run cycle',
            category: 'limbs',
            tags: ['legs', 'run', 'side'],
            preview: 'M16 5 L10 50 L6 58 M34 5 L40 50 L44 58',
            duration: 360,
            rootMotion: { enabled: true, speed: -286, bounce: 24, sway: 0 },
            pieces: [
                this._sideLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -7, zIndex: 0 }),
                this._sideLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 7, zIndex: 1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:62, e:'easeInOutCubic'}, {t:0.14, v:26}, {t:0.3, v:-14}, {t:0.5, v:-54}, {t:0.64, v:-20}, {t:0.82, v:18}, {t:1.0, v:62}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:5}, {t:0.3, v:-14}, {t:0.5, v:0}, {t:0.6, v:5}, {t:0.8, v:-14}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:-54, e:'easeInOutCubic'}, {t:0.14, v:-20}, {t:0.3, v:18}, {t:0.5, v:62}, {t:0.64, v:26}, {t:0.82, v:-14}, {t:1.0, v:-54}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:5}, {t:0.3, v:-14}, {t:0.5, v:0}, {t:0.6, v:5}, {t:0.8, v:-14}, {t:1.0, v:0}]
                }
            }
        });
    }

    _legsRunSideSegmented() {
        return new AnimationPart({
            id: 'legs-run-side-segmented',
            type: 'limb', subtype: 'legs-side-run-segmented',
            name: 'Legs Run (Side, Segmented)',
            desc: 'Two side-view running legs with articulated knees replicating the full-character run',
            category: 'limbs',
            tags: ['legs', 'run', 'side', 'segmented'],
            preview: 'M18 6 L14 28 L9 52 M32 6 L36 26 L40 48',
            duration: 360,
            rootMotion: { enabled: true, speed: -286, bounce: 24, sway: 0 },
            pieces: [
                this._sideThighPiece('Left Thigh', '#3a5a8a', '#2d4568', { oX: -7, zIndex: 0 }),
                this._sideShinPiece('Left Shin', '#3a5a8a', '#2d4568', { oX: -7, zIndex: 0.1 }),
                this._sideThighPiece('Right Thigh', '#3a5a8a', '#2d4568', { oX: 7, zIndex: 1 }),
                this._sideShinPiece('Right Shin', '#3a5a8a', '#2d4568', { oX: 7, zIndex: 1.1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:62, e:'easeInOutCubic'}, {t:0.14, v:26}, {t:0.3, v:-14}, {t:0.5, v:-54}, {t:0.64, v:-20}, {t:0.82, v:18}, {t:1.0, v:62}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:5}, {t:0.3, v:-14}, {t:0.5, v:0}, {t:0.6, v:5}, {t:0.8, v:-14}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:22, e:'easeInOutCubic'}, {t:0.14, v:4}, {t:0.3, v:-36}, {t:0.5, v:-62}, {t:0.64, v:-18}, {t:0.82, v:12}, {t:1.0, v:22}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:4}, {t:0.3, v:-11}, {t:0.5, v:0}, {t:0.6, v:4}, {t:0.8, v:-11}, {t:1.0, v:0}]
                },
                2: {
                    rotation: [{t:0, v:-54, e:'easeInOutCubic'}, {t:0.14, v:-20}, {t:0.3, v:18}, {t:0.5, v:62}, {t:0.64, v:26}, {t:0.82, v:-14}, {t:1.0, v:-54}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:5}, {t:0.3, v:-14}, {t:0.5, v:0}, {t:0.6, v:5}, {t:0.8, v:-14}, {t:1.0, v:0}]
                },
                3: {
                    rotation: [{t:0, v:-62, e:'easeInOutCubic'}, {t:0.14, v:-18}, {t:0.3, v:12}, {t:0.5, v:22}, {t:0.64, v:4}, {t:0.82, v:-36}, {t:1.0, v:-62}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.1, v:4}, {t:0.3, v:-11}, {t:0.5, v:0}, {t:0.6, v:4}, {t:0.8, v:-11}, {t:1.0, v:0}]
                }
            }
        });
    }

    _armsSwingSide() {
        return new AnimationPart({
            id: 'arms-swing-side',
            type: 'limb', subtype: 'arms-side-swing',
            name: 'Arms Swing (Side)',
            desc: 'Side-view arms replicating the full-character walk counter-swing',
            category: 'limbs',
            tags: ['arms', 'walk', 'side'],
            preview: 'M18 5 L12 46 M32 5 L38 46',
            duration: 800,
            rootMotion: { enabled: true, speed: -75, bounce: 3, sway: 0 },
            pieces: [
                this._sideArmPiece('Left Arm', '#e8b88a', '#c4956e', { oX: -11, zIndex: 0 }),
                this._sideArmPiece('Right Arm', '#e8b88a', '#c4956e', { oX: 11, zIndex: 1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:-26, e:'easeInOutCubic'}, {t:0.25, v:-8}, {t:0.5, v:18}, {t:0.75, v:5}, {t:1.0, v:-26}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:18, e:'easeInOutCubic'}, {t:0.25, v:5}, {t:0.5, v:-26}, {t:0.75, v:-8}, {t:1.0, v:18}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                }
            }
        });
    }

    _armsSwingSideSegmented() {
        return new AnimationPart({
            id: 'arms-swing-side-segmented',
            type: 'limb', subtype: 'arms-side-swing-segmented',
            name: 'Arms Swing (Side, Segmented)',
            desc: 'Side-view arms with articulated elbows replicating the full-character walk',
            category: 'limbs',
            tags: ['arms', 'walk', 'side', 'segmented'],
            preview: 'M18 5 L15 24 L12 44 M32 5 L35 24 L38 44',
            duration: 800,
            rootMotion: { enabled: true, speed: -75, bounce: 3, sway: 0 },
            pieces: [
                this._sideUpperArmPiece('Left Upper Arm', '#e8b88a', '#c4956e', { oX: -11, zIndex: 0 }),
                this._sideForearmPiece('Left Forearm', '#e8b88a', '#c4956e', { oX: -11, zIndex: 0.1 }),
                this._sideUpperArmPiece('Right Upper Arm', '#e8b88a', '#c4956e', { oX: 11, zIndex: 1 }),
                this._sideForearmPiece('Right Forearm', '#e8b88a', '#c4956e', { oX: 11, zIndex: 1.1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:-26, e:'easeInOutCubic'}, {t:0.25, v:-8}, {t:0.5, v:18}, {t:0.75, v:5}, {t:1.0, v:-26}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:10, e:'easeInOutCubic'}, {t:0.25, v:2}, {t:0.5, v:-16}, {t:0.75, v:-5}, {t:1.0, v:10}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-1.8}, {t:0.25, v:0}, {t:0.375, v:-1.8}, {t:0.5, v:0}, {t:0.625, v:-1.8}, {t:0.75, v:0}, {t:0.875, v:-1.8}, {t:1.0, v:0}]
                },
                2: {
                    rotation: [{t:0, v:18, e:'easeInOutCubic'}, {t:0.25, v:5}, {t:0.5, v:-26}, {t:0.75, v:-8}, {t:1.0, v:18}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-2.2}, {t:0.25, v:0}, {t:0.375, v:-2.2}, {t:0.5, v:0}, {t:0.625, v:-2.2}, {t:0.75, v:0}, {t:0.875, v:-2.2}, {t:1.0, v:0}]
                },
                3: {
                    rotation: [{t:0, v:-16, e:'easeInOutCubic'}, {t:0.25, v:-5}, {t:0.5, v:10}, {t:0.75, v:2}, {t:1.0, v:-16}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.125, v:-1.8}, {t:0.25, v:0}, {t:0.375, v:-1.8}, {t:0.5, v:0}, {t:0.625, v:-1.8}, {t:0.75, v:0}, {t:0.875, v:-1.8}, {t:1.0, v:0}]
                }
            }
        });
    }

    _armsSwingFront() {
        return new AnimationPart({
            id: 'arms-swing-front',
            type: 'limb', subtype: 'arms-front-swing',
            name: 'Arms Swing (Front)',
            desc: 'Front-view arms replicating the full-character front walk counter-swing',
            category: 'limbs',
            tags: ['arms', 'walk', 'front'],
            preview: 'M18 5 L13 44 M32 5 L37 44',
            duration: 860,
            rootMotion: { enabled: true, speed: 0, bounce: 0.65, sway: 0, depthStrength: 0.5, scaleFrom: 0.93, scaleTo: 1.04, approachY: 8, depthProgressMode: 'pingpong' },
            pieces: [
                this._frontArmPiece('Left Arm', '#e8b88a', '#c4956e', { oX: -19, zIndex: 0 }),
                this._frontArmPiece('Right Arm', '#e8b88a', '#c4956e', { oX: 19, zIndex: 1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:13, e:'easeInOutCubic'}, {t:0.22, v:4}, {t:0.5, v:-13}, {t:0.78, v:-3}, {t:1.0, v:13}],
                    _oX: [{t:0, v:-1.0, e:'easeInOut'}, {t:0.25, v:-2.0}, {t:0.5, v:0.8}, {t:0.75, v:1.4}, {t:1.0, v:-1.0}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-2.1}, {t:0.5, v:0.2}, {t:0.75, v:-2.1}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:-13, e:'easeInOutCubic'}, {t:0.22, v:-3}, {t:0.5, v:13}, {t:0.78, v:4}, {t:1.0, v:-13}],
                    _oX: [{t:0, v:1.0, e:'easeInOut'}, {t:0.25, v:2.0}, {t:0.5, v:-0.8}, {t:0.75, v:-1.4}, {t:1.0, v:1.0}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-2.1}, {t:0.5, v:0.2}, {t:0.75, v:-2.1}, {t:1.0, v:0}]
                }
            }
        });
    }

    _armsSwingFrontSegmented() {
        return new AnimationPart({
            id: 'arms-swing-front-segmented',
            type: 'limb', subtype: 'arms-front-swing-segmented',
            name: 'Arms Swing (Front, Segmented)',
            desc: 'Front-view arms with articulated elbows replicating the full-character front walk',
            category: 'limbs',
            tags: ['arms', 'walk', 'front', 'segmented'],
            preview: 'M18 5 L15 24 L13 44 M32 5 L35 24 L37 44',
            duration: 860,
            rootMotion: { enabled: true, speed: 0, bounce: 0.65, sway: 0, depthStrength: 0.5, scaleFrom: 0.93, scaleTo: 1.04, approachY: 8, depthProgressMode: 'pingpong' },
            pieces: [
                this._frontUpperArmPiece('Left Upper Arm', '#e8b88a', '#c4956e', { oX: -19, zIndex: 0 }),
                this._frontForearmPiece('Left Forearm', '#e8b88a', '#c4956e', { oX: -19, zIndex: 0.1 }),
                this._frontUpperArmPiece('Right Upper Arm', '#e8b88a', '#c4956e', { oX: 19, zIndex: 1 }),
                this._frontForearmPiece('Right Forearm', '#e8b88a', '#c4956e', { oX: 19, zIndex: 1.1 })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:13, e:'easeInOutCubic'}, {t:0.22, v:4}, {t:0.5, v:-13}, {t:0.78, v:-3}, {t:1.0, v:13}],
                    _oX: [{t:0, v:-1.0, e:'easeInOut'}, {t:0.25, v:-2.0}, {t:0.5, v:0.8}, {t:0.75, v:1.4}, {t:1.0, v:-1.0}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-2.1}, {t:0.5, v:0.2}, {t:0.75, v:-2.1}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:7, e:'easeInOutCubic'}, {t:0.22, v:2}, {t:0.5, v:-10}, {t:0.78, v:-3}, {t:1.0, v:7}],
                    _oX: [{t:0, v:-0.6, e:'easeInOut'}, {t:0.25, v:-1.4}, {t:0.5, v:0.5}, {t:0.75, v:1.0}, {t:1.0, v:-0.6}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-1.8}, {t:0.5, v:0.1}, {t:0.75, v:-1.8}, {t:1.0, v:0}]
                },
                2: {
                    rotation: [{t:0, v:-13, e:'easeInOutCubic'}, {t:0.22, v:-3}, {t:0.5, v:13}, {t:0.78, v:4}, {t:1.0, v:-13}],
                    _oX: [{t:0, v:1.0, e:'easeInOut'}, {t:0.25, v:2.0}, {t:0.5, v:-0.8}, {t:0.75, v:-1.4}, {t:1.0, v:1.0}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-2.1}, {t:0.5, v:0.2}, {t:0.75, v:-2.1}, {t:1.0, v:0}]
                },
                3: {
                    rotation: [{t:0, v:-10, e:'easeInOutCubic'}, {t:0.22, v:-3}, {t:0.5, v:7}, {t:0.78, v:2}, {t:1.0, v:-10}],
                    _oX: [{t:0, v:0.6, e:'easeInOut'}, {t:0.25, v:1.4}, {t:0.5, v:-0.5}, {t:0.75, v:-1.0}, {t:1.0, v:0.6}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.25, v:-1.8}, {t:0.5, v:0.1}, {t:0.75, v:-1.8}, {t:1.0, v:0}]
                }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  FACE PARTS
    // ════════════════════════════════════════════════════
    _blinkingEyes() {
        return new AnimationPart({
            id: 'blinking-eyes',
            type: 'face', subtype: 'blink',
            name: 'Blinking Eyes',
            desc: 'A full face with eyes that blink periodically',
            category: 'face',
            tags: ['eyes', 'blink', 'face'],
            preview: 'M30 54 Q18 54 11 45 Q6 38 6 27 Q6 16 13 9 Q20 3 30 3 Q40 3 47 9 Q54 16 54 27 Q54 38 49 45 Q42 54 30 54 Z M13 24 Q18 17 24 24 M36 24 Q42 17 47 24 M29 30 L31 36 L27 36 M22 43 Q30 48 38 43',
            duration: 3000,
            pieces: [
                this._faceHeadBasePiece(),
                this._faceEyePiece('Left Eye', -12),
                this._faceEyePiece('Right Eye', 12),
                this._faceNosePiece(),
                this._faceMouthPiece()
            ],
            keyframes: {
                // Blink happens at ~85% through the cycle, quick close-open
                1: { scaleY: [{t:0, v:1, e:'linear'}, {t:0.82, v:1, e:'easeIn'}, {t:0.87, v:0.08, e:'easeOut'}, {t:0.92, v:1, e:'linear'}, {t:1.0, v:1}] },
                2: { scaleY: [{t:0, v:1, e:'linear'}, {t:0.82, v:1, e:'easeIn'}, {t:0.87, v:0.08, e:'easeOut'}, {t:0.92, v:1, e:'linear'}, {t:1.0, v:1}] }
            }
        });
    }

    _talkingMouth() {
        return new AnimationPart({
            id: 'talking-mouth',
            type: 'face', subtype: 'talk',
            name: 'Talking Mouth',
            desc: 'A full face with a mouth open/close cycle for lip-sync',
            category: 'face',
            tags: ['mouth', 'talk', 'face', 'lips'],
            preview: 'M30 54 Q18 54 11 45 Q6 38 6 27 Q6 16 13 9 Q20 3 30 3 Q40 3 47 9 Q54 16 54 27 Q54 38 49 45 Q42 54 30 54 Z M13 24 Q18 17 24 24 M36 24 Q42 17 47 24 M29 30 L31 36 L27 36 M17 42 Q30 52 43 42',
            duration: 700,
            pieces: [
                this._faceHeadBasePiece(),
                this._faceEyePiece('Left Eye', -12),
                this._faceEyePiece('Right Eye', 12),
                this._faceNosePiece(),
                { name: 'Upper Lip', path: 'M2 10 Q9 2 16 2 Q23 2 30 10 Q23 13 16 12 Q9 13 2 10 Z', viewBox: '0 0 32 16', oX: 1, oY: 13, w: 18, h: 8, pvX: 0.5, pvY: 1.0, zIndex: 3, fill: '#d45d79', stroke: '#a94560' },
                { name: 'Lower Lip', path: 'M2 3 Q9 1 16 3 Q23 1 30 3 Q27 14 16 16 Q5 14 2 3 Z', viewBox: '0 0 32 18', oX: 1, oY: 18, w: 18, h: 10, pvX: 0.5, pvY: 0.0, zIndex: 2, fill: '#d45d79', stroke: '#a94560' }
            ],
            keyframes: {
                4: { scaleY: [{t:0, v:1, e:'easeInOut'}, {t:0.2, v:0.7}, {t:0.5, v:1}, {t:0.7, v:0.85}, {t:1.0, v:1}] },
                5: { scaleY: [{t:0, v:1, e:'easeInOut'}, {t:0.2, v:1.7}, {t:0.5, v:1}, {t:0.7, v:1.35}, {t:1.0, v:1}] }
            }
        });
    }

    _eyebrowRaise() {
        return new AnimationPart({
            id: 'eyebrow-raise',
            type: 'face', subtype: 'eyebrow',
            name: 'Eyebrow Raise',
            desc: 'A full face with eyebrows that raise up and down',
            category: 'face',
            tags: ['eyebrow', 'face', 'expression'],
            preview: 'M30 54 Q18 54 11 45 Q6 38 6 27 Q6 16 13 9 Q20 3 30 3 Q40 3 47 9 Q54 16 54 27 Q54 38 49 45 Q42 54 30 54 Z M12 18 Q19 13 24 15 M36 15 Q41 13 48 18 M13 26 Q18 19 24 26 M36 26 Q42 19 47 26 M29 31 L31 37 L27 37 M22 43 Q30 48 38 43',
            duration: 1200,
            pieces: [
                this._faceHeadBasePiece(),
                this._faceEyePiece('Left Eye', -12, -6),
                this._faceEyePiece('Right Eye', 12, -6),
                this._faceNosePiece(),
                this._faceMouthPiece(),
                this._faceBrowPiece('Left Brow', 'M2 10 Q10 2 24 4', -12),
                this._faceBrowPiece('Right Brow', 'M2 4 Q16 2 24 10', 12)
            ],
            keyframes: {
                5: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.3, v:-6}, {t:0.7, v:-6}, {t:1.0, v:0}] },
                6: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.3, v:-6}, {t:0.7, v:-6}, {t:1.0, v:0}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  ANIMAL PARTS
    // ════════════════════════════════════════════════════
    _waggingTail() {
        return new AnimationPart({
            id: 'wagging-tail',
            type: 'animal', subtype: 'tail-wag',
            name: 'Wagging Tail',
            desc: 'A tail that wags side to side',
            category: 'animal',
            tags: ['tail', 'animal', 'wag'],
            preview: 'M10 40 Q25 10 45 30',
            duration: 400,
            pieces: [
                { name: 'Tail', path: 'M0 50 Q5 20 20 5 Q30 0 35 10 Q25 15 15 35 Q10 48 5 50 Z', viewBox: '0 0 36 52', oX: 0, oY: 0, w: 38, h: 55, pvX: 0.1, pvY: 0.95, zIndex: 0, fill: '#8B6914', stroke: '#6B4F10' }
            ],
            keyframes: {
                0: { rotation: [{t:0, v:-30, e:'easeInOut'}, {t:0.5, v:30}, {t:1.0, v:-30}] }
            }
        });
    }

    _quadrupedWalk() {
        return new AnimationPart({
            id: 'quadruped-walk',
            type: 'animal', subtype: 'quadruped-walk',
            name: 'Animal Walk',
            desc: 'Full-body dog-like walk with a steady four-beat gait',
            category: 'animal',
            tags: ['animal', 'quadruped', 'dog', 'walk'],
            preview: 'M10 28 Q20 16 40 16 Q60 16 74 24 Q82 28 82 38 Q82 44 76 48 Q66 54 48 54 L32 54 Q20 54 12 47 Q8 42 8 36 Q8 31 10 28 M8 32 L0 28 M74 24 L84 18 M76 34 Q94 28 108 34',
            duration: 760,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: -122, bounce: 1.3, sway: 0 },
            pieces: [
                { name: 'Tail', path: 'M2 16 Q18 2 38 6 Q54 10 68 4', viewBox: '0 0 70 22', oX: 36, oY: -12, w: 62, h: 18, pvX: 0.06, pvY: 0.7, zIndex: 0, fill: 'none', stroke: '#7b5a34', strokeWidth: 3 },
                { name: 'Body', path: 'M8 24 Q20 12 41 12 Q63 12 77 22 Q86 29 86 39 Q86 47 78 52 Q67 58 48 58 Q25 58 12 50 Q4 45 4 35 Q4 28 8 24 Z', viewBox: '0 0 90 62', oX: 2, oY: 0, w: 88, h: 44, pvX: 0.5, pvY: 0.55, zIndex: 2, fill: '#9b7746', stroke: '#6f522e' },
                { name: 'Head', path: 'M14 18 Q22 8 38 8 Q52 8 60 16 Q66 22 66 32 Q66 40 58 46 Q49 52 35 52 Q20 52 12 43 Q6 37 6 30 Q6 23 14 18 Z M48 12 L56 2 L58 15', viewBox: '0 0 72 56', oX: -34, oY: -10, w: 40, h: 30, pvX: 0.7, pvY: 0.66, zIndex: 3.2, fill: '#ad8754', stroke: '#6f522e' },
                this._sideArmPiece('Back Foreleg', '#8f6d41', '#6f522e', { oX: 1, oY: 14, w: 11, h: 24, zIndex: 1.2 }),
                this._sideArmPiece('Front Foreleg', '#a57c47', '#6f522e', { oX: -23, oY: 13, w: 11, h: 24, zIndex: 4.2 }),
                this._sideLegPiece('Back Hind Leg', '#8a673c', '#6f522e', { oX: 26, oY: 16, w: 12, h: 28, zIndex: 1.1 }),
                this._sideLegPiece('Front Hind Leg', '#9a7342', '#6f522e', { oX: 8, oY: 16, w: 12, h: 28, zIndex: 3.8 })
            ],
            keyframes: {
                0: { rotation: [{t:0, v:10, e:'easeInOut'}, {t:0.3, v:-2}, {t:0.62, v:-8}, {t:1.0, v:10}] },
                1: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.3, v:-0.6}, {t:0.62, v:0.3}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:-3, e:'easeInOut'}, {t:0.3, v:6}, {t:0.62, v:3}, {t:1.0, v:-3}] },
                3: { rotation: [{t:0, v:-14, e:'easeInOutCubic'}, {t:0.22, v:3}, {t:0.48, v:16}, {t:0.74, v:-5}, {t:1.0, v:-14}] },
                4: { rotation: [{t:0, v:14, e:'easeInOutCubic'}, {t:0.22, v:-5}, {t:0.48, v:-15}, {t:0.74, v:4}, {t:1.0, v:14}] },
                5: { rotation: [{t:0, v:16, e:'easeInOutCubic'}, {t:0.22, v:-6}, {t:0.48, v:-18}, {t:0.74, v:5}, {t:1.0, v:16}] },
                6: { rotation: [{t:0, v:-10, e:'easeInOutCubic'}, {t:0.22, v:4}, {t:0.48, v:14}, {t:0.74, v:-3}, {t:1.0, v:-10}] }
            }
        });
    }

    _quadrupedRun() {
        return new AnimationPart({
            id: 'quadruped-run',
            type: 'animal', subtype: 'quadruped-run',
            name: 'Animal Run',
            desc: 'Full-body dog-like run with stretched forelegs and gathered hind legs',
            category: 'animal',
            tags: ['animal', 'quadruped', 'dog', 'run'],
            preview: 'M10 28 Q20 16 40 16 Q60 16 74 24 Q82 28 82 38 Q82 44 76 48 Q66 54 48 54 L32 54 Q20 54 12 47 Q8 42 8 36 Q8 31 10 28 M8 32 L0 28 M74 24 L84 18 M76 34 Q94 28 108 34',
            duration: 500,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: -206, bounce: 3.2, sway: 0 },
            pieces: [
                { name: 'Tail', path: 'M2 16 Q18 0 38 4 Q54 8 70 2', viewBox: '0 0 72 22', oX: 37, oY: -14, w: 64, h: 18, pvX: 0.05, pvY: 0.7, zIndex: 0, fill: 'none', stroke: '#7b5a34', strokeWidth: 3 },
                { name: 'Body', path: 'M8 24 Q20 12 42 12 Q64 12 78 22 Q88 29 88 39 Q88 47 80 52 Q68 58 48 58 Q25 58 12 50 Q4 44 4 34 Q4 28 8 24 Z', viewBox: '0 0 92 62', oX: 2, oY: 0, w: 90, h: 44, pvX: 0.48, pvY: 0.55, zIndex: 2, fill: '#9b7746', stroke: '#6f522e' },
                { name: 'Head', path: 'M14 18 Q22 8 38 8 Q52 8 60 16 Q66 22 66 32 Q66 40 58 46 Q49 52 35 52 Q20 52 12 43 Q6 37 6 30 Q6 23 14 18 Z M48 12 L56 2 L58 15', viewBox: '0 0 72 56', oX: -35, oY: -11, w: 40, h: 30, pvX: 0.7, pvY: 0.66, zIndex: 3.2, fill: '#ad8754', stroke: '#6f522e' },
                this._sideArmPiece('Back Foreleg', '#8f6d41', '#6f522e', { oX: 2, oY: 14, w: 11, h: 23, zIndex: 1.2 }),
                this._sideArmPiece('Front Foreleg', '#a57c47', '#6f522e', { oX: -23, oY: 13, w: 11, h: 23, zIndex: 4.2 }),
                this._sideLegPiece('Back Hind Leg', '#8a673c', '#6f522e', { oX: 28, oY: 16, w: 12, h: 27, zIndex: 1.1 }),
                this._sideLegPiece('Front Hind Leg', '#9a7342', '#6f522e', { oX: 10, oY: 16, w: 12, h: 27, zIndex: 3.8 })
            ],
            keyframes: {
                0: { rotation: [{t:0, v:14, e:'easeInOut'}, {t:0.22, v:0}, {t:0.52, v:-12}, {t:0.78, v:4}, {t:1.0, v:14}] },
                1: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.2, v:-1}, {t:0.48, v:0.8}, {t:0.72, v:-2.6}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:-5, e:'easeInOut'}, {t:0.22, v:7}, {t:0.5, v:1}, {t:0.76, v:9}, {t:1.0, v:-5}] },
                3: { rotation: [{t:0, v:-28, e:'easeInOutCubic'}, {t:0.18, v:18}, {t:0.42, v:30}, {t:0.68, v:-8}, {t:1.0, v:-28}] },
                4: { rotation: [{t:0, v:20, e:'easeInOutCubic'}, {t:0.18, v:-12}, {t:0.42, v:-38}, {t:0.68, v:6}, {t:1.0, v:20}] },
                5: { rotation: [{t:0, v:34, e:'easeInOutCubic'}, {t:0.16, v:8}, {t:0.38, v:-34}, {t:0.64, v:18}, {t:1.0, v:34}] },
                6: { rotation: [{t:0, v:-24, e:'easeInOutCubic'}, {t:0.16, v:-2}, {t:0.38, v:26}, {t:0.64, v:-10}, {t:1.0, v:-24}] }
            }
        });
    }

    _quadrupedHop() {
        return new AnimationPart({
            id: 'quadruped-hop',
            type: 'animal', subtype: 'quadruped-hop',
            name: 'Animal Hop',
            desc: 'Full-body animal pounce with the chest leading and hind legs driving',
            category: 'animal',
            tags: ['animal', 'quadruped', 'dog', 'hop'],
            preview: 'M10 28 Q20 16 40 16 Q60 16 74 24 Q82 28 82 38 Q82 44 76 48 Q66 54 48 54 L32 54 Q20 54 12 47 Q8 42 8 36 Q8 31 10 28 M8 32 L0 28 M74 24 L84 18 M76 34 Q94 28 108 34',
            duration: 620,
            repeatMode: 'restart',
            rootMotion: { enabled: true, speed: -154, bounce: 4.2, sway: 0 },
            pieces: [
                { name: 'Tail', path: 'M2 18 Q18 2 40 6 Q58 10 72 4', viewBox: '0 0 74 24', oX: 38, oY: -14, w: 64, h: 18, pvX: 0.05, pvY: 0.7, zIndex: 0, fill: 'none', stroke: '#7b5a34', strokeWidth: 3 },
                { name: 'Body', path: 'M8 24 Q20 12 42 12 Q64 12 78 22 Q88 30 88 40 Q88 48 80 53 Q68 58 48 58 Q24 58 11 50 Q4 44 4 35 Q4 28 8 24 Z', viewBox: '0 0 92 62', oX: 2, oY: 0, w: 90, h: 44, pvX: 0.48, pvY: 0.56, zIndex: 2, fill: '#9b7746', stroke: '#6f522e' },
                { name: 'Head', path: 'M14 18 Q22 8 38 8 Q52 8 60 16 Q66 22 66 32 Q66 40 58 46 Q49 52 35 52 Q20 52 12 43 Q6 37 6 30 Q6 23 14 18 Z M48 12 L56 2 L58 15', viewBox: '0 0 72 56', oX: -35, oY: -11, w: 40, h: 30, pvX: 0.7, pvY: 0.66, zIndex: 3.2, fill: '#ad8754', stroke: '#6f522e' },
                this._sideArmPiece('Back Foreleg', '#8f6d41', '#6f522e', { oX: 2, oY: 14, w: 11, h: 22, zIndex: 1.2 }),
                this._sideArmPiece('Front Foreleg', '#a57c47', '#6f522e', { oX: -23, oY: 13, w: 11, h: 22, zIndex: 4.2 }),
                this._sideLegPiece('Back Hind Leg', '#8a673c', '#6f522e', { oX: 28, oY: 16, w: 12, h: 26, zIndex: 1.1 }),
                this._sideLegPiece('Front Hind Leg', '#9a7342', '#6f522e', { oX: 10, oY: 16, w: 12, h: 26, zIndex: 3.8 })
            ],
            keyframes: {
                0: { rotation: [{t:0, v:18, e:'easeInOut'}, {t:0.22, v:2}, {t:0.5, v:-14}, {t:0.76, v:10}, {t:1.0, v:18}] },
                1: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:-0.6}, {t:0.48, v:0.8}, {t:0.68, v:-4}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:-4, e:'easeInOut'}, {t:0.22, v:8}, {t:0.5, v:2}, {t:0.76, v:11}, {t:1.0, v:-4}] },
                3: { rotation: [{t:0, v:12, e:'easeInOutCubic'}, {t:0.18, v:-6}, {t:0.42, v:-34}, {t:0.66, v:16}, {t:1.0, v:12}] },
                4: { rotation: [{t:0, v:8, e:'easeInOutCubic'}, {t:0.18, v:-4}, {t:0.42, v:-30}, {t:0.66, v:18}, {t:1.0, v:8}] },
                5: { rotation: [{t:0, v:-38, e:'easeInOutCubic'}, {t:0.14, v:14}, {t:0.36, v:28}, {t:0.62, v:-12}, {t:1.0, v:-38}] },
                6: { rotation: [{t:0, v:-34, e:'easeInOutCubic'}, {t:0.14, v:12}, {t:0.36, v:24}, {t:0.62, v:-8}, {t:1.0, v:-34}] }
            }
        });
    }

    _flappingWings() {
        return new AnimationPart({
            id: 'flapping-wings',
            type: 'animal', subtype: 'wing-flap',
            name: 'Flapping Wings',
            desc: 'A pair of wings that flap up and down',
            category: 'animal',
            tags: ['wings', 'animal', 'flap', 'bird'],
            preview: 'M5 25 L22 5 L22 25 Z M45 25 L28 5 L28 25 Z',
            duration: 400,
            pieces: [
                { name: 'Left Wing', path: 'M50 40 Q30 35 10 10 Q5 5 0 15 Q10 30 25 42 Q35 50 50 50 Z', viewBox: '0 0 50 50', oX: -40, oY: -10, w: 48, h: 48, pvX: 1.0, pvY: 0.8, zIndex: 0, fill: '#5a8abd', stroke: '#3d6a96' },
                { name: 'Right Wing', path: 'M0 40 Q20 35 40 10 Q45 5 50 15 Q40 30 25 42 Q15 50 0 50 Z', viewBox: '0 0 50 50', oX: 40, oY: -10, w: 48, h: 48, pvX: 0.0, pvY: 0.8, zIndex: 1, fill: '#5a8abd', stroke: '#3d6a96' }
            ],
            keyframes: {
                0: { rotation: [{t:0, v:0, e:'easeOut'}, {t:0.35, v:-35, e:'easeIn'}, {t:0.7, v:5, e:'easeOut'}, {t:1.0, v:0}] },
                1: { rotation: [{t:0, v:0, e:'easeOut'}, {t:0.35, v:35, e:'easeIn'}, {t:0.7, v:-5, e:'easeOut'}, {t:1.0, v:0}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  HAND WAVE — SIDE VIEW
    //  Standing figure waving one hand back and forth
    // ════════════════════════════════════════════════════
    _handWave() {
        return new AnimationPart({
            id: 'hand-wave',
            type: 'character', subtype: 'wave-side',
            name: 'Hand Wave',
            desc: 'Standing figure waving one hand',
            category: 'actions',
            tags: ['wave', 'hand', 'greeting', 'side', 'human'],
            preview: 'M20 4 A6 7 0 1 1 20 3.9 Z M16 16 Q24 14 30 18 L29 36 L17 36 Z M13 18 L10 30 L8 36 M31 18 L28 9 L33 3 M18 36 L16 56 L16 64 M27 36 L29 56 L29 64',
            duration: 600,
            pieces: [
                this._maleSideHeadPiece(),
                this._maleSideTorsoPiece(),
                this._sideArmPiece('Resting Arm', '#e8b88a', '#c4956e', { oX: -11, zIndex: 1 }),
                this._sideArmPiece('Waving Arm', '#e8b88a', '#c4956e', { oX: 11, zIndex: 5.2 }),
                this._sideLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -8, zIndex: 0 }),
                this._sideLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 8, zIndex: 4.8 }),
                this._sideNeckPiece(),
                this._sideShoulderPiece()
            ],
            keyframes: {
                0: { },
                1: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:1}, {t:0.45, v:-1}, {t:0.72, v:0}, {t:1.0, v:0}], _oX: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:0.3}, {t:0.45, v:-0.6}, {t:0.72, v:-0.2}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:10, e:'easeInOut'}, {t:0.2, v:4}, {t:0.5, v:7}, {t:0.8, v:10}, {t:1.0, v:10}] },
                3: { rotation: [{t:0, v:-138, e:'easeInOutCubic'}, {t:0.16, v:-172}, {t:0.34, v:-134}, {t:0.56, v:-178}, {t:0.8, v:-140}, {t:1.0, v:-138}] },
                4: { rotation: [{t:0, v:-2, e:'easeInOut'}, {t:0.5, v:1}, {t:1.0, v:-2}] },
                5: { rotation: [{t:0, v:-1, e:'easeInOut'}, {t:0.5, v:1}, {t:1.0, v:-1}] },
                6: { },
                7: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.2, v:0.5}, {t:0.45, v:-0.8}, {t:0.72, v:-0.2}, {t:1.0, v:0}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  JUMP — SIDE VIEW
    //  Full figure: crouch → spring up → float → land
    // ════════════════════════════════════════════════════
    _jump() {
        return new AnimationPart({
            id: 'jump',
            type: 'character', subtype: 'jump-side',
            name: 'Jump',
            desc: 'Standing figure performing a vertical jump',
            category: 'actions',
            tags: ['jump', 'leap', 'side', 'human'],
            preview: 'M20 4 A6 7 0 1 1 20 3.9 Z M16 16 Q24 14 30 18 L29 36 L17 36 Z M13 18 L8 7 L5 4 M31 18 L36 8 L39 5 M18 36 L15 53 L12 64 M27 36 L30 53 L33 64',
            duration: 900,
            pieces: [
                this._maleSideHeadPiece(),
                this._maleSideTorsoPiece(),
                this._sideArmPiece('Back Arm', '#e8b88a', '#c4956e', { oX: -11, zIndex: 1 }),
                this._sideArmPiece('Front Arm', '#e8b88a', '#c4956e', { oX: 11, zIndex: 5.2 }),
                this._sideLegPiece('Back Leg', '#3a5a8a', '#2d4568', { oX: -8, zIndex: 0 }),
                this._sideLegPiece('Front Leg', '#3a5a8a', '#2d4568', { oX: 8, zIndex: 4.8 }),
                this._sideNeckPiece(),
                this._sideShoulderPiece()
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.14, v:9}, {t:0.34, v:-5}, {t:0.62, v:-4}, {t:0.88, v:3}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:10}, {t:0.3, v:-34}, {t:0.48, v:-42}, {t:0.7, v:-32}, {t:0.9, v:6}, {t:0.97, v:0}, {t:1.0, v:0}]
                },
                1: {
                    rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.14, v:8}, {t:0.3, v:-5}, {t:0.66, v:-3}, {t:0.88, v:5}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:15}, {t:0.3, v:-32}, {t:0.48, v:-40}, {t:0.7, v:-28}, {t:0.9, v:10}, {t:0.97, v:0}, {t:1.0, v:0}]
                },
                2: {
                    rotation: [{t:0, v:0, e:'easeInOutCubic'}, {t:0.14, v:14}, {t:0.3, v:100}, {t:0.48, v:140}, {t:0.68, v:96}, {t:0.9, v:8}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:10}, {t:0.3, v:-30}, {t:0.48, v:-38}, {t:0.68, v:-26}, {t:0.9, v:6}, {t:0.97, v:0}, {t:1.0, v:0}]
                },
                3: {
                    rotation: [{t:0, v:0, e:'easeInOutCubic'}, {t:0.14, v:18}, {t:0.3, v:106}, {t:0.48, v:146}, {t:0.68, v:102}, {t:0.9, v:10}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:10}, {t:0.3, v:-30}, {t:0.48, v:-38}, {t:0.68, v:-26}, {t:0.9, v:6}, {t:0.97, v:0}, {t:1.0, v:0}]
                },
                4: {
                    rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.14, v:28}, {t:0.3, v:-10}, {t:0.48, v:-16}, {t:0.68, v:-8}, {t:0.88, v:16}, {t:0.95, v:4}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:0}, {t:0.22, v:-12}, {t:0.34, v:-36}, {t:0.48, v:-42}, {t:0.68, v:-32}, {t:0.85, v:-5}, {t:0.93, v:0}, {t:1.0, v:0}]
                },
                5: {
                    rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.14, v:32}, {t:0.3, v:-8}, {t:0.48, v:-14}, {t:0.68, v:-6}, {t:0.88, v:18}, {t:0.95, v:5}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:0}, {t:0.22, v:-12}, {t:0.34, v:-36}, {t:0.48, v:-42}, {t:0.68, v:-32}, {t:0.85, v:-5}, {t:0.93, v:0}, {t:1.0, v:0}]
                },
                6: {
                    rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.14, v:4}, {t:0.48, v:-2}, {t:0.9, v:2}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:12}, {t:0.3, v:-25}, {t:0.48, v:-31}, {t:0.68, v:-22}, {t:0.9, v:6}, {t:0.97, v:0}, {t:1.0, v:0}]
                },
                7: {
                    rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.14, v:6}, {t:0.48, v:-3}, {t:0.9, v:3}, {t:1.0, v:0}],
                    _oY: [{t:0, v:0, e:'easeOut'}, {t:0.14, v:10}, {t:0.3, v:-18}, {t:0.48, v:-24}, {t:0.68, v:-18}, {t:0.9, v:4}, {t:0.97, v:0}, {t:1.0, v:0}]
                }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  ARMS RAISE — SIDE VIEW
    //  Standing figure lifting both arms overhead and lowering
    // ════════════════════════════════════════════════════
    _armsRaise() {
        return new AnimationPart({
            id: 'arms-raise',
            type: 'character', subtype: 'raise-side',
            name: 'Arms Raise',
            desc: 'Standing figure lifting both arms overhead from the front',
            category: 'actions',
            tags: ['arms', 'raise', 'lift', 'side', 'human'],
            preview: 'M20 4 A6 7 0 1 1 20 3.9 Z M16 16 Q24 14 30 18 L29 36 L17 36 Z M13 18 L8 6 L5 3 M31 18 L36 6 L39 3 M18 36 L16 56 L16 64 M27 36 L29 56 L29 64',
            duration: 1200,
            pieces: [
                this._maleSideHeadPiece(),
                this._maleSideTorsoPiece(),
                this._sideArmPiece('Back Arm', '#e8b88a', '#c4956e', { oX: -11, zIndex: 1 }),
                this._sideArmPiece('Front Arm', '#e8b88a', '#c4956e', { oX: 11, zIndex: 5.2 }),
                this._sideLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -8, zIndex: 0 }),
                this._sideLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 8, zIndex: 4.8 }),
                this._sideNeckPiece(),
                this._sideShoulderPiece()
            ],
            keyframes: {
                0: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.3, v:-2}, {t:0.6, v:-6}, {t:0.85, v:-8}, {t:1.0, v:-8}] },
                1: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.3, v:-1}, {t:0.6, v:-4}, {t:0.85, v:-5}, {t:1.0, v:-5}], _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-1.5}, {t:1.0, v:-2.5}] },
                2: { rotation: [{t:0, v:0, e:'easeInOutCubic'}, {t:0.15, v:40}, {t:0.35, v:95}, {t:0.55, v:145}, {t:0.78, v:170}, {t:0.92, v:176}, {t:1.0, v:178}] },
                3: { rotation: [{t:0, v:0, e:'easeInOutCubic'}, {t:0.18, v:44}, {t:0.38, v:100}, {t:0.58, v:150}, {t:0.8, v:172}, {t:0.94, v:178}, {t:1.0, v:180}] },
                4: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:1}, {t:1.0, v:1}] },
                5: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-1}, {t:1.0, v:-1}] },
                6: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.3, v:-1}, {t:0.6, v:-3}, {t:1.0, v:-4}] },
                7: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-1}, {t:1.0, v:-2}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  HEAD NOD — A single head that nods up and down
    // ════════════════════════════════════════════════════
    _headNod() {
        return new AnimationPart({
            id: 'head-nod',
            type: 'face', subtype: 'nod',
            name: 'Head Nod',
            desc: 'A head and neck rig nodding up and down (yes gesture)',
            category: 'actions',
            tags: ['head', 'nod', 'yes', 'face'],
            preview: 'M30 12 Q18 12 11 21 Q6 28 6 39 Q6 50 13 57 Q20 63 30 63 Q40 63 47 57 Q54 50 54 39 Q54 28 49 21 Q42 12 30 12 Z M14 25 Q19 20 24 25 M36 25 Q41 20 46 25 M29 31 L31 38 L27 38 Z M22 47 Q30 52 38 47',
            duration: 800,
            pieces: [
                this._maleFrontHeadPiece({ oY: -8, w: 50, h: 50 }),
                this._frontNeckPiece({ oY: 23, w: 12, h: 14 }),
                this._frontShoulderPiece({ oY: 34, w: 42, h: 12, fill: '#5a6678', stroke: '#3f4958' })
            ],
            keyframes: {
                0: {
                    scaleX: [{t:0, v:1, e:'easeInOut'}, {t:0.18, v:1.07}, {t:0.4, v:0.99}, {t:0.62, v:1.06}, {t:0.84, v:1.0}, {t:1.0, v:1}],
                    scaleY: [{t:0, v:1, e:'easeInOut'}, {t:0.18, v:0.88}, {t:0.4, v:1.02}, {t:0.62, v:0.9}, {t:0.84, v:1.0}, {t:1.0, v:1}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:2.6}, {t:0.4, v:-0.8}, {t:0.62, v:2.1}, {t:0.84, v:-0.2}, {t:1.0, v:0}]
                },
                1: {
                    scaleY: [{t:0, v:1, e:'easeInOut'}, {t:0.18, v:0.9}, {t:0.4, v:1.03}, {t:0.62, v:0.92}, {t:0.84, v:1.0}, {t:1.0, v:1}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:1.7}, {t:0.4, v:-0.4}, {t:0.62, v:1.3}, {t:0.84, v:-0.1}, {t:1.0, v:0}]
                },
                2: {
                    scaleY: [{t:0, v:1, e:'easeInOut'}, {t:0.18, v:0.97}, {t:0.4, v:1.01}, {t:0.62, v:0.98}, {t:0.84, v:1.0}, {t:1.0, v:1}],
                    _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.18, v:0.8}, {t:0.4, v:0}, {t:0.62, v:0.6}, {t:0.84, v:0}, {t:1.0, v:0}]
                }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  HEAD SHAKE — A single head shaking left and right (uses scaleX flip for "no")
    // ════════════════════════════════════════════════════
    _headShake() {
        return new AnimationPart({
            id: 'head-shake',
            type: 'face', subtype: 'shake',
            name: 'Head Shake',
            desc: 'A head and neck rig rotating left and right (no gesture)',
            category: 'actions',
            tags: ['head', 'shake', 'no', 'face'],
            preview: 'M30 12 Q18 12 11 21 Q6 28 6 39 Q6 50 13 57 Q20 63 30 63 Q40 63 47 57 Q54 50 54 39 Q54 28 49 21 Q42 12 30 12 Z',
            duration: 600,
            pieces: [
                this._maleFrontHeadPiece({ oY: -8, w: 50, h: 50 }),
                this._frontNeckPiece({ oY: 23, w: 12, h: 14 }),
                this._frontShoulderPiece({ oY: 34, w: 42, h: 12, fill: '#5a6678', stroke: '#3f4958' })
            ],
            keyframes: {
                0: {
                    rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.15, v:-10}, {t:0.35, v:10}, {t:0.55, v:-8}, {t:0.75, v:6}, {t:0.9, v:0}, {t:1.0, v:0}],
                    _oX: [{t:0, v:0, e:'easeInOut'}, {t:0.15, v:-3}, {t:0.35, v:3}, {t:0.55, v:-2}, {t:0.75, v:1.5}, {t:0.9, v:0}, {t:1.0, v:0}]
                },
                1: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.15, v:-3}, {t:0.35, v:3}, {t:0.55, v:-2.5}, {t:0.75, v:2}, {t:0.9, v:0}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:0, e:'easeInOut'}, {t:0.15, v:1}, {t:0.35, v:-1}, {t:0.55, v:0.8}, {t:0.75, v:-0.6}, {t:0.9, v:0}, {t:1.0, v:0}] }
            }
        });
    }

    // ════════════════════════════════════════════════════
    //  CLAPPING HANDS — FRONT VIEW
    //  Two arms that clap together repeatedly
    // ════════════════════════════════════════════════════
    _clappingHands() {
        return new AnimationPart({
            id: 'clapping-hands',
            type: 'character', subtype: 'clap-front',
            name: 'Clapping Hands',
            desc: 'Front-view figure clapping hands together',
            category: 'actions',
            tags: ['clap', 'hands', 'front', 'applause', 'human'],
            preview: 'M22 4 A6 7 0 1 1 22 3.9 Z M16 16 L34 16 L34 36 L16 36 Z M12 18 L22 26 M32 26 L42 18 M18 36 L16 56 L14 64 M32 36 L34 56 L36 64',
            duration: 500,
            pieces: [
                this._maleFrontHeadPiece(),
                this._maleFrontTorsoPiece(),
                this._frontArmPiece('Left Arm', '#e8b88a', '#c4956e', { oX: -19, zIndex: 2.6 }),
                this._frontArmPiece('Right Arm', '#e8b88a', '#c4956e', { oX: 19, zIndex: 2.7 }),
                this._frontLegPiece('Left Leg', '#3a5a8a', '#2d4568', { oX: -11, zIndex: 0 }),
                this._frontLegPiece('Right Leg', '#3a5a8a', '#2d4568', { oX: 11, zIndex: 0.5 }),
                this._frontNeckPiece(),
                this._frontShoulderPiece()
            ],
            keyframes: {
                0: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-0.5}, {t:1.0, v:0}] },
                1: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-0.8}, {t:1.0, v:0}] },
                2: { rotation: [{t:0, v:-34, e:'easeOut'}, {t:0.22, v:-10}, {t:0.42, v:18, e:'easeIn'}, {t:0.52, v:22, e:'easeOut'}, {t:0.72, v:6}, {t:1.0, v:-34}] },
                3: { rotation: [{t:0, v:34, e:'easeOut'}, {t:0.22, v:10}, {t:0.42, v:-18, e:'easeIn'}, {t:0.52, v:-22, e:'easeOut'}, {t:0.72, v:-6}, {t:1.0, v:34}] },
                4: { rotation: [{t:0, v:-2, e:'easeInOut'}, {t:0.5, v:0.5}, {t:1.0, v:-2}] },
                5: { rotation: [{t:0, v:2, e:'easeInOut'}, {t:0.5, v:-0.5}, {t:1.0, v:2}] },
                6: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-0.5}, {t:1.0, v:0}] },
                7: { _oY: [{t:0, v:0, e:'easeInOut'}, {t:0.5, v:-0.5}, {t:1.0, v:0}] }
            }
        });
    }
}

// ── PartKeyframeHandler: runtime animation driver ──
// Handles 'part-keyframe' animation type in applyAnimationsAtTime
// Stored on anim.generated as: { type:'part-keyframe', duration, keyframes, pieceIndex }
class PartKeyframeHandler {
    /**
     * Apply part-keyframe animation to an object at the given time offset.
     * @param {object} obj        - StageObject being animated
     * @param {object} original   - Original saved state of the object
     * @param {object} config     - The generated config: {type:'part-keyframe', duration, keyframes:{rotation:[...], _oY:[...], ...}}
     * @param {number} elapsed    - Time elapsed since animation start (ms)
     * @param {object} anim       - The full animation record (for repeat/trigger info)
     * @param {Set}    activeProps - Set of already-active property names
     */
    static apply(obj, original, config, elapsed, anim, activeProps, finalPose) {
        const duration = config.duration || 1000;
        if (elapsed < 0) return;

        // Repeat logic (matches standard handler)
        let repeat = 1;
        if (anim.repeat === '-1') repeat = Infinity;
        else repeat = parseInt(anim.repeat) || 1;

        let localTime = elapsed;
        if (repeat !== Infinity) localTime = Math.min(elapsed, duration * repeat);

        // Normalised progress within one cycle (0–1)
        const cycleProgress = (localTime % duration) / duration;
        let t = cycleProgress;
        if (localTime >= duration * repeat && repeat !== Infinity) t = 1;

        // Show the original standing pose at the very start and when playback ends
        const introHold = duration * 0.06;
        const _standingPose = (repeat === Infinity && elapsed <= introHold) || (finalPose && repeat === Infinity);

        // Cycle mode: reverse on odd cycles for smooth looping
        const isCycleMode = (anim.repeatMode === 'cycle') && repeat > 1;
        if (isCycleMode) {
            const cycleIndex = Math.floor(localTime / duration);
            if (cycleIndex % 2 === 1 && !(localTime >= duration * repeat && repeat !== Infinity)) {
                t = 1 - t;
            }
        }

        // Interpolate each animated property
        const kfs = config.keyframes;
        if (!kfs) return;

        // ── Root motion: cumulative forward translation + cyclic bounce ──
        // Auto-suppressed when object also has a path-follow animation
        // (path-follow handles forward translation, root motion would double-move)
        let rootX = 0, rootY = 0, rootScale = 1;
        const rm = config.rootMotion;
        if (rm && rm.enabled) {
            const hasPathFollow = obj.animations && obj.animations.some(a =>
                a.generated && a.generated.type === 'path-follow');
            if (!hasPathFollow) {
                // Forward: cumulative over elapsed time (doesn't reverse on cycles)
                rootX = (rm.speed || 0) * (localTime / 1000);
                // Vertical bounce: synced with walk cycle (double-bounce per stride)
                rootY = -(rm.bounce || 0) * Math.abs(Math.sin(t * Math.PI * 2));
                // Lateral sway: single oscillation per cycle
                if (rm.sway) rootX += rm.sway * Math.sin(t * Math.PI * 2);
                if (rm.scaleFrom != null || rm.scaleTo != null || rm.depthStrength) {
                    let depthT = t;
                    if (rm.depthProgressMode === 'forward') depthT = cycleProgress;
                    else if (rm.depthProgressMode === 'pingpong') depthT = cycleProgress <= 0.5 ? cycleProgress * 2 : (2 - cycleProgress * 2);
                    const depthStrength = rm.depthStrength || 0;
                    const scaleFrom = rm.scaleFrom ?? (1 - depthStrength * 0.35);
                    const scaleTo = rm.scaleTo ?? (1 + depthStrength * 0.08);
                    const approachY = rm.approachY ?? (depthStrength * 26);
                    rootScale = scaleFrom + (scaleTo - scaleFrom) * depthT;
                    rootY += -approachY / 2 + approachY * depthT;
                }
            }
        }

        // Standing pose: reset all properties to original while keeping rootMotion X displacement
        if (_standingPose) {
            obj.x = original.x + rootX;
            obj.y = original.y;
            obj.rotation = original.rotation || 0;
            obj.scaleX = original.scaleX ?? 1;
            obj.scaleY = original.scaleY ?? 1;
            activeProps.add('x');
            activeProps.add('y');
            activeProps.add('rotation');
            activeProps.add('scaleX');
            activeProps.add('scaleY');
            return;
        }

        // Apply root motion as baseline position shift
        if (rootX !== 0 || rootY !== 0) {
            obj.x = original.x + rootX;
            obj.y = original.y + rootY;
            activeProps.add('x');
            activeProps.add('y');
        }
        if (rootScale !== 1 && !kfs.scaleX && !kfs.scaleY) {
            obj.scaleX = (original.scaleX ?? 1) * rootScale;
            obj.scaleY = (original.scaleY ?? 1) * rootScale;
            activeProps.add('scaleX');
            activeProps.add('scaleY');
        }

        Object.keys(kfs).forEach(prop => {
            const value = AnimationPartsLibrary.interpolateKeyframes(kfs[prop], t);

            if (prop === '_oX') {
                // Relative offset X + root motion
                obj.x = original.x + value + rootX;
                activeProps.add('x');
            } else if (prop === '_oY') {
                // Relative offset Y + root motion bounce
                obj.y = original.y + value + rootY;
                activeProps.add('y');
            } else if (prop === 'rotation') {
                obj.rotation = (original.rotation || 0) + value;
                activeProps.add('rotation');
            } else if (prop === 'scaleX') {
                obj.scaleX = value;
                activeProps.add('scaleX');
            } else if (prop === 'scaleY') {
                obj.scaleY = value;
                activeProps.add('scaleY');
            } else {
                obj[prop] = value;
                activeProps.add(prop);
            }
        });
    }

    /**
     * Generate the export JS code for part-keyframe animation handling.
     * This returns a string to be injected into the export render loop.
     */
    static exportCode() {
        return `
        // Part-keyframe animation (multi-property keyframe interpolation)
        if (anim.type === 'part-keyframe' && anim.keyframes) {
            const dur = anim.duration || 1000;
            const rc = anim.repeatCount || 1;
            const isInf = anim.repeat === true || rc === Infinity;
            let lt = animElapsed;
            if (!isInf) lt = Math.min(animElapsed, dur * rc);
            let cycleProgress = (lt % dur) / dur;
            let t = cycleProgress;
            if (!isInf && lt >= dur * rc) t = 1;
            // Show original standing pose briefly at start and when playback finishes
            var introHold = dur * 0.06;
            var _standingPose = (isInf && animElapsed <= introHold) || (isInf && typeof progress !== 'undefined' && progress >= 1);
            // Cycle mode reversal
            if (anim.repeatMode === 'cycle' && rc > 1) {
                var ci = Math.floor(lt / dur);
                if (ci % 2 === 1 && !(lt >= dur * rc && !isInf)) t = 1 - t;
            }
            // Root motion: cumulative forward + cyclic bounce
            var rmX = 0, rmY = 0, rmScale = 1;
            var rm = anim.rootMotion;
            if (rm && rm.enabled) {
                rmX = (rm.speed || 0) * (animElapsed / 1000);
                rmY = -(rm.bounce || 0) * Math.abs(Math.sin(t * Math.PI * 2));
                if (rm.sway) rmX += rm.sway * Math.sin(t * Math.PI * 2);
                if (rm.scaleFrom != null || rm.scaleTo != null || rm.depthStrength) {
                    var depthT = t;
                    if (rm.depthProgressMode === 'forward') depthT = cycleProgress;
                    else if (rm.depthProgressMode === 'pingpong') depthT = cycleProgress <= 0.5 ? cycleProgress * 2 : (2 - cycleProgress * 2);
                    var depthStrength = rm.depthStrength || 0;
                    var scaleFrom = rm.scaleFrom != null ? rm.scaleFrom : (1 - depthStrength * 0.35);
                    var scaleTo = rm.scaleTo != null ? rm.scaleTo : (1 + depthStrength * 0.08);
                    var approachY = rm.approachY != null ? rm.approachY : (depthStrength * 26);
                    rmScale = scaleFrom + (scaleTo - scaleFrom) * depthT;
                    rmY += -approachY / 2 + approachY * depthT;
                }
            }
            if (_standingPose) {
                obj.x = obj._origX + rmX;
                obj.y = obj._origY;
                obj.rotation = obj._origRotation || 0;
                obj.scaleX = obj._origScaleX || 1;
                obj.scaleY = obj._origScaleY || 1;
                return;
            }
            if (rmX !== 0 || rmY !== 0) { obj.x = obj._origX + rmX; obj.y = obj._origY + rmY; }
            // Interpolation helper
            function pkfEase(name, t) {
                switch (name) {
                    case 'linear': return t;
                    case 'easeIn': return t * t;
                    case 'easeOut': return t * (2 - t);
                    case 'easeInOut': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                    case 'easeInCubic': return t * t * t;
                    case 'easeOutCubic': { var t1 = t - 1; return t1 * t1 * t1 + 1; }
                    case 'easeInOutCubic': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
                    default: return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
                }
            }
            function pkfLerp(kfArr, t) {
                if (!kfArr || kfArr.length === 0) return 0;
                if (kfArr.length === 1) return kfArr[0].v;
                if (t <= kfArr[0].t) return kfArr[0].v;
                if (t >= kfArr[kfArr.length-1].t) return kfArr[kfArr.length-1].v;
                for (var ki = 0; ki < kfArr.length - 1; ki++) {
                    var ka = kfArr[ki], kb = kfArr[ki+1];
                    if (t >= ka.t && t <= kb.t) {
                        var st = (t - ka.t) / (kb.t - ka.t);
                        st = pkfEase(ka.e || 'easeInOut', st);
                        return ka.v + (kb.v - ka.v) * st;
                    }
                }
                return kfArr[kfArr.length-1].v;
            }
            var kfs = anim.keyframes;
            if (rmScale !== 1 && !kfs.scaleX && !kfs.scaleY) {
                obj.scaleX = (obj._origScaleX || 1) * rmScale;
                obj.scaleY = (obj._origScaleY || 1) * rmScale;
            }
            for (var kp in kfs) {
                var val = pkfLerp(kfs[kp], t);
                if (kp === '_oX') obj.x = obj._origX + val + rmX;
                else if (kp === '_oY') obj.y = obj._origY + val + rmY;
                else if (kp === 'rotation') obj.rotation = (obj._origRotation || 0) + val;
                else if (kp === 'scaleX') obj.scaleX = val;
                else if (kp === 'scaleY') obj.scaleY = val;
                else obj[kp] = val;
            }
            return;
        }`;
    }
}

// ── Singleton library instance (initialised on load) ──
const animationPartsLibrary = new AnimationPartsLibrary();
