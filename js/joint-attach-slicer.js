/**
 * Joint System — Attach to armature & Body Slicer
 * (split from joint-system.js for maintainability)
 */

Object.assign(JointSystem.prototype, {

    // ═══════════════════════════════════════════════════════════
    //  ATTACH TO ARMATURE — pin objects to armature parts with optional joint sync
    // ═══════════════════════════════════════════════════════════

    /**
     * Show dialog to attach the selected object(s) to an armature part.
     * Pins the object with position + rotation inheritance, optionally syncing joints.
     */
    showAttachToArmature() {
        const armature = this._detectArmature();
        if (!armature) {
            Utils.showToast('No armature detected — assemble a character first (Smart Cut / Body Stencil / Guided Assembly)', 'warning');
            return;
        }

        const selected = this.objects.getSelectedObjects();
        // Filter out objects that are already armature parts
        const armatureIds = new Set();
        armatureIds.add(armature.root.id);
        Object.values(armature.parts).forEach(p => armatureIds.add(p.obj.id));

        const attachable = selected.filter(o => !armatureIds.has(o.id));
        if (attachable.length === 0) {
            Utils.showToast('Select one or more objects (not armature parts) to attach', 'warning');
            return;
        }

        document.getElementById('attach-armature-panel')?.remove();

        const partEntries = Object.entries(armature.parts);
        const panel = document.createElement('div');
        panel.id = 'attach-armature-panel';
        panel.className = 'smart-cut-panel';
        panel.style.width = '300px';

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas fa-link"></i> Attach to Armature
                <button class="ja-close" title="Close"><i class="fas fa-times"></i></button>
            </div>
            <div class="smc-body" style="padding:10px;">
                <div style="font-size:11px;color:#94a3b8;margin-bottom:8px;">
                    Attaching <b>${attachable.length}</b> object${attachable.length > 1 ? 's' : ''}: 
                    <span style="color:#ccc;">${attachable.map(o => o.name || o.type).join(', ')}</span>
                </div>

                <div style="margin-bottom:8px;">
                    <label style="font-size:11px;color:#aaa;display:block;margin-bottom:4px;">Attach to part:</label>
                    <select id="ata-part-select" style="width:100%;padding:5px 8px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:12px;">
                        ${partEntries.map(([key, part]) => {
                            const name = part.obj.name || key;
                            const jointCount = Object.keys(part.joints).length;
                            return `<option value="${key}">${name}${jointCount ? ` (${jointCount} joints)` : ''}</option>`;
                        }).join('')}
                    </select>
                </div>

                <div style="margin-bottom:8px;">
                    <label style="font-size:11px;color:#aaa;display:block;margin-bottom:4px;">Rotation mode:</label>
                    <select id="ata-rotation-mode" style="width:100%;padding:5px 8px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:12px;">
                        <option value="joint" selected>Joint (inherit rotation + base angle)</option>
                        <option value="inherit">Inherit (exact parent rotation)</option>
                        <option value="static">Static (position only, keep own rotation)</option>
                    </select>
                </div>

                <div style="margin-bottom:10px;">
                    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;color:#ccc;" title="Live-sync the armature part's joint bend angles, tilt X/Y, and cross-offset onto this object's joints. Requires both objects to have joints.">
                        <input type="checkbox" id="ata-sync-joints" style="accent-color:#6366f1;">
                        <span>Sync Joints</span>
                        <span style="font-size:10px;color:#666;">(live transfer angles &amp; tilts)</span>
                    </label>
                </div>

                <div style="font-size:10px;color:#666;line-height:1.4;margin-bottom:10px;padding:5px 7px;background:rgba(99,102,241,0.08);border-radius:4px;">
                    <i class="fas fa-info-circle" style="color:#6366f1;margin-right:3px;"></i>
                    <b>Joint</b> mode: object follows part rotation + its own base angle (like a limb).
                    <b>Sync Joints</b>: copies bend angles/tilt from the armature part's joints onto the attached object's joints each frame.
                </div>

                <div style="display:flex;gap:6px;">
                    <button class="btn-primary btn-sm" id="ata-btn-attach" style="flex:1;">
                        <i class="fas fa-link"></i> Attach
                    </button>
                    <button class="btn-secondary btn-sm" id="ata-btn-cancel">
                        <i class="fas fa-times"></i> Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        this._makeDraggable(panel);

        const close = () => {
            panel.remove();
            document.removeEventListener('keydown', keyHandler);
        };
        const keyHandler = (e) => {
            if (e.key === 'Escape') { e.preventDefault(); close(); }
        };
        document.addEventListener('keydown', keyHandler);
        panel.querySelector('.ja-close').addEventListener('click', close);
        panel.querySelector('#ata-btn-cancel').addEventListener('click', close);

        // Highlight hovered part on stage
        const partSelect = panel.querySelector('#ata-part-select');
        partSelect.addEventListener('change', () => {
            const partKey = partSelect.value;
            const part = armature.parts[partKey];
            if (part) this.objects.select([part.obj.id]);
        });

        // Attach button
        panel.querySelector('#ata-btn-attach').addEventListener('click', () => {
            const partKey = partSelect.value;
            const part = armature.parts[partKey];
            if (!part) { Utils.showToast('Invalid part selection', 'warning'); return; }

            const rotMode = panel.querySelector('#ata-rotation-mode').value;
            const syncJoints = panel.querySelector('#ata-sync-joints').checked;
            const parentObj = part.obj;

            attachable.forEach(obj => {
                // Compute pin offset to preserve current visual position
                const anchorX = 0.5, anchorY = 0.5;
                const anchorWorld = this.objects._getObjectWorldPoint(parentObj, anchorX, anchorY);
                const rad = (parentObj.rotation || 0) * Math.PI / 180;
                const cos = Math.cos(rad);
                const sin = Math.sin(rad);

                // Current visual center of the object being attached
                const objCenterX = obj.x + obj.width * (obj.pivotX ?? 0.5);
                const objCenterY = obj.y + obj.height * (obj.pivotY ?? 0.5);

                // Inverse-rotate to get offset in parent's local space
                const dx = objCenterX - anchorWorld.x;
                const dy = objCenterY - anchorWorld.y;
                const localOffX = dx * cos + dy * sin;
                const localOffY = -dx * sin + dy * cos;

                obj.pinnedTo = parentObj.id;
                obj.pinAnchorX = anchorX;
                obj.pinAnchorY = anchorY;
                obj.pinOffsetX = localOffX;
                obj.pinOffsetY = localOffY;
                obj.pinRotationMode = rotMode;
                obj.pinSyncJoints = syncJoints;

                if (rotMode === 'joint') {
                    obj.jointBaseAngle = obj.rotation - (parentObj.rotation || 0);
                }

                // If sync joints is on but the object has no joints, try to create
                // matching joints from the parent
                if (syncJoints && parentObj.joints && parentObj.joints.length > 0) {
                    if (!obj.joints || obj.joints.length === 0) {
                        obj.joints = parentObj.joints.map(pj => ({
                            id: 'jt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                            name: pj.name || '',
                            position: pj.position,
                            crossOffset: pj.crossOffset ?? 0.5,
                            angle: pj.angle ?? 0,
                            tiltX: pj.tiltX ?? 0,
                            tiltY: pj.tiltY ?? 0,
                            contourSize: pj.contourSize ?? null,
                            contourColor: pj.contourColor ?? null
                        }));
                        obj.jointDirection = parentObj.jointDirection;
                        obj.jointContours = parentObj.jointContours;
                    }
                }
            });

            if (this.objects._resolvePins) this.objects._resolvePins();
            this.objects.updateObjectList();
            this.stage.requestRender();
            eventBus.emit('history:push');

            const syncNote = syncJoints ? ' with joint sync' : '';
            Utils.showToast(`Attached ${attachable.length} object${attachable.length > 1 ? 's' : ''} to ${part.obj.name || partKey}${syncNote}`, 'success');
            close();
        });
    },

    /**
     * Detach selected objects from armature (remove pin relationship).
     */
    detachFromArmature() {
        const selected = this.objects.getSelectedObjects();
        let count = 0;
        selected.forEach(obj => {
            if (obj.pinnedTo) {
                obj.pinnedTo = null;
                obj.pinSyncJoints = false;
                obj._pinParentRef = null;
                count++;
            }
        });
        if (count > 0) {
            this.objects.updateObjectList();
            this.stage.requestRender();
            eventBus.emit('history:push');
            Utils.showToast(`Detached ${count} object${count > 1 ? 's' : ''}`, 'success');
        } else {
            Utils.showToast('No pinned objects selected', 'info');
        }
    },

    // ── Body Slicer V2 overrides ──

    showCharacterCutter() {
        return this.showBodySlicer({ characterCutter: true });
    },

    showBodySlicer(options = {}) {
        const isCharacterCutter = !!(options && typeof options === 'object' && options.characterCutter);
        const selected = this.objects.getSelectedObjects();
        if (selected.length !== 1 || selected[0].type !== 'image') {
            if (selected.length > 0) {
                if (isCharacterCutter) {
                    Utils.showToast('Character Cutter needs one full-body image. Select an image, then try again.', 'warning');
                    return;
                }
                this.showAssembleSelectedPartsPanel?.({ presetKey: selected.length <= 6 ? 'guided-motion-front' : 'human-front' });
                Utils.showToast('Selected parts detected — label them for animation instead of slicing a new image.', 'info');
                return;
            }
            Utils.showToast(isCharacterCutter ? 'Select one full-body character image to cut' : 'Select a single image to slice, or select cut parts to assemble them', 'warning');
            return;
        }

        this._closeActiveCuttingWorkflows?.();
        this._bslSessionId = (this._bslSessionId || 0) + 1;

        const obj = selected[0];
        this._bslObj = obj;
        this._bslActive = false;
        this._bslViewMode = 'front';
        this._bslCurves = this._bslGetDefaultCurves();
        this._bslSelectedCurve = 'neck';
        this._bslDraggingPoint = null;
        this._bslDraggingCurve = null;
        this._bslDraggingLandmark = null;
        this._bslHoverPoint = null;
        this._bslHoverLandmark = null;
        this._bslHoverSegment = null;
        this._bslSelectedPoint = null;
        this._bslAddPointMode = false;
        this._bslLandmarks = null;
        this._bslDescriptor = null;
        this._bslTrainingApplied = false;
        this._bslTrainingScore = null;
        this._bslMlStatus = null;
        this._bslLastGuideMethod = null;
        this._bslGuideConfidence = null;
        this._bslHasDetectedGuides = false;
        this._bslMlPoseReady = false;
        this._bslMlPosePromise = null;
        this._bslLaunchMode = isCharacterCutter ? 'character-cutter' : 'body-slicer';

        this._bslOriginalSrc = obj.imageSrc;
        this._bslOriginalX = obj.x;
        this._bslOriginalY = obj.y;
        this._bslOriginalW = obj.width;
        this._bslOriginalH = obj.height;
        this._bslDidCut = false;
        this._bslCutting = false;

        this._bslWasLocked = obj.locked;
        obj._temporaryLockOwner = 'body-slicer';
        obj._temporaryLockPrevious = this._bslWasLocked;
        obj.locked = true;

        const trainingCount = this._getBodySlicerTrainingSamples().length;
        const panelTitle = isCharacterCutter ? 'Character Cutter' : 'Body Slicer';
        const panelIcon = 'fa-scissors';
        const adjustLabel = isCharacterCutter ? 'Review Character Cuts' : 'Adjust Body Cuts';
        const helpCopy = isCharacterCutter
            ? '<span><kbd>Drag points</kbd> fit body boundaries &bull; review the 6 parts &bull; <kbd>Esc</kbd> cancel</span>'
            : '<span><kbd>Drag points</kbd> reshape cuts &bull; <kbd>Shift+drag point</kbd> moves the whole cut &bull; <kbd>Esc</kbd> cancel</span>';
        const workflowCopy = isCharacterCutter
            ? 'Character Cutter uses editable cut curves to separate a full-body image into animation-ready head/neck, torso, arms, and legs before creating a Pose Armature character.'
            : 'Body Slicer now uses editable curves instead of fixed straight dividers. The visible cuts control how the silhouette is split into coarse head, torso, arm, and leg zones before assembly.';
        const sourceLockCopy = isCharacterCutter
            ? 'The source image is temporarily locked while Character Cutter prepares the parts. Use Restore if auto crop or background removal looks wrong.'
            : 'The source image is temporarily locked while slicing. Use Restore if auto crop or background removal looks wrong.';
        const cutButtonCopy = isCharacterCutter ? 'Create Character' : 'Slice &amp; Assemble';
        const detectButtonCopy = isCharacterCutter ? 'Auto Landmarks' : 'Re-detect Curves';
        const panel = document.createElement('div');
        panel.id = 'body-slicer-panel';
        panel.className = 'body-stencil-panel';
        panel.style.width = '390px';

        panel.innerHTML = `
            <div class="ja-header" data-draggable="true">
                <i class="fas ${panelIcon}"></i> ${panelTitle}
                <span class="bs-step-indicator" id="bsl-step-indicator">Step 1/2</span>
                <button class="ja-close" title="Close (Esc)"><i class="fas fa-times"></i></button>
            </div>
            <div class="bs-body">
                <div class="bs-step" id="bsl-step-adjust">
                    <div class="bs-prep-section" style="margin:0 0 8px;">
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-eye"></i> View</label>
                            <div style="display:flex;gap:6px;align-items:center;flex:1;">
                                <button class="btn-sm bsl-view-btn" data-view="front" style="background:#6366f1;"><i class="fas fa-user"></i> Front View</button>
                                <button class="btn-sm bsl-view-btn btn-secondary" data-view="side" style="font-size:11px;"><i class="fas fa-user" style="transform:scaleX(0.5);"></i> Side View</button>
                            </div>
                        </div>
                    </div>
                    <div id="bsl-side-view-tip" class="bs-tip" style="display:none;font-size:10px;color:#94a3b8;line-height:1.4;margin:0 0 6px;padding:5px 7px;background:rgba(234,179,8,0.1);border:1px solid rgba(234,179,8,0.25);border-radius:4px;">
                        <i class="fas fa-lightbulb" style="color:#eab308;margin-right:3px;"></i>
                        <b>Side-view tip:</b> Arms and legs overlap the torso in side view, so parts cannot be cleanly separated.
                        The slicer creates <b>4 composite regions</b> (head, torso, upper-limb, lower-limb). Back limbs can be generated as an opt-in extra.
                        For best results use images where limbs are <b>slightly spread</b> (e.g. a walking pose). After slicing, use the <b>Eraser</b> to clean up bleed-through at overlap areas.
                    </div>
                    <div class="bs-prep-section" id="bsl-side-options" style="display:none;margin:0 0 8px;">
                        <div class="bs-prep-row" style="align-items:flex-start;">
                            <label class="bs-prep-label"><i class="fas fa-clone"></i> Side Extras</label>
                            <div style="display:flex;flex-direction:column;gap:5px;flex:1;">
                                <label class="bs-inline-check"><input type="checkbox" id="bsl-generate-back-limbs"> <span style="font-size:11px;">Generate synthetic back limbs (opt-in)</span></label>
                            </div>
                        </div>
                        <div style="font-size:10px;color:#94a3b8;line-height:1.4;padding-top:2px;">
                            When enabled, side view duplicates front limbs into darker back limbs. Keep disabled for strict source-only cuts.
                        </div>
                    </div>
                    <div class="bs-step-label">${adjustLabel}</div>
                    <div class="bs-prep-section">
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-eraser"></i> BG Tolerance</label>
                            <input type="range" id="bsl-bg-tolerance" min="0" max="80" value="30" class="bs-slider">
                            <span class="bs-slider-val" id="bsl-bg-tol-val">30</span>
                        </div>
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-crop-alt"></i> Crop Padding</label>
                            <input type="range" id="bsl-crop-padding" min="0" max="80" value="5" class="bs-slider">
                            <span class="bs-slider-val" id="bsl-crop-pad-val">5px</span>
                        </div>
                    </div>
                    <div class="bs-help">
                        ${helpCopy}
                    </div>
                    <div class="cut-workflow-note">
                        <i class="fas fa-lock"></i>
                        <span>${sourceLockCopy}</span>
                        <button class="btn-sm btn-secondary" id="bsl-restore-source"><i class="fas fa-image"></i> Restore Source</button>
                    </div>
                    <div class="bs-tip" style="font-size:10px;color:#94a3b8;line-height:1.45;margin:4px 0 6px;padding:6px 8px;background:rgba(99,102,241,0.1);border-radius:4px;">
                        <i class="fas fa-lightbulb" style="color:#eab308;margin-right:3px;"></i>
                        ${workflowCopy}
                    </div>
                    <div class="bs-prep-section" style="margin:6px 0;">
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-magic"></i> Detect</label>
                            <div style="display:flex;gap:6px;align-items:center;flex:1;">
                                <button class="btn-sm" id="bsl-auto-detect" style="background:#6366f1;" title="${isCharacterCutter ? 'Detect editable cut lines from pixels first; MediaPipe can refine landmarks when ML is allowed' : 'Re-detect cut curves from the current image'}"><i class="fas fa-crosshairs"></i> ${detectButtonCopy}</button>
                                ${isCharacterCutter ? '<button class="btn-sm btn-secondary" id="bsl-apply-overlays" title="Apply cut-line overlays using the selected cut method"><i class="fas fa-layer-group"></i> Apply Overlays</button>' : ''}
                                <button class="btn-sm btn-secondary" id="bsl-clear-training" style="display:${trainingCount ? 'inline-flex' : 'none'};font-size:11px;color:#f87171;"><i class="fas fa-trash"></i> Clear Learned</button>
                            </div>
                        </div>
                        ${isCharacterCutter ? `
                        <div style="display:flex;align-items:flex-start;gap:6px;margin:-2px 0 6px 76px;">
                            <span id="bsl-ml-badge" style="flex:0 0 auto;font-size:9px;font-weight:700;letter-spacing:.02em;text-transform:uppercase;border-radius:999px;padding:2px 7px;background:#334155;color:#cbd5e1;">Ready</span>
                            <span id="bsl-ml-status" style="font-size:10px;color:#94a3b8;line-height:1.35;">
                                Auto is pixel-first. BodyPix Human Parsing runs only in ML Only mode or if Auto cannot build clean cut-line regions.
                            </span>
                        </div>
                        ` : ''}
                        ${isCharacterCutter ? `
                        <div class="bs-prep-row" style="align-items:flex-start;">
                            <label class="bs-prep-label"><i class="fas fa-map-marker-alt"></i> Landmarks</label>
                            <div style="display:flex;flex-direction:column;gap:5px;flex:1;">
                                <label class="bs-inline-check"><input type="checkbox" id="bsl-show-landmarks" checked> <span style="font-size:11px;">Show editable body meeting points</span></label>
                                <div style="font-size:10px;color:#94a3b8;line-height:1.35;">Drag landmark dots to shape the neck, shoulder, axilla, hip, and crotch cuts before creating the character.</div>
                            </div>
                        </div>
                        ` : ''}
                        ${isCharacterCutter ? `
                        <div class="bs-prep-row" style="align-items:flex-start;">
                            <label class="bs-prep-label"><i class="fas fa-cut"></i> Cut Method</label>
                            <select id="bsl-cutting-method" style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:11px;">
                                <option value="auto" selected>Auto (Pixel First)</option>
                                <option value="trace">Trace Silhouette</option>
                                <option value="pixel">Pixel Only</option>
                                <option value="ml">ML Only</option>
                            </select>
                        </div>
                        <div id="bsl-cutting-method-help" style="font-size:10px;color:#94a3b8;line-height:1.35;padding-top:2px;">
                            <b>Auto:</b> Stable pixel cut-line detection. <b>Trace:</b> Experimental character outline guides. <b>Pixel:</b> Force local pixel guides. <b>ML:</b> BodyPix body-part segmentation.
                        </div>
                        ` : ''}
                        <div class="bs-prep-row" style="align-items:flex-start;">
                            <label class="bs-prep-label"><i class="fas fa-brain"></i> Learning</label>
                            <div style="display:flex;flex-direction:column;gap:5px;flex:1;">
                                <label class="bs-inline-check"><input type="checkbox" id="bsl-use-training" ${trainingCount ? 'checked' : ''}> <span style="font-size:11px;">Use learned layouts when a similar silhouette is found</span></label>
                                <label class="bs-inline-check"><input type="checkbox" id="bsl-learn-mode" checked> <span style="font-size:11px;">Save this corrected layout after a successful slice</span></label>
                            </div>
                        </div>
                        <div id="bsl-training-status" style="font-size:10px;color:#94a3b8;line-height:1.45;padding-top:2px;"></div>
                    </div>
                    <div id="bsl-curve-selector" style="display:flex;gap:4px;flex-wrap:wrap;margin:8px 0 5px;padding:6px;background:#181827;border-radius:6px;"></div>
                    <div id="bsl-point-tools" style="display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:0 0 7px;padding:5px 6px;background:#111827;border:1px solid rgba(148,163,184,0.18);border-radius:6px;">
                        <span style="font-size:10px;color:#94a3b8;margin-right:2px;"><i class="fas fa-bezier-curve"></i> Points</span>
                        <button class="btn-sm btn-secondary" id="bsl-add-point" style="font-size:10px;padding:3px 7px;" title="Add a new point to the selected cut line"><i class="fas fa-plus"></i> Add Point</button>
                        <button class="btn-sm btn-secondary" id="bsl-delete-point" style="font-size:10px;padding:3px 7px;" title="Delete the selected point from the current cut line"><i class="fas fa-minus"></i> Delete Point</button>
                        <span id="bsl-point-status" style="font-size:10px;color:#94a3b8;line-height:1.35;">Double-click a line to add; right-click a point to remove.</span>
                    </div>
                    <div id="bsl-legend" style="font-size:11px;color:#ccc;line-height:1.65;padding:2px 0 4px;"></div>
                    <div class="bs-prep-section" style="margin:6px 0;">
                        <div class="bs-prep-row">
                            <label class="bs-prep-label"><i class="fas fa-arrows-alt"></i> Assembly</label>
                            <select id="bsl-assembly-mode" style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:11px;">
                                <option value="keep" selected>Keep Positions</option>
                                <option value="reposition">T-Pose (Reposition)</option>
                            </select>
                        </div>
                        <div class="bs-prep-row" style="margin-top:6px;">
                            <label class="bs-prep-label"><i class="fas fa-bone"></i> Limb Joints</label>
                            <select id="bsl-joint-mode" style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:11px;">
                                <option value="auto" selected>Automatic</option>
                                <option value="manual">Manual Placement</option>
                                <option value="none">None</option>
                            </select>
                        </div>
                        <div style="font-size:10px;color:#94a3b8;line-height:1.4;padding-top:4px;">
                            Automatic adds elbow/wrist joints to the sliced arms and knee/ankle joints to the sliced legs. Manual guides you to click those joint points on the new parts.
                        </div>
                        <div class="bs-prep-row" style="margin-top:6px;">
                            <label class="bs-prep-label"><i class="fas fa-project-diagram"></i> Joint System</label>
                            <select id="bsl-joint-system" style="flex:1;padding:3px 6px;border-radius:4px;border:1px solid #444;background:#1e1e2e;color:#ccc;font-size:11px;">
                                <option value="slicer" selected>Body Slicer</option>
                                <option value="armature">Pose Armature</option>
                            </select>
                        </div>
                        <div style="font-size:10px;color:#94a3b8;line-height:1.4;padding-top:4px;">
                            Body Slicer uses its own pin/joint system. Pose Armature uses the same joint &amp; pin system as the front/side armature dummies.
                        </div>
                    </div>
                    <div class="bs-actions">
                        <button class="btn-sm bs-reset-btn" id="bsl-reset-btn"><i class="fas fa-undo"></i> Reset</button>
                        <button class="btn-primary btn-sm bs-cut-btn" id="bsl-cut-btn"><i class="fas ${panelIcon}"></i> ${cutButtonCopy}</button>
                    </div>
                </div>
                <div class="bs-step hidden" id="bsl-step-joints">
                    <div class="bs-step-label"><i class="fas fa-bone" style="color:#a78bfa"></i> Place Limb Joints</div>
                    <div id="bsl-joint-guide-copy" style="font-size:12px;color:#d7d7df;line-height:1.5;"></div>
                    <div id="bsl-joint-guide-next" style="font-size:11px;color:#94a3b8;line-height:1.45;margin-top:6px;"></div>
                    <div class="bs-actions">
                        <button class="btn-secondary btn-sm" id="bsl-joint-skip"><i class="fas fa-forward"></i> Skip</button>
                    </div>
                </div>
                <div class="bs-step hidden" id="bsl-step-done">
                    <div class="bs-step-label"><i class="fas fa-check-circle" style="color:#10b981"></i> Done!</div>
                    <div class="bs-done-msg" id="bsl-done-msg"></div>
                    <div id="bsl-cut-review"></div>
                    <div class="bs-hint" style="font-size:12px; color:#94a3b8; margin:6px 0;">Rotate joints: <b>Shift+drag</b> a body part, or use the <b>rotation handle</b>.</div>
                    <div class="bs-actions">
                        <button class="btn-primary btn-sm" id="bsl-btn-movements"><i class="fas fa-play"></i> Movements</button>
                        <button class="btn-secondary btn-sm" id="bsl-btn-poses"><i class="fas fa-bookmark"></i> Poses</button>
                        <button class="btn-secondary btn-sm" id="bsl-btn-armature"><i class="fas fa-bone"></i> Armature</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(panel);
        panel.dataset.workflow = this._bslLaunchMode;
        if (isCharacterCutter) {
            const jointSystemSelect = panel.querySelector('#bsl-joint-system');
            const jointModeSelect = panel.querySelector('#bsl-joint-mode');
            const assemblyModeSelect = panel.querySelector('#bsl-assembly-mode');
            const cuttingMethodSelect = panel.querySelector('#bsl-cutting-method');
            const learnMode = panel.querySelector('#bsl-learn-mode');
            if (jointSystemSelect) jointSystemSelect.value = 'armature';
            if (jointModeSelect) jointModeSelect.value = 'auto';
            if (assemblyModeSelect) assemblyModeSelect.value = 'keep';
            if (cuttingMethodSelect) {
                // Load saved cutting method preference
                const savedMethod = localStorage.getItem('bsl_cutting_method') || 'auto';
                cuttingMethodSelect.value = savedMethod;
                cuttingMethodSelect.addEventListener('change', (e) => {
                    const method = e.target.value;
                    localStorage.setItem('bsl_cutting_method', method);
                    console.log(`[Character Cutter] Cutting method changed to: ${method}`);
                    const modeName = method === 'trace' ? 'Trace Silhouette' : method === 'pixel' ? 'Pixel Only' : method === 'ml' ? 'ML Only' : 'Auto (Pixel First)';
                    this._bslSetMlStatus(panel, `${modeName} selected. Click Apply Overlays to place cut-line guides.`, 'info', modeName);
                });
            }
            if (learnMode) learnMode.checked = true;
            panel.querySelector('#bsl-training-status')?.insertAdjacentHTML('beforebegin', `
                <div class="bs-tip" style="font-size:10px;color:#c4b5fd;line-height:1.45;margin:2px 0 6px;padding:6px 8px;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.22);border-radius:4px;">
                    <i class="fas fa-circle-info" style="color:#a78bfa;margin-right:3px;"></i>
                    Review the proposed six-part character cut, adjust curves if needed, then create an animation-ready Pose Armature character.
                </div>
            `);
            Utils.showToast('Character Cutter ready — review the cut curves, then create the character', 'info');
        } else {
            const jointSystemSelect = panel.querySelector('#bsl-joint-system');
            const jointModeSelect = panel.querySelector('#bsl-joint-mode');
            if (jointSystemSelect && this._bslViewMode === 'front') jointSystemSelect.value = 'armature';
            if (jointModeSelect) jointModeSelect.value = 'auto';
        }
        this._makeDraggable(panel);
        if (Utils.makePanelResizable) Utils.makePanelResizable(panel);

        panel.querySelector('.ja-close')?.addEventListener('click', () => {
            this.objects.cancelGuidedJointPlacement?.();
            this._exitBodySlicer();
            panel.remove();
        });

        this._bslKeyHandler = (e) => {
            if (!document.getElementById('body-slicer-panel')) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                // First Esc: if a guided joint placement is in progress, only cancel that
                // and keep the Body Slicer panel open. Second Esc closes the panel.
                if (this.objects?._jointPlaceMode || this.objects?._jointPlacementGuide) {
                    this.objects.cancelGuidedJointPlacement?.();
                    Utils.showToast?.('Joint placement cancelled — press Esc again to close Body Slicer', 'info');
                    return;
                }
                this._exitBodySlicer();
                panel.remove();
            } else if (e.key === 'Delete' || e.key === 'Backspace') {
                if (this._bslSelectedPoint || this._bslHoverPoint) {
                    e.preventDefault();
                    this._bslDeleteSelectedPoint(panel);
                }
            }
        };
        document.addEventListener('keydown', this._bslKeyHandler);

        // ── View selector (Front / Side) ──
        panel.querySelectorAll('.bsl-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const newView = btn.dataset.view;
                if (newView === this._bslViewMode) return;
                this._bslViewMode = newView;
                this._bslLandmarks = null;
                this._bslHoverLandmark = null;
                this._bslDraggingLandmark = null;
                this._bslHoverSegment = null;
                this._bslSelectedPoint = null;
                this._bslAddPointMode = false;
                panel.querySelectorAll('.bsl-view-btn').forEach(b => {
                    b.style.background = b.dataset.view === newView ? '#6366f1' : '';
                    b.className = b.dataset.view === newView ? 'btn-sm bsl-view-btn' : 'btn-sm bsl-view-btn btn-secondary';
                });
                this._bslCurves = newView === 'side' ? this._bslGetDefaultCurvesSide() : this._bslGetDefaultCurves();
                this._bslSelectedCurve = 'neck';
                this._bslRebuildCurveSelector(panel);
                this._bslUpdateLegend(panel);
                const sideTip = panel.querySelector('#bsl-side-view-tip');
                if (sideTip) sideTip.style.display = newView === 'side' ? '' : 'none';
                const sideOptions = panel.querySelector('#bsl-side-options');
                if (sideOptions) sideOptions.style.display = newView === 'side' ? '' : 'none';
                const jointSystemSelect = panel.querySelector('#bsl-joint-system');
                if (!isCharacterCutter && jointSystemSelect) {
                    jointSystemSelect.value = newView === 'front' ? 'armature' : 'slicer';
                }
                this.stage.requestRender();
            });
        });

        const selector = panel.querySelector('#bsl-curve-selector');
        if (selector) {
            selector.innerHTML = Object.entries(this._bslCurves).map(([key, curve]) => `
                <button class="bsl-curve-btn" data-curve="${key}" style="font-size:10px;padding:3px 8px;border-radius:4px;background:${curve.color}22;border:1px solid ${curve.color};color:#d7d7df;cursor:pointer;opacity:${key === this._bslSelectedCurve ? '1' : '0.65'};">
                    <i class="fas fa-circle" style="color:${curve.color};font-size:8px;"></i> ${curve.name}
                </button>
            `).join('');
            selector.querySelectorAll('.bsl-curve-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this._bslSelectedCurve = btn.dataset.curve;
                    this._bslSyncCurveButtons(panel);
                    this._bslUpdateLegend(panel);
                    this.stage.requestRender();
                });
            });
        }

        const tolSlider = panel.querySelector('#bsl-bg-tolerance');
        const padSlider = panel.querySelector('#bsl-crop-padding');
        const tolVal = panel.querySelector('#bsl-bg-tol-val');
        const padVal = panel.querySelector('#bsl-crop-pad-val');
        let bslProcessTimer = null;
        const scheduleProcess = () => {
            clearTimeout(bslProcessTimer);
            bslProcessTimer = setTimeout(() => this._bslProcessImage(panel), 180);
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

        panel.querySelector('#bsl-auto-detect')?.addEventListener('click', () => this._bslProcessImage(panel));
        panel.querySelector('#bsl-apply-overlays')?.addEventListener('click', () => this._bslProcessImage(panel));
        panel.querySelector('#bsl-reset-btn')?.addEventListener('click', () => this._bslProcessImage(panel));
        panel.querySelector('#bsl-restore-source')?.addEventListener('click', () => this._bslRestoreSourcePreview(panel));
        panel.querySelector('#bsl-use-training')?.addEventListener('change', () => this._bslProcessImage(panel));
        panel.querySelector('#bsl-clear-training')?.addEventListener('click', () => this._clearBodySlicerTraining(panel));
        panel.querySelector('#bsl-show-landmarks')?.addEventListener('change', () => this.stage.requestRender());
        panel.querySelector('#bsl-add-point')?.addEventListener('click', () => {
            this._bslAddPointMode = !this._bslAddPointMode;
            this._bslUpdatePointToolState(panel);
            this.stage.requestRender();
        });
        panel.querySelector('#bsl-delete-point')?.addEventListener('click', () => this._bslDeleteSelectedPoint(panel));
        panel.querySelector('#bsl-cut-btn')?.addEventListener('click', () => this._bslExecuteCut(panel));
        if (this._bslLaunchMode === 'character-cutter') {
            this._bslSetMlStatus(panel, 'Ready. Choose a cut method, then click Apply Overlays to place editable cut lines.', 'info', 'Ready');
        }

        this._bslActive = true;
        this._bslRenderOverlayFn = (ctx) => this._bslRenderOverlay(ctx);
        eventBus.on('stage:render-overlay', this._bslRenderOverlayFn);

        this._bslMouseDownFn = (e) => this._bslHandleMouseDown(e);
        this._bslMouseMoveFn = (e) => this._bslHandleMouseMove(e);
        this._bslMouseUpFn = (e) => this._bslHandleMouseUp(e);
        this._bslDblClickFn = (e) => this._bslHandleDoubleClick(e);
        this._bslContextMenuFn = (e) => this._bslHandleContextMenu(e);
        this.stage.viewport.addEventListener('mousedown', this._bslMouseDownFn);
        this.stage.viewport.addEventListener('mousemove', this._bslMouseMoveFn);
        this.stage.viewport.addEventListener('mouseup', this._bslMouseUpFn);
        this.stage.viewport.addEventListener('dblclick', this._bslDblClickFn);
        this.stage.viewport.addEventListener('contextmenu', this._bslContextMenuFn);

        this._bslUpdatePointToolState(panel);
        this.stage.requestRender();
    },

    _bslRestoreSourcePreview(panel) {
        const obj = this._bslObj;
        if (!obj || !this._bslOriginalSrc) return;
        obj.x = this._bslOriginalX;
        obj.y = this._bslOriginalY;
        obj.width = this._bslOriginalW;
        obj.height = this._bslOriginalH;
        obj.imageSrc = this._bslOriginalSrc;
        obj.loadImage?.(this._bslOriginalSrc);
        obj._contourPixelsCache = null;
        this._bslCurves = this._bslViewMode === 'side' ? this._bslGetDefaultCurvesSide() : this._bslGetDefaultCurves();
        this._bslLandmarks = null;
        this._bslGuideConfidence = null;
        this._bslHasDetectedGuides = false;
        this._bslHoverLandmark = null;
        this._bslDraggingLandmark = null;
        this._bslSelectedCurve = Object.keys(this._bslCurves)[0] || 'neck';
        this._bslRebuildCurveSelector(panel);
        this._bslUpdateLegend(panel);
        this.stage.requestRender();
        Utils.showToast('Source image restored for Body Slicer adjustment', 'success');
    },

    _bslGetDefaultCurves() {
        return {
            neck: {
                name: 'Neck Cut',
                color: '#f59e0b',
                orientation: 'horizontal',
                points: [
                    { x: 0.26, y: 0.12 },
                    { x: 0.38, y: 0.16 },
                    { x: 0.50, y: 0.185 },
                    { x: 0.62, y: 0.16 },
                    { x: 0.74, y: 0.12 }
                ]
            },
            leftArm: {
                name: 'Left Side Cut',
                color: '#3b82f6',
                orientation: 'vertical',
                points: [
                    { x: 0.18, y: 0.18 },
                    { x: 0.28, y: 0.30 },
                    { x: 0.24, y: 0.56 },
                    { x: 0.16, y: 0.98 }
                ]
            },
            rightArm: {
                name: 'Right Side Cut',
                color: '#ec4899',
                orientation: 'vertical',
                points: [
                    { x: 0.82, y: 0.18 },
                    { x: 0.72, y: 0.30 },
                    { x: 0.76, y: 0.56 },
                    { x: 0.84, y: 0.98 }
                ]
            },
            crotch: {
                name: 'Crotch Cut',
                color: '#ef4444',
                orientation: 'horizontal',
                points: [
                    { x: 0.20, y: 0.52 },
                    { x: 0.35, y: 0.515 },
                    { x: 0.50, y: 0.53 },
                    { x: 0.65, y: 0.515 },
                    { x: 0.80, y: 0.52 }
                ]
            },
            legSplit: {
                name: 'Leg Split',
                color: '#10b981',
                orientation: 'vertical',
                points: [
                    { x: 0.50, y: 0.52 },
                    { x: 0.50, y: 0.70 },
                    { x: 0.50, y: 0.88 },
                    { x: 0.50, y: 0.98 }
                ]
            }
        };
    },

    _bslGetDefaultCurvesSide() {
        return {
            neck: {
                name: 'Neck Cut',
                color: '#f59e0b',
                orientation: 'horizontal',
                points: [
                    { x: 0.10, y: 0.17 },
                    { x: 0.30, y: 0.165 },
                    { x: 0.50, y: 0.16 },
                    { x: 0.70, y: 0.165 },
                    { x: 0.90, y: 0.17 }
                ]
            },
            armBound: {
                name: 'Arm Boundary',
                color: '#3b82f6',
                orientation: 'vertical',
                points: [
                    { x: 0.55, y: 0.17 },
                    { x: 0.52, y: 0.30 },
                    { x: 0.48, y: 0.42 },
                    { x: 0.44, y: 0.52 }
                ]
            },
            waist: {
                name: 'Waist Cut',
                color: '#ef4444',
                orientation: 'horizontal',
                points: [
                    { x: 0.10, y: 0.52 },
                    { x: 0.30, y: 0.515 },
                    { x: 0.50, y: 0.52 },
                    { x: 0.70, y: 0.515 },
                    { x: 0.90, y: 0.52 }
                ]
            }
        };
    },

    _bslRebuildCurveSelector(panel) {
        const selector = panel?.querySelector('#bsl-curve-selector');
        if (!selector) return;
        selector.innerHTML = Object.entries(this._bslCurves).map(([key, curve]) => `
            <button class="bsl-curve-btn" data-curve="${key}" style="font-size:10px;padding:3px 8px;border-radius:4px;background:${curve.color}22;border:1px solid ${curve.color};color:#d7d7df;cursor:pointer;opacity:${key === this._bslSelectedCurve ? '1' : '0.65'};">
                <i class="fas fa-circle" style="color:${curve.color};font-size:8px;"></i> ${curve.name}
            </button>
        `).join('');
        selector.querySelectorAll('.bsl-curve-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this._bslSelectedCurve = btn.dataset.curve;
                this._bslSyncCurveButtons(panel);
                this._bslUpdateLegend(panel);
                this.stage.requestRender();
            });
        });
    },

    _bslCloneCurves(curves = this._bslCurves) {
        try {
            return JSON.parse(JSON.stringify(curves || {}));
        } catch {
            return this._bslGetDefaultCurves();
        }
    },

    _getBodySlicerTrainingStorageKey() {
        if (this._bslLaunchMode === 'character-cutter') return 'characterCutterTraining_v1';
        return 'bodySlicerTraining_v2';
    },

    _getBodySlicerTrainingSamples() {
        try {
            const raw = localStorage.getItem(this._getBodySlicerTrainingStorageKey());
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    },

    _setBodySlicerTrainingSamples(samples) {
        localStorage.setItem(this._getBodySlicerTrainingStorageKey(), JSON.stringify(samples || []));
    },

    async _clearBodySlicerTraining(panel) {
        const samples = this._getBodySlicerTrainingSamples();
        const toolName = this._bslLaunchMode === 'character-cutter' ? 'Character Cutter' : 'Body Slicer';
        if (!samples.length) {
            Utils.showToast(`No learned ${toolName} layouts to clear`, 'info');
            return;
        }
        if (!await Utils.showConfirm(`Clear all ${samples.length} learned ${toolName} layout${samples.length === 1 ? '' : 's'}?`)) return;
        localStorage.removeItem(this._getBodySlicerTrainingStorageKey());
        this._bslTrainingApplied = false;
        this._bslTrainingScore = null;
        panel?.querySelector('#bsl-clear-training')?.style.setProperty('display', 'none');
        this._bslUpdateLegend(panel);
        Utils.showToast(`Cleared ${samples.length} learned ${toolName} layout${samples.length === 1 ? '' : 's'}`, 'success');
    },

    _bslComputeSilhouetteDescriptor(pixels, w, h) {
        let minX = w, minY = h, maxX = -1, maxY = -1;
        for (let y = 0; y < h; y++) {
            const off = y * w * 4;
            for (let x = 0; x < w; x++) {
                if (pixels[off + x * 4 + 3] > 20) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (maxX <= minX || maxY <= minY) return null;

        const silW = Math.max(1, maxX - minX + 1);
        const silH = Math.max(1, maxY - minY + 1);
        const widths = [];
        const centers = [];
        for (let y = minY; y <= maxY; y++) {
            const off = y * w * 4;
            let rowMin = w, rowMax = -1;
            for (let x = 0; x < w; x++) {
                if (pixels[off + x * 4 + 3] > 20) {
                    if (x < rowMin) rowMin = x;
                    if (x > rowMax) rowMax = x;
                }
            }
            if (rowMax >= rowMin) {
                widths.push((rowMax - rowMin + 1) / silW);
                centers.push((((rowMin + rowMax) * 0.5) - (minX + maxX) * 0.5) / silW);
            } else {
                widths.push(0);
                centers.push(0);
            }
        }

        const widthProfile = [];
        const centerProfile = [];
        const count = 18;
        for (let i = 0; i < count; i++) {
            const idx = Math.round((i / (count - 1)) * (widths.length - 1));
            widthProfile.push(Math.round((widths[idx] || 0) * 1000) / 1000);
            centerProfile.push(Math.round((centers[idx] || 0) * 1000) / 1000);
        }

        return {
            aspect: Math.round((silW / silH) * 1000) / 1000,
            widthProfile,
            centerProfile
        };
    },

    _bslDescriptorDistance(a, b) {
        if (!a || !b) return Infinity;
        const wa = Array.isArray(a.widthProfile) ? a.widthProfile : [];
        const wb = Array.isArray(b.widthProfile) ? b.widthProfile : [];
        const ca = Array.isArray(a.centerProfile) ? a.centerProfile : [];
        const cb = Array.isArray(b.centerProfile) ? b.centerProfile : [];
        const maxLen = Math.max(wa.length, wb.length, 1);
        let widthDiff = 0;
        let centerDiff = 0;
        for (let i = 0; i < maxLen; i++) {
            widthDiff += Math.abs((wa[i] ?? wa[wa.length - 1] ?? 0) - (wb[i] ?? wb[wb.length - 1] ?? 0));
            centerDiff += Math.abs((ca[i] ?? ca[ca.length - 1] ?? 0) - (cb[i] ?? cb[cb.length - 1] ?? 0));
        }
        widthDiff /= maxLen;
        centerDiff /= maxLen;
        const aspectDiff = Math.abs((a.aspect ?? 0) - (b.aspect ?? 0));
        return aspectDiff * 0.7 + widthDiff * 1.2 + centerDiff * 0.35;
    },

    _bslApplyBestTrainingMatch(panel) {
        this._bslTrainingApplied = false;
        this._bslTrainingScore = null;
        if (!panel?.querySelector('#bsl-use-training')?.checked || !this._bslDescriptor) return false;

        const samples = this._getBodySlicerTrainingSamples();
        if (!samples.length) return false;

        let best = null;
        let bestScore = Infinity;
        samples.forEach(sample => {
            const score = this._bslDescriptorDistance(this._bslDescriptor, sample?.descriptor);
            if (score < bestScore) {
                bestScore = score;
                best = sample;
            }
        });

        if (!best?.curves || bestScore > 0.28) return false;
        this._bslCurves = this._bslCloneCurves(best.curves);
        this._bslNormalizeCurves();
        this._bslRefreshLandmarksFromCurves();
        this._bslTrainingApplied = true;
        this._bslTrainingScore = bestScore;
        this._bslSyncCurveButtons(panel);
        return true;
    },

    _bslUsesCharacterAnchors() {
        return this._bslLaunchMode === 'character-cutter';
    },

    _bslUsesPoseArmatureCutAssembly() {
        return this._bslLaunchMode === 'character-cutter'
            || (this._bslLaunchMode === 'body-slicer' && this._bslViewMode === 'front');
    },

    _bslUsesConnectivityRegionSplit() {
        return this._bslUsesPoseArmatureCutAssembly();
    },

    _bslShouldShowLandmarks() {
        if (!this._bslUsesCharacterAnchors()) return false;
        const panel = document.getElementById('body-slicer-panel');
        const toggle = panel?.querySelector('#bsl-show-landmarks');
        return toggle ? toggle.checked !== false : true;
    },

    _bslRefreshLandmarksFromCurves() {
        if (!this._bslUsesPoseArmatureCutAssembly() || !this._bslCurves) {
            this._bslLandmarks = null;
            this._bslGuideConfidence = null;
            return;
        }

        const point = (x, y, label, color, help) => ({
            x: this._clamp01(x),
            y: this._clamp01(y),
            label,
            color,
            help
        });

        if (this._bslViewMode === 'side') {
            const neckY = this._bslEvalCurveAtX('neck', 0.5);
            const waistY = this._bslEvalCurveAtX('waist', 0.5);
            const armTop = this._bslCurves.armBound?.points?.[0] || { x: this._bslEvalCurveAtY('armBound', neckY + 0.04), y: neckY + 0.04 };
            const armMid = { x: this._bslEvalCurveAtY('armBound', (neckY + waistY) * 0.5), y: (neckY + waistY) * 0.5 };
            this._bslLandmarks = {
                neck: point(0.5, neckY, 'Neck', '#f59e0b', 'Head joins torso'),
                shoulder: point(armTop.x, armTop.y, 'Shoulder', '#3b82f6', 'Upper limb joins torso'),
                elbowGuide: point(armMid.x, armMid.y, 'Arm guide', '#38bdf8', 'Upper limb boundary guide'),
                waist: point(0.5, waistY, 'Waist', '#ef4444', 'Torso joins lower body')
            };
            return;
        }

        const neckRoot = this._bslGetNeckRootPoint();
        const neckY = neckRoot.y;
        const crotchY = this._bslEvalCurveAtX('crotch', 0.5);
        const leftArm = this._bslCurves.leftArm?.points || [];
        const rightArm = this._bslCurves.rightArm?.points || [];
        const crotch = this._bslCurves.crotch?.points || [];
        const legSplit = this._bslCurves.legSplit?.points || [];

        this._bslLandmarks = {
            neck: point(neckRoot.x, neckY, 'Neck', '#f59e0b', 'Head joins torso'),
            leftShoulder: point(leftArm[0]?.x ?? 0.18, leftArm[0]?.y ?? neckY, 'R shoulder', '#3b82f6', 'Tip of character right shoulder'),
            rightShoulder: point(rightArm[0]?.x ?? 0.82, rightArm[0]?.y ?? neckY, 'L shoulder', '#ec4899', 'Tip of character left shoulder'),
            leftArmpit: point(leftArm[2]?.x ?? leftArm[1]?.x ?? 0.28, leftArm[2]?.y ?? leftArm[1]?.y ?? 0.34, 'R axilla', '#60a5fa', 'Character right arm joins torso'),
            rightArmpit: point(rightArm[2]?.x ?? rightArm[1]?.x ?? 0.72, rightArm[2]?.y ?? rightArm[1]?.y ?? 0.34, 'L axilla', '#f472b6', 'Character left arm joins torso'),
            leftHip: point(crotch[1]?.x ?? crotch[0]?.x ?? 0.22, crotch[1]?.y ?? crotch[0]?.y ?? crotchY, 'R hip', '#22c55e', 'Character right edge of the waist cut'),
            rightHip: point(crotch[3]?.x ?? crotch[2]?.x ?? 0.78, crotch[3]?.y ?? crotch[2]?.y ?? crotchY, 'L hip', '#22c55e', 'Character left edge of the waist cut'),
            crotch: point(crotch[2]?.x ?? 0.5, crotch[2]?.y ?? crotchY, 'Crotch start', '#10b981', 'Start of vertical leg split at the hip line'),
            legSplit: point(legSplit[1]?.x ?? 0.5, legSplit[1]?.y ?? 0.84, 'Leg split', '#10b981', 'Divides the two legs from the hip line down')
        };
    },

    _bslApplyCurvesFromLandmarks(panel) {
        const lm = this._bslLandmarks;
        if (!this._bslUsesCharacterAnchors() || !lm) return false;

        const round = (value) => Math.round(this._clamp01(value) * 1000) / 1000;
        if (this._bslViewMode === 'side') {
            const neck = lm.neck || { x: 0.5, y: 0.17 };
            const shoulder = lm.shoulder || { x: 0.55, y: neck.y + 0.04 };
            const armGuide = lm.elbowGuide || { x: 0.50, y: 0.35 };
            const waist = lm.waist || { x: 0.5, y: 0.52 };
            this._bslCurves = this._bslGetDefaultCurvesSide();
            this._bslCurves.neck.points = [
                { x: 0.08, y: round(neck.y + 0.006) },
                { x: 0.30, y: round(neck.y) },
                { x: 0.50, y: round(neck.y - 0.004) },
                { x: 0.70, y: round(neck.y) },
                { x: 0.92, y: round(neck.y + 0.006) }
            ];
            this._bslCurves.armBound.points = [
                { x: round(shoulder.x), y: round(shoulder.y) },
                { x: round((shoulder.x + armGuide.x) * 0.5), y: round((shoulder.y + armGuide.y) * 0.5) },
                { x: round(armGuide.x), y: round(armGuide.y) },
                { x: round(Math.min(armGuide.x, shoulder.x) - 0.04), y: round(waist.y) }
            ];
            this._bslCurves.waist.points = [
                { x: 0.08, y: round(waist.y - 0.006) },
                { x: 0.30, y: round(waist.y + 0.004) },
                { x: 0.50, y: round(waist.y + 0.008) },
                { x: 0.70, y: round(waist.y + 0.004) },
                { x: 0.92, y: round(waist.y - 0.006) }
            ];
            this._bslNormalizeCurves();
            this._bslSyncCurveButtons(panel);
            this._bslUpdateLegend(panel);
            return true;
        }

        const neck = lm.neck || { x: 0.5, y: 0.18 };
        const ls = lm.leftShoulder || { x: 0.18, y: neck.y + 0.01 };
        const rs = lm.rightShoulder || { x: 0.82, y: neck.y + 0.01 };
        const la = lm.leftArmpit || { x: 0.28, y: 0.34 };
        const ra = lm.rightArmpit || { x: 0.72, y: 0.34 };
        const lh = lm.leftHip || { x: 0.22, y: 0.54 };
        const rh = lm.rightHip || { x: 0.78, y: 0.54 };
        const split = lm.legSplit || { x: (lh.x + rh.x) * 0.5, y: 0.86 };
        const waistY = round((lh.y + rh.y) * 0.5);
        const splitX = round(split.x);
        const splitEndY = round(Math.min(0.96, Math.max(waistY + 0.20, split.y)));

        this._bslCurves = this._bslGetDefaultCurves();
        this._bslCurves.neck.points = this._bslBuildNeckVCutPoints(neck, {
            leftShoulder: ls,
            rightShoulder: rs,
            leftArmpit: la,
            rightArmpit: ra
        }, this._bslCurvePixelInfo);
        if (this._bslLaunchMode === 'body-slicer') {
            const leftEndY = round(Math.max(la.y + 0.02, Math.min(waistY - 0.005, la.y + 0.22)));
            const rightEndY = round(Math.max(ra.y + 0.02, Math.min(waistY - 0.005, ra.y + 0.22)));
            this._bslCurves.leftArm.points = [
                { x: round(ls.x), y: round(Math.max(0.01, ls.y - 0.045)) },
                { x: round(ls.x), y: round(ls.y) },
                { x: round(la.x), y: round(la.y) },
                { x: round(la.x), y: leftEndY }
            ];
            this._bslCurves.rightArm.points = [
                { x: round(rs.x), y: round(Math.max(0.01, rs.y - 0.045)) },
                { x: round(rs.x), y: round(rs.y) },
                { x: round(ra.x), y: round(ra.y) },
                { x: round(ra.x), y: rightEndY }
            ];
            this._bslCurves.crotch.points = [
                { x: round(lh.x - 0.03), y: waistY },
                { x: round(lh.x), y: waistY },
                { x: splitX, y: waistY },
                { x: round(rh.x), y: waistY },
                { x: round(rh.x + 0.03), y: waistY }
            ];
            this._bslCurves.legSplit.points = [
                { x: splitX, y: waistY },
                { x: splitX, y: splitEndY },
                { x: splitX, y: round(Math.min(0.99, splitEndY + 0.03)) }
            ];
        } else {
            this._bslCurves.leftArm.points = [
                { x: round(ls.x), y: round(ls.y) },
                { x: round(la.x), y: round(la.y) }
            ];
            this._bslCurves.rightArm.points = [
                { x: round(rs.x), y: round(rs.y) },
                { x: round(ra.x), y: round(ra.y) }
            ];
            this._bslCurves.crotch.points = [
                { x: round(lh.x), y: waistY },
                { x: splitX, y: waistY },
                { x: round(rh.x), y: waistY }
            ];
            this._bslCurves.legSplit.points = [
                { x: splitX, y: waistY },
                { x: splitX, y: splitEndY }
            ];
        }
        this._bslNormalizeCurves();
        this._bslSyncCurveButtons(panel);
        this._bslUpdateLegend(panel);
        return true;
    },

    _bslFindNeckTransparentEndpoint(pixelInfo, centerX, exitY, side, fallbackX) {
        const pixels = pixelInfo?.pixels;
        const w = Number(pixelInfo?.w || 0);
        const h = Number(pixelInfo?.h || 0);
        if (!pixels || !w || !h) return this._clamp01(fallbackX);

        const row = Math.max(0, Math.min(h - 1, Math.round(this._clamp01(exitY) * (h - 1))));
        const centerPx = Math.max(0, Math.min(w - 1, Math.round(this._clamp01(centerX) * (w - 1))));
        const spans = [];
        let start = -1;
        for (let x = 0; x <= w; x++) {
            const opaque = x < w && pixels[(row * w + x) * 4 + 3] > 10;
            if (opaque && start < 0) start = x;
            else if (!opaque && start >= 0) {
                spans.push({ s: start, e: x - 1, center: (start + x - 1) * 0.5 });
                start = -1;
            }
        }
        if (!spans.length) return this._clamp01(fallbackX);

        const span = spans.find(item => centerPx >= item.s && centerPx <= item.e)
            || spans.reduce((best, item) => Math.abs(item.center - centerPx) < Math.abs(best.center - centerPx) ? item : best, spans[0]);
        const margin = Math.max(8, Math.round(w * 0.035));
        const endpointPx = side === 'left' ? span.s - margin : span.e + margin;
        const endpoint = endpointPx / Math.max(1, w - 1);
        const minGap = 0.13;
        return side === 'left'
            ? Math.max(0.02, Math.min(centerX - minGap, endpoint))
            : Math.min(0.98, Math.max(centerX + minGap, endpoint));
    },

    _bslBuildNeckVCutPoints(neck, refs = {}, pixelInfo = null) {
        const round = (value) => Math.round(this._clamp01(value) * 1000) / 1000;
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const rootX = clamp(Number(neck?.x ?? 0.5), 0.16, 0.84);
        const rootY = clamp(Number(neck?.y ?? 0.18), 0.06, 0.42);
        const leftRefs = [refs.leftShoulder?.x, refs.leftArmpit?.x].filter(Number.isFinite);
        const rightRefs = [refs.rightShoulder?.x, refs.rightArmpit?.x].filter(Number.isFinite);
        const leftRefX = leftRefs.length ? Math.min(...leftRefs) : rootX - 0.22;
        const rightRefX = rightRefs.length ? Math.max(...rightRefs) : rootX + 0.22;
        const leftSpread = clamp(rootX - leftRefX + 0.08, 0.24, 0.46);
        const rightSpread = clamp(rightRefX - rootX + 0.08, 0.24, 0.46);
        const axillaY = Math.max(
            Number(refs.leftArmpit?.y ?? rootY + 0.13),
            Number(refs.rightArmpit?.y ?? rootY + 0.13)
        );
        const rise = clamp((axillaY - rootY) * 0.50, 0.055, 0.12);
        const exitY = clamp(rootY - rise, 0.025, rootY - 0.025);
        const leftEndX = this._bslFindNeckTransparentEndpoint(pixelInfo, rootX, exitY, 'left', rootX - leftSpread);
        const rightEndX = this._bslFindNeckTransparentEndpoint(pixelInfo, rootX, exitY, 'right', rootX + rightSpread);
        const leftBaseX = clamp(rootX - Math.min(0.14, leftSpread * 0.55), leftEndX + 0.050, rootX - 0.055);
        const rightBaseX = clamp(rootX + Math.min(0.14, rightSpread * 0.55), rootX + 0.055, rightEndX - 0.050);

        return [
            { x: round(leftEndX), y: round(exitY) },
            { x: round(leftBaseX), y: round(rootY - 0.018) },
            { x: round(rootX), y: round(rootY) },
            { x: round(rightBaseX), y: round(rootY - 0.018) },
            { x: round(rightEndX), y: round(exitY) }
        ];
    },

    _bslGetNeckRootPoint() {
        const points = this._bslCurves?.neck?.points || [];
        const valid = points.filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y));
        if (!valid.length) return { x: 0.5, y: this._bslEvalCurveAtX('neck', 0.5) };
        return valid.reduce((best, point) => point.y > best.y ? point : best, valid[0]);
    },

    _bslCaptureTrainingSample() {
        if (!this._bslDescriptor || !this._bslCurves) return null;
        return {
            savedAt: Date.now(),
            descriptor: this._bslDescriptor,
            curves: this._bslCloneCurves()
        };
    },

    _bslSaveTrainingSample(panel, quiet = false) {
        const sample = this._bslCaptureTrainingSample();
        if (!sample) return false;

        const existing = this._getBodySlicerTrainingSamples();
        let replaced = false;
        const next = existing.map(entry => {
            const score = this._bslDescriptorDistance(entry?.descriptor, sample.descriptor);
            if (!replaced && score < 0.08) {
                replaced = true;
                return sample;
            }
            return entry;
        });
        if (!replaced) next.push(sample);
        const finalSamples = next.slice(-18);
        this._setBodySlicerTrainingSamples(finalSamples);
        panel?.querySelector('#bsl-clear-training')?.style.setProperty('display', 'inline-flex');
        this._bslUpdateLegend(panel);
        if (!quiet) {
            const toolName = this._bslLaunchMode === 'character-cutter' ? 'Character Cutter' : 'Body Slicer';
            Utils.showToast(replaced ? `Updated learned ${toolName} layout` : `Saved learned ${toolName} layout`, 'success');
        }
        return true;
    },

    _bslSyncCurveButtons(panel) {
        panel?.querySelectorAll('.bsl-curve-btn').forEach(btn => {
            btn.style.opacity = btn.dataset.curve === this._bslSelectedCurve ? '1' : '0.65';
        });
    },

    _bslUpdatePointToolState(panel = document.getElementById('body-slicer-panel')) {
        const addBtn = panel?.querySelector('#bsl-add-point');
        const deleteBtn = panel?.querySelector('#bsl-delete-point');
        const status = panel?.querySelector('#bsl-point-status');
        if (addBtn) {
            addBtn.style.background = this._bslAddPointMode ? '#2563eb' : '';
            addBtn.style.color = this._bslAddPointMode ? '#fff' : '';
            addBtn.innerHTML = this._bslAddPointMode
                ? '<i class="fas fa-crosshairs"></i> Click Line'
                : '<i class="fas fa-plus"></i> Add Point';
        }
        if (deleteBtn) {
            const canDelete = this._bslCanDeletePoint(this._bslSelectedPoint || this._bslHoverPoint);
            deleteBtn.disabled = !canDelete;
            deleteBtn.style.opacity = canDelete ? '1' : '0.55';
        }
        if (status) {
            const curve = this._bslCurves?.[this._bslSelectedCurve];
            const count = curve?.points?.length || 0;
            status.textContent = this._bslAddPointMode
                ? `Click the ${curve?.name || 'selected'} line to insert a point.`
                : `${count} point${count === 1 ? '' : 's'} on selected line. Double-click line to add; right-click point to remove.`;
        }
    },

    _bslGetCurvePointLimit(curveKey) {
        const curve = this._bslCurves?.[curveKey];
        return curve?.orientation === 'horizontal' ? 14 : 10;
    },

    _bslCanDeletePoint(pointRef = this._bslSelectedPoint || this._bslHoverPoint) {
        const curve = pointRef ? this._bslCurves?.[pointRef.curveKey] : null;
        if (!curve?.points) return false;
        return curve.points.length > 2 && pointRef.pointIndex >= 0 && pointRef.pointIndex < curve.points.length;
    },

    _bslStageToNormPoint(pos) {
        const obj = this._bslObj;
        if (!obj) return null;
        return {
            x: this._clamp01((pos.x - obj.x) / Math.max(1, obj.width)),
            y: this._clamp01((pos.y - obj.y) / Math.max(1, obj.height))
        };
    },

    _bslFindPointIndex(curveKey, normPoint) {
        const curve = this._bslCurves?.[curveKey];
        if (!curve?.points?.length || !normPoint) return -1;
        let bestIndex = 0;
        let bestDist = Infinity;
        curve.points.forEach((point, index) => {
            const dist = Math.hypot(point.x - normPoint.x, point.y - normPoint.y);
            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = index;
            }
        });
        return bestIndex;
    },

    _bslDistanceToSegment(point, a, b) {
        const abx = b.x - a.x;
        const aby = b.y - a.y;
        const lenSq = abx * abx + aby * aby;
        const rawT = lenSq > 0 ? ((point.x - a.x) * abx + (point.y - a.y) * aby) / lenSq : 0;
        const t = Math.max(0, Math.min(1, rawT));
        const x = a.x + abx * t;
        const y = a.y + aby * t;
        return { distance: Math.hypot(point.x - x, point.y - y), t, x, y };
    },

    _bslGetNearestCurveSegment(pos, curveKey = this._bslSelectedCurve) {
        const obj = this._bslObj;
        if (!obj || !this._bslCurves) return null;
        const toStage = (point) => ({ x: obj.x + point.x * obj.width, y: obj.y + point.y * obj.height });
        const entries = curveKey && this._bslCurves[curveKey]
            ? [[curveKey, this._bslCurves[curveKey]]]
            : Object.entries(this._bslCurves);
        let best = null;
        entries.forEach(([key, curve]) => {
            const pts = curve?.points || [];
            if (pts.length < 2) return;
            for (let i = 0; i < pts.length - 1; i++) {
                const a = toStage(pts[i]);
                const b = toStage(pts[i + 1]);
                const hit = this._bslDistanceToSegment(pos, a, b);
                if (!best || hit.distance < best.distance) {
                    const normA = pts[i];
                    const normB = pts[i + 1];
                    best = {
                        curveKey: key,
                        afterIndex: i,
                        distance: hit.distance,
                        x: hit.x,
                        y: hit.y,
                        norm: {
                            x: normA.x + (normB.x - normA.x) * hit.t,
                            y: normA.y + (normB.y - normA.y) * hit.t
                        }
                    };
                }
            }
        });
        return best;
    },

    _bslAddPointAtStage(pos, curveKey = this._bslSelectedCurve, panel = document.getElementById('body-slicer-panel')) {
        const nearest = this._bslGetNearestCurveSegment(pos, curveKey);
        const curve = nearest ? this._bslCurves?.[nearest.curveKey] : null;
        if (!nearest || !curve?.points) {
            Utils.showToast?.('Click closer to a Body Slicer line to add a point.', 'warning');
            return false;
        }
        const zoom = Math.max(0.001, this.stage.zoom);
        if (nearest.distance > 18 / zoom) {
            Utils.showToast?.('Click directly on the selected cut line to add a point.', 'warning');
            return false;
        }
        const limit = this._bslGetCurvePointLimit(nearest.curveKey);
        if (curve.points.length >= limit) {
            Utils.showToast?.(`${curve.name || 'This line'} already has the maximum ${limit} editable points.`, 'warning');
            return false;
        }
        const inserted = { x: this._clamp01(nearest.norm.x), y: this._clamp01(nearest.norm.y) };
        curve.points.splice(nearest.afterIndex + 1, 0, inserted);
        this._bslSelectedCurve = nearest.curveKey;
        this._bslNormalizeCurves();
        const pointIndex = this._bslFindPointIndex(nearest.curveKey, inserted);
        this._bslSelectedPoint = { curveKey: nearest.curveKey, pointIndex };
        this._bslHoverPoint = this._bslSelectedPoint;
        this._bslRefreshLandmarksFromCurves();
        this._bslGuideConfidence = this._bslBuildGuideConfidence(this._bslLandmarks);
        this._bslSyncCurveButtons(panel);
        this._bslUpdateLegend(panel);
        this._bslUpdatePointToolState(panel);
        this.stage.requestRender();
        return true;
    },

    _bslDeleteSelectedPoint(panel = document.getElementById('body-slicer-panel')) {
        const ref = this._bslSelectedPoint || this._bslHoverPoint;
        if (!this._bslCanDeletePoint(ref)) {
            Utils.showToast?.('This line needs at least 2 points, so that point cannot be removed.', 'warning');
            return false;
        }
        const curve = this._bslCurves[ref.curveKey];
        curve.points.splice(ref.pointIndex, 1);
        this._bslNormalizeCurves();
        const nextIndex = Math.min(ref.pointIndex, curve.points.length - 1);
        this._bslSelectedCurve = ref.curveKey;
        this._bslSelectedPoint = { curveKey: ref.curveKey, pointIndex: nextIndex };
        this._bslHoverPoint = this._bslSelectedPoint;
        this._bslRefreshLandmarksFromCurves();
        this._bslGuideConfidence = this._bslBuildGuideConfidence(this._bslLandmarks);
        this._bslSyncCurveButtons(panel);
        this._bslUpdateLegend(panel);
        this._bslUpdatePointToolState(panel);
        this.stage.requestRender();
        return true;
    },

    _bslNormalizeCurves() {
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        Object.entries(this._bslCurves || {}).forEach(([key, curve]) => {
            if (!curve?.points?.length) return;
            if (curve.orientation === 'horizontal') {
                curve.points.sort((a, b) => a.x - b.x);
                const gap = 0.06;
                curve.points.forEach((point, index) => {
                    const maxX = 0.98 - (curve.points.length - 1 - index) * gap;
                    const minX = 0.02 + index * gap;
                    point.x = clamp(point.x, minX, maxX);
                    point.y = clamp(point.y, key === 'neck' ? 0.06 : 0.32, key === 'neck' ? 0.42 : 0.92);
                });
            } else {
                curve.points.sort((a, b) => a.y - b.y);
                const gap = 0.08;
                curve.points.forEach((point, index) => {
                    const maxY = 0.98 - (curve.points.length - 1 - index) * gap;
                    const minY = 0.04 + index * gap;
                    point.x = clamp(point.x, 0.02, 0.98);
                    point.y = clamp(point.y, minY, maxY);
                });
            }
        });

        const neck = this._bslCurves.neck?.points || [];
        const neckAvg = neck.length ? neck.reduce((sum, point) => sum + point.y, 0) / neck.length : 0.18;

        // ── Side-view constraints ──
        if (this._bslViewMode === 'side') {
            const waist = this._bslCurves.waist?.points || [];
            const armBound = this._bslCurves.armBound?.points || [];
            const waistAvg = waist.length ? waist.reduce((sum, p) => sum + p.y, 0) / waist.length : 0.52;

            waist.forEach(point => {
                point.y = clamp(point.y, neckAvg + 0.18, 0.92);
            });
            armBound.forEach((point, index) => {
                point.x = clamp(point.x, 0.15, 0.90);
                point.y = clamp(point.y, index === 0 ? neckAvg - 0.02 : armBound[index - 1].y + 0.04, waistAvg + 0.02);
            });
            return;
        }

        // ── Front-view constraints ──
        const crotch = this._bslCurves.crotch?.points || [];
        const leftArm = this._bslCurves.leftArm?.points || [];
        const rightArm = this._bslCurves.rightArm?.points || [];
        const legSplit = this._bslCurves.legSplit?.points || [];
        const crotchAvg = crotch.length ? crotch.reduce((sum, point) => sum + point.y, 0) / crotch.length : 0.52;

        crotch.forEach(point => {
            point.y = clamp(point.y, neckAvg + 0.18, 0.92);
        });

        leftArm.forEach((point, index) => {
            point.x = clamp(point.x, 0.02, 0.60);
            point.y = clamp(point.y, index === 0 ? neckAvg - 0.02 : leftArm[index - 1].y + 0.04, 0.98 - (leftArm.length - 1 - index) * 0.04);
        });
        rightArm.forEach((point, index) => {
            point.x = clamp(point.x, 0.40, 0.98);
            point.y = clamp(point.y, index === 0 ? neckAvg - 0.02 : rightArm[index - 1].y + 0.04, 0.98 - (rightArm.length - 1 - index) * 0.04);
        });

        leftArm.forEach(point => {
            const rightX = this._bslEvalCurveAtY('rightArm', point.y);
            point.x = clamp(point.x, 0.02, rightX - 0.14);
        });
        rightArm.forEach(point => {
            const leftX = this._bslEvalCurveAtY('leftArm', point.y);
            point.x = clamp(point.x, leftX + 0.14, 0.98);
        });

        legSplit.forEach(point => {
            const leftX = this._bslEvalCurveAtY('leftArm', point.y);
            const rightX = this._bslEvalCurveAtY('rightArm', point.y);
            point.x = clamp(point.x, leftX + 0.08, rightX - 0.08);
            point.y = clamp(point.y, crotchAvg, 0.98);
        });
    },

    _bslEvalCurveAtX(curveKey, x) {
        const curve = this._bslCurves?.[curveKey];
        if (!curve?.points?.length) return 0.5;
        const pts = [...curve.points].sort((a, b) => a.x - b.x);
        if (x <= pts[0].x) return pts[0].y;
        if (x >= pts[pts.length - 1].x) return pts[pts.length - 1].y;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            if (x >= a.x && x <= b.x) {
                const span = Math.max(0.0001, b.x - a.x);
                const t = (x - a.x) / span;
                return a.y + (b.y - a.y) * t;
            }
        }
        return pts[pts.length - 1].y;
    },

    _bslEvalCurveAtY(curveKey, y) {
        const curve = this._bslCurves?.[curveKey];
        if (!curve?.points?.length) return 0.5;
        const pts = [...curve.points].sort((a, b) => a.y - b.y);
        if (y <= pts[0].y) return pts[0].x;
        if (y >= pts[pts.length - 1].y) return pts[pts.length - 1].x;
        for (let i = 0; i < pts.length - 1; i++) {
            const a = pts[i];
            const b = pts[i + 1];
            if (y >= a.y && y <= b.y) {
                const span = Math.max(0.0001, b.y - a.y);
                const t = (y - a.y) / span;
                return a.x + (b.x - a.x) * t;
            }
        }
        return pts[pts.length - 1].x;
    },

    _bslEvalCurveAtYBounded(curveKey, y, pad = 0) {
        const curve = this._bslCurves?.[curveKey];
        if (!curve?.points?.length) return null;
        const pts = [...curve.points].sort((a, b) => a.y - b.y);
        const minY = pts[0].y - pad;
        const maxY = pts[pts.length - 1].y + pad;
        if (y < minY || y > maxY) return null;
        return this._bslEvalCurveAtY(curveKey, y);
    },

    _bslSampleCurve(curveKey, steps = 24) {
        const curve = this._bslCurves?.[curveKey];
        if (!curve?.points?.length) return [];
        const samples = [];
        if (curve.orientation === 'horizontal') {
            const start = curve.points[0].x;
            const end = curve.points[curve.points.length - 1].x;
            for (let i = 0; i < steps; i++) {
                const x = start + ((end - start) * i) / Math.max(1, steps - 1);
                samples.push({ x, y: this._bslEvalCurveAtX(curveKey, x) });
            }
        } else {
            const start = curve.points[0].y;
            const end = curve.points[curve.points.length - 1].y;
            for (let i = 0; i < steps; i++) {
                const y = start + ((end - start) * i) / Math.max(1, steps - 1);
                samples.push({ x: this._bslEvalCurveAtY(curveKey, y), y });
            }
        }
        return samples;
    },

    _bslProcessImage(panel) {
        const obj = this._bslObj;
        if (!obj || !this._bslOriginalSrc) return;
        const sessionId = this._bslSessionId;
        const cuttingMethod = panel?.querySelector('#bsl-cutting-method')?.value || 'auto';
        const autoButton = panel?.querySelector('#bsl-auto-detect');
        const originalButtonHtml = autoButton?.innerHTML;
        if (this._bslLaunchMode === 'character-cutter') this._bslHasDetectedGuides = false;
        if (this._bslLaunchMode === 'character-cutter') {
            this._bslSetMlStatus(panel, 'Preparing image and optional ML landmarks...', 'info');
            if (autoButton) {
                autoButton.disabled = true;
                autoButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Detecting';
            }
        }

        const tolerance = parseInt(panel?.querySelector('#bsl-bg-tolerance')?.value ?? 30, 10);
        const padding = parseInt(panel?.querySelector('#bsl-crop-padding')?.value ?? 5, 10);

        const img = new Image();
        img.onload = () => {
            if (sessionId !== this._bslSessionId || obj !== this._bslObj || !panel?.isConnected) return;
            const natW = img.naturalWidth;
            const natH = img.naturalHeight;
            const canvas = document.createElement('canvas');
            canvas.width = natW;
            canvas.height = natH;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0);

            if (tolerance > 0) {
                const imageData = ctx.getImageData(0, 0, natW, natH);
                const data = imageData.data;
                const corners = [[0, 0], [natW - 1, 0], [0, natH - 1], [natW - 1, natH - 1]];
                let bgR = 0, bgG = 0, bgB = 0, count = 0;
                corners.forEach(([sx, sy]) => {
                    const idx = (sy * natW + sx) * 4;
                    if (data[idx + 3] > 128) {
                        bgR += data[idx];
                        bgG += data[idx + 1];
                        bgB += data[idx + 2];
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
                        if (dr * dr + dg * dg + db * db < tolSq) data[i + 3] = 0;
                    }
                    ctx.putImageData(imageData, 0, 0);
                }
            }

            const alpha = ctx.getImageData(0, 0, natW, natH).data;
            let minX = natW, minY = natH, maxX = -1, maxY = -1;
            for (let y = 0; y < natH; y++) {
                for (let x = 0; x < natW; x++) {
                    if (alpha[(y * natW + x) * 4 + 3] > 10) {
                        if (x < minX) minX = x;
                        if (x > maxX) maxX = x;
                        if (y < minY) minY = y;
                        if (y > maxY) maxY = y;
                    }
                }
            }

            if (maxX < minX || maxY < minY) {
                obj.imageSrc = this._bslOriginalSrc;
                obj.loadImage(this._bslOriginalSrc);
                obj.x = this._bslOriginalX;
                obj.y = this._bslOriginalY;
                obj.width = this._bslOriginalW;
                obj.height = this._bslOriginalH;
                this._bslCurves = this._bslViewMode === 'side' ? this._bslGetDefaultCurvesSide() : this._bslGetDefaultCurves();
                this._bslDescriptor = null;
                this._bslTrainingApplied = false;
                this._bslTrainingScore = null;
                this._bslUpdateLegend(panel);
                this.stage.requestRender();
                if (autoButton) {
                    autoButton.disabled = false;
                    autoButton.innerHTML = originalButtonHtml || '<i class="fas fa-crosshairs"></i> Auto Landmarks';
                }
                this._bslSetMlStatus(panel, 'Could not find visible pixels to cut. Restore the image or adjust transparency, then try again.', 'error', 'No Pixels');
                return;
            }

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
            const scaleX = this._bslOriginalW / natW;
            const scaleY = this._bslOriginalH / natH;
            obj.x = this._bslOriginalX + minX * scaleX;
            obj.y = this._bslOriginalY + minY * scaleY;
            obj.width = cropW * scaleX;
            obj.height = cropH * scaleY;
            obj.imageSrc = newSrc;
            obj.loadImage(newSrc);
            obj._contourPixelsCache = null;

            const newImg = new Image();
            newImg.onload = async () => {
                if (sessionId !== this._bslSessionId || obj !== this._bslObj || !panel?.isConnected) return;
                obj.imageElement = newImg;
                obj._contourPixelsCache = null;
                this._bslAutoDetect(obj, panel);
                if (this._bslLaunchMode === 'character-cutter') this._bslHasDetectedGuides = true;
                if (this._bslLaunchMode === 'character-cutter' && this._bslViewMode === 'front' && cuttingMethod === 'ml') {
                    await this._bslTryMlPoseDetect(newImg, obj, panel, sessionId);
                } else if (this._bslLaunchMode === 'character-cutter' && cuttingMethod === 'trace') {
                    this._bslSetMlStatus(panel, 'Trace Silhouette mode active. ML landmarks were skipped so they cannot overwrite the trace guides.', 'info', 'Trace Silhouette');
                } else if (this._bslLaunchMode === 'character-cutter' && cuttingMethod === 'auto') {
                    this._bslSetMlStatus(panel, 'Auto mode used stable Pixel Detection. Choose Trace Silhouette or ML Only explicitly when needed.', 'info', 'Pixel Detection');
                } else if (this._bslLaunchMode === 'character-cutter' && cuttingMethod === 'pixel') {
                    this._bslSetMlStatus(panel, 'Pixel-only mode active. ML landmarks were skipped.', 'info', 'Pixel Detection');
                } else if (this._bslLaunchMode === 'character-cutter') {
                    this._bslSetMlStatus(panel, 'ML pose assist is currently used for front-view characters. Pixel detection applied.', 'warning', 'Pixel Detection');
                }
                this.stage.requestRender();
                if (autoButton) {
                    autoButton.disabled = false;
                    autoButton.innerHTML = originalButtonHtml || '<i class="fas fa-crosshairs"></i> Auto Landmarks';
                }
            };
            newImg.onerror = () => {
                if (autoButton) {
                    autoButton.disabled = false;
                    autoButton.innerHTML = originalButtonHtml || '<i class="fas fa-crosshairs"></i> Auto Landmarks';
                }
                this._bslSetMlStatus(panel, 'Could not prepare image for detection. Try Restore, then Auto Landmarks again.', 'error', 'No Pixels');
            };
            newImg.src = newSrc;
        };
        img.onerror = () => {
            if (autoButton) {
                autoButton.disabled = false;
                autoButton.innerHTML = originalButtonHtml || '<i class="fas fa-crosshairs"></i> Auto Landmarks';
            }
            this._bslSetMlStatus(panel, 'Could not load the source image for detection.', 'error', 'No Pixels');
        };
        img.src = this._bslOriginalSrc;
    },

    _bslSetMlStatus(panel, message, type = 'info', mode = null) {
        const inferredMode = mode ||
            (/trace|silhouette/i.test(message || '') ? 'Trace Silhouette' :
            (/pixel/i.test(message || '') ? 'Pixel Detection' :
                (/human parsing|bodypix|part segmentation/i.test(message || '') ? 'Human Parsing' :
                (/loading|reading|preparing|checking/i.test(message || '') ? 'Checking ML' :
                    (/ML/i.test(message || '') && type === 'success' ? 'ML Assisted' : 'Ready')))));
        this._bslMlStatus = { message, type, mode: inferredMode };
        const el = panel?.querySelector('#bsl-ml-status');
        const badge = panel?.querySelector('#bsl-ml-badge');
        const colors = {
            success: '#86efac',
            warning: '#fbbf24',
            error: '#f87171',
            info: '#94a3b8'
        };
        if (el) {
            el.style.color = colors[type] || colors.info;
            el.textContent = message || '';
        }
        if (badge) {
            const badgeStyles = {
                'Human Parsing': { bg: '#064e3b', color: '#a7f3d0' },
                'ML Assisted': { bg: '#14532d', color: '#bbf7d0' },
                'Checking ML': { bg: '#312e81', color: '#c7d2fe' },
                'Trace Silhouette': { bg: '#1e3a8a', color: '#bfdbfe' },
                'Pixel Detection': { bg: '#78350f', color: '#fde68a' },
                'No Pixels': { bg: '#7f1d1d', color: '#fecaca' },
                Ready: { bg: '#334155', color: '#cbd5e1' }
            };
            const style = badgeStyles[inferredMode] || badgeStyles.Ready;
            badge.textContent = inferredMode;
            badge.style.background = style.bg;
            badge.style.color = style.color;
        }
    },

    _bslLoadExternalScriptOnce(src, globalCheck = null) {
        if (globalCheck && globalCheck()) return Promise.resolve();
        this._bslScriptPromises = this._bslScriptPromises || {};
        if (this._bslScriptPromises[src]) return this._bslScriptPromises[src];
        this._bslScriptPromises[src] = new Promise((resolve, reject) => {
            const existing = Array.from(document.scripts || []).find(script => script.src === src);
            if (existing) {
                existing.addEventListener('load', () => resolve(), { once: true });
                existing.addEventListener('error', () => reject(new Error(`Failed to load ${src}`)), { once: true });
                if (globalCheck && globalCheck()) resolve();
                return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load ${src}`));
            document.head.appendChild(script);
        });
        return this._bslScriptPromises[src];
    },

    async _bslLoadHumanPartSegmenter(panel = null) {
        if (this._bslHumanPartSegmenterPromise) return this._bslHumanPartSegmenterPromise;
        this._bslHumanPartSegmenterPromise = (async () => {
            this._bslSetMlStatus?.(panel, 'Loading Human Parsing model for body-part pixels...', 'info', 'Checking ML');
            await this._bslLoadExternalScriptOnce(
                'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@3.21.0/dist/tf.min.js',
                () => !!window.tf
            );
            if (window.tf?.setBackend) {
                try {
                    await window.tf.setBackend('webgl');
                } catch (error) {
                    console.warn('[Character Cutter] TFJS WebGL backend unavailable; using default backend.', error);
                }
                await window.tf.ready?.();
            }
            await this._bslLoadExternalScriptOnce(
                'https://cdn.jsdelivr.net/npm/@tensorflow-models/body-pix@2.2.0/dist/body-pix.min.js',
                () => !!window.bodyPix
            );
            if (!window.bodyPix?.load) throw new Error('BodyPix did not expose a load API');
            const segmenter = await window.bodyPix.load({
                architecture: 'MobileNetV1',
                outputStride: 16,
                multiplier: 0.75,
                quantBytes: 2
            });
            return segmenter;
        })().catch(error => {
            this._bslHumanPartSegmenterPromise = null;
            throw error;
        });
        return this._bslHumanPartSegmenterPromise;
    },

    _bslGetAlphaRowWidth(pixels, w, y, alphaThreshold = 40) {
        const row = Math.max(0, Math.min(Math.floor((pixels?.length || 0) / Math.max(1, w * 4)) - 1, Math.round(y)));
        const off = row * w * 4;
        let minX = w;
        let maxX = -1;
        for (let x = 0; x < w; x++) {
            if (pixels[off + x * 4 + 3] >= alphaThreshold) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
        return maxX >= minX ? maxX - minX + 1 : 0;
    },

    _bslGetAlphaRowSpans(pixels, w, y, alphaThreshold = 40) {
        const row = Math.max(0, Math.min(Math.floor((pixels?.length || 0) / Math.max(1, w * 4)) - 1, Math.round(y)));
        const off = row * w * 4;
        const spans = [];
        let inSpan = false;
        let start = 0;
        for (let x = 0; x < w; x++) {
            const opaque = pixels[off + x * 4 + 3] >= alphaThreshold;
            if (opaque && !inSpan) {
                start = x;
                inSpan = true;
            } else if (!opaque && inSpan) {
                spans.push({ s: start, e: x - 1, start, end: x - 1, width: x - start });
                inSpan = false;
            }
        }
        if (inSpan) spans.push({ s: start, e: w - 1, start, end: w - 1, width: w - start });
        return spans;
    },

    _bslFindNeckByWidthRatio(pixels, w, h, topRatio = 0.05, bottomRatio = 0.40) {
        const top = Math.max(0, Math.round(h * topRatio));
        const bottom = Math.min(h - 1, Math.round(h * bottomRatio));
        let minWidth = Infinity;
        let minRow = -1;
        for (let y = top; y <= bottom; y++) {
            const width = this._bslGetAlphaRowWidth(pixels, w, y);
            if (width > 0 && width < minWidth) {
                minWidth = width;
                minRow = y;
            }
        }
        return minRow;
    },

    _bslFindNeckByShoulderPeaks(pixels, w, h, topRatio = 0.06, bottomRatio = 0.44) {
        const top = Math.max(0, Math.round(h * topRatio));
        const bottom = Math.min(h - 1, Math.round(h * bottomRatio));
        const widths = [];
        for (let y = top; y <= bottom; y++) {
            widths.push(this._bslGetAlphaRowWidth(pixels, w, y));
        }
        const window = Math.max(3, Math.round(widths.length * 0.035));
        for (let i = window; i < widths.length - window; i++) {
            const before = widths.slice(i - window, i).reduce((sum, value) => sum + value, 0) / window;
            const after = widths.slice(i + 1, i + 1 + window).reduce((sum, value) => sum + value, 0) / window;
            if (before > 0 && after > before * 1.15 && widths[i] <= before * 1.08) {
                return top + i;
            }
        }
        return -1;
    },

    _bslFindNeckByColorTransition(pixels, w, h) {
        const faceTop = Math.max(0, Math.round(h * 0.07));
        const faceBottom = Math.min(h - 1, Math.round(h * 0.20));
        const faceLeft = Math.round(w * 0.32);
        const faceRight = Math.round(w * 0.68);
        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;
        for (let y = faceTop; y <= faceBottom; y++) {
            for (let x = faceLeft; x <= faceRight; x++) {
                const off = (y * w + x) * 4;
                if (pixels[off + 3] < 40) continue;
                r += pixels[off];
                g += pixels[off + 1];
                b += pixels[off + 2];
                count++;
            }
        }
        if (count < 12) return -1;
        r /= count; g /= count; b /= count;
        const centerX = Math.round(w * 0.5);
        for (let y = Math.round(h * 0.16); y <= Math.round(h * 0.40); y++) {
            const off = (y * w + centerX) * 4;
            if (pixels[off + 3] < 40) continue;
            const diff = Math.abs(pixels[off] - r) + Math.abs(pixels[off + 1] - g) + Math.abs(pixels[off + 2] - b);
            if (diff > 70) return y;
        }
        return -1;
    },

    _bslFindNeckByMultipleStrategies(pixels, w, h, bounds = {}) {
        const topRatio = bounds.topRatio ?? 0.05;
        const bottomRatio = bounds.bottomRatio ?? 0.42;
        const candidates = [
            this._bslFindNeckByShoulderPeaks(pixels, w, h, topRatio, bottomRatio),
            this._bslFindNeckByWidthRatio(pixels, w, h, topRatio, bottomRatio),
            this._bslFindNeckByColorTransition(pixels, w, h)
        ].filter(row => Number.isFinite(row) && row >= 0);
        if (!candidates.length) return Math.round(h * 0.18);
        candidates.sort((a, b) => a - b);
        return candidates[Math.floor(candidates.length / 2)];
    },

    _bslFindArmpits(pixels, w, h, torsoCenterX, neckY, shoulderY) {
        // The axilla is the APEX (highest point) of the transparent gap between the
        // side of the torso and the arm. For each side we find the topmost row where
        // the arm first separates from the torso, and return the TORSO-SIDE edge of
        // that gap (the "curve of the axilla, into the pixel"). A perpendicular line
        // up from this point reaches the shoulder tip.
        const cxPx = torsoCenterX * w;
        const start = Math.max(0, Math.round(this._clamp01(neckY + 0.01) * h));
        const end = Math.min(h - 1, Math.round(Math.min(Math.max(shoulderY + 0.24, neckY + 0.20), 0.68) * h));
        const step = Math.max(1, Math.round(h * 0.006));
        const result = { left: null, right: null };
        for (let y = start; y <= end; y += step) {
            const spans = this._bslGetAlphaRowSpans(pixels, w, y)
                .filter(sp => sp.width > w * 0.015)
                .sort((a, b) => a.s - b.s);
            if (spans.length < 2) continue;
            // The torso is the span that contains the body centre.
            let torso = spans.find(sp => cxPx >= sp.s && cxPx <= sp.e);
            if (!torso) torso = spans.reduce((m, s) => (s.width > m.width ? s : m), spans[0]);
            const leftArm = spans.filter(sp => sp.e < torso.s).sort((a, b) => b.e - a.e)[0];
            const rightArm = spans.filter(sp => sp.s > torso.e).sort((a, b) => a.s - b.s)[0];
            if (leftArm) {
                const gap = (torso.s - leftArm.e) / w;
                if (gap > 0.005 && gap < 0.16) {
                    const p = { x: this._clamp01(torso.s / w), y: this._clamp01(y / h) };
                    if (!result.left || p.y < result.left.y) result.left = p; // topmost = apex
                }
            }
            if (rightArm) {
                const gap = (rightArm.s - torso.e) / w;
                if (gap > 0.005 && gap < 0.16) {
                    const p = { x: this._clamp01(torso.e / w), y: this._clamp01(y / h) };
                    if (!result.right || p.y < result.right.y) result.right = p; // topmost = apex
                }
            }
        }
        return result;
    },

    _bslFindCrotch(pixels, w, h, torsoCenterX, waistY) {
        const start = Math.max(0, Math.round(this._clamp01(waistY) * h));
        const end = Math.min(h - 1, Math.round(Math.min(waistY + 0.34, 0.84) * h));
        for (let y = start; y <= end; y++) {
            const spans = this._bslGetAlphaRowSpans(pixels, w, y).filter(span => span.width > w * 0.035).sort((a, b) => a.s - b.s);
            if (spans.length < 2) continue;
            const twoLargest = [...spans].sort((a, b) => b.width - a.width).slice(0, 2).sort((a, b) => a.s - b.s);
            const gap = twoLargest[1].s - twoLargest[0].e;
            const x = (twoLargest[0].e + twoLargest[1].s) * 0.5 / w;
            if (gap > w * 0.008 && gap < w * 0.16 && Math.abs(x - torsoCenterX) < 0.22) {
                return { x: this._clamp01(x), y: this._clamp01(y / h), confidence: 0.86 };
            }
        }
        let bestRow = -1;
        let bestWidth = -1;
        for (let y = start; y <= end; y++) {
            const width = this._bslGetAlphaRowWidth(pixels, w, y);
            if (width > bestWidth) {
                bestWidth = width;
                bestRow = y;
            }
        }
        return {
            x: this._clamp01(torsoCenterX),
            y: this._clamp01((bestRow >= 0 ? bestRow : Math.round(h * 0.56)) / h),
            confidence: 0.42
        };
    },

    _bslRemoveTinyImageDataComponents(imageData, w, h, minPixels = 8) {
        const data = imageData?.data;
        if (!data || !w || !h) return 0;
        const total = w * h;
        const labels = new Int32Array(total);
        const stack = new Int32Array(total);
        const sizes = [0];
        let nextLabel = 0;
        for (let i = 0; i < total; i++) {
            if (labels[i] || data[i * 4 + 3] <= 10) continue;
            nextLabel++;
            let top = 0;
            let size = 0;
            stack[top++] = i;
            labels[i] = nextLabel;
            while (top > 0) {
                const idx = stack[--top];
                size++;
                const x = idx % w;
                const y = (idx - x) / w;
                const visit = (n) => {
                    if (!labels[n] && data[n * 4 + 3] > 10) {
                        labels[n] = nextLabel;
                        stack[top++] = n;
                    }
                };
                if (x > 0) visit(idx - 1);
                if (x < w - 1) visit(idx + 1);
                if (y > 0) visit(idx - w);
                if (y < h - 1) visit(idx + w);
            }
            sizes[nextLabel] = size;
        }
        let removed = 0;
        for (let i = 0; i < total; i++) {
            const label = labels[i];
            if (label && sizes[label] < minPixels) {
                const off = i * 4;
                data[off] = 0;
                data[off + 1] = 0;
                data[off + 2] = 0;
                data[off + 3] = 0;
                removed++;
            }
        }
        return removed;
    },

    _bslRefineRegionData(regionData, cw, ch) {
        if (!regionData || !cw || !ch) return regionData;
        Object.values(regionData).forEach(imageData => {
            let pixels = 0;
            const data = imageData?.data;
            if (!data) return;
            for (let i = 3; i < data.length; i += 4) {
                if (data[i] > 10) pixels++;
            }
            const minPixels = Math.max(6, Math.min(160, Math.round(pixels * 0.004)));
            this._bslRemoveTinyImageDataComponents(imageData, cw, ch, minPixels);
        });
        return regionData;
    },

    async _bslLoadMlPoseLandmarker() {
        if (this._bslMlPosePromise) return this._bslMlPosePromise;
        this._bslMlPosePromise = (async () => {
            const version = '0.10.35';
            const moduleUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/vision_bundle.mjs`;
            const wasmUrl = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${version}/wasm`;
            const modelUrl = 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
            const visionModule = await import(moduleUrl);
            const { FilesetResolver, PoseLandmarker } = visionModule;
            if (!FilesetResolver || !PoseLandmarker) {
                throw new Error('MediaPipe pose module did not expose the expected API');
            }
            const vision = await FilesetResolver.forVisionTasks(wasmUrl);
            const createPoseLandmarker = (delegate) => PoseLandmarker.createFromOptions(vision, {
                baseOptions: { modelAssetPath: modelUrl, delegate },
                runningMode: 'IMAGE',
                numPoses: 1,
                minPoseDetectionConfidence: 0.35,
                minPosePresenceConfidence: 0.35,
                minTrackingConfidence: 0.35
            });
            let poseLandmarker;
            try {
                poseLandmarker = await createPoseLandmarker('GPU');
            } catch (gpuError) {
                console.warn('[BodySlicer] MediaPipe GPU pose failed; retrying with CPU.', gpuError);
                poseLandmarker = await createPoseLandmarker('CPU');
            }
            this._bslMlPoseReady = true;
            return poseLandmarker;
        })().catch(error => {
            this._bslMlPosePromise = null;
            this._bslMlPoseReady = false;
            throw error;
        });
        return this._bslMlPosePromise;
    },

    async _bslTryMlPoseDetect(image, obj, panel, sessionId) {
        if (!image || !obj || !panel?.isConnected) return false;
        try {
            this._bslSetMlStatus(panel, this._bslMlPoseReady ? 'Reading ML pose landmarks...' : 'Loading ML pose model for this cutter session...', 'info');
            const poseLandmarker = await this._bslLoadMlPoseLandmarker();
            if (sessionId !== this._bslSessionId || obj !== this._bslObj || !panel?.isConnected) return false;
            const result = poseLandmarker.detect(image);
            const landmarks = result?.landmarks?.[0] || result?.poseLandmarks?.[0] || null;
            if (!landmarks?.length) {
                this._bslSetMlStatus(panel, 'No clear human pose found. Pixel detection was applied; adjust the guides manually.', 'warning');
                return false;
            }
            const applied = this._bslApplyMlPoseLandmarks(landmarks, obj, panel);
            if (applied) this._bslLastGuideMethod = 'ml-pose';
            this._bslSetMlStatus(
                panel,
                applied
                    ? 'ML landmarks applied. Review and adjust the editable cut lines before creating the character.'
                    : 'ML pose was incomplete. Pixel detection was applied; adjust the guides manually.',
                applied ? 'success' : 'warning'
            );
            return applied;
        } catch (error) {
            console.warn('[Character Cutter] ML pose assist unavailable:', error);
            this._bslSetMlStatus(panel, 'ML pose model could not load on this device/network. Pixel detection was applied.', 'warning');
            return false;
        }
    },

    _bslApplyMlPoseLandmarks(landmarks, obj, panel) {
        const px = obj?._getContourPixels?.();
        if (!px || !landmarks?.length) return false;
        const { pixels, w, h } = px;
        const conf = (point) => Number(point?.visibility ?? point?.presence ?? 1);
        const good = (index, min = 0.25) => {
            const point = landmarks[index];
            return point && Number.isFinite(point.x) && Number.isFinite(point.y) && conf(point) >= min;
        };
        const pt = (index) => landmarks[index];
        const requiredLandmarks = [11, 12, 23, 24];
        const validCore = requiredLandmarks.every(index => good(index, 0.30));
        if (!validCore) {
            console.warn('[Character Cutter] ML pose landmarks insufficient:', requiredLandmarks.map(index => ({
                index,
                visibility: conf(landmarks[index]),
                x: landmarks[index]?.x,
                y: landmarks[index]?.y
            })));
            return false;
        }
        this._bslMlConfidence = Math.min(...requiredLandmarks.map(index => conf(landmarks[index])));

        const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
        const midpoint = (a, b) => ({ x: (a.x + b.x) * 0.5, y: (a.y + b.y) * 0.5 });
        const leftToRight = (a, b) => a.x <= b.x ? [a, b] : [b, a];
        const [imgLeftShoulder, imgRightShoulder] = leftToRight(pt(11), pt(12));
        const [imgLeftHip, imgRightHip] = leftToRight(pt(23), pt(24));
        const [imgLeftWrist, imgRightWrist] = (good(15, 0.18) && good(16, 0.18))
            ? leftToRight(pt(15), pt(16))
            : [null, null];
        const shoulderMid = midpoint(pt(11), pt(12));
        const hipMid = midpoint(pt(23), pt(24));
        const bodyH = Math.max(0.20, Math.abs(hipMid.y - shoulderMid.y));
        const shoulderW = Math.max(0.16, Math.abs(imgRightShoulder.x - imgLeftShoulder.x));

        const rowSpan = (normY) => {
            const y = Math.max(0, Math.min(h - 1, Math.round(clamp(normY) * (h - 1))));
            const off = y * w * 4;
            let left = w;
            let right = -1;
            for (let x = 0; x < w; x++) {
                if (pixels[off + x * 4 + 3] >= 40) {
                    if (x < left) left = x;
                    if (x > right) right = x;
                }
            }
            return right > left ? { left: left / w, right: right / w, width: (right - left + 1) / w, y: y / Math.max(1, h - 1) } : null;
        };
        const rowSpans = (normY) => {
            const y = Math.max(0, Math.min(h - 1, Math.round(clamp(normY) * (h - 1))));
            const off = y * w * 4;
            const spans = [];
            let inSpan = false;
            let start = 0;
            for (let x = 0; x < w; x++) {
                const opaque = pixels[off + x * 4 + 3] >= 40;
                if (opaque && !inSpan) {
                    start = x;
                    inSpan = true;
                } else if (!opaque && inSpan) {
                    spans.push({ s: start, e: x - 1, width: x - start });
                    inSpan = false;
                }
            }
            if (inSpan) spans.push({ s: start, e: w - 1, width: w - start });
            return spans;
        };

        const baseCurves = this._bslCurves || {};
        if (baseCurves.neck && baseCurves.leftArm && baseCurves.rightArm && baseCurves.crotch && baseCurves.legSplit) {
            const pointFromCurve = (key, index, fallback) => {
                const point = baseCurves[key]?.points?.[index];
                return point && Number.isFinite(point.x) && Number.isFinite(point.y) ? { x: point.x, y: point.y } : fallback;
            };
            const closeEnough = (candidate, base, maxDistance) => (
                Number.isFinite(candidate) && Number.isFinite(base) && Math.abs(candidate - base) <= maxDistance
            );
            const chooseMlX = (mlPoint, basePoint, minX, maxX) => {
                if (!mlPoint || !closeEnough(mlPoint.x, basePoint.x, Math.max(0.12, shoulderW * 0.55))) return basePoint.x;
                return clamp(mlPoint.x, minX, maxX);
            };
            const neckYBase = this._bslEvalCurveAtX('neck', 0.5);
            const waistYBase = this._bslEvalCurveAtX('crotch', 0.5);
            const splitYBase = Math.max(
                pointFromCurve('legSplit', 1, { x: 0.5, y: Math.min(0.92, waistYBase + 0.20) }).y,
                waistYBase + 0.12
            );
            const leftShoulderBase = pointFromCurve('leftArm', 0, { x: 0.18, y: neckYBase + 0.04 });
            const rightShoulderBase = pointFromCurve('rightArm', 0, { x: 0.82, y: neckYBase + 0.04 });
            const leftArmpitBase = pointFromCurve('leftArm', 1, { x: 0.28, y: neckYBase + 0.12 });
            const rightArmpitBase = pointFromCurve('rightArm', 1, { x: 0.72, y: neckYBase + 0.12 });
            const leftHipBase = pointFromCurve('crotch', 0, { x: 0.20, y: waistYBase });
            const rightHipBase = pointFromCurve('crotch', 2, { x: 0.80, y: waistYBase });
            const splitBase = pointFromCurve('legSplit', 0, { x: 0.50, y: waistYBase });
            const neckXBase = (() => {
                const points = baseCurves.neck?.points || [];
                if (!points.length) return 0.5;
                return clamp(points.reduce((sum, point) => sum + point.x, 0) / points.length, 0.15, 0.85);
            })();
            const centralSpan = (normY) => {
                const spans = rowSpans(normY);
                if (!spans.length) return null;
                const centerX = hipMid.x;
                return spans.find(span => centerX >= span.s / w && centerX <= span.e / w) ||
                    spans.reduce((best, span) => {
                        const bc = (best.s + best.e) * 0.5 / w;
                        const sc = (span.s + span.e) * 0.5 / w;
                        return Math.abs(sc - centerX) < Math.abs(bc - centerX) ? span : best;
                    }, spans[0]);
            };
            const spanNorm = (span) => span ? { left: span.s / w, right: span.e / w, width: span.width / w } : null;
            const hipY = clamp(
                Math.min(hipMid.y - bodyH * 0.025, splitBase.y || waistYBase),
                shoulderMid.y + bodyH * 0.42,
                Math.min(0.70, waistYBase + 0.04)
            );
            const hipSpan = spanNorm(centralSpan(hipY)) || { left: leftHipBase.x, right: rightHipBase.x, width: rightHipBase.x - leftHipBase.x };
            // MediaPipe shoulder points are the strongest cue for the axilla/shoulder
            // separator. Keep each line nearly vertical so side-raised arms do not
            // steal pixels from the head or torso.
            const leftShoulderX = clamp(imgLeftShoulder.x, 0.03, Math.min(0.58, hipMid.x - 0.05));
            const rightShoulderX = clamp(imgRightShoulder.x, Math.max(0.42, hipMid.x + 0.05), 0.97);
            const armpitY = clamp(shoulderMid.y + bodyH * 0.15, shoulderMid.y + 0.035, hipY - 0.06);
            const leftArmpitX = clamp(leftShoulderX, hipSpan.left, hipMid.x - 0.04);
            const rightArmpitX = clamp(rightShoulderX, hipMid.x + 0.04, hipSpan.right);
            const leftHipX = clamp(Math.min(imgLeftHip.x, hipSpan.left + hipSpan.width * 0.10), 0.03, hipMid.x - 0.04);
            const rightHipX = clamp(Math.max(imgRightHip.x, hipSpan.right - hipSpan.width * 0.10), hipMid.x + 0.04, 0.97);
            const splitX = clamp(hipMid.x, leftHipX + 0.05, rightHipX - 0.05);
            const splitY = clamp(Math.max(splitYBase, hipY + 0.12), hipY + 0.10, Math.min(0.92, hipY + bodyH * 0.45));

            this._bslLandmarks = {
                neck: { x: neckXBase, y: neckYBase, label: 'Neck root', color: '#f59e0b', help: 'Pixel-refined neck root; ML pose confirmed the body orientation' },
                leftShoulder: { x: leftShoulderX, y: clamp(imgLeftShoulder.y, neckYBase - 0.015, armpitY - 0.025), label: 'Right shoulder', color: '#38bdf8', help: 'ML shoulder tip for the character right arm separator' },
                rightShoulder: { x: rightShoulderX, y: clamp(imgRightShoulder.y, neckYBase - 0.015, armpitY - 0.025), label: 'Left shoulder', color: '#38bdf8', help: 'ML shoulder tip for the character left arm separator' },
                leftArmpit: { x: leftArmpitX, y: armpitY, label: 'Right axilla', color: '#38bdf8', help: 'Character right axilla end of the shoulder cut' },
                rightArmpit: { x: rightArmpitX, y: armpitY, label: 'Left axilla', color: '#38bdf8', help: 'Character left axilla end of the shoulder cut' },
                leftHip: { x: leftHipX, y: hipY, label: 'Right hip', color: '#f97316', help: 'Character right hip line stays above the crotch' },
                rightHip: { x: rightHipX, y: hipY, label: 'Left hip', color: '#f97316', help: 'Character left hip line stays above the crotch' },
                crotch: { x: splitX, y: hipY, label: 'Crotch start', color: '#10b981', help: 'Short vertical separator starts at the hip line' },
                legSplit: { x: splitX, y: splitY, label: 'Leg split', color: '#10b981', help: 'Short separator between upper legs' },
                ...(imgLeftWrist ? {
                    leftHand: { x: clamp(imgLeftWrist.x, 0.01, 0.99), y: clamp(imgLeftWrist.y, 0.02, 0.98), label: 'Right wrist', color: '#0ea5e9', help: 'ML wrist point for character right arm joints' }
                } : {}),
                ...(imgRightWrist ? {
                    rightHand: { x: clamp(imgRightWrist.x, 0.01, 0.99), y: clamp(imgRightWrist.y, 0.02, 0.98), label: 'Left wrist', color: '#0ea5e9', help: 'ML wrist point for character left arm joints' }
                } : {})
            };
            this._bslApplyCurvesFromLandmarks(panel);
            this._bslTrainingApplied = false;
            this._bslTrainingScore = null;
            this._bslSyncCurveButtons(panel);
            this._bslUpdateLegend(panel);
            return true;
        }

        const findNeck = () => {
            const start = clamp(shoulderMid.y - bodyH * 0.26, 0.04, shoulderMid.y - 0.02);
            const end = clamp(shoulderMid.y - bodyH * 0.04, start + 0.02, shoulderMid.y - 0.008);
            const shoulderSpan = rowSpan(shoulderMid.y) || { width: shoulderW, left: imgLeftShoulder.x, right: imgRightShoulder.x };
            let best = null;
            for (let y = start; y <= end; y += 0.006) {
                const span = rowSpan(y);
                if (!span) continue;
                const center = (span.left + span.right) * 0.5;
                const centerPenalty = Math.abs(center - shoulderMid.x) * 0.35;
                const targetWidth = Math.min(shoulderSpan.width * 0.68, shoulderW * 0.95);
                const widthScore = Math.abs(span.width - targetWidth);
                const lowerBonus = y * 0.06;
                const score = widthScore + centerPenalty - lowerBonus;
                if (!best || score < best.score) best = { ...span, score };
            }
            return best || rowSpan(clamp(shoulderMid.y - bodyH * 0.10, 0.08, 0.36));
        };
        const findLegSplit = (hipY) => {
            const kneeCandidates = [25, 26].filter(index => good(index, 0.20)).map(index => pt(index).y);
            const kneeY = kneeCandidates.length ? Math.max(...kneeCandidates) : hipY + bodyH * 0.62;
            const scanEnd = clamp(hipY + Math.max(0.10, (kneeY - hipY) * 0.42), hipY + 0.08, 0.92);
            let splitX = hipMid.x;
            let endY = scanEnd;
            for (let y = hipY + 0.035; y <= scanEnd; y += 0.008) {
                const spans = rowSpans(y).sort((a, b) => b.width - a.width);
                if (spans.length >= 2) {
                    const [a, b] = spans[0].s <= spans[1].s ? [spans[0], spans[1]] : [spans[1], spans[0]];
                    splitX = ((a.e + b.s) * 0.5) / w;
                    endY = y;
                    break;
                }
            }
            return { x: clamp(splitX, 0.20, 0.80), y: clamp(endY, hipY + 0.08, 0.92) };
        };

        const neckSpan = findNeck();
        if (!neckSpan) return false;
        const armpitY = clamp(shoulderMid.y + bodyH * 0.16, shoulderMid.y + 0.025, hipMid.y - 0.08);
        const armpitSpan = rowSpan(armpitY);
        const bodyLeftX = armpitSpan ? clamp(armpitSpan.left + armpitSpan.width * 0.12, 0.04, shoulderMid.x - 0.04) : clamp(imgLeftShoulder.x + shoulderW * 0.16, 0.06, 0.50);
        const bodyRightX = armpitSpan ? clamp(armpitSpan.right - armpitSpan.width * 0.12, shoulderMid.x + 0.04, 0.96) : clamp(imgRightShoulder.x - shoulderW * 0.16, 0.50, 0.94);
        const hipY = clamp(hipMid.y + bodyH * 0.045, shoulderMid.y + 0.18, 0.78);
        const split = findLegSplit(hipY);
        const neckCenter = clamp((neckSpan.left + neckSpan.right) * 0.5, 0.15, 0.85);
        const neckY = clamp(neckSpan.y, 0.06, shoulderMid.y - 0.008);

        this._bslLandmarks = {
            neck: { x: neckCenter, y: neckY, label: 'Neck root', color: '#f59e0b', help: 'ML-estimated lower neck/root cut' },
            leftShoulder: { x: clamp(imgLeftShoulder.x, 0.02, 0.60), y: clamp(imgLeftShoulder.y, 0.04, 0.56), label: 'Left shoulder', color: '#38bdf8', help: 'Shoulder tip from ML pose' },
            rightShoulder: { x: clamp(imgRightShoulder.x, 0.40, 0.98), y: clamp(imgRightShoulder.y, 0.04, 0.56), label: 'Right shoulder', color: '#38bdf8', help: 'Shoulder tip from ML pose' },
            leftArmpit: { x: bodyLeftX, y: armpitY, label: 'Left axilla', color: '#38bdf8', help: 'Pixel-refined axilla end for shoulder cut' },
            rightArmpit: { x: bodyRightX, y: armpitY, label: 'Right axilla', color: '#38bdf8', help: 'Pixel-refined axilla end for shoulder cut' },
            leftHip: { x: clamp(imgLeftHip.x, 0.04, 0.56), y: hipY, label: 'Left hip', color: '#f97316', help: 'Hip cut start from ML pose' },
            rightHip: { x: clamp(imgRightHip.x, 0.44, 0.96), y: hipY, label: 'Right hip', color: '#f97316', help: 'Hip cut end from ML pose' },
            crotch: { x: clamp(hipMid.x, 0.20, 0.80), y: hipY, label: 'Crotch start', color: '#10b981', help: 'Start of short vertical leg separator' },
            legSplit: { x: split.x, y: split.y, label: 'Leg split', color: '#10b981', help: 'Short separator between upper legs' },
            ...(imgLeftWrist ? {
                    leftHand: { x: clamp(imgLeftWrist.x, 0.01, 0.99), y: clamp(imgLeftWrist.y, 0.02, 0.98), label: 'Right wrist', color: '#0ea5e9', help: 'ML wrist point for character right arm joints' }
                } : {}),
                ...(imgRightWrist ? {
                    rightHand: { x: clamp(imgRightWrist.x, 0.01, 0.99), y: clamp(imgRightWrist.y, 0.02, 0.98), label: 'Left wrist', color: '#0ea5e9', help: 'ML wrist point for character left arm joints' }
                } : {})
        };
        this._bslApplyCurvesFromLandmarks(panel);
        this._bslTrainingApplied = false;
        this._bslTrainingScore = null;
        this._bslSyncCurveButtons(panel);
        this._bslUpdateLegend(panel);
        return true;
    },

    _bslAutoDetect(obj, panel) {
        const px = obj._getContourPixels?.();
        if (!px) return;
        const { pixels, w, h } = px;
        this._bslCurvePixelInfo = { pixels, w, h };
        this._bslLastGuideMethod = 'pixel-profile';
        this._bslDescriptor = this._bslComputeSilhouetteDescriptor(pixels, w, h);

        let silMinY = h, silMaxY = -1, silMinX = w, silMaxX = -1;
        for (let y = 0; y < h; y++) {
            const off = y * w * 4;
            for (let x = 0; x < w; x++) {
                if (pixels[off + x * 4 + 3] >= 40) {
                    if (y < silMinY) silMinY = y;
                    if (y > silMaxY) silMaxY = y;
                    if (x < silMinX) silMinX = x;
                    if (x > silMaxX) silMaxX = x;
                }
            }
        }
        if (silMaxY <= silMinY || silMaxX <= silMinX) return;

        const silH = silMaxY - silMinY + 1;
        const silW = silMaxX - silMinX + 1;
        const widths = [];
        for (let y = silMinY; y <= silMaxY; y++) {
            const off = y * w * 4;
            let rowMin = w;
            let rowMax = -1;
            for (let x = 0; x < w; x++) {
                if (pixels[off + x * 4 + 3] >= 40) {
                    if (x < rowMin) rowMin = x;
                    if (x > rowMax) rowMax = x;
                }
            }
            widths.push(rowMax >= rowMin ? (rowMax - rowMin + 1) / silW : 0);
        }
        const smoothed = this._smoothSmartCutValues(widths, 5);
        const silToImg = (t) => (silMinY + t * silH) / h;
        const widthAtT = (t) => {
            const idx = Math.round(this._clamp01(t) * (smoothed.length - 1));
            return smoothed[Math.max(0, Math.min(smoothed.length - 1, idx))];
        };

        // ── Side-view auto-detect ──
        if (this._bslViewMode === 'side') {
            let neckT = this._findSmartCutProminentProfileT(smoothed, 0.10, 0.26, 'min');
            neckT = Math.max(0.12, Math.min(0.28, neckT + 0.03));
            let waistT = this._findSmartCutProminentProfileT(smoothed, Math.max(0.38, neckT + 0.18), 0.68, 'min');
            waistT = Math.max(neckT + 0.20, Math.min(0.68, waistT));

            const neckY = silToImg(neckT);
            const waistY = silToImg(waistT);
            const roundNorm = (value) => Math.round(this._clamp01(value) * 1000) / 1000;

            // For arm boundary: sample the body width at torso level and place curve at ~60% from back
            const sampleRow = (row) => {
                const off = row * w * 4;
                let left = w, right = -1;
                for (let x = 0; x < w; x++) {
                    if (pixels[off + x * 4 + 3] >= 40) {
                        if (x < left) left = x;
                        if (x > right) right = x;
                    }
                }
                return right > left ? { left: left / w, right: right / w } : null;
            };
            const midTorsoRow = Math.round(this._clamp01((neckY + waistY) * 0.5) * (h - 1));
            const midSpan = sampleRow(midTorsoRow);
            const armBoundX = midSpan ? roundNorm(midSpan.left + (midSpan.right - midSpan.left) * 0.62) : 0.55;

            this._bslCurves = this._bslGetDefaultCurvesSide();
            this._bslCurves.neck.points = [
                { x: roundNorm(Math.max(0.04, (midSpan?.left || 0.10) - 0.06)), y: roundNorm(neckY + 0.008) },
                { x: 0.3, y: roundNorm(neckY) },
                { x: 0.5, y: roundNorm(Math.max(0.05, neckY - 0.004)) },
                { x: 0.7, y: roundNorm(neckY) },
                { x: roundNorm(Math.min(0.96, (midSpan?.right || 0.90) + 0.06)), y: roundNorm(neckY + 0.008) }
            ];
            this._bslCurves.armBound.points = [
                { x: roundNorm(armBoundX + 0.03), y: roundNorm(neckY + 0.01) },
                { x: roundNorm(armBoundX), y: roundNorm(neckY + (waistY - neckY) * 0.35) },
                { x: roundNorm(armBoundX - 0.03), y: roundNorm(neckY + (waistY - neckY) * 0.70) },
                { x: roundNorm(armBoundX - 0.06), y: roundNorm(waistY) }
            ];
            this._bslCurves.waist.points = [
                { x: roundNorm(Math.max(0.06, (midSpan?.left || 0.10) - 0.04)), y: roundNorm(waistY - 0.006) },
                { x: 0.3, y: roundNorm(waistY + 0.004) },
                { x: 0.5, y: roundNorm(waistY + 0.008) },
                { x: 0.7, y: roundNorm(waistY + 0.004) },
                { x: roundNorm(Math.min(0.94, (midSpan?.right || 0.90) + 0.04)), y: roundNorm(waistY - 0.006) }
            ];
            this._bslNormalizeCurves();
            this._bslRefreshLandmarksFromCurves();
            this._bslRebuildCurveSelector(panel);
            this._bslUpdateLegend(panel);
            return;
        }

        const selectedCutMethod = panel?.querySelector('#bsl-cutting-method')?.value || 'auto';
        if (this._bslLaunchMode === 'character-cutter' && selectedCutMethod === 'trace') {
            const traceApplied = this._bslApplyTraceSilhouetteGuides(obj, panel, pixels, w, h);
            if (traceApplied) return;
            this._bslSetMlStatus?.(
                panel,
                'Trace Silhouette could not read a clean character outline. Falling back to editable pixel guides.',
                'warning',
                'Pixel Detection'
            );
        }

        const profileExtremeT = (startT, endT, mode = 'max') => {
            const start = Math.max(0, Math.floor(this._clamp01(startT) * (smoothed.length - 1)));
            const end = Math.min(smoothed.length - 1, Math.ceil(this._clamp01(endT) * (smoothed.length - 1)));
            let bestIdx = start;
            let bestVal = smoothed[start] ?? 0;
            for (let i = start; i <= end; i++) {
                const val = smoothed[i] ?? 0;
                if ((mode === 'min' && val < bestVal) || (mode !== 'min' && val > bestVal)) {
                    bestVal = val;
                    bestIdx = i;
                }
            }
            return bestIdx / Math.max(1, smoothed.length - 1);
        };
        const windowExtreme = (centerT, radiusT, mode = 'max') => {
            const startT = Math.max(0, centerT - radiusT);
            const endT = Math.min(1, centerT + radiusT);
            const start = Math.max(0, Math.floor(startT * (smoothed.length - 1)));
            const end = Math.min(smoothed.length - 1, Math.ceil(endT * (smoothed.length - 1)));
            let best = smoothed[start] ?? 0;
            for (let i = start; i <= end; i++) {
                const val = smoothed[i] ?? 0;
                best = mode === 'min' ? Math.min(best, val) : Math.max(best, val);
            }
            return best;
        };

        // ── Row sampling helpers (pixel space) ──
        const sampleRowSpans = (row) => {
            const y = Math.max(0, Math.min(h - 1, Math.round(row)));
            const off = y * w * 4;
            const rowSpans = [];
            let rowInSpan = false;
            let rowStart = 0;
            for (let x = 0; x < w; x++) {
                const opaque = pixels[off + x * 4 + 3] >= 40;
                if (opaque && !rowInSpan) { rowStart = x; rowInSpan = true; }
                if (!opaque && rowInSpan) { rowSpans.push({ s: rowStart, e: x - 1, width: x - rowStart }); rowInSpan = false; }
            }
            if (rowInSpan) rowSpans.push({ s: rowStart, e: w - 1, width: w - rowStart });
            return rowSpans;
        };
        const edgePx = (row) => {
            const y = Math.max(0, Math.min(h - 1, Math.round(row)));
            const off = y * w * 4;
            let left = -1, right = -1;
            for (let x = 0; x < w; x++) {
                if (pixels[off + x * 4 + 3] >= 40) { if (left < 0) left = x; right = x; }
            }
            return left < 0 ? null : { left, right, width: right - left + 1 };
        };
        const tRow = (t) => Math.round(silMinY + this._clamp01(t) * silH);

        // ── Body axis + core column (the central head/neck/torso span, which
        //    EXCLUDES the arms). Width/span detection near the head fails when the
        //    arms are raised or outstretched beside it, so we follow the central
        //    span on the body's vertical axis instead. ──
        const imgRowToT = (row) => this._clamp01((row - silMinY) / silH);
        // The body axis is measured from the torso (a single central mass, reliable
        // even when the head/hair is asymmetric or the arms are raised beside it).
        const axisSamples = [];
        for (let r = tRow(0.30); r <= tRow(0.46); r += Math.max(1, Math.round(0.01 * silH))) {
            const segs = sampleRowSpans(r).filter(sp => sp.width > silW * 0.05);
            if (!segs.length) continue;
            const widest = segs.reduce((m, s) => (s.width > m.width ? s : m), segs[0]);
            axisSamples.push((widest.s + widest.e) * 0.5);
        }
        axisSamples.sort((a, b) => a - b);
        const bodyAxisX = axisSamples.length ? axisSamples[Math.floor(axisSamples.length / 2)] : (silMinX + silMaxX) * 0.5;
        const coreSpanAt = (row) => {
            const segs = sampleRowSpans(row).filter(sp => sp.width > silW * 0.02);
            if (!segs.length) return null;
            let core = segs.find(sp => bodyAxisX >= sp.s && bodyAxisX <= sp.e);
            if (!core) {
                // Nearest span centre to the body axis — never jump onto an arm.
                core = segs.reduce((best, s) =>
                    Math.abs((s.s + s.e) * 0.5 - bodyAxisX) < Math.abs((best.s + best.e) * 0.5 - bodyAxisX) ? s : best, segs[0]);
            }
            return core;
        };
        const coreWidthRow = (row) => { const c = coreSpanAt(row); return c ? c.width : 0; };
        const headTopRow = silMinY + Math.max(1, Math.round(0.03 * silH));

        // ── Neck: the FIRST strong pinch in the core width, scanning down from the
        //    top — narrower than the head above it, with the shoulders/torso flaring
        //    wider just below AND staying wide. This never assumes the head is the
        //    widest part, so it works for small realistic heads (wide shoulders) as
        //    well as big cartoon heads. ──
        const coreArr = [];
        for (let r = silMinY; r <= silMaxY; r++) coreArr.push(coreWidthRow(r));
        const coreSm = this._smoothSmartCutValues(coreArr, Math.max(2, Math.round(silH * 0.012)));
        const coreRow = (r) => coreSm[Math.max(0, Math.min(coreSm.length - 1, r - silMinY))];
        let neckRow0 = -1;
        const nStart = silMinY + Math.round(0.05 * silH);
        const nEnd = silMinY + Math.round(0.45 * silH);
        for (let r = nStart; r <= nEnd; r++) {
            const self = coreRow(r);
            if (self <= 0) continue;
            let headMax = 0;
            for (let a = silMinY; a < r; a++) headMax = Math.max(headMax, coreRow(a));
            let flareMax = 0, flareMin = Infinity;
            const fMid = Math.min(silMaxY, r + Math.round(0.05 * silH));
            const fEnd = Math.min(silMaxY, r + Math.round(0.16 * silH));
            for (let b = r + 1; b <= fEnd; b++) flareMax = Math.max(flareMax, coreRow(b));
            for (let b = fMid; b <= fEnd; b++) flareMin = Math.min(flareMin, coreRow(b));
            if (headMax <= 0 || flareMax <= 0) continue;
            // narrower than the head above, strong widening below (shoulders), and the
            // body stays wide below (torso) — rejects facial narrowings.
            if (self < headMax * 0.90 && flareMax > self * 1.25 && flareMin > self * 1.02) { neckRow0 = r; break; }
        }
        if (neckRow0 < 0) {
            // Fallback: the narrowest core row in the upper body.
            let mn = Infinity;
            for (let r = nStart; r <= nEnd; r++) { const cw = coreRow(r); if (cw > 0 && cw < mn) { mn = cw; neckRow0 = r; } }
            if (neckRow0 < 0) neckRow0 = silMinY + Math.round(0.16 * silH);
        }
        const multiNeckRow = this._bslFindNeckByMultipleStrategies(pixels, w, h, {
            topRatio: Math.max(0, (silMinY + Math.round(0.04 * silH)) / h),
            bottomRatio: Math.min(0.50, (silMinY + Math.round(0.42 * silH)) / h)
        });
        if (multiNeckRow >= nStart && multiNeckRow <= nEnd && Math.abs(multiNeckRow - neckRow0) < silH * 0.16) {
            neckRow0 = Math.round((neckRow0 * 0.62) + (multiNeckRow * 0.38));
        } else if (multiNeckRow > neckRow0 && multiNeckRow <= silMinY + Math.round(0.36 * silH)) {
            neckRow0 = Math.round((neckRow0 + multiNeckRow) * 0.5);
        }
        let neckT = imgRowToT(neckRow0);
        // Lower the neck cut so it clears the jaw and sits closer to the true
        // root of the neck. Character Cutter benefits from a slightly lower cut
        // because the head-neck part needs a usable neck stem for animation.
        neckT = Math.min(0.46, neckT + (this._bslLaunchMode === 'character-cutter' ? 0.04 : 0.02));

        // ── Neck line position (short horizontal at the root of the neck) ──
        const neckRow = tRow(neckT);
        const neckCore = coreSpanAt(neckRow) || { s: silMinX, e: silMaxX };
        const neckCenterX = (neckCore.s + neckCore.e) * 0.5 / w;
        const neckY = neckRow / h;

        // ── Arm band bottom: keep the crotch search below the arms ──
        let armBandBottom = -1;
        const bandTop = neckRow + Math.max(2, Math.round(0.02 * silH));
        const bandBot = tRow(0.74);
        for (let y = bandTop; y <= bandBot; y++) {
            if (sampleRowSpans(y).filter(sp => sp.width > silW * 0.02).length >= 3) armBandBottom = y;
        }

        // ── Axilla: the torso (core) side edges just below the neck, where the arms
        //    attach. Using the core span keeps raised OR outstretched arms from
        //    pushing the armpits up to the head. ──
        const armpitRow = Math.min(tRow(0.46), neckRow + Math.round(0.12 * silH));
        const armCore = coreSpanAt(armpitRow) || neckCore;
        const torsoCenterX = (armCore.s + armCore.e) * 0.5 / w;
        const estimatedTorsoHalf = Math.max(
            0.055,
            Math.min(0.18, Math.max((neckCore.e - neckCore.s) / w * 0.95, silW / w * 0.16))
        );
        // In idle figures with arms beside the torso, a row span has no armpit gap.
        // Use a conservative torso-side estimate instead of the outer silhouette
        // edge, otherwise the arm cut sits on the outside of the arm and never
        // separates the arm from the trunk.
        const gapArmpits = this._bslFindArmpits(pixels, w, h, torsoCenterX, neckY, armpitRow / h);
        // Prefer the true axilla (apex of the arm↔torso gap, torso-side edge). Only
        // fall back to the estimate when no underarm gap exists (arms held flush).
        let leftArmpit = gapArmpits.left
            ? { x: Math.min(torsoCenterX - 0.02, gapArmpits.left.x), y: Math.max(neckY + 0.03, gapArmpits.left.y) }
            : { x: Math.max(0.03, torsoCenterX - estimatedTorsoHalf), y: armpitRow / h };
        let rightArmpit = gapArmpits.right
            ? { x: Math.max(torsoCenterX + 0.02, gapArmpits.right.x), y: Math.max(neckY + 0.03, gapArmpits.right.y) }
            : { x: Math.min(0.97, torsoCenterX + estimatedTorsoHalf), y: armpitRow / h };

        // ── Shoulder tips: extend a near-vertical line up from each axilla to the
        //    top of the shoulder (capped near the neck so it can't run up the arm). ──
        const shoulderTipSide = (armpit, side) => {
            const inward = side === 'left' ? 0.01 : -0.01;
            const cx = Math.max(0, Math.min(w - 1, Math.round((armpit.x + inward) * w)));
            const armR = Math.round(this._clamp01(armpit.y) * (h - 1));
            const topBound = Math.max(silMinY, neckRow - Math.round(0.04 * silH));
            let topY = armR;
            for (let y = armR - 1; y >= topBound; y--) {
                if (pixels[(y * w + cx) * 4 + 3] >= 40) topY = y; else break;
            }
            return { x: armpit.x, y: topY / h };
        };
        const leftShoulderTip = shoulderTipSide(leftArmpit, 'left');
        const rightShoulderTip = shoulderTipSide(rightArmpit, 'right');

        // ── Pose detection: classify the character's arm pose so the armature can
        //    note it and handle movements/animations correctly. ──
        // Measure the angle each arm makes from its axilla to the shoulder tip.
        // A truly horizontal arm (T-pose) gives ~0°; arms at the side (idle) give
        // ~90° (the shoulder tip is ABOVE the axilla, so dy is negative).
        const armAngle = (armpit, shoulderTip) => {
            const dx = (shoulderTip.x - armpit.x) * (silW || 1);   // horizontal component
            const dy = (shoulderTip.y - armpit.y) * (silH || 1);   // vertical (positive = down)
            return Math.atan2(Math.abs(dy), Math.abs(dx)) * (180 / Math.PI);
        };
        const leftAngleDeg  = armAngle(leftArmpit,  leftShoulderTip);
        const rightAngleDeg = armAngle(rightArmpit, rightShoulderTip);
        const avgArmAngle   = (leftAngleDeg + rightAngleDeg) * 0.5;
        // Arms wide and mostly horizontal → T-pose (angle < 30°).
        // Arms raised above shoulder → raised-arms (shoulder tip is above axilla AND
        //   the arm extends laterally by less than its height).
        // Everything else → idle (arms at side or slightly forward).
        let detectedPose = 'idle';
        if (avgArmAngle < 32) {
            detectedPose = 't-pose';
        } else if (leftShoulderTip.y < leftArmpit.y - 0.04 && rightShoulderTip.y < rightArmpit.y - 0.04) {
            detectedPose = 'arms-raised';
        } else if (armBandBottom > 0) {
            // Three-or-more spans persisted down past the armpit → arms outstretched
            // somewhere (not just beside the body)
            detectedPose = 'arms-out';
        }
        // Store for the assembly stage so the armature knows what to apply.
        this._bslDetectedPose = detectedPose;
        console.log(`[Character Cutter] detected pose: ${detectedPose} (avg arm angle ${Math.round(avgArmAngle)}°, left ${Math.round(leftAngleDeg)}°, right ${Math.round(rightAngleDeg)}°)`);

        // ── Crotch: only BELOW the arm band, so the stretched-out arms are never
        //    mistaken for legs. Prefer a real inseam gap straddling the body
        //    centre; otherwise estimate the crotch just below the hips. ──
        const lowerStart = Math.max(tRow(0.44), (armBandBottom > 0 ? armBandBottom : tRow(0.50)) + Math.round(0.015 * silH));
        let crotchRow = -1;
        let crotchXpx = torsoCenterX * w;
        const crotchProbe = this._bslFindCrotch(pixels, w, h, torsoCenterX, lowerStart / h);
        if (crotchProbe?.confidence >= 0.80) {
            crotchRow = Math.round(crotchProbe.y * h);
            crotchXpx = crotchProbe.x * w;
        }
        for (let y = lowerStart; y <= tRow(0.74); y++) {
            if (crotchRow >= 0) break;
            const segs = sampleRowSpans(y).filter(sp => sp.width > silW * 0.05).sort((a, b) => a.s - b.s);
            if (segs.length >= 2) {
                const legs = [...segs].sort((a, b) => b.width - a.width).slice(0, 2).sort((a, b) => a.s - b.s);
                const gap = legs[1].s - legs[0].e;
                const between = (legs[0].e + legs[1].s) * 0.5;
                if (gap > silW * 0.02 && Math.abs(between - torsoCenterX * w) < silW * 0.14) {
                    crotchRow = y;
                    crotchXpx = between;
                    break;
                }
            }
        }
        if (crotchRow < 0) {
            // Legs together or dress/trouser shapes: keep the hip cut in the upper
            // pelvis, not down near the knees/feet.
            let hipRow = tRow(0.56), hipW = -1;
            for (let y = lowerStart; y <= tRow(0.66); y++) {
                const e = edgePx(y);
                if (e && e.width > hipW) { hipW = e.width; hipRow = y; }
            }
            crotchRow = Math.min(tRow(0.66), hipRow + Math.round(0.025 * silH));
            const ce = edgePx(crotchRow);
            crotchXpx = ce ? (ce.left + ce.right) * 0.5 : torsoCenterX * w;
        }
        const crotchY = crotchRow / h;
        const crotchX = crotchXpx / w;
        const splitEndY = Math.min(0.96, crotchY + Math.max(0.14, (silMaxY / h - crotchY) * 0.6));

        // ── Waist line: lifted clearly ABOVE the crotch (separates torso/legs) ──
        // The hip line must sit above the crotch, not on it. Keep a firm minimum
        // gap even when the arms hang low (the arm-band clamp can otherwise drag
        // it back down onto the crotch line).
        let waistY = crotchY - Math.min(0.12, Math.max(0.06, (crotchY - leftShoulderTip.y) * 0.16));
        if (armBandBottom > 0) waistY = Math.max(waistY, armBandBottom / h + 0.01);
        waistY = Math.min(waistY, crotchY - 0.05);
        const waistRow = Math.round(this._clamp01(waistY) * (h - 1));
        // Use the CENTRAL (pelvis) span at the waist row, not the full silhouette
        // width — otherwise the hip line stretches out to the side-hanging arms and
        // cuts through them. coreSpanAt returns the span containing the body axis.
        const wCore = coreSpanAt(waistRow);
        const wEdge = wCore
            ? { left: wCore.s, right: wCore.e }
            : (edgePx(waistRow) || edgePx(crotchRow) || { left: silMinX, right: silMaxX });
        let hipLeftX = wEdge.left / w;
        let hipRightX = wEdge.right / w;
        const crotchHalfGuard = Math.max(0.055, Math.min(0.18, estimatedTorsoHalf * 0.72));
        if (hipLeftX > crotchX - crotchHalfGuard || hipRightX < crotchX + crotchHalfGuard || hipRightX - hipLeftX < 0.14) {
            hipLeftX = Math.max(0.04, Math.min(hipLeftX, crotchX - crotchHalfGuard));
            hipRightX = Math.min(0.96, Math.max(hipRightX, crotchX + crotchHalfGuard));
        }

        // ── Build cut curves ──
        // Each cut line begins and ends in the TRANSPARENT space just outside the
        // body pixels so it fully severs the part (the extra outer points are also
        // editable handles). The only exception is the axilla end of the arm cut,
        // which stays on the body because there is often no transparent gap there.
        const roundNorm = (value) => Math.round(this._clamp01(value) * 1000) / 1000;
        this._bslCurves = this._bslGetDefaultCurves();
        // Neck: a wide V that has its root at the lower neck and exits upward
        // into transparent space beside the face. This prevents shoulder/upper
        // torso pixels from being pulled into the head-neck part.
        this._bslCurves.neck.points = this._bslBuildNeckVCutPoints(
            { x: neckCenterX, y: neckY },
            {
                leftShoulder: leftShoulderTip,
                rightShoulder: rightShoulderTip,
                leftArmpit,
                rightArmpit
            },
            { pixels, w, h }
        );
        // Shoulder/side cut: from a point in the transparency ABOVE the shoulder
        // tip, down through the shoulder to the axilla, and then CONTINUING down to
        // the first transparent pixel below the axilla (capped at the hip line).
        // This is what lets a flush arm — one with no gap at the armpit — fully
        // detach from the torso instead of staying fused to it.
        const axillaExtendY = (armpit) => {
            const colX = Math.max(0, Math.min(w - 1, Math.round(this._clamp01(armpit.x) * w)));
            const startRow = Math.round(this._clamp01(armpit.y) * (h - 1)) + 2;
            const capNorm = Math.min(waistY - 0.005, armpit.y + 0.22);
            const capRow = Math.round(this._clamp01(capNorm) * (h - 1));
            for (let yy = startRow; yy <= capRow; yy++) {
                if (pixels[(yy * w + colX) * 4 + 3] < 40) return this._clamp01((yy + 1) / h);
            }
            return this._clamp01(capNorm);
        };
        const leftAxillaEndY = Math.max(leftArmpit.y + 0.02, axillaExtendY(leftArmpit));
        const rightAxillaEndY = Math.max(rightArmpit.y + 0.02, axillaExtendY(rightArmpit));
        this._bslCurves.leftArm.points = [
            { x: roundNorm(leftShoulderTip.x), y: roundNorm(Math.max(0.01, leftShoulderTip.y - 0.045)) },
            { x: roundNorm(leftShoulderTip.x), y: roundNorm(leftShoulderTip.y) },
            { x: roundNorm(leftArmpit.x), y: roundNorm(leftArmpit.y) },
            { x: roundNorm(leftArmpit.x), y: roundNorm(leftAxillaEndY) }
        ];
        this._bslCurves.rightArm.points = [
            { x: roundNorm(rightShoulderTip.x), y: roundNorm(Math.max(0.01, rightShoulderTip.y - 0.045)) },
            { x: roundNorm(rightShoulderTip.x), y: roundNorm(rightShoulderTip.y) },
            { x: roundNorm(rightArmpit.x), y: roundNorm(rightArmpit.y) },
            { x: roundNorm(rightArmpit.x), y: roundNorm(rightAxillaEndY) }
        ];
        // Waist/hip cut: a horizontal line lifted just above the crotch. It starts
        // in the transparency before the left hip edge and ends in the transparency
        // just past the right hip edge, so the torso fully detaches from the legs.
        const hipL = Math.max(0.04, hipLeftX);
        const hipR = Math.min(0.96, hipRightX);
        this._bslCurves.crotch.points = [
            { x: roundNorm(hipL - 0.03), y: roundNorm(waistY) },
            { x: roundNorm(hipL), y: roundNorm(waistY) },
            { x: roundNorm(crotchX), y: roundNorm(waistY) },
            { x: roundNorm(hipR), y: roundNorm(waistY) },
            { x: roundNorm(hipR + 0.03), y: roundNorm(waistY) }
        ];
        // Leg split: a vertical line dropping from the waist/hip line down between
        // the legs, extending a little past the crotch pixel into the transparent
        // gap so the two legs fully separate.
        this._bslCurves.legSplit.points = [
            { x: roundNorm(crotchX), y: roundNorm(waistY) },
            { x: roundNorm(crotchX), y: roundNorm(splitEndY) },
            { x: roundNorm(crotchX), y: roundNorm(Math.min(0.99, splitEndY + 0.03)) }
        ];
        this._bslNormalizeCurves();
        if (this._bslUsesPoseArmatureCutAssembly()) {
            this._bslRefreshLandmarksFromCurves();
        } else if (!this._bslApplyBestTrainingMatch(panel)) {
            this._bslRefreshLandmarksFromCurves();
        }
        this._bslGuideConfidence = this._bslBuildGuideConfidence(this._bslLandmarks);
        this._bslSyncCurveButtons(panel);
        this._bslUpdateLegend(panel);
    },

    _bslBuildGuideConfidence(landmarks) {
        if (!this._bslUsesCharacterAnchors() || !landmarks) return null;
        if (this._bslViewMode === 'side') {
            const neckY = Number(landmarks.neck?.y);
            const waistY = Number(landmarks.waist?.y);
            const shoulderY = Number(landmarks.shoulder?.y);
            const ok = Number.isFinite(neckY) && Number.isFinite(waistY) && waistY > neckY + 0.18;
            return {
                method: this._bslLastGuideMethod || 'manual',
                score: ok ? 0.8 : 0.45,
                checks: [
                    { label: 'Neck', ok: Number.isFinite(neckY) && neckY > 0.04 && neckY < 0.45 },
                    { label: 'Shoulder', ok: Number.isFinite(shoulderY) && shoulderY > neckY && shoulderY < waistY },
                    { label: 'Waist', ok: Number.isFinite(waistY) && waistY > 0.28 && waistY < 0.82 }
                ],
                warnings: ok ? [] : ['review side-view guide spacing']
            };
        }

        const neck = landmarks.neck || {};
        const leftShoulder = landmarks.leftShoulder || {};
        const rightShoulder = landmarks.rightShoulder || {};
        const leftArmpit = landmarks.leftArmpit || {};
        const rightArmpit = landmarks.rightArmpit || {};
        const leftHip = landmarks.leftHip || {};
        const rightHip = landmarks.rightHip || {};
        const crotch = landmarks.crotch || landmarks.legSplit || {};
        const legSplit = landmarks.legSplit || {};
        const waistY = (Number(leftHip.y) + Number(rightHip.y)) * 0.5;
        const crotchX = Number(crotch.x);
        const checks = [
            { label: 'Neck', ok: Number.isFinite(neck.y) && neck.y > 0.06 && neck.y < 0.44 },
            {
                label: 'Axilla',
                ok: Number.isFinite(leftArmpit.y) && Number.isFinite(rightArmpit.y)
                    && leftArmpit.y > neck.y + 0.035
                    && rightArmpit.y > neck.y + 0.035
                    && Math.max(leftArmpit.y, rightArmpit.y) < waistY - 0.07
                    && Math.abs(leftShoulder.x - leftArmpit.x) < 0.14
                    && Math.abs(rightShoulder.x - rightArmpit.x) < 0.14
            },
            {
                label: 'Hip',
                ok: Number.isFinite(waistY) && Number.isFinite(crotchX)
                    && waistY > Math.max(leftArmpit.y || 0, rightArmpit.y || 0) + 0.09
                    && waistY < (legSplit.y || 1) - 0.06
                    && leftHip.x < crotchX - 0.035
                    && rightHip.x > crotchX + 0.035
            },
            { label: 'Leg split', ok: Number.isFinite(legSplit.y) && legSplit.y > waistY + 0.07 && legSplit.y < 0.99 }
        ];
        const passed = checks.filter(check => check.ok).length;
        const warnings = Array.isArray(landmarks._meta?.warnings) ? [...landmarks._meta.warnings] : [];
        checks.forEach(check => {
            if (!check.ok) warnings.push(`${check.label.toLowerCase()} guide needs review`);
        });
        return {
            method: landmarks._meta?.method || this._bslLastGuideMethod || 'manual',
            score: Math.min(Number(landmarks._meta?.confidence || 1), passed / Math.max(1, checks.length)),
            checks,
            warnings: [...new Set(warnings)]
        };
    },

    _bslUpdateLegend(panel) {
        const legend = panel?.querySelector('#bsl-legend');
        const status = panel?.querySelector('#bsl-training-status');
        if (!legend || !status) return;

        const curve = this._bslCurves?.[this._bslSelectedCurve];
        const neckMid = this._bslEvalCurveAtX('neck', 0.5);
        const pct = (value) => `${Math.round(value * 100)}%`;

        let statsLine;
        if (this._bslViewMode === 'side') {
            const waistMid = this._bslEvalCurveAtX('waist', 0.5);
            const armMid = this._bslEvalCurveAtY('armBound', 0.35);
            statsLine = `Neck ${pct(neckMid)} &nbsp; Waist ${pct(waistMid)} &nbsp; Arm boundary ${pct(armMid)}`;
        } else {
            const crotchMid = this._bslEvalCurveAtX('crotch', 0.5);
            const leftMid = this._bslEvalCurveAtY('leftArm', 0.55);
            const rightMid = this._bslEvalCurveAtY('rightArm', 0.55);
            const splitMid = this._bslEvalCurveAtY('legSplit', Math.max(crotchMid + 0.08, 0.62));
            statsLine = `Neck ${pct(neckMid)} &nbsp; Torso/leg split ${pct(crotchMid)} &nbsp; Left cut ${pct(leftMid)} &nbsp; Right cut ${pct(rightMid)} &nbsp; Leg split ${pct(splitMid)}`;
        }

        const confidence = this._bslGuideConfidence || this._bslBuildGuideConfidence(this._bslLandmarks);
        const confidenceLine = confidence ? (() => {
            const methodLabel = {
                'trace-silhouette': 'Trace',
                'pixel-profile': 'Pixel',
                'ml-pose': 'ML',
                manual: 'Manual'
            }[confidence.method] || confidence.method || 'Guide';
            const badge = (check) => {
                const ok = !!check.ok;
                const color = ok ? '#86efac' : '#fde68a';
                const bg = ok ? 'rgba(22,163,74,0.16)' : 'rgba(245,158,11,0.16)';
                return `<span style="display:inline-flex;align-items:center;gap:3px;padding:1px 5px;border-radius:999px;background:${bg};color:${color};border:1px solid ${ok ? 'rgba(134,239,172,0.35)' : 'rgba(253,230,138,0.35)'};">${check.label}: ${ok ? 'good' : 'check'}</span>`;
            };
            const score = Number.isFinite(confidence.score) ? ` ${Math.round(confidence.score * 100)}%` : '';
            const notes = confidence.warnings?.length ? ` · ${confidence.warnings.slice(0, 2).join('; ')}` : '';
            return `<div style="font-size:10px;color:#cbd5e1;margin-top:4px;display:flex;flex-wrap:wrap;gap:4px;align-items:center;"><b>${methodLabel}${score}</b>${confidence.checks.map(badge).join('')}</div>${notes ? `<div style="font-size:10px;color:#fbbf24;margin-top:2px;">${notes}</div>` : ''}`;
        })() : '';

        legend.innerHTML = `
            <div><span style="color:${curve?.color || '#fff'};">&#9644;</span> Selected: <b>${curve?.name || 'Cut'}</b></div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">${statsLine}</div>
            <div style="font-size:10px;color:#94a3b8;margin-top:2px;">Drag points to edit. Use <b>Add Point</b>, <b>Alt-click</b>, or <b>double-click</b> a line to add detail. Select/right-click a point or press <b>Delete</b> to remove it.</div>
            ${confidenceLine}
        `;
        this._bslUpdatePointToolState(panel);

        const trainingCount = this._getBodySlicerTrainingSamples().length;
        const toolName = this._bslLaunchMode === 'character-cutter' ? 'Character Cutter' : 'Body Slicer';
        if (!trainingCount) {
            status.textContent = `No learned ${toolName} layouts yet. Adjust the cuts, create successfully, and the current layout can be saved for similar silhouettes.`;
            return;
        }
        const matchCopy = this._bslTrainingApplied
            ? `Closest learned layout applied${Number.isFinite(this._bslTrainingScore) ? ` (score ${this._bslTrainingScore.toFixed(2)})` : ''}.`
            : 'No close learned layout was applied to this image.';
        status.textContent = `${trainingCount} learned layout${trainingCount === 1 ? '' : 's'} available. ${matchCopy}`;
    },

    _bslRenderOverlay(ctx) {
        if (!this._bslActive || !this._bslObj || !this._bslCurves) return;
        if (this._bslLaunchMode === 'character-cutter' && !this._bslHasDetectedGuides) return;

        const obj = this._bslObj;
        const zoom = Math.max(0.001, this.stage.zoom);
        const ox = obj.x;
        const oy = obj.y;
        const ow = obj.width;
        const oh = obj.height;
        const toStage = (point) => ({ x: ox + point.x * ow, y: oy + point.y * oh });

        const labelPills = this._bslViewMode === 'side' ? [
            { label: 'Head', x: 0.5, y: Math.max(0.06, this._bslEvalCurveAtX('neck', 0.5) * 0.45), color: '#f59e0b' },
            { label: 'Torso', x: 0.28, y: (this._bslEvalCurveAtX('neck', 0.5) + this._bslEvalCurveAtX('waist', 0.5)) * 0.5, color: '#8b5cf6' },
            { label: 'Front Arm', x: Math.min(0.85, this._bslEvalCurveAtY('armBound', 0.35) + 0.12), y: 0.32, color: '#3b82f6' },
            { label: 'Front Leg', x: 0.5, y: Math.min(0.92, this._bslEvalCurveAtX('waist', 0.5) + 0.20), color: '#10b981' }
        ] : [
            { label: 'Head', x: 0.5, y: Math.max(0.06, this._bslEvalCurveAtX('neck', 0.5) * 0.45), color: '#f59e0b' },
            { label: 'Torso', x: 0.5, y: (this._bslEvalCurveAtX('neck', 0.5) + this._bslEvalCurveAtX('crotch', 0.5)) * 0.5, color: '#8b5cf6' },
            { label: 'R Arm', x: this._bslEvalCurveAtY('leftArm', 0.48) * 0.45, y: 0.42, color: '#3b82f6' },
            { label: 'L Arm', x: this._bslEvalCurveAtY('rightArm', 0.48) + (1 - this._bslEvalCurveAtY('rightArm', 0.48)) * 0.55, y: 0.42, color: '#ec4899' },
            { label: 'R Leg', x: this._bslEvalCurveAtY('legSplit', 0.80) * 0.55, y: 0.80, color: '#06b6d4' },
            { label: 'L Leg', x: this._bslEvalCurveAtY('legSplit', 0.80) + (1 - this._bslEvalCurveAtY('legSplit', 0.80)) * 0.45, y: 0.80, color: '#10b981' }
        ];

        ctx.save();
        Object.entries(this._bslCurves).forEach(([key, curve]) => {
            const sampled = this._bslSampleCurve(key, curve.orientation === 'horizontal' ? 30 : 24).map(toStage);
            if (sampled.length < 2) return;
            ctx.beginPath();
            sampled.forEach((point, index) => {
                if (index === 0) ctx.moveTo(point.x, point.y);
                else ctx.lineTo(point.x, point.y);
            });
            ctx.strokeStyle = curve.color;
            ctx.lineWidth = (key === this._bslSelectedCurve ? 2.4 : 1.6) / zoom;
            ctx.setLineDash(key === this._bslSelectedCurve ? [] : [5 / zoom, 3 / zoom]);
            ctx.globalAlpha = key === this._bslSelectedCurve ? 0.95 : 0.78;
            ctx.stroke();
        });
        ctx.setLineDash([]);
        ctx.globalAlpha = 1;

        labelPills.forEach(pill => {
            const x = ox + pill.x * ow;
            const y = oy + pill.y * oh;
            ctx.font = `bold ${10 / zoom}px sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const tw = ctx.measureText(pill.label).width;
            const pillW = tw + 8 / zoom;
            const pillH = 13 / zoom;
            ctx.fillStyle = `${pill.color}cc`;
            ctx.beginPath();
            if (ctx.roundRect) ctx.roundRect(x - pillW / 2, y - pillH / 2, pillW, pillH, 3 / zoom);
            else ctx.rect(x - pillW / 2, y - pillH / 2, pillW, pillH);
            ctx.fill();
            ctx.fillStyle = '#fff';
            ctx.fillText(pill.label, x, y);
        });

        if (this._bslShouldShowLandmarks()) {
            const landmarkHandles = this._bslGetLandmarkHandles();
            const link = (a, b, color) => {
                const pa = landmarkHandles.find(h => h.key === a);
                const pb = landmarkHandles.find(h => h.key === b);
                if (!pa || !pb) return;
                ctx.beginPath();
                ctx.moveTo(pa.x, pa.y);
                ctx.lineTo(pb.x, pb.y);
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.1 / zoom;
                ctx.setLineDash([3 / zoom, 3 / zoom]);
                ctx.globalAlpha = 0.72;
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.globalAlpha = 1;
            };
            if (this._bslViewMode === 'side') {
                link('neck', 'shoulder', '#f59e0b');
                link('shoulder', 'elbowGuide', '#38bdf8');
                link('neck', 'waist', '#8b5cf6');
            } else {
                link('leftShoulder', 'neck', '#f59e0b');
                link('neck', 'rightShoulder', '#f59e0b');
                link('leftShoulder', 'leftArmpit', '#60a5fa');
                link('rightShoulder', 'rightArmpit', '#f472b6');
                link('leftHip', 'crotch', '#22c55e');
                link('crotch', 'rightHip', '#22c55e');
                link('crotch', 'legSplit', '#10b981');
            }
            landmarkHandles.forEach(handle => {
                const hovered = this._bslHoverLandmark === handle.key;
                const dragging = this._bslDraggingLandmark === handle.key;
                const radius = (hovered || dragging ? 7.2 : 5.8) / zoom;
                ctx.beginPath();
                ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = hovered || dragging ? '#ffffff' : handle.color;
                ctx.fill();
                ctx.strokeStyle = '#111827';
                ctx.lineWidth = 1.5 / zoom;
                ctx.stroke();
                ctx.strokeStyle = handle.color;
                ctx.lineWidth = 1 / zoom;
                ctx.beginPath();
                ctx.arc(handle.x, handle.y, radius + 2 / zoom, 0, Math.PI * 2);
                ctx.stroke();

                ctx.font = `600 ${9 / zoom}px sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const labelY = handle.y - (13 / zoom);
                const tw = ctx.measureText(handle.label).width + 7 / zoom;
                ctx.fillStyle = 'rgba(17,24,39,0.82)';
                ctx.beginPath();
                if (ctx.roundRect) ctx.roundRect(handle.x - tw / 2, labelY - 6 / zoom, tw, 12 / zoom, 3 / zoom);
                else ctx.rect(handle.x - tw / 2, labelY - 6 / zoom, tw, 12 / zoom);
                ctx.fill();
                ctx.fillStyle = '#e5e7eb';
                ctx.fillText(handle.label, handle.x, labelY);
            });
        }

        this._bslGetHandles().forEach(handle => {
            const hovered = this._bslHoverPoint &&
                this._bslHoverPoint.curveKey === handle.curveKey &&
                this._bslHoverPoint.pointIndex === handle.pointIndex;
            const dragging = this._bslDraggingPoint &&
                this._bslDraggingPoint.curveKey === handle.curveKey &&
                this._bslDraggingPoint.pointIndex === handle.pointIndex;
            const selected = this._bslSelectedPoint &&
                this._bslSelectedPoint.curveKey === handle.curveKey &&
                this._bslSelectedPoint.pointIndex === handle.pointIndex;
            const radius = (hovered || dragging || selected || handle.curveKey === this._bslSelectedCurve ? 5.8 : 4.6) / zoom;
            ctx.beginPath();
            ctx.arc(handle.x, handle.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = hovered || dragging || selected ? '#fff' : handle.color;
            ctx.fill();
            ctx.strokeStyle = selected ? handle.color : '#fff';
            ctx.lineWidth = (selected ? 2 : 1.2) / zoom;
            ctx.stroke();
        });
        if ((this._bslAddPointMode || this._bslHoverSegment) && this._bslHoverSegment) {
            ctx.beginPath();
            ctx.arc(this._bslHoverSegment.x, this._bslHoverSegment.y, 6.5 / zoom, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255,255,255,0.92)';
            ctx.fill();
            ctx.strokeStyle = this._bslCurves?.[this._bslHoverSegment.curveKey]?.color || '#60a5fa';
            ctx.lineWidth = 2 / zoom;
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(this._bslHoverSegment.x - 3.5 / zoom, this._bslHoverSegment.y);
            ctx.lineTo(this._bslHoverSegment.x + 3.5 / zoom, this._bslHoverSegment.y);
            ctx.moveTo(this._bslHoverSegment.x, this._bslHoverSegment.y - 3.5 / zoom);
            ctx.lineTo(this._bslHoverSegment.x, this._bslHoverSegment.y + 3.5 / zoom);
            ctx.stroke();
        }
        ctx.restore();
    },

    _bslGetLandmarkHandles() {
        const obj = this._bslObj;
        if (!obj || !this._bslLandmarks || !this._bslShouldShowLandmarks()) return [];
        const ox = obj.x;
        const oy = obj.y;
        const ow = obj.width;
        const oh = obj.height;
        return Object.entries(this._bslLandmarks)
            .filter(([, lm]) => Number.isFinite(lm?.x) && Number.isFinite(lm?.y))
            .map(([key, lm]) => ({
            key,
            label: lm.label || key,
            help: lm.help || '',
            color: lm.color || '#a78bfa',
            x: ox + this._clamp01(lm.x) * ow,
            y: oy + this._clamp01(lm.y) * oh
        }));
    },

    _bslGetHandles() {
        const obj = this._bslObj;
        if (!obj || !this._bslCurves) return [];
        const ox = obj.x;
        const oy = obj.y;
        const ow = obj.width;
        const oh = obj.height;
        const handles = [];
        Object.entries(this._bslCurves).forEach(([curveKey, curve]) => {
            curve.points.forEach((point, pointIndex) => {
                handles.push({
                    curveKey,
                    pointIndex,
                    x: ox + point.x * ow,
                    y: oy + point.y * oh,
                    color: curve.color
                });
            });
        });
        return handles;
    },

    _bslScreenToStage(e) {
        return this.stage.screenToStage(e.clientX, e.clientY);
    },

    _bslHandleMouseDown(e) {
        if (!this._bslActive || e.button !== 0) return;
        if (this._bslLaunchMode === 'character-cutter' && !this._bslHasDetectedGuides) return;
        if (e.target.closest('#body-slicer-panel')) return;

        const pos = this._bslScreenToStage(e);
        const panel = document.getElementById('body-slicer-panel');
        if (this._bslAddPointMode || e.altKey) {
            if (this._bslAddPointAtStage(pos, this._bslSelectedCurve, panel)) {
                this._bslAddPointMode = false;
                this._bslUpdatePointToolState(panel);
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }
        const handles = this._bslGetHandles();
        const landmarkHandles = this._bslGetLandmarkHandles();
        const zoom = Math.max(0.001, this.stage.zoom);
        const threshold = 11 / zoom;

        for (const handle of landmarkHandles) {
            if (Math.hypot(pos.x - handle.x, pos.y - handle.y) < threshold) {
                this._bslDraggingLandmark = handle.key;
                this._bslHoverLandmark = handle.key;
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }

        for (const handle of handles) {
            if (Math.hypot(pos.x - handle.x, pos.y - handle.y) < threshold) {
                this._bslSelectedCurve = handle.curveKey;
                this._bslSelectedPoint = { curveKey: handle.curveKey, pointIndex: handle.pointIndex };
                this._bslSyncCurveButtons(panel);
                this._bslUpdatePointToolState(panel);
                if (e.shiftKey) {
                    this._bslDraggingCurve = {
                        curveKey: handle.curveKey,
                        startNormX: this._clamp01((pos.x - this._bslObj.x) / Math.max(1, this._bslObj.width)),
                        startNormY: this._clamp01((pos.y - this._bslObj.y) / Math.max(1, this._bslObj.height)),
                        original: this._bslCloneCurves()[handle.curveKey].points
                    };
                } else {
                    this._bslDraggingPoint = { curveKey: handle.curveKey, pointIndex: handle.pointIndex };
                }
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }
    },

    _bslHandleMouseMove(e) {
        if (!this._bslActive || !this._bslObj) return;
        const pos = this._bslScreenToStage(e);
        const normX = this._clamp01((pos.x - this._bslObj.x) / Math.max(1, this._bslObj.width));
        const normY = this._clamp01((pos.y - this._bslObj.y) / Math.max(1, this._bslObj.height));
        const panel = document.getElementById('body-slicer-panel');

        if (this._bslDraggingLandmark) {
            const lm = this._bslLandmarks?.[this._bslDraggingLandmark];
            if (!lm) return;
            lm.x = normX;
            lm.y = normY;
            this._bslApplyCurvesFromLandmarks(panel);
            this.stage.requestRender();
            e.preventDefault();
            return;
        }

        if (this._bslDraggingCurve) {
            const curve = this._bslCurves?.[this._bslDraggingCurve.curveKey];
            if (!curve?.points) return;
            const dx = normX - this._bslDraggingCurve.startNormX;
            const dy = normY - this._bslDraggingCurve.startNormY;
            curve.points = this._bslDraggingCurve.original.map(point => ({ x: point.x + dx, y: point.y + dy }));
            this._bslNormalizeCurves();
            this._bslUpdateLegend(panel);
            this.stage.requestRender();
            e.preventDefault();
            return;
        }

        if (this._bslDraggingPoint) {
            const curve = this._bslCurves?.[this._bslDraggingPoint.curveKey];
            const point = curve?.points?.[this._bslDraggingPoint.pointIndex];
            if (!point) return;
            point.x = normX;
            point.y = normY;
            this._bslNormalizeCurves();
            const pointIndex = this._bslFindPointIndex(this._bslDraggingPoint.curveKey, { x: normX, y: normY });
            this._bslDraggingPoint.pointIndex = pointIndex;
            this._bslSelectedPoint = { curveKey: this._bslDraggingPoint.curveKey, pointIndex };
            this._bslRefreshLandmarksFromCurves();
            this._bslGuideConfidence = this._bslBuildGuideConfidence(this._bslLandmarks);
            this._bslUpdateLegend(panel);
            this.stage.requestRender();
            e.preventDefault();
            return;
        }

        const handles = this._bslGetHandles();
        const landmarkHandles = this._bslGetLandmarkHandles();
        const zoom = Math.max(0.001, this.stage.zoom);
        const threshold = 11 / zoom;
        let landmarkHover = null;
        for (const handle of landmarkHandles) {
            if (Math.hypot(pos.x - handle.x, pos.y - handle.y) < threshold) {
                landmarkHover = handle.key;
                break;
            }
        }
        if (landmarkHover || this._bslHoverLandmark) {
            const changedLandmark = landmarkHover !== this._bslHoverLandmark;
            this._bslHoverLandmark = landmarkHover;
            if (changedLandmark) {
                this._bslHoverPoint = null;
                this._bslHoverSegment = null;
                this.stage.viewport.style.cursor = landmarkHover ? 'grab' : '';
                this.stage.requestRender();
            }
            if (landmarkHover) return;
        }
        let hover = null;
        for (const handle of handles) {
            if (Math.hypot(pos.x - handle.x, pos.y - handle.y) < threshold) {
                hover = { curveKey: handle.curveKey, pointIndex: handle.pointIndex };
                break;
            }
        }
        const changed = (!hover && this._bslHoverPoint) ||
            (hover && (!this._bslHoverPoint ||
                hover.curveKey !== this._bslHoverPoint.curveKey ||
                hover.pointIndex !== this._bslHoverPoint.pointIndex));
        if (changed) {
            this._bslHoverPoint = hover;
            this._bslUpdatePointToolState(panel);
            this.stage.viewport.style.cursor = hover ? 'grab' : '';
            this.stage.requestRender();
        }
        if (!hover) {
            const nearest = this._bslGetNearestCurveSegment(pos, this._bslSelectedCurve);
            const segmentHover = nearest && nearest.distance < 14 / zoom ? nearest : null;
            const segmentChanged = (!segmentHover && this._bslHoverSegment) ||
                (segmentHover && (!this._bslHoverSegment ||
                    segmentHover.curveKey !== this._bslHoverSegment.curveKey ||
                    segmentHover.afterIndex !== this._bslHoverSegment.afterIndex ||
                    Math.abs(segmentHover.x - this._bslHoverSegment.x) > 1 / zoom ||
                    Math.abs(segmentHover.y - this._bslHoverSegment.y) > 1 / zoom));
            if (segmentChanged) {
                this._bslHoverSegment = segmentHover;
                this.stage.viewport.style.cursor = segmentHover && (this._bslAddPointMode || e.altKey) ? 'crosshair' : '';
                this.stage.requestRender();
            } else if (!segmentHover && !hover && !landmarkHover && this.stage.viewport.style.cursor && !this._bslAddPointMode) {
                this.stage.viewport.style.cursor = '';
            }
        }
    },

    _bslHandleMouseUp(e) {
        if (this._bslDraggingPoint || this._bslDraggingCurve || this._bslDraggingLandmark) {
            this._bslDraggingPoint = null;
            this._bslDraggingCurve = null;
            this._bslDraggingLandmark = null;
            this._bslUpdatePointToolState(document.getElementById('body-slicer-panel'));
            this.stage.requestRender();
        }
    },

    _bslHandleDoubleClick(e) {
        if (!this._bslActive || e.target.closest('#body-slicer-panel')) return;
        if (this._bslLaunchMode === 'character-cutter' && !this._bslHasDetectedGuides) return;
        const panel = document.getElementById('body-slicer-panel');
        if (this._bslAddPointAtStage(this._bslScreenToStage(e), this._bslSelectedCurve, panel)) {
            e.preventDefault();
            e.stopPropagation();
        }
    },

    _bslHandleContextMenu(e) {
        if (!this._bslActive || e.target.closest('#body-slicer-panel')) return;
        if (this._bslLaunchMode === 'character-cutter' && !this._bslHasDetectedGuides) return;
        const pos = this._bslScreenToStage(e);
        const zoom = Math.max(0.001, this.stage.zoom);
        const threshold = 12 / zoom;
        for (const handle of this._bslGetHandles()) {
            if (Math.hypot(pos.x - handle.x, pos.y - handle.y) < threshold) {
                this._bslSelectedCurve = handle.curveKey;
                this._bslSelectedPoint = { curveKey: handle.curveKey, pointIndex: handle.pointIndex };
                this._bslHoverPoint = this._bslSelectedPoint;
                this._bslDeleteSelectedPoint(document.getElementById('body-slicer-panel'));
                e.preventDefault();
                e.stopPropagation();
                return;
            }
        }
    },

    _bslBuildTraceSilhouetteMask(srcImage, cw, ch) {
        if (!srcImage?.data || !cw || !ch) return null;
        const hasAITrace = typeof AITrace !== 'undefined';
        const tracer = (hasAITrace && this.objects?._aiTrace instanceof AITrace)
            ? this.objects._aiTrace
            : (hasAITrace ? new AITrace(this.objects) : null);

        let mask = null;
        let largestComponent = null;
        if (tracer?._buildAlphaMask) {
            try {
                mask = tracer._buildAlphaMask(srcImage, cw, ch, 10);
                const largest = tracer._extractLargestMask?.(mask, cw, ch, Math.max(24, Math.round(cw * ch * 0.001)));
                if (largest?.mask) {
                    largestComponent = largest;
                    let totalMaskPixels = 0;
                    for (let i = 0; i < mask.length; i++) {
                        if (mask[i]) totalMaskPixels++;
                    }
                    const largestArea = Number(largest.area || 0);
                    // Character Cutter must keep separated hands, feet, and clothing
                    // islands. Only reduce to the largest component when it clearly
                    // represents almost the entire visible subject.
                    if (totalMaskPixels > 0 && largestArea / totalMaskPixels >= 0.92) {
                        mask = largest.mask;
                    }
                }
            } catch (error) {
                console.warn('[Character Cutter] Auto Trace silhouette mask failed; using alpha fallback.', error);
                mask = null;
            }
        }

        if (!mask) {
            mask = new Uint8Array(cw * ch);
            const src = srcImage.data;
            for (let i = 0; i < mask.length; i++) {
                if (src[i * 4 + 3] > 10) mask[i] = 1;
            }
        }

        let minX = cw, minY = ch, maxX = -1, maxY = -1, count = 0;
        for (let y = 0; y < ch; y++) {
            const row = y * cw;
            for (let x = 0; x < cw; x++) {
                if (!mask[row + x]) continue;
                count++;
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
        if (maxX <= minX || maxY <= minY || count < 64) return null;

        const componentInfo = this._bslMeasureMaskComponents(mask, cw, ch, Math.max(18, Math.round(cw * ch * 0.0006)));
        const largestMask = largestComponent?.mask || componentInfo?.largestMask || mask;
        let outline = null;
        if (tracer?._traceMaskToPath) {
            try {
                outline = tracer._traceMaskToPath(largestMask, cw, ch, {
                    detail: 1,
                    sensitivity: 72,
                    smooth: true
                });
            } catch (error) {
                console.warn('[Character Cutter] Completed trace contour failed; using mask spans.', error);
            }
        }
        const assessment = this._bslAssessCharacterSilhouette({
            count,
            minX,
            minY,
            maxX,
            maxY,
            components: componentInfo?.components || 1,
            largestArea: componentInfo?.largestArea || largestComponent?.area || count,
            outline
        }, cw, ch);

        return { mask, guideMask: largestMask, outline, assessment, minX, minY, maxX, maxY, count };
    },

    _bslMeasureMaskComponents(mask, width, height, minSize = 1) {
        if (!mask || !width || !height) return null;
        const total = width * height;
        const visited = new Uint8Array(total);
        const stack = new Int32Array(total);
        let components = 0;
        let largestArea = 0;
        let largestIndices = null;
        for (let i = 0; i < total; i++) {
            if (visited[i] || !mask[i]) continue;
            let top = 0;
            let area = 0;
            const indices = [];
            visited[i] = 1;
            stack[top++] = i;
            while (top) {
                const idx = stack[--top];
                const x = idx % width;
                const y = (idx - x) / width;
                area++;
                indices.push(idx);
                const visit = (n) => {
                    if (n < 0 || n >= total || visited[n] || !mask[n]) return;
                    visited[n] = 1;
                    stack[top++] = n;
                };
                if (x > 0) visit(idx - 1);
                if (x < width - 1) visit(idx + 1);
                if (y > 0) visit(idx - width);
                if (y < height - 1) visit(idx + width);
            }
            if (area >= minSize) components++;
            if (area > largestArea) {
                largestArea = area;
                largestIndices = indices;
            }
        }
        let largestMask = null;
        if (largestIndices?.length) {
            largestMask = new Uint8Array(total);
            largestIndices.forEach(idx => { largestMask[idx] = 1; });
        }
        return { components, largestArea, largestMask };
    },

    _bslAssessCharacterSilhouette(info, width, height) {
        const warnings = [];
        const total = Math.max(1, width * height);
        const count = Number(info?.count || 0);
        const opaqueRatio = count / total;
        const largestRatio = count > 0 ? Number(info?.largestArea || count) / count : 0;
        const boundsW = Math.max(1, Number(info?.maxX || 0) - Number(info?.minX || 0) + 1);
        const boundsH = Math.max(1, Number(info?.maxY || 0) - Number(info?.minY || 0) + 1);
        const boundsRatio = (boundsW * boundsH) / total;
        const touchesEdge = info?.minX <= 1 || info?.minY <= 1 || info?.maxX >= width - 2 || info?.maxY >= height - 2;
        let score = 1;
        if (opaqueRatio > 0.72 || boundsRatio > 0.86) {
            warnings.push('background may still be included');
            score -= 0.28;
        }
        if (opaqueRatio < 0.015) {
            warnings.push('foreground is very small');
            score -= 0.25;
        }
        if (largestRatio < 0.70) {
            warnings.push('silhouette has many separated islands');
            score -= 0.20;
        }
        if ((info?.components || 1) > 8) {
            warnings.push('many disconnected pixel groups');
            score -= 0.12;
        }
        if (touchesEdge) {
            warnings.push('subject touches image edge');
            score -= 0.10;
        }
        if (!Array.isArray(info?.outline) || info.outline.length < 12) {
            warnings.push('completed outline is weak');
            score -= 0.18;
        }
        return {
            score: Math.max(0, Math.min(1, score)),
            warnings,
            opaqueRatio,
            largestRatio,
            components: info?.components || 1
        };
    },

    _bslAnalyzeTraceSilhouette(srcImage, cw, ch, obj, padding, scaleF) {
        const silhouette = this._bslBuildTraceSilhouetteMask(srcImage, cw, ch);
        if (!silhouette || !obj) return null;
        const { mask, guideMask, outline, assessment, minX, minY, maxX, maxY } = silhouette;
        const activeMask = guideMask || mask;
        const silW = Math.max(1, maxX - minX + 1);
        const silH = Math.max(1, maxY - minY + 1);
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
        const clamp01 = (value) => this._clamp01(Number.isFinite(value) ? value : 0);
        const imgXToNorm = (x) => clamp01((x / scaleF - padding) / Math.max(1, obj.width));
        const imgYToNorm = (y) => clamp01((y / scaleF - padding) / Math.max(1, obj.height));
        const tToRow = (t) => clamp(Math.round(minY + clamp01(t) * silH), 0, ch - 1);

        const maskRowSpans = (row) => {
            const y = clamp(Math.round(row), 0, ch - 1);
            const spans = [];
            let start = -1;
            for (let x = 0; x <= cw; x++) {
                const opaque = x < cw && activeMask[y * cw + x] > 0;
                if (opaque && start < 0) start = x;
                else if (!opaque && start >= 0) {
                    spans.push({ s: start, e: x - 1, width: x - start, center: (start + x - 1) * 0.5 });
                    start = -1;
                }
            }
            return spans;
        };
        const outlineRowSpans = (row) => {
            if (!Array.isArray(outline) || outline.length < 4) return null;
            const y = clamp(Math.round(row), 0, ch - 1);
            const xs = [];
            for (let i = 0; i < outline.length; i++) {
                const a = outline[i];
                const b = outline[(i + 1) % outline.length];
                if (!Number.isFinite(a?.x) || !Number.isFinite(a?.y) || !Number.isFinite(b?.x) || !Number.isFinite(b?.y)) continue;
                if ((a.y <= y && b.y > y) || (b.y <= y && a.y > y)) {
                    const t = (y - a.y) / Math.max(0.0001, b.y - a.y);
                    xs.push(a.x + (b.x - a.x) * t);
                }
            }
            xs.sort((a, b) => a - b);
            const spans = [];
            for (let i = 0; i < xs.length - 1; i += 2) {
                const s = clamp(Math.round(xs[i]), 0, cw - 1);
                const e = clamp(Math.round(xs[i + 1]), 0, cw - 1);
                if (e - s > Math.max(2, silW * 0.015)) {
                    spans.push({ s, e, width: e - s + 1, center: (s + e) * 0.5 });
                }
            }
            return spans.length ? spans : null;
        };
        const rowSpans = (row) => outlineRowSpans(row) || maskRowSpans(row);

        const med = (values, fallback = 0) => {
            const clean = values.filter(Number.isFinite).sort((a, b) => a - b);
            if (!clean.length) return fallback;
            return clean[Math.floor(clean.length / 2)];
        };

        const axisSamples = [];
        for (let y = tToRow(0.30); y <= tToRow(0.54); y += Math.max(1, Math.round(silH * 0.015))) {
            const spans = rowSpans(y).filter(sp => sp.width > silW * 0.045);
            if (!spans.length) continue;
            const widest = spans.reduce((best, sp) => sp.width > best.width ? sp : best, spans[0]);
            axisSamples.push(widest.center);
        }
        const bodyAxisX = med(axisSamples, (minX + maxX) * 0.5);
        const coreSpanAt = (row) => {
            const spans = rowSpans(row).filter(sp => sp.width > Math.max(2, silW * 0.018));
            if (!spans.length) return null;
            return spans.find(sp => bodyAxisX >= sp.s && bodyAxisX <= sp.e)
                || spans.reduce((best, sp) => Math.abs(sp.center - bodyAxisX) < Math.abs(best.center - bodyAxisX) ? sp : best, spans[0]);
        };
        const centralSpanNear = (row, preferredX = bodyAxisX) => {
            const spans = rowSpans(row).filter(sp => sp.width > Math.max(2, silW * 0.018));
            if (!spans.length) return null;
            return spans.find(sp => preferredX >= sp.s && preferredX <= sp.e)
                || spans.find(sp => bodyAxisX >= sp.s && bodyAxisX <= sp.e)
                || spans.reduce((best, sp) => Math.abs(sp.center - preferredX) < Math.abs(best.center - preferredX) ? sp : best, spans[0]);
        };
        const coreWidth = (row) => coreSpanAt(row)?.width || 0;

        const coreWidths = [];
        for (let y = minY; y <= maxY; y++) coreWidths.push(coreWidth(y));
        const smooth = this._smoothSmartCutValues(coreWidths, Math.max(2, Math.round(silH * 0.015)));
        const smW = (row) => smooth[clamp(row - minY, 0, smooth.length - 1)] || 0;

        let neckRow = -1;
        let bestNeckScore = -Infinity;
        for (let y = tToRow(0.07); y <= tToRow(0.42); y++) {
            const w0 = smW(y);
            if (w0 <= 0) continue;
            let headMax = 0;
            for (let yy = tToRow(0.02); yy < y; yy++) headMax = Math.max(headMax, smW(yy));
            let flareMax = 0;
            let flareMin = Infinity;
            const fStart = y + Math.round(silH * 0.035);
            const fEnd = Math.min(maxY, y + Math.round(silH * 0.15));
            for (let yy = fStart; yy <= fEnd; yy++) {
                const ww = smW(yy);
                flareMax = Math.max(flareMax, ww);
                if (ww > 0) flareMin = Math.min(flareMin, ww);
            }
            if (headMax <= 0 || flareMax <= 0) continue;
            const pinch = (Math.min(headMax, flareMax) - w0) / Math.max(1, Math.min(headMax, flareMax));
            const stableFlare = flareMin > w0 * 0.96 ? 0.2 : 0;
            const score = pinch + stableFlare - Math.abs(((y - minY) / silH) - 0.20) * 0.12;
            if (score > bestNeckScore && flareMax > w0 * 1.08) {
                bestNeckScore = score;
                neckRow = y;
            }
        }
        if (neckRow < 0) {
            let minWidth = Infinity;
            for (let y = tToRow(0.10); y <= tToRow(0.34); y++) {
                const ww = smW(y);
                if (ww > 0 && ww < minWidth) {
                    minWidth = ww;
                    neckRow = y;
                }
            }
        }
        if (neckRow < 0) neckRow = tToRow(0.18);
        neckRow = clamp(neckRow + Math.round(silH * 0.035), tToRow(0.10), tToRow(0.43));
        const neckCore = coreSpanAt(neckRow) || { s: bodyAxisX - silW * 0.06, e: bodyAxisX + silW * 0.06, width: silW * 0.12, center: bodyAxisX };
        const neckY = imgYToNorm(neckRow);
        const neckX = imgXToNorm(neckCore.center);

        const torsoSamples = [];
        for (let y = Math.max(neckRow + 2, tToRow(0.28)); y <= tToRow(0.55); y += Math.max(1, Math.round(silH * 0.02))) {
            const span = coreSpanAt(y);
            if (span) torsoSamples.push(span.width);
        }
        const torsoHalfPx = Math.max(silW * 0.055, Math.min(silW * 0.22, med(torsoSamples, neckCore.width * 1.8) * 0.5));
        const axillaRow = clamp(neckRow + Math.round(silH * 0.105), neckRow + 3, tToRow(0.40));
        const axillaSpan = coreSpanAt(axillaRow) || { s: bodyAxisX - torsoHalfPx, e: bodyAxisX + torsoHalfPx };
        const leftAxillaX = clamp(Math.max(axillaSpan.s, bodyAxisX - torsoHalfPx), minX, bodyAxisX - silW * 0.025);
        const rightAxillaX = clamp(Math.min(axillaSpan.e, bodyAxisX + torsoHalfPx), bodyAxisX + silW * 0.025, maxX);
        const shoulderTopFor = (x, startRow) => {
            const col = clamp(Math.round(x), 0, cw - 1);
            const topLimit = Math.max(minY, neckRow - Math.round(silH * 0.06));
            let top = startRow;
            for (let y = startRow; y >= topLimit; y--) {
                if (mask[y * cw + col]) top = y;
                else if (top !== startRow) break;
            }
            return top;
        };
        const leftShoulderRow = shoulderTopFor(leftAxillaX, axillaRow);
        const rightShoulderRow = shoulderTopFor(rightAxillaX, axillaRow);

        let crotchRow = -1;
        let crotchX = bodyAxisX;
        const crotchScanStart = Math.max(tToRow(0.50), axillaRow + Math.round(silH * 0.16));
        for (let y = crotchScanStart; y <= tToRow(0.76); y++) {
            const spans = rowSpans(y).filter(sp => sp.width > silW * 0.035).sort((a, b) => a.s - b.s);
            if (spans.length < 2) continue;
            let pair = null;
            for (let i = 0; i < spans.length - 1; i++) {
                const a = spans[i], b = spans[i + 1];
                const gapMid = (a.e + b.s) * 0.5;
                const gap = b.s - a.e;
                if (gap > Math.max(2, silW * 0.015) && Math.abs(gapMid - bodyAxisX) < silW * 0.18) {
                    pair = { a, b, x: gapMid };
                    break;
                }
            }
            if (pair) {
                crotchRow = y;
                crotchX = pair.x;
                break;
            }
        }
        if (crotchRow < 0) {
            crotchRow = tToRow(0.61);
            const span = centralSpanNear(crotchRow, bodyAxisX);
            crotchX = span?.center || bodyAxisX;
        }

        const waistRow = clamp(
            crotchRow - Math.round(Math.max(silH * 0.065, Math.min(silH * 0.13, (crotchRow - neckRow) * 0.22))),
            tToRow(0.45),
            crotchRow - Math.max(3, Math.round(silH * 0.035))
        );
        let waistSpan = centralSpanNear(waistRow, crotchX) || centralSpanNear(crotchRow, crotchX) || { s: bodyAxisX - torsoHalfPx, e: bodyAxisX + torsoHalfPx, center: bodyAxisX };
        const minHipHalf = Math.max(silW * 0.055, torsoHalfPx * 0.72);
        if (waistSpan.s > crotchX - minHipHalf || waistSpan.e < crotchX + minHipHalf) {
            waistSpan = {
                s: clamp(Math.min(waistSpan.s, crotchX - minHipHalf), minX, crotchX - Math.max(3, silW * 0.035)),
                e: clamp(Math.max(waistSpan.e, crotchX + minHipHalf), crotchX + Math.max(3, silW * 0.035), maxX),
                center: crotchX
            };
        }
        const splitEndRow = clamp(
            crotchRow + Math.round(Math.max(silH * 0.16, (maxY - crotchRow) * 0.45)),
            crotchRow + 3,
            maxY
        );

        return {
            neck: { x: neckX, y: neckY, label: 'Neck root', color: '#f59e0b', help: 'Trace silhouette neck/root cut' },
            leftShoulder: { x: imgXToNorm(leftAxillaX), y: imgYToNorm(leftShoulderRow), label: 'R shoulder', color: '#3b82f6', help: 'Trace silhouette character right shoulder tip' },
            rightShoulder: { x: imgXToNorm(rightAxillaX), y: imgYToNorm(rightShoulderRow), label: 'L shoulder', color: '#ec4899', help: 'Trace silhouette character left shoulder tip' },
            leftArmpit: { x: imgXToNorm(leftAxillaX), y: imgYToNorm(axillaRow), label: 'R axilla', color: '#60a5fa', help: 'Trace silhouette character right arm-to-torso join' },
            rightArmpit: { x: imgXToNorm(rightAxillaX), y: imgYToNorm(axillaRow), label: 'L axilla', color: '#f472b6', help: 'Trace silhouette character left arm-to-torso join' },
            leftHip: { x: imgXToNorm(waistSpan.s), y: imgYToNorm(waistRow), label: 'R hip', color: '#22c55e', help: 'Trace silhouette character right hip line edge' },
            rightHip: { x: imgXToNorm(waistSpan.e), y: imgYToNorm(waistRow), label: 'L hip', color: '#22c55e', help: 'Trace silhouette character left hip line edge' },
            crotch: { x: imgXToNorm(crotchX), y: imgYToNorm(waistRow), label: 'Crotch start', color: '#10b981', help: 'Start of vertical leg split at the hip line' },
            legSplit: { x: imgXToNorm(crotchX), y: imgYToNorm(splitEndRow), label: 'Leg split', color: '#10b981', help: 'Vertical split between legs' },
            _meta: {
                method: 'trace-silhouette',
                bounds: { minX, minY, maxX, maxY },
                confidence: Math.max(0.2, Math.min(0.95, (bestNeckScore + 0.45) * (assessment?.score ?? 1))),
                warnings: assessment?.warnings || []
            }
        };
    },

    _bslValidateTraceSilhouetteLandmarks(landmarks) {
        if (!landmarks) return false;
        const finite = (...keys) => keys.every(key =>
            Number.isFinite(landmarks[key]?.x) && Number.isFinite(landmarks[key]?.y)
        );
        if (!finite('neck', 'leftShoulder', 'rightShoulder', 'leftArmpit', 'rightArmpit', 'leftHip', 'rightHip', 'legSplit')) {
            return false;
        }
        const neck = landmarks.neck;
        const ls = landmarks.leftShoulder;
        const rs = landmarks.rightShoulder;
        const la = landmarks.leftArmpit;
        const ra = landmarks.rightArmpit;
        const lh = landmarks.leftHip;
        const rh = landmarks.rightHip;
        const split = landmarks.legSplit;
        const waistY = (lh.y + rh.y) * 0.5;

        if (neck.y < 0.06 || neck.y > 0.42) return false;
        if (la.y <= neck.y + 0.035 || ra.y <= neck.y + 0.035) return false;
        if (waistY <= Math.max(la.y, ra.y) + 0.10 || waistY > 0.78) return false;
        if (split.y <= waistY + 0.08 || split.y > 0.98) return false;
        if (!(ls.x < neck.x && la.x < neck.x && rs.x > neck.x && ra.x > neck.x)) return false;
        if (!(lh.x < neck.x && rh.x > neck.x && lh.x < rh.x)) return false;
        if (Math.abs(la.x - ls.x) > 0.12 || Math.abs(ra.x - rs.x) > 0.12) return false;

        return true;
    },

    _bslApplyTraceSilhouetteGuides(obj, panel, pixels, w, h) {
        if (this._bslLaunchMode !== 'character-cutter' || this._bslViewMode !== 'front') return false;
        if (!pixels || !w || !h || !obj) return false;
        this._bslCurvePixelInfo = { pixels, w, h };
        const srcImage = { data: pixels, width: w, height: h };
        const landmarks = this._bslAnalyzeTraceSilhouette(srcImage, w, h, obj, 0, 1);
        if (!landmarks) return false;
        if (!this._bslValidateTraceSilhouetteLandmarks(landmarks)) {
            console.warn('[Character Cutter] Trace Silhouette landmarks rejected by sanity check:', landmarks);
            return false;
        }
        this._bslLandmarks = landmarks;
        this._bslLastGuideMethod = 'trace-silhouette';
        this._bslApplyCurvesFromLandmarks(panel);
        this._bslGuideConfidence = this._bslBuildGuideConfidence(landmarks);
        this._bslTrainingApplied = false;
        this._bslTrainingScore = null;
        this._bslSyncCurveButtons(panel);
        this._bslUpdateLegend(panel);
        const warnings = this._bslGuideConfidence?.warnings || [];
        this._bslSetMlStatus?.(
            panel,
            warnings.length
                ? `Trace Silhouette completed the contour, but ${warnings.slice(0, 2).join('; ')}. Review the highlighted guides before cutting.`
                : 'Trace Silhouette completed the contour and placed editable neck, axilla, hip, and crotch cut guides.',
            warnings.length ? 'warning' : 'success',
            'Trace Silhouette'
        );
        return true;
    },

    _bslGetRegionKeyAt(normX, normY) {
        if (this._bslViewMode === 'side') return this._bslGetSideRegionKeyAt(normX, normY);

        const crotchY = this._bslEvalCurveAtX('crotch', normX);
        if (normY > crotchY) {
            const splitX = this._bslEvalCurveAtY('legSplit', normY);
            return normX <= splitX ? 'r-leg' : 'l-leg';
        }

        const armPad = this._bslUsesConnectivityRegionSplit() ? 0.025 : 0;
        const leftX = this._bslEvalCurveAtYBounded('leftArm', normY, armPad);
        const rightX = this._bslEvalCurveAtYBounded('rightArm', normY, armPad);
        if (Number.isFinite(leftX) && normX <= leftX) return 'r-arm';
        if (Number.isFinite(rightX) && normX >= rightX) return 'l-arm';

        const neckY = this._bslEvalCurveAtX('neck', normX);
        if (normY <= neckY) return 'head';

        return 'torso';
    },

    async _bslBuildHumanParsingRegionData(srcCanvas, srcImage, cw, ch, obj, padding, scaleF, regionKeys, panel = null) {
        if (this._bslLaunchMode !== 'character-cutter' || this._bslViewMode === 'side' || !srcCanvas || !srcImage || !obj) {
            return null;
        }
        try {
            const segmenter = await this._bslLoadHumanPartSegmenter(panel);
            this._bslSetMlStatus?.(panel, 'Running Human Parsing body-part segmentation...', 'info', 'Human Parsing');
            let segmentation = null;
            if (segmenter.segmentPersonParts) {
                segmentation = await segmenter.segmentPersonParts(srcCanvas, {
                    flipHorizontal: false,
                    internalResolution: 'medium',
                    segmentationThreshold: 0.45,
                    maxDetections: 1
                });
            } else if (segmenter.estimatePartSegmentation) {
                segmentation = await segmenter.estimatePartSegmentation(srcCanvas, 16, 0.45);
            }
            const segData = segmentation?.data;
            const sw = segmentation?.width || srcCanvas.width;
            const sh = segmentation?.height || srcCanvas.height;
            if (!segData || !sw || !sh) return null;

            const regionData = {};
            regionKeys.forEach(key => {
                const canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                regionData[key] = canvas.getContext('2d').createImageData(cw, ch);
            });

            // BodyPix part ids: 0-1 face, 2-5 right arm, 6-11 left arm/hand,
            // 12-13 torso, 14-17 right leg, 18-23 left leg/foot.
            const labelToRegion = (label, nx, ny) => {
                if (label === 0 || label === 1) return 'head';
                if (label >= 2 && label <= 5) return 'r-arm';
                if (label >= 6 && label <= 11) return 'l-arm';
                if (label === 12 || label === 13) return 'torso';
                if (label >= 14 && label <= 17) return 'r-leg';
                if (label >= 18 && label <= 23) return 'l-leg';
                return this._bslGetRegionKeyAt(nx, ny);
            };

            const src = srcImage.data;
            const counts = { head: 0, torso: 0, 'r-arm': 0, 'l-arm': 0, 'r-leg': 0, 'l-leg': 0 };
            for (let y = 0; y < ch; y++) {
                const normY = this._clamp01(((y / scaleF) - padding) / Math.max(1, obj.height));
                const sy = Math.max(0, Math.min(sh - 1, Math.round((y / Math.max(1, ch - 1)) * (sh - 1))));
                for (let x = 0; x < cw; x++) {
                    const idx = (y * cw + x) * 4;
                    if (src[idx + 3] <= 10) continue;
                    const normX = this._clamp01(((x / scaleF) - padding) / Math.max(1, obj.width));
                    const sx = Math.max(0, Math.min(sw - 1, Math.round((x / Math.max(1, cw - 1)) * (sw - 1))));
                    const label = segData[sy * sw + sx];
                    const regionKey = labelToRegion(label, normX, normY);
                    const dest = regionData[regionKey]?.data;
                    if (!dest) continue;
                    dest[idx] = src[idx];
                    dest[idx + 1] = src[idx + 1];
                    dest[idx + 2] = src[idx + 2];
                    dest[idx + 3] = src[idx + 3];
                    counts[regionKey] = (counts[regionKey] || 0) + 1;
                }
            }

            const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
            const limbPixels = (counts['r-arm'] || 0) + (counts['l-arm'] || 0) + (counts['r-leg'] || 0) + (counts['l-leg'] || 0);
            if (total < 64 || !counts.head || !counts.torso || limbPixels < Math.max(32, total * 0.12)) {
                this._bslSetMlStatus?.(panel, 'Human Parsing was incomplete for this image. Falling back to editable cut lines.', 'warning', 'Pixel Detection');
                return null;
            }

            this._bslSetMlStatus?.(
                panel,
                `Human Parsing applied: head, torso, arms, and legs were separated from pixel body-part labels.`,
                'success',
                'Human Parsing'
            );
            return this._bslRefineRegionData(regionData, cw, ch);
        } catch (error) {
            console.warn('[Character Cutter] Human Parsing unavailable:', error);
            this._bslSetMlStatus?.(panel, 'Human Parsing could not load on this device/network. Falling back to editable cut lines.', 'warning', 'Pixel Detection');
            return null;
        }
    },

    _bslBuildCharacterCutterRegionData(srcImage, cw, ch, obj, padding, scaleF, regionKeys) {
        if (!this._bslUsesConnectivityRegionSplit() || this._bslViewMode === 'side' || !srcImage || !obj) {
            return null;
        }

        const src = srcImage.data;
        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = cw;
        maskCanvas.height = ch;
        const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
        const maskImage = maskCtx.createImageData(cw, ch);
        for (let i = 0; i < src.length; i += 4) {
            if (src[i + 3] > 10) {
                maskImage.data[i] = 255;
                maskImage.data[i + 1] = 255;
                maskImage.data[i + 2] = 255;
                maskImage.data[i + 3] = 255;
            }
        }
        maskCtx.putImageData(maskImage, 0, 0);

        const toPx = (point) => ({
            x: (this._clamp01(point.x) * obj.width + padding) * scaleF,
            y: (this._clamp01(point.y) * obj.height + padding) * scaleF
        });
        const drawCut = (curveKey, widthPx, extendStartPx = 0, extendEndPx = 0) => {
            const curve = this._bslCurves?.[curveKey];
            if (!curve?.points?.length) return;
            const samples = this._bslSampleCurve(curveKey, curve.orientation === 'horizontal' ? 36 : 18);
            if (samples.length < 2) return;
            const pts = samples.map(toPx);
            if (pts.length >= 2) {
                // Overshoot the stroke endpoints along the stroke direction so the
                // cut runs from transparency, through the silhouette, back into
                // transparency. Without this the arm cut stops exactly at the
                // armpit apex (zero-width gap) and shoulder-tip edge, leaving a
                // thin opaque bridge that keeps the arm attached to the torso or
                // splits it into two components.
                const extend = (from, toward, dist) => {
                    const dx = from.x - toward.x;
                    const dy = from.y - toward.y;
                    const len = Math.hypot(dx, dy) || 1;
                    return { x: from.x + (dx / len) * dist, y: from.y + (dy / len) * dist };
                };
                if (extendStartPx > 0) pts[0] = extend(pts[0], pts[1], extendStartPx);
                if (extendEndPx > 0) pts[pts.length - 1] = extend(pts[pts.length - 1], pts[pts.length - 2], extendEndPx);
            }
            maskCtx.save();
            maskCtx.globalCompositeOperation = 'destination-out';
            maskCtx.lineCap = 'round';
            maskCtx.lineJoin = 'round';
            maskCtx.lineWidth = widthPx;
            maskCtx.beginPath();
            pts.forEach((px, index) => {
                if (index === 0) maskCtx.moveTo(px.x, px.y);
                else maskCtx.lineTo(px.x, px.y);
            });
            maskCtx.stroke();
            maskCtx.restore();
        };

        const cutWidth = Math.max(3, Math.round(scaleF * 2.4));
        const hgtPx = obj.height * scaleF;
        // The cut curves now start/end in transparency themselves, so no extra
        // overshoot is needed at those ends. The arm cut already extends past the
        // axilla to a transparent pixel, so only a tiny safety overshoot remains.
        drawCut('neck', cutWidth, 0, 0);
        drawCut('leftArm', cutWidth, 0, hgtPx * 0.015);
        drawCut('rightArm', cutWidth, 0, hgtPx * 0.015);
        drawCut('crotch', cutWidth, 0, 0);
        drawCut('legSplit', cutWidth, 0, 0);

        const cutData = maskCtx.getImageData(0, 0, cw, ch).data;
        const total = cw * ch;
        const labels = new Int32Array(total);
        const stack = new Int32Array(total);
        const components = [{ area: 0 }];
        let nextLabel = 0;

        for (let i = 0; i < total; i++) {
            if (labels[i] || cutData[i * 4 + 3] <= 10) continue;
            nextLabel++;
            const comp = {
                label: nextLabel,
                area: 0,
                minX: cw,
                minY: ch,
                maxX: -1,
                maxY: -1,
                sumX: 0,
                sumY: 0
            };
            let top = 0;
            stack[top++] = i;
            labels[i] = nextLabel;
            while (top > 0) {
                const idx = stack[--top];
                const x = idx % cw;
                const y = (idx - x) / cw;
                comp.area++;
                comp.sumX += x;
                comp.sumY += y;
                if (x < comp.minX) comp.minX = x;
                if (x > comp.maxX) comp.maxX = x;
                if (y < comp.minY) comp.minY = y;
                if (y > comp.maxY) comp.maxY = y;

                const visit = (n) => {
                    if (labels[n] || cutData[n * 4 + 3] <= 10) return;
                    labels[n] = nextLabel;
                    stack[top++] = n;
                };
                if (x > 0) visit(idx - 1);
                if (x < cw - 1) visit(idx + 1);
                if (y > 0) visit(idx - cw);
                if (y < ch - 1) visit(idx + cw);
            }
            components[nextLabel] = comp;
        }

        if (nextLabel < 2) return null;

        const labelAtNear = (nx, ny, radius = 9) => {
            const px = Math.max(0, Math.min(cw - 1, Math.round((this._clamp01(nx) * obj.width + padding) * scaleF)));
            const py = Math.max(0, Math.min(ch - 1, Math.round((this._clamp01(ny) * obj.height + padding) * scaleF)));
            const r = Math.max(2, Math.round(radius * scaleF));
            const counts = new Map();
            for (let yy = Math.max(0, py - r); yy <= Math.min(ch - 1, py + r); yy++) {
                for (let xx = Math.max(0, px - r); xx <= Math.min(cw - 1, px + r); xx++) {
                    if ((xx - px) * (xx - px) + (yy - py) * (yy - py) > r * r) continue;
                    const label = labels[yy * cw + xx];
                    if (label) counts.set(label, (counts.get(label) || 0) + 1);
                }
            }
            let best = 0;
            let bestCount = 0;
            counts.forEach((count, label) => {
                if (count > bestCount) {
                    best = label;
                    bestCount = count;
                }
            });
            return best;
        };

        const avgPoint = (points, fallback) => {
            const clean = (points || []).filter(point => Number.isFinite(point?.x) && Number.isFinite(point?.y));
            if (!clean.length) return fallback;
            return {
                x: clean.reduce((sum, point) => sum + point.x, 0) / clean.length,
                y: clean.reduce((sum, point) => sum + point.y, 0) / clean.length
            };
        };
        const neck = this._bslGetNeckRootPoint();
        const leftArm = this._bslCurves.leftArm?.points || [];
        const rightArm = this._bslCurves.rightArm?.points || [];
        const leftCut = avgPoint(leftArm, { x: 0.24, y: 0.28 });
        const rightCut = avgPoint(rightArm, { x: 0.76, y: 0.28 });
        const waistY = this._bslEvalCurveAtX('crotch', 0.5);
        const splitX = this._bslEvalCurveAtY('legSplit', Math.min(0.95, waistY + 0.10));
        const midX = (leftCut.x + rightCut.x) * 0.5 || neck.x || 0.5;
        const assignments = {};
        const seed = (key, nx, ny, radius = 10) => {
            const label = labelAtNear(nx, ny, radius);
            if (label && !assignments[label]) assignments[label] = key;
        };

        seed('head', neck.x, Math.max(0.03, neck.y - 0.08), 14);
        seed('torso', midX, (neck.y + waistY) * 0.5, 16);
        seed('r-arm', Math.max(0.02, leftCut.x - 0.08), leftCut.y, 18);
        seed('l-arm', Math.min(0.98, rightCut.x + 0.08), rightCut.y, 18);
        if (this._bslLandmarks?.leftHand) seed('r-arm', this._bslLandmarks.leftHand.x, this._bslLandmarks.leftHand.y, 18);
        if (this._bslLandmarks?.rightHand) seed('l-arm', this._bslLandmarks.rightHand.x, this._bslLandmarks.rightHand.y, 18);
        seed('r-leg', Math.max(0.04, splitX - 0.10), Math.min(0.95, waistY + 0.16), 18);
        seed('l-leg', Math.min(0.96, splitX + 0.10), Math.min(0.95, waistY + 0.16), 18);

        const fallbackRegion = (nx, ny, label = 0) => {
            const comp = components[label];
            const cMinX = comp ? ((comp.minX / scaleF - padding) / Math.max(1, obj.width)) : nx;
            const cMaxX = comp ? ((comp.maxX / scaleF - padding) / Math.max(1, obj.width)) : nx;
            const cMinY = comp ? ((comp.minY / scaleF - padding) / Math.max(1, obj.height)) : ny;
            const cMaxY = comp ? ((comp.maxY / scaleF - padding) / Math.max(1, obj.height)) : ny;
            if (ny > waistY || cMinY > waistY - 0.01) return nx <= splitX ? 'r-leg' : 'l-leg';
            if (cMaxX < leftCut.x + 0.015 && cMaxY > neck.y - 0.08) return 'r-arm';
            if (cMinX > rightCut.x - 0.015 && cMaxY > neck.y - 0.08) return 'l-arm';
            if (ny <= neck.y + 0.03 || cMaxY <= neck.y + 0.04) return 'head';
            return 'torso';
        };

        components.forEach((comp) => {
            if (!comp?.label || assignments[comp.label]) return;
            const nx = ((comp.sumX / comp.area) / scaleF - padding) / Math.max(1, obj.width);
            const ny = ((comp.sumY / comp.area) / scaleF - padding) / Math.max(1, obj.height);
            assignments[comp.label] = fallbackRegion(nx, ny, comp.label);
        });

        const nearestLabel = (pixelIndex) => {
            const x0 = pixelIndex % cw;
            const y0 = (pixelIndex - x0) / cw;
            const maxR = Math.max(3, Math.round(5 * scaleF));
            for (let r = 1; r <= maxR; r++) {
                let best = 0;
                for (let y = Math.max(0, y0 - r); y <= Math.min(ch - 1, y0 + r); y++) {
                    for (let x = Math.max(0, x0 - r); x <= Math.min(cw - 1, x0 + r); x++) {
                        if (Math.abs(x - x0) !== r && Math.abs(y - y0) !== r) continue;
                        const label = labels[y * cw + x];
                        if (label) {
                            best = label;
                            break;
                        }
                    }
                    if (best) break;
                }
                if (best) return best;
            }
            return 0;
        };

        const regionData = {};
        regionKeys.forEach(key => {
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            regionData[key] = canvas.getContext('2d').createImageData(cw, ch);
        });

        for (let i = 0; i < total; i++) {
            const srcIdx = i * 4;
            if (src[srcIdx + 3] <= 10) continue;
            let label = labels[i];
            if (!label) label = nearestLabel(i);
            const nx = ((i % cw) / scaleF - padding) / Math.max(1, obj.width);
            const ny = (((i - (i % cw)) / cw) / scaleF - padding) / Math.max(1, obj.height);
            const key = assignments[label] || fallbackRegion(nx, ny, label);
            const dest = regionData[key]?.data;
            if (!dest) continue;
            dest[srcIdx] = src[srcIdx];
            dest[srcIdx + 1] = src[srcIdx + 1];
            dest[srcIdx + 2] = src[srcIdx + 2];
            dest[srcIdx + 3] = src[srcIdx + 3];
        }

        return this._bslRefineRegionData(regionData, cw, ch);
    },

    _bslGetSideRegionKeyAt(normX, normY) {
        const neckY = this._bslEvalCurveAtX('neck', normX);
        if (normY <= neckY) return 'head';

        const waistY = this._bslEvalCurveAtX('waist', normX);
        if (normY > waistY) return 'f-lower-limb';

        const armX = this._bslEvalCurveAtY('armBound', normY);
        return normX >= armX ? 'f-upper-limb' : 'torso';
    },

    _bslSampleOpaqueSpan(canvas, row) {
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const y = Math.max(0, Math.min(canvas.height - 1, Math.round(row)));
        const data = ctx.getImageData(0, y, canvas.width, 1).data;
        let minX = canvas.width;
        let maxX = -1;
        for (let x = 0; x < canvas.width; x++) {
            if (data[x * 4 + 3] > 10) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
            }
        }
        if (maxX < minX) return null;
        return {
            left: minX,
            right: maxX,
            centerX: (minX + maxX) * 0.5,
            width: maxX - minX + 1
        };
    },

    _bslKeepLargestComponent(canvas) {
        if (!canvas || !canvas.width || !canvas.height) return;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = canvas.width;
        const h = canvas.height;
        const img = ctx.getImageData(0, 0, w, h);
        const data = img.data;
        const total = w * h;
        const labels = new Int32Array(total);
        const stack = new Int32Array(total);
        let bestLabel = 0;
        let bestSize = 0;
        let nextLabel = 0;
        const sizes = [0];
        for (let i = 0; i < total; i++) {
            if (labels[i] !== 0) continue;
            if (data[i * 4 + 3] <= 10) continue;
            nextLabel++;
            let stackTop = 0;
            stack[stackTop++] = i;
            labels[i] = nextLabel;
            let size = 0;
            while (stackTop > 0) {
                const idx = stack[--stackTop];
                size++;
                const x = idx % w;
                const y = (idx - x) / w;
                if (x > 0) {
                    const n = idx - 1;
                    if (labels[n] === 0 && data[n * 4 + 3] > 10) { labels[n] = nextLabel; stack[stackTop++] = n; }
                }
                if (x < w - 1) {
                    const n = idx + 1;
                    if (labels[n] === 0 && data[n * 4 + 3] > 10) { labels[n] = nextLabel; stack[stackTop++] = n; }
                }
                if (y > 0) {
                    const n = idx - w;
                    if (labels[n] === 0 && data[n * 4 + 3] > 10) { labels[n] = nextLabel; stack[stackTop++] = n; }
                }
                if (y < h - 1) {
                    const n = idx + w;
                    if (labels[n] === 0 && data[n * 4 + 3] > 10) { labels[n] = nextLabel; stack[stackTop++] = n; }
                }
            }
            sizes.push(size);
            if (size > bestSize) { bestSize = size; bestLabel = nextLabel; }
        }
        if (bestLabel === 0) return;
        for (let i = 0; i < total; i++) {
            if (labels[i] !== bestLabel) {
                const o = i * 4;
                data[o] = 0; data[o + 1] = 0; data[o + 2] = 0; data[o + 3] = 0;
            }
        }
        ctx.putImageData(img, 0, 0);
    },

    _bslGetRoundedLimbCapGeometry(regionCanvas, limbKey, obj, padding, scaleF) {
        if (!regionCanvas || !obj) return null;

        const neckMid = this._bslEvalCurveAtX('neck', 0.5);
        const crotchMid = this._bslEvalCurveAtX('crotch', 0.5);
        const isArm = limbKey === 'r-arm' || limbKey === 'l-arm';
        const isLeg = limbKey === 'r-leg' || limbKey === 'l-leg';
        let startNorm = 0;
        let endNorm = 0;

        if (isArm) {
            const curveKey = limbKey === 'l-arm' ? 'leftArm' : 'rightArm';
            const points = this._bslCurves?.[curveKey]?.points || [];
            startNorm = Math.max(0.02, (points[0]?.y ?? neckMid) - 0.01);
            endNorm = Math.min(0.72, (points[1]?.y ?? (startNorm + 0.08)) + 0.06);
        } else if (isLeg) {
            startNorm = Math.max(crotchMid + 0.01, 0.24);
            endNorm = Math.min(0.86, startNorm + 0.18);
        } else {
            return null;
        }

        const startRow = (startNorm * obj.height + padding) * scaleF;
        const endRow = (endNorm * obj.height + padding) * scaleF;
        const rows = [];
        const samples = 5;
        for (let i = 0; i < samples; i++) {
            rows.push(startRow + ((endRow - startRow) * i) / Math.max(1, samples - 1));
        }

        const points = [];
        const widths = [];
        rows.forEach(row => {
            const span = this._bslSampleOpaqueSpan(regionCanvas, row);
            if (!span || span.width < 4) return;
            points.push({ x: span.centerX, y: row });
            widths.push(span.width);
        });
        if (points.length < 2 || !widths.length) return null;

        const maxWidth = widths.reduce((max, value) => Math.max(max, value), 0);
        const width = Math.max(8, Math.min(regionCanvas.width * 0.45, maxWidth * 1.05));
        const capRadius = Math.max(
            8,
            Math.min(regionCanvas.width * 0.28, width * (isArm ? 0.72 : 0.58))
        );
        const capOffset = width * (isArm ? 0.16 : 0.08);
        const blendRadius = Math.max(
            5,
            Math.min(regionCanvas.width * 0.2, width * (isArm ? 0.44 : 0.30))
        );
        return { points, width, capRadius, capOffset, blendRadius };
    },

    _bslApplyRoundedLimbCap(regionCanvas, srcCanvas, limbKey, obj, padding, scaleF) {
        const geometry = this._bslGetRoundedLimbCapGeometry(regionCanvas, limbKey, obj, padding, scaleF);
        if (!geometry?.points?.length || !geometry.width) return;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = regionCanvas.width;
        maskCanvas.height = regionCanvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.strokeStyle = '#fff';
        maskCtx.lineCap = 'round';
        maskCtx.lineJoin = 'round';
        maskCtx.lineWidth = geometry.width;
        maskCtx.beginPath();
        geometry.points.forEach((point, index) => {
            if (index === 0) maskCtx.moveTo(point.x, point.y);
            else maskCtx.lineTo(point.x, point.y);
        });
        maskCtx.stroke();

        const tip = geometry.points[0];
        const next = geometry.points[1] || tip;
        let vx = tip.x - next.x;
        let vy = tip.y - next.y;
        const len = Math.hypot(vx, vy);
        if (len < 0.001) {
            vx = 0;
            vy = -1;
        } else {
            vx /= len;
            vy /= len;
        }

        const capCenterX = tip.x + vx * (geometry.capOffset || 0);
        const capCenterY = tip.y + vy * (geometry.capOffset || 0);
        maskCtx.fillStyle = '#fff';
        if (geometry.blendRadius > 0) {
            maskCtx.beginPath();
            maskCtx.arc(tip.x, tip.y, geometry.blendRadius, 0, Math.PI * 2);
            maskCtx.fill();
        }
        if (geometry.capRadius > 0) {
            maskCtx.beginPath();
            maskCtx.arc(capCenterX, capCenterY, geometry.capRadius, 0, Math.PI * 2);
            maskCtx.fill();
        }

        const addCanvas = document.createElement('canvas');
        addCanvas.width = regionCanvas.width;
        addCanvas.height = regionCanvas.height;
        const addCtx = addCanvas.getContext('2d');
        addCtx.drawImage(srcCanvas, 0, 0);
        addCtx.globalCompositeOperation = 'destination-in';
        addCtx.drawImage(maskCanvas, 0, 0);

        regionCanvas.getContext('2d').drawImage(addCanvas, 0, 0);
    },

    _bslGetTorsoShoulderBlendGeometries(regionCanvas, obj, padding, scaleF) {
        if (!regionCanvas || !obj) return [];

        const topSpan = this._bslSampleOpaqueSpan(regionCanvas, (this._bslEvalCurveAtX('neck', 0.5) * obj.height + padding) * scaleF);
        const torsoWidth = topSpan?.width || Math.max(20, obj.width * scaleF * 0.38);
        const baseWidth = Math.max(
            8,
            Math.min(regionCanvas.width * 0.12, torsoWidth * 0.14)
        );

        const sides = [
            { curveKey: 'leftArm', side: 'left', dir: -1 },
            { curveKey: 'rightArm', side: 'right', dir: 1 }
        ];

        return sides.map(({ curveKey, side, dir }) => {
            const curvePoints = this._bslCurves?.[curveKey]?.points || [];
            const startNorm = Math.max(0.02, (curvePoints[0]?.y ?? 0.18) - 0.004);
            const secondY = curvePoints[1]?.y ?? (startNorm + 0.10);
            const endNorm = Math.min(secondY - 0.01, startNorm + 0.055);
            const rows = [];
            const samples = 3;
            for (let i = 0; i < samples; i++) {
                rows.push((startNorm + ((endNorm - startNorm) * i) / Math.max(1, samples - 1)) * obj.height * scaleF + padding * scaleF);
            }

            const points = [];
            rows.forEach(row => {
                const y = Math.max(0, Math.min(regionCanvas.height - 1, Math.round(row)));
                const span = this._bslSampleOpaqueSpan(regionCanvas, y);
                if (!span || span.width < 6) return;
                points.push({
                    x: side === 'left' ? span.left : span.right,
                    y
                });
            });
            if (points.length < 2) return null;

            const strokeWidth = baseWidth;
            const outerTop = points[0];
            const outerMid = points[Math.min(1, points.length - 1)];
            const innerBase = outerMid;
            const innerPoint = {
                x: innerBase.x - dir * strokeWidth * 0.55,
                y: innerBase.y - strokeWidth * 0.02
            };
            const pathPoints = [innerPoint, outerMid, outerTop];

            return {
                points: pathPoints,
                strokeWidth,
                capPoint: outerTop,
                capRadius: strokeWidth * 0.48
            };
        }).filter(Boolean);
    },

    _bslApplyTorsoShoulderBlend(regionCanvas, srcCanvas, obj, padding, scaleF) {
        const geometries = this._bslGetTorsoShoulderBlendGeometries(regionCanvas, obj, padding, scaleF);
        if (!geometries.length) return;

        const maskCanvas = document.createElement('canvas');
        maskCanvas.width = regionCanvas.width;
        maskCanvas.height = regionCanvas.height;
        const maskCtx = maskCanvas.getContext('2d');
        maskCtx.fillStyle = '#fff';
        maskCtx.strokeStyle = '#fff';
        maskCtx.lineCap = 'butt';
        maskCtx.lineJoin = 'round';

        geometries.forEach(geometry => {
            maskCtx.lineWidth = geometry.strokeWidth;
            maskCtx.beginPath();
            geometry.points.forEach((point, index) => {
                if (index === 0) maskCtx.moveTo(point.x, point.y);
                else maskCtx.lineTo(point.x, point.y);
            });
            maskCtx.stroke();
            if (geometry.capPoint && geometry.capRadius > 0) {
                maskCtx.beginPath();
                maskCtx.arc(geometry.capPoint.x, geometry.capPoint.y, geometry.capRadius, 0, Math.PI * 2);
                maskCtx.fill();
            }
        });

        const addCanvas = document.createElement('canvas');
        addCanvas.width = regionCanvas.width;
        addCanvas.height = regionCanvas.height;
        const addCtx = addCanvas.getContext('2d');
        addCtx.drawImage(srcCanvas, 0, 0);
        addCtx.globalCompositeOperation = 'destination-in';
        addCtx.drawImage(maskCanvas, 0, 0);

        regionCanvas.getContext('2d').drawImage(addCanvas, 0, 0);
    },

    _bslInferShoulderPivotFromTrimmedCanvas(canvas, partKey) {
        const isRightArm = /^r-arm$/i.test(partKey);
        const fallback = isRightArm
            ? { x: 0.68, y: 0.10 }
            : { x: 0.32, y: 0.10 };
        if (!canvas) return fallback;

        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const w = canvas.width || 0;
        const h = canvas.height || 0;
        if (w < 4 || h < 4) return fallback;

        const scanRows = Math.max(4, Math.min(h - 1, Math.round(h * 0.2)));
        let topRow = null;
        let topInnerEdge = null;
        let topOuterEdge = null;
        let topWidth = 0;
        let weightedInner = 0;
        let weightedOuter = 0;
        let weightedY = 0;
        let weightSum = 0;

        for (let y = 0; y <= scanRows; y++) {
            const data = ctx.getImageData(0, y, w, 1).data;
            let minX = w;
            let maxX = -1;
            for (let x = 0; x < w; x++) {
                if (data[x * 4 + 3] > 10) {
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                }
            }
            if (maxX < minX) continue;
            const width = maxX - minX + 1;
            const innerEdge = isRightArm ? maxX : minX;
            const outerEdge = isRightArm ? minX : maxX;
            const topBias = (scanRows - y + 1) / (scanRows + 1);
            const weight = Math.max(1, width) * (0.7 + topBias * 1.6);
            weightedInner += innerEdge * weight;
            weightedOuter += outerEdge * weight;
            weightedY += y * weight;
            weightSum += weight;

            if (topRow === null || y < topRow) {
                topRow = y;
                topInnerEdge = innerEdge;
                topOuterEdge = outerEdge;
                topWidth = width;
            }
        }

        if (topRow === null || weightSum <= 0) return fallback;

        const innerEdge = weightedInner / weightSum;
        const outerEdge = weightedOuter / weightSum;
        const topY = Math.min(topRow, weightedY / weightSum);
        const shoulderWidth = Math.max(4, Math.abs(innerEdge - outerEdge) + 1);
        const pivotXRaw = isRightArm
            ? (innerEdge - shoulderWidth * 0.14) / w
            : (innerEdge + shoulderWidth * 0.14) / w;
        const pivotYRaw = (topY + Math.max(2, Math.min(shoulderWidth * 0.08, h * 0.08))) / h;

        // Keep Body Slicer arm pivots near the proven Pose Armature defaults.
        // The trimmed shoulder silhouette is useful, but if it dominates too much
        // the joint chain and contour socket can drift off the visible limb.
        const blendedPivotX = fallback.x + (pivotXRaw - fallback.x) * 0.45;
        const pivotX = isRightArm
            ? Math.max(0.62, Math.min(0.78, blendedPivotX))
            : Math.max(0.22, Math.min(0.38, blendedPivotX));
        const pivotY = Math.max(0.06, Math.min(0.12, fallback.y + (pivotYRaw - fallback.y) * 0.4));

        return { x: pivotX, y: pivotY };
    },

    _bslBuildManualJointPlacementSteps(createdParts) {
        const make = (key, entries) => {
            const obj = createdParts[key];
            if (!obj) return [];
            return entries.map(entry => ({
                obj,
                name: entry.name,
                label: entry.label,
                description: entry.description,
                direction: 'vertical-tb',
                useClickCrossOffset: true,
                enableContours: true,
                contourSize: 1
            }));
        };

        return [
            ...make('r-arm', [
                { name: 'right-elbow', label: 'Right Elbow', description: 'Click the elbow point on the right arm part.' },
                { name: 'right-wrist', label: 'Right Wrist', description: 'Click the wrist point on the right arm part.' }
            ]),
            ...make('l-arm', [
                { name: 'left-elbow', label: 'Left Elbow', description: 'Click the elbow point on the left arm part.' },
                { name: 'left-wrist', label: 'Left Wrist', description: 'Click the wrist point on the left arm part.' }
            ]),
            ...make('r-leg', [
                { name: 'right-knee', label: 'Right Knee', description: 'Click the knee point on the right leg part.' },
                { name: 'right-ankle', label: 'Right Ankle', description: 'Click the ankle point on the right leg part.' }
            ]),
            ...make('l-leg', [
                { name: 'left-knee', label: 'Left Knee', description: 'Click the knee point on the left leg part.' },
                { name: 'left-ankle', label: 'Left Ankle', description: 'Click the ankle point on the left leg part.' }
            ])
        ];
    },

    _bslUpdateManualJointStep(panel, payload) {
        if (!panel) return;
        const copyEl = panel.querySelector('#bsl-joint-guide-copy');
        const nextEl = panel.querySelector('#bsl-joint-guide-next');
        const indicator = panel.querySelector('#bsl-step-indicator');
        const step = payload?.step || null;
        const index = payload?.index ?? 0;
        const total = payload?.total ?? 0;
        if (indicator) indicator.textContent = 'Step 2/3';
        if (copyEl) {
            if (step) {
                const objName = step.obj?.name || 'part';
                const esc = (typeof Utils !== 'undefined' && Utils.escapeHtml) ? Utils.escapeHtml : (s => String(s));
                const safeLabel = esc(step.label || step.name || '');
                const safeDesc  = esc(step.description || 'Click the next joint point.');
                const safeName  = esc(objName);
                copyEl.innerHTML = `<strong>${index + 1}/${total}: ${safeLabel}</strong><br>${safeDesc}<br><span style="color:#94a3b8;">Target: ${safeName}</span>`;
            } else {
                copyEl.textContent = 'Click the requested limb joints on the sliced parts.';
            }
        }
        if (nextEl) {
            if (step) {
                nextEl.textContent = 'Joint contours will size themselves from the limb width and auto-sample color at each joint point.';
            } else {
                nextEl.textContent = '';
            }
        }
    },

    _bslShowCompletionStep(panel, partCount, assembledCount, learnedSaved, options = {}) {
        if (!panel) return;
        const toolName = panel.dataset.workflow === 'character-cutter' ? 'Character Cutter' : 'Body Slicer';
        panel.querySelector('#bsl-step-adjust')?.classList.add('hidden');
        panel.querySelector('#bsl-step-joints')?.classList.add('hidden');
        panel.querySelector('#bsl-step-done')?.classList.remove('hidden');
        const indicator = panel.querySelector('#bsl-step-indicator');
        if (indicator) indicator.textContent = options.stepLabel || 'Step 2/2';
        const doneMsg = panel.querySelector('#bsl-done-msg');
        if (doneMsg) {
            const jointNote = options.jointNote ? ` ${options.jointNote}` : '';
            doneMsg.textContent = `${toolName} created ${partCount} parts and assembled ${assembledCount} shoulder/hip joints${jointNote}${learnedSaved ? ' Learned layout saved.' : ''}`;
        }
        if (options.cutReview) {
            this._renderCutReview?.(panel, '#bsl-cut-review', options.cutReview, options.createdParts);
        }
        this._setCuttingCompletionHandler?.(panel);
        panel.querySelector('#bsl-btn-movements').onclick = () => {
            this._clearCuttingCompletionHandler?.();
            panel.remove();
            this.showMovementPicker();
        };
        panel.querySelector('#bsl-btn-poses').onclick = () => {
            this._clearCuttingCompletionHandler?.();
            panel.remove();
            this.showPoseLibrary();
        };
        panel.querySelector('#bsl-btn-armature').onclick = () => {
            this._clearCuttingCompletionHandler?.();
            panel.remove();
            this._bslApplyArmatureJointChain();
            this.openArmaturePanel();
        };
    },

    /**
     * Compute the cross-axis center of opaque pixels at each joint position
     * on a trimmed canvas, returning joint specs with accurate crossOffset.
     */
    _bslComputeImageJointCrossOffsets(canvas, roleKey) {
        const specs = this._getArmaturePromotionJointSpecs(roleKey);
        if (!canvas || !specs?.length) return specs;
        const w = canvas.width;
        const h = canvas.height;
        if (w < 2 || h < 2) return specs;

        const dirStr = this._getArmaturePromotionJointDirection(roleKey);
        const isReverse = dirStr === 'vertical-bt';
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        const imgData = ctx.getImageData(0, 0, w, h);
        const px = imgData.data;

        const findSpansAtRow = (row) => {
            const clampedRow = Math.max(0, Math.min(h - 1, row));
            const spans = [];
            let startX = -1;
            for (let x = 0; x <= w; x++) {
                const alpha = x < w ? px[(clampedRow * w + x) * 4 + 3] : 0;
                if (alpha > 10) {
                    if (startX < 0) startX = x;
                } else if (startX >= 0) {
                    const endX = x - 1;
                    spans.push({
                        start: startX,
                        end: endX,
                        center: (startX + endX) / 2,
                        width: endX - startX + 1
                    });
                    startX = -1;
                }
            }
            return spans;
        };

        const findDominantCenterAtRow = (row) => {
            const spans = findSpansAtRow(row);
            if (!spans.length) return null;
            const imageCenter = (w - 1) * 0.5;
            const span = spans.reduce((best, candidate) => {
                if (!best) return candidate;
                if (candidate.width > best.width + 0.001) return candidate;
                if (best.width > candidate.width + 0.001) return best;
                return Math.abs(candidate.center - imageCenter) < Math.abs(best.center - imageCenter)
                    ? candidate
                    : best;
            }, null);
            if (!span) return null;

            return {
                center: span.center,
                width: span.width
            };
        };

        return specs.map(spec => {
            const pos = spec.position;
            const mainPixel = isReverse
                ? Math.round((1 - pos) * (h - 1))
                : Math.round(pos * (h - 1));
            const band = Math.max(2, Math.round(h * 0.025));
            let weightedCenter = 0;
            let totalWeight = 0;
            let weightedWidth = 0;  // pixel width at the joint, weighted same as center

            for (let delta = 0; delta <= band; delta++) {
                const rows = delta === 0
                    ? [mainPixel]
                    : [mainPixel - delta, mainPixel + delta];
                for (const row of rows) {
                    if (row < 0 || row >= h) continue;
                    const span = findDominantCenterAtRow(row);
                    if (!span) continue;
                    const distanceWeight = 1 / (1 + delta * 1.5);
                    const widthWeight = Math.max(1, span.width);
                    const weight = distanceWeight * widthWeight;
                    weightedCenter += span.center * weight;
                    weightedWidth += span.width * weight;
                    totalWeight += weight;
                }
            }

            const crossOffset = totalWeight > 0
                ? Math.max(0.05, Math.min(0.95, weightedCenter / totalWeight / Math.max(1, w - 1)))
                : 0.5;

            // Derive contourSize from the actual pixel diameter at this joint —
            // the disc should fit the limb's cross-section at that exact point.
            // Normalize the pixel width to the part's cross-axis dimension (w for
            // a vertical limb). Clamp to a sensible range so tiny gaps (e.g. at
            // the wrist) don't make the contour invisible, and wide shoulders
            // don't make it enormous.
            let contourSize = spec.contourSize;   // keep any caller override
            if (!Number.isFinite(contourSize) || contourSize == null) {
                const pixelWidth = totalWeight > 0 ? weightedWidth / totalWeight : w * 0.5;
                const raw = pixelWidth / Math.max(1, w);
                contourSize = Math.max(0.25, Math.min(1.0, raw));
            }

            return { ...spec, crossOffset, contourSize };
        });
    },

    _bslMergeJointSpecs(baseSpecs, landmarkSpecs) {
        const base = Array.isArray(baseSpecs) ? baseSpecs : [];
        const hints = Array.isArray(landmarkSpecs) ? landmarkSpecs : [];
        if (!hints.length) return base;
        const byName = new Map(hints.map(spec => [String(spec?.name || '').toLowerCase(), spec]));
        return base.map(spec => {
            const hint = byName.get(String(spec?.name || '').toLowerCase());
            if (!hint) return spec;
            return {
                ...spec,
                position: Number.isFinite(hint.position) ? hint.position : spec.position
                // crossOffset is deliberately NOT taken from hint — always use the
                // pixel-scanner value (hint.crossOffset is never reliable: hip
                // lands at the cut line, elbow is a 50% guess, etc.).
            };
        });
    },

    _bslLandmarkToStagePoint(sourceObj, key) {
        const lm = this._bslLandmarks?.[key];
        if (!sourceObj || !lm) return null;
        return {
            x: sourceObj.x + this._clamp01(lm.x) * Math.max(1, sourceObj.width || 1),
            y: sourceObj.y + this._clamp01(lm.y) * Math.max(1, sourceObj.height || 1)
        };
    },

    _bslInferPartJointDirection(partKey, partObj, roleKey = '') {
        const key = String(partKey || roleKey || '').toLowerCase();
        const role = String(roleKey || partObj?._armatureRoleKey || partObj?._armaturePartKey || '').toLowerCase();
        const isArm = /(^|[-])(r|l)-arm$/.test(key)
            || /(right|left|front|back)-arm$/.test(role)
            || /arm$/.test(key);
        if (!isArm || !partObj) return this._getArmaturePromotionJointDirection?.(role || key) || 'vertical-tb';

        const width = Math.max(1, Number(partObj.width) || 1);
        const height = Math.max(1, Number(partObj.height) || 1);
        const looksHorizontal = width >= height * 1.08;
        if (!looksHorizontal) return 'vertical-tb';

        // Viewer-left arm parts have their shoulder near the inside/right edge;
        // viewer-right arm parts have their shoulder near the inside/left edge.
        if (/^(l-arm|left-arm)$/i.test(key) || /left-arm$/i.test(role)) return 'horizontal-rl';
        if (/^(r-arm|right-arm)$/i.test(key) || /right-arm$/i.test(role)) return 'horizontal-lr';
        return 'horizontal-lr';
    },

    _bslPointToPartJointSpec(partObj, name, point, fallback = {}) {
        if (!partObj || !name) return null;
        const width = Math.max(1, Number(partObj.width) || 1);
        const height = Math.max(1, Number(partObj.height) || 1);
        const hasPoint = Number.isFinite(point?.x) && Number.isFinite(point?.y);
        const direction = StageObject.getJointDirectionMeta(fallback.direction || partObj.jointDirection || 'vertical-tb');
        const axisRaw = hasPoint
            ? (direction.isVertical
                ? (point.y - Number(partObj.y || 0)) / height
                : (point.x - Number(partObj.x || 0)) / width)
            : null;
        const position = hasPoint
            ? (direction.isReverse ? 1 - axisRaw : axisRaw)
            : fallback.position;
        const crossOffset = hasPoint
            ? (direction.isVertical
                ? (point.x - Number(partObj.x || 0)) / width
                : (point.y - Number(partObj.y || 0)) / height)
            : fallback.crossOffset;
        return {
            name,
            position: this._clamp01(Number.isFinite(position) ? position : (fallback.position ?? 0.5)),
            // crossOffset is intentionally omitted here — it must come from the
            // pixel scanner (_bslComputeImageJointCrossOffsets) which measures the
            // actual pixel center at each joint row.  Landmark-derived crossOffset
            // values are unreliable (the hip landmark lands at the body-center
            // split line, giving ~0; elbow interpolation gives 0.5), so we let
            // _bslMergeJointSpecs keep the scanned value by not including it.
        };
    },

    _bslInterpolateStagePoints(a, b, t = 0.5) {
        if (!a || !b) return null;
        return {
            x: a.x + (b.x - a.x) * t,
            y: a.y + (b.y - a.y) * t
        };
    },

    _bslBuildLandmarkJointHints(createdParts, sourceObj) {
        if (!this._bslUsesPoseArmatureCutAssembly() || !this._bslLandmarks || !sourceObj) return null;
        const hints = {};
        const add = (roleKey, specs) => {
            const clean = (specs || []).filter(spec => spec && Number.isFinite(spec.position));
            if (clean.length) hints[roleKey] = clean;
        };
        const bottomPointForPart = (partObj, biasX = 0.5) => {
            if (!partObj) return null;
            return {
                x: Number(partObj.x || 0) + Math.max(0.05, Math.min(0.95, biasX)) * Math.max(1, Number(partObj.width) || 1),
                y: Number(partObj.y || 0) + Math.max(1, Number(partObj.height) || 1)
            };
        };

        const rArm = createdParts?.['r-arm'];
        const lArm = createdParts?.['l-arm'];
        const rLeg = createdParts?.['r-leg'];
        const lLeg = createdParts?.['l-leg'];
        const torso = createdParts?.torso;
        const head = createdParts?.head;
        const rArmDirection = this._bslInferPartJointDirection('r-arm', rArm, 'right-arm');
        const lArmDirection = this._bslInferPartJointDirection('l-arm', lArm, 'left-arm');
        const endpointForPart = (partObj, directionKey = 'vertical-tb', crossBias = 0.5) => {
            if (!partObj) return null;
            const direction = StageObject.getJointDirectionMeta(directionKey);
            const x = direction.isVertical
                ? Number(partObj.x || 0) + Math.max(0.05, Math.min(0.95, crossBias)) * Math.max(1, Number(partObj.width) || 1)
                : Number(partObj.x || 0) + (direction.isReverse ? 0 : Math.max(1, Number(partObj.width) || 1));
            const y = direction.isVertical
                ? Number(partObj.y || 0) + Math.max(1, Number(partObj.height) || 1)
                : Number(partObj.y || 0) + Math.max(0.05, Math.min(0.95, crossBias)) * Math.max(1, Number(partObj.height) || 1);
            return { x, y };
        };

        const neckPoint = this._bslLandmarkToStagePoint(sourceObj, 'neck');
        add('head-neck', [
            this._bslPointToPartJointSpec(head, 'neck', neckPoint, { position: 0.10, direction: 'vertical-bt' })
        ]);

        const waistPoint = this._bslLandmarkToStagePoint(sourceObj, 'rightHip');
        add('torso', [
            this._bslPointToPartJointSpec(torso, 'waist', waistPoint, { position: 0.30, direction: 'vertical-bt' })
        ]);

        const rShoulder = this._bslLandmarkToStagePoint(sourceObj, 'leftShoulder');
        const rArmpit = this._bslLandmarkToStagePoint(sourceObj, 'leftArmpit') || rShoulder;
        const rHand = this._bslLandmarkToStagePoint(sourceObj, 'leftHand') || endpointForPart(rArm, rArmDirection, 0.5);
        const rElbow = this._bslInterpolateStagePoints(rArmpit, rHand, 0.48);
        add('right-arm', [
            this._bslPointToPartJointSpec(rArm, 'right-shoulder', rShoulder, { position: 0.06, crossOffset: 0.5, direction: rArmDirection }),
            this._bslPointToPartJointSpec(rArm, 'right-elbow', rElbow, { position: 0.42, crossOffset: 0.5, direction: rArmDirection }),
            this._bslPointToPartJointSpec(rArm, 'right-wrist', rHand, { position: 0.78, crossOffset: 0.5, direction: rArmDirection })
        ]);

        const lShoulder = this._bslLandmarkToStagePoint(sourceObj, 'rightShoulder');
        const lArmpit = this._bslLandmarkToStagePoint(sourceObj, 'rightArmpit') || lShoulder;
        const lHand = this._bslLandmarkToStagePoint(sourceObj, 'rightHand') || endpointForPart(lArm, lArmDirection, 0.5);
        const lElbow = this._bslInterpolateStagePoints(lArmpit, lHand, 0.48);
        add('left-arm', [
            this._bslPointToPartJointSpec(lArm, 'left-shoulder', lShoulder, { position: 0.06, crossOffset: 0.5, direction: lArmDirection }),
            this._bslPointToPartJointSpec(lArm, 'left-elbow', lElbow, { position: 0.42, crossOffset: 0.5, direction: lArmDirection }),
            this._bslPointToPartJointSpec(lArm, 'left-wrist', lHand, { position: 0.78, crossOffset: 0.5, direction: lArmDirection })
        ]);

        const rHip = this._bslLandmarkToStagePoint(sourceObj, 'leftHip');
        const rAnkle = bottomPointForPart(rLeg, 0.5);
        const rKnee = this._bslInterpolateStagePoints(rHip, rAnkle, 0.48);
        add('right-leg', [
            this._bslPointToPartJointSpec(rLeg, 'right-hip', rHip, { position: 0.06, crossOffset: 0.5 }),
            this._bslPointToPartJointSpec(rLeg, 'right-knee', rKnee, { position: 0.44, crossOffset: 0.5 }),
            this._bslPointToPartJointSpec(rLeg, 'right-ankle', rAnkle, { position: 0.84, crossOffset: 0.5 })
        ]);

        const lHip = this._bslLandmarkToStagePoint(sourceObj, 'rightHip');
        const lAnkle = bottomPointForPart(lLeg, 0.5);
        const lKnee = this._bslInterpolateStagePoints(lHip, lAnkle, 0.48);
        add('left-leg', [
            this._bslPointToPartJointSpec(lLeg, 'left-hip', lHip, { position: 0.06, crossOffset: 0.5 }),
            this._bslPointToPartJointSpec(lLeg, 'left-knee', lKnee, { position: 0.44, crossOffset: 0.5 }),
            this._bslPointToPartJointSpec(lLeg, 'left-ankle', lAnkle, { position: 0.84, crossOffset: 0.5 })
        ]);

        return Object.keys(hints).length ? hints : null;
    },

    _bslNormalizePairedLegPlacement(rLeg, lLeg) {
        if (!rLeg || !lLeg) return;
        const rHeight = Number(rLeg.height) || 0;
        const lHeight = Number(lLeg.height) || 0;
        const diff = lHeight - rHeight;
        if (Math.abs(diff) < 6) return;

        if (diff > 0) {
            lLeg.pinOffsetY = (Number(lLeg.pinOffsetY) || 0) - (diff * 0.5);
        } else {
            rLeg.pinOffsetY = (Number(rLeg.pinOffsetY) || 0) + (diff * 0.5);
        }
    },

    /**
     * Assemble sliced parts using the Pose Armature joint/pin system directly,
     * identical to how createFrontPoseArmatureDummy works but with image parts.
     * No slicer assembly (_autoAssembleParts) is used at all.
     */
    _bslAssembleAsPoseArmature(createdParts, inferredShoulderPivots, panel, sourceObj, landmarkJointHints = null) {
        const torso = createdParts['torso'];
        const head = createdParts['head'];
        const rArm = createdParts['r-arm'];
        const lArm = createdParts['l-arm'];
        const rLeg = createdParts['r-leg'];
        const lLeg = createdParts['l-leg'];

        if (!torso) {
            Utils.showToast('Torso part not found — cannot assemble as Pose Armature', 'warning');
            return;
        }

        // ── Name parts to match armature convention ──
        const nameMap = { torso: 'Torso', head: 'Head Neck', 'r-arm': 'Right Arm', 'l-arm': 'Left Arm', 'r-leg': 'Right Leg', 'l-leg': 'Left Leg' };
        const roleMap = { torso: 'torso', head: 'head-neck', 'r-arm': 'right-arm', 'l-arm': 'left-arm', 'r-leg': 'right-leg', 'l-leg': 'left-leg' };

        Object.entries(createdParts).forEach(([key, obj]) => {
            if (nameMap[key]) obj.name = nameMap[key];
            if (roleMap[key]) {
                obj._armatureRoleKey = roleMap[key];
                obj._armaturePartKey = roleMap[key];
            }
        });

        // ── Apply armature joint chains with pixel-accurate cross-offsets ──
        let headTrimmedCanvas = null;  // save for scalp hair generation
        let torsoTrimmedCanvas = null; // save for torso back-view overlay
        Object.entries(createdParts).forEach(([key, obj]) => {
            const roleKey = roleMap[key];
            if (roleKey) {
                const canvas = obj._tempTrimmedCanvas || null;
                if (key === 'head' && canvas) headTrimmedCanvas = canvas;
                if (key === 'torso' && canvas) torsoTrimmedCanvas = canvas;
                const customDirection = this._bslInferPartJointDirection(key, obj, roleKey);
                // Always run the pixel scanner so crossOffset and contourSize are
                // measured from actual pixels, regardless of whether the inferred
                // direction matches the default. The direction mismatch gate was
                // silently skipping the scan for non-standard arm orientations.
                const imageSpecs = canvas
                    ? this._bslComputeImageJointCrossOffsets(canvas, roleKey)
                    : null;
                if (this._bslUsesPoseArmatureCutAssembly() && imageSpecs?.length) {
                    const toolName = this._bslLaunchMode === 'character-cutter' ? 'Character Cutter' : 'Body Slicer';
                    console.log(`[${toolName}] pixel joint specs for ${key} (${roleKey}):`,
                        imageSpecs.map(s => `${s.name}: pos=${Math.round(s.position*100)}% cross=${Math.round((s.crossOffset??0.5)*100)}% size=${s.contourSize!=null?Math.round(s.contourSize*100)+'%':'n/a'}`).join('  |  '));
                }
                const customSpecs = this._bslMergeJointSpecs(
                    imageSpecs || this._getArmaturePromotionJointSpecs(roleKey),
                    landmarkJointHints?.[roleKey]
                );
                const opts = { allowTorso: true, contourScale: this._bslUsesPoseArmatureCutAssembly() ? 0.5 : 0.62 };
                if (customSpecs?.length) opts.customSpecs = customSpecs;
                if (customDirection) opts.customDirection = customDirection;
                this._applyArmatureJointChainToObject(obj, roleKey, opts);
                delete obj._tempTrimmedCanvas;
            }
        });

        // ── Set pivots (same as slicer preset) ──
        if (torso) { torso.pivotX = 0.5; torso.pivotY = 0.3; }
        if (head) { head.pivotX = 0.5; head.pivotY = 1.0; }
        if (rArm) { const p = inferredShoulderPivots['r-arm'] || { x: 0.32, y: 0.10 }; rArm.pivotX = p.x; rArm.pivotY = p.y; }
        if (lArm) { const p = inferredShoulderPivots['l-arm'] || { x: 0.68, y: 0.10 }; lArm.pivotX = p.x; lArm.pivotY = p.y; }
        if (rLeg) { rLeg.pivotX = 0.5; rLeg.pivotY = 0.0; }
        if (lLeg) { lLeg.pivotX = 0.5; lLeg.pivotY = 0.0; }

        // ── Pin children to torso using armature-style pins ──
        if (head)  this._configureDummyArmaturePin(head, torso, 0.50, 0.06, 'inherit');
        if (rArm)  this._configureDummyArmaturePin(rArm, torso, 0.92, 0.22, 'inherit');
        if (lArm)  this._configureDummyArmaturePin(lArm, torso, 0.08, 0.22, 'inherit');
        if (rLeg)  this._configureDummyArmaturePin(rLeg, torso, 0.64, 0.84, 'inherit');
        if (lLeg)  this._configureDummyArmaturePin(lLeg, torso, 0.36, 0.84, 'inherit');
        this._bslNormalizePairedLegPlacement(rLeg, lLeg);
        torso._armatureFrontBackFacing = 'front';
        torso._bslSkipTorsoAttachmentRig = true;

        // ── Stamp detected pose so the armature and animation engine can note it ──
        const detectedPose = this._bslDetectedPose || 'idle';
        torso._armaturePose = detectedPose;
        Object.values(createdParts).forEach(p => { p._armaturePose = detectedPose; });
        if (detectedPose !== 'idle') {
            // Non-idle pose note: remind the user that motion/pose animations may
            // need adjustment because the source character isn't in an idle stance.
            const poseLabel = detectedPose === 't-pose' ? 'T-Pose (arms horizontal)' :
                              detectedPose === 'arms-raised' ? 'arms raised' : 'arms outstretched';
            console.log(`[Character Cutter] non-idle pose tagged: ${detectedPose} — consider adjusting the default arm angles in the armature panel.`);
            setTimeout(() => Utils.showToast(
                `Pose detected: ${poseLabel}. Adjust the default arm angles in the Armature panel if movements look off.`,
                'info', 6000
            ), 800);
        }

        // ── Resolve pins ──
        if (this.objects._resolvePins) this.objects._resolvePins();

        // ── Select all parts ──
        const allIds = Object.values(createdParts).map(o => o.id);
        this.objects.select(allIds);

        // ── Save learned layout if enabled ──
        const learnEnabled = panel.querySelector('#bsl-learn-mode')?.checked;
        const learnedSaved = learnEnabled ? this._bslSaveTrainingSample(panel, true) : false;

        // ── Hide source image ──
        sourceObj.opacity = 0;
        sourceObj.visible = false;

        // ── Clean up slicer ──
        this._bslDidCut = true;
        this._exitBodySlicer();
        this.objects.updateObjectList();
        this.objects.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');

        if (!this._skeletonVisible) this.toggleSkeleton();

        const partCount = Object.keys(createdParts).length;
        const toolName = panel?.dataset?.workflow === 'character-cutter' ? 'Character Cutter' : 'Body Slicer';
        Utils.showToast(`${toolName} complete - ${partCount} parts assembled with Pose Armature joint system`, 'success');

        // ── Go straight to armature panel ──
        document.removeEventListener('keydown', this._bslKeyHandler);
        panel.remove();

        // ── Generate back-view overlays ──
        // These are BACK-VIEW-only assets (hair over the face, torso back). A
        // front-facing Character Cutter character must keep to its own view, so
        // skip them there — otherwise a stray "Scalp Hair (Back View)" object is
        // added to a plain front character.
        const skipBackViewOverlays = this._bslUsesPoseArmatureCutAssembly()
            || this._bslLaunchMode === 'character-cutter'
            || panel?.dataset?.workflow === 'character-cutter';
        if (head && !skipBackViewOverlays) {
            this._generateBackViewScalpHair(head, torso, headTrimmedCanvas);
        }
        if (torso && !skipBackViewOverlays) {
            this._generateBackViewTorsoOverlay(torso, torsoTrimmedCanvas);
        }

        this.openArmaturePanel();
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  Back-view scalp hair overlay
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Generate a scalp hair overlay image from the head-neck part.
     * Samples hair color from the top of the head, then creates a filled
     * silhouette covering the face area. Stored as a hidden stage object
     * pinned to the head-neck part — toggled on back view, hidden on front.
     */
    _generateBackViewScalpHair(headObj, torsoObj, fallbackCanvas) {
        if (!headObj || headObj.type !== 'image') return null;
        const img = headObj.imageElement || headObj._eraserCanvas || fallbackCanvas;
        if (!img) return null;

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        if (!srcW || !srcH) return null;

        // ── Sample hair color from top 15% of the head image ──
        const sampleCanvas = document.createElement('canvas');
        sampleCanvas.width = srcW;
        sampleCanvas.height = srcH;
        const sampleCtx = sampleCanvas.getContext('2d', { willReadFrequently: true });
        sampleCtx.drawImage(img, 0, 0, srcW, srcH);
        const imgData = sampleCtx.getImageData(0, 0, srcW, srcH);
        const px = imgData.data;

        const sampleEndRow = Math.round(srcH * 0.15);
        let rSum = 0, gSum = 0, bSum = 0, count = 0;
        for (let y = 0; y < sampleEndRow; y++) {
            for (let x = 0; x < srcW; x++) {
                const i = (y * srcW + x) * 4;
                if (px[i + 3] < 128) continue;
                rSum += px[i]; gSum += px[i + 1]; bSum += px[i + 2]; count++;
            }
        }
        if (count < 10) return null;  // not enough opaque pixels

        const hairR = Math.round(rSum / count);
        const hairG = Math.round(gSum / count);
        const hairB = Math.round(bSum / count);
        const hairColor = `rgb(${hairR},${hairG},${hairB})`;

        // ── Build the scalp shape from the head silhouette ──
        // Trace the outline, then fill with hair color
        const outCanvas = document.createElement('canvas');
        outCanvas.width = srcW;
        outCanvas.height = srcH;
        const outCtx = outCanvas.getContext('2d');

        // Step 1: Fill entire silhouette with hair color
        outCtx.fillStyle = hairColor;
        outCtx.fillRect(0, 0, srcW, srcH);

        // Step 2: Use the head alpha as a mask (only draw where head pixels exist)
        outCtx.globalCompositeOperation = 'destination-in';
        outCtx.drawImage(img, 0, 0, srcW, srcH);
        outCtx.globalCompositeOperation = 'source-over';

        // Step 3: Add subtle shading — slightly darker edges
        const edgeGrad = outCtx.createRadialGradient(
            srcW * 0.5, srcH * 0.35, srcW * 0.15,
            srcW * 0.5, srcH * 0.35, srcW * 0.55
        );
        edgeGrad.addColorStop(0, 'rgba(255,255,255,0.08)');
        edgeGrad.addColorStop(1, `rgba(0,0,0,0.15)`);
        outCtx.globalCompositeOperation = 'source-atop';
        outCtx.fillStyle = edgeGrad;
        outCtx.fillRect(0, 0, srcW, srcH);
        outCtx.globalCompositeOperation = 'source-over';

        // Step 4: Add hairline texture — horizontal stripes
        outCtx.globalCompositeOperation = 'source-atop';
        outCtx.strokeStyle = `rgba(0,0,0,0.06)`;
        outCtx.lineWidth = Math.max(1, srcH * 0.003);
        for (let y = 0; y < srcH; y += Math.max(2, Math.round(srcH * 0.012))) {
            const wobble = Math.sin(y * 0.3) * srcW * 0.01;
            outCtx.beginPath();
            outCtx.moveTo(wobble, y);
            outCtx.lineTo(srcW + wobble, y);
            outCtx.stroke();
        }
        outCtx.globalCompositeOperation = 'source-over';

        const dataUrl = outCanvas.toDataURL('image/png');

        // ── Create a stage object for the hair overlay ──
        const hairObj = new StageObject('image', {
            x: headObj.x,
            y: headObj.y,
            width: headObj.width,
            height: headObj.height,
            imageSrc: dataUrl,
            name: 'Scalp Hair (Back View)',
            layer: headObj.layer,
            opacity: 1,
            visible: false   // starts hidden (front view)
        });
        this.objects.addObject(hairObj);

        // Pin to head-neck with zero offset (exactly overlaid)
        hairObj.pinnedTo = headObj.id;
        hairObj.pinTargetType = 'anchor';
        hairObj.pinAnchorX = headObj.pivotX ?? 0.5;
        hairObj.pinAnchorY = headObj.pivotY ?? 0.5;
        hairObj.pinOffsetX = 0;
        hairObj.pinOffsetY = 0;
        hairObj.pinRotationMode = 'inherit';
        hairObj.pinInheritRotation = true;
        hairObj.pivotX = headObj.pivotX ?? 0.5;
        hairObj.pivotY = headObj.pivotY ?? 0.5;

        // Tag so we can find it later
        hairObj._backViewScalpHair = true;
        hairObj._backViewScalpHairParentId = headObj.id;
        headObj._backViewScalpHairId = hairObj.id;

        if (this.objects._resolvePins) this.objects._resolvePins();

        return hairObj;
    },

    /**
     * Toggle scalp hair visibility based on front/back facing.
     * Called from _applyArmatureFrontBackChoice.
     */
    _syncBackViewScalpHair(armature, facing) {
        if (!armature?.parts) return false;
        const isBack = String(facing || '').toLowerCase() === 'back';
        const headObj = armature.parts?.['head-neck']?.obj || armature.parts?.head?.obj || null;
        if (!headObj?.id) return false;
        const allObjs = this.objects?.objects || [];
        let changed = false;

        allObjs.forEach(obj => {
            const isScalpHair = obj._backViewScalpHair ||
                                obj.name === 'Scalp Hair (Back View)';
            if (!isScalpHair) return;
            const belongsToHead = obj._backViewScalpHairParentId === headObj.id || obj.pinnedTo === headObj.id;
            if (!belongsToHead) return;
            if (!obj._backViewScalpHair) obj._backViewScalpHair = true;
            if (!obj._backViewScalpHairParentId) obj._backViewScalpHairParentId = headObj.id;
            const shouldShow = isBack;
            if (obj.visible !== shouldShow) {
                obj.visible = shouldShow;
                changed = true;
            }
        });

        return changed;
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  Back-view torso overlay
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Generate a back-view torso overlay that covers front-facing details
     * (collar, neckline, buttons, etc.) with the dominant clothing color.
     * Samples the most common opaque color in the torso image, then fills
     * the silhouette with that color plus subtle fabric-style shading.
     * Pinned to the torso and toggled on back view.
     */
    _generateBackViewTorsoOverlay(torsoObj, fallbackCanvas) {
        if (!torsoObj || torsoObj.type !== 'image') return null;
        const img = torsoObj.imageElement || torsoObj._eraserCanvas || fallbackCanvas;
        if (!img) return null;

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        if (!srcW || !srcH) return null;

        // ── Sample dominant color using a quantized histogram ──
        const sCanvas = document.createElement('canvas');
        sCanvas.width = srcW;
        sCanvas.height = srcH;
        const sCtx = sCanvas.getContext('2d', { willReadFrequently: true });
        sCtx.drawImage(img, 0, 0, srcW, srcH);
        const imgData = sCtx.getImageData(0, 0, srcW, srcH);
        const px = imgData.data;

        // Quantize to 8-level buckets (32 per channel) for histogram
        const colorBuckets = new Map();
        for (let i = 0; i < px.length; i += 4) {
            if (px[i + 3] < 128) continue;  // skip transparent
            const qr = (px[i] >> 5) << 5;
            const qg = (px[i + 1] >> 5) << 5;
            const qb = (px[i + 2] >> 5) << 5;
            const key = (qr << 16) | (qg << 8) | qb;
            const entry = colorBuckets.get(key);
            if (entry) {
                entry.count++;
                entry.rSum += px[i];
                entry.gSum += px[i + 1];
                entry.bSum += px[i + 2];
            } else {
                colorBuckets.set(key, { count: 1, rSum: px[i], gSum: px[i + 1], bSum: px[i + 2] });
            }
        }

        if (!colorBuckets.size) return null;

        // Pick the bucket with the most pixels, then average its true colors
        let best = null;
        colorBuckets.forEach(entry => {
            if (!best || entry.count > best.count) best = entry;
        });

        const domR = Math.round(best.rSum / best.count);
        const domG = Math.round(best.gSum / best.count);
        const domB = Math.round(best.bSum / best.count);
        const domColor = `rgb(${domR},${domG},${domB})`;

        // ── Build the overlay: silhouette filled with dominant color ──
        const outCanvas = document.createElement('canvas');
        outCanvas.width = srcW;
        outCanvas.height = srcH;
        const outCtx = outCanvas.getContext('2d');

        // Step 1: Fill with dominant clothing color
        outCtx.fillStyle = domColor;
        outCtx.fillRect(0, 0, srcW, srcH);

        // Step 2: Mask to the torso silhouette
        outCtx.globalCompositeOperation = 'destination-in';
        outCtx.drawImage(img, 0, 0, srcW, srcH);
        outCtx.globalCompositeOperation = 'source-over';

        // Step 3: Subtle center-to-edge shading (simulates back fabric folds)
        const fabricGrad = outCtx.createRadialGradient(
            srcW * 0.5, srcH * 0.4, srcW * 0.1,
            srcW * 0.5, srcH * 0.4, srcW * 0.6
        );
        fabricGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
        fabricGrad.addColorStop(0.6, 'rgba(0,0,0,0.03)');
        fabricGrad.addColorStop(1, 'rgba(0,0,0,0.10)');
        outCtx.globalCompositeOperation = 'source-atop';
        outCtx.fillStyle = fabricGrad;
        outCtx.fillRect(0, 0, srcW, srcH);

        // Step 4: Very subtle vertical seam line down the center back
        outCtx.strokeStyle = 'rgba(0,0,0,0.04)';
        outCtx.lineWidth = Math.max(1, srcW * 0.004);
        outCtx.beginPath();
        outCtx.moveTo(srcW * 0.5, srcH * 0.05);
        outCtx.lineTo(srcW * 0.5, srcH * 0.95);
        outCtx.stroke();
        outCtx.globalCompositeOperation = 'source-over';

        const dataUrl = outCanvas.toDataURL('image/png');

        // ── Create the stage object ──
        const overlayObj = new StageObject('image', {
            x: torsoObj.x,
            y: torsoObj.y,
            width: torsoObj.width,
            height: torsoObj.height,
            imageSrc: dataUrl,
            name: 'Torso (Back View)',
            layer: torsoObj.layer,
            opacity: 1,
            visible: false   // starts hidden (front view)
        });
        this.objects.addObject(overlayObj);

        // Pin exactly on top of the torso (same pivot, zero offset)
        overlayObj.pinnedTo = torsoObj.id;
        overlayObj.pinTargetType = 'anchor';
        overlayObj.pinAnchorX = torsoObj.pivotX ?? 0.5;
        overlayObj.pinAnchorY = torsoObj.pivotY ?? 0.3;
        overlayObj.pinOffsetX = 0;
        overlayObj.pinOffsetY = 0;
        overlayObj.pinRotationMode = 'inherit';
        overlayObj.pinInheritRotation = true;
        overlayObj.pivotX = torsoObj.pivotX ?? 0.5;
        overlayObj.pivotY = torsoObj.pivotY ?? 0.3;

        // Tag for detection
        overlayObj._backViewTorsoOverlay = true;
        overlayObj._backViewTorsoOverlayParentId = torsoObj.id;
        torsoObj._backViewTorsoOverlayId = overlayObj.id;

        if (this.objects._resolvePins) this.objects._resolvePins();
        return overlayObj;
    },

    /**
     * Toggle torso back-view overlay visibility based on front/back facing.
     */
    _syncBackViewTorsoOverlay(armature, facing) {
        if (!armature?.parts) return false;
        const isBack = String(facing || '').toLowerCase() === 'back';
        const torsoObj = armature.parts?.torso?.obj || null;
        if (!torsoObj?.id) return false;
        const allObjs = this.objects?.objects || [];
        let changed = false;

        allObjs.forEach(obj => {
            const isTorsoOverlay = obj._backViewTorsoOverlay ||
                                   obj.name === 'Torso (Back View)';
            if (!isTorsoOverlay) return;
            const belongsToTorso = obj._backViewTorsoOverlayParentId === torsoObj.id || obj.pinnedTo === torsoObj.id;
            if (!belongsToTorso) return;
            if (!obj._backViewTorsoOverlay) obj._backViewTorsoOverlay = true;
            if (!obj._backViewTorsoOverlayParentId) obj._backViewTorsoOverlayParentId = torsoObj.id;
            const shouldShow = isBack;
            if (obj.visible !== shouldShow) {
                obj.visible = shouldShow;
                changed = true;
            }
        });

        return changed;
    },

    // ═══════════════════════════════════════════════════════════════════════
    //  Back-view foot rendering (heel shape replaces front-view foot)
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Generate a full-leg canvas where the foot portion (below ankle at ~80%)
     * is replaced with a back-view heel shape — flat on the ground, with
     * slight outward splay.  Returns a Canvas element (not a data URL).
     *
     * @param {HTMLImageElement|HTMLCanvasElement} imageSource – front-view leg
     * @param {string} role – 'right-leg' or 'left-leg' (after back-view role swap)
     */
    _generateBackViewFootCanvas(imageSource, role) {
        if (!imageSource) return null;
        const w = imageSource.naturalWidth || imageSource.width;
        const h = imageSource.naturalHeight || imageSource.height;
        if (!w || !h) return null;

        const ankleRatio = 0.80;
        const ankleY = Math.round(h * ankleRatio);
        const footH = h - ankleY;
        if (footH < 4) return null;

        // ── Full-size canvas with original leg image ──
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(imageSource, 0, 0, w, h);

        // ── Sample dominant shoe/foot colour from the foot area ──
        const pixData = ctx.getImageData(0, ankleY, w, footH);
        let rT = 0, gT = 0, bT = 0, n = 0;
        for (let i = 0; i < pixData.data.length; i += 4) {
            if (pixData.data[i + 3] > 128) {
                rT += pixData.data[i];
                gT += pixData.data[i + 1];
                bT += pixData.data[i + 2];
                n++;
            }
        }
        if (!n) return null;
        const avgR = Math.round(rT / n);
        const avgG = Math.round(gT / n);
        const avgB = Math.round(bT / n);

        // ── Measure ankle width from the pixel row at ankleY ──
        const ankleRow = ctx.getImageData(0, Math.min(ankleY, h - 1), w, 1);
        let aLeft = w, aRight = 0;
        for (let x = 0; x < w; x++) {
            if (ankleRow.data[x * 4 + 3] > 64) {
                aLeft = Math.min(aLeft, x);
                aRight = Math.max(aRight, x);
            }
        }
        if (aLeft >= aRight) { aLeft = w * 0.3; aRight = w * 0.7; }
        const aCx = (aLeft + aRight) / 2;
        const aW = aRight - aLeft;

        // ── Clear existing foot pixels ──
        ctx.clearRect(0, ankleY, w, footH);

        // ── Draw back-view foot / heel shape ──
        const isRight = role === 'right-leg';
        const heelHalfW = aW * 0.65;                                   // heel slightly wider than ankle
        const splay = (isRight ? 1 : -1) * Math.max(2, aW * 0.15);    // outward shift
        const cx = aCx + splay;
        const botY = ankleY + footH * 0.88;                            // sole line

        ctx.save();

        // Heel silhouette — a smooth bell from ankle edges down to flat sole
        ctx.beginPath();
        ctx.moveTo(aLeft, ankleY);
        ctx.quadraticCurveTo(
            cx - heelHalfW - 2, ankleY + footH * 0.35,
            cx - heelHalfW, botY
        );
        // flat sole
        ctx.lineTo(cx + heelHalfW, botY);
        ctx.quadraticCurveTo(
            cx + heelHalfW + 2, ankleY + footH * 0.35,
            aRight, ankleY
        );
        ctx.closePath();

        // Fill with sampled shoe colour
        ctx.fillStyle = `rgb(${avgR},${avgG},${avgB})`;
        ctx.fill();

        // Subtle heel shading (darker centre for depth)
        const grad = ctx.createRadialGradient(cx, ankleY + footH * 0.45, 0, cx, ankleY + footH * 0.45, heelHalfW);
        grad.addColorStop(0, 'rgba(0,0,0,0.10)');
        grad.addColorStop(0.7, 'rgba(0,0,0,0.03)');
        grad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = grad;
        ctx.fill();

        // Sole line at bottom
        const dR = Math.max(0, avgR - 45);
        const dG = Math.max(0, avgG - 45);
        const dB = Math.max(0, avgB - 45);
        ctx.beginPath();
        ctx.moveTo(cx - heelHalfW + 2, botY);
        ctx.lineTo(cx + heelHalfW - 2, botY);
        ctx.strokeStyle = `rgb(${dR},${dG},${dB})`;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Light outline
        ctx.beginPath();
        ctx.moveTo(aLeft, ankleY);
        ctx.quadraticCurveTo(cx - heelHalfW - 2, ankleY + footH * 0.35, cx - heelHalfW, botY);
        ctx.moveTo(cx + heelHalfW, botY);
        ctx.quadraticCurveTo(cx + heelHalfW + 2, ankleY + footH * 0.35, aRight, ankleY);
        ctx.strokeStyle = 'rgba(0,0,0,0.12)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
        return canvas;
    },

    /**
     * Toggle back-view foot appearance on leg objects by swapping the
     * runtime _eraserCanvas (never touches imageSrc or imageElement,
     * so serialisation stays clean).
     */
    _syncBackViewFeet(armature, facing) {
        if (!armature?.parts) return false;
        const isBack = String(facing || '').toLowerCase() === 'back';
        let changed = false;

        ['right-leg', 'left-leg'].forEach(role => {
            const entry = armature.parts[role];
            const obj = entry?.obj;
            if (!obj || obj.type !== 'image') return;

            if (isBack) {
                if (obj._backViewFootApplied) return;

                // Preserve the original _eraserCanvas (may be undefined)
                obj._savedFrontEraserCanvas = obj._eraserCanvas || null;
                obj._savedFrontHadEraser = !!obj._eraserCanvas;

                // Generate back-view foot canvas from best available source
                const source = obj._eraserCanvas || obj.imageElement;
                if (!source) return;
                const footCanvas = this._generateBackViewFootCanvas(source, role);
                if (!footCanvas) return;

                obj._eraserCanvas = footCanvas;
                obj._backViewFootApplied = true;
                changed = true;
            } else {
                if (!obj._backViewFootApplied) return;

                // Restore original _eraserCanvas
                if (obj._savedFrontHadEraser) {
                    obj._eraserCanvas = obj._savedFrontEraserCanvas;
                } else {
                    delete obj._eraserCanvas;
                }
                delete obj._savedFrontEraserCanvas;
                delete obj._savedFrontHadEraser;
                obj._backViewFootApplied = false;
                changed = true;
            }
        });

        return changed;
    },

    /**
     * Convert body-slicer parts to a clean pose-armature setup.
     * Strips slicer assembly properties (pinRotationMode:'joint', pinContour, etc.)
     * and replaces them with the armature's pin+joint conventions so that
     * openArmaturePanel → _ensureArmatureTorsoAttachmentRig works cleanly.
     */
    _bslApplyArmatureJointChain() {
        const allObjs = this.objects?.objects || [];
        const slicerParts = allObjs.filter(o =>
            o._armatureRoleKey && o.bodyPartData?.rigType === 'body-slicer'
        );
        if (!slicerParts.length) return;

        const root = slicerParts.find(o => o._armatureRoleKey === 'torso');
        const children = slicerParts.filter(o => o._armatureRoleKey !== 'torso');

        // ── 1. Apply armature joint chains to every part ──
        let changed = 0;
        slicerParts.forEach(obj => {
            const roleKey = obj._armatureRoleKey;
            const customDirection = this._bslInferPartJointDirection?.(roleKey, obj, roleKey);
            const opts = { allowTorso: true, contourScale: this._bslUsesPoseArmatureCutAssembly() ? 0.5 : 0.62 };
            if (customDirection) opts.customDirection = customDirection;
            if (this._applyArmatureJointChainToObject(obj, roleKey, opts)) {
                changed++;
            }
        });

        // ── 2. Convert children from slicer pin style to armature pin style ──
        children.forEach(obj => {
            // Strip slicer-specific assembly properties
            obj.pinRotationMode = 'inherit';
            obj.pinInheritRotation = true;
            obj.pinContour = false;
            obj.pinContourColor = null;
            obj.contourRotation = 0;
            obj.contourSize = 0;
            delete obj.jointBaseAngle;

            // Let _ensureArmatureTorsoAttachmentRig handle pinTargetType/pinJointId
            // by clearing them so it detects they need setup
            obj.pinTargetType = 'anchor';
            obj.pinJointId = null;
            obj.pinJointName = null;

            // Mark as armature-promoted so repair logic recognizes them
            obj._armaturePromotedFromAssembly = true;
        });

        // ── 3. Convert root torso ──
        if (root) {
            root.pinRotationMode = 'static';
            root.pinContour = false;
            root.pinContourColor = null;
            root.contourSize = 0;
            root._armaturePromotedFromAssembly = true;
            delete root.jointBaseAngle;
        }

        if (changed || children.length) {
            this.objects.updateObjectList?.();
            this.objects.updateProperties?.();
            this.stage.requestRender();
            eventBus.emit('history:push');
            Utils.showToast(`Converted ${slicerParts.length} sliced part${slicerParts.length === 1 ? '' : 's'} to Pose Armature joint system`, 'success');
        }
    },

    _bslStartManualJointPlacement(panel, createdParts, meta = {}) {
        const sequence = this._bslBuildManualJointPlacementSteps(createdParts);
        if (!sequence.length || !this.objects.startGuidedJointPlacement) {
            this._bslShowCompletionStep(panel, meta.partCount || 0, meta.assembledCount || 0, meta.learnedSaved, {
                stepLabel: 'Step 3/3',
                jointNote: 'No eligible limb parts were available for manual joint placement.',
                cutReview: meta.cutReview,
                createdParts
            });
            return;
        }

        panel.querySelector('#bsl-step-adjust')?.classList.add('hidden');
        panel.querySelector('#bsl-step-done')?.classList.add('hidden');
        panel.querySelector('#bsl-step-joints')?.classList.remove('hidden');
        this._bslUpdateManualJointStep(panel, { step: sequence[0], index: 0, total: sequence.length });

        const finishManual = (placedCount = 0, skipped = false) => {
            this._bslShowCompletionStep(panel, meta.partCount || 0, meta.assembledCount || 0, meta.learnedSaved, {
                stepLabel: 'Step 3/3',
                jointNote: skipped
                    ? 'Manual limb joint placement was skipped.'
                    : `${placedCount} limb joint${placedCount === 1 ? '' : 's'} placed manually.`,
                cutReview: meta.cutReview,
                createdParts
            });
            Utils.showToast(
                skipped
                    ? `Body Slicer complete — ${meta.partCount || 0} parts, ${meta.assembledCount || 0} assembly joints, manual limb joints skipped`
                    : `Body Slicer complete — ${meta.partCount || 0} parts, ${meta.assembledCount || 0} assembly joints, ${placedCount} manual limb joint${placedCount === 1 ? '' : 's'}`,
                'success'
            );
        };

        panel.querySelector('#bsl-joint-skip').onclick = () => {
            this.objects.cancelGuidedJointPlacement?.();
        };

        this.objects.startGuidedJointPlacement(sequence, {
            onAdvance: (payload) => this._bslUpdateManualJointStep(panel, payload),
            onComplete: (result) => finishManual(result?.placedCount || 0, false),
            onCancel: () => finishManual(0, true)
        });
    },

    async _bslExecuteCut(panel) {
        const obj = this._bslObj;
        if (!obj || !this._bslCurves) return;
        // Re-entry guard: the Cut button is async, so a double-click (or click +
        // Enter) could start a second cut while the first is still running, which
        // duplicates the source image and every body part. Ignore re-entrant calls.
        if (this._bslCutting) return;
        this._bslCutting = true;

        // Replace prior generated parts from the same source image instead of
        // stacking another full set on top (prevents visible duplicates).
        const replacedCount = this._bslPruneGeneratedPartsForSource(obj, this._bslLaunchMode);
        if (replacedCount > 0) {
            console.info(`[Body Slicer] Removed ${replacedCount} previously generated part(s) for source ${obj.id}.`);
        }

        const padding = 2;
        const scaleF = 2;
        const w = Math.ceil(obj.width + padding * 2);
        const h = Math.ceil(obj.height + padding * 2);
        const cw = w * scaleF;
        const ch = h * scaleF;

        const srcCanvas = document.createElement('canvas');
        srcCanvas.width = cw;
        srcCanvas.height = ch;
        const srcCtx = srcCanvas.getContext('2d', { willReadFrequently: true });
        srcCtx.scale(scaleF, scaleF);
        srcCtx.translate(-obj.x + padding, -obj.y + padding);
        srcCtx.save();
        obj.render(srcCtx);
        srcCtx.restore();

        const srcImage = srcCtx.getImageData(0, 0, cw, ch);
        const isSideView = this._bslViewMode === 'side';
        const regionKeys = isSideView
            ? ['head', 'torso', 'f-upper-limb', 'f-lower-limb']
            : ['head', 'torso', 'r-arm', 'l-arm', 'r-leg', 'l-leg'];
        const regionCanvases = {};
        let regionData = null;
        regionKeys.forEach(key => {
            const canvas = document.createElement('canvas');
            canvas.width = cw;
            canvas.height = ch;
            regionCanvases[key] = canvas;
        });

        const src = srcImage.data;
        // Trace/pixel cut-line + connectivity is the PRIMARY Character Cutter
        // method: it mirrors a manual slice (neck, axilla/shoulder, hip, crotch)
        // and assigns every foreground pixel to one non-overlapping output part.
        // ML part-segmentation (BodyPix) is useful for some photos, but can be
        // unreliable on illustrated characters, so Auto keeps it as a fallback.
        
        // Get user's cutting method preference from panel
        const cuttingMethod = panel?.querySelector('#bsl-cutting-method')?.value || 'auto';
        let regionMethod = null;
        
        // Apply user preference
        if (cuttingMethod !== 'ml') {
            // Try trace/pixel cut-line connectivity unless ML-only is selected.
            regionData = this._bslBuildCharacterCutterRegionData?.(srcImage, cw, ch, obj, padding, scaleF, regionKeys) || null;
            if (regionData) {
                regionMethod = this._bslLastGuideMethod === 'trace-silhouette'
                    ? 'trace-silhouette+connectivity'
                    : 'pixel-guides+connectivity';
            } else if (cuttingMethod === 'pixel') {
                console.warn(`[Character Cutter] Pixel-only method selected but failed to generate regions. Consider switching to "Auto" mode.`);
            } else if (cuttingMethod === 'trace') {
                console.warn(`[Character Cutter] Trace Silhouette method selected but failed to generate regions. Consider switching to "Auto" mode.`);
            }
        }
        
        // Use ML fallback if needed and allowed
        if (!regionData && cuttingMethod !== 'pixel') {
            regionData = await this._bslBuildHumanParsingRegionData?.(srcCanvas, srcImage, cw, ch, obj, padding, scaleF, regionKeys, panel) || null;
            if (regionData) {
                regionMethod = 'ml-bodypix';
                if (cuttingMethod === 'auto') {
                    console.warn(`[Character Cutter] Pixel method failed, fell back to ML (BodyPix). Consider editing cut lines for better accuracy.`);
                }
            } else if (cuttingMethod === 'ml') {
                console.warn(`[Character Cutter] ML method selected but BodyPix failed or is unavailable. Switch to "Pixel" or "Auto" mode.`);
            }
        }
        if (!regionData) {
            regionData = {};
            regionKeys.forEach(key => {
                const canvas = document.createElement('canvas');
                canvas.width = cw;
                canvas.height = ch;
                regionData[key] = canvas.getContext('2d').createImageData(cw, ch);
            });
            for (let y = 0; y < ch; y++) {
                const normY = this._clamp01(((y / scaleF) - padding) / Math.max(1, obj.height));
                for (let x = 0; x < cw; x++) {
                    const idx = (y * cw + x) * 4;
                    if (src[idx + 3] <= 10) continue;
                    const normX = this._clamp01(((x / scaleF) - padding) / Math.max(1, obj.width));
                    const regionKey = this._bslGetRegionKeyAt(normX, normY);
                    const dest = regionData[regionKey].data;
                    dest[idx] = src[idx];
                    dest[idx + 1] = src[idx + 1];
                    dest[idx + 2] = src[idx + 2];
                    dest[idx + 3] = src[idx + 3];
                }
            }
        }

        const regionNames = isSideView ? {
            head: 'Head Neck',
            torso: 'Torso',
            'f-upper-limb': 'Front Upper Limb',
            'f-lower-limb': 'Front Lower Limb'
        } : {
            head: 'Head',
            torso: 'Torso',
            'r-arm': 'R Arm',
            'l-arm': 'L Arm',
            'r-leg': 'R Leg',
            'l-leg': 'L Leg'
        };
        const createdParts = {};
        const inferredShoulderPivots = {};
        regionKeys.forEach(key => {
            const canvas = regionCanvases[key];
            canvas.getContext('2d').putImageData(regionData[key], 0, 0);
            if (!isSideView && (key === 'r-arm' || key === 'l-arm' || key === 'r-leg' || key === 'l-leg')) {
                const isCharacterAnchorLimb = this._bslUsesConnectivityRegionSplit() && /^(r|l)-(arm|leg)$/i.test(key);
                // Non-idle characters can leave hands, feet, or fingers as small
                // separated components after the region split. Character-style
                // should preserve all pixels assigned by cut lines instead of
                // pruning everything except the largest blob.
                if (!isCharacterAnchorLimb) {
                    this._bslKeepLargestComponent(canvas);
                }
                // The rounded limb cap samples extra shoulder/hip pixels from the
                // source to round the joint; skip it for character-style cuts so each
                // pixel belongs to exactly one clean part (no overlapping duplicates).
                if (!this._bslUsesConnectivityRegionSplit()) {
                    this._bslApplyRoundedLimbCap(canvas, srcCanvas, key, obj, padding, scaleF);
                }
            }
            if (!this._scHasPixels(canvas)) return;
            const trimmed = this._scTrimCanvas(canvas);
            if (!isSideView && (key === 'r-arm' || key === 'l-arm')) {
                inferredShoulderPivots[key] = this._bslInferShoulderPivotFromTrimmedCanvas(trimmed.canvas, key);
            }
            const dataUrl = trimmed.canvas.toDataURL('image/png');
            const stageX = obj.x - padding + trimmed.offX / scaleF;
            const stageY = obj.y - padding + trimmed.offY / scaleF;
            const stageW = trimmed.width / scaleF;
            const stageH = trimmed.height / scaleF;
            const newObj = new StageObject('image', {
                x: stageX,
                y: stageY,
                width: stageW,
                height: stageH,
                imageSrc: dataUrl,
                name: regionNames[key] || key,
                layer: obj.layer,
                opacity: obj.opacity,
                contourSize: 0,
                pinContour: false,
                jointContours: false
            });
            newObj._bslSourceObjectId = obj.id;
            newObj._bslWorkflow = this._bslLaunchMode || 'body-slicer';
            newObj._bslPartKey = key;
            this.objects.addObject(newObj);
            newObj._tempTrimmedCanvas = trimmed.canvas;
            createdParts[key] = newObj;
        });

        const partCount = Object.keys(createdParts).length;
        if (this._bslLaunchMode === 'character-cutter') {
            // Debug diagnostics: which region method ran, the size/position of each
            // extracted part, and any parts that came out missing (i.e. merged into
            // another part or empty). Open DevTools console to inspect a bad cut.
            console.log(`[Character Cutter] region method: ${regionMethod || 'pixel-classify'} — ${partCount} parts:`,
                Object.entries(createdParts).map(([k, o]) => `${k} ${Math.round(o.width)}x${Math.round(o.height)}@(${Math.round(o.x)},${Math.round(o.y)})`).join('  |  '));
            const missingParts = regionKeys.filter(k => !createdParts[k]);
            if (missingParts.length) console.warn('[Character Cutter] MISSING parts (merged into another part or empty):', missingParts.join(', '));
        }
        if (partCount < 2) {
            this._rollbackCutArtifacts?.(createdParts);
            Utils.showToast('Could not extract enough parts — adjust the cuts and try again', 'warning');
            this._bslCutting = false;
            return;
        }

        let jointSystem = panel.querySelector('#bsl-joint-system')?.value || 'slicer';
        if (this._bslLaunchMode === 'body-slicer' && !isSideView) jointSystem = 'armature';
        if (isSideView && jointSystem === 'armature') jointSystem = 'slicer';
        const generateBackLimbs = isSideView && (panel.querySelector('#bsl-generate-back-limbs')?.checked === true);

        // ── Side-view: auto-generate back limbs from front limbs ──
        if (generateBackLimbs) {
            this._bslGenerateBackLimbsFromFront(createdParts, obj);
        }

        const finalPartCount = Object.keys(createdParts).length;

        // ── Pose Armature assembly path ──
        if (jointSystem === 'armature') {
            const landmarkJointHints = this._bslBuildLandmarkJointHints(createdParts, obj);
            this._bslAssembleAsPoseArmature(createdParts, inferredShoulderPivots, panel, obj, landmarkJointHints);
            return;
        }

        // ── Body Slicer assembly path (original) ──
        const slicerPreset = isSideView ? {
            key: 'human-side',
            name: 'Body Slicer (Side)',
            rigType: 'body-slicer',
            motionPresetKey: 'body-slicer-side',
            parts: [
                { partKey: 'torso', parentPartKey: null, anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.3 }, defaultAngle: 0, minAngle: -15, maxAngle: 15 },
                { partKey: 'head', parentPartKey: 'torso', anchorOnParent: { x: 0.5, y: 0.0 }, pivotOnSelf: { x: 0.5, y: 1.0 }, defaultAngle: 0, minAngle: -35, maxAngle: 35 },
                { partKey: 'f-upper-limb', parentPartKey: 'torso', anchorOnParent: { x: 0.60, y: 0.12 }, pivotOnSelf: { x: 0.5, y: 0.08 }, defaultAngle: 0, minAngle: -135, maxAngle: 135 },
                { partKey: 'b-upper-limb', parentPartKey: 'torso', anchorOnParent: { x: 0.40, y: 0.12 }, pivotOnSelf: { x: 0.5, y: 0.08 }, defaultAngle: 0, minAngle: -135, maxAngle: 135 },
                { partKey: 'f-lower-limb', parentPartKey: 'torso', anchorOnParent: { x: 0.55, y: 0.98 }, pivotOnSelf: { x: 0.5, y: 0.0 }, defaultAngle: 0, minAngle: -45, maxAngle: 90 },
                { partKey: 'b-lower-limb', parentPartKey: 'torso', anchorOnParent: { x: 0.45, y: 0.98 }, pivotOnSelf: { x: 0.5, y: 0.0 }, defaultAngle: 0, minAngle: -90, maxAngle: 45 }
            ]
        } : {
            key: 'human-front',
            name: 'Body Slicer',
            rigType: 'body-slicer',
            motionPresetKey: 'body-slicer-front',
            parts: [
                { partKey: 'torso', parentPartKey: null, anchorOnParent: null, pivotOnSelf: { x: 0.5, y: 0.3 }, defaultAngle: 0, minAngle: -15, maxAngle: 15 },
                { partKey: 'head', parentPartKey: 'torso', anchorOnParent: { x: 0.5, y: 0.0 }, pivotOnSelf: { x: 0.5, y: 1.0 }, defaultAngle: 0, minAngle: -35, maxAngle: 35 },
                { partKey: 'r-arm', parentPartKey: 'torso', anchorOnParent: { x: 0.91, y: 0.11 }, pivotOnSelf: inferredShoulderPivots['r-arm'] || { x: 0.32, y: 0.10 }, defaultAngle: 0, minAngle: -135, maxAngle: 135 },
                { partKey: 'l-arm', parentPartKey: 'torso', anchorOnParent: { x: 0.09, y: 0.11 }, pivotOnSelf: inferredShoulderPivots['l-arm'] || { x: 0.68, y: 0.10 }, defaultAngle: 0, minAngle: -135, maxAngle: 135 },
                { partKey: 'r-leg', parentPartKey: 'torso', anchorOnParent: { x: 0.75, y: 0.98 }, pivotOnSelf: { x: 0.5, y: 0.0 }, defaultAngle: 0, minAngle: -45, maxAngle: 90 },
                { partKey: 'l-leg', parentPartKey: 'torso', anchorOnParent: { x: 0.25, y: 0.98 }, pivotOnSelf: { x: 0.5, y: 0.0 }, defaultAngle: 0, minAngle: -90, maxAngle: 45 }
            ]
        };

        const assemblyMode = panel.querySelector('#bsl-assembly-mode')?.value || 'keep';
        const assembledCount = this._autoAssembleParts(createdParts, slicerPreset, assemblyMode);

        // Stamp armature role keys so the Pose Armature engine recognises these parts
        const slicerToArmatureRole = isSideView ? {
            'torso': 'torso', 'head': 'head-neck',
            'f-upper-limb': 'right-arm', 'b-upper-limb': 'left-arm',
            'f-lower-limb': 'right-leg', 'b-lower-limb': 'left-leg'
        } : {
            'torso': 'torso', 'head': 'head-neck',
            'r-arm': 'right-arm', 'l-arm': 'left-arm',
            'r-leg': 'right-leg', 'l-leg': 'left-leg'
        };
        Object.entries(createdParts).forEach(([partKey, partObj]) => {
            const role = slicerToArmatureRole[partKey];
            if (role) {
                partObj._armatureRoleKey = role;
                partObj._armaturePartKey = role;
            }
        });

        Object.entries(createdParts).forEach(([partKey, partObj]) => {
            const useShoulderContour = (isSideView
                ? /^(f|b)-upper-limb$/i.test(partKey)
                : /^(r|l)-arm$/i.test(partKey)) && !this._bslUsesPoseArmatureCutAssembly();
            partObj.contourSize = useShoulderContour ? 0.92 : 0;
            partObj.pinContour = useShoulderContour;
            partObj.jointContours = false;
            partObj.pinContourColor = null;
            partObj.contourRotation = 0;
            if (Array.isArray(partObj.joints)) {
                partObj.joints.forEach(jt => {
                    jt.contourSize = 0;
                });
            }
        });
        const learnEnabled = panel.querySelector('#bsl-learn-mode')?.checked;
        const learnedSaved = learnEnabled ? this._bslSaveTrainingSample(panel, true) : false;
        const jointMode = panel.querySelector('#bsl-joint-mode')?.value || 'auto';
        let limbJointCount = 0;
        if (jointMode === 'auto') {
            limbJointCount = this._bslAutoAddLimbJoints(createdParts);
        }
        const cutReview = this._buildCutReview?.(createdParts, slicerPreset, {
            title: panel?.dataset?.workflow === 'character-cutter' ? 'Character Cutter Review' : 'Body Slicer Cut Review',
            sourceObj: obj,
            optionalKeys: isSideView && !generateBackLimbs ? ['b-upper-limb', 'b-lower-limb'] : []
        });

        obj.opacity = 0;
        obj.visible = false;

        this._bslDidCut = true;
        this._exitBodySlicer();
        this.objects.updateObjectList();
        eventBus.emit('history:push');

        if (!this._skeletonVisible) this.toggleSkeleton();
        if (jointMode === 'manual') {
            this._bslStartManualJointPlacement(panel, createdParts, {
                partCount: finalPartCount,
                assembledCount,
                learnedSaved,
                cutReview
            });
            return;
        }

        this._bslShowCompletionStep(panel, finalPartCount, assembledCount, learnedSaved, {
            stepLabel: 'Step 2/2',
            jointNote: jointMode === 'auto'
                ? `${limbJointCount} limb joint${limbJointCount === 1 ? '' : 's'} added automatically.`
                : 'No limb joints were added.',
            cutReview,
            createdParts
        });

        const toolName = panel?.dataset?.workflow === 'character-cutter' ? 'Character Cutter' : 'Body Slicer';
        Utils.showToast(
            `${toolName} complete - ${finalPartCount} parts, ${assembledCount} assembly joints${jointMode === 'auto' ? `, ${limbJointCount} limb joints` : ', no limb joints'}${generateBackLimbs ? ', synthetic back limbs on' : ''}${learnedSaved ? ', learned layout saved' : ''}${assemblyMode === 'reposition' ? ', T-Pose' : ''}`,
            'success'
        );
    },

    // ── Side-view: generate back limbs from front limbs ──

    _bslGenerateBackLimbsFromFront(createdParts, sourceObj) {
        const limbPairs = [
            { front: 'f-upper-limb', back: 'b-upper-limb', name: 'Back Upper Limb' },
            { front: 'f-lower-limb', back: 'b-lower-limb', name: 'Back Lower Limb' }
        ];

        limbPairs.forEach(pair => {
            const frontObj = createdParts[pair.front];
            if (!frontObj) return;

            // Get the front limb's image to create a darker copy
            const img = frontObj.imageElement || frontObj._eraserCanvas || frontObj._tempTrimmedCanvas;
            if (!img) return;

            const srcW = img.naturalWidth || img.width;
            const srcH = img.naturalHeight || img.height;
            if (!srcW || !srcH) return;

            // Create a darkened + slightly desaturated copy for the back limb
            const canvas = document.createElement('canvas');
            canvas.width = srcW;
            canvas.height = srcH;
            const ctx = canvas.getContext('2d');

            // Draw original
            ctx.drawImage(img, 0, 0, srcW, srcH);

            // Apply darkening overlay (source-atop keeps alpha intact)
            ctx.globalCompositeOperation = 'source-atop';
            ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
            ctx.fillRect(0, 0, srcW, srcH);
            ctx.globalCompositeOperation = 'source-over';

            const dataUrl = canvas.toDataURL('image/png');

            // Position the back limb slightly offset behind the front limb
            const offsetX = -frontObj.width * 0.06;
            const backObj = new StageObject('image', {
                x: frontObj.x + offsetX,
                y: frontObj.y,
                width: frontObj.width * 0.95,
                height: frontObj.height,
                imageSrc: dataUrl,
                name: pair.name,
                layer: (sourceObj.layer || 0) - 1,
                opacity: frontObj.opacity * 0.85,
                contourSize: 0,
                pinContour: false,
                jointContours: false
            });
            backObj._bslSourceObjectId = sourceObj?.id || null;
            backObj._bslWorkflow = this._bslLaunchMode || 'body-slicer';
            backObj._bslPartKey = pair.back;
            this.objects.addObject(backObj);
            createdParts[pair.back] = backObj;
        });
    },

    _bslPruneGeneratedPartsForSource(sourceObj, workflow = 'body-slicer') {
        const sourceId = sourceObj?.id;
        if (!sourceId || !Array.isArray(this.objects?.objects)) return 0;

        const stale = this.objects.objects.filter(item => {
            if (!item || item.id === sourceId) return false;
            if (item._bslSourceObjectId !== sourceId) return false;
            if (item._bslWorkflow && workflow && item._bslWorkflow !== workflow) return false;
            return true;
        });

        if (!stale.length) return 0;
        this._rollbackCutArtifacts?.(stale);
        return stale.length;
    },

    // ── Auto-add limb joints after cut ──

    _bslAutoAddLimbJoints(createdParts) {
        // Analyse each coarse limb's silhouette width profile and place the
        // internal articulation joints: elbow/wrist on arms, knee/ankle on legs.
        const partDefs = [
            { key: 'r-arm', joints: [
                { name: 'right-elbow',    tRange: [0.30, 0.58], fallback: 0.45, mode: 'min', contourSize: 0.70 },
                { name: 'right-wrist',    tRange: [0.65, 0.92], fallback: 0.78, mode: 'min', contourSize: 0.50 }
            ]},
            { key: 'l-arm', joints: [
                { name: 'left-elbow',    tRange: [0.30, 0.58], fallback: 0.45, mode: 'min', contourSize: 0.70 },
                { name: 'left-wrist',    tRange: [0.65, 0.92], fallback: 0.78, mode: 'min', contourSize: 0.50 }
            ]},
            { key: 'r-leg', joints: [
                { name: 'right-knee',  tRange: [0.32, 0.60], fallback: 0.48, mode: 'min', contourSize: 0.70 },
                { name: 'right-ankle', tRange: [0.72, 0.94], fallback: 0.85, mode: 'min', contourSize: 0.50 }
            ]},
            { key: 'l-leg', joints: [
                { name: 'left-knee',  tRange: [0.32, 0.60], fallback: 0.48, mode: 'min', contourSize: 0.70 },
                { name: 'left-ankle', tRange: [0.72, 0.94], fallback: 0.85, mode: 'min', contourSize: 0.50 }
            ]}
        ];

        // Rasterise a part and return a silhouette profile along its joint axis.
        const profilePart = (obj, directionKey = 'vertical-tb') => {
            const scale = 2;
            const w = Math.ceil(obj.width) * scale;
            const h = Math.ceil(obj.height) * scale;
            if (w < 4 || h < 4) return null;
            const canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            ctx.scale(scale, scale);
            ctx.translate(-obj.x, -obj.y);
            ctx.save();
            obj.render(ctx);
            ctx.restore();

            const pixels = ctx.getImageData(0, 0, w, h).data;
            const direction = StageObject.getJointDirectionMeta(directionKey);

            let silMin = direction.isVertical ? h : w;
            let silMax = 0;
            if (direction.isVertical) {
                for (let r = 0; r < h; r++) {
                    const off = r * w * 4;
                    for (let x = 0; x < w; x++) {
                        if (pixels[off + x * 4 + 3] >= 40) {
                            if (r < silMin) silMin = r;
                            if (r > silMax) silMax = r;
                        }
                    }
                }
            } else {
                for (let x = 0; x < w; x++) {
                    for (let y = 0; y < h; y++) {
                        const off = (y * w + x) * 4;
                        if (pixels[off + 3] >= 40) {
                            if (x < silMin) silMin = x;
                            if (x > silMax) silMax = x;
                        }
                    }
                }
            }
            if (silMax <= silMin) return null;
            const silSize = silMax - silMin + 1;

            const widths = [];
            if (direction.isVertical) {
                for (let r = silMin; r <= silMax; r++) {
                    let minX = w, maxX = -1;
                    const off = r * w * 4;
                    for (let x = 0; x < w; x++) {
                        if (pixels[off + x * 4 + 3] >= 40) {
                            if (x < minX) minX = x;
                            if (x > maxX) maxX = x;
                        }
                    }
                    widths.push(maxX >= minX ? maxX - minX + 1 : 0);
                }
            } else {
                for (let x = silMin; x <= silMax; x++) {
                    let minY = h, maxY = -1;
                    for (let y = 0; y < h; y++) {
                        if (pixels[(y * w + x) * 4 + 3] >= 40) {
                            if (y < minY) minY = y;
                            if (y > maxY) maxY = y;
                        }
                    }
                    widths.push(maxY >= minY ? maxY - minY + 1 : 0);
                }
            }

            return { smoothed: this._smoothSmartCutValues(widths, 3), silMin, silSize, extent: direction.isVertical ? h : w, direction };
        };

        let totalAdded = 0;

        partDefs.forEach(partDef => {
            const obj = createdParts[partDef.key];
            if (!obj) return;

            const directionKey = this._bslInferPartJointDirection(partDef.key, obj, '');
            const profile = profilePart(obj, directionKey);
            if (!profile) return;
            const { smoothed, silMin, silSize, extent, direction } = profile;

            // Find the best point (min or max width) within a silhouette-relative t-range
            const findProfileT = (tMin, tMax, mode) => {
                const iMin = Math.max(0, Math.round(tMin * (smoothed.length - 1)));
                const iMax = Math.min(smoothed.length - 1, Math.round(tMax * (smoothed.length - 1)));
                let bestVal = mode === 'min' ? Infinity : -Infinity;
                let bestI = Math.round((iMin + iMax) / 2);
                for (let i = iMin; i <= iMax; i++) {
                    if ((mode === 'min' && smoothed[i] < bestVal) ||
                        (mode === 'max' && smoothed[i] > bestVal)) {
                        bestVal = smoothed[i]; bestI = i;
                    }
                }
                return smoothed.length > 1 ? bestI / (smoothed.length - 1) : 0.5;
            };

            const joints = [];
            partDef.joints.forEach(jDef => {
                const silT = findProfileT(jDef.tRange[0], jDef.tRange[1], jDef.mode);
                const imgT = (silMin + silT * silSize) / extent;
                const logicalT = direction.isReverse ? 1 - imgT : imgT;
                const position = Math.max(0.03, Math.min(0.97, logicalT));
                const centerOffset = obj._getShapeCrossCenterAtPosition
                    ? obj._getShapeCrossCenterAtPosition(position, direction)
                    : 0.5;

                joints.push({
                    id: 'jt_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                    name: jDef.name,
                    position: Math.round(position * 1000) / 1000,
                    crossOffset: Math.round(Math.max(0.05, Math.min(0.95, centerOffset)) * 1000) / 1000,
                    angle: 0,
                    tiltX: 0,
                    tiltY: 0,
                    contourSize: this._bslUsesPoseArmatureCutAssembly() ? 0 : (jDef.contourSize ?? 0.70),
                    contourColor: null
                });
            });

            if (joints.length > 0) {
                obj.joints = joints;
                obj.jointDirection = directionKey;
                obj.jointContours = !this._bslUsesPoseArmatureCutAssembly();
                totalAdded += joints.length;
            }
        });

        return totalAdded;
    },

    // ── Cleanup ──

    _exitBodySlicer() {
        this._bslCutting = false;
        this._clearCuttingCompletionHandler?.();
        this._bslSessionId = (this._bslSessionId || 0) + 1;
        // Restore lock state
        if (this._bslObj && this._bslWasLocked != null) {
            this._bslObj.locked = this._bslWasLocked;
            delete this._bslObj._temporaryLockOwner;
            delete this._bslObj._temporaryLockPrevious;
        }
        this._bslWasLocked = null;

        this._bslActive = false;
        this._bslDragging = null;
        this._bslHover = null;
        this._bslDraggingPoint = null;
        this._bslDraggingCurve = null;
        this._bslDraggingLandmark = null;
        this._bslHoverPoint = null;
        this._bslHoverLandmark = null;
        this._bslHoverSegment = null;
        this._bslSelectedPoint = null;
        this._bslAddPointMode = false;
        this._bslCurves = null;
        this._bslSelectedCurve = null;
        this._bslLandmarks = null;
        this._bslGuideConfidence = null;
        this._bslDescriptor = null;
        this._bslTrainingApplied = false;
        this._bslTrainingScore = null;

        // Restore original image if the cut wasn't executed
        if (!this._bslDidCut && this._bslOriginalSrc && this._bslObj) {
            const obj = this._bslObj;
            obj.x = this._bslOriginalX;
            obj.y = this._bslOriginalY;
            obj.width = this._bslOriginalW;
            obj.height = this._bslOriginalH;
            obj.imageSrc = this._bslOriginalSrc;
            obj.loadImage(this._bslOriginalSrc);
            obj._contourPixelsCache = null;
        }
        this._bslOriginalSrc = null;
        this._bslOriginalX = null;
        this._bslOriginalY = null;
        this._bslOriginalW = null;
        this._bslOriginalH = null;
        this._bslObj = null;
        this._bslDidCut = false;

        if (this._bslRenderOverlayFn) {
            eventBus.off('stage:render-overlay', this._bslRenderOverlayFn);
            this._bslRenderOverlayFn = null;
        }
        if (this._bslMouseDownFn) {
            this.stage.viewport.removeEventListener('mousedown', this._bslMouseDownFn);
            this.stage.viewport.removeEventListener('mousemove', this._bslMouseMoveFn);
            this.stage.viewport.removeEventListener('mouseup',   this._bslMouseUpFn);
            this._bslMouseDownFn = this._bslMouseMoveFn = this._bslMouseUpFn = null;
        }
        if (this._bslDblClickFn) {
            this.stage.viewport.removeEventListener('dblclick', this._bslDblClickFn);
            this._bslDblClickFn = null;
        }
        if (this._bslContextMenuFn) {
            this.stage.viewport.removeEventListener('contextmenu', this._bslContextMenuFn);
            this._bslContextMenuFn = null;
        }
        if (this._bslKeyHandler) {
            document.removeEventListener('keydown', this._bslKeyHandler);
            this._bslKeyHandler = null;
        }
        this.stage.viewport.style.cursor = '';
        this.stage.requestRender();
    },


});
