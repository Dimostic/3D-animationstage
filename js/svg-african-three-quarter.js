(function() {
    'use strict';

    const THREE_QUARTER_VIEWS = new Set([
        'front-3q-right',
        'front-3q-left',
        'back-3q-right',
        'back-3q-left'
    ]);

    const FULL_COVER_HEADWEAR = new Set([
        'gele', 'wrapped-gele', 'turban', 'hijab', 'layered-hijab', 'khimar', 'niqab',
        'niger-delta-head-tie', 'academic-cap', 'construction-helmet', 'chef-hat',
        'pilot-cap', 'security-cap', 'military-beret', 'baseball-cap', 'beanie',
        'fedora', 'wide-brim-hat', 'cloche-hat', 'bucket-hat', 'top-hat',
        'niger-delta-bowler', 'bowler-hat', 'edo-coral-cap', 'igbo-red-cap',
        'hausa-embroidered-cap', 'hausa-cap', 'yoruba-fila', 'fila', 'abeti-aja',
        'kufi', 'crown-cap'
    ]);

    const LONG_HAIR = new Set([
        'braids', 'box-braids', 'ghana-weaving', 'fulani-braids', 'locs', 'goddess-locs',
        'sisterlocks', 'twists', 'long-straight', 'long-waves', 'side-swept-long',
        'shoulder-length', 'ponytail', 'low-ponytail', 'side-braid', 'single-braid',
        'bob', 'round-bob', 'side-part-bob'
    ]);

    const AFRO_HAIR = new Set([
        'afro', 'afro-short', 'afro-full', 'tapered-afro', 'afro-puff', 'twist-out',
        'wash-and-go'
    ]);

    const BUN_HAIR = new Set(['natural-bun', 'updo', 'bantu-knots']);

    const BRAID_HAIR = new Set([
        'braids', 'box-braids', 'ghana-weaving', 'fulani-braids', 'side-braid', 'single-braid'
    ]);

    const LOC_TWIST_HAIR = new Set([
        'locs', 'goddess-locs', 'sisterlocks', 'twists'
    ]);

    const BOB_HAIR = new Set(['bob', 'round-bob', 'side-part-bob', 'shoulder-length']);

    const CLOSE_CROP_HAIR = new Set([
        'buzz-cut', 'low-cut', 'fade', 'temple-fade', 'waves', 'textured-crop', 'caesar'
    ]);

    const STYLED_SHORT_HAIR = new Set([
        'high-top-fade', 'quiff', 'pompadour', 'faux-hawk', 'spiky-top', 'brush-up',
        'side-part', 'comb-over', 'angular-fringe', 'pixie-cut'
    ]);

    const HEADWEAR_BROW_CLEARANCE_LIFT = Object.freeze({
        gele: 1,
        'wrapped-gele': 1,
        'crown-cap': 2,
        'niger-delta-head-tie': 1,
        'niger-delta-bowler': 2,
        'bowler-hat': 2,
        'niger-delta-coral-crown': 2,
        'edo-coral-cap': 2,
        'igbo-red-cap': 2,
        'isi-agu-cap': 2,
        'hausa-embroidered-cap': 2,
        'hausa-cap': 2,
        'fulani-hat': 1,
        'academic-cap': 2,
        fedora: 2,
        'wide-brim-hat': 3,
        'cloche-hat': 2,
        'bucket-hat': 3,
        'baseball-cap': 1,
        beanie: 2,
        'top-hat': 2,
        'construction-helmet': 3,
        'chef-hat': 2,
        'pilot-cap': 2,
        'security-cap': 2,
        'military-beret': 2
    });

    const THREE_QUARTER_SLEEVE_END = Object.freeze({
        sleeveless: 34,
        shoulder: 58,
        short: 91,
        elbow: 126,
        'three-quarter': 165,
        wrist: 207
    });

    function clamp(value, min, max) {
        const number = Number(value);
        return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : min;
    }

    function normalizeId(value, fallback = '') {
        const normalized = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-');
        return normalized || fallback;
    }

    function readIdentity(config = {}) {
        return config.identity || config;
    }

    function readStyling(config = {}) {
        return config.styling || config;
    }

    function resolveShared(name, args, fallback) {
        const resolver = globalThis.SvgAfricanPremiumAssets?.[name];
        if (typeof resolver !== 'function') return fallback;
        try {
            const value = resolver(...args);
            return value == null || value === '' ? fallback : value;
        } catch (_) {
            return fallback;
        }
    }

    function color(palette, key, fallback) {
        const value = palette?.[key];
        return typeof value === 'string' && value.trim() ? value : fallback;
    }

    function mix(hexA, hexB, ratio = 0.5) {
        const parse = value => {
            const raw = String(value || '').replace('#', '').trim();
            const full = raw.length === 3 ? raw.split('').map(char => char + char).join('') : raw;
            return /^[0-9a-f]{6}$/i.test(full)
                ? [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)]
                : null;
        };
        const a = parse(hexA);
        const b = parse(hexB);
        if (!a || !b) return hexA || hexB || '#000000';
        const t = clamp(ratio, 0, 1);
        const out = a.map((channel, index) => Math.round(channel + (b[index] - channel) * t));
        return `#${out.map(channel => channel.toString(16).padStart(2, '0')).join('')}`;
    }

    function svgShell(partKey, width, height, body, palette, view) {
        const p = {
            skin: color(palette, 'skin', '#A57252'),
            skinLight: color(palette, 'skinLight', '#C28A66'),
            skinShade: color(palette, 'skinShade', '#85563f'),
            hair: color(palette, 'hair', '#1f1512'),
            hairLight: color(palette, 'hairLight', '#3a2520'),
            ink: color(palette, 'ink', '#241714'),
            cloth: color(palette, 'blazer', '#17345d'),
            clothShade: color(palette, 'blazerShade', '#0f2442'),
            blouse: color(palette, 'blouse', '#fff4e6'),
            bottom: color(palette, 'skirt', '#182842'),
            accent: color(palette, 'accent', '#c68b2c'),
            tie: color(palette, 'tie', '#3b251a'),
            shoe: color(palette, 'shoe', '#171717'),
            shoeLight: mix(color(palette, 'shoe', '#171717'), '#ffffff', 0.34),
            glass: color(palette, 'glass', '#26374f'),
            headwear: color(palette, 'headwear', '#17345d'),
            headwearShade: color(palette, 'headwearShade', '#0f2442')
        };
        const style = [
            `--skin:${p.skin}`, `--skin-light:${p.skinLight}`, `--skin-shade:${p.skinShade}`,
            `--hair:${p.hair}`, `--hair-light:${p.hairLight}`, `--ink:${p.ink}`,
            `--cloth:${p.cloth}`, `--cloth-shade:${p.clothShade}`, `--blouse:${p.blouse}`,
            `--bottom:${p.bottom}`, `--accent:${p.accent}`, `--tie:${p.tie}`,
            `--shoe:${p.shoe}`, `--shoe-light:${p.shoeLight}`, `--glass:${p.glass}`, `--headwear:${p.headwear}`,
            `--headwear-shade:${p.headwearShade}`
        ].join(';');
        const facingRole = String(view || '').startsWith('back') ? ' back-view-premium' : '';
        return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width * 4}" height="${height * 4}" role="img" aria-label="${partKey}" data-svg-african-resolution-scale="4" data-svg-african-projection="authored-3q" data-svg-african-view="${view}" data-svg-african-role="three-quarter-premium authored-three-quarter ${view}${facingRole}" shape-rendering="geometricPrecision" style="${style}">
<defs>
<linearGradient id="skinGrad3q" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--skin-light)"/><stop offset=".55" stop-color="var(--skin)"/><stop offset="1" stop-color="var(--skin-shade)"/></linearGradient>
<linearGradient id="faceGrad3q" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="var(--skin-light)"/><stop offset=".2" stop-color="var(--skin)"/><stop offset=".72" stop-color="var(--skin)"/><stop offset="1" stop-color="var(--skin-shade)"/></linearGradient>
<linearGradient id="clothGrad3q" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--cloth)"/><stop offset="1" stop-color="var(--cloth-shade)"/></linearGradient>
<linearGradient id="hairGrad3q" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="var(--hair-light)"/><stop offset=".7" stop-color="var(--hair)"/></linearGradient>
</defs>${body}</svg>`;
    }

    function contextFor(asset, config = {}, options = {}) {
        const view = normalizeId(asset?.view || config?.styling?.view || config?.view, 'front-3q-right');
        const identity = readIdentity(config);
        const styling = readStyling(config);
        const adjustments = options.adjustments || config.premiumAdjustments || {};
        const faceState = options.faceState || config._svgAfricanFaceState || {};
        const left = view.endsWith('left');
        const back = view.startsWith('back');
        const nearSide = left ? 'left' : 'right';
        const presentation = normalizeId(identity.presentation || config.presentation, 'female');
        const hair = normalizeId(identity.hair || config.hair, presentation === 'male' ? 'low-cut' : 'braids');
        const headwear = normalizeId(styling.headwear || config.headwear, 'none');
        const accessories = new Set([...(styling.accessories || []), ...(config.accessories || [])].map(value => normalizeId(value)));
        const outfit = normalizeId(styling.outfit || config.outfit, 'lecturer');
        const profession = normalizeId(styling.profession || config.profession, '');
        const culturalStyle = normalizeId(styling.culturalStyle || config.culturalStyle, 'contemporary');
        const topClothing = normalizeId(resolveShared(
            'resolveTopClothing',
            [config],
            styling.topClothing || config.topClothing || 'shirt'
        ), 'shirt');
        const bottomClothing = normalizeId(resolveShared(
            'resolveBottomClothing',
            [config],
            styling.bottomClothing || config.bottomClothing || (presentation === 'male' ? 'trousers' : 'skirt-straight')
        ), presentation === 'male' ? 'trousers' : 'skirt-straight');
        const sleeveLength = normalizeId(resolveShared(
            'resolveSleeveLength',
            [config, topClothing],
            styling.sleeveLength || config.sleeveLength || 'wrist'
        ), 'wrist');
        const skirtLength = normalizeId(resolveShared(
            'resolveSkirtLength',
            [config],
            styling.skirtLength || config.skirtLength || 'at-knee'
        ), 'at-knee');
        const rawStyleText = [
            config.assetCharacterId, outfit, styling.topClothing, styling.bottomClothing,
            topClothing, bottomClothing, profession, culturalStyle
        ].map(value => normalizeId(value)).join(' ');
        const fabricDesign = normalizeId(resolveShared(
            'resolveEffectiveFabricDesign',
            [config, rawStyleText],
            styling.fabricDesign || config.fabricDesign || 'plain'
        ), 'plain');
        const skirtLike = Boolean(resolveShared(
            'isSkirtLikeBottom',
            [bottomClothing],
            /skirt|wrapper|iro|george|robe|gown|drape/.test(bottomClothing)
        ));
        const styleText = [
            rawStyleText, fabricDesign
        ].map(value => normalizeId(value)).join(' ');
        return {
            view,
            facialStyle: resolveShared('getFacialStyleProfile', [config], null),
            identity,
            styling,
            adjustments,
            faceState,
            sharedHeadYaw: Number.isFinite(options.sharedHeadYaw) ? clamp(options.sharedHeadYaw, -3, 3) : null,
            fullHeadRange: options.fullHeadRange === true,
            left,
            back,
            nearSide,
            hair,
            headwear,
            presentation,
            ageGroup: normalizeId(identity.ageGroup || config.ageGroup, 'adult'),
            bodyType: normalizeId(identity.body || config.body, 'average'),
            faceShape: normalizeId(identity.face || config.face, 'oval'),
            headType: normalizeId(identity.headType || config.headType, 'balanced'),
            eyeStyle: normalizeId(identity.eyes || config.eyes, 'almond'),
            noseStyle: normalizeId(identity.nose || config.nose, 'soft'),
            lipStyle: normalizeId(identity.lips || config.lips, 'natural'),
            facialHair: normalizeId(identity.facialHair || config.facialHair, 'none'),
            accessories,
            styleText,
            outfit,
            profession,
            culturalStyle,
            topClothing,
            bottomClothing,
            sleeveLength,
            skirtLength,
            skirtLike,
            fabricDesign,
            footwear: normalizeId(styling.footwear || config.footwear, 'formal'),
            neckTieType: normalizeId(resolveShared('resolveNeckTieType', [config], styling.neckTieType || 'auto'), 'auto'),
            neckTieDesign: normalizeId(resolveShared('resolveNeckTieDesign', [config], styling.neckTieDesign || 'auto'), 'auto'),
            mirror: left ? 'translate(100 0) scale(-1 1)' : '',
            hasHeadwear: headwear !== 'none',
            fullCoverHeadwear: FULL_COVER_HEADWEAR.has(headwear),
            longHair: LONG_HAIR.has(hair),
            afroHair: AFRO_HAIR.has(hair),
            bunHair: BUN_HAIR.has(hair),
            closeCropHair: CLOSE_CROP_HAIR.has(hair),
            styledShortHair: STYLED_SHORT_HAIR.has(hair)
        };
    }

    function mirrored(body, ctx, width = 100) {
        return ctx.left ? `<g transform="translate(${width} 0) scale(-1 1)">${body}</g>` : body;
    }

    function headLayer(markup, ctx) {
        if (ctx.sharedHeadYaw === null) return markup;
        const yaw = ctx.sharedHeadYaw;
        return `<g data-svg-african-role="matched-head-layer" transform="translate(${52 + yaw * 2} 0) scale(${1 - Math.abs(yaw) * .025} 1) translate(-52 0)">${markup}</g>`;
    }

    function wrapHairFit(markup, ctx, layer = 'back') {
        if (!markup || /hijab|khimar|niqab/.test(ctx.headwear)) return markup;
        const a = ctx.adjustments || {};
        const volume = clamp(a.hairVolume || 0, -0.35, 0.42);
        // Hair shares the socket-anchored skull transform in both directions.
        const hairlineLift = clamp(a.hairlineHeight || 0, -0.35, 0.45) * 10;
        const scaleX = 1 + volume * (layer === 'back' ? 0.42 : 0.30);
        const scaleY = 1 + volume * (layer === 'back' ? 0.32 : 0.22);
        const shiftY = layer === 'front' ? -hairlineLift : -Math.max(0, hairlineLift) * 0.16;
        return `<g data-svg-african-role="adjustable-hair adjustable-hair-${layer}" data-svg-african-hair-volume="${volume.toFixed(2)}" data-svg-african-hairline-lift="${hairlineLift.toFixed(2)}" transform="translate(0 ${shiftY.toFixed(2)}) translate(52 54) scale(${scaleX.toFixed(3)} ${scaleY.toFixed(3)}) translate(-52 -54)">${markup}</g>`;
    }

    function wrapHeadwearFit(markup, ctx, family) {
        if (!markup) return '';
        const a = ctx.adjustments || {};
        // Brim clearance differs at the foreshortened brow; keep rear crown overlap unchanged.
        const frontBrimLift = !ctx.back && /bowler|fulani-hat/.test(ctx.headwear) ? 3 : 0;
        const clearance = (Number(HEADWEAR_BROW_CLEARANCE_LIFT[ctx.headwear]) || 0) + frontBrimLift;
        const widthScale = 1 + clamp(a.headwearWidth || 0, -0.55, 0.65) * 0.80;
        const heightScale = 1 + clamp(a.headwearHeight || 0, -0.55, 0.65) * 0.65;
        const yShift = -clamp(a.headwearLift || 0, -0.65, 0.65) * 24 - clearance;
        const tilt = clamp(a.headwearTilt || 0, -0.65, 0.65) * 18;
        const rearFitRoles = ctx.back
            ? ' rear-three-quarter-headwear sealed-crown-overlap no-scalp-gap'
            : '';
        return `<g id="headwear" data-svg-african-role="headwear ${ctx.headwear} authored-3q-headwear headwear-family-${family} full-scalp-cover brow-clear on-head${rearFitRoles}" data-svg-african-headwear-family="${family}" data-svg-african-brow-edge-y="49" data-svg-african-brow-clearance-lift="${clearance}" data-svg-african-rear-overlap-y="39" transform="translate(0 ${yShift.toFixed(2)}) translate(52 49) rotate(${tilt.toFixed(2)}) scale(${widthScale.toFixed(3)} ${heightScale.toFixed(3)}) translate(-52 -49)">${markup}</g>`;
    }

    function renderRearHairBack(ctx) {
        const fullRearScalp = (role = 'rear-scalp-cover', napeY = 110) => `<path data-svg-african-role="${role} full-posterior-scalp-cover natural-rounded-nape low-natural-hairline no-exposed-rear-scalp" data-svg-african-rear-hairline-y="${napeY}" d="M13 66 C9 34 26 8 52 5 C79 4 96 29 90 68 C89 82 84 94 76 102 C69 108 61 ${napeY} 53 ${napeY} C43 ${napeY} 35 107 27 101 C19 94 14 82 13 66 Z" fill="url(#hairGrad3q)"/>`;
        const longSidePanels = (endY = 145) => `<path data-svg-african-role="rear-hair-panel far-side behind-ear" d="M14 50 C7 75 10 106 8 ${endY - 6} C8 ${endY + 7} 17 ${endY + 11} 25 ${endY + 1} C32 ${endY - 10} 30 105 31 78 C27 63 22 53 14 50 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="rear-hair-panel near-side behind-ear" d="M83 49 C94 62 96 84 92 107 C89 124 94 ${endY - 5} 84 ${endY + 2} C75 ${endY + 8} 70 ${endY - 1} 73 ${endY - 13} C77 109 73 88 74 75 C76 62 79 53 83 49 Z" fill="url(#hairGrad3q)"/>`;

        if (ctx.hasHeadwear) {
            if (/hijab|khimar|niqab/.test(ctx.headwear) || ctx.hair === 'bald') return '';
            const longUnderlay = ctx.longHair || BRAID_HAIR.has(ctx.hair) || LOC_TWIST_HAIR.has(ctx.hair);
            const strands = longUnderlay
                ? '<path data-svg-african-role="hair-under-headwear rear-strands behind-ear" d="M17 60 C11 84 15 113 11 141 M26 61 C21 88 27 117 22 145 M86 59 C92 83 87 112 93 140 M77 61 C83 87 78 118 83 145" fill="none" stroke="var(--hair)" stroke-width="6" stroke-linecap="round"/>'
                : '';
            return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair hair-under-headwear visible-below-headgear no-crown-show-through cap-overlap-zone ${ctx.hair}" data-svg-african-hair-style="${ctx.hair}" data-svg-african-hair-top-y="36">
<path data-svg-african-role="lower-scalp-cover hair-under-headwear continuous-cap-overlap no-bald-gap full-posterior-scalp-cover natural-rounded-nape low-natural-hairline no-exposed-rear-scalp" data-svg-african-rear-hairline-y="110" d="M13 42 C31 35 72 35 91 41 L90 68 C89 82 84 94 76 102 C69 108 61 110 53 110 C43 110 35 107 27 101 C19 94 14 82 13 68 Z" fill="url(#hairGrad3q)"/>
${strands}</g>`;
        }
        if (ctx.hair === 'bald') return '';
        if (ctx.bunHair) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair fitted-scalp-hair natural-bun full-scalp-cover">
<ellipse data-svg-african-role="hair-bun rear-bun" cx="18" cy="35" rx="15" ry="18" fill="var(--hair)"/>
${fullRearScalp('hair-cap scalp-cover directional-scalp', 109)}
<path data-svg-african-role="rear-hair-flow" d="M24 47 C36 28 66 21 84 43" fill="none" stroke="var(--hair-light)" stroke-width="1.5" opacity=".23" stroke-linecap="round"/>
</g>`;
        }
        if (BRAID_HAIR.has(ctx.hair)) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair braided-hair ${ctx.hair} full-scalp-cover separated-plaits" data-svg-african-hair-style="${ctx.hair}">
${fullRearScalp('hair-cap scalp-cover braid-root-cap directional-scalp', 111)}
<path data-svg-african-role="braid-root-sections rear-braid-roots" d="M24 46 C31 25 42 12 52 6 M37 42 C42 25 48 13 52 6 M52 39 L52 6 M66 42 C63 25 58 13 52 6 M79 47 C73 27 63 14 52 6" fill="none" stroke="var(--hair-light)" stroke-width="1" opacity=".34" stroke-linecap="round"/>
<g data-svg-african-role="individual-braids rear-braids behind-ear" fill="none" stroke="var(--hair)" stroke-linecap="round">
<path d="M17 61 C10 84 14 112 9 139" stroke-width="7"/><path d="M24 66 C18 91 25 118 19 145" stroke-width="6"/>
<path d="M85 60 C92 83 87 112 94 138" stroke-width="7"/><path d="M78 65 C84 91 78 120 84 145" stroke-width="6"/>
</g></g>`;
        }
        if (LOC_TWIST_HAIR.has(ctx.hair)) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair loc-twist-hair ${ctx.hair} full-scalp-cover separated-locks" data-svg-african-hair-style="${ctx.hair}">
${fullRearScalp('hair-cap scalp-cover textured-root-cap directional-scalp', 111)}
<path data-svg-african-role="rear-locks behind-ear" d="M16 60 C9 84 15 113 10 140 M24 65 C18 91 26 117 20 146 M84 60 C92 84 86 113 93 140 M77 65 C84 92 77 120 83 146" fill="none" stroke="var(--hair)" stroke-width="7.5" stroke-linecap="round"/>
<path data-svg-african-role="rear-lock-highlights" d="M17 65 C13 87 18 113 13 136 M83 65 C88 87 83 113 89 136" fill="none" stroke="var(--hair-light)" stroke-width="1.2" opacity=".30" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.longHair) {
            const endY = BOB_HAIR.has(ctx.hair) ? 124 : 145;
            return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair smooth-long-hair ${ctx.hair} full-scalp-cover rear-hair-panels" data-svg-african-hair-style="${ctx.hair}">
${fullRearScalp('hair-cap scalp-cover directional-scalp', 111)}
${longSidePanels(endY)}
<path data-svg-african-role="hair-back highlight rear-crown-flow" d="M22 35 C40 16 70 14 84 37" fill="none" stroke="var(--hair-light)" stroke-width="2.2" opacity=".24" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.closeCropHair) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair close-crop ${ctx.hair} fitted-scalp-hair directional-scalp full-scalp-cover" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="short-hair-cap scalp-cover fitted-crown full-posterior-scalp-cover natural-rounded-nape low-natural-hairline no-exposed-rear-scalp" data-svg-african-rear-hairline-y="103" d="M16 66 C13 41 28 20 50 16 C71 13 87 29 89 51 L88 68 C86 82 80 92 71 99 C63 104 52 105 42 102 C30 98 20 85 16 66 Z" fill="url(#hairGrad3q)"/>
${ctx.hair === 'waves' ? '<path data-svg-african-role="wave-pattern" d="M25 34 C35 27 44 27 53 32 M39 22 C49 17 60 18 69 24 M57 35 C67 30 76 33 82 40" fill="none" stroke="var(--hair-light)" stroke-width="1" opacity=".34" stroke-linecap="round"/>' : ''}
</g>`;
        }
        if (ctx.styledShortHair) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair styled-short-hair ${ctx.hair} directional-scalp full-scalp-cover" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="styled-short-rear scalp-cover full-posterior-scalp-cover natural-rounded-nape low-natural-hairline no-exposed-rear-scalp" data-svg-african-rear-hairline-y="107" d="M15 66 C12 47 15 31 24 22 L23 14 L34 18 L37 8 L45 15 L52 4 L59 14 L69 6 L69 17 L82 12 L79 24 C88 33 92 49 89 68 C87 83 81 94 72 101 C64 108 53 109 43 106 C29 101 19 86 15 66 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="styled-hair-flow" d="M27 32 C39 20 55 16 73 23 M31 47 C47 35 68 34 83 45" fill="none" stroke="var(--hair-light)" stroke-width="1.1" opacity=".3" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.afroHair) {
            return '<path id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair afro full-scalp-cover full-posterior-scalp-cover natural-rounded-nape low-natural-hairline no-exposed-rear-scalp" data-svg-african-rear-hairline-y="108" d="M10 67 C3 47 7 27 22 19 C25 4 43 -2 54 6 C68 -2 88 7 90 23 C101 32 99 53 91 70 C89 85 82 97 73 104 C64 111 51 112 40 108 C25 103 15 87 10 67 Z" fill="url(#hairGrad3q)"/>';
        }
        return `<g id="hair-back" data-svg-african-role="hair hair-back rear-three-quarter-hair fitted-scalp-hair directional-scalp ${ctx.hair} full-scalp-cover" data-svg-african-hair-style="${ctx.hair}">
${fullRearScalp('hair-cap scalp-cover fitted-crown directional-scalp', 108)}
<path data-svg-african-role="rear-hair-flow subtle-crown-flow" d="M23 43 C37 24 67 20 84 41" fill="none" stroke="var(--hair-light)" stroke-width="1.2" opacity=".22" stroke-linecap="round"/>
</g>`;
    }

    function renderHairBack(ctx) {
        if (ctx.back) return renderRearHairBack(ctx);
        if (ctx.hasHeadwear) {
            if (/hijab|khimar|niqab/.test(ctx.headwear) || ctx.hair === 'bald') return '';
            const longUnderlay = ctx.longHair || BRAID_HAIR.has(ctx.hair) || LOC_TWIST_HAIR.has(ctx.hair);
            const endY = longUnderlay ? 145 : 91;
            const strands = longUnderlay
                ? '<path data-svg-african-role="hair-under-headwear rear-strands" d="M18 47 C11 78 16 111 12 141 M27 48 C21 82 27 116 23 145 M84 47 C91 79 85 112 92 140 M76 49 C83 83 77 117 82 145" fill="none" stroke="var(--hair)" stroke-width="6" stroke-linecap="round"/>'
                : '';
            return `<g id="hair-back" data-svg-african-role="hair hair-back hair-under-headwear visible-below-headgear no-crown-show-through cap-overlap-zone ${ctx.hair}" data-svg-african-hair-style="${ctx.hair}" data-svg-african-hair-top-y="36">
<path data-svg-african-role="lower-scalp-cover hair-under-headwear continuous-cap-overlap no-bald-gap" d="M13 42 C31 35 72 35 91 41 L90 67 C87 88 72 107 53 113 C34 108 19 91 14 69 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="temple-hair far-temple below-headgear" d="M14 39 C9 57 11 76 22 ${endY} C28 ${endY - 9} 29 68 26 44 C22 40 18 38 14 39 Z" fill="var(--hair)"/>
<path data-svg-african-role="temple-hair near-temple below-headgear" d="M90 39 C95 58 93 77 83 ${endY} C76 ${endY - 9} 75 68 78 44 C82 40 87 38 90 39 Z" fill="var(--hair)"/>
${strands}</g>`;
        }
        if (ctx.hair === 'bald') return '';
        if (ctx.bunHair) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back fitted-scalp-hair natural-bun full-scalp-cover brow-clear">
<ellipse data-svg-african-role="hair-bun rear-bun" cx="18" cy="33" rx="15" ry="18" fill="var(--hair)"/>
<path data-svg-african-role="hair-cap scalp-cover" d="M13 61 C9 29 26 7 52 5 C79 4 95 25 90 63 C80 51 66 44 49 44 C34 44 22 51 13 61 Z" fill="url(#hairGrad3q)"/>
</g>`;
        }
        if (BRAID_HAIR.has(ctx.hair)) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back braided-hair ${ctx.hair} full-scalp-cover separated-plaits brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="hair-cap scalp-cover braid-root-cap directional-scalp" d="M13 61 C9 29 25 7 52 5 C79 4 95 25 90 64 C80 52 66 45 49 45 C34 45 22 51 13 61 Z" fill="url(#hairGrad3q)"/>
<g data-svg-african-role="individual-braids rear-braids" fill="none" stroke="var(--hair)" stroke-linecap="round">
<path d="M17 55 C10 80 14 111 9 139" stroke-width="7"/><path d="M23 58 C17 86 25 117 19 145" stroke-width="6"/>
<path d="M84 55 C92 80 87 111 94 138" stroke-width="7"/><path d="M79 59 C85 89 78 119 84 145" stroke-width="6"/>
<path d="M30 70 C25 94 31 119 27 140" stroke-width="4.8"/><path d="M73 70 C79 96 72 120 76 140" stroke-width="4.8"/>
</g>
<g data-svg-african-role="braid-highlights segmented-braid-texture" fill="none" stroke="var(--hair-light)" stroke-width="1" stroke-dasharray="2 2.4" opacity=".46" stroke-linecap="round">
<path d="M17 59 C13 83 17 111 12 136"/><path d="M84 59 C89 84 84 111 91 135"/><path d="M24 63 C20 89 27 116 22 141"/><path d="M78 64 C82 91 76 116 81 141"/>
</g></g>`;
        }
        if (LOC_TWIST_HAIR.has(ctx.hair)) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back loc-twist-hair ${ctx.hair} full-scalp-cover separated-locks brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="hair-cap scalp-cover textured-root-cap directional-scalp" d="M13 61 C9 28 25 7 52 5 C80 4 96 26 90 64 C80 51 66 44 49 44 C34 44 22 51 13 61 Z" fill="url(#hairGrad3q)"/>
