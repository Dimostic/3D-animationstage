/**
 * Joint System — Guided Rig Wizard
 * (split from joint-system.js for maintainability)
 */

Object.assign(JointSystem.prototype, {

    showGuidedRigWizard() {
        let selected = this.objects.getSelectedObjects().filter(obj => obj.visible !== false);
        if (selected.length === 0) {
            Utils.showToast('Select one full character image or multiple body-part objects first', 'warning');
            return;
        }

        this._closeGuidedRigWizard();

        const panel = document.createElement('div');
        panel.id = 'guided-rig-panel';
        panel.className = 'joint-assembly-panel guided-rig-panel';

        const defaultMode = selected.length === 1 && selected[0].type === 'image' ? 'single-image' : 'part-assembly';
        const presets = this._getGuidedRigPresetOptions(defaultMode);
        const defaultPreset = presets.find(p => p.key === (defaultMode === 'single-image' ? 'human-front' : 'human-front')) || presets[0];
        const selectionSummary = selected.slice(0, 6).map(obj => obj.name || obj.type).join(', ');

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-wand-magic-sparkles"></i> Guided Assembly
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body guided-rig-body">
                <div class="ja-step-label">Enterprise Guided Setup</div>
                <div class="ja-hint guided-rig-hint">
                    For characters, use <strong>Body Stencil</strong> or <strong>Smart Cut</strong> when you start from one full image. Use this guided setup mainly for separated parts, or for legacy full-image landmarking when you explicitly need it.
                </div>
                <div class="guided-rig-summary">
                    <div><strong>Selection:</strong> <span id="guided-rig-selection-count">${selected.length}</span> object<span id="guided-rig-selection-plural">${selected.length === 1 ? '' : 's'}</span></div>
                    <div id="guided-rig-selection-names" class="guided-rig-summary-names">${selectionSummary}</div>
                </div>
                <div class="guided-rig-mode-grid">
                    <label class="guided-rig-mode-card ${defaultMode === 'single-image' ? 'active' : ''}">
                        <input type="radio" name="guided-rig-mode" value="single-image" ${defaultMode === 'single-image' ? 'checked' : ''}>
                        <span class="guided-rig-mode-title"><i class="fas fa-image"></i> Full Character Image (Legacy)</span>
                        <span class="guided-rig-mode-copy">Use this only when you need a labeled full-image rig. For most character animation, Body Stencil or Smart Cut is better.</span>
                    </label>
                    <label class="guided-rig-mode-card ${defaultMode === 'part-assembly' ? 'active' : ''}">
                        <input type="radio" name="guided-rig-mode" value="part-assembly" ${defaultMode === 'part-assembly' ? 'checked' : ''}>
                        <span class="guided-rig-mode-title"><i class="fas fa-puzzle-piece"></i> Separated Parts</span>
                        <span class="guided-rig-mode-copy">Assigns each clicked pivot to a body-part object and auto-connects the hierarchy.</span>
                    </label>
                </div>
                <div class="guided-rig-field">
                    <label for="guided-rig-preset">Character View</label>
                    <select id="guided-rig-preset" class="ja-part-select">
                        ${presets.map(p => `<option value="${p.key}" ${p.key === defaultPreset.key ? 'selected' : ''}>${p.name}</option>`).join('')}
                    </select>
                </div>
                <div class="guided-rig-field">
                    <label>How it works</label>
                    <div id="guided-rig-copy" class="guided-rig-copy"></div>
                </div>
                <div class="guided-rig-field">
                    <label>First Point</label>
                    <div class="guided-rig-step-card guided-rig-preview-card">
                        <div id="guided-rig-first-point" class="guided-rig-current"></div>
                        <div id="guided-rig-first-copy" class="ja-hint guided-rig-hint"></div>
                    </div>
                </div>
                <div class="guided-rig-field">
                    <label>Guide Map</label>
                    <div id="guided-rig-diagram" class="guided-rig-diagram-shell"></div>
                    <div id="guided-rig-diagram-legend"></div>
                </div>
                <div class="ja-actions">
                    <button id="guided-rig-refresh-names" class="btn-small" title="Reload selected object names from stage"><i class="fas fa-rotate"></i> Refresh Names</button>
                    <button id="guided-rig-start" class="btn-small ja-btn-green"><i class="fas fa-play"></i> Start Guided Setup</button>
                    <button id="guided-rig-manual-image" class="btn-small"><i class="fas fa-wave-square"></i> Manual Image Deform</button>
                    <button id="guided-rig-manual" class="btn-small"><i class="fas fa-sliders-h"></i> Manual Assembly</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        Utils.makePanelResizable(panel);

        const refreshSelectionSummary = () => {
            const countEl = panel.querySelector('#guided-rig-selection-count');
            const pluralEl = panel.querySelector('#guided-rig-selection-plural');
            const namesEl = panel.querySelector('#guided-rig-selection-names');
            const names = selected.slice(0, 6).map(obj => obj.name || obj.type).join(', ');
            if (countEl) countEl.textContent = String(selected.length);
            if (pluralEl) pluralEl.textContent = selected.length === 1 ? '' : 's';
            if (namesEl) namesEl.textContent = names;
        };

        const updateCopy = () => {
            const mode = panel.querySelector('input[name="guided-rig-mode"]:checked')?.value || 'single-image';
            this._refreshGuidedRigPresetSelect(panel, mode);
            panel.querySelectorAll('.guided-rig-mode-card').forEach(card => {
                const input = card.querySelector('input');
                card.classList.toggle('active', input?.checked === true);
            });
            const copy = panel.querySelector('#guided-rig-copy');
            const presetKey = panel.querySelector('#guided-rig-preset')?.value;
            const script = this._getGuidedRigScript(mode, presetKey);
            const preset = this._getGuidedRigPreset(mode, presetKey);
            const steps = preset ? this._buildGuidedRigSteps(preset, mode) : [];
            const firstStep = steps[0] || null;
            if (copy) copy.innerHTML = script.intro;
            const firstPointEl = panel.querySelector('#guided-rig-first-point');
            const firstCopyEl = panel.querySelector('#guided-rig-first-copy');
            if (firstPointEl) firstPointEl.innerHTML = firstStep
                ? `<strong>${firstStep.label}</strong>`
                : '<strong>No guided points available</strong>';
            if (firstCopyEl) firstCopyEl.textContent = firstStep
                ? firstStep.description
                : 'This preset does not currently expose a guided capture sequence.';
            const diagram = panel.querySelector('#guided-rig-diagram');
            const diagramLegend = panel.querySelector('#guided-rig-diagram-legend');
            if (diagram && preset) diagram.innerHTML = this._renderGuidedRigDiagramMarkup(mode, preset);
            if (diagramLegend && preset) diagramLegend.innerHTML = this._renderGuidedRigDiagramLegendMarkup(mode, preset);
        };

        panel.querySelector('.ja-close')?.addEventListener('click', () => this._closeGuidedRigWizard());
        panel.querySelectorAll('input[name="guided-rig-mode"]').forEach(input => {
            input.addEventListener('change', updateCopy);
        });
        panel.querySelector('#guided-rig-preset')?.addEventListener('change', updateCopy);
        panel.querySelector('#guided-rig-refresh-names')?.addEventListener('click', () => {
            const latest = this.objects.getSelectedObjects().filter(obj => obj.visible !== false);
            if (!latest.length) {
                Utils.showToast('Select at least one visible object on stage, then refresh', 'warning');
                return;
            }
            selected = latest;
            refreshSelectionSummary();
            updateCopy();
            Utils.showToast('Guided selection names refreshed', 'success');
        });
        panel.querySelector('#guided-rig-manual-image')?.addEventListener('click', () => {
            const img = selected.find(obj => obj.type === 'image');
            if (!img) {
                Utils.showToast('Manual image rig needs one selected image', 'warning');
                return;
            }
            this._closeGuidedRigWizard();
            this.objects.select([img.id]);
            this.objects.rigging.enterRigMode(img);
        });
        panel.querySelector('#guided-rig-manual')?.addEventListener('click', () => {
            this._closeGuidedRigWizard();
            this.showAssemblyPanel();
        });
        panel.querySelector('#guided-rig-start')?.addEventListener('click', () => {
            const mode = panel.querySelector('input[name="guided-rig-mode"]:checked')?.value || 'single-image';
            const presetKey = panel.querySelector('#guided-rig-preset')?.value;
            const preset = this._getGuidedRigPreset(mode, presetKey);
            if (!preset) {
                Utils.showToast('Choose a character view first', 'warning');
                return;
            }
            if (mode === 'single-image') {
                if (selected.length !== 1 || selected[0].type !== 'image') {
                    Utils.showToast('Full Character Image mode needs exactly one selected image', 'warning');
                    return;
                }
                if (!RigPresets.getByKey(preset.key)) {
                    Utils.showToast(`No guided full-image skeleton exists yet for ${preset.name}`, 'warning');
                    return;
                }
            } else if (selected.length < 2) {
                Utils.showToast('Separated Parts mode needs at least two selected objects', 'warning');
                return;
            }
            this._beginGuidedRigCapture(panel, preset, mode, selected);
        });

        refreshSelectionSummary();
        updateCopy();
    },

    _getGuidedRigPresetOptions(mode) {
        if (mode === 'single-image') {
            return RigPresets.getAll().map(preset => ({
                key: preset.key,
                name: preset.name,
                description: preset.description
            }));
        }
        return JointPresets.getAll().map(preset => ({
            key: preset.key,
            name: preset.name,
            description: preset.description
        }));
    },

    _getGuidedRigPreset(mode, key) {
        return mode === 'single-image'
            ? RigPresets.getByKey(key)
            : JointPresets.getAll().find(p => p.key === key);
    },

    _refreshGuidedRigPresetSelect(panel, mode) {
        const select = panel.querySelector('#guided-rig-preset');
        if (!select) return;
        const previous = select.value;
        const options = this._getGuidedRigPresetOptions(mode);
        select.innerHTML = options.map(option => `<option value="${option.key}">${option.name}</option>`).join('');
        if (options.some(option => option.key === previous)) select.value = previous;
        else if (options.length) select.value = options[0].key;
    },

    _renderGuidedRigDiagramMarkup(mode, preset, session = null) {
        const nodes = this._getGuidedRigDiagramNodes(mode, preset);
        if (!nodes.length) {
            return '<div class="guided-rig-diagram-empty">Diagram unavailable for this preset.</div>';
        }

        const doneKeys = new Set(Object.keys(session?.captures || {}));
        const currentKey = session?.steps?.[session.currentStepIndex]?.key || null;
        const nodeMap = new Map(nodes.map(node => [node.key, node]));

        const lines = nodes
            .filter(node => node.parentKey && nodeMap.has(node.parentKey))
            .map(node => {
                const parent = nodeMap.get(node.parentKey);
                const dx = node.x - parent.x;
                const dy = node.y - parent.y;
                const length = Math.hypot(dx, dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;
                const active = node.key === currentKey || parent.key === currentKey;
                const complete = doneKeys.has(node.key) && doneKeys.has(parent.key);
                const classes = [
                    'guided-rig-diagram-line',
                    active ? 'active' : '',
                    complete ? 'done' : ''
                ].filter(Boolean).join(' ');
                return `<span class="${classes}" style="left:${parent.x}%;top:${parent.y}%;width:${length}%;transform:rotate(${angle}deg)"></span>`;
            })
            .join('');

        const points = nodes.map(node => {
            const classes = [
                'guided-rig-diagram-node',
                node.parentKey ? '' : 'root',
                doneKeys.has(node.key) ? 'done' : '',
                currentKey === node.key ? 'current' : ''
            ].filter(Boolean).join(' ');
            return `
                <div class="${classes}" style="left:${node.x}%;top:${node.y}%">
                    <span class="guided-rig-diagram-dot"></span>
                    <span class="guided-rig-diagram-label">${this._shortenGuidedRigDiagramLabel(node.label)}</span>
                </div>
            `;
        }).join('');

        return `<div class="guided-rig-diagram">${lines}${points}</div>`;
    },

    _getGuidedRigDiagramNodes(mode, preset) {
        if (!preset) return [];

        if (mode === 'single-image') {
            const parentMap = new Map();
            (preset.bones || []).forEach(bone => {
                if (!parentMap.has(bone.childPinId)) parentMap.set(bone.childPinId, bone.parentPinId);
            });

            const visiblePins = this._getGuidedSingleImagePins(preset);
            const visiblePinIds = new Set(visiblePins.map(pin => pin.id));
            const resolveVisibleParent = (pinId) => {
                let parentId = parentMap.get(pinId) || null;
                while (parentId && !visiblePinIds.has(parentId)) {
                    parentId = parentMap.get(parentId) || null;
                }
                return parentId;
            };

            return this._normalizeGuidedRigDiagramNodes(visiblePins.map(pin => ({
                key: pin.id,
                label: pin.label || pin.id,
                parentKey: resolveVisibleParent(pin.id),
                x: (pin.restX ?? 0.5) * 100,
                y: (pin.restY ?? 0.5) * 100
            })));
        }

        const childrenByParent = new Map();
        (preset.parts || []).forEach(part => {
            const parentKey = part.parentPartKey || '__root__';
            if (!childrenByParent.has(parentKey)) childrenByParent.set(parentKey, []);
            childrenByParent.get(parentKey).push(part);
        });

        const rawPositions = new Map();
        const placePart = (part, x, y) => {
            if (rawPositions.has(part.partKey)) return;
            rawPositions.set(part.partKey, { x, y });
            const children = childrenByParent.get(part.partKey) || [];
            children.forEach(child => {
                const anchorX = child.anchorOnParent?.x ?? 0.5;
                const anchorY = child.anchorOnParent?.y ?? 0.5;
                const nextX = x + (anchorX - 0.5) * 120;
                const nextY = y + ((anchorY - 0.35) * 110) + 42;
                placePart(child, nextX, nextY);
            });
        };

        const roots = childrenByParent.get('__root__') || [];
        roots.forEach((root, index) => {
            const rootOffset = (index - ((roots.length - 1) / 2)) * 30;
            placePart(root, 50 + rootOffset, 20);
        });

        const nodes = (preset.parts || []).map(part => {
            const pos = rawPositions.get(part.partKey) || { x: 50, y: 50 };
            return {
                key: part.partKey,
                label: part.name,
                parentKey: part.parentPartKey || null,
                x: pos.x,
                y: pos.y
            };
        });

        return this._normalizeGuidedRigDiagramNodes(nodes);
    },

    _normalizeGuidedRigDiagramNodes(nodes) {
        if (!nodes.length) return nodes;
        const minX = Math.min(...nodes.map(node => node.x));
        const maxX = Math.max(...nodes.map(node => node.x));
        const minY = Math.min(...nodes.map(node => node.y));
        const maxY = Math.max(...nodes.map(node => node.y));
        const rangeX = Math.max(1, maxX - minX);
        const rangeY = Math.max(1, maxY - minY);
        const pad = 10;
        const usable = 100 - pad * 2;

        return nodes.map(node => ({
            ...node,
            x: pad + ((node.x - minX) / rangeX) * usable,
            y: pad + ((node.y - minY) / rangeY) * usable
        }));
    },

    _shortenGuidedRigDiagramLabel(label) {
        const text = String(label || '').replace(/\s+/g, ' ').trim();
        if (text.length <= 14) return text;
        return `${text.slice(0, 12).trim()}...`;
    },

    _toViewerSideLabel(label, presetKey) {
        const raw = String(label || '').trim();
        if (!raw || presetKey !== 'human-front') return raw;
        // Front-view rigs now keep character-side labels (R/L are anatomical sides).
        return raw;
    },

    _renderGuidedRigDiagramLegendMarkup(mode, preset, currentKey = null) {
        const perspectiveHint = this._getGuidedRigPerspectiveHint(mode, preset);
        const currentPart = currentKey
            ? (preset?.parts || []).find(part => part.partKey === currentKey)?.name
                || (preset?.pins || []).find(pin => pin.id === currentKey)?.label
                || ''
            : '';

        return `
            <div class="guided-rig-diagram-legend">
                <span class="guided-rig-legend-chip"><span class="guided-rig-legend-dot root"></span> root</span>
                <span class="guided-rig-legend-chip"><span class="guided-rig-legend-dot current"></span>${currentPart ? ` current: ${currentPart}` : ' current'}</span>
                <span class="guided-rig-legend-chip"><span class="guided-rig-legend-dot done"></span> done</span>
            </div>
            ${perspectiveHint ? `<div class="guided-rig-diagram-note">${perspectiveHint}</div>` : ''}
        `;
    },

    _getGuidedRigPerspectiveHint(mode, preset) {
        if (!preset) return '';
        if (preset.key === 'human-front') return 'Front-view labels use character anatomy: R is character-right (viewer-left), L is character-left (viewer-right).';
        const partLabels = mode === 'single-image'
            ? (preset.pins || []).map(pin => pin.label || '')
            : (preset.parts || []).map(part => part.name || part.partKey || '');
        const hasMirroredLabels = partLabels.some(label => /(^|\s)(L|R)\b|\bleft\b|\bright\b/i.test(label));
        return hasMirroredLabels ? 'Left/right labels follow character/anatomical direction.' : '';
    },

    _getSmartCutSuggestedParts(preset, regions, limit = 3) {
        if (!preset) return [];
        const taken = new Set((regions || []).map(region => region.label));
        return this._topologicalSort(preset.parts).filter(part => !taken.has(part.partKey)).slice(0, limit);
    },

    _getSmartCutRegionBounds(path) {
        if (!path?.length) return null;
        let minX = Infinity;
        let minY = Infinity;
        let maxX = -Infinity;
        let maxY = -Infinity;
        path.forEach(point => {
            minX = Math.min(minX, point.x);
            minY = Math.min(minY, point.y);
            maxX = Math.max(maxX, point.x);
            maxY = Math.max(maxY, point.y);
        });
        return {
            minX,
            minY,
            maxX,
            maxY,
            width: Math.max(1, maxX - minX),
            height: Math.max(1, maxY - minY),
            centerX: (minX + maxX) / 2,
            centerY: (minY + maxY) / 2
        };
    },

    _estimateSmartCutPartArea(part) {
        const key = `${part.partKey} ${part.name}`.toLowerCase();
        if (/torso|body|chest/.test(key)) return 0.2;
        if (/head/.test(key)) return 0.1;
        if (/tail|wing/.test(key)) return 0.08;
        if (/upper|lower|forearm|leg/.test(key)) return 0.055;
        if (/hand|foot|hoof|paw|fin/.test(key)) return 0.03;
        if (/neck|brow|eye|mouth/.test(key)) return 0.018;
        return 0.05;
    },

    _estimateSmartCutPartAspect(part) {
        const key = `${part.partKey} ${part.name}`.toLowerCase();
        if (/wing|tail|foot|hand|mouth|head/.test(key)) return 1.4;
        if (/torso|body/.test(key)) return 0.75;
        if (/upper|lower|forearm|leg|neck/.test(key)) return 0.45;
        return 1;
    },

    _rankSmartCutPartsForPath(path, preset, regions) {
        if (!preset || !path?.length || !this._smartCutObj) return [];
        const remaining = this._topologicalSort(preset.parts).filter(part => !(regions || []).some(region => region.label === part.partKey));
        const bounds = this._getSmartCutRegionBounds(path);
        if (!bounds) return remaining.map(part => ({ part, score: 0 }));

        const diagramNodes = new Map(this._getGuidedRigDiagramNodes('part-assembly', preset).map(node => [node.key, node]));
        const objArea = Math.max(1, this._smartCutObj.width * this._smartCutObj.height);
        const areaRatio = (bounds.width * bounds.height) / objArea;
        const aspect = bounds.width / Math.max(1, bounds.height);
        const normCenterX = this._clamp01((bounds.centerX - this._smartCutObj.x) / Math.max(1, this._smartCutObj.width));
        const normCenterY = this._clamp01((bounds.centerY - this._smartCutObj.y) / Math.max(1, this._smartCutObj.height));
        const guideX = 10 + normCenterX * 80;
        const guideY = 10 + normCenterY * 80;

        return remaining.map(part => {
            let score = 0;
            const node = diagramNodes.get(part.partKey);
            if (node) {
                const dist = Math.hypot(guideX - node.x, guideY - node.y);
                score += Math.max(0, 140 - dist * 2.1);
            }

            const areaTarget = this._estimateSmartCutPartArea(part);
            score += Math.max(0, 60 - Math.abs(areaRatio - areaTarget) * 550);

            const aspectTarget = this._estimateSmartCutPartAspect(part);
            score += Math.max(0, 28 - Math.abs(aspect - aspectTarget) * 18);

            const key = `${part.partKey} ${part.name}`.toLowerCase();
            if (normCenterY < 0.28 && /head|neck|brow|eye|mouth|dorsal/.test(key)) score += 24;
            if (normCenterY > 0.7 && /leg|foot|hoof|paw|ventral/.test(key)) score += 24;
            if (normCenterX < 0.25 && /head|mouth/.test(key)) score += 14;
            if (normCenterX > 0.72 && /tail/.test(key)) score += 18;

            return { part, score };
        }).sort((a, b) => b.score - a.score);
    },

    _buildSmartCutGuideSession(panel) {
        if (!this._smartCutPreset) return null;
        const steps = this._topologicalSort(this._smartCutPreset.parts).map(part => ({ key: part.partKey }));
        const captures = {};
        this._smartCutRegions.forEach(region => {
            captures[region.label] = { objectName: region.name || region.label };
        });
        const ranked = this._smartCutCurrentPath.length >= 3
            ? this._rankSmartCutPartsForPath(this._smartCutCurrentPath, this._smartCutPreset, this._smartCutRegions)
            : [];
        const traceUI = panel?.querySelector('#sc-trace-current');
        const usingLabelPicker = traceUI && !traceUI.classList.contains('hidden');
        const currentKey = (usingLabelPicker ? panel?.querySelector('#sc-part-select')?.value : null) || this._smartCutGuideKey || ranked[0]?.part.partKey || this._getSmartCutSuggestedParts(this._smartCutPreset, this._smartCutRegions, 1)[0]?.partKey || null;
        const currentStepIndex = Math.max(0, steps.findIndex(step => step.key === currentKey));
        return { steps, captures, currentStepIndex };
    },

    _updateSmartCutGuide(panel) {
        if (!panel || !this._smartCutPreset) return;

        const ranked = this._smartCutCurrentPath.length >= 3
            ? this._rankSmartCutPartsForPath(this._smartCutCurrentPath, this._smartCutPreset, this._smartCutRegions)
            : [];
        const suggested = ranked.length
            ? ranked.slice(0, 3).map(entry => entry.part)
            : this._getSmartCutSuggestedParts(this._smartCutPreset, this._smartCutRegions, 3);
        const select = panel.querySelector('#sc-part-select');
        const traceUI = panel.querySelector('#sc-trace-current');
        const usingLabelPicker = traceUI && !traceUI.classList.contains('hidden');
        if (usingLabelPicker && select && !select.value && suggested[0]) select.value = suggested[0].partKey;
        this._smartCutGuideKey = (usingLabelPicker ? select?.value : null) || suggested[0]?.partKey || null;

        const currentPart = this._smartCutPreset.parts.find(part => part.partKey === this._smartCutGuideKey) || suggested[0] || null;
        const copyEl = panel.querySelector('#sc-guide-copy');
        const nextEl = panel.querySelector('#sc-guide-next');
        const diagramEl = panel.querySelector('#sc-guide-diagram');
        const legendEl = panel.querySelector('#sc-guide-legend');

        if (copyEl) {
            copyEl.textContent = currentPart
                ? (this._smartCutCurrentPath.length >= 3
                    ? `Label the current closed region as ${currentPart.name}, then confirm it.`
                    : `Suggested next trace: ${currentPart.name}. ${currentPart.description || ''}`)
                : 'All preset parts are assigned. You can cut and assemble now.';
        }
        if (nextEl) {
            nextEl.innerHTML = suggested.length
                ? suggested.map(part => `<span class="guided-rig-chip">${part.name}</span>`).join('')
                : '<span class="guided-rig-chip">Ready to cut</span>';
        }
        if (diagramEl) {
            diagramEl.innerHTML = this._renderGuidedRigDiagramMarkup('part-assembly', this._smartCutPreset, this._buildSmartCutGuideSession(panel));
        }
        if (legendEl) {
            legendEl.innerHTML = this._renderGuidedRigDiagramLegendMarkup('part-assembly', this._smartCutPreset, this._smartCutGuideKey);
        }
    },

    _getGuidedRigScript(mode, presetKey) {
        const scripts = {
            'single-image:human-front': {
                intro: 'Important: labels follow CHARACTER direction. "R" is character-right (viewer-left) and "L" is character-left (viewer-right). Click the body centerline first (waist → hip center → chest → neck → head), then each limb chain in order: shoulder → upper arm → elbow → wrist → hand. Place every point at the joint center, not the outer edge of the silhouette.',
                labels: {
                    'Waist': 'CENTERLINE — Click the center of the lower torso, horizontally centered on the body, roughly halfway between the ribcage and the pelvis.',
                    'Hip Center': 'CENTERLINE — Click the center of the pelvis area, horizontally centered, where the two legs split.',
                    'Chest': 'CENTERLINE — Click the sternum / mid-chest area, horizontally centered on the body, not on a shoulder.',
                    'Neck': 'CENTERLINE — Click the base of the neck, centered horizontally, just above the chest.',
                    'Head Center': 'CENTERLINE — Click the middle of the head mass, centered horizontally, roughly between the chin and crown.',
                    'Head Top': 'CENTERLINE — Click the very top of the head (crown), centered horizontally.',
                    'R Shoulder': 'Stage LEFT side (character-right) — Click the shoulder socket where the arm meets the torso.',
                    'R Upper Arm': 'Stage LEFT side (character-right) — Click the middle of the upper arm, halfway between the shoulder and elbow.',
                    'R Elbow': 'Stage LEFT side (character-right) — Click the elbow hinge in the middle of the arm.',
                    'R Wrist': 'Stage LEFT side (character-right) — Click where the forearm meets the hand.',
                    'R Hand': 'Stage LEFT side (character-right) — Click the base of the palm. Do NOT click the fingertips.',
                    'L Shoulder': 'Stage RIGHT side (character-left) — Click the shoulder socket where the arm meets the torso.',
                    'L Upper Arm': 'Stage RIGHT side (character-left) — Click the middle of the upper arm, halfway between the shoulder and elbow.',
                    'L Elbow': 'Stage RIGHT side (character-left) — Click the elbow hinge in the middle of the arm.',
                    'L Wrist': 'Stage RIGHT side (character-left) — Click where the forearm meets the hand.',
                    'L Hand': 'Stage RIGHT side (character-left) — Click the base of the palm. Do NOT click the fingertips.',
                    'R Hip': 'Stage LEFT side of center (character-right) — Click the hip socket at the very top of the thigh, where the leg meets the pelvis.',
                    'R Knee': 'Stage LEFT side of center (character-right) — Click the knee hinge, roughly midway down the leg.',
                    'R Ankle': 'Stage LEFT side of center (character-right) — Click the ankle bend where the shin meets the foot.',
                    'R Foot': 'Stage LEFT side of center (character-right) — Click the base of the foot (heel or mid-sole), not the toe tip.',
                    'L Hip': 'Stage RIGHT side of center (character-left) — Click the hip socket at the very top of the thigh, where the leg meets the pelvis.',
                    'L Knee': 'Stage RIGHT side of center (character-left) — Click the knee hinge, roughly midway down the leg.',
                    'L Ankle': 'Stage RIGHT side of center (character-left) — Click the ankle bend where the shin meets the foot.',
                    'L Foot': 'Stage RIGHT side of center (character-left) — Click the base of the foot (heel or mid-sole), not the toe tip.'
                }
            },
            'single-image:human-side': {
                intro: 'Capture the side-profile center line first, then the visible arm and both leg chains. This works well for walk and run cycles.',
                labels: {
                    'Waist': 'Click the waist pivot on the side silhouette.',
                    'Hip': 'Click the hip pivot where the legs branch.',
                    'Shoulder': 'Click the shoulder joint.',
                    'Front Hip': 'Click the front leg hip joint.',
                    'Back Hip': 'Click the rear leg hip joint.'
                }
            },
            'single-image:upper-body': {
                intro: 'This guide is optimized for busts and waist-up characters. Capture the torso core, then shoulder sockets, elbows, and hands. The rig applies automatically after the last point.',
                labels: {
                    'Chest': 'Click the chest pivot.',
                    'Waist': 'Click the waist or bottom of the torso.',
                    'R Shoulder': 'Click the right shoulder socket where the arm meets the torso.',
                    'L Shoulder': 'Click the left shoulder socket where the arm meets the torso.'
                }
            },
            'single-image:facial-rig': {
                intro: 'This guide creates a facial rig. Capture brows, eyes, nose, mouth corners, and chin so expressions can be posed directly on the face.',
                labels: {
                    'Forehead': 'Click the upper forehead anchor.',
                    'Chin': 'Click the chin pivot.',
                    'R Brow Inner': 'Click the inner right brow point.',
                    'R Brow Outer': 'Click the outer right brow point.',
                    'L Brow Inner': 'Click the inner left brow point.',
                    'L Brow Outer': 'Click the outer left brow point.',
                    'R Eye': 'Click the center of the right eye.',
                    'L Eye': 'Click the center of the left eye.',
                    'Nose Tip': 'Click the nose tip.',
                    'Mouth Left': 'Click the left mouth corner.',
                    'Mouth Right': 'Click the right mouth corner.',
                    'Upper Lip': 'Click the upper lip midpoint.',
                    'Lower Lip': 'Click the lower lip midpoint.'
                }
            },
            'single-image:bird': {
                intro: 'Capture the torso and head first, then the tail, wing roots, wing tips, and leg pivots. This supports flap and glide motion.',
                labels: {
                    'Tail Base': 'Click where the tail begins.',
                    'Tail Tip': 'Click the tail tip.',
                    'L Wing Root': 'Click the left wing root.',
                    'L Wing Mid': 'Click the middle joint of the left wing.',
                    'L Wing Tip': 'Click the left wing tip.',
                    'R Wing Root': 'Click the right wing root.',
                    'R Wing Mid': 'Click the middle joint of the right wing.',
                    'R Wing Tip': 'Click the right wing tip.'
                }
            },
            'single-image:quadruped': {
                intro: 'Capture the spine chain first, then the head, tail, and each leg from upper joint to paw. This builds a stable four-leg rig.',
                labels: {
                    'Mid Spine': 'Click the middle of the spine.',
                    'Tail Base': 'Click the tail base.',
                    'Tail Tip': 'Click the tail tip.'
                }
            },
            'single-image:fish': {
                intro: 'Capture the body spine from mouth to tail, then the tail fins and side fins. This is tuned for swim and idle motion.',
                labels: {
                    'Mouth': 'Click the mouth or snout tip.',
                    'Tail Base': 'Click the tail base.',
                    'Tail Top': 'Click the upper tail fin point.',
                    'Tail Bottom': 'Click the lower tail fin point.',
                    'Dorsal Fin': 'Click the dorsal fin base.',
                    'L Pectoral': 'Click the left pectoral fin.',
                    'R Pectoral': 'Click the right pectoral fin.'
                }
            },
            'part-assembly:human-front': {
                intro: 'Click the pivot for each body part in hierarchy order. Use the real shoulder, elbow, wrist, hip, knee, and ankle joints on the artwork.',
                parts: {
                    'torso': 'Click the root torso pivot, usually around the waist or lower chest.',
                    'neck': 'Click where the neck joins the torso.',
                    'head': 'Click the base of the head at the neck.',
                    'l-hand': 'Click the wrist pivot of the left hand.',
                    'r-hand': 'Click the wrist pivot of the right hand.'
                }
            },
            'part-assembly:bird': {
                intro: 'Click the body pivot first, then head, tail, wing roots, wing tips, and legs. The wizard will overlap wings and tail around those pivots.',
                parts: {
                    'tail': 'Click where the tail feathers attach to the body.',
                    'l-wing-upper': 'Click the left wing root.',
                    'l-wing-lower': 'Click the outer hinge of the left wing.',
                    'r-wing-upper': 'Click the right wing root.',
                    'r-wing-lower': 'Click the outer hinge of the right wing.'
                }
            },
            'part-assembly:quadruped': {
                intro: 'Click the torso or body pivot first, then head, tail, and each leg joint from upper segment to lower segment.',
                parts: {
                    'tail': 'Click the tail base pivot.',
                    'fl-upper': 'Click the front-left shoulder/hip pivot for that leg.',
                    'fr-upper': 'Click the front-right shoulder/hip pivot for that leg.',
                    'rl-upper': 'Click the rear-left hip pivot.',
                    'rr-upper': 'Click the rear-right hip pivot.'
                }
            },
            'part-assembly:fish': {
                intro: 'Click the body pivot first, then head, tail fin, dorsal fin, and pectoral fin pivots.',
                parts: {
                    'head': 'Click the joint between the head and the main body.',
                    'tail': 'Click the base of the tail fin.',
                    'dorsal': 'Click the base of the dorsal fin.',
                    'pectoral': 'Click the base of the pectoral fin.'
                }
            }
        };

        return scripts[`${mode}:${presetKey}`] || {
            intro: mode === 'single-image'
                ? 'Click each requested landmark directly on the character image. The wizard will build the rig and open the correct editing mode automatically.'
                : 'Click each part pivot in order. The wizard will attach the parts into a hierarchy and align them around the clicked joints.',
            labels: {},
            parts: {}
        };
    },

    _beginGuidedRigCapture(panel, preset, mode, selectedObjects) {
        const steps = this._buildGuidedRigSteps(preset, mode);
        if (!steps.length) {
            Utils.showToast('This preset does not have a guided sequence yet', 'warning');
            return;
        }

        this._guidedRig = {
            panel,
            preset,
            mode,
            selectedObjects: [...selectedObjects],
            currentStepIndex: 0,
            steps,
            captures: {},
            usedObjectIds: new Set(),
            hoverTarget: null,
            predictedParts: mode === 'part-assembly'
                ? this._matchStageToParts(selectedObjects, preset.parts)
                : {}
        };

        panel.querySelector('.guided-rig-body').innerHTML = `
            <div class="ja-step-label">Guided Capture</div>
            <div class="guided-rig-progress">
                <span id="guided-rig-progress-count"></span>
                <div id="guided-rig-progress-bar" class="guided-rig-progress-bar"><span></span></div>
            </div>
            <div class="guided-rig-step-card">
                <div id="guided-rig-current" class="guided-rig-current"></div>
                <div id="guided-rig-subcopy" class="ja-hint guided-rig-hint"></div>
                <div id="guided-rig-stage-tip" class="guided-rig-stage-tip"></div>
                <div id="guided-rig-upcoming" class="guided-rig-upcoming"></div>
            </div>
            <div id="guided-rig-diagram" class="guided-rig-diagram-shell"></div>
            <div id="guided-rig-diagram-legend"></div>
            <div id="guided-rig-capture-list" class="guided-rig-capture-list"></div>
            <div class="ja-actions">
                <button id="guided-rig-refresh-capture-names" class="btn-small" title="Reload object names from stage"><i class="fas fa-rotate"></i> Refresh Names</button>
                <button id="guided-rig-undo" class="btn-small"><i class="fas fa-undo"></i> Undo Last</button>
                <button id="guided-rig-cancel" class="btn-small"><i class="fas fa-times"></i> Cancel</button>
            </div>
        `;

        panel.querySelector('#guided-rig-refresh-capture-names')?.addEventListener('click', () => {
            this._refreshGuidedRigCaptureNames(true);
        });
        panel.querySelector('#guided-rig-undo')?.addEventListener('click', () => this._undoGuidedRigStep());
        panel.querySelector('#guided-rig-cancel')?.addEventListener('click', () => this._closeGuidedRigWizard());

        this._guidedRigOverlayHandler = (ctx) => this._renderGuidedRigOverlay(ctx);
        eventBus.on('stage:render-overlay', this._guidedRigOverlayHandler);

        const canvas = this.stage.canvas;
        this._guidedRigMouseDown = (e) => this._handleGuidedRigStageClick(e);
        this._guidedRigMouseMove = (e) => this._handleGuidedRigStageHover(e);
        canvas.addEventListener('mousedown', this._guidedRigMouseDown, true);
        canvas.addEventListener('mousemove', this._guidedRigMouseMove, true);
        canvas.style.cursor = 'crosshair';

        this._updateGuidedRigPanel();
        this.stage.requestRender();
        const firstStep = steps[0] || null;
        Utils.showToast(
            firstStep
                ? `Guided rigging started — first point: ${firstStep.label}`
                : 'Guided rigging started — click the requested point on the stage',
            'info'
        );
    },

    _refreshGuidedRigCaptureNames(showToast = false) {
        const session = this._guidedRig;
        if (!session) return;

        const latestSelected = (session.selectedObjects || [])
            .map(obj => this.objects.getObjectById(obj.id))
            .filter(Boolean);
        if (latestSelected.length) {
            session.selectedObjects = latestSelected;
        }

        if (session.mode === 'part-assembly' && session.preset?.parts?.length) {
            session.predictedParts = this._matchStageToParts(session.selectedObjects || [], session.preset.parts);
        }

        Object.values(session.captures || {}).forEach(capture => {
            if (!capture?.objectId) return;
            const obj = this.objects.getObjectById(capture.objectId);
            if (obj) capture.objectName = obj.name || obj.type;
        });

        this._updateGuidedRigPanel();
        this.stage.requestRender();
        if (showToast) Utils.showToast('Guided capture names refreshed', 'success');
    },

    _buildGuidedRigSteps(preset, mode) {
        if (mode === 'single-image') {
            const rigPreset = preset;
            if (!rigPreset) return [];
            const script = this._getGuidedRigScript(mode, preset.key);
            return this._getGuidedSingleImagePins(rigPreset)
                .map((pin, index) => ({
                    key: pin.id,
                    label: this._toViewerSideLabel(pin.label || `Point ${index + 1}`, preset.key),
                    description: script.labels?.[this._toViewerSideLabel(pin.label || '', preset.key)]
                        || script.labels?.[pin.label]
                        || `Click the ${this._toViewerSideLabel(pin.label || `point ${index + 1}`, preset.key)} on the character image.`
                }));
        }

        const script = this._getGuidedRigScript(mode, preset.key);
        return this._topologicalSort(preset.parts).map((part, index) => ({
            key: part.partKey,
            label: part.name,
            description: script.parts?.[part.partKey] || (index === 0
                ? `Click the root pivot on ${part.name}. This piece will stay in place.`
                : `Click the attachment pivot on ${part.name}. The wizard will connect it to ${preset.parts.find(p => p.partKey === part.parentPartKey)?.name || 'its parent'}.`)
        }));
    },

    _getGuidedSingleImagePins(rigPreset) {
        if (!rigPreset?.pins?.length) return [];

        const explicitOrders = {
            'human-front': [
                'pin-4', 'pin-5', 'pin-3', 'pin-2', 'pin-1', 'pin-0',
                'pin-6', 'pin-7', 'pin-8', 'pin-9', 'pin-10',
                'pin-11', 'pin-12', 'pin-13', 'pin-14', 'pin-15',
                'pin-16', 'pin-17', 'pin-18', 'pin-19',
                'pin-20', 'pin-21', 'pin-22', 'pin-23'
            ]
        };

        const explicit = explicitOrders[rigPreset.key];
        if (explicit?.length) {
            const pinMap = new Map((rigPreset.pins || []).map(pin => [pin.id, pin]));
            return explicit
                .map(id => pinMap.get(id))
                .filter(pin => pin && this._shouldGuideSingleImagePin(rigPreset.key, pin));
        }

        return this._orderGuidedRigPins(rigPreset.pins, rigPreset.key)
            .filter(pin => this._shouldGuideSingleImagePin(rigPreset.key, pin));
    },

    _orderGuidedRigPins(pins, presetKey) {
        const desiredOrders = {
            'human-front': ['Waist', 'Hip Center', 'Chest', 'Neck', 'Head Center', 'Head Top', 'R Shoulder', 'R Upper Arm', 'R Elbow', 'R Wrist', 'R Hand', 'L Shoulder', 'L Upper Arm', 'L Elbow', 'L Wrist', 'L Hand', 'R Hip', 'R Knee', 'R Ankle', 'R Foot', 'L Hip', 'L Knee', 'L Ankle', 'L Foot'],
            'human-side': ['Waist', 'Hip', 'Chest', 'Neck', 'Head Center', 'Head Top', 'Shoulder', 'Elbow', 'Wrist', 'Hand', 'Front Hip', 'Front Knee', 'Front Ankle', 'Front Foot', 'Back Hip', 'Back Knee', 'Back Ankle', 'Back Foot'],
            'upper-body': ['Waist', 'Chest', 'Neck', 'Head', 'Head Top', 'R Shoulder', 'R Elbow', 'R Hand', 'L Shoulder', 'L Elbow', 'L Hand'],
            'facial-rig': ['Forehead', 'R Brow Inner', 'R Brow Outer', 'L Brow Inner', 'L Brow Outer', 'R Eye', 'L Eye', 'Nose Tip', 'Upper Lip', 'Mouth Left', 'Mouth Right', 'Lower Lip', 'Chin'],
            'quadruped': ['Mid Spine', 'Shoulder', 'Hip', 'Neck', 'Head', 'Tail Base', 'Tail Tip', 'FL Upper', 'FL Knee', 'FL Paw', 'FR Upper', 'FR Knee', 'FR Paw', 'RL Upper', 'RL Knee', 'RL Paw', 'RR Upper', 'RR Knee', 'RR Paw'],
            'bird': ['Chest', 'Mid Body', 'Neck', 'Head', 'Tail Base', 'Tail Tip', 'L Wing Root', 'L Wing Mid', 'L Wing Tip', 'R Wing Root', 'R Wing Mid', 'R Wing Tip', 'L Leg', 'L Foot', 'R Leg', 'R Foot'],
            'fish': ['Mouth', 'Head', 'Front Body', 'Mid Body', 'Rear Body', 'Tail Base', 'Tail Top', 'Tail Bottom', 'Dorsal Fin', 'L Pectoral', 'R Pectoral', 'Ventral Fin'],
            'biped': ['Waist', 'Chest', 'Neck', 'Head', 'R Shoulder', 'R Elbow', 'R Hand', 'L Shoulder', 'L Elbow', 'L Hand', 'R Hip', 'R Knee', 'R Foot', 'L Hip', 'L Knee', 'L Foot'],
            'centaur': ['Waist', 'Chest', 'Neck', 'Head', 'R Shoulder', 'R Elbow', 'R Hand', 'L Shoulder', 'L Elbow', 'L Hand', 'Front Left Shoulder', 'Front Left Knee', 'Front Left Hoof', 'Front Right Shoulder', 'Front Right Knee', 'Front Right Hoof', 'Rear Left Hip', 'Rear Left Knee', 'Rear Left Hoof', 'Rear Right Hip', 'Rear Right Knee', 'Rear Right Hoof', 'Tail Base', 'Tail Tip']
        };

        const desired = desiredOrders[presetKey];
        if (!desired) return pins;

        const orderMap = new Map(desired.map((label, index) => [label.toLowerCase(), index]));
        return [...pins].sort((a, b) => {
            const ai = orderMap.has((a.label || '').toLowerCase()) ? orderMap.get((a.label || '').toLowerCase()) : Number.MAX_SAFE_INTEGER;
            const bi = orderMap.has((b.label || '').toLowerCase()) ? orderMap.get((b.label || '').toLowerCase()) : Number.MAX_SAFE_INTEGER;
            if (ai !== bi) return ai - bi;
            return pins.indexOf(a) - pins.indexOf(b);
        });
    },

    _shouldGuideSingleImagePin(presetKey, pin) {
        return true;
    },

    _buildGuidedSingleImageCaptureMap(session, rigPreset) {
        const captureMap = { ...session.captures };
        if (rigPreset?.key === 'human-front') {
            this._deriveIntermediateCapture(captureMap, rigPreset, 'R Upper Arm', 'R Shoulder', 'R Elbow', 0.5);
            this._deriveIntermediateCapture(captureMap, rigPreset, 'L Upper Arm', 'L Shoulder', 'L Elbow', 0.5);
        }
        return captureMap;
    },

    _deriveIntermediateCapture(captureMap, rigPreset, targetLabel, startLabel, endLabel, ratio = 0.5) {
        const targetPin = rigPreset?.pins?.find(pin => pin.label === targetLabel);
        const startPin = rigPreset?.pins?.find(pin => pin.label === startLabel);
        const endPin = rigPreset?.pins?.find(pin => pin.label === endLabel);
        if (!targetPin || !startPin || !endPin || captureMap[targetPin.id]) return;

        const startCapture = captureMap[startPin.id];
        const endCapture = captureMap[endPin.id];
        if (!startCapture || !endCapture) return;

        captureMap[targetPin.id] = {
            normX: startCapture.normX + (endCapture.normX - startCapture.normX) * ratio,
            normY: startCapture.normY + (endCapture.normY - startCapture.normY) * ratio
        };
    },

    _getGuidedRigStageTip(step) {
        if (!step) return '';
        const label = (step.label || '').trim();
        const presetKey = String(this._guidedRig?.preset?.key || '').toLowerCase();
        const useCharacterSideFront = presetKey === 'human-front';
        // Determine screen region from the label
        if (/^(Waist|Hip Center|Chest|Neck|Head Center|Head Top)$/i.test(label)) {
            return `Stage tip: "${label}" is on the VERTICAL CENTERLINE of the body. Click in the middle of the image, not to the left or right.`;
        }
        if (/^R /i.test(label)) {
            if (useCharacterSideFront) {
                return `Stage tip: "${label}" is on STAGE LEFT (character-right). Click the joint center, not the outer silhouette edge.`;
            }
            return `Stage tip: "${label}" is on YOUR RIGHT side of the screen. Click the joint center, not the outer silhouette edge.`;
        }
        if (/^L /i.test(label)) {
            if (useCharacterSideFront) {
                return `Stage tip: "${label}" is on STAGE RIGHT (character-left). Click the joint center, not the outer silhouette edge.`;
            }
            return `Stage tip: "${label}" is on YOUR LEFT side of the screen. Click the joint center, not the outer silhouette edge.`;
        }
        return `Stage tip: click the joint center for "${label}", not the outside silhouette edge.`;
    },

    _updateGuidedRigPanel() {
        const session = this._guidedRig;
        if (!session?.panel) return;
        const total = session.steps.length;
        const done = Object.keys(session.captures).length;
        const current = session.steps[session.currentStepIndex] || null;
        const progress = total > 0 ? Math.round((done / total) * 100) : 0;

        const countEl = session.panel.querySelector('#guided-rig-progress-count');
        const barEl = session.panel.querySelector('#guided-rig-progress-bar span');
        const currentEl = session.panel.querySelector('#guided-rig-current');
        const copyEl = session.panel.querySelector('#guided-rig-subcopy');
        const listEl = session.panel.querySelector('#guided-rig-capture-list');
        const tipEl = session.panel.querySelector('#guided-rig-stage-tip');
        const upcomingEl = session.panel.querySelector('#guided-rig-upcoming');
        const diagramEl = session.panel.querySelector('#guided-rig-diagram');
        const diagramLegendEl = session.panel.querySelector('#guided-rig-diagram-legend');
        const expectedObj = current && session.mode === 'part-assembly' ? session.predictedParts?.[current.key] : null;

        if (countEl) countEl.textContent = `Step ${Math.min(session.currentStepIndex + 1, total)} of ${total}`;
        if (barEl) barEl.style.width = `${progress}%`;
        if (currentEl) currentEl.innerHTML = current
            ? `<strong>${current.label}</strong>`
            : '<strong>All guide points captured</strong>';
        if (copyEl) copyEl.textContent = current ? current.description : 'Applying rig automatically...';
        if (tipEl) {
            if (!current) tipEl.textContent = '';
            else if (session.mode === 'single-image') tipEl.textContent = this._getGuidedRigStageTip(current);
            else if (session.hoverTarget?.obj) tipEl.textContent = `Stage tip: ${session.hoverTarget.obj.name || session.hoverTarget.obj.type} is under the cursor.`;
            else if (expectedObj) tipEl.textContent = `Stage tip: expected object is ${expectedObj.name || expectedObj.type}.`;
            else tipEl.textContent = 'Stage tip: move over the target part and click the exact pivot location.';
        }
        if (upcomingEl) {
            const upcoming = session.steps.slice(session.currentStepIndex + 1, session.currentStepIndex + 4);
            upcomingEl.innerHTML = upcoming.length
                ? `<span class="guided-rig-upcoming-label">Next:</span> ${upcoming.map(step => `<span class="guided-rig-chip">${step.label}</span>`).join('')}`
                : '<span class="guided-rig-upcoming-label">Next:</span> auto-apply after last point';
        }
        if (diagramEl) {
            diagramEl.innerHTML = this._renderGuidedRigDiagramMarkup(session.mode, session.preset, session);
        }
        if (diagramLegendEl) {
            diagramLegendEl.innerHTML = this._renderGuidedRigDiagramLegendMarkup(session.mode, session.preset, current?.key || null);
        }
        if (listEl) {
            listEl.innerHTML = session.steps.map((step, index) => {
                const captured = session.captures[step.key];
                const state = captured ? 'done' : index === session.currentStepIndex ? 'current' : '';
                const suggested = !captured && session.mode === 'part-assembly' ? session.predictedParts?.[step.key] : null;
                return `
                    <div class="guided-rig-capture-item ${state}">
                        <span class="guided-rig-capture-state">${captured ? '<i class="fas fa-check"></i>' : index === session.currentStepIndex ? '<i class="fas fa-location-crosshairs"></i>' : index + 1}</span>
                        <span class="guided-rig-capture-label">${step.label}</span>
                        <span class="guided-rig-capture-meta">${captured?.objectName || suggested?.name || ''}</span>
                    </div>
                `;
            }).join('');
        }
    },

    _handleGuidedRigStageHover(e) {
        const session = this._guidedRig;
        if (!session) return;

        const pos = this.stage.screenToStage(e.clientX, e.clientY);
        const step = session.steps[session.currentStepIndex];
        if (!step) return;

        if (session.mode === 'single-image') {
            const obj = session.selectedObjects[0];
            session.hoverTarget = obj && this._pointHitsObject(obj, pos.x, pos.y)
                ? { obj, worldX: pos.x, worldY: pos.y }
                : null;
        } else {
            const match = this._findGuidedPartObject(session, step, pos.x, pos.y);
            session.hoverTarget = match ? { ...match, worldX: pos.x, worldY: pos.y } : null;
        }

        this._updateGuidedRigPanel();
        this.stage.requestRender();
    },

    _handleGuidedRigStageClick(e) {
        const session = this._guidedRig;
        if (!session || e.button !== 0) return;

        const pos = this.stage.screenToStage(e.clientX, e.clientY);
        const step = session.steps[session.currentStepIndex];
        if (!step) return;

        e.preventDefault();
        e.stopPropagation();

        if (session.mode === 'single-image') {
            const obj = session.selectedObjects[0];
            if (!this._pointHitsObject(obj, pos.x, pos.y)) {
                Utils.showToast('Click directly on the selected character image', 'warning');
                return;
            }
            session.captures[step.key] = {
                objectId: obj.id,
                objectName: obj.name || obj.type,
                normX: this._clamp01(obj.width ? (pos.x - obj.x) / obj.width : 0.5),
                normY: this._clamp01(obj.height ? (pos.y - obj.y) / obj.height : 0.5),
                worldX: pos.x,
                worldY: pos.y,
                label: step.label
            };
        } else {
            const match = this._findGuidedPartObject(session, step, pos.x, pos.y);
            if (!match) {
                Utils.showToast('Click on the body-part object for this step', 'warning');
                return;
            }
            const part = session.preset.parts.find(p => p.partKey === step.key);
            const parentCapture = part?.parentPartKey ? session.captures[part.parentPartKey] : null;
            const localAngle = parentCapture
                ? this._normalizeDegrees((match.obj.rotation || 0) - ((this.objects.getObjectById(parentCapture.objectId)?.rotation) || 0))
                : (match.obj.rotation || 0);

            session.captures[step.key] = {
                objectId: match.obj.id,
                objectName: match.obj.name || match.obj.type,
                worldX: pos.x,
                worldY: pos.y,
                pivotX: this._clamp01(match.obj.width ? (pos.x - match.obj.x) / match.obj.width : 0.5),
                pivotY: this._clamp01(match.obj.height ? (pos.y - match.obj.y) / match.obj.height : 0.5),
                anchorOnParent: parentCapture ? this._deriveAnchorFromWorldPoint(this.objects.getObjectById(parentCapture.objectId), pos.x, pos.y) : null,
                localAngle
            };
            session.usedObjectIds.add(match.obj.id);
        }

        session.hoverTarget = null;
        session.currentStepIndex += 1;
        if (session.currentStepIndex >= session.steps.length) {
            this._finishGuidedRig();
            return;
        }

        this._updateGuidedRigPanel();
        this.stage.requestRender();
    },

    _undoGuidedRigStep() {
        const session = this._guidedRig;
        if (!session || session.currentStepIndex <= 0) return;

        const previousStep = session.steps[session.currentStepIndex - 1];
        const previousCapture = session.captures[previousStep.key];
        if (previousCapture && session.mode === 'part-assembly') {
            const stillUsed = Object.entries(session.captures).some(([key, capture]) => key !== previousStep.key && capture.objectId === previousCapture.objectId);
            if (!stillUsed) session.usedObjectIds.delete(previousCapture.objectId);
        }
        delete session.captures[previousStep.key];
        session.hoverTarget = null;
        session.currentStepIndex -= 1;
        this._updateGuidedRigPanel();
        this.stage.requestRender();
    },

    _finishGuidedRig() {
        const session = this._guidedRig;
        if (!session) return;

        if (session.mode === 'single-image') {
            this._applyGuidedSingleImageRig(session);
        } else {
            this._applyGuidedPartRig(session);
        }

        this._teardownGuidedRigCapture();
        this._showGuidedRigDoneState(session);
        this.stage.requestRender();
    },

    _applyGuidedSingleImageRig(session) {
        const obj = session.selectedObjects[0];
        const rigPreset = session.preset;
        if (!obj || !rigPreset) return;

        const captureMap = this._buildGuidedSingleImageCaptureMap(session, rigPreset);
        const childPinIds = new Set(rigPreset.bones.map(bone => bone.childPinId));
        const orderedPins = this._getGuidedSingleImagePins(rigPreset);
        const fallbackPins = (rigPreset.pins || []).filter(pin => !orderedPins.some(ordered => ordered.id === pin.id));
        const finalPins = [...orderedPins, ...fallbackPins];

        this.objects.select([obj.id]);
        this.objects.rigging.enterRigMode(obj);

        obj.rigging = {
            pins: finalPins.map(pin => {
                const capture = captureMap[pin.id];
                return {
                    id: pin.id,
                    restX: capture ? capture.normX : pin.restX,
                    restY: capture ? capture.normY : pin.restY,
                    x: capture ? capture.normX : pin.restX,
                    y: capture ? capture.normY : pin.restY,
                    label: pin.label || '',
                    anchor: pin.anchor === true || !childPinIds.has(pin.id)
                };
            }),
            bones: rigPreset.bones.map((bone, index) => ({
                id: `bone-${index}`,
                parentPinId: bone.parentPinId,
                childPinId: bone.childPinId,
                name: bone.name || `Bone ${index + 1}`,
                stiffness: typeof bone.stiffness === 'number' ? bone.stiffness : 1,
                ikLocked: bone.ikLocked === true,
                minAngle: bone.minAngle ?? null,
                maxAngle: bone.maxAngle ?? null
            })),
            meshDensity: rigPreset.meshDensity || 8,
            deformationMode: rigPreset.deformationMode || 'skeletal',
            showBoneLabels: true
        };

        RiggingUtils.ensureMesh(obj.rigging);
        const maxPinNum = rigPreset.pins.reduce((mx, p) => {
            const n = parseInt(p.id.replace('pin-', ''), 10);
            return isNaN(n) ? mx : Math.max(mx, n + 1);
        }, 0);
        this.objects.rigging._nextPinId = maxPinNum;
        this.objects.rigging._nextBoneId = rigPreset.bones.length;
        this.objects.rigging.setTool('skeleton');
        this.objects.rigging._renderBoneListUI();
        this.objects.rigging._updateBoneSelectionUI();
        this.objects.rigging._updateDensitySlider();

        eventBus.emit('history:push');
    },

    _applyGuidedPartRig(session) {
        const preset = session.preset;
        const ordered = this._topologicalSort(preset.parts);
        const trainingRaw = localStorage.getItem('jointTraining_' + preset.key);
        const training = trainingRaw ? JSON.parse(trainingRaw) : null;
        const trained = training?.parts || null;

        ordered.forEach(part => {
            const capture = session.captures[part.partKey];
            if (!capture) return;
            const obj = this.objects.getObjectById(capture.objectId);
            if (!obj) return;

            const trainedPart = trained?.[part.partKey];
            const pivotX = capture.pivotX ?? trainedPart?.pivotOnSelf?.x ?? part.pivotOnSelf?.x ?? 0.5;
            const pivotY = capture.pivotY ?? trainedPart?.pivotOnSelf?.y ?? part.pivotOnSelf?.y ?? 0.5;

            obj.pivotX = pivotX;
            obj.pivotY = pivotY;
            obj.bodyPartData = this._applyGlobalJointLimits({
                partKey: part.partKey,
                charType: preset.key,
                jointName: part.name,
                defaultAngle: capture.localAngle ?? part.defaultAngle
            });

            if (!part.parentPartKey) {
                obj.pinnedTo = null;
                obj.pinRotationMode = 'static';
                obj.jointBaseAngle = capture.localAngle ?? (obj.rotation || 0);
                return;
            }

            const parentCapture = session.captures[part.parentPartKey];
            const parentObj = parentCapture ? this.objects.getObjectById(parentCapture.objectId) : null;
            if (!parentObj) return;

            obj.pinnedTo = parentObj.id;
            obj.pinAnchorX = capture.anchorOnParent?.x ?? trainedPart?.anchorOnParent?.x ?? part.anchorOnParent?.x ?? 0.5;
            obj.pinAnchorY = capture.anchorOnParent?.y ?? trainedPart?.anchorOnParent?.y ?? part.anchorOnParent?.y ?? 0.5;
            obj.pinOffsetX = trainedPart?.pinOffset?.x ?? 0;
            obj.pinOffsetY = trainedPart?.pinOffset?.y ?? 0;
            obj.pinRotationMode = 'joint';
            obj.pinInheritRotation = false;
            obj.jointBaseAngle = capture.localAngle ?? part.defaultAngle;
        });

        if (this.objects._resolvePins) this.objects._resolvePins();
        if (!this._skeletonVisible) this.toggleSkeleton();
        eventBus.emit('history:push');
    },

    _showGuidedRigDoneState(session) {
        const panel = session.panel;
        if (!panel) return;

        const singleImage = session.mode === 'single-image';
        panel.querySelector('.guided-rig-body').innerHTML = `
            <div class="ja-step-label"><i class="fas fa-check-circle" style="color:#22c55e"></i> Guided Rig Complete</div>
            <div class="ja-hint guided-rig-hint">
                ${singleImage
                    ? 'The full character image is now in Skeleton mode. Drag pins to rotate joints, or drag an end pin to solve the whole limb.'
                    : 'The character parts are now connected as a pivot-based skeleton. Hold Shift and drag a body part for IK, or open Tune Joints to refine anchors and pivots.'}
            </div>
            <div class="ja-actions">
                <button id="guided-rig-done-move" class="btn-small ja-btn-green"><i class="fas fa-play"></i> Movements</button>
                <button id="guided-rig-done-pose" class="btn-small ja-btn-amber"><i class="fas fa-bookmark"></i> Poses</button>
                <button id="guided-rig-done-tune" class="btn-small ja-btn-blue"><i class="fas fa-crosshairs"></i> Tune</button>
                <button id="guided-rig-done-close" class="btn-small"><i class="fas fa-times"></i> Close</button>
            </div>
        `;

        panel.querySelector('#guided-rig-done-move')?.addEventListener('click', () => {
            if (singleImage) this.objects.rigging.showMovementPicker();
            else this.showMovementPicker();
        });
        panel.querySelector('#guided-rig-done-pose')?.addEventListener('click', () => {
            if (singleImage) this.objects.rigging.showPoseLibrary();
            else this.showPoseLibrary();
        });
        panel.querySelector('#guided-rig-done-tune')?.addEventListener('click', () => {
            if (singleImage) {
                this.objects.rigging.setTool('skeleton');
                Utils.showToast('Rig Skeleton mode is active — drag pins to rotate joints', 'info');
            } else {
                this.enterJointTuneMode();
            }
        });
        panel.querySelector('#guided-rig-done-close')?.addEventListener('click', () => this._closeGuidedRigWizard());

        Utils.showToast(singleImage ? 'Guided image rig created' : 'Guided part rig assembled', 'success');
    },

    _renderGuidedRigOverlay(ctx) {
        const session = this._guidedRig;
        if (!session) return;

        ctx.save();
        ctx.lineWidth = 2;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';

        Object.values(session.captures).forEach(capture => {
            ctx.beginPath();
            ctx.arc(capture.worldX, capture.worldY, 6, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(34, 197, 94, 0.9)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.fillText(capture.label || capture.objectName || '', capture.worldX + 10, capture.worldY - 10);
        });

        const hover = session.hoverTarget;
        if (hover?.obj) {
            ctx.save();
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.95)';
            ctx.fillStyle = 'rgba(96, 165, 250, 0.08)';
            ctx.lineWidth = 2;
            ctx.strokeRect(hover.obj.x, hover.obj.y, hover.obj.width, hover.obj.height);
            ctx.fillRect(hover.obj.x, hover.obj.y, hover.obj.width, hover.obj.height);
            ctx.beginPath();
            ctx.arc(hover.worldX, hover.worldY, 8, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(96, 165, 250, 0.95)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();
            const hoverLabel = hover.part
                ? `${hover.part.name} -> ${hover.obj.name || hover.obj.type}`
                : (hover.obj.name || hover.obj.type || 'Target');
            const bubbleWidth = Math.max(150, hoverLabel.length * 6.4);
            const bubbleX = Math.max(12, Math.min(this.stage.width - bubbleWidth - 12, hover.worldX + 14));
            const bubbleY = Math.max(12, hover.worldY - 34);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
            ctx.fillRect(bubbleX, bubbleY, bubbleWidth, 22);
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
            ctx.strokeRect(bubbleX, bubbleY, bubbleWidth, 22);
            ctx.fillStyle = '#eff6ff';
            ctx.fillText(hoverLabel, bubbleX + 8, bubbleY + 14);
            ctx.restore();
        }

        const current = session.steps[session.currentStepIndex];
        if (current) {
            const message = `Click: ${current.label}`;
            const width = Math.max(210, message.length * 7.2);
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.fillRect(16, 16, width, 48);
            ctx.strokeStyle = 'rgba(99, 102, 241, 0.9)';
            ctx.strokeRect(16, 16, width, 48);
            ctx.fillStyle = '#fff';
            ctx.fillText(message, 28, 34);
            ctx.fillStyle = 'rgba(191, 219, 254, 0.95)';
            ctx.fillText(session.mode === 'single-image' ? 'landmark capture' : 'pivot capture', 28, 52);
        }

        ctx.restore();
    },

    _findGuidedPartObject(session, step, stageX, stageY) {
        const candidates = session.selectedObjects.filter(obj => obj.visible !== false);
        const part = session.preset.parts.find(p => p.partKey === step.key);
        const usedByOtherPart = new Set(
            Object.entries(session.captures)
                .filter(([key]) => key !== step.key)
                .map(([, capture]) => capture.objectId)
        );

        const scored = candidates
            .filter(obj => !usedByOtherPart.has(obj.id))
            .map(obj => ({
                obj,
                part,
                score: this._scoreGuidedPartCandidate(session, part, obj, stageX, stageY)
            }))
            .sort((a, b) => b.score - a.score);

        if (!scored.length) return null;
        return scored[0].score >= 30 ? { obj: scored[0].obj, part } : null;
    },

    _scoreGuidedPartCandidate(session, part, obj, stageX, stageY) {
        let score = 0;
        if (this._pointHitsObject(obj, stageX, stageY)) score += 160;

        const objName = (obj.name || '').toLowerCase().trim();
        if (objName) score += this._scorePartMatch(objName, part);

        if (session.predictedParts?.[part.partKey]?.id === obj.id) score += 60;

        const expected = this._getGuidedExpectedAnchorWorld(session, part);
        if (expected) {
            const dist = Math.hypot(stageX - expected.x, stageY - expected.y);
            score += Math.max(0, 65 - dist * 0.75);
        }

        const centerX = obj.x + obj.width / 2;
        const centerY = obj.y + obj.height / 2;
        const centerDist = Math.hypot(stageX - centerX, stageY - centerY);
        score += Math.max(0, 36 - centerDist * 0.18);
        return score;
    },

    _getGuidedExpectedAnchorWorld(session, part) {
        if (!part) return null;

        const predicted = session.predictedParts?.[part.partKey];
        if (!part.parentPartKey) {
            if (!predicted) return null;
            return predicted.getPivotPoint
                ? predicted.getPivotPoint()
                : {
                    x: predicted.x + predicted.width * (predicted.pivotX ?? 0.5),
                    y: predicted.y + predicted.height * (predicted.pivotY ?? 0.5)
                };
        }

        const parentCapture = session.captures[part.parentPartKey];
        const parentObj = parentCapture
            ? this.objects.getObjectById(parentCapture.objectId)
            : session.predictedParts?.[part.parentPartKey];
        if (!parentObj) return parentCapture ? { x: parentCapture.worldX, y: parentCapture.worldY } : null;

        const anchor = part.anchorOnParent || { x: 0.5, y: 0.5 };
        return this._getObjectWorldPoint(parentObj, anchor.x, anchor.y);
    },

    _deriveAnchorFromWorldPoint(parentObj, worldX, worldY) {
        return this._getObjectNormalizedPoint(parentObj, worldX, worldY);
    },

    _getObjectPivotPoint(obj) {
        if (!obj) return { x: 0, y: 0 };
        return obj.getPivotPoint
            ? obj.getPivotPoint()
            : {
                x: obj.x + obj.width * (obj.pivotX ?? 0.5),
                y: obj.y + obj.height * (obj.pivotY ?? 0.5)
            };
    },

    _getObjectWorldPoint(obj, normX = 0.5, normY = 0.5) {
        if (!obj) return { x: 0, y: 0 };
        const pivot = this._getObjectPivotPoint(obj);
        const rawX = obj.x + obj.width * normX;
        const rawY = obj.y + obj.height * normY;
        const rad = (obj.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = rawX - pivot.x;
        const dy = rawY - pivot.y;
        return {
            x: pivot.x + dx * cos - dy * sin,
            y: pivot.y + dx * sin + dy * cos
        };
    },

    _getObjectNormalizedPoint(obj, worldX, worldY) {
        if (!obj) return { x: 0.5, y: 0.5 };
        const pivot = this._getObjectPivotPoint(obj);
        const rad = -(obj.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const dx = worldX - pivot.x;
        const dy = worldY - pivot.y;
        const localX = pivot.x + dx * cos - dy * sin;
        const localY = pivot.y + dx * sin + dy * cos;
        return {
            x: this._clamp01(obj.width ? (localX - obj.x) / obj.width : 0.5),
            y: this._clamp01(obj.height ? (localY - obj.y) / obj.height : 0.5)
        };
    },

    _normalizeDegrees(angle) {
        let value = angle;
        while (value > 180) value -= 360;
        while (value < -180) value += 360;
        return value;
    },

    _pointHitsObject(obj, stageX, stageY) {
        if (!obj) return false;
        // Add 5% padding on each side so edge clicks (e.g. feet at bottom of image) are not rejected
        const padX = obj.width * 0.05;
        const padY = obj.height * 0.05;
        return stageX >= obj.x - padX && stageX <= obj.x + obj.width + padX &&
               stageY >= obj.y - padY && stageY <= obj.y + obj.height + padY;
    },

    _clamp01(value) {
        return Math.max(0, Math.min(1, value));
    },

    _closeGuidedRigWizard() {
        this._teardownGuidedRigCapture();
        document.getElementById('guided-rig-panel')?.remove();
        this._guidedRig = null;
        this.stage.requestRender();
    },

    exitJointMode() {
        this._stopPreview?.();
        this._closeGuidedRigWizard();

        if (this._smartCutActive || document.getElementById('smart-cut-panel')) {
            this._exitSmartCut();
            document.getElementById('smart-cut-panel')?.remove();
        }

        if (this._bsActive || document.getElementById('body-stencil-panel')) {
            this._exitBodyStencil();
            document.getElementById('body-stencil-panel')?.remove();
        }

        if (this._bslActive || document.getElementById('body-slicer-panel')) {
            this._exitBodySlicer();
            document.getElementById('body-slicer-panel')?.remove();
        }

        if (this._jointTuneActive || document.getElementById('joint-tune-panel')) {
            this._exitJointTuneMode();
        }

        if (this._bodyTagActive || document.getElementById('joint-body-tags-panel')) {
            this._exitBodyTagMode();
        }

        document.getElementById('joint-assembly-panel')?.remove();
        document.getElementById('joint-movement-picker')?.remove();
        document.getElementById('joint-pose-panel')?.remove();

        if (this._skeletonVisible) this.toggleSkeleton();
        if (this._constraintArcsVisible) this.toggleConstraintArcs();

        this._jointRotateDrag = null;
        this._activePreset = null;
        this._assemblyMap = {};

        if (this.objects) {
            this.objects._jointPlaceMode = false;
            this.objects._jointPlaceObj = null;
            document.getElementById('joint-place-hint')?.remove();
            this.objects.updateProperties?.();
        }

        this.stage.canvas.style.cursor = '';
        this.stage.viewport.style.cursor = '';
        this.stage.requestRender();
        Utils.showToast('Joint mode exited', 'info');
    },

    _teardownGuidedRigCapture() {
        if (this._guidedRigOverlayHandler) {
            eventBus.off('stage:render-overlay', this._guidedRigOverlayHandler);
            this._guidedRigOverlayHandler = null;
        }
        if (this._guidedRigMouseDown) {
            this.stage.canvas.removeEventListener('mousedown', this._guidedRigMouseDown, true);
            this._guidedRigMouseDown = null;
        }
        if (this._guidedRigMouseMove) {
            this.stage.canvas.removeEventListener('mousemove', this._guidedRigMouseMove, true);
            this._guidedRigMouseMove = null;
        }
        this.stage.canvas.style.cursor = '';
    },


});
