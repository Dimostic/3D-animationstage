/* Pose Armature action selection, atomic timeline insertion and reversible clip audition. */
Object.assign(JointSystem.prototype, {
    _armatureEditableControlKeys() {
        return ['_armatureActionDuration', '_armatureActionCycles', '_armaturePoseTransition', '_armaturePoseHold', '_armatureGesturePosture',
            '_armatureSpeed', '_armatureDistanceScale', '_armatureTravelDistancePx', '_armatureTravelDistanceYPx', '_armatureTravelAngle',
            '_armatureWalkStrideScale', '_armatureEndFacingKey', '_armatureEndFacingTurnMode', '_armatureEndFacingTurnSide',
            '_armatureFinishPoseKey', '_armatureFinishExpressionKey', '_armatureFinishGazeKey'];
    },

    _getArmatureRecordedAction(id) {
        if (!id || id === 'preview') return null;
        const entries = this.objects.objects.flatMap(obj => (obj.animations || [])
            .filter(track => track._armatureActionId === id).map(track => ({ obj, track })));
        if (!entries.length) return null;
        const recipe = entries.find(entry => entry.track._armatureActionRecipe)?.track._armatureActionRecipe;
        const start = Math.min(...entries.map(({ track }) => Number(track.delay) || 0));
        return { id, recipe, rootId: recipe?.spec.rootId, name: entries[0].track._armatureActionName,
            start, durationMs: Math.max(...entries.map(({ track }) => (Number(track.delay) || 0) + this._armatureTrackDuration(track))) - start,
            tracks: entries.map(({ obj, track }) => ({ objectId: obj.id, id: track.id })), additions: recipe?.additions || [] };
    },

    async _editArmatureRecordedAction(id) {
        if (this._armatureRecordingBusy || this.animations.isPlaying || this.animations._exportingVideo) return;
        this._stopArmatureClipPreview();
        const action = this._getArmatureRecordedAction(id);
        if (!action?.recipe) return;
        const root = this.objects.getObjectById(action.rootId);
        if (!root) return;
        this.objects.select([root.id]);
        const rig = this._detectArmature();
        if (!rig) return;
        this._armatureEditingAction = action;
        this._armatureSelectedAction = Utils.deepClone(action.recipe.spec);
        this._armaturePreparedAction = null;
        for (const key of this._armatureEditableControlKeys()) this[key] = action.recipe.controls[key];
        this._armatureActionDuration = action.durationMs / 1000;
        this._activateActivityKitFit?.(this._armatureSelectedAction);
        Object.assign(this._activityKitSettings(root.id), Utils.deepClone(action.recipe.kit));
        this.openArmaturePanel(rig);
        // Opening a panel in the current timeline view must not discard the source action.
        this._armatureSelectedAction = Utils.deepClone(action.recipe.spec);
        this._refreshActivityKitControls?.();
        await this._prepareSelectedArmatureAction();
        document.querySelector('#armature-record-row')?.scrollIntoView({ block: 'nearest' });
    },

    _debugArmatureRecordedAction(id) {
        if (!this._canUseArmatureDebugger()) return false;
        const action = this._getArmatureRecordedAction(id), spec = action?.recipe?.spec;
        const capturedSequence=spec?.kind==='cross'&&spec.options?.capture;
        if (spec?.kind !== 'movement'&&!capturedSequence) { Utils.showToast('This action has no compatible movement source.', 'warning'); return false; }
        if (this.animations.isPlaying || this.animations.isPaused || this._armatureRecordingBusy) { Utils.showToast('Stop playback or recording first.', 'warning'); return false; }
        const root = this.objects.getObjectById(action.rootId);
        if (!root) return false;
        const selection = [...this.objects.selectedIds];
        this.objects.select([root.id]);
        const rig = this._detectArmature();
        if (!rig || this._getUniversalCharacterCurrentViewSwitchKey(rig) !== spec.view) {
            this.objects.select(selection);
            Utils.showToast('Switch the character to the recorded action\'s source view before debugging.', 'warning'); return false;
        }
        const source = action.recipe.debugSource;
        if(capturedSequence){this._openCapturedViewSequenceEditor(rig,capturedSequence,{editingAction:action}).catch(error=>Utils.showToast(error.message,'warning'));return true;}
        const move = source?.movement || this._getActiveArmatureMovementCatalog(rig)?.[spec.key];
        if (!move || move.turnAround || move.frontBackTurnAround || move.flipInPlace) {
            this.objects.select(selection);
            Utils.showToast('This action needs the timeline editor; a single-view source cycle is not available.', 'warning'); return false;
        }
        const opened = this._openArmatureMovementDebugger(rig, spec.key, { movementEntry: move,
            poseCatalog: source?.poses, prepared: true });
        if (opened) {
            this._activeArmatureDebuggerSession.restoreSnapshot.selected = selection;
            this._activeArmatureDebuggerSession.sourceActionName = action.name;
            this._renderArmatureDebuggerPanel(this._activeArmatureDebuggerSession);
        } else this.objects.select(selection);
        return opened;
    },

    _removeArmatureActionTracks(action) {
        this.objects.objects.forEach(obj => {
            obj.animations = obj.animations.filter(track => track._armatureActionId !== action.id);
        });
        this.objects.objects = this.objects.objects.filter(obj => {
            if (!action.additions.includes(obj.id) || obj.animations.length
                || this.objects.objects.some(child => child.pinnedTo?.parentId === obj.id)) return true;
            this.animations.originalStates?.delete(obj.id);
            return false;
        });
        for (const [id, state] of Object.entries(action.recipe?.activityOriginals || {})) {
            const obj = this.objects.getObjectById(id);
            if (obj && !obj.animations.length) {
                this.animations._restoreFullState(obj, state); obj.layer = state.layer;
            }
        }
    },

    _deleteArmatureTimelineAction(id) {
        this._stopArmatureClipPreview();
        const action = this._getArmatureRecordedAction(id);
        if (!action?.recipe || this._armatureRecordingBusy) return false;
        eventBus.emit('history:flush');
        this._removeArmatureActionTracks(action);
        if (this._armatureEditingAction?.id === id) this._armatureEditingAction = null;
        if (this._armatureLastAction?.id === id) this._armatureLastAction = null;
        this._armaturePreparedAction = null;
        const selected = [...this.objects.selectedIds].filter(objectId => this.objects.getObjectById(objectId));
        this.objects.select(selected.length ? selected : this.objects.getObjectById(action.rootId) ? [action.rootId] : []);
        this.objects._resolvePins(); this.stage.requestRender();
        eventBus.emit('timeline:update'); eventBus.emit('objects:updated'); eventBus.emit('history:push');
        this._refreshActivityKitControls?.();
        this._armatureActionStatus(`Removed: ${action.name}`);
        return true;
    },

    _armatureActionSnapshot(rig) {
        const family = new Set((this._getArmatureViewTransitionObjects(rig) || []).map(o => o.id));
        return {
            root: rig.root, objects: this.objects.objects.slice(),
            states: new Map(this.objects.objects.map(obj => [obj.id, {
                json: Utils.cloneProjectState(obj.toJSON()),
                view: family.has(obj.id) ? ArmatureViewState.capture(obj, { reuseRealisticArtwork: true }) : null,
                image: obj.imageElement, texture: obj.textureImageElement,
                baseX: obj._poseArmatureBaseX, baseY: obj._poseArmatureBaseY
            }])),
            originals: this.animations.originalStates instanceof Map
                ? new Map([...this.animations.originalStates].map(([id, value]) => [id, Utils.cloneProjectState(value)])) : null,
            time: this.animations.currentTime, cursor: this.objects._recordSequenceCursorMs,
            selected: [...this.objects.selectedIds], snapshots: this.objects._recordSnapshots
        };
    },

    _restoreArmatureActionSnapshot(snapshot, rollback = false) {
        // Never restore an old scene over a newly loaded project or an undo-restored character.
        if (this.objects.getObjectById(snapshot.root.id) !== snapshot.root) return false;
        if (rollback) this.objects.objects = snapshot.objects.slice();
        if (!rollback && snapshot.restoreMemberOrder) {
            const members = snapshot.objects.filter(obj => snapshot.states.has(obj.id)
                && this.objects.getObjectById(obj.id) === obj);
            const memberSet = new Set(members);
            let index = 0;
            this.objects.objects = this.objects.objects.map(obj => memberSet.has(obj) ? members[index++] : obj);
        }
        snapshot.states.forEach((saved, id) => {
            const obj = this.objects.getObjectById(id);
            if (!obj) return;
            if (saved.json.svgCharacterConfig?._realisticCharacter) obj._svgCharacterConfig = Utils.cloneProjectState(saved.json.svgCharacterConfig);
            if (saved.view) ArmatureViewState.apply(obj, saved.view);
            this.animations._restoreFullState(obj, saved.json);
            // View restoration can introduce an empty SVG shape state on a Universal part.
            obj._svgAfricanAdjustments = saved.json.svgAfricanAdjustments ? Utils.deepClone(saved.json.svgAfricanAdjustments) : null;
            for (const [key, stored] of [['_armaturePromotedProfile', 'armaturePromotedProfile'], ['_armatureSkinStrictSideProfile', 'armatureSkinStrictSideProfile'], ['_armatureDrawLayer', 'armatureDrawLayer']]) {
                if (saved.json[stored] === undefined) delete obj[key]; else obj[key] = saved.json[stored];
            }
            obj.layer = saved.json.layer;
            if (saved.json.armatureViewState === undefined) delete obj.armatureViewState;
            obj._poseArmatureBaseX = saved.baseX; obj._poseArmatureBaseY = saved.baseY;
            if (saved.image) obj.imageElement = saved.image;
            if (saved.texture) obj.textureImageElement = saved.texture;
            if (rollback) obj.animations = Utils.cloneProjectState(saved.json.animations || []);
        });
        if (rollback) this.animations.originalStates = snapshot.originals;
        this.objects._recordSequenceCursorMs = snapshot.cursor;
        this.objects._recordSnapshots = snapshot.snapshots;
        this.animations.currentTime = snapshot.time;
        this.animations._pendingSvgArmatureTimelineViews?.clear();
        this.objects._resolvePins();
        this.objects.select(snapshot.selected.filter(id => this.objects.getObjectById(id)));
        this._currentArmature = this._refreshDetectedArmatureReference(this._currentArmature);
        eventBus.emit('timeline:time', snapshot.time);
        this.stage.requestRender();
        return true;
    },

    _armatureActionStart(rig) {
        if (this._armatureEditingAction) return this._armatureEditingAction.start;
        const time = Math.max(0, Number(this.animations.currentTime) || 0);
        if (this._armatureActionPlacement !== 'after') return time;
        let end = time;
        (this._getArmatureViewTransitionObjects(rig) || []).forEach(obj => {
            (obj.animations || []).forEach(track => {
                if (!track._armatureActionId && !track._armatureMovementKey && !track._armatureFacingFlip) return;
                end = Math.max(end, (Number(track.delay) || 0) + this._armatureTrackDuration(track));
            });
        });
        return end;
    },

    _armatureTrackDuration(track) {
        const generated = track.generated;
        const duration = Number(generated?.duration) || Number(track.params?.duration) * 1000
            || (Array.isArray(generated) ? Math.max(0, ...generated.map(p => Number(p.duration) || 0)) : 0);
        const repeat = Number(track.repeat ?? track.params?.repeat ?? 1);
        return duration * (Number.isFinite(repeat) && repeat > 0 ? repeat : 1);
    },

    _armatureActionSpec(kind, key, rig = this._currentArmature) {
        const catalog = kind === 'pose' ? this._getActiveArmaturePoseCatalog(rig)
            : kind === 'face-movement' ? Object.fromEntries(this._getArmatureFaceMovementCatalog(rig).map(entry => [entry.key, entry]))
                : this._getActiveArmatureMovementCatalog(rig);
        const entry = catalog?.[key];
        return { kind, key, rootId: rig.root.id, name: entry?.name || key,
            armatureGesture: entry?.armatureGesture === true,
            supportsCycles: ['pose', 'movement'].includes(kind) && !(entry?.flipInPlace || entry?.frontBackTurnAround || entry?.turnAround),
            view: this._getUniversalCharacterCurrentViewSwitchKey(rig) };
    },

    _armatureActionStatus(text, state = 'ready') {
        this._armatureActionMessage = { text, state };
        this._refreshArmatureRecordingControls();
    },

    _refreshArmatureRecordingControls() {
        const panel = document.getElementById('armature-panel');
        const host = panel?.querySelector('#armature-record-row');
        if (!host) return;
        const spec = this._armatureSelectedAction;
        const busy = !!this._armatureRecordingBusy, preview = this._armatureClipPreview;
        host.setAttribute('aria-busy', String(busy));
        host.dataset.state = busy ? 'busy' : preview ? 'preview' : (this._armatureActionMessage?.state || 'ready');
        host.querySelector('[data-record="name"]').textContent = spec?.name || 'Choose an action';
        host.querySelector('[data-record="status"]').textContent = this._armatureActionMessage?.text || '';
        const rig = this._currentArmature;
        const posture = host.querySelector('[data-record="gesture-posture"]');
        posture.closest('label').hidden = !spec?.armatureGesture;
        if (spec?.armatureGesture) {
            const available = this._getArmatureGesturePostures(rig);
            [...posture.options].forEach(option => { option.hidden = option.value !== 'current' && !available[option.value]; });
            if (this._armatureGesturePosture !== 'current' && !available[this._armatureGesturePosture]) this._armatureGesturePosture = 'current';
            posture.value = this._armatureGesturePosture || 'current';
        }
        const start = rig?.root ? this._armatureActionStart(rig) : 0;
        const duration = this._armaturePreparedAction?.durationMs;
        host.querySelector('[data-record="range"]').textContent = spec
            ? `Start ${(start / 1000).toFixed(2)} s${duration ? ` / Duration ${(duration / 1000).toFixed(2)} s` : ''}` : '';
        host.querySelector('[data-record="pose-times"]').hidden = !['pose', 'expression'].includes(spec?.kind);
        // Settings stop an audition before changing it; do not leave kit inputs locked.
        host.querySelectorAll('input, select').forEach(input => { input.disabled = busy; });
        const editing = this._armatureEditingAction;
        host.querySelector('[data-record="add"]').innerHTML = editing
            ? '<i class="fas fa-save"></i> Update Timeline' : '<i class="fas fa-plus"></i> Add to Timeline';
        host.querySelector('[data-record="cancel-edit"]').hidden = !editing;
        host.querySelector('[data-record="placement"]').closest('label').hidden = !!editing;
        host.querySelector('[data-record="cycles"]').closest('label').hidden = !spec?.supportsCycles;
        const seconds = host.querySelector('[data-record="duration"]');
        if (document.activeElement !== seconds) seconds.value = duration ? +(duration / 1000).toFixed(3) : '';
        const cycles = host.querySelector('[data-record="cycles"]');
        if (document.activeElement !== cycles) cycles.value = this._armatureActionCycles || '';
        host.querySelector('[data-record="preview"]').disabled = busy || !!preview || !spec || !duration;
        host.querySelector('[data-record="add"]').disabled = busy || !spec || !duration;
        host.querySelector('[data-record="stop"]').disabled = !busy && !preview;
        const last = this._armatureLastAction;
        const exists = last?.rootId === rig?.root?.id && last.tracks.some(item =>
            this.objects.getObjectById(item.objectId)?.animations?.some(a => a.id === item.id));
        host.querySelector('[data-record="result"]').hidden = !exists;
        const receipt = host.querySelector('[data-record="receipt"]');
        receipt.hidden = !exists;
        receipt.textContent = exists ? `Last ${last.updated ? 'updated' : 'added'}: ${last.name}` : '';
        host.querySelectorAll('[data-record="result"] button').forEach(button => { button.disabled = busy || !!preview; });
        host.querySelector('[data-record="edit"]').disabled ||= !this._getArmatureRecordedAction(last?.id)?.recipe;
        const progress = host.querySelector('progress');
        progress.hidden = !busy && !preview;
        if (busy) progress.removeAttribute('value');
        else { progress.max = preview?.clip.durationMs || 1; progress.value = preview?.elapsed || 0; }
        panel.querySelectorAll('.armature-pose-btn, .armature-move-btn').forEach(button => {
            const selected = spec && ((spec.kind === 'pose' && button.dataset.poseKey === spec.key)
                || (spec.kind === 'movement' && button.dataset.moveKey === spec.key));
            button.classList.toggle('armature-action-selected', !!selected);
            button.setAttribute('aria-pressed', String(!!selected));
        });
    },

    _mountArmatureRecordingControls(panel, rig) {
        const host = panel.querySelector('#armature-record-row');
        if (!host) return;
        panel._armatureRecordingAbort?.abort();
        const controller = new AbortController();
        panel._armatureRecordingAbort = controller;
        const signal = controller.signal;
        if (!this._armatureRecordingBusy && !this._armatureClipPreview
            && (this._armatureSelectedAction?.rootId !== rig.root.id
                || this._armatureSelectedAction?.view !== this._getUniversalCharacterCurrentViewSwitchKey(rig))) {
            this._armatureSelectedAction = null; this._armaturePreparedAction = null; this._armatureActionMessage = null;
            if (this._armatureEditingAction?.rootId !== rig.root.id) this._armatureEditingAction = null;
        }
        if (this._armatureActionPlacement === undefined) this._armatureActionPlacement = 'after';
        if (this._armaturePreviewAfterAdd === undefined) {
            try { this._armaturePreviewAfterAdd = localStorage.getItem('armature-preview-after-add') === 'true'; }
            catch (_) { this._armaturePreviewAfterAdd = false; }
        }
        this._armaturePoseTransition ??= .5;
        this._armaturePoseHold ??= 1;
        host.className = 'armature-recording-controls';
        host.innerHTML = `
            <strong data-record="name"></strong>
            <label hidden>Gesture posture<select data-record="gesture-posture"><option value="current">Keep current pose</option><option value="seated">Seated</option><option value="kneeling">Kneeling</option><option value="standing">Standing</option></select></label>
            <label>Placement<select data-record="placement"><option value="playhead">At playhead</option><option value="after">After previous character action</option></select></label>
            <div data-record="pose-times" class="armature-recording-times" hidden>
                <label>Transition (s)<input data-record="transition" type="number" min="0.05" max="30" step="0.05" value="${this._armaturePoseTransition}"></label>
                <label>Hold (s)<input data-record="hold" type="number" min="0" max="120" step="0.1" value="${this._armaturePoseHold}"></label>
            </div>
            <div class="armature-recording-times">
                <label>Total duration (s)<input data-record="duration" type="number" min="0.05" max="3600" step="0.001"></label>
                <label>Cycles<input data-record="cycles" type="number" min="1" max="100" step="1" placeholder="Default"></label>
            </div>
            <output data-record="range"></output>
            <div class="armature-recording-buttons">
                <button class="btn-small" data-record="preview" title="Preview once and restore"><i class="fas fa-play"></i> Preview</button>
                <button class="btn-small" data-record="add"><i class="fas fa-plus"></i> Add to Timeline</button>
                <button class="btn-small" data-record="stop" title="Stop and restore" aria-label="Stop and restore"><i class="fas fa-stop"></i></button>
                <button class="btn-small" data-record="cancel-edit" hidden>Cancel Edit</button>
            </div>
            <label class="armature-recording-check"><input data-record="auto" type="checkbox">Preview after adding</label>
            <label class="armature-recording-check"><input data-record="avoid-contacts" type="checkbox">Move past hand-contact conflicts</label>
            <progress aria-label="Action progress" hidden></progress>
            <div data-record="status" role="status" aria-live="polite" aria-atomic="true"></div>
            <output data-record="receipt" hidden></output>
            <div data-record="result" class="armature-recording-buttons" hidden>
                <button class="btn-small" data-record="edit"><i class="fas fa-pen"></i> Edit Action</button>
                <button class="btn-small" data-record="play"><i class="fas fa-play"></i> Play Clip</button>
                <button class="btn-small" data-record="show"><i class="fas fa-list"></i> Show in Timeline</button>
                <button class="btn-small" data-record="undo"><i class="fas fa-undo"></i> Undo</button>
            </div>`;
        host.querySelector('[data-record="placement"]').value = this._armatureActionPlacement;
        host.querySelector('[data-record="auto"]').checked = this._armaturePreviewAfterAdd;
        host.querySelector('[data-record="avoid-contacts"]').checked = !!this._armatureAvoidContactConflicts;
        host.addEventListener('change', e => {
            const key = e.target.dataset.record;
            if (!key) return;
            const inputValue = e.target.value;
            this._stopArmatureClipPreview();
            e.target.value = inputValue;
            if (key === 'placement') this._armatureActionPlacement = e.target.value;
            if (key === 'avoid-contacts') this._armatureAvoidContactConflicts = e.target.checked;
            if (key === 'auto') {
                this._armaturePreviewAfterAdd = e.target.checked;
                try { localStorage.setItem('armature-preview-after-add', String(e.target.checked)); } catch (_) {}
            }
            if (key === 'transition' || key === 'hold') {
                if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
                this[key === 'hold' ? '_armaturePoseHold' : '_armaturePoseTransition'] = Number(e.target.value);
                this._armatureActionDuration = null;
                this._prepareSelectedArmatureAction();
            }
            if (key === 'duration' || key === 'cycles') {
                if (!e.target.checkValidity()) { e.target.reportValidity(); return; }
                this[key === 'duration' ? '_armatureActionDuration' : '_armatureActionCycles'] = Number(e.target.value) || null;
                if (key === 'cycles') this._armatureActionDuration = null;
                this._prepareSelectedArmatureAction();
            }
            if (key === 'gesture-posture') {
                this._armatureGesturePosture = inputValue;
                this._prepareSelectedArmatureAction();
            }
            this._refreshArmatureRecordingControls();
        });
        host.addEventListener('click', e => {
            const key = e.target.closest('button')?.dataset.record;
            if (key === 'stop') {
                if (this._armatureRecordingBusy) this._armatureRecordingBusy.cancelled = true;
                this._stopArmatureClipPreview();
            }
            if (key === 'preview' || key === 'add') this._runArmatureSelectedAction(key);
            if (key === 'play') this._playArmatureRecordedAction(this._armatureLastAction);
            if (key === 'show') this._showArmatureRecordedAction();
            if (key === 'undo') this._undoArmatureRecordedAction();
            if (key === 'edit') this._editArmatureRecordedAction(this._armatureLastAction?.id);
            if (key === 'cancel-edit') {
                this._stopArmatureClipPreview(); this._armatureEditingAction = null;
                this._armaturePreparedAction = null; this._armatureSelectedAction = null;
                this._armatureActionStatus('Edit cancelled.');
            }
        });
        // Audition library clicks without committing tracks; recording remains explicit.
        panel.addEventListener('click', e => {
            const button = e.target.closest('.armature-pose-btn, .armature-move-btn, .armature-face-btn, .armature-face-move-btn');
            if (!button) return;
            e.preventDefault(); e.stopImmediatePropagation();
            if (this._armatureRecordingBusy) return;
            const live = this._refreshDetectedArmatureReference(this._currentArmature) || rig;
            const kind = button.dataset.poseKey ? 'pose' : button.dataset.expressionKey ? 'expression'
                : button.dataset.faceMoveKey ? 'face-movement' : 'movement';
            const key = button.dataset.poseKey || button.dataset.moveKey || button.dataset.expressionKey || button.dataset.faceMoveKey;
            if (kind === 'movement') panel._syncRecordingMovementTempo?.(key);
            panel._markRecordingActionRecent?.(kind, key);
            this._selectArmatureRecordingAction(this._armatureActionSpec(kind, key, live), { preview: true });
        }, { capture: true, signal });
        panel.addEventListener('change', e => {
            if (host.contains(e.target) || e.target.closest('#armature-cross-view')) return;
            if (!/^armature-(speed|distance|travel|stride|action-tempo|end-|finish-|layer-)/.test(e.target.id || '')) return;
            if (this._armatureSelectedAction && !this._armatureRecordingBusy) this._prepareSelectedArmatureAction();
        }, { signal });
        panel.addEventListener('click', e => {
            if (e.target.closest('#armature-action-tempo-reset, #armature-travel-px-clear, #armature-travel-y-px-clear')
                && this._armatureSelectedAction && !this._armatureRecordingBusy) this._prepareSelectedArmatureAction();
        }, { signal });
        if (!this._armatureRecordingHooks) {
            this._armatureRecordingHooks = true;
            eventBus.on('timeline:time', () => this._refreshArmatureRecordingControls());
            eventBus.on('timeline:update', () => this._refreshArmatureRecordingControls());
            // Finish audition before an unrelated edit, scene navigation, playback or keyboard command.
            const interrupt = e => {
                const own = e.target.closest?.('#armature-record-row');
                if (this._armatureRecordingBusy) {
                    if (e.type === 'keydown' && e.key === 'Escape') this._armatureRecordingBusy.cancelled = true;
                    const cancelButton = e.target.closest?.('[data-record="stop"]');
                    if (!own || (e.type === 'keydown' && e.key !== 'Tab' && !cancelButton)) { e.preventDefault(); e.stopImmediatePropagation(); }
                } else if (this._armatureClipPreview && (!own || e.key === 'Escape'
                    // Checkbox change handlers stop playback after the toggle. Hiding the
                    // preview progress on pointerdown moves the checkbox before click.
                    || e.target.matches?.('input:not([type="checkbox"]):not([type="radio"]), select'))) this._stopArmatureClipPreview();
            };
            document.addEventListener('pointerdown', interrupt, true);
            document.addEventListener('keydown', interrupt, true);
            document.addEventListener('visibilitychange', () => { if (document.hidden) this._stopArmatureClipPreview(); });
            window.addEventListener('resize', () => this._fitArmatureRecordingPanel());
        }
        requestAnimationFrame(() => this._fitArmatureRecordingPanel());
        this._refreshArmatureRecordingControls();
        this._mountActivityKitControls?.(host, rig);
    },

    _fitArmatureRecordingPanel() {
        const panel = document.getElementById('armature-panel');
        if (!panel) return;
        if (window.innerWidth <= 700) {
            if (panel.dataset.docked === 'true') { Utils.undockPanel(panel); panel._recordingMobileUndocked = true; }
            Utils.clampFloatingPanel(panel);
        } else if (panel._recordingMobileUndocked) {
            panel._recordingMobileUndocked = false; Utils.dockPanel(panel);
        }
    },

    async _selectArmatureRecordingAction(spec, options = {}) {
        this._stopArmatureClipPreview();
        this._armatureEditingAction = null;
        this._armatureActionDuration = null; this._armatureActionCycles = null;
        this._armatureSelectedAction = spec;
        if (/^(aim|shoot)-(handgun|rifle)-(front|back|side)$/.test(spec.key || '')
            || /^scenario-/.test(spec.key || '') && this._activityKitFor?.(spec)) {
            this._activityKitSettings(spec.rootId).enabled = true;
            const host = document.querySelector('#armature-record-row');
            if (host && !host.querySelector('.activity-kit-controls')) this._mountActivityKitControls?.(host, this._currentArmature);
        }
        this._armaturePreparedAction = null;
        this._refreshActivityKitControls?.();
        if (!options.preview) document.querySelector('#armature-record-row')?.scrollIntoView({ block: 'nearest' });
        const clip = await this._prepareSelectedArmatureAction();
        if (options.preview && clip && this._armatureSelectedAction === spec) {
            const rig = this._currentArmature;
            this._startArmatureClipPreview(clip, this._armatureActionStart(rig), this._armatureActionSnapshot(rig), true);
        }
        return clip;
    },

    async _prepareSelectedArmatureAction() {
        if (!this._armatureSelectedAction || this._armatureRecordingBusy) return null;
        const clip = await this._compileArmatureSelectedAction();
        if (clip) {
            this._armaturePreparedAction = clip;
            const contact = clip.validation?.contacts;
            this._armatureActionStatus(contact?.unresolvedSamples
                ? `Ready; review hand contact (maximum target error ${contact.maxResidualPx.toFixed(1)} px).`
                : 'Ready.', contact?.unresolvedSamples ? 'warning' : 'ready');
        }
        return clip;
    },

    async _compileArmatureSelectedAction() {
        const edit = this._armatureEditingAction;
        if (!edit) return this._compileArmatureActionDraft();
        if (this._armatureRecordingBusy) return null;
        this._stopArmatureClipPreview();
        const snapshot = this._armatureActionSnapshot(this._currentArmature);
        try {
            this._removeArmatureActionTracks(edit);
            // Rebuild from the clip's starting state, not its currently scrubbed pose.
            for (const [id, state] of Object.entries(edit.recipe.startStates || {})) {
                const obj = this.objects.getObjectById(id);
                if (obj) {
                    if (edit.recipe.startViews?.[id]) ArmatureViewState.apply(obj, edit.recipe.startViews[id]);
                    this.animations._restoreFullState(obj, { ...obj.toJSON(), ...Utils.deepClone(state) });
                }
            }
            this._currentArmature = this._refreshDetectedArmatureReference(this._currentArmature);
            this.objects._resolvePins();
            return await this._compileArmatureActionDraft();
        } finally { this._restoreArmatureActionSnapshot(snapshot, true); }
    },

    async _compileArmatureActionDraft() {
        if (this._armatureRecordingBusy || this.animations.isPlaying || this.animations._exportingVideo
            || this.objects._isRecording) {
            this._armatureActionStatus('Stop timeline playback or stage recording first.', 'error'); return null;
        }
        this._stopArmatureClipPreview();
        const spec = this._armatureSelectedAction;
        let rig = this._refreshDetectedArmatureReference(this._currentArmature);
        if (!spec || spec.rootId !== rig?.root?.id || spec.view !== this._getUniversalCharacterCurrentViewSwitchKey(rig)) {
            this._armatureActionStatus('Choose an action for the current character view.', 'error'); return null;
        }
        this._stopArmatureMovement(rig);
        this._stopArmatureFacialMovement?.(rig);
        this._captureArmatureStageBasePosition(rig);
        eventBus.emit('history:flush');
        const snapshot = this._armatureActionSnapshot(rig);
        const token = { cancelled: false };
        let debugSource = null;
        this._armatureRecordingBusy = token;
        this._armatureActionStatus(spec.kind === 'cross' ? 'Preparing cross-view sequence...' : 'Preparing timeline action...', 'busy');
        try {
            // Let the busy status paint before synchronous keyframe generation.
            await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
            if (token.cancelled) throw new Error('Action cancelled. No animation was added.');
            this.stage._armaturePreparing = true;
            this.animations.originalStates = snapshot.originals ? new Map(snapshot.originals) : new Map();
            this.animations.currentTime = 0;
            (this._getArmatureViewTransitionObjects(rig) || []).forEach(obj => {
                if (!obj.animations?.length) this.animations.originalStates.delete(obj.id);
            });
            const options = { delayMsOverride: 0, autoAppendArmatureChain: false, previewAfterRecord: false,
                repeatCountOverride: this._armatureActionCycles || undefined,
                showToast: false, emitEvents: false, updateProperties: false, skipRecordSequenceAdvance: true,
                endFacingKey: this._armatureEndFacingKey, endFacingTurnMode: this._armatureEndFacingTurnMode,
                endFacingTurnSide: this._armatureEndFacingTurnSide, finishPoseKey: this._armatureFinishPoseKey,
                finishExpressionKey: this._armatureFinishExpressionKey, finishGazeKey: this._armatureFinishGazeKey };
            if (spec.kind === 'cross') {
                const sequence = await this._compileArmatureCrossViewSequence(rig, spec.options);
                this._recordArmatureCrossViewSequence(sequence, options);
            } else if (spec.kind === 'pose') {
                const pose = this._getActiveArmaturePoseCatalog(rig)?.[spec.key];
                if (!pose) throw new Error('This pose is no longer available in the selected view.');
                this._recordArmaturePose(rig, this._materializeArmatureTalkingEntry(rig, pose), { ...options, simultaneous: true, holdPose: true,
                    transitionMs: this._armaturePoseTransition * 1000, holdMs: this._armaturePoseHold * 1000, reapplyPose: false });
            } else if (spec.kind === 'expression') {
                this._recordArmatureFacialExpression(rig, spec.key);
            } else if (spec.kind === 'face-movement') {
                this._recordArmatureFacialMovement(rig, spec.key, options);
            } else {
                const catalog = this._getActiveArmatureMovementCatalog(rig);
                const resolved = this._resolveFront3qTurnAroundMovementAlias?.(rig, spec.key, catalog) || { key: spec.key, entry: catalog[spec.key] };
                const key = resolved.key, move = resolved.entry;
                if (!move) throw new Error('This movement is no longer available in the selected view.');
                if (!move.turnAround && !move.frontBackTurnAround && !move.flipInPlace) {
                    const poses = this._getActiveArmaturePoseCatalog(rig);
                    const keys = new Set(['idle', ...(move.keyframes || []).map(frame => frame.pose).filter(Boolean)]);
                    debugSource = { movement: Utils.deepClone(move), poses: Object.fromEntries([...keys]
                        .filter(poseKey => poses[poseKey]).map(poseKey => [poseKey, Utils.deepClone(poses[poseKey])])) };
                }
                if (move.armatureGesture) this._recordArmatureMovement(rig, key, {
                    ...options, movementEntryOverride: this._getDecoratedArmatureMovementEntry(key, move, rig)
                });
                else if (move.flipInPlace) this._recordArmatureFlipInPlace(rig, key, options);
                else if (move.frontBackTurnAround) this._recordArmatureFrontBackTurnAroundMovement(rig, key, options);
                else if (move.turnAround) this._recordArmatureTurnAroundMovement(rig, key, options);
                else this._recordArmatureMovementWithEndFacing(rig, key, options);
            }
            if (token.cancelled) throw new Error('Action cancelled. No animation was added.');
            if (!spec.armatureGesture) await this._compileActivityKit?.(rig, spec, snapshot, token);
            if (this.objects.getObjectById(rig.root.id) !== snapshot.root) throw new Error('Character changed. No animation was added.');
            const tracks = new Map(), additions = [];
            let durationMs = 0;
            this.objects.objects.forEach(obj => {
                const before = snapshot.states.get(obj.id);
                const ids = new Set(before?.json.animations?.map(a => a.id) || []);
                let added = (obj.animations || []).filter(a => !ids.has(a.id));
                if (spec.armatureGesture && (this._armatureGesturePosture || 'current') === 'current') {
                    const isArm = Object.entries(rig.parts || {}).some(([key, part]) => /arm|hand/.test(key) && part.obj?.id === obj.id);
                    if (!isArm) return;
                    const keep = key => /^(jointAngle_|jointTiltX_|jointTiltY_|jointCrossOffset_|rotation$|jointBaseAngle$|pinBaseTilt[XY]$|tilt[XY]$|_armatureDrawLayer$)/.test(key);
                    added = Utils.deepClone(added).filter(track => {
                        if (Array.isArray(track.generated)) {
                            track.generated = track.generated.filter(config => keep(config.property));
                            return track.generated.length;
                        }
                        const generated = track.generated;
                        if (!generated?.keyframes) return false;
                        generated.keyframes.forEach(frame => { frame.values = Object.fromEntries(Object.entries(frame.values).filter(([key]) => keep(key))); });
                        generated.properties = (generated.properties || []).filter(keep);
                        return generated.properties.length;
                    });
                }
                if (!added.length) return;
                if (spec.kind === 'pose' || spec.kind === 'expression') added.forEach(a => {
                    a.delay = 0;
                    const duration = (this._armaturePoseTransition + this._armaturePoseHold) * 1000;
                    a.params.duration = duration / 1000;
                    if (Array.isArray(a.generated)) {
                        const from = {}, to = {};
                        a.generated.forEach(config => { from[config.property] = config.from; to[config.property] = config.to; });
                        const keyframes = [{ t: 0, values: from },
                            { t: this._armaturePoseTransition * 1000 / duration, values: to }];
                        if (this._armaturePoseHold > 0) keyframes.push({ t: 1, values: { ...to } });
                        a.type = 'continuous';
                        a.generated = { type: 'continuous', duration, properties: Object.keys(to), keyframes, segmentEasing: 'easeInOutQuad' };
                    }
                });
                tracks.set(obj.id, Utils.cloneProjectState(added));
                added.forEach(a => { durationMs = Math.max(durationMs, (Number(a.delay) || 0) + this._armatureTrackDuration(a)); });
                if (!before) additions.push(obj);
            });
            if (!tracks.size || !durationMs) throw new Error('No animation could be generated for this action.');
            if (spec.kind === 'pose' && this._armatureActionCycles > 1) {
                tracks.forEach(values => values.forEach(track => { track.repeat = String(this._armatureActionCycles); }));
                durationMs *= this._armatureActionCycles;
            }
            const ratio = this._armatureActionDuration > 0 ? this._armatureActionDuration * 1000 / durationMs : 1;
            if (ratio !== 1) tracks.forEach(values => values.forEach(track => {
                track.delay = (Number(track.delay) || 0) * ratio;
                if (track.params?.duration) track.params.duration *= ratio;
                const configs = Array.isArray(track.generated) ? track.generated : [track.generated];
                configs.forEach(config => {
                    if (config?.duration) config.duration *= ratio;
                    if (config?._stepDelay) config._stepDelay *= ratio;
                });
            }));
            durationMs *= ratio;
            const startStates = {}, startViews = {};
            for (const obj of this._getArmatureViewTransitionObjects(rig) || []) {
                const json = snapshot.states.get(obj.id)?.json;
                if (!json) continue;
                if (snapshot.states.get(obj.id).view) startViews[obj.id] = snapshot.states.get(obj.id).view;
                startStates[obj.id] = Object.fromEntries(Object.entries(json).filter(([key]) =>
                    /^(x|y|width|height|scaleX|scaleY|rotation|skewX|skewY|tiltX|tiltY|pivotX|pivotY|pinnedTo|joints|jointDirection|jointRig|visible)$/.test(key)));
            }
            const controls = {};
            for (const key of this._armatureEditableControlKeys()) if (this[key] !== undefined) controls[key] = Utils.deepClone(this[key]);
            const activityOriginals = Object.fromEntries([...tracks]
                .filter(([id, values]) => snapshot.states.has(id) && values.some(a => a.generated?.properties?.includes('activityRootId')))
                .map(([id]) => [id, { ...snapshot.states.get(id).json, animations: [] }]));
            const validation = this._validateArmatureCompiledTracks(tracks);
            if (token.contactDiagnostics) validation.contacts = { ...token.contactDiagnostics };
            if (validation.errors.length) throw new Error(validation.errors[0].message);
            const clip = { name: spec.name, rootId: spec.rootId, tracks, additions, durationMs, validation,
                recipe: { version: 1, spec: Utils.deepClone(spec), controls, startStates, startViews, activityOriginals, debugSource,
                    contacts: token.contactDiagnostics ? { ...token.contactDiagnostics } : null,
                    kit: Utils.deepClone(this._activityKitSettings?.(spec.rootId) || {}) },
                originals: new Map(this.animations.originalStates || []) };
            if (!this._characterSequenceCompiling && spec.kind === 'movement' && Number(this._armatureTravelAngle)) {
                const angle = Number(this._armatureTravelAngle);
                if (!Number.isFinite(angle) || Math.abs(angle) > 180) throw Error('Travel angle must be between -180 and 180 degrees.');
                const movement = this._getActiveArmatureMovementCatalog(rig)?.[spec.key];
                if (!this._isArmatureWalkStrideMovement(spec.key, movement)) throw Error('Travel angle applies only to walking/running movements.');
                this._redirectCharacterSequenceTravel(clip, angle, rig);
            }
            if (!this._characterSequenceCompiling && !spec.armatureGesture) {
                const kit = this._activityKitSettings?.(spec.rootId);
                await this._replaceCharacterSequenceProps?.(clip, { kit: kit?.enabled, propReplacements: kit?.propReplacements });
            }
            if (token.cancelled) throw new Error('Action cancelled. No animation was added.');
            return clip;
        } catch (error) {
            this._armaturePreparedAction = null;
            this._armatureActionStatus(error.message || 'Could not prepare the action. Nothing was added.', 'error');
            return null;
        } finally {
            if (this._restoreArmatureActionSnapshot(snapshot, true)) this._armatureSelectedAction = spec;
            this.stage._armaturePreparing = false;
            this.stage.requestRender();
            this._armatureRecordingBusy = null;
            this._refreshArmatureRecordingControls();
        }
    },

    _validateArmatureCompiledTracks(tracks) {
        const errors = [], warnings = [], boundaries = new Set();
        const issue = (target, objectId, property, message) => target.push({ objectId, property, message });
        tracks.forEach((entries, objectId) => entries.forEach(track => {
            const start = Number(track.delay ?? 0);
            if (!Number.isFinite(start) || start < 0) issue(errors, objectId, 'delay', 'Compiled animation has an invalid start time.');
            const configs = Array.isArray(track.generated) ? track.generated : [track.generated];
            configs.filter(Boolean).forEach(config => {
                const duration = Number(config.duration ?? (Number(track.params?.duration) * 1000));
                if (!Number.isFinite(duration) || duration <= 0) issue(errors, objectId, 'duration', 'Compiled animation has an invalid duration.');
                boundaries.add(start);
                boundaries.add(start + duration);
                let previousTime = -Infinity, previousValues = null;
                for (const frame of config.keyframes || []) {
                    if (!Number.isFinite(frame.t) || frame.t < 0 || frame.t > 1 || frame.t < previousTime) {
                        issue(errors, objectId, 'keyframe', 'Compiled keyframe times must be ordered and between zero and one.');
                    }
                    const values = frame.values || { [config.property]: frame.value };
                    for (const [property, value] of Object.entries(values)) {
                        if (typeof value === 'number' && !Number.isFinite(value)) issue(errors, objectId, property, 'Compiled animation contains a non-finite value.');
                        const previous = previousValues?.[property];
                        if (property === 'scaleX' && typeof previous === 'number' && previous * value < 0) {
                            issue(warnings, objectId, property, 'Mirror sign changes inside a track; verify discrete boundary handling.');
                        }
                    }
                    previousTime = frame.t;
                    previousValues = values;
                }
            });
        }));
        return { version: 1, errors, warnings, boundariesMs: [...boundaries].filter(Number.isFinite).sort((a, b) => a - b),
            scope: 'Track structure only; contacts, visual parity and boundary precedence require runtime tests.' };
    },

    _installArmatureAction(clip, start, groupId) {
        const install = () => this._installArmatureActionTracks(clip, start, groupId);
        return this.objects.recordPropertyEvidenceAction
            ? this.objects.recordPropertyEvidenceAction(`Install animation: ${clip.name}`, install, [...clip.tracks.keys()])
            : install();
    },

    _installArmatureActionTracks(clip, start, groupId) {
        const available = new Set([...this.objects.objects, ...clip.additions].map(obj => obj.id));
        for (const id of clip.tracks.keys()) if (!available.has(id)) throw new Error('A character part is missing. Nothing was added.');
        for (const obj of clip.additions) if (obj.pinnedTo && !available.has(obj.pinnedTo)) throw new Error('An attachment parent is missing. Nothing was added.');
        this._validateArmatureContactSchedule(clip, start, groupId);
        clip.additions.forEach(obj => {
            if (!this.objects.getObjectById(obj.id)) { obj.animations = []; obj.visible = false; this.objects.objects.push(obj); }
        });
        for(const prop of clip.additions.filter(o=>o.sceneAsset?.sharedHandoff)){
            const objects=this.objects.objects,at=objects.indexOf(prop);if(at<0)continue;
            objects.splice(at,1);
            const hands=(prop.sceneAsset.sharedHandoffHands||[]).map(id=>objects.findIndex(o=>o.id===id)).filter(i=>i>=0);
            objects.splice(hands.length?Math.min(...hands):objects.length,0,prop);
        }
        if (!(this.animations.originalStates instanceof Map)) this.animations.originalStates = new Map();
        const installed = [];
        clip.tracks.forEach((tracks, id) => {
            const obj = this.objects.getObjectById(id);
            if (!obj) throw new Error('A character part is missing. Nothing was added.');
            if (!obj.animations.length || !this.animations.originalStates.has(id)) {
                const original = clip.originals.get(id);
                if (original) this.animations.originalStates.set(id, Utils.cloneProjectState(original));
            }
            tracks.forEach(track => {
                const added = { ...Utils.cloneProjectState(track), id: Utils.generateId('anim'),
                    delay: start + (Number(track.delay) || 0), _armatureActionId: groupId, _armatureActionName: clip.name };
                obj.animations.push(added);
                installed.push({ objectId: id, id: added.id });
            });
        });
        if (clip.recipe && installed.length) {
            const first = installed[0];
            this.objects.getObjectById(first.objectId).animations.find(a => a.id === first.id)._armatureActionRecipe = {
                ...Utils.cloneProjectState(clip.recipe), additions: clip.additions.map(o => o.id)
            };
        }
        return installed;
    },

    _validateArmatureContactSchedule(clip, start, groupId) {
        const channels = track => new Set(Array.isArray(track.generated)
            ? track.generated.map(config => config.property)
            : track.generated?.properties || Object.keys(track.generated?.keyframes?.[0]?.values || {}));
        const interval = (track, offset) => {
            const begin = offset + (Number(track.delay) || 0);
            const repeats = this.animations?._getAnimationRepeatCount?.(track)
                ?? (track.repeat === '-1' || track.repeat === true ? Infinity : Math.max(1, parseInt(track.repeatCount ?? track.repeat, 10) || 1));
            const duration = this._armatureTrackDuration({ ...track, repeat: 1 }) * repeats;
            return [begin, begin + duration];
        };
        const contact = track => /hand contacts$/.test(track.name || '');
        for (const [id, tracks] of clip.tracks) {
            const object = this.objects.getObjectById(id);
            for (const incoming of tracks) for (const existing of object?.animations || []) {
                if (existing._armatureActionId === groupId && groupId) continue;
                if (!contact(incoming) && !contact(existing)) continue;
                const a = interval(incoming, start), b = interval(existing, 0);
                if (Math.min(a[1], b[1]) <= Math.max(a[0], b[0]) + .001) continue;
                const used = channels(existing);
                if (![...channels(incoming)].some(key => used.has(key) && /^(joint|armatureReach)/.test(key))) continue;
                const error = new Error(`Hand contact conflicts with "${existing.name || 'another animation'}" on ${object.name || id}. Move its timeline timing or remove the overlapping action.`);
                error.code = 'ARMATURE_CONTACT_CONFLICT';
                error.nextStart = b[1] - (Number(incoming.delay) || 0);
                throw error;
            }
        }
    },

    _findArmatureContactStart(clip, start, groupId) {
        for (let attempt = 0; attempt < 1000; attempt++) {
            try { this._validateArmatureContactSchedule(clip, start, groupId); return start; }
            catch (error) {
                if (error.code !== 'ARMATURE_CONTACT_CONFLICT') throw error;
                if (!Number.isFinite(error.nextStart) || error.nextStart <= start || error.nextStart > 86400000) {
                    throw new Error('No available contact slot within 24 hours. Shorten or remove the overlapping animation.');
                }
                start = error.nextStart;
            }
        }
        throw new Error('Too many contact conflicts to schedule automatically. Choose a later timeline position.');
    },

    async _runArmatureSelectedAction(mode) {
        if (this._armatureRecordingBusy || (this._armatureClipPreview && mode !== 'add')) return;
        if (mode === 'add') this._stopArmatureClipPreview();
        const invalid = [...document.querySelectorAll('#armature-record-row input[type="number"]')].find(input => !input.checkValidity());
        if (invalid) { invalid.reportValidity(); return; }
        const clip = await this._compileArmatureSelectedAction();
        if (!clip) return;
        this._armaturePreparedAction = clip;
        const rig = this._currentArmature;
        let start = this._armatureActionStart(rig);
        const before = this._armatureActionSnapshot(rig);
        if (mode === 'preview') {
            this._startArmatureClipPreview(clip, start, before, true);
            return;
        }
        this._armatureRecordingBusy = { cancelled: false };
        this._armatureActionStatus('Adding to timeline...', 'busy');
        try {
            await new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, 0)));
            if (this._armatureRecordingBusy.cancelled) throw new Error('Action cancelled. No animation was added.');
            if (this.objects.getObjectById(before.root.id) !== before.root) throw new Error('Character changed. No animation was added.');
            const id = this._armatureEditingAction?.id || Utils.generateId('armature-action');
            if (this._armatureAvoidContactConflicts) start = this._findArmatureContactStart(clip, start, id);
            if (this._armatureEditingAction) this._removeArmatureActionTracks(this._armatureEditingAction);
            const tracks = this._installArmatureAction(clip, start, id);
            this._armatureLastAction = { id, tracks, rootId: clip.rootId, name: clip.name,
                start, durationMs: clip.durationMs, additions: clip.additions.map(o => o.id),
                activityOriginals: new Map([...clip.tracks].filter(([, values]) => values.some(a => a.generated?.properties?.includes('activityRootId')))
                    .filter(([objectId]) => before.states.has(objectId)).map(([objectId]) => [objectId, before.states.get(objectId).json])) };
        } catch (error) {
            this._restoreArmatureActionSnapshot(before, true);
            this._armatureActionStatus(error.message, 'error');
            return;
        } finally { this._armatureRecordingBusy = null; this._refreshArmatureRecordingControls(); }
        const updated = !!this._armatureEditingAction;
        this._armatureLastAction.updated = updated;
        this._armatureEditingAction = null;
        eventBus.emit('timeline:update'); eventBus.emit('objects:updated');
        eventBus.emit('history:push'); eventBus.emit('history:flush');
        this._armatureActionStatus(`${updated ? 'Updated' : 'Added'}: ${clip.name} / ${(start / 1000).toFixed(2)}-${((start + clip.durationMs) / 1000).toFixed(2)} s`, 'success');
        this._showArmatureStageReceipt(rig, this._armatureLastAction);
        if (this._armaturePreviewAfterAdd) this._playArmatureRecordedAction(this._armatureLastAction);
    },

    _clearArmatureStageReceipt() {
        const receipt = this._armatureStageReceipt;
        if (!receipt) return;
        cancelAnimationFrame(receipt.raf);
        clearTimeout(receipt.timer);
        receipt.element.remove();
        this._armatureStageReceipt = null;
    },

    _showArmatureStageReceipt(rig, action) {
        this._clearArmatureStageReceipt();
        const viewport = this.stage?.viewport, root = rig?.root;
        if (!viewport || !root || !action) return;
        // Editor-only DOM, never part of the canvas, project or exported video.
        const element = document.createElement('div');
        element.className = 'armature-stage-receipt';
        element.setAttribute('role', 'status');
        element.setAttribute('aria-live', 'polite');
        element.setAttribute('aria-atomic', 'true');
        element.innerHTML = '<i class="fas fa-check-circle" aria-hidden="true"></i><div><strong>Added to timeline</strong><span></span></div>';
        if (action.updated) element.querySelector('strong').textContent = 'Updated on timeline';
        element.querySelector('span').textContent = action.name;
        viewport.appendChild(element);
        const parts = this._getArmatureViewTransitionObjects(rig) || [root];
        const receipt = { element, raf: null, timer: null };
        this._armatureStageReceipt = receipt;
        const position = () => {
            if (this._armatureStageReceipt !== receipt) return;
            const exists = action.tracks.some(item => this.objects.getObjectById(item.objectId)?.animations?.some(a => a.id === item.id));
            if (!element.isConnected || this.objects.getObjectById(root.id) !== root || !exists || this.animations._exportingVideo) {
                this._clearArmatureStageReceipt(); return;
            }
            const rect = viewport.getBoundingClientRect(), padding = 16;
            let minX = padding, maxX = rect.width - padding;
            // Collapsed tool rails overlap the stage on narrow screens.
            const leftRail = document.getElementById('collapsed-left-bar')?.getBoundingClientRect();
            const rightRail = document.getElementById('collapsed-right-bar')?.getBoundingClientRect();
            if (leftRail?.width && leftRail.right > rect.left) minX = Math.max(minX, leftRail.right - rect.left + 12);
            if (rightRail?.width && rightRail.left < rect.right) maxX = Math.min(maxX, rightRail.left - rect.left - 12);
            element.style.maxWidth = `${Math.max(0, Math.min(240, maxX - minX))}px`;
            const bounds = parts.filter(obj => obj.visible !== false).map(obj => obj.getBounds());
            element.hidden = !bounds.length || maxX - minX < 80 || rect.height < 80;
            if (element.hidden) { receipt.raf = requestAnimationFrame(position); return; }
            const left = Math.min(...bounds.map(b => b.x)), right = Math.max(...bounds.map(b => b.x + b.width));
            const anchor = this.stage.stageToScreen(right, root.y + root.height * .25);
            const size = element.getBoundingClientRect();
            let x = anchor.x - rect.left + 12;
            if (x + size.width > maxX) x = this.stage.stageToScreen(left, 0).x - rect.left - size.width - 12;
            element.style.left = `${Math.max(minX, Math.min(x, maxX - size.width))}px`;
            element.style.top = `${Math.max(padding, Math.min(anchor.y - rect.top, rect.height - size.height - padding))}px`;
            element.hidden = rect.height < size.height + padding * 2;
            receipt.raf = requestAnimationFrame(position);
        };
        position();
        receipt.timer = setTimeout(() => {
            if (this._armatureStageReceipt === receipt) this._clearArmatureStageReceipt();
        }, 4500);
    },

    _playArmatureRecordedAction(action) {
        if (!action || this._armatureRecordingBusy || this.animations.isPlaying || this.animations._exportingVideo) return;
        this._stopArmatureClipPreview();
        const tracks = action.tracks.map(item => this.objects.getObjectById(item.objectId)?.animations?.find(a => a.id === item.id)).filter(Boolean);
        if (!tracks.length) return;
        const start = Math.min(...tracks.map(a => Number(a.delay) || 0));
        const end = Math.max(...tracks.map(a => (Number(a.delay) || 0) + this._armatureTrackDuration(a)));
        this._startArmatureClipPreview({ ...action, durationMs: end - start }, start,
            this._armatureActionSnapshot(this._currentArmature), false);
    },

    _startArmatureClipPreview(clip, start, snapshot, temporary, onStop = null) {
        eventBus.emit('history:flush');
        const active = { clip, start, snapshot, temporary, elapsed: 0, raf: null, started: null,
            message: this._armatureActionMessage, onStop };
        this._armatureClipPreview = active;
        try {
            if (temporary) {
                if (this._armatureEditingAction) this._removeArmatureActionTracks(this._armatureEditingAction);
                this._installArmatureAction(clip, start, 'preview');
            }
            this.animations.originalStates = new Map(this.animations.originalStates || []);
            snapshot.states.forEach((value, id) => {
                if (!this.animations.originalStates.has(id)) this.animations.originalStates.set(id, value.json);
            });
        } catch (error) {
            this._stopArmatureClipPreview(); this._armatureActionStatus(error.message, 'error'); return;
        }
        this._armatureActionStatus(`Previewing: ${clip.name}`, 'preview');
        const frame = () => {
            if (this._armatureClipPreview !== active) return;
            if (!document.getElementById('armature-panel') || this.animations.isPlaying || this.animations._exportingVideo
                || this.objects.getObjectById(snapshot.root.id) !== snapshot.root) { this._stopArmatureClipPreview(); return; }
            // A queued RAF timestamp can predate expensive movement preparation.
            const now = performance.now();
            active.started ??= now;
            active.elapsed = Math.min(clip.durationMs, now - active.started);
            try {
                this.animations.currentTime = start + active.elapsed;
                this.animations.applyAnimationsAtTime(start + active.elapsed, { timelinePreview: true, finalPose: false });
                this.objects._resolvePins(); this.stage.requestRender();
                const progress = document.querySelector('#armature-record-row progress');
                if (progress) progress.value = active.elapsed;
                if (active.elapsed >= clip.durationMs) { this._stopArmatureClipPreview(true); return; }
                active.raf = requestAnimationFrame(frame);
            } catch (error) { this._stopArmatureClipPreview(); this._armatureActionStatus(`Preview failed: ${error.message}`, 'error'); }
        };
        active.raf = requestAnimationFrame(frame);
    },

    _stopArmatureClipPreview(completed = false) {
        const active = this._armatureClipPreview;
        if (!active) return;
        cancelAnimationFrame(active.raf);
        const restored = this._restoreArmatureActionSnapshot(active.snapshot, active.temporary);
        if (restored) this.animations.originalStates = active.snapshot.originals;
        this._armatureClipPreview = null;
        active.onStop?.({ completed, restored });
        this._armatureActionStatus(restored
            ? (completed ? 'Preview complete. Starting state restored.' : 'Preview stopped. Starting state restored.')
            : 'Preview stopped. Character changed.');
    },

    _showArmatureRecordedAction() {
        const action = this._armatureLastAction;
        if (!action) return;
        window.app?.setTimelineCollapsedState(false);
        const timeline = window.app?.timeline;
        if (!timeline) return;
        timeline.selectedAnimKeys = new Set(action.tracks.map(t => timeline._makeAnimSelectionKey(t.objectId, t.id)));
        timeline.selectedAnimObjId = action.tracks[0]?.objectId;
        timeline.selectedAnimId = action.tracks[0]?.id;
        eventBus.emit('timeline:update');
        requestAnimationFrame(() => document.querySelector('.timeline-bar.selected')?.scrollIntoView({ block: 'nearest', inline: 'center' }));
    },

    _undoArmatureRecordedAction() {
        const action = this._armatureLastAction;
        if (!action || this._armatureRecordingBusy) return;
        this._stopArmatureClipPreview();
        eventBus.emit('history:flush');
        const removed = new Set();
        this.objects.objects.forEach(obj => {
            obj.animations = obj.animations.filter(track => {
                if (track._armatureActionId !== action.id) return true;
                removed.add(track.id); return false;
            });
        });
        if (!removed.size) return;
        if (this._armatureEditingAction?.id === action.id) this._armatureEditingAction = null;
        this.objects.objects = this.objects.objects.filter(obj => !action.additions.includes(obj.id) || obj.animations.length || (!obj.sceneAsset?.activityKit && obj.visible !== false));
        action.activityOriginals?.forEach((state, id) => {
            const obj = this.objects.getObjectById(id);
            if (obj && !obj.animations.length) { this.animations._restoreFullState(obj, state); obj.layer = state.layer; }
        });
        action.additions.forEach(id => { if (!this.objects.getObjectById(id)) this.animations.originalStates?.delete(id); });
        this._armatureLastAction = null;
        eventBus.emit('timeline:update'); eventBus.emit('objects:updated'); eventBus.emit('history:push');
        this._armatureActionStatus(`Removed: ${action.name}`, 'success');
    }
});
