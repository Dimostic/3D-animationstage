/**
 * Joint System — Skeleton overlay, joint rotation handles & tune mode
 * (split from joint-system.js for maintainability)
 */

JointSystem._getMovementTiltDelta = function(keyframe, partKey, axis) {
        return keyframe?.tilts?.[partKey]?.[axis] ?? 0;
    }

JointSystem._getMovementOffsetDelta = function(keyframe, partKey, axis) {
        return keyframe?.offsets?.[partKey]?.[axis] ?? 0;
    }

JointSystem.evaluateJointAnim = function(config, elapsedMs) {
        // config IS the generated object (type, duration, keyframes, etc.)
        // — the animation engine passes anim.generated directly
        if (!config || !config.keyframes) return null;

        const totalDuration = config.singleCycleDuration * config.repeatCycles;
        if (elapsedMs >= totalDuration) return null; // animation complete

        const cycleTime = elapsedMs % config.singleCycleDuration;
        const t = cycleTime / config.singleCycleDuration;

        const kfs = config.keyframes;
        let before = kfs[0], after = kfs[kfs.length - 1];
        for (let i = 0; i < kfs.length - 1; i++) {
            if (t >= kfs[i].t && t <= kfs[i + 1].t) {
                before = kfs[i];
                after = kfs[i + 1];
                break;
            }
        }

        const range = after.t - before.t;
        const localT = range > 0 ? (t - before.t) / range : 0;
        const baseAngle = typeof config.baseAngle === 'number' ? config.baseAngle : 0;
        const angle = baseAngle + before.angle + (after.angle - before.angle) * localT;
        const state = {
            angle: Math.max(-180, Math.min(180, angle)),
            tiltX: null,
            tiltY: null,
            x: null,
            y: null
        };

        if (config.hasTiltX) {
            const baseTiltX = typeof config.baseTiltX === 'number' ? config.baseTiltX : 0;
            const tiltX = baseTiltX + (before.tiltX ?? 0) + (((after.tiltX ?? 0) - (before.tiltX ?? 0)) * localT);
            state.tiltX = Math.max(-45, Math.min(45, tiltX));
        }

        if (config.hasTiltY) {
            const baseTiltY = typeof config.baseTiltY === 'number' ? config.baseTiltY : 0;
            const tiltY = baseTiltY + (before.tiltY ?? 0) + (((after.tiltY ?? 0) - (before.tiltY ?? 0)) * localT);
            state.tiltY = Math.max(-45, Math.min(45, tiltY));
        }

        if (config.hasX) {
            const baseX = typeof config.baseX === 'number' ? config.baseX : 0;
            state.x = baseX + (before.x ?? 0) + (((after.x ?? 0) - (before.x ?? 0)) * localT);
        }

        if (config.hasY) {
            const baseY = typeof config.baseY === 'number' ? config.baseY : 0;
            state.y = baseY + (before.y ?? 0) + (((after.y ?? 0) - (before.y ?? 0)) * localT);
        }

        return state;
    }

