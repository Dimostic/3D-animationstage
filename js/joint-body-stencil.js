/**
 * Joint System — Body Stencil overlay cutting
 * (split from joint-system.js for maintainability)
 */

Object.assign(JointSystem.prototype, {

    _closeActiveCuttingWorkflows() {
        this._clearCuttingCompletionHandler();
        const workflows = [
            { panelId: 'body-stencil-panel', objectKey: '_bsObj', exit: '_exitBodyStencil' },
            { panelId: 'smart-cut-panel', objectKey: '_smartCutObj', exit: '_exitSmartCut' },
            { panelId: 'body-slicer-panel', objectKey: '_bslObj', exit: '_exitBodySlicer' }
        ];
        this.objects?.cancelGuidedJointPlacement?.();
        workflows.forEach(({ panelId, objectKey, exit }) => {
            const panel = document.getElementById(panelId);
            if ((panel || this[objectKey]) && typeof this[exit] === 'function') this[exit]();
            panel?.remove();
        });
    },

    _clearCuttingCompletionHandler() {
        if (!this._cuttingDoneKeyHandler) return;
        document.removeEventListener('keydown', this._cuttingDoneKeyHandler);
        this._cuttingDoneKeyHandler = null;
    },

    _setCuttingCompletionHandler(panel) {
        this._clearCuttingCompletionHandler();
        const handler = event => {
            if (!panel?.isConnected) {
                this._clearCuttingCompletionHandler();
                return;
            }
            if (event.key !== 'Escape') return;
            event.preventDefault();
            this._clearCuttingCompletionHandler();
            panel.remove();
        };
        this._cuttingDoneKeyHandler = handler;
        document.addEventListener('keydown', handler);
        return handler;
    },

    _rollbackCutArtifacts(...groups) {
        const artifacts = new Set();
        groups.forEach(group => {
            if (Array.isArray(group)) group.forEach(item => item && artifacts.add(item));
            else if (group && typeof group === 'object') Object.values(group).forEach(item => item && artifacts.add(item));
        });
        artifacts.forEach(obj => {
            if (typeof this.objects?.removeObject === 'function') {
                this.objects.removeObject(obj.id);
                return;
            }
            const list = this.objects?.objects;
            const index = Array.isArray(list) ? list.indexOf(obj) : -1;
            if (index >= 0) list.splice(index, 1);
        });
        this.objects?.updateObjectList?.();
        this.stage?.requestRender?.();
        return artifacts.size;
    },

    _escapeCutReviewText(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    _buildCutReview(createdParts = {}, preset = null, options = {}) {
        const entries = Object.entries(createdParts || {}).filter(([, obj]) => !!obj);
        const expectedParts = Array.isArray(preset?.parts) ? preset.parts : [];
        const expectedKeys = expectedParts.map(part => part.partKey).filter(Boolean);
        const optionalKeys = new Set(options.optionalKeys || []);
        const createdKeys = new Set(entries.map(([key]) => key));
        const duplicateLabels = [];
        const labelCounts = {};
        (options.regions || []).forEach(region => {
            const label = region?.label;
            if (!label) return;
            labelCounts[label] = (labelCounts[label] || 0) + 1;
        });
        Object.entries(labelCounts).forEach(([label, count]) => {
            if (count > 1) duplicateLabels.push(label);
        });

        const sourceArea = Math.max(1, Number(options.sourceObj?.width || 0) * Number(options.sourceObj?.height || 0));
        const tinyParts = [];
        const items = entries.map(([key, obj]) => {
            const partDef = expectedParts.find(part => part.partKey === key);
            const w = Number(obj.width || 0);
            const h = Number(obj.height || 0);
            const area = Math.max(0, w * h);
            const pixelArea = (() => {
                const canvas = obj._tempTrimmedCanvas || obj._smartCutCoverOriginalCanvas;
                return canvas?.width && canvas?.height ? canvas.width * canvas.height : area;
            })();
            const tiny = w < 4 || h < 4 || area / sourceArea < 0.0007 || pixelArea < 36;
            if (tiny) tinyParts.push(key);
            return {
                key,
                name: partDef?.name || obj.name || key,
                w,
                h,
                area,
                tiny
            };
        });

        const missing = expectedKeys.filter(key => !createdKeys.has(key) && !optionalKeys.has(key));
        const missingNames = missing.map(key => {
            const partDef = expectedParts.find(part => part.partKey === key);
            return partDef?.name || key;
        });
        const warnings = [];
        if (missing.length) warnings.push(`${missing.length} expected part${missing.length === 1 ? '' : 's'} missing`);
        if (tinyParts.length) warnings.push(`${tinyParts.length} very small cut${tinyParts.length === 1 ? '' : 's'} to review`);
        if (duplicateLabels.length) warnings.push(`${duplicateLabels.length} duplicate label${duplicateLabels.length === 1 ? '' : 's'} found`);
        if (!items.length) warnings.push('No visible parts were extracted');
        return {
            title: options.title || 'Cut Review',
            count: items.length,
            expected: expectedKeys.length,
            items,
            missing,
            missingNames,
            duplicateLabels,
            warnings,
            status: warnings.length ? 'review' : 'ready'
        };
    },

    _renderCutReview(panel, selector, review, createdParts = {}) {
        const host = typeof selector === 'string' ? panel?.querySelector(selector) : selector;
        if (!host || !review) return;
        const esc = value => this._escapeCutReviewText(value);
        const icon = review.status === 'ready' ? 'fa-circle-check' : 'fa-triangle-exclamation';
        const summary = review.status === 'ready'
            ? `${review.count} clean part${review.count === 1 ? '' : 's'} ready`
            : review.warnings.join(' · ');
        const items = review.items.slice(0, 10).map(item => `
            <div class="cut-review-item ${item.tiny ? 'warn' : ''}">
                <span><i class="fas ${item.tiny ? 'fa-triangle-exclamation' : 'fa-check'}"></i> ${esc(item.name)}</span>
                <small>${Math.round(item.w)}×${Math.round(item.h)}${item.tiny ? ' · small' : ''}</small>
            </div>
        `).join('');
        const hiddenCount = Math.max(0, review.items.length - 10);
        const missingList = review.missingNames || review.missing || [];
        const missing = missingList.length
            ? `<div class="cut-review-note warn"><b>Missing:</b> ${missingList.map(esc).join(', ')}</div>`
            : '';
        const duplicates = review.duplicateLabels.length
            ? `<div class="cut-review-note warn"><b>Duplicate labels:</b> ${review.duplicateLabels.map(esc).join(', ')}</div>`
            : '';
        host.className = `cut-review-card ${review.status === 'ready' ? 'ready' : 'review'}`;
        host.innerHTML = `
            <div class="cut-review-title">
                <i class="fas ${icon}"></i>
                <span>${esc(review.title)}</span>
                <strong>${esc(summary)}</strong>
            </div>
            <div class="cut-review-list">${items}${hiddenCount ? `<div class="cut-review-more">+${hiddenCount} more part${hiddenCount === 1 ? '' : 's'}</div>` : ''}</div>
            ${missing}
            ${duplicates}
            <div class="cut-review-actions">
                <button class="btn-secondary btn-sm" data-cut-review-select><i class="fas fa-object-group"></i> Select Parts</button>
                <span>Review small or missing parts before animating.</span>
            </div>
        `;
        host.querySelector('[data-cut-review-select]')?.addEventListener('click', () => {
            const ids = Object.values(createdParts || {}).map(obj => obj?.id).filter(Boolean);
            if (!ids.length) return;
            if (typeof this.objects?.select === 'function') this.objects.select(ids);
            else if (typeof this.objects?.selectObjects === 'function') this.objects.selectObjects(ids);
            this.stage?.requestRender?.();
        });
    },

    // ── Show the Body Stencil panel ──

    showBodyStencil(initialStencilKey = null) {
        const selected = this.objects.getSelectedObjects();
        if (selected.length !== 1 || selected[0].type !== 'image') {
            if (selected.length > 0) {
                this.showAssembleSelectedPartsPanel?.({ presetKey: initialStencilKey || (selected.length <= 6 ? 'guided-motion-front' : 'human-front') });
                Utils.showToast('Selected parts detected — label them for animation instead of applying a stencil.', 'info');
                return;
            }
            Utils.showToast('Select a single image to apply a body stencil, or select cut parts to assemble them', 'warning');
            return;
        }

        this._closeActiveCuttingWorkflows();
        this._bsSessionId = (this._bsSessionId || 0) + 1;
        this._bsObj = selected[0];
        this._bsActive = false;
        this._bsPreset = null;
        this._bsParts = null;        // { partKey: [{x,y},...] } in stage coords
        this._bsStars = null;        // [{ id, label, x, y, links }] in stage coords — joint anchors
        this._bsDragging = null;      // { partKey, pointIndex }
        this._bsStarDrag = null;      // { starIndex } — star being dragged
        this._bsPartDrag = null;      // { partKey, lastX, lastY, affectedParts: [] }
        this._bsHoverPt = null;       // { partKey, pointIndex }
        this._bsHoverStar = null;     // star index being hovered
        this._bsHoverPart = null;     // partKey when hovering inside a part polygon

        // Auto-lock the image during Body Stencil
        this._bsWasLocked = this._bsObj.locked;
        this._bsObj._temporaryLockOwner = 'body-stencil';
        this._bsObj._temporaryLockPrevious = this._bsWasLocked;
        this._bsObj.locked = true;

        const panel = document.createElement('div');
        panel.id = 'body-stencil-panel';
        panel.className = 'body-stencil-panel';

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-${initialStencilKey === 'guided-motion-front' ? 'person-rays' : 'child'}"></i> ${initialStencilKey === 'guided-motion-front' ? 'Guided Motion Rig' : 'Body Stencil'}
                <span class="bs-step-indicator" id="bs-step-indicator">Step 1/3</span>
                <button class="ja-close" title="Close (Esc)"><i class="fas fa-times"></i></button>
            </div>
            <div class="bs-body">
                <div class="bs-step" id="bs-step-type">
                    <div class="bs-step-label">Choose View</div>
                    <div style="display:flex;gap:6px;align-items:center;margin:0 0 8px;flex-wrap:wrap;">
                        <button class="btn-secondary btn-sm" id="bs-assemble-existing" title="Label already-cut body parts and animate them">
                            <i class="fas fa-link"></i> Assemble Selected Parts
                        </button>
                        <span style="font-size:10px;color:#94a3b8;">Use this when parts are already cut or imported.</span>
                    </div>
                    <div class="bs-preset-list">
                        <div class="bs-preset-row" data-stencil="guided-motion-front" title="Simple six-part front-facing rig with automatic Flex anchors">
                            <i class="fas fa-person-rays"></i>
                            <span class="bs-preset-name">Guided Motion Rig</span>
                            <span class="bs-preset-count">6 flexible parts</span>
                        </div>
                        <div class="bs-preset-row" data-stencil="human-front" title="Front-facing human body stencil">
                            <i class="fas fa-person"></i>
                            <span class="bs-preset-name">Human (Front)</span>
                            <span class="bs-preset-count">16 parts</span>
                        </div>
                        <div class="bs-preset-row" data-stencil="human-side" title="Side-facing human body stencil">
                            <i class="fas fa-person-walking"></i>
                            <span class="bs-preset-name">Human (Side)</span>
                            <span class="bs-preset-count">8 parts</span>
                        </div>
                    </div>
                </div>
                <div class="bs-step hidden" id="bs-step-adjust">
                    <div class="bs-step-label">Adjust Stencil</div>
                    <div class="bs-prep-section" id="bs-prep-section">
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-eraser"></i> BG Tolerance</label>
                            <input type="range" id="bs-bg-tolerance" min="0" max="80" value="30" class="bs-slider">
                            <span class="bs-slider-val" id="bs-bg-tol-val">30</span>
                        </div>
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-crop-alt"></i> Crop Padding</label>
                            <input type="range" id="bs-crop-padding" min="0" max="80" value="5" class="bs-slider">
                            <span class="bs-slider-val" id="bs-crop-pad-val">5px</span>
                        </div>
                    </div>
                    <div class="bs-help">
                        <span><kbd>Drag</kbd> ★ stars to align joints &bull; <kbd>Drag</kbd> points to reshape &bull; <kbd>Click inside</kbd> to move part &bull; <kbd>Right-click</kbd> edge/point to add/delete</span>
                    </div>
                    <div class="cut-workflow-note">
                        <i class="fas fa-lock"></i>
                        <span>The source image is temporarily locked while editing. Use Restore if auto crop or background removal looks wrong.</span>
                        <button class="btn-sm btn-secondary" id="bs-restore-source"><i class="fas fa-image"></i> Restore Source</button>
                    </div>
                    <div class="bs-tip" style="font-size:10px;color:#94a3b8;line-height:1.4;margin:4px 0 6px;padding:5px 7px;background:rgba(99,102,241,0.1);border-radius:4px;">
                        <i class="fas fa-lightbulb" style="color:#eab308;margin-right:3px;"></i>
                        <b>Overlap tip:</b> Connected parts should <b>slightly overlap</b> at joints (e.g. torso bottom over upper-leg top, upper-arm over forearm).
                        This hides seam gaps when parts rotate. Aim for ~5-10% overlap at each connection.
                        Use <kbd>Arrow keys</kbd> after cutting to nudge parts (Shift+Arrow = 10px).
                    </div>
                    <div class="bs-parts-legend" id="bs-parts-legend"></div>
                    <div class="bs-prep-section" style="margin:6px 0;">
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-arrows-alt"></i> Assembly</label>
                            <select id="bs-assembly-mode" style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:11px;" title="How body parts are positioned after cutting">
                                <option value="keep" selected>Keep Positions</option>
                                <option value="reposition">T-Pose (Reposition)</option>
                            </select>
                        </div>
                        <div class="bs-prep-row" style="margin-top:6px;">
                            <label class="bs-prep-label"><i class="fas fa-project-diagram"></i> Joint System</label>
                            <select id="bs-joint-system" style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:11px;" title="Which joint/pin engine to use">
                                <option value="stencil" selected>Body Stencil</option>
                                <option value="armature">Pose Armature</option>
                            </select>
                        </div>
                        <div style="font-size:10px;color:#94a3b8;line-height:1.4;padding-top:4px;">
                            Body Stencil uses its own pin/joint system. Pose Armature merges parts into 6 armature roles with inherited rotation.
                        </div>
                    </div>
                    <div class="bs-actions">
                        <button class="btn-sm bs-reset-btn" id="bs-reset-btn" title="Reset stencil to default"><i class="fas fa-undo"></i> Reset</button>
                        <button class="btn-secondary btn-sm" id="bs-mirror-pairs" title="Mirror left/right body part outlines around the image center"><i class="fas fa-arrows-left-right"></i> Mirror Pairs</button>
                        <button class="btn-primary btn-sm bs-cut-btn" id="bs-cut-btn"><i class="fas fa-magic"></i> Capture &amp; Assemble</button>
                    </div>
                </div>
                <div class="bs-step hidden" id="bs-step-done">
                    <div class="bs-step-label"><i class="fas fa-check-circle" style="color:#10b981"></i> Done!</div>
                    <div class="bs-done-msg" id="bs-done-msg"></div>
                    <div id="bs-cut-review"></div>
                    <div class="bs-hint" style="font-size:12px; color:#94a3b8; margin:6px 0;">Rotate joints: <b>Shift+drag</b> a body part for IK posing, or use the <b>rotation handle</b> on a selected part. Use the <b>Poses</b> panel to save/load poses.</div>
                    <div class="bs-actions">
                        <button class="btn-primary btn-sm" id="bs-btn-movements"><i class="fas fa-play"></i> Movements</button>
                        <button class="btn-secondary btn-sm" id="bs-btn-poses"><i class="fas fa-bookmark"></i> Poses</button>
                        <button class="btn-sm" id="bs-btn-contours"><i class="fas fa-circle-dot"></i> Contours</button>
                        <button class="btn-sm" id="bs-btn-tune"><i class="fas fa-crosshairs"></i> Tune Joints</button>
                        <button class="btn-sm" id="bs-btn-skeleton"><i class="fas fa-bone"></i> Skeleton</button>
                        <button class="btn-sm hidden" id="bs-btn-armature-panel"><i class="fas fa-project-diagram"></i> Armature Panel</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        if (Utils.makePanelResizable) Utils.makePanelResizable(panel);

        // Close
        panel.querySelector('.ja-close')?.addEventListener('click', () => {
            this._exitBodyStencil();
            panel.remove();
        });

        // Keyboard
        this._bsKeyHandler = (e) => {
            if (!document.getElementById('body-stencil-panel')) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                this._exitBodyStencil();
                panel.remove();
            }
        };
        document.addEventListener('keydown', this._bsKeyHandler);

        // Step 1: view selection
        panel.querySelector('#bs-assemble-existing')?.addEventListener('click', () => {
            this.showAssembleSelectedPartsPanel?.({ presetKey: initialStencilKey || 'guided-motion-front' });
        });

        // Step 1: view selection
        panel.querySelectorAll('.bs-preset-row').forEach(card => {
            card.addEventListener('click', () => {
                const stencilKey = card.dataset.stencil;
                this._bsEnterAdjust(stencilKey, panel);
            });
        });
        if (initialStencilKey) this._bsEnterAdjust(initialStencilKey, panel);
    },

    // ── Step 2: Enter stencil adjust mode ──

    _bsEnterAdjust(stencilKey, panel) {
        const templates = JointSystem._getStencilTemplates();
        const template = templates[stencilKey];
        if (!template) return;

        // Find matching JointPreset
        this._bsPreset = JointPresets.getAll().find(p => p.key === stencilKey);
        if (!this._bsPreset) return;

        const obj = this._bsObj;

        // Convert normalized coords to stage coords
        this._bsParts = {};
        for (const [partKey, normPath] of Object.entries(template.parts)) {
            this._bsParts[partKey] = normPath.map(p => ({
                x: obj.x + p.x * obj.width,
                y: obj.y + p.y * obj.height
            }));
        }

        // Convert normalized star positions to stage coords
        this._bsStars = (template.stars || []).map(s => ({
            id: s.id,
            label: s.label,
            x: obj.x + s.x * obj.width,
            y: obj.y + s.y * obj.height,
            links: s.links
        }));

        this._bsActive = true;
        this._bsDragging = null;
        this._bsStarDrag = null;
        this._bsPartDrag = null;
        this._bsHoverPt = null;
        this._bsHoverStar = null;
        this._bsHoverPart = null;

        // Switch UI steps
        panel.querySelector('#bs-step-type').classList.add('hidden');
        panel.querySelector('#bs-step-adjust').classList.remove('hidden');
        const ind = panel.querySelector('#bs-step-indicator');
        if (ind) ind.textContent = 'Step 2/3';

        // Build legend
        this._bsBuildLegend(panel);

        // Bind canvas events
        this._bsMouseDownHandler = (e) => this._bsHandleMouseDown(e);
        this._bsMouseMoveHandler = (e) => this._bsHandleMouseMove(e);
        this._bsMouseUpHandler = (e) => this._bsHandleMouseUp(e);
        this._bsCtxMenuHandler = (e) => this._bsHandleContextMenu(e);
        this.stage.viewport.addEventListener('mousedown', this._bsMouseDownHandler);
        this.stage.viewport.addEventListener('mousemove', this._bsMouseMoveHandler);
        this.stage.viewport.addEventListener('mouseup', this._bsMouseUpHandler);
        this.stage.viewport.addEventListener('contextmenu', this._bsCtxMenuHandler);
        this.stage.viewport.style.cursor = 'crosshair';

        // ── Auto background removal + autocrop ──
        // Store the original image for re-processing when sliders change
        this._bsOriginalSrc = obj.imageSrc;
        this._bsOriginalX = obj.x;
        this._bsOriginalY = obj.y;
        this._bsOriginalW = obj.width;
        this._bsOriginalH = obj.height;
        this._bsStencilKey = stencilKey;

        // Wire tolerance & padding sliders
        const tolSlider = panel.querySelector('#bs-bg-tolerance');
        const padSlider = panel.querySelector('#bs-crop-padding');
        const tolVal = panel.querySelector('#bs-bg-tol-val');
        const padVal = panel.querySelector('#bs-crop-pad-val');
        let processTimer = null;
        const scheduleProcess = () => {
            clearTimeout(processTimer);
            processTimer = setTimeout(() => this._bsProcessImage(panel), 200);
        };
        if (tolSlider) {
            tolSlider.addEventListener('input', () => {
                if (tolVal) tolVal.textContent = tolSlider.value;
                scheduleProcess();
            });
        }
        if (padSlider) {
            padSlider.addEventListener('input', () => {
                if (padVal) padVal.textContent = padSlider.value + 'px';
                scheduleProcess();
            });
        }

        // Run initial processing
        this._bsProcessImage(panel);

        // Reset button
        panel.querySelector('#bs-reset-btn')?.addEventListener('click', () => {
            // Re-apply default stencil
            const obj = this._bsObj;
            const t = JointSystem._getStencilTemplates()[stencilKey];
            for (const [partKey, normPath] of Object.entries(t.parts)) {
                this._bsParts[partKey] = normPath.map(p => ({
                    x: obj.x + p.x * obj.width,
                    y: obj.y + p.y * obj.height
                }));
            }
            this._bsStars = (t.stars || []).map(s => ({
                id: s.id, label: s.label,
                x: obj.x + s.x * obj.width,
                y: obj.y + s.y * obj.height,
                links: s.links
            }));
            this.stage.requestRender();
        });

        panel.querySelector('#bs-restore-source')?.addEventListener('click', () => {
            this._bsRestoreSourcePreview(panel);
        });

        panel.querySelector('#bs-mirror-pairs')?.addEventListener('click', () => {
            this._bsMirrorPairedParts();
        });

        // Cut & Assemble button
        panel.querySelector('#bs-cut-btn')?.addEventListener('click', () => {
            this._bsCutAndAssemble(panel);
        });

        // Register render overlay
        this._bsRenderOverlay = (ctx) => this._renderBodyStencilOverlay(ctx);
        eventBus.on('stage:render-overlay', this._bsRenderOverlay);
        this.stage.requestRender();
    },

    // ── Auto BG removal + autocrop for Body Stencil source image ──

    _bsProcessImage(panel) {
        const obj = this._bsObj;
        if (!obj || !this._bsOriginalSrc) return;
        const sessionId = this._bsSessionId;

        const tolerance = parseInt(panel?.querySelector('#bs-bg-tolerance')?.value ?? 30);
        const padding = parseInt(panel?.querySelector('#bs-crop-padding')?.value ?? 5);

        // Load original image fresh each time so we always work from the untouched source
        const img = new Image();
        img.onload = () => {
            if (sessionId !== this._bsSessionId || obj !== this._bsObj || !panel?.isConnected) return;
            const natW = img.naturalWidth;
            const natH = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = natW;
            canvas.height = natH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            // ── Step 1: Background removal ──
            if (tolerance > 0) {
                const imageData = ctx.getImageData(0, 0, natW, natH);
                const data = imageData.data;

                // Sample background colour from corners (skip transparent corners)
                const corners = [
                    [0, 0], [natW - 1, 0],
                    [0, natH - 1], [natW - 1, natH - 1]
                ];
                let bgR = 0, bgG = 0, bgB = 0, count = 0;
                corners.forEach(([sx, sy]) => {
                    const idx = (sy * natW + sx) * 4;
                    if (data[idx + 3] > 128) { // only count opaque corners
                        bgR += data[idx]; bgG += data[idx + 1]; bgB += data[idx + 2];
                        count++;
                    }
                });
                if (count > 0) {
                    bgR = Math.round(bgR / count);
                    bgG = Math.round(bgG / count);
                    bgB = Math.round(bgB / count);

                    const tolSq = tolerance * tolerance * 3;
                    for (let i = 0; i < data.length; i += 4) {
                        const dr = data[i] - bgR;
                        const dg = data[i + 1] - bgG;
                        const db = data[i + 2] - bgB;
                        if (dr * dr + dg * dg + db * db < tolSq) {
                            data[i + 3] = 0;
                        }
                    }
                    ctx.putImageData(imageData, 0, 0);
                }
            }

            // ── Step 2: Autocrop (trim transparent pixels + padding) ──
            const id = ctx.getImageData(0, 0, natW, natH).data;
            let minX = natW, minY = natH, maxX = 0, maxY = 0;
            for (let y = 0; y < natH; y++) {
                for (let x = 0; x < natW; x++) {
                    if (id[(y * natW + x) * 4 + 3] > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            // If nothing visible, restore original and bail
            if (maxX < minX || maxY < minY) {
                obj.imageSrc = this._bsOriginalSrc;
                obj.loadImage(this._bsOriginalSrc);
                return;
            }

            // Apply padding (clamped to canvas bounds)
            const pad = Math.max(0, padding);
            minX = Math.max(0, minX - pad);
            minY = Math.max(0, minY - pad);
            maxX = Math.min(natW - 1, maxX + pad);
            maxY = Math.min(natH - 1, maxY + pad);

            const cropW = maxX - minX + 1;
            const cropH = maxY - minY + 1;

            const cropped = document.createElement('canvas');
            cropped.width = cropW;
            cropped.height = cropH;
            cropped.getContext('2d').drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);

            const newSrc = cropped.toDataURL('image/png');

            // Compute how the stage object moves / resizes
            const scaleX = this._bsOriginalW / natW;
            const scaleY = this._bsOriginalH / natH;
            const newX = this._bsOriginalX + minX * scaleX;
            const newY = this._bsOriginalY + minY * scaleY;
            const newW = cropW * scaleX;
            const newH = cropH * scaleY;

            // Move stencil points to match the new object bounds.
            // Points were placed relative to the original object rect, so
            // convert to normalised coords in the original, then map to the new rect.
            if (this._bsParts && this._bsStencilKey) {
                const tmpl = JointSystem._getStencilTemplates()[this._bsStencilKey];
                if (tmpl) {
                    for (const [partKey, normPath] of Object.entries(tmpl.parts)) {
                        this._bsParts[partKey] = normPath.map(p => ({
                            x: newX + p.x * newW,
                            y: newY + p.y * newH
                        }));
                    }
                    // Re-map star anchors too
                    if (tmpl.stars) {
                        this._bsStars = tmpl.stars.map(s => ({
                            id: s.id, label: s.label,
                            x: newX + s.x * newW,
                            y: newY + s.y * newH,
                            links: s.links
                        }));
                    }
                }
            }

            // Update the object
            obj.x = newX;
            obj.y = newY;
            obj.width = newW;
            obj.height = newH;
            obj.imageSrc = newSrc;
            obj.loadImage(newSrc);

            this.stage.requestRender();
        };
        img.src = this._bsOriginalSrc;
    },

    _bsBuildLegend(panel) {
        const legend = panel.querySelector('#bs-parts-legend');
        if (!legend || !this._bsParts) return;
        const colors = this._bsPartColors();
        const partKeys = Object.keys(this._bsParts);
        const preset = this._bsPreset;
        legend.innerHTML = partKeys.map((pk, i) => {
            const partDef = preset?.parts.find(p => p.partKey === pk);
            const name = partDef ? partDef.name : pk;
            const color = colors[i % colors.length];
            return `<div class="bs-legend-item"><span class="bs-legend-swatch" style="background:${color}"></span>${name}</div>`;
        }).join('');
    },

    _bsPartColors() {
        return ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899',
                '#06b6d4', '#f97316', '#14b8a6', '#6366f1', '#d946ef', '#84cc16',
                '#0ea5e9', '#e11d48', '#a855f7', '#22c55e', '#eab308'];
    },

    _bsRestoreSourcePreview(panel) {
        const obj = this._bsObj;
        if (!obj || !this._bsOriginalSrc) return;
        obj.x = this._bsOriginalX;
        obj.y = this._bsOriginalY;
        obj.width = this._bsOriginalW;
        obj.height = this._bsOriginalH;
        obj.imageSrc = this._bsOriginalSrc;
        obj.loadImage?.(this._bsOriginalSrc);
        obj._contourPixelsCache = null;
        if (this._bsStencilKey) {
            const template = JointSystem._getStencilTemplates()[this._bsStencilKey];
            if (template) {
                this._bsParts = {};
                Object.entries(template.parts || {}).forEach(([partKey, normPath]) => {
                    this._bsParts[partKey] = normPath.map(p => ({
                        x: obj.x + p.x * obj.width,
                        y: obj.y + p.y * obj.height
                    }));
                });
                this._bsStars = (template.stars || []).map(s => ({
                    id: s.id,
                    label: s.label,
                    x: obj.x + s.x * obj.width,
                    y: obj.y + s.y * obj.height,
                    links: s.links
                }));
            }
        }
        this._bsBuildLegend(panel);
        this.stage.requestRender();
        Utils.showToast('Source image restored for stencil adjustment', 'success');
    },

    _bsMirrorPairedParts() {
        if (!this._bsParts || !this._bsObj) return;
        const centerX = this._bsObj.x + this._bsObj.width / 2;
        const pairs = [
            ['l-arm', 'r-arm'], ['l-leg', 'r-leg'],
            ['l-upper-arm', 'r-upper-arm'], ['l-forearm', 'r-forearm'], ['l-hand', 'r-hand'],
            ['l-upper-leg', 'r-upper-leg'], ['l-lower-leg', 'r-lower-leg'], ['l-foot', 'r-foot']
        ];
        let changed = 0;
        pairs.forEach(([leftKey, rightKey]) => {
            const left = this._bsParts[leftKey];
            const right = this._bsParts[rightKey];
            if (!left?.length || !right?.length) return;
            if (left.length === right.length) {
                this._bsParts[rightKey] = left.map(point => ({ x: centerX * 2 - point.x, y: point.y })).reverse();
                changed++;
            } else {
                const mirror = source => source.map(point => ({ x: centerX * 2 - point.x, y: point.y }));
                if (left.length > right.length) this._bsParts[rightKey] = mirror(left).reverse();
                else this._bsParts[leftKey] = mirror(right).reverse();
                changed++;
            }
        });
        if (changed) {
            this.stage.requestRender();
            Utils.showToast(`Mirrored ${changed} left/right part pair${changed === 1 ? '' : 's'}`, 'success');
        } else {
            Utils.showToast('No matching left/right stencil pairs found to mirror', 'info');
        }
    },

    // ── Exit / Cleanup ──

    _exitBodyStencil() {
        this._clearCuttingCompletionHandler();
        this._bsSessionId = (this._bsSessionId || 0) + 1;
        // Restore lock state
        if (this._bsObj && this._bsWasLocked != null) {
            this._bsObj.locked = this._bsWasLocked;
            delete this._bsObj._temporaryLockOwner;
            delete this._bsObj._temporaryLockPrevious;
        }
        this._bsWasLocked = null;

        // Background removal and auto-crop are preparation previews. Closing
        // the tool (or completing a cut) must keep the untouched source image
        // available for Undo and future edits.
        if (this._bsObj && this._bsOriginalSrc) {
            this._bsObj.x = this._bsOriginalX;
            this._bsObj.y = this._bsOriginalY;
            this._bsObj.width = this._bsOriginalW;
            this._bsObj.height = this._bsOriginalH;
            this._bsObj.imageSrc = this._bsOriginalSrc;
            this._bsObj.loadImage?.(this._bsOriginalSrc);
            this._bsObj._contourPixelsCache = null;
        }

        this._bsActive = false;
        this._bsParts = null;
        this._bsStars = null;
        this._bsDragging = null;
        this._bsStarDrag = null;
        this._bsPartDrag = null;
        this._bsHoverPt = null;
        this._bsHoverStar = null;
        this._bsHoverPart = null;
        this._bsOriginalSrc = null;
        this._bsOriginalX = null;
        this._bsOriginalY = null;
        this._bsOriginalW = null;
        this._bsOriginalH = null;
        this._bsStencilKey = null;
        this._bsObj = null;
        this.stage.viewport.style.cursor = '';

        if (this._bsMouseDownHandler) {
            this.stage.viewport.removeEventListener('mousedown', this._bsMouseDownHandler);
            this.stage.viewport.removeEventListener('mousemove', this._bsMouseMoveHandler);
            this.stage.viewport.removeEventListener('mouseup', this._bsMouseUpHandler);
            this._bsMouseDownHandler = null;
            this._bsMouseMoveHandler = null;
            this._bsMouseUpHandler = null;
        }
        if (this._bsDblClickHandler) {
            this.stage.viewport.removeEventListener('dblclick', this._bsDblClickHandler);
            this._bsDblClickHandler = null;
        }
        if (this._bsCtxMenuHandler) {
            this.stage.viewport.removeEventListener('contextmenu', this._bsCtxMenuHandler);
            this._bsCtxMenuHandler = null;
        }
        this._bsDismissContextMenu();
        if (this._bsRenderOverlay) {
            eventBus.off('stage:render-overlay', this._bsRenderOverlay);
            this._bsRenderOverlay = null;
        }
        if (this._bsKeyHandler) {
            document.removeEventListener('keydown', this._bsKeyHandler);
            this._bsKeyHandler = null;
        }
        this.stage.requestRender();
    },

    // ── Mouse handlers for point dragging ──

    _bsStageCoords(e) {
        return this.stage.screenToStage(e.clientX, e.clientY);
    },

    _bsFindNearestPoint(stageX, stageY) {
        if (!this._bsParts) return null;
        const zoom = this.stage.zoom || 1;
        const threshold = 8 / zoom; // 8 screen pixels
        let best = null;
        let bestDist = threshold;

        const partKeys = Object.keys(this._bsParts);
        for (let pi = 0; pi < partKeys.length; pi++) {
            const pk = partKeys[pi];
            const pts = this._bsParts[pk];
            for (let i = 0; i < pts.length; i++) {
                const dist = Math.hypot(pts[i].x - stageX, pts[i].y - stageY);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { partKey: pk, pointIndex: i };
                }
            }
        }
        return best;
    },

    // Point-in-polygon test (ray casting)
    _bsPointInPolygon(x, y, pts) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            const xi = pts[i].x, yi = pts[i].y;
            const xj = pts[j].x, yj = pts[j].y;
            if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    },

    // Find which body part polygon contains the given stage point (topmost/smallest area wins)
    _bsFindPartAtPoint(stageX, stageY) {
        if (!this._bsParts) return null;
        let bestKey = null;
        let bestArea = Infinity;
        for (const [pk, pts] of Object.entries(this._bsParts)) {
            if (!pts || pts.length < 3) continue;
            if (!this._bsPointInPolygon(stageX, stageY, pts)) continue;
            // Use absolute polygon area to pick the smallest (most specific) part
            let area = 0;
            for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
                area += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y);
            }
            area = Math.abs(area) / 2;
            if (area < bestArea) {
                bestArea = area;
                bestKey = pk;
            }
        }
        return bestKey;
    },

    // Get all descendant part keys for a given part using the preset hierarchy
    _bsGetDescendants(partKey) {
        if (!this._bsPreset) return [];
        const descendants = [];
        const queue = [partKey];
        while (queue.length) {
            const current = queue.shift();
            for (const p of this._bsPreset.parts) {
                if (p.parentPartKey === current && this._bsParts[p.partKey]) {
                    descendants.push(p.partKey);
                    queue.push(p.partKey);
                }
            }
        }
        return descendants;
    },

    // Find nearest edge segment across all parts; returns { partKey, segIndex, t, x, y }
    _bsFindNearestEdge(stageX, stageY) {
        if (!this._bsParts) return null;
        const zoom = this.stage.zoom || 1;
        const threshold = 10 / zoom;
        let best = null;
        let bestDist = threshold;

        for (const [pk, pts] of Object.entries(this._bsParts)) {
            if (!pts || pts.length < 3) continue;
            for (let i = 0; i < pts.length; i++) {
                const a = pts[i];
                const b = pts[(i + 1) % pts.length];
                const abx = b.x - a.x, aby = b.y - a.y;
                const len2 = abx * abx + aby * aby;
                if (len2 === 0) continue;
                let t = ((stageX - a.x) * abx + (stageY - a.y) * aby) / len2;
                t = Math.max(0, Math.min(1, t));
                const px = a.x + t * abx, py = a.y + t * aby;
                const dist = Math.hypot(px - stageX, py - stageY);
                if (dist < bestDist) {
                    bestDist = dist;
                    best = { partKey: pk, segIndex: i, t, x: px, y: py };
                }
            }
        }
        return best;
    },

    // Right-click on an edge → Add Point / Right-click on a point → Delete Point
    _bsHandleContextMenu(e) {
        if (!this._bsActive) return;
        if (e.target.closest('#body-stencil-panel')) return;
        if (e.target.closest('.bs-context-menu')) return;

        e.preventDefault();
        e.stopPropagation();

        const { x, y } = this._bsStageCoords(e);
        const hitPt = this._bsFindNearestPoint(x, y);

        if (hitPt) {
            // Right-clicked on an existing point — offer Delete
            const pts = this._bsParts[hitPt.partKey];
            if (!pts || pts.length <= 3) return; // keep minimum 3 points
            this._bsShowContextMenu(e.clientX, e.clientY, [
                {
                    label: 'Delete Point',
                    icon: 'fas fa-trash-alt',
                    action: () => {
                        pts.splice(hitPt.pointIndex, 1);
                        // Shift star vertex indices for this part
                        this._bsShiftStarIndices(hitPt.partKey, hitPt.pointIndex, -1);
                        this.stage.requestRender();
                    }
                }
            ]);
            return;
        }

        const edge = this._bsFindNearestEdge(x, y);
        if (edge) {
            // Right-clicked near an edge — offer Add Point
            this._bsShowContextMenu(e.clientX, e.clientY, [
                {
                    label: 'Add Point',
                    icon: 'fas fa-plus-circle',
                    action: () => {
                        const pts = this._bsParts[edge.partKey];
                        if (!pts) return;
                        pts.splice(edge.segIndex + 1, 0, { x: edge.x, y: edge.y });
                        // Shift star vertex indices for this part
                        this._bsShiftStarIndices(edge.partKey, edge.segIndex + 1, +1);
                        this.stage.requestRender();
                    }
                }
            ]);
        }
    },

    // Adjust star vertex indices when a point is added (+1) or removed (-1) from a part
    _bsShiftStarIndices(partKey, atIndex, delta) {
        if (!this._bsStars) return;
        for (const star of this._bsStars) {
            for (const link of star.links) {
                if (link.partKey !== partKey) continue;
                link.vertexIndices = link.vertexIndices
                    .map(vi => {
                        if (delta > 0) {
                            // Insertion: indices at or after atIndex shift up
                            return vi >= atIndex ? vi + delta : vi;
                        } else {
                            // Deletion: remove the deleted index, shift down those after
                            if (vi === atIndex) return -1; // mark for removal
                            return vi > atIndex ? vi + delta : vi;
                        }
                    })
                    .filter(vi => vi >= 0);
            }
        }
    },

    _bsShowContextMenu(screenX, screenY, items) {
        this._bsDismissContextMenu();

        const menu = document.createElement('div');
        menu.className = 'context-menu bs-context-menu';
        menu.style.left = screenX + 'px';
        menu.style.top = screenY + 'px';

        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'context-menu-item';
            row.innerHTML = `<i class="${item.icon}"></i> ${item.label}`;
            row.addEventListener('click', (e) => {
                e.stopPropagation();
                item.action();
                this._bsDismissContextMenu();
            });
            menu.appendChild(row);
        });

        document.body.appendChild(menu);

        // Clamp to viewport
        requestAnimationFrame(() => {
            const rect = menu.getBoundingClientRect();
            if (rect.right > window.innerWidth) menu.style.left = (window.innerWidth - rect.width - 4) + 'px';
            if (rect.bottom > window.innerHeight) menu.style.top = (window.innerHeight - rect.height - 4) + 'px';
        });

        // Dismiss on click outside
        this._bsCtxDismiss = (e) => {
            if (!e.target.closest('.bs-context-menu')) this._bsDismissContextMenu();
        };
        setTimeout(() => document.addEventListener('click', this._bsCtxDismiss, true), 0);
    },

    _bsDismissContextMenu() {
        document.querySelector('.bs-context-menu')?.remove();
        if (this._bsCtxDismiss) {
            document.removeEventListener('click', this._bsCtxDismiss, true);
            this._bsCtxDismiss = null;
        }
    },

    _bsHandleMouseDown(e) {
        if (!this._bsActive || e.button !== 0) return;
        if (e.target.closest('#body-stencil-panel')) return;

        const { x, y } = this._bsStageCoords(e);

        // Vertex points take priority over stars (more precise control)
        const hit = this._bsFindNearestPoint(x, y);
        if (hit) {
            e.preventDefault();
            e.stopPropagation();
            this._bsDragging = hit;
            this.stage.viewport.style.cursor = 'grabbing';
            return;
        }

        // Star anchors (joint connection points)
        const starHit = this._bsFindNearestStar(x, y);
        if (starHit != null) {
            e.preventDefault();
            e.stopPropagation();
            this._bsStarDrag = { starIndex: starHit };
            this.stage.viewport.style.cursor = 'grabbing';
            return;
        }

        // No point hit — check if click is inside a body part polygon
        const hitPart = this._bsFindPartAtPoint(x, y);
        if (hitPart) {
            e.preventDefault();
            e.stopPropagation();
            // Collect all descendant parts that should move together
            const affected = this._bsGetDescendants(hitPart);
            affected.unshift(hitPart);
            this._bsPartDrag = { partKey: hitPart, lastX: x, lastY: y, affectedParts: affected };
            this.stage.viewport.style.cursor = 'move';
        }
    },

    _bsHandleMouseMove(e) {
        if (!this._bsActive) return;
        const { x, y } = this._bsStageCoords(e);

        // Star drag: move the star AND all its linked vertices
        if (this._bsStarDrag) {
            e.preventDefault();
            e.stopPropagation();
            const star = this._bsStars[this._bsStarDrag.starIndex];
            if (star) {
                const dx = x - star.x;
                const dy = y - star.y;
                star.x = x;
                star.y = y;
                // Move all linked part vertices
                for (const link of star.links) {
                    const pts = this._bsParts[link.partKey];
                    if (!pts) continue;
                    for (const vi of link.vertexIndices) {
                        if (vi >= 0 && vi < pts.length) {
                            pts[vi] = { x: pts[vi].x + dx, y: pts[vi].y + dy };
                        }
                    }
                }
                this.stage.requestRender();
            }
            return;
        }

        if (this._bsDragging) {
            e.preventDefault();
            e.stopPropagation();
            const pts = this._bsParts[this._bsDragging.partKey];
            if (pts) {
                pts[this._bsDragging.pointIndex] = { x, y };
                this.stage.requestRender();
            }
            return;
        }

        // Whole-part drag (also moves stars belonging to that part)
        if (this._bsPartDrag) {
            e.preventDefault();
            e.stopPropagation();
            const dx = x - this._bsPartDrag.lastX;
            const dy = y - this._bsPartDrag.lastY;
            this._bsPartDrag.lastX = x;
            this._bsPartDrag.lastY = y;
            const movedParts = new Set(this._bsPartDrag.affectedParts);
            for (const pk of this._bsPartDrag.affectedParts) {
                const pts = this._bsParts[pk];
                if (!pts) continue;
                for (let i = 0; i < pts.length; i++) {
                    pts[i] = { x: pts[i].x + dx, y: pts[i].y + dy };
                }
            }
            // Move stars whose ALL links belong to moved parts
            if (this._bsStars) {
                for (const star of this._bsStars) {
                    if (star.links.every(l => movedParts.has(l.partKey))) {
                        star.x += dx;
                        star.y += dy;
                    }
                }
            }
            this.stage.requestRender();
            return;
        }

        // Hover detection: vertex points first, then stars, then part interiors
        const prev = this._bsHoverPt;
        const prevPart = this._bsHoverPart;
        const prevStar = this._bsHoverStar;

        const hit = this._bsFindNearestPoint(x, y);
        if (hit) {
            this._bsHoverPt = hit;
            this._bsHoverStar = null;
            this._bsHoverPart = null;
            this.stage.viewport.style.cursor = 'grab';
        } else {
            this._bsHoverPt = null;
            const starHit = this._bsFindNearestStar(x, y);
            if (starHit != null) {
                this._bsHoverStar = starHit;
                this._bsHoverPart = null;
                this.stage.viewport.style.cursor = 'grab';
            } else {
                this._bsHoverStar = null;
                const hoverPart = this._bsFindPartAtPoint(x, y);
                this._bsHoverPart = hoverPart;
                this.stage.viewport.style.cursor = hoverPart ? 'move' : 'crosshair';
            }
        }
        if ((hit?.partKey !== prev?.partKey) || (hit?.pointIndex !== prev?.pointIndex) || (this._bsHoverPart !== prevPart) || (prevStar !== this._bsHoverStar)) {
            this.stage.requestRender();
        }
    },

    _bsHandleMouseUp(e) {
        if (this._bsStarDrag) {
            e.preventDefault();
            e.stopPropagation();
            this._bsStarDrag = null;
            this.stage.viewport.style.cursor = 'crosshair';
            this.stage.requestRender();
            return;
        }
        if (this._bsDragging) {
            e.preventDefault();
            e.stopPropagation();
            this._bsDragging = null;
            this.stage.viewport.style.cursor = 'crosshair';
            this.stage.requestRender();
            return;
        }
        if (this._bsPartDrag) {
            e.preventDefault();
            e.stopPropagation();
            this._bsPartDrag = null;
            this.stage.viewport.style.cursor = 'crosshair';
            this.stage.requestRender();
        }
    },

    // Find nearest star anchor within threshold
    _bsFindNearestStar(stageX, stageY) {
        if (!this._bsStars || !this._bsStars.length) return null;
        const zoom = this.stage.zoom || 1;
        const threshold = 12 / zoom;
        let bestIdx = null;
        let bestDist = threshold;
        for (let i = 0; i < this._bsStars.length; i++) {
            const s = this._bsStars[i];
            const dist = Math.hypot(s.x - stageX, s.y - stageY);
            if (dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        return bestIdx;
    },

    // ── Render overlay ──

    _renderBodyStencilOverlay(ctx) {
        if (!this._bsActive || !this._bsParts || !this._bsObj) return;

        const obj = this._bsObj;
        const zoom = Math.max(0.001, this.stage.zoom);
        const colors = this._bsPartColors();
        const partKeys = Object.keys(this._bsParts);
        const preset = this._bsPreset;

        ctx.save();

        // Highlight source object border
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
        ctx.lineWidth = 2 / zoom;
        ctx.setLineDash([6 / zoom, 4 / zoom]);
        ctx.strokeRect(obj.x, obj.y, obj.width, obj.height);
        ctx.setLineDash([]);

        // Draw each body part region
        partKeys.forEach((pk, idx) => {
            const pts = this._bsParts[pk];
            if (!pts || pts.length < 3) return;

            const color = colors[idx % colors.length];
            const isHoverPart = (this._bsHoverPt && this._bsHoverPt.partKey === pk) ||
                                (this._bsHoverPart === pk) ||
                                (this._bsPartDrag && this._bsPartDrag.affectedParts.includes(pk));

            // Filled region
            ctx.fillStyle = color + (isHoverPart ? '40' : '22');
            ctx.strokeStyle = color;
            ctx.lineWidth = (isHoverPart ? 2.5 : 1.5) / zoom;
            ctx.beginPath();
            pts.forEach((p, i) => {
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Control points (small circles)
            const ptR = 3 / zoom;
            pts.forEach((p, i) => {
                const isHoverNode = this._bsHoverPt &&
                    this._bsHoverPt.partKey === pk &&
                    this._bsHoverPt.pointIndex === i;
                const isDragNode = this._bsDragging &&
                    this._bsDragging.partKey === pk &&
                    this._bsDragging.pointIndex === i;

                ctx.beginPath();
                ctx.arc(p.x, p.y, (isHoverNode || isDragNode) ? ptR * 1.6 : ptR, 0, Math.PI * 2);
                ctx.fillStyle = (isHoverNode || isDragNode) ? '#fff' : color;
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1 / zoom;
                ctx.stroke();
            });

            // Label at centroid
            const cx = pts.reduce((s, p) => s + p.x, 0) / pts.length;
            const cy = pts.reduce((s, p) => s + p.y, 0) / pts.length;
            const partDef = preset?.parts.find(p => p.partKey === pk);
            const name = partDef ? partDef.name : pk;
            ctx.font = `bold ${10 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const textW = ctx.measureText(name).width;
            const pillH = 12 / zoom;
            ctx.fillStyle = color + 'cc';
            const rx = cx - textW / 2 - 3 / zoom;
            const ry = cy - pillH / 2;
            const rw = textW + 6 / zoom;
            const rr = 3 / zoom;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(rx, ry, rw, pillH, rr);
            else ctx.rect(rx, ry, rw, pillH);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(name, cx, cy);
        });

        // ── Draw star anchors at joint connection points ──
        if (this._bsStars && this._bsStars.length) {
            const starBaseR = 8 / zoom;
            for (let si = 0; si < this._bsStars.length; si++) {
                const star = this._bsStars[si];
                const isHover = this._bsHoverStar === si;
                const isDrag = this._bsStarDrag?.starIndex === si;
                const r = (isHover || isDrag) ? starBaseR * 1.4 : starBaseR;

                // Draw 6-point star shape
                ctx.beginPath();
                const innerR = r * 0.5;
                const pts6 = 6;
                for (let i = 0; i < pts6 * 2; i++) {
                    const angle = (Math.PI * i) / pts6 - Math.PI / 2;
                    const rad = i % 2 === 0 ? r : innerR;
                    const sx = star.x + Math.cos(angle) * rad;
                    const sy = star.y + Math.sin(angle) * rad;
                    if (i === 0) ctx.moveTo(sx, sy);
                    else ctx.lineTo(sx, sy);
                }
                ctx.closePath();
                ctx.fillStyle = (isHover || isDrag) ? '#fbbf24' : '#f59e0b';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.2 / zoom;
                ctx.stroke();

                // Label on hover/drag
                if (isHover || isDrag) {
                    ctx.font = `bold ${10 / zoom}px sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    const label = star.label;
                    const tw = ctx.measureText(label).width;
                    const lx = star.x;
                    const ly = star.y - r - 4 / zoom;
                    ctx.fillStyle = 'rgba(30, 30, 46, 0.88)';
                    const bx = lx - tw / 2 - 4 / zoom;
                    const by = ly - 12 / zoom;
                    const bw = tw + 8 / zoom;
                    const bh = 14 / zoom;
                    ctx.beginPath();
                    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 3 / zoom);
                    else ctx.rect(bx, by, bw, bh);
                    ctx.fill();
                    ctx.fillStyle = '#fbbf24';
                    ctx.fillText(label, lx, ly);
                }
            }
        }

        ctx.restore();
    },

    // ── Cut & Assemble (reuses Smart Cut clipping infrastructure) ──

    _bsCutAndAssemble(panel) {
        if (!this._bsParts || !this._bsObj || !this._bsPreset) return;

        const obj = this._bsObj;
        const preset = this._bsPreset;

        // Build regions from stencil parts (same format as Smart Cut regions)
        const regions = [];
        for (const [partKey, pts] of Object.entries(this._bsParts)) {
            if (!pts || pts.length < 3) continue;
            const partDef = preset.parts.find(p => p.partKey === partKey);
            regions.push({
                path: pts,
                label: partKey,
                name: partDef ? partDef.name : partKey
            });
        }

        if (regions.length < 2) {
            Utils.showToast('Stencil needs at least 2 parts', 'warning');
            return;
        }

        // Rasterize the source object at 2× for quality
        const padding = 2;
        const scaleF = 2;
        const w = Math.ceil(obj.width + padding * 2);
        const h = Math.ceil(obj.height + padding * 2);
        const cw = w * scaleF;
        const ch = h * scaleF;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = cw;
        srcCanvas.height = ch;
        const srcCtx = srcCanvas.getContext('2d');
        srcCtx.scale(scaleF, scaleF);
        srcCtx.translate(-obj.x + padding, -obj.y + padding);
        srcCtx.save();
        obj.render(srcCtx);
        srcCtx.restore();

        // Cut each region using the same clipping as Smart Cut
        const createdParts = {};
        regions.forEach(region => {
            const localPath = region.path.map(p => ({
                x: (p.x - obj.x + padding) * scaleF,
                y: (p.y - obj.y + padding) * scaleF
            }));

            const clipped = this._scClipInterior(srcCanvas, localPath, cw, ch);
            if (!this._scHasPixels(clipped)) return;

            const trimmed = this._scTrimCanvas(clipped);
            const dataUrl = trimmed.canvas.toDataURL('image/png');

            const stageX = obj.x - padding + trimmed.offX / scaleF;
            const stageY = obj.y - padding + trimmed.offY / scaleF;
            const stageW = trimmed.width / scaleF;
            const stageH = trimmed.height / scaleF;

            const newObj = new StageObject('image', {
                x: stageX, y: stageY,
                width: stageW, height: stageH,
                imageSrc: dataUrl,
                name: region.name,
                layer: obj.layer,
                opacity: obj.opacity
            });
            newObj._tempTrimmedCanvas = trimmed.canvas;
            this.objects.addObject(newObj);
            createdParts[region.label] = newObj;
        });

        if (Object.keys(createdParts).length < 2) {
            this._rollbackCutArtifacts(createdParts);
            Utils.showToast('Could not extract enough parts — adjust stencil points to cover visible areas', 'warning');
            return;
        }

        // Assembly mode: keep positions or reposition into T-pose
        const bsAssemblyMode = panel?.querySelector('#bs-assembly-mode')?.value === 'reposition' ? 'reposition' : 'keep';
        const bsJointSystem = panel?.querySelector('#bs-joint-system')?.value || 'stencil';

        // ── Pose Armature path: merge fine-grained parts into 6 armature roles ──
        if (bsJointSystem === 'armature') {
            this._bsAssembleAsPoseArmature(createdParts, preset, panel, obj);
            return;
        }

        if (bsAssemblyMode === 'reposition') {
            // T-Pose: reposition parts using preset layout (all joints at 0°)
            const assembledCount = this._autoAssembleParts(createdParts, preset, 'reposition');
            var assembledCountFinal = assembledCount;
        } else {
            // Keep positions: preserve cut positions by computing offsets
            const savedPositions = {};
            for (const [label, partObj] of Object.entries(createdParts)) {
                savedPositions[label] = { x: partObj.x, y: partObj.y };
            }

            const assembledCount = this._autoAssembleParts(createdParts, preset);
            var assembledCountFinal = assembledCount;

            // Compute pinOffset so _resolvePins keeps parts where the stencil placed them.
            const sorted = [];
            const remaining = [...preset.parts];
            const placed = new Set();
            while (remaining.length > 0) {
                const before = remaining.length;
                for (let i = remaining.length - 1; i >= 0; i--) {
                    const p = remaining[i];
                    if (!p.parentPartKey || placed.has(p.parentPartKey)) {
                        sorted.push(p);
                        placed.add(p.partKey);
                        remaining.splice(i, 1);
                    }
                }
                if (remaining.length === before) break;
            }

            for (const part of sorted) {
                const partObj = createdParts[part.partKey];
                if (!partObj) continue;
                const saved = savedPositions[part.partKey];
                if (!saved) continue;

                if (!part.parentPartKey || !createdParts[part.parentPartKey]) {
                    partObj.x = saved.x;
                    partObj.y = saved.y;
                } else {
                    const parentObj = createdParts[part.parentPartKey];
                    const anchorX = partObj.pinAnchorX ?? 0.5;
                    const anchorY = partObj.pinAnchorY ?? 0.5;
                    const parentAnchorWorldX = parentObj.x + parentObj.width * anchorX;
                    const parentAnchorWorldY = parentObj.y + parentObj.height * anchorY;
                    const pivotX = partObj.pivotX ?? 0.5;
                    const pivotY = partObj.pivotY ?? 0.5;
                    partObj.pinOffsetX = saved.x - parentAnchorWorldX + partObj.width * pivotX;
                    partObj.pinOffsetY = saved.y - parentAnchorWorldY + partObj.height * pivotY;
                    partObj.x = saved.x;
                    partObj.y = saved.y;
                }
            }

            if (this.objects._resolvePins) this.objects._resolvePins();
        }

        if (preset.key === 'guided-motion-front') {
            this._bsApplyGuidedMotionFlex(createdParts);
            this._bsApplyGuidedMotionLayerOrder(createdParts);
        }

        // Hide original
        obj.opacity = 0;
        obj.visible = false;

        this._exitBodyStencil();
        this.objects.updateObjectList();
        eventBus.emit('history:push');

        // Show done step
        panel.querySelector('#bs-step-adjust')?.classList.add('hidden');
        const doneStep = panel.querySelector('#bs-step-done');
        doneStep?.classList.remove('hidden');
        const ind = panel.querySelector('#bs-step-indicator');
        if (ind) ind.textContent = 'Step 3/3';
        const doneMsg = panel.querySelector('#bs-done-msg');
        if (doneMsg) doneMsg.textContent = `Cut ${Object.keys(createdParts).length} parts and assembled ${assembledCountFinal} joints from "${preset.name}"${bsAssemblyMode === 'reposition' ? ' (T-Pose)' : ''}.`;
        this._renderCutReview(panel, '#bs-cut-review', this._buildCutReview(createdParts, preset, {
            title: 'Body Stencil Cut Review',
            sourceObj: obj,
            regions
        }), createdParts);

        panel.querySelector('#bs-btn-movements')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showMovementPicker();
        });
        panel.querySelector('#bs-btn-poses')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showPoseLibrary();
        });

        // Contour toggle (same pattern as pose armature assembly)
        const assembledObjects = Object.values(createdParts);
        const contourTargets = this._getAssemblyContourTargets(assembledObjects);
        this._updateBsContourButton(panel, contourTargets);
        const contourBtn = panel.querySelector('#bs-btn-contours');
        if (contourBtn) contourBtn.onclick = () => {
            const enableContours = !contourTargets.every(obj => !!obj.pinContour);
            this._applyAssemblyContours(contourTargets, enableContours);
            this._updateBsContourButton(panel, contourTargets);
            Utils.showToast(`${enableContours ? 'Enabled' : 'Hidden'} joint contours on ${contourTargets.length} part${contourTargets.length === 1 ? '' : 's'}`, 'success');
        };

        // Tune Joints button
        panel.querySelector('#bs-btn-tune')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.enterJointTuneMode();
        });

        // Skeleton toggle
        const skelBtn = panel.querySelector('#bs-btn-skeleton');
        if (skelBtn) {
            const updateSkelBtn = () => {
                const on = !!this._skeletonVisible;
                skelBtn.innerHTML = `<i class="fas fa-bone"></i> Skeleton ${on ? 'On' : 'Off'}`;
                skelBtn.classList.toggle('ja-btn-blue', on);
            };
            updateSkelBtn();
            skelBtn.onclick = () => { this.toggleSkeleton(); updateSkelBtn(); };
        }

        const doneKeyHandler = this._setCuttingCompletionHandler(panel);

        if (!this._skeletonVisible) this.toggleSkeleton();

        Utils.showToast(`Body Stencil complete — ${Object.keys(createdParts).length} parts, ${assembledCountFinal} joints${bsAssemblyMode === 'reposition' ? ', T-Pose' : ''}`, 'success');
    },

    _bsApplyGuidedMotionFlex(createdParts) {
        const definitions = {
            'head-neck': { position: 0.72, spread: 0.20, label: 'Neck' },
            'l-arm': { position: 0.46, spread: 0.28, label: 'Left Elbow' },
            'r-arm': { position: 0.46, spread: 0.28, label: 'Right Elbow' },
            'l-leg': { position: 0.47, spread: 0.30, label: 'Left Knee' },
            'r-leg': { position: 0.47, spread: 0.30, label: 'Right Knee' }
        };
        Object.entries(createdParts || {}).forEach(([partKey, obj]) => {
            if (!obj) return;
            obj.guidedMotionRig = true;
            obj.guidedMotionRole = partKey;
            const definition = definitions[partKey];
            if (!definition) return;
            obj.flexEnabled = true;
            obj.flexDirection = 'vertical';
            obj.flexPreserveTexture = true;
            obj.flexPins = [{
                id: `guided-flex-${partKey}`,
                name: definition.label,
                position: definition.position,
                angle: 0,
                spread: definition.spread
            }];
        });
    },

    _bsApplyGuidedMotionLayerOrder(createdParts) {
        const stageObjects = this.objects?.objects;
        if (!Array.isArray(stageObjects)) return;
        const orderedRoles = ['r-leg', 'l-leg', 'torso', 'r-arm', 'l-arm', 'head-neck'];
        const rigObjects = new Set(Object.values(createdParts || {}).filter(Boolean));
        if (!rigObjects.size) return;
        const firstRigIndex = stageObjects.findIndex(obj => rigObjects.has(obj));
        const remaining = stageObjects.filter(obj => !rigObjects.has(obj));
        const ordered = orderedRoles.map(role => createdParts?.[role]).filter(Boolean);
        remaining.splice(Math.max(0, firstRigIndex), 0, ...ordered);
        stageObjects.splice(0, stageObjects.length, ...remaining);
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  Pose Armature assembly path for Body Stencil
    // ═══════════════════════════════════════════════════════════════════════

    _bsAssembleAsPoseArmature(createdParts, preset, panel, sourceObj) {
        const isSide = preset.key === 'human-side';

        // ── Role grouping: merge fine-grained stencil parts into armature roles ──
        const roleGroups = isSide ? {
            'torso':     ['torso'],
            'head-neck': ['head'],
            'front-arm': ['upper-arm', 'forearm', 'hand'],
            'front-leg': ['upper-leg', 'lower-leg', 'foot']
        } : {
            'torso':     ['torso'],
            'head-neck': ['head', 'neck'],
            'right-arm': ['r-upper-arm', 'r-forearm', 'r-hand'],
            'left-arm':  ['l-upper-arm', 'l-forearm', 'l-hand'],
            'right-leg': ['r-upper-leg', 'r-lower-leg', 'r-foot'],
            'left-leg':  ['l-upper-leg', 'l-lower-leg', 'l-foot']
        };

        const nameMap = isSide ? {
            'torso': 'Torso', 'head-neck': 'Head Neck',
            'front-arm': 'Front Arm', 'front-leg': 'Front Leg'
        } : {
            'torso': 'Torso', 'head-neck': 'Head Neck',
            'right-arm': 'Right Arm', 'left-arm': 'Left Arm',
            'right-leg': 'Right Leg', 'left-leg': 'Left Leg'
        };

        // ── Merge sub-parts into composite images ──
        const mergedParts = {};
        for (const [roleKey, partKeys] of Object.entries(roleGroups)) {
            const subParts = partKeys.map(k => createdParts[k]).filter(Boolean);
            if (!subParts.length) continue;

            if (subParts.length === 1) {
                mergedParts[roleKey] = subParts[0];
            } else {
                const merged = this._mergePartsIntoComposite(subParts, roleKey);
                if (merged) {
                    mergedParts[roleKey] = merged;
                    for (const sp of subParts) {
                        this.objects.removeObject(sp.id);
                    }
                }
            }
        }

        const torso = mergedParts['torso'];
        if (!torso) {
            Utils.showToast('Torso part not found — cannot assemble as Pose Armature', 'warning');
            return;
        }

        // ── Name + tag parts ──
        Object.entries(mergedParts).forEach(([roleKey, obj]) => {
            if (nameMap[roleKey]) obj.name = nameMap[roleKey];
            obj._armatureRoleKey = roleKey;
            obj._armaturePartKey = roleKey;
        });

        // ── Apply armature joint chains ──
        Object.entries(mergedParts).forEach(([roleKey, obj]) => {
            const canvas = this._getObjectCanvas(obj);
            const customSpecs = canvas
                ? this._bslComputeImageJointCrossOffsets(canvas, roleKey)
                : null;
            const opts = { allowTorso: true };
            if (customSpecs?.length) opts.customSpecs = customSpecs;
            this._applyArmatureJointChainToObject(obj, roleKey, opts);
        });

        // ── Set pivots ──
        if (torso) { torso.pivotX = 0.5; torso.pivotY = 0.3; }
        const headNeck = mergedParts['head-neck'];
        if (headNeck) { headNeck.pivotX = 0.5; headNeck.pivotY = 1.0; }

        if (isSide) {
            const fArm = mergedParts['front-arm'];
            const fLeg = mergedParts['front-leg'];
            if (fArm) { fArm.pivotX = 0.5; fArm.pivotY = 0.08; }
            if (fLeg) { fLeg.pivotX = 0.5; fLeg.pivotY = 0.0; }
        } else {
            const rArm = mergedParts['right-arm'];
            const lArm = mergedParts['left-arm'];
            const rLeg = mergedParts['right-leg'];
            const lLeg = mergedParts['left-leg'];
            if (rArm) { rArm.pivotX = 0.68; rArm.pivotY = 0.10; }
            if (lArm) { lArm.pivotX = 0.32; lArm.pivotY = 0.10; }
            if (rLeg) { rLeg.pivotX = 0.5; rLeg.pivotY = 0.0; }
            if (lLeg) { lLeg.pivotX = 0.5; lLeg.pivotY = 0.0; }
        }

        // ── Pin children to torso ──
        if (isSide) {
            if (headNeck) this._configureDummyArmaturePin(headNeck, torso, 0.40, 0.00, 'inherit');
            const fArm = mergedParts['front-arm'];
            const fLeg = mergedParts['front-leg'];
            if (fArm) this._configureDummyArmaturePin(fArm, torso, 0.50, 0.08, 'inherit');
            if (fLeg) this._configureDummyArmaturePin(fLeg, torso, 0.50, 1.00, 'inherit');
        } else {
            if (headNeck) this._configureDummyArmaturePin(headNeck, torso, 0.50, 0.06, 'inherit');
            const rArm = mergedParts['right-arm'];
            const lArm = mergedParts['left-arm'];
            const rLeg = mergedParts['right-leg'];
            const lLeg = mergedParts['left-leg'];
            if (rArm) this._configureDummyArmaturePin(rArm, torso, 0.08, 0.22, 'inherit');
            if (lArm) this._configureDummyArmaturePin(lArm, torso, 0.92, 0.22, 'inherit');
            if (rLeg) this._configureDummyArmaturePin(rLeg, torso, 0.36, 0.84, 'inherit');
            if (lLeg) this._configureDummyArmaturePin(lLeg, torso, 0.64, 0.84, 'inherit');
        }

        torso._armatureFrontBackFacing = 'front';

        // ── Resolve pins ──
        if (this.objects._resolvePins) this.objects._resolvePins();

        // ── Select all parts ──
        const allIds = Object.values(mergedParts).map(o => o.id);
        this.objects.select(allIds);

        // ── Hide source image ──
        sourceObj.opacity = 0;
        sourceObj.visible = false;

        // ── Clean up stencil ──
        this._exitBodyStencil();
        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');

        if (!this._skeletonVisible) this.toggleSkeleton();

        const partCount = Object.keys(mergedParts).length;
        const origPartCount = Object.keys(createdParts).length;
        Utils.showToast(`Body Stencil complete — ${partCount} parts assembled with Pose Armature joint system`, 'success');

        // ── Show done step with armature panel button ──
        panel.querySelector('#bs-step-adjust')?.classList.add('hidden');
        const doneStep = panel.querySelector('#bs-step-done');
        doneStep?.classList.remove('hidden');
        const ind = panel.querySelector('#bs-step-indicator');
        if (ind) ind.textContent = 'Step 3/3';
        const doneMsg = panel.querySelector('#bs-done-msg');
        if (doneMsg) doneMsg.textContent = `Merged ${origPartCount} parts into ${partCount} armature roles using Pose Armature joint system.`;
        this._renderCutReview(panel, '#bs-cut-review', this._buildCutReview(createdParts, preset, {
            title: 'Body Stencil Cut Review',
            sourceObj
        }), createdParts);

        // Show armature panel button
        const armaturePanelBtn = panel.querySelector('#bs-btn-armature-panel');
        if (armaturePanelBtn) armaturePanelBtn.classList.remove('hidden');

        const doneKeyHandler = this._setCuttingCompletionHandler(panel);

        panel.querySelector('#bs-btn-movements')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showMovementPicker();
        });
        panel.querySelector('#bs-btn-poses')?.addEventListener('click', () => {
            document.removeEventListener('keydown', doneKeyHandler);
            panel.remove();
            this.showPoseLibrary();
        });
        if (armaturePanelBtn) {
            armaturePanelBtn.addEventListener('click', () => {
                document.removeEventListener('keydown', doneKeyHandler);
                panel.remove();
                this.openArmaturePanel();
            });
        }
    },

    /**
     * Merge multiple StageObjects into a single composite image object.
     */
    _mergePartsIntoComposite(subParts, roleKey) {
        if (!subParts?.length) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of subParts) {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x + p.width);
            maxY = Math.max(maxY, p.y + p.height);
        }

        const compositeW = Math.round(maxX - minX);
        const compositeH = Math.round(maxY - minY);
        if (compositeW < 1 || compositeH < 1) return null;

        const canvas = document.createElement('canvas');
        canvas.width = compositeW;
        canvas.height = compositeH;
        const ctx = canvas.getContext('2d');

        for (const p of subParts) {
            const img = p._tempTrimmedCanvas || p.imageElement || p._eraserCanvas;
            if (!img) continue;
            const dx = Math.round(p.x - minX);
            const dy = Math.round(p.y - minY);
            ctx.drawImage(img, 0, 0, img.naturalWidth || img.width, img.naturalHeight || img.height,
                          dx, dy, Math.round(p.width), Math.round(p.height));
        }

        const dataUrl = canvas.toDataURL('image/png');
        const newObj = new StageObject('image', {
            x: Math.round(minX),
            y: Math.round(minY),
            width: compositeW,
            height: compositeH,
            imageSrc: dataUrl,
            name: roleKey,
            layer: subParts[0].layer,
            opacity: subParts[0].opacity
        });
        this.objects.addObject(newObj);
        newObj._tempTrimmedCanvas = canvas;
        return newObj;
    },

    /**
     * Get a drawable canvas from a StageObject for joint cross-offset computation.
     */
    _getObjectCanvas(obj) {
        if (!obj || obj.type !== 'image') return null;
        const img = obj._tempTrimmedCanvas || obj.imageElement || obj._eraserCanvas;
        if (!img) return null;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return null;
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        canvas.getContext('2d').drawImage(img, 0, 0, w, h);
        return canvas;
    },

    _updateBsContourButton(panel, targetObjects) {
        const btn = panel?.querySelector('#bs-btn-contours');
        if (!btn) return;
        const contourTargets = this._getAssemblyContourTargets(targetObjects);
        if (!contourTargets.length) {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-circle-dot"></i> Contours';
            btn.title = 'No assembled child joints available for contours';
            btn.classList.remove('ja-btn-blue');
            return;
        }
        const enabled = contourTargets.every(obj => !!obj.pinContour);
        btn.disabled = false;
        btn.innerHTML = `<i class="fas fa-circle-dot"></i> Contours ${enabled ? 'On' : 'Off'}`;
        btn.title = enabled ? 'Hide contour discs at assembled joints' : 'Show contour discs at assembled joints';
        btn.classList.toggle('ja-btn-blue', enabled);
    },



});
