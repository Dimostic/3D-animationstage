/**
 * Object Manager — Color palette, object list & layers UI
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {

    // ═══════════════════════════════════════════════════
    //  COLOR PALETTE DASHBOARD
    // ═══════════════════════════════════════════════════

    _initColorPalette() {
        const grid = document.getElementById('img-color-palette-grid');
        if (!grid) return;

        // Refresh button
        document.getElementById('btn-cp-refresh')?.addEventListener('click', () => {
            this._generateColorPalette();
        });

        // Auto-generate when filter sliders change
        const filterIds = [
            'img-brightness', 'img-contrast', 'img-saturation', 'img-hue',
            'img-blur', 'img-grayscale', 'img-sepia', 'img-invert', 'img-tint-amount'
        ];
        filterIds.forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                clearTimeout(this._cpDebounce);
                this._cpDebounce = setTimeout(() => this._generateColorPalette(), 120);
            });
        });
        document.getElementById('img-tint-color')?.addEventListener('input', () => {
            clearTimeout(this._cpDebounce);
            this._cpDebounce = setTimeout(() => this._generateColorPalette(), 120);
        });
    },

    _generateColorPalette() {
        const grid = document.getElementById('img-color-palette-grid');
        if (!grid) return;

        const selected = this.getSelectedObjects();
        const obj = selected.length === 1 && selected[0].type === 'image' ? selected[0] : null;
        const imgSrc = obj ? obj.imageSrc : null;

        // Named color presets — each produces a recognisable, predictable result.
        // Tint-based presets overlay a solid colour on the image for true primary colours.
        // Filter-based presets use brightness / grayscale / sepia / invert for tonal effects.
        const presets = [
            { label: 'Original', hue: 0, brightness: 0,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 0,  tintColor: '#ff0000' },
            { label: 'Red',      hue: 0, brightness: 0,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 70, tintColor: '#ff0000' },
            { label: 'Blue',     hue: 0, brightness: 0,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 70, tintColor: '#0055ff' },
            { label: 'Yellow',   hue: 0, brightness: 10,  saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 65, tintColor: '#ffdd00' },
            { label: 'Green',    hue: 0, brightness: 0,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 70, tintColor: '#00aa22' },
            { label: 'Orange',   hue: 0, brightness: 5,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 65, tintColor: '#ff8800' },
            { label: 'Purple',   hue: 0, brightness: 0,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 70, tintColor: '#8822cc' },
            { label: 'Cyan',     hue: 0, brightness: 5,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 65, tintColor: '#00cccc' },
            { label: 'Pink',     hue: 0, brightness: 10,  saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 60, tintColor: '#ff66aa' },
            { label: 'Black',    hue: 0, brightness: -80, saturation: 0,   sepia: 0,   invert: 0,   grayscale: 0,   tint: 0,  tintColor: '#000000' },
            { label: 'White',    hue: 0, brightness: 90,  saturation: -80, sepia: 0,   invert: 0,   grayscale: 0,   tint: 0,  tintColor: '#ffffff' },
            { label: 'Gray',     hue: 0, brightness: 0,   saturation: 0,   sepia: 0,   invert: 0,   grayscale: 100, tint: 0,  tintColor: '#808080' },
            { label: 'Sepia',    hue: 0, brightness: 0,   saturation: 0,   sepia: 100, invert: 0,   grayscale: 0,   tint: 0,  tintColor: '#704214' },
            { label: 'Warm',     hue: 0, brightness: 10,  saturation: 20,  sepia: 0,   invert: 0,   grayscale: 0,   tint: 30, tintColor: '#ff6600' },
            { label: 'Cool',     hue: 0, brightness: 0,   saturation: 10,  sepia: 0,   invert: 0,   grayscale: 0,   tint: 30, tintColor: '#0066ff' },
            { label: 'Invert',   hue: 0, brightness: 0,   saturation: 0,   sepia: 0,   invert: 100, grayscale: 0,   tint: 0,  tintColor: '#ffffff' }
        ];

        // Build a CSS filter string that matches the actual canvas rendering pipeline
        const buildFilterStr = (sw) => {
            const f = [];
            if (sw.brightness) f.push(`brightness(${1 + sw.brightness / 100})`);
            if (sw.saturation) f.push(`saturate(${1 + sw.saturation / 100})`);
            if (sw.hue)        f.push(`hue-rotate(${sw.hue}deg)`);
            if (sw.grayscale)  f.push(`grayscale(${sw.grayscale}%)`);
            if (sw.sepia)      f.push(`sepia(${sw.sepia}%)`);
            if (sw.invert)     f.push(`invert(${sw.invert}%)`);
            return f.length ? f.join(' ') : 'none';
        };

        grid.innerHTML = '';
        presets.forEach((sw, i) => {
            const swatch = document.createElement('div');
            swatch.className = 'cp-swatch';
            swatch.title = sw.label;

            if (imgSrc) {
                // Real image thumbnail with actual CSS filters for accurate preview
                const imgEl = document.createElement('img');
                imgEl.className = 'cp-swatch-img';
                imgEl.src = imgSrc;
                imgEl.draggable = false;
                imgEl.style.filter = buildFilterStr(sw);
                swatch.appendChild(imgEl);

                if (sw.tint > 0) {
                    const tintEl = document.createElement('div');
                    tintEl.className = 'cp-swatch-tint';
                    tintEl.style.background = sw.tintColor;
                    tintEl.style.opacity = sw.tint / 100;
                    swatch.appendChild(tintEl);
                }
            } else {
                // Fallback: solid colour chip when no image is available
                const colorEl = document.createElement('div');
                colorEl.className = 'cp-swatch-color';
                colorEl.style.background = sw.tint > 0 ? sw.tintColor : (sw.grayscale ? '#888' : (sw.sepia ? '#704214' : '#ccc'));
                swatch.appendChild(colorEl);
            }

            const labelEl = document.createElement('div');
            labelEl.className = 'cp-swatch-label';
            labelEl.textContent = sw.label;
            swatch.appendChild(labelEl);

            swatch.addEventListener('click', () => this._applyPaletteSwatch(sw, i));
            grid.appendChild(swatch);
        });
    },

    _applyPaletteSwatch(sw, index) {
        const selected = this.getSelectedObjects();
        if (selected.length === 0) return;

        selected.forEach(obj => {
            if (obj.type !== 'image') return;
            obj.imgHue = sw.hue;
            obj.imgBrightness = sw.brightness;
            obj.imgSaturation = sw.saturation;
            obj.imgSepia = sw.sepia;
            obj.imgInvert = sw.invert;
            obj.imgGrayscale = sw.grayscale;
            obj.imgTintAmount = sw.tint;
            if (sw.tintColor) obj.imgTintColor = sw.tintColor;
        });

        // Suppress palette regeneration while updating UI sliders
        this._cpSuppressRegen = true;
        this.updateProperties();
        this._cpSuppressRegen = false;

        this.stage.requestRender();
        eventBus.emit('history:push');

        // Mark active swatch
        const grid = document.getElementById('img-color-palette-grid');
        if (grid) {
            grid.querySelectorAll('.cp-swatch').forEach((el, i) => {
                el.classList.toggle('cp-active', i === index);
            });
        }
    },

    updateProperties() {
        const selected = this.getSelectedObjects();
        const propertiesEl = document.getElementById('properties-editor');
        const noSelectionEl = document.getElementById('no-selection-msg');
        const textPropsEl = document.getElementById('text-properties');

        if (selected.length === 0) {
            propertiesEl?.classList.add('hidden');
            noSelectionEl?.classList.remove('hidden');
            const selInfo = document.getElementById('selection-info');
            if (selInfo) selInfo.textContent = '';
            const propStageAngle = document.getElementById('prop-stage-angle');
            const propStageAngleSigned = document.getElementById('prop-stage-angle-signed');
            const propStageAngleDown = document.getElementById('prop-stage-angle-down');
            if (propStageAngle) propStageAngle.value = '';
            if (propStageAngleSigned) propStageAngleSigned.value = '';
            if (propStageAngleDown) propStageAngleDown.value = '';
            this.updateAspectLockButton(null);
            this.updateDepthHandleButton(null);
            document.getElementById('prop-depth-side-color-field')?.classList.add('hidden');
            document.getElementById('prop-depth-side-mode-field')?.classList.add('hidden');
            document.getElementById('prop-depth-lighting-field')?.classList.add('hidden');
            document.getElementById('prop-depth-perspective-field')?.classList.add('hidden');
            this._updateAdvancedPartProperties?.(null, selected);
            this._syncSvgAvatarControls?.(null);
            this._syncSvgAfricanLiveAdjustmentControls?.(null);
            return;
        }

        propertiesEl?.classList.remove('hidden');
        noSelectionEl?.classList.add('hidden');

        const obj = selected[0];
        this._updateAdvancedPartProperties?.(obj, selected);
        this._syncSvgAvatarControls?.(obj);
        this._syncSvgAfricanLiveAdjustmentControls?.(obj);
        const propX = document.getElementById('prop-x');
        const propY = document.getElementById('prop-y');
        const propW = document.getElementById('prop-width');
        const propH = document.getElementById('prop-height');
        const propR = document.getElementById('prop-rotation');
        const propStageAngle = document.getElementById('prop-stage-angle');
        const propStageAngleSigned = document.getElementById('prop-stage-angle-signed');
        const propStageAngleDown = document.getElementById('prop-stage-angle-down');
        const propD = document.getElementById('prop-depth');
        const propDepthSideMode = document.getElementById('prop-depth-side-mode');
        const propDepthSideColor = document.getElementById('prop-depth-side-color');
        const propDepthLighting = document.getElementById('prop-depth-lighting');
        const propDepthLightingVal = document.getElementById('prop-depth-lighting-val');
        const propDepthPerspective = document.getElementById('prop-depth-perspective');
        const propDepthPerspectiveVal = document.getElementById('prop-depth-perspective-val');
        const propTiltX = document.getElementById('prop-tilt-x');
        const propTiltY = document.getElementById('prop-tilt-y');
        const propO = document.getElementById('prop-opacity');
        const propOV = document.getElementById('prop-opacity-val');
        if (propX) propX.value = Math.round(obj.x);
        if (propY) propY.value = Math.round(obj.y);
        if (propW) propW.value = Math.round(obj.width);
        if (propH) propH.value = Math.round(obj.height);
        if (propR) propR.value = Math.round(obj.rotation);
        const stageAngleInfo = this.getObjectStageAngleInfo(obj);
        if (propStageAngle) propStageAngle.value = stageAngleInfo ? `${stageAngleInfo.angle360}°` : '';
        if (propStageAngleSigned) propStageAngleSigned.value = stageAngleInfo ? `${stageAngleInfo.angle180}°` : '';
        if (propStageAngleDown) propStageAngleDown.value = stageAngleInfo ? `${stageAngleInfo.fromDown}°` : '';
        if (propD) propD.value = Math.round(obj.depth || 0);
        const depthSideHex = this._toColorInputHex(obj.depthSideColor || obj.fill || obj.stroke || '#4a90d9', '#4a90d9');
        const depthSideMode = obj.type === 'image' && obj.depthSideMode !== 'color' ? 'auto' : 'color';
        const depthLighting = Math.max(0, Math.min(100, Math.round(Number(obj.depthLighting ?? 45) || 0)));
        const depthPerspective = Math.max(0, Math.min(100, Math.round(Number(obj.depthPerspective ?? 0) || 0)));
        if (propDepthSideMode) propDepthSideMode.value = depthSideMode;
        if (propDepthSideColor) propDepthSideColor.value = depthSideHex;
        if (propDepthLighting) propDepthLighting.value = String(depthLighting);
        if (propDepthLightingVal) propDepthLightingVal.textContent = `${depthLighting}%`;
        if (propDepthPerspective) propDepthPerspective.value = String(depthPerspective);
        if (propDepthPerspectiveVal) propDepthPerspectiveVal.textContent = `${depthPerspective}%`;
        if (propTiltX) propTiltX.value = Math.round(obj.tiltX || 0);
        if (propTiltY) propTiltY.value = Math.round(obj.tiltY || 0);
        if (propO) propO.value = Math.round(obj.opacity * 100);
        if (propOV) propOV.textContent = Math.round(obj.opacity * 100) + '%';
        const propBlend = document.getElementById('prop-blend-mode');
        if (propBlend) propBlend.value = obj.blendMode || 'normal';

        const compression = obj._compressionRig || {};
        const compAxis = document.getElementById('compress-axis');
        if (compAxis) compAxis.value = compression.axis || 'vertical';
        const compAnchor = document.getElementById('compress-anchor');
        if (compAnchor) compAnchor.value = compression.anchor || 'center';
        const compAmount = document.getElementById('compress-amount');
        const compAmountPct = Math.round((compression.amount || 0) * 100);
        if (compAmount) compAmount.value = String(compAmountPct);
        const compAmountVal = document.getElementById('compress-amount-val');
        if (compAmountVal) compAmountVal.textContent = `${compAmountPct}%`;

        const compEdges = compression.edges || {};
        const setMargin = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = String(Math.round((Number(v) || 0) * 100));
        };
        setMargin('compress-margin-top', compEdges.top);
        setMargin('compress-margin-bottom', compEdges.bottom);
        setMargin('compress-margin-left', compEdges.left);
        setMargin('compress-margin-right', compEdges.right);
        const compFullClose = document.getElementById('compress-full-close');
        if (compFullClose) compFullClose.checked = compEdges.fullClose !== false;

        const pairState = obj._compressionPair || {};
        const pairAmount = document.getElementById('compress-pair-amount');
        const pairPct = Math.round((pairState.amount || 0) * 100);
        if (pairAmount) pairAmount.value = String(pairPct);
        const pairAmountVal = document.getElementById('compress-pair-amount-val');
        if (pairAmountVal) pairAmountVal.textContent = `${pairPct}%`;
        const pairScale = document.getElementById('compress-pair-scale');
        if (pairScale) pairScale.checked = pairState.scaleTowardSeam !== false;

        this.updateAspectLockButton(obj);
        this.updateDepthHandleButton(obj);
        const propTiltXVal = document.getElementById('prop-tilt-x-val');
        const propTiltYVal = document.getElementById('prop-tilt-y-val');
        if (propTiltXVal) propTiltXVal.textContent = `${Math.round(obj.tiltX || 0)}°`;
        if (propTiltYVal) propTiltYVal.textContent = `${Math.round(obj.tiltY || 0)}°`;
        const tiltSupported = StageObject.supportsTiltType(obj.type);
        document.getElementById('prop-tilt-x-field')?.classList.toggle('hidden', !tiltSupported);
        document.getElementById('prop-tilt-y-field')?.classList.toggle('hidden', !tiltSupported);
        const depthSupported = StageObject.supportsDepthExtrusionType(obj) || StageObject.supportsDepthScaleType(obj.type);
        document.getElementById('prop-depth-side-mode-field')?.classList.toggle('hidden', !depthSupported || obj.type !== 'image');
        document.getElementById('prop-depth-side-color-field')?.classList.toggle('hidden', !depthSupported);
        document.getElementById('prop-depth-lighting-field')?.classList.toggle('hidden', !depthSupported);
        document.getElementById('prop-depth-perspective-field')?.classList.toggle('hidden', !depthSupported);

        // Fill
        const _safeHexFill = (c) => this._toColorInputHex(c, '#000000');
        const isNoFill = obj.fillType === 'none' || obj.fill === 'transparent';
        document.getElementById('prop-fill').value = _safeHexFill(obj._savedFill || obj.fill);
        const fillTypeEl = document.getElementById('prop-fill-type');
        if (fillTypeEl) fillTypeEl.value = isNoFill ? 'none' : (obj.fillType || 'solid');
        // Show/hide fill color field and gradient/pattern controls
        document.getElementById('fill-color-field')?.classList.toggle('hidden', isNoFill);
        const gradCtrl = document.getElementById('gradient-controls');
        const patCtrl = document.getElementById('pattern-controls');
        if (gradCtrl) gradCtrl.classList.toggle('hidden', isNoFill || !['linear-gradient','radial-gradient'].includes(obj.fillType));
        if (patCtrl) patCtrl.classList.toggle('hidden', isNoFill || obj.fillType !== 'pattern');
        if (obj.gradientStops && obj.gradientStops.length >= 2) {
            const gs = document.getElementById('prop-grad-start');
            const ge = document.getElementById('prop-grad-end');
            if (gs) gs.value = this._toColorInputHex(obj.gradientStops[0].color, '#000000');
            if (ge) ge.value = this._toColorInputHex(obj.gradientStops[obj.gradientStops.length - 1].color, '#ffffff');
        }
        const gaEl = document.getElementById('prop-grad-angle');
        if (gaEl) { gaEl.value = obj.gradientAngle || 0; }
        const gaVal = document.getElementById('prop-grad-angle-val');
        if (gaVal) gaVal.textContent = (obj.gradientAngle || 0) + '°';
        const ptEl = document.getElementById('prop-pattern-type');
        if (ptEl) ptEl.value = obj.patternType || 'none';
        const pcEl = document.getElementById('prop-pattern-color');
        if (pcEl) pcEl.value = this._toColorInputHex(obj.patternColor, '#ffffff');
        const psEl = document.getElementById('prop-pattern-scale');
        if (psEl) psEl.value = obj.patternScale ?? 1;

        // Outline
        const _safeHex = (c) => this._toColorInputHex(c, '#000000');
        const isNoStroke = obj.stroke === 'transparent' || obj.strokeWidth === 0;
        const noStrokeEl = document.getElementById('prop-stroke-none');
        if (noStrokeEl) noStrokeEl.checked = isNoStroke;
        document.getElementById('prop-stroke-width')?.parentElement?.classList.toggle('hidden', isNoStroke);
        document.getElementById('prop-stroke').value = _safeHex(obj._savedStroke || obj.stroke);
        document.getElementById('prop-stroke-width').value = obj._savedStrokeWidth || obj.strokeWidth;
        const dashEl = document.getElementById('prop-stroke-dash');
        if (dashEl) dashEl.value = obj.strokeDash || 'solid';
        const capEl = document.getElementById('prop-stroke-cap');
        if (capEl) capEl.value = obj.strokeCap || 'round';
        const joinEl = document.getElementById('prop-stroke-join');
        if (joinEl) joinEl.value = obj.strokeJoin || 'round';
        document.getElementById('prop-border-radius').value = obj.borderRadius;

        const shapeSection = document.getElementById('shape-controls-section');
        const showShapeField = (fieldId, visible) => {
            document.getElementById(fieldId)?.classList.toggle('hidden', !visible);
        };
        const isStar = obj.type === 'star';
        const isPolygon = obj.type === 'polygon';
        const isDoughnut = obj.type === 'doughnut';
        const isBlockArc = obj.type === 'blockArc';
        const hasAngleControls = ['pie', 'chord', 'blockArc'].includes(obj.type);
        const hasArrowControls = ['bentArrow', 'uTurnArrow', 'quadArrow', 'upDownArrow', 'upArrowCallout', 'elbowArrowConnector'].includes(obj.type);
        const hasShapeControls = StageObject.hasAdjustableShapeControls(obj.type);
        if (shapeSection) shapeSection.classList.toggle('hidden', !hasShapeControls);
        showShapeField('shape-sides-field', isStar || isPolygon);
        showShapeField('shape-inner-radius-field', isStar);
        showShapeField('shape-hole-size-field', isDoughnut);
        showShapeField('shape-arc-thickness-field', isBlockArc);
        showShapeField('shape-start-angle-field', hasAngleControls);
        showShapeField('shape-sweep-angle-field', hasAngleControls);
        showShapeField('shape-arrow-shaft-field', hasArrowControls);
        showShapeField('shape-arrow-head-field', hasArrowControls);
        const resetShapeBtn = document.getElementById('btn-reset-shape-controls');
        if (resetShapeBtn) {
            resetShapeBtn.disabled = !hasShapeControls;
            resetShapeBtn.innerHTML = `<i class="fas fa-undo"></i> Reset ${StageObject.getTypeDisplayName(obj.type)} Defaults`;
            resetShapeBtn.title = `Reset ${StageObject.getTypeDisplayName(obj.type)} shape controls to their defaults`;
        }

        const shapeSidesLabel = document.getElementById('shape-sides-label');
        if (shapeSidesLabel) shapeSidesLabel.textContent = isStar ? 'Points' : 'Sides';
        const shapeSidesEl = document.getElementById('prop-shape-sides');
        if (shapeSidesEl) shapeSidesEl.value = obj.sides ?? 5;
        const starInnerEl = document.getElementById('prop-shape-inner-radius');
        if (starInnerEl) starInnerEl.value = obj.innerRadius ?? StageObject.getDefaultShapeProperty(obj.type, 'innerRadius') ?? 0.4;
        const starInnerVal = document.getElementById('prop-shape-inner-radius-val');
        if (starInnerVal) starInnerVal.textContent = `${Math.round((obj.innerRadius ?? StageObject.getDefaultShapeProperty(obj.type, 'innerRadius') ?? 0.4) * 100)}%`;
        const holeEl = document.getElementById('prop-shape-hole-size');
        if (holeEl) holeEl.value = obj.innerRadius ?? StageObject.getDefaultShapeProperty(obj.type, 'innerRadius') ?? 0.55;
        const holeVal = document.getElementById('prop-shape-hole-size-val');
        if (holeVal) holeVal.textContent = `${Math.round((obj.innerRadius ?? StageObject.getDefaultShapeProperty(obj.type, 'innerRadius') ?? 0.55) * 100)}%`;
        const thicknessValue = 1 - (obj.innerRadius ?? StageObject.getDefaultShapeProperty(obj.type, 'innerRadius') ?? 0.6);
        const arcThicknessEl = document.getElementById('prop-shape-arc-thickness');
        if (arcThicknessEl) arcThicknessEl.value = thicknessValue;
        const arcThicknessVal = document.getElementById('prop-shape-arc-thickness-val');
        if (arcThicknessVal) arcThicknessVal.textContent = `${Math.round(thicknessValue * 100)}%`;
        const shapeStart = obj.shapeStartAngle ?? StageObject.getDefaultShapeProperty(obj.type, 'shapeStartAngle') ?? 0;
        const shapeSweep = obj.shapeSweepAngle ?? StageObject.getDefaultShapeProperty(obj.type, 'shapeSweepAngle') ?? 180;
        const shapeStartEl = document.getElementById('prop-shape-start-angle');
        if (shapeStartEl) shapeStartEl.value = ((shapeStart % 360) + 360) % 360;
        const shapeStartVal = document.getElementById('prop-shape-start-angle-val');
        if (shapeStartVal) shapeStartVal.textContent = `${Math.round(((shapeStart % 360) + 360) % 360)}°`;
        const shapeSweepEl = document.getElementById('prop-shape-sweep-angle');
        if (shapeSweepEl) shapeSweepEl.value = shapeSweep;
        const shapeSweepVal = document.getElementById('prop-shape-sweep-angle-val');
        if (shapeSweepVal) shapeSweepVal.textContent = `${Math.round(shapeSweep)}°`;
        const arrowShaftEl = document.getElementById('prop-arrow-shaft-width');
        const arrowShaftValue = obj.arrowShaftWidth ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowShaftWidth') ?? 0.24;
        if (arrowShaftEl) arrowShaftEl.value = arrowShaftValue;
        const arrowShaftVal = document.getElementById('prop-arrow-shaft-width-val');
        if (arrowShaftVal) arrowShaftVal.textContent = `${Math.round(arrowShaftValue * 100)}%`;
        const arrowHeadEl = document.getElementById('prop-arrow-head-length');
        const arrowHeadValue = obj.arrowHeadLength ?? StageObject.getDefaultShapeProperty(obj.type, 'arrowHeadLength') ?? 0.28;
        if (arrowHeadEl) arrowHeadEl.value = arrowHeadValue;
        const arrowHeadVal = document.getElementById('prop-arrow-head-length-val');
        if (arrowHeadVal) arrowHeadVal.textContent = `${Math.round(arrowHeadValue * 100)}%`;

        // Effects - shadow
        document.getElementById('prop-shadow').checked = obj.shadow;
        const shadowCtrl = document.getElementById('shadow-controls');
        if (shadowCtrl) shadowCtrl.classList.toggle('hidden', !obj.shadow);
        const shColEl = document.getElementById('prop-shadow-color');
        if (shColEl) { const hex = obj.shadowColor?.startsWith('#') ? obj.shadowColor : '#000000'; shColEl.value = hex; }
        const shBlurEl = document.getElementById('prop-shadow-blur');
        if (shBlurEl) shBlurEl.value = obj.shadowBlur ?? 10;
        const shOxEl = document.getElementById('prop-shadow-ox');
        if (shOxEl) shOxEl.value = obj.shadowOffsetX ?? 2;
        const shOyEl = document.getElementById('prop-shadow-oy');
        if (shOyEl) shOyEl.value = obj.shadowOffsetY ?? 4;

        // Effects - glow
        const glowCb = document.getElementById('prop-glow');
        if (glowCb) glowCb.checked = !!obj.glowEnabled;
        const glowCtrl = document.getElementById('glow-controls');
        if (glowCtrl) glowCtrl.classList.toggle('hidden', !obj.glowEnabled);
        const glColEl = document.getElementById('prop-glow-color');
        if (glColEl) glColEl.value = this._toColorInputHex(obj.glowColor, '#00bfff');
        const glSzEl = document.getElementById('prop-glow-size');
        if (glSzEl) glSzEl.value = obj.glowSize ?? 15;

        // Effects - reflection
        const reflCb = document.getElementById('prop-reflection');
        if (reflCb) reflCb.checked = !!obj.reflectionEnabled;
        const reflCtrl = document.getElementById('reflection-controls');
        if (reflCtrl) reflCtrl.classList.toggle('hidden', !obj.reflectionEnabled);
        const reflOpEl = document.getElementById('prop-refl-opacity');
        if (reflOpEl) reflOpEl.value = Math.round((obj.reflectionOpacity ?? 0.3) * 100);
        const reflOffEl = document.getElementById('prop-refl-offset');
        if (reflOffEl) reflOffEl.value = obj.reflectionOffset ?? 0;

        // Effects - bevel
        const bevelCb = document.getElementById('prop-bevel');
        if (bevelCb) bevelCb.checked = !!obj.bevelEnabled;
        const bevelCtrl = document.getElementById('bevel-controls');
        if (bevelCtrl) bevelCtrl.classList.toggle('hidden', !obj.bevelEnabled);
        const bvSzEl = document.getElementById('prop-bevel-size');
        if (bvSzEl) bvSzEl.value = obj.bevelSize ?? 4;
        const bvHiEl = document.getElementById('prop-bevel-hi');
        if (bvHiEl) bvHiEl.value = obj.bevelHighlight || '#ffffff';
        const bvShEl = document.getElementById('prop-bevel-sh');
        if (bvShEl) bvShEl.value = obj.bevelShadow || '#000000';

        // Flip button active state
        const flipHBtn = document.getElementById('btn-flip-h');
        const flipVBtn = document.getElementById('btn-flip-v');
        if (flipHBtn) flipHBtn.classList.toggle('active', !!obj.flipH);
        if (flipVBtn) flipVBtn.classList.toggle('active', !!obj.flipV);

        // Visibility + Lock button state
        const visBtn = document.getElementById('btn-toggle-visible');
        if (visBtn) {
            const icon = visBtn.querySelector('i');
            if (icon) {
                icon.className = obj.visible ? 'fas fa-eye' : 'fas fa-eye-slash';
            }
            visBtn.classList.toggle('active', !obj.visible);
            visBtn.title = obj.visible ? 'Hide object' : 'Show object';
        }
        const lockBtn = document.getElementById('btn-lock-toggle');
        if (lockBtn) {
            const icon = lockBtn.querySelector('i');
            if (icon) {
                icon.className = obj.locked ? 'fas fa-lock' : 'fas fa-unlock';
            }
            lockBtn.classList.toggle('active', obj.locked);
            lockBtn.title = obj.locked ? 'Unlock object' : 'Lock object';
        }

        // Show text properties for text objects and shapes with text
        const isTextType = obj.type === 'text';
        const hasText = obj.text && obj.text.trim();
        const canHaveText = !['image', 'line', 'path', 'scribble'].includes(obj.type);
        if (isTextType || hasText || canHaveText) {
            textPropsEl.classList.remove('hidden');
            document.getElementById('prop-text-content').value = obj.text;
            const textColorEl = document.getElementById('prop-text-color');
            if (textColorEl) textColorEl.value = obj.textColor || '#ffffff';
            document.getElementById('prop-font-family').value = obj.fontFamily;
            document.getElementById('prop-font-size').value = obj.fontSize;
            document.getElementById('prop-font-weight').value = obj.fontWeight;
            const strokeColorEl = document.getElementById('prop-text-stroke-color');
            if (strokeColorEl) strokeColorEl.value = obj.textStrokeColor || '#000000';
            const strokeWidthEl = document.getElementById('prop-text-stroke-width');
            if (strokeWidthEl) strokeWidthEl.value = obj.textStrokeWidth ?? 0;
            // New text formatting
            const boldBtn = document.getElementById('btn-text-bold');
            const italicBtn = document.getElementById('btn-text-italic');
            const ulBtn = document.getElementById('btn-text-underline');
            const stBtn = document.getElementById('btn-text-strikethrough');
            const shadowBtn = document.getElementById('btn-text-shadow');
            const bgBtn = document.getElementById('btn-text-bg');
            if (boldBtn) boldBtn.classList.toggle('active', obj.fontWeight === '700');
            if (italicBtn) italicBtn.classList.toggle('active', obj.fontStyle === 'italic');
            if (ulBtn) ulBtn.classList.toggle('active', (obj.textDecoration || '').includes('underline'));
            if (stBtn) stBtn.classList.toggle('active', (obj.textDecoration || '').includes('line-through'));
            if (shadowBtn) shadowBtn.classList.toggle('active', !!obj.shadow);
            if (bgBtn) bgBtn.classList.toggle('active', !!obj.textBackgroundEnabled);
            const bgEnabledEl = document.getElementById('prop-text-bg-enabled');
            if (bgEnabledEl) bgEnabledEl.checked = !!obj.textBackgroundEnabled;
            const lhEl = document.getElementById('prop-line-height');
            if (lhEl) lhEl.value = obj.lineHeight ?? 1.4;
            const lsEl = document.getElementById('prop-letter-spacing');
            if (lsEl) lsEl.value = obj.letterSpacing ?? 0;
            const curveEl = document.getElementById('prop-text-curve');
            if (curveEl) curveEl.value = obj.textCurve ?? 0;
            const bgColorEl = document.getElementById('prop-text-bg-color');
            if (bgColorEl) bgColorEl.value = this._toColorInputHex(obj.textBackgroundColor, '#111827');
            const bgPaddingEl = document.getElementById('prop-text-bg-padding');
            if (bgPaddingEl) bgPaddingEl.value = obj.textBackgroundPadding ?? 10;
            const bgRadiusEl = document.getElementById('prop-text-bg-radius');
            if (bgRadiusEl) bgRadiusEl.value = obj.textBackgroundRadius ?? 8;
            const wsEl = document.getElementById('prop-word-spacing');
            if (wsEl) wsEl.value = obj.wordSpacing ?? 0;
            const shEnabledEl = document.getElementById('prop-text-shadow-enabled');
            if (shEnabledEl) shEnabledEl.checked = !!obj.shadow;
            const shColorEl = document.getElementById('prop-text-shadow-color');
            if (shColorEl) shColorEl.value = this._toColorInputHex(obj.shadowColor, '#000000');
            const shBlurEl = document.getElementById('prop-text-shadow-blur');
            if (shBlurEl) shBlurEl.value = obj.shadowBlur ?? 10;
            const shOxEl = document.getElementById('prop-text-shadow-offset-x');
            if (shOxEl) shOxEl.value = obj.shadowOffsetX ?? 2;
            const shOyEl = document.getElementById('prop-text-shadow-offset-y');
            if (shOyEl) shOyEl.value = obj.shadowOffsetY ?? 4;
            document.querySelectorAll('[data-text-transform]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.textTransform === (obj.textTransform || 'none'));
            });
            document.querySelectorAll('[data-list-style]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.listStyle === (obj.listStyle || 'none'));
            });
            // Text alignment active state
            document.querySelectorAll('[data-text-align]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.textAlign === (obj.textAlign || 'left'));
            });
            // Vertical alignment active state
            document.querySelectorAll('[data-text-valign]').forEach(btn => {
                btn.classList.toggle('active', btn.dataset.textValign === (obj.textVerticalAlign || 'middle'));
            });
        } else {
            textPropsEl.classList.add('hidden');
        }

        // Show image properties for image objects, and keep the section available
        // when a face-set target is selected so Universal Face can be reopened.
        const imagePropsEl = document.getElementById('image-properties');
        if (imagePropsEl) {
            const hasSelectedFaceSet = (() => {
                const mgr = window.FaceRigManager;
                if (!mgr || typeof mgr.isFaceSetObject !== 'function') return false;
                return selected.some(s => mgr.isFaceSetObject(s));
            })();

            if (obj.type === 'image' || hasSelectedFaceSet) {
                imagePropsEl.classList.remove('hidden');
                // Update image filter sliders
                const palSec = document.getElementById('img-color-palette-section');
                if (obj.type === 'image') {
                    const imgFilters = [
                        { id: 'img-brightness', prop: 'imgBrightness', valId: 'img-brightness-val', suffix: '' },
                        { id: 'img-contrast', prop: 'imgContrast', valId: 'img-contrast-val', suffix: '' },
                        { id: 'img-saturation', prop: 'imgSaturation', valId: 'img-saturation-val', suffix: '' },
                        { id: 'img-hue', prop: 'imgHue', valId: 'img-hue-val', suffix: '°' },
                        { id: 'img-blur', prop: 'imgBlur', valId: 'img-blur-val', suffix: '' },
                        { id: 'img-grayscale', prop: 'imgGrayscale', valId: 'img-grayscale-val', suffix: '' },
                        { id: 'img-sepia', prop: 'imgSepia', valId: 'img-sepia-val', suffix: '' },
                        { id: 'img-invert', prop: 'imgInvert', valId: 'img-invert-val', suffix: '' },
                    ];
                    imgFilters.forEach(({ id, prop, valId, suffix }) => {
                        const el = document.getElementById(id);
                        if (el) el.value = obj[prop] ?? 0;
                        const valEl = document.getElementById(valId);
                        if (valEl) valEl.textContent = (obj[prop] ?? 0) + suffix;
                    });
                    const tintColEl = document.getElementById('img-tint-color');
                    if (tintColEl) tintColEl.value = obj.imgTintColor || '#ffffff';
                    const tintAmtEl = document.getElementById('img-tint-amount');
                    if (tintAmtEl) tintAmtEl.value = obj.imgTintAmount ?? 0;
                    const tintValEl = document.getElementById('img-tint-val');
                    if (tintValEl) tintValEl.textContent = (obj.imgTintAmount ?? 0) + '%';
                    if (palSec) palSec.classList.remove('hidden');
                    if (!this._cpSuppressRegen) this._generateColorPalette();
                } else if (palSec) {
                    palSec.classList.add('hidden');
                }
            } else {
                imagePropsEl.classList.add('hidden');
                const bgControls = document.getElementById('bg-removal-controls');
                if (bgControls) bgControls.classList.remove('visible');
                document.getElementById('ai-trace-controls')?.classList.add('hidden');
                this._clearAiTracePreview();
                const palSec = document.getElementById('img-color-palette-section');
                if (palSec) palSec.classList.add('hidden');
            }
        }

        // Show edit-points section for path-based objects
        const pointsPropsEl = document.getElementById('points-properties');
        if (pointsPropsEl) {
            const hasPoints = ['path','scribble','freeform','polygon','star','rectangle','circle','triangle','line','diamond','heart','arrow','doubleArrow','curvedArrow', ...StageObject.getCustomShapeTypes()].includes(obj.type) || obj.pathPoints?.length > 0;
            pointsPropsEl.classList.toggle('hidden', !hasPoints);
        }

        // Show boolean operations section when 2+ objects selected (at least one shape)
        const boolPropsEl = document.getElementById('boolean-properties');
        if (boolPropsEl) {
            const shapeTypes = ['rectangle','circle','triangle','star','polygon','diamond','heart','arrow','doubleArrow','curvedArrow', ...StageObject.getCustomShapeTypes(), 'freeform','path','scribble'];
            const allBoolTypes = [...shapeTypes, 'text', 'image', 'line'];
            const boolCandidates = selected.filter(o => allBoolTypes.includes(o.type));
            const hasShape = boolCandidates.some(o => shapeTypes.includes(o.type) || o.type === 'line');
            boolPropsEl.classList.toggle('hidden', !(boolCandidates.length >= 2 && hasShape));
        }

        // Show flex tool section for single non-line/path/text objects
        const flexPropsEl = document.getElementById('flex-properties');
        if (flexPropsEl) {
            const selectedArmature = window.app?.jointSystem?._detectSelectedArmature?.();
            const flexSupported = (selected.length === 1 && !['line','path','scribble','text'].includes(obj.type))
                || !!selectedArmature;
            flexPropsEl.classList.toggle('hidden', !flexSupported);
        }

        // Show Auto Trace section for any single selectable object (all shapes + images, not text/line)
        const aiTraceSectionEl = document.getElementById('ai-trace-section');
        if (aiTraceSectionEl) {
            const traceSupported = selected.length === 1 && !['line', 'text'].includes(obj.type);
            aiTraceSectionEl.classList.toggle('hidden', !traceSupported);
            // Hide Remove BG options for non-image objects (canvas bg is already transparent)
            aiTraceSectionEl.querySelectorAll('.ai-trace-image-only').forEach(el => {
                el.style.display = obj.type === 'image' ? '' : 'none';
            });
        }

        // Pin section
        const pinSection = document.getElementById('pin-section');
        if (pinSection) {
            pinSection.classList.remove('hidden');
            const pinTarget = document.getElementById('pin-target');
            if (pinTarget) {
                // Populate dropdown with all other objects
                const currentVal = obj.pinnedTo || '';
                let html = '<option value="">None (unpinned)</option>';
                this.objects.forEach(o => {
                    if (o.id === obj.id) return;
                    const sel = o.id === currentVal ? ' selected' : '';
                    const safeName = (o.name || o.id).replace(/</g, '&lt;');
                    html += `<option value="${o.id}"${sel}>${safeName}</option>`;
                });
                pinTarget.innerHTML = html;
            }
            const pinParentJoint = document.getElementById('pin-parent-joint');
            if (pinParentJoint) {
                const parent = obj.pinnedTo ? this.getObjectById(obj.pinnedTo) : null;
                const joints = parent?.joints || [];
                let html = '<option value="">Parent Anchor / Surface</option>';
                joints.forEach((jt, index) => {
                    const value = jt.id || `joint-${index}`;
                    const label = (jt.name || `Joint ${index + 1}`).replace(/</g, '&lt;');
                    const selected = obj.pinTargetType === 'joint' && ((obj.pinJointId && obj.pinJointId === jt.id) || (!obj.pinJointId && obj.pinJointName === jt.name));
                    html += `<option value="${value}"${selected ? ' selected' : ''}>${label}</option>`;
                });
                pinParentJoint.innerHTML = html;
                pinParentJoint.disabled = !parent || joints.length === 0;
            }
            const usesParentJoint = obj.pinTargetType === 'joint';
            const pinAx = document.getElementById('pin-anchor-x');
            if (pinAx) {
                pinAx.value = obj.pinAnchorX ?? 0.5;
                pinAx.disabled = usesParentJoint;
            }
            const pinAy = document.getElementById('pin-anchor-y');
            if (pinAy) {
                pinAy.value = obj.pinAnchorY ?? 0.5;
                pinAy.disabled = usesParentJoint;
            }
            const pinOx = document.getElementById('pin-offset-x');
            if (pinOx) pinOx.value = Math.round(obj.pinOffsetX ?? 0);
            const pinOy = document.getElementById('pin-offset-y');
            if (pinOy) pinOy.value = Math.round(obj.pinOffsetY ?? 0);
            const pinRotMode = document.getElementById('pin-rotation-mode');
            if (pinRotMode) pinRotMode.value = obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static');
            // Joint base angle field — show when mode is 'joint'
            const jaField = document.getElementById('joint-base-angle-field');
            if (jaField) {
                const isJoint = (pinRotMode?.value === 'joint');
                jaField.classList.toggle('hidden', !isJoint);
                const jaInput = document.getElementById('pin-joint-base-angle');
                if (jaInput) jaInput.value = obj.jointBaseAngle || 0;
            }
            // Show/hide pick button based on whether parent is set
            const pickBtn = document.getElementById('btn-pick-pin-point');
            if (pickBtn) {
                pickBtn.classList.toggle('hidden', !obj.pinnedTo || usesParentJoint);
                pickBtn.disabled = usesParentJoint;
            }
            // Pin contour checkbox + options
            const pinContourEl = document.getElementById('pin-contour');
            if (pinContourEl) pinContourEl.checked = !!obj.pinContour;
            const pinContourOpts = document.getElementById('pin-contour-opts');
            if (pinContourOpts) {
                pinContourOpts.classList.toggle('hidden', !obj.pinContour);
                const sizeSlider = document.getElementById('pin-contour-size');
                const sizeVal = document.getElementById('pin-contour-size-val');
                if (sizeSlider) sizeSlider.value = obj.contourSize ?? 1;
                if (sizeVal) sizeVal.textContent = (obj.contourSize ?? 1).toFixed(1);
                const colorPicker = document.getElementById('pin-contour-color');
                const autoCheck = document.getElementById('pin-contour-auto-color');
                const hasExplicit = !!obj.contourColor;
                if (autoCheck) autoCheck.checked = !hasExplicit;
                if (colorPicker) {
                    colorPicker.disabled = !hasExplicit;
                    colorPicker.value = this._toColorInputHex(obj.contourColor || obj.pinContourColor || '#888888');
                }
            }
        }

        // Joints section
        const jointsSection = document.getElementById('joints-section');
        if (jointsSection) {
            jointsSection.classList.remove('hidden');
            const dirEl = document.getElementById('joint-direction');
            if (dirEl) dirEl.value = StageObject.normalizeJointDirection(obj.jointDirection);
            this._updateMainJointContourControls(obj);
            this._renderJointsList(obj);
        }

        // Pivot point
        const pivotSection = document.getElementById('pivot-section');
        if (pivotSection) {
            pivotSection.classList.remove('hidden');
            document.getElementById('pivot-show').checked = obj.showPivot;
            document.getElementById('pivot-x').value = obj.pivotX;
            document.getElementById('pivot-y').value = obj.pivotY;
            this.updatePivotGrid();
        }

        // Stage Hide/Show controls visibility
        const hideShowControls = document.getElementById('stage-hideshow-controls');
        if (hideShowControls && this._stageHideShowActive) {
            hideShowControls.classList.toggle('hidden', selected.length === 0);
        }

        // Context-sensitive property sections: hide irrelevant sections based on object type
        const objType = obj.type;
        const isImage = objType === 'image';
        const isLine = objType === 'line' || objType === 'path' || objType === 'scribble';
        // Fill section: hide for images and lines
        document.querySelectorAll('.prop-section').forEach(section => {
            const heading = section.querySelector('h4');
            if (!heading) return;
            const title = heading.textContent.trim().toLowerCase();
            if (title === 'fill') section.classList.toggle('hidden', isImage || isLine);
        });

        // Selection info
        const info = selected.length === 1
            ? `${obj.name} (${Math.round(obj.width)}×${Math.round(obj.height)})`
            : `${selected.length} objects selected`;
        document.getElementById('selection-info').textContent = info;
    },

    _getMainJointContourMode(obj = this.getSelectedObjects()[0]) {
        if (obj?.pinnedTo) return 'pin';
        if (obj && typeof this._getConnectedAssemblyObjects === 'function') {
            const connected = this._getConnectedAssemblyObjects(obj) || [];
            if (connected.some(item => !!item?.pinnedTo)) return 'pin';
        }
        return 'joint';
    },

    _getMainJointContourTargets(mode = null) {
        const selected = this.getSelectedObjects();
        const resolvedMode = mode || this._getMainJointContourMode(selected[0]);
        if (resolvedMode !== 'pin') return selected;

        const targetsById = new Map();
        selected.forEach(obj => {
            if (!obj) return;
            if (typeof this._getConnectedAssemblyObjects === 'function') {
                const connected = this._getConnectedAssemblyObjects(obj) || [];
                connected.forEach(item => {
                    if (item?.id) targetsById.set(item.id, item);
                });
            }
            if (obj.id) targetsById.set(obj.id, obj);
        });

        const pinTargets = Array.from(targetsById.values()).filter(obj => !!obj?.pinnedTo);
        if (pinTargets.length > 0) return pinTargets;
        return selected.filter(obj => !!obj?.pinnedTo);
    },

    _getMainJointContourEnabled(obj, mode = null) {
        const resolvedMode = mode || this._getMainJointContourMode(obj);
        if (resolvedMode === 'pin') {
            const target = this._getMainJointContourTargets('pin')[0] || obj;
            return !!target?.pinContour;
        }
        return !!obj?.jointContours;
    },

    _updateMainJointContourControls(obj) {
        const mode = this._getMainJointContourMode(obj);
        const contourTarget = mode === 'pin' ? (this._getMainJointContourTargets('pin')[0] || obj) : obj;
        const enabled = this._getMainJointContourEnabled(contourTarget, mode);
        const label = document.getElementById('joint-contours-label');
        if (label) label.textContent = mode === 'pin' ? 'Assembly Joint Contours' : 'Joint Contours';

        const toggle = document.getElementById('joint-contours');
        if (toggle) toggle.checked = enabled;

        const opts = document.getElementById('joint-contour-opts');
        if (opts) opts.classList.toggle('hidden', !enabled);

        const sizeSlider = document.getElementById('joint-contour-size');
        const sizeVal = document.getElementById('joint-contour-size-val');
        if (sizeSlider) sizeSlider.value = contourTarget.contourSize ?? 1;
        if (sizeVal) sizeVal.textContent = (contourTarget.contourSize ?? 1).toFixed(1);

        const rotSlider = document.getElementById('joint-contour-rotation');
        const rotVal = document.getElementById('joint-contour-rotation-val');
        if (rotSlider) rotSlider.value = contourTarget.contourRotation ?? 0;
        if (rotVal) rotVal.textContent = (contourTarget.contourRotation ?? 0) + '°';

        const fillMode = contourTarget.contourFillMode || 'auto';
        const fillModeEl = document.getElementById('joint-contour-fill-mode');
        if (fillModeEl) fillModeEl.value = fillMode;

        const colorPicker = document.getElementById('joint-contour-color');
        if (colorPicker) colorPicker.value = this._toColorInputHex(contourTarget.contourColor || contourTarget.fill || '#888888');

        const patternTypeEl = document.getElementById('joint-contour-pattern-type');
        if (patternTypeEl) patternTypeEl.value = contourTarget.contourPatternType || 'stripes';
        const patternColorEl = document.getElementById('joint-contour-pattern-color');
        if (patternColorEl) patternColorEl.value = contourTarget.contourPatternColor || '#ffffff';
        const patternScaleEl = document.getElementById('joint-contour-pattern-scale');
        if (patternScaleEl) patternScaleEl.value = contourTarget.contourPatternScale ?? 1;

        const gradStartEl = document.getElementById('joint-contour-grad-start');
        if (gradStartEl) gradStartEl.value = contourTarget.contourGradientStart || '#ffffff';
        const gradEndEl = document.getElementById('joint-contour-grad-end');
        if (gradEndEl) gradEndEl.value = contourTarget.contourGradientEnd || contourTarget.contourColor || '#888888';
        const gradAngleEl = document.getElementById('joint-contour-grad-angle');
        if (gradAngleEl) gradAngleEl.value = contourTarget.contourGradientAngle ?? 0;

        document.getElementById('joint-contour-solid-row')?.classList.toggle('hidden', !['solid', 'pattern'].includes(fillMode));
        document.getElementById('joint-contour-pattern-row')?.classList.toggle('hidden', fillMode !== 'pattern');
        document.getElementById('joint-contour-gradient-row')?.classList.toggle('hidden', !['linear-gradient', 'radial-gradient'].includes(fillMode));
        document.getElementById('joint-contour-picture-note')?.classList.toggle('hidden', fillMode !== 'picture');
    },

    // Object list panel
    bindObjectListEvents() {
        // Toggle All Visibility
        document.getElementById('btn-toggle-all-visibility')?.addEventListener('click', () => {
            if (this.objects.length === 0) return;
            const allHidden = this.objects.every(o => !o.visible);
            this.objects.forEach(o => { o.visible = allHidden; });
            this.updateObjectList();
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        // Toggle All Lock
        document.getElementById('btn-toggle-all-lock')?.addEventListener('click', () => {
            if (this.objects.length === 0) return;
            const allLocked = this.objects.every(o => o.locked);
            this.objects.forEach(o => { o.locked = !allLocked; });
            this.updateObjectList();
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        // Batch Rename
        document.getElementById('btn-batch-rename')?.addEventListener('click', () => {
            this.openBatchRenameModal();
        });

        // Object search/filter (Objects tab) — type to filter by name, type, or tag.
        const searchInput = document.getElementById('object-search');
        if (searchInput && !searchInput.dataset.wired) {
            searchInput.dataset.wired = '1';
            let _searchDebounce = null;
            const apply = () => {
                this._objectSearchQuery = (searchInput.value || '').trim().toLowerCase();
                this.updateObjectList();
            };
            // Debounce keystrokes so very fast typing on a large object list
            // doesn't rebuild the DOM on every keypress.
            searchInput.addEventListener('input', () => {
                if (_searchDebounce) clearTimeout(_searchDebounce);
                _searchDebounce = setTimeout(apply, 120);
            });
            // Esc clears the filter
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && searchInput.value) {
                    e.preventDefault();
                    e.stopPropagation();
                    searchInput.value = '';
                    if (_searchDebounce) clearTimeout(_searchDebounce);
                    apply();
                }
            });
        }
    },

    /**
     * Open the Batch Rename modal. Renames the currently selected objects
     * (or all objects if none are selected) using a pattern with placeholders:
     *   {n}    → counter starting from start value (default 1)
     *   {nn}   → zero-padded 2-digit counter
     *   {nnn}  → zero-padded 3-digit counter
     *   {type} → object type (e.g. rectangle, text)
     *   {old}  → previous name
     */
    openBatchRenameModal() {
        const targetIds = (this.selectedIds && this.selectedIds.length > 0)
            ? [...this.selectedIds]
            : this.objects.map(o => o.id);
        if (targetIds.length === 0) {
            Utils.showToast?.('No objects to rename', 'info');
            return;
        }

        // Build modal lazily so we don't bloat index.html
        let modal = document.getElementById('batch-rename-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'batch-rename-modal';
            modal.className = 'modal hidden';
            modal.setAttribute('role', 'dialog');
            modal.setAttribute('aria-modal', 'true');
            modal.setAttribute('aria-label', 'Batch Rename');
            modal.innerHTML = `
                <div class="modal-content modal-sm">
                    <div class="modal-header">
                        <h3><i class="fas fa-i-cursor"></i> Batch Rename</h3>
                        <button class="modal-close" aria-label="Close"><i class="fas fa-times"></i></button>
                    </div>
                    <div class="modal-body">
                        <p style="margin-top:0;font-size:12px;color:var(--text-secondary)">
                            Pattern placeholders: <code>{n}</code> counter, <code>{nn}</code>/<code>{nnn}</code> padded,
                            <code>{type}</code> object type, <code>{old}</code> previous name.
                        </p>
                        <div class="form-row" style="display:flex;gap:8px;margin-bottom:10px">
                            <label style="flex:1">
                                <span style="display:block;font-size:11px;color:var(--text-secondary);margin-bottom:4px">Pattern</span>
                                <input type="text" id="batch-rename-pattern" value="Item {n}" style="width:100%">
                            </label>
                            <label style="width:90px">
                                <span style="display:block;font-size:11px;color:var(--text-secondary);margin-bottom:4px">Start at</span>
                                <input type="number" id="batch-rename-start" value="1" min="0" style="width:100%">
                            </label>
                        </div>
                        <div id="batch-rename-preview" style="font-family:var(--font-mono);font-size:11px;line-height:1.6;max-height:160px;overflow:auto;padding:8px;background:rgba(255,255,255,0.04);border:1px solid var(--border-color);border-radius:6px"></div>
                        <div class="modal-actions" style="margin-top:12px;display:flex;gap:8px;justify-content:flex-end">
                            <button class="btn-ghost" data-batch-rename-cancel>Cancel</button>
                            <button class="btn-primary" data-batch-rename-apply><i class="fas fa-check"></i> Rename</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.add('hidden'));
            modal.querySelector('[data-batch-rename-cancel]').addEventListener('click', () => modal.classList.add('hidden'));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.classList.add('hidden');
            });
        }

        const patternEl = modal.querySelector('#batch-rename-pattern');
        const startEl = modal.querySelector('#batch-rename-start');
        const previewEl = modal.querySelector('#batch-rename-preview');

        const renderPreview = () => {
            const pattern = patternEl.value || '';
            const start = parseInt(startEl.value, 10) || 0;
            const objs = targetIds.map(id => this.objects.find(o => o.id === id)).filter(Boolean);
            const lines = objs.slice(0, 50).map((obj, i) => {
                const newName = this._applyRenamePattern(pattern, obj, i, start);
                const oldName = obj.name || obj.id;
                return `<div><span style="color:var(--text-secondary)">${this._escapeHtml(oldName)}</span> → <strong>${this._escapeHtml(newName)}</strong></div>`;
            });
            if (objs.length > 50) lines.push(`<div style="color:var(--text-secondary);margin-top:6px">…and ${objs.length - 50} more</div>`);
            previewEl.innerHTML = lines.join('') || '<em style="color:var(--text-secondary)">No objects</em>';
        };

        patternEl.oninput = renderPreview;
        startEl.oninput = renderPreview;
        renderPreview();

        const applyBtn = modal.querySelector('[data-batch-rename-apply]');
        applyBtn.onclick = () => {
            const pattern = patternEl.value || '';
            const start = parseInt(startEl.value, 10) || 0;
            const objs = targetIds.map(id => this.objects.find(o => o.id === id)).filter(Boolean);
            objs.forEach((obj, i) => {
                obj.name = this._applyRenamePattern(pattern, obj, i, start);
            });
            this.updateObjectList();
            this.updateProperties();
            eventBus.emit('history:push');
            Utils.showToast?.(`Renamed ${objs.length} object${objs.length === 1 ? '' : 's'}`, 'success');
            modal.classList.add('hidden');
        };

        modal.classList.remove('hidden');
        setTimeout(() => patternEl.focus(), 30);
    },

    _applyRenamePattern(pattern, obj, index, start) {
        const counter = (start | 0) + index;
        return String(pattern)
            .replace(/\{nnn\}/g, String(counter).padStart(3, '0'))
            .replace(/\{nn\}/g, String(counter).padStart(2, '0'))
            .replace(/\{n\}/g, String(counter))
            .replace(/\{type\}/g, obj.type || '')
            .replace(/\{old\}/g, obj.name || obj.id || '');
    },

    _escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    },

    /** Update the toggle-all toolbar button states based on current objects */
    _updateObjectListToolbar() {
        const visBtn = document.getElementById('btn-toggle-all-visibility');
        const lockBtn = document.getElementById('btn-toggle-all-lock');
        if (!visBtn || !lockBtn) return;

        const allHidden = this.objects.length > 0 && this.objects.every(o => !o.visible);
        const allLocked = this.objects.length > 0 && this.objects.every(o => o.locked);

        visBtn.querySelector('i').className = allHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
        visBtn.querySelector('span').textContent = allHidden ? 'Show All' : 'Hide All';
        lockBtn.querySelector('i').className = allLocked ? 'fas fa-lock' : 'fas fa-unlock';
        lockBtn.querySelector('span').textContent = allLocked ? 'Unlock All' : 'Lock All';
    },

    updateObjectList() {
        if (this._isRenaming) return; // Don't rebuild during rename

        const listEl = document.getElementById('object-list');
        const layerListEl = document.getElementById('layer-list');
        if (!listEl) return;

        if (this.objects.length === 0 && this.layers.length <= 1) {
            const emptyHtml = `
                <div class="empty-state">
                    <i class="fas fa-shapes"></i>
                    <p>No objects on stage</p>
                    <small>Use tools to add shapes, text, or images</small>
                </div>`;
            listEl.innerHTML = emptyHtml;
        }

        // Initialize collapsed groups set
        if (!this._collapsedGroups) this._collapsedGroups = new Set();

        // Object search filter (Objects tab only). Matches name, type, or tags.
        const q = (this._objectSearchQuery || '').toLowerCase();
        const matchesQuery = (obj) => {
            if (!q) return true;
            const name = (obj.name || '').toLowerCase();
            const type = (obj.type || '').toLowerCase();
            const tags = Array.isArray(obj.tags) ? obj.tags.join(' ').toLowerCase() : '';
            return name.includes(q) || type.includes(q) || tags.includes(q);
        };

        // === Objects Tab: flat list with groups ===
        const reversedObjs = [...this.objects].reverse();
        const renderedGroupIds = new Set();
        let html = '';

        if (this.objects.length === 0) {
            html = `<div class="empty-state">
                <i class="fas fa-shapes"></i>
                <p>No objects on stage</p>
                <small>Use tools to add shapes, text, or images</small>
            </div>`;
        } else {
            let visibleCount = 0;
            for (const obj of reversedObjs) {
                if (obj.groupId && this.groups[obj.groupId]) {
                    if (renderedGroupIds.has(obj.groupId)) continue;
                    renderedGroupIds.add(obj.groupId);
                    const groupId = obj.groupId;
                    const memberIds = this.groups[groupId];
                    const members = memberIds.map(id => this.getObjectById(id)).filter(Boolean);
                    const groupName = this.groupNames[groupId] || 'Group';
                    // Filter: include group if name matches or any member matches.
                    if (q) {
                        const groupNameMatches = groupName.toLowerCase().includes(q);
                        const matchingMembers = members.filter(matchesQuery);
                        if (!groupNameMatches && matchingMembers.length === 0) continue;
                    }
                    const visibleMembers = q
                        ? (groupName.toLowerCase().includes(q) ? members : members.filter(matchesQuery))
                        : members;
                    // While searching, force-expand groups that have matches so the user can see them.
                    const isCollapsed = q ? false : this._collapsedGroups.has(groupId);
                    const allSelected = visibleMembers.length > 0 && visibleMembers.every(m => this.selectedIds.includes(m.id));
                    const anySelected = visibleMembers.some(m => this.selectedIds.includes(m.id));
                    html += `<div class="layer-group${allSelected ? ' group-selected' : (anySelected ? ' group-partial' : '')}" data-group-id="${groupId}" draggable="true">
                        <div class="layer-group-header" data-group-id="${groupId}">
                            <button class="layer-group-toggle" data-group-id="${groupId}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                                <i class="fas fa-chevron-${isCollapsed ? 'right' : 'down'}"></i>
                            </button>
                            <i class="fas fa-object-group" style="font-size:10px;color:var(--accent-primary)"></i>
                            <span class="obj-name group-name" data-group-id="${groupId}">${Utils.escapeHtml(groupName)}</span>
                            <span class="layer-actions">
                                <button class="layer-group-vis-btn" data-group-id="${groupId}" title="Toggle group visibility"><i class="fas fa-eye"></i></button>
                                <button class="layer-group-lock-btn" data-group-id="${groupId}" title="Toggle group lock"><i class="fas fa-unlock"></i></button>
                            </span>
                        </div>
                        <div class="layer-group-children${isCollapsed ? ' collapsed' : ''}" data-group-id="${groupId}">`;
                    for (const m of visibleMembers) {
                        html += this._renderObjectItem(m);
                        visibleCount++;
                    }
                    html += `</div></div>`;
                } else {
                    if (!matchesQuery(obj)) continue;
                    html += this._renderObjectItem(obj);
                    visibleCount++;
                }
            }
            // Empty-state hint when filter excludes everything
            if (q && visibleCount === 0) {
                html = `<div class="empty-state">
                    <i class="fas fa-search"></i>
                    <p>No objects match "${Utils.escapeHtml(q)}"</p>
                    <small>Press Esc to clear filter</small>
                </div>`;
            }
        }

        listEl.innerHTML = this._renderAudioPseudoItem() + html;
        this._bindLayerListEvents(listEl);
        this._bindAudioPseudoRow(listEl);

        // === Layers Tab: objects grouped by layer ===
        if (layerListEl) {
            let layerHtml = '';
            // Migrate objects with old/missing layer ids to default layer
            const layerIds = new Set(this.layers.map(l => l.id));
            this.objects.forEach(o => {
                if (!o.layer || !layerIds.has(o.layer)) o.layer = this.layers[0].id;
            });
            // Render layers in order (topmost layer first)
            const reversedLayers = [...this.layers].reverse();
            for (const layer of reversedLayers) {
                const isActive = layer.id === this.activeLayerId;
                const isCollapsed = this._collapsedLayers.has(layer.id);
                const layerObjs = this.objects.filter(o => o.layer === layer.id).reverse();
                layerHtml += `<div class="layer-container${isActive ? ' active-layer' : ''}${!layer.visible ? ' layer-hidden' : ''}${layer.locked ? ' layer-locked' : ''}" data-layer-id="${layer.id}">
                    <div class="layer-header" data-layer-id="${layer.id}">
                        <button class="layer-collapse-btn" data-layer-id="${layer.id}" title="${isCollapsed ? 'Expand' : 'Collapse'}">
                            <i class="fas fa-chevron-${isCollapsed ? 'right' : 'down'}"></i>
                        </button>
                        <i class="fas fa-layer-group" style="font-size:10px;color:${isActive ? 'var(--accent-primary)' : 'var(--text-muted)'}"></i>
                        <span class="layer-name-label" data-layer-id="${layer.id}">${Utils.escapeHtml(layer.name)}</span>
                        <span class="layer-obj-count">${layerObjs.length}</span>
                        <span class="layer-actions">
                            <button class="layer-vis-toggle" data-layer-id="${layer.id}" title="${layer.visible ? 'Hide layer' : 'Show layer'}"><i class="fas ${layer.visible ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
                            <button class="layer-lock-toggle" data-layer-id="${layer.id}" title="${layer.locked ? 'Unlock layer' : 'Lock layer'}"><i class="fas ${layer.locked ? 'fa-lock' : 'fa-unlock'}"></i></button>
                        </span>
                    </div>
                    <div class="layer-children${isCollapsed ? ' collapsed' : ''}" data-layer-id="${layer.id}">`;
                if (layerObjs.length === 0) {
                    layerHtml += `<div class="layer-empty-hint">No objects</div>`;
                } else {
                    for (const obj of layerObjs) {
                        layerHtml += this._renderObjectItem(obj, true);
                    }
                }
                layerHtml += `</div></div>`;
            }
            layerListEl.innerHTML = this._renderAudioPseudoItem() + layerHtml;
            this._bindLayerTabEvents(layerListEl);
            this._bindAudioPseudoRow(layerListEl);
        }

        this._updateObjectListToolbar();
    },

    _renderAudioPseudoItem() {
        const audio = window.app?.audioTimeline;
        if (!audio || !audio.isLoaded) return '';
        const trackCount = Math.max(1, audio.getTracks?.().length || 1);
        const fileName = Utils.escapeHtml(audio.fileName || 'Soundtrack');
        const duration = typeof audio.getDurationMs === 'function' ? audio.getDurationMs() : (audio.durationMs || 0);
        const meta = `${duration > 0 ? Utils.formatTime(duration) : 'Audio'} | ${trackCount} track${trackCount === 1 ? '' : 's'}`;
        const muted = audio.isMuted?.() || false;
        return `<div class="audio-list-item${muted ? ' muted' : ''}" data-role="audio-pseudo" title="Open the selected audio clip editor">
            <span class="audio-list-icon"><i class="fas fa-music"></i></span>
            <span class="audio-list-text">
                <span class="audio-list-name">${fileName}</span>
                <span class="audio-list-meta">${meta}</span>
            </span>
            <span class="audio-list-actions">
                <button class="audio-list-mute" title="${muted ? 'Unmute audio' : 'Mute audio'}"><i class="fas ${muted ? 'fa-volume-mute' : 'fa-volume-up'}"></i></button>
                <button class="audio-list-replace" title="Replace audio file"><i class="fas fa-upload"></i></button>
                <button class="audio-list-remove" title="Remove audio"><i class="fas fa-times"></i></button>
            </span>
        </div>`;
    },

    _bindAudioPseudoRow(container) {
        const row = container.querySelector('.audio-list-item[data-role="audio-pseudo"]');
        if (!row) return;
        const audio = window.app?.audioTimeline;
        if (!audio) return;

        row.addEventListener('click', (e) => {
            if (e.target.closest('button')) return;
            audio.openClipEditor?.();
        });

        row.querySelector('.audio-list-mute')?.addEventListener('click', (e) => {
            e.stopPropagation();
            audio.toggleMuted?.();
        });

        row.querySelector('.audio-list-replace')?.addEventListener('click', (e) => {
            e.stopPropagation();
            audio.requestFileUpload?.({ replace: true });
        });

        row.querySelector('.audio-list-remove')?.addEventListener('click', (e) => {
            e.stopPropagation();
            audio.removeAudio?.({ pushHistory: true });
        });
    },

    _renderObjectItem(obj, isLayerChild = false) {
        const cls = isLayerChild ? 'layer-item layer-child-item' : 'layer-item';
        return `<div class="${cls} ${this.selectedIds.includes(obj.id) ? 'selected' : ''} ${!obj.visible ? 'hidden-eye' : ''} ${obj.locked ? 'locked' : ''}" data-id="${obj.id}" draggable="true">
            <span class="layer-drag-handle"><i class="fas fa-grip-vertical"></i></span>
            <span class="layer-color-dot" style="background:${obj.fill}"></span>
            <span class="obj-name" data-id="${obj.id}">${Utils.escapeHtml(obj.name)}</span>
            ${obj.animations?.length ? '<i class="fas fa-magic" style="font-size:9px;color:#22c55e" title="Has animations"></i>' : ''}
            <span class="layer-actions">
                <span class="layer-zorder-btns">
                    <button class="layer-zorder-btn z-up" data-id="${obj.id}" title="Bring Forward"><i class="fas fa-chevron-up"></i></button>
                    <button class="layer-zorder-btn z-down" data-id="${obj.id}" title="Send Backward"><i class="fas fa-chevron-down"></i></button>
                </span>
                <button class="layer-vis-btn" title="${obj.visible ? 'Hide' : 'Show'}"><i class="fas ${obj.visible ? 'fa-eye' : 'fa-eye-slash'}"></i></button>
                <button class="layer-lock-btn" title="${obj.locked ? 'Unlock' : 'Lock'}"><i class="fas ${obj.locked ? 'fa-lock' : 'fa-unlock'}"></i></button>
            </span>
        </div>`;
    },

    /**
     * Centralized handler after any object rename.
     * Refreshes object list, timeline, properties panel, and stage.
     */
    _afterRename() {
        this._isRenaming = false;
        this.updateObjectList();
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
    },

    _bindLayerTabEvents(container) {
        // Layer header click — set active layer
        container.querySelectorAll('.layer-header').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.layer-collapse-btn') || e.target.closest('.layer-vis-toggle') || e.target.closest('.layer-lock-toggle')) return;
                this.activeLayerId = el.dataset.layerId;
                this.updateObjectList();
            });
        });

        // Layer collapse toggle
        container.querySelectorAll('.layer-collapse-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lid = btn.dataset.layerId;
                if (this._collapsedLayers.has(lid)) this._collapsedLayers.delete(lid);
                else this._collapsedLayers.add(lid);
                this.updateObjectList();
            });
        });

        // Layer visibility toggle
        container.querySelectorAll('.layer-vis-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lid = btn.dataset.layerId;
                const layer = this.layers.find(l => l.id === lid);
                if (layer) {
                    layer.visible = !layer.visible;
                    this.updateObjectList();
                    this.stage.requestRender();
                    eventBus.emit('history:push');
                }
            });
        });

        // Layer lock toggle
        container.querySelectorAll('.layer-lock-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const lid = btn.dataset.layerId;
                const layer = this.layers.find(l => l.id === lid);
                if (layer) {
                    layer.locked = !layer.locked;
                    this.updateObjectList();
                    this.stage.requestRender();
                    eventBus.emit('history:push');
                }
            });
        });

        // Double-click layer name to rename
        container.querySelectorAll('.layer-name-label').forEach(nameSpan => {
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const lid = nameSpan.dataset.layerId;
                const layer = this.layers.find(l => l.id === lid);
                if (!layer) return;
                const currentName = layer.name;
                this._isRenaming = true;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();
                const commit = () => {
                    this._isRenaming = false;
                    layer.name = input.value.trim() || currentName;
                    this.updateObjectList();
                    eventBus.emit('history:push');
                };
                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
                input.addEventListener('mousedown', (ce) => ce.stopPropagation());
            });
        });

        // Object items inside layers — selection, visibility, lock, rename, drag
        container.querySelectorAll('.layer-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.layer-vis-btn') || e.target.closest('.layer-lock-btn')) return;
                const id = el.dataset.id;
                if (e.shiftKey) {
                    this.toggleSelection(id);
                } else {
                    this.select([id]);
                }
                // Set active layer to this object's layer
                const obj = this.getObjectById(id);
                if (obj && obj.layer) this.activeLayerId = obj.layer;
                this.updateObjectList();
            });

            el.querySelector('.obj-name[data-id]')?.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const objId = e.target.dataset.id;
                const obj = this.getObjectById(objId);
                if (!obj) return;
                const currentName = obj.name;
                this._isRenaming = true;
                const nameSpan = e.target;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();
                const commit = () => {
                    if (commit._done) return;
                    commit._done = true;
                    obj.name = input.value.trim() || currentName;
                    this._afterRename();
                };
                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
                input.addEventListener('mousedown', (ce) => ce.stopPropagation());
            });

            el.querySelector('.layer-vis-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const obj = this.objects.find(o => o.id === el.dataset.id);
                if (obj) { obj.visible = !obj.visible; this.updateObjectList(); this.stage.requestRender(); }
            });

            el.querySelector('.layer-lock-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const obj = this.objects.find(o => o.id === el.dataset.id);
                if (obj) { obj.locked = !obj.locked; this.updateObjectList(); this.stage.requestRender(); }
            });

            // Drag to move between layers
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', el.dataset.id);
                el.classList.add('dragging');
            });
            el.addEventListener('dragend', () => el.classList.remove('dragging'));
        });

        // Layer containers accept drops for moving objects between layers
        container.querySelectorAll('.layer-container').forEach(lc => {
            lc.addEventListener('dragover', (e) => {
                e.preventDefault();
                lc.classList.add('drag-over');
            });
            lc.addEventListener('dragleave', () => lc.classList.remove('drag-over'));
            lc.addEventListener('drop', (e) => {
                e.preventDefault();
                lc.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetLayerId = lc.dataset.layerId;
                const obj = this.getObjectById(draggedId);
                if (obj && targetLayerId && obj.layer !== targetLayerId) {
                    obj.layer = targetLayerId;
                    this.updateObjectList();
                    this.stage.requestRender();
                    eventBus.emit('history:push');
                }
            });
        });

        // Z-order up/down buttons
        this._bindZOrderButtons(container);
    },

    _bindLayerListEvents(container) {
        // --- Bind group header events ---
        // Toggle group collapse
        container.querySelectorAll('.layer-group-toggle').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gid = btn.dataset.groupId;
                if (this._collapsedGroups.has(gid)) this._collapsedGroups.delete(gid);
                else this._collapsedGroups.add(gid);
                this.updateObjectList();
            });
        });

        // Click group header to select all group members
        container.querySelectorAll('.layer-group-header').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.layer-group-toggle') || e.target.closest('.layer-group-vis-btn') || e.target.closest('.layer-group-lock-btn')) return;
                const gid = el.dataset.groupId;
                const memberIds = this.groups[gid];
                if (memberIds) this.select(memberIds);
            });
        });

        // Double-click group name to rename group
        container.querySelectorAll('.group-name').forEach(nameSpan => {
            nameSpan.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const gid = nameSpan.dataset.groupId;
                const currentName = this.groupNames[gid] || 'Group';
                this._isRenaming = true;

                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();

                const commit = () => {
                    this._isRenaming = false;
                    const newName = input.value.trim() || currentName;
                    this.groupNames[gid] = newName;
                    this.updateObjectList();
                    eventBus.emit('timeline:update');
                    eventBus.emit('history:push');
                };

                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
                input.addEventListener('mousedown', (ce) => ce.stopPropagation());
            });
        });

        // Group visibility toggle
        container.querySelectorAll('.layer-group-vis-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gid = btn.dataset.groupId;
                const memberIds = this.groups[gid];
                if (!memberIds) return;
                const members = memberIds.map(id => this.getObjectById(id)).filter(Boolean);
                const allVisible = members.every(m => m.visible);
                members.forEach(m => m.visible = !allVisible);
                this.updateObjectList();
                this.stage.requestRender();
            });
        });

        // Group lock toggle
        container.querySelectorAll('.layer-group-lock-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const gid = btn.dataset.groupId;
                const memberIds = this.groups[gid];
                if (!memberIds) return;
                const members = memberIds.map(id => this.getObjectById(id)).filter(Boolean);
                const allLocked = members.every(m => m.locked);
                members.forEach(m => m.locked = !allLocked);
                this.updateObjectList();
                this.stage.requestRender();
            });
        });

        // Group drag-to-reorder
        container.querySelectorAll('.layer-group[data-group-id]').forEach(groupEl => {
            groupEl.addEventListener('dragstart', (e) => {
                // Only start group drag from the header area, not child items
                if (e.target !== groupEl) return;
                e.dataTransfer.setData('application/group-id', groupEl.dataset.groupId);
                e.dataTransfer.effectAllowed = 'move';
                groupEl.classList.add('dragging');
            });
            groupEl.addEventListener('dragend', () => groupEl.classList.remove('dragging'));
            groupEl.addEventListener('dragover', (e) => {
                // Accept group or ungrouped item drops
                if (e.dataTransfer.types.includes('application/group-id') || e.dataTransfer.types.includes('text/plain')) {
                    e.preventDefault();
                    e.stopPropagation();
                    groupEl.classList.add('drag-over');
                }
            });
            groupEl.addEventListener('dragleave', (e) => {
                // Only remove highlight when truly leaving the group element
                if (!groupEl.contains(e.relatedTarget)) {
                    groupEl.classList.remove('drag-over');
                }
            });
            groupEl.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                groupEl.classList.remove('drag-over');
                const draggedGroupId = e.dataTransfer.getData('application/group-id');
                const targetGroupId = groupEl.dataset.groupId;
                if (!draggedGroupId || draggedGroupId === targetGroupId) return;

                // Move all members of dragged group next to the target group in the objects array
                const draggedMemberIds = this.groups[draggedGroupId];
                const targetMemberIds = this.groups[targetGroupId];
                if (!draggedMemberIds || !targetMemberIds) return;

                // Remove dragged members from array
                const draggedMembers = [];
                for (let i = this.objects.length - 1; i >= 0; i--) {
                    if (draggedMemberIds.includes(this.objects[i].id)) {
                        draggedMembers.unshift(this.objects.splice(i, 1)[0]);
                    }
                }

                // Find the first target member's index and insert before it
                const targetIdx = this.objects.findIndex(o => targetMemberIds.includes(o.id));
                if (targetIdx < 0) {
                    // Fallback: push to end
                    this.objects.push(...draggedMembers);
                } else {
                    this.objects.splice(targetIdx, 0, ...draggedMembers);
                }

                this.updateObjectList();
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        // --- Bind individual item events ---
        container.querySelectorAll('.layer-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.layer-vis-btn') || e.target.closest('.layer-lock-btn')) return;
                const id = el.dataset.id;
                if (e.shiftKey) {
                    this.toggleSelection(id);
                } else {
                    this.select([id]);
                }
            });

            // Double-click object name to rename
            el.querySelector('.obj-name[data-id]')?.addEventListener('dblclick', (e) => {
                e.stopPropagation();
                const objId = e.target.dataset.id;
                const obj = this.getObjectById(objId);
                if (!obj) return;
                const currentName = obj.name;
                this._isRenaming = true;

                const nameSpan = e.target;
                const input = document.createElement('input');
                input.type = 'text';
                input.value = currentName;
                input.className = 'tl-rename-input';
                nameSpan.textContent = '';
                nameSpan.appendChild(input);
                input.focus();
                input.select();

                const commit = () => {
                    if (commit._done) return;
                    commit._done = true;
                    obj.name = input.value.trim() || currentName;
                    this._afterRename();
                };

                input.addEventListener('blur', commit);
                input.addEventListener('keydown', (ke) => {
                    if (ke.key === 'Enter') { ke.preventDefault(); input.blur(); }
                    if (ke.key === 'Escape') { input.value = currentName; input.blur(); }
                });
                input.addEventListener('click', (ce) => ce.stopPropagation());
                input.addEventListener('mousedown', (ce) => ce.stopPropagation());
            });

            // Visibility toggle
            el.querySelector('.layer-vis-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const obj = this.objects.find(o => o.id === el.dataset.id);
                if (obj) { obj.visible = !obj.visible; this.updateObjectList(); this.stage.requestRender(); }
            });

            // Lock toggle
            el.querySelector('.layer-lock-btn')?.addEventListener('click', (e) => {
                e.stopPropagation();
                const obj = this.objects.find(o => o.id === el.dataset.id);
                if (obj) { obj.locked = !obj.locked; this.updateObjectList(); this.stage.requestRender(); }
            });

            // Drag-to-reorder
            el.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                e.dataTransfer.setData('text/plain', el.dataset.id);
                el.classList.add('dragging');
            });
            el.addEventListener('dragend', () => el.classList.remove('dragging'));
            el.addEventListener('dragover', (e) => {
                e.preventDefault();
                el.classList.add('drag-over');
            });
            el.addEventListener('dragleave', () => el.classList.remove('drag-over'));
            el.addEventListener('drop', (e) => {
                e.preventDefault();
                el.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                const targetId = el.dataset.id;
                if (draggedId === targetId) return;
                const fromIdx = this.objects.findIndex(o => o.id === draggedId);
                const toIdx = this.objects.findIndex(o => o.id === targetId);
                if (fromIdx < 0 || toIdx < 0) return;
                const [moved] = this.objects.splice(fromIdx, 1);
                this.objects.splice(toIdx, 0, moved);
                this.updateObjectList();
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        // Z-order up/down buttons
        this._bindZOrderButtons(container);
    },

    _bindZOrderButtons(container) {
        // Up = bring forward (higher z-index = later in array)
        // The UI list is reversed, so "up" in UI = bring forward = move later in objects array
        container.querySelectorAll('.layer-zorder-btn.z-up').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const obj = this.objects.find(o => o.id === id);
                if (!obj) return;
                this.bringForward(obj);
            });
        });
        // Down = send backward (lower z-index = earlier in array)
        container.querySelectorAll('.layer-zorder-btn.z-down').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const obj = this.objects.find(o => o.id === id);
                if (!obj) return;
                this.sendBackward(obj);
            });
        });
    },

    /**
     * Resolve pin-to-object relationships: update pinned objects' positions
     * so they follow their parent objects.
     */

});
