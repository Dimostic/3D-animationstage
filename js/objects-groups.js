/**
 * Object Manager — Groups, align, distribute, boolean ops
 * (split from objects.js for maintainability)
 */

Object.assign(ObjectManager.prototype, {


    /** Get the bounding box of an entire group */
    getGroupBounds(groupId) {
        const members = this.groups[groupId];
        if (!members || members.length === 0) return null;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        members.forEach(id => {
            const obj = this.getObjectById(id);
            if (!obj) return;
            const b = obj.getBounds();
            if (b.x < minX) minX = b.x;
            if (b.y < minY) minY = b.y;
            if (b.right > maxX) maxX = b.right;
            if (b.bottom > maxY) maxY = b.bottom;
        });
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY, right: maxX, bottom: maxY };
    },

    groupSelected() {
        if (this.selectedIds.length < 2) {
            Utils.showToast('Select at least 2 objects to group', 'warning');
            return;
        }
        const groupId = Utils.generateId('grp');
        this.groups[groupId] = [...this.selectedIds];
        this._groupCounter++;
        this.groupNames[groupId] = `Group ${this._groupCounter}`;

        // Mark objects as grouped (remove from old groups first)
        this.selectedIds.forEach(id => {
            const obj = this.getObjectById(id);
            if (obj) {
                // If already in another group, remove from that group
                if (obj.groupId && this.groups[obj.groupId]) {
                    const oldMembers = this.groups[obj.groupId];
                    const idx = oldMembers.indexOf(id);
                    if (idx !== -1) oldMembers.splice(idx, 1);
                    // Clean up empty groups
                    if (oldMembers.length < 2) {
                        oldMembers.forEach(mid => {
                            const m = this.getObjectById(mid);
                            if (m) m.groupId = null;
                        });
                        delete this.groups[obj.groupId];
                        delete this.groupNames[obj.groupId];
                    }
                }
                obj.groupId = groupId;
            }
        });

        Utils.showToast(`Grouped ${this.selectedIds.length} objects as "${this.groupNames[groupId]}"`, 'success');
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    ungroupSelected() {
        const selected = this.getSelectedObjects();
        let ungrouped = 0;

        // If in group edit mode, exit first
        if (this._groupEditMode) {
            this.exitGroupEditMode();
        }

        selected.forEach(obj => {
            if (obj.groupId && this.groups[obj.groupId]) {
                const groupId = obj.groupId;
                const members = this.groups[groupId];
                members.forEach(mid => {
                    const m = this.getObjectById(mid);
                    if (m) delete m.groupId;
                });
                delete this.groups[groupId];
                delete this.groupNames[groupId];
                ungrouped++;
            }
        });

        if (ungrouped > 0) {
            Utils.showToast(`Ungrouped ${ungrouped} group(s)`, 'success');
            this.updateObjectList();
            this.stage.requestRender();
            eventBus.emit('history:push');
        } else {
            Utils.showToast('No groups to ungroup', 'info');
        }
    },

    /** Single-click on grouped object: select the entire group */
    selectWithGroup(objId) {
        const obj = this.getObjectById(objId);
        if (obj && obj.groupId && this.groups[obj.groupId]) {
            // If we're in group edit mode for THIS group, select just this object
            if (this._groupEditMode === obj.groupId) {
                this.select([objId]);
                this.selectionAnchorId = objId;
                return;
            }
            // Otherwise select the whole group
            this.select(this.groups[obj.groupId]);
            this.selectionAnchorId = objId;
        } else {
            this.select([objId]);
            this.selectionAnchorId = objId;
        }
    },

    /** Double-click to enter group edit mode (sub-select individual objects) */
    enterGroupEditMode(groupId) {
        if (!this.groups[groupId]) return;
        this._groupEditMode = groupId;
        this._groupEditSavedSelection = [...this.selectedIds];
        // Select just the first member to show we're in edit mode
        this.select([this.groups[groupId][0]]);
        this.stage.requestRender();
        Utils.showToast('Editing group — click objects to select individually', 'info');
    },

    /** Click outside group or press Escape: exit group edit mode */
    exitGroupEditMode() {
        if (!this._groupEditMode) return;
        const groupId = this._groupEditMode;
        this._groupEditMode = null;
        // Re-select the whole group
        if (this.groups[groupId]) {
            this.select(this.groups[groupId]);
        }
        this.stage.requestRender();
    },

    /** Check if a point is inside any member of the group currently being edited */
    _hitTestGroupMember(pos) {
        if (!this._groupEditMode || !this.groups[this._groupEditMode]) return null;
        const members = this.groups[this._groupEditMode];
        // Iterate in reverse (top-most first)
        for (let i = members.length - 1; i >= 0; i--) {
            const obj = this.getObjectById(members[i]);
            if (obj && obj.visible !== false && !obj.locked) {
                const b = obj.getBounds();
                if (pos.x >= b.x && pos.x <= b.right && pos.y >= b.y && pos.y <= b.bottom) {
                    return obj;
                }
            }
        }
        return null;
    },

    /** Align objects within a group (or selected objects) */
    alignGroupObjects(align) {
        let targets;
        if (this._groupEditMode && this.groups[this._groupEditMode]) {
            // In group edit mode: align all members of the group
            targets = this.groups[this._groupEditMode]
                .map(id => this.getObjectById(id))
                .filter(Boolean);
        } else {
            targets = this.getSelectedObjects();
        }
        if (!targets || targets.length < 2) return;

        const moveObj = (obj, newX, newY) => {
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                const dx = newX - obj.x, dy = newY - obj.y;
                if (dx !== 0 || dy !== 0) { obj.pathPoints.forEach(p => { p.x += dx; p.y += dy; }); }
            }
            obj.x = newX; obj.y = newY;
        };

        const bounds = targets.map(o => o.getBounds());
        const minX = Math.min(...bounds.map(b => b.x));
        const maxRight = Math.max(...bounds.map(b => b.right));
        const minY = Math.min(...bounds.map(b => b.y));
        const maxBottom = Math.max(...bounds.map(b => b.bottom));

        switch (align) {
            case 'left':
                targets.forEach(o => moveObj(o, minX, o.y));
                break;
            case 'right':
                targets.forEach(o => moveObj(o, maxRight - o.width, o.y));
                break;
            case 'center-h': {
                const centerX = (minX + maxRight) / 2;
                targets.forEach(o => moveObj(o, centerX - o.width / 2, o.y));
                break;
            }
            case 'top':
                targets.forEach(o => moveObj(o, o.x, minY));
                break;
            case 'bottom':
                targets.forEach(o => moveObj(o, o.x, maxBottom - o.height));
                break;
            case 'center-v': {
                const centerY = (minY + maxBottom) / 2;
                targets.forEach(o => moveObj(o, o.x, centerY - o.height / 2));
                break;
            }
            case 'distribute-h': {
                if (targets.length < 2) return;
                const userGapH = parseFloat(document.getElementById('distribute-gap')?.value) || 20;
                const sortedH = [...targets].sort((a, b) => a.x - b.x);
                const totalW = sortedH.reduce((s, o) => s + o.width, 0);
                const availableW = maxRight - minX;
                const autoGapH = (availableW - totalW) / (targets.length - 1);
                const gapH = (targets.length > 2 && autoGapH > 1) ? autoGapH : userGapH;
                const totalSpan = totalW + gapH * (targets.length - 1);
                const midX = (minX + maxRight) / 2;
                let currentX = midX - totalSpan / 2;
                sortedH.forEach(o => {
                    moveObj(o, currentX, o.y);
                    currentX += o.width + gapH;
                });
                break;
            }
            case 'distribute-v': {
                if (targets.length < 2) return;
                const userGapV = parseFloat(document.getElementById('distribute-gap')?.value) || 20;
                const sortedV = [...targets].sort((a, b) => a.y - b.y);
                const totalH = sortedV.reduce((s, o) => s + o.height, 0);
                const availableH = maxBottom - minY;
                const autoGapV = (availableH - totalH) / (targets.length - 1);
                const gapV = (targets.length > 2 && autoGapV > 1) ? autoGapV : userGapV;
                const totalSpanV = totalH + gapV * (targets.length - 1);
                const midY = (minY + maxBottom) / 2;
                let currentY = midY - totalSpanV / 2;
                sortedV.forEach(o => {
                    moveObj(o, o.x, currentY);
                    currentY += o.height + gapV;
                });
                break;
            }
        }
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    /** Resize entire group proportionally */
    resizeGroup(groupId, scaleX, scaleY, anchorX, anchorY) {
        const members = this.groups[groupId];
        if (!members) return;
        members.forEach(id => {
            const obj = this.getObjectById(id);
            if (!obj) return;
            // Scale position relative to anchor
            const newX = anchorX + (obj.x - anchorX) * scaleX;
            const newY = anchorY + (obj.y - anchorY) * scaleY;
            // Scale pathPoints relative to anchor for path-based objects
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                obj.pathPoints.forEach(p => {
                    p.x = anchorX + (p.x - anchorX) * scaleX;
                    p.y = anchorY + (p.y - anchorY) * scaleY;
                });
            }
            obj.x = newX;
            obj.y = newY;
            // Scale dimensions
            obj.width = Math.max(5, obj.width * scaleX);
            obj.height = Math.max(5, obj.height * scaleY);
            if (Number.isFinite(obj.pinOffsetX)) obj.pinOffsetX *= scaleX;
            if (Number.isFinite(obj.pinOffsetY)) obj.pinOffsetY *= scaleY;
            if (Number.isFinite(obj._facialBasePinOffsetX)) obj._facialBasePinOffsetX *= scaleX;
            if (Number.isFinite(obj._facialBasePinOffsetY)) obj._facialBasePinOffsetY *= scaleY;
            if (obj._facialLocalRect) {
                const rect = obj._facialLocalRect;
                if (Number.isFinite(rect.x)) rect.x *= scaleX;
                if (Number.isFinite(rect.y)) rect.y *= scaleY;
                if (Number.isFinite(rect.w)) rect.w *= scaleX;
                if (Number.isFinite(rect.h)) rect.h *= scaleY;
            }
        });
        if (typeof this._resolvePins === 'function') this._resolvePins();
    },

    /** Move entire group by delta */
    moveGroup(groupId, dx, dy) {
        const members = this.groups[groupId];
        if (!members) return;
        members.forEach(id => {
            const obj = this.getObjectById(id);
            if (obj) {
                obj.x += dx;
                obj.y += dy;
                // Also translate pathPoints for path-based objects
                if (obj.pathPoints && obj.pathPoints.length > 0) {
                    obj.pathPoints.forEach(p => { p.x += dx; p.y += dy; });
                }
            }
        });
    },

    /** Rotate entire group around its center */
    rotateGroup(groupId, angleDeg) {
        const bounds = this.getGroupBounds(groupId);
        if (!bounds) return;
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        const rad = Utils.degToRad(angleDeg);
        const members = this.groups[groupId];
        members.forEach(id => {
            const obj = this.getObjectById(id);
            if (!obj) return;
            // Rotate object's center around group center
            const ocx = obj.x + obj.width / 2;
            const ocy = obj.y + obj.height / 2;
            const dx = ocx - cx;
            const dy = ocy - cy;
            const newCx = cx + dx * Math.cos(rad) - dy * Math.sin(rad);
            const newCy = cy + dx * Math.sin(rad) + dy * Math.cos(rad);
            const newX = newCx - obj.width / 2;
            const newY = newCy - obj.height / 2;
            // Translate pathPoints to follow repositioned object (rotation handled by renderer)
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                const translateX = newX - obj.x;
                const translateY = newY - obj.y;
                obj.pathPoints.forEach(p => { p.x += translateX; p.y += translateY; });
            }
            obj.x = newX;
            obj.y = newY;
            // Also rotate the object itself
            obj.rotation = (obj.rotation || 0) + angleDeg;
        });
    },

    /** Flip group horizontally around group center */
    flipGroupH(groupId) {
        const bounds = this.getGroupBounds(groupId);
        if (!bounds) return;
        const cx = bounds.x + bounds.width / 2;
        this.groups[groupId].forEach(id => {
            const obj = this.getObjectById(id);
            if (!obj) return;
            const newX = cx - (obj.x + obj.width - cx);
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                const translateX = newX - obj.x;
                obj.pathPoints.forEach(p => { p.x += translateX; });
            }
            obj.x = newX;
            obj.scaleX = (obj.scaleX || 1) * -1;
        });
    },

    /** Flip group vertically around group center */
    flipGroupV(groupId) {
        const bounds = this.getGroupBounds(groupId);
        if (!bounds) return;
        const cy = bounds.y + bounds.height / 2;
        this.groups[groupId].forEach(id => {
            const obj = this.getObjectById(id);
            if (!obj) return;
            const newY = cy - (obj.y + obj.height - cy);
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                const translateY = newY - obj.y;
                obj.pathPoints.forEach(p => { p.y += translateY; });
            }
            obj.y = newY;
            obj.scaleY = (obj.scaleY || 1) * -1;
        });
    },

    handleResize(pos, shiftKey = false, altKey = false) {
        // Group resize
        if (this._groupResizing && this.resizeStart.members) {
            this._handleGroupResize(pos, shiftKey, altKey);
            return;
        }

        const obj = this.getSelectedObjects()[0];
        if (!obj) return;
        
        const start = this.resizeStart;
        let dx = pos.x - start.x;
        let dy = pos.y - start.y;
        const original = start.obj;

        // Rotate mouse delta into object's local coordinate space
        const rotation = original.rotation || 0;
        if (rotation !== 0) {
            const rad = -Utils.degToRad(rotation);
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);
            const ldx = dx * cos - dy * sin;
            const ldy = dx * sin + dy * cos;
            dx = ldx;
            dy = ldy;
        }

        // Line-type objects allow negative/zero dimensions (encoding direction)
        const isLineType = ['line','arrow','doubleArrow','curvedArrow'].includes(obj.type);
        const isImageCornerHandle = obj.type === 'image' && ['nw', 'ne', 'sw', 'se'].includes(this.resizeHandle);
        // Image corner handles default to uniform scaling to prevent accidental
        // aspect-ratio drift that would crop top/bottom via cover-fit rendering.
        const keepAspect = !isLineType && (
            shiftKey
            || (StageObject.supportsAspectLockType(obj.type) && obj.lockAspectRatio)
            || (isImageCornerHandle && !altKey)
        );

        if (isLineType) {
            // For line-type objects, resize moves the endpoint directly
            switch (this.resizeHandle) {
                case 'se': case 'e': case 's':
                    obj.width = original.width + dx;
                    obj.height = original.height + dy;
                    if (this.resizeHandle === 'e') obj.height = original.height;
                    if (this.resizeHandle === 's') obj.width = original.width;
                    break;
                case 'nw': case 'w': case 'n':
                    obj.x = original.x + dx;
                    obj.y = original.y + dy;
                    obj.width = original.width - dx;
                    obj.height = original.height - dy;
                    if (this.resizeHandle === 'w') { obj.y = original.y; obj.height = original.height; }
                    if (this.resizeHandle === 'n') { obj.x = original.x; obj.width = original.width; }
                    break;
                case 'ne':
                    obj.y = original.y + dy;
                    obj.width = original.width + dx;
                    obj.height = original.height - dy;
                    break;
                case 'sw':
                    obj.x = original.x + dx;
                    obj.width = original.width - dx;
                    obj.height = original.height + dy;
                    break;
            }
        } else {
        // Calculate new dimensions from local-space deltas
        let newW = original.width, newH = original.height;
        switch (this.resizeHandle) {
            case 'se':
                newW = Math.max(10, original.width + dx);
                newH = Math.max(10, original.height + dy);
                break;
            case 'sw':
                newW = Math.max(10, original.width - dx);
                newH = Math.max(10, original.height + dy);
                break;
            case 'ne':
                newW = Math.max(10, original.width + dx);
                newH = Math.max(10, original.height - dy);
                break;
            case 'nw':
                newW = Math.max(10, original.width - dx);
                newH = Math.max(10, original.height - dy);
                break;
            case 'n':
                newH = Math.max(10, original.height - dy);
                break;
            case 's':
                newH = Math.max(10, original.height + dy);
                break;
            case 'e':
                newW = Math.max(10, original.width + dx);
                break;
            case 'w':
                newW = Math.max(10, original.width - dx);
                break;
        }

        if (keepAspect && original.width > 0 && original.height > 0) {
            const minScale = Math.max(10 / original.width, 10 / original.height);
            const widthScale = newW / original.width;
            const heightScale = newH / original.height;
            let uniformScale;
            if (this.resizeHandle === 'e' || this.resizeHandle === 'w') {
                uniformScale = widthScale;
            } else if (this.resizeHandle === 'n' || this.resizeHandle === 's') {
                uniformScale = heightScale;
            } else {
                uniformScale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;
            }
            uniformScale = Math.max(minScale, uniformScale);
            newW = Math.max(10, original.width * uniformScale);
            newH = Math.max(10, original.height * uniformScale);
        }

        obj.width = newW;
        obj.height = newH;

        if (rotation !== 0) {
            // For rotated objects, analytically solve for position so the
            // anchor corner (opposite the dragged handle) stays fixed in world space.
            const anchorNorm = {
                se: [0, 0], nw: [1, 1], ne: [0, 1], sw: [1, 0],
                n: [0.5, 1], s: [0.5, 0], e: [0, 0.5], w: [1, 0.5]
            };
            const [ax, ay] = anchorNorm[this.resizeHandle];
            const pvX = original.pivotX ?? 0.5;
            const pvY = original.pivotY ?? 0.5;
            const rad = Utils.degToRad(rotation);
            const cos = Math.cos(rad), sin = Math.sin(rad);

            // Anchor's world position before resize
            const oPx = original.x + original.width * pvX;
            const oPy = original.y + original.height * pvY;
            const oArelX = original.x + original.width * ax - oPx;
            const oArelY = original.y + original.height * ay - oPy;
            const anchorWx = oPx + oArelX * cos - oArelY * sin;
            const anchorWy = oPy + oArelX * sin + oArelY * cos;

            // Solve: find (obj.x, obj.y) so that the anchor maps to the same world pos
            obj.x = anchorWx - newW * (pvX + (ax - pvX) * cos) + newH * (ay - pvY) * sin;
            obj.y = anchorWy - newW * (ax - pvX) * sin - newH * (pvY + (ay - pvY) * cos);
        } else {
            // Non-rotated: anchor stays fixed via simple offset
            switch (this.resizeHandle) {
                case 'nw':
                    obj.x = original.x + original.width - newW;
                    obj.y = original.y + original.height - newH;
                    break;
                case 'ne':
                    obj.y = original.y + original.height - newH;
                    break;
                case 'sw':
                    obj.x = original.x + original.width - newW;
                    break;
                case 'n':
                    obj.y = original.y + original.height - newH;
                    if (keepAspect) obj.x = original.x + (original.width - newW) / 2;
                    break;
                case 'w':
                    obj.x = original.x + original.width - newW;
                    if (keepAspect) obj.y = original.y + (original.height - newH) / 2;
                    break;
                case 's':
                    if (keepAspect) obj.x = original.x + (original.width - newW) / 2;
                    break;
                case 'e':
                    if (keepAspect) obj.y = original.y + (original.height - newH) / 2;
                    break;
                // se, s, e: position unchanged
            }
        }
        }

        if (this.stage.snapEnabled) {
            const snapped = this.stage.snapPosition(obj.x, obj.y);
            obj.x = snapped.x;
            obj.y = snapped.y;
            obj.width = Utils.snapToGrid(obj.width, this.stage.gridSize);
            obj.height = Utils.snapToGrid(obj.height, this.stage.gridSize);
        }

        // Scale pathPoints for freeform/path/scribble objects to match new bounds
        if (obj.pathPoints && obj.pathPoints.length > 0 && original.pathPoints && original.width && original.height) {
            const sx = obj.width / original.width;
            const sy = obj.height / original.height;
            for (let i = 0; i < obj.pathPoints.length && i < original.pathPoints.length; i++) {
                obj.pathPoints[i].x = obj.x + (original.pathPoints[i].x - original.x) * sx;
                obj.pathPoints[i].y = obj.y + (original.pathPoints[i].y - original.y) * sy;
            }
        }

        this.updateProperties();
        this.stage.requestRender();
    },

    handleDepthAdjust(pos, shiftKey = false) {
        const data = this._depthAdjustData;
        if (!data) return;
        const obj = this.getObjectById(data.objId);
        if (!obj) return;

        const deltaX = pos.x - data.startPos.x;
        const deltaY = pos.y - data.startPos.y;
        let nextDepth = data.startDepth + deltaX * data.dir.x + deltaY * data.dir.y;
        nextDepth = Utils.clamp(nextDepth, -400, 400);
        if (shiftKey) nextDepth = Math.round(nextDepth / 10) * 10;
        if (Math.abs(nextDepth) < 0.5) nextDepth = 0;
        obj.depth = Math.round(nextDepth * 10) / 10;

        const coordsEl = document.getElementById('mouse-coordinates');
        if (coordsEl) coordsEl.textContent = `Depth ${obj.depth.toFixed(1)}`;
        this.updateProperties();
        this.stage.requestRender();
    },

    /** Resize all group members relative to the active handle. Corner handles keep aspect by default; Alt allows free stretch. */
    _handleGroupResize(pos, shiftKey = false, altKey = false) {
        const start = this.resizeStart;
        const ob = start.bounds;  // original group bounds
        const dx = pos.x - start.x;
        const dy = pos.y - start.y;
        const handle = this.resizeHandle;
        const MIN = 20; // minimum group dimension

        // Compute new group bounds based on which handle is dragged
        let newX = ob.x, newY = ob.y, newW = ob.width, newH = ob.height;
        switch (handle) {
            case 'se': newW = Math.max(MIN, ob.width + dx); newH = Math.max(MIN, ob.height + dy); break;
            case 'e':  newW = Math.max(MIN, ob.width + dx); break;
            case 's':  newH = Math.max(MIN, ob.height + dy); break;
            case 'nw':
                newX = Math.min(ob.x + ob.width - MIN, ob.x + dx);
                newY = Math.min(ob.y + ob.height - MIN, ob.y + dy);
                newW = Math.max(MIN, ob.width - dx);
                newH = Math.max(MIN, ob.height - dy);
                break;
            case 'n':
                newY = Math.min(ob.y + ob.height - MIN, ob.y + dy);
                newH = Math.max(MIN, ob.height - dy);
                break;
            case 'w':
                newX = Math.min(ob.x + ob.width - MIN, ob.x + dx);
                newW = Math.max(MIN, ob.width - dx);
                break;
            case 'ne':
                newY = Math.min(ob.y + ob.height - MIN, ob.y + dy);
                newW = Math.max(MIN, ob.width + dx);
                newH = Math.max(MIN, ob.height - dy);
                break;
            case 'sw':
                newX = Math.min(ob.x + ob.width - MIN, ob.x + dx);
                newW = Math.max(MIN, ob.width - dx);
                newH = Math.max(MIN, ob.height + dy);
                break;
        }

        const cornerHandle = ['nw', 'ne', 'sw', 'se'].includes(handle);
        const keepAspect = (cornerHandle && !altKey) || shiftKey;
        if (keepAspect && ob.width > 0 && ob.height > 0) {
            const minScale = Math.max(MIN / ob.width, MIN / ob.height);
            const widthScale = newW / ob.width;
            const heightScale = newH / ob.height;
            let uniformScale;
            if (handle === 'e' || handle === 'w') {
                uniformScale = widthScale;
            } else if (handle === 'n' || handle === 's') {
                uniformScale = heightScale;
            } else {
                uniformScale = Math.abs(widthScale - 1) >= Math.abs(heightScale - 1) ? widthScale : heightScale;
            }
            uniformScale = Math.max(minScale, uniformScale);
            newW = Math.max(MIN, ob.width * uniformScale);
            newH = Math.max(MIN, ob.height * uniformScale);

            switch (handle) {
                case 'nw':
                    newX = ob.x + ob.width - newW;
                    newY = ob.y + ob.height - newH;
                    break;
                case 'ne':
                    newX = ob.x;
                    newY = ob.y + ob.height - newH;
                    break;
                case 'sw':
                    newX = ob.x + ob.width - newW;
                    newY = ob.y;
                    break;
                case 'n':
                    newX = ob.x + (ob.width - newW) / 2;
                    newY = ob.y + ob.height - newH;
                    break;
                case 's':
                    newX = ob.x + (ob.width - newW) / 2;
                    newY = ob.y;
                    break;
                case 'w':
                    newX = ob.x + ob.width - newW;
                    newY = ob.y + (ob.height - newH) / 2;
                    break;
                case 'e':
                    newX = ob.x;
                    newY = ob.y + (ob.height - newH) / 2;
                    break;
                default:
                    newX = ob.x;
                    newY = ob.y;
                    break;
            }
        }

        const scaleX = newW / ob.width;
        const scaleY = newH / ob.height;
        const scaleUniform = Math.min(Math.abs(scaleX), Math.abs(scaleY));

        start.members.forEach(({ id, obj: orig }) => {
            const obj = this.getObjectById(id);
            if (!obj || obj.locked) return;

            // Reposition relative to new anchor
            obj.x = newX + (orig.x - ob.x) * scaleX;
            obj.y = newY + (orig.y - ob.y) * scaleY;
            obj.width = Math.max(5, orig.width * scaleX);
            obj.height = Math.max(5, orig.height * scaleY);

            // Scale proportional properties
            if (orig.fontSize) obj.fontSize = Math.max(4, Math.round(orig.fontSize * scaleUniform));
            if (orig.borderRadius) obj.borderRadius = Math.max(0, Math.round(orig.borderRadius * scaleUniform));
            if (Number.isFinite(orig.strokeWidth)) obj.strokeWidth = Math.max(0, orig.strokeWidth * scaleUniform);
            if (Number.isFinite(orig.outlineWidth)) obj.outlineWidth = Math.max(0, orig.outlineWidth * scaleUniform);
            if (Number.isFinite(orig.shadowBlur)) obj.shadowBlur = Math.max(0, orig.shadowBlur * scaleUniform);
            if (Number.isFinite(orig.shadowOffsetX)) obj.shadowOffsetX = orig.shadowOffsetX * scaleX;
            if (Number.isFinite(orig.shadowOffsetY)) obj.shadowOffsetY = orig.shadowOffsetY * scaleY;
            if (Number.isFinite(orig.pinOffsetX)) obj.pinOffsetX = orig.pinOffsetX * scaleX;
            if (Number.isFinite(orig.pinOffsetY)) obj.pinOffsetY = orig.pinOffsetY * scaleY;
            if (Number.isFinite(orig._facialBasePinOffsetX)) obj._facialBasePinOffsetX = orig._facialBasePinOffsetX * scaleX;
            if (Number.isFinite(orig._facialBasePinOffsetY)) obj._facialBasePinOffsetY = orig._facialBasePinOffsetY * scaleY;
            if (orig._facialLocalRect) {
                obj._facialLocalRect = { ...orig._facialLocalRect };
                if (Number.isFinite(orig._facialLocalRect.x)) obj._facialLocalRect.x = orig._facialLocalRect.x * scaleX;
                if (Number.isFinite(orig._facialLocalRect.y)) obj._facialLocalRect.y = orig._facialLocalRect.y * scaleY;
                if (Number.isFinite(orig._facialLocalRect.w)) obj._facialLocalRect.w = orig._facialLocalRect.w * scaleX;
                if (Number.isFinite(orig._facialLocalRect.h)) obj._facialLocalRect.h = orig._facialLocalRect.h * scaleY;
            }

            // Scale pathPoints for freeform/path objects
            if (obj.pathPoints && obj.pathPoints.length > 0 && orig.pathPoints && orig.width && orig.height) {
                const sx = obj.width / orig.width;
                const sy = obj.height / orig.height;
                for (let i = 0; i < obj.pathPoints.length && i < orig.pathPoints.length; i++) {
                    obj.pathPoints[i].x = obj.x + (orig.pathPoints[i].x - orig.x) * sx;
                    obj.pathPoints[i].y = obj.y + (orig.pathPoints[i].y - orig.y) * sy;
                }
            }
        });

        if (this.stage.snapEnabled) {
            // Snap the group bounds, not individual objects
            const snappedX = Utils.snapToGrid(newX, this.stage.gridSize);
            const snappedY = Utils.snapToGrid(newY, this.stage.gridSize);
            const offsetX = snappedX - newX;
            const offsetY = snappedY - newY;
            if (offsetX || offsetY) {
                start.members.forEach(({ id }) => {
                    const obj = this.getObjectById(id);
                    if (obj && !obj.locked) {
                        if (obj.pathPoints && obj.pathPoints.length > 0) {
                            obj.pathPoints.forEach(p => { p.x += offsetX; p.y += offsetY; });
                        }
                        obj.x += offsetX; obj.y += offsetY;
                    }
                });
            }
        }

        if (typeof this._resolvePins === 'function') this._resolvePins();
        this.updateProperties();
        this.stage.requestRender();
    },

    getResizeHandle(pos) {
        // Single object resize
        if (this.selectedIds.length === 1) {
            const obj = this.getSelectedObjects()[0];
            if (!obj) return null;
            const handles = this.getHandlePositions(obj);
            const threshold = 8 / this.stage.zoom;
            for (const [name, hpos] of Object.entries(handles)) {
                if (Utils.distance(pos.x, pos.y, hpos.x, hpos.y) < threshold) return name;
            }
            return null;
        }
        // Group resize — check if all selected form a complete group
        const groupId = this._getSelectedGroupId();
        if (!groupId) return null;
        const bounds = this.getGroupBounds(groupId);
        if (!bounds) return null;
        const handles = this._getGroupHandlePositions(bounds);
        const threshold = 8 / this.stage.zoom;
        for (const [name, hpos] of Object.entries(handles)) {
            if (Utils.distance(pos.x, pos.y, hpos.x, hpos.y) < threshold) return name;
        }
        return null;
    },

    /** Check if all selected objects belong to the same, complete group */
    _getSelectedGroupId() {
        if (this.selectedIds.length < 2) return null;
        const first = this.getObjectById(this.selectedIds[0]);
        if (!first || !first.groupId) return null;
        const gid = first.groupId;
        const members = this.groups[gid];
        if (!members) return null;
        // All selected must share the same groupId
        for (const id of this.selectedIds) {
            const obj = this.getObjectById(id);
            if (!obj || obj.groupId !== gid) return null;
        }
        // All group members must be selected
        if (members.length !== this.selectedIds.length) return null;
        for (const mid of members) {
            if (!this.selectedIds.includes(mid)) return null;
        }
        return gid;
    },

    /** Get resize handle positions for a group bounding box */
    _getGroupHandlePositions(bounds) {
        const { x, y, width, height } = bounds;
        return {
            nw: { x, y },
            n:  { x: x + width / 2, y },
            ne: { x: x + width, y },
            e:  { x: x + width, y: y + height / 2 },
            se: { x: x + width, y: y + height },
            s:  { x: x + width / 2, y: y + height },
            sw: { x, y: y + height },
            w:  { x, y: y + height / 2 }
        };
    },

    _getGroupRotationHandlePositions(bounds) {
        const { x, y, width, height } = bounds;
        const offset = 20 / this.stage.zoom;
        return {
            nw: { x: x - offset, y: y - offset },
            ne: { x: x + width + offset, y: y - offset },
            se: { x: x + width + offset, y: y + height + offset },
            sw: { x: x - offset, y: y + height + offset }
        };
    },

    getHandlePositions(obj) {
        const extrusion = obj.getDepthExtrusionGeometry?.();
        if (extrusion) {
            const { x, y, width, height } = obj.getBounds();
            return {
                nw: { x, y },
                n: { x: x + width / 2, y },
                ne: { x: x + width, y },
                e: { x: x + width, y: y + height / 2 },
                se: { x: x + width, y: y + height },
                s: { x: x + width / 2, y: y + height },
                sw: { x, y: y + height },
                w: { x, y: y + height / 2 }
            };
        }
        if (obj._hasDisplayRectTransform?.()) {
            const points = obj.getTransformedRectPoints();
            const mids = StageObject.getRectMidpoints(points);
            return {
                nw: points[0],
                n: mids.n,
                ne: points[1],
                e: mids.e,
                se: points[2],
                s: mids.s,
                sw: points[3],
                w: mids.w
            };
        }

        const { x, y, width, height } = obj;
        const corners = {
            nw: { x, y },
            n:  { x: x + width / 2, y },
            ne: { x: x + width, y },
            e:  { x: x + width, y: y + height / 2 },
            se: { x: x + width, y: y + height },
            s:  { x: x + width / 2, y: y + height },
            sw: { x, y: y + height },
            w:  { x, y: y + height / 2 }
        };

        // If the object is rotated, rotate handle positions around the pivot point
        if (obj.rotation) {
            const px = x + width * (obj.pivotX ?? 0.5);
            const py = y + height * (obj.pivotY ?? 0.5);
            const rad = Utils.degToRad(obj.rotation);
            const cos = Math.cos(rad), sin = Math.sin(rad);
            for (const key of Object.keys(corners)) {
                const h = corners[key];
                const dx = h.x - px;
                const dy = h.y - py;
                corners[key] = {
                    x: px + dx * cos - dy * sin,
                    y: py + dx * sin + dy * cos
                };
            }
        }

        return corners;
    },

    getRotationHandlePositions(obj) {
        const extrusion = obj.getDepthExtrusionGeometry?.();
        if (extrusion) {
            const { x, y, width, height } = obj.getBounds();
            const offset = 20 / this.stage.zoom;
            return {
                nw: { x: x - offset, y: y - offset },
                ne: { x: x + width + offset, y: y - offset },
                se: { x: x + width + offset, y: y + height + offset },
                sw: { x: x - offset, y: y + height + offset }
            };
        }
        if (obj._hasDisplayRectTransform?.()) {
            const points = obj.getTransformedRectPoints();
            const bounds = obj.getBounds();
            const center = { x: bounds.centerX, y: bounds.centerY };
            const offset = 20 / this.stage.zoom;
            return {
                nw: this._offsetRotationHandle(points[0], center, offset),
                ne: this._offsetRotationHandle(points[1], center, offset),
                se: this._offsetRotationHandle(points[2], center, offset),
                sw: this._offsetRotationHandle(points[3], center, offset)
            };
        }

        const { x, y, width, height } = obj;
        const offset = 20 / this.stage.zoom; // distance outside the bounding box
        const raw = {
            nw: { x: x - offset, y: y - offset },
            ne: { x: x + width + offset, y: y - offset },
            se: { x: x + width + offset, y: y + height + offset },
            sw: { x: x - offset, y: y + height + offset }
        };

        // Rotate positions around the pivot point
        if (obj.rotation) {
            const px = x + width * (obj.pivotX ?? 0.5);
            const py = y + height * (obj.pivotY ?? 0.5);
            const rad = Utils.degToRad(obj.rotation);
            const cos = Math.cos(rad), sin = Math.sin(rad);
            for (const key of Object.keys(raw)) {
                const h = raw[key];
                const dx = h.x - px;
                const dy = h.y - py;
                raw[key] = {
                    x: px + dx * cos - dy * sin,
                    y: py + dx * sin + dy * cos
                };
            }
        }

        return raw;
    },

    _offsetRotationHandle(point, center, offset) {
        const dx = point.x - center.x;
        const dy = point.y - center.y;
        const length = Math.hypot(dx, dy) || 1;
        return {
            x: point.x + (dx / length) * offset,
            y: point.y + (dy / length) * offset
        };
    },

    getDepthHandleInfo(obj) {
        if (!obj || !StageObject.supportsDepthExtrusionType(obj) && !StageObject.supportsDepthScaleType(obj.type)) {
            return null;
        }
        if (!obj.showDepthHandle) {
            return null;
        }
        if ((obj.joints && obj.joints.length > 0) || (obj.flexEnabled && obj.flexPins && obj.flexPins.length > 0)) {
            return null;
        }

        const dir = obj.getDepthHandleDirection();
        const front = obj.getDepthFrontDisplayPolygon();
        if (!front || front.length < 1) return null;

        let anchor = front[0];
        let bestScore = -Infinity;
        front.forEach(point => {
            const score = point.x * dir.x + point.y * dir.y;
            if (score > bestScore) {
                bestScore = score;
                anchor = point;
            }
        });

        const distance = Math.max(18 / this.stage.zoom, Math.abs(obj.getDepthValue()));
        return {
            obj,
            dir,
            anchor,
            handle: {
                x: anchor.x + dir.x * distance,
                y: anchor.y + dir.y * distance
            }
        };
    },

    getDepthHandle(pos) {
        if (this.selectedIds.length !== 1) return null;
        const obj = this.getSelectedObjects()[0];
        const info = this.getDepthHandleInfo(obj);
        if (!info) return null;
        const threshold = 9 / this.stage.zoom;
        return Utils.distance(pos.x, pos.y, info.handle.x, info.handle.y) < threshold ? info : null;
    },

    getRotationHandle(pos) {
        const threshold = 10 / this.stage.zoom;

        // Single object rotation handles
        if (this.selectedIds.length === 1) {
            const obj = this.getSelectedObjects()[0];
            if (!obj) return null;
            const handles = this.getRotationHandlePositions(obj);
            for (const [name, hpos] of Object.entries(handles)) {
                if (Utils.distance(pos.x, pos.y, hpos.x, hpos.y) < threshold) {
                    return name;
                }
            }
            return null;
        }

        // Group rotation handles
        const groupId = this._getSelectedGroupId();
        if (groupId && this._groupEditMode !== groupId) {
            const bounds = this.getGroupBounds(groupId);
            if (!bounds) return null;
            const gHandles = this._getGroupRotationHandlePositions(bounds);
            for (const [name, hpos] of Object.entries(gHandles)) {
                if (Utils.distance(pos.x, pos.y, hpos.x, hpos.y) < threshold) {
                    return 'group_' + name;
                }
            }
        }
        return null;
    },

    handleRotation(pos, shiftKey) {
        // Group rotation
        if (this._groupRotating && this._groupRotateData) {
            const data = this._groupRotateData;
            const currentAngle = Math.atan2(pos.y - data.centerY, pos.x - data.centerX);
            let deltaDeg = Utils.radToDeg(currentAngle - this.rotateStartAngle);
            if (shiftKey) deltaDeg = Math.round(deltaDeg / 15) * 15;

            // Restore all members to original state and apply rotation
            const rad = Utils.degToRad(deltaDeg);
            const cos = Math.cos(rad), sin = Math.sin(rad);
            data.originals.forEach(orig => {
                const obj = this.getObjectById(orig.id);
                if (!obj) return;
                // Rotate object center around group center
                const dx = orig.cx - data.centerX;
                const dy = orig.cy - data.centerY;
                const newCx = data.centerX + dx * cos - dy * sin;
                const newCy = data.centerY + dx * sin + dy * cos;
                obj.x = newCx - orig.hw;
                obj.y = newCy - orig.hh;
                obj.rotation = orig.rotation + deltaDeg;
                // Normalise to -180..180
                obj.rotation = ((obj.rotation % 360) + 360) % 360;
                if (obj.rotation > 180) obj.rotation -= 360;
                obj.rotation = Math.round(obj.rotation * 10) / 10;
                // Translate pathPoints to follow repositioned object (rotation handled by renderer ctx.rotate)
                if (orig.pathPoints && obj.pathPoints) {
                    const origX = orig.cx - orig.hw;
                    const origY = orig.cy - orig.hh;
                    const translateX = obj.x - origX;
                    const translateY = obj.y - origY;
                    obj.pathPoints = orig.pathPoints.map(p => ({
                        ...p,
                        x: p.x + translateX,
                        y: p.y + translateY
                    }));
                }
            });

            const displayAngle = Math.round(deltaDeg * 10) / 10;
            const coordsEl = document.getElementById('mouse-coordinates');
            if (coordsEl) {
                coordsEl.textContent = `Group ⟳ ${displayAngle}°`;
            }
            this.updateProperties();
            this.stage.requestRender();
            return;
        }

        // Single object rotation
        const obj = this.getSelectedObjects()[0];
        if (!obj) return;

        const pivot = obj.getPivotPoint();
        const currentAngle = Math.atan2(pos.y - pivot.y, pos.x - pivot.x);
        let delta = Utils.radToDeg(currentAngle - this.rotateStartAngle);

        let newRotation = this.rotateObjStartAngle + delta;

        // Snap to 15-degree increments if Shift is held
        if (shiftKey) {
            newRotation = Math.round(newRotation / 15) * 15;
        }

        // Normalise to -180..180
        newRotation = ((newRotation % 360) + 360) % 360;
        if (newRotation > 180) newRotation -= 360;

        obj.rotation = Math.round(newRotation * 10) / 10;

        // Sync to jointBaseAngle for joint-pinned parts so _resolvePins doesn't overwrite
        if (obj.pinRotationMode === 'joint') {
            const parent = obj.pinnedTo ? this.getObjectById(obj.pinnedTo) : null;
            const target = parent ? this._getPinTargetWorldTransform(parent, obj) : null;
            const parentRot = target ? (target.rotation || 0) : (parent ? parent.rotation : 0);
            obj.jointBaseAngle = Math.round((obj.rotation - parentRot) * 10) / 10;
        }

        // Show live rotation angle in stage toolbar
        const coordsEl = document.getElementById('mouse-coordinates');
        if (coordsEl) {
            coordsEl.textContent = `X: ${Math.round(pivot.x)}  Y: ${Math.round(pivot.y)}  ⟳ ${obj.rotation}°`;
        }

        this.updateProperties();
        this.stage.requestRender();
    },

    updateCursor(pos) {
        const viewport = this.stage.viewport;

        // Keep copy cursor during copy mode
        if (this._copyMode) {
            viewport.style.cursor = 'copy';
            return;
        }

        // Keep crosshair while picking a destination on stage
        if (this.animations?.isPickingDestination || this._pathPickActive) {
            viewport.style.cursor = 'crosshair';
            return;
        }

        if (this.stage.isPanning) {
            viewport.style.cursor = 'grabbing';
            return;
        }

        if (this.currentTool === 'hand') {
            viewport.style.cursor = 'grab';
            return;
        }
        
        if (this.currentTool !== 'select') {
            viewport.style.cursor = 'crosshair';
            return;
        }

        // Check joint hover
        const jointHover = this._hitTestJoint(pos);
        if (jointHover) {
            viewport.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M12 2a10 10 0 0 1 7.07 2.93l1.43-1.43L22 7h-4.5l1.44-1.44A8 8 0 1 0 20 12h2A10 10 0 1 1 12 2z%27 fill=%27%23ff9800%27/%3E%3C/svg%3E") 12 12, grab';
            return;
        }

        const depthHandle = this.getDepthHandle(pos);
        if (depthHandle) {
            viewport.style.cursor = 'grab';
            return;
        }

        // Check rotation handles first (corners outside bbox)
        const rotHandle = this.getRotationHandle(pos);
        if (rotHandle) {
            // Use a custom CSS class for rotation cursor
            viewport.style.cursor = 'url("data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2724%27 height=%2724%27 viewBox=%270 0 24 24%27%3E%3Cpath d=%27M12 2a10 10 0 0 1 7.07 2.93l1.43-1.43L22 7h-4.5l1.44-1.44A8 8 0 1 0 20 12h2A10 10 0 1 1 12 2z%27 fill=%27%236366f1%27/%3E%3C/svg%3E") 12 12, grab';
            return;
        }

        // Check resize handles
        const handle = this.getResizeHandle(pos);
        if (handle) {
            viewport.style.cursor = this._getRotatedResizeCursor(handle);
            return;
        }

        // Check object hover
        const hit = this.hitTest(pos.x, pos.y);
        viewport.style.cursor = hit ? 'move' : (this._stagePanMode ? 'grab' : 'default');
    },

    _getRotatedResizeCursor(handle) {
        // Map each handle to a base angle (degrees, 0 = north, clockwise)
        const baseAngles = { n: 0, ne: 45, e: 90, se: 135, s: 180, sw: 225, w: 270, nw: 315 };
        // Ordered cursor list every 45° starting from north
        const cursorOrder = ['n-resize', 'ne-resize', 'e-resize', 'se-resize', 's-resize', 'sw-resize', 'w-resize', 'nw-resize'];

        let objRotation = 0;
        if (this.selectedIds.length === 1) {
            const obj = this.getSelectedObjects()[0];
            if (obj) objRotation = obj.rotation || 0;
        }

        const baseAngle = baseAngles[handle] || 0;
        // Add object rotation, normalize to 0-360
        const adjusted = ((baseAngle + objRotation) % 360 + 360) % 360;
        // Snap to nearest 45° index
        const index = Math.round(adjusted / 45) % 8;
        return cursorOrder[index];
    },

    handleKeyDown(e) {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT' || e.target.isContentEditable) return;

        switch (e.key) {
            // Escape: deselect + cancel path/destination + reset tool + exit paint mode + exit point edit + exit group edit
            case 'Escape':
                if (this._copyMode) {
                    this.cancelCopyMode();
                    return;
                }
                if (this.rigging.isActive) {
                    this.rigging.exitRigMode();
                    return;
                }
                if (this._eraserMode) {
                    this.exitEraserMode();
                    return;
                }
                if (this._cloneBrushMode) {
                    this.exitCloneBrushMode({ cancel: true });
                    return;
                }
                if (this._objEraserMode) {
                    this.exitObjectEraserMode();
                    return;
                }
                if (this._cropMode) {
                    this.exitCropMode();
                    return;
                }
                if (this._sliceMode) {
                    this.exitSliceMode();
                    return;
                }
                if (this._pinPickMode) {
                    this._cancelPinPick();
                    Utils.showToast('Pin pick cancelled', 'info');
                    return;
                }
                if (this._jointPlaceMode) {
                    const hadGuide = !!this._jointPlacementGuide;
                    this.cancelGuidedJointPlacement();
                    Utils.showToast(hadGuide ? 'Guided joint placement cancelled' : 'Joint placement cancelled', 'info');
                    return;
                }
                if (this._animPaintMode) {
                    this.stopAnimationPaint();
                    return;
                }
                if (this._eyedropperMode) {
                    this.stopEyedropper();
                    return;
                }
                if (this._pointEditMode) {
                    this.exitPointEditMode();
                    return;
                }
                if (this._groupEditMode) {
                    this.exitGroupEditMode();
                    return;
                }
                this.select([]);
                if (this.isDrawingPath) {
                    this.finalizePath();
                }
                if (this.isDrawingTrace) {
                    this.finalizeTrace(false); // Escape = open path
                }
                // Cancel destination picking if active
                if (this.animations?.isPickingDestination) {
                    this.animations.cancelPickingDestination();
                }
                this.currentTool = 'select';
                this.updateToolUI();
                break;
            // Group / Ungroup
            case 'g':
                if (e.metaKey || e.ctrlKey) {
                    e.preventDefault();
                    if (e.shiftKey) {
                        this.ungroupSelected();
                    } else {
                        this.groupSelected();
                    }
                }
                break;
            // Tool shortcuts (unique to ObjectManager)
            case 'v': this.setTool('select'); break;
            case 'r': if (!e.metaKey && !e.ctrlKey) this.setTool('rectangle'); break;
            case 'c': if (!e.metaKey && !e.ctrlKey) this.setTool('circle'); break;
            case 't': if (!e.metaKey && !e.ctrlKey) this.setTool('triangle'); break;
            case 's': if (!e.metaKey && !e.ctrlKey) this.setTool('star'); break;
            case 'x': this.setTool('text'); break;
            case 'h': this.setTool('hand'); break;
            case 'p': if (!e.metaKey && !e.ctrlKey) this.setTool('path'); break;
            case 'q': if (!e.metaKey && !e.ctrlKey) this.setTool('trace'); break;
            case 'k': this.setTool('eyedropper'); this.startEyedropper(); break;
            case 'e': if (!e.metaKey && !e.ctrlKey) { this.setTool('editPoints'); this.togglePointEditMode(); } break;
            case 'j': if (!e.metaKey && !e.ctrlKey) { this.setTool('slice'); this.enterSliceMode(); } break;
            case 'u': if (!e.metaKey && !e.ctrlKey) { this.setTool('measure'); this._enterMeasureMode(); } break;
            case '[':
                if (this._eraserMode || this._cloneBrushMode) {
                    const clone = this._cloneBrushMode;
                    const prop = clone ? '_cloneBrushSize' : '_eraserBrushSize';
                    this[prop] = Math.max(2, this[prop] - (this[prop] > 20 ? 10 : 2));
                    const sizeEl = document.getElementById(clone ? 'clone-brush-size' : 'eraser-brush-size');
                    const sizeValEl = document.getElementById(clone ? 'clone-brush-size-val' : 'eraser-brush-size-val');
                    if (sizeEl) sizeEl.value = this[prop];
                    if (sizeValEl) sizeValEl.textContent = this[prop];
                    this.stage.requestRender();
                }
                break;
            case ']':
                if (this._eraserMode || this._cloneBrushMode) {
                    const clone = this._cloneBrushMode;
                    const prop = clone ? '_cloneBrushSize' : '_eraserBrushSize';
                    this[prop] = Math.min(200, this[prop] + (this[prop] >= 20 ? 10 : 2));
                    const sizeEl2 = document.getElementById(clone ? 'clone-brush-size' : 'eraser-brush-size');
                    const sizeValEl2 = document.getElementById(clone ? 'clone-brush-size-val' : 'eraser-brush-size-val');
                    if (sizeEl2) sizeEl2.value = this[prop];
                    if (sizeValEl2) sizeValEl2.textContent = this[prop];
                    this.stage.requestRender();
                }
                break;
        }
    },

    // Tool management
    setTool(tool) {
        this.currentTool = tool;
        this.updateToolUI();
        eventBus.emit('tool:changed', tool);

        // Cancel any active copy/format modes
        if (this._copyMode) this.cancelCopyMode();
        if (this._copiedFormat) {
            this._copiedFormat = null;
            document.getElementById('btn-copy-format')?.classList.remove('active');
        }
        
        if (this.isDrawingPath && tool !== 'path') {
            this.finalizePath();
        }
        if (this.isDrawingTrace && tool !== 'trace') {
            this.finalizeTrace(false); // open path when switching away
        }

        // Exit point edit mode when switching away from editPoints
        if (tool !== 'editPoints' && this._pointEditMode) {
            this.exitPointEditMode();
        }

        // Exit flex mode when switching away
        if (tool !== 'flex' && this._flexMode) {
            this.exitFlexMode();
        }
        if (this._flexRigMode) {
            this.exitFlexRigMode();
        }

        // Set cursor for special tools
        if (tool === 'hand') {
            this.stage.viewport.style.cursor = 'grab';
        } else if (tool === 'zoom') {
            this.stage.viewport.style.cursor = 'zoom-in';
        } else if (tool === 'eyedropper') {
            this.startEyedropper();
        } else if (tool === 'slice' || tool === 'trace') {
            this.stage.viewport.style.cursor = 'crosshair';
        } else if (tool === 'measure') {
            this.stage.viewport.style.cursor = 'crosshair';
        } else {
            // Stop eyedropper if switching away
            if (this._eyedropperMode) this.stopEyedropper();
            this.stage.viewport.style.cursor = '';
        }

        // Exit slice mode when switching away from slice
        if (tool !== 'slice' && this._sliceMode) {
            this.exitSliceMode();
        }

        // Exit measure mode when switching away
        if (tool !== 'measure' && this._measureMode) {
            this._exitMeasureMode();
        }

        // Auto-revert to select cursor after 5 seconds of inactivity
        // for non-select drawing tools (rectangle, circle, etc.)
        clearTimeout(this._toolRevertTimer);
        const drawingTools = ['rectangle','circle','triangle','star','polygon','line','diamond','heart','arrow','doubleArrow','curvedArrow', ...StageObject.getCustomShapeTypes(), 'scribble','freeform','text','image'];
        if (drawingTools.includes(tool)) {
            this._toolRevertTimer = setTimeout(() => {
                if (this.currentTool === tool && !this.isDrawing && !this.isDrawingPath && !this.isDrawingTrace) {
                    this.setTool('select');
                    Utils.showToast('Switched back to Select tool (idle)', 'info');
                }
            }, 5000);
        }
    },

    updateToolUI() {
        document.querySelectorAll('.tool-btn, .cvbar-btn[data-tool]').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tool === this.currentTool);
        });
    },

    bindToolEvents() {
        document.querySelectorAll('.tool-btn[data-tool]').forEach(btn => {
            btn.addEventListener('click', () => {
                const tool = btn.dataset.tool;
                // Re-clicking the active tool toggles back to select (except select itself)
                if (tool !== 'select' && this.currentTool === tool) {
                    // Exit any special mode first
                    if (tool === 'editPoints' && this._pointEditMode) {
                        this.exitPointEditMode();
                    }
                    this.setTool('select');
                    return;
                }
                this.setTool(tool);
                // Special actions for certain tools
                if (tool === 'editPoints') {
                    this.togglePointEditMode();
                }
                if (tool === 'slice') {
                    this.enterSliceMode();
                }
                if (tool === 'measure') {
                    this._enterMeasureMode();
                }
            });
        });

        // Image tool opens file picker
        document.querySelector('.tool-btn[data-tool="image"]')?.addEventListener('click', () => {
            document.getElementById('file-input-image').click();
        });

        document.getElementById('file-input-image')?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            const ids = [];
            let loaded = 0;
            files.forEach((file, i) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const offset = i * 30;
                    const obj = new StageObject('image', {
                        x: this.stage.width / 2 - 100 + offset,
                        y: this.stage.height / 2 - 100 + offset,
                        width: 200, height: 200,
                        imageSrc: reader.result
                    });
                    this.addObject(obj);
                    ids.push(obj.id);
                    loaded++;
                    if (loaded === files.length) {
                        this.select(ids);
                        this.setTool('select');
                    }
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        });

        // GIF import button opens GIF file picker
        document.getElementById('btn-import-gif')?.addEventListener('click', () => {
            document.getElementById('file-input-gif').click();
        });
        document.getElementById('btn-import-gif-panel')?.addEventListener('click', () => {
            document.getElementById('file-input-gif').click();
        });

        document.getElementById('file-input-gif')?.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            if (!files.length) return;
            const ids = [];
            let loaded = 0;
            files.forEach((file, i) => {
                const reader = new FileReader();
                reader.onload = () => {
                    const offset = i * 30;
                    const obj = new StageObject('image', {
                        x: this.stage.width / 2 - 100 + offset,
                        y: this.stage.height / 2 - 100 + offset,
                        width: 200, height: 200,
                        imageSrc: reader.result
                    });
                    this.addObject(obj);
                    ids.push(obj.id);
                    loaded++;
                    if (loaded === files.length) {
                        this.select(ids);
                        this.setTool('select');
                        const plural = files.length > 1 ? 's' : '';
                        Utils.showToast(`Imported ${files.length} animated GIF${plural}`, 'success');
                    }
                };
                reader.readAsDataURL(file);
            });
            e.target.value = '';
        });

        // Prevent browser default drag-drop behavior (navigating to dropped files)
        document.addEventListener('dragover', (e) => e.preventDefault());
        document.addEventListener('drop', (e) => e.preventDefault());

        // Paste image from clipboard onto stage
        document.addEventListener('paste', (e) => {
            // Don't intercept paste in text inputs/textareas
            const tag = document.activeElement?.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;

            const items = e.clipboardData?.items;
            if (!items) return;

            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    e.preventDefault();
                    const file = item.getAsFile();
                    if (!file) continue;
                    const reader = new FileReader();
                    reader.onload = () => {
                        const obj = new StageObject('image', {
                            x: this.stage.width / 2 - 100,
                            y: this.stage.height / 2 - 100,
                            width: 200, height: 200,
                            imageSrc: reader.result
                        });
                        this.addObject(obj);
                        this.select([obj.id]);
                    };
                    reader.readAsDataURL(file);
                    return;
                }
            }

            // Check for image URL in HTML content
            const html = e.clipboardData?.getData('text/html');
            if (html) {
                const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                if (match && match[1]) {
                    e.preventDefault();
                    this._addImageFromUrl(match[1]);
                    return;
                }
            }
        });

        // Drag-and-drop images onto the stage canvas
        const viewport = this.stage.viewport || this.stage.canvas?.parentElement;
        if (viewport) {
            viewport.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'copy';
                viewport.classList.add('drop-hover');
            });

            viewport.addEventListener('dragleave', (e) => {
                if (!viewport.contains(e.relatedTarget)) {
                    viewport.classList.remove('drop-hover');
                }
            });

            viewport.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                viewport.classList.remove('drop-hover');

                const stagePos = this.stage.screenToStage(e.clientX, e.clientY);

                // Handle dropped files (from Finder/Explorer or desktop)
                if (e.dataTransfer?.files?.length > 0) {
                    let handled = false;
                    for (const file of e.dataTransfer.files) {
                        if (!file.type.startsWith('image/')) continue;
                        handled = true;
                        const reader = new FileReader();
                        reader.onload = () => {
                            const obj = new StageObject('image', {
                                x: stagePos.x - 100,
                                y: stagePos.y - 100,
                                width: 200, height: 200,
                                imageSrc: reader.result
                            });
                            this.addObject(obj);
                            this.select([obj.id]);
                        };
                        reader.readAsDataURL(file);
                    }
                    if (handled) return;
                }

                // Handle dragged image element HTML (from browser pages)
                const html = e.dataTransfer?.getData('text/html');
                if (html) {
                    const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                    if (match && match[1]) {
                        this._addImageFromUrl(match[1], stagePos.x - 100, stagePos.y - 100);
                        return;
                    }
                }

                // Handle dropped image URLs
                const url = (e.dataTransfer?.getData('text/uri-list') || e.dataTransfer?.getData('text/plain') || '').trim();
                if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:'))) {
                    this._addImageFromUrl(url, stagePos.x - 100, stagePos.y - 100);
                }
            });
        }
    },

    _addImageFromUrl(url, x, y) {
        // Convert to data URL via canvas to avoid CORS issues on re-export
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const cvs = document.createElement('canvas');
            cvs.width = img.naturalWidth;
            cvs.height = img.naturalHeight;
            cvs.getContext('2d').drawImage(img, 0, 0);
            let dataUrl;
            try {
                dataUrl = cvs.toDataURL('image/png');
            } catch (_) {
                // CORS tainted — use the original URL directly
                dataUrl = url;
            }
            const obj = new StageObject('image', {
                x: x ?? (this.stage.width / 2 - 100),
                y: y ?? (this.stage.height / 2 - 100),
                width: 200, height: 200,
                imageSrc: dataUrl
            });
            this.addObject(obj);
            this.select([obj.id]);
        };
        img.onerror = () => {
            // Fallback: use URL directly without CORS conversion
            const obj = new StageObject('image', {
                x: x ?? (this.stage.width / 2 - 100),
                y: y ?? (this.stage.height / 2 - 100),
                width: 200, height: 200,
                imageSrc: url
            });
            this.addObject(obj);
            this.select([obj.id]);
        };
        img.src = url;
    },

    _addImageFromDataUrl(dataUrl, x, y) {
        const obj = new StageObject('image', {
            x: x ?? (this.stage.width / 2 - 100),
            y: y ?? (this.stage.height / 2 - 100),
            width: 200,
            height: 200,
            imageSrc: dataUrl
        });
        this.addObject(obj);
        this.select([obj.id]);
        return obj;
    },

    async pasteImageFromClipboard(stagePos = null) {
        const targetX = Number.isFinite(stagePos?.x) ? (stagePos.x - 100) : (this.stage.width / 2 - 100);
        const targetY = Number.isFinite(stagePos?.y) ? (stagePos.y - 100) : (this.stage.height / 2 - 100);

        // Preferred path: async clipboard API supports direct image blobs.
        if (navigator.clipboard?.read) {
            try {
                const items = await navigator.clipboard.read();
                for (const item of items) {
                    const imageType = item.types.find(t => t.startsWith('image/'));
                    if (!imageType) continue;
                    const blob = await item.getType(imageType);
                    if (!blob) continue;

                    const dataUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = () => resolve(reader.result);
                        reader.onerror = () => reject(new Error('Failed to read clipboard image'));
                        reader.readAsDataURL(blob);
                    });

                    this._addImageFromDataUrl(dataUrl, targetX, targetY);
                    Utils.showToast('Pasted image from clipboard', 'success');
                    return true;
                }
            } catch (err) {
                console.warn('pasteImageFromClipboard read() failed:', err);
            }
        }

        // Fallback path: clipboard text that contains an image URL/data URL.
        if (navigator.clipboard?.readText) {
            try {
                const text = (await navigator.clipboard.readText())?.trim() || '';
                if (text && (text.startsWith('data:image/') || /\.(png|jpe?g|webp|gif|bmp|svg)(\?.*)?$/i.test(text) || /^https?:\/\//i.test(text))) {
                    this._addImageFromUrl(text, targetX, targetY);
                    Utils.showToast('Pasted image link from clipboard', 'success');
                    return true;
                }
            } catch (err) {
                console.warn('pasteImageFromClipboard readText() failed:', err);
            }
        }

        Utils.showToast('No image found in clipboard', 'info');
        return false;
    },

    initIconLibrary() {
        const ICONS = window.BUILTIN_ICON_LIBRARY || {};

        const buildIconKeywords = (icon, category) => {
            const categoryWords = category.replace(/([A-Z])/g, ' $1').toLowerCase();
            const nameWords = (icon.name || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
            const tagWords = Array.isArray(icon.tags) ? icon.tags.join(' ').toLowerCase() : '';
            return `${nameWords} ${categoryWords} ${tagWords}`.trim();
        };

        this._iconLibrary = ICONS;

        // Toggle panel
        const toggle = document.querySelector('.icon-lib-toggle');
        const panel = document.querySelector('.icon-lib-panel');
        if (toggle && panel) {
            toggle.addEventListener('click', () => {
                const isOpen = getComputedStyle(panel).display !== 'none';
                panel.style.display = isOpen ? 'none' : 'block';
                toggle.classList.toggle('open', !isOpen);
            });
        }

        // Render icons into grids
        const self = this;
        Object.entries(ICONS).forEach(([cat, icons]) => {
            const grid = document.getElementById(`icon-grid-${cat}`);
            if (!grid) return;
            icons.forEach(icon => {
                const btn = document.createElement('button');
                btn.className = 'icon-btn';
                btn.title = icon.name;
                btn.dataset.iconName = icon.name;
                btn.dataset.iconPath = icon.path;
                btn.dataset.iconViewBox = icon.viewBox || '0 0 100 100';
                btn.dataset.iconCategory = cat;
                btn.dataset.iconKeywords = buildIconKeywords(icon, cat);
                // Render SVG preview
                const preview = StageObject.buildIconPreviewMarkup(icon.path, icon.viewBox || '0 0 100 100');
                btn.dataset.iconMode = preview.previewMode;
                btn.innerHTML = preview.markup;
                btn.addEventListener('click', () => {
                    self._insertIcon(icon);
                });
                grid.appendChild(btn);
            });
        });

        // Search filter
        const searchInput = document.getElementById('icon-lib-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const q = searchInput.value.toLowerCase().trim();
                document.querySelectorAll('.icon-btn').forEach(btn => {
                    const name = (btn.dataset.iconName || '').toLowerCase();
                    const keywords = (btn.dataset.iconKeywords || '').toLowerCase();
                    btn.style.display = (!q || name.includes(q) || keywords.includes(q)) ? '' : 'none';
                });
                // Hide empty categories
                document.querySelectorAll('.icon-cat').forEach(cat => {
                    const visible = cat.querySelectorAll('.icon-btn:not([style*="display: none"])');
                    cat.style.display = visible.length > 0 ? '' : 'none';
                });
            });
        }

        // Load custom icons from localStorage
        this._loadCustomIcons();
    },

    _insertIcon(icon) {
        const cx = this.stage.width / 2;
        const cy = this.stage.height / 2;
        const size = 120;
        const obj = new StageObject('icon', {
            name: icon.name,
            x: cx - size / 2,
            y: cy - size / 2,
            width: size,
            height: size,
            fill: icon.fill || '#4a90d9',
            stroke: icon.stroke || '#000000',
            strokeWidth: icon.strokeWidth ?? 0,
            iconPath: icon.path,
            iconViewBox: icon.viewBox || '0 0 100 100'
        });
        this.addObject(obj);
        this.select([obj.id]);
        this.setTool('select');
    },

    initEmojiLibrary() {
        window.EmojiLibraryData?.installPanel?.();

        const library = window.EmojiLibraryData;
        if (!library || !Array.isArray(library.items)) {
            this._emojiInitAttempts = (this._emojiInitAttempts || 0) + 1;
            if (this._emojiInitAttempts < 12) {
                setTimeout(() => this.initEmojiLibrary(), 500);
            }
            return;
        }

        this._emojiLibraryReady = true;
        this._emojiLibrary = library;
    },

    _insertEmoji(item) {
        const library = this._emojiLibrary || window.EmojiLibraryData;
        if (!library || typeof library.renderSvg !== 'function') return;

        const svg = library.renderSvg(item);
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        const cx = this.stage.width / 2;
        const cy = this.stage.height / 2;
        const size = 128;
        const obj = new StageObject('image', {
            name: `Emoji - ${item.name}`,
            x: cx - size / 2,
            y: cy - size / 2,
            width: size,
            height: size,
            imageSrc: dataUrl,
            lockAspectRatio: true,
            strokeWidth: 0
        });
        this.addObject(obj);
        this.select([obj.id]);
        this.setTool('select');
    },

    initPropLibrary() {
        const LIB = window.BUILTIN_PROP_LIBRARY;
        const body = document.getElementById('prop-lib-body');
        if (!LIB || !body) {
            this._propInitAttempts = (this._propInitAttempts || 0) + 1;
            if (this._propInitAttempts < 12) setTimeout(() => this.initPropLibrary(), 400);
            return;
        }
        if (this._propLibraryReady) return;
        this._propLibraryReady = true;
        this._propLibrary = LIB;
        // Flat id → prop lookup for scene assembly.
        this._propById = {};
        Object.values(LIB.items || {}).forEach(arr => (arr || []).forEach(it => { this._propById[it.id] = it; }));

        const self = this;
        const kw = (item, cat) => `${(item.name || '').toLowerCase()} ${cat} ${(item.tags || '').toLowerCase()}`.trim();

        // One-click scenes row (backdrop + grouped props)
        const scenes = LIB.scenes || [];
        if (scenes.length) {
            const secS = document.createElement('div');
            secS.className = 'icon-cat prop-cat';
            secS.dataset.cat = 'scenes';
            const hS = document.createElement('h5');
            hS.textContent = 'Scenes';
            secS.appendChild(hS);
            const gridS = document.createElement('div');
            gridS.className = 'icon-grid';
            scenes.forEach(sc => {
                const b = document.createElement('button');
                b.type = 'button';
                b.className = 'icon-btn prop-btn scene-btn';
                b.title = `Insert ${sc.name} scene`;
                b.setAttribute('aria-label', `Insert ${sc.name} scene`);
                b.dataset.category = sc.category || '';
                b.dataset.kind = 'scenes';
                b.dataset.propKeywords = kw(sc, sc.category);
                const img = document.createElement('img');
                img.alt = ''; img.loading = 'lazy';
                img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(LIB.sceneSvg ? LIB.sceneSvg(sc) : sc.backdrop)}`;
                const label = document.createElement('span'); label.textContent = sc.name;
                b.append(img, label);
                b.addEventListener('click', () => self._insertScene(sc));
                gridS.appendChild(b);
                window.SceneDesign?.favoriteButton(b, sc.id);
            });
            secS.appendChild(gridS);
            body.appendChild(secS);
        }

        (LIB.categories || []).forEach(cat => {
            const list = (LIB.items || {})[cat.id] || [];
            if (!list.length) return;
            const section = document.createElement('div');
            section.className = 'icon-cat prop-cat';
            section.dataset.cat = cat.id;
            const h5 = document.createElement('h5');
            h5.textContent = `${cat.icon || ''} ${cat.name}`.trim();
            section.appendChild(h5);
            const grid = document.createElement('div');
            grid.className = 'icon-grid';
            list.forEach(item => {
                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'icon-btn prop-btn';
                btn.title = item.name;
                btn.setAttribute('aria-label', `Insert ${item.name}`);
                btn.dataset.category = cat.id;
                btn.dataset.kind = 'props';
                btn.dataset.propKeywords = kw(item, cat.id);
                let preview;
                if (item.iconType && typeof StageObject.buildIconPreviewMarkup === 'function') {
                    preview = StageObject.buildIconPreviewMarkup(item.iconPath, item.viewBox || '0 0 100 100').markup;
                } else {
                    preview = '';
                }
                btn.innerHTML = preview;
                if (!item.iconType) {
                    const img = document.createElement('img'); img.alt = ''; img.loading = 'lazy';
                    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`;
                    btn.append(img);
                }
                const label = document.createElement('span'); label.textContent = item.name; btn.append(label);
                btn.addEventListener('click', () => self._insertProp(item));
                grid.appendChild(btn);
                window.SceneDesign?.favoriteButton(btn, item.id);
            });
            section.appendChild(grid);
            body.appendChild(section);
        });

        const toggle = document.querySelector('.prop-lib-toggle');
        const panel = document.querySelector('.prop-lib-panel');
        if (toggle && panel && toggle.dataset.bound !== '1') {
            toggle.dataset.bound = '1';
            toggle.addEventListener('click', () => {
                const isOpen = getComputedStyle(panel).display !== 'none';
                panel.style.display = isOpen ? 'none' : 'block';
                toggle.classList.toggle('open', !isOpen);
                toggle.setAttribute('aria-expanded', String(!isOpen));
            });
            toggle.addEventListener('keydown', event => {
                if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle.click(); }
            });
        }

        const search = document.getElementById('prop-lib-search');
        const kind = document.getElementById('prop-lib-kind');
        const category = document.getElementById('prop-lib-category');
        (LIB.categories || []).forEach(cat => category?.add(new Option(cat.name, cat.id)));
        const filter = () => {
            const terms = (search?.value || '').toLowerCase().trim().split(/\s+/).filter(Boolean);
            let count = 0;
            body.querySelectorAll('.prop-btn').forEach(btn => {
                const visible = (!kind || kind.value === 'all' || kind.value === btn.dataset.kind)
                    && (!category || category.value === 'all' || category.value === btn.dataset.category)
                    && terms.every(term => btn.dataset.propKeywords.includes(term));
                const shown = visible && (!window.SceneDesign || SceneDesign.matches(btn));
                btn.hidden = !shown;
                if (btn.parentElement.classList.contains('prop-tile')) btn.parentElement.hidden = !shown;
                if (window.SceneDesign) btn.parentElement.style.order = SceneDesign.rank(btn);
                if (shown) count++;
            });
            body.querySelectorAll('.prop-cat').forEach(cat => { cat.hidden = !cat.querySelector('.prop-btn:not([hidden])'); });
            const countEl = document.getElementById('prop-lib-count');
            if (countEl) countEl.textContent = `${count} ${count === 1 ? 'asset' : 'assets'}`;
            const empty = document.getElementById('prop-lib-empty'); if (empty) empty.hidden = count > 0;
            const options = panel?.querySelector('.prop-lib-options'); if (options) options.hidden = kind?.value === 'props';
        };
        search?.addEventListener('input', filter);
        kind?.addEventListener('change', filter);
        category?.addEventListener('change', filter);
        document.getElementById('prop-lib-saved')?.addEventListener('change', filter);
        window.SceneDesign?.bind(this);
        const refreshTools = () => {
            if (this._characterToolRefresh) return;
            this._characterToolRefresh = requestAnimationFrame(() => {
                this._characterToolRefresh = null;
                this._syncCharacterTools();
            });
        };
        for (const event of ['selection:changed', 'object:added', 'object:removed', 'object:updated']) eventBus.on(event, refreshTools);
        document.getElementById('prop-character-tool-placement')?.addEventListener('change', () => this._syncCharacterTools());
        this._syncCharacterTools();
        filter();
    },

    _getCharacterToolArmature(rootId = this._characterToolRootId) {
        const root = this.getObjectById(rootId);
        if (!root) return null;
        const system = window.app?.jointSystem;
        const rig = system?._detectArmatureFromPool(this.objects.filter(obj => obj.id === rootId || obj.pinnedTo === rootId));
        return rig?.root?.id === rootId ? rig : null;
    },

    _syncCharacterTools() {
        const section = document.getElementById('prop-character-tools');
        if (!section) return;
        const selected = window.app?.jointSystem?._detectSelectedArmature?.();
        if (selected?.root) this._characterToolRootId = selected.root.id;
        const rig = this._getCharacterToolArmature();
        const preset = window.SvgAfricanCharacterCatalog?.getPreset(rig?.root?._svgCharacterConfig?.preset);
        const tools = (preset?.recommendedProps || []).map(id => this._propById?.[id]).filter(Boolean);
        section.hidden = !rig || !tools.length;
        if (section.hidden) { this._characterToolSignature = ''; return; }
        const placement = document.getElementById('prop-character-tool-placement');
        const current = placement.value;
        const signature = JSON.stringify([rig.root.id, preset.id, current, Object.keys(rig.parts), tools.map(item => item.id)]);
        if (signature === this._characterToolSignature) return;
        document.getElementById('prop-character-tools-name').textContent = preset.name;
        placement.replaceChildren(new Option('On stage', 'stage'));
        for (const [role, label] of [['right-arm', 'Right hand'], ['left-arm', 'Left hand'], ['front-arm', 'Front hand'], ['back-arm', 'Back hand']]) {
            if (rig.parts[role]?.obj?.joints?.some(joint => /wrist/i.test(joint.name || ''))) placement.add(new Option(label, role));
        }
        if ([...placement.options].some(option => option.value === current)) placement.value = current;
        this._characterToolSignature = signature;
        const grid = document.getElementById('prop-character-tools-grid');
        grid.replaceChildren();
        for (const item of tools) {
            const button = document.createElement('button');
            button.type = 'button'; button.className = 'icon-btn'; button.dataset.characterTool = item.id;
            const label = `Add ${item.name} - ${placement.selectedOptions[0].textContent}`;
            button.title = label; button.setAttribute('aria-label', label);
            const image = document.createElement('img'); image.alt = '';
            image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`;
            const name = document.createElement('span'); name.textContent = item.name;
            button.append(image, name);
            const rootId = rig.root.id;
            button.addEventListener('click', () => this._insertCharacterTool(item, rootId, placement.value));
            grid.append(button);
        }
    },

    _insertCharacterTool(item, rootId, placement = 'stage') {
        const rig = this._getCharacterToolArmature(rootId);
        if (!rig) { Utils.showToast('Select a character before adding its tools.', 'warning'); return null; }
        const arm = placement === 'stage' ? null : rig.parts[placement]?.obj;
        const wrist = arm?.joints?.find(joint => /wrist/i.test(joint.name || ''));
        if (placement !== 'stage' && !wrist) { Utils.showToast('That hand is no longer available.', 'warning'); return null; }
        if (arm?.locked || rig.root.locked) { Utils.showToast('Unlock the character before adding a tool.', 'warning'); return null; }
        eventBus.emit('history:flush');
        const suppressed = this._suppressHistory;
        this._suppressHistory = true;
        let obj;
        try {
            obj = this._insertProp(item);
            if (!obj) return null;
            if (arm) {
                const grip = item.handGrip || { x: .5, y: .5, armLengthRatio: .32 };
                const ratio = obj.width / obj.height;
                obj.height = Math.max(8, arm.height * grip.armLengthRatio);
                obj.width = obj.height * ratio;
                obj.pivotX = grip.x; obj.pivotY = grip.y;
                obj.pinnedTo = arm.id; obj.pinTargetType = 'joint';
                obj.sceneAsset = { ...(obj.sceneAsset || {}), characterTool: true };
                obj.pinJointId = wrist.id; obj.pinJointName = wrist.name;
                const direction = StageObject.getJointDirectionMeta(arm.jointDirection);
                const palmOffset = Math.max(0, Math.min(.12, .93 - wrist.position))
                    * (direction.isVertical ? arm.height : arm.width) * (direction.isReverse ? -1 : 1);
                obj.pinOffsetX = direction.isVertical ? 0 : palmOffset;
                obj.pinOffsetY = direction.isVertical ? palmOffset : 0;
                obj.pinRotationMode = 'joint'; obj.pinInheritRotation = true;
                const target = this._getPinTargetWorldTransform(arm, obj);
                obj.jointBaseAngle = -(target.rotation || 0);
                obj.pinBaseTiltX = -(target.tiltX || 0); obj.pinBaseTiltY = -(target.tiltY || 0);
                obj.x = target.x - obj.width * obj.pivotX;
                obj.y = target.y - obj.height * obj.pivotY;
                obj.layer = arm.layer;
                // Keep the tool adjacent to its arm in the base draw order.
                this.objects.splice(this.objects.indexOf(obj), 1);
                this.objects.splice(this.objects.indexOf(arm) + 1, 0, obj);
                this._resolvePins();
            } else {
                const bounds = rig.root.getBounds();
                obj.x = bounds.x + bounds.width + 16;
                obj.y = bounds.y + bounds.height - obj.height;
            }
            this.updateObjectList(); this.updateProperties(); this.stage.requestRender();
        } finally { this._suppressHistory = suppressed; }
        if (!suppressed) eventBus.emit('history:push');
        Utils.showToast(`Added ${item.name}`, 'success');
        return obj;
    },

    _insertProp(item) {
        if (!item) return;
        const cx = this.stage.width / 2;
        const cy = this.stage.height / 2;
        if (item.iconType) {
            const size = 120;
            const obj = new StageObject('icon', {
                name: item.name,
                x: cx - size / 2,
                y: cy - size / 2,
                width: size,
                height: size,
                fill: item.fill || '#4a90d9',
                stroke: '#000000',
                strokeWidth: 0,
                iconPath: item.iconPath,
                iconViewBox: item.viewBox || '0 0 100 100',
                sceneAsset: window.SceneDesign?.metadata(item.id)
            });
            this.addObject(obj);
            this.select([obj.id]);
            this.setTool('select');
            window.SceneDesign?.recent(item.id);
            return obj;
        }
        const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(item.svg)}`;
        const w = item.w || 120;
        const h = item.h || 120;
        const obj = new StageObject('image', {
            name: item.name,
            x: cx - w / 2,
            y: cy - h / 2,
            width: w,
            height: h,
            imageSrc: dataUrl,
            sceneAsset: window.SceneDesign?.metadata(item.id),
            lockAspectRatio: true,
            strokeWidth: 0
        });
        this.addObject(obj);
        this.select([obj.id]);
        this.setTool('select');
        window.SceneDesign?.recent(item.id);
        return obj;
    },

    _insertScene(scene) {
        if (!scene) return;
        if (window.SceneDesign) scene = SceneDesign.variant(scene, SceneDesign.sceneOptions(this.stage));
        eventBus.emit('history:flush');
        const byId = this._propById || {};
        const cx = this.stage.width / 2;
        const cy = this.stage.height / 2;
        const groundY = Number.isFinite(scene.groundY) ? scene.groundY : 150;
        const bw = scene.backdropW || 900, bh = scene.backdropH || 520;
        const scale = document.getElementById('prop-scene-fit')?.checked !== false
            ? Math.min(this.stage.width / bw, this.stage.height / bh) : 1;
        const behind = document.getElementById('prop-scene-behind')?.checked !== false;
        const originalObjects = this.objects.slice();
        const originalSelection = this.selectedIds.slice();
        const ids = [];
        let createdGroup = null;
        const prevSuppress = this._suppressHistory;
        this._suppressHistory = true;
        try {
        if (scene.backdrop) {
            const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(scene.backdrop)}`;
            const bg = new StageObject('image', {
                name: `${scene.name} — backdrop`,
                x: cx - bw * scale / 2, y: cy - bh * scale / 2, width: bw * scale, height: bh * scale,
                imageSrc: url, lockAspectRatio: true, strokeWidth: 0,
                sceneAsset: window.SceneDesign?.metadata(null, { sceneId: scene.id, design: scene.design, ground: .5 + groundY / bh })
            });
            this.addObject(bg);
            ids.push(bg.id);
        }

        (scene.pieces || []).slice().sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(piece => {
            const prop = byId[piece.propId];
            if (!prop) throw new Error(`Missing scene prop: ${piece.propId}`);
            const w = (piece.w || prop.w || 120) * scale;
            const h = (piece.h || prop.h || 120) * scale;
            const oY = piece.ground ? (groundY * scale - h / 2) : (piece.oY || 0) * scale;
            const x = cx + (piece.oX || 0) * scale - w / 2;
            const y = cy + oY - h / 2;
            let obj;
            if (prop.iconType) {
                obj = new StageObject('icon', {
                    name: prop.name, x, y, width: w, height: h,
                    fill: prop.fill || '#4a90d9', stroke: '#000000', strokeWidth: 0,
                    iconPath: prop.iconPath, iconViewBox: prop.viewBox || '0 0 100 100'
                });
            } else if (prop.svg) {
                const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(prop.svg)}`;
                obj = new StageObject('image', {
                    name: prop.name, x, y, width: w, height: h,
                    imageSrc: url, lockAspectRatio: true, strokeWidth: 0,
                    sceneAsset: window.SceneDesign?.metadata(prop.id, { sceneId: scene.id, design: scene.design })
                });
            } else {
                return;
            }
            obj.sceneAsset = window.SceneDesign?.metadata(prop.id, { sceneId: scene.id, design: scene.design });
            this.addObject(obj);
            ids.push(obj.id);
        });

        if (!ids.length) return;
        if (behind) {
            const inserted = new Set(ids);
            const newObjects = this.objects.filter(obj => inserted.has(obj.id));
            // Keep the complete set behind existing characters, including across layers.
            const layer = Math.min(this.activeLayerId || 1, ...originalObjects.map(obj => obj.layer || 1));
            newObjects.forEach(obj => { obj.layer = layer; });
            this.objects.splice(0, this.objects.length, ...newObjects, ...originalObjects);
        }
        this.select(ids);
        if (ids.length > 1) {
            const gid = Utils.generateId('grp');
            createdGroup = gid;
            this.groups[gid] = ids.slice();
            this.groupNames[gid] = scene.name;
            this._groupCounter++;
            ids.forEach(id => { this.getObjectById(id).groupId = gid; });
        }
        } catch (error) {
            if (createdGroup) { delete this.groups[createdGroup]; delete this.groupNames[createdGroup]; }
            this.objects.splice(0, this.objects.length, ...originalObjects);
            this.select(originalSelection);
            this.updateObjectList();
            this.stage.requestRender();
            Utils.showToast('Could not insert this scene.', 'error');
            return;
        } finally { this._suppressHistory = prevSuppress; }
        this.updateObjectList();
        this.setTool('select');
        this.stage.requestRender();
        if (!prevSuppress) eventBus.emit('history:push');
        if (typeof Utils !== 'undefined' && Utils.showToast) Utils.showToast(`Inserted scene: ${scene.name}`, 'success');
        window.SceneDesign?.recent(scene.id);
        return ids;
    },

    // ========== Custom Icon Creation (Merge shapes → Icon) ==========

    /**
     * Convert a single StageObject to SVG path data in absolute coordinates.
     * Returns a string of SVG path commands.
     */
    _shapeToAbsolutePath(obj) {
        const x = obj.x, y = obj.y, w = obj.width, h = obj.height;
        switch (obj.type) {
            case 'rectangle': {
                const r = Math.min(obj.borderRadius || 0, w / 2, h / 2);
                if (r > 0) {
                    return `M${x + r} ${y} L${x + w - r} ${y} Q${x + w} ${y} ${x + w} ${y + r} L${x + w} ${y + h - r} Q${x + w} ${y + h} ${x + w - r} ${y + h} L${x + r} ${y + h} Q${x} ${y + h} ${x} ${y + h - r} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} Z`;
                }
                return `M${x} ${y} L${x + w} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`;
            }
            case 'circle': {
                const cx = x + w / 2, cy = y + h / 2;
                const rx = Math.abs(w / 2) || 1, ry = Math.abs(h / 2) || 1;
                return `M${cx - rx} ${cy} A${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
            }
            case 'triangle':
                return `M${x + w / 2} ${y} L${x + w} ${y + h} L${x} ${y + h} Z`;
            case 'diamond':
                return `M${x + w / 2} ${y} L${x + w} ${y + h / 2} L${x + w / 2} ${y + h} L${x} ${y + h / 2} Z`;
            case 'heart': {
                const topY = h * 0.3;
                const hx = x + w / 2, hy = y + topY;
                return `M${hx} ${hy} C${hx} ${y} ${x} ${y} ${x} ${hy} C${x} ${y + (h + topY) / 2} ${hx} ${y + h * 0.8} ${hx} ${y + h} C${hx} ${y + h * 0.8} ${x + w} ${y + (h + topY) / 2} ${x + w} ${hy} C${x + w} ${y} ${hx} ${y} ${hx} ${hy} Z`;
            }
            case 'star': {
                const cx = x + w / 2, cy = y + h / 2;
                const outerR = Math.min(w, h) / 2;
                const innerR = outerR * (obj.innerRadius || 0.4);
                const points = obj.sides || 5;
                let d = '';
                for (let i = 0; i < points * 2; i++) {
                    const r = i % 2 === 0 ? outerR : innerR;
                    const angle = (i * Math.PI / points) - Math.PI / 2;
                    const px = cx + r * Math.cos(angle);
                    const py = cy + r * Math.sin(angle);
                    d += (i === 0 ? 'M' : 'L') + `${px.toFixed(1)} ${py.toFixed(1)} `;
                }
                return d + 'Z';
            }
            case 'polygon': {
                const cx = x + w / 2, cy = y + h / 2;
                const r = Math.min(w, h) / 2;
                const sides = obj.sides || 6;
                let d = '';
                for (let i = 0; i < sides; i++) {
                    const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
                    const px = cx + r * Math.cos(angle);
                    const py = cy + r * Math.sin(angle);
                    d += (i === 0 ? 'M' : 'L') + `${px.toFixed(1)} ${py.toFixed(1)} `;
                }
                return d + 'Z';
            }
            case 'roundedRectangle':
            case 'parallelogram':
            case 'trapezium':
            case 'hexagon':
            case 'heptagon':
            case 'pie':
            case 'chord':
            case 'teardrop':
            case 'lShape':
            case 'can':
            case 'plaque':
            case 'cube':
            case 'doughnut':
            case 'blockArc':
            case 'brace':
            case 'bracket':
            case 'bentArrow':
            case 'uTurnArrow':
            case 'quadArrow':
            case 'upDownArrow':
            case 'upArrowCallout':
            case 'elbowArrowConnector':
                return StageObject.getCustomShapePathData(obj, false);
            case 'icon':
                // Already SVG path data — transform from icon viewBox to absolute coords
                if (!obj.iconPath) return null;
                return this._transformIconPath(obj);
            case 'freeform': {
                if (!obj.pathPoints || obj.pathPoints.length < 2) return null;
                let d = `M${obj.pathPoints[0].x.toFixed(1)} ${obj.pathPoints[0].y.toFixed(1)}`;
                for (let i = 1; i < obj.pathPoints.length; i++) {
                    d += ` L${obj.pathPoints[i].x.toFixed(1)} ${obj.pathPoints[i].y.toFixed(1)}`;
                }
                return d + ' Z';
            }
            default:
                return null;
        }
    },

    /**
     * Transform an icon's SVG path from its viewBox space to absolute stage coordinates.
     */
    _transformIconPath(obj) {
        const vb = (obj.iconViewBox || '0 0 100 100').split(' ').map(Number);
        const vbX = vb[0] || 0, vbY = vb[1] || 0;
        const vbW = vb[2] || 100, vbH = vb[3] || 100;
        const sx = obj.width / vbW, sy = obj.height / vbH;
        const subPaths = obj.iconPath.split('|');
        const transformed = subPaths.map(sp => {
            return sp.trim().replace(/([MLHVCSQTAZ])\s*/gi, '\n$1').split('\n').filter(Boolean).map(cmd => {
                const type = cmd[0];
                const nums = cmd.slice(1).trim().split(/[\s,]+/).map(Number);
                if (type === 'Z' || type === 'z') return 'Z';
                // Transform coordinate pairs
                const out = [];
                for (let i = 0; i < nums.length; i += 2) {
                    if (i + 1 < nums.length) {
                        out.push(((nums[i] - vbX) * sx + obj.x).toFixed(1));
                        out.push(((nums[i + 1] - vbY) * sy + obj.y).toFixed(1));
                    }
                }
                // Handle arc commands specially
                if (type === 'A' || type === 'a') {
                    // A rx ry x-rot large-arc sweep x y
                    const result = [];
                    for (let i = 0; i < nums.length; i += 7) {
                        result.push(`A${(nums[i] * sx).toFixed(1)} ${(nums[i+1] * sy).toFixed(1)} ${nums[i+2]} ${nums[i+3]} ${nums[i+4]} ${((nums[i+5] - vbX) * sx + obj.x).toFixed(1)} ${((nums[i+6] - vbY) * sy + obj.y).toFixed(1)}`);
                    }
                    return result.join(' ');
                }
                return type + out.join(' ');
            }).join(' ');
        });
        return transformed.join('|');
    },

    /**
     * Normalize absolute-coordinate paths into a 100×100 viewBox.
     * Takes an array of path strings, computes bounding box, scales/translates to fit.
     */
    _normalizePathsToViewBox(pathStrings, padding = 4) {
        // Parse all coordinates to find bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        const allNums = [];
        pathStrings.forEach(ps => {
            const nums = ps.match(/-?\d+\.?\d*/g);
            if (nums) allNums.push(...nums.map(Number));
        });
        // Extract x,y pairs from path commands
        pathStrings.forEach(ps => {
            ps.replace(/([MLCSQTA])\s*([-\d.,\s]+)/gi, (_, cmd, coords) => {
                const nums = coords.trim().split(/[\s,]+/).map(Number);
                if (cmd.toUpperCase() === 'A') {
                    for (let i = 0; i < nums.length; i += 7) {
                        if (i + 6 < nums.length) {
                            minX = Math.min(minX, nums[i + 5]); maxX = Math.max(maxX, nums[i + 5]);
                            minY = Math.min(minY, nums[i + 6]); maxY = Math.max(maxY, nums[i + 6]);
                        }
                    }
                } else {
                    for (let i = 0; i < nums.length; i += 2) {
                        if (i + 1 < nums.length) {
                            minX = Math.min(minX, nums[i]); maxX = Math.max(maxX, nums[i]);
                            minY = Math.min(minY, nums[i + 1]); maxY = Math.max(maxY, nums[i + 1]);
                        }
                    }
                }
            });
        });

        if (!isFinite(minX)) return pathStrings.join('|');

        const bw = maxX - minX || 1, bh = maxY - minY || 1;
        const target = 100 - padding * 2;
        const scale = Math.min(target / bw, target / bh);
        const offX = padding + (target - bw * scale) / 2 - minX * scale;
        const offY = padding + (target - bh * scale) / 2 - minY * scale;

        return pathStrings.map(ps => {
            return ps.replace(/([MLCSQTA])\s*([-\d.,\s]+)/gi, (match, cmd, coords) => {
                const nums = coords.trim().split(/[\s,]+/).map(Number);
                if (cmd.toUpperCase() === 'A') {
                    const out = [];
                    for (let i = 0; i < nums.length; i += 7) {
                        out.push(`${(nums[i] * scale).toFixed(1)} ${(nums[i+1] * scale).toFixed(1)} ${nums[i+2]} ${nums[i+3]} ${nums[i+4]} ${(nums[i+5] * scale + offX).toFixed(1)} ${(nums[i+6] * scale + offY).toFixed(1)}`);
                    }
                    return cmd + out.join(' ');
                }
                const out = [];
                for (let i = 0; i < nums.length; i += 2) {
                    if (i + 1 < nums.length) {
                        out.push(`${(nums[i] * scale + offX).toFixed(1)} ${(nums[i+1] * scale + offY).toFixed(1)}`);
                    }
                }
                return cmd + out.join(' ');
            });
        }).join('|');
    },

    /**
     * Convert selected objects to a custom icon and save to the library.
     */
    saveSelectedAsIcon() {
        const selected = this.getSelectedObjects();
        if (selected.length === 0) return;

        // Convert each selected shape to path data in absolute coordinates
        const absolutePaths = [];
        for (const obj of selected) {
            // Apply rotation transform if object is rotated
            const path = this._shapeToAbsolutePath(obj);
            if (path) {
                // Handle pipe-separated multi-paths from icons
                path.split('|').forEach(p => absolutePaths.push(p.trim()));
            }
        }

        if (absolutePaths.length === 0) {
            alert('Selected objects cannot be converted to icon paths.\nSupported: built-in shapes, advanced shapes, icon, and freeform.');
            return;
        }

        // Normalize to 100×100 viewBox
        const combinedPath = this._normalizePathsToViewBox(absolutePaths);

        // Prompt for name
        const name = prompt('Enter a name for your custom icon:', 'Custom Icon');
        if (!name) return;

        // Save to custom icons
        this._saveCustomIcon(name.trim(), combinedPath);
    },

    /**
     * Save a custom icon to localStorage and update the UI.
     */
    _saveCustomIcon(name, path) {
        const customs = JSON.parse(localStorage.getItem('customIcons') || '[]');
        const icon = { name, path, id: Date.now().toString(36) };
        customs.push(icon);
        localStorage.setItem('customIcons', JSON.stringify(customs));
        this._addCustomIconToGrid(icon);
        this._updateCustomIconCount();
    },

    /**
     * Add a single custom icon button to the grid.
     */
    _addCustomIconToGrid(icon) {
        const grid = document.getElementById('icon-grid-custom');
        if (!grid) return;
        const btn = document.createElement('button');
        btn.className = 'icon-btn custom-icon-btn';
        btn.title = icon.name;
        btn.dataset.iconName = icon.name;
        btn.dataset.iconPath = icon.path;
        btn.dataset.iconId = icon.id;
        btn.dataset.iconKeywords = `${(icon.name || '').toLowerCase()} custom`;
        const preview = StageObject.buildIconPreviewMarkup(icon.path, icon.viewBox || '0 0 100 100');
        btn.dataset.iconMode = preview.previewMode;
        btn.innerHTML = `${preview.markup}<span class="custom-icon-delete" title="Delete icon">&times;</span>`;

        const self = this;
        btn.addEventListener('click', async (e) => {
            if (e.target.closest('.custom-icon-delete')) {
                e.stopPropagation();
                if (await Utils.showConfirm(`Delete custom icon "${icon.name}"?`)) {
                    self._deleteCustomIcon(icon.id);
                    btn.remove();
                    self._updateCustomIconCount();
                }
                return;
            }
            self._insertIcon(icon);
        });
        grid.appendChild(btn);
    },

    /**
     * Delete a custom icon from localStorage.
     */
    _deleteCustomIcon(id) {
        let customs = JSON.parse(localStorage.getItem('customIcons') || '[]');
        customs = customs.filter(c => c.id !== id);
        localStorage.setItem('customIcons', JSON.stringify(customs));
    },

    /**
     * Load all custom icons from localStorage into the grid.
     */
    _loadCustomIcons() {
        const customs = JSON.parse(localStorage.getItem('customIcons') || '[]');
        customs.forEach(icon => this._addCustomIconToGrid(icon));
        this._updateCustomIconCount();
    },

    /**
     * Update the custom icon count badge.
     */
    _updateCustomIconCount() {
        const customs = JSON.parse(localStorage.getItem('customIcons') || '[]');
        const el = document.querySelector('.custom-icon-count');
        if (el) el.textContent = customs.length > 0 ? `(${customs.length})` : '';
        // Show/hide the custom category
        const cat = document.getElementById('icon-cat-custom');
        if (cat) cat.style.display = customs.length > 0 ? '' : 'none';
    },

    initAnimatedParts() {
        // Uses AnimationPartsLibrary (from animation-parts.js) for all part data
        if (typeof animationPartsLibrary === 'undefined') return;

        const toggle = document.querySelector('.anim-parts-toggle');
        const panel = document.querySelector('.anim-parts-panel');
        if (!toggle || !panel) return;

        toggle.addEventListener('click', () => {
            const isOpen = getComputedStyle(panel).display !== 'none';
            panel.style.display = isOpen ? 'none' : 'block';
            toggle.classList.toggle('open', !isOpen);
        });

        // Category mapping: library category → grid element id
        const catGridMap = {
            saved: 'ap-grid-saved',
            characters: 'ap-grid-characters',
            limbs: 'ap-grid-limbs',
            face: 'ap-grid-face',
            animal: 'ap-grid-animal',
            actions: 'ap-grid-actions'
        };

        this._animPartsUi = { toggle, panel, catGridMap };
        this._renderAnimatedPartsLibrary();
        this._bindAnimatedPartSettings();
        this._syncAnimatedPartSettings();

        eventBus.on('selection:changed', () => this._syncAnimatedPartSettings());
        eventBus.on('object:updated', () => this._syncAnimatedPartSettings());
    },

    _renderAnimatedPartsLibrary() {
        if (!this._animPartsUi || typeof animationPartsLibrary === 'undefined') return;

        Object.entries(this._animPartsUi.catGridMap).forEach(([cat, gridId]) => {
            const grid = document.getElementById(gridId);
            if (!grid) return;
            grid.innerHTML = '';
            animationPartsLibrary.getByCategory(cat).forEach(part => {
                const btn = document.createElement('button');
                btn.className = 'icon-btn';
                btn.title = part.userPreset ? `${part.name} (saved preset)` : part.name;
                const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
                svg.setAttribute('viewBox', '0 0 50 65');
                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', part.preview || 'M12 12 L38 12 L38 52 L12 52 Z');
                svg.appendChild(path);
                btn.appendChild(svg);
                btn.addEventListener('click', () => this._insertAnimatedPart(part));
                grid.appendChild(btn);
            });
        });
    },

    _bindAnimatedPartSettings() {
        const controls = [
            { id: 'ap-setting-speed', key: 'speedMultiplier', format: v => `${v.toFixed(2)}x` },
            { id: 'ap-setting-distance', key: 'distanceMultiplier', format: v => `${v.toFixed(2)}x` },
            { id: 'ap-setting-bounce', key: 'bounceMultiplier', format: v => `${v.toFixed(2)}x` },
            { id: 'ap-setting-depth', key: 'depthStrength', format: v => v.toFixed(2) },
            { id: 'ap-setting-far-scale', key: 'farScale', format: v => `${v.toFixed(2)}x` },
            { id: 'ap-setting-near-scale', key: 'nearScale', format: v => `${v.toFixed(2)}x` },
            { id: 'ap-setting-approach-lift', key: 'approachLift', format: v => `${Math.round(v)}px` },
            { id: 'ap-setting-head-pitch', key: 'headPitch', format: v => v.toFixed(2) },
            { id: 'ap-setting-torso-pitch', key: 'torsoPitch', format: v => v.toFixed(2) }
        ];

        controls.forEach(({ id, key, format }) => {
            const el = document.getElementById(id);
            const valEl = document.getElementById(`${id}-val`);
            el?.addEventListener('input', () => {
                const value = parseFloat(el.value);
                if (valEl) valEl.textContent = format(value);
            });
            el?.addEventListener('change', () => {
                this._applyAnimatedPartSettings({ [key]: parseFloat(el.value) });
            });
        });

        document.getElementById('ap-edit-pieces')?.addEventListener('click', () => {
            const ctx = this._getSelectedAnimatedPartContext();
            if (!ctx) {
                Utils.showToast('Select an animated part group first', 'warning');
                return;
            }
            this.enterGroupEditMode(ctx.groupId);
        });

        document.getElementById('ap-save-preset')?.addEventListener('click', () => {
            this.saveSelectedAnimatedPartAsPreset();
        });

        document.getElementById('ap-rename-preset')?.addEventListener('click', () => {
            this.renameSelectedAnimatedPartPreset();
        });

        document.getElementById('ap-delete-preset')?.addEventListener('click', () => {
            this.deleteSelectedAnimatedPartPreset();
        });
    },

    _getSelectedAnimatedPartContext() {
        const selected = this.getSelectedObjects();
        if (!selected.length) return null;

        const groupId = selected.length > 1
            ? this._getSelectedGroupId()
            : selected[0].groupId;
        if (!groupId || !this.groups[groupId]) return null;

        const members = this.groups[groupId]
            .map(id => this.objects.find(o => o.id === id))
            .filter(Boolean);
        if (!members.length || !members.every(obj => obj.animatedPart)) return null;

        const meta = members[0].animatedPart;
        return { groupId, members, meta };
    },

    _syncAnimatedPartSettings() {
        const panel = document.getElementById('anim-parts-settings');
        const nameEl = document.getElementById('anim-parts-settings-name');
        const ctx = this._getSelectedAnimatedPartContext();

        if (!panel || !nameEl) return;
        if (!ctx) {
            panel.classList.add('hidden');
            nameEl.textContent = 'No animated part selected';
            return;
        }

        panel.classList.remove('hidden');
        nameEl.textContent = this.groupNames[ctx.groupId] || ctx.meta.partName || 'Animated Part';

        const settings = ctx.meta.settings || {};
        const values = {
            'ap-setting-speed': settings.speedMultiplier ?? 1,
            'ap-setting-distance': settings.distanceMultiplier ?? 1,
            'ap-setting-bounce': settings.bounceMultiplier ?? 1,
            'ap-setting-depth': settings.depthStrength ?? 0,
            'ap-setting-far-scale': settings.farScale ?? 1,
            'ap-setting-near-scale': settings.nearScale ?? 1,
            'ap-setting-approach-lift': settings.approachLift ?? 0,
            'ap-setting-head-pitch': settings.headPitch ?? 0,
            'ap-setting-torso-pitch': settings.torsoPitch ?? 0
        };
        Object.entries(values).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = value;
            const valEl = document.getElementById(`${id}-val`);
            if (valEl) {
                if (id === 'ap-setting-depth' || id === 'ap-setting-head-pitch' || id === 'ap-setting-torso-pitch') {
                    valEl.textContent = Number(value).toFixed(2);
                } else if (id === 'ap-setting-approach-lift') {
                    valEl.textContent = `${Math.round(Number(value))}px`;
                } else {
                    valEl.textContent = `${Number(value).toFixed(2)}x`;
                }
            }
        });

        const sourcePart = typeof animationPartsLibrary !== 'undefined'
            ? animationPartsLibrary.get(ctx.meta.partId)
            : null;
        const canManageSavedPreset = !!sourcePart?.userPreset || ctx.meta.partCategory === 'saved';
        const renameBtn = document.getElementById('ap-rename-preset');
        const deleteBtn = document.getElementById('ap-delete-preset');
        if (renameBtn) renameBtn.disabled = !canManageSavedPreset;
        if (deleteBtn) deleteBtn.disabled = !canManageSavedPreset;
    },

    _applyAnimatedPartSettings(patch) {
        const ctx = this._getSelectedAnimatedPartContext();
        if (!ctx) return;

        ctx.members.forEach(obj => {
            const meta = obj.animatedPart || {};
            meta.settings = {
                speedMultiplier: 1,
                distanceMultiplier: 1,
                bounceMultiplier: 1,
                depthStrength: 0,
                farScale: meta.baseRootMotion?.scaleFrom ?? 1,
                nearScale: meta.baseRootMotion?.scaleTo ?? 1,
                approachLift: meta.baseRootMotion?.approachY ?? 0,
                headPitch: 0,
                torsoPitch: 0,
                ...(meta.settings || {}),
                ...patch
            };
            obj.animatedPart = meta;

            const pieceName = String(obj.name || meta.pieceName || '').toLowerCase();
            const isHead = pieceName.includes('head');
            const isTorso = pieceName.includes('torso') || pieceName.includes('shoulder') || pieceName.includes('neck') || pieceName.includes('body');
            const pitchAmount = isHead
                ? (meta.settings.headPitch || 0)
                : (isTorso ? (meta.settings.torsoPitch || 0) : 0);
            const pitchScaleX = 1 + pitchAmount * (isHead ? 0.22 : 0.16);
            const pitchScaleY = Math.max(0.35, 1 - pitchAmount * (isHead ? 0.16 : 0.12));
            obj.scaleX = (meta.baseScaleX ?? 1) * pitchScaleX;
            obj.scaleY = (meta.baseScaleY ?? 1) * pitchScaleY;

            obj.animations.forEach(anim => {
                if (!anim.generated || anim.generated.type !== 'part-keyframe') return;
                const baseDuration = meta.baseDuration || anim.generated.duration || 1000;
                const speedMultiplier = meta.settings.speedMultiplier || 1;
                const nextDuration = baseDuration / speedMultiplier;
                anim.params = anim.params || {};
                anim.params.duration = nextDuration / 1000;
                anim.generated.duration = nextDuration;

                const baseRoot = meta.baseRootMotion ? JSON.parse(JSON.stringify(meta.baseRootMotion)) : null;
                const farScale = meta.settings.farScale ?? (baseRoot?.scaleFrom ?? 1);
                const nearScale = meta.settings.nearScale ?? (baseRoot?.scaleTo ?? 1);
                const approachLift = meta.settings.approachLift ?? (baseRoot?.approachY ?? 0);
                const shouldCreateRootMotion = !!baseRoot
                    || (meta.settings.depthStrength > 0)
                    || farScale !== 1
                    || nearScale !== 1
                    || approachLift !== 0;

                if (shouldCreateRootMotion && baseRoot) {
                    baseRoot.speed = (baseRoot.speed || 0) * (meta.settings.distanceMultiplier || 1);
                    baseRoot.bounce = (baseRoot.bounce || 0) * (meta.settings.bounceMultiplier || 1);
                    baseRoot.depthStrength = meta.settings.depthStrength || 0;
                    baseRoot.scaleFrom = farScale;
                    baseRoot.scaleTo = nearScale;
                    baseRoot.approachY = approachLift;
                    if ((baseRoot.scaleFrom !== baseRoot.scaleTo || baseRoot.approachY !== 0) && !baseRoot.depthProgressMode) {
                        baseRoot.depthProgressMode = 'forward';
                    }
                    anim.generated.rootMotion = baseRoot;
                } else if (shouldCreateRootMotion) {
                    anim.generated.rootMotion = {
                        enabled: true,
                        speed: 0,
                        bounce: 0,
                        sway: 0,
                        depthStrength: meta.settings.depthStrength,
                        scaleFrom: farScale,
                        scaleTo: nearScale,
                        approachY: approachLift,
                        depthProgressMode: 'forward'
                    };
                } else {
                    anim.generated.rootMotion = null;
                }
            });
        });

        this.stage.requestRender();
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        this._syncAnimatedPartSettings();
    },

    renameSelectedAnimatedPartPreset() {
        const ctx = this._getSelectedAnimatedPartContext();
        if (!ctx || typeof animationPartsLibrary === 'undefined') {
            Utils.showToast('Select a saved animated preset first', 'warning');
            return;
        }

        const sourcePart = animationPartsLibrary.get(ctx.meta.partId);
        if (!sourcePart?.userPreset) {
            Utils.showToast('Only saved animated presets can be renamed', 'warning');
            return;
        }

        const nextName = prompt('Rename saved animated preset:', sourcePart.name);
        if (nextName == null) return;

        const trimmed = nextName.trim();
        if (!trimmed) {
            Utils.showToast('Preset name cannot be empty', 'warning');
            return;
        }

        const renamed = animationPartsLibrary.renameUserPreset(sourcePart.id, trimmed);
        if (!renamed) {
            Utils.showToast('Unable to rename preset', 'error');
            return;
        }

        ctx.members.forEach(obj => {
            if (obj.animatedPart) obj.animatedPart.partName = trimmed;
        });
        this.groupNames[ctx.groupId] = trimmed;
        this.updateObjectList();
        this._renderAnimatedPartsLibrary();
        this._syncAnimatedPartSettings();
        eventBus.emit('history:push');
        Utils.showToast(`Renamed saved preset to "${trimmed}"`, 'success');
    },

    async deleteSelectedAnimatedPartPreset() {
        const ctx = this._getSelectedAnimatedPartContext();
        if (!ctx || typeof animationPartsLibrary === 'undefined') {
            Utils.showToast('Select a saved animated preset first', 'warning');
            return;
        }

        const sourcePart = animationPartsLibrary.get(ctx.meta.partId);
        if (!sourcePart?.userPreset) {
            Utils.showToast('Only saved animated presets can be deleted', 'warning');
            return;
        }

        const confirmed = await Utils.showConfirm(`Delete saved preset "${sourcePart.name}" from the library? Existing stage objects will remain.`);
        if (!confirmed) return;

        if (!animationPartsLibrary.deleteUserPreset(sourcePart.id)) {
            Utils.showToast('Unable to delete preset', 'error');
            return;
        }

        this._renderAnimatedPartsLibrary();
        this._syncAnimatedPartSettings();
        Utils.showToast(`Deleted saved preset "${sourcePart.name}"`, 'success');
    },

    saveSelectedAnimatedPartAsPreset() {
        const ctx = this._getSelectedAnimatedPartContext();
        if (!ctx) {
            Utils.showToast('Select an animated part group to save as a preset', 'warning');
            return;
        }

        const bounds = this.getGroupBounds(ctx.groupId);
        if (!bounds) return;

        const centerX = bounds.x + bounds.width / 2;
        const centerY = bounds.y + bounds.height / 2;
        const members = [...ctx.members].sort((a, b) => this.objects.indexOf(a) - this.objects.indexOf(b));
        const sourcePart = animationPartsLibrary.get(ctx.meta.partId);
        const pieces = members.map((obj, index) => ({
            name: obj.name,
            path: obj.iconPath,
            viewBox: obj.iconViewBox || '0 0 100 100',
            oX: obj.x + obj.width / 2 - centerX,
            oY: obj.y + obj.height / 2 - centerY,
            w: obj.width,
            h: obj.height,
            pvX: obj.pivotX,
            pvY: obj.pivotY,
            zIndex: index,
            fill: obj.fill,
            stroke: obj.stroke,
            scaleX: obj.scaleX ?? 1,
            scaleY: obj.scaleY ?? 1,
            flipH: obj.flipH ?? false,
            flipV: obj.flipV ?? false
        }));
        const keyframes = {};
        members.forEach((obj, index) => {
            const anim = obj.animations.find(a => a.generated && a.generated.type === 'part-keyframe');
            if (anim?.generated?.keyframes) keyframes[index] = JSON.parse(JSON.stringify(anim.generated.keyframes));
        });

        const presetName = (this.groupNames[ctx.groupId] || `${ctx.meta.partName} Custom`).trim();
        const sourceAnimation = members[0]?.animations.find(a => a.generated && a.generated.type === 'part-keyframe');
        const duration = sourceAnimation?.generated?.duration || ctx.meta.baseDuration || 1000;
        const rootMotion = sourceAnimation?.generated?.rootMotion || null;
        const repeatMode = sourceAnimation?.repeatMode || ctx.meta.baseRepeatMode || sourcePart?.repeatMode || 'cycle';

        animationPartsLibrary.saveUserPreset({
            id: `user-${Utils.generateId('apart')}`,
            type: 'character',
            subtype: 'user-preset',
            name: presetName,
            desc: `Saved animated preset based on ${ctx.meta.partName}`,
            category: 'saved',
            tags: [...new Set([...(sourcePart?.tags || []), 'custom', 'saved'])],
            preview: sourcePart?.preview || members[0]?.iconPath || 'M12 12 L38 12 L38 52 L12 52 Z',
            duration,
            repeatMode,
            rootMotion: rootMotion ? JSON.parse(JSON.stringify(rootMotion)) : null,
            pieces,
            keyframes
        });

        this._renderAnimatedPartsLibrary();
        Utils.showToast(`Saved animated preset "${presetName}"`, 'success');
    },

    _insertAnimatedPart(part) {
        const cx = this.stage.width / 2;
        const cy = this.stage.height / 2;
        const ids = [];

        // Sort pieces by zIndex for correct layering (lowest first = drawn first = behind)
        const sortedPieces = part.pieces.map((p, i) => ({ ...p, _idx: i }))
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

        sortedPieces.forEach(piece => {
            const idx = piece._idx;
            const obj = new StageObject('icon', {
                name: piece.name,
                x: cx + piece.oX - piece.w / 2,
                y: cy + piece.oY - piece.h / 2,
                width: piece.w,
                height: piece.h,
                fill: piece.fill || '#4a90d9',
                stroke: piece.stroke || '#1a3a5c',
                strokeWidth: 1,
                iconPath: piece.path,
                iconViewBox: piece.viewBox || '0 0 100 100',
                pivotX: piece.pvX,
                pivotY: piece.pvY,
                scaleX: piece.scaleX ?? 1,
                scaleY: piece.scaleY ?? 1,
                flipH: piece.flipH ?? false,
                flipV: piece.flipV ?? false,
                animatedPart: {
                    partId: part.id,
                    partName: part.name,
                    partCategory: part.category,
                    pieceIndex: idx,
                    pieceName: piece.name,
                    baseDuration: part.duration,
                    baseRepeatMode: part.repeatMode || 'cycle',
                    baseScaleX: piece.scaleX ?? 1,
                    baseScaleY: piece.scaleY ?? 1,
                    baseRootMotion: part.rootMotion ? JSON.parse(JSON.stringify(part.rootMotion)) : null,
                    settings: {
                        speedMultiplier: 1,
                        distanceMultiplier: 1,
                        bounceMultiplier: 1,
                        depthStrength: part.rootMotion?.depthStrength || 0,
                        farScale: part.rootMotion?.scaleFrom ?? 1,
                        nearScale: part.rootMotion?.scaleTo ?? 1,
                        approachLift: part.rootMotion?.approachY ?? 0,
                        headPitch: 0,
                        torsoPitch: 0
                    }
                }
            });

            // Build keyframe-based animation from part data
            const pieceKFs = part.keyframes[idx];
            if (pieceKFs) {
                obj.animations.push({
                    id: Utils.generateId('anim'),
                    type: 'part-keyframe',
                    name: part.name + ' — ' + piece.name,
                    params: { duration: part.duration / 1000 },
                    delay: 0,
                    repeat: '-1',
                    repeatMode: part.repeatMode || 'cycle',
                    trigger: 'onLoad',
                    startMode: 'from-start',
                    generated: {
                        type: 'part-keyframe',
                        duration: part.duration,
                        keyframes: pieceKFs,
                        rootMotion: part.rootMotion || null
                    }
                });
            }

            this.addObject(obj);
            ids.push(obj.id);
        });

        // Group the pieces together
        if (ids.length > 1) {
            this.select(ids);
            this.groupSelected();
            const groupId = this._getSelectedGroupId();
            if (groupId) {
                this.groupNames[groupId] = part.name;
                this.updateObjectList();
            }
        } else {
            this.select(ids);
        }
        this.setTool('select');
        this._syncAnimatedPartSettings();
        Utils.showToast(`Added "${part.name}" — edit points & colors to match your image`, 'success');
    },

    finalizePath() {
        if (this.currentPath.length >= 2) {
            const bounds = this.getPathBounds(this.currentPath);
            const obj = new StageObject('path', {
                x: bounds.x, y: bounds.y,
                width: bounds.width, height: bounds.height,
                pathPoints: this.currentPath,
                fill: '#4a90d9',
                stroke: '#4a90d9',
                strokeWidth: 2
            });
            this.addObject(obj);
            this.select([obj.id]);
        }
        this.isDrawingPath = false;
        this.currentPath = [];
        this.stage.requestRender();
    },

    finalizeTrace(forceClose) {
        const points = this.currentTracePath;
        // Clear state first to prevent re-entrant calls from setTool
        this.isDrawingTrace = false;
        this.currentTracePath = [];
        this._tracePreviewPos = null;

        if (points.length >= 2) {
            const closed = !!forceClose;

            // Deep-clone points preserving segmentType
            const finalPts = points.map(p => ({
                x: p.x, y: p.y,
                ...(p.segmentType ? { segmentType: p.segmentType } : {})
            }));

            const bounds = this.getPathBounds(finalPts);
            const obj = new StageObject('freeform', {
                x: bounds.x, y: bounds.y,
                width: bounds.width, height: bounds.height,
                pathPoints: finalPts,
                closedPath: closed,
                fill: closed ? '#4a90d9' : 'transparent',
                stroke: '#4a90d9',
                strokeWidth: 2
            });
            this.addObject(obj);
            this.select([obj.id]);
            this.setTool('select');
        }
        this.stage.requestRender();
    },

    // Toggle segment type of the nearest trace point's incoming segment
    _toggleTraceSegmentType(pos) {
        const tp = this.currentTracePath;
        // Find the closest point to the right-click
        let bestIdx = -1, bestDist = Infinity;
        for (let i = 1; i < tp.length; i++) {
            const d = Math.hypot(pos.x - tp[i].x, pos.y - tp[i].y);
            if (d < bestDist) { bestDist = d; bestIdx = i; }
        }
        // Also check segments (edges) — find which segment is closest
        let bestSegIdx = -1, bestSegDist = Infinity;
        for (let i = 0; i < tp.length - 1; i++) {
            const d = this._distToSegment(pos.x, pos.y, tp[i].x, tp[i].y, tp[i + 1].x, tp[i + 1].y);
            if (d < bestSegDist) { bestSegDist = d; bestSegIdx = i; }
        }
        // Prefer edge click — toggle the destination point's type
        const idx = (bestSegDist < 20 && bestSegIdx >= 0) ? bestSegIdx + 1 : bestIdx;
        if (idx >= 1) {
            const pt = tp[idx];
            pt.segmentType = pt.segmentType === 'straight' ? undefined : 'straight';
            const label = pt.segmentType === 'straight' ? 'Straight' : 'Curve';
            Utils.showToast(`Segment → ${label}`, 'info');
            this.stage.requestRender();
        }
    },

    getPathBounds(points) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(p => {
            minX = Math.min(minX, p.x);
            minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x);
            maxY = Math.max(maxY, p.y);
        });
        return {
            x: minX, y: minY,
            width: maxX - minX || 1,
            height: maxY - minY || 1
        };
    },

    // Object management
    addObject(obj) {
        // Assign to active layer if not already set
        if (!obj.layer || obj.layer === 0) {
            obj.layer = this.activeLayerId;
        }
        this.objects.push(obj);
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('object:added', obj);
        if (!this._suppressHistory) eventBus.emit('history:push');
        // Suppress per-object toast during batch operations (UC creation, undo/redo, etc.)
        if (!this._suppressHistory) Utils.showToast(`Added ${obj.name}`, 'success');
    },

    removeObject(id) {
        const index = this.objects.findIndex(o => o.id === id);
        if (index !== -1) {
            const obj = this.objects.splice(index, 1)[0];
            this.selectedIds = this.selectedIds.filter(sid => sid !== id);
            if (this.selectionAnchorId === id) {
                this.selectionAnchorId = this.selectedIds[0] || null;
            }
            this.updateObjectList();
            this.updateProperties();
            this.stage.requestRender();
            eventBus.emit('object:removed', obj);
            if (!this._suppressHistory) eventBus.emit('history:push');
            // Update animated GIF flag on stage
            if (obj.isAnimatedGif || obj.isSpriteSequence) {
                this.stage._hasAnimatedGifs = this.objects.some(o => (o.isAnimatedGif && o._gifFrames) || o.isSpriteSequence);
            }
        }
    },

    getObjectById(id) {
        return this.objects.find(o => o.id === id);
    },

    // Selection
    select(ids) {
        this.selectedIds = [...ids];
        this.selectionAnchorId = ids.length > 0 ? (this.selectionAnchorId && ids.includes(this.selectionAnchorId) ? this.selectionAnchorId : ids[0]) : null;
        this.updateProperties();
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('selection:changed', ids);
    },

    toggleSelection(id) {
        if (this.selectedIds.includes(id)) {
            this.selectedIds = this.selectedIds.filter(sid => sid !== id);
            if (this.selectionAnchorId === id) {
                this.selectionAnchorId = this.selectedIds[0] || null;
            }
        } else {
            this.selectedIds.push(id);
            this.selectionAnchorId = id;
        }
        this.updateProperties();
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('selection:changed', this.selectedIds);
    },

    selectAll() {
        this.select(this.objects.map(o => o.id));
    },

    getSelectedObjects() {
        return this.selectedIds.map(id => this.getObjectById(id)).filter(Boolean);
    },

    selectInBox() {
        if (!this.selectStart || !this.selectEnd) return;
        const minX = Math.min(this.selectStart.x, this.selectEnd.x);
        const minY = Math.min(this.selectStart.y, this.selectEnd.y);
        const maxX = Math.max(this.selectStart.x, this.selectEnd.x);
        const maxY = Math.max(this.selectStart.y, this.selectEnd.y);

        const ids = [];
        this.objects.forEach(obj => {
            const b = obj.getBounds();
            if (b.x >= minX && b.y >= minY && b.right <= maxX && b.bottom <= maxY) {
                ids.push(obj.id);
            }
        });
        this.select(ids);
    },

    // Hit test for joint indicators on selected objects
    _hitTestJoint(pos) {
        const selected = this.getSelectedObjects();
        const threshold = 8 / this.stage.zoom;
        for (const obj of selected) {
            if (!obj.joints || obj.joints.length === 0) continue;
            for (const jt of obj.joints) {
                const wp = obj.getJointWorldPosition(jt);
                const dx = pos.x - wp.x, dy = pos.y - wp.y;
                if (Math.sqrt(dx * dx + dy * dy) < threshold) {
                    return { obj, joint: jt, worldPos: wp };
                }
            }
        }
        return null;
    },

    // Hit testing
    hitTest(x, y) {
        // Match the actual render order so a front character is also selected first.
        const drawList = typeof this._orderObjectsByAnimatedLayer === 'function'
            ? this._orderObjectsByAnimatedLayer(
                this.objects,
                typeof this._getLayerOrderAnimObjectIds === 'function'
                    ? this._getLayerOrderAnimObjectIds()
                    : new Set()
            )
            : this.objects;
        for (let i = drawList.length - 1; i >= 0; i--) {
            const obj = drawList[i];
            if (!obj.visible || obj.locked) continue;
            // Skip objects on hidden or locked layers
            if (!this.isObjectLayerVisible(obj) || this.isObjectLayerLocked(obj)) continue;
            if (obj.containsPoint(x, y)) return obj;
        }
        return null;
    },

    // Object operations
    deleteSelected() {
        const ids = [...this.selectedIds];
        ids.forEach(id => this.removeObject(id));
        if (ids.length > 0) eventBus.emit('history:push');
    },

    duplicateSelected() {
        const payload = this._buildSelectionTransferPayload();
        if (!payload) {
            Utils.showToast('No objects selected', 'info');
            return;
        }

        const center = this._getTransferPayloadCenter(payload);
        const clonePayload = this._applyTransferNameSuffix(payload, ' (copy)');
        this._insertImportedObjects(clonePayload, {
            position: { x: center.x + 20, y: center.y + 20 },
            pushHistory: false,
            showToast: false
        });
        eventBus.emit('history:push');

        if (clonePayload.group && clonePayload.objects.length > 1) {
            Utils.showToast(`Duplicated group "${clonePayload.group.name || 'Group'}"`, 'success');
        } else {
            Utils.showToast(`Duplicated ${clonePayload.objects.length} object(s)`, 'success');
        }
    },

    copySelected() {
        const payload = this._buildSelectionTransferPayload();
        if (!payload) return;

        this._clipboardPayload = payload;
        this._clipboard = payload.objects.map(obj => JSON.parse(JSON.stringify(obj)));
        this._clipboardStagePos = this._getTransferPayloadCenter(payload);

        if (payload.group && payload.objects.length > 1) {
            Utils.showToast(`Copied group "${payload.group.name || 'Group'}"`, 'success');
        } else {
            Utils.showToast(`Copied ${payload.objects.length} object(s)`, 'success');
        }
    },

    cutSelected() {
        this.copySelected();
        if (this._clipboard.length > 0) {
            this.deleteSelected();
        }
    },

    pasteFromClipboard(stagePos) {
        const payload = this._clipboardPayload || (
            this._clipboard && this._clipboard.length
                ? { format: 'animstage-object', version: 1, objects: JSON.parse(JSON.stringify(this._clipboard)), group: null }
                : null
        );
        if (!payload || !payload.objects || payload.objects.length === 0) {
            Utils.showToast('Nothing to paste', 'info');
            return;
        }
        const clonePayload = this._applyTransferNameSuffix(payload, ' (copy)');
        const targetPos = stagePos || (this._clipboardStagePos
            ? { x: this._clipboardStagePos.x + 20, y: this._clipboardStagePos.y + 20 }
            : { x: this.stage.width / 2, y: this.stage.height / 2 });

        this._insertImportedObjects(clonePayload, {
            position: targetPos,
            pushHistory: false,
            showToast: false
        });
        eventBus.emit('history:push');

        if (clonePayload.group && clonePayload.objects.length > 1) {
            Utils.showToast(`Pasted group "${clonePayload.group.name || 'Group'}"`, 'success');
        } else {
            Utils.showToast(`Pasted ${clonePayload.objects.length} object(s)`, 'success');
        }
    },

    _buildTransferPayloadFromObjects(objects, groupMeta = null) {
        const ordered = [...objects]
            .filter(Boolean)
            .sort((a, b) => this.objects.indexOf(a) - this.objects.indexOf(b));
        if (!ordered.length) return null;
        return {
            format: 'animstage-object',
            version: 1,
            objects: ordered.map(obj => obj.toJSON()),
            group: groupMeta ? { ...groupMeta } : null
        };
    },

    _buildSelectionTransferPayload() {
        const selected = this.getSelectedObjects();
        if (!selected.length) return null;

        const groupId = this._getSelectedGroupId();
        if (groupId && this.groups[groupId]) {
            const members = this.groups[groupId]
                .map(id => this.getObjectById(id))
                .filter(Boolean);
            return this._buildTransferPayloadFromObjects(members, {
                id: groupId,
                name: this.groupNames?.[groupId] || groupId
            });
        }

        return this._buildTransferPayloadFromObjects(selected, null);
    },

    _getTransferPayloadCenter(payload) {
        const objs = payload?.objects || [];
        if (!objs.length) {
            return { x: this.stage.width / 2, y: this.stage.height / 2 };
        }
        let cx = 0;
        let cy = 0;
        objs.forEach(obj => {
            cx += (obj.x || 0) + (obj.width || 0) / 2;
            cy += (obj.y || 0) + (obj.height || 0) / 2;
        });
        return {
            x: cx / objs.length,
            y: cy / objs.length
        };
    },

    _applyTransferNameSuffix(payload, suffix) {
        const next = JSON.parse(JSON.stringify(payload));
        next.objects.forEach(obj => {
            const baseName = String(obj.name || obj.type || 'Object')
                .replace(/ \((copy|clone)\)$/i, '');
            obj.name = baseName + suffix;
        });
        if (next.group?.name) {
            next.group.name = String(next.group.name).replace(/ \((copy|clone)\)$/i, '') + suffix;
        }
        return next;
    },

    /**
     * Copy all properties of an object to the system clipboard.
     * Writes both human-readable text and a JSON payload that can
     * be used to create an exact clone via "Paste as Clone".
     */
    copyProperties(obj) {
        if (!obj) {
            const selected = this.getSelectedObjects();
            obj = selected[0];
        }
        if (!obj) { Utils.showToast('No object selected', 'warning'); return; }

        if (obj.groupId && this.groups[obj.groupId] && this._groupEditMode !== obj.groupId) {
            const groupId = obj.groupId;
            const members = this.groups[groupId]
                .map(id => this.getObjectById(id))
                .filter(Boolean)
                .sort((a, b) => this.objects.indexOf(a) - this.objects.indexOf(b));
            if (!members.length) {
                Utils.showToast('Selected group is empty', 'warning');
                return;
            }

            const payloadData = this._buildTransferPayloadFromObjects(members, {
                id: groupId,
                name: this.groupNames?.[groupId] || groupId
            });
            const bounds = this.getGroupBounds(groupId);
            const lines = [];
            lines.push(`=== ${payloadData.group?.name || 'Group'} — Group Properties ===`);
            lines.push('');
            lines.push(`Type:          Group`);
            lines.push(`Name:          ${payloadData.group?.name || groupId}`);
            lines.push(`Members:       ${members.length}`);
            lines.push(`Z Range:       ${this.objects.indexOf(members[0]) + 1} → ${this.objects.indexOf(members[members.length - 1]) + 1}`);
            if (bounds) {
                lines.push(`Position:      x=${Math.round(bounds.x)}, y=${Math.round(bounds.y)}`);
                lines.push(`Size:          ${Math.round(bounds.width)} × ${Math.round(bounds.height)}`);
            }
            lines.push('');
            lines.push('--- Group Members ---');
            members.forEach((member, index) => {
                lines.push(`  ${index + 1}. ${member.name || member.type} — ${member.type}`);
            });

            const marker = '\n\n<!-- ANIMSTAGE_PROPS:';
            const payload = marker + btoa(unescape(encodeURIComponent(JSON.stringify(StageObject.stripCompressionRuntimeState(payloadData))))) + ' -->';
            const clipboardText = lines.join('\n') + payload;

            navigator.clipboard.writeText(clipboardText).then(() => {
                Utils.showToast(`Properties copied for group "${payloadData.group?.name || 'Group'}"`, 'success');
            }).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = clipboardText;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                Utils.showToast(`Properties copied for group "${payloadData.group?.name || 'Group'}"`, 'success');
            });
            return;
        }

        const json = obj.toJSON();
        const bodyTags = Array.isArray(obj.bodyTags) ? obj.bodyTags : [];

        // Build human-readable summary
        const lines = [];
        lines.push(`=== ${obj.name || obj.type} — Properties ===`);
        lines.push('');
        lines.push(`Type:          ${obj.type}`);
        lines.push(`Name:          ${obj.name}`);
        const renderZ = this.objects.indexOf(obj);
        const displayZ = renderZ >= 0 ? (this.objects.length - renderZ) : -1;
        lines.push(`Object Row:    ${displayZ >= 0 ? displayZ : '?'} of ${this.objects.length} (1 = top of Object Window)`);
        lines.push(`Draw Z:        ${renderZ >= 0 ? renderZ + 1 : '?'} of ${this.objects.length} (higher = drawn in front)`);
        lines.push(`Depth:         ${obj.depth ?? 0}`);
        lines.push(`Position:      x=${Math.round(obj.x)}, y=${Math.round(obj.y)}`);
        lines.push(`Size:          ${Math.round(obj.width)} × ${Math.round(obj.height)}`);

        // Selection box corners (world-space, all transforms applied)
        const corners = obj.getTransformedRectPoints();
        if (corners && corners.length === 4) {
            lines.push('');
            lines.push('--- Selection Box Corners ---');
            lines.push(`Top-Left:      x=${Math.round(corners[0].x)}, y=${Math.round(corners[0].y)}`);
            lines.push(`Top-Right:     x=${Math.round(corners[1].x)}, y=${Math.round(corners[1].y)}`);
            lines.push(`Bottom-Right:  x=${Math.round(corners[2].x)}, y=${Math.round(corners[2].y)}`);
            lines.push(`Bottom-Left:   x=${Math.round(corners[3].x)}, y=${Math.round(corners[3].y)}`);
        }

        lines.push('');
        lines.push(`Rotation:      ${obj.rotation}°`);
        const stageAngleInfo = this.getObjectStageAngleInfo(obj);
        if (stageAngleInfo) {
            lines.push(`Stage Angle:   ${stageAngleInfo.angle360}°`);
            lines.push(`Stage ±180:    ${stageAngleInfo.angle180}°`);
            lines.push(`From Down:     ${stageAngleInfo.fromDown}°`);
        }
        if (obj.scaleX !== 1 || obj.scaleY !== 1) {
            lines.push(`Scale:         ${obj.scaleX}, ${obj.scaleY}`);
        }
        const hasJointPoseInfo = !!obj.bodyPartData || !!obj.pinnedTo || Math.abs(obj.jointBaseAngle || 0) > 0.001;
        const hasTiltInfo = Math.abs(obj.tiltX || 0) > 0.001 || Math.abs(obj.tiltY || 0) > 0.001;
        if (hasJointPoseInfo || hasTiltInfo) {
            lines.push(`Joint Angle:   ${obj.jointBaseAngle ?? 0}°`);
            lines.push(`X Tilt:        ${obj.tiltX ?? 0}°`);
            lines.push(`Y Tilt:        ${obj.tiltY ?? 0}°`);
        }
        if (bodyTags.length) {
            lines.push(`Body Tags:     ${bodyTags.length}`);
        }
        lines.push(`Opacity:       ${obj.opacity}`);
        lines.push(`Pivot:         ${obj.pivotX}, ${obj.pivotY}`);
        if (obj.flipH || obj.flipV) {
            lines.push(`Flip:          H=${obj.flipH}, V=${obj.flipV}`);
        }

        // Visual properties
        lines.push('');
        lines.push('--- Fill & Stroke ---');
        lines.push(`Fill Type:     ${obj.fillType || 'solid'}`);
        lines.push(`Fill Color:    ${obj.fill}`);
        if (obj.fillType === 'gradient' && obj.gradientStops) {
            lines.push(`Gradient:      ${obj.gradientAngle}° — ${obj.gradientStops.map(s => s.color + ' ' + Math.round(s.pos * 100) + '%').join(', ')}`);
        }
        if (obj.stroke && obj.strokeWidth > 0) {
            lines.push(`Stroke:        ${obj.stroke} (${obj.strokeWidth}px)`);
            if (obj.strokeDash) lines.push(`Stroke Dash:   ${obj.strokeDash}`);
        }
        if (obj.borderRadius > 0) {
            lines.push(`Border Radius: ${obj.borderRadius}`);
        }

        // Shadow/effects
        if (obj.shadow) {
            lines.push('');
            lines.push('--- Effects ---');
            lines.push(`Shadow:        ${obj.shadowColor} blur=${obj.shadowBlur} offset=(${obj.shadowOffsetX}, ${obj.shadowOffsetY})`);
        }
        if (obj.glowEnabled) lines.push(`Glow:          ${obj.glowColor} size=${obj.glowSize}`);
        if (obj.bevelEnabled) lines.push(`Bevel:         size=${obj.bevelSize}`);

        // Text
        if (obj.type === 'text') {
            lines.push('');
            lines.push('--- Text ---');
            lines.push(`Font:          ${obj.fontFamily} ${obj.fontSize}px ${obj.fontWeight}`);
            lines.push(`Color:         ${obj.textColor}`);
            lines.push(`Align:         ${obj.textAlign}`);
            lines.push(`Content:       ${(obj.text || '').substring(0, 100)}`);
        }

        // Image
        if (obj.imageSrc) {
            lines.push('');
            lines.push('--- Image ---');
            lines.push(`Source:        ${obj.imageSrc.substring(0, 80)}${obj.imageSrc.length > 80 ? '...' : ''}`);
            if (obj.imgBrightness !== 100) lines.push(`Brightness:    ${obj.imgBrightness}`);
            if (obj.imgContrast !== 100)   lines.push(`Contrast:      ${obj.imgContrast}`);
            if (obj.imgSaturation !== 100) lines.push(`Saturation:    ${obj.imgSaturation}`);
        }

        // Shape specifics
        if (obj.sides != null && ['polygon', 'star'].includes(obj.type)) {
            lines.push('');
            lines.push('--- Shape ---');
            lines.push(`Sides:         ${obj.sides}`);
            if (obj.innerRadius != null) lines.push(`Inner Radius:  ${obj.innerRadius}`);
        }

        // Pin/joint info
        if (obj.pinnedTo) {
            lines.push('');
            lines.push('--- Pinning ---');
            const parent = this.getObjectById(obj.pinnedTo);
            lines.push(`Pinned To:     ${parent ? parent.name : obj.pinnedTo}`);
            if (obj.pinTargetType === 'joint') {
                lines.push(`Pin Target:    Parent Joint`);
                lines.push(`Parent Joint:  ${obj.pinJointName || obj.pinJointId || '(missing)'}`);
            } else {
                lines.push(`Pin Target:    Parent Anchor`);
                lines.push(`Pin Anchor:    ${obj.pinAnchorX ?? 0.5}, ${obj.pinAnchorY ?? 0.5}`);
            }
            lines.push(`Pin Offset:    ${obj.pinOffsetX || 0}, ${obj.pinOffsetY || 0}`);
            lines.push(`Rotation Mode: ${obj.pinRotationMode || 'static'}`);
        }

        // Joints summary
        if (obj.joints && obj.joints.length > 0) {
            lines.push('');
            lines.push(`--- Joints (${obj.joints.length}) ---`);
            const sortedJoints = [...obj.joints].sort((a, b) => a.position - b.position);
            sortedJoints.forEach((jt, i) => {
                const name = jt.name || `Joint ${i + 1}`;
                const pivotPct = Math.round((jt.crossOffset ?? 0.5) * 100);
                const discSize = jt.contourSize != null ? Math.round(jt.contourSize * 100) + '%' : 'auto';
                const discColor = jt.contourColor || 'auto';
                lines.push(`  ${i + 1}. ${name} — pos=${Math.round(jt.position * 100)}%, pivot=${pivotPct}%, angle=${jt.angle || 0}°, tiltX=${jt.tiltX || 0}°, tiltY=${jt.tiltY || 0}°, disc=${discSize}, color=${discColor}`);
            });
        }

        // Animations summary
        if (obj.animations && obj.animations.length > 0) {
            lines.push('');
            lines.push(`--- Animations (${obj.animations.length}) ---`);
            obj.animations.forEach((a, i) => {
                lines.push(`  ${i + 1}. ${a.type} — ${a.startTime}s → ${a.startTime + a.duration}s`);
            });
        }

        if (bodyTags.length) {
            lines.push('');
            lines.push(`--- Body Tags (${bodyTags.length}) ---`);
            bodyTags.forEach(tag => {
                const partLabel = tag.targetPartKey || obj.bodyPartData?.partKey || obj.type;
                const world = this._getObjectWorldPoint(obj, tag.x ?? 0.5, tag.y ?? 0.5);
                lines.push(`  ${tag.name} [${partLabel}] — ${Math.round((tag.x ?? 0.5) * 100)}%, ${Math.round((tag.y ?? 0.5) * 100)}% (stage ${Math.round(world.x)}, ${Math.round(world.y)})`);
            });
        }

        const readableText = lines.join('\n');

        // Append a hidden JSON block separated by a unique marker so Paste as Clone can parse it
        const marker = '\n\n<!-- ANIMSTAGE_PROPS:';
        const payload = marker + btoa(unescape(encodeURIComponent(JSON.stringify(StageObject.stripCompressionRuntimeState(json))))) + ' -->';
        const clipboardText = readableText + payload;

        navigator.clipboard.writeText(clipboardText).then(() => {
            Utils.showToast(`Properties copied for "${obj.name}"`, 'success');
        }).catch(() => {
            // Fallback
            const ta = document.createElement('textarea');
            ta.value = clipboardText;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
            Utils.showToast(`Properties copied for "${obj.name}"`, 'success');
        });
    },

    _copyTextToClipboard(text, successMessage) {
        const done = () => Utils.showToast(successMessage || 'Copied to clipboard', 'success');
        if (navigator.clipboard?.writeText) {
            navigator.clipboard.writeText(text).then(done).catch(() => {
                const ta = document.createElement('textarea');
                ta.value = text;
                document.body.appendChild(ta);
                ta.select();
                document.execCommand('copy');
                document.body.removeChild(ta);
                done();
            });
            return;
        }

        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        done();
    },

    _getObjectPropertiesTableColumns(renderObjs = this.objects) {
        return [
            { header: '#',             fn: (o, i) => i + 1 },
            { header: 'Name',         fn: o => o.name || '' },
            { header: 'Type',         fn: o => o.type },
            { header: 'Object Row',   fn: (o, i) => i + 1 },
            { header: 'Draw Z (front)', fn: o => {
                const renderIndex = renderObjs.indexOf(o);
                return renderIndex >= 0 ? renderIndex + 1 : '';
            }},
            { header: 'Depth',        fn: o => o.depth ?? 0 },
            { header: 'X',            fn: o => Math.round(o.x) },
            { header: 'Y',            fn: o => Math.round(o.y) },
            { header: 'Width',        fn: o => Math.round(o.width) },
            { header: 'Height',       fn: o => Math.round(o.height) },
            { header: 'Rotation',     fn: o => o.rotation },
            { header: 'Stage Angle',  fn: o => this.getObjectStageAngleInfo(o)?.angle360 ?? '' },
            { header: 'Stage ±180',   fn: o => this.getObjectStageAngleInfo(o)?.angle180 ?? '' },
            { header: 'From Down',    fn: o => this.getObjectStageAngleInfo(o)?.fromDown ?? '' },
            { header: 'Joint Angle',  fn: o => o.jointBaseAngle ?? 0 },
            { header: 'Tilt X',       fn: o => o.tiltX ?? 0 },
            { header: 'Tilt Y',       fn: o => o.tiltY ?? 0 },
            { header: 'Scale X',      fn: o => o.scaleX },
            { header: 'Scale Y',      fn: o => o.scaleY },
            { header: 'Opacity',      fn: o => o.opacity },
            { header: 'Fill',         fn: o => o.fill || '' },
            { header: 'Fill Type',    fn: o => o.fillType || 'solid' },
            { header: 'Stroke',       fn: o => o.stroke || '' },
            { header: 'Stroke W',     fn: o => o.strokeWidth || 0 },
            { header: 'Border R',     fn: o => o.borderRadius || 0 },
            { header: 'Shadow',       fn: o => o.shadow ? `${o.shadowColor} b${o.shadowBlur}` : '' },
            { header: 'Pivot',        fn: o => `${o.pivotX},${o.pivotY}` },
            { header: 'Flip',         fn: o => (o.flipH ? 'H' : '') + (o.flipV ? 'V' : '') || '' },
            { header: 'Visible',      fn: o => o.visible ? 'Y' : 'N' },
            { header: 'Locked',       fn: o => o.locked ? 'Y' : 'N' },
            { header: 'Pinned To',    fn: o => { if (!o.pinnedTo) return ''; const p = this.getObjectById(o.pinnedTo); return p ? p.name : o.pinnedTo; } },
            { header: 'Pin Target',   fn: o => !o.pinnedTo ? '' : (o.pinTargetType === 'joint' ? 'joint' : 'anchor') },
            { header: 'Parent Joint', fn: o => !o.pinnedTo || o.pinTargetType !== 'joint' ? '' : (o.pinJointName || o.pinJointId || '') },
            { header: 'Pin Anchor',   fn: o => !o.pinnedTo || o.pinTargetType === 'joint' ? '' : `${o.pinAnchorX ?? 0.5},${o.pinAnchorY ?? 0.5}` },
            { header: 'Pin Offset',   fn: o => !o.pinnedTo ? '' : `${Math.round(o.pinOffsetX || 0)},${Math.round(o.pinOffsetY || 0)}` },
            { header: 'Pin Rotation', fn: o => !o.pinnedTo ? '' : (o.pinRotationMode || 'static') },
            { header: 'Animations',   fn: o => (o.animations || []).length },
            {
                header: 'Animation Details',
                fn: o => (o.animations || [])
                    .map((anim, i) => {
                        const label = anim.name || anim.label || anim.movementKey || anim.key || anim.type || `Anim ${i + 1}`;
                        const start = Number(anim.startTime ?? anim.delay ?? 0);
                        const duration = Number(anim.duration ?? 0);
                        const end = start + duration;
                        const props = Array.isArray(anim.properties) && anim.properties.length
                            ? ` [${anim.properties.join(',')}]`
                            : '';
                        return `${label}: ${Number.isFinite(start) ? start : 0}s-${Number.isFinite(end) ? end : 0}s${props}`;
                    })
                    .join('; ')
            },
            { header: 'Group',        fn: o => o.groupId ? (this.groupNames?.[o.groupId] || o.groupId) : '' },
            { header: 'Tags',         fn: o => (o.tags || []).join(', ') },
            { header: 'Joints',       fn: o => (o.joints || []).length },
            {
                header: 'Joint Details',
                fn: o => {
                    if (!o.joints || o.joints.length === 0) return '';
                    return [...o.joints].sort((a, b) => a.position - b.position)
                        .map((jt, i) => `${jt.name || 'J' + (i + 1)}:${Math.round(jt.position * 100)}%/pv${Math.round((jt.crossOffset ?? 0.5) * 100)}%/${jt.angle || 0}°/tX${jt.tiltX || 0}/tY${jt.tiltY || 0}/d${jt.contourSize != null ? Math.round(jt.contourSize * 100) + '%' : 'auto'}/${jt.contourColor || 'auto'}`)
                        .join('; ');
                }
            },
            { header: 'TL_X',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[0].x) : ''; } },
            { header: 'TL_Y',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[0].y) : ''; } },
            { header: 'TR_X',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[1].x) : ''; } },
            { header: 'TR_Y',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[1].y) : ''; } },
            { header: 'BR_X',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[2].x) : ''; } },
            { header: 'BR_Y',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[2].y) : ''; } },
            { header: 'BL_X',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[3].x) : ''; } },
            { header: 'BL_Y',         fn: o => { const c = o.getTransformedRectPoints(); return c ? Math.round(c[3].y) : ''; } },
            {
                header: 'Body Tags',
                fn: o => (Array.isArray(o.bodyTags) ? o.bodyTags : [])
                    .map(tag => {
                        const safeName = String(tag.name || 'Body Tag').replace(/[\t\r\n]+/g, ' ').trim();
                        const safePart = String(tag.targetPartKey || o.bodyPartData?.partKey || '').replace(/[\t\r\n]+/g, ' ').trim();
                        return `${safeName}${safePart ? `[${safePart}]` : ''}@${(tag.x ?? 0.5).toFixed(2)},${(tag.y ?? 0.5).toFixed(2)}`;
                    })
                    .join('; ')
            }
        ];
    },

    _getLiveDrawOrderList(source = this.objects) {
        const list = Array.isArray(source) ? source : this.objects;
        if (typeof this._orderObjectsByAnimatedLayer !== 'function') return list;
        const layerAnimIds = typeof this._getLayerOrderAnimObjectIds === 'function'
            ? this._getLayerOrderAnimObjectIds()
            : new Set();
        return this._orderObjectsByAnimatedLayer(list, layerAnimIds);
    },

    _buildPropertiesTableForObjects(objs, title, renderObjs = this.objects) {
        const liveRenderObjs = this._getLiveDrawOrderList(renderObjs);
        const cols = this._getObjectPropertiesTableColumns(liveRenderObjs);
        const sep = '\t';
        const headerRow = cols.map(c => c.header).join(sep);
        const dataRows = objs.map((obj, i) => cols.map(c => String(c.fn(obj, i))).join(sep));
        const stackNote = 'Note: Object Row 1 is the first row in the object window. Higher Draw Z values are rendered in front on the stage.';
        return `${title || `${objs.length} object(s)`}\n\n${stackNote}\n\n` + [headerRow, ...dataRows].join('\n');
    },

    _collectArmatureCharacterObjects(armature) {
        if (!armature?.parts) return [];

        const byId = new Map();
        const add = (obj) => {
            if (!obj?.id || byId.has(obj.id)) return;
            byId.set(obj.id, obj);
        };

        add(armature.root);
        Object.values(armature.parts || {}).forEach(part => add(part?.obj));

        let changed = true;
        while (changed) {
            changed = false;
            this.objects.forEach(obj => {
                if (obj?.pinnedTo && byId.has(obj.pinnedTo) && !byId.has(obj.id)) {
                    byId.set(obj.id, obj);
                    changed = true;
                }
            });
        }

        return this.objects
            .filter(obj => byId.has(obj.id))
            .sort((a, b) => this.objects.indexOf(a) - this.objects.indexOf(b));
    },

    copyCharacterProperties(armature) {
        const characterObjects = this._collectArmatureCharacterObjects(armature);
        if (!characterObjects.length) {
            Utils.showToast('No character parts found to copy', 'warning');
            return;
        }

        const root = armature?.root || characterObjects.find(obj => !obj.pinnedTo) || characterObjects[0];
        const name = root?.name || 'Universal Character';
        const renderObjs = this._getLiveDrawOrderList(characterObjects);
        const tableObjects = [...renderObjs].reverse();
        const summary = this._buildPropertiesTableForObjects(
            tableObjects,
            `${tableObjects.length} object(s) in character "${name}"`,
            renderObjs
        );

        this._copyTextToClipboard(
            summary,
            `Whole character properties copied (${tableObjects.length} parts)`
        );
    },

    /**
     * Copy properties of ALL stage objects as a tab-separated table.
     * Pastes neatly into spreadsheets, Google Docs, or any text editor.
     */
    copyAllProperties() {
        const renderObjs = this._getLiveDrawOrderList(this.objects);
        const objs = [...renderObjs].reverse();
        if (!objs || objs.length === 0) {
            Utils.showToast('No objects on stage', 'info');
            return;
        }

        const summary = this._buildPropertiesTableForObjects(objs, `${objs.length} object(s) on stage`, renderObjs);
        this._copyTextToClipboard(summary, `All properties copied (${objs.length} objects) — paste into any document`);
    },

    /**
     * Paste a clone from system clipboard (created by Copy Properties).
     * Reads the ANIMSTAGE_PROPS marker from clipboard text and creates
     * an exact duplicate at the given stage position.
     */
    async pasteAsClone(stagePos) {
        let text;
        try {
            text = await navigator.clipboard.readText();
        } catch {
            Utils.showToast('Cannot read clipboard — browser denied access', 'warning');
            return;
        }

        const marker = '<!-- ANIMSTAGE_PROPS:';
        const idx = text.indexOf(marker);
        if (idx < 0) {
            Utils.showToast('No object properties found in clipboard', 'info');
            return;
        }

        try {
            const b64 = text.substring(idx + marker.length, text.indexOf(' -->', idx));
            const parsed = JSON.parse(decodeURIComponent(escape(atob(b64))));
            const payload = (parsed?.format === 'animstage-object' && Array.isArray(parsed.objects))
                ? parsed
                : { format: 'animstage-object', version: 1, objects: [parsed], group: null };
            const clonePayload = this._applyTransferNameSuffix(payload, ' (clone)');
            const targetPos = stagePos || this._getTransferPayloadCenter(payload);

            this._insertImportedObjects(clonePayload, {
                position: targetPos,
                pushHistory: false,
                showToast: false
            });
            eventBus.emit('history:push');

            if (clonePayload.group && clonePayload.objects.length > 1) {
                Utils.showToast(`Cloned group "${clonePayload.group.name || 'Group'}" with all properties`, 'success');
            } else {
                Utils.showToast(`Cloned "${payload.objects[0]?.name || 'Object'}" with all properties`, 'success');
            }
        } catch (err) {
            Utils.showToast('Failed to parse clipboard data', 'warning');
        }
    },

    pasteAsImage() {
        const selected = this.getSelectedObjects();
        if (selected.length === 0) {
            Utils.showToast('Select object(s) to paste as image', 'warning');
            return;
        }
        // Determine bounding box of all selected objects (accounting for rotation)
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(o => {
            const corners = o.getTransformedRectPoints();
            corners.forEach(c => {
                minX = Math.min(minX, c.x);
                minY = Math.min(minY, c.y);
                maxX = Math.max(maxX, c.x);
                maxY = Math.max(maxY, c.y);
            });
        });
        const padding = 4;
        minX -= padding; minY -= padding;
        maxX += padding; maxY += padding;
        const w = Math.ceil(maxX - minX);
        const h = Math.ceil(maxY - minY);
        if (w <= 0 || h <= 0) return;

        // Render selected objects to an offscreen canvas
        const offscreen = document.createElement('canvas');
        offscreen.width = w * 2;  // 2x for quality
        offscreen.height = h * 2;
        const ctx = offscreen.getContext('2d');
        ctx.scale(2, 2);
        ctx.translate(-minX, -minY);

        // Render each selected object
        selected.forEach(obj => {
            ctx.save();
            obj.render(ctx);
            ctx.restore();
        });

        const dataUrl = offscreen.toDataURL('image/png');
        const img = new Image();
        img.onload = () => {
            const imgObj = new StageObject('image', {
                x: minX + padding,
                y: minY + padding,
                width: w - padding * 2,
                height: h - padding * 2,
                imageSrc: dataUrl
            });
            this.addObject(imgObj);
            this.select([imgObj.id]);
            Utils.showToast('Pasted as image', 'success');
            eventBus.emit('history:push');
        };
        img.src = dataUrl;
    },

    saveObjectAsImage(obj) {
        if (!obj) {
            const selected = this.getSelectedObjects();
            obj = selected[0];
        }
        if (!obj) { Utils.showToast('No object selected', 'warning'); return; }

        const padding = 10;
        // Compute bounding box from rotated corners
        const corners = obj.getTransformedRectPoints();
        let rMinX = Infinity, rMinY = Infinity, rMaxX = -Infinity, rMaxY = -Infinity;
        corners.forEach(c => {
            rMinX = Math.min(rMinX, c.x);
            rMinY = Math.min(rMinY, c.y);
            rMaxX = Math.max(rMaxX, c.x);
            rMaxY = Math.max(rMaxY, c.y);
        });
        const w = Math.ceil(rMaxX - rMinX + padding * 2);
        const h = Math.ceil(rMaxY - rMinY + padding * 2);
        if (w <= 0 || h <= 0) return;

        const offscreen = document.createElement('canvas');
        offscreen.width = w * 2;
        offscreen.height = h * 2;
        const ctx = offscreen.getContext('2d');
        ctx.scale(2, 2);
        ctx.translate(-rMinX + padding, -rMinY + padding);
        ctx.save();
        obj.render(ctx);
        ctx.restore();

        offscreen.toBlob(blob => {
            if (!blob) return;
            const safeName = (obj.name || obj.type || 'object').replace(/[^a-z0-9_-]/gi, '_');
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safeName}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 3000);
            Utils.showToast(`Saved "${obj.name}" as PNG`, 'success');
        }, 'image/png');
    },

    saveObjectAsSVG(obj) {
        if (!obj) {
            const selected = this.getSelectedObjects();
            obj = selected[0];
        }
        if (!obj) { Utils.showToast('No object selected', 'warning'); return; }
        if (!this.exporter) { Utils.showToast('Export module not available', 'warning'); return; }

        // Collect objects to export: group members or single object
        let objs = [obj];
        if (obj.groupId && this.groups[obj.groupId]) {
            objs = this.objects.filter(o => o.groupId === obj.groupId);
        }

        // Compute bounding box with padding
        const padding = 10;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objs.forEach(o => {
            const pivot = o.getPivotPoint();
            const hw = o.width / 2, hh = o.height / 2;
            const corners = [
                { x: o.x, y: o.y },
                { x: o.x + o.width, y: o.y },
                { x: o.x + o.width, y: o.y + o.height },
                { x: o.x, y: o.y + o.height }
            ];
            if (o.rotation) {
                const rad = o.rotation * Math.PI / 180;
                const cos = Math.cos(rad), sin = Math.sin(rad);
                corners.forEach(c => {
                    const dx = c.x - pivot.x, dy = c.y - pivot.y;
                    c.x = pivot.x + dx * cos - dy * sin;
                    c.y = pivot.y + dx * sin + dy * cos;
                });
            }
            corners.forEach(c => {
                if (c.x < minX) minX = c.x;
                if (c.y < minY) minY = c.y;
                if (c.x > maxX) maxX = c.x;
                if (c.y > maxY) maxY = c.y;
            });
        });

        const svgW = Math.ceil(maxX - minX + padding * 2);
        const svgH = Math.ceil(maxY - minY + padding * 2);
        const viewMinX = minX - padding;
        const viewMinY = minY - padding;

        let defs = '';
        let defsCount = 0;
        let body = '';

        objs.forEach(o => {
            const result = this.exporter._objectToSVG(o, defsCount, true);
            body += result.svg;
            if (result.defs) defs += result.defs;
            defsCount = result.defsCount;
        });

        const svgContent = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}" viewBox="${viewMinX} ${viewMinY} ${svgW} ${svgH}">\n${defs ? `<defs>\n${defs}</defs>\n` : ''}${body}</svg>`;

        const safeName = (obj.name || obj.type || 'object').replace(/[^a-z0-9_-]/gi, '_');
        const blob = new Blob([svgContent], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        Utils.showToast(`Saved "${obj.name}" as SVG`, 'success');
    },

    exportObjectJSON(obj) {
        if (!obj) {
            const selected = this.getSelectedObjects();
            obj = selected[0];
        }
        if (!obj) { Utils.showToast('No object selected', 'warning'); return; }

        // Collect objects: group members or single
        let objs = [obj];
        if (obj.groupId && this.groups[obj.groupId]) {
            objs = this.objects.filter(o => o.groupId === obj.groupId);
        }

        const data = {
            format: 'animstage-object',
            version: 1,
            objects: objs.map(o => o.toJSON()),
            group: obj.groupId ? {
                id: obj.groupId,
                name: this.groupNames?.[obj.groupId] || obj.groupId
            } : null
        };

        const json = JSON.stringify(data, null, 2);
        const safeName = (obj.name || obj.type || 'object').replace(/[^a-z0-9_-]/gi, '_');
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 3000);
        Utils.showToast(`Exported "${obj.name}" as JSON (with joints & rigging)`, 'success');
    },

    importObjectJSON() {
        const input = document.getElementById('file-input-object-json');
        if (!input) return;
        input.value = '';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (data.format !== 'animstage-object' || !data.objects?.length) {
                        Utils.showToast('Invalid object file', 'error');
                        return;
                    }
                    this._insertImportedObjects(data);
                } catch (err) {
                    Utils.showToast('Failed to parse file: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        };
        input.click();
    },

    _insertImportedObjects(data, options = {}) {
        const newIds = {};
        let newGroupId = null;
        if (data.group && data.objects.length > 1) {
            newGroupId = 'group_' + (this._groupCounter++);
            this.groups[newGroupId] = data.objects.map(() => null); // placeholder
            if (data.group.name) this.groupNames[newGroupId] = data.group.name;
        }

        const targetCenterX = options.position?.x ?? (this.stage.width / 2);
        const targetCenterY = options.position?.y ?? (this.stage.height / 2);
        // Compute centroid of imported objects
        let cx = 0, cy = 0;
        data.objects.forEach(d => { cx += d.x + (d.width || 0) / 2; cy += d.y + (d.height || 0) / 2; });
        cx /= data.objects.length;
        cy /= data.objects.length;
        const offsetX = targetCenterX - cx;
        const offsetY = targetCenterY - cy;

        // Imported or duplicated characters must become independent stack
        // bundles even when their source UC family/SVG instance metadata matches.
        const sourceById = new Map(data.objects.map(obj => [String(obj.id || ''), obj]));
        const importedStackIds = new Map();
        const stackSourceMemo = new Map();
        const stackSourceFor = (obj, visiting = new Set()) => {
            if (!obj) return '';
            const objectId = String(obj.id || '');
            if (stackSourceMemo.has(objectId)) return stackSourceMemo.get(objectId);
            if (visiting.has(objectId)) return '';
            visiting.add(objectId);
            const explicitId = String(obj.characterStackId || obj._characterStackId || '').trim();
            const svgId = String(obj.svgCharacterInstanceId || obj._svgCharacterInstanceId || '').trim();
            const ucId = String(
                obj.ucCharacterFamilyId
                || obj._ucCharacterFamilyId
                || obj.ucGarmentFamilyId
                || obj._ucGarmentFamilyId
                || ''
            ).trim();
            let source = explicitId ? `stack:${explicitId}` : svgId ? `svg:${svgId}` : ucId ? `uc:${ucId}` : '';
            if (!source) {
                const parentId = String(
                    obj.pinnedTo
                    || obj.facialParentHead
                    || obj._facialParentHead
                    || obj.ucGarmentForPartId
                    || obj._ucGarmentForPartId
                    || obj.ucGarmentRootId
                    || obj._ucGarmentRootId
                    || ''
                ).trim();
                if (parentId && sourceById.has(parentId)) {
                    source = stackSourceFor(sourceById.get(parentId), visiting);
                }
            }
            const role = String(obj.armatureRoleKey || obj._armatureRoleKey || obj.armaturePartKey || obj._armaturePartKey || obj.bodyPartData?.partKey || '').trim();
            if (!source && (role || Array.isArray(obj.joints) && obj.joints.length)) {
                source = `armature:${objectId}`;
            }
            stackSourceMemo.set(objectId, source);
            visiting.delete(objectId);
            return source;
        };
        data.objects.forEach(obj => {
            const source = stackSourceFor(obj);
            if (!source) return;
            if (!importedStackIds.has(source)) importedStackIds.set(source, Utils.generateId('character'));
            obj.characterStackId = importedStackIds.get(source);
            delete obj._characterStackId;
        });

        const ids = [];
        data.objects.forEach(d => {
            const oldId = d.id;
            d.id = 'obj_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
            d.x += offsetX;
            d.y += offsetY;
            // Offset absolute-coordinate pathPoints (path, freeform, scribble)
            if (d.pathPoints && d.pathPoints.length > 0) {
                d.pathPoints.forEach(p => { p.x += offsetX; p.y += offsetY; });
            }
            if (newGroupId) d.groupId = newGroupId;
            else delete d.groupId;
            newIds[oldId] = d.id;
        });

        // Remap pinnedTo references to new IDs
        data.objects.forEach(d => {
            if (d.pinnedTo && newIds[d.pinnedTo]) {
                d.pinnedTo = newIds[d.pinnedTo];
            }
            if (d.activityRootId) d.activityRootId = newIds[d.activityRootId] || null;
            if (d.sceneAsset?.activityRootId) d.sceneAsset.activityRootId = newIds[d.sceneAsset.activityRootId] || null;
            if (d.sceneAsset?.activityHandId) d.sceneAsset.activityHandId = newIds[d.sceneAsset.activityHandId] || null;
            for (const animation of d.animations || []) {
                for (const frame of animation.generated?.keyframes || []) {
                    if (frame.values?.activityRootId) frame.values.activityRootId = newIds[frame.values.activityRootId] || null;
                    if (frame.values?.armatureViewState) {
                        try {
                            const state = JSON.parse(frame.values.armatureViewState), props = state.props;
                            if (props?.sceneAsset?.activityKit) {
                                props.activityRootId = newIds[props.activityRootId] || null;
                                props.sceneAsset.activityRootId = newIds[props.sceneAsset.activityRootId] || null;
                                props.sceneAsset.activityHandId = newIds[props.sceneAsset.activityHandId] || null;
                                props.pinnedTo = newIds[props.pinnedTo] || null;
                                props.x += offsetX; props.y += offsetY;
                                frame.values.armatureViewState = JSON.stringify(state);
                            }
                        } catch (_) { /* Leave unsupported or malformed view states to their normal validator. */ }
                    }
                }
            }
        });

        data.objects.forEach(d => {
            const obj = StageObject.fromJSON(d);
            this.objects.push(obj);
            ids.push(obj.id);
        });

        if (newGroupId) {
            this.groups[newGroupId] = ids;
        }

        if (options.select !== false) {
            this.select(ids);
        }
        if (options.pushHistory !== false) {
            eventBus.emit('history:push');
        }
        this.updateObjectList();
        this.stage.requestRender();
        if (options.showToast !== false) {
            const label = options.assetName ? `"${options.assetName}"` : `${ids.length} object(s)`;
            Utils.showToast(`Imported ${label} with properties intact`, 'success');
        }
        return ids;
    },

    initAssetLibraryUI() {
        document.getElementById('btn-assets')?.addEventListener('click', () => {
            this.showAssetLibrary();
        });
        document.getElementById('btn-assets-upload')?.addEventListener('click', () => {
            document.getElementById('file-input-asset-upload')?.click();
        });

        const modal = document.getElementById('asset-library-modal');
        modal?.querySelector('.modal-close')?.addEventListener('click', () => {
            modal.classList.add('hidden');
        });
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) modal.classList.add('hidden');
        });

        document.getElementById('btn-assets-refresh')?.addEventListener('click', () => {
            const search = document.getElementById('asset-library-search')?.value?.trim() || '';
            this._renderAssetLibraryGrid(search);
        });

        let searchTimer = null;
        document.getElementById('asset-library-search')?.addEventListener('input', (e) => {
            clearTimeout(searchTimer);
            const value = e.target.value.trim();
            searchTimer = setTimeout(() => this._renderAssetLibraryGrid(value), 120);
        });

        document.querySelectorAll('[data-asset-library-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                this._setAssetLibraryMode(btn.dataset.assetLibraryMode || 'saved');
            });
        });

        document.getElementById('file-input-asset-upload')?.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            e.target.value = '';
            if (!files.length) return;
            await this.uploadFilesToAssetLibrary(files);
        });
    },

    _assetEscapeHtml(str) {
        return String(str ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    },

    _normalizeAssetName(name) {
        return String(name ?? '').trim().toLowerCase();
    },

    _getAssetBaseName(filename) {
        const value = String(filename ?? '').trim();
        return value.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim() || 'Asset';
    },

    _describeAssetUploadFile(file) {
        const type = String(file?.type || '').toLowerCase();
        const ext = String(file?.name || '').split('.').pop()?.toLowerCase() || '';
        if (ext === 'json' || type.includes('json')) return 'Object JSON';
        if (ext === 'gif' || type.includes('gif')) return 'Animated GIF';
        if (type.startsWith('image/')) return type.replace('image/', '').toUpperCase();
        return ext ? ext.toUpperCase() : 'File';
    },

    async _assetApiRequest(endpoint, options = {}) {
        const method = String(options.method || 'GET').toUpperCase();
        if (method !== 'GET' && method !== 'HEAD') {
            const csrfToken = (window.__STAGE_USER && window.__STAGE_USER.csrf_token) || '';
            if (csrfToken) {
                options.headers = Object.assign({}, options.headers || {}, { 'X-CSRF-Token': csrfToken });
            }
        }
        const response = await fetch(`api/assets/${endpoint}`, options);
        let payload = null;
        try {
            payload = await response.json();
        } catch (err) {
            throw new Error(`Asset API returned invalid JSON for ${endpoint}`);
        }
        if (!response.ok || payload?.ok === false) {
            throw new Error(payload?.error || `Asset API request failed for ${endpoint}`);
        }
        return payload;
    },

    async fetchAssetLibraryList(query = '') {
        const qs = query ? `?q=${encodeURIComponent(query)}` : '';
        return this._assetApiRequest(`list.php${qs}`);
    },

    async loadAssetLibraryRecord(assetId) {
        return this._assetApiRequest(`load.php?id=${encodeURIComponent(assetId)}`);
    },

    async deleteAssetLibraryRecord(assetId) {
        return this._assetApiRequest('delete.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: assetId })
        });
    },

    async uploadAssetLibraryFile(file, name, folder, extra = {}) {
        const form = new FormData();
        form.append('file', file);
        form.append('name', name);
        form.append('folder', folder || 'General');
        form.append('visibility', extra.visibility || 'private');
        if (extra.thumbnail) form.append('thumbnail', extra.thumbnail);
        if (extra.labels?.length) form.append('labels', JSON.stringify(extra.labels));
        if (extra.keywords?.length) form.append('keywords', JSON.stringify(extra.keywords));
        return this._assetApiRequest('upload.php', {
            method: 'POST',
            body: form
        });
    },

    _collectObjectsForReusableSave(obj) {
        let objs = [obj];
        if (obj?.groupId && this.groups[obj.groupId]) {
            objs = this.objects.filter(o => o.groupId === obj.groupId);
        }
        return objs;
    },

    _buildReusableObjectPackage(objs, obj) {
        return {
            format: 'animstage-object',
            version: 1,
            objects: objs.map(o => StageObject.stripCompressionRuntimeState(o.toJSON())),
            group: obj.groupId ? {
                id: obj.groupId,
                name: this.groupNames?.[obj.groupId] || obj.groupId
            } : null
        };
    },

    _renderReusableObjectsThumbnail(objs, thumbSize = 120) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objs.forEach(o => {
            minX = Math.min(minX, o.x);
            minY = Math.min(minY, o.y);
            maxX = Math.max(maxX, o.x + o.width);
            maxY = Math.max(maxY, o.y + o.height);
        });
        const bw = Math.max(1, maxX - minX);
        const bh = Math.max(1, maxY - minY);
        const scale = Math.min(thumbSize / bw, thumbSize / bh, 2);
        const cw = Math.ceil(bw * scale) + 20;
        const ch = Math.ceil(bh * scale) + 20;
        const offscreen = document.createElement('canvas');
        offscreen.width = cw;
        offscreen.height = ch;
        const ctx = offscreen.getContext('2d');
        ctx.translate(10 - minX * scale, 10 - minY * scale);
        ctx.scale(scale, scale);
        objs.forEach(o => { ctx.save(); o.render(ctx); ctx.restore(); });
        return offscreen.toDataURL('image/png', 0.8);
    },

    _buildAssetKeywordSet(objs) {
        const values = new Set();
        objs.forEach(obj => {
            [obj.name, obj.type, ...(obj.tags || [])].forEach(value => {
                if (value) values.add(String(value).trim());
            });
            if (obj.bodyPartData?.partKey) values.add(String(obj.bodyPartData.partKey));
            if (obj.bodyPartData?.charType) values.add(String(obj.bodyPartData.charType));
            if (obj.bodyPartData?.jointName) values.add(String(obj.bodyPartData.jointName));
            (obj.bodyTags || []).forEach(tag => {
                if (tag?.key) values.add(String(tag.key));
                if (tag?.name) values.add(String(tag.name));
            });
        });
        return Array.from(values).filter(Boolean);
    },

    _assetCurrentUserIsAdmin() {
        const role = String(window.__STAGE_USER?.role || '').toLowerCase();
        return role === 'admin' || role === 'superadmin';
    },

    _assetVisibilityLabel(visibility = 'global') {
        const key = String(visibility || 'global').toLowerCase();
        if (key === 'private') return 'Private';
        if (key === 'shared') return 'Shared';
        return 'Admin/Global';
    },

    _assetVisibilityIcon(visibility = 'global') {
        const key = String(visibility || 'global').toLowerCase();
        if (key === 'private') return 'fa-lock';
        if (key === 'shared') return 'fa-users';
        return 'fa-globe';
    },

    _assetOwnerLabel(asset = {}) {
        const owner = asset.owner || {};
        const name = String(owner.name || '').trim();
        const email = String(owner.email || '').trim();
        if (name) return name;
        if (email) return email;
        return '';
    },

    _assetCanDelete(asset = {}) {
        if (this._assetCurrentUserIsAdmin()) return true;
        const ownerEmail = String(asset.owner?.email || '').trim().toLowerCase();
        const currentEmail = String(window.__STAGE_USER?.email || '').trim().toLowerCase();
        return !!ownerEmail && !!currentEmail && ownerEmail === currentEmail;
    },

    _showSaveAssetDialog(suggestedName, detectedFolder, folderSuggestions, existingAssets, onSave, options = {}) {
        document.getElementById('save-asset-dialog-overlay')?.remove();

        const overlay = document.createElement('div');
        overlay.id = 'save-asset-dialog-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:#1e1e2e;border:1px solid #444;border-radius:10px;padding:20px;min-width:360px;max-width:440px;color:#ccc;font-family:inherit;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        dialog.innerHTML = `
            <h3 style="margin:0 0 16px 0;font-size:15px;color:#fff;"><i class="fas ${this._assetEscapeHtml(options.icon || 'fa-folder-plus')}" style="color:#4ecdc4;margin-right:8px;"></i>${this._assetEscapeHtml(options.title || 'Save to Assets Library')}</h3>
            ${options.description ? `<div style="font-size:11px;color:#94a3b8;line-height:1.45;margin:-6px 0 12px 0;">${this._assetEscapeHtml(options.description)}</div>` : ''}
            <label style="display:block;font-size:12px;margin-bottom:4px;color:#aaa;">Asset Name</label>
            <input id="asset-name-input" type="text" value="${this._assetEscapeHtml(suggestedName)}"
                style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #555;background:#2a2a3e;color:#fff;font-size:13px;outline:none;margin-bottom:12px;" />
            <div id="asset-name-status" style="min-height:16px;font-size:11px;color:#777;margin:-8px 0 10px 0;"></div>
            <label style="display:block;font-size:12px;margin-bottom:4px;color:#aaa;">Folder</label>
            <input id="asset-folder-input" type="text" value="${this._assetEscapeHtml(detectedFolder)}"
                placeholder="Search existing folders or type a new folder"
                style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #555;background:#2a2a3e;color:#fff;font-size:13px;outline:none;" />
            <select id="asset-folder-select" size="6"
                style="width:100%;box-sizing:border-box;padding:6px;border-radius:6px;border:1px solid #444;background:#151522;color:#ddd;font-size:12px;outline:none;margin-top:8px;"></select>
            <div style="font-size:11px;color:#777;line-height:1.4;margin-top:6px;">Search to pick an existing folder from the dropdown, or keep typing to create a new one. Use <code>/</code> for nested folders.</div>
            <label style="display:block;font-size:12px;margin:12px 0 4px 0;color:#aaa;">Visibility</label>
            <select id="asset-visibility-input"
                style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #555;background:#2a2a3e;color:#fff;font-size:13px;outline:none;">
                <option value="private">Private — only you</option>
                <option value="shared">Shared — all users, tagged to you</option>
                ${this._assetCurrentUserIsAdmin() ? '<option value="global">Admin/Global — built-in for everyone</option>' : ''}
            </select>
            <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
                <button id="asset-save-cancel" style="padding:7px 18px;border-radius:6px;border:1px solid #555;background:transparent;color:#aaa;cursor:pointer;font-size:12px;">Cancel</button>
                <button id="asset-save-confirm" style="padding:7px 18px;border-radius:6px;border:none;background:#4ecdc4;color:#111;cursor:pointer;font-size:12px;font-weight:600;">${this._assetEscapeHtml(options.confirmLabel || 'Save')}</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        const nameInput = dialog.querySelector('#asset-name-input');
        const folderInput = dialog.querySelector('#asset-folder-input');
        const folderSelect = dialog.querySelector('#asset-folder-select');
        const visibilityInput = dialog.querySelector('#asset-visibility-input');
        const nameStatus = dialog.querySelector('#asset-name-status');
        const confirmBtn = dialog.querySelector('#asset-save-confirm');
        const normalizedExistingNames = new Set((existingAssets || []).map(asset => this._normalizeAssetName(asset?.name)));
        const allFolders = Array.from(new Set(['General', ...(folderSuggestions || []).filter(Boolean)])).sort((a, b) => a.localeCompare(b));
        const close = () => {
            overlay.remove();
            if (typeof options.onCancel === 'function') options.onCancel();
        };
        const renderFolderOptions = () => {
            const filter = folderInput.value.trim().toLowerCase();
            const matches = allFolders.filter(folder => !filter || folder.toLowerCase().includes(filter));
            folderSelect.innerHTML = matches.length
                ? matches.map(folder => `<option value="${this._assetEscapeHtml(folder)}">${this._assetEscapeHtml(folder)}</option>`).join('')
                : '<option value="">No matching folders. Press Save to create a new one.</option>';
            if (folderInput.value.trim()) {
                const exact = matches.find(folder => folder.toLowerCase() === filter);
                if (exact) folderSelect.value = exact;
            }
        };
        const validate = () => {
            const name = nameInput.value.trim();
            const normalized = this._normalizeAssetName(name);
            const duplicate = !!normalized && normalizedExistingNames.has(normalized);
            nameInput.style.borderColor = duplicate ? '#ff6b6b' : '#555';
            if (!name) {
                nameStatus.textContent = 'Enter a unique asset name.';
                nameStatus.style.color = '#777';
            } else if (duplicate) {
                nameStatus.textContent = 'An asset with this name already exists. Use a different name.';
                nameStatus.style.color = '#ff8f8f';
            } else {
                nameStatus.textContent = 'Name is available.';
                nameStatus.style.color = '#7dd3a7';
            }
            confirmBtn.disabled = !name || duplicate;
            confirmBtn.style.opacity = confirmBtn.disabled ? '0.5' : '1';
            confirmBtn.style.cursor = confirmBtn.disabled ? 'not-allowed' : 'pointer';
            return !confirmBtn.disabled;
        };
        const commit = () => {
            const name = nameInput.value.trim();
            const folder = folderInput.value.trim() || 'General';
            const visibility = visibilityInput?.value || 'private';
            if (!validate()) return;
            overlay.remove();
            onSave(name, folder, visibility);
        };

        nameInput.focus();
        nameInput.select();
        renderFolderOptions();
        validate();
        dialog.querySelector('#asset-save-cancel').addEventListener('click', close);
        dialog.querySelector('#asset-save-confirm').addEventListener('click', commit);
        nameInput.addEventListener('input', validate);
        folderInput.addEventListener('input', renderFolderOptions);
        folderSelect.addEventListener('change', () => {
            if (folderSelect.value) folderInput.value = folderSelect.value;
        });
        folderSelect.addEventListener('dblclick', () => {
            if (folderSelect.value) folderInput.value = folderSelect.value;
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
        dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') commit();
            if (e.key === 'Escape') close();
        });
    },

    async uploadFilesToAssetLibrary(fileList) {
        const files = Array.from(fileList || []);
        if (!files.length) return;

        let folderSuggestions = ['General', 'Front View', 'Side View', 'Back View'];
        let existingAssets = [];
        try {
            const result = await this.fetchAssetLibraryList();
            existingAssets = result.assets || [];
            folderSuggestions = Array.from(new Set([...folderSuggestions, ...(result.folders || [])]));
        } catch (err) {
            console.warn('Asset folder suggestions unavailable:', err);
        }

        let uploaded = 0;
        let lastFolder = this._assetLastUploadFolder || 'General';
        for (const file of files) {
            const suggestedName = this._getAssetBaseName(file.name);
            const typeLabel = this._describeAssetUploadFile(file);
            const proceed = await new Promise((resolve) => {
                let finished = false;
                this._showSaveAssetDialog(
                    suggestedName,
                    lastFolder,
                    folderSuggestions,
                    existingAssets,
                    async (name, folder, visibility) => {
                        if (finished) return;
                        finished = true;
                        try {
                            const result = await this.uploadAssetLibraryFile(file, name, folder, { visibility });
                            existingAssets = [...existingAssets, result.asset || { name }];
                            folderSuggestions = Array.from(new Set([...folderSuggestions, folder]));
                            this._assetLastUploadFolder = folder;
                            lastFolder = folder;
                            uploaded += 1;
                            eventBus.emit('asset-library:updated', result.asset || null);
                            resolve(true);
                        } catch (err) {
                            Utils.showToast(`Asset upload failed: ${err.message}`, 'error');
                            resolve(false);
                        }
                    },
                    {
                        title: 'Upload to Assets Library',
                        confirmLabel: 'Upload',
                        icon: 'fa-upload',
                        description: `${typeLabel} · ${(file.size / 1024).toFixed(1)} KB`,
                        onCancel: () => {
                            if (finished) return;
                            finished = true;
                            resolve(false);
                        }
                    }
                );
            });
            if (!proceed) break;
        }

        if (uploaded > 0) {
            Utils.showToast(`Uploaded ${uploaded} asset${uploaded === 1 ? '' : 's'} to the Assets Library`, 'success');
            if (!document.getElementById('asset-library-modal')?.classList.contains('hidden')) {
                await this._renderAssetLibraryGrid(document.getElementById('asset-library-search')?.value?.trim() || '');
            }
        }
    },

    async saveObjectToAssetLibrary(obj) {
        if (!obj) {
            const selected = this.getSelectedObjects();
            obj = selected[0];
        }
        if (!obj) {
            Utils.showToast('No object selected', 'warning');
            return;
        }

        const objs = this._collectObjectsForReusableSave(obj);
        const detectedFolder = this._detectTemplateFolder(obj, objs);
        const suggestedName = (obj.groupId && this.groupNames?.[obj.groupId])
            ? this.groupNames[obj.groupId]
            : (obj.name || obj.type);

        let folderSuggestions = ['General', 'Front View', 'Side View', 'Back View'];
        let existingAssets = [];
        try {
            const result = await this.fetchAssetLibraryList();
            existingAssets = result.assets || [];
            folderSuggestions = Array.from(new Set([...folderSuggestions, ...(result.folders || [])]));
        } catch (err) {
            console.warn('Asset folder suggestions unavailable:', err);
        }

        this._showSaveAssetDialog(suggestedName, detectedFolder, folderSuggestions, existingAssets, async (name, folder, visibility) => {
            await this._completeSaveAssetLibrary(objs, obj, name, folder, visibility);
        });
    },

    async _completeSaveAssetLibrary(objs, obj, name, folder, visibility = 'private') {
        try {
            const thumbnail = this._renderReusableObjectsThumbnail(objs, 360);
            const data = this._buildReusableObjectPackage(objs, obj);
            const keywords = this._buildAssetKeywordSet(objs);
            const result = await this._assetApiRequest('save.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    folder,
                    visibility,
                    thumbnail,
                    data,
                    labels: keywords,
                    keywords,
                    sourceType: objs.length > 1 ? 'group' : (obj.type || 'object')
                })
            });
            eventBus.emit('asset-library:updated', result.asset || null);
            Utils.showToast(`Saved "${name}" to Assets Library`, 'success');
            if (!document.getElementById('asset-library-modal')?.classList.contains('hidden')) {
                this._renderAssetLibraryGrid(document.getElementById('asset-library-search')?.value?.trim() || '');
            }
        } catch (err) {
            Utils.showToast(`Asset save failed: ${err.message}`, 'error');
        }
    },

    _renderAssetLibraryPreview(asset = null) {
        const preview = document.getElementById('asset-library-preview');
        if (!preview) return;

        if (!asset) {
            preview.className = 'asset-library-preview-empty';
            preview.innerHTML = 'Select an asset to preview it here before importing.';
            return;
        }

        const labels = [...(asset.labels || []), ...(asset.keywords || [])]
            .filter(Boolean)
            .slice(0, 10);
        const created = asset.createdAt ? new Date(asset.createdAt).toLocaleString() : null;
        const previewUrl = asset.thumbnailUrl || asset.mediaUrl || null;
        const visibility = asset.visibility || 'global';
        const ownerLabel = this._assetOwnerLabel(asset);
        const canDelete = this._assetCanDelete(asset);
        preview.className = '';
        preview.innerHTML = `
            <div class="asset-library-preview-stage">
                ${previewUrl
                    ? `<img src="${this._assetEscapeHtml(previewUrl)}" alt="${this._assetEscapeHtml(asset.name)}">`
                    : `<div class="asset-library-preview-empty">No preview image is available for this asset.</div>`}
            </div>
            <div class="asset-library-preview-title">${this._assetEscapeHtml(asset.name)}</div>
            <div class="asset-library-preview-subtitle">
                <i class="fas ${this._assetVisibilityIcon(visibility)}"></i>
                ${this._assetEscapeHtml(this._assetVisibilityLabel(visibility))}
                ${ownerLabel ? ` · by ${this._assetEscapeHtml(ownerLabel)}` : ''}
            </div>
            <div class="asset-library-preview-subtitle">${this._assetEscapeHtml(asset.folder || 'General')} · ${asset.meta?.objectCount || 0} object${(asset.meta?.objectCount || 0) === 1 ? '' : 's'}</div>
            ${created ? `<div class="asset-library-preview-subtitle">Saved ${this._assetEscapeHtml(created)}</div>` : ''}
            ${labels.length ? `<div class="asset-library-preview-tags">${labels.map(tag => `<span class="asset-library-preview-tag">${this._assetEscapeHtml(tag)}</span>`).join('')}</div>` : '<div class="asset-library-preview-subtitle">No labels yet.</div>'}
            <div class="asset-library-preview-actions">
                <button type="button" id="asset-preview-import" class="btn-sm"><i class="fas fa-plus"></i> Import</button>
                ${canDelete ? '<button type="button" id="asset-preview-delete" class="btn-sm"><i class="fas fa-trash"></i> Delete</button>' : ''}
            </div>
        `;

        preview.querySelector('#asset-preview-import')?.addEventListener('click', async () => {
            try {
                await this.importAssetFromLibrary(asset.id);
                document.getElementById('asset-library-modal')?.classList.add('hidden');
            } catch (err) {
                Utils.showToast(`Asset import failed: ${err.message}`, 'error');
            }
        });

        preview.querySelector('#asset-preview-delete')?.addEventListener('click', async () => {
            if (!await Utils.showConfirm(`Delete "${asset.name}" from the Assets Library?`)) return;
            try {
                await this.deleteAssetLibraryRecord(asset.id);
                eventBus.emit('asset-library:updated', { deletedId: asset.id });
                await this._renderAssetLibraryGrid(document.getElementById('asset-library-search')?.value?.trim() || '');
                Utils.showToast('Asset deleted', 'info');
            } catch (err) {
                Utils.showToast(`Asset delete failed: ${err.message}`, 'error');
            }
        });
    },

    _renderEmojiAssetPreview(item = null) {
        const preview = document.getElementById('asset-library-preview');
        if (!preview) return;

        if (!item) {
            preview.className = 'asset-library-preview-empty';
            preview.innerHTML = 'Select an emoji to preview it here before importing.';
            return;
        }

        preview.className = '';
        preview.innerHTML = `
            <div class="asset-library-preview-stage">
                <div class="asset-library-preview-emoji" aria-hidden="true">${this._assetEscapeHtml(item.glyph)}</div>
            </div>
            <div class="asset-library-preview-title">${this._assetEscapeHtml(item.name)}</div>
            <div class="asset-library-preview-subtitle">Emoji Asset · ${this._assetEscapeHtml(item.category || 'General')}</div>
            <div class="asset-library-preview-tags">
                ${(item.keywords || '').split(/\s+/).filter(Boolean).slice(0, 8).map(tag => `<span class="asset-library-preview-tag">${this._assetEscapeHtml(tag)}</span>`).join('')}
            </div>
            <div class="asset-library-preview-actions">
                <button type="button" id="asset-preview-import-emoji" class="btn-sm"><i class="fas fa-plus"></i> Import</button>
            </div>
        `;

        preview.querySelector('#asset-preview-import-emoji')?.addEventListener('click', () => {
            this._insertEmoji(item);
            document.getElementById('asset-library-modal')?.classList.add('hidden');
        });
    },

    _setAssetLibraryMode(mode = 'saved') {
        this._assetLibraryMode = mode === 'emoji' ? 'emoji' : 'saved';
        this._syncAssetLibraryModeUI();
        if (this._assetLibraryMode === 'emoji') {
            this._renderEmojiAssetPreview(null);
        } else {
            this._renderAssetLibraryPreview(null);
        }
        this._renderAssetLibraryGrid(document.getElementById('asset-library-search')?.value?.trim() || '');
    },

    _syncAssetLibraryModeUI() {
        const mode = this._assetLibraryMode === 'emoji' ? 'emoji' : 'saved';
        document.querySelectorAll('[data-asset-library-mode]').forEach(btn => {
            const active = btn.dataset.assetLibraryMode === mode;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        const search = document.getElementById('asset-library-search');
        if (search) {
            search.placeholder = mode === 'emoji'
                ? 'Search emojis, categories, keywords...'
                : 'Search assets, folders, labels...';
        }
        const upload = document.getElementById('btn-assets-upload');
        if (upload) {
            upload.style.display = mode === 'emoji' ? 'none' : '';
        }
    },

    showAssetLibrary() {
        const modal = document.getElementById('asset-library-modal');
        if (!modal) return;
        this._assetLibraryMode = this._assetLibraryMode || 'saved';
        this._syncAssetLibraryModeUI();
        modal.classList.remove('hidden');
        if (this._assetLibraryMode === 'emoji') {
            this._renderEmojiAssetPreview(null);
        } else {
            this._renderAssetLibraryPreview(null);
        }
        this._renderAssetLibraryGrid(document.getElementById('asset-library-search')?.value?.trim() || '');
    },

    async importAssetFromLibrary(assetId, options = {}) {
        const record = await this.loadAssetLibraryRecord(assetId);
        if (!record?.data?.objects?.length) {
            throw new Error('Asset payload is empty');
        }
        const payload = JSON.parse(JSON.stringify(record.data));
        this._insertImportedObjects(payload, {
            position: options.position || null,
            assetName: options.assetName || record.asset?.name || null
        });
        return record;
    },

    async _renderAssetLibraryGrid(search = '') {
        const grid = document.getElementById('asset-library-grid');
        const meta = document.getElementById('asset-library-meta');
        if (!grid) return;

        if (this._assetLibraryMode === 'emoji') {
            this._renderEmojiAssetLibraryGrid(search);
            return;
        }

        grid.innerHTML = '<div class="rigged-tpl-empty"><i class="fas fa-spinner fa-spin"></i><p>Loading assets...</p></div>';
        try {
            const result = await this.fetchAssetLibraryList(search);
            const assets = result.assets || [];
            const folders = result.folders || [];

            if (meta) {
                meta.textContent = `${assets.length} asset${assets.length === 1 ? '' : 's'} · ${folders.length} folder${folders.length === 1 ? '' : 's'}`;
            }

            if (!assets.length) {
                grid.innerHTML = '<div class="rigged-tpl-empty"><i class="fas fa-folder-open"></i><p>No assets found.</p><small>Use Upload, or right-click an object and choose "Save to Assets Library".</small></div>';
                this._assetLibrarySelectedId = null;
                this._renderAssetLibraryPreview(null);
                return;
            }

            const grouped = {};
            assets.forEach(asset => {
                const folder = asset.folder || 'General';
                if (!grouped[folder]) grouped[folder] = [];
                grouped[folder].push(asset);
            });
            const folderOrder = ['Front View', 'Side View', 'Back View', 'General'];
            const folderIcons = { 'Front View': 'fa-user', 'Side View': 'fa-user-alt', 'Back View': 'fa-user-slash', 'General': 'fa-folder' };
            const allFolders = [...folderOrder.filter(folder => grouped[folder]), ...Object.keys(grouped).filter(folder => !folderOrder.includes(folder)).sort((a, b) => a.localeCompare(b))];
            if (!assets.find(asset => asset.id === this._assetLibrarySelectedId)) {
                this._assetLibrarySelectedId = assets[0]?.id || null;
            }

            grid.innerHTML = allFolders.map(folder => {
                const items = grouped[folder];
                const icon = folderIcons[folder] || 'fa-folder-tree';
                return `
                    <div class="rigged-tpl-folder" data-folder="${this._assetEscapeHtml(folder)}">
                        <div class="rigged-tpl-folder-header" style="
                            display:flex;align-items:center;gap:8px;padding:8px 10px;
                            background:#2a2a3e;border-radius:6px;cursor:pointer;margin-bottom:6px;
                            border:1px solid #3a3a50;user-select:none;
                        ">
                            <i class="fas ${icon}" style="color:#4ecdc4;font-size:13px;width:16px;text-align:center;"></i>
                            <span style="flex:1;font-size:13px;font-weight:600;color:#ddd;">${this._assetEscapeHtml(folder)}</span>
                            <span style="font-size:11px;color:#888;margin-right:4px;">${items.length}</span>
                            <i class="fas fa-chevron-down rigged-tpl-folder-arrow" style="font-size:10px;color:#888;transition:transform 0.2s;"></i>
                        </div>
                        <div class="rigged-tpl-folder-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:10px;padding:0 4px 10px 4px;">
                            ${items.map(asset => {
                                const visibility = asset.visibility || 'global';
                                const ownerLabel = this._assetOwnerLabel(asset);
                                const canDelete = this._assetCanDelete(asset);
                                return `
                                <div class="rigged-tpl-card ${asset.id === this._assetLibrarySelectedId ? 'asset-library-selected' : ''}" data-id="${this._assetEscapeHtml(asset.id)}">
                                    <div class="rigged-tpl-thumb">
                                        ${(asset.thumbnailUrl || asset.mediaUrl) ? `<img src="${this._assetEscapeHtml(asset.thumbnailUrl || asset.mediaUrl)}" alt="${this._assetEscapeHtml(asset.name)}">` : '<div style="height:100%;display:flex;align-items:center;justify-content:center;color:#666;font-size:11px;">No Preview</div>'}
                                    </div>
                                    <div class="rigged-tpl-name">${this._assetEscapeHtml(asset.name)}</div>
                                    <div style="font-size:10px;color:#888;padding:0 10px 4px 10px;">${asset.meta?.objectCount || 0} object${(asset.meta?.objectCount || 0) === 1 ? '' : 's'}</div>
                                    <div style="font-size:10px;color:#9ca3af;padding:0 10px 8px 10px;display:flex;gap:5px;align-items:center;min-height:14px;">
                                        <i class="fas ${this._assetVisibilityIcon(visibility)}" style="font-size:9px;color:#4ecdc4;"></i>
                                        <span>${this._assetEscapeHtml(this._assetVisibilityLabel(visibility))}</span>
                                        ${ownerLabel ? `<span title="${this._assetEscapeHtml(ownerLabel)}">· ${this._assetEscapeHtml(ownerLabel)}</span>` : ''}
                                    </div>
                                    <div class="rigged-tpl-actions">
                                        <button class="asset-lib-add" title="Import to stage"><i class="fas fa-plus"></i></button>
                                        ${canDelete ? '<button class="asset-lib-delete" title="Delete asset"><i class="fas fa-trash"></i></button>' : ''}
                                    </div>
                                </div>
                            `;
                            }).join('')}
                        </div>
                    </div>
                `;
            }).join('');

            grid.querySelectorAll('.rigged-tpl-folder-header').forEach(header => {
                header.addEventListener('click', () => {
                    const folder = header.closest('.rigged-tpl-folder');
                    const body = folder.querySelector('.rigged-tpl-folder-body');
                    const arrow = header.querySelector('.rigged-tpl-folder-arrow');
                    const collapsed = body.style.display === 'none';
                    body.style.display = collapsed ? 'grid' : 'none';
                    arrow.style.transform = collapsed ? '' : 'rotate(-90deg)';
                });
            });

            const selectAsset = (assetId) => {
                this._assetLibrarySelectedId = assetId;
                grid.querySelectorAll('.rigged-tpl-card').forEach(card => {
                    card.classList.toggle('asset-library-selected', card.dataset.id === assetId);
                });
                this._renderAssetLibraryPreview(assets.find(asset => asset.id === assetId) || null);
            };

            grid.querySelectorAll('.rigged-tpl-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.closest('.rigged-tpl-actions')) return;
                    selectAsset(card.dataset.id);
                });
            });

            grid.querySelectorAll('.asset-lib-add').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const card = e.target.closest('.rigged-tpl-card');
                    const assetId = card?.dataset?.id;
                    if (!assetId) return;
                    try {
                        await this.importAssetFromLibrary(assetId);
                        document.getElementById('asset-library-modal')?.classList.add('hidden');
                    } catch (err) {
                        Utils.showToast(`Asset import failed: ${err.message}`, 'error');
                    }
                });
            });

            grid.querySelectorAll('.asset-lib-delete').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const card = e.target.closest('.rigged-tpl-card');
                    const assetId = card?.dataset?.id;
                    if (!assetId) return;
                    if (!await Utils.showConfirm('Delete this asset from the Assets Library?')) return;
                    try {
                        await this.deleteAssetLibraryRecord(assetId);
                        eventBus.emit('asset-library:updated', { deletedId: assetId });
                        await this._renderAssetLibraryGrid(document.getElementById('asset-library-search')?.value?.trim() || '');
                        Utils.showToast('Asset deleted', 'info');
                    } catch (err) {
                        Utils.showToast(`Asset delete failed: ${err.message}`, 'error');
                    }
                });
            });

            this._renderAssetLibraryPreview(assets.find(asset => asset.id === this._assetLibrarySelectedId) || assets[0] || null);
        } catch (err) {
            if (meta) meta.textContent = 'API unavailable';
            grid.innerHTML = `<div class="rigged-tpl-empty"><i class="fas fa-triangle-exclamation"></i><p>Could not load assets.</p><small>${this._assetEscapeHtml(err.message)}</small></div>`;
            this._renderAssetLibraryPreview(null);
        }
    },

    _renderEmojiAssetLibraryGrid(search = '') {
        const grid = document.getElementById('asset-library-grid');
        const meta = document.getElementById('asset-library-meta');
        const library = window.EmojiLibraryData;
        if (!grid) return;

        if (!library || !Array.isArray(library.items)) {
            grid.innerHTML = '<div class="rigged-tpl-empty"><i class="fas fa-spinner fa-spin"></i><p>Loading emoji assets...</p></div>';
            if (meta) meta.textContent = 'Loading emojis';
            return;
        }

        const q = String(search || '').toLowerCase().trim();
        const items = library.items.filter(item => {
            const haystack = `${item.name} ${item.glyph} ${item.category} ${item.keywords || ''}`.toLowerCase();
            return !q || haystack.includes(q);
        });

        if (meta) {
            meta.textContent = `${items.length} emoji asset${items.length === 1 ? '' : 's'}`;
        }

        if (!items.length) {
            grid.innerHTML = '<div class="rigged-tpl-empty"><i class="fas fa-face-smile"></i><p>No emoji assets found.</p><small>Try a category like smile, food, travel, or symbol.</small></div>';
            this._renderEmojiAssetPreview(null);
            return;
        }

        grid.innerHTML = `
            <div class="rigged-tpl-folder" data-folder="Emoji Assets">
                <div class="rigged-tpl-folder-header" style="
                    display:flex;align-items:center;gap:8px;padding:8px 10px;
                    background:#2a2a3e;border-radius:6px;margin-bottom:6px;
                    border:1px solid #3a3a50;user-select:none;
                ">
                    <i class="fas fa-face-smile" style="color:#4ecdc4;font-size:13px;width:16px;text-align:center;"></i>
                    <span style="flex:1;font-size:13px;font-weight:600;color:#ddd;">Emoji Assets</span>
                    <span style="font-size:11px;color:#888;margin-right:4px;">${items.length}</span>
                </div>
                <div class="rigged-tpl-folder-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;padding:0 4px 10px 4px;">
                    ${items.map(item => `
                        <div class="rigged-tpl-card asset-library-emoji-card" data-emoji-id="${this._assetEscapeHtml(item.id)}">
                            <div class="rigged-tpl-thumb">
                                <span class="asset-library-emoji-glyph" aria-hidden="true">${this._assetEscapeHtml(item.glyph)}</span>
                            </div>
                            <div class="rigged-tpl-name">${this._assetEscapeHtml(item.name)}</div>
                            <div style="font-size:10px;color:#888;padding:0 10px 8px 10px;">${this._assetEscapeHtml(item.category)}</div>
                            <div class="rigged-tpl-actions">
                                <button class="asset-lib-add-emoji" title="Import to stage"><i class="fas fa-plus"></i></button>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;

        const findItem = (id) => items.find(item => item.id === id) || null;
        const selectEmoji = (item) => {
            if (!item) return;
            this._assetLibrarySelectedEmojiId = item.id;
            grid.querySelectorAll('.rigged-tpl-card').forEach(card => {
                card.classList.toggle('asset-library-selected', card.dataset.emojiId === item.id);
            });
            this._renderEmojiAssetPreview(item);
        };

        grid.querySelectorAll('.rigged-tpl-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.rigged-tpl-actions')) return;
                selectEmoji(findItem(card.dataset.emojiId));
            });
        });

        grid.querySelectorAll('.asset-lib-add-emoji').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = findItem(e.target.closest('.rigged-tpl-card')?.dataset?.emojiId);
                if (!item) return;
                this._insertEmoji(item);
                document.getElementById('asset-library-modal')?.classList.add('hidden');
            });
        });

        selectEmoji(findItem(this._assetLibrarySelectedEmojiId) || items[0]);
    },

    saveObjectAsTemplate(obj) {
        if (!obj) {
            const selected = this.getSelectedObjects();
            obj = selected[0];
        }
        if (!obj) { Utils.showToast('No object selected', 'warning'); return; }

        // Collect objects (include group members)
        let objs = [obj];
        if (obj.groupId && this.groups[obj.groupId]) {
            objs = this.objects.filter(o => o.groupId === obj.groupId);
        }

        // Auto-detect folder from bodyPartData or name
        const detectedFolder = this._detectTemplateFolder(obj, objs);
        // Suggest name from group name or object name
        const suggestedName = (obj.groupId && this.groupNames?.[obj.groupId])
            ? this.groupNames[obj.groupId]
            : (obj.name || obj.type);

        this._showSaveTemplateDialog(suggestedName, detectedFolder, (name, folder) => {
            this._completeSaveTemplate(objs, obj, name, folder);
        });
    },

    /** Detect which template folder is appropriate based on charType / object names */
    _detectTemplateFolder(obj, objs) {
        // Check bodyPartData.charType across all objects
        const charTypes = new Set();
        objs.forEach(o => {
            if (o.bodyPartData?.charType) charTypes.add(o.bodyPartData.charType.toLowerCase());
        });
        if (charTypes.has('human-front') || charTypes.has('humanfront')) return 'Front View';
        if (charTypes.has('human-side') || charTypes.has('humanside')) return 'Side View';

        // Check object/group names for view hints
        const names = objs.map(o => (o.name || '').toLowerCase()).join(' ');
        const groupName = (obj.groupId && this.groupNames?.[obj.groupId] || '').toLowerCase();
        const combined = names + ' ' + groupName;
        if (/\bfront\b/.test(combined)) return 'Front View';
        if (/\bside\b/.test(combined)) return 'Side View';
        if (/\bback\b/.test(combined)) return 'Back View';

        return 'General';
    },

    /** Show the save-template dialog with folder picker and name input */
    _showSaveTemplateDialog(suggestedName, detectedFolder, onSave) {
        // Remove any existing dialog
        document.getElementById('save-template-dialog-overlay')?.remove();

        const folders = ['Front View', 'Side View', 'Back View', 'General'];

        const overlay = document.createElement('div');
        overlay.id = 'save-template-dialog-overlay';
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:100000;display:flex;align-items:center;justify-content:center;';

        const dialog = document.createElement('div');
        dialog.style.cssText = 'background:#1e1e2e;border:1px solid #444;border-radius:10px;padding:20px;min-width:340px;max-width:420px;color:#ccc;font-family:inherit;box-shadow:0 8px 32px rgba(0,0,0,0.5);';
        dialog.innerHTML = `
            <h3 style="margin:0 0 16px 0;font-size:15px;color:#fff;"><i class="fas fa-bookmark" style="color:#4ecdc4;margin-right:8px;"></i>Save as Template</h3>
            <label style="display:block;font-size:12px;margin-bottom:4px;color:#aaa;">Folder</label>
            <div id="stpl-folder-list" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:14px;">
                ${folders.map(f => `
                    <button class="stpl-folder-btn" data-folder="${f}" style="
                        padding:6px 14px;border-radius:6px;border:1px solid ${f === detectedFolder ? '#4ecdc4' : '#555'};
                        background:${f === detectedFolder ? '#4ecdc420' : '#2a2a3e'};color:${f === detectedFolder ? '#4ecdc4' : '#ccc'};
                        cursor:pointer;font-size:12px;transition:all 0.15s;
                    "><i class="fas ${f === 'Front View' ? 'fa-user' : f === 'Side View' ? 'fa-user-alt' : f === 'Back View' ? 'fa-user-slash' : 'fa-folder'}"></i> ${f}</button>
                `).join('')}
            </div>
            <label style="display:block;font-size:12px;margin-bottom:4px;color:#aaa;">Template Name</label>
            <input id="stpl-name-input" type="text" value="${suggestedName.replace(/"/g, '&quot;')}" 
                style="width:100%;box-sizing:border-box;padding:8px 10px;border-radius:6px;border:1px solid #555;background:#2a2a3e;color:#fff;font-size:13px;outline:none;" />
            <div style="display:flex;gap:8px;margin-top:16px;justify-content:flex-end;">
                <button id="stpl-cancel" style="padding:7px 18px;border-radius:6px;border:1px solid #555;background:transparent;color:#aaa;cursor:pointer;font-size:12px;">Cancel</button>
                <button id="stpl-save" style="padding:7px 18px;border-radius:6px;border:none;background:#4ecdc4;color:#111;cursor:pointer;font-size:12px;font-weight:600;">Save</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        let selectedFolder = detectedFolder;
        const nameInput = dialog.querySelector('#stpl-name-input');
        nameInput.focus();
        nameInput.select();

        // Folder button clicks
        dialog.querySelectorAll('.stpl-folder-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectedFolder = btn.dataset.folder;
                dialog.querySelectorAll('.stpl-folder-btn').forEach(b => {
                    const active = b.dataset.folder === selectedFolder;
                    b.style.borderColor = active ? '#4ecdc4' : '#555';
                    b.style.background = active ? '#4ecdc420' : '#2a2a3e';
                    b.style.color = active ? '#4ecdc4' : '#ccc';
                });
            });
        });

        // Cancel
        const close = () => overlay.remove();
        dialog.querySelector('#stpl-cancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        // Save
        const doSave = () => {
            const name = nameInput.value.trim();
            if (!name) { nameInput.style.borderColor = '#ff6b6b'; return; }
            close();
            onSave(name, selectedFolder);
        };
        dialog.querySelector('#stpl-save').addEventListener('click', doSave);
        nameInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') doSave();
            if (e.key === 'Escape') close();
        });
    },

    /** Complete saving the template after dialog confirms name + folder */
    _completeSaveTemplate(objs, obj, name, folder) {
        // Generate thumbnail
        const thumbSize = 120;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objs.forEach(o => {
            minX = Math.min(minX, o.x);
            minY = Math.min(minY, o.y);
            maxX = Math.max(maxX, o.x + o.width);
            maxY = Math.max(maxY, o.y + o.height);
        });
        const bw = maxX - minX || 1;
        const bh = maxY - minY || 1;
        const scale = Math.min(thumbSize / bw, thumbSize / bh, 2);
        const cw = Math.ceil(bw * scale) + 20;
        const ch = Math.ceil(bh * scale) + 20;
        const offscreen = document.createElement('canvas');
        offscreen.width = cw;
        offscreen.height = ch;
        const ctx = offscreen.getContext('2d');
        ctx.translate(10 - minX * scale, 10 - minY * scale);
        ctx.scale(scale, scale);
        objs.forEach(o => { ctx.save(); o.render(ctx); ctx.restore(); });
        const thumbnail = offscreen.toDataURL('image/png', 0.7);

        const template = {
            id: 'tpl_' + Date.now(),
            name: name,
            folder: folder,
            thumbnail,
            created: Date.now(),
            data: {
                format: 'animstage-object',
                version: 1,
                objects: objs.map(o => StageObject.stripCompressionRuntimeState(o.toJSON())),
                group: obj.groupId ? {
                    id: obj.groupId,
                    name: this.groupNames?.[obj.groupId] || obj.groupId
                } : null
            }
        };

        const templates = JSON.parse(localStorage.getItem('riggedTemplates') || '[]');
        templates.push(template);
        localStorage.setItem('riggedTemplates', JSON.stringify(templates));
        Utils.showToast(`Saved "${name}" to ${folder}`, 'success');
    },

    /** Save object as SVG Template to the template library */
    saveObjectAsSVGTemplate(obj) {
        if (!obj) {
            const selected = this.getSelectedObjects();
            obj = selected[0];
        }
        if (!obj) { Utils.showToast('No object selected', 'warning'); return; }
        if (!this.exporter) { Utils.showToast('Export module not available', 'warning'); return; }

        // Collect objects (include group members)
        let objs = [obj];
        if (obj.groupId && this.groups[obj.groupId]) {
            objs = this.objects.filter(o => o.groupId === obj.groupId);
        }

        const detectedFolder = this._detectTemplateFolder(obj, objs);
        const suggestedName = (obj.groupId && this.groupNames?.[obj.groupId])
            ? this.groupNames[obj.groupId]
            : (obj.name || obj.type);

        this._showSaveTemplateDialog(suggestedName, detectedFolder, (name, folder) => {
            this._completeSaveSVGTemplate(objs, obj, name, folder);
        });
    },

    /** Complete saving SVG template after dialog confirms name + folder */
    _completeSaveSVGTemplate(objs, obj, name, folder) {
        // Generate SVG content
        const padding = 10;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        objs.forEach(o => {
            const pivot = o.getPivotPoint();
            const corners = [
                { x: o.x, y: o.y },
                { x: o.x + o.width, y: o.y },
                { x: o.x + o.width, y: o.y + o.height },
                { x: o.x, y: o.y + o.height }
            ];
            if (o.rotation) {
                const rad = o.rotation * Math.PI / 180;
                const cos = Math.cos(rad), sin = Math.sin(rad);
                corners.forEach(c => {
                    const dx = c.x - pivot.x, dy = c.y - pivot.y;
                    c.x = pivot.x + dx * cos - dy * sin;
                    c.y = pivot.y + dx * sin + dy * cos;
                });
            }
            corners.forEach(c => {
                if (c.x < minX) minX = c.x;
                if (c.y < minY) minY = c.y;
                if (c.x > maxX) maxX = c.x;
                if (c.y > maxY) maxY = c.y;
            });
        });

        const svgW = Math.ceil(maxX - minX + padding * 2);
        const svgH = Math.ceil(maxY - minY + padding * 2);
        const viewMinX = minX - padding;
        const viewMinY = minY - padding;

        let defs = '';
        let defsCount = 0;
        let body = '';

        objs.forEach(o => {
            const result = this.exporter._objectToSVG(o, defsCount, true);
            body += result.svg;
            if (result.defs) defs += result.defs;
            defsCount = result.defsCount;
        });

        const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${svgW}" height="${svgH}" viewBox="${viewMinX} ${viewMinY} ${svgW} ${svgH}">\n${defs ? `<defs>\n${defs}</defs>\n` : ''}${body}</svg>`;

        // Generate thumbnail from SVG
        const thumbSize = 120;
        const svgBlob = new Blob([svgContent], { type: 'image/svg+xml' });
        const svgUrl = URL.createObjectURL(svgBlob);
        const img = new Image();
        img.onload = () => {
            const scale = Math.min(thumbSize / svgW, thumbSize / svgH, 2);
            const cw = Math.ceil(svgW * scale) + 20;
            const ch = Math.ceil(svgH * scale) + 20;
            const offscreen = document.createElement('canvas');
            offscreen.width = cw;
            offscreen.height = ch;
            const ctx = offscreen.getContext('2d');
            ctx.drawImage(img, (cw - svgW * scale) / 2, (ch - svgH * scale) / 2, svgW * scale, svgH * scale);
            const thumbnail = offscreen.toDataURL('image/png', 0.7);
            URL.revokeObjectURL(svgUrl);

            const svgDataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));

            const template = {
                id: 'tpl_' + Date.now(),
                name: name,
                folder: folder,
                thumbnail,
                created: Date.now(),
                data: {
                    format: 'svg',
                    svgContent: svgDataUri,
                    width: svgW,
                    height: svgH
                }
            };

            const templates = JSON.parse(localStorage.getItem('riggedTemplates') || '[]');
            templates.push(template);
            localStorage.setItem('riggedTemplates', JSON.stringify(templates));
            Utils.showToast(`Saved "${name}" as SVG to ${folder}`, 'success');
        };
        img.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            // Fallback: save without thumbnail
            const svgDataUri = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgContent)));
            const template = {
                id: 'tpl_' + Date.now(),
                name: name,
                folder: folder,
                thumbnail: '',
                created: Date.now(),
                data: {
                    format: 'svg',
                    svgContent: svgDataUri,
                    width: svgW,
                    height: svgH
                }
            };
            const templates = JSON.parse(localStorage.getItem('riggedTemplates') || '[]');
            templates.push(template);
            localStorage.setItem('riggedTemplates', JSON.stringify(templates));
            Utils.showToast(`Saved "${name}" as SVG to ${folder}`, 'success');
        };
        img.src = svgUrl;
    },

    showRiggedTemplates() {
        const modal = document.getElementById('rigged-templates-modal');
        if (!modal) return;
        modal.classList.remove('hidden');
        this._renderRiggedTemplatesGrid();
    },

    _renderRiggedTemplatesGrid() {
        const grid = document.getElementById('rigged-templates-grid');
        if (!grid) return;
        const templates = JSON.parse(localStorage.getItem('riggedTemplates') || '[]');

        if (templates.length === 0) {
            grid.innerHTML = '<div class="rigged-tpl-empty"><i class="fas fa-box-open"></i><p>No saved templates yet.</p><small>Right-click an object and choose "Save as Template" to add one.</small></div>';
            return;
        }

        // Group templates by folder
        const folderOrder = ['Front View', 'Side View', 'Back View', 'General'];
        const folderIcons = { 'Front View': 'fa-user', 'Side View': 'fa-user-alt', 'Back View': 'fa-user-slash', 'General': 'fa-folder' };
        const grouped = {};
        templates.forEach(t => {
            const folder = t.folder || 'General';
            if (!grouped[folder]) grouped[folder] = [];
            grouped[folder].push(t);
        });
        // Include any custom folders not in the standard list
        const allFolders = [...folderOrder.filter(f => grouped[f]), ...Object.keys(grouped).filter(f => !folderOrder.includes(f))];

        grid.innerHTML = allFolders.map(folder => {
            const items = grouped[folder];
            const icon = folderIcons[folder] || 'fa-folder';
            return `
                <div class="rigged-tpl-folder" data-folder="${folder}">
                    <div class="rigged-tpl-folder-header" style="
                        display:flex;align-items:center;gap:8px;padding:8px 10px;
                        background:#2a2a3e;border-radius:6px;cursor:pointer;margin-bottom:6px;
                        border:1px solid #3a3a50;user-select:none;
                    ">
                        <i class="fas ${icon}" style="color:#4ecdc4;font-size:13px;width:16px;text-align:center;"></i>
                        <span style="flex:1;font-size:13px;font-weight:600;color:#ddd;">${folder}</span>
                        <span style="font-size:11px;color:#888;margin-right:4px;">${items.length}</span>
                        <i class="fas fa-chevron-down rigged-tpl-folder-arrow" style="font-size:10px;color:#888;transition:transform 0.2s;"></i>
                    </div>
                    <div class="rigged-tpl-folder-body" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px;padding:0 4px 10px 4px;">
                        ${items.map(t => `
                            <div class="rigged-tpl-card" data-id="${t.id}">
                                <div class="rigged-tpl-thumb">
                                    <img src="${t.thumbnail}" alt="${t.name}">
                                    ${t.data?.format === 'svg' ? '<span class="rigged-tpl-svg-badge">SVG</span>' : ''}
                                </div>
                                <div class="rigged-tpl-name">${t.name}</div>
                                <div class="rigged-tpl-actions">
                                    <button class="rigged-tpl-add" title="Add to stage"><i class="fas fa-plus"></i></button>
                                    <button class="rigged-tpl-export" title="${t.data?.format === 'svg' ? 'Export as SVG' : 'Export as JSON'}"><i class="fas fa-file-export"></i></button>
                                    <button class="rigged-tpl-delete" title="Delete"><i class="fas fa-trash"></i></button>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');

        // Folder collapse/expand toggle
        grid.querySelectorAll('.rigged-tpl-folder-header').forEach(header => {
            header.addEventListener('click', () => {
                const folder = header.closest('.rigged-tpl-folder');
                const body = folder.querySelector('.rigged-tpl-folder-body');
                const arrow = header.querySelector('.rigged-tpl-folder-arrow');
                const collapsed = body.style.display === 'none';
                body.style.display = collapsed ? 'grid' : 'none';
                arrow.style.transform = collapsed ? '' : 'rotate(-90deg)';
            });
        });

        // Add to stage
        grid.querySelectorAll('.rigged-tpl-add').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.rigged-tpl-card');
                const t = templates.find(t => t.id === card.dataset.id);
                if (t) {
                    if (t.data.format === 'svg') {
                        // Insert SVG template as image object
                        const img = new Image();
                        img.onload = () => {
                            const cx = this.stage.width / 2;
                            const cy = this.stage.height / 2;
                            const newObj = new StageObject('image', {
                                x: cx - t.data.width / 2,
                                y: cy - t.data.height / 2,
                                width: t.data.width,
                                height: t.data.height,
                                name: t.name,
                                imageSrc: t.data.svgContent
                            });
                            newObj.imageElement = img;
                            this.objects.push(newObj);
                            this.select([newObj.id]);
                            eventBus.emit('history:push');
                            this.updateObjectList();
                            this.stage.requestRender();
                        };
                        img.src = t.data.svgContent;
                    } else {
                        this._insertImportedObjects(JSON.parse(JSON.stringify(t.data)));
                    }
                    document.getElementById('rigged-templates-modal')?.classList.add('hidden');
                }
            });
        });

        // Export as JSON / SVG
        grid.querySelectorAll('.rigged-tpl-export').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const card = e.target.closest('.rigged-tpl-card');
                const t = templates.find(t => t.id === card.dataset.id);
                if (t) {
                    const safeName = t.name.replace(/[^a-z0-9_-]/gi, '_');
                    let blob, ext;
                    if (t.data.format === 'svg') {
                        // Decode SVG data URI and export as .svg
                        const base64 = t.data.svgContent.split(',')[1];
                        const svgStr = decodeURIComponent(escape(atob(base64)));
                        blob = new Blob([svgStr], { type: 'image/svg+xml' });
                        ext = 'svg';
                    } else {
                        const json = JSON.stringify(t.data, null, 2);
                        blob = new Blob([json], { type: 'application/json' });
                        ext = 'json';
                    }
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${safeName}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    setTimeout(() => URL.revokeObjectURL(url), 3000);
                    Utils.showToast(`Exported "${t.name}"`, 'success');
                }
            });
        });

        // Delete
        grid.querySelectorAll('.rigged-tpl-delete').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const card = e.target.closest('.rigged-tpl-card');
                const id = card.dataset.id;
                if (!await Utils.showConfirm('Delete this template?')) return;
                const updated = templates.filter(t => t.id !== id);
                localStorage.setItem('riggedTemplates', JSON.stringify(updated));
                this._renderRiggedTemplatesGrid();
                Utils.showToast('Template deleted', 'info');
            });
        });
    },

    moveSelected(dx, dy) {
        this.getSelectedObjects().forEach(obj => {
            if (obj.locked) return;
            obj.x += dx;
            obj.y += dy;
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                obj.pathPoints.forEach(p => { p.x += dx; p.y += dy; });
            }
        });
        this.updateProperties();
        this.stage.requestRender();
    },

    _getCharacterStackModel(list = this.objects) {
        const policy = globalThis.CharacterStackPolicy;
        return policy?.buildModel?.(Array.isArray(list) ? list : []) || {
            objects: Array.isArray(list) ? list : [],
            byObjectId: new Map(),
            characterBundles: []
        };
    },

    getCharacterStackBundles(options = {}) {
        const bundles = this._getCharacterStackModel(this.objects).characterBundles.slice();
        return options.frontToBack === true ? bundles.reverse() : bundles;
    },

    getCharacterStackBundleForObject(obj) {
        if (!obj?.id) return null;
        return this._getCharacterStackModel(this.objects).byObjectId.get(String(obj.id)) || null;
    },

    getCharacterStackDisplayName(bundle, fallbackIndex = 0) {
        const root = bundle?.root || null;
        const titleize = value => String(value || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, char => char.toUpperCase())
            .trim();
        const svgName = root?._svgCharacterConfig?.name
            || root?._svgCharacterConfig?.presetName
            || root?._svgAfricanPremiumAssetId
            || root?._svgCharacterPremiumAssetId;
        if (svgName) return titleize(svgName);
        const ucName = root?._ucCharacterStyleConfig?.name
            || root?._ucCharacterStyleConfig?.presetName
            || root?._ucCharacterStyleConfig?.preset;
        if (ucName) return titleize(ucName);
        const rootName = String(root?.name || '').trim();
        if (rootName && !/^torso$/i.test(rootName)) return rootName;
        const isSvg = bundle?.members?.some(obj => obj?._svgCharacter || obj?._svgCharacterInstanceId);
        return `${isSvg ? 'SVG Character' : 'Universal Character'} ${fallbackIndex + 1}`;
    },

    getCharacterStackViewLabel(bundle) {
        const root = bundle?.root || null;
        const raw = root?._svgCharacterViewProfileKey
            || root?._svgCharacterConfig?.view
            || root?._ucCharacterStyleConfig?.view
            || root?._ucCharacterVariantKey
            || root?._armaturePromotedProfile
            || root?._armatureFrontBackFacing
            || 'front';
        return String(raw)
            .replace(/[-_]+/g, ' ')
            .replace(/\b3q\b/i, '3/4')
            .replace(/\b\w/g, char => char.toUpperCase());
    },

    _stampCharacterStackOrder(orderedBundles) {
        orderedBundles.forEach((bundle, order) => {
            const stackId = bundle.stackId || Utils.generateId('character');
            bundle.members.forEach(obj => {
                obj._characterStackId = stackId;
                obj._characterStackOrder = order;
            });
        });
    },

    _finishCharacterStackChange(message) {
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('character-stack:changed', this.getCharacterStackBundles());
        eventBus.emit('history:push');
        if (message) Utils.showToast(message, 'info');
    },

    setCharacterStackOrder(frontToBackKeys, options = {}) {
        const bundles = this.getCharacterStackBundles();
        if (bundles.length < 2 || !Array.isArray(frontToBackKeys)) return false;
        const byKey = new Map(bundles.map(bundle => [bundle.key, bundle]));
        const frontToBack = [];
        const seen = new Set();
        frontToBackKeys.forEach(key => {
            const bundle = byKey.get(key);
            if (!bundle || seen.has(bundle.key)) return;
            seen.add(bundle.key);
            frontToBack.push(bundle);
        });
        bundles.slice().reverse().forEach(bundle => {
            if (seen.has(bundle.key)) return;
            seen.add(bundle.key);
            frontToBack.push(bundle);
        });
        if (frontToBack.length !== bundles.length) return false;

        const backToFront = frontToBack.slice().reverse();
        const before = bundles.map(bundle => bundle.key).join('|');
        const after = backToFront.map(bundle => bundle.key).join('|');
        if (before === after && bundles.every(bundle => bundle.explicitOrder != null)) return false;
        this._stampCharacterStackOrder(backToFront);
        this._finishCharacterStackChange(options.message || 'Character order updated');
        return true;
    },

    _reorderCharacterStacks(targetObjects, action) {
        const model = this._getCharacterStackModel(this.objects);
        const bundles = model.characterBundles || [];
        if (!bundles.length) return false;
        const objects = Array.isArray(targetObjects) && targetObjects.length
            ? targetObjects
            : this.getSelectedObjects();
        const selectedKeys = new Set(objects.map(obj => (
            obj?.id ? model.byObjectId.get(String(obj.id))?.key : null
        )).filter(Boolean));
        if (!selectedKeys.size) return false;

        // Build render units (each character as one block, plus standalone
        // objects) in current stack order so a character can move past props,
        // backdrops, and other non-character objects — not only other characters.
        const units = [];
        const seenCharacters = new Set();
        this.objects.forEach(obj => {
            const bundle = obj?.id ? model.byObjectId.get(String(obj.id)) : null;
            if (bundle) {
                if (seenCharacters.has(bundle.key)) return;
                seenCharacters.add(bundle.key);
                units.push({ type: 'character', key: bundle.key, bundle, members: bundle.members.slice() });
            } else {
                units.push({ type: 'object', obj });
            }
        });

        const isSelected = unit => unit.type === 'character' && selectedKeys.has(unit.key);
        let ordered = units.slice();
        if (action === 'front') {
            ordered = ordered.filter(unit => !isSelected(unit)).concat(ordered.filter(isSelected));
        } else if (action === 'back') {
            ordered = ordered.filter(isSelected).concat(ordered.filter(unit => !isSelected(unit)));
        } else if (action === 'forward') {
            for (let index = ordered.length - 2; index >= 0; index--) {
                if (!isSelected(ordered[index]) || isSelected(ordered[index + 1])) continue;
                [ordered[index], ordered[index + 1]] = [ordered[index + 1], ordered[index]];
            }
        } else if (action === 'backward') {
            for (let index = 1; index < ordered.length; index++) {
                if (!isSelected(ordered[index]) || isSelected(ordered[index - 1])) continue;
                [ordered[index], ordered[index - 1]] = [ordered[index - 1], ordered[index]];
            }
        } else {
            return false;
        }

        const signature = list => list
            .map(unit => unit.type === 'character' ? `C:${unit.key}` : `O:${unit.obj?.id}`)
            .join('|');
        if (signature(units) === signature(ordered)) return false;

        // Rebuild the base object array so each character stays a contiguous
        // block in the new stack order; non-character objects keep their order.
        const rebuilt = [];
        ordered.forEach(unit => {
            if (unit.type === 'character') unit.members.forEach(member => rebuilt.push(member));
            else rebuilt.push(unit.obj);
        });
        if (rebuilt.length === this.objects.length) {
            this.objects.splice(0, this.objects.length, ...rebuilt);
        }

        // Keep character-vs-character stack order aligned with the new array.
        this._stampCharacterStackOrder(ordered.filter(unit => unit.type === 'character').map(unit => unit.bundle));

        const messages = {
            front: 'Character moved to front',
            back: 'Character moved to back',
            forward: 'Character moved forward',
            backward: 'Character moved backward'
        };
        this._finishCharacterStackChange(messages[action]);
        return true;
    },

    bringCharactersForward(targetObjects = null) {
        return this._reorderCharacterStacks(targetObjects, 'forward');
    },

    sendCharactersBackward(targetObjects = null) {
        return this._reorderCharacterStacks(targetObjects, 'backward');
    },

    bringCharactersToFront(targetObjects = null) {
        return this._reorderCharacterStacks(targetObjects, 'front');
    },

    sendCharactersToBack(targetObjects = null) {
        return this._reorderCharacterStacks(targetObjects, 'back');
    },

    _getRigLayerOrderMembers(seedObj) {
        if (!seedObj?.id || !Array.isArray(this.objects)) return [];
        const all = this.objects;
        const jointSystem = window.app?.jointSystem || window.jointSystem || null;
        let connected = [];
        try {
            connected = typeof this._getCharacterJointObjectsFromSelection === 'function'
                ? this._getCharacterJointObjectsFromSelection(seedObj)
                : [];
        } catch (_) {
            connected = [];
        }

        let armature = null;
        try {
            if (jointSystem && connected.length >= 3 && typeof jointSystem._detectArmatureFromPool === 'function') {
                armature = jointSystem._detectArmatureFromPool(connected);
            }
        } catch (_) {
            armature = null;
        }
        if (!armature?.root && jointSystem && typeof jointSystem._detectSelectedArmature === 'function') {
            try {
                const selectedArmature = jointSystem._detectSelectedArmature();
                const selectedPartIds = new Set([
                    selectedArmature?.root?.id,
                    ...Object.values(selectedArmature?.parts || {}).map(part => part?.obj?.id)
                ].filter(Boolean));
                if (selectedPartIds.has(seedObj.id)) armature = selectedArmature;
            } catch (_) {}
        }

        const ids = new Set();
        const familyIds = new Set();
        const rootIds = new Set();
        const addIdentity = (obj) => {
            if (!obj?.id) return;
            ids.add(obj.id);
            if (obj.pinnedTo) ids.add(obj.pinnedTo);
            if (obj._facialParentHead) ids.add(obj._facialParentHead);
            if (obj._ucGarmentForPartId) ids.add(obj._ucGarmentForPartId);
            if (obj._ucGarmentRootId) rootIds.add(obj._ucGarmentRootId);
            const family = obj._ucCharacterFamilyId || obj.ucCharacterFamilyId || obj._ucGarmentFamilyId || obj.ucGarmentFamilyId;
            if (family) familyIds.add(String(family));
        };

        addIdentity(seedObj);
        connected.forEach(addIdentity);
        if (armature?.root) {
            addIdentity(armature.root);
            Object.values(armature.parts || {}).forEach(part => addIdentity(part?.obj));
        }

        const isMember = (obj) => {
            if (!obj?.id) return false;
            const family = obj._ucCharacterFamilyId || obj.ucCharacterFamilyId || obj._ucGarmentFamilyId || obj.ucGarmentFamilyId;
            if (family && familyIds.has(String(family))) return true;
            if (ids.has(obj.id) || ids.has(obj.pinnedTo) || ids.has(obj._facialParentHead) || ids.has(obj._ucGarmentForPartId)) return true;
            if (obj._ucGarmentRootId && (rootIds.has(obj._ucGarmentRootId) || ids.has(obj._ucGarmentRootId))) return true;
            return false;
        };

        const members = all.filter(isMember);
        if (!members.some(obj => obj?.id === seedObj.id)) return [];
        const rigCount = members.filter(obj => obj?._armaturePartKey || obj?._armatureRoleKey || Array.isArray(obj?.joints)).length;
        return rigCount >= 2 ? [...new Map(members.map(obj => [obj.id, obj])).values()] : [];
    },

    _moveRigObjectInLayerOrder(obj, direction) {
        const members = this._getRigLayerOrderMembers(obj);
        if (!members.length) return false;
        const stageIndex = (entry) => this.objects.indexOf(entry);
        const order = [...members].sort((a, b) => {
            const al = Number(a._armatureDrawLayer ?? a.armatureDrawLayer ?? a.layer);
            const bl = Number(b._armatureDrawLayer ?? b.armatureDrawLayer ?? b.layer);
            const aKey = Number.isFinite(al) ? al : stageIndex(a);
            const bKey = Number.isFinite(bl) ? bl : stageIndex(b);
            return (aKey - bKey) || (stageIndex(a) - stageIndex(b));
        });
        const currentIndex = order.findIndex(entry => entry?.id === obj.id);
        const nextIndex = currentIndex + direction;
        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= order.length) return false;

        [order[currentIndex], order[nextIndex]] = [order[nextIndex], order[currentIndex]];

        const finiteLayers = order.map(entry => Number(entry.layer)).filter(Number.isFinite);
        const finiteDrawLayers = order.map(entry => Number(entry._armatureDrawLayer ?? entry.armatureDrawLayer)).filter(Number.isFinite);
        const stageIndices = order.map(stageIndex).filter(index => index >= 0);
        const baseLayer = finiteDrawLayers.length
            ? Math.min(...finiteDrawLayers)
            : finiteLayers.length
            ? Math.min(...finiteLayers)
            : (stageIndices.length ? Math.min(...stageIndices) : 0);
        order.forEach((entry, index) => {
            if (entry?.id) entry._armatureDrawLayer = baseLayer + index;
        });

        const ids = new Set(order.map(entry => entry.id));
        const minIndex = stageIndices.length ? Math.min(...stageIndices) : 0;
        const remaining = this.objects.filter(entry => !ids.has(entry?.id));
        remaining.splice(minIndex, 0, ...order);
        this.objects.splice(0, this.objects.length, ...remaining);
        return true;
    },

    bringForward(targetObj = null) {
        const selected = targetObj ? [targetObj] : this.getSelectedObjects();
        let changed = false;
        // Iterate in reverse to avoid index-shifting issues
        for (let i = selected.length - 1; i >= 0; i--) {
            const obj = selected[i];
            if (this._moveRigObjectInLayerOrder(obj, 1)) {
                changed = true;
                continue;
            }
            const idx = this.objects.indexOf(obj);
            if (idx < this.objects.length - 1) {
                this.objects.splice(idx, 1);
                this.objects.splice(idx + 1, 0, obj);
                changed = true;
            }
        }
        if (!changed) return;
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    sendBackward(targetObj = null) {
        const selected = targetObj ? [targetObj] : this.getSelectedObjects();
        let changed = false;
        selected.forEach(obj => {
            if (this._moveRigObjectInLayerOrder(obj, -1)) {
                changed = true;
                return;
            }
            const idx = this.objects.indexOf(obj);
            if (idx > 0) {
                this.objects.splice(idx, 1);
                this.objects.splice(idx - 1, 0, obj);
                changed = true;
            }
        });
        if (!changed) return;
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    // === Flip Operations ===
    flipSelectedH() {
        this.getSelectedObjects().forEach(obj => {
            this._bakeFlipH(obj);
        });
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Flipped horizontally', 'info');
    },

    flipSelectedV() {
        this.getSelectedObjects().forEach(obj => {
            this._bakeFlipV(obj);
        });
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Flipped vertically', 'info');
    },

    /**
     * Bake a horizontal flip into the object's geometry.
     * For pathPoints: mirror coordinates. For images: flip pixels.
     * For other shapes: absorb into scaleX. flipH always ends up false.
     */
    _bakeFlipH(obj) {
        if (obj.flipH) {
            // Existing canvas flip — clicking Flip H clears it (visual un-flips)
            obj.flipH = false;
        } else {
            const cx = obj.x + obj.width / 2;
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                obj.pathPoints.forEach(p => {
                    p.x = 2 * cx - p.x;
                    if (p.cp1x !== undefined) p.cp1x = 2 * cx - p.cp1x;
                    if (p.cp2x !== undefined) p.cp2x = 2 * cx - p.cp2x;
                });
            } else if (obj.type === 'image' && obj.image) {
                this._flipImagePixels(obj, true, false);
            } else {
                obj.scaleX = (obj.scaleX || 1) * -1;
            }
        }
    },

    /**
     * Bake a vertical flip into the object's geometry.
     */
    _bakeFlipV(obj) {
        if (obj.flipV) {
            obj.flipV = false;
        } else {
            const cy = obj.y + obj.height / 2;
            if (obj.pathPoints && obj.pathPoints.length > 0) {
                obj.pathPoints.forEach(p => {
                    p.y = 2 * cy - p.y;
                    if (p.cp1y !== undefined) p.cp1y = 2 * cy - p.cp1y;
                    if (p.cp2y !== undefined) p.cp2y = 2 * cy - p.cp2y;
                });
            } else if (obj.type === 'image' && obj.image) {
                this._flipImagePixels(obj, false, true);
            } else {
                obj.scaleY = (obj.scaleY || 1) * -1;
            }
        }
    },

    /** Flip image pixel data onto an offscreen canvas */
    _flipImagePixels(obj, horizontal, vertical) {
        const img = obj.image;
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;
        if (!w || !h) return;

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (horizontal) { ctx.translate(w, 0); ctx.scale(-1, 1); }
        if (vertical) { ctx.translate(0, h); ctx.scale(1, -1); }
        ctx.drawImage(img, 0, 0, w, h);

        // Use canvas as immediate render source (valid for drawImage)
        obj.image = canvas;

        // Replace with proper Image element async
        const dataUrl = canvas.toDataURL('image/png');
        const newImg = new Image();
        newImg.onload = () => {
            if (obj.image === canvas) {
                obj.image = newImg;
                obj.originalSrc = dataUrl;
                this.stage.requestRender();
            }
        };
        newImg.src = dataUrl;
    },

    /** Mirror Duplicate — duplicate selected objects and flip the copies */
    mirrorDuplicateH() {
        this._mirrorDuplicate(true, false);
    },

    mirrorDuplicateV() {
        this._mirrorDuplicate(false, true);
    },

    _mirrorDuplicate(horizontal, vertical) {
        const selected = this.getSelectedObjects();
        if (selected.length === 0) { Utils.showToast('No object selected', 'warning'); return; }

        // Compute selection bounding box
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        selected.forEach(o => {
            minX = Math.min(minX, o.x);
            minY = Math.min(minY, o.y);
            maxX = Math.max(maxX, o.x + o.width);
            maxY = Math.max(maxY, o.y + o.height);
        });

        const newIds = [];
        selected.forEach(obj => {
            const data = obj.toJSON();
            data.id = Utils.generateId('obj');
            data.name = obj.name + ' (mirror)';
            data.groupId = null;

            if (horizontal) {
                // Place mirror copy to the right of the original, with a gap
                const gap = 20;
                const mirrorAxisX = maxX + gap / 2;
                // Mirror x position: reflect obj center around mirrorAxisX, place to the right
                const objCx = obj.x + obj.width / 2;
                const distFromAxis = objCx - (minX + (maxX - minX) / 2);
                data.x = mirrorAxisX + gap / 2 + ((maxX - minX) / 2 - distFromAxis) - obj.width / 2;

                // Flip rotation
                data.rotation = -(data.rotation || 0);

                // Mirror pathPoints
                if (data.pathPoints && data.pathPoints.length > 0) {
                    const origCx = obj.x + obj.width / 2;
                    const newCx = data.x + obj.width / 2;
                    data.pathPoints = data.pathPoints.map(p => ({
                        ...p,
                        x: newCx + (origCx - p.x),
                        ...(p.cp1x !== undefined ? { cp1x: newCx + (origCx - p.cp1x) } : {}),
                        ...(p.cp2x !== undefined ? { cp2x: newCx + (origCx - p.cp2x) } : {})
                    }));
                } else if (data.type === 'image') {
                    // For images, toggle flipH
                    data.flipH = !data.flipH;
                } else {
                    // For shapes, negate scaleX
                    data.scaleX = (data.scaleX || 1) * -1;
                }
            }

            if (vertical) {
                const gap = 20;
                const mirrorAxisY = maxY + gap / 2;
                const objCy = obj.y + obj.height / 2;
                const distFromAxis = objCy - (minY + (maxY - minY) / 2);
                data.y = mirrorAxisY + gap / 2 + ((maxY - minY) / 2 - distFromAxis) - obj.height / 2;

                data.rotation = -(data.rotation || 0);

                if (data.pathPoints && data.pathPoints.length > 0) {
                    const origCy = obj.y + obj.height / 2;
                    const newCy = data.y + obj.height / 2;
                    data.pathPoints = data.pathPoints.map(p => ({
                        ...p,
                        y: newCy + (origCy - p.y),
                        ...(p.cp1y !== undefined ? { cp1y: newCy + (origCy - p.cp1y) } : {}),
                        ...(p.cp2y !== undefined ? { cp2y: newCy + (origCy - p.cp2y) } : {})
                    }));
                } else if (data.type === 'image') {
                    data.flipV = !data.flipV;
                } else {
                    data.scaleY = (data.scaleY || 1) * -1;
                }
            }

            const newObj = StageObject.fromJSON(data);
            this.objects.push(newObj);
            newIds.push(newObj.id);
        });

        this.select(newIds);
        this.updateObjectList();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Created ${newIds.length} mirror duplicate(s)`, 'success');
    },

    // === Swap Objects ===
    swapSelectedObjects() {
        const selected = this.getSelectedObjects();
        if (selected.length !== 2) {
            Utils.showToast('Select exactly 2 objects to swap positions', 'warning');
            return;
        }
        const [a, b] = selected;
        const ax = a.x, ay = a.y;
        const dxA = b.x - a.x, dyA = b.y - a.y;
        const dxB = ax - b.x, dyB = ay - b.y;
        if (a.pathPoints && a.pathPoints.length > 0) {
            a.pathPoints.forEach(p => { p.x += dxA; p.y += dyA; });
        }
        if (b.pathPoints && b.pathPoints.length > 0) {
            b.pathPoints.forEach(p => { p.x += dxB; p.y += dyB; });
        }
        a.x = b.x; a.y = b.y;
        b.x = ax; b.y = ay;
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast('Swapped positions', 'success');
    },

    // === Format Painter ===
    copyFormat() {
        const selected = this.getSelectedObjects();
        if (selected.length !== 1) {
            Utils.showToast('Select exactly 1 object to copy formatting from', 'warning');
            return;
        }
        const obj = selected[0];
        this._copiedFormat = {
            fill: obj.fill,
            fillType: obj.fillType,
            gradientStops: obj.gradientStops ? JSON.parse(JSON.stringify(obj.gradientStops)) : null,
            gradientAngle: obj.gradientAngle,
            patternType: obj.patternType,
            patternColor: obj.patternColor,
            patternScale: obj.patternScale,
            stroke: obj.stroke,
            strokeWidth: obj.strokeWidth,
            strokeDash: obj.strokeDash,
            strokeCap: obj.strokeCap,
            strokeJoin: obj.strokeJoin,
            opacity: obj.opacity,
            borderRadius: obj.borderRadius,
            shadow: obj.shadow,
            shadowColor: obj.shadowColor,
            shadowBlur: obj.shadowBlur,
            shadowOffsetX: obj.shadowOffsetX,
            shadowOffsetY: obj.shadowOffsetY,
            glow: obj.glow,
            glowColor: obj.glowColor,
            glowBlur: obj.glowBlur,
            reflection: obj.reflection,
            reflectionOpacity: obj.reflectionOpacity,
            reflectionGap: obj.reflectionGap,
            bevel: obj.bevel,
            bevelSize: obj.bevelSize,
            bevelHighlight: obj.bevelHighlight,
            bevelShadow: obj.bevelShadow
        };
        document.getElementById('btn-copy-format')?.classList.add('active');
        Utils.showToast('Format copied — select objects and click Paste Format', 'success');
    },

    pasteFormat() {
        if (!this._copiedFormat) {
            Utils.showToast('No format copied. Copy format from an object first.', 'warning');
            return;
        }
        const selected = this.getSelectedObjects();
        if (selected.length === 0) {
            Utils.showToast('Select objects to paste formatting to', 'warning');
            return;
        }
        const fmt = this._copiedFormat;
        selected.forEach(obj => {
            Object.keys(fmt).forEach(key => {
                if (fmt[key] !== null && fmt[key] !== undefined) {
                    if (typeof fmt[key] === 'object' && !Array.isArray(fmt[key])) {
                        obj[key] = JSON.parse(JSON.stringify(fmt[key]));
                    } else if (Array.isArray(fmt[key])) {
                        obj[key] = JSON.parse(JSON.stringify(fmt[key]));
                    } else {
                        obj[key] = fmt[key];
                    }
                }
            });
        });
        document.getElementById('btn-copy-format')?.classList.remove('active');
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Format applied to ${selected.length} object(s)`, 'success');
    },

    // === Select Similar Objects ===
    selectSimilarObjects(criteria) {
        const selected = this.getSelectedObjects();
        if (selected.length === 0) {
            Utils.showToast('Select an object first to find similar ones', 'warning');
            return;
        }
        const ref = selected[0];
        const TOLERANCE = 0.1;
        const sizeTolerance = 20;
        let matchIds = [];

        this.objects.forEach(obj => {
            if (!obj.visible) return;
            let match = false;
            switch (criteria) {
                case 'type':
                    match = obj.type === ref.type;
                    break;
                case 'fill':
                    match = obj.fill === ref.fill && obj.fillType === ref.fillType;
                    break;
                case 'size':
                    match = Math.abs(obj.width - ref.width) <= sizeTolerance &&
                            Math.abs(obj.height - ref.height) <= sizeTolerance;
                    break;
                case 'stroke':
                    match = obj.stroke === ref.stroke &&
                            Math.abs((obj.strokeWidth || 0) - (ref.strokeWidth || 0)) < 0.5;
                    break;
                case 'opacity':
                    match = Math.abs((obj.opacity ?? 1) - (ref.opacity ?? 1)) <= TOLERANCE;
                    break;
            }
            if (match) matchIds.push(obj.id);
        });

        if (matchIds.length === 0) {
            Utils.showToast('No similar objects found', 'info');
            return;
        }
        this.select(matchIds);
        Utils.showToast(`Selected ${matchIds.length} similar object(s) by ${criteria}`, 'success');
    },

    // === Stage Hide/Show Toggle ===
    toggleStageHideShowMode() {
        this._stageHideShowActive = !this._stageHideShowActive;
        const controls = document.getElementById('stage-hideshow-controls');
        const btn = document.getElementById('btn-activate-stage-hideshow');
        if (this._stageHideShowActive) {
            controls?.classList.remove('hidden');
            if (btn) { btn.querySelector('i').className = 'fas fa-toggle-on'; btn.classList.add('active'); }
            Utils.showToast('Hide/Show controls activated on stage toolbar', 'success');
        } else {
            controls?.classList.add('hidden');
            if (btn) { btn.querySelector('i').className = 'fas fa-toggle-off'; btn.classList.remove('active'); }
        }
    },

    // === Layer Add/Delete ===
    addNewLayer() {
        this._layerCounter++;
        const id = 'layer-' + this._layerCounter;
        this.layers.push({ id, name: 'Layer ' + this._layerCounter, visible: true, locked: false });
        this.activeLayerId = id;
        this.updateObjectList();
        this.stage.requestRender();
        Utils.showToast('Added Layer ' + this._layerCounter, 'success');
        eventBus.emit('history:push');
    },

    deleteSelectedLayer() {
        if (this.layers.length <= 1) {
            Utils.showToast('Cannot delete the only layer', 'warning');
            return;
        }
        const layerId = this.activeLayerId;
        const layer = this.layers.find(l => l.id === layerId);
        if (!layer) return;
        // Remove all objects in this layer
        const inLayer = this.objects.filter(o => o.layer === layerId);
        inLayer.forEach(o => {
            const idx = this.objects.indexOf(o);
            if (idx !== -1) this.objects.splice(idx, 1);
            this.selectedIds = this.selectedIds.filter(sid => sid !== o.id);
        });
        this.layers = this.layers.filter(l => l.id !== layerId);
        this.activeLayerId = this.layers[this.layers.length - 1].id;
        this.updateObjectList();
        this.updateProperties();
        this.stage.requestRender();
        Utils.showToast(`Deleted "${layer.name}" and its objects`, 'info');
        eventBus.emit('history:push');
    },

    getLayerForObject(obj) {
        return this.layers.find(l => l.id === obj.layer) || this.layers[0];
    },

    isObjectLayerVisible(obj) {
        const layer = this.getLayerForObject(obj);
        return layer ? layer.visible : true;
    },

    isObjectLayerLocked(obj) {
        const layer = this.getLayerForObject(obj);
        return layer ? layer.locked : false;
    },

    // === Copy Position / Copy Size ===
    startCopyMode(mode) {
        const selected = this.getSelectedObjects();
        if (selected.length !== 1) {
            Utils.showToast('Select one object to copy its ' + mode, 'warning');
            return;
        }
        const obj = selected[0];
        if (mode === 'position') {
            this._copyMode = 'position';
            this._copyData = { x: obj.x, y: obj.y };
        } else {
            this._copyMode = 'size';
            this._copyData = { width: obj.width, height: obj.height };
        }
        // Visual feedback
        this.stage.viewport.style.cursor = 'copy';
        document.getElementById('btn-copy-' + mode)?.classList.add('active-copy');
        this._showCursorTooltip(`Click target to paste ${mode}`);
        Utils.showToast(`${mode === 'position' ? 'Position' : 'Size'} copied — click target object`, 'info');
    },

    applyCopyMode(targetObj) {
        if (!this._copyMode || !this._copyData || !targetObj) return;
        if (this._copyMode === 'position') {
            if (targetObj.pathPoints && targetObj.pathPoints.length > 0) {
                const dx = this._copyData.x - targetObj.x;
                const dy = this._copyData.y - targetObj.y;
                if (dx !== 0 || dy !== 0) { targetObj.pathPoints.forEach(p => { p.x += dx; p.y += dy; }); }
            }
            targetObj.x = this._copyData.x;
            targetObj.y = this._copyData.y;
        } else {
            targetObj.width = this._copyData.width;
            targetObj.height = this._copyData.height;
        }
        this.updateProperties();
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Applied ${this._copyMode} to ${targetObj.name}`, 'success');
        // Don't exit copy mode — allow pasting on multiple targets
    },

    cancelCopyMode() {
        if (!this._copyMode) return;
        document.getElementById('btn-copy-position')?.classList.remove('active-copy');
        document.getElementById('btn-copy-size')?.classList.remove('active-copy');
        this._copyMode = null;
        this._copyData = null;
        this.stage.viewport.style.cursor = '';
        this._hideCursorTooltip();
    },

    // === Cursor Tooltip (floating guide near cursor) ===
    _showCursorTooltip(text) {
        if (!this._cursorTooltip) {
            this._cursorTooltip = document.createElement('div');
            this._cursorTooltip.className = 'cursor-tooltip';
            document.body.appendChild(this._cursorTooltip);
            this._cursorTooltipMove = (e) => {
                this._cursorTooltip.style.left = e.clientX + 'px';
                this._cursorTooltip.style.top = e.clientY + 'px';
            };
        }
        this._cursorTooltip.innerHTML = text;
        this._cursorTooltip.classList.add('visible');
        document.addEventListener('mousemove', this._cursorTooltipMove);
    },

    _hideCursorTooltip() {
        if (this._cursorTooltip) {
            this._cursorTooltip.classList.remove('visible');
            document.removeEventListener('mousemove', this._cursorTooltipMove);
        }
    },

    // === Idle Revert Timer (for pickers and edit points) ===
    _startIdleRevert(timeoutMs = 30000) {
        this._clearIdleRevert();
        this._idleRevertTimer = setTimeout(() => {
            if (this._eyedropperMode) {
                this.stopEyedropper();
                Utils.showToast('Color picker exited (idle)', 'info');
            }
            if (this._animPaintMode) {
                this.stopAnimationPaint();
                Utils.showToast('Animation paint exited (idle)', 'info');
            }
            if (this._pointEditMode) {
                this.exitPointEditMode();
                this.setTool('select');
                Utils.showToast('Edit points exited (idle)', 'info');
            }
        }, timeoutMs);
    },

    _clearIdleRevert() {
        if (this._idleRevertTimer) {
            clearTimeout(this._idleRevertTimer);
            this._idleRevertTimer = null;
        }
    },

    _resetIdleRevert() {
        if (this._eyedropperMode || this._animPaintMode || this._pointEditMode) {
            this._startIdleRevert();
        }
    },

    /**
     * Auto-revert cursor to 'select' tool after a delay.
     * Used after paste/paint operations so the user doesn't stay
     * in a special mode indefinitely.
     */
    _startAutoRevertToSelect(delayMs = 5000) {
        clearTimeout(this._autoRevertSelectTimer);
        this._autoRevertSelectTimer = setTimeout(() => {
            // Only revert if still in paint mode or no special mode is active
            if (this._animPaintMode) {
                this.stopAnimationPaint();
                Utils.showToast('Paint mode auto-exited — cursor set to Select', 'info');
            }
            this.setTool('select');
            this.stage.viewport.style.cursor = 'default';
        }, delayMs);
    },

    // === Animation Copy / Paint ===
    copyAnimations() {
        const selected = this.getSelectedObjects();
        if (selected.length !== 1) {
            Utils.showToast('Select exactly one object to copy animations from', 'warning');
            return;
        }
        const obj = selected[0];
        if (!obj.animations || obj.animations.length === 0) {
            Utils.showToast('Selected object has no animations to copy', 'warning');
            return;
        }
        this._copiedAnimations = JSON.parse(JSON.stringify(obj.animations));
        Utils.showToast(`Copied ${obj.animations.length} animation(s) — select target(s) and Paste Animations`, 'success');
    },

    pasteAnimations() {
        if (!this._copiedAnimations || this._copiedAnimations.length === 0) {
            Utils.showToast('No animations copied. Select a source object and use Copy Animations first.', 'warning');
            return;
        }
        const targets = this.getSelectedObjects();
        if (targets.length === 0) {
            Utils.showToast('Select target object(s) to paste animations onto', 'warning');
            return;
        }
        let count = 0;
        targets.forEach(obj => {
            const cloned = JSON.parse(JSON.stringify(this._copiedAnimations));
            obj.animations = obj.animations.concat(cloned);
            count++;
        });
        Utils.showToast(`Pasted animations onto ${count} object(s)`, 'success');
        eventBus.emit('timeline:update');
        eventBus.emit('history:push');
        // Auto-revert to select cursor after 5 seconds
        this._startAutoRevertToSelect(5000);
    },

    startAnimationPaint() {
        if (!this._copiedAnimations || this._copiedAnimations.length === 0) {
            Utils.showToast('Copy animations from a source object first (right-click → Copy Animations)', 'warning');
            return;
        }
        this._animPaintMode = true;
        this._animPaintStep = 'paste'; // already have copied animations
        this.stage.viewport.style.cursor = 'copy';
        this._showCursorTooltip('Click object to paste animation');
        this._startIdleRevert();
    },

    stopAnimationPaint() {
        this._animPaintMode = false;
        this._animPaintStep = null;
        this.stage.viewport.style.cursor = 'default';
        this._hideCursorTooltip();
        this._clearIdleRevert();
        clearTimeout(this._autoRevertSelectTimer);
    },

    _handleAnimPaintClick(pos) {
        this._resetIdleRevert();
        const hit = this.hitTest(pos.x, pos.y);
        if (hit && this._copiedAnimations) {
            const cloned = JSON.parse(JSON.stringify(this._copiedAnimations));
            hit.animations = hit.animations.concat(cloned);
            Utils.showToast(`Painted animations onto "${hit.name}"`, 'success');
            this._showCursorTooltip('Click another object — auto-exit in 5s');
            eventBus.emit('timeline:update');
            eventBus.emit('history:push');
            // Auto-revert to select cursor after 5 seconds of inactivity
            this._startAutoRevertToSelect(5000);
        }
    },

    // ============ COLOR PICKER (EYEDROPPER) ============

    startEyedropper() {
        this._eyedropperMode = true;
        this._eyedropperStep = 'pick'; // step 1: pick a color
        this._pickedColor = null;
        this.stage.viewport.style.cursor = 'crosshair';
        this._showCursorTooltip('<i class="fas fa-eye-dropper" style="margin-right:4px"></i> Pick a color');
        this._startIdleRevert();
    },

    stopEyedropper() {
        this._eyedropperMode = false;
        this._eyedropperStep = null;
        this._pickedColor = null;
        this.stage.viewport.style.cursor = 'default';
        this._hideCursorTooltip();
        this._clearIdleRevert();
    },

    _handleEyedropperClick(pos) {
        this._resetIdleRevert();

        if (this._eyedropperStep === 'pick') {
            // Step 1: Pick the color from the canvas
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = this.stage.width;
            tempCanvas.height = this.stage.height;
            const tctx = tempCanvas.getContext('2d', { willReadFrequently: true });
            tctx.fillStyle = this.stage.bgColor || '#1e1e2e';
            tctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
            this.objects.forEach(o => o.render(tctx));
            const pixel = tctx.getImageData(Math.round(pos.x), Math.round(pos.y), 1, 1).data;
            const hex = '#' + [pixel[0], pixel[1], pixel[2]].map(v => v.toString(16).padStart(2, '0')).join('');
            this._pickedColor = hex;
            this._eyedropperStep = 'paste';
            this.stage.viewport.style.cursor = 'copy';
            this._showCursorTooltip(`<span class="color-swatch" style="background:${hex}"></span> Click object to apply ${hex}`);
            navigator.clipboard?.writeText(hex);
            Utils.showToast(`Picked ${hex} — now click an object to apply`, 'success');
        } else if (this._eyedropperStep === 'paste') {
            // Step 2: Apply the picked color to clicked object
            const hit = this.hitTest(pos.x, pos.y);
            if (hit) {
                hit.fill = this._pickedColor;
                document.getElementById('prop-fill').value = this._pickedColor;
                this.stage.requestRender();
                eventBus.emit('object:updated', hit);
                Utils.showToast(`Applied ${this._pickedColor} to "${hit.name}"`, 'success');
                // Stay in paste mode so user can apply to more objects
                this._showCursorTooltip(`<span class="color-swatch" style="background:${this._pickedColor}"></span> Click another object or Esc to exit`);
            } else {
                // Clicked empty area — re-pick
                this._eyedropperStep = 'pick';
                this.stage.viewport.style.cursor = 'crosshair';
                this._showCursorTooltip('<i class="fas fa-eye-dropper" style="margin-right:4px"></i> Pick a color');
                Utils.showToast('Click on an object or area to pick its color', 'info');
            }
        }
    },

    // ============ POINT EDITING MODE ============

    togglePointEditMode() {
        if (this._pointEditMode) {
            this.exitPointEditMode();
        } else {
            this.enterPointEditMode();
        }
    },

    enterPointEditMode() {
        const selected = this.getSelectedObjects();
        if (selected.length !== 1) { Utils.showToast('Select a single object to edit points', 'warning'); return; }
        const obj = selected[0];
        // Auto-generate editable points for shapes that don't have pathPoints yet
        const pointEditableTypes = ['polygon','star','rectangle','circle','triangle','line','diamond','heart','arrow','doubleArrow','curvedArrow', ...StageObject.getCustomShapeTypes()];
        if (pointEditableTypes.includes(obj.type) && (!obj.pathPoints || obj.pathPoints.length === 0)) {
            this._generatePointsForShape(obj);
        }
        if (!obj.pathPoints || obj.pathPoints.length === 0) {
            Utils.showToast('This object has no editable points', 'warning');
            return;
        }
        this._pointEditMode = true;
        this._pointEditObj = obj;
        this._selectedPointIdx = -1;
        document.getElementById('point-info')?.classList.remove('hidden');
        document.getElementById('btn-edit-points-done')?.classList.remove('hidden');
        const btnEP = document.getElementById('btn-edit-points');
        if (btnEP) btnEP.classList.add('active');
        this.stage.requestRender();
        Utils.showToast('Point edit mode — click points to select, drag to move', 'info');
        this._startIdleRevert();
    },

    exitPointEditMode() {
        this._pointEditMode = false;
        this._pointEditObj = null;
        this._selectedPointIdx = -1;
        this._draggingPoint = false;
        this._pointHoverState = null;
        this._hideCursorTooltip();
        document.getElementById('point-info')?.classList.add('hidden');
        document.getElementById('btn-edit-points-done')?.classList.add('hidden');
        const btnEP = document.getElementById('btn-edit-points');
        if (btnEP) btnEP.classList.remove('active');
        this.stage.requestRender();
        this._clearIdleRevert();
        // Always switch back to select tool so objects remain clickable
        if (this.currentTool === 'editPoints') {
            this.currentTool = 'select';
            this.updateToolUI();
        }
    },

    _generatePointsForShape(obj) {
        if (StageObject.isCustomShapeType(obj.type)) {
            obj.pathPoints = StageObject.getCustomShapePoints(obj, false).map(point => ({ x: point.x, y: point.y }));
            obj._originalType = obj.type;
            return;
        }

        const cx = obj.x + obj.width / 2, cy = obj.y + obj.height / 2;
        const x = obj.x, y = obj.y, w = obj.width, h = obj.height;
        const r = Math.min(w, h) / 2;
        obj.pathPoints = [];

        switch (obj.type) {
            case 'polygon': {
                const sides = obj.sides || 6;
                for (let i = 0; i < sides; i++) {
                    const a = (i * 2 * Math.PI / sides) - Math.PI / 2;
                    obj.pathPoints.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
                }
                break;
            }
            case 'star': {
                const inner = r * (obj.innerRadius || 0.4);
                const pts = (obj.sides || 5) * 2;
                for (let i = 0; i < pts; i++) {
                    const cr = i % 2 === 0 ? r : inner;
                    const a = (i * Math.PI / (obj.sides || 5)) - Math.PI / 2;
                    obj.pathPoints.push({ x: cx + cr * Math.cos(a), y: cy + cr * Math.sin(a) });
                }
                break;
            }
            case 'rectangle': {
                obj.pathPoints.push(
                    { x: x, y: y },
                    { x: x + w, y: y },
                    { x: x + w, y: y + h },
                    { x: x, y: y + h }
                );
                break;
            }
            case 'circle': {
                // Approximate ellipse with 16 points
                const segments = 16;
                const rx = w / 2, ry = h / 2;
                for (let i = 0; i < segments; i++) {
                    const a = (i * 2 * Math.PI / segments);
                    obj.pathPoints.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
                }
                break;
            }
            case 'triangle': {
                obj.pathPoints.push(
                    { x: x + w / 2, y: y },
                    { x: x + w, y: y + h },
                    { x: x, y: y + h }
                );
                break;
            }
            case 'line': {
                obj.pathPoints.push(
                    { x: x, y: y },
                    { x: x + w, y: y + h }
                );
                break;
            }
            case 'diamond': {
                obj.pathPoints.push(
                    { x: x + w / 2, y: y },
                    { x: x + w, y: y + h / 2 },
                    { x: x + w / 2, y: y + h },
                    { x: x, y: y + h / 2 }
                );
                break;
            }
            case 'heart': {
                // Approximate heart with key anchor points along the bezier curves
                const topY = h * 0.3;
                const steps = 20;
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    let px, py;
                    if (t <= 0.25) {
                        // Left bump: bezier from center-top to left-top to left-mid
                        const s = t / 0.25;
                        const p0 = { x: x + w / 2, y: y + topY };
                        const p1 = { x: x + w / 2, y: y };
                        const p2 = { x: x, y: y };
                        const p3 = { x: x, y: y + topY };
                        px = Math.pow(1-s,3)*p0.x + 3*Math.pow(1-s,2)*s*p1.x + 3*(1-s)*s*s*p2.x + s*s*s*p3.x;
                        py = Math.pow(1-s,3)*p0.y + 3*Math.pow(1-s,2)*s*p1.y + 3*(1-s)*s*s*p2.y + s*s*s*p3.y;
                    } else if (t <= 0.5) {
                        // Left bottom: bezier from left-mid to bottom
                        const s = (t - 0.25) / 0.25;
                        const p0 = { x: x, y: y + topY };
                        const p1 = { x: x, y: y + (h + topY) / 2 };
                        const p2 = { x: x + w / 2, y: y + h * 0.8 };
                        const p3 = { x: x + w / 2, y: y + h };
                        px = Math.pow(1-s,3)*p0.x + 3*Math.pow(1-s,2)*s*p1.x + 3*(1-s)*s*s*p2.x + s*s*s*p3.x;
                        py = Math.pow(1-s,3)*p0.y + 3*Math.pow(1-s,2)*s*p1.y + 3*(1-s)*s*s*p2.y + s*s*s*p3.y;
                    } else if (t <= 0.75) {
                        // Right bottom: bezier from bottom to right-mid
                        const s = (t - 0.5) / 0.25;
                        const p0 = { x: x + w / 2, y: y + h };
                        const p1 = { x: x + w / 2, y: y + h * 0.8 };
                        const p2 = { x: x + w, y: y + (h + topY) / 2 };
                        const p3 = { x: x + w, y: y + topY };
                        px = Math.pow(1-s,3)*p0.x + 3*Math.pow(1-s,2)*s*p1.x + 3*(1-s)*s*s*p2.x + s*s*s*p3.x;
                        py = Math.pow(1-s,3)*p0.y + 3*Math.pow(1-s,2)*s*p1.y + 3*(1-s)*s*s*p2.y + s*s*s*p3.y;
                    } else {
                        // Right bump: bezier from right-mid to center-top
                        const s = (t - 0.75) / 0.25;
                        const p0 = { x: x + w, y: y + topY };
                        const p1 = { x: x + w, y: y };
                        const p2 = { x: x + w / 2, y: y };
                        const p3 = { x: x + w / 2, y: y + topY };
                        px = Math.pow(1-s,3)*p0.x + 3*Math.pow(1-s,2)*s*p1.x + 3*(1-s)*s*s*p2.x + s*s*s*p3.x;
                        py = Math.pow(1-s,3)*p0.y + 3*Math.pow(1-s,2)*s*p1.y + 3*(1-s)*s*s*p2.y + s*s*s*p3.y;
                    }
                    obj.pathPoints.push({ x: px, y: py });
                }
                break;
            }
            case 'arrow': {
                // Shaft start, shaft end, arrowhead tip + two wing points
                const x1 = x, y1 = y, x2 = x + w, y2 = y + h;
                const len = Math.sqrt(w * w + h * h);
                const headLen = Math.max(10, Math.min(24, len * 0.2));
                const angle = Math.atan2(y2 - y1, x2 - x1);
                obj.pathPoints.push(
                    { x: x1, y: y1 },
                    { x: x2, y: y2 },
                    { x: x2 - headLen * Math.cos(angle - Math.PI / 6), y: y2 - headLen * Math.sin(angle - Math.PI / 6) },
                    { x: x2 - headLen * Math.cos(angle + Math.PI / 6), y: y2 - headLen * Math.sin(angle + Math.PI / 6) }
                );
                break;
            }
            case 'doubleArrow': {
                const x1 = x, y1 = y, x2 = x + w, y2 = y + h;
                const len = Math.sqrt(w * w + h * h);
                const headLen = Math.max(10, Math.min(24, len * 0.2));
                const angle = Math.atan2(y2 - y1, x2 - x1);
                const rev = angle + Math.PI;
                obj.pathPoints.push(
                    { x: x1, y: y1 },
                    { x: x2, y: y2 },
                    // End arrowhead
                    { x: x2 - headLen * Math.cos(angle - Math.PI / 6), y: y2 - headLen * Math.sin(angle - Math.PI / 6) },
                    { x: x2 - headLen * Math.cos(angle + Math.PI / 6), y: y2 - headLen * Math.sin(angle + Math.PI / 6) },
                    // Start arrowhead
                    { x: x1 - headLen * Math.cos(rev - Math.PI / 6), y: y1 - headLen * Math.sin(rev - Math.PI / 6) },
                    { x: x1 - headLen * Math.cos(rev + Math.PI / 6), y: y1 - headLen * Math.sin(rev + Math.PI / 6) }
                );
                break;
            }
            case 'curvedArrow': {
                // Sample points along the quadratic curve
                const x1 = x, y1 = y + h;
                const x2 = x + w, y2 = y;
                const cpx = x + w / 2, cpy = y - h * 0.3;
                const segments = 12;
                for (let i = 0; i <= segments; i++) {
                    const t = i / segments;
                    const mt = 1 - t;
                    const px = mt * mt * x1 + 2 * mt * t * cpx + t * t * x2;
                    const py = mt * mt * y1 + 2 * mt * t * cpy + t * t * y2;
                    obj.pathPoints.push({ x: px, y: py });
                }
                // Add arrowhead points
                const tg = 0.95, mtg = 1 - tg;
                const tx = 2 * mtg * (cpx - x1) + 2 * tg * (x2 - cpx);
                const ty = 2 * mtg * (cpy - y1) + 2 * tg * (y2 - cpy);
                const angle = Math.atan2(ty, tx);
                const headLen = Math.max(8, Math.min(18, Math.sqrt(w * w + h * h) * 0.15));
                obj.pathPoints.push(
                    { x: x2 - headLen * Math.cos(angle - Math.PI / 6), y: y2 - headLen * Math.sin(angle - Math.PI / 6) },
                    { x: x2 - headLen * Math.cos(angle + Math.PI / 6), y: y2 - headLen * Math.sin(angle + Math.PI / 6) }
                );
                break;
            }
            default:
                return; // Unknown type — don't convert
        }

        // Switch type to freeform to render from points
        // DON'T convert immediately — store original type so shape renders normally
        // Conversion to freeform happens only when user modifies a point
        obj._originalType = obj.type;
    },

    // === Point Edit Mode: Right-click actions ===
    _handlePointEditRightClick(pos, e) {
        this._resetIdleRevert();
        // Remove any existing point context menu
        document.querySelectorAll('.point-context-menu').forEach(m => m.remove());

        const ptIdx = this.hitTestPoint(pos.x, pos.y);
        const edgeIdx = this.hitTestEdge(pos.x, pos.y);
        const obj = this._pointEditObj;
        const pts = obj.pathPoints;

        // Build context menu items
        const items = [];
        if (ptIdx >= 0) {
            items.push({ label: '<i class="fas fa-trash"></i> Delete Point', action: 'delete-point', idx: ptIdx });
        }
        if (edgeIdx >= 0) {
            items.push({ label: '<i class="fas fa-plus-circle"></i> Add Point on Segment', action: 'add-point', idx: edgeIdx });
            const destPt = pts[(edgeIdx + 1) % pts.length];
            const isStraight = destPt?.segmentType === 'straight';
            items.push({
                label: isStraight
                    ? '<i class="fas fa-bezier-curve"></i> Make Segment Curved'
                    : '<i class="fas fa-minus"></i> Make Segment Straight',
                action: 'toggle-segment',
                idx: edgeIdx
            });
            items.push({ label: '<i class="fas fa-cut"></i> Delete Segment (Rejoin)', action: 'delete-segment', idx: edgeIdx });
        }
        // Always show open/closed toggle
        const isClosed = obj.closedPath !== false;
        items.push({
            label: isClosed
                ? '<i class="fas fa-unlock"></i> Open Path'
                : '<i class="fas fa-lock"></i> Close Path',
            action: 'toggle-closed'
        });

        if (items.length === 0) return;

        // Create and show context menu
        const menu = document.createElement('div');
        menu.className = 'context-menu point-context-menu';
        menu.innerHTML = items.map(item =>
            `<div class="context-menu-item" data-action="${item.action}" data-idx="${item.idx ?? ''}">${item.label}</div>`
        ).join('');
        menu.style.left = (e.clientX) + 'px';
        menu.style.top = (e.clientY) + 'px';
        document.body.appendChild(menu);

        const handleClick = (ev) => {
            const el = ev.target.closest('.context-menu-item');
            if (!el) return;
            const action = el.dataset.action;
            const idx = parseInt(el.dataset.idx);
            this._convertToFreeformIfNeeded(obj);
            switch (action) {
                case 'delete-point':
                    pts.splice(idx, 1);
                    if (this._selectedPointIdx === idx) this._selectedPointIdx = -1;
                    else if (this._selectedPointIdx > idx) this._selectedPointIdx--;
                    document.getElementById('point-info')?.classList.add('hidden');
                    Utils.showToast('Point deleted', 'info');
                    break;
                case 'add-point':
                    this.insertPointOnEdge(pos.x, pos.y, idx);
                    Utils.showToast('Point added on segment', 'info');
                    break;
                case 'toggle-segment': {
                    const destIdx = (idx + 1) % pts.length;
                    const pt = pts[destIdx];
                    pt.segmentType = pt.segmentType === 'straight' ? undefined : 'straight';
                    const label = pt.segmentType === 'straight' ? 'Straight' : 'Curved';
                    Utils.showToast(`Segment → ${label}`, 'info');
                    break;
                }
                case 'delete-segment': {
                    // Delete the segment between idx and idx+1 by removing the destination point
                    // This effectively rejoins the path around the gap
                    const destIdx = (idx + 1) % pts.length;
                    pts.splice(destIdx, 1);
                    if (this._selectedPointIdx === destIdx) this._selectedPointIdx = -1;
                    else if (this._selectedPointIdx > destIdx) this._selectedPointIdx--;
                    // If removing caused only 1 point, clean up
                    if (pts.length < 2) {
                        Utils.showToast('Path has too few points', 'warning');
                    } else {
                        Utils.showToast('Segment deleted (path rejoined)', 'info');
                    }
                    break;
                }
                case 'toggle-closed':
                    obj.closedPath = !isClosed;
                    Utils.showToast(obj.closedPath ? 'Path closed' : 'Path opened', 'info');
                    break;
            }
            this._recalcBoundsFromPoints(obj);
            this.stage.requestRender();
            eventBus.emit('history:push');
            menu.remove();
        };
        menu.addEventListener('click', handleClick);

        // Close menu on outside click
        const closeMenu = (ev) => {
            if (!menu.contains(ev.target)) {
                menu.remove();
                document.removeEventListener('mousedown', closeMenu);
            }
        };
        setTimeout(() => document.addEventListener('mousedown', closeMenu), 0);
    },

    // === Point Edit Mode: Hover tooltips ===
    _handlePointEditHover(pos) {
        const ptIdx = this.hitTestPoint(pos.x, pos.y);
        if (ptIdx >= 0) {
            this.stage.viewport.style.cursor = 'pointer';
            this._showCursorTooltip('<i class="fas fa-arrows-alt" style="margin-right:4px"></i> Drag to move · Right-click for options');
            this._pointHoverState = 'point';
            return;
        }
        const edge = this.hitTestEdge(pos.x, pos.y);
        if (edge >= 0) {
            this.stage.viewport.style.cursor = 'crosshair';
            this._showCursorTooltip('<i class="fas fa-edit" style="margin-right:4px"></i> Right-click for segment options');
            this._pointHoverState = 'edge';
            return;
        }
        // Not hovering over point or edge — clear tooltip
        if (this._pointHoverState) {
            this.stage.viewport.style.cursor = 'default';
            this._hideCursorTooltip();
            this._pointHoverState = null;
        }
    },

    // Convert a shape to freeform when user modifies its points
    _convertToFreeformIfNeeded(obj) {
        if (obj._originalType && obj.type !== 'freeform') {
            obj.type = 'freeform';
        }
    },

    drawPointHandles(ctx) {
        if (!this._pointEditMode || !this._pointEditObj) return;
        const obj = this._pointEditObj;
        if (!obj.pathPoints || obj.pathPoints.length === 0) return;
        const pts = obj.pathPoints;
        const isClosed = obj.closedPath !== false;
        ctx.save();

        // Draw edge segments with type indicators
        if (pts.length >= 2) {
            const segCount = isClosed ? pts.length : pts.length - 1;
            for (let i = 0; i < segCount; i++) {
                const a = pts[i];
                const b = pts[(i + 1) % pts.length];
                const isStraight = b.segmentType === 'straight' || a.segmentType === 'straight';
                ctx.beginPath();
                ctx.moveTo(a.x, a.y);
                ctx.lineTo(b.x, b.y);
                ctx.setLineDash(isStraight ? [] : [4, 4]);
                ctx.strokeStyle = isStraight ? 'rgba(245, 158, 11, 0.6)' : 'rgba(74, 144, 217, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
            ctx.setLineDash([]);
        }

        // Draw point handles
        pts.forEach((pt, i) => {
            ctx.beginPath();
            if (pt.segmentType === 'straight') {
                // Square handle for straight-segment points
                ctx.rect(pt.x - 5, pt.y - 5, 10, 10);
            } else {
                ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
            }
            if (i === this._selectedPointIdx) {
                ctx.fillStyle = '#f59e0b';
                ctx.strokeStyle = '#fff';
            } else {
                ctx.fillStyle = '#4a90d9';
                ctx.strokeStyle = '#fff';
            }
            ctx.lineWidth = 2;
            ctx.fill();
            ctx.stroke();
        });

        // If open path, mark start and end
        if (!isClosed && pts.length >= 2) {
            // Green circle around first point
            ctx.beginPath();
            ctx.arc(pts[0].x, pts[0].y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#22c55e';
            ctx.lineWidth = 2;
            ctx.stroke();
            // Red circle around last point
            ctx.beginPath();
            ctx.arc(pts[pts.length - 1].x, pts[pts.length - 1].y, 8, 0, Math.PI * 2);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
        }
        ctx.restore();
    },

    hitTestPoint(stageX, stageY) {
        if (!this._pointEditObj || !this._pointEditObj.pathPoints) return -1;
        const threshold = 8;
        for (let i = 0; i < this._pointEditObj.pathPoints.length; i++) {
            const pt = this._pointEditObj.pathPoints[i];
            if (Math.abs(pt.x - stageX) < threshold && Math.abs(pt.y - stageY) < threshold) return i;
        }
        return -1;
    },

    // Return the index of the segment (edge between point i and i+1) closest to (stageX, stageY)
    hitTestEdge(stageX, stageY) {
        if (!this._pointEditObj || !this._pointEditObj.pathPoints) return -1;
        const pts = this._pointEditObj.pathPoints;
        if (pts.length < 2) return -1;
        const threshold = 10;
        let bestDist = Infinity, bestIdx = -1;
        const isClosed = this._pointEditObj.closedPath !== false;
        const segCount = isClosed ? pts.length : pts.length - 1;
        for (let i = 0; i < segCount; i++) {
            const a = pts[i];
            const b = pts[(i + 1) % pts.length];
            const dist = this._distToSegment(stageX, stageY, a.x, a.y, b.x, b.y);
            if (dist < threshold && dist < bestDist) {
                bestDist = dist;
                bestIdx = i;
            }
        }
        return bestIdx;
    },

    // Perpendicular distance from point (px,py) to line segment (ax,ay)-(bx,by)
    _distToSegment(px, py, ax, ay, bx, by) {
        const dx = bx - ax, dy = by - ay;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(px - ax, py - ay);
        let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
    },

    // Insert a new point on the edge at segment index, at the position closest to (stageX, stageY)
    insertPointOnEdge(stageX, stageY, segIdx) {
        const pts = this._pointEditObj.pathPoints;
        this._convertToFreeformIfNeeded(this._pointEditObj);
        const a = pts[segIdx];
        const b = pts[(segIdx + 1) % pts.length];
        // Project click onto the segment to get exact insertion position
        const dx = b.x - a.x, dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        let t = 0.5;
        if (lenSq > 0) {
            t = ((stageX - a.x) * dx + (stageY - a.y) * dy) / lenSq;
            t = Math.max(0.05, Math.min(0.95, t));
        }
        const newPt = { x: a.x + t * dx, y: a.y + t * dy };
        // Insert after segIdx
        pts.splice(segIdx + 1, 0, newPt);
        this._selectedPointIdx = segIdx + 1;
        // Update point info panel
        document.getElementById('point-info')?.classList.remove('hidden');
        const pxEl = document.getElementById('point-x');
        const pyEl = document.getElementById('point-y');
        if (pxEl) pxEl.value = Math.round(newPt.x);
        if (pyEl) pyEl.value = Math.round(newPt.y);
        this._recalcBoundsFromPoints(this._pointEditObj);
        this.stage.requestRender();
        Utils.showToast('Point inserted — drag to adjust', 'info');
    },

    addPointToSelected() {
        if (!this._pointEditObj || !this._pointEditObj.pathPoints) return;
        this._convertToFreeformIfNeeded(this._pointEditObj);
        const pts = this._pointEditObj.pathPoints;
        if (pts.length >= 2) {
            const last = pts[pts.length - 1];
            const prev = pts[pts.length - 2];
            // Add a new point midway beyond last
            pts.push({x: last.x + (last.x - prev.x) * 0.5, y: last.y + (last.y - prev.y) * 0.5});
        } else {
            pts.push({x: (this._pointEditObj.x || 0) + 50, y: (this._pointEditObj.y || 0) + 50});
        }
        this._recalcBoundsFromPoints(this._pointEditObj);
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    deleteSelectedPoint() {
        if (!this._pointEditObj || this._selectedPointIdx < 0) return;
        this._convertToFreeformIfNeeded(this._pointEditObj);
        this._pointEditObj.pathPoints.splice(this._selectedPointIdx, 1);
        this._selectedPointIdx = -1;
        document.getElementById('point-info')?.classList.add('hidden');
        this._recalcBoundsFromPoints(this._pointEditObj);
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    simplifySelectedPath() {
        if (!this._pointEditObj || !this._pointEditObj.pathPoints) return;
        const pts = this._pointEditObj.pathPoints;
        if (pts.length <= 4) return;
        this._convertToFreeformIfNeeded(this._pointEditObj);
        // Keep every other point (simple decimation)
        const newPts = pts.filter((_, i) => i === 0 || i === pts.length - 1 || i % 2 === 0);
        this._pointEditObj.pathPoints = newPts;
        this._selectedPointIdx = -1;
        this._recalcBoundsFromPoints(this._pointEditObj);
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(`Simplified: ${pts.length} → ${newPts.length} points`, 'info');
    },

    toggleClosedPath() {
        const obj = this._pointEditObj || (this.selectedIds.length === 1 ? this.getObjectById(this.selectedIds[0]) : null);
        if (!obj || !obj.pathPoints || obj.pathPoints.length < 2) return;
        this._convertToFreeformIfNeeded(obj);
        obj.closedPath = obj.closedPath === false ? true : false;
        if (!obj.closedPath && obj.fill !== 'transparent') {
            // Open paths look better as stroked, keep fill for user to decide
        }
        this.stage.requestRender();
        eventBus.emit('history:push');
        Utils.showToast(obj.closedPath ? 'Path closed' : 'Path opened', 'info');
    },

    updateSelectedPointCoord(axis, value) {
        if (!this._pointEditObj || this._selectedPointIdx < 0) return;
        this._pointEditObj.pathPoints[this._selectedPointIdx][axis] = value;
        this._recalcBoundsFromPoints(this._pointEditObj);
        this.stage.requestRender();
        eventBus.emit('history:push');
    },

    _recalcBoundsFromPoints(obj) {
        if (!obj.pathPoints || obj.pathPoints.length === 0) return;
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        obj.pathPoints.forEach(p => {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        });
        obj.x = minX;
        obj.y = minY;
        obj.width = maxX - minX || 1;
        obj.height = maxY - minY || 1;
    },

    /**
     * Smooth a raw traced path into a clean vector shape.
     * Uses Ramer-Douglas-Peucker simplification then Chaikin subdivision smoothing.
     */
    _smoothTracePath(rawPoints) {
        if (rawPoints.length < 4) return rawPoints;

        // 1. Ramer-Douglas-Peucker simplification
        const tolerance = Math.max(2, Math.hypot(
            rawPoints[0].x - rawPoints[rawPoints.length - 1].x,
            rawPoints[0].y - rawPoints[rawPoints.length - 1].y
        ) * 0.015);
        const simplified = this._rdpSimplify(rawPoints, tolerance);

        // 2. Chaikin corner-cutting subdivision for smooth curves (2 passes)
        let smooth = simplified.length > 2 ? this._chaikinSmooth(simplified, 2) : simplified;

        // 3. Ensure the shape stays closed — snap last point to first
        if (smooth.length > 2) {
            const first = smooth[0];
            const last = smooth[smooth.length - 1];
            const closeDist = Math.hypot(first.x - last.x, first.y - last.y);
            const pathLen = this._pathLength(rawPoints);
            if (closeDist < pathLen * 0.15) {
                // User drew roughly back to start — close the shape
                smooth[smooth.length - 1] = { x: first.x, y: first.y };
            }
        }

        return smooth;
    },

    /** Ramer-Douglas-Peucker polyline simplification. */
    _rdpSimplify(points, epsilon) {
        if (points.length <= 2) return points.slice();
        // Find furthest point from line between first and last
        let maxDist = 0, maxIdx = 0;
        const first = points[0], last = points[points.length - 1];
        for (let i = 1; i < points.length - 1; i++) {
            const d = this._pointToLineDist(points[i], first, last);
            if (d > maxDist) { maxDist = d; maxIdx = i; }
        }
        if (maxDist > epsilon) {
            const left = this._rdpSimplify(points.slice(0, maxIdx + 1), epsilon);
            const right = this._rdpSimplify(points.slice(maxIdx), epsilon);
            return left.slice(0, -1).concat(right);
        }
        return [first, last];
    },

    /** Perpendicular distance from point p to line defined by a→b. */
    _pointToLineDist(p, a, b) {
        const dx = b.x - a.x, dy = b.y - a.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
        const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq));
        return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
    },

    /** Chaikin corner-cutting subdivision (produces smooth curves). */
    _chaikinSmooth(points, iterations) {
        let pts = points;
        for (let iter = 0; iter < iterations; iter++) {
            const next = [];
            next.push(pts[0]); // keep first point
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[i], p1 = pts[i + 1];
                next.push({
                    x: p0.x * 0.75 + p1.x * 0.25,
                    y: p0.y * 0.75 + p1.y * 0.25
                });
                next.push({
                    x: p0.x * 0.25 + p1.x * 0.75,
                    y: p0.y * 0.25 + p1.y * 0.75
                });
            }
            next.push(pts[pts.length - 1]); // keep last point
            pts = next;
        }
        return pts;
    },

    /** Total polyline length. */
    _pathLength(pts) {
        let len = 0;
        for (let i = 1; i < pts.length; i++) {
            len += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
        }
        return len;
    },

    // ============ BOOLEAN SHAPE OPERATIONS ============

    /**
     * Get polygon points for a shape, generating them if needed.
     * Returns an array of {x, y} points representing the closed polygon.
     */
    _getShapePolygon(obj) {
        // If already has pathPoints, use them
        if (obj.pathPoints && obj.pathPoints.length >= 3) {
            return obj.pathPoints.map(p => ({x: p.x, y: p.y}));
        }
        // Generate points based on shape type
        const cx = obj.x + obj.width / 2, cy = obj.y + obj.height / 2;
        const x = obj.x, y = obj.y, w = obj.width, h = obj.height;
        switch (obj.type) {
            case 'rectangle':
                return [{x, y}, {x: x + w, y}, {x: x + w, y: y + h}, {x, y: y + h}];
            case 'circle': {
                const pts = [];
                const segments = 64;
                for (let i = 0; i < segments; i++) {
                    const a = (i / segments) * Math.PI * 2;
                    pts.push({x: cx + (w / 2) * Math.cos(a), y: cy + (h / 2) * Math.sin(a)});
                }
                return pts;
            }
            case 'triangle':
                return [{x: cx, y}, {x: x + w, y: y + h}, {x, y: y + h}];
            case 'diamond':
                return [{x: cx, y}, {x: x + w, y: cy}, {x: cx, y: y + h}, {x, y: cy}];
            case 'star': {
                const pts = [];
                const spikes = obj.sides || 5;
                const outerR = Math.min(w, h) / 2;
                const innerR = outerR * (obj.innerRadius || 0.4);
                for (let i = 0; i < spikes * 2; i++) {
                    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
                    const r = i % 2 === 0 ? outerR : innerR;
                    pts.push({x: cx + r * Math.cos(a), y: cy + r * Math.sin(a)});
                }
                return pts;
            }
            case 'polygon': {
                const pts = [];
                const sides = obj.sides || 6;
                const r = Math.min(w, h) / 2;
                for (let i = 0; i < sides; i++) {
                    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
                    pts.push({x: cx + r * Math.cos(a), y: cy + r * Math.sin(a)});
                }
                return pts;
            }
            case 'heart': {
                const pts = [];
                const segments = 64;
                for (let i = 0; i < segments; i++) {
                    const t = (i / segments) * Math.PI * 2;
                    const hx = 16 * Math.pow(Math.sin(t), 3);
                    const hy = -(13 * Math.cos(t) - 5 * Math.cos(2*t) - 2 * Math.cos(3*t) - Math.cos(4*t));
                    pts.push({x: cx + hx * (w / 36), y: cy + hy * (h / 36)});
                }
                return pts;
            }
            default:
                if (StageObject.isCustomShapeType(obj.type)) {
                    return StageObject.getCustomShapePoints(obj, false);
                }
                // Fallback: use bounding rectangle
                return [{x, y}, {x: x + w, y}, {x: x + w, y: y + h}, {x, y: y + h}];
        }
    },

    /**
     * Compute the area of a polygon (signed: positive = CCW).
     */
    _polyArea(pts) {
        let area = 0;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
            area += (pts[j].x - pts[i].x) * (pts[j].y + pts[i].y);
        }
        return area / 2;
    },

    /**
     * Ensure polygon is wound counter-clockwise.
     */
    _ensureCCW(pts) {
        if (this._polyArea(pts) < 0) return pts;
        return pts.slice().reverse();
    },

    /**
     * Check if point is inside polygon (ray-casting algorithm).
     */
    _pointInPoly(pt, poly) {
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
            const xi = poly[i].x, yi = poly[i].y;
            const xj = poly[j].x, yj = poly[j].y;
            if (((yi > pt.y) !== (yj > pt.y)) &&
                (pt.x < (xj - xi) * (pt.y - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
        }
        return inside;
    },

    /**
     * Find intersection point of two line segments (a1-a2) and (b1-b2).
     * Returns {x, y, t, u} or null.
     */
    _segIntersect(a1, a2, b1, b2) {
        const dx1 = a2.x - a1.x, dy1 = a2.y - a1.y;
        const dx2 = b2.x - b1.x, dy2 = b2.y - b1.y;
        const denom = dx1 * dy2 - dy1 * dx2;
        if (Math.abs(denom) < 1e-10) return null;
        const t = ((b1.x - a1.x) * dy2 - (b1.y - a1.y) * dx2) / denom;
        const u = ((b1.x - a1.x) * dy1 - (b1.y - a1.y) * dx1) / denom;
        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: a1.x + t * dx1,
                y: a1.y + t * dy1,
                t, u
            };
        }
        return null;
    },

    /**
     * Sutherland-Hodgman polygon clipping: clip subject by clip polygon.
     * Returns the clipped polygon (intersection).
     */
    _clipPolygon(subject, clip) {
        let output = subject.slice();
        for (let i = 0; i < clip.length && output.length > 0; i++) {
            const input = output;
            output = [];
            const a = clip[i];
            const b = clip[(i + 1) % clip.length];
            for (let j = 0; j < input.length; j++) {
                const p = input[j];
                const q = input[(j + 1) % input.length];
                const pInside = this._isLeft(a, b, p);
                const qInside = this._isLeft(a, b, q);
                if (pInside) {
                    output.push(p);
                    if (!qInside) {
                        const ix = this._lineIntersect(a, b, p, q);
                        if (ix) output.push(ix);
                    }
                } else if (qInside) {
                    const ix = this._lineIntersect(a, b, p, q);
                    if (ix) output.push(ix);
                }
            }
        }
        return output;
    },

    _isLeft(a, b, c) {
        return (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) >= 0;
    },

    _lineIntersect(a, b, c, d) {
        const denom = (b.x - a.x) * (d.y - c.y) - (b.y - a.y) * (d.x - c.x);
        if (Math.abs(denom) < 1e-10) return null;
        const t = ((c.x - a.x) * (d.y - c.y) - (c.y - a.y) * (d.x - c.x)) / denom;
        return {x: a.x + t * (b.x - a.x), y: a.y + t * (b.y - a.y)};
    },

    /**
     * Compute convex hull of a point set (Graham scan).
     */
    _convexHull(points) {
        if (points.length <= 3) return points.slice();
        const pts = points.slice().sort((a, b) => a.x - b.x || a.y - b.y);
        const cross = (O, A, B) => (A.x - O.x) * (B.y - O.y) - (A.y - O.y) * (B.x - O.x);
        const lower = [];
        for (const p of pts) {
            while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
            lower.push(p);
        }
        const upper = [];
        for (let i = pts.length - 1; i >= 0; i--) {
            while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], pts[i]) <= 0) upper.pop();
            upper.push(pts[i]);
        }
        upper.pop();
        lower.pop();
        return lower.concat(upper);
    },

    /**
     * Main boolean operation dispatcher.
     * Uses canvas pixel-compositing for robust results that handle rotation, flip,
     * scale, border-radius, and complex shapes — matching PowerPoint behavior.
     * Works with 2+ objects; at least one must be a shape.
     * @param {'union'|'subtract'|'intersect'|'combine'|'fragment'} op
     */
    booleanOp(op) {
        const selected = this.getSelectedObjects();
        if (selected.length < 2) {
            Utils.showToast('Select 2 or more objects for boolean operations', 'warning');
            return;
        }
        const shapeTypes = ['rectangle','circle','triangle','star','polygon','diamond','heart',
                    'arrow','doubleArrow','curvedArrow', ...StageObject.getCustomShapeTypes(), 'freeform','path','scribble','line'];
        const allValidTypes = [...shapeTypes, 'text', 'image'];
        const valid = selected.filter(o => allValidTypes.includes(o.type));
        if (valid.length < 2) {
            Utils.showToast('Need at least 2 objects for boolean ops', 'warning');
            return;
        }
        if (!valid.some(o => shapeTypes.includes(o.type))) {
            Utils.showToast('At least one shape object is required', 'warning');
            return;
        }

        // Sort by z-order (bottommost first) — PowerPoint convention
        const sorted = [...valid].sort((a, b) =>
            this.objects.indexOf(a) - this.objects.indexOf(b)
        );

        try {
            // Ensure pre-operation state is saved for undo
            eventBus.emit('history:flush');

            const results = this._boolCanvasOp(sorted, op);
            if (!results || results.length === 0) {
                Utils.showToast('No result — shapes may not overlap', 'warning');
                return;
            }

            // Suppress intermediate history pushes during bulk add/remove
            this._suppressHistory = true;

            // Remove originals
            valid.forEach(s => this.removeObject(s.id));

            // Add result objects — prefer editable freeform vector, fall back to image
            const newIds = [];
            const opLabel = op.charAt(0).toUpperCase() + op.slice(1);
            results.forEach((r, idx) => {
                // Fragment (and Combine) tag each result with the owning source object
                const srcObj = r.sourceObj || sorted[0];
                const freeform = this._boolResultToFreeform(r, srcObj, idx, opLabel);
                if (freeform) {
                    this.addObject(freeform);
                    newIds.push(freeform.id);
                } else {
                    const obj = new StageObject('image', {
                        x: r.x, y: r.y,
                        width: r.width, height: r.height,
                        imageSrc: r.dataUrl,
                        name: `${opLabel} ${idx + 1}`,
                        opacity: 1
                    });
                    this.addObject(obj);
                    newIds.push(obj.id);
                }
            });

            this._suppressHistory = false;

            this.select(newIds);
            this.setTool('select');
            this.stage.requestRender();
            eventBus.emit('history:push');
            Utils.showToast(`${op.charAt(0).toUpperCase() + op.slice(1)}: created ${results.length} shape(s)`, 'success');
        } catch (err) {
            this._suppressHistory = false;
            console.error('Boolean op error:', err);
            Utils.showToast('Boolean operation failed', 'error');
        }
    },

    // ---- Canvas-based boolean helpers ----

    /**
     * Attempt to convert a canvas-based boolean op result into an editable freeform vector shape.
     * Uses the AITrace instance (this._aiTrace) to trace the alpha mask into polygon points.
     * Returns a StageObject('freeform') on success, or null to trigger the image fallback.
     */
    _boolResultToFreeform(result, sourceObj, idx, opLabel) {
        try {
            const canvas = result.canvas;
            if (!canvas || !this._aiTrace) return null;

            const W = canvas.width, H = canvas.height;
            if (W < 2 || H < 2) return null;

            const data = canvas.getContext('2d').getImageData(0, 0, W, H).data;

            // Build binary foreground mask.
            // Use threshold 191 (75% opacity) rather than 127 so anti-aliased edge
            // fringe pixels — which are < 75% opaque — are excluded from the "inside"
            // region. This gives a cleaner, sharper boundary for straight-edged shapes.
            const mask = new Uint8Array(W * H);
            for (let i = 0; i < W * H; i++) {
                mask[i] = data[i * 4 + 3] > 191 ? 1 : 0;
            }

            // Trace boundary contour using ai-trace's existing algorithm
            const contour = this._aiTrace._traceBoundaryPixels(mask, W, H);
            if (!contour || contour.length < 4) return null;

            // Simplify with Douglas-Peucker.
            // Tolerance 2.0px collapses the few anti-aliased corner pixels that can
            // remain after the stricter alpha threshold, leaving straight edges as
            // exactly 2 points (start→end) and circles as smooth polygon approximations.
            let pts = this._aiTrace._douglasPeucker(contour, 2.0);
            if (!pts || pts.length < 3) return null;

            // Tag each point as 'straight' or 'curve' based on the direction change.
            // The freeform renderer uses quadraticCurveTo for points WITHOUT segmentType
            // 'straight', so corners must be explicitly tagged to stay as lineTo.
            // A corner is any point where the incoming/outgoing direction changes > 30°.
            // This threshold catches rectangle corners (90°), triangle corners, polygon
            // vertices, etc., while leaving circle arc segments (~12–20° each) untagged
            // so they render as smooth quadratic curves.
            pts = this._boolTagCorners(pts, 30);
            if (!pts || pts.length < 3) return null;

            // Map from trimmed-canvas pixel coords → stage coords
                const stagePoints = pts.map(p => ({
                    x: result.x + p.x,
                    y: result.y + p.y,
                    ...(p.segmentType ? { segmentType: p.segmentType } : {})
                }));

            const bounds = this._boolPointBounds(stagePoints);
            if (bounds.width < 1 || bounds.height < 1) return null;

            // Inherit core style from the bottom (first) source object
            return new StageObject('freeform', {
                x: bounds.x,
                y: bounds.y,
                width: bounds.width,
                height: bounds.height,
                pathPoints: stagePoints,
                closedPath: true,
                fill: sourceObj.fill || '#4472C4',
                fillType: sourceObj.fillType || 'solid',
                stroke: sourceObj.stroke || 'transparent',
                strokeWidth: sourceObj.strokeWidth || 0,
                opacity: sourceObj.opacity ?? 1,
                name: `${opLabel} ${idx + 1}`
            });
        } catch (e) {
            console.warn('_boolResultToFreeform failed, falling back to image:', e);
            return null;
        }
    },

    /** Return bounding box of a flat point array [{x,y}]. */
    _boolPointBounds(pts) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of pts) {
            if (p.x < minX) minX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.x > maxX) maxX = p.x;
            if (p.y > maxY) maxY = p.y;
        }
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    },

    /**
     * Tag each simplified path point with segmentType:'straight' when it is a sharp corner.
     *
     * The freeform renderer in objects-rendering.js uses:
     *   - lineTo  when segmentType === 'straight'
     *   - quadraticCurveTo  when segmentType is absent
     *
     * By tagging corners as 'straight' we get:
     *   Rectangle → all 4 corners tagged → all edges rendered as straight lines ✓
     *   Circle    → no corners tagged   → all arcs rendered as smooth curves ✓
     *   Union(rect+circle) → rect corners tagged (straight), arc points untagged (smooth) ✓
     *
     * @param {Array<{x,y}>} pts  — simplified points (post Douglas-Peucker)
     * @param {number} angleDeg   — direction change threshold (degrees); points above this = corner
     * @returns {Array<{x,y,segmentType?}>}
     */
    _boolTagCorners(pts, angleDeg = 30) {
        const n = pts.length;
        const thresh = angleDeg * Math.PI / 180;
        return pts.map((p, i) => {
            const A = pts[(i - 1 + n) % n];
            const B = p;
            const C = pts[(i + 1) % n];
            const ax = B.x - A.x, ay = B.y - A.y;
            const bx = C.x - B.x, by = C.y - B.y;
            const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
            if (la < 0.5 || lb < 0.5) return { x: p.x, y: p.y, segmentType: 'straight' };
            const dot = (ax * bx + ay * by) / (la * lb);
            const angle = Math.acos(Math.max(-1, Math.min(1, dot)));
            return angle > thresh
                ? { x: p.x, y: p.y, segmentType: 'straight' }
                : { x: p.x, y: p.y };
        });
    },

    // ---- Canvas-based boolean helpers ----

    _boolCanvasOp(sortedObjects, op) {
        const PAD = 20;
        const bounds = this._boolBounds(sortedObjects, PAD);
        const w = Math.ceil(bounds.width);
        const h = Math.ceil(bounds.height);
        if (w <= 0 || h <= 0) return [];
        // Cap canvas size to prevent memory issues
        const MAX = 4096;
        if (w > MAX || h > MAX) {
            Utils.showToast('Shapes too large for boolean operation', 'warning');
            return [];
        }
        const ox = bounds.x, oy = bounds.y;
        switch (op) {
            case 'union':    return this._boolUnion(sortedObjects, w, h, ox, oy);
            case 'subtract': return this._boolSubtract(sortedObjects, w, h, ox, oy);
            case 'intersect':return this._boolIntersect(sortedObjects, w, h, ox, oy);
            case 'combine':  return this._boolCombine(sortedObjects, w, h, ox, oy);
            case 'fragment': return this._boolFragment(sortedObjects, w, h, ox, oy);
            default: return [];
        }
    },

    _boolBounds(objects, pad) {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const obj of objects) {
            const b = obj.getBounds();
            const extra = (obj.strokeWidth || 0) / 2
                + (obj.shadow ? (obj.shadowBlur || 0) + Math.max(Math.abs(obj.shadowOffsetX || 0), Math.abs(obj.shadowOffsetY || 0)) : 0)
                + (obj.glowEnabled ? (obj.glowSize || 0) : 0);
            minX = Math.min(minX, b.x - extra);
            minY = Math.min(minY, b.y - extra);
            maxX = Math.max(maxX, b.x + b.width + extra);
            maxY = Math.max(maxY, b.y + b.height + extra);
        }
        return { x: minX - pad, y: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
    },

    _boolMakeCanvas(w, h) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        return c;
    },

    /** Temporarily force an object to render with solid fill for boolean operations. */
    _boolWithSolidFill(obj, fn) {
        const origFillType = obj.fillType;
        const origFill = obj.fill;
        const needsForceFill = origFillType === 'none' || origFill === 'transparent';
        if (needsForceFill) {
            obj.fillType = 'solid';
            obj.fill = obj._savedFill && obj._savedFill !== 'transparent' ? obj._savedFill : '#808080';
        }
        try {
            return fn();
        } finally {
            if (needsForceFill) {
                obj.fillType = origFillType;
                obj.fill = origFill;
            }
        }
    },

    /** Render object onto canvas translated so stage coords map correctly. */
    _boolDrawObj(obj, canvas, ox, oy) {
        this._boolWithSolidFill(obj, () => {
            const ctx = canvas.getContext('2d');
            ctx.save();
            ctx.translate(-ox, -oy);
            obj.render(ctx);
            ctx.restore();
        });
    },

    /** Render object silhouette as fully-opaque white mask.
     *  Always forces solid fill so the FULL interior is masked, regardless of
     *  the object's actual fill/stroke style. */
    _boolMask(obj, w, h, ox, oy) {
        const origFillType = obj.fillType, origFill = obj.fill;
        const origStroke = obj.stroke, origStrokeWidth = obj.strokeWidth;
        const origShadow = obj.shadow, origGlow = obj.glowEnabled;
        // Force solid opaque fill so we get the complete geometric silhouette
        obj.fillType = 'solid';
        obj.fill = '#ffffff';
        obj.stroke = 'transparent';
        obj.strokeWidth = 0;
        obj.shadow = false;
        obj.glowEnabled = false;
        const c = this._boolMakeCanvas(w, h);
        const ctx = c.getContext('2d');
        ctx.save();
        ctx.translate(-ox, -oy);
        obj.render(ctx);
        ctx.restore();
        // Ensure all visible pixels are fully opaque white
        const id = ctx.getImageData(0, 0, w, h);
        const d = id.data;
        for (let i = 0; i < d.length; i += 4) {
            if (d[i + 3] > 0) { d[i] = d[i + 1] = d[i + 2] = d[i + 3] = 255; }
        }
        ctx.putImageData(id, 0, 0);
        // Restore original properties
        obj.fillType = origFillType; obj.fill = origFill;
        obj.stroke = origStroke; obj.strokeWidth = origStrokeWidth;
        obj.shadow = origShadow; obj.glowEnabled = origGlow;
        return c;
    },

    /**
     * Split a canvas into one result per connected opaque region.
     * Falls back to a single trimmed result when only one region exists.
     * Each result has { x, y, width, height, dataUrl, canvas }.
     */
    _boolSplitComponents(canvas, ox, oy) {
        const W = canvas.width, H = canvas.height;
        const ctx = canvas.getContext('2d');
        const id = ctx.getImageData(0, 0, W, H);
        const d = id.data;
        const labeled = new Int32Array(W * H).fill(-1);
        let numLabels = 0;
        // BFS connected-component labeling (4-connectivity)
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = y * W + x;
                if (d[i * 4 + 3] > 127 && labeled[i] === -1) {
                    const label = numLabels++;
                    labeled[i] = label;
                    const q = [i];
                    let qi = 0;
                    while (qi < q.length) {
                        const ci = q[qi++];
                        const cx = ci % W, cy = (ci / W) | 0;
                        const neighbors = [
                            cx > 0 ? ci - 1 : -1,
                            cx < W - 1 ? ci + 1 : -1,
                            cy > 0 ? ci - W : -1,
                            cy < H - 1 ? ci + W : -1
                        ];
                        for (const ni of neighbors) {
                            if (ni >= 0 && labeled[ni] === -1 && d[ni * 4 + 3] > 127) {
                                labeled[ni] = label;
                                q.push(ni);
                            }
                        }
                    }
                }
            }
        }
        if (numLabels === 0) return [];
        // Build one canvas per label
        const results = [];
        for (let label = 0; label < numLabels; label++) {
            const fc = this._boolMakeCanvas(W, H);
            const fctx = fc.getContext('2d');
            const fid = fctx.createImageData(W, H);
            for (let i = 0; i < W * H; i++) {
                if (labeled[i] === label) {
                    const p = i * 4;
                    fid.data[p]     = d[p];
                    fid.data[p + 1] = d[p + 1];
                    fid.data[p + 2] = d[p + 2];
                    fid.data[p + 3] = d[p + 3];
                }
            }
            fctx.putImageData(fid, 0, 0);
            results.push(...this._boolTrimResult(fc, ox, oy));
        }
        return results;
    },

    /** Trim transparent borders and return result descriptor(s). */
    _boolTrimResult(canvas, ox, oy) {
        const ctx = canvas.getContext('2d');
        const id = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const d = id.data;
        const W = canvas.width, H = canvas.height;
        let minX = W, minY = H, maxX = 0, maxY = 0;
        let found = false;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                if (d[(y * W + x) * 4 + 3] > 0) {
                    found = true;
                    if (x < minX) minX = x;
                    if (x > maxX) maxX = x;
                    if (y < minY) minY = y;
                    if (y > maxY) maxY = y;
                }
            }
        }
        if (!found) return [];
        const tw = maxX - minX + 1, th = maxY - minY + 1;
        const trimmed = this._boolMakeCanvas(tw, th);
        trimmed.getContext('2d').drawImage(canvas, minX, minY, tw, th, 0, 0, tw, th);
        return [{ x: ox + minX, y: oy + minY, width: tw, height: th, dataUrl: trimmed.toDataURL('image/png'), canvas: trimmed }];
    },

    /** UNION — merge all shapes visually into one (or more if non-overlapping). */
    _boolUnion(objects, w, h, ox, oy) {
        const c = this._boolMakeCanvas(w, h);
        for (const obj of objects) this._boolDrawObj(obj, c, ox, oy);
        return this._boolSplitComponents(c, ox, oy);
    },

    /** SUBTRACT — base (bottommost) shape minus ALL top shapes (PowerPoint convention). */
    _boolSubtract(objects, w, h, ox, oy) {
        // PowerPoint: base = bottommost shape only; ALL others are cutters
        const base = objects[0];
        const cutters = objects.slice(1);
        // Draw base shape visually
        const c = this._boolMakeCanvas(w, h);
        this._boolDrawObj(base, c, ox, oy);
        // Build union of all cutter silhouettes
        const cutC = this._boolMakeCanvas(w, h);
        const cutCtx = cutC.getContext('2d');
        for (const obj of cutters) {
            cutCtx.drawImage(this._boolMask(obj, w, h, ox, oy), 0, 0);
        }
        // Erase cutter area from base
        const ctx = c.getContext('2d');
        ctx.globalCompositeOperation = 'destination-out';
        ctx.drawImage(cutC, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        return this._boolSplitComponents(c, ox, oy);
    },

    /** INTERSECT — keep only the area common to ALL shapes. */
    _boolIntersect(objects, w, h, ox, oy) {
        // Build intersection mask (AND of all silhouettes)
        const mc = this._boolMakeCanvas(w, h);
        const mctx = mc.getContext('2d');
        mctx.drawImage(this._boolMask(objects[0], w, h, ox, oy), 0, 0);
        for (let i = 1; i < objects.length; i++) {
            mctx.globalCompositeOperation = 'destination-in';
            mctx.drawImage(this._boolMask(objects[i], w, h, ox, oy), 0, 0);
        }
        mctx.globalCompositeOperation = 'source-over';
        // Draw all objects visually, then clip to intersection mask
        const c = this._boolMakeCanvas(w, h);
        const ctx = c.getContext('2d');
        for (const obj of objects) this._boolDrawObj(obj, c, ox, oy);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mc, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        return this._boolSplitComponents(c, ox, oy);
    },

    /** COMBINE (XOR) — keep only non-overlapping areas; produces one shape per disconnected region. */
    _boolCombine(objects, w, h, ox, oy) {
        // Count how many shapes cover each pixel
        const counts = new Uint8Array(w * h);
        for (const obj of objects) {
            const m = this._boolMask(obj, w, h, ox, oy);
            const d = m.getContext('2d').getImageData(0, 0, w, h).data;
            for (let i = 0; i < counts.length; i++) {
                if (d[i * 4 + 3] > 0) counts[i]++;
            }
        }
        // Build XOR mask: keep pixels covered by an odd number of shapes
        const mc = this._boolMakeCanvas(w, h);
        const mctx = mc.getContext('2d');
        const mid = mctx.createImageData(w, h);
        for (let i = 0; i < counts.length; i++) {
            if (counts[i] % 2 === 1) {
                mid.data[i * 4] = mid.data[i * 4 + 1] = mid.data[i * 4 + 2] = mid.data[i * 4 + 3] = 255;
            }
        }
        mctx.putImageData(mid, 0, 0);
        // Draw all objects visually then clip to XOR mask
        const c = this._boolMakeCanvas(w, h);
        const ctx = c.getContext('2d');
        for (const obj of objects) this._boolDrawObj(obj, c, ox, oy);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.drawImage(mc, 0, 0);
        ctx.globalCompositeOperation = 'source-over';
        // XOR often produces disconnected regions — split each into its own freeform
        return this._boolSplitComponents(c, ox, oy);
    },

    /** FRAGMENT — split into separate pieces for every unique overlap zone. */
    _boolFragment(objects, w, h, ox, oy) {
        // Get per-object silhouette masks
        const maskDatas = objects.map(obj => {
            const m = this._boolMask(obj, w, h, ox, oy);
            return m.getContext('2d').getImageData(0, 0, w, h).data;
        });
        // Assign each pixel a zone bitmask (bit N = shape N contains pixel)
        const totalPx = w * h;
        const pixelZone = new Uint32Array(totalPx);
        const zones = new Set();
        for (let i = 0; i < totalPx; i++) {
            let zone = 0;
            for (let m = 0; m < maskDatas.length; m++) {
                if (maskDatas[m][i * 4 + 3] > 0) zone |= (1 << m);
            }
            pixelZone[i] = zone;
            if (zone > 0) zones.add(zone);
        }
        // Render all objects for visual colour data
        const full = this._boolMakeCanvas(w, h);
        for (const obj of objects) this._boolDrawObj(obj, full, ox, oy);
        const fullData = full.getContext('2d').getImageData(0, 0, w, h).data;
        // Create one canvas per zone, tag it with the topmost source object for fill colour
        const results = [];
        for (const zone of zones) {
            const fc = this._boolMakeCanvas(w, h);
            const fctx = fc.getContext('2d');
            const fid = fctx.createImageData(w, h);
            for (let i = 0; i < totalPx; i++) {
                if (pixelZone[i] === zone) {
                    const p = i * 4;
                    fid.data[p]     = fullData[p];
                    fid.data[p + 1] = fullData[p + 1];
                    fid.data[p + 2] = fullData[p + 2];
                    fid.data[p + 3] = fullData[p + 3];
                }
            }
            fctx.putImageData(fid, 0, 0);
            // Topmost shape in zone determines fill colour
            const topIdx = 31 - Math.clz32(zone);
            const zoneSource = objects[topIdx];
            const pieces = this._boolSplitComponents(fc, ox, oy);
            pieces.forEach(r => { r.sourceObj = zoneSource; });
            results.push(...pieces);
        }
        return results;
    },


});
