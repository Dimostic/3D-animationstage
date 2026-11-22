/**
 * Object Manager — Property panel bindings, rotation & size
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {

    bindPropertyEvents() {
        // Transform
        ['prop-x', 'prop-y', 'prop-width', 'prop-height', 'prop-rotation', 'prop-depth'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', (e) => {
                this.applyPropertyChange(id.replace('prop-', ''), parseFloat(e.target.value));
            });
        });
        this._bindAdvancedPartPropertyEvents?.();
        this._bindSvgAvatarPropertyEvents?.();
        this._bindSvgAfricanLiveAdjustmentEvents?.();
        document.getElementById('btn-lock-aspect')?.addEventListener('click', () => {
            this.toggleSelectedAspectLock();
        });
        document.getElementById('btn-toggle-depth-handle')?.addEventListener('click', () => {
            this.toggleSelectedDepthHandle();
        });
        document.getElementById('prop-depth-side-mode')?.addEventListener('change', (e) => {
            this.applyPropertyChange('depthSideMode', e.target.value === 'color' ? 'color' : 'auto');
            this.updateProperties?.();
        });
        document.getElementById('prop-depth-side-color')?.addEventListener('input', (e) => {
            const mode = document.getElementById('prop-depth-side-mode');
            if (mode) mode.value = 'color';
            this.getSelectedObjects().forEach(obj => {
                obj.depthSideMode = 'color';
            });
            this.applyPropertyChange('depthSideColor', e.target.value);
        });
        document.getElementById('prop-depth-lighting')?.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
            const label = document.getElementById('prop-depth-lighting-val');
            if (label) label.textContent = `${Math.round(value)}%`;
            this.applyPropertyChange('depthLighting', value);
        });
        document.getElementById('prop-depth-perspective')?.addEventListener('input', (e) => {
            const value = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
            const label = document.getElementById('prop-depth-perspective-val');
            if (label) label.textContent = `${Math.round(value)}%`;
            this.applyPropertyChange('depthPerspective', value);
        });
        document.getElementById('btn-reset-z-rotation')?.addEventListener('click', () => {
            this.resetSelectedRotationBaseline();
        });
        document.getElementById('btn-align-down-zero')?.addEventListener('click', () => {
            this.alignSelectedDownAndResetBaseline();
        });
        document.getElementById('prop-tilt-x')?.addEventListener('input', (e) => {
            if (this._isRecording && !this._tiltXRecordPending) {
                this._snapshotForRecording(true);
                this._tiltXRecordPending = true;
            }
            const value = parseFloat(e.target.value) || 0;
            const label = document.getElementById('prop-tilt-x-val');
            if (label) label.textContent = `${Math.round(value)}°`;
            this.getSelectedObjects().forEach(obj => {
                if (StageObject.supportsTiltType(obj.type)) this._setObjectTiltDriverValue(obj, 'tiltX', value);
            });
            this.stage.requestRender();
            eventBus.emit('object:updated', this.getSelectedObjects()[0]);
        });
        document.getElementById('prop-tilt-x')?.addEventListener('change', () => {
            if (this._tiltXRecordPending) {
                this._tiltXRecordPending = false;
                this._showRecordingConfirm();
            }
            eventBus.emit('history:push');
        });
        document.getElementById('prop-tilt-y')?.addEventListener('input', (e) => {
            if (this._isRecording && !this._tiltYRecordPending) {
                this._snapshotForRecording(true);
                this._tiltYRecordPending = true;
            }
            const value = parseFloat(e.target.value) || 0;
            const label = document.getElementById('prop-tilt-y-val');
            if (label) label.textContent = `${Math.round(value)}°`;
            this.getSelectedObjects().forEach(obj => {
                if (StageObject.supportsTiltType(obj.type)) this._setObjectTiltDriverValue(obj, 'tiltY', value);
            });
            this.stage.requestRender();
            eventBus.emit('object:updated', this.getSelectedObjects()[0]);
        });
        document.getElementById('prop-tilt-y')?.addEventListener('change', () => {
            if (this._tiltYRecordPending) {
                this._tiltYRecordPending = false;
                this._showRecordingConfirm();
            }
            eventBus.emit('history:push');
        });
        document.getElementById('btn-reset-tilt-x')?.addEventListener('click', () => {
            const slider = document.getElementById('prop-tilt-x');
            if (!slider) return;
            slider.value = 0;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            eventBus.emit('history:push');
        });
        document.getElementById('btn-reset-tilt-y')?.addEventListener('click', () => {
            const slider = document.getElementById('prop-tilt-y');
            if (!slider) return;
            slider.value = 0;
            slider.dispatchEvent(new Event('input', { bubbles: true }));
            eventBus.emit('history:push');
        });

        // Opacity
        // Opacity slider: use mousedown/mouseup to bracket recording for continuous input
        const opacitySlider = document.getElementById('prop-opacity');
        opacitySlider?.addEventListener('mousedown', () => {
            if (this._isRecording) {
                this._snapshotForRecording(true);
                this._opacityRecordPending = true;
            }
        });
        opacitySlider?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            document.getElementById('prop-opacity-val').textContent = val + '%';
            // Apply without triggering recording (handled by mousedown/mouseup bracket)
            this.getSelectedObjects().forEach(obj => { obj.opacity = val / 100; });
            this.stage.requestRender();
            eventBus.emit('object:updated', this.getSelectedObjects()[0]);
        });
        opacitySlider?.addEventListener('mouseup', () => {
            if (this._opacityRecordPending) {
                this._opacityRecordPending = false;
                this._showRecordingConfirm();
            }
            if (this._propRecording) this._capturePropStep();
        });
        opacitySlider?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });

        // Blend mode (canvas globalCompositeOperation)
        document.getElementById('prop-blend-mode')?.addEventListener('change', (e) => {
            const mode = e.target.value || 'normal';
            this.getSelectedObjects().forEach(obj => { obj.blendMode = mode; });
            this.stage.requestRender();
            eventBus.emit('object:updated', this.getSelectedObjects()[0]);
            eventBus.emit('history:push');
        });

        // Fill type and gradient/pattern
        document.getElementById('prop-fill-type')?.addEventListener('change', (e) => {
            const ft = e.target.value;
            if (ft === 'none') {
                this.getSelectedObjects().forEach(obj => {
                    obj.fillType = 'none';
                    obj._savedFill = obj.fill;
                    obj.fill = 'transparent';
                });
            } else {
                this.getSelectedObjects().forEach(obj => {
                    obj.fillType = ft;
                    if (obj.fill === 'transparent' && obj._savedFill) {
                        obj.fill = obj._savedFill;
                    }
                });
            }
            const isNone = ft === 'none';
            document.getElementById('fill-color-field')?.classList.toggle('hidden', isNone || ft === 'picture');
            document.getElementById('gradient-controls')?.classList.toggle('hidden', isNone || !['linear-gradient','radial-gradient'].includes(ft));
            document.getElementById('pattern-controls')?.classList.toggle('hidden', isNone || ft !== 'pattern');
            document.getElementById('picture-fill-controls')?.classList.toggle('hidden', isNone || ft !== 'picture');
            if (ft === 'picture') this._refreshPictureFillSources();
            this.stage.requestRender();
            eventBus.emit('object:updated', this.getSelectedObjects()[0]);
            eventBus.emit('history:push');
        });

        // Appearance - fill color
        document.getElementById('prop-fill')?.addEventListener('input', (e) => {
            this.applyPropertyChange('fill', e.target.value);
        });

        // Gradient controls
        document.getElementById('prop-grad-start')?.addEventListener('input', (e) => {
            this.getSelectedObjects().forEach(obj => {
                if (obj.gradientStops && obj.gradientStops.length >= 2) obj.gradientStops[0].color = e.target.value;
            });
            this.stage.requestRender();
        });
        document.getElementById('prop-grad-start')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('prop-grad-end')?.addEventListener('input', (e) => {
            this.getSelectedObjects().forEach(obj => {
                if (obj.gradientStops && obj.gradientStops.length >= 2) obj.gradientStops[obj.gradientStops.length - 1].color = e.target.value;
            });
            this.stage.requestRender();
        });
        document.getElementById('prop-grad-end')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('prop-grad-angle')?.addEventListener('input', (e) => {
            const v = parseInt(e.target.value);
            document.getElementById('prop-grad-angle-val').textContent = v + '°';
            this.getSelectedObjects().forEach(obj => { obj.gradientAngle = v; });
            this.stage.requestRender();
        });
        document.getElementById('prop-grad-angle')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });

        // Pattern controls
        document.getElementById('prop-pattern-type')?.addEventListener('change', (e) => {
            this.applyPropertyChange('patternType', e.target.value);
        });
        document.getElementById('prop-pattern-color')?.addEventListener('input', (e) => {
            this.applyPropertyChange('patternColor', e.target.value);
        });
        document.getElementById('prop-pattern-scale')?.addEventListener('input', (e) => {
            this.applyPropertyChange('patternScale', parseFloat(e.target.value));
        });

        // Picture fill controls
        document.getElementById('prop-picture-stage-source')?.addEventListener('focus', () => {
            this._refreshPictureFillSources();
        });
        document.getElementById('prop-picture-asset-source')?.addEventListener('focus', () => {
            this._refreshPictureFillSources();
        });
        document.getElementById('btn-picture-fill-stage')?.addEventListener('click', () => {
            const id = document.getElementById('prop-picture-stage-source')?.value;
            const source = id ? this.objects.find(obj => obj.id === id) : null;
            const imageSrc = source?._eraserCanvas?.toDataURL?.('image/png') || source?.imageSrc;
            if (!imageSrc) {
                Utils.showToast('Choose an image from the stage first.', 'warning');
                return;
            }
            this._applyPictureFillSource(imageSrc, source.name || 'Stage image');
        });
        document.getElementById('btn-picture-fill-asset')?.addEventListener('click', () => {
            const key = document.getElementById('prop-picture-asset-source')?.value;
            const source = key ? this._pictureFillAssetSources?.get(key) : null;
            if (!source?.src) {
                Utils.showToast('Choose an image from the loaded Assets library first.', 'warning');
                return;
            }
            this._applyPictureFillSource(source.src, source.name || 'Asset image');
        });
        document.getElementById('btn-picture-fill-file')?.addEventListener('click', () => {
            document.getElementById('prop-picture-fill-file')?.click();
        });
        document.getElementById('prop-picture-fill-file')?.addEventListener('change', (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            if (!String(file.type || '').startsWith('image/')) {
                Utils.showToast('Choose a valid image file.', 'warning');
                e.target.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = () => {
                this._applyPictureFillSource(String(reader.result || ''), file.name || 'Uploaded image');
                e.target.value = '';
            };
            reader.onerror = () => {
                Utils.showToast('Could not read that image file.', 'error');
                e.target.value = '';
            };
            reader.readAsDataURL(file);
        });
        document.getElementById('btn-picture-fill-clear')?.addEventListener('click', () => {
            const targets = this._getPictureFillTargets();
            if (!targets.length) {
                Utils.showToast('Select one or more shapes first.', 'warning');
                return;
            }
            targets.forEach(obj => {
                obj.fillType = 'solid';
                obj.textureImageSrc = null;
                obj.textureImageElement = null;
                obj.pictureFillMode = 'stretch';
                obj.pictureFillRotation = 0;
            });
            const fillType = document.getElementById('prop-fill-type');
            if (fillType) fillType.value = 'solid';
            document.getElementById('picture-fill-controls')?.classList.add('hidden');
            document.getElementById('fill-color-field')?.classList.remove('hidden');
            this.stage.requestRender();
            eventBus.emit('object:updated', targets[0]);
            eventBus.emit('history:push');
            Utils.showToast('Picture fill removed.', 'success');
        });

        [
            ['btn-picture-fill-stretch', 'stretch'],
            ['btn-picture-fill-fill', 'fill'],
            ['btn-picture-fill-fit', 'fit']
        ].forEach(([id, mode]) => {
            document.getElementById(id)?.addEventListener('click', () => {
                this._setSelectedPictureFillMode(mode);
            });
        });

        document.getElementById('prop-picture-fill-rotation')?.addEventListener('input', (e) => {
            this._setSelectedPictureFillRotation(parseFloat(e.target.value), false);
        });
        document.getElementById('prop-picture-fill-rotation')?.addEventListener('change', (e) => {
            this._setSelectedPictureFillRotation(parseFloat(e.target.value), true);
        });
        document.getElementById('btn-picture-fill-rotate-left')?.addEventListener('click', () => {
            this._rotateSelectedPictureFills(-90);
        });
        document.getElementById('btn-picture-fill-rotate-right')?.addEventListener('click', () => {
            this._rotateSelectedPictureFills(90);
        });

        eventBus.on('selection:changed', () => {
            setTimeout(() => this._syncPictureFillControls(), 0);
        });

        // Outline — no stroke toggle
        document.getElementById('prop-stroke-none')?.addEventListener('change', (e) => {
            const noStroke = e.target.checked;
            this.getSelectedObjects().forEach(obj => {
                if (noStroke) {
                    obj._savedStroke = (obj.stroke && obj.stroke !== 'transparent') ? obj.stroke : (obj._savedStroke || '#000000');
                    obj._savedStrokeWidth = obj.strokeWidth > 0 ? obj.strokeWidth : (obj._savedStrokeWidth || 2);
                    obj.stroke = 'transparent';
                    obj.strokeWidth = 0;
                } else {
                    obj.stroke = obj._savedStroke || '#000000';
                    obj.strokeWidth = obj._savedStrokeWidth || 2;
                }
            });
            document.getElementById('prop-stroke-width')?.parentElement?.classList.toggle('hidden', noStroke);
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('prop-stroke')?.addEventListener('input', (e) => {
            this.applyPropertyChange('stroke', e.target.value);
        });
        document.getElementById('prop-stroke-width')?.addEventListener('change', (e) => {
            this.applyPropertyChange('strokeWidth', parseInt(e.target.value));
        });
        document.getElementById('prop-stroke-dash')?.addEventListener('change', (e) => {
            this.applyPropertyChange('strokeDash', e.target.value);
        });
        document.getElementById('prop-stroke-cap')?.addEventListener('change', (e) => {
            this.applyPropertyChange('strokeCap', e.target.value);
        });
        document.getElementById('prop-stroke-join')?.addEventListener('change', (e) => {
            this.applyPropertyChange('strokeJoin', e.target.value);
        });
        document.getElementById('prop-border-radius')?.addEventListener('change', (e) => {
            this.applyPropertyChange('borderRadius', parseInt(e.target.value));
        });
        document.getElementById('prop-border-radius')?.addEventListener('input', (e) => {
            this.applyPropertyChange('borderRadius', parseInt(e.target.value));
        });

        const bindShapeRange = (id, valueId, formatter, applyValue) => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                const valueEl = document.getElementById(valueId);
                if (valueEl) valueEl.textContent = formatter(value);
                this.getSelectedObjects().forEach(obj => applyValue(obj, value));
                this.stage.requestRender();
                eventBus.emit('object:updated', this.getSelectedObjects()[0]);
            });
            document.getElementById(id)?.addEventListener('change', () => {
                if (this._propRecording) this._capturePropStep();
                eventBus.emit('history:push');
            });
        };

        document.getElementById('prop-shape-sides')?.addEventListener('change', (e) => {
            const sides = Math.max(3, Math.min(24, parseInt(e.target.value, 10) || 5));
            e.target.value = sides;
            this.applyPropertyChange('sides', sides);
        });
        bindShapeRange('prop-shape-inner-radius', 'prop-shape-inner-radius-val', value => `${Math.round(value * 100)}%`, (obj, value) => {
            obj.innerRadius = value;
        });
        bindShapeRange('prop-shape-hole-size', 'prop-shape-hole-size-val', value => `${Math.round(value * 100)}%`, (obj, value) => {
            obj.innerRadius = value;
        });
        bindShapeRange('prop-shape-arc-thickness', 'prop-shape-arc-thickness-val', value => `${Math.round(value * 100)}%`, (obj, value) => {
            obj.innerRadius = 1 - value;
        });
        bindShapeRange('prop-shape-start-angle', 'prop-shape-start-angle-val', value => `${Math.round(value)}°`, (obj, value) => {
            obj.shapeStartAngle = value;
        });
        bindShapeRange('prop-shape-sweep-angle', 'prop-shape-sweep-angle-val', value => `${Math.round(value)}°`, (obj, value) => {
            obj.shapeSweepAngle = value;
        });
        bindShapeRange('prop-arrow-shaft-width', 'prop-arrow-shaft-width-val', value => `${Math.round(value * 100)}%`, (obj, value) => {
            obj.arrowShaftWidth = value;
        });
        bindShapeRange('prop-arrow-head-length', 'prop-arrow-head-length-val', value => `${Math.round(value * 100)}%`, (obj, value) => {
            obj.arrowHeadLength = value;
        });
        document.getElementById('btn-reset-shape-controls')?.addEventListener('click', () => {
            this.resetSelectedShapeControls();
        });

        // Effects — Shadow
        document.getElementById('prop-shadow')?.addEventListener('change', (e) => {
            this.applyPropertyChange('shadow', e.target.checked);
            document.getElementById('shadow-controls')?.classList.toggle('hidden', !e.target.checked);
        });
        document.getElementById('prop-shadow-color')?.addEventListener('input', (e) => {
            this.applyPropertyChange('shadowColor', e.target.value);
        });
        document.getElementById('prop-shadow-blur')?.addEventListener('change', (e) => {
            this.applyPropertyChange('shadowBlur', parseInt(e.target.value));
        });
        document.getElementById('prop-shadow-ox')?.addEventListener('change', (e) => {
            this.applyPropertyChange('shadowOffsetX', parseInt(e.target.value));
        });
        document.getElementById('prop-shadow-oy')?.addEventListener('change', (e) => {
            this.applyPropertyChange('shadowOffsetY', parseInt(e.target.value));
        });

        // Effects — Glow
        document.getElementById('prop-glow')?.addEventListener('change', (e) => {
            this.applyPropertyChange('glowEnabled', e.target.checked);
            document.getElementById('glow-controls')?.classList.toggle('hidden', !e.target.checked);
        });
        document.getElementById('prop-glow-color')?.addEventListener('input', (e) => {
            this.applyPropertyChange('glowColor', e.target.value);
        });
        document.getElementById('prop-glow-size')?.addEventListener('change', (e) => {
            this.applyPropertyChange('glowSize', parseInt(e.target.value));
        });

        // Effects — Reflection
        document.getElementById('prop-reflection')?.addEventListener('change', (e) => {
            this.applyPropertyChange('reflectionEnabled', e.target.checked);
            document.getElementById('reflection-controls')?.classList.toggle('hidden', !e.target.checked);
        });
        document.getElementById('prop-refl-opacity')?.addEventListener('input', (e) => {
            this.applyPropertyChange('reflectionOpacity', parseInt(e.target.value) / 100);
        });
        document.getElementById('prop-refl-offset')?.addEventListener('change', (e) => {
            this.applyPropertyChange('reflectionOffset', parseInt(e.target.value));
        });

        // Effects — Bevel
        document.getElementById('prop-bevel')?.addEventListener('change', (e) => {
            this.applyPropertyChange('bevelEnabled', e.target.checked);
            document.getElementById('bevel-controls')?.classList.toggle('hidden', !e.target.checked);
        });
        document.getElementById('prop-bevel-size')?.addEventListener('change', (e) => {
            this.applyPropertyChange('bevelSize', parseInt(e.target.value));
        });
        document.getElementById('prop-bevel-hi')?.addEventListener('input', (e) => {
            this.applyPropertyChange('bevelHighlight', e.target.value);
        });
        document.getElementById('prop-bevel-sh')?.addEventListener('input', (e) => {
            this.applyPropertyChange('bevelShadow', e.target.value);
        });

        // Edit Points buttons
        document.getElementById('btn-edit-points')?.addEventListener('click', () => this.togglePointEditMode());
        document.getElementById('btn-edit-points-done')?.addEventListener('click', () => this.exitPointEditMode());
        document.getElementById('btn-add-point')?.addEventListener('click', () => this.addPointToSelected());
        document.getElementById('btn-delete-point')?.addEventListener('click', () => this.deleteSelectedPoint());
        document.getElementById('btn-simplify-path')?.addEventListener('click', () => this.simplifySelectedPath());
        document.getElementById('btn-toggle-closed-path')?.addEventListener('click', () => this.toggleClosedPath());
        document.getElementById('point-x')?.addEventListener('change', (e) => this.updateSelectedPointCoord('x', parseFloat(e.target.value)));
        document.getElementById('point-y')?.addEventListener('change', (e) => this.updateSelectedPointCoord('y', parseFloat(e.target.value)));

        // Boolean Operations buttons
        document.getElementById('btn-bool-union')?.addEventListener('click', () => this.booleanOp('union'));
        document.getElementById('btn-bool-subtract')?.addEventListener('click', () => this.booleanOp('subtract'));
        document.getElementById('btn-bool-intersect')?.addEventListener('click', () => this.booleanOp('intersect'));
        document.getElementById('btn-bool-combine')?.addEventListener('click', () => this.booleanOp('combine'));
        document.getElementById('btn-bool-fragment')?.addEventListener('click', () => this.booleanOp('fragment'));

        // Object Eraser
        document.getElementById('btn-obj-eraser')?.addEventListener('click', () => {
            if (this._objEraserMode) {
                this.exitObjectEraserMode();
            } else {
                this.enterObjectEraserMode();
            }
        });
        document.getElementById('btn-clone-part')?.addEventListener('click', () => {
            this.clonePartFromMask({
                removeFromSource: !!document.getElementById('clone-part-remove-source')?.checked
            });
        });
        document.getElementById('btn-obj-eraser-stamp')?.addEventListener('click', () => {
            this.stampObjectEraser();
        });
        document.getElementById('btn-obj-eraser-apply')?.addEventListener('click', () => {
            this.applyObjectEraser(true);
        });
        document.getElementById('btn-obj-eraser-apply-remove')?.addEventListener('click', () => {
            this.applyObjectEraser(false);
        });
        document.getElementById('btn-obj-eraser-cancel')?.addEventListener('click', () => {
            this.exitObjectEraserMode();
        });
        document.getElementById('obj-eraser-rot-eraser')?.addEventListener('input', (e) => {
            this.setObjEraserRotation('eraser', parseFloat(e.target.value) || 0);
        });
        document.getElementById('obj-eraser-rot-target')?.addEventListener('input', (e) => {
            this.setObjEraserRotation('target', parseFloat(e.target.value) || 0);
        });

        // Flex Tool
        document.getElementById('btn-flex-mode')?.addEventListener('click', () => this.toggleFlexMode());
        document.getElementById('btn-flex-rig-mode')?.addEventListener('click', () => this.toggleFlexRigMode());
        document.getElementById('btn-flex-reset')?.addEventListener('click', () => this.resetFlexPins());
        document.getElementById('btn-flex-clear')?.addEventListener('click', () => this.clearFlex());
        document.getElementById('btn-flex-exit')?.addEventListener('click', () => this.exitFlexMode());
        document.getElementById('btn-flex-bake')?.addEventListener('click', () => {
            const obj = this.getSelectedObjects()[0];
            if (!obj || !obj.flexEnabled || !obj.flexPins?.some(p => Math.abs(p.angle) > 0.1)) {
                Utils.showToast('Select a flex-bent shape first', 'warning');
                return;
            }
            try {
                const result = this._bakeFlexShape(obj);
                if (!result) { Utils.showToast('Nothing to bake', 'warning'); return; }
                const newImg = new StageObject('image', {
                    x: result.x, y: result.y,
                    width: result.width, height: result.height,
                    name: (obj.name || 'Shape') + ' (Baked)',
                    opacity: obj.opacity ?? 1,
                    imageSrc: result.dataURL,
                });
                this.addObject(newImg);
                newImg.loadImage(result.dataURL);
                const idx = this.objects.findIndex(o => o.id === obj.id);
                if (idx !== -1) this.objects.splice(idx, 1);
                this.select([newImg.id]);
                this.stage.requestRender();
                eventBus.emit('history:push');
                Utils.showToast('Flex baked — use Auto Trace to vectorize', 'success');
            } catch (e) {
                console.error('Bake flex error:', e);
                Utils.showToast('Bake failed: ' + e.message, 'error');
            }
        });
        document.getElementById('flex-preserve-texture')?.addEventListener('change', (e) => this.setFlexPreserveTexture(e.target.checked));
        document.getElementById('flex-fixed-region-mode')?.addEventListener('change', (e) => this.setFlexFixedRegionMode(e.target.value));
        document.getElementById('flex-grid-density')?.addEventListener('input', (e) => this.setFlexGridDensity(parseFloat(e.target.value), false));
        document.getElementById('flex-grid-density')?.addEventListener('change', (e) => this.setFlexGridDensity(parseFloat(e.target.value), true));
        document.getElementById('flex-dir-h')?.addEventListener('click', () => this.setFlexDirection('horizontal'));
        document.getElementById('flex-dir-v')?.addEventListener('click', () => this.setFlexDirection('vertical'));
        document.getElementById('flex-rig-channel-angle')?.addEventListener('click', () => this._setFlexRigChannel('angle'));
        document.getElementById('flex-rig-channel-tilt-x')?.addEventListener('click', () => this._setFlexRigChannel('tiltX'));
        document.getElementById('flex-rig-channel-tilt-y')?.addEventListener('click', () => this._setFlexRigChannel('tiltY'));
        document.getElementById('btn-flex-rig-reset')?.addEventListener('click', () => this.resetFlexRigJointValues());
        document.getElementById('btn-flex-rig-exit')?.addEventListener('click', () => this.exitFlexRigMode());

        // Text
        document.getElementById('prop-text-content')?.addEventListener('input', (e) => {
            this.applyPropertyChange('text', e.target.value);
        });
        document.getElementById('prop-text-color')?.addEventListener('input', (e) => {
            this.applyPropertyChange('textColor', e.target.value);
        });
        document.getElementById('prop-font-family')?.addEventListener('change', (e) => {
            this.applyPropertyChange('fontFamily', e.target.value);
        });
        document.getElementById('prop-font-size')?.addEventListener('input', (e) => {
            this.applyPropertyChange('fontSize', parseInt(e.target.value));
        });
        document.getElementById('prop-font-weight')?.addEventListener('change', (e) => {
            this.applyPropertyChange('fontWeight', e.target.value);
        });
        document.getElementById('prop-text-stroke-color')?.addEventListener('input', (e) => {
            this.applyPropertyChange('textStrokeColor', e.target.value);
        });
        document.getElementById('prop-text-stroke-width')?.addEventListener('input', (e) => {
            this.applyPropertyChange('textStrokeWidth', parseFloat(e.target.value));
        });
        document.getElementById('prop-text-curve')?.addEventListener('input', (e) => {
            this.applyPropertyChange('textCurve', parseFloat(e.target.value));
        });
        // Touching any background control auto-enables the background so users see immediate feedback
        // even if they never clicked the toolbar toggle. This is the single source-of-truth for the BG controls.
        const ensureTextBackgroundEnabled = () => {
            this.getSelectedObjects().forEach(obj => {
                obj.textBackgroundEnabled = true;
                if (!obj.textBackgroundColor) obj.textBackgroundColor = '#111827';
                if (!Number.isFinite(Number(obj.textBackgroundPadding))) obj.textBackgroundPadding = 10;
                if (!Number.isFinite(Number(obj.textBackgroundRadius))) obj.textBackgroundRadius = 8;
            });
            const toggleBtn = document.getElementById('btn-text-bg');
            if (toggleBtn) toggleBtn.classList.add('active');
            const enableCheckbox = document.getElementById('prop-text-bg-enabled');
            if (enableCheckbox) enableCheckbox.checked = true;
        };
        document.getElementById('prop-text-bg-enabled')?.addEventListener('change', (e) => {
            const enabled = !!e.target.checked;
            this.getSelectedObjects().forEach(obj => {
                obj.textBackgroundEnabled = enabled;
                if (enabled) {
                    if (!obj.textBackgroundColor) obj.textBackgroundColor = '#111827';
                    if (!Number.isFinite(Number(obj.textBackgroundPadding))) obj.textBackgroundPadding = 10;
                    if (!Number.isFinite(Number(obj.textBackgroundRadius))) obj.textBackgroundRadius = 8;
                }
            });
            const toggleBtn = document.getElementById('btn-text-bg');
            if (toggleBtn) toggleBtn.classList.toggle('active', enabled);
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('prop-text-bg-color')?.addEventListener('input', (e) => {
            ensureTextBackgroundEnabled();
            this.applyPropertyChange('textBackgroundColor', e.target.value);
        });
        document.getElementById('prop-text-bg-padding')?.addEventListener('input', (e) => {
            ensureTextBackgroundEnabled();
            this.applyPropertyChange('textBackgroundPadding', parseFloat(e.target.value));
        });
        document.getElementById('prop-text-bg-radius')?.addEventListener('input', (e) => {
            ensureTextBackgroundEnabled();
            this.applyPropertyChange('textBackgroundRadius', parseFloat(e.target.value));
        });

        const pushTextHistory = () => {
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        };
        const applyTextTransform = (value) => {
            this.getSelectedObjects().forEach(obj => {
                obj.textTransform = value;
            });
            document.querySelectorAll('[data-text-transform]').forEach(btn => btn.classList.toggle('active', btn.dataset.textTransform === value));
            pushTextHistory();
        };
        const applyListStyle = (value) => {
            this.getSelectedObjects().forEach(obj => {
                obj.listStyle = value;
                if (!Number.isFinite(Number(obj.listIndent))) obj.listIndent = 24;
            });
            document.querySelectorAll('[data-list-style]').forEach(btn => btn.classList.toggle('active', btn.dataset.listStyle === value));
            pushTextHistory();
        };
        const applyTextPreset = (preset) => {
            const presets = {
                heading: { fontSize: 56, fontWeight: '700', lineHeight: 1.1, letterSpacing: -1, fontFamily: 'Poppins', textTransform: 'none' },
                subheading: { fontSize: 34, fontWeight: '600', lineHeight: 1.2, letterSpacing: -0.3, fontFamily: 'Manrope', textTransform: 'none' },
                body: { fontSize: 24, fontWeight: '400', lineHeight: 1.4, letterSpacing: 0, fontFamily: 'Inter', textTransform: 'none' },
                mono: { fontSize: 22, fontWeight: '500', lineHeight: 1.3, letterSpacing: 0.5, fontFamily: 'JetBrains Mono', textTransform: 'uppercase' }
            };
            const next = presets[preset];
            if (!next) return;
            this.getSelectedObjects().forEach(obj => Object.assign(obj, next));
            pushTextHistory();
        };

        // Text formatting toolbar
        document.getElementById('btn-text-bold')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => {
                obj.fontWeight = obj.fontWeight === '700' ? '400' : '700';
            });
            pushTextHistory();
        });
        document.getElementById('btn-text-italic')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => {
                obj.fontStyle = obj.fontStyle === 'italic' ? 'normal' : 'italic';
            });
            pushTextHistory();
        });
        document.getElementById('btn-text-underline')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => {
                const has = (obj.textDecoration || '').includes('underline');
                if (has) obj.textDecoration = obj.textDecoration.replace('underline', '').trim() || 'none';
                else obj.textDecoration = ((obj.textDecoration === 'none' ? '' : obj.textDecoration) + ' underline').trim();
            });
            pushTextHistory();
        });
        document.getElementById('btn-text-strikethrough')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => {
                const has = (obj.textDecoration || '').includes('line-through');
                if (has) obj.textDecoration = obj.textDecoration.replace('line-through', '').trim() || 'none';
                else obj.textDecoration = ((obj.textDecoration === 'none' ? '' : obj.textDecoration) + ' line-through').trim();
            });
            pushTextHistory();
        });
        document.getElementById('btn-text-shadow')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => {
                obj.shadow = !obj.shadow;
                if (obj.shadow && !obj.shadowBlur) obj.shadowBlur = 10;
            });
            pushTextHistory();
        });
        document.getElementById('btn-text-bg')?.addEventListener('click', () => {
            const targets = this.getSelectedObjects();
            if (!targets.length) {
                if (typeof Utils !== 'undefined' && Utils.showToast) {
                    Utils.showToast('Select a text object first to toggle its background', 'warning');
                }
                return;
            }
            // Determine collective state: enable for all unless every selected object already has it on
            const allEnabled = targets.every(obj => !!obj.textBackgroundEnabled);
            const nextEnabled = !allEnabled;
            targets.forEach(obj => {
                obj.textBackgroundEnabled = nextEnabled;
                if (nextEnabled) {
                    if (!obj.textBackgroundColor) obj.textBackgroundColor = '#111827';
                    if (!Number.isFinite(Number(obj.textBackgroundPadding))) obj.textBackgroundPadding = 10;
                    if (!Number.isFinite(Number(obj.textBackgroundRadius))) obj.textBackgroundRadius = 8;
                }
            });
            const checkbox = document.getElementById('prop-text-bg-enabled');
            if (checkbox) checkbox.checked = nextEnabled;
            pushTextHistory();
        });
        document.querySelectorAll('[data-text-transform]').forEach(btn => {
            btn.addEventListener('click', () => applyTextTransform(btn.dataset.textTransform || 'none'));
        });
        document.querySelectorAll('[data-list-style]').forEach(btn => {
            btn.addEventListener('click', () => applyListStyle(btn.dataset.listStyle || 'none'));
        });
        document.querySelectorAll('[data-text-preset]').forEach(btn => {
            btn.addEventListener('click', () => applyTextPreset(btn.dataset.textPreset));
        });
        // Text alignment buttons (only valid CanvasTextAlign values)
        const validTextAligns = ['left', 'center', 'right', 'start', 'end'];
        document.querySelectorAll('[data-text-align]').forEach(btn => {
            btn.addEventListener('click', () => {
                const align = btn.dataset.textAlign;
                if (!validTextAligns.includes(align)) return;
                this.getSelectedObjects().forEach(obj => {
                    obj.textAlign = align;
                });
                // Update active state on text-align buttons only
                document.querySelectorAll('[data-text-align]').forEach(b => b.classList.toggle('active', b.dataset.textAlign === align));
                pushTextHistory();
            });
        });

        document.getElementById('prop-line-height')?.addEventListener('input', (e) => {
            this.applyPropertyChange('lineHeight', parseFloat(e.target.value));
        });
        document.getElementById('prop-letter-spacing')?.addEventListener('input', (e) => {
            this.applyPropertyChange('letterSpacing', parseFloat(e.target.value));
        });
        document.getElementById('prop-word-spacing')?.addEventListener('input', (e) => {
            this.applyPropertyChange('wordSpacing', parseFloat(e.target.value));
        });

        // Vertical alignment buttons (top / middle / bottom)
        document.querySelectorAll('[data-text-valign]').forEach(btn => {
            btn.addEventListener('click', () => {
                const valign = btn.dataset.textValign;
                if (!['top', 'middle', 'bottom'].includes(valign)) return;
                this.getSelectedObjects().forEach(obj => { obj.textVerticalAlign = valign; });
                document.querySelectorAll('[data-text-valign]').forEach(b => b.classList.toggle('active', b.dataset.textValign === valign));
                pushTextHistory();
            });
        });

        // Shadow controls — touching any auto-enables the shadow flag for fast feedback
        const ensureShadowEnabled = () => {
            this.getSelectedObjects().forEach(obj => {
                obj.shadow = true;
                if (!obj.shadowColor) obj.shadowColor = '#000000';
                if (!Number.isFinite(Number(obj.shadowBlur))) obj.shadowBlur = 10;
                if (!Number.isFinite(Number(obj.shadowOffsetX))) obj.shadowOffsetX = 2;
                if (!Number.isFinite(Number(obj.shadowOffsetY))) obj.shadowOffsetY = 4;
            });
            const toggleBtn = document.getElementById('btn-text-shadow');
            if (toggleBtn) toggleBtn.classList.add('active');
            const cb = document.getElementById('prop-text-shadow-enabled');
            if (cb) cb.checked = true;
        };
        document.getElementById('prop-text-shadow-enabled')?.addEventListener('change', (e) => {
            const enabled = !!e.target.checked;
            this.getSelectedObjects().forEach(obj => {
                obj.shadow = enabled;
                if (enabled) {
                    if (!obj.shadowColor) obj.shadowColor = '#000000';
                    if (!Number.isFinite(Number(obj.shadowBlur))) obj.shadowBlur = 10;
                    if (!Number.isFinite(Number(obj.shadowOffsetX))) obj.shadowOffsetX = 2;
                    if (!Number.isFinite(Number(obj.shadowOffsetY))) obj.shadowOffsetY = 4;
                }
            });
            const toggleBtn = document.getElementById('btn-text-shadow');
            if (toggleBtn) toggleBtn.classList.toggle('active', enabled);
            pushTextHistory();
        });
        document.getElementById('prop-text-shadow-color')?.addEventListener('input', (e) => {
            ensureShadowEnabled();
            this.applyPropertyChange('shadowColor', e.target.value);
        });
        document.getElementById('prop-text-shadow-blur')?.addEventListener('input', (e) => {
            ensureShadowEnabled();
            this.applyPropertyChange('shadowBlur', parseFloat(e.target.value));
        });
        document.getElementById('prop-text-shadow-offset-x')?.addEventListener('input', (e) => {
            ensureShadowEnabled();
            this.applyPropertyChange('shadowOffsetX', parseFloat(e.target.value));
        });
        document.getElementById('prop-text-shadow-offset-y')?.addEventListener('input', (e) => {
            ensureShadowEnabled();
            this.applyPropertyChange('shadowOffsetY', parseFloat(e.target.value));
        });

        // Action buttons
        document.getElementById('btn-duplicate')?.addEventListener('click', () => this.duplicateSelected());
        document.getElementById('btn-delete')?.addEventListener('click', () => this.deleteSelected());
        document.getElementById('btn-bring-forward')?.addEventListener('click', () => this.bringForward());
        document.getElementById('btn-send-backward')?.addEventListener('click', () => this.sendBackward());

        // Flip buttons
        document.getElementById('btn-flip-h')?.addEventListener('click', () => this.flipSelectedH());
        document.getElementById('btn-flip-v')?.addEventListener('click', () => this.flipSelectedV());
        document.getElementById('btn-mirror-h')?.addEventListener('click', () => this.mirrorDuplicateH());
        document.getElementById('btn-mirror-v')?.addEventListener('click', () => this.mirrorDuplicateV());

        // Visibility + Lock toggles
        document.getElementById('btn-toggle-visible')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => { obj.visible = !obj.visible; });
            this.updateObjectList();
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('btn-lock-toggle')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => { obj.locked = !obj.locked; });
            this.updateObjectList();
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        // Group/Ungroup buttons
        document.getElementById('btn-group')?.addEventListener('click', () => this.groupSelected());
        document.getElementById('btn-ungroup')?.addEventListener('click', () => this.ungroupSelected());
        document.getElementById('btn-group-layers')?.addEventListener('click', () => this.groupSelected());

        // Copy Position / Copy Size (re-click to cancel)
        document.getElementById('btn-copy-position')?.addEventListener('click', () => {
            if (this._copyMode === 'position') { this.cancelCopyMode(); return; }
            this.startCopyMode('position');
        });
        document.getElementById('btn-copy-size')?.addEventListener('click', () => {
            if (this._copyMode === 'size') { this.cancelCopyMode(); return; }
            this.startCopyMode('size');
        });

        // Layer add/delete buttons
        document.getElementById('btn-add-layer')?.addEventListener('click', () => this.addNewLayer());
        document.getElementById('btn-delete-layer')?.addEventListener('click', () => this.deleteSelectedLayer());

        // Animation copy/paste/paint buttons
        document.getElementById('btn-copy-anims')?.addEventListener('click', () => this.copyAnimations());
        document.getElementById('btn-paste-anims')?.addEventListener('click', () => this.pasteAnimations());
        document.getElementById('btn-paint-anims')?.addEventListener('click', () => this.startAnimationPaint());

        // Swap Objects
        document.getElementById('btn-swap-objects')?.addEventListener('click', () => this.swapSelectedObjects());

        // Format Painter
        document.getElementById('btn-copy-format')?.addEventListener('click', () => {
            if (this._copiedFormat) {
                this._copiedFormat = null;
                document.getElementById('btn-copy-format')?.classList.remove('active');
                Utils.showToast('Copy format cancelled', 'info');
                return;
            }
            this.copyFormat();
        });
        document.getElementById('btn-paste-format')?.addEventListener('click', () => this.pasteFormat());

        // Select Similar
        document.getElementById('btn-select-similar')?.addEventListener('click', () => {
            const menu = document.getElementById('select-similar-menu');
            if (menu) menu.classList.toggle('hidden');
        });
        document.querySelectorAll('#select-similar-menu button[data-criteria]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectSimilarObjects(btn.dataset.criteria);
                document.getElementById('select-similar-menu')?.classList.add('hidden');
            });
        });

        // Stage Hide/Show activation toggle
        document.getElementById('btn-activate-stage-hideshow')?.addEventListener('click', () => this.toggleStageHideShowMode());
        document.getElementById('btn-stage-hide')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => { obj.visible = false; });
            this.updateObjectList(); this.updateProperties(); this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('btn-stage-show')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => { obj.visible = true; });
            this.updateObjectList(); this.updateProperties(); this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('btn-stage-hideshow-reset')?.addEventListener('click', () => {
            this._stageHideShowActive = false;
            document.getElementById('stage-hideshow-controls')?.classList.add('hidden');
            const btn = document.getElementById('btn-activate-stage-hideshow');
            if (btn) { btn.querySelector('i').className = 'fas fa-toggle-off'; btn.classList.remove('active'); }
        });

        // Image tools
        const selectImageToolCategory = (category) => {
            document.querySelectorAll('[data-image-tool-tab]').forEach(tab => {
                const active = tab.dataset.imageToolTab === category;
                tab.classList.toggle('active', active);
                tab.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            document.querySelectorAll('[data-image-tool-panel]').forEach(panel => {
                panel.classList.toggle('hidden', panel.dataset.imageToolPanel !== category);
            });
        };
        document.querySelectorAll('[data-image-tool-tab]').forEach(tab => {
            tab.addEventListener('click', () => selectImageToolCategory(tab.dataset.imageToolTab));
        });

        const compressAmount = document.getElementById('compress-amount');
        const syncCompressAmountLabel = () => {
            const label = document.getElementById('compress-amount-val');
            if (label && compressAmount) label.textContent = `${parseInt(compressAmount.value, 10) || 0}%`;
        };
        compressAmount?.addEventListener('input', () => {
            syncCompressAmountLabel();
            this.applyCompressionRigFromControls({ pushHistory: false, silent: true });
        });
        compressAmount?.addEventListener('change', () => {
            this.applyCompressionRigFromControls({ pushHistory: true });
        });
        document.getElementById('compress-axis')?.addEventListener('change', () => {
            this.applyCompressionRigFromControls({ pushHistory: true });
        });
        document.getElementById('compress-anchor')?.addEventListener('change', () => {
            this.applyCompressionRigFromControls({ pushHistory: true });
        });
        ['compress-margin-top', 'compress-margin-bottom', 'compress-margin-left', 'compress-margin-right', 'compress-full-close'].forEach((id) => {
            document.getElementById(id)?.addEventListener('change', () => {
                this.applyCompressionRigFromControls({ pushHistory: true });
            });
        });
        document.getElementById('btn-compress-apply')?.addEventListener('click', () => {
            this.applyCompressionRigFromControls({ pushHistory: true });
        });
        document.getElementById('btn-compress-close')?.addEventListener('click', () => {
            if (compressAmount) {
                compressAmount.value = '100';
                syncCompressAmountLabel();
            }
            this.applyCompressionRigFromControls({ pushHistory: true });
        });
        document.getElementById('btn-compress-reset')?.addEventListener('click', () => {
            this.resetCompressionRigSelection();
        });
        document.getElementById('btn-compress-preset-mouth')?.addEventListener('click', () => {
            this.applyCompressionPreset('mouth');
        });
        document.getElementById('btn-compress-preset-blink')?.addEventListener('click', () => {
            this.applyCompressionPreset('blink');
        });
        const pairAmount = document.getElementById('compress-pair-amount');
        const syncPairAmountLabel = () => {
            const label = document.getElementById('compress-pair-amount-val');
            if (label && pairAmount) label.textContent = `${parseInt(pairAmount.value, 10) || 0}%`;
        };
        pairAmount?.addEventListener('input', () => {
            syncPairAmountLabel();
            this.applyCompressionPairRigFromControls({ pushHistory: false, silent: true });
        });
        pairAmount?.addEventListener('change', () => {
            this.applyCompressionPairRigFromControls({ pushHistory: true });
        });
        document.getElementById('compress-pair-scale')?.addEventListener('change', () => {
            this.applyCompressionPairRigFromControls({ pushHistory: true });
        });
        document.getElementById('btn-compress-pair-create')?.addEventListener('click', () => {
            this.createCompressionPairRigFromSelection();
        });
        document.getElementById('btn-compress-pair-reset')?.addEventListener('click', () => {
            this.clearCompressionPairRig();
        });
        document.getElementById('btn-compress-keyframe')?.addEventListener('click', () => {
            this.captureCompressionKeyframeFromControls();
        });
        document.getElementById('btn-compress-pair-keyframe')?.addEventListener('click', () => {
            this.captureCompressionPairKeyframeFromControls();
        });
        syncPairAmountLabel();
        syncCompressAmountLabel();

        const openQuickImageTool = () => {
            const select = document.getElementById('image-tool-quick-action');
            const targetId = select?.value;
            if (!targetId) return;
            const targetButton = document.getElementById(targetId);
            if (!targetButton) {
                Utils.showToast('That tool is not available right now.', 'warning');
                return;
            }
            targetButton.click();
        };
        document.getElementById('btn-image-tool-quick-open')?.addEventListener('click', openQuickImageTool);
        document.getElementById('image-tool-quick-action')?.addEventListener('change', (event) => {
            if (!event.target.value) return;
            openQuickImageTool();
        });

        document.getElementById('btn-remove-bg')?.addEventListener('click', () => {
            const bgControls = document.getElementById('bg-removal-controls');
            if (bgControls) {
                bgControls.classList.toggle('visible');
                const visible = bgControls.classList.contains('visible');
                if (visible) {
                    this._showImplementationFloatingToolbar({
                        tool: 'bg-remove',
                        label: 'Background Remove',
                        hint: 'Adjust tolerance, then apply or cancel',
                        onApply: () => this.removeImageBackground(),
                        onCancel: () => {
                            document.getElementById('bg-removal-controls')?.classList.remove('visible');
                            this._hideImplementationFloatingToolbar('bg-remove');
                        }
                    });
                } else {
                    this._hideImplementationFloatingToolbar('bg-remove');
                }
            }
        });

        document.getElementById('bg-tolerance')?.addEventListener('input', (e) => {
            document.getElementById('bg-tolerance-val').textContent = e.target.value;
        });

        document.getElementById('btn-bg-apply')?.addEventListener('click', () => {
            this.removeImageBackground();
        });

        document.getElementById('btn-bg-cancel')?.addEventListener('click', () => {
            document.getElementById('bg-removal-controls').classList.remove('visible');
            this._hideImplementationFloatingToolbar('bg-remove');
        });

        document.getElementById('btn-replace-image')?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'image/*';
            input.onchange = (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => {
                    const selected = this.getSelectedObjects();
                    const obj = selected.find(o => o.type === 'image');
                    if (obj) {
                        obj.imageSrc = reader.result;
                        obj.loadImage(reader.result);
                        obj.isAnimatedGif = false;
                        obj.gifFrameDelays = null;
                        obj.isSpriteSequence = false;
                        obj.spriteSheet = null;
                        obj.animations = (obj.animations || []).filter(animation => animation.spriteSequence !== true);
                        this.stage._hasAnimatedGifs = this.objects.some(o =>
                            (o.isAnimatedGif && o._gifFrames) || o.isSpriteSequence
                        );
                        this.updateProperties?.();
                        this.stage.requestRender();
                        eventBus.emit('timeline:update');
                        eventBus.emit('history:push');
                    }
                };
                reader.readAsDataURL(file);
            };
            input.click();
        });

        // Image crop
        document.getElementById('btn-crop-image')?.addEventListener('click', () => {
            if (this._cropMode) {
                this.exitCropMode();
            } else {
                this.enterCropMode();
            }
        });
        document.getElementById('btn-crop-apply')?.addEventListener('click', () => {
            this.cropImage();
        });
        document.getElementById('btn-crop-cancel')?.addEventListener('click', () => {
            this.exitCropMode();
        });
        const cropFtBar = document.getElementById('crop-floating-toolbar');
        if (cropFtBar) {
            cropFtBar.addEventListener('mousedown', (e) => e.stopPropagation());
        }
        document.getElementById('btn-crop-ft-apply')?.addEventListener('click', () => {
            this.cropImage();
        });
        document.getElementById('btn-crop-ft-cancel')?.addEventListener('click', () => {
            this.exitCropMode();
        });

        document.getElementById('btn-trim-image')?.addEventListener('click', () => {
            const controls = document.getElementById('image-trim-controls');
            controls?.classList.toggle('hidden');
            if (controls && !controls.classList.contains('hidden')) {
                this._showImplementationFloatingToolbar({
                    tool: 'trim',
                    label: 'Trim Image',
                    hint: 'Trim transparent bounds, then apply or cancel',
                    onApply: () => this.trimImageTransparentSpace(),
                    onCancel: () => {
                        document.getElementById('image-trim-controls')?.classList.add('hidden');
                        this._hideImplementationFloatingToolbar('trim');
                    }
                });
            } else {
                this._hideImplementationFloatingToolbar('trim');
            }
        });
        document.getElementById('trim-alpha-threshold')?.addEventListener('input', (event) => {
            const value = document.getElementById('trim-alpha-threshold-val');
            if (value) value.textContent = event.target.value;
        });
        document.getElementById('btn-trim-apply')?.addEventListener('click', () => this.trimImageTransparentSpace());
        document.getElementById('btn-trim-cancel')?.addEventListener('click', () => {
            document.getElementById('image-trim-controls')?.classList.add('hidden');
            this._hideImplementationFloatingToolbar('trim');
        });

        document.getElementById('btn-image-perspective')?.addEventListener('click', () => {
            if (this._imagePerspectiveMode) this.exitImagePerspectiveMode();
            else this.enterImagePerspectiveMode();
        });
        ['perspective-tl-x', 'perspective-tl-y', 'perspective-tr-x', 'perspective-tr-y',
            'perspective-bl-x', 'perspective-bl-y', 'perspective-br-x', 'perspective-br-y'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => this._scheduleImagePerspectivePreview());
        });
        document.getElementById('btn-perspective-reset')?.addEventListener('click', () => this.resetImagePerspectiveControls());
        document.getElementById('btn-perspective-apply')?.addEventListener('click', () => this.applyImagePerspective());
        document.getElementById('btn-perspective-cancel')?.addEventListener('click', () => this.exitImagePerspectiveMode());
        document.getElementById('btn-flatten-image')?.addEventListener('click', () => this.flattenImageAppearance());

        document.getElementById('btn-sprite-sheet')?.addEventListener('click', () => {
            if (this._spriteSheetState) this.exitSpriteSheetMode();
            else this.enterSpriteSheetMode();
        });
        document.getElementById('btn-sprite-auto')?.addEventListener('click', () => this.autoDetectSpriteGrid());
        document.getElementById('btn-sprite-refresh')?.addEventListener('click', () => this.refreshSpriteFrames());
        document.getElementById('btn-sprite-select-all')?.addEventListener('click', () => this.setAllSpriteFramesSelected(true));
        document.getElementById('btn-sprite-clear-selection')?.addEventListener('click', () => this.setAllSpriteFramesSelected(false));
        document.getElementById('btn-sprite-apply')?.addEventListener('click', () => this.applySpriteSheet());
        document.getElementById('btn-sprite-cancel')?.addEventListener('click', () => this.exitSpriteSheetMode());

        // Sync visual crop rect when input fields are changed manually
        ['crop-left', 'crop-top', 'crop-right', 'crop-bottom'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', () => {
                if (!this._cropMode || !this._cropObj) return;
                const obj = this._cropObj;
                let l = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-left')?.value) || 0));
                let t = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-top')?.value) || 0));
                let r = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-right')?.value) || 100));
                let b = Math.max(0, Math.min(100, parseInt(document.getElementById('crop-bottom')?.value) || 100));
                // Cross-validate: ensure left < right, top < bottom
                if (l >= r) { if (id === 'crop-left') l = r - 1; else r = l + 1; }
                if (t >= b) { if (id === 'crop-top') t = b - 1; else b = t + 1; }
                l = Math.max(0, l); t = Math.max(0, t);
                r = Math.min(100, r); b = Math.min(100, b);
                document.getElementById('crop-left').value = l;
                document.getElementById('crop-top').value = t;
                document.getElementById('crop-right').value = r;
                document.getElementById('crop-bottom').value = b;
                this._cropRect = {
                    x: obj.x + obj.width * l / 100,
                    y: obj.y + obj.height * t / 100,
                    w: obj.width * (r - l) / 100,
                    h: obj.height * (b - t) / 100
                };
                this.stage.requestRender();
            });
        });

        // Image eraser
        document.getElementById('btn-image-eraser')?.addEventListener('click', () => {
            if (this._eraserMode) {
                this.exitEraserMode();
            } else {
                this.enterEraserMode();
            }
        });
        document.getElementById('btn-eraser-apply')?.addEventListener('click', () => {
            this.applyEraser();
        });
        document.getElementById('btn-eraser-cancel')?.addEventListener('click', () => {
            this.exitEraserMode();
        });
        document.getElementById('eraser-brush-size')?.addEventListener('input', (e) => {
            this._eraserBrushSize = parseInt(e.target.value) || 20;
            const valEl = document.getElementById('eraser-brush-size-val');
            if (valEl) valEl.textContent = e.target.value;
            this.stage.requestRender();
        });
        document.getElementById('eraser-hardness')?.addEventListener('input', (e) => {
            this._eraserHardness = parseInt(e.target.value) || 100;
            const valEl = document.getElementById('eraser-hardness-val');
            if (valEl) valEl.textContent = e.target.value;
        });

        document.getElementById('btn-edge-refine')?.addEventListener('click', () => {
            if (this._edgeRefineMode) this.exitEdgeRefineMode();
            else this.enterEdgeRefineMode();
        });
        [
            ['edge-refine-expand', 'edge-refine-expand-val', ''],
            ['edge-refine-feather', 'edge-refine-feather-val', ''],
            ['edge-refine-clean', 'edge-refine-clean-val', '%']
        ].forEach(([id, valueId, suffix]) => {
            document.getElementById(id)?.addEventListener('input', (event) => {
                const value = document.getElementById(valueId);
                if (value) value.textContent = `${event.target.value}${suffix}`;
                this._scheduleEdgeRefinePreview();
            });
        });
        document.getElementById('btn-edge-refine-apply')?.addEventListener('click', () => this.applyEdgeRefine());
        document.getElementById('btn-edge-refine-cancel')?.addEventListener('click', () => this.exitEdgeRefineMode());

        document.getElementById('btn-clip-image-shape')?.addEventListener('click', () => {
            const controls = document.getElementById('image-clip-shape-controls');
            controls?.classList.toggle('hidden');
            if (controls && !controls.classList.contains('hidden')) {
                this._showImplementationFloatingToolbar({
                    tool: 'clip-shape',
                    label: 'Clip Shape',
                    hint: 'Configure clipping, then apply or cancel',
                    onApply: () => this.clipImageToShape(),
                    onCancel: () => {
                        document.getElementById('image-clip-shape-controls')?.classList.add('hidden');
                        this._hideImplementationFloatingToolbar('clip-shape');
                    }
                });
            } else {
                this._hideImplementationFloatingToolbar('clip-shape');
            }
        });
        document.getElementById('btn-clip-shape-apply')?.addEventListener('click', () => this.clipImageToShape());
        document.getElementById('btn-clip-shape-cancel')?.addEventListener('click', () => {
            document.getElementById('image-clip-shape-controls')?.classList.add('hidden');
            this._hideImplementationFloatingToolbar('clip-shape');
        });

        document.getElementById('btn-image-color-key')?.addEventListener('click', () => {
            if (this._imageColorKeyMode) this.exitImageColorKeyMode();
            else this.enterImageColorKeyMode();
        });
        document.getElementById('image-color-key-mode')?.addEventListener('change', () => {
            this._syncImageColorKeyModeControls();
            this._scheduleImageColorKeyPreview();
        });
        ['image-color-key-source', 'image-color-key-replacement', 'image-color-key-tolerance', 'image-color-key-softness'].forEach(id => {
            document.getElementById(id)?.addEventListener('input', (event) => {
                const valueId = id === 'image-color-key-tolerance'
                    ? 'image-color-key-tolerance-val'
                    : id === 'image-color-key-softness'
                        ? 'image-color-key-softness-val'
                        : null;
                if (valueId) {
                    const value = document.getElementById(valueId);
                    if (value) value.textContent = event.target.value;
                }
                this._scheduleImageColorKeyPreview();
            });
        });
        document.getElementById('btn-image-color-key-pick')?.addEventListener('click', () => this.pickImageColorKeyColor());
        document.getElementById('btn-image-color-key-apply')?.addEventListener('click', () => this.applyImageColorKey());
        document.getElementById('btn-image-color-key-cancel')?.addEventListener('click', () => this.exitImageColorKeyMode());

        // Clone brush
        document.getElementById('btn-clone-brush')?.addEventListener('click', () => {
            if (this._cloneBrushMode) this.exitCloneBrushMode({ cancel: true });
            else this.enterCloneBrushMode();
        });
        document.getElementById('btn-clone-brush-pick-source')?.addEventListener('click', () => {
            if (!this._cloneBrushMode) return;
            this._cloneBrushBoundaryMode = null;
            this._cloneBrushPickSource = true;
            this._cloneBrushPickTarget = false;
            this._updateCloneBrushStatus();
            this.stage.requestRender();
        });
        document.getElementById('btn-clone-brush-pick-target')?.addEventListener('click', () => {
            if (!this._cloneBrushMode) return;
            this._cloneBrushBoundaryMode = null;
            this._cloneBrushPickSource = false;
            this._cloneBrushPickTarget = true;
            this._updateCloneBrushStatus();
            this.stage.requestRender();
        });
        document.getElementById('btn-clone-brush-undo')?.addEventListener('click', () => this.undoCloneBrushStroke());
        document.getElementById('btn-clone-brush-redo')?.addEventListener('click', () => this.redoCloneBrushStroke());
        document.getElementById('btn-clone-brush-clear')?.addEventListener('click', () => this.clearCloneBrushLayer());
        document.getElementById('btn-clone-brush-select-mask')?.addEventListener('click', () => this.beginCloneBrushMaskSelection());
        document.getElementById('btn-clone-brush-clear-mask')?.addEventListener('click', () => this.clearCloneBrushMask());
        document.getElementById('clone-brush-invert-mask')?.addEventListener('change', (event) => {
            this._cloneBrushMaskInverted = !!event.target.checked;
            this._buildCloneBrushMaskCanvas();
            this._updateCloneBrushStatus();
            this.stage.requestRender();
        });
        document.getElementById('clone-brush-clip-target-alpha')?.addEventListener('change', (event) => {
            this._cloneBrushClipTargetAlpha = !!event.target.checked;
            this._buildCloneBrushTargetAlphaCanvas();
            this._syncCloneBrushCoverageControls();
            this._updateCloneBrushStatus();
            this.stage.requestRender();
        });
        document.getElementById('btn-clone-brush-pick-boundary')?.addEventListener('click', () => {
            if (this._cloneBrushBoundaryMode === 'pick') this.clearCloneBrushBoundary();
            else this.beginCloneBrushBoundaryPick();
        });
        document.getElementById('btn-clone-brush-draw-boundary')?.addEventListener('click', () => {
            if (this._cloneBrushBoundaryMode === 'draw') this.clearCloneBrushBoundary();
            else this.beginCloneBrushBoundaryDraw();
        });
        document.getElementById('btn-clone-brush-clear-boundary')?.addEventListener('click', () => this.clearCloneBrushBoundary());
        document.getElementById('clone-brush-invert-boundary')?.addEventListener('change', (event) => {
            this._cloneBrushBoundaryInverted = !!event.target.checked;
            this._buildCloneBrushBoundaryCanvas();
            this._syncCloneBrushBoundaryControls();
            this._updateCloneBrushStatus();
            this.stage.requestRender();
        });
        document.getElementById('clone-brush-boundary-feather')?.addEventListener('input', (event) => {
            this._cloneBrushBoundaryFeather = Number(event.target.value) || 0;
            const value = document.getElementById('clone-brush-boundary-feather-val');
            if (value) value.textContent = event.target.value;
            this._buildCloneBrushBoundaryCanvas();
            this.stage.requestRender();
        });
        document.getElementById('clone-brush-mask-feather')?.addEventListener('input', (event) => {
            this._cloneBrushMaskFeather = Number(event.target.value) || 0;
            const value = document.getElementById('clone-brush-mask-feather-val');
            if (value) value.textContent = event.target.value;
            this._buildCloneBrushMaskCanvas();
            this.stage.requestRender();
        });
        document.getElementById('btn-clone-brush-apply')?.addEventListener('click', () => this.applyCloneBrush());
        document.getElementById('btn-clone-brush-cancel')?.addEventListener('click', () => this.exitCloneBrushMode({ cancel: true }));
        [
            ['clone-brush-size', '_cloneBrushSize', 'clone-brush-size-val'],
            ['clone-brush-hardness', '_cloneBrushHardness', 'clone-brush-hardness-val'],
            ['clone-brush-opacity', '_cloneBrushOpacity', 'clone-brush-opacity-val'],
            ['clone-brush-spacing', '_cloneBrushSpacing', 'clone-brush-spacing-val']
        ].forEach(([id, prop, valueId]) => {
            document.getElementById(id)?.addEventListener('input', (event) => {
                this[prop] = Number(event.target.value) || 1;
                const value = document.getElementById(valueId);
                if (value) value.textContent = event.target.value;
                this.stage.requestRender();
            });
        });
        document.getElementById('clone-brush-aligned')?.addEventListener('change', (event) => {
            this._cloneBrushAligned = !!event.target.checked;
            this._cloneBrushAlignedAnchor = null;
            this._updateCloneBrushStatus();
        });

        // Slice tool controls
        document.getElementById('btn-slice-apply')?.addEventListener('click', () => {
            this.applySlice();
        });
        document.getElementById('btn-slice-cancel')?.addEventListener('click', () => {
            this.exitSliceMode();
        });
        document.getElementById('btn-slice-undo-point')?.addEventListener('click', () => {
            this.sliceUndoLastPoint();
        });
        document.getElementById('slice-continuous-mode')?.addEventListener('change', (e) => {
            this.setSliceContinuousMode(!!e.target.checked);
        });
        document.getElementById('btn-slice-next')?.addEventListener('click', () => {
            this.sliceQueueCurrentRegion();
        });
        document.getElementById('btn-slice-clear-queue')?.addEventListener('click', () => {
            this.sliceClearQueue();
        });
        document.getElementById('btn-slice-apply-all')?.addEventListener('click', () => {
            this.applySliceBatch();
        });

        // Floating slice toolbar controls — stop propagation so viewport mousedown doesn't add a point
        const sliceFtBar = document.getElementById('slice-floating-toolbar');
        if (sliceFtBar) {
            sliceFtBar.addEventListener('mousedown', (e) => e.stopPropagation());
        }
        const sliceChooser = document.getElementById('slice-mode-chooser');
        if (sliceChooser) {
            sliceChooser.addEventListener('mousedown', (e) => e.stopPropagation());
        }
        const implementFtBar = document.getElementById('implement-floating-toolbar');
        if (implementFtBar) {
            implementFtBar.addEventListener('mousedown', (e) => e.stopPropagation());
        }
        document.getElementById('btn-implement-ft-apply')?.addEventListener('click', () => {
            this._runImplementationFloatingAction('apply');
        });
        document.getElementById('btn-implement-ft-cancel')?.addEventListener('click', () => {
            this._runImplementationFloatingAction('cancel');
        });
        document.getElementById('btn-slice-mode-single')?.addEventListener('click', () => {
            this.setSliceModeChoice('single');
        });
        document.getElementById('btn-slice-mode-continuous')?.addEventListener('click', () => {
            this.setSliceModeChoice('continuous');
        });
        document.getElementById('btn-slice-mode-cancel')?.addEventListener('click', () => {
            this.exitSliceMode();
        });
        document.getElementById('btn-slice-ft-apply')?.addEventListener('click', () => {
            this.applySlice();
        });
        document.getElementById('btn-slice-ft-cancel')?.addEventListener('click', () => {
            this.exitSliceMode();
        });
        document.getElementById('btn-slice-ft-undo')?.addEventListener('click', () => {
            this.sliceUndoLastPoint();
        });
        document.getElementById('btn-slice-ft-next')?.addEventListener('click', () => {
            this.sliceQueueCurrentRegion();
        });
        document.getElementById('btn-slice-ft-clear')?.addEventListener('click', () => {
            this.sliceClearQueue();
        });
        document.getElementById('btn-slice-ft-apply-all')?.addEventListener('click', () => {
            this.applySliceBatch();
        });

        // Advanced single-image deformation
        document.getElementById('btn-rig-image')?.addEventListener('click', () => {
            if (this.rigging.isActive) {
                this.rigging.exitRigMode();
            } else {
                const selected = this.getSelectedObjects();
                const img = selected.find(obj => obj.type === 'image');
                if (!img) {
                    Utils.showToast('Select an image to enter Image Deform mode', 'warning');
                    return;
                }
                if (!this.rigging.enterRigMode(img)) return;
                if (img.rigging?.pins?.length) this.rigging.setTool('deform');
                else this.rigging.setTool('pin');
            }
        });
        document.getElementById('btn-image-stencil')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showBodyStencil();
        });
        document.getElementById('btn-guided-motion-rig')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showBodyStencil('guided-motion-front');
        });
        document.getElementById('btn-character-cutter')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showCharacterCutter();
        });
        document.getElementById('btn-image-smartcut')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showSmartCut();
        });
        document.getElementById('btn-image-slicer')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showBodySlicer();
        });
        document.getElementById('btn-universal-char')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.openUniversalCharacterDialog();
        });
        document.getElementById('btn-fit-image-to-uc')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.openUniversalCharacterImageFitPanel();
        });

        document.getElementById('rig-guided-rig')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showGuidedRigWizard();
        });

        // AI Trace
        this._aiTrace = new AITrace(this);
        this._aiTracePreviewEl = null;

        document.getElementById('btn-ai-trace')?.addEventListener('click', () => {
            const controls = document.getElementById('ai-trace-controls');
            if (controls) controls.classList.toggle('hidden');
            if (controls && !controls.classList.contains('hidden')) {
                const sel = this.getSelectedObjects();
                const obj = sel[0];
                if (!obj) {
                    Utils.showToast('Select an object to trace', 'warning');
                    controls.classList.add('hidden');
                    return;
                }
                // Hide removeBg option for non-image shapes (canvas background is already transparent)
                const removeBgRow = document.querySelector('.ai-trace-image-only');
                if (removeBgRow) removeBgRow.style.display = obj.type === 'image' ? '' : 'none';
                this._updateAiTraceControlVisibility();
                this._showImplementationFloatingToolbar({
                    tool: 'ai-trace',
                    label: 'AI Trace',
                    hint: 'Preview tracing, then apply or cancel',
                    onApply: () => document.getElementById('btn-ai-trace-apply')?.click(),
                    onCancel: () => document.getElementById('btn-ai-trace-cancel')?.click()
                });
            } else {
                this._clearAiTracePreview();
                this._hideImplementationFloatingToolbar('ai-trace');
            }
        });

        document.getElementById('ai-trace-mode')?.addEventListener('change', () => {
            this._updateAiTraceControlVisibility();
        });
        document.getElementById('ai-trace-colors')?.addEventListener('input', (e) => {
            document.getElementById('ai-trace-colors-val').textContent = e.target.value;
        });
        document.getElementById('ai-trace-sensitivity')?.addEventListener('input', (e) => {
            document.getElementById('ai-trace-sensitivity-val').textContent = e.target.value;
        });
        document.getElementById('ai-trace-min-region')?.addEventListener('input', (e) => {
            document.getElementById('ai-trace-min-region-val').textContent = e.target.value;
        });
        document.getElementById('ai-trace-bg-tolerance')?.addEventListener('input', (e) => {
            document.getElementById('ai-trace-bg-tolerance-val').textContent = e.target.value;
        });

        document.getElementById('btn-ai-trace-preview')?.addEventListener('click', async () => {
            if (this._aiTraceBusy) return;
            const sel = this.getSelectedObjects();
            const obj = sel[0];
            if (!obj) { Utils.showToast('Select an object first', 'warning'); return; }
            const opts = {
                ...this._getAiTraceOpts(),
                onProgress: (info) => this._setAiTraceStatus(info.message || 'Tracing...', 'info', info.progress)
            };
            this._setAiTraceBusy(true, 'Preparing trace...');
            Utils.showToast('Tracing...', 'info');
            try {
                const result = await this._aiTrace.traceAsync(obj, opts);
                this._showAiTracePreview(result.preview, obj);
                const message = this._formatAiTraceResultMessage(result);
                this._setAiTraceStatus(message, 'success', 1);
                Utils.showToast(message, 'success');
            } catch (err) {
                if (this._aiTrace?._isCancelError?.(err)) {
                    this._setAiTraceStatus('Trace cancelled', 'info', 0);
                    Utils.showToast('Trace cancelled', 'info');
                } else {
                    console.error('AI Trace error:', err);
                    this._setAiTraceStatus('Trace failed: ' + err.message, 'error', 0);
                    Utils.showToast('Trace failed: ' + err.message, 'error');
                }
            } finally {
                this._setAiTraceBusy(false);
            }
        });

        document.getElementById('btn-ai-trace-apply')?.addEventListener('click', async () => {
            if (this._aiTraceBusy) return;
            const sel = this.getSelectedObjects();
            const obj = sel[0];
            if (!obj && !this._aiTrace._previewData) {
                Utils.showToast('Preview first or select an object', 'warning');
                return;
            }
            const editAfter = document.getElementById('ai-trace-edit-after')?.checked !== false;
            // If haven't previewed yet, run trace first
            if (!this._aiTrace._previewData) {
                const opts = {
                    ...this._getAiTraceOpts(),
                    onProgress: (info) => this._setAiTraceStatus(info.message || 'Tracing...', 'info', info.progress)
                };
                this._setAiTraceBusy(true, 'Preparing trace...');
                Utils.showToast('Tracing...', 'info');
                try {
                    await this._aiTrace.traceAsync(obj, opts);
                    const removeOrig = document.getElementById('ai-trace-remove-orig')?.checked !== false;
                    const ids = this._aiTrace.apply(removeOrig);
                    this._clearAiTracePreview();
                    this._setAiTraceStatus('', 'info', 0);
                    document.getElementById('ai-trace-controls')?.classList.add('hidden');
                    this._hideImplementationFloatingToolbar('ai-trace');
                    if (editAfter && ids.length === 1) {
                        if (this._pointEditMode) this.exitPointEditMode();
                        this.select([ids[0]]);
                        this.enterPointEditMode();
                    }
                    Utils.showToast(`Created ${ids.length} vector shapes`, 'success');
                } catch (err) {
                    if (this._aiTrace?._isCancelError?.(err)) {
                        this._setAiTraceStatus('Trace cancelled', 'info', 0);
                        Utils.showToast('Trace cancelled', 'info');
                    } else {
                        console.error('AI Trace error:', err);
                        this._setAiTraceStatus('Trace failed: ' + err.message, 'error', 0);
                        Utils.showToast('Trace failed: ' + err.message, 'error');
                    }
                } finally {
                    this._setAiTraceBusy(false);
                }
            } else {
                const removeOrig = document.getElementById('ai-trace-remove-orig')?.checked !== false;
                const ids = this._aiTrace.apply(removeOrig);
                this._clearAiTracePreview();
                this._setAiTraceStatus('', 'info', 0);
                document.getElementById('ai-trace-controls')?.classList.add('hidden');
                this._hideImplementationFloatingToolbar('ai-trace');
                if (editAfter && ids.length === 1) {
                    if (this._pointEditMode) this.exitPointEditMode();
                    this.select([ids[0]]);
                    this.enterPointEditMode();
                }
                Utils.showToast(`Created ${ids.length} vector shapes`, 'success');
            }
        });

        document.getElementById('btn-ai-trace-cancel')?.addEventListener('click', () => {
            this._aiTrace.cancel();
            this._setAiTraceBusy(false);
            this._setAiTraceStatus('', 'info', 0);
            this._clearAiTracePreview();
            document.getElementById('ai-trace-controls')?.classList.add('hidden');
            this._hideImplementationFloatingToolbar('ai-trace');
        });

        // Image filter sliders
        const imgFilterBindings = [
            { id: 'img-brightness', prop: 'imgBrightness', valId: 'img-brightness-val', suffix: '' },
            { id: 'img-contrast', prop: 'imgContrast', valId: 'img-contrast-val', suffix: '' },
            { id: 'img-saturation', prop: 'imgSaturation', valId: 'img-saturation-val', suffix: '' },
            { id: 'img-hue', prop: 'imgHue', valId: 'img-hue-val', suffix: '°' },
            { id: 'img-blur', prop: 'imgBlur', valId: 'img-blur-val', suffix: '' },
            { id: 'img-grayscale', prop: 'imgGrayscale', valId: 'img-grayscale-val', suffix: '' },
            { id: 'img-sepia', prop: 'imgSepia', valId: 'img-sepia-val', suffix: '' },
            { id: 'img-invert', prop: 'imgInvert', valId: 'img-invert-val', suffix: '' },
        ];
        imgFilterBindings.forEach(({ id, prop, valId, suffix }) => {
            document.getElementById(id)?.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const valEl = document.getElementById(valId);
                if (valEl) valEl.textContent = val + suffix;
                this.getSelectedObjects().forEach(obj => { if (obj.type === 'image') obj[prop] = val; });
                this.stage.requestRender();
            });
            document.getElementById(id)?.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });
        document.getElementById('img-tint-color')?.addEventListener('input', (e) => {
            this.getSelectedObjects().forEach(obj => { if (obj.type === 'image') obj.imgTintColor = e.target.value; });
            this.stage.requestRender();
        });
        document.getElementById('img-tint-color')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('img-tint-amount')?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            const valEl = document.getElementById('img-tint-val');
            if (valEl) valEl.textContent = val + '%';
            this.getSelectedObjects().forEach(obj => { if (obj.type === 'image') obj.imgTintAmount = val; });
            this.stage.requestRender();
        });
        document.getElementById('img-tint-amount')?.addEventListener('change', () => {
            eventBus.emit('history:push');
        });
        document.getElementById('btn-img-reset-filters')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => {
                if (obj.type !== 'image') return;
                obj.imgBrightness = 0; obj.imgContrast = 0; obj.imgSaturation = 0;
                obj.imgHue = 0; obj.imgBlur = 0; obj.imgGrayscale = 0;
                obj.imgSepia = 0; obj.imgInvert = 0; obj.imgTintAmount = 0;
            });
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        // ---- Color Palette Dashboard ----
        this._initColorPalette();

        // ---- Pin controls ----
        document.getElementById('pin-target')?.addEventListener('change', (e) => {
            const val = e.target.value || null;
            this.getSelectedObjects().forEach(obj => {
                obj.pinnedTo = val;
                if (!val) {
                    obj.pinTargetType = 'anchor';
                    obj.pinJointId = null;
                    obj.pinJointName = null;
                }
                if (val) {
                    // Auto-calculate offset from current position
                    const parent = this.getObjectById(val);
                    if (parent) {
                        this._capturePinTiltBaseForTarget(obj, parent);
                        const childPivot = obj.getPivotPoint();
                        const offset = this._getPinOffsetForChildTarget(parent, obj, childPivot.x, childPivot.y);
                        obj.pinOffsetX = offset.x;
                        obj.pinOffsetY = offset.y;
                    }
                }
            });
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('pin-parent-joint')?.addEventListener('change', (e) => {
            const jointId = e.target.value || '';
            this.getSelectedObjects().forEach(obj => {
                const parent = obj.pinnedTo ? this.getObjectById(obj.pinnedTo) : null;
                if (!parent) return;
                if (!jointId) {
                    obj.pinTargetType = 'anchor';
                    obj.pinJointId = null;
                    obj.pinJointName = null;
                } else {
                    const joint = (parent.joints || []).find(jt => jt.id === jointId) || null;
                    obj.pinTargetType = joint ? 'joint' : 'anchor';
                    obj.pinJointId = joint?.id || null;
                    obj.pinJointName = joint?.name || null;
                }
                this._capturePinTiltBaseForTarget(obj, parent);
                const childPivot = obj.getPivotPoint();
                const offset = this._getPinOffsetForChildTarget(parent, obj, childPivot.x, childPivot.y);
                obj.pinOffsetX = Math.round(offset.x);
                obj.pinOffsetY = Math.round(offset.y);
            });
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('pin-anchor-x')?.addEventListener('change', (e) => {
            const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5));
            this.getSelectedObjects().forEach(obj => { obj.pinAnchorX = val; });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('pin-anchor-y')?.addEventListener('change', (e) => {
            const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5));
            this.getSelectedObjects().forEach(obj => { obj.pinAnchorY = val; });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('pin-offset-x')?.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value) || 0;
            this.getSelectedObjects().forEach(obj => { obj.pinOffsetX = val; });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('pin-offset-y')?.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value) || 0;
            this.getSelectedObjects().forEach(obj => { obj.pinOffsetY = val; });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('pin-rotation-mode')?.addEventListener('change', (e) => {
            const mode = e.target.value;
            this.getSelectedObjects().forEach(obj => {
                const parent = obj.pinnedTo ? this.getObjectById(obj.pinnedTo) : null;
                obj.pinRotationMode = mode;
                obj.pinInheritRotation = mode === 'inherit';
                this._capturePinTiltBaseForTarget(obj, parent);
            });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('btn-pick-pin-point')?.addEventListener('click', () => {
            const objs = this.getSelectedObjects();
            if (objs.length !== 1 || !objs[0].pinnedTo) {
                Utils.showToast('Select a pinned object first (must have a parent set)', 'warning');
                return;
            }
            this._pinPickMode = true;
            this._pinPickObj = objs[0];
            this.stage.viewport.style.cursor = 'crosshair';
            Utils.showToast('Click on the parent object to set the pin anchor point...', 'info');
        });
        document.getElementById('pin-contour')?.addEventListener('change', (e) => {
            this.getSelectedObjects().forEach(obj => {
                obj.pinContour = e.target.checked;
                obj._cachedPivotColor = null;  // reset color cache
            });
            const opts = document.getElementById('pin-contour-opts');
            if (opts) opts.classList.toggle('hidden', !e.target.checked);
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('pin-contour-size')?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('pin-contour-size-val').textContent = val.toFixed(1);
            this.getSelectedObjects().forEach(obj => { obj.contourSize = val; });
            this.stage.requestRender();
        });
        document.getElementById('pin-contour-size')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('pin-contour-color')?.addEventListener('input', (e) => {
            this.getSelectedObjects().forEach(obj => { obj.contourColor = e.target.value; obj._cachedPivotColor = null; });
            this.stage.requestRender();
        });
        document.getElementById('pin-contour-color')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('pin-contour-auto-color')?.addEventListener('change', (e) => {
            const colorPicker = document.getElementById('pin-contour-color');
            if (e.target.checked) {
                this.getSelectedObjects().forEach(obj => { obj.contourColor = null; obj._cachedPivotColor = null; });
                if (colorPicker) colorPicker.disabled = true;
            } else {
                const color = colorPicker ? colorPicker.value : '#888888';
                this.getSelectedObjects().forEach(obj => { obj.contourColor = color; obj._cachedPivotColor = null; });
                if (colorPicker) colorPicker.disabled = false;
            }
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        // ---- Joint controls ----
        document.getElementById('joint-direction')?.addEventListener('change', (e) => {
            const direction = StageObject.normalizeJointDirection(e.target.value);
            this.getSelectedObjects().forEach(obj => { obj.jointDirection = direction; });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });
        document.getElementById('joint-contours')?.addEventListener('change', (e) => {
            const mode = this._getMainJointContourMode();
            this._getMainJointContourTargets(mode).forEach(obj => {
                if (mode === 'pin') obj.pinContour = e.target.checked;
                else obj.jointContours = e.target.checked;
            });
            const opts = document.getElementById('joint-contour-opts');
            if (opts) opts.classList.toggle('hidden', !e.target.checked);
            this.stage.requestRender();
            this.updateProperties();
            eventBus.emit('history:push');
        });
        document.getElementById('joint-contour-size')?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            document.getElementById('joint-contour-size-val').textContent = val.toFixed(1);
            this._getMainJointContourTargets().forEach(obj => { obj.contourSize = val; });
            this.stage.requestRender();
        });
        document.getElementById('joint-contour-size')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('joint-contour-rotation')?.addEventListener('input', (e) => {
            const val = parseInt(e.target.value) || 0;
            document.getElementById('joint-contour-rotation-val').textContent = val + '°';
            this._getMainJointContourTargets().forEach(obj => { obj.contourRotation = val; });
            this.stage.requestRender();
        });
        document.getElementById('joint-contour-rotation')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('joint-contour-fill-mode')?.addEventListener('change', (e) => {
            const mode = e.target.value || 'auto';
            this._getMainJointContourTargets().forEach(obj => {
                obj.contourFillMode = mode;
                if (mode === 'joint-texture') {
                    obj.contourColor = null;
                    obj.joints?.forEach(joint => { joint.contourColor = null; });
                }
            });
            this.stage.requestRender();
            this.updateProperties();
            eventBus.emit('history:push');
        });
        document.getElementById('joint-contour-color')?.addEventListener('input', (e) => {
            this._getMainJointContourTargets().forEach(obj => {
                obj.contourColor = e.target.value;
                if (!obj.contourFillMode || obj.contourFillMode === 'auto') obj.contourFillMode = 'solid';
            });
            this.stage.requestRender();
            this.updateProperties();
        });
        document.getElementById('joint-contour-color')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('joint-contour-pattern-type')?.addEventListener('change', (e) => {
            this._getMainJointContourTargets().forEach(obj => {
                obj.contourPatternType = e.target.value || 'stripes';
                obj.contourFillMode = 'pattern';
            });
            this.stage.requestRender();
            this.updateProperties();
            eventBus.emit('history:push');
        });
        document.getElementById('joint-contour-pattern-color')?.addEventListener('input', (e) => {
            this._getMainJointContourTargets().forEach(obj => {
                obj.contourPatternColor = e.target.value;
                obj.contourFillMode = 'pattern';
            });
            this.stage.requestRender();
        });
        document.getElementById('joint-contour-pattern-color')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('joint-contour-pattern-scale')?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!Number.isFinite(val)) return;
            this._getMainJointContourTargets().forEach(obj => {
                obj.contourPatternScale = Math.max(0.25, Math.min(4, val));
                obj.contourFillMode = 'pattern';
            });
            this.stage.requestRender();
        });
        document.getElementById('joint-contour-pattern-scale')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('joint-contour-grad-start')?.addEventListener('input', (e) => {
            this._getMainJointContourTargets().forEach(obj => { obj.contourGradientStart = e.target.value; });
            this.stage.requestRender();
        });
        document.getElementById('joint-contour-grad-start')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('joint-contour-grad-end')?.addEventListener('input', (e) => {
            this._getMainJointContourTargets().forEach(obj => { obj.contourGradientEnd = e.target.value; });
            this.stage.requestRender();
        });
        document.getElementById('joint-contour-grad-end')?.addEventListener('change', () => { eventBus.emit('history:push'); });
        document.getElementById('joint-contour-grad-angle')?.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            if (!Number.isFinite(val)) return;
            this._getMainJointContourTargets().forEach(obj => { obj.contourGradientAngle = val; });
            this.stage.requestRender();
        });
        document.getElementById('joint-contour-grad-angle')?.addEventListener('change', () => { eventBus.emit('history:push'); });

        /* Joint group collapsible toggles */
        document.querySelectorAll('.joint-group-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const groupId = toggle.getAttribute('data-group');
                const body = document.getElementById(groupId);
                if (!body) return;
                const isOpen = toggle.classList.contains('open');
                if (isOpen) {
                    toggle.classList.remove('open');
                    body.classList.add('collapsed');
                } else {
                    toggle.classList.add('open');
                    body.classList.remove('collapsed');
                }
            });
        });

        document.getElementById('btn-add-joint')?.addEventListener('click', () => {
            const objs = this.getSelectedObjects();
            if (objs.length === 0) return;
            this.cancelGuidedJointPlacement({ silent: true });
            this._jointPlaceMode = true;
            this._jointPlaceObj = objs[0];
            this._jointPlaceSpec = null;
            this.stage.viewport.style.cursor = 'crosshair';
            this._renderJointsList(objs[0]);
            this._showJointPlacementHint();
        });
        document.getElementById('btn-reset-joints')?.addEventListener('click', () => {
            const selected = this.getSelectedObjects();
            let internalCount = 0;
            let assemblyCount = 0;
            let changed = false;
            selected.forEach(obj => {
                if (Array.isArray(obj.joints) && obj.joints.length) {
                    obj.joints.forEach(joint => {
                        internalCount++;
                        if ((joint.angle || 0) !== 0) {
                            joint.angle = 0;
                            changed = true;
                        }
                    });
                }
                if (obj.pinnedTo && obj.pinMode === 'joint') {
                    assemblyCount++;
                    if ((obj.jointBaseAngle || 0) !== 0) {
                        obj.jointBaseAngle = 0;
                        changed = true;
                    }
                }
            });
            const obj = selected[0];
            if (obj) this._renderJointsList(obj);
            this.stage.requestRender();
            if (changed) {
                eventBus.emit('history:push');
                Utils.showToast(`Reset ${internalCount} part joint(s) and ${assemblyCount} assembly joint(s) to 0°`, 'success');
            } else if (internalCount > 0 || assemblyCount > 0) {
                Utils.showToast('Selected joints are already at 0°', 'info');
            } else {
                Utils.showToast('No joints found on selected objects', 'warning');
            }
        });
        document.getElementById('btn-reset-joint-edit-all')?.addEventListener('click', () => {
            this.resetSelectedJointEditingValues();
        });
        document.getElementById('btn-adv-prop-reset-part')?.addEventListener('click', () => {
            document.getElementById('btn-reset-joints')?.click();
        });
        document.getElementById('btn-adv-prop-reset-character')?.addEventListener('click', () => {
            this.resetSelectedJointEditingValues();
        });
        document.getElementById('btn-joint-editor-undo')?.addEventListener('click', () => {
            this.undoJointEditorChange();
        });
        document.getElementById('btn-joint-editor-redo')?.addEventListener('click', () => {
            this.redoJointEditorChange();
        });
        document.getElementById('btn-joint-editor-record-step')?.addEventListener('click', () => {
            this.recordJointEditorPropertyStep();
        });
        document.getElementById('btn-adv-prop-undo')?.addEventListener('click', () => {
            this.undoJointEditorChange();
        });
        document.getElementById('btn-adv-prop-redo')?.addEventListener('click', () => {
            this.redoJointEditorChange();
        });
        document.getElementById('btn-adv-prop-record-step')?.addEventListener('click', () => {
            this.recordJointEditorPropertyStep();
        });
        document.getElementById('btn-adv-prop-record-timeline')?.addEventListener('click', () => {
            this.recordAdvancedPropertiesToTimeline();
        });
        document.getElementById('btn-clear-joints')?.addEventListener('click', () => {
            this.getSelectedObjects().forEach(obj => { obj.joints = []; });
            const obj = this.getSelectedObjects()[0];
            if (obj) this._renderJointsList(obj);
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        document.getElementById('btn-transfer-joints')?.addEventListener('click', () => {
            this.transferJointsFromOverlay();
        });
        document.getElementById('btn-copy-joint-angles')?.addEventListener('click', () => {
            this.copySelectedJointAnglesFormatted();
        });
        document.getElementById('btn-copy-character-joint-angles')?.addEventListener('click', () => {
            this.copyCharacterJointAnglesFormatted();
        });

        // ---- Joint Assembly & Movements ----
        document.getElementById('btn-joint-guided-rig')?.addEventListener('click', () => {
            if (!window.app?.jointSystem) return;
            const selected = this.getSelectedObjects().filter(obj => obj.visible !== false);
            if (selected.length === 1 && selected[0].type === 'image') {
                Utils.showToast('For a single image, use Body Stencil or Smart Cut to create cutout joints first', 'info');
                window.app.jointSystem.showBodyStencil();
                return;
            }
            window.app.jointSystem.showGuidedRigWizard();
        });
        document.getElementById('btn-joint-assembly')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showAssemblyPanel();
        });
        document.getElementById('btn-joint-character-cutter')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showCharacterCutter();
        });
        document.getElementById('btn-joint-smartcut')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showSmartCut();
        });
        document.getElementById('btn-joint-stencil')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showBodyStencil();
        });
        document.getElementById('btn-joint-slicer')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showBodySlicer();
        });
        document.getElementById('btn-joint-uc')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.openUniversalCharacterDialog();
        });
        document.getElementById('btn-joint-uc-fit-image')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.openUniversalCharacterImageFitPanel();
        });

        // ---- Rig Character Decision Tree ----
        document.getElementById('rig-path-single-image')?.addEventListener('click', () => {
            if (!window.app?.jointSystem) return;
            const selected = this.getSelectedObjects().filter(o => o.type === 'image' && o.visible !== false);
            if (selected.length === 0) {
                Utils.showToast('Select an image first, then choose a cutting method', 'warning');
                return;
            }
            // Scroll down to the cutting buttons and highlight them briefly
            const btns = document.querySelectorAll('#btn-joint-character-cutter, #btn-joint-smartcut, #btn-joint-stencil, #btn-joint-slicer');
            btns.forEach(b => { b.classList.add('rig-highlight'); setTimeout(() => b.classList.remove('rig-highlight'), 2000); });
            btns[0]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            Utils.showToast('Choose Character Cutter, Smart Cut, Body Stencil, or Body Slicer below', 'info');
        });
        document.getElementById('rig-path-separate-parts')?.addEventListener('click', () => {
            if (!window.app?.jointSystem) return;
            const selected = this.getSelectedObjects().filter(o => o.visible !== false);
            if (selected.length < 2) {
                Utils.showToast('Select 2 or more body-part images to assemble', 'warning');
                return;
            }
            window.app.jointSystem.showGuidedRigWizard();
        });
        document.getElementById('rig-path-generate')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.openUniversalCharacterDialog();
        });

        document.getElementById('btn-joint-attach')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showAttachToArmature();
        });
        document.getElementById('btn-joint-detach')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.detachFromArmature();
        });

        document.getElementById('btn-joint-movements')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showMovementPicker();
        });
        document.getElementById('btn-joint-poses')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.showPoseLibrary();
        });
        document.getElementById('btn-joint-expressions')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.openFacialExpressionPicker();
        });
        document.getElementById('btn-joint-body-tags')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.toggleBodyTagMode();
        });
        document.getElementById('btn-joint-copy-opposite')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.copyPoseToOpposite();
        });
        document.getElementById('btn-joint-mirror')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.mirrorPose();
        });
        document.getElementById('btn-joint-tune')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.toggleJointTuneMode();
        });
        document.getElementById('btn-joint-skeleton')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.toggleSkeleton();
        });
        document.getElementById('btn-joint-arcs')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.toggleConstraintArcs();
        });
        document.getElementById('btn-joint-ragdoll')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.ragdollDrop();
        });
        document.getElementById('btn-joint-randomize')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.randomizePose();
        });
        document.getElementById('btn-joint-reset')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.resetPose();
        });
        document.getElementById('btn-joint-armature')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.openArmaturePanel();
        });
        document.getElementById('btn-joint-armature-front-dummy')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.createFrontPoseArmatureDummy();
        });
        document.getElementById('btn-joint-armature-side-dummy')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.createSidePoseArmatureDummy();
        });
        document.getElementById('btn-joint-armature-side-dual-dummy')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.createSideDualArmPoseArmatureDummy();
        });
        document.getElementById('btn-joint-silhouette-rig')?.addEventListener('click', () => {
            if (window.app?.jointSystem?.createSilhouetteRigDummy) window.app.jointSystem.createSilhouetteRigDummy();
        });
        document.getElementById('btn-joint-done')?.addEventListener('click', () => {
            if (window.app?.jointSystem) window.app.jointSystem.exitJointMode();
        });

        // ---- Joint base angle (for 'joint' pin rotation mode) ----
        document.getElementById('pin-rotation-mode')?.addEventListener('change', (e) => {
            const field = document.getElementById('joint-base-angle-field');
            if (field) field.classList.toggle('hidden', e.target.value !== 'joint');
        });
        document.getElementById('pin-joint-base-angle')?.addEventListener('change', (e) => {
            const val = parseFloat(e.target.value) || 0;
            this.getSelectedObjects().forEach(obj => { obj.jointBaseAngle = val; });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        // Pivot point controls
        document.getElementById('pivot-show')?.addEventListener('change', (e) => {
            this.getSelectedObjects().forEach(obj => { obj.showPivot = e.target.checked; });
            this.stage.requestRender();
            eventBus.emit('history:push');
        });

        document.getElementById('pivot-x')?.addEventListener('change', (e) => {
            const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5));
            this.getSelectedObjects().forEach(obj => { obj.adjustPivot(val, obj.pivotY ?? 0.5); });
            this.updatePivotGrid();
            this.stage.requestRender();
            eventBus.emit('object:updated', this.getSelectedObjects()[0]);
            eventBus.emit('history:push');
        });

        document.getElementById('pivot-y')?.addEventListener('change', (e) => {
            const val = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0.5));
            this.getSelectedObjects().forEach(obj => { obj.adjustPivot(obj.pivotX ?? 0.5, val); });
            this.updatePivotGrid();
            this.stage.requestRender();
            eventBus.emit('object:updated', this.getSelectedObjects()[0]);
            eventBus.emit('history:push');
        });

        document.querySelectorAll('.pivot-preset-btn[data-pivot]').forEach(btn => {
            btn.addEventListener('click', () => {
                const [px, py] = btn.dataset.pivot.split(',').map(Number);
                const objs = this.getSelectedObjects();
                objs.forEach(obj => { obj.adjustPivot(px, py); });
                document.getElementById('pivot-x').value = px;
                document.getElementById('pivot-y').value = py;
                this.updatePivotGrid();
                this.stage.requestRender();
                eventBus.emit('object:updated', objs[0]);
                eventBus.emit('history:push');
            });
        });
    },

    _bindAdvancedPartPropertyEvents() {
        const root = document.getElementById('advanced-part-properties-section');
        if (!root || root.dataset.bound === '1') return;
        root.dataset.bound = '1';

        root.addEventListener('change', (event) => {
            const target = event.target;
            if (!target) return;
            if (target.id === 'adv-prop-show-changed-only') {
                this._refreshAdvancedChangedVisibility?.();
                return;
            }
            if (target.id === 'adv-joint-wheel-step') {
                this._setAdvancedJointWheelStep(target.value);
                return;
            }
            if (target.dataset?.advProp) {
                this._applyAdvancedPartProperty(target.dataset.advProp, target.value);
                return;
            }
            if (target.dataset?.advJointIndex != null && target.dataset?.advJointProp) {
                this._applyAdvancedJointProperty(
                    parseInt(target.dataset.advJointIndex, 10),
                    target.dataset.advJointProp,
                    target.value
                );
            }
        });

        root.addEventListener('click', (event) => {
            const batchButton = event.target?.closest?.('#btn-adv-joint-batch-toggle, #btn-adv-joint-batch-apply, #btn-adv-joint-batch-cancel');
            if (batchButton && root.contains(batchButton)) {
                event.preventDefault();
                if (batchButton.id === 'btn-adv-joint-batch-toggle') this._startAdvancedJointBatch?.();
                if (batchButton.id === 'btn-adv-joint-batch-apply') this._applyAdvancedJointBatch?.();
                if (batchButton.id === 'btn-adv-joint-batch-cancel') this._cancelAdvancedJointBatch?.();
                return;
            }
            const reset = event.target?.closest?.('[data-adv-reset]');
            if (reset && root.contains(reset)) {
                event.preventDefault();
                this._resetAdvancedPartGroup?.(reset.dataset.advReset);
                return;
            }
            const toggle = event.target?.closest?.('[data-adv-prop-collapse]');
            if (!toggle || !root.contains(toggle)) return;
            event.preventDefault();
            const key = toggle.dataset.advPropCollapse;
            const group = root.querySelector(`[data-adv-prop-group="${key}"]`);
            if (!group) return;
            group.classList.toggle('is-collapsed');
        });

        root.addEventListener('pointerdown', (event) => {
            const wheel = event.target?.closest?.('.adv-joint-wheel');
            if (!wheel || !root.contains(wheel)) return;
            const index = parseInt(wheel.dataset.advJointIndex, 10);
            const obj = this.getSelectedObjects?.()[0];
            const joint = obj?.joints?.[index];
            if (!obj || !joint) return;

            event.preventDefault();
            const batching = this._beginAdvancedJointBatchEdit(obj);
            if (!batching && this._isRecording) this._snapshotForRecording(true);

            const rect = wheel.getBoundingClientRect();
            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const startPointerAngle = Math.atan2(event.clientY - cy, event.clientX - cx) * 180 / Math.PI;
            const startJointAngle = Number(joint.angle) || 0;
            const wheelStep = this._getAdvancedJointWheelStep();
            let changed = false;

            const angleDelta = (current, start) => {
                let delta = current - start;
                while (delta > 180) delta -= 360;
                while (delta < -180) delta += 360;
                return delta;
            };
            const setJointAngle = (clientX, clientY) => {
                const pointerAngle = Math.atan2(clientY - cy, clientX - cx) * 180 / Math.PI;
                let next = startJointAngle + angleDelta(pointerAngle, startPointerAngle);
                if (wheelStep > 0) next = Math.round(next / wheelStep) * wheelStep;
                next = Math.round(next * 10) / 10;
                if (Math.abs((Number(joint.angle) || 0) - next) <= 0.0005) return;
                joint.angle = next;
                changed = true;
                wheel.style.setProperty('--angle', `${next}deg`);
                const input = root.querySelector(`[data-adv-joint-index="${index}"][data-adv-joint-prop="angle"]`);
                if (input) input.value = this._formatAdvancedNumber(next, 0, 1);
                if (batching) this._previewAdvancedJointBatchEdit(obj);
                else {
                    this.stage?.requestRender?.();
                    eventBus.emit('object:updated', obj);
                }
            };

            const onMove = (moveEvent) => {
                moveEvent.preventDefault();
                setJointAngle(moveEvent.clientX, moveEvent.clientY);
            };
            const onUp = (upEvent) => {
                upEvent.preventDefault();
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);
                document.removeEventListener('pointercancel', onUp);
                try { wheel.releasePointerCapture?.(event.pointerId); } catch (_) { /* capture may already be gone */ }
                if (!changed) return;
                if (batching) {
                    this._markAdvancedJointBatchDirty?.(obj);
                    this._syncAdvancedJointBatchUi?.();
                } else {
                    this._commitAdvancedPartPropertyEdit(obj);
                    this._updateAdvancedPartProperties?.(obj);
                }
            };

            try { wheel.setPointerCapture?.(event.pointerId); } catch (_) { /* pointer capture is a convenience */ }
            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
            document.addEventListener('pointercancel', onUp);
        });

        root.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter') return;
            const target = event.target;
            if (!target?.dataset?.advProp) return;
            event.preventDefault();
            target.blur();
        });

        document.getElementById('btn-adv-copy-part-props')?.addEventListener('click', () => {
            const obj = this.getSelectedObjects?.()[0];
            if (!obj) {
                Utils.showToast?.('Select a part first.', 'warning');
                return;
            }
            const format = document.getElementById('adv-prop-copy-format')?.value || 'readable';
            if (format === 'readable' && typeof this.copyProperties === 'function') {
                this.copyProperties(obj);
                return;
            }
            this._copyAdvancedPartProperties?.(obj, format);
        });

        document.getElementById('btn-adv-copy-character-props')?.addEventListener('click', () => {
            const obj = this.getSelectedObjects?.()[0];
            const armature = this._getAdvancedSelectedArmature?.(obj);
            const format = document.getElementById('adv-prop-copy-format')?.value || 'readable';
            if (armature?.root && typeof this.copyCharacterProperties === 'function') {
                if (format !== 'readable') {
                    this._copyAdvancedCharacterProperties?.(armature, format);
                    return;
                }
                this.copyCharacterProperties(armature);
                return;
            }
            Utils.showToast?.('Select a Universal Character or Pose Armature part first.', 'warning');
        });
        document.getElementById('btn-adv-copy-character-pose-code')?.addEventListener('click', async () => {
            const obj = this.getSelectedObjects?.()[0];
            const armature = this._getAdvancedSelectedArmature?.(obj);
            const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
            if (!armature?.root || typeof jointSystem?._copyCurrentArmaturePoseCode !== 'function') {
                Utils.showToast?.('Select a Universal Character or Pose Armature part first.', 'warning');
                return;
            }
            await jointSystem._copyCurrentArmaturePoseCode(armature);
        });

        document.getElementById('btn-adv-copy-character-movement-code')?.addEventListener('click', async () => {
            const obj = this.getSelectedObjects?.()[0];
            const armature = this._getAdvancedSelectedArmature?.(obj);
            const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
            if (!armature?.root || typeof jointSystem?._copyCurrentArmatureMovementCode !== 'function') {
                Utils.showToast?.('Select a Universal Character or Pose Armature part first.', 'warning');
                return;
            }
            await jointSystem._copyCurrentArmatureMovementCode(armature);
        });

        const canCopyCode = !!(window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem)?._canCopyArmatureCatalogCode?.();
        ['btn-adv-copy-character-pose-code', 'btn-adv-copy-character-movement-code'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            btn.style.display = canCopyCode ? '' : 'none';
        });

        let storedWheelStep = 1;
        try { storedWheelStep = localStorage.getItem('animstage.advancedJointWheelStep') || 1; } catch (_) { storedWheelStep = 1; }
        this._setAdvancedJointWheelStep(this._advancedJointWheelStep ?? storedWheelStep);
        this._syncAdvancedJointBatchUi?.();
    },

    _setAdvancedInput(id, value) {
        const el = document.getElementById(id);
        if (el) el.value = value == null ? '' : value;
    },

    _formatAdvancedNumber(value, fallback = 0, decimals = 2) {
        const n = Number(value);
        if (!Number.isFinite(n)) return String(fallback);
        const p = Math.pow(10, decimals);
        return String(Math.round(n * p) / p);
    },

    _getAdvancedDrawZ(obj) {
        const list = typeof this._getLiveDrawOrderList === 'function'
            ? this._getLiveDrawOrderList(this.objects)
            : (Array.isArray(this.objects) ? this.objects : []);
        const index = list.indexOf(obj);
        if (index < 0) return '';
        return `${list.length - index} / ${list.length}`;
    },

    _usesArmatureDrawLayer(obj) {
        if (!obj) return false;
        if (obj._armatureRoleKey || obj.armatureRoleKey || obj._armaturePartKey || obj.armaturePartKey) return true;
        if (obj._ucGarmentLayer || obj.ucGarmentLayer || obj._ucGarmentPartKey || obj.ucGarmentPartKey) return true;
        if (obj.bodyPartData?.partKey || obj.bodyPartData?.roleKey) return true;
        return Array.isArray(obj.joints) && obj.joints.length > 0;
    },

    _getAdvancedLayerValue(obj) {
        if (this._usesArmatureDrawLayer(obj)) {
            const armatureLayer = Number(obj?._armatureDrawLayer ?? obj?.armatureDrawLayer);
            if (Number.isFinite(armatureLayer)) return Math.round(armatureLayer);
            const numericLayer = Number(obj?.layer);
            return Number.isFinite(numericLayer) ? Math.round(numericLayer) : 0;
        }
        const numericLayer = Number(obj?.layer);
        return Number.isFinite(numericLayer) ? Math.round(numericLayer) : 0;
    },

    _getAdvancedSelectedArmature(obj = this.getSelectedObjects?.()[0]) {
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        return jointSystem?._detectSelectedArmature?.() ||
            (obj ? jointSystem?._detectArmature?.(obj) : null) ||
            jointSystem?._currentArmature ||
            null;
    },

    _getAdvancedPartRole(obj) {
        return obj?._armatureRoleKey || obj?.armatureRoleKey || obj?._armaturePartKey || obj?.armaturePartKey || obj?._ucGarmentRoleKey || obj?.ucGarmentRoleKey || '';
    },

    _setAdvancedBadgeText(id, text, kind = '') {
        const el = document.getElementById(id);
        if (!el) return;
        el.textContent = text || '';
        el.className = `advanced-prop-badge ${kind}`.trim();
    },

    _updateAdvancedLayerBadges(obj) {
        const badges = document.getElementById('adv-prop-layer-badges');
        const note = document.getElementById('adv-prop-layer-note');
        if (!badges) return;
        const role = this._getAdvancedPartRole(obj);
        const isArmatureLayer = this._usesArmatureDrawLayer(obj);
        const layerValue = this._getAdvancedLayerValue(obj);
        const drawZ = this._getAdvancedDrawZ(obj);
        const animated = Array.isArray(obj?.animations) && obj.animations.length > 0;
        badges.innerHTML = [
            `<span class="advanced-prop-badge">Layer ${layerValue}</span>`,
            drawZ ? `<span class="advanced-prop-badge">Draw Z ${drawZ}</span>` : '',
            isArmatureLayer ? `<span class="advanced-prop-badge warning">Armature draw order</span>` : `<span class="advanced-prop-badge">Manual layer</span>`,
            role ? `<span class="advanced-prop-badge">${this._escapeHtml?.(role) || role}</span>` : '',
            obj?.pinnedTo ? `<span class="advanced-prop-badge">Pinned</span>` : '',
            animated ? `<span class="advanced-prop-badge active">${obj.animations.length} anim</span>` : ''
        ].filter(Boolean).join('');
        if (note) {
            note.textContent = isArmatureLayer
                ? 'Layer edits update the armature draw layer used by pose/movement rendering.'
                : 'Layer edits update the object layer directly.';
        }
    },

    _markAdvancedFieldChanged(id, changed) {
        const el = document.getElementById(id);
        const field = el?.closest?.('.prop-field');
        if (!field) return;
        field.classList.toggle('advanced-prop-changed', !!changed);
    },

    _isAdvancedValueChanged(value, neutral, epsilon = 0.0005) {
        const a = Number(value);
        const b = Number(neutral);
        if (Number.isFinite(a) && Number.isFinite(b)) return Math.abs(a - b) > epsilon;
        return String(value ?? '') !== String(neutral ?? '');
    },

    _refreshAdvancedChangedMarkers(obj) {
        const section = document.getElementById('advanced-part-properties-section');
        if (!section || !obj) return;
        const fields = {
            'adv-prop-name': false,
            'adv-prop-id': false,
            'adv-prop-type': false,
            'adv-prop-x': false,
            'adv-prop-y': false,
            'adv-prop-width': false,
            'adv-prop-height': false,
            'adv-prop-layer': this._usesArmatureDrawLayer(obj) && Number.isFinite(Number(obj?._armatureDrawLayer ?? obj?.armatureDrawLayer)),
            'adv-prop-draw-z': false,
            'adv-prop-rotation': this._isAdvancedValueChanged(obj.rotation, 0),
            'adv-prop-opacity': this._isAdvancedValueChanged(Math.round((Number.isFinite(Number(obj.opacity)) ? Number(obj.opacity) : 1) * 100), 100),
            'adv-prop-tilt-x': this._isAdvancedValueChanged(obj.tiltX, 0),
            'adv-prop-tilt-y': this._isAdvancedValueChanged(obj.tiltY, 0),
            'adv-prop-pivot-x': this._isAdvancedValueChanged(obj.pivotX ?? 0.5, 0.5),
            'adv-prop-pivot-y': this._isAdvancedValueChanged(obj.pivotY ?? 0.5, 0.5),
            'adv-prop-pinned-to': !!obj.pinnedTo,
            'adv-prop-pin-target': !!(obj.pinTargetType || obj.pinJointName),
            'adv-prop-pin-offset-x': this._isAdvancedValueChanged(obj.pinOffsetX, 0),
            'adv-prop-pin-offset-y': this._isAdvancedValueChanged(obj.pinOffsetY, 0),
            'adv-prop-pin-anchor-x': this._isAdvancedValueChanged(obj.pinAnchorX ?? 0.5, 0.5),
            'adv-prop-pin-anchor-y': this._isAdvancedValueChanged(obj.pinAnchorY ?? 0.5, 0.5)
        };
        Object.entries(fields).forEach(([id, changed]) => this._markAdvancedFieldChanged(id, changed));
        section.querySelectorAll('.advanced-prop-group').forEach(group => {
            const count = group.querySelectorAll('.advanced-prop-changed, .advanced-joint-row.advanced-prop-changed').length;
            group.classList.toggle('has-changed-values', count > 0);
            group.dataset.changedCount = String(count);
            const header = group.querySelector('.advanced-prop-group-header');
            if (header) header.dataset.count = count > 0 ? String(count) : '';
        });
        this._refreshAdvancedChangedVisibility();
    },

    _refreshAdvancedChangedVisibility() {
        const section = document.getElementById('advanced-part-properties-section');
        const checked = !!document.getElementById('adv-prop-show-changed-only')?.checked;
        section?.classList.toggle('show-changed-only', checked);
    },

    _collectAdvancedPartData(obj) {
        if (!obj) return null;
        return {
            name: obj.name || '',
            id: obj.id || '',
            type: obj.type || '',
            role: this._getAdvancedPartRole(obj),
            layer: this._getAdvancedLayerValue(obj),
            drawZ: this._getAdvancedDrawZ(obj),
            x: Number(obj.x) || 0,
            y: Number(obj.y) || 0,
            width: Number(obj.width) || 0,
            height: Number(obj.height) || 0,
            rotation: Number(obj.rotation) || 0,
            tiltX: Number(obj.tiltX) || 0,
            tiltY: Number(obj.tiltY) || 0,
            pivotX: obj.pivotX ?? 0.5,
            pivotY: obj.pivotY ?? 0.5,
            opacity: Number.isFinite(Number(obj.opacity)) ? Number(obj.opacity) : 1,
            pinnedTo: obj.pinnedTo || '',
            pinTarget: obj.pinTargetType || (obj.pinJointName ? 'joint' : ''),
            pinJointName: obj.pinJointName || '',
            pinOffsetX: Number(obj.pinOffsetX) || 0,
            pinOffsetY: Number(obj.pinOffsetY) || 0,
            pinAnchorX: obj.pinAnchorX ?? 0.5,
            pinAnchorY: obj.pinAnchorY ?? 0.5,
            joints: (Array.isArray(obj.joints) ? obj.joints : []).map(j => ({
                name: j.name || '',
                angle: Number(j.angle) || 0,
                tiltX: Number(j.tiltX) || 0,
                tiltY: Number(j.tiltY) || 0,
                contourSize: Number(j.contourSize ?? j.discSize ?? j.radius ?? 1) || 1
            })),
            animations: Array.isArray(obj.animations) ? obj.animations.map(a => ({ ...a })) : []
        };
    },

    _buildAdvancedPoseTemplate(parts, label = 'Copied Pose') {
        const jointAngles = {};
        const partAngles = {};
        parts.forEach(part => {
            const role = part.role || String(part.name || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
            if (role && Math.abs(Number(part.rotation) || 0) > 0.0005) partAngles[role] = Number(part.rotation) || 0;
            (part.joints || []).forEach(joint => {
                if (!joint.name || Math.abs(Number(joint.angle) || 0) <= 0.0005) return;
                jointAngles[joint.name] = Number(joint.angle) || 0;
            });
        });
        return `// Animation Stage - ${label}\nconst copiedPose = ${JSON.stringify({
            key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'copied-pose',
            name: label,
            category: 'Custom',
            jointAngles,
            partAngles,
            contacts: {}
        }, null, 2)};\n\nconst jointSystem = app?.jointSystem || window.app?.jointSystem || window.jointSystem;\nconst selectedRaw = selected?.raw || stage.selected?.raw || null;\nconst armature = jointSystem?._detectSelectedArmature?.() || (selectedRaw ? jointSystem?._detectArmature?.(selectedRaw) : null) || jointSystem?._currentArmature;\nif (!armature?.root) {\n  Utils.showToast('Select a compatible character or pose armature first.', 'warning');\n  return;\n}\njointSystem._applyArmaturePose?.(armature, copiedPose);\nstage.render?.();`;
    },

    _copyAdvancedText(text, message = 'Copied to clipboard') {
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text)
                .then(() => Utils.showToast?.(message, 'success'))
                .catch(() => this._copyAdvancedTextFallback(text, message));
            return;
        }
        this._copyAdvancedTextFallback(text, message);
    },

    _copyAdvancedTextFallback(text, message) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            Utils.showToast?.(message, 'success');
        } catch (_) {
            Utils.showToast?.('Could not copy to clipboard.', 'error');
        } finally {
            textarea.remove();
        }
    },

    _copyAdvancedPartProperties(obj, format = 'json') {
        const data = this._collectAdvancedPartData(obj);
        if (!data) return;
        const text = format === 'pose'
            ? this._buildAdvancedPoseTemplate([data], `${data.name || 'Part'} Pose`)
            : JSON.stringify(data, null, 2);
        this._copyAdvancedText(text, format === 'pose' ? 'Part pose template copied.' : 'Part JSON copied.');
    },

    _copyAdvancedCharacterProperties(armature, format = 'json') {
        const partsMap = armature?.parts || {};
        const parts = Object.entries(partsMap)
            .map(([role, part]) => {
                const raw = part?.raw || part;
                const data = this._collectAdvancedPartData(raw);
                if (data && !data.role) data.role = role;
                return data;
            })
            .filter(Boolean);
        if (!parts.length) {
            Utils.showToast?.('No character parts found to copy.', 'warning');
            return;
        }
        const text = format === 'pose'
            ? this._buildAdvancedPoseTemplate(parts, `${armature.root?.name || 'Character'} Pose`)
            : JSON.stringify({
                name: armature.root?.name || 'Character',
                rootId: armature.root?.id || '',
                parts
            }, null, 2);
        this._copyAdvancedText(text, format === 'pose' ? 'Character pose template copied.' : 'Character JSON copied.');
    },

    _resetAdvancedPartGroup(groupKey) {
        const obj = this.getSelectedObjects?.()[0];
        if (!obj) {
            Utils.showToast?.('Select a part first.', 'warning');
            return;
        }
        let changed = false;
        const setNumber = (key, value) => {
            const current = Number(obj[key]);
            if (!Number.isFinite(current) || Math.abs(current - value) > 0.0005) {
                obj[key] = value;
                changed = true;
            }
        };
        const setValue = (key, value) => {
            if (obj[key] !== value) {
                obj[key] = value;
                changed = true;
            }
        };

        if (groupKey === 'transform') {
            setNumber('rotation', 0);
            setNumber('opacity', 1);
            setNumber('pivotX', 0.5);
            setNumber('pivotY', 0.5);
            setNumber('tiltX', 0);
            setNumber('tiltY', 0);
        } else if (groupKey === 'tilt') {
            setNumber('tiltX', 0);
            setNumber('tiltY', 0);
        } else if (groupKey === 'layering') {
            if (obj._armatureDrawLayer != null) {
                delete obj._armatureDrawLayer;
                changed = true;
            }
            if (obj.armatureDrawLayer != null) {
                delete obj.armatureDrawLayer;
                changed = true;
            }
        } else if (groupKey === 'pinning') {
            ['pinnedTo', 'pinTargetType', 'pinJointName'].forEach(key => setValue(key, ''));
            setNumber('pinOffsetX', 0);
            setNumber('pinOffsetY', 0);
            setNumber('pinAnchorX', 0.5);
            setNumber('pinAnchorY', 0.5);
        } else if (groupKey === 'joints') {
            if (typeof this._resetObjectJointPoseToNeutral === 'function') {
                changed = this._resetObjectJointPoseToNeutral(obj) > 0 || changed;
            } else if (Array.isArray(obj.joints)) {
                obj.joints.forEach(joint => {
                    ['angle', 'tiltX', 'tiltY'].forEach(key => {
                        if (Math.abs((Number(joint[key]) || 0)) > 0.0005) {
                            joint[key] = 0;
                            changed = true;
                        }
                    });
                });
            }
        }

        if (!changed) {
            this._updateAdvancedPartProperties(obj);
            Utils.showToast?.('Nothing to reset in this section.', 'info');
            return;
        }
        this._commitAdvancedPartPropertyEdit(obj);
        this._updateAdvancedPartProperties(obj);
        Utils.showToast?.('Section reset.', 'success');
    },

    _updateAdvancedPartProperties(obj, selected = this.getSelectedObjects?.() || []) {
        const section = document.getElementById('advanced-part-properties-section');
        if (!section) return;
        if (!obj) {
            section.classList.add('hidden');
            return;
        }
        section.classList.remove('hidden');

        const summary = document.getElementById('adv-part-summary');
        if (summary) {
            const role = this._getAdvancedPartRole(obj);
            const pin = obj.pinnedTo ? `Pinned to ${this._getObjectNameById?.(obj.pinnedTo) || obj.pinnedTo}` : 'Not pinned';
            const multi = selected.length > 1 ? `; editing first of ${selected.length}` : '';
            summary.textContent = `${obj.name || obj.type || 'Object'}${role ? ` (${role})` : ''}; ${pin}${multi}`;
        }

        this._setAdvancedInput('adv-prop-name', obj.name || '');
        this._setAdvancedInput('adv-prop-id', obj.id || '');
        this._setAdvancedInput('adv-prop-type', obj.type || '');
        this._setAdvancedInput('adv-prop-layer', this._getAdvancedLayerValue(obj));
        this._setAdvancedInput('adv-prop-draw-z', this._getAdvancedDrawZ(obj));
        this._setAdvancedInput('adv-prop-x', Math.round(Number(obj.x) || 0));
        this._setAdvancedInput('adv-prop-y', Math.round(Number(obj.y) || 0));
        this._setAdvancedInput('adv-prop-width', Math.max(1, Math.round(Number(obj.width) || 1)));
        this._setAdvancedInput('adv-prop-height', Math.max(1, Math.round(Number(obj.height) || 1)));
        this._setAdvancedInput('adv-prop-rotation', this._formatAdvancedNumber(obj.rotation, 0, 2));
        this._setAdvancedInput('adv-prop-opacity', Math.round((Number.isFinite(Number(obj.opacity)) ? Number(obj.opacity) : 1) * 100));
        this._setAdvancedInput('adv-prop-tilt-x', this._formatAdvancedNumber(obj.tiltX, 0, 2));
        this._setAdvancedInput('adv-prop-tilt-y', this._formatAdvancedNumber(obj.tiltY, 0, 2));
        this._setAdvancedInput('adv-prop-limb-mode', obj.limbLengthMode || 'natural');
        this._setAdvancedInput('adv-prop-limb-compensation', obj.limbLengthCompensation ?? .5);
        this._setAdvancedInput('adv-prop-reach-stretch', obj.limbReachStretch ?? 0);
        document.getElementById('adv-prop-limb-compensation').disabled = obj.limbLengthMode !== 'preserve';
        document.getElementById('adv-prop-reach-stretch').disabled = obj.limbLengthMode !== 'reach';
        this._setAdvancedInput('adv-prop-pivot-x', this._formatAdvancedNumber(obj.pivotX ?? 0.5, 0.5, 3));
        this._setAdvancedInput('adv-prop-pivot-y', this._formatAdvancedNumber(obj.pivotY ?? 0.5, 0.5, 3));
        this._setAdvancedInput('adv-prop-pinned-to', obj.pinnedTo ? (this._getObjectNameById?.(obj.pinnedTo) || obj.pinnedTo) : '');
        this._setAdvancedInput('adv-prop-pin-target', obj.pinTargetType || (obj.pinJointName ? 'joint' : ''));
        this._setAdvancedInput('adv-prop-pin-offset-x', this._formatAdvancedNumber(obj.pinOffsetX, 0, 2));
        this._setAdvancedInput('adv-prop-pin-offset-y', this._formatAdvancedNumber(obj.pinOffsetY, 0, 2));
        this._setAdvancedInput('adv-prop-pin-anchor-x', this._formatAdvancedNumber(obj.pinAnchorX ?? 0.5, 0.5, 3));
        this._setAdvancedInput('adv-prop-pin-anchor-y', this._formatAdvancedNumber(obj.pinAnchorY ?? 0.5, 0.5, 3));

        this._renderAdvancedJointRows(obj);
        this._updateAdvancedLayerBadges(obj);
        this._refreshAdvancedChangedMarkers(obj);
        this._ensureAdvancedTimelineBaseline(obj, selected);
    },

    _renderAdvancedJointRows(obj) {
        const editor = document.getElementById('adv-joint-editor');
        const rows = document.getElementById('adv-joint-rows');
        if (!editor || !rows) return;
        const joints = Array.isArray(obj?.joints) ? obj.joints : [];
        if (!joints.length) {
            editor.classList.add('hidden');
            rows.innerHTML = '';
            return;
        }
        editor.classList.remove('hidden');
        const esc = (value) => (typeof this._escapeHtml === 'function'
            ? this._escapeHtml(value)
            : String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'));
        rows.innerHTML = joints.map((joint, index) => {
            const name = joint.name || `Joint ${index + 1}`;
            const angle = this._formatAdvancedNumber(joint.angle, 0, 2);
            const tiltX = this._formatAdvancedNumber(joint.tiltX, 0, 2);
            const tiltY = this._formatAdvancedNumber(joint.tiltY, 0, 2);
            const size = this._formatAdvancedNumber(joint.contourSize ?? joint.discSize ?? joint.radius ?? 1, 1, 2);
            const changed = this._isAdvancedValueChanged(joint.angle, 0) ||
                this._isAdvancedValueChanged(joint.tiltX, 0) ||
                this._isAdvancedValueChanged(joint.tiltY, 0) ||
                this._isAdvancedValueChanged(joint.contourSize ?? joint.discSize ?? joint.radius ?? 1, 1);
            return `
                <div class="advanced-joint-row${changed ? ' advanced-prop-changed' : ''}">
                    <div class="advanced-joint-name" title="${esc(name)}">${esc(name)}</div>
                    <button type="button" class="adv-joint-wheel" data-adv-joint-index="${index}" style="--angle:${Number(angle) || 0}deg" title="Drag to rotate ${esc(name)} angle">
                        <span></span>
                    </button>
                    <label>Angle<input type="number" step="1" data-adv-joint-index="${index}" data-adv-joint-prop="angle" value="${angle}"></label>
                    <label>Tilt X<input type="number" step="1" data-adv-joint-index="${index}" data-adv-joint-prop="tiltX" value="${tiltX}"></label>
                    <label>Tilt Y<input type="number" step="1" data-adv-joint-index="${index}" data-adv-joint-prop="tiltY" value="${tiltY}"></label>
                    <label>Disc<input type="number" min="0" step="0.1" data-adv-joint-index="${index}" data-adv-joint-prop="contourSize" value="${size}"></label>
                </div>
            `;
        }).join('');
        this._syncAdvancedJointBatchUi?.();
    },

    _getAdvancedJointWheelStep() {
        const raw = document.getElementById('adv-joint-wheel-step')?.value ?? this._advancedJointWheelStep ?? 1;
        const value = parseFloat(raw);
        if (!Number.isFinite(value)) return 1;
        return Math.max(0.1, Math.min(90, value));
    },

    _setAdvancedJointWheelStep(rawValue) {
        const value = Math.max(0.1, Math.min(90, parseFloat(rawValue) || 1));
        this._advancedJointWheelStep = value;
        const input = document.getElementById('adv-joint-wheel-step');
        if (input) input.value = this._formatAdvancedNumber(value, 1, 1);
        try { localStorage.setItem('animstage.advancedJointWheelStep', String(value)); } catch (_) { /* storage may be unavailable */ }
        return value;
    },

    _isAdvancedJointBatchActive() {
        return !!this._advancedJointBatch?.active;
    },

    _startAdvancedJointBatch() {
        if (this._isAdvancedJointBatchActive()) {
            Utils.showToast?.('Batch staging is already active. Adjust multiple fields, then Apply Batch.', 'info');
            return;
        }
        this._advancedJointBatch = {
            active: true,
            dirty: false,
            objects: new Set(),
            snapshots: new Map(),
            recordingSnapshotted: false
        };
        this._syncAdvancedJointBatchUi();
        Utils.showToast?.('Batch staging on. Edits preview live until Apply Batch.', 'info');
    },

    _snapshotAdvancedBatchObjects(objects = []) {
        const out = new Map();
        const props = [
            'x', 'y', 'width', 'height', 'rotation', 'tiltX', 'tiltY', 'scaleX', 'scaleY', 'opacity',
            'pivotX', 'pivotY', 'pinAnchorX', 'pinAnchorY', 'pinOffsetX', 'pinOffsetY',
            'layer', '_armatureDrawLayer', 'armatureDrawLayer',
            'limbLengthMode', 'limbLengthCompensation', 'limbReachStretch'
        ];
        objects.forEach(obj => {
            if (!obj?.id || out.has(obj.id)) return;
            const values = {};
            props.forEach(prop => {
                if (Object.prototype.hasOwnProperty.call(obj, prop)) values[prop] = obj[prop];
            });
            out.set(obj.id, {
                obj,
                values,
                joints: Array.isArray(obj.joints)
                    ? obj.joints.map(joint => ({
                        angle: joint.angle,
                        tiltX: joint.tiltX,
                        tiltY: joint.tiltY,
                        contourSize: joint.contourSize,
                        discSize: joint.discSize,
                        radius: joint.radius
                    }))
                    : null
            });
        });
        return out;
    },

    _getAdvancedTimelineTargets(obj = this.getSelectedObjects?.()[0]) {
        if (!obj) return [];
        return this._expandObjectsForPropRecording?.([obj]) || [obj];
    },

    _createAdvancedRecordingSnapshot(objects = []) {
        const snapshots = new Map();
        const list = (objects || []).filter(Boolean);
        list.forEach(obj => {
            if (!obj?.id || snapshots.has(obj.id)) return;
            const snap = {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation,
                depth: obj.depth ?? 0,
                tiltX: obj.tiltX ?? 0,
                tiltY: obj.tiltY ?? 0,
                scaleX: obj.scaleX ?? 1,
                scaleY: obj.scaleY ?? 1,
                opacity: obj.opacity ?? 1,
                jointBaseAngle: obj.jointBaseAngle ?? 0,
                pinOffsetX: obj.pinOffsetX ?? 0,
                pinOffsetY: obj.pinOffsetY ?? 0,
                fill: obj.fill,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth ?? 0,
                borderRadius: obj.borderRadius ?? 0,
                imageSrc: obj.imageSrc,
                svgAvatarState: obj._svgAvatar ? JSON.stringify(obj._svgAvatar.state || {}) : undefined,
                textureImageSrc: obj.textureImageSrc,
                visible: obj.visible !== false,
                flipH: !!obj.flipH,
                flipV: !!obj.flipV,
                layer: obj.layer ?? 0,
                compressionRig: JSON.stringify(obj._compressionRig || null),
                compressionPair: JSON.stringify(obj._compressionPair || null)
            };
            if (Array.isArray(obj.joints) && obj.joints.length > 0) {
                const sorted = [...obj.joints].sort((a, b) => (a.position || 0) - (b.position || 0));
                sorted.forEach((joint, index) => {
                    snap[`jointAngle_${index}`] = joint.angle || 0;
                    snap[`jointTiltX_${index}`] = joint.tiltX || 0;
                    snap[`jointTiltY_${index}`] = joint.tiltY || 0;
                    snap[`jointCrossOffset_${index}`] = joint.crossOffset ?? 0.5;
                });
            }
            if (Array.isArray(obj.flexPins) && obj.flexPins.length > 0) {
                const sortedPins = [...obj.flexPins].sort((a, b) => (a.position || 0) - (b.position || 0));
                sortedPins.forEach((pin, index) => {
                    snap[`flexPinAngle_${index}`] = pin.angle || 0;
                });
            }
            snapshots.set(obj.id, snap);
        });
        return snapshots;
    },

    _advancedTimelineSignature(objects = []) {
        return (objects || []).filter(Boolean).map(obj => obj.id).sort().join('|');
    },

    _ensureAdvancedTimelineBaseline(obj = this.getSelectedObjects?.()[0], selected = this.getSelectedObjects?.() || []) {
        if (!obj || this._isAdvancedJointBatchActive()) return;
        const targets = this._getAdvancedTimelineTargets(obj);
        const signature = this._advancedTimelineSignature(targets);
        if (!signature) return;
        if (this._advancedTimelineBaseline?.signature === signature) return;
        this._advancedTimelineBaseline = {
            signature,
            snapshots: this._createAdvancedRecordingSnapshot(targets)
        };
    },

    _beginAdvancedJointBatchEdit(obj) {
        if (!this._isAdvancedJointBatchActive() || !obj) return false;
        const batch = this._advancedJointBatch;
        const targets = this._expandObjectsForPropRecording?.([obj]) || [obj];
        const snapshots = this._snapshotAdvancedBatchObjects(targets);
        snapshots.forEach((snapshot, id) => {
            if (!batch.snapshots.has(id)) batch.snapshots.set(id, snapshot);
            batch.objects.add(snapshot.obj);
        });
        if (!batch.recordSnapshots) batch.recordSnapshots = new Map();
        const recordSnapshots = this._createAdvancedRecordingSnapshot(targets);
        recordSnapshots.forEach((snapshot, id) => {
            if (!batch.recordSnapshots.has(id)) batch.recordSnapshots.set(id, snapshot);
        });
        if (this._isRecording && !this._contRec?.active && !batch.recordingSnapshotted) {
            this._snapshotForRecording?.(targets);
            batch.recordingSnapshotted = true;
        }
        return true;
    },

    _markAdvancedJointBatchDirty(obj) {
        if (!this._isAdvancedJointBatchActive()) return;
        this._advancedJointBatch.dirty = true;
        if (obj) this._advancedJointBatch.objects.add(obj);
    },

    _previewAdvancedJointBatchEdit(obj) {
        this._markAdvancedJointBatchDirty(obj);
        try { this._resolvePins?.(); } catch (_) { /* non-critical */ }
        try { this._renderJointsList?.(obj); } catch (_) { /* non-critical */ }
        try { this.updatePivotGrid?.(); } catch (_) { /* non-critical */ }
        this.updateObjectList?.();
        this.stage?.requestRender?.();
        eventBus.emit('object:updated', obj);
        eventBus.emit('timeline:update');
        this._syncAdvancedJointBatchUi();
    },

    _restoreAdvancedJointBatchSnapshot(batch = this._advancedJointBatch) {
        batch?.snapshots?.forEach(snapshot => {
            const obj = snapshot.obj;
            if (!obj) return;
            Object.entries(snapshot.values || {}).forEach(([prop, value]) => { obj[prop] = value; });
            if (Array.isArray(obj.joints) && Array.isArray(snapshot.joints)) {
                snapshot.joints.forEach((jointSnapshot, index) => {
                    const joint = obj.joints[index];
                    if (!joint) return;
                    Object.entries(jointSnapshot || {}).forEach(([prop, value]) => { joint[prop] = value; });
                });
            }
        });
    },

    _clearAdvancedJointBatch() {
        this._advancedJointBatch = null;
        this._syncAdvancedJointBatchUi();
    },

    _applyAdvancedJointBatch() {
        const batch = this._advancedJointBatch;
        if (!batch?.active) return;
        if (!batch.dirty) {
            this._clearAdvancedJointBatch();
            Utils.showToast?.('No staged changes to apply.', 'info');
            return;
        }
        const obj = this.getSelectedObjects?.()[0] || Array.from(batch.objects || [])[0];
        try { this._resolvePins?.(); } catch (_) { /* non-critical */ }
        try { if (obj) this._renderJointsList?.(obj); } catch (_) { /* non-critical */ }
        try { this.updatePivotGrid?.(); } catch (_) { /* non-critical */ }
        this.updateObjectList?.();
        this.stage?.requestRender?.();
        if (obj) eventBus.emit('object:updated', obj);
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        if (this._isRecording) this._showRecordingConfirm?.();
        if (this._propRecording) this._capturePropStep?.();
        this._clearAdvancedJointBatch();
        this.updateProperties?.();
        Utils.showToast?.('Applied staged joint/property edits as one step.', 'success');
    },

    _cancelAdvancedJointBatch() {
        const batch = this._advancedJointBatch;
        if (!batch?.active) return;
        this._restoreAdvancedJointBatchSnapshot(batch);
        const obj = this.getSelectedObjects?.()[0] || Array.from(batch.objects || [])[0];
        try { this._resolvePins?.(); } catch (_) { /* non-critical */ }
        try { if (obj) this._renderJointsList?.(obj); } catch (_) { /* non-critical */ }
        this.updateObjectList?.();
        this.stage?.requestRender?.();
        if (obj) eventBus.emit('object:updated', obj);
        eventBus.emit('timeline:update');
        this._clearAdvancedJointBatch();
        this.updateProperties?.();
        Utils.showToast?.('Cancelled staged edits and restored the starting pose.', 'info');
    },

    recordAdvancedPropertiesToTimeline() {
        const obj = this.getSelectedObjects?.()[0];
        if (!obj) {
            Utils.showToast?.('Select a part or character first.', 'warning');
            return;
        }
        if (!this.animations || typeof this._commitRecordedKeyframes !== 'function') {
            Utils.showToast?.('Timeline recording is not available.', 'warning');
            return;
        }

        const batch = this._advancedJointBatch;
        if (batch?.active) {
            if (!batch.dirty) {
                Utils.showToast?.('No staged changes to record.', 'info');
                return;
            }
            this._recordSnapshots = new Map(batch.recordSnapshots || []);
            this._clearAdvancedJointBatch();
            this._commitRecordedKeyframes();
            this._advancedTimelineBaseline = null;
            return;
        }

        const targets = this._getAdvancedTimelineTargets(obj);
        const signature = this._advancedTimelineSignature(targets);
        if (!this._advancedTimelineBaseline || this._advancedTimelineBaseline.signature !== signature) {
            this._advancedTimelineBaseline = {
                signature,
                snapshots: this._createAdvancedRecordingSnapshot(targets)
            };
        }
        this._recordSnapshots = new Map(this._advancedTimelineBaseline.snapshots || []);
        this._commitRecordedKeyframes();
        this._advancedTimelineBaseline = null;
    },

    _syncAdvancedJointBatchUi() {
        const root = document.getElementById('advanced-part-properties-section');
        const batch = this._advancedJointBatch;
        const active = !!batch?.active;
        const dirty = !!batch?.dirty;
        root?.classList.toggle('is-advanced-joint-batching', active);
        const toggle = document.getElementById('btn-adv-joint-batch-toggle');
        const apply = document.getElementById('btn-adv-joint-batch-apply');
        const cancel = document.getElementById('btn-adv-joint-batch-cancel');
        const status = document.getElementById('adv-joint-batch-status');
        if (toggle) {
            toggle.disabled = active;
            toggle.innerHTML = active ? '<i class="fas fa-layer-group"></i> Staging' : '<i class="fas fa-layer-group"></i> Stage Batch';
        }
        if (apply) apply.disabled = !active || !dirty;
        if (cancel) cancel.disabled = !active;
        if (status) {
            status.textContent = active
                ? (dirty ? 'Batch staged: Apply Batch records all visible edits together.' : 'Batch staging active: adjust joints or properties, then Apply Batch.')
                : 'Live edit';
        }
    },

    _applyAdvancedPartProperty(prop, rawValue) {
        const obj = this.getSelectedObjects?.()[0];
        if (!obj) return;

        const directProps = new Set(['x', 'y', 'width', 'height', 'rotation', 'tiltX', 'tiltY']);
        if (directProps.has(prop)) {
            const value = parseFloat(rawValue);
            if (!Number.isFinite(value)) return;
            if (this._beginAdvancedJointBatchEdit(obj)) {
                if ((prop === 'tiltX' || prop === 'tiltY') && typeof StageObject !== 'undefined' && StageObject.supportsTiltType?.(obj.type)) {
                    this._setObjectTiltDriverValue?.(obj, prop, value);
                } else {
                    obj[prop] = value;
                }
                this._previewAdvancedJointBatchEdit(obj);
                return;
            }
            this.applyPropertyChange(prop, value);
            this.updateProperties?.();
            return;
        }

        if (prop === 'opacityPercent') {
            const value = Math.max(0, Math.min(100, parseFloat(rawValue) || 0)) / 100;
            if (this._beginAdvancedJointBatchEdit(obj)) {
                obj.opacity = value;
                this._previewAdvancedJointBatchEdit(obj);
                return;
            }
            this.applyPropertyChange('opacity', value);
            this.updateProperties?.();
            return;
        }

        let changed = false;
        const batching = this._beginAdvancedJointBatchEdit(obj);
        if (!batching) this._snapshotAdvancedEditForTimelineRecording(obj);
        const numeric = parseFloat(rawValue);
        switch (prop) {
            case 'limbLengthMode':
                if (['natural', 'preserve', 'reach'].includes(rawValue)) { obj[prop] = rawValue; changed = true; }
                break;
            case 'limbLengthCompensation':
            case 'limbReachStretch':
                if (Number.isFinite(numeric)) { obj[prop] = Math.max(0, Math.min(prop === 'limbReachStretch' ? .15 : 1, numeric)); changed = true; }
                break;
            case 'name':
                if ((obj.name || '') !== rawValue) {
                    obj.name = String(rawValue || '').trim() || obj.type || 'Object';
                    changed = true;
                }
                break;
            case 'layer':
                if (Number.isFinite(numeric)) {
                    const nextLayer = Math.round(numeric);
                    if (this._usesArmatureDrawLayer(obj)) {
                        if (Number(obj._armatureDrawLayer) !== nextLayer) {
                            obj._armatureDrawLayer = nextLayer;
                            changed = true;
                        }
                    } else if (obj.layer !== nextLayer) {
                        obj.layer = nextLayer;
                        changed = true;
                    }
                }
                break;
            case 'pivotX':
            case 'pivotY':
            case 'pinAnchorX':
            case 'pinAnchorY':
                if (Number.isFinite(numeric)) {
                    const clamped = Math.max(0, Math.min(1, numeric));
                    if (Math.abs((Number(obj[prop]) || 0) - clamped) > 0.0005) {
                        obj[prop] = clamped;
                        changed = true;
                    }
                }
                break;
            case 'pinOffsetX':
            case 'pinOffsetY':
                if (Number.isFinite(numeric) && Math.abs((Number(obj[prop]) || 0) - numeric) > 0.0005) {
                    obj[prop] = numeric;
                    changed = true;
                }
                break;
            default:
                break;
        }

        if (!changed) {
            this._updateAdvancedPartProperties(obj);
            return;
        }
        if (batching) {
            this._previewAdvancedJointBatchEdit(obj);
            return;
        }
        this._commitAdvancedPartPropertyEdit(obj);
    },

    _applyAdvancedJointProperty(index, prop, rawValue) {
        const obj = this.getSelectedObjects?.()[0];
        const joint = obj?.joints?.[index];
        if (!joint) return;
        const numeric = parseFloat(rawValue);
        if (!Number.isFinite(numeric)) return;

        const value = prop === 'contourSize' ? Math.max(0, numeric) : numeric;
        if (Math.abs((Number(joint[prop]) || 0) - value) <= 0.0005) return;
        const batching = this._beginAdvancedJointBatchEdit(obj);
        if (!batching) this._snapshotAdvancedEditForTimelineRecording(obj);
        joint[prop] = value;
        if (batching) {
            this._previewAdvancedJointBatchEdit(obj);
            return;
        }
        this._commitAdvancedPartPropertyEdit(obj);
    },

    _snapshotAdvancedEditForTimelineRecording(obj) {
        if (!this._isRecording || this._contRec?.active || !obj) return;
        const targets = this._expandObjectsForPropRecording?.([obj]) || [obj];
        this._snapshotForRecording?.(targets);
    },

    _commitAdvancedPartPropertyEdit(obj) {
        try { this._resolvePins?.(); } catch (_) { /* non-critical */ }
        try { this._renderJointsList?.(obj); } catch (_) { /* non-critical */ }
        try { this.updatePivotGrid?.(); } catch (_) { /* non-critical */ }
        this.updateObjectList?.();
        this.stage?.requestRender?.();
        eventBus.emit('object:updated', obj);
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        if (this._isRecording) this._showRecordingConfirm?.();
        if (this._propRecording) this._capturePropStep?.();
        this.updateProperties?.();
    },

    resetSelectedJointEditingValues() {
        const selected = this.getSelectedObjects();
        if (!selected.length) {
            Utils.showToast('Select a jointed object or character part first.', 'warning');
            return;
        }

        const armature = this._detectJointEditorArmature(selected[0]);
        let resetCount = 0;
        if (armature?.root && window.app?.jointSystem) {
            const before = this._snapshotJointPoseValues(this._getArmatureObjectsForJointEditor(armature));
            if (typeof window.app.jointSystem._resetArmatureToActiveCatalogIdle === 'function') {
                window.app.jointSystem._resetArmatureToActiveCatalogIdle(armature);
            } else if (typeof window.app.jointSystem._resetArmatureToIdleBaseline === 'function') {
                window.app.jointSystem._resetArmatureToIdleBaseline(armature, { resetInnerJoints: true });
            } else {
                this._getArmatureObjectsForJointEditor(armature).forEach(obj => {
                    resetCount += this._resetObjectJointPoseToNeutral(obj);
                });
            }
            resetCount = this._countChangedJointPoseValues(before, this._getArmatureObjectsForJointEditor(armature)) || resetCount || 1;
        } else {
            const characterParts = this._getCharacterJointObjectsFromSelection(selected[0]);
            const targets = characterParts.length > 1 ? characterParts : selected;
            targets.forEach(obj => {
                if (!obj) return;
                resetCount += this._resetObjectJointPoseToNeutral(obj);
            });
        }

        const first = selected[0];
        if (first) this._renderJointsList(first);
        this.objects?._resolvePins?.();
        this.updateProperties?.();
        this.stage.requestRender();

        if (resetCount > 0) {
            eventBus.emit('history:push');
            Utils.showToast(`Reset character to neutral/idle posture.`, 'success');
        } else {
            Utils.showToast('Character is already in neutral/idle posture.', 'info');
        }
    },

    undoJointEditorChange() {
        const history = window.app?.history;
        if (!history?.undo) {
            Utils.showToast('Undo is not available.', 'warning');
            return;
        }
        history.undo();
        window.setTimeout(() => {
            this.updateProperties?.();
            this.stage?.requestRender?.();
            if (this._propRecording) {
                const captured = this._capturePropStep?.();
                if (captured) this._renderPropRecordingLog?.();
            }
        }, 80);
    },

    redoJointEditorChange() {
        const history = window.app?.history;
        if (!history?.redo) {
            Utils.showToast('Redo is not available.', 'warning');
            return;
        }
        history.redo();
        window.setTimeout(() => {
            this.updateProperties?.();
            this.stage?.requestRender?.();
            if (this._propRecording) {
                const captured = this._capturePropStep?.();
                if (captured) this._renderPropRecordingLog?.();
            }
        }, 80);
    },

    recordJointEditorPropertyStep() {
        const selected = this.getSelectedObjects();
        if (!selected.length) {
            Utils.showToast('Select a character part or jointed object first.', 'warning');
            return;
        }
        if (!this._propRecording) {
            this.startPropRecording?.();
            Utils.showToast('Property recording started. Adjust joints, then use Record Step again.', 'info');
            return;
        }
        const captured = this._capturePropStep?.();
        if (captured) {
            this._renderPropRecordingLog?.();
            Utils.showToast('Recorded current joint/property step.', 'success');
        } else {
            Utils.showToast('No new joint/property change since the last recorded step.', 'info');
        }
    },

    _resetObjectJointPoseToNeutral(obj) {
        if (!obj) return 0;
        let changed = 0;
        const setNumber = (key, value) => {
            const current = Number.isFinite(obj[key]) ? obj[key] : 0;
            if (Math.abs(current - value) > 0.001) {
                obj[key] = value;
                changed = 1;
            }
        };

        setNumber('jointBaseAngle', 0);
        setNumber('tiltX', 0);
        setNumber('tiltY', 0);

        if (Array.isArray(obj.joints)) {
            obj.joints.forEach(joint => {
                if (!joint) return;
                ['angle', 'tiltX', 'tiltY'].forEach(key => {
                    const current = Number.isFinite(joint[key]) ? joint[key] : 0;
                    if (Math.abs(current) > 0.001) {
                        joint[key] = 0;
                        changed = 1;
                    }
                });
            });
        }

        return changed;
    },

    _resetJointEditingValuesForObject(obj) {
        if (!obj) return 0;
        let changed = 0;
        const setProp = (key, value) => {
            if (obj[key] !== value) {
                obj[key] = value;
                changed = 1;
            }
        };
        const partDef = this._getJointPresetPartDefinition(obj);
        const pivot = partDef?.pivotOnSelf || { x: 0.5, y: 0.5 };
        const anchor = partDef?.anchorOnParent || { x: 0.5, y: 0.5 };

        setProp('jointBaseAngle', 0);
        setProp('tiltX', 0);
        setProp('tiltY', 0);
        setProp('pinOffsetX', 0);
        setProp('pinOffsetY', 0);
        setProp('pinRotationOffset', 0);
        setProp('jointDirection', 'vertical-tb');
        setProp('jointContours', false);

        if (obj.pinnedTo || obj.bodyPartData?.partKey) {
            setProp('pinAnchorX', this._clampUnit(anchor.x));
            setProp('pinAnchorY', this._clampUnit(anchor.y));
        }

        const nextPivotX = this._clampUnit(pivot.x);
        const nextPivotY = this._clampUnit(pivot.y);
        if (typeof obj.adjustPivot === 'function') {
            if ((obj.pivotX ?? 0.5) !== nextPivotX || (obj.pivotY ?? 0.5) !== nextPivotY) {
                obj.adjustPivot(nextPivotX, nextPivotY);
                changed = 1;
            }
        } else {
            setProp('pivotX', nextPivotX);
            setProp('pivotY', nextPivotY);
        }

        if (Array.isArray(obj.joints)) {
            obj.joints.forEach(joint => {
                if (!joint) return;
                if ((joint.angle || 0) !== 0) { joint.angle = 0; changed = 1; }
                if ((joint.tiltX || 0) !== 0) { joint.tiltX = 0; changed = 1; }
                if ((joint.tiltY || 0) !== 0) { joint.tiltY = 0; changed = 1; }
                if ((joint.crossOffset ?? 0.5) !== 0.5) { joint.crossOffset = 0.5; changed = 1; }
                if (joint.contourSize != null) { joint.contourSize = null; changed = 1; }
                if (joint.contourColor != null) { joint.contourColor = null; changed = 1; }
            });
        }

        setProp('pinContour', false);
        setProp('pinContourColor', null);
        setProp('contourSize', 1);
        setProp('contourColor', null);
        setProp('contourFillMode', 'auto');
        setProp('contourPatternType', 'stripes');
        setProp('contourPatternColor', '#ffffff');
        setProp('contourPatternScale', 1);
        setProp('contourGradientStart', '#ffffff');
        setProp('contourGradientEnd', '#888888');
        setProp('contourGradientAngle', 0);
        setProp('contourRotation', 0);
        obj._cachedPivotColor = null;
        obj._contourPixelsCache = null;
        obj._contourPatternKey = null;
        obj._contourPatternCanvas = null;

        return changed;
    },

    async copySelectedJointAnglesFormatted() {
        const obj = this.getSelectedObjects()?.[0] || null;
        if (!obj) {
            Utils.showToast('Select an object first.', 'warning');
            return;
        }

        const joints = Array.isArray(obj.joints) ? [...obj.joints].sort((a, b) => (a.position || 0) - (b.position || 0)) : [];
        const assemblyEntries = this._getAssemblyJointListEntries(obj);
        if (!joints.length && !assemblyEntries.length && !obj.bodyPartData?.partKey) {
            Utils.showToast('Selected object has no joint angles to copy.', 'warning');
            return;
        }

        const lines = [
            `Selected object: ${obj.name || obj.id || 'Object'}`,
            `Part key: ${obj.bodyPartData?.partKey || 'n/a'}`
        ];

        if (obj.bodyPartData?.partKey || obj.pinnedTo) {
            lines.push(`Assembly angle: ${this._formatJointDeg(obj.jointBaseAngle)}`);
            lines.push(`Tilt: X=${this._formatJointDeg(obj.tiltX)}, Y=${this._formatJointDeg(obj.tiltY)}`);
            lines.push(`Pivot: ${this._formatJointPct(obj.pivotX, 0.5)}, ${this._formatJointPct(obj.pivotY, 0.5)}`);
            if (obj.pinnedTo) {
                const parent = this.getObjectById(obj.pinnedTo);
                lines.push(`Parent: ${parent?.name || obj.pinnedTo}`);
                lines.push(`Anchor: ${this._formatJointPct(obj.pinAnchorX, 0.5)}, ${this._formatJointPct(obj.pinAnchorY, 0.5)}`);
                lines.push(`Offset: ${Math.round(Number(obj.pinOffsetX) || 0)}, ${Math.round(Number(obj.pinOffsetY) || 0)}`);
                lines.push(`Disc: ${obj.pinContour ? 'on' : 'off'}, size=${Math.round((Number.isFinite(obj.contourSize) ? obj.contourSize : 1) * 100)}%, color=${obj.contourColor || obj.pinContourColor || 'auto'}`);
            }
        }

        if (assemblyEntries.length) {
            lines.push('');
            lines.push('Connected assembly joints:');
            assemblyEntries.forEach((entry, index) => {
                lines.push(`${index + 1}. ${entry.label} — part=${entry.ownerName}, angle=${this._formatJointDeg(entry.owner.jointBaseAngle)}, tiltX=${this._formatJointDeg(entry.owner.tiltX)}, tiltY=${this._formatJointDeg(entry.owner.tiltY)}`);
            });
        }

        if (joints.length) {
            lines.push('');
            lines.push('Part joints:');
        }

        joints.forEach((joint, index) => {
            const name = String(joint?.name || `joint-${index + 1}`);
            const pos = this._formatJointPct(joint?.position, 0);
            const pivot = this._formatJointPct(joint?.crossOffset, 0.5);
            const angle = this._formatJointDeg(joint?.angle);
            const tiltX = this._formatJointDeg(joint?.tiltX);
            const tiltY = this._formatJointDeg(joint?.tiltY);
            const disc = `${Math.round((Number.isFinite(joint?.contourSize) ? joint.contourSize : 1) * 100)}%`;
            const color = joint?.contourColor ? String(joint.contourColor) : 'auto';
            lines.push(`${index + 1}. ${name} — pos=${pos}, pivot=${pivot}, angle=${angle}, tiltX=${tiltX}, tiltY=${tiltY}, disc=${disc}, color=${color}`);
        });

        const text = lines.join('\n');
        await this._copyTextToClipboard(text, `Copied joint angles for "${obj.name || 'selected object'}".`, 'Joint angle copy failed:');
    },

    async copyCharacterJointAnglesFormatted() {
        const seed = this.getSelectedObjects()?.[0] || null;
        if (!seed) {
            Utils.showToast('Select one part of the character first.', 'warning');
            return;
        }

        const armature = this._detectJointEditorArmature(seed);
        let parts = armature
            ? [
                ...this._getArmatureObjectsForJointEditor(armature),
                ...this._getCharacterJointObjectsFromSelection(armature.root || seed)
            ]
            : [];
        if (!parts.length) parts = this._getCharacterJointObjectsFromSelection(seed);
        if (!parts.length) parts = this.getSelectedObjects().filter(Boolean);
        parts = [...new Map(parts.map(obj => [obj.id, obj])).values()]
            .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0) || String(a.name || '').localeCompare(String(b.name || '')));

        if (!parts.length) {
            Utils.showToast('No character parts found to copy.', 'warning');
            return;
        }

        const header = [
            'Part',
            'Part Key',
            'Parent',
            'Assembly Angle',
            'Tilt X',
            'Tilt Y',
            'Pivot X',
            'Pivot Y',
            'Anchor X',
            'Anchor Y',
            'Offset X',
            'Offset Y',
            'Pin Rotation',
            'Disc',
            'Disc Size',
            'Disc Color',
            'Internal Joints'
        ];
        const rows = parts.map(obj => {
            const parent = obj.pinnedTo ? this.getObjectById(obj.pinnedTo) : null;
            const internal = Array.isArray(obj.joints) && obj.joints.length
                ? [...obj.joints].sort((a, b) => (a.position || 0) - (b.position || 0)).map((joint, index) => {
                    const name = joint?.name || `joint-${index + 1}`;
                    return `${name}: angle=${this._formatJointDeg(joint?.angle)}, tiltX=${this._formatJointDeg(joint?.tiltX)}, tiltY=${this._formatJointDeg(joint?.tiltY)}, pivot=${this._formatJointPct(joint?.crossOffset, 0.5)}, disc=${Math.round((Number.isFinite(joint?.contourSize) ? joint.contourSize : 1) * 100)}%`;
                }).join('; ')
                : '';
            return [
                obj.name || obj.id || '',
                obj.bodyPartData?.partKey || obj._armaturePartKey || obj._armatureRoleKey || '',
                parent?.name || '',
                this._formatJointDeg(obj.jointBaseAngle),
                this._formatJointDeg(obj.tiltX),
                this._formatJointDeg(obj.tiltY),
                this._formatJointNumber(obj.pivotX ?? 0.5),
                this._formatJointNumber(obj.pivotY ?? 0.5),
                obj.pinnedTo ? this._formatJointNumber(obj.pinAnchorX ?? 0.5) : '',
                obj.pinnedTo ? this._formatJointNumber(obj.pinAnchorY ?? 0.5) : '',
                obj.pinnedTo ? this._formatJointNumber(obj.pinOffsetX || 0) : '',
                obj.pinnedTo ? this._formatJointNumber(obj.pinOffsetY || 0) : '',
                obj.pinRotationMode || '',
                obj.pinContour ? 'on' : 'off',
                `${Math.round((Number.isFinite(obj.contourSize) ? obj.contourSize : 1) * 100)}%`,
                obj.contourColor || obj.pinContourColor || 'auto',
                internal
            ];
        });

        const title = `Character Joint Angles — ${seed.name || seed.bodyPartData?.partKey || 'selected character'}`;
        const text = [
            title,
            `${parts.length} part(s)`,
            '',
            [header, ...rows].map(row => row.map(value => String(value ?? '').replace(/\t/g, ' ')).join('\t')).join('\n')
        ].join('\n');

        await this._copyTextToClipboard(text, `Copied joint angles for ${parts.length} character part(s).`, 'Character joint angle copy failed:');
    },

    _detectJointEditorArmature(seed) {
        const jointSystem = window.app?.jointSystem || window.jointSystem;
        if (!jointSystem) return null;
        try {
            const selected = jointSystem._detectSelectedArmature?.();
            if (selected?.root) return selected;
        } catch (_) {}

        try {
            const current = jointSystem._currentArmature;
            if (current?.root) {
                const currentObjects = this._getArmatureObjectsForJointEditor(current);
                if (!seed?.id || currentObjects.some(obj => obj?.id === seed.id)) return current;
            }
        } catch (_) {}

        try {
            const connected = this._getCharacterJointObjectsFromSelection(seed);
            if (connected.length >= 3 && typeof jointSystem._detectArmatureFromPool === 'function') {
                const detected = jointSystem._detectArmatureFromPool(connected);
                if (detected?.root) return detected;
            }
        } catch (_) {}

        return null;
    },

    _getArmatureObjectsForJointEditor(armature) {
        if (!armature) return [];
        const objects = [];
        const seen = new Set();
        const add = (obj) => {
            if (!obj?.id || seen.has(obj.id)) return;
            seen.add(obj.id);
            objects.push(obj);
        };
        add(armature.root);
        Object.values(armature.parts || {}).forEach(part => add(part?.obj || part));
        return objects;
    },

    _getCharacterJointObjectsFromSelection(seedObj) {
        if (!seedObj?.id) return [];
        const all = this.objects || [];
        const hasRigIdentity = (obj) => !!(
            obj?.bodyPartData?.partKey ||
            obj?._armaturePartKey ||
            obj?._armatureRoleKey ||
            obj?.pinnedTo ||
            all.some(candidate => candidate?.pinnedTo === obj?.id)
        );
        if (!hasRigIdentity(seedObj)) return [];

        const byId = new Map(all.map(obj => [obj?.id, obj]));
        const visited = new Set();
        const queue = [seedObj.id];
        const connected = [];
        while (queue.length) {
            const id = queue.shift();
            if (!id || visited.has(id)) continue;
            visited.add(id);
            const current = byId.get(id);
            if (!current) continue;
            if (hasRigIdentity(current)) connected.push(current);
            if (current.pinnedTo) queue.push(current.pinnedTo);
            all.forEach(candidate => {
                if (candidate?.pinnedTo === current.id) queue.push(candidate.id);
            });
        }

        return connected;
    },

    _snapshotJointPoseValues(objects = []) {
        return new Map((objects || []).filter(Boolean).map(obj => {
            const joints = Array.isArray(obj.joints)
                ? obj.joints.map(joint => ({
                    angle: Number(joint?.angle) || 0,
                    tiltX: Number(joint?.tiltX) || 0,
                    tiltY: Number(joint?.tiltY) || 0
                }))
                : [];
            return [obj.id, {
                jointBaseAngle: Number(obj.jointBaseAngle) || 0,
                tiltX: Number(obj.tiltX) || 0,
                tiltY: Number(obj.tiltY) || 0,
                joints
            }];
        }));
    },

    _countChangedJointPoseValues(before, objects = []) {
        let changed = 0;
        const different = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) > 0.001;
        (objects || []).forEach(obj => {
            if (!obj?.id) return;
            const prev = before?.get(obj.id);
            if (!prev) return;
            if (
                different(prev.jointBaseAngle, obj.jointBaseAngle) ||
                different(prev.tiltX, obj.tiltX) ||
                different(prev.tiltY, obj.tiltY)
            ) {
                changed++;
                return;
            }
            const joints = Array.isArray(obj.joints) ? obj.joints : [];
            for (let i = 0; i < Math.max(prev.joints.length, joints.length); i++) {
                const a = prev.joints[i] || {};
                const b = joints[i] || {};
                if (different(a.angle, b.angle) || different(a.tiltX, b.tiltX) || different(a.tiltY, b.tiltY)) {
                    changed++;
                    break;
                }
            }
        });
        return changed;
    },

    async _copyTextToClipboard(text, successMessage, warningPrefix = 'Clipboard copy failed:') {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
            } else {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
            }
            Utils.showToast(successMessage, 'success');
        } catch (err) {
            console.warn(warningPrefix, err);
            Utils.showToast('Could not copy to clipboard. Clipboard permission may be blocked.', 'warning');
        }
    },

    _formatJointNumber(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return '0';
        return String(Math.round(n * 100) / 100);
    },

    _formatJointDeg(value) {
        return `${Math.round(Number(value) || 0)}°`;
    },

    _formatJointPct(value, fallback = 0) {
        const n = Number.isFinite(value) ? value : fallback;
        return `${Math.round(n * 100)}%`;
    },

    _clampUnit(value) {
        const n = Number(value);
        if (!Number.isFinite(n)) return 0.5;
        return Math.max(0, Math.min(1, n));
    },

    _getJointPresetPartDefinition(obj) {
        const partKey = obj?.bodyPartData?.partKey || obj?._armaturePartKey || obj?._armatureRoleKey;
        if (!partKey) return null;
        const presetKey = obj?.bodyPartData?.presetKey || obj?.bodyPartData?.charType;
        const presets = window.JointPresets?.getAll?.() || [];
        const preferred = presetKey ? presets.find(preset => preset?.key === presetKey) : null;
        const pools = preferred ? [preferred, ...presets.filter(preset => preset !== preferred)] : presets;
        for (const preset of pools) {
            const found = (preset?.parts || []).find(part => part?.partKey === partKey);
            if (found) return found;
        }
        return null;
    },

    /**
     * Transfer joints from a jointed overlay/template object onto a target object.
     * Select exactly 2 objects — one with joints (source template) and one without (target).
     * Joint world positions from the source are projected onto the target, creating
     * matching joints at the intersection points.
     */
    transferJointsFromOverlay() {
        const selected = this.getSelectedObjects();
        if (selected.length !== 2) {
            Utils.showToast('Select exactly 2 objects: a jointed template + a target object', 'warning');
            return;
        }

        // Identify source (has joints) and target
        let source, target;
        const a = selected[0], b = selected[1];
        const aHasJoints = a.joints && a.joints.length > 0;
        const bHasJoints = b.joints && b.joints.length > 0;

        if (aHasJoints && !bHasJoints) {
            source = a; target = b;
        } else if (bHasJoints && !aHasJoints) {
            source = b; target = a;
        } else if (aHasJoints && bHasJoints) {
            Utils.showToast('Both objects have joints. Clear joints on the target first, or select one jointed + one non-jointed object.', 'warning');
            return;
        } else {
            Utils.showToast('Neither object has joints. One object must be a jointed template.', 'warning');
            return;
        }

        // Get world positions of all source joints (accounting for rotations/bending)
        const sortedSourceJoints = [...source.joints].sort((a, b) => a.position - b.position);
        const worldPositions = sortedSourceJoints.map(jt => ({
            world: source.getJointWorldPosition(jt),
            angle: jt.angle,
            tiltX: jt.tiltX || 0,
            tiltY: jt.tiltY || 0,
            srcJoint: jt
        }));

        if (worldPositions.length === 0) {
            Utils.showToast('Source object has no joints to transfer', 'warning');
            return;
        }

        // Determine the best joint direction for the target based on geometry
        const targetBounds = target.getBounds();
        const isTargetTall = targetBounds.height >= targetBounds.width;

        // Also check the source direction to infer intent
        const srcDir = StageObject.getJointDirectionMeta(source.jointDirection);

        // Choose target direction: match source's vertical/horizontal orientation,
        // but if source is vertical and target is wider than tall (or vice versa),
        // prefer the axis that best spans the target
        let targetDirection;
        if (srcDir.isVertical) {
            // Source joints are arranged along vertical axis
            // Check if joint world positions span more vertically or horizontally relative to target
            const ys = worldPositions.map(wp => wp.world.y);
            const xs = worldPositions.map(wp => wp.world.x);
            const ySpan = Math.max(...ys) - Math.min(...ys);
            const xSpan = Math.max(...xs) - Math.min(...xs);
            targetDirection = ySpan >= xSpan ? 'vertical-tb' : 'horizontal-lr';
        } else {
            const ys = worldPositions.map(wp => wp.world.y);
            const xs = worldPositions.map(wp => wp.world.x);
            const ySpan = Math.max(...ys) - Math.min(...ys);
            const xSpan = Math.max(...xs) - Math.min(...xs);
            targetDirection = xSpan >= ySpan ? 'horizontal-lr' : 'vertical-tb';
        }

        const targetDirMeta = StageObject.getJointDirectionMeta(targetDirection);

        // Project each source joint world position onto the target's local coordinate space
        // and compute normalized position (0-1) along the target's joint axis
        const newJoints = [];
        const targetCx = targetBounds.x + targetBounds.width / 2;
        const targetCy = targetBounds.y + targetBounds.height / 2;
        const targetRad = -(target.rotation || 0) * Math.PI / 180;
        const cosT = Math.cos(targetRad), sinT = Math.sin(targetRad);

        worldPositions.forEach(({ world, angle, tiltX, tiltY, srcJoint }) => {
            // Transform world position into target's local (un-rotated) coordinate space
            let localX, localY;
            if (target.rotation) {
                // Rotate around target center to undo target rotation
                const dx = world.x - targetCx, dy = world.y - targetCy;
                localX = targetCx + dx * cosT - dy * sinT;
                localY = targetCy + dx * sinT + dy * cosT;
            } else {
                localX = world.x;
                localY = world.y;
            }

            // Compute normalized position along the target's axis
            let normalizedPos;
            if (targetDirMeta.isVertical) {
                normalizedPos = (localY - target.y) / target.height;
            } else {
                normalizedPos = (localX - target.x) / target.width;
            }
            if (targetDirMeta.isReverse) normalizedPos = 1 - normalizedPos;

            // Clamp to valid range
            normalizedPos = Math.max(0.05, Math.min(0.95, normalizedPos));
            normalizedPos = Math.round(normalizedPos * 100) / 100;

            newJoints.push({
                id: 'jt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                name: srcJoint.name || `Joint ${newJoints.length + 1}`,
                position: normalizedPos,
                crossOffset: srcJoint.crossOffset ?? 0.5,
                angle: angle,
                tiltX: tiltX,
                tiltY: tiltY,
                contourSize: srcJoint.contourSize ?? null,
                contourColor: srcJoint.contourColor ?? null
            });
        });

        // Apply to target
        target.jointDirection = targetDirection;
        target.joints = newJoints;
        target.jointContours = true;

        // Select only the target to show the result
        this.select([target.id]);
        this._renderJointsList(target);
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');

        Utils.showToast(`Transferred ${newJoints.length} joint(s) to "${target.name}"`, 'success');
    },

    /**
     * Render the joints list UI for the selected object.
     */
    _getConnectedAssemblyObjects(seedObj) {
        if (!seedObj) return [];
        if (!seedObj.bodyPartData?.partKey && !seedObj.pinnedTo && !this.objects.some(obj => obj.pinnedTo === seedObj.id && obj.bodyPartData?.partKey)) {
            return [];
        }

        const visited = new Set();
        const queue = [seedObj.id];
        const connected = [];

        while (queue.length) {
            const id = queue.shift();
            if (!id || visited.has(id)) continue;
            visited.add(id);
            const current = this.getObjectById(id);
            if (!current || !current.bodyPartData?.partKey) continue;
            connected.push(current);

            if (current.pinnedTo) queue.push(current.pinnedTo);
            this.objects.forEach(candidate => {
                if (candidate?.pinnedTo === current.id && candidate.bodyPartData?.partKey) {
                    queue.push(candidate.id);
                }
            });
        }

        return connected;
    },

    _getAssemblyJointListEntries(seedObj) {
        const connected = this._getConnectedAssemblyObjects(seedObj);
        const labelFor = (obj) => {
            const partKey = String(obj?.bodyPartData?.partKey || '').toLowerCase();
            if (/(^|-)r-arm$|right.*arm/.test(partKey)) return 'R Shoulder';
            if (/(^|-)l-arm$|left.*arm/.test(partKey)) return 'L Shoulder';
            if (/(^|-)r-leg$|(^|-)r-upper-leg$|(^|-)r-thigh$|right.*leg/.test(partKey)) return 'R Hip';
            if (/(^|-)l-leg$|(^|-)l-upper-leg$|(^|-)l-thigh$|left.*leg/.test(partKey)) return 'L Hip';
            if (/head/.test(partKey)) return 'Neck';
            return obj?.bodyPartData?.jointName || obj?.name || 'Assembly Joint';
        };

        return connected
            .filter(candidate => candidate.pinnedTo)
            .map(candidate => {
                const parent = this.getObjectById(candidate.pinnedTo);
                return {
                    owner: candidate,
                    parent,
                    label: labelFor(candidate),
                    ownerName: candidate.name || candidate.bodyPartData?.jointName || candidate.id,
                    parentName: parent?.name || candidate.pinnedTo
                };
            })
            .sort((a, b) => a.label.localeCompare(b.label) || a.ownerName.localeCompare(b.ownerName));
    },

    _renderJointsList(obj) {
        const container = document.getElementById('joints-list');
        if (!container) return;
        const assemblyEntries = this._getAssemblyJointListEntries(obj);
        const hasInternalJoints = !!(obj.joints && obj.joints.length);
        if (!hasInternalJoints && assemblyEntries.length === 0) {
            container.innerHTML = '<div style="font-size:11px;color:#666;padding:4px 0;">No joints. Click "Add Joint" then click on the object.</div>';
            return;
        }
        const sorted = hasInternalJoints ? [...obj.joints].sort((a, b) => a.position - b.position) : [];
        let html = '';

        if (assemblyEntries.length > 0) {
            html += `<div style="font-size:10px;font-weight:700;color:#cbd5e1;padding:4px 2px 6px;letter-spacing:.02em;">Assembly Joints</div>`;
            assemblyEntries.forEach(entry => {
                const ownerId = entry.owner.id;
                html += `<div class="joint-item joint-item-assembly" data-assembly-owner-id="${ownerId}">
                    <div style="grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:11px;color:#e2e8f0;margin-bottom:2px;">
                        <span><strong>${Utils.escapeHtml(entry.label)}</strong></span>
                        <span class="joint-unit" style="font-size:10px;color:#94a3b8;">${Utils.escapeHtml(entry.ownerName)} → ${Utils.escapeHtml(entry.parentName)}</span>
                    </div>
                    <input type="range" class="assembly-joint-angle-slider" data-owner-id="${ownerId}" min="-180" max="180" value="${entry.owner.jointBaseAngle || 0}" title="Assembly joint angle">
                    <div class="joint-angle-group">
                        <button class="assembly-joint-nudge-btn" data-owner-id="${ownerId}" data-field="angle" data-dir="-1" title="Decrease angle"><i class="fas fa-chevron-down"></i></button>
                        <input type="number" class="assembly-joint-angle-input" data-owner-id="${ownerId}" min="-180" max="180" value="${entry.owner.jointBaseAngle || 0}" title="Assembly joint angle">
                        <button class="assembly-joint-nudge-btn" data-owner-id="${ownerId}" data-field="angle" data-dir="1" title="Increase angle"><i class="fas fa-chevron-up"></i></button>
                        <span class="joint-unit">°</span>
                    </div>
                    <div class="joint-tilt-row" data-owner-id="${ownerId}">
                        <span class="joint-tilt-label">Tilt</span>
                        <label class="joint-tilt-lbl">X</label>
                        <input type="range" class="assembly-joint-tilt-slider" data-owner-id="${ownerId}" data-axis="tiltX" min="-45" max="45" value="${entry.owner.tiltX || 0}" title="Assembly tilt X">
                        <input type="number" class="assembly-joint-tilt-input" data-owner-id="${ownerId}" data-axis="tiltX" min="-45" max="45" value="${entry.owner.tiltX || 0}" title="Assembly tilt X">
                        <label class="joint-tilt-lbl">Y</label>
                        <input type="range" class="assembly-joint-tilt-slider" data-owner-id="${ownerId}" data-axis="tiltY" min="-45" max="45" value="${entry.owner.tiltY || 0}" title="Assembly tilt Y">
                        <input type="number" class="assembly-joint-tilt-input" data-owner-id="${ownerId}" data-axis="tiltY" min="-45" max="45" value="${entry.owner.tiltY || 0}" title="Assembly tilt Y">
                    </div>
                    <div class="joint-cross-row" data-owner-id="${ownerId}">
                        <span class="joint-tilt-label">Parent</span>
                        <label class="joint-tilt-lbl">X</label>
                        <input type="range" class="assembly-joint-anchor-slider" data-owner-id="${ownerId}" data-axis="pinAnchorX" min="0" max="100" value="${Math.round((entry.owner.pinAnchorX ?? 0.5) * 100)}" title="Parent anchor X %">
                        <input type="number" class="assembly-joint-anchor-input" data-owner-id="${ownerId}" data-axis="pinAnchorX" min="0" max="100" value="${Math.round((entry.owner.pinAnchorX ?? 0.5) * 100)}" title="Parent anchor X %">
                        <label class="joint-tilt-lbl">Y</label>
                        <input type="range" class="assembly-joint-anchor-slider" data-owner-id="${ownerId}" data-axis="pinAnchorY" min="0" max="100" value="${Math.round((entry.owner.pinAnchorY ?? 0.5) * 100)}" title="Parent anchor Y %">
                        <input type="number" class="assembly-joint-anchor-input" data-owner-id="${ownerId}" data-axis="pinAnchorY" min="0" max="100" value="${Math.round((entry.owner.pinAnchorY ?? 0.5) * 100)}" title="Parent anchor Y %">
                    </div>
                    <div class="joint-cross-row" data-owner-id="${ownerId}">
                        <span class="joint-tilt-label">Self</span>
                        <label class="joint-tilt-lbl">X</label>
                        <input type="range" class="assembly-joint-pivot-slider" data-owner-id="${ownerId}" data-axis="pivotX" min="0" max="100" value="${Math.round((entry.owner.pivotX ?? 0.5) * 100)}" title="Joint pivot X on part %">
                        <input type="number" class="assembly-joint-pivot-input" data-owner-id="${ownerId}" data-axis="pivotX" min="0" max="100" value="${Math.round((entry.owner.pivotX ?? 0.5) * 100)}" title="Joint pivot X on part %">
                        <label class="joint-tilt-lbl">Y</label>
                        <input type="range" class="assembly-joint-pivot-slider" data-owner-id="${ownerId}" data-axis="pivotY" min="0" max="100" value="${Math.round((entry.owner.pivotY ?? 0.5) * 100)}" title="Joint pivot Y on part %">
                        <input type="number" class="assembly-joint-pivot-input" data-owner-id="${ownerId}" data-axis="pivotY" min="0" max="100" value="${Math.round((entry.owner.pivotY ?? 0.5) * 100)}" title="Joint pivot Y on part %">
                    </div>
                    <div class="joint-tilt-row" data-owner-id="${ownerId}">
                        <span class="joint-tilt-label">Offset</span>
                        <label class="joint-tilt-lbl">X</label>
                        <input type="range" class="assembly-joint-offset-slider" data-owner-id="${ownerId}" data-axis="pinOffsetX" min="-1000" max="1000" value="${Math.round(entry.owner.pinOffsetX || 0)}" title="Joint offset X">
                        <input type="number" class="assembly-joint-offset-input" data-owner-id="${ownerId}" data-axis="pinOffsetX" min="-1000" max="1000" value="${Math.round(entry.owner.pinOffsetX || 0)}" title="Joint offset X">
                        <label class="joint-tilt-lbl">Y</label>
                        <input type="range" class="assembly-joint-offset-slider" data-owner-id="${ownerId}" data-axis="pinOffsetY" min="-1000" max="1000" value="${Math.round(entry.owner.pinOffsetY || 0)}" title="Joint offset Y">
                        <input type="number" class="assembly-joint-offset-input" data-owner-id="${ownerId}" data-axis="pinOffsetY" min="-1000" max="1000" value="${Math.round(entry.owner.pinOffsetY || 0)}" title="Joint offset Y">
                    </div>
                    <div class="joint-contour-row" data-owner-id="${ownerId}">
                        <span class="joint-tilt-label" style="display:flex;align-items:center;gap:4px;min-width:auto;">
                            <input type="checkbox" class="assembly-joint-contour-toggle" data-owner-id="${ownerId}" ${entry.owner.pinContour ? 'checked' : ''} title="Enable contour disc">
                            Disc
                        </span>
                        <label class="joint-tilt-lbl" title="Contour disc size multiplier">Size</label>
                        <input type="range" class="assembly-joint-contour-size-slider" data-owner-id="${ownerId}" min="0" max="300" value="${Math.round((entry.owner.contourSize ?? 1) * 100)}" title="Contour size %">
                        <input type="number" class="assembly-joint-contour-size-input" data-owner-id="${ownerId}" min="0" max="300" value="${Math.round((entry.owner.contourSize ?? 1) * 100)}" title="Contour size %">
                        <span class="joint-unit">%</span>
                        <label class="joint-tilt-lbl" title="Contour disc color (blank = auto)">Col</label>
                        <input type="color" class="assembly-joint-contour-color-input" data-owner-id="${ownerId}" value="${this._toColorInputHex(entry.owner.contourColor || entry.owner.fill || '#888888')}" title="Contour color">
                        <button class="assembly-joint-contour-color-reset" data-owner-id="${ownerId}" title="Reset to auto" style="background:none;border:1px solid #555;border-radius:3px;color:#999;font-size:8px;padding:1px 4px;cursor:pointer;line-height:1;">↺</button>
                    </div>
                </div>`;
            });
        }

        if (sorted.length > 0 && assemblyEntries.length > 0) {
            html += `<div style="font-size:10px;font-weight:700;color:#cbd5e1;padding:8px 2px 6px;letter-spacing:.02em;">Part Joints</div>`;
        }

        sorted.forEach((jt, idx) => {
            const jtName = jt.name || `Joint ${idx + 1}`;
            html += `<div class="joint-item" data-joint-id="${jt.id}">
                <input type="text" class="joint-name-input" data-joint-id="${jt.id}" value="${jtName.replace(/"/g, '&quot;')}" title="Joint name" style="width:72px;padding:2px 4px;border-radius:4px;border:1px solid #444;background:#2a2a3e;color:#ddd;font-size:11px;margin-right:4px;">
                <div class="joint-pos-group">
                    <button class="joint-nudge-btn" data-joint-id="${jt.id}" data-field="pos" data-dir="-1" title="Decrease position"><i class="fas fa-chevron-down"></i></button>
                    <input type="number" class="joint-pos-input" data-joint-id="${jt.id}" min="5" max="95" value="${Math.round(jt.position * 100)}" title="Joint position %">
                    <button class="joint-nudge-btn" data-joint-id="${jt.id}" data-field="pos" data-dir="1" title="Increase position"><i class="fas fa-chevron-up"></i></button>
                    <span class="joint-unit">%</span>
                </div>
                <input type="range" class="joint-angle-slider" data-joint-id="${jt.id}" min="-180" max="180" value="${jt.angle || 0}" title="Joint angle">
                <div class="joint-angle-group">
                    <button class="joint-nudge-btn" data-joint-id="${jt.id}" data-field="angle" data-dir="-1" title="Decrease angle"><i class="fas fa-chevron-down"></i></button>
                    <input type="number" class="joint-angle-input" data-joint-id="${jt.id}" min="-180" max="180" value="${jt.angle || 0}" title="Angle in degrees">
                    <button class="joint-nudge-btn" data-joint-id="${jt.id}" data-field="angle" data-dir="1" title="Increase angle"><i class="fas fa-chevron-up"></i></button>
                    <span class="joint-unit">\u00b0</span>
                </div>
                <button class="btn-delete-joint" data-joint-id="${jt.id}" title="Delete joint"><i class="fas fa-times"></i></button>
                <div class="joint-tilt-row" data-joint-id="${jt.id}">
                    <span class="joint-tilt-label">Tilt</span>
                    <label class="joint-tilt-lbl">X</label>
                    <input type="range" class="joint-tilt-slider" data-joint-id="${jt.id}" data-axis="tiltX" min="-45" max="45" value="${jt.tiltX || 0}" title="Tilt X">
                    <input type="number" class="joint-tilt-input" data-joint-id="${jt.id}" data-axis="tiltX" min="-45" max="45" value="${jt.tiltX || 0}" title="Tilt X°">
                    <label class="joint-tilt-lbl">Y</label>
                    <input type="range" class="joint-tilt-slider" data-joint-id="${jt.id}" data-axis="tiltY" min="-45" max="45" value="${jt.tiltY || 0}" title="Tilt Y">
                    <input type="number" class="joint-tilt-input" data-joint-id="${jt.id}" data-axis="tiltY" min="-45" max="45" value="${jt.tiltY || 0}" title="Tilt Y°">
                </div>
                <div class="joint-cross-row" data-joint-id="${jt.id}">
                    <span class="joint-tilt-label">Pivot</span>
                    <label class="joint-tilt-lbl">X</label>
                    <input type="range" class="joint-cross-slider" data-joint-id="${jt.id}" data-axis="x" min="0" max="100" value="${Math.round((jt.crossOffset ?? 0.5) * 100)}" title="Pivot X position %">
                    <input type="number" class="joint-cross-input" data-joint-id="${jt.id}" data-axis="x" min="0" max="100" value="${Math.round((jt.crossOffset ?? 0.5) * 100)}" title="Pivot X %">
                    <span class="joint-unit">%</span>
                </div>
                <div class="joint-contour-row" data-joint-id="${jt.id}">
                    <span class="joint-tilt-label">Disc</span>
                    <label class="joint-tilt-lbl" title="Contour disc size multiplier">Size</label>
                    <input type="range" class="joint-contour-size-slider" data-joint-id="${jt.id}" min="0" max="300" value="${Math.round((jt.contourSize ?? 1) * 100)}" title="Contour size %">
                    <input type="number" class="joint-contour-size-input" data-joint-id="${jt.id}" min="0" max="300" value="${Math.round((jt.contourSize ?? 1) * 100)}" title="Contour size %">
                    <span class="joint-unit">%</span>
                    <label class="joint-tilt-lbl" title="Contour disc color (blank = auto)">Col</label>
                    <input type="color" class="joint-contour-color-input" data-joint-id="${jt.id}" value="${this._toColorInputHex(jt.contourColor || obj.contourColor || obj.fill || '#888888')}" title="Contour color">
                    <button class="joint-contour-color-reset" data-joint-id="${jt.id}" title="Reset to auto" style="background:none;border:1px solid #555;border-radius:3px;color:#999;font-size:8px;padding:1px 4px;cursor:pointer;line-height:1;">↺</button>
                </div>
            </div>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.assembly-joint-angle-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const angle = Math.max(-180, Math.min(180, parseFloat(e.target.value) || 0));
                owner.jointBaseAngle = angle;
                const numEl = e.target.parentElement.querySelector('.assembly-joint-angle-input');
                if (numEl) numEl.value = angle;
                this.stage.requestRender();
            });
            slider.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-angle-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const angle = Math.max(-180, Math.min(180, parseFloat(e.target.value) || 0));
                owner.jointBaseAngle = angle;
                e.target.value = angle;
                const sliderEl = e.target.closest('.joint-item-assembly')?.querySelector('.assembly-joint-angle-slider');
                if (sliderEl) sliderEl.value = angle;
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-nudge-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const owner = this.getObjectById(e.currentTarget.dataset.ownerId);
                if (!owner) return;
                const dir = parseInt(e.currentTarget.dataset.dir, 10) || 0;
                const nextAngle = Math.max(-180, Math.min(180, (owner.jointBaseAngle || 0) + dir * 5));
                owner.jointBaseAngle = nextAngle;
                const item = e.currentTarget.closest('.joint-item-assembly');
                const angleInput = item?.querySelector('.assembly-joint-angle-input');
                const angleSlider = item?.querySelector('.assembly-joint-angle-slider');
                if (angleInput) angleInput.value = nextAngle;
                if (angleSlider) angleSlider.value = nextAngle;
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-tilt-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const value = parseFloat(e.target.value) || 0;
                owner[axis] = value;
                const numEl = e.target.closest('.joint-tilt-row')?.querySelector(`.assembly-joint-tilt-input[data-axis="${axis}"]`);
                if (numEl) numEl.value = value;
                this.stage.requestRender();
            });
            slider.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-tilt-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const value = Math.max(-45, Math.min(45, parseFloat(e.target.value) || 0));
                owner[axis] = value;
                e.target.value = value;
                const sliderEl = e.target.closest('.joint-tilt-row')?.querySelector(`.assembly-joint-tilt-slider[data-axis="${axis}"]`);
                if (sliderEl) sliderEl.value = value;
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-anchor-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const pct = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                owner[axis] = pct / 100;
                owner._cachedPivotColor = null;
                const numEl = e.target.closest('.joint-cross-row')?.querySelector(`.assembly-joint-anchor-input[data-axis="${axis}"]`);
                if (numEl) numEl.value = Math.round(pct);
                this.stage.requestRender();
            });
            slider.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-anchor-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const pct = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                owner[axis] = pct / 100;
                owner._cachedPivotColor = null;
                e.target.value = Math.round(pct);
                const sliderEl = e.target.closest('.joint-cross-row')?.querySelector(`.assembly-joint-anchor-slider[data-axis="${axis}"]`);
                if (sliderEl) sliderEl.value = Math.round(pct);
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-pivot-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const pct = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                owner[axis] = pct / 100;
                owner._cachedPivotColor = null;
                const numEl = e.target.closest('.joint-cross-row')?.querySelector(`.assembly-joint-pivot-input[data-axis="${axis}"]`);
                if (numEl) numEl.value = Math.round(pct);
                this.stage.requestRender();
            });
            slider.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-pivot-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const pct = Math.max(0, Math.min(100, parseFloat(e.target.value) || 0));
                owner[axis] = pct / 100;
                owner._cachedPivotColor = null;
                e.target.value = Math.round(pct);
                const sliderEl = e.target.closest('.joint-cross-row')?.querySelector(`.assembly-joint-pivot-slider[data-axis="${axis}"]`);
                if (sliderEl) sliderEl.value = Math.round(pct);
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-offset-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const value = Math.max(-1000, Math.min(1000, parseFloat(e.target.value) || 0));
                owner[axis] = value;
                owner._cachedPivotColor = null;
                const numEl = e.target.closest('.joint-tilt-row')?.querySelector(`.assembly-joint-offset-input[data-axis="${axis}"]`);
                if (numEl) numEl.value = Math.round(value);
                this.stage.requestRender();
            });
            slider.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-offset-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const axis = e.target.dataset.axis;
                const value = Math.max(-1000, Math.min(1000, parseFloat(e.target.value) || 0));
                owner[axis] = value;
                owner._cachedPivotColor = null;
                e.target.value = Math.round(value);
                const sliderEl = e.target.closest('.joint-tilt-row')?.querySelector(`.assembly-joint-offset-slider[data-axis="${axis}"]`);
                if (sliderEl) sliderEl.value = Math.round(value);
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-contour-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                owner.pinContour = !!e.target.checked;
                owner._cachedPivotColor = null;
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-contour-size-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const pct = Math.max(0, Math.min(300, parseFloat(e.target.value) || 100));
                owner.contourSize = pct / 100;
                owner._cachedPivotColor = null;
                const numEl = e.target.closest('.joint-contour-row')?.querySelector('.assembly-joint-contour-size-input');
                if (numEl) numEl.value = Math.round(pct);
                this.stage.requestRender();
            });
            slider.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-contour-size-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                const pct = Math.max(0, Math.min(300, parseFloat(e.target.value) || 100));
                owner.contourSize = pct / 100;
                owner._cachedPivotColor = null;
                e.target.value = Math.round(pct);
                const sliderEl = e.target.closest('.joint-contour-row')?.querySelector('.assembly-joint-contour-size-slider');
                if (sliderEl) sliderEl.value = Math.round(pct);
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-contour-color-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const owner = this.getObjectById(e.target.dataset.ownerId);
                if (!owner) return;
                owner.contourColor = e.target.value;
                owner.pinContourColor = null;
                owner._cachedPivotColor = null;
                this.stage.requestRender();
            });
            inp.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        container.querySelectorAll('.assembly-joint-contour-color-reset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const owner = this.getObjectById(e.currentTarget.dataset.ownerId);
                if (!owner) return;
                owner.contourColor = null;
                owner.pinContourColor = null;
                owner._cachedPivotColor = null;
                const colorEl = e.currentTarget.closest('.joint-contour-row')?.querySelector('.assembly-joint-contour-color-input');
                if (colorEl) colorEl.value = this._toColorInputHex(owner.fill || '#888888');
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        // Bind joint name input events
        container.querySelectorAll('.joint-name-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const jointId = e.target.dataset.jointId;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.name = e.target.value.trim() || `Joint`;
                    eventBus.emit('history:push');
                }
            });
        });

        // Bind position input events
        container.querySelectorAll('.joint-pos-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const jointId = e.target.dataset.jointId;
                const pct = Math.max(5, Math.min(95, parseInt(e.target.value) || 50));
                e.target.value = pct;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.position = pct / 100;
                    this.stage.requestRender();
                    eventBus.emit('history:push');
                }
            });
        });

        // Bind slider events
        container.querySelectorAll('.joint-angle-slider').forEach(slider => {
            slider.addEventListener('pointerdown', () => {
                if (this._isRecording) this._snapshotForRecording(true);
            });
            slider.addEventListener('input', (e) => {
                const jointId = e.target.dataset.jointId;
                const angle = parseFloat(e.target.value) || 0;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.angle = angle;
                    const numEl = e.target.parentElement.querySelector('.joint-angle-input');
                    if (numEl) numEl.value = angle;
                    this.stage.requestRender();
                }
            });
            slider.addEventListener('change', () => {
                if (this._isRecording) this._showRecordingConfirm();
                eventBus.emit('history:push');
            });
        });

        // Bind angle number input events
        container.querySelectorAll('.joint-angle-input').forEach(inp => {
            inp.addEventListener('focus', () => {
                if (this._isRecording) this._snapshotForRecording(true);
            });
            inp.addEventListener('change', (e) => {
                const jointId = e.target.dataset.jointId;
                const angle = Math.max(-180, Math.min(180, parseFloat(e.target.value) || 0));
                e.target.value = angle;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.angle = angle;
                    const sliderEl = e.target.parentElement.querySelector('.joint-angle-slider');
                    if (sliderEl) sliderEl.value = angle;
                    this.stage.requestRender();
                }
                if (this._isRecording) this._showRecordingConfirm();
                eventBus.emit('history:push');
            });
        });

        // Bind delete buttons
        container.querySelectorAll('.btn-delete-joint').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jointId = e.currentTarget.dataset.jointId;
                obj.joints = obj.joints.filter(j => j.id !== jointId);
                this._renderJointsList(obj);
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        });

        // Bind nudge (up/down) buttons for position and angle
        container.querySelectorAll('.joint-nudge-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const el = e.currentTarget;
                const jointId = el.dataset.jointId;
                const field = el.dataset.field; // 'pos' or 'angle'
                const dir = parseInt(el.dataset.dir); // 1 or -1
                const joint = obj.joints.find(j => j.id === jointId);
                if (!joint) return;
                if (this._isRecording) this._snapshotForRecording(true);

                if (field === 'pos') {
                    const step = 5; // 5% per click
                    const newPct = Math.max(5, Math.min(95, Math.round(joint.position * 100) + dir * step));
                    joint.position = newPct / 100;
                    const posInput = el.closest('.joint-item').querySelector('.joint-pos-input');
                    if (posInput) posInput.value = newPct;
                } else {
                    const step = 5; // 5° per click
                    const newAngle = Math.max(-180, Math.min(180, (joint.angle || 0) + dir * step));
                    joint.angle = newAngle;
                    const angleInput = el.closest('.joint-item').querySelector('.joint-angle-input');
                    const angleSlider = el.closest('.joint-item').querySelector('.joint-angle-slider');
                    if (angleInput) angleInput.value = newAngle;
                    if (angleSlider) angleSlider.value = newAngle;
                }

                this.stage.requestRender();
                if (this._isRecording) this._showRecordingConfirm();
                eventBus.emit('history:push');
            });
        });

        // Bind tilt slider events
        container.querySelectorAll('.joint-tilt-slider').forEach(slider => {
            slider.addEventListener('pointerdown', () => {
                if (this._isRecording) this._snapshotForRecording(true);
            });
            slider.addEventListener('input', (e) => {
                const jointId = e.target.dataset.jointId;
                const axis = e.target.dataset.axis; // 'tiltX' or 'tiltY'
                const val = parseFloat(e.target.value) || 0;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint[axis] = val;
                    const numEl = e.target.closest('.joint-tilt-row').querySelector(`.joint-tilt-input[data-axis="${axis}"]`);
                    if (numEl) numEl.value = val;
                    this.stage.requestRender();
                }
            });
            slider.addEventListener('change', () => {
                if (this._isRecording) this._showRecordingConfirm();
                eventBus.emit('history:push');
            });
        });

        // Bind tilt number input events
        container.querySelectorAll('.joint-tilt-input').forEach(inp => {
            inp.addEventListener('focus', () => {
                if (this._isRecording) this._snapshotForRecording(true);
            });
            inp.addEventListener('change', (e) => {
                const jointId = e.target.dataset.jointId;
                const axis = e.target.dataset.axis;
                const val = Math.max(-45, Math.min(45, parseFloat(e.target.value) || 0));
                e.target.value = val;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint[axis] = val;
                    const sliderEl = e.target.closest('.joint-tilt-row').querySelector(`.joint-tilt-slider[data-axis="${axis}"]`);
                    if (sliderEl) sliderEl.value = val;
                    this.stage.requestRender();
                }
                if (this._isRecording) this._showRecordingConfirm();
                eventBus.emit('history:push');
            });
        });

        // Bind cross-offset (pivot position) slider events
        container.querySelectorAll('.joint-cross-slider').forEach(slider => {
            slider.addEventListener('pointerdown', () => {
                if (this._isRecording) this._snapshotForRecording(true);
            });
            slider.addEventListener('input', (e) => {
                const jointId = e.target.dataset.jointId;
                const pct = parseFloat(e.target.value) || 50;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.crossOffset = pct / 100;
                    const numEl = e.target.closest('.joint-cross-row').querySelector('.joint-cross-input');
                    if (numEl) numEl.value = Math.round(pct);
                    this.stage.requestRender();
                }
            });
            slider.addEventListener('change', () => {
                if (this._isRecording) this._showRecordingConfirm();
                eventBus.emit('history:push');
            });
        });

        // Bind cross-offset number input events
        container.querySelectorAll('.joint-cross-input').forEach(inp => {
            inp.addEventListener('focus', () => {
                if (this._isRecording) this._snapshotForRecording(true);
            });
            inp.addEventListener('change', (e) => {
                const jointId = e.target.dataset.jointId;
                const pct = Math.max(0, Math.min(100, parseFloat(e.target.value) || 50));
                e.target.value = Math.round(pct);
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.crossOffset = pct / 100;
                    const sliderEl = e.target.closest('.joint-cross-row').querySelector('.joint-cross-slider');
                    if (sliderEl) sliderEl.value = Math.round(pct);
                    this.stage.requestRender();
                }
                if (this._isRecording) this._showRecordingConfirm();
                eventBus.emit('history:push');
            });
        });

        // Bind per-joint contour size slider events
        container.querySelectorAll('.joint-contour-size-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                const jointId = e.target.dataset.jointId;
                const pct = parseFloat(e.target.value) || 100;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.contourSize = pct / 100;
                    const numEl = e.target.closest('.joint-contour-row').querySelector('.joint-contour-size-input');
                    if (numEl) numEl.value = Math.round(pct);
                    this.stage.requestRender();
                }
            });
            slider.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        // Bind per-joint contour size number input events
        container.querySelectorAll('.joint-contour-size-input').forEach(inp => {
            inp.addEventListener('change', (e) => {
                const jointId = e.target.dataset.jointId;
                const pct = Math.max(0, Math.min(300, parseFloat(e.target.value) || 100));
                e.target.value = Math.round(pct);
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.contourSize = pct / 100;
                    const sliderEl = e.target.closest('.joint-contour-row').querySelector('.joint-contour-size-slider');
                    if (sliderEl) sliderEl.value = Math.round(pct);
                    this.stage.requestRender();
                }
                eventBus.emit('history:push');
            });
        });

        // Bind per-joint contour color input events
        container.querySelectorAll('.joint-contour-color-input').forEach(inp => {
            inp.addEventListener('input', (e) => {
                const jointId = e.target.dataset.jointId;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.contourColor = e.target.value;
                    this.stage.requestRender();
                }
            });
            inp.addEventListener('change', () => {
                eventBus.emit('history:push');
            });
        });

        // Bind per-joint contour color reset button
        container.querySelectorAll('.joint-contour-color-reset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const jointId = e.target.closest('[data-joint-id]').dataset.jointId;
                const joint = obj.joints.find(j => j.id === jointId);
                if (joint) {
                    joint.contourColor = null;
                    const colorEl = e.target.closest('.joint-contour-row').querySelector('.joint-contour-color-input');
                    if (colorEl) colorEl.value = this._toColorInputHex(obj.contourColor || obj.fill || '#888888');
                    this.stage.requestRender();
                }
                eventBus.emit('history:push');
            });
        });
    },

    updatePivotGrid() {
        const objs = this.getSelectedObjects();
        if (objs.length === 0) return;
        const obj = objs[0];
        document.querySelectorAll('.pivot-preset-btn').forEach(btn => {
            const [px, py] = btn.dataset.pivot.split(',').map(Number);
            btn.classList.toggle('active', Math.abs(obj.pivotX - px) < 0.01 && Math.abs(obj.pivotY - py) < 0.01);
        });
    },

    updateAspectLockButton(obj = null) {
        const field = document.getElementById('prop-aspect-lock-field');
        const button = document.getElementById('btn-lock-aspect');
        const target = obj || this.getSelectedObjects()[0] || null;
        const supported = !!target && StageObject.supportsAspectLockType(target.type);

        field?.classList.toggle('hidden', !supported);
        if (!button) return;

        const locked = !!target?.lockAspectRatio;
        button.classList.toggle('active', locked);
        button.title = locked
            ? 'Unlock aspect ratio while resizing'
            : 'Lock aspect ratio while resizing';
        button.innerHTML = locked
            ? '<i class="fas fa-lock"></i> Aspect Lock'
            : '<i class="fas fa-unlock"></i> Aspect Lock';
    },

    updateDepthHandleButton(obj = null) {
        const button = document.getElementById('btn-toggle-depth-handle');
        const target = obj || this.getSelectedObjects()[0] || null;
        const supported = !!target && (StageObject.supportsDepthExtrusionType(target) || StageObject.supportsDepthScaleType(target.type));

        if (!button) return;

        button.classList.toggle('hidden', !supported);
        if (!supported) return;

        const shown = !!target?.showDepthHandle;
        button.classList.toggle('active', shown);
        button.title = shown ? 'Hide depth handle on canvas' : 'Show depth handle on canvas';
        button.innerHTML = shown
            ? '<i class="fas fa-eye-slash"></i> Handle'
            : '<i class="fas fa-draw-polygon"></i> Handle';
    },

    toggleSelectedAspectLock() {
        const targets = this.getSelectedObjects().filter(obj => StageObject.supportsAspectLockType(obj.type));
        if (!targets.length) return;

        const nextLocked = !targets.every(obj => obj.lockAspectRatio);
        targets.forEach(obj => {
            obj.lockAspectRatio = nextLocked;
        });

        this.updateAspectLockButton(targets[0]);
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        eventBus.emit('history:push');
    },

    toggleSelectedDepthHandle() {
        const targets = this.getSelectedObjects().filter(obj =>
            StageObject.supportsDepthExtrusionType(obj) || StageObject.supportsDepthScaleType(obj.type)
        );
        if (!targets.length) return;

        const nextShown = !targets.every(obj => obj.showDepthHandle);
        targets.forEach(obj => {
            obj.showDepthHandle = nextShown;
        });

        this.updateDepthHandleButton(targets[0]);
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        eventBus.emit('history:push');
    },

    _applyObjectSize(obj, nextWidth, nextHeight) {
        const originalWidth = Math.max(1, obj.width || 1);
        const originalHeight = Math.max(1, obj.height || 1);
        const originalX = obj.x;
        const originalY = obj.y;
        const originalPathPoints = obj.pathPoints?.length
            ? obj.pathPoints.map(point => ({ x: point.x, y: point.y }))
            : null;

        obj.width = Math.max(1, nextWidth);
        obj.height = Math.max(1, nextHeight);

        if (originalPathPoints && originalWidth > 0 && originalHeight > 0) {
            const sx = obj.width / originalWidth;
            const sy = obj.height / originalHeight;
            obj.pathPoints.forEach((point, index) => {
                const originalPoint = originalPathPoints[index];
                if (!originalPoint) return;
                point.x = obj.x + (originalPoint.x - originalX) * sx;
                point.y = obj.y + (originalPoint.y - originalY) * sy;
            });
        }
    },

    _getRotationResetPivotRatios(pivot, x, y, width, height) {
        const safeWidth = Math.max(1, width || 1);
        const safeHeight = Math.max(1, height || 1);
        return {
            pivotX: (pivot.x - x) / safeWidth,
            pivotY: (pivot.y - y) / safeHeight
        };
    },

    _normalizeAngle360(angle) {
        const normalized = ((angle % 360) + 360) % 360;
        return Math.round(normalized * 10) / 10;
    },

    _normalizeAngle180(angle) {
        let normalized = this._normalizeAngle360(angle);
        if (normalized > 180) normalized -= 360;
        return Math.round(normalized * 10) / 10;
    },

    _getStageAngleFallbackAxis(obj) {
        if (!obj) return { dx: 1, dy: 0 };
        if (obj.type === 'line') {
            const len = Math.hypot(obj.width || 0, obj.height || 0) || 1;
            return { dx: (obj.width || 0) / len, dy: (obj.height || 0) / len };
        }
        return Math.abs(obj.width || 0) >= Math.abs(obj.height || 0)
            ? { dx: 1, dy: 0 }
            : { dx: 0, dy: 1 };
    },

    _orientAxisDirection(axis, pivotPoint, centroid, fallbackAxis) {
        let dx = axis?.dx ?? fallbackAxis.dx;
        let dy = axis?.dy ?? fallbackAxis.dy;
        let len = Math.hypot(dx, dy);
        if (len < 0.0001) {
            dx = fallbackAxis.dx;
            dy = fallbackAxis.dy;
            len = Math.hypot(dx, dy) || 1;
        }
        dx /= len;
        dy /= len;

        const refX = (centroid?.x ?? 0) - (pivotPoint?.x ?? 0);
        const refY = (centroid?.y ?? 0) - (pivotPoint?.y ?? 0);
        const refLen = Math.hypot(refX, refY);
        if (refLen > 2) {
            const dot = dx * refX + dy * refY;
            if (dot < 0) {
                dx *= -1;
                dy *= -1;
            }
            return { dx, dy };
        }

        const fallbackDot = dx * fallbackAxis.dx + dy * fallbackAxis.dy;
        if (fallbackDot < 0) {
            dx *= -1;
            dy *= -1;
        }
        return { dx, dy };
    },

    _getDominantAxisFromSamples(samples, pivotPoint, fallbackAxis) {
        if (!Array.isArray(samples) || samples.length < 2) return fallbackAxis;

        let sumX = 0;
        let sumY = 0;
        samples.forEach(point => {
            sumX += point.x;
            sumY += point.y;
        });
        const center = {
            x: sumX / samples.length,
            y: sumY / samples.length
        };

        let covXX = 0;
        let covXY = 0;
        let covYY = 0;
        samples.forEach(point => {
            const dx = point.x - center.x;
            const dy = point.y - center.y;
            covXX += dx * dx;
            covXY += dx * dy;
            covYY += dy * dy;
        });

        if (Math.abs(covXX) < 0.0001 && Math.abs(covXY) < 0.0001 && Math.abs(covYY) < 0.0001) {
            return fallbackAxis;
        }

        const angle = 0.5 * Math.atan2(2 * covXY, covXX - covYY);
        return this._orientAxisDirection(
            { dx: Math.cos(angle), dy: Math.sin(angle) },
            pivotPoint,
            center,
            fallbackAxis
        );
    },

    _getImageLocalDominantAxis(obj) {
        const source = obj?._eraserCanvas || obj?.imageElement || null;
        if (!source || !source.width || !source.height) return null;

        const fallbackAxis = this._getStageAngleFallbackAxis(obj);
        const sampleW = 64;
        const sampleH = Math.max(8, Math.round((source.height / Math.max(1, source.width)) * sampleW));
        const canvas = document.createElement('canvas');
        canvas.width = sampleW;
        canvas.height = sampleH;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(source, 0, 0, sampleW, sampleH);

        const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
        const samples = [];
        let opaquePixels = 0;
        for (let y = 0; y < sampleH; y++) {
            for (let x = 0; x < sampleW; x++) {
                const alpha = data[(y * sampleW + x) * 4 + 3];
                if (alpha > 24) {
                    samples.push({ x, y });
                    opaquePixels++;
                }
            }
        }

        if (opaquePixels < 12 || opaquePixels > sampleW * sampleH * 0.92) {
            return fallbackAxis;
        }

        const pivotPoint = {
            x: (obj.pivotX ?? 0.5) * sampleW,
            y: (obj.pivotY ?? 0.5) * sampleH
        };
        return this._getDominantAxisFromSamples(samples, pivotPoint, fallbackAxis);
    },

    _getObjectLocalReferenceAxis(obj) {
        if (!obj) return { dx: 1, dy: 0 };

        const fallbackAxis = this._getStageAngleFallbackAxis(obj);

        if (obj.type === 'image') {
            return this._getImageLocalDominantAxis(obj) || fallbackAxis;
        }

        if (obj.type === 'line') return fallbackAxis;

        if ((obj.type === 'freeform' || obj.type === 'path' || obj.type === 'scribble') && obj.pathPoints?.length >= 2) {
            const pivot = obj.getPivotPoint();
            return this._getDominantAxisFromSamples(obj.pathPoints, pivot, fallbackAxis);
        }

        return fallbackAxis;
    },

    getObjectStageAngleInfo(obj) {
        if (!obj) return null;

        const axis = this._getObjectLocalReferenceAxis(obj);
        const pivot = obj.getPivotPoint();
        const start = obj._transformDisplayPoint(pivot, { includeDepthScale: true, includeTilt: true });
        const probe = obj._transformDisplayPoint({
            x: pivot.x + axis.dx,
            y: pivot.y + axis.dy
        }, { includeDepthScale: true, includeTilt: true });
        const dx = probe.x - start.x;
        const dy = probe.y - start.y;
        if (Math.hypot(dx, dy) < 0.0001) {
            return {
                angle360: 0,
                angle180: 0,
                fromDown: -90
            };
        }

        const angle360 = this._normalizeAngle360(Utils.radToDeg(Math.atan2(dy, dx)));
        return {
            angle360,
            angle180: this._normalizeAngle180(angle360),
            fromDown: this._normalizeAngle180(angle360 - 90)
        };
    },

    _getRotationResetRenderBounds(obj) {
        if (!obj) return null;

        const hasComplexBounds =
            (obj.joints && obj.joints.length > 0)
            || !!obj.getDepthExtrusionGeometry()
            || Math.abs(obj.tiltX || 0) > 0.001
            || Math.abs(obj.tiltY || 0) > 0.001
            || Math.abs(obj.depth || 0) > 0.001;
        if (hasComplexBounds) {
            return obj.getBounds();
        }

        const hasDisplayTransform =
            Math.abs(obj.rotation || 0) > 0.001
            || Math.abs((obj.scaleX ?? 1) - 1) > 0.001
            || Math.abs((obj.scaleY ?? 1) - 1) > 0.001
            || obj.flipH
            || obj.flipV;
        if (!hasDisplayTransform) {
            return obj.getBounds();
        }

        const points = obj.getTransformedRectPoints();
        const xs = points.map(point => point.x);
        const ys = points.map(point => point.y);
        const x = Math.min(...xs);
        const y = Math.min(...ys);
        const right = Math.max(...xs);
        const bottom = Math.max(...ys);
        return {
            x,
            y,
            width: right - x,
            height: bottom - y,
            right,
            bottom,
            centerX: (x + right) / 2,
            centerY: (y + bottom) / 2
        };
    },

    _rotatePointAroundPivot(point, pivot, angleDeg) {
        const rad = Utils.degToRad(angleDeg || 0);
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = point.x - pivot.x;
        const dy = point.y - pivot.y;
        return {
            ...point,
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos
        };
    },

    _canResetRotationAsVector(obj) {
        if (!obj) return false;
        if (obj.type === 'image' || obj.type === 'icon' || obj.type === 'text') return false;
        if (obj.text) return false;
        if (!['solid', 'none'].includes(obj.fillType || 'solid')) return false;
        if (Math.abs(obj.tiltX || 0) > 0.001 || Math.abs(obj.tiltY || 0) > 0.001) return false;
        if (Math.abs(obj.depth || 0) > 0.001) return false;
        if ((obj.borderRadius || 0) > 0) return false;

        const vectorTypes = new Set([
            'rectangle', 'triangle', 'star', 'polygon', 'line',
            'diamond', 'arrow', 'doubleArrow', 'freeform', 'path'
        ]);
        return vectorTypes.has(obj.type);
    },

    _getVectorRotationResetPoints(obj) {
        const snapshot = StageObject.fromJSON(obj.toJSON());
        const sourceType = snapshot.type;
        if ((!snapshot.pathPoints || snapshot.pathPoints.length < 2)
            && snapshot.type !== 'freeform'
            && snapshot.type !== 'scribble'
            && snapshot.type !== 'path') {
            this._generatePointsForShape(snapshot);
        }
        if (!snapshot.pathPoints || snapshot.pathPoints.length < 2) return null;
        const straightEdgeTypes = new Set([
            'rectangle', 'triangle', 'star', 'polygon', 'line',
            'diamond', 'arrow', 'doubleArrow', 'path'
        ]);
        return snapshot.pathPoints.map(point => ({
            ...point,
            segmentType: straightEdgeTypes.has(sourceType) ? 'straight' : point.segmentType
        }));
    },

    _resetObjectRotationAsVector(obj) {
        const angle = obj.rotation || 0;
        if (Math.abs(angle) < 0.001) return false;

        const sourcePoints = this._getVectorRotationResetPoints(obj);
        if (!sourcePoints || sourcePoints.length < 2) return false;

        const pivot = obj.getPivotPoint();
        const rotatedPoints = sourcePoints.map(point => this._rotatePointAroundPivot(point, pivot, angle));
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        rotatedPoints.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
            return false;
        }

        const originalType = obj.type;
        const isOpenPath = originalType === 'line' || originalType === 'path' || originalType === 'scribble' || obj.closedPath === false;
        const nextWidth = Math.max(1, maxX - minX);
        const nextHeight = Math.max(1, maxY - minY);
        const nextPivot = this._getRotationResetPivotRatios(pivot, minX, minY, nextWidth, nextHeight);

        obj.type = 'freeform';
        obj._originalType = originalType;
        obj.pathPoints = rotatedPoints;
        obj.closedPath = !isOpenPath;
        obj.x = minX;
        obj.y = minY;
        obj.width = nextWidth;
        obj.height = nextHeight;
        obj.rotation = 0;
        obj.pivotX = nextPivot.pivotX;
        obj.pivotY = nextPivot.pivotY;

        if (isOpenPath) {
            obj.stroke = obj.strokeWidth > 0 ? obj.stroke : (obj.fill || obj.stroke || '#000000');
            obj.fill = 'transparent';
            obj.fillType = 'none';
            if (!(obj.strokeWidth > 0)) {
                obj.strokeWidth = originalType === 'scribble' ? 3 : 2;
            }
        }

        if (obj.bodyPartData || (!obj.pinnedTo && obj.jointBaseAngle !== undefined)) {
            obj.jointBaseAngle = 0;
        } else if (obj.pinnedTo && (obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static')) === 'joint') {
            obj.jointBaseAngle = 0;
        }

        return true;
    },

    _renderObjectForRotationReset(obj) {
        const PAD = 8;
        const MAX_SIZE = 4096;
        const bounds = this._getRotationResetRenderBounds(obj);
        let scale = 2;
        let canvasWidth = Math.ceil((bounds.width + PAD * 2) * scale);
        let canvasHeight = Math.ceil((bounds.height + PAD * 2) * scale);
        if (canvasWidth > MAX_SIZE || canvasHeight > MAX_SIZE) {
            scale = 1;
            canvasWidth = Math.ceil((bounds.width + PAD * 2) * scale);
            canvasHeight = Math.ceil((bounds.height + PAD * 2) * scale);
        }
        if (canvasWidth <= 0 || canvasHeight <= 0 || canvasWidth > MAX_SIZE || canvasHeight > MAX_SIZE) {
            return null;
        }

        const canvas = document.createElement('canvas');
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.save();
        ctx.scale(scale, scale);
        ctx.translate(-bounds.x + PAD, -bounds.y + PAD);
        obj.render(ctx);
        ctx.restore();

        return {
            bounds,
            padding: PAD,
            scale,
            trim: this._trimCanvas(canvas)
        };
    },

    _resetObjectRotationAsImage(obj) {
        const rendered = this._renderObjectForRotationReset(obj);
        if (!rendered?.trim?.canvas) return false;

        const { bounds, padding, scale, trim } = rendered;
        if (!this._hasVisiblePixels(trim.canvas)) return false;

        const pivot = obj.getPivotPoint();
        const nextX = bounds.x - padding + trim.offX / scale;
        const nextY = bounds.y - padding + trim.offY / scale;
        const nextWidth = Math.max(1, trim.width / scale);
        const nextHeight = Math.max(1, trim.height / scale);
        const nextPivot = this._getRotationResetPivotRatios(pivot, nextX, nextY, nextWidth, nextHeight);
        const dataUrl = trim.canvas.toDataURL('image/png');

        obj.type = 'image';
        obj.imageSrc = dataUrl;
        obj.loadImage(dataUrl);
        obj.x = nextX;
        obj.y = nextY;
        obj.width = nextWidth;
        obj.height = nextHeight;
        obj.rotation = 0;
        obj.depth = 0;
        obj.showDepthHandle = false;
        obj.tiltX = 0;
        obj.tiltY = 0;
        obj.scaleX = 1;
        obj.scaleY = 1;
        obj.opacity = 1;
        obj.flipH = false;
        obj.flipV = false;
        obj.borderRadius = 0;
        obj.strokeWidth = 0;
        obj.shadow = false;
        obj.glowEnabled = false;
        obj.reflectionEnabled = false;
        obj.bevelEnabled = false;
        obj.imgBrightness = 0;
        obj.imgContrast = 0;
        obj.imgSaturation = 0;
        obj.imgHue = 0;
        obj.imgBlur = 0;
        obj.imgGrayscale = 0;
        obj.imgSepia = 0;
        obj.imgInvert = 0;
        obj.imgTintAmount = 0;
        obj.isAnimatedGif = false;
        obj.gifFrameDelays = null;
        obj._gifFrames = null;
        obj._gifTotalDuration = 0;
        obj.pivotX = nextPivot.pivotX;
        obj.pivotY = nextPivot.pivotY;
        obj.pathPoints = [];

        if (obj.bodyPartData || (!obj.pinnedTo && obj.jointBaseAngle !== undefined)) {
            obj.jointBaseAngle = 0;
        } else if (obj.pinnedTo && (obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static')) === 'joint') {
            obj.jointBaseAngle = 0;
        }

        return true;
    },

    _getObjectRotationDriver(obj) {
        if (!obj) return 'rotation';
        const mode = obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static');
        if (obj.pinnedTo && mode === 'joint') return 'jointBaseAngle';
        if (obj.pinnedTo && mode === 'inherit' && obj._armaturePartKey) return 'jointBaseAngle';
        if (obj.bodyPartData && !obj.pinnedTo) return 'jointBaseAngle';
        return 'rotation';
    },

    _setObjectRotationDriverValue(obj, value) {
        if (!obj) return;
        const normalized = this._normalizeAngle180(value);
        const driver = this._getObjectRotationDriver(obj);
        if (driver === 'jointBaseAngle') {
            obj.jointBaseAngle = normalized;
            if (obj.pinnedTo) {
                const parent = this.getObjectById(obj.pinnedTo);
                const target = parent ? this._getPinTargetWorldTransform(parent, obj) : null;
                obj.rotation = (target?.rotation || parent?.rotation || 0) + normalized;
            } else {
                obj.rotation = normalized;
            }
            return;
        }
        obj.rotation = normalized;
    },

    _setObjectTiltDriverValue(obj, axis, value) {
        if (!obj || (axis !== 'tiltX' && axis !== 'tiltY')) return;
        const normalized = Utils.clamp(value, -45, 45);
        const mode = obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static');
        if (obj.pinnedTo && (mode === 'inherit' || mode === 'joint')) {
            const parent = this.getObjectById(obj.pinnedTo);
            const target = parent ? this._getPinTargetWorldTransform(parent, obj) : null;
            const targetTilt = axis === 'tiltX'
                ? (target?.tiltX ?? 0)
                : (target?.tiltY ?? 0);
            const baseKey = axis === 'tiltX' ? 'pinBaseTiltX' : 'pinBaseTiltY';
            obj[baseKey] = Utils.clamp(normalized - targetTilt, -45, 45);
        }
        obj[axis] = normalized;
    },

    _applyObjectRotationDriverDelta(obj, delta) {
        if (!obj || Math.abs(delta) < 0.001) return;
        const driver = this._getObjectRotationDriver(obj);
        const current = driver === 'jointBaseAngle'
            ? (obj.jointBaseAngle || 0)
            : (obj.rotation || 0);
        this._setObjectRotationDriverValue(obj, current + delta);
    },

    _bakeRotationBaselineForObject(obj) {
        const visualRotation = Math.abs(obj.rotation || 0);
        const localJointRotation = Math.abs(obj.jointBaseAngle || 0);
        if (visualRotation < 0.001 && localJointRotation < 0.001) return false;

        return this._canResetRotationAsVector(obj)
            ? (this._resetObjectRotationAsVector(obj) || this._resetObjectRotationAsImage(obj))
            : this._resetObjectRotationAsImage(obj);
    },

    normalizeObjectDownBaseline(obj, options = {}) {
        const { bake = true, targetFromDown = 0 } = options;
        if (!obj) {
            return { changed: false, baked: false, delta: 0, failed: true };
        }

        const info = this.getObjectStageAngleInfo(obj);
        if (!info) {
            return { changed: false, baked: false, delta: 0, failed: true };
        }

        const delta = this._normalizeAngle180(targetFromDown - (info.fromDown || 0));
        let changed = false;
        if (Math.abs(delta) > 0.001) {
            this._applyObjectRotationDriverDelta(obj, delta);
            changed = true;
        }

        let baked = false;
        if (bake) {
            baked = this._bakeRotationBaselineForObject(obj);
            changed = changed || baked;
        }

        return { changed, baked, delta, failed: false };
    },

    resetSelectedRotationBaseline() {
        const targets = this.getSelectedObjects();
        if (!targets.length) {
            Utils.showToast('Select at least one object first', 'warning');
            return;
        }

        eventBus.emit('history:flush');
        let changed = 0;
        let failed = 0;

        targets.forEach(obj => {
            const didReset = this._bakeRotationBaselineForObject(obj);

            if (didReset) changed++;
            else failed++;
        });

        if (!changed) {
            Utils.showToast(failed ? 'Could not reset rotation for the selected object(s)' : 'Selected object is already at 0°', failed ? 'warning' : 'info');
            return;
        }

        this.updateObjectList();
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        if (this._propRecording) this._capturePropStep();
        eventBus.emit('history:push');
        Utils.showToast(
            failed
                ? `Reset ${changed} object(s) to a new 0° baseline (${failed} skipped)`
                : `Reset ${changed} object(s) to a new 0° baseline`,
            failed ? 'info' : 'success'
        );
    },

    alignSelectedDownAndResetBaseline() {
        const targets = this.getSelectedObjects();
        if (!targets.length) {
            Utils.showToast('Select at least one object first', 'warning');
            return;
        }

        eventBus.emit('history:flush');
        let changed = 0;
        let failed = 0;

        targets.forEach(obj => {
            const result = this.normalizeObjectDownBaseline(obj, { bake: true, targetFromDown: 0 });
            if (result.failed) {
                failed++;
                return;
            }
            if (result.changed) {
                changed++;
            } else {
                failed++;
            }
        });

        if (!changed) {
            Utils.showToast(
                failed ? 'Could not align the selected object(s) to down' : 'Selected object is already down with a 0° baseline',
                failed ? 'warning' : 'info'
            );
            return;
        }

        this.updateObjectList();
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        if (this._propRecording) this._capturePropStep();
        eventBus.emit('history:push');
        Utils.showToast(
            failed
                ? `Aligned ${changed} object(s) to down and set a new 0° baseline (${failed} skipped)`
                : `Aligned ${changed} object(s) to down and set a new 0° baseline`,
            failed ? 'info' : 'success'
        );
    },

    _getPictureFillTargets() {
        const unsupported = new Set(['image', 'text', 'line', 'scribble']);
        return this.getSelectedObjects().filter(obj => obj && !unsupported.has(obj.type));
    },

    _getPictureFillAssetSource(element) {
        if (!element) return '';
        const data = element.dataset || {};
        const nestedImage = element.matches?.('img') ? element : element.querySelector?.('img');
        return data.assetUrl
            || data.assetSrc
            || data.imageSrc
            || data.src
            || data.url
            || nestedImage?.dataset?.assetUrl
            || nestedImage?.dataset?.assetSrc
            || nestedImage?.dataset?.imageSrc
            || nestedImage?.currentSrc
            || nestedImage?.src
            || '';
    },

    _refreshPictureFillSources() {
        const stageSelect = document.getElementById('prop-picture-stage-source');
        if (stageSelect) {
            const previous = stageSelect.value;
            stageSelect.innerHTML = '<option value="">Choose stage image...</option>';
            (this.objects || [])
                .filter(obj => obj?.type === 'image' && obj.imageSrc)
                .forEach(obj => {
                    const option = document.createElement('option');
                    option.value = obj.id;
                    option.textContent = obj.name || 'Stage image';
                    stageSelect.appendChild(option);
                });
            if (Array.from(stageSelect.options).some(option => option.value === previous)) stageSelect.value = previous;
        }

        const assetSelect = document.getElementById('prop-picture-asset-source');
        if (!assetSelect) return;
        const previous = assetSelect.value;
        const candidates = document.querySelectorAll([
            '#asset-library img',
            '#assets-panel img',
            '.asset-library img',
            '.asset-item',
            '.asset-card',
            '[data-asset-url]',
            '[data-asset-src]',
            '[data-image-src]'
        ].join(','));
        const seen = new Set();
        this._pictureFillAssetSources = new Map();
        assetSelect.innerHTML = '<option value="">Choose asset...</option>';
        candidates.forEach((element, index) => {
            const src = this._getPictureFillAssetSource(element);
            if (!src || seen.has(src)) return;
            seen.add(src);
            const nestedImage = element.matches?.('img') ? element : element.querySelector?.('img');
            const name = element.dataset?.name
                || element.dataset?.assetName
                || element.getAttribute?.('title')
                || nestedImage?.alt
                || `Asset ${index + 1}`;
            const key = `asset-${this._pictureFillAssetSources.size + 1}`;
            this._pictureFillAssetSources.set(key, { src, name });
            const option = document.createElement('option');
            option.value = key;
            option.textContent = name;
            assetSelect.appendChild(option);
        });
        if (Array.from(assetSelect.options).some(option => option.value === previous)) assetSelect.value = previous;
    },

    _applyPictureFillSource(src, label = 'Picture') {
        const targets = this._getPictureFillTargets();
        if (!targets.length) {
            Utils.showToast('Select one or more shapes first.', 'warning');
            return false;
        }
        if (!src) {
            Utils.showToast('Choose a picture source first.', 'warning');
            return false;
        }
        targets.forEach(obj => {
            obj.fillType = 'picture';
            obj.pictureFillMode = ['stretch', 'fill', 'fit'].includes(obj.pictureFillMode)
                ? obj.pictureFillMode
                : 'stretch';
            obj.pictureFillRotation = Number(obj.pictureFillRotation) || 0;
            obj.textureImageSrc = src;
            obj.loadTextureImage?.(src);
        });
        const fillType = document.getElementById('prop-fill-type');
        if (fillType) fillType.value = 'picture';
        document.getElementById('fill-color-field')?.classList.add('hidden');
        document.getElementById('gradient-controls')?.classList.add('hidden');
        document.getElementById('pattern-controls')?.classList.add('hidden');
        document.getElementById('picture-fill-controls')?.classList.remove('hidden');
        this._syncPictureFillControls();
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        eventBus.emit('history:push');
        Utils.showToast(`${label} applied as shape fill.`, 'success');
        return true;
    },

    _bindSvgAvatarPropertyEvents() {
        const section = document.getElementById('svg-avatar-properties');
        if (!section || section.dataset.bound === '1') return;
        section.dataset.bound = '1';

        section.querySelectorAll('[data-svg-avatar-prop]').forEach(input => {
            input.addEventListener('input', (event) => {
                this._setSvgAvatarPresenterProperty(event.target.dataset.svgAvatarProp, event.target.value, { live: true });
            });
            input.addEventListener('change', (event) => {
                this._setSvgAvatarPresenterProperty(event.target.dataset.svgAvatarProp, event.target.value, { commit: true });
            });
        });

        section.querySelectorAll('[data-svg-avatar-motion]').forEach(button => {
            button.addEventListener('click', () => {
                this._playSvgAvatarPresenterMotion(button.dataset.svgAvatarMotion);
            });
        });

        document.getElementById('btn-svg-avatar-reset')?.addEventListener('click', () => {
            this._resetSvgAvatarPresenterState();
        });
        document.getElementById('btn-svg-avatar-copy-state')?.addEventListener('click', () => {
            this._copySvgAvatarPresenterState();
        });
        document.getElementById('svg-african-live-face-preset')?.addEventListener('change', (event) => {
            this._applySvgAfricanLiveFacePreset(event.target.value, { commit: true });
        });
    },

    _getSelectedSvgAvatarObject(seed) {
        const obj = seed || this.getSelectedObjects?.()[0];
        return obj?.type === 'image' && obj._svgAvatar?.kind === 'presenter-avatar' ? obj : null;
    },

    _getSelectedSvgAfricanPremiumHeadObject(seed) {
        const selected = seed ? [seed] : (this.getSelectedObjects?.() || []);
        const isPremium = obj => !!(
            obj?.type === 'image' &&
            (obj._characterAppearanceProvider === 'svg-african-premium' ||
                obj._svgCharacterPremiumPart === true ||
                obj._svgAfricanPremiumAssetId ||
                obj._svgCharacterPremiumAssetId)
        );
        const partKey = obj => obj?._svgCharacterPremiumPartKey || obj?._svgCharacterPartKey || obj?.bodyPartData?.partKey || '';
        const direct = selected.find(obj => isPremium(obj) && partKey(obj) === 'head-neck');
        if (direct) return direct;
        const seedObj = selected.find(isPremium);
        const instanceId = seedObj?._svgCharacterInstanceId;
        if (!instanceId) return null;
        return (this.objects || []).find(obj => isPremium(obj) && obj._svgCharacterInstanceId === instanceId && partKey(obj) === 'head-neck') || null;
    },

    _getSvgAfricanFacePropertyCatalog() {
        return window.SvgAfricanPremiumAssets?.faceProperties || {};
    },

    _getSvgAfricanFacePresetCatalog() {
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        if (PremiumAssets?.listFacePresets) return PremiumAssets.listFacePresets();
        return Object.values(PremiumAssets?.facePresets || {}).map(preset => ({
            id: preset.id,
            name: preset.name || preset.id,
            state: { ...(preset.state || {}) }
        }));
    },

    _populateSvgAfricanFacePresetSelect(select) {
        if (!select) return;
        const current = select.value;
        const escape = value => (Utils.escapeHtml
            ? Utils.escapeHtml(String(value ?? ''))
            : String(value ?? '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[ch])));
        const options = [{ id: '', name: 'Custom' }, ...this._getSvgAfricanFacePresetCatalog()];
        select.innerHTML = options.map(option => `<option value="${escape(option.id)}">${escape(option.name || option.id)}</option>`).join('');
        if ([...select.options].some(option => option.value === current)) select.value = current;
    },

    _findSvgAfricanFacePresetForState(state = {}) {
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        if (!PremiumAssets?.getFacePresetState) return '';
        const props = Object.keys(this._getSvgAfricanFacePropertyCatalog());
        const current = this._getSvgAfricanFaceDefaultState();
        Object.assign(current, state || {});
        const nearlyEqual = (a, b) => Math.abs((Number(a) || 0) - (Number(b) || 0)) < 0.001;
        const match = this._getSvgAfricanFacePresetCatalog().find(preset => {
            const presetState = PremiumAssets.getFacePresetState(preset.id);
            return props.every(prop => nearlyEqual(current[prop], presetState[prop]));
        });
        return match?.id || '';
    },

    _getSvgAfricanFaceDefaultState() {
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        if (PremiumAssets?.getDefaultFaceState) return PremiumAssets.getDefaultFaceState();
        const catalog = this._getSvgAfricanFacePropertyCatalog();
        return Object.fromEntries(Object.entries(catalog).map(([key, config]) => [
            key,
            Number.isFinite(Number(config?.defaultValue)) ? Number(config.defaultValue) : 0
        ]));
    },

    _getSvgAfricanFaceState(obj) {
        if (!obj) return {};
        const defaults = this._getSvgAfricanFaceDefaultState();
        obj._svgAfricanFaceState = {
            ...defaults,
            ...(obj._svgCharacterConfig?._svgAfricanFaceState || {}),
            ...(obj._svgAfricanFaceState || {})
        };
        return obj._svgAfricanFaceState;
    },

    _clampSvgAfricanFaceProperty(prop, value) {
        const config = this._getSvgAfricanFacePropertyCatalog()?.[prop] || {};
        const min = Number.isFinite(Number(config.min)) ? Number(config.min) : -Infinity;
        const max = Number.isFinite(Number(config.max)) ? Number(config.max) : Infinity;
        const parsed = Number(value);
        const fallback = Number.isFinite(Number(config.defaultValue)) ? Number(config.defaultValue) : 0;
        const numeric = Number.isFinite(parsed) ? parsed : fallback;
        return Math.max(min, Math.min(max, numeric));
    },

    _getSvgAfricanPremiumCharacterObjects(headObj) {
        const instanceId = headObj?._svgCharacterInstanceId;
        if (!instanceId) return headObj ? [headObj] : [];
        return (this.objects || []).filter(obj => obj?._svgCharacterInstanceId === instanceId);
    },

    _syncSvgAfricanPremiumFaceStateToCharacter(headObj) {
        if (!headObj) return;
        const state = { ...this._getSvgAfricanFaceState(headObj) };
        const presetId = headObj._svgAfricanFacePreset || headObj._svgCharacterConfig?._svgAfricanFacePreset || '';
        this._getSvgAfricanPremiumCharacterObjects(headObj).forEach(obj => {
            obj._svgAfricanFaceState = { ...state };
            obj._svgAfricanFacePreset = presetId;
            if (obj._svgCharacterConfig && typeof obj._svgCharacterConfig === 'object') {
                obj._svgCharacterConfig._svgAfricanFaceState = { ...state };
                obj._svgCharacterConfig._svgAfricanFacePreset = presetId;
                obj._svgCharacterConfig.facePreset = presetId;
            }
        });
    },

    _renderSvgAfricanPremiumFaceStateToImage(obj) {
        if (!obj || obj.type !== 'image' || !window.SvgAfricanPremiumAssets?.renderPartDataUrl) return false;
        const partKey = obj._svgCharacterPremiumPartKey || obj._svgCharacterPartKey || obj.bodyPartData?.partKey;
        if (partKey !== 'head-neck') return false;
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        const config = {
            ...(obj._svgCharacterConfig || {}),
            _svgAfricanFaceState: this._getSvgAfricanFaceState(obj),
            _svgAfricanFacePreset: obj._svgAfricanFacePreset || obj._svgCharacterConfig?._svgAfricanFacePreset || '',
            premiumAdjustments: obj._svgAfricanAdjustments || obj._svgCharacterConfig?.premiumAdjustments || {}
        };
        const assetId = obj._svgCharacterPremiumAssetId || obj._svgAfricanPremiumAssetId || config.assetCharacterId || PremiumAssets.getDefaultAssetId?.();
        if (!assetId) return false;
        try {
            const state = this._getSvgAfricanFaceState(obj);
            const renderKey = JSON.stringify({ state, adjustments: config.premiumAdjustments, assetId });
            if (obj._svgAfricanLastFaceRenderKey === renderKey) return true;
            obj._svgAfricanLastFaceRenderKey = renderKey;
            const src = PremiumAssets.renderPartDataUrl(assetId, 'head-neck', config, obj._svgCharacterInstanceId || 'svgaf-premium', {
                faceState: state,
                adjustments: config.premiumAdjustments
            });
            obj.imageSrc = src;
            obj.loadImage?.(src);
            obj._svgCharacterConfig = config;
            obj._svgAfricanFacePreset = config._svgAfricanFacePreset || '';
            this._syncSvgAfricanPremiumFaceStateToCharacter(obj);
            return true;
        } catch (err) {
            console.warn('SVG African premium face render failed:', err);
            return false;
        }
    },

    _bindSvgAfricanLiveAdjustmentEvents() {
        const section = document.getElementById('svg-african-live-adjustments');
        if (!section || section.dataset.bound === '1') return;
        section.dataset.bound = '1';

        section.querySelectorAll('[data-svg-african-live-adjust]').forEach(input => {
            input.addEventListener('input', (event) => {
                this._setSvgAfricanLiveAdjustment(event.target.dataset.svgAfricanLiveAdjust, event.target.value, { live: true });
            });
            input.addEventListener('change', (event) => {
                this._setSvgAfricanLiveAdjustment(event.target.dataset.svgAfricanLiveAdjust, event.target.value, { commit: true });
            });
        });

        section.querySelectorAll('[data-svg-african-live-color]').forEach(input => {
            input.addEventListener('input', (event) => {
                this._setSvgAfricanLiveColor(event.target.dataset.svgAfricanLiveColor, event.target.value, { live: true });
            });
            input.addEventListener('change', (event) => {
                this._setSvgAfricanLiveColor(event.target.dataset.svgAfricanLiveColor, event.target.value, { commit: true });
            });
        });

        document.getElementById('btn-svg-african-live-reset')?.addEventListener('click', () => {
            this._resetSvgAfricanLiveAdjustments();
        });
        document.getElementById('btn-svg-african-live-reset-colors')?.addEventListener('click', () => {
            this._resetSvgAfricanLiveColors();
        });
        document.getElementById('btn-svg-african-live-copy')?.addEventListener('click', () => {
            this._copySvgAfricanLiveAdjustmentState();
        });
        document.getElementById('btn-svg-african-live-copy-calibration')?.addEventListener('click', () => {
            this._copySvgAfricanPremiumCalibration();
        });
        document.getElementById('btn-svg-african-live-apply-calibration')?.addEventListener('click', () => {
            this._applySvgAfricanPremiumCalibrationFromClipboard();
        });
        document.getElementById('btn-svg-african-live-save-calibration')?.addEventListener('click', () => {
            this._saveSelectedSvgAfricanPremiumCalibrationPreset();
        });
        document.getElementById('btn-svg-african-live-apply-saved-calibration')?.addEventListener('click', () => {
            this._applySelectedSvgAfricanPremiumCalibrationPreset();
        });
        document.getElementById('btn-svg-african-live-delete-calibration')?.addEventListener('click', () => {
            this._deleteSelectedSvgAfricanPremiumCalibrationPreset();
        });
        document.getElementById('svg-african-calibration-preset-select')?.addEventListener('change', (event) => {
            this._syncSvgAfricanCalibrationPresetControls(undefined, event.target.value);
        });
    },

    _isSvgAfricanPremiumPartObject(obj) {
        return !!(
            obj?.type === 'image' &&
            (obj._characterAppearanceProvider === 'svg-african-premium' ||
                obj._svgCharacterPremiumPart === true ||
                obj._svgAfricanPremiumAssetId ||
                obj._svgCharacterPremiumAssetId)
        );
    },

    _getSelectedSvgAfricanPremiumPartObject(seed) {
        if (this._isSvgAfricanPremiumPartObject(seed)) return seed;
        const selected = this.getSelectedObjects?.() || [];
        return selected.find(obj => this._isSvgAfricanPremiumPartObject(obj)) || null;
    },

    _getSelectedSvgAfricanPremiumArmature(seed) {
        const part = this._getSelectedSvgAfricanPremiumPartObject(seed);
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        if (!part || !jointSystem) return null;
        const detected = jointSystem._detectArmature?.(part) || null;
        const live = jointSystem._resolveSvgAfricanArmature?.(detected) || detected;
        if (live?.root?._characterAppearanceProvider === 'svg-african-premium') return live;
        const instanceId = part._svgCharacterInstanceId;
        if (!instanceId) return null;
        const parts = (this.objects || []).filter(obj => obj?._svgCharacterInstanceId === instanceId);
        return jointSystem._detectArmatureFromPool?.(parts) || null;
    },

    _getSvgAfricanAdjustmentPropertyCatalog() {
        return window.SvgAfricanPremiumAssets?.adjustProperties || {};
    },

    _getSvgAfricanDefaultAdjustments() {
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        if (PremiumAssets?.getDefaultAdjustments) return PremiumAssets.getDefaultAdjustments();
        const catalog = this._getSvgAfricanAdjustmentPropertyCatalog();
        return Object.fromEntries(Object.entries(catalog).map(([key, config]) => [
            key,
            Number.isFinite(Number(config?.defaultValue)) ? Number(config.defaultValue) : 0
        ]));
    },

    _getSvgAfricanCalibrationPresetStoreKey() {
        return 'animstage.svgAfricanPremium.calibrationPresets.v1';
    },

    _readSvgAfricanPremiumCalibrationPresets() {
        try {
            const raw = localStorage.getItem(this._getSvgAfricanCalibrationPresetStoreKey());
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.presets) ? parsed.presets : []);
            return list
                .filter(entry => entry?.payload?.kind === 'svg-african-premium-calibration')
                .map(entry => ({
                    id: String(entry.id || `cal-${Date.now().toString(36)}`),
                    name: String(entry.name || 'Untitled calibration'),
                    assetId: String(entry.assetId || entry.payload?.assetId || 'premium'),
                    savedAt: entry.savedAt || entry.updatedAt || entry.createdAt || null,
                    payload: entry.payload
                }))
                .slice(-80);
        } catch (err) {
            console.warn('SVG character calibration preset read failed:', err);
            return [];
        }
    },

    _writeSvgAfricanPremiumCalibrationPresets(presets = []) {
        try {
            const clean = presets
                .filter(entry => entry?.payload?.kind === 'svg-african-premium-calibration')
                .slice(-80);
            localStorage.setItem(this._getSvgAfricanCalibrationPresetStoreKey(), JSON.stringify(clean));
            return true;
        } catch (err) {
            console.warn('SVG character calibration preset write failed:', err);
            Utils.showToast('Saved calibration could not be written to browser storage.', 'error');
            return false;
        }
    },

    _syncSvgAfricanCalibrationPresetControls(seed, selectedId = null) {
        const select = document.getElementById('svg-african-calibration-preset-select');
        if (!select) return;
        const armature = this._getSelectedSvgAfricanPremiumArmature(seed);
        const hasCharacter = !!armature?.root;
        const currentAssetId = armature?.root?._svgCharacterPremiumAssetId
            || armature?.root?._svgAfricanPremiumAssetId
            || armature?.root?._svgCharacterConfig?.assetCharacterId
            || '';
        const presets = this._readSvgAfricanPremiumCalibrationPresets();
        const previousValue = selectedId || select.value || '';

        select.replaceChildren();
        const placeholder = new Option(presets.length ? 'Saved calibrations...' : 'No saved calibrations', '');
        select.add(placeholder);
        presets.forEach(entry => {
            const suffix = entry.assetId && entry.assetId !== currentAssetId ? ` - ${entry.assetId}` : '';
            select.add(new Option(`${entry.name}${suffix}`, entry.id));
        });
        select.disabled = !hasCharacter || presets.length === 0;
        if (previousValue && presets.some(entry => entry.id === previousValue)) {
            select.value = previousValue;
        }

        const hasSelection = hasCharacter && !!select.value;
        const saveBtn = document.getElementById('btn-svg-african-live-save-calibration');
        const applyBtn = document.getElementById('btn-svg-african-live-apply-saved-calibration');
        const deleteBtn = document.getElementById('btn-svg-african-live-delete-calibration');
        if (saveBtn) saveBtn.disabled = !hasCharacter;
        if (applyBtn) applyBtn.disabled = !hasSelection;
        if (deleteBtn) deleteBtn.disabled = !hasSelection;
    },

    _getSvgAfricanLiveAdjustmentState(seed) {
        const armature = this._getSelectedSvgAfricanPremiumArmature(seed);
        const root = armature?.root || this._getSelectedSvgAfricanPremiumPartObject(seed);
        if (!root) return {};
        const raw = {
            ...(root._svgCharacterConfig?.premiumAdjustments || {}),
            ...(root._svgAfricanAdjustments || {})
        };
        const PremiumAssets = window.SvgAfricanPremiumAssets;
        if (PremiumAssets?.getAdjustments) {
            return PremiumAssets.getAdjustments({ premiumAdjustments: raw });
        }
        return {
            ...this._getSvgAfricanDefaultAdjustments(),
            ...raw
        };
    },

    _clampSvgAfricanLiveAdjustment(prop, value) {
        const config = this._getSvgAfricanAdjustmentPropertyCatalog()?.[prop] || {};
        const min = Number.isFinite(Number(config.min)) ? Number(config.min) : -Infinity;
        const max = Number.isFinite(Number(config.max)) ? Number(config.max) : Infinity;
        const fallback = Number.isFinite(Number(config.defaultValue)) ? Number(config.defaultValue) : 0;
        const numeric = Number(value);
        return Math.max(min, Math.min(max, Number.isFinite(numeric) ? numeric : fallback));
    },

    _formatSvgAfricanLiveAdjustmentValue(value) {
        const numeric = Number(value) || 0;
        return `${Math.round(numeric * 100)}%`;
    },

    _setSvgAfricanLiveAdjustmentControlValue(prop, value) {
        const kebab = String(prop || '').replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
        const input = document.getElementById(`svg-african-live-adj-${kebab}`);
        const output = document.getElementById(`svg-african-live-adj-${kebab}-val`);
        const numeric = Number(value) || 0;
        if (input && document.activeElement !== input) input.value = String(numeric);
        if (output) output.textContent = this._formatSvgAfricanLiveAdjustmentValue(numeric);
    },

    _getSvgAfricanLiveColorFallbacks() {
        return {
            top: '#17345d',
            inner: '#fff4e6',
            tie: '#3b251a',
            bottom: '#182842',
            headwear: '#17345d',
            shoes: '#171717',
            glasses: '#26374f',
            accent: '#c68b2c'
        };
    },

    _normalizeSvgAfricanLiveColor(value) {
        const text = String(value || '').trim().toLowerCase();
        return /^#[0-9a-f]{6}$/.test(text) ? text : null;
    },

    _getSvgAfricanLiveColorState(seed) {
        const armature = this._getSelectedSvgAfricanPremiumArmature(seed);
        const root = armature?.root || this._getSelectedSvgAfricanPremiumPartObject(seed);
        if (!root) return {};
        const raw = root._svgCharacterConfig?.styling?.colorOverrides
            || root._svgCharacterStyling?.colorOverrides
            || root._svgCharacterConfig?.colorOverrides
            || {};
        if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
        const fallbacks = this._getSvgAfricanLiveColorFallbacks();
        return Object.keys(fallbacks).reduce((output, key) => {
            const color = this._normalizeSvgAfricanLiveColor(raw[key]);
            if (color) output[key] = color;
            return output;
        }, {});
    },

    _setSvgAfricanLiveColorControlValue(prop, value) {
        const input = document.getElementById(`svg-african-live-color-${prop}`);
        const fallback = this._getSvgAfricanLiveColorFallbacks()[prop] || '#000000';
        const color = this._normalizeSvgAfricanLiveColor(value) || fallback;
        if (input && document.activeElement !== input) input.value = color;
    },

    _syncSvgAfricanLiveAdjustmentControls(seed) {
        const section = document.getElementById('svg-african-live-adjustments');
        if (!section) return;
        const armature = this._getSelectedSvgAfricanPremiumArmature(seed);
        const root = armature?.root || null;
        const visible = !!root;
        section.classList.toggle('hidden', !visible);
        if (!visible) return;

        const catalog = this._getSvgAfricanAdjustmentPropertyCatalog();
        const state = this._getSvgAfricanLiveAdjustmentState(root);
        const meta = document.getElementById('svg-african-live-adjust-meta');
        if (meta) {
            const assetId = root._svgCharacterPremiumAssetId || root._svgAfricanPremiumAssetId || root._svgCharacterConfig?.assetCharacterId || 'premium';
            meta.textContent = `${root.name || 'Selected SVG character'} - ${assetId}`;
        }
        const colorState = this._getSvgAfricanLiveColorState(root);
        const colorFallbacks = this._getSvgAfricanLiveColorFallbacks();
        section.querySelectorAll('[data-svg-african-live-color]').forEach(input => {
            const prop = input.dataset.svgAfricanLiveColor;
            this._setSvgAfricanLiveColorControlValue(prop, colorState[prop] || colorFallbacks[prop]);
        });
        section.querySelectorAll('[data-svg-african-live-adjust]').forEach(input => {
            const prop = input.dataset.svgAfricanLiveAdjust;
            const config = catalog[prop];
            const row = input.closest('label');
            if (row) row.classList.toggle('hidden', !config);
            if (!config) return;
            if (Number.isFinite(Number(config.min))) input.min = String(config.min);
            if (Number.isFinite(Number(config.max))) input.max = String(config.max);
            if (Number.isFinite(Number(config.step))) input.step = String(config.step);
            this._setSvgAfricanLiveAdjustmentControlValue(prop, state[prop]);
        });
        this._syncSvgAfricanCalibrationPresetControls(root);
    },

    _applySvgAfricanLiveAdjustments(nextAdjustments, options = {}) {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        if (!armature?.root || !jointSystem?.updateSvgAfricanCharacterAppearance) return false;
        const targets = this._getSvgAfricanPremiumCharacterObjects(armature.root);

        if (options.snapshot !== false && this._isRecording && !this._contRec?.active && !this._svgAfricanLiveAdjustRecordPending) {
            this._snapshotForRecording?.(targets);
            this._svgAfricanLiveAdjustRecordPending = true;
        }

        const ok = jointSystem.updateSvgAfricanCharacterAppearance(armature, {
            premiumAdjustments: { ...(nextAdjustments || {}) }
        }, {
            pushHistory: false,
            updateProperties: false,
            updateObjectList: options.updateObjectList !== false,
            render: true
        });
        if (!ok) return false;
        this._syncSvgAfricanLiveAdjustmentControls(armature.root);
        eventBus.emit('object:updated', armature.root);

        if (options.commit) {
            if (this._isRecording && this._svgAfricanLiveAdjustRecordPending) {
                this._svgAfricanLiveAdjustRecordPending = false;
                this._showRecordingConfirm?.();
            }
            if (this._propRecording) this._capturePropStep?.();
            eventBus.emit('history:push');
        }
        return true;
    },

    _normalizeSvgAfricanLiveColorMap(nextColors = {}) {
        const source = nextColors && typeof nextColors === 'object' && !Array.isArray(nextColors) ? nextColors : {};
        return Object.keys(this._getSvgAfricanLiveColorFallbacks()).reduce((output, key) => {
            const color = this._normalizeSvgAfricanLiveColor(source[key]);
            if (color) output[key] = color;
            return output;
        }, {});
    },

    _applySvgAfricanLiveColors(nextColors, options = {}) {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        if (!armature?.root || !jointSystem?.updateSvgAfricanCharacterAppearance) return false;
        const targets = this._getSvgAfricanPremiumCharacterObjects(armature.root);
        const colorOverrides = this._normalizeSvgAfricanLiveColorMap(nextColors);

        if (options.snapshot !== false && this._isRecording && !this._contRec?.active && !this._svgAfricanLiveColorRecordPending) {
            this._snapshotForRecording?.(targets);
            this._svgAfricanLiveColorRecordPending = true;
        }

        const ok = jointSystem.updateSvgAfricanCharacterAppearance(armature, {
            styling: { colorOverrides },
            colorOverrides
        }, {
            pushHistory: false,
            updateProperties: false,
            updateObjectList: options.updateObjectList !== false,
            render: true
        });
        if (!ok) return false;
        this._syncSvgAfricanLiveAdjustmentControls(armature.root);
        eventBus.emit('object:updated', armature.root);

        if (options.commit) {
            if (this._isRecording && this._svgAfricanLiveColorRecordPending) {
                this._svgAfricanLiveColorRecordPending = false;
                this._showRecordingConfirm?.();
            }
            if (this._propRecording) this._capturePropStep?.();
            eventBus.emit('history:push');
        }
        return true;
    },

    _setSvgAfricanLiveColor(prop, rawValue, options = {}) {
        if (!prop || !Object.prototype.hasOwnProperty.call(this._getSvgAfricanLiveColorFallbacks(), prop)) return;
        const current = this._getSvgAfricanLiveColorState();
        const color = this._normalizeSvgAfricanLiveColor(rawValue);
        if (!color) return;
        const next = {
            ...current,
            [prop]: color
        };
        this._setSvgAfricanLiveColorControlValue(prop, color);
        this._applySvgAfricanLiveColors(next, {
            commit: !!options.commit,
            updateObjectList: !!options.commit
        });
    },

    _resetSvgAfricanLiveColors() {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        if (!armature?.root) {
            Utils.showToast('Select a premium SVG African character first.', 'warning');
            return;
        }
        const targets = this._getSvgAfricanPremiumCharacterObjects(armature.root);
        if (this._isRecording && !this._contRec?.active) {
            this._snapshotForRecording?.(targets);
            this._svgAfricanLiveColorRecordPending = true;
        }
        if (this._applySvgAfricanLiveColors({}, { commit: true, snapshot: false, updateObjectList: true })) {
            Utils.showToast('SVG character wear colors reset.', 'success');
        }
    },

    _setSvgAfricanLiveAdjustment(prop, rawValue, options = {}) {
        if (!prop || !this._getSvgAfricanAdjustmentPropertyCatalog()?.[prop]) return;
        const current = this._getSvgAfricanLiveAdjustmentState();
        if (!Object.keys(current).length) return;
        const next = {
            ...current,
            [prop]: this._clampSvgAfricanLiveAdjustment(prop, rawValue)
        };
        this._setSvgAfricanLiveAdjustmentControlValue(prop, next[prop]);
        this._applySvgAfricanLiveAdjustments(next, {
            commit: !!options.commit,
            updateObjectList: !!options.commit
        });
    },

    _resetSvgAfricanLiveAdjustments() {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        if (!armature?.root) {
            Utils.showToast('Select a premium SVG African character first.', 'warning');
            return;
        }
        const targets = this._getSvgAfricanPremiumCharacterObjects(armature.root);
        if (this._isRecording && !this._contRec?.active) {
            this._snapshotForRecording?.(targets);
            this._svgAfricanLiveAdjustRecordPending = true;
        }
        const defaults = this._getSvgAfricanDefaultAdjustments();
        if (this._applySvgAfricanLiveAdjustments(defaults, { commit: true, snapshot: false, updateObjectList: true })) {
            Utils.showToast('SVG character shape reset.', 'success');
        }
    },

    async _copySvgAfricanLiveAdjustmentState() {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        if (!armature?.root) {
            Utils.showToast('Select a premium SVG African character first.', 'warning');
            return;
        }
        const payload = {
            kind: 'svg-african-premium-adjustments',
            assetId: armature.root._svgCharacterPremiumAssetId || armature.root._svgAfricanPremiumAssetId || armature.root._svgCharacterConfig?.assetCharacterId || 'premium',
            identityId: armature.root._svgCharacterIdentityId || armature.root._svgCharacterConfig?.identityId || null,
            adjustments: this._getSvgAfricanLiveAdjustmentState(armature.root),
            colorOverrides: this._getSvgAfricanLiveColorState(armature.root)
        };
        await this._copyTextToClipboard(
            JSON.stringify(payload, null, 2),
            'Copied SVG character shape state.',
            'SVG character shape copy failed:'
        );
    },

    async _copySvgAfricanPremiumCalibration() {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        if (!armature?.root || !jointSystem?.captureSvgAfricanPremiumCalibration) {
            Utils.showToast('Select a premium SVG African character first.', 'warning');
            return;
        }
        const payload = jointSystem.captureSvgAfricanPremiumCalibration(armature);
        if (!payload) {
            Utils.showToast('Could not capture SVG character calibration.', 'warning');
            return;
        }
        await this._copyTextToClipboard(
            JSON.stringify(payload, null, 2),
            'Copied SVG character calibration.',
            'SVG character calibration copy failed:'
        );
    },

    _applySvgAfricanPremiumCalibrationPayload(armature, payload, options = {}) {
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        if (!armature?.root || !jointSystem?.applySvgAfricanPremiumCalibration || payload?.kind !== 'svg-african-premium-calibration') {
            return null;
        }
        const targets = this._getSvgAfricanPremiumCharacterObjects(armature.root);
        if (this._isRecording && !this._contRec?.active) {
            this._snapshotForRecording?.(targets);
        }
        const result = jointSystem.applySvgAfricanPremiumCalibration(armature, payload, {
            preserveStagePosition: true,
            applyPose: true,
            pushHistory: false,
            updateProperties: false,
            updateObjectList: true,
            render: true,
            ...options
        });
        if (!result) return null;
        this._syncSvgAfricanLiveAdjustmentControls(armature.root);
        this.updateProperties?.();
        eventBus.emit('object:updated', armature.root);
        if (this._isRecording && !this._contRec?.active) this._showRecordingConfirm?.();
        if (this._propRecording) this._capturePropStep?.();
        eventBus.emit('history:push');
        return result;
    },

    _saveSelectedSvgAfricanPremiumCalibrationPreset() {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        if (!armature?.root || !jointSystem?.captureSvgAfricanPremiumCalibration) {
            Utils.showToast('Select a premium SVG African character first.', 'warning');
            return;
        }
        const payload = jointSystem.captureSvgAfricanPremiumCalibration(armature);
        if (!payload) {
            Utils.showToast('Could not capture SVG character calibration.', 'warning');
            return;
        }
        const defaultName = `${armature.root.name || 'SVG African'} calibration`;
        const name = (typeof window.prompt === 'function'
            ? window.prompt('Name this SVG character calibration preset', defaultName)
            : defaultName) || '';
        const trimmed = name.trim();
        if (!trimmed) return;
        const presets = this._readSvgAfricanPremiumCalibrationPresets();
        const savedAt = new Date().toISOString();
        const entry = {
            id: `svgaf-cal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
            name: trimmed,
            assetId: payload.assetId || 'premium',
            savedAt,
            payload: {
                ...payload,
                savedPresetName: trimmed,
                savedAt
            }
        };
        presets.push(entry);
        if (!this._writeSvgAfricanPremiumCalibrationPresets(presets)) return;
        this._syncSvgAfricanCalibrationPresetControls(armature.root, entry.id);
        Utils.showToast('Saved SVG character calibration preset.', 'success');
    },

    _getSelectedSvgAfricanPremiumCalibrationPreset() {
        const select = document.getElementById('svg-african-calibration-preset-select');
        const id = select?.value || '';
        if (!id) return null;
        return this._readSvgAfricanPremiumCalibrationPresets().find(entry => entry.id === id) || null;
    },

    _applySelectedSvgAfricanPremiumCalibrationPreset() {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        if (!armature?.root) {
            Utils.showToast('Select a premium SVG African character first.', 'warning');
            return;
        }
        const preset = this._getSelectedSvgAfricanPremiumCalibrationPreset();
        if (!preset?.payload) {
            Utils.showToast('Choose a saved SVG character calibration first.', 'warning');
            return;
        }
        const result = this._applySvgAfricanPremiumCalibrationPayload(armature, preset.payload);
        if (!result) {
            Utils.showToast('Saved SVG character calibration could not be applied.', 'error');
            return;
        }
        this._syncSvgAfricanCalibrationPresetControls(armature.root, preset.id);
        Utils.showToast(`Applied saved calibration: ${preset.name}`, 'success');
    },

    _deleteSelectedSvgAfricanPremiumCalibrationPreset() {
        const preset = this._getSelectedSvgAfricanPremiumCalibrationPreset();
        if (!preset) {
            Utils.showToast('Choose a saved SVG character calibration first.', 'warning');
            return;
        }
        const ok = typeof window.confirm === 'function'
            ? window.confirm(`Delete saved calibration "${preset.name}"?`)
            : true;
        if (!ok) return;
        const presets = this._readSvgAfricanPremiumCalibrationPresets().filter(entry => entry.id !== preset.id);
        if (!this._writeSvgAfricanPremiumCalibrationPresets(presets)) return;
        this._syncSvgAfricanCalibrationPresetControls(undefined, '');
        Utils.showToast('Deleted SVG character calibration preset.', 'success');
    },

    async _applySvgAfricanPremiumCalibrationFromClipboard() {
        const armature = this._getSelectedSvgAfricanPremiumArmature();
        const jointSystem = window.app?.jointSystem || window.jointSystem || this.stage?.app?.jointSystem;
        if (!armature?.root || !jointSystem?.applySvgAfricanPremiumCalibration) {
            Utils.showToast('Select a premium SVG African character first.', 'warning');
            return;
        }

        let text = '';
        try {
            if (navigator.clipboard?.readText) {
                text = await navigator.clipboard.readText();
            }
        } catch (_) {
            text = '';
        }
        if (!text && typeof window.prompt === 'function') {
            text = window.prompt('Paste SVG African premium calibration JSON') || '';
        }
        if (!String(text || '').trim()) {
            Utils.showToast('No SVG character calibration was pasted.', 'warning');
            return;
        }

        let payload;
        try {
            payload = JSON.parse(text);
        } catch (err) {
            console.warn('SVG character calibration parse failed:', err);
            Utils.showToast('Calibration JSON could not be read.', 'error');
            return;
        }

        if (payload?.kind === 'svg-african-premium-adjustments') {
            const current = this._getSvgAfricanLiveAdjustmentState(armature.root);
            const next = { ...current, ...(payload.adjustments || {}) };
            const appliedShape = this._applySvgAfricanLiveAdjustments(next, { commit: true, snapshot: true, updateObjectList: true });
            const colors = this._normalizeSvgAfricanLiveColorMap(payload.colorOverrides || {});
            const appliedColors = Object.keys(colors).length
                ? this._applySvgAfricanLiveColors(colors, { commit: true, snapshot: false, updateObjectList: true })
                : false;
            if (appliedShape || appliedColors) {
                Utils.showToast('Applied SVG character shape state.', 'success');
            }
            return;
        }

        if (payload?.kind !== 'svg-african-premium-calibration') {
            Utils.showToast('Clipboard does not contain SVG African premium calibration.', 'warning');
            return;
        }

        const result = this._applySvgAfricanPremiumCalibrationPayload(armature, payload);
        if (!result) {
            Utils.showToast('SVG character calibration could not be applied.', 'error');
            return;
        }
        Utils.showToast(`Applied SVG character calibration (${result.appliedParts || 0} parts).`, 'success');
    },

    _getSvgAvatarPropertyCatalog(obj) {
        return obj?._svgAvatar?.presenterProperties || window.SvgAvatarCatalog?.presenterProperties || {};
    },

    _getSvgAvatarDefaultState(obj) {
        const catalog = this._getSvgAvatarPropertyCatalog(obj);
        return Object.fromEntries(Object.entries(catalog).map(([key, config]) => [
            key,
            Number.isFinite(Number(config?.defaultValue)) ? Number(config.defaultValue) : 0
        ]));
    },

    _getSvgAvatarState(obj) {
        if (!obj?._svgAvatar) return {};
        const defaults = this._getSvgAvatarDefaultState(obj);
        obj._svgAvatar.state = { ...defaults, ...(obj._svgAvatar.state || {}) };
        return obj._svgAvatar.state;
    },

    _clampSvgAvatarProperty(obj, prop, value) {
        const config = this._getSvgAvatarPropertyCatalog(obj)?.[prop] || {};
        const min = Number.isFinite(Number(config.min)) ? Number(config.min) : -Infinity;
        const max = Number.isFinite(Number(config.max)) ? Number(config.max) : Infinity;
        const parsed = Number(value);
        const fallback = Number.isFinite(Number(config.defaultValue)) ? Number(config.defaultValue) : 0;
        const numeric = Number.isFinite(parsed) ? parsed : fallback;
        return Math.max(min, Math.min(max, numeric));
    },

    _quantizeSvgAvatarRenderState(obj) {
        const state = this._getSvgAvatarState(obj);
        const stepFor = {
            blink: 0.1,
            mouthOpen: 0.08,
            smile: 0.08,
            handEmphasis: 0.08,
            listening: 0.1,
            gazeX: 0.25,
            gazeY: 0.25,
            browRaise: 0.25,
            headNod: 0.25,
            headTilt: 0.25,
            torsoSway: 0.25
        };
        return Object.fromEntries(Object.entries(state).map(([prop, value]) => {
            const numeric = Number(value);
            const step = stepFor[prop] || 0.1;
            return [
                prop,
                Number.isFinite(numeric) ? Math.round(numeric / step) * step : value
            ];
        }));
    },

    _decodeSvgAvatarDataUrl(src) {
        const text = String(src || '');
        const marker = 'data:image/svg+xml';
        if (!text.startsWith(marker)) return '';
        const comma = text.indexOf(',');
        if (comma < 0) return '';
        const payload = text.slice(comma + 1);
        try {
            return decodeURIComponent(payload);
        } catch (_) {
            try { return atob(payload); } catch (err) { return ''; }
        }
    },

    _encodeSvgAvatarDataUrl(svg) {
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg || '')}`;
    },

    _svgAvatarHasRole(obj, role) {
        const svg = obj?._svgAvatar?.baseSvg || this._decodeSvgAvatarDataUrl(obj?.imageSrc);
        return svg.includes(`data-avatar-role="${role}"`) ||
            svg.includes(`id="${role}"`) ||
            svg.includes(`-${role}"`);
    },

    _renderSvgAvatarStateToImage(obj) {
        if (!obj?._svgAvatar || !window.SvgAvatarCatalog?.applyPresenterState) return false;
        const sourceSvg = obj._svgAvatar.baseSvg || this._decodeSvgAvatarDataUrl(obj.imageSrc);
        if (!sourceSvg) return false;
        try {
            const doc = new DOMParser().parseFromString(sourceSvg, 'image/svg+xml');
            const root = doc.documentElement;
            if (!root || root.nodeName.toLowerCase() === 'parsererror') return false;
            const renderState = this._quantizeSvgAvatarRenderState(obj);
            const renderKey = JSON.stringify(renderState);
            if (obj._svgAvatar._lastRenderKey === renderKey) return true;
            obj._svgAvatar._lastRenderKey = renderKey;
            const applied = window.SvgAvatarCatalog.applyPresenterState(root, renderState);
            if (applied) obj._svgAvatar.state = { ...applied };
            const nextSvg = new XMLSerializer().serializeToString(root);
            const nextSrc = this._encodeSvgAvatarDataUrl(nextSvg);
            obj._svgAvatar.currentSvg = nextSvg;
            obj.imageSrc = nextSrc;
            obj.loadImage?.(nextSrc);
            return true;
        } catch (err) {
            console.warn('Presenter avatar render failed:', err);
            return false;
        }
    },

    _setSvgAvatarControlValue(prop, value) {
        const kebab = String(prop || '').replace(/[A-Z]/g, c => `-${c.toLowerCase()}`);
        const input = document.getElementById(`svg-avatar-${kebab}`);
        const output = document.getElementById(`svg-avatar-${kebab}-val`);
        const numeric = Number(value) || 0;
        if (input) input.value = String(numeric);
        if (output) {
            output.textContent = ['blink', 'mouthOpen', 'smile', 'handEmphasis', 'listening'].includes(prop)
                ? `${Math.round(numeric * 100)}%`
                : String(Math.round(numeric * 10) / 10);
        }
    },

    _syncSvgAvatarControls(seed) {
        const avatarObj = this._getSelectedSvgAvatarObject(seed);
        const africanHead = avatarObj ? null : this._getSelectedSvgAfricanPremiumHeadObject(seed);
        const obj = avatarObj || africanHead;
        const section = document.getElementById('svg-avatar-properties');
        if (!section) return;
        section.classList.toggle('hidden', !obj);
        const presetRow = document.getElementById('svg-african-live-face-preset-row');
        const presetSelect = document.getElementById('svg-african-live-face-preset');
        if (!obj) {
            if (presetRow) presetRow.classList.add('hidden');
            if (presetSelect) presetSelect.value = '';
            return;
        }

        const isAfricanFace = !!africanHead;
        const title = section.querySelector('h4');
        if (title) {
            title.innerHTML = isAfricanFace
                ? '<i class="fas fa-user-tie"></i> SVG African Face'
                : '<i class="fas fa-chalkboard-user"></i> Presenter Motion';
        }
        const state = isAfricanFace ? this._getSvgAfricanFaceState(obj) : this._getSvgAvatarState(obj);
        const catalog = isAfricanFace ? this._getSvgAfricanFacePropertyCatalog() : this._getSvgAvatarPropertyCatalog(obj);
        section.querySelectorAll('[data-svg-avatar-prop]').forEach(input => {
            const row = input.closest('label');
            const prop = input.dataset.svgAvatarProp;
            if (row) row.classList.toggle('hidden', !catalog[prop]);
        });
        Object.keys(catalog).forEach(prop => {
            this._setSvgAvatarControlValue(prop, state[prop]);
        });
        if (presetRow) presetRow.classList.toggle('hidden', !isAfricanFace);
        if (presetSelect) {
            if (isAfricanFace) {
                this._populateSvgAfricanFacePresetSelect(presetSelect);
                const presetId = obj._svgAfricanFacePreset || obj._svgCharacterConfig?._svgAfricanFacePreset || this._findSvgAfricanFacePresetForState(state);
                presetSelect.value = [...presetSelect.options].some(option => option.value === presetId) ? presetId : '';
            } else {
                presetSelect.value = '';
            }
        }

        const hasHands = !isAfricanFace && (this._svgAvatarHasRole(obj, 'avHandL') || this._svgAvatarHasRole(obj, 'avHandR'));
        const handRow = document.getElementById('svg-avatar-hand-emphasis-row');
        if (handRow) handRow.classList.toggle('hidden', !hasHands);
    },

    _applySvgAfricanLiveFacePreset(presetId, options = {}) {
        const africanHead = this._getSelectedSvgAfricanPremiumHeadObject();
        if (!africanHead) return;
        const normalizedId = String(presetId || '').trim();
        if (!normalizedId) {
            africanHead._svgAfricanFacePreset = '';
            if (africanHead._svgCharacterConfig && typeof africanHead._svgCharacterConfig === 'object') {
                africanHead._svgCharacterConfig._svgAfricanFacePreset = '';
                africanHead._svgCharacterConfig.facePreset = '';
            }
            this._syncSvgAfricanPremiumFaceStateToCharacter(africanHead);
            this._syncSvgAvatarControls(africanHead);
            if (options.commit) eventBus.emit('history:push');
            return;
        }
        const state = window.SvgAfricanPremiumAssets?.getFacePresetState?.(normalizedId);
        if (!state) return;
        if (this._isRecording && !this._contRec?.active && !this._svgAvatarRecordPending) {
            this._snapshotForRecording?.([africanHead]);
            this._svgAvatarRecordPending = true;
        }
        africanHead._svgAfricanFacePreset = normalizedId;
        africanHead._svgAfricanFaceState = { ...state };
        if (africanHead._svgCharacterConfig && typeof africanHead._svgCharacterConfig === 'object') {
            africanHead._svgCharacterConfig._svgAfricanFacePreset = normalizedId;
            africanHead._svgCharacterConfig.facePreset = normalizedId;
            africanHead._svgCharacterConfig._svgAfricanFaceState = { ...state };
        }
        this._renderSvgAfricanPremiumFaceStateToImage(africanHead);
        this._syncSvgAvatarControls(africanHead);
        this.stage?.requestRender?.();
        eventBus.emit('object:updated', africanHead);

        if (options.commit) {
            if (this._isRecording && this._svgAvatarRecordPending) {
                this._svgAvatarRecordPending = false;
                this._showRecordingConfirm?.();
            }
            if (this._propRecording) this._capturePropStep?.();
            eventBus.emit('history:push');
        }
    },

    _setSvgAvatarPresenterProperty(prop, rawValue, options = {}) {
        const obj = this._getSelectedSvgAvatarObject();
        const africanHead = obj ? null : this._getSelectedSvgAfricanPremiumHeadObject();
        if (africanHead) {
            if (!prop || !this._getSvgAfricanFacePropertyCatalog()?.[prop]) return;
            if (this._isRecording && !this._contRec?.active && !this._svgAvatarRecordPending) {
                this._snapshotForRecording?.([africanHead]);
                this._svgAvatarRecordPending = true;
            }
            const state = this._getSvgAfricanFaceState(africanHead);
            state[prop] = this._clampSvgAfricanFaceProperty(prop, rawValue);
            africanHead._svgAfricanFacePreset = '';
            if (africanHead._svgCharacterConfig && typeof africanHead._svgCharacterConfig === 'object') {
                africanHead._svgCharacterConfig._svgAfricanFacePreset = '';
                africanHead._svgCharacterConfig.facePreset = '';
            }
            this._setSvgAvatarControlValue(prop, state[prop]);
            this._renderSvgAfricanPremiumFaceStateToImage(africanHead);
            this.stage?.requestRender?.();
            eventBus.emit('object:updated', africanHead);

            if (options.commit) {
                if (this._isRecording && this._svgAvatarRecordPending) {
                    this._svgAvatarRecordPending = false;
                    this._showRecordingConfirm?.();
                }
                if (this._propRecording) this._capturePropStep?.();
                eventBus.emit('history:push');
            }
            return;
        }
        if (!obj || !prop) return;
        if (!this._getSvgAvatarPropertyCatalog(obj)?.[prop]) return;

        if (this._isRecording && !this._contRec?.active && !this._svgAvatarRecordPending) {
            this._snapshotForRecording?.([obj]);
            this._svgAvatarRecordPending = true;
        }

        const state = this._getSvgAvatarState(obj);
        state[prop] = this._clampSvgAvatarProperty(obj, prop, rawValue);
        this._setSvgAvatarControlValue(prop, state[prop]);
        this._renderSvgAvatarStateToImage(obj);
        this.stage?.requestRender?.();
        eventBus.emit('object:updated', obj);

        if (options.commit) {
            if (this._isRecording && this._svgAvatarRecordPending) {
                this._svgAvatarRecordPending = false;
                this._showRecordingConfirm?.();
            }
            if (this._propRecording) this._capturePropStep?.();
            eventBus.emit('history:push');
        }
    },

    _resetSvgAvatarPresenterState() {
        const obj = this._getSelectedSvgAvatarObject();
        const africanHead = obj ? null : this._getSelectedSvgAfricanPremiumHeadObject();
        if (africanHead) {
            if (this._isRecording && !this._contRec?.active) this._snapshotForRecording?.([africanHead]);
            africanHead._svgAfricanFacePreset = 'neutral';
            africanHead._svgAfricanFaceState = window.SvgAfricanPremiumAssets?.getFacePresetState?.('neutral') || this._getSvgAfricanFaceDefaultState();
            if (africanHead._svgCharacterConfig && typeof africanHead._svgCharacterConfig === 'object') {
                africanHead._svgCharacterConfig._svgAfricanFacePreset = 'neutral';
                africanHead._svgCharacterConfig.facePreset = 'neutral';
                africanHead._svgCharacterConfig._svgAfricanFaceState = { ...africanHead._svgAfricanFaceState };
            }
            this._renderSvgAfricanPremiumFaceStateToImage(africanHead);
            this._syncSvgAvatarControls(africanHead);
            this.stage?.requestRender?.();
            eventBus.emit('object:updated', africanHead);
            if (this._isRecording && !this._contRec?.active) this._showRecordingConfirm?.();
            if (this._propRecording) this._capturePropStep?.();
            eventBus.emit('history:push');
            return;
        }
        if (!obj) return;
        if (this._isRecording && !this._contRec?.active) this._snapshotForRecording?.([obj]);
        obj._svgAvatar.state = this._getSvgAvatarDefaultState(obj);
        this._renderSvgAvatarStateToImage(obj);
        this._syncSvgAvatarControls(obj);
        this.stage?.requestRender?.();
        eventBus.emit('object:updated', obj);
        if (this._isRecording && !this._contRec?.active) this._showRecordingConfirm?.();
        if (this._propRecording) this._capturePropStep?.();
        eventBus.emit('history:push');
    },

    _playSvgAvatarPresenterMotion(key) {
        const avatarObj = this._getSelectedSvgAvatarObject();
        const africanHead = avatarObj ? null : this._getSelectedSvgAfricanPremiumHeadObject();
        const obj = avatarObj || africanHead;
        const frames = africanHead
            ? window.SvgAfricanPremiumAssets?.faceAnimations?.[key]
            : (obj?._svgAvatar?.animations?.[key] || window.SvgAvatarCatalog?.animations?.[key]);
        if (!obj || !Array.isArray(frames) || frames.length === 0) return;

        if (this._svgAvatarPreviewRaf) cancelAnimationFrame(this._svgAvatarPreviewRaf);
        if (this._isRecording && !this._contRec?.active) this._snapshotForRecording?.([obj]);

        const startState = africanHead ? { ...this._getSvgAfricanFaceState(obj) } : { ...this._getSvgAvatarState(obj) };
        if (africanHead) {
            obj._svgAfricanFacePreset = '';
            if (obj._svgCharacterConfig && typeof obj._svgCharacterConfig === 'object') {
                obj._svgCharacterConfig._svgAfricanFacePreset = '';
                obj._svgCharacterConfig.facePreset = '';
            }
        }
        const sorted = [...frames].sort((a, b) => (Number(a.t) || 0) - (Number(b.t) || 0));
        const duration = key === 'blink' ? 260 : 1400;
        const startedAt = performance.now();
        const lerp = (a, b, t) => (Number(a) || 0) + ((Number(b) || 0) - (Number(a) || 0)) * t;
        const step = (now) => {
            const progress = Math.min(1, (now - startedAt) / duration);
            let prev = sorted[0];
            let next = sorted[sorted.length - 1];
            for (let i = 0; i < sorted.length - 1; i++) {
                if (progress >= sorted[i].t && progress <= sorted[i + 1].t) {
                    prev = sorted[i];
                    next = sorted[i + 1];
                    break;
                }
            }
            const span = Math.max(0.0001, (Number(next.t) || 1) - (Number(prev.t) || 0));
            const localT = Math.max(0, Math.min(1, (progress - (Number(prev.t) || 0)) / span));
            const state = { ...startState };
            const catalog = africanHead ? this._getSvgAfricanFacePropertyCatalog() : this._getSvgAvatarPropertyCatalog(obj);
            Object.keys(catalog).forEach(prop => {
                if (prev[prop] === undefined && next[prop] === undefined) return;
                const from = prev[prop] ?? startState[prop] ?? 0;
                const to = next[prop] ?? from;
                state[prop] = africanHead
                    ? this._clampSvgAfricanFaceProperty(prop, lerp(from, to, localT))
                    : this._clampSvgAvatarProperty(obj, prop, lerp(from, to, localT));
            });
            if (africanHead) {
                obj._svgAfricanFaceState = state;
                this._renderSvgAfricanPremiumFaceStateToImage(obj);
            } else {
                obj._svgAvatar.state = state;
                this._renderSvgAvatarStateToImage(obj);
            }
            this._syncSvgAvatarControls(obj);
            this.stage?.requestRender?.();
            if (progress < 1) {
                this._svgAvatarPreviewRaf = requestAnimationFrame(step);
            } else {
                this._svgAvatarPreviewRaf = null;
                if (this._isRecording && !this._contRec?.active) this._showRecordingConfirm?.();
                if (this._propRecording) this._capturePropStep?.();
                eventBus.emit('history:push');
            }
        };
        this._svgAvatarPreviewRaf = requestAnimationFrame(step);
    },

    async _copySvgAvatarPresenterState() {
        const obj = this._getSelectedSvgAvatarObject();
        const africanHead = obj ? null : this._getSelectedSvgAfricanPremiumHeadObject();
        if (africanHead) {
            const payload = {
                kind: 'svg-african-premium-face',
                assetId: africanHead._svgCharacterPremiumAssetId || africanHead._svgAfricanPremiumAssetId || 'ada-lecturer-front',
                preset: africanHead._svgAfricanFacePreset || africanHead._svgCharacterConfig?._svgAfricanFacePreset || '',
                state: this._getSvgAfricanFaceState(africanHead),
                adjustments: africanHead._svgAfricanAdjustments || africanHead._svgCharacterConfig?.premiumAdjustments || {}
            };
            await this._copyTextToClipboard(
                JSON.stringify(payload, null, 2),
                'Copied SVG African face state.',
                'SVG African face state copy failed:'
            );
            return;
        }
        if (!obj) return;
        const payload = {
            presetId: obj._svgAvatar?.presetId || 'unknown',
            state: this._getSvgAvatarState(obj),
            hasHands: this._svgAvatarHasRole(obj, 'avHandL') || this._svgAvatarHasRole(obj, 'avHandR')
        };
        await this._copyTextToClipboard(
            JSON.stringify(payload, null, 2),
            'Copied presenter avatar motion state.',
            'Presenter avatar state copy failed:'
        );
    },

    _normalizePictureFillRotation(value) {
        const numeric = Number(value) || 0;
        return ((numeric + 180) % 360 + 360) % 360 - 180;
    },

    _setSelectedPictureFillMode(mode) {
        if (!['stretch', 'fill', 'fit'].includes(mode)) return;
        const targets = this._getPictureFillTargets().filter(obj => obj.fillType === 'picture');
        if (!targets.length) {
            Utils.showToast('Select a shape with a picture fill first.', 'warning');
            return;
        }
        targets.forEach(obj => { obj.pictureFillMode = mode; });
        this._syncPictureFillControls();
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        eventBus.emit('history:push');
    },

    _setSelectedPictureFillRotation(value, commit = false) {
        const targets = this._getPictureFillTargets().filter(obj => obj.fillType === 'picture');
        if (!targets.length) return;
        const angle = this._normalizePictureFillRotation(value);
        targets.forEach(obj => { obj.pictureFillRotation = angle; });
        const slider = document.getElementById('prop-picture-fill-rotation');
        const label = document.getElementById('prop-picture-fill-rotation-val');
        if (slider) slider.value = angle;
        if (label) label.textContent = `${Math.round(angle)}\u00b0`;
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        if (commit) eventBus.emit('history:push');
    },

    _rotateSelectedPictureFills(delta) {
        const targets = this._getPictureFillTargets().filter(obj => obj.fillType === 'picture');
        if (!targets.length) {
            Utils.showToast('Select a shape with a picture fill first.', 'warning');
            return;
        }
        targets.forEach(obj => {
            obj.pictureFillRotation = this._normalizePictureFillRotation((obj.pictureFillRotation || 0) + delta);
        });
        this._syncPictureFillControls();
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        eventBus.emit('history:push');
    },

    _syncPictureFillControls() {
        const obj = this.getSelectedObjects()[0];
        const fillType = obj?.fillType || 'solid';
        const picture = fillType === 'picture';
        document.getElementById('picture-fill-controls')?.classList.toggle('hidden', !picture);
        document.getElementById('fill-color-field')?.classList.toggle('hidden', fillType === 'none' || picture);
        if (picture) {
            this._refreshPictureFillSources();
            const mode = ['stretch', 'fill', 'fit'].includes(obj.pictureFillMode)
                ? obj.pictureFillMode
                : 'stretch';
            [
                ['btn-picture-fill-stretch', 'stretch'],
                ['btn-picture-fill-fill', 'fill'],
                ['btn-picture-fill-fit', 'fit']
            ].forEach(([id, value]) => {
                const button = document.getElementById(id);
                button?.classList.toggle('active', mode === value);
                button?.setAttribute('aria-pressed', mode === value ? 'true' : 'false');
            });
            const angle = this._normalizePictureFillRotation(obj.pictureFillRotation || 0);
            const slider = document.getElementById('prop-picture-fill-rotation');
            const label = document.getElementById('prop-picture-fill-rotation-val');
            if (slider) slider.value = angle;
            if (label) label.textContent = `${Math.round(angle)}\u00b0`;
        }
    },

    applyPropertyChange(prop, value) {
        // Animatable properties that can be recorded
        const animatable = ['x', 'y', 'width', 'height', 'rotation', 'depth', 'depthSideColor', 'depthSideMode', 'depthLighting', 'depthPerspective',
            'tiltX', 'tiltY', 'scaleX', 'scaleY', 'opacity', 'jointBaseAngle', 'fill', 'stroke', 'strokeWidth', 'borderRadius', 'visible', 'flipH', 'flipV'];

        // Snapshot before applying if recording and property is animatable
        if (this._isRecording && animatable.includes(prop)) {
            this._snapshotForRecording(true);
        }

        this.getSelectedObjects().forEach(obj => {
            if (prop === 'stroke' && (obj.stroke === 'transparent' || obj.strokeWidth === 0)) {
                obj._savedStroke = value;
                return;
            }

            // Translate pathPoints when x or y changes (absolute-coord shapes)
            if ((prop === 'x' || prop === 'y') && obj.pathPoints && obj.pathPoints.length > 0) {
                const delta = value - obj[prop];
                if (delta !== 0) {
                    obj.pathPoints.forEach(p => { p[prop] += delta; });
                }
            }
            if (prop === 'width' || prop === 'height') {
                const currentWidth = Math.max(1, obj.width || 1);
                const currentHeight = Math.max(1, obj.height || 1);
                let nextWidth = prop === 'width' ? Math.max(1, value) : currentWidth;
                let nextHeight = prop === 'height' ? Math.max(1, value) : currentHeight;

                if (StageObject.supportsAspectLockType(obj.type) && obj.lockAspectRatio) {
                    if (prop === 'width') {
                        const ratio = nextWidth / currentWidth;
                        nextHeight = Math.max(1, Math.round(currentHeight * ratio));
                    } else {
                        const ratio = nextHeight / currentHeight;
                        nextWidth = Math.max(1, Math.round(currentWidth * ratio));
                    }
                }
                this._applyObjectSize(obj, nextWidth, nextHeight);
                return;
            }
            if ((prop === 'tiltX' || prop === 'tiltY') && StageObject.supportsTiltType(obj.type)) {
                this._setObjectTiltDriverValue(obj, prop, value);
                return;
            }
            obj[prop] = value;
        });
        this.stage.requestRender();
        eventBus.emit('object:updated', this.getSelectedObjects()[0]);
        if (prop === 'width' || prop === 'height') this.updateProperties();

        // Show recording confirm if we were recording an animatable change
        if (this._isRecording && animatable.includes(prop)) {
            this._showRecordingConfirm();
        }

        // Property change recording (captures all property changes, not just animatable)
        if (this._propRecording) {
            this._capturePropStep();
        }

        eventBus.emit('history:push');
    },

    _setCompressionStatus(message) {
        const status = document.getElementById('compress-status');
        if (status) status.textContent = message || '';
    },

    _ensureCompressionRigBase(obj) {
        if (!obj) return;
        if (!obj._compressionRigBase) {
            obj._compressionRigBase = {
                x: obj.x,
                y: obj.y,
                width: Math.max(1, obj.width || 1),
                height: Math.max(1, obj.height || 1)
            };
        }
    },

    _resetCompressionRigBase(obj) {
        if (!obj || !obj._compressionRigBase) return;
        const base = obj._compressionRigBase;
        this._applyObjectSize(obj, Math.max(1, base.width || 1), Math.max(1, base.height || 1));
        obj.x = base.x;
        obj.y = base.y;
        delete obj._compressionRig;
        delete obj._compressionRigBase;
    },

    _recordCompressionAction(targets) {
        const list = (targets || []).filter(Boolean);
        if (!list.length) return;
        if (!this._propRecording) return;
        this._capturePropStep();
    },

    _setCompressionControls(values = {}) {
        const axisEl = document.getElementById('compress-axis');
        if (axisEl && values.axis) axisEl.value = values.axis;
        const anchorEl = document.getElementById('compress-anchor');
        if (anchorEl && values.anchor) anchorEl.value = values.anchor;
        const amountEl = document.getElementById('compress-amount');
        if (amountEl && Number.isFinite(values.amountPct)) amountEl.value = String(Utils.clamp(values.amountPct, 0, 100));
        const amountValEl = document.getElementById('compress-amount-val');
        if (amountValEl && amountEl) amountValEl.textContent = `${parseInt(amountEl.value, 10) || 0}%`;

        const setMargin = (id, val) => {
            const el = document.getElementById(id);
            if (el && Number.isFinite(val)) el.value = String(Utils.clamp(val, 0, 45));
        };
        setMargin('compress-margin-top', values.top);
        setMargin('compress-margin-bottom', values.bottom);
        setMargin('compress-margin-left', values.left);
        setMargin('compress-margin-right', values.right);

        const fullCloseEl = document.getElementById('compress-full-close');
        if (fullCloseEl && typeof values.fullClose === 'boolean') fullCloseEl.checked = values.fullClose;
    },

    _setCompressionPairControls(values = {}) {
        const pairAmount = document.getElementById('compress-pair-amount');
        if (pairAmount && Number.isFinite(values.amountPct)) pairAmount.value = String(Utils.clamp(values.amountPct, 0, 100));
        const pairAmountLabel = document.getElementById('compress-pair-amount-val');
        if (pairAmountLabel && pairAmount) pairAmountLabel.textContent = `${parseInt(pairAmount.value, 10) || 0}%`;
        const pairScale = document.getElementById('compress-pair-scale');
        if (pairScale && typeof values.scaleTowardSeam === 'boolean') pairScale.checked = values.scaleTowardSeam;
    },

    applyCompressionPreset(preset = 'mouth') {
        const key = String(preset || '').toLowerCase();
        if (key === 'blink') {
            this._setCompressionControls({
                axis: 'vertical',
                anchor: 'center',
                amountPct: 100,
                top: 4,
                bottom: 4,
                left: 8,
                right: 8,
                fullClose: true
            });
            this._setCompressionPairControls({ amountPct: 100, scaleTowardSeam: true });
            this._setCompressionStatus('Blink preset loaded. Create Pair Rig for eyelids, then adjust Pair Close Amount.');
            return true;
        }

        this._setCompressionControls({
            axis: 'vertical',
            anchor: 'center',
            amountPct: 60,
            top: 6,
            bottom: 6,
            left: 10,
            right: 10,
            fullClose: true
        });
        this._setCompressionPairControls({ amountPct: 60, scaleTowardSeam: true });
        this._setCompressionStatus('Mouth preset loaded. Use Pair Rig for lips or apply single-object compression.');
        return true;
    },

    setupCompressionPairRigFromObjects(upperObj, lowerObj, options = {}) {
        if (!upperObj || !lowerObj || upperObj.id === lowerObj.id) return false;
        const ordered = [upperObj, lowerObj].sort((a, b) => ((a.y + a.height * 0.5) - (b.y + b.height * 0.5)));
        const upper = ordered[0];
        const lower = ordered[1];

        this._ensureCompressionPairBase(upper);
        this._ensureCompressionPairBase(lower);
        const upperBottom = upper._compressionPairBase.y + upper._compressionPairBase.height;
        const lowerTop = lower._compressionPairBase.y;
        const seamY = (upperBottom + lowerTop) * 0.5;

        this._compressionPairRig = {
            upperId: upper.id,
            lowerId: lower.id,
            seamY
        };

        const amountPct = Number.isFinite(options.amountPct) ? options.amountPct : 0;
        const scaleTowardSeam = (typeof options.scaleTowardSeam === 'boolean') ? options.scaleTowardSeam : true;
        this._setCompressionPairControls({ amountPct, scaleTowardSeam });

        if (options.selectPair !== false) {
            this.select?.([upper.id, lower.id]);
        }
        this.updateProperties();
        if (options.applyNow) {
            this.applyCompressionPairRigFromControls({ pushHistory: !!options.pushHistory, silent: !!options.silent });
        } else if (!options.silent) {
            this._setCompressionStatus('Pair Rig created from selected parts.');
        }
        return true;
    },

    _applyCompressionRigToObject(obj, amount, axis, anchor, edges = {}) {
        if (!obj || !obj._compressionRigBase) return false;
        const base = obj._compressionRigBase;
        const t = Utils.clamp(Number(amount) || 0, 0, 1);
        const fullClose = edges.fullClose !== false;
        const minScale = fullClose ? 0 : 0.03;
        const scale = (1 - t) + (minScale * t);
        const baseW = Math.max(1, base.width || 1);
        const baseH = Math.max(1, base.height || 1);
        const marginTop = Utils.clamp((Number(edges.top) || 0) / 100, 0, 0.45);
        const marginBottom = Utils.clamp((Number(edges.bottom) || 0) / 100, 0, 0.45);
        const marginLeft = Utils.clamp((Number(edges.left) || 0) / 100, 0, 0.45);
        const marginRight = Utils.clamp((Number(edges.right) || 0) / 100, 0, 0.45);

        let targetW = baseW;
        let targetH = baseH;
        let nextX = base.x;
        let nextY = base.y;

        if (axis === 'horizontal') {
            const protectedLeft = baseW * marginLeft;
            const protectedRight = baseW * marginRight;
            const compressible = Math.max(1, baseW - protectedLeft - protectedRight);
            const targetCompressible = Math.max(fullClose && t >= 0.999 ? 0 : 1, compressible * scale);
            targetW = Math.max(1, protectedLeft + protectedRight + targetCompressible);
            if (anchor === 'center') {
                nextX = base.x + ((baseW - targetW) * 0.5);
            } else if (anchor === 'start') {
                nextX = base.x;
            } else {
                nextX = base.x + (baseW - targetW);
            }
        } else {
            const protectedTop = baseH * marginTop;
            const protectedBottom = baseH * marginBottom;
            const compressible = Math.max(1, baseH - protectedTop - protectedBottom);
            const targetCompressible = Math.max(fullClose && t >= 0.999 ? 0 : 1, compressible * scale);
            targetH = Math.max(1, protectedTop + protectedBottom + targetCompressible);
            if (anchor === 'center') {
                nextY = base.y + ((baseH - targetH) * 0.5);
            } else if (anchor === 'start') {
                nextY = base.y;
            } else {
                nextY = base.y + (baseH - targetH);
            }
        }

        this._applyObjectSize(obj, targetW, targetH);
        obj.x = nextX;
        obj.y = nextY;
        obj._compressionRig = {
            axis,
            anchor,
            amount: t,
            edges: {
                top: marginTop,
                bottom: marginBottom,
                left: marginLeft,
                right: marginRight,
                fullClose
            }
        };
        return true;
    },

    applyCompressionRigFromControls(options = {}) {
        const { pushHistory = true, silent = false } = options;
        const axis = (document.getElementById('compress-axis')?.value || 'vertical');
        const anchor = (document.getElementById('compress-anchor')?.value || 'center');
        const amountPct = parseInt(document.getElementById('compress-amount')?.value || '0', 10);
        const amount = Utils.clamp((amountPct || 0) / 100, 0, 1);
        const edges = {
            top: parseFloat(document.getElementById('compress-margin-top')?.value || '0'),
            bottom: parseFloat(document.getElementById('compress-margin-bottom')?.value || '0'),
            left: parseFloat(document.getElementById('compress-margin-left')?.value || '0'),
            right: parseFloat(document.getElementById('compress-margin-right')?.value || '0'),
            fullClose: !!document.getElementById('compress-full-close')?.checked
        };
        const targets = this.getSelectedObjects().filter(Boolean);
        if (!targets.length) {
            if (!silent) this._setCompressionStatus('Select at least one object to compress.');
            return false;
        }

        let updated = 0;
        targets.forEach(obj => {
            this._ensureCompressionRigBase(obj);
            if (this._applyCompressionRigToObject(obj, amount, axis, anchor, edges)) updated += 1;
        });
        if (!updated) {
            if (!silent) this._setCompressionStatus('No eligible objects were updated.');
            return false;
        }

        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        this._recordCompressionAction(targets);
        if (pushHistory) eventBus.emit('history:push');
        if (!silent) {
            this._setCompressionStatus(`Applied ${axis} compression (${amountPct}%) to ${updated} object${updated === 1 ? '' : 's'} with edge controls.`);
        }
        return true;
    },

    resetCompressionRigSelection() {
        const targets = this.getSelectedObjects().filter(Boolean);
        if (!targets.length) {
            this._setCompressionStatus('Select object(s) first.');
            return;
        }
        let resetCount = 0;
        targets.forEach(obj => {
            if (!obj?._compressionRigBase) return;
            this._resetCompressionRigBase(obj);
            resetCount += 1;
        });
        if (!resetCount) {
            this._setCompressionStatus('No compression baseline found on selected objects.');
            return;
        }
        const amount = document.getElementById('compress-amount');
        const amountLabel = document.getElementById('compress-amount-val');
        if (amount) amount.value = '0';
        if (amountLabel) amountLabel.textContent = '0%';

        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('object:updated', targets[0]);
        this._recordCompressionAction(targets);
        eventBus.emit('history:push');
        this._setCompressionStatus(`Reset compression on ${resetCount} object${resetCount === 1 ? '' : 's'}.`);
    },

    _ensureCompressionPairBase(obj) {
        if (!obj) return;
        if (!obj._compressionPairBase) {
            obj._compressionPairBase = {
                x: obj.x,
                y: obj.y,
                width: Math.max(1, obj.width || 1),
                height: Math.max(1, obj.height || 1)
            };
        }
    },

    createCompressionPairRigFromSelection() {
        const selected = this.getSelectedObjects().filter(Boolean);
        if (selected.length !== 2) {
            this._setCompressionStatus('Select exactly two objects (upper + lower) to create a Pair Rig.');
            return false;
        }
        const ordered = [...selected].sort((a, b) => ((a.y + a.height * 0.5) - (b.y + b.height * 0.5)));
        const upper = ordered[0];
        const lower = ordered[1];

        this._ensureCompressionPairBase(upper);
        this._ensureCompressionPairBase(lower);
        const upperBottom = upper._compressionPairBase.y + upper._compressionPairBase.height;
        const lowerTop = lower._compressionPairBase.y;
        const seamY = (upperBottom + lowerTop) * 0.5;

        this._compressionPairRig = {
            upperId: upper.id,
            lowerId: lower.id,
            seamY
        };

        const pairAmount = document.getElementById('compress-pair-amount');
        const pairAmountLabel = document.getElementById('compress-pair-amount-val');
        if (pairAmount) pairAmount.value = '0';
        if (pairAmountLabel) pairAmountLabel.textContent = '0%';

        this._setCompressionStatus('Pair Rig created. Use Pair Close Amount to close both parts uniformly.');
        return true;
    },

    applyCompressionPairRigFromControls(options = {}) {
        const { pushHistory = true, silent = false } = options;
        const rig = this._compressionPairRig;
        if (!rig) {
            if (!silent) this._setCompressionStatus('Create a Pair Rig first.');
            return false;
        }
        const upper = this.getObjectById?.(rig.upperId);
        const lower = this.getObjectById?.(rig.lowerId);
        if (!upper || !lower) {
            if (!silent) this._setCompressionStatus('Pair Rig objects are missing. Recreate the Pair Rig.');
            return false;
        }

        this._ensureCompressionPairBase(upper);
        this._ensureCompressionPairBase(lower);
        const t = Utils.clamp((parseInt(document.getElementById('compress-pair-amount')?.value || '0', 10) || 0) / 100, 0, 1);
        const scaleTowardSeam = !!document.getElementById('compress-pair-scale')?.checked;

        const upperBase = upper._compressionPairBase;
        const lowerBase = lower._compressionPairBase;
        const seamY = Number.isFinite(rig.seamY) ? rig.seamY : ((upperBase.y + upperBase.height + lowerBase.y) * 0.5);
        const upperBottomBase = upperBase.y + upperBase.height;
        const lowerTopBase = lowerBase.y;

        const upperBottom = upperBottomBase + ((seamY - upperBottomBase) * t);
        const lowerTop = lowerTopBase + ((seamY - lowerTopBase) * t);

        const upperScale = scaleTowardSeam ? (1 - (0.45 * t)) : 1;
        const lowerScale = scaleTowardSeam ? (1 - (0.45 * t)) : 1;
        const upperHeight = Math.max(1, upperBase.height * upperScale);
        const lowerHeight = Math.max(1, lowerBase.height * lowerScale);

        this._applyObjectSize(upper, upperBase.width, upperHeight);
        upper.x = upperBase.x;
        upper.y = upperBottom - upperHeight;
        upper._compressionPair = { amount: t, scaleTowardSeam, role: 'upper' };

        this._applyObjectSize(lower, lowerBase.width, lowerHeight);
        lower.x = lowerBase.x;
        lower.y = lowerTop;
        lower._compressionPair = { amount: t, scaleTowardSeam, role: 'lower' };

        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('object:updated', upper);
        this._recordCompressionAction([upper, lower]);
        if (pushHistory) eventBus.emit('history:push');
        if (!silent) {
            const amountPct = Math.round(t * 100);
            this._setCompressionStatus(`Pair closure applied (${amountPct}%). Upper and lower edges converge to a shared seam.`);
        }
        return true;
    },

    clearCompressionPairRig() {
        const rig = this._compressionPairRig;
        if (rig) {
            [rig.upperId, rig.lowerId].forEach((id) => {
                const obj = this.getObjectById?.(id);
                if (!obj?._compressionPairBase) return;
                const base = obj._compressionPairBase;
                this._applyObjectSize(obj, Math.max(1, base.width || 1), Math.max(1, base.height || 1));
                obj.x = base.x;
                obj.y = base.y;
                delete obj._compressionPairBase;
                delete obj._compressionPair;
            });
        }
        this._compressionPairRig = null;

        const pairAmount = document.getElementById('compress-pair-amount');
        const pairAmountLabel = document.getElementById('compress-pair-amount-val');
        if (pairAmount) pairAmount.value = '0';
        if (pairAmountLabel) pairAmountLabel.textContent = '0%';

        this.updateProperties();
        this.stage.requestRender();
        this._recordCompressionAction(rig ? [this.getObjectById?.(rig.upperId), this.getObjectById?.(rig.lowerId)] : []);
        eventBus.emit('history:push');
        this._setCompressionStatus('Pair Rig cleared and pair objects restored.');
    },

    captureCompressionKeyframeFromControls() {
        const ok = this.applyCompressionRigFromControls({ pushHistory: true, silent: true });
        if (!ok) {
            this._setCompressionStatus('Compression keyframe not captured. Select object(s) first.');
            return false;
        }
        this._setCompressionStatus('Compression keyframe captured from current controls.');
        return true;
    },

    captureCompressionPairKeyframeFromControls() {
        const ok = this.applyCompressionPairRigFromControls({ pushHistory: true, silent: true });
        if (!ok) {
            this._setCompressionStatus('Pair keyframe not captured. Create Pair Rig first.');
            return false;
        }
        this._setCompressionStatus('Pair compression keyframe captured.');
        return true;
    },

    resetSelectedShapeControls() {
        const selected = this.getSelectedObjects();
        if (!selected.length) return;

        let changed = false;
        selected.forEach(obj => {
            const defaults = StageObject.getShapeControlDefaults(obj.type);
            if (!defaults) return;
            Object.entries(defaults).forEach(([prop, value]) => {
                if (value === null || value === undefined) return;
                obj[prop] = value;
                changed = true;
            });
        });

        if (!changed) return;
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('object:updated', selected[0]);
        if (this._propRecording) this._capturePropStep();
        eventBus.emit('history:push');
    },

    /**
     * Render a flex-bent shape to a high-res offscreen canvas (with overflow padding),
     * crop to the actual non-transparent pixel bounds, and return a PNG data URL plus
     * the matching stage-space bounding box. The result can be used to create a new
     * image StageObject at the correct visual position.
     */
    _bakeFlexShape(obj) {
        const srcW = Math.abs(obj.width);
        const srcH = Math.abs(obj.height);
        // Pad by 2× the longer dimension on ALL sides so that bends in the
        // perpendicular direction (which can travel up to full-length of the
        // shape) are always captured regardless of aspect ratio or bend angle.
        const pad = Math.round(Math.max(srcW, srcH) * 2.0);
        const padX = pad;
        const padY = pad;
        const totalW = srcW + 2 * padX;
        const totalH = srcH + 2 * padY;
        const scale = Math.min(4, 2400 / Math.max(totalW, totalH, 1));
        const w = Math.max(1, Math.round(totalW * scale));
        const h = Math.max(1, Math.round(totalH * scale));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const originX = obj.x - padX;
        const originY = obj.y - padY;
        ctx.setTransform(scale, 0, 0, scale, -originX * scale, -originY * scale);
        obj.render(ctx);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        const data = ctx.getImageData(0, 0, w, h).data;
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
                if (data[(y * w + x) * 4 + 3] > 8) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX < 0) return null;
        const cw = maxX - minX + 1;
        const ch = maxY - minY + 1;
        const cropped = document.createElement('canvas');
        cropped.width = cw;
        cropped.height = ch;
        cropped.getContext('2d').drawImage(canvas, minX, minY, cw, ch, 0, 0, cw, ch);
        return {
            dataURL: cropped.toDataURL('image/png'),
            x: originX + minX / scale,
            y: originY + minY / scale,
            width: cw / scale,
            height: ch / scale,
        };
    },

});
