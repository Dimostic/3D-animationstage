/* ============================================
   Project Doctor
   Project health, animation conflicts, and pose library access
   ============================================ */

class ProjectDoctor {
    constructor(app) {
        this.app = app;
        this.modal = null;
    }

    analyze() {
        const objects = this._getObjects();
        const scenes = this._getScenes();
        const animations = this._collectAnimations(objects);
        const conflicts = this._findAnimationConflicts(animations);
        const sceneHealth = this._analyzeScenes(scenes, objects);
        const cleanup = this._analyzeCleanup(objects, animations);
        const repairs = this._analyzeRepairs(objects);
        const assetHealth = this._analyzeAssetOptimizer(objects);
        const audioMarkers = this._analyzeAudioMarkers();
        const layerMasks = this._analyzeLayerMasks(objects);
        const issues = [];
        const warnings = [];
        const tips = [];
        const lockedObjects = objects.filter(obj => !!obj?.locked);
        const hiddenObjects = objects.filter(obj => obj?.visible === false);
        const animatedHidden = objects.filter(obj => obj?.visible === false && Array.isArray(obj?.animations) && obj.animations.length);

        if (!objects.length) {
            tips.push({
                title: 'Stage is empty',
                detail: 'Add an object before running preview, export, or animation checks.'
            });
        }

        objects.forEach((obj) => {
            const name = this._objectName(obj);
            const type = String(obj?.type || '').toLowerCase();
            if ((type === 'image' || obj?.imageSrc || obj?.src) && !obj.imageSrc && !obj.src && !obj.imageData && !obj.dataUrl) {
                issues.push({
                    title: 'Image source is missing',
                    detail: `${name} has no stored image data or reusable source URL. Reinsert or relink it before export.`,
                    objectId: obj.id || obj.objectId || null
                });
            }
            if (Array.isArray(obj?.animations)) {
                obj.animations.forEach((anim) => {
                    if (!anim) return;
                    if (!anim.id) {
                        warnings.push({
                            title: 'Animation has no id',
                            detail: `${name} has an animation without an id. It can still play, but timeline edits may be less reliable.`,
                            objectId: obj.id || obj.objectId || null
                        });
                    }
                    if (!this._getAnimationProperties(anim).length) {
                        warnings.push({
                            title: 'Animation target is unclear',
                            detail: `${name} has "${this._animationName(anim)}" but no detectable animated property. Preview this before export.`,
                            objectId: obj.id || obj.objectId || null
                        });
                    }
                });
            }
        });

        if (lockedObjects.length) {
            tips.push({
                title: 'Locked objects found',
                detail: `${lockedObjects.length} object(s) are locked. Unlock them before editing if selection feels blocked.`
            });
        }
        if (hiddenObjects.length) {
            tips.push({
                title: 'Hidden objects found',
                detail: `${hiddenObjects.length} object(s) are hidden on the stage.`
            });
        }
        if (animatedHidden.length) {
            warnings.push({
                title: 'Hidden objects have animations',
                detail: `${animatedHidden.length} hidden object(s) also have animations. They may be invisible in preview/export.`
            });
        }
        if (conflicts.length) {
            warnings.push({
                title: 'Animation conflicts detected',
                detail: `${conflicts.length} overlapping animation track(s) affect the same object property at the same time.`
            });
        }
        cleanup.issues.forEach(issue => issues.push(issue));
        cleanup.warnings.forEach(warning => warnings.push(warning));
        sceneHealth.issues.forEach(issue => issues.push(issue));
        sceneHealth.warnings.forEach(warning => warnings.push(warning));
        sceneHealth.tips.forEach(tip => tips.push(tip));

        const previewExport = this._getPreviewExportReport();
        if (previewExport?.errors?.length) {
            issues.push({
                title: 'Preview/export checker found errors',
                detail: `${previewExport.errors.length} export readiness error(s) need attention.`
            });
        }
        if (previewExport?.warnings?.length) {
            warnings.push({
                title: 'Preview/export checker has warnings',
                detail: `${previewExport.warnings.length} preview/export item(s) should be reviewed.`
            });
        }

        const poseLibrary = this._getPoseLibraryStatus();
        return {
            status: issues.length ? 'error' : (warnings.length ? 'check' : 'ready'),
            counts: {
                scenes: scenes.length || 1,
                objects: objects.length,
                animations: animations.length,
                locked: lockedObjects.length,
                hidden: hiddenObjects.length
            },
            issues,
            warnings,
            tips,
            conflicts,
            sceneHealth,
            cleanup,
            repairs,
            assetHealth,
            audioMarkers,
            layerMasks,
            previewExport,
            poseLibrary
        };
    }

