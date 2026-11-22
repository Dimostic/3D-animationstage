/**
 * Joint System — Universal Character color & palette utilities
 * (split from joint-universal-char.js for maintainability)
 *
 * Pure color helpers + skin-derived palette resolution. All methods live on
 * JointSystem.prototype and are order-independent (called at render time).
 */

Object.assign(JointSystem.prototype, {

    // ── Color palette derivation ────────────────────────────────────
    // Convert a hex color to {r,g,b}. Tolerates missing '#'.
    _ucHexToRgb(hex) {
        const num = parseInt(String(hex || '#000000').replace('#', ''), 16);
        return { r: (num >> 16) & 0xFF, g: (num >> 8) & 0xFF, b: num & 0xFF };
    },

    _ucRgbToHex(r, g, b) {
        const c = (v) => Math.min(255, Math.max(0, Math.round(v)));
        return `#${((c(r) << 16) | (c(g) << 8) | c(b)).toString(16).padStart(6, '0')}`;
    },

    // Linear blend between two hex colors (t = 0 → a, t = 1 → b).
    _ucMixColors(a, b, t) {
        const ca = this._ucHexToRgb(a);
        const cb = this._ucHexToRgb(b);
        const k = Math.min(1, Math.max(0, t));
        return this._ucRgbToHex(ca.r + (cb.r - ca.r) * k, ca.g + (cb.g - ca.g) * k, ca.b + (cb.b - ca.b) * k);
    },

    // rgba() string from a hex base + alpha.
    _ucWithAlpha(hex, alpha) {
        const { r, g, b } = this._ucHexToRgb(hex);
        return `rgba(${r}, ${g}, ${b}, ${Math.min(1, Math.max(0, alpha))})`;
    },

    // Perceived luminance (0–255).
    _ucLuminance(hex) {
        const { r, g, b } = this._ucHexToRgb(hex);
        return 0.299 * r + 0.587 * g + 0.114 * b;
    },

    // Lip color derived from skin tone: warmer + more saturated red, darker
    // than the skin so it reads as lips on every complexion.
    _ucDeriveLipColor(skin) {
        const { r, g, b } = this._ucHexToRgb(skin);
        // Push toward red, pull green/blue down for a natural lip hue.
        const lip = this._ucRgbToHex(r * 0.92 + 26, g * 0.66, b * 0.62);
        return this._ucShadeColor(lip, -0.04);
    },

    // Inner-mouth (open) color derived from lip color, much darker.
    _ucDeriveMouthInteriorColor(skin) {
        return this._ucShadeColor(this._ucDeriveLipColor(skin), -0.34);
    },

    // Sclera is never pure white — warm/grey it slightly and key it to skin
    // so dark complexions don't get glaring white eyes.
    _ucDeriveScleraColor(skin) {
        const warm = '#F4EFE9';
        // Slightly deeper sclera for deeper skin tones.
        const t = Math.min(0.16, Math.max(0, (150 - this._ucLuminance(skin)) / 900));
        return this._ucMixColors(warm, '#D9CFC4', t);
    },

    // Resolve the sclera (eye-white) color: explicit hex override (jaundice,
    // bloodshot, conjunctivitis, etc.) or auto-derive from skin tone.
    _ucGetScleraColor(d = {}) {
        const raw = d?.scleraColor;
        if (/^#[0-9a-f]{6}$/i.test(String(raw || ''))) return raw;
        return this._ucDeriveScleraColor(d?.skin || '#D2A07A');
    },

    // Soft eye-socket / upper-lid shadow tone derived from skin.
    _ucDeriveSocketShadow(skin) {
        return this._ucShadeColor(skin, -0.20);
    },

});
