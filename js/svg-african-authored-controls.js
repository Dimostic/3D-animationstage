/**
 * Non-destructive controls for curated SVG African artwork.
 * The authored silhouette remains the source of truth while supported builder
 * adjustments and facial states are applied to stable element roles.
 */
(function (global) {
    'use strict';

    const VERSION = 'authored-controls-v1';

    function number(value, fallback = 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    function clamp(value, min, max) {
        return Math.max(min, Math.min(max, number(value)));
    }

    function escapeAttribute(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function updateElement(svg, suffix, update) {
        return String(svg || '').replace(/<[a-zA-Z][^>]*\bid=(?:"[^"]+"|'[^']+')[^>]*>/g, tag => {
            const id = tag.match(/\bid=(?:"([^"]+)"|'([^']+)')/)?.slice(1).find(Boolean) || '';
            if (id !== suffix && !id.endsWith(`-${suffix}`)) return tag;
            return update(tag);
        });
    }

    function readAttribute(tag, name, fallback = '') {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = tag.match(new RegExp(`\\b${escaped}=(?:"([^"]*)"|'([^']*)')`));
        return match?.slice(1).find(value => typeof value === 'string') ?? fallback;
    }

    function setAttributeOnTag(tag, name, value) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = new RegExp(`\\s${escaped}=(?:"[^"]*"|'[^']*')`);
        const attribute = ` ${name}="${escapeAttribute(value)}"`;
        if (pattern.test(tag)) return tag.replace(pattern, attribute);
        const closeLength = tag.endsWith('/>') ? 2 : 1;
        return `${tag.slice(0, -closeLength)}${attribute}${tag.slice(-closeLength)}`;
    }

    function setAttribute(svg, suffix, name, value) {
        return updateElement(svg, suffix, tag => setAttributeOnTag(tag, name, value));
    }

    function setTransform(svg, suffix, value) {
        return setAttribute(svg, suffix, 'transform', value);
    }

    // Bend interior lip points while keeping both mouth corners attached.
    function deformMouthPath(pathData, travel) {
        const source = String(pathData || '');
        const amount = number(travel);
        if (!source || Math.abs(amount) < 0.0001) return source;
        const expression = /[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi;
        const values = [...source.matchAll(expression)].map(match => Number(match[0]));
        if (values.length < 4 || values.length % 2 !== 0 || values.some(value => !Number.isFinite(value))) return source;
        const xs = values.filter((_, index) => index % 2 === 0);
        const minX = Math.min(...xs);
        const maxX = Math.max(...xs);
        const width = maxX - minX;
        if (!(width > 0.001)) return source;
        let index = 0;
        return source.replace(expression, token => {
            let value = values[index];
            if (index % 2 === 1) {
                const x = values[index - 1];
                const progress = clamp((x - minX) / width, 0, 1);
                value += amount * Math.sin(progress * Math.PI);
            }
            index++;
            return Number(value.toFixed(3)).toString();
        });
    }

    function setDeformedMouthPath(svg, suffix, travel) {
        return updateElement(svg, suffix, tag => {
            const current = readAttribute(tag, 'd', '');
            const base = readAttribute(tag, 'data-svg-african-mouth-base-d', current);
            if (!base) return tag;
            let next = setAttributeOnTag(tag, 'data-svg-african-mouth-base-d', base);
            next = setAttributeOnTag(next, 'd', deformMouthPath(base, travel));
            return next;
        });
    }

    function readPathData(svg, suffix) {
        let result = '';
        updateElement(svg, suffix, tag => {
            result = readAttribute(tag, 'data-svg-african-mouth-base-d', readAttribute(tag, 'd', ''));
            return tag;
        });
        return result;
    }

    function pathNumbers(pathData) {
        return (String(pathData || '').match(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi) || [])
            .map(value => Number(value));
    }

    function interpolatePath(basePath, targetPath, amount) {
        const base = pathNumbers(basePath);
        const target = pathNumbers(targetPath);
        const blend = clamp(amount, 0, 1);
        if (!base.length || base.length !== target.length || base.some(value => !Number.isFinite(value))) {
            return targetPath;
        }
        let index = 0;
        return String(targetPath).replace(/[-+]?(?:\d*\.\d+|\d+\.?\d*)(?:e[-+]?\d+)?/gi, () => {
            const value = base[index] + (target[index] - base[index]) * blend;
            index++;
            return Number(value.toFixed(3)).toString();
        });
    }

    function setBlendedMouthPath(svg, suffix, targetPath, amount) {
        return updateElement(svg, suffix, tag => {
            const current = readAttribute(tag, 'd', '');
            const base = readAttribute(tag, 'data-svg-african-mouth-base-d', current);
            const rendered = interpolatePath(base, targetPath, amount);
            const normalizedBase = amount >= 0.999 || pathNumbers(base).length !== pathNumbers(targetPath).length
                ? targetPath
                : base;
            let next = setAttributeOnTag(tag, 'data-svg-african-mouth-base-d', normalizedBase);
            next = setAttributeOnTag(next, 'd', rendered);
            return next;
        });
    }

    function applyNaturalSideMouth(svg, values) {
        const sourcePath = readPathData(svg, 'side-mouth-upper');
        const source = pathNumbers(sourcePath);
        if (source.length < 8 || source.length % 2) return svg;
        const sourceX = source.filter((_, index) => index % 2 === 0);
        const sourceBack = number(values.baseBack, Math.min(...sourceX));
        const sourceFront = number(values.baseFront, Math.max(...sourceX));
        const sourceLength = Math.max(7, sourceFront - sourceBack);
        const sourceCenter = (sourceBack + sourceFront) * 0.5;
        const baseLength = sourceLength * values.widthScale;
        const baseBack = sourceCenter - baseLength * 0.5;
        const baseFront = sourceCenter + baseLength * 0.5;
        const baseY = number(values.baseY, number(source[1], 92)) + values.offsetY;
        const state = values.state;
        const effectiveOpen = values.visibility.effectiveOpen;
        const open = clamp((effectiveOpen - 0.08) / 0.585, 0, 1);
        const wide = clamp(state.mouthWide, -1, 1);
        const round = clamp(state.mouthRound, 0, 1);
        const press = clamp(state.lipPress, 0, 1);
        const jaw = clamp(state.jawOpen, 0, 1);
        const upperLift = clamp(state.upperLipLift, -1, 1);
        const lowerDrop = clamp(state.lowerLipDrop, -1, 1);
        const smile = clamp(state.smile, -1, 1);
        const neutralLength = Math.max(6.2, baseFront - baseBack);
        const backX = baseBack - Math.max(0, wide) * neutralLength * 0.1
            + round * neutralLength * 0.17;
        const frontX = baseFront + round * neutralLength * 0.025
            + Math.max(0, wide) * neutralLength * 0.015;
        const length = Math.max(5.6, frontX - backX);
        const seamY = baseY - smile * 0.18;
        const openingGain = clamp(number(state.mouthOpeningGain, 1), 0.75, 3.2);
        const apertureScale = clamp(0.62 + openingGain * 0.38, 0.9, 1.84);
        const fullnessScale = values.fullnessScale;
        const upperFullness = clamp((1.35 + press * 0.28 - upperLift * 0.18) * fullnessScale, 0.9, 2.4);
        const lowerFullness = clamp((1.5 + round * 0.18) * fullnessScale, 1, 2.6);
        const upperTipY = seamY - (open * 1.05 + upperLift * 0.22) * apertureScale;
        const lowerTipY = seamY + Math.min(length * 0.78,
            (open * 4.8 + jaw + Math.max(0, lowerDrop) * 0.7) * apertureScale);
        const lowerFrontX = frontX - open * apertureScale;
        // The cavity shares the inner lip curves; opening the jaw never inflates it past the profile.
        const point = (x, y) => `${x.toFixed(3)} ${y.toFixed(3)}`;
        const corner = point(backX, seamY);
        const upperTip = point(frontX, upperTipY);
        const lowerTip = point(lowerFrontX, lowerTipY);
        const upperInnerA = point(backX + length * 0.34, seamY - open * 0.35);
        const upperInnerB = point(frontX - length * 0.2, upperTipY);
        const lowerInnerY = seamY + (lowerTipY - seamY) * 0.3;
        const lowerInnerA = point(backX + length * 0.4, lowerInnerY);
        const lowerInnerB = point(lowerFrontX - length * 0.2, lowerTipY + open * 0.15);
        const upperPath = `M${corner} C${point(backX + length * 0.34, seamY - open * 0.35 - upperFullness)} ${point(frontX - length * 0.14, upperTipY - upperFullness * 0.9)} ${upperTip} C${upperInnerB} ${upperInnerA} ${corner} Z`;
        const lowerPath = `M${corner} C${lowerInnerA} ${lowerInnerB} ${lowerTip} C${point(lowerFrontX - length * 0.2, lowerTipY + open * 0.15 + lowerFullness)} ${point(backX + length * 0.4, lowerInnerY + lowerFullness * 0.8)} ${corner} Z`;
        const openingPath = `M${corner} C${upperInnerA} ${upperInnerB} ${upperTip} L${lowerTip} C${lowerInnerB} ${lowerInnerA} ${corner} Z`;
        const innerBack = backX + length * 0.1;
        const innerFront = lowerFrontX - length * (0.06 + round * 0.02);
        const cavityTop = seamY;
        const cavityBottom = lowerTipY;
        const cavityFrontX = frontX;
        const cavityFrontTop = upperTipY;
        const cavityFrontBottom = lowerTipY;
        const teethBottom = Math.min(cavityBottom - 0.12, seamY + 0.42 + open * 0.54);
        const teethPath = `M${(innerBack + length * 0.04).toFixed(3)} ${(cavityTop + 0.02).toFixed(3)} C${(backX + length * 0.48).toFixed(3)} ${(seamY - open * 0.14).toFixed(3)} ${(frontX - length * 0.15).toFixed(3)} ${(seamY - open * 0.06).toFixed(3)} ${(innerFront - length * 0.03).toFixed(3)} ${(cavityTop + 0.04).toFixed(3)} C${(frontX - length * 0.24).toFixed(3)} ${teethBottom.toFixed(3)} ${(backX + length * 0.38).toFixed(3)} ${teethBottom.toFixed(3)} ${(innerBack + length * 0.04).toFixed(3)} ${(cavityTop + 0.02).toFixed(3)} Z`;

        svg = setBlendedMouthPath(svg, 'side-mouth-upper', upperPath, 1);
        svg = setBlendedMouthPath(svg, 'side-mouth-lower', lowerPath, 1);
        svg = setBlendedMouthPath(svg, 'side-mouth-fill', openingPath, 1);
        svg = setBlendedMouthPath(svg, 'side-mouth-teeth', teethPath, 1);
        svg = setAttribute(svg, 'side-mouth-upper', 'data-svg-african-side-mouth-back-x', baseBack.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-upper', 'data-svg-african-side-mouth-front-x', baseFront.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-upper', 'data-svg-african-side-mouth-center-y', baseY.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-upper', 'data-svg-african-side-mouth-fullness', values.fullnessScale.toFixed(4));
        svg = setAttribute(svg, 'side-mouth-upper', 'data-svg-african-side-mouth-front-y', upperTipY.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-upper', 'data-svg-african-side-mouth-active-front-x', frontX.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-lower', 'data-svg-african-side-mouth-front-y', lowerTipY.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-lower', 'data-svg-african-side-mouth-active-front-x', lowerFrontX.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-fill', 'data-svg-african-side-mouth-aperture-x', cavityFrontX.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-fill', 'data-svg-african-side-mouth-aperture-top', cavityFrontTop.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-fill', 'data-svg-african-side-mouth-aperture-bottom', cavityFrontBottom.toFixed(3));
        svg = setAttribute(svg, 'side-mouth-upper', 'data-svg-african-role', 'mouth-upper upper-lip side-view-premium natural-profile-lips natural-side-mouth refined-side-mouth profile-lips-chin profile-face-refined');
        svg = setAttribute(svg, 'side-mouth-upper', 'fill', '#793b35');
        svg = setAttribute(svg, 'side-mouth-upper', 'stroke', 'none');
        svg = setAttribute(svg, 'side-mouth-upper', 'opacity', '.98');
        svg = setAttribute(svg, 'side-mouth-lower', 'data-svg-african-role', 'mouth-lower lower-lip side-view-premium natural-profile-lips natural-side-mouth refined-side-mouth profile-lips-chin profile-face-refined');
        svg = setAttribute(svg, 'side-mouth-lower', 'fill', '#c96f72');
        svg = setAttribute(svg, 'side-mouth-lower', 'stroke', 'none');
        svg = setAttribute(svg, 'side-mouth-lower', 'opacity', '.96');
        svg = setTransform(svg, 'side-mouth-upper', '');
        svg = setTransform(svg, 'side-mouth-lower', '');
        svg = setTransform(svg, 'side-mouth-fill', '');
        svg = setTransform(svg, 'side-mouth-teeth', '');
        svg = setTransform(svg, 'side-mouth-tongue', '');
        svg = setAttribute(svg, 'side-mouth-tongue', 'cx', (backX + length * 0.65).toFixed(3));
        svg = setAttribute(svg, 'side-mouth-tongue', 'cy', (seamY + (cavityBottom - seamY) * 0.48).toFixed(3));
        svg = setAttribute(svg, 'side-mouth-tongue', 'rx', (length * 0.16).toFixed(3));
        svg = setAttribute(svg, 'side-mouth-tongue', 'ry', (open * 0.3).toFixed(3));
        return svg;
    }

    function applyNaturalFrontMouth(svg, values) {
        const upperBase = readPathData(svg, 'mouth-upper');
        const lowerBase = readPathData(svg, 'mouth-lower');
        const upper = pathNumbers(upperBase);
        const lower = pathNumbers(lowerBase);
        if (upper.length < 14 || lower.length < 14 || upper.length % 2 || lower.length % 2) return svg;
        const allX = upper.filter((_, index) => index % 2 === 0);
        const upperY = upper.filter((_, index) => index % 2 === 1);
        const lowerY = lower.filter((_, index) => index % 2 === 1);
        const minX = Math.min(...allX);
        const maxX = Math.max(...allX);
        const centerX = (minX + maxX) / 2;
        const baseHalfWidth = Math.max(5, (maxX - minX) / 2);
        const cornerY = upper[1] - values.smileDelta * 0.35;
        const upperFullness = clamp(cornerY - Math.min(...upperY), 1.2, 3.2);
        const lowerFullness = clamp(Math.max(...lowerY) - cornerY, 1.6, 3.4);
        const widthScale = clamp(1 + values.wideDelta * 0.18 - values.roundDelta * 0.28 - values.pressDelta * 0.03, 0.62, 1.24);
        const cornerScale = clamp(1 + values.wideDelta * 0.1 - values.roundDelta * 0.24 - values.pressDelta * 0.02, 0.7, 1.14);
        const halfWidth = baseHalfWidth * cornerScale;
        const controlHalfWidth = baseHalfWidth * widthScale;
        const left = centerX - halfWidth;
        const right = centerX + halfWidth;
        const upperOuter = cornerY - upperFullness - values.upperTravel * 0.72;
        const upperInner = cornerY + clamp(0.2 + values.effectiveOpen * 0.14 - Math.max(0, values.pressDelta) * 0.22, 0.04, 0.55);
        const lowerOuter = cornerY + lowerFullness + values.lowerTravel * 0.92;
        const lowerInner = cornerY + clamp(0.52 + values.effectiveOpen * 1.35
            + Math.max(0, values.lowerTravel) * 0.38
            + Math.max(0, values.roundDelta) * 0.65
            - Math.max(0, values.pressDelta) * 0.28, 0.16, 3.1);
        const upperTarget = `M${left.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX - controlHalfWidth * 0.48).toFixed(3)} ${upperOuter.toFixed(3)} ${(centerX + controlHalfWidth * 0.42).toFixed(3)} ${upperOuter.toFixed(3)} ${right.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX + controlHalfWidth * 0.5).toFixed(3)} ${upperInner.toFixed(3)} ${(centerX - controlHalfWidth * 0.5).toFixed(3)} ${upperInner.toFixed(3)} ${left.toFixed(3)} ${cornerY.toFixed(3)} Z`;
        const lowerTarget = `M${left.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX - controlHalfWidth * 0.46).toFixed(3)} ${lowerOuter.toFixed(3)} ${(centerX + controlHalfWidth * 0.46).toFixed(3)} ${lowerOuter.toFixed(3)} ${right.toFixed(3)} ${cornerY.toFixed(3)} C${(centerX + controlHalfWidth * 0.52).toFixed(3)} ${lowerInner.toFixed(3)} ${(centerX - controlHalfWidth * 0.52).toFixed(3)} ${lowerInner.toFixed(3)} ${left.toFixed(3)} ${cornerY.toFixed(3)} Z`;
        const innerHalf = halfWidth * clamp(0.78 * widthScale, 0.44, 0.9);
        const cavityTop = cornerY - Math.max(0.14, values.upperTravel * 0.68
            + values.effectiveOpen * 0.2 + Math.max(0, values.roundDelta) * 0.28);
        const cavityBottom = Math.max(
            lowerInner + 0.42,
            cornerY + 0.45 + values.lowerTravel * 1.15 + values.effectiveOpen * 1.55
        );
        const openingTarget = `M${(centerX - innerHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} C${(centerX - innerHalf * 0.36).toFixed(3)} ${cavityTop.toFixed(3)} ${(centerX + innerHalf * 0.36).toFixed(3)} ${cavityTop.toFixed(3)} ${(centerX + innerHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} C${(centerX + innerHalf * 0.4).toFixed(3)} ${cavityBottom.toFixed(3)} ${(centerX - innerHalf * 0.4).toFixed(3)} ${cavityBottom.toFixed(3)} ${(centerX - innerHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} Z`;
        const teethHalf = innerHalf * 0.84;
        const teethTop = cavityTop + 0.12;
        const teethBottom = Math.min(cornerY + 0.95 + values.effectiveOpen * 0.25, cavityBottom - 0.3);
        const teethTarget = `M${(centerX - teethHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} Q${centerX.toFixed(3)} ${teethTop.toFixed(3)} ${(centerX + teethHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} Q${centerX.toFixed(3)} ${teethBottom.toFixed(3)} ${(centerX - teethHalf).toFixed(3)} ${(cornerY + 0.12).toFixed(3)} Z`;

        let next = setBlendedMouthPath(svg, 'mouth-upper', upperTarget, values.activity);
        next = setBlendedMouthPath(next, 'mouth-lower', lowerTarget, values.activity);
        next = setBlendedMouthPath(next, 'mouth-opening', openingTarget, values.activity);
        next = setAttribute(next, 'mouth-teeth', 'd', teethTarget);
        next = setAttribute(next, 'mouth-tongue', 'cx', centerX.toFixed(3));
        next = setAttribute(next, 'mouth-tongue', 'cy', Math.max(cornerY + 0.8, cavityBottom - 0.55).toFixed(3));
        next = setAttribute(next, 'mouth-tongue', 'rx', Math.max(1.6, innerHalf * 0.52).toFixed(3));
        next = setAttribute(next, 'mouth-tongue', 'ry', Math.max(0.45, values.effectiveOpen * 0.82).toFixed(3));
        return next;
    }

    function hasElement(svg, suffix) {
        let found = false;
        updateElement(svg, suffix, tag => {
            found = true;
            return tag;
        });
        return found;
    }

    function insertBeforeElement(svg, suffix, markup) {
        const source = String(svg || '');
        const expression = /<[a-zA-Z][^>]*\bid=(?:"[^"]+"|'[^']+')[^>]*>/g;
        let match;
        while ((match = expression.exec(source))) {
            const id = match[0].match(/\bid=(?:"([^"]+)"|'([^']+)')/)?.slice(1).find(Boolean) || '';
            if (id === suffix || id.endsWith(`-${suffix}`)) {
                return `${source.slice(0, match.index)}${markup}${source.slice(match.index)}`;
            }
        }
        return source;
    }

    function moveElementAfter(svg, suffix, anchorSuffix) {
        const find = (source, requestedSuffix) => {
            const expression = /<[a-zA-Z][^>]*\bid=(?:"[^"]+"|'[^']+')[^>]*\/>/g;
            let match;
            while ((match = expression.exec(source))) {
                const id = match[0].match(/\bid=(?:"([^"]+)"|'([^']+)')/)?.slice(1).find(Boolean) || '';
                if (id === requestedSuffix || id.endsWith(`-${requestedSuffix}`)) {
                    return { index: match.index, markup: match[0] };
                }
            }
            return null;
        };
        const source = String(svg || '');
        const element = find(source, suffix);
        if (!element) return source;
        const without = `${source.slice(0, element.index)}${source.slice(element.index + element.markup.length)}`;
        const anchor = find(without, anchorSuffix);
        if (!anchor) return source;
        const insertion = anchor.index + anchor.markup.length;
        return `${without.slice(0, insertion)}${element.markup}${without.slice(insertion)}`;
    }

    function ensureFrontMouthDetails(svg) {
        if (!hasElement(svg, 'mouth-upper')) return svg;
        let next = String(svg || '');
        if (!hasElement(next, 'mouth-highlight')) {
            next = next.replace(/<path\b([^>]*\bstroke=(?:"#f2a7a0"|'#f2a7a0')[^>]*)\/>/i, '<path id="mouth-highlight" data-svg-african-role="lip-highlight"$1/>');
        }
        if (!hasElement(next, 'mouth-opening')) {
            next = insertBeforeElement(next, 'mouth-upper', '<path id="mouth-opening" data-svg-african-role="mouth-opening oral-cavity" d="M38.2 92.7 C43.2 91.8 56.8 91.8 61.8 92.7 C58.2 95.2 41.8 95.2 38.2 92.7 Z" fill="#351014" opacity="0"/>');
        }
        if (!hasElement(next, 'mouth-teeth')) {
            next = insertBeforeElement(next, 'mouth-upper', '<path id="mouth-teeth" data-svg-african-role="mouth-teeth teeth" d="M39.4 92.7 Q50 94.2 60.6 92.7 Q50 96.0 39.4 92.7 Z" fill="#fffaf2" opacity="0"/>');
        }
        if (!hasElement(next, 'mouth-tongue')) {
            next = insertBeforeElement(next, 'mouth-upper', '<ellipse id="mouth-tongue" data-svg-african-role="mouth-tongue tongue" cx="50" cy="95.8" rx="5.8" ry="1.25" fill="#c96f72" opacity="0"/>');
        }
        return moveElementAfter(next, 'mouth-lower', 'mouth-upper');
    }

    function ensureSideMouthDetails(svg) {
        if (!hasElement(svg, 'side-mouth-upper')) return svg;
        let next = String(svg || '');
        if (!hasElement(next, 'side-mouth-fill')) {
            next = insertBeforeElement(next, 'side-mouth-upper', '<path id="side-mouth-fill" data-svg-african-role="mouth-fill mouth-opening oral-cavity side-view-premium" d="M66 91.3 C71 90 75 90.5 77 91.6 C76 94 71 94.3 66.5 93.1 Z" fill="#21080c" opacity="0"/>');
        }
        if (!hasElement(next, 'side-mouth-teeth')) {
            next = insertBeforeElement(next, 'side-mouth-upper', '<path id="side-mouth-teeth" data-svg-african-role="mouth-teeth teeth side-view-premium" d="M67.4 91.4 C71.2 90.7 74.6 91.0 76.2 91.8 C73.5 92.7 70.1 92.7 67.4 91.4 Z" fill="#fffaf2" opacity="0"/>');
        }
        if (!hasElement(next, 'side-mouth-tongue')) {
            next = insertBeforeElement(next, 'side-mouth-upper', '<ellipse id="side-mouth-tongue" data-svg-african-role="mouth-tongue tongue side-view-premium" cx="72.5" cy="94" rx="2.9" ry=".72" fill="#c96f72" opacity="0"/>');
        }
        return next;
    }

    function getMouthVisibility(state = {}) {
        const effectiveOpen = clamp(number(state.mouthOpen) + number(state.jawOpen) * 0.42 - number(state.lipPress) * 0.22, 0, 1);
        const openVisibility = clamp((effectiveOpen - 0.025) * 4.4, 0, 1);
        const jawOpen = clamp(state.jawOpen, 0, 1);
        const mouthRound = clamp(state.mouthRound, 0, 1);
        const teethCue = Math.max(0, number(state.mouthWide)) * 0.45
            + Math.max(0, number(state.upperLipLift)) * 2
            + clamp(state.lipPress, 0, 1) * 0.9 * openVisibility;
        return {
            effectiveOpen,
            cavityOpacity: clamp((effectiveOpen - 0.015) * 1.18, 0, 0.98) * (1 - clamp(state.lipPress, 0, 1) * 0.72),
            teethOpacity: clamp(teethCue * (0.32 + openVisibility * 0.68) * (1 - jawOpen * 0.72) * (1 - mouthRound * 0.85), 0, 0.9),
            tongueOpacity: clamp((effectiveOpen - 0.1) * 1.65 * Math.pow(Math.max(0, 1 - jawOpen * 0.92), 1.4)
                * (1 - Math.abs(number(state.mouthWide)) * 0.72) * (1 - mouthRound * 0.88)
                * (1 - Math.max(0, number(state.lowerLipDrop)) * 0.58), 0, 0.36)
        };
    }

    const PALETTE_VARIABLES = Object.freeze({
        skin: 'skin',
        'skin-light': 'skinLight',
        'skin-shade': 'skinShade',
        cloth: 'blazer',
        'cloth-shade': 'blazerShade',
        'cloth-light': 'blazerLight',
        blouse: 'blouse',
        skirt: 'skirt',
        accent: 'accent',
        tie: 'tie',
        hair: 'hair',
        'hair-light': 'hairLight',
        ink: 'ink',
        shoe: 'shoe',
        glass: 'glass',
        headwear: 'headwear',
        'headwear-shade': 'headwearShade'
    });

    function safeColor(value) {
        const color = String(value || '').trim();
        return color && !/[;<>"']/.test(color) ? color : '';
    }

    function applyPalette(svg, palette = {}) {
        let next = String(svg || '');
        Object.entries(PALETTE_VARIABLES).forEach(([variable, paletteKey]) => {
            let color = palette[paletteKey];
            if (!color && paletteKey === 'blazerLight') color = palette.clothLight;
            color = safeColor(color);
            if (!color) return;
            const escaped = variable.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            next = next.replace(new RegExp(`(--${escaped}\\s*:\\s*)[^;"']+`, 'gi'), `$1${color}`);
        });
        return next;
    }

    function applyAccessories(svg, styling = {}, supportedAccessories = []) {
        const selected = new Set(Array.isArray(styling.accessories) ? styling.accessories : []);
        const supported = new Set(Array.isArray(supportedAccessories) ? supportedAccessories : []);
        if (!supported.size) return svg;
        return String(svg || '').replace(/<[a-zA-Z][^>]*\bdata-svg-african-role=(?:"[^"]*"|'[^']*')[^>]*>/gi, tag => {
            const roles = readAttribute(tag, 'data-svg-african-role').split(/\s+/).filter(Boolean);
            if (!roles.includes('accessory')) return tag;
            const accessory = roles.find(role => supported.has(role));
            if (!accessory || selected.has(accessory)) return tag;
            return setAttributeOnTag(tag, 'display', 'none');
        });
    }

    function updateNumber(svg, suffix, attribute, transform, fallback = 0) {
        return updateElement(svg, suffix, tag => {
            const current = number(readAttribute(tag, attribute, fallback), fallback);
            return setAttributeOnTag(tag, attribute, number(transform(current), current).toFixed(3));
        });
    }

    function readElementNumber(svg, suffix, attribute, fallback = 0) {
        let result = fallback;
        updateElement(svg, suffix, tag => {
            result = number(readAttribute(tag, attribute, fallback), fallback);
            return tag;
        });
        return result;
    }

    function getDelta(values, baseline, key) {
        return number(values?.[key]) - number(baseline?.[key]);
    }

    function applyEye(svg, side, context) {
        const centerX = side === 'left' ? 37.2 : 62.8;
        const centerY = 65.9;
        const direction = side === 'left' ? -1 : 1;
        const adjustments = context.adjustments;
        const baselineAdjustments = context.baselineAdjustments;
        const state = context.faceState;
        const origin = context.baselineFaceState;
        const size = clamp(1 + getDelta(adjustments, baselineAdjustments, 'eyeSize') * 0.88, 0.68, 1.42);
        const spacingX = getDelta(adjustments, baselineAdjustments, 'eyeSpacing') * 6.5 * direction;
        const heightY = getDelta(adjustments, baselineAdjustments, 'eyeHeight') * -5;
        const gazeX = (number(state.gazeX) - number(origin.gazeX)) * 0.23;
        const gazeY = (number(state.gazeY) - number(origin.gazeY)) * 0.18;
        const originOpen = Math.max(0.18, 1 - number(origin.blink) * 0.82);
        const targetOpen = Math.max(0.18, 1 - number(state.blink) * 0.82);
        const openRatio = targetOpen / originOpen;
        const eyeTransform = `translate(${spacingX.toFixed(3)} ${heightY.toFixed(3)}) translate(${centerX} ${centerY}) scale(${size.toFixed(4)} ${(size * openRatio).toFixed(4)}) translate(${-centerX} ${-centerY})`;

        svg = setTransform(svg, `eye-${side}`, eyeTransform);
        svg = setTransform(svg, `eyelid-${side}`, eyeTransform);
        for (const suffix of [`iris-${side}`, `pupil-${side}`, `eye-highlight-${side}`]) {
            svg = updateNumber(svg, suffix, 'cx', value => value + spacingX + gazeX, centerX);
            svg = updateNumber(svg, suffix, 'cy', value => value + heightY + gazeY, centerY);
            if (suffix.startsWith('eye-highlight')) {
                svg = updateNumber(svg, suffix, 'r', value => value * size * Math.sqrt(openRatio), 0.6);
            } else {
                svg = updateNumber(svg, suffix, 'rx', value => value * size, suffix.startsWith('iris') ? 2.9 : 1.65);
                svg = updateNumber(svg, suffix, 'ry', value => value * size * openRatio, suffix.startsWith('iris') ? 3 : 1.75);
            }
        }
        svg = setAttribute(svg, `eye-highlight-${side}`, 'opacity', number(state.blink) > 0.82 ? '0' : '.75');
        return svg;
    }

    function applyHeadControls(svg, context) {
        const adjustments = context.adjustments;
        const baselineAdjustments = context.baselineAdjustments;
        const state = context.faceState;
        const origin = context.baselineFaceState;
        const faceWidth = clamp(1 + getDelta(adjustments, baselineAdjustments, 'faceWidth') * 0.62, 0.76, 1.34);
        const earScale = clamp(1 + getDelta(adjustments, baselineAdjustments, 'earSize') * 0.72, 0.72, 1.34);
        const earY = getDelta(adjustments, baselineAdjustments, 'earHeight') * -6;
        const hairScaleX = clamp(1 + getDelta(adjustments, baselineAdjustments, 'hairVolume') * 0.3, 0.8, 1.28);
        const hairScaleY = clamp(1 + getDelta(adjustments, baselineAdjustments, 'hairVolume') * 0.22, 0.82, 1.24);
        const hairlineY = getDelta(adjustments, baselineAdjustments, 'hairlineHeight') * -10;
        const headNod = number(state.headNod);
        const headTilt = number(state.headTilt);

        svg = setTransform(svg, 'head-motion', `translate(0 ${(-headNod * 0.22).toFixed(3)}) rotate(${(headTilt * 0.45).toFixed(3)} 49 74)`);
        svg = setTransform(svg, 'face-base', `translate(49 72) scale(${faceWidth.toFixed(4)} 1) translate(-49 -72)`);
        svg = setTransform(svg, 'features', `translate(49 72) scale(${faceWidth.toFixed(4)} 1) translate(-49 -72)`);
        svg = setTransform(svg, 'glasses', `translate(49 66) scale(${faceWidth.toFixed(4)} 1) translate(-49 -66)`);
        svg = setTransform(svg, 'ear-left', `translate(15 72) translate(0 ${earY.toFixed(3)}) scale(${earScale.toFixed(4)}) translate(-15 -72)`);
        svg = setTransform(svg, 'ear-right', `translate(80 72) translate(0 ${earY.toFixed(3)}) scale(${earScale.toFixed(4)}) translate(-80 -72)`);
        svg = setTransform(svg, 'ear-left-inner', `translate(15 72) translate(0 ${earY.toFixed(3)}) scale(${earScale.toFixed(4)}) translate(-15 -72)`);
        svg = setTransform(svg, 'ear-right-inner', `translate(80 72) translate(0 ${earY.toFixed(3)}) scale(${earScale.toFixed(4)}) translate(-80 -72)`);
        svg = setTransform(svg, 'female-ear-back-hair', `translate(49 56) scale(${hairScaleX.toFixed(4)} ${hairScaleY.toFixed(4)}) translate(-49 -56)`);
        svg = setTransform(svg, 'hair-back', `translate(49 56) scale(${hairScaleX.toFixed(4)} ${hairScaleY.toFixed(4)}) translate(-49 -56)`);
        svg = setTransform(svg, 'hairline', `translate(0 ${hairlineY.toFixed(3)}) translate(49 55) scale(${hairScaleX.toFixed(4)} ${hairScaleY.toFixed(4)}) translate(-49 -55)`);
        svg = setTransform(svg, 'hair-front', `translate(0 ${(1.1 + hairlineY).toFixed(3)}) translate(49 54) scale(${hairScaleX.toFixed(4)} ${hairScaleY.toFixed(4)}) translate(-49 -54)`);

        svg = applyEye(svg, 'left', context);
        svg = applyEye(svg, 'right', context);

        const browLength = clamp(1 + getDelta(adjustments, baselineAdjustments, 'browLength') * 0.72, 0.7, 1.4);
        const browY = getDelta(adjustments, baselineAdjustments, 'browHeight') * -5
            - (number(state.browRaise) - number(origin.browRaise));
        const eyeSpacing = getDelta(adjustments, baselineAdjustments, 'eyeSpacing') * 4.5;
        svg = setTransform(svg, 'brow-left', `translate(${-eyeSpacing} ${browY.toFixed(3)}) translate(36 0) scale(${browLength.toFixed(4)} 1) translate(-36 0)`);
        svg = setTransform(svg, 'brow-right', `translate(${eyeSpacing} ${browY.toFixed(3)}) translate(63 0) scale(${browLength.toFixed(4)} 1) translate(-63 0)`);

        const noseWidth = clamp(1 + getDelta(adjustments, baselineAdjustments, 'noseWidth') * 0.78, 0.72, 1.34);
        const noseLength = clamp(1 + getDelta(adjustments, baselineAdjustments, 'noseLength') * 0.62, 0.74, 1.32);
        const noseTransform = `translate(50 75) scale(${noseWidth.toFixed(4)} ${noseLength.toFixed(4)}) translate(-50 -75)`;
        svg = setTransform(svg, 'nose', noseTransform);
        svg = setTransform(svg, 'nose-bridge-highlight', noseTransform);

        svg = ensureFrontMouthDetails(svg);
        const smileDelta = number(state.smile) - number(origin.smile);
        const mouthVisibility = getMouthVisibility(state);
        const originMouthVisibility = getMouthVisibility(origin);
        const mouthDelta = mouthVisibility.effectiveOpen - originMouthVisibility.effectiveOpen;
        const wideDelta = number(state.mouthWide) - number(origin.mouthWide);
        const roundDelta = number(state.mouthRound) - number(origin.mouthRound);
        const pressDelta = number(state.lipPress) - number(origin.lipPress);
        const lipWidth = clamp(1 + getDelta(adjustments, baselineAdjustments, 'lipWidth') * 0.76
            + smileDelta * 0.08, 0.68, 1.42);
        const lipFullness = clamp(1 + getDelta(adjustments, baselineAdjustments, 'lipFullness') * 0.72, 0.65, 1.65);
        const lipY = getDelta(adjustments, baselineAdjustments, 'lipHeight') * -3;
        svg = setTransform(svg, 'mouth', `translate(50 92) translate(0 ${lipY.toFixed(3)}) scale(${lipWidth.toFixed(4)} ${lipFullness.toFixed(4)}) translate(-50 -92)`);
        const upperTravel = mouthDelta * 0.38
            + (number(state.upperLipLift) - number(origin.upperLipLift)) * 0.92
            + roundDelta * 0.08
            - pressDelta * 0.1;
        const lowerTravel = mouthDelta * 0.94
            + (number(state.jawOpen) - number(origin.jawOpen)) * 0.5
            + (number(state.lowerLipDrop) - number(origin.lowerLipDrop)) * 0.68
            - pressDelta * 0.13;
        svg = applyNaturalFrontMouth(svg, {
            activity: 1,
            effectiveOpen: mouthVisibility.effectiveOpen,
            smileDelta,
            wideDelta,
            roundDelta,
            pressDelta,
            upperTravel,
            lowerTravel
        });
        svg = setTransform(svg, 'mouth-upper', '');
        svg = setTransform(svg, 'mouth-lower', '');
        svg = setTransform(svg, 'mouth-opening', '');
        svg = setAttribute(svg, 'mouth-opening', 'data-svg-african-role', 'mouth-opening oral-cavity');
        svg = setAttribute(svg, 'mouth-opening', 'fill', '#351014');
        svg = setAttribute(svg, 'mouth-opening', 'opacity', mouthVisibility.cavityOpacity.toFixed(2));
        svg = setTransform(svg, 'mouth-teeth', '');
        svg = setAttribute(svg, 'mouth-teeth', 'opacity', mouthVisibility.teethOpacity.toFixed(2));
        svg = setTransform(svg, 'mouth-tongue', '');
        svg = setAttribute(svg, 'mouth-tongue', 'opacity', mouthVisibility.tongueOpacity.toFixed(2));
        const highlightOpacity = clamp(0.58
            * Math.max(0, 1 - mouthVisibility.effectiveOpen * 2.2)
            * Math.max(0, 1 - Math.max(0, number(state.mouthRound)) * 1.45), 0, 0.58);
        svg = setAttribute(svg, 'mouth-highlight', 'opacity', highlightOpacity.toFixed(2));
        svg = setAttribute(svg, 'attention-ring', 'opacity', number(state.listening) > 0.05 ? clamp(state.listening, 0, 0.75).toFixed(2) : '0');
        return svg;
    }

    function applySideEye(svg, context) {
        const adjustments = context.adjustments;
        const baselineAdjustments = context.baselineAdjustments;
        const state = context.faceState;
        const origin = context.baselineFaceState;
        const centerX = readElementNumber(svg, 'side-iris', 'cx', 78);
        const centerY = readElementNumber(svg, 'side-iris', 'cy', 67);
        const size = clamp(1 + getDelta(adjustments, baselineAdjustments, 'eyeSize') * 0.82, 0.72, 1.36);
        const style = global.SvgAfricanPremiumAssets?.getFacialStyleProfile?.({ identity: context.identity });
        const legacyStyle = !svg.includes('data-svg-african-facial-style-version="2"');
        const sourceEye = context.identity?.eyes;
        const sourceWidthScale = legacyStyle
            ? (sourceEye === 'round' ? 1.06 : sourceEye === 'hooded' ? 0.84 : sourceEye === 'wide' ? 1.12 : 1)
            : (style?.eyes.halfWidth || 7.7) / 7.7;
        const widthScale = ((style?.eyes.halfWidth || 7.7) / 7.7) / sourceWidthScale;
        const heightScale = legacyStyle ? (style?.eyes.halfHeight || 3.4) / 3.4 : 1;
        const heightY = getDelta(adjustments, baselineAdjustments, 'eyeHeight') * -5;
        const gazeX = (number(state.gazeX) - number(origin.gazeX)) * 0.18;
        const gazeY = (number(state.gazeY) - number(origin.gazeY)) * 0.16;
        const originOpen = Math.max(0.16, 1 - number(origin.blink) * 0.88);
        const targetOpen = Math.max(0.16, 1 - number(state.blink) * 0.88);
        const openRatio = targetOpen / originOpen;
        const eyeTransform = `translate(0 ${heightY.toFixed(3)}) translate(${centerX.toFixed(3)} ${centerY.toFixed(3)}) scale(${(size * widthScale).toFixed(4)} ${(size * openRatio * heightScale).toFixed(4)}) translate(${-centerX.toFixed(3)} ${-centerY.toFixed(3)})`;
        svg = setTransform(svg, 'side-eye', eyeTransform);
        svg = setTransform(svg, 'side-upper-eyelid', eyeTransform);

        for (const suffix of ['side-iris', 'side-pupil', 'side-eye-highlight']) {
            svg = updateNumber(svg, suffix, 'cx', value => value + gazeX, centerX);
            svg = updateNumber(svg, suffix, 'cy', value => value + heightY + gazeY, centerY);
        }
        svg = updateNumber(svg, 'side-iris', 'rx', value => value * size, 1.9);
        svg = updateNumber(svg, 'side-iris', 'ry', value => value * size * openRatio * heightScale, 2.05);
        svg = updateNumber(svg, 'side-pupil', 'r', value => value * size * Math.sqrt(openRatio), 1.08);
        svg = updateNumber(svg, 'side-eye-highlight', 'r', value => value * size * Math.sqrt(openRatio), 0.45);
        svg = setAttribute(svg, 'side-eye-highlight', 'opacity', number(state.blink) > 0.82 ? '0' : '.9');
        return svg;
    }

    function applySideHeadControls(svg, context) {
        const adjustments = context.adjustments;
        const baselineAdjustments = context.baselineAdjustments;
        const state = context.faceState;
        const origin = context.baselineFaceState;
        const headNod = number(state.headNod) - number(origin.headNod);
        const style = global.SvgAfricanPremiumAssets?.getFacialStyleProfile?.({ identity: context.identity });
        const listening = number(state.listening) - number(origin.listening);
        const headTilt = number(state.headTilt) - number(origin.headTilt) - listening * 0.6;
        svg = setTransform(
            svg,
            'head-motion',
            `translate(50 76) rotate(${headTilt.toFixed(3)}) translate(-50 -76) translate(0 ${(headNod * 0.18).toFixed(3)})`
        );

        const earScale = clamp(1 + getDelta(adjustments, baselineAdjustments, 'earSize') * 0.72, 0.72, 1.34);
        const earY = getDelta(adjustments, baselineAdjustments, 'earHeight') * -6;
        const earX = readElementNumber(svg, 'side-earring-stud', 'cx', 37);
        const earCenterY = readElementNumber(svg, 'side-earring-stud', 'cy', 78) - 6;
        const earTransform = `translate(${earX.toFixed(3)} ${earCenterY.toFixed(3)}) translate(0 ${earY.toFixed(3)}) scale(${earScale.toFixed(4)}) translate(${-earX.toFixed(3)} ${-earCenterY.toFixed(3)})`;
        svg = setTransform(svg, 'side-ear', earTransform);
        svg = setTransform(svg, 'side-ear-inner', earTransform);
        svg = setTransform(svg, 'side-earring', earTransform);

        svg = applySideEye(svg, context);

        const browLength = clamp(1 + getDelta(adjustments, baselineAdjustments, 'browLength') * 0.72, 0.7, 1.4);
        const browY = getDelta(adjustments, baselineAdjustments, 'browHeight') * -5
            - (number(state.browRaise) - number(origin.browRaise));
        svg = setTransform(svg, 'side-brow', `translate(78 66) translate(0 ${browY.toFixed(3)}) scale(${browLength.toFixed(4)} 1) translate(-78 -66)`);

        svg = ensureSideMouthDetails(svg);
        const mouthVisibility = getMouthVisibility(state);
        const lipWidth = clamp(
            1 + getDelta(adjustments, baselineAdjustments, 'lipWidth') * 0.72,
            0.72,
            1.35
        );
        const profileLipFullness = readElementNumber(svg, 'side-mouth-upper', 'data-svg-african-profile-lip-fullness', 1);
        const styleFullness = svg.includes('data-svg-african-facial-style-version="2"') ? 1 : (style?.lips.fullness || 1);
        const lipFullness = clamp(profileLipFullness * styleFullness
            * (1 + getDelta(adjustments, baselineAdjustments, 'lipFullness') * 0.72), 0.68, 1.55);
        const lipY = getDelta(adjustments, baselineAdjustments, 'lipHeight') * -3;
        return applySideMouthControls(svg, {
            state,
            visibility: mouthVisibility,
            widthScale: lipWidth,
            fullnessScale: lipFullness,
            offsetY: lipY,
            upperColor: style?.lips.upperColor,
            lowerColor: style?.lips.lowerColor
        });
    }

    function applySideMouthControls(svg, values) {
        const state = values.state;
        const mouthVisibility = values.visibility || getMouthVisibility(state);
        svg = applyNaturalSideMouth(svg, { ...values, visibility: mouthVisibility });
        svg = setAttribute(svg, 'side-mouth-upper', 'fill', values.upperColor || '#793b35');
        svg = setAttribute(svg, 'side-mouth-lower', 'fill', values.lowerColor || '#c96f72');
        const sideOpen = clamp((mouthVisibility.effectiveOpen - 0.08) / 0.585, 0, 1);
        const cavityOpacity = clamp(Math.pow(sideOpen, 0.62) * 1.18
            * (1 - clamp(state.lipPress, 0, 1) * 0.76), 0, 0.98);
        svg = setAttribute(svg, 'side-mouth-fill', 'data-svg-african-role', 'mouth-fill mouth-opening oral-cavity side-view-premium');
        svg = setAttribute(svg, 'side-mouth-fill', 'fill', '#21080c');
        svg = setAttribute(svg, 'side-mouth-fill', 'opacity', cavityOpacity.toFixed(2));
        svg = setAttribute(svg, 'side-mouth-teeth', 'opacity', (mouthVisibility.teethOpacity * clamp(sideOpen * 3.2, 0, 1)).toFixed(2));
        svg = setAttribute(svg, 'side-mouth-tongue', 'opacity', (mouthVisibility.tongueOpacity * clamp(sideOpen * 2.4, 0, 1)).toFixed(2));
        return svg;
    }

    function applyLimbControls(svg, partKey, context) {
        const adjustments = context.adjustments;
        const baselineAdjustments = context.baselineAdjustments;
        if (partKey.endsWith('arm')) {
            const handScale = clamp(1 + getDelta(adjustments, baselineAdjustments, 'handSize') * 0.72, 0.72, 1.38);
            svg = setTransform(svg, 'hand', `translate(33 224) scale(${handScale.toFixed(4)}) translate(-33 -224)`);
        } else if (partKey.endsWith('leg')) {
            const footScale = clamp(1 + getDelta(adjustments, baselineAdjustments, 'footSize') * 0.68, 0.74, 1.34);
            svg = setTransform(svg, 'shoe', `translate(28 224) scale(${footScale.toFixed(4)} 1) translate(-28 -224)`);
        }
        return svg;
    }

    function apply(svg, partKey, options = {}) {
        const baseline = options.baseline || {};
        const context = {
            identity: options.identity || baseline.identity || {},
            adjustments: options.adjustments || {},
            baselineAdjustments: baseline.adjustments || {},
            faceState: options.faceState || {},
            baselineFaceState: baseline.faceState || {}
        };
        let next = String(svg || '');
        if (!next || !partKey) return next;
        next = applyPalette(next, options.palette || {});
        next = applyAccessories(next, options.styling || {}, baseline.supportedAccessories || []);
        if (partKey === 'head-neck') {
            next = next.includes('side-view-premium')
                ? applySideHeadControls(next, context)
                : applyHeadControls(next, context);
        }
        else next = applyLimbControls(next, partKey, context);
        return next.replace(/<svg\b/, `<svg data-svg-african-authored-controls="${VERSION}"`);
    }

    global.SvgAfricanAuthoredControls = Object.freeze({
        version: VERSION,
        apply,
        applySideMouth: applySideMouthControls
    });
})(typeof globalThis !== 'undefined' ? globalThis : window);