JointSystem._normalizeJointAnimTargetName = function(name = '') {
        return String(name || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    }

JointSystem.resolveJointAnimTarget = function(obj, config = {}) {
        if (!obj) return null;
        const targetMode = config.targetMode || 'base';
        if (targetMode === 'flex') {
            const pins = Array.isArray(obj.flexPins) ? obj.flexPins : [];
            let flexPin = config.targetFlexPinId
                ? pins.find(pin => pin?.id === config.targetFlexPinId) || null
                : null;
            if (!flexPin && config.targetFlexPinName) {
                const needle = JointSystem._normalizeJointAnimTargetName(config.targetFlexPinName);
                flexPin = pins.find(pin => JointSystem._normalizeJointAnimTargetName(pin?.name) === needle) || null;
            }
            return flexPin ? { mode: 'flex', obj, flexPin } : null;
        }
        if (targetMode !== 'joint') {
            return { mode: 'base', obj };
        }
        const joints = Array.isArray(obj.joints) ? obj.joints : [];
        if (!joints.length) return null;

        let joint = null;
        if (config.targetJointId) {
            joint = joints.find(jt => jt?.id === config.targetJointId) || null;
        }
        if (!joint && config.targetJointName) {
            const needle = JointSystem._normalizeJointAnimTargetName(config.targetJointName);
            joint = joints.find(jt => JointSystem._normalizeJointAnimTargetName(jt?.name) === needle) || null;
        }
        return joint ? { mode: 'joint', obj, joint } : null;
    }

JointSystem.applyJointAnimState = function(obj, config, motionState) {
        if (!obj || !config || !motionState) return false;
        const targetMode = config.targetMode || 'base';
        const target = JointSystem.resolveJointAnimTarget(obj, config);

        if (targetMode === 'joint') {
            if (!target || target.mode !== 'joint') return false;
            target.joint.angle = motionState.angle;
            if (typeof motionState.tiltX === 'number') target.joint.tiltX = motionState.tiltX;
            if (typeof motionState.tiltY === 'number') target.joint.tiltY = motionState.tiltY;
            return true;
        }
        if (targetMode === 'flex') {
            if (!target || target.mode !== 'flex') return false;
            target.flexPin.angle = motionState.angle;
            return true;
        }

        obj.jointBaseAngle = motionState.angle;
        if (typeof motionState.tiltX === 'number') obj.tiltX = motionState.tiltX;
        if (typeof motionState.tiltY === 'number') obj.tiltY = motionState.tiltY;
        if (!obj.pinnedTo && typeof motionState.x === 'number') obj.x = motionState.x;
        if (!obj.pinnedTo && typeof motionState.y === 'number') obj.y = motionState.y;
        return true;
    }


Object.assign(JointSystem.prototype, {

    toggleJointTuneMode() {
        if (this._jointTuneActive) {
            this._exitJointTuneMode();
            return false;
        }
        return this.enterJointTuneMode();
    },


    // ═══════════════════════════════════════════════
    //  MOVEMENT PICKER
    // ═══════════════════════════════════════════════

    showMovementPicker() {
        document.getElementById('joint-movement-picker')?.remove();

        // Detect which preset is assembled
        const presetKey = this._detectAssembledMotionProfile();
        const partMap = this._getPartMotionChannelMap();
        const allMoves = this._getAvailableMovementLibrary(presetKey);
        let moves = presetKey
            ? allMoves.filter(m => m.presetKeys.includes(presetKey))
            : allMoves;
        moves = moves
            .map(move => ({ move, availability: this._getMovementAvailability(move, partMap) }))
            .filter(entry => entry.availability.available)
            .map(entry => ({ ...entry.move, _partialAvailability: entry.availability }));
        const guidedMotion = this._isGuidedMotionAssembly();
        if (guidedMotion) {
            const curated = moves.filter(move => /idle|walk|run|wave|point|sit|jump|look|nod|dance/i.test(`${move.name} ${move.key}`));
            if (curated.length) moves = curated;
        }

        if (moves.length === 0) {
            const selected = this.objects?.getSelectedObjects?.() || [];
            if (!Object.keys(partMap).length && selected.length) {
                this.showAssembleSelectedPartsPanel?.({ presetKey: selected.length <= 6 ? 'guided-motion-front' : 'human-front' });
                Utils.showToast('Selected parts need labels before movements can be applied.', 'info');
                return;
            }
            Utils.showToast(Object.keys(partMap).length
                ? 'No matching movements for the currently assembled parts'
                : 'No movements available — assemble body parts first', 'warning');
            return;
        }

        // Group by facing/profile first, then by category.
        const profileGroups = {};
        moves.forEach(m => {
            const profileKey = presetKey || (Array.isArray(m.presetKeys) && m.presetKeys.length ? m.presetKeys[0] : 'other');
            const profileLabel = this._getPresetProfileLabel(profileKey);
            if (!profileGroups[profileLabel]) profileGroups[profileLabel] = {};
            if (!profileGroups[profileLabel][m.category]) profileGroups[profileLabel][m.category] = [];
            profileGroups[profileLabel][m.category].push(m);
        });
        const showProfileHeaders = !presetKey || Object.keys(profileGroups).length > 1;

        const picker = document.createElement('div');
        picker.id = 'joint-movement-picker';
        picker.className = 'joint-assembly-panel';

        picker.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-play"></i> Joint Movements
                ${presetKey ? `<span class="ja-preset-badge">${this._friendlyPresetName(presetKey)}</span>` : ''}
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body">
                ${guidedMotion ? this._renderGuidedMotionControls() : ''}
                <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;">
                    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;font-size:11px;" title="When on, movement preview/apply first returns the assembled parts to their idle baseline: stage angle 0, local Z rotation 0, and internal joint angles at 0. Turn this off only when intentionally combining with the current pose.">
                        <input type="checkbox" id="jmp-reset-idle-toggle" checked>
                        <i class="fas fa-rotate-left"></i> Reset To Idle First
                    </label>
                    <span style="font-size:10px;color:#777;">(turn off to combine)</span>
                </div>
                ${Object.entries(profileGroups).map(([profileLabel, groups]) => `
                    ${showProfileHeaders ? `<div class="ja-step-label" style="margin-top:4px;">${profileLabel}</div>` : ''}
                    ${Object.keys(groups).map(cat => `
                        <div class="ja-move-category">${cat}</div>
                        <div class="ja-move-grid">
                            ${groups[cat].map(m => `
                                <div class="ja-move-card" data-move="${m.key}">
                                    <div class="ja-move-icon"><i class="fas ${m.icon}"></i></div>
                                    <div class="ja-move-name">${m.name}</div>
                                    ${this._entityHasBodyTagContacts(m) ? '<div><span style="display:inline-block;padding:2px 6px;border-radius:999px;background:rgba(59,130,246,0.14);border:1px solid rgba(59,130,246,0.35);color:#93c5fd;font-size:10px;line-height:1.2;">Body Tags</span></div>' : ''}
                                    ${m._partialAvailability?.partial ? `<div><span style="display:inline-block;padding:2px 6px;border-radius:999px;background:rgba(245,158,11,0.14);border:1px solid rgba(245,158,11,0.35);color:#fbbf24;font-size:10px;line-height:1.2;" title="This movement will animate ${m._partialAvailability.matchedCount}/${m._partialAvailability.totalCount} available targeted part channels.">Partial ${m._partialAvailability.matchedCount}/${m._partialAvailability.totalCount}</span></div>` : ''}
                                    <div class="ja-move-desc">${m.description}</div>
                                    <div class="ja-move-actions">
                                        <button class="ja-move-targets" data-move="${m.key}" title="Contact Targets"><i class="fas fa-location-dot"></i></button>
                                        <button class="ja-move-preview" data-move="${m.key}" title="Preview"><i class="fas fa-eye"></i></button>
                                        <button class="ja-move-apply" data-move="${m.key}" title="Apply"><i class="fas fa-check"></i></button>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                `).join('')}
            </div>
        `;

        document.body.appendChild(picker);
        this._makeDraggable(picker);
        Utils.makePanelResizable(picker);

        // Bind events
        picker.querySelector('.ja-close').addEventListener('click', () => {
            this._stopPreview();
            picker.remove();
        });

        picker.querySelectorAll('.ja-move-preview').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._previewMovement(btn.dataset.move);
            });
        });

        picker.querySelectorAll('.ja-move-targets').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._showContactTargetEditor('move', btn.dataset.move);
            });
        });

        picker.querySelectorAll('.ja-move-apply').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this._applyMovement(btn.dataset.move);
                picker.remove();
            });
        });
        if (guidedMotion) this._bindGuidedMotionControls(picker);
    },

    showRoleCompatibilityReport() {
        document.getElementById('role-compat-report')?.remove();

        const escape = (value) => this._escapeHtml
            ? this._escapeHtml(value)
            : String(value ?? '').replace(/[&<>"']/g, ch => ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            }[ch]));
        const formatKeys = (keys, limit = 6) => {
            const list = Array.from(new Set((keys || []).filter(Boolean)));
            if (!list.length) return '<span class="role-compat-muted">None</span>';
            const visible = list.slice(0, limit);
            const extra = list.length - visible.length;
            return `${visible.map(key => `<span class="role-compat-pill">${escape(key)}</span>`).join('')}${extra > 0 ? `<span class="role-compat-more">+${extra}</span>` : ''}`;
        };
        const getEntryObject = (entry) => {
            if (!entry) return null;
            if (typeof this._getMapEntryObject === 'function') return this._getMapEntryObject(entry);
            return entry.obj || entry.object || entry.raw || null;
        };

        const partMap = this._getPartMotionChannelMap?.() || {};
        const objectMap = this._getPartObjectMap?.() || {};
        const profileKey = this._detectAssembledMotionProfile?.() || null;
        const allMoves = this._getAvailableMovementLibrary?.(profileKey) || [];
        let moves = profileKey
            ? allMoves.filter(move => !Array.isArray(move?.presetKeys) || move.presetKeys.includes(profileKey))
            : allMoves;
        if (!moves.length) moves = allMoves;

        const movementRows = moves.map(move => ({
            move,
            availability: this._getMovementAvailability?.(move, partMap) || {
                available: false,
                partial: false,
                matchedCount: 0,
                totalCount: 0,
                matchedKeys: [],
                missingKeys: []
            }
        }));
        const readyMoves = movementRows.filter(row => row.availability.available && !row.availability.partial);
        const partialMoves = movementRows.filter(row => row.availability.available && row.availability.partial);
        const unavailableMoves = movementRows.filter(row => !row.availability.available);

        const missingCounts = new Map();
        movementRows
            .filter(row => row.availability.partial || !row.availability.available)
            .forEach(row => (row.availability.missingKeys || []).forEach(key => {
                missingCounts.set(key, (missingCounts.get(key) || 0) + 1);
            }));
        const commonMissing = Array.from(missingCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([key, count]) => `${key} (${count})`);

        const objectRows = [];
        const seenObjects = new Set();
        Object.entries(partMap).forEach(([key, entry]) => {
            const obj = getEntryObject(entry);
            if (!obj || seenObjects.has(obj.id)) return;
            seenObjects.add(obj.id);
            const compatibleKeys = Object.entries(partMap)
                .filter(([, value]) => {
                    const entryObj = getEntryObject(value);
                    return entryObj && (entryObj === obj || entryObj.id === obj.id);
                })
                .map(([partKey]) => partKey);
            const resolved = window.BodyPartRoles?.resolveObjectRole?.(obj);
            const roleLabel = resolved?.label || resolved?.canonical || obj.bodyPartData?.partKey || key || 'Unlabeled';
            objectRows.push({
                name: obj.name || obj.id || 'Part',
                roleLabel,
                confidence: resolved?.confidence || null,
                keys: compatibleKeys
            });
        });
        Object.entries(objectMap).forEach(([key, obj]) => {
            if (!obj || seenObjects.has(obj.id)) return;
            seenObjects.add(obj.id);
            const resolved = window.BodyPartRoles?.resolveObjectRole?.(obj);
            objectRows.push({
                name: obj.name || obj.id || 'Part',
                roleLabel: resolved?.label || resolved?.canonical || obj.bodyPartData?.partKey || key || 'Unlabeled',
                confidence: resolved?.confidence || null,
                keys: [key]
            });
        });

        const renderMovementList = (rows, type) => {
            if (!rows.length) return '<div class="role-compat-empty">None</div>';
            return rows.slice(0, 8).map(row => {
                const avail = row.availability || {};
                const title = escape(row.move?.name || row.move?.key || 'Movement');
                const detail = type === 'ready'
                    ? `${avail.matchedCount || 0}/${avail.totalCount || 0} channels`
                    : `missing: ${(avail.missingKeys || []).slice(0, 5).map(escape).join(', ') || 'none'}`;
                return `
                    <div class="role-compat-move">
                        <strong>${title}</strong>
                        <span>${detail}</span>
                    </div>`;
            }).join('');
        };

        const profileLabel = this._getPresetProfileLabel?.(profileKey) || this._friendlyPresetName?.(profileKey) || 'Auto';
        const overlay = document.createElement('div');
        overlay.id = 'role-compat-report';
        overlay.className = 'confirm-modal-overlay role-compat-report-modal';
        overlay.innerHTML = `
            <div class="confirm-modal-box code-scope-modal role-compat-report-box">
                <h3>Role Compatibility Report</h3>
                <p>Checks the body-part labels currently detected on the stage and shows how well they match the movement library.</p>
                <div class="role-compat-summary">
                    <div><strong>${escape(objectRows.length)}</strong><span>detected parts</span></div>
                    <div><strong>${escape(readyMoves.length)}</strong><span>ready movements</span></div>
                    <div><strong>${escape(partialMoves.length)}</strong><span>partial movements</span></div>
                    <div><strong>${escape(profileLabel)}</strong><span>profile</span></div>
                </div>
                <div class="role-compat-scroll">
                    <section class="role-compat-section">
                        <h4>Detected Roles</h4>
                        ${objectRows.length ? objectRows.map(row => `
                            <div class="role-compat-row">
                                <div>
                                    <strong>${escape(row.name)}</strong>
                                    <span>${escape(row.roleLabel)}${row.confidence ? ` · ${escape(row.confidence)}` : ''}</span>
                                </div>
                                <div class="role-compat-key-list">${formatKeys(row.keys, 5)}</div>
                            </div>
                        `).join('') : '<div class="role-compat-empty">No compatible roles detected yet. Select cut body parts and use Relabel Parts.</div>'}
                    </section>
                    <section class="role-compat-section">
                        <h4>Ready Movements</h4>
                        ${renderMovementList(readyMoves, 'ready')}
                    </section>
                    <section class="role-compat-section">
                        <h4>Partial Movements</h4>
                        ${renderMovementList(partialMoves, 'partial')}
                    </section>
                    <section class="role-compat-section">
                        <h4>Most Missing Roles</h4>
                        <div class="role-compat-key-list">${formatKeys(commonMissing, 10)}</div>
                    </section>
                </div>
                <div class="confirm-modal-actions">
                    <button class="confirm-modal-cancel" data-action="relabel">Relabel Parts</button>
                    <button class="confirm-modal-cancel" data-action="movements">Open Movements</button>
                    <button class="confirm-modal-confirm" data-action="close">Close</button>
                </div>
            </div>`;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.addEventListener('click', event => {
            if (event.target === overlay) close();
        });
        overlay.querySelector('[data-action="close"]')?.addEventListener('click', close);
        overlay.querySelector('[data-action="relabel"]')?.addEventListener('click', () => {
            close();
            window.BodyPartRoles?.openRelabelPanel?.();
        });
        overlay.querySelector('[data-action="movements"]')?.addEventListener('click', () => {
            close();
            this.showMovementPicker?.();
        });
    },

    _getMovementReferencedPartKeys(move) {
        const keys = new Set();
        (move?.keyframes || []).forEach(kf => {
            Object.keys(kf?.angles || {}).forEach(key => keys.add(key));
            Object.keys(kf?.tilts || {}).forEach(key => keys.add(key));
            Object.keys(kf?.offsets || {}).forEach(key => keys.add(key));
        });
        return Array.from(keys);
    },

    _getMovementAvailability(move, partMap = this._getPartMotionChannelMap()) {
        const availableKeys = new Set(Object.keys(partMap || {}));
        const referenced = this._getMovementReferencedPartKeys(move);
        if (!availableKeys.size) {
            return { available: false, partial: false, matchedCount: 0, totalCount: referenced.length, matchedKeys: [], missingKeys: referenced };
        }
        if (!referenced.length) {
            return { available: true, partial: false, matchedCount: availableKeys.size, totalCount: availableKeys.size, matchedKeys: Array.from(availableKeys), missingKeys: [] };
        }

        const matchedKeys = referenced.filter(key => availableKeys.has(key));
        const missingKeys = referenced.filter(key => !availableKeys.has(key));
        if (!matchedKeys.length) {
            return { available: false, partial: false, matchedCount: 0, totalCount: referenced.length, matchedKeys, missingKeys };
        }

        const availablePartCount = availableKeys.size;
        const ratio = matchedKeys.length / Math.max(1, referenced.length);
        const available = referenced.length <= 2
            || availablePartCount <= 2
            || matchedKeys.length >= 2
            || ratio >= 0.25;
        return {
            available,
            partial: missingKeys.length > 0,
            matchedCount: matchedKeys.length,
            totalCount: referenced.length,
            matchedKeys,
            missingKeys
        };
    },

    _isGuidedMotionAssembly() {
        const selectedParts = this.objects?.getSelectedObjects?.().filter(obj => obj?.bodyPartData?.partKey) || [];
        if (selectedParts.length) return selectedParts.some(obj => this._isGuidedMotionObject(obj));
        return (this.objects?.objects || []).some(obj => this._isGuidedMotionObject(obj));
    },

    _isGuidedMotionObject(obj) {
        return !!obj && (
            obj?.guidedMotionRig === true
            || obj?.bodyPartData?.presetKey === 'guided-motion-front'
            || obj?.bodyPartData?.charType === 'guided-motion-front'
        );
    },

    _getGuidedMotionRigKey(obj) {
        if (!this._isGuidedMotionObject(obj)) return null;
        if (obj.bodyPartData?.rigId) return obj.bodyPartData.rigId;
        const byId = new Map((this.objects?.objects || []).map(candidate => [candidate.id, candidate]));
        let root = obj;
        const visited = new Set();
        while (root?.pinnedTo && byId.has(root.pinnedTo) && !visited.has(root.id)) {
            visited.add(root.id);
            root = byId.get(root.pinnedTo);
        }
        return `legacy-guided-${root?.id || obj.id}`;
    },

    _getActiveGuidedMotionRigKey() {
        const allGuided = (this.objects?.objects || []).filter(obj => this._isGuidedMotionObject(obj));
        if (!allGuided.length) return null;
        const selected = this.objects?.getSelectedObjects?.().find(obj => this._isGuidedMotionObject(obj));
        if (selected) {
            this._activeGuidedMotionRigKey = this._getGuidedMotionRigKey(selected);
            return this._activeGuidedMotionRigKey;
        }
        if (this._activeGuidedMotionRigKey && allGuided.some(obj => this._getGuidedMotionRigKey(obj) === this._activeGuidedMotionRigKey)) {
            return this._activeGuidedMotionRigKey;
        }
        this._activeGuidedMotionRigKey = this._getGuidedMotionRigKey(allGuided[0]);
        return this._activeGuidedMotionRigKey;
    },

    _getGuidedMotionObjects() {
        const activeKey = this._getActiveGuidedMotionRigKey();
        return (this.objects?.objects || []).filter(obj =>
            this._isGuidedMotionObject(obj) && this._getGuidedMotionRigKey(obj) === activeKey
        );
    },

    _getGuidedMotionSetting(key, fallback) {
        const value = this._getGuidedMotionObjects().find(obj => obj?.bodyPartData?.[key] !== undefined)?.bodyPartData?.[key];
        return value === undefined ? fallback : value;
    },

    _setGuidedMotionSetting(key, value, options = {}) {
        const parts = this._getGuidedMotionObjects();
        if (!parts.length) return false;
        parts.forEach(obj => {
            obj.bodyPartData = obj.bodyPartData || {};
            obj.bodyPartData[key] = value;
        });
        if (options.history !== false) eventBus.emit('history:push');
        return true;
    },

    _escapeGuidedMotionText(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        })[char]);
    },

    _getManualAssemblyPresets() {
        return [
            JointPresets.guidedMotionFront(),
            JointPresets.humanFront(),
            JointPresets.humanSide()
        ];
    },

    _guessManualAssemblyPartKey(obj, preset, used = new Set()) {
        const parts = Array.isArray(preset?.parts) ? preset.parts : [];
        const existing = obj?.bodyPartData?.partKey || obj?.guidedMotionRole || obj?._armaturePartKey || '';
        if (existing && parts.some(part => part.partKey === existing) && !used.has(existing)) return existing;

        const haystack = `${obj?.name || ''} ${obj?.type || ''}`.toLowerCase().replace(/[_-]+/g, ' ');
        const candidates = [
            ['head-neck', ['head neck', 'head/neck', 'neck head', 'head']],
            ['torso', ['torso', 'trunk', 'body', 'chest']],
            ['l-arm', ['left arm', 'l arm', 'screen right arm']],
            ['r-arm', ['right arm', 'r arm', 'screen left arm']],
            ['l-leg', ['left leg', 'l leg', 'screen right leg']],
            ['r-leg', ['right leg', 'r leg', 'screen left leg']],
            ['head', ['head']],
            ['neck', ['neck']],
            ['l-upper-arm', ['left upper arm', 'l upper arm']],
            ['l-forearm', ['left forearm', 'l forearm', 'left lower arm']],
            ['l-hand', ['left hand', 'l hand']],
            ['r-upper-arm', ['right upper arm', 'r upper arm']],
            ['r-forearm', ['right forearm', 'r forearm', 'right lower arm']],
            ['r-hand', ['right hand', 'r hand']],
            ['l-upper-leg', ['left upper leg', 'l upper leg', 'left thigh']],
            ['l-lower-leg', ['left lower leg', 'l lower leg', 'left shin', 'left calf']],
            ['l-foot', ['left foot', 'l foot']],
            ['r-upper-leg', ['right upper leg', 'r upper leg', 'right thigh']],
            ['r-lower-leg', ['right lower leg', 'r lower leg', 'right shin', 'right calf']],
            ['r-foot', ['right foot', 'r foot']],
            ['upper-arm', ['upper arm', 'arm']],
            ['forearm', ['forearm', 'lower arm']],
            ['hand', ['hand']],
            ['upper-leg', ['upper leg', 'thigh', 'leg']],
            ['lower-leg', ['lower leg', 'shin', 'calf']],
            ['foot', ['foot']]
        ];
        for (const [key, words] of candidates) {
            if (used.has(key) || !parts.some(part => part.partKey === key)) continue;
            if (words.some(word => haystack.includes(word))) return key;
        }
        return '';
    },

    showAssembleSelectedPartsPanel(options = {}) {
        document.getElementById('manual-body-assembly-panel')?.remove();
        const selected = (this.objects?.getSelectedObjects?.() || []).filter(obj => obj && !obj.locked);
        if (!selected.length) {
            Utils.showToast('Select the body-part objects first, then choose Assemble Selected Parts', 'warning');
            return;
        }

        const presets = this._getManualAssemblyPresets();
        const initialKey = options.presetKey || (selected.length <= 6 ? 'guided-motion-front' : 'human-front');
        const panel = document.createElement('div');
        panel.id = 'manual-body-assembly-panel';
        panel.className = 'joint-assembly-panel';
        panel.style.width = '420px';

        const esc = value => this._escapeGuidedMotionText(value);
        const renderRows = () => {
            const preset = presets.find(entry => entry.key === panel.querySelector('#manual-assembly-profile')?.value) || presets[0];
            const used = new Set();
            return selected.map((obj, index) => {
                const guessed = this._guessManualAssemblyPartKey(obj, preset, used);
                if (guessed) used.add(guessed);
                return `
                    <div class="manual-assembly-row" data-object-id="${esc(obj.id)}" style="display:grid;grid-template-columns:1fr 170px;gap:8px;align-items:center;padding:6px 0;border-bottom:1px solid rgba(148,163,184,.14);">
                        <button type="button" class="btn-sm btn-secondary" data-manual-assembly-select="${esc(obj.id)}" title="Select this object on the stage" style="justify-content:flex-start;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
                            <i class="fas fa-object-ungroup"></i> ${esc(obj.name || obj.type || `Part ${index + 1}`)}
                        </button>
                        <select class="manual-assembly-part" data-object-id="${esc(obj.id)}" style="width:100%;padding:5px 7px;border-radius:4px;border:1px solid #475569;background:#111827;color:#e5e7eb;font-size:12px;">
                            <option value="">Do not assemble</option>
                            ${preset.parts.map(part => `<option value="${esc(part.partKey)}" ${part.partKey === guessed ? 'selected' : ''}>${esc(part.name || part.partKey)}</option>`).join('')}
                        </select>
                    </div>
                `;
            }).join('');
        };

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-link"></i> Assemble Selected Parts
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body">
                <div style="font-size:12px;color:#cbd5e1;line-height:1.45;margin-bottom:10px;">
                    Label the selected objects as body parts. Missing parts are allowed; compatible movements will be shown as partial animations.
                </div>
                <label style="display:block;font-size:11px;color:#94a3b8;margin-bottom:5px;">Assembly profile</label>
                <select id="manual-assembly-profile" style="width:100%;padding:6px 8px;border-radius:5px;border:1px solid #475569;background:#111827;color:#e5e7eb;font-size:12px;margin-bottom:8px;">
                    ${presets.map(preset => `<option value="${esc(preset.key)}" ${preset.key === initialKey ? 'selected' : ''}>${esc(preset.name)}</option>`).join('')}
                </select>
                <div id="manual-assembly-rows"></div>
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#d1d5db;margin:10px 0 6px;">
                    <input type="checkbox" id="manual-assembly-flex" checked>
                    Add simple flex anchors where useful
                </label>
                <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#d1d5db;margin-bottom:10px;">
                    <input type="checkbox" id="manual-assembly-open-moves" checked>
                    Open movements after assembly
                </label>
                <div id="manual-assembly-status" style="font-size:11px;color:#94a3b8;line-height:1.45;margin-bottom:10px;"></div>
                <div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap;">
                    <button class="btn-secondary btn-sm" id="manual-assembly-cancel"><i class="fas fa-times"></i> Cancel</button>
                    <button class="btn-primary btn-sm" id="manual-assembly-apply"><i class="fas fa-check"></i> Assemble</button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);
        Utils.makePanelResizable?.(panel);

        const rowsHost = panel.querySelector('#manual-assembly-rows');
        const updateRows = () => {
            rowsHost.innerHTML = renderRows();
            rowsHost.querySelectorAll('[data-manual-assembly-select]').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.objects?.select?.([btn.dataset.manualAssemblySelect]);
                    this.stage?.requestRender?.();
                });
            });
            updateStatus();
        };
        const updateStatus = () => {
            const values = Array.from(panel.querySelectorAll('.manual-assembly-part')).map(select => select.value).filter(Boolean);
            const unique = new Set(values);
            const duplicateCount = values.length - unique.size;
            const rootLabel = values.includes('torso') || values.includes('body') ? 'A root body/trunk part is present.' : 'No torso/trunk selected; selected parts will still animate independently where possible.';
            const duplicateLabel = duplicateCount ? ` ${duplicateCount} duplicate label${duplicateCount === 1 ? '' : 's'} will be ignored.` : '';
            panel.querySelector('#manual-assembly-status').textContent = `${values.length} part${values.length === 1 ? '' : 's'} selected. ${rootLabel}${duplicateLabel}`;
        };
        panel.querySelector('#manual-assembly-profile')?.addEventListener('change', updateRows);
        panel.addEventListener('change', event => {
            if (event.target?.classList?.contains('manual-assembly-part')) updateStatus();
        });

        const close = () => panel.remove();
        panel.querySelector('.ja-close')?.addEventListener('click', close);
        panel.querySelector('#manual-assembly-cancel')?.addEventListener('click', close);
        panel.querySelector('#manual-assembly-apply')?.addEventListener('click', () => {
            const presetKey = panel.querySelector('#manual-assembly-profile')?.value || 'guided-motion-front';
            const assignments = {};
            const used = new Set();
            panel.querySelectorAll('.manual-assembly-part').forEach(select => {
                const key = select.value;
                if (!key || used.has(key)) return;
                used.add(key);
                assignments[select.dataset.objectId] = key;
            });
            const result = this._assembleSelectedBodyParts(assignments, presetKey, {
                addFlex: !!panel.querySelector('#manual-assembly-flex')?.checked
            });
            if (!result?.count) return;
            close();
            if (panel.querySelector('#manual-assembly-open-moves')?.checked) this.showMovementPicker();
        });
        updateRows();
    },

    _addManualAssemblyFlex(obj, partKey, presetKey) {
        if (!obj || (Array.isArray(obj.flexPins) && obj.flexPins.length)) return;
        const flexDefs = {
            'head-neck': { position: 0.72, spread: 0.20, name: 'Neck' },
            'l-arm': { position: 0.46, spread: 0.28, name: 'Left Elbow' },
            'r-arm': { position: 0.46, spread: 0.28, name: 'Right Elbow' },
            'l-leg': { position: 0.47, spread: 0.30, name: 'Left Knee' },
            'r-leg': { position: 0.47, spread: 0.30, name: 'Right Knee' },
            'upper-arm': { position: 0.50, spread: 0.24, name: 'Arm Bend' },
            'upper-leg': { position: 0.50, spread: 0.26, name: 'Leg Bend' }
        };
        const def = flexDefs[partKey];
        if (!def || presetKey === 'human-front') return;
        obj.flexEnabled = true;
        obj.flexDirection = 'vertical';
        obj.flexPreserveTexture = true;
        obj.flexPins = [{ id: `manual-flex-${partKey}-${Date.now()}`, ...def, angle: 0 }];
    },

    _assembleSelectedBodyParts(assignments, presetKey, options = {}) {
        const preset = this._getManualAssemblyPresets().find(entry => entry.key === presetKey) || JointPresets.guidedMotionFront();
        const objectById = new Map((this.objects?.objects || []).map(obj => [obj.id, obj]));
        const createdParts = {};
        Object.entries(assignments || {}).forEach(([id, partKey]) => {
            const obj = objectById.get(id);
            if (!obj || !partKey || createdParts[partKey]) return;
            createdParts[partKey] = obj;
        });
        const partKeys = Object.keys(createdParts);
        if (!partKeys.length) {
            Utils.showToast('Choose at least one body-part label before assembling', 'warning');
            return { count: 0, joints: 0 };
        }

        const rigId = `manual-${preset.key}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const rigName = preset.key === 'guided-motion-front' ? 'Assembled Motion Rig' : `Assembled ${preset.name}`;
        let joints = 0;
        const sorted = [];
        const remaining = [...preset.parts].filter(part => createdParts[part.partKey]);
        const placed = new Set();
        while (remaining.length) {
            const before = remaining.length;
            for (let i = remaining.length - 1; i >= 0; i--) {
                const part = remaining[i];
                if (!part.parentPartKey || placed.has(part.parentPartKey) || !createdParts[part.parentPartKey]) {
                    sorted.push(part);
                    placed.add(part.partKey);
                    remaining.splice(i, 1);
                }
            }
            if (remaining.length === before) sorted.push(...remaining.splice(0));
        }

        sorted.forEach(part => {
            const obj = createdParts[part.partKey];
            if (!obj) return;
            obj.bodyPartData = this._applyGlobalJointLimits({
                ...(obj.bodyPartData || {}),
                charType: preset.key,
                presetKey: preset.key,
                motionPresetKey: preset.motionPresetKey || preset.key,
                rigType: preset.rigType || 'manual-body-assembly',
                rigId,
                rigName,
                partKey: part.partKey,
                defaultAngle: part.defaultAngle
            });
            if (preset.key === 'guided-motion-front') {
                obj.guidedMotionRig = true;
                obj.guidedMotionRole = part.partKey;
            }
            if (options.addFlex !== false) this._addManualAssemblyFlex(obj, part.partKey, preset.key);

            const parent = part.parentPartKey ? createdParts[part.parentPartKey] : null;
            if (parent && part.anchorOnParent && part.pivotOnSelf) {
                obj.pivotX = part.pivotOnSelf.x;
                obj.pivotY = part.pivotOnSelf.y;
                obj.pinnedTo = parent.id;
                obj.pinAnchorX = part.anchorOnParent.x;
                obj.pinAnchorY = part.anchorOnParent.y;
                obj.pinRotationMode = 'joint';
                obj.pinInheritRotation = false;
                obj.jointBaseAngle = part.defaultAngle || 0;
                obj.pinContour = true;
                const pivot = obj.getPivotPoint?.() || { x: obj.x + obj.width * (obj.pivotX ?? 0.5), y: obj.y + obj.height * (obj.pivotY ?? 0.5) };
                const offset = this.objects?._getPinOffsetInParentSpace
                    ? this.objects._getPinOffsetInParentSpace(parent, pivot.x, pivot.y, obj.pinAnchorX, obj.pinAnchorY)
                    : { x: 0, y: 0 };
                obj.pinOffsetX = Math.round(offset.x || 0);
                obj.pinOffsetY = Math.round(offset.y || 0);
                joints++;
            } else {
                obj.pinnedTo = null;
                obj.pinRotationMode = 'static';
                obj.pinInheritRotation = false;
                obj.jointBaseAngle = 0;
            }
        });

        this._activeGuidedMotionRigKey = preset.key === 'guided-motion-front' ? rigId : this._activeGuidedMotionRigKey;
        this.objects?._resolvePins?.();
        this.objects?.select?.(Object.values(createdParts).map(obj => obj.id));
        this.objects?.updateObjectList?.();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        Utils.showToast(`Assembled ${partKeys.length} selected part${partKeys.length === 1 ? '' : 's'}${joints ? ` with ${joints} joint${joints === 1 ? '' : 's'}` : ' for partial animation'}`, 'success');
        return { count: partKeys.length, joints, rigId };
    },

    _getGuidedMotionStatus() {
        const roles = new Set(this._getGuidedMotionObjects().map(obj => obj?.bodyPartData?.partKey || obj?.guidedMotionRole).filter(Boolean));
        const expected = ['torso', 'head-neck', 'l-arm', 'r-arm', 'l-leg', 'r-leg'];
        const connected = this._getGuidedMotionObjects().filter(obj => (obj?.bodyPartData?.partKey || obj?.guidedMotionRole) === 'torso' || !!obj?.pinnedTo).length;
        const flexReady = this._getGuidedMotionObjects().filter(obj => Array.isArray(obj?.flexPins) && obj.flexPins.length).length;
        return {
            parts: expected.filter(role => roles.has(role)).length,
            connected,
            flexReady,
            ready: expected.every(role => roles.has(role)) && connected >= 6
        };
    },

    _getGuidedMotionLayerRoles() {
        return ['r-leg', 'l-leg', 'torso', 'head-neck', 'r-arm', 'l-arm'];
    },

    _getGuidedMotionLayerRoleLabel(roleKey) {
        const labels = {
            'head-neck': 'Head/Neck',
            torso: 'Torso',
            'l-arm': 'Left Arm',
            'r-arm': 'Right Arm',
            'l-leg': 'Left Leg',
            'r-leg': 'Right Leg'
        };
        return labels[roleKey] || roleKey;
    },

    _buildGuidedMotionLayerOrderFromSequence(sequence = []) {
        const roles = this._getGuidedMotionLayerRoles();
        const result = {};
        const used = new Set();
        let rank = 1;
        (Array.isArray(sequence) ? sequence : []).forEach(role => {
            if (!roles.includes(role) || used.has(role)) return;
            used.add(role);
            result[role] = rank++;
        });
        roles.forEach(role => {
            if (used.has(role)) return;
            result[role] = rank++;
        });
        return result;
    },

    _getGuidedMotionLayerOrderSetting() {
        const roles = this._getGuidedMotionLayerRoles();
        const stored = this._getGuidedMotionSetting('partLayerOrder', null);
        if (stored && typeof stored === 'object') {
            const parsed = {};
            let validCount = 0;
            roles.forEach((role, idx) => {
                const value = Number(stored[role]);
                if (Number.isFinite(value) && value >= 1 && value <= roles.length) {
                    parsed[role] = Math.round(value);
                    validCount += 1;
                } else {
                    parsed[role] = idx + 1;
                }
            });
            if (validCount === roles.length) return parsed;
        }

        // Backward compatibility: map legacy Arm/Leg grouped settings to per-part order.
        const armMode = this._getGuidedMotionSetting('armLayerMode', 'auto');
        const legMode = this._getGuidedMotionSetting('legLayerMode', 'auto');
        const legacyRank = (role) => {
            const kind = role.includes('arm') ? 'arm' : role.includes('leg') ? 'leg' : 'body';
            const mode = kind === 'arm' ? armMode : kind === 'leg' ? legMode : 'auto';
            if (mode === 'behind') return kind === 'leg' ? 10 : 20;
            if (role === 'torso') return 40;
            if (role === 'head-neck') return 50;
            if (mode === 'front') return kind === 'leg' ? 70 : 80;
            return kind === 'leg' ? 30 : 60;
        };
        const ordered = [...roles].sort((a, b) => legacyRank(a) - legacyRank(b));
        const fallback = {};
        ordered.forEach((role, idx) => { fallback[role] = idx + 1; });
        return fallback;
    },

    _saveGuidedMotionLayerOrderSetting(layerOrder, options = {}) {
        const roles = this._getGuidedMotionLayerRoles();
        const sanitized = {};
        roles.forEach((role, idx) => {
            const value = Number(layerOrder?.[role]);
            sanitized[role] = (Number.isFinite(value) && value >= 1 && value <= roles.length)
                ? Math.round(value)
                : (idx + 1);
        });
        this._setGuidedMotionSetting('partLayerOrder', sanitized, options);
        return sanitized;
    },

    _renderGuidedMotionControls() {
        const status = this._getGuidedMotionStatus();
        const strength = Math.round(Number(this._getGuidedMotionSetting('movementStrength', 1)) * 100);
        const rigName = this._escapeGuidedMotionText(this._getGuidedMotionSetting('rigName', 'Guided Motion Rig'));
        const layerOrder = this._getGuidedMotionLayerOrderSetting();
        const orderedRoles = [...this._getGuidedMotionLayerRoles()].sort((a, b) => (layerOrder[a] || 999) - (layerOrder[b] || 999));
        const layerOrderRows = orderedRoles.map((roleKey, idx) => `
            <div class="jmp-guided-layer-item" data-role="${roleKey}" draggable="true" style="display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;border:1px solid rgba(148,163,184,.35);background:rgba(15,23,42,.55);cursor:grab;">
                <span class="jmp-guided-layer-rank" style="font-size:10px;color:#93c5fd;min-width:56px;">${idx === 0 ? 'Back' : idx === 5 ? 'Front' : `Layer ${idx + 1}`}</span>
                <span style="font-size:11px;color:#e5e7eb;">${this._getGuidedMotionLayerRoleLabel(roleKey)}</span>
                <span style="display:flex;gap:4px;align-items:center;">
                    <button class="btn-sm jmp-guided-layer-up" data-role="${roleKey}" title="Move back"><i class="fas fa-chevron-up"></i></button>
                    <button class="btn-sm jmp-guided-layer-down" data-role="${roleKey}" title="Move front"><i class="fas fa-chevron-down"></i></button>
                </span>
            </div>
        `).join('');
        return `
            <div class="ja-guided-controls" style="padding:8px;margin-bottom:10px;border:1px solid rgba(59,130,246,.28);border-radius:6px;background:rgba(59,130,246,.07);">
                <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px;font-size:11px;">
                    <span><i class="fas fa-${status.ready ? 'circle-check' : 'triangle-exclamation'}"></i> ${status.parts}/6 parts · ${status.connected}/6 connected · ${status.flexReady}/5 flex</span>
                    <strong style="color:${status.ready ? '#22c55e' : '#f59e0b'}">${status.ready ? 'Ready' : 'Check rig'}</strong>
                </div>
                <label style="display:grid;grid-template-columns:auto 1fr;align-items:center;gap:7px;font-size:11px;margin-bottom:8px;">
                    Rig name
                    <input id="jmp-guided-name" type="text" maxlength="40" value="${rigName}" aria-label="Guided Motion rig name">
                </label>
                <label style="display:grid;grid-template-columns:auto 1fr 42px;align-items:center;gap:7px;font-size:11px;margin-bottom:8px;">
                    Strength
                    <input id="jmp-guided-strength" type="range" min="25" max="175" step="5" value="${strength}">
                    <span id="jmp-guided-strength-value">${strength}%</span>
                </label>
                <div style="font-size:11px;margin-bottom:8px;">
                    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:5px;">
                        <span>Layer Order (Back → Front)</span>
                        <button class="btn-sm" id="jmp-guided-layer-reset" title="Restore default part z-order"><i class="fas fa-rotate-left"></i> Reset</button>
                    </div>
                    <div style="font-size:10px;color:#93c5fd;line-height:1.35;margin-bottom:6px;">Drag rows to reorder z-depth per part. Back is rendered first, Front is rendered last.</div>
                    <div id="jmp-guided-layer-list" style="display:flex;flex-direction:column;gap:6px;">${layerOrderRows}</div>
                </div>
                <div style="display:flex;flex-wrap:wrap;gap:5px;">
                    <button class="btn-sm" id="jmp-guided-identify" title="Highlight this rig on the stage"><i class="fas fa-crosshairs"></i> Identify</button>
                    <button class="btn-sm" id="jmp-guided-quick-pose" title="Open simple joint handles"><i class="fas fa-person-rays"></i> Quick Pose</button>
                    <button class="btn-sm" id="jmp-guided-mirror" title="Mirror the current left and right pose"><i class="fas fa-arrows-left-right"></i> Mirror</button>
                    <button class="btn-sm" id="jmp-guided-idle" title="Restore assembled parts and Flex anchors"><i class="fas fa-rotate-left"></i> Restore Idle</button>
                    <button class="btn-sm" id="jmp-guided-repair" title="Reconnect parts and restore missing Flex anchors"><i class="fas fa-screwdriver-wrench"></i> Repair Rig</button>
                </div>
            </div>`;
    },

    _bindGuidedMotionControls(panel) {
        const strength = panel.querySelector('#jmp-guided-strength');
        strength?.addEventListener('input', () => {
            const next = Math.max(0.25, Math.min(1.75, Number(strength.value) / 100));
            this._guidedMotionStrength = next;
            this._setGuidedMotionSetting('movementStrength', next, { history: false });
            panel.querySelector('#jmp-guided-strength-value').textContent = `${strength.value}%`;
        });
        strength?.addEventListener('change', () => eventBus.emit('history:push'));
        const nameInput = panel.querySelector('#jmp-guided-name');
        const saveName = () => {
            const next = String(nameInput?.value || '').trim() || 'Guided Motion Rig';
            if (nameInput) nameInput.value = next;
            this._setGuidedMotionSetting('rigName', next);
            this.objects?.updateObjectList?.();
        };
        nameInput?.addEventListener('change', saveName);
        nameInput?.addEventListener('keydown', event => {
            if (event.key === 'Enter') { event.preventDefault(); saveName(); nameInput.blur(); }
        });
        const layerList = panel.querySelector('#jmp-guided-layer-list');
        const getLayerSequence = () => {
            if (!layerList) return this._getGuidedMotionLayerRoles();
            return [...layerList.querySelectorAll('.jmp-guided-layer-item')]
                .map(item => String(item.dataset.role || ''))
                .filter(Boolean);
        };
        const refreshLayerRankLabels = () => {
            if (!layerList) return;
            [...layerList.querySelectorAll('.jmp-guided-layer-item')].forEach((item, idx) => {
                const label = item.querySelector('.jmp-guided-layer-rank');
                if (!label) return;
                label.textContent = idx === 0 ? 'Back' : idx === 5 ? 'Front' : `Layer ${idx + 1}`;
            });
        };
        const applyPartLayers = () => {
            const next = this._buildGuidedMotionLayerOrderFromSequence(getLayerSequence());
            const saved = this._saveGuidedMotionLayerOrderSetting(next, { history: false });
            this._applyGuidedMotionLayerOrder(saved);
            eventBus.emit('history:push');
            refreshLayerRankLabels();
        };
        let dragRole = null;
        layerList?.querySelectorAll('.jmp-guided-layer-item').forEach(item => {
            item.addEventListener('dragstart', (event) => {
                dragRole = String(item.dataset.role || '');
                event.dataTransfer.effectAllowed = 'move';
                item.style.opacity = '0.55';
            });
            item.addEventListener('dragend', () => {
                dragRole = null;
                item.style.opacity = '';
            });
            item.addEventListener('dragover', (event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
            });
            item.addEventListener('drop', (event) => {
                event.preventDefault();
                if (!dragRole || !layerList) return;
                const dragged = layerList.querySelector(`.jmp-guided-layer-item[data-role="${dragRole}"]`);
                if (!dragged || dragged === item) return;
                const rect = item.getBoundingClientRect();
                const insertAfter = event.clientY > (rect.top + rect.height / 2);
                if (insertAfter) {
                    item.insertAdjacentElement('afterend', dragged);
                } else {
                    item.insertAdjacentElement('beforebegin', dragged);
                }
                applyPartLayers();
            });
        });
        panel.querySelectorAll('.jmp-guided-layer-up').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!layerList) return;
                const role = btn.dataset.role;
                const item = layerList.querySelector(`.jmp-guided-layer-item[data-role="${role}"]`);
                if (!item || !item.previousElementSibling) return;
                item.previousElementSibling.insertAdjacentElement('beforebegin', item);
                applyPartLayers();
            });
        });
        panel.querySelectorAll('.jmp-guided-layer-down').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!layerList) return;
                const role = btn.dataset.role;
                const item = layerList.querySelector(`.jmp-guided-layer-item[data-role="${role}"]`);
                if (!item || !item.nextElementSibling) return;
                item.nextElementSibling.insertAdjacentElement('afterend', item);
                applyPartLayers();
            });
        });
        panel.querySelector('#jmp-guided-layer-reset')?.addEventListener('click', () => {
            const defaultSequence = ['r-leg', 'l-leg', 'torso', 'head-neck', 'r-arm', 'l-arm'];
            if (layerList) {
                defaultSequence.forEach(role => {
                    const item = layerList.querySelector(`.jmp-guided-layer-item[data-role="${role}"]`);
                    if (item) layerList.appendChild(item);
                });
            }
            const defaults = this._buildGuidedMotionLayerOrderFromSequence(defaultSequence);
            const saved = this._saveGuidedMotionLayerOrderSetting(defaults, { history: false });
            this._applyGuidedMotionLayerOrder(saved);
            eventBus.emit('history:push');
            refreshLayerRankLabels();
        });
        panel.querySelector('#jmp-guided-identify')?.addEventListener('click', () => this._highlightGuidedMotionRig());
        panel.querySelector('#jmp-guided-quick-pose')?.addEventListener('click', () => {
            panel.remove();
            if (this._jointTuneActive) this._exitJointTuneMode?.();
            if (!this._skeletonVisible) this.toggleSkeleton?.();
            this.stage?.requestRender?.();
            Utils.showToast('Quick Pose — drag the blue rotation handles on the body parts', 'info');
        });
        panel.querySelector('#jmp-guided-mirror')?.addEventListener('click', () => this._mirrorGuidedMotionPose());
        panel.querySelector('#jmp-guided-idle')?.addEventListener('click', () => this._restoreGuidedMotionIdle());
        panel.querySelector('#jmp-guided-repair')?.addEventListener('click', () => this._repairGuidedMotionRig());
        this._highlightGuidedMotionRig(1000);
    },

    _applyGuidedMotionLayerOrder(layerOrder = this._getGuidedMotionLayerOrderSetting()) {
        const stageObjects = this.objects?.objects;
        const parts = this._getGuidedMotionObjects();
        if (!Array.isArray(stageObjects) || !parts.length) return false;
        const rigSet = new Set(parts);
        const firstIndex = Math.max(0, stageObjects.findIndex(obj => rigSet.has(obj)));
        const defaultOrder = this._getGuidedMotionLayerRoles();
        const role = obj => obj?.bodyPartData?.partKey || obj?.guidedMotionRole || '';
        const rank = obj => {
            const key = role(obj);
            const value = Number(layerOrder?.[key]);
            if (Number.isFinite(value)) return value;
            const fallbackIndex = defaultOrder.indexOf(key);
            return fallbackIndex >= 0 ? (fallbackIndex + 1) : 999;
        };
        const ordered = [...parts].sort((a, b) => {
            const diff = rank(a) - rank(b);
            if (diff !== 0) return diff;
            return defaultOrder.indexOf(role(a)) - defaultOrder.indexOf(role(b));
        });
        const remaining = stageObjects.filter(obj => !rigSet.has(obj));
        remaining.splice(firstIndex, 0, ...ordered);
        stageObjects.splice(0, stageObjects.length, ...remaining);
        this.objects?.updateObjectList?.();
        this.stage?.requestRender?.();
        return true;
    },

    _highlightGuidedMotionRig(duration = 1800) {
        if (!this._getGuidedMotionObjects().length) return;
        this._guidedMotionHighlightUntil = performance.now() + duration;
        this.stage?.requestRender?.();
        clearTimeout(this._guidedMotionHighlightTimer);
        this._guidedMotionHighlightTimer = setTimeout(() => this.stage?.requestRender?.(), duration + 30);
    },

    _drawGuidedMotionHighlight(ctx) {
        if (!ctx || performance.now() >= (this._guidedMotionHighlightUntil || 0)) return;
        const parts = this._getGuidedMotionObjects();
        if (!parts.length) return;
        const minX = Math.min(...parts.map(obj => obj.x));
        const minY = Math.min(...parts.map(obj => obj.y));
        const maxX = Math.max(...parts.map(obj => obj.x + obj.width));
        const maxY = Math.max(...parts.map(obj => obj.y + obj.height));
        const zoom = Math.max(0.1, this.stage?.zoom || 1);
        ctx.save();
        ctx.strokeStyle = '#22c55e';
        ctx.lineWidth = 3 / zoom;
        ctx.setLineDash([8 / zoom, 5 / zoom]);
        ctx.strokeRect(minX - 8 / zoom, minY - 8 / zoom, maxX - minX + 16 / zoom, maxY - minY + 16 / zoom);
        ctx.setLineDash([]);
        ctx.fillStyle = '#16a34a';
        ctx.font = `600 ${12 / zoom}px Inter, sans-serif`;
        ctx.textBaseline = 'bottom';
        ctx.fillText(this._getGuidedMotionSetting('rigName', 'Guided Motion Rig'), minX, minY - 12 / zoom);
        ctx.restore();
    },

    _repairGuidedMotionRig() {
        const parts = this._getGuidedMotionObjects();
        const byRole = Object.fromEntries(parts.map(obj => [obj?.bodyPartData?.partKey || obj?.guidedMotionRole, obj]));
        const torso = byRole.torso;
        if (!torso) {
            Utils.showToast('Repair needs the torso part. Select the correct rig and try again.', 'warning');
            return;
        }
        const preset = JointPresets.guidedMotionFront();
        const rigId = torso.bodyPartData?.rigId || this._getActiveGuidedMotionRigKey() || Utils.generateId('guided-rig');
        const rigName = this._getGuidedMotionSetting('rigName', 'Guided Motion Rig');
        const flexDefs = {
            'head-neck': { position: 0.72, spread: 0.20, name: 'Neck' },
            'l-arm': { position: 0.46, spread: 0.28, name: 'Left Elbow' },
            'r-arm': { position: 0.46, spread: 0.28, name: 'Right Elbow' },
            'l-leg': { position: 0.47, spread: 0.30, name: 'Left Knee' },
            'r-leg': { position: 0.47, spread: 0.30, name: 'Right Knee' }
        };
        let repaired = 0;
        preset.parts.forEach(def => {
            const obj = byRole[def.partKey];
            if (!obj) return;
            obj.bodyPartData = { ...obj.bodyPartData, partKey: def.partKey, presetKey: preset.key, charType: preset.key, motionPresetKey: preset.motionPresetKey, rigId, rigName };
            obj.guidedMotionRig = true;
            obj.guidedMotionRole = def.partKey;
            if (def.parentPartKey && byRole[def.parentPartKey] && (!obj.pinnedTo || !parts.some(candidate => candidate.id === obj.pinnedTo))) {
                const parent = byRole[def.parentPartKey];
                obj.pinnedTo = parent.id;
                obj.pinAnchorX = def.anchorOnParent.x;
                obj.pinAnchorY = def.anchorOnParent.y;
                obj.pivotX = def.pivotOnSelf.x;
                obj.pivotY = def.pivotOnSelf.y;
                obj.pinOffsetX = obj.x - (parent.x + parent.width * obj.pinAnchorX) + obj.width * obj.pivotX;
                obj.pinOffsetY = obj.y - (parent.y + parent.height * obj.pinAnchorY) + obj.height * obj.pivotY;
                obj.pinRotationMode = 'inherit';
                repaired++;
            }
            const flex = flexDefs[def.partKey];
            if (flex && (!Array.isArray(obj.flexPins) || !obj.flexPins.length)) {
                obj.flexEnabled = true;
                obj.flexDirection = 'vertical';
                obj.flexPreserveTexture = true;
                obj.flexPins = [{ id: `guided-flex-${def.partKey}`, ...flex, angle: 0 }];
                repaired++;
            }
        });
        this._applyGuidedMotionLayerOrder(this._getGuidedMotionLayerOrderSetting());
        this.objects?._resolvePins?.();
        this.stage?.requestRender?.();
        eventBus.emit('history:push');
        this._highlightGuidedMotionRig();
        const missing = 6 - this._getGuidedMotionStatus().parts;
        Utils.showToast(missing ? `Rig repaired. ${missing} cut part${missing === 1 ? ' is' : 's are'} still missing.` : (repaired ? 'Guided Motion rig repaired' : 'Rig connections are already healthy'), missing ? 'warning' : 'success');
    },

    _restoreGuidedMotionIdle() {
        this._stopPreview();
        const changed = this._resetAssembledPartsToIdleBaseline(this._getPartMotionChannelMap());
        this.objects?._resolvePins?.();
        this.stage?.requestRender?.();
        if (changed) eventBus.emit('history:push');
        Utils.showToast(changed ? 'Guided Motion rig restored to idle' : 'Rig is already at idle', 'info');
    },

    _mirrorGuidedMotionPose() {
        this._stopPreview();
        const map = this._getPartMotionChannelMap();
        const pairs = [
            ['l-upper-arm', 'r-upper-arm'],
            ['l-forearm', 'r-forearm'],
            ['l-upper-leg', 'r-upper-leg'],
            ['l-lower-leg', 'r-lower-leg']
        ];
        let changed = false;
        pairs.forEach(([leftKey, rightKey]) => {
            const left = map[leftKey];
            const right = map[rightKey];
            if (!left || !right) return;
            const leftState = this._captureMotionChannelState(left);
            const rightState = this._captureMotionChannelState(right);
            if (!leftState || !rightState) return;
            this._applyMotionChannelAngle(left, -(rightState.angle || 0));
            this._applyMotionChannelAngle(right, -(leftState.angle || 0));
            changed = true;
        });
        this.objects?._resolvePins?.();
        this.stage?.requestRender?.();
        if (changed) eventBus.emit('history:push');
        Utils.showToast(changed ? 'Guided Motion pose mirrored' : 'No mirrored limb pairs found', changed ? 'success' : 'warning');
    },

    _prepareGuidedMotion(move) {
        if (!move || !this._isGuidedMotionAssembly()) return move;
        const strength = Math.max(0.25, Math.min(1.75, Number(this._getGuidedMotionSetting('movementStrength', this._guidedMotionStrength || 1))));
        if (Math.abs(strength - 1) < 0.001) return move;
        const scaled = { ...move, keyframes: (move.keyframes || []).map(kf => ({ ...kf })) };
        scaled.keyframes.forEach(kf => {
            ['angles', 'offsets'].forEach(group => {
                if (!kf[group]) return;
                kf[group] = Object.fromEntries(Object.entries(kf[group]).map(([key, value]) => [key,
                    typeof value === 'number' ? value * strength : Object.fromEntries(Object.entries(value || {}).map(([axis, amount]) => [axis, amount * strength]))
                ]));
            });
            if (kf.tilts) {
                kf.tilts = Object.fromEntries(Object.entries(kf.tilts).map(([key, value]) => [key,
                    Object.fromEntries(Object.entries(value || {}).map(([axis, amount]) => [axis, amount * strength]))
                ]));
            }
        });
        return scaled;
    },

    resetRemovedJointAnimationTarget(obj, removedAnimation) {
        const config = removedAnimation?.generated || removedAnimation;
        if (!obj || !config || Array.isArray(config) || config.type !== 'joint-rotation') return false;
        const hasReplacement = (obj.animations || []).some(animation => {
            const candidate = animation?.generated || animation;
            if (!candidate || Array.isArray(candidate) || candidate.type !== 'joint-rotation') return false;
            return (candidate.targetMode || 'base') === (config.targetMode || 'base')
                && (candidate.targetJointId || null) === (config.targetJointId || null)
                && (candidate.targetFlexPinId || null) === (config.targetFlexPinId || null);
        });
        if (hasReplacement) return false;

        const target = JointSystem.resolveJointAnimTarget(obj, config);
        if (target?.mode === 'flex') target.flexPin.angle = 0;
        else if (target?.mode === 'joint') {
            target.joint.angle = 0;
            target.joint.tiltX = 0;
            target.joint.tiltY = 0;
        } else {
            obj.jointBaseAngle = 0;
            obj.tiltX = 0;
            obj.tiltY = 0;
        }
        this.objects?._resolvePins?.();
        this.stage?.requestRender?.();
        return true;
    },

    /**
     * Detect which character preset is currently assembled on stage
     * by scanning objects with bodyPartData.
     */
    _detectAssembledPreset() {
        if (this._activePreset?.key) return this._activePreset.key;
        const stageObjects = this._isGuidedMotionAssembly()
            ? this._getGuidedMotionObjects()
            : (this.objects.objects || []);
        const types = {};
        stageObjects.forEach(o => {
            const key = o?.bodyPartData?.charType || o?.bodyPartData?.presetKey;
            if (key) {
                types[key] = (types[key] || 0) + 1;
            }
        });
        // Return the preset with the most parts
        let best = null, bestCount = 0;
        Object.keys(types).forEach(k => {
            if (types[k] > bestCount) { best = k; bestCount = types[k]; }
        });
        return best;
    },

    /**
     * Build a mapping of partKey → stageObject from bodyPartData.
     */
    _getBodyPartCompatibleKeys(partKey, obj = null) {
        const keys = new Set();
        const add = (value) => {
            const normalized = window.BodyPartRoles?.normalizeKey
                ? window.BodyPartRoles.normalizeKey(value)
                : String(value || '').toLowerCase().trim();
            if (normalized) keys.add(normalized);
        };

        add(partKey);
        const resolved = window.BodyPartRoles?.resolveObjectRole?.(obj);
        if (resolved?.canonical) add(resolved.canonical);
        if (window.BodyPartRoles?.getAliases) {
            window.BodyPartRoles.getAliases(partKey).forEach(add);
            if (resolved?.canonical) window.BodyPartRoles.getAliases(resolved.canonical).forEach(add);
        }

        const expansionMap = {
            'r-arm': ['right-arm', 'front-arm', 'r-upper-arm', 'r-forearm', 'r-hand'],
            'right-arm': ['r-arm', 'front-arm', 'r-upper-arm', 'r-forearm', 'r-hand'],
            'front-arm': ['right-arm', 'r-arm', 'r-upper-arm', 'r-forearm', 'r-hand'],
            'l-arm': ['left-arm', 'back-arm', 'l-upper-arm', 'l-forearm', 'l-hand'],
            'left-arm': ['l-arm', 'back-arm', 'l-upper-arm', 'l-forearm', 'l-hand'],
            'back-arm': ['left-arm', 'l-arm', 'l-upper-arm', 'l-forearm', 'l-hand'],
            'r-leg': ['right-leg', 'front-leg', 'r-upper-leg', 'r-lower-leg', 'r-foot'],
            'right-leg': ['r-leg', 'front-leg', 'r-upper-leg', 'r-lower-leg', 'r-foot'],
            'front-leg': ['right-leg', 'r-leg', 'r-upper-leg', 'r-lower-leg', 'r-foot'],
            'l-leg': ['left-leg', 'back-leg', 'l-upper-leg', 'l-lower-leg', 'l-foot'],
            'left-leg': ['l-leg', 'back-leg', 'l-upper-leg', 'l-lower-leg', 'l-foot'],
            'back-leg': ['left-leg', 'l-leg', 'l-upper-leg', 'l-lower-leg', 'l-foot'],
            'head-neck': ['head', 'neck'],
            'head': ['head-neck'],
            'neck': ['head-neck']
        };

        Array.from(keys).forEach(key => {
            (expansionMap[key] || []).forEach(add);
        });

        return Array.from(keys);
    },

    _addPartObjectAliases(map, partKey, obj) {
        this._getBodyPartCompatibleKeys(partKey, obj).forEach(key => {
            if (!map[key]) map[key] = obj;
        });
    },

    _addMotionChannelAliases(map, partKey, channel) {
        const obj = this._getMapEntryObject(channel);
        this._getBodyPartCompatibleKeys(partKey, obj).forEach(key => {
            if (!map[key]) map[key] = key === partKey
                ? channel
                : { ...channel, partKey: key, label: channel.label || key };
        });
    },

    _getPartObjectMap() {
        const map = {};
        const stageObjects = this._isGuidedMotionAssembly()
            ? this._getGuidedMotionObjects()
            : (this.objects.objects || []);
        stageObjects.forEach(o => {
            if (o.bodyPartData?.partKey) {
                this._applyGlobalJointLimits(o.bodyPartData);
                this._addPartObjectAliases(map, o.bodyPartData.partKey, o);
            }
        });

        return map;
    },

    _getSkeletonOverlayPartObjectMap() {
        let armature = this._detectSelectedArmature?.() || null;
        if (!armature?.root && this._currentArmature?.root) {
            armature = this._refreshDetectedArmatureReference?.(this._currentArmature)
                || this._currentArmature;
        }
        if (!armature?.root) armature = this._detectArmature?.() || null;

        const map = {};
        const seen = new Set();
        const add = (partKey, obj) => {
            if (!obj?.id || seen.has(obj.id)) return;
            seen.add(obj.id);
            if (obj.bodyPartData) this._applyGlobalJointLimits(obj.bodyPartData);
            map[String(partKey || obj.bodyPartData?.partKey || obj.id)] = obj;
        };
        if (armature?.root) {
            Object.entries(armature.parts || {}).forEach(([partKey, part]) => add(partKey, part?.obj));
            add('torso', armature.root);
            return map;
        }

        Object.entries(this._getPartObjectMap()).forEach(([partKey, obj]) => add(partKey, obj));
        return map;
    },

    _normalizeMotionJointName(name = '') {
        return String(name || '')
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    },

    _getMapEntryObject(entry) {
        return entry?.obj || entry || null;
    },

    _createMotionChannel(partKey, obj, options = {}) {
        return {
            partKey,
            obj,
            target: options.target || 'base',
            joint: options.joint || null,
            jointId: options.joint?.id || options.jointId || null,
            jointName: options.joint?.name || options.jointName || null,
            flexPin: options.flexPin || null,
            flexPinId: options.flexPin?.id || options.flexPinId || null,
            flexPinName: options.flexPin?.name || options.flexPinName || null,
            label: options.label || options.joint?.name || obj?.bodyPartData?.jointName || obj?.name || partKey
        };
    },

    _findMotionJointByNames(obj, names = []) {
        if (!obj || !Array.isArray(obj.joints) || obj.joints.length === 0) return null;
        const needles = new Set(
            [].concat(names || [])
                .map(name => this._normalizeMotionJointName(name))
                .filter(Boolean)
        );
        if (!needles.size) return null;
        return obj.joints.find(jt => needles.has(this._normalizeMotionJointName(jt?.name))) || null;
    },

    _addBodySlicerMotionChannels(map, obj, partKey) {
        const defs = {
            'r-arm': {
                baseKey: 'r-upper-arm',
                joints: [
                    { partKey: 'r-forearm', names: ['right-elbow', 'R Elbow', 'Right Elbow'] },
                    { partKey: 'r-hand', names: ['right-wrist', 'R Wrist', 'Right Wrist'] }
                ]
            },
            'l-arm': {
                baseKey: 'l-upper-arm',
                joints: [
                    { partKey: 'l-forearm', names: ['left-elbow', 'L Elbow', 'Left Elbow'] },
                    { partKey: 'l-hand', names: ['left-wrist', 'L Wrist', 'Left Wrist'] }
                ]
            },
            'r-leg': {
                baseKey: 'r-upper-leg',
                joints: [
                    { partKey: 'r-lower-leg', names: ['right-knee', 'R Knee', 'Right Knee'] },
                    { partKey: 'r-foot', names: ['right-ankle', 'R Ankle', 'Right Ankle'] }
                ]
            },
            'l-leg': {
                baseKey: 'l-upper-leg',
                joints: [
                    { partKey: 'l-lower-leg', names: ['left-knee', 'L Knee', 'Left Knee'] },
                    { partKey: 'l-foot', names: ['left-ankle', 'L Ankle', 'Left Ankle'] }
                ]
            }
        };

        const def = defs[partKey];
        if (!def) return false;

        if (!map[def.baseKey]) {
            map[def.baseKey] = this._createMotionChannel(def.baseKey, obj, {
                target: 'base'
            });
        }

        def.joints.forEach(entry => {
            const joint = this._findMotionJointByNames(obj, entry.names);
            if (map[entry.partKey]) return;
            if (joint) {
                map[entry.partKey] = this._createMotionChannel(entry.partKey, obj, {
                    target: 'joint',
                    joint
                });
                return;
            }
            const isGuidedMotion = obj.guidedMotionRig === true
                || obj.bodyPartData?.presetKey === 'guided-motion-front'
                || obj.bodyPartData?.charType === 'guided-motion-front';
            const flexPin = isGuidedMotion && entry === def.joints[0] ? obj.flexPins?.[0] : null;
            if (flexPin) {
                map[entry.partKey] = this._createMotionChannel(entry.partKey, obj, {
                    target: 'flex',
                    flexPin,
                    label: flexPin.name || entry.partKey
                });
            }
        });

        return true;
    },

    _getPartMotionChannelMap() {
        const map = {};
        const stageObjects = this._isGuidedMotionAssembly()
            ? this._getGuidedMotionObjects()
            : (this.objects.objects || []);
        stageObjects.forEach(obj => {
            const partKey = obj?.bodyPartData?.partKey;
            if (!partKey) return;
            this._applyGlobalJointLimits(obj.bodyPartData);

            // Guided Motion uses one combined head/neck cutout. Expose it through
            // the standard Human Front head channel so look, nod, and head poses
            // animate the piece instead of being silently skipped.
            if (partKey === 'head-neck') {
                map.head = this._createMotionChannel('head', obj, {
                    target: 'base',
                    label: obj.bodyPartData?.jointName || 'Head / Neck'
                });
                const neckPin = obj.flexPins?.[0];
                if (neckPin) {
                    map.neck = this._createMotionChannel('neck', obj, {
                        target: 'flex',
                        flexPin: neckPin,
                        label: neckPin.name || 'Neck'
                    });
                }
                return;
            }

            if (this._addBodySlicerMotionChannels(map, obj, partKey)) {
                this._addMotionChannelAliases(map, partKey, this._createMotionChannel(partKey, obj, { target: 'base' }));
                return;
            }

            this._addMotionChannelAliases(map, partKey, this._createMotionChannel(partKey, obj, { target: 'base' }));
        });
        return map;
    },

    _getUniqueObjectsFromPartMap(partMap) {
        const seen = new Set();
        const unique = [];
        Object.values(partMap || {}).forEach(entry => {
            const obj = this._getMapEntryObject(entry);
            if (!obj?.id || seen.has(obj.id)) return;
            seen.add(obj.id);
            unique.push(obj);
        });
        unique.sort((a, b) => {
            const aRank = a?.pinnedTo ? 1 : 0;
            const bRank = b?.pinnedTo ? 1 : 0;
            return aRank - bRank;
        });
        return unique;
    },

    _resetObjectToIdleBaseline(obj, options = {}) {
        const { resetInnerJoints = true } = options;
        if (!obj) return false;

        let changed = false;
        if (this.objects?._setObjectRotationDriverValue) {
            const driver = this.objects._getObjectRotationDriver?.(obj) || 'rotation';
            const current = driver === 'jointBaseAngle'
                ? (obj.jointBaseAngle || 0)
                : (obj.rotation || 0);
            if (Math.abs(current) > 0.001 || Math.abs(obj.rotation || 0) > 0.001) {
                this.objects._setObjectRotationDriverValue(obj, 0);
                changed = true;
            }
        } else {
            if (typeof obj.jointBaseAngle === 'number' && Math.abs(obj.jointBaseAngle) > 0.001) {
                obj.jointBaseAngle = 0;
                changed = true;
            }
            if (Math.abs(obj.rotation || 0) > 0.001) {
                obj.rotation = 0;
                changed = true;
            }
        }

        if (resetInnerJoints && Array.isArray(obj.joints)) {
            obj.joints.forEach(jt => {
                if (Math.abs(jt?.angle || 0) > 0.001) {
                    jt.angle = 0;
                    changed = true;
                }
            });
        }
        if (Array.isArray(obj.flexPins)) {
            obj.flexPins.forEach(pin => {
                if (Math.abs(pin?.angle || 0) > 0.001) {
                    pin.angle = 0;
                    changed = true;
                }
            });
        }

        return changed;
    },

    _resetAssembledPartsToIdleBaseline(partMap, options = {}) {
        let changed = 0;
        this._getUniqueObjectsFromPartMap(partMap).forEach(obj => {
            if (this._resetObjectToIdleBaseline(obj, options)) changed++;
        });
        if (changed && this.objects?._resolvePins) this.objects._resolvePins();
        return changed;
    },

    _shouldResetMovementToIdleFirst() {
        const panel = document.getElementById('joint-movement-picker');
        return panel?.querySelector('#jmp-reset-idle-toggle')?.checked !== false;
    },

    _shouldResetPoseToIdleFirst() {
        const panel = document.getElementById('joint-pose-panel');
        return panel?.querySelector('#jpl-reset-idle-toggle')?.checked !== false;
    },

    _getPresetProfileLabel(presetKey) {
        switch (presetKey) {
            case 'body-slicer-front':
                return 'Human · Front Facing · Body Slicer';
            case 'human-front':
                return 'Human · Front Facing';
            case 'human-side':
                return 'Human · Side Facing';
            case 'quadruped':
            case 'bird':
            case 'fish':
                return 'Animals · Side Facing';
            case 'spider':
                return 'Animals · Top Facing';
            default:
                return this._friendlyPresetName(presetKey || 'Other');
        }
    },

    _getCanonicalPresetKey(presetKey) {
        switch (presetKey) {
            case 'body-slicer-front':
            case 'guided-motion-front':
                return 'human-front';
            case 'body-slicer-side':
                return 'human-side';
            default:
                return presetKey;
        }
    },

    _detectAssembledMotionProfile() {
        if (this._activePreset?.motionPresetKey) {
            return this._getCanonicalPresetKey(this._activePreset.motionPresetKey);
        }
        if (this._activePreset?.key) {
            const activeProfile = this._getCanonicalPresetKey(this._activePreset.key);
            if (activeProfile !== this._activePreset.key) return activeProfile;
        }

        const stageObjects = this._isGuidedMotionAssembly()
            ? this._getGuidedMotionObjects()
            : (this.objects.objects || []);
        const types = {};
        stageObjects.forEach(obj => {
            const key = obj?.bodyPartData?.motionPresetKey
                || obj?.bodyPartData?.charType
                || obj?.bodyPartData?.presetKey;
            if (!key) return;
            types[key] = (types[key] || 0) + 1;
        });

        let best = null;
        let bestCount = 0;
        Object.entries(types).forEach(([key, count]) => {
            if (count > bestCount) {
                best = key;
                bestCount = count;
            }
        });
        return this._getCanonicalPresetKey(best || this._detectAssembledPreset());
    },

    _getAvailableMovementLibrary(profileKey = this._detectAssembledMotionProfile()) {
        const canonicalProfileKey = this._getCanonicalPresetKey(profileKey);
        switch (canonicalProfileKey) {
            case 'body-slicer-front':
                return JointSystem._buildBodySlicerFrontMovementLibrary().map(move => this._getDecoratedMovement(move));
            default: {
                const base = JointMovements.getAll();
                // Also surface the richer hand-authored armature action movements
                // (walk cycle, boxing, sway, march, …) in the picker, converted from
                // armature-joint space to front-angle and deduped by name against the
                // native front catalog. Mirrors the expressive-pose bridge.
                const seenNames = new Set(base.map(m => String(m?.name || '').toLowerCase()));
                const ported = (JointSystem._getArmaturePortedFrontMovements?.() || [])
                    .filter(m => m && !seenNames.has(String(m.name || '').toLowerCase()));
                return [...base, ...ported].map(move => this._getDecoratedMovement(move));
            }
        }
    },

    _getMovementByKey(moveKey, profileKey = this._detectAssembledMotionProfile()) {
        return this._getAvailableMovementLibrary(profileKey).find(move => move.key === moveKey)
            || this._getDecoratedMovement(JointMovements.getAll().find(move => move.key === moveKey));
    },

    _cloneContactSpecMap(map) {
        try {
            return JSON.parse(JSON.stringify(map || {}));
        } catch {
            return {};
        }
    },

    _getContactOverrideStorageKey() {
        return 'joint-body-tag-contact-overrides-v1';
    },

    _loadContactOverrideStore() {
        try {
            const parsed = JSON.parse(localStorage.getItem(this._getContactOverrideStorageKey()) || '{}') || {};
            return {
                poses: parsed.poses && typeof parsed.poses === 'object' ? parsed.poses : {},
                moves: parsed.moves && typeof parsed.moves === 'object' ? parsed.moves : {},
                armaturePoses: parsed.armaturePoses && typeof parsed.armaturePoses === 'object' ? parsed.armaturePoses : {},
                armatureMoves: parsed.armatureMoves && typeof parsed.armatureMoves === 'object' ? parsed.armatureMoves : {}
            };
        } catch {
            return { poses: {}, moves: {}, armaturePoses: {}, armatureMoves: {} };
        }
    },

    _saveContactOverrideStore(store) {
        const next = {
            poses: store?.poses && typeof store.poses === 'object' ? store.poses : {},
            moves: store?.moves && typeof store.moves === 'object' ? store.moves : {},
            armaturePoses: store?.armaturePoses && typeof store.armaturePoses === 'object' ? store.armaturePoses : {},
            armatureMoves: store?.armatureMoves && typeof store.armatureMoves === 'object' ? store.armatureMoves : {}
        };
        localStorage.setItem(this._getContactOverrideStorageKey(), JSON.stringify(next));
    },

    _getContactOverrideBucket(kind) {
        switch (kind) {
            case 'pose':
                return 'poses';
            case 'move':
                return 'moves';
            case 'armature-pose':
                return 'armaturePoses';
            case 'armature-move':
                return 'armatureMoves';
            default:
                return null;
        }
    },

    _getContactOverride(kind, key) {
        const bucket = this._getContactOverrideBucket(kind);
        if (!bucket) return null;
        const store = this._loadContactOverrideStore();
        const value = store?.[bucket]?.[key];
        return value && typeof value === 'object' ? this._cloneContactSpecMap(value) : null;
    },

    _setContactOverride(kind, key, contacts) {
        const bucket = this._getContactOverrideBucket(kind);
        if (!bucket) return;
        const store = this._loadContactOverrideStore();
        if (!store[bucket]) store[bucket] = {};
        if (contacts && Object.keys(contacts).length) {
            store[bucket][key] = this._cloneContactSpecMap(contacts);
        } else {
            delete store[bucket][key];
        }
        this._saveContactOverrideStore(store);
    },

    _getDecoratedPose(pose) {
        if (!pose) return null;
        const overrideContacts = this._getContactOverride('pose', pose.id);
        return overrideContacts
            ? { ...pose, overrideContacts }
            : pose;
    },

    _getDecoratedMovement(move) {
        if (!move) return null;
        const overrideContacts = this._getContactOverride('move', move.key);
        return overrideContacts
            ? { ...move, overrideContacts }
            : move;
    },

    _getDecoratedArmaturePoseEntry(key, pose) {
        if (!pose) return null;
        const overrideContacts = this._getContactOverride('armature-pose', key);
        const decorated = { key, ...pose };
        return overrideContacts
            ? { ...decorated, overrideContacts }
            : decorated;
    },

    _isFront3qLocalFlexAngleKey(key = '') {
        return /^(r|l)-(forearm|hand|lower-leg|foot)$/.test(key)
            || /^(right|left)-(elbow|wrist|knee|ankle)$/.test(key);
    },

    _mirrorFront3qArmatureMap(map = {}, options = {}) {
        const result = {};
        const invertPrimaryLimbSwing = options.invertPrimaryLimbSwing !== false;
        const swapKey = (key) => {
            if (/^r-/.test(key)) return key.replace(/^r-/, 'l-');
            if (/^l-/.test(key)) return key.replace(/^l-/, 'r-');
            if (/^right-/.test(key)) return key.replace(/^right-/, 'left-');
            if (/^left-/.test(key)) return key.replace(/^left-/, 'right-');
            return key;
        };
        const isPrimaryLimbSwing = (key) => /^(r|l)-upper-(arm|leg)$/.test(key)
            || /^(right|left)-(shoulder|hip)$/.test(key);
        Object.entries(map || {}).forEach(([key, value]) => {
            if (!Number.isFinite(value)) return;
            const mappedKey = swapKey(key);
            const isLocalFlex = this._isFront3qLocalFlexAngleKey(key);
            const shouldInvert = (mappedKey !== key && !isLocalFlex && (invertPrimaryLimbSwing || !isPrimaryLimbSwing(key)))
                || key === 'torso'
                || key === 'head'
                || key === 'neck';
            result[mappedKey] = shouldInvert ? -value : value;
        });
        return result;
    },

    _mirrorFront3qArmatureTiltMap(map = {}) {
        const result = {};
        const swapKey = (key) => {
            if (/^r-/.test(key)) return key.replace(/^r-/, 'l-');
            if (/^l-/.test(key)) return key.replace(/^l-/, 'r-');
            if (/^right-/.test(key)) return key.replace(/^right-/, 'left-');
            if (/^left-/.test(key)) return key.replace(/^left-/, 'right-');
            return key;
        };
        Object.entries(map || {}).forEach(([key, tilt]) => {
            const normalized = this._normalizeArmatureTiltValue
                ? this._normalizeArmatureTiltValue(tilt)
                : { x: Number(tilt?.x) || 0, y: Number(tilt?.y) || 0 };
            result[swapKey(key)] = {
                x: normalized.x,
                y: -normalized.y
            };
        });
        return result;
    },

    _mirrorFront3qLayerOrder(order) {
        if (!Array.isArray(order)) return order;
        const swapPart = (partKey) => {
            switch (partKey) {
                case 'right-arm': return 'left-arm';
                case 'left-arm': return 'right-arm';
                case 'right-leg': return 'left-leg';
                case 'left-leg': return 'right-leg';
                default: return partKey;
            }
        };
        const mirrored = order.map(swapPart);
        if (order.agbadaArmLayerMode) mirrored.agbadaArmLayerMode = order.agbadaArmLayerMode;
        return mirrored;
    },

    _normalizeRightFront3qArmFlexMap(map = {}) {
        if (!map || typeof map !== 'object') return map;
        const next = { ...map };
        const setFlex = (upperKey, flexKey, relaxed = 12, forward = -18) => {
            const swing = Number(next[upperKey]);
            if (!Number.isFinite(swing)) return;
            if (Math.abs(swing) < 1) {
                next[flexKey] = 0;
                return;
            }
            const desiredRuntime = swing < 0 ? forward : relaxed;
            next[flexKey] = desiredRuntime;
        };
        // Keep front swing as a slight forward fold, not the back-view elbow
        // fold. Runtime recordings show front swing is negative on both arms;
        // therefore the matching elbow should also resolve negative while a
        // behind-the-body swing can relax back into the small positive range.
        setFlex('r-upper-arm', 'r-forearm');
        setFlex('l-upper-arm', 'l-forearm');
        setFlex('right-shoulder', 'right-elbow');
        setFlex('left-shoulder', 'left-elbow');
        return next;
    },

    _hasFront3qAngleMap(map) {
        return !!map && typeof map === 'object' && Object.keys(map).length > 0;
    },

    _scaleRightFront3qSwingMap(map = {}, factor = 0.7) {
        if (!this._hasFront3qAngleMap(map)) return {};
        const scaled = {};
        const keepKeys = new Set(['torso', 'head', 'neck']);
        Object.entries(map).forEach(([key, value]) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return;
            scaled[key] = keepKeys.has(key) ? n : n * factor;
        });
        return this._normalizeRightFront3qArmFlexMap(scaled);
    },

    _fillRightFront3qSwingGaps(frames = [], prop = 'angles') {
        if (!Array.isArray(frames) || !frames.length) return frames;
        return frames.map((frame, index) => {
            if (this._hasFront3qAngleMap(frame?.[prop])) return frame;
            let source = null;
            for (let i = index - 1; i >= 0; i -= 1) {
                if (this._hasFront3qAngleMap(frames[i]?.[prop])) {
                    source = frames[i][prop];
                    break;
                }
            }
            if (!source) {
                for (let i = index + 1; i < frames.length; i += 1) {
                    if (this._hasFront3qAngleMap(frames[i]?.[prop])) {
                        source = frames[i][prop];
                        break;
                    }
                }
            }
            if (!source) return frame;
            return {
                ...frame,
                [prop]: this._scaleRightFront3qSwingMap(source, 0.72)
            };
        });
    },

    _shouldMirrorFront3qMovementEntry(key, armature = null) {
        if (!armature || !this._armatureUsesHumanFrontCatalog?.(armature)) return false;
        if (this._getArmatureFrontBackFacing?.(armature) === 'back') return false;
        const lean = this._getArmatureFront3qLean?.(armature);
        if (lean !== 'left' && lean !== 'right') return false;
        const normalizedKey = String(key || '');
        if ((lean === 'left' && (/-left$/.test(normalizedKey) || /left-facing/.test(normalizedKey)))
            || (lean === 'right' && (/-right$/.test(normalizedKey) || /right-facing/.test(normalizedKey)))) return false;
        return normalizedKey === 'hf-guided-strut-walk'
            || key === 'guided-strut-walk'
            || key === 'hf-guided-casual-walk'
            || key === 'guided-casual-walk'
            || key === 'hf-guided-strut-travel'
            || key === 'guided-strut-travel'
            || key === 'hf-guided-stroll-travel'
            || key === 'guided-stroll-travel'
            || key === 'hf-guided-run'
            || key === 'guided-run'
            || key === 'hf-guided-run-travel'
            || key === 'guided-run-travel'
            || key === 'guided-run-forward'
            || key === 'hf-guided-strong-run'
            || key === 'guided-strong-run'
            || key === 'hf-guided-strong-run-travel'
            || key === 'guided-strong-run-travel'
            || key === 'guided-strong-run-forward'
            || /(?:^|-)guided-strut-travel-right$/.test(normalizedKey)
            || /(?:^|-)guided-stroll-travel-right$/.test(normalizedKey)
            || /(?:^|-)guided-run-travel-right$/.test(normalizedKey)
            || /(?:^|-)guided-strut-walk-right$/.test(normalizedKey)
            || /(?:^|-)guided-stroll-walk-right$/.test(normalizedKey);
    },

    _isGuidedFront3qLocomotionKey(key = '') {
        const normalizedKey = String(key || '');
        return normalizedKey === 'hf-guided-strut-walk'
            || normalizedKey === 'guided-strut-walk'
            || normalizedKey === 'hf-guided-casual-walk'
            || normalizedKey === 'guided-casual-walk'
            || normalizedKey === 'hf-guided-strut-travel'
            || normalizedKey === 'guided-strut-travel'
            || normalizedKey === 'hf-guided-stroll-travel'
            || normalizedKey === 'guided-stroll-travel'
            || normalizedKey === 'hf-guided-run'
            || normalizedKey === 'guided-run'
            || normalizedKey === 'hf-guided-run-travel'
            || normalizedKey === 'guided-run-travel'
            || normalizedKey === 'guided-run-forward'
            || normalizedKey === 'hf-guided-strong-run'
            || normalizedKey === 'guided-strong-run'
            || normalizedKey === 'hf-guided-strong-run-travel'
            || normalizedKey === 'guided-strong-run-travel'
            || normalizedKey === 'guided-strong-run-forward'
            || /(?:^|-)guided-strut-travel-(?:left|right)$/.test(normalizedKey)
            || /(?:^|-)guided-stroll-travel-(?:left|right)$/.test(normalizedKey)
            || /(?:^|-)guided-run-travel-(?:left|right)$/.test(normalizedKey)
            || /(?:^|-)guided-strut-walk-(?:left|right)$/.test(normalizedKey)
            || /(?:^|-)guided-stroll-walk-(?:left|right)$/.test(normalizedKey);
    },

    _invertFront3qArmatureNumericMap(map = {}) {
        const result = {};
        Object.entries(map || {}).forEach(([key, value]) => {
            const n = Number(value);
            if (!Number.isFinite(n)) return;
            result[key] = -n;
        });
        return result;
    },

    _invertFront3qArmatureTiltMap(map = {}) {
        const result = {};
        Object.entries(map || {}).forEach(([key, tilt]) => {
            const normalized = this._normalizeArmatureTiltValue
                ? this._normalizeArmatureTiltValue(tilt)
                : { x: Number(tilt?.x) || 0, y: Number(tilt?.y) || 0 };
            result[key] = {
                x: normalized.x,
                y: -normalized.y
            };
        });
        return result;
    },

    _invertFront3qArmatureSwingTiltMap(map = {}) {
        const result = {};
        Object.entries(map || {}).forEach(([key, tilt]) => {
            const normalized = this._normalizeArmatureTiltValue
                ? this._normalizeArmatureTiltValue(tilt)
                : { x: Number(tilt?.x) || 0, y: Number(tilt?.y) || 0 };
            result[key] = {
                x: -normalized.x,
                y: normalized.y
            };
        });
        return result;
    },

    _invertFront3qArmatureOffsetMap(map = {}) {
        const result = {};
        Object.entries(map || {}).forEach(([key, offset]) => {
            if (!offset || typeof offset !== 'object') return;
            const next = { ...offset };
            const x = Number(offset.x);
            if (Number.isFinite(x)) next.x = -x;
            const y = Number(offset.y);
            if (Number.isFinite(y)) next.y = y;
            result[key] = next;
        });
        return result;
    },

    _invertFront3qArmatureRootTravel(travel = {}) {
        if (!travel || typeof travel !== 'object') return travel;
        const next = { ...travel };
        ['x', 'distance', 'distanceX'].forEach(key => {
            const value = Number(next[key]);
            if (Number.isFinite(value)) next[key] = -value;
        });
        return next;
    },

    _getMovementRootTravelSpec(move) {
        const spec = move?.rootTravel;
        return spec && typeof spec === 'object' ? spec : null;
    },

    _getMovementRootTravelPartKey(spec) {
        return String(spec?.partKey || spec?.targetPart || spec?.part || 'torso');
    },

    _getMovementRootTravelDelta(spec, t = 0) {
        if (!spec) return { x: 0, y: 0 };
        const progress = Math.max(0, Math.min(1, Number(t) || 0));
        const rawX = Number(spec.x ?? spec.distanceX ?? spec.distance ?? 0);
        const rawY = Number(spec.y ?? spec.distanceY ?? 0);
        return {
            x: (Number.isFinite(rawX) ? rawX : 0) * progress,
            y: (Number.isFinite(rawY) ? rawY : 0) * progress
        };
    },

    _resolveMovementRootTravelChannel(move, partMap) {
        const spec = this._getMovementRootTravelSpec(move);
        if (!spec) return null;
        const preferredKey = this._getMovementRootTravelPartKey(spec);
        const candidates = [preferredKey, 'torso', 'body', 'root', 'pelvis'];
        for (const partKey of candidates) {
            const channel = partMap?.[partKey];
            const obj = this._getMapEntryObject(channel);
            if (obj && !obj.pinnedTo) return { spec, partKey, channel, obj };
        }
        return null;
    },

    _applyMovementRootTravel(move, partMap, t, baseStates = null) {
        const resolved = this._resolveMovementRootTravelChannel(move, partMap);
        if (!resolved) return;
        const { spec, partKey, obj } = resolved;
        const base = baseStates?.[partKey]
            ? { x: baseStates[partKey].x ?? obj.x ?? 0, y: baseStates[partKey].y ?? obj.y ?? 0 }
            : { x: obj.x ?? 0, y: obj.y ?? 0 };
        const delta = this._getMovementRootTravelDelta(spec, t);
        const hasX = spec.x !== undefined || spec.distanceX !== undefined || spec.distance !== undefined;
        const hasY = spec.y !== undefined || spec.distanceY !== undefined;
        if (hasX) obj.x = base.x + delta.x;
        if (hasY) obj.y = base.y + delta.y;
    },

    _addMovementRootTravelAnimation(move, partMap) {
        const resolved = this._resolveMovementRootTravelChannel(move, partMap);
        if (!resolved) return 0;
        const { spec, obj } = resolved;
        if (!obj.animations) obj.animations = [];
        const x = Number(spec.x ?? spec.distanceX ?? spec.distance ?? 0);
        const y = Number(spec.y ?? spec.distanceY ?? 0);
        const configs = [];
        const duration = Math.max(1, Number(move.duration || 0) * (Number.isFinite(move.repeat) ? move.repeat : 1));
        if (Number.isFinite(x) && Math.abs(x) > 0.01) {
            configs.push({
                property: 'x',
                from: obj.x ?? 0,
                to: (obj.x ?? 0) + x,
                duration,
                easing: spec.easing || move.easing || 'linear'
            });
        }
        if (Number.isFinite(y) && Math.abs(y) > 0.01) {
            configs.push({
                property: 'y',
                from: obj.y ?? 0,
                to: (obj.y ?? 0) + y,
                duration,
                easing: spec.easing || move.easing || 'linear'
            });
        }
        if (!configs.length) return 0;
        obj.animations.push({
            id: 'anim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
            name: `${move.name} — forward travel`,
            delay: 0,
            repeat: 1,
            generated: configs.length === 1 ? configs[0] : configs
        });
        return 1;
    },

    _createFront3qFacingMovementEntry(key, move, lean = 'right') {
        const isRight = lean === 'right';
        const normalizedKey = String(key || '').toLowerCase();
        // Front 3/4 is side-view locomotion drawn on a front-facing rig:
        // right-facing => right limb is near/front, left limb is far/behind;
        // left-facing  => left limb is near/front, right limb is far/behind.
        const mirror = !isRight;
        const layerOrder = isRight
            ? ['left-arm', 'left-leg', 'torso', 'head-neck', 'right-leg', 'right-arm']
            : ['right-arm', 'right-leg', 'torso', 'head-neck', 'left-leg', 'left-arm'];
        const entry = JointSystem._cloneArmatureCatalogEntry(move) || {};
        const isRunTravel = normalizedKey === 'hf-guided-run-travel'
            || normalizedKey === 'guided-run-travel'
            || normalizedKey === 'guided-run-forward'
            || normalizedKey === 'hf-guided-strong-run-travel'
            || normalizedKey === 'guided-strong-run-travel'
            || normalizedKey === 'guided-strong-run-forward'
            || /(?:^|-)guided-run-travel-(?:left|right)$/.test(normalizedKey);
        const isStrongRun = normalizedKey === 'hf-guided-strong-run'
            || normalizedKey === 'guided-strong-run'
            || normalizedKey === 'hf-guided-strong-run-travel'
            || normalizedKey === 'guided-strong-run-travel'
            || normalizedKey === 'guided-strong-run-forward';
        const isRun = normalizedKey === 'hf-guided-run' || normalizedKey === 'guided-run' || isStrongRun || isRunTravel;
        const isStrut = normalizedKey === 'hf-guided-strut-walk'
            || normalizedKey === 'guided-strut-walk'
            || normalizedKey === 'hf-guided-strut-travel'
            || normalizedKey === 'guided-strut-travel'
            || /(?:^|-)guided-strut-(?:walk|travel)-(?:left|right)$/.test(normalizedKey);
        const isTravel = normalizedKey === 'hf-guided-strut-travel'
            || normalizedKey === 'guided-strut-travel'
            || normalizedKey === 'hf-guided-stroll-travel'
            || normalizedKey === 'guided-stroll-travel'
            || /(?:^|-)guided-(?:strut|stroll)-travel-(?:left|right)$/.test(normalizedKey);
        const facingLabel = isRight ? 'Right Facing' : 'Left Facing';
        const facingText = isRight ? '3/4-right' : '3/4-left';
        const nearText = isRight
            ? 'right arm/leg in front and the left arm/leg behind the torso'
            : 'left arm/leg in front and the right arm/leg behind the torso';
        entry.name = isRun
            ? `Guided 3/4 Run${isRunTravel ? ' Forward' : ''} (${facingLabel})`
            : (isStrut
                ? `Guided 3/4 Strut${isTravel ? ' Forward' : ''} (${facingLabel})`
                : `Guided 3/4 Stroll${isTravel ? ' Forward' : ''} (${facingLabel})`);
        entry.description = isRun
            ? `Fast ${facingText} run${isRunTravel ? ' that travels forward on the X axis' : ''} with the ${nearText}.`
            : (isStrut
                ? `Energetic ${facingText} strut${isTravel ? ' that travels forward' : ''} with the ${nearText}.`
                : `Relaxed ${facingText} stroll${isTravel ? ' that travels forward' : ''} with the ${nearText}.`);
        entry._front3qAuthoredForRight = isRight;
        entry._front3qAuthoredForLeft = !isRight;
        entry.frontViewLayerOverride = [...layerOrder];
        entry.layerOrderOverride = [...layerOrder];
        entry.preserveFrontLeftUpperSigns = true;
        entry.preserveFrontLeftLowerSigns = true;

        if (isRun) {
            const tiltY = isRight ? 45 : -45;
            const depthTilt = () => ({
                torso: { y: tiltY },
                'head-neck': { y: tiltY },
                'left-arm': { y: tiltY },
                'right-arm': { y: tiltY },
                'left-leg': { y: tiltY },
                'right-leg': { y: tiltY }
            });
            const jointDepthTilt = () => ({
                'right-shoulder': { y: tiltY },
                'left-shoulder': { y: tiltY },
                'right-hip': { y: tiltY },
                'left-hip': { y: tiltY }
            });
            const rightRunFrames = [
                { t: 0, dy: -4, torso: 3, jointAngles: { 'right-shoulder': 34, 'left-shoulder': -38, 'right-elbow': -28, 'left-elbow': -24, 'right-wrist': -5, 'left-wrist': -5, 'right-hip': -42, 'left-hip': 54, 'right-knee': -28, 'left-knee': 44, 'right-ankle': -4, 'left-ankle': 8, neck: 2 } },
                { t: 1 / 12, dy: -7, torso: 2.3333333333333335, jointAngles: { 'right-shoulder': 27.333333333333336, 'left-shoulder': -31.333333333333336, 'right-elbow': -24, 'left-elbow': -20.666666666666668, 'right-wrist': -4, 'left-wrist': -4, 'right-hip': -32.66666666666667, 'left-hip': 42.66666666666667, 'right-knee': -22.666666666666668, 'left-knee': 35.333333333333336, 'right-ankle': -4, 'left-ankle': 8, neck: 1.3333333333333335 } },
                { t: 2 / 12, dy: -10, torso: 1.6666666666666667, jointAngles: { 'right-shoulder': 20.666666666666668, 'left-shoulder': -24.666666666666668, 'right-elbow': -20, 'left-elbow': -17.333333333333336, 'right-wrist': -3, 'left-wrist': -3, 'right-hip': -23.333333333333336, 'left-hip': 31.333333333333336, 'right-knee': -17.333333333333336, 'left-knee': 26.666666666666668, 'right-ankle': -4, 'left-ankle': 8, neck: 0.6666666666666667 } },
                { t: 3 / 12, dy: -13, torso: 1, jointAngles: { 'right-shoulder': 14, 'left-shoulder': -18, 'right-elbow': -16, 'left-elbow': -14, 'right-wrist': -2, 'left-wrist': -2, 'right-hip': -14, 'left-hip': 20, 'right-knee': -12, 'left-knee': 18, 'right-ankle': -4, 'left-ankle': 8, neck: 0 } },
                { t: 4 / 12, dy: -10, torso: -0.33333333333333304, jointAngles: { 'right-shoulder': -2, 'left-shoulder': 0.6666666666666643, 'right-elbow': -1.3333333333333357, 'left-elbow': -1.3333333333333357, 'right-wrist': 0.33333333333333304, 'left-wrist': 0.33333333333333304, 'right-hip': 4.666666666666664, 'left-hip': -4.666666666666661, 'right-knee': -17.333333333333332, 'left-knee': 26.666666666666664, 'right-ankle': -1.333333333333334, 'left-ankle': 2.666666666666668, neck: -0.6666666666666665 } },
                { t: 5 / 12, dy: -7, torso: -1.666666666666667, jointAngles: { 'right-shoulder': -18, 'left-shoulder': 19.333333333333336, 'right-elbow': -11.667, 'left-elbow': 11.667, 'right-wrist': 2.666666666666667, 'left-wrist': 2.666666666666667, 'right-hip': 23.333333333333336, 'left-hip': -29.333333333333336, 'right-knee': -22.667, 'left-knee': 35.333333333333336, 'right-ankle': 1.333333333333334, 'left-ankle': -2.666666666666668, neck: -1.3333333333333335 } },
                { t: 6 / 12, dy: -4, torso: -3, jointAngles: { 'right-shoulder': -34, 'left-shoulder': 38, 'right-elbow': -28, 'left-elbow': 24, 'right-wrist': 5, 'left-wrist': 5, 'right-hip': 42, 'left-hip': -54, 'right-knee': -28, 'left-knee': 44, 'right-ankle': 4, 'left-ankle': -8, neck: -2 } },
                { t: 7 / 12, dy: -7, torso: -2.333333333333333, jointAngles: { 'right-shoulder': -27.33333333333333, 'left-shoulder': 31.33333333333333, 'right-elbow': -24, 'left-elbow': 20.666666666666664, 'right-wrist': 4, 'left-wrist': 4, 'right-hip': 32.666666666666664, 'left-hip': -42.66666666666666, 'right-knee': -22.666666666666664, 'left-knee': 35.33333333333333, 'right-ankle': 4, 'left-ankle': -8, neck: -1.333333333333333 } },
                { t: 8 / 12, dy: -10, torso: -1.666666666666667, jointAngles: { 'right-shoulder': -20.66666666666667, 'left-shoulder': 24.66666666666667, 'right-elbow': -20, 'left-elbow': 17.333333333333336, 'right-wrist': 3, 'left-wrist': 3, 'right-hip': 23.333333333333336, 'left-hip': -31.33333333333334, 'right-knee': -17.333333333333336, 'left-knee': 26.66666666666667, 'right-ankle': 4, 'left-ankle': -8, neck: -0.666666666666667 } },
                { t: 9 / 12, dy: -13, torso: -1, jointAngles: { 'right-shoulder': -14, 'left-shoulder': 18, 'right-elbow': -16, 'left-elbow': 14, 'right-wrist': 2, 'left-wrist': 2, 'right-hip': 14, 'left-hip': -20, 'right-knee': -12, 'left-knee': 18, 'right-ankle': 4, 'left-ankle': -8, neck: 0 } },
                { t: 10 / 12, dy: -10, torso: 0.3333333333333339, jointAngles: { 'right-shoulder': 2, 'left-shoulder': -0.666666666666675, 'right-elbow': 1.3333333333333268, 'left-elbow': 1.3333333333333286, 'right-wrist': -0.33333333333333437, 'left-wrist': -0.33333333333333437, 'right-hip': -4.666666666666675, 'left-hip': 4.6666666666666785, 'right-knee': -17.333333333333336, 'left-knee': 26.66666666666667, 'right-ankle': 1.3333333333333321, 'left-ankle': -2.6666666666666643, neck: 0.666666666666667 } },
                { t: 11 / 12, dy: -7, torso: 1.666666666666666, jointAngles: { 'right-shoulder': 18, 'left-shoulder': -19.33333333333333, 'right-elbow': -13.333333333333329, 'left-elbow': -11.333333333333329, 'right-wrist': -2.666666666666666, 'left-wrist': -2.666666666666666, 'right-hip': -23.33333333333333, 'left-hip': 29.33333333333332, 'right-knee': -22.666666666666664, 'left-knee': 35.33333333333333, 'right-ankle': -1.3333333333333321, 'left-ankle': 2.6666666666666643, neck: 1.333333333333333 } },
                { t: 1, dy: -4, torso: 3, jointAngles: { 'right-shoulder': 34, 'left-shoulder': -38, 'right-elbow': -28, 'left-elbow': -24, 'right-wrist': -5, 'left-wrist': -5, 'right-hip': -42, 'left-hip': 54, 'right-knee': -28, 'left-knee': 44, 'right-ankle': -4, 'left-ankle': 8, neck: 2 } }
            ];
            const tunedRightRunFrames = rightRunFrames.map(frame => {
                const j = frame.jointAngles || {};
                const leftKnee = Math.abs(Number(j['left-knee']) || 0);
                return {
                    ...frame,
                    jointAngles: {
                        ...j,
                        // The front/right knee should fold like the readable left-leg run
                        // silhouette, but with a smaller amplitude to avoid side-kick flexion.
                        'right-knee': Math.round(leftKnee * 0.68)
                    }
                };
            });
            const tunedLeftRunFrames = tunedRightRunFrames.map(frame => {
                const j = frame.jointAngles || {};
                const leftShoulder = -j['right-shoulder'];
                const rawLeftElbow = j['right-elbow'];
                const leftElbow = leftShoulder < -8
                    ? Math.max(rawLeftElbow, -18)
                    : (leftShoulder > 8
                        ? Math.abs(rawLeftElbow)
                        : rawLeftElbow);
                return {
                    t: frame.t,
                    dy: frame.dy,
                    torso: -frame.torso,
                    jointAngles: {
                        'left-shoulder': leftShoulder,
                        'right-shoulder': -j['left-shoulder'],
                        'left-elbow': leftElbow,
                        'right-elbow': -j['left-elbow'],
                        'left-wrist': j['right-wrist'],
                        'right-wrist': -j['left-wrist'],
                        'left-hip': -j['right-hip'],
                        'right-hip': -j['left-hip'],
                        'left-knee': -j['right-knee'],
                        'right-knee': -j['left-knee'],
                        'left-ankle': -j['right-ankle'],
                        'right-ankle': -j['left-ankle'],
                        neck: -j.neck
                    }
                };
            });
            const runFrames = isRight ? tunedRightRunFrames : tunedLeftRunFrames;
            const runTorsoLean = 10 * (isRight ? 1 : -1);
            // Keep travel authored as positive "forward", matching strut/stroll.
            // _orientArmatureMovementTravelForFacing maps it to +x for right-facing
            // and -x for left-facing during stage playback, timeline bake, and export.
            const travelDistance = isRunTravel ? 162 : 0;
            const mkRun = (t, jointAngles, torsoTwist = 0, dy = 0, dx = 0) => ({
                t,
                dy,
                jointAngles,
                partAngles: { torso: runTorsoLean + torsoTwist },
                offsets: { torso: { y: dy } },
                jointTilts: jointDepthTilt(),
                partTilts: depthTilt(),
                dx,
                frontViewLayerOverride: [...layerOrder],
                layerOrderOverride: [...layerOrder],
                agbadaArmLayerMode: 'respect-arm-order',
                preserveFrontLeftUpperSigns: true,
                preserveFrontLeftLowerSigns: true,
                _front3qAuthoredForRight: isRight,
                _front3qAuthoredForLeft: !isRight
            });
            entry.duration = 780;
            entry.easing = 'easeInOut';
            entry.repeat = Infinity;
            entry.contacts = {};
            entry.viewCompatibility = [`front-3q-${isRight ? 'right' : 'left'}`];
            entry.directionLabel = `Front 3/4 ${facingLabel.replace(' Facing', '')}`;
            entry.auditNotes = [
                'Forward travel with dx',
                'Same running posture',
                'Continuous loop'
            ];
            if (isRunTravel) {
                entry.icon = 'fa-person-running';
                entry.category = 'Guided Essentials';
                delete entry.absoluteTravel;
                delete entry.rootTravel;
                entry.walkTravelLoopFinalFromStart = true;
                delete entry.walkTravelLoopKeepTerminal;
                entry.skipStartIdleBookend = true;
                entry.skipEndIdleBookend = true;
            }
            entry.preserveFrontLeftUpperSigns = true;
            entry.preserveFrontLeftLowerSigns = true;
            entry.keyframes = runFrames.map(frame => mkRun(
                frame.t,
                { ...frame.jointAngles },
                frame.torso,
                frame.dy,
                Math.round(travelDistance * frame.t * 1000) / 1000
            ));
            return entry;
        }

        // Strut/stroll are authored from front/back limb roles, then mapped to anatomical left/right.
        // This avoids the old failure mode where a right-facing head used a left-facing limb cycle.
        const isStrutWalk = normalizedKey === 'hf-guided-strut-walk'
            || normalizedKey === 'guided-strut-walk'
            || /(?:^|-)guided-strut-walk-(?:left|right)$/.test(normalizedKey);
        const isStrollWalk = normalizedKey === 'hf-guided-casual-walk'
            || normalizedKey === 'guided-casual-walk'
            || /(?:^|-)guided-stroll-walk-(?:left|right)$/.test(normalizedKey);
        if (isStrutWalk || isStrollWalk || isTravel) {
            const strut = isStrutWalk
                || normalizedKey === 'hf-guided-strut-travel'
                || normalizedKey === 'guided-strut-travel'
                || /(?:^|-)guided-strut-travel-(?:left|right)$/.test(normalizedKey);
            const s = strut ? 1 : 0.62;
            const dir = isRight ? 1 : -1;
            const front = isRight ? 'right' : 'left';
            const back = isRight ? 'left' : 'right';
            const elbowSign = (side) => side === 'right' ? -1 : 1;
            const kneeSign = (side) => side === 'right' ? -1 : 1;
            const makeStep = (phase = 1, flexScale = 1) => {
                const m = {};
                m[`${front}-shoulder`] = 20 * dir * phase * s;
                m[`${back}-shoulder`] = -20 * dir * phase * s;
                m[`${front}-elbow`] = elbowSign(front) * 5 * flexScale * s;
                m[`${back}-elbow`] = elbowSign(back) * 5 * flexScale * s;
                m[`${front}-wrist`] = elbowSign(front) * 2 * flexScale * s;
                m[`${back}-wrist`] = elbowSign(back) * 2 * flexScale * s;
                m[`${front}-hip`] = -18 * dir * phase * s;
                m[`${back}-hip`] = 18 * dir * phase * s;
                m[`${front}-knee`] = kneeSign(front) * 5 * flexScale * s;
                m[`${back}-knee`] = kneeSign(back) * 5 * flexScale * s;
                m[`${front}-ankle`] = -2 * dir * phase * s;
                m[`${back}-ankle`] = 2 * dir * phase * s;
                m.neck = 3 * dir * phase * s;
                return m;
            };
            const A = makeStep(1);
            const B = makeStep(-1);
            const makePass = (phase = 1) => {
                const m = {};
                m[`${front}-shoulder`] = 8 * dir * phase * s;
                m[`${back}-shoulder`] = -8 * dir * phase * s;
                m[`${front}-elbow`] = elbowSign(front) * 2 * s;
                m[`${back}-elbow`] = elbowSign(back) * 2 * s;
                m[`${front}-wrist`] = 0;
                m[`${back}-wrist`] = 0;
                m[`${front}-hip`] = -6 * dir * phase * s;
                m[`${back}-hip`] = 6 * dir * phase * s;
                m[`${front}-knee`] = kneeSign(front) * 2 * s;
                m[`${back}-knee`] = kneeSign(back) * 2 * s;
                m[`${front}-ankle`] = 0;
                m[`${back}-ankle`] = 0;
                m.neck = 0;
                return m;
            };
            const P1 = makePass(1);
            const P2 = makePass(-1);
            const twistA = isRight ? 1 : -1;
            const tiltY = isRight ? 45 : -45;
            const bobLow = strut ? -2 : -1;
            const bobHigh = strut ? -6 : -4;
            // Every body part holds the 3/4 depth tilt (Y = 45 right / -45 left) before joint rotation.
            const depthTilt = () => ({
                torso: { y: tiltY },
                'head-neck': { y: tiltY },
                'left-arm': { y: tiltY },
                'right-arm': { y: tiltY },
                'left-leg': { y: tiltY },
                'right-leg': { y: tiltY }
            });
            const jointDepthTilt = (phase = 0) => ({
                'right-shoulder': { y: tiltY },
                'left-shoulder': { y: tiltY },
                'right-hip': { y: tiltY },
                'left-hip': { y: tiltY }
            });
            const mk = (t, ang, twist, dy, travelX = null, tiltPhase = 0) => {
                const offsets = { torso: { y: dy } };
                if (Number.isFinite(travelX)) offsets.torso.x = travelX;
                const f = {
                    t,
                    dy,
                    jointAngles: { ...ang },
                    offsets,
                    jointTilts: jointDepthTilt(tiltPhase),
                    partTilts: depthTilt(),
                    frontViewLayerOverride: [...layerOrder],
                    layerOrderOverride: [...layerOrder],
                    agbadaArmLayerMode: 'respect-arm-order',
                    preserveFrontLeftUpperSigns: true,
                    preserveFrontLeftLowerSigns: true,
                    _front3qAuthoredForRight: isRight,
                    _front3qAuthoredForLeft: !isRight
                };
                if (Number.isFinite(travelX)) f.dx = travelX;
                f.partAngles = { torso: Number.isFinite(twist) ? twist : 0 };
                return f;
            };
            if (isTravel) {
                // Travel is authored as positive "forward"; playback/preview/export
                // orient it to +x for right-facing and -x for left-facing.
                const travel = strut ? 180 : 140;
                entry.duration = strut ? 3300 : 4600;
                entry.easing = 'linear';
                entry.repeat = 1;
                entry.skipStartIdleBookend = true;
                entry.skipEndIdleBookend = true;
                entry.walkTravelLoopFinalFromStart = true;
                entry.walkTravelLoopKeepTerminal = true;
                entry.keyframes = [
                    mk(0.000, A, twistA, bobLow, 0),
                    mk(0.125, P1, 0, bobHigh, travel * 0.125, 1),
                    mk(0.250, B, -twistA, bobLow, travel * 0.25),
                    mk(0.375, P2, 0, bobHigh, travel * 0.375, -1),
                    mk(0.500, A, twistA, bobLow, travel * 0.5),
                    mk(0.625, P1, 0, bobHigh, travel * 0.625, 1),
                    mk(0.750, B, -twistA, bobLow, travel * 0.75),
                    mk(0.875, P2, 0, bobHigh, travel * 0.875, -1),
                    mk(1.000, A, twistA, bobLow, travel)
                ];
            } else {
                entry.duration = strut ? 1650 : 2600;
                entry.easing = 'linear';
                entry.repeat = Infinity;
                entry.skipStartIdleBookend = true;
                entry.skipEndIdleBookend = true;
                entry.walkTravelLoopFinalFromStart = true;
                entry.walkTravelLoopKeepTerminal = true;
                entry.keyframes = [
                    mk(0.000, A, twistA, bobLow),
                    mk(0.125, P1, 0, bobHigh, null, 1),
                    mk(0.250, B, -twistA, bobLow),
                    mk(0.375, P2, 0, bobHigh, null, -1),
                    mk(0.500, A, twistA, bobLow),
                    mk(0.625, P1, 0, bobHigh, null, 1),
                    mk(0.750, B, -twistA, bobLow),
                    mk(0.875, P2, 0, bobHigh, null, -1),
                    mk(1.000, A, twistA, bobLow)
                ];
            }
            return entry;
        }

        if (mirror && entry.rootTravel && !isTravel) entry.rootTravel = this._invertFront3qArmatureRootTravel(entry.rootTravel);
        entry.keyframes = (move?.keyframes || []).map(frame => {
            const next = JointSystem._cloneArmatureCatalogEntry(frame) || {};
            const depthMirror = { invertPrimaryLimbSwing: true };
            if (next.angles) {
                next.angles = mirror
                    ? this._normalizeRightFront3qArmFlexMap(this._mirrorFront3qArmatureMap(next.angles, depthMirror))
                    : next.angles;
            }
            if (next.jointAngles) {
                next.jointAngles = mirror
                    ? this._normalizeRightFront3qArmFlexMap(this._mirrorFront3qArmatureMap(next.jointAngles, depthMirror))
                    : next.jointAngles;
            }
            if (next.partAngles) {
                next.partAngles = mirror
                    ? this._mirrorFront3qArmatureMap(next.partAngles, depthMirror)
                    : next.partAngles;
            }
            if (mirror && Number.isFinite(next.dx) && !isTravel) next.dx = -next.dx;
            if (mirror && next.offsets) next.offsets = isTravel ? next.offsets : this._invertFront3qArmatureOffsetMap(next.offsets);
            if (mirror && next.tilts) next.tilts = this._invertFront3qArmatureTiltMap(next.tilts);
            if (mirror && next.jointTilts) next.jointTilts = this._invertFront3qArmatureTiltMap(next.jointTilts);
            if (mirror && next.partTilts) next.partTilts = this._invertFront3qArmatureTiltMap(next.partTilts);
            next.frontViewLayerOverride = [...layerOrder];
            next.layerOrderOverride = [...layerOrder];
            next.agbadaArmLayerMode = 'respect-arm-order';
            next.preserveFrontLeftUpperSigns = true;
            next.preserveFrontLeftLowerSigns = true;
            // Stamp per keyframe so the layer-order resolver honors this authored stack during playback.
            next._front3qAuthoredForRight = isRight;
            next._front3qAuthoredForLeft = !isRight;
            return next;
        });
        return entry;
    },

    _mirrorFront3qArmatureMovementEntry(move, key = '', armature = null) {
        if (this._isGuidedFront3qLocomotionKey(key)) {
            const lean = this._getArmatureFront3qLean?.(armature) === 'left' ? 'left' : 'right';
            return this._createFront3qFacingMovementEntry(key, move, lean);
        }
        const mirrored = JointSystem._cloneArmatureCatalogEntry(move) || {};
        mirrored.name = String(mirrored.name || '').replace(/\b3\/4\b/, '3/4 Left');
        mirrored.description = String(mirrored.description || '')
            .replace(/left arm stays behind the torso, right arm in front/gi, 'right arm stays behind the torso, left arm in front');
        mirrored._front3qMirroredForLeft = true;
        mirrored.keyframes = (move?.keyframes || []).map(frame => {
            const next = JointSystem._cloneArmatureCatalogEntry(frame) || {};
            const depthMirror = { invertPrimaryLimbSwing: true };
            if (next.angles) {
                next.angles = this._normalizeRightFront3qArmFlexMap(
                    this._mirrorFront3qArmatureMap(next.angles, depthMirror)
                );
            }
            if (next.jointAngles) {
                next.jointAngles = this._normalizeRightFront3qArmFlexMap(
                    this._mirrorFront3qArmatureMap(next.jointAngles, depthMirror)
                );
            }
            if (next.partAngles) {
                next.partAngles = this._normalizeRightFront3qArmFlexMap(
                    this._mirrorFront3qArmatureMap(next.partAngles, depthMirror)
                );
            }
            if (Number.isFinite(next.dx)) next.dx = -next.dx;
            if (next.offsets) next.offsets = this._invertFront3qArmatureOffsetMap(next.offsets);
            if (next.tilts) next.tilts = this._mirrorFront3qArmatureTiltMap(next.tilts);
            if (next.jointTilts) next.jointTilts = this._mirrorFront3qArmatureTiltMap(next.jointTilts);
            if (next.partTilts) next.partTilts = this._mirrorFront3qArmatureTiltMap(next.partTilts);
            if (Array.isArray(next.frontViewLayerOverride)) {
                next.frontViewLayerOverride = this._mirrorFront3qLayerOrder(next.frontViewLayerOverride);
            }
            if (Array.isArray(next.layerOrderOverride)) {
                next.layerOrderOverride = this._mirrorFront3qLayerOrder(next.layerOrderOverride);
            }
            return next;
        });
        mirrored.keyframes = this._fillRightFront3qSwingGaps(mirrored.keyframes, 'angles');
        mirrored.keyframes = this._fillRightFront3qSwingGaps(mirrored.keyframes, 'jointAngles');
        mirrored.keyframes = this._fillRightFront3qSwingGaps(mirrored.keyframes, 'partAngles');
        return mirrored;
    },

    _getDecoratedArmatureMovementEntry(key, move, armature = null) {
        if (!move) return null;
        const overrideContacts = this._getContactOverride('armature-move', key);
        const source = this._shouldMirrorFront3qMovementEntry(key, armature)
            ? this._mirrorFront3qArmatureMovementEntry(move, key, armature)
            : move;
        const decorated = { key, ...(this._prepareVideoCaptureMovementLayers?.(source, armature) || source) };
        if (/^shoot-(handgun|rifle)-(front|back|side)$/.test(key) && armature?.root) {
            const strength = Math.max(0, Math.min(2, this._activityKitSettings?.(armature.root.id)?.recoilStrength ?? 1));
            decorated.keyframes = decorated.keyframes.map(frame => {
                if (!frame.shootingRecoil) return frame;
                if (frame.contacts?.['right-hand']) return { ...frame, contacts: Object.fromEntries(Object.entries(frame.contacts).map(([name, contact]) => [name, { ...contact, y: .2 - .03 * strength }])) };
                const hold = decorated.keyframes.find(f => !f.shootingRecoil && f.t > 0);
                const angles = { ...frame.jointAngles };
                for (const joint of Object.keys(angles)) angles[joint] = hold.jointAngles[joint] + (angles[joint] - hold.jointAngles[joint]) * strength;
                return { ...frame, jointAngles: angles };
            });
        }
        const attentionTrack = this._getArmatureMovementAttentionTrack?.(key, decorated, armature) || [];
        if (attentionTrack.length) {
            decorated.attentionTrack = attentionTrack;
            decorated.keyframes = (decorated.keyframes || []).map((frame, index, frames) => ({
                ...frame,
                attention: frame.attention !== undefined ? frame.attention : this._sampleArmatureAttentionTrack?.(
                    attentionTrack,
                    Number.isFinite(frame.t) ? frame.t : (index / Math.max(1, frames.length - 1))
                ) || null
            }));
        }
        return overrideContacts
            ? { ...decorated, overrideContacts }
            : decorated;
    },

    _entityHasBodyTagContacts(entity) {
        if (!entity) return false;
        if (entity.overrideContacts && Object.keys(entity.overrideContacts).length) return true;
        if (entity.contacts && Object.keys(entity.contacts).length) return true;
        return (entity.keyframes || []).some(kf => kf?.contacts && Object.keys(kf.contacts).length);
    },

    _movementHasContactData(move) {
        if (!move) return false;
        return this._entityHasBodyTagContacts(move);
    },

    _getScopedBodyTagWorldPositionForObjects(tagName, objects) {
        const needle = String(tagName || '').trim().toLowerCase();
        if (!needle) return null;
        const entries = this._collectBodyTagEntries(objects || []);
        const match = entries.find(entry =>
            String(entry.tag?.name || '').toLowerCase() === needle
            || String(entry.tag?.key || '').toLowerCase() === needle
        );
        return match ? {
            x: match.worldX,
            y: match.worldY,
            partKey: match.partKey,
            objectId: match.obj?.id || null
        } : null;
    },

    _getScopedBodyTagWorldPosition(tagName, partMap) {
        return this._getScopedBodyTagWorldPositionForObjects(
            tagName,
            this._getUniqueObjectsFromPartMap(partMap)
        );
    },

    _resolveBodyTagContactTarget(spec, partMap) {
        return this._resolveBodyTagContactTargetForObjects(
            spec,
            this._getUniqueObjectsFromPartMap(partMap)
        );
    },

    _resolveBodyTagContactTargetForObjects(spec, objects) {
        const normalized = typeof spec === 'string' ? { tag: spec } : (spec || null);
        if (!normalized) return null;
        const tagCandidates = Array.isArray(normalized.tag)
            ? normalized.tag
            : (normalized.tag != null ? [normalized.tag] : []);

        let target = null;
        for (const candidate of tagCandidates) {
            target = this._getScopedBodyTagWorldPositionForObjects(candidate, objects);
            if (target) break;
        }
        if (!target) return null;

        return {
            x: target.x + (normalized.offsetX ?? normalized.dx ?? 0),
            y: target.y + (normalized.offsetY ?? normalized.dy ?? 0),
            iterations: Math.max(2, Math.min(16, Math.round(normalized.iterations ?? 8)))
        };
    },

    _canApplyMotionContact(channel, partKey) {
        const obj = this._getMapEntryObject(channel);
        if (!channel || !obj || channel.target !== 'base') return false;
        if (!obj.bodyPartData?.partKey || obj.bodyPartData.partKey !== partKey) return false;
        if (!obj.pinnedTo) return false;
        const parent = this.objects.getObjectById?.(obj.pinnedTo);
        return !!parent?.bodyPartData;
    },

    _resolveMovementContacts(move, kfBefore, kfAfter, localT) {
        const resolved = {
            ...this._cloneContactSpecMap(move?.contacts || {})
        };
        const beforeContacts = kfBefore?.contacts || null;
        const afterContacts = kfAfter?.contacts || null;
        if (!beforeContacts && !afterContacts) {
            if (move?.overrideContacts && Object.keys(move.overrideContacts).length) {
                Object.assign(resolved, this._cloneContactSpecMap(move.overrideContacts));
            }
            return resolved;
        }

        const partKeys = new Set([
            ...Object.keys(beforeContacts || {}),
            ...Object.keys(afterContacts || {})
        ]);

        partKeys.forEach(partKey => {
            const before = beforeContacts?.[partKey];
            const after = afterContacts?.[partKey];
            let chosen = null;

            if (before && after) {
                const beforeSig = JSON.stringify(before);
                const afterSig = JSON.stringify(after);
                chosen = beforeSig === afterSig ? before : (localT < 0.5 ? before : after);
                if (move?.smoothContacts && beforeSig !== afterSig) {
                    chosen = { ...chosen, blendFrom: before, blendTo: after, blendT: localT };
                }
            } else if (move?.restContactTransitions && (before || after)?.mouthReach) {
                chosen = { ...(before || after), restReachWeight: before ? 1 - localT : localT };
            } else if (before && localT <= 0.15) {
                chosen = before;
            } else if (after && localT >= 0.85) {
                chosen = after;
            }

            if (chosen) resolved[partKey] = chosen;
        });

        if (move?.overrideContacts && Object.keys(move.overrideContacts).length) {
            Object.assign(resolved, this._cloneContactSpecMap(move.overrideContacts));
        }

        return resolved;
    },

    _applyBodyTagContacts(partMap, contacts, options = {}) {
        if (!contacts || Object.keys(contacts).length === 0) return false;
        const orderedParts = Object.keys(contacts).sort((a, b) => {
            const aHand = /hand|wrist/i.test(a) ? 0 : (/foot|ankle/i.test(a) ? 1 : 2);
            const bHand = /hand|wrist/i.test(b) ? 0 : (/foot|ankle/i.test(b) ? 1 : 2);
            return aHand - bHand;
        });

        let changed = false;
        orderedParts.forEach(partKey => {
            const channel = partMap?.[partKey];
            if (!this._canApplyMotionContact(channel, partKey)) return;
            const target = this._resolveBodyTagContactTarget(contacts[partKey], partMap);
            if (!target) return;
            this.solveIK(channel.obj, target.x, target.y, target.iterations, true);
            changed = true;
        });

        if (changed && this.objects._resolvePins) this.objects._resolvePins();
        if (changed && !options.silent) this.stage.requestRender();
        return changed;
    },

    _buildBakedMovementKeyframes(move, partMap, allParts) {
        const baseStates = {};
        Object.keys(partMap).forEach(partKey => {
            baseStates[partKey] = this._captureMotionChannelState(partMap[partKey]);
        });

        const baked = {};
        const sampleTimes = Array.from(new Set((move.keyframes || []).map(kf => kf.t))).sort((a, b) => a - b);

        sampleTimes.forEach(t => {
            Object.keys(baseStates).forEach(partKey => {
                if (!partMap[partKey]) return;
                this._restoreMotionChannelState(partMap[partKey], baseStates[partKey]);
            });
            if (this.objects._resolvePins) this.objects._resolvePins();

            this._applyMovementAtT(move, partMap, t, baseStates);

            allParts.forEach(partKey => {
                const state = this._captureMotionChannelState(partMap[partKey]);
                const base = baseStates[partKey];
                if (!state || !base) return;
                if (!baked[partKey]) baked[partKey] = [];
                baked[partKey].push({
                    t,
                    angle: (state.angle ?? 0) - (base.angle ?? 0),
                    tiltX: (state.tiltX ?? 0) - (base.tiltX ?? 0),
                    tiltY: (state.tiltY ?? 0) - (base.tiltY ?? 0),
                    x: (state.x ?? 0) - (base.x ?? 0),
                    y: (state.y ?? 0) - (base.y ?? 0)
                });
            });
        });

        Object.keys(baseStates).forEach(partKey => {
            if (!partMap[partKey]) return;
            this._restoreMotionChannelState(partMap[partKey], baseStates[partKey]);
        });
        if (this.objects._resolvePins) this.objects._resolvePins();

        return { baseStates, baked };
    },

    _bakedMovementHasVisibleDelta(baseState, bakedKeyframes = []) {
        return bakedKeyframes.some(kf =>
            Math.abs(kf.angle ?? 0) > 0.01
            || Math.abs(kf.tiltX ?? 0) > 0.01
            || Math.abs(kf.tiltY ?? 0) > 0.01
            || Math.abs(kf.x ?? 0) > 0.01
            || Math.abs(kf.y ?? 0) > 0.01
        );
    },


    // ═══════════════════════════════════════════════
    //  PREVIEW & APPLY MOVEMENTS
    // ═══════════════════════════════════════════════

    _previewMovement(moveKey) {
        this._stopPreview();

        const move = this._prepareGuidedMotion(this._getMovementByKey(moveKey));
        if (!move) return;

        const partMap = this._getPartMotionChannelMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts found on stage', 'warning');
            return;
        }

        if (this._shouldResetMovementToIdleFirst()) {
            this._resetAssembledPartsToIdleBaseline(partMap);
        }

        // Save original joint motion state for restore
        const original = {};
        Object.keys(partMap).forEach(pk => {
            original[pk] = this._captureMotionChannelState(partMap[pk]);
        });

        const duration = move.duration;
        let startTime = null;
        let repeatCount = 0;
        const maxRepeats = Math.min(move.repeat, 3); // cap preview repeats

        const animate = (timestamp) => {
            if (!startTime) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const cycleT = (elapsed % duration) / duration;
            const newRepeat = Math.floor(elapsed / duration);

            if (newRepeat >= maxRepeats) {
                // Restore originals
                Object.keys(original).forEach(pk => {
                    if (!partMap[pk]) return;
                    this._restoreMotionChannelState(partMap[pk], original[pk]);
                });
                if (this.objects._resolvePins) this.objects._resolvePins();
                this.stage.requestRender();
                this._previewAnim = null;
                return;
            }

            // Interpolate joint motion state
            this._applyMovementAtT(move, partMap, cycleT, original);
            this.stage.requestRender();

            this._previewAnim = requestAnimationFrame(animate);
        };

        this._previewAnim = requestAnimationFrame(animate);
    },

    _stopPreview() {
        if (this._previewAnim) {
            cancelAnimationFrame(this._previewAnim);
            this._previewAnim = null;
        }
    },

    _getMovementBaseAngle(obj) {
        if (!obj) return 0;
        return typeof obj.jointBaseAngle === 'number' ? obj.jointBaseAngle : 0;
    },

    _supportsMovementTilt(obj) {
        if (!obj) return false;
        if (typeof StageObject !== 'undefined' && typeof StageObject.supportsTiltType === 'function') {
            return StageObject.supportsTiltType(obj.type);
        }
        return true;
    },

    _getMovementBaseTilt(obj) {
        if (!this._supportsMovementTilt(obj)) {
            return { tiltX: 0, tiltY: 0 };
        }
        return {
            tiltX: obj.tiltX ?? 0,
            tiltY: obj.tiltY ?? 0
        };
    },

    _getMotionChannelBaseAngle(channel) {
        if (!channel) return 0;
        if (channel.target === 'flex') {
            return typeof channel.flexPin?.angle === 'number' ? channel.flexPin.angle : 0;
        }
        if (channel.target === 'joint') {
            return typeof channel.joint?.angle === 'number' ? channel.joint.angle : 0;
        }
        return this._getMovementBaseAngle(this._getMapEntryObject(channel));
    },

    _supportsMovementTiltChannel(channel) {
        if (!channel) return false;
        if (channel.target === 'flex') return false;
        if (channel.target === 'joint') return !!channel.joint;
        return this._supportsMovementTilt(this._getMapEntryObject(channel));
    },

    _getMotionChannelBaseTilt(channel) {
        if (!channel) return { tiltX: 0, tiltY: 0 };
        if (channel.target === 'joint') {
            return {
                tiltX: channel.joint?.tiltX ?? 0,
                tiltY: channel.joint?.tiltY ?? 0
            };
        }
        return this._getMovementBaseTilt(this._getMapEntryObject(channel));
    },

    _channelSupportsOffsets(channel) {
        const obj = this._getMapEntryObject(channel);
        return !!obj && channel?.target !== 'joint' && !obj.pinnedTo;
    },

    _captureMotionChannelState(channel) {
        const obj = this._getMapEntryObject(channel);
        if (!obj) return null;
        if (channel?.target === 'flex') {
            return {
                angle: channel.flexPin?.angle ?? 0,
                tiltX: 0,
                tiltY: 0,
                x: obj.x ?? 0,
                y: obj.y ?? 0
            };
        }
        if (channel?.target === 'joint') {
            return {
                angle: channel.joint?.angle ?? 0,
                tiltX: channel.joint?.tiltX ?? 0,
                tiltY: channel.joint?.tiltY ?? 0,
                x: obj.x ?? 0,
                y: obj.y ?? 0
            };
        }
        return {
            angle: obj.jointBaseAngle || 0,
            tiltX: obj.tiltX ?? 0,
            tiltY: obj.tiltY ?? 0,
            x: obj.x ?? 0,
            y: obj.y ?? 0
        };
    },

    _restoreMotionChannelState(channel, state) {
        const obj = this._getMapEntryObject(channel);
        if (!obj || !state) return;
        if (channel?.target === 'flex') {
            if (channel.flexPin) channel.flexPin.angle = state.angle ?? 0;
            return;
        }
        if (channel?.target === 'joint') {
            if (channel.joint) {
                channel.joint.angle = state.angle ?? 0;
                channel.joint.tiltX = state.tiltX ?? 0;
                channel.joint.tiltY = state.tiltY ?? 0;
            }
            return;
        }
        obj.jointBaseAngle = state.angle ?? 0;
        obj.tiltX = state.tiltX ?? 0;
        obj.tiltY = state.tiltY ?? 0;
        obj.x = state.x ?? obj.x ?? 0;
        obj.y = state.y ?? obj.y ?? 0;
    },

    _applyMotionChannelAngle(channel, angle) {
        const obj = this._getMapEntryObject(channel);
        if (!obj) return;
        const nextAngle = this._clampJointAngle(angle);
        if (channel?.target === 'flex') {
            if (channel.flexPin) channel.flexPin.angle = nextAngle;
            return;
        }
        if (channel?.target === 'joint') {
            if (channel.joint) channel.joint.angle = nextAngle;
            return;
        }
        obj.jointBaseAngle = nextAngle;
    },

    _movementHasTiltAxis(move, partKey, axis) {
        return (move.keyframes || []).some(kf => typeof kf?.tilts?.[partKey]?.[axis] === 'number');
    },


    _movementHasOffsetAxis(move, partKey, axis) {
        return (move.keyframes || []).some(kf => typeof kf?.offsets?.[partKey]?.[axis] === 'number');
    },


    /**
     * Interpolate movement keyframes at normalized time t (0-1),
     * applying resulting angles, optional tilt deltas, and optional x/y offsets to objects.
     */
    _applyMovementAtT(move, partMap, t, baseStates = null, options = {}) {
        const kfs = move.keyframes;
        if (!kfs || kfs.length === 0) return;

        // Find surrounding keyframes
        let kfBefore = kfs[0], kfAfter = kfs[kfs.length - 1];
        for (let i = 0; i < kfs.length - 1; i++) {
            if (t >= kfs[i].t && t <= kfs[i + 1].t) {
                kfBefore = kfs[i];
                kfAfter = kfs[i + 1];
                break;
            }
        }

        const range = kfAfter.t - kfBefore.t;
        const localT = range > 0 ? (t - kfBefore.t) / range : 0;

        // Collect all part keys referenced in either keyframe
        const allParts = new Set([
            ...Object.keys(kfBefore.angles || {}),
            ...Object.keys(kfAfter.angles || {}),
            ...Object.keys(kfBefore.tilts || {}),
            ...Object.keys(kfAfter.tilts || {}),
            ...Object.keys(kfBefore.offsets || {}),
            ...Object.keys(kfAfter.offsets || {})
        ]);

        allParts.forEach(partKey => {
            const channel = partMap[partKey];
            if (!channel) return;
            const obj = this._getMapEntryObject(channel);
            if (!obj) return;

            const beforeAngles = kfBefore.angles || {};
            const afterAngles = kfAfter.angles || {};
            const a = Object.prototype.hasOwnProperty.call(beforeAngles, partKey) ? beforeAngles[partKey] : 0;
            const b = Object.prototype.hasOwnProperty.call(afterAngles, partKey) ? afterAngles[partKey] : 0;
            const baseAngle = baseStates?.[partKey]
                ? (baseStates[partKey].angle ?? 0)
                : this._getMotionChannelBaseAngle(channel);
            let angle = baseAngle + (a + (b - a) * localT);

            this._applyMotionChannelAngle(channel, angle);

            const hasTiltX = this._movementHasTiltAxis(move, partKey, 'x');
            const hasTiltY = this._movementHasTiltAxis(move, partKey, 'y');
            if ((hasTiltX || hasTiltY) && this._supportsMovementTiltChannel(channel)) {
                const baseTilt = baseStates?.[partKey]
                    ? { tiltX: baseStates[partKey].tiltX ?? 0, tiltY: baseStates[partKey].tiltY ?? 0 }
                    : this._getMotionChannelBaseTilt(channel);

                const beforeTiltX = JointSystem._getMovementTiltDelta(kfBefore, partKey, 'x');
                const afterTiltX = JointSystem._getMovementTiltDelta(kfAfter, partKey, 'x');
                const beforeTiltY = JointSystem._getMovementTiltDelta(kfBefore, partKey, 'y');
                const afterTiltY = JointSystem._getMovementTiltDelta(kfAfter, partKey, 'y');

                if (hasTiltX) {
                    const nextTiltX = Math.max(-45, Math.min(45, baseTilt.tiltX + (beforeTiltX + (afterTiltX - beforeTiltX) * localT)));
                    if (channel.target === 'joint') channel.joint.tiltX = nextTiltX;
                    else obj.tiltX = nextTiltX;
                }
                if (hasTiltY) {
                    const nextTiltY = Math.max(-45, Math.min(45, baseTilt.tiltY + (beforeTiltY + (afterTiltY - beforeTiltY) * localT)));
                    if (channel.target === 'joint') channel.joint.tiltY = nextTiltY;
                    else obj.tiltY = nextTiltY;
                }
            }

            const hasOffsetX = this._movementHasOffsetAxis(move, partKey, 'x');
            const hasOffsetY = this._movementHasOffsetAxis(move, partKey, 'y');
            if ((!hasOffsetX && !hasOffsetY) || !this._channelSupportsOffsets(channel)) return;

            const baseOffset = baseStates?.[partKey]
                ? { x: baseStates[partKey].x ?? obj.x ?? 0, y: baseStates[partKey].y ?? obj.y ?? 0 }
                : { x: obj.x ?? 0, y: obj.y ?? 0 };

            const beforeOffsetX = JointSystem._getMovementOffsetDelta(kfBefore, partKey, 'x');
            const afterOffsetX = JointSystem._getMovementOffsetDelta(kfAfter, partKey, 'x');
            const beforeOffsetY = JointSystem._getMovementOffsetDelta(kfBefore, partKey, 'y');
            const afterOffsetY = JointSystem._getMovementOffsetDelta(kfAfter, partKey, 'y');

            if (hasOffsetX) {
                obj.x = baseOffset.x + (beforeOffsetX + (afterOffsetX - beforeOffsetX) * localT);
            }
            if (hasOffsetY) {
                obj.y = baseOffset.y + (beforeOffsetY + (afterOffsetY - beforeOffsetY) * localT);
            }
        });

        this._applyMovementRootTravel(move, partMap, t, baseStates);
        if (this.objects._resolvePins) this.objects._resolvePins();
        if (options.skipContacts) return;

        const contacts = this._resolveMovementContacts(move, kfBefore, kfAfter, localT);
        if (contacts && Object.keys(contacts).length) {
            this._applyBodyTagContacts(partMap, contacts, { silent: true });
        }
    },

    /**
     * Apply a movement as a real animation on the timeline.
     */
    _applyMovement(moveKey) {
        this._stopPreview();

        const move = this._prepareGuidedMotion(this._getMovementByKey(moveKey));
        if (!move) return;

        const partMap = this._getPartMotionChannelMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts found on stage', 'warning');
            return;
        }

        if (this._shouldResetMovementToIdleFirst()) {
            this._resetAssembledPartsToIdleBaseline(partMap);
        }

        // Build animation keyframes for each part
        let animCount = 0;
        const useBakedContacts = this._movementHasContactData(move);
        const allParts = new Set();
        move.keyframes.forEach(kf => {
            Object.keys(kf.angles || {}).forEach(pk => allParts.add(pk));
            Object.keys(kf.tilts || {}).forEach(pk => allParts.add(pk));
            Object.keys(kf.offsets || {}).forEach(pk => allParts.add(pk));
            Object.keys(kf.contacts || {}).forEach(pk => allParts.add(pk));
        });
        if (useBakedContacts) {
            Object.keys(partMap).forEach(pk => allParts.add(pk));
        }

        const sampled = useBakedContacts
            ? this._buildBakedMovementKeyframes(move, partMap, Array.from(allParts))
            : null;

        Array.from(allParts).forEach(partKey => {
            const channel = partMap[partKey];
            if (!channel) return;
            const obj = this._getMapEntryObject(channel);
            if (!obj) return;
            const baseAngle = sampled?.baseStates?.[partKey]?.angle ?? this._getMotionChannelBaseAngle(channel);
            const baseTilt = sampled?.baseStates?.[partKey]
                ? {
                    tiltX: sampled.baseStates[partKey].tiltX ?? 0,
                    tiltY: sampled.baseStates[partKey].tiltY ?? 0
                }
                : this._getMotionChannelBaseTilt(channel);
            const bakedKeyframes = sampled?.baked?.[partKey] || null;
            const hasTiltX = sampled
                ? bakedKeyframes?.some(kf => Math.abs(kf.tiltX ?? 0) > 0.01)
                : (this._supportsMovementTiltChannel(channel) && this._movementHasTiltAxis(move, partKey, 'x'));
            const hasTiltY = sampled
                ? bakedKeyframes?.some(kf => Math.abs(kf.tiltY ?? 0) > 0.01)
                : (this._supportsMovementTiltChannel(channel) && this._movementHasTiltAxis(move, partKey, 'y'));
            const allowOffsets = this._channelSupportsOffsets(channel);
            const hasX = sampled
                ? (allowOffsets && bakedKeyframes?.some(kf => Math.abs(kf.x ?? 0) > 0.01))
                : (allowOffsets && this._movementHasOffsetAxis(move, partKey, 'x'));
            const hasY = sampled
                ? (allowOffsets && bakedKeyframes?.some(kf => Math.abs(kf.y ?? 0) > 0.01))
                : (allowOffsets && this._movementHasOffsetAxis(move, partKey, 'y'));
            if (sampled && !this._bakedMovementHasVisibleDelta(sampled.baseStates?.[partKey], bakedKeyframes || [])) {
                return;
            }

            // Create a joint-rotation animation stored on the object
            const animData = {
                id: 'anim-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                name: `${move.name} — ${channel.label || obj.bodyPartData?.jointName || partKey}`,
                delay: 0,
                repeat: 1,
                generated: {
                    type: 'joint-rotation',
                    duration: move.duration * move.repeat,
                    easing: move.easing || 'easeInOut',
                    partKey: partKey,
                    targetMode: channel.target || 'base',
                    targetJointId: channel.jointId || null,
                    targetJointName: channel.jointName || null,
                    targetFlexPinId: channel.flexPinId || null,
                    targetFlexPinName: channel.flexPinName || null,
                    singleCycleDuration: move.duration,
                    repeatCycles: move.repeat,
                    baseAngle,
                    baseTiltX: hasTiltX ? baseTilt.tiltX : undefined,
                    baseTiltY: hasTiltY ? baseTilt.tiltY : undefined,
                    baseX: hasX ? (sampled?.baseStates?.[partKey]?.x ?? obj.x ?? 0) : undefined,
                    baseY: hasY ? (sampled?.baseStates?.[partKey]?.y ?? obj.y ?? 0) : undefined,
                    hasTiltX,
                    hasTiltY,
                    hasX,
                    hasY,
                    keyframes: sampled
                        ? bakedKeyframes.map(kf => ({
                            t: kf.t,
                            angle: kf.angle ?? 0,
                            tiltX: kf.tiltX ?? 0,
                            tiltY: kf.tiltY ?? 0,
                            x: kf.x ?? 0,
                            y: kf.y ?? 0
                        }))
                        : move.keyframes.map(kf => ({
                            t: kf.t,
                            angle: kf.angles?.[partKey] ?? 0,
                            tiltX: JointSystem._getMovementTiltDelta(kf, partKey, 'x'),
                            tiltY: JointSystem._getMovementTiltDelta(kf, partKey, 'y'),
                            x: JointSystem._getMovementOffsetDelta(kf, partKey, 'x'),
                            y: JointSystem._getMovementOffsetDelta(kf, partKey, 'y')
                        }))
                }
            };

            obj.animations.push(animData);
            animCount++;
        });

        animCount += this._addMovementRootTravelAnimation(move, partMap);

        if (animCount > 0) {
            eventBus.emit('timeline:update');
            if (this.animations?.updateAppliedAnimationsList) {
                this.animations.updateAppliedAnimationsList();
            }
            eventBus.emit('history:push');
            Utils.showToast(`Applied "${move.name}" — ${animCount} joint animations created`, 'success');
        } else {
            Utils.showToast(`"${move.name}" did not match any animatable parts in this partial rig`, 'warning');
        }
    },


    // ═══════════════════════════════════════════════
    //  PLAYBACK ENGINE — called from AnimationEngine
    // ═══════════════════════════════════════════════

    /**
     * Evaluate a 'joint-rotation' animation at a given timestamp.
     * Called by AnimationEngine during playback.
     * Returns the joint motion state to apply to the target object.
     */





    // ═══════════════════════════════════════════════════════════════
    //  SKELETON OVERLAY — Draw bone connections on the canvas
    // ═══════════════════════════════════════════════════════════════

    initSkeletonOverlay() {
        this._skeletonVisible = false;
        this._skeletonLabelsVisible = true;
        this._jointRotateHandlesVisible = true;
        this._constraintArcsVisible = false;
        eventBus.on('stage:render-overlay', (ctx) => {
            this._drawGuidedMotionHighlight(ctx);
            if (this._skeletonVisible) this._drawSkeleton(ctx);
            if (this._skeletonVisible && this._jointRotateHandlesVisible && !this._jointTuneActive) this._drawJointRotateHandles(ctx);
            if (this._constraintArcsVisible) this._drawConstraintArcs(ctx);
        });
    },

    initJointRotationHandles() {
        const canvas = this.stage.canvas;
        canvas.addEventListener('mousedown', (e) => {
            if (!this._skeletonVisible || this._jointTuneActive || this._guidedRig || e.button !== 0 || e.shiftKey) return;
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            const handle = this._hitTestJointRotateHandle(pos.x, pos.y);
            if (!handle) return;
            this._jointRotateDrag = { obj: handle.obj };
            this.objects.select([handle.obj.id]);
            if (this.objects._isRecording) this.objects._snapshotForRecording(true);
            canvas.style.cursor = 'grabbing';
            e.preventDefault();
            e.stopPropagation();
        }, true);

        canvas.addEventListener('mousemove', (e) => {
            if (!this._jointRotateDrag) return;
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            this._setJointAngleFromPointer(this._jointRotateDrag.obj, pos.x, pos.y);
            this.stage.requestRender();
            e.preventDefault();
            e.stopPropagation();
        }, true);

        const endDrag = (e) => {
            if (!this._jointRotateDrag) return;
            this._jointRotateDrag = null;
            canvas.style.cursor = '';
            eventBus.emit('history:push');
            this.objects.updateProperties?.();
            if (this.objects._isRecording && this.objects._recordSnapshots) {
                this.objects._showRecordingConfirm();
            }
            if (e) {
                e.preventDefault();
                e.stopPropagation();
            }
        };

        canvas.addEventListener('mouseup', endDrag, true);
        canvas.addEventListener('mouseleave', endDrag, true);
    },

    _getPinnedTargetTransform(obj) {
        if (!obj?.pinnedTo) return null;
        const parent = this.objects.getObjectById(obj.pinnedTo);
        if (!parent) return null;
        const target = this.objects._getPinTargetWorldTransform
            ? this.objects._getPinTargetWorldTransform(parent, obj)
            : null;
        if (target) return { ...target, parent };
        const pivot = parent.getPivotPoint();
        const ax = obj.pinAnchorX ?? 0.5;
        const ay = obj.pinAnchorY ?? 0.5;
        const paw = parent.x + parent.width * ax;
        const pah = parent.y + parent.height * ay;
        const pRad = (parent.rotation || 0) * Math.PI / 180;
        const dx = paw - pivot.x;
        const dy = pah - pivot.y;
        return {
            parent,
            x: pivot.x + dx * Math.cos(pRad) - dy * Math.sin(pRad),
            y: pivot.y + dx * Math.sin(pRad) + dy * Math.cos(pRad),
            rotation: parent.rotation || 0,
            joint: null
        };
    },

    _getPinnedRotationBase(obj) {
        const target = this._getPinnedTargetTransform(obj);
        return target ? (target.rotation || 0) : 0;
    },

    _getJointRotateHandles() {
        const partMap = this._getSkeletonOverlayPartObjectMap();
        const selectedIds = new Set(this.objects.getSelectedObjects().map(obj => obj.id));
        const handles = [];

        Object.keys(partMap).forEach(partKey => {
            const obj = partMap[partKey];
            if (!obj || !obj.bodyPartData) return;
            if (selectedIds.size > 0 && !selectedIds.has(obj.id)) return;

            const pivot = obj.getPivotPoint();
            const baseAngle = this._getPinnedRotationBase(obj);
            const currentRad = (baseAngle + (obj.jointBaseAngle || 0) - 90) * Math.PI / 180;
            const radius = Math.max(18, Math.min(42, Math.max(obj.width, obj.height) * 0.25));
            handles.push({
                obj,
                partKey,
                pivotX: pivot.x,
                pivotY: pivot.y,
                x: pivot.x + Math.cos(currentRad) * radius,
                y: pivot.y + Math.sin(currentRad) * radius,
                radius
            });
        });

        return handles;
    },

    _drawJointRotateHandles(ctx) {
        const handles = this._getJointRotateHandles();
        if (!handles.length) return;

        ctx.save();
        handles.forEach(handle => {
            ctx.beginPath();
            ctx.arc(handle.pivotX, handle.pivotY, handle.radius, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.22)';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 4]);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.beginPath();
            ctx.moveTo(handle.pivotX, handle.pivotY);
            ctx.lineTo(handle.x, handle.y);
            ctx.strokeStyle = 'rgba(96, 165, 250, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(handle.x, handle.y, 7, 0, Math.PI * 2);
            ctx.fillStyle = this._jointRotateDrag?.obj?.id === handle.obj.id
                ? 'rgba(59, 130, 246, 1)'
                : 'rgba(59, 130, 246, 0.88)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (this._jointRotateHandlesVisible) {
                ctx.font = '9px Inter, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.82)';
                ctx.textAlign = 'center';
                ctx.fillText('rotate', handle.x, handle.y - 11);
            }
        });
        ctx.restore();
    },

    _hitTestJointRotateHandle(stageX, stageY) {
        const handles = this._getJointRotateHandles();
        for (let i = handles.length - 1; i >= 0; i--) {
            const handle = handles[i];
            if (Math.hypot(stageX - handle.x, stageY - handle.y) <= 10) return handle;
        }
        return null;
    },

    _setJointAngleFromPointer(obj, stageX, stageY) {
        if (!obj || !obj.bodyPartData) return;
        const pivot = obj.getPivotPoint();
        const baseAngle = this._getPinnedRotationBase(obj);
        const pointerAngle = Math.atan2(stageY - pivot.y, stageX - pivot.x) * 180 / Math.PI;
        let nextAngle = this._normalizeDegrees(pointerAngle + 90 - baseAngle);
        obj.jointBaseAngle = this._clampJointAngle(nextAngle);
    },

    toggleSkeleton() {
        this._skeletonVisible = !this._skeletonVisible;
        const btn = document.getElementById('btn-joint-skeleton');
        if (btn) btn.classList.toggle('active', this._skeletonVisible);
        this.stage.requestRender();
    },

    toggleSkeletonLabels() {
        this._skeletonLabelsVisible = !this._skeletonLabelsVisible;
        const btn = document.getElementById('btn-joint-skeleton-labels');
        if (btn) btn.classList.toggle('active', this._skeletonLabelsVisible);
        this.stage.requestRender();
    },

    setSkeletonLabelsVisible(visible) {
        this._skeletonLabelsVisible = !!visible;
        const btn = document.getElementById('btn-joint-skeleton-labels');
        if (btn) btn.classList.toggle('active', this._skeletonLabelsVisible);
        this.stage.requestRender();
    },

    toggleJointRotateHandles() {
        this._jointRotateHandlesVisible = !this._jointRotateHandlesVisible;
        const btn = document.getElementById('btn-joint-rotate-handles');
        if (btn) btn.classList.toggle('active', this._jointRotateHandlesVisible);
        this.stage.requestRender();
    },

    setJointRotateHandlesVisible(visible) {
        this._jointRotateHandlesVisible = !!visible;
        const btn = document.getElementById('btn-joint-rotate-handles');
        if (btn) btn.classList.toggle('active', this._jointRotateHandlesVisible);
        this.stage.requestRender();
    },

    _drawSkeleton(ctx) {
        const partMap = this._getSkeletonOverlayPartObjectMap();
        const parts = Object.keys(partMap);
        if (parts.length < 2) return;

        ctx.save();

        // Draw bones (lines from child pivot → parent anchor)
        parts.forEach(partKey => {
            const obj = partMap[partKey];
            if (!obj || !obj.bodyPartData || !obj.pinnedTo) return;
            const childPivot = obj.getPivotPoint();
            const target = this._getPinnedTargetTransform(obj);
            if (!target) return;
            const anchorX = target.x;
            const anchorY = target.y;

            // Bone line — tapered "bone" shape
            const midX = (childPivot.x + anchorX) / 2;
            const midY = (childPivot.y + anchorY) / 2;
            const boneLen = Math.hypot(anchorX - childPivot.x, anchorY - childPivot.y);
            const boneWidth = Math.max(3, boneLen * 0.08);
            const angle = Math.atan2(anchorY - childPivot.y, anchorX - childPivot.x);
            const perpX = -Math.sin(angle) * boneWidth;
            const perpY = Math.cos(angle) * boneWidth;

            ctx.beginPath();
            ctx.moveTo(childPivot.x, childPivot.y);
            ctx.lineTo(midX + perpX, midY + perpY);
            ctx.lineTo(anchorX, anchorY);
            ctx.lineTo(midX - perpX, midY - perpY);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 180, 50, 0.35)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 180, 50, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        });

        // Draw joint circles at each pivot
        parts.forEach(partKey => {
            const obj = partMap[partKey];
            if (!obj) return;
            const pivot = obj.getPivotPoint();
            const isRoot = !obj.pinnedTo;

            ctx.beginPath();
            ctx.arc(pivot.x, pivot.y, isRoot ? 7 : 5, 0, Math.PI * 2);
            ctx.fillStyle = isRoot ? 'rgba(34, 197, 94, 0.8)' : 'rgba(255, 180, 50, 0.9)';
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (this._skeletonLabelsVisible) {
                // Label
                ctx.font = '9px Inter, sans-serif';
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.textAlign = 'center';
                ctx.fillText(obj.bodyPartData?.jointName || partKey, pivot.x, pivot.y - 10);
            }
        });

        ctx.restore();
    },


    // ═══════════════════════════════════════════════════════════════
    //  CONSTRAINT ARC VISUALIZATION — Show rotation limits on canvas
    // ═══════════════════════════════════════════════════════════════

    toggleConstraintArcs() {
        this._constraintArcsVisible = !this._constraintArcsVisible;
        const btn = document.getElementById('btn-joint-arcs');
        if (btn) btn.classList.toggle('active', this._constraintArcsVisible);
        this.stage.requestRender();
        Utils.showToast(this._constraintArcsVisible ? 'Constraint arcs ON' : 'Constraint arcs OFF', 'info');
    },

    _drawConstraintArcs(ctx) {
        const partMap = this._getSkeletonOverlayPartObjectMap();
        const selected = this.objects.getSelectedObjects();
        const selectedIds = new Set(selected.map(o => o.id));

        Object.keys(partMap).forEach(partKey => {
            const obj = partMap[partKey];
            if (!obj || !obj.bodyPartData) return;

            // Only show arcs for selected objects, or all if none selected
            if (selectedIds.size > 0 && !selectedIds.has(obj.id)) return;

            const { minAngle, maxAngle } = this._getJointAngleLimits(obj.bodyPartData);
            const pivot = obj.getPivotPoint();
            const radius = Math.max(20, Math.min(obj.width, obj.height) * 0.6);

            const baseAngle = this._getPinnedRotationBase(obj);

            const minRad = (baseAngle + minAngle - 90) * Math.PI / 180;
            const maxRad = (baseAngle + maxAngle - 90) * Math.PI / 180;
            const currentRad = (baseAngle + (obj.jointBaseAngle || 0) - 90) * Math.PI / 180;

            ctx.save();

            // Allowed range arc (green)
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.arc(pivot.x, pivot.y, radius, minRad, maxRad);
            ctx.closePath();
            ctx.fillStyle = 'rgba(34, 197, 94, 0.12)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Current angle indicator (bright line)
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.lineTo(
                pivot.x + Math.cos(currentRad) * radius,
                pivot.y + Math.sin(currentRad) * radius
            );
            ctx.strokeStyle = 'rgba(255, 100, 100, 0.9)';
            ctx.lineWidth = 2;
            ctx.stroke();

            // Min/max limit lines (dashed)
            ctx.setLineDash([3, 3]);
            ctx.strokeStyle = 'rgba(34, 197, 94, 0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.lineTo(pivot.x + Math.cos(minRad) * radius, pivot.y + Math.sin(minRad) * radius);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(pivot.x, pivot.y);
            ctx.lineTo(pivot.x + Math.cos(maxRad) * radius, pivot.y + Math.sin(maxRad) * radius);
            ctx.stroke();

            // Angle label
            ctx.setLineDash([]);
            ctx.font = '8px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.textAlign = 'center';
            ctx.fillText(
                `${Math.round(obj.jointBaseAngle || 0)}°`,
                pivot.x + Math.cos(currentRad) * (radius + 12),
                pivot.y + Math.sin(currentRad) * (radius + 12)
            );

            ctx.restore();
        });
    },


    // ═══════════════════════════════════════════════════════════════
    //  JOINT TUNE MODE — Drag handles to adjust anchors, pivots & offsets
    // ═══════════════════════════════════════════════════════════════

    _enterJointTuneMode() {
        if (this._jointTuneActive) return;
        this._jointTuneActive = true;
        this._tuneDrag = null;       // { type:'anchor'|'pivot', obj, startMouse, startVal }
        this._tuneSelected = null;   // currently selected joint obj
        document.getElementById('btn-joint-tune')?.classList.add('active');

        // Ensure skeleton is visible
        if (!this._skeletonVisible) this.toggleSkeleton();

        // Build floating tune panel
        this._buildTunePanel();

        // Register overlay render
        this._tuneOverlayHandler = (ctx) => { if (this._jointTuneActive) this._drawTuneHandles(ctx); };
        eventBus.on('stage:render-overlay', this._tuneOverlayHandler);

        // Register mouse handlers on the canvas
        const canvas = this.stage.canvas;
        this._tuneMouseDown = (e) => this._onTuneMouseDown(e);
        this._tuneMouseMove = (e) => this._onTuneMouseMove(e);
        this._tuneMouseUp   = (e) => this._onTuneMouseUp(e);
        canvas.addEventListener('mousedown', this._tuneMouseDown, true);
        canvas.addEventListener('mousemove', this._tuneMouseMove, true);
        canvas.addEventListener('mouseup',   this._tuneMouseUp,   true);

        this.stage.requestRender();
        Utils.showToast('Joint Tune mode ON — drag blue ◆ (anchor) or orange ● (pivot) handles', 'info');
    },

    _exitJointTuneMode() {
        if (!this._jointTuneActive) return;
        this._jointTuneActive = false;
        this._tuneDrag = null;
        this._tuneSelected = null;
        document.getElementById('btn-joint-tune')?.classList.remove('active');

        // Remove overlay handler
        if (this._tuneOverlayHandler) {
            eventBus.off('stage:render-overlay', this._tuneOverlayHandler);
            this._tuneOverlayHandler = null;
        }

        // Remove mouse handlers
        const canvas = this.stage.canvas;
        if (this._tuneMouseDown) {
            canvas.removeEventListener('mousedown', this._tuneMouseDown, true);
            canvas.removeEventListener('mousemove', this._tuneMouseMove, true);
            canvas.removeEventListener('mouseup',   this._tuneMouseUp,   true);
            this._tuneMouseDown = this._tuneMouseMove = this._tuneMouseUp = null;
        }

        // Remove panel
        document.getElementById('joint-tune-panel')?.remove();

        canvas.style.cursor = '';
        this.stage.requestRender();
        Utils.showToast('Joint Tune mode OFF', 'info');
    },

    /** Compute anchor & pivot world positions for every pinned body part */
    _getTuneHandles() {
        const partMap = this._getSkeletonOverlayPartObjectMap();
        const handles = [];  // { type:'anchor'|'pivot', obj, wx, wy, partKey }

        Object.keys(partMap).forEach(partKey => {
            const obj = partMap[partKey];
            if (!obj || !obj.bodyPartData) return;

            // Pivot handle (on the child)
            const pivot = obj.getPivotPoint();
            handles.push({ type: 'pivot', obj, wx: pivot.x, wy: pivot.y, partKey });

            // Anchor handle (on parent, but logically belongs to this child)
            if (obj.pinnedTo) {
                const target = this._getPinnedTargetTransform(obj);
                if (target && obj.pinTargetType !== 'joint') {
                    handles.push({ type: 'anchor', obj, wx: target.x, wy: target.y, partKey, parentObj: target.parent });
                }
            }
        });
        return handles;
    },

    /** Draw tune handles on the stage overlay */
    _drawTuneHandles(ctx) {
        const handles = this._getTuneHandles();
        ctx.save();

        handles.forEach(h => {
            const selected = this._tuneSelected && this._tuneSelected.id === h.obj.id;
            const r = h.type === 'anchor' ? 7 : 6;

            if (h.type === 'anchor') {
                // Blue diamond for anchor
                ctx.save();
                ctx.translate(h.wx, h.wy);
                ctx.rotate(Math.PI / 4);
                ctx.beginPath();
                ctx.rect(-r, -r, r * 2, r * 2);
                ctx.fillStyle = selected ? 'rgba(59, 130, 246, 1)' : 'rgba(59, 130, 246, 0.75)';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
                ctx.restore();
            } else {
                // Orange circle for pivot
                ctx.beginPath();
                ctx.arc(h.wx, h.wy, r, 0, Math.PI * 2);
                ctx.fillStyle = selected ? 'rgba(255, 160, 30, 1)' : 'rgba(255, 160, 30, 0.75)';
                ctx.fill();
                ctx.strokeStyle = '#fff';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }

            // Label below
            ctx.font = '8px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.8)';
            ctx.textAlign = 'center';
            const label = (h.type === 'anchor' ? 'A:' : 'P:') + (h.obj.bodyPartData?.jointName || h.partKey);
            ctx.fillText(label, h.wx, h.wy + r + 10);
        });

        ctx.restore();
    },

    /** Hit-test tune handles (returns handle or null) */
    _hitTestTuneHandle(stageX, stageY) {
        const handles = this._getTuneHandles();
        const hitRadius = 10;
        // Search in reverse so top-drawn (last) handles have priority
        for (let i = handles.length - 1; i >= 0; i--) {
            const h = handles[i];
            const dist = Math.hypot(stageX - h.wx, stageY - h.wy);
            if (dist <= hitRadius) return h;
        }
        return null;
    },

    _onTuneMouseDown(e) {
        // Only intercept left clicks without modifiers that IK uses
        if (e.button !== 0 || e.shiftKey) return;

        const pos = this.stage.screenToStage(e.clientX, e.clientY);
        const hit = this._hitTestTuneHandle(pos.x, pos.y);
        if (!hit) return;

        e.preventDefault();
        e.stopPropagation();

        this._tuneSelected = hit.obj;
        this._tuneDrag = {
            type: hit.type,
            obj: hit.obj,
            parentObj: hit.parentObj || null,
            startMouseX: pos.x,
            startMouseY: pos.y,
            // Snapshot current values
            startPinOffsetX: hit.obj.pinOffsetX || 0,
            startPinOffsetY: hit.obj.pinOffsetY || 0,
            startPinAnchorX: hit.obj.pinAnchorX ?? 0.5,
            startPinAnchorY: hit.obj.pinAnchorY ?? 0.5,
            startPivotX: hit.obj.pivotX ?? 0.5,
            startPivotY: hit.obj.pivotY ?? 0.5
        };

        this.stage.canvas.style.cursor = 'grabbing';
        this._updateTunePanel();
    },

    _onTuneMouseMove(e) {
        const pos = this.stage.screenToStage(e.clientX, e.clientY);

        if (!this._tuneDrag) {
            // Just cursor hint
            const hit = this._hitTestTuneHandle(pos.x, pos.y);
            this.stage.canvas.style.cursor = hit ? 'grab' : '';
            return;
        }

        e.preventDefault();
        e.stopPropagation();

        const d = this._tuneDrag;
        const deltaX = pos.x - d.startMouseX;
        const deltaY = pos.y - d.startMouseY;

        if (d.type === 'anchor' && d.parentObj) {
            // Dragging anchor: convert delta in world space to parent's normalized coords
            const parent = d.parentObj;
            const pw = parent.width || 1;
            const ph = parent.height || 1;
            // Account for parent rotation
            const pRad = (parent.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(-pRad);
            const sin = Math.sin(-pRad);
            const localDX = deltaX * cos - deltaY * sin;
            const localDY = deltaX * sin + deltaY * cos;
            d.obj.pinAnchorX = Math.max(0, Math.min(1, d.startPinAnchorX + localDX / pw));
            d.obj.pinAnchorY = Math.max(0, Math.min(1, d.startPinAnchorY + localDY / ph));
        } else if (d.type === 'pivot') {
            // Dragging pivot: convert delta to child's normalized coords
            const cw = d.obj.width || 1;
            const ch = d.obj.height || 1;
            const cRad = (d.obj.rotation || 0) * Math.PI / 180;
            const cos = Math.cos(-cRad);
            const sin = Math.sin(-cRad);
            const localDX = deltaX * cos - deltaY * sin;
            const localDY = deltaX * sin + deltaY * cos;
            const newPvX = Math.max(0, Math.min(1, d.startPivotX + localDX / cw));
            const newPvY = Math.max(0, Math.min(1, d.startPivotY + localDY / ch));
            d.obj.adjustPivot(newPvX, newPvY);
        }

        // Re-resolve pins so the chain updates
        this.objects._resolvePins();
        this.stage.requestRender();
        this._updateTunePanel();
    },

    _onTuneMouseUp(e) {
        if (!this._tuneDrag) return;
        e.preventDefault();
        e.stopPropagation();

        this._tuneDrag = null;
        this.stage.canvas.style.cursor = '';
        this.objects._resolvePins();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    /** Build the floating tune info panel */
    _buildTunePanel() {
        document.getElementById('joint-tune-panel')?.remove();
        const panel = document.createElement('div');
        panel.id = 'joint-tune-panel';
        panel.className = 'joint-assembly-panel joint-tune-panel';
        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-crosshairs"></i> Joint Tune
                <button class="ja-close" id="tune-panel-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="ja-body joint-tune-body" id="tune-panel-body">
                <div class="jtune-hint">Click a blue anchor or orange pivot handle on stage, then drag or refine the values below.</div>
                <div class="jtune-card">
                    <div class="jtune-section-title">Selected Joint</div>
                    <div id="tune-detail" class="jtune-detail"><div class="jtune-empty">No joint selected</div></div>
                </div>
                <div id="tune-angle-section" class="jtune-card hidden">
                    <div class="jtune-section-title">Current Angle</div>
                    <div class="jtune-grid">
                        <label class="jtune-field">
                            <span class="jtune-field-label">Joint Angle</span>
                            <input type="number" id="tune-jointAngle" min="-180" max="180" step="1" class="jtune-input">
                        </label>
                    </div>
                </div>
                <div id="tune-tilt-section" class="jtune-card hidden">
                    <div class="jtune-section-title">Tilt</div>
                    <div class="jtune-grid">
                        <label class="jtune-field">
                            <span class="jtune-field-label">X Tilt</span>
                            <input type="number" id="tune-tiltX" min="-45" max="45" step="1" class="jtune-input">
                        </label>
                        <label class="jtune-field">
                            <span class="jtune-field-label">Y Tilt</span>
                            <input type="number" id="tune-tiltY" min="-45" max="45" step="1" class="jtune-input">
                        </label>
                    </div>
                </div>
                <div id="tune-offset-section" class="jtune-card hidden">
                    <div class="jtune-section-title">Pin Offset</div>
                    <div class="jtune-grid">
                        <label class="jtune-field">
                            <span class="jtune-field-label">Offset X</span>
                            <input type="number" id="tune-offsetX" step="1" class="jtune-input">
                        </label>
                        <label class="jtune-field">
                            <span class="jtune-field-label">Offset Y</span>
                            <input type="number" id="tune-offsetY" step="1" class="jtune-input">
                        </label>
                    </div>
                    <div class="jtune-section-title">Anchor On Parent</div>
                    <div class="jtune-grid">
                        <label class="jtune-field">
                            <span class="jtune-field-label">Anchor X</span>
                            <input type="number" id="tune-anchorX" step="0.01" min="0" max="1" class="jtune-input">
                        </label>
                        <label class="jtune-field">
                            <span class="jtune-field-label">Anchor Y</span>
                            <input type="number" id="tune-anchorY" step="0.01" min="0" max="1" class="jtune-input">
                        </label>
                    </div>
                    <div class="jtune-section-title">Pivot On Self</div>
                    <div class="jtune-grid">
                        <label class="jtune-field">
                            <span class="jtune-field-label">Pivot X</span>
                            <input type="number" id="tune-pivotX" step="0.01" min="0" max="1" class="jtune-input">
                        </label>
                        <label class="jtune-field">
                            <span class="jtune-field-label">Pivot Y</span>
                            <input type="number" id="tune-pivotY" step="0.01" min="0" max="1" class="jtune-input">
                        </label>
                    </div>
                    <div class="jtune-actions">
                        <button id="tune-reset-offset" class="btn-small"><i class="fas fa-undo"></i> Reset Offset</button>
                        <button id="tune-reset-all" class="btn-small" title="Reset angle, tilt, anchor, pivot, offsets, pin rotation, and contour settings for the selected joint"><i class="fas fa-rotate-left"></i> Reset All</button>
                    </div>
                </div>
                <div id="tune-contour-section" class="jtune-card hidden">
                    <div class="jtune-section-title">Joint Contour</div>
                    <label class="jtune-toggle">
                        <input type="checkbox" id="tune-pinContour">
                        <span>Show contour at this joint</span>
                    </label>
                    <div id="tune-contour-fields" class="hidden">
                        <div class="jtune-grid">
                            <label class="jtune-field">
                                <span class="jtune-field-label">Size</span>
                                <input type="number" id="tune-contourSize" min="0.1" max="6" step="0.1" class="jtune-input">
                            </label>
                            <label class="jtune-field">
                                <span class="jtune-field-label">Fill Mode</span>
                                <select id="tune-contourFillMode" class="jtune-input">
                                    <option value="auto">Auto</option>
                                    <option value="solid">Solid</option>
                                    <option value="pattern">Pattern</option>
                                    <option value="linear-gradient">Linear Gradient</option>
                                    <option value="radial-gradient">Radial Gradient</option>
                                    <option value="picture">Picture</option>
                                </select>
                            </label>
                        </div>
                        <div id="tune-contour-solid-row" class="jtune-grid">
                            <label class="jtune-field">
                                <span class="jtune-field-label">Color</span>
                                <input type="color" id="tune-contourColor" class="jtune-input jtune-color-input">
                            </label>
                        </div>
                        <div id="tune-contour-pattern-row" class="jtune-grid hidden">
                            <label class="jtune-field">
                                <span class="jtune-field-label">Pattern</span>
                                <select id="tune-contourPatternType" class="jtune-input">
                                    <option value="stripes">Stripes</option>
                                    <option value="dots">Dots</option>
                                    <option value="crosshatch">Crosshatch</option>
                                    <option value="checkerboard">Checkerboard</option>
                                </select>
                            </label>
                            <label class="jtune-field">
                                <span class="jtune-field-label">Pattern Color</span>
                                <input type="color" id="tune-contourPatternColor" class="jtune-input jtune-color-input">
                            </label>
                            <label class="jtune-field">
                                <span class="jtune-field-label">Pattern Scale</span>
                                <input type="number" id="tune-contourPatternScale" min="0.25" max="4" step="0.05" class="jtune-input">
                            </label>
                        </div>
                        <div id="tune-contour-gradient-row" class="jtune-grid hidden">
                            <label class="jtune-field">
                                <span class="jtune-field-label">Start Color</span>
                                <input type="color" id="tune-contourGradStart" class="jtune-input jtune-color-input">
                            </label>
                            <label class="jtune-field">
                                <span class="jtune-field-label">End Color</span>
                                <input type="color" id="tune-contourGradEnd" class="jtune-input jtune-color-input">
                            </label>
                            <label class="jtune-field">
                                <span class="jtune-field-label">Gradient Angle</span>
                                <input type="number" id="tune-contourGradAngle" min="0" max="360" step="1" class="jtune-input">
                            </label>
                        </div>
                        <div id="tune-contour-picture-note" class="jtune-note hidden">Picture fill uses the source image of the selected part when available.</div>
                    </div>
                </div>
                <div class="jtune-card jtune-save-card">
                    <button id="tune-save-template" class="btn-small ja-btn-green"><i class="fas fa-save"></i> Save as Template</button>
                    <div class="jtune-save-note">Saves all tuned joints for reuse in future assemblies.</div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Make draggable
        this._makeDraggable(panel);
        Utils.makePanelResizable(panel);

        // Close button
        panel.querySelector('#tune-panel-close').addEventListener('click', () => {
            this._exitJointTuneMode();
        });

        // Numeric input handlers
        const bindInput = (id, prop) => {
            panel.querySelector(id)?.addEventListener('change', (e) => {
                if (!this._tuneSelected) return;
                const val = parseFloat(e.target.value);
                if (isNaN(val)) return;
                this._tuneSelected[prop] = val;
                this.objects._resolvePins();
                this.stage.requestRender();
                eventBus.emit('history:push');
            });
        };
        bindInput('#tune-offsetX', 'pinOffsetX');
        bindInput('#tune-offsetY', 'pinOffsetY');
        bindInput('#tune-anchorX', 'pinAnchorX');
        bindInput('#tune-anchorY', 'pinAnchorY');
        bindInput('#tune-pivotX', 'pivotX');
        bindInput('#tune-pivotY', 'pivotY');
        bindInput('#tune-tiltX', 'tiltX');
        bindInput('#tune-tiltY', 'tiltY');
        panel.querySelector('#tune-jointAngle')?.addEventListener('change', (e) => {
            if (!this._tuneSelected) return;
            const val = parseFloat(e.target.value);
            if (!Number.isFinite(val)) return;
            this._tuneSelected.jointBaseAngle = this._clampJointAngle(val);
            this.objects._resolvePins();
            this.stage.requestRender();
            this._updateTunePanel();
            eventBus.emit('history:push');
        });
        panel.querySelector('#tune-pinContour')?.addEventListener('change', (e) => {
            if (!this._tuneSelected) return;
            this._tuneSelected.pinContour = !!e.target.checked;
            this.stage.requestRender();
            this._updateTunePanel();
            eventBus.emit('history:push');
        });
        const bindContourValue = (selector, apply, options = {}) => {
            const el = panel.querySelector(selector);
            if (!el) return;
            const handle = (e, pushHistory) => {
                if (!this._tuneSelected) return;
                apply(e.target, this._tuneSelected);
                this._tuneSelected._cachedPivotColor = null;
                this._tuneSelected._contourPixelsCache = null;
                this.stage.requestRender();
                if (options.refreshPanel) this._updateTunePanel();
                if (pushHistory) eventBus.emit('history:push');
            };
            el.addEventListener('input', (e) => handle(e, false));
            el.addEventListener('change', (e) => handle(e, true));
        };
        bindContourValue('#tune-contourSize', (input, obj) => {
            const val = parseFloat(input.value);
            if (!Number.isFinite(val)) return;
            obj.contourSize = Math.max(0.1, Math.min(6, val));
        }, { refreshPanel: true });
        bindContourValue('#tune-contourFillMode', (input, obj) => {
            obj.contourFillMode = input.value || 'auto';
        }, { refreshPanel: true });
        bindContourValue('#tune-contourColor', (input, obj) => {
            obj.contourColor = input.value;
            if (!obj.contourFillMode || obj.contourFillMode === 'auto') obj.contourFillMode = 'solid';
        }, { refreshPanel: true });
        bindContourValue('#tune-contourPatternType', (input, obj) => {
            obj.contourPatternType = input.value || 'stripes';
            obj.contourFillMode = 'pattern';
        }, { refreshPanel: true });
        bindContourValue('#tune-contourPatternColor', (input, obj) => {
            obj.contourPatternColor = input.value;
            obj.contourFillMode = 'pattern';
        }, { refreshPanel: true });
        bindContourValue('#tune-contourPatternScale', (input, obj) => {
            const val = parseFloat(input.value);
            if (!Number.isFinite(val)) return;
            obj.contourPatternScale = Math.max(0.25, Math.min(4, val));
            obj.contourFillMode = 'pattern';
        }, { refreshPanel: true });
        bindContourValue('#tune-contourGradStart', (input, obj) => {
            obj.contourGradientStart = input.value;
        });
        bindContourValue('#tune-contourGradEnd', (input, obj) => {
            obj.contourGradientEnd = input.value;
        });
        bindContourValue('#tune-contourGradAngle', (input, obj) => {
            const val = parseFloat(input.value);
            if (!Number.isFinite(val)) return;
            obj.contourGradientAngle = val;
        });

        // Reset offset
        panel.querySelector('#tune-reset-offset')?.addEventListener('click', () => {
            if (!this._tuneSelected) return;
            this._tuneSelected.pinOffsetX = 0;
            this._tuneSelected.pinOffsetY = 0;
            this.objects._resolvePins();
            this.stage.requestRender();
            this._updateTunePanel();
            eventBus.emit('history:push');
        });
        panel.querySelector('#tune-reset-all')?.addEventListener('click', () => {
            this._resetSelectedTuneJoint();
        });

        // Save as template
        panel.querySelector('#tune-save-template')?.addEventListener('click', () => {
            this._saveTuneAsTemplate();
        });
    },

    /** Reset all editable tuning fields for the selected joint/body part. */
    _resetSelectedTuneJoint() {
        const obj = this._tuneSelected;
        if (!obj || !obj.bodyPartData) {
            Utils.showToast('Select a joint in Tune mode first.', 'warning');
            return;
        }

        const partDef = this._getTunePartDefinition(obj);
        const anchorDefault = partDef?.anchorOnParent || null;
        const pivotDefault = partDef?.pivotOnSelf || null;

        obj.jointBaseAngle = 0;
        obj.tiltX = 0;
        obj.tiltY = 0;
        obj.pinOffsetX = 0;
        obj.pinOffsetY = 0;
        obj.pinRotationOffset = 0;

        if (obj.pinnedTo) {
            obj.pinAnchorX = this._clamp01(anchorDefault?.x ?? 0.5);
            obj.pinAnchorY = this._clamp01(anchorDefault?.y ?? 0.5);
        }

        obj.pivotX = this._clamp01(pivotDefault?.x ?? 0.5);
        obj.pivotY = this._clamp01(pivotDefault?.y ?? 0.5);

        if (Array.isArray(obj.joints)) {
            obj.joints.forEach(joint => {
                if (!joint) return;
                joint.angle = 0;
                joint.tiltX = 0;
                joint.tiltY = 0;
                joint.contourSize = null;
                joint.contourColor = null;
            });
        }

        obj.pinContour = false;
        obj.pinContourColor = null;
        obj.contourSize = 1;
        obj.contourColor = null;
        obj.contourFillMode = 'auto';
        obj.contourPatternType = 'stripes';
        obj.contourPatternColor = '#ffffff';
        obj.contourPatternScale = 1;
        obj.contourGradientStart = '#ffffff';
        obj.contourGradientEnd = '#888888';
        obj.contourGradientAngle = 0;
        obj.contourRotation = 0;
        obj._cachedPivotColor = null;
        obj._contourPixelsCache = null;
        obj._contourPatternKey = null;
        obj._contourPatternCanvas = null;

        this.objects._resolvePins();
        this.stage.requestRender();
        this._updateTunePanel();
        eventBus.emit('history:push');
        Utils.showToast('Joint tuning values reset.', 'success');
    },

    _getTunePartDefinition(obj) {
        const partKey = obj?.bodyPartData?.partKey;
        const presetKey = obj?.bodyPartData?.presetKey || obj?.bodyPartData?.charType;
        if (!partKey) return null;

        const findInPresets = (presets) => {
            if (!Array.isArray(presets)) return null;
            const preferred = presetKey ? presets.find(p => p?.key === presetKey) : null;
            const pools = preferred ? [preferred, ...presets.filter(p => p !== preferred)] : presets;
            for (const preset of pools) {
                const found = (preset?.parts || []).find(part => part?.partKey === partKey);
                if (found) return found;
            }
            return null;
        };

        return findInPresets(window.JointPresets?.getAll?.())
            || findInPresets(this._getManualAssemblyPresets?.())
            || null;
    },

    /** Save current tuned joint values as a reusable template */
    _saveTuneAsTemplate() {
        const presetKey = this._detectAssembledPreset();
        if (!presetKey) {
            Utils.showToast('No assembled preset detected — cannot save template', 'warning');
            return;
        }

        const partMap = this._getPartObjectMap();
        const training = { preset: presetKey, parts: {}, savedAt: Date.now() };

        Object.keys(partMap).forEach(partKey => {
            const obj = partMap[partKey];
            if (!obj || !obj.bodyPartData) return;

            const entry = {
                pivotOnSelf: { x: obj.pivotX ?? 0.5, y: obj.pivotY ?? 0.5 },
                tilt: {
                    x: obj.tiltX ?? 0,
                    y: obj.tiltY ?? 0
                }
            };

            if (obj.pinnedTo) {
                entry.anchorOnParent = {
                    x: obj.pinAnchorX ?? 0.5,
                    y: obj.pinAnchorY ?? 0.5
                };
                entry.pinOffset = {
                    x: obj.pinOffsetX || 0,
                    y: obj.pinOffsetY || 0
                };
                entry.contour = {
                    enabled: obj.pinContour === true,
                    size: obj.contourSize ?? 1,
                    color: obj.contourColor || null,
                    fillMode: obj.contourFillMode || 'auto',
                    patternType: obj.contourPatternType || 'stripes',
                    patternColor: obj.contourPatternColor || '#ffffff',
                    patternScale: obj.contourPatternScale ?? 1,
                    gradientStart: obj.contourGradientStart || '#ffffff',
                    gradientEnd: obj.contourGradientEnd || obj.contourColor || '#888888',
                    gradientAngle: obj.contourGradientAngle ?? 0
                };
            }

            training.parts[partKey] = entry;
        });

        localStorage.setItem('jointTraining_' + presetKey, JSON.stringify(training));
        Utils.showToast(`Joint template saved for "${presetKey}" — will be used in future assemblies`, 'success');
    },

    /** Update the tune panel to reflect current selected joint values */
    _updateTunePanel() {
        const detail = document.getElementById('tune-detail');
        const angleSection = document.getElementById('tune-angle-section');
        const tiltSection = document.getElementById('tune-tilt-section');
        const section = document.getElementById('tune-offset-section');
        const contourSection = document.getElementById('tune-contour-section');
        const contourFields = document.getElementById('tune-contour-fields');
        if (!detail || !section || !angleSection || !tiltSection || !contourSection || !contourFields) return;

        const obj = this._tuneSelected;
        if (!obj || !obj.bodyPartData) {
            detail.innerHTML = '<div class="jtune-empty">No joint selected</div>';
            angleSection.classList.add('hidden');
            tiltSection.classList.add('hidden');
            section.classList.add('hidden');
            contourSection.classList.add('hidden');
            return;
        }

        const jointName = this._escapeHtml(obj.bodyPartData.jointName || obj.bodyPartData.partKey || obj.name || 'Joint');
        const partName = this._escapeHtml(obj.name || obj.bodyPartData.partKey || 'Selected part');
        const parentObj = obj.pinnedTo ? this.objects.getObjectById(obj.pinnedTo) : null;
        const parentName = parentObj ? this._escapeHtml(parentObj.name || 'Parent') : null;
        const angleValue = typeof obj.jointBaseAngle === 'number' ? obj.jointBaseAngle : 0;
        const tiltSupported = StageObject.supportsTiltType(obj.type);
        const contourFillMode = obj.contourFillMode || 'auto';

        detail.innerHTML = `
            <div class="jtune-joint-name">${jointName}</div>
            <div class="jtune-joint-meta">${partName}${parentName ? ` · parent: ${parentName}` : ''} · angle: ${Math.round(angleValue)}°</div>
        `;
        angleSection.classList.remove('hidden');
        tiltSection.classList.toggle('hidden', !tiltSupported);
        section.classList.remove('hidden');
        contourSection.classList.toggle('hidden', !obj.pinnedTo);

        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el && el !== document.activeElement) el.value = Math.round(v * 100) / 100;
        };
        const setColor = (id, value, fallback = '#888888') => {
            const el = document.getElementById(id);
            if (el && el !== document.activeElement) el.value = value || fallback;
        };

        setVal('tune-jointAngle', angleValue);
        setVal('tune-tiltX', obj.tiltX || 0);
        setVal('tune-tiltY', obj.tiltY || 0);
        setVal('tune-offsetX', obj.pinOffsetX || 0);
        setVal('tune-offsetY', obj.pinOffsetY || 0);
        setVal('tune-anchorX', obj.pinAnchorX ?? 0.5);
        setVal('tune-anchorY', obj.pinAnchorY ?? 0.5);
        setVal('tune-pivotX', obj.pivotX ?? 0.5);
        setVal('tune-pivotY', obj.pivotY ?? 0.5);

        if (obj.pinnedTo) {
            const contourToggle = document.getElementById('tune-pinContour');
            if (contourToggle) contourToggle.checked = !!obj.pinContour;
            contourFields.classList.toggle('hidden', !obj.pinContour);
            setVal('tune-contourSize', obj.contourSize ?? 1);
            const fillModeEl = document.getElementById('tune-contourFillMode');
            if (fillModeEl && fillModeEl !== document.activeElement) fillModeEl.value = contourFillMode;
            setColor('tune-contourColor', obj.contourColor || '#888888');
            const patternTypeEl = document.getElementById('tune-contourPatternType');
            if (patternTypeEl && patternTypeEl !== document.activeElement) patternTypeEl.value = obj.contourPatternType || 'stripes';
            setColor('tune-contourPatternColor', obj.contourPatternColor || '#ffffff', '#ffffff');
            setVal('tune-contourPatternScale', obj.contourPatternScale ?? 1);
            setColor('tune-contourGradStart', obj.contourGradientStart || '#ffffff', '#ffffff');
            setColor('tune-contourGradEnd', obj.contourGradientEnd || obj.contourColor || '#888888');
            setVal('tune-contourGradAngle', obj.contourGradientAngle ?? 0);

            document.getElementById('tune-contour-solid-row')?.classList.toggle('hidden', !['solid', 'pattern'].includes(contourFillMode));
            document.getElementById('tune-contour-pattern-row')?.classList.toggle('hidden', contourFillMode !== 'pattern');
            document.getElementById('tune-contour-gradient-row')?.classList.toggle('hidden', !['linear-gradient', 'radial-gradient'].includes(contourFillMode));
            document.getElementById('tune-contour-picture-note')?.classList.toggle('hidden', contourFillMode !== 'picture');
        }
    },


    // ═══════════════════════════════════════════════════════════════

});
