/**
 * SVG African Character renderer.
 * Produces one safe, namespaced SVG per existing Pose Armature role.
 */
(function () {
    'use strict';

    const SVG_OUTPUT_SCALE = 4;

    function getUtils() { return globalThis.SvgCharacterUtils; }
    function getCatalog() { return globalThis.SvgAfricanCharacterCatalog; }

    function darken(hex, amount = 0.15) {
        const value = String(hex || '#000000').replace('#', '');
        const n = parseInt(value.padEnd(6, '0').slice(0, 6), 16);
        let r = (n >> 16) & 255;
        let g = (n >> 8) & 255;
        let b = n & 255;
        r = Math.max(0, Math.round(r * (1 - amount)));
        g = Math.max(0, Math.round(g * (1 - amount)));
        b = Math.max(0, Math.round(b * (1 - amount)));
        return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    }

    function lighten(hex, amount = 0.15) {
        const value = String(hex || '#000000').replace('#', '');
        const n = parseInt(value.padEnd(6, '0').slice(0, 6), 16);
        let r = (n >> 16) & 255;
        let g = (n >> 8) & 255;
        let b = n & 255;
        r = Math.min(255, Math.round(r + (255 - r) * amount));
        g = Math.min(255, Math.round(g + (255 - g) * amount));
        b = Math.min(255, Math.round(b + (255 - b) * amount));
        return `#${[r, g, b].map(v => v.toString(16).padStart(2, '0')).join('')}`;
    }

    function svgWrap({ width, height, body, defs = '', namespace = '' }) {
        const U = getUtils();
        if (!U) throw new Error('SvgCharacterUtils is not loaded.');
        const outputWidth = Math.max(1, Math.round(width * SVG_OUTPUT_SCALE));
        const outputHeight = Math.max(1, Math.round(height * SVG_OUTPUT_SCALE));
        let svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${outputWidth}" height="${outputHeight}" data-svg-african-resolution-scale="${SVG_OUTPUT_SCALE}" shape-rendering="geometricPrecision"><defs>${defs}</defs>${body}</svg>`;
        svg = U.namespaceSvg(svg, namespace);
        U.assertSafeGeneratedSvg(svg);
        return svg;
    }

    function hasAccessory(config, id) {
        return Array.isArray(config.accessories) && config.accessories.includes(id);
    }

    function faceSpec(config = {}) {
        const C = getCatalog();
        const found = Object.values(C?.faceShapes || {}).find(item => item.id === config.face);
        return found || C.faceShapes?.oval || { rx: 34, ry: 42 };
    }

    function bodySpec(config = {}) {
        const C = getCatalog();
        const found = Object.values(C?.bodyTypes || {}).find(item => item.id === config.body);
        return found || C.bodyTypes?.average || { torsoScale: 1, shoulderScale: 1, limbScale: 1 };
    }

    function hairColor(config = {}) {
        const C = getCatalog();
        return C?.hairColor?.(config) || '#17110e';
    }

    function isFemalePresentation(config = {}) {
        return presentationId(config) === 'female';
    }

    function renderFemaleBrowClearLayer(markup, config = {}, options = {}) {
        if (!markup || !isFemalePresentation(config)) return markup || '';
        const scaleY = Number.isFinite(Number(options.scaleY)) ? Number(options.scaleY) : 0.86;
        const rendererVersion = options.rendererVersion || 'legacy';
        return `<g ${roleAttr(`female-brow-clear nonpremium-hair-headwear-above-brows renderer-${rendererVersion}`)} transform="scale(1 ${scaleY})">${markup}</g>`;
    }

    function outfitColors(config = {}) {
        switch (config.outfit) {
            case 'doctor':
            case 'lab-coat':
                return { primary: '#f8fafc', secondary: '#dbe4e8', accent: '#0f766e', trouser: '#2d3748' };
            case 'scrubs':
            case 'nurse':
                return { primary: '#157a78', secondary: '#0e5c5b', accent: '#d1fae5', trouser: '#115e59' };
            case 'business-suit':
                return { primary: '#25324a', secondary: '#101827', accent: '#d9b44a', trouser: '#121826' };
            case 'corporate-dress':
                return { primary: '#3c4257', secondary: '#242938', accent: '#d8b15d', trouser: '#2d3345' };
            case 'lecturer':
                return { primary: '#3d4f68', secondary: '#243246', accent: '#d8b15d', trouser: '#222b3a' };
            case 'academic-robe':
                return { primary: '#202332', secondary: '#10121d', accent: '#b99b4f', trouser: '#141722' };
            case 'student':
                return { primary: '#425f7a', secondary: '#26384d', accent: '#efc05a', trouser: '#243044' };
            case 'ankara-dress':
            case 'ankara-shirt':
            case 'ankara-peplum':
                return { primary: '#c25b32', secondary: '#143d59', accent: '#f1c453', trouser: '#143d59' };
            case 'senator-wear':
                return { primary: '#315d64', secondary: '#234148', accent: '#d9b44a', trouser: '#24454d' };
            case 'agbada':
            case 'baban-riga':
                return { primary: '#253a78', secondary: '#162044', accent: '#d9a84a', trouser: '#162044' };
            case 'iro-buba':
            case 'george-wrapper':
                return { primary: '#7c2d6a', secondary: '#421437', accent: '#f2c94c', trouser: '#421437' };
            case 'isi-agu':
                return { primary: '#1f2933', secondary: '#111827', accent: '#d9a84a', trouser: '#111827' };
            case 'casual':
                return { primary: '#b94836', secondary: '#7a2f2a', accent: '#f7d86a', trouser: '#26384d' };
            default:
                return { primary: '#315d64', secondary: '#234148', accent: '#e8c468', trouser: '#233442' };
        }
    }

    function hairSvg(config = {}) {
        const hair = hairColor(config);
        switch (config.hair) {
            case 'afro-full':
                return `<circle cx="50" cy="33" r="34" fill="${hair}"/><circle cx="27" cy="40" r="14" fill="${hair}"/><circle cx="73" cy="40" r="14" fill="${hair}"/>`;
            case 'afro-short':
                return `<path d="M16 44 Q20 8 50 7 Q80 8 84 44 Q68 28 50 27 Q32 28 16 44Z" fill="${hair}"/>`;
            case 'natural-bun':
                return `<circle cx="50" cy="11" r="15" fill="${hair}"/><path d="M17 42 Q22 11 50 9 Q78 11 83 42 Q67 27 50 27 Q33 27 17 42Z" fill="${hair}"/>`;
            case 'braids':
                return `<path d="M18 44 Q20 10 50 8 Q80 10 82 44 Q69 26 50 26 Q31 26 18 44Z" fill="${hair}"/><g stroke="${hair}" stroke-width="4.5" stroke-linecap="round"><path d="M25 32 Q14 70 22 101"/><path d="M34 31 Q30 72 35 102"/><path d="M66 31 Q70 72 65 102"/><path d="M75 32 Q86 70 78 101"/></g>`;
            case 'cornrows':
                return `<path d="M18 42 Q24 13 50 11 Q76 13 82 42 Q68 27 50 27 Q32 27 18 42Z" fill="${hair}"/><g stroke="#3a2a24" stroke-width="2" fill="none"><path d="M24 35 Q35 16 50 13"/><path d="M35 36 Q43 16 50 13"/><path d="M50 37 Q50 18 50 13"/><path d="M65 36 Q57 16 50 13"/><path d="M76 35 Q65 16 50 13"/></g>`;
            case 'twists':
                return `<path d="M17 42 Q23 12 50 10 Q77 12 83 42 Q67 27 50 27 Q33 27 17 42Z" fill="${hair}"/><g stroke="${hair}" stroke-width="4" stroke-linecap="round"><path d="M27 31 Q21 55 24 78"/><path d="M38 28 Q35 56 38 81"/><path d="M62 28 Q65 56 62 81"/><path d="M73 31 Q79 55 76 78"/></g>`;
            case 'locs':
                return `<path d="M18 42 Q23 10 50 8 Q77 10 82 42 Q68 28 50 28 Q32 28 18 42Z" fill="${hair}"/><g stroke="${hair}" stroke-width="6" stroke-linecap="round"><path d="M22 31 Q13 63 18 98"/><path d="M31 29 Q25 70 31 106"/><path d="M69 29 Q75 70 69 106"/><path d="M78 31 Q87 63 82 98"/></g>`;
            case 'fade':
                return `<path d="M20 39 Q24 15 50 12 Q76 15 80 39 Q65 28 50 28 Q35 28 20 39Z" fill="${hair}"/><path d="M20 42 Q50 34 80 42" stroke="#2a1d18" stroke-width="3" fill="none"/>`;
            case 'bald':
                return '';
            case 'low-cut':
            default:
                return `<path d="M19 39 Q24 14 50 12 Q76 14 81 39 Q67 27 50 27 Q33 27 19 39Z" fill="${hair}"/>`;
        }
    }

    function headwearSvg(config = {}) {
        if (config.headwear === 'gele') {
            return `<path d="M7 44 Q16 3 50 0 Q84 3 93 44 Q72 28 50 30 Q28 28 7 44Z" fill="#d14f8f"/><path d="M13 35 Q49 11 87 35" fill="none" stroke="#f2c94c" stroke-width="4"/><path d="M18 24 Q53 41 82 18" fill="none" stroke="#2f80ed" stroke-width="3"/>`;
        }
        if (config.headwear === 'wrapped-gele') {
            return `<path d="M9 43 Q23 6 50 3 Q77 6 91 43 Q76 31 50 31 Q24 31 9 43Z" fill="#2080b8"/><g stroke="#f0c34e" stroke-width="3" fill="none"><path d="M15 33 Q44 7 85 28"/><path d="M20 20 Q54 43 82 17"/></g><path d="M22 7 Q50 25 78 7" stroke="#d14f8f" stroke-width="5" fill="none"/>`;
        }
        if (config.headwear === 'fila') {
            return `<path d="M20 37 Q26 7 50 8 Q74 7 80 37 Q50 23 20 37Z" fill="#253a78" stroke="#d9a84a" stroke-width="2"/><path d="M30 22 L70 34" stroke="#d9a84a" stroke-width="2"/>`;
        }
        if (config.headwear === 'turban') {
            return `<path d="M13 42 Q20 8 50 7 Q80 8 87 42 Q68 32 50 33 Q32 32 13 42Z" fill="#26324c"/><g stroke="#3d4f75" stroke-width="4" fill="none"><path d="M18 35 Q48 8 84 33"/><path d="M20 22 Q50 43 80 20"/></g>`;
        }
        if (config.headwear === 'kufi' || config.headwear === 'crown-cap') {
            const accent = config.headwear === 'crown-cap' ? '#f2c94c' : '#d9a84a';
            return `<path d="M21 38 Q24 12 50 10 Q76 12 79 38 Q50 28 21 38Z" fill="#224f67" stroke="${accent}" stroke-width="2"/><g fill="${accent}" opacity=".9"><circle cx="35" cy="24" r="2"/><circle cx="50" cy="20" r="2"/><circle cx="65" cy="24" r="2"/></g>`;
        }
        return '';
    }

    function eyesSvg(config = {}) {
        const wide = config.eyes === 'wide' ? 3 : 0;
        const rx = config.eyes === 'round' ? 5.8 : 6.5;
        const ry = config.eyes === 'hooded' ? 3.4 : 4.6;
        const lid = config.eyes === 'hooded' ? '<path d="M28 49 Q36 44 44 49"/><path d="M56 49 Q64 44 72 49"/>' : '';
        return `<g id="eyes"><ellipse cx="${36 - wide}" cy="51" rx="${rx}" ry="${ry}" fill="#fbf6ef"/><ellipse cx="${64 + wide}" cy="51" rx="${rx}" ry="${ry}" fill="#fbf6ef"/><circle cx="${36 - wide}" cy="52" r="2.8" fill="#241b16"/><circle cx="${64 + wide}" cy="52" r="2.8" fill="#241b16"/></g><g stroke="#241712" stroke-width="2" fill="none">${lid}</g>`;
    }

    function noseSvg(config = {}, skin) {
        const shadow = darken(skin, 0.23);
        if (config.nose === 'broad') return `<path d="M50 54 Q45 65 43 69 Q50 74 57 69 Q55 62 50 54Z" fill="${shadow}" opacity=".34"/>`;
        if (config.nose === 'narrow') return `<path d="M50 54 Q48 65 46 68 Q50 71 54 68" fill="${shadow}" opacity=".34"/>`;
        if (config.nose === 'rounded') return `<path d="M50 54 Q47 65 45 68 Q50 73 56 68 Q54 64 50 54Z" fill="${shadow}" opacity=".36"/>`;
        return `<path d="M50 54 Q47 65 45 68 Q50 72 55 68" fill="${shadow}" opacity=".35"/>`;
    }

    function mouthSvg(config = {}) {
        const width = config.lips === 'full' ? 28 : config.lips === 'subtle' ? 18 : 24;
        const curve = config.lips === 'defined' ? 8 : 6;
        const y = config.lips === 'full' ? 78 : 77;
        const left = 50 - width / 2;
        const right = 50 + width / 2;
        const fill = config.lips === 'full' ? '#7b332f' : '#6b3029';
        return `<g id="mouth"><path d="M${left} ${y} Q50 ${y + curve} ${right} ${y}" fill="none" stroke="${fill}" stroke-width="2.5" stroke-linecap="round"/><path d="M${left + 5} ${y + 1} Q50 ${y + 4} ${right - 5} ${y + 1}" fill="none" stroke="${lighten(fill, 0.18)}" stroke-width="1.3" stroke-linecap="round"/></g>`;
    }

    function facialHairSvg(config = {}) {
        const hair = hairColor(config);
        switch (config.facialHair) {
            case 'moustache':
                return `<path d="M39 72 Q47 68 50 72 Q53 68 61 72" fill="none" stroke="${hair}" stroke-width="3" stroke-linecap="round"/>`;
            case 'goatee':
                return `<path d="M41 72 Q47 68 50 72 Q53 68 59 72" fill="none" stroke="${hair}" stroke-width="2.6" stroke-linecap="round"/><path d="M45 83 Q50 91 55 83" fill="${hair}" opacity=".9"/>`;
            case 'short-beard':
                return `<path d="M29 70 Q50 95 71 70 Q66 91 50 98 Q34 91 29 70Z" fill="${hair}" opacity=".34"/>`;
            case 'full-beard':
                return `<path d="M24 62 Q28 98 50 104 Q72 98 76 62 Q68 95 50 104 Q32 95 24 62Z" fill="${hair}" opacity=".62"/>`;
            default:
                return '';
        }
    }

    function headAccessoriesSvg(config = {}) {
        let extra = '';
        if (hasAccessory(config, 'glasses')) {
            extra += `<g stroke="#211a18" stroke-width="2" fill="none"><circle cx="36" cy="52" r="9"/><circle cx="64" cy="52" r="9"/><path d="M45 52 L55 52"/><path d="M27 51 L20 49"/><path d="M73 51 L80 49"/></g>`;
        }
        if (hasAccessory(config, 'earrings')) {
            extra += `<g fill="#d9a84a"><circle cx="15" cy="67" r="3"/><circle cx="85" cy="67" r="3"/></g>`;
        }
        return extra;
    }

    function facialHairSvgV3(config = {}) {
        const hair = hairColor(config);
        switch (config.facialHair) {
            case 'moustache':
                return `<path ${roleAttr('facial-hair')} d="M43 79 Q51 75 54 79 Q57 75 65 79" fill="none" stroke="${hair}" stroke-width="3" stroke-linecap="round"/>`;
            case 'goatee':
                return `<g ${roleAttr('facial-hair')}><path d="M43 79 Q51 75 54 79 Q57 75 65 79" fill="none" stroke="${hair}" stroke-width="2.7" stroke-linecap="round"/><path d="M49 98 Q54 107 59 98" fill="${hair}" opacity=".9"/></g>`;
            case 'short-beard':
                return `<g ${roleAttr('facial-hair')}><path d="M35 88 Q54 105 73 88 Q69 108 54 114 Q39 108 35 88Z" fill="${hair}" opacity=".16"/><path d="M42 81 Q50 78 54 81 Q58 78 66 81" fill="none" stroke="${hair}" stroke-width="2.4" stroke-linecap="round" opacity=".72"/><path d="M38 91 Q54 100 70 91" fill="none" stroke="${hair}" stroke-width="1.7" stroke-linecap="round" opacity=".32"/></g>`;
            case 'full-beard':
                return `<path ${roleAttr('facial-hair')} d="M30 74 Q34 110 54 118 Q74 110 78 74 Q70 105 54 116 Q38 105 30 74Z" fill="${hair}" opacity=".48"/>`;
            default:
                return '';
        }
    }

    function headAccessoriesSvgV3(config = {}) {
        let extra = '';
        if (hasAccessory(config, 'glasses')) {
            extra += `<g ${roleAttr('glasses')} stroke="#211a18" stroke-width="2" fill="none"><ellipse cx="42" cy="62" rx="9.5" ry="8.5"/><ellipse cx="67" cy="62" rx="9.5" ry="8.5"/><path d="M51 62 L58 62"/><path d="M32 61 L22 58"/><path d="M77 61 L87 58"/></g>`;
        }
        if (hasAccessory(config, 'earrings')) {
            extra += `<g ${roleAttr('earrings')} fill="#d9a84a"><circle cx="20" cy="75" r="3.2"/><circle cx="88" cy="75" r="3.2"/></g>`;
        }
        return extra;
    }

    function renderHead(config, ns) {
        const C = getCatalog();
        const skin = C.skinColor(config);
        const shadow = darken(skin, 0.2);
        const face = faceSpec(config);
        const body = `
            <rect x="40" y="84" width="20" height="22" rx="6" fill="${shadow}"/>
            <ellipse cx="15" cy="54" rx="7" ry="11" fill="${skin}"/>
            <ellipse cx="85" cy="54" rx="7" ry="11" fill="${skin}"/>
            <ellipse cx="50" cy="52" rx="${face.rx}" ry="${face.ry}" fill="${skin}"/>
            ${renderFemaleBrowClearLayer(hairSvg(config), config, { rendererVersion: 1, scaleY: 0.88 })}
            ${renderFemaleBrowClearLayer(headwearSvg(config), config, { rendererVersion: 1, scaleY: 0.86 })}
            <g id="brows" stroke="#241712" stroke-width="3" stroke-linecap="round"><path d="M29 43 Q37 39 44 42"/><path d="M56 42 Q63 39 71 43"/></g>
            ${eyesSvg(config)}
            ${noseSvg(config, skin)}
            ${mouthSvg(config)}
            ${facialHairSvg(config)}
            ${headAccessoriesSvg(config)}`;
        return svgWrap({ width: 100, height: 110, body, namespace: ns });
    }

    function patternSvg(colors) {
        return `<g opacity=".9" stroke="${colors.accent}" stroke-width="2" fill="none"><path d="M15 32 L85 82"/><path d="M85 32 L15 82"/><circle cx="50" cy="56" r="12"/><path d="M22 68 Q50 42 78 68"/></g>`;
    }

    function torsoAccessoriesSvg(config = {}) {
        let extra = '';
        if (hasAccessory(config, 'id-badge')) {
            extra += `<g id="idBadge"><rect x="66" y="42" width="15" height="19" rx="2" fill="#f7fafc" stroke="#34434a" stroke-width="1"/><path d="M70 47 L77 47 M69 53 L79 53" stroke="#34434a" stroke-width="1"/></g>`;
        }
        if (hasAccessory(config, 'stethoscope')) {
            extra += `<g id="stethoscope" stroke="#26343f" stroke-width="2" fill="none"><path d="M31 27 Q29 57 44 76"/><path d="M69 27 Q71 57 56 76"/><path d="M44 76 Q50 86 56 76"/><circle cx="50" cy="90" r="5" fill="#26343f"/></g>`;
        }
        if (hasAccessory(config, 'beads')) {
            extra += `<g fill="#d97d36"><circle cx="34" cy="33" r="3"/><circle cx="41" cy="39" r="3"/><circle cx="50" cy="42" r="3"/><circle cx="59" cy="39" r="3"/><circle cx="66" cy="33" r="3"/></g>`;
        }
        return extra;
    }

    function outfitId(config = {}) {
        return config.styling?.outfit || config.outfit || '';
    }

    function presentationId(config = {}) {
        return config.identity?.presentation || config.presentation || 'female';
    }

    function usesSkirtOrWrapper(config = {}) {
        return presentationId(config) !== 'male'
            && /iro-buba|george-wrapper|corporate-dress|ankara-peplum/i.test(outfitId(config));
    }

    function renderTorso(config, ns) {
        const colors = outfitColors(config);
        const bodyType = bodySpec(config);
        const outfitKey = outfitId(config);
        const hasSkirtOrWrapper = usesSkirtOrWrapper(config);
        const torsoWidth = 88 * bodyType.torsoScale;
        const x0 = 50 - torsoWidth / 2;
        const x1 = 50 + torsoWidth / 2;
        let extra = '';
        if (outfitKey === 'doctor' || outfitKey === 'lab-coat') {
            extra += `<path d="M15 25 L42 78 L48 30 Z" fill="#dce5e8"/><path d="M85 25 L58 78 L52 30 Z" fill="#dce5e8"/><path d="M30 33 Q18 55 24 88" stroke="#34434a" stroke-width="2" fill="none"/><path d="M70 33 Q82 55 76 88" stroke="#34434a" stroke-width="2" fill="none"/>`;
        }
        if (outfitKey === 'business-suit' || outfitKey === 'lecturer') {
            extra += `<path d="M35 14 L50 56 L65 14 L60 118 L40 118 Z" fill="#eef4fa"/><path d="M47 26 L53 26 L56 82 L50 93 L44 82 Z" fill="${colors.accent}"/><path d="M19 12 L45 60 L33 66 Z" fill="${darken(colors.primary, 0.1)}"/><path d="M81 12 L55 60 L67 66 Z" fill="${darken(colors.primary, 0.1)}"/>`;
        }
        if (/ankara/i.test(outfitKey || '')) {
            extra += patternSvg(colors);
            if (outfitKey === 'ankara-peplum' && hasSkirtOrWrapper) {
                extra += `<path d="M13 84 Q50 108 87 84 L82 118 Q50 128 18 118 Z" fill="${colors.primary}" stroke="${colors.accent}" stroke-width="2" opacity=".96"/>`;
            }
        }
        if (/agbada|baban-riga|academic-robe/i.test(outfitKey || '')) {
            extra += `<path d="M7 22 Q50 -2 93 22 L99 122 Q50 140 1 122 Z" fill="${colors.primary}" opacity=".86"/><path d="M28 18 Q50 48 72 18" fill="none" stroke="${colors.accent}" stroke-width="3"/><path d="M50 20 L50 118" stroke="${colors.accent}" stroke-width="2" opacity=".8"/>`;
        }
        if (hasSkirtOrWrapper && (outfitKey === 'iro-buba' || outfitKey === 'george-wrapper' || outfitKey === 'corporate-dress')) {
            extra += `<path d="M22 58 Q50 46 78 58 L88 123 Q50 132 12 123 Z" fill="${darken(colors.primary, 0.08)}" opacity=".92"/><path d="M25 23 Q50 36 75 23" stroke="${colors.accent}" stroke-width="3" fill="none"/>`;
        }
        if (outfitKey === 'isi-agu') {
            extra += `<g fill="${colors.accent}" opacity=".8"><path d="M26 44 q7 -8 14 0 q-7 11 -14 0Z"/><path d="M60 73 q7 -8 14 0 q-7 11 -14 0Z"/><path d="M36 97 q7 -8 14 0 q-7 11 -14 0Z"/></g>`;
        }
        const body = `<path d="M${x0} 10 Q50 0 ${x1} 10 L94 110 Q50 125 6 110 Z" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="2"/>${extra}${torsoAccessoriesSvg(config)}`;
        return svgWrap({ width: 100, height: 125, body, namespace: ns });
    }

    function renderArm(config, ns) {
        const C = getCatalog();
        const skin = C.skinColor(config);
        const colors = outfitColors(config);
        const bodyType = bodySpec(config);
        const width = 18 * bodyType.limbScale;
        const cuff = hasAccessory(config, 'watch') ? `<rect x="24" y="96" width="25" height="5" rx="2" fill="#1f2933"/>` : '';
        const sleevePattern = /ankara|agbada|baban-riga|iro-buba|george-wrapper/i.test(config.outfit || '')
            ? `<path d="M24 22 L52 55 M52 20 L23 61" stroke="${colors.accent}" stroke-width="2" opacity=".75"/>`
            : '';
        const body = `<path d="M20 4 Q${38 + width * 0.2} 0 54 10 L48 92 Q38 104 26 92 Z" fill="${colors.primary}" stroke="${colors.secondary}" stroke-width="2"/>${sleevePattern}<path d="M26 87 Q38 82 48 88 L45 118 Q37 128 29 118 Z" fill="${skin}"/>${cuff}<ellipse cx="37" cy="123" rx="12" ry="8" fill="${skin}"/>`;
        return svgWrap({ width: 75, height: 135, body, namespace: ns });
    }

    function renderLeg(config, ns) {
        const colors = outfitColors(config);
        const shoe = config.footwear === 'sneakers' ? '#f4f7fb' : config.footwear === 'sandals' ? '#6f4428' : '#241f1d';
        const body = `<path d="M18 2 Q40 -2 58 2 L54 118 Q40 126 26 118 Z" fill="${colors.trouser || colors.secondary}"/><path d="M23 110 L55 110 L62 134 Q40 142 16 134 Z" fill="${shoe}"/><path d="M24 125 L57 125" stroke="${darken(shoe, 0.25)}" stroke-width="2"/>`;
        return svgWrap({ width: 80, height: 145, body, namespace: ns });
    }

    const SVG_AFRICAN_FRONT_ART_PROFILE = Object.freeze({
        version: 2,
        view: 'front',
        parts: Object.freeze({
            'head-neck': Object.freeze({
                width: 120,
                height: 132,
                neckTop: 76,
                neckBottom: 130,
                carrierPathN: Object.freeze([
                    Object.freeze([0.50, 0.02]),
                    Object.freeze([0.66, 0.04]),
                    Object.freeze([0.82, 0.13]),
                    Object.freeze([0.92, 0.31]),
                    Object.freeze([0.98, 0.45]),
                    Object.freeze([0.92, 0.60]),
                    Object.freeze([0.78, 0.71]),
                    Object.freeze([0.72, 0.84]),
                    Object.freeze([0.82, 0.985]),
                    Object.freeze([0.18, 0.985]),
                    Object.freeze([0.28, 0.84]),
                    Object.freeze([0.22, 0.71]),
                    Object.freeze([0.08, 0.60]),
                    Object.freeze([0.02, 0.45]),
                    Object.freeze([0.08, 0.31]),
                    Object.freeze([0.18, 0.13]),
                    Object.freeze([0.34, 0.04])
                ])
            }),
            torso: Object.freeze({ width: 140, height: 170, shoulderY: 18, waistY: 122, hemY: 164 }),
            arm: Object.freeze({ width: 90, height: 176, shoulderY: 8, wristY: 144 }),
            leg: Object.freeze({ width: 92, height: 188, hipY: 4, ankleY: 158 })
        })
    });

    const SVG_AFRICAN_FRONT_BODY_PROFILE_V3 = Object.freeze({
        version: 3,
        rendererVersion: 3,
        view: 'front',
        referenceWidth: 400,
        referenceHeight: 730,
        groundY: 730,
        overlapZones: Object.freeze({
            neckTorso: 22,
            shoulderArm: 14,
            hipThigh: 16
        }),
        parts: Object.freeze({
            'head-neck': Object.freeze({
                x: 146, y: 42, width: 108, height: 142,
                visibleWidth: 99, visibleHeight: 132,
                pivotX: 0.5, pivotY: 0.70,
                carrierPathN: Object.freeze([
                    Object.freeze([0.50, 0.02]), Object.freeze([0.67, 0.06]),
                    Object.freeze([0.84, 0.22]), Object.freeze([0.91, 0.47]),
                    Object.freeze([0.85, 0.68]), Object.freeze([0.69, 0.80]),
                    Object.freeze([0.64, 0.88]), Object.freeze([0.73, 0.98]),
                    Object.freeze([0.27, 0.98]), Object.freeze([0.36, 0.88]),
                    Object.freeze([0.31, 0.80]), Object.freeze([0.15, 0.68]),
                    Object.freeze([0.09, 0.47]), Object.freeze([0.16, 0.22]),
                    Object.freeze([0.33, 0.06])
                ])
            }),
            torso: Object.freeze({
                x: 105, y: 173, width: 190, height: 267,
                visibleWidth: 162, visibleHeight: 249,
                pivotX: 0.5, pivotY: 0.5,
                carrierPathN: Object.freeze([
                    Object.freeze([0.12, 0.07]), Object.freeze([0.31, 0.02]),
                    Object.freeze([0.69, 0.02]), Object.freeze([0.88, 0.07]),
                    Object.freeze([0.82, 0.48]), Object.freeze([0.76, 0.84]),
                    Object.freeze([0.60, 0.98]), Object.freeze([0.40, 0.98]),
                    Object.freeze([0.24, 0.84]), Object.freeze([0.18, 0.48])
                ])
            }),
            arm: Object.freeze({
                width: 72, height: 320,
                visibleWidth: 60, visibleHeight: 300,
                pivotX: 0.5, pivotY: 0.02,
                carrierPathN: Object.freeze([
                    Object.freeze([0.25, 0.00]), Object.freeze([0.75, 0.00]),
                    Object.freeze([0.86, 0.09]), Object.freeze([0.80, 0.30]),
                    Object.freeze([0.73, 0.62]),
                    Object.freeze([0.64, 0.82]), Object.freeze([0.78, 0.92]),
                    Object.freeze([0.66, 0.99]), Object.freeze([0.51, 0.96]),
                    Object.freeze([0.36, 0.99]), Object.freeze([0.22, 0.92]),
                    Object.freeze([0.36, 0.82]), Object.freeze([0.27, 0.62]),
                    Object.freeze([0.20, 0.30]), Object.freeze([0.14, 0.09])
                ])
            }),
            'right-arm': Object.freeze({
                x: 82, y: 166, width: 72, height: 320,
                visibleWidth: 60, visibleHeight: 300,
                pivotX: 0.5, pivotY: 0.02,
                pinTarget: 'waist', pinRotation: 'inherit'
            }),
            'left-arm': Object.freeze({
                x: 246, y: 166, width: 72, height: 320,
                visibleWidth: 60, visibleHeight: 300,
                pivotX: 0.5, pivotY: 0.02,
                pinTarget: 'waist', pinRotation: 'inherit'
            }),
            leg: Object.freeze({
                width: 78, height: 342,
                visibleWidth: 62, visibleHeight: 329,
                pivotX: 0.5, pivotY: 0,
                carrierPathN: Object.freeze([
                    Object.freeze([0.20, 0.00]), Object.freeze([0.80, 0.00]),
                    Object.freeze([0.71, 0.38]), Object.freeze([0.63, 0.74]),
                    Object.freeze([0.83, 0.91]), Object.freeze([0.95, 0.98]),
                    Object.freeze([0.55, 1.00]), Object.freeze([0.30, 0.97]),
                    Object.freeze([0.17, 0.86]), Object.freeze([0.29, 0.74]),
                    Object.freeze([0.23, 0.38])
                ])
            }),
            'right-leg': Object.freeze({
                x: 126, y: 388, width: 78, height: 342,
                visibleWidth: 62, visibleHeight: 319,
                pivotX: 0.5, pivotY: 0,
                pinAnchorX: 0.36, pinAnchorY: 0.84,
                pinRotation: 'inherit'
            }),
            'left-leg': Object.freeze({
                x: 196, y: 388, width: 78, height: 342,
                visibleWidth: 62, visibleHeight: 319,
                pivotX: 0.5, pivotY: 0,
                pinAnchorX: 0.64, pinAnchorY: 0.84,
                pinRotation: 'inherit'
            })
        }),
        metrics: Object.freeze({
            headWidthRatio: 108 / 400,
            headHeightRatio: 142 / 730,
            torsoWidthRatio: 190 / 400,
            torsoHeightRatio: 267 / 730,
            armWidthRatio: 72 / 400,
            armLengthRatio: 320 / 730,
            legWidthRatio: 78 / 400,
            legLengthRatio: 342 / 730
        })
    });

    function roleAttr(role) {
        return `data-svg-african-role="${role}"`;
    }

    function renderHeadwearV2(config, skin) {
        const colors = outfitColors(config);
        const accent = colors.accent || '#d8a23a';
        if (config.headwear === 'gele') {
            return `<g ${roleAttr('headwear')}><path d="M7 58 C6 28 29 5 63 5 C99 7 114 32 110 62 C90 49 29 48 7 58Z" fill="${colors.primary}" stroke="${darken(colors.primary, .25)}" stroke-width="3"/><path d="M13 52 C36 31 82 20 111 40" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><path d="M18 40 C45 56 76 56 106 40" fill="none" stroke="${lighten(colors.primary, .24)}" stroke-width="2.6" opacity=".70" stroke-linecap="round"/><path d="M31 21 C49 32 83 32 100 22" fill="none" stroke="${darken(colors.primary, .18)}" stroke-width="2" opacity=".58" stroke-linecap="round"/></g>`;
        }
        if (config.headwear === 'turban' || config.headwear === 'duku' || config.headwear === 'wrapped-gele') {
            return `<g ${roleAttr('headwear')}><path d="M13 51 C13 28 33 12 62 11 C94 12 110 30 108 55 C89 47 34 47 13 51Z" fill="${colors.primary}" stroke="${darken(colors.primary, .22)}" stroke-width="3"/><path d="M20 48 C39 41 82 41 104 48" fill="none" stroke="${darken(colors.primary, .16)}" stroke-width="6" opacity=".52" stroke-linecap="round"/><path d="M34 19 Q57 51 86 20" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round"/><path d="M17 43 Q57 29 107 49" fill="none" stroke="${lighten(colors.primary, .18)}" stroke-width="2.6" opacity=".75" stroke-linecap="round"/></g>`;
        }
        if (config.headwear === 'fila' || config.headwear === 'cap') {
            return `<g ${roleAttr('headwear')}><path d="M20 47 C25 27 42 15 64 16 C88 17 103 30 106 50 C86 45 40 44 20 47Z" fill="${colors.primary}" stroke="${darken(colors.primary, .24)}" stroke-width="3"/><path d="M34 27 Q61 13 101 32" fill="${darken(colors.primary, .10)}" opacity=".55"/><path d="M24 43 C43 37 83 38 103 44" fill="none" stroke="${accent}" stroke-width="2.8" stroke-linecap="round"/></g>`;
        }
        if (config.headwear === 'nurse-cap') {
            return `<g ${roleAttr('headwear')}><path d="M28 30 Q60 12 92 30 L87 48 Q60 38 33 48Z" fill="#f8fbff" stroke="#7c8a96" stroke-width="2"/><path d="M60 25 v14 M53 32 h14" stroke="#c0282d" stroke-width="3"/></g>`;
        }
        return '';
    }

    function renderHairV2(config) {
        if (config.headwear && config.headwear !== 'none') return '';
        const hair = hairColor(config);
        switch (config.hair) {
            case 'bald':
                return '';
            case 'afro':
                return `<g ${roleAttr('hair')} fill="${hair}"><circle cx="28" cy="43" r="18"/><circle cx="47" cy="27" r="20"/><circle cx="72" cy="28" r="22"/><circle cx="93" cy="46" r="19"/><path d="M24 52 Q59 17 100 55 L95 78 Q62 51 27 77Z"/></g>`;
            case 'braids':
            case 'cornrows':
            case 'twists':
            case 'locs':
                return `<g ${roleAttr('hair')}><path d="M17 56 C13 30 31 10 61 10 C94 11 109 32 105 57 C88 45 34 45 17 56Z" fill="${hair}"/><g stroke="${lighten(hair, .18)}" stroke-width="1.4" opacity=".18" stroke-linecap="round"><path d="M36 26 C43 31 45 39 43 49"/><path d="M49 20 C55 30 56 39 55 49"/><path d="M72 21 C66 30 65 39 66 49"/><path d="M86 27 C78 32 76 40 78 49"/></g><g ${roleAttr('side-strands outside-face no-face-crossing')} fill="none" stroke="${hair}" stroke-width="4.8" stroke-linecap="round"><path d="M22 55 C16 74 19 96 29 113"/><path d="M99 55 C105 74 102 96 91 113"/></g></g>`;
            case 'natural-bun':
                return `<g ${roleAttr('hair')} fill="${hair}"><ellipse cx="60" cy="28" rx="35" ry="19"/><circle cx="60" cy="13" r="17"/><path d="M26 47 Q59 16 96 48 L90 74 Q61 42 31 75Z"/></g>`;
            case 'fade':
            case 'low-cut':
            default:
                return `<g ${roleAttr('hair')}><path d="M19 52 C17 31 34 14 61 13 C91 14 105 32 103 53 C85 43 37 43 19 52Z" fill="${hair}"/><path d="M25 50 C43 43 83 43 101 50" fill="none" stroke="${lighten(hair, .16)}" stroke-width="1.6" opacity=".22" stroke-linecap="round"/></g>`;
        }
    }

    function renderHeadV2(config, ns) {
        const C = getCatalog();
        const skin = C.skinColor(config);
        const shadow = darken(skin, .20);
        const highlight = lighten(skin, .22);
        const face = faceSpec(config);
        const rx = Math.round((face.rx || 34) * 1.05);
        const ry = Math.round((face.ry || 42) * 1.08);
        const eyeShape = config.eyes === 'round' ? 'circle' : 'almond';
        const lipW = config.lips === 'full' ? 33 : config.lips === 'subtle' ? 23 : 29;
        const lipH = config.lips === 'full' ? 8 : 5;
        const browStroke = '#251813';
        const body = `
            <g ${roleAttr('neck')}><path d="M43 76 Q60 95 77 76 L82 130 Q60 131 38 130Z" fill="${shadow}"/><path d="M47 87 Q60 99 73 87 L72 126 Q60 130 48 126Z" fill="${skin}" opacity=".78"/></g>
            <g ${roleAttr('ears')} fill="${skin}"><ellipse cx="20" cy="61" rx="8" ry="13"/><ellipse cx="100" cy="61" rx="8" ry="13"/><path d="M18 60 q7 3 1 11 M102 60 q-7 3 -1 11" stroke="${shadow}" stroke-width="2" fill="none" opacity=".55"/></g>
            <g ${roleAttr('face')}><ellipse cx="60" cy="58" rx="${rx}" ry="${ry}" fill="${skin}"/><ellipse cx="48" cy="45" rx="19" ry="24" fill="${highlight}" opacity=".16"/><path d="M32 78 Q60 99 88 78 Q82 108 60 113 Q38 108 32 78Z" fill="${darken(skin, .08)}" opacity=".20"/></g>
            ${renderFemaleBrowClearLayer(renderHairV2(config), config, { rendererVersion: 2, scaleY: 0.86 })}
            ${renderFemaleBrowClearLayer(renderHeadwearV2(config, skin), config, { rendererVersion: 2, scaleY: 0.78 })}
            <g ${roleAttr('brows')} stroke="${browStroke}" stroke-width="4" stroke-linecap="round"><path id="brow-left" d="M34 49 Q43 44 51 48"/><path id="brow-right" d="M69 48 Q78 44 87 49"/></g>
            <g ${roleAttr('eyes')}>${eyeShape === 'circle'
                ? '<ellipse id="eye-left" cx="43" cy="58" rx="8" ry="7" fill="#fff"/><ellipse id="eye-right" cx="77" cy="58" rx="8" ry="7" fill="#fff"/>'
                : '<path id="eye-left" d="M33 58 Q43 51 53 58 Q43 65 33 58Z" fill="#fff"/><path id="eye-right" d="M67 58 Q77 51 87 58 Q77 65 67 58Z" fill="#fff"/>'}<circle id="pupil-left" cx="43" cy="58" r="3.8" fill="#231815"/><circle id="pupil-right" cx="77" cy="58" r="3.8" fill="#231815"/></g>
            <g ${roleAttr('nose')}><path d="${config.nose === 'broad' ? 'M60 55 Q53 72 49 77 Q60 83 71 77 Q67 69 60 55Z' : config.nose === 'narrow' ? 'M60 55 Q57 70 54 76 Q60 80 66 76 Q63 68 60 55Z' : 'M60 55 Q56 70 52 76 Q60 82 68 76 Q64 68 60 55Z'}" fill="${shadow}" opacity=".34"/><path d="M54 77 Q60 81 67 77" stroke="${darken(skin, .28)}" stroke-width="1.6" fill="none" opacity=".46"/></g>
            <g ${roleAttr('mouth')}><path id="mouth-upper" d="M${60 - lipW / 2} 88 Q60 ${88 - lipH} ${60 + lipW / 2} 88 Q60 ${88 + lipH * .35} ${60 - lipW / 2} 88Z" fill="#773029" opacity=".92"/><path id="mouth-lower" d="M${60 - lipW / 2 + 3} 90 Q60 ${90 + lipH} ${60 + lipW / 2 - 3} 90 Q60 ${94 + lipH * .35} ${60 - lipW / 2 + 3} 90Z" fill="#9a463c" opacity=".9"/></g>
            ${facialHairSvg(config)}
            ${headAccessoriesSvg(config)}`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_ART_PROFILE.parts['head-neck'].width, height: SVG_AFRICAN_FRONT_ART_PROFILE.parts['head-neck'].height, body, namespace: ns });
    }

    function renderPrintMotifsV2(colors, wide = false) {
        const accent = colors.accent || '#d8a23a';
        return `<g ${roleAttr('fabric-pattern')} opacity=".82" fill="none" stroke="${accent}" stroke-width="${wide ? 3 : 2}"><path d="M20 42 C42 22 72 22 100 44"/><path d="M18 82 C46 58 91 62 121 88"/><circle cx="42" cy="59" r="10"/><circle cx="94" cy="105" r="13"/><path d="M72 34 L105 67 M105 34 L72 67"/></g>`;
    }

    function renderTorsoV2(config, ns) {
        const colors = outfitColors(config);
        const bodyType = bodySpec(config);
        const primary = colors.primary || '#334155';
        const secondary = colors.secondary || darken(primary, .24);
        const accent = colors.accent || '#d8a23a';
        const outfitKey = outfitId(config);
        const isFemale = presentationId(config) !== 'male';
        const hasSkirtOrWrapper = usesSkirtOrWrapper(config);
        const torsoScale = Math.max(.86, Math.min(1.18, bodyType.torsoScale || 1));
        const shoulderHalf = 54 * torsoScale;
        const waistHalf = (isFemale ? 31 : 36) * torsoScale;
        const hipHalf = (isFemale ? 45 : 39) * torsoScale;
        const leftShoulder = 70 - shoulderHalf;
        const rightShoulder = 70 + shoulderHalf;
        let base = `<path ${roleAttr('torso-clothing')} d="M${leftShoulder} 22 Q70 5 ${rightShoulder} 22 L${70 + waistHalf} 120 Q70 135 ${70 - waistHalf} 120 Z" fill="${primary}" stroke="${secondary}" stroke-width="3"/>
            <path ${roleAttr('neck-seat nonpremium-neck-connector')} d="M51 18 Q70 30 89 18 L84 35 Q70 43 56 35Z" fill="${darken(primary, .08)}" opacity=".42"/>
            <g ${roleAttr('shoulder-root-overlap nonpremium-shoulder-connector')} opacity=".22" fill="none" stroke="${lighten(primary, .16)}" stroke-width="6" stroke-linecap="round">
                <path d="M${leftShoulder + 5} 27 C${leftShoulder + 18} 17 ${leftShoulder + 32} 21 ${leftShoulder + 43} 35"/>
                <path d="M${rightShoulder - 5} 27 C${rightShoulder - 18} 17 ${rightShoulder - 32} 21 ${rightShoulder - 43} 35"/>
            </g>`;
        if (isFemale) {
            base += `<path ${roleAttr('bust-drape')} d="M40 54 Q54 41 70 55 Q86 41 100 54 Q94 76 70 78 Q47 76 40 54Z" fill="${lighten(primary, .10)}" opacity=".33"/>`;
        }
        let outfit = '';
        if (outfitKey === 'business-suit' || outfitKey === 'lecturer') {
            outfit += `<g ${roleAttr('jacket')}><path d="M31 23 L61 85 L48 95 L23 31Z" fill="${darken(primary, .08)}"/><path d="M109 23 L79 85 L92 95 L117 31Z" fill="${darken(primary, .08)}"/><path d="M55 19 L70 66 L85 19 L82 128 L58 128Z" fill="#eef4fa"/><path d="M66 34 H74 L78 104 L70 119 L62 104Z" fill="${accent}"/><path d="M38 132 H102" stroke="${secondary}" stroke-width="3"/></g>`;
        } else if (outfitKey === 'doctor' || outfitKey === 'lab-coat') {
            outfit += `<g ${roleAttr('clinical-coat')}><path d="M22 23 L58 84 L67 36 L67 164 L27 158Z" fill="#f7fbff" stroke="#d0d9df" stroke-width="2"/><path d="M118 23 L82 84 L73 36 L73 164 L113 158Z" fill="#f7fbff" stroke="#d0d9df" stroke-width="2"/><path d="M57 35 L70 62 L83 35" fill="none" stroke="#82909b" stroke-width="2"/></g>`;
        } else if (outfitKey === 'medical-scrubs' || outfitKey === 'nurse') {
            outfit += `<g ${roleAttr('scrubs')}><path d="M45 22 L70 57 L95 22" fill="none" stroke="${lighten(primary, .30)}" stroke-width="5"/><path d="M34 58 H52 M88 58 H106" stroke="${darken(primary, .18)}" stroke-width="3"/></g>`;
        } else if (/ankara/i.test(outfitKey || '')) {
            outfit += renderPrintMotifsV2(colors, false);
            if (outfitKey === 'ankara-peplum' && hasSkirtOrWrapper) outfit += `<path ${roleAttr('peplum')} d="M20 111 Q70 148 120 111 L126 166 Q70 181 14 166Z" fill="${primary}" stroke="${accent}" stroke-width="3" opacity=".96"/>`;
        } else if (/agbada|baban-riga|academic-robe/i.test(outfitKey || '')) {
            outfit += `<g ${roleAttr('wide-garment')}><path d="M9 25 Q70 -6 131 25 L138 158 Q70 184 2 158Z" fill="${primary}" opacity=".91" stroke="${secondary}" stroke-width="3"/><path d="M38 25 Q70 72 102 25" fill="none" stroke="${accent}" stroke-width="5"/><path d="M70 31 L70 158" stroke="${accent}" stroke-width="3" opacity=".8"/></g>${renderPrintMotifsV2(colors, true)}`;
        } else if (hasSkirtOrWrapper && (outfitKey === 'iro-buba' || outfitKey === 'george-wrapper' || outfitKey === 'corporate-dress')) {
            outfit += `<g ${roleAttr('wrapper-dress')}><path d="M28 63 Q70 47 112 63 L124 166 Q70 180 16 166Z" fill="${darken(primary, .07)}" opacity=".94"/><path d="M36 29 Q70 45 104 29" stroke="${accent}" stroke-width="5" fill="none"/></g>${renderPrintMotifsV2(colors, false)}`;
        } else {
            outfit += `<g ${roleAttr('casual-top')}><path d="M47 24 L70 47 L93 24" fill="none" stroke="${lighten(primary, .28)}" stroke-width="4"/><path d="M31 132 H109" stroke="${secondary}" stroke-width="3"/></g>`;
        }
        let accessories = torsoAccessoriesSvg(config);
        if (hasAccessory(config, 'id-badge')) accessories += `<g ${roleAttr('id-badge')}><rect x="91" y="53" width="20" height="25" rx="3" fill="#f7fafc" stroke="#34434a" stroke-width="1.5"/><path d="M96 60 H106 M95 68 H108" stroke="#34434a" stroke-width="1.4"/></g>`;
        if (hasAccessory(config, 'stethoscope')) accessories += `<g ${roleAttr('stethoscope')} stroke="#26343f" stroke-width="3" fill="none"><path d="M43 31 Q39 74 61 96"/><path d="M97 31 Q101 74 79 96"/><path d="M61 96 Q70 110 79 96"/><circle cx="70" cy="122" r="7" fill="#26343f"/></g>`;
        if (hasAccessory(config, 'beads')) accessories += `<g ${roleAttr('beads')} fill="#d97d36"><circle cx="46" cy="36" r="4"/><circle cx="56" cy="43" r="4"/><circle cx="70" cy="47" r="5"/><circle cx="84" cy="43" r="4"/><circle cx="94" cy="36" r="4"/></g>`;
        const body = `${base}<path ${roleAttr('hip-seat nonpremium-hip-connector')} d="M${70 - hipHalf - 2} 121 Q70 141 ${70 + hipHalf + 2} 121 L${70 + hipHalf - 6} 153 Q70 165 ${70 - hipHalf + 6} 153Z" fill="${darken(primary, .05)}" opacity=".46"/><path ${roleAttr('hip-line')} d="M${70 - hipHalf} 128 Q70 142 ${70 + hipHalf} 128 L${70 + hipHalf - 5} 164 Q70 173 ${70 - hipHalf + 5} 164Z" fill="${primary}" opacity=".82"/>${outfit}${accessories}`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_ART_PROFILE.parts.torso.width, height: SVG_AFRICAN_FRONT_ART_PROFILE.parts.torso.height, body, namespace: ns });
    }

    function renderArmV2(config, ns, partKey) {
        const C = getCatalog();
        const skin = C.skinColor(config);
        const colors = outfitColors(config);
        const bodyType = bodySpec(config);
        const primary = colors.primary || '#334155';
        const secondary = colors.secondary || darken(primary, .24);
        const limbScale = Math.max(.88, Math.min(1.16, bodyType.limbScale || 1));
        const sleeveW = 23 * limbScale;
        const wristW = 14 * limbScale;
        const isLeft = /^left/.test(partKey || '');
        const watch = hasAccessory(config, 'watch') && !isLeft ? `<rect ${roleAttr('watch')} x="35" y="126" width="24" height="6" rx="3" fill="#1f2933"/>` : '';
        const patterned = /ankara|agbada|baban-riga|iro-buba|george-wrapper/i.test(config.outfit || '')
            ? `<g ${roleAttr('sleeve-pattern')} opacity=".78" stroke="${colors.accent || '#d8a23a'}" stroke-width="2"><path d="M26 33 L63 72"/><path d="M63 34 L27 76"/><circle cx="45" cy="56" r="8" fill="none"/></g>`
            : '';
        const sleeve = `<path ${roleAttr(isLeft ? 'left-sleeve' : 'right-sleeve')} d="M23 9 C33 -2 61 -1 68 10 L62 116 Q45 130 30 116 Z" fill="${primary}" stroke="${secondary}" stroke-width="3"/><path ${roleAttr('shoulder-overlap')} d="M25 12 C36 4 57 4 67 13 C60 21 50 25 40 24 C32 24 27 20 25 12Z" fill="${lighten(primary, .12)}" opacity=".16"/><path ${roleAttr('shoulder-root-overlap nonpremium-shoulder-connector')} d="M21 8 C34 -5 62 -4 72 9 C69 20 57 28 43 28 C31 28 23 20 21 8Z" fill="${lighten(primary, .10)}" opacity=".18"/>`;
        const forearm = `<path ${roleAttr(isLeft ? 'left-forearm' : 'right-forearm')} d="M31 111 Q45 104 58 112 L55 145 Q45 157 35 145Z" fill="${skin}" stroke="${darken(skin, .18)}" stroke-width="1.5"/>`;
        const hand = `<ellipse ${roleAttr(isLeft ? 'left-hand' : 'right-hand')} cx="45" cy="155" rx="${Math.max(12, wristW)}" ry="13" fill="${skin}"/><path d="M36 157 Q45 164 55 157" stroke="${darken(skin, .23)}" stroke-width="1.5" fill="none" opacity=".5"/>`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_ART_PROFILE.parts.arm.width, height: SVG_AFRICAN_FRONT_ART_PROFILE.parts.arm.height, body: `${sleeve}${patterned}${forearm}${watch}${hand}`, namespace: ns });
    }

    function renderLegV2(config, ns, partKey) {
        const colors = outfitColors(config);
        const bodyType = bodySpec(config);
        const trouser = colors.trouser || colors.secondary || '#1f2937';
        const skin = getCatalog().skinColor(config);
        const shoe = config.footwear === 'sneakers' ? '#f4f7fb' : config.footwear === 'sandals' ? '#7a4b30' : config.footwear === 'clinical' ? '#ffffff' : '#211d1c';
        const limbScale = Math.max(.88, Math.min(1.14, bodyType.limbScale || 1));
        const thighW = 31 * limbScale;
        const ankleW = 19 * limbScale;
        const isSkirt = usesSkirtOrWrapper(config);
        const legFill = isSkirt ? skin : trouser;
        const body = `
            <path ${roleAttr(/^left/.test(partKey || '') ? 'left-leg' : 'right-leg')} d="M${46 - thighW / 2} 6 C${46 - thighW / 3} 0 ${46 + thighW / 3} 0 ${46 + thighW / 2} 6 L${46 + ankleW / 2} 152 Q46 163 ${46 - ankleW / 2} 152Z" fill="${legFill}" stroke="${darken(legFill, .18)}" stroke-width="2"/>
            <path ${roleAttr('hip-seat thigh-top nonpremium-hip-connector')} d="M${46 - thighW / 2 + 1} 8 C${46 - thighW / 4} 2 ${46 + thighW / 4} 2 ${46 + thighW / 2 - 1} 8 C${46 + thighW / 3} 19 ${46 - thighW / 3} 19 ${46 - thighW / 2 + 1} 8Z" fill="${lighten(legFill, .10)}" opacity=".18"/>
            ${!isSkirt ? `<path ${roleAttr('trouser-crease')} d="M46 14 Q42 72 45 146" stroke="${lighten(trouser, .16)}" stroke-width="2" opacity=".55"/>` : ''}
            <path ${roleAttr('footwear')} d="M26 151 L62 151 L72 177 Q48 188 19 177 Z" fill="${shoe}" stroke="${darken(shoe, .22)}" stroke-width="2"/>
            <path d="M28 170 H69" stroke="${lighten(shoe, .2)}" stroke-width="2" opacity=".55"/>`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_ART_PROFILE.parts.leg.width, height: SVG_AFRICAN_FRONT_ART_PROFILE.parts.leg.height, body, namespace: ns });
    }

    function renderHeadwearV3(config) {
        const colors = outfitColors(config);
        const primary = colors.primary || '#243b64';
        const accent = colors.accent || '#d8a23a';
        if (config.headwear === 'gele') {
            return `<g ${roleAttr('headwear')}><path d="M3 58 C3 28 24 5 55 5 C88 7 101 31 96 61 C80 49 27 48 3 58Z" fill="${primary}" stroke="${darken(primary, .22)}" stroke-width="2.5"/><path d="M10 52 C30 32 72 20 98 39" fill="none" stroke="${accent}" stroke-width="3.6" stroke-linecap="round"/><path d="M15 40 C39 55 67 55 92 40" fill="none" stroke="${lighten(primary, .25)}" stroke-width="2.2" opacity=".8" stroke-linecap="round"/></g>`;
        }
        if (config.headwear === 'turban' || config.headwear === 'duku' || config.headwear === 'wrapped-gele') {
            return `<g ${roleAttr('headwear')}><path d="M10 50 C10 28 27 12 53 11 C81 12 95 29 93 52 C76 45 31 45 10 50Z" fill="${primary}" stroke="${darken(primary, .22)}" stroke-width="2.4"/><path d="M18 47 C33 41 71 41 89 47" fill="none" stroke="${darken(primary, .16)}" stroke-width="6" opacity=".55" stroke-linecap="round"/><path d="M28 20 Q51 52 77 20" fill="none" stroke="${accent}" stroke-width="3.2" stroke-linecap="round"/><path d="M13 43 Q49 30 94 47" fill="none" stroke="${lighten(primary, .20)}" stroke-width="2.2" stroke-linecap="round"/></g>`;
        }
        if (config.headwear === 'fila' || config.headwear === 'cap') {
            return `<g ${roleAttr('headwear')}><path d="M17 47 C22 27 36 16 55 17 C74 18 87 30 90 49 C73 45 34 44 17 47Z" fill="${primary}" stroke="${darken(primary, .24)}" stroke-width="2.4"/><path d="M28 28 Q53 15 86 32" fill="${darken(primary, .10)}" opacity=".55"/><path d="M21 43 C38 37 70 38 87 44" fill="none" stroke="${accent}" stroke-width="2.4" stroke-linecap="round"/></g>`;
        }
        if (config.headwear === 'nurse-cap') {
            return `<g ${roleAttr('headwear')}><path d="M27 31 Q54 15 81 31 L77 47 Q55 39 31 47Z" fill="#f8fbff" stroke="#7c8a96" stroke-width="2"/><path d="M54 26 v14 M48 33 h12" stroke="#c0282d" stroke-width="2.6"/></g>`;
        }
        return '';
    }

    function renderBraidedPlaitsV3(paths, hair, options = {}) {
        const normalizedPaths = Array.isArray(paths) ? paths.filter(Boolean) : [];
        if (!normalizedPaths.length) return '';
        const width = Number.isFinite(Number(options.width)) ? Number(options.width) : 4.8;
        const base = normalizedPaths.map(d => `<path d="${d}"/>`).join('');
        const detail = normalizedPaths.map(d => `<path d="${d}"/>`).join('');
        return `<g ${roleAttr(options.role || 'braid-plaits individual-braids segmented-braids')} fill="none" stroke="${hair}" stroke-width="${width.toFixed(2)}" stroke-linecap="round" stroke-linejoin="round">${base}</g><g ${roleAttr('braid-segments plait-pattern visible-braid-texture')} fill="none" stroke="${lighten(hair, .34)}" stroke-width="${Math.max(1.2, width * .29).toFixed(2)}" stroke-dasharray="2.4 2.8" stroke-linecap="round" opacity=".74">${detail}</g>`;
    }

    function renderHairBackV3(config) {
        if (config.headwear && config.headwear !== 'none') return '';
        const hair = hairColor(config);
        switch (config.hair) {
            case 'bald':
                return '';
            case 'afro':
            case 'afro-full':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><circle cx="18" cy="49" r="18"/><circle cx="31" cy="28" r="22"/><circle cx="54" cy="19" r="25"/><circle cx="77" cy="29" r="22"/><circle cx="90" cy="51" r="18"/><path d="M16 62 Q54 13 92 62 L86 83 Q54 49 22 83Z"/></g>`;
            case 'afro-short':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><circle cx="29" cy="35" r="15"/><circle cx="54" cy="25" r="18"/><circle cx="78" cy="36" r="15"/><path d="M18 58 Q54 22 90 58 Q72 43 54 43 Q36 43 18 58Z"/></g>`;
            case 'tapered-afro':
            case 'twist-out':
            case 'wash-and-go':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M10 63 C5 41 13 24 31 13 C43 4 67 4 80 15 C96 28 98 51 88 68 C73 53 28 53 10 63Z"/><circle cx="25" cy="38" r="7" opacity=".22"/><circle cx="54" cy="22" r="8" opacity=".18"/><circle cx="78" cy="41" r="7" opacity=".16"/></g>`;
            case 'afro-puff':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M12 59 C9 36 26 15 54 14 C80 15 96 37 91 60 C76 49 64 45 54 45 C40 45 26 49 12 59Z"/><circle cx="54" cy="10" r="24"/></g>`;
            case 'natural-bun':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><ellipse cx="54" cy="30" rx="34" ry="19"/><circle cx="54" cy="12" r="16"/><path d="M21 53 Q54 22 87 53 L80 78 Q54 47 28 78Z"/></g>`;
            case 'quiff':
            case 'pompadour':
            case 'faux-hawk':
            case 'spiky-top':
            case 'brush-up':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M12 61 C9 36 26 15 54 13 C80 14 95 36 91 62 C76 50 66 45 54 45 C40 45 27 50 12 61Z"/><path d="${config.hair === 'spiky-top' ? 'M16 43 L27 20 L35 38 L45 13 L55 37 L67 13 L75 38 L88 20 L92 45 C79 38 68 35 54 35 C39 35 27 38 16 43Z' : config.hair === 'faux-hawk' ? 'M24 43 C30 20 43 6 54 5 C66 8 80 22 84 45 C72 37 63 33 54 33 C44 33 35 37 24 43Z' : 'M16 43 C27 22 46 11 68 16 C81 19 90 30 92 44 C73 36 55 34 36 39 C27 42 21 43 16 43Z'}"/><path d="M28 34 C43 25 61 24 81 32" fill="none" stroke="${lighten(hair, .22)}" stroke-width="1.4" opacity=".22" stroke-linecap="round"/></g>`;
            case 'side-part':
            case 'comb-over':
            case 'textured-crop':
            case 'caesar':
            case 'angular-fringe':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M12 60 C9 36 26 15 54 13 C80 14 95 36 91 62 C76 50 66 45 54 45 C40 45 27 50 12 60Z"/><path d="${config.hair === 'angular-fringe' ? 'M17 40 C35 29 57 29 91 39 C74 41 52 44 31 48 C23 48 18 46 17 40Z' : 'M16 40 C29 33 43 31 54 32 C69 31 82 34 90 40 C77 39 66 38 54 38 C41 38 28 39 16 40Z'}"/><path d="M35 27 C47 34 62 37 80 39" fill="none" stroke="${lighten(hair, .24)}" stroke-width="1.4" opacity=".25" stroke-linecap="round"/></g>`;
            case 'pixie-cut':
            case 'bob':
            case 'round-bob':
            case 'side-part-bob':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="${config.hair === 'pixie-cut' ? 'M12 61 C8 37 26 15 54 13 C80 15 95 37 91 63 C76 51 66 46 54 46 C40 46 27 51 12 61Z' : 'M7 66 C2 39 18 15 46 8 C76 3 97 23 98 56 C97 80 90 104 78 116 C68 98 62 78 54 60 C45 78 33 100 21 116 C10 101 4 82 7 66Z'}"/><path d="M17 57 C12 78 16 101 30 121 M91 57 C96 78 92 101 78 121" fill="none" stroke="${hair}" stroke-width="${config.hair === 'pixie-cut' ? 4 : 7}" stroke-linecap="round"/><path d="M27 43 C39 32 54 28 73 31" fill="none" stroke="${lighten(hair, .22)}" stroke-width="1.35" opacity=".18" stroke-linecap="round"/></g>`;
            case 'shoulder-length':
            case 'long-straight':
            case 'long-waves':
            case 'side-swept-long':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M5 68 C0 39 17 14 47 7 C76 3 98 23 100 58 C101 94 91 130 76 148 C67 130 61 89 54 61 C46 89 38 130 25 148 C10 130 2 96 5 68Z"/><path d="${config.hair === 'side-swept-long' ? 'M13 41 C30 24 55 17 88 31 C73 43 50 49 24 50 C18 49 14 46 13 41Z' : 'M15 41 C28 33 41 30 54 30 C70 30 84 34 93 42 C80 40 67 39 54 39 C41 39 28 40 15 41Z'}"/><path d="M18 65 C30 86 24 106 34 128 M91 65 C78 86 84 106 72 128" fill="none" stroke="${lighten(hair, .22)}" stroke-width="1.8" opacity=".18" stroke-linecap="round"/></g>`;
            case 'ponytail':
            case 'low-ponytail':
            case 'updo':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M12 60 C9 36 26 15 54 13 C80 15 95 36 91 62 C77 51 66 46 54 46 C40 46 27 51 12 60Z"/>${config.hair === 'updo' ? '<circle cx="54" cy="13" r="16"/>' : config.hair === 'low-ponytail' ? `<path d="M54 62 C52 86 54 113 61 143" fill="none" stroke="${hair}" stroke-width="14" stroke-linecap="round"/>` : `<path d="M82 47 C106 66 104 99 83 126" fill="none" stroke="${hair}" stroke-width="13" stroke-linecap="round"/>`}</g>`;
            case 'side-braid':
            case 'single-braid':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M9 62 C6 36 24 12 54 10 C83 12 97 36 93 63 C78 50 66 45 54 45 C40 45 26 50 9 62Z"/><path d="${config.hair === 'single-braid' ? 'M54 56 C53 79 54 104 55 134' : 'M86 56 C101 76 98 103 80 133'}" fill="none" stroke="${hair}" stroke-width="8" stroke-linecap="round"/><path d="${config.hair === 'single-braid' ? 'M54 56 C53 79 54 104 55 134' : 'M86 56 C101 76 98 103 80 133'}" fill="none" stroke="${lighten(hair, .25)}" stroke-width="1.5" opacity=".2" stroke-dasharray="4 5" stroke-linecap="round"/></g>`;
            case 'bantu-knots':
                return `<g ${roleAttr('hair-back')} fill="${hair}"><path d="M14 58 C11 37 28 17 54 16 C78 17 94 38 89 59 C75 49 65 45 54 45 C40 45 27 49 14 58Z"/><circle cx="27" cy="25" r="9"/><circle cx="43" cy="12" r="9"/><circle cx="64" cy="12" r="9"/><circle cx="81" cy="26" r="9"/></g>`;
            case 'braids':
                return `<g ${roleAttr('hair-back braids braided-hair')} data-svg-african-hair-style="braids"><path ${roleAttr('hair-cap scalp-cover crown-cover braided-crown')} d="M10 63 C7 35 24 12 54 11 C84 13 101 36 97 64 C79 49 30 49 10 63Z" fill="${hair}"/><path ${roleAttr('braid-roots crown-partings visible-braid-texture')} d="M17 49 C26 31 39 18 53 12 M31 52 C39 30 47 18 54 12 M45 54 C50 31 53 18 54 12 M63 54 C59 31 56 18 55 12 M77 52 C70 30 62 18 55 12 M91 49 C82 31 69 18 55 12" fill="none" stroke="${lighten(hair, .34)}" stroke-width="1.4" opacity=".68" stroke-linecap="round"/>${renderBraidedPlaitsV3(['M11 58 C5 79 8 106 21 136', 'M21 59 C14 83 17 113 29 142', 'M32 61 C26 87 28 116 38 145', 'M97 58 C103 79 100 106 87 136', 'M87 59 C94 83 91 113 79 142', 'M76 61 C82 87 80 116 70 145'], hair, { width: 4.7, role: 'side-strands outside-face no-face-crossing braid-plaits individual-braids segmented-braids braids' })}</g>`;
            case 'box-braids':
            case 'fulani-braids':
                return `<g ${roleAttr(`hair-back ${config.hair} braided-hair`)} data-svg-african-hair-style="${config.hair}"><path ${roleAttr('hair-cap scalp-cover crown-cover braided-crown')} d="M10 63 C7 35 24 12 54 11 C84 13 101 36 97 64 C79 49 30 49 10 63Z" fill="${hair}"/><path ${roleAttr('braid-roots crown-partings visible-braid-texture')} d="M18 49 L31 30 M33 52 L43 21 M49 54 L53 12 M63 54 L57 13 M77 52 L68 24 M90 49 L77 34" fill="none" stroke="${lighten(hair, .34)}" stroke-width="1.35" opacity=".64" stroke-linecap="round"/>${renderBraidedPlaitsV3(['M13 58 C7 80 10 108 24 138', 'M26 60 C19 86 22 116 33 144', 'M95 58 C101 80 98 108 84 138', 'M82 60 C89 86 86 116 75 144'], hair, { width: config.hair === 'box-braids' ? 5.6 : 4.2, role: `side-strands outside-face no-face-crossing braid-plaits individual-braids segmented-braids ${config.hair}` })}</g>`;
            case 'twists':
                return `<g ${roleAttr('hair-back')}><path d="M12 62 C10 36 26 14 54 13 C82 15 98 36 95 62 C77 50 31 50 12 62Z" fill="${hair}"/><g ${roleAttr('side-strands outside-face no-face-crossing twists')} fill="none" stroke="${hair}" stroke-width="4.2" stroke-linecap="round"><path d="M15 58 C9 78 12 101 25 128"/><path d="M93 58 C99 78 96 101 83 128"/><path d="M25 61 C20 84 22 106 32 132"/><path d="M83 61 C88 84 86 106 76 132"/></g></g>`;
            case 'locs':
            case 'sisterlocks':
            case 'goddess-locs':
                return `<g ${roleAttr('hair-back')}><path d="M11 62 C8 34 25 12 54 12 C83 14 100 36 97 62 C79 49 30 49 11 62Z" fill="${hair}"/><g ${roleAttr('side-strands outside-face no-face-crossing locs')} fill="none" stroke="${hair}" stroke-width="5.2" stroke-linecap="round"><path d="M13 58 C6 82 12 112 26 137"/><path d="M95 58 C102 82 96 112 82 137"/><path d="M25 61 C19 88 22 114 34 137"/><path d="M83 61 C89 88 86 114 74 137"/></g></g>`;
            case 'cornrows':
                return `<g ${roleAttr('hair-back')} data-svg-african-hair-style="cornrows"><path d="M12 58 C9 35 25 14 54 13 C83 15 98 36 95 58 C78 47 30 47 12 58Z" fill="${hair}"/><path data-svg-african-role="cornrows crown-rows" d="M20 49 C29 28 40 17 53 13 M36 52 C43 29 49 17 54 13 M70 51 C64 29 59 17 55 13 M87 49 C79 28 68 17 55 13" fill="none" stroke="${lighten(hair, .28)}" stroke-width="1.2" opacity=".32" stroke-linecap="round"/></g>`;
            case 'flat-twist':
                return `<g ${roleAttr('hair-back')} data-svg-african-hair-style="flat-twist"><path d="M12 58 C9 35 25 14 54 13 C83 15 98 36 95 58 C78 47 30 47 12 58Z" fill="${hair}"/><path data-svg-african-role="flat-twist crown-rows" d="M19 49 C29 27 40 17 53 13 M34 52 C42 28 48 17 54 13 M73 52 C65 28 59 17 55 13 M89 49 C79 27 68 17 55 13" fill="none" stroke="${lighten(hair, .3)}" stroke-width="2" opacity=".42" stroke-linecap="round"/></g>`;
            case 'ghana-weaving':
                return `<g ${roleAttr('hair-back')} data-svg-african-hair-style="ghana-weaving"><path d="M12 58 C9 35 25 14 54 13 C83 15 98 36 95 58 C78 47 30 47 12 58Z" fill="${hair}"/><path ${roleAttr('ghana-weaving feed-in-rows')} d="M16 50 C25 28 37 17 53 13 M26 53 C34 29 43 17 54 13 M38 54 C44 30 50 18 54 13 M50 55 C52 31 54 19 54 13 M62 54 C60 30 57 18 55 13 M75 53 C68 29 61 17 55 13 M90 50 C81 28 69 17 55 13" fill="none" stroke="${lighten(hair, .34)}" stroke-width="2.5" opacity=".68" stroke-linecap="round"/><path ${roleAttr('ghana-weaving gathered-feed-in-braid outside-face no-face-crossing')} d="M91 54 C103 75 101 103 84 136" fill="none" stroke="${hair}" stroke-width="9" stroke-linecap="round"/><path d="M91 60 C98 78 97 101 84 133" fill="none" stroke="${lighten(hair, .3)}" stroke-width="1.6" stroke-dasharray="4 4" opacity=".46" stroke-linecap="round"/></g>`;
            case 'buzz-cut':
            case 'waves':
            case 'temple-fade':
            case 'fade':
            case 'low-cut':
            default:
                return `<g ${roleAttr('hair-back')}><path d="M12 58 C9 36 25 15 54 14 C83 16 98 36 95 58 C78 47 30 47 12 58Z" fill="${hair}"/></g>`;
        }
    }

    function renderHairFrontV3(config) {
        if (config.headwear && config.headwear !== 'none') return '';
        const hair = hairColor(config);
        switch (config.hair) {
            case 'bald':
                return '';
            case 'cornrows':
                return `<g ${roleAttr('hair-front')} data-svg-african-hair-style="cornrows"><path d="M12 58 C17 30 36 15 54 14 C73 15 91 31 96 58 C77 47 31 47 12 58Z" fill="${hair}"/><path ${roleAttr('hairline')} d="M20 56 C35 48 72 48 88 56" fill="none" stroke="${lighten(hair, .16)}" stroke-width="1.5" opacity=".18" stroke-linecap="round"/><g ${roleAttr('hair-detail cornrow-rows')} stroke="${lighten(hair, .26)}" stroke-width="1.05" opacity=".24"><path d="M31 30 Q40 34 43 44"/><path d="M44 23 Q50 31 51 44"/><path d="M64 23 Q58 31 57 44"/><path d="M77 30 Q68 34 65 44"/></g></g>`;
            case 'flat-twist':
                return `<g ${roleAttr('hair-front')} data-svg-african-hair-style="flat-twist"><path d="M12 58 C17 30 36 15 54 14 C73 15 91 31 96 58 C77 47 31 47 12 58Z" fill="${hair}"/><g ${roleAttr('hair-detail flat-twist-rows')} fill="none" stroke="${lighten(hair, .3)}" stroke-width="1.9" opacity=".42" stroke-linecap="round"><path d="M24 48 C32 31 42 21 53 14"/><path d="M39 50 C45 31 50 21 54 14"/><path d="M69 50 C63 31 58 21 55 14"/><path d="M84 48 C76 31 66 21 55 14"/></g></g>`;
            case 'ghana-weaving':
                return `<g ${roleAttr('hair-front')} data-svg-african-hair-style="ghana-weaving"><path d="M12 58 C17 30 36 15 54 14 C73 15 91 31 96 58 C77 47 31 47 12 58Z" fill="${hair}"/><g ${roleAttr('hair-detail ghana-weaving feed-in-rows')} fill="none" stroke="${lighten(hair, .34)}" stroke-width="2.25" opacity=".66" stroke-linecap="round"><path d="M19 49 C29 29 40 18 53 14"/><path d="M31 52 C39 29 47 18 54 14"/><path d="M43 53 C48 30 52 19 54 14"/><path d="M65 53 C60 30 56 19 55 14"/><path d="M77 52 C69 29 62 18 55 14"/><path d="M89 49 C79 29 68 18 55 14"/></g><path ${roleAttr('ghana-weaving feed-in-braid outside-face no-face-crossing')} d="M91 53 C102 74 100 102 83 132" fill="none" stroke="${hair}" stroke-width="8" stroke-linecap="round"/><path d="M91 59 C98 77 96 100 83 129" fill="none" stroke="${lighten(hair, .3)}" stroke-width="1.5" stroke-dasharray="4 4" opacity=".46" stroke-linecap="round"/></g>`;
            case 'braids':
            case 'box-braids':
            case 'fulani-braids':
                return `<g ${roleAttr(`hair-front ${config.hair} braided-hair`)} data-svg-african-hair-style="${config.hair}"><path ${roleAttr('braided-front-cap scalp-cover brow-clear raised-hairline')} d="M12 42 C24 32 39 28 54 28 C70 28 85 33 94 43 C81 40 68 38 54 38 C39 38 25 40 12 42Z" fill="${hair}"/><path ${roleAttr('braid-roots crown-partings visible-braid-texture')} d="M19 40 C29 34 41 30 53 29 M32 42 C40 35 47 30 54 29 M46 43 C51 35 53 30 54 29 M62 43 C59 35 56 30 55 29 M76 42 C69 35 62 30 55 29 M89 40 C79 34 67 30 55 29" fill="none" stroke="${lighten(hair, .34)}" stroke-width="1.3" opacity=".7" stroke-linecap="round"/>${renderBraidedPlaitsV3(config.hair === 'braids' ? ['M14 53 C8 73 11 99 23 128', 'M23 56 C17 79 19 106 30 135', 'M94 53 C100 73 97 99 85 128', 'M85 56 C91 79 89 106 78 135'] : ['M15 54 C9 74 12 99 24 126', 'M93 54 C99 74 96 99 84 126'], hair, { width: config.hair === 'box-braids' ? 5.2 : 4.2, role: `hair-front-side-locks outside-face no-face-crossing braid-plaits individual-braids segmented-braids ${config.hair}` })}</g>`;
            case 'twists':
            case 'locs':
            case 'sisterlocks':
            case 'goddess-locs':
                return `<g ${roleAttr('hair-front')}><path d="M13 58 C19 31 37 15 54 14 C73 15 90 31 95 58 C77 47 31 47 13 58Z" fill="${hair}"/><path ${roleAttr('hairline')} d="M26 56 C40 49 68 49 82 56" fill="none" stroke="${lighten(hair, .14)}" stroke-width="1.4" opacity=".15" stroke-linecap="round"/><g ${roleAttr('side-strands outside-face no-face-crossing')} fill="none" stroke="${hair}" stroke-width="4.2" stroke-linecap="round"><path d="M14 58 C9 76 11 95 22 112"/><path d="M94 58 C99 76 97 95 86 112"/></g></g>`;
            case 'afro':
            case 'afro-full':
            case 'afro-short':
            case 'tapered-afro':
            case 'twist-out':
            case 'wash-and-go':
            case 'afro-puff':
            case 'natural-bun':
                return `<path ${roleAttr('hair-front')} d="M12 58 C23 31 39 18 54 18 C71 18 86 31 96 58 C78 47 30 47 12 58Z" fill="${hair}"/>`;
            case 'quiff':
            case 'pompadour':
            case 'faux-hawk':
            case 'spiky-top':
            case 'brush-up':
                return `<g ${roleAttr('hair-front')}><path d="${config.hair === 'spiky-top' ? 'M16 40 L27 24 L35 38 L45 20 L54 37 L66 20 L74 38 L88 24 L92 41 C78 37 67 35 54 35 C40 35 28 37 16 40Z' : config.hair === 'faux-hawk' ? 'M24 40 C31 25 44 18 54 17 C64 18 76 25 84 40 C72 36 63 34 54 34 C45 34 36 36 24 40Z' : 'M16 41 C28 29 48 24 76 29 C68 36 49 40 25 43 C20 43 17 42 16 41Z'}" fill="${hair}"/><path d="M29 35 C45 29 63 28 82 34" fill="none" stroke="${lighten(hair, .22)}" stroke-width="1.15" opacity=".18" stroke-linecap="round"/></g>`;
            case 'side-part':
            case 'comb-over':
            case 'textured-crop':
            case 'caesar':
            case 'angular-fringe':
                return `<g ${roleAttr('hair-front')}><path d="${config.hair === 'angular-fringe' ? 'M15 40 C33 31 55 31 90 39 C73 41 52 44 30 47 C22 48 16 46 15 40Z' : 'M16 39 C28 33 42 31 54 32 C69 31 82 34 91 39 C78 38 67 37 54 37 C41 37 28 38 16 39Z'}" fill="${hair}"/><path d="M35 29 C47 34 62 37 80 38" fill="none" stroke="${lighten(hair, .24)}" stroke-width="1.15" opacity=".22" stroke-linecap="round"/></g>`;
            case 'pixie-cut':
            case 'bob':
            case 'round-bob':
            case 'side-part-bob':
                return `<g ${roleAttr('hair-front')}><path d="${config.hair === 'side-part-bob' ? 'M14 40 C31 26 57 24 90 39 C72 39 53 42 32 47 C23 49 17 46 14 40Z' : 'M15 40 C27 33 40 31 54 31 C70 31 84 34 92 41 C80 40 67 38 54 38 C40 38 28 39 15 40Z'}" fill="${hair}"/><path d="M17 52 C12 75 16 99 31 118 M91 52 C96 75 92 99 77 118" fill="none" stroke="${hair}" stroke-width="${config.hair === 'pixie-cut' ? 4.4 : 7}" stroke-linecap="round"/></g>`;
            case 'shoulder-length':
            case 'long-straight':
            case 'long-waves':
            case 'side-swept-long':
                return `<g ${roleAttr('hair-front')}><path d="${config.hair === 'side-swept-long' ? 'M13 40 C30 23 56 16 91 31 C76 42 51 48 25 50 C19 49 15 46 13 40Z' : 'M15 40 C28 32 41 30 54 30 C70 30 84 33 93 41 C80 39 67 38 54 38 C40 38 28 39 15 40Z'}" fill="${hair}"/><path d="M13 57 C9 78 13 104 27 131 M94 57 C99 78 95 104 80 131" fill="none" stroke="${hair}" stroke-width="6.8" stroke-linecap="round"/></g>`;
            case 'ponytail':
            case 'low-ponytail':
            case 'updo':
                return `<g ${roleAttr('hair-front')}><path d="M16 39 C28 33 41 31 54 31 C69 31 82 33 91 39 C80 38 67 37 54 37 C41 37 28 38 16 39Z" fill="${hair}"/>${config.hair === 'updo' ? `<circle cx="54" cy="23" r="10" fill="${hair}"/>` : ''}</g>`;
            case 'side-braid':
            case 'single-braid':
                return `<g ${roleAttr('hair-front')}><path d="M14 40 C28 31 43 28 61 31 C54 37 41 41 25 42 C20 42 16 41 14 40Z" fill="${hair}"/><path d="M65 31 C80 34 89 42 90 53 C82 48 73 41 60 36Z" fill="${hair}"/><path d="${config.hair === 'single-braid' ? 'M86 56 C96 76 93 101 78 127' : 'M88 55 C98 76 94 101 77 126'}" fill="none" stroke="${hair}" stroke-width="6.8" stroke-linecap="round"/></g>`;
            case 'bantu-knots':
                return `<g ${roleAttr('hair-front')}><path d="M17 40 C28 34 40 32 54 32 C68 32 80 34 90 40 C78 39 67 38 54 38 C41 38 28 39 17 40Z" fill="${hair}"/><circle cx="27" cy="31" r="5.5" fill="${hair}"/><circle cx="43" cy="24" r="5.5" fill="${hair}"/><circle cx="64" cy="24" r="5.5" fill="${hair}"/><circle cx="81" cy="31" r="5.5" fill="${hair}"/></g>`;
            case 'buzz-cut':
            case 'waves':
            case 'temple-fade':
            case 'fade':
            case 'low-cut':
            default:
                return `<g ${roleAttr('hair-front')}><path d="M18 55 C23 27 39 17 54 16 C72 17 86 28 90 55 Q72 41 54 41 Q36 41 18 55Z" fill="${hair}" opacity=".97"/><path ${roleAttr('hairline')} d="M22 55 Q54 36 86 55" fill="none" stroke="${lighten(hair, .16)}" stroke-width="1.5" opacity=".30"/></g>`;
        }
    }

    function renderHeadV3(config, ns) {
        const C = getCatalog();
        const skin = C.skinColor(config);
        const shadow = darken(skin, .17);
        const highlight = lighten(skin, .14);
        const face = faceSpec(config);
        const rx = Math.max(32, Math.min(38, Math.round((face.rx || 34) * .99)));
        const ry = Math.max(40, Math.min(46, Math.round((face.ry || 42) * 1.02)));
        const eyeShape = config.eyes === 'round' ? 'round' : 'almond';
        const lipW = config.lips === 'full' ? 29 : config.lips === 'subtle' ? 21 : 25;
        const lipH = config.lips === 'full' ? 6.2 : 4.6;
        const faceTop = 18;
        const faceBottom = 118;
        const faceLeft = 54 - rx;
        const faceRight = 54 + rx;
        const chinLeft = 54 - rx * .46;
        const chinRight = 54 + rx * .46;
        const cheekY = 67;
        const jawY = 104;
        const neckLeft = 42;
        const neckRight = 66;
        const neckBaseLeft = 39;
        const neckBaseRight = 69;
        const neckBaseY = 142;
        const neckJoinY = 111;
        const faceNeckPath = `M54 ${faceTop} C${faceRight - 7} ${faceTop} ${faceRight + 2} 37 ${faceRight} ${cheekY} C${faceRight - 1} 88 ${chinRight} ${jawY} ${neckRight} ${neckJoinY} C64 122 66 134 ${neckBaseRight} ${neckBaseY} C62 146 46 146 ${neckBaseLeft} ${neckBaseY} C42 134 44 122 ${neckLeft} ${neckJoinY} C${chinLeft} ${jawY} ${faceLeft + 1} 88 ${faceLeft} ${cheekY} C${faceLeft - 2} 37 ${faceLeft + 7} ${faceTop} 54 ${faceTop}Z`;
        const defs = `<linearGradient id="faceSkinGrad" x1="22" y1="18" x2="86" y2="142" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${lighten(skin, .06)}"/><stop offset=".62" stop-color="${skin}"/><stop offset="1" stop-color="${darken(skin, .06)}"/></linearGradient>`;
        const body = `
            ${renderHairBackV3(config)}
            <g ${roleAttr('ears')} fill="${skin}"><ellipse cx="20" cy="62" rx="6.8" ry="12"/><ellipse cx="88" cy="62" rx="6.8" ry="12"/><path d="M18 62 q6 3 1 10 M90 62 q-6 3 -1 10" stroke="${shadow}" stroke-width="1.45" fill="none" opacity=".38"/></g>
            <g ${roleAttr('face')}><path id="face-neck" data-svg-african-role="face neck skin single-piece-neck smooth-neck-margin" d="${faceNeckPath}" fill="url(#faceSkinGrad)"/><ellipse cx="43" cy="48" rx="15" ry="21" fill="${highlight}" opacity=".10"/><path d="M31 82 Q39 101 54 113 Q69 101 77 82" fill="none" stroke="${darken(skin, .10)}" stroke-width=".9" stroke-linecap="round" opacity=".055"/><path d="M31 73 Q39 88 50 91 M77 73 Q69 88 58 91" stroke="${darken(skin, .12)}" stroke-width=".9" fill="none" opacity=".045"/></g>
            ${renderFemaleBrowClearLayer(renderHairFrontV3(config), config, { rendererVersion: 3, scaleY: 0.86 })}
            ${renderFemaleBrowClearLayer(renderHeadwearV3(config), config, { rendererVersion: 3, scaleY: 0.84 })}
            <g ${roleAttr('brows')} stroke="#251813" stroke-width="3.1" stroke-linecap="round"><path id="brow-left" d="M34 53 Q42 49 49 52"/><path id="brow-right" d="M60 52 Q68 49 76 53"/></g>
            <g ${roleAttr('eyes')}>${eyeShape === 'round'
                ? '<ellipse id="eye-left" cx="42" cy="62" rx="7" ry="6.2" fill="#fff"/><ellipse id="eye-right" cx="67" cy="62" rx="7" ry="6.2" fill="#fff"/>'
                : '<path id="eye-left" d="M33 62 Q42 56 51 62 Q42 68 33 62Z" fill="#fff"/><path id="eye-right" d="M58 62 Q67 56 76 62 Q67 68 58 62Z" fill="#fff"/>'}<circle id="pupil-left" cx="42" cy="62" r="3.2" fill="#231815"/><circle id="pupil-right" cx="67" cy="62" r="3.2" fill="#231815"/><circle cx="40.8" cy="60.8" r="1" fill="#fff" opacity=".82"/><circle cx="65.8" cy="60.8" r="1" fill="#fff" opacity=".82"/><path d="M33 61 Q42 55 51 61 M58 61 Q67 55 76 61" stroke="#251813" stroke-width="1.1" fill="none" opacity=".45"/><path d="M35 66 Q42 70 49 66 M60 66 Q67 70 74 66" stroke="${darken(skin, .18)}" stroke-width="1" fill="none" opacity=".30"/></g>
            <g ${roleAttr('nose')}><path d="${config.nose === 'broad' ? 'M54 60 Q47 75 44 81 Q54 86 64 81 Q61 74 54 60Z' : config.nose === 'narrow' ? 'M54 60 Q52 74 49 80 Q54 84 60 80 Q57 74 54 60Z' : 'M54 60 Q50 75 47 80 Q54 85 61 80 Q58 74 54 60Z'}" fill="${shadow}" opacity=".24"/><path d="M55 62 Q53 71 54 79" stroke="${highlight}" stroke-width="1.1" fill="none" opacity=".36"/><path d="M48 80 Q54 84 61 80" stroke="${darken(skin, .28)}" stroke-width="1.25" fill="none" opacity=".43"/><ellipse cx="49" cy="81" rx="1.7" ry="1" fill="${darken(skin, .32)}" opacity=".34"/><ellipse cx="60" cy="81" rx="1.7" ry="1" fill="${darken(skin, .32)}" opacity=".34"/></g>
            <g ${roleAttr('mouth')}><path id="mouth-upper" d="M${54 - lipW / 2} 93 Q54 ${93 - lipH} ${54 + lipW / 2} 93 Q54 ${93 + lipH * .32} ${54 - lipW / 2} 93Z" fill="#773029" opacity=".92"/><path id="mouth-lower" d="M${54 - lipW / 2 + 2} 95 Q54 ${95 + lipH} ${54 + lipW / 2 - 2} 95 Q54 ${98 + lipH * .25} ${54 - lipW / 2 + 2} 95Z" fill="#9a463c" opacity=".88"/><path d="M${54 - lipW / 2 + 5} 94 Q54 97 ${54 + lipW / 2 - 5} 94" stroke="${lighten('#773029', .22)}" stroke-width="1" fill="none" opacity=".45"/><path d="M${54 - lipW / 2 + 5} 97 Q54 101 ${54 + lipW / 2 - 5} 97" stroke="${lighten('#9a463c', .24)}" stroke-width=".9" fill="none" opacity=".38"/></g>
            ${facialHairSvgV3(config)}
            ${headAccessoriesSvgV3(config)}`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts['head-neck'].width, height: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts['head-neck'].height, body, defs, namespace: ns });
    }

    function renderPrintMotifsV3(colors, wide = false) {
        const accent = colors.accent || '#d8a23a';
        return `<g ${roleAttr('fabric-pattern')} opacity=".78" fill="none" stroke="${accent}" stroke-width="${wide ? 4 : 2.6}"><path d="M27 66 C58 36 105 38 146 70"/><path d="M24 128 C64 92 126 96 167 134"/><circle cx="61" cy="94" r="13"/><circle cx="128" cy="168" r="16"/><path d="M93 50 L135 92 M135 50 L93 92"/></g>`;
    }

    function renderTorsoV3(config, ns) {
        const colors = outfitColors(config);
        const bodyType = bodySpec(config);
        const primary = colors.primary || '#334155';
        const secondary = colors.secondary || darken(primary, .24);
        const accent = colors.accent || '#d8a23a';
        const outfitKey = outfitId(config);
        const isFemale = presentationId(config) !== 'male';
        const hasSkirtOrWrapper = usesSkirtOrWrapper(config);
        const torsoScale = Math.max(.92, Math.min(1.08, bodyType.torsoScale || 1));
        const shoulderScale = Math.max(.94, Math.min(1.08, bodyType.shoulderScale || torsoScale));
        const shoulderHalf = 63 * shoulderScale;
        const waistHalf = (isFemale ? 46 : 51) * torsoScale;
        const hipHalf = (isFemale ? 62 : 56) * torsoScale;
        const leftShoulder = 95 - shoulderHalf;
        const rightShoulder = 95 + shoulderHalf;
        let base = `<path ${roleAttr('torso-clothing')} d="M${leftShoulder} 43 C${leftShoulder + 11} 22 ${95 - 34} 12 95 14 C${95 + 34} 12 ${rightShoulder - 11} 22 ${rightShoulder} 43 C${rightShoulder - 5} 84 ${95 + waistHalf + 3} 137 ${95 + waistHalf} 173 Q95 210 ${95 + hipHalf} 225 L${95 + hipHalf - 13} 255 Q95 266 ${95 - hipHalf + 13} 255 L${95 - hipHalf} 225 Q95 210 ${95 - waistHalf} 173 C${95 - waistHalf - 3} 137 ${leftShoulder + 5} 84 ${leftShoulder} 43Z" fill="${primary}" stroke="${secondary}" stroke-width="3"/><path ${roleAttr('neck-seat nonpremium-neck-connector')} d="M68 20 Q95 39 122 20 L115 49 Q95 61 75 49Z" fill="${darken(primary, .08)}" opacity=".36"/><path ${roleAttr('shoulder-soft-shadow')} d="M${leftShoulder + 10} 45 C48 42 61 45 70 58 M${rightShoulder - 10} 45 C142 42 129 45 120 58" stroke="${darken(primary, .15)}" stroke-width="4" fill="none" opacity=".12"/><path ${roleAttr('shoulder-seam')} d="M${leftShoulder + 12} 45 Q51 50 61 63 M${rightShoulder - 12} 45 Q139 50 129 63" stroke="${lighten(primary, .18)}" stroke-width="1.6" fill="none" opacity=".22"/><g ${roleAttr('shoulder-root-overlap nonpremium-shoulder-connector')} opacity=".20" fill="none" stroke="${lighten(primary, .16)}" stroke-width="7" stroke-linecap="round"><path d="M${leftShoulder + 10} 47 C${leftShoulder + 25} 35 ${leftShoulder + 44} 40 ${leftShoulder + 58} 58"/><path d="M${rightShoulder - 10} 47 C${rightShoulder - 25} 35 ${rightShoulder - 44} 40 ${rightShoulder - 58} 58"/></g><path ${roleAttr('collar-overlap')} d="M70 18 Q95 34 120 18 L113 42 Q95 54 77 42Z" fill="${primary}" opacity=".98"/>`;
        if (isFemale) {
            base += `<path ${roleAttr('bust-drape')} d="M57 80 Q72 67 91 80 Q109 67 125 80 Q119 101 92 103 Q65 101 57 80Z" fill="${lighten(primary, .12)}" opacity=".22"/><path d="M67 91 Q77 84 88 92 M101 92 Q113 84 123 91" stroke="${darken(primary, .12)}" stroke-width="2" fill="none" opacity=".18"/>`;
        }
        let outfit = '';
        if (outfitKey === 'business-suit' || outfitKey === 'lecturer') {
            outfit += `<g ${roleAttr('jacket')}><path d="M42 30 L80 130 L61 148 L27 42Z" fill="${darken(primary, .08)}"/><path d="M148 30 L110 130 L129 148 L163 42Z" fill="${darken(primary, .08)}"/><path d="M76 24 L95 96 L114 24 L111 205 L79 205Z" fill="#eef4fa"/><path d="M89 52 H101 L106 165 L95 192 L84 165Z" fill="${accent}"/><path d="M53 206 H137" stroke="${secondary}" stroke-width="3.2"/></g>`;
        } else if (outfitKey === 'doctor' || outfitKey === 'lab-coat') {
            outfit += `<g ${roleAttr('clinical-coat')}><path d="M33 30 L79 126 L91 42 L91 246 L37 232Z" fill="#f7fbff" stroke="#d0d9df" stroke-width="2.3"/><path d="M157 30 L111 126 L99 42 L99 246 L153 232Z" fill="#f7fbff" stroke="#d0d9df" stroke-width="2.3"/><path d="M77 42 L95 78 L113 42" fill="none" stroke="#82909b" stroke-width="2.5"/></g>`;
        } else if (outfitKey === 'medical-scrubs' || outfitKey === 'nurse') {
            outfit += `<g ${roleAttr('scrubs')}><path d="M61 29 L95 76 L129 29" fill="none" stroke="${lighten(primary, .30)}" stroke-width="6"/><path d="M42 92 H68 M122 92 H148" stroke="${darken(primary, .18)}" stroke-width="3"/></g>`;
        } else if (/ankara/i.test(outfitKey || '')) {
            outfit += renderPrintMotifsV3(colors, false);
            if (outfitKey === 'ankara-peplum' && hasSkirtOrWrapper) outfit += `<path ${roleAttr('peplum')} d="M24 170 Q95 224 166 170 L174 255 Q95 275 16 255Z" fill="${primary}" stroke="${accent}" stroke-width="3.2" opacity=".96"/>`;
        } else if (/agbada|baban-riga|academic-robe/i.test(outfitKey || '')) {
            outfit += `<g ${roleAttr('wide-garment')}><path d="M8 29 Q95 -9 182 29 L188 238 Q95 276 2 238Z" fill="${primary}" opacity=".93" stroke="${secondary}" stroke-width="3.4"/><path d="M49 31 Q95 107 141 31" fill="none" stroke="${accent}" stroke-width="6"/><path d="M95 41 L95 236" stroke="${accent}" stroke-width="3.3" opacity=".85"/></g>${renderPrintMotifsV3(colors, true)}`;
        } else if (hasSkirtOrWrapper && (outfitKey === 'iro-buba' || outfitKey === 'george-wrapper' || outfitKey === 'corporate-dress')) {
            outfit += `<g ${roleAttr('wrapper-dress')}><path d="M39 92 Q95 69 151 92 L169 254 Q95 274 21 254Z" fill="${darken(primary, .07)}" opacity=".95"/><path d="M50 40 Q95 62 140 40" stroke="${accent}" stroke-width="5.5" fill="none"/></g>${renderPrintMotifsV3(colors, false)}`;
        } else {
            outfit += `<g ${roleAttr('casual-top')}><path d="M61 34 L95 69 L129 34" fill="none" stroke="${lighten(primary, .28)}" stroke-width="5"/><path d="M45 206 H145" stroke="${secondary}" stroke-width="3.2"/></g>`;
        }
        let accessories = torsoAccessoriesSvg(config);
        if (hasAccessory(config, 'id-badge')) accessories += `<g ${roleAttr('id-badge')}><rect x="128" y="78" width="26" height="32" rx="3" fill="#f7fafc" stroke="#34434a" stroke-width="1.6"/><path d="M134 87 H148 M133 97 H151" stroke="#34434a" stroke-width="1.4"/></g>`;
        if (hasAccessory(config, 'stethoscope')) accessories += `<g ${roleAttr('stethoscope')} stroke="#26343f" stroke-width="3.5" fill="none"><path d="M61 41 Q54 114 84 145"/><path d="M129 41 Q136 114 106 145"/><path d="M84 145 Q95 164 106 145"/><circle cx="95" cy="185" r="8" fill="#26343f"/></g>`;
        if (hasAccessory(config, 'beads')) accessories += `<g ${roleAttr('beads')} fill="#d97d36"><circle cx="61" cy="46" r="5"/><circle cx="76" cy="55" r="5"/><circle cx="95" cy="61" r="6"/><circle cx="114" cy="55" r="5"/><circle cx="129" cy="46" r="5"/></g>`;
        const body = `${base}<path ${roleAttr('hip-seat nonpremium-hip-connector')} d="M${95 - hipHalf - 3} 196 Q95 224 ${95 + hipHalf + 3} 196 L${95 + hipHalf - 12} 246 Q95 262 ${95 - hipHalf + 12} 246Z" fill="${darken(primary, .05)}" opacity=".44"/><path ${roleAttr('hip-line')} d="M${95 - hipHalf} 202 Q95 224 ${95 + hipHalf} 202 L${95 + hipHalf - 10} 252 Q95 266 ${95 - hipHalf + 10} 252Z" fill="${primary}" opacity=".82"/>${outfit}${accessories}`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts.torso.width, height: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts.torso.height, body, namespace: ns });
    }

    function renderArmV3(config, ns, partKey) {
        const C = getCatalog();
        const skin = C.skinColor(config);
        const colors = outfitColors(config);
        const primary = colors.primary || '#334155';
        const secondary = darken(colors.secondary || primary, .12);
        const isLeft = /^left/.test(partKey || '');
        const transform = isLeft ? ' transform="translate(72 0) scale(-1 1)"' : '';
        const patterned = /ankara|agbada|baban-riga|iro-buba|george-wrapper/i.test(config.outfit || '')
            ? `<g ${roleAttr('sleeve-pattern')} opacity=".72" stroke="${colors.accent || '#d8a23a'}" stroke-width="2.2"><path d="M22 51 L52 86"/><path d="M56 50 L24 91"/><circle cx="38" cy="71" r="9" fill="none"/></g>`
            : '';
        const watch = hasAccessory(config, 'watch') && !isLeft ? `<rect ${roleAttr('watch')} x="31" y="218" width="24" height="7" rx="3.5" fill="#1f2933"/>` : '';
        const body = `<g${transform}>
            <path ${roleAttr(isLeft ? 'left-sleeve' : 'right-sleeve')} d="M13 17 C22 3 50 1 61 16 C64 47 61 88 57 126 C54 155 51 175 47 184 Q38 193 28 184 C23 163 19 134 17 101 C15 66 11 35 13 17Z" fill="${primary}" stroke="${secondary}" stroke-width="2.7"/>
            <path ${roleAttr('shoulder-cap')} d="M15 20 C27 10 48 10 59 20 C55 31 45 36 36 35 C27 35 20 30 15 20Z" fill="${lighten(primary, .12)}" opacity=".16"/>
            <path ${roleAttr('shoulder-root-overlap nonpremium-shoulder-connector')} d="M10 15 C23 0 51 -2 64 14 C64 28 52 40 37 40 C23 40 12 29 10 15Z" fill="${lighten(primary, .10)}" opacity=".18"/>
            <path ${roleAttr('sleeve-shadow')} d="M23 31 C30 61 31 136 28 175" stroke="${darken(primary, .18)}" stroke-width="1.8" fill="none" opacity=".16"/>
            ${patterned}
            <path ${roleAttr(isLeft ? 'left-forearm' : 'right-forearm')} d="M27 178 Q38 171 49 178 C50 200 48 222 44 239 Q38 247 31 239 C28 222 26 200 27 178Z" fill="${skin}" stroke="${darken(skin, .18)}" stroke-width="1.7"/>
            ${watch}
            <path ${roleAttr(isLeft ? 'left-hand' : 'right-hand')} d="M29 237 Q38 229 49 237 C56 243 57 255 53 266 C49 279 39 286 28 278 C20 271 18 259 21 249 C23 243 25 240 29 237Z" fill="${skin}" stroke="${darken(skin, .20)}" stroke-width="1.65"/>
            <path ${roleAttr('thumb')} d="M24 253 Q17 257 18 267" stroke="${darken(skin, .22)}" stroke-width="2.1" stroke-linecap="round" fill="none" opacity=".62"/>
            <path d="M30 269 Q33 281 38 269 M42 268 Q50 274 51 262 M26 241 Q32 246 38 243" stroke="${darken(skin, .24)}" stroke-width="1.45" stroke-linecap="round" fill="none" opacity=".56"/>
        </g>`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts.arm.width, height: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts.arm.height, body, namespace: ns });
    }

    function renderLegV3(config, ns, partKey) {
        const colors = outfitColors(config);
        const trouser = colors.trouser || colors.secondary || '#1f2937';
        const skin = getCatalog().skinColor(config);
        const shoe = config.footwear === 'sneakers' ? '#f4f7fb' : config.footwear === 'sandals' ? '#7a4b30' : config.footwear === 'clinical' ? '#ffffff' : '#211d1c';
        const isSkirt = usesSkirtOrWrapper(config);
        const legFill = isSkirt ? skin : trouser;
        const isLeft = /^left/.test(partKey || '');
        const transform = isLeft ? ' transform="translate(78 0) scale(-1 1)"' : '';
        const crease = !isSkirt ? `<path ${roleAttr('trouser-crease')} d="M39 18 Q32 126 38 253" stroke="${lighten(trouser, .16)}" stroke-width="2.2" opacity=".5"/>` : '';
        const body = `<g${transform}>
            <path ${roleAttr(isLeft ? 'left-leg' : 'right-leg')} d="M7 8 C20 -3 58 -3 71 8 C68 94 59 174 50 264 Q39 278 27 264 C18 174 10 94 7 8Z" fill="${legFill}" stroke="${darken(legFill, .18)}" stroke-width="2.4"/>
            <path ${roleAttr('thigh-top')} d="M11 12 C24 6 55 6 68 12 C61 24 50 31 39 31 C28 31 18 24 11 12Z" fill="${lighten(legFill, .10)}" opacity=".16"/>
            <path ${roleAttr('hip-seat nonpremium-hip-connector')} d="M9 10 C23 2 55 2 69 10 C64 26 52 36 39 36 C26 36 14 26 9 10Z" fill="${lighten(legFill, .08)}" opacity=".14"/>
            ${crease}
            <path ${roleAttr('footwear')} d="M27 262 Q41 259 52 266 L71 323 Q50 340 11 326 L15 294 Q19 273 27 262Z" fill="${shoe}" stroke="${darken(shoe, .22)}" stroke-width="2.4"/>
            <path d="M18 318 Q41 328 68 319" stroke="${lighten(shoe, .22)}" stroke-width="2.2" fill="none" opacity=".58"/>
        </g>`;
        return svgWrap({ width: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts.leg.width, height: SVG_AFRICAN_FRONT_BODY_PROFILE_V3.parts.leg.height, body, namespace: ns });
    }

    class SvgAfricanCharacterRenderer {
        static renderPart(partKey, config, instanceId) {
            const svg = this.renderBasePart(partKey, config, instanceId);
            return globalThis.SvgAfricanJewelry?.apply(svg, partKey, config, { basic: true }) || svg;
        }

        static renderBasePart(partKey, config, instanceId) {
            const ns = `${instanceId}-${partKey}`;
            const rendererVersion = Number(config?.rendererVersion ?? 3);
            if (rendererVersion >= 3) {
                if (partKey === 'head-neck' || partKey === 'head') return renderHeadV3(config, ns);
                if (partKey === 'torso') return renderTorsoV3(config, ns);
                if (/arm$/.test(partKey)) return renderArmV3(config, ns, partKey);
                if (/leg$/.test(partKey)) return renderLegV3(config, ns, partKey);
            }
            const useV2 = rendererVersion >= 2;
            if (useV2) {
                if (partKey === 'head-neck' || partKey === 'head') return renderHeadV2(config, ns);
                if (partKey === 'torso') return renderTorsoV2(config, ns);
                if (/arm$/.test(partKey)) return renderArmV2(config, ns, partKey);
                if (/leg$/.test(partKey)) return renderLegV2(config, ns, partKey);
            }
            if (partKey === 'head-neck' || partKey === 'head') return renderHead(config, ns);
            if (partKey === 'torso') return renderTorso(config, ns);
            if (/arm$/.test(partKey)) return renderArm(config, ns);
            if (/leg$/.test(partKey)) return renderLeg(config, ns);
            return svgWrap({ width: 100, height: 100, namespace: ns, body: '' });
        }

        static get frontArtProfile() {
            return SVG_AFRICAN_FRONT_ART_PROFILE;
        }

        static get frontBodyProfileV3() {
            return SVG_AFRICAN_FRONT_BODY_PROFILE_V3;
        }

        static renderPartDataUrl(partKey, config, instanceId) {
            const U = getUtils();
            return U.svgToDataUrl(this.renderPart(partKey, config, instanceId));
        }
    }

    if (typeof window !== 'undefined') window.SvgAfricanCharacterRenderer = SvgAfricanCharacterRenderer;
    if (typeof globalThis !== 'undefined' && !globalThis.SvgAfricanCharacterRenderer) {
        globalThis.SvgAfricanCharacterRenderer = SvgAfricanCharacterRenderer;
    }
})();
