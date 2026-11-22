/**
 * Object Manager — Pin system, joint placement & guided joints
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {

    _applyTiltTransformToVector(x, y, tilt) {
        if (!tilt?.active) return { x, y };
        return {
            x: x * tilt.a + y * tilt.c,
            y: x * tilt.b + y * tilt.d
        };
    },

    _applyInverseTiltTransformToVector(x, y, tilt) {
        if (!tilt?.active) return { x, y };
        const det = tilt.a * tilt.d - tilt.b * tilt.c;
        if (Math.abs(det) < 1e-6) return { x, y };
        const invA = tilt.d / det;
        const invB = -tilt.b / det;
        const invC = -tilt.c / det;
        const invD = tilt.a / det;
        return {
            x: x * invA + y * invC,
            y: x * invB + y * invD
        };
    },

    _getPinOffsetInParentSpace(parent, childPivotX, childPivotY, anchorX, anchorY) {
        const anchorWorld = this._getObjectWorldPoint(parent, anchorX, anchorY);
        const rad = (parent.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const relX = childPivotX - anchorWorld.x;
        const relY = childPivotY - anchorWorld.y;
        return {
            x: relX * cos + relY * sin,
            y: -relX * sin + relY * cos
        };
    },

    _getPinOffsetInTargetSpace(targetX, targetY, targetRotation, childPivotX, childPivotY, targetTilt = null) {
        const rad = (targetRotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        let relX = childPivotX - targetX;
        let relY = childPivotY - targetY;
        const untilted = this._applyInverseTiltTransformToVector(relX, relY, targetTilt);
        relX = untilted.x;
        relY = untilted.y;
        return {
            x: relX * cos + relY * sin,
            y: -relX * sin + relY * cos
        };
    },

    _getPinTargetJoint(parent, child) {
        if (!parent || !child || child.pinTargetType !== 'joint' || !Array.isArray(parent.joints) || parent.joints.length === 0) return null;
        return parent.joints.find(jt =>
            (child.pinJointId && jt.id === child.pinJointId) ||
            (child.pinJointName && jt.name === child.pinJointName)
        ) || null;
    },

    _getPinTargetWorldTransform(parent, child) {
        if (!parent) return null;
        const joint = this._getPinTargetJoint(parent, child);
        if (joint) {
            const point = parent.getJointWorldPosition(joint, !!child.sceneAsset?.activityKit);
            const direction = StageObject.getJointDirectionMeta(parent.jointDirection);
            const axisRatio = direction.isReverse ? 1 - joint.position : joint.position;
            const combinedTiltX = Utils.clamp((parent.tiltX ?? 0) + (joint.tiltX ?? 0), -45, 45);
            const combinedTiltY = Utils.clamp((parent.tiltY ?? 0) + (joint.tiltY ?? 0), -45, 45);
            return {
                x: point.x,
                y: point.y,
                rotation: parent.getJointWorldAngle ? parent.getJointWorldAngle(joint) : (parent.rotation || 0),
                tiltX: combinedTiltX,
                tiltY: combinedTiltY,
                tiltTransform: StageObject.getJointTiltComponents(combinedTiltX, combinedTiltY),
                sourceObject: parent,
                joint,
                anchorX: direction.isVertical ? (joint.crossOffset ?? 0.5) : axisRatio,
                anchorY: direction.isVertical ? axisRatio : (joint.crossOffset ?? 0.5)
            };
        }
        const anchorX = child?.pinAnchorX ?? 0.5;
        const anchorY = child?.pinAnchorY ?? 0.5;
        const point = this._getObjectWorldPoint(parent, anchorX, anchorY);
        return {
            x: point.x,
            y: point.y,
            rotation: parent.rotation || 0,
            tiltX: parent.tiltX ?? 0,
            tiltY: parent.tiltY ?? 0,
            tiltTransform: StageObject.getTiltTransformComponents(parent),
            sourceObject: parent,
            joint: null,
            anchorX,
            anchorY
        };
    },

    _getPinOffsetForChildTarget(parent, child, childPivotX, childPivotY) {
        const target = this._getPinTargetWorldTransform(parent, child);
        if (!target) return { x: 0, y: 0 };
        return this._getPinOffsetInTargetSpace(
            target.x,
            target.y,
            target.rotation,
            childPivotX,
            childPivotY,
            target.tiltTransform
        );
    },

    _getPinTargetOffsetWorldVector(target, offsetX, offsetY) {
        const rad = (target?.rotation || 0) * Math.PI / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        let worldX = offsetX * cos - offsetY * sin;
        let worldY = offsetX * sin + offsetY * cos;
        const tilted = this._applyTiltTransformToVector(worldX, worldY, target?.tiltTransform);
        worldX = tilted.x;
        worldY = tilted.y;
        return { x: worldX, y: worldY };
    },

    _capturePinTiltBaseForTarget(obj, parent = null) {
        if (!obj || !obj.pinnedTo) return;
        const mode = obj.pinRotationMode || (obj.pinInheritRotation ? 'inherit' : 'static');
        if (mode !== 'inherit' && mode !== 'joint') return;
        const parentObj = parent || this.getObjectById(obj.pinnedTo);
        if (!parentObj) return;
        const target = this._getPinTargetWorldTransform(parentObj, obj);
        const targetTiltX = target?.tiltX ?? 0;
        const targetTiltY = target?.tiltY ?? 0;
        obj.pinBaseTiltX = Utils.clamp((obj.tiltX ?? 0) - targetTiltX, -45, 45);
        obj.pinBaseTiltY = Utils.clamp((obj.tiltY ?? 0) - targetTiltY, -45, 45);
    },

    _handlePinPickClick(pos) {
        const child = this._pinPickObj;
        if (!child || !child.pinnedTo) {
            this._cancelPinPick();
            return;
        }
        const parent = this.getObjectById(child.pinnedTo);
        if (!parent) {
            this._cancelPinPick();
            Utils.showToast('Parent object not found', 'error');
            return;
        }

        // Check if click is within or near the parent object bounds (with some tolerance)
        const tolerance = 20;
        const inBounds = pos.x >= parent.x - tolerance && pos.x <= parent.x + parent.width + tolerance &&
                         pos.y >= parent.y - tolerance && pos.y <= parent.y + parent.height + tolerance;
        if (!inBounds) {
            Utils.showToast('Click on or near the parent object', 'warning');
            return;
        }

        // Calculate normalized anchor coordinates (0-1) on the parent
        const anchor = this._getObjectNormalizedPoint(parent, pos.x, pos.y);
        child.pinAnchorX = Math.round(anchor.x * 100) / 100;
        child.pinAnchorY = Math.round(anchor.y * 100) / 100;
        child.pinTargetType = 'anchor';
        child.pinJointId = null;
        child.pinJointName = null;

        // Recalculate offset so child stays where it is
        const childPivot = child.getPivotPoint();
        const offset = this._getPinOffsetForChildTarget(parent, child, childPivot.x, childPivot.y);
        child.pinOffsetX = Math.round(offset.x);
        child.pinOffsetY = Math.round(offset.y);

        this._cancelPinPick();
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Pin point set at (${child.pinAnchorX}, ${child.pinAnchorY}) on parent`, 'success');
    },

    _cancelPinPick() {
        this._pinPickMode = false;
        this._pinPickObj = null;
        this.stage.viewport.style.cursor = '';
    },

    _showJointPlacementHint(step = null) {
        const container = document.getElementById('joints-list');
        if (!container) return;

        const existing = document.getElementById('joint-place-hint');
        if (existing) existing.remove();

        const hint = document.createElement('div');
        hint.className = 'joint-placement-hint';
        hint.id = 'joint-place-hint';
        if (step) {
            const objName = step.obj?.name || this._jointPlaceObj?.name || 'object';
            const title = step.label || step.name || 'Place Joint';
            const description = step.description || 'Click on the target object to place the joint.';
            const esc = (typeof Utils !== 'undefined' && Utils.escapeHtml) ? Utils.escapeHtml : (s => String(s));
            hint.innerHTML = `<strong>${esc(title)}</strong><br>${esc(description)}<br><span style="color:#94a3b8;">Target: ${esc(objName)}</span>`;
        } else {
            hint.textContent = 'Click on the object to place a joint...';
        }

        container.prepend(hint);
    },
    _createJointFromPlacement(obj, pos, spec = null) {
        if (!obj) return null;

        const directionValue = StageObject.normalizeJointDirection(spec?.direction || obj.jointDirection);
        const direction = StageObject.getJointDirectionMeta(directionValue);
        const normalized = this._getObjectNormalizedPoint(obj, pos.x, pos.y);

        let position = direction.isVertical ? normalized.y : normalized.x;
        if (direction.isReverse) position = 1 - position;
        position = Math.max(0.05, Math.min(0.95, position));
        position = Math.round(position * 100) / 100;

        const axisRatio = direction.isReverse ? 1 - position : position;
        let crossOffset;
        if (typeof spec?.crossOffset === 'number') {
            crossOffset = spec.crossOffset;
        } else if (spec?.useClickCrossOffset) {
            crossOffset = direction.isVertical ? normalized.x : normalized.y;
        } else {
            crossOffset = obj._getShapeCrossCenterAtPosition(axisRatio, direction);
        }
        crossOffset = Math.max(0.05, Math.min(0.95, Number.isFinite(crossOffset) ? crossOffset : 0.5));
        crossOffset = Math.round(crossOffset * 100) / 100;

        const jointCount = Array.isArray(obj.joints) ? obj.joints.length : 0;
        const joint = {
            id: 'jt_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
            name: (spec?.name || `Joint ${jointCount + 1}`).trim(),
            position,
            crossOffset,
            angle: spec?.angle ?? 0,
            tiltX: spec?.tiltX ?? 0,
            tiltY: spec?.tiltY ?? 0,
            contourSize: spec?.contourSize ?? null,
            contourColor: spec?.contourColor ?? null
        };

        obj.jointDirection = directionValue;
        if (!Array.isArray(obj.joints)) obj.joints = [];
        obj.joints.push(joint);
        obj.joints.sort((a, b) => a.position - b.position);
        if (spec?.enableContours) obj.jointContours = true;

        return joint;
    },

    _handleJointPlacementClick(pos) {
        const obj = this._jointPlaceObj;
        if (!obj) {
            this.cancelGuidedJointPlacement({ silent: true });
            return;
        }

        if (!obj.containsPoint(pos.x, pos.y)) {
            const label = this._jointPlaceSpec?.label || this._jointPlaceSpec?.name || 'joint';
            Utils.showToast(`Click on ${obj.name} to place ${label}`, 'warning');
            return;
        }

        const created = this._createJointFromPlacement(obj, pos, this._jointPlaceSpec);
        if (!created) return;

        this.updateProperties();
        this._showJointPlacementHint(this._jointPlaceSpec);
        this.stage.requestRender();
        eventBus.emit('history:push');

        const guide = this._jointPlacementGuide;
        if (guide) {
            guide.placedCount = (guide.placedCount || 0) + 1;
            guide.index += 1;
            this._advanceGuidedJointPlacement();
            return;
        }

        this._jointPlaceMode = false;
        this._jointPlaceObj = null;
        this._jointPlaceSpec = null;
        this.stage.viewport.style.cursor = '';
        this._clearJointPlacementHint();
        this.updateProperties();
    },

    _advanceGuidedJointPlacement() {
        const guide = this._jointPlacementGuide;
        if (!guide) return;

        while (guide.index < guide.steps.length) {
            const step = guide.steps[guide.index];
            if (!step?.obj || !this.getObjectById(step.obj.id)) {
                guide.index += 1;
                continue;
            }

            this._jointPlaceMode = true;
            this._jointPlaceObj = step.obj;
            this._jointPlaceSpec = step;
            this.stage.viewport.style.cursor = 'crosshair';
            this.select([step.obj.id]);
            this._showJointPlacementHint(step);

            if (typeof guide.onAdvance === 'function') {
                guide.onAdvance({
                    step,
                    index: guide.index,
                    total: guide.steps.length,
                    placedCount: guide.placedCount || 0
                });
            }
            return;
        }

        this._finishGuidedJointPlacement('complete');
    },

    _finishGuidedJointPlacement(reason = 'complete') {
        const guide = this._jointPlacementGuide;
        const placedCount = guide?.placedCount || 0;
        const total = guide?.steps?.length || 0;

        this._jointPlacementGuide = null;
        this._jointPlaceMode = false;
        this._jointPlaceObj = null;
        this._jointPlaceSpec = null;
        this.stage.viewport.style.cursor = '';
        this._clearJointPlacementHint();
        this.updateProperties();

        if (!guide) return;

        if (reason === 'cancel') {
            if (typeof guide.onCancel === 'function') {
                guide.onCancel({ placedCount, total });
            }
            return;
        }

        if (typeof guide.onComplete === 'function') {
            guide.onComplete({ placedCount, total });
        }
    },

    startGuidedJointPlacement(sequence, options = {}) {
        const steps = Array.isArray(sequence)
            ? sequence.filter(step => step?.obj && this.getObjectById(step.obj.id))
            : [];
        if (!steps.length) return false;

        this.cancelGuidedJointPlacement({ silent: true });
        this._jointPlacementGuide = {
            steps,
            index: 0,
            placedCount: 0,
            onAdvance: options.onAdvance,
            onComplete: options.onComplete,
            onCancel: options.onCancel
        };
        this._advanceGuidedJointPlacement();
        return true;
    },

    cancelGuidedJointPlacement(options = {}) {
        const guide = this._jointPlacementGuide;
        const hadGuide = !!this._jointPlacementGuide;
        const hadPlacement = this._jointPlaceMode || this._jointPlaceObj || this._jointPlaceSpec;

        if (!hadGuide && !hadPlacement) return;

        this._jointPlacementGuide = null;
        this._jointPlaceMode = false;
        this._jointPlaceObj = null;
        this._jointPlaceSpec = null;
        this.stage.viewport.style.cursor = '';
        this._clearJointPlacementHint();
        this.updateProperties();

        if (guide && !options.silent && typeof guide.onCancel === 'function') {
            guide.onCancel({
                placedCount: guide.placedCount || 0,
                total: guide.steps?.length || 0
            });
        }
    },

    _clearJointPlacementHint() {
        document.getElementById('joint-place-hint')?.remove();
    },

    // === Slice Tool ===

    enterSliceMode() {
        const selected = this.getSelectedObjects();
        this._sliceMode = true;
        this._sliceLocked = false;
        this._sliceModeChoice = null;
        this._sliceContinuousMode = false;
        this._sliceQueuedRegions = [];
        this._slicePoints = [];
        this._sliceHoverPos = null;
        this.stage.viewport.style.cursor = 'crosshair';
        this._showSliceModeChooser();
        this._showSliceFloatingToolbar();
        this._updateSlicePointCount();
        this._updateSliceQueuedCount();

        if (selected.length > 0) {
            this._sliceObj = selected[0];
            Utils.showToast('Click points to define a cut path, double-click to finish', 'info');
        } else {
            this._sliceObj = null;
            Utils.showToast('Click an object to select it for slicing', 'info');
        }
        this.stage.requestRender();
    },

    exitSliceMode() {
        this._sliceMode = false;
        this._sliceLocked = false;
        this._sliceModeChoice = null;
        this._sliceContinuousMode = false;
        this._sliceObj = null;
        this._sliceQueuedRegions = [];
        this._slicePoints = [];
        this._sliceHoverPos = null;
        document.getElementById('slice-controls')?.classList.add('hidden');
        const modeEl = document.getElementById('slice-continuous-mode');
        if (modeEl) modeEl.checked = false;
        this._updateSliceQueuedCount();
        this._hideSliceModeChooser();
        this._hideSliceFloatingToolbar();
        if (this.currentTool === 'slice') {
            this.stage.viewport.style.cursor = 'crosshair';
        } else {
            this.stage.viewport.style.cursor = '';
        }
        this.stage.requestRender();
    },

});