<path d="M16 54 C9 82 15 112 10 140 M24 58 C18 88 26 116 20 146 M83 55 C92 83 86 112 93 140 M77 60 C84 90 77 120 83 146 M30 69 C25 96 31 120 28 140 M71 69 C78 96 72 120 76 141" fill="none" stroke="var(--hair)" stroke-width="7.5" stroke-linecap="round"/>
<path d="M16 59 C12 84 18 111 13 136 M83 60 C88 84 83 111 89 136 M24 64 C21 89 27 116 23 141 M77 65 C81 92 75 117 80 141" fill="none" stroke="var(--hair-light)" stroke-width="1.25" opacity=".30" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.longHair) {
            const bob = BOB_HAIR.has(ctx.hair);
            const endY = bob ? 124 : 145;
            return `<g id="hair-back" data-svg-african-role="hair hair-back smooth-long-hair ${ctx.hair} full-scalp-cover rear-hair-panels brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="hair-cap scalp-cover directional-scalp" d="M13 61 C9 28 25 7 52 5 C80 4 96 26 90 64 C80 51 66 44 49 44 C34 44 22 51 13 61 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="rear-hair-panel far-side" d="M14 49 C7 73 10 101 8 ${endY - 6} C8 ${endY + 7} 17 ${endY + 11} 25 ${endY + 1} C32 ${endY - 10} 30 100 32 76 C29 61 23 52 14 49 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="rear-hair-panel near-side" d="M82 48 C94 61 96 82 92 105 C89 122 94 ${endY - 5} 84 ${endY + 2} C75 ${endY + 8} 70 ${endY - 1} 73 ${endY - 13} C77 108 72 87 73 74 C75 61 78 52 82 48 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="hair-back highlight" d="M22 34 C40 16 70 14 84 37" fill="none" stroke="var(--hair-light)" stroke-width="2.4" opacity=".26" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.closeCropHair) {
            return `<g id="hair-back" data-svg-african-role="hair hair-back close-crop ${ctx.hair} fitted-scalp-hair directional-scalp full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="short-hair-cap scalp-cover fitted-crown" d="M16 59 C14 39 28 21 49 17 C69 14 83 26 88 43 L86 56 C78 48 65 44 50 44 C36 44 24 50 16 59 Z" fill="url(#hairGrad3q)"/>
${ctx.hair === 'waves' ? '<path data-svg-african-role="wave-pattern" d="M25 31 C35 24 44 24 53 29 M39 19 C49 14 60 15 69 21 M58 31 C67 27 76 30 82 37" fill="none" stroke="var(--hair-light)" stroke-width="1" opacity=".34" stroke-linecap="round"/>' : ''}
</g>`;
        }
        if (ctx.styledShortHair) {
            return `<path id="hair-back" data-svg-african-role="hair hair-back styled-short-hair ${ctx.hair} directional-scalp full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}" d="M15 60 C12 45 15 31 24 22 L23 14 L34 18 L37 8 L45 15 L52 4 L59 14 L69 6 L69 17 L82 12 L79 24 C87 31 90 44 89 58 C78 49 65 44 49 44 C34 44 23 51 15 60 Z" fill="url(#hairGrad3q)"/>`;
        }
        if (ctx.afroHair) {
            return '<path id="hair-back" data-svg-african-role="hair hair-back afro full-scalp-cover directional-scalp brow-clear" d="M10 60 C3 44 8 25 23 19 C26 4 43 -2 54 6 C67 -2 87 7 88 22 C101 29 99 51 90 64 L78 82 L26 83 Z" fill="url(#hairGrad3q)"/>';
        }
        return `<path id="hair-back" data-svg-african-role="hair hair-back fitted-scalp-hair directional-scalp ${ctx.hair} full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}" d="M14 62 C10 30 26 8 52 6 C79 5 94 26 90 63 C80 50 66 43 49 44 C34 44 23 51 14 62 Z" fill="url(#hairGrad3q)"/>`;
    }

    function renderRearHeadwear(ctx) {
        const finish = (shape, family) => wrapHeadwearFit(
            `<g data-svg-african-role="rear-headwear-artwork continuous-rear-crown">${shape}</g>`, ctx, family
        );
        const crown = '<path data-svg-african-role="rear-cap-crown" d="M13 50 C10 23 28 7 54 7 C80 7 96 27 93 52 C73 59 34 59 13 50 Z" fill="var(--headwear)"/>';
        const band = '<path data-svg-african-role="rear-cap-band curved-ear-clear-margin" d="M13 46 C34 54 72 54 93 48 L92 56 C72 63 35 61 14 54 Z" fill="var(--headwear-shade)"/>';
        if (/hijab|khimar|niqab/.test(ctx.headwear)) {
            const family = ctx.headwear === 'niqab' ? 'niqab' : ctx.headwear === 'khimar' ? 'khimar' : 'hijab';
            return finish('<path data-svg-african-role="rear-modest-drape sealed-back neck-cover ear-cover" d="M10 63 C5 30 24 4 54 4 C85 4 100 31 95 67 C91 95 94 121 99 151 C73 154 32 154 5 151 C12 120 9 91 10 63 Z" fill="var(--headwear)"/><path data-svg-african-role="rear-drape-folds" d="M26 65 C20 98 22 122 17 144 M81 65 C86 100 84 122 88 144" fill="none" stroke="var(--headwear-shade)" stroke-width="2" opacity=".5"/>', family);
        }
        if (ctx.headwear === 'academic-cap') {
            return finish('<path data-svg-african-role="mortarboard rear-fitted-cap curved-ear-clear-margin" d="M15 32 C33 22 73 23 92 33 L91 56 C69 63 33 60 14 52 Z" fill="var(--headwear-shade)"/><path data-svg-african-role="mortarboard rear-board" d="M3 24 L52 4 L102 27 L55 47 Z" fill="var(--headwear)"/><path data-svg-african-role="mortarboard tassel side-drop" d="M54 7 C75 14 94 25 95 42 L95 64" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/><circle cx="95" cy="67" r="3" fill="var(--accent)"/>', 'mortarboard');
        }
        if (/pilot-cap|security-cap|baseball-cap/.test(ctx.headwear)) {
            const baseball = ctx.headwear === 'baseball-cap';
            return finish(`${crown}${band}<path data-svg-african-role="rear-cap-panel-seams" d="M53 10 C50 24 51 40 53 51" fill="none" stroke="var(--headwear-shade)" stroke-width="1.5"/>${baseball ? '<path data-svg-african-role="rear-cap-adjustment-strap" d="M38 52 C47 56 63 56 73 53" fill="none" stroke="var(--accent)" stroke-width="2"/>' : ''}`, ctx.headwear);
        }
        if (ctx.headwear === 'construction-helmet') {
            return finish('<path data-svg-african-role="rear-safety-helmet sealed-shell" d="M10 48 C10 22 28 5 54 5 C80 5 97 25 96 50 C74 58 33 58 10 48 Z" fill="var(--headwear)"/><path data-svg-african-role="rear-helmet-ribs" d="M51 8 C48 22 49 41 51 53 M23 24 C20 33 20 41 22 48 M82 24 C87 35 88 43 86 50" fill="none" stroke="var(--headwear-shade)" stroke-width="2.3" opacity=".55"/><path data-svg-african-role="rear-helmet-rim curved-ear-clear-margin" d="M7 47 C32 56 75 57 99 49 L97 56 C72 65 31 63 8 54 Z" fill="var(--headwear-shade)"/>', 'construction-helmet');
        }
        if (ctx.headwear === 'chef-hat') {
            return finish('<path data-svg-african-role="rear-chef-toque puffed-crown" d="M12 43 C3 29 13 17 27 17 C30 4 47 1 59 9 C73 2 89 10 89 23 C100 26 102 40 92 47 C71 54 33 52 12 43 Z" fill="var(--headwear)"/><path data-svg-african-role="rear-toque-band curved-ear-clear-margin" d="M13 42 C34 50 73 51 93 45 L92 57 C70 64 33 61 14 53 Z" fill="var(--headwear)"/><path d="M27 42 L29 25 M48 47 L48 20 M71 46 L70 24" stroke="var(--headwear-shade)" stroke-width="1.5" opacity=".38"/>', 'chef-toque');
        }
        if (ctx.headwear === 'military-beret') {
            return finish('<path data-svg-african-role="rear-beret continuous-beret-shell" d="M12 49 C12 25 30 11 61 9 C80 10 97 23 94 42 C89 50 83 56 74 58 C54 60 28 58 12 49 Z" fill="var(--headwear)"/>' + band, 'military-beret');
        }
        if (ctx.headwear === 'turban') {
            return finish(`${crown}${band}<path data-svg-african-role="rear-turban-wraps" d="M17 32 C38 41 73 41 91 33 M22 22 C44 30 67 29 86 23" stroke="var(--headwear-shade)" stroke-width="4" fill="none" opacity=".6"/>`, 'turban');
        }
        if (/gele|niger-delta-head-tie/.test(ctx.headwear)) {
            const tie = ctx.headwear === 'niger-delta-head-tie';
            const wrapped = ctx.headwear === 'wrapped-gele';
            const fan = tie
                ? 'M18 37 C6 25 8 11 17 5 C29 15 39 26 45 37 C59 22 76 10 92 9 C98 22 91 34 82 44 Z'
                : wrapped
                    ? 'M13 39 C17 18 36 5 57 6 C79 7 95 21 93 43 C69 33 38 33 13 39 Z'
                    : 'M12 39 C5 25 10 9 25 4 C33 18 41 27 49 33 C51 19 57 5 69 2 C77 16 81 26 95 36 C76 45 31 47 12 39 Z';
            return finish(`${crown}<path data-svg-african-role="rear-wrap-fan layered-rear-folds" d="${fan}" fill="var(--headwear)"/><path data-svg-african-role="rear-wrap-folds" d="M17 33 C36 44 70 45 91 35 M19 43 C39 53 72 53 91 45" fill="none" stroke="var(--headwear-shade)" stroke-width="2.5" opacity=".65"/>${band}<path data-svg-african-role="rear-wrap-knot" d="M34 55 C38 48 47 49 50 55 C46 61 39 62 34 55 Z" fill="var(--headwear-shade)"/>`, tie ? 'niger-delta-head-tie' : 'gele');
        }
        if (/yoruba-fila|^fila$|abeti-aja/.test(ctx.headwear)) {
            const wings = ctx.headwear === 'abeti-aja';
            const shape = wings
                ? `${crown}<path data-svg-african-role="rear-abeti-wings folded-wing-cap" d="M18 46 L7 15 C23 21 36 30 48 41 C61 27 78 15 97 11 L89 47 C67 54 40 53 18 46 Z" fill="var(--headwear)"/><path d="M13 21 C28 29 39 36 48 45 M91 18 C75 27 65 37 56 47" stroke="var(--headwear-shade)" stroke-width="2" fill="none"/>`
                : '<path data-svg-african-role="rear-fila folded-rear-crown" d="M13 51 C10 27 28 11 52 9 C70 7 85 14 94 25 L92 53 C70 61 34 59 13 51 Z" fill="var(--headwear)"/><path data-svg-african-role="rear-fila-fold" d="M51 10 C62 22 76 28 91 32 L84 43 C65 33 44 35 21 46" fill="none" stroke="var(--headwear-shade)" stroke-width="2.6" opacity=".65"/>';
            return finish(shape + band, wings ? 'abeti-aja' : 'yoruba-fila');
        }
        if (/hausa|kufi|igbo-red-cap|isi-agu-cap|coral|crown-cap/.test(ctx.headwear)) {
            const hausa = /hausa/.test(ctx.headwear);
            const coral = /coral|crown-cap/.test(ctx.headwear);
            const red = ctx.headwear === 'igbo-red-cap';
            const family = hausa ? 'hausa-cap' : coral ? 'coral-crown' : red ? 'igbo-red-cap' : ctx.headwear === 'isi-agu-cap' ? 'isi-agu-cap' : 'kufi';
            const shape = hausa
                ? '<path data-svg-african-role="rear-hausa cylindrical-rear-crown" d="M13 17 C34 9 71 10 91 18 L94 54 C71 63 34 60 13 52 Z" fill="var(--headwear)"/>'
                : red
                    ? '<path data-svg-african-role="rear-igbo-cap rounded-regional-crown" d="M13 51 C11 28 28 11 53 10 C77 9 95 28 93 53 C72 61 35 59 13 51 Z" fill="var(--headwear)"/><path data-svg-african-role="rear-cap-top-button" d="M49 11 L52 6 L56 11 Z" fill="var(--headwear)"/>'
                    : crown;
            const detail = coral
                ? '<path data-svg-african-role="rear-coral-beads" d="M20 29 C40 18 70 20 87 33 M17 40 C39 31 73 33 91 43" stroke="var(--accent)" stroke-width="3.5" stroke-dasharray="1 5" stroke-linecap="round" fill="none"/>'
                : ctx.headwear === 'hausa-embroidered-cap' || ctx.headwear === 'isi-agu-cap'
                    ? '<path data-svg-african-role="rear-cap-embroidery" d="M18 29 L25 23 L32 30 L39 24 L46 31 L53 24 L60 31 L67 25 L74 32 L81 26 L89 33 M18 41 C38 36 72 38 90 44" stroke="var(--accent)" stroke-width="1.6" fill="none" opacity=".7"/>'
                    : hausa ? '<path data-svg-african-role="rear-cap-simple-trim" d="M18 41 C38 36 72 38 90 44" stroke="var(--accent)" stroke-width="1.6" fill="none" opacity=".5"/>' : '';
            return finish(shape + detail + band, family);
        }
        if (ctx.headwear === 'fulani-hat') {
            return finish('<path data-svg-african-role="rear-fulani-crown conical-rear-crown" d="M52 2 L97 48 C73 59 32 57 6 46 Z" fill="var(--headwear)"/><path data-svg-african-role="rear-fulani-weave" d="M53 9 L53 48 M22 34 C41 40 69 42 83 36" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity=".6"/><path data-svg-african-role="rear-conical-brim curved-ear-clear-margin" d="M3 46 C29 54 75 57 101 48 L98 54 C73 65 29 62 5 52 Z" fill="var(--headwear-shade)"/>', 'fulani-conical');
        }
        if (/bowler|fedora|wide-brim-hat|top-hat|bucket-hat|cloche-hat|beanie/.test(ctx.headwear)) {
            const family = /bowler/.test(ctx.headwear) ? 'bowler' : ctx.headwear;
            let shape = crown;
            if (/bowler|fedora|wide-brim-hat/.test(ctx.headwear)) {
                shape = '<path data-svg-african-role="rear-hat-crown shaped-rear-crown" d="M19 48 C16 24 30 9 54 9 C77 9 93 26 90 51 C70 56 39 55 19 48 Z" fill="var(--headwear)"/>';
                if (ctx.headwear === 'fedora') shape += '<path data-svg-african-role="rear-fedora-crease" d="M34 20 C44 15 63 15 74 23" stroke="var(--headwear-shade)" stroke-width="3" fill="none"/>';
            } else if (ctx.headwear === 'top-hat') {
                shape = '<path data-svg-african-role="rear-top-hat tall-rear-crown" d="M23 6 C38 2 69 3 84 8 L89 51 C69 57 37 56 20 49 Z" fill="var(--headwear)"/>';
            } else if (ctx.headwear === 'bucket-hat') {
                shape = '<path data-svg-african-role="rear-bucket-hat soft-rear-crown" d="M17 48 L23 15 C41 10 70 11 86 18 L93 53 C71 59 38 58 17 48 Z" fill="var(--headwear)"/>';
            }
            if (ctx.headwear === 'beanie') return finish(shape + band, family);
            const wide = ctx.headwear === 'wide-brim-hat';
            const brim = `<path data-svg-african-role="rear-hat-brim curved-ear-clear-margin" d="M${wide ? 1 : 6} 48 C29 53 77 55 ${wide ? 103 : 100} 50 C82 64 25 63 ${wide ? 1 : 6} 48 Z" fill="var(--headwear-shade)"/>`;
            return finish(shape + '<path data-svg-african-role="rear-hat-ribbon" d="M21 43 C42 49 70 50 90 45 L89 51 C68 57 40 55 20 49 Z" fill="var(--headwear-shade)"/>' + brim, family);
        }
        return finish(crown + band, 'fitted-cap');
    }

    function renderHeadwear(ctx) {
        if (!ctx.hasHeadwear) return '';
        if (ctx.back) {
            const rear = renderRearHeadwear(ctx);
            if (rear) return rear;
        }
        if (/hijab|layered-hijab|khimar/.test(ctx.headwear)) {
            const layered = ctx.headwear === 'layered-hijab';
            const khimar = ctx.headwear === 'khimar';
            const outerBottom = khimar ? 153 : 145;
            const shape = `<path data-svg-african-role="modest-headwear face-opening-cutout neck-cover ear-cover no-face-overpaint" fill="var(--headwear)" fill-rule="evenodd" clip-rule="evenodd" d="M9 57 C6 24 27 3 57 4 C87 5 100 29 94 65 C92 88 95 119 91 ${outerBottom} C76 ${outerBottom + 2} 65 ${outerBottom - 1} 54 ${outerBottom - 4} C41 ${outerBottom} 26 ${outerBottom + 2} 9 ${outerBottom - 1} C12 117 8 84 9 57 Z M28 53 C39 45 65 44 81 53 C86 66 84 82 77 94 C72 103 64 109 54 111 C43 109 34 103 29 94 C24 82 23 65 28 53 Z"/>
${layered ? '<path data-svg-african-role="layered-hijab outer-drape" d="M12 91 C23 116 28 134 22 151 M89 91 C80 117 76 137 83 152" fill="none" stroke="var(--headwear-shade)" stroke-width="6" opacity=".7" stroke-linecap="round"/>' : ''}
${khimar ? '<path data-svg-african-role="khimar shoulder-drape" d="M8 119 C24 135 38 143 53 146 C69 143 83 135 93 119 L99 153 L4 153 Z" fill="var(--headwear)" opacity=".98"/>' : ''}`;
            return wrapHeadwearFit(shape, ctx, khimar ? 'khimar' : 'hijab');
        }
        if (ctx.headwear === 'niqab') {
            return wrapHeadwearFit('<path data-svg-african-role="niqab full-head-cover full-neck-cover eye-opening-cutout no-eye-overpaint" fill="var(--headwear)" fill-rule="evenodd" clip-rule="evenodd" d="M8 56 C6 23 27 3 57 4 C88 5 100 30 94 67 L91 153 L9 153 Z M27 51 C42 46 69 46 84 52 L82 72 C68 68 43 68 28 73 Z"/><path data-svg-african-role="niqab veil-fold" d="M19 84 C39 91 69 91 88 83 M17 110 C39 117 70 117 89 109" fill="none" stroke="var(--headwear-shade)" stroke-width="1.5" opacity=".42"/>', ctx, 'niqab');
        }
        if (ctx.headwear === 'academic-cap') {
            return wrapHeadwearFit('<path id="headwear-cap" data-svg-african-role="mortarboard fitted-cap" d="M19 48 C20 29 36 18 58 18 C78 18 89 31 89 49 C70 44 39 44 19 48 Z" fill="var(--headwear-shade)"/><path id="headwear-board" data-svg-african-role="mortarboard board" d="M9 27 L57 7 L99 29 L53 48 Z" fill="var(--headwear)"/><path data-svg-african-role="mortarboard tassel side-drop" d="M58 9 C75 17 89 28 91 43 L91 62" fill="none" stroke="var(--accent)" stroke-width="2.2" stroke-linecap="round"/><circle cx="91" cy="65" r="3" fill="var(--accent)"/>', ctx, 'mortarboard');
        }
        if (/gele|wrapped-gele|niger-delta-head-tie|turban/.test(ctx.headwear)) {
            let family = 'headwrap';
            let shape = '';
            if (ctx.headwear === 'turban') {
                family = 'turban';
                shape = '<path data-svg-african-role="turban wrapped-crown" d="M13 48 C12 23 30 8 56 8 C81 9 94 27 91 49 C70 44 35 44 13 48 Z" fill="var(--headwear)"/><path d="M18 34 C39 17 68 17 88 35 M26 43 C42 29 68 27 84 41" fill="none" stroke="var(--headwear-shade)" stroke-width="4" opacity=".65"/><ellipse cx="59" cy="31" rx="7" ry="8" fill="var(--accent)" opacity=".72"/>';
            } else if (ctx.headwear === 'niger-delta-head-tie') {
                family = 'niger-delta-head-tie';
                shape = '<path data-svg-african-role="head-tie wrapped-crown" d="M14 48 C12 26 28 10 55 9 C79 9 92 27 90 49 C69 44 35 44 14 48 Z" fill="var(--headwear)"/><path data-svg-african-role="head-tie fan" d="M18 35 C5 25 5 10 15 5 C26 14 35 25 42 38 C57 22 75 11 91 9 C97 22 88 36 78 44 Z" fill="var(--headwear)"/><path d="M20 12 C30 22 35 31 40 40 M88 16 C75 23 67 31 61 42" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".55"/>';
            } else {
                family = 'gele';
                const wrapped = ctx.headwear === 'wrapped-gele';
                shape = `<path data-svg-african-role="gele base-wrap" d="M12 48 C10 25 29 10 55 9 C82 10 95 28 91 49 C69 43 34 44 12 48 Z" fill="var(--headwear)"/><path data-svg-african-role="gele crown-fan" d="${wrapped ? 'M15 35 C20 15 37 5 58 7 C78 8 92 22 91 40 C75 33 67 27 58 17 C48 28 34 34 15 35 Z' : 'M12 36 C7 21 13 8 25 4 C31 18 39 27 49 35 C49 17 57 4 68 2 C73 17 80 27 92 34 C78 43 29 44 12 36 Z'}" fill="var(--headwear)"/><path d="M20 39 C38 31 68 31 87 40" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".48"/>`;
            }
            return wrapHeadwearFit(shape, ctx, family);
        }
        if (/bowler/.test(ctx.headwear)) {
            return wrapHeadwearFit('<path data-svg-african-role="bowler crown" d="M23 45 C22 24 37 12 59 12 C79 13 89 27 87 46 Z" fill="var(--headwear)"/><path data-svg-african-role="bowler band" d="M24 39 C43 35 69 35 86 41 L86 47 C66 43 43 43 23 47 Z" fill="var(--headwear-shade)"/><path data-svg-african-role="bowler brim" d="M7 47 C31 42 77 43 99 49 C77 56 29 55 7 47 Z" fill="var(--headwear-shade)"/>', ctx, 'bowler');
        }
        if (/hausa/.test(ctx.headwear)) {
            const embroidery = ctx.headwear === 'hausa-embroidered-cap'
                ? '<path data-svg-african-role="hausa-embroidery" d="M24 23 L31 18 L38 24 L45 18 L52 24 L59 18 L66 24 L73 18 L82 25 M24 34 C39 29 65 29 82 35" fill="none" stroke="var(--accent)" stroke-width="1.7" opacity=".82"/>'
                : '<path d="M25 35 C40 30 65 30 82 35" fill="none" stroke="var(--accent)" stroke-width="1.4" opacity=".5"/>';
            return wrapHeadwearFit(`<path data-svg-african-role="hausa-cap cylindrical-cap fitted-crown" d="M22 16 C40 10 66 10 84 18 L86 47 C67 43 42 43 22 48 Z" fill="var(--headwear)"/>${embroidery}`, ctx, 'hausa-cap');
        }
        if (/yoruba-fila|^fila$/.test(ctx.headwear)) {
            return wrapHeadwearFit('<path data-svg-african-role="yoruba-fila folded-cap" d="M18 47 C18 26 31 13 51 12 C65 11 78 17 89 27 L85 46 C65 41 39 42 18 47 Z" fill="var(--headwear)"/><path data-svg-african-role="fila-fold" d="M50 13 C60 23 70 30 84 34 M24 37 C42 30 62 31 84 41" fill="none" stroke="var(--headwear-shade)" stroke-width="2.4" opacity=".66"/>', ctx, 'yoruba-fila');
        }
        if (ctx.headwear === 'fulani-hat') {
            return wrapHeadwearFit('<path data-svg-african-role="fulani-hat conical-hat" d="M52 2 L94 45 C72 51 31 51 8 44 Z" fill="var(--headwear)"/><path d="M52 7 L53 43 M24 35 C43 30 67 31 84 38" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".58"/><path d="M7 44 C32 39 76 40 99 47 C77 53 30 53 7 44 Z" fill="var(--headwear-shade)"/>', ctx, 'fulani-conical');
        }
        if (ctx.headwear === 'abeti-aja') {
            return wrapHeadwearFit('<path data-svg-african-role="abeti-aja folded-wing-cap" d="M19 46 L7 15 C24 21 37 29 51 40 C61 24 78 13 97 11 L86 47 C67 42 39 42 19 46 Z" fill="var(--headwear)"/><path d="M13 20 C29 29 39 36 49 44 M91 17 C75 26 64 35 56 45" fill="none" stroke="var(--accent)" stroke-width="2" opacity=".55"/>', ctx, 'abeti-aja');
        }
        if (/coral|igbo-red-cap|isi-agu-cap|kufi|crown-cap/.test(ctx.headwear)) {
            let family = 'regional-cap';
            let shape = '<path data-svg-african-role="regional-cap fitted-cap" d="M17 47 C17 25 33 12 57 12 C79 13 91 28 89 48 C69 43 38 43 17 47 Z" fill="var(--headwear)"/>';
            if (/coral|crown-cap/.test(ctx.headwear)) {
                family = 'coral-crown';
                shape += '<path data-svg-african-role="coral-beads crown-beads" d="M23 26 C39 18 66 18 83 27 M21 36 C40 29 67 29 86 37" fill="none" stroke="var(--accent)" stroke-width="4" stroke-dasharray="1 5" stroke-linecap="round"/>';
            } else if (ctx.headwear === 'igbo-red-cap') {
                family = 'igbo-red-cap';
                shape = '<path data-svg-african-role="igbo-red-cap asymmetric-regional-cap" d="M16 47 C18 29 33 18 54 17 C71 17 84 24 91 35 L87 48 C68 43 37 43 16 47 Z" fill="var(--headwear)"/><path d="M24 38 C43 32 69 33 87 41" fill="none" stroke="var(--accent)" stroke-width="1.7" opacity=".66"/>';
            } else if (ctx.headwear === 'isi-agu-cap') {
                family = 'isi-agu-cap';
                shape += '<path data-svg-african-role="isi-agu-pattern" d="M28 29 L34 24 L40 30 L46 24 L52 30 L58 24 L64 30 L70 24 L78 31" fill="none" stroke="var(--accent)" stroke-width="1.6"/>';
            } else {
                family = 'kufi';
                shape = '<path data-svg-african-role="kufi rounded-cap" d="M19 47 C19 25 35 14 57 14 C78 14 89 28 88 48 C68 43 39 43 19 47 Z" fill="var(--headwear)"/><path d="M26 30 C42 24 65 24 81 31" fill="none" stroke="var(--accent)" stroke-width="1.5" opacity=".64"/>';
            }
            return wrapHeadwearFit(shape, ctx, family);
        }
        if (/construction|chef/.test(ctx.headwear)) {
            const chef = ctx.headwear === 'chef-hat';
            const shape = chef
                ? '<path data-svg-african-role="chef-toque puffed-crown" d="M14 45 C5 34 12 20 27 18 C31 5 48 1 59 11 C72 2 89 11 88 25 C100 29 101 41 91 47 C69 43 35 42 14 45 Z" fill="var(--headwear)"/><path data-svg-african-role="toque-band" d="M18 42 C38 47 72 48 91 44 L89 51 C69 47 38 47 19 50 Z" fill="var(--headwear-shade)"/>'
                : '<path data-svg-african-role="construction-helmet safety-helmet" d="M13 45 C13 23 31 8 58 8 C84 9 96 27 93 46 C72 41 35 41 13 45 Z" fill="var(--headwear)"/><path d="M57 11 C54 23 54 34 57 45" fill="none" stroke="var(--accent)" stroke-width="4" opacity=".56"/><path data-svg-african-role="helmet-brim" d="M6 46 C31 40 76 40 99 47 C79 53 28 53 6 46 Z" fill="var(--headwear-shade)"/>';
            return wrapHeadwearFit(shape, ctx, chef ? 'chef-toque' : 'construction-helmet');
        }
        if (/pilot-cap|security-cap|military-beret/.test(ctx.headwear)) {
            if (ctx.headwear === 'military-beret') {
                return wrapHeadwearFit('<path data-svg-african-role="military-beret asymmetric-beret" d="M15 43 C20 20 42 10 68 14 C84 17 94 27 91 39 C75 37 65 37 55 45 C39 42 27 42 15 43 Z" fill="var(--headwear)"/><path d="M18 43 C39 39 69 40 89 45" fill="none" stroke="var(--headwear-shade)" stroke-width="4"/>', ctx, 'military-beret');
            }
            const badge = ctx.headwear === 'pilot-cap' ? 'wing-badge' : 'shield-badge';
            return wrapHeadwearFit(`<path data-svg-african-role="service-cap ${ctx.headwear}" d="M17 45 C19 25 35 14 58 14 C78 14 89 27 89 45 C69 41 38 41 17 45 Z" fill="var(--headwear)"/><path data-svg-african-role="service-cap-band" d="M20 38 C40 34 68 34 86 39 L87 46 C67 42 39 42 19 46 Z" fill="var(--headwear-shade)"/><path data-svg-african-role="service-cap-visor" d="M45 43 C62 40 81 42 95 47 C84 51 67 51 51 48 Z" fill="var(--ink)"/><circle data-svg-african-role="${badge}" cx="58" cy="31" r="4" fill="var(--accent)"/>`, ctx, ctx.headwear);
        }
        if (/fedora|wide-brim-hat|cloche-hat|bucket-hat|baseball-cap|beanie|top-hat/.test(ctx.headwear)) {
            let family = ctx.headwear;
            let shape = '';
            if (ctx.headwear === 'fedora') {
                shape = '<path data-svg-african-role="fedora pinched-crown" d="M24 43 C25 22 39 12 59 13 C77 14 87 27 85 44 Z" fill="var(--headwear)"/><path d="M28 35 C43 31 67 31 83 37" fill="none" stroke="var(--headwear-shade)" stroke-width="5"/><path data-svg-african-role="fedora-brim" d="M8 44 C31 39 77 40 98 47 C75 52 29 52 8 44 Z" fill="var(--headwear-shade)"/>';
            } else if (ctx.headwear === 'wide-brim-hat') {
                shape = '<path data-svg-african-role="wide-brim-crown" d="M25 42 C26 24 39 14 58 14 C76 14 86 26 85 43 Z" fill="var(--headwear)"/><path data-svg-african-role="wide-brim" d="M1 43 C29 36 79 37 103 46 C77 53 26 53 1 43 Z" fill="var(--headwear-shade)"/>';
            } else if (ctx.headwear === 'cloche-hat') {
                shape = '<path data-svg-african-role="cloche bell-crown" d="M16 47 C15 22 33 7 57 8 C82 9 93 27 91 48 C69 43 37 43 16 47 Z" fill="var(--headwear)"/><path d="M18 40 C39 36 70 36 90 42" fill="none" stroke="var(--accent)" stroke-width="2"/>';
            } else if (ctx.headwear === 'bucket-hat') {
                shape = '<path data-svg-african-role="bucket-hat soft-crown" d="M22 42 L27 15 C44 10 67 11 82 18 L87 43 Z" fill="var(--headwear)"/><path data-svg-african-role="bucket-brim" d="M10 43 C31 37 78 38 96 47 C75 53 31 52 10 43 Z" fill="var(--headwear-shade)"/>';
            } else if (ctx.headwear === 'baseball-cap') {
                shape = '<path data-svg-african-role="baseball-cap panel-cap" d="M17 46 C18 25 35 11 58 12 C80 13 91 29 89 47 C68 41 38 42 17 46 Z" fill="var(--headwear)"/><path d="M57 13 L57 43" stroke="var(--headwear-shade)" stroke-width="1.5"/><path data-svg-african-role="baseball-visor directional-visor" d="M60 43 C77 40 94 43 102 49 C90 51 75 50 62 47 Z" fill="var(--headwear-shade)"/>';
            } else if (ctx.headwear === 'beanie') {
                shape = '<path data-svg-african-role="beanie knit-cap" d="M17 47 C17 22 34 8 57 8 C80 9 92 27 89 48 C69 43 38 43 17 47 Z" fill="var(--headwear)"/><path data-svg-african-role="beanie-cuff" d="M18 38 C39 34 69 34 88 40 L88 48 C68 44 39 44 18 48 Z" fill="var(--headwear-shade)"/>';
            } else if (ctx.headwear === 'top-hat') {
                shape = '<path data-svg-african-role="top-hat tall-crown" d="M27 8 L82 10 L84 43 C68 39 43 39 25 43 Z" fill="var(--headwear)"/><path data-svg-african-role="top-hat-band" d="M26 34 C43 31 68 31 83 35 L84 42 C67 38 43 38 25 42 Z" fill="var(--headwear-shade)"/><path data-svg-african-role="top-hat-brim" d="M9 43 C32 38 77 39 98 46 C76 52 30 51 9 43 Z" fill="var(--headwear-shade)"/>';
            }
            return wrapHeadwearFit(shape, ctx, family);
        }
        return wrapHeadwearFit('<path data-svg-african-role="fitted-cap distinct-default-cap" d="M16 47 C14 25 31 9 57 9 C82 10 94 28 90 48 C69 43 37 43 16 47 Z" fill="var(--headwear)"/><path d="M21 39 C40 34 69 35 87 41" fill="none" stroke="var(--headwear-shade)" stroke-width="2.5" stroke-linecap="round"/>', ctx, 'fitted-cap');
    }

    function renderFrontHair(ctx) {
        if (ctx.hasHeadwear) return '';
        if (ctx.hair === 'bald') return '';
        if (ctx.afroHair) {
            return `<path id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline asymmetric-hairline full-scalp-cover brow-clear" d="M14 59 C7 43 12 26 26 19 C30 5 46 2 56 10 C69 2 87 14 87 31 C94 38 92 49 86 57 L82 47 C72 40 63 37 53 37 C42 36 32 41 25 49 C21 53 19 57 18 61 Z" fill="url(#hairGrad3q)"/>`;
        }
        if (ctx.bunHair) {
            return `<path id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline asymmetric-hairline fitted-scalp-hair full-scalp-cover brow-clear" d="M15 59 C11 33 28 13 52 10 C70 9 84 19 89 34 L86 48 C78 42 70 38 61 37 C51 35 41 38 33 43 C26 47 22 53 19 61 Z" fill="url(#hairGrad3q)"/>`;
        }
        if (BRAID_HAIR.has(ctx.hair)) {
            return `<g id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline braided-hair ${ctx.hair} full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="hair-cap scalp-cover fitted-braid-cap directional-scalp asymmetric-hairline" d="M15 59 C11 32 27 11 52 8 C71 7 85 18 90 34 L87 48 C79 42 71 38 62 37 C51 35 41 38 33 43 C26 47 22 53 20 61 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="braid-root-sections" d="M28 43 C34 26 43 14 52 9 M39 39 C43 24 48 14 52 9 M52 36 C53 23 53 15 52 9 M65 38 C63 24 58 14 52 9 M78 43 C73 27 63 16 52 9" fill="none" stroke="var(--hair-light)" stroke-width="1" opacity=".38" stroke-linecap="round"/>
<path data-svg-african-role="temple-braid far-temple" d="M19 54 C16 70 18 86 14 101" fill="none" stroke="var(--hair)" stroke-width="5" stroke-linecap="round"/>
</g>`;
        }
        if (LOC_TWIST_HAIR.has(ctx.hair)) {
            return `<g id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline loc-twist-hair ${ctx.hair} full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="hair-cap scalp-cover fitted-textured-cap directional-scalp asymmetric-hairline" d="M15 59 C11 32 27 11 52 8 C71 7 85 18 90 34 L87 48 C79 42 71 38 62 37 C51 35 41 38 33 43 C26 47 22 53 20 61 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="front-lock far-temple" d="M19 52 C16 70 20 87 14 105" fill="none" stroke="var(--hair)" stroke-width="6.5" stroke-linecap="round"/>
<path d="M29 39 C42 22 65 17 80 34" fill="none" stroke="var(--hair-light)" stroke-width="1.3" opacity=".28" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.longHair) {
            return `<g id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline smooth-long-hair ${ctx.hair} full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="hair-cap scalp-cover directional-scalp asymmetric-hairline" d="M15 59 C11 32 27 11 52 8 C71 7 85 18 90 34 L87 48 C79 42 71 38 62 37 C51 35 41 38 33 43 C26 47 22 53 20 61 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="hair-front side-strand trailing-temple" d="M19 51 C16 68 19 86 14 101 C12 108 15 113 20 111 C27 97 27 76 25 57 Z" fill="var(--hair)"/>
<path data-svg-african-role="hair-front highlight" d="M28 34 C43 22 65 20 79 32" fill="none" stroke="var(--hair-light)" stroke-width="1.8" opacity=".26" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.closeCropHair) {
            return `<g id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline asymmetric-hairline close-crop ${ctx.hair} fitted-scalp-hair full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="close-crop-front scalp-cover natural-temple-line" d="M17 57 C15 40 29 24 49 20 C67 17 81 27 86 40 L85 48 C77 43 68 40 59 39 C49 38 40 40 32 45 C26 49 22 53 19 59 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="fade-line" d="M19 54 C26 48 34 44 42 42 M78 40 C82 43 84 46 85 50" fill="none" stroke="var(--hair-light)" stroke-width=".9" opacity=".24" stroke-linecap="round"/>
</g>`;
        }
        if (ctx.styledShortHair) {
            return `<g id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline asymmetric-hairline styled-short-hair ${ctx.hair} full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}">
<path data-svg-african-role="styled-short-front scalp-cover textured-fringe" d="M16 58 C13 43 16 30 24 22 L23 15 L34 19 L38 9 L46 16 L53 5 L60 15 L70 8 L70 19 L81 14 L78 25 C84 31 87 39 88 47 C79 41 70 37 60 36 C49 35 39 39 31 44 C24 49 21 54 19 60 Z" fill="url(#hairGrad3q)"/>
<path data-svg-african-role="styled-hair-flow" d="M27 31 C39 19 55 15 73 22 M34 40 C48 30 64 29 80 36" fill="none" stroke="var(--hair-light)" stroke-width="1.1" opacity=".3" stroke-linecap="round"/>
</g>`;
        }
        return `<path id="hair-front" data-svg-african-role="hair hair-front hairline directional-hairline asymmetric-hairline fitted-scalp-hair ${ctx.hair} full-scalp-cover brow-clear" data-svg-african-hair-style="${ctx.hair}" d="M16 58 C12 32 28 14 52 11 C68 10 81 18 87 32 L85 46 C77 40 69 37 60 36 C50 35 40 38 32 43 C25 47 22 53 19 60 Z" fill="url(#hairGrad3q)"/>`;
    }

    function compileFrontThreeQuarterHeadLandmarks(ctx) {
        const a = ctx.adjustments || {};
        const headProfile = globalThis.SvgAfricanPremiumAssets?.headTypeProfiles?.[ctx.headType];
        const balancedHead = globalThis.SvgAfricanPremiumAssets?.headTypeProfiles?.balanced;
        const headTypeScale = headProfile && balancedHead ? [
            1 + (headProfile.frontWidth - balancedHead.frontWidth) * 0.025,
            1 + (headProfile.frontHeight - balancedHead.frontHeight) * 0.015
        ] : {
            'round-cranium': [1.025, 0.99],
            'long-narrow': [0.975, 1.025],
            'broad-short': [1.04, 0.975],
            'high-crown': [1, 1.025],
            'low-crown': [1.01, 0.98]
        }[ctx.headType] || [1, 1];
        const shape = {
            round: { cheek: 1.1, farJaw: -1.1, nearJaw: 1, chinX: -0.3, chinY: -2.2 },
            heart: { cheek: 0.7, farJaw: 1.5, nearJaw: -1.4, chinX: 0.5, chinY: 1.1 },
            square: { cheek: 0.35, farJaw: -1.4, nearJaw: 1.7, chinX: 0.35, chinY: -0.4 },
            long: { cheek: -0.35, farJaw: 0.3, nearJaw: -0.2, chinX: 0.4, chinY: 3.2 },
            'soft-diamond': { cheek: 1.25, farJaw: 0.8, nearJaw: -0.8, chinX: 0.2, chinY: 0.9 }
        }[ctx.faceShape] || { cheek: 0, farJaw: 0, nearJaw: 0, chinX: 0, chinY: 0 };
        const shapeStrength = clamp(0.42 + clamp(a.faceShapeStrength || 0, -1, 1) * 0.28, 0.14, 0.72);
        const presentationProfile = ctx.facialStyle?.presentation || {};
        const presentationWidth = ctx.presentation === 'male' ? 0.7 : (ctx.presentation === 'female' ? -0.25 : 0.1);
        const faceWidthDelta = clamp(a.faceWidth || 0, -0.5, 0.5) * 7 + presentationWidth;
        const foreheadProjection = clamp(a.foreheadProjection || 0, -0.5, 0.55) * 3.2;
        const browRidge = clamp(a.browRidge || 0, -0.5, 0.55) * 1.8;
        const cheekFullness = clamp(a.cheekFullness || 0, -0.5, 0.55) * 4.2;
        const jawDepth = clamp(a.jawDepth || 0, -0.5, 0.55) * 4.0 + (presentationProfile.jawScale || 0) * 18;
        const chinProjection = clamp(a.chinProjection || 0, -0.5, 0.55) * 3.6 + (presentationProfile.chinScale || 0) * 12;
        const chinHeight = clamp(a.chinHeight || 0, -0.5, 0.5) * 4.2 + (presentationProfile.chinDrop || 0) * 3;
        const occiputDepth = clamp(a.occiputDepth || 0, -0.5, 0.55) * 3.2;
        const eyeSpacingDelta = clamp(a.eyeSpacing || 0, -0.5, 0.5) * 4.5 + (ctx.facialStyle?.eyes.spacing || 0);
        const eyeHeightDelta = clamp(a.eyeHeight || 0, -0.5, 0.5) * -3.6;
        const noseStyleWidth = ctx.facialStyle?.nose.threeQuarterWidth
            ?? (ctx.noseStyle === 'broad' ? 1.15 : (ctx.noseStyle === 'narrow' ? -0.85 : 0));
        const noseWidthDelta = noseStyleWidth + clamp(a.noseWidth || 0, -0.5, 0.5) * 4 + (presentationProfile.noseWidth || 0) * 4;
        const noseLengthDelta = clamp(a.noseLength || 0, -0.5, 0.5) * 3.2 + (presentationProfile.noseLength || 0) * 4;
        const lipHeightDelta = clamp(a.lipHeight || 0, -0.5, 0.5) * -3;
        const lipWidthScale = (ctx.facialStyle?.lips.width || 1)
            * (1 + clamp(a.lipWidth || 0, -0.5, 0.5) * 0.55 + (presentationProfile.lipWidth || 0));
        const headWidth = (1 + clamp(a.headWidth ?? a.headScale ?? 0, -0.45, 0.55) * 0.18) * headTypeScale[0];
        const headHeight = (1 + clamp(a.headHeight ?? a.headScale ?? 0, -0.45, 0.55) * 0.14) * headTypeScale[1];
        const farTempleX = 30.5 - faceWidthDelta * 0.32 - occiputDepth * 0.65;
        const nearTempleX = 81.2 + faceWidthDelta * 0.32 + foreheadProjection * 0.58;
        const farCheekX = 25.8 - faceWidthDelta * 0.45 - shape.cheek * shapeStrength - cheekFullness * 0.54;
        const nearCheekX = 85.2 + faceWidthDelta * 0.44 + shape.cheek * shapeStrength + cheekFullness * 0.62;
        const farJawX = 36.4 - faceWidthDelta * 0.4 + shape.farJaw * shapeStrength - jawDepth * 0.52;
        const nearJawX = 74.8 + faceWidthDelta * 0.4 + shape.nearJaw * shapeStrength + jawDepth * 0.66;
        const chinX = 60.2 + shape.chinX * shapeStrength + faceWidthDelta * 0.08 + chinProjection;
        const chinY = 110.8 + shape.chinY * shapeStrength + chinHeight;
        const farEyeX = 43.8 - eyeSpacingDelta;
        const nearEyeX = 73.8 + eyeSpacingDelta * 0.75;
        const farEyeY = 63.2 + eyeHeightDelta;
        const nearEyeY = 62.1 + eyeHeightDelta;
        const noseBridgeX = 61.1 + noseWidthDelta * 0.1 + browRidge * 0.25;
        const noseTipX = 66.7 + noseWidthDelta;
        const noseTipY = 78.2 + noseLengthDelta;
        const mouthCenterX = 61.2 + noseWidthDelta * 0.12;
        const mouthY = 89.5 + lipHeightDelta;
        const mouthHalfFar = 10.8 * lipWidthScale;
        const mouthHalfNear = 8.8 * lipWidthScale;
        return Object.freeze({
            headWidth,
            headHeight,
            shapeStrength,
            foreheadControlX: 79.2 + foreheadProjection,
            farTempleX,
            nearTempleX,
            farCheekX,
            nearCheekX,
            farJawX,
            nearJawX,
            chinX,
            chinY,
            farEyeX,
            nearEyeX,
            farEyeY,
            nearEyeY,
            noseBridgeX,
            noseTipX,
            noseTipY,
            mouthCenterX,
            mouthY,
            mouthLeft: mouthCenterX - mouthHalfFar,
            mouthRight: mouthCenterX + mouthHalfNear,
            earX: 22 - occiputDepth * 0.35,
            earY: 75.5 - clamp(a.earHeight || 0, -0.5, 0.5) * 6,
            earScale: 1 + clamp(a.earSize || 0, -0.5, 0.5) * 0.54
        });
    }

    function renderFrontHead(ctx, palette) {
        const a = ctx.adjustments || {};
        const f = ctx.faceState || {};
        const source = compileFrontThreeQuarterHeadLandmarks(ctx);
        const yaw = ctx.sharedHeadYaw === null ? null : Math.sign(ctx.sharedHeadYaw) * (Math.min(1, Math.abs(ctx.sharedHeadYaw)) + Math.max(0, Math.abs(ctx.sharedHeadYaw) - 1) * .45);
        const m = { ...source };
        if (yaw !== null) {
            // One topology and one identity across the complete turn. Symmetric
            // landmarks retain the user's shape adjustments at the neutral angle.
            const pair = (left, right, center = 52) => {
                const half = (source[right] - source[left]) / 2;
                const shift = ((source[left] + source[right]) / 2 - center) * yaw;
                m[left] = center - half + shift; m[right] = center + half + shift;
            };
            pair('farTempleX', 'nearTempleX'); pair('farCheekX', 'nearCheekX'); pair('farJawX', 'nearJawX'); pair('farEyeX', 'nearEyeX');
            for (const key of ['chinX', 'noseBridgeX', 'noseTipX', 'mouthCenterX']) m[key] = 52 + (source[key] - 52) * yaw;
            const eyeY = (source.farEyeY + source.nearEyeY) / 2;
            m.farEyeY = eyeY + (source.farEyeY - eyeY) * yaw;
            m.nearEyeY = eyeY + (source.nearEyeY - eyeY) * yaw;
            const half = (source.mouthRight - source.mouthLeft) / 2;
            m.mouthLeft = m.mouthCenterX - half; m.mouthRight = m.mouthCenterX + half;
            m.earX = 19 + 3 * yaw;
        }
        const profile = Math.max(0, Math.abs(ctx.sharedHeadYaw || 0)-2);
        const profileLeft = (ctx.sharedHeadYaw || 0)<0;
        const px = x => profileLeft ? 104-x : x;
        if(profile) {
            const targets={farEyeX:px(profileLeft?94:72),nearEyeX:px(profileLeft?72:94),noseBridgeX:px(79),noseTipX:px(89),mouthCenterX:px(78),mouthLeft:px(profileLeft?82:74),mouthRight:px(profileLeft?74:82),chinX:px(66),earX:px(36)};
            for(const [key,value] of Object.entries(targets))m[key]+=(value-m[key])*profile;
        }
        const eyeScale = 1 + clamp(a.eyeSize || 0, -0.5, 0.5) * 0.6;
        const browLift = clamp(a.browHeight || 0, -0.5, 0.5) * -6 - clamp(f.browRaise || 0, -6, 6);
        const browLength = 1 + clamp(a.browLength || 0, -0.5, 0.55) * 0.62;
        const browStroke = (1 + clamp(a.browLength || 0, -0.5, 0.55) * 0.24)
            * (1 + (ctx.facialStyle?.presentation.browStroke || 0) * 0.5);
        const blink = clamp(f.blink || 0, 0, 1);
        const mouthWide = clamp(f.mouthWide || 0, -1, 1);
        const mouthRound = clamp(f.mouthRound || 0, 0, 1);
        const lipPress = clamp(f.lipPress || 0, 0, 1);
        const jawOpen = clamp(f.jawOpen || 0, 0, 1);
        const upperLipLift = clamp(f.upperLipLift || 0, -1, 1);
        const lowerLipDrop = clamp(f.lowerLipDrop || 0, -1, 1);
        const mouthOpen = clamp((f.mouthOpen || 0) + jawOpen * 0.42 - lipPress * 0.22, 0, 1);
        const smile = clamp((f.smile || 0) + 0.08, -1, 1);
        const gazeX = (yaw === null ? 1 : yaw) + clamp(f.gazeX || 0, -8, 8) * (ctx.left ? -0.16 : 0.16);
        const gazeY = clamp(f.gazeY || 0, -5, 5) * 0.16;
        const headNod = clamp(f.headNod || 0, -8, 8);
        const headTilt = clamp(f.headTilt || 0, -8, 8);
        const glasses = ctx.accessories.has('glasses');
        const earrings = ctx.presentation === 'female' && (ctx.accessories.has('earrings') || ctx.accessories.has('ear-rings'));
        const eyeStyleScale = ctx.facialStyle ? [ctx.facialStyle.eyes.halfWidth / 7.7, ctx.facialStyle.eyes.halfHeight / 3.4] : {
            round: [0.98, 1.08],
            hooded: [1.02, 0.8],
            wide: [1.08, 0.96]
        }[ctx.eyeStyle] || [1, 1];
        const farEyeHalfWidth = (yaw === null ? 6.8 : 5.7 + 1.1 * yaw) * eyeScale * eyeStyleScale[0];
        const nearEyeHalfWidth = (yaw === null ? 4.6 : 5.7 - 1.1 * yaw) * eyeScale * eyeStyleScale[0];
        const farEyeHalfHeight = Math.max(0.3, (yaw === null ? 2.8 : 2.425 + .375 * yaw) * eyeScale * eyeStyleScale[1] * (1 - blink * 0.9));
        const nearEyeHalfHeight = Math.max(0.3, (yaw === null ? 2.05 : 2.425 - .375 * yaw) * eyeScale * eyeStyleScale[1] * (1 - blink * 0.9));
        const eyePath = (cx, cy, halfWidth, halfHeight) => `M${(cx - halfWidth).toFixed(2)} ${cy.toFixed(2)} C${(cx - halfWidth * 0.35).toFixed(2)} ${(cy - halfHeight).toFixed(2)} ${(cx + halfWidth * 0.4).toFixed(2)} ${(cy - halfHeight).toFixed(2)} ${(cx + halfWidth).toFixed(2)} ${cy.toFixed(2)} C${(cx + halfWidth * 0.35).toFixed(2)} ${(cy + halfHeight).toFixed(2)} ${(cx - halfWidth * 0.4).toFixed(2)} ${(cy + halfHeight).toFixed(2)} ${(cx - halfWidth).toFixed(2)} ${cy.toFixed(2)} Z`;
        let facePath = yaw !== null
            ? `M${m.farTempleX} 39.5 C${m.farTempleX + 4} 26 40 21 ${52 + 10 * yaw} 21 C70 21 ${m.nearTempleX - 4} 26 ${m.nearTempleX} 39.5 C${m.nearTempleX + 3} 52 ${m.nearCheekX} 58 ${m.nearCheekX} 70 C${m.nearCheekX} 86 ${m.nearJawX + 4} 96 ${m.nearJawX} 101 C${m.nearJawX - 5} 107 ${m.chinX + 8} ${m.chinY} ${m.chinX} ${m.chinY} C${m.chinX - 8} ${m.chinY} ${m.farJawX + 5} 107 ${m.farJawX} 101 C${m.farJawX - 4} 96 ${m.farCheekX} 86 ${m.farCheekX} 70 C${m.farCheekX} 58 ${m.farTempleX - 3} 52 ${m.farTempleX} 39.5 Z`
            : `M${m.farTempleX.toFixed(2)} 39.5 C36 28.5 48.2 21.5 62 21 C73.2 21.2 ${m.foreheadControlX.toFixed(2)} 27.8 ${m.nearTempleX.toFixed(2)} 39.5 C${(m.nearTempleX + 3).toFixed(2)} 48 ${(m.nearCheekX + 1.3).toFixed(2)} 58 ${(m.nearCheekX + 1.6).toFixed(2)} 68.5 C${(m.nearCheekX + .6).toFixed(2)} 79.2 ${m.nearCheekX.toFixed(2)} 89.8 ${m.nearJawX.toFixed(2)} 99.8 C${(m.nearJawX - 5).toFixed(2)} 106 ${(m.chinX + 7).toFixed(2)} ${m.chinY.toFixed(2)} ${m.chinX.toFixed(2)} ${m.chinY.toFixed(2)} C${(m.chinX - 9).toFixed(2)} ${(m.chinY + .15).toFixed(2)} ${(m.farJawX + 5).toFixed(2)} 107 ${m.farJawX.toFixed(2)} 101.2 C${(m.farJawX - 6).toFixed(2)} 95 ${m.farCheekX.toFixed(2)} 86.8 ${m.farCheekX.toFixed(2)} 74.5 C${(m.farCheekX - 2).toFixed(2)} 61.2 ${(m.farTempleX - 5.3).toFixed(2)} 48.5 ${m.farTempleX.toFixed(2)} 39.5 Z`;
        if(profile) {
            const target=[20,40,20,20,35,12,53,15,73,15,82,32,81,53,80,61,81,68,89,76,90,80,82,80,82,85,83,88,86,92,81,96,82,105,76,112,66,112,49,113,32,104,25,91,17,77,14,56,20,40];
            // Reflection reverses winding. Match the neutral outline's anatomical
            // order before interpolation, otherwise the left turn folds through itself.
            if (profileLeft) {
                const segments = Array.from({length:8}, (_, i) => target.slice(2+i*6, 8+i*6));
                const endpoints = [target.slice(0,2), ...segments.map(segment=>segment.slice(4))];
                const reversed = [...endpoints[2]];
                for (const i of [1,0,7,6,5,4,3,2]) {
                    reversed.push(...segments[i].slice(2,4), ...segments[i].slice(0,2), ...endpoints[i]);
                }
                target.splice(0,target.length,...reversed);
            }
            let index=0;
            facePath=facePath.replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g,token=>{const i=index++,value=i%2?target[i]:px(target[i]);return String(Number(token)+(value-Number(token))*profile);});
        }
        const nearEyePath = eyePath(m.farEyeX, m.farEyeY, farEyeHalfWidth, farEyeHalfHeight);
        const farEyePath = eyePath(m.nearEyeX, m.nearEyeY, nearEyeHalfWidth, nearEyeHalfHeight);
        const lipStyleScale = ctx.facialStyle?.lips.fullness
            ?? (ctx.lipStyle === 'full' ? 1.28 : (ctx.lipStyle === 'subtle' ? 0.68 : (ctx.lipStyle === 'defined' ? 1.12 : 1)));
        const lipFullness = clamp(lipStyleScale * (1 + clamp(a.lipFullness || 0, -0.5, 0.5) * 0.72
            + (ctx.facialStyle?.presentation.lipFullness || 0)), 0.5, 1.85);
        const apertureScale = clamp(.72 + clamp(f.mouthOpeningGain ?? 1, .75, 3.2) * .28, .93, 1.62);
        const upperLipTravel = (mouthOpen * 1.4 + upperLipLift * 0.84 + mouthRound * 0.08 - lipPress * 0.09) * apertureScale;
        const lowerLipTravel = (mouthOpen * 5.8 + jawOpen * 1.8 + lowerLipDrop * 1.2 - lipPress * 0.12) * apertureScale;
        const upperLipY = m.mouthY - upperLipTravel;
        const lowerLipY = m.mouthY + 2.4 * lipFullness + lowerLipTravel + smile * 0.5;
        const upperCornerY = m.mouthY;
        const lowerCornerY = m.mouthY + 2.4 * lipFullness + smile * 0.2;
        const mouthScaleX = clamp(1 + mouthWide * 0.2 - mouthRound * 0.32, 0.52, 1.24);
        const openVisibility = clamp((mouthOpen - 0.025) * 4.4, 0, 1);
        const cavityOpacity = clamp((mouthOpen - 0.015) * 1.18, 0, 0.98) * (1 - lipPress * 0.72);
        const teethCue = Math.max(0, mouthWide) * 0.45 + Math.max(0, upperLipLift) * 2
            + lipPress * 0.9 * openVisibility;
        const teethOpacity = clamp(teethCue * (0.32 + openVisibility * 0.68) * (1 - jawOpen * 0.72) * (1 - mouthRound * 0.85), 0, 0.9);
        const tongueOpacity = clamp((mouthOpen - 0.1) * 1.65 * Math.pow(Math.max(0, 1 - jawOpen * 0.92), 1.4)
            * (1 - Math.abs(mouthWide) * 0.72) * (1 - mouthRound * 0.88)
            * (1 - Math.max(0, lowerLipDrop) * 0.58), 0, 0.36);
        const farPupilX = m.farEyeX + gazeX;
        const nearPupilX = m.nearEyeX + gazeX * 0.65;
        const farPupilY = m.farEyeY + gazeY;
        const nearPupilY = m.nearEyeY + gazeY;
        const facialHair = ctx.presentation === 'male' && ctx.facialHair !== 'none'
            ? `<g id="facial-hair" data-svg-african-role="facial-hair ${ctx.facialHair}" clip-path="url(#faceClip3q)">
<path data-svg-african-role="moustache" d="M${(m.mouthCenterX - 8.5).toFixed(1)} ${(m.mouthY - 3.4).toFixed(1)} C${(m.mouthCenterX - 3.5).toFixed(1)} ${(m.mouthY - 5.2).toFixed(1)} ${(m.mouthCenterX - 0.5).toFixed(1)} ${(m.mouthY - 3.9).toFixed(1)} ${(m.mouthCenterX + 1.2).toFixed(1)} ${(m.mouthY - 2.8).toFixed(1)} C${(m.mouthCenterX + 4.5).toFixed(1)} ${(m.mouthY - 4.8).toFixed(1)} ${(m.mouthCenterX + 8.5).toFixed(1)} ${(m.mouthY - 4).toFixed(1)} ${(m.mouthCenterX + 10).toFixed(1)} ${(m.mouthY - 2.6).toFixed(1)} C${(m.mouthCenterX + 4).toFixed(1)} ${(m.mouthY - 1.5).toFixed(1)} ${(m.mouthCenterX - 3).toFixed(1)} ${(m.mouthY - 1.5).toFixed(1)} ${(m.mouthCenterX - 8.5).toFixed(1)} ${(m.mouthY - 3.4).toFixed(1)} Z" fill="var(--hair)" opacity=".72"/>
${(ctx.facialHair === 'moustache' || ctx.facialHair === 'goatee') ? '' : `<path data-svg-african-role="beard" d="M32 95 C38 110 49 119 59 120 C72 119 82 109 86 97 C82 113 72 124 59 126 C45 124 35 114 32 95 Z" fill="var(--hair)" opacity="${ctx.facialHair === 'short-beard' ? '.16' : '.36'}"/>`}
${ctx.facialHair === 'goatee' ? `<path data-svg-african-role="goatee identity-matched-goatee" d="M${(m.mouthCenterX - 4).toFixed(2)} ${(m.mouthY + 7).toFixed(2)} Q${m.mouthCenterX.toFixed(2)} ${(m.mouthY + 9).toFixed(2)} ${(m.mouthCenterX + 4).toFixed(2)} ${(m.mouthY + 7).toFixed(2)} Q${(m.mouthCenterX + 3).toFixed(2)} ${(m.chinY - 6).toFixed(2)} ${m.chinX.toFixed(2)} ${(m.chinY - 2).toFixed(2)} Q${(m.mouthCenterX - 3).toFixed(2)} ${(m.chinY - 6).toFixed(2)} ${(m.mouthCenterX - 4).toFixed(2)} ${(m.mouthY + 7).toFixed(2)} Z" fill="var(--hair)" opacity=".88"/>` : ''}
</g>`
            : '';
        const headMotionTransform = `translate(0 ${(-headNod * 0.22).toFixed(2)}) rotate(${(headTilt * 0.45).toFixed(2)} 52 132)`;
        const glassesMarkup = glasses
            ? `<g id="glasses" data-svg-african-role="glasses perspective-glasses fitted-three-quarter-glasses rounded-perspective-frames">
<path data-svg-african-role="glasses-frame near-lens" d="M${(m.farEyeX - 8.8).toFixed(1)} ${(m.farEyeY - 4.7).toFixed(1)} Q${m.farEyeX.toFixed(1)} ${(m.farEyeY - 6.1).toFixed(1)} ${(m.farEyeX + 9).toFixed(1)} ${(m.farEyeY - 3.6).toFixed(1)} L${(m.farEyeX + 8.6).toFixed(1)} ${(m.farEyeY + 4.2).toFixed(1)} Q${m.farEyeX.toFixed(1)} ${(m.farEyeY + 6).toFixed(1)} ${(m.farEyeX - 8.6).toFixed(1)} ${(m.farEyeY + 3.8).toFixed(1)} Z" fill="var(--glass)" fill-opacity=".025" stroke="var(--glass)" stroke-width="1.6" stroke-linejoin="round"/>
<path data-svg-african-role="glasses-frame far-lens" d="M${(m.nearEyeX - 6.8).toFixed(1)} ${(m.nearEyeY - 4.2).toFixed(1)} Q${m.nearEyeX.toFixed(1)} ${(m.nearEyeY - 5.5).toFixed(1)} ${(m.nearEyeX + 6.9).toFixed(1)} ${(m.nearEyeY - 3.5).toFixed(1)} L${(m.nearEyeX + 6.5).toFixed(1)} ${(m.nearEyeY + 3.7).toFixed(1)} Q${m.nearEyeX.toFixed(1)} ${(m.nearEyeY + 5.3).toFixed(1)} ${(m.nearEyeX - 6.6).toFixed(1)} ${(m.nearEyeY + 3.3).toFixed(1)} Z" fill="var(--glass)" fill-opacity=".025" stroke="var(--glass)" stroke-width="1.5" stroke-linejoin="round"/>
<path data-svg-african-role="glasses-bridge" d="M${(m.farEyeX + 9).toFixed(1)} ${(m.farEyeY - .2).toFixed(1)} C${(m.farEyeX + 11).toFixed(1)} ${(m.farEyeY - .9).toFixed(1)} ${(m.nearEyeX - 8.9).toFixed(1)} ${(m.nearEyeY - .9).toFixed(1)} ${(m.nearEyeX - 6.8).toFixed(1)} ${(m.nearEyeY - .2).toFixed(1)} M${(m.farEyeX - 8.8).toFixed(1)} ${(m.farEyeY - 1.4).toFixed(1)} L27 ${(m.farEyeY - 2.7).toFixed(1)}" fill="none" stroke="var(--glass)" stroke-width="1.45" stroke-linecap="round"/>
</g>`
            : '';
        const face = `<g data-svg-african-role="head-motion front-3q-face directional-three-quarter-face premium-three-quarter-face" data-svg-african-face-construction="landmark-v9" data-svg-african-yaw-degrees="28" data-svg-african-neck-socket-x="52" data-svg-african-near-eye-width="${(farEyeHalfWidth * 2).toFixed(2)}" data-svg-african-far-eye-width="${(nearEyeHalfWidth * 2).toFixed(2)}" data-svg-african-far-eye-x="${m.farEyeX.toFixed(2)}" data-svg-african-near-eye-x="${m.nearEyeX.toFixed(2)}" data-svg-african-nose-tip-x="${m.noseTipX.toFixed(2)}" data-svg-african-mouth-center-x="${m.mouthCenterX.toFixed(2)}" transform="${headMotionTransform}">
<g data-svg-african-role="socket-anchored-head-fit" transform="translate(${((1 - m.headWidth) * 52).toFixed(3)} ${((1 - m.headHeight) * 133).toFixed(3)}) scale(${m.headWidth.toFixed(4)} ${m.headHeight.toFixed(4)})">
${yaw !== null ? `<ellipse data-svg-african-role="shared-far-ear" cx="${85 + 3 * yaw}" cy="${m.earY}" rx="${6.1 * m.earScale * (1 - Math.min(1, Math.max(0, yaw)) * .85)}" ry="${11.8 * m.earScale}" fill="var(--skin)"/>` : ''}
${headLayer(wrapHairFit(renderHairBack(ctx), ctx, 'back'), ctx)}
<path id="neck" data-svg-african-role="neck continuous-neck smooth-neck-margin single-piece-neck turned-neck centered-neck-socket seated-neck-base" data-svg-african-neck-base-y="133" d="${yaw === null ? 'M43 98.5 C46 109 45 119 42.8 127.8 C42.1 130 41.5 131.8 41 133 L63 133 C63.1 128.2 63.6 123.5 64.5 118.5 C65.8 109.5 69 103 71 98.5 C64.8 106.8 51 108.5 43 98.5 Z' : `M${38 + 5*yaw} 98.5 C${42 + 4*yaw} 111 44 122 41 133 L63 133 C60 122 ${62 + 4*yaw} 111 ${66 + 5*yaw} 98.5 C${60 + 5*yaw} 107 ${44 + 5*yaw} 107 ${38 + 5*yaw} 98.5 Z`}" fill="url(#skinGrad3q)"/>
${ctx.hair !== 'bald' && !/hijab|khimar|niqab/.test(ctx.headwear) ? '<path data-svg-african-role="temple-hair continuous-temple-fit behind-visible-ear" d="M19 42 C16 47 16 58 17 68 L23 73 C23 64 26 55 31 44 C27 42 23 41 19 42 Z" fill="url(#hairGrad3q)"/>' : ''}
<ellipse id="ear-far" data-svg-african-role="ear near-ear visible-three-quarter-ear adjustable-ear" cx="${m.earX.toFixed(2)}" cy="${m.earY.toFixed(2)}" rx="${(6.1 * m.earScale * (yaw === null ? 1 : 1 - Math.min(1, Math.max(0, -yaw)) * .85)).toFixed(2)}" ry="${(11.8 * m.earScale).toFixed(2)}" fill="var(--skin)"/>
<path data-svg-african-role="ear-detail" d="M${(m.earX - 1.2).toFixed(2)} ${(m.earY - 7).toFixed(2)} C${(m.earX + 2.2).toFixed(2)} ${(m.earY - 4.3).toFixed(2)} ${(m.earX + 2.1).toFixed(2)} ${(m.earY + 2.8).toFixed(2)} ${(m.earX - 1.2).toFixed(2)} ${(m.earY + 6.7).toFixed(2)} M${(m.earX - .8).toFixed(2)} ${(m.earY - 3.5).toFixed(2)} C${(m.earX + .8).toFixed(2)} ${(m.earY - 2.1).toFixed(2)} ${(m.earX + .7).toFixed(2)} ${(m.earY + 1.3).toFixed(2)} ${(m.earX - .7).toFixed(2)} ${(m.earY + 2.8).toFixed(2)}" fill="none" stroke="var(--skin-shade)" stroke-width="1" opacity=".4" stroke-linecap="round"/>
<defs><clipPath id="faceClip3q"><path d="${facePath}"/></clipPath><clipPath id="nearEyeClip3q"><path d="${nearEyePath}"/></clipPath><clipPath id="farEyeClip3q"><path d="${farEyePath}"/></clipPath></defs>
<path id="face" data-svg-african-role="face-base" data-svg-african-anatomy="directional-face-contour asymmetric-three-quarter-skull rounded-three-quarter-jaw softened-chin" data-svg-african-detail="three-quarter-face landmark-v9" d="${facePath}" fill="url(#faceGrad3q)"/>
<g clip-path="url(#faceClip3q)" data-svg-african-role="contained-face-planes">
<path data-svg-african-role="face-plane broad-near-cheek-plane" d="M29 43 C25 58 25 82 32 99 C36 108 45 114 54 117 C43 115 34 110 29 102 C23 93 22 79 23.5 66 C24 55 26 47 29 43 Z" fill="var(--skin-light)" opacity=".055"/>
<path data-svg-african-role="face-plane compressed-far-temple-plane" d="M72 25 C80 29 83 36 83 45 C86 55 87 64 88 72 C86 66 82 61 78 57 C76 43 75 33 72 25 Z" fill="var(--skin-shade)" opacity=".075"/>
<path data-svg-african-role="near-cheek-highlight" d="M78 85 C81 92 79 101 74 107 C70 112 65 115 60 117" fill="none" stroke="var(--skin-light)" stroke-width=".9" opacity=".14" stroke-linecap="round"/>
</g>
${yaw !== null && ctx.hair !== 'bald' && !/hijab|khimar|niqab/.test(ctx.headwear) ? `<path data-svg-african-role="matched-scalp-cover continuous-scalp-hair" d="M15 60 C9 30 24 ${ctx.hasHeadwear ? 32 : 8} 52 ${ctx.hasHeadwear ? 32 : 8} C82 ${ctx.hasHeadwear ? 32 : 8} 96 30 91 62 L${m.nearTempleX + 2} 70 L${m.nearTempleX - 1} 48 C72 38 65 35 53 36 C40 36 31 40 ${m.farTempleX + 1} 49 L${m.farTempleX - 2} 70 Z" fill="url(#hairGrad3q)"/>` : ''}
${headLayer(wrapHairFit(renderFrontHair(ctx), ctx, 'front'), ctx)}
<path id="eye-left" data-svg-african-role="eye-left eye-near perspective-eye" data-svg-african-eye-half-height="${(2.8 * eyeScale * eyeStyleScale[1]).toFixed(4)}" d="${nearEyePath}" fill="#fff" stroke="var(--skin-shade)" stroke-width=".5" opacity=".98"/>
<path data-svg-african-role="upper-eyelid near-eyelid" d="M${(m.farEyeX - farEyeHalfWidth).toFixed(2)} ${m.farEyeY.toFixed(2)} C${(m.farEyeX - 2.2).toFixed(2)} ${(m.farEyeY - farEyeHalfHeight - .55).toFixed(2)} ${(m.farEyeX + 2.5).toFixed(2)} ${(m.farEyeY - farEyeHalfHeight - .4).toFixed(2)} ${(m.farEyeX + farEyeHalfWidth).toFixed(2)} ${m.farEyeY.toFixed(2)}" fill="none" stroke="var(--ink)" stroke-width=".7" opacity=".42" stroke-linecap="round"/>
<g data-svg-african-role="contained-near-eye" clip-path="url(#nearEyeClip3q)">
<ellipse id="pupil-left" data-svg-african-role="pupil-left iris-near" cx="${farPupilX.toFixed(2)}" cy="${farPupilY.toFixed(2)}" rx="${(2.15 * eyeScale).toFixed(2)}" ry="${Math.max(0.3, 2.25 * eyeScale * (1 - blink * 0.84)).toFixed(2)}" fill="#4a2c20"/>
<circle data-svg-african-role="pupil-core near-pupil-core" cx="${farPupilX.toFixed(2)}" cy="${farPupilY.toFixed(2)}" r="${Math.max(0.22, 1.08 * eyeScale * (1 - blink * .8)).toFixed(2)}" fill="var(--ink)"/>
<circle data-svg-african-role="eye-highlight near-eye-highlight" cx="${(farPupilX + .65).toFixed(2)}" cy="${(farPupilY - .72).toFixed(2)}" r=".46" fill="#fff" opacity="${blink > 0.82 ? 0 : .86}"/>
</g>
<path id="eye-right" data-svg-african-role="eye-right eye-far perspective-eye" data-svg-african-eye-half-height="${(2.05 * eyeScale * eyeStyleScale[1]).toFixed(4)}" d="${farEyePath}" fill="#fff" stroke="var(--skin-shade)" stroke-width=".45"/>
<path data-svg-african-role="upper-eyelid far-eyelid" d="M${(m.nearEyeX - nearEyeHalfWidth).toFixed(2)} ${m.nearEyeY.toFixed(2)} C${(m.nearEyeX - 1.8).toFixed(2)} ${(m.nearEyeY - nearEyeHalfHeight - .5).toFixed(2)} ${(m.nearEyeX + 2.1).toFixed(2)} ${(m.nearEyeY - nearEyeHalfHeight - .35).toFixed(2)} ${(m.nearEyeX + nearEyeHalfWidth).toFixed(2)} ${m.nearEyeY.toFixed(2)}" fill="none" stroke="var(--ink)" stroke-width=".65" opacity=".38" stroke-linecap="round"/>
<g data-svg-african-role="contained-far-eye" clip-path="url(#farEyeClip3q)">
<ellipse id="pupil-right" data-svg-african-role="pupil-right iris-far" cx="${nearPupilX.toFixed(2)}" cy="${nearPupilY.toFixed(2)}" rx="${(1.8 * eyeScale).toFixed(2)}" ry="${Math.max(0.28, 1.9 * eyeScale * (1 - blink * 0.84)).toFixed(2)}" fill="#4a2c20"/>
<circle data-svg-african-role="pupil-core far-pupil-core" cx="${nearPupilX.toFixed(2)}" cy="${nearPupilY.toFixed(2)}" r="${Math.max(0.2, 0.9 * eyeScale * (1 - blink * .8)).toFixed(2)}" fill="var(--ink)"/>
<circle data-svg-african-role="eye-highlight far-eye-highlight" cx="${(nearPupilX + .52).toFixed(2)}" cy="${(nearPupilY - .62).toFixed(2)}" r=".39" fill="#fff" opacity="${blink > 0.82 ? 0 : .82}"/>
</g>
<path id="brow-left" data-svg-african-role="brow-left" d="M${(m.farEyeX - 6.7 * browLength).toFixed(2)} ${(55 + (m.farEyeY - 64) + browLift).toFixed(2)} C${(m.farEyeX - 2.1).toFixed(2)} ${(52.2 + (m.farEyeY - 64) + browLift).toFixed(2)} ${(m.farEyeX + 2.8).toFixed(2)} ${(52.4 + (m.farEyeY - 64) + browLift).toFixed(2)} ${(m.farEyeX + 6.7 * browLength).toFixed(2)} ${(54.7 + (m.farEyeY - 64) + browLift).toFixed(2)}" fill="none" stroke="var(--ink)" stroke-width="${(2.5 * browStroke).toFixed(2)}" stroke-linecap="round"/>
<path id="brow-right" data-svg-african-role="brow-right" d="M${(m.nearEyeX - 5.2 * browLength).toFixed(2)} ${(52.8 + (m.nearEyeY - 62.8) + browLift).toFixed(2)} C${(m.nearEyeX - 1.7).toFixed(2)} ${(50.1 + (m.nearEyeY - 62.8) + browLift).toFixed(2)} ${(m.nearEyeX + 2.2).toFixed(2)} ${(50.2 + (m.nearEyeY - 62.8) + browLift).toFixed(2)} ${(m.nearEyeX + 5.2 * browLength).toFixed(2)} ${(52.5 + (m.nearEyeY - 62.8) + browLift).toFixed(2)}" fill="none" stroke="var(--ink)" stroke-width="${(2.2 * browStroke).toFixed(2)}" stroke-linecap="round"/>
<path data-svg-african-role="nose-plane three-quarter-nose-volume" d="M${m.noseBridgeX.toFixed(2)} ${(m.nearEyeY + .5).toFixed(2)} C${(m.noseBridgeX + .9).toFixed(2)} ${(m.noseTipY - 10).toFixed(2)} ${(m.noseBridgeX - .5).toFixed(2)} ${(m.noseTipY - 4).toFixed(2)} ${(m.noseBridgeX + 1.7).toFixed(2)} ${(m.noseTipY + .9).toFixed(2)} C${(m.noseTipX - 3).toFixed(2)} ${(m.noseTipY + 3).toFixed(2)} ${(m.noseTipX + 1).toFixed(2)} ${(m.noseTipY + 1.3).toFixed(2)} ${m.noseTipX.toFixed(2)} ${m.noseTipY.toFixed(2)} C${(m.noseTipX - 3.4).toFixed(2)} ${(m.noseTipY - 3).toFixed(2)} ${(m.noseBridgeX + 4).toFixed(2)} ${(m.nearEyeY + 5).toFixed(2)} ${m.noseBridgeX.toFixed(2)} ${(m.nearEyeY + .5).toFixed(2)} Z" fill="var(--skin-shade)" opacity=".085"/>
<path id="nose" data-svg-african-role="nose three-quarter-nose internal-nose-plane" d="M${m.noseBridgeX.toFixed(2)} ${(m.nearEyeY + .5).toFixed(2)} C${(m.noseBridgeX + .5).toFixed(2)} ${(m.noseTipY - 10).toFixed(2)} ${(m.noseBridgeX - .5).toFixed(2)} ${(m.noseTipY - 4).toFixed(2)} ${(m.noseBridgeX + 1.8).toFixed(2)} ${(m.noseTipY + .2).toFixed(2)} C${(m.noseTipX - 3).toFixed(2)} ${(m.noseTipY + 2.1).toFixed(2)} ${(m.noseTipX - .4).toFixed(2)} ${(m.noseTipY + 1.1).toFixed(2)} ${m.noseTipX.toFixed(2)} ${m.noseTipY.toFixed(2)}" fill="none" stroke="var(--skin-shade)" stroke-width="1.45" opacity=".76" stroke-linecap="round" stroke-linejoin="round"/>
<path data-svg-african-role="nose-highlight" d="M${(m.noseBridgeX + 2).toFixed(2)} ${(m.nearEyeY + 4).toFixed(2)} C${(m.noseBridgeX + 3).toFixed(2)} ${(m.noseTipY - 7).toFixed(2)} ${(m.noseBridgeX + 2.6).toFixed(2)} ${(m.noseTipY - 3).toFixed(2)} ${(m.noseBridgeX + 4).toFixed(2)} ${(m.noseTipY - 1).toFixed(2)}" fill="none" stroke="var(--skin-light)" stroke-width=".8" opacity=".24" stroke-linecap="round"/>
<path data-svg-african-role="nose-ala" d="M${(m.noseTipX - 5).toFixed(2)} ${(m.noseTipY + 1.2).toFixed(2)} C${(m.noseTipX - 2.8).toFixed(2)} ${m.noseTipY.toFixed(2)} ${(m.noseTipX - .5).toFixed(2)} ${(m.noseTipY + .2).toFixed(2)} ${(m.noseTipX + 1).toFixed(2)} ${(m.noseTipY + 1.2).toFixed(2)}" fill="none" stroke="var(--skin-shade)" stroke-width=".7" opacity=".36" stroke-linecap="round"/>
<path data-svg-african-role="nose-base three-quarter-nose-base" d="M${(m.noseBridgeX - .2).toFixed(2)} ${(m.noseTipY + 1).toFixed(2)} C${(m.noseBridgeX + 2).toFixed(2)} ${(m.noseTipY + 2.6).toFixed(2)} ${(m.noseTipX - 1.8).toFixed(2)} ${(m.noseTipY + 2.6).toFixed(2)} ${(m.noseTipX + .8).toFixed(2)} ${(m.noseTipY + 1).toFixed(2)}" fill="none" stroke="var(--skin-shade)" stroke-width=".65" opacity=".38" stroke-linecap="round"/>
<ellipse data-svg-african-role="nostril far-nostril" cx="${(m.noseBridgeX + 2.2).toFixed(2)}" cy="${(m.noseTipY + 1.55).toFixed(2)}" rx=".52" ry=".28" fill="var(--ink)" opacity=".18"/>
<ellipse data-svg-african-role="nostril near-nostril" cx="${(m.noseTipX - 1.5).toFixed(2)}" cy="${(m.noseTipY + 1.15).toFixed(2)}" rx=".72" ry=".36" fill="var(--ink)" opacity=".28"/>
<path data-svg-african-role="philtrum" d="M${(m.mouthCenterX + 1).toFixed(2)} ${(m.noseTipY + 3.5).toFixed(2)} C${(m.mouthCenterX + .4).toFixed(2)} ${(m.mouthY - 2.8).toFixed(2)} ${(m.mouthCenterX + .2).toFixed(2)} ${(m.mouthY - 2).toFixed(2)} ${m.mouthCenterX.toFixed(2)} ${(m.mouthY - 1.4).toFixed(2)}" fill="none" stroke="var(--skin-shade)" stroke-width=".55" opacity=".24" stroke-linecap="round"/>
<g id="mouth" data-svg-african-role="mouth perspective-mouth shaped-three-quarter-lips" transform="translate(${m.mouthCenterX.toFixed(2)} ${m.mouthY.toFixed(2)}) scale(${mouthScaleX.toFixed(4)} 1) translate(${-m.mouthCenterX.toFixed(2)} ${-m.mouthY.toFixed(2)})">
<path id="mouth-opening" data-svg-african-role="mouth-opening oral-cavity" d="M${(m.mouthLeft + 1.2).toFixed(2)} ${(upperCornerY + .55).toFixed(2)} C${(m.mouthCenterX - 4).toFixed(2)} ${(upperLipY + 1.2).toFixed(2)} ${(m.mouthCenterX + 5).toFixed(2)} ${(upperLipY + 1.35).toFixed(2)} ${(m.mouthRight - .8).toFixed(2)} ${(upperCornerY + .65).toFixed(2)} C${(m.mouthCenterX + 5).toFixed(2)} ${(lowerLipY + .65).toFixed(2)} ${(m.mouthCenterX - 4).toFixed(2)} ${(lowerLipY + .55).toFixed(2)} ${(m.mouthLeft + 1.2).toFixed(2)} ${(upperCornerY + .55).toFixed(2)} Z" fill="#351014" opacity="${cavityOpacity.toFixed(2)}"/>
<path id="mouth-teeth" data-svg-african-role="mouth-teeth teeth" d="M${(m.mouthLeft + 1.8).toFixed(2)} ${(upperCornerY + .55).toFixed(2)} C${(m.mouthCenterX - 3).toFixed(2)} ${(upperCornerY + 1.4 - upperLipTravel * .45).toFixed(2)} ${(m.mouthCenterX + 4).toFixed(2)} ${(upperCornerY + 1.5 - upperLipTravel * .45).toFixed(2)} ${(m.mouthRight - 1.4).toFixed(2)} ${(upperCornerY + .65).toFixed(2)} C${(m.mouthCenterX + 4).toFixed(2)} ${(upperCornerY + 2.35).toFixed(2)} ${(m.mouthCenterX - 3).toFixed(2)} ${(upperCornerY + 2.25).toFixed(2)} ${(m.mouthLeft + 1.8).toFixed(2)} ${(upperCornerY + .55).toFixed(2)} Z" fill="#fffaf2" opacity="${teethOpacity.toFixed(2)}"/>
<ellipse id="mouth-tongue" data-svg-african-role="mouth-tongue tongue" cx="${m.mouthCenterX.toFixed(2)}" cy="${(lowerLipY + .25).toFixed(2)}" rx="5.1" ry="1.1" fill="#c96f72" opacity="${tongueOpacity.toFixed(2)}"/>
<path id="mouth-upper" data-svg-african-role="mouth-upper upper-lip" d="M${m.mouthLeft.toFixed(2)} ${upperCornerY.toFixed(2)} C${(m.mouthCenterX - 5.8).toFixed(2)} ${(upperLipY - .6 - smile).toFixed(2)} ${(m.mouthCenterX - 3).toFixed(2)} ${(upperLipY - 2.1 * lipFullness - smile).toFixed(2)} ${m.mouthCenterX.toFixed(2)} ${(upperLipY - .65).toFixed(2)} C${(m.mouthCenterX + 3).toFixed(2)} ${(upperLipY - 2.2 * lipFullness - smile).toFixed(2)} ${(m.mouthCenterX + 7.3).toFixed(2)} ${(upperLipY - 1 - smile).toFixed(2)} ${m.mouthRight.toFixed(2)} ${(upperCornerY + .2).toFixed(2)} C${(m.mouthCenterX + 6).toFixed(2)} ${(upperCornerY + 1.15).toFixed(2)} ${(m.mouthCenterX - 4.5).toFixed(2)} ${(upperCornerY + 1.1).toFixed(2)} ${m.mouthLeft.toFixed(2)} ${upperCornerY.toFixed(2)} Z" fill="${ctx.facialStyle?.lips.upperColor || '#8e2f33'}" opacity=".94"/>
<path id="mouth-lower" data-svg-african-role="mouth-lower lower-lip" d="M${(m.mouthLeft + .8).toFixed(2)} ${(lowerCornerY - .4).toFixed(2)} C${(m.mouthCenterX - 4).toFixed(2)} ${lowerLipY.toFixed(2)} ${(m.mouthCenterX + 5.5).toFixed(2)} ${(lowerLipY + .3).toFixed(2)} ${(m.mouthRight - .7).toFixed(2)} ${(lowerCornerY - .3).toFixed(2)} C${(m.mouthCenterX + 5).toFixed(2)} ${(lowerLipY + 2.1).toFixed(2)} ${(m.mouthCenterX - 4).toFixed(2)} ${(lowerLipY + 2).toFixed(2)} ${(m.mouthLeft + .8).toFixed(2)} ${(lowerCornerY - .4).toFixed(2)} Z" fill="${ctx.facialStyle?.lips.lowerColor || '#b85b58'}" opacity=".86"/>
</g>
<g data-svg-african-role="contained-jaw-planes" clip-path="url(#faceClip3q)">
<path data-svg-african-role="chin-plane" d="M${(m.mouthCenterX - 7).toFixed(2)} ${(m.mouthY + 10).toFixed(2)} C${(m.mouthCenterX - 1).toFixed(2)} ${(m.mouthY + 12).toFixed(2)} ${(m.mouthCenterX + 5).toFixed(2)} ${(m.mouthY + 11.5).toFixed(2)} ${(m.mouthCenterX + 9).toFixed(2)} ${(m.mouthY + 8.8).toFixed(2)}" fill="none" stroke="var(--skin-shade)" stroke-width=".7" opacity=".12" stroke-linecap="round"/>
</g>
${facialHair}
${glassesMarkup}
${earrings ? `<g data-svg-african-role="accessory earrings"><circle id="earring" data-svg-african-role="earring trailing-earring" cx="${m.earX.toFixed(2)}" cy="${(m.earY + 11.5 * m.earScale).toFixed(2)}" r="2.5" fill="var(--accent)"/><path d="M${m.earX.toFixed(2)} ${(m.earY + 14 * m.earScale).toFixed(2)} L${m.earX.toFixed(2)} ${(m.earY + 22 * m.earScale).toFixed(2)}" stroke="var(--accent)" stroke-width="1.7"/></g>` : ''}
${headLayer(renderHeadwear(ctx), ctx)}
</g>
</g>`;
        const rendered=svgShell('head-neck', 104, 154, mirrored(face, ctx, 104), palette, ctx.view);
        if(ctx.sharedHeadYaw===null || !ctx.fullHeadRange)return rendered;
        const root=new DOMParser().parseFromString(rendered,'image/svg+xml').documentElement;
        // Fixed wrappers keep the interpolation topology identical at every angle.
        for(const [side,ids,roles] of [
            ['left',['eye-left','brow-left'],['upper-eyelid near-eyelid','contained-near-eye','glasses-frame near-lens']],
            ['right',['eye-right','brow-right'],['upper-eyelid far-eyelid','contained-far-eye','glasses-frame far-lens']]
        ])for(const node of [...ids.map(id=>root.querySelector(`[id="${id}"]`)),...roles.map(role=>root.querySelector(`[data-svg-african-role="${role}"]`))].filter(Boolean)){
            const wrapper=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g');
            wrapper.setAttribute('data-profile-occlusion',side);
            wrapper.setAttribute('opacity',String((profileLeft?side==='left':side==='right')?1-profile:1));
            const cx=side==='left'?m.farEyeX:m.nearEyeX,cy=side==='left'?m.farEyeY:m.nearEyeY;
            wrapper.setAttribute('transform',`translate(${cx} ${cy}) scale(${1-.25*profile} ${1-.05*profile}) translate(${-cx} ${-cy})`);
            node.parentNode.insertBefore(wrapper,node);wrapper.append(node);
        }
        const ear=root.querySelector('#ear-far'),detail=root.querySelector('[data-svg-african-role="ear-detail"]');
        const eyeNode=root.querySelector('[data-profile-occlusion]');
        for(const node of [ear,detail].filter(Boolean))eyeNode.parentNode.insertBefore(node,eyeNode);
        ear.setAttribute('rx',String(Number(ear.getAttribute('rx'))*(1-profile)+6.1*m.earScale*profile));
        root.querySelector('[data-svg-african-role="shared-far-ear"]')?.setAttribute('opacity',String(1-profile));
        const bridge=root.querySelector('[data-svg-african-role="glasses-bridge"]');
        if(bridge){const target=profileLeft?[25,63,25,63,25,63,25,63,39,63,66,72]:[81,63,81,63,81,63,81,63,63,63,38,72];let i=0;bridge.setAttribute('d',bridge.getAttribute('d').replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)/g,token=>String(Number(token)+(target[i++]-Number(token))*profile)));}
        for(const node of [root.querySelector('#nose'),root.querySelector('[data-svg-african-role="nose-plane three-quarter-nose-volume"]'),root.querySelector('[data-svg-african-role="nose-highlight"]')].filter(Boolean)){
            const wrapper=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g');wrapper.setAttribute('opacity',String(1-profile));node.parentNode.insertBefore(wrapper,node);wrapper.append(node);
        }
        const clips=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','defs');
        clips.innerHTML=[-1,1].map(sign=>{const t=sign*(ctx.sharedHeadYaw||0)>0?profile:0;return `<clipPath id="profile-hair-${sign}"><path transform="${sign<0?'translate(104 0) scale(-1 1)':'translate(0 0) scale(1 1)'}" d="M-40 -40 H144 V0 C${144-48*t} 15 ${144-54*t} 30 ${144-63*t} 50 C${144-80*t} 58 ${144-101*t} 65 ${144-106*t} 78 L${144-106*t} 220 H-40 Z"/></clipPath>`;}).join('');root.append(clips);
        for(const node of [...root.querySelectorAll('[data-svg-african-role="matched-head-layer"]')].filter(node=>!node.querySelector('[data-svg-african-role*="headwear"]')).concat([...root.querySelectorAll('[data-svg-african-role="matched-scalp-cover continuous-scalp-hair"]')])){
            const a=root.ownerDocument.createElementNS('http://www.w3.org/2000/svg','g'),b=a.cloneNode(false);a.setAttribute('clip-path','url(#profile-hair--1)');b.setAttribute('clip-path','url(#profile-hair-1)');node.parentNode.insertBefore(a,node);a.append(b);b.append(node);
        }
        return new XMLSerializer().serializeToString(root);
    }

    function renderBackHead(ctx, palette) {
        const m = compileFrontThreeQuarterHeadLandmarks(ctx);
        const a = ctx.adjustments || {};
        const f = ctx.faceState || {};
        const rearFaceWidth = 35 + clamp(ctx.adjustments?.faceWidth || 0, -0.5, 0.55) * 6;
        const earY = 78 - clamp(a.earHeight || 0, -.5, .5) * 6;
        const earScale = m.earScale;
        const occiput = clamp(a.occiputDepth || 0, -.5, .55) * 3;
        const earCovered = !ctx.hasHeadwear && /^(long-straight|long-waves|side-swept-long|shoulder-length|bob|round-bob|side-part-bob)$/.test(ctx.hair);
        const showRearEarring = ctx.presentation === 'female'
            && (ctx.accessories.has('earrings') || ctx.accessories.has('ear-rings'))
            && !earCovered
            && !/hijab|khimar|niqab/.test(ctx.headwear);
        const motion = `translate(0 ${(-clamp(f.headNod || 0, -8, 8) * .22).toFixed(2)}) rotate(${(clamp(f.headTilt || 0, -8, 8) * .45).toFixed(2)} 52 142)`;
        const skull = `M${(55 - rearFaceWidth).toFixed(2)} 69 C${(17 - occiput).toFixed(2)} 45 27 26 52 24 C76 22 93 42 91 68 C90 87 81 101 69 109 C58 116 40 109 30 99 C22 91 ${(55 - rearFaceWidth).toFixed(2)} 81 ${(55 - rearFaceWidth).toFixed(2)} 69 Z`;
        const body = `<g data-svg-african-role="head-motion rear-three-quarter-head" data-svg-african-rear-construction="socket-fitted-rear-v2" transform="${motion}">
<g data-svg-african-role="socket-anchored-rear-head-fit" data-svg-african-head-type="${ctx.headType}" transform="translate(${((1 - m.headWidth) * 52).toFixed(3)} ${((1 - m.headHeight) * 142).toFixed(3)}) scale(${m.headWidth.toFixed(4)} ${m.headHeight.toFixed(4)})">
<path id="neck" data-svg-african-role="neck continuous-neck smooth-rear-neck curved-hidden-neck-base" data-svg-african-neck-base-y="142" d="M40 101 C43 113 44 126 42 137 C48 143 67 143 73 137 C71 125 71 112 74 101 C68 108 47 108 40 101 Z" fill="url(#skinGrad3q)"/>
<path id="rear-head" data-svg-african-role="rear-head scalp rounded-occipital-contour" data-svg-african-face-width="${rearFaceWidth.toFixed(2)}" d="${skull}" fill="var(--skin)"/>
${wrapHairFit(renderHairBack(ctx), ctx, 'back')}
${earCovered ? '' : `<g data-svg-african-role="rear-visible-ear adjustable-ear"><ellipse id="ear-near" data-svg-african-role="ear near-ear" cx="86" cy="${earY.toFixed(2)}" rx="${(6.4 * earScale).toFixed(2)}" ry="${(11.8 * earScale).toFixed(2)}" fill="var(--skin)"/><path data-svg-african-role="rear-ear-detail" d="M87 ${(earY - 7 * earScale).toFixed(2)} C82 ${(earY - 5 * earScale).toFixed(2)} 82 ${(earY + 4 * earScale).toFixed(2)} 86 ${(earY + 6 * earScale).toFixed(2)}" fill="none" stroke="var(--skin-shade)" stroke-width=".85" opacity=".35"/></g>`}
${showRearEarring ? `<g id="rear-earrings" data-svg-african-role="rear-earrings visible-rear-ear-jewelry"><circle cx="87" cy="${(earY + 11.8 * earScale).toFixed(2)}" r="2.5" fill="var(--accent)"/><path d="M87 ${(earY + 14.3 * earScale).toFixed(2)} L87 ${(earY + 22 * earScale).toFixed(2)}" stroke="var(--accent)" stroke-width="1.7"/></g>` : ''}${renderHeadwear(ctx)}
</g>
</g>`;
        const yaw = ctx.sharedHeadYaw;
        const profileNose = 100 + clamp(m.noseTipX - 66.7, -2, 2);
        const profileNoseY = 75 + clamp(m.noseTipY - 78.2, -2, 2);
        const profileMouthY = 88 + clamp(m.mouthY - 89.5, -2, 2);
        const profileLipWidth = clamp((m.mouthRight - m.mouthLeft) / 4.9, 3, 5);
        const profileChinY = 104 + clamp(m.chinY - 110.8, -2, 3);
        const sharedBody = yaw === null ? body : `<g data-svg-african-role="head-motion rear-three-quarter-head" transform="${motion}">
<g data-svg-african-role="socket-anchored-rear-head-fit" transform="translate(${(1-m.headWidth)*52} ${(1-m.headHeight)*142}) scale(${m.headWidth} ${m.headHeight})">
<path id="neck" data-svg-african-role="neck continuous-neck" data-svg-african-neck-base-y="142" d="M${38+4*yaw} 99 C${43+3*yaw} 114 43 130 41 142 L63 142 C61 130 ${61+3*yaw} 114 ${66+4*yaw} 99 Z" fill="url(#skinGrad3q)"/>
<ellipse id="rear-head" data-svg-african-role="rear-head scalp" cx="${52+4*yaw}" cy="68" rx="${rearFaceWidth}" ry="45" fill="var(--skin)"/>
${[-1,1].map(side => `<g data-shoulder-profile="${side}" transform="${side < 0 ? 'translate(104 0) scale(-1 1)' : 'translate(0 0) scale(1 1)'}"><g data-shoulder-reveal="true" transform="translate(84 0) scale(${Math.max(0, side*yaw-1)} 1) translate(-84 0)">
<path data-svg-african-role="shoulder-profile-contour" d="M70 43 C80 40 91 47 93 59 C94 66 95 70 ${profileNose} ${profileNoseY} Q${profileNose+1} ${profileNoseY+3} 94 81 C93 83 95 ${profileMouthY-2} 95 ${profileMouthY} C96 ${profileMouthY+3} 93 ${profileMouthY+5} 93 ${profileMouthY+7} C93 101 86 ${profileChinY} 77 ${profileChinY} C70 104 68 98 67 91 Z" fill="var(--skin)"/>
<path d="M84 65 Q88 62.8 92 65" fill="none" stroke="var(--hair)" stroke-width="1.2" stroke-linecap="round"/>
<path data-shoulder-mouth="true" data-mouth-x="90" data-mouth-y="${profileMouthY}" data-mouth-width="${profileLipWidth}" d="M90 ${profileMouthY} Q92 ${profileMouthY} ${90+profileLipWidth} ${profileMouthY+1} Q92 ${profileMouthY+1} 90 ${profileMouthY} Z" fill="#44232b"/>
<g data-shoulder-eye="true" data-eye-x="88.5"><path d="M84.5 70 Q88.5 67.8 92 70.5 Q88.5 72.7 84.5 70 Z" fill="#fff"/><ellipse data-shoulder-pupil="true" cx="90" cy="70.5" rx="1.15" ry="1.4" fill="#282326"/></g>
${ctx.accessories.has('glasses') ? '<path data-svg-african-role="shoulder-profile-glasses" d="M83 67 Q88 65.5 93 67 L92 74 Q87 75 83 73 Z M83 68 L76 69" fill="none" stroke="var(--glass)" stroke-width="1.1" stroke-linejoin="round"/>' : ''}
</g></g>`).join('')}
<defs>${[-1,1].map(side=>{const reveal=Math.max(0,side*yaw-1);return `<clipPath id="rear-turn-hair-${side}" clipPathUnits="userSpaceOnUse"><path transform="${side<0?'translate(104 0) scale(-1 1)':'translate(0 0) scale(1 1)'}" d="M-40 -40 H144 V35 C${144-48*reveal} 43 ${144-58*reveal} 52 ${144-62*reveal} 64 C${144-65*reveal} 80 ${144-69*reveal} 100 ${144-73*reveal} 113 L${144-73*reveal} 220 H-40 Z"/></clipPath>`;}).join('')}</defs>
<g clip-path="url(#rear-turn-hair--1)"><g clip-path="url(#rear-turn-hair-1)">${headLayer(wrapHairFit(renderHairBack(ctx), ctx, 'back'), ctx)}</g></g>
${earCovered ? '' : [-1,1].map(side=>{const reveal=Math.max(0,side*yaw-1),x=52+side*34+2*yaw-side*12*reveal;return `<g data-svg-african-role="rear-visible-ear"><ellipse cx="${x}" cy="${earY}" rx="${(6.4-1.4*reveal)*earScale*(1-Math.min(1,Math.max(0,-side*yaw))*.85)}" ry="${(11.8-1.2*reveal)*earScale}" fill="var(--skin)"/><path d="M${x+side*1.5} ${earY-6} Q${x-side*3} ${earY-4} ${x} ${earY+5}" stroke="var(--skin-shade)" stroke-width=".7" fill="none" opacity="${.4*reveal}"/>${showRearEarring ? `<circle cx="${x}" cy="${earY+(12-1.2*reveal)*earScale}" r="2.5" fill="var(--accent)"/>` : ''}</g>`;}).join('')}
${headLayer(renderHeadwear(ctx),ctx)}
</g></g>`;
        const marked = svgShell('head-neck', 104, 154, mirrored(sharedBody, ctx, 104), palette, ctx.view);
        return marked.replace('<svg ', '<svg data-svg-african-role-back="back-view-premium" ');
    }

    function renderThreeQuarterFabricDetail(ctx) {
        if (ctx.back && ctx.fabricDesign === 'plain') return '';
        if (/pinstripe|school-check/.test(ctx.fabricDesign)) {
            return '<path data-svg-african-role="fabric-design pinstripe" d="M29 48 L25 204 M48 37 L46 216 M88 35 L91 216 M108 45 L116 204" fill="none" stroke="var(--accent)" stroke-width="1" opacity=".25"/>';
        }
        if (/camouflage/.test(ctx.fabricDesign)) {
            return '<g data-svg-african-role="fabric-design camouflage" fill="var(--cloth-shade)" opacity=".30"><path d="M21 59 C35 48 45 55 39 72 C29 80 16 73 21 59 Z"/><path d="M82 92 C99 78 114 91 106 109 C94 117 80 109 82 92 Z"/><path d="M39 151 C57 140 70 153 61 169 C48 176 35 168 39 151 Z"/></g>';
        }
        if (/reflective-tape/.test(ctx.fabricDesign)) {
            return '<path data-svg-african-role="fabric-design reflective-tape" d="M15 93 C44 101 94 102 129 93 M18 113 C48 121 96 122 130 113" fill="none" stroke="var(--accent)" stroke-width="5" opacity=".72"/>';
        }
        if (/sport-stripes/.test(ctx.fabricDesign)) {
            return '<path data-svg-african-role="fabric-design sport-stripes" d="M18 40 C15 88 17 157 23 211 M112 42 C124 91 124 158 116 211" fill="none" stroke="var(--accent)" stroke-width="5" opacity=".68"/>';
        }
        if (/woven|ankara|beaded|dashiki|subtle-trim/.test(ctx.fabricDesign)) {
            return '<path data-svg-african-role="fabric-design cultural-trim" d="M38 43 C53 51 82 52 99 43 M35 187 C56 195 91 196 112 187" fill="none" stroke="var(--accent)" stroke-width="2.4" opacity=".55"/>';
        }
        return '';
    }

    function renderThreeQuarterTie(ctx) {
        if (ctx.neckTieType === 'none') return '';
        if (/bow/.test(ctx.neckTieType)) {
            return '<g data-svg-african-role="tie bow-tie"><path d="M68 44 C59 38 55 43 56 51 C62 52 66 50 69 47 Z M70 47 C74 50 80 52 86 50 C87 42 82 38 71 44 Z" fill="var(--tie)"/><circle cx="69.5" cy="46.5" r="3.2" fill="var(--tie)"/></g>';
        }
        const slim = ctx.neckTieType === 'slim';
        const wide = ctx.neckTieType === 'wide';
        const half = wide ? 7 : (slim ? 3.5 : 5);
        return `<path data-svg-african-role="tie perspective-centerline tie-type-${ctx.neckTieType} tie-design-${ctx.neckTieDesign}" d="M${69 - half} 43 L${69 + half} 43 L${73 + half * .45} 91 L69 107 L${65 - half * .45} 91 Z" fill="var(--tie)"/>`;
    }

    function clothingFamily(ctx) {
        // Resolved pieces take precedence over the preset's original profession/outfit.
        const top = ctx.topClothing;
        if (/academic|lawyer-gown/.test(top)) return 'academic';
        if (/lab-coat|scrubs/.test(top)) return 'health';
        if (/agbada|buba|senator|dashiki|kaftan|robe|kimono|poncho|drape|cheongsam/.test(top)) return 'traditional';
        if (/suit|blazer|jacket|corporate-vest|banker/.test(top) && !/pilot/.test(top)) return 'business';
        if (/tracksuit|jersey|gym/.test(top)) return 'sports';
        if (/engineer|security|military|workwear|chef|pilot/.test(top)) return 'workwear';
        return 'casual';
    }

    function clothingFill(ctx) {
        return ctx.topClothing === 'lab-coat' || ctx.topClothing === 'chef-coat'
            ? 'var(--cloth)' : ctx.topClothing === 'plain-business-suit' ? 'var(--cloth)' : 'url(#clothGrad3q)';
    }

    function renderFrontTorsoAccessories(ctx) {
        if (ctx.back) return '';
        const pieces = {
            'stethoscope': '<path d="M46 39 C39 61 42 88 62 105 M87 39 C96 62 92 89 73 105 M62 105 C56 121 78 125 82 110" fill="none" stroke="#26343f" stroke-width="2.5" stroke-linecap="round"/><circle cx="82" cy="110" r="5" fill="#a8bdc9" stroke="#26343f" stroke-width="2"/>',
            'id-badge': '<rect x="90" y="74" width="18" height="26" rx="2" fill="#eef6ff" stroke="#7ba7c7"/><path d="M93 79 H105 M99 74 V68 M94 94 H104" stroke="#7ba7c7" stroke-width="1.4"/><circle cx="99" cy="87" r="3" fill="#7ba7c7"/>',
            'beads': '<path d="M48 34 C45 58 53 72 68 74 C84 72 91 55 88 35" fill="none" stroke="var(--accent)" stroke-width="5" stroke-dasharray="1 6" stroke-linecap="round"/>',
            'notebook': '<g transform="rotate(-8 28 168)"><rect x="17" y="148" width="24" height="34" rx="2" fill="#fff9e9" stroke="var(--accent)" stroke-width="1.8"/><path d="M22 153 V177 M27 153 V177" stroke="#ae9147" stroke-width="1"/></g>',
            'diploma': '<g transform="rotate(-10 101 162)"><path d="M82 149 Q102 145 122 149 V174 Q101 171 82 174 Z" fill="#fff9e9" stroke="#ae9147" stroke-width="1.3"/><path d="M100 148 V174" stroke="var(--accent)" stroke-width="5"/><path d="M86 153 H95 M105 153 H118" stroke="#c4b48e"/></g>',
            'backpack': '<path d="M36 29 C29 60 33 111 42 147 M102 31 C114 62 110 114 104 147" fill="none" stroke="var(--cloth-shade)" stroke-width="7"/><path d="M35 85 L108 91" stroke="var(--accent)" stroke-width="2"/>',
            'chalk': '<rect x="102" y="125" width="16" height="3.4" rx="1.4" fill="#fff" stroke="#bac5cf" stroke-width=".7"/>',
            'lapel-mic': '<circle cx="79" cy="58" r="2.8" fill="#26343f" stroke="#a8bdc9"/><path d="M79 61 C90 70 81 91 92 106" fill="none" stroke="#26343f" stroke-width="1.2"/>',
            'tool-belt': '<path d="M17 165 C48 173 88 174 117 165 L117 179 C89 187 48 187 17 179 Z" fill="var(--tie)"/><rect x="28" y="173" width="23" height="29" rx="3" fill="var(--accent)"/><rect x="88" y="175" width="21" height="25" rx="3" fill="var(--accent)"/><path d="M35 184 V197 M96 184 V195" stroke="var(--cloth-shade)" stroke-width="2"/>',
            'chef-tools': '<path d="M95 87 V116 M101 87 V116 M107 87 V116" stroke="#26343f" stroke-width="2"/><ellipse cx="95" cy="85" rx="2.5" ry="4" fill="#26343f"/><path d="M104 80 V86 H110 V80" fill="none" stroke="#26343f" stroke-width="1.4"/><path d="M90 102 L112 104 L111 126 L90 124 Z" fill="var(--cloth-shade)"/>',
            'rank-badge': ctx.topClothing === 'pilot-jacket'
                ? '<path d="M87 58 L97 54 L107 60 L99 59 L97 63 L94 59 Z" fill="var(--accent)"/>'
                : '<path d="M90 60 L97 56 L105 62 M90 65 L97 61 L105 67 M90 70 L97 66 L105 72" fill="none" stroke="var(--accent)" stroke-width="2.2"/>',
            'radio': '<rect x="96" y="54" width="16" height="26" rx="3" fill="#26343f"/><path d="M106 54 L110 40" stroke="#26343f" stroke-width="2"/><circle cx="104" cy="62" r="2.5" fill="var(--accent)"/><path d="M100 69 H108 M100 73 H108" stroke="#a8bdc9" stroke-width="1"/>',
            'whistle': '<path d="M53 35 C50 65 65 85 69 90 C74 83 88 61 86 35" fill="none" stroke="#26343f" stroke-width="1.5"/><path d="M64 88 H74 V96 H68 L64 93 Z" fill="#a8bdc9" stroke="#26343f" stroke-width="1"/>'
        };
        return Object.entries(pieces).filter(([id]) => ctx.accessories.has(id))
            .map(([id, body]) => `<g data-svg-african-role="accessory ${id}">${body}</g>`).join('');
    }

    function renderTorso(ctx, palette) {
        const female = ctx.presentation === 'female';
        const family = clothingFamily(ctx);
        const health = family === 'health';
        const academic = family === 'academic';
        const traditional = family === 'traditional';
        const business = family === 'business';
        const sports = family === 'sports';
        const workwear = family === 'workwear';
        const plain = ctx.topClothing === 'plain-business-suit';
        const wideTraditional = /agbada/.test(ctx.topClothing);
        const structuredUniform = /pilot|security|military/.test(ctx.topClothing);
        const a = ctx.adjustments || {};
        const chest = clamp(a.chestProjection || 0, -0.4, 0.55) * 6;
        const breast = female ? clamp(a.breastProjection || 0, -0.4, 0.6) * 6 : 0;
        const abdomen = clamp(a.abdomenProjection || 0, -0.45, 1) * 10;
        const abdomenWidth = clamp(a.abdomenWidth || 0, -0.4, 0.65) * 6;
        const backCurve = clamp(a.backCurve || 0, -0.45, 0.55) * 4;
        const buttock = clamp(a.buttockProjection || 0, -0.4, 0.65) * 5;
        const topWearLength = clamp(a.topWearLength || 0, -0.45, 0.55);
        const hemShift = clamp(topWearLength * 24, -11, 8);
        const upperEdge = 119 + chest + breast * 0.45;
        const bellyEdge = 125 + abdomen + abdomenWidth;
        const hemEdge = 116 + buttock * 0.45;
        const backEdge = 7 - backCurve * 0.45;
        const rearNearEdge = (structuredUniform ? 122 : 124) + chest * 0.35 + abdomenWidth * 0.32;
        const rearBellyEdge = (structuredUniform ? 124 : 126) + abdomen * 0.32 + abdomenWidth * 0.45;
        const rearHemY = (wideTraditional ? 220 : (structuredUniform ? 211 : 214)) + hemShift;
        const rearOutline = wideTraditional
            ? `M${(10 - backCurve * .3).toFixed(2)} 49 C24 35 40 29 54 29 C56 32 62 35 68 35 C74 35 79 32 81 29 C101 30 120 38 ${(128 + chest * .2).toFixed(2)} 52 C${(131 + abdomen * .2 + abdomenWidth * .25).toFixed(2)} 96 ${(129 + abdomen * .2).toFixed(2)} 166 ${(121 + buttock * .22).toFixed(2)} ${rearHemY} C92 ${rearHemY + 6} 43 ${rearHemY + 5} 14 ${rearHemY - 5} C8 166 ${(5 - backCurve * .4).toFixed(2)} 96 ${(10 - backCurve * .3).toFixed(2)} 49 Z`
            : `M${(18 - backCurve * .35).toFixed(2)} 46 C29 35 42 29 54 29 C56 32 62 35 68 35 C74 35 78 32 80 29 C95 30 111 36 ${(rearNearEdge - 3).toFixed(2)} 47 C${(rearBellyEdge - 4).toFixed(2)} 82 ${(117 + abdomen * .28 + abdomenWidth * .38).toFixed(2)} 154 ${(structuredUniform ? 112 : 114) + buttock * .25} ${rearHemY} C89 ${rearHemY + 6} 53 ${rearHemY + 5} ${structuredUniform ? 25 : 23} ${rearHemY + 1} C${(17 - backCurve).toFixed(2)} 158 ${(13 - backCurve * .35).toFixed(2)} 81 ${(18 - backCurve * .35).toFixed(2)} 46 Z`;
        const outline = ctx.back
            ? rearOutline
            : `M${backEdge.toFixed(2)} 30 C23 11 46 7 66 14 C86 12 105 21 ${upperEdge.toFixed(2)} 39 C${bellyEdge.toFixed(2)} 78 ${(125 + abdomen + abdomenWidth).toFixed(2)} 154 ${hemEdge.toFixed(2)} ${220 + hemShift} C90 ${227 + hemShift} 45 ${227 + hemShift} ${(14 - buttock * .2).toFixed(2)} ${217 + hemShift} C${(4 - backCurve).toFixed(2)} 150 ${(1 - backCurve * .25).toFixed(2)} 68 ${backEdge.toFixed(2)} 30 Z`;
        const rearAccessories = ctx.back ? `${ctx.accessories.has('backpack') ? '<path id="rear-backpack" data-svg-african-role="rear-backpack backpack" d="M31 50 C42 31 91 31 108 52 L111 171 C91 190 50 190 27 169 Z" fill="var(--cloth-shade)" opacity=".88"/><path data-svg-african-role="backpack-strap" d="M37 51 C45 78 44 119 37 151 M101 52 C91 80 92 121 102 151" fill="none" stroke="var(--accent)" stroke-width="5" opacity=".55"/>' : ''}${ctx.accessories.has('tool-belt') ? '<path id="rear-tool-belt" data-svg-african-role="rear-tool-belt tool-belt" d="M24 163 C49 171 87 172 112 163 L111 178 C86 186 50 185 25 177 Z" fill="var(--tie)"/><rect x="83" y="169" width="19" height="27" rx="3" fill="var(--accent)"/>' : ''}${ctx.accessories.has('radio') ? '<g id="rear-radio" data-svg-african-role="rear-radio radio"><rect x="94" y="69" width="17" height="28" rx="3" fill="var(--ink)"/><path d="M104 69 L109 54" stroke="var(--ink)" stroke-width="3"/><circle cx="102" cy="80" r="3" fill="var(--accent)"/></g>' : ''}` : '';
        const category = academic ? 'academic-gown' : health ? 'healthcare-wear' : traditional ? 'traditional-wear' : business ? 'professional-wear' : sports ? 'sports-wear' : workwear ? 'workwear' : 'casual-wear';
        const baseFill = clothingFill(ctx);
        const frontDetail = ctx.back
            ? (plain ? '' : '<path data-svg-african-role="rear-yoke low-back-yoke jaw-clear-yoke" d="M24 58 C50 62 89 63 113 56" fill="none" stroke="var(--cloth-shade)" stroke-width="1.4" opacity=".28"/>')
            : health
                ? '<path data-svg-african-role="lab-coat-seam perspective-centerline" d="M69 42 L72 203 M89 55 L105 59" stroke="var(--accent)" stroke-width="2" fill="none"/>'
                : traditional
                    ? '<path data-svg-african-role="traditional-neckline" d="M57 27 C60 42 62 54 69 65 C76 53 79 41 81 27 M69 65 L70 132" fill="none" stroke="var(--accent)" stroke-width="3"/>'
                    : sports
                        ? '<path data-svg-african-role="sports-neckline" d="M56 24 C61 35 76 36 82 24 M24 52 C19 99 20 161 25 205 M111 50 C123 101 122 162 115 207" fill="none" stroke="var(--accent)" stroke-width="4"/>'
                        : workwear
                            ? `<g data-svg-african-role="uniform-details uniform-${ctx.topClothing}">
<path data-svg-african-role="workwear-placket" d="M68 39 L70 201" fill="none" stroke="var(--cloth-shade)" stroke-width="1.6"/>
<path data-svg-african-role="uniform-pocket" d="M88 61 L108 65 L107 91 L88 88 Z" fill="var(--cloth-shade)" opacity=".42"/>
${ctx.topClothing === 'chef-coat' ? '<path data-svg-african-role="chef-double-buttons" d="M59 64 L60 172 M80 64 L81 172" stroke="var(--ink)" stroke-width="3" stroke-dasharray="1 19" stroke-linecap="round"/>' : ''}
${ctx.topClothing === 'pilot-jacket' ? '<path data-svg-african-role="pilot-epaulettes" d="M26 39 L46 33 M91 34 L111 43" stroke="var(--accent)" stroke-width="4"/>' : ''}
</g>`
                            : business && !plain ? '<path data-svg-african-role="lapel" d="M44 22 L57 76 L68 43 L79 79 L97 26" fill="none" stroke="var(--cloth-shade)" stroke-width="2" opacity=".65"/>' : '';
        const shirtPanel = business && !ctx.back
            ? '<path data-svg-african-role="shirt-panel tailored-shirt-inset" d="M52 19 C59 30 65 39 69 45 C75 34 80 25 85 20 L82 49 L73 116 L65 113 L56 49 Z" fill="var(--blouse)"/>'
            : '';
        const clothing = academic
            ? `<path data-svg-african-role="academic-gown torso-clothing top-${ctx.topClothing}${ctx.back ? ' open-rear-neckline' : ''}" d="${outline}" fill="${baseFill}"/>${ctx.back
                ? '<path data-svg-african-role="academic-gown-rear-yoke low-back-yoke" d="M24 55 C47 64 90 64 113 56" fill="none" stroke="var(--cloth-shade)" stroke-width="3"/><path data-svg-african-role="academic-gown-rear-pleats" d="M38 65 C34 109 35 160 32 204 M54 67 L53 209 M85 67 L88 209 M101 64 C107 113 105 169 108 202" fill="none" stroke="var(--cloth-shade)" stroke-width="2.2" opacity=".45"/>'
                : '<path data-svg-african-role="academic-gown-front-panel" d="M45 19 L72 91 L89 19 L103 27 L89 213 L44 214 L29 31 Z" fill="var(--cloth-shade)"/><path d="M54 22 L72 55 L81 21" fill="none" stroke="var(--accent)" stroke-width="5"/>'}`
            : `<path data-svg-african-role="torso-clothing ${category} top-${ctx.topClothing} outfit-${ctx.outfit} fabric-${ctx.fabricDesign}${ctx.back ? ` open-rear-neckline rear-${wideTraditional ? 'wide-drape' : (structuredUniform ? 'tailored-uniform' : 'shaped-silhouette')}` : ''}" d="${outline}" fill="${baseFill}"/>${shirtPanel}${frontDetail}${business && !ctx.back ? renderThreeQuarterTie(ctx) : ''}${plain ? '' : renderThreeQuarterFabricDetail(ctx)}`;
        const collarFill = business || health || academic ? 'var(--blouse)' : 'var(--cloth)';
        const neckSeat = ctx.back
            ? `<g data-svg-african-role="neck-seat rear-neck-seat recessed-neck-seat smooth-neck-bridge">
<path data-svg-african-role="rear-neck-inset continuous-rear-neck-bridge" d="M54.5 15 C62 13 74 13 81 15 L81 28 C79 33 74 36 68 36 C63 36 57 33 54.5 28 Z" fill="url(#skinGrad3q)"/>
<path data-svg-african-role="rear-collar fitted-back-collar jaw-clear-collar" d="M53 29 C55 35 61 39 68 39 C76 39 81 35 83 29 L82 37 C77 43 59 43 54 36 Z" fill="${baseFill}"/>
</g>`
            : `<g data-svg-african-role="neck-seat fitted-neck-seat collar-integrated-neck">
<path data-svg-african-role="neck-opening directional-neck-opening matched-neck-inset" d="M57.5 16.5 C60.5 21 61 25 59 28 L77.5 28 C75.5 24 76 20.5 78.5 17 C74 13.5 62 13.2 57.5 16.5 Z" fill="url(#skinGrad3q)"/>
<path data-svg-african-role="collar-bridge closed-neck-gap" d="M59 27 L68 40 L77.5 28 L74 47 L68 54 L62 47 Z" fill="${collarFill}"/>
<path data-svg-african-role="collar-edge left-collar-edge" d="M31 29 L57.5 16.5 C58.3 22 61.5 27.5 66.5 31.5 L52 49 Z" fill="${collarFill}" stroke="var(--cloth-shade)" stroke-width="1"/>
<path data-svg-african-role="collar-edge right-collar-edge" d="M78.5 17 L103 29 L84 50 L69.5 31.5 C74.2 28 77.4 22.5 78.5 17 Z" fill="${collarFill}" stroke="var(--cloth-shade)" stroke-width="1"/>
${business && ctx.neckTieType !== 'none' && !/bow/.test(ctx.neckTieType) ? '<path data-svg-african-role="tie-knot joined-tie-knot" d="M64.5 35.5 L72.5 35.5 L75.5 43 L69.5 54 L62.5 43 Z" fill="var(--tie)"/>' : ''}
</g>`;
        const bustY = 73 + breast * 0.35;
        const rearShoulders = ctx.back
            ? '<path data-svg-african-role="near-shoulder perspective-shoulder rear-shoulder jaw-clear-shoulder" d="M18 46 C29 35 42 30 52 29" fill="none" stroke="var(--cloth-shade)" stroke-width="1.8" opacity=".38"/><path data-svg-african-role="far-shoulder perspective-shoulder rear-shoulder jaw-clear-shoulder" d="M82 30 C98 31 112 38 121 48" fill="none" stroke="var(--cloth-shade)" stroke-width="1.4" opacity=".28"/>'
            : '<path data-svg-african-role="near-shoulder perspective-shoulder" d="M8 33 C22 16 38 10 51 12" fill="none" stroke="var(--cloth-shade)" stroke-width="2.2" opacity=".48"/><path data-svg-african-role="far-shoulder perspective-shoulder" d="M82 14 C101 15 117 25 126 40" fill="none" stroke="var(--cloth-shade)" stroke-width="1.6" opacity=".34"/>';
        const perspectiveSeam = plain ? '' : ctx.back
            ? '<path data-svg-african-role="perspective-seam directional-torso-plane rear-low-seam" d="M19 65 C46 70 88 70 117 63 M24 207 C50 215 89 215 114 207" fill="none" stroke="var(--accent)" stroke-width="1.6" opacity=".24"/>'
            : '<path data-svg-african-role="perspective-seam directional-torso-plane" d="M9 51 C39 31 92 35 126 60 M20 211 C51 220 91 220 120 211" fill="none" stroke="var(--accent)" stroke-width="1.8" opacity=".28"/>';
        const shape = `<g data-svg-african-role="torso authored-three-quarter-torso ${ctx.back ? 'back-view-premium refined-rear-silhouette' : 'front-view-premium'}" data-svg-african-clothing-family="${family}" data-svg-african-top-hem-shift="${hemShift.toFixed(2)}" data-svg-african-top-clothing="${ctx.topClothing}" data-svg-african-bottom-clothing="${ctx.bottomClothing}" data-svg-african-abdomen-projection="${abdomen.toFixed(2)}" data-svg-african-chest-projection="${chest.toFixed(2)}" data-svg-african-breast-projection="${breast.toFixed(2)}">
<defs><clipPath id="torsoClip3q"><path d="${outline}"/></clipPath></defs>
<g clip-path="url(#torsoClip3q)">${clothing}
${plain ? '' : rearShoulders}
${perspectiveSeam}
${female && !ctx.back && !health && !traditional && !plain ? `<path data-svg-african-role="female-bust-contour adjustable-bust" d="M37 ${bustY.toFixed(1)} C51 ${(61 - breast * .45).toFixed(1)} 62 ${(66 - breast * .35).toFixed(1)} 68 ${(80 + breast * .4).toFixed(1)} C76 ${(64 - breast * .35).toFixed(1)} 93 ${(63 - breast * .35).toFixed(1)} 105 ${(78 + breast * .25).toFixed(1)}" fill="none" stroke="var(--cloth-shade)" stroke-width="2" opacity=".32"/>` : ''}
${globalThis.SvgAfricanPremiumAssets?.renderOccupationGarment(ctx.topClothing, { back: ctx.back, hem: 211 + hemShift, waist: 146 }) || ''}
${rearAccessories}${renderFrontTorsoAccessories(ctx)}</g>
${neckSeat}
</g>`;
        return svgShell('torso', 136, 238, mirrored(shape, ctx, 136), palette, ctx.view);
    }

    function renderArm(partKey, ctx, palette) {
        const anatomicalSide = partKey.startsWith('right') ? 'right' : 'left';
        const near = anatomicalSide === ctx.nearSide;
        const sleeveEnd = THREE_QUARTER_SLEEVE_END[ctx.sleeveLength] || THREE_QUARTER_SLEEVE_END.wrist;
        const x = near ? 35 : 31;
        const width = near ? 25.5 : 22;
        const forearmWidth = near ? 20 : 18.5;
        const elbowX = x + (near ? -1.5 : 1.5);
        const wristX = x + (near ? 1 : 3);
        const muscle = clamp(ctx.adjustments?.muscleDefinition || 0, -0.45, 0.55);
        const upperBulge = muscle * (near ? 4.4 : 3.4);
        const forearmBulge = muscle * (near ? 2.8 : 2.1);
        const handScale = 1 + clamp(ctx.adjustments?.handSize || 0, -0.45, 0.55) * 0.34;
        const handHalf = 7 * handScale;
        const thumbReach = 14 * handScale;
        const skinShoulderY = ctx.back ? 22 : 17;
        const sleeveShoulderY = ctx.back ? 22 : 14;
        const sleeveCrownY = ctx.back ? 15 : 4;
        const sleeveOverhang = ctx.back ? 1.5 : 4;
        const sleeveFill = /engineer-vest|corporate-vest/.test(ctx.topClothing) ? 'var(--blouse)' : clothingFill(ctx);
        const body = `<g data-svg-african-role="${partKey} ${near ? 'near-limb' : 'far-limb'} authored-three-quarter-limb natural-perspective-width" data-svg-african-muscle-definition="${muscle.toFixed(2)}" data-svg-african-sleeve-length="${ctx.sleeveLength}" data-svg-african-top-clothing="${ctx.topClothing}" opacity="${near ? 1 : .96}">
<path data-svg-african-role="arm-skin continuous-arm ${near ? 'near-arm-volume' : 'far-arm-recession'} anatomical-muscle-bulge${ctx.back ? ' rear-shoulder-seat' : ''}" d="M${x - width / 2} ${skinShoulderY} C${x - width / 2 - 4 - upperBulge} 47 ${elbowX - forearmWidth / 2 - 1 - upperBulge * .55} 92 ${elbowX - forearmWidth / 2} 126 C${elbowX - forearmWidth / 2 - 2 - forearmBulge} 159 ${wristX - forearmWidth / 2 - forearmBulge * .55} 199 ${wristX - handHalf} 221 C${wristX - 10 * handScale} 235 ${wristX - 7 * handScale} 250 ${wristX + 1} 256 C${wristX + 11 * handScale} 252 ${wristX + 13 * handScale} 237 ${wristX + 8 * handScale} 221 C${wristX + forearmWidth / 2 + forearmBulge * .55} 190 ${elbowX + forearmWidth / 2 + 2 + forearmBulge} 158 ${elbowX + forearmWidth / 2} 126 C${x + width / 2 + 4 + upperBulge} 88 ${x + width / 2 + 3 + upperBulge} 47 ${x + width / 2} ${skinShoulderY} Z" fill="url(#skinGrad3q)"/>
<path data-svg-african-role="sleeve sleeve-${ctx.sleeveLength} top-${ctx.topClothing}${ctx.back ? ' fitted-rear-sleeve-root' : ''}" d="M${x - width / 2 - sleeveOverhang} ${sleeveShoulderY} C${x - 4} ${sleeveCrownY} ${x + 7} ${sleeveCrownY + 1} ${x + width / 2 + sleeveOverhang} ${sleeveShoulderY + 1} L${x + width / 2 + 2 + upperBulge * .35} ${sleeveEnd} C${x + 5} ${sleeveEnd + 7} ${x - 6} ${sleeveEnd + 6} ${x - width / 2 - 2 - upperBulge * .35} ${sleeveEnd} Z" fill="${sleeveFill}"/>
${anatomicalSide === 'left' && ctx.accessories.has('watch') ? `<g data-svg-african-role="accessory watch wrist-mounted-watch"><path d="M${wristX - 9} 211 L${wristX + 9} 211 L${wristX + 8} 219 L${wristX - 8} 219 Z" fill="var(--tie)"/><rect x="${wristX - 5}" y="209" width="10" height="12" rx="2" fill="#26343f" stroke="var(--accent)" stroke-width="1.2"/><path d="M${wristX} 211 V215 L${wristX + 3} 216" fill="none" stroke="#fff" stroke-width="1"/></g>` : ''}
<path data-svg-african-role="hand palm thumb adjustable-hand" data-svg-african-hand-scale="${handScale.toFixed(3)}" d="M${wristX - handHalf} 220 C${wristX - 12 * handScale} 229 ${wristX - 10 * handScale} 246 ${wristX - 2} 255 C${wristX + 6 * handScale} 257 ${wristX + 11 * handScale} 248 ${wristX + 10 * handScale} 237 L${wristX + thumbReach} 242 C${wristX + 17 * handScale} 238 ${wristX + 13 * handScale} 228 ${wristX + 8 * handScale} 222 Z" fill="var(--skin)"/><path d="M${wristX - 3} 238 L${wristX + 6 * handScale} 239 M${wristX - 2} 244 L${wristX + 6 * handScale} 245" stroke="var(--skin-shade)" stroke-width="1" opacity=".45"/>
</g>`;
        return svgShell(partKey, 66, 260, anatomicalSide === 'left' ? `<g transform="translate(66 0) scale(-1 1)">${body}</g>` : body, palette, ctx.view);
    }

    function renderLeg(partKey, ctx, palette) {
        const anatomicalSide = partKey.startsWith('right') ? 'right' : 'left';
        const near = anatomicalSide === ctx.nearSide;
        const center = near ? 40 : 15;
        const thigh = near ? 28 : 25;
        const calf = near ? 22 : 20;
        const kneeCenter = center + (near ? -1.5 : 2);
        const ankleCenter = center + (near ? -2 : 4);
        const footSize = clamp(ctx.adjustments?.footSize || 0, -0.45, 0.55);
        const footReach = Math.min(near ? 19.5 : 27, (near ? 18.5 : 24) * (1 + footSize * .28));
        const shorts = /shorts/.test(ctx.bottomClothing);
        const muscle = clamp(ctx.adjustments?.muscleDefinition || 0, -0.45, 0.55);
        const thighBulge = muscle * (near ? 3.8 : 3.0);
        const calfBulge = muscle * (near ? 3.1 : 2.4);
        const bottomWearLength = clamp(ctx.adjustments?.bottomWearLength || 0, -0.45, 0.55);
        const shortsEnd = 103 + bottomWearLength * 46;
        const shortsCenter = center + (kneeCenter - center) * shortsEnd / 129;
        const shortsHalf = 10.5 + thighBulge * .35;
        const trouserEnd = Math.min(225, 225 + bottomWearLength * 66);
        const trouserCenter = kneeCenter + (ankleCenter - kneeCenter) * (trouserEnd - 129) / 96;
        const trouserHalf = 7 + calfBulge * .25;
        const clothingPath = shorts
            ? `M${center - thigh / 2 - 4} 8 C${center - 5} 1 ${center + 7} 2 ${center + thigh / 2 + 4} 9 C${center + thigh / 2 + 3 + thighBulge * .3} ${shortsEnd * .45} ${shortsCenter + shortsHalf + 1} ${shortsEnd * .8} ${shortsCenter + shortsHalf} ${shortsEnd} C${shortsCenter + 4} ${shortsEnd + 4} ${shortsCenter - 4} ${shortsEnd + 4} ${shortsCenter - shortsHalf} ${shortsEnd} C${shortsCenter - shortsHalf - 1} ${shortsEnd * .8} ${center - thigh / 2 - 4 - thighBulge * .3} ${shortsEnd * .45} ${center - thigh / 2 - 4} 8 Z`
            : `M${center - thigh / 2 - 4} 8 C${center - 5} 1 ${center + 7} 2 ${center + thigh / 2 + 4} 9 C${center + thigh / 2 + 3 + thighBulge * .3} 67 ${kneeCenter + 8 + thighBulge * .35} 128 ${trouserCenter + trouserHalf} ${trouserEnd} C${trouserCenter + 3} ${trouserEnd + 4} ${trouserCenter - 5} ${trouserEnd + 3} ${trouserCenter - trouserHalf} ${trouserEnd} C${kneeCenter - 9 - thighBulge * .35} ${Math.min(164, trouserEnd - 20)} ${center - thigh / 2 - 4 - thighBulge * .3} 72 ${center - thigh / 2 - 4} 8 Z`;
        const clothing = ctx.skirtLike
            ? ''
            : `<path data-svg-african-role="bottom-clothing bottom-${ctx.bottomClothing} ${shorts ? 'shorts shorts-leg' : 'trouser'} adjustable-bottom-hem" data-svg-african-bottom-hem="${(shorts ? shortsEnd : trouserEnd).toFixed(2)}" d="${clothingPath}" fill="var(--bottom)"/>`;
        const sandal = /sandal/.test(ctx.footwear);
        const sneaker = /sneaker|casual|clinical/.test(ctx.footwear);
        const footFill = sandal ? 'var(--skin)' : 'var(--shoe)';
        const frontFootwearDetail = sandal
            ? `<path data-svg-african-role="sandal-straps" d="M${ankleCenter - 5} 239 L${ankleCenter + 8} 252 M${ankleCenter + 7} 238 L${ankleCenter - 2} 252" fill="none" stroke="var(--shoe)" stroke-width="2.5"/>`
            : sneaker
                ? `<path data-svg-african-role="shoe-detail sneaker-sole" d="M${ankleCenter - 7} 251 C${ankleCenter + 3} 255 ${ankleCenter + 13} 254 ${ankleCenter + footReach + 1} 251" fill="none" stroke="#fff" stroke-width="2.2" opacity=".72"/>`
                : `<path data-svg-african-role="shoe-detail formal-sole" d="M${ankleCenter - 6} 250 C${ankleCenter + 4} 253 ${ankleCenter + 13} 252 ${ankleCenter + footReach + 1} 249" fill="none" stroke="#fff" stroke-width="1.4" opacity=".35"/>`;
        const rearFootHalf = (near ? 12.5 : 10.5) * (1 + footSize * .24);
        const rearFootPath = `M${ankleCenter - 7} 226 C${ankleCenter - 8} 235 ${ankleCenter - rearFootHalf} 245 ${ankleCenter - rearFootHalf + 1} 251 C${ankleCenter - rearFootHalf + 5} 257 ${ankleCenter + rearFootHalf - 5} 258 ${ankleCenter + rearFootHalf} 252 C${ankleCenter + rearFootHalf + 1} 246 ${ankleCenter + 9} 236 ${ankleCenter + 7} 228 C${ankleCenter + 3} 232 ${ankleCenter - 2} 232 ${ankleCenter - 7} 226 Z`;
        const rearFootwearDetail = sandal
            ? `<path data-svg-african-role="sandal-straps rear-sandal-straps" d="M${ankleCenter - rearFootHalf + 2} 243 C${ankleCenter - 5} 247 ${ankleCenter + 5} 247 ${ankleCenter + rearFootHalf - 2} 243 M${ankleCenter - rearFootHalf + 3} 249 C${ankleCenter - 4} 252 ${ankleCenter + 4} 252 ${ankleCenter + rearFootHalf - 3} 249" fill="none" stroke="var(--shoe)" stroke-width="2.2" stroke-linecap="round"/>`
            : sneaker
                ? `<path data-svg-african-role="shoe-detail rear-heel-counter sneaker-heel-counter" d="M${ankleCenter - 7} 235 C${ankleCenter - 3} 239 ${ankleCenter + 4} 239 ${ankleCenter + 8} 235 M${ankleCenter} 237 L${ankleCenter + .5} 251" fill="none" stroke="#fff" stroke-width="1.5" opacity=".5"/><path data-svg-african-role="shoe-detail rear-sole" d="M${ankleCenter - rearFootHalf + 1} 251 C${ankleCenter - 5} 256 ${ankleCenter + 6} 257 ${ankleCenter + rearFootHalf} 252" fill="none" stroke="#fff" stroke-width="2.2" opacity=".72"/>`
                : `<path data-svg-african-role="shoe-detail rear-heel-counter formal-heel-counter" d="M${ankleCenter - 7} 236 C${ankleCenter - 3} 240 ${ankleCenter + 4} 240 ${ankleCenter + 8} 236 M${ankleCenter} 238 L${ankleCenter + .5} 250" fill="none" stroke="var(--shoe-light)" stroke-width="1.3" opacity=".42"/><path data-svg-african-role="shoe-detail rear-sole" d="M${ankleCenter - rearFootHalf + 1} 251 C${ankleCenter - 5} 256 ${ankleCenter + 6} 257 ${ankleCenter + rearFootHalf} 252" fill="none" stroke="#fff" stroke-width="1.35" opacity=".34"/>`;
        const foot = ctx.back
            ? `<path data-svg-african-role="foot directional-foot facing-foot rear-facing-footwear foreshortened-rear-shoe footwear-${ctx.footwear}" data-svg-african-foot-size="${footSize.toFixed(2)}" data-svg-african-foot-view="rear-three-quarter" d="${rearFootPath}" fill="${footFill}"/>${rearFootwearDetail}`
            : `<path data-svg-african-role="foot directional-foot facing-foot forward-facing-footwear footwear-${ctx.footwear}" data-svg-african-foot-size="${footSize.toFixed(2)}" data-svg-african-foot-view="front-three-quarter" d="M${ankleCenter - 7} 226 C${ankleCenter - 10} 238 ${ankleCenter - 12} 247 ${ankleCenter - 5} 255 L${ankleCenter + footReach} 255 C${ankleCenter + footReach + 7} 250 ${ankleCenter + footReach + 1} 243 ${ankleCenter + 7} 234 Z" fill="${footFill}"/>${frontFootwearDetail}`;
        const body = `<g data-svg-african-role="${partKey} ${near ? 'near-limb' : 'far-limb'} authored-three-quarter-limb staggered-hip natural-perspective-width" data-svg-african-muscle-definition="${muscle.toFixed(2)}" data-svg-african-bottom-clothing="${ctx.bottomClothing}" data-svg-african-footwear="${ctx.footwear}" opacity="${near ? 1 : .96}">
<path data-svg-african-role="leg-skin continuous-leg ${near ? 'near-leg-volume' : 'far-leg-recession'} anatomical-muscle-bulge" d="M${center - thigh / 2} 13 C${center - thigh / 2 - 2 - thighBulge} 58 ${kneeCenter - thigh / 2 - thighBulge * .55} 101 ${kneeCenter - calf / 2} 129 C${kneeCenter - calf / 2 - 2 - calfBulge} 168 ${ankleCenter - calf / 2 - calfBulge * .45} 211 ${ankleCenter - 6} 235 L${ankleCenter + 7} 235 C${ankleCenter + calf / 2 + calfBulge * .45} 207 ${kneeCenter + calf / 2 + 1 + calfBulge} 165 ${kneeCenter + calf / 2} 128 C${kneeCenter + thigh / 2 + 2 + thighBulge * .55} 91 ${center + thigh / 2 + 2 + thighBulge} 51 ${center + thigh / 2} 13 Z" fill="url(#skinGrad3q)"/>
${clothing}
${shorts && !ctx.skirtLike ? `<path data-svg-african-role="shorts-hem fitted-short-hem" d="M${shortsCenter - shortsHalf} ${shortsEnd} C${shortsCenter - 4} ${shortsEnd + 4} ${shortsCenter + 4} ${shortsEnd + 4} ${shortsCenter + shortsHalf} ${shortsEnd}" fill="none" stroke="var(--accent)" stroke-width="1.5"/>` : ''}
${foot}
</g>`;
        // Front and rear views reverse the visual stage side of each anatomical
        // leg. Mirror on XOR so both silhouettes point inward beneath the pelvis.
        const directionMirrored = ctx.left !== ctx.back;
        return svgShell(partKey, 58, 260, directionMirrored ? `<g transform="translate(58 0) scale(-1 1)">${body}</g>` : body, palette, ctx.view);
    }

    function renderPartSvg(asset, partKey, config = {}, palette = {}, options = {}) {
        if (!THREE_QUARTER_VIEWS.has(normalizeId(asset?.view))) return '';
        const ctx = contextFor(asset, config, options);
        if (partKey === 'head-neck') return ctx.back ? renderBackHead(ctx, palette) : renderFrontHead(ctx, palette);
        if (partKey === 'torso') return renderTorso(ctx, palette);
        if (partKey === 'right-arm' || partKey === 'left-arm') return renderArm(partKey, ctx, palette);
        if (partKey === 'right-leg' || partKey === 'left-leg') return renderLeg(partKey, ctx, palette);
        return '';
    }

    const api = Object.freeze({
        supportedViews: Object.freeze([...THREE_QUARTER_VIEWS]),
        compileFrontThreeQuarterHeadLandmarks(config = {}, options = {}) {
            const asset = { view: options.view || config?.styling?.view || config?.view || 'front-3q-right' };
            return compileFrontThreeQuarterHeadLandmarks(contextFor(asset, config, options));
        },
        isSupportedView(view) {
            return THREE_QUARTER_VIEWS.has(normalizeId(view));
        },
        renderPartSvg
    });

    if (typeof window !== 'undefined') window.SvgAfricanThreeQuarterRenderer = api;
    if (typeof globalThis !== 'undefined' && !globalThis.SvgAfricanThreeQuarterRenderer) {
        globalThis.SvgAfricanThreeQuarterRenderer = api;
    }
})();
