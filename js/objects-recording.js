/**
 * Object Manager — Recording helpers & continuous recording
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {

    // ── Recording helpers ─────────────────────────────────────────────
    _applyRecordableProperty(obj, prop, value) {
        if (!obj) return;
        const flexMatch = String(prop).match(/^flexPinAngle_(\d+)$/);
        if (flexMatch) {
            const sorted = [...(obj.flexPins || [])].sort((a, b) => a.position - b.position);
            if (sorted[Number(flexMatch[1])]) sorted[Number(flexMatch[1])].angle = Number(value) || 0;
            return;
        }
        if (prop === 'imageSrc') {
            if (obj.imageSrc !== value) {
                obj.imageSrc = value;
                if (value) obj.loadImage?.(value);
            }
            return;
        }
        if (prop === 'svgAvatarState') {
            if (obj._svgAvatar) {
                try {
                    obj._svgAvatar.state = typeof value === 'string'
                        ? JSON.parse(value || 'null') || {}
                        : JSON.parse(JSON.stringify(value || {}));
                    if (typeof this._renderSvgAvatarStateToImage === 'function') {
                        this._renderSvgAvatarStateToImage(obj);
                    }
                } catch (_) {}
            }
            return;
        }
        if (prop === 'svgAfricanFaceState') {
            try {
                obj._svgAfricanFaceState = typeof value === 'string'
                    ? JSON.parse(value || 'null') || {}
                    : JSON.parse(JSON.stringify(value || {}));
                if (obj._svgCharacterConfig && typeof obj._svgCharacterConfig === 'object') {
                    obj._svgCharacterConfig._svgAfricanFaceState = JSON.parse(JSON.stringify(obj._svgAfricanFaceState));
                }
                if (typeof this._renderSvgAfricanFaceStateToImage === 'function') {
                    this._renderSvgAfricanFaceStateToImage(obj);
                }
            } catch (_) {}
            return;
        }
        if (prop === 'svgAfricanAdjustments') {
            try {
                obj._svgAfricanAdjustments = typeof value === 'string'
                    ? JSON.parse(value || 'null') || {}
                    : JSON.parse(JSON.stringify(value || {}));
                if (obj._svgCharacterConfig && typeof obj._svgCharacterConfig === 'object') {
                    obj._svgCharacterConfig.premiumAdjustments = JSON.parse(JSON.stringify(obj._svgAfricanAdjustments));
                }
            } catch (_) {}
            return;
        }
        if (prop === 'textureImageSrc') {
            if (obj.textureImageSrc !== value) {
                obj.textureImageSrc = value;
                if (value) obj.loadTextureImage?.(value);
            }
            return;
        }
        obj[prop] = value;
    },

    _snapshotForRecording(allObjects) {
        // Skip one-shot recording during continuous recording
        if (this._contRec?.active) return;
        const targets = Array.isArray(allObjects)
            ? allObjects
            : (allObjects ? this.objects : this.getSelectedObjects());
        if (!targets.length) return;
        this._recordSnapshots = new Map();
        targets.forEach(obj => {
            const snap = {
                x: obj.x,
                y: obj.y,
                width: obj.width,
                height: obj.height,
                rotation: obj.rotation,
                depth: obj.depth ?? 0,
                tiltX: obj.tiltX ?? 0,
                tiltY: obj.tiltY ?? 0,
                scaleX: obj.scaleX ?? 1,
                scaleY: obj.scaleY ?? 1,
                opacity: obj.opacity ?? 1,
                jointBaseAngle: obj.jointBaseAngle ?? 0,
                armatureKneelDepth: obj.armatureKneelDepth ?? 0,
                armatureReachDepth: obj.armatureReachDepth ?? 0,
                armatureSeatDepth: obj.armatureSeatDepth ?? 0, armatureSeatLean: obj.armatureSeatLean ?? 0,
                pinOffsetX: obj.pinOffsetX ?? 0,
                pinOffsetY: obj.pinOffsetY ?? 0,
                fill: obj.fill,
                stroke: obj.stroke,
                strokeWidth: obj.strokeWidth ?? 0,
                borderRadius: obj.borderRadius ?? 0,
                imageSrc: obj.imageSrc,
                svgAvatarState: obj._svgAvatar ? JSON.stringify(obj._svgAvatar.state || {}) : undefined,
                svgAfricanFaceState: obj._svgAfricanFaceState ? JSON.stringify(obj._svgAfricanFaceState || {}) : undefined,
                svgAfricanAdjustments: obj._svgAfricanAdjustments ? JSON.stringify(obj._svgAfricanAdjustments || {}) : undefined,
                textureImageSrc: obj.textureImageSrc,
                visible: obj.visible !== false,
                flipH: !!obj.flipH,
                flipV: !!obj.flipV,
                layer: obj.layer ?? 0,
                _armatureDrawLayer: Number.isFinite(obj._armatureDrawLayer) ? obj._armatureDrawLayer : undefined,
                compressionRig: JSON.stringify(obj._compressionRig || null),
                compressionPair: JSON.stringify(obj._compressionPair || null)
            };
            // Capture joint angles, tilts, and crossOffset for recording
            if (obj.joints && obj.joints.length > 0) {
                const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                sorted.forEach((jt, idx) => {
                    snap['jointAngle_' + idx] = jt.angle || 0;
                    snap['jointTiltX_' + idx] = jt.tiltX || 0;
                    snap['jointTiltY_' + idx] = jt.tiltY || 0;
                    snap['jointCrossOffset_' + idx] = jt.crossOffset ?? 0.5;
                });
            }
            if (obj.flexPins && obj.flexPins.length > 0) {
                const sorted = [...obj.flexPins].sort((a, b) => a.position - b.position);
                sorted.forEach((pin, idx) => { snap['flexPinAngle_' + idx] = pin.angle || 0; });
            }
            this._recordSnapshots.set(obj.id, snap);
        });
    },

    _showRecordingConfirm() {
        // Skip one-shot confirm during continuous recording
        if (this._contRec?.active) return;
        if (!this._recordSnapshots) return;

        // Remove any existing confirm overlay
        document.getElementById('recording-confirm-overlay')?.remove();

        // Build a description of what changed — check all snapshotted objects
        const allSnapshotted = this.objects.filter(o => this._recordSnapshots.has(o.id));
        const changes = [];
        allSnapshotted.forEach(obj => {
            const snap = this._recordSnapshots.get(obj.id);
            if (!snap) return;
            const props = ['x', 'y', 'width', 'height', 'rotation', 'depth', 'tiltX', 'tiltY', 'scaleX', 'scaleY', 'opacity', 'armatureKneelDepth', 'armatureReachDepth', 'armatureSeatDepth', 'armatureSeatLean', 'jointBaseAngle', 'pinOffsetX', 'pinOffsetY', 'fill', 'stroke', 'strokeWidth', 'borderRadius', 'imageSrc', 'svgAvatarState', 'svgAfricanFaceState', 'svgAfricanAdjustments', 'textureImageSrc', 'visible', 'flipH', 'flipV', 'layer', '_armatureDrawLayer', 'compressionRig', 'compressionPair'];
            // Add joint angle, tilt, and crossOffset properties
            if (obj.joints && obj.joints.length > 0) {
                const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                sorted.forEach((jt, idx) => {
                    props.push('jointAngle_' + idx);
                    props.push('jointTiltX_' + idx);
                    props.push('jointTiltY_' + idx);
                    props.push('jointCrossOffset_' + idx);
                });
            }
            if (obj.flexPins && obj.flexPins.length > 0) {
                [...obj.flexPins].sort((a, b) => a.position - b.position)
                    .forEach((pin, idx) => props.push('flexPinAngle_' + idx));
            }
            const changed = props.filter(p => {
                const before = snap[p];
                if (before === undefined) return false;
                let after;
                if (p === 'scaleX' || p === 'scaleY') after = obj[p] ?? 1;
                else if (p === 'opacity') after = obj.opacity ?? 1;
                else if (p === 'jointBaseAngle') after = obj.jointBaseAngle ?? 0;
                else if (p === 'depth' || p === 'tiltX' || p === 'tiltY' || p === 'strokeWidth' || p === 'borderRadius' || p === 'pinOffsetX' || p === 'pinOffsetY' || p === 'layer' || p === '_armatureDrawLayer') after = obj[p] ?? 0;
                else if (p === 'visible') after = obj.visible !== false;
                else if (p === 'svgAvatarState') after = obj._svgAvatar ? JSON.stringify(obj._svgAvatar.state || {}) : undefined;
                else if (p === 'svgAfricanFaceState') after = obj._svgAfricanFaceState ? JSON.stringify(obj._svgAfricanFaceState || {}) : undefined;
                else if (p === 'svgAfricanAdjustments') after = obj._svgAfricanAdjustments ? JSON.stringify(obj._svgAfricanAdjustments || {}) : undefined;
                else if (p === 'flipH' || p === 'flipV') after = !!obj[p];
                else if (p.startsWith('jointAngle_')) {
                    const idx = parseInt(p.split('_')[1]);
                    const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx].angle || 0) : 0;
                } else if (p.startsWith('jointTiltX_') || p.startsWith('jointTiltY_')) {
                    const idx = parseInt(p.split('_')[1]);
                    const axis = p.startsWith('jointTiltX_') ? 'tiltX' : 'tiltY';
                    const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx][axis] || 0) : 0;
                } else if (p.startsWith('jointCrossOffset_')) {
                    const idx = parseInt(p.split('_')[1]);
                    const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx].crossOffset ?? 0.5) : 0.5;
                } else if (p.startsWith('flexPinAngle_')) {
                    const idx = parseInt(p.split('_')[1]);
                    const sorted = [...(obj.flexPins || [])].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx].angle || 0) : 0;
                } else after = obj[p];
                // String comparison for colors etc.
                if (typeof before === 'string' || typeof after === 'string') return before !== after;
                return Math.abs(before - after) > 0.01;
            });
            if (changed.length > 0) changes.push({ obj, changed });
        });

        if (changes.length === 0) {
            this._recordSnapshots = null;
            return;
        }

        // Build friendly label
        const allChanged = changes.flatMap(c => c.changed);
        let label = 'Transform';
        if (allChanged.every(p => p === 'x' || p === 'y')) label = 'Move';
        else if (allChanged.every(p => p === 'width' || p === 'height' || p === 'x' || p === 'y')) label = 'Resize';
        else if (allChanged.every(p => p === 'rotation')) label = 'Rotate';
        else if (allChanged.every(p => p === 'opacity')) label = 'Opacity';
        else if (allChanged.every(p => p === 'scaleX' || p === 'scaleY')) label = 'Scale';
        else if (allChanged.every(p => p === 'layer' || p === '_armatureDrawLayer')) label = 'Layer Order';
        else if (allChanged.every(p => p.startsWith('jointAngle_') || p.startsWith('jointTiltX_') || p.startsWith('jointTiltY_') || p.startsWith('jointCrossOffset_'))) label = 'Joint Bend';
        else if (allChanged.every(p => p.startsWith('flexPinAngle_'))) label = 'Flex Bend';
        else if (allChanged.every(p => p === 'jointBaseAngle')) label = 'Joint Pose';
        else if (allChanged.every(p => p === 'fill' || p === 'stroke')) label = 'Color';

        // Create the confirm overlay on the stage viewport
        const overlay = document.createElement('div');
        overlay.id = 'recording-confirm-overlay';
        overlay.innerHTML = `
            <div class="rec-confirm-box">
                <span class="rec-confirm-icon"><i class="fas fa-circle" style="color:#ff4444"></i></span>
                <span class="rec-confirm-label">Record ${label}? (${changes.length} obj${changes.length > 1 ? 's' : ''})</span>
                <button id="rec-confirm-accept" class="rec-confirm-btn accept" title="Accept and add keyframe">
                    <i class="fas fa-check"></i> Accept
                </button>
                <button id="rec-confirm-reject" class="rec-confirm-btn reject" title="Reject and undo change">
                    <i class="fas fa-times"></i> Reject
                </button>
            </div>
        `;
        this.stage.viewport.appendChild(overlay);

        // Prevent clicks on the overlay from reaching the viewport (which would deselect objects)
        overlay.addEventListener('mousedown', (e) => e.stopPropagation());
        overlay.addEventListener('mouseup', (e) => e.stopPropagation());
        overlay.addEventListener('click', (e) => e.stopPropagation());

        // Store current state for reject (restore to pre-drag)
        const snapshotsCopy = new Map(this._recordSnapshots);
        // Store current (post-drag) state for accept
        const currentStates = new Map();
        allSnapshotted.forEach(obj => {
            const cur = {
                x: obj.x, y: obj.y, width: obj.width, height: obj.height,
                rotation: obj.rotation, depth: obj.depth ?? 0, tiltX: obj.tiltX ?? 0, tiltY: obj.tiltY ?? 0,
                scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1, opacity: obj.opacity ?? 1,
                jointBaseAngle: obj.jointBaseAngle ?? 0,
                armatureKneelDepth: obj.armatureKneelDepth ?? 0,
                armatureSeatDepth: obj.armatureSeatDepth ?? 0, armatureSeatLean: obj.armatureSeatLean ?? 0,
                armatureReachDepth: obj.armatureReachDepth ?? 0,
                pinOffsetX: obj.pinOffsetX ?? 0,
                pinOffsetY: obj.pinOffsetY ?? 0,
                fill: obj.fill, stroke: obj.stroke, strokeWidth: obj.strokeWidth ?? 0,
                borderRadius: obj.borderRadius ?? 0, imageSrc: obj.imageSrc,
                svgAvatarState: obj._svgAvatar ? JSON.stringify(obj._svgAvatar.state || {}) : undefined,
                svgAfricanFaceState: obj._svgAfricanFaceState ? JSON.stringify(obj._svgAfricanFaceState || {}) : undefined,
                svgAfricanAdjustments: obj._svgAfricanAdjustments ? JSON.stringify(obj._svgAfricanAdjustments || {}) : undefined,
                textureImageSrc: obj.textureImageSrc,
                visible: obj.visible !== false,
                flipH: !!obj.flipH, flipV: !!obj.flipV,
                layer: obj.layer ?? 0
            };
            if (obj.joints && obj.joints.length > 0) {
                const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                sorted.forEach((jt, idx) => {
                    cur['jointAngle_' + idx] = jt.angle || 0;
                    cur['jointTiltX_' + idx] = jt.tiltX || 0;
                    cur['jointTiltY_' + idx] = jt.tiltY || 0;
                    cur['jointCrossOffset_' + idx] = jt.crossOffset ?? 0.5;
                });
            }
            if (obj.flexPins && obj.flexPins.length > 0) {
                [...obj.flexPins].sort((a, b) => a.position - b.position)
                    .forEach((pin, idx) => { cur['flexPinAngle_' + idx] = pin.angle || 0; });
            }
            currentStates.set(obj.id, cur);
        });

        const cleanup = () => {
            overlay.remove();
            this._recordSnapshots = null;
        };

        document.getElementById('rec-confirm-accept').addEventListener('click', () => {
            // Restore the post-drag state that was captured before (in case user moved again)
            allSnapshotted.forEach(obj => {
                const cur = currentStates.get(obj.id);
                if (cur) {
                    ['x', 'y', 'width', 'height', 'rotation', 'depth', 'tiltX', 'tiltY', 'scaleX', 'scaleY', 'opacity', 'armatureKneelDepth', 'armatureReachDepth', 'armatureSeatDepth', 'armatureSeatLean', 'jointBaseAngle', 'pinOffsetX', 'pinOffsetY', 'fill', 'stroke', 'strokeWidth', 'borderRadius', 'imageSrc', 'svgAvatarState', 'svgAfricanFaceState', 'svgAfricanAdjustments', 'textureImageSrc', 'visible', 'flipH', 'flipV', 'layer', '_armatureDrawLayer']
                        .forEach(prop => this._applyRecordableProperty(obj, prop, cur[prop]));
                    // Also restore joint angles, tilts, and crossOffset from the saved state
                    if (obj.joints && obj.joints.length > 0) {
                        const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                        sorted.forEach((jt, idx) => {
                            const key = 'jointAngle_' + idx;
                            if (cur[key] !== undefined) jt.angle = cur[key];
                            const txKey = 'jointTiltX_' + idx;
                            if (cur[txKey] !== undefined) jt.tiltX = cur[txKey];
                            const tyKey = 'jointTiltY_' + idx;
                            if (cur[tyKey] !== undefined) jt.tiltY = cur[tyKey];
                            const coKey = 'jointCrossOffset_' + idx;
                            if (cur[coKey] !== undefined) jt.crossOffset = cur[coKey];
                        });
                    }
                    if (obj.flexPins && obj.flexPins.length > 0) {
                        [...obj.flexPins].sort((a, b) => a.position - b.position).forEach((pin, idx) => {
                            const key = 'flexPinAngle_' + idx;
                            if (cur[key] !== undefined) pin.angle = cur[key];
                        });
                    }
                }
            });
            this._recordSnapshots = snapshotsCopy;
            this._commitRecordedKeyframes();
            cleanup();
        });

        document.getElementById('rec-confirm-reject').addEventListener('click', () => {
            // Restore to pre-drag state
            allSnapshotted.forEach(obj => {
                const snap = snapshotsCopy.get(obj.id);
                if (snap) {
                    const props = ['x', 'y', 'width', 'height', 'rotation', 'depth', 'tiltX', 'tiltY', 'scaleX', 'scaleY', 'opacity',
                        'armatureSeatDepth', 'armatureSeatLean', 'armatureKneelDepth', 'armatureReachDepth',
                        'jointBaseAngle', 'pinOffsetX', 'pinOffsetY', 'fill', 'stroke', 'strokeWidth', 'borderRadius', 'imageSrc', 'svgAvatarState', 'svgAfricanFaceState', 'svgAfricanAdjustments', 'textureImageSrc', 'visible', 'flipH', 'flipV', 'layer', '_armatureDrawLayer'];
                    props.forEach(p => this._applyRecordableProperty(obj, p, snap[p]));
                    // Also restore joint angles, tilts, and crossOffset from snapshot
                    if (obj.joints && obj.joints.length > 0) {
                        const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                        sorted.forEach((jt, idx) => {
                            const key = 'jointAngle_' + idx;
                            if (snap[key] !== undefined) jt.angle = snap[key];
                            const txKey = 'jointTiltX_' + idx;
                            if (snap[txKey] !== undefined) jt.tiltX = snap[txKey];
                            const tyKey = 'jointTiltY_' + idx;
                            if (snap[tyKey] !== undefined) jt.tiltY = snap[tyKey];
                            const coKey = 'jointCrossOffset_' + idx;
                            if (snap[coKey] !== undefined) jt.crossOffset = snap[coKey];
                        });
                    }
                    if (obj.flexPins && obj.flexPins.length > 0) {
                        [...obj.flexPins].sort((a, b) => a.position - b.position).forEach((pin, idx) => {
                            const key = 'flexPinAngle_' + idx;
                            if (snap[key] !== undefined) pin.angle = snap[key];
                        });
                    }
                }
            });
            cleanup();
            this.stage.requestRender();
            this.updateProperties();
            Utils.showToast('Recording rejected', 'info');
        });

        // Auto-dismiss after 10 seconds → accept
        const autoTimer = setTimeout(() => {
            if (document.getElementById('recording-confirm-overlay')) {
                document.getElementById('rec-confirm-accept')?.click();
            }
        }, 10000);

        // Clear timer if manually handled
        overlay.addEventListener('click', () => clearTimeout(autoTimer), { once: true });
    },

    _commitRecordedKeyframes(options = {}) {
        if (!this._recordSnapshots || !this.animations) return;

        const playheadMs = Number.isFinite(options.delayMsOverride) ? options.delayMsOverride : (this.animations.currentTime || 0);
        const defaultDuration = Number.isFinite(options.transitionMs) ? Math.max(50, options.transitionMs) : 1000;
        const holdMs = Math.max(0, Number(options.holdMs) || 0);
        const allSnapshotted = this.objects.filter(o => this._recordSnapshots.has(o.id));
        const sequenceMode = options.simultaneous !== true && this._recordOrderMode === 'sequence';
        let sequenceCursorMs = sequenceMode
            ? Math.max(playheadMs, Number.isFinite(this._recordSequenceCursorMs) ? this._recordSequenceCursorMs : playheadMs)
            : playheadMs;
        let recorded = 0;

        // Ensure originalStates map exists so playback works correctly
        if (!this.animations.originalStates || !(this.animations.originalStates instanceof Map)) {
            this.animations.originalStates = new Map();
        }

        const colorProps = new Set(['fill', 'stroke']);
        const stringProps = new Set(['fill', 'stroke', 'imageSrc', 'svgAvatarState', 'svgAfricanFaceState', 'svgAfricanAdjustments', 'textureImageSrc']);

        allSnapshotted.forEach(obj => {
            const snap = this._recordSnapshots.get(obj.id);
            if (!snap) return;

            const generated = [];
            const props = ['x', 'y', 'width', 'height', 'rotation', 'depth', 'tiltX', 'tiltY', 'scaleX', 'scaleY', 'armatureSeatDepth', 'armatureSeatLean', 'armatureKneelDepth', 'armatureReachDepth', 'opacity',
                'jointBaseAngle', 'pinOffsetX', 'pinOffsetY', 'fill', 'stroke', 'strokeWidth', 'borderRadius', 'imageSrc', 'svgAvatarState', 'svgAfricanFaceState', 'svgAfricanAdjustments', 'textureImageSrc', 'visible', 'flipH', 'flipV', 'layer', '_armatureDrawLayer'];

            // Add joint angle, tilt, and crossOffset properties
            if (obj.joints && obj.joints.length > 0) {
                const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                sorted.forEach((jt, idx) => {
                    props.push('jointAngle_' + idx);
                    props.push('jointTiltX_' + idx);
                    props.push('jointTiltY_' + idx);
                    props.push('jointCrossOffset_' + idx);
                });
            }
            if (obj.flexPins && obj.flexPins.length > 0) {
                [...obj.flexPins].sort((a, b) => a.position - b.position)
                    .forEach((pin, idx) => props.push('flexPinAngle_' + idx));
            }

            props.forEach(prop => {
                const before = snap[prop];
                let after;
                if (prop === 'scaleX' || prop === 'scaleY') after = obj[prop] ?? 1;
                else if (prop === 'opacity') after = obj.opacity ?? 1;
                else if (prop === 'depth' || prop === 'tiltX' || prop === 'tiltY' || prop === 'jointBaseAngle' || prop === 'strokeWidth' || prop === 'borderRadius' || prop === 'pinOffsetX' || prop === 'pinOffsetY' || prop === 'layer' || prop === '_armatureDrawLayer') after = obj[prop] ?? 0;
                else if (prop === 'visible') after = obj.visible !== false;
                else if (prop === 'svgAvatarState') after = obj._svgAvatar ? JSON.stringify(obj._svgAvatar.state || {}) : undefined;
                else if (prop === 'svgAfricanFaceState') after = obj._svgAfricanFaceState ? JSON.stringify(obj._svgAfricanFaceState || {}) : undefined;
                else if (prop === 'svgAfricanAdjustments') after = obj._svgAfricanAdjustments ? JSON.stringify(obj._svgAfricanAdjustments || {}) : undefined;
                else if (prop === 'flipH' || prop === 'flipV') after = !!obj[prop];
                else if (prop.startsWith('jointAngle_')) {
                    const idx = parseInt(prop.split('_')[1]);
                    const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx].angle || 0) : 0;
                } else if (prop.startsWith('jointTiltX_') || prop.startsWith('jointTiltY_')) {
                    const idx = parseInt(prop.split('_')[1]);
                    const axis = prop.startsWith('jointTiltX_') ? 'tiltX' : 'tiltY';
                    const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx][axis] || 0) : 0;
                } else if (prop.startsWith('jointCrossOffset_')) {
                    const idx = parseInt(prop.split('_')[1]);
                    const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx].crossOffset ?? 0.5) : 0.5;
                } else if (prop.startsWith('flexPinAngle_')) {
                    const idx = parseInt(prop.split('_')[1]);
                    const sorted = [...(obj.flexPins || [])].sort((a, b) => a.position - b.position);
                    after = sorted[idx] ? (sorted[idx].angle || 0) : 0;
                } else after = obj[prop];

                const changed = stringProps.has(prop)
                    ? (String(before ?? '') !== String(after ?? ''))
                    : (typeof before === 'boolean' || typeof after === 'boolean')
                        ? (before !== after)
                        : (Math.abs((before || 0) - (after || 0)) > 0.01);

                const heldPoseProperty = options.holdPose === true && (prop === 'x' || prop === 'y' || /^jointAngle_/.test(prop));
                if (changed || (heldPoseProperty && Number.isFinite(after))) {
                    const entry = {
                        property: prop,
                        from: before,
                        to: after,
                        duration: defaultDuration,
                        easing: 'easeInOut'
                    };
                    if (colorProps.has(prop)) entry.type = 'color';
                    else if (stringProps.has(prop) || typeof before === 'boolean' || typeof after === 'boolean') entry.type = 'discrete';
                    generated.push(entry);
                }
            });

            if (generated.length === 0) return;
            const recordStartMs = sequenceMode ? sequenceCursorMs : playheadMs;
            const recordDurationMs = generated.reduce((max, entry) => {
                const duration = Number(entry.duration);
                return Math.max(max, Number.isFinite(duration) && duration > 0 ? duration : defaultDuration);
            }, defaultDuration);

            // Build a friendly name from changed properties
            const changedNames = generated.map(g => g.property);
            let friendlyName = 'Recorded';
            if (changedNames.every(n => n === 'opacity')) friendlyName = 'Recorded Opacity';
            else if (changedNames.every(n => n === 'scaleX' || n === 'scaleY')) friendlyName = 'Recorded Scale';
            else if (changedNames.every(n => n === 'x' || n === 'y')) friendlyName = 'Recorded Move';
            else if (changedNames.every(n => n === 'rotation')) friendlyName = 'Recorded Rotate';
            else if (changedNames.every(n => n === 'depth')) friendlyName = 'Recorded Depth';
            else if (changedNames.every(n => n === 'layer' || n === '_armatureDrawLayer')) friendlyName = 'Recorded Layer Order';
            else if (changedNames.every(n => n === 'tiltX')) friendlyName = 'Recorded X Tilt';
            else if (changedNames.every(n => n === 'tiltY')) friendlyName = 'Recorded Y Tilt';
            else if (changedNames.every(n => n === 'tiltX' || n === 'tiltY')) friendlyName = 'Recorded Tilt';
            else if (changedNames.every(n => n === 'imageSrc' || n === 'svgAvatarState' || n === 'svgAfricanFaceState' || n === 'svgAfricanAdjustments' || n === 'pinOffsetX' || n === 'pinOffsetY' || n === 'rotation')) friendlyName = 'Recorded Expression';
            else if (changedNames.every(n => n === 'width' || n === 'height')) friendlyName = 'Recorded Resize';
            else if (changedNames.every(n => n.startsWith('jointAngle_') || n.startsWith('jointTiltX_') || n.startsWith('jointTiltY_') || n.startsWith('jointCrossOffset_'))) friendlyName = 'Recorded Joint Bend';
            else if (changedNames.every(n => n.startsWith('flexPinAngle_'))) friendlyName = 'Recorded Flex Bend';
            else if (changedNames.every(n => n === 'jointBaseAngle')) friendlyName = 'Recorded Joint Pose';
            else if (changedNames.every(n => n === 'fill' || n === 'stroke')) friendlyName = 'Recorded Color';
            else if (changedNames.every(n => n === 'visible')) friendlyName = 'Recorded Visibility';
            else if (changedNames.every(n => n === 'flipH' || n === 'flipV')) friendlyName = 'Recorded Flip';
            else if (changedNames.length > 2) friendlyName = 'Recorded Transform';

            const animData = {
                id: Utils.generateId('anim'),
                type: 'recorded',
                name: friendlyName,
                params: { duration: (defaultDuration + holdMs) / 1000, easing: 'easeInOut' },
                delay: recordStartMs,
                repeat: '1',
                trigger: 'onLoad',
                startMode: sequenceMode ? 'afterPrevious' : 'withPrevious',
                generated: generated
            };

            obj.animations.push(animData);
            recorded++;
            if (sequenceMode) sequenceCursorMs = recordStartMs + recordDurationMs;

            // Store the pre-drag state as the original for playback
            if (!this.animations.originalStates.has(obj.id)) {
                this.animations.originalStates.set(obj.id, Utils.deepClone(obj.toJSON()));
                // Override with the snapshot (pre-drag) values
                const orig = this.animations.originalStates.get(obj.id);
                props.forEach(p => { orig[p] = snap[p]; });
                // Also update the joints array in the original state (virtual props don't affect it)
                if (orig.joints && orig.joints.length > 0) {
                    const sortedOrig = [...orig.joints].sort((a, b) => a.position - b.position);
                    sortedOrig.forEach((jt, idx) => {
                        if (snap['jointAngle_' + idx] !== undefined) jt.angle = snap['jointAngle_' + idx];
                        if (snap['jointTiltX_' + idx] !== undefined) jt.tiltX = snap['jointTiltX_' + idx];
                        if (snap['jointTiltY_' + idx] !== undefined) jt.tiltY = snap['jointTiltY_' + idx];
                        if (snap['jointCrossOffset_' + idx] !== undefined) jt.crossOffset = snap['jointCrossOffset_' + idx];
                    });
                }
                if (orig.flexPins && orig.flexPins.length > 0) {
                    [...orig.flexPins].sort((a, b) => a.position - b.position).forEach((pin, idx) => {
                        if (snap['flexPinAngle_' + idx] !== undefined) pin.angle = snap['flexPinAngle_' + idx];
                    });
                }
            }

            // Restore object to pre-drag position so playback starts from the correct state
            props.forEach(p => this._applyRecordableProperty(obj, p, snap[p]));
            // Also restore joint angles/tilts/crossOffset (virtual props don't set obj.joints)
            if (obj.joints && obj.joints.length > 0) {
                const sortedRestore = [...obj.joints].sort((a, b) => a.position - b.position);
                sortedRestore.forEach((jt, idx) => {
                    if (snap['jointAngle_' + idx] !== undefined) jt.angle = snap['jointAngle_' + idx];
                    if (snap['jointTiltX_' + idx] !== undefined) jt.tiltX = snap['jointTiltX_' + idx];
                    if (snap['jointTiltY_' + idx] !== undefined) jt.tiltY = snap['jointTiltY_' + idx];
                    if (snap['jointCrossOffset_' + idx] !== undefined) jt.crossOffset = snap['jointCrossOffset_' + idx];
                });
            }
            if (obj.flexPins && obj.flexPins.length > 0) {
                [...obj.flexPins].sort((a, b) => a.position - b.position).forEach((pin, idx) => {
                    if (snap['flexPinAngle_' + idx] !== undefined) pin.angle = snap['flexPinAngle_' + idx];
                });
            }
        });

        this._recordSnapshots = null;

        if (recorded > 0) {
            if (sequenceMode) {
                this._recordSequenceCursorMs = sequenceCursorMs;
                this.animations.currentTime = sequenceCursorMs;
                eventBus.emit('timeline:time', sequenceCursorMs);
            }
            // Refresh the timeline & stage
            eventBus.emit('timeline:update');
            eventBus.emit('objects:updated');
            this.stage.requestRender();
            this.updateProperties();
            if (options.showToast !== false) Utils.showToast(sequenceMode
                ? 'Keyframes recorded in sequence — press Play to preview'
                : 'Keyframes recorded — press Play to preview', 'success');
        }
    },

    // Get all objects data for AI awareness
    getObjectsData() {
        return this.objects.map(obj => {
            const bounds = obj.getBounds();
            return {
                id: obj.id,
                type: obj.type,
                name: obj.name,
                position: { x: Math.round(obj.x), y: Math.round(obj.y) },
                dimensions: { width: Math.round(obj.width), height: Math.round(obj.height) },
                center: { x: Math.round(bounds.centerX), y: Math.round(bounds.centerY) },
                color: obj.fill,
                colorName: Utils.getColorName(obj.fill),
                opacity: obj.opacity,
                rotation: obj.rotation,
                tags: obj.tags,
                text: obj.type === 'text' ? obj.text : undefined,
                animations: obj.animations.length
            };
        });
    },

    // ── Continuous Recording ──────────────────────────────────────────

    startContinuousRecording() {
        const selected = this.getSelectedObjects();
        // Recording targets:
        //  - selection if any objects are selected
        //  - otherwise all stage objects (so existing objects stay in scope)
        //  - empty stage is OK too — the user can draw objects during recording
        //    and they're picked up live via the object:added handler.
        const initialTargets = selected.length > 0
            ? (this._expandObjectsForPropRecording?.(selected) || selected)
            : (this.objects || []).slice();

        // Stop any existing one-shot recording
        if (this._isRecording) {
            eventBus.emit('recording:stop');
        }

        this._contRec = {
            active: true,
            startTime: performance.now(),
            objects: new Map(),
            intervalId: null,
            scopedToSelection: selected.length > 0,
            newlyAdded: new Set()
        };

        // Capture initial state for each target object (may be empty — that's fine)
        initialTargets.forEach(obj => {
            this._contRec.objects.set(obj.id, {
                initialState: this._captureContRecState(obj),
                samples: [{ t: 0, state: this._captureContRecState(obj) }],
                firstSampleAtMs: 0,
                isLateAdd: false
            });
        });

        // Track newly drawn / created objects during the recording session
        this._contRecObjectAddedHandler = (obj) => this._contRecOnObjectAdded(obj);
        eventBus.on('object:added', this._contRecObjectAddedHandler);

        // Sample at 50ms (~20fps) to capture fast drawing gestures cleanly.
        this._contRec.intervalId = setInterval(() => this._contRecSample(), 50);

        // Enable recording flag so rig pose record doesn't interfere
        this._isRecording = true;
        eventBus.emit('recording:start');

        return true;
    },

    _contRecOnObjectAdded(obj) {
        if (!this._contRec?.active || !obj || this._contRec.objects.has(obj.id)) return;
        const t = performance.now() - this._contRec.startTime;
        const initialState = this._captureContRecState(obj);
        this._contRec.objects.set(obj.id, {
            initialState,
            samples: [{ t, state: initialState }],
            firstSampleAtMs: t,
            isLateAdd: true
        });
        this._contRec.newlyAdded.add(obj.id);
    },

    _captureContRecState(obj) {
        const state = {
            x: obj.x, y: obj.y,
            width: obj.width, height: obj.height,
            rotation: obj.rotation,
            tiltX: obj.tiltX ?? 0,
            tiltY: obj.tiltY ?? 0,
            pinBaseTiltX: obj.pinBaseTiltX ?? 0,
            pinBaseTiltY: obj.pinBaseTiltY ?? 0,
            scaleX: obj.scaleX ?? 1, scaleY: obj.scaleY ?? 1,
            armatureKneelDepth: obj.armatureKneelDepth ?? 0,
            armatureReachDepth: obj.armatureReachDepth ?? 0,
            armatureSeatDepth: obj.armatureSeatDepth ?? 0, armatureSeatLean: obj.armatureSeatLean ?? 0,
            opacity: obj.opacity ?? 1,
            layer: obj.layer ?? 0,
            _armatureDrawLayer: Number.isFinite(obj._armatureDrawLayer) ? obj._armatureDrawLayer : undefined,
            _ucGarmentMotionRotation: obj._ucGarmentMotionRotation ?? obj.ucGarmentMotionRotation ?? 0,
            _ucGarmentMotionTiltX: obj._ucGarmentMotionTiltX ?? obj.ucGarmentMotionTiltX ?? 0,
            _ucGarmentMotionTiltY: obj._ucGarmentMotionTiltY ?? obj.ucGarmentMotionTiltY ?? 0,
            imageSrc: obj.imageSrc,
            textureImageSrc: obj.textureImageSrc,
            svgAvatarState: obj._svgAvatar ? JSON.stringify(obj._svgAvatar.state || {}) : undefined,
            svgAfricanFaceState: obj._svgAfricanFaceState ? JSON.stringify(obj._svgAfricanFaceState || {}) : undefined,
            svgAfricanAdjustments: obj._svgAfricanAdjustments ? JSON.stringify(obj._svgAfricanAdjustments || {}) : undefined
        };
        // Capture joint angles, tilts, and crossOffset
        if (obj.joints && obj.joints.length > 0) {
            const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
            sorted.forEach((jt, idx) => {
                state['jointAngle_' + idx] = jt.angle || 0;
                state['jointTiltX_' + idx] = jt.tiltX || 0;
                state['jointTiltY_' + idx] = jt.tiltY || 0;
                state['jointCrossOffset_' + idx] = jt.crossOffset ?? 0.5;
            });
            state._jointCount = sorted.length;
        }
        if (obj.flexPins && obj.flexPins.length > 0) {
            const sorted = [...obj.flexPins].sort((a, b) => a.position - b.position);
            sorted.forEach((pin, idx) => { state['flexPinAngle_' + idx] = pin.angle || 0; });
            state._flexPinCount = sorted.length;
        }
        // Capture bone pose if rigged
        if (obj.rigging && obj.rigging.pins) {
            state.pose = {};
            obj.rigging.pins.forEach(pin => {
                state.pose[pin.id] = { x: pin.x, y: pin.y };
            });
        }
        return state;
    },

    _contRecSample() {
        if (!this._contRec?.active) return;
        const t = performance.now() - this._contRec.startTime;
        this._contRec.objects.forEach((data, objId) => {
            const obj = this.getObjectById(objId);
            if (!obj) return;
            data.samples.push({ t, state: this._captureContRecState(obj) });
        });

        // Also sample the in-progress drawing (tempObject) so the user's draw
        // gesture itself is recorded as growth-from-tiny-to-final-size.
        const temp = this.tempObject;
        if (temp && temp.id && temp.width !== undefined && temp.height !== undefined) {
            let entry = this._contRec.objects.get(temp.id);
            if (!entry) {
                // First time seeing this tempObject — start its track.
                const initialState = this._captureContRecState(temp);
                entry = {
                    initialState,
                    samples: [{ t, state: initialState }],
                    firstSampleAtMs: t,
                    isLateAdd: true,
                    isDrawTrack: true
                };
                this._contRec.objects.set(temp.id, entry);
                this._contRec.newlyAdded.add(temp.id);
            } else {
                entry.samples.push({ t, state: this._captureContRecState(temp) });
            }
        }
    },

    stopContinuousRecording() {
        if (!this._contRec?.active) return;
        clearInterval(this._contRec.intervalId);

        // Remove live object-added listener
        if (this._contRecObjectAddedHandler) {
            eventBus.off('object:added', this._contRecObjectAddedHandler);
            this._contRecObjectAddedHandler = null;
        }

        // Final sample
        const finalT = performance.now() - this._contRec.startTime;
        this._contRec.objects.forEach((data, objId) => {
            const obj = this.getObjectById(objId);
            if (obj) data.samples.push({ t: finalT, state: this._captureContRecState(obj) });
        });

        // Process into animations
        this._buildContRecAnimations(finalT);

        this._contRec = null;
        this._isRecording = false;
        eventBus.emit('recording:stop');
    },

    _buildContRecAnimations(totalDurationMs) {
        if (!this.animations) return;
        const playheadMs = this.animations.currentTime || 0;
        let recorded = 0;

        // Ensure originalStates exists
        if (!this.animations.originalStates || !(this.animations.originalStates instanceof Map)) {
            this.animations.originalStates = new Map();
        }

        this._contRec.objects.forEach((data, objId) => {
            const obj = this.getObjectById(objId);
            if (!obj) return;
            const { samples, initialState, firstSampleAtMs = 0, isLateAdd = false } = data;

            // For late-added (drawn during recording) objects, inject synthetic
            // "hidden" samples at the start so the recording always plays back
            // a sharp pop-in at the moment the object was drawn — even if the
            // object never moves afterward.
            if (isLateAdd && firstSampleAtMs > 0) {
                const hiddenState = { ...initialState, opacity: 0 };
                // First synthetic sample at recording start, fully hidden.
                samples.unshift({ t: 0, state: hiddenState });
                // Second synthetic sample just before the draw moment, still hidden.
                // This produces a step (no interpolation) until the pop.
                if (firstSampleAtMs > 16) {
                    samples.splice(1, 0, { t: firstSampleAtMs - 16, state: hiddenState });
                }
            }

            if (samples.length < 2) return;

            // Animation now spans the full recording duration so late-added objects
            // can use opacity to pop in at the right moment without time-shifting.
            const objStartMs = 0;
            const objDurationMs = Math.max(1, totalDurationMs);

            // Simplify samples
            const simplified = this._simplifyContRecSamples(samples);
            if (simplified.length < 2) return;

            // Determine which standard properties actually changed
            const stdProps = ['x', 'y', 'width', 'height', 'rotation', 'tiltX', 'tiltY', 'pinBaseTiltX', 'pinBaseTiltY', 'scaleX', 'scaleY', 'armatureSeatDepth', 'armatureSeatLean', 'armatureKneelDepth', 'armatureReachDepth', 'opacity', 'layer', '_armatureDrawLayer', '_ucGarmentMotionRotation', '_ucGarmentMotionTiltX', '_ucGarmentMotionTiltY'];
            const discreteProps = ['imageSrc', 'textureImageSrc', 'svgAvatarState', 'svgAfricanFaceState', 'svgAfricanAdjustments'];
            const changedProps = stdProps.filter(prop => {
                const first = simplified[0].state[prop];
                return simplified.some(s => Math.abs(s.state[prop] - first) > 0.01);
            });
            const changedDiscreteProps = discreteProps.filter(prop => {
                const first = simplified[0].state[prop];
                return simplified.some(s => String(s.state[prop] ?? '') !== String(first ?? ''));
            });

            // Determine which joint properties changed
            const jointCount = simplified[0].state._jointCount || 0;
            const jointProps = [];
            for (let ji = 0; ji < jointCount; ji++) {
                for (const suffix of ['jointAngle_', 'jointTiltX_', 'jointTiltY_', 'jointCrossOffset_']) {
                    const key = suffix + ji;
                    const first = simplified[0].state[key];
                    if (first !== undefined && simplified.some(s => Math.abs((s.state[key] ?? first) - first) > 0.01)) {
                        jointProps.push(key);
                    }
                }
            }
            const flexProps = [];
            const flexPinCount = simplified[0].state._flexPinCount || 0;
            for (let fi = 0; fi < flexPinCount; fi++) {
                const key = 'flexPinAngle_' + fi;
                const first = simplified[0].state[key];
                if (first !== undefined && simplified.some(s => Math.abs((s.state[key] ?? first) - first) > 0.01)) flexProps.push(key);
            }
            const allChangedProps = [...changedProps, ...changedDiscreteProps, ...jointProps, ...flexProps];

            // Check if poses changed
            const hasPose = simplified.some(s => s.state.pose);
            let poseChanged = false;
            if (hasPose) {
                const firstPose = simplified[0].state.pose;
                if (firstPose) {
                    poseChanged = simplified.some(s => {
                        if (!s.state.pose) return false;
                        for (const pinId of Object.keys(firstPose)) {
                            if (!s.state.pose[pinId]) continue;
                            if (Math.abs(s.state.pose[pinId].x - firstPose[pinId].x) > 0.001 ||
                                Math.abs(s.state.pose[pinId].y - firstPose[pinId].y) > 0.001) return true;
                        }
                        return false;
                    });
                }
            }

            if (allChangedProps.length === 0 && !poseChanged) return;

            // Build keyframes for the continuous animation.
            // Normalize sample timestamps to the object's own start time so late-added
            // (newly drawn) objects only animate over the lifetime they actually existed.
            const keyframes = simplified.map(s => {
                const localMs = Math.max(0, s.t - objStartMs);
                const kf = { t: Math.min(1, localMs / objDurationMs) };
                kf.values = {};
                allChangedProps.forEach(prop => { kf.values[prop] = s.state[prop]; });
                if (poseChanged && s.state.pose) kf.pose = s.state.pose;
                return kf;
            });

            // Friendly name
            let friendlyName = 'Continuous Recording';
            if (allChangedProps.length > 0 && !poseChanged) {
                if (allChangedProps.every(p => p === 'x' || p === 'y')) friendlyName = 'Continuous Move';
                else if (allChangedProps.every(p => p === 'rotation')) friendlyName = 'Continuous Rotate';
                else if (allChangedProps.every(p => p === 'width' || p === 'height')) friendlyName = 'Continuous Resize';
                else if (allChangedProps.every(p => p === 'opacity')) friendlyName = 'Continuous Opacity';
                else if (allChangedProps.every(p => discreteProps.includes(p))) friendlyName = 'Continuous SVG State';
                else if (allChangedProps.every(p => p.startsWith('jointAngle_') || p.startsWith('jointTiltX_') || p.startsWith('jointTiltY_') || p.startsWith('jointCrossOffset_'))) friendlyName = 'Continuous Joint Bend';
                else if (allChangedProps.every(p => p.startsWith('flexPinAngle_'))) friendlyName = 'Continuous Flex Bend';
                else friendlyName = 'Continuous Transform';
            } else if (poseChanged && allChangedProps.length === 0) {
                friendlyName = 'Continuous Bone Pose';
            }

            const animData = {
                id: Utils.generateId('anim'),
                type: 'continuous',
                name: friendlyName,
                params: { duration: objDurationMs / 1000, easing: 'linear' },
                delay: playheadMs + objStartMs,
                repeat: '1',
                trigger: 'onLoad',
                startMode: 'from-start',
                generated: {
                    type: 'continuous',
                    duration: objDurationMs,
                    easing: 'linear',
                    keyframes: keyframes,
                    properties: allChangedProps
                }
            };

            obj.animations.push(animData);
            recorded++;

            // Store original state for playback
            if (!this.animations.originalStates.has(obj.id)) {
                this.animations.originalStates.set(obj.id, Utils.deepClone(obj.toJSON()));
            }
            const orig = this.animations.originalStates.get(obj.id);
            stdProps.forEach(p => {
                if (initialState[p] !== undefined) orig[p] = initialState[p];
            });
            discreteProps.forEach(p => {
                if (initialState[p] !== undefined) orig[p] = initialState[p];
            });
            // Late-added objects use the hidden synthetic samples for their pop-in,
            // so the original state should match the first real sample (visible state).
            // Also update joints in original state from initial snapshot
            if (orig.joints && orig.joints.length > 0 && jointProps.length > 0) {
                const sortedOrig = [...orig.joints].sort((a, b) => a.position - b.position);
                sortedOrig.forEach((jt, idx) => {
                    if (initialState['jointAngle_' + idx] !== undefined) jt.angle = initialState['jointAngle_' + idx];
                    if (initialState['jointTiltX_' + idx] !== undefined) jt.tiltX = initialState['jointTiltX_' + idx];
                    if (initialState['jointTiltY_' + idx] !== undefined) jt.tiltY = initialState['jointTiltY_' + idx];
                    if (initialState['jointCrossOffset_' + idx] !== undefined) jt.crossOffset = initialState['jointCrossOffset_' + idx];
                });
            }
            if (orig.flexPins && orig.flexPins.length > 0 && flexProps.length > 0) {
                [...orig.flexPins].sort((a, b) => a.position - b.position).forEach((pin, idx) => {
                    if (initialState['flexPinAngle_' + idx] !== undefined) pin.angle = initialState['flexPinAngle_' + idx];
                });
            }

            // Restore object to initial state so playback starts correctly
            stdProps.forEach(p => { obj[p] = initialState[p]; });
            discreteProps.forEach(p => {
                if (initialState[p] !== undefined) this._applyRecordableProperty(obj, p, initialState[p]);
            });
            // Restore joint state
            if (obj.joints && obj.joints.length > 0 && jointProps.length > 0) {
                const sortedRestore = [...obj.joints].sort((a, b) => a.position - b.position);
                sortedRestore.forEach((jt, idx) => {
                    if (initialState['jointAngle_' + idx] !== undefined) jt.angle = initialState['jointAngle_' + idx];
                    if (initialState['jointTiltX_' + idx] !== undefined) jt.tiltX = initialState['jointTiltX_' + idx];
                    if (initialState['jointTiltY_' + idx] !== undefined) jt.tiltY = initialState['jointTiltY_' + idx];
                    if (initialState['jointCrossOffset_' + idx] !== undefined) jt.crossOffset = initialState['jointCrossOffset_' + idx];
                });
            }
            if (obj.flexPins && obj.flexPins.length > 0 && flexProps.length > 0) {
                [...obj.flexPins].sort((a, b) => a.position - b.position).forEach((pin, idx) => {
                    if (initialState['flexPinAngle_' + idx] !== undefined) pin.angle = initialState['flexPinAngle_' + idx];
                });
            }
            if (initialState.pose && obj.rigging && obj.rigging.pins) {
                obj.rigging.pins.forEach(pin => {
                    if (initialState.pose[pin.id]) {
                        pin.x = initialState.pose[pin.id].x;
                        pin.y = initialState.pose[pin.id].y;
                    }
                });
            }
        });

        if (recorded > 0) {
            eventBus.emit('timeline:update');
            eventBus.emit('objects:updated');
            this.stage.requestRender();
            this.updateProperties();
            Utils.showToast(`Live recording saved (${(totalDurationMs / 1000).toFixed(1)}s) — press Play to preview`, 'success');
        } else {
            Utils.showToast('No changes detected during recording', 'info');
        }
    },

    _simplifyContRecSamples(samples) {
        if (samples.length <= 3) return samples;

        const stdProps = ['x', 'y', 'width', 'height', 'rotation', 'tiltX', 'tiltY', 'pinBaseTiltX', 'pinBaseTiltY', 'scaleX', 'scaleY', 'opacity', 'layer', '_armatureDrawLayer', '_ucGarmentMotionRotation', '_ucGarmentMotionTiltX', '_ucGarmentMotionTiltY'];
        const threshold = 0.5; // tolerance for deviation from linear interpolation
        const poseThreshold = 0.002;
        const jointThreshold = 0.5; // tolerance for joint angle/tilt deviation

        // Collect joint property keys from the first sample
        const jointKeys = [];
        const firstState = samples[0].state;
        if (firstState._jointCount) {
            for (let ji = 0; ji < firstState._jointCount; ji++) {
                for (const suffix of ['jointAngle_', 'jointTiltX_', 'jointTiltY_', 'jointCrossOffset_']) {
                    const key = suffix + ji;
                    if (firstState[key] !== undefined) jointKeys.push(key);
                }
            }
        }
        if (firstState._flexPinCount) {
            for (let fi = 0; fi < firstState._flexPinCount; fi++) {
                const key = 'flexPinAngle_' + fi;
                if (firstState[key] !== undefined) jointKeys.push(key);
            }
        }
        const hasRigMotion = jointKeys.length > 0 || samples.some(sample =>
            ['pinBaseTiltX', 'pinBaseTiltY', '_armatureDrawLayer', '_ucGarmentMotionRotation', '_ucGarmentMotionTiltX', '_ucGarmentMotionTiltY']
                .some(prop => sample.state[prop] !== undefined)
        );

        // Always keep first and last
        const keep = new Array(samples.length).fill(false);
        keep[0] = true;
        keep[samples.length - 1] = true;

        // For each intermediate sample, check if it deviates from linear interpolation
        // between its nearest kept neighbors (iterative approach)
        for (let i = 1; i < samples.length - 1; i++) {
            const prev = samples[i - 1];
            const next = samples[i + 1];
            const cur = samples[i];
            const frac = (cur.t - prev.t) / (next.t - prev.t);

            let deviant = false;
            // Check standard properties
            for (const prop of stdProps) {
                const expected = prev.state[prop] + (next.state[prop] - prev.state[prop]) * frac;
                if (Math.abs(cur.state[prop] - expected) > threshold) {
                    deviant = true;
                    break;
                }
            }

            // Check joint properties
            if (!deviant) {
                for (const key of jointKeys) {
                    const pv = prev.state[key] ?? 0;
                    const nv = next.state[key] ?? 0;
                    const cv = cur.state[key] ?? 0;
                    const expected = pv + (nv - pv) * frac;
                    if (Math.abs(cv - expected) > jointThreshold) {
                        deviant = true;
                        break;
                    }
                }
            }

            // Check pose pins
            if (!deviant && cur.state.pose && prev.state.pose && next.state.pose) {
                for (const pinId of Object.keys(cur.state.pose)) {
                    if (!prev.state.pose[pinId] || !next.state.pose[pinId]) continue;
                    const expX = prev.state.pose[pinId].x + (next.state.pose[pinId].x - prev.state.pose[pinId].x) * frac;
                    const expY = prev.state.pose[pinId].y + (next.state.pose[pinId].y - prev.state.pose[pinId].y) * frac;
                    if (Math.abs(cur.state.pose[pinId].x - expX) > poseThreshold ||
                        Math.abs(cur.state.pose[pinId].y - expY) > poseThreshold) {
                        deviant = true;
                        break;
                    }
                }
            }

            if (deviant) keep[i] = true;
        }

        // Rigged character walks can be visually smooth while each sample is close
        // to linear interpolation. Keep a cadence floor so continuous recording
        // does not collapse a long walk into a sparse root-position glide.
        if (hasRigMotion) {
            const maxRigGapMs = 140;
            let lastKeptIndex = 0;
            for (let i = 1; i < samples.length - 1; i++) {
                if (keep[i]) {
                    lastKeptIndex = i;
                    continue;
                }
                const gap = samples[i].t - samples[lastKeptIndex].t;
                if (gap >= maxRigGapMs) {
                    keep[i] = true;
                    lastKeptIndex = i;
                }
            }
        }

        const result = samples.filter((_, i) => keep[i]);

        // Ensure minimum of 2 keyframes, cap at ~200 for sanity
        if (result.length > 200) {
            const step = Math.ceil(result.length / 200);
            const capped = [result[0]];
            for (let i = step; i < result.length - 1; i += step) capped.push(result[i]);
            capped.push(result[result.length - 1]);
            return capped;
        }

        return result;
    },

    // ── Property Change Recording ─────────────────────────────────────
    _initPropRecording() {
        this._propRecording = false;
        this._propRecordContinuous = false; // true while continuous sampling is active
        this._propRecordRaf = null;         // requestAnimationFrame handle for the sampling loop
        this._propRecordLog = [];       // Array of step entries
        this._propRecordSnapshots = null; // Map<objId, {prop: value}>
        this._propRecordObjIds = [];    // IDs being tracked

        // Trackable properties (numeric + color + string + boolean)
        this._propRecordProps = [
            // Position / geometry
            'x', 'y', 'width', 'height', 'rotation', 'opacity', 'depth',
            'tiltX', 'tiltY', 'pinBaseTiltX', 'pinBaseTiltY', 'scaleX', 'scaleY',
            'pivotX', 'pivotY', 'flipH', 'flipV',
            // Fill / stroke
            'fill', 'stroke', 'strokeWidth', 'borderRadius',
            'fillType', 'gradientAngle', 'gradientColor1', 'gradientColor2',
            // Shadow
            'shadow', 'shadowColor', 'shadowBlur', 'shadowOffsetX', 'shadowOffsetY',
            // Glow
            'glowEnabled', 'glowColor', 'glowSize',
            // Reflection
            'reflectionEnabled', 'reflectionOpacity', 'reflectionOffset',
            // Bevel
            'bevelEnabled', 'bevelSize',
            // Text
            'text', 'fontSize', 'fontWeight', 'letterSpacing', 'lineHeight',
            'textColor', 'textAlign', 'fontFamily', 'fontStyle', 'textDecoration',
            'textTransform', 'textStrokeColor', 'textStrokeWidth', 'textCurve',
            'textBackgroundEnabled', 'textBackgroundColor', 'textBackgroundPadding', 'textBackgroundRadius',
            // Image filters
            'imgBrightness', 'imgContrast', 'imgSaturation', 'imgHue',
            'imgBlur', 'imgGrayscale', 'imgSepia', 'imgInvert',
            'imgTintColor', 'imgTintAmount',
            // Visibility / layer
            'visible', 'locked', 'layer', '_armatureDrawLayer', 'name', 'tags',
            // Presenter SVG avatar state
            'svgAvatarState',
            'svgAfricanFaceState',
            'svgAfricanAdjustments',
            // Pin
            'pinnedTo', 'pinTargetType', 'pinAnchorX', 'pinAnchorY',
            'pinOffsetX', 'pinOffsetY', 'pinRotationOffset',
            'pinContour', 'pinContourColor', 'jointBaseAngle',
            'contourSize', 'contourColor', 'contourFillMode',
            'contourPatternType', 'contourPatternColor', 'contourPatternScale',
            'contourGradientStart', 'contourGradientEnd', 'contourGradientAngle',
            'contourRotation',
            // Flex
            'flexEnabled', 'flexDirection',
            // Compression
            '_compressionRig', '_compressionPair', '_compressionRigBase', '_compressionPairBase'
        ];

        document.getElementById('btn-start-prop-recording')?.addEventListener('click', () => this.startPropRecording());
        document.getElementById('btn-start-prop-recording-continuous')?.addEventListener('click', () => this.startPropRecordingContinuous());
        document.getElementById('btn-stop-prop-recording')?.addEventListener('click', () => this.stopPropRecording());
        document.getElementById('btn-clear-prop-recording')?.addEventListener('click', () => this.clearPropRecording());
        document.getElementById('btn-copy-prop-recording')?.addEventListener('click', () => this._copyPropRecordingToClipboard());
        document.getElementById('btn-export-prop-replay')?.addEventListener('click', async event => {
            const button = event.currentTarget;
            if (this._propReplayAbort) { this._propReplayAbort.abort(); return; }
            const controller = new AbortController();
            this._propReplayAbort = controller;
            const original = { html: button.innerHTML, title: button.title, label: button.getAttribute('aria-label') };
            button.innerHTML = '<i class="fas fa-stop" aria-hidden="true"></i>';
            button.title = 'Cancel replay bundle'; button.setAttribute('aria-label', button.title);
            try {
                if (this._propRecording) throw new Error('Stop recording before exporting the replay bundle.');
                Utils.showToast('Preparing replay bundle...', 'info');
                const bundle = await RecordingReplay.archive(this._propProjectStart, this._propProjectEnd, this.getPropertyRecordingEvidence(), { signal: controller.signal });
                const url = URL.createObjectURL(bundle.blob), link = document.createElement('a');
                link.href = url; link.download = 'animation-stage-replay.zip';
                document.body.appendChild(link); link.click(); link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 1000);
                Utils.showToast(bundle.incomplete ? `Replay bundle downloaded; ${bundle.incomplete} media reference(s) could not be embedded. See its media manifest.` : 'Replay bundle downloaded.', bundle.incomplete ? 'warning' : 'success');
            } catch (error) { Utils.showToast(error.message || 'Replay export failed.', controller.signal.aborted ? 'info' : 'error'); }
            finally {
                this._propReplayAbort = null;
                button.innerHTML = original.html; button.title = original.title;
                if (original.label === null) button.removeAttribute('aria-label'); else button.setAttribute('aria-label', original.label);
            }
        });
        const copyButton = document.getElementById('btn-copy-prop-recording');
        if (copyButton && !document.getElementById('btn-export-prop-evidence')) {
            const button = document.createElement('button');
            button.id = 'btn-export-prop-evidence';
            button.type = 'button';
            button.className = copyButton.className;
            button.title = 'Download recording evidence';
            button.setAttribute('aria-label', button.title);
            button.innerHTML = '<i class="fas fa-download" aria-hidden="true"></i>';
            button.addEventListener('click', () => this.downloadPropertyRecordingEvidence());
            copyButton.after(button);
        }

        // Listen for history:push as the universal "something changed" signal
        eventBus.on('history:push', () => {
            if (this._propRecording) this._capturePropStep();
        });
    },

    _recordingPartIdentity(part, fallback) {
        if (part.id) return String(part.id);
        if (part._recordingIdentity) return String(part._recordingIdentity);
        this._propPartIdentities ||= new WeakMap();
        if (!this._propPartIdentities.has(part)) {
            this._propPartIdentitySequence = (this._propPartIdentitySequence || 0) + 1;
            this._propPartIdentities.set(part, typeof Utils.generateId === 'function'
                ? Utils.generateId(`record_${fallback}`) : `${fallback}-${Date.now()}-${this._propPartIdentitySequence}`);
        }
        const identity = this._propPartIdentities.get(part);
        if (Object.isExtensible(part)) part._recordingIdentity = identity;
        return identity;
    },

    _takePropSnapshot(objects, stableIds = false) {
        const snap = new Map();
        objects.forEach(obj => {
            const state = {};
            this._propRecordProps.forEach(p => {
                const v = p === 'svgAvatarState' && obj._svgAvatar
                    ? obj._svgAvatar.state || {}
                    : (p === 'svgAfricanFaceState' && obj._svgAfricanFaceState
                        ? obj._svgAfricanFaceState || {}
                        : (p === 'svgAfricanAdjustments' && obj._svgAfricanAdjustments
                            ? obj._svgAfricanAdjustments || {}
                            : obj[p]));
                // Serialize arrays/objects to stable JSON so diffs work
                state[p] = (Array.isArray(v) || (v !== null && typeof v === 'object'))
                    ? JSON.stringify(v)
                    : v;
            });

            // Joint angles, tilts, cross offsets (per-joint dynamic keys)
            if (obj.joints && obj.joints.length > 0) {
                const sorted = [...obj.joints].sort((a, b) => a.position - b.position);
                sorted.forEach((jt, idx) => {
                    if (stableIds) idx = this._recordingPartIdentity(jt, 'joint');
                    state['joint[' + idx + '].angle'] = jt.angle || 0;
                    state['joint[' + idx + '].position'] = jt.position ?? 0;
                    state['joint[' + idx + '].tiltX'] = jt.tiltX || 0;
                    state['joint[' + idx + '].tiltY'] = jt.tiltY || 0;
                    state['joint[' + idx + '].crossOffset'] = jt.crossOffset ?? 0.5;
                    state['joint[' + idx + '].contourSize'] = jt.contourSize ?? null;
                    state['joint[' + idx + '].contourColor'] = jt.contourColor ?? null;
                });
            }

            // Flex pin angles / spread (per-pin dynamic keys)
            if (obj.flexEnabled && obj.flexPins?.length > 0) {
                obj.flexPins.forEach((pin, idx) => {
                    if (stableIds) idx = this._recordingPartIdentity(pin, 'flex');
                    state['flexPin[' + idx + '].angle'] = pin.angle || 0;
                    state['flexPin[' + idx + '].position'] = pin.position ?? 0;
                    state['flexPin[' + idx + '].spread'] = pin.spread ?? 0.25;
                    state['flexPin[' + idx + '].maskFeather'] = pin.maskFeather ?? 0;
                    state['flexPin[' + idx + '].maskStrength'] = pin.maskStrength ?? 1;
                });
            }

            // Animation keyframe count per applied animation
            if (obj.animations?.length) {
                state['animations.count'] = obj.animations.length;
                obj.animations.forEach((anim, idx) => {
                    state['anim[' + idx + '].name'] = anim.name || anim.type || '';
                    state['anim[' + idx + '].keyframes'] = anim.keyframes?.length ?? 0;
                });
            }

            // Rigging / bone pose
            if (obj.rigging?.pins?.length) {
                obj.rigging.pins.forEach(pin => {
                    state['rig.pin[' + pin.id + '].x'] = pin.x ?? 0;
                    state['rig.pin[' + pin.id + '].y'] = pin.y ?? 0;
                });
            }

            snap.set(obj.id, state);
        });
        return snap;
    },

    startPropRecording() {
        this._beginPropRecording(false);
    },

    startPropRecordingContinuous() {
        this._beginPropRecording(true);
    },

    _beginPropRecording(continuous = false) {
        const selected = this.getSelectedObjects();
        if (!selected.length) {
            Utils.showToast('Select object(s) first', 'warning');
            return;
        }
        const expanded = this._expandObjectsForPropRecording(selected);
        this._propProjectStart = null; this._propProjectEnd = null;
        if (document.getElementById('prop-record-project-capture')?.checked) {
            try { this._propProjectStart = RecordingReplay.snapshot(window.app.exporter); }
            catch (error) { Utils.showToast(`Project capture unavailable: ${error.message}`, 'warning'); }
        }
        this._propRecording = true;
        this._propRecordContinuous = !!continuous;
        this._propRecordLog = [];
        this._propRecordObjIds = expanded.map(o => o.id);
        this._propRecordRootIds = selected.map(o => o.id);
        this._propRecordSnapshots = this._takePropSnapshot(expanded);
        this._propEvidenceSnapshots = this._takePropSnapshot(expanded, true);
        this._propEvidence = {
            format: 'animstage-property-evidence', version: 1,
            createdAt: new Date().toISOString(),
            sampling: { intervalMs: continuous ? 120 : null, numericTolerance: 0.001 },
            identityScope: 'Part IDs where present; fallback recording metadata persists with serialized joints/pins. Frozen or replaced legacy parts may remain session-scoped.',
            initial: Object.fromEntries(this._propEvidenceSnapshots),
            events: [],
            limitations: ['Sampled observations, not a complete event replay or proven causal trace.']
        };
        this._capturePropertyEvidenceScene('initial', expanded);

        // Save initial state as step 0
        const initial = {};
        this._propRecordSnapshots.forEach((state, objId) => {
            const obj = this.getObjectById(objId);
            const name = obj ? (obj.name || obj.type) : objId;
            initial[objId] = { name, state: { ...state } };
        });
        this._propRecordLog.push({
            step: 0,
            label: 'Initial State',
            time: Date.now(),
            changes: initial
        });

        // Toggle button visibility
        document.getElementById('btn-start-prop-recording')?.classList.add('hidden');
        document.getElementById('btn-start-prop-recording-continuous')?.classList.add('hidden');
        document.getElementById('btn-stop-prop-recording')?.classList.remove('hidden');
        document.getElementById('prop-recording-indicator')?.classList.remove('hidden');
        document.getElementById('prop-recording-log')?.classList.add('hidden');
        document.getElementById('prop-record-section')?.classList.add('is-recording');

        if (continuous) this._startPropRecordingContinuousLoop();
        Utils.showToast(`${continuous ? 'Continuous' : 'Step'} recording started for ${expanded.length} object(s)`, 'info');
    },

    // Continuous mode samples property changes on a throttled animation-frame loop so drags
    // and live gestures are captured as a stream of steps, not just on discrete history commits.
    _startPropRecordingContinuousLoop() {
        const intervalMs = 120;
        let last = 0;
        const tick = (ts) => {
            if (!this._propRecording || !this._propRecordContinuous) {
                this._propRecordRaf = null;
                return;
            }
            if (!last || ts - last >= intervalMs) {
                last = ts;
                this._capturePropStep();
            }
            this._propRecordRaf = requestAnimationFrame(tick);
        };
        this._propRecordRaf = requestAnimationFrame(tick);
    },

    _expandObjectsForPropRecording(objects = []) {
        const selected = (objects || []).filter(Boolean);
        const byId = new Map();
        selected.forEach(obj => {
            if (obj?.id) byId.set(obj.id, obj);
        });

        selected.forEach(obj => {
            const armature = this._detectJointEditorArmature?.(obj);
            if (armature?.root) {
                this._getArmatureObjectsForJointEditor?.(armature)?.forEach(part => {
                    if (part?.id) byId.set(part.id, part);
                });
            }
            this._getCharacterJointObjectsFromSelection?.(obj)?.forEach(part => {
                if (part?.id) byId.set(part.id, part);
            });
        });

        let changed = true;
        while (changed) {
            changed = false;
            for (const obj of this.objects || []) {
                if (!byId.has(obj.id) && (byId.has(obj.pinnedTo) || byId.has(obj.sceneAsset?.activityRootId))) {
                    byId.set(obj.id, obj); changed = true;
                }
            }
        }
        return [...byId.values()];
    },

    _getPropRecordingObjects() {
        const roots = (this._propRecordRootIds || []).map(id => this.getObjectById(id)).filter(Boolean);
        const ids = new Set(this._propRecordObjIds || []);
        this._expandObjectsForPropRecording(roots).forEach(obj => ids.add(obj.id));
        this._propRecordObjIds = [...ids];
        return this._propRecordObjIds.map(id => this.getObjectById(id)).filter(Boolean);
    },

    _capturePropStep() {
        if (!this._propRecording || !this._propRecordObjIds.length) return false;

        const objects = this._getPropRecordingObjects();
        this._capturePropEvidence(objects);
        if (!objects.length) return false;

        const currentSnap = this._takePropSnapshot(objects);
        const changes = {};
        let hasChange = false;

        currentSnap.forEach((currentState, objId) => {
            const prevState = this._propRecordSnapshots.get(objId);
            if (!prevState) return;

            const diffs = {};
            for (const prop of new Set([...Object.keys(prevState), ...Object.keys(currentState)])) {
                const prev = prevState[prop];
                const curr = currentState[prop];
                if (prev !== curr) {
                    // For numbers, use a tolerance
                    if (typeof prev === 'number' && typeof curr === 'number') {
                        if (Math.abs(prev - curr) > 0.001) {
                            diffs[prop] = { from: prev, to: curr };
                            hasChange = true;
                        }
                    } else {
                        diffs[prop] = { from: prev, to: curr };
                        hasChange = true;
                    }
                }
            }

            if (Object.keys(diffs).length > 0) {
                const obj = this.getObjectById(objId);
                const name = obj ? (obj.name || obj.type) : objId;
                changes[objId] = { name, diffs };
            }
        });

        if (!hasChange) return false;

        const stepNum = this._propRecordLog.length;
        this._propRecordLog.push({
            step: stepNum,
            label: `Step ${stepNum}`,
            time: Date.now(),
            changes
        });

        // Update snapshot to current
        this._propRecordSnapshots = currentSnap;
        return true;
    },

    _capturePropEvidence(objects) {
        if (!this._propEvidence) return;
        const current = this._takePropSnapshot(objects, true);
        const previous = this._propEvidenceSnapshots || new Map();
        const changes = [];
        for (const id of new Set([...previous.keys(), ...current.keys()])) {
            const before = previous.get(id) || {}, after = current.get(id) || {};
            for (const property of new Set([...Object.keys(before), ...Object.keys(after)])) {
                const from = before[property], to = after[property];
                if (from === to) continue;
                if (typeof from === 'number' && typeof to === 'number' && Math.abs(from - to) <= 0.001) continue;
                changes.push({ objectId: id, property,
                    before: { present: Object.hasOwn(before, property) && from !== undefined, value: from ?? null },
                    after: { present: Object.hasOwn(after, property) && to !== undefined, value: to ?? null } });
            }
        }
        if (!changes.length) return;
        const eventId = `observation-${this._propEvidence.events.length + 1}`;
        this._propEvidence.events.push({ eventId, time: Date.now(),
            timelineTimeMs: Number(this.animations?.currentTime) || 0,
            source: this._propEvidenceAction ? 'instrumented-operation' : 'observed',
            causeEventId: this._propEvidenceAction?.id || null, changes,
            dependencies: objects.filter(o => o.pinnedTo).map(o => ({ child: o.id, parent: o.pinnedTo })) });
        this._propEvidenceSnapshots = current;
    },

    recordPropertyEvidenceAction(label, operation, objectIds = []) {
        if (!this._propRecording || !this._propEvidence) return operation();
        const observed = () => this._getPropRecordingObjects();
        this._capturePropEvidence(observed());
        const previous = this._propEvidenceAction;
        const actions = this._propEvidence.actions ||= [];
        const action = { id: `action-${actions.length + 1}`, label, objectIds: [...objectIds],
            parentActionId: previous?.id || null, time: Date.now(), status: 'running',
            attribution: 'Synchronous operation boundary; not a per-property causal proof.' };
        actions.push(action);
        this._propEvidenceAction = action;
        try {
            const result = operation();
            if (result?.then) throw new Error('Property evidence operations must be synchronous.');
            action.status = 'completed';
            return result;
        } catch (error) {
            action.status = 'failed';
            throw error;
        } finally {
            try {
                this._capturePropEvidence(observed());
                this._capturePropertyEvidenceScene(action.id, observed());
            } finally {
                this._propEvidenceAction = previous;
            }
        }
    },

    recordPropertyReplayPlan(plan) {
        if (!this._propRecording || !this._propEvidence) return;
        // Evidence capture must not fail an already committed timeline operation.
        try {
            const entries = this._propEvidence.replayPlans ||= [];
            const count = entries.reduce((sum, entry) => sum + entry.plan.actions.length, 0);
            const serialized = JSON.stringify(plan);
            const bytes = entries.reduce((sum, entry) => sum + JSON.stringify(entry.plan).length, 0);
            if (count + plan.actions.length > 1000 || bytes + serialized.length > 900 * 1024) {
                throw new Error('Action replay capture limit reached; later actions were not captured.');
            }
            entries.push({ id: `plan-${entries.length + 1}`, time: Date.now(),
                plan: JSON.parse(serialized), scope: 'Validated numeric Code Mode actions only; delays are absolute timeline milliseconds.' });
        } catch (error) {
            const notices = this._propEvidence.replayNotices ||= [];
            const message = String(error.message || error);
            if (!notices.includes(message) && notices.length < 20) notices.push(message);
        }
    },

    getPropertyRecordingEvidence() {
        return this._propEvidence ? JSON.parse(JSON.stringify(this._propEvidence)) : null;
    },

    _capturePropertyEvidenceScene(boundary, objects) {
        if (!this._propEvidence) return;
        const captures = this._propEvidence.captures ||= [];
        const notices = this._propEvidence.captureNotices ||= [];
        try {
            const records = objects.map(obj => typeof obj.toJSON === 'function' ? obj.toJSON() : { id: obj.id });
            const payload = { boundary, objects: records, objectIds: objects.map(obj => obj.id),
                timelineTimeMs: Number(this.animations?.currentTime) || 0 };
            payload.assets = [...new Set(records.flatMap(record => [record.imageSrc, record.audioSrc, record.src])
                .filter(value => typeof value === 'string' && value))].map(src => ({
                    src: src.startsWith('data:') ? undefined : src, sizeChars: src.length,
                    storage: src.startsWith('data:') ? 'embedded-in-object' : src.startsWith('blob:') ? 'session-only' : 'external-reference' }));
            const text = JSON.stringify(payload);
            const used = this._propEvidence.captureBytes || 0;
            // Bound memory use during long recording sessions. Never interrupt an edit.
            const bytes = text.length * 2;
            if (used + bytes > 16 * 1024 * 1024) {
                if (!notices.includes('Capture size limit reached; subsequent scene captures omitted.')) notices.push('Capture size limit reached; subsequent scene captures omitted.');
                return;
            }
            const capture = JSON.parse(text);
            captures.push(capture);
            this._propEvidence.captureBytes = used + bytes;
        } catch (error) {
            notices.push(`Scene capture unavailable at ${boundary}: ${String(error.message || error).slice(0, 200)}`);
        }
    },

    downloadPropertyRecordingEvidence() {
        const evidence = this.getPropertyRecordingEvidence();
        if (!evidence) { Utils.showToast('Record property changes first.', 'warning'); return; }
        const url = URL.createObjectURL(new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'animation-stage-property-evidence.json';
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    stopPropRecording() {
        if (!this._propRecording) return;

        // Stop the continuous sampling loop before the final capture
        if (this._propRecordRaf) {
            cancelAnimationFrame(this._propRecordRaf);
            this._propRecordRaf = null;
        }

        // Capture any final pending change
        this._capturePropStep();
        this._capturePropertyEvidenceScene('final', this._getPropRecordingObjects());

        const wasContinuous = this._propRecordContinuous;
        this._propRecording = false;
        this._propRecordContinuous = false;
        if (this._propProjectStart) {
            try { this._propProjectEnd = RecordingReplay.snapshot(window.app.exporter); }
            catch (error) { Utils.showToast(`Final project capture unavailable: ${error.message}`, 'warning'); }
        }

        // Toggle buttons
        document.getElementById('btn-start-prop-recording')?.classList.remove('hidden');
        document.getElementById('btn-start-prop-recording-continuous')?.classList.remove('hidden');
        document.getElementById('btn-stop-prop-recording')?.classList.add('hidden');
        document.getElementById('prop-recording-indicator')?.classList.add('hidden');
        document.getElementById('prop-record-section')?.classList.remove('is-recording');

        // Render the log
        this._renderPropRecordingLog();

        const stepCount = this._propRecordLog.length - 1; // exclude initial state
        Utils.showToast(`${wasContinuous ? 'Continuous' : 'Step'} recording stopped — ${stepCount} step(s) captured`, 'success');
    },

    _renderPropRecordingLog() {
        const container = document.getElementById('prop-recording-log');
        const entries = document.getElementById('prop-recording-log-entries');
        if (!container || !entries) return;

        entries.innerHTML = '';

        if (this._propRecordLog.length <= 1) {
            entries.innerHTML = '<div class="prop-rec-empty">No property changes recorded.</div>';
            container.classList.remove('hidden');
            return;
        }

        // Get initial state for showing start values
        const initialStep = this._propRecordLog[0];

        // Build per-object summary tables
        const objSummaries = new Map(); // objId -> { name, props: Map<prop, {start, steps[], end}> }

        // Initialize from initial state
        for (const [objId, data] of Object.entries(initialStep.changes)) {
            const propMap = new Map();
            for (const [prop, val] of Object.entries(data.state)) {
                propMap.set(prop, { start: val, steps: [], end: val });
            }
            objSummaries.set(objId, { name: data.name, props: propMap });
        }

        // Process each step
        for (let i = 1; i < this._propRecordLog.length; i++) {
            const step = this._propRecordLog[i];
            for (const [objId, data] of Object.entries(step.changes)) {
                const summary = objSummaries.get(objId);
                if (!summary) continue;
                for (const [prop, diff] of Object.entries(data.diffs)) {
                    if (!summary.props.has(prop)) {
                        summary.props.set(prop, { start: diff.from, steps: [], end: diff.to });
                    }
                    const entry = summary.props.get(prop);
                    entry.steps.push({ step: i, from: diff.from, to: diff.to });
                    entry.end = diff.to;
                }
            }
        }

        // Render each object
        objSummaries.forEach((summary, objId) => {
            const changedProps = [];
            summary.props.forEach((data, prop) => {
                if (data.steps.length > 0) changedProps.push({ prop, ...data });
            });
            if (changedProps.length === 0) return;

            const objDiv = document.createElement('div');
            objDiv.className = 'prop-rec-object';

            const header = document.createElement('div');
            header.className = 'prop-rec-obj-name';
            header.textContent = summary.name;
            objDiv.appendChild(header);

            const table = document.createElement('table');
            table.className = 'prop-rec-table';

            // Header row — one column per recorded step
            const thead = document.createElement('thead');
            const totalSteps = this._propRecordLog.length - 1;
            let headerHTML = '<tr><th>Property</th><th>Start</th>';
            for (let s = 1; s <= totalSteps; s++) headerHTML += `<th>Step ${s}</th>`;
            headerHTML += '<th>End</th></tr>';
            thead.innerHTML = headerHTML;
            table.appendChild(thead);

            // Data rows — each changed property gets one row
            const tbody = document.createElement('tbody');
            changedProps.forEach(({ prop, start, steps, end }) => {
                const row = document.createElement('tr');
                let html = `<td class="prop-rec-prop-name">${this._formatPropName(prop)}</td>`;
                html += `<td class="prop-rec-start">${this._formatPropVal(start)}</td>`;

                // Each step column: show the value if this prop changed at that step,
                // otherwise show the inherited current value (greyed) so the table reads
                // naturally left-to-right without gaps.
                let currentVal = start;
                for (let s = 1; s <= this._propRecordLog.length - 1; s++) {
                    const stepEntry = steps.find(st => st.step === s);
                    if (stepEntry) {
                        html += `<td class="prop-rec-changed">${this._formatPropVal(stepEntry.to)}</td>`;
                        currentVal = stepEntry.to;
                    } else {
                        html += `<td class="prop-rec-unchanged">${this._formatPropVal(currentVal)}</td>`;
                    }
                }
                html += `<td class="prop-rec-end">${this._formatPropVal(end)}</td>`;
                row.innerHTML = html;
                tbody.appendChild(row);
            });
            table.appendChild(tbody);
            objDiv.appendChild(table);
            entries.appendChild(objDiv);
        });

        container.classList.remove('hidden');
    },

    /** Build plain-text representation of the log suitable for clipboard. */
    _buildPropRecordingText() {
        if (!this._propRecordLog.length) return '';
        const lines = [];
        const totalSteps = this._propRecordLog.length - 1;
        lines.push('=== Property Change Recording ===');
        lines.push(`Steps recorded: ${totalSteps}`);
        lines.push('');

        // Reconstruct per-object summaries (same logic as render)
        const initialStep = this._propRecordLog[0];
        const objSummaries = new Map();
        for (const [objId, data] of Object.entries(initialStep.changes)) {
            const propMap = new Map();
            for (const [prop, val] of Object.entries(data.state)) {
                propMap.set(prop, { start: val, steps: [], end: val });
            }
            objSummaries.set(objId, { name: data.name, props: propMap });
        }
        for (let i = 1; i < this._propRecordLog.length; i++) {
            const step = this._propRecordLog[i];
            for (const [objId, data] of Object.entries(step.changes)) {
                const summary = objSummaries.get(objId);
                if (!summary) continue;
                for (const [prop, diff] of Object.entries(data.diffs)) {
                    if (!summary.props.has(prop)) summary.props.set(prop, { start: diff.from, steps: [], end: diff.to });
                    const entry = summary.props.get(prop);
                    entry.steps.push({ step: i, from: diff.from, to: diff.to });
                    entry.end = diff.to;
                }
            }
        }

        const fmtPlain = val => {
            if (val === undefined || val === null) return '—';
            if (typeof val === 'boolean') return val ? 'true' : 'false';
            if (typeof val === 'number') return Number.isInteger(val) ? String(val) : val.toFixed(3);
            return String(val);
        };

        objSummaries.forEach((summary) => {
            const changedProps = [];
            summary.props.forEach((data, prop) => {
                if (data.steps.length > 0) changedProps.push({ prop, ...data });
            });
            if (!changedProps.length) return;

            lines.push(`--- ${summary.name} ---`);
            // Column widths
            const propW = Math.max(8, ...changedProps.map(p => this._formatPropName(p.prop).length));
            const valW = 12;
            const pad = (s, w) => String(s).padEnd(w);

            // Header
            let header = pad('Property', propW) + '  ' + pad('Start', valW);
            for (let s = 1; s <= totalSteps; s++) header += '  ' + pad('Step ' + s, valW);
            header += '  End';
            lines.push(header);
            lines.push('-'.repeat(header.length));

            changedProps.forEach(({ prop, start, steps, end }) => {
                let row = pad(this._formatPropName(prop), propW) + '  ' + pad(fmtPlain(start), valW);
                for (let s = 1; s <= totalSteps; s++) {
                    const st = steps.find(x => x.step === s);
                    row += '  ' + pad(st ? fmtPlain(st.to) : '', valW);
                }
                row += '  ' + fmtPlain(end);
                lines.push(row);
            });
            lines.push('');
        });
        return lines.join('\n');
    },

    _copyPropRecordingToClipboard() {
        const text = this._buildPropRecordingText();
        if (!text) { Utils.showToast('Nothing recorded yet', 'warning'); return; }
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                Utils.showToast('Copied to clipboard', 'success');
            }).catch(() => this._copyFallback(text));
        } else {
            this._copyFallback(text);
        }
    },

    _copyFallback(text) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px;opacity:0';
        document.body.appendChild(ta);
        ta.select();
        try {
            document.execCommand('copy');
            Utils.showToast('Copied to clipboard', 'success');
        } catch {
            Utils.showToast('Could not copy — try selecting the table manually', 'error');
        }
        document.body.removeChild(ta);
    },

    _formatPropName(prop) {
        const labels = {
            _armatureDrawLayer: 'Z-Order',
            layer: 'Layer'
        };
        return labels[prop] || prop;
    },

    _formatPropVal(val) {
        if (val === undefined || val === null) return '—';
        if (typeof val === 'number') return Number.isInteger(val) ? val.toString() : val.toFixed(2);
        if (typeof val === 'boolean') return val ? '✓' : '✗';
        if (typeof val === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(val)) {
            return `<span class="prop-rec-color" style="background:${val}"></span>${val}`;
        }
        // Serialized JSON (arrays/objects stored as strings)
        if (typeof val === 'string' && (val.startsWith('[') || val.startsWith('{'))) {
            try {
                const parsed = JSON.parse(val);
                if (Array.isArray(parsed)) return `[${parsed.length} items]`;
                return '{…}';
            } catch { /* fall through */ }
        }
        const s = String(val);
        return s.length > 40 ? s.slice(0, 37) + '…' : s;
    },

    _toColorInputHex(color, fallback = '#888888') {
        const normalizeHex = (value, fb) => {
            if (typeof value !== 'string') return fb;
            const trimmed = value.trim();
            const match = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
            if (!match) return null;
            let hex = match[1];
            if (hex.length === 3) {
                hex = hex.split('').map(ch => ch + ch).join('');
            }
            return `#${hex.toLowerCase()}`;
        };

        const safeFallback = normalizeHex(fallback, '#888888') || '#888888';
        if (typeof color !== 'string') return safeFallback;
        const value = color.trim();
        if (!value || value === 'transparent' || value === 'none') return safeFallback;

        const hex = normalizeHex(value, safeFallback);
        if (hex) return hex;

        const rgbMatch = value.match(/^rgba?\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)(?:\s*,\s*[0-9.]+\s*)?\)$/i);
        if (rgbMatch) {
            const toHex = (num) => {
                const clamped = Math.max(0, Math.min(255, Math.round(parseFloat(num) || 0)));
                return clamped.toString(16).padStart(2, '0');
            };
            return `#${toHex(rgbMatch[1])}${toHex(rgbMatch[2])}${toHex(rgbMatch[3])}`;
        }

        return safeFallback;
    },

    clearPropRecording() {
        this._propRecordLog = [];
        this._propEvidence = null;
        this._propProjectStart = null;
        this._propProjectEnd = null;
        this._propEvidenceSnapshots = null;
        this._propRecordSnapshots = null;
        this._propRecordObjIds = [];
        const container = document.getElementById('prop-recording-log');
        const entries = document.getElementById('prop-recording-log-entries');
        if (entries) entries.innerHTML = '';
        if (container) container.classList.add('hidden');
        Utils.showToast('Recording cleared', 'info');
    },

});