    openReport(options = {}) {
        const report = this.analyze();
        const modal = this._ensureModal();
        modal.querySelector('.project-doctor-body').innerHTML = this._renderReport(report, options);
        modal.classList.remove('hidden');

        const close = () => modal.classList.add('hidden');
        modal.querySelectorAll('[data-project-doctor-close]').forEach(btn => {
            btn.onclick = close;
        });
        modal.querySelector('[data-project-doctor-refresh]')?.addEventListener('click', () => this.openReport(options));
        modal.querySelector('[data-project-doctor-preview]')?.addEventListener('click', () => {
            if (this.app?.previewExportCompat?.openReport) {
                this.app.previewExportCompat.openReport();
            }
        });
        modal.querySelector('[data-project-doctor-storyboard]')?.addEventListener('click', () => this.openStoryboard());
        modal.querySelector('[data-project-doctor-cleanup]')?.addEventListener('click', () => this.openTimelineCleanup());
        modal.querySelector('[data-project-doctor-motion-presets]')?.addEventListener('click', () => this.openMotionPresetBuilder());
        modal.querySelector('[data-project-doctor-rig-presets]')?.addEventListener('click', () => this.openRigPresetBuilder());
        modal.querySelector('[data-project-doctor-assets]')?.addEventListener('click', () => this.openAssetOptimizer());
        modal.querySelector('[data-project-doctor-audio-markers]')?.addEventListener('click', () => this.openAudioMarkers());
        modal.querySelector('[data-project-doctor-layer-mask]')?.addEventListener('click', () => this.openLayerMaskTool());
        modal.querySelector('[data-project-doctor-characters]')?.addEventListener('click', () => this.openReusableCharacters());
        modal.querySelector('[data-project-doctor-poses]')?.addEventListener('click', () => this.openPoseLibrary());
        modal.querySelector('[data-project-doctor-copy]')?.addEventListener('click', () => this.copyReport(report));
        modal.querySelectorAll('[data-project-doctor-select]').forEach((btn) => {
            btn.addEventListener('click', () => this.selectObject(btn.dataset.projectDoctorSelect));
        });
        modal.querySelector('[data-project-doctor-unlock]')?.addEventListener('click', () => {
            this.unlockAllObjects();
            this.openReport(options);
        });
        modal.querySelector('[data-project-doctor-reveal]')?.addEventListener('click', () => {
            this.revealAnimatedObjects();
            this.openReport(options);
        });
        modal.querySelector('[data-project-doctor-fix-animation-ids]')?.addEventListener('click', () => {
            this.fixAnimationIds();
            this.openReport(options);
        });
        modal.querySelector('[data-project-doctor-normalize-durations]')?.addEventListener('click', async () => {
            const ok = await this._confirm(
                'Normalize clearly invalid animation durations to 1 second? You can undo this from the normal Undo button.',
                'Normalize Animation Durations'
            );
            if (!ok) return;
            this.normalizeInvalidAnimationDurations();
            this.openReport(options);
        });
        modal.querySelectorAll('[data-project-doctor-load-scene]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.loadSceneFromStoryboard(Number(btn.dataset.projectDoctorLoadScene));
                this.openStoryboard();
            });
        });
        modal.querySelectorAll('[data-project-doctor-rename-scene]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.renameSceneFromStoryboard(Number(btn.dataset.projectDoctorRenameScene));
                this.openStoryboard();
            });
        });
        modal.querySelectorAll('[data-project-doctor-duplicate-scene]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.duplicateSceneFromStoryboard(Number(btn.dataset.projectDoctorDuplicateScene));
                this.openStoryboard();
            });
        });
        modal.querySelectorAll('[data-project-doctor-move-scene]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.moveSceneFromStoryboard(Number(btn.dataset.projectDoctorMoveScene), Number(btn.dataset.projectDoctorMoveDirection));
                this.openStoryboard();
            });
        });
        modal.querySelector('[data-project-doctor-preview-all-scenes]')?.addEventListener('click', () => this.previewAllScenes());
        modal.querySelector('[data-project-doctor-add-scene]')?.addEventListener('click', () => {
            this.app?.addScene?.();
            this.openStoryboard();
        });
        modal.querySelector('[data-project-doctor-save-scene-template]')?.addEventListener('click', () => {
            this.saveCurrentSceneAsTemplate();
            this.openStoryboard();
        });
        modal.querySelectorAll('[data-project-doctor-load-scene-template]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.loadSceneTemplate(btn.dataset.projectDoctorLoadSceneTemplate);
                this.openStoryboard();
            });
        });
        modal.querySelector('[data-project-doctor-save-motion-preset]')?.addEventListener('click', () => {
            this.saveMotionPresetFromSelection();
            this.openMotionPresetBuilder();
        });
        modal.querySelectorAll('[data-project-doctor-apply-motion-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.applyMotionPresetToSelection(btn.dataset.projectDoctorApplyMotionPreset);
                this.openMotionPresetBuilder();
            });
        });
        modal.querySelectorAll('[data-project-doctor-preview-motion-preset]').forEach((btn) => {
            btn.addEventListener('click', () => this.previewMotionPresetOnSelection(btn.dataset.projectDoctorPreviewMotionPreset));
        });
        modal.querySelector('[data-project-doctor-motion-search]')?.addEventListener('input', (event) => {
            this._motionPresetSearch = event.target.value || '';
            this.openMotionPresetBuilder();
        });
        modal.querySelector('[data-project-doctor-motion-category]')?.addEventListener('change', (event) => {
            this._motionPresetCategory = event.target.value || 'all';
            this.openMotionPresetBuilder();
        });
        modal.querySelectorAll('[data-project-doctor-delete-motion-preset]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const ok = await this._confirm('Delete this motion preset?', 'Delete Motion Preset');
                if (!ok) return;
                this.deleteMotionPreset(btn.dataset.projectDoctorDeleteMotionPreset);
                this.openMotionPresetBuilder();
            });
        });
        modal.querySelector('[data-project-doctor-save-rig-preset]')?.addEventListener('click', () => {
            this.saveRigPresetFromSelection();
            this.openRigPresetBuilder();
        });
        modal.querySelectorAll('[data-project-doctor-apply-rig-preset]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.applyRigPresetToSelection(btn.dataset.projectDoctorApplyRigPreset);
                this.openRigPresetBuilder();
            });
        });
        modal.querySelectorAll('[data-project-doctor-delete-rig-preset]').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const ok = await this._confirm('Delete this rig preset?', 'Delete Rig Preset');
                if (!ok) return;
                this.deleteRigPreset(btn.dataset.projectDoctorDeleteRigPreset);
                this.openRigPresetBuilder();
            });
        });
        modal.querySelector('[data-project-doctor-optimize-selected-assets]')?.addEventListener('click', async () => {
            await this.optimizeSelectedImages();
            this.openAssetOptimizer();
        });
        modal.querySelector('[data-project-doctor-optimize-all-assets]')?.addEventListener('click', async () => {
            const ok = await this._confirm('Optimize all oversized embedded images on the current stage? You can undo this from the normal Undo button.', 'Optimize Images');
            if (!ok) return;
            await this.optimizeAllImages();
            this.openAssetOptimizer();
        });
        modal.querySelector('[data-project-doctor-add-marker]')?.addEventListener('click', () => {
            this.addAudioMarkerAtCurrentTime();
            this.openAudioMarkers();
        });
        modal.querySelector('[data-project-doctor-generate-beat-markers]')?.addEventListener('click', () => {
            const sensitivity = Number(modal.querySelector('[data-project-doctor-marker-sensitivity]')?.value || 62);
            const minGapMs = Number(modal.querySelector('[data-project-doctor-marker-gap]')?.value || 350);
            const maxMarkers = Number(modal.querySelector('[data-project-doctor-marker-max]')?.value || 80);
            this.generateAudioBeatMarkers({ sensitivity, minGapMs, maxMarkers });
            this.openAudioMarkers();
        });
        modal.querySelector('[data-project-doctor-clear-beat-markers]')?.addEventListener('click', async () => {
            const ok = await this._confirm('Clear generated audio beat markers?', 'Clear Audio Markers');
            if (!ok) return;
            this.clearGeneratedAudioMarkers();
            this.openAudioMarkers();
        });
        modal.querySelectorAll('[data-project-doctor-delete-marker]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.deleteAudioMarker(btn.dataset.projectDoctorDeleteMarker);
                this.openAudioMarkers();
            });
        });
        modal.querySelectorAll('[data-project-doctor-jump-marker]').forEach((btn) => {
            btn.addEventListener('click', () => this.jumpToAudioMarker(btn.dataset.projectDoctorJumpMarker));
        });
        modal.querySelector('[data-project-doctor-apply-layer-mask]')?.addEventListener('click', () => {
            this.applyLayerMaskFromSelection();
            this.openLayerMaskTool();
        });
        modal.querySelector('[data-project-doctor-remove-layer-mask]')?.addEventListener('click', () => {
            this.removeLayerMasksFromSelection();
            this.openLayerMaskTool();
        });
        modal.querySelector('[data-project-doctor-reveal-layer-mask-shapes]')?.addEventListener('click', () => {
            this.revealLayerMaskShapes();
            this.openLayerMaskTool();
        });
        modal.querySelector('[data-project-doctor-save-character]')?.addEventListener('click', () => {
            this.saveReusableCharacter();
            this.openReusableCharacters();
        });
        modal.querySelectorAll('[data-project-doctor-load-character]').forEach((btn) => {
            btn.addEventListener('click', () => {
                this.loadReusableCharacter(btn.dataset.projectDoctorLoadCharacter);
                this.openReusableCharacters();
            });
        });
    }

    openConflicts() {
        this.openReport({ focus: 'conflicts' });
    }

    openStoryboard() {
        this.openReport({ focus: 'storyboard' });
    }

    openTimelineCleanup() {
        this.openReport({ focus: 'cleanup' });
    }

    openMotionPresetBuilder() {
        this.openReport({ focus: 'motion-presets' });
    }

    openRigPresetBuilder() {
        this.openReport({ focus: 'rig-presets' });
    }

    openAssetOptimizer() {
        this.openReport({ focus: 'assets' });
    }

    openAudioMarkers() {
        this.openReport({ focus: 'audio-markers' });
    }

    openLayerMaskTool() {
        this.openReport({ focus: 'layer-mask' });
    }

    openReusableCharacters() {
        this.openReport({ focus: 'characters' });
    }

    openPoseLibrary() {
        const jointSystem = this.app?.jointSystem || window.app?.jointSystem;
        if (jointSystem && typeof jointSystem.showPoseLibrary === 'function') {
            jointSystem.showPoseLibrary();
            return true;
        }
        const rigging = this.app?.rigging || window.app?.rigging;
        if (rigging && typeof rigging.showPoseLibrary === 'function') {
            rigging.showPoseLibrary();
            return true;
        }
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast('Pose Library is available after the rig tools finish loading.', 'warning');
        }
        return false;
    }

    selectObject(objectId) {
        if (!objectId) return false;
        const manager = this.app?.objects;
        const obj = manager?.getObjectById?.(objectId) || this._getObjects().find(item => item?.id === objectId || item?.objectId === objectId);
        if (!obj) {
            this._toast('Object was not found on the current stage.', 'warning');
            return false;
        }
        if (obj.locked) obj.locked = false;
        if (obj.visible === false) obj.visible = true;
        if (typeof manager?.select === 'function') {
            manager.select([objectId]);
        } else if (Array.isArray(manager?.selectedIds)) {
            manager.selectedIds = [objectId];
        }
        this._centerStageOnObject(obj);
        this._notifyObjectChange();
        this._toast(`Selected ${this._objectName(obj)}.`, 'success');
        return true;
    }

    unlockAllObjects() {
        const objects = this._getObjects();
        let changed = 0;
        this._beginRepair();
        objects.forEach((obj) => {
            if (obj?.locked) {
                obj.locked = false;
                changed += 1;
            }
        });
        if (changed) this._commitRepair();
        else this._notifyObjectChange();
        this._toast(changed ? `Unlocked ${changed} object(s).` : 'No locked objects found.', changed ? 'success' : 'info');
        return changed;
    }

    revealAnimatedObjects() {
        const objects = this._getObjects();
        let changed = 0;
        this._beginRepair();
        objects.forEach((obj) => {
            if (obj?.visible === false && Array.isArray(obj.animations) && obj.animations.length) {
                obj.visible = true;
                changed += 1;
            }
        });
        if (changed) this._commitRepair();
        else this._notifyObjectChange();
        this._toast(changed ? `Revealed ${changed} animated object(s).` : 'No hidden animated objects found.', changed ? 'success' : 'info');
        return changed;
    }

    loadSceneFromStoryboard(index) {
        if (!Number.isInteger(index) || index < 0 || index >= this._getScenes().length) {
            this._toast('Scene was not found.', 'warning');
            return false;
        }
        try {
            this.app?._saveCurrentScene?.();
            this.app?._loadScene?.(index);
            this.app?.renderSceneBar?.();
            this._toast(`Opened scene ${index + 1}.`, 'success');
            return true;
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to open storyboard scene:', error);
            this._toast('Could not open that scene.', 'warning');
            return false;
        }
    }

    renameSceneFromStoryboard(index) {
        const scenes = this._getScenes();
        const scene = scenes[index];
        if (!scene) return false;
        const name = this._prompt('Scene name:', scene.name || `Scene ${index + 1}`);
        if (!name) return false;
        scene.name = String(name).trim() || `Scene ${index + 1}`;
        this.app?.renderSceneBar?.();
        this._toast('Scene renamed.', 'success');
        return true;
    }

    duplicateSceneFromStoryboard(index) {
        if (!this.loadSceneFromStoryboard(index)) return false;
        if (typeof this.app?.duplicateScene !== 'function') {
            this._toast('Scene duplication is not available in this session.', 'warning');
            return false;
        }
        this.app.duplicateScene();
        return true;
    }

    moveSceneFromStoryboard(index, direction) {
        const scenes = this._getScenes();
        const destination = index + (direction < 0 ? -1 : 1);
        if (!scenes[index] || destination < 0 || destination >= scenes.length) return false;
        this.app?._saveCurrentScene?.();
        const currentScene = scenes[this.app?.currentSceneIndex || 0];
        const [scene] = scenes.splice(index, 1);
        scenes.splice(destination, 0, scene);
        const nextCurrentIndex = scenes.indexOf(currentScene);
        if (nextCurrentIndex >= 0 && this.app) this.app.currentSceneIndex = nextCurrentIndex;
        this.app?.renderSceneBar?.();
        this._toast('Scene order updated.', 'success');
        return true;
    }

    previewAllScenes() {
        const candidates = [
            () => this.app?.previewAllScenes?.(),
            () => this.app?.exportManager?.previewAllScenes?.(),
            () => (typeof document !== 'undefined' ? document.getElementById('btn-preview-all-scenes')?.click() : undefined),
            () => (typeof document !== 'undefined' ? document.getElementById('btn-preview-all-scenes-menu')?.click() : undefined)
        ];
        for (const run of candidates) {
            try {
                const result = run();
                if (result !== undefined) return true;
            } catch (error) {
                console.warn('[ProjectDoctor] Preview all scenes failed:', error);
            }
        }
        this._toast('Preview all scenes is not available in this session.', 'warning');
        return false;
    }

    saveReusableCharacter(options = {}) {
        const jointSystem = this.app?.jointSystem;
        const armature = this._getUniversalCharacterArmature();
        if (!jointSystem || !armature) {
            this._toast('Select a Universal Character before saving it.', 'warning');
            return null;
        }
        const config = jointSystem._getUniversalCharacterStyleConfig?.(armature);
        if (!config) {
            this._toast('This character has no reusable style data.', 'warning');
            return null;
        }
        const fallbackName = `${config.view || 'Front'} ${config.gender || 'Character'} ${config.bodyType || ''}`.replace(/\s+/g, ' ').trim();
        const name = typeof options === 'string'
            ? options
            : (options?.name || this._prompt('Reusable character name:', fallbackName));
        if (!name) return null;
        const template = jointSystem._saveUniversalCharacterStyleTemplate?.(name, config);
        if (template) {
            this._toast(`Saved "${template.name}" as a reusable character.`, 'success');
        }
        return template || null;
    }

    loadReusableCharacter(templateId) {
        const jointSystem = this.app?.jointSystem;
        const template = this._getReusableCharacterTemplates().find(item => String(item.id) === String(templateId));
        if (!jointSystem || !template?.config) {
            this._toast('Reusable character was not found.', 'warning');
            return null;
        }
        let armature = null;
        try {
            this._beginRepair();
            const config = JSON.parse(JSON.stringify(template.config));
            armature = jointSystem.createUniversalCharacterViewSet?.(config)
                || jointSystem.createUniversalCharacter?.(config)
                || null;
            if (armature?.root?.id && this.app?.objects?.select) {
                this.app.objects.select([armature.root.id]);
            }
            this._commitRepair();
            this._toast(`Loaded reusable character "${template.name}".`, 'success');
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to load reusable character:', error);
            this._toast('Could not load that reusable character.', 'warning');
        }
        return armature;
    }

    saveMotionPresetFromSelection(options = {}) {
        const selected = this._getSelectedObjects();
        const source = selected.find(obj => Array.isArray(obj?.animations) && obj.animations.length);
        if (!source) {
            this._toast('Select an object with animations before saving a motion preset.', 'warning');
            return null;
        }
        const name = typeof options === 'string'
            ? options
            : (options?.name || this._prompt('Motion preset name:', `${this._objectName(source)} motion`));
        if (!name) return null;
        const animations = this._cloneAnimationsForPreset(source.animations);
        const presets = this._loadMotionPresets();
        const preset = {
            id: this._makeStoredId('motion'),
            name,
            createdAt: Date.now(),
            sourceType: source.type || null,
            category: this._inferMotionPresetCategory(animations),
            animationCount: animations.length,
            animations
        };
        presets.unshift(preset);
        this._saveMotionPresets(presets);
        this._toast(`Saved "${preset.name}" as a motion preset.`, 'success');
        return preset;
    }

    applyMotionPresetToSelection(presetId) {
        const preset = this._loadMotionPresets().find(item => String(item.id) === String(presetId));
        if (!preset?.animations?.length) {
            this._toast('Motion preset was not found.', 'warning');
            return 0;
        }
        const selected = this._getSelectedObjects().filter(Boolean);
        if (!selected.length) {
            this._toast('Select one or more objects before applying a motion preset.', 'warning');
            return 0;
        }
        let changed = 0;
        this._beginRepair();
        selected.forEach((obj, objectIndex) => {
            if (!Array.isArray(obj.animations)) obj.animations = [];
            const seen = new Set(obj.animations.map(anim => String(anim?.id || '')).filter(Boolean));
            preset.animations.forEach((anim, animIndex) => {
                const clone = this._clonePlain(anim);
                clone.id = this._makeAnimationId(obj, objectIndex, obj.animations.length + animIndex, seen);
                seen.add(clone.id);
                obj.animations.push(clone);
                changed += 1;
            });
        });
        if (changed) this._commitRepair();
        this._toast(changed ? `Applied ${preset.name} to ${selected.length} object(s).` : 'No animations were applied.', changed ? 'success' : 'info');
        return changed;
    }

    previewMotionPresetOnSelection(presetId) {
        const preset = this._loadMotionPresets().find(item => String(item.id) === String(presetId));
        const selected = this._getSelectedObjects().filter(Boolean);
        const animations = this.app?.animations;
        if (!preset?.animations?.length || !selected.length || !animations?.playAll) {
            this._toast('Select an object, then choose a saved motion preset to preview.', 'warning');
            return false;
        }
        if (this._motionPresetPreviewTimer) clearTimeout(this._motionPresetPreviewTimer);
        if (animations.isPlaying) animations.stop?.();
        const originalStacks = selected.map(obj => ({ obj, animations: this._clonePlain(obj.animations || []) }));
        selected.forEach((obj, objectIndex) => {
            const seen = new Set((obj.animations || []).map(anim => String(anim?.id || '')).filter(Boolean));
            const temporary = preset.animations.map((anim, animIndex) => {
                const clone = this._clonePlain(anim);
                clone.id = this._makeAnimationId(obj, objectIndex, (obj.animations || []).length + animIndex, seen);
                seen.add(clone.id);
                return clone;
            });
            obj.animations = [...(obj.animations || []), ...temporary];
        });
        const previousLooping = !!animations.looping;
        animations.looping = false;
        animations.playAll(false);
        const playbackMs = Math.max(750, Number(animations.totalDuration) || 1000) + 250;
        this._motionPresetPreviewTimer = setTimeout(() => {
            if (animations.isPlaying) animations.stop?.();
            originalStacks.forEach(item => { item.obj.animations = item.animations; });
            animations.looping = previousLooping;
            this._notifyObjectChange();
        }, playbackMs);
        this._toast(`Previewing ${preset.name} without saving it.`, 'info');
        return true;
    }

    deleteMotionPreset(presetId) {
        const presets = this._loadMotionPresets();
        const next = presets.filter(item => String(item.id) !== String(presetId));
        if (next.length === presets.length) {
            this._toast('Motion preset was not found.', 'warning');
            return false;
        }
        this._saveMotionPresets(next);
        this._toast('Motion preset deleted.', 'success');
        return true;
    }

    saveRigPresetFromSelection() {
        const source = this._getSelectedObjects().find(obj => this._hasRigData(obj));
        if (!source) {
            this._toast('Select a rigged object, assembled body part, or flex object first.', 'warning');
            return null;
        }
        const name = this._prompt('Rig preset name:', `${this._objectName(source)} rig`);
        if (!name) return null;
        const preset = {
            id: this._makeStoredId('rig'),
            name: String(name).trim(),
            createdAt: Date.now(),
            sourceType: source.type || null,
            data: this._extractRigPresetData(source)
        };
        const presets = this._loadRigPresets();
        presets.unshift(preset);
        this._saveRigPresets(presets);
        this._toast(`Saved "${preset.name}" as a rig preset.`, 'success');
        return preset;
    }

    applyRigPresetToSelection(presetId) {
        const preset = this._loadRigPresets().find(item => String(item.id) === String(presetId));
        const selected = this._getSelectedObjects().filter(Boolean);
        if (!preset?.data || !selected.length) {
            this._toast('Select one or more target objects before applying a rig preset.', 'warning');
            return 0;
        }
        this._beginRepair();
        selected.forEach(obj => this._applyRigPresetData(obj, preset.data));
        this._commitRepair();
        this._toast(`Applied ${preset.name} to ${selected.length} object(s).`, 'success');
        return selected.length;
    }

    deleteRigPreset(presetId) {
        const presets = this._loadRigPresets();
        const next = presets.filter(item => String(item.id) !== String(presetId));
        if (next.length === presets.length) return false;
        this._saveRigPresets(next);
        this._toast('Rig preset deleted.', 'success');
        return true;
    }

    saveCurrentSceneAsTemplate() {
        this.app?._saveCurrentScene?.();
        const scene = this._getScenes()[this.app?.currentSceneIndex || 0];
        if (!scene) return null;
        const name = this._prompt('Scene template name:', scene.name || 'Scene template');
        if (!name) return null;
        const templates = this._loadSceneTemplates();
        const template = { id: this._makeStoredId('scene-template'), name: String(name).trim(), scene: this._clonePlain(scene), createdAt: Date.now() };
        templates.unshift(template);
        this._saveSceneTemplates(templates);
        this._toast(`Saved "${template.name}" as a scene template.`, 'success');
        return template;
    }

    loadSceneTemplate(templateId) {
        const template = this._loadSceneTemplates().find(item => String(item.id) === String(templateId));
        if (!template?.scene || !Array.isArray(this.app?.scenes)) return false;
        this.app?._saveCurrentScene?.();
        const scene = this._clonePlain(template.scene);
        scene.id = `scene_${Date.now()}`;
        scene.name = `${template.name} Copy`;
        this.app.scenes.splice((this.app.currentSceneIndex || 0) + 1, 0, scene);
        this.app?._loadScene?.((this.app.currentSceneIndex || 0) + 1);
        this._toast(`Added scene template "${template.name}".`, 'success');
        return true;
    }

    async optimizeSelectedImages() {
        const targets = this._getSelectedObjects().filter(obj => this._isImageAssetObject(obj));
        if (!targets.length) {
            this._toast('Select one or more image objects before optimizing.', 'warning');
            return { optimized: 0, skipped: 0, savedBytes: 0 };
        }
        return this._optimizeImageObjects(targets);
    }

    async optimizeAllImages() {
        return this._optimizeImageObjects(this._getObjects().filter(obj => this._isImageAssetObject(obj)));
    }

    async _optimizeImageObjects(objects = []) {
        const targets = objects.filter(Boolean);
        if (!targets.length) {
            this._toast('No image assets found on the current stage.', 'info');
            return { optimized: 0, skipped: 0, savedBytes: 0 };
        }
        let optimized = 0;
        let skipped = 0;
        let savedBytes = 0;
        this._beginRepair();
        for (const obj of targets) {
            try {
                const result = await this._optimizeImageObject(obj);
                if (result.optimized) {
                    optimized += 1;
                    savedBytes += result.savedBytes || 0;
                } else {
                    skipped += 1;
                }
            } catch (error) {
                skipped += 1;
                console.warn('[ProjectDoctor] Image optimization failed:', error);
            }
        }
        if (optimized) this._commitRepair();
        else this._notifyObjectChange();
        this._toast(
            optimized ? `Optimized ${optimized} image(s), saved about ${this._formatBytes(savedBytes)}.` : 'No oversized embedded images needed optimization.',
            optimized ? 'success' : 'info'
        );
        return { optimized, skipped, savedBytes };
    }

    addAudioMarkerAtCurrentTime(label = '') {
        const time = this._getCurrentTimelineTime() / 1000;
        const marker = {
            id: this._makeStoredId('marker'),
            time: Math.max(0, Number(time) || 0),
            label: label || `Marker ${this._getAudioMarkers().length + 1}`,
            source: 'manual',
            createdAt: Date.now()
        };
        const markers = this._getAudioMarkers();
        markers.push(marker);
        this._setAudioMarkers(markers);
        this._toast(`Added audio marker at ${this._formatSeconds(marker.time)}.`, 'success');
        return marker;
    }

    generateAudioBeatMarkers(options = {}) {
        const audioTimeline = this.app?.audioTimeline;
        const buffer = audioTimeline?.audioBuffer;
        if (!buffer || typeof buffer.getChannelData !== 'function') {
            this._toast('Load an audio track before generating beat markers.', 'warning');
            return [];
        }
        const sensitivity = Math.max(1, Math.min(100, Number(options.sensitivity) || 62));
        const minGapMs = Math.max(100, Number(options.minGapMs) || 350);
        const maxMarkers = Math.max(1, Math.min(300, Number(options.maxMarkers) || 80));
        const sampleRate = buffer.sampleRate || 44100;
        const channel = buffer.getChannelData(0);
        const windowSize = Math.max(256, Math.round(sampleRate * 0.04));
        const minGapSamples = Math.round(sampleRate * (minGapMs / 1000));
        const levels = [];
        for (let i = 0; i < channel.length; i += windowSize) {
            let sum = 0;
            const end = Math.min(channel.length, i + windowSize);
            for (let j = i; j < end; j += 1) sum += Math.abs(channel[j] || 0);
            levels.push({ index: i, level: sum / Math.max(1, end - i) });
        }
        if (!levels.length) {
            this._toast('No usable audio samples were found.', 'warning');
            return [];
        }
        const sorted = levels.map(item => item.level).sort((a, b) => a - b);
        const percentileIndex = Math.max(0, Math.min(sorted.length - 1, Math.round(sorted.length * (sensitivity / 100))));
        const threshold = sorted[percentileIndex] || sorted[sorted.length - 1] || 0;
        const candidates = [];
        for (let i = 1; i < levels.length - 1; i += 1) {
            const prev = levels[i - 1];
            const current = levels[i];
            const next = levels[i + 1];
            if (current.level >= threshold && current.level >= prev.level && current.level >= next.level) {
                candidates.push(current);
            }
        }
        candidates.sort((a, b) => b.level - a.level);
        const chosen = [];
        candidates.forEach((candidate) => {
            if (chosen.length >= maxMarkers) return;
            if (chosen.some(item => Math.abs(item.index - candidate.index) < minGapSamples)) return;
            chosen.push(candidate);
        });
        chosen.sort((a, b) => a.index - b.index);
        const existing = this._getAudioMarkers().filter(marker => marker.source !== 'generated-beat');
        const generated = chosen.map((item, index) => ({
            id: this._makeStoredId('beat'),
            time: item.index / sampleRate,
            label: `Beat ${index + 1}`,
            source: 'generated-beat',
            strength: Number(item.level.toFixed(4)),
            createdAt: Date.now()
        }));
        this._setAudioMarkers(existing.concat(generated));
        this._toast(generated.length ? `Generated ${generated.length} beat marker(s).` : 'No clear beats were found with this sensitivity.', generated.length ? 'success' : 'info');
        return generated;
    }

    clearGeneratedAudioMarkers() {
        const markers = this._getAudioMarkers();
        const next = markers.filter(marker => marker.source !== 'generated-beat');
        this._setAudioMarkers(next);
        const removed = markers.length - next.length;
        this._toast(removed ? `Cleared ${removed} generated beat marker(s).` : 'No generated beat markers to clear.', removed ? 'success' : 'info');
        return removed;
    }

    deleteAudioMarker(markerId) {
        const markers = this._getAudioMarkers();
        const next = markers.filter(marker => String(marker.id) !== String(markerId));
        if (next.length === markers.length) {
            this._toast('Audio marker was not found.', 'warning');
            return false;
        }
        this._setAudioMarkers(next);
        this._toast('Audio marker deleted.', 'success');
        return true;
    }

    jumpToAudioMarker(markerId) {
        const marker = this._getAudioMarkers().find(item => String(item.id) === String(markerId));
        if (!marker) {
            this._toast('Audio marker was not found.', 'warning');
            return false;
        }
        const time = Math.max(0, Number(marker.time) || 0);
        const timeMs = time * 1000;
        const timeline = this.app?.timeline;
        const animations = this.app?.animations;
        if (typeof timeline?.seek === 'function') timeline.seek(timeMs);
        else if (typeof timeline?.setCurrentTime === 'function') timeline.setCurrentTime(timeMs);
        else if (typeof animations?.seekTo === 'function') animations.seekTo(timeMs);
        else if (animations) animations.currentTime = timeMs;
        this.app?.stage?.requestRender?.();
        this._toast(`Jumped to ${this._formatSeconds(time)}.`, 'success');
        return true;
    }

    applyLayerMaskFromSelection() {
        const pair = this._resolveLayerMaskSelection();
        if (!pair?.target || !pair?.mask) {
            this._toast('Select a target object and a shape/path to use as the layer mask.', 'warning');
            return false;
        }
        const { target, mask } = pair;
        this._beginRepair();
        target.layerMask = this._createLayerMaskData(mask, target);
        mask.visible = false;
        mask.locked = true;
        mask._layerMaskSource = true;
        mask._layerMaskTargetId = target.id || target.objectId || null;
        this._commitRepair();
        this._toast(`Applied ${this._objectName(mask)} as a mask for ${this._objectName(target)}.`, 'success');
        return true;
    }

    removeLayerMasksFromSelection() {
        const selected = this._getSelectedObjects();
        const targets = selected.length ? selected : this._getObjects().filter(obj => obj?.layerMask);
        let changed = 0;
        this._beginRepair();
        targets.forEach((obj) => {
            if (obj?.layerMask) {
                obj.layerMask = null;
                changed += 1;
            }
        });
        if (changed) this._commitRepair();
        else this._notifyObjectChange();
        this._toast(changed ? `Removed ${changed} layer mask(s).` : 'No layer masks found on the selected object(s).', changed ? 'success' : 'info');
        return changed;
    }

    revealLayerMaskShapes() {
        let changed = 0;
        this._beginRepair();
        this._getObjects().forEach((obj) => {
            if (obj?._layerMaskSource || obj?.layerMaskSource) {
                obj.visible = true;
                obj.locked = false;
                changed += 1;
            }
        });
        if (changed) this._commitRepair();
        else this._notifyObjectChange();
        this._toast(changed ? `Revealed ${changed} mask source shape(s).` : 'No hidden mask source shapes found.', changed ? 'success' : 'info');
        return changed;
    }

    fixAnimationIds() {
        const objects = this._getObjects();
        let changed = 0;
        this._beginRepair();
        objects.forEach((obj, objectIndex) => {
            const animations = Array.isArray(obj?.animations) ? obj.animations : [];
            const seen = new Set();
            animations.forEach((anim, index) => {
                if (!anim) return;
                const current = anim.id ? String(anim.id) : '';
                if (!current || seen.has(current)) {
                    anim.id = this._makeAnimationId(obj, objectIndex, index, seen);
                    changed += 1;
                }
                seen.add(String(anim.id));
            });
        });
        if (changed) this._commitRepair();
        this._toast(changed ? `Repaired ${changed} animation id(s).` : 'No animation id repairs needed.', changed ? 'success' : 'info');
        return changed;
    }

    normalizeInvalidAnimationDurations(defaultDuration = 1) {
        const objects = this._getObjects();
        const duration = Math.max(0.01, this._num(defaultDuration, 1));
        let changed = 0;
        this._beginRepair();
        objects.forEach((obj) => {
            const animations = Array.isArray(obj?.animations) ? obj.animations : [];
            animations.forEach((anim) => {
                if (!anim) return;
                if (!this._hasPositiveDuration(anim)) {
                    anim.duration = duration;
                    changed += 1;
                    return;
                }
                if (Object.prototype.hasOwnProperty.call(anim, 'duration') && !this._isPositiveDuration(anim.duration)) {
                    anim.duration = duration;
                    changed += 1;
                }
                if (anim.config && typeof anim.config === 'object' && Object.prototype.hasOwnProperty.call(anim.config, 'duration') && !this._isPositiveDuration(anim.config.duration)) {
                    anim.config.duration = duration;
                    changed += 1;
                }
                if (anim.generated && typeof anim.generated === 'object' && Object.prototype.hasOwnProperty.call(anim.generated, 'duration') && !this._isPositiveDuration(anim.generated.duration)) {
                    anim.generated.duration = duration;
                    changed += 1;
                }
            });
        });
        if (changed) this._commitRepair();
        this._toast(changed ? `Normalized ${changed} invalid duration value(s).` : 'No invalid durations found.', changed ? 'success' : 'info');
        return changed;
    }

    async copyReport(report = null) {
        const current = report || this.analyze();
        const text = this._formatReportText(current);
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                this._toast('Project Doctor report copied.', 'success');
                return true;
            }
        } catch (error) {
            console.warn('[ProjectDoctor] Clipboard write failed:', error);
        }
        this._toast('Clipboard is not available in this browser.', 'warning');
        return false;
    }

    _ensureModal() {
        if (this.modal) return this.modal;
        const modal = document.createElement('div');
        modal.className = 'project-doctor-modal hidden';
        modal.innerHTML = `
            <div class="project-doctor-shell">
                <div class="project-doctor-header">
                    <div>
                        <h3><i class="fas fa-stethoscope"></i> Project Doctor</h3>
                        <p>Checks stage health, animation conflicts, and export readiness.</p>
                    </div>
                    <button class="project-doctor-close" data-project-doctor-close title="Close"><i class="fas fa-times"></i></button>
                </div>
                <div class="project-doctor-body"></div>
            </div>
        `;
        modal.addEventListener('click', (event) => {
            if (event.target === modal) modal.classList.add('hidden');
        });
        document.body.appendChild(modal);
        this.modal = modal;
        return modal;
    }

    _renderReport(report, options = {}) {
        const esc = this._escapeHtml;
        const statusLabel = report.status === 'ready' ? 'Ready' : (report.status === 'error' ? 'Needs fixes' : 'Review');
        const statusIcon = report.status === 'ready' ? 'fa-circle-check' : (report.status === 'error' ? 'fa-circle-xmark' : 'fa-triangle-exclamation');
        const focusClass = [
            options.focus === 'conflicts' ? 'project-doctor-focus-conflicts' : '',
            options.focus === 'storyboard' ? 'project-doctor-focus-storyboard' : '',
            options.focus === 'cleanup' ? 'project-doctor-focus-cleanup' : '',
            options.focus === 'motion-presets' ? 'project-doctor-focus-motion-presets' : '',
            options.focus === 'rig-presets' ? 'project-doctor-focus-rig-presets' : '',
            options.focus === 'assets' ? 'project-doctor-focus-assets' : '',
            options.focus === 'audio-markers' ? 'project-doctor-focus-audio-markers' : '',
            options.focus === 'layer-mask' ? 'project-doctor-focus-layer-mask' : '',
            options.focus === 'characters' ? 'project-doctor-focus-characters' : ''
        ].filter(Boolean).join(' ');
        const focusClassName = focusClass ? ` ${focusClass}` : '';
        return `
            <div class="project-doctor-report${focusClassName}">
                <div class="project-doctor-summary project-doctor-summary-${esc(report.status)}">
                    <div class="project-doctor-status"><i class="fas ${statusIcon}"></i><span>${statusLabel}</span></div>
                    <div class="project-doctor-counts">
                        <span>${report.counts.scenes} scene(s)</span>
                        <span>${report.counts.objects} object(s)</span>
                        <span>${report.counts.animations} animation(s)</span>
                        <span>${report.counts.locked} locked</span>
                    </div>
                </div>
                ${this._renderIssues('Fix First', report.issues, 'error')}
                ${this._renderIssues('Review', report.warnings, 'check')}
                ${this._renderConflicts(report.conflicts)}
                ${this._renderStoryboard()}
                ${this._renderSceneHealth(report.sceneHealth)}
                ${this._renderCleanup(report.cleanup)}
                ${this._renderTimelineCleanupTool(report)}
                ${this._renderMotionPresetBuilder()}
                ${this._renderRigPresetBuilder()}
                ${this._renderAssetOptimizer(report.assetHealth)}
                ${this._renderAudioMarkers(report.audioMarkers)}
                ${this._renderLayerMaskTool(report.layerMasks)}
                ${this._renderReusableCharacters()}
                ${this._renderPoseStatus(report.poseLibrary)}
                ${this._renderPreviewExport(report.previewExport)}
                ${this._renderIssues('Helpful Notes', report.tips, 'info')}
                ${this._renderQuickFixes(report)}
                ${this._renderAutoRepairs(report.repairs)}
                <div class="project-doctor-actions">
                    <button class="btn btn-secondary" data-project-doctor-refresh><i class="fas fa-rotate"></i> Recheck</button>
                    <button class="btn btn-secondary" data-project-doctor-copy><i class="fas fa-copy"></i> Copy report</button>
                    <button class="btn btn-secondary" data-project-doctor-storyboard><i class="fas fa-table-cells-large"></i> Storyboard</button>
                    <button class="btn btn-secondary" data-project-doctor-cleanup><i class="fas fa-broom"></i> Cleanup</button>
                    <button class="btn btn-secondary" data-project-doctor-motion-presets><i class="fas fa-layer-group"></i> Motion Presets</button>
                    <button class="btn btn-secondary" data-project-doctor-rig-presets><i class="fas fa-bone"></i> Rig Presets</button>
                    <button class="btn btn-secondary" data-project-doctor-assets><i class="fas fa-compress-arrows-alt"></i> Assets</button>
                    <button class="btn btn-secondary" data-project-doctor-audio-markers><i class="fas fa-music"></i> Audio Markers</button>
                    <button class="btn btn-secondary" data-project-doctor-layer-mask><i class="fas fa-mask"></i> Layer Mask</button>
                    <button class="btn btn-secondary" data-project-doctor-characters><i class="fas fa-user-group"></i> Characters</button>
                    <button class="btn btn-secondary" data-project-doctor-preview><i class="fas fa-clipboard-check"></i> Preview/export check</button>
                    <button class="btn btn-primary" data-project-doctor-poses><i class="fas fa-person-running"></i> Pose Library</button>
                    <button class="btn btn-secondary" data-project-doctor-close>Close</button>
                </div>
            </div>
        `;
    }

    _renderIssues(title, items, level) {
        const esc = this._escapeHtml;
        const rows = (items || []).map(item => `
            <div class="project-doctor-item project-doctor-item-${esc(level)}">
                <div class="project-doctor-item-head">
                    <strong>${esc(item.title)}</strong>
                    ${item.objectId ? `<button class="project-doctor-select-link" data-project-doctor-select="${esc(item.objectId)}">Select object</button>` : ''}
                </div>
                <p>${esc(item.detail)}</p>
            </div>
        `).join('');
        return `
            <section class="project-doctor-section">
                <h4>${esc(title)}</h4>
                ${rows || '<p class="project-doctor-empty">Nothing found.</p>'}
            </section>
        `;
    }

    _renderConflicts(conflicts) {
        const esc = this._escapeHtml;
        const rows = (conflicts || []).map(conflict => `
            <div class="project-doctor-item project-doctor-item-check">
                <div class="project-doctor-item-head">
                    <strong>${esc(conflict.objectName)}: ${esc(conflict.property)}</strong>
                    ${conflict.objectId ? `<button class="project-doctor-select-link" data-project-doctor-select="${esc(conflict.objectId)}">Select object</button>` : ''}
                </div>
                <p>${esc(conflict.firstName)} overlaps ${esc(conflict.secondName)} from ${conflict.start.toFixed(2)}s to ${conflict.end.toFixed(2)}s.</p>
            </div>
        `).join('');
        return `
            <section class="project-doctor-section project-doctor-conflicts">
                <h4>Animation Conflicts</h4>
                ${rows || '<p class="project-doctor-empty">No overlapping tracks detected.</p>'}
            </section>
        `;
    }

    _renderPoseStatus(status) {
        const esc = this._escapeHtml;
        const detail = status.available
            ? 'Existing joint pose library found. This button reuses it instead of creating a duplicate pose system.'
            : 'Pose library hooks are not available yet in this session.';
        return `
            <section class="project-doctor-section">
                <h4>Pose Library</h4>
                <div class="project-doctor-item project-doctor-item-${status.available ? 'ready' : 'check'}">
                    <strong>${esc(status.label)}</strong>
                    <p>${esc(detail)}</p>
                </div>
            </section>
        `;
    }

    _renderSceneHealth(sceneHealth) {
        const rows = [];
        if (sceneHealth?.sceneCount) {
            rows.push({
                title: `${sceneHealth.sceneCount} scene(s) checked`,
                detail: sceneHealth.summary
            });
        }
        (sceneHealth?.tips || []).forEach(item => rows.push(item));
        return this._renderIssues('Scene Health', rows, sceneHealth?.warnings?.length || sceneHealth?.issues?.length ? 'check' : 'ready');
    }

    _renderCleanup(cleanup) {
        const rows = [
            ...(cleanup?.issues || []),
            ...(cleanup?.warnings || []),
            ...(cleanup?.tips || [])
        ];
        return this._renderIssues('Timeline Cleanup', rows, rows.length ? 'check' : 'ready');
    }

    _renderStoryboard() {
        const esc = this._escapeHtml;
        const scenes = this._getScenes();
        const templates = this._loadSceneTemplates();
        const currentIndex = Number.isFinite(this.app?.currentSceneIndex) ? this.app.currentSceneIndex : 0;
        const cards = (scenes.length ? scenes : [{ name: 'Current Scene', objects: this._getObjects() }]).map((scene, index) => {
            const sceneObjects = Array.isArray(scene?.objects) ? scene.objects : [];
            const objectCount = sceneObjects.length || (index === currentIndex ? this._getObjects().length : 0);
            const animationCount = sceneObjects.reduce((sum, obj) => sum + (Array.isArray(obj?.animations) ? obj.animations.length : 0), 0);
            const transition = this._normalizeSceneTransitionSummary(scene?.transitionIn);
            const duration = Number(scene?.duration || scene?.timelineDuration || 0);
            const audio = !!scene?.audioTrack;
            const isCurrent = index === currentIndex;
            const thumbnail = typeof scene?.thumbnail === 'string' && scene.thumbnail.startsWith('data:image/')
                ? `<img src="${esc(scene.thumbnail)}" alt="${esc(scene?.name || `Scene ${index + 1}`)} thumbnail">`
                : `<span>${index + 1}</span>`;
            return `
                <div class="project-doctor-story-card${isCurrent ? ' active' : ''}">
                    <div class="project-doctor-story-thumb">
                        ${thumbnail}
                    </div>
                    <div class="project-doctor-story-meta">
                        <strong>${esc(scene?.name || `Scene ${index + 1}`)}</strong>
                        <p>${objectCount} object(s), ${animationCount} animation(s)${duration > 0 ? `, ${duration}s` : ''}${audio ? ', audio' : ''}</p>
                        <small>${esc(transition)}</small>
                    </div>
                    <div class="project-doctor-story-actions">
                        <button class="project-doctor-select-link" data-project-doctor-load-scene="${index}" ${isCurrent ? 'disabled' : ''}>Open</button>
                        <button class="project-doctor-icon-link" title="Rename scene" aria-label="Rename scene" data-project-doctor-rename-scene="${index}"><i class="fas fa-pen"></i></button>
                        <button class="project-doctor-icon-link" title="Duplicate scene" aria-label="Duplicate scene" data-project-doctor-duplicate-scene="${index}"><i class="fas fa-clone"></i></button>
                        <button class="project-doctor-icon-link" title="Move scene earlier" aria-label="Move scene earlier" data-project-doctor-move-scene="${index}" data-project-doctor-move-direction="-1" ${index === 0 ? 'disabled' : ''}><i class="fas fa-arrow-left"></i></button>
                        <button class="project-doctor-icon-link" title="Move scene later" aria-label="Move scene later" data-project-doctor-move-scene="${index}" data-project-doctor-move-direction="1" ${index === scenes.length - 1 ? 'disabled' : ''}><i class="fas fa-arrow-right"></i></button>
                    </div>
                </div>
            `;
        }).join('');
        return `
            <section class="project-doctor-section project-doctor-storyboard">
                <h4>Scene Storyboard</h4>
                <div class="project-doctor-story-grid">${cards}</div>
                <div class="project-doctor-fix-row project-doctor-section-actions">
                    <button class="btn btn-secondary" data-project-doctor-preview-all-scenes ${scenes.length > 1 ? '' : 'disabled'}>
                        <i class="fas fa-eye"></i> Preview all scenes
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-add-scene>
                        <i class="fas fa-plus"></i> Add scene
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-save-scene-template>
                        <i class="fas fa-bookmark"></i> Save as template
                    </button>
                </div>
                ${templates.length ? `<div class="project-doctor-template-list">${templates.slice(0, 8).map(template => `<button class="project-doctor-select-link" data-project-doctor-load-scene-template="${esc(template.id)}"><i class="fas fa-plus"></i> ${esc(template.name)}</button>`).join('')}</div>` : ''}
            </section>
        `;
    }

    _renderTimelineCleanupTool(report) {
        const cleanupCount = (report.cleanup?.issues?.length || 0) + (report.cleanup?.warnings?.length || 0);
        const repairCount = report.repairs?.total || 0;
        const hasLocked = report.counts.locked > 0;
        const hasHiddenAnimated = this._getObjects().some(obj => obj?.visible === false && Array.isArray(obj.animations) && obj.animations.length);
        return `
            <section class="project-doctor-section project-doctor-cleanup-tool">
                <h4>Timeline Cleanup Tool</h4>
                <div class="project-doctor-item project-doctor-item-${cleanupCount || repairCount ? 'check' : 'ready'}">
                    <strong>${cleanupCount || repairCount ? 'Cleanup actions available' : 'Timeline structure looks clean'}</strong>
                    <p>${cleanupCount} cleanup warning(s), ${repairCount} safe auto-repair(s), ${report.conflicts?.length || 0} conflict(s).</p>
                </div>
                <div class="project-doctor-fix-row">
                    <button class="btn btn-secondary" data-project-doctor-fix-animation-ids ${(report.repairs?.missingAnimationIds || report.repairs?.duplicateAnimationIds) ? '' : 'disabled'}>
                        <i class="fas fa-wand-magic-sparkles"></i> Repair IDs
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-normalize-durations ${report.repairs?.invalidDurations ? '' : 'disabled'}>
                        <i class="fas fa-clock-rotate-left"></i> Normalize durations
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-unlock ${hasLocked ? '' : 'disabled'}>
                        <i class="fas fa-unlock"></i> Unlock objects
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-reveal ${hasHiddenAnimated ? '' : 'disabled'}>
                        <i class="fas fa-eye"></i> Reveal animated
                    </button>
                </div>
            </section>
        `;
    }

    _renderMotionPresetBuilder() {
        const esc = this._escapeHtml;
        const presets = this._loadMotionPresets();
        const search = String(this._motionPresetSearch || '').trim().toLowerCase();
        const category = this._motionPresetCategory || 'all';
        const categories = ['all', ...new Set(presets.map(item => item.category || 'custom'))];
        const visiblePresets = presets.filter(preset => {
            const matchesCategory = category === 'all' || (preset.category || 'custom') === category;
            const haystack = `${preset.name || ''} ${preset.sourceType || ''} ${preset.category || ''}`.toLowerCase();
            return matchesCategory && (!search || haystack.includes(search));
        });
        const selected = this._getSelectedObjects();
        const selectedAnimated = selected.find(obj => Array.isArray(obj?.animations) && obj.animations.length);
        const rows = visiblePresets.map((preset) => `
            <div class="project-doctor-character-row">
                <div>
                    <strong>${esc(preset.name || 'Motion Preset')}</strong>
                    <p>${preset.animationCount || preset.animations?.length || 0} animation(s) · ${esc(preset.category || 'custom')}${preset.sourceType ? ` · source: ${esc(preset.sourceType)}` : ''}</p>
                </div>
                <button class="project-doctor-select-link" data-project-doctor-apply-motion-preset="${esc(preset.id)}">Apply</button>
                <button class="project-doctor-select-link" data-project-doctor-preview-motion-preset="${esc(preset.id)}">Preview</button>
                <button class="project-doctor-select-link danger" data-project-doctor-delete-motion-preset="${esc(preset.id)}">Delete</button>
            </div>
        `).join('');
        return `
            <section class="project-doctor-section project-doctor-motion-presets">
                <h4>Motion Preset Builder</h4>
                <div class="project-doctor-item project-doctor-item-info">
                    <strong>Reuse complete animation stacks</strong>
                    <p>Save animations from the selected object, then apply that same motion stack to another selected object.</p>
                </div>
                <div class="project-doctor-preset-filters">
                    <input data-project-doctor-motion-search value="${esc(this._motionPresetSearch || '')}" placeholder="Search saved motions">
                    <select data-project-doctor-motion-category>${categories.map(item => `<option value="${esc(item)}" ${item === category ? 'selected' : ''}>${esc(item)}</option>`).join('')}</select>
                </div>
                <div class="project-doctor-fix-row project-doctor-section-actions">
                    <button class="btn btn-primary" data-project-doctor-save-motion-preset ${selectedAnimated ? '' : 'disabled'}>
                        <i class="fas fa-save"></i> Save selected motion
                    </button>
                </div>
                <div class="project-doctor-character-list">
                    ${rows || `<p class="project-doctor-empty">${presets.length ? 'No motion presets match this filter.' : 'No motion presets saved yet.'}</p>`}
                </div>
            </section>
        `;
    }

    _renderRigPresetBuilder() {
        const esc = this._escapeHtml;
        const presets = this._loadRigPresets();
        const canSave = this._getSelectedObjects().some(obj => this._hasRigData(obj));
        const target = this._getSelectedObjects()[0] || null;
        const rows = presets.map((preset) => {
            const data = preset.data || {};
            const labels = [];
            if (Array.isArray(data.joints) && data.joints.length) labels.push(`${data.joints.length} joints`);
            if (Array.isArray(data.flexPins) && data.flexPins.length) labels.push(`${data.flexPins.length} flex pins`);
            if (data.rigging?.pins?.length) labels.push(`${data.rigging.pins.length} deform pins`);
            const compatibility = this._getRigPresetCompatibility(preset, target);
            return `
                <div class="project-doctor-character-row">
                    <div>
                        <strong>${esc(preset.name || 'Rig Preset')}</strong>
                        <p>${esc(labels.join(', ') || 'Rig setup data')}${preset.sourceType ? ` · source: ${esc(preset.sourceType)}` : ''}${target ? ` · ${esc(compatibility.detail)}` : ''}</p>
                    </div>
                    <button class="project-doctor-select-link" data-project-doctor-apply-rig-preset="${esc(preset.id)}">Apply</button>
                    <button class="project-doctor-select-link danger" data-project-doctor-delete-rig-preset="${esc(preset.id)}">Delete</button>
                </div>
            `;
        }).join('');
        return `
            <section class="project-doctor-section project-doctor-rig-presets">
                <h4>Rig Presets</h4>
                <div class="project-doctor-item project-doctor-item-info">
                    <strong>Reuse rig setup without replacing artwork</strong>
                    <p>Save the selected object's joints, flex pins, deform pins, and body-part rig settings. Applying a preset only replaces rig setup data on the selected target.</p>
                </div>
                <div class="project-doctor-fix-row project-doctor-section-actions">
                    <button class="btn btn-primary" data-project-doctor-save-rig-preset ${canSave ? '' : 'disabled'}>
                        <i class="fas fa-save"></i> Save selected rig
                    </button>
                </div>
                <div class="project-doctor-character-list">
                    ${rows || '<p class="project-doctor-empty">No rig presets saved yet.</p>'}
                </div>
            </section>
        `;
    }

    _renderAssetOptimizer(assetHealth) {
        const esc = this._escapeHtml;
        const assets = assetHealth?.assets || [];
        const selectedImageCount = this._getSelectedObjects().filter(obj => this._isImageAssetObject(obj)).length;
        const rows = assets.slice(0, 8).map((asset) => `
            <div class="project-doctor-asset-row${asset.needsOptimization ? ' needs-work' : ''}">
                <div>
                    <strong>${esc(asset.name)}</strong>
                    <p>${esc(asset.detail)}</p>
                </div>
                ${asset.objectId ? `<button class="project-doctor-select-link" data-project-doctor-select="${esc(asset.objectId)}">Select</button>` : ''}
            </div>
        `).join('');
        return `
            <section class="project-doctor-section project-doctor-assets">
                <h4>Asset Optimizer</h4>
                <div class="project-doctor-item project-doctor-item-${assetHealth?.oversized ? 'check' : 'ready'}">
                    <strong>${assetHealth?.oversized || 0} oversized image asset(s)</strong>
                    <p>${assetHealth?.summary || 'No embedded image assets were found on the current stage.'}</p>
                </div>
                <div class="project-doctor-fix-row project-doctor-section-actions">
                    <button class="btn btn-primary" data-project-doctor-optimize-selected-assets ${selectedImageCount ? '' : 'disabled'}>
                        <i class="fas fa-compress"></i> Optimize selected image(s)
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-optimize-all-assets ${assetHealth?.optimizable ? '' : 'disabled'}>
                        <i class="fas fa-images"></i> Optimize all oversized
                    </button>
                </div>
                <div class="project-doctor-asset-list">
                    ${rows || '<p class="project-doctor-empty">No image assets found on the current stage.</p>'}
                </div>
            </section>
        `;
    }

    _renderAudioMarkers(audioMarkers) {
        const esc = this._escapeHtml;
        const markers = audioMarkers?.markers || [];
        const rows = markers.slice(0, 16).map((marker) => `
            <div class="project-doctor-marker-row">
                <div>
                    <strong>${esc(marker.label || 'Marker')}</strong>
                    <p>${esc(this._formatSeconds(marker.time))}${marker.source === 'generated-beat' ? ' - generated beat' : ' - manual marker'}</p>
                </div>
                <button class="project-doctor-select-link" data-project-doctor-jump-marker="${esc(marker.id)}">Jump</button>
                <button class="project-doctor-select-link danger" data-project-doctor-delete-marker="${esc(marker.id)}">Delete</button>
            </div>
        `).join('');
        return `
            <section class="project-doctor-section project-doctor-audio-markers">
                <h4>Audio Beat / Marker Tool</h4>
                <div class="project-doctor-item project-doctor-item-${audioMarkers?.hasAudio ? 'info' : 'check'}">
                    <strong>${audioMarkers?.summary || 'No audio loaded'}</strong>
                    <p>Add manual markers at the playhead or generate beat markers from the loaded audio so animations can be lined up to sound.</p>
                </div>
                <div class="project-doctor-marker-controls">
                    <label>Sensitivity <input data-project-doctor-marker-sensitivity type="range" min="20" max="95" value="62"></label>
                    <label>Min gap <input data-project-doctor-marker-gap type="number" min="100" max="3000" step="50" value="350"> ms</label>
                    <label>Max <input data-project-doctor-marker-max type="number" min="1" max="300" step="1" value="80"></label>
                </div>
                <div class="project-doctor-fix-row project-doctor-section-actions">
                    <button class="btn btn-primary" data-project-doctor-generate-beat-markers ${audioMarkers?.hasAudio ? '' : 'disabled'}>
                        <i class="fas fa-wave-square"></i> Generate beat markers
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-add-marker>
                        <i class="fas fa-plus"></i> Add marker at playhead
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-clear-beat-markers ${audioMarkers?.generated ? '' : 'disabled'}>
                        <i class="fas fa-eraser"></i> Clear generated
                    </button>
                </div>
                <div class="project-doctor-marker-list">
                    ${rows || '<p class="project-doctor-empty">No audio markers yet.</p>'}
                </div>
            </section>
        `;
    }

    _renderLayerMaskTool(layerMasks) {
        const esc = this._escapeHtml;
        const selection = this._resolveLayerMaskSelection();
        const selectedMaskedCount = this._getSelectedObjects().filter(obj => obj?.layerMask).length;
        const rows = (layerMasks?.maskedObjects || []).slice(0, 12).map((item) => `
            <div class="project-doctor-marker-row">
                <div>
                    <strong>${esc(item.name)}</strong>
                    <p>${esc(item.detail)}</p>
                </div>
                ${item.objectId ? `<button class="project-doctor-select-link" data-project-doctor-select="${esc(item.objectId)}">Select</button>` : ''}
            </div>
        `).join('');
        return `
            <section class="project-doctor-section project-doctor-layer-mask">
                <h4>Layer Mask</h4>
                <div class="project-doctor-item project-doctor-item-${selection?.target && selection?.mask ? 'info' : 'check'}">
                    <strong>${selection?.target && selection?.mask ? 'Ready to apply mask' : 'Select target + mask shape'}</strong>
                    <p>${selection?.target && selection?.mask
                        ? `${esc(this._objectName(selection.mask))} will mask ${esc(this._objectName(selection.target))}.`
                        : 'Select the object to be masked and a shape/path that defines the visible area. The mask shape will be hidden after applying.'}</p>
                </div>
                <div class="project-doctor-fix-row project-doctor-section-actions">
                    <button class="btn btn-primary" data-project-doctor-apply-layer-mask ${selection?.target && selection?.mask ? '' : 'disabled'}>
                        <i class="fas fa-mask"></i> Apply selected mask
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-remove-layer-mask ${selectedMaskedCount || layerMasks?.count ? '' : 'disabled'}>
                        <i class="fas fa-unlink"></i> Remove selected mask
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-reveal-layer-mask-shapes ${layerMasks?.hiddenSources ? '' : 'disabled'}>
                        <i class="fas fa-eye"></i> Show mask shapes
                    </button>
                </div>
                <div class="project-doctor-marker-list">
                    ${rows || '<p class="project-doctor-empty">No layer masks have been applied yet.</p>'}
                </div>
            </section>
        `;
    }

    _renderReusableCharacters() {
        const esc = this._escapeHtml;
        const templates = this._getReusableCharacterTemplates();
        const rows = templates.map((template) => `
            <div class="project-doctor-character-row">
                <div>
                    <strong>${esc(template.name || 'Reusable Character')}</strong>
                    <p>${esc(this._summarizeCharacterTemplate(template))}</p>
                </div>
                <button class="project-doctor-select-link" data-project-doctor-load-character="${esc(template.id)}">Load</button>
            </div>
        `).join('');
        return `
            <section class="project-doctor-section project-doctor-characters">
                <h4>Reusable Characters</h4>
                <div class="project-doctor-item project-doctor-item-info">
                    <strong>Save Universal Character styles for reuse</strong>
                    <p>Select a Universal Character, save it here, then load the same style into another scene or project session.</p>
                </div>
                <div class="project-doctor-fix-row project-doctor-section-actions">
                    <button class="btn btn-primary" data-project-doctor-save-character>
                        <i class="fas fa-save"></i> Save selected character
                    </button>
                </div>
                <div class="project-doctor-character-list">
                    ${rows || '<p class="project-doctor-empty">No reusable characters saved yet.</p>'}
                </div>
            </section>
        `;
    }

    _renderQuickFixes(report) {
        const hasLocked = report.counts.locked > 0;
        const hasHiddenAnimated = this._getObjects().some(obj => obj?.visible === false && Array.isArray(obj.animations) && obj.animations.length);
        if (!hasLocked && !hasHiddenAnimated) return '';
        return `
            <section class="project-doctor-section">
                <h4>Quick Fixes</h4>
                <div class="project-doctor-fix-row">
                    <button class="btn btn-secondary" data-project-doctor-unlock ${hasLocked ? '' : 'disabled'}>
                        <i class="fas fa-unlock"></i> Unlock all objects
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-reveal ${hasHiddenAnimated ? '' : 'disabled'}>
                        <i class="fas fa-eye"></i> Reveal hidden animated objects
                    </button>
                </div>
            </section>
        `;
    }

    _renderAutoRepairs(repairs) {
        if (!repairs || !repairs.total) return '';
        const hasIdRepairs = repairs.missingAnimationIds > 0 || repairs.duplicateAnimationIds > 0;
        const hasDurationRepairs = repairs.invalidDurations > 0;
        return `
            <section class="project-doctor-section">
                <h4>Auto Repair</h4>
                <div class="project-doctor-item project-doctor-item-check">
                    <strong>${repairs.total} safe repair(s) available</strong>
                    <p>These repairs only update missing or duplicate animation IDs and clearly invalid durations. They use the normal Undo history.</p>
                </div>
                <div class="project-doctor-fix-row">
                    <button class="btn btn-secondary" data-project-doctor-fix-animation-ids ${hasIdRepairs ? '' : 'disabled'}>
                        <i class="fas fa-wand-magic-sparkles"></i> Repair animation IDs
                    </button>
                    <button class="btn btn-secondary" data-project-doctor-normalize-durations ${hasDurationRepairs ? '' : 'disabled'}>
                        <i class="fas fa-clock-rotate-left"></i> Normalize durations
                    </button>
                </div>
            </section>
        `;
    }

    _renderPreviewExport(report) {
        if (!report) {
            return this._renderIssues('Preview/export Readiness', [{
                title: 'Checker unavailable',
                detail: 'Preview/export compatibility checker is not loaded in this session.'
            }], 'check');
        }
        return this._renderIssues('Preview/export Readiness', [{
            title: report.status === 'ready' ? 'Preview/export ready' : 'Preview/export needs review',
            detail: `${report.features?.length || 0} feature(s), ${report.validations?.length || 0} runtime check(s), ${report.errors?.length || 0} error(s), ${report.warnings?.length || 0} warning(s).`
        }], report.status === 'ready' ? 'ready' : 'check');
    }

    _collectAnimations(objects) {
        const tracks = [];
        objects.forEach((obj) => {
            const animations = Array.isArray(obj?.animations) ? obj.animations : [];
            animations.forEach((anim, index) => {
                if (!anim) return;
                const start = this._num(anim.delay ?? anim.startTime ?? anim.start, 0);
                const duration = Math.max(0.01, this._getAnimationDuration(anim));
                const end = start + duration;
                tracks.push({
                    objectId: obj.id || obj.objectId || obj.name || `object-${index}`,
                    objectName: this._objectName(obj),
                    animationId: anim.id || `${obj.id || 'object'}-${index}`,
                    name: this._animationName(anim),
                    start,
                    end,
                    properties: this._getAnimationProperties(anim),
                    anim
                });
            });
        });
        return tracks;
    }

    _analyzeScenes(scenes, objects) {
        const issues = [];
        const warnings = [];
        const tips = [];
        const sceneCount = scenes.length || 1;
        const summary = scenes.length
            ? 'Scene list is available for multi-scene checks.'
            : 'No scene list was exposed by the app, so Project Doctor checked the current stage only.';

        if (scenes.length > 1) {
            scenes.forEach((scene, index) => {
                const sceneObjects = Array.isArray(scene?.objects) ? scene.objects : [];
                const objectCount = sceneObjects.length || this._num(scene?.objectCount, 0);
                if (objectCount === 0) {
                    tips.push({
                        title: `Scene ${index + 1} may be empty`,
                        detail: 'Empty scenes can be intentional, but they can also look like a stuck export.'
                    });
                }
                const duration = this._num(scene?.duration ?? scene?.timelineDuration ?? scene?.length, NaN);
                if (Number.isFinite(duration) && duration <= 0) {
                    warnings.push({
                        title: `Scene ${index + 1} has no duration`,
                        detail: 'Set a positive scene duration so preview all scenes and export can advance predictably.'
                    });
                }
            });
        } else if (objects.length && !scenes.length) {
            tips.push({
                title: 'Single-stage project',
                detail: 'Multi-scene checks will become available after additional scenes are created.'
            });
        }

        return { sceneCount, summary, issues, warnings, tips };
    }

    _analyzeCleanup(objects, animations) {
        const issues = [];
        const warnings = [];
        const tips = [];
        const objectIds = new Map();
        const animationIds = new Map();

        objects.forEach((obj, index) => {
            const id = obj?.id || obj?.objectId;
            if (!id) {
                warnings.push({
                    title: 'Object has no id',
                    detail: `${this._objectName(obj)} at stage index ${index + 1} has no object id.`
                });
                return;
            }
            objectIds.set(id, (objectIds.get(id) || 0) + 1);
        });

        objectIds.forEach((count, id) => {
            if (count > 1) {
                issues.push({
                    title: 'Duplicate object id',
                    detail: `"${id}" appears ${count} times. Duplicate object ids can make animation and selection target the wrong object.`,
                    objectId: id
                });
            }
        });

        animations.forEach((track) => {
            const key = `${track.objectId}::${track.animationId}`;
            animationIds.set(key, (animationIds.get(key) || 0) + 1);
            if (!Number.isFinite(track.start) || !Number.isFinite(track.end) || track.end <= track.start) {
                warnings.push({
                    title: 'Animation timing needs review',
                    detail: `${track.objectName} has "${track.name}" with an invalid or zero-length timing range.`,
                    objectId: track.objectId
                });
            }
        });

        animationIds.forEach((count, key) => {
            if (count > 1) {
                warnings.push({
                    title: 'Duplicate animation id',
                    detail: `${key} appears ${count} times. Reapply or rename the duplicate if timeline edits behave strangely.`,
                    objectId: key.split('::')[0]
                });
            }
        });

        if (!issues.length && !warnings.length) {
            tips.push({
                title: 'Timeline ids look healthy',
                detail: 'No duplicate object ids, duplicate animation ids, or invalid animation ranges were detected.'
            });
        }

        return { issues, warnings, tips };
    }

    _analyzeRepairs(objects) {
        let missingAnimationIds = 0;
        let duplicateAnimationIds = 0;
        let invalidDurations = 0;
        objects.forEach((obj) => {
            const seen = new Set();
            const animations = Array.isArray(obj?.animations) ? obj.animations : [];
            animations.forEach((anim) => {
                if (!anim) return;
                const id = anim.id ? String(anim.id) : '';
                if (!id) missingAnimationIds += 1;
                else if (seen.has(id)) duplicateAnimationIds += 1;
                if (id) seen.add(id);
                if (!this._hasPositiveDuration(anim)) {
                    invalidDurations += 1;
                } else {
                    if (Object.prototype.hasOwnProperty.call(anim, 'duration') && !this._isPositiveDuration(anim.duration)) invalidDurations += 1;
                    if (anim.config && typeof anim.config === 'object' && Object.prototype.hasOwnProperty.call(anim.config, 'duration') && !this._isPositiveDuration(anim.config.duration)) invalidDurations += 1;
                    if (anim.generated && typeof anim.generated === 'object' && Object.prototype.hasOwnProperty.call(anim.generated, 'duration') && !this._isPositiveDuration(anim.generated.duration)) invalidDurations += 1;
                }
            });
        });
        return {
            missingAnimationIds,
            duplicateAnimationIds,
            invalidDurations,
            total: missingAnimationIds + duplicateAnimationIds + invalidDurations
        };
    }

    _analyzeAssetOptimizer(objects) {
        const assets = objects
            .filter(obj => this._isImageAssetObject(obj))
            .map(obj => {
                const source = this._getImageSource(obj);
                const bytes = this._estimateSourceBytes(source);
                const width = this._getImageNaturalWidth(obj);
                const height = this._getImageNaturalHeight(obj);
                const maxDim = Math.max(width || 0, height || 0);
                const megapixels = width && height ? (width * height) / 1000000 : 0;
                const embedded = typeof source === 'string' && source.startsWith('data:image/');
                const needsOptimization = embedded && (bytes > 750000 || maxDim > 1600 || megapixels > 2.5);
                return {
                    objectId: obj.id || obj.objectId || null,
                    name: this._objectName(obj),
                    bytes,
                    width,
                    height,
                    embedded,
                    needsOptimization,
                    detail: `${width && height ? `${Math.round(width)} x ${Math.round(height)} px, ` : ''}${this._formatBytes(bytes)}${embedded ? ' embedded' : ' linked'}${needsOptimization ? ' - optimization recommended' : ''}`
                };
            });
        const oversized = assets.filter(asset => asset.needsOptimization).length;
        const totalBytes = assets.reduce((sum, asset) => sum + (asset.bytes || 0), 0);
        return {
            assets,
            oversized,
            optimizable: oversized > 0,
            totalBytes,
            summary: assets.length
                ? `${assets.length} image asset(s), about ${this._formatBytes(totalBytes)} stored on this stage.`
                : 'No image assets were found on the current stage.'
        };
    }

    _analyzeAudioMarkers() {
        const audioTimeline = this.app?.audioTimeline;
        const hasAudio = !!(audioTimeline?.isLoaded || audioTimeline?.audioBuffer || audioTimeline?.audioDataUrl);
        const durationMs = Number(audioTimeline?.getDurationMs?.() || audioTimeline?.durationMs || 0);
        const markers = this._getAudioMarkers().slice().sort((a, b) => (Number(a.time) || 0) - (Number(b.time) || 0));
        const generated = markers.filter(marker => marker.source === 'generated-beat').length;
        return {
            hasAudio,
            durationMs,
            markers,
            generated,
            summary: hasAudio
                ? `${audioTimeline?.fileName || 'Audio track'}${durationMs ? `, ${this._formatSeconds(durationMs / 1000)}` : ''}, ${markers.length} marker(s).`
                : `${markers.length} marker(s) saved, but no audio track is currently loaded.`
        };
    }

    _analyzeLayerMasks(objects) {
        const maskedObjects = objects
            .filter(obj => !!obj?.layerMask)
            .map(obj => ({
                objectId: obj.id || obj.objectId || null,
                name: this._objectName(obj),
                detail: `${obj.layerMask?.type || 'shape'} mask${obj.layerMask?.sourceName ? ` from ${obj.layerMask.sourceName}` : ''}`
            }));
        const hiddenSources = objects.filter(obj => obj?._layerMaskSource && obj.visible === false).length;
        return {
            count: maskedObjects.length,
            hiddenSources,
            maskedObjects,
            summary: maskedObjects.length
                ? `${maskedObjects.length} object(s) have non-destructive layer masks.`
                : 'No layer masks are currently applied.'
        };
    }

    _findAnimationConflicts(tracks) {
        const conflicts = [];
        const byTrack = new Map();
        tracks.forEach((track) => {
            const props = track.properties.length ? track.properties : ['unknown'];
            props.forEach((prop) => {
                const key = `${track.objectId}::${prop}`;
                if (!byTrack.has(key)) byTrack.set(key, []);
                byTrack.get(key).push({ ...track, property: prop });
            });
        });
        byTrack.forEach((items) => {
            items.sort((a, b) => a.start - b.start);
            for (let i = 0; i < items.length; i += 1) {
                for (let j = i + 1; j < items.length; j += 1) {
                    const first = items[i];
                    const second = items[j];
                    if (second.start >= first.end) break;
                    if (first.animationId === second.animationId) continue;
                    const start = Math.max(first.start, second.start);
                    const end = Math.min(first.end, second.end);
                    if (end - start <= 0.001) continue;
                    conflicts.push({
                        objectName: first.objectName,
                        objectId: first.objectId,
                        property: first.property,
                        firstName: first.name,
                        secondName: second.name,
                        start,
                        end
                    });
                }
            }
        });
        return conflicts.slice(0, 50);
    }

    _getAnimationProperties(anim) {
        const props = new Set();
        const add = (value) => {
            if (!value) return;
            if (Array.isArray(value)) {
                value.forEach(add);
                return;
            }
            props.add(String(value));
        };
        add(anim.property);
        add(anim.properties);
        add(anim.animatedProperty);
        add(anim.targetProperty);
        const configs = this._getAnimationConfigs(anim);
        configs.forEach((cfg) => {
            add(cfg?.property);
            add(cfg?.properties);
            if (Array.isArray(cfg?.keyframes)) {
                cfg.keyframes.forEach(frame => add(frame?.property));
            }
            if (cfg?.type === 'path' || cfg?.type === 'motion' || cfg?.path) {
                add(['x', 'y']);
            }
            if (cfg?.type === 'rotation' || cfg?.rotation !== undefined) add('rotation');
            if (cfg?.type === 'opacity' || cfg?.opacity !== undefined) add('opacity');
            if (cfg?.type === 'scale' || cfg?.scale !== undefined) add(['scaleX', 'scaleY']);
        });
        return Array.from(props);
    }

    _getAnimationConfigs(anim) {
        const values = [];
        ['generated', 'config', 'runtime', 'effect', 'keyframes'].forEach((key) => {
            const value = anim?.[key];
            if (!value) return;
            if (Array.isArray(value)) values.push(...value);
            else values.push(value);
        });
        return values.filter(value => value && typeof value === 'object');
    }

    _getAnimationDuration(anim) {
        const candidates = [
            anim.duration,
            anim.runtimeDuration,
            anim.totalDuration,
            anim.length,
            anim.config?.duration,
            anim.generated?.duration
        ];
        const configs = this._getAnimationConfigs(anim);
        configs.forEach((cfg) => {
            candidates.push(cfg.duration, cfg.totalDuration, cfg.endTime);
            if (Array.isArray(cfg.keyframes) && cfg.keyframes.length) {
                cfg.keyframes.forEach(frame => candidates.push(frame.time, frame.t));
            }
        });
        const valid = candidates.map(value => this._num(value, NaN)).filter(value => Number.isFinite(value) && value > 0);
        return valid.length ? Math.max(...valid) : 1;
    }

    _hasPositiveDuration(anim) {
        return this._getDurationCandidates(anim).some(value => this._isPositiveDuration(value));
    }

    _getDurationCandidates(anim) {
        const candidates = [
            anim?.duration,
            anim?.runtimeDuration,
            anim?.totalDuration,
            anim?.length,
            anim?.config?.duration,
            anim?.generated?.duration
        ];
        const configs = this._getAnimationConfigs(anim);
        configs.forEach((cfg) => {
            candidates.push(cfg.duration, cfg.totalDuration, cfg.endTime);
            if (Array.isArray(cfg.keyframes) && cfg.keyframes.length) {
                cfg.keyframes.forEach(frame => candidates.push(frame.time, frame.t));
            }
        });
        return candidates;
    }

    _isPositiveDuration(value) {
        const number = Number(value);
        return Number.isFinite(number) && number > 0;
    }

    _getObjects() {
        return Array.isArray(this.app?.objects?.objects) ? this.app.objects.objects : [];
    }

    _getScenes() {
        if (Array.isArray(this.app?.scenes)) return this.app.scenes;
        if (Array.isArray(this.app?.exporter?.scenes)) return this.app.exporter.scenes;
        return [];
    }

    _getPreviewExportReport() {
        try {
            if (this.app?.previewExportCompat?.analyze) {
                return this.app.previewExportCompat.analyze();
            }
        } catch (error) {
            return {
                status: 'error',
                features: [],
                validations: [],
                warnings: [],
                errors: [{ title: 'Preview/export check failed', detail: error?.message || String(error) }]
            };
        }
        return null;
    }

    _getPoseLibraryStatus() {
        const hasJointPoseLibrary = !!(this.app?.jointSystem && typeof this.app.jointSystem.showPoseLibrary === 'function');
        const hasRigPoseLibrary = !!(this.app?.rigging && typeof this.app.rigging.showPoseLibrary === 'function');
        return {
            available: hasJointPoseLibrary || hasRigPoseLibrary,
            label: hasJointPoseLibrary ? 'Joint pose library is active' : (hasRigPoseLibrary ? 'Rig pose library is active' : 'Pose library not ready')
        };
    }

    _getReusableCharacterTemplates() {
        const jointSystem = this.app?.jointSystem;
        if (typeof jointSystem?._loadUniversalCharacterStyleTemplates === 'function') {
            return jointSystem._loadUniversalCharacterStyleTemplates()
                .filter(item => item && item.id && item.config);
        }
        return [];
    }

    async _optimizeImageObject(obj, options = {}) {
        const sourceString = this._getImageSource(obj);
        if (!sourceString || typeof sourceString !== 'string' || !sourceString.startsWith('data:image/')) {
            return { optimized: false, reason: 'linked-or-missing-source' };
        }
        if (/^data:image\/gif/i.test(sourceString) || obj?.isAnimatedGif || obj?.isSpriteSequence) {
            return { optimized: false, reason: 'animated-image' };
        }
        if (typeof document === 'undefined') {
            return { optimized: false, reason: 'canvas-unavailable' };
        }
        const source = await this._getDrawableImageSource(obj, sourceString);
        const naturalWidth = Math.max(1, Number(source?.naturalWidth || source?.videoWidth || source?.width || obj?.width || 1));
        const naturalHeight = Math.max(1, Number(source?.naturalHeight || source?.videoHeight || source?.height || obj?.height || 1));
        const maxDim = Math.max(200, Number(options.maxDimension) || 1600);
        const scale = Math.min(1, maxDim / Math.max(naturalWidth, naturalHeight));
        const targetWidth = Math.max(1, Math.round(naturalWidth * scale));
        const targetHeight = Math.max(1, Math.round(naturalHeight * scale));
        const oldBytes = this._estimateSourceBytes(sourceString);
        if (scale >= 1 && oldBytes < 750000) {
            return { optimized: false, reason: 'already-small' };
        }
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) return { optimized: false, reason: 'canvas-context' };
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
        const mime = /^data:image\/jpe?g/i.test(sourceString) ? 'image/jpeg' : 'image/png';
        const nextSrc = mime === 'image/jpeg'
            ? canvas.toDataURL(mime, Number(options.quality) || 0.86)
            : canvas.toDataURL(mime);
        const nextBytes = this._estimateSourceBytes(nextSrc);
        if (nextBytes >= oldBytes * 0.98) {
            return { optimized: false, reason: 'no-size-benefit' };
        }
        obj.imageSrc = nextSrc;
        obj.imageOptimizedAt = Date.now();
        obj.imageOriginalBytes = oldBytes;
        obj.imageOptimizedBytes = nextBytes;
        if (typeof obj.loadImage === 'function') {
            obj.loadImage(nextSrc);
        } else {
            obj.imageElement = source;
        }
        return {
            optimized: true,
            oldBytes,
            newBytes: nextBytes,
            savedBytes: Math.max(0, oldBytes - nextBytes),
            width: targetWidth,
            height: targetHeight
        };
    }

    _isImageAssetObject(obj) {
        return !!(obj && (obj.type === 'image' || obj.imageSrc || obj.imageElement));
    }

    _getImageSource(obj) {
        return obj?.imageSrc || obj?.src || obj?.imageData || obj?.dataUrl || '';
    }

    _getImageNaturalWidth(obj) {
        return Number(obj?.imageElement?.naturalWidth || obj?.imageElement?.width || obj?._eraserCanvas?.width || obj?.width || 0);
    }

    _getImageNaturalHeight(obj) {
        return Number(obj?.imageElement?.naturalHeight || obj?.imageElement?.height || obj?._eraserCanvas?.height || obj?.height || 0);
    }

    _estimateSourceBytes(source) {
        if (typeof source !== 'string' || !source) return 0;
        const comma = source.indexOf(',');
        if (source.startsWith('data:') && comma >= 0) {
            const data = source.slice(comma + 1);
            return Math.max(0, Math.round(data.length * 0.75));
        }
        return source.length;
    }

    _formatBytes(bytes) {
        const value = Number(bytes) || 0;
        if (value >= 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
        if (value >= 1024) return `${Math.round(value / 1024)} KB`;
        return `${Math.round(value)} B`;
    }

    _getDrawableImageSource(obj, sourceString) {
        if (obj?._eraserCanvas) return Promise.resolve(obj._eraserCanvas);
        if (obj?.imageElement && (obj.imageElement.complete || obj.imageElement.naturalWidth || obj.imageElement.width)) {
            return Promise.resolve(obj.imageElement);
        }
        if (typeof Image === 'undefined') {
            return Promise.resolve(obj?.imageElement || null);
        }
        return new Promise((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error('Could not load image for optimization'));
            image.src = sourceString;
        });
    }

    _getMotionPresetStorageKey() {
        return 'animation-stage-motion-presets';
    }

    _getRigPresetStorageKey() {
        return 'animation-stage-rig-presets';
    }

    _getSceneTemplateStorageKey() {
        return 'animation-stage-scene-templates';
    }

    _getAudioMarkerStorageKey() {
        const projectName = typeof document !== 'undefined'
            ? document.getElementById('project-name-display')?.textContent?.trim()
            : '';
        const suffix = String(projectName || 'current').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'current';
        return `animation-stage-audio-markers-${suffix}`;
    }

    _getAudioMarkers() {
        const fromTimeline = this.app?.timeline?.markers;
        const fromApp = this.app?.audioMarkers || this.app?.projectMarkers;
        const source = Array.isArray(fromTimeline) ? fromTimeline : (Array.isArray(fromApp) ? fromApp : null);
        if (source) return source.filter(Boolean);
        try {
            if (typeof localStorage === 'undefined') return [];
            return JSON.parse(localStorage.getItem(this._getAudioMarkerStorageKey())) || [];
        } catch {
            return [];
        }
    }

    _setAudioMarkers(markers = []) {
        const normalized = (Array.isArray(markers) ? markers : [])
            .filter(Boolean)
            .map((marker, index) => ({
                id: marker.id || this._makeStoredId('marker'),
                time: Math.max(0, Number(marker.time) || 0),
                label: String(marker.label || `Marker ${index + 1}`),
                source: marker.source || 'manual',
                strength: marker.strength,
                createdAt: marker.createdAt || Date.now()
            }))
            .sort((a, b) => a.time - b.time);
        if (this.app) {
            this.app.audioMarkers = normalized;
            this.app.projectMarkers = normalized;
        }
        if (this.app?.timeline) {
            this.app.timeline.markers = normalized;
            this.app.timeline.render?.();
            this.app.timeline.renderMarkers?.();
            this.app.timeline.updateMarkers?.();
        }
        try {
            if (typeof localStorage !== 'undefined') {
                localStorage.setItem(this._getAudioMarkerStorageKey(), JSON.stringify(normalized));
            }
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to save audio markers:', error);
        }
        if (typeof eventBus !== 'undefined') {
            eventBus.emit?.('timeline:markers-updated', normalized);
            eventBus.emit?.('project:markers-updated', normalized);
        }
        return normalized;
    }

    _getCurrentTimelineTime() {
        const candidates = [
            this.app?.timeline?.currentTime,
            this.app?.timeline?.playheadTime,
            this.app?.animations?.currentTime,
            this.app?.animations?.time,
            this.app?.audioTimeline?.audioElement?.currentTime
        ];
        const value = candidates.find(item => Number.isFinite(Number(item)));
        return Number(value) || 0;
    }

    _formatSeconds(seconds) {
        const value = Math.max(0, Number(seconds) || 0);
        const minutes = Math.floor(value / 60);
        const rest = value - minutes * 60;
        return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
    }

    _loadMotionPresets() {
        try {
            if (typeof localStorage === 'undefined') return [];
            return JSON.parse(localStorage.getItem(this._getMotionPresetStorageKey())) || [];
        } catch {
            return [];
        }
    }

    _saveMotionPresets(presets) {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.setItem(this._getMotionPresetStorageKey(), JSON.stringify(presets || []));
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to save motion presets:', error);
        }
    }

    _loadRigPresets() {
        try {
            if (typeof localStorage === 'undefined') return [];
            return JSON.parse(localStorage.getItem(this._getRigPresetStorageKey())) || [];
        } catch {
            return [];
        }
    }

    _saveRigPresets(presets) {
        try {
            if (typeof localStorage === 'undefined') return;
            localStorage.setItem(this._getRigPresetStorageKey(), JSON.stringify(presets || []));
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to save rig presets:', error);
        }
    }

    _loadSceneTemplates() {
        try {
            if (typeof localStorage === 'undefined') return [];
            return JSON.parse(localStorage.getItem(this._getSceneTemplateStorageKey())) || [];
        } catch {
            return [];
        }
    }

    _saveSceneTemplates(templates) {
        try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(this._getSceneTemplateStorageKey(), JSON.stringify(templates || []));
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to save scene templates:', error);
        }
    }

    _inferMotionPresetCategory(animations = []) {
        const text = animations.map(item => `${item?.type || ''} ${item?.name || ''}`).join(' ').toLowerCase();
        if (/face|talk|blink|mouth|brow|look/.test(text)) return 'face';
        if (/joint|flex|rig|body|walk|pose/.test(text)) return 'rig';
        if (/fade|appear|wipe|reveal|entry|exit/.test(text)) return 'entrance';
        if (/move|path|slide|rotate|spin|bounce|scale/.test(text)) return 'motion';
        return 'custom';
    }

    _getRigPresetCompatibility(preset, target) {
        if (!target) return { status: 'info', detail: 'select a target to check fit' };
        const source = preset?.data || {};
        const mismatches = [];
        const compare = (label, expected, current) => {
            if (expected && current && expected !== current) mismatches.push(`${label} ${current}/${expected}`);
        };
        compare('joints', source.joints?.length || 0, target.joints?.length || 0);
        compare('flex pins', source.flexPins?.length || 0, target.flexPins?.length || 0);
        compare('deform pins', source.rigging?.pins?.length || 0, target.rigging?.pins?.length || 0);
        return mismatches.length
            ? { status: 'check', detail: `review: ${mismatches.join(', ')}` }
            : { status: 'ready', detail: 'compatible with selected target' };
    }

    _hasRigData(obj) {
        return !!(obj && (
            obj.rigging?.pins?.length ||
            Array.isArray(obj.joints) && obj.joints.length ||
            Array.isArray(obj.flexPins) && obj.flexPins.length ||
            obj.bodyPartData ||
            obj._armatureRoleKey
        ));
    }

    _extractRigPresetData(obj) {
        const data = {};
        [
            'rigging', 'joints', 'flexPins', 'bodyPartData', 'jointDirection', 'jointContours',
            'contourSize', 'contourColor', 'contourFillMode', 'contourPatternType',
            'contourPatternColor', 'contourPatternScale', 'contourGradientStart',
            'contourGradientEnd', 'contourGradientAngle', 'contourRotation', '_armatureRoleKey',
            '_armaturePartKey', '_armatureAttachmentPin'
        ].forEach((key) => {
            if (obj[key] !== undefined) data[key] = this._clonePlain(obj[key]);
        });
        return data;
    }

    _applyRigPresetData(obj, data) {
        Object.entries(data || {}).forEach(([key, value]) => {
            obj[key] = this._clonePlain(value);
        });
        if (obj.rigging) delete obj.rigging._meshCache;
    }

    _getSelectedObjects() {
        if (typeof this.app?.objects?.getSelectedObjects === 'function') {
            return this.app.objects.getSelectedObjects().filter(Boolean);
        }
        const ids = Array.isArray(this.app?.objects?.selectedIds) ? this.app.objects.selectedIds : [];
        if (!ids.length) return [];
        return this._getObjects().filter(obj => ids.includes(obj?.id));
    }

    _resolveLayerMaskSelection() {
        const selected = this._getSelectedObjects().filter(Boolean);
        if (selected.length < 2) return { target: null, mask: null };
        const maskCandidates = selected.filter(obj => this._isLayerMaskShape(obj));
        if (!maskCandidates.length) return { target: null, mask: null };
        const targetCandidates = selected.filter(obj => !maskCandidates.includes(obj));
        let target = targetCandidates.find(obj => obj?.type === 'image' || obj?.imageSrc || obj?.textureImageSrc)
            || targetCandidates[0]
            || selected.slice().sort((a, b) => this._objectArea(b) - this._objectArea(a))[0];
        let mask = maskCandidates.find(obj => obj !== target)
            || selected.find(obj => obj !== target && this._isLayerMaskShape(obj));
        if (!mask && maskCandidates.length > 1) {
            mask = maskCandidates.slice().sort((a, b) => this._objectArea(a) - this._objectArea(b))[0];
            target = selected.find(obj => obj !== mask) || target;
        }
        if (!target || !mask || target === mask) return { target: null, mask: null };
        return { target, mask };
    }

    _isLayerMaskShape(obj) {
        if (!obj || obj.visible === false) return false;
        const type = String(obj.type || '');
        return [
            'rectangle', 'roundedRectangle', 'circle', 'triangle', 'diamond',
            'heart', 'star', 'polygon', 'path', 'freeform', 'scribble'
        ].includes(type);
    }

    _objectArea(obj) {
        return Math.abs(Number(obj?.width) || 0) * Math.abs(Number(obj?.height) || 0);
    }

    _createLayerMaskData(mask, target) {
        const tx = Number(target?.x) || 0;
        const ty = Number(target?.y) || 0;
        const clonePoint = (point) => ({
            ...point,
            x: (Number(point?.x) || 0) - tx,
            y: (Number(point?.y) || 0) - ty
        });
        return {
            enabled: true,
            type: mask.type || 'rectangle',
            sourceObjectId: mask.id || mask.objectId || null,
            sourceName: this._objectName(mask),
            x: (Number(mask.x) || 0) - tx,
            y: (Number(mask.y) || 0) - ty,
            width: Number(mask.width) || 1,
            height: Number(mask.height) || 1,
            rotation: (Number(mask.rotation) || 0) - (Number(target?.rotation) || 0),
            borderRadius: Number(mask.borderRadius) || 0,
            sides: Number(mask.sides) || undefined,
            innerRadius: Number(mask.innerRadius) || undefined,
            closedPath: mask.closedPath !== false,
            pathPoints: Array.isArray(mask.pathPoints) ? mask.pathPoints.map(clonePoint) : undefined,
            createdAt: Date.now()
        };
    }

    _cloneAnimationsForPreset(animations = []) {
        return animations
            .filter(Boolean)
            .map((anim) => {
                const clone = this._clonePlain(anim);
                delete clone.id;
                return clone;
            });
    }

    _clonePlain(value) {
        try {
            return JSON.parse(JSON.stringify(value));
        } catch {
            return { ...value };
        }
    }

    _makeStoredId(prefix = 'item') {
        const randomPart = Math.random().toString(36).slice(2, 8);
        const timePart = Date.now().toString(36);
        return `${prefix}-${timePart}-${randomPart}`;
    }

    _getUniversalCharacterArmature() {
        const jointSystem = this.app?.jointSystem;
        if (!jointSystem) return null;
        const candidates = [
            () => jointSystem._detectSelectedArmature?.(),
            () => jointSystem._currentArmature,
            () => jointSystem._detectArmature?.()
        ];
        for (const getCandidate of candidates) {
            const armature = getCandidate();
            const live = jointSystem._refreshDetectedArmatureReference?.(armature) || armature;
            if (jointSystem._isUniversalCharacterArmature?.(live)) return live;
        }
        return null;
    }

    _summarizeCharacterTemplate(template) {
        const config = template?.config || {};
        const bits = [
            config.view || 'front',
            config.gender || 'character',
            config.bodyType,
            config.ageGroup,
            config.height ? `${Math.round(Number(config.height))}px` : ''
        ].filter(Boolean);
        return bits.join(' · ');
    }

    _normalizeSceneTransitionSummary(transition) {
        const type = String(transition?.type || 'none');
        if (!type || type === 'none') return 'No transition';
        const duration = Number(transition?.duration);
        return `${type.replace(/[-_]+/g, ' ')}${Number.isFinite(duration) ? ` · ${duration}ms` : ''}`;
    }

    _centerStageOnObject(obj) {
        const stage = this.app?.stage;
        if (!stage || !obj) return;
        try {
            if (typeof stage.focusOnSelected === 'function') {
                stage.focusOnSelected();
                return;
            }
            const bounds = typeof obj.getBounds === 'function'
                ? obj.getBounds()
                : {
                    x: this._num(obj.x, 0),
                    y: this._num(obj.y, 0),
                    width: Math.max(1, this._num(obj.width, 1)),
                    height: Math.max(1, this._num(obj.height, 1))
                };
            const cx = this._num(bounds.centerX, bounds.x + bounds.width / 2);
            const cy = this._num(bounds.centerY, bounds.y + bounds.height / 2);
            const zoom = this._num(stage.zoom, 1) || 1;
            stage.panX = (stage.viewportWidth || stage.width || 1) / 2 - cx * zoom;
            stage.panY = (stage.viewportHeight || stage.height || 1) / 2 - cy * zoom;
            stage.needsRender = true;
            stage.requestRender?.();
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to focus object:', error);
        }
    }

    _formatReportText(report) {
        const lines = [];
        const addSection = (title, items = []) => {
            lines.push('', title);
            if (!items.length) {
                lines.push('- Nothing found.');
                return;
            }
            items.forEach((item) => {
                const target = item.objectId ? ` [object: ${item.objectId}]` : '';
                lines.push(`- ${item.title}${target}: ${item.detail}`);
            });
        };
        lines.push('Animation Stage Project Doctor Report');
        lines.push(`Status: ${report.status}`);
        lines.push(`Scenes: ${report.counts.scenes}`);
        lines.push(`Objects: ${report.counts.objects}`);
        lines.push(`Animations: ${report.counts.animations}`);
        lines.push(`Locked: ${report.counts.locked}`);
        lines.push(`Hidden: ${report.counts.hidden}`);
        addSection('Fix First', report.issues);
        addSection('Review', report.warnings);
        addSection('Animation Conflicts', (report.conflicts || []).map(conflict => ({
            title: `${conflict.objectName} / ${conflict.property}`,
            detail: `${conflict.firstName} overlaps ${conflict.secondName} from ${conflict.start.toFixed(2)}s to ${conflict.end.toFixed(2)}s.`,
            objectId: conflict.objectId
        })));
        addSection('Scene Health', [
            { title: `${report.sceneHealth?.sceneCount || 1} scene(s) checked`, detail: report.sceneHealth?.summary || 'Current stage checked.' },
            ...(report.sceneHealth?.issues || []),
            ...(report.sceneHealth?.warnings || []),
            ...(report.sceneHealth?.tips || [])
        ]);
        addSection('Timeline Cleanup', [
            ...(report.cleanup?.issues || []),
            ...(report.cleanup?.warnings || []),
            ...(report.cleanup?.tips || [])
        ]);
        addSection('Helpful Notes', report.tips);
        return lines.join('\n');
    }

    _notifyObjectChange() {
        try {
            this.app?.stage?.render?.();
            this.app?.objects?.render?.();
            this.app?.timeline?.render?.();
            if (typeof eventBus !== 'undefined') {
                eventBus.emit?.('objects:changed');
                eventBus.emit?.('stage:updated');
            }
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to refresh after quick fix:', error);
        }
    }

    _beginRepair() {
        try {
            this.app?.history?.flushPending?.();
            if (typeof eventBus !== 'undefined') {
                eventBus.emit?.('history:flush');
            }
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to prepare repair history:', error);
        }
    }

    _commitRepair() {
        this._notifyObjectChange();
        try {
            if (typeof eventBus !== 'undefined') {
                eventBus.emit?.('history:push');
            }
        } catch (error) {
            console.warn('[ProjectDoctor] Failed to save repair history:', error);
        }
    }

    _makeAnimationId(obj, objectIndex, animationIndex, seen) {
        const objectId = String(obj?.id || obj?.objectId || obj?.name || `object-${objectIndex + 1}`)
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '') || `object-${objectIndex + 1}`;
        let counter = 1;
        let id = `anim-${objectId}-${animationIndex + 1}`;
        while (seen.has(id)) {
            counter += 1;
            id = `anim-${objectId}-${animationIndex + 1}-${counter}`;
        }
        return id;
    }

    _prompt(message, fallback = '') {
        if (typeof window !== 'undefined' && typeof window.prompt === 'function') {
            return String(window.prompt(message, fallback) || '').trim();
        }
        return String(fallback || '').trim();
    }

    async _confirm(message, title = 'Confirm') {
        if (typeof Utils !== 'undefined' && Utils.showConfirm) {
            return Utils.showConfirm(message, title);
        }
        if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
            return window.confirm(message);
        }
        return true;
    }

    _toast(message, type = 'info') {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(message, type);
        }
    }

    _objectName(obj) {
        return String(obj?.name || obj?.label || obj?.type || obj?.id || 'Object');
    }

    _animationName(anim) {
        return String(anim?.name || anim?.type || anim?.animationType || anim?.id || 'Animation');
    }

    _num(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }

    _escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }
}

if (typeof window !== 'undefined') {
    window.ProjectDoctor = ProjectDoctor;
}
