/**
 * Joint System — Facial expressions & expression picker UI
 * (split from joint-system.js for maintainability)
 */

Object.assign(JointSystem.prototype, {

    // ════════════════════════════════════════════════════════════════
    //  Utility
    // ════════════════════════════════════════════════════════════════

    _ucShadeColor(hex, factor) {
        const num = parseInt(String(hex).replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, ((num >> 16) & 0xFF) + Math.round(255 * factor)));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0xFF) + Math.round(255 * factor)));
        const b = Math.min(255, Math.max(0, (num & 0xFF) + Math.round(255 * factor)));
        return `#${(r << 16 | g << 8 | b).toString(16).padStart(6, '0')}`;
    },

    // ════════════════════════════════════════════════════════════════
    //  UI: Character Creation Dialog
    // ════════════════════════════════════════════════════════════════

    openUniversalCharacterDialog(initialConfig = null, options = {}) {
        document.getElementById('uc-dialog')?.remove();

        const editArmature = options?.editArmature || null;
        const isEditMode = !!editArmature;

        const skinTones = [
            { name: 'Light',       hex: '#FADCBC' },
            { name: 'Fair',        hex: '#F1C9A5' },
            { name: 'Medium',      hex: '#D2A07A' },
            { name: 'Olive',       hex: '#C08C5A' },
            { name: 'Tan',         hex: '#A06C3C' },
            { name: 'Brown',       hex: '#7A4B2A' },
            { name: 'Dark Brown',  hex: '#5A3420' },
            { name: 'Deep',        hex: '#3D2114' }
        ];

        const hairColors = [
            { name: 'Black',       hex: '#1A1A1A' },
            { name: 'Dark Brown',  hex: '#3B2314' },
            { name: 'Brown',       hex: '#6B3A2A' },
            { name: 'Auburn',      hex: '#8B4513' },
            { name: 'Red',         hex: '#A0522D' },
            { name: 'Blonde',      hex: '#C9A96E' },
            { name: 'Platinum',    hex: '#E8D5B0' },
            { name: 'Grey',        hex: '#9E9E9E' },
            { name: 'White',       hex: '#E0E0E0' }
        ];

        const eyeColors = [
            { name: 'Brown',       hex: '#4B3424' },
            { name: 'Dark Brown',  hex: '#2B1D14' },
            { name: 'Black',       hex: '#171717' },
            { name: 'Hazel',       hex: '#7A5A2E' },
            { name: 'Amber',       hex: '#9B6A2F' },
            { name: 'Green',       hex: '#4F7D58' },
            { name: 'Blue',        hex: '#4A6FA5' },
            { name: 'Grey',        hex: '#7A8792' }
        ];

        const scleraColors = [
            { name: 'Auto (skin-keyed)', hex: 'auto' },
            { name: 'White',             hex: '#F4EFE9' },
            { name: 'Pale',              hex: '#FBFBF6' },
            { name: 'Jaundice',          hex: '#E7CF6E' },
            { name: 'Bloodshot',         hex: '#E7B3AC' },
            { name: 'Conjunctivitis',    hex: '#E48E8E' }
        ];

        const outfitPresets = [
            { val: 'custom', label: 'Custom' },
            { val: 'casual', label: 'Casual' },
            { val: 'school', label: 'School' },
            { val: 'teacher', label: 'Teacher' },
            { val: 'business', label: 'Business' },
            { val: 'corporate', label: 'Corporate' },
            { val: 'lawyer', label: 'Lawyer' },
            { val: 'sports', label: 'Sports' },
            { val: 'security', label: 'Security' },
            { val: 'pilot', label: 'Pilot' },
            { val: 'engineer', label: 'Engineer' },
            { val: 'academic', label: 'Academic' },
            { val: 'scientist', label: 'Scientist' },
            { val: 'mechanic', label: 'Mechanic' },
            { val: 'farmer', label: 'Farmer' },
            { val: 'chief', label: 'Chief' },
            { val: 'clergy', label: 'Clergy' },
            { val: 'graduate', label: 'Graduate' },
            { val: 'doctor', label: 'Doctor' },
            { val: 'nurse', label: 'Nurse' },
            { val: 'scrubs', label: 'Scrubs' },
            { val: 'chef', label: 'Chef' },
            { val: 'construction', label: 'Construction' },
            { val: 'hospitality', label: 'Hospitality' },
            { val: 'dashiki', label: 'Dashiki' },
            { val: 'ankara', label: 'Ankara' },
            { val: 'kaftan', label: 'Kaftan' },
            { val: 'agbada', label: 'Agbada' },
            { val: 'agbada2', label: 'Agbada 2' },
            { val: 'agbada3', label: 'Agbada Short' },
            { val: 'royal-agbada', label: 'Royal Agbada' },
            { val: 'royal-agbada-painted', label: 'Royal Agbada Paint' },
            { val: 'senator', label: 'Senator' },
            { val: 'senator2', label: 'Senator 2' },
            { val: 'senator3', label: 'Senator Short' },
            { val: 'senator-shirt', label: 'Senator Shirt' },
            { val: 'senator-shirt-panel', label: 'Senator Panel' },
            { val: 'senator-shirt-stripe', label: 'Senator Stripe' },
            { val: 'executive-tunic-suit', label: 'Executive Tunic Suit' },
            { val: 'buba-wrapper', label: 'Buba/Wrapper' },
            { val: 'iro-buba', label: 'Iro & Buba' },
            { val: 'ankara-peplum', label: 'Ankara Peplum' },
            { val: 'bubu-gown', label: 'Bubu Gown' },
            { val: 'george-wrapper', label: 'George Wrapper' },
            { val: 'hybrid-skirt', label: 'Hybrid Skirt' },
            { val: 'iro-buba-hybrid', label: 'Iro & Buba Hybrid' },
            { val: 'ankara-peplum-hybrid', label: 'Ankara Peplum Hybrid' },
            { val: 'bubu-gown-hybrid', label: 'Bubu Gown Hybrid' },
            { val: 'george-wrapper-hybrid', label: 'George Wrapper Hybrid' },
            { val: 'adire', label: 'Adire' },
            { val: 'kente', label: 'Kente' },
            { val: 'modest', label: 'Modest' }
        ];

        const qualityPresets = [
            { val: 'clean', label: 'Clean' },
            { val: 'human-like', label: 'Human-like' },
            { val: 'refined', label: 'Refined' },
            { val: 'cartoon', label: 'Cartoon' },
            { val: 'soft', label: 'Soft' },
            { val: 'detailed', label: 'Detailed' },
            { val: 'simple', label: 'Simple' }
        ];

        const savedTemplates = this._loadUniversalCharacterStyleTemplates();
        const dialog = document.createElement('div');
        dialog.id = 'uc-dialog';
        dialog.style.cssText = `
            position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
            background: var(--panel-bg, #1e1e2e); color: var(--text-primary, #e0e0e0);
            border: 1px solid var(--border-color, #3a3a4a); border-radius: 12px;
            padding: 24px; width: 720px; max-width: calc(100vw - 32px); max-height: 90vh; overflow-y: auto; z-index: 10000;
            box-shadow: 0 12px 40px rgba(0,0,0,0.5); font-family: inherit;
        `;

        const makeOptRow = (options, defaultVal) => options.map(o =>
            `<button class="uc-opt-btn${o.val === defaultVal ? ' selected' : ''}" data-val="${o.val}"
                style="flex:1; padding:6px; border:1px solid ${o.val === defaultVal ? 'var(--accent-primary,#6c9fe8)' : 'var(--border-color,#3a3a4a)'}; border-radius:6px; background:var(--item-bg,#2a2a3a); color:inherit; cursor:pointer; font-size:11px;">
                ${o.icon ? '<i class="fas ' + o.icon + '"></i> ' : ''}${o.label}</button>`
        ).join('');

        dialog.innerHTML = `
            <h3 style="margin:0 0 16px; font-size:16px; display:flex; align-items:center; gap:8px;">
                <i class="fas fa-person" style="color:var(--accent-primary,#6c9fe8)"></i>
                ${isEditMode ? 'Edit Universal Character' : 'Universal Character'}
            </h3>

            <div style="display:grid; grid-template-columns:minmax(0,1fr) 240px; gap:16px; align-items:start;">
            <div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Style Template</label>
            <div style="display:flex; gap:6px; margin-bottom:10px; align-items:center;">
                <select id="uc-template-select" class="jpl-input" style="flex:1;">
                    <option value="">New style…</option>
                    ${savedTemplates.map(template => `<option value="${template.id}">${this._escapeHtml(template.name || 'Untitled Style')}</option>`).join('')}
                </select>
            </div>
            <div style="display:flex; gap:6px; margin-bottom:14px; align-items:center;">
                <input id="uc-template-name" class="jpl-input" type="text" placeholder="Save current settings as style…" maxlength="50" style="flex:1;">
                <button id="uc-save-template" class="btn-small ja-btn-green"><i class="fas fa-save"></i> Save Style</button>
                <button id="uc-humanize" class="btn-small" title="Apply natural human-like proportions without changing the whole character"><i class="fas fa-wand-magic-sparkles"></i> Humanize</button>
                <button id="uc-randomize" class="btn-small" title="Randomize character"><i class="fas fa-dice"></i> Random</button>
            </div>
            <div style="display:flex; gap:6px; margin:-4px 0 14px; flex-wrap:wrap;">
                <button id="uc-expand-all" class="btn-small" title="Open all Universal Character sections"><i class="fas fa-up-right-and-down-left-from-center"></i> Expand all</button>
                <button id="uc-collapse-all" class="btn-small" title="Collapse detailed Universal Character sections"><i class="fas fa-down-left-and-up-right-to-center"></i> Collapse details</button>
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">View</label>
            <div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;" id="uc-view-row">
                ${makeOptRow([
                    { val: 'front', label: 'Front', icon: 'fa-user' },
                    { val: 'front-3q', label: 'Front 3/4', icon: 'fa-user-check' },
                    { val: 'side', label: 'Side', icon: 'fa-user-large' },
                    { val: 'back-3q', label: 'Back 3/4', icon: 'fa-user-tag' },
                    { val: 'back', label: 'Back', icon: 'fa-user-slash' }
                ], 'front')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Renderer</label>
            <div style="display:flex; gap:6px; margin-bottom:14px;" id="uc-engine-row">
                ${makeOptRow([
                    { val: 'classic', label: 'Classic', icon: 'fa-cube' },
                    { val: 'advanced', label: 'Advanced', icon: 'fa-gem' }
                ], 'advanced')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Character Quality</label>
            <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;" id="uc-quality-row">
                ${makeOptRow(qualityPresets, 'clean')}
            </div>
            <input id="uc-outline-color" type="hidden" value="#4A3728">
            <input id="uc-outline-width" type="hidden" value="1.5">

            <div id="uc-facing-section" style="display:none;">
                <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Facing Direction</label>
                <div style="display:flex; gap:6px; margin-bottom:14px;" id="uc-facing-row">
                    ${makeOptRow([
                        { val: 'right', label: 'Facing Right', icon: 'fa-arrow-right' },
                        { val: 'left', label: 'Facing Left', icon: 'fa-arrow-left' }
                    ], 'right')}
                </div>
            </div>

            <div id="uc-front-lean-section">
                <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Front Lean <span style="opacity:0.55;">(legacy arm depth)</span></label>
                <div style="display:flex; gap:6px; margin-bottom:14px;" id="uc-front-lean-row">
                    ${makeOptRow([
                        { val: 'none', label: 'Straight', icon: 'fa-user' },
                        { val: 'left', label: '3/4 Left', icon: 'fa-arrow-left' },
                        { val: 'right', label: '3/4 Right', icon: 'fa-arrow-right' }
                    ], 'none')}
                </div>
            </div>

            <div style="padding:10px; border-radius:8px; background:rgba(108,159,232,0.07); border:1px solid rgba(108,159,232,0.18); margin-bottom:14px;">
                <div style="font-size:12px; font-weight:600; margin-bottom:8px;">Face Feature Size</div>
                <div style="display:grid; grid-template-columns:72px 1fr 42px; gap:6px 8px; align-items:center; font-size:11px;">
                    <span>Human detail</span><input id="uc-human-like-strength" type="range" min="0" max="100" step="5" value="60"><span id="uc-human-like-strength-v" style="text-align:right; opacity:0.7;">60</span>
                    <span>Front nose</span><input id="uc-front-nose-scale" type="range" min="60" max="160" step="5" value="100"><span id="uc-front-nose-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Front mouth</span><input id="uc-front-mouth-scale" type="range" min="60" max="160" step="5" value="100"><span id="uc-front-mouth-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Side nose</span><input id="uc-side-nose-scale" type="range" min="60" max="160" step="5" value="100"><span id="uc-side-nose-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Side mouth</span><input id="uc-side-mouth-scale" type="range" min="60" max="160" step="5" value="100"><span id="uc-side-mouth-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Eyes</span><input id="uc-eye-scale" type="range" min="60" max="140" step="5" value="100"><span id="uc-eye-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Jaw</span><input id="uc-jaw-scale" type="range" min="70" max="140" step="5" value="100"><span id="uc-jaw-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Chin</span><input id="uc-chin-scale" type="range" min="70" max="140" step="5" value="100"><span id="uc-chin-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Cheeks</span><input id="uc-cheek-scale" type="range" min="70" max="140" step="5" value="100"><span id="uc-cheek-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Forehead</span><input id="uc-forehead-scale" type="range" min="70" max="140" step="5" value="100"><span id="uc-forehead-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Lips</span><input id="uc-lip-scale" type="range" min="70" max="150" step="5" value="100"><span id="uc-lip-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Bridge</span><input id="uc-nose-bridge-scale" type="range" min="70" max="150" step="5" value="100"><span id="uc-nose-bridge-scale-v" style="text-align:right; opacity:0.7;">100%</span>
                </div>
                <label style="font-size:12px; opacity:0.7; display:block; margin:10px 0 4px;">Eye Type</label>
                <div style="display:flex; gap:6px; flex-wrap:wrap;" id="uc-eye-type-row">
                    ${makeOptRow([
                        { val: 'almond', label: 'Almond' },
                        { val: 'round', label: 'Round' },
                        { val: 'narrow', label: 'Narrow' },
                        { val: 'wide', label: 'Wide' },
                        { val: 'hooded', label: 'Hooded' }
                    ], 'almond')}
                </div>
                <div style="display:flex; justify-content:flex-end; gap:6px; margin-top:10px;">
                    <button type="button" id="uc-face-reset" class="btn-small" title="Reset face sliders"><i class="fas fa-rotate-left"></i> Reset Face</button>
                </div>
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Gender</label>
            <div style="display:flex; gap:6px; margin-bottom:14px;" id="uc-gender-row">
                ${makeOptRow([
                    { val: 'male', label: 'Male', icon: 'fa-mars' },
                    { val: 'female', label: 'Female', icon: 'fa-venus' },
                    { val: 'neutral', label: 'Neutral', icon: 'fa-genderless' }
                ], 'male')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Age Group</label>
            <div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;" id="uc-age-row">
                ${makeOptRow([
                    { val: 'neonate', label: 'Neonate' },
                    { val: 'child', label: 'Child' },
                    { val: 'adolescent', label: 'Adolescent' },
                    { val: 'adult', label: 'Adult' },
                    { val: 'elderly', label: 'Elderly' }
                ], 'adult')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Build <span style="opacity:0.55;">(frame &amp; muscle)</span></label>
            <div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;" id="uc-build-row">
                ${makeOptRow(this._ucGetBuildOptions(), 'average')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Weight <span style="opacity:0.55;">(softness)</span></label>
            <div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;" id="uc-weight-row">
                ${makeOptRow(this._ucGetWeightOptions(), 'average')}
            </div>

            <div style="margin-bottom:14px; padding:10px; border-radius:8px; background:rgba(108,159,232,0.07); border:1px solid rgba(108,159,232,0.18);">
                <div style="font-size:12px; font-weight:600; margin-bottom:8px;">Body Shaping</div>
                <div style="display:grid; grid-template-columns:54px 1fr 38px; gap:6px 8px; align-items:center; font-size:11px;">
                    <span>Muscle</span><input id="uc-muscle" type="range" min="0" max="100" value="50"><span id="uc-muscle-v" style="text-align:right; opacity:0.7;">50</span>
                    <span>Breast/Bust</span><input id="uc-bust" type="range" min="0" max="100" value="50"><span id="uc-bust-v" style="text-align:right; opacity:0.7;">50</span>
                    <span>Hip</span><input id="uc-hip" type="range" min="0" max="100" value="50"><span id="uc-hip-v" style="text-align:right; opacity:0.7;">50</span>
                    <span>Shoulders</span><input id="uc-shoulder" type="range" min="0" max="100" value="50"><span id="uc-shoulder-v" style="text-align:right; opacity:0.7;">50</span>
                    <span>Belly</span><input id="uc-belly" type="range" min="0" max="100" value="50"><span id="uc-belly-v" style="text-align:right; opacity:0.7;">50</span>
                </div>
                <div style="font-size:12px; font-weight:600; margin:12px 0 6px;">Resize a Part</div>
                <select id="uc-part-sel" class="jpl-input" style="width:100%; margin-bottom:8px; font-size:11px;">
                    <option value="body">Whole Body</option>
                    <option value="head">Head</option>
                    <option value="neck">Neck</option>
                    <option value="torso" selected>Torso</option>
                    <option value="arms">Arms</option>
                    <option value="legs">Legs</option>
                </select>
                <div style="display:grid; grid-template-columns:54px 1fr 38px; gap:6px 8px; align-items:center; font-size:11px;">
                    <span>Width</span><input id="uc-part-w" type="range" min="50" max="160" value="100"><span id="uc-part-w-v" style="text-align:right; opacity:0.7;">100%</span>
                    <span>Height</span><input id="uc-part-h" type="range" min="50" max="160" value="100"><span id="uc-part-h-v" style="text-align:right; opacity:0.7;">100%</span>
                </div>
                <input id="uc-ps-overall" type="hidden" value="100">
                ${['head','neck','torso','arms','legs'].map(pn => `<input id="uc-ps-${pn}-w" type="hidden" value="100"><input id="uc-ps-${pn}-h" type="hidden" value="100">`).join('')}
                <div style="display:flex; gap:6px; margin-top:10px; align-items:center;">
                    <select id="uc-shape-preset" class="jpl-input" style="flex:1; font-size:11px;">
                        <option value="">Shape presets…</option>
                        ${this._ucBuiltinBodyShapes().map(pr => `<option value="${pr.id}">${this._escapeHtml(pr.name)}</option>`).join('')}
                        ${this._loadBodyShapePresets().map(pr => `<option value="${pr.id}">${this._escapeHtml(pr.name || 'Shape')}</option>`).join('')}
                    </select>
                    <input id="uc-shape-name" class="jpl-input" type="text" placeholder="Save shape…" maxlength="40" style="flex:1; font-size:11px;">
                    <button id="uc-shape-save" class="btn-small ja-btn-green" title="Save body shape"><i class="fas fa-save"></i></button>
                    <button id="uc-shape-del" class="btn-small" title="Delete selected shape"><i class="fas fa-trash"></i></button>
                    <button id="uc-shape-pregnancy" class="btn-small" title="Apply pregnancy shape">Preg.</button>
                    <button id="uc-shape-reset" class="btn-small" title="Reset shaping"><i class="fas fa-rotate-left"></i></button>
                </div>
            </div>

            <details open class="uc-acc"><summary style="cursor:pointer; font-size:12px; font-weight:700; padding:7px 0; margin-bottom:6px; border-top:1px solid var(--border-color,#3a3a4a);">▾ Colors</summary>
            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Skin Tone</label>
            <div style="display:flex; gap:4px; margin-bottom:14px; flex-wrap:wrap;" id="uc-skin-row">
                ${skinTones.map((s, i) => `
                    <button class="uc-swatch${i === 2 ? ' selected' : ''}" data-val="${s.hex}" title="${s.name}"
                        style="width:32px; height:32px; border-radius:6px; border:2px solid ${i === 2 ? 'var(--accent-primary,#6c9fe8)' : 'transparent'};
                        background:${s.hex}; cursor:pointer;"></button>
                `).join('')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Hair Color</label>
            <div style="display:flex; gap:4px; margin-bottom:14px; flex-wrap:wrap;" id="uc-hair-row">
                ${hairColors.map((h, i) => `
                    <button class="uc-swatch${i === 1 ? ' selected' : ''}" data-val="${h.hex}" title="${h.name}"
                        style="width:32px; height:32px; border-radius:6px; border:2px solid ${i === 1 ? 'var(--accent-primary,#6c9fe8)' : 'transparent'};
                        background:${h.hex}; cursor:pointer;"></button>
                `).join('')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Eye Color</label>
            <div style="display:flex; gap:4px; margin-bottom:14px; flex-wrap:wrap;" id="uc-eye-row">
                ${eyeColors.map((e, i) => `
                    <button class="uc-swatch${i === 0 ? ' selected' : ''}" data-val="${e.hex}" title="${e.name}"
                        style="width:32px; height:32px; border-radius:6px; border:2px solid ${i === 0 ? 'var(--accent-primary,#6c9fe8)' : 'transparent'};
                        background:${e.hex}; cursor:pointer;"></button>
                `).join('')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Sclera <span style="opacity:0.55;">(eye white — jaundice / bloodshot)</span></label>
            <div style="display:flex; gap:4px; margin-bottom:14px; flex-wrap:wrap;" id="uc-sclera-row">
                ${scleraColors.map((s, i) => `
                    <button class="uc-swatch${i === 0 ? ' selected' : ''}" data-val="${s.hex}" title="${s.name}"
                        style="width:32px; height:32px; border-radius:6px; border:2px solid ${i === 0 ? 'var(--accent-primary,#6c9fe8)' : 'transparent'};
                        background:${s.hex === 'auto' ? 'linear-gradient(135deg,#F4EFE9 50%,#E7CF6E 50%)' : s.hex}; cursor:pointer;"></button>
                `).join('')}
            </div>
            </details>

            <details class="uc-acc"><summary style="cursor:pointer; font-size:12px; font-weight:700; padding:7px 0; margin-bottom:6px; border-top:1px solid var(--border-color,#3a3a4a);">Head &amp; Hair</summary>
            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Head + Neck</label>
            <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;" id="uc-head-row">
                ${makeOptRow([
                    { val: 'classic', label: 'Classic' },
                    { val: 'oval', label: 'Oval' },
                    { val: 'round', label: 'Round' },
                    { val: 'soft', label: 'Soft Oval' },
                    { val: 'defined', label: 'Defined Jaw' },
                    { val: 'square', label: 'Square' },
                    { val: 'heart', label: 'Heart' },
                    { val: 'narrow', label: 'Narrow' },
                    { val: 'long-neck', label: 'Long Neck' }
                ], 'oval')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Hair Style</label>
            <div style="display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap;" id="uc-hair-style-row"></div>
            <div id="uc-hair-gallery" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(64px,1fr)); gap:8px; max-height:168px; overflow:auto; padding:8px; margin-bottom:12px; border-radius:8px; background:rgba(15,23,42,0.22); border:1px solid rgba(148,163,184,0.18);"></div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Hat / Headgear</label>
            <div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;" id="uc-headwear-row">
                ${makeOptRow(this._ucGetHeadwearStyleOptions(), 'none')}
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Facial Hair</label>
            <div style="display:flex; gap:6px; margin-bottom:14px; flex-wrap:wrap;" id="uc-facial-hair-row">
                ${makeOptRow(this._ucGetFacialHairOptions(), 'none')}
            </div>
            </details>

            <details open class="uc-acc"><summary style="cursor:pointer; font-size:12px; font-weight:700; padding:7px 0; margin-bottom:6px; border-top:1px solid var(--border-color,#3a3a4a);">▾ Clothing</summary>
            <div style="margin-bottom:14px; padding:10px; border-radius:8px; background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.18);">
                <div style="font-size:12px; opacity:0.85; margin-bottom:8px; font-weight:600;">Clothing Parts</div>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Outfit Preset</label>
                <div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;" id="uc-outfit-row">
                    ${makeOptRow(outfitPresets, 'custom')}
                </div>
                <div id="uc-outfit-gallery" style="display:grid; grid-template-columns:repeat(auto-fill,minmax(74px,1fr)); gap:8px; max-height:190px; overflow:auto; padding:8px; margin-bottom:12px; border-radius:8px; background:rgba(15,23,42,0.22); border:1px solid rgba(148,163,184,0.18);"></div>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Clothing Mode</label>
                <div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;" id="uc-garment-mode-row">
                    ${makeOptRow([
                        { val: 'painted', label: 'Painted' },
                        { val: 'pinned', label: 'Pinned Parts' },
                        { val: 'hybrid', label: 'Pinned + Painted' }
                    ], 'painted')}
                </div>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Top</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-top-row">
                    ${makeOptRow([
                        { val: 'none', label: 'None' },
                        { val: 'tee', label: 'Tee' },
                        { val: 'polo', label: 'Polo' },
                        { val: 'long-sleeve', label: 'Long Sleeve' },
                        { val: 'sweater', label: 'Sweater' },
                        { val: 'hoodie', label: 'Hoodie' },
                        { val: 'jacket', label: 'Jacket' },
                        { val: 'dress', label: 'Dress' },
                        { val: 'shirt', label: 'Shirt' },
                        { val: 'blouse', label: 'Blouse' },
                        { val: 'blazer', label: 'Blazer' },
                        { val: 'lab-coat', label: 'Lab Coat' },
                        { val: 'scrub-top', label: 'Scrub Top' },
                        { val: 'tunic', label: 'Tunic' },
                        { val: 'chef-coat', label: 'Chef Coat' },
                        { val: 'vest', label: 'Vest' },
                        { val: 'hi-vis', label: 'Hi-Vis' },
                        { val: 'agbada', label: 'Agbada' }
                    ], 'tee')}
                </div>

                <details id="uc-blouse-options" class="uc-context-options" style="margin:8px 0 10px; padding:8px; border-radius:8px; background:rgba(236,72,153,0.08); border:1px solid rgba(236,72,153,0.18);">
                <summary style="cursor:pointer; font-size:11px; font-weight:700; opacity:0.88; margin-bottom:8px;">Blouse options</summary>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Neck</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-blouse-neck-row">
                    ${makeOptRow([
                        { val: 'round', label: 'Round' },
                        { val: 'v-neck', label: 'V Neck' },
                        { val: 'square', label: 'Square' },
                        { val: 'sweetheart', label: 'Sweetheart' },
                        { val: 'high', label: 'High' },
                        { val: 'off-shoulder', label: 'Off Shoulder' }
                    ], 'round')}
                </div>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Sleeve</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-blouse-sleeve-row">
                    ${makeOptRow([
                        { val: 'sleeveless', label: 'Sleeveless' },
                        { val: 'cap', label: 'Cap' },
                        { val: 'short', label: 'Short' },
                        { val: 'elbow', label: 'Elbow' },
                        { val: 'three-quarter', label: '3/4' },
                        { val: 'long', label: 'Long' },
                        { val: 'puff', label: 'Puff' },
                        { val: 'bell', label: 'Bell' }
                    ], 'short')}
                </div>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Body</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-blouse-body-row">
                    ${makeOptRow([
                        { val: 'fitted', label: 'Fitted' },
                        { val: 'loose', label: 'Loose' },
                        { val: 'peplum', label: 'Peplum' },
                        { val: 'wrap', label: 'Wrap' },
                        { val: 'corset', label: 'Corset' },
                        { val: 'crop', label: 'Crop' }
                    ], 'fitted')}
                </div>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Design</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-blouse-design-row">
                    ${makeOptRow([
                        { val: 'plain', label: 'Plain' },
                        { val: 'ankara-print', label: 'Ankara' },
                        { val: 'lace', label: 'Lace' },
                        { val: 'beaded', label: 'Beaded' },
                        { val: 'pleated', label: 'Pleated' },
                        { val: 'embroidered', label: 'Embroidered' }
                    ], 'plain')}
                </div>
                </details>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Bottom</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-bottom-row">
                    ${makeOptRow([
                        { val: 'none', label: 'None' },
                        { val: 'shorts', label: 'Shorts' },
                        { val: 'pants', label: 'Pants' },
                        { val: 'skirt', label: 'Skirt' },
                        { val: 'slacks', label: 'Slacks' },
                        { val: 'scrub-pants', label: 'Scrub Pants' },
                        { val: 'cargo', label: 'Cargo' }
                    ], 'pants')}
                </div>

                <details id="uc-skirt-options" class="uc-context-options" style="margin:8px 0 10px; padding:8px; border-radius:8px; background:rgba(168,85,247,0.08); border:1px solid rgba(168,85,247,0.18);">
                <summary style="cursor:pointer; font-size:11px; font-weight:700; opacity:0.88; margin-bottom:8px;">Skirt options</summary>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Length</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-skirt-length-row">
                    ${makeOptRow([
                        { val: 'mini', label: 'Mini' },
                        { val: 'short', label: 'Short' },
                        { val: 'knee', label: 'Knee' },
                        { val: 'midi', label: 'Midi' },
                        { val: 'ankle', label: 'Ankle' },
                        { val: 'floor', label: 'Floor' }
                    ], 'knee')}
                </div>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Design</label>
                <div style="display:flex; gap:6px; margin-bottom:8px; flex-wrap:wrap;" id="uc-skirt-design-row">
                    ${makeOptRow([
                        { val: 'pencil', label: 'Pencil' },
                        { val: 'a-line', label: 'A-Line' },
                        { val: 'flared', label: 'Flared' },
                        { val: 'wrapper', label: 'Wrapper' },
                        { val: 'pleated', label: 'Pleated' },
                        { val: 'mermaid', label: 'Mermaid' }
                    ], 'a-line')}
                </div>
                </details>

                <label style="font-size:11px; opacity:0.7; display:block; margin-bottom:4px;">Footwear</label>
                <div style="display:flex; gap:6px; margin-bottom:10px; flex-wrap:wrap;" id="uc-footwear-row">
                    ${makeOptRow([
                        { val: 'none', label: 'Bare' },
                        { val: 'shoes', label: 'Shoes' },
                        { val: 'boots', label: 'Boots' },
                        { val: 'dress-shoes', label: 'Dress Shoes' },
                        { val: 'clogs', label: 'Clogs' },
                        { val: 'heels', label: 'Heels' }
                    ], 'shoes')}
                </div>

                <div style="display:grid; grid-template-columns:1fr auto; gap:6px 10px; align-items:center; font-size:11px;">
                    <label for="uc-top-color">Top Color</label>
                    <input id="uc-top-color" type="color" value="#5f7c8a" style="width:44px; height:28px; border:none; background:none; cursor:pointer;">
                    <label for="uc-bottom-color">Bottom Color</label>
                    <input id="uc-bottom-color" type="color" value="#2f4858" style="width:44px; height:28px; border:none; background:none; cursor:pointer;">
                    <label for="uc-footwear-color">Footwear Color</label>
                    <input id="uc-footwear-color" type="color" value="#5a3420" style="width:44px; height:28px; border:none; background:none; cursor:pointer;">
                    <label for="uc-accent-color">Accent Color</label>
                    <input id="uc-accent-color" type="color" value="#DCE7EE" style="width:44px; height:28px; border:none; background:none; cursor:pointer;">
                </div>
            </div>
            </details>

            <div style="margin-bottom:14px; padding:10px; border-radius:8px; background:rgba(34,197,94,0.08); border:1px solid rgba(34,197,94,0.18);">
                <label style="display:flex; align-items:center; gap:8px; font-size:12px; margin-bottom:8px; cursor:pointer;">
                    <input type="checkbox" id="uc-linked-set-toggle">
                    <span>Create linked view set</span>
                </label>
                <div id="uc-linked-views" style="display:none; grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; font-size:11px;">
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="front" checked> Front</label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="front-3q-right" checked> Front 3/4 Right</label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="side-right" checked> Side Right</label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="back-3q-right" checked> Back 3/4 Right</label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="back" checked> Back</label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="front-3q-left"> Front 3/4 Left</label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="side-left"> Side Left</label>
                    <label style="display:flex; align-items:center; gap:6px; cursor:pointer;"><input type="checkbox" data-linked-view="back-3q-left"> Back 3/4 Left</label>
                </div>
                <div style="font-size:10px; color:#9adbb1; line-height:1.4; margin-top:8px;">
                    Linked sets create matched front, 3/4, side, and back variants from one stored style instead of depending on view flips.
                </div>
            </div>

            <label style="font-size:12px; opacity:0.7; display:block; margin-bottom:4px;">Stage Size (px) <span style="opacity:0.55;">(final height on stage)</span></label>
            <input type="range" id="uc-height" min="300" max="900" value="700" style="width:100%; margin-bottom:4px;">
            <div style="display:flex; justify-content:space-between; font-size:11px; opacity:0.5; margin-bottom:14px;">
                <span>300px</span><span id="uc-height-val">700px</span><span>900px</span>
            </div>

            <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:8px;">
                <button id="uc-cancel" style="padding:8px 16px; border:1px solid var(--border-color,#3a3a4a); border-radius:6px; background:transparent; color:inherit; cursor:pointer;">Cancel</button>
                <button id="uc-create" style="padding:8px 20px; border:none; border-radius:6px; background:var(--accent-primary,#6c9fe8); color:#fff; cursor:pointer; font-weight:600;">${isEditMode ? 'Update Character' : 'Create Character'}</button>
            </div>
            </div>
            <div style="position:sticky; top:0;">
                <div style="padding:12px; border-radius:10px; background:rgba(59,130,246,0.08); border:1px solid rgba(59,130,246,0.18);">
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px;">
                        <div style="font-size:12px; font-weight:600; color:#cfe0ff;">Live Preview</div>
                        <div style="display:flex; gap:4px;" aria-label="Preview focus">
                            <button type="button" id="uc-preview-full" class="uc-preview-focus-btn selected" data-focus="full" style="padding:4px 7px; border-radius:5px; border:1px solid var(--accent-primary,#6c9fe8); background:rgba(108,159,232,0.18); color:inherit; cursor:pointer; font-size:10px;">Full</button>
                            <button type="button" id="uc-preview-face" class="uc-preview-focus-btn" data-focus="face" style="padding:4px 7px; border-radius:5px; border:1px solid var(--border-color,#3a3a4a); background:rgba(15,23,42,0.24); color:inherit; cursor:pointer; font-size:10px;">Face</button>
                            <button type="button" id="uc-preview-compare" style="padding:4px 7px; border-radius:5px; border:1px solid var(--border-color,#3a3a4a); background:rgba(15,23,42,0.24); color:inherit; cursor:pointer; font-size:10px;">Compare</button>
                        </div>
                    </div>
                    <div style="display:grid; grid-template-columns:36px 1fr 42px; gap:6px; align-items:center; margin-bottom:8px; font-size:10px; color:#9fb8d6;">
                        <span>Zoom</span>
                        <input type="range" id="uc-preview-zoom" min="100" max="400" step="25" value="100" style="width:100%;">
                        <span id="uc-preview-zoom-v" style="text-align:right;">100%</span>
                    </div>
                    <div id="uc-preview" style="display:flex; align-items:center; justify-content:center; min-height:260px; border-radius:8px; background:linear-gradient(180deg, rgba(15,23,42,0.30), rgba(15,23,42,0.08)); overflow:hidden;"></div>
                    <div id="uc-preview-caption" style="font-size:10px; color:#9fb8d6; line-height:1.4; margin-top:8px;">Preview updates as you change body type, age, head-neck style, hairstyle, and outfit details.</div>
                </div>
            </div>
            </div>
        `;

        document.body.appendChild(dialog);

        let renderPreview = () => {};
        let previewFocus = 'full';
        let previewZoom = 1;
        let previewCompare = false;

        const setPreviewFocus = (focus = 'full', options = {}) => {
            previewFocus = focus === 'face' ? 'face' : 'full';
            dialog.querySelectorAll('.uc-preview-focus-btn').forEach(btn => {
                const active = btn.dataset.focus === previewFocus;
                btn.classList.toggle('selected', active);
                btn.style.borderColor = active ? 'var(--accent-primary,#6c9fe8)' : 'var(--border-color,#3a3a4a)';
                btn.style.background = active ? 'rgba(108,159,232,0.18)' : 'rgba(15,23,42,0.24)';
            });
            if (options.render !== false) renderPreview();
        };

        const setPreviewCompare = (enabled, options = {}) => {
            previewCompare = !!enabled;
            const btn = dialog.querySelector('#uc-preview-compare');
            if (btn) {
                btn.classList.toggle('selected', previewCompare);
                btn.style.borderColor = previewCompare ? 'var(--accent-primary,#6c9fe8)' : 'var(--border-color,#3a3a4a)';
                btn.style.background = previewCompare ? 'rgba(108,159,232,0.18)' : 'rgba(15,23,42,0.24)';
            }
            if (options.render !== false) renderPreview();
        };

        const setPreviewZoom = (value, options = {}) => {
            const num = parseFloat(value);
            previewZoom = Math.max(1, Math.min(4, Number.isFinite(num) ? num : 1));
            const zoomInput = dialog.querySelector('#uc-preview-zoom');
            const zoomValue = dialog.querySelector('#uc-preview-zoom-v');
            if (zoomInput) zoomInput.value = String(Math.round(previewZoom * 100));
            if (zoomValue) zoomValue.textContent = `${Math.round(previewZoom * 100)}%`;
            if (options.render !== false) renderPreview();
        };

        const focusFacePreview = (options = {}) => {
            setPreviewFocus('face', options);
        };

        const selectOpt = (rowId, value) => {
            const row = dialog.querySelector(`#${rowId}`);
            if (!row) return;
            const target = row.querySelector(`.uc-opt-btn[data-val="${value}"]`);
            if (!target) return;
            row.querySelectorAll('.uc-opt-btn').forEach(btn => {
                btn.classList.remove('selected');
                btn.style.borderColor = 'var(--border-color,#3a3a4a)';
            });
            target.classList.add('selected');
            target.style.borderColor = 'var(--accent-primary,#6c9fe8)';
            renderPreview();
        };

        const selectSwatch = (rowId, value) => {
            const row = dialog.querySelector(`#${rowId}`);
            if (!row) return;
            const target = [...row.querySelectorAll('.uc-swatch')].find(btn => String(btn.dataset.val || '').toLowerCase() === String(value || '').toLowerCase());
            if (!target) return;
            row.querySelectorAll('.uc-swatch').forEach(btn => {
                btn.style.borderColor = 'transparent';
                btn.classList.remove('selected');
            });
            target.style.borderColor = 'var(--accent-primary,#6c9fe8)';
            target.classList.add('selected');
            renderPreview();
        };

        const bindOptRow = (rowId, onSelect = null) => {
            const row = dialog.querySelector(`#${rowId}`);
            row?.querySelectorAll('.uc-opt-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    selectOpt(rowId, btn.dataset.val);
                    if (typeof onSelect === 'function') onSelect(btn.dataset.val);
                });
            });
        };

        const renderHairStyleRow = (selectedValue = null) => {
            const row = dialog.querySelector('#uc-hair-style-row');
            if (!row) return;
            const gender = dialog.querySelector('#uc-gender-row .uc-opt-btn.selected')?.dataset.val || 'male';
            const options = this._ucGetHairStyleOptions(gender);
            const fallback = this._ucNormalizeHairStyle(selectedValue, gender);
            const selected = options.some(option => option.val === fallback) ? fallback : options[0]?.val || 'short';
            row.innerHTML = makeOptRow(options, selected);
            bindOptRow('uc-hair-style-row', (style) => updateHairGallerySelection(style));
            renderHairGallery(selected);
            renderPreview();
        };

        const renderHeadwearRow = (selectedValue = 'none') => {
            const row = dialog.querySelector('#uc-headwear-row');
            if (!row) return;
            const options = this._ucGetHeadwearStyleOptions();
            const fallback = this._ucNormalizeHeadwearStyle(selectedValue);
            const selected = options.some(option => option.val === fallback) ? fallback : 'none';
            row.innerHTML = makeOptRow(options, selected);
            bindOptRow('uc-headwear-row');
            renderPreview();
        };

        const getQualityPresetDefaults = (preset = 'clean') => {
            switch (preset) {
                case 'refined':
                case 'human-like':
                    return {
                        characterEngine: 'advanced',
                        outlineColor: '#2E2420',
                        outlineWidth: 0.95,
                        build: 'average',
                        weight: 'average',
                        headNeckStyle: 'oval',
                        muscle: 50,
                        bust: 46,
                        hip: 52,
                        shoulder: 54,
                        belly: 40,
                        humanLikeStrength: 70,
                        jawScale: 104,
                        chinScale: 96,
                        cheekScale: 108,
                        foreheadScale: 96,
                        lipScale: 108,
                        noseBridgeScale: 112,
                        partScale: {
                            overall: 100,
                            head: { w: 96, h: 98 },
                            neck: { w: 94, h: 104 },
                            torso: { w: 96, h: 102 },
                            arms: { w: 90, h: 102 },
                            legs: { w: 90, h: 104 }
                        },
                        hairByGender: {
                            male: 'side-part',
                            female: 'shoulder-length',
                            neutral: 'short'
                        },
                        headwearStyle: 'none',
                        outfitPreset: 'business',
                        clothing: {
                            garmentMode: 'painted',
                            topStyle: 'shirt',
                            bottomStyle: 'slacks',
                            footwearStyle: 'dress-shoes',
                            topColor: '#3F5F74',
                            bottomColor: '#263746',
                            footwearColor: '#2F261F',
                            accentColor: '#E8EEF2'
                        }
                    };
                case 'cartoon':
                    return { characterEngine: 'advanced', outlineColor: '#2F2633', outlineWidth: 2.4 };
                case 'soft':
                    return { characterEngine: 'advanced', outlineColor: '#6E5B4C', outlineWidth: 0.9 };
                case 'detailed':
                    return { characterEngine: 'advanced', outlineColor: '#30241F', outlineWidth: 1.8 };
                case 'simple':
                    return { characterEngine: 'classic', outlineColor: '#4A3728', outlineWidth: 1.2 };
                case 'clean':
                default:
                    return { characterEngine: 'advanced', outlineColor: '#4A3728', outlineWidth: 1.5 };
            }
        };

        const applyQualityPreset = (preset = 'clean') => {
            const selected = qualityPresets.some(item => item.val === preset) ? preset : 'clean';
            const defaults = getQualityPresetDefaults(selected);
            const setSlider = (id, val) => {
                if (val == null) return;
                const el = dialog.querySelector(id);
                if (el) el.value = String(val);
            };
            const syncPresetReadouts = () => {
                const setV = (id, txt) => { const el = dialog.querySelector(id); if (el) el.textContent = txt; };
                setV('#uc-muscle-v', dialog.querySelector('#uc-muscle')?.value);
                setV('#uc-bust-v', dialog.querySelector('#uc-bust')?.value);
                setV('#uc-hip-v', dialog.querySelector('#uc-hip')?.value);
                setV('#uc-shoulder-v', dialog.querySelector('#uc-shoulder')?.value);
                setV('#uc-belly-v', dialog.querySelector('#uc-belly')?.value);
                setV('#uc-part-w-v', `${dialog.querySelector('#uc-part-w')?.value || 100}%`);
                setV('#uc-part-h-v', `${dialog.querySelector('#uc-part-h')?.value || 100}%`);
                setV('#uc-human-like-strength-v', `${dialog.querySelector('#uc-human-like-strength')?.value || 60}`);
                setV('#uc-front-nose-scale-v', `${dialog.querySelector('#uc-front-nose-scale')?.value || 100}%`);
                setV('#uc-front-mouth-scale-v', `${dialog.querySelector('#uc-front-mouth-scale')?.value || 100}%`);
                setV('#uc-side-nose-scale-v', `${dialog.querySelector('#uc-side-nose-scale')?.value || 100}%`);
                setV('#uc-side-mouth-scale-v', `${dialog.querySelector('#uc-side-mouth-scale')?.value || 100}%`);
                setV('#uc-eye-scale-v', `${dialog.querySelector('#uc-eye-scale')?.value || 100}%`);
                setV('#uc-jaw-scale-v', `${dialog.querySelector('#uc-jaw-scale')?.value || 100}%`);
                setV('#uc-chin-scale-v', `${dialog.querySelector('#uc-chin-scale')?.value || 100}%`);
                setV('#uc-cheek-scale-v', `${dialog.querySelector('#uc-cheek-scale')?.value || 100}%`);
                setV('#uc-forehead-scale-v', `${dialog.querySelector('#uc-forehead-scale')?.value || 100}%`);
                setV('#uc-lip-scale-v', `${dialog.querySelector('#uc-lip-scale')?.value || 100}%`);
                setV('#uc-nose-bridge-scale-v', `${dialog.querySelector('#uc-nose-bridge-scale')?.value || 100}%`);
            };
            selectOpt('uc-quality-row', selected);
            selectOpt('uc-engine-row', defaults.characterEngine);
            if (defaults.build) selectOpt('uc-build-row', defaults.build);
            if (defaults.weight) selectOpt('uc-weight-row', defaults.weight);
            if (defaults.headNeckStyle) selectOpt('uc-head-row', defaults.headNeckStyle);
            if (defaults.hairByGender || defaults.hairStyle) {
                const gender = dialog.querySelector('#uc-gender-row .uc-opt-btn.selected')?.dataset.val || 'male';
                const style = defaults.hairByGender?.[gender] || defaults.hairStyle || defaults.hairByGender?.neutral;
                if (style) {
                    renderHairStyleRow(style);
                    updateHairGallerySelection(style);
                }
            }
            if (defaults.headwearStyle) {
                renderHeadwearRow(defaults.headwearStyle);
            }
            if (defaults.outfitPreset || defaults.clothing) {
                const outfitPreset = defaults.outfitPreset || dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val || 'custom';
                const outfitDefaults = outfitPreset && outfitPreset !== 'custom'
                    ? (this._ucGetOutfitPresetDefaults(outfitPreset) || {})
                    : {};
                const clothingDefaults = {
                    ...outfitDefaults,
                    ...(defaults.clothing || {})
                };
                selectOpt('uc-outfit-row', outfitPreset);
                if (clothingDefaults.garmentMode) selectOpt('uc-garment-mode-row', clothingDefaults.garmentMode);
                if (clothingDefaults.topStyle) selectOpt('uc-top-row', clothingDefaults.topStyle);
                if (clothingDefaults.bottomStyle) selectOpt('uc-bottom-row', clothingDefaults.bottomStyle);
                if (clothingDefaults.skirtLength) selectOpt('uc-skirt-length-row', clothingDefaults.skirtLength);
                if (clothingDefaults.skirtDesign) selectOpt('uc-skirt-design-row', clothingDefaults.skirtDesign);
                if (clothingDefaults.footwearStyle) selectOpt('uc-footwear-row', clothingDefaults.footwearStyle);
                const topColor = dialog.querySelector('#uc-top-color');
                const bottomColor = dialog.querySelector('#uc-bottom-color');
                const footwearColor = dialog.querySelector('#uc-footwear-color');
                const accentColor = dialog.querySelector('#uc-accent-color');
                if (topColor && clothingDefaults.topColor) topColor.value = clothingDefaults.topColor;
                if (bottomColor && clothingDefaults.bottomColor) bottomColor.value = clothingDefaults.bottomColor;
                if (footwearColor && clothingDefaults.footwearColor) footwearColor.value = clothingDefaults.footwearColor;
                if (accentColor && clothingDefaults.accentColor) accentColor.value = clothingDefaults.accentColor;
                updateOutfitGallerySelection(outfitPreset);
            }
            const outlineColor = dialog.querySelector('#uc-outline-color');
            const outlineWidth = dialog.querySelector('#uc-outline-width');
            if (outlineColor) outlineColor.value = defaults.outlineColor;
            if (outlineWidth) outlineWidth.value = String(defaults.outlineWidth);
            setSlider('#uc-muscle', defaults.muscle);
            setSlider('#uc-bust', defaults.bust);
            setSlider('#uc-hip', defaults.hip);
            setSlider('#uc-shoulder', defaults.shoulder);
            setSlider('#uc-belly', defaults.belly);
            setSlider('#uc-human-like-strength', defaults.humanLikeStrength);
            setSlider('#uc-jaw-scale', defaults.jawScale);
            setSlider('#uc-chin-scale', defaults.chinScale);
            setSlider('#uc-cheek-scale', defaults.cheekScale);
            setSlider('#uc-forehead-scale', defaults.foreheadScale);
            setSlider('#uc-lip-scale', defaults.lipScale);
            setSlider('#uc-nose-bridge-scale', defaults.noseBridgeScale);
            if (defaults.partScale) {
                setSlider('#uc-ps-overall', defaults.partScale.overall);
                ['head', 'neck', 'torso', 'arms', 'legs'].forEach(pn => {
                    const part = defaults.partScale[pn];
                    if (!part) return;
                    setSlider(`#uc-ps-${pn}-w`, part.w);
                    setSlider(`#uc-ps-${pn}-h`, part.h);
                });
                const selectedPart = dialog.querySelector('#uc-part-sel')?.value || 'torso';
                const activePart = selectedPart === 'body' ? defaults.partScale.torso : defaults.partScale[selectedPart];
                if (activePart) {
                    setSlider('#uc-part-w', activePart.w);
                    setSlider('#uc-part-h', activePart.h);
                }
            }
            syncPresetReadouts();
            renderPreview();
        };

        const collectDialogConfig = () => ({
            qualityPreset: dialog.querySelector('#uc-quality-row .uc-opt-btn.selected')?.dataset.val || 'clean',
            view: dialog.querySelector('#uc-view-row .uc-opt-btn.selected')?.dataset.val || 'front',
            front3qLean: dialog.querySelector('#uc-front-lean-row .uc-opt-btn.selected')?.dataset.val || 'none',
            characterEngine: dialog.querySelector('#uc-engine-row .uc-opt-btn.selected')?.dataset.val || 'advanced',
            sideFacing: dialog.querySelector('#uc-facing-row .uc-opt-btn.selected')?.dataset.val || 'right',
            frontNoseScale: parseInt(dialog.querySelector('#uc-front-nose-scale')?.value || '100', 10) || 100,
            frontMouthScale: parseInt(dialog.querySelector('#uc-front-mouth-scale')?.value || '100', 10) || 100,
            sideNoseScale: parseInt(dialog.querySelector('#uc-side-nose-scale')?.value || '100', 10) || 100,
            sideMouthScale: parseInt(dialog.querySelector('#uc-side-mouth-scale')?.value || '100', 10) || 100,
            eyeScale: parseInt(dialog.querySelector('#uc-eye-scale')?.value || '100', 10) || 100,
            eyeType: dialog.querySelector('#uc-eye-type-row .uc-opt-btn.selected')?.dataset.val || 'almond',
            humanLikeStrength: parseInt(dialog.querySelector('#uc-human-like-strength')?.value || '60', 10) || 60,
            jawScale: parseInt(dialog.querySelector('#uc-jaw-scale')?.value || '100', 10) || 100,
            chinScale: parseInt(dialog.querySelector('#uc-chin-scale')?.value || '100', 10) || 100,
            cheekScale: parseInt(dialog.querySelector('#uc-cheek-scale')?.value || '100', 10) || 100,
            foreheadScale: parseInt(dialog.querySelector('#uc-forehead-scale')?.value || '100', 10) || 100,
            lipScale: parseInt(dialog.querySelector('#uc-lip-scale')?.value || '100', 10) || 100,
            noseBridgeScale: parseInt(dialog.querySelector('#uc-nose-bridge-scale')?.value || '100', 10) || 100,
            gender: dialog.querySelector('#uc-gender-row .uc-opt-btn.selected')?.dataset.val || 'male',
            ageGroup: dialog.querySelector('#uc-age-row .uc-opt-btn.selected')?.dataset.val || 'adult',
            bodyType: undefined,
            build: dialog.querySelector('#uc-build-row .uc-opt-btn.selected')?.dataset.val || 'average',
            weight: dialog.querySelector('#uc-weight-row .uc-opt-btn.selected')?.dataset.val || 'average',
            muscle: parseInt(dialog.querySelector('#uc-muscle')?.value || '50', 10),
            bust: parseInt(dialog.querySelector('#uc-bust')?.value || '50', 10),
            hip: parseInt(dialog.querySelector('#uc-hip')?.value || '50', 10),
            shoulder: parseInt(dialog.querySelector('#uc-shoulder')?.value || '50', 10),
            belly: parseInt(dialog.querySelector('#uc-belly')?.value || '50', 10),
            partScale: {
                overall: parseInt(dialog.querySelector('#uc-ps-overall')?.value || '100', 10),
                head: { w: parseInt(dialog.querySelector('#uc-ps-head-w')?.value || '100', 10), h: parseInt(dialog.querySelector('#uc-ps-head-h')?.value || '100', 10) },
                neck: { w: parseInt(dialog.querySelector('#uc-ps-neck-w')?.value || '100', 10), h: parseInt(dialog.querySelector('#uc-ps-neck-h')?.value || '100', 10) },
                torso: { w: parseInt(dialog.querySelector('#uc-ps-torso-w')?.value || '100', 10), h: parseInt(dialog.querySelector('#uc-ps-torso-h')?.value || '100', 10) },
                arms: { w: parseInt(dialog.querySelector('#uc-ps-arms-w')?.value || '100', 10), h: parseInt(dialog.querySelector('#uc-ps-arms-h')?.value || '100', 10) },
                legs: { w: parseInt(dialog.querySelector('#uc-ps-legs-w')?.value || '100', 10), h: parseInt(dialog.querySelector('#uc-ps-legs-h')?.value || '100', 10) }
            },
            skinTone: dialog.querySelector('#uc-skin-row .uc-swatch.selected')?.dataset.val || '#D2A07A',
            hairColor: dialog.querySelector('#uc-hair-row .uc-swatch.selected')?.dataset.val || '#3B2314',
            eyeColor: dialog.querySelector('#uc-eye-row .uc-swatch.selected')?.dataset.val || '#4B3424',
            scleraColor: dialog.querySelector('#uc-sclera-row .uc-swatch.selected')?.dataset.val || 'auto',
            headNeckStyle: dialog.querySelector('#uc-head-row .uc-opt-btn.selected')?.dataset.val || 'oval',
            hairStyle: dialog.querySelector('#uc-hair-style-row .uc-opt-btn.selected')?.dataset.val || 'short',
            headwearStyle: dialog.querySelector('#uc-headwear-row .uc-opt-btn.selected')?.dataset.val || 'none',
            facialHair: dialog.querySelector('#uc-facial-hair-row .uc-opt-btn.selected')?.dataset.val || 'none',
            outlineColor: dialog.querySelector('#uc-outline-color')?.value || '#4A3728',
            outlineWidth: parseFloat(dialog.querySelector('#uc-outline-width')?.value || '1.5') || 1.5,
            height: parseInt(dialog.querySelector('#uc-height')?.value || '700', 10) || 700,
            clothing: {
                outfitPreset: dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val || 'custom',
                garmentMode: dialog.querySelector('#uc-garment-mode-row .uc-opt-btn.selected')?.dataset.val || 'painted',
                topStyle: dialog.querySelector('#uc-top-row .uc-opt-btn.selected')?.dataset.val || 'tee',
                bottomStyle: dialog.querySelector('#uc-bottom-row .uc-opt-btn.selected')?.dataset.val || 'pants',
                skirtLength: dialog.querySelector('#uc-skirt-length-row .uc-opt-btn.selected')?.dataset.val || 'knee',
                skirtDesign: dialog.querySelector('#uc-skirt-design-row .uc-opt-btn.selected')?.dataset.val || 'a-line',
                blouseNeck: dialog.querySelector('#uc-blouse-neck-row .uc-opt-btn.selected')?.dataset.val || 'round',
                blouseSleeve: dialog.querySelector('#uc-blouse-sleeve-row .uc-opt-btn.selected')?.dataset.val || 'short',
                blouseBody: dialog.querySelector('#uc-blouse-body-row .uc-opt-btn.selected')?.dataset.val || 'fitted',
                blouseDesign: dialog.querySelector('#uc-blouse-design-row .uc-opt-btn.selected')?.dataset.val || 'plain',
                footwearStyle: dialog.querySelector('#uc-footwear-row .uc-opt-btn.selected')?.dataset.val || 'shoes',
                topColor: dialog.querySelector('#uc-top-color')?.value || '#5f7c8a',
                bottomColor: dialog.querySelector('#uc-bottom-color')?.value || '#2f4858',
                footwearColor: dialog.querySelector('#uc-footwear-color')?.value || '#5a3420',
                accentColor: dialog.querySelector('#uc-accent-color')?.value || '#DCE7EE'
            }
        });

        const applyDialogConfig = (config = {}) => {
            const normalized = this._normalizeUniversalCharacterConfig(config);
            selectOpt('uc-quality-row', normalized.qualityPreset || 'clean');
            selectOpt('uc-view-row', normalized.viewVariant || normalized.view);
            selectOpt('uc-front-lean-row', normalized.front3qLean || 'none');
            selectOpt('uc-engine-row', normalized.characterEngine);
            selectOpt('uc-facing-row', normalized.sideFacing);
            selectOpt('uc-gender-row', normalized.gender);
            selectOpt('uc-age-row', normalized.ageGroup);
            selectOpt('uc-build-row', normalized.build);
            selectOpt('uc-weight-row', normalized.weight);
            const setSlider = (id, val) => { const el = dialog.querySelector(id); if (el) el.value = String(val); };
            setSlider('#uc-muscle', normalized.muscle);
            setSlider('#uc-bust', normalized.bust);
            setSlider('#uc-hip', normalized.hip);
            setSlider('#uc-shoulder', normalized.shoulder);
            setSlider('#uc-belly', normalized.belly);
            setSlider('#uc-front-nose-scale', normalized.frontNoseScale);
            setSlider('#uc-front-mouth-scale', normalized.frontMouthScale);
            setSlider('#uc-side-nose-scale', normalized.sideNoseScale);
            setSlider('#uc-side-mouth-scale', normalized.sideMouthScale);
            setSlider('#uc-eye-scale', normalized.eyeScale);
            setSlider('#uc-human-like-strength', normalized.humanLikeStrength);
            setSlider('#uc-jaw-scale', normalized.jawScale);
            setSlider('#uc-chin-scale', normalized.chinScale);
            setSlider('#uc-cheek-scale', normalized.cheekScale);
            setSlider('#uc-forehead-scale', normalized.foreheadScale);
            setSlider('#uc-lip-scale', normalized.lipScale);
            setSlider('#uc-nose-bridge-scale', normalized.noseBridgeScale);
            selectOpt('uc-eye-type-row', normalized.eyeType || 'almond');
            setSlider('#uc-ps-overall', normalized.partScale.overall);
            ['head', 'neck', 'torso', 'arms', 'legs'].forEach(pn => {
                setSlider(`#uc-ps-${pn}-w`, normalized.partScale[pn].w);
                setSlider(`#uc-ps-${pn}-h`, normalized.partScale[pn].h);
            });
            const psel = dialog.querySelector('#uc-part-sel')?.value || 'torso';
            const activePartScale = psel === 'body' ? normalized.partScale.torso : (normalized.partScale[psel] || normalized.partScale.torso);
            setSlider('#uc-part-w', activePartScale.w);
            setSlider('#uc-part-h', activePartScale.h);
            if (typeof syncShapeReadouts === 'function') syncShapeReadouts();
            selectOpt('uc-garment-mode-row', normalized.clothing.garmentMode);
            selectOpt('uc-head-row', normalized.headNeckStyle);
            if (typeof renderOutfitRow === 'function') {
                renderOutfitRow(normalized.clothing.outfitPreset, { render: false });
            } else {
                selectOpt('uc-outfit-row', normalized.clothing.outfitPreset);
            }
            selectOpt('uc-top-row', normalized.clothing.topStyle);
            selectOpt('uc-bottom-row', normalized.clothing.bottomStyle);
            selectOpt('uc-skirt-length-row', normalized.clothing.skirtLength || 'knee');
            selectOpt('uc-skirt-design-row', normalized.clothing.skirtDesign || 'a-line');
            selectOpt('uc-blouse-neck-row', normalized.clothing.blouseNeck || 'round');
            selectOpt('uc-blouse-sleeve-row', normalized.clothing.blouseSleeve || 'short');
            selectOpt('uc-blouse-body-row', normalized.clothing.blouseBody || 'fitted');
            selectOpt('uc-blouse-design-row', normalized.clothing.blouseDesign || 'plain');
            selectOpt('uc-footwear-row', normalized.clothing.footwearStyle);
            selectSwatch('uc-skin-row', normalized.skinTone);
            selectSwatch('uc-hair-row', normalized.hairColor);
            selectSwatch('uc-eye-row', normalized.eyeColor);
            selectSwatch('uc-sclera-row', normalized.scleraColor || 'auto');
            renderHairStyleRow(normalized.hairStyle);
            renderHeadwearRow(normalized.headwearStyle);
            selectOpt('uc-facial-hair-row', normalized.facialHair || 'none');
            const topColor = dialog.querySelector('#uc-top-color');
            const bottomColor = dialog.querySelector('#uc-bottom-color');
            const footwearColor = dialog.querySelector('#uc-footwear-color');
            const accentColor = dialog.querySelector('#uc-accent-color');
            const heightSlider = dialog.querySelector('#uc-height');
            const heightLabel = dialog.querySelector('#uc-height-val');
            const outlineColor = dialog.querySelector('#uc-outline-color');
            const outlineWidth = dialog.querySelector('#uc-outline-width');
            if (topColor) topColor.value = normalized.clothing.topColor;
            if (bottomColor) bottomColor.value = normalized.clothing.bottomColor;
            if (footwearColor) footwearColor.value = normalized.clothing.footwearColor;
            if (accentColor) accentColor.value = normalized.clothing.accentColor;
            if (outlineColor) outlineColor.value = normalized.outlineColor || '#4A3728';
            if (outlineWidth) outlineWidth.value = String(Number.isFinite(normalized.outlineWidth) ? normalized.outlineWidth : 1.5);
            if (heightSlider) heightSlider.value = String(normalized.height);
            if (heightLabel) heightLabel.textContent = `${normalized.height}px`;
            const facingSection = dialog.querySelector('#uc-facing-section');
            if (facingSection) {
                const needsDirection = normalized.view === 'side' || normalized.view === 'front-3q' || normalized.view === 'back-3q';
                facingSection.style.display = needsDirection ? '' : 'none';
            }
            const frontLeanSection = dialog.querySelector('#uc-front-lean-section');
            if (frontLeanSection) {
                frontLeanSection.style.display = (normalized.view === 'front' || normalized.view === 'back') ? '' : 'none';
            }
            renderPreview();
        };

        const headwearForOutfitPreset = (preset) => {
            switch (preset) {
                case 'security':
                case 'pilot':
                    return 'uniform-cap';
                case 'farmer':
                    return 'sun-hat';
                case 'chief':
                case 'agbada':
                case 'agbada2':
                case 'agbada3':
                case 'royal-agbada':
                case 'royal-agbada-painted':
                case 'senator':
                case 'senator2':
                case 'senator3':
                case 'senator-shirt':
                case 'senator-shirt-panel':
                case 'senator-shirt-stripe':
                    return 'kufi';
                case 'buba-wrapper':
                case 'iro-buba':
                    return 'gele-pleated';
                case 'ankara-peplum':
                    return 'ankara-wrap';
                case 'bubu-gown':
                    return 'turban-wrap';
                case 'george-wrapper':
                    return 'beaded-gele';
                case 'hybrid-skirt':
                case 'iro-buba-hybrid':
                    return 'gele-pleated';
                case 'ankara-peplum-hybrid':
                    return 'ankara-wrap';
                case 'bubu-gown-hybrid':
                    return 'turban-wrap';
                case 'george-wrapper-hybrid':
                    return 'beaded-gele';
                case 'adire':
                case 'kente':
                    return 'tall-headwrap';
                case 'graduate':
                    return 'top-hat';
                default:
                    return null;
            }
        };

        const applyOutfitPreset = (preset) => {
            selectOpt('uc-outfit-row', preset);
            if (!preset || preset === 'custom') {
                updateOutfitGallerySelection('custom');
                renderPreview();
                return;
            }
            const defaults = this._ucGetOutfitPresetDefaults(preset);
            if (!defaults) return;
            const currentMode = dialog.querySelector('#uc-garment-mode-row .uc-opt-btn.selected')?.dataset.val || 'painted';
            const targetMode = currentMode === 'hybrid' && defaults.garmentMode === 'pinned'
                ? 'hybrid'
                : defaults.garmentMode;
            selectOpt('uc-top-row', defaults.topStyle || 'tee');
            selectOpt('uc-bottom-row', defaults.bottomStyle || 'pants');
            selectOpt('uc-skirt-length-row', defaults.skirtLength || 'knee');
            selectOpt('uc-skirt-design-row', defaults.skirtDesign || 'a-line');
            selectOpt('uc-blouse-neck-row', defaults.blouseNeck || 'round');
            selectOpt('uc-blouse-sleeve-row', defaults.blouseSleeve || 'short');
            selectOpt('uc-blouse-body-row', defaults.blouseBody || 'fitted');
            selectOpt('uc-blouse-design-row', defaults.blouseDesign || 'plain');
            selectOpt('uc-footwear-row', defaults.footwearStyle || 'shoes');
            if (targetMode) selectOpt('uc-garment-mode-row', targetMode);
            const topColor = dialog.querySelector('#uc-top-color');
            const bottomColor = dialog.querySelector('#uc-bottom-color');
            const footwearColor = dialog.querySelector('#uc-footwear-color');
            const accentColor = dialog.querySelector('#uc-accent-color');
            if (topColor && defaults.topColor) topColor.value = defaults.topColor;
            if (bottomColor && defaults.bottomColor) bottomColor.value = defaults.bottomColor;
            if (footwearColor && defaults.footwearColor) footwearColor.value = defaults.footwearColor;
            if (accentColor && defaults.accentColor) accentColor.value = defaults.accentColor;
            if (targetMode && currentMode !== targetMode) {
                selectOpt('uc-garment-mode-row', targetMode);
                renderOutfitRow(preset, { render: false });
            }
            const pairedHeadwear = headwearForOutfitPreset(preset);
            const selectedHeadwear = dialog.querySelector('#uc-headwear-row .uc-opt-btn.selected')?.dataset.val;
            if (pairedHeadwear) {
                selectOpt('uc-headwear-row', pairedHeadwear);
            } else if (['uniform-cap', 'sun-hat', 'kufi', 'top-hat'].includes(selectedHeadwear)) {
                selectOpt('uc-headwear-row', 'none');
            }
            updateOutfitGallerySelection(preset);
            renderPreview();
        };

        const clearPresetSelectionIfNeeded = () => {
            const selectedPreset = dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val;
            if (selectedPreset && selectedPreset !== 'custom') {
                selectOpt('uc-outfit-row', 'custom');
                if (typeof updateOutfitGallerySelection === 'function') updateOutfitGallerySelection('custom');
            }
        };

        const ensureSkirtVariantTarget = () => {
            const selectedPreset = dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val || 'custom';
            const skirtCapablePresets = [
                'hybrid-skirt',
                'iro-buba-hybrid',
                'ankara-peplum-hybrid',
                'bubu-gown-hybrid',
                'george-wrapper-hybrid'
            ];
            if (!skirtCapablePresets.includes(selectedPreset)) {
                selectOpt('uc-gender-row', 'female');
                selectOpt('uc-outfit-row', 'hybrid-skirt');
                selectOpt('uc-garment-mode-row', 'hybrid');
                selectOpt('uc-bottom-row', 'skirt');
                if (typeof updateOutfitGallerySelection === 'function') updateOutfitGallerySelection('hybrid-skirt');
            }
            renderPreview();
        };

        const ensureBlouseVariantTarget = () => {
            const selectedTop = dialog.querySelector('#uc-top-row .uc-opt-btn.selected')?.dataset.val || 'tee';
            const selectedPreset = dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val || 'custom';
            const blouseCapablePresets = [
                'iro-buba',
                'ankara-peplum',
                'george-wrapper',
                'hybrid-skirt',
                'iro-buba-hybrid',
                'ankara-peplum-hybrid',
                'george-wrapper-hybrid'
            ];
            if (selectedTop !== 'blouse' && !blouseCapablePresets.includes(selectedPreset)) {
                selectOpt('uc-gender-row', 'female');
                selectOpt('uc-outfit-row', 'hybrid-skirt');
                selectOpt('uc-garment-mode-row', 'hybrid');
                selectOpt('uc-top-row', 'blouse');
                selectOpt('uc-bottom-row', 'skirt');
                if (typeof updateOutfitGallerySelection === 'function') updateOutfitGallerySelection('hybrid-skirt');
            } else if (selectedTop !== 'blouse') {
                selectOpt('uc-top-row', 'blouse');
            }
            renderPreview();
        };

        const syncClothingOptionVisibility = () => {
            const top = dialog.querySelector('#uc-top-row .uc-opt-btn.selected')?.dataset.val || 'tee';
            const bottom = dialog.querySelector('#uc-bottom-row .uc-opt-btn.selected')?.dataset.val || 'pants';
            const preset = dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val || 'custom';
            const blousePanel = dialog.querySelector('#uc-blouse-options');
            const skirtPanel = dialog.querySelector('#uc-skirt-options');
            const blousePresets = new Set(['iro-buba', 'ankara-peplum', 'george-wrapper', 'hybrid-skirt', 'iro-buba-hybrid', 'ankara-peplum-hybrid', 'george-wrapper-hybrid']);
            const skirtPresets = new Set(['iro-buba', 'ankara-peplum', 'bubu-gown', 'george-wrapper', 'hybrid-skirt', 'iro-buba-hybrid', 'ankara-peplum-hybrid', 'bubu-gown-hybrid', 'george-wrapper-hybrid']);
            const showBlouse = top === 'blouse' || blousePresets.has(preset);
            const showSkirt = bottom === 'skirt' || skirtPresets.has(preset);
            if (blousePanel) {
                blousePanel.style.display = showBlouse ? 'block' : 'none';
                if (showBlouse && !blousePanel.dataset.userOpened) blousePanel.open = true;
            }
            if (skirtPanel) {
                skirtPanel.style.display = showSkirt ? 'block' : 'none';
                if (showSkirt && !skirtPanel.dataset.userOpened) skirtPanel.open = true;
            }
        };

        const getOutfitPresetMode = (preset = 'custom') => {
            if (!preset || preset === 'custom') return 'any';
            const defaults = this._ucGetOutfitPresetDefaults(preset);
            if (!defaults) return 'painted';
            const normalized = this._normalizeUniversalCharacterClothing({
                ...defaults,
                outfitPreset: preset
            });
            return (normalized.garmentMode === 'pinned' || normalized.garmentMode === 'hybrid') ? 'pinned' : 'painted';
        };

        const getVisibleOutfitPresets = () => {
            const mode = dialog.querySelector('#uc-garment-mode-row .uc-opt-btn.selected')?.dataset.val || 'painted';
            const loosePresetPriority = ['custom', 'royal-agbada', 'executive-tunic-suit', 'hybrid-skirt', 'iro-buba-hybrid', 'ankara-peplum-hybrid', 'bubu-gown-hybrid', 'george-wrapper-hybrid', 'agbada', 'agbada2', 'agbada3', 'senator', 'senator2', 'senator3', 'senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe', 'chief'];
            const priority = mode === 'pinned' || mode === 'hybrid'
                ? loosePresetPriority
                : ['custom', 'royal-agbada-painted', 'dashiki', 'ankara', 'kaftan', 'adire', 'kente', 'buba-wrapper', 'business', 'casual'];
            const visible = outfitPresets.filter(preset => {
                if (preset.val === 'custom') return true;
                const presetMode = getOutfitPresetMode(preset.val);
                return mode === 'hybrid'
                    ? presetMode === 'pinned'
                    : presetMode === mode;
            });
            return visible.sort((a, b) => {
                const ai = priority.indexOf(a.val);
                const bi = priority.indexOf(b.val);
                if (ai !== -1 || bi !== -1) return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
                return outfitPresets.findIndex(item => item.val === a.val) - outfitPresets.findIndex(item => item.val === b.val);
            });
        };

        const renderOutfitRow = (selectedValue = null, options = {}) => {
            const row = dialog.querySelector('#uc-outfit-row');
            if (!row) return;
            const visible = getVisibleOutfitPresets();
            const selected = visible.some(preset => preset.val === selectedValue)
                ? selectedValue
                : 'custom';
            row.innerHTML = makeOptRow(visible, selected);
            row.querySelectorAll('.uc-opt-btn').forEach(btn => {
                btn.addEventListener('click', () => applyOutfitPreset(btn.dataset.val));
            });
            renderOutfitGallery();
            updateOutfitGallerySelection(selected);
            if (options.render !== false) renderPreview();
        };

        renderPreview = () => {
            const previewHost = dialog.querySelector('#uc-preview');
            const caption = dialog.querySelector('#uc-preview-caption');
            if (!previewHost) return;
            syncClothingOptionVisibility();
            previewHost.innerHTML = '';
            const config = this._normalizeUniversalCharacterConfig(collectDialogConfig());
            if (previewCompare) {
                const wrap = document.createElement('div');
                wrap.style.display = 'grid';
                wrap.style.gridTemplateColumns = '1fr 1fr';
                wrap.style.gap = '8px';
                wrap.style.width = '100%';
                wrap.style.alignItems = 'center';
                wrap.style.justifyItems = 'center';
                [
                    ['Clean', this._normalizeUniversalCharacterConfig({ ...config, qualityPreset: 'clean' })],
                    ['Human', this._normalizeUniversalCharacterConfig({ ...config, qualityPreset: 'human-like' })]
                ].forEach(([label, cfg]) => {
                    const cell = document.createElement('div');
                    cell.style.display = 'grid';
                    cell.style.gap = '4px';
                    cell.style.justifyItems = 'center';
                    cell.style.minWidth = '0';
                    const canvas = this._ucRenderPreviewCanvas(cfg, 104, 260, {
                        focus: previewFocus,
                        zoom: previewZoom
                    });
                    canvas.style.width = '104px';
                    canvas.style.height = '260px';
                    canvas.style.maxWidth = '100%';
                    const tag = document.createElement('div');
                    tag.textContent = label;
                    tag.style.fontSize = '10px';
                    tag.style.color = '#9fb8d6';
                    cell.appendChild(canvas);
                    cell.appendChild(tag);
                    wrap.appendChild(cell);
                });
                previewHost.appendChild(wrap);
            } else {
                const previewCanvas = this._ucRenderPreviewCanvas(config, 220, 260, {
                    focus: previewFocus,
                    zoom: previewZoom
                });
                previewCanvas.style.width = '220px';
                previewCanvas.style.height = '260px';
                previewCanvas.style.maxWidth = '100%';
                previewHost.appendChild(previewCanvas);
            }
            setPreviewFocus(previewFocus, { render: false });
            setPreviewZoom(previewZoom, { render: false });
            setPreviewCompare(previewCompare, { render: false });
            if (caption) {
                const outfit = config.clothing.outfitPreset === 'custom'
                    ? 'custom outfit'
                    : `${config.clothing.outfitPreset} outfit`;
                const variantLabel = config.viewVariant && config.viewVariant !== config.view
                    ? config.viewVariant.replace('-', ' ')
                    : config.view;
                const facing = config.view === 'side'
                    ? `, ${config.sideFacing} side`
                    : '';
                const engine = config.characterEngine === 'advanced' ? 'advanced renderer' : 'classic renderer';
                const qualityLabel = qualityPresets.find(item => item.val === config.qualityPreset)?.label || 'Clean';
                const garmentMode = config.clothing.garmentMode === 'hybrid'
                    ? ', pinned + painted clothing'
                    : (config.clothing.garmentMode === 'pinned' ? ', pinned clothing parts' : '');
                const skirtVariant = config.clothing.bottomStyle === 'skirt' || String(config.clothing.pinnedGarmentStyle || '').startsWith('female-')
                    ? `, ${config.clothing.skirtLength} ${config.clothing.skirtDesign} skirt`
                    : '';
                const blouseVariant = config.clothing.topStyle === 'blouse'
                    ? `, ${config.clothing.blouseNeck} ${config.clothing.blouseSleeve} ${config.clothing.blouseBody} ${config.clothing.blouseDesign} blouse`
                    : '';
                const headwear = config.headwearStyle && config.headwearStyle !== 'none'
                    ? `, ${config.headwearStyle} headgear`
                    : '';
                const focusLabel = previewFocus === 'face' ? ' Face focus.' : '';
                const compareLabel = previewCompare ? ' Compare mode shows Clean beside Human-like.' : '';
                caption.textContent = `${qualityLabel} ${config.ageGroup} ${config.build} build / ${config.weight} weight ${config.gender}, ${config.headNeckStyle} head-neck, ${config.hairStyle} hair${headwear}, ${outfit}${garmentMode}${blouseVariant}${skirtVariant}, ${variantLabel} view${facing}, ${engine}.${focusLabel}${compareLabel}`;
            }
        };

        const updateOutfitGallerySelection = (selectedPreset = null) => {
            const gallery = dialog.querySelector('#uc-outfit-gallery');
            if (!gallery) return;
            const selected = selectedPreset || dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val || 'custom';
            gallery.querySelectorAll('.uc-outfit-card').forEach(card => {
                const active = card.dataset.preset === selected;
                card.style.borderColor = active ? 'var(--accent-primary,#6c9fe8)' : 'rgba(148,163,184,0.22)';
                card.style.boxShadow = active ? '0 0 0 2px rgba(108,159,232,0.25)' : 'none';
            });
        };

        const updateHairGallerySelection = (selectedStyle = null) => {
            const gallery = dialog.querySelector('#uc-hair-gallery');
            if (!gallery) return;
            const selected = selectedStyle || dialog.querySelector('#uc-hair-style-row .uc-opt-btn.selected')?.dataset.val || 'short';
            gallery.querySelectorAll('.uc-hair-card').forEach(card => {
                const active = card.dataset.style === selected;
                card.style.borderColor = active ? 'var(--accent-primary,#6c9fe8)' : 'rgba(148,163,184,0.22)';
                card.style.boxShadow = active ? '0 0 0 2px rgba(108,159,232,0.25)' : 'none';
            });
        };

        const renderHairGallery = (selectedStyle = null) => {
            const gallery = dialog.querySelector('#uc-hair-gallery');
            if (!gallery) return;
            gallery.innerHTML = '';
            const base = this._normalizeUniversalCharacterConfig(collectDialogConfig());
            const gender = dialog.querySelector('#uc-gender-row .uc-opt-btn.selected')?.dataset.val || base.gender || 'male';
            const styles = this._ucGetHairStyleOptions(gender);
            const selected = this._ucNormalizeHairStyle(selectedStyle || base.hairStyle, gender);
            styles.forEach(style => {
                const cfg = this._normalizeUniversalCharacterConfig({
                    ...base,
                    gender,
                    view: 'front',
                    headwearStyle: 'none',
                    hairStyle: style.val,
                    clothing: {
                        ...(base.clothing || {}),
                        outfitPreset: 'custom',
                        topStyle: 'tee',
                        bottomStyle: 'pants'
                    }
                });
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'uc-hair-card';
                card.dataset.style = style.val;
                card.title = style.label;
                card.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:4px; min-height:92px; padding:6px; border-radius:8px; border:1px solid rgba(148,163,184,0.22); background:rgba(15,23,42,0.24); color:inherit; cursor:pointer; font-size:10px; line-height:1.2;';

                const full = this._ucRenderPreviewCanvas(cfg, 116, 150);
                const canvas = document.createElement('canvas');
                canvas.width = 62;
                canvas.height = 68;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(full, 23, 0, 70, 74, 0, 0, canvas.width, canvas.height);
                }
                canvas.style.width = '62px';
                canvas.style.height = '68px';
                canvas.style.display = 'block';

                const label = document.createElement('span');
                label.textContent = style.label;
                label.style.cssText = 'display:block; max-width:58px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
                card.appendChild(canvas);
                card.appendChild(label);
                card.addEventListener('click', () => {
                    selectOpt('uc-hair-style-row', style.val);
                    updateHairGallerySelection(style.val);
                    renderPreview();
                });
                gallery.appendChild(card);
            });
            updateHairGallerySelection(styles.some(style => style.val === selected) ? selected : styles[0]?.val || 'short');
        };

        const renderOutfitGallery = () => {
            const gallery = dialog.querySelector('#uc-outfit-gallery');
            if (!gallery) return;
            gallery.innerHTML = '';
            const base = this._normalizeUniversalCharacterConfig(collectDialogConfig());
            getVisibleOutfitPresets().filter(preset => preset.val !== 'custom').forEach(preset => {
                const defaults = this._ucGetOutfitPresetDefaults(preset.val);
                if (!defaults) return;
                const headwearStyle = headwearForOutfitPreset(preset.val) || 'none';
                const cfg = this._normalizeUniversalCharacterConfig({
                    ...base,
                    view: 'front',
                    headwearStyle,
                    clothing: {
                        ...(base.clothing || {}),
                        ...defaults,
                        outfitPreset: preset.val
                    }
                });
                const card = document.createElement('button');
                card.type = 'button';
                card.className = 'uc-outfit-card';
                card.dataset.preset = preset.val;
                card.style.cssText = 'display:flex; flex-direction:column; align-items:center; gap:4px; min-height:104px; padding:6px; border-radius:8px; border:1px solid rgba(148,163,184,0.22); background:rgba(15,23,42,0.24); color:inherit; cursor:pointer; font-size:10px; line-height:1.2;';
                const canvas = this._ucRenderPreviewCanvas(cfg, 58, 76);
                canvas.style.width = '58px';
                canvas.style.height = '76px';
                canvas.style.display = 'block';
                const label = document.createElement('span');
                label.textContent = preset.label;
                label.style.cssText = 'display:block; max-width:68px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;';
                card.appendChild(canvas);
                card.appendChild(label);
                card.addEventListener('click', () => applyOutfitPreset(preset.val));
                gallery.appendChild(card);
            });
            updateOutfitGallerySelection();
        };

        // Coalesce rapid slider updates into one render per animation frame.
        let previewRaf = 0;
        const requestPreview = () => {
            if (previewRaf) return;
            previewRaf = requestAnimationFrame(() => { previewRaf = 0; renderPreview(); });
        };
        dialog.querySelectorAll('.uc-preview-focus-btn').forEach(btn => {
            btn.addEventListener('click', () => setPreviewFocus(btn.dataset.focus || 'full'));
        });
        dialog.querySelector('#uc-preview-zoom')?.addEventListener('input', (e) => {
            setPreviewZoom((parseFloat(e.target.value) || 100) / 100);
        });
        dialog.querySelector('#uc-preview-compare')?.addEventListener('click', () => {
            setPreviewCompare(!previewCompare);
        });
        dialog.querySelector('#uc-expand-all')?.addEventListener('click', () => {
            dialog.querySelectorAll('details.uc-acc, details.uc-context-options').forEach(details => {
                if (details.style.display !== 'none') details.open = true;
            });
        });
        dialog.querySelector('#uc-collapse-all')?.addEventListener('click', () => {
            dialog.querySelectorAll('details.uc-acc, details.uc-context-options').forEach(details => {
                if (details.classList.contains('uc-context-options')) details.dataset.userOpened = '1';
                details.open = false;
            });
        });
        dialog.querySelectorAll('details.uc-context-options').forEach(details => {
            details.addEventListener('toggle', () => {
                details.dataset.userOpened = '1';
            });
        });
        // Double-click any slider to reset it to its default, then re-render.
        dialog.addEventListener('dblclick', (e) => {
            const el = e.target;
            if (el && el.tagName === 'INPUT' && el.type === 'range') {
                el.value = el.defaultValue;
                if (['uc-human-like-strength', 'uc-front-nose-scale', 'uc-front-mouth-scale', 'uc-side-nose-scale', 'uc-side-mouth-scale', 'uc-eye-scale', 'uc-jaw-scale', 'uc-chin-scale', 'uc-cheek-scale', 'uc-forehead-scale', 'uc-lip-scale', 'uc-nose-bridge-scale'].includes(el.id)) {
                    focusFacePreview({ render: false });
                }
                el.dispatchEvent(new Event('input', { bubbles: true }));
            }
        });

        ['uc-view-row', 'uc-front-lean-row', 'uc-engine-row', 'uc-age-row', 'uc-build-row', 'uc-weight-row', 'uc-facing-row', 'uc-head-row'].forEach(rowId => bindOptRow(rowId));
        bindOptRow('uc-quality-row', (value) => applyQualityPreset(value));
        bindOptRow('uc-gender-row', () => renderHairStyleRow(dialog.querySelector('#uc-hair-style-row .uc-opt-btn.selected')?.dataset.val || null));
        bindOptRow('uc-headwear-row');
        bindOptRow('uc-facial-hair-row');
        bindOptRow('uc-garment-mode-row', () => {
            const selectedPreset = dialog.querySelector('#uc-outfit-row .uc-opt-btn.selected')?.dataset.val || 'custom';
            renderOutfitRow(selectedPreset);
        });
        ['uc-top-row', 'uc-bottom-row', 'uc-footwear-row'].forEach(rowId => bindOptRow(rowId, () => clearPresetSelectionIfNeeded()));
        // Skirt length/design are variants of a skirt outfit, so keep or activate a compatible preset.
        ['uc-skirt-length-row', 'uc-skirt-design-row'].forEach(rowId => bindOptRow(rowId, () => ensureSkirtVariantTarget()));
        // Blouse controls are variants of a female blouse outfit, so keep or activate a compatible preset.
        ['uc-blouse-neck-row', 'uc-blouse-sleeve-row', 'uc-blouse-body-row', 'uc-blouse-design-row'].forEach(rowId => bindOptRow(rowId, () => ensureBlouseVariantTarget()));

        ['#uc-top-color', '#uc-bottom-color', '#uc-footwear-color', '#uc-accent-color'].forEach(selector => {
            dialog.querySelector(selector)?.addEventListener('input', () => {
                clearPresetSelectionIfNeeded();
                renderPreview();
            });
        });

        const syncShapeReadouts = () => {
            const setV = (id, txt) => { const el = dialog.querySelector(id); if (el) el.textContent = txt; };
            setV('#uc-muscle-v', dialog.querySelector('#uc-muscle')?.value);
            setV('#uc-bust-v', dialog.querySelector('#uc-bust')?.value);
            setV('#uc-hip-v', dialog.querySelector('#uc-hip')?.value);
            setV('#uc-shoulder-v', dialog.querySelector('#uc-shoulder')?.value);
            setV('#uc-belly-v', dialog.querySelector('#uc-belly')?.value);
            setV('#uc-part-w-v', `${dialog.querySelector('#uc-part-w')?.value}%`);
            setV('#uc-part-h-v', `${dialog.querySelector('#uc-part-h')?.value}%`);
            setV('#uc-human-like-strength-v', `${dialog.querySelector('#uc-human-like-strength')?.value || 60}`);
            setV('#uc-front-nose-scale-v', `${dialog.querySelector('#uc-front-nose-scale')?.value || 100}%`);
            setV('#uc-front-mouth-scale-v', `${dialog.querySelector('#uc-front-mouth-scale')?.value || 100}%`);
            setV('#uc-side-nose-scale-v', `${dialog.querySelector('#uc-side-nose-scale')?.value || 100}%`);
            setV('#uc-side-mouth-scale-v', `${dialog.querySelector('#uc-side-mouth-scale')?.value || 100}%`);
            setV('#uc-eye-scale-v', `${dialog.querySelector('#uc-eye-scale')?.value || 100}%`);
            setV('#uc-jaw-scale-v', `${dialog.querySelector('#uc-jaw-scale')?.value || 100}%`);
            setV('#uc-chin-scale-v', `${dialog.querySelector('#uc-chin-scale')?.value || 100}%`);
            setV('#uc-cheek-scale-v', `${dialog.querySelector('#uc-cheek-scale')?.value || 100}%`);
            setV('#uc-forehead-scale-v', `${dialog.querySelector('#uc-forehead-scale')?.value || 100}%`);
            setV('#uc-lip-scale-v', `${dialog.querySelector('#uc-lip-scale')?.value || 100}%`);
            setV('#uc-nose-bridge-scale-v', `${dialog.querySelector('#uc-nose-bridge-scale')?.value || 100}%`);
        };
        ['#uc-muscle', '#uc-bust', '#uc-hip', '#uc-shoulder', '#uc-belly'].forEach(sel => {
            dialog.querySelector(sel)?.addEventListener('input', () => { syncShapeReadouts(); requestPreview(); });
        });
        ['#uc-human-like-strength', '#uc-front-nose-scale', '#uc-front-mouth-scale', '#uc-side-nose-scale', '#uc-side-mouth-scale', '#uc-eye-scale', '#uc-jaw-scale', '#uc-chin-scale', '#uc-cheek-scale', '#uc-forehead-scale', '#uc-lip-scale', '#uc-nose-bridge-scale'].forEach(sel => {
            dialog.querySelector(sel)?.addEventListener('input', () => {
                focusFacePreview({ render: false });
                syncShapeReadouts();
                requestPreview();
            });
        });
        const UC_PARTS = ['head', 'neck', 'torso', 'arms', 'legs'];
        const loadPartSliders = () => {
            const pn = dialog.querySelector('#uc-part-sel')?.value || 'torso';
            const ws = dialog.querySelector('#uc-part-w'); const hs = dialog.querySelector('#uc-part-h');
            if (pn === 'body') {
                if (ws) ws.value = dialog.querySelector('#uc-ps-torso-w')?.value || '100';
                if (hs) hs.value = dialog.querySelector('#uc-ps-torso-h')?.value || '100';
            } else {
                const w = dialog.querySelector(`#uc-ps-${pn}-w`); const h = dialog.querySelector(`#uc-ps-${pn}-h`);
                if (ws && w) ws.value = w.value; if (hs && h) hs.value = h.value;
            }
            syncShapeReadouts();
        };
        dialog.querySelector('#uc-part-sel')?.addEventListener('change', loadPartSliders);
        dialog.querySelector('#uc-part-w')?.addEventListener('input', () => {
            const pn = dialog.querySelector('#uc-part-sel')?.value || 'torso';
            const val = dialog.querySelector('#uc-part-w').value;
            const targets = pn === 'body' ? UC_PARTS : [pn];
            targets.forEach(t => { const el = dialog.querySelector(`#uc-ps-${t}-w`); if (el) el.value = val; });
            syncShapeReadouts(); requestPreview();
        });
        dialog.querySelector('#uc-part-h')?.addEventListener('input', () => {
            const pn = dialog.querySelector('#uc-part-sel')?.value || 'torso';
            const val = dialog.querySelector('#uc-part-h').value;
            const targets = pn === 'body' ? UC_PARTS : [pn];
            targets.forEach(t => { const el = dialog.querySelector(`#uc-ps-${t}-h`); if (el) el.value = val; });
            syncShapeReadouts(); requestPreview();
        });

        const collectShape = () => {
            const c = collectDialogConfig();
            return { muscle: c.muscle, bust: c.bust, hip: c.hip, shoulder: c.shoulder, belly: c.belly, partScale: c.partScale };
        };
        const applyShape = (shape = {}) => {
            const cfg = this._normalizeUniversalCharacterConfig({ ...collectDialogConfig(), ...shape });
            const setSlider = (id, val) => { const el = dialog.querySelector(id); if (el) el.value = String(val); };
            setSlider('#uc-muscle', cfg.muscle); setSlider('#uc-bust', cfg.bust);
            setSlider('#uc-hip', cfg.hip); setSlider('#uc-shoulder', cfg.shoulder);
            setSlider('#uc-belly', cfg.belly);
            setSlider('#uc-ps-overall', cfg.partScale.overall);
            ['head', 'neck', 'torso', 'arms', 'legs'].forEach(pn => {
                setSlider(`#uc-ps-${pn}-w`, cfg.partScale[pn].w);
                setSlider(`#uc-ps-${pn}-h`, cfg.partScale[pn].h);
            });
            loadPartSliders();
            renderPreview();
        };
        const rebuildShapeDropdown = () => {
            const sel = dialog.querySelector('#uc-shape-preset');
            if (!sel) return;
            sel.innerHTML = '<option value="">Shape presets…</option>'
                + this._ucBuiltinBodyShapes().map(pr => `<option value="${pr.id}">${this._escapeHtml(pr.name)}</option>`).join('')
                + this._loadBodyShapePresets().map(pr => `<option value="${pr.id}">${this._escapeHtml(pr.name)}</option>`).join('');
        };
        dialog.querySelector('#uc-shape-reset')?.addEventListener('click', () => applyShape({ muscle: undefined, bust: 50, hip: 50, shoulder: 50, belly: 50, partScale: {} }));
        dialog.querySelector('#uc-shape-pregnancy')?.addEventListener('click', () => {
            const preset = this._getBodyShapePreset('builtin:pregnancy');
            if (preset) {
                applyShape(preset.shape);
                Utils.showToast?.('Pregnancy shape applied', 'success');
            }
        });
        dialog.querySelector('#uc-shape-save')?.addEventListener('click', () => {
            const name = (dialog.querySelector('#uc-shape-name')?.value || '').trim() || 'Shape';
            this._saveBodyShapePreset(name, collectShape());
            rebuildShapeDropdown();
            Utils.showToast?.('Body shape saved', 'success');
        });
        dialog.querySelector('#uc-shape-del')?.addEventListener('click', () => {
            const id = dialog.querySelector('#uc-shape-preset')?.value;
            if (!id) return;
            if (String(id).startsWith('builtin:')) { Utils.showToast?.('Starter presets cannot be deleted', 'info'); return; }
            this._deleteBodyShapePreset(id);
            rebuildShapeDropdown();
            Utils.showToast?.('Shape deleted', 'info');
        });
        dialog.querySelector('#uc-shape-preset')?.addEventListener('change', (e) => {
            const pr = this._getBodyShapePreset(e.target.value);
            if (pr) applyShape(pr.shape);
        });

        dialog.querySelector('#uc-eye-type-row')?.querySelectorAll('.uc-opt-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                focusFacePreview({ render: false });
                requestPreview();
            });
        });

        ['uc-skin-row', 'uc-hair-row', 'uc-eye-row', 'uc-sclera-row'].forEach(rowId => {
            const row = dialog.querySelector(`#${rowId}`);
            row?.querySelectorAll('.uc-swatch').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (rowId === 'uc-eye-row' || rowId === 'uc-sclera-row') {
                        focusFacePreview({ render: false });
                    }
                    selectSwatch(rowId, btn.dataset.val);
                    if (['uc-skin-row', 'uc-hair-row', 'uc-eye-row', 'uc-sclera-row'].includes(rowId)) {
                        renderHairGallery(dialog.querySelector('#uc-hair-style-row .uc-opt-btn.selected')?.dataset.val || null);
                    }
                });
            });
        });

        const facingSection = dialog.querySelector('#uc-facing-section');
        const frontLeanSection = dialog.querySelector('#uc-front-lean-section');
        dialog.querySelector('#uc-view-row')?.addEventListener('click', () => {
            const selView = dialog.querySelector('#uc-view-row .uc-opt-btn.selected')?.dataset.val;
            if (facingSection) {
                const needsDirection = selView === 'side' || selView === 'front-3q' || selView === 'back-3q';
                facingSection.style.display = needsDirection ? '' : 'none';
            }
            if (frontLeanSection) {
                frontLeanSection.style.display = (selView === 'front' || selView === 'back') ? '' : 'none';
            }
            renderPreview();
        });

        const linkedToggle = dialog.querySelector('#uc-linked-set-toggle');
        const linkedViewsEl = dialog.querySelector('#uc-linked-views');
        linkedToggle?.addEventListener('change', () => {
            if (linkedViewsEl) linkedViewsEl.style.display = linkedToggle.checked ? 'grid' : 'none';
        });

        if (isEditMode) {
            const linkedSpecs = this._isUniversalCharacterLinkedFamily(editArmature)
                ? this._getUniversalCharacterLinkedViewSpecs(editArmature)
                : [];
            if (linkedToggle) {
                linkedToggle.checked = linkedSpecs.length > 1;
                linkedToggle.disabled = true;
            }
            if (linkedViewsEl) {
                linkedViewsEl.style.display = linkedSpecs.length > 1 ? 'grid' : 'none';
                linkedViewsEl.querySelectorAll('input[type="checkbox"]').forEach(input => {
                    const entry = String(input.dataset.linkedView || '').trim();
                    input.checked = linkedSpecs.some(spec => {
                        if (entry === 'front-3q-left') return spec.view === 'front-3q' && spec.sideFacing === 'left';
                        if (entry === 'front-3q-right') return spec.view === 'front-3q' && spec.sideFacing !== 'left';
                        if (entry === 'side-left') return spec.view === 'side' && spec.sideFacing === 'left';
                        if (entry === 'side-right') return spec.view === 'side' && spec.sideFacing !== 'left';
                        if (entry === 'back-3q-left') return spec.view === 'back-3q' && spec.sideFacing === 'left';
                        if (entry === 'back-3q-right') return spec.view === 'back-3q' && spec.sideFacing !== 'left';
                        return spec.viewVariant === entry || spec.view === entry;
                    });
                    input.disabled = true;
                });
            }
        }

        const heightSlider = dialog.querySelector('#uc-height');
        const heightLabel = dialog.querySelector('#uc-height-val');
        heightSlider?.addEventListener('input', () => {
            if (heightLabel) heightLabel.textContent = `${heightSlider.value}px`;
            requestPreview();
        });

        dialog.querySelector('#uc-template-select')?.addEventListener('change', (e) => {
            const template = savedTemplates.find(entry => entry?.id === e.target.value);
            if (!template?.config) return;
            applyDialogConfig(template.config);
            updateOutfitGallerySelection(template.config?.clothing?.outfitPreset || 'custom');
            const nameInput = dialog.querySelector('#uc-template-name');
            if (nameInput && !nameInput.value) nameInput.value = template.name || '';
        });

        dialog.querySelector('#uc-randomize')?.addEventListener('click', () => {
            const cfg = this._ucRandomCharacterConfig();
            applyDialogConfig(cfg);
            if (cfg.clothing.outfitPreset && cfg.clothing.outfitPreset !== 'custom') {
                applyOutfitPreset(cfg.clothing.outfitPreset);
            }
            Utils.showToast?.('Randomized', 'info');
        });

        dialog.querySelector('#uc-humanize')?.addEventListener('click', () => {
            const base = collectDialogConfig();
            const pick = (min, max, step = 5) => {
                const raw = min + Math.random() * (max - min);
                return Math.round(raw / step) * step;
            };
            const isFemale = base.gender === 'female';
            const isMale = base.gender === 'male';
            const cfg = {
                ...base,
                qualityPreset: 'human-like',
                characterEngine: 'advanced',
                humanLikeStrength: pick(70, 90),
                muscle: pick(isMale ? 46 : 38, isMale ? 64 : 56),
                bust: pick(isFemale ? 50 : 36, isFemale ? 70 : 54),
                hip: pick(isFemale ? 52 : 42, isFemale ? 72 : 58),
                shoulder: pick(isMale ? 54 : 42, isMale ? 70 : 60),
                belly: pick(34, 56),
                jawScale: pick(isMale ? 100 : 90, isMale ? 116 : 108),
                chinScale: pick(88, 108),
                cheekScale: pick(96, 118),
                foreheadScale: pick(90, 108),
                lipScale: pick(isFemale ? 102 : 88, isFemale ? 126 : 112),
                noseBridgeScale: pick(94, 122),
                frontNoseScale: pick(88, 118),
                frontMouthScale: pick(90, 116),
                sideNoseScale: pick(92, 124),
                sideMouthScale: pick(88, 116),
                eyeScale: pick(88, 112)
            };
            applyDialogConfig(cfg);
            setPreviewCompare(true);
            Utils.showToast?.('Human-like proportions applied', 'success');
        });

        dialog.querySelector('#uc-face-reset')?.addEventListener('click', () => {
            applyDialogConfig({
                ...collectDialogConfig(),
                humanLikeStrength: 60,
                frontNoseScale: 100,
                frontMouthScale: 100,
                sideNoseScale: 100,
                sideMouthScale: 100,
                eyeScale: 100,
                eyeType: 'almond',
                jawScale: 100,
                chinScale: 100,
                cheekScale: 100,
                foreheadScale: 100,
                lipScale: 100,
                noseBridgeScale: 100
            });
            focusFacePreview();
            Utils.showToast?.('Face proportions reset', 'info');
        });

        dialog.querySelector('#uc-save-template')?.addEventListener('click', () => {
            const nameInput = dialog.querySelector('#uc-template-name');
            const template = this._saveUniversalCharacterStyleTemplate(nameInput?.value || '', collectDialogConfig());
            if (!template) {
                Utils.showToast('Enter a style name first', 'warning');
                return;
            }
            dialog.remove();
            Utils.showToast(`Saved Universal Character style "${template.name}"`, 'success');
            this.openUniversalCharacterDialog();
        });

        dialog.querySelector('#uc-cancel')?.addEventListener('click', () => dialog.remove());

        renderOutfitRow('custom', { render: false });

        if (initialConfig) {
            applyDialogConfig(initialConfig);
            updateOutfitGallerySelection(initialConfig?.clothing?.outfitPreset || 'custom');
        } else {
            renderHairStyleRow('short');
            renderHeadwearRow('none');
            renderPreview();
            updateOutfitGallerySelection('custom');
        }

        dialog.querySelector('#uc-create')?.addEventListener('click', () => {
            const config = collectDialogConfig();
            const linkedViews = !isEditMode && linkedToggle?.checked
                ? [...dialog.querySelectorAll('#uc-linked-views input[type="checkbox"]:checked')].map(input => input.dataset.linkedView).filter(Boolean)
                : null;
            dialog.remove();

            if (isEditMode) {
                this._editUniversalCharacterArmature(editArmature, config, {
                    compactArmaturePanel: options?.compactArmaturePanel === true
                });
                return;
            }

            if (Array.isArray(linkedViews) && linkedViews.length) {
                this.createUniversalCharacterViewSet({
                    ...config,
                    stageX: Number.isFinite(options?.stageX) ? options.stageX : undefined,
                    linkedViews,
                    _ucInternal: {
                        compactArmaturePanel: true
                    }
                });
                return;
            }

            this.createUniversalCharacter({
                ...config,
                stageX: Number.isFinite(options?.stageX) ? options.stageX : undefined,
                _ucInternal: {
                    compactArmaturePanel: true
                }
            });
        });
    },

    // ════════════════════════════════════════════════════════════════
    //  Facial Expression Picker UI
    // ════════════════════════════════════════════════════════════════

    openFacialExpressionPicker() {
        const headObj = this._ucFindFacialHead();
        if (!headObj) {
            Utils.showToast('No Universal Character with facial features found on stage', 'warning');
            return;
        }
        const armature = this._currentArmature || this._detectArmature();
        this.openArmaturePanel(armature || undefined);
        requestAnimationFrame(() => {
            const panel = document.getElementById('armature-panel');
            const faceSection = panel?.querySelector('#armature-face-section');
            if (faceSection) {
                faceSection.scrollIntoView({ block: 'start', behavior: 'smooth' });
                return;
            }
            Utils.showToast('Facial expressions are now available inside the Pose Armature panel for the active character', 'info');
        });
    },


});
