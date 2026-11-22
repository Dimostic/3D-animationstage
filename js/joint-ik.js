/**
 * Joint System — IK drag, ragdoll, reset & randomize pose
 * (split from joint-system.js for maintainability)
 */

Object.assign(JointSystem.prototype, {


    /**
     * Enable IK drag mode — Shift+drag on a joint part triggers IK solving.
     */
    initIKDragMode() {
        this._ikActive = false;
        this._ikTarget = null;
        this._ikEndObj = null;

        const canvas = this.stage.canvas;

        // Visual hint — change cursor when Shift held over a body part
        canvas.addEventListener('mousemove', (e) => {
            if (this._ikActive) return; // Already dragging
            if (e.shiftKey) {
                const pos = this.stage.screenToStage(e.clientX, e.clientY);
                const objs = this.objects.objects || [];
                let overJoint = false;
                for (let i = objs.length - 1; i >= 0; i--) {
                    const obj = objs[i];
                    if (!obj.bodyPartData || !obj.visible) continue;
                    if (pos.x >= obj.x && pos.x <= obj.x + obj.width &&
                        pos.y >= obj.y && pos.y <= obj.y + obj.height) {
                        overJoint = true;
                        break;
                    }
                }
                canvas.style.cursor = overJoint ? 'crosshair' : '';
            } else if (canvas.style.cursor === 'crosshair') {
                canvas.style.cursor = '';
            }
        });

        canvas.addEventListener('mousedown', (e) => {
            if (!e.shiftKey) return;

            // Check if clicking on a body-part object
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            const objs = this.objects.objects || [];
            // Find topmost body-part object at click position
            for (let i = objs.length - 1; i >= 0; i--) {
                const obj = objs[i];
                if (!obj.bodyPartData || !obj.visible) continue;
                if (pos.x >= obj.x && pos.x <= obj.x + obj.width &&
                    pos.y >= obj.y && pos.y <= obj.y + obj.height) {
                    this._ikActive = true;
                    this._ikEndObj = obj;
                    canvas.style.cursor = 'crosshair';
                    // Snapshot for one-shot recording before IK changes anything
                    if (this.objects._isRecording) {
                        this.objects._snapshotForRecording(true);
                    }
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
            }
        }, true);

        canvas.addEventListener('mousemove', (e) => {
            if (!this._ikActive || !this._ikEndObj) return;
            const pos = this.stage.screenToStage(e.clientX, e.clientY);
            this.solveIK(this._ikEndObj, pos.x, pos.y, 8);
            e.preventDefault();
            e.stopPropagation();
        }, true);

        const endIK = (e) => {
            if (!this._ikActive) return;
            this._ikActive = false;
            this._ikEndObj = null;
            canvas.style.cursor = '';
            // Show recording confirm if one-shot recording is active
            if (this.objects._isRecording && this.objects._recordSnapshots) {
                this.objects._showRecordingConfirm();
            }
            eventBus.emit('history:push');
        };

        canvas.addEventListener('mouseup', endIK, true);
        canvas.addEventListener('mouseleave', endIK, true);
    },


    // ═══════════════════════════════════════════════════════════════
    //  RAGDOLL / GRAVITY DROP — Physics simulation
    // ═══════════════════════════════════════════════════════════════

    ragdollDrop() {
        const partMap = this._getPartObjectMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts on stage', 'warning');
            return;
        }

        // Save original angles for the undo state
        const original = {};
        Object.keys(partMap).forEach(pk => {
            original[pk] = partMap[pk].jointBaseAngle || 0;
        });

        // Get preset data for gravity targets
        const presetKey = this._detectAssembledPreset();
        const preset = presetKey ? JointPresets.getAll().find(p => p.key === presetKey) : null;
        const partDefs = {};
        if (preset) preset.parts.forEach(p => { partDefs[p.partKey] = p; });

        // Calculate "gravity" target angles — limbs hang down
        const gravityTargets = {};
        Object.keys(partMap).forEach(pk => {
            const obj = partMap[pk];
            const def = partDefs[pk];
            if (!def || !obj.bodyPartData) return;
            const { minAngle, maxAngle } = this._getJointAngleLimits(def);

            // Hanging direction: arms/legs go toward maxAngle (downward pull)
            // Head/torso stay near center
            let target;
            if (pk.includes('arm') || pk.includes('forearm') || pk.includes('hand')) {
                // Arms hang down
                target = pk.startsWith('l-') ? maxAngle * 0.7 : minAngle * 0.7;
            } else if (pk.includes('leg') || pk.includes('foot')) {
                // Legs dangle loosely
                target = def.defaultAngle + (Math.random() - 0.5) * 20;
            } else if (pk.includes('head')) {
                // Head droops forward
                target = maxAngle * 0.4;
            } else if (pk.includes('tail')) {
                target = maxAngle * 0.6;
            } else if (pk.includes('wing')) {
                target = maxAngle * 0.8;
            } else {
                target = def.defaultAngle;
            }

            target = this._clampJointAngle(target);
            gravityTargets[pk] = target;
        });

        // Animate the drop with spring physics
        const duration = 1200;
        const startTime = performance.now();
        const springDamping = 0.6;

        const animate = (now) => {
            const t = Math.min(1, (now - startTime) / duration);
            // Spring easing: overshoot then settle
            const spring = 1 - Math.exp(-6 * t) * Math.cos(Math.PI * 2 * t * springDamping);

            Object.keys(gravityTargets).forEach(pk => {
                const obj = partMap[pk];
                if (!obj) return;
                const start = original[pk];
                const end = gravityTargets[pk];
                let angle = start + (end - start) * spring;
                obj.jointBaseAngle = this._clampJointAngle(angle);
            });

            if (this.objects._resolvePins) this.objects._resolvePins();
            this.stage.requestRender();

            if (t < 1) {
                this._ragdollAnim = requestAnimationFrame(animate);
            } else {
                this._ragdollAnim = null;
                eventBus.emit('history:push');
                Utils.showToast('Ragdoll drop complete', 'success');
            }
        };

        if (this._ragdollAnim) cancelAnimationFrame(this._ragdollAnim);
        this._ragdollAnim = requestAnimationFrame(animate);
    },


    // ═══════════════════════════════════════════════════════════════
    //  RESET POSE — Reset all joints to default angles
    // ═══════════════════════════════════════════════════════════════

    resetPose() {
        const partMap = this._getPartObjectMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts on stage', 'warning');
            return;
        }

        Object.keys(partMap).forEach(pk => {
            const obj = partMap[pk];
            if (obj && obj.bodyPartData) {
                obj.jointBaseAngle = obj.bodyPartData.defaultAngle || 0;
            }
        });

        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('All joints reset to default', 'success');
    },


    // ═══════════════════════════════════════════════════════════════
    //  RANDOMIZE POSE — Random angles within constraints
    // ═══════════════════════════════════════════════════════════════

    randomizePose() {
        const partMap = this._getPartObjectMap();
        if (Object.keys(partMap).length === 0) {
            Utils.showToast('No assembled parts on stage', 'warning');
            return;
        }

        Object.keys(partMap).forEach(pk => {
            const obj = partMap[pk];
            if (!obj || !obj.bodyPartData) return;
            const { minAngle, maxAngle } = this._getJointAngleLimits(obj.bodyPartData);
            const range = maxAngle - minAngle;
            obj.jointBaseAngle = minAngle + Math.random() * range;
        });

        if (this.objects._resolvePins) this.objects._resolvePins();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Randomized all joint angles', 'success');
    },


    // ═══════════════════════════════════════════════════════════════
    //  POSE ARMATURE — Shape-based movement test panel

});
