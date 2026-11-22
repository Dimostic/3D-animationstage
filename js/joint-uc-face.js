/**
 * Joint System — Universal Character facial hair & eyebrows
 * (split from joint-universal-char.js for maintainability)
 *
 * Facial-hair option/normalize + front/side beard rendering, plus gender/age
 * aware eyebrow profile and tapered brow drawing. All methods live on
 * JointSystem.prototype.
 */

Object.assign(JointSystem.prototype, {

    _ucGetFacialHairOptions() {
        return [
            { val: 'none', label: 'None' },
            { val: 'stubble', label: 'Stubble' },
            { val: 'mustache', label: 'Mustache' },
            { val: 'goatee', label: 'Goatee' },
            { val: 'short-beard', label: 'Short Beard' },
            { val: 'full-beard', label: 'Full Beard' }
        ];
    },

    _ucNormalizeFacialHair(style, _gender = 'neutral') {
        const normalized = String(style || 'none').toLowerCase();
        return ['none', 'stubble', 'mustache', 'goatee', 'short-beard', 'full-beard'].includes(normalized)
            ? normalized
            : 'none';
    },

    // Eyebrow profile keyed to gender / age / face shape.
    _ucGetBrowProfile(d) {
        const isFemale = d.gender === 'female';
        const isElderly = d.ageGroup === 'elderly';
        const face = this._ucGetHeadNeckProfile(d.headNeckStyle);
        let thickness = isFemale ? 1.0 : 1.9;     // thinner for female, bold for male
        let arch = isFemale ? 1.4 : 0.85;          // higher arch for female
        let lift = isFemale ? 1.12 : 0.98;         // sit higher above the eye for female
        if (isElderly) { thickness *= 1.12; arch *= 0.9; lift *= 1.02; }
        if (face.jawWidthMult >= 1.08) arch *= 0.88; // square/defined faces → straighter brows
        return { thickness, arch, lift, isFemale };
    },

    // Draw one tapered eyebrow (thicker at the inner head, thinner at the tail).
    _ucDrawBrowShape(ctx, d, ex, eyeY, eyeW, eyeH, dir, prof, isElderly) {
        const innerSign = -dir; // toward the nose
        const baseY = eyeY - eyeH * (2.3 * prof.lift + (isElderly ? 0.15 : 0));
        const innerX = ex + innerSign * eyeW * 0.95;
        const outerX = ex - innerSign * eyeW * 1.10;
        const peakX = ex + innerSign * eyeW * 0.15;
        const peakY = baseY - eyeH * (0.55 * prof.arch);
        const tIn = eyeH * (0.5 * prof.thickness);
        const tOut = eyeH * (0.16 * prof.thickness);
        ctx.save();
        ctx.fillStyle = d.hair;
        ctx.beginPath();
        ctx.moveTo(innerX, baseY - tIn * 0.5);
        ctx.quadraticCurveTo(peakX, peakY - tOut * 0.5, outerX, baseY);
        ctx.quadraticCurveTo(peakX, peakY + tOut * 0.9, innerX, baseY + tIn * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    // Front-view facial hair. Drawn after the nose but before the lips so the
    // mouth/lips render cleanly on top.
    _ucDrawFacialHairFront(ctx, p, d, cx, headRx) {
        const style = this._ucNormalizeFacialHair(d.facialHair, d.gender);
        if (style === 'none') return;
        const beard = this._ucShadeColor(d.hair, -0.04);
        const beardLine = this._ucShadeColor(d.hair, -0.16);
        const jawY = p.headH * 0.72;
        const chinY = p.headH * 0.93;
        const mouthY = p.headH * 0.75;
        const jawHW = headRx * 0.78;
        ctx.save();
        ctx.fillStyle = beard;
        ctx.strokeStyle = beardLine;
        ctx.lineWidth = Math.max(1, d.ow * 0.5);
        ctx.lineJoin = 'round';

        const drawMustache = () => {
            const my = mouthY - p.headH * 0.05;
            const halfW = headRx * 0.46;
            ctx.beginPath();
            ctx.moveTo(cx, my + p.headH * 0.012);
            ctx.quadraticCurveTo(cx - halfW * 0.5, my - p.headH * 0.030, cx - halfW, my);
            ctx.quadraticCurveTo(cx - halfW * 0.72, my + p.headH * 0.050, cx - halfW * 0.24, my + p.headH * 0.046);
            ctx.quadraticCurveTo(cx, my + p.headH * 0.022, cx + halfW * 0.24, my + p.headH * 0.046);
            ctx.quadraticCurveTo(cx + halfW * 0.72, my + p.headH * 0.050, cx + halfW, my);
            ctx.quadraticCurveTo(cx + halfW * 0.5, my - p.headH * 0.030, cx, my + p.headH * 0.012);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };

        if (style === 'stubble') {
            ctx.globalAlpha = 0.30;
            ctx.fillStyle = this._ucShadeColor(d.skin, -0.34);
            ctx.beginPath();
            ctx.moveTo(cx - jawHW * 0.92, jawY);
            ctx.quadraticCurveTo(cx - jawHW * 0.5, chinY, cx, chinY + p.headH * 0.005);
            ctx.quadraticCurveTo(cx + jawHW * 0.5, chinY, cx + jawHW * 0.92, jawY);
            ctx.quadraticCurveTo(cx + jawHW * 0.6, jawY + p.headH * 0.07, cx, jawY + p.headH * 0.06);
            ctx.quadraticCurveTo(cx - jawHW * 0.6, jawY + p.headH * 0.07, cx - jawHW * 0.92, jawY);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (style === 'mustache') {
            drawMustache();
        } else if (style === 'goatee') {
            drawMustache();
            ctx.beginPath();
            ctx.moveTo(cx - headRx * 0.22, mouthY + p.headH * 0.03);
            ctx.quadraticCurveTo(cx - headRx * 0.20, chinY, cx, chinY + p.headH * 0.012);
            ctx.quadraticCurveTo(cx + headRx * 0.20, chinY, cx + headRx * 0.22, mouthY + p.headH * 0.03);
            ctx.quadraticCurveTo(cx, mouthY + p.headH * 0.055, cx - headRx * 0.22, mouthY + p.headH * 0.03);
            ctx.closePath();
            ctx.fill();
        } else { // short-beard / full-beard
            const reach = style === 'full-beard' ? 1.0 : 0.86;
            ctx.beginPath();
            ctx.moveTo(cx - jawHW * (0.98 * reach), jawY - p.headH * 0.03);
            ctx.quadraticCurveTo(cx - jawHW * 0.72, chinY + p.headH * 0.02, cx, chinY + p.headH * 0.03 * reach);
            ctx.quadraticCurveTo(cx + jawHW * 0.72, chinY + p.headH * 0.02, cx + jawHW * (0.98 * reach), jawY - p.headH * 0.03);
            ctx.quadraticCurveTo(cx + jawHW * 0.92, jawY - p.headH * 0.12, cx + headRx * 0.50, mouthY - p.headH * 0.005);
            ctx.quadraticCurveTo(cx, mouthY + p.headH * 0.05, cx - headRx * 0.50, mouthY - p.headH * 0.005);
            ctx.quadraticCurveTo(cx - jawHW * 0.92, jawY - p.headH * 0.12, cx - jawHW * (0.98 * reach), jawY - p.headH * 0.03);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            drawMustache();
        }
        ctx.restore();
    },

    // Side/profile facial hair. Coords come from the caller's profile anchors.
    _ucDrawFacialHairSide(ctx, p, d, w, hh, anchors = {}) {
        const style = this._ucNormalizeFacialHair(d.facialHair, d.gender);
        if (style === 'none') return;
        const { jawBackX, jawAngleY, chinFrontX, chinY, mouthY, lipFrontX } = anchors;
        if (![jawBackX, jawAngleY, chinFrontX, chinY, mouthY, lipFrontX].every(Number.isFinite)) return;
        const beard = this._ucShadeColor(d.hair, -0.04);
        ctx.save();
        ctx.fillStyle = beard;
        ctx.strokeStyle = this._ucShadeColor(d.hair, -0.16);
        ctx.lineWidth = Math.max(1, d.ow * 0.5);
        ctx.lineJoin = 'round';
        const midX = (jawBackX + chinFrontX) / 2;
        const mustacheSide = () => {
            const my = mouthY - hh * 0.04;
            ctx.beginPath();
            ctx.moveTo(lipFrontX - w * 0.08, my);
            ctx.quadraticCurveTo(lipFrontX + w * 0.06, my - hh * 0.012, lipFrontX + w * 0.05, my + hh * 0.018);
            ctx.quadraticCurveTo(lipFrontX - w * 0.02, my + hh * 0.034, lipFrontX - w * 0.10, my + hh * 0.012);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
        };
        if (style === 'stubble') {
            ctx.globalAlpha = 0.30;
            ctx.fillStyle = this._ucShadeColor(d.skin, -0.34);
            ctx.beginPath();
            ctx.moveTo(jawBackX, jawAngleY);
            ctx.quadraticCurveTo(midX, chinY + hh * 0.02, chinFrontX, chinY);
            ctx.quadraticCurveTo(lipFrontX, mouthY + hh * 0.04, lipFrontX - w * 0.05, mouthY);
            ctx.quadraticCurveTo(midX, mouthY + hh * 0.07, jawBackX, jawAngleY);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
        } else if (style === 'mustache') {
            mustacheSide();
        } else if (style === 'goatee') {
            mustacheSide();
            ctx.beginPath();
            ctx.moveTo(lipFrontX - w * 0.03, mouthY + hh * 0.02);
            ctx.quadraticCurveTo(chinFrontX, chinY, chinFrontX - w * 0.03, chinY + hh * 0.01);
            ctx.quadraticCurveTo(lipFrontX - w * 0.09, mouthY + hh * 0.05, lipFrontX - w * 0.03, mouthY + hh * 0.02);
            ctx.closePath();
            ctx.fill();
        } else { // beards
            const reach = style === 'full-beard' ? 1.0 : 0.9;
            ctx.beginPath();
            ctx.moveTo(jawBackX - w * 0.01, jawAngleY - hh * 0.02);
            ctx.quadraticCurveTo(midX, chinY + hh * 0.04 * reach, chinFrontX + w * 0.01, chinY);
            ctx.quadraticCurveTo(lipFrontX + w * 0.012, mouthY + hh * 0.02, lipFrontX - w * 0.03, mouthY - hh * 0.006);
            ctx.quadraticCurveTo(midX, mouthY + hh * 0.02, jawBackX - w * 0.012, jawAngleY - hh * 0.07);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            mustacheSide();
        }
        ctx.restore();
    },

});
