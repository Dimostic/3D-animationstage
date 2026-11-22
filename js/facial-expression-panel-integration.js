/* ============================================
   Facial Expression Panel UI Integration
   Helper module for building unified picker panels
   in UC and Face Set systems
   ============================================ */

(function () {
    const PanelIntegration = {
        // Build UC expression panel section with picker UI
        buildUCExpressionPanel(options = {}) {
            const {
                headObj = null,
                armature = null,
                onExpressionSelect = () => {},
                showParity = true
            } = options;

            if (!window.FacialExpressionSpecs) {
                console.warn('FacialExpressionSpecs not loaded');
                return null;
            }

            const specs = window.FacialExpressionSpecs;
            const container = document.createElement('div');
            container.className = 'uc-expression-panel-unified';
            container.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

            // Title
            const title = document.createElement('h4');
            title.textContent = 'Facial Expression';
            title.style.cssText = 'margin: 0; font-size: 12px; color: #e6e6f0; font-weight: 600;';
            container.appendChild(title);

            // Picker UI
            const currentExpr = headObj?._facialExpression || 'neutral';
            const pickerUI = specs.buildExpressionPickerUI({
                selectedKey: currentExpr,
                mode: 'uc',
                onSelect: (key) => {
                    if (armature?.rig?.applyFacialExpression && headObj) {
                        armature.rig.applyFacialExpression(headObj, key);
                    }
                    onExpressionSelect(key);
                }
            });

            container.appendChild(pickerUI.container);

            // Parity info (optional)
            if (showParity && headObj) {
                const parityDiv = document.createElement('div');
                parityDiv.className = 'uc-expression-parity-badge';
                parityDiv.style.cssText = 'font-size: 10px; color: #7dd3fc; padding: 4px; background: #0f0f1a; border-radius: 3px; border-left: 2px solid #7dd3fc;';
                
                const spec = specs.getUCExpressionSpec(currentExpr);
                parityDiv.innerHTML = `
                    <div><strong>Features:</strong></div>
                    <div>Eye: ${spec.eye || 'neutral'} | Mouth: ${spec.mouth || 'neutral'} | Brow: ${spec.brow || 'neutral'}</div>
                `;
                container.appendChild(parityDiv);

                // Update parity on change
                pickerUI.selectElement.addEventListener('change', (evt) => {
                    const newSpec = specs.getUCExpressionSpec(evt.target.value);
                    parityDiv.innerHTML = `
                        <div><strong>Features:</strong></div>
                        <div>Eye: ${newSpec.eye || 'neutral'} | Mouth: ${newSpec.mouth || 'neutral'} | Brow: ${newSpec.brow || 'neutral'}</div>
                    `;
                });
            }

            return { container, pickerUI, element: container };
        },

        // Build Face Set motion panel section with picker UI
        buildFaceSetMotionPanel(options = {}) {
            const {
                faceRig = null,
                onMotionSelect = () => {},
                showParity = true
            } = options;

            if (!window.FacialExpressionSpecs) {
                console.warn('FacialExpressionSpecs not loaded');
                return null;
            }

            const specs = window.FacialExpressionSpecs;
            const container = document.createElement('div');
            container.className = 'face-set-motion-panel-unified';
            container.style.cssText = 'display: flex; flex-direction: column; gap: 8px;';

            // Title
            const title = document.createElement('h4');
            title.textContent = 'Facial Motion';
            title.style.cssText = 'margin: 0; font-size: 12px; color: #e6e6f0; font-weight: 600;';
            container.appendChild(title);

            // Picker UI
            const pickerUI = specs.createExpressionPicker({
                mode: 'face-set',
                selectedKey: 'neutral',
                onSelect: (key) => {
                    if (faceRig?.applyFaceMotion) {
                        faceRig.applyFaceMotion(key);
                    }
                    onMotionSelect(key);
                },
                showParity: showParity
            });

            container.appendChild(pickerUI.container);

            // Motion catalog info (optional)
            if (showParity) {
                const catalogDiv = document.createElement('div');
                catalogDiv.className = 'face-set-motion-catalog-info';
                catalogDiv.style.cssText = 'font-size: 9px; color: #8a8aa8; padding: 4px; background: #0f0f1a; border-radius: 3px;';
                
                const catalog = specs.getFaceSetMotionCatalog();
                catalogDiv.textContent = `${catalog.length} motions available`;
                container.appendChild(catalogDiv);
            }

            return { container, pickerUI, element: container };
        },

        // Create standalone parity validator widget
        createParityValidator(options = {}) {
            const {
                containerElement = null,
                autoValidate = true
            } = options;

            if (!window.FacialExpressionSpecs) {
                console.warn('FacialExpressionSpecs not loaded');
                return null;
            }

            const specs = window.FacialExpressionSpecs;
            const container = containerElement || document.createElement('div');
            container.className = 'facial-expression-parity-validator';
            container.style.cssText = 'padding: 8px; border: 1px solid #2a2a42; border-radius: 6px; background: #0f0f1a;';

            // Build validation table
            const validate = () => {
                const issues = [];
                const catalog = specs.getFaceSetMotionCatalog();

                catalog.forEach(motion => {
                    const parity = specs.validateExpressionParity(
                        motion.canonicalExpression,
                        motion.key
                    );
                    if (!parity.valid) {
                        issues.push({
                            motion: motion.key,
                            problem: parity.reason
                        });
                    }
                });

                container.innerHTML = '';
                const header = document.createElement('div');
                header.style.cssText = 'font-weight: 600; margin-bottom: 6px; color: #e6e6f0;';
                header.textContent = `Parity Check: ${catalog.length - issues.length}/${catalog.length} valid`;
                container.appendChild(header);

                if (issues.length === 0) {
                    const ok = document.createElement('div');
                    ok.style.cssText = 'color: #7dd3fc; font-size: 11px;';
                    ok.textContent = '✓ All motions have valid canonical expressions';
                    container.appendChild(ok);
                } else {
                    issues.forEach(issue => {
                        const row = document.createElement('div');
                        row.style.cssText = 'color: #ff6b6b; font-size: 10px; margin-bottom: 3px;';
                        row.textContent = `✗ ${issue.motion}: ${issue.problem}`;
                        container.appendChild(row);
                    });
                }

                return { total: catalog.length, valid: catalog.length - issues.length, issues };
            };

            if (autoValidate) {
                setTimeout(() => validate(), 100);
            }

            return {
                container,
                validate,
                getStatus: () => ({
                    results: validate()
                })
            };
        },

        // Inject parity info into existing panel element
        injectParityBadge(panelElement, motionKey) {
            if (!window.FacialExpressionSpecs || !panelElement) {
                return null;
            }

            const specs = window.FacialExpressionSpecs;
            const parity = specs.getParityInfo(motionKey);

            const badge = document.createElement('span');
            badge.className = 'facial-expression-parity-badge-inline';
            badge.style.cssText = 'display: inline-block; font-size: 9px; color: #7dd3fc; margin-left: 4px; padding: 2px 4px; background: #1a2a3a; border-radius: 3px; border-left: 2px solid #7dd3fc;';

            if (parity.valid) {
                badge.textContent = `→ ${parity.canonical}`;
                badge.title = `Mouth: ${parity.mouth}, Eye: ${parity.eye}`;
            } else {
                badge.textContent = '⚠';
                badge.title = parity.reason;
                badge.style.cssText = badge.style.cssText.replace('#7dd3fc', '#ff6b6b').replace('7dd3fc', 'ff6b6b');
            }

            return badge;
        }
    };

    window.FacialExpressionPanelIntegration = window.FacialExpressionPanelIntegration || PanelIntegration;
})();
