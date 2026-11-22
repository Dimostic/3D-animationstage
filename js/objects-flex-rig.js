/**
 * Object Manager - Flex Rig Mode
 * Visual pose handles for existing Pose Armature joints.
 *
 * This mode is intentionally an editor control layer. It writes to normal
 * joint angle/tilt fields so existing armature rendering, animation, preview,
 * and export paths remain unchanged.
 */

Object.assign(ObjectManager.prototype, {

    toggleFlexRigMode() {
        if (this._flexRigMode) {
            this.exitFlexRigMode();
        } else {
            this.enterFlexRigMode();
        }
    },

    enterFlexRigMode() {
        if (this._flexMode) this.exitFlexMode();

        const armature = this._resolveFlexRigArmature();
        if (!armature?.root) {
            Utils.showToast('Select a Pose Armature body part first', 'warning');
            return;
        }

        const entries = this._getFlexRigEntries(armature);
        if (!entries.length) {
            Utils.showToast('No editable joints found on this armature', 'warning');
            return;
        }

        this._flexRigMode = true;
        this._flexRigArmature = armature;
        this._flexRigHoverKey = null;
        this._flexRigSelectedKey = entries[0].key;
        this._flexRigDrag = null;
        this._flexRigChannel = this._flexRigChannel || 'angle';

        document.getElementById('btn-flex-rig-mode')?.classList.add('active');
        document.getElementById('flex-rig-controls')?.classList.remove('hidden');
        this._syncFlexRigChannelUI();
        this._updateFlexRigJointList();

        if (!this._flexRigOverlayHandler) {
            this._flexRigOverlayHandler = (ctx) => this.renderFlexRigOverlay(ctx);
            eventBus.on('stage:render-overlay', this._flexRigOverlayHandler);
        }

        this.stage.viewport.style.cursor = 'crosshair';
        this.stage.requestRender();
        Utils.showToast('Flex Rig mode: drag green angle rings to pose. Use Z Tilt X/Y for depth-style joint tilt.', 'info');
    },

    exitFlexRigMode() {
        this._flexRigMode = false;
        this._flexRigArmature = null;
        this._flexRigHoverKey = null;
        this._flexRigSelectedKey = null;
        this._flexRigDrag = null;

        document.getElementById('btn-flex-rig-mode')?.classList.remove('active');
        document.getElementById('flex-rig-controls')?.classList.add('hidden');
        if (this._flexRigOverlayHandler) {
            eventBus.off('stage:render-overlay', this._flexRigOverlayHandler);
            this._flexRigOverlayHandler = null;
        }
        this.stage.viewport.style.cursor = this.currentTool === 'hand' ? 'grab' : '';
        this.stage.requestRender();
    },

    _getFlexRigJointSystem() {
        return window.app?.jointSystem || null;
    },

    _resolveFlexRigArmature() {
        const jointSystem = this._getFlexRigJointSystem();
        if (!jointSystem) return null;

        const selected = this.getSelectedObjects?.() || [];
        let armature = jointSystem._detectSelectedArmature?.() || null;
        if (!armature && selected.length === 0) {
            armature = (jointSystem._currentArmature?.root ? jointSystem._currentArmature : null)
                || jointSystem._detectArmature?.();
        }

        if (armature?.root && typeof jointSystem._refreshDetectedArmatureReference === 'function') {
            armature = jointSystem._refreshDetectedArmatureReference(armature) || armature;
        }
        if (armature?.root) {
            jointSystem._currentArmature = armature;
        }
        return armature;
    },

    _getFlexRigEntries(armature = this._flexRigArmature) {
        const jointSystem = this._getFlexRigJointSystem();
        const liveArmature = armature?.root && jointSystem?._refreshDetectedArmatureReference
            ? (jointSystem._refreshDetectedArmatureReference(armature) || armature)
            : armature;
        if (!liveArmature?.root) return [];

        const armatureObjects = jointSystem?._getArmatureObjects
            ? jointSystem._getArmatureObjects(liveArmature).filter(Boolean)
            : [liveArmature.root, ...Object.values(liveArmature.parts || {}).map(part => part?.obj).filter(Boolean)];
        const entries = [];
        const seen = new Set();

        armatureObjects.forEach(obj => {
            if (!obj?.id || !Array.isArray(obj.joints) || !obj.joints.length) return;
            const roleInfo = window.BodyPartRoles?.resolveObjectRole?.(obj);
            const partKey = roleInfo?.canonical || String(obj._armatureRoleKey || obj._armaturePartKey || obj.bodyPartData?.partKey || obj.name || '').toLowerCase();
            [...obj.joints].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)).forEach((joint, index) => {
                if (!joint) return;
                const jointKey = joint.id || `${joint.name || 'joint'}-${index}`;
                const key = `${obj.id}:${jointKey}`;
                if (seen.has(key)) return;
                seen.add(key);
                entries.push({
                    key,
                    obj,
                    joint,
                    partKey,
                    partLabel: this._formatFlexRigLabel(partKey || obj.name || 'Part'),
                    jointLabel: this._formatFlexRigLabel(joint.name || `Joint ${index + 1}`)
                });
            });
        });
        return entries;
    },

    _formatFlexRigLabel(value) {
        return String(value || '')
            .replace(/[_:]+/g, '-')
            .replace(/[-\s]+/g, ' ')
            .trim()
            .replace(/\b\w/g, char => char.toUpperCase()) || 'Joint';
    },

    _getFlexRigEntryByKey(key) {
        return this._getFlexRigEntries().find(entry => entry.key === key) || null;
    },

    _setFlexRigChannel(channel) {
        if (!['angle', 'tiltX', 'tiltY'].includes(channel)) return;
        this._flexRigChannel = channel;
        this._syncFlexRigChannelUI();
        this.stage.requestRender();
    },

    _syncFlexRigChannelUI() {
        const channel = this._flexRigChannel || 'angle';
        document.getElementById('flex-rig-channel-angle')?.classList.toggle('active', channel === 'angle');
        document.getElementById('flex-rig-channel-tilt-x')?.classList.toggle('active', channel === 'tiltX');
        document.getElementById('flex-rig-channel-tilt-y')?.classList.toggle('active', channel === 'tiltY');
    },

    _updateFlexRigJointList() {
        const listEl = document.getElementById('flex-rig-joint-list');
        if (!listEl) return;
        const entries = this._getFlexRigEntries();
        if (!entries.length) {
            listEl.innerHTML = '<div style="font-size:11px;color:#94a3b8;">No armature joints detected.</div>';
            return;
        }

        listEl.innerHTML = entries.map(entry => {
            const selected = entry.key === this._flexRigSelectedKey;
            const angle = Math.round(entry.joint.angle || 0);
            const tiltX = Math.round(entry.joint.tiltX || 0);
            const tiltY = Math.round(entry.joint.tiltY || 0);
            return `
                <div class="flex-rig-row${selected ? ' selected' : ''}" data-flex-rig-key="${entry.key}" style="padding:6px 0;border-top:1px solid rgba(148,163,184,0.16);">
                    <div style="display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px;margin-bottom:4px;">
                        <button class="btn-sm btn-secondary flex-rig-select" data-flex-rig-key="${entry.key}" style="flex:1;text-align:left;${selected ? 'border-color:#60a5fa;color:#dbeafe;' : ''}" title="Select this joint handle">
                            ${entry.partLabel} / ${entry.jointLabel}
                        </button>
                    </div>
                    <div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;font-size:10px;">
                        <label>Angle<input type="number" class="flex-rig-value" data-flex-rig-key="${entry.key}" data-prop="angle" min="-180" max="180" step="1" value="${angle}" style="width:100%;"></label>
                        <label>Z X<input type="number" class="flex-rig-value" data-flex-rig-key="${entry.key}" data-prop="tiltX" min="-45" max="45" step="1" value="${tiltX}" style="width:100%;"></label>
                        <label>Z Y<input type="number" class="flex-rig-value" data-flex-rig-key="${entry.key}" data-prop="tiltY" min="-45" max="45" step="1" value="${tiltY}" style="width:100%;"></label>
                    </div>
                </div>
            `;
        }).join('');

        listEl.querySelectorAll('.flex-rig-select').forEach(button => {
            button.addEventListener('click', () => {
                this._flexRigSelectedKey = button.dataset.flexRigKey;
                this._updateFlexRigJointList();
                this.stage.requestRender();
            });
        });
        listEl.querySelectorAll('.flex-rig-value').forEach(input => {
            input.addEventListener('input', () => {
                this._applyFlexRigValue(input.dataset.flexRigKey, input.dataset.prop, parseFloat(input.value), { pushHistory: false });
            });
            input.addEventListener('change', () => {
                this._applyFlexRigValue(input.dataset.flexRigKey, input.dataset.prop, parseFloat(input.value), { pushHistory: true });
            });
        });
    },

    _applyFlexRigValue(key, prop, rawValue, options = {}) {
        const entry = this._getFlexRigEntryByKey(key);
        if (!entry || !['angle', 'tiltX', 'tiltY'].includes(prop)) return false;
        const maxAbs = prop === 'angle' ? 180 : 45;
        const nextValue = Math.max(-maxAbs, Math.min(maxAbs, Number.isFinite(rawValue) ? rawValue : 0));
        entry.joint[prop] = Math.round(nextValue * 10) / 10;
        this._flexRigSelectedKey = key;
        this._afterFlexRigJointChange({ updateList: false, pushHistory: options.pushHistory === true });
        return true;
    },

    _afterFlexRigJointChange(options = {}) {
        if (typeof this._resolvePins === 'function') this._resolvePins();
        if (options.updateList !== false) this._updateFlexRigJointList();
        this.stage.requestRender();
        if (options.pushHistory) eventBus.emit('history:push');
    },

    _normalizeFlexRigAngleRadians(radians) {
        const fullTurn = Math.PI * 2;
        let value = Number.isFinite(radians) ? radians : 0;
        while (value > Math.PI) value -= fullTurn;
        while (value < -Math.PI) value += fullTurn;
        return value;
    },

    _getFlexRigHandlePoints(entry, zoom = 1) {
        if (!entry?.obj || !entry?.joint || typeof entry.obj.getJointWorldPosition !== 'function') return null;
        const jointWorld = entry.obj.getJointWorldPosition(entry.joint);
        if (!jointWorld) return null;
        const scale = Math.max(0.001, zoom);
        const length = 34 / scale;
        const radius = 44 / scale;
        const direction = StageObject.getJointDirectionMeta(entry.obj.jointDirection);
        const baseRad = direction.isVertical ? 0 : -Math.PI / 2;
        const valueRad = baseRad + ((entry.joint.angle || 0) * Math.PI / 180);
        const angleGuide = { radius, baseRad, valueRad };
        const angleHandle = {
            x: jointWorld.x + Math.cos(valueRad) * radius,
            y: jointWorld.y + Math.sin(valueRad) * radius
        };
        const tiltHandle = {
            x: jointWorld.x + length * 0.72,
            y: jointWorld.y - length * 0.72
        };
        return { joint: jointWorld, angleHandle, tiltHandle, angleGuide };
    },

    _hitTestFlexRigHandle(pos) {
        const zoom = Math.max(0.001, this.stage.zoom);
        const threshold = 12 / zoom;
        const entries = this._getFlexRigEntries();
        for (let i = entries.length - 1; i >= 0; i--) {
            const entry = entries[i];
            const points = this._getFlexRigHandlePoints(entry, zoom);
            if (!points) continue;
            const handle = this._flexRigChannel === 'angle' ? points.angleHandle : points.tiltHandle;
            if (Math.hypot(pos.x - handle.x, pos.y - handle.y) <= threshold) {
                return entry;
            }
            if (this._flexRigChannel === 'angle' && points.angleGuide) {
                const ringDistance = Math.hypot(pos.x - points.joint.x, pos.y - points.joint.y);
                if (Math.abs(ringDistance - points.angleGuide.radius) <= threshold) {
                    return entry;
                }
            }
            if (Math.hypot(pos.x - points.joint.x, pos.y - points.joint.y) <= threshold) {
                return entry;
            }
        }
        return null;
    },

    _handleFlexRigMouseDown(pos) {
        if (!this._flexRigMode) return false;
        const entry = this._hitTestFlexRigHandle(pos);
        if (!entry) return false;
        const zoom = Math.max(0.001, this.stage.zoom);
        const points = this._getFlexRigHandlePoints(entry, zoom);
        const pointerDistance = points
            ? Math.hypot(pos.x - points.joint.x, pos.y - points.joint.y)
            : 0;
        const startPointerRad = points?.angleGuide && pointerDistance > 2 / zoom
            ? Math.atan2(pos.y - points.joint.y, pos.x - points.joint.x)
            : points?.angleGuide?.valueRad || 0;
        this._flexRigSelectedKey = entry.key;
        this._flexRigDrag = {
            key: entry.key,
            startX: pos.x,
            startY: pos.y,
            channel: this._flexRigChannel || 'angle',
            startAngle: entry.joint.angle || 0,
            startTiltX: entry.joint.tiltX || 0,
            startTiltY: entry.joint.tiltY || 0,
            jointX: points?.joint?.x ?? pos.x,
            jointY: points?.joint?.y ?? pos.y,
            startPointerRad
        };
        this._updateFlexRigJointList();
        this.stage.viewport.style.cursor = 'grabbing';
        this.stage.requestRender();
        return true;
    },

    _handleFlexRigMouseMove(pos) {
        if (!this._flexRigMode) return false;
        if (this._flexRigDrag) {
            const entry = this._getFlexRigEntryByKey(this._flexRigDrag.key);
            if (!entry) return true;
            const dx = pos.x - this._flexRigDrag.startX;
            const dy = pos.y - this._flexRigDrag.startY;
            const channel = this._flexRigDrag.channel;
            if (channel === 'angle') {
                const pointerRad = Math.atan2(
                    pos.y - this._flexRigDrag.jointY,
                    pos.x - this._flexRigDrag.jointX
                );
                const deltaRad = this._normalizeFlexRigAngleRadians(pointerRad - this._flexRigDrag.startPointerRad);
                entry.joint.angle = Math.max(-180, Math.min(180, this._flexRigDrag.startAngle + deltaRad * 180 / Math.PI));
            } else if (channel === 'tiltX') {
                entry.joint.tiltX = Math.max(-45, Math.min(45, this._flexRigDrag.startTiltX - dy * 0.35));
            } else if (channel === 'tiltY') {
                entry.joint.tiltY = Math.max(-45, Math.min(45, this._flexRigDrag.startTiltY + dx * 0.35));
            }
            this._afterFlexRigJointChange({ updateList: true, pushHistory: false });
            return true;
        }

        const hoverEntry = this._hitTestFlexRigHandle(pos);
        const hoverKey = hoverEntry?.key || null;
        if (hoverKey !== this._flexRigHoverKey) {
            this._flexRigHoverKey = hoverKey;
            this.stage.viewport.style.cursor = hoverKey ? 'grab' : 'crosshair';
            this.stage.requestRender();
        }
        return !!hoverKey;
    },

    _handleFlexRigMouseUp() {
        if (!this._flexRigMode || !this._flexRigDrag) return false;
        this._flexRigDrag = null;
        this.stage.viewport.style.cursor = this._flexRigHoverKey ? 'grab' : 'crosshair';
        this._updateFlexRigJointList();
        eventBus.emit('history:push');
        return true;
    },

    resetFlexRigJointValues() {
        const entries = this._getFlexRigEntries();
        if (!entries.length) return;
        entries.forEach(entry => {
            entry.joint.angle = 0;
            entry.joint.tiltX = 0;
            entry.joint.tiltY = 0;
        });
        this._afterFlexRigJointChange({ updateList: true, pushHistory: true });
        Utils.showToast('Flex Rig joint angle and Z tilt values reset', 'info');
    },

    renderFlexRigOverlay(ctx) {
        if (!this._flexRigMode) return;
        const entries = this._getFlexRigEntries();
        if (!entries.length) return;
        const zoom = Math.max(0.001, this.stage.zoom);
        const selectedKey = this._flexRigSelectedKey;
        const hoverKey = this._flexRigHoverKey;
        const channel = this._flexRigChannel || 'angle';

        ctx.save();
        ctx.font = `${Math.max(10, 11 / zoom)}px Inter, sans-serif`;
        ctx.textBaseline = 'middle';

        entries.forEach(entry => {
            const points = this._getFlexRigHandlePoints(entry, zoom);
            if (!points) return;
            const selected = entry.key === selectedKey;
            const hovered = entry.key === hoverKey;
            const r = (selected ? 7 : 5.5) / zoom;
            const handleR = 4.5 / zoom;
            const activeHandle = channel === 'angle' ? points.angleHandle : points.tiltHandle;
            const color = channel === 'angle' ? '#22c55e' : '#60a5fa';

            if (channel === 'angle' && points.angleGuide) {
                const guide = points.angleGuide;
                const guideAlpha = selected || hovered ? 0.72 : 0.25;
                const tickLength = (selected || hovered ? 7 : 4.5) / zoom;
                ctx.strokeStyle = `rgba(34,197,94,${guideAlpha})`;
                ctx.lineWidth = (selected || hovered ? 1.7 : 1) / zoom;
                ctx.beginPath();
                ctx.arc(points.joint.x, points.joint.y, guide.radius, 0, Math.PI * 2);
                ctx.stroke();

                [-90, -45, 0, 45, 90].forEach(deg => {
                    const tickRad = guide.baseRad + deg * Math.PI / 180;
                    const inner = guide.radius - tickLength;
                    const outer = guide.radius + tickLength * 0.65;
                    ctx.beginPath();
                    ctx.moveTo(
                        points.joint.x + Math.cos(tickRad) * inner,
                        points.joint.y + Math.sin(tickRad) * inner
                    );
                    ctx.lineTo(
                        points.joint.x + Math.cos(tickRad) * outer,
                        points.joint.y + Math.sin(tickRad) * outer
                    );
                    ctx.stroke();
                });

                if (selected || hovered) {
                    ctx.strokeStyle = 'rgba(226,232,240,0.45)';
                    ctx.lineWidth = 1 / zoom;
                    ctx.beginPath();
                    ctx.moveTo(points.joint.x, points.joint.y);
                    ctx.lineTo(
                        points.joint.x + Math.cos(guide.baseRad) * guide.radius,
                        points.joint.y + Math.sin(guide.baseRad) * guide.radius
                    );
                    ctx.stroke();
                }
            }

            ctx.strokeStyle = selected || hovered ? color : 'rgba(226,232,240,0.42)';
            ctx.lineWidth = (selected ? 2 : 1.4) / zoom;
            ctx.beginPath();
            ctx.moveTo(points.joint.x, points.joint.y);
            ctx.lineTo(activeHandle.x, activeHandle.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(activeHandle.x, activeHandle.y, handleR, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1 / zoom;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(points.joint.x, points.joint.y, r, 0, Math.PI * 2);
            ctx.fillStyle = selected ? '#f97316' : (hovered ? '#fb923c' : '#f59e0b');
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5 / zoom;
            ctx.stroke();

            if (selected || hovered) {
                const label = `${entry.jointLabel}  A:${Math.round(entry.joint.angle || 0)}  ZX:${Math.round(entry.joint.tiltX || 0)}  ZY:${Math.round(entry.joint.tiltY || 0)}`;
                const pad = 5 / zoom;
                const textWidth = ctx.measureText(label).width;
                const x = points.joint.x + 10 / zoom;
                const y = points.joint.y - 14 / zoom;
                ctx.fillStyle = 'rgba(15,23,42,0.86)';
                ctx.fillRect(x - pad, y - 8 / zoom, textWidth + pad * 2, 17 / zoom);
                ctx.fillStyle = '#e2e8f0';
                ctx.fillText(label, x, y);
            }
        });

        ctx.restore();
    }
});
