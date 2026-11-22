/* Opt-in side artwork; legacy UC presets and saved characters stay unchanged. */
Object.assign(JointSystem.prototype, {
    _ucRepairGeneratedFaceLayout(armature, head) {
        const d = head?._facialDrawCtx;
        const style = armature?.root?._ucCharacterStyleConfig;
        if (!d || !style || head._facialProportions?.layoutVersion >= 2
            || head._ucImageFitMaskSrc || head._ucImageFitTransferMode
            || this._ucIsBackFamilyView(d.view) || !this._isUniversalCharacterArmature(armature)) return false;
        const config = this._normalizeUniversalCharacterConfig({ ...style, view: d.view, sideFacing: d.sideFacing });
        const age = this._ucAgeRatios(config.ageGroup);
        const p = this._ucApplyBodyAngleToProportions(
            this._ucApplyQualityPresetToProportions(
                this._ucApplyHeadNeckStyleToProportions(
                    this._ucGetProportions(config.gender, config.bodyType, config.height / age.totalHeads, age,
                        config.view, config.build, config.weight, config.muscle, config.partScale,
                        config.hip, config.shoulder, config.belly, config.bust), config.headNeckStyle, config.view),
                config.qualityPreset, config.view, config), config.bodyAngle, config.view, config.viewVariant, config.sideFacing);
        const sx = head.width / p.headW, sy = head.height / (p.headH + p.neckH);
        p.headW = head.width; p.headH *= sy; p.neckH *= sy; p.neckW *= sx;
        let canvas = this._ucRenderHeadCanvas(p, d);
        if (d.view === 'side' && d.sideFacing === 'right') canvas = this._ucMirrorCanvasHorizontally(canvas);
        const expression = head._facialExpression;
        head.imageSrc = canvas.toDataURL('image/png');
        head.loadImage(head.imageSrc, { preserveDimensions: true });
        this._ucCreateFacialFeatures(head, p, d);
        head._facialExpression = expression || 'neutral';
        head._facialRenderCache = null;
        head._facialLastApplySignature = null;
        return true;
    },

    _ucRefinedSideLandmarks(d = {}) {
        const female = d.gender === 'female';
        const young = ['child', 'neonate'].includes(d.ageGroup);
        const profile = this._ucGetHeadNeckProfile(d.headNeckStyle);
        const ctrl = (key, low = 70, high = 140) => this._ucClampNum(d[key], low, high, 100) / 100 - 1;
        return {
            foreheadX: 0.647 + ctrl('foreheadScale') * 0.035,
            browX: 0.656 + ctrl('noseBridgeScale', 70, 150) * 0.018,
            noseX: (young ? 0.721 : female ? 0.738 : 0.754) + ctrl('sideNoseScale', 60, 160) * 0.045,
            lipX: (female ? 0.684 : 0.693) + ctrl('sideMouthScale', 60, 160) * 0.012,
            chinX: (female ? 0.631 : 0.653) + ctrl('chinScale') * 0.026 + (profile.chinWidthMult - 1) * 0.030,
            jawX: 0.318 - ctrl('jawScale') * 0.024 - (profile.jawWidthMult - 1) * 0.030,
            eyeX: 0.565 + ctrl('noseBridgeScale', 70, 150) * 0.008,
            eyeY: young ? 0.400 : 0.415,
            browY: young ? 0.321 : 0.333,
            mouthY: 0.675,
            chinY: young ? 0.835 : female ? 0.859 : 0.886
        };
    },

    _ucDrawRefinedSideHead(ctx, p, d, w, h) {
        const hh = p.headH, m = this._ucRefinedSideLandmarks(d);
        const hair = this._ucNormalizeHairStyle(d.hairStyle, d.gender);
        const hairProfile = this._ucGetHairSilhouetteProfile(hair, d);
        const long = /long|shoulder|braid|loc|ponytail|weave/.test(hair);
        const crownY = Math.max(0.004, 0.028 - (hairProfile.height - 1) * 0.055);
        const backX = Math.max(0.035, 0.08 - (hairProfile.backDepth - 1) * 0.085);
        const fringeY = Math.min(0.278, 0.245 + (hairProfile.frontDrop - 1) * 0.065);
        ctx.save();
        ctx.lineJoin = 'round'; ctx.lineCap = 'round';
        if (hair !== 'bald' && long) {
            ctx.fillStyle = this._ucShadeColor(d.hair, -0.10);
            ctx.beginPath(); ctx.moveTo(w * 0.17, hh * 0.22);
            ctx.bezierCurveTo(w * 0.04, hh * 0.43, w * 0.08, h * 0.79, w * 0.07, h * 0.96);
            ctx.quadraticCurveTo(w * 0.23, h, w * 0.38, h * 0.93);
            ctx.quadraticCurveTo(w * 0.30, hh * 0.62, w * 0.35, hh * 0.26);
            ctx.closePath(); ctx.fill();
        }
        if (/bun|puff/.test(hair)) {
            ctx.fillStyle = d.hair;
            ctx.beginPath(); ctx.ellipse(w * 0.16, hh * 0.20, w * 0.10 * hairProfile.volume, hh * 0.135 * hairProfile.height, 0, 0, Math.PI * 2); ctx.fill();
        }
        const face = new Path2D();
        face.moveTo(w * 0.17, hh * 0.49);
        face.bezierCurveTo(w * 0.08, hh * 0.25, w * 0.19, hh * 0.04, w * 0.37, hh * 0.035);
        face.bezierCurveTo(w * 0.52, hh * 0.015, w * (m.foreheadX + 0.018), hh * 0.10, w * m.foreheadX, hh * 0.25);
        face.quadraticCurveTo(w * (m.foreheadX + 0.018), hh * 0.31, w * m.browX, hh * 0.365);
        face.quadraticCurveTo(w * (m.browX - 0.016), hh * 0.414, w * (m.browX + 0.017), hh * 0.468);
        face.quadraticCurveTo(w * (m.noseX - 0.018), hh * 0.523, w * m.noseX, hh * 0.555);
        face.quadraticCurveTo(w * (m.noseX + 0.001), hh * 0.586, w * (m.lipX - 0.004), hh * 0.598);
        face.quadraticCurveTo(w * (m.lipX - 0.017), hh * 0.627, w * m.lipX, hh * 0.643);
        face.quadraticCurveTo(w * (m.lipX + 0.018), hh * 0.656, w * (m.lipX + 0.009), hh * m.mouthY);
        face.quadraticCurveTo(w * (m.lipX + 0.016), hh * 0.698, w * (m.lipX - 0.006), hh * 0.718);
        face.quadraticCurveTo(w * (m.lipX - 0.009), hh * 0.780, w * m.chinX, hh * m.chinY);
        face.quadraticCurveTo(w * 0.48, hh * (m.chinY + 0.037), w * m.jawX, hh * 0.78);
        face.quadraticCurveTo(w * 0.19, hh * 0.68, w * 0.17, hh * 0.49);
        face.closePath();
        ctx.fillStyle = d.skin; ctx.fill(face);
        ctx.strokeStyle = d.outline; ctx.lineWidth = Math.max(0.5, d.ow * 0.7); ctx.stroke(face);
        if (hair !== 'bald') {
            const scalp = new Path2D();
            scalp.moveTo(w * 0.20, hh * 0.62);
            scalp.bezierCurveTo(w * backX, hh * 0.48, w * backX, hh * 0.13, w * 0.29, hh * crownY);
            scalp.bezierCurveTo(w * 0.48, hh * (crownY - 0.030), w * 0.65, hh * 0.07, w * (m.foreheadX + 0.012), hh * fringeY);
            scalp.quadraticCurveTo(w * (0.55 + hairProfile.partBias * 0.1), hh * (fringeY - 0.021), w * 0.44, hh * 0.232);
            scalp.quadraticCurveTo(w * 0.405, hh * 0.29, w * 0.40, hh * 0.424);
            scalp.quadraticCurveTo(w * 0.38, hh * 0.535, w * 0.31, hh * 0.62);
            scalp.closePath(); ctx.fillStyle = d.hair; ctx.fill(scalp);
            ctx.save(); ctx.clip(scalp);
            ctx.strokeStyle = this._ucShadeColor(d.hair, 0.13); ctx.lineWidth = Math.max(0.5, d.ow * 0.45);
            for (let i = 0; i < 5; i++) {
                ctx.beginPath(); ctx.moveTo(w * (0.21 + i * 0.055), hh * 0.08);
                ctx.quadraticCurveTo(w * (0.24 + i * 0.075), hh * 0.20, w * (0.21 + i * 0.045), hh * 0.57); ctx.stroke();
            }
            ctx.restore();
        }
        const earX = w * 0.37, earY = hh * 0.485;
        ctx.fillStyle = this._ucShadeColor(d.skin, -0.02); ctx.strokeStyle = this._ucShadeColor(d.skin, -0.18);
        ctx.lineWidth = Math.max(0.5, d.ow * 0.55);
        ctx.beginPath(); ctx.ellipse(earX, earY, w * 0.050, hh * 0.125, -0.10, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(earX - w * 0.007, earY - hh * 0.070);
        ctx.quadraticCurveTo(earX + w * 0.025, earY - hh * 0.032, earX, earY + hh * 0.055); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(w * (m.noseX - 0.031), hh * 0.576);
        ctx.quadraticCurveTo(w * (m.noseX - 0.040), hh * 0.587, w * (m.noseX - 0.050), hh * 0.580); ctx.stroke();
        this._ucDrawFacialHairSide(ctx, p, d, w, hh, { jawBackX: w * m.jawX, jawAngleY: hh * 0.78, chinFrontX: w * m.chinX, chinY: hh * m.chinY, mouthY: hh * m.mouthY, lipFrontX: w * m.lipX });
        // Animated features are separate objects; only the standalone builder
        // preview paints their neutral appearance onto the base bitmap.
        if (d._ucPreviewStaticFeatures) {
            for (const feature of this._ucGetFacialFeatureLayout(p, { ...d, sideFacing: 'right' }, w, hh)) {
                ctx.save(); ctx.translate(feature.x, feature.y);
                feature.draw(ctx, feature.w, feature.h); ctx.restore();
            }
        }
        ctx.restore();
    },

    _ucDrawRefinedSideHeadwear(ctx, p, d, w) {
        const clothing = this._ucGetClothing(d);
        let style = this._ucNormalizeHeadwearStyle(d.headwearStyle);
        if (style === 'none' && ['construction', 'chef'].includes(clothing.outfitPreset)) style = clothing.outfitPreset;
        if (!['uniform-cap', 'baseball-cap', 'kufi', 'bowler-hat', 'fedora', 'top-hat', 'sun-hat', 'bucket-hat', 'beanie', 'construction', 'chef'].includes(style)) return false;
        const hh = p.headH, m = this._ucRefinedSideLandmarks(d);
        const fabric = style === 'chef' ? '#f1f3f4' : style === 'construction' ? (clothing.accentColor || '#dcae32') : (clothing.topColor || d.hair);
        ctx.save(); ctx.translate(w, 0); ctx.scale(-1, 1);
        ctx.fillStyle = fabric; ctx.strokeStyle = this._ucShadeColor(fabric, -0.22); ctx.lineWidth = Math.max(0.5, d.ow * 0.7);
        ctx.beginPath(); ctx.moveTo(w * 0.115, hh * 0.295);
        if (['kufi', 'top-hat'].includes(style)) {
            ctx.lineTo(w * 0.15, hh * 0.018); ctx.quadraticCurveTo(w * 0.36, -hh * 0.005, w * 0.62, hh * 0.026);
            ctx.lineTo(w * (m.foreheadX + 0.015), hh * 0.266);
        } else if (style === 'chef') {
            ctx.bezierCurveTo(w * 0.03, hh * 0.04, w * 0.23, -hh * 0.01, w * 0.30, hh * 0.03);
            ctx.bezierCurveTo(w * 0.43, -hh * 0.01, w * 0.63, hh * 0.035, w * (m.foreheadX + 0.018), hh * 0.266);
        } else {
            ctx.bezierCurveTo(w * 0.08, hh * 0.10, w * 0.18, hh * 0.014, w * 0.36, hh * 0.012);
            ctx.bezierCurveTo(w * 0.53, hh * 0.01, w * 0.64, hh * 0.10, w * (m.foreheadX + 0.020), hh * 0.266);
        }
        ctx.quadraticCurveTo(w * 0.42, hh * 0.253, w * 0.115, hh * 0.295);
        ctx.closePath(); ctx.fill(); ctx.stroke();
        if (!['kufi', 'beanie', 'chef'].includes(style)) {
            const brim = ['uniform-cap', 'baseball-cap', 'construction'].includes(style) ? 0.82 : 0.77;
            ctx.beginPath(); ctx.moveTo(w * 0.11, hh * 0.292);
            ctx.quadraticCurveTo(w * 0.53, hh * 0.248, w * brim, hh * 0.300);
            ctx.quadraticCurveTo(w * 0.49, hh * 0.300, w * 0.11, hh * 0.312);
            ctx.closePath(); ctx.fill(); ctx.stroke();
        }
        ctx.restore(); return true;
    }
});
