/**
 * Joint System — Assembly Panel & joint tuning UI
 * (split from joint-system.js for maintainability)
 */

Object.assign(JointSystem.prototype, {

    _getStoredAssemblyTraining(presetKey) {
        try {
            const raw = localStorage.getItem('jointTraining_' + presetKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? parsed : null;
        } catch (error) {
            console.warn(`[JointAssembly] Failed to parse training data for ${presetKey}`, error);
            return null;
        }
    },

    showAssemblyPanel() {
        document.getElementById('joint-assembly-panel')?.remove();

        const panel = document.createElement('div');
        panel.id = 'joint-assembly-panel';
        panel.className = 'joint-assembly-panel';

        const presets = JointPresets.getAll();
        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-bone"></i> Joint Assembly
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body">
                <div class="ja-step ja-step-preset" id="ja-step-preset">
                    <div class="ja-step-label">1. Choose Character Template</div>
                    <div class="ja-preset-grid">
                        ${presets.map(p => {
                            const hasTraining = !!localStorage.getItem('jointTraining_' + p.key);
                            return `
                            <div class="ja-preset-card" data-preset="${p.key}" title="${p.description}">
                                <i class="fas ${p.icon}"></i>
                                <span>${p.name}</span>
                                <span class="ja-preset-count">${p.parts.length} parts${hasTraining ? ' ★' : ''}</span>
                            </div>`;
                        }).join('')}
                    </div>
                    <div class="ja-train-section" style="margin-top:10px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.1);">
                        <div class="ja-hint" style="margin-bottom:6px;">
                            <i class="fas fa-graduation-cap"></i> <strong>Train from Stage:</strong> Arrange named body parts on stage, pick a template, and capture their positions to improve future assemblies.
                        </div>
                        <div style="display:flex; gap:6px; flex-wrap:wrap;">
                            ${presets.map(p => `
                                <button class="btn-small ja-btn-train" data-train-preset="${p.key}" title="Capture stage arrangement for ${p.name}">
                                    <i class="fas fa-camera"></i> ${p.name}
                                </button>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div class="ja-step ja-step-assign hidden" id="ja-step-assign">
                    <div class="ja-step-label">2. Assign Objects to Body Parts
                        <span class="ja-assign-counter" id="ja-assign-counter"></span>
                    </div>
                    <div class="ja-hint">Assign stage objects to body-part slots below. The system will auto-pin them with correct anchors, pivots, and rotation constraints.</div>
                    <div class="ja-suboptions">
                        <label class="ja-inline-check" for="ja-use-contours">
                            <input type="checkbox" id="ja-use-contours" ${this._assemblyUseContours !== false ? 'checked' : ''}>
                            <span>Add joint contours after assembly</span>
                        </label>
                    </div>
                    <div id="ja-parts-list" class="ja-parts-list"></div>
                    <div class="ja-actions">
                        <button id="ja-btn-back" class="btn-small"><i class="fas fa-arrow-left"></i> Back</button>
                        <button id="ja-btn-refresh-names" class="btn-small" title="Reload object names from stage"><i class="fas fa-rotate"></i> Refresh Names</button>
                        <button id="ja-btn-auto" class="btn-small" title="Auto-detect objects by name match"><i class="fas fa-hat-wizard"></i> Auto-Detect</button>
                        <button id="ja-btn-clear-all" class="btn-small" title="Clear all assignments"><i class="fas fa-eraser"></i> Clear</button>
                        <button id="ja-btn-assemble" class="btn-small ja-btn-green"><i class="fas fa-magic"></i> Assemble</button>
                    </div>
                    <div class="ja-hint" style="margin-top:8px;">View Controls</div>
                    <div class="ja-actions">
                        <button id="ja-btn-skeleton-toggle-assign" class="btn-small"><i class="fas fa-bone"></i> Skeleton</button>
                        <button id="ja-btn-skeleton-labels-toggle-assign" class="btn-small"><i class="fas fa-font"></i> Labels</button>
                        <button id="ja-btn-rotate-handles-toggle-assign" class="btn-small"><i class="fas fa-rotate"></i> Rotate Handles</button>
                        <button id="ja-btn-clean-view-assign" class="btn-small"><i class="fas fa-eye-slash"></i> Clean View</button>
                        <button id="ja-btn-show-all-assign" class="btn-small"><i class="fas fa-eye"></i> Show All</button>
                    </div>
                </div>
                <div class="ja-step ja-step-done hidden" id="ja-step-done">
                    <div class="ja-step-label"><i class="fas fa-check-circle" style="color:#22c55e"></i> Assembled!</div>
                    <div class="ja-hint">All parts are pinned. Choose an action below, or hold <kbd>Shift</kbd>+drag a body part on stage for IK posing.</div>
                    <div class="ja-actions">
                        <button id="ja-btn-movements" class="btn-small ja-btn-green"><i class="fas fa-play"></i> Movements</button>
                        <button id="ja-btn-poses" class="btn-small ja-btn-amber"><i class="fas fa-bookmark"></i> Poses</button>
                        <button id="ja-btn-tune" class="btn-small ja-btn-blue"><i class="fas fa-crosshairs"></i> Tune Joints</button>
                        <button id="ja-btn-contours" class="btn-small"><i class="fas fa-circle-dot"></i> Contours</button>
                        <button id="ja-btn-skeleton-toggle" class="btn-small"><i class="fas fa-bone"></i> Skeleton</button>
                        <button id="ja-btn-skeleton-labels-toggle" class="btn-small"><i class="fas fa-font"></i> Labels</button>
                        <button id="ja-btn-rotate-handles-toggle" class="btn-small"><i class="fas fa-rotate"></i> Rotate Handles</button>
                        <button id="ja-btn-clean-view" class="btn-small"><i class="fas fa-eye-slash"></i> Clean View</button>
                        <button id="ja-btn-show-all" class="btn-small"><i class="fas fa-eye"></i> Show All</button>
                        <button id="ja-btn-reassemble" class="btn-small"><i class="fas fa-redo"></i> Re-assign</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        Utils.makePanelResizable(panel);
        this._bindAssemblyEvents(panel);
    },

    _shouldFloatAnimationPanel(panel) {
        if (!panel) return false;
        return panel.dataset.floatPanel === 'true'
            || ['joint-movement-picker', 'joint-pose-panel', 'joint-contact-target-panel', 'manual-body-assembly-panel'].includes(panel.id);
    },

    _getFloatingPanelSafeTop() {
        return window.innerWidth <= 768 ? 12 : 72;
    },

    _clampFloatingPanel(panel) {
        if (!panel || panel.dataset.docked === 'true') return;
        const rect = panel.getBoundingClientRect();
        const margin = 12;
        const safeTop = this._getFloatingPanelSafeTop();
        const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
        const maxTop = Math.max(safeTop, window.innerHeight - Math.min(rect.height, window.innerHeight - safeTop - margin) - margin);
        const needsExplicitPosition = panel.style.transform || rect.top < safeTop || rect.bottom > window.innerHeight - margin || rect.left < margin || rect.right > window.innerWidth - margin;
        if (!needsExplicitPosition) return;
        panel.style.transform = 'none';
        panel.style.right = 'auto';
        panel.style.bottom = 'auto';
        panel.style.left = Math.min(Math.max(rect.left, margin), maxLeft) + 'px';
        panel.style.top = Math.min(Math.max(rect.top, safeTop), maxTop) + 'px';
    },

    _makeDraggable(panel, { preservePlacement = false } = {}) {
        if (typeof Utils !== 'undefined' && Utils.ensureFloatingPanelControls) {
            Utils.ensureFloatingPanelControls(panel);
        }
        const floatPanel = preservePlacement
            ? panel.dataset.docked !== 'true'
            : this._shouldFloatAnimationPanel(panel);
        if (!floatPanel) {
            // Auto-dock setup panels into the right panel instead of floating over the stage.
            Utils.dockPanel(panel);
        } else {
            panel.dataset.docked = 'false';
            requestAnimationFrame(() => {
                if (typeof Utils !== 'undefined' && Utils.clampFloatingPanel) {
                    Utils.clampFloatingPanel(panel);
                } else {
                    this._clampFloatingPanel(panel);
                }
            });
        }

        const header = panel.querySelector('[data-draggable]');
        if (!header) return;
        header.dataset.floatingPanelDragBound = 'true';
        let dragging = false, offsetX = 0, offsetY = 0;
        header.style.cursor = 'grab';

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            if (panel.classList.contains('floating-panel-maximized')) return;
            if (panel.dataset.docked === 'true') {
                // Undock panel on drag start, then begin dragging
                Utils.undockPanel(panel);
            }
            dragging = true;
            header.style.cursor = 'grabbing';
            // Switch from centered transform to explicit top/left
            const rect = panel.getBoundingClientRect();
            const safeTop = typeof Utils !== 'undefined' && Utils.getFloatingPanelSafeTop
                ? Utils.getFloatingPanelSafeTop()
                : this._getFloatingPanelSafeTop();
            panel.style.transform = 'none';
            panel.style.left = rect.left + 'px';
            panel.style.top = Math.max(safeTop, rect.top) + 'px';
            panel.style.right = 'auto';
            panel.style.bottom = 'auto';
            offsetX = e.clientX - rect.left;
            offsetY = e.clientY - Math.max(safeTop, rect.top);
            e.preventDefault();
        });

        window.addEventListener('mousemove', (e) => {
            if (!dragging) return;
            const rect = panel.getBoundingClientRect();
            const margin = 8;
            const safeTop = typeof Utils !== 'undefined' && Utils.getFloatingPanelSafeTop
                ? Utils.getFloatingPanelSafeTop()
                : this._getFloatingPanelSafeTop();
            const maxLeft = Math.max(margin, window.innerWidth - rect.width - margin);
            const maxTop = Math.max(safeTop, window.innerHeight - rect.height - margin);
            panel.style.left = Math.min(Math.max(margin, e.clientX - offsetX), maxLeft) + 'px';
            panel.style.top = Math.min(Math.max(safeTop, e.clientY - offsetY), maxTop) + 'px';
        });

        window.addEventListener('mouseup', () => {
            if (dragging) {
                dragging = false;
                header.style.cursor = 'grab';
            }
        });
    },

    _bindAssemblyEvents(panel) {
        // Close
        panel.querySelector('.ja-close').addEventListener('click', () => {
            this._stopPreview();
            panel.remove();
        });

        // Preset selection
        panel.querySelectorAll('.ja-preset-card').forEach(card => {
            card.addEventListener('click', () => {
                const key = card.dataset.preset;
                const presets = JointPresets.getAll();
                this._activePreset = presets.find(p => p.key === key);
                this._assemblyMap = {};
                this._showAssignStep(panel);
            });
        });

        // Train from Stage buttons
        panel.querySelectorAll('.ja-btn-train').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.trainPreset;
                const presets = JointPresets.getAll();
                const preset = presets.find(p => p.key === key);
                if (preset) this._captureTrainingFromStage(preset, panel);
            });
        });
    },

    _showAssignStep(panel) {
        panel.querySelector('#ja-step-preset').classList.add('hidden');
        panel.querySelector('#ja-step-assign').classList.remove('hidden');
        panel.querySelector('#ja-step-done').classList.add('hidden');
        this._renderPartsList(panel);
        this._updateAssignCounter(panel);

        const contourToggle = panel.querySelector('#ja-use-contours');
        if (contourToggle) {
            contourToggle.checked = this._assemblyUseContours !== false;
            contourToggle.onchange = (e) => {
                this._assemblyUseContours = !!e.target.checked;
            };
        }

        // Back button
        panel.querySelector('#ja-btn-back').onclick = () => {
            panel.querySelector('#ja-step-preset').classList.remove('hidden');
            panel.querySelector('#ja-step-assign').classList.add('hidden');
            this._activePreset = null;
        };

        // Assemble button
        panel.querySelector('#ja-btn-assemble').onclick = () => {
            this._assembleCharacter(panel);
        };

        // Auto-detect button
        const autoBtn = panel.querySelector('#ja-btn-auto');
        if (autoBtn) autoBtn.onclick = () => {
            this._autoDetectAssignments(panel);
        };

        // Refresh names button
        const refreshBtn = panel.querySelector('#ja-btn-refresh-names');
        if (refreshBtn) refreshBtn.onclick = () => {
            this._renderPartsList(panel);
            this._updateAssignCounter(panel);
            Utils.showToast('Object names refreshed from stage', 'success');
        };

        // Clear all button
        const clearBtn = panel.querySelector('#ja-btn-clear-all');
        if (clearBtn) clearBtn.onclick = () => {
            this._assemblyMap = {};
            this._renderPartsList(panel);
            this._updateAssignCounter(panel);
        };
    },

    _renderPartsList(panel) {
        const list = panel.querySelector('#ja-parts-list');
        const stageObjects = this.objects.objects || [];
        const preset = this._activePreset;
        if (!preset) return;

        // Build depth map for hierarchy indentation
        const depthMap = {};
        const partLookup = {};
        preset.parts.forEach(p => { partLookup[p.partKey] = p; });
        const getDepth = (p) => {
            if (depthMap[p.partKey] !== undefined) return depthMap[p.partKey];
            if (!p.parentPartKey || !partLookup[p.parentPartKey]) { depthMap[p.partKey] = 0; return 0; }
            depthMap[p.partKey] = getDepth(partLookup[p.parentPartKey]) + 1;
            return depthMap[p.partKey];
        };
        preset.parts.forEach(p => getDepth(p));

        // Build part rows — topological order (parents before children)
        const ordered = this._topologicalSort(preset.parts);

        list.innerHTML = ordered.map(part => {
            const assigned = this._assemblyMap[part.partKey] || '';
            const depth = depthMap[part.partKey] || 0;
            const indent = depth * 20;
            const isAssigned = !!assigned;
            return `
                <div class="ja-part-row ${isAssigned ? 'ja-part-assigned' : ''}" data-part="${part.partKey}" style="padding-left:${8 + indent}px">
                    <div class="ja-part-info">
                        ${depth > 0 ? '<span class="ja-tree-line">└</span>' : ''}
                        <i class="fas ${part.icon}"></i>
                        <div>
                            <div class="ja-part-name">${part.name} ${isAssigned ? '<i class="fas fa-check-circle ja-assigned-check"></i>' : ''}</div>
                            <div class="ja-part-hint">${part.description}</div>
                            <div class="ja-part-constraint">
                                <i class="fas fa-sync-alt"></i> -180° to 180°
                                ${part.parentPartKey ? ` · <i class="fas fa-link"></i> ${partLookup[part.parentPartKey]?.name || part.parentPartKey}` : ' · <i class="fas fa-anchor"></i> Root'}
                            </div>
                        </div>
                    </div>
                    <select class="ja-part-select" data-part="${part.partKey}">
                        <option value="">— select object —</option>
                        ${stageObjects.map(o => `<option value="${o.id}" ${o.id === assigned ? 'selected' : ''}>${o.name || o.type + '-' + o.id.slice(-4)}</option>`).join('')}
                    </select>
                </div>
            `;
        }).join('');

        // Bind select changes
        list.querySelectorAll('.ja-part-select').forEach(sel => {
            sel.addEventListener('change', (e) => {
                const partKey = sel.dataset.part;
                const objId = e.target.value;
                if (objId) {
                    // Prevent same object used for multiple parts
                    Object.keys(this._assemblyMap).forEach(k => {
                        if (this._assemblyMap[k] === objId && k !== partKey) {
                            this._assemblyMap[k] = '';
                        }
                    });
                    this._assemblyMap[partKey] = objId;
                } else {
                    delete this._assemblyMap[partKey];
                }
                // Re-render to update visual state
                this._renderPartsList(panel);
                this._updateAssignCounter(panel);
            });
        });
    },

    _updateAssignCounter(panel) {
        const counter = panel.querySelector('#ja-assign-counter');
        if (!counter || !this._activePreset) return;
        const total = this._activePreset.parts.length;
        const assigned = Object.keys(this._assemblyMap).filter(k => this._assemblyMap[k]).length;
        counter.textContent = `(${assigned}/${total})`;
        counter.className = 'ja-assign-counter' + (assigned === total ? ' ja-counter-complete' : '');
    },

    _autoDetectAssignments(panel) {
        if (!this._activePreset) return;
        const stageObjects = this.objects.objects || [];
        const usedIds = new Set(Object.values(this._assemblyMap).filter(Boolean));
        let matched = 0;

        this._activePreset.parts.forEach(part => {
            if (this._assemblyMap[part.partKey]) return; // Already assigned

            // Find best matching unassigned stage object using shared scoring
            let bestObj = null;
            let bestScore = 0;

            stageObjects.forEach(obj => {
                if (usedIds.has(obj.id)) return;
                const objName = (obj.name || '').toLowerCase().trim();
                if (!objName) return;

                const score = this._scorePartMatch(objName, part)
                    + this._scorePartSideByPosition(obj, part, stageObjects);
                if (score > bestScore) {
                    bestScore = score;
                    bestObj = obj;
                }
            });

            if (bestObj && bestScore >= 20) {
                this._assemblyMap[part.partKey] = bestObj.id;
                usedIds.add(bestObj.id);
                matched++;
            }
        });

        this._renderPartsList(panel);
        this._updateAssignCounter(panel);

        if (matched > 0) {
            Utils.showToast(`Auto-detected ${matched} part${matched > 1 ? 's' : ''} by name`, 'success');
        } else {
            Utils.showToast('No matches found — name your objects to match part names (e.g. "torso", "head")', 'info');
        }
    },

    // ═══════════════════════════════════════════════
    //  TRAIN FROM STAGE — capture arrangement to improve assembly
    // ═══════════════════════════════════════════════

    /**
     * Capture current stage arrangement and derive joint parameters.
     * User places named body parts on stage in correct positions,
     * then this method extracts anchor/pivot values from spatial relationships.
     */
    _captureTrainingFromStage(preset, panel) {
        const stageObjects = this.objects.objects || [];
        if (stageObjects.length < 2) {
            Utils.showToast('Place at least 2 named body parts on the stage first', 'warning');
            return;
        }

        // Match stage objects to preset parts by fuzzy name matching
        const matched = this._matchStageToParts(stageObjects, preset.parts);
        const matchedCount = Object.keys(matched).length;

        if (matchedCount < 2) {
            const exampleNames = preset.parts.slice(0, 4).map(p => `"${p.name}"`).join(', ');
            Utils.showToast(`Could not match enough parts. Name your objects like: ${exampleNames}`, 'warning');
            return;
        }

        // Build training data
        const training = { presetKey: preset.key, capturedAt: Date.now(), parts: {} };

        // Compute overall bounding box for normalization reference
        const allObjs = Object.values(matched);
        let bboxMinX = Infinity, bboxMinY = Infinity, bboxMaxX = -Infinity, bboxMaxY = -Infinity;
        allObjs.forEach(obj => {
            bboxMinX = Math.min(bboxMinX, obj.x);
            bboxMinY = Math.min(bboxMinY, obj.y);
            bboxMaxX = Math.max(bboxMaxX, obj.x + obj.width);
            bboxMaxY = Math.max(bboxMaxY, obj.y + obj.height);
        });
        training.bbox = { x: bboxMinX, y: bboxMinY, width: bboxMaxX - bboxMinX, height: bboxMaxY - bboxMinY };

        // For each matched part, derive joint parameters from spatial positions
        preset.parts.forEach(part => {
            const obj = matched[part.partKey];
            if (!obj) return;

            const entry = {
                x: obj.x, y: obj.y, width: obj.width, height: obj.height,
                rotation: obj.rotation || 0
            };

            if (part.parentPartKey && matched[part.parentPartKey]) {
                const parentObj = matched[part.parentPartKey];
                const derived = this._deriveJointParams(parentObj, obj);
                entry.anchorOnParent = derived.anchorOnParent;
                entry.pivotOnSelf = derived.pivotOnSelf;
            }

            training.parts[part.partKey] = entry;
        });

        // Save to localStorage
        localStorage.setItem('jointTraining_' + preset.key, JSON.stringify(training));

        // Update preset card to show training star
        if (panel) {
            const card = panel.querySelector(`.ja-preset-card[data-preset="${preset.key}"]`);
            if (card) {
                const countEl = card.querySelector('.ja-preset-count');
                if (countEl && !countEl.textContent.includes('★')) {
                    countEl.textContent = countEl.textContent + ' ★';
                }
            }
        }

        Utils.showToast(
            `Trained "${preset.name}" from ${matchedCount}/${preset.parts.length} parts on stage. Future assemblies will use these positions.`,
            'success'
        );
    },

    /**
     * Fuzzy-match stage objects to preset part definitions.
     * Returns { partKey → stageObject } map.
     */
    _matchStageToParts(objects, parts) {
        // Score every object against every part
        const scores = [];

        for (const obj of objects) {
            const objName = (obj.name || '').toLowerCase().trim();
            if (!objName) continue;

            for (const part of parts) {
                const score = this._scorePartMatch(objName, part)
                    + this._scorePartSideByPosition(obj, part, objects);
                if (score > 0) scores.push({ obj, part, score });
            }
        }

        // Greedy best-first assignment: each object and part used at most once
        scores.sort((a, b) => b.score - a.score);
        const matched = {};
        const usedObjIds = new Set();

        for (const { obj, part, score } of scores) {
            if (matched[part.partKey] || usedObjIds.has(obj.id)) continue;
            matched[part.partKey] = obj;
            usedObjIds.add(obj.id);
        }

        return matched;
    },

    _detectPartSide(part) {
        const key = String(part?.partKey || '').toLowerCase();
        const name = String(part?.name || '').toLowerCase();
        if (/\bleft\b/.test(name) || /(^|-)l($|-)/.test(key)) return 'left';
        if (/\bright\b/.test(name) || /(^|-)r($|-)/.test(key)) return 'right';
        return null;
    },

    _scorePartSideByPosition(obj, part, objects) {
        const side = this._detectPartSide(part);
        if (!side || !obj || !Array.isArray(objects) || objects.length < 2) return 0;

        const presetKey = String(this._selectedPreset?.key || '').toLowerCase();
        const isFrontFacingPreset = presetKey.includes('front');

        let minX = Infinity;
        let maxX = -Infinity;
        objects.forEach(o => {
            const left = Number(o?.x) || 0;
            const right = left + (Number(o?.width) || 0);
            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
        });

        const span = Math.max(1, maxX - minX);
        const centerX = (minX + maxX) / 2;
        const objCenterX = (Number(obj.x) || 0) + ((Number(obj.width) || 0) / 2);
        const nearCenter = Math.abs(objCenterX - centerX) < (span * 0.06);
        if (nearCenter) return 0;

        if (side === 'left') {
            return isFrontFacingPreset
                ? (objCenterX > centerX ? 18 : -18)
                : (objCenterX < centerX ? 18 : -18);
        }
        if (side === 'right') {
            return isFrontFacingPreset
                ? (objCenterX < centerX ? 18 : -18)
                : (objCenterX > centerX ? 18 : -18);
        }
        return 0;
    },

    /**
     * Normalize a body-part name: lowercase, expand abbreviations,
     * resolve common aliases to canonical part names.
     * Returns an array of candidate normalized forms.
     */
    _normalizeBodyPartName(raw) {
        let name = (raw || '').toLowerCase().trim();
        if (!name) return [];

        // Abbreviation expansions (order matters — longer first)
        const abbrevs = [
            [/\brt\b/g, 'right'],
            [/\blt\b/g, 'left'],
            [/\br\b/g, 'right'],
            [/\bl\b/g, 'left'],
        ];
        let expanded = name;
        for (const [pat, rep] of abbrevs) {
            expanded = expanded.replace(pat, rep);
        }
        expanded = expanded.replace(/\s+/g, ' ').trim();

        // Produce candidate set: original + expanded
        const candidates = new Set([name, expanded]);

        // Alias table: user term → canonical preset name(s)
        // Each alias maps to what it should match against
        const aliasTable = [
            // Arms — bare "arm" = upper arm
            { match: /^(left|right)\s+arm$/,            canonical: '$1 upper arm' },
            { match: /^(left|right)\s+upper\s*arm$/,    canonical: '$1 upper arm' },
            // Forearm variants
            { match: /^(left|right)\s+fore\s*arm$/,     canonical: '$1 forearm' },
            // Legs — bare "leg" = lower leg
            { match: /^(left|right)\s+leg$/,            canonical: '$1 lower leg' },
            { match: /^(left|right)\s+lower\s*leg$/,    canonical: '$1 lower leg' },
            // Thigh = upper leg
            { match: /^(left|right)\s+thigh$/,          canonical: '$1 upper leg' },
            { match: /^(left|right)\s+upper\s*leg$/,    canonical: '$1 upper leg' },
            // Foot
            { match: /^(left|right)\s+foot$/,           canonical: '$1 foot' },
            // Hand
            { match: /^(left|right)\s+hand$/,           canonical: '$1 hand' },
            // Without side prefix
            { match: /^thigh$/,                         canonical: 'upper leg' },
            { match: /^arm$/,                           canonical: 'upper arm' },
            { match: /^leg$/,                           canonical: 'lower leg' },
            { match: /^shin$/,                          canonical: 'lower leg' },
            { match: /^calf$/,                          canonical: 'lower leg' },
            { match: /^tail\s*fin$/,                   canonical: 'tail' },
            { match: /^tail$/,                          canonical: 'tail' },
            { match: /^beak$/,                          canonical: 'head mouth' },
            { match: /^snout$/,                         canonical: 'head mouth' },
            { match: /^mouth$/,                         canonical: 'head mouth' },
            { match: /^wing$/,                          canonical: 'wing upper' },
            { match: /^wing\s*root$/,                  canonical: 'wing upper' },
            { match: /^wing\s*tip$/,                   canonical: 'wing lower' },
            { match: /^dorsal\s*fin$/,                 canonical: 'dorsal' },
            { match: /^pectoral\s*fin$/,               canonical: 'pectoral' },
            { match: /^brow$/,                          canonical: 'brow' },
            { match: /^eyebrow$/,                       canonical: 'brow' },
            { match: /^eye$/,                           canonical: 'eye' },
            { match: /^finger$/,                        canonical: 'hand' },
            { match: /^fingers$/,                       canonical: 'hand' },
            { match: /^hoof$/,                          canonical: 'foot' },
            { match: /^paw$/,                           canonical: 'foot' },
        ];

        for (const { match, canonical } of aliasTable) {
            const m = expanded.match(match);
            if (m) {
                const resolved = canonical.replace('$1', m[1] || '').trim();
                candidates.add(resolved);
            }
        }

        return [...candidates];
    },

    /**
     * Convert a preset part to all name forms it should respond to.
     */
    _getPartNameForms(part) {
        const forms = new Set();
        const key = part.partKey.toLowerCase().replace(/-/g, ' ');
        const name = part.name.toLowerCase();

        forms.add(key);
        forms.add(name);

        // Expand l/r abbreviations in the key
        const expanded = key
            .replace(/\br\b/, 'right')
            .replace(/\bl\b/, 'left');
        forms.add(expanded);

        // Also add short forms: "right arm" for "right upper arm"
        const shortened = expanded
            .replace('upper arm', 'arm')
            .replace('lower leg', 'leg')
            .replace('upper leg', 'thigh')
            .replace('head mouth', 'head')
            .replace('wing upper', 'wing')
            .replace('wing lower', 'wing tip');
        if (shortened !== expanded) forms.add(shortened);

        if (expanded.includes('hand')) forms.add(expanded.replace('hand', 'fingers'));
        if (expanded.includes('foot')) forms.add(expanded.replace('foot', 'hoof'));
        if (expanded.includes('foot')) forms.add(expanded.replace('foot', 'paw'));
        if (expanded.includes('head mouth')) {
            forms.add(expanded.replace('head mouth', 'beak'));
            forms.add(expanded.replace('head mouth', 'snout'));
            forms.add(expanded.replace('head mouth', 'mouth'));
        }
        if (expanded.includes('tail')) forms.add(expanded.replace('tail', 'tail fin'));
        if (expanded.includes('pectoral')) forms.add(expanded.replace('pectoral', 'pectoral fin'));
        if (expanded.includes('dorsal')) forms.add(expanded.replace('dorsal', 'dorsal fin'));

        return [...forms];
    },

    /**
     * Score how well an object name matches a preset part.
     */
    _scorePartMatch(objName, part) {
        const objForms = this._normalizeBodyPartName(objName);
        const partForms = this._getPartNameForms(part);

        // Exact match against any form combination
        for (const oForm of objForms) {
            for (const pf of partForms) {
                if (oForm === pf) return 100;
            }
        }

        // Containment between any form pair
        for (const oForm of objForms) {
            for (const pf of partForms) {
                if (oForm.includes(pf) || pf.includes(oForm)) return 80;
            }
        }

        // Word overlap scoring using expanded forms
        const objWords = new Set(objForms.flatMap(f => f.split(/\s+/)).filter(w => w.length > 1));
        const partWords = [...new Set(partForms.flatMap(f => f.split(/\s+/)).filter(w => w.length > 1))];
        let overlap = 0;
        for (const w of partWords) {
            if (objWords.has(w)) overlap++;
        }
        if (overlap >= 2) return 40;
        if (overlap >= 1 && partWords.length <= 2) return 20;

        return 0;
    },

    /**
     * Derive anchorOnParent and pivotOnSelf from the spatial relationship
     * between a parent rectangle and child rectangle on stage.
     */
    _deriveJointParams(parent, child) {
        const pcx = parent.x + parent.width / 2;
        const pcy = parent.y + parent.height / 2;
        const ccx = child.x + child.width / 2;
        const ccy = child.y + child.height / 2;

        // Direction from parent center to child center
        const dx = ccx - pcx;
        const dy = ccy - pcy;

        // Normalize by parent half-dims for fair axis comparison
        const ndx = parent.width > 0 ? dx / (parent.width / 2) : 0;
        const ndy = parent.height > 0 ? dy / (parent.height / 2) : 0;

        let pivotX, pivotY;

        if (Math.abs(ndy) >= Math.abs(ndx)) {
            // Primarily vertical relationship
            pivotX = 0.5;
            if (dy >= 0) {
                // Child below parent → joint at child's top
                pivotY = 0;
            } else {
                // Child above parent → joint at child's bottom
                pivotY = 1;
            }
        } else {
            // Primarily horizontal relationship (e.g. arm beside torso)
            pivotY = 0; // Limbs connect at their top (shoulder joint)
            if (dx >= 0) {
                // Child right of parent → joint at child's left edge
                pivotX = 0;
            } else {
                // Child left of parent → joint at child's right edge
                pivotX = 1;
            }
        }

        const r2 = v => Math.round(v * 100) / 100;
        const jointWorld = this._getObjectWorldPoint(child, pivotX, pivotY);
        const anchor = this._getObjectNormalizedPoint(parent, jointWorld.x, jointWorld.y);

        return {
            anchorOnParent: { x: r2(anchor.x), y: r2(anchor.y) },
            pivotOnSelf: { x: r2(this._clamp01(pivotX)), y: r2(this._clamp01(pivotY)) }
        };
    },

    _topologicalSort(parts) {
        const map = {};
        parts.forEach(p => { map[p.partKey] = p; });
        const visited = new Set();
        const result = [];
        const visit = (p) => {
            if (visited.has(p.partKey)) return;
            if (p.parentPartKey && map[p.parentPartKey]) visit(map[p.parentPartKey]);
            visited.add(p.partKey);
            result.push(p);
        };
        parts.forEach(p => visit(p));
        return result;
    },


    // ═══════════════════════════════════════════════
    //  ASSEMBLE — auto-pin all parts together
    // ═══════════════════════════════════════════════

    _getAssemblyContourTargets(objects = null) {
        const source = Array.isArray(objects) && objects.length
            ? objects
            : (this.objects.objects || []).filter(obj => obj?.bodyPartData?.partKey);
        return source.filter(obj => obj?.pinnedTo && obj?.bodyPartData?.partKey);
    },

    _applyAssemblyContours(targetObjects, enabled, options = {}) {
        const contourTargets = this._getAssemblyContourTargets(targetObjects);
        if (!contourTargets.length) return 0;

        contourTargets.forEach(obj => {
            obj.pinContour = !!enabled;
        });

        this.stage.requestRender();
        if (options.pushHistory !== false) eventBus.emit('history:push');
        return contourTargets.length;
    },

    _updateAssemblyContourButton(panel, targetObjects = null) {
        const btn = panel?.querySelector('#ja-btn-contours');
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

    _assembleCharacter(panel) {
        const preset = this._activePreset;
        if (!preset) return;

        const assigned = Object.keys(this._assemblyMap).filter(k => this._assemblyMap[k]);
        if (assigned.length < 2) {
            Utils.showToast('Assign at least 2 body parts before assembling', 'warning');
            return;
        }

        // Verify root is assigned
        const rootPart = preset.parts.find(p => !p.parentPartKey);
        if (rootPart && !this._assemblyMap[rootPart.partKey]) {
            Utils.showToast(`Assign the root part (${rootPart.name}) first`, 'warning');
            return;
        }

        // Load trained parameters if available
    const training = this._getStoredAssemblyTraining(preset.key);
        const trained = training ? training.parts : null;

        const lookup = {};
        preset.parts.forEach(p => { lookup[p.partKey] = p; });

        // Process in topological order
        const ordered = this._topologicalSort(preset.parts);

        const assembledObjects = [];
        ordered.forEach(part => {
            const objId = this._assemblyMap[part.partKey];
            if (!objId) return;
            const obj = this.objects.getObjectById(objId);
            if (!obj) return;
            assembledObjects.push(obj);

            // Use trained parameters if available, otherwise fall back to preset
            const t = trained && trained[part.partKey];
            const pivotOnSelf = (t && t.pivotOnSelf) || part.pivotOnSelf;
            const anchorOnParent = (t && t.anchorOnParent) || (part.anchorOnParent || null);

            // Set pivot on self
            obj.pivotX = pivotOnSelf.x;
            obj.pivotY = pivotOnSelf.y;

            // Store body-part metadata
            obj.bodyPartData = this._applyGlobalJointLimits({
                partKey: part.partKey,
                charType: preset.key,
                jointName: part.name,
                defaultAngle: part.defaultAngle
            });

            this._normalizeAssemblyPartToIdleDown(obj, part, preset.key);

            obj.tiltX = t?.tilt?.x ?? obj.tiltX ?? 0;
            obj.tiltY = t?.tilt?.y ?? obj.tiltY ?? 0;

            // If has parent, pin to parent
            if (part.parentPartKey && this._assemblyMap[part.parentPartKey]) {
                const parentObjId = this._assemblyMap[part.parentPartKey];
                obj.pinnedTo = parentObjId;
                obj.pinAnchorX = anchorOnParent ? anchorOnParent.x : 0.5;
                obj.pinAnchorY = anchorOnParent ? anchorOnParent.y : 0.5;
                obj.pinOffsetX = (t && t.pinOffset) ? t.pinOffset.x : 0;
                obj.pinOffsetY = (t && t.pinOffset) ? t.pinOffset.y : 0;
                obj.pinRotationMode = 'joint';
                obj.pinInheritRotation = false;
                obj.jointBaseAngle = part.defaultAngle;
                obj.pinContour = !!this._assemblyUseContours;
                if (t?.contour) {
                    obj.pinContour = t.contour.enabled !== false;
                    obj.contourSize = t.contour.size ?? obj.contourSize ?? 1;
                    obj.contourColor = t.contour.color ?? null;
                    obj.contourFillMode = t.contour.fillMode || 'auto';
                    obj.contourPatternType = t.contour.patternType || 'stripes';
                    obj.contourPatternColor = t.contour.patternColor || '#ffffff';
                    obj.contourPatternScale = t.contour.patternScale ?? 1;
                    obj.contourGradientStart = t.contour.gradientStart || '#ffffff';
                    obj.contourGradientEnd = t.contour.gradientEnd || obj.contourColor || '#888888';
                    obj.contourGradientAngle = t.contour.gradientAngle ?? 0;
                }
            } else {
                // Root — unpin, keep position
                obj.pinnedTo = null;
                obj.pinRotationMode = 'static';
                obj.jointBaseAngle = 0;
            }
        });

        this._ensureBodyTagsForContext(this._buildBodyTagContextFromObjects(assembledObjects), preset.key, { pushHistory: false });

        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Assembled ${assigned.length} parts as ${preset.name}`, 'success');

        // Auto-enable skeleton overlay to show the result
        if (!this._skeletonVisible) this.toggleSkeleton();

        // Show done step
        panel.querySelector('#ja-step-assign').classList.add('hidden');
        panel.querySelector('#ja-step-done').classList.remove('hidden');
        this._updateAssemblyContourButton(panel, assembledObjects);

        // Wire done-step buttons
        const contourTargets = this._getAssemblyContourTargets(assembledObjects);
        const movementsBtn = panel.querySelector('#ja-btn-movements');
        if (movementsBtn) movementsBtn.onclick = () => {
            panel.remove();
            this.showMovementPicker();
        };
        const posesBtn = panel.querySelector('#ja-btn-poses');
        if (posesBtn) posesBtn.onclick = () => {
            panel.remove();
            this.showPoseLibrary();
        };
        const skeletonBtn = panel.querySelector('#ja-btn-skeleton-toggle');
        if (skeletonBtn) skeletonBtn.onclick = () => {
            this.toggleSkeleton();
            syncOverlayButtons();
        };
        const skeletonAssignBtn = panel.querySelector('#ja-btn-skeleton-toggle-assign');
        if (skeletonAssignBtn) skeletonAssignBtn.onclick = () => {
            this.toggleSkeleton();
            syncOverlayButtons();
        };
        const skeletonLabelsBtn = panel.querySelector('#ja-btn-skeleton-labels-toggle');
        if (skeletonLabelsBtn) skeletonLabelsBtn.onclick = () => {
            this.toggleSkeletonLabels();
            syncOverlayButtons();
        };
        const skeletonLabelsAssignBtn = panel.querySelector('#ja-btn-skeleton-labels-toggle-assign');
        if (skeletonLabelsAssignBtn) skeletonLabelsAssignBtn.onclick = () => {
            this.toggleSkeletonLabels();
            syncOverlayButtons();
        };
        const rotateHandlesBtn = panel.querySelector('#ja-btn-rotate-handles-toggle');
        if (rotateHandlesBtn) rotateHandlesBtn.onclick = () => {
            this.toggleJointRotateHandles();
            syncOverlayButtons();
        };
        const rotateHandlesAssignBtn = panel.querySelector('#ja-btn-rotate-handles-toggle-assign');
        if (rotateHandlesAssignBtn) rotateHandlesAssignBtn.onclick = () => {
            this.toggleJointRotateHandles();
            syncOverlayButtons();
        };
        const cleanViewBtn = panel.querySelector('#ja-btn-clean-view');
        if (cleanViewBtn) cleanViewBtn.onclick = () => {
            this.setSkeletonLabelsVisible(false);
            this.setJointRotateHandlesVisible(false);
            syncOverlayButtons();
        };
        const cleanViewAssignBtn = panel.querySelector('#ja-btn-clean-view-assign');
        if (cleanViewAssignBtn) cleanViewAssignBtn.onclick = () => {
            this.setSkeletonLabelsVisible(false);
            this.setJointRotateHandlesVisible(false);
            syncOverlayButtons();
        };
        const showAllBtn = panel.querySelector('#ja-btn-show-all');
        if (showAllBtn) showAllBtn.onclick = () => {
            this.setSkeletonLabelsVisible(true);
            this.setJointRotateHandlesVisible(true);
            syncOverlayButtons();
        };
        const showAllAssignBtn = panel.querySelector('#ja-btn-show-all-assign');
        if (showAllAssignBtn) showAllAssignBtn.onclick = () => {
            this.setSkeletonLabelsVisible(true);
            this.setJointRotateHandlesVisible(true);
            syncOverlayButtons();
        };
        const tuneBtn = panel.querySelector('#ja-btn-tune');
        if (tuneBtn) tuneBtn.onclick = () => {
            this.enterJointTuneMode();
        };
        const contourBtn = panel.querySelector('#ja-btn-contours');
        if (contourBtn) contourBtn.onclick = () => {
            const enableContours = !contourTargets.every(obj => !!obj.pinContour);
            const updatedCount = this._applyAssemblyContours(contourTargets, enableContours);
            this._updateAssemblyContourButton(panel, contourTargets);
            if (updatedCount) {
                Utils.showToast(`${enableContours ? 'Enabled' : 'Hidden'} joint contours on ${updatedCount} assembled part${updatedCount === 1 ? '' : 's'}`, 'success');
            }
        };
        const reassembleBtn = panel.querySelector('#ja-btn-reassemble');
        if (reassembleBtn) reassembleBtn.onclick = () => {
            this._showAssignStep(panel);
        };

        const syncOverlayButtons = () => {
            const setActive = (selector, active) => {
                const btn = panel.querySelector(selector);
                if (btn) btn.classList.toggle('active', !!active);
            };
            setActive('#ja-btn-skeleton-toggle', !!this._skeletonVisible);
            setActive('#ja-btn-skeleton-toggle-assign', !!this._skeletonVisible);
            setActive('#ja-btn-skeleton-labels-toggle', this._skeletonLabelsVisible !== false);
            setActive('#ja-btn-skeleton-labels-toggle-assign', this._skeletonLabelsVisible !== false);
            setActive('#ja-btn-rotate-handles-toggle', this._jointRotateHandlesVisible !== false);
            setActive('#ja-btn-rotate-handles-toggle-assign', this._jointRotateHandlesVisible !== false);
            setActive('#ja-btn-clean-view', this._skeletonLabelsVisible === false && this._jointRotateHandlesVisible === false);
            setActive('#ja-btn-clean-view-assign', this._skeletonLabelsVisible === false && this._jointRotateHandlesVisible === false);
            setActive('#ja-btn-show-all', this._skeletonLabelsVisible !== false && this._jointRotateHandlesVisible !== false);
            setActive('#ja-btn-show-all-assign', this._skeletonLabelsVisible !== false && this._jointRotateHandlesVisible !== false);
        };

        syncOverlayButtons();
    },

    enterJointTuneMode() {
        const partMap = this._getPartObjectMap();
        if (Object.keys(partMap).length < 2) {
            Utils.showToast('Assemble body parts first, then use Tune to adjust the joints', 'warning');
            return false;
        }
        this._enterJointTuneMode();
        return true;
    },


});
