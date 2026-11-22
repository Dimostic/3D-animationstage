/* ============================================================
   Stage Capture — Capture & train AI with stage object arrangements
   ============================================================
   Captures the spatial arrangement of all stage objects including
   names, types, dimensions, positions, rotations, joints, rigging,
   overlaps, and relative positions. Supports multi-frame capture
   sessions (e.g. walk cycle frames) and feeds data to AI for training.
   ============================================================ */

class StageCapture {
    constructor(objectManager, stageManager, aiMode) {
        this.objects = objectManager;
        this.stage = stageManager;
        this.ai = aiMode;

        // Current capture session
        this.session = null; // { label, captures: [], created }
        this.savedSessions = this._readStoredJson('stageCapturesSessions', []);

        this.modal = null;
        this.init();
    }

    init() {
        // Toolbar button
        document.getElementById('btn-stage-capture')?.addEventListener('click', () => this.openPanel());

        // Context menu hook — ObjectManager will call this
        this._hookContextMenu();
    }

    _readStoredJson(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return Array.isArray(fallback) ? [...fallback] : { ...(fallback || {}) };
            const parsed = JSON.parse(raw);
            if (Array.isArray(fallback)) return Array.isArray(parsed) ? parsed : [...fallback];
            if (fallback && typeof fallback === 'object') {
                return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                    ? parsed
                    : { ...fallback };
            }
            return parsed ?? fallback;
        } catch (error) {
            console.warn(`[StageCapture] Failed to parse stored JSON for ${key}`, error);
            return Array.isArray(fallback) ? [...fallback] : { ...(fallback || {}) };
        }
    }

    _hookContextMenu() {
        // We'll inject "Capture Stage Objects" into the context menu via a patch
        // on ObjectManager's showContextMenu. See bottom of init.
        const om = this.objects;
        const origShowCtx = om.showContextMenu.bind(om);
        om.showContextMenu = (screenX, screenY, stagePos) => {
            origShowCtx(screenX, screenY, stagePos);
            // Inject our item into the existing menu
            const menu = document.querySelector('.context-menu');
            if (!menu) return;
            const divider = document.createElement('div');
            divider.className = 'context-menu-divider';
            menu.appendChild(divider);
            const item = document.createElement('div');
            item.className = 'context-menu-item';
            item.dataset.action = 'Capture Stage';
            item.innerHTML = '<i class="fas fa-camera"></i> Capture Stage Objects';
            item.addEventListener('click', () => {
                menu.remove();
                this.openPanel();
            });
            menu.appendChild(item);
        };
    }

    // ========== Capture Engine ==========

    /**
     * Capture the current state of all visible stage objects.
     * Returns a structured snapshot.
     */
    captureCurrentState(frameLabel) {
        const objs = this.objects.objects.filter(o => o.visible);
        if (objs.length === 0) {
            Utils.showToast('No visible objects on stage to capture', 'warning');
            return null;
        }

        const stageW = this.stage.canvas.width / (this.stage.zoom || 1);
        const stageH = this.stage.canvas.height / (this.stage.zoom || 1);

        // Compute all bounds first for overlap detection
        const boundsMap = new Map();
        objs.forEach(o => boundsMap.set(o.id, o.getBounds()));

        const capturedObjects = objs.map(o => {
            const b = boundsMap.get(o.id);
            return {
                id: o.id,
                name: o.name || o.type,
                type: o.type,
                // Absolute position
                x: Math.round(o.x),
                y: Math.round(o.y),
                width: Math.round(o.width),
                height: Math.round(o.height),
                centerX: Math.round(b.centerX),
                centerY: Math.round(b.centerY),
                // Relative position (fraction of stage)
                relX: +(o.x / stageW).toFixed(3),
                relY: +(o.y / stageH).toFixed(3),
                relW: +(o.width / stageW).toFixed(3),
                relH: +(o.height / stageH).toFixed(3),
                // Transform
                rotation: o.rotation || 0,
                scaleX: o.scaleX ?? 1,
                scaleY: o.scaleY ?? 1,
                flipH: o.flipH || false,
                flipV: o.flipV || false,
                opacity: o.opacity ?? 1,
                // Appearance
                fill: o.fill || 'none',
                stroke: o.stroke || 'none',
                strokeWidth: o.strokeWidth || 0,
                borderRadius: o.borderRadius || 0,
                // Layer
                zIndex: objs.indexOf(o),
                layer: o.layer || 'default',
                groupId: o.groupId || null,
                // Rigging & joints
                joints: o.joints ? o.joints.map(j => ({
                    name: j.name || 'joint',
                    x: j.x,
                    y: j.y,
                    direction: j.direction
                })) : [],
                hasRigging: !!(o.rigging && (o.rigging.bones?.length > 0 || o.rigging.pins?.length > 0)),
                rigging: o.rigging ? {
                    boneCount: (o.rigging.bones || []).length,
                    bones: (o.rigging.bones || []).map(bone => ({
                        name: bone.name,
                        stiffness: bone.stiffness
                    })),
                    pinCount: (o.rigging.pins || []).length
                } : null,
                // Pin connections
                pinnedTo: o.pinnedTo || null,
                // Flex
                flexEnabled: o.flexEnabled || false,
                // Pivot
                pivotX: o.pivotX ?? 0.5,
                pivotY: o.pivotY ?? 0.5
            };
        });

        // Compute spatial relationships (overlaps, adjacency, contact points)
        const relationships = [];
        for (let i = 0; i < capturedObjects.length; i++) {
            for (let j = i + 1; j < capturedObjects.length; j++) {
                const a = capturedObjects[i];
                const b = capturedObjects[j];
                const rel = this._computeRelationship(a, b);
                if (rel) relationships.push(rel);
            }
        }

        const capture = {
            frameLabel: frameLabel || `Frame ${(this.session?.captures.length || 0) + 1}`,
            timestamp: Date.now(),
            stage: { width: Math.round(stageW), height: Math.round(stageH) },
            objectCount: capturedObjects.length,
            objects: capturedObjects,
            relationships
        };

        return capture;
    }

    /**
     * Compute spatial relationship between two captured objects.
     */
    _computeRelationship(a, b) {
        // Bounding box overlap check
        const aLeft = a.x, aRight = a.x + a.width, aTop = a.y, aBottom = a.y + a.height;
        const bLeft = b.x, bRight = b.x + b.width, bTop = b.y, bBottom = b.y + b.height;

        const overlapX = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
        const overlapY = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));
        const overlaps = overlapX > 0 && overlapY > 0;

        // Distance between centers
        const dx = b.centerX - a.centerX;
        const dy = b.centerY - a.centerY;
        const distance = Math.round(Math.sqrt(dx * dx + dy * dy));

        // Relative direction
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        let direction = '';
        if (angle >= -22.5 && angle < 22.5) direction = 'right';
        else if (angle >= 22.5 && angle < 67.5) direction = 'below-right';
        else if (angle >= 67.5 && angle < 112.5) direction = 'below';
        else if (angle >= 112.5 && angle < 157.5) direction = 'below-left';
        else if (angle >= 157.5 || angle < -157.5) direction = 'left';
        else if (angle >= -157.5 && angle < -112.5) direction = 'above-left';
        else if (angle >= -112.5 && angle < -67.5) direction = 'above';
        else direction = 'above-right';

        // Contact/adjacency detection (within 5px gap)
        const gap = 5;
        const touching = !overlaps && (
            (Math.abs(aRight - bLeft) <= gap || Math.abs(bRight - aLeft) <= gap) &&
            overlapY > -gap ||
            (Math.abs(aBottom - bTop) <= gap || Math.abs(bBottom - aTop) <= gap) &&
            overlapX > -gap
        );

        // Containment
        const aContainsB = aLeft <= bLeft && aRight >= bRight && aTop <= bTop && aBottom >= bBottom;
        const bContainsA = bLeft <= aLeft && bRight >= aRight && bTop <= aTop && bBottom >= aBottom;

        // Pin connection
        const pinned = a.pinnedTo === b.id || b.pinnedTo === a.id;

        // Only return if there's something notable
        if (!overlaps && !touching && !aContainsB && !bContainsA && !pinned && distance > 300) return null;

        const rel = {
            objectA: a.name,
            objectB: b.name,
            direction, // B is {direction} of A
            distance,
            overlaps,
            overlapArea: overlaps ? overlapX * overlapY : 0,
            touching,
            aContainsB,
            bContainsA,
            pinned
        };

        // Contact point (midpoint of overlap/touch area)
        if (overlaps || touching) {
            rel.contactX = Math.round((Math.max(aLeft, bLeft) + Math.min(aRight, bRight)) / 2);
            rel.contactY = Math.round((Math.max(aTop, bTop) + Math.min(aBottom, bBottom)) / 2);
        }

        return rel;
    }

    // ========== Session Management ==========

    startSession(label) {
        this.session = {
            label: label || 'Untitled Capture',
            captures: [],
            created: Date.now()
        };
        this._renderPanel();
        Utils.showToast('Capture session started — arrange objects and click "Capture Frame"', 'info');
    }

    addCapture(frameLabel) {
        if (!this.session) this.startSession();
        const capture = this.captureCurrentState(frameLabel);
        if (!capture) return;
        this.session.captures.push(capture);
        this._renderPanel();
        Utils.showToast(`Captured frame ${this.session.captures.length}: "${capture.frameLabel}"`, 'success');
    }

    removeCapture(index) {
        if (!this.session) return;
        this.session.captures.splice(index, 1);
        this._renderPanel();
    }

    clearSession() {
        this.session = null;
        this._renderPanel();
    }

    saveSession() {
        if (!this.session || this.session.captures.length === 0) {
            Utils.showToast('No captures to save', 'warning');
            return;
        }
        // Avoid duplicates — replace if same label exists
        const idx = this.savedSessions.findIndex(s => s.label === this.session.label);
        if (idx >= 0) this.savedSessions[idx] = JSON.parse(JSON.stringify(this.session));
        else this.savedSessions.push(JSON.parse(JSON.stringify(this.session)));

        const json = JSON.stringify(this.savedSessions);
        // Size check: warn if approaching localStorage quota (~5MB)
        if (json.length > 4 * 1024 * 1024) {
            Utils.showToast('Capture sessions are very large. Consider exporting as a file to avoid data loss.', 'warning', 5000);
            // Offer file download as fallback
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `stage-captures-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
        }
        try {
            localStorage.setItem('stageCapturesSessions', json);
        } catch (e) {
            Utils.showToast('localStorage full — sessions exported as file instead', 'error');
            const blob = new Blob([json], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `stage-captures-backup-${Date.now()}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            return;
        }
        Utils.showToast(`Session "${this.session.label}" saved (${this.session.captures.length} frames)`, 'success');
        this._renderPanel();
    }

    loadSession(index) {
        if (index < 0 || index >= this.savedSessions.length) return;
        this.session = JSON.parse(JSON.stringify(this.savedSessions[index]));
        this._renderPanel();
    }

    deleteSession(index) {
        this.savedSessions.splice(index, 1);
        localStorage.setItem('stageCapturesSessions', JSON.stringify(this.savedSessions));
        this._renderPanel();
    }

    // ========== AI Training ==========

    /**
     * Format captured data as structured training text for the AI.
     */
    formatForTraining(session) {
        session = session || this.session;
        if (!session || session.captures.length === 0) return '';

        const lines = [];
        lines.push(`# Character Arrangement: ${session.label}`);
        lines.push(`Captured: ${new Date(session.created).toLocaleString()}`);
        lines.push(`Frames: ${session.captures.length}`);
        lines.push('');

        session.captures.forEach((cap, fi) => {
            lines.push(`## ${cap.frameLabel}`);
            lines.push(`Stage: ${cap.stage.width}×${cap.stage.height}px | Objects: ${cap.objectCount}`);
            lines.push('');

            // Object table
            lines.push('### Objects');
            lines.push('| # | Name | Type | Position (x,y) | Size (w×h) | Rel Pos (x%, y%) | Rotation | Joints | Rigging | Pinned To |');
            lines.push('|---|------|------|-----------------|------------|-------------------|----------|--------|---------|-----------|');
            cap.objects.forEach((o, i) => {
                const joints = o.joints.length > 0 ? `${o.joints.length} joint(s)` : '—';
                const rigging = o.hasRigging ? `${o.rigging.boneCount} bones, ${o.rigging.pinCount} pins` : '—';
                const pinned = o.pinnedTo || '—';
                lines.push(`| ${i + 1} | ${o.name} | ${o.type} | ${o.x}, ${o.y} | ${o.width}×${o.height} | ${(o.relX * 100).toFixed(1)}%, ${(o.relY * 100).toFixed(1)}% | ${o.rotation}° | ${joints} | ${rigging} | ${pinned} |`);
            });
            lines.push('');

            // Relationships
            if (cap.relationships.length > 0) {
                lines.push('### Spatial Relationships');
                lines.push('| Object A | Object B | Direction | Distance | Overlap | Touching | Contact Point | Pinned |');
                lines.push('|----------|----------|-----------|----------|---------|----------|---------------|--------|');
                cap.relationships.forEach(r => {
                    const contact = r.contactX !== undefined ? `${r.contactX}, ${r.contactY}` : '—';
                    lines.push(`| ${r.objectA} | ${r.objectB} | B is ${r.direction} of A | ${r.distance}px | ${r.overlaps ? r.overlapArea + 'px²' : '—'} | ${r.touching ? 'Yes' : '—'} | ${contact} | ${r.pinned ? 'Yes' : '—'} |`);
                });
                lines.push('');
            }

            lines.push('---');
            lines.push('');
        });

        return lines.join('\n');
    }

    /**
     * Generate AI training prompt from the capture data.
     */
    buildTrainingPrompt(session) {
        session = session || this.session;
        if (!session || session.captures.length === 0) return '';

        const data = this.formatForTraining(session);
        const isMultiFrame = session.captures.length > 1;

        let prompt = `TRAINING DATA — Learn this character arrangement:\n\n`;
        prompt += data + '\n\n';
        prompt += `INSTRUCTIONS:\n`;
        prompt += `This capture shows how to arrange a "${session.label}" character.\n`;

        if (isMultiFrame) {
            prompt += `It contains ${session.captures.length} frames showing sequential poses (e.g. walk cycle, action sequence).\n`;
            prompt += `Learn the progression of object positions, rotations, and relationships across frames.\n`;
        } else {
            prompt += `Learn the exact spatial arrangement: which objects are used, their relative positions, sizes, overlaps, and connections.\n`;
        }

        prompt += `When asked to build or arrange a "${session.label}", recreate this arrangement using the same object types, proportions, and spatial relationships.\n`;
        prompt += `Adapt to different stage sizes by using the relative positions (percentages) rather than absolute pixel values.\n`;

        return prompt;
    }

    /**
     * Send capture data to AI mode for training.
     */
    trainAI(session) {
        session = session || this.session;
        if (!session || session.captures.length === 0) {
            Utils.showToast('No capture data to train with', 'warning');
            return;
        }

        const prompt = this.buildTrainingPrompt(session);

        // Store in AI knowledge cache
        const key = `capture:${session.label.toLowerCase().replace(/\s+/g, '-')}`;
        if (!this.ai.captureKnowledge) this.ai.captureKnowledge = {};
        this.ai.captureKnowledge[key] = {
            label: session.label,
            prompt,
            session: JSON.parse(JSON.stringify(session)),
            trained: Date.now()
        };

        // Persist to localStorage
        localStorage.setItem('aiCaptureKnowledge', JSON.stringify(this.ai.captureKnowledge));

        Utils.showToast(`AI trained on "${session.label}" (${session.captures.length} frames)`, 'success');
        this._renderPanel();
    }

    // ========== Export ==========

    exportSessionJSON(session) {
        session = session || this.session;
        if (!session) return;
        const json = JSON.stringify(session, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capture-${session.label.replace(/\s+/g, '-').toLowerCase()}.json`;
        a.click();
        URL.revokeObjectURL(url);
    }

    exportSessionMarkdown(session) {
        session = session || this.session;
        if (!session) return;
        const md = this.formatForTraining(session);
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capture-${session.label.replace(/\s+/g, '-').toLowerCase()}.md`;
        a.click();
        URL.revokeObjectURL(url);
    }

    importSessionJSON() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = () => {
                try {
                    const data = JSON.parse(reader.result);
                    if (!data.label || !data.captures) throw new Error('Invalid capture file');
                    this.session = data;
                    this._renderPanel();
                    Utils.showToast(`Imported "${data.label}" (${data.captures.length} frames)`, 'success');
                } catch (e) {
                    Utils.showToast('Invalid capture file', 'error');
                }
            };
            reader.readAsText(file);
        });
        input.click();
    }

    // ========== UI Panel ==========

    openPanel() {
        if (this.modal) {
            this.modal.remove();
            this.modal = null;
        }

        this.modal = document.createElement('div');
        this.modal.className = 'stage-capture-modal';
        this.modal.id = 'stage-capture-modal';

        // Load any previously trained knowledge
        if (!this.ai.captureKnowledge) {
            this.ai.captureKnowledge = this._readStoredJson('aiCaptureKnowledge', {});
        }

        document.body.appendChild(this.modal);
        this._renderPanel();
    }

    closePanel() {
        this.modal?.remove();
        this.modal = null;
    }

    _renderPanel() {
        if (!this.modal) return;

        const hasSession = !!this.session;
        const frameCount = hasSession ? this.session.captures.length : 0;
        const hasSaved = this.savedSessions.length > 0;
        const trainedKeys = this.ai.captureKnowledge ? Object.keys(this.ai.captureKnowledge) : [];

        this.modal.innerHTML = `
            <div class="sc-panel">
                <div class="sc-header">
                    <div class="sc-title"><i class="fas fa-camera"></i> Capture Stage Objects</div>
                    <button class="sc-close" title="Close"><i class="fas fa-times"></i></button>
                </div>

                <div class="sc-body">
                    <!-- Session Controls -->
                    <div class="sc-section">
                        <div class="sc-section-title">Capture Session</div>
                        ${!hasSession ? `
                            <div class="sc-start-row">
                                <input type="text" class="sc-label-input" id="sc-session-label" placeholder="e.g. Human Walk Cycle, Standing Pose..." value="">
                                <button class="sc-btn sc-btn-primary" id="sc-start-session">
                                    <i class="fas fa-play"></i> Start Session
                                </button>
                            </div>
                            <div class="sc-hint">Name your capture session, then arrange objects on stage and capture frames.</div>
                        ` : `
                            <div class="sc-session-info">
                                <span class="sc-session-name"><i class="fas fa-folder-open"></i> ${this._esc(this.session.label)}</span>
                                <span class="sc-frame-count">${frameCount} frame${frameCount !== 1 ? 's' : ''}</span>
                            </div>
                            <div class="sc-capture-row">
                                <input type="text" class="sc-label-input sc-frame-label" id="sc-frame-label" placeholder="Frame label (optional)">
                                <button class="sc-btn sc-btn-primary" id="sc-capture-frame">
                                    <i class="fas fa-camera"></i> Capture Frame
                                </button>
                            </div>
                            <div class="sc-action-row">
                                <button class="sc-btn sc-btn-success" id="sc-train-ai" ${frameCount === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-brain"></i> Train AI
                                </button>
                                <button class="sc-btn" id="sc-save-session" ${frameCount === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-save"></i> Save
                                </button>
                                <button class="sc-btn" id="sc-export-json" ${frameCount === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-download"></i> JSON
                                </button>
                                <button class="sc-btn" id="sc-export-md" ${frameCount === 0 ? 'disabled' : ''}>
                                    <i class="fas fa-file-alt"></i> Markdown
                                </button>
                                <button class="sc-btn sc-btn-danger" id="sc-clear-session">
                                    <i class="fas fa-trash"></i> Clear
                                </button>
                            </div>
                        `}
                    </div>

                    <!-- Captured Frames -->
                    ${hasSession && frameCount > 0 ? `
                    <div class="sc-section">
                        <div class="sc-section-title">Captured Frames</div>
                        <div class="sc-frames-list">
                            ${this.session.captures.map((cap, i) => `
                                <div class="sc-frame-item" data-index="${i}">
                                    <div class="sc-frame-head">
                                        <span class="sc-frame-num">${i + 1}</span>
                                        <span class="sc-frame-name">${this._esc(cap.frameLabel)}</span>
                                        <span class="sc-frame-meta">${cap.objectCount} obj · ${cap.relationships.length} rel</span>
                                        <button class="sc-frame-toggle" data-idx="${i}" title="Expand"><i class="fas fa-chevron-down"></i></button>
                                        <button class="sc-frame-copy" data-idx="${i}" title="Copy table"><i class="fas fa-copy"></i></button>
                                        <button class="sc-frame-del" data-idx="${i}" title="Remove"><i class="fas fa-times"></i></button>
                                    </div>
                                    <div class="sc-frame-detail hidden" id="sc-frame-detail-${i}">
                                        ${this._renderFrameTable(cap)}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Saved Sessions -->
                    ${hasSaved ? `
                    <div class="sc-section">
                        <div class="sc-section-title">Saved Sessions</div>
                        <div class="sc-saved-list">
                            ${this.savedSessions.map((s, i) => {
                                const trained = trainedKeys.includes(`capture:${s.label.toLowerCase().replace(/\s+/g, '-')}`);
                                return `
                                <div class="sc-saved-item">
                                    <span class="sc-saved-name">${this._esc(s.label)}</span>
                                    <span class="sc-saved-meta">${s.captures.length} frames</span>
                                    ${trained ? '<span class="sc-trained-badge"><i class="fas fa-brain"></i> Trained</span>' : ''}
                                    <button class="sc-btn sc-btn-sm" data-load="${i}" title="Load"><i class="fas fa-folder-open"></i></button>
                                    <button class="sc-btn sc-btn-sm" data-del-saved="${i}" title="Delete"><i class="fas fa-trash"></i></button>
                                </div>`;
                            }).join('')}
                        </div>
                    </div>
                    ` : ''}

                    <!-- Import -->
                    <div class="sc-section">
                        <div class="sc-import-row">
                            <button class="sc-btn" id="sc-import-json">
                                <i class="fas fa-file-import"></i> Import from File
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        this._bindPanelEvents();
    }

    _renderFrameTable(capture) {
        let html = '<div class="sc-table-wrap">';

        // Objects table
        html += '<table class="sc-table"><thead><tr>';
        html += '<th>#</th><th>Name</th><th>Type</th><th>Position</th><th>Size</th><th>Rel %</th><th>Rot</th><th>Joints</th><th>Rigging</th><th>Pinned</th>';
        html += '</tr></thead><tbody>';
        capture.objects.forEach((o, i) => {
            const joints = o.joints.length > 0 ? `${o.joints.length}` : '—';
            const rigging = o.hasRigging ? `${o.rigging.boneCount}B ${o.rigging.pinCount}P` : '—';
            html += `<tr>
                <td>${i + 1}</td>
                <td>${this._esc(o.name)}</td>
                <td>${o.type}</td>
                <td>${o.x}, ${o.y}</td>
                <td>${o.width}×${o.height}</td>
                <td>${(o.relX * 100).toFixed(0)}%, ${(o.relY * 100).toFixed(0)}%</td>
                <td>${o.rotation}°</td>
                <td>${joints}</td>
                <td>${rigging}</td>
                <td>${o.pinnedTo || '—'}</td>
            </tr>`;
        });
        html += '</tbody></table>';

        // Relationships table
        if (capture.relationships.length > 0) {
            html += '<div class="sc-rel-title">Relationships</div>';
            html += '<table class="sc-table sc-table-rel"><thead><tr>';
            html += '<th>Object A</th><th>Object B</th><th>Direction</th><th>Dist</th><th>Overlap</th><th>Touch</th><th>Contact</th><th>Pin</th>';
            html += '</tr></thead><tbody>';
            capture.relationships.forEach(r => {
                const contact = r.contactX !== undefined ? `${r.contactX},${r.contactY}` : '—';
                html += `<tr>
                    <td>${this._esc(r.objectA)}</td>
                    <td>${this._esc(r.objectB)}</td>
                    <td>${r.direction}</td>
                    <td>${r.distance}px</td>
                    <td>${r.overlaps ? r.overlapArea + 'px²' : '—'}</td>
                    <td>${r.touching ? '✓' : '—'}</td>
                    <td>${contact}</td>
                    <td>${r.pinned ? '✓' : '—'}</td>
                </tr>`;
            });
            html += '</tbody></table>';
        }

        html += '</div>';
        return html;
    }

    _bindPanelEvents() {
        if (!this.modal) return;

        // Close
        this.modal.querySelector('.sc-close')?.addEventListener('click', () => this.closePanel());

        // Start session
        this.modal.querySelector('#sc-start-session')?.addEventListener('click', () => {
            const label = (this.modal.querySelector('#sc-session-label')?.value || '').trim() || 'Untitled Capture';
            this.startSession(label);
        });

        // Capture frame
        this.modal.querySelector('#sc-capture-frame')?.addEventListener('click', () => {
            const label = (this.modal.querySelector('#sc-frame-label')?.value || '').trim();
            this.addCapture(label);
        });

        // Train AI
        this.modal.querySelector('#sc-train-ai')?.addEventListener('click', () => this.trainAI());

        // Save session
        this.modal.querySelector('#sc-save-session')?.addEventListener('click', () => this.saveSession());

        // Export
        this.modal.querySelector('#sc-export-json')?.addEventListener('click', () => this.exportSessionJSON());
        this.modal.querySelector('#sc-export-md')?.addEventListener('click', () => this.exportSessionMarkdown());

        // Clear
        this.modal.querySelector('#sc-clear-session')?.addEventListener('click', async () => {
            if (await Utils.showConfirm('Clear current capture session?')) this.clearSession();
        });

        // Import
        this.modal.querySelector('#sc-import-json')?.addEventListener('click', () => this.importSessionJSON());

        // Frame toggles
        this.modal.querySelectorAll('.sc-frame-toggle').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = btn.dataset.idx;
                const detail = this.modal.querySelector(`#sc-frame-detail-${idx}`);
                if (detail) {
                    detail.classList.toggle('hidden');
                    btn.querySelector('i').classList.toggle('fa-chevron-down');
                    btn.querySelector('i').classList.toggle('fa-chevron-up');
                }
            });
        });

        // Frame copy
        this.modal.querySelectorAll('.sc-frame-copy').forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = parseInt(btn.dataset.idx);
                const cap = this.session?.captures[idx];
                if (!cap) return;
                const text = this._frameToText(cap);
                navigator.clipboard.writeText(text).then(() => {
                    Utils.showToast('Frame data copied to clipboard', 'success');
                });
            });
        });

        // Frame delete
        this.modal.querySelectorAll('.sc-frame-del').forEach(btn => {
            btn.addEventListener('click', () => {
                this.removeCapture(parseInt(btn.dataset.idx));
            });
        });

        // Load saved
        this.modal.querySelectorAll('[data-load]').forEach(btn => {
            btn.addEventListener('click', () => this.loadSession(parseInt(btn.dataset.load)));
        });

        // Delete saved
        this.modal.querySelectorAll('[data-del-saved]').forEach(btn => {
            btn.addEventListener('click', async () => {
                if (await Utils.showConfirm('Delete this saved session?')) this.deleteSession(parseInt(btn.dataset.delSaved));
            });
        });

        // Enter key on session label starts session
        this.modal.querySelector('#sc-session-label')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.modal.querySelector('#sc-start-session')?.click();
        });

        // Enter key on frame label captures
        this.modal.querySelector('#sc-frame-label')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') this.modal.querySelector('#sc-capture-frame')?.click();
        });
    }

    _frameToText(capture) {
        let text = `${capture.frameLabel} | Stage: ${capture.stage.width}×${capture.stage.height} | Objects: ${capture.objectCount}\n\n`;
        text += 'Objects:\n';
        text += '# | Name | Type | Pos (x,y) | Size (w×h) | Rel% | Rot | Joints | Rigging | Pinned\n';
        text += '-'.repeat(90) + '\n';
        capture.objects.forEach((o, i) => {
            const joints = o.joints.length > 0 ? `${o.joints.length}` : '—';
            const rigging = o.hasRigging ? `${o.rigging.boneCount}B ${o.rigging.pinCount}P` : '—';
            text += `${i + 1} | ${o.name} | ${o.type} | ${o.x},${o.y} | ${o.width}×${o.height} | ${(o.relX * 100).toFixed(0)}%,${(o.relY * 100).toFixed(0)}% | ${o.rotation}° | ${joints} | ${rigging} | ${o.pinnedTo || '—'}\n`;
        });
        if (capture.relationships.length > 0) {
            text += '\nRelationships:\n';
            capture.relationships.forEach(r => {
                text += `${r.objectA} → ${r.objectB}: ${r.direction}, ${r.distance}px`;
                if (r.overlaps) text += `, overlap ${r.overlapArea}px²`;
                if (r.touching) text += ', touching';
                if (r.pinned) text += ', pinned';
                text += '\n';
            });
        }
        return text;
    }

    _esc(str) {
        const d = document.createElement('div');
        d.textContent = str || '';
        return d.innerHTML;
    }
}
