/**
 * Joint System — Universal Character clothing & garment rendering
 * (split from joint-universal-char.js for maintainability)
 *
 * Garment coverage/ratio helpers, outfit detail overlays (collars, lapels,
 * cultural prints, uniform accents), garment shading/folds/print, and the
 * torso/arm/leg clothing painters. All methods live on JointSystem.prototype
 * and are safe to load after joint-system.js (called at runtime).
 */

Object.assign(JointSystem.prototype, {

    _ucTopHemRatio(topStyle) {
        switch (topStyle) {
            case 'vest': return 0.68;
            case 'blazer':
            case 'jacket': return 0.78;
            case 'lab-coat': return 0.88;
            case 'hoodie': return 0.78;
            case 'sweater': return 0.72;
            case 'polo': return 0.70;
            case 'shirt':
            case 'blouse': return 0.72;
            case 'scrub-top':
            case 'tunic': return 0.74;
            case 'chef-coat': return 0.76;
            case 'hi-vis': return 0.70;
            case 'agbada': return 0.98;
            case 'dress': return 0.96;
            default: return 0.70;
        }
    },

    _ucSleeveRatio(topStyle, clothing = {}) {
        if (topStyle === 'blouse') {
            switch (clothing.blouseSleeve) {
                case 'sleeveless': return 0;
                case 'cap': return 0.20;
                case 'short':
                case 'puff': return 0.34;
                case 'elbow': return 0.52;
                case 'three-quarter':
                case 'bell': return 0.72;
                case 'long': return 0.92;
                default: return 0.42;
            }
        }
        switch (topStyle) {
            case 'none': return 0;
            case 'tee': return 0.30;
            case 'polo': return 0.36;
            case 'shirt':
            case 'blouse': return 0.48;
            case 'vest': return 0.18;
            case 'long-sleeve':
            case 'sweater':
            case 'hoodie':
            case 'blazer':
            case 'jacket':
            case 'lab-coat':
            case 'scrub-top':
            case 'tunic':
            case 'chef-coat':
            case 'hi-vis':
            case 'agbada':
            case 'dress':
                return 0.92;
            default:
                return 0.30;
        }
    },

    _ucBottomCoverage(bottomStyle) {
        switch (bottomStyle) {
            case 'shorts': return 0.38;
            case 'skirt': return 0.52;
            case 'cargo': return 0.78;
            case 'pants': return 0.86;
            case 'slacks': return 0.90;
            case 'scrub-pants': return 0.84;
            default: return 0;
        }
    },

    _ucLongGarmentCoverage(clothing = {}) {
        const normalized = this._normalizeUniversalCharacterClothing(clothing);
        if (normalized.outfitPreset === 'executive-tunic-suit') return 0;
        const isLooseNativeTop = normalized.topStyle === 'agbada'
            || ['agbada', 'agbada2', 'agbada3', 'royal-agbada', 'royal-agbada-painted', 'senator', 'senator2', 'senator3', 'senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe', 'chief'].includes(normalized.outfitPreset);
        if (isLooseNativeTop) {
            const length = normalized.agbadaLength
                || (['senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe'].includes(normalized.outfitPreset) ? 'shirt' : null)
                || (['agbada3', 'senator3'].includes(normalized.outfitPreset) ? 'short' : null)
                || (['agbada2', 'senator2', 'royal-agbada', 'royal-agbada-painted', 'chief'].includes(normalized.outfitPreset) ? 'long' : 'knee');
            if (length === 'shirt') return 0.26;
            if (length === 'short') return 0.38;
            if (length === 'long') return 0.78;
            return 0.56;
        }
        if (normalized.outfitPreset === 'buba-wrapper') return 0.66;
        if (['iro-buba', 'ankara-peplum', 'bubu-gown', 'george-wrapper'].includes(normalized.outfitPreset)) return 0.62;
        if (normalized.topStyle === 'dress') return 0.58;
        return 0;
    },

    _ucPaintIntegratedSideTorsoGarment(ctx, p, d, w, h, clothing) {
        const topStyle = clothing.topStyle;
        if (topStyle === 'none') return false;
        const topColor = clothing.topColor || '#1E4B77';
        const accent = clothing.accentColor || this._ucShadeColor(topColor, 0.18);
        const isShirt = clothing.agbadaLength === 'shirt'
            || clothing.robeFit === 'shirt'
            || ['senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe', 'executive-tunic-suit'].includes(clothing.outfitPreset);
        const isShort = isShirt || clothing.agbadaLength === 'short' || ['agbada3', 'senator3'].includes(clothing.outfitPreset);
        const hemY = h * (isShirt ? 0.92 : (isShort ? 0.96 : 1.02));
        const shoulderY = h * 0.075;
        const neckCutW = Math.max(p.neckW * 0.18, w * 0.10);
        const leftTop = w * (isShirt ? 0.24 : 0.15);
        const rightTop = w * (isShirt ? 0.74 : 0.86);
        const leftHem = w * (isShirt ? 0.18 : 0.04);
        const rightHem = w * (isShirt ? 0.84 : 0.98);
        const frontBulge = w * (isShirt ? 0.05 : 0.11);
        const backDrape = w * (isShirt ? 0.03 : 0.09);

        ctx.save();
        ctx.fillStyle = topColor;
        ctx.strokeStyle = this._ucShadeColor(topColor, -0.24);
        ctx.lineWidth = Math.max(1, d.ow * 0.75);
        ctx.beginPath();
        ctx.moveTo(w * 0.50 - neckCutW * 0.72, h * 0.018);
        ctx.quadraticCurveTo(leftTop, shoulderY * 0.58, leftTop - backDrape, h * 0.22);
        ctx.quadraticCurveTo(leftHem + w * 0.02, h * 0.58, leftHem, hemY);
        ctx.quadraticCurveTo(w * 0.50, hemY + h * 0.025, rightHem, hemY);
        ctx.quadraticCurveTo(rightTop + frontBulge, h * 0.56, rightTop, h * 0.22);
        ctx.quadraticCurveTo(rightTop, shoulderY * 0.58, w * 0.50 + neckCutW * 0.72, h * 0.018);
        ctx.quadraticCurveTo(w * 0.50, h * 0.060, w * 0.50 - neckCutW * 0.72, h * 0.018);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.save();
        ctx.fillStyle = d.skin || '#D2A07A';
        ctx.beginPath();
        ctx.moveTo(w * 0.50 - neckCutW * 0.58, h * 0.025);
        ctx.quadraticCurveTo(w * 0.50, h * 0.082, w * 0.50 + neckCutW * 0.58, h * 0.025);
        ctx.lineTo(w * 0.50 + neckCutW * 0.36, h * 0.075);
        ctx.quadraticCurveTo(w * 0.50, h * 0.095, w * 0.50 - neckCutW * 0.36, h * 0.075);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(topColor, -0.18), 0.55);
        ctx.lineWidth = Math.max(1, d.ow * 0.52);
        ctx.beginPath();
        ctx.moveTo(w * 0.58, h * 0.12);
        ctx.quadraticCurveTo(w * 0.66, h * 0.42, w * 0.58, Math.min(hemY - h * 0.04, h * 0.86));
        ctx.moveTo(w * 0.38, h * 0.14);
        ctx.quadraticCurveTo(w * 0.30, h * 0.46, w * 0.34, Math.min(hemY - h * 0.05, h * 0.84));
        ctx.stroke();

        ctx.strokeStyle = this._ucWithAlpha(accent, 0.72);
        ctx.lineWidth = Math.max(1, d.ow * 0.65);
        ctx.beginPath();
        ctx.moveTo(w * 0.50 - neckCutW * 0.62, h * 0.035);
        ctx.quadraticCurveTo(w * 0.50, h * 0.086, w * 0.50 + neckCutW * 0.62, h * 0.035);
        ctx.moveTo(leftHem + w * 0.04, hemY - h * 0.025);
        ctx.quadraticCurveTo(w * 0.50, hemY, rightHem - w * 0.04, hemY - h * 0.025);
        ctx.stroke();
        ctx.restore();

        this._ucPaintGarmentShading(ctx, w, h * 0.02, Math.min(h, hemY));
        this._ucPaintGarmentPrint(ctx, p, d, w, h * 0.04, Math.min(h, hemY), clothing);
        return true;
    },

    _ucIsWaistSkirtGarment(clothing = {}) {
        const preset = String(clothing.outfitPreset || '').toLowerCase();
        return clothing.bottomStyle === 'skirt'
            || clothing.pinnedGarmentStyle === 'female-skirt'
            || preset === 'hybrid-skirt'
            || (clothing.topStyle === 'blouse' && clothing.bottomStyle === 'skirt' && clothing.garmentMode === 'hybrid');
    },

    _ucSkirtHemRatio(clothing = {}) {
        switch (clothing.skirtLength) {
            case 'mini': return 0.72;
            case 'short': return 0.82;
            case 'knee': return 0.98;
            case 'midi': return 1.12;
            case 'ankle': return 1.36;
            case 'floor': return 1.46;
            default: return 0.98;
        }
    },

    _ucLegSkirtCoverage(clothing = {}, view = '') {
        const sideView = String(view || '').toLowerCase() === 'side';
        const base = (() => {
            switch (clothing.skirtLength) {
                case 'mini': return 0.34;
                case 'short': return 0.44;
                case 'knee': return 0.58;
                case 'midi': return 0.74;
                case 'ankle': return 0.92;
                case 'floor': return 0.98;
                default: return 0.58;
            }
        })();
        return sideView ? Math.max(base, 0.64) : base;
    },

    _ucPaintIntegratedWaistSkirt(ctx, p, d, w, h, clothing = {}, view = 'front', metrics = {}) {
        const cx = w * 0.5;
        const unit = Math.max(1, Number(p?.hu) || h * 0.16);
        const color = clothing.bottomColor || clothing.topColor || '#23304A';
        const accent = clothing.accentColor || this._ucShadeColor(color, 0.18);
        const outline = this._ucShadeColor(color, -0.26);
        const design = clothing.skirtDesign || 'a-line';
        const waistY = Math.max(1, Math.min(h * 0.16, Number(p?.hu || 0) * 0.018 || h * 0.04));
        const hemY = Math.min(h - Math.max(2, unit * 0.04), h * this._ucSkirtHemRatio(clothing));
        const isSide = String(view || '').toLowerCase() === 'side';
        const fallbackWaistFull = Math.max(unit * (isSide ? 0.46 : 0.46), Number(p?.waistW || 0) || w * (isSide ? 0.50 : 0.44));
        const fallbackHipFull = Math.max(fallbackWaistFull * (isSide ? 1.22 : 1.12), Number(p?.hipW || 0) || w * (isSide ? 0.72 : 0.58));
        const waistFull = Math.max(unit * 0.32, Math.min(w * (isSide ? 0.68 : 0.58), Number(metrics?.waistFullW) || fallbackWaistFull));
        const hipFull = Math.max(waistFull * 1.08, Math.min(w * (isSide ? 0.88 : 0.74), Number(metrics?.hipFullW) || fallbackHipFull));
        const waistHalf = waistFull * 0.5;
        const hipHalf = hipFull * 0.5;
        const hemScale = ({
            'pencil': isSide ? 0.23 : 0.31,
            'a-line': isSide ? 0.34 : 0.48,
            'flared': isSide ? 0.43 : 0.62,
            'wrapper': isSide ? 0.34 : 0.45,
            'pleated': isSide ? 0.45 : 0.66,
            'mermaid': isSide ? 0.50 : 0.68
        }[design] || (isSide ? 0.34 : 0.48));
        const hemHalf = w * hemScale;
        const lowerY = waistY + (hemY - waistY) * 0.58;

        ctx.save();
        const skirtPath = new Path2D();
        skirtPath.moveTo(cx - waistHalf, waistY);
        skirtPath.quadraticCurveTo(cx - hipHalf, waistY + unit * 0.28, cx - hipHalf, lowerY);
        if (design === 'pencil') {
            skirtPath.bezierCurveTo(cx - w * 0.30, lowerY + unit * 0.55, cx - hemHalf, hemY - unit * 0.18, cx - hemHalf, hemY);
            skirtPath.quadraticCurveTo(cx, hemY + unit * 0.04, cx + hemHalf, hemY);
            skirtPath.bezierCurveTo(cx + hemHalf, hemY - unit * 0.18, cx + w * 0.30, lowerY + unit * 0.55, cx + hipHalf, lowerY);
        } else if (design === 'mermaid') {
            const kneeY = waistY + (hemY - waistY) * 0.70;
            skirtPath.bezierCurveTo(cx - w * 0.25, lowerY + unit * 0.35, cx - w * 0.24, kneeY, cx - w * 0.28, kneeY);
            skirtPath.bezierCurveTo(cx - w * 0.36, kneeY + unit * 0.28, cx - hemHalf, hemY - unit * 0.20, cx - hemHalf, hemY);
            skirtPath.quadraticCurveTo(cx, hemY + unit * 0.08, cx + hemHalf, hemY);
            skirtPath.bezierCurveTo(cx + hemHalf, hemY - unit * 0.20, cx + w * 0.36, kneeY + unit * 0.28, cx + w * 0.28, kneeY);
            skirtPath.bezierCurveTo(cx + w * 0.24, kneeY, cx + w * 0.25, lowerY + unit * 0.35, cx + hipHalf, lowerY);
        } else {
            skirtPath.bezierCurveTo(cx - hipHalf, lowerY + unit * 0.28, cx - hemHalf, hemY - unit * 0.18, cx - hemHalf, hemY);
            skirtPath.quadraticCurveTo(cx, hemY + unit * (design === 'pleated' || design === 'flared' ? 0.12 : 0.06), cx + hemHalf, hemY);
            skirtPath.bezierCurveTo(cx + hemHalf, hemY - unit * 0.18, cx + hipHalf, lowerY + unit * 0.28, cx + hipHalf, lowerY);
        }
        skirtPath.quadraticCurveTo(cx + hipHalf, waistY + unit * 0.28, cx + waistHalf, waistY);
        skirtPath.quadraticCurveTo(cx, waistY + unit * 0.05, cx - waistHalf, waistY);
        skirtPath.closePath();

        const gradient = ctx.createLinearGradient(0, waistY, 0, hemY);
        gradient.addColorStop(0, this._ucShadeColor(color, 0.12));
        gradient.addColorStop(0.54, color);
        gradient.addColorStop(1, this._ucShadeColor(color, -0.18));
        ctx.fillStyle = gradient;
        ctx.fill(skirtPath);
        ctx.strokeStyle = this._ucWithAlpha(outline, 0.78);
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1, d.ow * 0.65);
        ctx.stroke(skirtPath);

        ctx.save();
        ctx.clip(skirtPath);
        ctx.globalAlpha = 0.68;
        ctx.strokeStyle = this._ucWithAlpha(accent, 0.82);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, d.ow * (design === 'pleated' ? 0.52 : 0.38));
        if (design === 'pleated' || design === 'flared') {
            const folds = design === 'pleated' ? 9 : 6;
            for (let i = -Math.floor(folds / 2); i <= Math.floor(folds / 2); i += 1) {
                const topX = cx + i * waistHalf * 0.26;
                const botX = cx + i * hemHalf * 0.22;
                ctx.beginPath();
                ctx.moveTo(topX, waistY + unit * 0.10);
                ctx.quadraticCurveTo((topX + botX) * 0.5, waistY + (hemY - waistY) * 0.55, botX, hemY - unit * 0.10);
                ctx.stroke();
            }
        } else if (design === 'wrapper') {
            ctx.beginPath();
            ctx.moveTo(cx - waistHalf * 0.86, waistY + unit * 0.06);
            ctx.quadraticCurveTo(cx + w * 0.06, waistY + (hemY - waistY) * 0.52, cx + hemHalf * 0.72, hemY - unit * 0.14);
            ctx.stroke();
        } else {
            ctx.globalAlpha = 0.30;
            ctx.beginPath();
            ctx.moveTo(cx - hipHalf * 0.42, waistY + unit * 0.14);
            ctx.quadraticCurveTo(cx - hemHalf * 0.28, waistY + (hemY - waistY) * 0.56, cx - hemHalf * 0.18, hemY - unit * 0.12);
            ctx.moveTo(cx + hipHalf * 0.42, waistY + unit * 0.14);
            ctx.quadraticCurveTo(cx + hemHalf * 0.28, waistY + (hemY - waistY) * 0.56, cx + hemHalf * 0.18, hemY - unit * 0.12);
            ctx.stroke();
        }
        ctx.restore();

        ctx.fillStyle = this._ucShadeColor(color, -0.22);
        ctx.globalAlpha = 0.95;
        ctx.beginPath();
        ctx.roundRect?.(cx - waistHalf * 1.08, waistY - unit * 0.10, waistHalf * 2.16, unit * 0.18, unit * 0.035);
        if (!ctx.roundRect) ctx.rect(cx - waistHalf * 1.08, waistY - unit * 0.10, waistHalf * 2.16, unit * 0.18);
        ctx.fill();
        ctx.restore();

        this._ucPaintGarmentPrint(ctx, p, d, w, waistY, hemY, { ...clothing, topColor: color });
        return true;
    },

    _ucPaintIntegratedFrontBackTorsoGarment(ctx, p, d, w, h, clothing, view = 'front') {
        const topStyle = clothing.topStyle;
        if (topStyle === 'none') return false;
        if (this._ucIsWaistSkirtGarment(clothing)) {
            return this._ucPaintIntegratedWaistSkirt(ctx, p, d, w, h, clothing, view);
        }
        const topColor = clothing.topColor || '#1E4B77';
        const accent = clothing.accentColor || this._ucShadeColor(topColor, 0.18);
        const preset = String(clothing.outfitPreset || '').toLowerCase();
        const isBack = String(view || '').toLowerCase().startsWith('back');
        const isShirt = clothing.agbadaLength === 'shirt'
            || clothing.robeFit === 'shirt'
            || ['senator-shirt', 'senator-shirt-panel', 'senator-shirt-stripe', 'executive-tunic-suit'].includes(preset);
        const isShort = isShirt || clothing.agbadaLength === 'short' || ['agbada3', 'senator3'].includes(preset);
        const isLong = clothing.agbadaLength === 'long' || ['agbada2', 'senator2', 'royal-agbada', 'royal-agbada-painted', 'chief'].includes(preset);
        const hemY = h * (isShirt ? 0.93 : (isShort ? 0.98 : (isLong ? 1.04 : 1.02)));
        const cx = w * 0.5;
        const neckCutW = Math.max(p.neckW * 0.34, w * 0.12);
        const shoulderY = h * 0.075;
        const chestY = h * 0.30;
        const waistY = h * 0.56;
        const shoulderSpread = isShirt ? 0.86 : 0.98;
        const hemSpread = isShirt ? 0.76 : (isShort ? 0.88 : 0.96);
        const leftShoulder = cx - (w * shoulderSpread * 0.5);
        const rightShoulder = cx + (w * shoulderSpread * 0.5);
        const leftHem = cx - (w * hemSpread * 0.5);
        const rightHem = cx + (w * hemSpread * 0.5);
        const sideCurve = w * (isShirt ? 0.055 : 0.11);
        const lowerCurve = h * (isShirt ? 0.010 : 0.026);

        ctx.save();
        ctx.fillStyle = topColor;
        ctx.strokeStyle = this._ucShadeColor(topColor, -0.24);
        ctx.lineWidth = Math.max(1, d.ow * 0.75);
        ctx.beginPath();
        ctx.moveTo(cx - neckCutW, h * 0.018);
        ctx.quadraticCurveTo(cx - w * 0.30, h * 0.025, leftShoulder, shoulderY);
        ctx.quadraticCurveTo(leftShoulder - sideCurve, chestY, leftHem, hemY);
        ctx.quadraticCurveTo(cx, hemY + lowerCurve, rightHem, hemY);
        ctx.quadraticCurveTo(rightShoulder + sideCurve, chestY, rightShoulder, shoulderY);
        ctx.quadraticCurveTo(cx + w * 0.30, h * 0.025, cx + neckCutW, h * 0.018);
        ctx.quadraticCurveTo(cx, h * (isBack ? 0.052 : 0.088), cx - neckCutW, h * 0.018);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = d.skin || '#D2A07A';
        ctx.beginPath();
        if (isBack) {
            ctx.moveTo(cx - neckCutW * 0.62, h * 0.022);
            ctx.quadraticCurveTo(cx, h * 0.052, cx + neckCutW * 0.62, h * 0.022);
            ctx.lineTo(cx + neckCutW * 0.44, h * 0.055);
            ctx.quadraticCurveTo(cx, h * 0.074, cx - neckCutW * 0.44, h * 0.055);
        } else {
            ctx.moveTo(cx - neckCutW * 0.70, h * 0.030);
            ctx.quadraticCurveTo(cx, h * 0.112, cx + neckCutW * 0.70, h * 0.030);
            ctx.lineTo(cx + neckCutW * 0.38, h * 0.082);
            ctx.quadraticCurveTo(cx, h * 0.110, cx - neckCutW * 0.38, h * 0.082);
        }
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(topColor, -0.18), 0.55);
        ctx.lineWidth = Math.max(1, d.ow * 0.50);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.20, h * 0.14);
        ctx.quadraticCurveTo(cx - w * 0.30, waistY, cx - w * (isShirt ? 0.22 : 0.30), Math.min(h, hemY - h * 0.035));
        ctx.moveTo(cx + w * 0.20, h * 0.14);
        ctx.quadraticCurveTo(cx + w * 0.30, waistY, cx + w * (isShirt ? 0.22 : 0.30), Math.min(h, hemY - h * 0.035));
        if (!isBack) {
            ctx.moveTo(cx, h * 0.10);
            ctx.lineTo(cx, Math.min(h, hemY - h * 0.05));
        } else {
            ctx.moveTo(cx, h * 0.10);
            ctx.quadraticCurveTo(cx + w * 0.015, h * 0.42, cx, Math.min(h, hemY - h * 0.07));
        }
        ctx.stroke();

        ctx.strokeStyle = this._ucWithAlpha(accent, 0.72);
        ctx.lineWidth = Math.max(1, d.ow * 0.65);
        ctx.beginPath();
        ctx.moveTo(cx - neckCutW * 0.72, h * 0.040);
        ctx.quadraticCurveTo(cx, h * (isBack ? 0.070 : 0.105), cx + neckCutW * 0.72, h * 0.040);
        ctx.moveTo(leftHem + w * 0.05, Math.min(h, hemY - h * 0.025));
        ctx.quadraticCurveTo(cx, Math.min(h, hemY), rightHem - w * 0.05, Math.min(h, hemY - h * 0.025));
        ctx.stroke();
        ctx.restore();

        this._ucPaintGarmentShading(ctx, w, h * 0.02, Math.min(h, hemY));
        this._ucPaintGarmentPrint(ctx, p, d, w, h * 0.04, Math.min(h, hemY), clothing);
        return true;
    },

    _ucApplyTorsoOutfitDetails(ctx, p, d, w, h, view = 'front') {
        const isHybrid = this._ucUseHybridGarments?.(d);
        const clothingForPin = this._ucGetClothing(d);
        if (this._ucUsePinnedGarments(d) && !isHybrid && !this._ucIsWaistSkirtGarment?.(clothingForPin)) return;
        const paintD = isHybrid ? this._ucBuildHybridUnderpaintContext(d) : d;
        const clothing = this._ucGetClothing(paintD);
        const topStyle = clothing.topStyle;
        const accent = clothing.accentColor;
        const topStartY = h * 0.06;
        const hemY = h * this._ucTopHemRatio(topStyle);
        const centerX = w * 0.5;

        if (topStyle === 'blazer' || topStyle === 'jacket' || topStyle === 'vest') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.22);
            ctx.lineWidth = Math.max(1, d.ow * 0.75);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.18, topStartY + h * 0.06);
            ctx.lineTo(centerX - w * 0.04, h * 0.30);
            ctx.lineTo(centerX, h * 0.20);
            ctx.moveTo(centerX + w * 0.18, topStartY + h * 0.06);
            ctx.lineTo(centerX + w * 0.04, h * 0.30);
            ctx.lineTo(centerX, h * 0.20);
            ctx.stroke();

            if (clothing.outfitPreset === 'business' || clothing.outfitPreset === 'corporate' || clothing.outfitPreset === 'lawyer' || clothing.outfitPreset === 'pilot' || clothing.outfitPreset === 'hospitality') {
                ctx.fillStyle = accent;
                ctx.beginPath();
                ctx.moveTo(centerX, h * 0.18);
                ctx.lineTo(centerX - w * 0.04, h * 0.34);
                ctx.lineTo(centerX, h * 0.54);
                ctx.lineTo(centerX + w * 0.04, h * 0.34);
                ctx.closePath();
                ctx.fill();
            }
        }

        if (clothing.outfitPreset === 'lawyer' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = '#F3F5F8';
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.24);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.16, h * 0.10);
            ctx.lineTo(centerX - w * 0.03, h * 0.24);
            ctx.lineTo(centerX, h * 0.17);
            ctx.lineTo(centerX + w * 0.03, h * 0.24);
            ctx.lineTo(centerX + w * 0.16, h * 0.10);
            ctx.lineTo(centerX + w * 0.09, h * 0.28);
            ctx.lineTo(centerX - w * 0.09, h * 0.28);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.fillStyle = '#1D2430';
            ctx.fillRect(centerX - w * 0.075, h * 0.26, w * 0.15, h * 0.045);
            ctx.restore();
        }

        if (clothing.outfitPreset === 'sports' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.92;
            ctx.fillRect(w * 0.18, h * 0.20, w * 0.64, h * 0.045);
            ctx.fillRect(w * 0.18, hemY - h * 0.10, w * 0.64, h * 0.045);
            ctx.globalAlpha = 1;
            ctx.strokeStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.85);
            ctx.beginPath();
            ctx.moveTo(w * 0.26, h * 0.10);
            ctx.lineTo(w * 0.20, h * 0.28);
            ctx.moveTo(w * 0.74, h * 0.10);
            ctx.lineTo(w * 0.80, h * 0.28);
            ctx.stroke();
            ctx.fillStyle = accent;
            ctx.font = `${Math.max(10, Math.round(h * 0.22))}px Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('7', centerX, h * 0.42);
            ctx.restore();
        }

        if (clothing.outfitPreset === 'security' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = accent;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.28);
            ctx.lineWidth = Math.max(1, d.ow * 0.45);
            ctx.globalAlpha = 0.95;
            ctx.fillRect(w * 0.18, h * 0.13, w * 0.20, h * 0.045);
            ctx.fillRect(w * 0.62, h * 0.13, w * 0.20, h * 0.045);
            ctx.globalAlpha = 1;
            ctx.strokeRect(w * 0.20, h * 0.32, w * 0.18, h * 0.12);
            ctx.strokeRect(w * 0.62, h * 0.32, w * 0.18, h * 0.12);
            ctx.beginPath();
            ctx.moveTo(w * 0.18, h * 0.62);
            ctx.lineTo(w * 0.82, h * 0.62);
            ctx.stroke();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(w * 0.68, h * 0.24);
            ctx.lineTo(w * 0.74, h * 0.28);
            ctx.lineTo(w * 0.72, h * 0.36);
            ctx.lineTo(w * 0.64, h * 0.36);
            ctx.lineTo(w * 0.62, h * 0.28);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (clothing.outfitPreset === 'pilot' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = accent;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.25);
            ctx.lineWidth = Math.max(1, d.ow * 0.45);
            ctx.globalAlpha = 0.95;
            ctx.fillRect(w * 0.16, h * 0.13, w * 0.22, h * 0.04);
            ctx.fillRect(w * 0.62, h * 0.13, w * 0.22, h * 0.04);
            ctx.globalAlpha = 1;
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.12, h * 0.30);
            ctx.quadraticCurveTo(centerX, h * 0.22, centerX + w * 0.12, h * 0.30);
            ctx.moveTo(centerX - w * 0.10, h * 0.31);
            ctx.lineTo(centerX - w * 0.20, h * 0.28);
            ctx.moveTo(centerX + w * 0.10, h * 0.31);
            ctx.lineTo(centerX + w * 0.20, h * 0.28);
            ctx.stroke();
            ctx.fillStyle = this._ucShadeColor(clothing.bottomColor, -0.05);
            ctx.beginPath();
            ctx.moveTo(centerX, h * 0.18);
            ctx.lineTo(centerX - w * 0.035, h * 0.36);
            ctx.lineTo(centerX, h * 0.54);
            ctx.lineTo(centerX + w * 0.035, h * 0.36);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
        }

        if (clothing.outfitPreset === 'engineer' && view !== 'back') {
            ctx.save();
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.75);
            ctx.globalAlpha = 0.82;
            ctx.beginPath();
            ctx.moveTo(w * 0.24, h * 0.14);
            ctx.lineTo(w * 0.76, hemY - h * 0.08);
            ctx.moveTo(w * 0.76, h * 0.14);
            ctx.lineTo(w * 0.24, hemY - h * 0.08);
            ctx.stroke();
            ctx.globalAlpha = 1;
            ctx.strokeRect(w * 0.18, h * 0.34, w * 0.18, h * 0.12);
            ctx.strokeRect(w * 0.64, h * 0.34, w * 0.18, h * 0.12);
            ctx.fillRect(w * 0.45, hemY - h * 0.12, w * 0.10, h * 0.045);
            ctx.restore();
        }

        if (clothing.outfitPreset === 'academic' && view !== 'back') {
            ctx.save();
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.6);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.09, h * 0.22);
            ctx.quadraticCurveTo(centerX, h * 0.30, centerX + w * 0.09, h * 0.22);
            ctx.stroke();
            ctx.fillRect(w * 0.66, h * 0.30, w * 0.10, h * 0.06);
            ctx.strokeRect(w * 0.66, h * 0.30, w * 0.10, h * 0.06);
            ctx.restore();
        }

        if (clothing.outfitPreset === 'scientist' && view !== 'back') {
            ctx.save();
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.strokeRect(w * 0.62, h * 0.36, w * 0.13, h * 0.14);
            ctx.beginPath();
            ctx.moveTo(w * 0.66, h * 0.34);
            ctx.lineTo(w * 0.66, h * 0.48);
            ctx.moveTo(w * 0.71, h * 0.34);
            ctx.lineTo(w * 0.71, h * 0.48);
            ctx.stroke();
            ctx.restore();
        }

        if (clothing.outfitPreset === 'mechanic' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = accent;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.20);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.fillRect(w * 0.22, h * 0.26, w * 0.20, h * 0.065);
            ctx.strokeRect(w * 0.22, h * 0.26, w * 0.20, h * 0.065);
            ctx.beginPath();
            ctx.moveTo(w * 0.68, h * 0.28);
            ctx.lineTo(w * 0.76, h * 0.40);
            ctx.moveTo(w * 0.76, h * 0.28);
            ctx.lineTo(w * 0.68, h * 0.40);
            ctx.stroke();
            ctx.restore();
        }

        if (clothing.outfitPreset === 'farmer' && view !== 'back') {
            ctx.save();
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.72);
            ctx.beginPath();
            ctx.moveTo(w * 0.34, h * 0.12);
            ctx.lineTo(w * 0.36, hemY - h * 0.08);
            ctx.moveTo(w * 0.66, h * 0.12);
            ctx.lineTo(w * 0.64, hemY - h * 0.08);
            ctx.stroke();
            ctx.fillRect(w * 0.32, h * 0.44, w * 0.36, h * 0.045);
            ctx.restore();
        }

        if (clothing.outfitPreset === 'clergy' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = accent;
            ctx.fillRect(centerX - w * 0.06, h * 0.13, w * 0.12, h * 0.05);
            ctx.globalAlpha = 0.65;
            ctx.fillRect(centerX - w * 0.01, h * 0.18, w * 0.02, hemY - h * 0.22);
            ctx.globalAlpha = 1;
            ctx.restore();
        }

        if (clothing.outfitPreset === 'chief' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = accent;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.22);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.beginPath();
            ctx.arc(centerX, h * 0.28, w * 0.045, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (clothing.outfitPreset === 'graduate' && view !== 'back') {
            ctx.save();
            ctx.fillStyle = accent;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.20);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.20, h * 0.16);
            ctx.lineTo(centerX, h * 0.44);
            ctx.lineTo(centerX + w * 0.20, h * 0.16);
            ctx.lineTo(centerX + w * 0.10, h * 0.18);
            ctx.lineTo(centerX, h * 0.34);
            ctx.lineTo(centerX - w * 0.10, h * 0.18);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }

        if (topStyle === 'shirt' || topStyle === 'blouse') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.22);
            ctx.lineWidth = Math.max(1, d.ow * 0.65);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.14, topStartY + h * 0.04);
            ctx.lineTo(centerX, h * 0.18);
            ctx.lineTo(centerX + w * 0.14, topStartY + h * 0.04);
            ctx.moveTo(centerX, h * 0.18);
            ctx.lineTo(centerX, hemY - h * 0.03);
            ctx.stroke();
        }

        if (topStyle === 'polo') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.22);
            ctx.fillStyle = this._ucShadeColor(clothing.topColor, 0.10);
            ctx.lineWidth = Math.max(1, d.ow * 0.65);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.18, h * 0.08);
            ctx.lineTo(centerX, h * 0.18);
            ctx.lineTo(centerX + w * 0.18, h * 0.08);
            ctx.lineTo(centerX + w * 0.10, h * 0.22);
            ctx.lineTo(centerX, h * 0.16);
            ctx.lineTo(centerX - w * 0.10, h * 0.22);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(centerX, h * 0.18);
            ctx.lineTo(centerX, hemY - h * 0.08);
            ctx.stroke();
        }

        if (topStyle === 'sweater') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.20);
            ctx.lineWidth = Math.max(1, d.ow * 0.60);
            ctx.globalAlpha = 0.42;
            [h * 0.22, h * 0.30, h * 0.38].forEach(rowY => {
                ctx.beginPath();
                ctx.moveTo(w * 0.18, rowY);
                ctx.quadraticCurveTo(centerX, rowY + h * 0.025, w * 0.82, rowY);
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
        }

        if (topStyle === 'hoodie') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.18);
            ctx.lineWidth = Math.max(1, d.ow * 0.70);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.22, h * 0.08);
            ctx.quadraticCurveTo(centerX, h * 0.00, centerX + w * 0.22, h * 0.08);
            ctx.quadraticCurveTo(centerX + w * 0.12, h * 0.22, centerX, h * 0.18);
            ctx.quadraticCurveTo(centerX - w * 0.12, h * 0.22, centerX - w * 0.22, h * 0.08);
            ctx.stroke();
            if (view !== 'back') {
                ctx.beginPath();
                ctx.moveTo(centerX - w * 0.05, h * 0.16);
                ctx.lineTo(centerX - w * 0.10, h * 0.38);
                ctx.moveTo(centerX + w * 0.05, h * 0.16);
                ctx.lineTo(centerX + w * 0.10, h * 0.38);
                ctx.stroke();
            }
        }

        if (topStyle === 'lab-coat') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.22);
            ctx.lineWidth = Math.max(1, d.ow * 0.75);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.18, topStartY + h * 0.05);
            ctx.lineTo(centerX - w * 0.05, h * 0.30);
            ctx.lineTo(centerX - w * 0.02, hemY - h * 0.02);
            ctx.moveTo(centerX + w * 0.18, topStartY + h * 0.05);
            ctx.lineTo(centerX + w * 0.05, h * 0.30);
            ctx.lineTo(centerX + w * 0.02, hemY - h * 0.02);
            ctx.stroke();

            ctx.strokeRect(w * 0.16, h * 0.48, w * 0.14, h * 0.12);
            ctx.strokeRect(w * 0.70, h * 0.48, w * 0.14, h * 0.12);

            if (view !== 'back') {
                ctx.strokeStyle = accent;
                ctx.lineWidth = Math.max(1, d.ow * 0.9);
                ctx.beginPath();
                ctx.arc(centerX - w * 0.06, h * 0.28, w * 0.07, Math.PI * 0.12, Math.PI * 1.12);
                ctx.arc(centerX + w * 0.06, h * 0.28, w * 0.07, Math.PI * 0.88, Math.PI * 1.88);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(centerX - w * 0.01, h * 0.34);
                ctx.lineTo(centerX - w * 0.04, h * 0.42);
                ctx.moveTo(centerX + w * 0.01, h * 0.34);
                ctx.lineTo(centerX + w * 0.04, h * 0.42);
                ctx.stroke();
            }
        }

        if (topStyle === 'scrub-top' || topStyle === 'tunic') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.20);
            ctx.lineWidth = Math.max(1, d.ow * 0.7);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.12, h * 0.10);
            ctx.lineTo(centerX, h * 0.22);
            ctx.lineTo(centerX + w * 0.12, h * 0.10);
            ctx.stroke();
            ctx.strokeRect(w * 0.62, h * 0.34, w * 0.12, h * 0.10);
            if (topStyle === 'tunic' && view !== 'back') {
                ctx.strokeStyle = accent;
                ctx.beginPath();
                ctx.moveTo(w * 0.26, h * 0.20);
                ctx.lineTo(w * 0.74, h * 0.20);
                ctx.stroke();
            }
        }

        if (topStyle === 'chef-coat') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.24);
            ctx.lineWidth = Math.max(1, d.ow * 0.75);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.18, h * 0.08);
            ctx.lineTo(centerX + w * 0.02, h * 0.30);
            ctx.moveTo(centerX + w * 0.18, h * 0.08);
            ctx.lineTo(centerX - w * 0.02, h * 0.30);
            ctx.stroke();
            ctx.fillStyle = accent;
            for (let i = 0; i < 3; i++) {
                ctx.beginPath();
                ctx.arc(centerX - w * 0.05, h * (0.26 + i * 0.10), w * 0.012, 0, Math.PI * 2);
                ctx.arc(centerX + w * 0.05, h * (0.21 + i * 0.10), w * 0.012, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        if (topStyle === 'hi-vis') {
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.80;
            ctx.fillRect(w * 0.12, h * 0.24, w * 0.76, h * 0.06);
            ctx.fillRect(w * 0.12, h * 0.42, w * 0.76, h * 0.06);
            if (view !== 'back') {
                ctx.fillRect(w * 0.26, h * 0.10, w * 0.08, h * 0.38);
                ctx.fillRect(w * 0.66, h * 0.10, w * 0.08, h * 0.38);
            }
            ctx.globalAlpha = 1;
        }

        if (clothing.outfitPreset === 'dashiki' && view !== 'back') {
            ctx.strokeStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.95);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.14, h * 0.10);
            ctx.lineTo(centerX, h * 0.24);
            ctx.lineTo(centerX + w * 0.14, h * 0.10);
            ctx.moveTo(w * 0.18, h * 0.24);
            ctx.lineTo(w * 0.82, h * 0.24);
            ctx.moveTo(w * 0.20, hemY - h * 0.08);
            ctx.lineTo(w * 0.80, hemY - h * 0.08);
            ctx.stroke();
            ctx.save();
            ctx.strokeStyle = this._ucShadeColor(accent, -0.14);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.globalAlpha = 0.72;
            [0.28, 0.40, 0.52, 0.64, 0.76].forEach(xRatio => {
                ctx.beginPath();
                ctx.moveTo(w * xRatio, h * 0.27);
                ctx.lineTo(w * xRatio, Math.min(hemY - h * 0.10, h * 0.62));
                ctx.stroke();
            });
            ctx.restore();
        }

        if (clothing.outfitPreset === 'ankara') {
            ctx.fillStyle = accent;
            const rows = [h * 0.24, h * 0.40, hemY - h * 0.06];
            rows.forEach((rowY, rowIndex) => {
                for (let i = 0; i < 4; i++) {
                    const motifX = w * (0.20 + i * 0.18 + (rowIndex % 2 === 0 ? 0.02 : 0));
                    ctx.beginPath();
                    ctx.moveTo(motifX, rowY - h * 0.025);
                    ctx.lineTo(motifX + w * 0.04, rowY);
                    ctx.lineTo(motifX, rowY + h * 0.025);
                    ctx.lineTo(motifX - w * 0.04, rowY);
                    ctx.closePath();
                    ctx.fill();
                }
            });
        }

        if (clothing.outfitPreset === 'kaftan') {
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.92;
            ctx.fillRect(centerX - w * 0.07, h * 0.10, w * 0.14, Math.max(h * 0.40, hemY - h * 0.14));
            ctx.fillRect(w * 0.14, hemY - h * 0.06, w * 0.72, h * 0.035);
            ctx.fillRect(centerX - w * 0.13, h * 0.13, w * 0.26, h * 0.028);
            ctx.globalAlpha = 0.62;
            ctx.fillRect(centerX - w * 0.18, h * 0.22, w * 0.05, Math.max(h * 0.30, hemY - h * 0.28));
            ctx.fillRect(centerX + w * 0.13, h * 0.22, w * 0.05, Math.max(h * 0.30, hemY - h * 0.28));
            ctx.globalAlpha = 1;
        }

        if (topStyle === 'agbada' || clothing.outfitPreset === 'agbada') {
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.95);
            ctx.globalAlpha = 0.90;
            ctx.beginPath();
            ctx.moveTo(centerX, h * 0.08);
            ctx.lineTo(centerX, hemY - h * 0.10);
            ctx.stroke();
            ctx.fillRect(centerX - w * 0.055, h * 0.12, w * 0.11, Math.max(h * 0.36, hemY - h * 0.18));
            ctx.globalAlpha = 0.34;
            ctx.beginPath();
            ctx.moveTo(w * 0.10, h * 0.18);
            ctx.quadraticCurveTo(w * 0.26, h * 0.36, w * 0.20, hemY - h * 0.10);
            ctx.lineTo(w * 0.34, hemY - h * 0.08);
            ctx.quadraticCurveTo(w * 0.40, h * 0.34, w * 0.30, h * 0.16);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w * 0.90, h * 0.18);
            ctx.quadraticCurveTo(w * 0.74, h * 0.36, w * 0.80, hemY - h * 0.10);
            ctx.lineTo(w * 0.66, hemY - h * 0.08);
            ctx.quadraticCurveTo(w * 0.60, h * 0.34, w * 0.70, h * 0.16);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.18);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            [h * 0.22, h * 0.36, h * 0.50].forEach(rowY => {
                ctx.beginPath();
                ctx.moveTo(centerX - w * 0.13, rowY);
                ctx.quadraticCurveTo(centerX, rowY + h * 0.035, centerX + w * 0.13, rowY);
                ctx.stroke();
            });
            ctx.globalAlpha = 0.58;
            [w * 0.25, w * 0.75].forEach(x => {
                ctx.beginPath();
                ctx.moveTo(x, h * 0.18);
                ctx.quadraticCurveTo(x + (x < centerX ? -w * 0.04 : w * 0.04), h * 0.42, x, hemY - h * 0.08);
                ctx.stroke();
            });
            ctx.globalAlpha = 1;
        }

        if (clothing.outfitPreset === 'senator' && view !== 'back') {
            ctx.save();
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.72);
            ctx.globalAlpha = 0.92;
            ctx.beginPath();
            ctx.moveTo(centerX, h * 0.10);
            ctx.lineTo(centerX, Math.min(hemY - h * 0.08, h * 0.68));
            ctx.stroke();
            for (let y = h * 0.16; y < Math.min(hemY - h * 0.10, h * 0.62); y += h * 0.10) {
                ctx.beginPath();
                ctx.arc(centerX - w * 0.045, y, w * 0.012, 0, Math.PI * 2);
                ctx.arc(centerX + w * 0.045, y, w * 0.012, 0, Math.PI * 2);
                ctx.fill();
            }
            ctx.globalAlpha = 0.50;
            ctx.beginPath();
            ctx.moveTo(w * 0.24, hemY - h * 0.08);
            ctx.quadraticCurveTo(centerX, hemY - h * 0.03, w * 0.76, hemY - h * 0.08);
            ctx.stroke();
            ctx.restore();
        }

        if (clothing.outfitPreset === 'buba-wrapper' || ['iro-buba', 'ankara-peplum', 'bubu-gown', 'george-wrapper'].includes(clothing.outfitPreset)) {
            ctx.save();
            ctx.strokeStyle = accent;
            ctx.fillStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.62);
            ctx.globalAlpha = view === 'back' ? 0.44 : 0.72;
            ctx.beginPath();
            ctx.moveTo(w * 0.18, h * 0.18);
            ctx.quadraticCurveTo(centerX, h * 0.08, w * 0.82, h * 0.18);
            ctx.stroke();
            ctx.globalAlpha = 0.36;
            for (let y = h * 0.26; y < Math.min(h * 0.88, hemY + h * 0.18); y += h * 0.12) {
                ctx.beginPath();
                ctx.moveTo(w * 0.16, y);
                ctx.quadraticCurveTo(centerX, y + h * 0.035, w * 0.84, y);
                ctx.stroke();
            }
            ctx.globalAlpha = view === 'back' ? 0.34 : 0.58;
            ctx.fillRect(w * 0.18, Math.min(h * 0.72, hemY + h * 0.04), w * 0.64, h * 0.055);
            if (clothing.outfitPreset === 'iro-buba' || clothing.outfitPreset === 'george-wrapper') {
                ctx.globalAlpha = view === 'back' ? 0.42 : 0.70;
                ctx.fillRect(w * 0.12, h * 0.59, w * 0.76, h * 0.055);
                ctx.globalAlpha = view === 'back' ? 0.28 : 0.46;
                ctx.beginPath();
                ctx.moveTo(w * 0.24, h * 0.64);
                ctx.quadraticCurveTo(w * 0.48, h * 0.72, w * 0.42, Math.min(h * 0.94, hemY + h * 0.26));
                ctx.moveTo(w * 0.74, h * 0.64);
                ctx.quadraticCurveTo(w * 0.56, h * 0.75, w * 0.62, Math.min(h * 0.94, hemY + h * 0.26));
                ctx.stroke();
            }
            if (clothing.outfitPreset === 'ankara-peplum') {
                ctx.globalAlpha = view === 'back' ? 0.38 : 0.62;
                ctx.beginPath();
                ctx.moveTo(w * 0.20, h * 0.52);
                ctx.quadraticCurveTo(w * 0.34, h * 0.62, w * 0.18, h * 0.69);
                ctx.quadraticCurveTo(w * 0.50, h * 0.74, w * 0.82, h * 0.69);
                ctx.quadraticCurveTo(w * 0.66, h * 0.62, w * 0.80, h * 0.52);
                ctx.quadraticCurveTo(w * 0.50, h * 0.58, w * 0.20, h * 0.52);
                ctx.fill();
                ctx.stroke();
            }
            if (clothing.outfitPreset === 'bubu-gown') {
                ctx.globalAlpha = view === 'back' ? 0.30 : 0.48;
                ctx.beginPath();
                ctx.moveTo(w * 0.08, h * 0.18);
                ctx.quadraticCurveTo(w * 0.22, h * 0.42, w * 0.14, Math.min(h * 0.98, hemY + h * 0.30));
                ctx.lineTo(w * 0.30, Math.min(h * 0.98, hemY + h * 0.26));
                ctx.quadraticCurveTo(w * 0.34, h * 0.46, w * 0.28, h * 0.18);
                ctx.closePath();
                ctx.fill();
                ctx.beginPath();
                ctx.moveTo(w * 0.92, h * 0.18);
                ctx.quadraticCurveTo(w * 0.78, h * 0.42, w * 0.86, Math.min(h * 0.98, hemY + h * 0.30));
                ctx.lineTo(w * 0.70, Math.min(h * 0.98, hemY + h * 0.26));
                ctx.quadraticCurveTo(w * 0.66, h * 0.46, w * 0.72, h * 0.18);
                ctx.closePath();
                ctx.fill();
            }
            if (clothing.outfitPreset === 'george-wrapper') {
                ctx.globalAlpha = view === 'back' ? 0.34 : 0.58;
                ctx.strokeStyle = this._ucShadeColor(accent, -0.18);
                ctx.lineWidth = Math.max(1, d.ow * 0.44);
                for (let y = h * 0.28; y < Math.min(h * 0.90, hemY + h * 0.22); y += h * 0.11) {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.18, y);
                    ctx.quadraticCurveTo(centerX, y + h * 0.028, w * 0.82, y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }

        if (clothing.outfitPreset === 'adire') {
            ctx.save();
            ctx.strokeStyle = this._ucWithAlpha(accent, view === 'back' ? 0.40 : 0.62);
            ctx.lineWidth = Math.max(1, d.ow * 0.52);
            for (let y = h * 0.18; y < Math.min(hemY, h * 0.74); y += h * 0.12) {
                ctx.beginPath();
                ctx.moveTo(w * 0.18, y);
                ctx.quadraticCurveTo(centerX, y + h * 0.045, w * 0.82, y);
                ctx.stroke();
            }
            ctx.globalAlpha = view === 'back' ? 0.32 : 0.48;
            [0.30, 0.50, 0.70].forEach(xRatio => {
                ctx.beginPath();
                ctx.arc(w * xRatio, h * 0.38, w * 0.055, 0, Math.PI * 2);
                ctx.arc(w * xRatio, h * 0.58, w * 0.045, 0, Math.PI * 2);
                ctx.stroke();
            });
            ctx.restore();
        }

        if (clothing.outfitPreset === 'kente') {
            ctx.save();
            ctx.globalAlpha = view === 'back' ? 0.38 : 0.60;
            const colors = [accent, this._ucShadeColor(clothing.topColor, 0.28), '#B3261E', '#1B7A4B'];
            const bandH = h * 0.045;
            colors.forEach((color, i) => {
                ctx.fillStyle = color;
                ctx.fillRect(w * 0.16, h * (0.20 + i * 0.085), w * 0.68, bandH);
            });
            ctx.globalAlpha = view === 'back' ? 0.30 : 0.52;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.20);
            ctx.lineWidth = Math.max(1, d.ow * 0.45);
            for (let x = w * 0.24; x <= w * 0.76; x += w * 0.13) {
                ctx.beginPath();
                ctx.moveTo(x, h * 0.18);
                ctx.lineTo(x, Math.min(hemY - h * 0.06, h * 0.66));
                ctx.stroke();
            }
            ctx.restore();
        }

        if ((clothing.outfitPreset === 'doctor' || clothing.outfitPreset === 'nurse' || clothing.outfitPreset === 'hospitality' || clothing.outfitPreset === 'security' || clothing.outfitPreset === 'pilot') && view !== 'back') {
            ctx.fillStyle = accent;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.18);
            ctx.lineWidth = Math.max(1, d.ow * 0.45);
            const badgeX = w * 0.66;
            const badgeY = h * 0.28;
            ctx.fillRect(badgeX, badgeY, w * 0.10, h * 0.14);
            ctx.strokeRect(badgeX, badgeY, w * 0.10, h * 0.14);
        }

        if ((clothing.outfitPreset === 'doctor' || clothing.outfitPreset === 'nurse') && view !== 'back') {
            ctx.strokeStyle = this._ucShadeColor(accent, -0.20);
            ctx.lineWidth = Math.max(1, d.ow * 0.8);
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.06, h * 0.24);
            ctx.quadraticCurveTo(centerX - w * 0.18, h * 0.34, centerX - w * 0.12, h * 0.48);
            ctx.moveTo(centerX + w * 0.06, h * 0.24);
            ctx.quadraticCurveTo(centerX + w * 0.18, h * 0.34, centerX + w * 0.12, h * 0.48);
            ctx.stroke();
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.arc(centerX - w * 0.12, h * 0.50, w * 0.035, 0, Math.PI * 2);
            ctx.arc(centerX + w * 0.12, h * 0.50, w * 0.035, 0, Math.PI * 2);
            ctx.fill();
        }

        if (clothing.outfitPreset === 'chef' && view !== 'back') {
            ctx.fillStyle = this._ucShadeColor(accent, -0.02);
            ctx.globalAlpha = 0.92;
            ctx.beginPath();
            ctx.moveTo(w * 0.34, h * 0.34);
            ctx.lineTo(w * 0.66, h * 0.34);
            ctx.lineTo(w * 0.74, h * 0.84);
            ctx.lineTo(w * 0.26, h * 0.84);
            ctx.closePath();
            ctx.fill();
            ctx.globalAlpha = 1;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.16);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.beginPath();
            ctx.moveTo(w * 0.50, h * 0.34);
            ctx.lineTo(w * 0.50, h * 0.84);
            ctx.moveTo(w * 0.28, h * 0.46);
            ctx.quadraticCurveTo(w * 0.50, h * 0.40, w * 0.72, h * 0.46);
            ctx.stroke();
        }

        if (clothing.outfitPreset === 'hospitality' && view !== 'back') {
            ctx.fillStyle = accent;
            ctx.beginPath();
            ctx.moveTo(centerX - w * 0.08, h * 0.22);
            ctx.lineTo(centerX + w * 0.08, h * 0.22);
            ctx.lineTo(centerX + w * 0.04, h * 0.34);
            ctx.lineTo(centerX - w * 0.04, h * 0.34);
            ctx.closePath();
            ctx.fill();
        }

        if ((clothing.outfitPreset === 'business' || clothing.outfitPreset === 'corporate' || clothing.outfitPreset === 'lawyer' || clothing.outfitPreset === 'security' || clothing.outfitPreset === 'pilot' || clothing.outfitPreset === 'academic' || clothing.outfitPreset === 'clergy' || clothing.outfitPreset === 'graduate' || clothing.outfitPreset === 'hospitality' || clothing.outfitPreset === 'school') && view !== 'back') {
            ctx.fillStyle = accent;
            ctx.globalAlpha = 0.85;
            ctx.fillRect(w * 0.32, h * 0.08, w * 0.36, h * 0.08);
            ctx.globalAlpha = 1;
        }
    },

    _ucApplyArmOutfitDetails(ctx, p, d, w, upperEnd, foreEnd) {
        const isHybrid = this._ucUseHybridGarments?.(d);
        const clothingForPin = this._ucGetClothing(d);
        if (this._ucUsePinnedGarments(d) && !isHybrid && !this._ucIsWaistSkirtGarment?.(clothingForPin)) return;
        const paintD = isHybrid ? this._ucBuildHybridUnderpaintContext(d) : d;
        const clothing = this._ucGetClothing(paintD);
        if (clothing.topStyle === 'hi-vis') {
            ctx.fillStyle = clothing.accentColor;
            ctx.globalAlpha = 0.78;
            ctx.fillRect(w * 0.14, upperEnd * 0.40, w * 0.72, p.hu * 0.05);
            ctx.fillRect(w * 0.14, upperEnd + p.forearmLen * 0.30, w * 0.72, p.hu * 0.05);
            ctx.globalAlpha = 1;
        }
        if (clothing.topStyle === 'lab-coat' || clothing.topStyle === 'blazer' || clothing.topStyle === 'chef-coat' || clothing.topStyle === 'sweater' || clothing.topStyle === 'hoodie') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.18);
            ctx.lineWidth = Math.max(1, d.ow * 0.45);
            ctx.globalAlpha = 0.45;
            ctx.beginPath();
            ctx.moveTo(w * 0.18, foreEnd - p.handLen * 0.15);
            ctx.lineTo(w * 0.82, foreEnd - p.handLen * 0.15);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
        if (clothing.outfitPreset === 'dashiki' || clothing.outfitPreset === 'ankara' || clothing.outfitPreset === 'kaftan' || clothing.outfitPreset === 'agbada' || clothing.outfitPreset === 'royal-agbada' || clothing.outfitPreset === 'royal-agbada-painted' || clothing.outfitPreset === 'senator' || clothing.outfitPreset === 'buba-wrapper' || clothing.outfitPreset === 'iro-buba' || clothing.outfitPreset === 'ankara-peplum' || clothing.outfitPreset === 'bubu-gown' || clothing.outfitPreset === 'george-wrapper' || clothing.outfitPreset === 'adire' || clothing.outfitPreset === 'kente' || clothing.topStyle === 'agbada') {
            ctx.fillStyle = clothing.accentColor;
            ctx.globalAlpha = clothing.outfitPreset === 'senator' ? 0.68 : 0.85;
            ctx.fillRect(w * 0.16, Math.max(upperEnd * 0.18, foreEnd - p.handLen * 0.34), w * 0.68, p.hu * 0.06);
            if (clothing.outfitPreset === 'bubu-gown') {
                ctx.globalAlpha = 0.36;
                ctx.fillRect(w * 0.10, upperEnd * 0.22, w * 0.80, Math.max(p.hu * 0.06, foreEnd - upperEnd - p.handLen * 0.18));
            }
            if (clothing.outfitPreset === 'iro-buba' || clothing.outfitPreset === 'ankara-peplum' || clothing.outfitPreset === 'george-wrapper') {
                ctx.globalAlpha = 0.46;
                ctx.fillRect(w * 0.18, upperEnd * 0.18, w * 0.64, p.hu * 0.045);
            }
            if (clothing.outfitPreset === 'royal-agbada' || clothing.outfitPreset === 'royal-agbada-painted') {
                ctx.globalAlpha = 0.58;
                ctx.fillRect(w * 0.18, Math.max(upperEnd * 0.12, upperEnd - p.hu * 0.06), w * 0.64, p.hu * 0.04);
                ctx.strokeStyle = this._ucWithAlpha(clothing.accentColor, 0.72);
                ctx.lineWidth = Math.max(1, d.ow * 0.36);
                ctx.beginPath();
                ctx.moveTo(w * 0.50, upperEnd * 0.12);
                ctx.quadraticCurveTo(w * 0.38, foreEnd * 0.44, w * 0.50, foreEnd - p.handLen * 0.44);
                ctx.stroke();
            }
            if (clothing.outfitPreset === 'adire' || clothing.outfitPreset === 'kente') {
                ctx.globalAlpha = 0.42;
                ctx.fillRect(w * 0.20, Math.max(upperEnd * 0.18, foreEnd - p.handLen * 0.52), w * 0.60, p.hu * 0.035);
            }
            ctx.globalAlpha = 1;
        }
        if (clothing.outfitPreset === 'security' || clothing.outfitPreset === 'pilot' || clothing.outfitPreset === 'engineer' || clothing.outfitPreset === 'mechanic') {
            ctx.fillStyle = clothing.accentColor;
            ctx.globalAlpha = clothing.outfitPreset === 'pilot' ? 0.88 : 0.78;
            const bandY = upperEnd + p.forearmLen * 0.28;
            const bandCount = clothing.outfitPreset === 'pilot' ? 3 : 1;
            for (let i = 0; i < bandCount; i++) {
                ctx.fillRect(w * 0.18, bandY + i * p.hu * 0.04, w * 0.64, p.hu * 0.022);
            }
            ctx.globalAlpha = 1;
        }
    },

    _ucBlouseHemRatio(clothing = {}) {
        switch (clothing.blouseBody) {
            case 'crop': return 0.58;
            case 'peplum': return 0.78;
            case 'loose': return 0.76;
            case 'wrap': return 0.74;
            case 'corset': return 0.70;
            case 'fitted':
            default: return 0.72;
        }
    },

    _ucBlouseNeckWidth(p, w, clothing = {}) {
        const base = Math.max(p.neckW * 0.09, w * 0.045);
        switch (clothing.blouseNeck) {
            case 'off-shoulder': return Math.max(base * 4.0, w * 0.32);
            case 'square': return Math.max(base * 2.5, w * 0.18);
            case 'sweetheart': return Math.max(base * 2.35, w * 0.17);
            case 'v-neck': return Math.max(base * 2.25, w * 0.16);
            case 'high': return Math.max(base * 0.80, w * 0.055);
            case 'round':
            default: return Math.max(base * 1.70, w * 0.12);
        }
    },

    _ucApplyLegOutfitDetails(ctx, p, d, w, h, ankleY) {
        const isHybrid = this._ucUseHybridGarments?.(d);
        const clothingForPin = this._ucGetClothing(d);
        if (this._ucUsePinnedGarments(d) && !isHybrid && !this._ucIsWaistSkirtGarment?.(clothingForPin)) return;
        const paintD = isHybrid ? this._ucBuildHybridUnderpaintContext(d) : d;
        const clothing = this._ucGetClothing(paintD);
        if (clothing.bottomStyle === 'cargo') {
            ctx.strokeStyle = this._ucShadeColor(clothing.bottomColor, -0.18);
            ctx.lineWidth = Math.max(1, d.ow * 0.45);
            ctx.strokeRect(w * 0.58, h * 0.34, w * 0.18, h * 0.12);
        }
        if (clothing.bottomStyle === 'slacks') {
            ctx.strokeStyle = this._ucShadeColor(clothing.bottomColor, -0.14);
            ctx.lineWidth = Math.max(1, d.ow * 0.35);
            ctx.globalAlpha = 0.28;
            ctx.beginPath();
            ctx.moveTo(w * 0.50, h * 0.06);
            ctx.lineTo(w * 0.50, ankleY - p.footH * 0.08);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }
    },

    // Cylindrical form shadow over a garment region (lit center, shaded sides),
    // painted only within existing opaque body pixels via source-atop.
    _ucPaintGarmentShading(ctx, w, topY, botY) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        const g = ctx.createLinearGradient(0, 0, w, 0);
        g.addColorStop(0, 'rgba(0,0,0,0.20)');
        g.addColorStop(0.30, 'rgba(255,255,255,0.05)');
        g.addColorStop(0.50, 'rgba(255,255,255,0.09)');
        g.addColorStop(0.72, 'rgba(0,0,0,0.05)');
        g.addColorStop(1, 'rgba(0,0,0,0.20)');
        ctx.fillStyle = g;
        ctx.fillRect(0, topY, w, Math.max(0, botY - topY));
        ctx.restore();
    },

    // Soft drape/fold shadows on the torso garment (pull folds toward the
    // waist + short hem folds), kept inside the garment via source-atop.
    _ucPaintGarmentFolds(ctx, p, d, w, h, hemY, baseColor) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.strokeStyle = this._ucShadeColor(baseColor, -0.20);
        ctx.lineCap = 'round';
        ctx.lineWidth = Math.max(1, d.ow * 0.5);
        ctx.globalAlpha = 0.22;
        const waistY = h * 0.5;
        ctx.beginPath();
        ctx.moveTo(w * 0.16, h * 0.20);
        ctx.quadraticCurveTo(w * 0.40, waistY * 0.92, w * 0.46, waistY);
        ctx.moveTo(w * 0.84, h * 0.20);
        ctx.quadraticCurveTo(w * 0.60, waistY * 0.92, w * 0.54, waistY);
        ctx.moveTo(w * 0.30, hemY - h * 0.10);
        ctx.quadraticCurveTo(w * 0.34, hemY - h * 0.04, w * 0.30, hemY);
        ctx.moveTo(w * 0.70, hemY - h * 0.10);
        ctx.quadraticCurveTo(w * 0.66, hemY - h * 0.04, w * 0.70, hemY);
        ctx.stroke();
        ctx.restore();
    },

    _ucCutBlouseNeckline(ctx, d, w, h, necklineWidth, clothing = {}, view = 'front') {
        const cx = w * 0.5;
        const neck = clothing.blouseNeck || 'round';
        const y = h * 0.038;
        const skin = d.skin || '#D2A07A';
        const seam = this._ucWithAlpha(this._ucShadeColor(clothing.topColor || '#5F7C8A', -0.30), 0.66);
        const openW = necklineWidth * (neck === 'off-shoulder' ? 1.75 : (neck === 'v-neck' ? 1.32 : 1.12));
        ctx.save();
        ctx.fillStyle = skin;
        ctx.beginPath();
        if (view === 'back') {
            ctx.moveTo(cx - necklineWidth * 0.75, y * 0.82);
            ctx.quadraticCurveTo(cx, y * 1.55, cx + necklineWidth * 0.75, y * 0.82);
            ctx.lineTo(cx + necklineWidth * 0.46, y * 1.34);
            ctx.quadraticCurveTo(cx, y * 1.70, cx - necklineWidth * 0.46, y * 1.34);
        } else if (view === 'side') {
            const frontX = w * 0.58;
            ctx.moveTo(cx - necklineWidth * 0.30, h * 0.018);
            ctx.quadraticCurveTo(frontX, h * 0.028, frontX + necklineWidth * 0.35, h * 0.082);
            ctx.quadraticCurveTo(frontX + necklineWidth * 0.16, h * 0.132, cx + necklineWidth * 0.16, h * 0.158);
            ctx.quadraticCurveTo(cx - necklineWidth * 0.18, h * 0.092, cx - necklineWidth * 0.30, h * 0.018);
        } else if (neck === 'v-neck') {
            const pointY = h * 0.265;
            ctx.moveTo(cx - openW, y);
            ctx.lineTo(cx, pointY);
            ctx.lineTo(cx + openW, y);
            ctx.quadraticCurveTo(cx + openW * 0.62, h * 0.020, cx, h * 0.018);
            ctx.quadraticCurveTo(cx - openW * 0.62, h * 0.020, cx - openW, y);
        } else if (neck === 'square') {
            const sqW = openW * 0.92;
            ctx.moveTo(cx - sqW, h * 0.020);
            ctx.lineTo(cx + sqW, h * 0.020);
            ctx.lineTo(cx + sqW, h * 0.170);
            ctx.quadraticCurveTo(cx, h * 0.186, cx - sqW, h * 0.170);
        } else if (neck === 'sweetheart') {
            ctx.moveTo(cx - openW, y);
            ctx.quadraticCurveTo(cx - openW * 0.72, h * 0.120, cx - openW * 0.24, h * 0.150);
            ctx.quadraticCurveTo(cx, h * 0.190, cx + openW * 0.24, h * 0.150);
            ctx.quadraticCurveTo(cx + openW * 0.72, h * 0.120, cx + openW, y);
            ctx.quadraticCurveTo(cx + openW * 0.54, h * 0.020, cx, h * 0.018);
            ctx.quadraticCurveTo(cx - openW * 0.54, h * 0.020, cx - openW, y);
        } else if (neck === 'high') {
            ctx.ellipse(cx, h * 0.030, necklineWidth * 0.62, h * 0.018, 0, 0, Math.PI * 2);
        } else if (neck === 'off-shoulder') {
            ctx.ellipse(cx, h * 0.064, openW, h * 0.064, 0, 0, Math.PI * 2);
            ctx.rect(cx - openW * 0.95, h * 0.014, openW * 1.90, h * 0.065);
        } else {
            ctx.ellipse(cx, h * 0.060, openW, h * 0.046, 0, 0, Math.PI * 2);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = seam;
        ctx.lineWidth = Math.max(1, d.ow * 0.58);
        ctx.beginPath();
        if (view === 'side') {
            const frontX = w * 0.58;
            ctx.moveTo(cx - necklineWidth * 0.20, h * 0.024);
            ctx.quadraticCurveTo(frontX + necklineWidth * 0.34, h * 0.070, cx + necklineWidth * 0.14, h * 0.158);
        } else if (view === 'back') {
            ctx.moveTo(cx - necklineWidth * 0.70, y * 0.90);
            ctx.quadraticCurveTo(cx, y * 1.60, cx + necklineWidth * 0.70, y * 0.90);
        } else if (neck === 'v-neck') {
            ctx.moveTo(cx - openW, y);
            ctx.lineTo(cx, h * 0.265);
            ctx.lineTo(cx + openW, y);
        } else if (neck === 'square') {
            const sqW = openW * 0.92;
            ctx.moveTo(cx - sqW, h * 0.020);
            ctx.lineTo(cx - sqW, h * 0.170);
            ctx.quadraticCurveTo(cx, h * 0.186, cx + sqW, h * 0.170);
            ctx.lineTo(cx + sqW, h * 0.020);
        } else if (neck === 'sweetheart') {
            ctx.moveTo(cx - openW, y);
            ctx.quadraticCurveTo(cx - openW * 0.72, h * 0.120, cx - openW * 0.24, h * 0.150);
            ctx.quadraticCurveTo(cx, h * 0.190, cx + openW * 0.24, h * 0.150);
            ctx.quadraticCurveTo(cx + openW * 0.72, h * 0.120, cx + openW, y);
        } else if (neck !== 'high') {
            ctx.ellipse(cx, neck === 'off-shoulder' ? h * 0.064 : h * 0.060, openW, neck === 'off-shoulder' ? h * 0.064 : h * 0.046, 0, 0, Math.PI * 2);
        }
        ctx.stroke();
        ctx.restore();
    },

    _ucPaintFemaleBustGarmentShape(ctx, p, d, w, h, clothing = {}, view = 'front') {
        if (!p?.isFemale) return;
        const bustDelta = (this._ucClampNum(d.bust, 0, 100, 50) - 50) / 50;
        const bustPositive = Math.max(0, bustDelta);
        const bustNegative = Math.max(0, -bustDelta);
        const breastAmount = this._ucClampNum(d.bust, 0, 100, 50) / 100;
        const visible = 0.30 + breastAmount * 0.36 - bustNegative * 0.08;
        if (visible <= 0.08) return;
        const topColor = clothing.topColor || '#5F7C8A';
        const shadow = this._ucShadeColor(topColor, -0.30);
        const highlight = this._ucShadeColor(topColor, 0.22);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.lineWidth = Math.max(1, d.ow * 0.48);
        if (view === 'side') {
            const cx = w * 0.58;
            const y = h * 0.245;
            ctx.globalAlpha = Math.min(0.68, visible);
            ctx.strokeStyle = this._ucWithAlpha(highlight, 0.55);
            ctx.beginPath();
            ctx.moveTo(cx - w * 0.04, y - h * 0.060);
            ctx.quadraticCurveTo(cx + w * (0.08 + bustPositive * 0.06), y - h * 0.025, cx + w * (0.05 + bustPositive * 0.035), y + h * 0.055);
            ctx.stroke();
            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.48);
            ctx.beginPath();
            ctx.moveTo(cx + w * 0.035, y + h * 0.055);
            ctx.quadraticCurveTo(cx - w * 0.030, y + h * 0.088, cx - w * 0.100, y + h * 0.060);
            ctx.stroke();
        } else if (view === 'front') {
            const cx = w * 0.5;
            const y = h * (0.232 + breastAmount * 0.022);
            const rx = w * (0.074 + breastAmount * 0.070);
            const ry = h * (0.030 + breastAmount * 0.046);
            const offset = w * (0.098 + breastAmount * 0.060);
            ctx.globalAlpha = Math.min(0.56, visible);
            [-1, 1].forEach(side => {
                const bx = cx + side * offset;
                const grad = ctx.createRadialGradient(
                    bx - side * rx * 0.22,
                    y - ry * 0.34,
                    Math.max(1, rx * 0.10),
                    bx,
                    y,
                    rx * 1.55
                );
                grad.addColorStop(0, this._ucWithAlpha(highlight, 0.40));
                grad.addColorStop(0.48, this._ucWithAlpha(topColor, 0.18));
                grad.addColorStop(0.78, this._ucWithAlpha(shadow, 0.16));
                grad.addColorStop(1, this._ucWithAlpha(shadow, 0.00));
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.ellipse(bx, y, rx, ry, side * 0.08, 0, Math.PI * 2);
                ctx.fill();
            });
            ctx.strokeStyle = this._ucWithAlpha(highlight, 0.22);
            ctx.lineWidth = Math.max(1, d.ow * 0.38);
            [-1, 1].forEach(side => {
                ctx.beginPath();
                ctx.moveTo(cx + side * offset - side * rx * 0.30, y - ry * 0.42);
                ctx.quadraticCurveTo(cx + side * offset, y - ry * 0.70, cx + side * offset + side * rx * 0.36, y - ry * 0.26);
                ctx.stroke();
            });
            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.24);
            ctx.lineWidth = Math.max(1, d.ow * 0.46);
            [-1, 1].forEach(side => {
                ctx.beginPath();
                ctx.moveTo(cx + side * offset - side * rx * 0.62, y + ry * 0.50);
                ctx.quadraticCurveTo(cx + side * offset, y + ry * 0.74, cx + side * offset + side * rx * 0.62, y + ry * 0.50);
                ctx.stroke();
            });
        }
        ctx.restore();
    },

    _ucPaintBlouseDesign(ctx, p, d, w, h, topY, hemY, clothing = {}, view = 'front') {
        const design = clothing.blouseDesign || 'plain';
        const body = clothing.blouseBody || 'fitted';
        const accent = clothing.accentColor || this._ucShadeColor(clothing.topColor || '#5F7C8A', 0.18);
        const shadow = this._ucShadeColor(clothing.topColor || '#5F7C8A', -0.25);
        const cx = w * 0.5;
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (body === 'wrap') {
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.70);
            ctx.lineWidth = Math.max(1, d.ow * 0.72);
            ctx.beginPath();
            ctx.moveTo(w * 0.30, h * 0.12);
            ctx.quadraticCurveTo(w * 0.52, h * 0.34, w * 0.70, Math.min(hemY - h * 0.035, h * 0.66));
            ctx.moveTo(w * 0.70, h * 0.12);
            ctx.quadraticCurveTo(w * 0.46, h * 0.32, w * 0.30, Math.min(hemY - h * 0.035, h * 0.66));
            ctx.stroke();
        }

        if (body === 'corset') {
            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.55);
            ctx.lineWidth = Math.max(1, d.ow * 0.52);
            [0.38, 0.46, 0.54, 0.62].forEach(x => {
                ctx.beginPath();
                ctx.moveTo(w * x, h * 0.15);
                ctx.quadraticCurveTo(w * x, h * 0.40, w * (0.50 + (x - 0.50) * 0.65), Math.min(hemY, h * 0.68));
                ctx.stroke();
            });
        }

        if (body === 'peplum') {
            ctx.fillStyle = this._ucWithAlpha(accent, 0.22);
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.60);
            ctx.lineWidth = Math.max(1, d.ow * 0.42);
            const waistY = h * 0.54;
            ctx.beginPath();
            ctx.moveTo(w * 0.23, waistY);
            ctx.quadraticCurveTo(w * 0.34, waistY + h * 0.11, w * 0.20, hemY - h * 0.030);
            ctx.quadraticCurveTo(cx, hemY + h * 0.030, w * 0.80, hemY - h * 0.030);
            ctx.quadraticCurveTo(w * 0.66, waistY + h * 0.11, w * 0.77, waistY);
            ctx.quadraticCurveTo(cx, waistY + h * 0.035, w * 0.23, waistY);
            ctx.fill();
            ctx.stroke();
        }

        if (design === 'ankara-print') {
            ctx.fillStyle = this._ucWithAlpha(accent, 0.56);
            for (let row = 0; row < 4; row += 1) {
                for (let col = 0; col < 5; col += 1) {
                    const x = w * (0.20 + col * 0.15 + (row % 2 ? 0.055 : 0));
                    const y = h * (0.18 + row * 0.12);
                    if (y > hemY - h * 0.05) continue;
                    ctx.beginPath();
                    ctx.ellipse(x, y, w * 0.026, h * 0.014, (row + col) * 0.55, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        } else if (design === 'lace') {
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.56);
            ctx.lineWidth = Math.max(1, d.ow * 0.34);
            for (let y = h * 0.16; y < hemY - h * 0.04; y += h * 0.075) {
                ctx.beginPath();
                ctx.moveTo(w * 0.20, y);
                for (let x = w * 0.20; x <= w * 0.80; x += w * 0.08) {
                    ctx.quadraticCurveTo(x + w * 0.04, y + h * 0.028, x + w * 0.08, y);
                }
                ctx.stroke();
            }
        } else if (design === 'beaded') {
            ctx.fillStyle = this._ucWithAlpha(accent, 0.78);
            [0.36, 0.50, 0.64].forEach(xRatio => {
                for (let y = h * 0.16; y < Math.min(hemY - h * 0.06, h * 0.64); y += h * 0.070) {
                    ctx.beginPath();
                    ctx.arc(w * xRatio, y, Math.max(1, w * 0.010), 0, Math.PI * 2);
                    ctx.fill();
                }
            });
        } else if (design === 'pleated') {
            ctx.strokeStyle = this._ucWithAlpha(shadow, 0.42);
            ctx.lineWidth = Math.max(1, d.ow * 0.36);
            for (let x = w * 0.28; x <= w * 0.72; x += w * 0.075) {
                ctx.beginPath();
                ctx.moveTo(x, h * 0.15);
                ctx.quadraticCurveTo(x + (x < cx ? -w * 0.018 : w * 0.018), h * 0.42, x, hemY - h * 0.04);
                ctx.stroke();
            }
        } else if (design === 'embroidered') {
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.72);
            ctx.lineWidth = Math.max(1, d.ow * 0.46);
            ctx.beginPath();
            ctx.moveTo(cx, h * 0.12);
            ctx.quadraticCurveTo(cx - w * 0.10, h * 0.23, cx, h * 0.34);
            ctx.quadraticCurveTo(cx + w * 0.10, h * 0.23, cx, h * 0.12);
            ctx.moveTo(cx, h * 0.36);
            ctx.quadraticCurveTo(cx - w * 0.12, h * 0.48, cx, Math.min(hemY - h * 0.05, h * 0.62));
            ctx.quadraticCurveTo(cx + w * 0.12, h * 0.48, cx, h * 0.36);
            ctx.stroke();
        }

        ctx.restore();
    },

    _ucPaintPregnancyGarmentDrape(ctx, p, d, w, h, hemY, clothing = {}) {
        const belly = this._ucClampNum(d?.belly, 0, 100, 50);
        if (belly < 72) return;
        const t = (belly - 72) / 28;
        const topColor = clothing.topColor || '#5f7c8a';
        const accent = clothing.accentColor || this._ucShadeColor(topColor, 0.22);
        const bellyY = h * (0.48 + t * 0.05);
        const bellyDepth = h * (0.035 + t * 0.040);
        const left = w * (0.17 - t * 0.035);
        const right = w * (0.83 + t * 0.035);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.lineCap = 'round';
        ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(topColor, -0.26), 0.22 + t * 0.20);
        ctx.lineWidth = Math.max(1, d.ow * (0.58 + t * 0.28));
        for (let i = 0; i < 4; i++) {
            const y = bellyY + i * h * 0.045;
            if (y > Math.min(hemY + h * 0.02, h * 0.93)) break;
            ctx.beginPath();
            ctx.moveTo(left + i * w * 0.018, y);
            ctx.quadraticCurveTo(w * 0.50, y + bellyDepth, right - i * w * 0.018, y);
            ctx.stroke();
        }
        ctx.strokeStyle = this._ucWithAlpha(accent, 0.18 + t * 0.16);
        ctx.lineWidth = Math.max(1, d.ow * 0.46);
        ctx.beginPath();
        ctx.moveTo(w * 0.24, h * 0.24);
        ctx.quadraticCurveTo(w * 0.42, bellyY - h * 0.01, w * 0.42, Math.min(hemY, h * 0.86));
        ctx.moveTo(w * 0.76, h * 0.24);
        ctx.quadraticCurveTo(w * 0.58, bellyY - h * 0.01, w * 0.58, Math.min(hemY, h * 0.86));
        ctx.stroke();
        ctx.restore();
    },

    // Simple repeating motifs for African cultural outfits, painted in the
    // accent color over the garment while staying inside existing body pixels.
    _ucPaintGarmentPrint(ctx, p, d, w, topY, botY, clothing) {
        const preset = clothing.outfitPreset;
        if (!['ankara', 'dashiki', 'kaftan', 'agbada', 'royal-agbada', 'royal-agbada-painted', 'senator', 'buba-wrapper', 'iro-buba', 'ankara-peplum', 'bubu-gown', 'george-wrapper', 'adire', 'kente'].includes(preset)) return;
        const accent = clothing.accentColor || '#F2C94C';
        const height = Math.max(1, botY - topY);
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';

        if (preset === 'iro-buba' || preset === 'buba-wrapper' || preset === 'ankara-peplum' || preset === 'bubu-gown' || preset === 'george-wrapper') {
            ctx.globalAlpha = preset === 'bubu-gown' ? 0.34 : 0.48;
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.62);
            ctx.lineWidth = Math.max(1, d.ow * 0.42);
            for (let y = topY + height * 0.16; y < botY - height * 0.05; y += height * 0.17) {
                ctx.beginPath();
                ctx.moveTo(w * 0.14, y);
                ctx.quadraticCurveTo(w * 0.50, y + height * 0.035, w * 0.86, y);
                ctx.stroke();
            }
            if (preset === 'ankara-peplum') {
                ctx.fillStyle = accent;
                ctx.globalAlpha = 0.58;
                for (let row = 0; row < 3; row++) {
                    for (let i = 0; i < 4; i++) {
                        const motifX = w * (0.20 + i * 0.18 + (row % 2 ? 0.05 : 0));
                        const motifY = topY + height * (0.20 + row * 0.22);
                        ctx.beginPath();
                        ctx.moveTo(motifX, motifY - height * 0.025);
                        ctx.lineTo(motifX + w * 0.035, motifY);
                        ctx.lineTo(motifX, motifY + height * 0.025);
                        ctx.lineTo(motifX - w * 0.035, motifY);
                        ctx.closePath();
                        ctx.fill();
                    }
                }
            }
            if (preset === 'george-wrapper') {
                ctx.fillStyle = this._ucWithAlpha(accent, 0.42);
                [0.30, 0.50, 0.70].forEach(xRatio => {
                    ctx.beginPath();
                    ctx.ellipse(w * xRatio, topY + height * 0.48, w * 0.045, height * 0.030, 0, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
            ctx.restore();
            return;
        }

        if (preset === 'adire') {
            ctx.strokeStyle = this._ucWithAlpha(accent, 0.55);
            ctx.lineWidth = Math.max(1, d.ow * 0.45);
            for (let y = topY + height * 0.12; y < botY; y += height * 0.16) {
                ctx.beginPath();
                ctx.moveTo(w * 0.10, y);
                ctx.quadraticCurveTo(w * 0.50, y + height * 0.05, w * 0.90, y);
                ctx.stroke();
            }
            ctx.globalAlpha = 0.45;
            [0.24, 0.42, 0.60, 0.78].forEach((xRatio, i) => {
                const y = topY + height * (0.24 + (i % 2) * 0.22);
                ctx.beginPath();
                ctx.arc(w * xRatio, y, Math.min(w, height) * 0.035, 0, Math.PI * 2);
                ctx.stroke();
            });
            ctx.restore();
            return;
        }

        if (preset === 'kente') {
            const palette = [accent, '#B3261E', '#1B7A4B', this._ucShadeColor(clothing.topColor, 0.22)];
            ctx.globalAlpha = 0.48;
            palette.forEach((color, i) => {
                ctx.fillStyle = color;
                ctx.fillRect(w * 0.08, topY + height * (0.12 + i * 0.16), w * 0.84, height * 0.045);
            });
            ctx.globalAlpha = 0.36;
            ctx.strokeStyle = this._ucShadeColor(accent, -0.24);
            ctx.lineWidth = Math.max(1, d.ow * 0.35);
            for (let x = w * 0.18; x < w * 0.86; x += w * 0.16) {
                ctx.beginPath();
                ctx.moveTo(x, topY + height * 0.08);
                ctx.lineTo(x, botY - height * 0.08);
                ctx.stroke();
            }
            ctx.restore();
            return;
        }

        if (preset === 'royal-agbada' || preset === 'royal-agbada-painted') {
            const coral = '#C7662B';
            const deepGold = this._ucShadeColor(accent, -0.22);
            ctx.globalAlpha = 0.84;
            ctx.strokeStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.70);
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(w * 0.50, topY + height * 0.08);
            ctx.lineTo(w * 0.50, botY - height * 0.12);
            ctx.moveTo(w * 0.38, topY + height * 0.18);
            ctx.lineTo(w * 0.62, topY + height * 0.18);
            ctx.stroke();

            ctx.globalAlpha = 0.58;
            ctx.fillStyle = accent;
            for (let y = topY + height * 0.34; y < botY - height * 0.16; y += height * 0.13) {
                const spread = w * 0.11;
                ctx.beginPath();
                ctx.moveTo(w * 0.50, y - height * 0.025);
                ctx.quadraticCurveTo(w * 0.50 - spread, y + height * 0.04, w * 0.50, y + height * 0.075);
                ctx.quadraticCurveTo(w * 0.50 + spread, y + height * 0.04, w * 0.50, y - height * 0.025);
                ctx.fill();
            }

            if (w > 32 && height > 70) {
                const drawBeadStrand = (radiusX, dropY, beadRadius, alpha = 1) => {
                    ctx.globalAlpha = alpha;
                    ctx.fillStyle = coral;
                    ctx.strokeStyle = this._ucShadeColor(coral, -0.22);
                    ctx.lineWidth = Math.max(0.6, d.ow * 0.20);
                    for (let a = Math.PI * 0.12; a <= Math.PI * 0.88; a += Math.PI / 12) {
                        const bx = w * 0.50 + Math.cos(a) * radiusX;
                        const by = topY + height * 0.12 + Math.sin(a) * dropY;
                        ctx.beginPath();
                        ctx.ellipse(bx, by, beadRadius * 0.78, beadRadius, 0, 0, Math.PI * 2);
                        ctx.fill();
                        ctx.stroke();
                    }
                };
                drawBeadStrand(w * 0.24, height * 0.28, Math.max(1.2, w * 0.018), 0.92);
                drawBeadStrand(w * 0.31, height * 0.38, Math.max(1.0, w * 0.015), 0.78);
            }

            ctx.globalAlpha = 0.44;
            ctx.strokeStyle = deepGold;
            ctx.lineWidth = Math.max(1, d.ow * 0.42);
            ctx.beginPath();
            ctx.moveTo(w * 0.20, topY + height * 0.12);
            ctx.quadraticCurveTo(w * 0.32, topY + height * 0.52, w * 0.24, botY - height * 0.08);
            ctx.moveTo(w * 0.80, topY + height * 0.12);
            ctx.quadraticCurveTo(w * 0.68, topY + height * 0.52, w * 0.76, botY - height * 0.08);
            ctx.stroke();
            ctx.restore();
            return;
        }

        ctx.globalAlpha = preset === 'ankara' ? 0.62 : (preset === 'buba-wrapper' ? 0.50 : 0.46);
        ctx.fillStyle = accent;
        const stepX = w * (preset === 'ankara' ? 0.16 : 0.22);
        const stepY = height * (preset === 'ankara' ? 0.13 : 0.16);
        for (let y = topY + stepY * 0.5; y < botY; y += stepY) {
            for (let x = stepX * 0.5; x < w; x += stepX) {
                const r = Math.min(stepX, stepY) * (preset === 'senator' ? 0.12 : 0.18);
                ctx.beginPath();
                ctx.moveTo(x, y - r);
                ctx.lineTo(x + r, y);
                ctx.lineTo(x, y + r);
                ctx.lineTo(x - r, y);
                ctx.closePath();
                ctx.fill();
                if (preset === 'ankara') {
                    ctx.beginPath();
                    ctx.arc(x, y, r * 0.36, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
        if (preset === 'kaftan' || preset === 'agbada' || preset === 'senator') {
            ctx.globalAlpha = 0.72;
            ctx.strokeStyle = accent;
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.beginPath();
            ctx.moveTo(w * 0.50, topY + (botY - topY) * 0.08);
            ctx.lineTo(w * 0.50, botY - (botY - topY) * 0.12);
            ctx.moveTo(w * 0.42, topY + (botY - topY) * 0.16);
            ctx.lineTo(w * 0.58, topY + (botY - topY) * 0.16);
            ctx.stroke();
        }
        ctx.restore();
    },

    // Peak lapels + a visible inner-shirt V for open-front jackets/blazers.
    // Front view only (lapel geometry is bilateral).
    _ucDrawLapelsAndInnerShirt(ctx, p, d, w, h, clothing) {
        if (!['blazer', 'jacket'].includes(clothing.topStyle)) return;
        const cx = w / 2;
        const neckY = h * 0.045;
        const notchY = h * 0.105;
        const vBottomY = h * 0.30;
        const shirt = this._ucLuminance(clothing.accentColor) > 150 ? clothing.accentColor : '#ECEFF2';
        const lapel = this._ucShadeColor(clothing.topColor, 0.05);
        const lapelEdge = this._ucShadeColor(clothing.topColor, -0.24);

        // Inner shirt V under the opening.
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = shirt;
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.095, neckY);
        ctx.lineTo(cx + w * 0.095, neckY);
        ctx.lineTo(cx, vBottomY);
        ctx.closePath();
        ctx.fill();
        // Soft shading on the inner shirt.
        ctx.fillStyle = this._ucWithAlpha(this._ucShadeColor(shirt, -0.30), 0.35);
        ctx.beginPath();
        ctx.moveTo(cx + w * 0.02, neckY);
        ctx.lineTo(cx + w * 0.095, neckY);
        ctx.lineTo(cx, vBottomY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // Lapels flanking the V.
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        [-1, 1].forEach(s => {
            ctx.fillStyle = lapel;
            ctx.beginPath();
            ctx.moveTo(cx + s * w * 0.02, neckY);
            ctx.lineTo(cx + s * w * 0.21, notchY);
            ctx.lineTo(cx + s * w * 0.12, vBottomY);
            ctx.lineTo(cx + s * w * 0.02, vBottomY * 0.92);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = lapelEdge;
            ctx.lineWidth = Math.max(1, d.ow * 0.5);
            ctx.globalAlpha = 0.55;
            ctx.beginPath();
            ctx.moveTo(cx + s * w * 0.02, neckY);
            ctx.lineTo(cx + s * w * 0.12, vBottomY);
            ctx.moveTo(cx + s * w * 0.02, neckY);
            ctx.lineTo(cx + s * w * 0.21, notchY);
            ctx.stroke();
            ctx.globalAlpha = 1;
        });
        ctx.restore();

        // Collar band behind the neck.
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = this._ucShadeColor(clothing.topColor, -0.08);
        ctx.beginPath();
        ctx.moveTo(cx - w * 0.12, neckY + h * 0.004);
        ctx.quadraticCurveTo(cx, neckY - h * 0.018, cx + w * 0.12, neckY + h * 0.004);
        ctx.lineTo(cx + w * 0.085, neckY + h * 0.024);
        ctx.quadraticCurveTo(cx, neckY + h * 0.008, cx - w * 0.085, neckY + h * 0.024);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    },

    _ucApplyTorsoClothing(ctx, p, d, w, h, view = 'front') {
        const isHybrid = this._ucUseHybridGarments?.(d);
        const clothingForPin = this._ucGetClothing(d);
        if (this._ucUsePinnedGarments(d) && !isHybrid && !this._ucIsWaistSkirtGarment?.(clothingForPin)) return;
        const normalizedView = String(view || '').toLowerCase();
        const integratedGarmentParts = d?._integratedGarmentParts === true
            || d?._integratedSideGarment === true
            || this._ucUseIntegratedGarmentParts?.(d);
        const paintD = integratedGarmentParts
            ? (this._ucBuildIntegratedGarmentPartsContext?.(d) || this._ucBuildIntegratedSideGarmentContext?.(d) || d)
            : (isHybrid ? this._ucBuildHybridUnderpaintContext(d) : d);
        const clothing = this._ucGetClothing(paintD);
        const topStyle = clothing.topStyle;
        const bottomStyle = clothing.bottomStyle;
        const shoulderY = h * 0.075;
        const topStartY = -h * 0.015;
        const hemY = h * (topStyle === 'blouse' ? this._ucBlouseHemRatio(clothing) : this._ucTopHemRatio(topStyle));
        const necklineWidth = topStyle === 'blouse' ? this._ucBlouseNeckWidth(p, w, clothing) : (() => {
            switch (topStyle) {
                case 'tee':
                case 'long-sleeve':
                case 'sweater':
                    return p.neckW * 0.14;
                case 'polo':
                    return p.neckW * 0.12;
                case 'vest':
                    return p.neckW * 0.10;
                case 'shirt':
                case 'blouse':
                case 'blazer':
                case 'jacket':
                case 'lab-coat':
                case 'chef-coat':
                    return p.neckW * 0.09;
                case 'scrub-top':
                case 'tunic':
                case 'hi-vis':
                case 'hoodie':
                case 'agbada':
                    return p.neckW * 0.11;
                case 'dress':
                    return p.neckW * 0.12;
                default:
                    return p.neckW * 0.11;
            }
        })();
        const waistbandY = (() => {
            switch (bottomStyle) {
                case 'shorts': return h * 0.66;
                case 'cargo':
                case 'pants':
                case 'slacks':
                case 'scrub-pants':
                    return h * 0.62;
                default:
                    return null;
            }
        })();

        if (topStyle !== 'none') {
            if (integratedGarmentParts) {
                const painted = normalizedView === 'side'
                    ? this._ucPaintIntegratedSideTorsoGarment(ctx, p, paintD, w, h, clothing)
                    : this._ucPaintIntegratedFrontBackTorsoGarment(ctx, p, paintD, w, h, clothing, normalizedView);
                if (painted) return;
            }
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = clothing.topColor;
            if (topStyle === 'dress') {
                ctx.beginPath();
                ctx.moveTo(w * 0.06, topStartY);
                ctx.quadraticCurveTo(w * 0.14, shoulderY * 0.5, w * 0.32, shoulderY + h * 0.01);
                ctx.quadraticCurveTo(w * 0.50, topStartY, w * 0.68, shoulderY + h * 0.01);
                ctx.quadraticCurveTo(w * 0.86, shoulderY * 0.5, w * 0.94, topStartY);
                ctx.lineTo(w * 0.96, hemY);
                ctx.lineTo(w * 0.04, hemY);
                ctx.closePath();
                ctx.fill();
            } else if (topStyle === 'blouse') {
                const body = clothing.blouseBody || 'fitted';
                const neck = clothing.blouseNeck || 'round';
                const shoulderSpread = neck === 'off-shoulder' ? 1.02 : (body === 'loose' ? 0.96 : 0.90);
                const chestSpread = body === 'loose' ? 0.96 : (body === 'corset' ? 0.72 : (body === 'wrap' ? 0.86 : 0.82));
                const waistSpread = body === 'loose' ? 0.84 : (body === 'corset' ? 0.48 : (body === 'wrap' ? 0.60 : 0.62));
                const hemSpread = body === 'peplum' ? 1.08 : (body === 'loose' ? 0.92 : (body === 'crop' ? 0.58 : 0.70));
                const leftShoulder = w * (0.5 - shoulderSpread * 0.5);
                const rightShoulder = w * (0.5 + shoulderSpread * 0.5);
                const leftChest = w * (0.5 - chestSpread * 0.5);
                const rightChest = w * (0.5 + chestSpread * 0.5);
                const leftWaist = w * (0.5 - waistSpread * 0.5);
                const rightWaist = w * (0.5 + waistSpread * 0.5);
                const leftHem = w * (0.5 - hemSpread * 0.5);
                const rightHem = w * (0.5 + hemSpread * 0.5);
                const bustY = h * 0.30;
                const waistY = h * 0.55;
                ctx.beginPath();
                ctx.moveTo(w * 0.50 - necklineWidth, h * 0.030);
                ctx.quadraticCurveTo(w * 0.30, h * 0.030, leftShoulder, shoulderY);
                ctx.quadraticCurveTo(leftChest, bustY, leftWaist, waistY);
                ctx.quadraticCurveTo(leftHem, (waistY + hemY) * 0.58, leftHem, hemY);
                ctx.quadraticCurveTo(w * 0.50, hemY + h * (body === 'peplum' ? 0.035 : 0.014), rightHem, hemY);
                ctx.quadraticCurveTo(rightHem, (waistY + hemY) * 0.58, rightWaist, waistY);
                ctx.quadraticCurveTo(rightChest, bustY, rightShoulder, shoulderY);
                ctx.quadraticCurveTo(w * 0.70, h * 0.030, w * 0.50 + necklineWidth, h * 0.030);
                ctx.quadraticCurveTo(w * 0.50, h * 0.070, w * 0.50 - necklineWidth, h * 0.030);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.beginPath();
                ctx.moveTo(w * 0.02, topStartY);
                ctx.quadraticCurveTo(w * 0.10, shoulderY * 0.5, w * 0.34, shoulderY + h * 0.01);
                ctx.quadraticCurveTo(w * 0.50, topStartY, w * 0.66, shoulderY + h * 0.01);
                ctx.quadraticCurveTo(w * 0.90, shoulderY * 0.5, w * 0.98, topStartY);
                ctx.lineTo(w * 0.98, hemY);
                ctx.lineTo(w * 0.02, hemY);
                ctx.closePath();
                ctx.fill();
            }
            ctx.restore();

            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = clothing.topColor;
            ctx.beginPath();
            ctx.moveTo(w * 0.02, topStartY);
            ctx.lineTo(w * 0.98, topStartY);
            ctx.lineTo(w * 0.98, shoulderY + h * 0.048);
            ctx.quadraticCurveTo(w * 0.72, h * 0.046, (w / 2) + necklineWidth * 1.25, h * 0.035);
            ctx.quadraticCurveTo(w * 0.50, h * 0.010, (w / 2) - necklineWidth * 1.25, h * 0.035);
            ctx.quadraticCurveTo(w * 0.28, h * 0.046, w * 0.02, shoulderY + h * 0.048);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = d.skin;
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            if (topStyle === 'tee' || topStyle === 'long-sleeve' || topStyle === 'sweater') {
                ctx.beginPath();
                ctx.ellipse(w / 2, h * 0.032, necklineWidth, h * 0.009, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (topStyle === 'polo') {
                ctx.beginPath();
                ctx.moveTo(w * 0.46, h * 0.046);
                ctx.quadraticCurveTo(w * 0.50, h * 0.088, w * 0.54, h * 0.046);
                ctx.lineTo(w * 0.525, h * 0.060);
                ctx.quadraticCurveTo(w * 0.50, h * 0.072, w * 0.475, h * 0.060);
                ctx.closePath();
                ctx.fill();
            } else if (topStyle === 'dress') {
                ctx.beginPath();
                ctx.moveTo(w * 0.44, h * 0.050);
                ctx.quadraticCurveTo(w * 0.50, h * 0.102, w * 0.56, h * 0.050);
                ctx.lineTo(w * 0.54, h * 0.064);
                ctx.quadraticCurveTo(w * 0.50, h * 0.080, w * 0.46, h * 0.064);
                ctx.closePath();
                ctx.fill();
            } else if (topStyle === 'blouse') {
                this._ucCutBlouseNeckline(ctx, d, w, h, necklineWidth, clothing, view);
            } else if (topStyle === 'shirt' || topStyle === 'blazer' || topStyle === 'lab-coat' || topStyle === 'chef-coat') {
                ctx.beginPath();
                ctx.moveTo(w * 0.465, h * 0.048);
                ctx.lineTo(w * 0.50, h * 0.082);
                ctx.lineTo(w * 0.535, h * 0.048);
                ctx.lineTo(w * 0.525, h * 0.062);
                ctx.lineTo(w * 0.50, h * 0.072);
                ctx.lineTo(w * 0.475, h * 0.062);
                ctx.closePath();
                ctx.fill();
            } else if (topStyle === 'scrub-top' || topStyle === 'tunic' || topStyle === 'hi-vis' || topStyle === 'agbada') {
                ctx.beginPath();
                ctx.moveTo(w * 0.455, h * 0.050);
                ctx.quadraticCurveTo(w * 0.50, h * 0.090, w * 0.545, h * 0.050);
                ctx.lineTo(w * 0.530, h * 0.064);
                ctx.quadraticCurveTo(w * 0.50, h * 0.074, w * 0.470, h * 0.064);
                ctx.closePath();
                ctx.fill();
            } else if (topStyle === 'hoodie') {
                ctx.beginPath();
                ctx.ellipse(w / 2, h * 0.040, necklineWidth, h * 0.012, 0, 0, Math.PI * 2);
                ctx.fill();
            } else if (topStyle === 'jacket') {
                ctx.fillStyle = clothing.topColor;
                ctx.fillRect(w * 0.47, topStartY, w * 0.06, hemY - topStartY);
                ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.18);
                ctx.globalAlpha = 0.45;
                ctx.beginPath();
                ctx.moveTo(w * 0.50, topStartY + h * 0.06);
                ctx.lineTo(w * 0.50, hemY - h * 0.02);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
            ctx.restore();

            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = clothing.topColor;
            ctx.beginPath();
            ctx.moveTo(w * 0.02, topStartY);
            ctx.lineTo(w * 0.47, topStartY);
            ctx.quadraticCurveTo(w * 0.455, h * 0.035, w * 0.430, h * 0.070);
            ctx.quadraticCurveTo(w * 0.250, h * 0.045, w * 0.02, shoulderY + h * 0.045);
            ctx.closePath();
            ctx.fill();
            ctx.beginPath();
            ctx.moveTo(w * 0.98, topStartY);
            ctx.lineTo(w * 0.53, topStartY);
            ctx.quadraticCurveTo(w * 0.545, h * 0.035, w * 0.570, h * 0.070);
            ctx.quadraticCurveTo(w * 0.750, h * 0.045, w * 0.98, shoulderY + h * 0.045);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            // Rounded garment volume + drape folds + cultural print.
            this._ucPaintGarmentShading(ctx, w, topStartY, hemY);
            this._ucPaintGarmentFolds(ctx, p, d, w, h, hemY, clothing.topColor);
            this._ucPaintPregnancyGarmentDrape(ctx, p, d, w, h, hemY, clothing);
            this._ucPaintGarmentPrint(ctx, p, d, w, topStartY, hemY, clothing);
            const supportsBreastVolume = typeof this._ucClothingSupportsBreastVolume === 'function'
                ? this._ucClothingSupportsBreastVolume(clothing)
                : ['blouse', 'tee', 'long-sleeve', 'sweater', 'shirt', 'tunic', 'scrub-top'].includes(topStyle);
            if (supportsBreastVolume) {
                this._ucPaintFemaleBustGarmentShape(ctx, p, d, w, h, clothing, normalizedView);
            }
            if (topStyle === 'blouse') {
                this._ucPaintBlouseDesign(ctx, p, d, w, h, topStartY, hemY, clothing, view);
                ctx.save();
                ctx.globalCompositeOperation = 'source-atop';
                this._ucCutBlouseNeckline(ctx, d, w, h, necklineWidth, clothing, normalizedView);
                ctx.restore();
            }
            if (view === 'front') this._ucDrawLapelsAndInnerShirt(ctx, p, d, w, h, clothing);

            if (topStyle !== 'jacket' && topStyle !== 'blouse') {
                ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.20);
                ctx.lineWidth = Math.max(1, d.ow * 0.55);
                ctx.globalAlpha = 0.38;
                ctx.beginPath();
                ctx.moveTo((w / 2) - necklineWidth * 1.25, h * 0.055);
                ctx.quadraticCurveTo(w / 2, h * 0.083, (w / 2) + necklineWidth * 1.25, h * 0.055);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }

            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.18);
            ctx.lineWidth = Math.max(1, d.ow * 0.7);
            ctx.globalAlpha = 0.35;
            ctx.beginPath();
            ctx.moveTo(w * 0.20, hemY);
            ctx.quadraticCurveTo(w * 0.50, hemY + h * 0.02, w * 0.80, hemY);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (waistbandY !== null && topStyle !== 'dress') {
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = clothing.bottomColor;
            ctx.beginPath();
            ctx.moveTo(w * 0.26, waistbandY);
            ctx.lineTo(w * 0.74, waistbandY);
            ctx.lineTo(w * 0.86, h);
            ctx.lineTo(w * 0.14, h);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            this._ucPaintGarmentShading(ctx, w, waistbandY, h);

            ctx.strokeStyle = this._ucShadeColor(clothing.bottomColor, -0.14);
            ctx.lineWidth = Math.max(1, d.ow * 0.5);
            ctx.globalAlpha = 0.30;
            ctx.beginPath();
            ctx.moveTo(w * 0.24, waistbandY + h * 0.01);
            ctx.quadraticCurveTo(w * 0.50, waistbandY + h * 0.04, w * 0.76, waistbandY + h * 0.01);
            ctx.moveTo(w * 0.50, waistbandY + h * 0.03);
            ctx.lineTo(w * 0.50, h - h * 0.06);
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (bottomStyle === 'skirt' || topStyle === 'dress') {
            const isSideSkirt = normalizedView === 'side' && bottomStyle === 'skirt' && topStyle !== 'dress';
            const skirtTop = topStyle === 'dress' ? h * 0.48 : (isSideSkirt ? h * 0.52 : h * 0.62);
            const skirtBottom = h * 0.98;
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = topStyle === 'dress' ? clothing.topColor : clothing.bottomColor;
            ctx.beginPath();
            if (isSideSkirt) {
                ctx.moveTo(w * 0.22, skirtTop);
                ctx.quadraticCurveTo(w * 0.78, skirtTop - h * 0.012, w * 0.86, skirtTop + h * 0.10);
                ctx.quadraticCurveTo(w * 0.94, h * 0.70, w * 0.82, skirtBottom);
                ctx.lineTo(w * 0.16, skirtBottom);
                ctx.quadraticCurveTo(w * 0.05, h * 0.72, w * 0.18, skirtTop + h * 0.12);
                ctx.quadraticCurveTo(w * 0.19, skirtTop + h * 0.04, w * 0.22, skirtTop);
            } else {
                ctx.moveTo(w * 0.30, skirtTop);
                ctx.lineTo(w * 0.70, skirtTop);
                ctx.lineTo(w * 0.88, skirtBottom);
                ctx.lineTo(w * 0.12, skirtBottom);
            }
            ctx.closePath();
            ctx.fill();
            ctx.restore();
            this._ucPaintGarmentShading(ctx, w, skirtTop, skirtBottom);
            this._ucPaintGarmentPrint(ctx, p, d, w, skirtTop, skirtBottom, clothing);
        }

        if (view === 'back' && topStyle !== 'none') {
            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.14);
            ctx.lineWidth = Math.max(1, d.ow * 0.6);
            ctx.globalAlpha = 0.28;
            ctx.beginPath();
            ctx.moveTo(w * 0.50, h * 0.12);
            ctx.lineTo(w * 0.50, Math.min(h * 0.72, hemY));
            ctx.stroke();
            ctx.globalAlpha = 1;
        }

        if (this._ucIsHumanLikeQuality?.(d.qualityPreset) && topStyle !== 'none') {
            ctx.save();
            const centerX = w * 0.5;
            const accent = clothing.accentColor;
            ctx.strokeStyle = this._ucWithAlpha(this._ucShadeColor(clothing.topColor, -0.24), 0.34);
            ctx.lineWidth = Math.max(0.75, d.ow * 0.45);
            ctx.lineCap = 'round';
            const seamTop = h * 0.15;
            const seamBottom = Math.min(hemY, h * 0.78);
            if (view !== 'side') {
                ctx.beginPath();
                ctx.moveTo(centerX, seamTop);
                ctx.quadraticCurveTo(centerX - w * 0.015, h * 0.44, centerX, seamBottom);
                ctx.stroke();
                ctx.globalAlpha = 0.38;
                [-1, 1].forEach(s => {
                    ctx.beginPath();
                    ctx.moveTo(centerX + s * w * 0.22, h * 0.22);
                    ctx.quadraticCurveTo(centerX + s * w * 0.16, h * 0.42, centerX + s * w * 0.20, seamBottom);
                    ctx.stroke();
                });
            } else {
                ctx.beginPath();
                ctx.moveTo(w * 0.58, seamTop);
                ctx.quadraticCurveTo(w * 0.64, h * 0.42, w * 0.58, seamBottom);
                ctx.stroke();
            }
            if (['agbada', 'royal-agbada', 'royal-agbada-painted', 'kaftan', 'dashiki', 'ankara', 'chief', 'senator', 'buba-wrapper', 'adire', 'kente'].includes(clothing.outfitPreset)) {
                ctx.globalAlpha = 0.5;
                ctx.strokeStyle = this._ucWithAlpha(accent, 0.72);
                for (let y = h * 0.24; y < seamBottom; y += h * 0.12) {
                    ctx.beginPath();
                    ctx.moveTo(w * 0.30, y);
                    ctx.quadraticCurveTo(centerX, y + h * 0.018, w * 0.70, y);
                    ctx.stroke();
                }
            }
            ctx.restore();
        }
    },

    _ucApplyArmClothing(ctx, p, d, w, upperEnd, foreEnd) {
        const isHybrid = this._ucUseHybridGarments?.(d);
        const clothingForPin = this._ucGetClothing(d);
        if (this._ucUsePinnedGarments(d) && !isHybrid && !this._ucIsWaistSkirtGarment?.(clothingForPin)) return;
        const paintD = isHybrid ? this._ucBuildHybridUnderpaintContext(d) : d;
        const clothing = this._ucGetClothing(paintD);
        const sleeveRatio = this._ucSleeveRatio(clothing.topStyle, clothing);
        if (sleeveRatio <= 0) return;
        const sleeveEnd = Math.min(foreEnd, Math.max(upperEnd * 0.45, (upperEnd + p.forearmLen) * sleeveRatio));
        ctx.save();
        ctx.globalCompositeOperation = 'source-atop';
        ctx.fillStyle = clothing.topColor;
        if (clothing.topStyle === 'blouse' && clothing.blouseSleeve === 'puff') {
            ctx.beginPath();
            ctx.ellipse(w * 0.5, Math.min(sleeveEnd * 0.48, upperEnd * 0.72), w * 0.56, Math.max(upperEnd * 0.22, p.hu * 0.045), 0, 0, Math.PI * 2);
            ctx.rect(w * 0.12, 0, w * 0.76, sleeveEnd);
            ctx.fill();
        } else if (clothing.topStyle === 'blouse' && clothing.blouseSleeve === 'bell') {
            ctx.beginPath();
            ctx.moveTo(w * 0.18, 0);
            ctx.lineTo(w * 0.82, 0);
            ctx.lineTo(w * 0.98, sleeveEnd);
            ctx.quadraticCurveTo(w * 0.50, sleeveEnd + p.hu * 0.018, w * 0.02, sleeveEnd);
            ctx.closePath();
            ctx.fill();
        } else {
            ctx.fillRect(0, 0, w, sleeveEnd);
        }
        ctx.restore();
        this._ucPaintGarmentShading(ctx, w, 0, sleeveEnd);

        ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.16);
        ctx.lineWidth = Math.max(1, d.ow * 0.55);
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.moveTo(w * 0.22, sleeveEnd);
        ctx.quadraticCurveTo(w * 0.50, sleeveEnd + p.hu * 0.01, w * 0.78, sleeveEnd);
        ctx.stroke();
        ctx.globalAlpha = 1;

        this._ucApplyArmOutfitDetails(ctx, p, d, w, upperEnd, foreEnd);
    },

    _ucApplyLegClothing(ctx, p, d, w, h, ankleY) {
        const isHybrid = this._ucUseHybridGarments?.(d);
        const paintD = isHybrid ? this._ucBuildHybridUnderpaintContext(d) : d;
        const usePinned = this._ucUsePinnedGarments(d);
        const isPinnedAgbada = usePinned && this._ucIsAgbadaGarment?.(d);
        const pinnedClothing = this._ucGetClothing(d);
        const isPinnedWaistSkirt = usePinned && this._ucIsWaistSkirtGarment?.(pinnedClothing);
        if (usePinned && !isPinnedAgbada && !isHybrid && !isPinnedWaistSkirt) return;
        const clothing = this._ucGetClothing(paintD);
        const isSkirtBottom = clothing.bottomStyle === 'skirt';
        const bottomCoverage = isSkirtBottom
            ? this._ucLegSkirtCoverage(clothing, d?.view)
            : this._ucBottomCoverage(clothing.bottomStyle);
        const longGarmentCoverage = isHybrid ? this._ucLongGarmentCoverage(clothing) : (isPinnedAgbada ? 0 : this._ucLongGarmentCoverage(clothing));
        if (bottomCoverage > 0) {
            const isSkirt = clothing.bottomStyle === 'skirt';
            const bottomEndY = Math.min(ankleY, h * bottomCoverage);
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = clothing.bottomColor;
            if (isSkirt) {
                ctx.beginPath();
                ctx.moveTo(w * 0.12, 0);
                ctx.lineTo(w * 0.88, 0);
                ctx.lineTo(w * 0.98, bottomEndY);
                ctx.quadraticCurveTo(w * 0.50, bottomEndY + p.hu * 0.012, w * 0.02, bottomEndY);
                ctx.closePath();
                ctx.fill();
            } else {
                ctx.fillRect(0, 0, w, bottomEndY);
            }
            ctx.restore();
            this._ucPaintGarmentShading(ctx, w, 0, bottomEndY);

            ctx.strokeStyle = this._ucShadeColor(clothing.bottomColor, -0.16);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.globalAlpha = isSkirt ? 0.50 : 0.36;
            ctx.beginPath();
            ctx.moveTo(w * 0.18, bottomEndY);
            ctx.quadraticCurveTo(w * 0.50, bottomEndY + p.hu * 0.012, w * 0.82, bottomEndY);
            ctx.stroke();
            ctx.globalAlpha = 1;

            ctx.strokeStyle = this._ucShadeColor(clothing.bottomColor, -0.22);
            ctx.lineWidth = Math.max(1, d.ow * 0.42);
            ctx.globalAlpha = 0.38;
            if (clothing.bottomStyle === 'shorts') {
                ctx.beginPath();
                ctx.moveTo(w * 0.24, bottomEndY - p.hu * 0.025);
                ctx.lineTo(w * 0.76, bottomEndY - p.hu * 0.025);
                ctx.moveTo(w * 0.50, h * 0.04);
                ctx.lineTo(w * 0.50, bottomEndY - p.hu * 0.010);
                ctx.stroke();
            } else if (clothing.bottomStyle === 'pants' || clothing.bottomStyle === 'slacks' || clothing.bottomStyle === 'scrub-pants' || clothing.bottomStyle === 'cargo') {
                ctx.beginPath();
                ctx.moveTo(w * 0.50, h * 0.04);
                ctx.lineTo(w * 0.50, Math.min(bottomEndY - p.hu * 0.020, ankleY - p.footH * 0.10));
                ctx.stroke();
                if (clothing.bottomStyle === 'scrub-pants') {
                    ctx.strokeStyle = this._ucShadeColor(clothing.bottomColor, 0.10);
                    ctx.beginPath();
                    ctx.moveTo(w * 0.18, Math.max(0, bottomEndY - p.hu * 0.05));
                    ctx.lineTo(w * 0.82, Math.max(0, bottomEndY - p.hu * 0.05));
                    ctx.stroke();
                }
                if (clothing.bottomStyle === 'cargo') {
                    ctx.strokeRect(w * 0.58, h * 0.28, w * 0.22, h * 0.11);
                    ctx.strokeRect(w * 0.20, h * 0.42, w * 0.20, h * 0.10);
                }
            } else if (isSkirt) {
                ctx.beginPath();
                ctx.moveTo(w * 0.36, h * 0.06);
                ctx.lineTo(w * 0.28, bottomEndY - p.hu * 0.025);
                ctx.moveTo(w * 0.64, h * 0.06);
                ctx.lineTo(w * 0.72, bottomEndY - p.hu * 0.025);
                ctx.stroke();
            }
            ctx.globalAlpha = 1;
        }

        if (longGarmentCoverage > 0) {
            const isAgbada = clothing.topStyle === 'agbada' || clothing.outfitPreset === 'agbada' || clothing.outfitPreset === 'royal-agbada' || clothing.outfitPreset === 'royal-agbada-painted';
            const footClearance = isAgbada ? p.footH * 0.34 : p.footH * 1.05;
            const garmentEndY = Math.max(h * 0.18, Math.min(ankleY - footClearance, h * longGarmentCoverage));
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = clothing.topColor;
            ctx.beginPath();
            ctx.moveTo(w * 0.04, 0);
            ctx.lineTo(w * 0.96, 0);
            ctx.lineTo(w * 0.90, garmentEndY);
            ctx.quadraticCurveTo(w * 0.50, garmentEndY + p.hu * 0.018, w * 0.10, garmentEndY);
            ctx.closePath();
            ctx.fill();
            ctx.restore();

            ctx.strokeStyle = this._ucShadeColor(clothing.topColor, -0.18);
            ctx.lineWidth = Math.max(1, d.ow * 0.55);
            ctx.globalAlpha = 0.36;
            ctx.beginPath();
            ctx.moveTo(w * 0.12, garmentEndY);
            ctx.quadraticCurveTo(w * 0.50, garmentEndY + p.hu * 0.018, w * 0.88, garmentEndY);
            ctx.moveTo(w * 0.50, h * 0.04);
            ctx.quadraticCurveTo(w * 0.46, garmentEndY * 0.52, w * 0.50, garmentEndY - p.hu * 0.03);
            ctx.stroke();
            ctx.globalAlpha = 1;

            if (isAgbada) {
                ctx.strokeStyle = clothing.accentColor;
                ctx.lineWidth = Math.max(1, d.ow * 0.65);
                ctx.globalAlpha = 0.72;
                ctx.beginPath();
                ctx.moveTo(w * 0.30, h * 0.08);
                ctx.quadraticCurveTo(w * 0.42, garmentEndY * 0.48, w * 0.34, garmentEndY - p.hu * 0.06);
                ctx.moveTo(w * 0.70, h * 0.08);
                ctx.quadraticCurveTo(w * 0.58, garmentEndY * 0.48, w * 0.66, garmentEndY - p.hu * 0.06);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        if (clothing.footwearStyle !== 'none') {
            const shoeStart = (clothing.footwearStyle === 'boots')
                ? Math.max(0, ankleY - p.footH * 0.9)
                : ((clothing.footwearStyle === 'clogs' || clothing.footwearStyle === 'heels')
                    ? Math.max(0, ankleY - p.footH * 0.18)
                    : Math.max(0, ankleY - p.footH * 0.08));
            ctx.save();
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = clothing.footwearColor;
            ctx.fillRect(0, shoeStart, w, h - shoeStart);
            ctx.restore();

            if (clothing.footwearStyle === 'dress-shoes' || clothing.footwearStyle === 'heels') {
                ctx.strokeStyle = this._ucShadeColor(clothing.footwearColor, -0.20);
                ctx.lineWidth = Math.max(1, d.ow * 0.45);
                ctx.globalAlpha = 0.4;
                ctx.beginPath();
                ctx.moveTo(w * 0.14, h - p.footH * 0.14);
                ctx.lineTo(w * 0.86, h - p.footH * 0.14);
                ctx.stroke();
                ctx.globalAlpha = 1;
            }
        }

        this._ucApplyLegOutfitDetails(ctx, p, d, w, h, ankleY);
    },

});
